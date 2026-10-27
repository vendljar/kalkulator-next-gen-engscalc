#!/usr/bin/env bash
# Vyrobí vizuální manuál výpočtu OCK (HTML + PDF) a ověří jeho čísla proti jádru.
#   bash manual_vypocet/sestav.sh [výstupní_složka]
# Výstup do repozitáře NEPATŘÍ (rozhodnutí 17. 9. 2026) — výchozí je dočasná složka.
set -euo pipefail
KDE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${1:-${TMPDIR:-/tmp}/kng_manual_vypocet}"
node "$KDE/sestav.js" --out "$OUT" --pdf
HTML="$(ls -t "$OUT"/*_MANUAL_VYPOCET_OCK.html | head -1)"
KNG_MANUAL_HTML="$HTML" node "$KDE/../src/test_manual_vypocet.js"
