#!/usr/bin/env python3
"""NOVINKY.md pro kolegy po sloučení do main (S8, rozhodnutí J. V. 18. 11. 2026).

  python3 nastroje/novinky.py <od-verze> <do-verze>            text na výstup
  python3 nastroje/novinky.py <od-verze> <do-verze> --zapsat   → NOVINKY.md
  --changelog <soubor> --roadmapa <soubor> --vystup <soubor>   (testy)

<od-verze> je poslední verze v main PŘED sloučením (výlučně), <do-verze>
nová verze v main (včetně). Verze mezi nimi se berou z pořadí oddílů
`## vD.M.N` v CHANGELOG (nejnovější nahoře), takže sedí i přes přelom měsíce.

Text má 5–10 řádků česky ve třech skupinách:
  Nové:      hotové úkoly a dávky evidence s verzí v rozsahu (pole
             `novinka`, jinak `nazev`), přednost má vysoká důležitost,
  Opraveno:  hotové nálezy (typ nalez, u starých položek název s opravou /
             vadou / značkou kola),
  Jinak:     pole `jinak` — co mají kolegové dělat jinak (jinak jeden řádek
             „beze změny postupu“).
Když evidence nedá aspoň 5 řádků, doplní se tučné začátky odrážek
z CHANGELOG (stejně jako popis releasu).

Bez cen: řádek s částkou v Kč/EUR se vynechá. `release_odkaz.py` skládá
z téhož textu začátek popisu releasu (`--od`, nebo NOVINKY.md, jejíž
nadpis nese tutéž verzi), aby kolegové a release říkali totéž.

  python3 nastroje/novinky.py --docasne [--koren <repo>] <ref>...
      (UK F7) upozorní, když roadmapa ve větvi <ref> (origin/main, origin/test)
      nese u hotové položky dočasnou značku dávky místo čísla verze; vždy kód 0
      (upozornění, ne chyba), nedostupný ref = poznámka. Volá krok `staticke`
      (nastroje/kontrola_podkladu.sh).
"""
import json
import os
import re
import subprocess
import sys

KOREN = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.join(KOREN, 'roadmapa'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import roadmapa as rm  # noqa: E402
import release_odkaz as ro  # noqa: E402

MAX_RADKU = 10
MIN_RADKU = 5
MAX_NOVE, MAX_OPRAVENO, MAX_JINAK = 5, 3, 2
RE_OPRAVA = re.compile(r'\boprav|\bvad[ayu]\b|\bchyb|^K\d{1,2}[a-z]?\b|\bK\d{1,2}[a-z]?-[NX]\d', re.I)


def rozsah(text, od, do):
    """Verze z CHANGELOG mezi `od` (výlučně) a `do` (včetně)."""
    poradi = ro.verze_changelogu(text)
    od, do = od.lstrip('v'), do.lstrip('v')
    if do not in poradi:
        raise ValueError('CHANGELOG nemá oddíl ## v' + do)
    if od not in poradi:
        raise ValueError('CHANGELOG nemá oddíl ## v' + od)
    i, j = poradi.index(do), poradi.index(od)
    if i >= j:
        raise ValueError('v%s není novější než v%s' % (do, od))
    return poradi[i:j]


def veta(text, delka=150):
    t = str(text or '').replace('\n', ' ').strip().rstrip('.')
    t = re.sub(r'\s+', ' ', t)
    return t if len(t) <= delka else t[:delka - 1].rstrip() + '…'


def je_oprava(p):
    if rm.typ(p) == 'nalez':
        return True
    if 'typ' in p:
        return False
    return bool(RE_OPRAVA.search(str(p.get('nazev', ''))))


# Dočasná značka dávky („G1“, „TX“, „R813“): velká písmena + nejvýš 3 číslice.
# Vlastní výraz (UK F7) — nezávislý na tom, co právě povoluje roadmapa.py;
# číslo verze začíná malým „v“, takže se s ním nikdy nepotká.
RE_DOCASNA = re.compile(r'^[A-Z]{1,4}\d{0,3}$')


def docasne_znacky(db):
    """Hotové položky s dočasnou značkou dávky místo verze (svěřené G1-T1)."""
    return ['#%s (%s)' % (p.get('id'), p.get('verze')) for p in db.get('polozky', [])
            if p.get('stav') == 'hotovo' and RE_DOCASNA.match(str(p.get('verze') or ''))]


def docasne_v_refu(ref, koren=KOREN):
    """UK F7: dočasné značky v roadmapě větve `ref`; None = ref (nebo soubor) nedostupný."""
    try:
        obsah = subprocess.check_output(['git', '-C', koren, 'show', ref + ':roadmapa/roadmap.json'],
                                        stderr=subprocess.DEVNULL)
        return docasne_znacky(json.loads(obsah.decode('utf-8')))
    except (subprocess.CalledProcessError, OSError, ValueError):
        return None


def docasne_hlaseni(refy, koren=KOREN):
    """Řádky hlášení pro krok `staticke` (UPOZORNĚNÍ / Poznámka / v pořádku)."""
    out = []
    for ref in refy:
        z = docasne_v_refu(ref, koren)
        if z is None:
            out.append('Poznámka: roadmapu v %s nejde přečíst (mělký checkout?) — dočasné značky neověřeny.' % ref)
        elif z:
            out.append('UPOZORNĚNÍ: %s — hotové položky s dočasnou značkou dávky místo verze: %s. '
                       'Koordinace přepíše značku na vDEN.MĚSÍC.pořadí.' % (ref, ', '.join(z)))
            if os.environ.get('GITHUB_ACTIONS') == 'true':
                out.append('::warning title=Dočasná značka verze v %s::%s' % (ref, ', '.join(z)))
        else:
            out.append('%s: hotové položky nesou čísla verzí (žádná dočasná značka).' % ref)
    return out


def radky(changelog_text, db, od, do):
    # Revize koordinace S2 (25. 11. 2026): položka s dočasnou značkou („G1“) by do
    # NOVINEK ani popisu releasu tiše nepatřila — proto chyba, ne vynechání.
    znacky = docasne_znacky(db)
    if znacky:
        raise ValueError('přepsat značku dávky na číslo verze v roadmapě: ' + ', '.join(znacky))
    verze = {'v' + v for v in rozsah(changelog_text, od, do)}
    hotove = [p for p in db.get('polozky', []) if p.get('stav') == 'hotovo' and rm.verze(p) in verze]
    vaha = {'vysoka': 0, 'stredni': 1, 'nizka': 2}
    hotove.sort(key=lambda p: (vaha.get(p.get('dulezitost'), 3), -int(p['id']) if str(p['id']).isdigit() else 0))

    nove = [veta(p.get('novinka') or p.get('nazev')) for p in hotove if not je_oprava(p)]
    opr = [veta(p.get('novinka') or p.get('nazev')) for p in hotove if je_oprava(p)]
    jinak = [veta(p['jinak']) for p in hotove if str(p.get('jinak') or '').strip()]
    nove = [x for x in nove if not ro.CASTKA.search(x)]
    opr = [x for x in opr if not ro.CASTKA.search(x)]
    jinak = [x for x in jinak if not ro.CASTKA.search(x)]

    vysl = ['Nové: ' + x for x in nove[:MAX_NOVE]] + ['Opraveno: ' + x for x in opr[:MAX_OPRAVENO]]
    if len(vysl) + 1 < MIN_RADKU:      # doplnit z CHANGELOG (1 řádek nechán pro „Jinak“)
        for v in sorted(verze, reverse=True):
            for _, telo in ro.oddily(changelog_text, v.lstrip('v')):
                for b in ro.body_oddilu(telo)[0]:
                    r = 'Nové: ' + veta(b)
                    if r not in vysl and len(vysl) + 1 < MIN_RADKU:
                        vysl.append(r)
    vysl = vysl[:MAX_RADKU - max(1, min(len(jinak), MAX_JINAK))]
    vysl += ['Jinak: ' + x for x in jinak[:MAX_JINAK]] or ['Jinak: beze změny postupu.']
    return [x if x.endswith(('.', '…')) else x + '.' for x in vysl]


def text(changelog_text, db, od, do):
    r = radky(changelog_text, db, od, do)
    return '# Novinky v%s\n\nOproti v%s. Podrobně: CHANGELOG.md.\n\n' % (do.lstrip('v'), od.lstrip('v')) \
        + ''.join('- ' + x + '\n' for x in r)


def odrazky(novinky_text):
    """Jen odrážky (pro popis releasu)."""
    return ''.join(l + '\n' for l in novinky_text.splitlines() if l.startswith('- '))


def ze_souboru(cesta, verze):
    """Odrážky z NOVINKY.md, pokud její nadpis nese `verze`; jinak None."""
    if not os.path.exists(cesta):
        return None
    t = open(cesta, encoding='utf-8').read()
    if not re.match(r'# Novinky v' + re.escape(verze.lstrip('v')) + r'\s*$', t.splitlines()[0] if t else ''):
        return None
    return odrazky(t) or None


def main(argv):
    a = list(argv)
    if a[:1] == ['--docasne']:
        a = a[1:]
        koren = KOREN
        if a[:1] == ['--koren'] and len(a) > 1:
            koren, a = a[1], a[2:]
        if not a:
            print(__doc__)
            return 2
        print('\n'.join(docasne_hlaseni(a, koren)))
        return 0

    def vezmi(volba, vychozi):
        if volba in a:
            i = a.index(volba)
            v = a[i + 1]
            del a[i:i + 2]
            return v
        return vychozi
    changelog = vezmi('--changelog', os.path.join(KOREN, 'CHANGELOG.md'))
    soubor = vezmi('--roadmapa', None)
    vystup = vezmi('--vystup', os.path.join(KOREN, 'NOVINKY.md'))
    zapsat = '--zapsat' in a
    a = [x for x in a if x != '--zapsat']
    if len(a) != 2 or not all(re.fullmatch(r'v?\d{1,2}\.\d{1,2}\.\d{1,2}', x) for x in a):
        print(__doc__)
        return 2
    try:
        t = text(open(changelog, encoding='utf-8').read(), rm.nacti(soubor), a[0], a[1])
    except ValueError as e:
        print('CHYBA: %s' % e)
        return 2
    if zapsat:
        with open(vystup, 'w', encoding='utf-8') as f:
            f.write(t)
        print('OK -> %s (%d řádků)' % (vystup, len(odrazky(t).splitlines())))
    else:
        print(t, end='')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
