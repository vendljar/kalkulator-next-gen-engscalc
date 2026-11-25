# Spuštění propojení s Pipedrive na ostrém webu (main) — procedura

Živý kontrolní seznam (J. V. 23. 11. 2026). Koordinace ho vede i v kokpitu („Spuštění Pipedrive na main“).
Stav: ☐ čeká · ◐ rozpracováno · ☑ hotovo. Roadmapa #730 (zastřešuje #16, #510, #597, #623, #723, #728, #729).

## A. Ověřeno na testu (testengscalc, deal TEST 432)

| # | krok | kdo | stav |
|---|---|---|---|
| A1 | `PIPEDRIVE_ZAPIS = ano` na testengscalc | J. V. | ☑ 23. 11. |
| A2 | Webhook „Vygenerovat nabídku“ založí kalkulaci a zapíše „Odkaz na kalkulaci“ do dealu | testovací sezení | ☑ 23. 11. (v23.11.1) |
| A3 | Poznámky šachet a zákazníků do dealu, ochrany (cizí zakázka, staré razítko, organizace bez IČO) | testovací sezení | ☑ 23. 11. |
| A4 | Druhá automatizace „Deal - generate offer -> send data to Make“ vypnuta (reagovala na stejné pole) | J. V. | ☑ 23. 11. |
| A5 | RA na testu: „V pořádku“ jen administrátor (#723), log výsledku webhooku | koordinace → test | ☐ |
| A6 | Kalkulace z Pipedrive se otevře rovnou k úpravám (#728) | dávka → test | ☐ |
| A6b | Autor kalkulace z webhooku = vlastník dealu (#734) | dávka → test | ◐ hotovo v dávce PV (`claude/pv-pipedrive`, v23.11.7), čeká na revizi, test a ověření na dealu TEST (vlastník s účtem ve stejném e-mailu) |
| A7 | Kontaktní osoba z dealu jen jméno, bez e-mailu a telefonu (#729) | dávka → test | ☐ |
| A9b | Odeslání nabídky do dealu (#116, J. V. 24. 11.): první tisk CN → tabulka „dnes / nově“ → potvrzení → pole krycího listu, CN, hodnota, fáze 22 → 23 (jen dopředu), poznámka „Nabídka odeslána“, Word jako soubor | dávka → test, pak testovací sezení | ◐ hotovo v dávce PO (`claude/po-odeslani-pipedrive`, jen simulátor), čeká na revizi Fable a test; pak zkušební zápis na deal TEST (souhlas J. V.): fáze 23, poznámka jedna, soubor u dealu, stav dealu beze změny, „zapsáno“ v kartě a protokolu; ověřit strop velikosti souboru Netlify / Pipedrive. Volitelně `PIPEDRIVE_FAZE_ODESLANO` (id nebo název fáze; výchozí „Nabídka odeslána“) |
| A8 | Vazba „čeká / V pořádku“ a vypnutý zápis (dosud neověřeno bez zásahu do nastavení) | testovací sezení | ☐ |
| A9 | Plný průchod: deal → kalkulace → tisk nabídky → Prodáno → potvrzení tabulky → zápis prodeje (#597) | J. V. + testovací sezení | ◐ zápis #597 hotový v dávce PV (jen simulátor); po nasazení do testu zkušební zápis na deal TEST: tabulka „dnes / nová“, hodnota dealu, fáze 26, stav dealu beze změny, CN, „zapsáno“ v kartě a protokolu |

## B. Rozhodnutí J. V. před main

| # | rozhodnutí | stav |
|---|---|---|
| B1 | Zápis prodeje do dealu (#597) — **rozhodnuto dříve**: údaje krycího listu podle mapy polí (23. 10., zasláno integrátorovi), fáze „Vyhrané k podpisu SoD“ bez změny stavu (#545, 2. 11.), hodnota dealu = cena řídící (vítězné) varianty bez DPH, kombinovaná = součet, po SoD cena díla (23. 10., SEC-I17 26. 10., 16. 11.); jen po potvrzení „stará → nová“ (#115); DPH přenesená → „0 % – přenesená daňová povinnost“, u kombinované rozhoduje OCK; text nad 255 znaků se nepošle s důvodem | ☑ ověřeno 23. 11. → dávka #597 |
| B2 | Token pro ostrý provoz — **rozhodnuto 23. 10.**: token z účtu J. V., který vidí všechny dealy (mapa polí pro integrátora, otázka 17); zápisy v historii dealů ponesou jeho jméno | ☑ |
| B3 | Zkušební funkce na main — **J. V. 23. 11.**: přepínač „Víc šachet“ (poznámka šachet) hned; „Víc zákazníků“ (poznámka zákazníků + organizace = vítěz) až po průchodu A9 na testu | ☑ |

## C. Den spuštění na main (v tomto pořadí)

| # | krok | kdo | stav |
|---|---|---|---|
| C1 | Integrace s A5–A9 a dávkou #597 v test, celé kolo zelené, zkoušky na testu bez vysokých nálezů | koordinace | ☐ |
| C2 | Sloučení test → main (pokyn J. V.), tag a release | J. V. | ☐ |
| C3 | Netlify engscalc: `PIPEDRIVE_TOKEN` (uživatel z B2), `PIPEDRIVE_DOMENA`, `PIPEDRIVE_WEBHOOK_KLIC` (nový, ne z testu), `PIPEDRIVE_ZAPIS = ano` | J. V. | ☐ |
| C4 | Pipedrive automatizace „Vygenerovat nabídku → kalkulátor“: adresa webhooku na **engscalc** (ne testengscalc), klíč z C3 | J. V. | ☐ |
| C5 | Pipedrive automatizace: **zrušit omezení „Systémové pole - filtr - nemazat = 432“** nebo ho nahradit pravidlem (pipeline / fáze) | J. V. | ☐ |
| C6 | Automatizace do Make zůstává vypnutá (nebo se nesmí potkat se stejným polem) | J. V. | ☐ |
| C7 | Nasazení (deploy) engscalc po nastavení proměnných, `/api/zdravi` = nová verze | J. V. / koordinace | ☐ |
| C8 | Kouřová zkouška na jednom skutečném dealu: odkaz zapsán, kalkulace správná, log webhooku bez chyby | J. V. + koordinace (jen čtení logu) | ☐ |
| C9 | Testovací web: rozhodnout, zda tam zápis zůstane zapnutý (ostrý účet Pipedrive!) — doporučení: vypnout nebo jen deal TEST | J. V. | ☐ |
