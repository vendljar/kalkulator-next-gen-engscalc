#!/usr/bin/env bash
# Test hooku pre-push s kontrolou osobních údajů a tajemství (SEC-M1, #542).
#
# Postaví dočasné holé „origin“ a klon s kopií nastroje/ (kontrola_udaju.py,
# povolený seznam, hooky). Smyšlený sdílecí odkaz claude.ai/code/cshk_… se
# skládá až za běhu, aby tenhle soubor sám nebyl nálezem.
#   1. pojistka: BEZ hooku push commitu s odkazem projde (test měří),
#   2. s hookem (instaluj_hooky.sh) push zastaven, origin commit nemá,
#   3. čistý commit projde,
#   4. odkaz přidaný a hned dalším commitem smazaný (špička čistá) → zastaven,
#   5. tag na commitu s odkazem → zastaven; tag na čistém commitu projde,
#   6. odkaz ve zprávě commitu → zastaven,
#   7. smazání vzdálené větve se nekontroluje (projde),
#   8. e-mail mimo povolený seznam → zastaven, smyšlený @example.com projde,
#   9. instaluj_hooky.sh --kontrola: 1 před instalací, 0 po ní; neznámá volba → 2.
# Jiný hook k ověření (pojistka proti prázdnému testu): PRE_PUSH_HOOK=<cesta>.
# Návratový kód = počet selhaných kontrol.
set -u
ZDROJ="$(cd "$(dirname "$0")/.." && pwd)"
HOOK="${PRE_PUSH_HOOK:-$ZDROJ/nastroje/hooky/pre-push}"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
export GIT_AUTHOR_NAME=Test GIT_AUTHOR_EMAIL=test@example.com GIT_COMMITTER_NAME=Test GIT_COMMITTER_EMAIL=test@example.com
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
chyb=0; ok=0
over() { if [ "$2" = "$3" ]; then ok=$((ok + 1)); echo "  ✓ $1"; else chyb=$((chyb + 1)); echo "  ✗ $1 (čekáno $3, je $2)"; fi; }

git init -q --bare -b main "$T/origin.git"
git clone -q "$T/origin.git" "$T/k" 2>/dev/null
cd "$T/k" || exit 1
mkdir -p nastroje/hooky
cp "$ZDROJ/nastroje/kontrola_udaju.py" "$ZDROJ/nastroje/povolene_kontakty.txt" "$ZDROJ/nastroje/instaluj_hooky.sh" nastroje/
cp "$HOOK" nastroje/hooky/pre-push
echo "základ" > README.md
git add -A && git commit -qm "základ" && git push -q origin main 2>/dev/null
ODKAZ="https://claude.ai/code/""cshk""_""Zk0usebniOdkaz12345"
push() { git push "$@" >/dev/null 2>&1; echo $?; }
na_originu() { git --git-dir="$T/origin.git" cat-file -e "$1^{commit}" 2>/dev/null && echo ano || echo ne; }

over "9. --kontrola před instalací → 1" "$(bash nastroje/instaluj_hooky.sh --kontrola 2>/dev/null; echo $?)" 1
over "9. neznámá volba → 2" "$(bash nastroje/instaluj_hooky.sh --help >/dev/null 2>&1; echo $?)" 2

# 1. pojistka: bez hooku projde
git checkout -qb bez-hooku
echo "odkaz: $ODKAZ" > poznamka.md; git add -A; git commit -qm "s odkazem"
over "1. pojistka: bez hooku push s odkazem projde" "$(push origin bez-hooku)" 0
git checkout -q main

bash nastroje/instaluj_hooky.sh >/dev/null
over "9. --kontrola po instalaci → 0" "$(bash nastroje/instaluj_hooky.sh --kontrola 2>/dev/null; echo $?)" 0

# 2. s hookem zastaven
git checkout -qb s-odkazem main
echo "odkaz: $ODKAZ" > dalsi.md; git add -A; git commit -qm "s odkazem 2"; S_ODKAZEM="$(git rev-parse HEAD)"
over "2. s hookem push s odkazem zastaven" "$(push origin s-odkazem)" 1
over "2. origin commit s odkazem nemá" "$(na_originu "$S_ODKAZEM")" ne

# 3. čistý commit projde
git checkout -qb cista main
echo "nic tajného" > cisty.md; git add -A; git commit -qm "čistý"; CISTY="$(git rev-parse HEAD)"
over "3. čistý commit projde" "$(push origin cista)" 0

# 4. přidaný a smazaný v témže pushi
git checkout -qb pridal-smazal main
echo "odkaz: $ODKAZ" > x.md; git add -A; git commit -qm "přidal"
git rm -q x.md; git commit -qm "smazal"
over "4. odkaz přidaný a o commit později smazaný → zastaven" "$(push origin pridal-smazal)" 1

# 5. tagy
over "5. tag na commitu s odkazem → zastaven" "$(git tag v1.1.1 "$S_ODKAZEM"; push origin v1.1.1)" 1
over "5. tag na čistém (už pushnutém) commitu projde" "$(git tag v1.1.2 "$CISTY"; push origin v1.1.2)" 0

# 6. zpráva commitu
git checkout -qb zprava main
echo "x" > z.md; git add -A; git commit -qm "viz $ODKAZ"
over "6. odkaz ve zprávě commitu → zastaven" "$(push origin zprava)" 1

# 7. mazání
over "7. smazání vzdálené větve projde" "$(push origin --delete cista)" 0

# 8. e-maily
git checkout -qb email main
echo "kontakt: jan.novak""@""neznama-firma.cz" > e.md; git add -A; git commit -qm "e-mail"
over "8. e-mail mimo povolený seznam → zastaven" "$(push origin email)" 1
git checkout -qb email-ok main
echo "kontakt: obchod@example.com" > e.md; git add -A; git commit -qm "smyšlený e-mail"
over "8. smyšlený e-mail @example.com projde" "$(push origin email-ok)" 0

echo "TEST_PRE_PUSH: $ok OK, $chyb FAIL"
exit "$chyb"
