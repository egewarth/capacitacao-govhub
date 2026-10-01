// Conta Google na barra superior e aviso de sincronização — usados pelas três páginas.
import { el } from './dom.js';

export function montarConta(raiz, progresso) {
  let desenhado = null;

  function pintar() {
    const u = progresso.usuario();
    const estado = (u ? u.uid : '-') + '|' + progresso.nuvemDisponivel();
    if (estado === desenhado) return;   // marcar aulas não redesenha o menu (que fecharia)
    desenhado = estado;

    if (!u) {
      raiz.replaceChildren(progresso.nuvemDisponivel()
        ? el('button', { class: 'btn-google', type: 'button', onclick: () => progresso.entrar() }, 'Entrar com Google')
        : '');
      return;
    }
    const primeiroNome = u.nome.split(' ')[0];
    const avatar = u.foto
      ? el('img', { class: 'conta-avatar', src: u.foto, alt: '', width: 28, height: 28, referrerpolicy: 'no-referrer' })
      : el('span', { class: 'conta-avatar', 'aria-hidden': 'true' }, primeiroNome.charAt(0).toUpperCase());
    const menu = el('details', { class: 'conta-menu' },
      el('summary', { 'aria-label': 'Conta de ' + u.nome }, avatar, el('span', { class: 'conta-nome' }, primeiroNome)),
      el('div', { class: 'conta-painel' },
        el('p', {}, 'Seu progresso está salvo na conta ', el('b', {}, u.email || u.nome), '.'),
        el('button', { class: 'btn btn-secundario', type: 'button', onclick: () => progresso.sair() }, 'Sair')));
    raiz.replaceChildren(menu);
  }

  // fecha o menu ao clicar fora ou com Esc
  document.addEventListener('click', (ev) => {
    const menu = raiz.querySelector('details[open]');
    if (menu && !menu.contains(ev.target)) menu.open = false;
  });
  document.addEventListener('keydown', (ev) => {
    const menu = raiz.querySelector('details[open]');
    if (ev.key === 'Escape' && menu) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });

  progresso.aoMudar(pintar);
  pintar();
}

export function montarAviso(progresso) {
  const caixa = el('div', { class: 'aviso', role: 'status', 'aria-live': 'polite' });
  document.body.append(caixa);
  let temporizador = null;

  function mostrar(texto, { fixo = false } = {}) {
    caixa.textContent = texto;
    caixa.classList.add('visivel');
    clearTimeout(temporizador);
    if (!fixo) temporizador = setTimeout(esconder, 6000);
  }
  function esconder() {
    caixa.classList.remove('visivel');
    caixa.textContent = '';
  }

  progresso.aoAviso((texto) => mostrar(texto));
  // O Firestore guarda as marcações feitas sem conexão e as envia quando ela volta.
  window.addEventListener('offline', () => {
    if (progresso.usuario()) mostrar('Sem conexão: suas marcações serão sincronizadas quando a conexão voltar.', { fixo: true });
  });
  window.addEventListener('online', esconder);
}
