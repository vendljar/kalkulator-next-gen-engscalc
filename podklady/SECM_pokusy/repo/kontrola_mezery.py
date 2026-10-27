#!/usr/bin/env python3
"""SEC-M, čočka repo: zbytkové mezery detekce nastroje/kontrola_udaju.py (stav main).

Použití (z kořene repa):  python3 -I podklady/SECM_pokusy/repo/kontrola_mezery.py [cesta k nástroji]

Pro každý případ vytvoří čerstvý dočasný strom jen s nástrojem a povoleným
seznamem, zasadí do něj JEDEN smyšlený tajný údaj (skládá se až za běhu, aby
tento soubor sám kontrolou neprošel jako nález) a spustí kontrolu.
Očekávání: kód 1 (nález). Kód 0 = mezera. Případ „kontrola“ ověřuje, že
pokus vůbec měří (musí dát 1).
"""
import os
import shutil
import subprocess
import sys
import tempfile

KOREN = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
NASTROJ = sys.argv[1] if len(sys.argv) > 1 else os.path.join(KOREN, 'nastroje', 'kontrola_udaju.py')
SEZNAM = os.path.join(os.path.dirname(NASTROJ), 'povolene_kontakty.txt')
if not os.path.exists(SEZNAM):
    SEZNAM = os.path.join(KOREN, 'nastroje', 'povolene_kontakty.txt')

A = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJ'  # 36 znaků smyšlené „entropie“
HEX40 = ('0123456789abcdef' * 3)[:40]
GH = 'gh' + 'p_' + A
NPM = 'np' + 'm_' + A
JWT = 'ey' + 'JhbGciOiJIUzI1NiJ9.' + 'ey' + 'JzdWIiOiJwb2t1cyJ9.' + 'c2lnbmF0dXJhLXBva3VzLXNt'
AIZA = 'AI' + 'za' + 'SyA' + A[:32]
SKPROJ = 's' + 'k-proj-' + A + A
MAIL = 'jan.novak' + '@' + 'seznam.cz'

PRIPADY = [
    ('kontrola: token GitHub v src/*.md (musí najít)', 'src/poznamka.md', 'token: ' + GH + '\n', 1),
    ('token GitHub v nové kořenové složce (není v SLOZKY)', 'novaslozka/poznamka.md', 'token: ' + GH + '\n', 1),
    ('e-mail ve složce manual_vypocet/ (na main není v SLOZKY)', 'manual_vypocet/obsah.md', 'kontakt ' + MAIL + '\n', 1),
    ('npm token v kořenovém .npmrc', '.npmrc', '//registry.npmjs.org/:_authToken=' + NPM + '\n', 1),
    ('npm token v src/*.js (vzor npm_ chybí)', 'src/x.js', "const t = '" + NPM + "';\n", 1),
    ('token GitHub v kořenovém souboru bez přípony (Makefile)', 'Makefile', 'TOKEN=' + GH + '\n', 1),
    ('token GitHub v src/*.ts (přípona .ts chybí)', 'src/x.ts', "const t = '" + GH + "';\n", 1),
    ('JWT v src/*.js', 'src/x.js', "const jwt = '" + JWT + "';\n", 1),
    ('klíč Google AIza v src/*.js', 'src/x.js', "const k = '" + AIZA + "';\n", 1),
    ('klíč sk-proj- v src/*.js', 'src/x.js', "const k = '" + SKPROJ + "';\n", 1),
    ('token Pipedrive bez kontextu názvu (40 hex v konstantě)', 'netlify/x.mjs', "const PD_KLIC = '" + HEX40 + "';\n", 1),
    ('token Pipedrive jako process.env.PIPEDRIVE_API_TOKEN s výjimkou „pokus“ v hodnotě',
     'netlify/y.mjs', "process.env.PIPEDRIVE_API_TOKEN = 'pokus" + HEX40 + "';\n", 1),
]


def pust(rel, obsah):
    d = tempfile.mkdtemp(prefix='kng_mezery_')
    try:
        os.makedirs(os.path.join(d, 'nastroje'))
        shutil.copy(NASTROJ, os.path.join(d, 'nastroje', 'kontrola_udaju.py'))
        shutil.copy(SEZNAM, os.path.join(d, 'nastroje', 'povolene_kontakty.txt'))
        for sl in ('src', 'netlify'):
            os.makedirs(os.path.join(d, sl), exist_ok=True)
        cil = os.path.join(d, rel)
        os.makedirs(os.path.dirname(cil), exist_ok=True)
        open(cil, 'w', encoding='utf-8').write(obsah)
        r = subprocess.run([sys.executable, '-I', os.path.join(d, 'nastroje', 'kontrola_udaju.py')],
                           capture_output=True, text=True)
        return r.returncode
    finally:
        shutil.rmtree(d)


mezer = 0
kontrola_ok = True
for i, (popis, rel, obsah, ocek) in enumerate(PRIPADY):
    kod = pust(rel, obsah)
    stav = 'OK (najde)' if kod == ocek else 'MEZERA (kód %d)' % kod
    if kod != ocek:
        if i == 0:
            kontrola_ok = False
        else:
            mezer += 1
    print('%-80s %s' % (popis + ' [' + rel + ']', stav))
if not kontrola_ok:
    print('VÝSLEDEK: NEPLATNÝ — kontrolní případ nenašel nic, pokus neměří')
    sys.exit(2)
print('VÝSLEDEK: %d z %d případů projde kontrolou bez nálezu (mezery detekce)' % (mezer, len(PRIPADY) - 1))
