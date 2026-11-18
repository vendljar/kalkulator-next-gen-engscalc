#!/usr/bin/env bash
# Statická kontrola úniku údajů mezi zákazníky (VZ-E2 #601, návrh § 9 R1,
# PROMPT_VZ_SPOLECNE.md pravidlo 5): generátory dokumentů se tvoří jen
# z pohledu zákazníka (vzTiskPohled) a seznam dalších zákazníků v nich
# nesmí být ani zmíněný. Kontroluje src/nabidka*.js, sod.js, kryci*.js,
# docxgen.js, dokumenty.js, nazvy_souboru.js.
#   bash nastroje/kontrola_vz_unik.sh            kontrola stromu (0 = čisto, 1 = nález)
#   bash nastroje/kontrola_vz_unik.sh --pojistka  doloží, že kontrola nález opravdu chytí
set -u
cd "$(dirname "$0")/.."
SOUBORY=(src/nabidka*.js src/sod.js src/kryci*.js src/docxgen.js src/dokumenty.js src/nazvy_souboru.js)

kontroluj() {   # $1 = kořen stromu
  local koren="$1" nalez=0 f
  for f in "${SOUBORY[@]}"; do
    [ -f "$koren/$f" ] || { echo "CHYBA: chybí $f (prázdná kontrola?)"; return 2; }
    if grep -n 'dalsiZakaznici' "$koren/$f"; then echo "CHYBA: $f zmiňuje dalsiZakaznici (únik R1)"; nalez=1; fi
  done
  return "$nalez"
}

if [ "${1:-}" = "--pojistka" ]; then
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  mkdir -p "$tmp/src"; cp "${SOUBORY[@]}" "$tmp/src/"
  echo "/* zak.dalsiZakaznici */" >> "$tmp/src/sod.js"
  if kontroluj "$tmp" >/dev/null; then echo "POJISTKA SELHALA: podvržený výskyt nenalezen"; exit 1; fi
  echo "Pojistka v pořádku: podvržený výskyt v sod.js nalezen."
  exit 0
fi
if kontroluj .; then echo "Generátory dokumentů dalsiZakaznici nezmiňují (${#SOUBORY[@]} souborů)."; exit 0; fi
exit 1
