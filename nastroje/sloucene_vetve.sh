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
#   - větev s posledním commitem mladším než --stari-hodin (výchozí 24),
#   - větev, jejíž SKUTEČNÉ stáří je mladší než --stari-hodin nebo ho nelze
#     doložit (K4-N2, O8) — viz „Stáří větve“ níže,
#   - větve z --vynechat (mezerami oddělené názvy),
#   - větev, která celá v základu není (nesloučená práce).
#
# Stáří větve (K4-N2): čerstvá dávková větev bez vlastního commitu ukazuje
# na STARÝ commit, který už v test je (založená nad test, test-draft nebo
# integrací) — „celá v test“ a podle data commitu stará, přitom dávka běží.
# Git čas založení ani pushe větve nezná (vzdálený reflog není), proto:
#   1. S --github-repo vlastník/repo (workflow) se stáří bere z GitHubu:
#      čas poslední aktivity větve (push, založení, force-push) z API
#      repos/<repo>/activity?ref=refs/heads/<větev> přes `gh api`. Mladší
#      než limit → nechat. To je jediný údaj o skutečném stáří větve.
#   2. Bez API nebo když API čas nevrátí (selhání, prázdná historie) se
#      větev smaže jen tehdy, když je její špička doložitelně ukončená
#      sloučená práce: (a) špička je druhým (ne prvním) rodičem merge
#      commitu v základu — větev se do test sloučila merge commitem — a
#      (b) špička NELEŽÍ na hlavní linii (first-parent) žádné chráněné
#      větve. Čerstvá větev založená nad test, test-draft nebo integrací
#      ukazuje na commit z jejich hlavní linie, takže (b) ji podrží, i když
#      je ten commit zároveň druhým rodičem nějakého sloučení (integrace
#      sloučená do test). Větev sloučená rychlým převinutím (fast-forward)
#      se od čerstvé větve odlišit nedá → zůstane, s důvodem v souhrnu.
#      Zbývá úzký případ: větev založená přesně na špičce jiné, už sloučené
#      dávkové větve — tu bez API odlišit nejde; workflow proto API používá.
#
# Mazání (K4-N3, K4-N9): plným jménem refs/heads/<větev> a s
# --force-with-lease na hodnotu z fetch — pushne-li dávka do větve mezi
# načtením a smazáním, smazání se odmítne (stale info) a nová práce zůstane.
#
# Použití (v kořeni klonu):
#   bash nastroje/sloucene_vetve.sh --jen-vypsat
#   bash nastroje/sloucene_vetve.sh [--stari-hodin N] [--vynechat "a b"] [--zaklad test] [--remote origin]
#                                   [--github-repo vlastník/repo]
# Souhrn jde na výstup a — je-li nastavené GITHUB_STEP_SUMMARY — i do souhrnu běhu.
# Návratový kód: 0 = v pořádku, 1 = některé smazání selhalo, 2 = špatné zadání.

set -u

JEN_VYPSAT=0
STARI_HODIN=24
VYNECHAT=""
ZAKLAD="test"
REMOTE="origin"
GITHUB_REPO=""
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
    --github-repo) shift; GITHUB_REPO="${1:-}" ;;
    -h|--help) sed -n '2,50p' "$0"; exit 0 ;;
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
smazat=(); smazat_sha=(); vynechane=(); nesloucene=(); selhane=()

chranena() {
  local v="$1" c
  for c in $CHRANENE_PRESNE; do [ "$v" = "$c" ] && return 0; done
  # shellcheck disable=SC2254
  case "$v" in $CHRANENE_VZOR) return 0 ;; esac
  return 1
}
# Hlavní linie (first-parent) chráněných větví a druzí rodiče merge commitů
# v základu — podklad kritéria 2 (viz „Stáří větve“).
declare -A HLAVNI_LINIE=() SLOUCENO_MERGEM=()
while IFS= read -r chr; do
  chranena "$chr" || continue
  while IFS= read -r c; do HLAVNI_LINIE[$c]="$chr"; done \
    < <(git rev-list --first-parent "refs/remotes/$REMOTE/$chr")
done < <(git for-each-ref --format='%(refname:strip=3)' "refs/remotes/$REMOTE/")
while read -r _ prvni dalsi; do
  for c in $dalsi; do SLOUCENO_MERGEM[$c]=1; done
done < <(git log --merges --format='%H %P' "refs/remotes/$REMOTE/$ZAKLAD")

# Čas poslední aktivity větve na GitHubu (epoch), prázdný = nezjištěn.
cas_aktivity() {
  [ -n "$GITHUB_REPO" ] || return 0
  local t
  t=$(gh api "repos/$GITHUB_REPO/activity?ref=refs/heads/$1&per_page=1" --jq '.[0].timestamp // empty' 2>/dev/null) || return 0
  [ -n "$t" ] || return 0
  date -d "$t" +%s 2>/dev/null || true
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
  sha=$(git rev-parse --verify --quiet "$ref^{commit}")
  cas=$(git log -1 --format=%ct "$ref")
  case "$sha:$cas" in
    :*|*:|*:*[!0-9]*) vynechane+=("$vetev — nelze přečíst špičku ani čas commitu"); continue ;;
  esac
  if [ "$cas" -gt "$hranice" ]; then
    vynechane+=("$vetev — poslední commit mladší než $STARI_HODIN h ($(( (ted - cas) / 3600 )) h)")
    continue
  fi
  akt=$(cas_aktivity "$vetev")
  case "$akt" in *[!0-9]*) akt="" ;; esac
  if [ -n "$akt" ]; then
    if [ "$akt" -gt "$hranice" ]; then
      vynechane+=("$vetev — poslední push mladší než $STARI_HODIN h ($(( (ted - akt) / 3600 )) h, GitHub)")
      continue
    fi
  elif [ -n "${HLAVNI_LINIE[$sha]:-}" ]; then
    vynechane+=("$vetev — stáří nelze doložit: špička leží na hlavní linii ${HLAVNI_LINIE[$sha]} (čerstvá větev bez vlastního commitu, nebo sloučená převinutím)")
    continue
  elif [ -z "${SLOUCENO_MERGEM[$sha]:-}" ]; then
    vynechane+=("$vetev — stáří nelze doložit: špička není sloučená merge commitem do $ZAKLAD")
    continue
  fi
  smazat+=("$vetev"); smazat_sha+=("$sha")
done < <(git for-each-ref --format='%(refname:strip=3)' "refs/remotes/$REMOTE/")

smazane=()
if [ "$JEN_VYPSAT" -eq 0 ]; then
  for i in "${!smazat[@]}"; do
    v="${smazat[$i]}"
    if git push --quiet --force-with-lease="refs/heads/$v:${smazat_sha[$i]}" "$REMOTE" --delete "refs/heads/$v"; then
      smazane+=("$v")
    else
      selhane+=("$v")
    fi
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
      echo
      echo "Větev se mezitím změnila (souběžný push — nová práce zůstala) nebo mazání odmítl GitHub."
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
