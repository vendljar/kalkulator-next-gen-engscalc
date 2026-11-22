#!/usr/bin/env bash
# PŘESKOČENÍ V KOLE MUSÍ BÝT VIDĚT (HN, 21. 11. 2026; zjištění koordinace 19. 11.).
#
#  1) testovaci_kolo.sh hlásil VŠE ZELENÉ, i když bez node_modules/playwright
#     přeskočil 58 prohlížečových harnessů. Teď: chybí-li playwright, kolo
#     skončí hned na začátku kódem 2 s návodem; přeskočené harnessy ve výpisu
#     sad = selhání; vědomě KNG_BEZ_PROHLIZECE=1 → „ZELENÁ BEZ PROHLÍŽEČE".
#  2) src/test_354_mustky.js v mělkém klonu přeskočil srovnání se starým
#     jádrem jen s INFO a kolo DO propustilo regresi. Teď sada vypíše
#     „PRESKOCENO_CAST:", spust_testy.sh ji zapíše mezi přeskočené a kolo ji
#     ukáže v souhrnu „Přeskočené sady".
#
# Kolo se pouští s krokem sady nahrazeným připraveným výpisem
# (KNG_KOLO_SADY_VZOR) a s vynuceným stavem playwrightu (KNG_KOLO_PLAYWRIGHT).
# Spuštění: bash nastroje/test_kolo_preskoceni.sh   (statické kontroly kola)
set -u
KOREN="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
ok=0; fail=0
t() { if [ "$2" = 0 ]; then ok=$((ok + 1)); echo "OK   $1"; else fail=$((fail + 1)); echo "FAIL $1"; [ -n "${3:-}" ] && sed 's/^/     /' "$3" | tail -15; fi; }
ma() { grep -qF -- "$2" "$1"; }

kolo() {  # kolo <výstup> <env…> — jen krok sady
  local out="$1"; shift
  ( cd "$KOREN" && env KNG_KOLO_LOGY="$TMP/logy" "$@" bash nastroje/testovaci_kolo.sh --jen sady ) > "$out" 2>&1
  echo $?
}

cat > "$TMP/sady_pw.txt" <<'X'
Souhrn: 120 prošlo, 0 selhalo, 2 přeskočeno (celkem 122 sad).
Přeskočeno (nic neověřily):
  – overit_zobrazeni.mjs (chybí playwright)
  – overit_zaporne.mjs (chybí playwright)
X
cat > "$TMP/sady_cast.txt" <<'X'
Souhrn: 120 prošlo, 0 selhalo, 0 přeskočeno (celkem 120 sad).
Částečně přeskočeno: 1 (sada prošla, část kontrol neběžela — viz seznam).
Přeskočeno (nic neověřily):
  – test_354_mustky.js (částečně: srovnání bajt po bajtu s jádrem před #354)
X
cat > "$TMP/sady_ok.txt" <<'X'
Souhrn: 120 prošlo, 0 selhalo, 0 přeskočeno (celkem 120 sad).
X

# --- 1) playwright chybí: konec hned na začátku, kód 2, návod
k=$(kolo "$TMP/o1" KNG_KOLO_PLAYWRIGHT=chybi KNG_KOLO_SADY_VZOR="$TMP/sady_ok.txt")
t "chybí playwright → kolo skončí kódem 2 ještě před sadami" "$([ "$k" = 2 ] && ! ma "$TMP/o1" 'TESTOVACÍ KOLO — kroky' && echo 0 || echo 1)" "$TMP/o1"
t "chybí playwright → návod (ln -sfn … node_modules/playwright, KNG_BEZ_PROHLIZECE)" "$(ma "$TMP/o1" 'node_modules/playwright' && ma "$TMP/o1" 'KNG_BEZ_PROHLIZECE=1' && echo 0 || echo 1)" "$TMP/o1"
t "chybí playwright → nikde VŠE ZELENÉ" "$(! ma "$TMP/o1" 'Výsledek: VŠE ZELENÉ' && echo 0 || echo 1)" "$TMP/o1"

# --- 2) harnessy přeskočené pro playwright ve výpisu sad = selhání
k=$(kolo "$TMP/o2" KNG_KOLO_PLAYWRIGHT=je KNG_KOLO_SADY_VZOR="$TMP/sady_pw.txt")
t "přeskočené harnessy (chybí playwright) → kolo selže (kód ≠ 0)" "$([ "$k" != 0 ] && echo 0 || echo 1)" "$TMP/o2"
t "přeskočené harnessy → počet a návod v souhrnu, žádné VŠE ZELENÉ" "$(ma "$TMP/o2" '2 prohlížečových harnessů se přeskočilo' && ma "$TMP/o2" 'Výsledek: SELHALO' && ! ma "$TMP/o2" 'Výsledek: VŠE ZELENÉ' && echo 0 || echo 1)" "$TMP/o2"

# --- 3) vědomě bez prohlížeče
k=$(kolo "$TMP/o3" KNG_KOLO_PLAYWRIGHT=chybi KNG_BEZ_PROHLIZECE=1 KNG_KOLO_SADY_VZOR="$TMP/sady_pw.txt")
t "KNG_BEZ_PROHLIZECE=1 → kód 0, ale ZELENÁ BEZ PROHLÍŽEČE (ne VŠE ZELENÉ)" "$([ "$k" = 0 ] && ma "$TMP/o3" 'ZELENÁ BEZ PROHLÍŽEČE' && ! ma "$TMP/o3" 'Výsledek: VŠE ZELENÉ' && echo 0 || echo 1)" "$TMP/o3"

# --- 4) částečné přeskočení je v souhrnu „Přeskočené sady"
k=$(kolo "$TMP/o4" KNG_KOLO_PLAYWRIGHT=je KNG_KOLO_SADY_VZOR="$TMP/sady_cast.txt")
t "PRESKOCENO_CAST → v souhrnu „Přeskočené sady“ (test_354_mustky.js, částečně)" "$(sed -n '/^Přeskočené sady/,$p' "$TMP/o4" | grep -q 'test_354_mustky.js (částečně:' && echo 0 || echo 1)" "$TMP/o4"

# --- 5) bez přeskočení dál VŠE ZELENÉ
k=$(kolo "$TMP/o5" KNG_KOLO_PLAYWRIGHT=je KNG_KOLO_SADY_VZOR="$TMP/sady_ok.txt")
t "bez přeskočení → VŠE ZELENÉ, kód 0" "$([ "$k" = 0 ] && ma "$TMP/o5" 'Výsledek: VŠE ZELENÉ.' && echo 0 || echo 1)" "$TMP/o5"

# --- 6) spust_testy.sh přenáší PRESKOCENO_CAST do seznamu přeskočených
t "spust_testy.sh čte PRESKOCENO_CAST u prošlé sady (Node i prohlížeč)" "$([ "$(grep -c 'preskoceni_casti "$f"' "$KOREN/spust_testy.sh")" = 2 ] && grep -q "grep '^PRESKOCENO_CAST: '" "$KOREN/spust_testy.sh" && echo 0 || echo 1)"

# --- 7) test_354_mustky.js v mělkém klonu bez dotažení vypíše značku (ne jen INFO)
if git -C "$KOREN" rev-parse HEAD >/dev/null 2>&1; then
  git clone -q --depth 1 "file://$KOREN" "$TMP/mel" 2>/dev/null
  if [ -d "$TMP/mel/src" ]; then
    cp "$KOREN/src/test_354_mustky.js" "$TMP/mel/src/"   # pracovní kopie sady (i necommitovaná)
    ( cd "$TMP/mel" && KNG_BEZ_DOTAZENI=1 node src/test_354_mustky.js ) > "$TMP/o7" 2>&1; k=$?
    t "test_354_mustky.js v mělkém klonu: projde a vypíše PRESKOCENO_CAST" "$([ "$k" = 0 ] && grep -q '^PRESKOCENO_CAST: ' "$TMP/o7" && echo 0 || echo 1)" "$TMP/o7"
  fi
fi

echo "test_kolo_preskoceni: $ok prošlo, $fail selhalo"
[ "$fail" -eq 0 ]
