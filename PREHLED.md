# Přehled stavu — Kalkulátor Next Gen

Generuje `python3 nastroje/prehled_stavu.py` z evidence `roadmapa/roadmap.json` a gitu; ručně needitovat.
Bez cen a osobních údajů. Spouští koordinace po každém sloučení.

## Verze

| prostředí | verze |
|---|---|
| ostrý web (`main`) | **v11.11.1** (`6c4bc80e`, 11. 11. 2026) |
| testovací web (`test`) | **v18.11.4** (`9bd6dc8b`, 18. 11. 2026) |

Test je proti main napřed o 208 commitů.

## V testu, ještě ne v main

| # | typ | co | verze |
|---|---|---|---|
| #614 (dřív K40-N1) | nález | Vada ceny v main: po přepnutí typu šachty se čelní sklo přejmenuje a zůstane vyřazené (opraveno v testu v12.11.1) | v12.11.1 |
| #612 | úkol | S7: startovní podklady — CLAUDE.md podle schváleného návrhu, PREDAVKA jen živý stav, archiv předávek, log rozhodnutí J. V. | v18.11.4 |
| #611 | úkol | S3: porovnání dvou sestavení nad pevnou sadou kalkulací (nastroje/porovnej_sestaveni.sh, krok kola „porovnani“) | v18.11.3 |
| #608 (dřív C9) | úkol | C9: prohlížečové harnessy pod zátěží čekají na stav stránky; limity z KNG_HARNESS_TIMEOUT_MS | v18.11.1 |
| #606 | úkol | VZ-E6: rejstřík a Přehled (štítek, hledání podle dalšího zákazníka), controlling, překlady, příručky, celé kolo s mutacemi po částech | v17.11.2 |
| #604 | úkol | VZ-E5: Pipedrive: přepisovaná poznámka „Další zákazníci na zakázce“ u dealu (zobecnění pd_poznamka.mjs, společný časový rozpočet se šachtam… | v16.11.2 |
| #602 | úkol | VZ-E3: zámek po zákaznících: razítko „komu“ se snímkem adresáta, stav nabídky zákazníka, vlastní varianta, dotisk; odstranění zákazníka s o… | v16.11.6 |
| #601 | úkol | VZ-E2: čísla nabídek s písmenem zákazníka (…9940-B), tisk z pohledu zákazníka, kontroly před tiskem, test úniku údajů s kanárky (revize por… | v16.11.4 |
| #600 | úkol | VZ-E1: obrazovka: tlačítko „Přidat zákazníka“ a formulář v hlavičce (ARES a databáze zákazníků — zobecnění ares_ui.js na cíl), od 2. zákazn… | v16.11.2 |
| #599 | úkol | VZ-E0: vypínač viceZakazniku, jádro vice_zakazniku.js (model, písmena, pohled zákazníka, invarianty), import, serverová kontrola tvaru, zla… | v16.11.1 |
| #588 | úkol | VSD: seznam šachet nabídky do poznámky dealu Pipedrive (jedna poznámka na deal a zakázku) | v12.11.5 |
| #587 (dřív K43-T1) | úkol | K43-T1: overit_lista_cekani.mjs čeká na stav aplikace, ne pevný čas | v12.11.5 |
| #586 | úkol | VSD: upozornění vsTvar — víc šachet mimo meze uložení (K47-I3) | v12.11.5 |
| #585 (dřív C5) | úkol | C5: nástroj obnovy testovací sady zakázek TEST do testovací databáze (test_sada_obnov.mjs) | v12.11.4 |
| #584 (dřív C3) | úkol | C3: tečky „……“ místo nevyplněných symbolů smlouvy, kontrola před tiskem SoD (upozornění) | v12.11.6 |
| #583 (dřív C2) | úkol | C2: SoD realizace v5 se šachtami (předmět díla a rozpis ceny), upozornění u staré šablony | v12.11.6 |
| #582 (dřív C1) | úkol | C1: šablona CN v17 CZ/EN/DE/FR ke zveřejnění a jednotné nadpisy USAZENÍ OCK (DE, EN) | v12.11.3 |
| #581 (dřív K40c) | úkol | K40c: vazba kalkulace na deal z webhooku (upozornění, pojistka „Zrušit vazbu“), firma z ARES na serveru, „Opravit firmu v Pipedrive“ | v12.11.7 |
| #580 (dřív K40b, K40-S1, K40-N3, K40-S2) | úkol | K40b: dolní mez data prodeje z razítka přijetí zámku serverem (K40-S1, K40-N3) a levná diagnostika rozdílu zámku (K40-S2) | v12.11.2 |
| #579 (dřív K40a) | úkol | K40a: opravy kola 40 bez ceny — čelní sklo a sklo u šachet 2+, ořez konce textu, ceník můstků, kopie na Disku, hygiena testů | v12.11.1 |

## Otevřené vady s dopadem na cenu

| # | co | kolo | stav | čeká na |
|---|---|---|---|---|
| #614 (dřív K40-N1) | Vada ceny v main: po přepnutí typu šachty se čelní sklo přejmenuje a zůstane vyřazené (opraveno v testu v12.11.1) | 40 | opraveno v testu (v12.11.1), v main ne | J. V.: ověřit rozdíly cen main × test a dát pokyn ke sloučení do main (rychlá cesta) |

## Čeká na J. V.

| # | typ | co | čeká na |
|---|---|---|---|
| #19 | úkol | Notifikace a schvalování slev přes mobil | zadání a priorita (notifikace přes mobil zatím nezařazeny do dávky) |
| #28 | úkol | Napojit kalkulačku přes MCP na Claude | zadání a priorita (MCP napojení zatím nezařazeno do dávky) |
| #113 | úkol | CRM-14 — Výběr zakázky z Pipedrive v hlavičce kalkulace | API token a doména v proměnných Netlify (odsunuto 10. 8. 2026) |
| #115 | úkol | CRM-16 — Potvrzený zápis do obchodního případu | rozhodnutí z kontrolní tabulky — kolize dvou kalkulací nad jedním polem v CRM (odsunuto 10. 8. 2026) |
| #116 | úkol | CRM-17 — Odeslání vygenerované nabídky do případu | návaznost na #113 — token a doména v Netlify (odsunuto 10. 8. 2026) |
| #117 | úkol | CRM-18 — Souběžný zápis a synchronizace změn z CRM | rozhodnutí o nedopsaných polích v CRM (odsunuto 10. 8. 2026) |
| #172 | úkol | Dokončení auditu mimo cloud: zámek závislostí, etag, brzda v Netlify | lokální `npm install --package-lock-only` a pár kliknutí v administraci Netlify |
| #222 | otázka | Nálezy čekající na rozhodnutí J. V.: V8, N1, N5, V9, V10, V11, V13, V17, V24 | rozhodnutí J. V. — sloupec „Rozhodnutí J. V.“ na listu Nálezy (sešit VYHODNOCENI_TESTU_KALKULACE); testem se do té doby jen potvrzuje, že se chování nezměnilo |
| #598 | úkol | VZ: Víc zákazníků na jedné zakázce (souhrn etap E0–E6, zkušební funkce viceZakazniku) | ruční zkouška víc zákazníků na testu (vypínač viceZakazniku zapíná administrátor) |
| #614 (dřív K40-N1) | nález | Vada ceny v main: po přepnutí typu šachty se čelní sklo přejmenuje a zůstane vyřazené (opraveno v testu v12.11.1) | ověřit rozdíly cen main × test a dát pokyn ke sloučení do main (rychlá cesta) |
| #615 (dřív K48-N1, B1, C7) | nález | Smlouva o dílo v5 DE/EN vychází převážně česky — pojistka jazyka SoD (blokuje dávku C7 a sloučení do main) | pokyn ke spuštění pojistky jazyka SoD (doporučeno udělat) |
| #616 (dřív B2, C10) | rozhodnutí | Kdy sloučit test → main | termín (doporučeno spojit s rychlou cestou #614, zbytek po kole 49) |
| #617 (dřív B3, B0.1) | rozhodnutí | Víc šachet na ostrém webu (main) — po ruční zkoušce na testu se zapnutým vypínačem | ruční zkouška víc šachet na testu; rozhodnutí odloženo do 25. 11. 2026 |
| #619 (dřív B5, B0.6) | úkol | SoD projekce v4 zveřejnit i v main (main tiskne starší znění smlouvy) | datový úkol v main |
| #621 | otázka | SoD v5: umístění řádků šachet, řádek slevy v rozpisu, žluté tečky v realizaci, šum kontroly nevyplněných polí | rozhodnout (u řádku slevy doporučeno a) |
| #623 (dřív K40c-N6) | úkol | Token Pipedrive na test a první zkušební zápis (poznámka šachet, organizace) nad dealem TEST | dodat token, nebo odložit s datem (blokuje #510 a #16) |
| #624 (dřív K40c-N5) | otázka | Zakázka bez autora dostane autora z relace prvního ukládajícího (B73) | zvážit nedoplňovat autora u existující zakázky (na později) |
| #625 (dřív K44-I1, B7, B0.8) | úkol | Sazby skladebných můstků v ceníku testu, pak samostatné kolo na můstky | sazby doplní v testu (odložit s datem; sekce Můstky je prázdná, cena se nekazí) |
| #627 (dřív DP-D1–D8, DP-T1) | otázka | DP #573 termín DPZ a dotazy obchodu D1–D8, T1 | rozhodnout (obsah v artefaktu dotazů) |
| #628 | dávka | Zefektivnění programu | start po sloučení test → main |
| #629 | rozhodnutí | Jmenovat kolegu s rolí administrátora (jen test) | jmenuje |
| #630 | úkol | Nahrát skill testovaci-procedura-kng podle osnovy; zkrátit skill kalkulator-next-gen do 25 kB | nahrát skilly (mimo repo) |
| #631 | otázka | Revize diffu S7 (CLAUDE.md, rozdělení PREDAVKA) | revize (doporučeno schválit) |
| #633 (dřív N46) | otázka | Nástupiště A ↔ C u zrcadlové šachty — opravit? | pokyn (bez něj se neopravuje, fuzz hlásí jen INFO) |
| #636 (dřív B226) | otázka | Zbytková mez B226: souběh dvou instancí může založit organizaci v Pipedrive dvakrát | přijmout jako zbytkovou mez, nebo zadat zámek (doporučeno přijmout) |
| #637 | úkol | Ověřit hledání organizace (itemSearch) proti ostrému účtu Pipedrive — jen čtení | ověření (automat na ostrý účet nesmí) |
| #639 | otázka | Ruční cena: příloha PDF nabídky dodavatele a ruční cena v ceníku PROJ | rozhodnout, zda je potřeba |
| #640 (dřív B221) | otázka | Role jen ke čtení: „kdo smí ukládat“ je dnes každý přihlášený | zavést roli jen ke čtení? (doporučeno až s kolegou s rolí administrátora) |
| #642 | úkol | Zeštíhlení roadmap.json: hotové položky starší 60 dní do archivu (živý soubor kolem 60 položek) | souhlas (návrh režie S6 d; soubor má 1,2 MB) |
| #643 | úkol | Skill roadmapa-kng: typy položek, aliasy a pravidlo jedné řady čísel (S6) | nahrát upravený skill (mimo repo) |

K tomu 11 odložených položek (vlna F) — `python3 roadmapa/roadmapa.py --zive`.

## Nehotové položky evidence

Celkem 54: J. V. 41, kolega 6, koordinace 3, dávka 2, integrátor 2. Výpis: `python3 roadmapa/roadmapa.py --zive`.
