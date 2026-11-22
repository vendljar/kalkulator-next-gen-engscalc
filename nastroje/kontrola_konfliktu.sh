#!/usr/bin/env bash
# Statická kontrola značek konfliktu (#706, dávka RJ 22. 11. 2026):
#   integrace cedb857 (sloučení HN) nesla v CHANGELOG.md a PREDAVKA.md
#   nevyřešené značky konfliktu a kolo je nezachytilo.
#   Hledá ve SLEDOVANÝCH souborech řádky, které začínají značkou konfliktu:
#   „<<<<<<< …", „>>>>>>> …" nebo samotné „=======" (git grep, bez binárních).
#   Výjimky (soubory, které značky nesou jako data, např. tento skript a jeho
#   pojistka): seznam VYJIMKY níž — každá s důvodem.
#   bash nastroje/kontrola_konfliktu.sh            kontrola stromu (0 = čisto, 1 = značky nalezeny)
#   bash nastroje/kontrola_konfliktu.sh --pojistka  doloží, že kontrola značku opravdu najde
set -u
cd "$(dirname "$0")/.."

CR=$'\r'   # I3 (revize RJ): „=======" na konci řádku s CRLF (git grep -E \r nezná → skutečný znak)
VZOR="^(<<<<<<< |>>>>>>> |=======${CR}?\$|<<<<<<<${CR}?\$|>>>>>>>${CR}?\$)"
# Výjimky: cesty (pathspec) vyloučené z hledání.
VYJIMKY=(
  ':(exclude)nastroje/kontrola_konfliktu.sh'   # vzor a pojistka značky nesou jako data
)

hledej() {   # $1 = adresář repa; vypíše nálezy, vrací 0 = nic, 1 = nález
  local repo="$1" vystup
  vystup=$(git -C "$repo" grep -nI -E "$VZOR" -- . "${VYJIMKY[@]}" 2>/dev/null)
  if [ -n "$vystup" ]; then
    echo "$vystup"
    echo "CHYBA: nevyřešené značky konfliktu (výše) — dořešit sloučení a commitnout."
    return 1
  fi
  echo "Značky konfliktu: žádné."
  return 0
}

if [ "${1:-}" = "--pojistka" ]; then
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  g() { git -C "$tmp" -c user.name=t -c user.email=t@t -c commit.gpgsign=false -c core.hooksPath=/dev/null "$@" >/dev/null 2>&1; }
  g init -q -b vetev || { echo "POJISTKA SELHALA: nejde založit pokusné repo"; exit 1; }
  printf '# Změny\n\nřádek\n----\n= nadpis =\n' > "$tmp/CHANGELOG.md"
  g add CHANGELOG.md && g commit -q -m a
  hledej "$tmp" >/dev/null || { echo "POJISTKA SELHALA: čistý soubor nahlášen jako konflikt"; exit 1; }
  for znacka in '<<<<<<< HEAD' '=======' '>>>>>>> origin/test' "=======$CR" "<<<<<<<$CR"; do
    printf '# Změny\n%s\nřádek\n' "$znacka" > "$tmp/CHANGELOG.md"
    g add CHANGELOG.md && g commit -q -m "b $znacka"
    if hledej "$tmp" >/dev/null; then echo "POJISTKA SELHALA: značka „${znacka%$CR}“ nenalezena"; exit 1; fi
  done
  echo "Pojistka v pořádku: čistý soubor projde; „<<<<<<< “, „=======“ i „>>>>>>> “ na začátku řádku (i s CRLF) = chyba."
  exit 0
fi
hledej .
