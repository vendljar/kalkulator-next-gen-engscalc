#!/usr/bin/env bash
# TEST nástroje porovnání sestavení (S3, nastroje/porovnej_sestaveni.sh).
#
#   1  dvě stejné reference → 0 rozdílů, kód 0
#   2  reference s úmyslně změněnou cenou (dočasný commit v DOČASNÉM klonu
#      v $TMPDIR — do repa nic nejde) → rozdíl v ceně celkem, kód 1
#   3  týž rozdíl v seznamu --ocekavane → kód 0; seznam, který kryje jen
#      jiné pole (dokument), → kód 1; pravidlo pro jiné případy → kód 1
#   4  chybné použití (jedna reference, neznámá volba, neexistující ref) → kód 2
#
# Pojistka (zapsaná v commitu): s porovnáním dočasně rozbitým tak, že
# rozdíly nehlásí (rozdilyPripadu vrací vždy []), testy 2 a 3 selžou;
# s nerozbitým projdou.
#
# Rychlé: --bez-sestaveni a malý fuzz. Spuštění: bash nastroje/test_porovnej_sestaveni.sh
set -u
KOREN="$(cd "$(dirname "$0")/.." && pwd)"
NASTROJ="$KOREN/nastroje/porovnej_sestaveni.sh"
T="$(mktemp -d "${TMPDIR:-/tmp}/kng_test_porovnani.XXXXXX")"
trap 'rm -rf "$T"' EXIT
ok=0; spatne=0
over() { if [ "$2" = "$3" ]; then ok=$((ok + 1)); echo "OK   $1"; else spatne=$((spatne + 1)); echo "FAIL $1 (čekal $3, je $2)"; tail -15 "$T/vystup"; fi; }

# Dočasný klon s jedním commitem navíc: koncová cena základu × 1,01
git clone --quiet --shared --no-checkout "$KOREN" "$T/klon" || { echo "klon nejde založit"; exit 1; }
git -C "$T/klon" checkout --quiet --detach "$(git -C "$KOREN" rev-parse HEAD)" || exit 1
sed -i 's/const zakladCenaZaokr = CEIL(zakladCena, 1000);/const zakladCenaZaokr = CEIL(zakladCena * 1.01, 1000);/' "$T/klon/src/engine.js"
if git -C "$T/klon" diff --quiet; then echo "FAIL příprava: změna ceny se do engine.js nedostala (změnil se řádek?)"; exit 1; fi
git -C "$T/klon" -c user.name=test -c user.email=test@priklad.cz commit --quiet -am "TEST: úmyslně změněná cena (jen dočasný klon)" || exit 1

spust() { bash "$NASTROJ" --repo "$T/klon" --bez-sestaveni --fuzz 4 "$@" >"$T/vystup" 2>&1; echo $?; }

# 1) stejné reference
k=$(spust HEAD~1 HEAD~1)
over "stejné reference → kód 0" "$k" 0
over "stejné reference → 0 rozdílných" "$(grep -c ', 0 rozdílných' "$T/vystup")" 1

# 2) změněná cena
k=$(spust HEAD~1 HEAD)
over "změněná cena → kód 1" "$k" 1
over "změněná cena → hlásí cenu celkem" "$(grep -c 'NEOČEKÁVANÝ .*cena celkem (cena)' "$T/vystup" | awk '{print ($1>0)}')" 1
over "změněná cena → výsledek NEOČEKÁVANÝ ROZDÍL" "$(grep -c '^Výsledek: NEOČEKÁVANÝ ROZDÍL' "$T/vystup")" 1
over "výstup nenese čísla cen (jen otisky a počty)" "$(grep -cE '[0-9]{3}[  ]?[0-9]{3} ?Kč|Kč' "$T/vystup")" 0

# 3) očekávané rozdíly
printf '# test: změna ceny je očekávaná všude\n*  *\n' >"$T/vse.txt"
k=$(spust HEAD~1 HEAD --ocekavane "$T/vse.txt")
over "očekávaný rozdíl (* *) → kód 0" "$k" 0
over "očekávaný rozdíl → JEN OČEKÁVANÉ ROZDÍLY" "$(grep -c '^Výsledek: JEN OČEKÁVANÉ ROZDÍLY' "$T/vystup")" 1
printf '*  dokument   # kryje jen dokument, ne cenu\n' >"$T/dok.txt"
k=$(spust HEAD~1 HEAD --ocekavane "$T/dok.txt")
over "seznam kryje jen jiné pole → kód 1" "$k" 1
printf 'fixtura:*  *   # jen fixtury\n' >"$T/fix.txt"
k=$(spust HEAD~1 HEAD --ocekavane "$T/fix.txt")
over "seznam kryje jiné případy → kód 1" "$k" 1
printf 'neexistuje:*  cena   # nic nepokryje\n' >"$T/nic.txt"
k=$(spust HEAD~1 HEAD~1 --ocekavane "$T/nic.txt")
over "nepoužité pravidlo → jen upozornění, kód 0" "$k" 0
over "nepoužité pravidlo → upozornění vypsané" "$(grep -c 'očekávaný rozdíl se neprojevil' "$T/vystup")" 1

# 4) chybné použití
k=$(spust HEAD); over "jedna reference → kód 2" "$k" 2
k=$(spust HEAD HEAD --nesmysl); over "neznámá volba → kód 2" "$k" 2
k=$(spust HEAD neexistujici-ref-xyz); over "neexistující reference → kód 2" "$k" 2

# worktree po sobě uklizené
over "po běhu nezůstal worktree" "$(git -C "$T/klon" worktree list | wc -l | tr -d ' ')" 1

echo "test_porovnej_sestaveni: $ok prošlo, $spatne selhalo"
[ "$spatne" -eq 0 ]
