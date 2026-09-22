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
#                       (přihlášení, zámek čtení, ukládání, ceník online),
#   – a všechny ostatní harnessy, které pouští CI (lišta, ATYP, PROJ, matice
#     zobrazení, celá cesta OCK…) — seznam je záměrně shodný s workflow, viz
#     poznámku u jejich spuštění níž.
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
    seznam_preskocenych+=("$f (chybí skutečný ceník)")
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
  preskoceno=$((preskoceno + 1)); seznam_preskocenych+=("test.js (není v exportu pro GitHub – shoda s Excelem neověřena)")
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

# Samotný mutační běh tu schválně není (viz výš), ale RYCHLÁ KONTROLA ZADÁNÍ
# ano: za vteřinu ověří, že každá mutace svůj úsek v kódu vůbec najde.
# Bez ní se změněný řádek pozná až po sedmnácti minutách v CI — a je to
# přitom chyba v zadání mutace, ne v kódu (22. 9. 2026, dávka 4).
if ( cd .. && node netlify/mutace.mjs --kontrola ) > /tmp/kng_mutace_kontrola.txt 2>&1; then
  proslo=$((proslo + 1)); printf '  ✓ %s\n' "zadání mutací sedí na kód"
else
  selhalo=$((selhalo + 1)); seznam_selhani+=("zadání mutací"); printf '  ✗ %s\n' "zadání mutací nesedí na kód"
  sed 's/^/      /' /tmp/kng_mutace_kontrola.txt
fi

# Sada v prohlížeči: běží z kořene (harnessy si dist/ hledají odtud), s
# NODE_PATH kvůli globálně instalovanému playwrightu (platí jen pro require;
# harnessy s `import` potřebují místní node_modules/playwright). Návratový
# kód 2 = sada sama hlásí, že playwright chybí, 4 = chybí firemní podklad —
# ani jedno není selhání kódu; obojí se počítá jako PŘESKOČENO (viz níž).
# Roadmapa se před prohlížečovými sadami VYGENERUJE (22. 9. 2026). Stránka
# je výstup a v repozitáři není, takže `overit_roadmapu.mjs` se do dneška
# vždycky jen přeskočil — třináct kontrol, které nikdy neběžely. Generátor
# je od 22. 9. v repozitáři, takže si je sada umí vyrobit sama.
if [ -f ../roadmapa/roadmapa.py ]; then
  ( cd .. && python3 roadmapa/roadmapa.py ) > /tmp/kng_roadmapa.txt 2>&1 \
    || { echo "  – roadmapa se nevygenerovala (harness ji přeskočí):"; sed 's/^/      /' /tmp/kng_roadmapa.txt; }
fi

# PŘESKOČENÍ SE POČÍTÁ ZVLÁŠŤ A S DŮVODEM (nálezy T3 a T5 revize v22.9.9).
# Do 22. 9. se harness bez firemního podkladu hlásil jako „✓ prošlo" (končil
# kódem 0), kód 2 se nepočítal nikam a harness, který playwright importuje
# (ESM), bez místního node_modules/playwright padal jako „✗ selhalo" s radou
# „npm i -g", která mu nepomůže — `import` proměnnou NODE_PATH nečte.
#   0 = prošlo · 4 = chybí firemní podklad (nastroje/harness_podklady.mjs)
#   2 nebo ERR_MODULE_NOT_FOUND u playwrightu = chybí playwright
spust_prohlizec() {
  local f="$1"
  ( cd .. && NODE_PATH="$(npm root -g 2>/dev/null)" node "$f" ) > /tmp/kng_prohlizec_out.txt 2>&1
  local kod=$?
  if [ "$kod" -ne 0 ] && [ "$kod" -ne 4 ] \
     && grep -q "ERR_MODULE_NOT_FOUND" /tmp/kng_prohlizec_out.txt \
     && grep -q "'playwright'" /tmp/kng_prohlizec_out.txt; then
    kod=2
  fi
  if [ "$kod" -eq 0 ]; then
    proslo=$((proslo + 1)); printf '  ✓ %s\n' "$f"
  elif [ "$kod" -eq 4 ]; then
    preskoceno=$((preskoceno + 1)); seznam_preskocenych+=("$f (chybí firemní podklad – KNG_PODKLADY)")
    printf '  – %s (přeskočeno: chybí firemní podklad mimo repozitář – KNG_PODKLADY=/cesta)\n' "$f"
  elif [ "$kod" -eq 2 ]; then
    preskoceno=$((preskoceno + 1)); seznam_preskocenych+=("$f (chybí playwright)")
    printf '  – %s (přeskočeno: playwright se nenačetl – v kořeni: npm i playwright)\n' "$f"
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
    # VŠECHNY HARNESSY, ŽÁDNÝ RUČNÍ SEZNAM (N16, 22. 9. 2026).
    #
    # Do 21. 9. tu byl výčet čtyř harnessů, zatímco CI jich pouštělo deset —
    # dvě různé sady. Pak se srovnaly, ale oba seznamy zůstaly RUČNÍ a v CI
    # jich bylo deset z třiceti sedmi. Právě ve zbylých dvaceti sedmi vyšly
    # nálezy N12, N13 i N14: ruční přirážka se po znovuotevření zakázky
    # změní, rozdělaná zakázka se po F5 neotevře, uzamčená varianta ztrácí
    # značku. Osm dní to nikdo neviděl, protože ty sady nikde neběžely.
    #
    # Ruční seznam se dřív nebo později rozejde znovu. Proto se harnessy
    # NEVYPISUJÍ — berou se globem, takže nový soubor `overit_*.mjs` je
    # v sadě automaticky, tady i v CI (workflow pouští týž glob).
    #
    # Harness, který potřebuje firemní dokument mimo repozitář (šablony,
    # příručka), se sám přeskočí s vysvětlením a skončí kódem 4 (do 22. 9.
    # kódem 0, takže se hlásil jako „prošlo") — viz nastroje/harness_podklady.mjs.
    #
    # Kouřový test jde PRVNÍ: když sestavení nenastartuje, ostatní harnessy
    # by padaly na každém kroku a zahalily by tu jedinou podstatnou zprávu.
    spust_prohlizec smoke.mjs
    for f in ../overit_*.mjs; do
      [ -e "$f" ] || continue
      spust_prohlizec "$(basename "$f")"
    done
  fi
fi

echo
echo "Souhrn: $proslo prošlo, $selhalo selhalo, $preskoceno přeskočeno (celkem $((proslo + selhalo + preskoceno)) sad)."
if [ "$preskoceno" -gt 0 ]; then
  echo "Přeskočeno (nic neověřily):"
  printf '  – %s\n' "${seznam_preskocenych[@]}"
fi
if [ "$selhalo" -gt 0 ]; then
  echo "Selhalo: ${seznam_selhani[*]}"
  exit 1
fi
if [ "$preskoceno" -gt 0 ]; then
  case "$preskoceno" in
    1) sady="1 sada se přeskočila" ;;
    2|3|4) sady="$preskoceno sady se přeskočily" ;;
    *) sady="$preskoceno sad se přeskočilo" ;;
  esac
  echo "Vše v pořádku – můžete sestavit build (python3 build.py). Pozor: $sady (viz výš)."
else
  echo "Vše v pořádku – můžete sestavit build (python3 build.py)."
fi
