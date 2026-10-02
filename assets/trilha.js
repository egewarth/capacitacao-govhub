// Catálogo e trilhas (docs/trilhas/*.json, gerados de trilhas/*.md por tools/gen_roadmap.py).
// Cada arquivo é baixado uma vez por página; uma falha não fica em cache (dá para tentar de novo).
const cache = new Map();

function buscar(url) {
  if (!cache.has(url)) {
    const promessa = fetch(url).then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
    promessa.catch(() => cache.delete(url));
    cache.set(url, promessa);
  }
  return cache.get(url);
}

export const carregarCatalogo = () => buscar('docs/trilhas/index.json');
export const carregarTrilha = (slug) => buscar('docs/trilhas/' + encodeURIComponent(slug) + '.json');

// O slug pedido, se existir no catálogo; senão a primeira trilha; senão null.
export function escolherTrilha(catalogo, slug) {
  const slugs = (catalogo && catalogo.trilhas || []).map((t) => t.slug);
  if (slug && slugs.includes(slug)) return slug;
  return slugs[0] || null;
}
