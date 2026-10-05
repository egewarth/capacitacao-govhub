// Regras do mapa da trilha, da busca e do quiz: puras, sem DOM — testadas em tests/hub-nucleo.test.js.
// `niveis` vem de docs/trilhas/<slug>.json; `feitos` é o mapa {id da aula: true}.

// Nível que o mapa abre quando o link não diz qual: o primeiro com aula pendente.
export function nivelPadrao(feitos, niveis) {
  const pendente = niveis.find((n) => n.itens.some((i) => !feitos[i.id]));
  return pendente ? pendente.numero : (niveis[0] ? niveis[0].numero : 0);
}

// Os cinco papéis da trilha viram três marcações no mapa: essencial, apoio e marco.
export function papelVisual(papel) {
  if (papel === 'core') return 'essencial';
  if (papel === 'capstone') return 'marco';
  return 'apoio';
}

export function normalizarBusca(texto) {
  return String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// Aulas cujo título contém o termo, na ordem das trilhas e dos níveis.
export function buscarAulas(trilhas, termo, limite = 8) {
  const t = normalizarBusca(termo);
  if (!t) return [];
  const achados = [];
  for (const trilha of trilhas) {
    for (const nivel of trilha.niveis) {
      for (const item of nivel.itens) {
        if (!normalizarBusca(item.titulo).includes(t)) continue;
        achados.push({ trilha: trilha.slug, trilhaTitulo: trilha.titulo, nivel: nivel.numero, nivelTitulo: nivel.titulo, item });
        if (achados.length >= limite) return achados;
      }
    }
  }
  return achados;
}

// Perguntas do quiz/<slug>.json na ordem da trilha; aula sem pergunta fica de fora.
export function perguntasDaTrilha(niveis, banco) {
  const lista = [];
  for (const nivel of niveis) {
    for (const item of nivel.itens) {
      const p = banco[item.id];
      if (p) lista.push({ id: item.id, titulo: item.titulo, nivel: nivel.numero, nivelTitulo: nivel.titulo, ...p });
    }
  }
  return lista;
}

export function corrigirQuiz(perguntas, respostas) {
  const acertos = perguntas.filter((p) => respostas[p.id] === p.correta).length;
  const completo = perguntas.every((p) => respostas[p.id] !== undefined);
  return { acertos, total: perguntas.length, completo };
}
