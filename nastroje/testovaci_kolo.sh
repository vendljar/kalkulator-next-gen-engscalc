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
# hlásí jako PŘESKOČENÉ, nikdy jako prošlé.
#
# Pořadí kroků:
#   build          sestavení bez zvýšení verze (KNG_NEZVYSOVAT_VERZI=1 python3 build.py)
#   sady           spust_testy.sh --smoke: všechny src/test_*.js (včetně test.js),
#                  všechny netlify/test_*.mjs, rychlé kontroly zadání mutací,
#                  smoke.mjs a VŠECHNY overit_*.mjs — globem, žádný ruční seznam
#   mutace-jadro   mutace_jadro.mjs (výpočetní jádro)
#   mutace-server  netlify/mutace.mjs (serverové funkce)
#   staticke       verze = den posledního commitu, žádné CRLF, osobní údaje
#                  a tajemství mimo povolený seznam (nastroje/kontrola_udaju.py)
#
# Použití:
#   bash nastroje/testovaci_kolo.sh                    celé kolo (mutace trvají dohromady kolem 40 minut)
#   bash nastroje/testovaci_kolo.sh --bez-mutaci       bez mutací (dávka, která nesáhla do jádra ani serveru)
#   bash nastroje/testovaci_kolo.sh --jen mutace-server,staticke   jen vybrané kroky
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

KROKY="build,sady,mutace-jadro,mutace-server,staticke"
while [ $# -gt 0 ]; do
  case "$1" in
    --bez-mutaci) KROKY="build,sady,staticke" ;;
    --jen) shift; KROKY="${1:-}" ;;
    --jen=*) KROKY="${1#--jen=}" ;;
    -h|--help) sed -n '2,32p' "$0"; exit 0 ;;
    *) echo "neznámá volba: $1 (viz --help)"; exit 2 ;;
  esac
  shift
done
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
build() { KNG_NEZVYSOVAT_VERZI=1 python3 build.py; }

sady() { bash ./spust_testy.sh --smoke; }
poznamka_sady() {
  local r; r="$(grep -o 'Souhrn: [0-9]* prošlo, [0-9]* selhalo, [0-9]* přeskočeno' "$1" | tail -1 | sed 's/^Souhrn: //')"
  # přeskočené sady (nic neověřily) do závěru
  local v=0 l
  while IFS= read -r l; do
    if [ "$v" -eq 1 ]; then
      case "$l" in "  – "*) preskocene+=("${l#  – }") ;; *) v=0 ;; esac
    fi
    [ "$l" = "Přeskočeno (nic neověřily):" ] && v=1
  done < "$1"
  printf '%s' "${r:-bez souhrnu}"
}

mutace_jadro() { node mutace_jadro.mjs; }
poznamka_mutace_jadro() { grep -o 'Chycených [0-9]* z [0-9]*' "$1" | tail -1 | sed 's/^Chycených/chycených/'; }

mutace_server() { node netlify/mutace.mjs; }
poznamka_mutace_server() {
  local r; r="$(grep -o 'Chycených [0-9]* z [0-9]*' "$1" | tail -1 | sed 's/^Chycených/chycených/')"
  local ch; ch="$(grep -o 'chybně zadaných mutací: [0-9]*' "$1" | tail -1)"
  printf '%s%s' "${r:-bez souhrnu}" "${ch:+, $ch}"
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
  echo "STATICKE_KONTROLY: $((3 - chyb)) z 3 prošly"
  return "$chyb"
}
poznamka_staticke() { grep -o 'STATICKE_KONTROLY: [0-9]* z 3 prošly' "$1" | tail -1 | sed 's/^STATICKE_KONTROLY: //'; }

# ---------- běh ----------
echo "TESTOVACÍ KOLO — kroky: $KROKY   (logy: $LOGY)"
chce build         && krok build         "sestavení (bez zvýšení verze)"      build
chce sady          && krok sady          "sady: Node, server, prohlížeč"       sady
chce mutace-jadro  && krok mutace_jadro  "mutace jádra (mutace_jadro.mjs)"     mutace_jadro
chce mutace-server && krok mutace_server "mutace serveru (netlify/mutace.mjs)" mutace_server
chce staticke      && krok staticke      "statické kontroly"                   staticke
for k in build sady mutace-jadro mutace-server staticke; do
  chce "$k" || souhrn+=("  – $(printf '%-34s' "$k") vynecháno (kroky: $KROKY)")
done

# ---------- souhrn ----------
echo; echo "════════════════════════════════════════════════════════════"
echo "TESTOVACÍ KOLO — souhrn (celkem $(cas $(( $(date +%s) - zacatek ))))"
printf '%s\n' "${souhrn[@]}"
if [ "${#preskocene[@]}" -gt 0 ]; then
  echo "Přeskočené sady (nic neověřily):"
  printf '  – %s\n' "${preskocene[@]}"
fi
if [ "$selhalo" -eq 0 ]; then
  echo "Výsledek: VŠE ZELENÉ."
else
  echo "Výsledek: SELHALO ($selhalo z kroků). Nic nenahrávat, dokud není zeleno."
fi
exit "$selhalo"
