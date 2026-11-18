#!/usr/bin/env python3
"""Přehled stavu pro J. V. a kolegy: PREHLED.md + PREHLED.json (S8, 18. 11. 2026).

Rozhodnutí J. V. 18. 11. 2026: přehled pro kolegy je soubor v repozitáři
(bez e-mailu a bez ClickUp), kokpit koordinace zůstává pro J. V. Zdroj je
jedna evidence (`roadmapa/roadmap.json`, S6) a git — nic se nepíše ručně.

Co přehled nese:
  1. verze v main a v testu (verze.txt na `origin/main` a `origin/test`),
  2. co je v testu a ještě ne v main — položky evidence, jejichž verze je
     v historii testu a není v historii main,
  3. otevřené vady s dopadem na cenu — nálezy s `dopadCena: ano`, které
     nejsou hotové, nebo jejich oprava ještě není v main,
  4. co čeká na J. V. — nehotové položky s `cekaNa` „J. V.: …“
     (odložené ve vlně F jen počtem).

Bez cen a osobních údajů: do přehledu jdou jen čísla položek, názvy, „čeká
na“ a verze; text s částkou v Kč/EUR se nahradí „…“ (stejný vzor jako
release_odkaz.py). Výstup nemá čas vygenerování — pro stejné reference
a evidenci vyjde znak po znaku stejně (krok `staticke` to porovnává).

Spouští koordinace po každém sloučení (do integrace, testu i main):
  python3 nastroje/prehled_stavu.py                  → PREHLED.md + PREHLED.json
  python3 nastroje/prehled_stavu.py --kontrola       jde vyrobit? souhlasí se
                                                     zapsaným? (krok staticke)
  --main <ref> --test <ref>   jiné reference (výchozí origin/main, origin/test)
  --roadmapa <soubor>         jiná evidence (testy)
  --vystup <adresář>          kam zapsat (výchozí kořen repa)
  --repo <adresář>            git repozitář (výchozí kořen repa; testy)

--kontrola: kód 1 jen když přehled nejde vyrobit nebo by nesl částku.
Rozdíl proti zapsanému PREHLED.md je UPOZORNĚNÍ (reference se po každém
sloučení posunou; přehled obnoví koordinace), chybějící reference (mělký
checkout v CI) jen poznámka.
"""
import json
import os
import re
import subprocess
import sys

KOREN = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.join(KOREN, 'roadmapa'))
import roadmapa as rm  # noqa: E402

CASTKA = re.compile(r'\d[\d\s .,]*(,-|,–|\.-)?\s?(Kč|CZK|EUR|€|tis\.\s?Kč)')
RE_VERZE = re.compile(r'^(\d{1,2}\.\d{1,2}\.\d{1,2})\s*$', re.M)


def cisty(text, delka=140):
    t = CASTKA.sub('…', str(text or '').replace('\n', ' ').replace('|', '/')).strip()
    return t if len(t) <= delka else t[:delka - 1].rstrip() + '…'


def git(repo, *args, vstup=None):
    r = subprocess.run(['git', '-C', repo] + list(args), capture_output=True, text=True,
                       input=vstup, timeout=120)
    return r.stdout if r.returncode == 0 else None


def info_ref(repo, ref):
    """{ref, sha, verze, datum} nebo {ref, chybi: True}."""
    sha = git(repo, 'rev-parse', '-q', '--verify', ref + '^{commit}')
    if not sha:
        return {'ref': ref, 'chybi': True}
    verze = (git(repo, 'show', ref + ':verze.txt') or '').strip()
    datum = (git(repo, 'log', '-1', '--format=%cd', '--date=format:%-d. %-m. %Y', ref) or '').strip()
    return {'ref': ref, 'sha': sha.strip()[:8], 'verze': 'v' + verze if verze else '', 'datum': datum}


def verze_v_historii(repo, ref):
    """Množina verzí (vD.M.N), které kdy byly ve verze.txt v historii `ref`."""
    log = git(repo, 'log', '--format=%H', ref, '--', 'verze.txt')
    if log is None:
        return None
    vstup = ''.join(c + ':verze.txt\n' for c in log.split())
    obsah = git(repo, 'cat-file', '--batch', vstup=vstup) if vstup else ''
    return {'v' + v for v in RE_VERZE.findall(obsah or '')}


def polozka(p, **navic):
    d = {'id': str(p.get('id')), 'typ': rm.typ(p), 'nazev': cisty(p.get('nazev'))}
    if rm.aliasy(p):
        d['alias'] = rm.aliasy(p)
    if rm.verze(p):
        d['verze'] = rm.verze(p)
    d.update(navic)
    return d


def sestav(db, repo, ref_main, ref_test):
    main = info_ref(repo, ref_main)
    test = info_ref(repo, ref_test)
    v_main = None if main.get('chybi') else verze_v_historii(repo, ref_main)
    v_test = None if test.get('chybi') else verze_v_historii(repo, ref_test)
    polozky = db.get('polozky', [])

    v_testu = []
    if v_main is not None and v_test is not None:
        for p in polozky:
            v = rm.verze(p)
            if v and v in v_test and v not in v_main:
                v_testu.append(polozka(p))
        v_testu.sort(key=lambda d: (-int(d['id']) if d['id'].isdigit() else 0))

    vady = []
    for p in polozky:
        if rm.typ(p) != 'nalez' or p.get('dopadCena') != 'ano':
            continue
        v = rm.verze(p)
        if p.get('stav') == 'hotovo' and v_main is not None and v in v_main:
            continue
        if v and v_test is not None and v in v_test:
            stav = 'opraveno v testu (%s), v main ne' % v
        elif v:
            stav = 'oprava ve verzi %s, v testu ještě ne' % v
        else:
            stav = 'otevřená'
        vady.append(polozka(p, kolo=str(p.get('kolo', '')), stav=stav,
                            cekaNa=cisty(p.get('cekaNa') or '—', 160)))

    jv, odlozene = [], 0
    for p in rm.zive(db):
        if rm.kdo_ceka(p) != 'J. V.':
            continue
        if p.get('vlna') == 'F':
            odlozene += 1
            continue
        jv.append(polozka(p, cekaNa=cisty(str(p.get('cekaNa'))[len('J. V.: '):], 160)))

    pocty = {}
    for p in rm.zive(db):
        k = rm.kdo_ceka(p) or 'neuvedeno'
        pocty[k] = pocty.get(k, 0) + 1
    commitu = None
    if not main.get('chybi') and not test.get('chybi'):
        n = git(repo, 'rev-list', '--count', ref_main + '..' + ref_test)
        commitu = int(n) if n and n.strip().isdigit() else None
    return {
        'main': main, 'test': test, 'test_navic_commitu': commitu,
        'v_testu_ne_v_main': v_testu, 'vady_ceny': vady,
        'ceka_na_jv': jv, 'ceka_na_jv_odlozene': odlozene,
        'nehotove_podle_kdo': pocty, 'nehotovych': sum(pocty.values()),
    }


def ref_text(r):
    if r.get('chybi'):
        return '`%s` nedostupné (reference chybí)' % r['ref']
    return '**%s** (`%s`, %s)' % (r.get('verze') or '?', r['sha'], r.get('datum') or '?')


def jmeno(d):
    a = ' (dřív %s)' % ', '.join(d['alias']) if d.get('alias') else ''
    return '#%s%s' % (d['id'], a)


def markdown(s):
    o = ['# Přehled stavu — Kalkulátor Next Gen', '',
         'Generuje `python3 nastroje/prehled_stavu.py` z evidence `roadmapa/roadmap.json` a gitu; ručně needitovat.',
         'Bez cen a osobních údajů. Spouští koordinace po každém sloučení.', '',
         '## Verze', '',
         '| prostředí | verze |', '|---|---|',
         '| ostrý web (`main`) | %s |' % ref_text(s['main']),
         '| testovací web (`test`) | %s |' % ref_text(s['test']), '']
    if s['test_navic_commitu'] is not None:
        o += ['Test je proti main napřed o %d commitů.' % s['test_navic_commitu'], '']

    o += ['## V testu, ještě ne v main', '']
    if s['main'].get('chybi') or s['test'].get('chybi'):
        o += ['Nelze určit — chybí reference main nebo test.', '']
    elif s['v_testu_ne_v_main']:
        o += ['| # | typ | co | verze |', '|---|---|---|---|']
        o += ['| %s | %s | %s | %s |' % (jmeno(d), rm.TYP_NAZEV.get(d['typ'], d['typ']), d['nazev'], d.get('verze', ''))
              for d in s['v_testu_ne_v_main']]
        o.append('')
    else:
        o += ['Nic — test a main nesou stejné položky evidence.', '']

    o += ['## Otevřené vady s dopadem na cenu', '']
    if s['vady_ceny']:
        o += ['| # | co | kolo | stav | čeká na |', '|---|---|---|---|---|']
        o += ['| %s | %s | %s | %s | %s |' % (jmeno(d), d['nazev'], d['kolo'], d['stav'], d['cekaNa'])
              for d in s['vady_ceny']]
        o.append('')
    else:
        o += ['Žádná.', '']

    o += ['## Čeká na J. V.', '']
    if s['ceka_na_jv']:
        o += ['| # | typ | co | čeká na |', '|---|---|---|---|']
        o += ['| %s | %s | %s | %s |' % (jmeno(d), rm.TYP_NAZEV.get(d['typ'], d['typ']), d['nazev'], d['cekaNa'])
              for d in s['ceka_na_jv']]
        o.append('')
    else:
        o += ['Nic.', '']
    if s['ceka_na_jv_odlozene']:
        o += ['K tomu %d odložených položek (vlna F) — `python3 roadmapa/roadmapa.py --zive`.' % s['ceka_na_jv_odlozene'], '']

    o += ['## Nehotové položky evidence', '',
          'Celkem %d: %s. Výpis: `python3 roadmapa/roadmapa.py --zive`.' % (
              s['nehotovych'], ', '.join('%s %d' % (k, v) for k, v in s['nehotove_podle_kdo'].items())), '']
    return '\n'.join(o)


def vyrob(argv):
    a = list(argv)

    def vezmi(jmeno_volby, vychozi):
        if jmeno_volby in a:
            i = a.index(jmeno_volby)
            v = a[i + 1]
            del a[i:i + 2]
            return v
        return vychozi
    ref_main = vezmi('--main', 'origin/main')
    ref_test = vezmi('--test', 'origin/test')
    soubor = vezmi('--roadmapa', None)
    vystup = vezmi('--vystup', KOREN)
    repo = vezmi('--repo', KOREN)
    kontrola = '--kontrola' in a
    a = [x for x in a if x != '--kontrola']
    if a:
        print('neznámá volba: ' + ' '.join(a) + '\n' + __doc__)
        return 2
    db = rm.nacti(soubor)
    s = sestav(db, repo, ref_main, ref_test)
    md = markdown(s)
    js = json.dumps(s, ensure_ascii=False, indent=1) + '\n'
    castky = CASTKA.findall(md) + CASTKA.findall(js)
    if castky:
        print('CHYBA: přehled by nesl částku — nic nezapsáno.')
        return 1
    if kontrola:
        if s['main'].get('chybi') or s['test'].get('chybi'):
            print('Poznámka: %s nebo %s chybí (mělký checkout?) — ověřeno jen, že přehled jde vyrobit.'
                  % (ref_main, ref_test))
            return 0
        cesta = os.path.join(vystup, 'PREHLED.md')
        zapsany = open(cesta, encoding='utf-8').read() if os.path.exists(cesta) else None
        if zapsany == md:
            print('PREHLED.md odpovídá stavu (%s %s, %s %s).' % (
                ref_main, s['main'].get('verze'), ref_test, s['test'].get('verze')))
        else:
            print('UPOZORNĚNÍ: PREHLED.md %s — obnovit: python3 nastroje/prehled_stavu.py'
                  % ('chybí' if zapsany is None else 'neodpovídá stavu (main %s, test %s, evidence)' % (
                      s['main'].get('verze'), s['test'].get('verze'))))
            if os.environ.get('GITHUB_ACTIONS') == 'true':
                print('::warning title=PREHLED.md::neodpovídá stavu — obnoví koordinace')
        return 0
    with open(os.path.join(vystup, 'PREHLED.md'), 'w', encoding='utf-8') as f:
        f.write(md)
    with open(os.path.join(vystup, 'PREHLED.json'), 'w', encoding='utf-8') as f:
        f.write(js)
    print('OK -> PREHLED.md, PREHLED.json (main %s, test %s; v testu navíc %d položek, vady ceny %d, čeká na J. V. %d)' % (
        s['main'].get('verze') or '?', s['test'].get('verze') or '?', len(s['v_testu_ne_v_main']),
        len(s['vady_ceny']), len(s['ceka_na_jv'])))
    return 0


if __name__ == '__main__':
    sys.exit(vyrob(sys.argv[1:]))
