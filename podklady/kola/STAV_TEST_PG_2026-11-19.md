# STAV – zkouška PG (tisk nabídky OCK, vlastní řádky NENÍ / DALŠÍ UJEDNÁNÍ, číslo stránky CN; roadmapa #684–#687) na testu, 19. 11. 2026

## Hlavička

- **Test:** v19.11.11 (`origin/test` cda289e; PG = v19.11.10 sloučené do D3). Main se nečetl.
- **Souhlas:** trvalý souhlas J. V. z 19. 11. (zápis na test). Zkouška ho nevyužila: **všechny zápisy byly blokované**
  (Playwright route: povolen jen GET a POST `/api/prihlaseni`, `/api/pd*` blokováno i pro GET).
  Zablokovalo se `GET /api/pd/stav` a `POST /api/analytika`. Nic se neuložilo.
- **Kdo:** testovací sezení Claude v Playwrightu, relace správce (`KNG_TEST_*`). Vlastní řádky se přidávaly a vyplňovaly klikem
  na obrazovce: tlačítko „+ přidat vlastní řádek“, pole popisku a textu, výběr sekce. Okna náhledů se otevírala funkcemi tlačítek
  (`nabidkaNahled`, `nabidkaOckDokument`, `nabidkaProjNahled`). Word vznikal přes `dokumentVygeneruj` ze serverové šablony
  (`sablonaProTisk`), stejně jako v `np.js`.
- **Harness:** `podklady/kola/harness_testovani/pg.js`. Výsledný (3.) běh dal **31 OK, 5 FAIL**. Všech 5 FAIL je jedna vada (PG-N1).
  Běhy 1 a 2 měly chyby v harnessu: přísné pořadí bloků PROJ (poznámka k termínům), hledání nadpisu v liště kontrol a klik myší
  na zamčené variantě.
- **Zakázky (jen v paměti, nic neuloženo):**
  - OCK `TEST - 2026 - OPR - CN - 9603 - K19T-C103`, klon zamčené varianty;
  - víc šachet `TEST - 2026 - OPR - CN - 9949 - K49`, klon zamčené Varianty 2 (2 šachty);
  - PROJ `TEST - 2026 - OVP - CN - 9820`, Varianta 1 (odemčená);
  - zamčená varianta pro bod c): 9603 Varianta 1 (9820 zamčenou variantu nemá).
- **Šablony na testu:** CN `Sablona_NABIDKA_CN_v17.docx` (verze 7), EN `…_v17_EN.docx` (verze 6), PROJ `Sablona_NABIDKA_PROJ_v8.docx` (verze 6).
  CN v18 ani PROJ v9 zatím nahrané nejsou. Nahraje je J. V.

## Výsledky

| bod | výsledek | poznámka |
|---|---|---|
| a) pořadí a barva tlačítek | ✅ 4/4 | Karta Cenová nabídka (OCK) pod specifikací má zleva: „Kompletní náhled podkladů“ → „Vytvořit nabídku (Word)“ (`primary`, modré) → „Kompletní náhled a tisk nabídky“ (bez třídy `primary`). Bez zábrany jsou všechna tři aktivní. Nová poznámka „Tlačítka jdou zleva v pořadí práce…“ je pod tlačítky. |
| a) zábrana | ✅ 3/3 | Zdvih 120 m (v paměti): `dokumentZabrana` vrátí „Kontrola před nabídkou — dokument nevznikne…: Zdvih 120 m je nad nejvyšším povoleným zdvihem 99 m…“. **Word i tisk jsou zhasnuté** (`disabled`, v `title` je důvod), **náhled podkladů zůstal aktivní** a okno se otevřelo. Po vrácení zdvihu jsou zase aktivní všechna tři. |
| b) obrazovka | ✅ 3/3 | U vlastního řádku je výběr „DALŠÍ UJEDNÁNÍ / SOUČÁSTÍ DODÁVKY NENÍ“. Po přepnutí prvního řádku je v datech `sekce: 'neni'` jen u něj, druhý řádek klíč `sekce` nemá. Na obrazovce stojí přepnutý řádek **poslední** v SOUČÁSTÍ DODÁVKY NENÍ (za „DOSTATEČNÉ PŘÍSTUPOVÉ…“) a druhý řádek zůstal pod nadpisem DALŠÍ UJEDNÁNÍ. Totéž platí v EN pohledu specifikace. |
| b) Kompletní náhled a tisk | ✅ CZ + EN | `nabidkaOckDokument`: řádek NENÍ je jednou, na konci sekce. Řádek DALŠÍ je za nadpisem DALŠÍ UJEDNÁNÍ / OTHER ARRANGEMENTS. |
| b) Word CN v17 | ✅ CZ + EN | Ve `word/document.xml` je řádek NENÍ hned za „DOSTATEČNÉ PŘÍSTUPOVÉ A MANIPULAČNÍ PROSTORY“ / „SUFFICIENT ACCESS AND HANDLING SPACE“ a před pruhem DALŠÍ UJEDNÁNÍ. Každý řádek je tam jednou. |
| b) náhled podkladů (`nabidkaNahled`) | ❌ **nález PG-N1** | CZ i EN: řádek NENÍ je správně na konci SOUČÁSTÍ DODÁVKY NENÍ, ale **objeví se podruhé** pod pruhem DALŠÍ UJEDNÁNÍ (2×, Word 1×). |
| b) víc šachet (9949-K49) | ✅ obrazovka, tisk, Word / ❌ náhled podkladů | Obrazovka: NENÍ → řádek NENÍ → DALŠÍ UJEDNÁNÍ → řádek DALŠÍ. Kompletní náhled a tisk CZ/EN i Word CZ/EN: řádek NENÍ je jednou a před pruhem DALŠÍ UJEDNÁNÍ. Ve Wordu je sekce NENÍ jednou, za smyčkou šachet. Náhled podkladů CZ/EN: zdvojení jako výše (PG-N1). **Jen řádek NENÍ** (bez řádku DALŠÍ): Word nemá pruh DALŠÍ UJEDNÁNÍ ✅. Náhled podkladů pruh DALŠÍ UJEDNÁNÍ má a řádek je tam 2× ❌. |
| b) starší zakázka | ✅ | Sken všech **328 TEST zakázek** (GET, všechny varianty) nenašel žádnou s neprázdným `techspec.extra`, takže uloženou starší zakázku nebylo s čím porovnat. Starší stav jsem proto ověřil v paměti: dva řádky bez pole `sekce` (tvar dat před PG). Ve Wordu i v náhledu podkladů jsou oba v DALŠÍ UJEDNÁNÍ, výběr na obrazovce ukazuje „DALŠÍ UJEDNÁNÍ“ a překreslení klíč `sekce` nepřidá (data zůstávají `label,hodnota`). |
| c) PROJ přidání řádků | ✅ 2/2 | Karta Cenová nabídka (PROJ) má „+ přidat vlastní řádek“ (`#projDalsiPridej`). Dva kliky a vyplnění daly `PJ.dalsiUjednani` = 2 řádky, druhý jen s popiskem (hodnota prázdná). |
| c) náhled PROJ | ✅ CZ + EN | V datech (`nabidkaProjData().bloky`) je pořadí TERMÍNY → poznámka k termínům → **DALŠÍ UJEDNÁNÍ**. V online náhledu (`nabidkaProjNahled`) následuje DALŠÍ UJEDNÁNÍ za větou „Termíny zpracování mohou být upraveny…“, s oběma řádky (i řádkem jen s popiskem), a za ní REKAPITULACE. EN má nadpis „OTHER ARRANGEMENTS“, vlastní texty se nepřekládají. |
| c) Word PROJ v8 | ✅ | Word se šablonou PROJ v8 (verze 6) vznikne bez vlastních řádků a bez zbylého symbolu `{{PROJ_DALSI…}}`. |
| c) kontrola před nabídkou | ✅ 2/2 | V `kontrolyStavAkt()` i v panelu je varování **dalsiUjednaniWordProj**: „Nabídka PROJ má 2 vlastní řádky DALŠÍ UJEDNÁNÍ, šablona nabídky PROJ „Sablona_NABIDKA_PROJ_v8.docx“ (verze 6) pro ně nemá místo ({{PROJ_DALSI_UJEDNANI_NAZEV}})… Nahrajte šablonu nabídky PROJ v9…“. Je to varování, ne zábrana: `dokumentZabrana('nabidkaProj')` je prázdné. Varování se řídí jazykem tisku (při EN cituje šablonu `…_v8_EN.docx`, verze 5). |
| c) zamčená varianta | ✅ | 9603 Varianta 1 (vytištěná CN): tlačítko „+ přidat vlastní řádek“ myší kliknout nejde, protože zamčená nabídka je jen ke čtení (`pointer-events`). Přímé zavolání tlačítka vyvolá dialog „Varianta … je uzamčená … Chcete pokračovat v klonu varianty?“. `dalsiUjednani` zamčené varianty zůstalo beze změny. Klon vznikl jen v paměti (odpověď „ano“ v harnessu) a neuložil se. |
| d) průvodce šablon | ✅ | `sablPruvodceStart('nabidka', …)` nad platnou CN `Sablona_NABIDKA_CN_v17.docx` (verze 7) ukáže v krocích kontroly **varování** (ne chybu): „Číslo stránky je pevný text („1“ v záhlaví), ne pole PAGE — každá vytištěná stránka bude mít „1“. Opravte šablonu (nastroje/vyrob_sablony.js --cn-v18, nebo ve Wordu Vložit → Číslo stránky).“ Průvodce jsem zrušil (`sablPruvodceZrus`), nic se nezveřejnilo. |

## Nálezy

- **PG-N1 (nízká až střední, náhled podkladů OCK; cenu ani Word nemění):** v okně „Kompletní náhled podkladů“ (`nabidkaNahled`,
  vzhled Wordu z NP v19.11.9) se vlastní řádek přepnutý na SOUČÁSTÍ DODÁVKY NENÍ ukáže **dvakrát**. Jednou správně na konci sekce
  NENÍ a podruhé pod pruhem DALŠÍ UJEDNÁNÍ. Když jsou vlastní řádky jen NENÍ, náhled navíc ukáže pruh DALŠÍ UJEDNÁNÍ, který Word
  nemá. Platí pro 1 šachtu i víc šachet, v CZ i EN. Word, Kompletní náhled a tisk ani obrazovka vadu nemají.
  **Příčina (kód cda289e):** `src/nahled_word.js`, `nwBloky`, ř. 228–234. Sekce NENÍ přebírá řádky z `nabidkaNahledSekce`, kde je PG
  už přidal, ale blok DALŠÍ UJEDNÁNÍ pak bere celé `data.tsExtra` bez filtru `!e.neni`. Patrně jde o souběh větví: NP vznikla souběžně
  s PG a sloučila se do ní až v 42d5989, takže úprava PG #2 nový náhled minula. Test `test_pg_neni_radky.js` `nwBloky` nepokrývá.
  **Návrh opravy:** `const extra = (data.tsExtra || []).filter(e => !e.neni);` a test na `nwBloky` s řádkem NENÍ (řádek 1×, bez pruhu,
  když jiné řádky nejsou). Důkaz z běhu: `r1x: 2` v B5/B10 a `nahledDalsi: 1, nahledR1: 2` proti Wordu `wordDalsi: 0, wordR1: 1` v B12/B13.
- **PG-I1 (informace):** na testu zatím není CN v18 ani PROJ v9. Proto je upozornění průvodce (d) na platné CN v17 očekávané a Word
  PROJ zatím vlastní řádky netiskne (c). Číslování stránek ve Wordu a řádky PROJ ve Wordu ověří až zkouška po nahrání šablon (J. V.).

## Úklid

- Na testu se nic nezměnilo. Všechny zápisy byly blokované (zablokováno jen `POST /api/analytika` a `GET /api/pd/stav`).
- Klony variant (9603, 9949, druhý klon 9603 z dialogu zámku), vlastní řádky, zdvih 120 m a řádky PROJ v 9820 existovaly jen
  v paměti stránky a zanikly zavřením prohlížeče.
- Průvodce šablon zrušen před zveřejněním. Šablony, číselníky, ceník ani Firma beze změny.
- Výstupy běhu (texty náhledů, docx) zůstaly jen v kontejneru, do repa nejdou: obsahují čísla a údaje TEST zakázek bez začernění.
