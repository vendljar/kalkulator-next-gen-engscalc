#!/usr/bin/env bash
# Sestaví PŘÍRUČKU ADMINISTRÁTORA do jednoho souboru (M8, 27. 10. 2026).
#
# Příručka správce = kapitoly A (manual/admin/obsah.json, snímky ze
# manual/snimky_admin.mjs) + celá příručka obchodníka jako část B
# (manual/obsah.json, snímky ze manual/snimky_auto.mjs). Vykresluje ji TÁŽ
# šablona manual/sablona.html; spojení obou sad dělá v prohlížeči
# manual/admin/spojit.js. Stejně jako manual/sestav.sh jen awk — na počítači,
# kde se příručky vyrábějí, není Node ani Python.
#
#   bash manual/admin/sestav.sh <snimky.json> <snimky_admin.json> <vystupni_slozka>
#
# Hotová příručka se do repozitáře NEUKLÁDÁ (rozhodnutí 17. 9. 2026) a na
# Disk se nenahrává — výstupní složka je povinná a musí ležet mimo repozitář.
set -euo pipefail

KDE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KOREN="$(cd "$KDE/../.." && pwd)"
[ $# -eq 3 ] || { echo "Použití: bash manual/admin/sestav.sh <snimky.json> <snimky_admin.json> <vystupni_slozka>" >&2; exit 2; }
SNIMKY="$1"; SNIMKY_A="$2"; VYSTUP="$3"
SABLONA="$KDE/../sablona.html"
OBSAH="$KDE/../obsah.json"
OBSAH_A="$KDE/obsah.json"
SPOJIT="$KDE/spojit.js"

for f in "$SABLONA" "$OBSAH" "$OBSAH_A" "$SPOJIT" "$SNIMKY" "$SNIMKY_A"; do
  [ -f "$f" ] || { echo "CHYBA: chybí $f" >&2; exit 1; }
done
# Cesta se posuzuje DŘÍV, než se složka založí (jinak by po odmítnutí
# zůstala v repozitáři prázdná složka).
case "$(realpath -m "$VYSTUP")/" in
  "$KOREN"/*) echo "CHYBA: hotová příručka se do repozitáře neukládá — zvolte složku mimo $KOREN" >&2; exit 2 ;;
esac
mkdir -p "$VYSTUP"

# --- verze (jako manual/sestav.sh) ----------------------------------------
VERZE="$(tr -d ' \r\n' < "$KOREN/verze.txt")"
if ! grep -q "\"verze\": \"Platí pro aplikaci v$VERZE " "$OBSAH_A"; then
  echo "CHYBA: řádek „verze\" v manual/admin/obsah.json neříká, že příručka platí pro v$VERZE." >&2
  exit 1
fi
for f in "$OBSAH" "$OBSAH_A"; do
  if grep -qi 'Co je nového' "$f"; then
    echo "CHYBA: $f má sekci „Co je nového\" — příručky ji nemají (#524). Novinky patří do CHANGELOG.md." >&2
    exit 1
  fi
done
for f in "$SNIMKY" "$SNIMKY_A"; do
  if ! grep -q "\"verze\":\"Kalkulačka v$VERZE\"" "$f"; then
    echo "CHYBA: snímky $f nejsou z aplikace v$VERZE — přefoťte je." >&2
    exit 1
  fi
  # Snímky VÝHRADNĚ z testovacího prostředí (ostrý web má skutečné zakázky).
  if ! grep -q '"prostredi":"test"' "$f"; then
    echo "CHYBA: snímky $f nejsou z testovacího prostředí. Sestavení zastaveno." >&2
    exit 1
  fi
done

# --- data se nesmějí prát s HTML ----------------------------------------
for f in "$SNIMKY" "$SNIMKY_A" "$OBSAH" "$OBSAH_A" "$SPOJIT"; do
  if grep -qi '</script' "$f"; then
    echo "CHYBA: $f obsahuje '</script' a rozbil by příručku." >&2
    exit 1
  fi
done

# --- skutečné firmy (jako manual/sestav.sh) ---------------------------------
PODEZRELE="$(cat "$SNIMKY" "$SNIMKY_A" | grep -o -E '[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][^"<>]{2,40}(a\.s\.|s\.r\.o\.|spol\. s r\.o\.|s\.p\.o\.)' \
  | sort -u | grep -v -E 'Ukázk|Vzorov|Modelov|Zkušebn|Příkladn' || true)"
if [ -n "$PODEZRELE" ]; then
  echo "CHYBA: ve snímcích jsou názvy firem, které nevypadají vymyšleně:" >&2
  echo "$PODEZRELE" >&2
  exit 1
fi

# --- sestavení -----------------------------------------------------------
# Datové bloky správce a spojovací skript se vloží hned za blok obsahu
# obchodníka, tedy před renderer; titulek okna se přepíše.
DATUM="$(date +%Y-%m-%d)"
CIL="$VYSTUP/${DATUM}_kalkulator_v${VERZE}_MANUAL_ADMINISTRATOR.html"

awk -v snim="$SNIMKY" -v obs="$OBSAH" -v snimA="$SNIMKY_A" -v obsA="$OBSAH_A" -v spoj="$SPOJIT" '
function vloz(soubor,   radek) {
  while ((getline radek < soubor) > 0) printf "%s\n", radek
  close(soubor)
}
function vlozRadek(soubor,   radek) {
  while ((getline radek < soubor) > 0) printf "%s", radek
  close(soubor)
}
/<title>/ { print "<title>Kalkulátor Next Gen — příručka administrátora</title>"; next }
{
  if (index($0, "__SNIMKY__")) {
    i = index($0, "__SNIMKY__")
    printf "%s", substr($0, 1, i - 1); vlozRadek(snim); print substr($0, i + 10)
  } else if (index($0, "__OBSAH__")) {
    i = index($0, "__OBSAH__")
    printf "%s", substr($0, 1, i - 1); vlozRadek(obs); print substr($0, i + 9)
    printf "<script type=\"application/json\" id=\"data-snimky-admin\">"; vlozRadek(snimA); print "</script>"
    printf "<script type=\"application/json\" id=\"data-obsah-admin\">"; vlozRadek(obsA); print "</script>"
    print "<script>"; vloz(spoj); print "</script>"
  } else print
}' "$SABLONA" > "$CIL"

VELIKOST="$(wc -c < "$CIL" | tr -d ' ')"
echo "Hotovo: $CIL"
echo "        $((VELIKOST / 1024)) kB, aplikace v$VERZE"
if [ "$VELIKOST" -gt 8000000 ]; then
  echo "POZOR:  příručka přesáhla 8 MB a nemusí projít e-mailem." >&2
fi
