#!/usr/bin/env python3
"""Ajusta o site combinado: Gov Hub (gov-hub.io) na raiz e as trilhas em /capacitacao/.

Roda no deploy, depois que o MkDocs do Gov Hub gerou a raiz em <saida>/ e as trilhas
foram copiadas para <saida>/capacitacao/. Faz duas coisas:

1. Prefixa os caminhos absolutos do Gov Hub (/govhub/..., /capacitacao/...) com o
   caminho-base do GitHub Pages. No domínio próprio o caminho-base é vazio e nada muda;
   em egewarth.github.io/capacitacao-govhub/ vira /capacitacao-govhub/govhub/...
2. Cria redirecionamentos nos endereços antigos das trilhas (trilhas.html, mapa.html...),
   que ficavam na raiz, para os novos em capacitacao/, preservando ?query e #âncora.

Uso: python3 tools/montar_site.py <saida> [caminho-base]
"""
import re
import sys
from pathlib import Path

PAGINAS_ANTIGAS = ['trilhas', 'mapa', 'doc', 'quiz', 'concluida', 'roadmap']

REDIRECIONAMENTO = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="robots" content="noindex">
<title>Trilhas de capacitação · Gov Hub</title>
<script>location.replace('capacitacao/{pagina}.html' + location.search + location.hash);</script>
<meta http-equiv="refresh" content="0; url=capacitacao/{pagina}.html">
</head>
<body><p>As trilhas mudaram de endereço: <a href="capacitacao/{pagina}.html">capacitacao/{pagina}.html</a>.</p></body>
</html>
"""


def prefixar(saida: Path, base: str) -> int:
    # Só os caminhos do Gov Hub; as trilhas usam caminhos relativos e ficam como estão.
    padrao = re.compile(r'(["\'`(])/(govhub|capacitacao)/')
    alterados = 0
    for arquivo in saida.rglob('*'):
        if arquivo.suffix not in ('.html', '.css', '.js', '.xml', '.webmanifest'):
            continue
        if arquivo.is_relative_to(saida / 'capacitacao'):
            continue
        texto = arquivo.read_text(encoding='utf-8', errors='surrogateescape')
        novo = padrao.sub(lambda m: f'{m.group(1)}{base}/{m.group(2)}/', texto)
        if novo != texto:
            arquivo.write_text(novo, encoding='utf-8', errors='surrogateescape')
            alterados += 1
    return alterados


def redirecionar(saida: Path) -> None:
    for pagina in PAGINAS_ANTIGAS:
        destino = saida / f'{pagina}.html'
        if destino.exists():
            sys.exit(f'{destino} já existe no site do Gov Hub; o redirecionamento o sobrescreveria')
        destino.write_text(REDIRECIONAMENTO.format(pagina=pagina), encoding='utf-8')


def main() -> None:
    if len(sys.argv) not in (2, 3):
        sys.exit(__doc__)
    saida = Path(sys.argv[1])
    base = (sys.argv[2] if len(sys.argv) == 3 else '').rstrip('/')
    if not (saida / 'capacitacao' / 'index.html').exists():
        sys.exit(f'{saida}/capacitacao/index.html não encontrado: copie as trilhas antes')
    if base:
        print(f'{prefixar(saida, base)} arquivos com caminhos prefixados por {base}')
    redirecionar(saida)
    print(f'Redirecionamentos criados: {", ".join(p + ".html" for p in PAGINAS_ANTIGAS)}')


if __name__ == '__main__':
    main()
