# Prompt C1 — šablona CN v17 (CZ + EN/DE/FR) a německé nadpisy „USAZENÍ OCK“ (po kole 47)

Jsi vývojové sezení projektu Kalkulator Next Gen (model Opus 5.5). Komunikuj česky. Na začátku přečti `CLAUDE.md`,
`PREDAVKA.md` (oddíl „Předávka koordinace — 11. 11. 2026“) a `podklady/PROMPT_RIDICI_SEZENI_PO_KOLE47.md`
(oddíly B0 body 2–3 a C1). Spusť `bash nastroje/instaluj_hooky.sh`. Nikdy AskUserQuestion — u nejasnosti zvol výchozí
variantu z tohoto promptu a napiš ji do závěrečné zprávy.

| | |
|---|---|
| větev | `claude/c1-cn-v17` |
| báze | `aa445a12f187701351c627c15c820d512fc66e1b` (integrace, obsah = test v11.11.1) |
| roadmapa | **#582** (před zápisem ověř, že je volné; volná jsou #582–#589 a od #597) |
| meze B | žádné (dávka nemění server ani práva) |
| odhad | 3–4 h (z toho ~1 h stahování a ověřování šablon) |
| riziko | běžná dávka — výpočet ceny se nemění; revize poradce jen nad diffem `src/preklad.js` a nástroje |

Do `test-draft`, `test`, `main` ani do integrace nic. Nic do Pipedrive. **Na Disk nic nezapisuj** (číst smíš).
Žádné ceny, osobní údaje ani `.docx` do repa. `git push --no-verify` je zakázané.

## 1. Rozhodnutí J. V. (11. 11. 2026), ze kterých dávka vychází

- **B0.2:** sezení vyrobí CN v17 CZ + EN/DE/FR a vypíše nepřeložené texty k doplnění. J. V. zkontroluje a zveřejní
  v testu i v main naráz.
- **B0.3:** německé nadpisy „USAZENÍ OCK“ sjednotit na **„POSITIONIERUNG DER SCHACHTKONSTRUKTION – …“ u všech stěn,
  v v16 i v v17**, a upravit i zdroj překladu, aby je `--cn-v17` nevrátil.

## 2. Odkud vzít šablony v16

Šablony v repozitáři nejsou a být nesmí (firemní texty, veřejný repozitář). Leží na Disku J. V. ve složce
„Kalkulator NextGen / Sablony“ (ID složky `1RDW2m9p-OzDScADrhSi0H8ef6Mq_gyh7`), ověřeno poradcem 11. 11. 2026:

| soubor | ID na Disku | velikost (B) |
|---|---|---|
| `Sablona_NABIDKA_CN_v16.docx` | `1ihP134uu_i7aQWcwpWxzOX1k_2Uf9yLg` | 430 595 |
| `Sablona_NABIDKA_CN_v16_EN.docx` | `13amvcaalA4fvOMQXflECl3barJYjfWZe` | 433 137 |
| `Sablona_NABIDKA_CN_v16_DE.docx` | `1-yswRVN6xipAQtkYmuZpzNUJU_CJwJI2` | 433 684 |
| `Sablona_NABIDKA_CN_v16_FR.docx` | `1f7zScl-qMhXtPENEcMUpbxfC1bUgYhWQ` | 434 322 |

- Stáhni je konektorem Google Drive (jen čtení) do složky **mimo repozitář**, např. `/home/user/kng_podklady_c1`.
  Stahování nech subagentovi (obsah chodí jako base64 do souboru výsledku nástroje). Každý soubor ověř
  `python3 -c "import zipfile,sys; print(zipfile.ZipFile(sys.argv[1]).testzip())"` a velikostí z tabulky.
- Pro harnessy stáhni i ostatní šablony, které kolo potřebuje (seznam v `podklady/PROMPT_kolo_v14_10_5.md` bod 2,
  nejnovější verze SoD a PROJ najdeš hledáním podle názvu `Sablona_`).
- **Když sezení konektor Disku nemá nebo stažení selže:** nic neobcházej. Napiš koordinaci přesně: „J. V. nahraje
  do tohoto sezení čtyři soubory `Sablona_NABIDKA_CN_v16.docx`, `_EN`, `_DE`, `_FR` ze složky Kalkulator NextGen /
  Sablony“ a mezitím udělej část 3 (zdroj překladu a testy nad syntetickým XML), která šablony nepotřebuje.
- Do zprávy napiš datum úpravy souborů na Disku (10. 11. 2026) — J. V. potvrdí, že jsou totožné s tím, co 10. 11.
  zveřejnil v aplikaci.

## 3. Zdroj překladu — `src/preklad.js`

Dnes (nad bází) jsou německé nadpisy smíšené:

| heslo (CZ) | dnes DE | nově DE |
|---|---|---|
| `USAZENÍ OCK - ČELNÍ STĚNA` | BEFESTIGUNG DES SCHACHTGERÜSTS - VORDERWAND | POSITIONIERUNG DER SCHACHTKONSTRUKTION – VORDERWAND |
| `USAZENÍ OCK - BOČNÍ STĚNY` | BEFESTIGUNG DES SCHACHTGERÜSTS - SEITENWÄNDE | POSITIONIERUNG DER SCHACHTKONSTRUKTION – SEITENWÄNDE |
| `USAZENÍ OCK – LEVÁ BOČNÍ STĚNA` | POSITIONIERUNG … – LINKE SEITENWAND | beze změny |
| `USAZENÍ OCK – PRAVÁ BOČNÍ STĚNA` | POSITIONIERUNG … – RECHTE SEITENWAND | beze změny |
| `USAZENÍ OCK – ZADNÍ STĚNA` | BEFESTIGUNG DES SCHACHTGERÜSTS - RÜCKWAND | POSITIONIERUNG DER SCHACHTKONSTRUKTION – RÜCKWAND |
| `USAZENÍ ZADNÍ STĚNY OCK` | BEFESTIGUNG DES SCHACHTGERÜSTS - RÜCKWAND | POSITIONIERUNG DER SCHACHTKONSTRUKTION – RÜCKWAND |

- Oddělovač v němčině všude **půlčtverčík „–“ s mezerami**. Najdi všechna hesla (i varianty se spojovníkem a
  s půlčtverčíkem a případné další výskyty „BEFESTIGUNG DES SCHACHTGERÜSTS“) — po dávce nesmí v německém sloupci
  slovníku zůstat žádné „BEFESTIGUNG DES SCHACHTGERÜSTS“.
- **EN a FR neměň.** Anglické nadpisy jsou smíšené stejně (FIXING × POSITION), ale J. V. rozhodl jen němčinu —
  jen to vypiš do zprávy jako otázku (viz část 8).
- Změna se projeví i v online německé nabídce a specifikaci (stejný slovník) — to je záměr („i ve zdroji“).
- Zjisti, jak fungují přepisy slovníku zveřejněné v aplikaci (Nastavení → Slovník, `src/slovnik.js`,
  `/api/slovnik`): kdyby zveřejněný přepis v databázi nesl staré německé znění, přebil by vestavěný slovník.
  Do databáze nevidíš — do návodu pro J. V. napiš, kde to zkontroluje a co případně smaže/přepíše.
- K40a (#579, větev `claude/k40a`) mění v `src/preklad.js` asi 10 řádků jinde — drž změnu jen na řádcích hesel.

## 4. Nástroj `nastroje/vyrob_sablony.js`

**4a. Oprava nadpisů ve zveřejněné v16 DE** — nový samostatný režim (návrh jména `--cn-usazeni-de`):

- Vstup `Sablona_NABIDKA_CN_v16_DE.docx`, výstup soubor **téhož jména** do výstupní složky (ne vedle vstupu).
- Nahradí jen text nadpisů řádků usazení (čelní, boční, levá, pravá, zadní) na znění z části 3. Nadpis může být
  rozdělený do víc běhů `<w:r>` — použij pomocné funkce nástroje (`textBehu` apod.), písmo a stavba řádku zůstávají.
- Tvrdé kontroly, jinak chyba a nic se nezapíše: přesně očekávaný počet nahrazených nadpisů (vypiš které),
  seznam symbolů `{{…}}` před = po, `docxXmlVady` bez nálezu, text dokumentu mimo nahrazené nadpisy znak po znaku
  stejný. Nic nehádej — nenajde-li řádek, skonči chybou.
- Ověř totéž u EN a FR jen čtením: žádná změna.

**4b. v17 ze v16** — `--cn-v17` (existuje, `cnV17`):

- CZ: `Sablona_NABIDKA_CN_v17.docx` z `Sablona_NABIDKA_CN_v16.docx` (v kole 47 bez problémů, 127 symbolů + 5 symbolů
  šachet).
- EN/DE/FR: dnešní nástroj jazykové verze **strojově překládá z CZ v17** slovníkem aplikace (`ulozSMutacemi`;
  v kole 47 zůstalo 8 ze 147 textů česky). v17 přitom proti v16 nepřidává žádný pevný text — jen řádky se
  značkami a symboly. **Cíl: v17 každého jazyka = zveřejněná v16 téhož jazyka (DE po opravě 4a) + smyčky šachet,
  nic jiného.** Postup:
  1. Vyrob jazykové v17 dnešní cestou a porovnej jejich text (odstavec po odstavci, bez řádků smyčky) se
     staženou v16 téhož jazyka. Rozdíly vypiš.
  2. Jsou-li rozdíly (ručně revidované znění ve v16, které by strojový překlad ztratil, nebo české zbytky),
     doplň `cnV17`, aby uměla běžet přímo nad jazykovou v16: kotva pruhu „ZÁKLADNÍ PARAMETRY ŠACHTY“ se hledá
     v jazyce souboru (`tr(…, L)`; ostatní kotvy jsou symboly). Režim pak vezme `…_v16_<L>.docx`, když ve složce je,
     a strojový překlad nechá jen jako zálohu s hlasitým upozorněním.
  3. Výsledek: text v17_L bez řádků smyčky = text v16_L znak po znaku (u DE = opravená v16 DE).
- Hlavičku souboru (komentář režimů) a řádek použití doplň. Nový export přidej **vlastním řádkem**
  `module.exports.<jméno> = …` pod stávající `module.exports = {…}` — souběžná dávka C2 (SoD v5) mění tentýž
  soubor a společný řádek exportů by kolidoval. Konstantu režimu dej k `REZIM_CN17`.

**4c. Výstup:** `podklady/sablony_vystup/` (je v `.gitignore`), pět souborů: `Sablona_NABIDKA_CN_v17.docx`, `_EN`,
`_DE`, `_FR` a opravená `Sablona_NABIDKA_CN_v16_DE.docx` (v podsložce `v16_oprava/`). Pošli je J. V. v sezení
(SendUserFile). **Do repa ani na Disk nejdou** — na Disk a do aplikace je nahraje J. V.

## 5. Výpis nepřeložených textů — `podklady/SABLONA_CN_V17_11_11.md`

Podle vzoru `podklady/SABLONA_SOD_REALIZACE_V4_21_10.md`:

1. tabulka souborů (jazyk, počet symbolů, velikost, z čeho vznikl, ID zdroje na Disku),
2. co se proti v16 mění (smyčky, 5 symbolů šachet; u DE nadpisy usazení před → po),
3. **texty, které v EN/DE/FR zůstaly česky nebo se liší od v16** — pro každý jazyk tabulka „český text | kde
   v dokumentu | návrh překladu“. Návrh je jen návrh: do `src/preklad.js` ho **nepřidávej**, rozhodne J. V.
   (výjimka: hesla z části 3),
4. výsledky ověření z části 6,
5. návod pro J. V.: v jakém pořadí nahrát (v testu i v main naráz, všechny čtyři jazyky najednou průvodcem
   v Nastavení → Šablony; opravená v16 DE jako nová verze šablony v16, dokud se tiskne z v16), kontrola slovníku
   z části 3, a že víc šachet na ostrém zůstává vypnuté (B0.1).

Bez cen a osobních údajů; pevné texty šablony jen v rozsahu nutném pro výpis (krátké úseky).

## 6. Testy a ověření

Každý nový test má pojistku: do commitu napiš, že nad bází selže (počet FAIL) a po změně projde.

- `src/test_preklad.js`: všech pět stěn + „USAZENÍ ZADNÍ STĚNY OCK“ dává v DE „POSITIONIERUNG DER
  SCHACHTKONSTRUKTION – …“; v německém sloupci není „BEFESTIGUNG DES SCHACHTGERÜSTS“; EN a FR beze změny
  (zafixuj dnešní hodnoty).
- Nový `src/test_cn_usazeni_de.js` (syntetické XML, bez firemních textů): nadpis v jednom běhu i rozdělený do
  běhů se nahradí; symboly a ostatní text beze změny; chybějící řádek = chyba, ne tichý průchod; druhé spuštění
  nad už opraveným souborem nic nezmění (idempotence).
- `src/test_vs_docx_v17.js`: doplň případ „`cnV17` nad jazykovou šablonou“ (pokud vznikne 4b.2).
- Přidej nové sady do `spust_testy.sh`, kde se sady vyjmenovávají.
- S podklady (`KNG_PODKLADY=<složka>`): `overit_vs_dokumenty.mjs`, `overit_vs_kryci_sod.mjs`, `overit_sablona.mjs`,
  `overit_sablony_online.mjs`, `overit_neprelozene.mjs`, `overit_k39_sablony_filtr.mjs`.
- **Jedna šachta: Word z v17 = Word z v16 znak po znaku** (text dokumentu) — CZ i každý jazyk, nad scénáři zlaté
  sady (kolo 47: 98/98 CZ). U DE proti opravené v16.
- **Víc šachet:** všechny šachty v technické části, řádek na šachtu v ceně, „Cena celkem“ = součet, počet kusů;
  DE/EN/FR bez českých slov mimo vyjmenované zbytky.
- Zlaté sady beze změny: `node src/test_vs_zlata.js` (319), `src/test_560_zlata.json`. Otisky nepřegenerovávej.
- Mutace: `src/preklad.js` a `nastroje/vyrob_sablony.js` jsou v `mutace_jadro.mjs`. Přidej cílené mutace „[C1]“ na
  nový režim (kontrola počtu nadpisů, kontrola symbolů, idempotence) a doloz, že jsou chycené; pusť
  `node mutace_jadro.mjs --kontrola`. Celé mutace pouští koordinace při slučování.
- Na konci `bash nastroje/testovaci_kolo.sh --bez-mutaci` s `KNG_PODKLADY` — výsledek s počty do předávky.

## 7. Dokumentace a předávka

- Příručka správce `manual/admin/obsah.json`, kapitola A5 (postup „vyrobit a nahrát šablonu CN v17“): doplň
  opravu německých nadpisů v16 a to, z čeho vznikají jazykové v17. (K40a mění v tomto souboru řádek verze.)
- `CHANGELOG.md` (oddíl nové verze; verze podle dne commitu, číslo za tečkou potvrdí koordinace — K40a a K40b
  drží v11.11.2), `roadmapa/roadmap.json` #582 (`python3 roadmapa/roadmapa.py --kontrola`), `verze.txt`.
- `PREDAVKA.md` nahoře oddíl dávky: tabulka úkol / stav / kde, počty testů, co čeká na J. V.
- Po každé ucelené části commit a push do `claude/c1-cn-v17`. Na konci `get_session` → `context_usage`.

## 8. Závěrečná zpráva koordinaci (send_message)

SHA, verze, počty testů a mutací, seznam předaných souborů, počet nepřeložených textů po jazycích, odchylky od
promptu a otázky pro J. V.:

1. Anglické nadpisy usazení jsou smíšené (FIXING u čelní, bočních a zadní × POSITION u levé a pravé) — sjednotit
   také? (Doporučení: ano, na „SHAFT STRUCTURE POSITION – …“, stejná logika jako DE; francouzština je jednotná.)
2. Návrhy překladů z části 5 — schválit / opravit.

## 9. Kolize s ostatními dávkami

- **C2+C3 (`claude/c23-sod-v5`)**: `nastroje/vyrob_sablony.js` (jiné funkce; exporty vlastním řádkem), `mutace_jadro.mjs`,
  `manual/admin/obsah.json` (A5). C1 se slučuje první.
- **K40a**: `src/preklad.js`, `src/slovnik.js` (jiné řádky), `mutace_jadro.mjs`, `manual/admin/obsah.json`.
- Vždy: `CHANGELOG.md`, `PREDAVKA.md`, `roadmapa/roadmap.json`, `verze.txt` — řeší koordinace při slučování.
