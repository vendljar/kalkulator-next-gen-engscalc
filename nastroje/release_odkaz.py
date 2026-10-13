#!/usr/bin/env python3
"""Odkaz na nový GitHub release S POPISEM ZMĚN (pravidlo J. V. 13. 10. 2026).

Do 13. 10. 2026 nesl odkaz na release jen tag, cíl a titulek — popis změn
J. V. dopisoval ručně, nebo release zůstal prázdný. Pravidlo: každý odkaz
na nový release nese i `&body=` s krátkým souhrnem z CHANGELOG (co je nové,
co opravené včetně čísel roadmapy a nálezů, výsledek kola). Tenhle nástroj
text vytáhne z oddílů `## v<verze> — …` v CHANGELOG.md (verze může mít
oddílů víc — paralelní větve) a vyrobí odkaz.

Použití:
  python3 nastroje/release_odkaz.py 12.10.4 <plný SHA>        odkaz na nový release
  python3 nastroje/release_odkaz.py 12.10.4 --upravit         odkaz na úpravu vydaného
                                                              releasu + text k vložení
  --changelog <soubor>   jiný CHANGELOG (testy)
  --jen-text             vypíše jen popis (bez odkazu)

Ceny a osobní údaje do popisu nepatří: řádek s částkou v Kč/EUR se vynechá
(CHANGELOG je navíc hlídaný nastroje/kontrola_udaju.py).
"""
import os
import re
import sys
import urllib.parse

REPO = 'https://github.com/vendljar/kalkulator-next-gen-engscalc'
MAX_POPIS = 1800          # znaků popisu; delší se zkrátí s odkazem na CHANGELOG
MAX_BODU = 12             # odrážek na jeden oddíl
CASTKA = re.compile(r'\d[\d\s .,]*\s?(Kč|CZK|EUR|€)')


def oddily(text, verze):
    """Vrátí [(titulek, [řádky těla])] všech oddílů `## v<verze> — …`."""
    vysledek, aktualni = [], None
    hlavicka = re.compile(r'^## v' + re.escape(verze) + r'(\s|$)')
    for radek in text.splitlines():
        if radek.startswith('## '):
            if hlavicka.match(radek):
                titulek = radek[3:].strip()
                titulek = re.sub(r'^v' + re.escape(verze) + r'\s*[—–-]\s*', '', titulek)
                aktualni = (titulek, [])
                vysledek.append(aktualni)
            else:
                aktualni = None
            continue
        if aktualni is not None:
            aktualni[1].append(radek)
    return vysledek


def bez_vetve(titulek):
    titulek = re.sub(r'\s*\((větev|branch)[^)]*\)\s*$', '', titulek)
    return re.sub(r';\s*větev [^)]*\)\s*$', ')', titulek).strip()


VELKE = 'A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ'


def prvni_veta(text):
    """Do první tečky/středníku, za kterým začíná nová věta velkým písmenem."""
    return re.split(r'(?<=[.;])\s+(?=[' + VELKE + r'(])', text.strip())[0].rstrip('.;: ')


def body_oddilu(radky):
    """Úvodní tučná část každé odrážky („**B134 (vysoká) — …**") + věta o kole."""
    body, kolo = [], []
    for i, r in enumerate(radky):
        if r.startswith('- '):
            m = re.match(r'- \*\*(.+?)\*\*', r)
            if m:
                bod = m.group(1).strip().rstrip('.')
            else:
                # odrážka bez tučného začátku — první věta
                bod = r[2:].strip()
                for n in radky[i + 1:i + 3]:
                    if n.startswith('  ') and not n.strip().startswith('-'):
                        bod += ' ' + n.strip()
                    else:
                        break
                bod = prvni_veta(bod.replace('**', ''))
            if bod.startswith('Celé kolo'):
                continue          # výsledek kola jde zvlášť jako „Testy:"
            if len(bod) > 160:
                bod = bod[:157].rstrip() + '…'
            body.append(bod)
    spojeny = ' '.join(r.strip() for r in radky)
    m = re.search(r'\*\*(Celé kolo[^*]+)\*\*(.*)', spojeny)
    if m:
        k = (m.group(1).rstrip(':') + ': ' + prvni_veta(m.group(2))).replace('**', '')
        kolo.append(k[:240])
    return body, kolo


def popis(text, verze):
    casti = oddily(text, verze)
    if not casti:
        raise SystemExit(f'CHANGELOG nemá oddíl ## v{verze}')
    radky = []
    for titulek, telo in casti:
        body, kolo = body_oddilu(telo)
        radky.append('### ' + bez_vetve(titulek))
        for b in body[:MAX_BODU]:
            if not CASTKA.search(b):
                radky.append('- ' + b)
        if len(body) > MAX_BODU:
            radky.append(f'- … a dalších {len(body) - MAX_BODU}')
        for k in kolo:
            if not CASTKA.search(k):
                radky.append('Testy: ' + k + '.')
        radky.append('')
    radky.append('Podrobně: CHANGELOG.md, oddíl v' + verze + '.')
    vysl = '\n'.join(radky).strip() + '\n'
    if len(vysl) > MAX_POPIS:
        konec = '\n…\nPodrobně: CHANGELOG.md, oddíl v' + verze + '.\n'
        vysl = vysl[:MAX_POPIS - len(konec)].rsplit('\n', 1)[0] + konec
    return vysl, bez_vetve(casti[0][0])


def odkaz_novy(verze, sha, text):
    telo, nadpis = popis(text, verze)
    q = urllib.parse.urlencode({
        'tag': 'v' + verze, 'target': sha,
        'title': f'v{verze} — {nadpis}', 'body': telo,
    }, quote_via=urllib.parse.quote)
    return f'{REPO}/releases/new?{q}', telo


def odkaz_uprava(verze):
    return f'{REPO}/releases/edit/v{verze}'


def main(argv):
    args = list(argv)
    changelog = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'CHANGELOG.md')
    if '--changelog' in args:
        i = args.index('--changelog'); changelog = args[i + 1]; del args[i:i + 2]
    jen_text = '--jen-text' in args
    upravit = '--upravit' in args
    args = [a for a in args if a not in ('--jen-text', '--upravit')]
    if not args:
        print(__doc__); return 2
    verze = args[0].lstrip('v')
    if not re.fullmatch(r'\d{1,2}\.\d{1,2}\.\d{1,2}', verze):
        print('verze musí být ve tvaru D.M.N (např. 12.10.4)'); return 2
    with open(changelog, encoding='utf-8') as f:
        text = f.read()
    if jen_text:
        print(popis(text, verze)[0], end=''); return 0
    if upravit:
        print(odkaz_uprava(verze))
        print('\nText k vložení do popisu:\n')
        print(popis(text, verze)[0], end=''); return 0
    if len(args) < 2 or not re.fullmatch(r'[0-9a-f]{40}', args[1]):
        print('chybí plný SHA cíle (40 znaků hex)'); return 2
    print(odkaz_novy(verze, args[1], text)[0])
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
