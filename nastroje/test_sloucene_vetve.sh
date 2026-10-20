#!/usr/bin/env bash
# Test výběru sloučených větví (nastroje/sloucene_vetve.sh, W2 20. 10. 2026,
# K4-N2 a K4-N3 v O8).
#
# Postaví dočasné repo: holý „origin“ + klon. test vznikne ze zaklad sloučením
# větví merge commity (staré, jen mlada-sloucena má čerstvý commit), jedním
# commitem přímo na test (ff-sloucena = sloučení převinutím) a nakonec
# sloučením integrace. Větve:
#   stara-sloucena, claude/stara-davka   staré, sloučené mergem      → smazat
#   mlada-sloucena                       čerstvý commit              → nechat (mladší než 24 h)
#   nesloucena                           stará, mimo test            → nechat
#   vynechana                            stará, sloučená             → nechat (--vynechat)
#   main, test, test-draft, claude/integrace-20-10                   → nechat (chráněné)
#   nova-davka          K4-N2: čerstvá větev přesně na (staré) špičce test
#   nova-nad-integraci  K4-N2: čerstvá větev na špičce integrace (ta je
#                       zároveň druhým rodičem sloučení v test)
#   ff-sloucena         stará, sloučená převinutím — bez API stáří nedoložit
#   vnitrni-commit      větev na vnitřním (ne posledním) commitu sloučené
#                       claude/stara-davka — špička není rodičem merge → bez API zůstane
# Bez API obě nové větve i ff-sloucena zůstanou (špička na hlavní linii
# chráněné větve). S --github-repo a podvrženým `gh` (čas poslední aktivity)
# rozhoduje čas pushe: nova-davka zůstane, ff-sloucena se smaže; větev bez
# údaje nebo se selháním API jde na kritérium bez API.
# K4-N3: podvržený `git` při mazání claude/stara-davka nejdřív pushne do té
# větve nový commit z druhého klonu — smazání musí selhat (kód 1, oddíl
# „Smazání selhalo“) a nový commit zůstat na originu.
# Dál výpis (--jen-vypsat nic nesmaže), souhrn do GITHUB_STEP_SUMMARY
# a odmítnutí špatného zadání. Jiný skript k ověření (pojistka proti
# prázdnému testu): SLOUCENE_VETVE_SKRIPT=<cesta>.
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
  echo "$1" > "$1.txt"; git add "$1.txt"
  if [ -n "$d" ]; then GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d" git commit --quiet -m "$1"
  else git commit --quiet -m "$1"; fi
}
vetev_s_commitem() { # vetev_s_commitem <větev> [datum] — větev ze zaklad s vlastním commitem
  git checkout --quiet -b "$1" main; commit "${1//\//_}" "${2:-}"; git checkout --quiet main
}
slouc() { GIT_AUTHOR_DATE="$STARY" GIT_COMMITTER_DATE="$STARY" git merge --quiet --no-ff -m "sloučena $1" "$1"; }
commit zaklad "$STARY"
git branch test-draft
vetev_s_commitem claude/integrace-20-10 "$STARY"
vetev_s_commitem stara-sloucena "$STARY"
vetev_s_commitem claude/stara-davka "$STARY"
git checkout --quiet claude/stara-davka; git branch vnitrni-commit; commit davka2 "$STARY"; git checkout --quiet main
vetev_s_commitem vynechana "$STARY"
vetev_s_commitem mlada-sloucena
vetev_s_commitem nesloucena "$STARY"
git checkout --quiet -b test main
slouc stara-sloucena; slouc claude/stara-davka; slouc vynechana; slouc mlada-sloucena
commit ff "$STARY"; git branch ff-sloucena
slouc claude/integrace-20-10
git branch nova-davka
git branch nova-nad-integraci claude/integrace-20-10
git push --quiet origin main test test-draft claude/integrace-20-10 vynechana stara-sloucena \
  claude/stara-davka nesloucena mlada-sloucena ff-sloucena nova-davka nova-nad-integraci vnitrni-commit 2>/dev/null

vzdalene() { git ls-remote --heads origin | sed 's#.*refs/heads/##' | sort | tr '\n' ' '; }
VSECHNY="claude/integrace-20-10 claude/stara-davka ff-sloucena main mlada-sloucena nesloucena nova-davka nova-nad-integraci stara-sloucena test test-draft vnitrni-commit vynechana "
ZBYT="claude/integrace-20-10 claude/stara-davka ff-sloucena main mlada-sloucena nesloucena nova-davka nova-nad-integraci test test-draft vnitrni-commit vynechana "

echo "— výpis (--jen-vypsat), bez GitHub API"
vystup="$(bash "$SKRIPT" --jen-vypsat --vynechat "vynechana" 2>&1)"; kod=$?
kontrola "kód 0" [ "$kod" -eq 0 ]
kontrola "nic se nesmazalo" [ "$(vzdalene)" = "$VSECHNY" ]
kontrola "počty ve výpisu" grep -q 'SLOUCENE_VETVE: ke smazání 2, smazáno 0, vynecháno 10, nesloučené 1' <<<"$vystup"
kontrola "kandidát stara-sloucena" grep -q '^- `stara-sloucena`$' <<<"$vystup"
kontrola "kandidát claude/stara-davka" grep -q '^- `claude/stara-davka`$' <<<"$vystup"
kontrola "mladá větev vynechaná pro stáří" grep -q '^- `mlada-sloucena` — poslední commit mladší než 24 h' <<<"$vystup"
kontrola "K4-N2: čerstvá větev na staré špičce test zůstává" \
  grep -q '^- `nova-davka` — stáří nelze doložit: špička leží na hlavní linii test ' <<<"$vystup"
kontrola "K4-N2: čerstvá větev na špičce integrace zůstává" \
  grep -q '^- `nova-nad-integraci` — stáří nelze doložit: špička leží na hlavní linii claude/integrace-20-10 ' <<<"$vystup"
kontrola "sloučená převinutím bez API zůstává" grep -q '^- `ff-sloucena` — stáří nelze doložit' <<<"$vystup"
kontrola "vnitřní commit sloučené větve (ne rodič merge) zůstává" \
  grep -q '^- `vnitrni-commit` — stáří nelze doložit: špička není sloučená merge commitem do test' <<<"$vystup"
kontrola "claude/integrace-* chráněná" grep -q '^- `claude/integrace-20-10` — chráněná větev' <<<"$vystup"
kontrola "vynechaná zadáním" grep -q '^- `vynechana` — vynechaná zadáním' <<<"$vystup"
kontrola "nesloučená zůstává" grep -q '^- `nesloucena`$' <<<"$vystup"

echo "— výpis s GitHub API (podvržené gh: čas poslední aktivity větve)"
mkdir -p "$TMP/bin"
cat > "$TMP/bin/gh" <<'GH'
#!/usr/bin/env bash
# gh api repos/<repo>/activity?ref=refs/heads/<větev>&per_page=1 --jq …
echo "$*" >> "$GH_LOG"
v="${2#*ref=refs/heads/}"; v="${v%%&*}"
case "$(awk -v v="$v" '$1 == v { print $2 }' "$GH_AKTIVITA")" in
  SELHANI) exit 1 ;;
  '') exit 0 ;;
  *) awk -v v="$v" '$1 == v { print $2 }' "$GH_AKTIVITA" ;;
esac
GH
chmod +x "$TMP/bin/gh"
export GH_LOG="$TMP/gh.log" GH_AKTIVITA="$TMP/aktivita.txt"
cat > "$GH_AKTIVITA" <<EOF
nova-davka $(date -u +%Y-%m-%dT%H:%M:%SZ)
ff-sloucena 2026-01-02T12:00:00Z
claude/stara-davka 2026-01-02T12:00:00Z
stara-sloucena SELHANI
EOF
: > "$GH_LOG"
vystup="$(PATH="$TMP/bin:$PATH" bash "$SKRIPT" --jen-vypsat --vynechat "vynechana" --github-repo vlastnik/repo 2>&1)"; kod=$?
kontrola "kód 0" [ "$kod" -eq 0 ]
kontrola "počty s API" grep -q 'SLOUCENE_VETVE: ke smazání 3, smazáno 0, vynecháno 9, nesloučené 1' <<<"$vystup"
kontrola "API: čerstvý push nova-davka → zůstává" \
  grep -q '^- `nova-davka` — poslední push mladší než 24 h (0 h, GitHub)' <<<"$vystup"
kontrola "API: starý push ff-sloucena → smazat" grep -q '^- `ff-sloucena`$' <<<"$vystup"
kontrola "API bez údaje → kritérium bez API (nova-nad-integraci zůstává)" \
  grep -q '^- `nova-nad-integraci` — stáří nelze doložit: špička leží na hlavní linii' <<<"$vystup"
kontrola "API selhalo → kritérium bez API (stara-sloucena sloučená mergem → smazat)" \
  grep -q '^- `stara-sloucena`$' <<<"$vystup"
kontrola "API voláno s repozitářem a plným ref" grep -q '^api repos/vlastnik/repo/activity?ref=refs/heads/nova-davka&per_page=1 ' "$GH_LOG"
kontrola "API se neptá na chráněné ani mladé větve" bash -c '! grep -qE "heads/(main|test|test-draft|claude/integrace-20-10|mlada-sloucena|vynechana)&" "$1"' _ "$GH_LOG"

echo "— mazání se souběžným pushem (K4-N3)"
git clone --quiet "$TMP/origin.git" "$TMP/klon2" 2>/dev/null
( cd "$TMP/klon2" && git checkout --quiet claude/stara-davka && echo souběh > soubeh.txt && git add soubeh.txt \
  && git commit --quiet -m "souběžný push dávky" )
SOUBEH_SHA="$(git -C "$TMP/klon2" rev-parse HEAD)"
cat > "$TMP/bin/git" <<'GIT'
#!/usr/bin/env bash
# Při mazání větve $SOUBEH_VETEV nejdřív (jednou) pushne nový commit z druhého klonu.
case " $* " in
  *" --delete "*"$SOUBEH_VETEV"*)
    if [ ! -e "$SOUBEH_ZNACKA" ]; then
      : > "$SOUBEH_ZNACKA"
      "$REAL_GIT" -C "$SOUBEH_KLON" push --quiet origin "HEAD:refs/heads/$SOUBEH_VETEV" 2>/dev/null
    fi ;;
esac
exec "$REAL_GIT" "$@"
GIT
chmod +x "$TMP/bin/git"
export GITHUB_STEP_SUMMARY="$TMP/souhrn.md"
vystup="$(REAL_GIT="$(command -v git)" SOUBEH_VETEV=claude/stara-davka SOUBEH_KLON="$TMP/klon2" \
  SOUBEH_ZNACKA="$TMP/soubeh.znacka" PATH="$TMP/bin:$PATH" bash "$SKRIPT" --vynechat "vynechana" 2>&1)"; kod=$?
kontrola "souběžný push opravdu proběhl" [ -e "$TMP/soubeh.znacka" ]
kontrola "kód 1 (smazání selhalo)" [ "$kod" -eq 1 ]
kontrola "smazaná jen stara-sloucena" [ "$(vzdalene)" = "$ZBYT" ]
kontrola "nový commit claude/stara-davka zůstal na originu" \
  [ "$(git ls-remote origin refs/heads/claude/stara-davka | cut -f1)" = "$SOUBEH_SHA" ]
kontrola "počty po mazání" grep -q 'SLOUCENE_VETVE: ke smazání 2, smazáno 1, selhalo 1, vynecháno 10, nesloučené 1' <<<"$vystup"
kontrola "oddíl Smazání selhalo s větví" grep -A3 -q '^### Smazání selhalo (1)$' <<<"$vystup"
kontrola "  …a v něm claude/stara-davka" bash -c 'grep -A4 "^### Smazání selhalo (1)$" <<<"$1" | grep -q "^- \`claude/stara-davka\`$"' _ "$vystup"
kontrola "souhrn do GITHUB_STEP_SUMMARY" grep -q '^### Smazané (1)$' "$GITHUB_STEP_SUMMARY"
unset GITHUB_STEP_SUMMARY

echo "— hranice stáří 0 h a bez --vynechat"
vystup="$(bash "$SKRIPT" --jen-vypsat --stari-hodin 0 2>&1)"
kontrola "mladá i vynechana jsou kandidáti, chráněné a nové ne; souběžná práce nesloučená" \
  grep -q 'SLOUCENE_VETVE: ke smazání 2, smazáno 0, vynecháno 8, nesloučené 2' <<<"$vystup"

echo "— špatné zadání"
bash "$SKRIPT" --jen-vypsat --stari-hodin "24; rm" >/dev/null 2>&1; kod=$?
kontrola "nečíselné stáří odmítnuto (kód 2)" [ "$kod" -eq 2 ]
bash "$SKRIPT" --jen-vypsat --zaklad neexistuje >/dev/null 2>&1; kod=$?
kontrola "chybějící základ odmítnut (kód 2)" [ "$kod" -eq 2 ]
kontrola "po chybách nic nesmazáno" [ "$(vzdalene)" = "$ZBYT" ]

echo "TEST_SLOUCENE_VETVE: $ok prošlo, $chyb selhalo"
exit "$chyb"
