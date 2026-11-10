#!/usr/bin/env python3
"""Vloží src/retence_zaloh.js do nastroje/apps_script/kopie_disk.gs (#577 AS).

Apps Script nemá import, pravidlo retence ale musí být JEDNO (server, prohlížeč
i skript). Blok mezi značkami se přepíše obsahem src/retence_zaloh.js beze
změny; shodu hlídá src/test_577_jmeno_kopie.js. Spouští se po každé změně
src/retence_zaloh.js:  python3 nastroje/apps_script/vloz_retenci.py
Volba --kontrola jen ověří shodu (kód 1 = blok je zastaralý)."""
import pathlib, sys

KOREN = pathlib.Path(__file__).resolve().parents[2]
GS = KOREN / 'nastroje' / 'apps_script' / 'kopie_disk.gs'
ZDROJ = KOREN / 'src' / 'retence_zaloh.js'
ZAC = '/* ====== RETENCE ZÁLOH: kopie src/retence_zaloh.js (nevkládat ručně — nastroje/apps_script/vloz_retenci.py) ====== */\n'
KON = '/* ====== KONEC RETENCE ZÁLOH ====== */\n'


def slozeny():
    gs = GS.read_text(encoding='utf-8')
    a, b = gs.index(ZAC) + len(ZAC), gs.index(KON)
    zdroj = ZDROJ.read_text(encoding='utf-8')
    if not zdroj.endswith('\n'):
        zdroj += '\n'
    return gs, gs[:a] + zdroj + gs[b:]


if __name__ == '__main__':
    puvodni, novy = slozeny()
    if '--kontrola' in sys.argv:
        print('kopie_disk.gs: retence ' + ('aktuální' if puvodni == novy else 'ZASTARALÁ — spusťte vloz_retenci.py'))
        sys.exit(0 if puvodni == novy else 1)
    GS.write_text(novy, encoding='utf-8')
    print('kopie_disk.gs: retence vložena (' + str(len(novy)) + ' znaků)')
