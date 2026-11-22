# Bezpečnostní audit — Kalkulator Next Gen v19.11.11 (plný audit stromu)

- **Rozsah:** `origin/test` v19.11.11 (cda289e), srovnání s `origin/main`. Plný audit celého stromu, ne jen změn.
- **Kdy a kdo:** noc 19./20. 11. 2026 na pokyn J. V., dokončeno 21. 11. (přerušení limitem využití 19. 11. ve 22:04). Auditní sezení koordinace, 10 čoček (subagentů) + 1 nezávislé ověření. `origin/test` se během auditu nezměnil.
- **Pravidla:** jen čtení kódu; zkoušky útoků jen lokálně (Node, paměťové úložiště, prohlížeč s mostem `page.route`). Na testovací web šlo jen několik požadavků GET kvůli hlavičkám; ostrý web nebyl volán vůbec. Žádné opravy.
- **Podklady:** zprávy čoček `podklady/audit_2026-11-20/cocky/`, PoC `podklady/audit_2026-11-20/poc_*.mjs` (36 souborů, lokálně bez sítě, spouštět z kořene repa `node podklady/audit_2026-11-20/<soubor>`).

## Souhrn

| Závažnost | Počet | Z toho i na main |
|---|---|---|
| kritická | 0 | 0 |
| vysoká | 1 | 1 |
| střední | 5 | 3 |
| nízká | 21 | 19 |
| informativní | 28 | — |

- **Nic anonymně zneužitelného z internetu** nebylo doloženo — na testu ani v kódu main.
- **Žádný dříve opravený B-nález (B1–B230) ani SEC-M/Z/I se nevrátil.**
- Jeden vysoký nález (B231) je potvrzen dvěma nezávislými čteními a dvěma PoC a platí i pro main.
- Navíc jedna střední vada **jen na main** (antedatovaný prodej, K40-S1 #580), na testu opravená od v12.11.2.

### Upozornění k zadání a meze auditu

- **Verze main:** `origin/main` je podle `verze.txt` **v11.11.1** (6c4bc80e), ne v13.11.x ze zadání. Sloupec „main“ se vztahuje ke kódu v11.11.1; co skutečně běží na ostrém webu, audit neověřoval.
- **Historie gitu je v kontejneru mělká** (1 655 commitů od 12. 8. 2026). Hledání tajemství v historii pokrývá jen tento úsek.
- **Nepuštěno:** mutační běhy (mutace se jen četly), plné kolo. Lokálně prošlo 399 z 399 sad `netlify/test_*.mjs` a `src/test_*.js`.
- **Neověřeno (chtělo by síť nebo zápis):** skutečný zápis do Pipedrive, chování Netlify u hlavičky `x-nf-client-connection-ip`, souběh mezi instancemi funkcí, chování Wordu u B248, starší adresy nasazení Netlify (`<nasazení>--web.netlify.app`) nad stejným úložištěm.
- **Nelze ověřit z repa:** B34, B36, B37, B38, B40, B41, B109, B110, B132 — v repu ani v historii není jejich popis ani uzavření (viz B280).

---

## Vysoké a kritické nálezy — detail

### B231 (vysoká, test i main) — strana zakázky `jenProj` / `jenOck` není po zámku ani po Prodáno zmrazená

**Stav ověření:** dvě nezávislá čtení (čočka AZ a ověřovatel, který její závěr neznal), dva PoC: `poc_AZ_1_strana_po_zamku.mjs` a `poc_overeni_AZ1_strana.mjs` (oba „ZRANITELNÉ“, HTTP 200). Zpráva ověření: `cocky/overeni_AZ1_strana.md`.

**Předpoklady útočníka:** role Obchodník, přímý `POST /api/zakazky` s platným razítkem verze. Přepnout příznak zvládne kterýkoli přihlášený (i cizí obchodník); obchvat přes prodej dělá autor. Zakázka má číslo řady OPR a stranu PROJ s kladnou cenou.

**Co je špatně:**
1. Příznaky `jenProj` / `jenOck` server při uložení vůbec neposuzuje. Nejsou v datech varianty ani mezi zmrazenými cestami hlavičky (`src/zamek.js:508-521, 594-626`); kontrola prodeje hlídá jen záznam prodeje (`src/objednane.js:619-694`); obecné uložení nemá kontrolu vlastníka (`netlify/lib/zakazka_kontrola.mjs:679-694`). Příznak má přednost před číslem zakázky (`src/zakazka.js:650-665`).
2. Strana vyřazená příznakem se při zámku neposuzuje: vynechá se kontrola ceníku a nulové ceny (`zakazka_kontrola.mjs:199-214`), rozměrů (`:232`), potvrzení ruční ceny (`src/rucni_ceny.js:375-378`), cenové výjimky (`src/vyjimky.js:607-609`) a minimální marže slevy (`src/schvalovani.js:589-591`).
3. Po vypnutí příznaku server stranu dodatečně neposoudí (zamčená varianta se přeskakuje, `zakazka_kontrola.mjs:706-751`). Posoudí ji jen při dotisku, a tam chybí kontrola potvrzení ruční ceny (`rucniCenyZamekProblem` se volá jen u nového zámku, `:799`).

**Doložený dopad:**
- **Obchvat schválení:** `jenProj=true` + zámek PROJ → 200; vypnutí příznaku → 200; Prodáno → 200. V prodané zakázce zůstala ruční cena OCK nepotvrzená a bez zdroje; přímý zámek téhož odmítá 403.
- **Odeslaná nabídka a smlouva OCK:** dotisk `nabidka` i `sod` s ruční cenou se zdrojem bez potvrzení → 200 (přímý zámek 403). Dotisk bez zdroje, s nulovými rozměry a se slevou pod marží server na testu odmítá.
- **Přepnutí strany u poctivě prodané zakázky:** stačí uložit `jenProj=true`; controlling (`src/controlling.js:646-648`), podklad hodnoty dealu (`src/objednane.js:705-726`, `src/pd_nanecisto.js:109-118`) a dokumenty (`src/zakazka.js:675-686`) se řídí aktuálním příznakem a přejdou z OCK na PROJ. Udělá to i cizí obchodník; jediná stopa je pole `upravil`.
- Zamčená data a zmrazený výsledek se nemění; přepnutí je vratné dalším uložením.

**Main:** totéž a o stupeň hůř — dotisk OCK projde i s ruční cenou **bez zdroje** (main nemá pravidlo „bez zdroje = cenová výjimka“).

**Souvislost:** zbytek B153 (strana vyřazená při zámku), který dosavadní oprava nepokryla.

**Návrh opravy (rozhodnutí J. V. — bezpečnostní mez a výpočet ceny, nejdřív poradce):**
- zmrazit příznaky strany spolu se zámkem (zapsat je do zámku a změnu po zámku odmítat, po Prodáno vždy);
- při vypnutí příznaku u zakázky se zámkem vyžadovat plné posouzení nově zapnuté strany, stejné jako u nového zámku;
- do dotisku doplnit `rucniCenyZamekProblem`;
- změnu příznaku zapisovat do protokolu zakázky.

**Co nebylo ověřeno:** skutečný zápis hodnoty do Pipedrive, tvorba dokumentů v prohlížeči, víc šachet a víc zákazníků, změna strany přes `projHlavicka.cislo`, role Vedoucí.

---

## Tabulka nálezů

PoC = soubor v `podklady/audit_2026-11-20/`. „main“ = dotčen i kód `origin/main` v11.11.1.

### Vysoká

| ID | Oblast | Nález | Kde | PoC | main |
|---|---|---|---|---|---|
| B231 | zámky a prodej | Příznak strany zakázky není po zámku ani po Prodáno zmrazený; obchvat schválení ruční ceny a přepnutí počítané strany prodané zakázky | `src/zamek.js:508-521, 594-626`; `netlify/lib/zakazka_kontrola.mjs:199-214, 706-751, 799` | ano (2×) | ano, horší |

### Střední

| ID | Oblast | Nález | Kde | PoC | main |
|---|---|---|---|---|---|
| B232 | zámky, controlling | Ověření zmrazeného výsledku dá „shoda“ i výsledku, ze kterého klient vypustil 782 z ~790 čísel nebo číslo přidal; controlling ukáže náklad 0 a přidaný řádek můstků rozdělí cenu v dokumentu. Celkovou cenu bez DPH změnit nejde | `src/zamek.js:872-881, 927-929, 947-959` | `poc_AZ_2_vysledek_neuplny` | ano |
| B233 | přihlášení | Počítadla pokusů o přihlášení jsou čtení–změna–zápis bez zámku; souběžná vlna z jedné adresy limit 60/15 min obejde (400 ze 400 hesel ověřeno). Zbytek B4, jako mez nezapsaný | `netlify/lib/sdilene.mjs:235-249, 314-319`; `netlify/functions/prihlaseni.mjs:43-54` | `poc_AU_soubeh_pocitadla` | ano |
| B234 | zákazníci | Kterýkoli obchodník tiše přepíše cizí kartu zákazníka (číslo účtu, e-maily, zástupce); karta nemá historii verzí a předvyplňuje zakázky ostatních. Zápis pro všechny je rozhodnutí J. V. z 20. 8. 2026, jako mez zapsané není | `netlify/functions/zakaznici.mjs:69-79`; `src/zakaznici.js:130-142, 257-269` | `poc_AD_zakaznici` | ano |
| B235 | Pipedrive | Obchodník zapíše poznámku do libovolného dealu (deal určuje polem `pdDealId`); strop jen 20/h na deal, na uživatele žádný — 40 poznámek do 40 dealů jedním během. Obsah je escapovaný | `netlify/lib/pd_poznamka.mjs:275, 292`; `src/controlling.js:1060-1077` | `poc_IN_poznamka_cizi_dealy` | ne |
| B236 | Pipedrive | Akce `vitez` přepojí organizaci libovolného dealu a založí v CRM novou organizaci; vazbu dealu na zakázku server neověřuje. Zda si obchodník potřebný stav „prodáno“ zařídí sám přes API, PoC neověřil | `netlify/lib/pd_org_vitez.mjs:246, 304, 310`; `netlify/functions/pd_organizace.mjs:68-80` | `poc_IN_vitez_cizi_deal` | ne |

### Nízká

| ID | Oblast | Nález | Kde | PoC | main |
|---|---|---|---|---|---|
| B237 | zakázky | Razítko verze (B10) je dobrovolné: tělo bez `ocekavaneRazitko` nebo s `prepsat:true` přepíše cizí rozpracovanou zakázku bez kolize 409 | `netlify/functions/zakazky.mjs:134-140` | `poc_AZ_3_prepis_bez_razitka` | ano |
| B238 | lhůty PROJ D8 | Snímek lhůt `data.kryciProj.lhutyProj` píše klient bez kontroly tvaru a původu; u odeslané neprodané varianty ho přepíše kdokoli a Prodáno ho zmrazí | `src/zamek.js:673-676`; `src/objednane.js:451-455`; `src/lhuty_proj.js:286-291` | `poc_AZ_4_lhuty_snimek` | ne |
| B239 | limity | Neznámé klíče zakázky a megabajtové texty se ukládají (do 4 MB); `/api/vypocet` nemá strop těla a vrátí 11 MB; počet variant neomezen | `netlify/lib/zakazka_kontrola.mjs:116-158`; `netlify/functions/vypocet.mjs:30-34` | `poc_AZ_5_limity` | ano |
| B240 | účty | Akce správce zapisují celý účet přečtený před potvrzením hesla; souběh vrátí `hesloVerze` a otisk hesla (odhlášená relace znovu platí). Mez B156 to popisuje jako „bezpečný směr“, což neplatí. Útočník souběh sám nevyvolá | `netlify/functions/uzivatele.mjs:231, 292-295, 306-313, 514` | `poc_AU_spravce_stary_zapis` | ano |
| B241 | přihlášení | Počítadlo e-mailu nikdy nebrání správnému heslu, jediný strop je adresa (IPv6 po /64); 1 150 pokusů z 30 bloků bez odmítnutí. Síla hesla jen délka 8. Návrhové rozhodnutí, jako mez nezapsané | `netlify/functions/prihlaseni.mjs:74-97`; `netlify/lib/sdilene.mjs:139-149, 282-288` | `poc_AU_hadani_vice_adres` | ano |
| B242 | přihlášení | Bez `x-nf-client-connection-ip` se bere první položka `X-Forwarded-For` a bez obou se limit adresy nevede. Dopad jen mimo Netlify | `netlify/lib/sdilene.mjs:303-308, 317` | `poc_AU_hadani_vice_adres` | ano |
| B243 | vstupy | Objekt místo textu nebo čísla shodí funkci neošetřenou výjimkou (500 místo 400): karta zákazníka a počty analytiky (u analytiky stavový kód přes HTTP neověřen) | `src/zakaznici.js:63, 260`; `src/analytika.js:165` | `poc_AD_zakaznici` | ano |
| B244 | zákazníci | Číselník nemá strop počtu karet ani délky pole `zalozen` (u nové karty ho určuje klient); čte se kartu po kartě | `netlify/functions/zakaznici.mjs:41-47, 69-78` | `poc_AD_zakaznici` | ano |
| B245 | Pipedrive | `PIPEDRIVE_DOMENA` se nevaliduje; hodnota s `#`, `?`, `@` pošle token na cizí hostitele. Nastavuje jen správce Netlify. Odložené SEC-M14, které mělo přijít se zápisy do Pipedrive | `netlify/lib/pipedrive.mjs:67-74, 121, 125` | `poc_IN_pipedrive_klient` | ano |
| B246 | Pipedrive | Čtecí volání Pipedrive nemají výchozí časový limit (webhook, detail, seznam, mapa polí, stav, suchý běh) | `netlify/lib/pipedrive.mjs:134-143` | `poc_IN_pipedrive_klient` | ano, horší |
| B247 | šablony Word | Výjimka pro odkaz je širší než zamýšlená: projde vnější odkaz s relativním cílem a pole `HYPERLINK` na `\\server` / `file:`. Jen administrátor, nutné kliknutí | `src/sablona_obsah.js:58, 194-204, 302-307` | `poc_DO_sablona_server` | ano |
| B248 | šablony Word | Vnější vztah typu hyperlink projde, i když ho dokument použije jako odkazovaný obrázek. Chování Wordu neověřeno | `src/sablona_obsah.js:302-307` | `poc_DO_sablona_server` | ano |
| B249 | šablony Word | Symbol `{{…}}` uvnitř kódu pole kontrola pustí; uvozovka z dat ukončí argument a přidá přepínač. Zda takovou šablonu firma má, neověřeno | `src/docxgen.js:153-156, 194-211`; `src/sablona_obsah.js:200` | `poc_DO_vkladani` | ano |
| B250 | šablony | Server přijme nekanonický base64 a uloží ho celý; prohlížeč šablonu nenačte a dokument nejde vytvořit. Jen administrátor | `netlify/functions/sablony.mjs:73-83, 121` | `poc_DO_sablona_server` | ano |
| B251 | šablony | Název a poznámka šablony bez stropu a čištění (prošlo 200 kB + 500 kB, CRLF, NUL); jdou do rejstříku pro každého přihlášeného | `netlify/functions/sablony.mjs:61, 109-121` | `poc_DO_sablona_server` | ano |
| B252 | kontrola údajů | Workflow kontroly údajů při pushi dvou nových větví se stejnými commity naráz nezkontroluje žádný commit | `.github/workflows/kontrola_udaju.yml:54-56` | `poc_NS_workflow_dve_vetve` | ano |
| B253 | kontrola údajů | Slepé skvrny `kontrola_udaju.py`: vynechané složky i v `--rozsah`, UTF-16, tajemství bez uvozovek, adresa Apps Script, zpráva anotovaného tagu (9 z 10 případů prošlo) | `nastroje/kontrola_udaju.py:51, 86-87, 132-140, 223` | `poc_NS_kontrola_mezery` | ano |
| B254 | kontrola údajů | Povolený seznam se bere z téhož pushe: commit, který přidá `*@doména`, pustí libovolnou adresu té domény | `nastroje/kontrola_udaju.py:109-124`; `nastroje/hooky/pre-push:23, 50` | `poc_NS_kontrola_mezery` | ano |
| B255 | kontrola údajů | Hook jde vynechat i jinak než zakázaným `--no-verify` (`git -c core.hooksPath=…`, zápisy přes API GitHubu); CLAUDE.md jmenuje jen `--no-verify` | `nastroje/hooky/pre-push:18-19`; `nastroje/instaluj_hooky.sh:21` | `poc_NS_kontrola_mezery` | ano |
| B256 | XSS, druhá vrstva | Analytika, náhled obnovy, mapa polí CRM a „nanečisto“ vkládají čísla z odpovědi serveru do HTML bez escapování. Server text do čísel dnes nepustí, takže chybí jen druhá vrstva | `src/ui/analytika_ui.js:175-178, 249-261`; `src/ui/online_ui.js:4042, 4061`; `src/ui/pd_mapa_ui.js:68-73` | `poc_XS_analytika_cisla` | ano |
| B195 (zhoršení) | ruční ceny | Od #667 (v19.11.1) server přijme i nulovou ruční cenu: 68 položek na nulu se zdrojem o jednom znaku, základ OCK na 14 % výchozí hodnoty, bez schválení. Text meze v `BEZPECNOST_MEZE.md:1458-1464, 1479` tvrdí opak | `src/rucni_ceny.js:131, 159-163, 301-302` | `poc_AZ_8_rucni_cena_nula` | ne |

### Informativní

| ID | Oblast | Nález | Kde | main |
|---|---|---|---|---|
| B257 | schvalování | Schválení slevy se váže na id varianty a procento, ne na obsah; pod týmž id jde uložit dražší šachta (PoC `poc_AZ_6_schvaleni_obsah`) | `src/schvalovani.js:428-435, 477-487` | ano |
| B258 | schvalování | Rejstřík žádostí čte nejvýš 500 zakázek, zbytek jen ohlásí `neuplny` | `netlify/functions/schvalovani.mjs:36, 112-123` | ano |
| B259 | chybové odpovědi | 11 funkcí načítá jádro před přihlášením; při vadném nasazení vrátí text výjimky i anonymovi | `netlify/lib/jadro.mjs:42-48` | ano |
| B260 | účty | `emailPlatny` pustí řídicí znaky a znaky nulové šířky; zakládá jen administrátor | `netlify/lib/sdilene.mjs:142-145` | ano |
| B261 | účty | Profil a podpis jiného správce jde změnit bez `hesloSpravce` | `netlify/functions/uzivatele.mjs:160-214` | ano |
| B262 | starý server | `server/server.js` je nenasazovaná kostra bez přihlášení; `server/NASAZENI.md` to nezmiňuje | `server/server.js:79-144`; `server/NASAZENI.md:1-18` | ano |
| B263 | relace | Oddělení cookie test × ostrý při stejném tajemství drží jen shodou okolností (odmítne až `JSON.parse`) | `netlify/lib/sdilene.mjs:360-366, 384-397` | ano |
| B264 | víc zákazníků | Pohled zákazníka B po odemčení nese v historii odemčení snímek adresáta A; žádný generátor historii netiskne (PoC `poc_AD_vz_pohled`) | `src/vice_zakazniku.js:648, 1262-1268` | ne |
| B265 | víc zákazníků | Statická kontrola úniku hledá jen řetězec `dalsiZakaznici` v 8 souborech; nezná Objednávku PROJ ani náhled podkladů | `nastroje/kontrola_vz_unik.sh:11`; `src/test_vz_tisk_vstupy.js:39-53` | ne |
| B266 | obnova | Obnova karet zákazníků přijme klíč, který neodpovídá kartě; jen administrátor, bez PoC | `netlify/functions/obnova.mjs:889-899` | neověřeno |
| B267 | Pipedrive | `pd_deal.mjs` dává id z odpovědi do cesty bez `Number()`; hostitel se nezmění. Odložené SEC-M15 | `netlify/functions/pd_deal.mjs:73-78` | ano |
| B268 | Pipedrive | Bez proměnné `URL` se odkaz zapisovaný do dealu skládá z hostitele požadavku | `netlify/lib/pd_webhook.mjs:308-313` | ano |
| B269 | testy | `lib/pd_org_vitez.mjs` nemá v `mutace.mjs` žádnou mutaci | `netlify/mutace.mjs` | ne |
| B270 | šablony Word | Názvy položek ZIPu (`../`, absolutní, duplicitní) se nekontrolují a kopírují se do dokumentu | `src/docxgen.js:93, 108, 1414` | ano |
| B271 | šablony Word | Pole `FILENAME \p`, `USERNAME`, `AUTHOR` nejsou mezi zakázanými | `src/sablona_obsah.js:59` | ano |
| B272 | šablony | Šablona těsně pod stropem rozbalení zaměstná server asi 1,9 s; jen administrátor (navazuje na SEC-M17) | `src/docxgen.js:33, 100-104` | ano |
| B273 | šablony Word | `r:id` ze šablony jde bez escapování do `new RegExp`; generování s podpisem spadne (PoC `poc_DO_obrazek_regex`) | `src/docxgen.js:1207` | ano |
| B274 | testy | Hlídač escapování má `T` mezi bezpečnými obaly a nevidí HTML skládané v `src/nahled_word.js`; čísla mu unikají | `src/test_escape.js:180, 451-502, 672-676` | ano (část) |
| B275 | kontrola údajů | Workflow kontroly běží jen pro tagy `v*` | `.github/workflows/kontrola_udaju.yml:22` | ano |
| B276 | kontrola údajů | 42 snímků PNG ve verzovaném stromu žádná kontrola nečte | `.gitignore`; `nastroje/kontrola_udaju.py:137-140` | ano (část) |
| B277 | hlavičky | Chybí COOP/CORP a `upgrade-insecure-requests`; HSTS bez `preload` | `netlify.toml:39, 41` | ano |
| B278 | závislosti | Node připnut na 22.23.2 (novější opravné verze neposouzeny); `@netlify/blobs` 8.2.0 za aktuální řadou (online neověřeno) | `netlify.toml:22`; `package-lock.json` | ano |
| B279 | CSP | Po případném XSS CSP data neudrží: `window.open` a navigace ven projdou (fetch, obrázek a formulář jsou blokované); mez SEC-I9 to nezmiňuje (PoC `poc_XS_csp_odvod`) | `netlify.toml:41` | ano |
| B280 | evidence | B34, B36, B37, B38, B40, B41, B109, B110, B132 nemají v repu popis ani uzavření; poslední záznam „dál trvá“ | `podklady/HARMONOGRAM_2026-09-22.md:251` | — |
| B281 | evidence | B108 (klouzavé okno počítadla pokusů) platí, ale mezi vědomými mezemi zapsaný není | `netlify/lib/sdilene.mjs:241` | ano |
| B282 | testy | Pět starých auditních pokusů hlásí falešné FAIL (změněná pravidla); u `p4_zalohy_obnova.mjs` O13b, R1, R2 příčina do hloubky neověřena | `podklady/SECM_pokusy/`, `podklady/AUDIT2*_pokus_*.mjs` | — |
| B283 | testy | Vzory B131 (tvar těla) a B17 (cizí původ) mají mutaci jen pro starší funkce; `funkce`, `pd_organizace`, `pd_vazba`, `zaloha_vynuceno`, `controlling_export` ne. Dnes drží (PoC `poc_R1_vzory` → ODOLNÉ) | `netlify/mutace.mjs` | — |
| B90 (rozšíření) | záloha v prohlížeči | Záloha v prohlížeči po odhlášení nese i údaje dalších zákazníků zakázky | `src/ui/historie.js:30` | ne |

---

## Regrese známých nálezů

Úplné tabulky stavů: `cocky/cocka_R1.md` (B1–B150) a `cocky/cocka_R2.md` (B151–B230, SEC-M/Z/I).

| Rozsah | Opraveno | Trvá (mez / odloženo) | Nelze ověřit | Číslo nepřiděleno | Vrátil se |
|---|---|---|---|---|---|
| B1–B150 | 124 | 10 | 9 | 7 | 0 |
| B151–B230, SEC-* | viz `cocka_R2.md` | viz `cocka_R2.md` | SEC-Z1, SEC-M10, SEC-I2, SEC-I10–I12, SEC-I18 | B218, B219, B222, B229 | 0 |

- **Trvá jako vědomá mez:** B65, B66, B67, B79, B90, B94, B104, B117, B149; odložený B108.
- **Opraveno se zbytkem vedeným jako mez nebo úkol (#172):** B4, B10, B61, B62, B88, B93, B96, B98, B119, B137. B85 je „opraveno“ jen podle roadmapy (nastavení účtu Netlify z kódu ověřit nejde).
- **Zhoršené nebo zastaralé meze:** B195 (nulová ruční cena, viz tabulka), B90 (víc zákazníků v záloze prohlížeče), B153 (zbytek = B231), B156 (popis „bezpečný směr“ neplatí = B240), SEC-M14 a SEC-M15 (odklad propadl = B245, B267), B223 (hlídání nezná nové generátory = B265).
- **Nové funkce proti mezím:** UE #664 nezhoršila B28, B95, B148 ani B156; ON #679 odpovídá zápisu B230 (zapisuje jen čas, ukazuje ho jen administrátorovi); D6 a D8 se žádné meze nedotýkají.

## Rozdíly main × test

Podrobně `cocky/cocka_MT.md`. Soubory `netlify.toml`, `.github/`, hooky, `kontrola_udaju.py` a `package*.json` jsou na main a testu shodné.

**Na main chybí nebo je horší:**

| Téma | Vada na main | Opraveno na testu | Závažnost na ostrém |
|---|---|---|---|
| Antedatovaný prodej (K40-S1, #580) | Obchodník uloží novou zakázku s vlastním zámkem −300 dní a prodejem téhož dne; dolní mez data prodeje bere server z dat klienta (`src/objednane.js:385-395`). PoC `poc_MT_prodej_antedatace`: main 200, test 400 | v12.11.2 | střední |
| B231 dotisk bez zdroje | Dotisk OCK projde i s ruční cenou bez zdroje | pravidlo „bez zdroje = výjimka“ je jen na testu | součást B231 |
| Kvadratický ořez konce textu (K40-X1/X2) | 60 000 znaků = 1,5 s na volání v prohlížeči (PoC `poc_MT_orez_konce`) | v12.11.1 | nízká |
| Drahá diagnostika rozdílu zámku (K40-S2) | Běží na serveru při uložení zamčené varianty; neměřeno | v12.11.2 | nízká |
| Webhook bez pojistek vazby (K40c) | Naváže existující kalkulaci bez potvrzení, odmítnutí a protokolu | v12.11.7 | nízká |
| Úklid kopií na Disku (K40-X4, B205) | Bez pojistky proti kopii s budoucím datem | v12.11.1 | nízká |
| Časový limit Pipedrive (B246) | Limit není nikde | částečně | nízká |

**Nový povrch jen na testu (méně prověřený):** `POST /api/pd/vazba` a `POST /api/pd/organizace` (zápis do Pipedrive, B235, B236); poznámky dealu při uložení; server volá ARES; deal id zakázky smí měnit i autor (na main jen administrátor); víc zákazníků; lhůty PROJ D8 (B238); nulová ruční cena (B195); přítomnost online a klientské dokumenty z 19. 11. (Objednávka PROJ, náhled podkladů) — ty nemají serverové mutace.

## Co je v pořádku

**Autentizace a účty** (`poc_AU_relace_a_prava`: 53 z 53 pokusů odmítnuto, i nad main)
- Cookie relace má správné atributy; žádný výchozí klíč; role se bere vždy z účtu; náhled role je čistě klientský.
- Obchodník ani Vedoucí se ke správě účtů nedostanou; hromadné přiřazení polí neprojde.
- Odhlášení, změna hesla, reset, vypnutí i smazání účtu ruší relaci na serveru.
- Výčet účtů ani CSRF neprojdou; funkce neposílají hlavičky CORS.
- Anonymně bez klíče odpovídají jen `/api/zdravi`, `/api/prihlaseni` a `/api/odhlaseni`. Tabulka všech koncových bodů je v `cocky/cocka_AU.md`.

**Autorizace a data**
- Odemčení, smazání a změna zamčené varianty, podvržení razítek zámku, autora a prodeje, podvržené nebo přenesené schválení slevy, zaokrouhlení mimo výčet a prototypové klíče server odmítá.
- Zápisy číselníků (ceník, popisy, slovník, šablony, Firma, matice, controlling) a všechny zálohové cesty vracejí obchodníkovi 403 (17 případů).
- Stažená záloha nenese otisky hesel.
- Klíče úložišť: průchod cestou ani přepis systémového klíče nenalezen.
- Víc zákazníků: `test_vz_unik.js` 174 OK; únik údajů zákazníka B do dokumentu zákazníka A nenalezen.

**Integrace**
- Webhook Pipedrive a `/api/zaloha_disk` bez platného tajemství nic nečtou ani nezapisují (15 z 15 bodů odolných); chybějící tajemství znamená 503 / 403, ne průchod.
- Token Pipedrive není v odpovědích, chybách ani logu; suchý běh nezapisuje; simulátor se na ostrém nezapne.
- Server neposílá žádný e-mail; odchozí spojení jsou jen Pipedrive a ARES.

**Dokumenty a šablony**
- Šablonu zveřejní jen administrátor; server pouští stejnou kontrolu obsahu jako klient, i při vrácení verze a obnově.
- Odmítnuto všech 13 vektorů: attachedTemplate, vzdálený obrázek, vbaProject, přejmenovaný .docm, DOCTYPE/ENTITY, INCLUDETEXT, DDEAUTO, altChunk, OLE, `file://`, ZIP bomba, useknutý ZIP, připojený druhý archiv.
- Vkládání dat do Wordu odolalo 12 nepřátelským hodnotám; v kódu není žádný `DOMParser`.
- `nastroje/vyrob_sablony.js` a `preklad_sod.js` nespouštějí příkazy, nevolají síť a zapisují jen do složek z argumentů.

**XSS v klientu**
- Žádné zneužitelné XSS: obarvení všech textů zakázky (13 záložek, Nastavení, až 10 oken náhledů včetně náhledu Wordu a Objednávky PROJ) a všech řetězců v odpovědích 16 adres API nic nespustilo; podvržená odpověď ARES také ne.
- Staticky: žádné `eval`, `new Function`, `postMessage`, `srcdoc`, `insertAdjacentHTML`; vzorec „`esc()` uvnitř JS řetězce v `onclick`“ má 0 výskytů.

**Nasazení a supply chain**
- Web publikuje jen tři HTML; zdrojáky, `.git` a `.env` jsou zvenku nedostupné (živě 404).
- Živé hlavičky testovacího webu odpovídají `netlify.toml`; funkce nesou `no-store` a CSP `default-src 'none'`.
- Plánovaná noční záloha není přes HTTP dostupná (živě 403).
- Jediná závislost se zámkem a integritou, bez instalačních skriptů; žádný vendorovaný cizí kód.
- Workflows: nejmenší oprávnění, akce připnuté na SHA, vstupy přes `env`; „Smazat sloučené větve“ odolává injekci názvem větve i vstupem a chráněné větve nesmaže (`poc_NS_sloucene_vetve_jmena` → ODOLNÉ).
- V dostupné (mělké) historii gitu žádný živě vypadající klíč ani token; přetrvávají jen známé přijaté výskyty (SEC-S4, B79).

## Co testy a mutace nehlídají (výběr)

- Žádný test nepřepíná `jenProj` po zámku, nevynechává číslo zmrazeného výsledku, neposílá tělo bez razítka verze na cizí zakázku ani nekontroluje snímek lhůt před prodejem.
- Žádný test neběží nad stromem main.
- Objednávka PROJ a náhled podkladů nemají serverové mutace; mutace na vypuštění escapování chybí pro `nahled_word.js`, `objednavka_proj_ui.js`, `lhuty_proj_ui.js`, `ares_ui.js`, `online_ui.js`, `analytika_ui.js`.
- Obsah CSP a hlaviček v `netlify.toml`, připnutí akcí na SHA a soulad `package-lock.json` nehlídá žádný test.
- Escapování `&`, `<`, `>` a uvozovek v `xmlEsc` / `docxEsc` má mutaci jen na řídicí znaky; volání kontroly obsahu v generátoru a strop velikosti šablony mutaci nemají.
- Krok „Pushnuté commity“ workflow kontroly údajů nemá test.

Doporučení: převzít jako stálé sady kola `poc_XS_zakazka_taint`, `poc_XS_odpovedi_serveru` a `poc_R1_vzory`.

## Doporučený postup a pořadí oprav

1. **B231 — hned, samostatná dávka s poradcem.** Je to bezpečnostní mez i výpočet ceny, takže o řešení rozhoduje J. V. Není to „malá oprava“ pro rychlou cestu v úzkém smyslu, ale mění, co se dostane do odeslané nabídky, a platí i na main — doporučuji ji zařadit před další dávky a po kole poslat do testu bez čekání.
2. **B232** ve stejné dávce (stejný soubor `src/zamek.js`, stejná třída: server věří klientovi u zmrazeného výsledku).
3. **Do main dostat opravu K40-S1** (antedatovaný prodej) — na testu je od v12.11.2; rozhodnutí o sloučení testu do main je J. V.
4. **B233** (souběh počítadel přihlášení) — podmíněný zápis nebo klíč na každý pokus; samotný zámek v paměti na Netlify nestačí.
5. **B235 a B236** (zápisy do cizích dealů Pipedrive) — strop na uživatele a ověření vazby dealu na zakázku; bezpečnostní mez, rozhodnutí J. V. Než se rozhodne, zvážit vypnutí zápisových cest vypínačem funkce.
6. **B234** — rozhodnutí J. V.: zapsat jako mez, nebo doplnit historii verzí karty.
7. **Rozhodnutí J. V. k mezím:** B195 (nulová ruční cena — záměr #667, nebo vrátit odmítnutí nuly) a oprava textu `BEZPECNOST_MEZE.md`; B241 (síla hesla a hádání z více adres); B281 (zapsat B108).
8. **Nízké technické:** B237–B239, B243, B244, B246, B250, B251, B256 v jedné úklidové dávce; B247–B249 s úpravou kontroly šablon.
9. **Nástroje kola (svěřeno koordinaci):** B252–B255 (kontrola údajů), B265, B269, B274, B282, B283 a převzetí PoC jako sad.
10. **Evidence:** B280 — J. V. dohledá audity z 9. 9. na Disku, nebo se čísla uzavřou jako nedohledatelná.
