#!/usr/bin/env bash
# Statická kontrola startovních podkladů (S7, režie vývoje 18. 11. 2026):
#   1. PREDAVKA.md nese jen živý stav — nad 15 kB (15 000 B) je to CHYBA
#      (archiv dávek patří do podklady/predavky/RRRR-MM.md).
#   2. main musí být předkem pracovní větve — `git rev-list --count
#      HEAD..origin/main` > 0 je UPOZORNĚNÍ (kolo nezastaví; bez origin/main,
#      např. mělký checkout v CI, jen poznámka).
#   bash nastroje/kontrola_podkladu.sh            kontrola stromu (0 = v pořádku, 1 = chyba)
#   bash nastroje/kontrola_podkladu.sh --pojistka  doloží, že kontrola chybu i upozornění opravdu ohlásí
set -u
cd "$(dirname "$0")/.."
LIMIT=15000

velikost() {   # $1 = soubor
  local f="$1" b
  [ -f "$f" ] || { echo "CHYBA: chybí $f (prázdná kontrola?)"; return 2; }
  b=$(wc -c < "$f" | tr -d ' ')
  if [ "$b" -gt "$LIMIT" ]; then
    echo "CHYBA: $f má $b B (limit $LIMIT B) — starší oddíly přesunout do podklady/predavky/RRRR-MM.md."
    return 1
  fi
  echo "$f: $b B (limit $LIMIT B)."
}

main_predkem() {   # $1 = adresář repa, $2 = ref main (výchozí origin/main)
  local repo="$1" ref="${2:-origin/main}" n
  if ! git -C "$repo" rev-parse -q --verify "$ref^{commit}" >/dev/null; then
    echo "Poznámka: $ref není k dispozici (mělký checkout?) — předek main neověřen."
    return 0
  fi
  n=$(git -C "$repo" rev-list --count "HEAD..$ref")
  if [ "$n" -gt 0 ]; then
    echo "UPOZORNĚNÍ: main není předkem HEAD — $n commit(ů) v $ref chybí. Sloučit main do integrace (pravidlo Větve)."
    [ "${GITHUB_ACTIONS:-}" = "true" ] && echo "::warning title=main není předkem::$n commit(ů) v $ref chybí v HEAD"
  else
    echo "$ref je předkem HEAD."
  fi
  return 0
}

if [ "${1:-}" = "--pojistka" ]; then
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  head -c $((LIMIT + 1)) /dev/zero | tr '\0' 'x' > "$tmp/PREDAVKA.md"
  if velikost "$tmp/PREDAVKA.md" >/dev/null; then echo "POJISTKA SELHALA: soubor nad limit prošel"; exit 1; fi
  head -c "$LIMIT" /dev/zero | tr '\0' 'x' > "$tmp/PREDAVKA.md"
  velikost "$tmp/PREDAVKA.md" >/dev/null || { echo "POJISTKA SELHALA: soubor přesně na limitu neprošel"; exit 1; }
  r="$tmp/repo"; mkdir "$r"
  g() { git -C "$r" -c user.name=t -c user.email=t@t -c commit.gpgsign=false -c core.hooksPath=/dev/null "$@" >/dev/null 2>&1; }
  g init -q -b vetev && g commit -q --allow-empty -m a && g branch hlavni && g checkout -q hlavni \
    && g commit -q --allow-empty -m b && g checkout -q vetev || { echo "POJISTKA SELHALA: nejde založit pokusné repo"; exit 1; }
  main_predkem "$r" hlavni | grep -q '^UPOZORNĚNÍ: main není předkem HEAD — 1 commit' \
    || { echo "POJISTKA SELHALA: chybějící commit main nenahlášen"; exit 1; }
  g merge -q hlavni
  main_predkem "$r" hlavni | grep -q 'UPOZORNĚNÍ' && { echo "POJISTKA SELHALA: upozornění i po sloučení main"; exit 1; }
  echo "Pojistka v pořádku: PREDAVKA nad limit = chyba, na limitu projde; chybějící commit main = upozornění, po sloučení ticho."
  exit 0
fi
chyba=0
velikost PREDAVKA.md || chyba=1
main_predkem .
exit "$chyba"
