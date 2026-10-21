#!/usr/bin/env python3
"""Statická kontrola: osobní údaje a tajemství ve veřejném repozitáři (A4, 25. 9. 2026).

Proč: repozitář je veřejný (hloubkový test 24. 9. 2026, nález B79). J. V. rozhodl
24. 9. 2026 dosavadní výskyty nechat, jak jsou — tahle kontrola je má zapsané
v povoleném seznamu a hlídá, aby se do repozitáře NEDOSTAL žádný NOVÝ e-mail,
telefon ani tajemství. Testy používají smyšlené adresy (…@priklad.cz,
…@example.com) a smyšlená čísla; skutečná adresa nebo klíč ve zdrojácích
zůstane v historii Gitu napořád.

Co se hlídá (v src/, netlify/, server/, nastroje/, manual/, roadmapa/, .github/
a v kořenových *.md, *.toml, *.yml, *.mjs, *.py, *.sh, *.json):
  1. e-mailové adresy mimo povolený seznam (nastroje/povolene_kontakty.txt —
     přesné adresy nebo celé domény zápisem *@domena),
  2. telefonní čísla v českém tvaru (+420 …, 9 číslic začínajících 6/7) mimo
     povolený seznam,
  3. tajemství: privátní klíče, tokeny známého tvaru (GitHub, AWS, Netlify,
     Slack), a tajemství serveru zapsaná doslova do kódu (TAJEMSTVI_RELACE,
     ADMIN_INIT_HESLO, PIPEDRIVE_API_TOKEN, ADMIN_EMAIL = '…').

Použití:  python3 nastroje/kontrola_udaju.py            (0 = čisté, 1 = nálezy)
          python3 nastroje/kontrola_udaju.py --vypis    (jen vypíše všechny výskyty)
Nový nález se řeší buď odstraněním údaje, nebo — jde-li prokazatelně o smyšlený
kontakt v testu — zápisem do povoleného seznamu s důvodem v komentáři.
"""
import os
import re
import sys

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SLOZKY = ['src', 'netlify', 'server', 'nastroje', 'manual', 'roadmapa', '.github']
KORENOVE_PRIPONY = ('.md', '.toml', '.yml', '.yaml', '.mjs', '.js', '.py', '.sh', '.json', '.txt')
PRIPONY = ('.js', '.mjs', '.cjs', '.py', '.sh', '.md', '.toml', '.yml', '.yaml', '.json', '.html', '.txt', '.svg')
VYNECHAT_SLOZKY = {'node_modules', 'dist', '.git', '_soukrome', '_DB', '__pycache__'}
VYNECHAT_SOUBORY = {'roadmapa/ROADMAPA.html', 'roadmapa/ROADMAPA.md', 'manual/nahled.html',
                    'manual/snimky.json', 'nastroje/povolene_kontakty.txt'}

EMAIL = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')
# +420 602 590 945 / +420602590945 / 602 590 945 / 602590945 (mobil 6xx/7xx, ne uvnitř delšího čísla)
TELEFON = re.compile(r'(?<![\w.,/-])(?:\+420[  ]?)?[67]\d{2}[  ]?\d{3}[  ]?\d{3}(?![\w])')
TELEFON_PEVNA = re.compile(r'\+420[  ]?[2-5]\d{2}[  ]?\d{3}[  ]?\d{3}(?![\w])')
TAJEMSTVI = [
    ('privátní klíč', re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----')),
    ('token GitHub', re.compile(r'\bgh[pousr]_[A-Za-z0-9]{30,}\b')),
    ('klíč AWS', re.compile(r'\bAKIA[0-9A-Z]{16}\b')),
    ('token Netlify', re.compile(r'\bnfp_[A-Za-z0-9]{30,}\b')),
    ('token Slack', re.compile(r'\bxox[baprs]-[A-Za-z0-9-]{20,}\b')),
    ('tajemství serveru doslova v kódu',
     re.compile(r'\b(TAJEMSTVI_RELACE|ADMIN_INIT_HESLO|PIPEDRIVE_API_TOKEN|ADMIN_EMAIL)\s*=\s*[\'"][^\'"]{4,}[\'"]')),
]
# Testy a harnessy si tajemství nastavují samy (process.env.X = '…'). To je
# zkušební hodnota, ne tajemství — ale musí to být z jejího znění poznat
# (zkusebni / testovaci / docasne / pokus / harness / priklad). Skutečná hodnota
# patří do proměnných prostředí Netlify a do repozitáře nikdy.
TAJEMSTVI_VYJIMKA = re.compile(
    r'process\.env\.[A-Z_]+\s*=\s*[\'"][^\'"]*(zkusebni|testovaci|docasne|pokus|harness|priklad)[^\'"]*[\'"]', re.I)


def nacti_povolene():
    cesta = os.path.join(KOREN, 'nastroje', 'povolene_kontakty.txt')
    emaily, domeny, telefony = set(), set(), set()
    if not os.path.exists(cesta):
        return emaily, domeny, telefony
    for radek in open(cesta, encoding='utf-8'):
        r = radek.split('#', 1)[0].strip()
        if not r:
            continue
        if r.startswith('*@'):
            domeny.add(r[2:].lower())
        elif '@' in r:
            emaily.add(r.lower())
        else:
            telefony.add(normalizuj_telefon(r))
    return emaily, domeny, telefony


def normalizuj_telefon(t):
    cislic = re.sub(r'\D', '', t)
    return cislic[-9:] if len(cislic) >= 9 else cislic


def soubory():
    out = []
    for jm in sorted(os.listdir(KOREN)):
        cesta = os.path.join(KOREN, jm)
        if os.path.isfile(cesta) and jm.endswith(KORENOVE_PRIPONY):
            out.append(cesta)
    for sl in SLOZKY:
        koren_sl = os.path.join(KOREN, sl)
        if not os.path.isdir(koren_sl):
            continue
        for adresar, podslozky, jmena in os.walk(koren_sl):
            podslozky[:] = [p for p in podslozky if p not in VYNECHAT_SLOZKY]
            for jm in sorted(jmena):
                if jm.endswith(PRIPONY):
                    out.append(os.path.join(adresar, jm))
    return [c for c in out if os.path.relpath(c, KOREN).replace(os.sep, '/') not in VYNECHAT_SOUBORY]


def main():
    vypis = '--vypis' in sys.argv
    emaily, domeny, telefony = nacti_povolene()
    nalezy = []
    videno = {'email': set(), 'telefon': set()}
    for cesta in soubory():
        rel = os.path.relpath(cesta, KOREN).replace(os.sep, '/')
        try:
            text = open(cesta, encoding='utf-8', errors='replace').read()
        except OSError:
            continue
        for i, radek in enumerate(text.split('\n'), 1):
            for m in EMAIL.finditer(radek):
                e = m.group(0).lower().rstrip('.')
                videno['email'].add(e)
                dom = e.split('@', 1)[1]
                if e in emaily or dom in domeny:
                    continue
                nalezy.append((rel, i, 'e-mail mimo povolený seznam', m.group(0)))
            for vzor in (TELEFON, TELEFON_PEVNA):
                for m in vzor.finditer(radek):
                    t = normalizuj_telefon(m.group(0))
                    videno['telefon'].add(t)
                    if t in telefony:
                        continue
                    nalezy.append((rel, i, 'telefon mimo povolený seznam', m.group(0).strip()))
            for popis, vzor in TAJEMSTVI:
                if vzor.search(radek) and not TAJEMSTVI_VYJIMKA.search(radek):
                    nalezy.append((rel, i, popis, radek.strip()[:120]))
    if vypis:
        print('E-maily ve stromu (%d):' % len(videno['email']))
        for e in sorted(videno['email']):
            print('  ' + e + ('' if (e in emaily or e.split('@', 1)[1] in domeny) else '   ← MIMO SEZNAM'))
        print('Telefony ve stromu (%d):' % len(videno['telefon']))
        for t in sorted(videno['telefon']):
            print('  ' + t + ('' if t in telefony else '   ← MIMO SEZNAM'))
    if nalezy:
        print('KONTROLA OSOBNÍCH ÚDAJŮ A TAJEMSTVÍ: %d nález(ů)' % len(nalezy))
        for rel, i, popis, co in nalezy:
            print('  %s:%d  %s: %s' % (rel, i, popis, co))
        print('→ údaj odstraňte, nebo (jen smyšlený kontakt v testu) zapište do nastroje/povolene_kontakty.txt s důvodem.')
        return 1
    print('Kontrola osobních údajů a tajemství: čisté (%d souborů, %d e-mailů a %d telefonů v povoleném seznamu).'
          % (len(soubory()), len(videno['email']), len(videno['telefon'])))
    return 0


if __name__ == '__main__':
    sys.exit(main())
