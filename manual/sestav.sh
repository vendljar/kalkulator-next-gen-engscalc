#!/usr/bin/env bash
# Sestaví příručku obchodníka do jednoho souboru.
#
# PROČ SHELL A NE SKRIPT V NODE
# Na počítači, kde se příručka vyrábí, není Node ani Python (stav 17. 9. 2026).
# Celé sestavení je přitom jen vložení dvou JSONů do šablony, na to stačí awk.
#
#   ./sestav.sh [cesta_ke_snimky.json] [vystupni_slozka]
#
# Výchozí vstup i výstup je složka Manual na sdíleném disku — hotová příručka
# se do repozitáře NEUKLÁDÁ (rozhodnuto 17. 9. 2026): nese snímky cenové
# kalkulace a v historii Gitu by zůstala napořád.
set -euo pipefail

KDE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VYSTUP_VYCHOZI="G:/Můj disk/_Soukrome/_Dokumenty/_AI/Claude/Projekty/Kalkulator NextGen Eng/Manual"
SNIMKY="${1:-$VYSTUP_VYCHOZI/snimky.json}"
VYSTUP="${2:-$VYSTUP_VYCHOZI}"
SABLONA="$KDE/sablona.html"
OBSAH="$KDE/obsah.json"

for f in "$SABLONA" "$OBSAH" "$SNIMKY"; do
  [ -f "$f" ] || { echo "CHYBA: chybí $f" >&2; exit 1; }
done

# --- verze ---------------------------------------------------------------
# Příručka se hlídá proti verze.txt, ne proti číslu napsanému v obsahu.
# Poučení z 20. 8. 2026: pevně zapsané číslo znamenalo, že zastaralá příručka
# procházela zeleně ještě dva týdny po vydání nové aplikace.
VERZE="$(tr -d ' \r\n' < "$KDE/../verze.txt")"
if ! grep -q "v$VERZE" "$OBSAH"; then
  echo "CHYBA: obsah.json nemluví o aktuální verzi aplikace (v$VERZE)." >&2
  echo "       Buď doplňte, co se ve v$VERZE změnilo, nebo verzi v obsahu opravte." >&2
  exit 1
fi
if ! grep -q "\"verze\":\"Kalkulačka v$VERZE\"" "$SNIMKY"; then
  echo "CHYBA: snímky nejsou z aplikace v$VERZE — přefoťte je." >&2
  echo "       Snímky z jiné verze vedou obchodníka ke klikání, které nikam nevede." >&2
  exit 1
fi

# --- prostředí -----------------------------------------------------------
# Snímky smějí být VÝHRADNĚ z testovacího webu. Ostrý web má skutečné
# zakázky zákazníků; jednou se to už stalo (29. 7. 2026), proto je to tady
# tvrdá zastávka, ne varování.
if ! grep -q '"prostredi":"test"' "$SNIMKY"; then
  echo "CHYBA: snímky nejsou z testovacího prostředí. Sestavení zastaveno." >&2
  exit 1
fi

# --- data se nesmějí prát s HTML ----------------------------------------
# Prohlížeč ukončí <script> na sekvenci </script, ne na </div>. Escapovat
# tedy není co — stačí ověřit, že tam ta jediná nebezpečná sekvence není.
for f in "$SNIMKY" "$OBSAH"; do
  if grep -qi '</script' "$f"; then
    echo "CHYBA: $f obsahuje '</script' a rozbil by příručku." >&2
    exit 1
  fi
done

# --- skutečné firmy ------------------------------------------------------
# Hlídač, ne pojistka: pozná běžné právní formy u jmen, která nevypadají
# vymyšleně. Vymyšlená jména mají domluvenou předponu (Ukázk/Vzorov/Modelov/
# Zkušebn/Příkladn), takže projdou.
PODEZRELE="$(grep -o -E '[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][^"<>]{2,40}(a\.s\.|s\.r\.o\.|spol\. s r\.o\.|s\.p\.o\.)' "$SNIMKY" \
  | sort -u | grep -v -E 'Ukázk|Vzorov|Modelov|Zkušebn|Příkladn' || true)"
if [ -n "$PODEZRELE" ]; then
  echo "CHYBA: ve snímcích jsou názvy firem, které nevypadají vymyšleně:" >&2
  echo "$PODEZRELE" >&2
  echo "       Doplňte anonymizaci v manual/snimac.js a přefoťte." >&2
  exit 1
fi

# --- sestavení -----------------------------------------------------------
DATUM="$(date +%Y-%m-%d)"
CIL="$VYSTUP/${DATUM}_kalkulator_v${VERZE}_MANUAL_OBCHODNIK.html"
mkdir -p "$VYSTUP"

awk -v snim="$SNIMKY" -v obs="$OBSAH" '
function vloz(soubor,   radek) {
  while ((getline radek < soubor) > 0) printf "%s", radek
  close(soubor)
}
{
  if (index($0, "__SNIMKY__")) {
    i = index($0, "__SNIMKY__")
    printf "%s", substr($0, 1, i - 1); vloz(snim); print substr($0, i + 10)
  } else if (index($0, "__OBSAH__")) {
    i = index($0, "__OBSAH__")
    printf "%s", substr($0, 1, i - 1); vloz(obs); print substr($0, i + 9)
  } else print
}' "$SABLONA" > "$CIL"

VELIKOST="$(wc -c < "$CIL" | tr -d ' ')"
echo "Hotovo: $CIL"
echo "        $((VELIKOST / 1024)) kB, aplikace v$VERZE"
if [ "$VELIKOST" -gt 8000000 ]; then
  echo "POZOR:  příručka přesáhla 8 MB a nemusí projít e-mailem." >&2
fi
