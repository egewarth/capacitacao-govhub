// Monta elementos sem innerHTML: títulos e nomes vêm de dados (trilhas/*.md, conta Google) e são
// texto, não HTML.
export function el(tag, attrs = {}, ...filhos) {
  const no = document.createElement(tag);
  for (const [nome, valor] of Object.entries(attrs)) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (nome === 'class') no.className = valor;
    else if (nome.startsWith('on')) no.addEventListener(nome.slice(2), valor);
    else no.setAttribute(nome, valor === true ? '' : String(valor));
  }
  no.append(...filhos.filter((f) => f !== null && f !== undefined && f !== false));
  return no;
}
