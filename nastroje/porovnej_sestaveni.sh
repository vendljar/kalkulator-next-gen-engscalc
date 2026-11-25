#!/usr/bin/env bash
# POROVNÁNÍ DVOU SESTAVENÍ NAD PEVNOU SADOU KALKULACÍ (S3, návrh režie
# 18. 11. 2026; rozhodnutí J. V. 18. 11.: stupně kol 1 automat po dávce,
# 2 cílená sada, 3 plné kolo jen před main a po nasazení; kolo main-před ×
# main-po u rychlé cesty dělá koordinace TÍMHLE nástrojem).
#
# Postaví obě reference gitu do dočasných worktree (build.py bez zvýšení
# verze), nad každým spočítá PEVNOU sadu kalkulací (nastroje/porovnani_sada.js:
# fixtury, zlatá pojistka #560 + můstky, K29-N1/#451, K36-N2/#550, smyšlené
# zakázky testovacího webu, fuzz se semínkem; Model 1 i 2) a porovná otisky
# výstupů: cena celkem, řádky, výsledek jádra, symboly CN, text dokumentu
# (Word, náhled, krycí list, specifikace, SoD), ostatní. Sada a ceník se
# berou z TOHOTO stromu (kde leží nástroj), takže obě strany dostanou stejné
# vstupy. Výstup nenese ceny ani texty — jen počty, případy a pole.
#
# Použití:
#   bash nastroje/porovnej_sestaveni.sh <ref A> <ref B> [volby]
#     <ref>                 cokoli pro git rev-parse (origin/main, HEAD, v18.11.2, SHA);
#                           „." = pracovní kopie (i necommitnuté změny, bez worktree)
#   --cenik <soubor>        jiný ceník než zkušební ({cenik, cenikProj}); MIMO repo
#   --ocekavane <soubor>    seznam očekávaných rozdílů (formát v porovnani_sada.js);
#                           jiný rozdíl = kód 1; víckrát = sjednocení seznamů (K56-2)
#   --fuzz N                počet fuzz zadání (výchozí 300)
#   --bez-sestaveni         nespouštět build.py (jen výpočet ze src/)
#   --repo <složka>         repozitář, ze kterého se berou reference (výchozí tenhle)
#   --max N                 kolik rozdílných případů vypsat (výchozí 40)
#   --pd-webhook            navíc kalkulace z webhooku Pipedrive (#733, #729) nad každým
#                           stromem (nastroje/porovnani_pd_webhook.mjs: serverové funkce
#                           v paměti, simulátor PD, Chromium; stromy POSTUPNĚ, ne souběžně)
#                           a porovnání obou výstupů (jen pole a shoda). Chce dist/ —
#                           nejde s --bez-sestaveni; „." musí mít dist sestavené.
#
# Kód: 0 shoda nebo jen očekávané rozdíly, 1 neočekávaný rozdíl,
#      2 chybné použití / nejde postavit nebo spočítat.
#
# Příklady:
#   bash nastroje/porovnej_sestaveni.sh origin/main origin/test          # rychlá cesta: main-před × main-po
#   bash nastroje/porovnej_sestaveni.sh origin/test HEAD                 # po dávce
#   bash nastroje/porovnej_sestaveni.sh origin/test HEAD --ocekavane podklady/ocekavane_rozdily.txt
#   bash nastroje/testovaci_kolo.sh --jen porovnani --proti origin/main  # jako krok kola
set -u
NASTROJ="$(cd "$(dirname "$0")/.." && pwd)"
if [ -z "${NODE_PATH:-}" ] && command -v npm >/dev/null 2>&1; then
  NODE_PATH="$(npm root -g 2>/dev/null)"; export NODE_PATH
fi

napoveda() { sed -n '2,39p' "$0"; }
REPO="$NASTROJ"; CENIK=""; OCEKY=(); FUZZ=300; SESTAVIT=1; MAX=40; PDW=0
REFY=()
while [ $# -gt 0 ]; do
  case "$1" in
    --cenik) CENIK="${2:-}"; shift ;;
    --ocekavane) OCEKY+=("${2:-}"); shift ;;
    --fuzz) FUZZ="${2:-}"; shift ;;
    --repo) REPO="${2:-}"; shift ;;
    --max) MAX="${2:-}"; shift ;;
    --bez-sestaveni) SESTAVIT=0 ;;
    --pd-webhook) PDW=1 ;;
    -h|--help) napoveda; exit 0 ;;
    --*) echo "neznámá volba: $1 (viz --help)" >&2; exit 2 ;;
    *) REFY+=("$1") ;;
  esac
  shift
done
[ "${#REFY[@]}" -eq 2 ] || { echo "chci právě dvě reference (A B), dostal jsem ${#REFY[@]} (viz --help)" >&2; exit 2; }
case "$FUZZ" in ''|*[!0-9]*) echo "--fuzz chce číslo" >&2; exit 2 ;; esac
case "$MAX" in ''|*[!0-9]*) echo "--max chce číslo" >&2; exit 2 ;; esac
[ "$PDW" -eq 0 ] || [ "$SESTAVIT" -eq 1 ] || { echo "--pd-webhook chce sestavení (dist/), nejde s --bez-sestaveni" >&2; exit 2; }
[ -z "$CENIK" ] || [ -f "$CENIK" ] || { echo "ceník neexistuje: $CENIK" >&2; exit 2; }
[ -z "$CENIK" ] || CENIK="$(cd "$(dirname "$CENIK")" && pwd)/$(basename "$CENIK")"
OCEK_ARGS=()
for f in ${OCEKY[@]+"${OCEKY[@]}"}; do
  [ -f "$f" ] || { echo "soubor očekávaných rozdílů neexistuje: $f" >&2; exit 2; }
  OCEK_ARGS+=(--ocekavane "$(cd "$(dirname "$f")" && pwd)/$(basename "$f")")
done
REPO="$(cd "$REPO" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null)" || { echo "--repo není repozitář gitu" >&2; exit 2; }

PRAC="$(mktemp -d "${TMPDIR:-/tmp}/kng_porovnani.XXXXXX")"
STROMY=()
uklid() {
  for s in "${STROMY[@]}"; do git -C "$REPO" worktree remove --force "$s" >/dev/null 2>&1 || true; done
  git -C "$REPO" worktree prune >/dev/null 2>&1 || true
  rm -rf "$PRAC"
}
trap uklid EXIT

# priprav <písmeno> <ref> → nastaví KOREN_<x> a POPIS_<x>
priprav() {
  local x="$1" ref="$2" koren sha verze
  if [ "$ref" = "." ]; then
    koren="$REPO"; sha="$(git -C "$REPO" rev-parse --short HEAD)+pracovní kopie"
  else
    sha="$(git -C "$REPO" rev-parse --verify --quiet "$ref^{commit}")" || { echo "reference neexistuje: $ref" >&2; return 2; }
    koren="$PRAC/$x"
    git -C "$REPO" worktree add --detach --quiet "$koren" "$sha" >/dev/null 2>&1 || { echo "worktree pro $ref nejde založit" >&2; return 2; }
    STROMY+=("$koren")
    sha="${sha:0:7}"
    # node_modules (symlink jako v hlavním stromu) — sestavení a docx je můžou chtít
    [ -e "$REPO/node_modules" ] && [ ! -e "$koren/node_modules" ] && ln -s "$(readlink -f "$REPO/node_modules")" "$koren/node_modules"
  fi
  verze="$(cat "$koren/verze.txt" 2>/dev/null || echo '?')"
  if [ "$SESTAVIT" -eq 1 ] && [ "$ref" != "." ]; then
    ( cd "$koren" && KNG_NEZVYSOVAT_VERZI=1 python3 build.py >"$PRAC/build_$x.log" 2>&1 ) \
      || { echo "sestavení $ref ($sha) selhalo:" >&2; tail -5 "$PRAC/build_$x.log" >&2; return 2; }
  fi
  printf -v "KOREN_$x" '%s' "$koren"
  printf -v "POPIS_$x" '%s' "$ref ($sha, v$verze)"
}
priprav A "${REFY[0]}" || exit 2
priprav B "${REFY[1]}" || exit 2

echo "Porovnávám: A = $POPIS_A   B = $POPIS_B   (sestavení: $([ "$SESTAVIT" -eq 1 ] && echo ano || echo ne))"
SADA="$NASTROJ/nastroje/porovnani_sada.js"
ARGS=(--fuzz "$FUZZ"); [ -n "$CENIK" ] && ARGS+=(--cenik "$CENIK")
node "$SADA" otisky "$KOREN_A/src" "${ARGS[@]}" >"$PRAC/a.json" 2>"$PRAC/a.err" &
pa=$!
node "$SADA" otisky "$KOREN_B/src" "${ARGS[@]}" >"$PRAC/b.json" 2>"$PRAC/b.err" &
pb=$!
wait $pa; ka=$?; wait $pb; kb=$?
if [ $ka -ne 0 ] || [ $kb -ne 0 ]; then
  echo "výpočet sady selhal (A kód $ka, B kód $kb):" >&2
  tail -5 "$PRAC/a.err" "$PRAC/b.err" >&2
  exit 2
fi
POR=(porovnej "$PRAC/a.json" "$PRAC/b.json" --popis-a "$POPIS_A" --popis-b "$POPIS_B" --max "$MAX")
[ "${#OCEK_ARGS[@]}" -gt 0 ] && POR+=("${OCEK_ARGS[@]}")
node "$SADA" "${POR[@]}"
KOD=$?
[ "$PDW" -eq 1 ] || exit $KOD

# --pd-webhook (K56-5): kalkulace z webhooku Pipedrive nad každým stromem, POSTUPNĚ (prohlížeč)
echo ""
PDN="$NASTROJ/nastroje/porovnani_pd_webhook.mjs"
for x in A B; do
  k="KOREN_$x"
  [ -f "${!k}/dist/kalkulacka.html" ] || { echo "--pd-webhook: ${!k} nemá dist/kalkulacka.html (sestavit)" >&2; exit 2; }
  ( cd "${!k}" && KOREN="${!k}" timeout 300 node "$PDN" >"$PRAC/pd_$x.json" 2>"$PRAC/pd_$x.err" ) \
    || { echo "--pd-webhook: běh nad stranou $x selhal:" >&2; tail -5 "$PRAC/pd_$x.err" >&2; exit 2; }
done
node "$PDN" --porovnej "$PRAC/pd_A.json" "$PRAC/pd_B.json" --popis-a "$POPIS_A" --popis-b "$POPIS_B"
KPD=$?
[ "$KPD" -eq 2 ] && exit 2
[ "$KOD" -ne 0 ] && exit $KOD
exit $KPD
