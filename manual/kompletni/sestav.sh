#!/usr/bin/env bash
# Vyrobí KOMPLETNÍ DOKUMENTACI SYSTÉMU (HTML + PDF) jedním příkazem:
#   sestavení aplikace bez zvýšení verze → snímky obchodníka a správce
#   (testovací prostředí, zkušební ceník) → manuál výpočtu → složení → PDF
#   s čísly stran v obsahu → kontrola sestaveného dokumentu.
#
#   bash manual/kompletni/sestav.sh <výstupní složka mimo repozitář>
#
# Hotový dokument ani snímky se do repozitáře NEUKLÁDAJÍ (nesou snímky
# kalkulace a postup výpočtu firmy). Potřebuje Node, Python 3, Playwright
# (Chromium) a pdftotext (čísla stran; bez něj PDF vznikne bez nich).
set -euo pipefail
KDE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KOREN="$(cd "$KDE/../.." && pwd)"
[ $# -eq 1 ] || { echo "Použití: bash manual/kompletni/sestav.sh <výstupní složka mimo repozitář>" >&2; exit 2; }
VYSTUP="$(realpath -m "$1")"
case "$VYSTUP/" in
  "$KOREN"/*) echo "CHYBA: hotový dokument se do repozitáře neukládá — zvolte složku mimo $KOREN" >&2; exit 2 ;;
esac
mkdir -p "$VYSTUP/snimky"
cd "$KOREN"
NP="$(npm root -g)"

echo "== 1/4 sestavení aplikace (verze se nezvyšuje)"
KNG_NEZVYSOVAT_VERZI=1 python3 build.py | tail -1
echo "== 2/4 snímky obchodníka a správce (testovací prostředí)"
ADMIN_EMAIL=spravce@priklad.cz NODE_PATH="$NP" node manual/snimky_auto.mjs "$VYSTUP/snimky/snimky.json" | tail -1
ADMIN_EMAIL=spravce@priklad.cz NODE_PATH="$NP" node manual/snimky_admin.mjs "$VYSTUP/snimky/snimky_admin.json" | tail -1
echo "== 3/4 složení dokumentu a PDF"
NODE_PATH="$NP" node manual/kompletni/sestav.js "$VYSTUP/snimky/snimky.json" "$VYSTUP/snimky/snimky_admin.json" "$VYSTUP"
echo "== 4/4 kontrola"
NODE_PATH="$NP" node src/test_dokumentace_kompletni.js | tail -1
