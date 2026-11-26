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

JEDNA EVIDENCE (S6, 18. 11. 2026, rozhodnutí J. V.)

Úkoly, nálezy kol, otázky, rozhodnutí i dávky se vedou JEN tady, každá
položka pod číslem (#613 a dál). Nepovinná pole nového schématu:

  typ        ukol | nalez | otazka | rozhodnuti | davka   (chybí = ukol)
  cekaNa     „<kdo>: <co>“, kdo = J. V. | kolega | koordinace | dávka |
             integrátor | externí; povinné u každé nehotové položky
  kolo       číslo testovacího kola (povinné u typu nalez)
  vetev      git větev, ve které se položka dělá
  verze      vDEN.MĚSÍC.pořadí, ve které je hotová (u starých hotovoV)
  dopadCena  ano | ne — mění položka cenu nabídky
  alias      [staré značky] — K48-N1, B1, C7, B0.1 …; jen k dohledání,
             nové značky jsou už jen čísla
  novinka    jedna věta pro kolegy do NOVINKY.md (nepovinné)
  jinak      co mají kolegové dělat jinak (nepovinné, do NOVINKY.md)

Migrace starých položek (`--migrace`) doplní typ a sjednotí cekaNa u
nehotových položek a zapíše aliasy; mění jen dotčené položky (každou na
jeden řádek), zbytek souboru zůstává znak po znaku, aby se souběžné větve
při slučování nehádaly o celý soubor.

ARCHIV HOTOVÝCH POLOŽEK (#642, S6 d; souhlas J. V. 22. 11. 2026)

Hotové položky dokončené před víc než 60 dny leží v `roadmap_archiv.json`
vedle živého souboru (obecně `<jméno>_archiv.json` vedle `--soubor`).
Živý `roadmap.json` tak nese jen otevřenou a čerstvou práci a souběžné
větve se při slučování nehádají o megabajt textu. Archiv je pořád část
evidence:

  · `--kontrola` čte živý soubor i archiv dohromady — číslo z archivu
    nejde použít znovu, závislost na archivované položce není viselec,
    alias z archivu nemůže dostat jiná položka; v archivu smí být jen
    hotové položky.
  · `--hledej` hledá i v archivu; stránka ROADMAPA.html a ROADMAPA.md
    se vyrábějí z obojího, takže se nic neztratí z dohledu.
  · `--zive`, PREHLED.md a NOVINKY.md čtou jen živý soubor (archiv nese
    jen staré hotové položky, které do nich nepatří).

Datum dokončení = verze (`verze`, jinak první vDEN.MĚSÍC.pořadí v `hotovoV`,
rok podle data přesunu), jinak první datum „D. M. RRRR“ v `hotovoV`.
Hotová položka bez zjistitelného data zůstává v živém souboru.

Použití:
    python3 roadmapa/roadmapa.py --kontrola   # jen pravidla, nic nezapíše
    python3 roadmapa/roadmapa.py              # → ROADMAPA.html + ROADMAPA.md
    python3 roadmapa/roadmapa.py --zive       # nehotové položky s „čeká na“
    python3 roadmapa/roadmapa.py --hledej K48-N1   # položka podle čísla nebo aliasu
    python3 roadmapa/roadmapa.py --migrace [--nanecisto]
    python3 roadmapa/roadmapa.py --archivuj [--dni 60] [--k 22.11.2026] [--nanecisto]
    --soubor <roadmap.json>                   # jiný zdroj (testy); archiv vedle něj
"""

import json
import os
import re
import sys
from datetime import date, timedelta

KOREN = os.path.dirname(os.path.abspath(__file__))
ZDROJ = os.path.join(KOREN, 'roadmap.json')
SABLONA = os.path.join(KOREN, 'sablona.html')
VYSTUP_HTML = os.path.join(KOREN, 'ROADMAPA.html')
VYSTUP_MD = os.path.join(KOREN, 'ROADMAPA.md')

ZNACKA = '<?ROADMAP_JSON?>'
STAVY = ('hotovo', 'ceka', 'blokovano')
STAV_NAZEV = {'hotovo': 'hotovo', 'ceka': 'čeká', 'blokovano': 'blokováno'}

# --- S6: jedna evidence -------------------------------------------------
TYPY = ('ukol', 'nalez', 'otazka', 'rozhodnuti', 'davka')
TYP_NAZEV = {'ukol': 'úkol', 'nalez': 'nález', 'otazka': 'otázka',
             'rozhodnuti': 'rozhodnutí', 'davka': 'dávka'}
KDO = ('J. V.', 'kolega', 'koordinace', 'dávka', 'integrátor', 'externí')
RE_CEKANA = re.compile(r'^(' + '|'.join(re.escape(k) for k in KDO) + r'): \S')
RE_VERZE = re.compile(r'^v\d{1,2}\.\d{1,2}\.\d{1,2}$')
# Dočasná značka dávky („G1“, svěřené G1-T1, 25. 11. 2026): dávka, které číslo
# verze přidělí koordinace, píše do `verze` jméno dávky; koordinace ho při
# sloučení přepíše na vDEN.MĚSÍC.pořadí. Velká písmena + nejvýš 3 číslice (rychlá oprava
# „R813“ nese číslo nálezu, svěřené R813-T1; „TX“ bez číslice, svěřené TX-T1).
RE_VERZE_DAVKA = re.compile(r'^[A-Z]{1,4}\d{0,3}$')
RE_VETEV = re.compile(r'^[A-Za-z0-9._/-]+$')
RE_VERZE_V_TEXTU = re.compile(r'v\d{1,2}\.\d{1,2}\.\d{1,2}')
STARA_ID = {'xx', '151a', '151b'}        # jediné nečíselné značky (před S6)

# Jednorázová migrace S6 (18. 11. 2026). Idempotentní: co už je zapsané,
# se nepřepisuje. Staré značky → aliasy u existujících položek.
MIGRACE_TYP = {'222': 'otazka'}
MIGRACE_CEKANA = {
    '19': 'J. V.: zadání a priorita (notifikace přes mobil zatím nezařazeny do dávky)',
    '28': 'J. V.: zadání a priorita (MCP napojení zatím nezařazeno do dávky)',
    '598': 'J. V.: ruční zkouška víc zákazníků na testu (vypínač viceZakazniku zapíná administrátor)',
    '31': 'kolega: přeposlání seznamů připomínek obchodníků a obchodního technika',
    '113': 'J. V.: API token a doména v proměnných Netlify (odsunuto 10. 8. 2026)',
    '115': 'J. V.: rozhodnutí z kontrolní tabulky — kolize dvou kalkulací nad jedním polem v CRM (odsunuto 10. 8. 2026)',
    '116': 'J. V.: návaznost na #113 — token a doména v Netlify (odsunuto 10. 8. 2026)',
    '117': 'J. V.: rozhodnutí o nedopsaných polích v CRM (odsunuto 10. 8. 2026)',
    '172': 'J. V.: lokální `npm install --package-lock-only` a pár kliknutí v administraci Netlify',
    '500': 'kolega: podklady controllingu (šablona se pošle v listopadu, vyplní po návratu v prosinci)',
    '578': 'J. V.: zadání a vzor smlouvy GD',
    '597': 'J. V.: rozsah zápisu do dealu (pole, fáze) před zahájením; mimo etapy VZ',
}
MIGRACE_ALIAS = {
    '608': ['C9'],
    '579': ['K40a'],
    '580': ['K40b', 'K40-S1', 'K40-N3', 'K40-S2'],
    '581': ['K40c'],
    '587': ['K43-T1'],
    '585': ['C5'],
    '582': ['C1'],
    '583': ['C2'],
    '584': ['C3'],
}


def typ(p):
    """Typ položky; staré položky bez pole jsou úkoly."""
    return (p or {}).get('typ') or 'ukol'


def verze(p):
    """Verze, ve které je položka hotová: `verze`, jinak první vX.Y.Z z `hotovoV`."""
    v = str((p or {}).get('verze') or '').strip()
    if v:
        return v
    m = RE_VERZE_V_TEXTU.search(str((p or {}).get('hotovoV') or ''))
    return m.group(0) if m else ''


def kdo_ceka(p):
    """Na koho položka čeká (první část `cekaNa` před dvojtečkou), jinak ''."""
    m = RE_CEKANA.match(str((p or {}).get('cekaNa') or ''))
    return m.group(1) if m else ''


def aliasy(p):
    a = (p or {}).get('alias') or []
    return a if isinstance(a, list) else [a]


def nacti(soubor=None):
    with open(soubor or ZDROJ, encoding='utf-8') as f:
        return json.load(f)


# --- archiv hotových položek (#642) -----------------------------------------

ARCHIV_PRAZDNY = ('{\n "_comment" : "Archiv hotových položek roadmapy (#642, S6 d). Plní ho '
                  '`python3 roadmapa/roadmapa.py --archivuj`; čísla odsud se znovu nepoužívají '
                  '(hlídá --kontrola). Položky beze změny, jedna na řádek.",\n "polozky" : [\n ]\n}\n')
RE_DATUM = re.compile(r'(\d{1,2})\.\s?(\d{1,2})\.\s?(20\d\d)')


def cesta_archivu(soubor=None):
    """`roadmap.json` → `roadmap_archiv.json` ve stejné složce."""
    zdroj = soubor or ZDROJ
    koren, pripona = os.path.splitext(zdroj)
    return koren + '_archiv' + (pripona or '.json')


def nacti_archiv(soubor=None):
    """Položky archivu (prázdný seznam, když archiv není)."""
    cesta = cesta_archivu(soubor)
    if not os.path.exists(cesta):
        return []
    with open(cesta, encoding='utf-8') as f:
        return json.load(f).get('polozky') or []


def s_archivem(db, archiv):
    """Celá evidence pro stránku a hledání: archiv (starší) + živé položky."""
    if not archiv:
        return db
    vysl = dict(db)
    vysl['polozky'] = list(archiv) + list(db.get('polozky') or [])
    return vysl


def datum_hotovo(p, k_datu):
    """Datum dokončení hotové položky, nebo None (pak se nearchivuje)."""
    v = verze(p)
    if v and RE_VERZE.match(v):
        den, mesic = (int(x) for x in v[1:].split('.')[:2])
        for rok in (k_datu.year, k_datu.year - 1):
            try:
                d = date(rok, mesic, den)
            except ValueError:
                return None
            if d <= k_datu:
                return d
        return None
    m = RE_DATUM.search(str((p or {}).get('hotovoV') or ''))
    if m:
        try:
            return date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        except ValueError:
            return None
    return None


def k_archivaci(db, k_datu, dni=60):
    """Id hotových položek dokončených před víc než `dni` dny."""
    mez = k_datu - timedelta(days=dni)
    vysl = []
    for p in db.get('polozky', []):
        if (p or {}).get('stav') != 'hotovo' or str(p.get('cekaNa') or '').strip():
            continue
        d = datum_hotovo(p, k_datu)
        if d is not None and d < mez:
            vysl.append(str(p.get('id')))
    return vysl


def archivuj_text(text, text_archivu, ids):
    """(nový živý text, nový text archivu). Přesouvané položky zmizí z živého
    souboru i s oddělovačem, do archivu se připojí na konec, každá na řádek;
    vše ostatní zůstane znak po znaku."""
    ids = set(ids)
    rozsahy = rozsahy_polozek(text)
    presun = [obj for _, _, obj in rozsahy if str(obj.get('id')) in ids]
    zac_pole = text.index('[', text.index('"polozky"')) + 1
    casti, prvni = [], True
    for i, (z, k, obj) in enumerate(rozsahy):
        if str(obj.get('id')) in ids:
            continue
        # oddělovač: u první zbylé položky původní začátek pole, jinak
        # původní mezera před touto položkou (od konce předchozí položky)
        casti.append(text[zac_pole:rozsahy[0][0]] if prvni else text[rozsahy[i - 1][1]:z])
        casti.append(text[z:k])
        prvni = False
    if prvni:
        raise SystemExit('archivace by vyprázdnila živý soubor — nic nezapsáno')
    novy = text[:zac_pole] + ''.join(casti) + text[rozsahy[-1][1]:]

    text_archivu = text_archivu or ARCHIV_PRAZDNY
    r_arch = rozsahy_polozek(text_archivu)
    if r_arch:
        kon = r_arch[-1][1]
        pridej = ''.join(',\n  ' + json.dumps(p, ensure_ascii=False) for p in presun)
        text_archivu = text_archivu[:kon] + pridej + text_archivu[kon:]
    elif presun:
        zac = text_archivu.index('[', text_archivu.index('"polozky"')) + 1
        pridej = ',\n'.join('  ' + json.dumps(p, ensure_ascii=False) for p in presun)
        text_archivu = text_archivu[:zac] + '\n' + pridej + '\n ' + text_archivu[zac:].lstrip()
    return novy, text_archivu


def kontrola(db, archiv=()):
    """Vrací seznam nálezů. Prázdný seznam = v pořádku.

    `archiv` = položky z `roadmap_archiv.json`: kontrolují se spolu s živými
    (čísla, závislosti, aliasy se nesmí bít ani přes archiv) a musí být hotové.

    Hlídá se přesně to, co jako pravidlo vypisuje roadmapa/README.md, nic
    navíc: test nesmí být přísnější než dohoda, jinak začne překážet.
    """
    n = []
    polozky = db.get('polozky')
    if not isinstance(polozky, list):
        return ['roadmap.json nenese pole „polozky"']
    archiv = list(archiv or [])
    for p in archiv:
        if (p or {}).get('stav') != 'hotovo':
            n.append('#%s je v archivu, ale není hotová (archiv nese jen hotové položky)'
                     % (p or {}).get('id'))
    polozky = archiv + polozky

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
    return n + kontrola_s6(polozky)


def kontrola_s6(polozky):
    """Pravidla jedné evidence (S6, 18. 11. 2026) — viz README, oddíl Jedna evidence."""
    n = []
    znacky = {}
    for p in polozky:
        p = p or {}
        pid = str(p.get('id', ''))
        if pid and not pid.isdigit() and pid not in STARA_ID:
            n.append('#%s: nové značky jsou jen čísla (stará řada patří do „alias")' % pid)
        t = p.get('typ')
        if t is not None and t not in TYPY:
            n.append('#%s má neznámý typ „%s" (%s)' % (pid, t, ' | '.join(TYPY)))
        stav = p.get('stav')
        cek = str(p.get('cekaNa') or '').strip()
        if stav in ('ceka', 'blokovano'):
            if 'typ' not in p:
                n.append('#%s je nehotová a nemá typ (python3 roadmapa/roadmapa.py --migrace)' % pid)
            if not cek:
                n.append('#%s je nehotová a neříká, na co čeká (cekaNa „<kdo>: <co>")' % pid)
            elif not RE_CEKANA.match(cek):
                n.append('#%s: cekaNa nezačíná „<kdo>: " (kdo = %s)' % (pid, ' | '.join(KDO)))
        if stav == 'hotovo' and 'typ' in p and not verze(p):
            n.append('#%s je hotová, ale nemá verzi (pole „verze")' % pid)
        if t == 'nalez' and not str(p.get('kolo', '')).strip():
            n.append('#%s je nález bez čísla kola (pole „kolo")' % pid)
        if 'kolo' in p and not re.fullmatch(r'\d{1,3}', str(p.get('kolo'))):
            n.append('#%s: kolo „%s" není číslo' % (pid, p.get('kolo')))
        if 'verze' in p and not (RE_VERZE.match(str(p.get('verze'))) or RE_VERZE_DAVKA.match(str(p.get('verze')))):
            n.append('#%s: verze „%s" není ve tvaru vDEN.MĚSÍC.pořadí' % (pid, p.get('verze')))
        if 'vetev' in p and not RE_VETEV.match(str(p.get('vetev'))):
            n.append('#%s: větev „%s" není platné jméno větve' % (pid, p.get('vetev')))
        if 'dopadCena' in p and p.get('dopadCena') not in ('ano', 'ne'):
            n.append('#%s: dopadCena je jen „ano" nebo „ne"' % pid)
        if 'alias' in p:
            a = p.get('alias')
            if not isinstance(a, list) or not all(isinstance(x, str) and x.strip() for x in a):
                n.append('#%s: alias je seznam neprázdných textů' % pid)
                continue
            for x in a:
                k = x.strip().lower()
                if k.lstrip('#').isdigit():
                    n.append('#%s: alias „%s" je číslo — čísla jsou id, ne aliasy' % (pid, x))
                elif k in znacky and znacky[k] != pid:
                    n.append('alias „%s" mají #%s i #%s' % (x, znacky[k], pid))
                else:
                    znacky[k] = pid
    return n


# --- zápis beze změny formátu nedotčených položek --------------------------

def rozsahy_polozek(text):
    """[(začátek, konec, položka)] pro každou položku pole „polozky" v textu."""
    i = text.index('[', text.index('"polozky"')) + 1
    dek = json.JSONDecoder()
    mezera = re.compile(r'[\s,]*')
    vysl = []
    while True:
        i = mezera.match(text, i).end()
        if text[i] == ']':
            return vysl
        obj, konec = dek.raw_decode(text, i)
        vysl.append((i, konec, obj))
        i = konec


def zapis_zmeny(text, zmenene, nove=()):
    """Vrátí nový text: položky ze `zmenene` (id → položka) přepíše na jeden
    řádek, `nove` připojí na konec pole; vše ostatní zůstane znak po znaku."""
    rozsahy = rozsahy_polozek(text)
    for zac, kon, obj in reversed(rozsahy):
        pid = str(obj.get('id'))
        if pid in zmenene:
            text = text[:zac] + json.dumps(zmenene[pid], ensure_ascii=False) + text[kon:]
    if nove:
        kon = rozsahy_polozek(text)[-1][1]
        pridej = ''.join(',\n  ' + json.dumps(p, ensure_ascii=False) for p in nove)
        text = text[:kon] + pridej + text[kon:]
    return text


def migrace(db):
    """Vrátí {id: upravená položka} — co S6 migrace změní (idempotentní)."""
    zmenene = {}
    for p in db.get('polozky', []):
        pid = str(p.get('id'))
        q = dict(p)
        if q.get('stav') in ('ceka', 'blokovano'):
            if 'typ' not in q:
                q['typ'] = MIGRACE_TYP.get(pid, 'ukol')
            cek = str(q.get('cekaNa') or '').strip()
            if pid in MIGRACE_CEKANA and not RE_CEKANA.match(cek):
                q['cekaNa'] = MIGRACE_CEKANA[pid]
            elif cek and not RE_CEKANA.match(cek):
                q['cekaNa'] = sjednot_cekana(cek)
        if pid in MIGRACE_ALIAS:
            a = list(aliasy(q))
            for x in MIGRACE_ALIAS[pid]:
                if x not in a:
                    a.append(x)
            q['alias'] = a
        if q != p:
            zmenene[pid] = q
    return zmenene


def sjednot_cekana(text):
    """Starý volný text „na čí podklad se čeká" → „<kdo>: <text>"."""
    t = text.strip()
    if re.search(r'J\.\s?V\.', t):
        kdo = 'J. V.'
    elif re.search(r'integrátor', t, re.I):
        kdo = 'integrátor'
    elif re.search(r'koleg|správce|obchodní', t, re.I):
        kdo = 'kolega'
    else:
        kdo = 'externí'
    return '%s: %s' % (kdo, t)


# --- výpisy -----------------------------------------------------------------

def zive(db):
    """Nehotové položky seřazené podle toho, na koho čekají."""
    poradi = {k: i for i, k in enumerate(KDO)}
    otev = [p for p in db.get('polozky', []) if p.get('stav') != 'hotovo']
    return sorted(otev, key=lambda p: (poradi.get(kdo_ceka(p), len(KDO)),
                                       int(p['id']) if str(p.get('id')).isdigit() else 0))


def radek_zive(p):
    znak = [TYP_NAZEV.get(typ(p), typ(p))]
    if aliasy(p):
        znak.append(', '.join(aliasy(p)))
    if p.get('kolo'):
        znak.append('kolo %s' % p['kolo'])
    if p.get('dopadCena') == 'ano':
        znak.append('CENA')
    if verze(p):
        znak.append(verze(p))
    nazev = str(p.get('nazev', '')).replace('\n', ' ')
    if len(nazev) > 90:
        nazev = nazev[:89] + '…'
    cek = str(p.get('cekaNa') or '—').replace('\n', ' ')
    if len(cek) > 140:
        cek = cek[:139] + '…'
    return '#%s [%s] %s\n      čeká na: %s' % (p.get('id'), '; '.join(znak), nazev, cek)


def hledej(db, znacka, archiv=()):
    k = znacka.strip().lstrip('#').lower()
    return [p for p in list(archiv or []) + list(db.get('polozky', []))
            if str(p.get('id')).lower() == k or k in (a.lower() for a in aliasy(p))]


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


def archivuj(db, archiv, soubor, argv):
    """--archivuj: hotové položky starší `--dni` (60) k datu `--k` (dnes) do archivu."""
    dni = int(argv[argv.index('--dni') + 1]) if '--dni' in argv else 60
    k_datu = date.today()
    if '--k' in argv:
        d, m, r = (int(x) for x in argv[argv.index('--k') + 1].split('.'))
        k_datu = date(r, m, d)
    nalezy = kontrola(db, archiv)
    if nalezy:
        print('KONTROLA NEPROŠLA — nejdřív opravit, pak archivovat (%d nálezů).' % len(nalezy))
        return 1
    ids = k_archivaci(db, k_datu, dni)
    cesta, cesta_a = soubor or ZDROJ, cesta_archivu(soubor)
    print('Archivace k %s (hotové před %s): %d položek%s.' % (
        k_datu.strftime('%d. %m. %Y'), (k_datu - timedelta(days=dni)).strftime('%d. %m. %Y'),
        len(ids), ' (nanečisto)' if '--nanecisto' in argv else ''))
    if not ids or '--nanecisto' in argv:
        if ids:
            print(' ' + ', '.join('#' + i for i in ids))
        return 0
    with open(cesta, encoding='utf-8') as f:
        text = f.read()
    text_a = ''
    if os.path.exists(cesta_a):
        with open(cesta_a, encoding='utf-8') as f:
            text_a = f.read()
    novy, novy_a = archivuj_text(text, text_a, ids)
    # pojistka: nic se neztratí ani nezdvojí, nepřesunuté položky beze změny
    puvodni = archiv + db['polozky']
    zivy, arch = json.loads(novy), json.loads(novy_a)
    if (sorted(json.dumps(p, sort_keys=True) for p in arch['polozky'] + zivy['polozky'])
            != sorted(json.dumps(p, sort_keys=True) for p in puvodni)
            or [p for p in db['polozky'] if str(p.get('id')) not in set(ids)] != zivy['polozky']
            or {k: v for k, v in zivy.items() if k != 'polozky'} != {k: v for k, v in db.items() if k != 'polozky'}
            or kontrola(zivy, arch['polozky'])):
        print('CHYBA: archivace nesedí s daty — nic nezapsáno.')
        return 1
    with open(cesta_a, 'w', encoding='utf-8') as f:
        f.write(novy_a)
    with open(cesta, 'w', encoding='utf-8') as f:
        f.write(novy)
    print('Živý soubor: %d položek, %d B; archiv: %d položek, %d B.' % (
        len(zivy['polozky']), len(novy.encode('utf-8')), len(arch['polozky']), len(novy_a.encode('utf-8'))))
    return 0


def main():
    argv = sys.argv[1:]
    soubor = None
    if '--soubor' in argv:
        i = argv.index('--soubor'); soubor = argv[i + 1]; del argv[i:i + 2]
    db = nacti(soubor)
    archiv = nacti_archiv(soubor)

    if '--archivuj' in argv:
        return archivuj(db, archiv, soubor, argv)

    if '--migrace' in argv:
        zmenene = migrace(db)
        print('Migrace S6: %d položek k úpravě%s.' % (len(zmenene), ' (nanečisto)' if '--nanecisto' in argv else ''))
        for pid, q in zmenene.items():
            print(' - #%s: %s' % (pid, ', '.join(sorted(k for k in q if q.get(k) != next(
                (p for p in db['polozky'] if str(p.get('id')) == pid), {}).get(k)))))
        if zmenene and '--nanecisto' not in argv:
            cesta = soubor or ZDROJ
            with open(cesta, encoding='utf-8') as f:
                text = f.read()
            novy = zapis_zmeny(text, zmenene)
            ocekavane = dict(db)
            ocekavane['polozky'] = [zmenene.get(str(p.get('id')), p) for p in db['polozky']]
            if json.loads(novy) != ocekavane:
                print('CHYBA: zápis nesedí s daty — nic nezapsáno.')
                return 1
            with open(cesta, 'w', encoding='utf-8') as f:
                f.write(novy)
        return 0

    if '--hledej' in argv:
        znacka = argv[argv.index('--hledej') + 1]
        nalez = hledej(db, znacka, archiv)
        for p in nalez:
            print(radek_zive(p) + '\n      stav: %s' % STAV_NAZEV.get(p.get('stav'), p.get('stav')))
        if not nalez:
            print('Nic: „%s" není číslo ani alias žádné položky.' % znacka)
        return 0 if nalez else 1

    nalezy = kontrola(db, archiv)
    if nalezy:
        print('KONTROLA NEPROŠLA (%d nálezů):' % len(nalezy))
        for x in nalezy:
            print(' - ' + x)
        return 1

    if '--kontrola' in argv:
        print('Kontrola v pořádku: %d položek%s, žádný nález.' % (
            len(db.get('polozky', [])), (' + %d v archivu' % len(archiv)) if archiv else ''))
        return 0

    if '--zive' in argv:
        otev = zive(db)
        if '--json' in argv:
            print(json.dumps([{k: p.get(k) for k in ('id', 'typ', 'stav', 'nazev', 'cekaNa', 'alias',
                                                     'kolo', 'vetev', 'verze', 'dopadCena') if k in p}
                              for p in otev], ensure_ascii=False, indent=1))
            return 0
        print('Živý výpis evidence (roadmapa/roadmap.json): nehotové položky podle toho, na koho čekají.')
        posledni = None
        for p in otev:
            kdo = kdo_ceka(p) or '(neuvedeno)'
            if kdo != posledni:
                print('\n== čeká na: %s ==' % kdo)
                posledni = kdo
            print(radek_zive(p))
        print('\nNehotových položek: %d.' % len(otev))
        return 0

    cele = s_archivem(db, archiv)
    with open(VYSTUP_HTML, 'w', encoding='utf-8') as f:
        f.write(vloz_data(cele))
    with open(VYSTUP_MD, 'w', encoding='utf-8') as f:
        f.write(md(cele))
    print('OK -> %s' % VYSTUP_HTML)
    print('OK -> %s' % VYSTUP_MD)
    return 0


if __name__ == '__main__':
    sys.exit(main())
