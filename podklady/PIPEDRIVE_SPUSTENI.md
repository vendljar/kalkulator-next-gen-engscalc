# Spuštění propojení s Pipedrive na ostrém webu (main) — procedura

Živý kontrolní seznam (J. V. 23. 11. 2026). Koordinace ho vede i v kokpitu („Spuštění Pipedrive na main“).
Stav k 25. 11. 2026. Stav: ☐ čeká · ◐ rozpracováno · ☑ hotovo. Roadmapa #730 (zastřešuje #16, #510, #597, #623, #723, #728, #729).

## A. Ověřeno na testu (testengscalc, deal TEST 432)

| # | krok | kdo | stav |
|---|---|---|---|
| A1 | `PIPEDRIVE_ZAPIS = ano` na testengscalc | J. V. | ☑ 23. 11. |
| A2 | Webhook „Vygenerovat nabídku“ založí kalkulaci a zapíše „Odkaz na kalkulaci“ do dealu | testovací sezení | ☑ 23. 11. (v23.11.1) |
| A3 | Poznámky šachet a zákazníků do dealu, ochrany (cizí zakázka, staré razítko, organizace bez IČO) | testovací sezení | ☑ 23. 11. |
| A4 | Druhá automatizace „Deal - generate offer -> send data to Make“ vypnuta (reagovala na stejné pole) | J. V. | ☑ 23. 11. |
| A5 | RA na testu: „V pořádku“ jen administrátor (#723), log výsledku webhooku | koordinace → test | ☑ v main od v23.11.2 |
| A6 | Kalkulace z Pipedrive se otevře rovnou k úpravám (#728) | dávka → test | ☑ v23.11.5 |
| A6b | Autor kalkulace z webhooku = vlastník dealu (#734) | dávka → test | ☑ v23.11.7, ověřeno na testu (kolo 55) |
| A7 | Kontaktní osoba z dealu jen jméno, bez e-mailu a telefonu (#729) | dávka → test | ☑ v23.11.5, ověřeno (K56-D) |
| A9b | Odeslání nabídky do dealu (#116, J. V. 24. 11.): první tisk CN → tabulka „dnes / nově“ → potvrzení → pole krycího listu, CN, hodnota, fáze 22 → 23 (jen dopředu), poznámka „Nabídka odeslána“, Word jako soubor | dávka → test, pak testovací sezení | ☑ test v25.11.1, ověřeno na dealu TEST 432 (OCK) i 437 (PROJ), kola 55 a 58 |
| A8 | Vazba „čeká / V pořádku“ a vypnutý zápis (dosud neověřeno bez zásahu do nastavení) | testovací sezení | ☐ |
| A9 | Plný průchod: deal → kalkulace → tisk nabídky → Prodáno → potvrzení tabulky → zápis prodeje (#597) | J. V. + testovací sezení | ☑ test v25.11.1, plný průchod 25. 11. (kola 55 a 58), zápis prodeje 31/35 polí |
| A10 | Doplnění polí: Datum nabídky (#763), K58-N1/N2 (dávka MD); kontakty, podpisy, Informováno, Platba 1–8, Nabídku vypracoval (dávka PD2) | dávky MD → PD2, pak testovací sezení | ◐ MD běží, PD2 po ní |

## B. Rozhodnutí J. V. před main

| # | rozhodnutí | stav |
|---|---|---|
| B1 | Zápis prodeje do dealu (#597) — **rozhodnuto dříve**: údaje krycího listu podle mapy polí (23. 10., zasláno integrátorovi), fáze „Vyhrané k podpisu SoD“ bez změny stavu (#545, 2. 11.), hodnota dealu = cena řídící (vítězné) varianty bez DPH, kombinovaná = součet, po SoD cena díla (23. 10., SEC-I17 26. 10., 16. 11.); jen po potvrzení „stará → nová“ (#115); DPH přenesená → „0 % – přenesená daňová povinnost“, u kombinované rozhoduje OCK; text nad 255 znaků se nepošle s důvodem | ☑ ověřeno 23. 11. → dávka #597 |
| B2 | Token pro ostrý provoz — **rozhodnuto 23. 10.**: token z účtu J. V., který vidí všechny dealy (mapa polí pro integrátora, otázka 17); zápisy v historii dealů ponesou jeho jméno | ☑ |
| B3 | Zkušební funkce na main — **J. V. 23. 11.**: přepínač „Víc šachet“ (poznámka šachet) hned; „Víc zákazníků“ (poznámka zákazníků + organizace = vítěz) až po průchodu A9 na testu | ☑ |

## C. Den spuštění na main (v tomto pořadí)

| # | krok | kdo | stav |
|---|---|---|---|
| C1 | Integrace s A5–A9 a dávkou #597 v test, celé kolo zelené, zkoušky na testu bez vysokých nálezů | koordinace | ◐ test v25.11.1 kola 55/57/58 OK; čeká MD + PD2 |
| C2 | Sloučení test → main (pokyn J. V.), tag a release | J. V. | ☐ main v24.11.7 (25. 11.) nese #597, ne #116; další main s #116, MD a PD2 |
| C3 | Netlify engscalc: `PIPEDRIVE_TOKEN` (uživatel z B2), `PIPEDRIVE_DOMENA`, `PIPEDRIVE_WEBHOOK_KLIC` (nový, ne z testu), `PIPEDRIVE_ZAPIS = ano` | J. V. | ☐ |
| C4 | Pipedrive automatizace „Vygenerovat nabídku → kalkulátor“: adresa webhooku na **engscalc** (ne testengscalc), klíč z C3 | J. V. | ☐ |
| C5 | Pipedrive automatizace: **zrušit omezení „Systémové pole - filtr - nemazat = 432“** nebo ho nahradit pravidlem (pipeline / fáze) | J. V. | ☐ |
| C6 | Automatizace do Make zůstává vypnutá (nebo se nesmí potkat se stejným polem) | J. V. | ☐ |
| C7 | Nasazení (deploy) engscalc po nastavení proměnných, `/api/zdravi` = nová verze | J. V. / koordinace | ☐ |
| C8 | Kouřová zkouška na jednom skutečném dealu: odkaz zapsán, kalkulace správná, log webhooku bez chyby | J. V. + koordinace (jen čtení logu) | ☐ |
| C9 | Testovací web: rozhodnout, zda tam zápis zůstane zapnutý (ostrý účet Pipedrive!) — doporučení: vypnout nebo jen deal TEST | J. V. | ☐ |
