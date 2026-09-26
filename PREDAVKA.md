# Předávka — stav k 26. 9. 2026

Na `main`: **v25.9.3** (+ oprava Node), tag `v25.9.3`.
Na `test`: **v25.9.5**. Na `test-draft`: **v25.9.6** (dávka A kola 16).
Na `claude/pensive-curie-s6yzs3` (tohle sezení, nad `test-draft`): **v26.9.1**
— testovací sekvence A1–A5 + opravy B72/P4, B75–B78, N43 (server). Čeká na
pokyn J. V. k přenosu do `test-draft` (fast-forward) a dál.
Roadmapa: `roadmapa/roadmap.json` (365 položek), stránka se generuje
`python3 roadmapa/roadmapa.py`.

## Hotovo v26.9.1 — roadmapa #364 (podrobně CHANGELOG.md)
- **Pravidlo 0:** B69, B70, B71, B73, B74, N43 (klient), N44, N45, N47–N57
  už byly opravené (v24.9.4–v25.9.5) — přeskočeno. **N46 neopraveno** (bez
  pokynu J. V.; fuzz ho hlásí jen jako INFO).
- **Opraveno:** N43 na serveru (`jadro_moduly.cjs` + kryci, kryci_proj,
  poznamky, protokol), B72/P4 (`netlify/lib/zakazka_kontrola.mjs` — jedna
  kontrola pro uložení i obnovu; #342 hotovo), B75–B78 (přihlášení jako
  celek; část #345 — zbývá B80, B81, B83, B88).
- **Nové testy:** A1 `src/test_fuzz_invarianty.js`, A2 hlídač členů
  v `src/test_escape.js` + obecný oddíl v `overit_xss.mjs` (207 kontrol),
  A3 `src/test_zamek_historie.js` + `src/fixtury/*.json`, A4
  `nastroje/kontrola_udaju.py` + `nastroje/povolene_kontakty.txt`, A5
  `nastroje/testovaci_kolo.sh` (pred_pushem.sh = obal, CI volá tentýž
  skript), `netlify/test_prihlaseni.mjs`, +9 testů B72, +14 mutací serveru.
  U každého je v commitu doloženo selhání před opravou.
- **Ověřeno celým kolem:** OVERENO_DOPLNIT

## Čeká na J. V. (rozhodnutí)
- **N46** (nástupiště A ↔ C u zrcadlové šachty, #343 „ověřit s J. V."): fuzz
  I8a/I8b hlásí rozdíly jen jako INFO; oprava až na pokyn.
- **#365 (nález A2-1):** zakázka s rozměrem profilu mimo tabulku JEKLY shodí
  vykreslení Kalkulace i Detailu OCK (`JEKLY[p.dim].kg` v `ui/kalk_ock.js`);
  opravit v UI, na serveru, nebo nechat?
- **Telefon a jméno kolegy** v `overit_nabidka_proj_word.mjs` (kontrola „v
  šabloně nezůstal"): skutečný údaj ve veřejném repu; dočasně v povoleném
  seznamu `nastroje/povolene_kontakty.txt` s poznámkou (viz #346 / B79).
- **CSP bez `'unsafe-inline'`:** jen návrh (nikde needitováno).
- Pokyn k přenosu větve sezení → `test-draft` → `test` → `main`.
- Dál platí z minula: soubory SoD (#350), kolo 16 dávky B/C/D (#361–#363),
  #355, #356, #346 Netlify, #172 lokálně npm.

## Poznámky pro další sezení
- **Testy jedním příkazem:** `bash nastroje/testovaci_kolo.sh` (celé kolo,
  ~50 min) nebo `--bez-mutaci`; `--jen sady` apod. Mutační běh nepřerušovat.
  Logy kroků v `$KNG_KOLO_LOGY` nebo v mktemp složce vypsané v souhrnu.
- `netlify/test_mutace.mjs` spouští skutečnou mutaci (B59) a posílá signály —
  nepouštět souběžně s mutačním během.
- Nový smyšlený kontakt v testu → zapsat do `nastroje/povolene_kontakty.txt`
  s důvodem, jinak statická kontrola (a CI) skončí červeně.
- Harnessy potřebují `node_modules/playwright` (symlink na `$(npm root -g)`)
  a `ADMIN_EMAIL=spravce@priklad.cz` (testovaci_kolo.sh ho nastaví sám);
  šablony pro harnessy přes `KNG_PODKLADY=<složka>` — jinak se hlásí jako
  přeskočené (nic neověřily).
- Komentář uvnitř `KOD_STRANKY` v `overit_xss.mjs` nesmí obsahovat zpětné
  apostrofy (je to template literal). Komentář s uzavírací značkou skriptu
  v `src/` rozbije celou aplikaci.
- Server musí načítat v `jadro_moduly.cjs` tytéž moduly migrací jako
  prohlížeč (pořadí CORE v build.py) — jinak se odeslané zakázky po
  uložení liší (N43). Hlídá `src/test_zamek_historie.js`.
- Sezení 25.–26. 9. běželo přes 1,5 M tokenů kontextu bez pádu díky
  automatickému shrnutí; přesto předávku psát po každé dávce.
