#!/usr/bin/env bash
# TEST nástroje porovnání sestavení (S3, nastroje/porovnej_sestaveni.sh).
#
#   1  dvě stejné reference → 0 rozdílů, kód 0
#   2  reference s úmyslně změněnou cenou (dočasný commit v DOČASNÉM klonu
#      v $TMPDIR — do repa nic nejde) → rozdíl v ceně celkem, kód 1
#   3  týž rozdíl v seznamu --ocekavane → kód 0; seznam, který kryje jen
#      jiné pole (dokument), → kód 1; pravidlo pro jiné případy → kód 1
#   4  chybné použití (jedna reference, neznámá volba, neexistující ref) → kód 2
#   K56-D (25. 11. 2026, svěřené K56-2 … K56-5):
#   5  --ocekavane víckrát = sjednocení seznamů (každý sám nestačí → 1, oba → 0)
#   6  Kompletní náhled podkladů po BLOCÍCH: mutace bloku ceny v nahled_word.js
#      (dočasný commit) → pole nahled-np-cz/cena; seznam, který kryje jen sekce
#      technické části (ts:*), ji nekryje → kód 1; celé pole nebo blok cena → 0
#   7  kontrola sady: nová pole neprázdná (krycí list > 0 řádků, PROJ zamčená bez
#      chyby, náhled po blocích, docx-en/de); mutace krycího listu na 0 řádků
#      (dočasný commit, jako kolo 56: filtr verze bez polí) → „POZOR … kryci-bo > 0 řádků polí“
#   8  nástroj #733 --porovnej nad smyšlenými výstupy: vada v B → 1, bez vady → 0,
#      výstup bez částek a e-mailů; chybné použití → 2
#
# Pojistka (zapsaná v commitu): s porovnáním dočasně rozbitým tak, že
# rozdíly nehlásí (rozdilyPripadu vrací vždy []), testy 2 a 3 selžou;
# s nerozbitým projdou. K56-D: s otiskem náhledu jako celku (npPoBlocich
# vrací jedno pole) selže 6; s kontrolou, která nic nezapisuje, selže 7.
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

# 5) --ocekavane víckrát (K56-2): každý seznam sám nestačí, oba dohromady ano
printf '*  cena-celkem,radky,vysledek,cena-proj\n' >"$T/c1.txt"
printf '*  symboly,symboly-nove,dokument,ostatni\n' >"$T/c2.txt"
k=$(spust HEAD~1 HEAD --ocekavane "$T/c1.txt"); over "jen 1. seznam (cena) → kód 1" "$k" 1
k=$(spust HEAD~1 HEAD --ocekavane "$T/c2.txt"); over "jen 2. seznam (dokumenty) → kód 1" "$k" 1
k=$(spust HEAD~1 HEAD --ocekavane "$T/c1.txt" --ocekavane "$T/c2.txt"); over "oba seznamy → kód 0" "$k" 0
over "oba seznamy → hlavička jmenuje oba" "$(grep -c 'očekávané: c1.txt + c2.txt' "$T/vystup")" 1

# 6) náhled podkladů po blocích (K56-2, K56-I3): mutace bloku ceny
git -C "$T/klon" branch -q zaklad HEAD~1
git -C "$T/klon" checkout --quiet --detach zaklad
sed -i "s/  bloky.push({ typ: 'cena', radky: cena });/  bloky.push({ typ: 'cena', radky: cena.concat([{ popis: ['MUTACE K56-D'], hodnota: [''], styl: 'polozka' }]) });/" "$T/klon/src/nahled_word.js"
if git -C "$T/klon" diff --quiet; then echo "FAIL příprava: mutace bloku ceny se do nahled_word.js nedostala"; exit 1; fi
git -C "$T/klon" -c user.name=test -c user.email=test@priklad.cz commit --quiet -am "TEST: mutace bloku ceny náhledu (jen dočasný klon)" || exit 1
git -C "$T/klon" branch -q np-cena HEAD
k=$(spust zaklad np-cena); over "mutace bloku ceny → kód 1" "$k" 1
over "mutace bloku ceny → pole nahled-np-cz/cena" "$(grep -c 'NEOČEKÁVANÝ .*(nahled-np-cz/cena)' "$T/vystup" | awk '{print ($1>0)}')" 1
over "mutace bloku ceny → jiný blok náhledu beze změny" "$(grep -E 'NEOČEKÁVANÝ' "$T/vystup" | grep -cE 'nahled-np-(cz|en)/(ts|hlavicka|podpis|popis)')" 0
printf '*  nahled-np-cz/ts:*,nahled-np-en/ts:*,nahled-np-cz/hlavicka   # jen sekce technické části\n' >"$T/np_ts.txt"
k=$(spust zaklad np-cena --ocekavane "$T/np_ts.txt"); over "seznam kryje jen ts:* → mutace ceny neočekávaná (kód 1)" "$k" 1
printf '*  nahled-np-cz,nahled-np-en   # celé pole (hrubé pravidlo kola 56)\n' >"$T/np_cele.txt"
k=$(spust zaklad np-cena --ocekavane "$T/np_cele.txt"); over "celé pole nahled-np-* kryje i blok ceny (kód 0)" "$k" 0
printf '*  nahled-np-cz/cena,nahled-np-en/cena\n' >"$T/np_cena.txt"
k=$(spust zaklad np-cena --ocekavane "$T/np_cena.txt"); over "blok cena → kód 0" "$k" 0

# 7) kontrola sady (K56-5): nová pole neprázdná; mutace krycího listu na 0 řádků
k=$(spust zaklad zaklad)
over "kontrola sady: nová pole neprázdná (A i B)" "$(grep -c 'kontrola sady [AB]: nová pole neprázdná' "$T/vystup")" 2
git -C "$T/klon" checkout --quiet --detach zaklad
# jako slepé místo kola 56 (kryciData bez verze): filtr verze nepustí žádné pole
sed -i 's/const radky = s.pole.filter(p => p.verze.includes(verze) \&\&/const radky = s.pole.filter(p => false \&\& p.verze.includes(verze) \&\&/' "$T/klon/src/kryci.js"
if git -C "$T/klon" diff --quiet; then echo "FAIL příprava: mutace krycího listu se do kryci.js nedostala"; exit 1; fi
git -C "$T/klon" -c user.name=test -c user.email=test@priklad.cz commit --quiet -am "TEST: krycí list bez řádků (jen dočasný klon)" || exit 1
git -C "$T/klon" branch -q kl-prazdny HEAD
k=$(spust zaklad kl-prazdny)
over "krycí list 0 řádků → kontrola B hlásí POZOR" "$(grep -c 'kontrola sady B: POZOR .*kryci-bo > 0 řádků polí' "$T/vystup")" 1
over "krycí list 0 řádků → kontrola A čistá" "$(grep -c 'kontrola sady A: nová pole neprázdná' "$T/vystup")" 1

# 8) nástroj #733 --porovnej (smyšlené výstupy, bez prohlížeče)
PDN="$KOREN/nastroje/porovnani_pd_webhook.mjs"
node -e '
const zakl = { marze: 0.3, pmarze: 0.35, zabrany: 777, hod: 1234, cena: "1000", symboly: { CENA_S_DPH: "1 210 Kč", NAZEV_AKCE: "Nová" }, cteni: false, zadani: "{}", proj: "{}", kontakt: { jmeno: "", maEmail: false, maTelefon: false } };
const ok = { webhook: [200, "zalozeno"], nova: zakl, wh: Object.assign({}, zakl, { symboly: { CENA_S_DPH: "1 210 Kč", NAZEV_AKCE: "CN-1 Deal" }, kontakt: { jmeno: "Osoba Příkladová", maEmail: false, maTelefon: false, jeJmenoOsoby: true } }), chyby: [] };
const vada = { webhook: [200, "zalozeno"], nova: zakl, wh: Object.assign({}, zakl, { marze: 0, cena: "900", symboly: { CENA_S_DPH: "1 089 Kč", NAZEV_AKCE: "CN-1 Deal" }, cteni: true, kontakt: { jmeno: "Osoba Příkladová", maEmail: true, maTelefon: true, jeJmenoOsoby: false } }), chyby: [] };
const fs = require("fs"); fs.writeFileSync(process.argv[1] + "/pd_ok.json", JSON.stringify(ok)); fs.writeFileSync(process.argv[1] + "/pd_vada.json", JSON.stringify(vada));' "$T"
node "$PDN" --porovnej "$T/pd_vada.json" "$T/pd_ok.json" >"$T/vystup" 2>&1; over "#733 --porovnej: vada v A, B v pořádku → kód 0" "$?" 0
over "#733 --porovnej: A marže ✗, B ✓" "$(grep -c '^  marze (cena) *✗ *✓' "$T/vystup")" 1
over "#733 --porovnej: název akce z dealu se neporovnává" "$(grep -c 'NAZEV_AKCE' "$T/vystup")" 0
over "#733 --porovnej: výstup bez částek a e-mailů" "$(grep -cE 'Kč|@|1 210|1 089|0\.3' "$T/vystup")" 0
node "$PDN" --porovnej "$T/pd_ok.json" "$T/pd_vada.json" >"$T/vystup" 2>&1; over "#733 --porovnej: vada v B → kód 1" "$?" 1
over "#733 --porovnej: kontakt B má e-mail" "$(grep -c '^  kontakt: má e-mail *ne ✓ *ano ✗' "$T/vystup")" 1
node "$PDN" --porovnej "$T/pd_ok.json" >"$T/vystup" 2>&1; over "#733 --porovnej: jeden soubor → kód 2" "$?" 2
k=$(spust HEAD HEAD --pd-webhook --bez-sestaveni); over "--pd-webhook s --bez-sestaveni → kód 2" "$k" 2

# worktree po sobě uklizené
over "po běhu nezůstal worktree" "$(git -C "$T/klon" worktree list | wc -l | tr -d ' ')" 1

echo "test_porovnej_sestaveni: $ok prošlo, $spatne selhalo"
[ "$spatne" -eq 0 ]
