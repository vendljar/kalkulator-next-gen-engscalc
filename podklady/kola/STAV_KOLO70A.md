# STAV kola 70, část A — plné kolo před main (stupeň 3), TESTOVÁNÍ 4 bez Pipedrive (27. 11. 2026)

- **Sezení:** TESTOVÁNÍ 4 (`kalkulator-testovani`, session_018mwHQHn8gkmk4ksTXk6caP).
- **Kandidát:** `origin/test` = **694ddeef** (v26.11.3), na testengscalc nasazeno (`/api/zdravi` 26.11.3). **Main:** 4e69c27 (v24.11.7), předek kandidáta, `/api/zdravi` 24.11.7.
- **Zadání:** `podklady/kola/ZADANI_PLNE_KOLO_PRED_MAIN_2026-11-27.md` (větev `claude/plne-kolo-zadani`), §4 A1–A12 + doplněk Fable k A4.
- **Weby:** main jen ČTENÍ (přihlášení a GET). Zápis na test: souhlas J. V. přímo v tomto sezení (25. 11.: „se zápisy na testu souhlasím vždy a v jakémkoliv rozsahu“), jen zakázky TEST.
- **Nástroje:** balíček K49 / `run_kolo57.sh` v gitu nejsou (kolo 57 je nepushnulo), proto náhrada: worktree T (694ddee) a M (4e69c27), `build.py` bez zvýšení verze,
  export TEST zakázek z testu (jen čtení, mimo repo) a výpočet obou kódů nad stejnými daty kopií `porovnani_sada.js` s režimem „data“ (jen v sezení, mimo repo).
- **Bez cen a osobních údajů.** Mutace nespouštím (běží v Actions).

## Průběh (průběžně doplňováno)

| bod | stav | výsledek |
|---|---|---|
| A1 sestavení a weby | ✅ | viz níže |
| A2 kalkulace T × Mt | ✅ | 478 variant / 452 zakázek; staré: 0 rozdílů ceny; nové: jen ER / #775 |
| A3 porovnání sestavení main × kandidát | ⏳ | čeká na seznam očekávaných rozdílů od koordinace |
| A4 dotisk starých odeslaných nabídek | ✅ / rozhodnout | Word 4 jazyky: rozdíl jen RP (64) a DT (1) → K70-I3; DE/FR před × po TX bajt po bajtu stejné; dialog slovníku 1× na dotisk → K70-N1 (text) |
| A5 nová nabídka (rozdíly pro J. V.) | ⏳ | |
| A6 nová kalkulace (rozdíly pro J. V.) | ✅ | 12 nových: řádky jen ER #757/#758/#761 a #775 (+1 ATYP projekce, viz níže) |
| A7 SoD, plná moc, objednávka PROJ | ✅ | SoD / SoD PROJ: jen datum „ze dne“ (DT); plná moc shodná; objednávka PROJ: jen odstup před podpisem (PP #791) |
| A8 krycí listy | ⏳ | |
| A9 tok Word / zámek, fuzz, víc šachet, víc zákazníků | ⏳ | |
| A10 kontroly před odesláním | ⏳ | |
| A11 připomínky | ✅ | neplatné značky 400, akce správce 403; záloha bez snímků a značek |
| A12 automat (sady, harnessy) | ⏳ | `testovaci_kolo.sh --bez-mutaci` nad worktree kandidáta běží |

## A1 — sestavení a weby

- `build.py` (KNG_NEZVYSOVAT_VERZI=1) nad 694ddee a 4e69c27: obě sestavení projdou. **Web testu = sestavení kandidáta, web main = sestavení main** bajt po bajtu
  (liší se jen značka data sestavení `BUILD_DATUM_ZNACKA`: test 2026-11-26, main 2026-11-25).
- **Vypínače:** test i main `viceSachet: true`, `viceZakazniku: true`. Na main je zapnul J. V. 25. 11. 2026 15:17 (PREDAVKA.md uvádí „víc šachet vypnuto“) → K70-I1.
- **Šablony (platné verze, otisk souboru):**

| šablona | test | main | |
|---|---|---|---|
| CN OCK CZ / EN / DE / FR | `Sablona_NABIDKA_CN_v18*` | totéž | **stejné otisky** (číslo verze v historii se liší) |
| nabídka PROJ CZ | v8 `25adbd5f985a734f` (#805 oprava překlepu, kolo 66) | v7 `2abd9a08d81b216e` | **liší se** — #805 čeká na zveřejnění na main (J. V.) |
| nabídka PROJ EN / DE / FR | `ea80bb40…` / `5afad752…` / `9447ea0e…` | totéž | stejné |
| SoD realizace v6 CZ/EN/DE/FR, SoD projekce v4 CZ/EN/DE/FR, plná moc | | | stejné otisky |

  **CN v19 na testu není** (doplněk Fable k A4 a): platná je CN v18 se stejným otiskem jako main. Úprava CN pro V5/V6 (zadání §0.4) tedy na testu není → K70-I2.
- Ceník: `/api/cenik` (GET) na obou webech vrací 404 — ceník se porovná v A2 přes data zakázek (každá nese vlastní ceník).

## A2 — kalkulace kandidát × main kód nad daty testu

- **Data:** 452 zakázek TEST z databáze testu (čtení přes API, 27. 11. ráno; uloženo mimo repo), **478 variant** — 134 starých odeslaných, 321 starých
  rozpracovaných, 11 nových odeslaných a 12 nových rozpracovaných („nová“ = příznak kalkVerze 2). Ceník: uložený v každé zakázce. Sada kola 57 (608) v gitu
  není; tohle je všechno TEST z databáze testu (K28/K29/K36 i pozdější kola). Mt = kód main (4e69c27) nad stejnými daty, T = kandidát.
- **Cena celkem:** rozdíl jen u **12 nových neodeslaných** kalkulací (kalkVerze 2) — ER / #775 / #766. **Staré kalkulace (455 variant) i odeslané: 0 rozdílů ceny.**
  Nové odeslané (11): cena stejná (bere se ze zámku).
- **Řádky nových kalkulací** (A6): ENGINEERING jen v T (12×, #757), VÝSTUP ZE ZAMĚŘENÍ množství (12×, #761), PLASTOVÉ KOTVY / CESTOVNÍ NÁKLADY / ČIŠTĚNÍ
  u šachty bez opláštění (3×, #775), ceny příplatků s rezervou (3 kalkulace s ATYP, #758), u jedné (9963) navíc cena řádku PŘIRÁŽKA ZA ATYP – PROJEKČNÍ
  A KOORDINAČNÍ PRÁCE (zřejmě důsledek #761 — výstup ze zaměření vždy 1 × v projekci; k ověření J. V.). Nic jiného.
- **Symboly a dokumenty:** viz A4, A5 a A7 (skutečné Wordy). Sada otisků navíc ukazuje nový prázdný symbol `NAB_ZARUKA` (V5) — šablony ho nemají, text se nemění.

## A4 / A5 / A7 — skutečné Wordy ze skutečných šablon, kód main × kandidát

Renderer (`dokumentVygeneruj` z jádra obou sestavení, stejné šablony stažené z testu; nabídka PROJ v původní verzi z main, aby se porovnal jen kód) nad
všemi 478 variantami: CN CZ/EN/DE/FR, SoD CZ/EN/DE/FR, plná moc, nabídka PROJ CZ/EN/DE/FR, SoD PROJ, objednávka PROJ — 7 170 dokumentů na stranu.

| skupina | dokument | rozdílné / celkem | co se liší |
|---|---|---|---|
| staré odeslané | CN CZ/EN/DE/FR | 65 / 134 | **64× RP** (ruční položky v technické specifikaci a cenovém bloku „… / CENA CELKEM“ — přesně zakázky s ruční položkou), **1× DT** (9856: datum nabídky = den zámku místo data zakázky) |
| staré odeslané | SoD CZ/EN/DE/FR | 1 / 134 | DT (9856 „ze dne“) |
| staré odeslané | objednávka PROJ | 10 / 134 | PP #791 (prázdný odstavec / odstup u podpisu) |
| staré odeslané | plná moc, nabídka PROJ, SoD PROJ | 0 | — |
| staré rozpracované | CN | 253 / 321 | DT (datum), V1 (bez „Pohled na objekt z ulice:“ bez fotky), V2 (bez prázdného „Tel:“), V4 (TX: „bude vystaven 3. konečný daňový doklad na zbývajících 10 % …“), RP (76) |
| staré rozpracované | SoD CZ (DE/EN/FR) | 253 / 321 | jen „Cenová nabídka … číslo … ze dne <datum>“ v příloze č. 1 (DT — datum nabídky = den tisku) |
| staré rozpracované | nabídka PROJ | 64 / 321 | DT (datum), V1 (bez „POHLED NA OBJEKT“ — K65-N2 opraveno), V2 (bez „Tel:“) |
| staré rozpracované | SoD PROJ | 63 / 321 | jen „… ze dne <datum>“ (DT) |
| nové | CN | 15 / 23 | navíc ER (Engineering, „ano“ u výstupu ze zaměření), #800 / #815 (šachta bez opláštění: blok opláštění jen typ, „materiály DP1“ bez věty o opláštění) |

**DT, RP, ER** jsou dávky, které jsou v testu, ale ne v main (kolo 57). Rozdíly mimo tyto dávky a TX / PD2 / PP / MD jsem nenašel.

### A4 naživo na testu (dotisk, Word)

- TEST - 2026 - OPR - CN - 9961 (víc šachet, různé příplatky po šachtách, odeslaná 25. 11.): dotisk **CZ, EN, DE, FR** na kandidátovi = **bajt po bajtu stejný
  `word/document.xml`** jako dotisk z kola 62 (v25.11.4, před PD2 a TX) — pořadí příplatků vráceno (#813, K65-N1 opraveno), DE/FR před × po TX shodné (Fable b).
- **Dialog „Dotisk se změněným slovníkem“** (Fable c): u EN, DE a FR se ukáže **jednou na každý dotisk** (opakovaný DE dotisk ho ukáže znovu), u CZ ne; text dokumentu
  po potvrzení beze změny (viz výše). Text dialogu je matoucí → K70-N1.
- **Šablona CN:** na testu je CN **v18** (otisk shodný s main); CN v19 na testu není (Fable a) → K70-I2.

## A11 — připomínky

- Obchodník (API): značky bez snímku → 400 „Značky … bez snímku je nelze uložit“; tvar „trojúhelník“ → 400; souřadnice mimo 0–1000 → 400; 21 značek → 400 „nejvýš 20“;
  akce správce (nastavení) → 403. Odeslání se značkami a zvětšení u správce ověřeno v kole 63 (P-0009).
- Záloha databáze (Stáhnout zálohu, správce): oddíl `pripominky` nese jen záznamy s příznakem `snimek: true` — **žádný obrázek ani značky**.

## Nálezy a informace (průběžně)

| ID | vážnost | cena | co |
|---|---|---|---|
| K70-N1 | nízká | ne | Dialog „Dotisk se změněným slovníkem“ píše „při odeslání: zveřejněná verze 1, teď: zveřejněná verze 1“ — slovník se změnil (otisk), ale číslo verze stejné; uživatel nepozná, co se změnilo. Navrhuji uvádět datum / „upravený slovník“ místo stejného čísla verze. |
| K70-I1 | info | ne | Main má vypínače víc šachet i víc zákazníků **zapnuté** (J. V. 25. 11. 15:17); PREDAVKA.md uvádí „víc šachet vypnuto“ — opravit předávku. |
| K70-I2 | info | ne | Na testu není CN v19 (úprava šablony pro V5 / V6, zadání §0.4): V5 (záruka, symbol `NAB_ZARUKA`) se ve Wordu neprojeví; V6 ověřitelný jen online. |
| K70-I3 | **k rozhodnutí** | ne | **Dotisk staré odeslané nabídky s ruční položkou se na kandidátovi liší od main** (64 ze 134 starých odeslaných variant v datech testu): RP (v24.11.6) při dotisku přidá ruční položky do specifikace a cenového bloku — záměr RP („Odeslaná nabídka se při dotisku vytiskne s ručními položkami“, J. V. 24. 11.). Zadání §2.3 ale chce dotisk znak po znaku jako main. Částky a zámek beze změny. Rozhodnout: přijmout (zapsat do očekávaných rozdílů), nebo dotisk zámků před RP vrátit na starý tvar. |
| K70-I4 | info | ne | DT: SoD (realizace i PROJ) neodeslané zakázky nese v příloze č. 1 „ze dne <den tisku>“ místo data zakázky; u odeslané 9856 datum zámku. Záměr DT #745 (kolo 57). |
