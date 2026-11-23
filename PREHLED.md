# Přehled stavu — Kalkulátor Next Gen

Generuje `python3 nastroje/prehled_stavu.py` z evidence `roadmapa/roadmap.json` a gitu; ručně needitovat.
Bez cen a osobních údajů. Spouští koordinace po každém sloučení.

## Verze

| prostředí | verze |
|---|---|
| ostrý web (`main`) | **v19.11.11** (`cda289e2`, 19. 11. 2026) |
| testovací web (`test`) | **v22.11.5** (`05a496d0`, 22. 11. 2026) |

Test je proti main napřed o 73 commitů.

## V testu, ještě ne v main

| # | typ | co | verze |
|---|---|---|---|
| #707 (dřív PR) | úkol | Připomínky z aplikace: tlačítko Připomínka (obchodník), Nastavení → Připomínky (správce), klíč pro koordinaci | v22.11.5 |
| #701 (dřív B195) | nález | B195: nulová ruční cena jen se zdrojem — ověřeno, text meze opraven | v22.11.3 |
| #700 (dřív B235, B236, IN-1, IN-2) | nález | B235/B236: vypínač zápisu do Pipedrive (výchozí vypnuto), deal musí patřit zakázce | v22.11.3 |
| #699 (dřív B234, AD-1) | nález | B234: kartu zákazníka mění jen autor a správce, návrhy změn, historie verzí | v22.11.3 |
| #698 (dřív B233, AU-1) | nález | B233: počítadla pokusů o přihlášení serializovaná (vyhradne) | v22.11.3 |
| #697 (dřív B232, AZ-2) | nález | B232: přísné ověření zmrazeného výsledku vyžaduje všechna čísla | v22.11.3 |
| #696 (dřív B231, AZ-1) | nález | B231: příznak strany zakázky (jenProj/jenOck) po zámku a Prodáno zmrazený | v22.11.3 |
| #695 (dřív HN-5) | úkol | Kolo: chybějící playwright = selhání s návodem; částečně přeskočená sada (PRESKOCENO_CAST) v souhrnu „Přeskočené sady“ | v22.11.2 |
| #691 (dřív NPT-N2, NPT-N3, NPT-N4) | nález | NPT-N2–N4: drobné odchylky náhledu od Wordu (verzálky jednotek, dvojtečka EN/DE, IČ/Tel. v bloku Kancelář) | v21.11.4 |
| #690 (dřív NPT-N1) | nález | NPT-N1: řádek SVĚTLÍKY U ŠACHETNÍCH DVEŘÍ je v náhledu podkladů, ale Word CN v17 ho nemá | v21.11.4 |
| #683 (dřív D8-I1) | nález | D8-I1: nabídka PROJ a krycí list rozhodují o „nabízí studii“ jinak (studie vyřazená s cenou 0) | v22.11.1 |
| #680 (dřív DO-N1) | nález | DO-N1: návrh obchodníka do číselníku u příplatku přechodových plechů (MATERIÁL) správce v Ceník → číselník nevidí | v21.11.4 |
| #674 (dřív VZ-F2-R2) | úkol | Víc zákazníků drobnosti po VZ-F2: pojistka v plnaMocData, IČO s úvodními nulami, dvojité „Neuloženo:“ | v22.11.1 |
| #673 (dřív VZ-F2-R1) | úkol | Suchý běh Pipedrive ukazuje ruční pole KL dalšího zákazníka jako údaje řídící varianty | v22.11.1 |
| #665 | úkol | Dotisk odeslané nabídky bere blok „Vypracoval“ z dnešního přihlášeného účtu, ne z doby odeslání | v22.11.1 |
| #647 (dřív K49-I4) | úkol | Pevná sada porovnání sestavení: přidat případ přepnutí typu šachty a zasklení (K40-N1) | v22.11.2 |
| #646 (dřív K49-I2) | úkol | Harness overit_sod.mjs: aktualizovat očekávání na šablony v4–v6 a tečky místo symbolů | v22.11.2 |
| #644 | úkol | Občasné selhání src/test_vz_unik.js: „výměna řídícího (B)“ — kanár „cena varianty A“ v JSON pohledu PROJ C EN/DE/FR | v22.11.2 |
| #638 | úkol | Nestabilní harnessy: overit_zobrazeni.mjs a overit_zaporne.mjs (limit přihlášení), test_577_kopie_skript.mjs T4 v mutacích | v22.11.2 |
| #635 | úkol | VZ: u upozornění sdílené varianty v krycím listu tlačítko „vlastní varianta“ | v22.11.1 |

## Otevřené vady s dopadem na cenu

| # | co | kolo | stav | čeká na |
|---|---|---|---|---|
| #614 (dřív K40-N1) | Vada ceny v main: po přepnutí typu šachty se čelní sklo přejmenuje a zůstane vyřazené (opraveno v testu v12.11.1) | 40 | oprava ve verzi v12.11.1, v testu ještě ne | — |
| #696 (dřív B231, AZ-1) | B231: příznak strany zakázky (jenProj/jenOck) po zámku a Prodáno zmrazený | 50 | opraveno v testu (v22.11.3), v main ne | — |

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
| #617 (dřív B3, B0.1) | rozhodnutí | Víc šachet na ostrém webu (main) — po ruční zkoušce na testu se zapnutým vypínačem | ruční zkouška víc šachet na testu; rozhodnutí odloženo do 25. 11. 2026 |
| #621 | otázka | SoD v5: umístění řádků šachet, řádek slevy v rozpisu, žluté tečky v realizaci, šum kontroly nevyplněných polí | rozhodnout (u řádku slevy doporučeno a) |
| #623 (dřív K40c-N6) | úkol | Token Pipedrive na test a první zkušební zápis (poznámka šachet, organizace) nad dealem TEST | dodat token, nebo odložit s datem (blokuje #510 a #16) |
| #624 (dřív K40c-N5) | otázka | Zakázka bez autora dostane autora z relace prvního ukládajícího (B73) | zvážit nedoplňovat autora u existující zakázky (na později) |
| #625 (dřív K44-I1, B7, B0.8) | úkol | Sazby skladebných můstků v ceníku testu, pak samostatné kolo na můstky | sazby doplní v testu (odložit s datem; sekce Můstky je prázdná, cena se nekazí) |
| #627 (dřív DP-D1–D8, DP-T1) | otázka | DP #573 termín DPZ a dotazy obchodu D1–D8, T1 | rozhodnout (obsah v artefaktu dotazů) |
| #629 | rozhodnutí | Jmenovat kolegu s rolí administrátora (jen test) | jmenuje |
| #630 | úkol | Nahrát skill testovaci-procedura-kng podle osnovy; zkrátit skill kalkulator-next-gen do 25 kB | nahrát skilly (mimo repo) |
| #631 | otázka | Revize diffu S7 (CLAUDE.md, rozdělení PREDAVKA) | revize (doporučeno schválit) |
| #633 (dřív N46) | otázka | Nástupiště A ↔ C u zrcadlové šachty — opravit? | pokyn (bez něj se neopravuje, fuzz hlásí jen INFO) |
| #636 (dřív B226) | otázka | Zbytková mez B226: souběh dvou instancí může založit organizaci v Pipedrive dvakrát | přijmout jako zbytkovou mez, nebo zadat zámek (doporučeno přijmout) |
| #637 | úkol | Ověřit hledání organizace (itemSearch) proti ostrému účtu Pipedrive — jen čtení | ověření (automat na ostrý účet nesmí) |
| #639 | otázka | Ruční cena: příloha PDF nabídky dodavatele a ruční cena v ceníku PROJ | rozhodnout, zda je potřeba |
| #640 (dřív B221) | otázka | Role jen ke čtení: „kdo smí ukládat“ je dnes každý přihlášený | zavést roli jen ke čtení? (doporučeno až s kolegou s rolí administrátora) |
| #643 | úkol | Skill roadmapa-kng: typy položek, aliasy a pravidlo jedné řady čísel (S6) | nahrát upravený skill (mimo repo) |

K tomu 14 odložených položek (vlna F) — `python3 roadmapa/roadmapa.py --zive`.

## Nehotové položky evidence

Celkem 51: J. V. 38, kolega 4, koordinace 7, integrátor 2. Výpis: `python3 roadmapa/roadmapa.py --zive`.
