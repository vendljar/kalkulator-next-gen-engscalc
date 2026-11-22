#!/usr/bin/env bash
# Test druhé vrstvy kontroly údajů — krok „Pushnuté commity“ workflow
# .github/workflows/kontrola_udaju.yml (B252, audit 20. 11. 2026, čočka NS).
#
# Krok se bere DOSLOVA z workflow (blok `run: |`) a pouští se v čerstvém
# klonu dočasného holého „origin“ (jako checkout s fetch-depth: 0) s PRED,
# PO a REF, jak je nastaví GitHub. Smyšlený e-mail se skládá za běhu.
#   1. jedna nová větev (údaj přidán a dalším commitem smazán, údaj i ve
#      zprávě) → nález,
#   2. DVĚ nové větve se stejnými commity jedním pushem → nález v obou bězích
#      (dřív se navzájem vyloučily a oba běhy hlásily „čisté, 0 commitů“),
#   3. existující větev, před..po s údajem → nález; čistý přírůstek → čisté,
#   4. nová čistá větev nad main → čisté,
#   5. nový anotovaný tag s e-mailem ve zprávě na čistém commitu → nález.
# Jiný workflow k ověření (pojistka proti prázdnému testu): WORKFLOW=<cesta>.
# Návratový kód = počet selhaných kontrol.
set -u
ZDROJ="$(cd "$(dirname "$0")/.." && pwd)"
WF="${WORKFLOW:-$ZDROJ/.github/workflows/kontrola_udaju.yml}"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
export GIT_AUTHOR_NAME=Test GIT_AUTHOR_EMAIL=test@example.com GIT_COMMITTER_NAME=Test GIT_COMMITTER_EMAIL=test@example.com
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
chyb=0; ok=0
over() { if [ "$2" = "$3" ]; then ok=$((ok + 1)); echo "  ✓ $1"; else chyb=$((chyb + 1)); echo "  ✗ $1 (čekáno $3, je $2)"; fi; }

python3 -I - "$WF" > "$T/krok.sh" <<'PY'
import re, sys
r = open(sys.argv[1], encoding='utf-8').read().split('\n')
od = next(i for i, x in enumerate(r) if re.search(r'name: Pushnuté commity', x))
run = next(i for i in range(od, len(r)) if re.match(r'\s+run: \|', r[i]))
odsaz = None
for x in r[run + 1:]:
    if x.strip() == '':
        continue
    o = len(x) - len(x.lstrip())
    if odsaz is None:
        odsaz = o
    if o < odsaz:
        break
    print(x[odsaz:])
PY
if ! grep -q 'kontrola_udaju.py --rozsah' "$T/krok.sh"; then
  echo "  ✗ krok „Pushnuté commity“ ve workflow nenalezen"; echo "TEST_WORKFLOW_UDAJU: 0 OK, 1 FAIL"; exit 1
fi

git init -q --bare -b main "$T/origin.git"
git clone -q "$T/origin.git" "$T/k" 2>/dev/null
cd "$T/k" || exit 1
mkdir -p nastroje
cp "$ZDROJ/nastroje/kontrola_udaju.py" "$ZDROJ/nastroje/povolene_kontakty.txt" nastroje/
echo "základ" > README.md
git add -A && git commit -qm "základ" && git push -q origin main 2>/dev/null
EMAIL_X="jan.novak""@""neznama-firma.cz"
NULY=0000000000000000000000000000000000000000

# Běh workflow: čerstvý klon se všemi větvemi a tagy, odpojená hlava na PO.
beh() {   # beh <ref> <před> <po>
  local W; W="$(mktemp -d "$T/beh.XXXX")"
  git clone -q "$T/origin.git" "$W" 2>/dev/null
  git -C "$W" fetch -q origin '+refs/tags/*:refs/tags/*' 2>/dev/null
  git -C "$W" checkout -q --detach "$3"
  (cd "$W" && PRED="$2" PO="$3" REF="$1" bash -e "$T/krok.sh" >/dev/null 2>&1); echo $?
}
s_udajem() {   # nová větev: údaj přidán, dalším commitem smazán (špička čistá), údaj i ve zprávě
  git checkout -qb "$1" origin/main
  echo "$EMAIL_X" > pozn.md; git add -A; git commit -qm "poznámka"
  echo "bez údaje" > pozn.md; git add -A; git commit -qm "oprava, psal $EMAIL_X"
}

s_udajem jedna; git push -q origin jedna 2>/dev/null
over "1. jedna nová větev s údajem v historii → nález" "$(beh refs/heads/jedna $NULY "$(git rev-parse jedna)")" 1

s_udajem dve-a; git branch dve-b dve-a; git push -q origin dve-a dve-b 2>/dev/null
PO="$(git rev-parse dve-a)"
over "2. B252: dvě nové větve naráz — běh pro dve-a → nález" "$(beh refs/heads/dve-a $NULY "$PO")" 1
over "2. B252: dvě nové větve naráz — běh pro dve-b → nález" "$(beh refs/heads/dve-b $NULY "$PO")" 1

git checkout -qb trvala origin/main; echo "a" > a.md; git add -A; git commit -qm "a"; git push -q origin trvala 2>/dev/null
PRED="$(git rev-parse trvala)"
echo "$EMAIL_X" > b.md; git add -A; git commit -qm "b"; git push -q origin trvala 2>/dev/null
over "3. existující větev, před..po s údajem → nález" "$(beh refs/heads/trvala "$PRED" "$(git rev-parse trvala)")" 1
PRED="$(git rev-parse trvala)"
echo "čisté" > b.md; git add -A; git commit -qm "c"; git push -q origin trvala 2>/dev/null
over "3. existující větev, čistý přírůstek → čisté" "$(beh refs/heads/trvala "$PRED" "$(git rev-parse trvala)")" 0

git checkout -qb cista origin/main; echo "nic" > c.md; git add -A; git commit -qm "čistý"; git push -q origin cista 2>/dev/null
over "4. nová čistá větev → čisté" "$(beh refs/heads/cista $NULY "$(git rev-parse cista)")" 0

git tag -a v1.1.1 -m "release $EMAIL_X" origin/main; git push -q origin v1.1.1 2>/dev/null
over "5. nový anotovaný tag s e-mailem ve zprávě → nález" "$(beh refs/tags/v1.1.1 $NULY "$(git rev-parse 'v1.1.1^{commit}')")" 1

echo "TEST_WORKFLOW_UDAJU: $ok OK, $chyb FAIL"
exit "$chyb"
