#!/usr/bin/env bash
# MÍSTNÍ NÁHRADA CI (24. 9. 2026, rozhodnutí J. V. „testovat lokálně").
#
# GitHub Actions se od 24. 9. 2026 při pushi nespouští samo (jen ručně:
# GitHub → Actions → Testy → Run workflow). Tenhle skript dělá totéž co
# workflow .github/workflows/testy.yml, jen v cloudovém sezení Claude nebo na
# stroji s Node 22 + Pythonem 3 — a to PŘED pushem na test/main:
#
#   1. verze odpovídá dni posledního commitu (build.py --kontrola-verze)
#   2. žádné CRLF ve zdrojácích
#   3. sady v Node (spust_testy.sh)
#   4. sestavení bez zvýšení verze + všechny prohlížečové harnessy overit_*.mjs
#   5. volitelně (--mutace) celý mutační běh serveru i jádra — jen když se
#      měnil server (netlify/) nebo jádro (engine, engine_proj, zaokrouhleni,
#      marze, sablony_online); trvá kolem 20 minut
#
# Firemní šablony (nejsou v repozitáři) předejte přes KNG_PODKLADY=<složka>,
# jinak se harnessy, které je potřebují, přeskočí stejně jako v CI.
#
# Spouštět PO commitu (kontrola verze měří proti datu posledního commitu).
# Návratový kód 0 = vše zelené, jinak počet selhaných kroků.

set -u
cd "$(dirname "$0")/.." || exit 1
: "${ADMIN_EMAIL:=spravce@priklad.cz}"; export ADMIN_EMAIL
if [ -z "${NODE_PATH:-}" ] && command -v npm >/dev/null; then export NODE_PATH="$(npm root -g)"; fi

MUTACE=0; [ "${1:-}" = "--mutace" ] && MUTACE=1
selhalo=0; souhrn=()
krok() {  # krok "název" příkaz…
  local nazev="$1"; shift
  if "$@"; then souhrn+=("  ✓ $nazev"); else souhrn+=("  ✗ $nazev"); selhalo=$((selhalo + 1)); fi
}

crlf() {
  if grep -rlI $'\r' src netlify *.mjs *.sh *.py *.toml; then
    echo "CHYBA: soubory výš mají CRLF — spusťte 'git add --renormalize .'"; return 1
  fi
}
harnessy() {
  local log; log="$(mktemp -d)"; local chyby=0
  KNG_NEZVYSOVAT_VERZI=1 python3 build.py >/dev/null || return 1
  for f in overit_*.mjs; do
    if timeout 300 node "$f" > "$log/$f.log" 2>&1; then echo "  ✓ $f"
    else echo "  ✗ $f   (výpis: $log/$f.log)"; chyby=$((chyby + 1)); fi
  done
  [ "$chyby" -eq 0 ]
}

krok "verze odpovídá dni commitu" python3 build.py --kontrola-verze
krok "žádné CRLF" crlf
krok "sady v Node (spust_testy.sh)" bash ./spust_testy.sh
krok "prohlížečové harnessy (overit_*.mjs)" harnessy
if [ "$MUTACE" -eq 1 ]; then
  krok "mutace serveru (netlify/mutace.mjs)" node netlify/mutace.mjs
  krok "mutace jádra (mutace_jadro.mjs)" node mutace_jadro.mjs
fi

echo; echo "PŘED PUSHEM — souhrn:"; printf '%s\n' "${souhrn[@]}"
[ "$MUTACE" -eq 0 ] && echo "  – mutace nespuštěny (přidejte --mutace, když se měnil server nebo jádro)"
exit "$selhalo"
