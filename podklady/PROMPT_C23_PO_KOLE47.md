# Prompt C2 + C3 — SoD realizace v5 se šachtami a tečky místo nevyplněných symbolů smlouvy (po kole 47)

Jsi vývojové sezení projektu Kalkulator Next Gen (model Opus 5.5). Komunikuj česky. Na začátku přečti `CLAUDE.md`,
`PREDAVKA.md` (oddíl „Předávka koordinace — 11. 11. 2026“) a `podklady/PROMPT_RIDICI_SEZENI_PO_KOLE47.md`
(B0 body 4–5, C2, C3). Spusť `bash nastroje/instaluj_hooky.sh`. Nikdy AskUserQuestion — u nejasnosti zvol výchozí
variantu z tohoto promptu a napiš ji do závěrečné zprávy.

| | |
|---|---|
| větev | `claude/c23-sod-v5` |
| báze | `aa445a12f187701351c627c15c820d512fc66e1b` (integrace, obsah = test v11.11.1) |
| roadmapa | **#583** (C2 — SoD realizace v5, upozornění u staré šablony), **#584** (C3 — tečky a kontrola před tiskem SoD); před zápisem ověř, že jsou volná |
| meze B | žádné (server se nemění); kdyby dávka přece sáhla na server, další volná mez je B215 |
| odhad | 6–8 h (C2 ~3 h, C3 ~3 h, kolo a mutace ~2 h) |
| riziko | **složitá — smlouva se podepisuje.** Před sloučením revize poradce (Fable) nad celým diffem |

Do `test-draft`, `test`, `main` ani do integrace nic. Nic do Pipedrive. **Na Disk nic nezapisuj** (číst smíš).
Žádné ceny, osobní údaje ani `.docx` do repa. `git push --no-verify` je zakázané.

**Souběh:** dávka smí běžet hned, souběžně s C1 (CN v17) a K40b/K40c — logika se nepotkává. Slučuje se **po C1**
(společný soubor `nastroje/vyrob_sablony.js`). Dva commity/části držet odděleně (C2, pak C3), aby šly revidovat
zvlášť.

## 1. Rozhodnutí J. V. (11. 11. 2026)

- **B0.4:** vyrobit **SoD realizace v5** se `{{SACHTY_SOD_PREDMET}}` a `{{SACHTY_SOD_ROZPIS}}`. Se starou šablonou
  aplikace u víc šachet jen **upozorní, nezastaví**.
- **B0.5:** nevyplněná pole SoD nahradit tečkami **„……“**. Kontrola před tiskem SoD chybějící údaje vyjmenuje, jen
  **upozornění** (žádná zábrana).

## 2. Co už v kódu je (nad bází) — neprogramuj znovu

- `src/sod.js` `sodSachtySymboly(d, zak, varianta, jekly, L)` plní oba symboly jen u víc šachet (VS-E5 #595),
  překlady EN/DE/FR hotové (VS-E6 #596). U jedné šachty se do dat nic nepřidá.
- `sodObjednaneSymboly` ukazuje vzor upozornění u staré šablony: `d.upozorneni` → `sodUpozorneniText(res)`
  v `src/ui/sod_ui.js` (věta ve stavu pod tlačítkem + hláška). Šablona přichází jako `sablona.symboly`.
- `src/docxgen.js` `docxRozpisOdstavce` (SF #556) rozepisuje víceřádkový symbol do odstavců bez číslování —
  `SACHTY_SOD_ROZPIS` má řádek na variantu šachty.
- Kontroly: `src/kontroly.js` (pravidla `vsModel1`, `vsSablona`), kontext z `src/ui/kontroly_ui.js`
  (`ctx.sablonaNabidka` — symboly šablony stahuje UI na pozadí; nevíme-li, pravidlo mlčí).
- Šablona SoD realizace v4: `podklady/SABLONA_SOD_REALIZACE_V4_21_10.md`, nástroj `--sod-real-v4` (`sodRealV4`).

## 3. Šablony z Disku (jen čtení)

Složka „Kalkulator NextGen / Sablony“ (`1RDW2m9p-OzDScADrhSi0H8ef6Mq_gyh7`), ověřeno poradcem 11. 11. 2026:

| soubor | ID | velikost (B) |
|---|---|---|
| `Sablona_SOD_REALIZACE_v4.docx` | `14gQQRMLM1yJhY4Wwe02pPL1JhfdW8t-L` | 393 846 |
| `Sablona_SOD_REALIZACE_v4_EN.docx` | `12bDj9-b2rLl5ztGTRducgGyvGVMqC2yj` | 343 540 |
| `Sablona_SOD_REALIZACE_v4_DE.docx` | `1ypTJpnPqGTuolJ88LXJGgn358rm8wzqA` | 346 226 |
| `Sablona_SOD_REALIZACE_v4_FR.docx` | `1BVkqAVh1-LE5Jd8fO204B40d0s-3FX8r` | 346 751 |

Stáhni konektorem Google Drive do složky mimo repozitář (např. `/home/user/kng_podklady_c23`), stahování nech
subagentovi, každý soubor ověř `zipfile.testzip` a velikostí. Stáhni i ostatní šablony pro harnessy (SoD projekce
nejnovější, plná moc, CN v16; seznam v `podklady/PROMPT_kolo_v14_10_5.md` bod 2). **Nemá-li sezení konektor Disku
nebo stažení selže:** napiš koordinaci „J. V. nahraje do sezení `Sablona_SOD_REALIZACE_v4.docx`, `_EN`, `_DE`, `_FR`
ze složky Kalkulator NextGen / Sablony“ a pokračuj částmi, které šablony nepotřebují (syntetické XML).

## 4. C2 — SoD realizace v5 (#583)

**4a. Nástroj** `node nastroje/vyrob_sablony.js --sod-real-v5 <složka podkladů> [výstupní složka]`:

- Vstup v4 CZ + `_EN/_DE/_FR` (revidovaná jazyková znění — **nepřekládat strojově**, stejně jako `--sod-real-v4`
  úprava běží nad každým jazykovým souborem). Výstup `Sablona_SOD_REALIZACE_v5.docx` + `_EN/_DE/_FR`.
- v5 = v4 + dvě místa:
  1. **předmět díla** (čl. o předmětu): samostatný odstavec se `{{SACHTY_SOD_PREDMET}}` za větou, která předmět
     popisuje (stavba a písmo sousedního odstavce, bez posunu číslování článku),
  2. **rozpis ceny** (čl. V, u bloku z v4): samostatný odstavec se `{{SACHTY_SOD_ROZPIS}}` — umístění zvol tak, aby
     věta „a to ve výši {{CENA_BEZ_DPH}}“ dál ukazovala na celkovou cenu díla (viz úvaha o pořadí ve v4, oddíl 2
     podkladu v4); u víc šachet i s objednanými příplatky musí rozpis číst logicky.
  Odstavce nenesou žádný pevný text (jen symbol) — proto nevzniká nic k překladu. Pokud usoudíš, že je nutný
  uvozující text (např. „z toho:“), navrhni ho ve zprávě, ale do šablony ho dej jen ve stavbě, která s jednou
  šachtou zmizí celá.
- **Jedna šachta = v4 znak po znaku:** odstavce se symboly u jedné šachty zmizí (symbol prázdný → odstavec pryč,
  cesta `odstavcePryc` jako u `sodObjednaneSymboly`: jen symboly, které šablona opravdu má).
- Tvrdé kontroly nástroje jako u v4: symboly v4 ⊂ v5, přibyly právě dva, `docxXmlVady` čisté, text mimo nové
  odstavce beze změny, všechny čtyři jazyky stejná sada symbolů; jinak chyba a nenulový kód.
- Hlavička souboru + řádek použití. Export přidej **vlastním řádkem** `module.exports.sodRealV5 = sodRealV5;`
  pod stávající `module.exports = {…}` a konstantu režimu k `REZIM_SOD_REAL4` — souběžná C1 mění tentýž soubor
  u `cnV17`.
- Výstup do `podklady/sablony_vystup/` (gitignore), pošli J. V. v sezení (SendUserFile). Do repa ani na Disk nejde.
- Podklad `podklady/SABLONA_SOD_REALIZACE_V5_11_11.md` podle vzoru v4 (soubory, co se mění, ověření, návod: nahrát
  všechny čtyři jazyky najednou; v testu hned, v main až s kódem víc šachet — na main je víc šachet vypnuté).

**4b. Upozornění u staré šablony (nezastavuje):**

- `sodSachtySymboly` dostane `sablona` (jako `sodObjednaneSymboly`). Víc šachet + známé symboly šablony + šablona
  nemá `SACHTY_SOD_PREDMET` → do `d.upozorneni` věta typu „Šablona smlouvy neumí vyjmenovat šachty — předmět díla
  a rozpis šachet doplňte ve Wordu, nebo ať administrátor nahraje šablonu SoD realizace v5.“ Bez informace
  o šabloně (náhled) mlčí. Tisk **projde**.
- Pravidlo kontrol `vsSablonaSod` v `src/kontroly.js` — **vlož ho za `vsSablona` na konec seznamu** (souběžná dávka
  VSD vkládá `vsTvar` mezi `vsModel1` a `vsSablona`): úroveň upozornění, `zabranaMozna` ne, strana `ock`, jen
  víc šachet a jen když symboly šablony SoD známe. Kontext `ctx.sablonaSod` doplň v `src/ui/kontroly_ui.js`
  stejnou cestou jako `sablonaNabidka` (stažení symbolů na pozadí, žádné nové volání serveru při každém
  překreslení).
- Text upozornění a pravidla musí říkat totéž (jedna konstanta).

## 5. C3 — tečky místo nevyplněných symbolů a kontrola před tiskem SoD (#584)

**5a. Tečky.** Ve vygenerované smlouvě nesmí zůstat `{{…}}`:

- Rozsah: **SoD realizace i SoD projekce** (typy `sod`, `sodProj`). Plná moc (`{{PM_…}}`) a nabídky **beze změny**
  (výchozí; otázka pro J. V. je v části 9).
- Kde: jedna funkce v `src/sod.js` (např. `sodNevyplnene(placeholders, symbolySablony)` → seznam symbolů, které
  šablona má a data je nemají nebo je mají prázdné) a náhrada v cestě generování dokumentu (`dokumentVygeneruj` →
  `docxVyplnSablonu`): nevyplněný symbol dostane hodnotu „……“ (znak výpustky U+2026 dvakrát). Náhrada se dělá
  **až po** všech krocích, které podle prázdného symbolu odstraňují odstavce, řádky a bloky (`odstavcePryc`,
  `odstranPrazdneBloky`, rozpisy, `SOD_OBJ_SYMBOLY`, symboly šachet u jedné šachty, nenabízené činnosti SoD PROJ
  #380) — co má zmizet, musí zmizet dál, tečky dostane jen to, co by dnes zůstalo jako `{{…}}`.
- `docxVyplnSablonu` pro ostatní dokumenty beze změny (nová volba ve `volby`, výchozí vypnuto). Značky smyček,
  bloků (`…_ZAC/_KON`) a alternativní texty obrázků se do náhrady nepletou.
- `sodPokutaZhotovitele`: případ „vlastní znění bez čitelného procenta → symbol zůstane vidět jako `{{…}}`“ se
  mění na tečky a položku ve výpisu chybějících (5b).
- Žluté podbarvení symbolu v šabloně zůstává (tečky budou žlutě — obchodník je najde). Ověř v dokumentu.
- Texty v aplikaci, které dnes říkají „symboly `{{…}}` doplňte ve Wordu“ (`src/ui/sod_ui.js` řádky u `sodKarta`,
  `sodProjKarta`, stav po tisku; komentáře v `src/sod.js`), přepiš na „místa označená …… doplňte ve Wordu“.
  K40b (#580) mění v `src/ui/sod_ui.js` jen kartu prodeje (`prodejKarta`, `prodejUiProdej`) — drž se mimo ni.
- Dotisk a zámek: záznam tisku SoD (`objSodSnimek`, `zamekPoTisku`) se nemění; ověř testem, že otisk dat pro zámek
  je před a po dávce stejný (tečky jsou věc dokumentu, ne dat).

**5b. Kontrola před tiskem SoD — jen upozornění:**

- Pravidlo kontrol (návrh kódu `sodNevyplneno`, zvlášť pro `sod` a `sodProj` přes `dokumenty`) vyjmenuje chybějící
  údaje **lidsky** („IČO objednatele“, „termín montáže od“, „zástupce objednatele“…), ne jmény symbolů. Mapu
  symbol → popis drž na jednom místě v `src/sod.js`; symbol bez popisu se vypíše jménem (a test hlídá, že
  všechny symboly dnešních šablon v4/v5 a SoD projekce v4 popis mají).
- Úroveň upozornění, **nikdy zábrana**; v panelu kontrol i jako věta po tisku („Ve smlouvě zůstalo N míst
  k doplnění: …“). Stávající zábrany SoD (`sodDphZabrana`, jazyk, plán plateb) beze změny.
- Seznam chybějících počítej z téhož `sodNevyplnene` jako tečky — co kontrola vyjmenuje, to má v dokumentu tečky.
- Vkládej za `vsSablonaSod` (konec seznamu pravidel).

## 6. Testy (každý s pojistkou: nad bází selže, po změně projde — počty do commitu)

- Nový `src/test_sod_v5.js`: `sodRealV5` nad syntetickým XML (jeden i víc běhů), jedna šachta = text v4, víc
  šachet: předmět vyjmenuje varianty a kusy, rozpis po řádcích dává součet = cena díla před slevou (ověř proti
  `vsVystup`), s objednanými příplatky, EN/DE/FR bez českých slov; upozornění u šablony bez symbolů; tisk projde.
- Nový `src/test_sod_tecky.js`: vygenerovaná SoD realizace i projekce neobsahuje `{{` ani `}}` (zakázka bez
  údajů objednatele a termínů — dnes 25 značek); vyplněná zakázka nemá žádné „……“; odstavce a bloky, které mají
  zmizet, zmizely (ne tečky); nabídka a plná moc beze změny (dnešní chování zafixuj); `sodNevyplnene` = místa
  s tečkami; pokuta s vlastním zněním.
- `src/test_vs_kontroly.js` / `src/test_kontroly.js`: `vsSablonaSod` a `sodNevyplneno` jsou upozornění, ne zábrana;
  mlčí bez informace o šabloně; jedna šachta beze změny.
- Stávající sady, které dnes čekají `{{…}}` ve smlouvě (`src/test_sod*.js`, `src/test_rozhodnuti_sod.js`,
  `overit_sod.mjs`, `overit_sod_en.mjs`, `overit_sod_proj_*.mjs`, `overit_vs_kryci_sod.mjs`), uprav na nové
  chování — **každou změnu očekávání vypiš do předávky** (revize je bude číst). K40a (#579) mění `overit_sod.mjs`
  (výběr nejvyšší verze šablony) — sahej jen na očekávání textu.
- Zlaté sady beze změny (`node src/test_vs_zlata.js` 319, `src/test_560_zlata.json`), otisky nepřegenerovávej.
- Se šablonami (`KNG_PODKLADY`): harnessy SoD výše + ověření „jedna šachta: Word z v5 = Word z v4 znak po znaku“
  pro CZ/EN/DE/FR nad zakázkami zlaté sady (vyplněná hlavička — tečky se neprojeví) a „víc šachet“ nad scénáři VS.
- Nové sady přidej do `spust_testy.sh` a do seznamu rychlých sad v `mutace_jadro.mjs`.

## 7. Mutace

- `src/sod.js`, `src/docxgen.js`, `src/kontroly.js`, `nastroje/vyrob_sablony.js` jsou jádro (`mutace_jadro.mjs`).
  Přidej mutace „[C2]“ a „[C3]“ na nová místa (pořadí náhrady teček × mazání odstavců, rozsah typů dokumentů,
  úroveň upozornění × zábrana, podmínka „šablona symbol má“) a doloz, že jsou chycené.
- `node mutace_jadro.mjs --kontrola` (posunutá starší zadání oprav).
- **Mutace jádra celé, po částech** (`KNG_MUTACE_CAST=K/4 bash nastroje/testovaci_kolo.sh --jen mutace-jadro`,
  každá část v samostatném worktree, na pozadí, nepřerušovat) — dávka mění `docxgen.js`, kterým prochází každý
  dokument. Serverové mutace jen `node netlify/mutace.mjs --kontrola` (server se nemění).
- Na konci `KNG_PODKLADY=<složka> bash nastroje/testovaci_kolo.sh --bez-mutaci` — počty do předávky.

## 8. Dokumentace a předávka

- Příručka obchodníka (`manual/obsah.json`): kapitola o smlouvě o dílo — tečky místo značek, upozornění před
  tiskem, víc šachet ve smlouvě (kap. 25). Příručka správce (`manual/admin/obsah.json`, A5): šablona SoD realizace
  v5 a postup nahrání. Snímky jen pokud se mění obrazovka.
- `CHANGELOG.md`, `roadmapa/roadmap.json` (#583, #584; `python3 roadmapa/roadmapa.py --kontrola`), `verze.txt`
  (verze podle dne commitu; číslo potvrdí koordinace).
- `PREDAVKA.md` nahoře: tabulka úkol / stav / kde, změněná očekávání starých testů, co čeká na J. V.
- Průběžně commit + push do `claude/c23-sod-v5` (i „WIP“), na konci `get_session` → `context_usage`.

## 9. Závěrečná zpráva koordinaci (send_message)

SHA, verze, počty testů a mutací, předané soubory, změněná očekávání starých testů, odchylky od promptu, otázky:

1. Plná moc: mají se nevyplněné `{{PM_…}}` také nahradit tečkami? (Výchozí v dávce: ne — plná moc se vyplňuje
   ručně celá. Doporučení: ano, tečky bez kontroly, v další drobné dávce.)
2. Umístění odstavců se šachtami ve smlouvě (předmět, rozpis ceny) — přilož náhled textu obou míst k odsouhlasení.

## 10. Kolize

- **C1 (`claude/c1-cn-v17`)**: `nastroje/vyrob_sablony.js`, `mutace_jadro.mjs`, `manual/admin/obsah.json` (A5) — C1 první.
- **VSD (`claude/vsd-drobnosti`)**: `src/kontroly.js` (jiné místo seznamu), `src/test_vs_kontroly.js`, `src/ui/kontroly_ui.js`.
- **K40a**: `overit_sod.mjs`, `mutace_jadro.mjs`, `manual/*/obsah.json` (řádek verze). **K40b**: `src/ui/sod_ui.js`
  (karta prodeje), `mutace_jadro.mjs`, `manual/obsah.json`. **K40c**: `src/ui/sod_ui.js` se nečeká; ověř při slučování.
- Vždy: `CHANGELOG.md`, `PREDAVKA.md`, `roadmapa/roadmap.json`, `verze.txt`.
