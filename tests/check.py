#!/usr/bin/env python3
"""Comprobaciones del portfolio: estructura y privacidad. Solo stdlib."""
import re, sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX, APP, SCENE = ROOT / "index.html", ROOT / "app.js", ROOT / "pipeline3d.js"
SECTIONS = ["hero", "pipeline", "ia", "integracion", "construccion", "acr", "experiencia", "formacion", "contacto"]
PUBLICADOS = ["index.html", "app.js", "pipeline3d.js", "pipeline-ui.js", "pipeline-datos.js", "styles.css", "README.md"]

# La privacidad se comprueba con patrones, no con una lista de datos reales:
# este fichero es público y no debe contener lo que pretende mantener fuera.
IPV4 = re.compile(r"\b\d{1,3}(?:\.\d{1,3}){3}\b")
PHONE = re.compile(r"\b[67]\d{2}[ .-]?\d{3}[ .-]?\d{3}\b")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[A-Za-z]{2,}")
# Tokens concretos (hostnames, nombres que no deben salir) en un fichero local ignorado por git.
LOCAL_FORBIDDEN = ROOT / "tests" / "forbidden.local.txt"


def es_privada(ip):
    try:
        o = [int(x) for x in ip.split(".")]
    except ValueError:
        return False
    if any(x > 255 for x in o):
        return False
    return o[0] in (10, 127) or (o[0] == 192 and o[1] == 168) or (o[0] == 172 and 16 <= o[1] <= 31)


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.hrefs, self.imgs, self.lang, self.robots = set(), [], [], None, None
        self.text, self._svg = [], 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "svg":
            self._svg += 1
        if tag == "html":
            self.lang = a.get("lang")
        if tag == "meta" and a.get("name") == "robots":
            self.robots = a.get("content")
        if a.get("id"):
            self.ids.add(a["id"])
        if tag == "a" and a.get("href"):
            self.hrefs.append(a["href"])
        if tag == "img":
            self.imgs.append(a.get("src", ""))

    def handle_endtag(self, tag):
        if tag == "svg" and self._svg:
            self._svg -= 1

    def handle_data(self, data):
        if not self._svg:
            self.text.append(data)


def main():
    fails = []
    ok = lambda cond, msg: None if cond else fails.append(msg)

    for f in (INDEX, APP, SCENE):
        ok(f.exists(), f"falta {f.name}")
    if fails:
        return report(fails)

    html = INDEX.read_text(encoding="utf-8")
    page = Page()
    page.feed(html)
    ok(page.lang == "es", "html[lang] debe ser 'es'")
    ok(page.robots and "noindex" in page.robots, "falta <meta name=robots content=noindex>")
    for s in SECTIONS:
        ok(s in page.ids, f"falta la sección #{s}")
    for h in page.hrefs:
        if h.startswith("#"):
            ok(h[1:] in page.ids, f"ancla rota: {h}")
    for src in page.imgs:
        if not src.startswith(("http", "data:")):
            ok((ROOT / src).exists(), f"imagen inexistente: {src}")

    # Privacidad: sobre el texto visible de index.html (el SVG queda fuera: son coordenadas)...
    texto = "".join(page.text)
    for ip in IPV4.findall(texto):
        ok(not es_privada(ip), f"IP privada en index.html: {ip}")
    for tel in PHONE.findall(texto):
        ok(False, f"posible teléfono en index.html: {tel}")
    for mail in EMAIL.findall(html):
        ok(False, f"email en claro en index.html: {mail} (debe ensamblarse en app.js)")
    # ...y los tokens prohibidos sobre todo lo que se publica.
    if LOCAL_FORBIDDEN.exists():
        toks = [l.strip() for l in LOCAL_FORBIDDEN.read_text(encoding="utf-8").splitlines()]
        toks = [t for t in toks if t and not t.startswith("#")]
        for name in PUBLICADOS:
            p = ROOT / name
            if not p.exists():
                continue
            cuerpo = p.read_text(encoding="utf-8")
            for tok in toks:
                ok(tok not in cuerpo, f"texto prohibido en {name}: {tok!r}")
    else:
        print(f"aviso: sin {LOCAL_FORBIDDEN.name}, no se comprueban tokens concretos")
    return report(fails)


def report(fails):
    if fails:
        print("FAIL")
        for f in fails:
            print(" -", f)
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
