# Controlling — otevřená rozhodnutí pro J. V. (C3 #537, 27. 10. 2026)

Příprava na dokončení #500 („co zbývá po #447"). Kód controllingu se v dávce C3 neměnil. Zdroje: nálezy
koordinace z ukázky na 5 nabídkách 21. 10. 2026 (`PREDAVKA.md`, oddíl C3 + C4), roadmapa #447 a #500,
`podklady/CONTROLLING_NAVRH_20_10.md` (otázky A1–A6 pro controlling), CHANGELOG v21.10.1–v23.10.2 a nová ukázka
`podklady/controlling/UKAZKA_2026-CONTROLLING-EXPORT_v27.10.1.xlsx` (smyšlená data, dnešní kód — viz
`podklady/controlling/POPIS.md`).

**Stav nálezů z ukázky 21. 10.:** (2) zamčená jen neřídící varianta a (3) přepočtený výsledek vyřešila C5
(v21.10.5). **(1) a (4) platí i dnes** — ověřeno novou ukázkou nad v27.10.1. K nim přibyly body, které vyšly
při přípravě: výchozí výběr „podle prodeje" bez prodeje bez příplatků, výchozí filtr „vyhráno" proti ručnímu deal id, nález B z testu záloh, nefunkční stará ukázka.

Formát: každá otázka má **krátký nadpis (≤ 12 znaků)** pro dialog, 2–4 varianty (popis 1–2 věty), doporučenou
variantu (vždy první), dopad a odhad práce. Seřazeno podle důležitosti.

---

## 1. Prodej — výchozí výběr „podle data prodeje" nezná prodej bez objednaných příplatků

**Otázka:** Podle čeho má hromadný export poznat prodanou zakázku, když „datum prodeje" dnes vzniká jen se
záznamem objednaných příplatků?

Fakta: výchozí výběr je od 22. 10. `podle = prodej` (`ctrlHromadnyFiltr`, `src/controlling.js:728`, pokyn J. V.
„ať je to jistější"). Prodej = `zak.objednane` s aspoň jedním klíčem (`ctrlHromadnyZakazka`, :843–845); bez
objednaných příplatků záznam nevznikne (`objNastav` ho smaže, `src/objednane.js:248`). Zakázka podepsaná
**bez** příplatků proto z výchozího exportu vypadne jako „bez prodeje" (nehlásí se ani v Popisu). Ověřeno
ukázkou D1 (5 zakázek) s výchozími volbami: nevyveze se žádná — 4× „bez prodeje", 1× „jiný stav Pipedrive"
(objednané příplatky má, deal ne).

| Nadpis | Varianta | Popis |
|---|---|---|
| **Prodej** | **A — prodej = podpis SoD (doporučeno)** | Datum prodeje bude datum podpisu z krycího listu / záznam tisku SoD; objednané příplatky jen doplní, kterou variantu a co zákazník přiobjednal. |
| | B — výchozí podle zamčení | Hromadný export bez parametru vybírá podle dne zamčení (odeslání nabídky); „podle prodeje" zůstane volbou. |
| | C — tlačítko „Prodáno" | U zakázky přibude ruční záznam prodeje (varianta + datum) nezávislý na příplatcích. |
| | D — nechat | Beze změny; obchodník musí u prodané zakázky zapsat objednané příplatky, jinak ji controlling nedostane. |

- **Dopad:** dnes výchozí export pro PRE × POST vynechá prodané zakázky bez příplatků — pravděpodobně většinu.
  A mění rejstřík (`ctrlRejstrikDny`) a výběr, B vrací stav před 22. 10.
- **Odhad:** A M (4–6 h vč. rejstříku a mutací), B XS (0,5 h), C M (5–7 h), D 0 h.

## 2. Deal id — výchozí filtr exportu „vyhráno" potřebuje deal, deal zadává jen správce ručně

**Otázka:** Jak se má do zakázky dostat Pipedrive deal id, když hromadný export controllingu ve výchozím stavu
bere jen zakázky s dealem ve stavu „vyhráno"?

Fakta: výchozí filtr `pd = won` (E1 #504, `ctrlHromadnyFiltr`, `src/controlling.js:730`); stav se bere jen u
zakázky s platným `pdDealId` (`ctrlPdStavZakazky`, :1001). Deal id dnes vyplňuje **jen administrátor ručně**
v Nastavení → Controlling → Export (`src/ui/controlling_ui.js:470`, C4); automatické převzetí není na co navázat.
Zakázka bez dealu tedy z výchozího exportu tiše vypadne (Popis ji počítá jen v „Vyřazeno filtrem — bez stavu").

| Nadpis | Varianta | Popis |
|---|---|---|
| **Deal id** | **A — obchodník zadá deal (doporučeno)** | Pole deal id v hlavičce zakázky smí vyplnit i obchodník (dnes jen admin); server dál hlídá tvar a změnu po podpisu SoD jen admin. |
| | B — výchozí filtr „Všechny" | Hromadný export bez parametru vezme všechny stavy; filtr „vyhráno" zůstane na výběr. |
| | C — doplní správce dávkově | Zůstane ručně jen admin; před každým exportem J. V. doplní dealy chybějícím zakázkám. |
| | D — nechat | Beze změny; Popis exportu počet vyřazených bez dealu uvádí. |

- **Dopad:** bez změny dává výchozí export v ostré databázi jen zakázky, kterým admin deal vyplnil — PRE × POST
  bude neúplné. A mění práva (matice `test_prava`, `BEZPECNOST_MEZE.md`); B mění výchozí chování z rozhodnutí
  J. V. 22. 10.
- **Odhad:** A M (4–6 h vč. práv a mutací), B S (1 h), C 0 h kódu, D 0 h.

## 3. Záloha — záloha výchozího controllingu (nález B z testu J. V.)

**Otázka:** Co má obnova udělat, když záloha vznikla v době, kdy správce controlling ještě nikdy neuložil
(aplikace jela na výchozím rozvržení z kódu)?

Příčina nálezu B (ověřeno pokusem, poslána koordinaci pro O-T #529): bez záznamu `program/controlling` nese
záloha `controlling: null` (`netlify/lib/zalohovani.mjs:61` a `:80`, otisk `:321`/`:336`) a obnova i náhled
jednozáznamovou část s `null` přeskočí s textem „záloha tuto část nenese" (`netlify/functions/obnova.mjs:567–573`).
Data nechybějí — jsou „výchozí z kódu". Skutečná mezera: obnova takové zálohy do databáze, kde už je uložená
odchylka, controlling na výchozí **nevrátí**.

| Nadpis | Varianta | Popis |
|---|---|---|
| **Záloha** | **A — obnovit jako výchozí (doporučeno)** | Režim „přepsat" zapíše výchozí rozvržení jako novou verzi s poznámkou „výchozí ze zálohy" (historie zůstane); náhled ukáže „výchozí rozvržení z kódu". |
| | B — jen opravit hlášku | Náhled napíše „výchozí rozvržení (na serveru nic uloženého) — beze změny"; obnova controlling nemění. |
| | C — záznam vždy existuje | Server uloží výchozí rozvržení jako verzi 1 při prvním čtení, takže záloha nikdy nenese `null`. |

- **Dopad:** A drží zásadu „obnova vrací stav ze zálohy"; B jen odstraní matoucí text; C mění data v databázi
  bez zásahu správce.
- **Odhad:** A S (2–3 h + test s pojistkou), B XS (1 h), C S (2 h). Dělá O-T #529 (nebo navazující dávka).

## 4. Zaokrouhlení — obchodní zaokrouhlení ceny OCK nahoru export neukazuje (nález 1)

**Otázka:** Jak má export ukázat zaokrouhlení základní ceny OCK nahoru na tisíce?

Fakta: jádro zaokrouhluje základ `CEIL(zakladCena, 1000)` (`src/engine.js:2134`) dřív, než ho export vidí;
`cenaNabidkyOck` pak počítá zaokrouhlení jen z obchodního zaokrouhlení nabídky (`src/zaokrouhleni.js:173–191`).
Souhrn v listu Kapitoly má „Zaokrouhlení (Kč)" = 0 u všech OCK (ukázka: 0 ze 3) a součet prodejních cen řádků
je o zaokrouhlení nižší než „Cena před slevou" (v ukázce rozdíl do 0,05 %, na zakázku vždy pod 1 000 Kč).
Náklady to neovlivní — jen prodejní stranu a marži po skupinách.

| Nadpis | Varianta | Popis |
|---|---|---|
| **Zaokrouhlení** | **A — v souhrnu zakázky (doporučeno)** | Sloupec „Zaokrouhlení (Kč)" v souhrnu Kapitol ponese i rozdíl CEIL na tisíce; Řádky beze změny, import v Reportingu se nemění. |
| | B — samostatný řádek | V Řádcích přibude pseudo-řádek „Obchodní zaokrouhlení" (náklad 0, prodej = rozdíl, skupina „není náklad"). |
| | C — rozpustit do skupin | Rozdíl se rozpočítá do prodejních cen skupin poměrem; součet sedí, řádky se mírně změní. |
| | D — nechat | Jen věta v listu Popis, že prodejní cena řádků je před zaokrouhlením na tisíce. |

- **Dopad:** B mění počet řádků (kontingenční tabulky controllingu); C mění čísla řádků. Controlling se zeptá
  šablonou (list Otázky, Q7) — rozhodnutí může počkat na prosinec, A je bezpečné hned.
- **Odhad:** A S (2 h), B S–M (3–4 h), C M (4–6 h), D XS.

## 5. Podíly — podíly skupin v Kapitolách nedávají 100 % (nález 4)

**Otázka:** Mají podíly nákladových skupin v listu Kapitoly dávat součet přesně 100 %?

Fakta: podíl každé skupiny se zaokrouhluje zvlášť na 2 místa (`ctrlExportListy`, `src/controlling.js:1084`);
v nové ukázce 100,02 % a 99,98 % u dvou OCK zakázek (21. 10. bylo 100,01 %). Částky (Kč) jsou přesné.

| Nadpis | Varianta | Popis |
|---|---|---|
| **Podíly** | **A — dorovnat na 100 % (doporučeno)** | Zbytek po zaokrouhlení přičte skupina s největším podílem (metoda největšího zbytku); částky beze změny. |
| | B — víc desetinných míst | Podíl na 4 desetinná místa; odchylka klesne pod 0,001 %, ale nezmizí. |
| | C — nechat | Věta v Popisu, že podíly jsou zaokrouhlené zvlášť. |

- **Dopad:** jen sloupec „Podíl na nákladu (%)"; struktura souboru beze změny.
- **Odhad:** A S (1–2 h), B XS, C XS.

## 6. Protokol — protokol exportů controllingu v záloze

**Otázka:** Má záloha nést protokol hromadných exportů (`program/controlling_exporty` — kdo, kdy, jaké období)?

Fakta: dnes je výslovně vyjmutý (`netlify/test_zalohy.mjs:229`, C3 21. 10.: „stopa přístupu, ne data k obnově").
Po ztrátě databáze by zmizela jediná stopa, kdo vyvezl nákupní ceny.

| Nadpis | Varianta | Popis |
|---|---|---|
| **Protokol** | **A — zálohovat, neobnovovat (doporučeno)** | Protokol jde do otisku i stažené zálohy jako doklad; obnova ho nepřepisuje (jako kniha smazaných účtů). |
| | B — zálohovat i obnovovat | Protokol se po obnově vrátí do databáze (s očistou tvaru). |
| | C — nechat mimo | Beze změny, výjimka zůstane. |

- **Dopad:** A/B zvětší zálohu jen o malý záznam; mění test úplnosti záloh (N4) a obnovu.
- **Odhad:** A S (2–3 h), B S–M (3–4 h), C 0 h.

## 7. PROJ skupiny — rozvržení ceníku projekce

**Otázka:** Platí navržené rozvržení PROJ (Projekce – vlastní práce / subdodávky / Inženýrská činnost
a projednání / Cestovné) jako výchozí, než ho controlling v prosinci potvrdí?

Fakta: výchozí mapování v kódu už všech 16 klíčů PROJ do těchto skupin zařazuje (návrh B2), účty Helios u
skupin PROJ jsou prázdné. Šablona (list Mapování PROJ) návrh nese k potvrzení.

| Nadpis | Varianta | Popis |
|---|---|---|
| **PROJ skupiny** | **A — platí, potvrdí controlling (doporučeno)** | Nechat návrh jako výchozí; controlling ho šablonou potvrdí nebo opraví, J. V. nahraje import XLSX. |
| | B — označit předběžné | Do listu Popis přibude věta „rozvržení PROJ předběžné do potvrzení controllingem". |
| | C — PROJ zatím nevyvážet | Hromadný export do potvrzení nabídne jen OCK. |

- **Dopad:** C ubere controllingu data PROJ; B jen text.
- **Odhad:** A 0 h, B XS (0,5 h), C S (1–2 h).

## 8. Účty Helios — jak se doplní budoucí účty

**Otázka:** Jak se do kalkulátoru dostanou budoucí účty Helios a případné úpravy číselníku od controllingu?

Fakta: budoucí účet chybí u 15 z 18 skupin; Nastavení → Controlling umí export a import mapování XLSX
(`ctrlUiMapaImport`, C2); controlling účet nedostane (J7).

| Nadpis | Varianta | Popis |
|---|---|---|
| **Účty Helios** | **A — šablona + import J. V. (doporučeno)** | Controlling vyplní `SABLONA_PODKLADU_CONTROLLING.xlsx`, sezení z ní připraví soubor importu a J. V. ho nahraje a zveřejní. |
| | B — ručně v Nastavení | J. V. přepíše účty ručně podle e-mailu controllingu. |
| | C — vlastní právo controllingu | Zřídit právo `controlling.export`/úpravy pro zvláštní účet (dnes zamítnuto J7). |

- **Dopad:** A drží rozhodnutí J7 a nechá stopu (verze mapování); C otevírá přístup k nákupním cenám.
- **Odhad:** A S (2 h převod šablony na import, až přijdou data), B 0 h kódu, C M–L.

## 9. Šablona — kdy poslat šablonu podkladů controllingu

**Otázka:** Kdy poslat controllingu šablonu podkladů (`podklady/controlling/SABLONA_PODKLADU_CONTROLLING.xlsx`)
a ukázkový export?

| Nadpis | Varianta | Popis |
|---|---|---|
| **Šablona** | **A — teď, s termínem do prosince (doporučeno)** | J. V. pošle šablonu a ukázku hned; controlling vyplní po návratu a #500 se dokončí v prosinci bez čekání na otázky. |
| | B — až po návratu | Poslat v prosinci spolu s vysvětlením na schůzce. |
| | C — nejdřív upravit | J. V. šablonu projde a sezení ji upraví podle připomínek. |

- **Dopad:** jen termín; obsah šablony hlídá test (`src/test_sablona_controlling.js`).
- **Odhad:** 0 h kódu (C: 1–2 h úprav).

## 10. V nabídce — sloupec „V nabídce" u příplatků (bod 3 z C3, nerozhodnuto od 21. 10.)

**Otázka:** Má export dostat sloupec „V nabídce" (ano – v ceně / ano – jako možnost / ne – netištěno)?

Fakta: C5 rozdělila export na list Řádky (jen cena nabídky + objednané) a list „Příplatky – volby"; text je na
jednom místě `ctrlVZakladuText` (`src/controlling.js:1034`).

| Nadpis | Varianta | Popis |
|---|---|---|
| **V nabídce** | **A — nedělat, stačí listy C5 (doporučeno)** | Rozdělení na dva listy a sloupec „V základní ceně" už říká totéž; bod #447/3 uzavřít. |
| | B — přidat sloupec | Doplnit tři stavy včetně „netištěno" (příplatek skrytý v tisku); zvýší verzi struktury na 4. |

- **Dopad:** B mění strukturu souboru (import v Reportingu).
- **Odhad:** A 0 h, B S–M (3–4 h).

## 11. Stará ukázka — nefunkční generátor ukázky z 22. 10.

**Otázka:** Co se starou ukázkou `podklady/ukazky/vyrob_controlling_export_v2.js` (+ `.xlsx`, `.md`)?

Fakta: po #504 (výchozí výběr podle data prodeje, filtr „vyhráno") skript žádnou zakázku nevyveze a končí
chybou; navíc zapisoval slevu ve starém tvaru (neuplatnila se). Nástupce `nastroje/ukazka_controlling_export.js`
běží v každém kole (`src/test_ukazka_controlling.js`).

| Nadpis | Varianta | Popis |
|---|---|---|
| **Stará ukázka** | **A — smazat, odkázat na nový (doporučeno)** | Smazat skript a sešit v2, v `.md` nechat odkaz na nový nástroj; upravit `src/test_kontrola_udaju.js`, který na sešit odkazuje. |
| | B — nechat jako archiv | Ponechat beze změny s poznámkou „nefunkční od v22.10.6". |

- **Dopad:** jen dokumentace a jeden test.
- **Odhad:** A XS (0,5 h), B 0 h.

## 12. Verze — kdy zvýšit verzi struktury exportu

**Otázka:** Zvýšit „Verzi struktury souboru" (dnes 3) i při změně hodnot (body 4, 5), nebo jen při změně
sloupců a listů?

| Nadpis | Varianta | Popis |
|---|---|---|
| **Verze** | **A — jen sloupce a listy (doporučeno)** | Verze se zvedá, když se mění tvar souboru; změna výpočtu hodnot jde do CHANGELOG a listu Popis. |
| | B — při každé změně | Každá změna exportu zvedne verzi; controlling ji uvidí, ale import musí verzi znát. |

- **Dopad:** jen pravidlo; ovlivní body 4, 5, 10.
- **Odhad:** 0 h.

---

## Shrnutí pro dialog

| # | Nadpis | Doporučeno | Odhad |
|---|---|---|---|
| 1 | Prodej | A — prodej = podpis SoD | M |
| 2 | Deal id | A — obchodník zadá deal | M |
| 3 | Záloha | A — obnovit jako výchozí | S |
| 4 | Zaokrouhlení | A — v souhrnu zakázky | S |
| 5 | Podíly | A — dorovnat na 100 % | S |
| 6 | Protokol | A — zálohovat, neobnovovat | S |
| 7 | PROJ skupiny | A — platí, potvrdí controlling | 0 |
| 8 | Účty Helios | A — šablona + import J. V. | S (v prosinci) |
| 9 | Šablona | A — poslat teď | 0 |
| 10 | V nabídce | A — nedělat | 0 |
| 11 | Stará ukázka | A — smazat | XS |
| 12 | Verze | A — jen sloupce a listy | 0 |

Při všech doporučených variantách: kódová dávka M (≈ 1,5 dne) — body 1–6 a 11; body 7–9 bez kódu; bod 8
dokončí import po dodání vyplněné šablony (prosinec).

---

## Rozhodnuto 27. 10. 2026 (J. V., dialog nad tímto podkladem; kód v dávce C4 #540)

| # | Nadpis | Rozhodnutí | Provedení |
|---|---|---|---|
| 1 | Prodej | **C — tlačítko „Prodáno" na konci krycího listu** (OCK i PROJ). Stisk definitivně zamkne krycí list i volná pole (hlídá server), zapíše datum prodeje a prodanou variantu (controlling bere prodej odsud; objednané příplatky jen doplní přiobjednané; staré zakázky s objednanými příplatky dál platí jako prodej) a připraví zápis do Pipedrive (data krycího listu + deal „Vyhráno") — bez tokenu jen uložený „čeká na odeslání" s náhledem, do Pipedrive se nic nevolá. Odemknout smí vedoucí a administrátor s důvodem (stopa v historii), obchodník ne. Potvrzovací dialog. | C4 #540 |
| 2 | Deal id | **B — výchozí filtr hromadného exportu „Všechny"**; „vyhráno" zůstává volbou. | C4 #540 |
| 3 | Záloha | **B — jen hláška**; opravuje O-T #529. | O-T #529 |
| 4 | Zaokrouhlení | **A — v souhrnu zakázky**: „Zaokrouhlení (Kč)" v souhrnu Kapitol nese i rozdíl CEIL na tisíce; Řádky beze změny. | C4 #540 |
| 5 | Podíly | **A — dorovnat na 100 %** metodou největšího zbytku; částky beze změny. | C4 #540 |
| 6 | Protokol | **A — zálohovat, neobnovovat** (otisk i stažená záloha; obnova nepřepisuje, jako kniha smazaných účtů). | C4 #540 |
| 7 | PROJ skupiny | **A — platí výchozí**, potvrdí controlling. | bez kódu |
| 8 | Účty Helios | **A — šablona + import J. V.** | bez kódu teď (prosinec) |
| 9 | Šablona | Pošle se controllingu **v listopadu**; šablona se udržuje v souladu se změnami (test `src/test_sablona_controlling.js`). | průběžně |
| 10 | V nabídce | **A — nedělat**; bod #447/3 uzavřen. | — |
| 11 | Stará ukázka | **A — smazat** (`podklady/ukazky/vyrob_controlling_export_v2.js` + `.xlsx`), v `.md` odkaz na `nastroje/ukazka_controlling_export.js`. | C4 #540 |
| 12 | Verze | **B — při každé změně exportu** (i hodnot); C4 zvyšuje verzi struktury 3 → 4 a list Popis říká, co se změnilo. | C4 #540 |
