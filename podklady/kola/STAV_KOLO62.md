# STAV kola 62 — test v25.11.4, cílená sada G1 (#753, #754, #756, #794), bez Pipedrive (25. 11. 2026)

- **Sezení:** TESTOVÁNÍ 4 (`kalkulator-testovani`, session_018mwHQHn8gkmk4ksTXk6caP), Playwright (Chromium headless) na testengscalc, účet testera (administrátor).
- **Verze:** test **v25.11.4** (`/api/zdravi`; větev `test` 6e00203).
- **Souhlas se zápisy na test:** J. V. přímo v tomto sezení (kolo 61): „souhlasím vždy a v jakémkoliv rozsahu; ve jméně cenové nabídky vždy uváděj slovo TEST“.
- **Srovnávací stav:** Wordy stejných zakázek vytištěné v kole 61 na v25.11.3 (o hodinu dřív, týž den, tytéž šablony).
- **Bez cen a osobních údajů:** jména ze starých vlastností šablon sem nepíšu (jen „jméno osoby“).

## Zkušební data

| číslo | název akce | co v tomto kole |
|---|---|---|
| TEST - 2026 - OPR - CN - 9961 | TEST K61 – OCK dvě šachty (testování 4) | dotisk CN OCK CZ / EN / DE / FR, SoD OCK CZ / FR |
| TEST - 2026 - OVP - CN - 9962 | TEST K61 – PROJ (testování 4) | dotisk nabídky PROJ CZ / FR, SoD PROJ CZ / FR, plná moc |
| TEST - 2026 - OPR - CN - 9963 | TEST K62 – #756 ruční položka (testování 4) | nová, neodeslaná; ruční položky importem JSON; uložila se sama (automatické ukládání) |

## Výsledky

| bod | výsledek | poznámka |
|---|---|---|
| 1a #754 autor a „naposledy uložil“ | OK | Všech 11 souborů (CN OCK v18 CZ/EN/DE/FR, nabídka PROJ CZ/FR, SoD OCK CZ/FR, SoD PROJ CZ/FR, plná moc): `dc:creator` a `cp:lastModifiedBy` = ENGINEERS CZ s.r.o. CN v18 i ve druhé sadě `docProps/core0.xml` (S1). V kole 61 tam byla jména osob ze šablon. |
| 1b #794 Společnost a název | OK / **info** | `app.xml` Company = ENGINEERS CZ s.r.o. u CN, nabídky PROJ, SoD OCK a plné moci; plná moc i ve vlastní vlastnosti „Company“ (`custom.xml`, dřív úřad). `dc:title` u SoD PROJ prázdný (dřív „SMLOUVA O DÍLO“). **SoD PROJ (šablona v4 z LibreOffice) prvek Company nemá → Společnost zůstane prázdná** (K62-I1). |
| 1c žádné jméno zaměstnance | OK | Prohledány všechny XML části všech 11 souborů (vlastnosti, customXml, nastavení, `w:author`): žádné jméno ze starých vlastností ani autor revizí. |
| 1d obsah dokumentu beze změny | OK | Proti kolu 61: `word/document.xml`, záhlaví, zápatí a styly bajt po bajtu stejné (CN OCK CZ, SoD OCK CZ, nabídka PROJ CZ, SoD PROJ CZ, plná moc); liší se jen `docProps/app.xml`, `core.xml`, `core0.xml`, `custom.xml`. |
| 2a kontrola šablon (zveřejněné) | OK | V prohlížeči `sablonaObsahVady` nad všemi 17 zveřejněnými šablonami (CN v18 CZ/EN/DE/FR, PROJ v9 CZ/EN/DE/FR, SoD realizace v6 CZ/EN/DE/FR, SoD projekce v4 CZ/EN/DE/FR, plná moc): 0 vad. Nic se nezveřejňovalo. |
| 2b nová kontrola ZIP (F1) | OK | Plná moc se 4 cizími bajty mezi adresářem a koncovým záznamem ZIP → „Mezi ZIP adresářem a jeho koncem jsou cizí data (podvržený adresář)“; původní soubor 0 vad. Jen v paměti prohlížeče. |
| 2c tisky | OK | Všech 11 tisků bez hlášky; tisky DE/EN/FR z jazykových šablon. |
| 3a #756 běžná kalkulace | OK | Nová kalkulace bez ruční položky i s ruční položkou a nepřepsaným řádkem: žádné varování. |
| 3b #756 ruční položka + přepis | OK / **nález textu** | Import JSON s ruční položkou Spojovacího materiálu a Lakování (bez `kid`) → přepis množství SPOJOVACÍ MATERIÁL v Hrubé OCK → varování „rucniPolozkaPomer“ (úroveň 2) jen pro položku Spojovacího; po přepisu i LAKOVÁNÍ obě položky a oba řádky; po zrušení přepisů ticho. Varování je v kontrolách před tiskem (Technická specifikace OCK). Text v množném čísle → K62-N2. |
| porovnání s předchozím stavem | OK | Viz 1d. |

Automatické sady ani mutace se nepouštěly (stupeň 2, zkouška v rozhraní).

## Nálezy

| ID | vážnost | dopad na cenu | co |
|---|---|---|---|
| K62-N1 | střední | ne | Dotisk nad odeslanou zakázkou otevřenou jen ke čtení: záznam tisku se neuloží a ztratí |
| K62-N2 | nízká | ne | Varování #756 v množném čísle: „Ruční položky … bere cenu … řádku „A“ a „B“ …, který je ručně přepsaný“ |
| K62-I1 | info | ne | SoD PROJ: Společnost prázdná (šablona prvek nemá) |
| K62-I2 | info | ne | Jazyk tisku nabídky OCK přepne jazyk relace; další SoD a PROJ vyjdou v témže jazyce |
| K62-I3 | info | ne | Varování #756 (OCK) i v kontrolách před tiskem PROJ |

### K62-N1 — dotisk nad zakázkou jen ke čtení (střední, cena ne; není z G1)

Kroky: otevřít odeslanou TEST - 2026 - OPR - CN - 9961 (otevře se jen ke čtení) → Krycí list OCK → Vytvořit smlouvu o dílo (Word).
Stalo se: Word vznikne, do `zamek.tisky` a protokolu přibude záznam (typ, kdy, kdo, šablona, slovník, snímek SoD), ale jen v paměti —
`historieNeulozeno()` = true, uložit to nejde (jen ke čtení) a ani po 15 s se nic neuloží. Při otevření jiné zakázky dialog říká „výpočet se liší od uloženého
(část změn udělala aplikace sama — například automatické odškrtnutí ATYP)“ a nabídne jen „Zahodit“ / „Zůstat“. Po „Zahodit“ záznam o dotisku zmizí.
V tomto kole tak zmizely záznamy čtyř dotisků CN a dvou SoD. Rozdíl dat před a po tisku: jen `varianty[0].zamek.tisky` (+1) a `protokol` (+1).
Mělo se stát: záznam dotisku uložit na server (jako u prvního tisku), nebo ho vůbec nezapisovat. Dialog by neměl svádět na ATYP.
Pravděpodobně dlouhodobé (`zamkniVariantu` v `src/zamek.js` u uzamčené varianty jen přidá záznam do `tisky`), G1 se toho netýká.

### K62-N2 — text varování #756 v množném čísle (nízká, cena ne)

`src/kontroly.js` (pravidlo `rucniPolozkaPomer`): u dvou položek a dvou řádků vznikne „Ruční položky „Kotvy navíc …“ a „Lak navíc …“ **bere cenu** z poměru **řádku**
„SPOJOVACÍ MATERIÁL“ a „LAKOVÁNÍ (…)“ v Hrubé OCK, **který je ručně přepsaný**“. Správně: „berou cenu z poměru řádků …, které jsou ručně přepsané“.
Jedna položka a jeden řádek jsou v pořádku.

### Informace

- **K62-I1:** SoD PROJ (CZ i FR, šablona `Sablona_SOD_PROJEKCE_v4`, uložená v LibreOffice) nemá v `docProps/app.xml` prvek Company. Podle #754 se chybějící prvek
  nepřidává, takže Soubor → Vlastnosti → Společnost je prázdná. Jméno zaměstnance tam není. Zadání kola chce u všech „společnost = ENGINEERS CZ s.r.o.“.
  Rozhodnout: doplnit Company i tam, kde chybí, nebo nechat prázdné.
- **K62-I2:** „Jazyk tisku“ u nabídky OCK (JT) přepne i jazyk relace (`jazykSet`). Po francouzské nabídce a návratu na „dle Nastavení“ zůstane relace francouzsky
  (štítek „dle Nastavení (FR)“), a SoD OCK, nabídka PROJ i SoD PROJ pak vyšly francouzsky, ačkoli komentář u `TISK_JAZYK` slibuje jednorázovou volbu.
  Do Nastavení na serveru se jazyk neukládá: nové přihlášení má CZ.
- **K62-I3:** Varování #756 (týká se Kalkulace OCK) se ukazuje i v kontrolách před tiskem na stránce Kalkulace PROJ. Je to stejný vzor jako K61-N3.

## Úkoly a úklid

- Na testu přibyla zakázka 9963 (neodeslaná). Uložená verze (automatické ukládání) má importované ruční položky Spojovacího materiálu a Lakování a žádný přepis řádku Hrubé OCK.
  Smazat ji smí koordinace nebo J. V., já ji nechávám.
- U 9961 a 9962 se dotisky do zámku nezapsaly (viz K62-N1). Jinak beze změny.
- Nastavení, šablony ani vypínače jsem neměnil.
- Čísla nálezů do evidence přidělí koordinace.
