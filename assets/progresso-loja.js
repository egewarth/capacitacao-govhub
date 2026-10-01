// Loja do progresso da trilha: o que está feito, quem está logado e qual foi a última aula.
// Sem sessão, tudo fica no navegador. Com sessão Google, o Firestore é a fonte da verdade e o
// navegador guarda só um cache da conta, apagado no logout (ADR 0004).
// Não conhece o DOM nem o Firebase: recebe o armazenamento e a nuvem prontos — por isso é
// testada em Node (tests/progresso-loja.test.js).
import { mesclar, alternar as alternarIds } from './progresso-nucleo.js';

export const CHAVE_ANONIMO = 'govhub-dashboards-roadmap-v1';
export const CHAVE_ULTIMA_ANONIMO = 'govhub-dashboards-ultima-aula';
export const CHAVE_CONTA = 'govhub-dashboards-progresso-conta';

// Fechar a janela do Google não é erro de quem lê: não merece aviso.
const ERROS_SILENCIOSOS = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];

function lerJSON(armazenamento, chave, padrao) {
  try {
    const bruto = armazenamento.get(chave);
    return bruto ? JSON.parse(bruto) : padrao;
  } catch {
    return padrao;
  }
}

export function criarLoja({ armazenamento, criarNuvem = async () => null }) {
  let nuvem = null;
  let usuario = null;
  let feitos = {};
  let ultimaAula = null;
  let pararDeOuvir = null;
  let sessao = 0;   // muda a cada troca de login/logout: respostas de sessões antigas são descartadas
  const ouvintes = new Set();
  const ouvintesAviso = new Set();

  const emitir = () => ouvintes.forEach((cb) => cb());
  const avisar = (texto) => ouvintesAviso.forEach((cb) => cb(texto));

  function carregarAnonimo() {
    feitos = lerJSON(armazenamento, CHAVE_ANONIMO, {});
    ultimaAula = lerJSON(armazenamento, CHAVE_ULTIMA_ANONIMO, null);
  }

  function salvarLocal() {
    if (usuario) {
      armazenamento.set(CHAVE_CONTA, JSON.stringify({ uid: usuario.uid, usuario, feitos, ultimaAula }));
      return;
    }
    armazenamento.set(CHAVE_ANONIMO, JSON.stringify(feitos));
    if (ultimaAula) armazenamento.set(CHAVE_ULTIMA_ANONIMO, JSON.stringify(ultimaAula));
  }

  function pararSincronizacao() {
    if (pararDeOuvir) {
      pararDeOuvir();
      pararDeOuvir = null;
    }
  }

  function desconectar() {
    pararSincronizacao();
    armazenamento.remove(CHAVE_CONTA);
    usuario = null;
    carregarAnonimo();
    emitir();
  }

  // A nuvem recusou a gravação que levava o progresso anônimo: ele pertence a este navegador e
  // volta para a chave anônima (união com o que houver ali), mesmo que a sessão já tenha acabado.
  function devolverAnonimo(anonimo, ultimaAnonima, minha) {
    if (Object.keys(anonimo).length > 0) {
      armazenamento.set(CHAVE_ANONIMO, JSON.stringify(mesclar(lerJSON(armazenamento, CHAVE_ANONIMO, {}), anonimo)));
    }
    if (ultimaAnonima && !lerJSON(armazenamento, CHAVE_ULTIMA_ANONIMO, null)) {
      armazenamento.set(CHAVE_ULTIMA_ANONIMO, JSON.stringify(ultimaAnonima));
    }
    if (minha === sessao) {
      // Ainda logado: mantém as aulas visíveis; a próxima entrada absorve de novo (união é idempotente).
      feitos = mesclar(feitos, anonimo);
      salvarLocal();
      emitir();
      avisar('Não foi possível salvar; entre de novo.');
    } else if (!usuario) {
      carregarAnonimo();
      emitir();
    }
  }

  // Uma única espera (a leitura da conta). Depois dela tudo é síncrono: nada pode ser marcado,
  // desmarcado ou zerado no anônimo entre ler a chave e apagá-la.
  async function conectar(u) {
    const minha = sessao;
    const remoto = await nuvem.ler(u.uid);
    if (minha !== sessao) return;
    const anonimo = lerJSON(armazenamento, CHAVE_ANONIMO, {});
    const ultimaAnonima = lerJSON(armazenamento, CHAVE_ULTIMA_ANONIMO, null);
    const novosFeitos = mesclar(anonimo, remoto && remoto.feitos);
    const novaUltima = (remoto && remoto.ultimaAula) || ultimaAnonima;
    const trazAlgo = Object.keys(anonimo).length > 0 || (!!ultimaAnonima && !(remoto && remoto.ultimaAula));
    // O anônimo foi absorvido pela conta: não volta a ser somado numa próxima entrada.
    armazenamento.remove(CHAVE_ANONIMO);
    armazenamento.remove(CHAVE_ULTIMA_ANONIMO);
    usuario = u;
    feitos = novosFeitos;
    ultimaAula = novaUltima;
    salvarLocal();
    emitir();
    if (!remoto || trazAlgo) {
      // Sem await: o Firestore aplica a escrita local na hora e só confirma com o servidor.
      nuvem.gravarTudo(u.uid, { feitos: novosFeitos, ultimaAula: novaUltima }).catch(() => {
        devolverAnonimo(anonimo, ultimaAnonima, minha);
      });
    }
    pararDeOuvir = nuvem.ouvir(u.uid, (dados) => {
      if (minha !== sessao) return;
      feitos = dados.feitos || {};
      ultimaAula = dados.ultimaAula || null;
      salvarLocal();
      emitir();
    }, () => {
      if (minha !== sessao) return;
      avisar('Não foi possível sincronizar o progresso; entre de novo.');
    });
  }

  function aoMudarUsuario(u) {
    sessao += 1;
    pararSincronizacao();
    if (!u) {
      desconectar();
      return;
    }
    if (usuario && usuario.uid !== u.uid) {
      // cache de outra conta: nunca é somado a esta
      armazenamento.remove(CHAVE_CONTA);
      usuario = null;
      carregarAnonimo();
      emitir();
    }
    const minha = sessao;
    conectar(u).catch(() => {
      if (minha === sessao) avisar('Não foi possível carregar o progresso da sua conta.');
    });
  }

  async function iniciar() {
    // Sessão restaurada: mostra o cache da conta na hora; a nuvem confirma em seguida.
    const cache = lerJSON(armazenamento, CHAVE_CONTA, null);
    if (cache && cache.uid && cache.usuario) {
      usuario = cache.usuario;
      feitos = cache.feitos || {};
      ultimaAula = cache.ultimaAula || null;
    } else {
      carregarAnonimo();
    }
    emitir();
    try {
      nuvem = await criarNuvem();
    } catch {
      nuvem = null;
    }
    if (!nuvem) {
      if (usuario) desconectar();
      return;
    }
    emitir();   // o botão "Entrar com Google" pode aparecer
    nuvem.aoMudarUsuario(aoMudarUsuario);
  }

  function alternar(ids) {
    const antes = feitos;
    const { feitos: depois, marcou } = alternarIds(feitos, ids);
    feitos = depois;
    salvarLocal();
    emitir();
    if (usuario && nuvem) {
      const minha = sessao;
      nuvem.marcar(usuario.uid, ids, marcou).catch(() => {
        if (minha !== sessao || !usuario) return;
        const restaurado = { ...feitos };
        for (const id of ids) {
          if (antes[id]) restaurado[id] = true;
          else delete restaurado[id];
        }
        feitos = restaurado;
        salvarLocal();
        emitir();
        avisar('Não foi possível salvar; entre de novo.');
      });
    }
    return marcou;
  }

  function zerar() {
    feitos = {};
    salvarLocal();
    emitir();
    if (usuario && nuvem) {
      const minha = sessao;
      nuvem.gravarTudo(usuario.uid, { feitos: {}, ultimaAula })
        .catch(() => { if (minha === sessao) avisar('Não foi possível salvar; entre de novo.'); });
    }
  }

  function registrarUltimaAula(path, item) {
    ultimaAula = { path, item: item || null };
    salvarLocal();
    if (usuario && nuvem) nuvem.gravarUltimaAula(usuario.uid, ultimaAula).catch(() => {});
  }

  function entrar() {
    if (!nuvem) return Promise.resolve();
    return nuvem.entrar().catch((e) => {
      if (!ERROS_SILENCIOSOS.includes(e && e.code)) avisar('Não foi possível entrar com o Google.');
    });
  }

  function sair() {
    return nuvem ? nuvem.sair() : Promise.resolve();
  }

  // Outra aba mexeu no progresso anônimo. Com sessão, quem sincroniza as abas é o Firestore.
  function recarregar(chave) {
    if (usuario) return;
    if (chave !== null && chave !== CHAVE_ANONIMO && chave !== CHAVE_ULTIMA_ANONIMO) return;
    carregarAnonimo();
    emitir();
  }

  return {
    iniciar, alternar, zerar, registrarUltimaAula, entrar, sair, recarregar,
    feitos: () => feitos,
    usuario: () => usuario,
    ultimaAula: () => ultimaAula,
    nuvemDisponivel: () => !!nuvem,
    aoMudar(cb) { ouvintes.add(cb); return () => ouvintes.delete(cb); },
    aoAviso(cb) { ouvintesAviso.add(cb); return () => ouvintesAviso.delete(cb); },
  };
}
