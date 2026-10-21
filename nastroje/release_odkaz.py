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
  python3 nastroje/release_odkaz.py --chybejici               verze z CHANGELOG bez tagu
  --changelog <soubor>   jiný CHANGELOG (testy)
  --jen-text             vypíše jen popis (bez odkazu)

Hlídání dvojího vydání (J. V. 15. 10. 2026 — „tag už zase existuje"): před
odkazem na NOVÝ release se nástroj podívá na tagy v origin (`git ls-remote
--tags`). Když tag už existuje, odkaz na nový release NEVYROBÍ (kód 3)
a vypíše odkaz na vydaný release a na jeho úpravu. Tagy jde pro testy
podstrčit proměnnou KNG_TAGY="v1.2.3,v1.2.4"; když git origin nedosáhne,
nástroj jen varuje a odkaz vyrobí.

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
CASTKA = re.compile(r'\d[\d\s\u00a0.,]*(,-|,–|\.-)?\s?(Kč|CZK|EUR|€)')


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
            if CASTKA.search(bod):
                continue          # částka do popisu nepatří (filtr PŘED zkrácením)
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
        radky.append('### ' + CASTKA.sub('…', bez_vetve(titulek)))
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
    return vysl, CASTKA.sub('…', bez_vetve(casti[0][0]))


def odkaz_novy(verze, sha, text):
    telo, nadpis = popis(text, verze)
    q = urllib.parse.urlencode({
        'tag': 'v' + verze, 'target': sha,
        'title': f'v{verze} — {nadpis}', 'body': telo,
    }, quote_via=urllib.parse.quote)
    return f'{REPO}/releases/new?{q}', telo


def odkaz_uprava(verze):
    return f'{REPO}/releases/edit/v{verze}'


def tagy_origin():
    """Množina tagů v origin; None, když se nedá zjistit."""
    podstrc = os.environ.get('KNG_TAGY')
    if podstrc is not None:
        return {x.strip() for x in podstrc.split(',') if x.strip()}
    import subprocess
    try:
        r = subprocess.run(['git', 'ls-remote', '--tags', 'origin'], capture_output=True,
                           text=True, timeout=60, cwd=os.path.dirname(os.path.abspath(__file__)))
    except (OSError, subprocess.TimeoutExpired):
        return None
    if r.returncode != 0:
        return None
    return {l.split('refs/tags/')[1].removesuffix('^{}') for l in r.stdout.splitlines() if 'refs/tags/' in l}


def verze_changelogu(text):
    """Verze z nadpisů `## vD.M.N` v pořadí CHANGELOG (bez opakování)."""
    vysl = []
    for m in re.finditer(r'^## v(\d{1,2}\.\d{1,2}\.\d{1,2})\b', text, re.M):
        if m.group(1) not in vysl:
            vysl.append(m.group(1))
    return vysl


def main(argv):
    args = list(argv)
    changelog = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'CHANGELOG.md')
    if '--changelog' in args:
        i = args.index('--changelog'); changelog = args[i + 1]; del args[i:i + 2]
    jen_text = '--jen-text' in args
    upravit = '--upravit' in args
    chybejici = '--chybejici' in args
    args = [a for a in args if a not in ('--jen-text', '--upravit', '--chybejici')]
    if chybejici:
        with open(changelog, encoding='utf-8') as f:
            text = f.read()
        tagy = tagy_origin()
        if tagy is None:
            print('tagy z origin nejde zjistit'); return 2
        chybi = [v for v in verze_changelogu(text)[:15] if 'v' + v not in tagy]
        print('Bez tagu (nejnovějších 15 verzí z CHANGELOG): ' + (', '.join('v' + v for v in chybi) or 'žádná'))
        return 0
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
    tagy = tagy_origin()
    if tagy is None:
        print('Pozor: tagy z origin nejde ověřit — zkontrolujte, že v' + verze + ' ještě neexistuje.', file=sys.stderr)
    elif 'v' + verze in tagy:
        print(f'Tag v{verze} UŽ EXISTUJE — release je vydaný, nový nevytvářejte.')
        print(f'Vydaný release: {REPO}/releases/tag/v{verze}')
        print(f'Úprava popisu:  {odkaz_uprava(verze)}')
        return 3
    print(odkaz_novy(verze, args[1], text)[0])
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
