#!/usr/bin/env bash
# Test výběru sloučených větví (nastroje/sloucene_vetve.sh, W2 20. 10. 2026).
#
# Postaví dočasné repo: holý „origin“ + klon a větve
#   stara-sloucena, claude/stara-davka   stará, celá v test        → smazat
#   mlada-sloucena                       čerstvá, celá v test      → nechat (mladší než 24 h)
#   nesloucena                           stará, mimo test          → nechat
#   vynechana                            stará, celá v test        → nechat (--vynechat)
#   main, test, test-draft, claude/integrace-20-10 (staré, v test) → nechat (chráněné)
# a ověří výpis (--jen-vypsat nic nesmaže), skutečné mazání, souhrn do
# GITHUB_STEP_SUMMARY a odmítnutí špatného zadání. Jiný skript k ověření
# (pojistka proti prázdnému testu): SLOUCENE_VETVE_SKRIPT=<cesta>.
# Návratový kód = počet selhaných kontrol.

set -u
SKRIPT="${SLOUCENE_VETVE_SKRIPT:-$(cd "$(dirname "$0")" && pwd)/sloucene_vetve.sh}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
ok=0; chyb=0
kontrola() { # kontrola <popis> <příkaz…>
  local popis="$1"; shift
  if "$@"; then ok=$((ok + 1)); echo "  ✓ $popis"; else chyb=$((chyb + 1)); echo "  ✗ $popis"; fi
}

export GIT_AUTHOR_NAME=Test GIT_AUTHOR_EMAIL=test@priklad.cz GIT_COMMITTER_NAME=Test GIT_COMMITTER_EMAIL=test@priklad.cz
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
STARY="2026-01-01T12:00:00+00:00"

git init --quiet --bare -b main "$TMP/origin.git"
git clone --quiet "$TMP/origin.git" "$TMP/klon" 2>/dev/null
cd "$TMP/klon" || exit 1
commit() { # commit <zpráva> [datum]
  local d="${2:-}"
  echo "$1" >> soubor.txt; git add soubor.txt
  if [ -n "$d" ]; then GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d" git commit --quiet -m "$1"
  else git commit --quiet -m "$1"; fi
}
commit zaklad "$STARY"
git branch test-draft; git branch claude/integrace-20-10; git branch vynechana
commit stara "$STARY";  git branch stara-sloucena; git branch claude/stara-davka
git checkout --quiet -b nesloucena; commit mimo "$STARY"; git checkout --quiet main
git checkout --quiet -b test; commit cerstva; git branch mlada-sloucena
git push --quiet origin main test test-draft claude/integrace-20-10 vynechana stara-sloucena \
  claude/stara-davka nesloucena mlada-sloucena 2>/dev/null

vzdalene() { git ls-remote --heads origin | sed 's#.*refs/heads/##' | sort | tr '\n' ' '; }
VSECHNY="claude/integrace-20-10 claude/stara-davka main mlada-sloucena nesloucena stara-sloucena test test-draft vynechana "
ZBYT="claude/integrace-20-10 main mlada-sloucena nesloucena test test-draft vynechana "

echo "— výpis (--jen-vypsat)"
vystup="$(bash "$SKRIPT" --jen-vypsat --vynechat "vynechana" 2>&1)"; kod=$?
kontrola "kód 0" [ "$kod" -eq 0 ]
kontrola "nic se nesmazalo" [ "$(vzdalene)" = "$VSECHNY" ]
kontrola "počty ve výpisu" grep -q 'SLOUCENE_VETVE: ke smazání 2, smazáno 0, vynecháno 6, nesloučené 1' <<<"$vystup"
kontrola "kandidát stara-sloucena" grep -q '^- `stara-sloucena`$' <<<"$vystup"
kontrola "kandidát claude/stara-davka" grep -q '^- `claude/stara-davka`$' <<<"$vystup"
kontrola "mladá větev vynechaná pro stáří" grep -q '^- `mlada-sloucena` — poslední commit mladší než 24 h' <<<"$vystup"
kontrola "claude/integrace-* chráněná" grep -q '^- `claude/integrace-20-10` — chráněná větev' <<<"$vystup"
kontrola "vynechaná zadáním" grep -q '^- `vynechana` — vynechaná zadáním' <<<"$vystup"
kontrola "nesloučená zůstává" grep -q '^- `nesloucena`$' <<<"$vystup"

echo "— mazání"
export GITHUB_STEP_SUMMARY="$TMP/souhrn.md"
vystup="$(bash "$SKRIPT" --vynechat "vynechana" 2>&1)"; kod=$?
kontrola "kód 0" [ "$kod" -eq 0 ]
kontrola "smazané jen dvě staré sloučené" [ "$(vzdalene)" = "$ZBYT" ]
kontrola "počty po mazání" grep -q 'SLOUCENE_VETVE: ke smazání 2, smazáno 2, selhalo 0, vynecháno 6, nesloučené 1' <<<"$vystup"
kontrola "souhrn do GITHUB_STEP_SUMMARY" grep -q '^### Smazané (2)$' "$GITHUB_STEP_SUMMARY"
unset GITHUB_STEP_SUMMARY

echo "— hranice stáří 0 h a bez --vynechat"
vystup="$(bash "$SKRIPT" --jen-vypsat --stari-hodin 0 2>&1)"
kontrola "mladá i vynechana jsou kandidáti, chráněné ne" \
  grep -q 'SLOUCENE_VETVE: ke smazání 2, smazáno 0, vynecháno 4, nesloučené 1' <<<"$vystup"

echo "— špatné zadání"
bash "$SKRIPT" --jen-vypsat --stari-hodin "24; rm" >/dev/null 2>&1; kod=$?
kontrola "nečíselné stáří odmítnuto (kód 2)" [ "$kod" -eq 2 ]
bash "$SKRIPT" --jen-vypsat --zaklad neexistuje >/dev/null 2>&1; kod=$?
kontrola "chybějící základ odmítnut (kód 2)" [ "$kod" -eq 2 ]
kontrola "po chybách nic nesmazáno" [ "$(vzdalene)" = "$ZBYT" ]

echo "TEST_SLOUCENE_VETVE: $ok prošlo, $chyb selhalo"
exit "$chyb"
