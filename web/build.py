"""Empacota web/src em um único arquivo web/dist/index.html (abre com duplo clique, sem servidor).

A ordem dos scripts vem de web/index.html (fonte única da ordem de carregamento).
    python web/build.py
"""
import re
from pathlib import Path

WEB = Path(__file__).resolve().parent
SRC = WEB / "src"


def main():
    index = (WEB / "index.html").read_text(encoding="utf-8")
    scripts = re.findall(r'<script src="src/([^"]+)"></script>', index)
    css = (SRC / "style.css").read_text(encoding="utf-8")
    js = "".join((SRC / f).read_text(encoding="utf-8") + "\n" for f in scripts)

    html = re.sub(r'<link rel="stylesheet" href="src/style.css">', lambda _: "<style>\n" + css + "\n</style>", index)
    html = re.sub(r'(?:<script src="src/[^"]+"></script>\s*)+', lambda _: "<script>\n" + js + "</script>\n", html)

    out = WEB / "dist" / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"{out.relative_to(WEB.parent)}: {len(html) / 1024:.1f} KB, {len(scripts)} scripts")


if __name__ == "__main__":
    main()
