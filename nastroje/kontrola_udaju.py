#!/usr/bin/env python3
"""Statická kontrola: osobní údaje a tajemství ve veřejném repozitáři (A4, 25. 9. 2026).

Proč: repozitář je veřejný (hloubkový test 24. 9. 2026, nález B79). J. V. rozhodl
24. 9. 2026 dosavadní výskyty nechat, jak jsou — tahle kontrola je má zapsané
v povoleném seznamu a hlídá, aby se do repozitáře NEDOSTAL žádný NOVÝ e-mail,
telefon ani tajemství. Testy používají smyšlené adresy (…@priklad.cz,
…@example.com) a smyšlená čísla; skutečná adresa nebo klíč ve zdrojácích
zůstane v historii Gitu napořád.

Co se hlídá: od SEC-M11 (#542, 1. 11. 2026) VŠECHNY textové soubory, které Git
verzuje nebo by verzoval (git ls-files -co --exclude-standard; mimo repozitář
celý strom), sešity a dokumenty Office rozbalené; binární se přeskočí. Do té
doby jen vyjmenované složky a přípony (nová složka, .ts či .npmrc prošly):
  1. e-mailové adresy mimo povolený seznam (nastroje/povolene_kontakty.txt —
     přesné adresy nebo celé domény zápisem *@domena),
  2. telefonní čísla v českém tvaru (+420 …, 9 číslic začínajících 6/7) mimo
     povolený seznam,
  3. tajemství: privátní klíče, tokeny známého tvaru (GitHub, AWS, Netlify,
     Slack), a tajemství serveru zapsaná doslova do kódu (TAJEMSTVI_RELACE,
     ADMIN_INIT_HESLO, PIPEDRIVE_API_TOKEN, ADMIN_EMAIL = '…').

Použití:  python3 nastroje/kontrola_udaju.py            (0 = čisté, 1 = nálezy, 2 = špatná volba)
          python3 nastroje/kontrola_udaju.py --vypis    (jen vypíše všechny výskyty)
          python3 nastroje/kontrola_udaju.py --rozsah <revize pro git rev-list…>
              (SEC-M1: obsah, který push zveřejní — soubory přidané nebo změněné
              v KAŽDÉM commitu rozsahu a zprávy commitů; volá ho hook
              nastroje/hooky/pre-push a workflow .github/workflows/kontrola_udaju.yml)
Nález tajemství se vypisuje zkráceně (maskuj) — log Actions je veřejný.
Nový nález se řeší buď odstraněním údaje, nebo — jde-li prokazatelně o smyšlený
kontakt v testu — zápisem do povoleného seznamu s důvodem v komentáři.
"""
import os
import io
import re
import subprocess
import sys
import zipfile

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SLOZKY = ['src', 'netlify', 'server', 'nastroje', 'manual', 'manual_vypocet', 'roadmapa', '.github', 'podklady', '.claude']
# K8-W4, SEC-N4 (#514, audity K8 a S1 24. 10. 2026): i záplaty, výpisy, CSV,
# konfigurace a soubory prostředí (.env*), v kořeni i .html; sešity a dokumenty
# Office se rozbalí (ZIP_PRIPONY) a čte se jejich XML.
KORENOVE_PRIPONY = ('.md', '.toml', '.yml', '.yaml', '.mjs', '.js', '.py', '.sh', '.json', '.txt', '.html',
                    '.patch', '.diff', '.csv', '.env', '.ini', '.cfg')
PRIPONY = ('.js', '.mjs', '.cjs', '.py', '.sh', '.md', '.toml', '.yml', '.yaml', '.json', '.html', '.txt', '.svg',
           '.patch', '.diff', '.csv', '.env', '.ini', '.cfg')
ZIP_PRIPONY = ('.xlsx', '.docx')
ZIP_XML = re.compile(r'^(word/(document|header\d*|footer\d*|comments)\.xml|xl/(sharedStrings|worksheets/sheet\d+)\.xml|docProps/core\.xml)$')
VYNECHAT_SLOZKY = {'node_modules', 'dist', '.git', '_soukrome', '_DB', '__pycache__'}
VYNECHAT_SOUBORY = {'roadmapa/ROADMAPA.html', 'roadmapa/ROADMAPA.md', 'manual/nahled.html',
                    'manual/snimky.json', 'nastroje/povolene_kontakty.txt'}

EMAIL = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')
# +420 602 590 945 / +420602590945 / 602 590 945 / 602590945 (mobil 6xx/7xx, ne uvnitř delšího čísla)
TELEFON = re.compile(r'(?<![\w.,/-])(?:\+420[  ]?)?[67]\d{2}[  ]?\d{3}[  ]?\d{3}(?![\w])')
TELEFON_PEVNA = re.compile(r'\+420[  ]?[2-5]\d{2}[  ]?\d{3}[  ]?\d{3}(?![\w])')
# SEC-N4 (#514): mobil s pomlčkami (602-590-945) a čísla s jinou evropskou
# předvolbou (+421 9xx xxx xxx …).
TELEFON_POMLCKY = re.compile(r'(?<![\w.,/-])(?:\+420[ -]?)?[67]\d{2}-\d{3}-\d{3}(?![\w-])')
TELEFON_ZAHR = re.compile(r'\+4(?!20)\d{2}[  -]?\d{3}[  -]?\d{3}[  -]?\d{3}(?![\w])')
TAJEMSTVI = [
    ('privátní klíč', re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----')),
    ('token GitHub', re.compile(r'\bgh[pousr]_[A-Za-z0-9]{30,}\b')),
    ('klíč AWS', re.compile(r'\bAKIA[0-9A-Z]{16}\b')),
    ('token Netlify', re.compile(r'\bnfp_[A-Za-z0-9]{30,}\b')),
    ('token Slack', re.compile(r'\bxox[baprs]-[A-Za-z0-9-]{20,}\b')),
    # K7-W5 (#507): token Pipedrive mimo zápis PIPEDRIVE_API_TOKEN = '…' —
    # v adrese dotazu (?api_token=<40 hex>) nebo v hlavičce x-api-token.
    ('token Pipedrive v adrese', re.compile(r'api_token=[0-9a-fA-F]{40}\b')),
    ('token Pipedrive v hlavičce', re.compile(r'x-api-token[\'"]?\s*[:=,]\s*[\'"]?[0-9a-fA-F]{40}\b', re.I)),
    # K7-W1 (#508, E2 23. 10. 2026): sdílecí odkaz na sezení Claude Code
    # (claude.ai/code/cshk_<id>) otevře celý přepis vlákna — do repa patří jen
    # ID sezení. Zmínka bez ID („cshk_…") nálezem není.
    ('sdílecí odkaz na sezení Claude', re.compile(r'claude\.ai/code/cshk_[A-Za-z0-9_-]{6,}')),
    # K8-W4, SEC-N4 (#514): další tvary tokenu Pipedrive (JSON, YAML, bez
    # uvozovek, apiToken, URL-kódované), jemný token GitHubu, klíč Anthropic
    # a veřejný sdílecí odkaz claude.ai/share/<id>.
    ('token Pipedrive v přiřazení',
     re.compile(r'(api[_-]?token|apitoken|PIPEDRIVE_API_TOKEN)[\'"]?\s*[:=]\s*[\'"]?[0-9a-fA-F]{40}\b', re.I)),
    ('token Pipedrive v kódované adrese', re.compile(r'api_token%3D[0-9a-fA-F]{40}\b', re.I)),
    ('token GitHub (jemný)', re.compile(r'\bgithub_pat_[A-Za-z0-9_]{20,}')),
    ('klíč Anthropic', re.compile(r'\bsk-ant-[A-Za-z0-9_-]{20,}')),
    ('sdílecí odkaz claude.ai/share', re.compile(r'claude\.ai/share/[0-9A-Za-z-]{8,}')),
    ('tajemství serveru doslova v kódu',
     re.compile(r'\b(TAJEMSTVI_RELACE|ADMIN_INIT_HESLO|PIPEDRIVE_API_TOKEN|ADMIN_EMAIL)\s*=\s*[\'"][^\'"]{4,}[\'"]')),    # SEC-M11 (#542, security test SEC-M 28. 10. 2026): další známé tvary —
    # token npm (i _authToken v .npmrc), klíč Google, JWT, klíč OpenAI
    # (sk-…, sk-proj-…) a 40 hex v konstantě, jejíž název zní jako klíč.
    ('token npm', re.compile(r'\bnpm_[A-Za-z0-9]{36}\b')),
    ('token v .npmrc (_authToken)', re.compile(r'_authToken\s*=\s*[^\s$]{8,}')),
    ('klíč Google (AIza…)', re.compile(r'\bAIza[0-9A-Za-z_-]{35}')),
    ('JWT', re.compile(r'\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}')),
    ('klíč sk-… / sk-proj-…', re.compile(r'\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}')),
    ('40 hex v konstantě s názvem klíče',
     re.compile(r'(KLIC|KEY|TOKEN|SECRET|TAJ)\w*[\'"]?\s*[:=]\s*[\'"][0-9a-fA-F]{40}[\'"]', re.I)),
]
# SEC-M11: výjimka pro zkušební hodnotu (níže) nesmí krýt hodnotu, která
# v sobě nese 32 a víc hex znaků — „pokus" + skutečný token není zkušební.
DLOUHY_HEX = re.compile(r'[0-9a-fA-F]{32,}')
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


def _vynechat(rel):
    casti = rel.split('/')
    return rel in VYNECHAT_SOUBORY or any(c in VYNECHAT_SLOZKY for c in casti[:-1])


def _binarni(data, rel):
    """SEC-M11: binární soubor (NUL v prvních 8 kB) se přeskočí — kromě
    sešitů a dokumentů Office, ty se rozbalí (ZIP_PRIPONY)."""
    return not rel.endswith(ZIP_PRIPONY) and b'\0' in data[:8192]


def soubory():
    """Čtené soubory (absolutní cesty).

    SEC-M11 (#542): už ne výčet složek a přípon (SLOZKY, PRIPONY — nová
    kořenová složka, soubor bez přípony, .ts nebo .npmrc tím prošly), ale
    všechno, co Git verzuje nebo by verzoval: `git ls-files -co
    --exclude-standard`. Mimo repozitář (dočasný strom v testu) celý strom.
    Binární soubory se přeskočí (_binarni), sešity Office se rozbalí."""
    rel = None
    if os.path.isdir(os.path.join(KOREN, '.git')) or os.path.isfile(os.path.join(KOREN, '.git')):
        try:
            r = subprocess.run(['git', '-C', KOREN, 'ls-files', '-z', '-co', '--exclude-standard'],
                               capture_output=True, check=True)
            rel = sorted(set(x.decode('utf-8', 'replace') for x in r.stdout.split(b'\0') if x))
        except (OSError, subprocess.CalledProcessError):
            rel = None
    if rel is None:
        rel = []
        for adresar, podslozky, jmena in os.walk(KOREN):
            podslozky[:] = sorted(p for p in podslozky if p not in VYNECHAT_SLOZKY)
            for jm in sorted(jmena):
                rel.append(os.path.relpath(os.path.join(adresar, jm), KOREN).replace(os.sep, '/'))
    out = []
    for r_ in rel:
        if _vynechat(r_):
            continue
        cesta = os.path.join(KOREN, r_)
        try:
            with open(cesta, 'rb') as f:
                if _binarni(f.read(8192), r_):
                    continue
        except OSError:
            continue
        out.append(cesta)
    return out


def text_dat(data, rel):
    """Text z obsahu souboru; u .xlsx/.docx text z XML uvnitř (K8-W4, #514) —
    značky se nahradí mezerou, aby se e-mail rozdělený do dvou běhů textu
    neslepil s okolím. Binární soubor → None (SEC-M11)."""
    if rel.endswith(ZIP_PRIPONY):
        casti = []
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                for jm in z.namelist():
                    if ZIP_XML.match(jm):
                        xml = z.read(jm).decode('utf-8', 'replace')
                        casti.append(re.sub(r'<[^>]+>', ' ', xml))
        except (OSError, zipfile.BadZipFile):
            return '[nečitelný soubor Office]'
        return '\n'.join(casti)
    if _binarni(data, rel):
        return None
    return data.decode('utf-8', 'replace')


def precti(cesta):
    with open(cesta, 'rb') as f:
        data = f.read()
    t = text_dat(data, cesta.replace(os.sep, '/'))
    return '' if t is None else t


def _git(*args, vstup=None):
    return subprocess.run(['git', '-C', KOREN] + list(args), input=vstup, capture_output=True, check=True).stdout


def polozky_rozsahu(revize):
    """SEC-M1 (#542): obsah, který push zveřejní — všechny soubory přidané
    nebo změněné v commitech `git rev-list <revize…>` (např. `<sha> --not
    --remotes=origin` z hooku pre-push, `<před>..<po>` ve workflow) a zprávy
    těch commitů. Kontroluje se KAŽDÝ commit, ne jen špička: údaj vložený
    a o commit později smazaný zůstane v historii veřejného repa navždy
    (SEC-S4: odkaz cshk_ odešel do tagů, i když oprava přišla za 9 minut).
    Vrací [(popis, text)]."""
    commity = [c for c in _git('rev-list', *revize).decode().split() if c]
    bloby = {}
    out = []
    for c in commity:
        zprava = _git('log', '-1', '--format=%B', c).decode('utf-8', 'replace')
        out.append(('commit %s (zpráva)' % c[:9], zprava))
        # Plumbing diff-tree přejmenování nehledá (bez -M): přejmenovaný
        # soubor je smazaný + přidaný, obsah se tedy zkontroluje.
        r = _git('diff-tree', '-r', '-z', '--root', '--no-commit-id', '--diff-filter=AMT', c)
        pole = r.split(b'\0')
        for k in range(0, len(pole) - 1, 2):
            m = pole[k].decode().lstrip(':').split()     # [mód před, mód po, sha před, sha po, stav]
            cesta = pole[k + 1].decode('utf-8', 'replace')
            if len(m) < 5 or m[1] == '160000':          # podmodul
                continue
            if not _vynechat(cesta):
                bloby.setdefault(m[3], (c, cesta))
    for sha, (c, cesta) in sorted(bloby.items(), key=lambda x: x[1][1]):
        data = _git('cat-file', 'blob', sha)
        t = text_dat(data, cesta)
        if t is not None:
            out.append(('%s@%s' % (cesta, c[:9]), t))
    return out, len(commity)


def maskuj(radek, vzor):
    """SEC-M1 (#542): výpis nálezu tajemství ho neopakuje celé — log
    workflow ve veřejném repu je veřejný. Zůstane prvních 6 znaků shody."""
    return vzor.sub(lambda m: m.group(0)[:6] + '…[skryto %d zn.]' % (len(m.group(0)) - 6), radek.strip())[:160]


def main():
    vypis = '--vypis' in sys.argv
    rozsah = None
    if '--rozsah' in sys.argv:
        rozsah = sys.argv[sys.argv.index('--rozsah') + 1:]
        if not rozsah:
            print('kontrola_udaju.py: --rozsah chce revize pro git rev-list (např. HEAD --not --remotes=origin)')
            return 2
    nezname = [a for a in sys.argv[1:sys.argv.index('--rozsah') if rozsah is not None else None]
               if a not in ('--vypis',)]
    if nezname:
        print('kontrola_udaju.py: neznámá volba %s (známé: --vypis, --rozsah <revize…>)' % ' '.join(nezname))
        return 2
    emaily, domeny, telefony = nacti_povolene()
    nalezy = []
    videno = {'email': set(), 'telefon': set()}
    if rozsah is not None:
        polozky, pocet_commitu = polozky_rozsahu(rozsah)
    else:
        polozky = []
        for cesta in soubory():
            try:
                polozky.append((os.path.relpath(cesta, KOREN).replace(os.sep, '/'), precti(cesta)))
            except OSError:
                continue
    for rel, text in polozky:
        for i, radek in enumerate(text.split('\n'), 1):
            for m in EMAIL.finditer(radek):
                e = m.group(0).lower().rstrip('.')
                videno['email'].add(e)
                dom = e.split('@', 1)[1]
                if e in emaily or dom in domeny:
                    continue
                nalezy.append((rel, i, 'e-mail mimo povolený seznam', m.group(0)))
            for vzor in (TELEFON, TELEFON_PEVNA, TELEFON_POMLCKY, TELEFON_ZAHR):
                for m in vzor.finditer(radek):
                    t = normalizuj_telefon(m.group(0))
                    videno['telefon'].add(t)
                    if t in telefony:
                        continue
                    nalezy.append((rel, i, 'telefon mimo povolený seznam', m.group(0).strip()))
            vyj = TAJEMSTVI_VYJIMKA.search(radek)
            if vyj and DLOUHY_HEX.search(vyj.group(0)):
                nalezy.append((rel, i, 'tajemství serveru doslova v kódu (hex ve zkušební hodnotě)',
                               maskuj(radek, DLOUHY_HEX)))
                vyj = None
            for popis, vzor in TAJEMSTVI:
                if vzor.search(radek) and not vyj:
                    nalezy.append((rel, i, popis, maskuj(radek, vzor)))
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
    if rozsah is not None:
        print('Kontrola osobních údajů a tajemství pushovaného obsahu: čisté (%d commitů, %d souborů a zpráv).'
              % (pocet_commitu, len(polozky)))
        return 0
    print('Kontrola osobních údajů a tajemství: čisté (%d souborů, %d e-mailů a %d telefonů v povoleném seznamu).'
          % (len(polozky), len(videno['email']), len(videno['telefon'])))
    return 0


if __name__ == '__main__':
    sys.exit(main())
