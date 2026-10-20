#!/usr/bin/env bash
# SMAZÁNÍ SLOUČENÝCH POMOCNÝCH VĚTVÍ (W2, J. V. 20. 10. 2026).
#
# Z cloudového sezení vzdálenou větev smazat nejde (proxy vrací HTTP 403),
# takže je dřív koordinace posílala J. V. jednu po druhé jako odkazy. Teď je
# maže J. V. jedním klikem: GitHub → Actions → Smazat sloučené větve → Run
# workflow (.github/workflows/smazat_vetve.yml volá tenhle skript). Lokálně
# se dá pustit s --jen-vypsat a ukáže totéž, co by smazal.
#
# Kandidát = vzdálená větev CELÁ V ZÁKLADU (výchozí test):
#   git merge-base --is-ancestor origin/<větev> origin/test
# Nikdy se nemaže:
#   - main, test, test-draft a claude/integrace-* (chráněné),
#   - větev s posledním commitem mladším než --stari-hodin (výchozí 24) —
#     nová dávková větev založená nad test je „celá v test“, i když dávka
#     teprve běží,
#   - větve z --vynechat (mezerami oddělené názvy),
#   - větev, která celá v základu není (nesloučená práce).
#
# Použití (v kořeni klonu):
#   bash nastroje/sloucene_vetve.sh --jen-vypsat
#   bash nastroje/sloucene_vetve.sh [--stari-hodin N] [--vynechat "a b"] [--zaklad test] [--remote origin]
# Souhrn jde na výstup a — je-li nastavené GITHUB_STEP_SUMMARY — i do souhrnu běhu.
# Návratový kód: 0 = v pořádku, 1 = některé smazání selhalo, 2 = špatné zadání.

set -u

JEN_VYPSAT=0
STARI_HODIN=24
VYNECHAT=""
ZAKLAD="test"
REMOTE="origin"
CHRANENE_PRESNE="main test test-draft"
CHRANENE_VZOR="claude/integrace-*"

while [ $# -gt 0 ]; do
  case "$1" in
    --jen-vypsat) JEN_VYPSAT=1 ;;
    --stari-hodin) shift; STARI_HODIN="${1:-}" ;;
    --stari-hodin=*) STARI_HODIN="${1#--stari-hodin=}" ;;
    --vynechat) shift; VYNECHAT="${1:-}" ;;
    --vynechat=*) VYNECHAT="${1#--vynechat=}" ;;
    --zaklad) shift; ZAKLAD="${1:-}" ;;
    --remote) shift; REMOTE="${1:-}" ;;
    -h|--help) sed -n '2,25p' "$0"; exit 0 ;;
    *) echo "neznámá volba: $1 (viz --help)"; exit 2 ;;
  esac
  shift
done

case "$STARI_HODIN" in
  ''|*[!0-9]*) echo "CHYBA: --stari-hodin musí být celé číslo hodin (zadáno: '$STARI_HODIN')"; exit 2 ;;
esac

# Aktuální seznam vzdálených větví (i smazaných mezitím jinde).
if ! git fetch --prune --quiet "$REMOTE" "+refs/heads/*:refs/remotes/$REMOTE/*"; then
  echo "CHYBA: git fetch z '$REMOTE' selhal"; exit 2
fi
if ! git rev-parse --verify --quiet "refs/remotes/$REMOTE/$ZAKLAD" >/dev/null; then
  echo "CHYBA: základní větev '$REMOTE/$ZAKLAD' neexistuje"; exit 2
fi

ted=$(date +%s)
hranice=$((ted - STARI_HODIN * 3600))
smazat=(); vynechane=(); nesloucene=(); selhane=()

chranena() {
  local v="$1" c
  for c in $CHRANENE_PRESNE; do [ "$v" = "$c" ] && return 0; done
  # shellcheck disable=SC2254
  case "$v" in $CHRANENE_VZOR) return 0 ;; esac
  return 1
}
vynechana() {
  local v="$1" c
  for c in $VYNECHAT; do [ "$v" = "$c" ] && return 0; done
  return 1
}

while IFS= read -r vetev; do
  [ -z "$vetev" ] || [ "$vetev" = "HEAD" ] && continue
  ref="refs/remotes/$REMOTE/$vetev"
  if chranena "$vetev"; then vynechane+=("$vetev — chráněná větev"); continue; fi
  if vynechana "$vetev"; then vynechane+=("$vetev — vynechaná zadáním"); continue; fi
  if ! git merge-base --is-ancestor "$ref" "refs/remotes/$REMOTE/$ZAKLAD"; then
    nesloucene+=("$vetev"); continue
  fi
  cas=$(git log -1 --format=%ct "$ref")
  if [ "$cas" -gt "$hranice" ]; then
    vynechane+=("$vetev — poslední commit mladší než $STARI_HODIN h ($(( (ted - cas) / 3600 )) h)")
    continue
  fi
  smazat+=("$vetev")
done < <(git for-each-ref --format='%(refname:strip=3)' "refs/remotes/$REMOTE/")

smazane=()
if [ "$JEN_VYPSAT" -eq 0 ]; then
  for v in "${smazat[@]}"; do
    if git push --quiet "$REMOTE" --delete "$v"; then smazane+=("$v"); else selhane+=("$v"); fi
  done
fi

# ---------- souhrn ----------
souhrn() {
  if [ "$JEN_VYPSAT" -eq 1 ]; then
    echo "## Sloučené větve — jen výpis (nic se nemazalo)"
  else
    echo "## Smazané sloučené větve"
  fi
  echo
  echo "Základ: \`$REMOTE/$ZAKLAD\`, hranice stáří: $STARI_HODIN h${VYNECHAT:+, vynecháno zadáním: \`$VYNECHAT\`}."
  echo
  if [ "$JEN_VYPSAT" -eq 1 ]; then
    echo "### Smazaly by se (${#smazat[@]})"
    for v in "${smazat[@]}"; do echo "- \`$v\`"; done
  else
    echo "### Smazané (${#smazane[@]})"
    for v in "${smazane[@]}"; do echo "- \`$v\`"; done
    if [ "${#selhane[@]}" -gt 0 ]; then
      echo
      echo "### Smazání selhalo (${#selhane[@]})"
      for v in "${selhane[@]}"; do echo "- \`$v\`"; done
    fi
  fi
  echo
  echo "### Vynechané (${#vynechane[@]})"
  for v in "${vynechane[@]}"; do echo "- \`${v%% — *}\` — ${v#* — }"; done
  echo
  echo "### Nejsou celé v \`$ZAKLAD\` — zůstávají (${#nesloucene[@]})"
  for v in "${nesloucene[@]}"; do echo "- \`$v\`"; done
  echo
  if [ "$JEN_VYPSAT" -eq 1 ]; then
    echo "SLOUCENE_VETVE: ke smazání ${#smazat[@]}, smazáno 0, vynecháno ${#vynechane[@]}, nesloučené ${#nesloucene[@]}"
  else
    echo "SLOUCENE_VETVE: ke smazání ${#smazat[@]}, smazáno ${#smazane[@]}, selhalo ${#selhane[@]}, vynecháno ${#vynechane[@]}, nesloučené ${#nesloucene[@]}"
  fi
}
souhrn
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then souhrn >> "$GITHUB_STEP_SUMMARY"; fi

[ "${#selhane[@]}" -eq 0 ] || exit 1
exit 0
