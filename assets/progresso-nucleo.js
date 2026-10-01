// Regras do progresso da trilha: puras, sem DOM, sem armazenamento e sem Firebase.
// Usadas pela loja (progresso-loja.js), pelas páginas e pelos testes em Node.
// `niveis` vem de docs/trilhas/trilha.json; `feitos` é o mapa {id do nó: true}.

export function itensEmOrdem(niveis) {
  const lista = [];
  for (const nivel of niveis) {
    for (const item of nivel.itens) {
      lista.push({ ...item, nivel: nivel.numero, nivel_titulo: nivel.titulo });
    }
  }
  return lista;
}

export function mesclar(a, b) {
  const uniao = {};
  for (const fonte of [a || {}, b || {}]) {
    for (const id of Object.keys(fonte)) if (fonte[id]) uniao[id] = true;
  }
  return uniao;
}

export function todosFeitos(feitos, ids) {
  return ids.length > 0 && ids.every((id) => !!feitos[id]);
}

// Um documento pode estar em mais de um nó: marcar ou desmarcar vale para todos eles.
export function alternar(feitos, ids) {
  const marcou = !todosFeitos(feitos, ids);
  const novo = { ...feitos };
  for (const id of ids) {
    if (marcou) novo[id] = true;
    else delete novo[id];
  }
  return { feitos: novo, marcou };
}

export function idsDoDoc(niveis, doc) {
  return itensEmOrdem(niveis).filter((i) => i.doc === doc).map((i) => i.id);
}

export function contar(feitos, niveis) {
  let feitas = 0;
  let total = 0;
  const porNivel = {};
  for (const nivel of niveis) {
    const n = nivel.itens.filter((i) => feitos[i.id]).length;
    porNivel[nivel.numero] = { feitas: n, total: nivel.itens.length };
    feitas += n;
    total += nivel.itens.length;
  }
  return { feitas, total, porNivel, percentual: total ? Math.round((feitas / total) * 100) : 0 };
}

// O `item` da URL situa a posição quando o documento aparece em mais de um nó;
// sem ele (links antigos), vale a primeira aparição.
export function localizar(niveis, doc, itemId) {
  const lista = itensEmOrdem(niveis);
  if (itemId) {
    const exato = lista.find((i) => i.id === itemId && i.doc === doc);
    if (exato) return exato;
  }
  return lista.find((i) => i.doc === doc) || null;
}

export function vizinhos(niveis, itemId) {
  const lista = itensEmOrdem(niveis);
  const i = lista.findIndex((x) => x.id === itemId);
  if (i < 0) return { anterior: null, proxima: null };
  return { anterior: lista[i - 1] || null, proxima: lista[i + 1] || null };
}

export function hrefDoItem(item) {
  return 'doc.html?path=' + item.doc + '&item=' + encodeURIComponent(item.id);
}
