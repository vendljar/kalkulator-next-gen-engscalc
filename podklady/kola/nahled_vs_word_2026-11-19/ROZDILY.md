# Kompletní náhled podkladů OCK × Word CN v17 (19. 11. 2026, test v19.11.5)

Podklad pro návrh „náhled = vzhled Wordu“ (koordinace). Zakázka TEST 9603-K19T-C103 (1 šachta, technická specifikace,
4 příplatky). V **paměti** (nic se neuložilo, zápisy blokované) se z její zamčené varianty udělal klon (.3), sleva 3 %
a vlastní řádek DALŠÍ UJEDNÁNÍ „Vlastní ujednání (TEST)“.

- `nahled_01–06.png`: okno „Kompletní náhled podkladů“ (`nabidkaNahled`), šířka 1360, deviceScaleFactor 1, po obrazovkách 900 px.
- `word_01–06.png`: Word z generátoru (`dokumentVygeneruj('nabidka')`, šablona CN v17 CZ), LibreOffice → PDF → `pdftoppm -r 80`.
- **Začerněno (█):** všechny částky, rozměry šachty, letopočty a čísla zakázky, e-maily, telefony, IČ/DIČ a čísla popisná firmy,
  jméno obchodníka. Ve Wordu se začerňovalo v XML před převodem do PDF.

## Rozdíly

| oblast | Kompletní náhled podkladů | Word CN v17 |
|---|---|---|
| **pořadí sekcí** | HLAVIČKA → technická specifikace (ZÁKLADNÍ PARAMETRY … SOUČÁSTÍ DODÁVKY NENÍ, DALŠÍ UJEDNÁNÍ) → B. OBCHODNÍ ČÁST – CENOVÁ NABÍDKA → III → IV → V → VI → DOLOŽKY → DODAVATEL → **II. PŘÍPLATKY až na konci** | hlavička → Popis záměru → A. TECHNICKÁ ČÁST / I. TECHNICKÁ SPECIFIKACE → … DALŠÍ UJEDNÁNÍ → B. OBCHODNÍ ČÁST / I. CENOVÁ NABÍDKA → **II. PŘÍPLATKY hned za cenou** → III → IV → V → VI → DOLOŽKY → Vypracoval / Kancelář |
| **jen ve Wordu** | — | „Popis záměru“ (šedý blok s textem a odkazy), „Pohled na objekt z ulice“ (místo pro foto), nadpisy **A. TECHNICKÁ ČÁST NABÍDKY** a **I. TECHNICKÁ SPECIFIKACE**, **„I. CENOVÁ NABÍDKA“**, **řádek Sleva** (− částka, %), podpisový blok „Vypracoval“ (jméno, funkce, tel., e-mail) a „Kancelář“ |
| **jen v náhledu** | lišta „Tisk / Uložit jako PDF“, věta „Přesně tyto hodnoty se vyplní do šablony…“, sekce **DODAVATEL** (tabulka název, IČO, DIČ, zápis, sídlo, telefon, e-mail, web), řádky Kontaktní osoba / Objednatel zvlášť | — |
| **sleva** | ⚠ řádek slevy **chybí**, v obchodní části jen „Výtahová šachta (bez DPH) / DPH / CELKEM“ | „Sleva  − … (%)“ mezi cenou a celkem |
| **nadpisy** | šedomodré pruhy, verzálky, bez číslování technické části (jen B., III.–VI.), „DOLOŽKY“ bez dvojtečky | modré podtržené nadpisy s dvojtečkou („III. PLATEBNÍ PODMÍNKY:“), číslování A./B. a I.–VI. |
| **tabulky** | jedna dvousloupcová tabulka na sekci, tenké vodorovné linky, popisek tučně vlevo, hodnota vpravo (50/50) | tabulky s rámečkem kolem sekce, popisek vlevo verzálkami, hodnota vpravo (užší sloupec hodnot), u termínů a předání číslované seznamy v rámečku |
| **písmo** | Segoe UI (systémové bezpatkové), menší řádkování | Calibri (v PDF z LibreOffice Carlito), nadpisy Calibri tučně modře |
| **záhlaví** | žádné (jen název firmy modře nad nadpisem „Podklady nabídky …“) | na každé stránce: číslo stránky vpravo (**pevná „1“**, viz diagnostika ŠABLONY-STRÁNKY), oranžový grafický prvek, „Cenová nabídka“ šedě vlevo, logo ENGINEERS CZ vpravo, linka |
| **zápatí** | jednou dole: řádek s firmou (adresa, IČ) | na každé stránce: čárkovaná linka a {{FIRMA_PATICKA}} (firma, adresa, IČ) kurzívou modře |
| **logo** | ne (jen text „ENGINEERS CZ s.r.o.“) | ano (obrázek v záhlaví) |
| **stránkování** | jedna dlouhá stránka (6 obrazovek) | 6 stran A4, sekce zalomené podle šablony |

Poznámka k slevě: v náhledu se sleva 3 % neukázala, ve Wordu ano (stejná zakázka i varianta v paměti). Ověřit, zda náhled
slevu záměrně vynechává, nebo ji nečte.
