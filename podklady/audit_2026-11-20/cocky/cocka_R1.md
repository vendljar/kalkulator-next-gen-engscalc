# Čočka R1 — regrese známých bezpečnostních nálezů B1–B150

Stav: `origin/test` v19.11.11 (cda289e) proti `origin/main` v11.11.1 (6c4bc80). Jen čtení kódu, lokální běhy, žádná síť.

## Závěr

- **Žádný nález B1–B150 se nevrátil.** Stav „VRÁTIL SE“ nemá ani jedno číslo.
- **Všechny opravy B1–B150 jsou i na `origin/main`.** Rozdíl main × test v `netlify/` (28 souborů) žádnou starou opravu neodebírá.
- Vědomé meze se nezhoršily, s jednou drobnou výjimkou (B90, R1-3).
- Nové nálezy čočky jsou tři, všechny informativní (evidence a dokumentace, ne díra v kódu).

## Jak se ověřovalo

1. **Kotvy mutací.** Ze seznamů `netlify/mutace.mjs` a `mutace_jadro.mjs` (2 918 mutací, jen načteny, nespuštěny) jsem vzal 274 mutací, které se odvolávají na B ≤ 150, a ověřil, že hlídaný řádek kódu v dnešním stromu existuje: 274 z 274. Na `origin/main` existuje stejný řádek u všech kromě čtyř, kde se liší jen znění (B105 revize, B148, dvě C5 nástroje) — oprava sama na main je.
2. **Běh sad.** Všech 84 serverových sad `netlify/test_*.mjs` a 315 sad `src/test_*.js` lokálně: 399 z 399 skončilo kódem 0, žádný řádek FAIL s číslem B ≤ 150. Sloupec „důkaz“ uvádí počet prošlých kontrol, které číslo nesou v názvu.
3. **PoC `podklady/audit_2026-11-20/poc_R1_vzory.mjs`** (spuštěno, výstup „ODOLNÉ“): vzorové opravy pustí na všech 32 funkcí — B131 (6 těl × 3 role, žádná 500 ani výjimka), B17/B159 (POST/DELETE/PUT z cizího Origin, `Origin: null`, `text/plain`: nic neprošlo, úložiště beze změny, žádné volání ven), B78 (přihlášení a odhlášení z cizí stránky), B57 (`/api/zdravi`, `/api/ja`), a že čas aktivity #ON obchodník nedostane. Sonda má kontrolní krok (tentýž zápis ze svého původu projde).
4. **Čtení kódu** u čísel bez mutace a u nových cest (#UE, #ON, víc šachet, víc zákazníků, poznámka do Pipedrive, tokeny webhooku a kopie na Disk).

Co jsem **neověřil během**: prohlížečové harnessy (`overit_xss.mjs`, `overit_online.mjs`) — v pracovním stromu není `dist/` a sestavení jsem nepouštěl. Čísel B63, B69, B70, B87, B124, B130, B150 se to týká; u nich stojí závěr na čtení kódu a na `test_escape.js` (42 OK).

## Nové nálezy čočky

| ID | Závažnost | Nález | Kde | PoC | main dotčen |
|---|---|---|---|---|---|
| R1-1 | informativní | Šest čísel auditu 9. 9. (B34, B36, B37, B38, B40, B41) má jako poslední záznam „dál trvá“ a v repu není ani popis, ani uzavření; stejně B109, B110, B132 | `podklady/HARMONOGRAM_2026-09-22.md:251`, `podklady/predavky/2026-09.md:211`, `podklady/predavky/2026-10.md:3437` | ne | ano |
| R1-2 | informativní | B108 (klouzavé okno počítadla pokusů) je odložený a dnes platí, ale mezi vědomými mezemi zapsaný není | `netlify/lib/sdilene.mjs:241` | ne | ano |
| R1-3 | informativní | Mez B90 se rozšířila: záloha v prohlížeči po odhlášení nese i údaje dalších zákazníků zakázky | `src/ui/historie.js:30`, `src/zakazka.js:1168` | ne | ne (víc zákazníků je jen na test) |

### R1-1 — čísla bez popisu a bez uzavření
- **Stav:** audit 9. 9. 2026 leží mimo repozitář (Disk). Z jeho řady jsou v repu doložené B26–B32, B35 a B42; zbytek „3. dávky“ je v harmonogramu 22. 9. veden jako trvající a pak už nikde. Historie gitu (`git log -G`) nic dalšího nenese.
- **Dopad:** u těchto čísel nejde říct, jestli jsou opravená. Může jít o drobnosti, ale také ne.
- **Návrh:** J. V. dohledá audit 9. 9. (a audity 2. 10. a 6. 10. pro B110, B132) na Disku; čísla se buď uzavřou s citací, nebo zapíšou do `roadmap.json`.

### R1-2 — B108 bez záznamu o přijetí
- **Stav:** počítadlo se zapomíná až čtvrt hodiny po POSLEDNÍM pokusu (`pokusyStavKlic`), takže kdo posílá aspoň jeden pokus za 15 minut, drží počítadlo cizího e-mailu nahoře trvale.
- **Dopad:** malý. Správné heslo projde vždy (#92), majitel jen čeká nejvýš 2 s na přihlášení (`zpozdeniMs`, strop 2 000 ms). Nad limitem e-mailu ale dostane 429 při překlepu — i v potvrzení heslem správce (B77).
- **Návrh:** buď pevné okno od prvního pokusu, nebo jeden odstavec do `BEZPECNOST_MEZE.md` s rozhodnutím J. V.

### R1-3 — B90 nese víc dat
- **Stav:** záloha `kng_rozpracovano_v1` ukládá celou zakázku. S víc zákazníky je v ní i pole `dalsiZakaznici` (název, IČO, sídlo, kontakt). Pravidlo meze (týden, žádné mazání při odhlášení) se nezměnilo.
- **Dopad:** kdo usedne ke stejnému profilu prohlížeče, vidí údaje víc firem než dřív. Předpoklad meze (vlastní účet počítače) platí dál.
- **Návrh:** doplnit větu do oddílu B90; rozhodnutí J. V. z 15. 10. není třeba měnit.

## Trvající meze — zhoršily se?

| Mez | Kdo přijal | Posouzení proti novým funkcím |
|---|---|---|
| B4 zbytek (souběh počítadel mezi instancemi) | otevřeno, roadmapa #172 „čeká“; mez B158 | Nezhoršeno. Víc akcí chce heslo správce, ale všechny jdou přes tutéž brzdu (`potvrdHesloSpravce`); token kopie na Disk má vlastní počítadlo. Podrobně čočka AU. |
| B10 zbytek (etag proti skutečným Blobs) | #172 „čeká“ | Nezhoršeno; uložení čte zakázku dvakrát až třikrát (`zakazky.mjs:204`). |
| B65, B66, B67 | J. V., revize v22.9.9 | Nezhoršeno. Režim složky je dál vypnutý (`uloziste_ui.js:56`). |
| B79 | J. V. 24. 9. 2026 | Nezhoršeno; `kontrola_udaju.py` hlásí čisto, hook `pre-push` je zapnutý. |
| B88 čtecí strana | vědomá mez (BEZPECNOST_MEZE.md) | Rozsah čtení vzrostl o názvy dalších zákazníků v rejstříku — to je zapsané jako mez VZ-E6. Čas aktivity #ON jde jen správci. |
| B90 | J. V. 15. 10. 2026 | Mírně rozšířena, viz R1-3. |
| B93 zbytek, B94 | J. V. 15. 10. 2026 | Nezhoršeno. Kopie na Disk ani skript Apps Script otisky hesel nenesou (`zalohovani.mjs:1104-1111`). |
| B96 bod 4, B117 | vědomě 6. 10. 2026; bod 4 čeká na J. V. | Nezhoršeno. U víc šachet se zaokrouhluje jen součet (`vice_sachet.js:20-24`) a marži slevy server počítá ze součtu (`schvalovani.js:574`). |
| B61, B62, B98, B119, B149 (zbytky zámku a obnovy) | vědomé meze | Nezhoršeno; u víc zákazníků razítko „komu“ skládá server. Podrobně čočka AZ. |
| B104 | výjimka v `test_zalohy.mjs:231` | Nezhoršeno. Nová úložiště (`aktivita`, `pd_webhook`, `disk_kopie`, klíč `funkce`) jsou v témž seznamu výjimek vědomě. |
| B112 | — | Vědomě uvolněno ruční cenou #561 (je i na main); kontrola platí i pro šachtu 2+ (`test_vs_server.mjs:170`). |
| B137 věcné meze rozměrů | vědomá mez B169 | Nezhoršeno; zadání dalších šachet jde týmiž kontrolami (`zakazka_kontrola.mjs:263-272`). |

## Opravy, které nejsou na origin/main

Žádná z řady B1–B150. Na main chybí jen novější práce nad těmito opravami, která stav nemění: razítko úpravy účtu se seznamem polí (#UE, `uzivatele.mjs:197`), vrácení `zamkyPrijato` (`zakazky.mjs:322`) a nástroje C5.

## Co je v pořádku (ověřeno)

- Nové tajné hodnoty (webhook, kopie na Disk, skript) se porovnávají v konstantním čase jako B22/B42: `pd_webhook.mjs:79`, `zaloha_disk.mjs:47`.
- Nové cesty do Pipedrive ctí právo z matice a strop jako B80: `pd_poznamka.mjs:258,287,292`, `pd_organizace.mjs:55,82`, `pd_vazba.mjs:40`.
- Úprava účtu správcem (#UE) drží B28, B95 a B148: `uzivatele.mjs:166-171,186,198`.
- #ON nezapisuje do účtu, takže nerozbíjí B92/B156; odhlášení dál zvedá verzi hesla (B6).
- Identifikátory zákazníků mají přísnější tvar než B1 (`vice_zakazniku.js:44`).
- CSP, připnutý Node, zámek závislostí a práva workflow jsou na test i main shodné (`netlify.toml:19,41`, `testy.yml:54`); závislost je jedna.
- IČO pro serverový ARES jen číslice (`ares_server.mjs:39,47`).

## Co testy a mutace NEhlídají

- **Nové funkce automaticky.** B131 a B17 mají mutaci po jednotlivých funkcích (12 a 2); funkce přidané později (`funkce`, `pd_organizace`, `pd_vazba`, `zaloha_vynuceno`, `controlling_export`…) vlastní mutaci téhož vzoru nemají. Dnes drží (PoC), ale další nová funkce by propadla bez povšimnutí. Sonda z PoC by šla převzít jako sada.
- **Bez pojmenovaného testu** jsou B5, B11, B12, B20, B21, B23 (hlavičky, Node, lokální server, řídicí znaky v docx, `e.message`). Změnu `netlify.toml` nebo `server.js` nic nezachytí.
- **Jen v prohlížeči** se hlídají B63, B69, B70, B87, B124, B130, B150; serverové mutace je nevidí.
- **B85** (nastavení účtu Netlify) z repozitáře ověřit nejde vůbec.
- Komentář v `netlify/lib/funkce.mjs:6` tvrdí, že vypínače „zálohy berou s programem“; otisk klíč `funkce` nenese (`zalohovani.mjs:334-348`, výjimka v `test_zalohy.mjs:239`). Chování je vědomé, komentář je nepřesný.

## Tabulka stavů B1–B150

Závažnost s hvězdičkou je odvozená z popisu v roadmapě (#167 uvádí „4 vysoké“ bez výčtu), ostatní jsou z podkladů; „neuvedena“ = v repu není. Čísla B26–B31 nesou dvě různé řady nálezů (23. 8. a 9. 9.); nízká čísla B1–B7 se v roadmapě vyskytují i jako aliasy nesouvisejících úkolů, proto může počet testů u nich zahrnovat i ty.

| B | Původní nález | Závažnost | Stav | Důkaz (origin/test) | Na main |
|---|---|---|---|---|---|
| B1 | id variant/poznámek/příloh šla bez escapování do onclick, server je nekontroloval | vysoká* | OPRAVENO v22.8.3 | netlify/lib/zakazka_kontrola.mjs:154, src/uloziste.js:799; mutací 2; testy: 12× OK (test_prava.mjs, test_c5_test_sada.mjs) | ano |
| B2 | rozhodnutí o slevě a jméno schvalovatele určoval prohlížeč | vysoká* | OPRAVENO v22.8.3 | netlify/lib/zakazka_kontrola.mjs:643, src/schvalovani.js:489, src/schvalovani.js:538 (+1); mutací 4; testy: 13× OK (test_prava.mjs, test_c5_test_sada.mjs) | ano |
| B3 | odemknout odeslanou nabídku mohl kdokoli, razítko od klienta | vysoká* | OPRAVENO v22.8.3 | netlify/lib/zakazka_kontrola.mjs:551, netlify/lib/zakazka_kontrola.mjs:557; mutací 2; testy: 7× OK (test_prava.mjs, test_cenik_xlsx.js) | ano |
| B4 | brzda hádání hesel: počítadlo až po scryptu, bez limitu na adresu | neuvedena | OPRAVENO v23.8.3; ZBYTEK TRVÁ (atomický inkrement/etag mezi instancemi, #172 čeká, mez B158) | netlify/functions/prihlaseni.mjs:43, netlify/functions/prihlaseni.mjs:51; mutací 2; testy: 3× OK (test_prava.mjs); netlify/lib/sdilene.mjs:258-275 (zbytek popsán v kódu) | ano |
| B5 | chyběly bezpečnostní hlavičky a CSP | neuvedena | OPRAVENO v22.8.3 (CSP s 'unsafe-inline' — vědomě) | netlify.toml:34-41; test žádný (jen čtení) | ano |
| B6 | změna hesla/odhlášení neodvolaly staré relace | nízká (zbytek) | OPRAVENO v23.8.3, odhlášení v13.10.1 | netlify/lib/sdilene.mjs:618, netlify/functions/uzivatele.mjs:144, netlify/functions/uzivatele.mjs:294 (+1); mutací 4; testy: 15× OK (test_prava.mjs, test_prihlaseni.mjs) | ano |
| B7 | heslo hlavního účtu mohl resetovat vedlejší správce | neuvedena | OPRAVENO v23.8.3 | netlify/functions/uzivatele.mjs:279; mutací 1; testy: 4× OK (test_prava.mjs) | ano |
| B8 | analytika brala rozpad po uživatelích a čísla od klienta | neuvedena | OPRAVENO v23.8.3 (+v15.10.14 test) | netlify/functions/analytika.mjs:124, src/analytika.js:166, netlify/functions/analytika.mjs:148; mutací 3; testy: 13× OK (test_analytika.js, test_prava.mjs) | ano |
| B9 | zálohy nenesly zákazníky, podpisy a matici zobrazení | neuvedena | OPRAVENO v23.8.3; úplnost hlídá test_zalohy N4 | netlify/functions/zaloha.mjs:113, netlify/lib/zalohovani.mjs:345; mutací 2; testy: 8× OK (test_prava.mjs) | ano |
| B10 | souběžné uložení tiše přepsalo zakázku (bez razítka verze) | neuvedena | OPRAVENO v23.8.3; ZBYTEK: etag proti skutečným Blobs neověřen (#172 čeká) | netlify/functions/zakazky.mjs:140; mutací 1; testy: 6× OK (test_prava.mjs) | ano |
| B11 | nepřipnutý Node a chybějící package-lock.json | neuvedena | OPRAVENO v23.8.3 / v22.9.6 (#307) | netlify.toml:19; package-lock.json:9; test žádný | ano |
| B12 | lokální server.js poslouchal všude, bez stropu těla a hlaviček | neuvedena | OPRAVENO v23.8.3 | server/server.js:80,114,143; test žádný | ano |
| B13 | autora zakázky a razítko nového zámku psal klient | neuvedena | OPRAVENO v23.8.3 | netlify/lib/zakazka_kontrola.mjs:684, netlify/lib/zakazka_kontrola.mjs:808; mutací 2; testy: 5× OK (test_prava.mjs, test_autor.mjs) | ano |
| B14 | zakázka bez stropu velikosti | neuvedena | OPRAVENO v23.8.3 | netlify/functions/zakazky.mjs:111; mutací 1; testy: 3× OK (test_prava.mjs, test_vs_zamek.js) | ano |
| B15 | správce si mohl vypnout vlastní účet; archivovaný šel zapnout | neuvedena | OPRAVENO v23.8.3 | netlify/functions/uzivatele.mjs:322, netlify/functions/uzivatele.mjs:326; mutací 2; testy: 5× OK (test_prava.mjs) | ano |
| B16 | tvar a délky e-mailu/hesla se nekontrolovaly | neuvedena | OPRAVENO v23.8.3 | netlify/functions/uzivatele.mjs:229, netlify/functions/prihlaseni.mjs:36; mutací 2; testy: 6× OK (test_prava.mjs) | ano |
| B17 | zápisy z cizího Origin, odhlášení přes GET | neuvedena | OPRAVENO v23.8.3 (zbytek bez Origin = mez B159) | netlify/lib/sdilene.mjs:511, netlify/functions/odhlaseni.mjs:6; mutací 2; testy: 5× OK (test_prava.mjs, test_pd_nanecisto.mjs); + PoC poc_R1_vzory.mjs | ano |
| B18 | logo firmy mohlo být odkaz místo PNG/JPEG data-URL | neuvedena | OPRAVENO v23.8.3 | src/firma.js:693; mutace „B100-zbytek, B18“ netlify/mutace.mjs:4236 | ano |
| B19 | každé otevření seznamu dealů šlo do Pipedrive (bez cache) | neuvedena | OPRAVENO v23.8.3 | testy: 1× OK (test_pipedrive.mjs); netlify/functions/pd_dealy.mjs:47; test_pipedrive.mjs:447 | ano |
| B20 | řídicí znaky z dat rozbíjely XML .docx | neuvedena | OPRAVENO v23.8.3 | src/docxgen.js:150; pojmenovaný test není | ano |
| B21 | kontrola před gitem nehlídala tajemství a cizí kontakty | neuvedena | OPRAVENO v23.8.3 → kontrola_udaju.py + hook pre-push (#542) | nastroje/kontrola_udaju.py:4; nastroje/hooky/pre-push:5; běh 19. 11.: čisté | ano |
| B22 | podpis relace se porovnával obyčejným === | neuvedena | OPRAVENO v22.8.3 | netlify/lib/sdilene.mjs:392; mutací 1 | ano |
| B23 | server vydával e.message (vnitřní názvy) | neuvedena | OPRAVENO v23.8.3 (+ vypocet.mjs #514) | server/server.js:114; netlify/functions/vypocet.mjs:36; pojmenovaný test není | ano |
| B24 | — | — | NENALEZENO (číslo se v repu ani v historii gitu nevyskytuje; #167 mluví jen o „B10 až B25, drobnosti“) | — | — |
| B25 | bootstrap hlavního účtu přijal heslo kratší než pravidlo délky | neuvedena | OPRAVENO v13.10.1 | netlify/functions/prihlaseni.mjs:67; mutací 1; testy: 1× OK (test_prihlaseni.mjs) | ano |
| B26 | (dvě řady) 23. 8.: číselná pole do value bez escapování; 9. 9.: kid trvalé položky v onclick | neuvedena | OPRAVENO v23.8.2 / v9.9.1 | src/uloziste.js:819, netlify/functions/program.mjs:61; mutací 2; testy: 8× OK (test_prava.mjs, test_dialogy.js) | ano |
| B27 | (dvě řady) 23. 8.: stav Pipedrive bez whitelistu; 9. 9.: účty a podpisy šly obnovit ze souboru | neuvedena | OPRAVENO v23.8.2 / v9.9.1 | netlify/functions/obnova.mjs:792, netlify/functions/obnova.mjs:902, netlify/functions/obnova.mjs:811 (+2); mutací 5; testy: 12× OK (test_obnova.mjs, test_pipedrive.mjs); + netlify/functions/pd_dealy.mjs:31 | ano |
| B28 | (dvě řady) profil/podpis hlavního účtu měnil vedlejší správce; obnova bez zámku „obnova běží“ | neuvedena | OPRAVENO v23.8.2 / v9.9.1 (mutace dochycena v2.11.5) | netlify/functions/obnova.mjs:287, netlify/lib/zalohovani.mjs:111; mutací 2; testy: 18× OK (test_obnova.mjs, test_ue_uzivatele.mjs); + netlify/functions/uzivatele.mjs:170 | ano |
| B29 | (dvě řady) autor karty zákazníka od klienta; duplicitní id variant | neuvedena | OPRAVENO v23.8.2 / v9.9.1 | src/uloziste.js:900; mutací 1; testy: 4× OK (test_prava.mjs, test_obnova.mjs); + netlify/functions/zakaznici.mjs:77 | ano |
| B30 | obnova oživila smazaný účet a přepsala archiv/aktivní | neuvedena | OPRAVENO v9.9.1 | netlify/functions/obnova.mjs:813, netlify/functions/obnova.mjs:821; mutací 2; testy: 4× OK (test_obnova.mjs) | ano |
| B31 | (dvě řady) správce si archivoval vlastní účet; obnova snížila hesloVerze | neuvedena | OPRAVENO v23.8.2 / v9.9.1 (+v15.10.14 test) | netlify/functions/obnova.mjs:823; mutací 1; testy: 8× OK (test_obnova.mjs); + netlify/functions/uzivatele.mjs:351 | ano |
| B32 | zakázky a podpisy z obnovy bez kontroly id/tvaru | neuvedena | OPRAVENO v9.9.1 | netlify/functions/obnova.mjs:911, netlify/functions/obnova.mjs:762; mutací 2; testy: 2× OK (test_obnova.mjs) | ano |
| B33 | — | — | NENALEZENO | — | — |
| B34 | audit 9. 9., „3. dávka“ — popis v repu není | neznámá | NELZE OVĚŘIT — poslední zmínka (HARMONOGRAM_2026-09-22.md:251) říká „dál trvá“, uzavření nikde | podklady/HARMONOGRAM_2026-09-22.md:251 | — |
| B35 | klíče cas/ v analytice bez stropu počtu a pro neexistující zakázky | nízká | OPRAVENO v13.10.1 (+B151 v15.10.x) | netlify/functions/analytika.mjs:162, netlify/functions/analytika.mjs:160, netlify/functions/analytika.mjs:41; mutací 3; testy: 7× OK (test_funkce.mjs) | ano |
| B36 | audit 9. 9., „3. dávka“ — popis v repu není | neznámá | NELZE OVĚŘIT (viz B34) | podklady/HARMONOGRAM_2026-09-22.md:251 | — |
| B37 | audit 9. 9. — jen v rozsahu „B36–B38“ | neznámá | NELZE OVĚŘIT (viz B34) | tamtéž | — |
| B38 | audit 9. 9., „3. dávka“ — popis v repu není | neznámá | NELZE OVĚŘIT (viz B34) | tamtéž | — |
| B39 | — | — | NENALEZENO | — | — |
| B40 | audit 9. 9., „3. dávka“ — popis v repu není | neznámá | NELZE OVĚŘIT (viz B34) | tamtéž | — |
| B41 | audit 9. 9. — jen v rozsahu „B40–B42“ | neznámá | NELZE OVĚŘIT (viz B34) | tamtéž | — |
| B42 | heslo z prostředí (bootstrap) se porovnávalo === | neuvedena | OPRAVENO v13.10.1 | testy: 2× OK (test_prihlaseni.mjs); netlify/lib/sdilene.mjs:168; netlify/functions/prihlaseni.mjs:67; test_prihlaseni.mjs | ano |
| B43 | — | — | NENALEZENO | — | — |
| B44 | — | — | NENALEZENO | — | — |
| B45 | název sekce PROJ / nadpis kroku bez escapování a stropu délky | neuvedena | OPRAVENO v14.9.x | src/uloziste.js:869; mutací 1; testy: 7× OK (test_uloziste.js, test_prava.mjs); + src/ui/detail_ui.js:22 | ano |
| B46 | konce řádků CRLF rozbíjely hlídač test_escape | neuvedena (test) | OPRAVENO (14. 9.) | .gitattributes:1; src/test_escape.js:19 (42 OK) | ano |
| B47 | dávka obnovy zapsala token bez ověření, že obnova ještě běží | neuvedena | OPRAVENO (14. 9.) | netlify/functions/obnova.mjs:956; mutací 1; testy: 8× OK (test_obnova.mjs) | ano |
| B48 | token obnovy vznikal až po pořízení otisku | neuvedena | OPRAVENO (14. 9.) | netlify/functions/obnova.mjs:363; mutací 1; testy: 7× OK (test_obnova.mjs) | ano |
| B49 | platnost tokenu obnovy od začátku, vypršelý nepřestavěl rejstřík | neuvedena | OPRAVENO (14. 9.) | netlify/functions/obnova.mjs:235, netlify/functions/obnova.mjs:255; mutací 2; testy: 8× OK (test_obnova.mjs) | ano |
| B50 | znovu založený účet zůstal v knize smazaných (obnova ho přeskakovala) | neuvedena | OPRAVENO (14. 9.) | netlify/functions/uzivatele.mjs:271; mutací 1; testy: 5× OK (test_obnova.mjs) | ano |
| B51 | kid vlastních příplatků se nekontroloval | neuvedena | OPRAVENO (14. 9.) | src/uloziste.js:854; mutací 1; testy: 7× OK (test_uloziste.js, test_prava.mjs) | ano |
| B52 | otisky „před obnovou“ vytlačily noční zálohy | neuvedena | OPRAVENO (14. 9.) | netlify/lib/zalohovani.mjs:690; mutací 1; testy: 3× OK (test_obnova.mjs) | ano |
| B53 | čísla odeslané nabídky šlo přepsat beze stopy (výsledek mimo otisk zámku) | neuvedena | OPRAVENO v22.9.4 | testy: 6× OK (test_prava.mjs, test_uloziste.js); src/uloziste.js:646; mutace netlify/mutace.mjs:2448; test_prava.mjs | ano |
| B54 | prázdná ADMIN_EMAIL tiše vypnula ochrany hlavního účtu | neuvedena | OPRAVENO v22.9.5 | testy: 11× OK (test_prava.mjs); netlify/lib/sdilene.mjs:79; netlify/functions/uzivatele.mjs:222; obnova.mjs:401; mutace mutace.mjs:3057 | ano |
| B55 | pojistku zveřejnění ceníku šlo vypnout vynecháním pole | neuvedena | OPRAVENO v22.9.5 (zbytek = mez B65) | testy: 13× OK (test_cenik_zverejneni.js, test_prava.mjs); netlify/functions/program.mjs:81; src/test_cenik_zverejneni.js | ano |
| B56 | číslo odeslané nabídky hlídal jen prohlížeč | neuvedena | OPRAVENO v22.9.5 | netlify/lib/zakazka_kontrola.mjs:631; mutací 1; testy: 10× OK (test_prava.mjs, test_obchodnik.mjs) | ano |
| B57 | /api/zdravi anonymně hlásilo, zda je nastaven hlavní správce | informativní | OPRAVENO v23.9.3 | netlify/functions/ja.mjs:22; mutací 1; testy: 2× OK (test_prava.mjs); + PoC poc_R1_vzory.mjs | ano |
| B58 | kniha smazaných účtů nebyla v záloze | informativní | OPRAVENO v23.9.3 (+K3-N19 v20.10.1) | netlify/lib/zalohovani.mjs:74, netlify/functions/obnova.mjs:857; mutací 2; testy: 7× OK (test_obnova.mjs) | ano |
| B59 | výsledek nově odeslané nabídky server neověřoval | neuvedena | OPRAVENO v22.9.20 (+B119 přísně) | netlify/lib/zakazka_kontrola.mjs:815, netlify/lib/zakazka_kontrola.mjs:816, netlify/lib/zakazka_kontrola.mjs:707 (+1); mutací 4; testy: 39× OK (test_zamek_otisk.js, test_prava.mjs) | ano |
| B60 | duplikát zakázky kopíroval interní poznámku | střední | OPRAVENO v22.9.17 | testy: 1× OK (test_zakazka_duplikace.js); src/zakazka.js:1874; src/test_zakazka_duplikace.js:84 | ano |
| B61 | nový zámek s prázdným/cizím číslem prošel | drobná | OPRAVENO v23.9.3; ZBYTEK = vědomá mez (BEZPECNOST_MEZE.md:682) | netlify/lib/zakazka_kontrola.mjs:772; mutací 1; testy: 7× OK (test_prava.mjs, test_obnova.mjs) | ano |
| B62 | razítka existujícího zámku bral server od klienta | drobná | OPRAVENO v23.9.3; ZBYTEK = vědomá mez (nové tisky[] dodává klient) | netlify/lib/zakazka_kontrola.mjs:604, src/uloziste.js:709; mutací 2; testy: 6× OK (test_prava.mjs) | ano |
| B63 | dodatkový text pod položkou šel měnit v zamčené zakázce | drobná | OPRAVENO v22.9.17 | src/ui/zamek_ui.js:31; overit_online.mjs:545 (prohlížeč — tímto auditem nespuštěno) | ano |
| B64 | obnova zapsala dodatkové texty bez očisty | informativní | OPRAVENO v22.9.17 | netlify/functions/obnova.mjs:678; mutací 1; testy: 6× OK (test_obnova.mjs) | ano |
| B65 | pojistka zveřejnění ceníku je práh, ne zábrana | informativní | TRVÁ — vědomá mez (J. V., revize v22.9.9; BEZPECNOST_MEZE.md:13) | netlify/functions/program.mjs:118 | ano |
| B66 | změnu čísla odeslané nabídky zapisuje do protokolu jen aplikace | informativní | TRVÁ — vědomá mez (BEZPECNOST_MEZE.md:32) | netlify/lib/zakazka_kontrola.mjs:614 | ano |
| B67 | verze vzorce otisku ceníku se čte ze záznamu (jen režim složky) | informativní | TRVÁ — vědomá mez; režim složky je vypnutý | src/ui/uloziste_ui.js:56 | ano |
| B68 | texty firmy bez kontroly typu a délky | informativní | OPRAVENO v23.9.3 | testy: 4× OK (test_firma.js); src/firma.js:614; src/test_firma.js:251 | ano |
| B69 | „číselná“ pole uložené zakázky spustila skript | vysoká* | OPRAVENO v24.9.4 (+typy #340 v25.9.4) | testy: 4× OK (test_uloziste.js, test_escape.js); src/ui/common.js:1612; src/ui/detail_ui.js:104; src/uloziste.js:938; overit_xss.mjs (nespuštěno, bez dist) | ano |
| B70 | typ pásu opláštění jako cesta → skript a znečištění prototypu | vysoká* | OPRAVENO v24.9.4 | testy: 1× OK (test_uloziste.js); src/ui/common.js:667; src/engine.js:299; src/cenik.js:720 | ano |
| B71 | minimální marži u slevy počítal jen prohlížeč | neuvedena | OPRAVENO v25.9.4 (#341); se šachtami ze součtu | netlify/lib/zakazka_kontrola.mjs:644; src/schvalovani.js:574,579; mutace mutace.mjs:3359 | ano |
| B72 | obnova ze zálohy obcházela kontroly uložení | neuvedena | OPRAVENO v26.9.1 | testy: 9× OK (test_obnova.mjs); netlify/functions/obnova.mjs:730; mutace mutace.mjs:4736; test_obnova.mjs | ano |
| B73 | autora existující zakázky určil klient | neuvedena | OPRAVENO v24.9.4 | netlify/lib/zakazka_kontrola.mjs:687, netlify/lib/zakazka_kontrola.mjs:830; mutací 2; testy: 6× OK (test_autor.mjs) | ano |
| B74 | aktivni/archiv bral i nebooleovskou hodnotu (vypnutí hlavního účtu) | neuvedena | OPRAVENO v24.9.4 | netlify/functions/uzivatele.mjs:318, netlify/functions/uzivatele.mjs:337; mutací 2; testy: 10× OK (test_prava.mjs) | ano |
| B75 | limit adresy až po hesle, IPv6 celou adresou, úspěch nuloval adresu | neuvedena | OPRAVENO v26.9.1 | netlify/lib/sdilene.mjs:324, netlify/lib/sdilene.mjs:287, netlify/lib/sdilene.mjs:333; mutací 3; testy: 10× OK (test_prihlaseni.mjs, test_prava.mjs) | ano |
| B76 | nový/vypnutý/archivovaný účet nezvedl verzi hesla (stará cookie ožila) | neuvedena | OPRAVENO v26.9.1 | netlify/functions/uzivatele.mjs:259, netlify/functions/uzivatele.mjs:334, netlify/functions/uzivatele.mjs:358; mutací 3; testy: 7× OK (test_prihlaseni.mjs) | ano |
| B77 | změna hesla bez brzdy; citlivé akce správce bez jeho hesla | neuvedena | OPRAVENO v26.9.1, v13.10.1, v13.10.3 (hesloSpravce) | netlify/functions/uzivatele.mjs:120, netlify/functions/uzivatele.mjs:125, netlify/functions/uzivatele.mjs:286 (+8); mutací 11; testy: 42× OK (test_prava.mjs, test_prihlaseni.mjs) | ano |
| B78 | přihlášení/odhlášení z cizí stránky (Origin, formulář) | neuvedena | OPRAVENO v24.9.4 / v26.9.1 | netlify/functions/prihlaseni.mjs:26, netlify/functions/prihlaseni.mjs:27, netlify/functions/odhlaseni.mjs:12; mutací 4; testy: 12× OK (test_prihlaseni.mjs, test_prava.mjs); + PoC poc_R1_vzory.mjs | ano |
| B79 | osobní údaje (kontakty) ve veřejném repu | neuvedena | TRVÁ — ponecháno rozhodnutím J. V. 24. 9. 2026; nové hlídá kontrola_udaju.py | nastroje/povolene_kontakty.txt:49; běh kontroly: čisté | ano |
| B80 | čtení z Pipedrive bez práva z matice, bez stropu a kontroly původu | neuvedena | OPRAVENO v15.10.1 (výchozí právo v15.10.7) | netlify/lib/pipedrive.mjs:220, netlify/lib/pipedrive.mjs:210, src/zobrazeni.js:458 (+5); mutací 8; testy: 40× OK (test_pd_pristup.mjs, test_k40c_webhook.mjs); + nové cesty pd_poznamka.mjs:258,287,292; pd_organizace.mjs:55,82 | ano |
| B81 | prototypový klíč v mapě analytiky | nízká | OPRAVENO v13.10.1 | src/analytika.js:100; mutací 1; testy: 6× OK (test_analytika.js) | ano |
| B82 | příloha s javascript: se kliknutím spustila | neuvedena | OPRAVENO v24.9.4 | src/uloziste.js:926; mutací 1; testy: 16× OK (test_uloziste.js, test_prava.mjs) | ano |
| B83 | CSV exporty spouštěly vzorce v Excelu | nízká | OPRAVENO v13.10.1 (+K37-I5) | testy: 1× OK (test_pd_nanecisto.mjs); src/format.js:131; všechny dnešní CSV jdou přes csvBunka/ctrlCsvBunka (controlling.js:1347, slovnik.js:152, pd_nanecisto.js:172, techspec_ui.js:131) | ano |
| B84 | JSON v tiskovém okně šel ukončit značkou </script> | neuvedena | OPRAVENO v25.9.4 | testy: 1× OK (test_neprelozene.js); src/ui/common.js:2502; src/test_neprelozene.js:81 | ano |
| B85 | nastavení Netlify (náhledy, nasazení větví, tajné proměnné) | neuvedena | OPRAVENO dle roadmapy #346 v25.10.1 — Z KÓDU NEOVĚŘITELNÉ (nastavení v účtu Netlify) | — | — |
| B86 | {{symbol}} v názvu příplatku se ve Wordu rozvinul | neuvedena | OPRAVENO v25.9.4 | testy: 4× OK (test_docxgen.js, test_vs_docx_v17.js); src/docxgen.js:895,993; src/test_docxgen.js | ano |
| B87 | test_escape hlídal jen jména proměnných (slepý k B69/B70) | neuvedena (test) | OPRAVENO v24.9.4 (overit_xss.mjs) | overit_xss.mjs:1 (prohlížeč — tímto auditem nespuštěno) | ano |
| B88 | ceník a náklady vidí každá role (čtecí strana); zápis hlídalo jen UI | neuvedena | zápis OPRAVENO v29.9.4 (B112); ČTENÍ TRVÁ — vědomá mez (BEZPECNOST_MEZE.md „Hlídá se jen zápis“) | src/uloziste.js:1830 | ano |
| B89 | klíč analytiky nesl zbytek argumentu; texty tvrdily anonymitu | informativní | OPRAVENO v15.10.2 | src/analytika.js:42, src/ui/analytika_ui.js:405; mutací 2; testy: 5× OK (test_analytika.js) | ano |
| B90 | záloha rozpracované zakázky v prohlížeči přežije odhlášení | informativní | TRVÁ — vědomá mez (J. V. 15. 10. 2026: nezpřísňovat); MÍRNĚ ROZŠÍŘENA (R1-3) | src/ui/historie.js:30 | ano |
| B91 | __proto__ v importu slovníku | informativní | OPRAVENO v12.10.3 (revize #401) | src/slovnik.js:267; src/test_slovnik.js | ano |
| B92 | převod zakázek zapsal starou kopii účtu | informativní | OPRAVENO v15.10.2 | netlify/functions/uzivatele.mjs:417; mutací 1; testy: 5× OK (test_ucty_informativni.mjs) | ano |
| B93 | obnova starého hesla nezvedla verzi hesla | informativní | OPRAVENO v15.10.2; ZBYTEK vědomá mez (heslo z doby otisku platí) | netlify/functions/obnova.mjs:829; mutací 1; testy: 10× OK (test_ucty_informativni.mjs, test_obnova.mjs) | ano |
| B94 | scrypt N=2^14 bez parametrů v otisku | informativní | TRVÁ — vědomá mez (J. V. 15. 10. 2026, varianta A) | netlify/lib/sdilene.mjs:154 | ano |
| B95 | jméno se závorkami napodobilo razítko „jméno <e-mail>“ | informativní | OPRAVENO v15.10.2; platí i pro úpravu účtu #UE | netlify/functions/uzivatele.mjs:59, netlify/lib/sdilene.mjs:532; mutací 2; testy: 7× OK (test_ucty_informativni.mjs, test_ue_uzivatele.mjs); + netlify/functions/uzivatele.mjs:186,255 | ano |
| B96 | krok/směr zaokrouhlení mimo výčet snížil cenu bez schválení | vysoká* | OPRAVENO v30.9.1; bod 4 (marže z koncové ceny) TRVÁ jako návrh — čeká na J. V. | src/uloziste.js:1222, netlify/lib/zakazka_kontrola.mjs:477, src/uloziste.js:1553; mutací 3; testy: 24× OK (test_prava.mjs, test_uloziste.js) | ano |
| B97 | e-mailový klíč brzdy zasáhl počítadlo cizí adresy | střední | OPRAVENO v29.9.5 | netlify/lib/sdilene.mjs:233, netlify/lib/sdilene.mjs:315; mutací 2; testy: 7× OK (test_prihlaseni.mjs) | ano |
| B98 | obnova ze souboru přebírala razítka a odemčení | střední | OPRAVENO v30.9.1; zbytek vědomá mez (BEZPECNOST_MEZE.md:286) | netlify/lib/zakazka_kontrola.mjs:761, netlify/lib/zakazka_kontrola.mjs:541; mutací 2; testy: 8× OK (test_obnova.mjs) | ano |
| B99 | šablona Wordu bez kontroly obsahu (vnější vztahy, makra) | střední | OPRAVENO v30.9.1 (+B115, B139–B143) | netlify/functions/sablony.mjs:84; mutací 1; testy: 29× OK (test_sablona_obsah.js, test_sablony.mjs) | ano |
| B100 | obnova firmy/zákazníků/šablon/matice bez očisty | střední | OPRAVENO 6. 10. a v12.10.3 | netlify/functions/obnova.mjs:876, netlify/functions/obnova.mjs:166, netlify/functions/obnova.mjs:687 (+5); mutací 8; testy: 10× OK (test_obnova.mjs) | ano |
| B101 | obchodník vrátil rozhodnutí o slevě na „čeká“ | nízká | OPRAVENO v13.10.1 | src/schvalovani.js:458, src/schvalovani.js:518; mutací 2; testy: 8× OK (test_schvalovani.js, test_vyjimky.mjs) | ano |
| B102 | — | — | NENALEZENO (jen v rozsahu „B100–B110“ odložených nálezů) | podklady/predavky/2026-09.md:211 | — |
| B103 | název položky „constructor“ shodil dodatkové texty | nízká | OPRAVENO v13.10.1 | src/cenik.js:508; mutací 1; testy: 2× OK (test_cenik_popisy.js) | ano |
| B104 | historie dodatkových textů není v záloze | neuvedena | TRVÁ — vědomá výjimka (test_zalohy N4: platné popisy v otisku jsou, historie 30 verzí ne) | netlify/test_zalohy.mjs:231 | ano |
| B105 | čas rozhodnutí o slevě z prohlížeče | nízká | OPRAVENO v13.10.1 | netlify/functions/zakazky.mjs:332, src/schvalovani.js:499; mutací 2; testy: 9× OK (test_schvalovani.js, test_koncova_cena.mjs) | ano |
| B106 | tělo JSON null → 500 | neuvedena | OPRAVENO v12.10.2 jako B131 | viz B131 + PoC poc_R1_vzory.mjs | ano |
| B107 | bootstrap hlavního účtu bez verze hesla | střední | OPRAVENO v13.10.1 | netlify/functions/prihlaseni.mjs:70, netlify/functions/prihlaseni.mjs:67; mutací 2; testy: 8× OK (test_prihlaseni.mjs) | ano |
| B108 | okno počítadla pokusů je klouzavé (každý pokus ho prodlouží) | informativní | TRVÁ — ODLOŽENO 29. 9. 2026, záznam o přijetí v BEZPECNOST_MEZE.md není (R1-2) | netlify/lib/sdilene.mjs:241 | ano |
| B109 | nepřesný popis B72 v CHANGELOG (dokumentace) | informativní | NELZE OVĚŘIT — jen zmínka „odložené“, uzavření nenalezeno | podklady/PROMPT_oprava_sesti_nalezu_v29.9.1.md:645 | — |
| B110 | jen v rozsahu „B100–B110“ — popis v repu není | neznámá | NELZE OVĚŘIT | podklady/predavky/2026-09.md:211 | — |
| B111 | záporná částka/množství/hodiny snížily cenu bez schválení | vysoká* | OPRAVENO v29.9.2 | netlify/lib/zakazka_kontrola.mjs:409, src/uloziste.js:1250, src/uloziste.js:1222; mutací 3; testy: 32× OK (test_zaporne.mjs, test_kontroly.js) | ano |
| B112 | ceník varianty a skryté přepisy hlídalo jen UI | vysoká* | OPRAVENO v29.9.4; od v4.11.4 vědomě uvolněno ruční cenou #561 (se záznamem) | src/uloziste.js:2039, src/uloziste.js:1222, netlify/lib/zakazka_kontrola.mjs:480 (+5); mutací 9; testy: 32× OK (test_prava.mjs, test_667_statika_opl.js) | ano |
| B113 | celý ceník sestavení / projekce za 0 Kč prošly | vysoká | OPRAVENO 6. 10. (#374); výjimka nové zakázky vědomě zůstává | src/uloziste.js:2063, src/kontroly.js:359, src/kontroly.js:221; mutací 4; testy: 12× OK (test_prava.mjs, test_kontroly.js) | ano |
| B114 | identita standardních položek PROJ a cena trvalé položky se nehlídaly | vysoká | OPRAVENO 6. 10. (#374), v8.10.1 | src/uloziste.js:1770, src/uloziste.js:2102, src/uloziste.js:2099 (+4); mutací 7; testy: 24× OK (test_prava.mjs) | ano |
| B115 | kontrola obsahu šablony (B99) byla obejitelná | střední | OPRAVENO 6. 10. | src/sablona_obsah.js:114, src/sablona_obsah.js:210, src/sablona_obsah.js:271 (+8); mutací 11; testy: 27× OK (test_sablona_obsah.js, test_sablony.mjs) | ano |
| B116 | vrácení starší verze šablony obsah nekontrolovalo | nízká | OPRAVENO 6. 10. | netlify/functions/sablony.mjs:146; mutací 1; testy: 5× OK (test_sablony.mjs) | ano |
| B117 | zaokrouhlení z výčtu dolů podteče minimální marži o < krok | neuvedena | TRVÁ — vědomá mez (6. 10. 2026); se šachtami se zaokrouhluje jen součet → nezhoršeno | src/vice_sachet.js:20-24; BEZPECNOST_MEZE.md:200 | ano |
| B118 | = K19-N102: pojistka #372 i pro nově zamčenou variantu | neuvedena | OPRAVENO v2.10.1 | netlify/lib/zakazka_kontrola.mjs:487 | ano |
| B119 | nový zámek se ověřoval volně | střední | OPRAVENO 6. 10.; zbytek vědomá mez | netlify/lib/zakazka_kontrola.mjs:815, src/zamek.js:938, src/zamek.js:881 (+1); mutací 4; testy: 8× OK (test_prava.mjs) | ano |
| B120 | obnova zahodila jazykové varianty dodatků | střední | OPRAVENO 6. 10. | netlify/functions/obnova.mjs:676, netlify/functions/obnova.mjs:675; mutací 2; testy: 5× OK (test_obnova.mjs) | ano |
| B121 | adresa v rejstříku bez stropu a kontroly typu | nízká | OPRAVENO 6. 10. | src/uloziste.js:352, src/uloziste.js:351; mutací 2; testy: 5× OK (test_rejstrik.mjs) | ano |
| B122 | {{SYMBOL}} z textu splátky se ve Wordu rozvinul | nízká | OPRAVENO 6. 10. | src/docxgen.js:208; mutací 1; testy: 6× OK (test_plan_plateb_sod.js, test_o5_docx.js) | ano |
| B123 | — | — | NENALEZENO | — | — |
| B124 | overit_xss neotravoval data období (plán plateb, materiál „jiné“) | informativní | OPRAVENO 6. 10. (dávka E) | overit_xss.mjs:228 (prohlížeč — nespuštěno) | ano |
| B125 | workflow testy.yml bez omezení práv tokenu | informativní | OPRAVENO 6. 10. (dávka E) | testy: 3× OK (test_build_info.js); .github/workflows/testy.yml:54; smazat_vetve.yml:42 (write vědomě); akce připnuté na SHA; src/test_build_info.js | ano |
| B126 | profil, který není objekt, dal nulovou hmotnost | vysoká | OPRAVENO v12.10.2 | src/engine.js:813, src/engine.js:812; mutací 2; testy: 12× OK (test_profil_neznamy.js, test_prava.mjs) | ano |
| B127 | přepisy množství a ceny bez kontroly typu a stropu | střední | OPRAVENO v12.10.2 | src/uloziste.js:1337, src/uloziste.js:1339; mutací 2; testy: 5× OK (test_zaporne.mjs) | ano |
| B128 | ceník varianty šel složit z různých verzí | střední | OPRAVENO v12.10.2 (S13 v16.10.x) | src/uloziste.js:1972, src/uloziste.js:2026, src/uloziste.js:2028 (+1); mutací 4; testy: 4× OK (test_prava.mjs) | ano |
| B129 | jenOck u odeslané varianty zahraniční zakázky | nízká | OPRAVENO v13.10.1 | testy: 3× OK (test_zahr_jen_realizace.js); src/zakazka.js:736; src/test_zahr_jen_realizace.js:54 | ano |
| B130 | lišta netvrdila, co se u odeslané nabídky počítá dnešním jádrem | nízká | OPRAVENO v13.10.1 | testy: 5× OK (test_zamek_otisk.js); src/zamek.js:208; src/test_zamek_otisk.js | ano |
| B131 | tělo null/pole/číslo → 500 | nízká | OPRAVENO v12.10.2; drží na všech 32 funkcích | netlify/functions/controlling.mjs:55, netlify/functions/slovnik.mjs:61, netlify/functions/zakazky.mjs:110 (+9); mutací 12; testy: 39× OK (test_prava.mjs); + PoC poc_R1_vzory.mjs | ano |
| B132 | informativní nález auditu 6. 10. — popis v repu není | informativní | NELZE OVĚŘIT (roadmapa #397: „zbývá B132 (info)“) | podklady/predavky/2026-10.md:3437 | — |
| B133 | ceník sestavení jako základ směsi po položkách | vysoká | OPRAVENO v12.10.3 | src/uloziste.js:1972, src/uloziste.js:1974, src/uloziste.js:2062; mutací 3; testy: 7× OK (test_koncova_cena.mjs) | ano |
| B134 | záporné rezervy a další vstupy jádra | vysoká | OPRAVENO v12.10.3 | src/uloziste.js:1362, src/uloziste.js:1385; mutací 2; testy: 17× OK (test_koncova_cena.mjs, test_uloziste.js) | ano |
| B135 | číslo jako text s čárkou → jádro 0 | vysoká | OPRAVENO v12.10.3 | src/uloziste.js:1300, src/uloziste.js:1185, src/uloziste.js:1195 (+2); mutací 5; testy: 13× OK (test_koncova_cena.mjs, test_uloziste.js) | ano |
| B136 | volný klíč ceníku obešel #395 V3 | vysoká | OPRAVENO v12.10.3 | src/ukazkove.js:134, netlify/lib/zakazka_kontrola.mjs:191; mutací 2; testy: 7× OK (test_koncova_cena.mjs) | ano |
| B137 | rozměry šachty se při uložení nehlídaly | vysoká | OPRAVENO v12.10.3; věcné meze rozměrů TRVAJÍ jako vědomá mez (B169) | netlify/lib/zakazka_kontrola.mjs:474, src/kontroly.js:115, src/uloziste.js:1460 (+4); mutací 7; testy: 25× OK (test_koncova_cena.mjs, test_kontroly.js) | ano |
| B138 | nula za klíč, který starší verze ceníku neměla | střední | OPRAVENO v13.10.1 | src/uloziste.js:2043, src/uloziste.js:2004; mutací 2; testy: 13× OK (test_koncova_cena.mjs, test_cenik_stari.js) | ano |
| B139 | kontrola šablony: prefix s ne-ASCII písmenem | střední | OPRAVENO v12.10.3 | src/sablona_obsah.js:68, src/sablona_obsah.js:72; mutací 2; testy: 18× OK (test_sablona_obsah.js) | ano |
| B140 | kontrola šablony: návnada atributu | střední | OPRAVENO v12.10.3 | src/sablona_obsah.js:223, src/sablona_obsah.js:184; mutací 2 | ano |
| B141 | kontrola šablony: pole DATABASE/RD, hromadná korespondence | střední | OPRAVENO v12.10.3 | src/sablona_obsah.js:59, src/sablona_obsah.js:315, src/sablona_obsah.js:57; mutací 3; testy: 17× OK (test_sablona_obsah.js) | ano |
| B142 | rozdílné čtení konce ZIPu | nízká | OPRAVENO v12.10.3 | src/docxgen.js:77, src/docxgen.js:72, src/docxgen.js:73 (+2); mutací 5; testy: 5× OK (test_sablona_obsah.js) | ano |
| B143 | kvadratická složitost kontroly obsahu (DoS) | nízká | OPRAVENO v12.10.3 | src/sablona_obsah.js:138, src/sablona_obsah.js:160, src/sablona_obsah.js:218 (+2); mutací 5; testy: 9× OK (test_sablona_obsah.js) | ano |
| B144 | vlastní položky bez stropu hodnoty | nízká | OPRAVENO v12.10.3 | src/uloziste.js:1306, src/uloziste.js:1421, src/uloziste.js:1314; mutací 3; testy: 4× OK (test_zaporne.mjs) | ano |
| B145 | přepis „12,5“ → NaN | nízká | OPRAVENO v12.10.3 | testy: 3× OK (test_zaporne.mjs, test_uloziste.js); src/uloziste.js:1001,1295; netlify/test_zaporne.mjs | ano |
| B146 | přísné porovnání zámku: pole řádků jiného typu | nízká | OPRAVENO v12.10.3 | src/zamek.js:926, src/zamek.js:952, src/zamek.js:949; mutací 3; testy: 5× OK (test_prava.mjs) | ano |
| B147 | náhled obnovy neupozornil na nepoužitelnou šablonu | info | OPRAVENO v12.10.3 | netlify/functions/obnova.mjs:883, netlify/functions/obnova.mjs:881, netlify/functions/obnova.mjs:184 (+1); mutací 4; testy: 3× OK (test_obnova.mjs) | ano |
| B148 | úprava cizího kontaktu bez razítka | info | OPRAVENO v12.10.3; #UE razítko rozšířil o seznam polí | netlify/functions/uzivatele.mjs:198; mutací 2; testy: 1× OK (test_profil.mjs) | ano |
| B149 | obnova ověřuje zámek ze zálohy volně | info | TRVÁ — vědomá mez (12. 10. 2026; BEZPECNOST_MEZE.md:709) | netlify/lib/zakazka_kontrola.mjs (rezim obnova) | ano |
| B150 | hygiena testů: mutace B131 pro všechny funkce, overit_xss dialogy | neuvedena (test) | OPRAVENO v12.10.3 | overit_xss.mjs:244; mutace B131 ×12 | ano |

Souhrn stavů: OPRAVENO 124 (z toho B85 jen podle roadmapy — nastavení Netlify z kódu ověřit nejde; u B4, B10, B61, B62, B88, B93, B96, B98, B119, B137 zůstává zbytek vedený jako mez nebo otevřený úkol), TRVÁ jako vědomá mez nebo odložené 10 (B65, B66, B67, B79, B90, B94, B104, B108, B117, B149), NELZE OVĚŘIT 9 (B34, B36, B37, B38, B40, B41, B109, B110, B132), NENALEZENO 7 (B24, B33, B39, B43, B44, B102, B123), VRÁTIL SE 0.
