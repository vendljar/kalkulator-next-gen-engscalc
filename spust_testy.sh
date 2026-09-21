#!/usr/bin/env bash
# Spustí VŠECHNY testovací sady a vypíše souhrn.
#
# Proč existuje tenhle skript a nestačí jednořádkový příkaz:
# dřív se v návodu psalo `for f in src/test_*.js; do node "$f"; done`. Ten glob
# ale MÍJÍ soubor `src/test.js` – tedy 41 testů shody s Excelem, právě tu sadu,
# která hlídá, že se výsledky kalkulace nerozejdou se šablonou VZOR. Rozbití
# jádra tak mohlo projít „zelenými" testy. Skript proto pouští test.js zvlášť
# a k tomu všechno ostatní, co odpovídá test_*.js – nové sady se přidají samy.
#
# Použití:  ./spust_testy.sh          (z kořene archivu)
#           ./spust_testy.sh --smoke  (navíc sady v prohlížeči, viz níž)
# Návratový kód 0 = všechno prošlo.
#
# Sady v prohlížeči (--smoke) otevřou sestavený dist/kalkulacka.html v Chromiu
# a ověří to, co Node sady nevidí:
#   – smoke.mjs         že bundle vůbec nastartuje (pořadí souborů, TDZ,
#                       překlep v inline onclick, výjimka při prvním render),
#   – overit_online.mjs skutečný klient proti skutečným serverovým funkcím
#                       (přihlášení, zámek čtení, ukládání, ceník online).
# Jsou dobrovolné, protože potřebují playwright a hotový build; bez něj by
# skript hlásil chybu i tam, kde jde jen o změnu v jádře.
#
# PROČ JE TU overit_online.mjs (21. 9. 2026, pokyn J. V.): v jediné dávce
# odhalil prohlížeč DVĚ chyby, které Node sady chytit nemohly — aplikace se
# kvůli dočasné mrtvé zóně vůbec nespouštěla a tlačítko uložení bylo v režimu
# čtení mrtvé. Obojí se poznalo až v CI. Sedm běhů předtím se tenhle harness
# navíc vůbec nespouštěl, protože padal kouřový test před ním. Ať se na něj
# nečeká až do CI.

set -u

# Adresa hlavního správce se bere z prostředí (repozitář je veřejný, do kódu
# nepatří). Testům stačí SMYŠLENÁ — ověřují pravidla, ne konkrétní účet —
# a CI ji tak nastavuje (.github/workflows/testy.yml). Bez ní serverové sady
# padají na „Nepřihlášen" a overit_online.mjs na nesrozumitelný timeout
# přihlášení, což vypadá jako rozbitý kód. Vlastní hodnota z prostředí má
# přednost; doplňuje se jen, když chybí.
: "${ADMIN_EMAIL:=spravce@priklad.cz}"
export ADMIN_EMAIL

cd "$(dirname "$0")/src" || exit 1

selhalo=0
proslo=0
preskoceno=0
seznam_selhani=()
seznam_preskocenych=()

# Návratový kód 3 = sada se PŘESKOČILA, protože potřebuje skutečný ceník,
# který v repozitáři záměrně není (viz src/zkusebni_data.js). Není to chyba
# kódu, takže se to nepočítá jako selhání – ale ani jako „prošlo", aby se
# nezdálo, že shodu s Excelem někdo ověřil.
spust() {
  local f="$1"
  node "$f" > /tmp/kng_test_out.txt 2>&1
  local kod=$?
  if [ "$kod" -eq 0 ]; then
    proslo=$((proslo + 1))
    printf '  ✓ %s\n' "$f"
  elif [ "$kod" -eq 3 ]; then
    preskoceno=$((preskoceno + 1))
    seznam_preskocenych+=("$f")
    printf '  – %s (přeskočeno – chybí skutečný ceník)\n' "$f"
  else
    selhalo=$((selhalo + 1))
    seznam_selhani+=("$f")
    printf '  ✗ %s\n' "$f"
    sed 's/^/      /' /tmp/kng_test_out.txt
  fi
}

echo "Testy jádra (shoda s Excelem):"
if [ -e test.js ]; then
  spust test.js
else
  # Export pro GitHub (pripravit_github.py) test.js nepřikládá – porovnává se
  # šablonou VZOR se skutečnými čísly. Bez něj se shoda s Excelem NEOVĚŘILA;
  # hlásí se to jako přeskočení, ne jako pád (CI 7. 9. 2026).
  preskoceno=$((preskoceno + 1)); seznam_preskocenych+=("test.js")
  printf '  – %s (přeskočeno – není v exportu pro GitHub)\n' "test.js"
fi

echo "Ostatní sady:"
for f in test_*.js; do
  [ -e "$f" ] || continue
  spust "$f"
done

# Serverové sady (netlify/test_*.mjs) běží proti náhradnímu úložišti v paměti
# a náhradnímu `fetch`, takže nepotřebují ani Netlify, ani síť. Do 9. 8. 2026
# se pouštěly ručně — a nová sada se tím pádem mohla klidně měsíc nespustit.
# Mutační testování (netlify/mutace.mjs) tu schválně NENÍ: trvá přes minutu
# a pouští tyhle sady znovu, takže patří do samostatného běhu.
echo "Serverové sady (online databáze a napojení na CRM):"
for f in ../netlify/test_*.mjs; do
  [ -e "$f" ] || continue
  spust "$f"
done

# Sada v prohlížeči: běží z kořene (harnessy si dist/ hledají odtud), s
# NODE_PATH kvůli globálně instalovanému playwrightu. Návratový kód 2 = sada
# sama hlásí, že playwright chybí — není to selhání kódu, jen se přeskočí.
spust_prohlizec() {
  local f="$1"
  ( cd .. && NODE_PATH="$(npm root -g 2>/dev/null)" node "$f" ) > /tmp/kng_prohlizec_out.txt 2>&1
  local kod=$?
  if [ "$kod" -eq 0 ]; then
    proslo=$((proslo + 1)); printf '  ✓ %s\n' "$f"
  elif [ "$kod" -eq 2 ]; then
    printf '  – %s (přeskočeno: playwright není nainstalovaný – npm i -g playwright)\n' "$f"
  else
    selhalo=$((selhalo + 1)); seznam_selhani+=("$f"); printf '  ✗ %s\n' "$f"
    sed 's/^/      /' /tmp/kng_prohlizec_out.txt
  fi
}

if [ "${1:-}" = "--smoke" ]; then
  echo "Sady v prohlížeči:"
  if [ ! -f ../dist/kalkulacka.html ]; then
    echo "  – přeskočeno: chybí dist/kalkulacka.html (spusťte python3 build.py)"
  else
    # Nejdřív kouřový test: když bundle nenastartuje, overit_online.mjs by
    # padal na každém kroku a zahalil by tu jedinou podstatnou zprávu.
    spust_prohlizec smoke.mjs
    spust_prohlizec overit_online.mjs
  fi
fi

echo
echo "Souhrn: $proslo prošlo, $selhalo selhalo, $preskoceno přeskočeno (celkem $((proslo + selhalo + preskoceno)) sad)."
if [ "$preskoceno" -gt 0 ]; then
  echo "Přeskočeno: ${seznam_preskocenych[*]}"
  echo "  (potřebují skutečný ceník mimo repozitář – návod vypíše sada sama)"
fi
if [ "$selhalo" -gt 0 ]; then
  echo "Selhalo: ${seznam_selhani[*]}"
  exit 1
fi
echo "Vše v pořádku – můžete sestavit build (python3 build.py)."
