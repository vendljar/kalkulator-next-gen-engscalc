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
# Dál výpis (--jen-vypsat nic nesmaže), souhrn do GITHUB_STEP_SUMMARY,
# odmítnutí špatného zadání a mimo rozsah stari_hodin (K4-N10), běh v Actions
# jen nad main (K4-N11) a „*“ ve --vynechat bez rozvinutí globu (K4-N19). Jiný skript k ověření (pojistka proti
# prázdnému testu): SLOUCENE_VETVE_SKRIPT=<cesta>. Jméno větve se znaky & # %
# jde do dotazu na API zakódované (K5-W2, O13; před opravou 2 ✗). D3 (21. 10. 2026):
# diakritika v locale C.UTF-8 (K6-W4), nečíselný čas commitu i odpovědi API
# (K5-W7), větev shodná s tagem a větev „-x“ (K5-W4) — mutanty z auditu K6
# (bez „local LC_ALL=C“, „--delete \"$v\"“, bez kontroly čísla na :176 / :183)
# dřív prošly 51/0, teď 2, 3, 1 a 1 ✗.
# Návratový kód = počet selhaných kontrol.

set -u
# V CI (testy.yml) jsou GITHUB_ACTIONS a GITHUB_REF nastavené na testovanou
# větev — skript by běh mimo main odmítl (K4-N11). Test si je nastaví sám.
unset GITHUB_ACTIONS GITHUB_REF GITHUB_STEP_SUMMARY
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
v="${2#*ref=refs/heads/}"; v="${v%%&*}"; v="$(printf '%b' "${v//%/\\x}")"   # jméno z URL-kódování (K5-W2)
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

echo "— hranice stáří 1 h, --vynechat s globem (K4-N19)"
touch vynechana   # soubor v pracovní složce: rozvinutý glob „v*“ by dal jméno větve
vystup="$(bash "$SKRIPT" --jen-vypsat --stari-hodin 1 --vynechat 'v*' 2>&1)"
kontrola "„v*“ je text, ne glob — vynechana je kandidát, mladá ne; souběžná práce nesloučená" \
  grep -q 'SLOUCENE_VETVE: ke smazání 1, smazáno 0, vynecháno 9, nesloučené 2' <<<"$vystup"
kontrola "  …vynechana mezi kandidáty" grep -q '^- `vynechana`$' <<<"$vystup"
rm -f vynechana

echo "— stari_hodin mimo rozsah (K4-N10)"
for spatne in 0 00 8761 99999 99999999999999999999 18446744073709551640 -1 ''; do
  bash "$SKRIPT" --jen-vypsat --stari-hodin "$spatne" >/dev/null 2>&1; kod=$?
  kontrola "stari_hodin '$spatne' odmítnuto (kód 2)" [ "$kod" -eq 2 ]
done
vystup="$(bash "$SKRIPT" --jen-vypsat --stari-hodin 08 2>&1)"; kod=$?
kontrola "„08“ = 8 h (desítkově, ne oktal)" bash -c '[ "$1" -eq 0 ] && grep -q "hranice stáří: 8 h" <<<"$2"' _ "$kod" "$vystup"
bash "$SKRIPT" --jen-vypsat --stari-hodin 8760 >/dev/null 2>&1; kod=$?
kontrola "8760 h (rok) přijato" [ "$kod" -eq 0 ]

echo "— běh v GitHub Actions jen nad main (K4-N11)"
vystup="$(GITHUB_ACTIONS=true GITHUB_REF=refs/heads/claude/upraveny-skript bash "$SKRIPT" --stari-hodin 1 2>&1)"; kod=$?
kontrola "spuštění z jiné větve → kód 2" [ "$kod" -eq 2 ]
kontrola "  …s hláškou" grep -q "mazat se smí jen ze spuštění nad main" <<<"$vystup"
kontrola "  …a nic se nesmazalo" [ "$(vzdalene)" = "$ZBYT" ]
GITHUB_ACTIONS=true GITHUB_REF=refs/heads/main bash "$SKRIPT" --jen-vypsat >/dev/null 2>&1; kod=$?
kontrola "spuštění nad main projde" [ "$kod" -eq 0 ]

echo "— špatné zadání"
bash "$SKRIPT" --jen-vypsat --stari-hodin "24; rm" >/dev/null 2>&1; kod=$?
kontrola "nečíselné stáří odmítnuto (kód 2)" [ "$kod" -eq 2 ]
bash "$SKRIPT" --jen-vypsat --zaklad neexistuje >/dev/null 2>&1; kod=$?
kontrola "chybějící základ odmítnut (kód 2)" [ "$kod" -eq 2 ]
kontrola "po chybách nic nesmazáno" [ "$(vzdalene)" = "$ZBYT" ]

echo "— jméno větve se znaky & # % v dotazu na API (K5-W2)"
ZVL='claude/zvl&ref=refs/heads/ff-sloucena#x%41'
git checkout --quiet -b "$ZVL" main; commit zvlastni "$STARY"; git checkout --quiet test; slouc "$ZVL"
git push --quiet origin test "$ZVL" 2>/dev/null
rm -f "$TMP/bin/git"   # podvržený git ze souběhu (K4-N3) tu nepatří
echo "$ZVL $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$GH_AKTIVITA"
: > "$GH_LOG"
vystup="$(PATH="$TMP/bin:$PATH" bash "$SKRIPT" --jen-vypsat --github-repo vlastnik/repo 2>&1)"; kod=$?
kontrola "kód 0" [ "$kod" -eq 0 ]
kontrola "API: jméno zakódované po segmentech (bez zdvojeného ref, bez useknutí u #)" \
  grep -qF 'api repos/vlastnik/repo/activity?ref=refs/heads/claude/zvl%26ref%3Drefs/heads/ff-sloucena%23x%2541&per_page=1 ' "$GH_LOG"
kontrola "API: čas se vzal z té větve (čerstvý push → zůstává)" \
  grep -qF -- "- \`$ZVL\` — poslední push mladší než 24 h (0 h, GitHub)" <<<"$vystup"

echo "— diakritika v UTF-8 (K6-W4), nečíselný čas (K5-W7), větev shodná s tagem a „-x“ (K5-W4)"
# claude/příliš: v C.UTF-8 by uri_segmenty bez „local LC_ALL=C“ kódoval znaky
# (%159…) místo bajtů UTF-8 — API by čas nevrátilo a větev (sloučená mergem)
# by se smazala, přestože má čerstvý push. necislo-git: čas commitu není
# číslo (podvržený git) → vynechat. necislo-api: API vrátí nečíselný čas
# (podvržený date) → kritérium bez API (špička na hlavní linii test) → nechat.
# shoda: větev i tag téhož jména — smazat se má větev, tag zůstat (mazání
# plným refs/heads/…); totéž větev „-x“ (bez refs/heads/ by byla volbou).
DIA='claude/příliš'
for v in "$DIA" necislo-git shoda; do
  git checkout --quiet -b "$v" main; commit "k_${v//\//_}" "$STARY"; git checkout --quiet test; slouc "$v"
done
git checkout --quiet -b pomlcka main; commit k_pomlcka "$STARY"; git checkout --quiet test; slouc pomlcka
git update-ref refs/heads/-x pomlcka; git branch --quiet -D pomlcka
git tag shoda main
git branch necislo-api test
git push --quiet origin refs/heads/test "refs/heads/$DIA" refs/heads/necislo-git refs/heads/shoda refs/heads/necislo-api \
  refs/heads/-x refs/tags/shoda 2>"$TMP/push.err" || cat "$TMP/push.err"
kontrola "příprava: nové větve i tag shoda na originu" bash -c 'for r in "refs/heads/$1" refs/heads/necislo-git refs/heads/shoda \
  refs/heads/necislo-api refs/heads/-x refs/tags/shoda; do git ls-remote --exit-code origin "$r" >/dev/null || exit 1; done' _ "$DIA"
echo "$DIA $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$GH_AKTIVITA"
echo "necislo-api NECISELNE" >> "$GH_AKTIVITA"
cat > "$TMP/bin/git" <<'GIT'
#!/usr/bin/env bash
# Čas commitu větve necislo-git podvržený jako text (K5-W7).
case " $* " in
  *" log -1 --format=%ct refs/remotes/origin/necislo-git "*) echo abc; exit 0 ;;
esac
exec "$REAL_GIT" "$@"
GIT
cat > "$TMP/bin/date" <<'DATE'
#!/usr/bin/env bash
# Nečíselná odpověď API (K5-W7): „NECISELNE“ převede na nečíselný „čas“.
if [ "${1:-}" = "-d" ] && [ "${2:-}" = "NECISELNE" ]; then echo 12abc; exit 0; fi
exec "$REAL_DATE" "$@"
DATE
chmod +x "$TMP/bin/git" "$TMP/bin/date"
: > "$GH_LOG"
vystup="$(LC_ALL=C.UTF-8 REAL_GIT="$(command -v git)" REAL_DATE="$(command -v date)" PATH="$TMP/bin:$PATH" \
  bash "$SKRIPT" --github-repo vlastnik/repo 2>&1)"; kod=$?
rm -f "$TMP/bin/git" "$TMP/bin/date"
kontrola "K6-W4: diakritika zakódovaná po bajtech UTF-8" \
  grep -qF 'api repos/vlastnik/repo/activity?ref=refs/heads/claude/p%C5%99%C3%ADli%C5%A1&per_page=1 ' "$GH_LOG"
kontrola "K6-W4: čas se vzal z té větve (čerstvý push → zůstává na originu)" \
  bash -c 'grep -qF -- "- \`$1\` — poslední push mladší než 24 h (0 h, GitHub)" <<<"$2" && git ls-remote --exit-code origin "refs/heads/$1" >/dev/null' _ "$DIA" "$vystup"
kontrola "K5-W7: nečíselný čas commitu → vynechána, nesmazána" \
  bash -c 'grep -qF -- "- \`necislo-git\` — nelze přečíst špičku ani čas commitu" <<<"$1" && git ls-remote --exit-code origin refs/heads/necislo-git >/dev/null' _ "$vystup"
kontrola "K5-W7: nečíselný čas z API → kritérium bez API (hlavní linie), nesmazána" \
  bash -c 'grep -qF -- "- \`necislo-api\` — stáří nelze doložit: špička leží na hlavní linii test" <<<"$1" && git ls-remote --exit-code origin refs/heads/necislo-api >/dev/null' _ "$vystup"
kontrola "K5-W4: větev shodná s tagem smazána, tag zůstal" \
  bash -c '! git ls-remote --exit-code origin refs/heads/shoda >/dev/null && git ls-remote --exit-code origin refs/tags/shoda >/dev/null' _
kontrola "K5-W4: větev „-x“ smazána" bash -c '! git ls-remote --exit-code origin refs/heads/-x >/dev/null' _
kontrola "  …a žádné mazání neselhalo" bash -c '! grep -q "^### Smazání selhalo" <<<"$1"' _ "$vystup"

echo "TEST_SLOUCENE_VETVE: $ok prošlo, $chyb selhalo"
exit "$chyb"
