#!/usr/bin/env bash
# Zapne hooky repozitáře z nastroje/hooky/ (SEC-M1, #542): git config
# core.hooksPath nastroje/hooky. Dnes jen pre-push = kontrola osobních údajů
# a tajemství v tom, co se pushuje (nastroje/kontrola_udaju.py --rozsah).
#
# Volá ho nastroje/testovaci_kolo.sh (mimo CI) a nastroje/pred_pushem.sh;
# sezení Claude podle CLAUDE.md hned na začátku. Ručně stačí jednou na klon:
#   bash nastroje/instaluj_hooky.sh
# (.claude/settings.json se záměrně neverzuje — .gitignore, místní nastavení;
# SessionStart hook by si musel zapnout J. V.)
# --kontrola  jen ověří, že jsou hooky zapnuté (kód 1, když ne).
set -u
cd "$(dirname "$0")/.." || exit 1
git rev-parse --git-dir >/dev/null 2>&1 || { echo "instaluj_hooky: není repozitář Git" >&2; exit 1; }
if [ "${1:-}" = "--kontrola" ]; then
  [ "$(git config --get core.hooksPath)" = "nastroje/hooky" ] && [ -x nastroje/hooky/pre-push ] && exit 0
  echo "instaluj_hooky: hooky nejsou zapnuté (bash nastroje/instaluj_hooky.sh)" >&2; exit 1
fi
[ -n "${1:-}" ] && { echo "instaluj_hooky: neznámá volba $1 (známá: --kontrola)" >&2; exit 2; }
chmod +x nastroje/hooky/* 2>/dev/null
git config core.hooksPath nastroje/hooky
echo "Hooky zapnuté: core.hooksPath = nastroje/hooky (pre-push: kontrola osobních údajů a tajemství)."
