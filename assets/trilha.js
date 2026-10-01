// docs/trilhas/trilha.json — gerado do ROADMAP.md por tools/gen_roadmap.py — carregado uma vez.
let promessa = null;

export function carregarTrilha() {
  if (!promessa) {
    promessa = fetch('docs/trilhas/trilha.json').then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  return promessa;
}
