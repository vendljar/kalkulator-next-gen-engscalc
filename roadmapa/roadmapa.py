#!/usr/bin/env python3
"""Generátor roadmapy: roadmap.json + sablona.html → ROADMAPA.html a ROADMAPA.md.

PROČ TENHLE SOUBOR VZNIKL (22. 9. 2026, zadání J. V.)

Do 22. 9. 2026 generátor v repozitáři NEBYL — žil v pracovní kopii mimo
GitHub. Důsledky byly dva a oba nepříjemné:

  · Kdo měl po ruce jen repozitář, neuměl stránku přegenerovat. Roadmapa
    proto zůstala na v17.9.2, zatímco aplikace byla o pět buildů dál.
  · Pravidla `roadmap.json` nekontroloval v CI nikdo. Rozbitý JSON nebo
    dvakrát použité číslo se poznaly teprve u toho, kdo generátor měl.
    (Druhé půlce se mezitím postavil `src/test_roadmapa.js`; tenhle skript
    kontroluje totéž, aby `--kontrola` nelhala, když se pustí sama.)

ŠABLONA JE ODDĚLENÁ OD DAT. `sablona.html` je vydaná stránka, ze které se
vyřízla data a nahradila značkou `<?ROADMAP_JSON?>`. Generátor na to místo
vloží obsah `roadmap.json`. Vzhled ani vykreslovací kód se tedy needitují
tady, ale v šabloně; data zase jen v JSONu. Ruční úpravy ROADMAPA.html se
při příštím generování ztratí — proto se ten soubor ani necommituje.

POZOR NA `</` V TEXTECH. Data jdou do `<script>`, takže sekvence `</`
by značku ukončila dřív, než má. Escapuje se na `<\\/`, což je v JSON
řetězci totéž — prohlížeč dostane stejný text.

Použití:
    python3 roadmapa/roadmapa.py --kontrola   # jen pravidla, nic nezapíše
    python3 roadmapa/roadmapa.py              # → ROADMAPA.html + ROADMAPA.md
"""

import json
import os
import sys
from datetime import date

KOREN = os.path.dirname(os.path.abspath(__file__))
ZDROJ = os.path.join(KOREN, 'roadmap.json')
SABLONA = os.path.join(KOREN, 'sablona.html')
VYSTUP_HTML = os.path.join(KOREN, 'ROADMAPA.html')
VYSTUP_MD = os.path.join(KOREN, 'ROADMAPA.md')

ZNACKA = '<?ROADMAP_JSON?>'
STAVY = ('hotovo', 'ceka', 'blokovano')
STAV_NAZEV = {'hotovo': 'hotovo', 'ceka': 'čeká', 'blokovano': 'blokováno'}


def nacti():
    with open(ZDROJ, encoding='utf-8') as f:
        return json.load(f)


def kontrola(db):
    """Vrací seznam nálezů. Prázdný seznam = v pořádku.

    Hlídá se přesně to, co jako pravidlo vypisuje roadmapa/README.md, nic
    navíc: test nesmí být přísnější než dohoda, jinak začne překážet.
    """
    n = []
    polozky = db.get('polozky')
    if not isinstance(polozky, list):
        return ['roadmap.json nenese pole „polozky"']

    videna = {}
    for i, p in enumerate(polozky):
        pid = str((p or {}).get('id', '')).strip()
        if not pid:
            n.append('položka na pozici %d nemá id' % i)
            continue
        if pid in videna:
            n.append('id %s je použité dvakrát' % pid)
        else:
            videna[pid] = p

    for p in polozky:
        pid = str((p or {}).get('id', ''))
        stav = str((p or {}).get('stav', ''))
        if stav not in STAVY:
            n.append('#%s má neznámý stav „%s"' % (pid, stav))
        if stav == 'blokovano' and not str((p or {}).get('cekaNa', '')).strip():
            n.append('#%s je blokovaná, ale neříká, na co se čeká' % pid)
        if stav == 'hotovo' and str((p or {}).get('cekaNa', '')).strip():
            n.append('#%s je hotová, a přesto na něco čeká' % pid)
        if 'odemyka' in (p or {}):
            n.append('#%s má ve zdroji „odemyka" (dopočítá si ho stránka)' % pid)
        zav = (p or {}).get('zavisi') or []
        if not isinstance(zav, list):
            zav = [zav]
        for z in zav:
            cil = str((z.get('id') if isinstance(z, dict) else z) or '').strip()
            if cil and cil not in videna:
                n.append('#%s závisí na #%s, která neexistuje' % (pid, cil))

    vlny = {str(v.get('id')) for v in (db.get('meta', {}).get('vlny') or [])}
    if vlny:
        for p in polozky:
            v = str((p or {}).get('vlna', ''))
            if v and v not in vlny:
                n.append('#%s je ve vlně „%s", kterou meta nezná' % (p.get('id'), v))
    return n


def vloz_data(db):
    """JSON do šablony. `</` se escapuje, jinak by ukončilo <script>."""
    with open(SABLONA, encoding='utf-8') as f:
        sablona = f.read()
    if ZNACKA not in sablona:
        raise SystemExit('sablona.html neobsahuje značku ' + ZNACKA)
    data = json.dumps(db, ensure_ascii=False, indent=1).replace('</', '<\\/')
    return sablona.replace(ZNACKA, data + '\n;')


def md(db):
    """Textová podoba pro čtení mimo prohlížeč (a pro diff v Gitu)."""
    meta = db.get('meta', {})
    out = []
    out.append('# Roadmapa — %s' % meta.get('projekt', ''))
    out.append('')
    out.append('Stav k %s, build %s. Vygenerováno %s skriptem `roadmapa/roadmapa.py`;'
               % (meta.get('stavKDatu', '?'), meta.get('build', '?'), date.today().strftime('%d. %m. %Y')))
    out.append('needitovat ručně, zdroj je `roadmapa/roadmap.json`.')
    out.append('')

    polozky = db.get('polozky', [])
    hotovo = sum(1 for p in polozky if p.get('stav') == 'hotovo')
    out.append('Položek celkem %d, z toho hotovo %d.' % (len(polozky), hotovo))
    out.append('')
    out.append('Složitost: %s' % meta.get('legendaSlozitosti', ''))
    out.append('')

    for vlna in (meta.get('vlny') or []):
        vid = str(vlna.get('id'))
        moje = [p for p in polozky if str(p.get('vlna')) == vid]
        if not moje:
            continue
        out.append('## %s' % vlna.get('nazev', vid))
        out.append('')
        if vlna.get('popis'):
            out.append(vlna['popis'])
            out.append('')
        out.append('| # | Stav | Co | Složitost | Hotovo v / čeká na |')
        out.append('|---|---|---|---|---|')
        for p in moje:
            konec = p.get('hotovoV') or p.get('cekaNa') or ''
            bunka = lambda s: str(s or '').replace('|', '\\|').replace('\n', ' ')
            out.append('| %s | %s | %s | %s | %s |' % (
                bunka(p.get('id')), STAV_NAZEV.get(p.get('stav'), p.get('stav')),
                bunka(p.get('nazev')), bunka(p.get('slozitost')), bunka(konec)))
        out.append('')

    poradi = meta.get('poradi') or []
    if poradi:
        out.append('## Pořadník dávek')
        out.append('')
        for r in poradi:
            out.append('- %s' % str(r.get('text', '')).replace('\n', ' '))
        out.append('')
    return '\n'.join(out) + '\n'


def main():
    db = nacti()
    nalezy = kontrola(db)
    if nalezy:
        print('KONTROLA NEPROŠLA (%d nálezů):' % len(nalezy))
        for x in nalezy:
            print(' - ' + x)
        return 1

    if '--kontrola' in sys.argv:
        print('Kontrola v pořádku: %d položek, žádný nález.' % len(db.get('polozky', [])))
        return 0

    with open(VYSTUP_HTML, 'w', encoding='utf-8') as f:
        f.write(vloz_data(db))
    with open(VYSTUP_MD, 'w', encoding='utf-8') as f:
        f.write(md(db))
    print('OK -> %s' % VYSTUP_HTML)
    print('OK -> %s' % VYSTUP_MD)
    return 0


if __name__ == '__main__':
    sys.exit(main())
