#!/usr/bin/env bash
# Vytiskne hotovou příručku do PDF.
#
# PROČ CHROME
# Na stroji není Node, Python ani nic jiného, co by umělo PDF (stav 17. 9. 2026).
# Chrome ale nainstalovaný je a umí tisknout z příkazové řádky — a co je
# důležitější, je to TÝŽ vykreslovač, kterým příručku uvidí obchodník.
# PDF z něj tedy vypadá přesně jako HTML, ne jako jeho převyprávění.
#
# PROČ SE TISKNE KOPIE UVNITŘ PROJEKTU
# Chrome pouští JavaScript z `file://` jen v adresáři, který sám považuje za
# bezpečný. Příručka se vykresluje z JSONu skriptem, takže bez běžícího
# JavaScriptu by z ní vypadla prázdná stránka. Tiskne se proto kopie
# `manual/nahled.html`, kterou `sestav.sh` vedle výstupu nechává.
#
#   ./do_pdf.sh [vstup.html] [vystup.pdf]
set -euo pipefail

KDE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VYSTUP_VYCHOZI="G:/Můj disk/_Soukrome/_Dokumenty/_AI/Claude/Projekty/Kalkulator NextGen Eng/Manual"

VSTUP="${1:-$KDE/nahled.html}"
[ -f "$VSTUP" ] || { echo "CHYBA: chybí $VSTUP (spusťte nejdřív sestav.sh)" >&2; exit 1; }

if [ $# -ge 2 ]; then
  CIL="$2"
else
  # Jméno se odvozuje od hotového HTML, aby PDF a HTML nemohly nést jinou verzi.
  HTML="$(ls -t "$VYSTUP_VYCHOZI"/*_MANUAL_OBCHODNIK.html 2>/dev/null | head -1)"
  [ -n "$HTML" ] || { echo "CHYBA: ve složce Manual není žádná hotová příručka." >&2; exit 1; }
  CIL="${HTML%.html}.pdf"
fi

CHROME=""
for p in "/c/Program Files/Google/Chrome/Application/chrome.exe" \
         "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" \
         "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
         "/c/Program Files/Microsoft/Edge/Application/msedge.exe"; do
  [ -f "$p" ] && { CHROME="$p"; break; }
done
[ -n "$CHROME" ] || { echo "CHYBA: nenašel jsem Chrome ani Edge." >&2; exit 1; }

# Windows cesta pro file:// — Chrome nezná tvar `/c/…`, který používá Git Bash,
# a v adrese neunese nezakódované mezery.
#
# POZOR na `A && B || C` (chyba 17. 9. 2026): operátory se vyhodnocují zleva
# doprava se stejnou prioritou, takže když B uspěje, spustí se ještě C — a do
# proměnné spadly obě cesty pod sebou. Proto se tu větví přes `if`, ne řetězem.
if command -v cygpath >/dev/null 2>&1; then
  WINPATH="$(cygpath -m "$VSTUP")"
else
  WINPATH="$(printf '%s' "$VSTUP" | sed -E 's|^/([a-zA-Z])/|\1:/|')"
fi
URL="file:///${WINPATH// /%20}"

# --virtual-time-budget: příručka se vykresluje ze zapečeného JSONu, takže se
# musí počkat, než skript doběhne. Bez toho vyjede prázdná stránka.
# --window-size je tu schválně na šířku tiskové plochy A4 (794 px mínus okraje
# 2×12 mm). Snímky se totiž zmenšují JavaScriptem podle šířky, kterou mají
# v okamžiku vykreslení — a ta je ve výchozím okně 800 px, tedy širší než
# papír. Příručka se sice přepočítá ještě na `beforeprint`, ale spoléhat se na
# to nemusíme: když se rovnou vykreslí na šířku papíru, vyjde to i bez toho.
"$CHROME" --headless --disable-gpu --no-sandbox \
  --window-size=704,1200 \
  --virtual-time-budget=30000 \
  --no-pdf-header-footer --print-to-pdf-no-header \
  --print-to-pdf="$CIL" "$URL" 2>/dev/null || true

[ -f "$CIL" ] || { echo "CHYBA: PDF nevzniklo." >&2; exit 1; }
VEL="$(wc -c < "$CIL" | tr -d ' ')"

# Počet stran se nedá spočítat hledáním `/Type /Page`: Chrome objekty
# komprimuje a v souboru takový text není (17. 9. 2026). Použitelný je strom
# stran — jeho KOŘEN nese celkový počet, vnořené uzly dílčí. Bere se tedy
# největší nalezená hodnota `/Count`.
STRAN="$(grep -a -o '/Count [0-9]*' "$CIL" | grep -o '[0-9]*' | sort -n | tail -1)"
STRAN="${STRAN:-0}"

echo "Hotovo: $CIL"
echo "        $((VEL / 1024)) kB, $STRAN stran"

# Když nedoběhne JavaScript, vyjede pár stran textu bez snímků — a to je
# horší než žádné PDF, protože to vypadá hotově.
if [ "$STRAN" -lt 10 ] || [ "$VEL" -lt 150000 ]; then
  echo "POZOR:  příručka je podezřele malá — nedoběhl v ní JavaScript?" >&2
  exit 1
fi
if ! head -c 5 "$CIL" | grep -q '%PDF'; then
  echo "CHYBA:  výsledek není PDF." >&2
  exit 1
fi
