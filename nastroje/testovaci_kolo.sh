#!/usr/bin/env bash
# JEDNO TESTOVACÍ KOLO — celá sekvence v jednom běhu (A5; hloubkový test
# 24. 9. 2026, zavedeno 26. 9. 2026).
#
# Do té doby se pouštělo pět věcí pěti příkazy (spust_testy.sh, sestavení,
# harnessy, dvě mutace) a CI mělo vlastní seznam kroků. Kdo pustil jen část,
# o tom nevěděl; kdo pustil všechno, skládal si výsledek z pěti výpisů.
# Tenhle skript pouští VŠECHNO v pevném pořadí a končí jedním souhrnem
# s počty — a nenulovým návratovým kódem, když cokoli selhalo. Přeskočené
# sady (chybí playwright, firemní podklad mimo repozitář, skutečný ceník) se
# hlásí jako PŘESKOČENÉ, nikdy jako prošlé. Sada, která prošla jen zčásti,
# to hlásí řádkem „PRESKOCENO_CAST:" a objeví se v souhrnu „Přeskočené sady"
# taky. Chybějící playwright (krok sady) = chyba s návodem hned na začátku;
# vědomě bez prohlížeče KNG_BEZ_PROHLIZECE=1 → „ZELENÁ BEZ PROHLÍŽEČE" (HN).
#
# Pořadí kroků:
#   build          kontrola verze (build.py --kontrola-verze — špatná verze padne hned,
#                  ne po dvaceti minutách sad) + sestavení bez zvýšení verze
#                  (KNG_NEZVYSOVAT_VERZI=1 python3 build.py)
#   sady           spust_testy.sh --smoke: všechny src/test_*.js (včetně test.js),
#                  všechny netlify/test_*.mjs, rychlé kontroly zadání mutací,
#                  smoke.mjs a VŠECHNY overit_*.mjs — globem, žádný ruční seznam
#   hodiny         Node a serverové sady znovu s hodinami posunutými o +400 dní
#                  (KNG_POSUN_DNU, nastroje/posun_hodin.cjs) — pojistka proti
#                  časovaným bombám v testech (K37-N5: test s pevným datem padl
#                  po roce a zastavil celé kolo); bez prohlížečových sad
#   mutace-jadro   mutace_jadro.mjs (výpočetní jádro)
#   mutace-server  netlify/mutace.mjs (serverové funkce)
#   staticke       verze = den posledního commitu, žádné CRLF, osobní údaje
#                  a tajemství mimo povolený seznam (nastroje/kontrola_udaju.py),
#                  výběr sloučených větví ke smazání (nastroje/test_sloucene_vetve.sh),
#                  hook pre-push s kontrolou údajů (nastroje/test_pre_push.sh, SEC-M1),
#                  test nástroje porovnání sestavení (nastroje/test_porovnej_sestaveni.sh, S3),
#                  přeskočení v kole je vidět (nastroje/test_kolo_preskoceni.sh, HN),
#                  PREDAVKA.md do 15 kB (chyba), main předkem HEAD (upozornění; S7),
#                  evidence roadmap.json podle schématu S6 a PREHLED.md (vyrobit jde = jinak chyba;
#                  neodpovídá stavu = upozornění; nastroje/prehled_stavu.py --kontrola, S8)
#                  značky konfliktu (<<<<<<< / ======= / >>>>>>>) ve sledovaných
#                  souborech = chyba (nastroje/kontrola_konfliktu.sh, #706)
#   porovnani      VOLITELNÝ (jen s --proti nebo --jen porovnani; S3, 18. 11. 2026):
#                  nastroje/porovnej_sestaveni.sh <ref> . — pevná sada kalkulací
#                  nad sestavením <ref> (výchozí origin/test) a nad pracovní kopií;
#                  neočekávaný rozdíl = krok selže. Očekávané rozdíly:
#                  --ocekavane <soubor> (nebo KNG_POROVNANI_OCEKAVANE).
#
# Použití:
#   bash nastroje/testovaci_kolo.sh                    celé kolo (mutace trvají dohromady kolem 40 minut)
#   bash nastroje/testovaci_kolo.sh --bez-mutaci       bez mutací (dávka, která nesáhla do jádra ani serveru)
#   bash nastroje/testovaci_kolo.sh --jen mutace-server,staticke   jen vybrané kroky
#   bash nastroje/testovaci_kolo.sh --bez-mutaci --proti origin/test   kolo + porovnání s test
#   bash nastroje/testovaci_kolo.sh --jen porovnani --proti origin/main --ocekavane <soubor>
#   KNG_MUTACE_CAST=2/4 bash nastroje/testovaci_kolo.sh --jen mutace-server
#                                                      jen část mutací (každá 4. od 2.)
#   KNG_MUTACE_OD=529 bash nastroje/testovaci_kolo.sh --jen mutace-server
#                                                      pokračování přerušeného běhu
#   KNG_MUTACE_OD patří k JEDNOMU kroku (--jen mutace-server, nebo --jen mutace-jadro):
#   číslování serveru a jádra se liší. Navázání nad pracovní kopií se zbytkem
#   mutace v src/ nebo netlify/ skončí chybou (K8-W9, #514; vědomě KNG_MUTACE_SPINAVE=1).
#   (P2, 23. 10. 2026; podklady/PROMPT_mutacni_beh_23_10.md. Proměnné předá oběma
#   mutačním skriptům prostředí, výběr dělá nastroje/mutace_cast.mjs. Kolo
#   s částí mutací nikdy nehlásí „VŠE ZELENÉ" — jen „ZELENÁ ČÁST".)
#
# CI (.github/workflows/testy.yml) volá TENTÝŽ skript — druhý seznam kroků
# neexistuje. Firemní podklady mimo repozitář: KNG_PODKLADY=<složka>.
# Návratový kód = počet selhaných kroků (0 = vše zelené).
#
# MUTAČNÍ BĚH SE NIKDY NEPŘERUŠUJE: skript mutací si zdrojáky po sobě
# obnovuje; přerušený běh je může nechat pozměněné (viz hlavičky obou skriptů).

set -u
cd "$(dirname "$0")/.." || exit 1
: "${ADMIN_EMAIL:=spravce@priklad.cz}"; export ADMIN_EMAIL
if [ -z "${NODE_PATH:-}" ] && command -v npm >/dev/null 2>&1; then
  NODE_PATH="$(npm root -g 2>/dev/null)"; export NODE_PATH
fi

# SEC-M1 (#542): hook pre-push s kontrolou údajů zapnout v každém klonu, kde
# kolo běží (v CI se nepushuje — tam ne).
if [ "${GITHUB_ACTIONS:-}" != "true" ]; then bash nastroje/instaluj_hooky.sh >/dev/null 2>&1 || true; fi

KROKY="build,sady,hodiny,mutace-jadro,mutace-server,staticke"
PROTI="origin/test"; PRIDAT_POROVNANI=0
while [ $# -gt 0 ]; do
  case "$1" in
    --bez-mutaci) KROKY="build,sady,hodiny,staticke" ;;
    --jen) shift; KROKY="${1:-}" ;;
    --jen=*) KROKY="${1#--jen=}" ;;
    --proti) shift; PROTI="${1:-}"; [ -n "$PROTI" ] || { echo "--proti chce referenci gitu"; exit 2; }; PRIDAT_POROVNANI=1 ;;
    --proti=*) PROTI="${1#--proti=}"; PRIDAT_POROVNANI=1 ;;
    --ocekavane) shift; KNG_POROVNANI_OCEKAVANE="${1:-}" ;;
    --ocekavane=*) KNG_POROVNANI_OCEKAVANE="${1#--ocekavane=}" ;;
    -h|--help) sed -n '2,59p' "$0"; exit 0 ;;
    *) echo "neznámá volba: $1 (viz --help)"; exit 2 ;;
  esac
  shift
done
[ "$PRIDAT_POROVNANI" -eq 1 ] && KROKY="$KROKY,porovnani"
chce() { case ",$KROKY," in *",$1,"*) return 0 ;; *) return 1 ;; esac; }

LOGY="${KNG_KOLO_LOGY:-$(mktemp -d)}"
mkdir -p "$LOGY"
selhalo=0
souhrn=()
preskocene=()
zacatek=$(date +%s)

cas() { local s=$1; if [ "$s" -ge 60 ]; then printf '%d min %d s' $((s / 60)) $((s % 60)); else printf '%d s' "$s"; fi; }

# krok <id> <název> <příkaz…> — spustí, změří, výstup jde na obrazovku i do $LOGY/<id>.log.
# Poznámku do souhrnu (počty) si krok vytáhne ze svého logu funkcí poznamka_<id>, pokud existuje.
krok() {
  local id="$1" nazev="$2"; shift 2
  echo; echo "━━━━━━━━━━ $nazev"
  local t0; t0=$(date +%s)
  "$@" 2>&1 | tee "$LOGY/$id.log"
  local kod=${PIPESTATUS[0]}
  local t=$(( $(date +%s) - t0 ))
  local pozn=""
  if declare -F "poznamka_$id" >/dev/null; then pozn="$("poznamka_$id" "$LOGY/$id.log")"; fi
  if [ "$kod" -eq 0 ]; then
    souhrn+=("  ✓ $(printf '%-34s' "$nazev") ${pozn:+$pozn   }$(cas "$t")")
  else
    selhalo=$((selhalo + 1))
    souhrn+=("  ✗ $(printf '%-34s' "$nazev") ${pozn:+$pozn   }$(cas "$t")   (kód $kod, výpis: $LOGY/$id.log)")
  fi
  return "$kod"
}

# ---------- kroky ----------
build() {
  # Verze se ověří ještě před sestavením a před sadami (nález 10. 9. 2026,
  # hlídá src/test_build_info.js): špatná verze má spadnout za vteřinu, ne
  # po dvaceti minutách. Statické kontroly na konci ji ověří znovu jako
  # závěrečnou bránu — obojí trvá zlomek vteřiny.
  python3 build.py --kontrola-verze || return 1
  KNG_NEZVYSOVAT_VERZI=1 python3 build.py
}

sady() {
  # Zkušební háček pro nastroje/test_kolo_preskoceni.sh: místo sad vypíše
  # připravený výpis (souhrn spust_testy.sh) a skončí jeho kódem.
  if [ -n "${KNG_KOLO_SADY_VZOR:-}" ]; then cat "$KNG_KOLO_SADY_VZOR"; return "${KNG_KOLO_SADY_KOD:-0}"; fi
  bash ./spust_testy.sh --smoke
}
# K37-N5 (2. 11. 2026): tytéž Node sady o 400 dní později. Bomba (pevné
# datum, které za rok zestárne) tu spadne hned, ne za rok v CI.
hodiny() {
  KNG_POSUN_DNU="${KNG_POSUN_DNU:-400}" bash ./spust_testy.sh
}
poznamka_hodiny() { poznamka_sady "$1"; }
poznamka_sady() {
  local r; r="$(grep -o 'Souhrn: [0-9]* prošlo, [0-9]* selhalo, [0-9]* přeskočeno' "$1" | tail -1 | sed 's/^Souhrn: //')"
  printf '%s' "${r:-bez souhrnu}"
}
# Přeskočené sady (nic neověřily) ze souhrnu spust_testy.sh — jedna na řádek.
# Volá se až v závěru, ne z poznámky kroku: ta běží v $(…), tedy v podshellu,
# a pole naplněné tam by se ztratilo (první kolo 26. 9. 2026 seznam nevypsalo).
preskocene_ze_sady() {
  local v=0 l
  [ -f "$1" ] || return 0
  while IFS= read -r l; do
    if [ "$v" -eq 1 ]; then
      case "$l" in "  – "*) printf '%s\n' "${l#  – }" ;; *) v=0 ;; esac
    fi
    [ "$l" = "Přeskočeno (nic neověřily):" ] && v=1
  done < "$1"
  return 0
}

mutace_jadro() { node mutace_jadro.mjs; }
poznamka_mutace_jadro() {
  local r; r="$(grep -o 'Chycených [0-9]* z [0-9]*' "$1" | tail -1 | sed 's/^Chycených/chycených/')"
  local c; c="$(grep -o 'Pokryto: .* — NE celý běh' "$1" | tail -1 | sed 's/^Pokryto: //; s/ — NE celý běh$//')"
  printf '%s%s' "${r:-bez souhrnu}" "${c:+ ($c)}"
}

mutace_server() { node netlify/mutace.mjs; }
poznamka_mutace_server() {
  local r; r="$(grep -o 'Chycených [0-9]* z [0-9]*' "$1" | tail -1 | sed 's/^Chycených/chycených/')"
  local ch; ch="$(grep -o 'chybně zadaných mutací: [0-9]*' "$1" | tail -1)"
  local c; c="$(grep -o 'Pokryto: .* — NE celý běh' "$1" | tail -1 | sed 's/^Pokryto: //; s/ — NE celý běh$//')"
  printf '%s%s%s' "${r:-bez souhrnu}" "${ch:+, $ch}" "${c:+ ($c)}"
}

staticke() {
  local chyb=0
  echo "— verze odpovídá dni posledního commitu (vDEN.MĚSÍC.pořadí)"
  python3 build.py --kontrola-verze || chyb=$((chyb + 1))
  echo "— žádné CRLF ve zdrojácích"
  if grep -rlI $'\r' src netlify nastroje .github *.mjs *.sh *.py *.toml 2>/dev/null; then
    echo "CHYBA: soubory výš mají CRLF — spusťte 'git add --renormalize .' a commitněte."; chyb=$((chyb + 1))
  else echo "Konce řádků v pořádku (LF)."; fi
  echo "— osobní údaje a tajemství (nastroje/kontrola_udaju.py, povolený seznam nastroje/povolene_kontakty.txt)"
  python3 nastroje/kontrola_udaju.py || chyb=$((chyb + 1))
  echo "— výběr sloučených větví ke smazání (nastroje/test_sloucene_vetve.sh, W2)"
  bash nastroje/test_sloucene_vetve.sh || chyb=$((chyb + 1))
  echo "— hook pre-push s kontrolou údajů (nastroje/test_pre_push.sh, SEC-M1 #542)"
  bash nastroje/test_pre_push.sh || chyb=$((chyb + 1))
  echo "— nástroj porovnání sestavení (nastroje/test_porovnej_sestaveni.sh, S3)"
  bash nastroje/test_porovnej_sestaveni.sh || chyb=$((chyb + 1))
  echo "— únik mezi zákazníky: generátory dokumentů bez dalsiZakaznici (nastroje/kontrola_vz_unik.sh, VZ-E2 #601)"
  { bash nastroje/kontrola_vz_unik.sh && bash nastroje/kontrola_vz_unik.sh --pojistka; } || chyb=$((chyb + 1))
  echo "— přeskočení v kole je vidět: playwright, PRESKOCENO_CAST (nastroje/test_kolo_preskoceni.sh, HN)"
  bash nastroje/test_kolo_preskoceni.sh || chyb=$((chyb + 1))
  echo "— startovní podklady: PREDAVKA.md do 15 kB, main předkem HEAD (nastroje/kontrola_podkladu.sh, S7)"
  { bash nastroje/kontrola_podkladu.sh && bash nastroje/kontrola_podkladu.sh --pojistka; } || chyb=$((chyb + 1))
  echo "— evidence a přehled: roadmap.json podle schématu S6, PREHLED.md jde vyrobit a odpovídá stavu (S6/S8 #613)"
  { python3 roadmapa/roadmapa.py --kontrola && python3 nastroje/prehled_stavu.py --kontrola; } || chyb=$((chyb + 1))
  echo "— značky konfliktu ve sledovaných souborech (nastroje/kontrola_konfliktu.sh, #706)"
  { bash nastroje/kontrola_konfliktu.sh && bash nastroje/kontrola_konfliktu.sh --pojistka; } || chyb=$((chyb + 1))
  echo "STATICKE_KONTROLY: $((11 - chyb)) z 11 prošly"
  return "$chyb"
}
# S3 (18. 11. 2026): pevná sada kalkulací nad <ref> × pracovní kopie (.).
porovnani() {
  local a=("$PROTI" .)
  [ -n "${KNG_POROVNANI_OCEKAVANE:-}" ] && a+=(--ocekavane "$KNG_POROVNANI_OCEKAVANE")
  bash nastroje/porovnej_sestaveni.sh "${a[@]}"
}
poznamka_porovnani() {
  local r; r="$(grep -o '^POROVNANI: .*' "$1" | tail -1 | sed 's/^POROVNANI: //')"
  printf '%s' "${r:+proti $PROTI: $r}"; [ -n "$r" ] || printf 'proti %s: bez souhrnu' "$PROTI"
}
poznamka_staticke() { grep -o 'STATICKE_KONTROLY: [0-9]* z [0-9]* prošly' "$1" | tail -1 | sed 's/^STATICKE_KONTROLY: //'; }

# ---------- prohlížečové harnessy potřebují playwright (HN, 21. 11. 2026) ----------
# Koordinace 19. 11.: kolo hlásilo VŠE ZELENÉ, i když bez node_modules/playwright
# přeskočilo 58 harnessů — přeskočené byly vidět jen v seznamu pod souhrnem.
# Teď se to pozná HNED na začátku (žádných 20 minut zbytečných sad) a kolo
# skončí chybou s návodem. Vědomý běh bez prohlížeče: KNG_BEZ_PROHLIZECE=1 —
# pak výsledek zní „ZELENÁ BEZ PROHLÍŽEČE", nikdy „VŠE ZELENÉ".
NAVOD_PLAYWRIGHT="Návod: v kořeni repozitáře  mkdir -p node_modules && ln -sfn \"\$(npm root -g)/playwright\" node_modules/playwright
  (v cloudovém sezení: ln -sfn /opt/node-tools/node_modules/playwright node_modules/playwright; necommitovat),
  nebo npm i playwright. Vědomě bez prohlížeče: KNG_BEZ_PROHLIZECE=1 (výsledek pak zní „ZELENÁ BEZ PROHLÍŽEČE“)."
playwright_chybi() {
  case "${KNG_KOLO_PLAYWRIGHT:-}" in chybi) return 0 ;; je) return 1 ;; esac
  ! node -e "import('playwright').then(() => process.exit(0), () => process.exit(1))" >/dev/null 2>&1
}
bez_prohlizece=0
if chce sady && playwright_chybi; then
  if [ "${KNG_BEZ_PROHLIZECE:-}" = "1" ]; then
    bez_prohlizece=1
    echo "UPOZORNĚNÍ: playwright se nenačetl — prohlížečové harnessy se přeskočí (KNG_BEZ_PROHLIZECE=1)."
  else
    echo "CHYBA: playwright se z kořene repozitáře nenačte — prohlížečové harnessy (overit_*.mjs) by se přeskočily"
    echo "  a kolo by NIC v prohlížeči neověřilo."
    echo "  $NAVOD_PLAYWRIGHT"
    exit 2
  fi
fi

# ---------- běh ----------
echo "TESTOVACÍ KOLO — kroky: $KROKY   (logy: $LOGY)"
chce build         && krok build         "kontrola verze + sestavení"         build
chce sady          && krok sady          "sady: Node, server, prohlížeč"       sady
chce hodiny        && krok hodiny        "sady s hodinami +400 dní"            hodiny
chce mutace-jadro  && krok mutace_jadro  "mutace jádra (mutace_jadro.mjs)"     mutace_jadro
chce mutace-server && krok mutace_server "mutace serveru (netlify/mutace.mjs)" mutace_server
chce staticke      && krok staticke      "statické kontroly"                   staticke
chce porovnani     && krok porovnani     "porovnání sestavení (S3)"            porovnani
for k in build sady hodiny mutace-jadro mutace-server staticke porovnani; do
  chce "$k" || souhrn+=("  – $(printf '%-34s' "$k") vynecháno (kroky: $KROKY)")
done

# ---------- souhrn ----------
while IFS= read -r l; do [ -n "$l" ] && preskocene+=("$l"); done < <(preskocene_ze_sady "$LOGY/sady.log")
echo; echo "════════════════════════════════════════════════════════════"
echo "TESTOVACÍ KOLO — souhrn (celkem $(cas $(( $(date +%s) - zacatek ))))"
printf '%s\n' "${souhrn[@]}"
if [ "${#preskocene[@]}" -gt 0 ]; then
  echo "Přeskočené sady (nic neověřily):"
  printf '  – %s\n' "${preskocene[@]}"
  # V GitHub Actions i jako upozornění běhu (T3, revize v22.9.9): přeskočená
  # kontrola, o které se mlčí, je totéž co kontrola, která neexistuje.
  if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
    echo "::warning title=Přeskočené sady (nic neověřily)::${preskocene[*]}"
  fi
fi
# Harnessy přeskočené pro chybějící playwright: bez KNG_BEZ_PROHLIZECE=1 je to
# selhání kola (i kdyby kontrola na začátku playwright našla a harness ho přesto
# nenačetl), s ním jen „ZELENÁ BEZ PROHLÍŽEČE".
bez_pw=0
for l in "${preskocene[@]}"; do case "$l" in *"(chybí playwright)"*) bez_pw=$((bez_pw + 1)) ;; esac; done
if [ "$bez_pw" -gt 0 ]; then
  if [ "${KNG_BEZ_PROHLIZECE:-}" = "1" ]; then bez_prohlizece=1
  else
    selhalo=$((selhalo + 1))
    echo "✗ $bez_pw prohlížečových harnessů se přeskočilo pro chybějící playwright — kolo NENÍ zelené."
    echo "  $NAVOD_PLAYWRIGHT"
  fi
fi
cast_mutaci=""
if { chce mutace-jadro || chce mutace-server; } && [ -n "${KNG_MUTACE_CAST:-}${KNG_MUTACE_OD:-}" ]; then
  cast_mutaci="${KNG_MUTACE_CAST:+část $KNG_MUTACE_CAST}${KNG_MUTACE_CAST:+${KNG_MUTACE_OD:+, }}${KNG_MUTACE_OD:+od $KNG_MUTACE_OD.}"
fi
if [ "$selhalo" -eq 0 ] && [ -n "$cast_mutaci" ]; then
  echo "Výsledek: ZELENÁ ČÁST (mutace: $cast_mutaci) — ne celé kolo."
elif [ "$selhalo" -eq 0 ] && [ "$bez_prohlizece" -eq 1 ]; then
  echo "Výsledek: ZELENÁ BEZ PROHLÍŽEČE (KNG_BEZ_PROHLIZECE=1, přeskočeno harnessů: $bez_pw) — ne celé kolo."
elif [ "$selhalo" -eq 0 ]; then
  echo "Výsledek: VŠE ZELENÉ."
else
  echo "Výsledek: SELHALO ($selhalo z kroků). Nic nenahrávat, dokud není zeleno."
fi
exit "$selhalo"
