# Bezpečnostní test SEC-M: `main` v25.10.1 (kód lokálně + ostrý engscalc pasivně), 27.–28. 10. 2026

- **Dávka:** SEC-M #538, noční bezpečnostní test nad `main`. Schválil J. V. 27. 10. 2026 v dialogu (rozsah ze stránky dialogu, bod 4). Koordinace: session_01TMQ5bLDJuS5k5NWWYy7jLx.
- **Kód:** `main` `efa61c1` (v25.10.1), tedy to, co je nasazené na ostrém https://engscalc.netlify.app.
- **Zápis:** větev `claude/sec-m-main`, jen tato zpráva a pokusy v `podklady/SECM_pokusy/`.
  - **Kód aplikace se neměnil a verze se nezvyšovala.**
  - Jediná změna mimo podklady: řádek v `nastroje/povolene_kontakty.txt`. Je to smyšlená doména `a@utok.example` z pokusu SSRF, zapsaná s důvodem.
- **Srovnání:** integrace `origin/claude/integrace-16-10` `3d76572` (v27.10.6). Jen čtení (`git show`/`git diff`) a lokální kopie přes `git archive`; proti integraci se nic nespouštělo naostro. U každého nálezu je uvedeno, zda tam trvá.
- **Metoda:** pět nezávislých čoček (subagentů). Ostrý web (část B) šel jen z hlavního sezení.
  1. **server-A:** body 3–5 (přihlášení, matice oprávnění, původ).
  2. **server-B:** body 6–9 (fuzz, obchodní logika, zálohy a obnova, Pipedrive proxy).
  3. **klient:** body 2 a 10 (statika HTML, ReDoS, klíče Blobs, uložené XSS v UI, náhledech a DOCX/XLSX/CSV, CSP). Playwright nad vlastním sestavením `KNG_NEZVYSOVAT_VERZI=1 python3 build.py` v kopii stromu.
  4. **repo:** bod 1 (dodavatelský řetězec a tajemství v celé historii). Úplný mirror-klon: 130 refů, 6 367 blobů.
  5. **regrese:** bod 11 (sady, pokusy S1, cílené mutace jen v kopiích ve scratchpadu).
- **Část A** běžela lokálně: úložiště v paměti, podvržený `fetch` (žádný Pipedrive, Disk ani ARES), zkušební ceník, smyšlené účty `*@example.com` / `spravce@priklad.cz`.
- **Ve zprávě nejsou ceny ani osobní údaje.** `nastroje/kontrola_udaju.py` nad větví vyšla čistá.

## Verdikt

**`main` v25.10.1 VYHOVUJE S VÝHRADOU. Nový nález: 0 kritických, 0 vysokých, 1 střední, 12 nízkých, 9 informativních. Ostrý engscalc.netlify.app je pasivně v pořádku. Z dřívějška na `main` trvá jeden vysoký nález zálohování (K9-V1), integrace ho už opravila.**

- **Kód aplikace nemá nový kritický, vysoký ani střední nález.**
  - Matice oprávnění: 280 volání, 0 odchylek.
  - Přihlášení 27/27 a původ/CSRF/CORS 20/20.
  - Fuzz: 128 415 volání. Bez stacku v odpovědi, bez znečištění prototypu, bez zápisu mimo očekávané klíče.
  - Obchodní logika 55/55: zámek odeslané nabídky, schválení slevy a výjimky, minimální marže, P12, controlling.
  - Uložené XSS 2 179 OK / 0 FAIL, dokumenty 109 OK / 0 FAIL, CSP 30/30.
  - Mutace sady 531/531 chycených (server 497, jádro 34).
- **Jediný střední nález SEC-M1 je proces, ne kód:** kontrola osobních údajů a tajemství se před pushem nespouští. 26. 10. tak sdílecí odkaz `cshk` (SEC-S4) znovu odešel do dvou tagů a tří větví.
- **Nízké nálezy:** většina je odolnost serveru (500 místo 400, kvadratický regex), správcovské cesty obnovy a chybějící testy strážců.
- **Na `main` trvají opravené v integraci:**
  - **K9-V1 (vysoký, audit záloh K9):** obnova i náhled ze starého jednolitého otisku jedním požadavkem.
  - Pojistka úbytku a retence: K9-S1, S2, S4, S5, N1, N2, N5, N7.
  - SEC-I7: vedlejší správce smaže jiného správce bez hesla.
  - SEC-Z2: API bez CSP a Referrer-Policy.
  - Export controllingu bez `nosniff` (zbytek SEC-I1).
  - **Opraví je posun integrace → `test` → `main`.** Rozhoduje J. V.
- **Ostrý web (58 dotazů curl + 3 z Playwrightu):**
  - verze `25.10.1`, prostředí `ostre`, obsah = sestavení `efa61c1` až na 3 řádky data sestavení;
  - CSP znak po znaku = `netlify.toml`, všechny hlavičky na místě;
  - `/api/*` bez relace → 401/405 bez dat, bez `Access-Control-*`;
  - skryté cesty 404, výchozí adresy funkcí 404, **`zaloha_nocni` → 403 (K9-I9 uzavřen)**;
  - 0 porušení CSP, 0 cizích požadavků.

| | Počet | Nálezy |
|---|---|---|
| Kritické | 0 | — |
| Vysoké | 0 | — (z dřívějška na `main` trvá K9-V1, v integraci opraveno) |
| Střední | 1 | SEC-M1 |
| Nízké | 12 | SEC-M2 … SEC-M13 |
| Informativní | 9 | SEC-M14 … SEC-M22 |

**Trvá v integraci:** všech 22 nových nálezů. Nová ID dostaly jen nálezy, které integrace neopravila; opravené dřívější jsou v oddílu „Dřívější nálezy“.

## Nálezy

Pokusy se spouštějí z kořene repa (`node podklady/SECM_pokusy/<čočka>/<soubor>`). Sloupec „Integrace“ = trvá v `3d76572` (v27.10.6).

| ID | Vážnost | Oblast | Kde (`main`) | Pokus → výsledek | Integrace | Návrh opravy (+ test s pojistkou) | Mění chování |
|----|----|----|----|----|----|----|----|
| **SEC-M1** | **střední** | Proces: tajemství a odkazy do veřejného repa | `nastroje/testovaci_kolo.sh` (kontrola údajů jen v kole), `.github/workflows/testy.yml` (`on: push` jen `main`) | `repo/kontrola_tipu.sh` nad mirror-klonem: commit `9bc4965` (26. 10.) znovu vložil plný odkaz `claude.ai/code/cshk_…` do `.claude/skills/kokpit-koordinace/kokpit_sablona.html`. Kontrola nad jeho stromem dává 1 nález, před pushem se tedy nespustila. Oprava `25d2c32` přišla o 9 min později, odkaz ale mezitím odešel do **tagů v26.10.3 a v26.10.4** a do 3 větví (`claude/114-prehled-mapy-poli`, `claude/518-zvyrazneni-prekladu`, `claude/o1-zamek-plan`). Push protection GitHubu tvar `cshk_` nezná. | ano (proces stejný; tip čistý) | 1) Hook `pre-push` v `nastroje/hooky/` (`core.hooksPath`, nastaví ho SessionStart hook) spustí `kontrola_udaju.py` a při nálezu push zastaví. 2) Workflow `kontrola_udaju.yml` na `push` do `**` a tagů `v*` (`contents: read`, bez instalace balíčků). 3) J. V.: vlastní vzor secret scanningu `claude\.ai/code/cshk_` s push protection; **hlavně zrušit sdílení odkazu v claude.ai** (SEC-S4). Test `nastroje/test_pre_push.sh`: dočasné bare repo a commit se smyšleným `cshk_`; bez hooku push projde (pojistka), s hookem kód ≠ 0. | ne (nástroje) |
| SEC-M2 | nízký | Server: hluboké vnoření → 500 (třída K5-S1/SEC-N1), **i obchodník** | `netlify/functions/zakazky.mjs:107` (`JSON.stringify` mimo try); `program.mjs` POST; `obnova.mjs:598`, `:603` | `server_b/p3_hluboke_typy.mjs` H: `{"zakazka":[[[…10 000…]]]}` (tělo jen 20 kB) → `RangeError: Maximum call stack size exceeded` → 500. Zakázky 3 tvary, program (admin), náhled obnovy ze souboru (admin). Data se nemění. | ano | Sdílená `hloubkaTela(t, 64)` v `sdilene.mjs` hned po `req.json()` → 400 „Vstup má příliš hluboké vnoření“, nebo try kolem čtení, `JSON.stringify` a importu. Test podle p3 H: dnes 5× výjimka, po opravě 400. | ne |
| SEC-M3 | nízký | Server: kvadratický regex (ReDoS) při uložení zakázky | `netlify/lib/zakazka_kontrola.mjs:131-134` (`uloJmenoSouboru` běží **před** kontrolou `CISLO_MAX`); `src/uloziste.js:63` `.replace(/[-.]+$/, '')` | `klient/redos_server.mjs`: číslo `'A'+'-.'×N+'x'` drží funkci 0,19 s (20k znaků), 1,5 s (50k), 5,1 s (100k), 20 s (200k) a pak vrátí 400 „nejvýš 60 znaků“. Stačí přihlášený obchodník; každý požadavek pálí vyvolání funkce až do limitu. V integraci 5,8 s při 100k. | ano | Délku `zak.cislo` i `projHlavicka.cislo` kontrolovat před `uloJmenoSouboru`. V `uloKlicSouboru` nejdřív `slice(0, 200)`, koncové `-`/`.` ořezat smyčkou. Test: uložení s číslem o 200k znacích pod 100 ms a 400 (dnes > 1 s). | ne |
| SEC-M4 | nízký | Server: délka čísla PROJ bez stropu | `zakazka_kontrola.mjs:133` (`CISLO_MAX` hlídá jen `zak.cislo`); `src/uloziste.js:77-78` | `klient/redos_server.mjs` „VÝSLEDEK 2“: prázdné číslo a `projHlavicka.cislo` o 5 001 / 50 001 znacích → 200, klíč 5 008 / 50 009 znaků. V rejstříku je, `GET` vrací 400, takže zakázku nejde otevřít ani smazat. Ve skutečných Blobs (strop klíče cca 600 B) nejspíš 500 (odvozeno). | ano | `CISLO_MAX` i na `projHlavicka.cislo`, nebo na výsledné jméno. Test: číslo PROJ s 61 znaky → 400. | ne |
| SEC-M5 | nízký | Původ: GET s vedlejším účinkem | `netlify/functions/controlling_export.mjs:38-43`, `:143-150` (GET bez kontroly původu, zapisuje protokol exportů) | `server_a/pokus_puvod.mjs` [6]: GET `/api/controlling/export` s `Origin: https://utocnik.example` a cookie správce → **200**, protokol 0 → 1 záznam. Pro srovnání `pd/dealy` → 403. Data cizí stránka nepřečte (bez CORS) a `SameSite=Lax` pustí cookie jen při navigaci nejvyšší úrovně. Vznikne jen zápis do protokolu a spotřeba limitu. | ano | U GET zapisujícího protokol volat `cizihoPuvodu(req)` → 403 (jako `pdPristup`), nebo zapsat protokol až po kontrole původu. Test `netlify/test_controlling_export_puvod.mjs`: GET s cizím Origin → 403 (dnes 200). | ne |
| SEC-M6 | nízký (jen admin) | Server: `{"toString":1}` → 500 v obnově (zbytek SEC-N1) | `netlify/functions/obnova.mjs:305` `String(t.faze)`, `:223`, `:326` `String(t.obnovaId)`, `:340` `String(t.rezim)`, `:409` `String(zd.otisk)` | `server_b/p3_hluboke_typy.mjs` O: 5/5 → „TypeError: Cannot convert object to primitive value“ (fuzz `p1_fuzz_vse.mjs` 16 kombinací). | ano | `textovaPoleChyba(t, ['faze','obnovaId','rezim'])` → 400, nebo `typeof x === 'string' ? x : ''`. Test podle p3 O. | ne |
| SEC-M7 | nízký | Server: prototypové klíče v programu (třída SEC-I3, ta kryje jen zakázku) | `netlify/functions/program.mjs:62-65` (`slevy`, `katalog` bez kontroly); `obnova.mjs:561` (zápis `program` ze souboru) | `server_b/p3_hluboke_typy.mjs` P: správce uloží `slevy:{"__proto__":{…}}` → 200. Klíč je v `program/db` i v GET `/api/program` **u každého obchodníka**; kdo ho slije `Object.assign`, dostane cizí strop. `p4_zalohy_obnova.mjs` O16: obnova ze souboru zapíše `program` s `__proto__`, stropem obchodníka 1 a `minMarze` 0, bez `cenikZverejneniKontrola`. `Object.prototype` čistý; slévání v klientu grep nenašel (dopad odvozený). | ano | Obecnou `bezPrototypovychKlicu` uplatnit na těla `/api/program`, `/api/controlling`, `/api/popisy` a na části obnovy; `program` z obnovy přes `programZaznam`. Test podle p3 P a p4 O16. | ne |
| SEC-M8 | nízký (jen admin) | Obnova: jednorázová obnova bez zámku, přepis otisku „před obnovou“ | `netlify/functions/obnova.mjs:463-478` (jednorázová obnova nezapíše token); `netlify/lib/zalohovani.mjs:102-105` (klíč s rozlišením na sekundu) | `server_b/p4_zalohy_obnova.mjs` O13: během jednorázové obnovy A druhý správce `faze:'zacatek'` → **200**, obě obnovy běží. Otisk „před obnovou“ A přepsal otisk B ze stejné sekundy (jiné `kdo`). Dvě jednorázové obnovy se vyloučí (O14 → 409). | ano (O13 200) | Jednorázová obnova zapíše token jako `zacatek` (`vyhradne('zalohy/obnova')`), nebo 409 s odkazem na fáze. `klicPredObnovou` s milisekundami nebo náhodnou příponou. Test podle O13. | ne |
| SEC-M9 | nízký (jen admin) | Obnova: klíče zakázek ze souboru bez kontroly tvaru | `netlify/functions/obnova.mjs:593-596` (jen `!k \|\| k.length > KLIC_MAX`) | `klient/blob_klic_obnova.mjs`, `server_b/p4_zalohy_obnova.mjs` O15: upravený soubor zálohy s klíči `a/b.json`, `../x.json`, `c\u0001d.json` se zapíše do `z/…` i rejstříku. `GET`/`DELETE` → 400 (`klicZAdresyPlatny`), takže zůstanou sirotci, které nejde smazat. Zda `z/../…` ve skutečném SDK Blobs opustí prefix, se neověřilo (odvozeno). | ano | V obnově `klicZAdresyPlatny` a odmítnout segmenty `.`, `..`; neplatné klíče do „přeskočeno“ s důvodem v náhledu. Test v `test_obnova.mjs`: klíč s `/` → přeskočeno. | ne |
| SEC-M10 | nízký | Veřejné repo: skrytý ref se SEC-V1 | `refs/claude-teleport/83c754161ed65ad9` (commit `f2bdf4e`, 18. 9.) | `repo/kontrola_tipu.sh`: veřejné `info/refs` ref inzeruje a jeho strom nese telefon ze SEC-V1. Není to větev ani tag, takže ho `sloucene_vetve.sh`, tlačítko v Actions ani seznam větví nevidí. | ano (ref repa) | J. V. lokálně: `git push origin --delete refs/claude-teleport/83c754161ed65ad9`. Navržené `kontrola_udaju.py --vetve` (SEC-V1) ať prochází `git ls-remote origin` (všechny refy). Test: dočasné repo s refem `refs/x/y` se smyšleným telefonem; bez volby kód 0, s volbou 1. | ne |
| SEC-M11 | nízký | Detekce tajemství (zbytek SEC-N4) | `nastroje/kontrola_udaju.py:33` (`SLOZKY`), `:37-40` (přípony), `:51-80` (vzory) | `repo/kontrola_mezery.py`: kód 0 u nové kořenové složky, `manual_vypocet/`, kořenového `.npmrc` s `_authToken`, souboru bez přípony, `src/*.ts`, vzorů `npm_`, `AIza`, JWT, `sk-proj-` a 40 hex bez názvu tokenu. Zachyceno 0 z 11 zasazených případů na `main`, 1 z 11 v integraci; kontrolní případ OK. | ano (10/11) | Procházet `git ls-files` + `git ls-files -o --exclude-standard` (binární přeskočit podle NUL) místo seznamu složek a přípon. Doplnit vzory `npm_[A-Za-z0-9]{36}`, `AIza[0-9A-Za-z_-]{35}`, JWT a `sk-(proj-)?`. Test `src/test_kontrola_udaju.js` + těchto 10 případů (dnes FAIL). | ne |
| SEC-M12 | nízký | Testy: strážce „hlavní účet nejde archivovat“ bez testu | `netlify/functions/uzivatele.mjs:320`; test `netlify/test_prava.mjs:2864-2866` volá s cookie hlavního správce, takže 400 vrátí už jiný strážce (`:324`) | `regrese/vlastni_mutace.mjs` R-M5: **nechycená** (v integraci také). `regrese/r2_strazci_bez_testu.mjs`: na `main` vedlejší správce → 400 (drží), se strážcem vypnutým → 200 a hlavní účet archivovaný. | ano | Test v `test_prava`: `{akce:'archiv', email: ADMIN_EMAIL, archiv:true}` s cookie **vedlejšího** správce → 400, `archiv` false. Pojistka: s mutantem R-M5 spadne. | ne |
| SEC-M13 | nízký | Testy: zpoždění brzdy hesla bez testu | `uzivatele.mjs:114` (`mojeheslo`), `netlify/lib/sdilene.mjs:621` (`potvrdHesloSpravce`): `await pockej(zpozdeniMs(...))` | `regrese/vlastni_mutace.mjs` R-M7, R-M9: **nechycené** (v integraci také). U přihlášení totéž hlídá statická kontrola `test_prava.mjs:3324` (R-M8 chycená). Limity 429 drží. | ano | Stejnou kontrolu `pockej(…zpozdeniMs(` doplnit pro `mojeheslo` a `potvrdHesloSpravce`, nebo měřit čas 11. špatného pokusu. Pojistka: R-M7, R-M9. | ne |
| SEC-M14 | info | Pipedrive: `PIPEDRIVE_DOMENA` se neověřuje | `netlify/lib/pipedrive.mjs:50-56` (`pdZaklad`) | `server_b/p5_pipedrive.mjs` S1: `utok.example#`, `?`, `\`, `127.0.0.1#`, `[::1]#` pošlou `x-api-token` na cizího hostitele; `utok.example:443` → 500. Nastavit to umí jen správce Netlify (chyba nastavení, ne útok). | ano | `pdZaklad`: po ořezu jen `^[a-z0-9-]{1,63}$`, jinak `PdChyba` „neplatná doména“. Test: tabulka domén z p5 → `*.pipedrive.com`, nebo chyba bez fetch. | ne |
| SEC-M15 | info | Pipedrive: důvěra v odpověď upstreamu | `netlify/functions/pd_deal.mjs:76-79` (`org_id`, `person_id` do cesty); `pipedrive.mjs:88` (`popisStavu` vrací `telo.error`) | `server_b/p5_pipedrive.mjs` D2: `org_id:"1/../../../v1/users/me?x="` → fetch na `/api/v1/users/me` téhož hostitele s tokenem. TK1: chybová odpověď, která by nesla token, dojde do prohlížeče. Skutečný Pipedrive token neozvěnuje a id vrací jako čísla. | ano | `Number.isSafeInteger(+id) && id > 0` před `/organizations/`, `/persons/`; `telo.error` zkrátit na 200 znaků a vyškrtnout hodnotu tokenu. | ne |
| SEC-M16 | info | Klient: úvodní fotka s cizí adresou | Server fotku nekontroluje; `src/ui/zakazka_ui.js:791`, `:803` (`<img src="${esc(ZAK[p.foto])}">`) | `klient/foto_externi.mjs`: server přijme `uvodniFoto = 'https://zlo.example/pixel.png'` (logo a podpis má omezené na `data:image`, fotku ne). Na webu požadavek zablokuje CSP. V souboru otevřeném z disku (bez CSP) odejde 3× jako sledovací pixel. Word fotku zahodí. | ano | Na serveru i při importu jen `^data:image/(png\|jpeg\|webp);base64,`. Test: zakázka s fotkou `http://…` → 400 / fotka zahozena. | ne |
| SEC-M17 | info | Kvadratické regexy v klientu / nad vstupem správce | `src/docxgen.js`, `kontroly.js:893`, `kryci.js`, `nabidka.js`, `plan_plateb.js`, `sablony_online.js:205`, `sablona_obsah.js:296`, `zakazka.js:1590`, `zamek.js:113`, `netlify/lib/pipedrive.mjs:52` aj. (33 výrazů) | `klient/redos.mjs`: 607 výrazů (594 změřených ve vláknech s limitem), **exponenciální 0**. 33 roste kvadraticky (při 20k znacích 0,2–1,6 s). Vstup je šablona nebo proměnná od správce, případně text s omezenou délkou; jinak zpomalí jen vlastní prohlížeč. | ano | Jen při příležitosti: ořez vstupu, ořez smyčkou. | ne |
| SEC-M18 | info | Testy: kontrola autora tokenu obnovy po dávce | `obnova.mjs:796` (`stale.kdo !== relace.email`) | `regrese/vlastni_mutace.mjs` R-M22 nechycená. Okno je úzké: jen správce, a jiný správce by musel token mezi dávkami zrušit a založit znovu. Vstupní kontrola (`:227`, R-M21) chycená. | ano | Test v `test_obnova`: přepsat token na jiného správce, další dávka → 410 a nic se nezapíše. | ne |
| SEC-M19 | info | Testy: zdvojená pojistka hlavního účtu v obnově | `obnova.mjs:675` | R-M24 nechycená, ale v běžných cestách ekvivalentní: stav účtu drží B30 `stavUctuDrziServer` (`:659`) a cizí obnovu hlavního účtu odmítne `:650` (ověřeno pokusem). | ano | Nic, nebo test jen pokud má zůstat pojistkou pro DB bez hlavního účtu. | ne |
| SEC-M20 | info | Nástroj auditu: falešný verdikt pokusu S1 | `podklady/S1_pokusy/server/p3_zamek_soubeh.mjs` (poslední řádek) | Na `main` po O-K8 hlásí „ZÁMEK … ZTRACEN“, i když A dostal 409 (verdikt nebere 409 v úvahu). Náhrada `regrese/r1_zamek_soubeh_main.mjs`: oba pořadí souběhu, pojistka na `ca4f2d1` („VADA“), na `main` i v integraci drží. | ano | Verdikt p3 opravit podle r1, aby nikdo nehlásil falešnou regresi SEC-S1. | ne |
| SEC-M21 | info | Běhové prostředí | `netlify.toml:20` `NODE_VERSION = "22.23.2"` | `repo/dodavatelsky_retezec.sh`: v registru jsou novější 22.23.3 a 22.23.4 (zda bezpečnostní, neověřeno). Pevný patch opravy sám nedostane a Dependabot `netlify.toml` nehlídá. | ano | Pravidelně (kolo, měsíc) ověřit nejnovější 22.x a vědomě povýšit spolu s CI `node-version`. | ne |
| SEC-M22 | info | Závislosti: rozsah verze | `package.json:5` `"@netlify/blobs": "^8.1.0"` | Zámek 8.2.0 (`registry.npmjs.org`, sha512 = registr, bez install skriptů), `npm audit` 0. 8.2.0 je nejvyšší verze v `^8`, takže dnes nic neujíždí. Poslední major 11.1.7. | ano | `"8.2.0"` přesně, aby přegenerovaný zámek nevzal jinou verzi. Major rozhodnout s Dependabotem (SEC-I13). | ne |

## Dřívější nálezy: stav na `main` a v integraci

| Nález | Na `main` | V integraci | Doklad |
|---|---|---|---|
| **K9-V1 (vysoký, audit záloh K9)**: obnova a náhled ze starého jednolitého otisku jedním požadavkem | **trvá** (`obnova.mjs:411`, `:473`, čtením) | opraveno (#529 O-T) | `server_b/p6_k9_na_main.mjs`, čtení |
| K9-S1, K9-S2, K9-N2, K9-S5, K9-N7 (pojistka úbytku, retence) | **trvá**, 5/5 reprodukováno (např. 800 → 447 zakázek za 14 nocí bez varování; 100 → 19 bez varování) | opraveno (`p4` R6 v integraci: 13 varování) | `server_b/p6_k9_na_main.mjs`, `p4_zalohy_obnova.mjs` R6 |
| K9-S4, K9-N1, K9-N5, K9-I3 | trvá (čtením) | opraveno | čtení |
| K9-I2, K9-I5, K9-I7 | trvá | I2 a I5 trvají, I7 rozhodnutí | čtení |
| K9-S6, K9-N3, K9-N4, K9-N6 | netýká se (kód na `main` není) | — | — |
| **K9-I9** `zaloha_nocni` přes URL | **uzavřeno živě**: ostrý → 403 s prázdným tělem (20:06:18 UTC). Handler sám kontrolu nemá (SEC-I2), přímé volání v paměti → 200 a metadata bez otisků hesel. | stejné | `zivy/vysledek_engscalc.tsv` ř. 38, `server_a/matice.md` |
| SEC-I7: vedlejší správce smaže, vypne, archivuje a sníží roli jiného správce bez hesla | **trvá** (4/4 → 200) | opraveno (#517: `hesloJinySpravce`) | `server_a` (reprodukce), `git diff` `uzivatele.mjs` |
| SEC-Z2: odpovědi `/api/*` bez CSP a Referrer-Policy | **trvá** (ostrý: `zivy/hlavicky_api_ja.txt`) | opraveno (`JSON_HLAVICKY` + CSP, Referrer-Policy) | živě + `git show` |
| SEC-I1, zbytek: `controlling_export` bez `nosniff` | **trvá** | opraveno (`JSON_HLAVICKY`, #521) | `server_a`, `git show` |
| SEC-S7: Pipedrive „1.000 Kč“ → 1 | trvá (mění chování, O-K8 neopravoval) | trvá | `S1_pokusy/funkce/p3_pd_cisla.mjs` |
| SEC-I8 (cookie bez `__Host-`), SEC-I9 (`unsafe-inline`), SEC-I10 (mezery `overit_xss`) | trvá (vědomé/rozhodnutí) | trvá | `klient/csp.mjs`: sonda pod CSP se spustí, `window.open` ven projde |
| SEC-V1: telefon kolegy | **na `main`, `test` i `test-draft` 0 výskytů (vyřešeno posunem)**; trvá v 19 větvích `claude/*` (7× `claude/integrace-*`), v 49 z 68 tagů a v refu teleport (SEC-M10) | tip čistý | `repo/kontrola_tipu.sh` |
| SEC-V2: free-mail v `claude/testovani-po-opravach` | trvá | — | `repo/kontrola_tipu.sh` |
| **SEC-S4: sdílecí odkaz `cshk_`** | **trvá a rozšířil se**: S1 hlásil 4 větve + 3 tagy, dnes 7 větví + 5 tagů (v22.10.5, v22.10.6, v23.10.1, **v26.10.3, v26.10.4**), příčina viz SEC-M1 | tip čistý | `repo/kontrola_tipu.sh` |
| SEC-N4 | částečně opraveno, zbytek SEC-M11 | totéž | `repo/kontrola_mezery.py` |
| SEC-N5 (`.gitignore`) | opraveno | opraveno | čtení |
| SEC-N6: CI ve starých větvích | trvá (5 větví bez `permissions:`) | — | `repo/dodavatelsky_retezec.sh` |
| SEC-N7: supply chain CI | částečně: `persist-credentials: false` ve všech 3 checkoutech; Playwright v CI bez zámku (přesná verze 1.56.1, bez známé CVE) | totéž | čtení |
| SEC-I11 (částky v CHANGELOG, roadmapě), SEC-I12 (adresy v metadatech commitů), SEC-I13 (bez Dependabotu; `dependabot_security_updates` vypnuté), SEC-I14 (integrační větve) | trvá | trvá (I11 roste: CHANGELOG 15× → 21×) | `repo/` |
| SEC-Z1: opuštěné schaftscalc.netlify.app | v této dávce se **neověřovalo** (zákaz) | — | rozhodnutí J. V. ze S2 |

## Regrese (bod 11)

- **Žádný dřív opravený bezpečnostní nález se na `main` nevrátil.**
- **Sady:** 34 serverových sad zelených. Hlavní z nich: `test_prava` 932/0, `test_prihlaseni` 67/0, `test_ok8` 69/0, `test_typy_k7` 36/0, `test_zalohy` 162/0, `test_obnova` 235/0, `test_pipedrive` 96/0, `test_pd_pristup` 54/0, `test_rejstrik_soubeh` 11/0. Dále 216 sad `src/test_*.js` zelených, z toho `test_escape` 42/0.
- **Pokusy S1 na `main`:**
  - `p1_fuzz_typy` 36 380 volání, 0 výjimek (SEC-N1 drží);
  - `p2_mojeheslo_soubeh` 3× drží (SEC-S2);
  - `escjs_radky` 6× OK (SEC-N3);
  - SEC-S1 drží podle nového `r1_zamek_soubeh_main.mjs` (`p3` dává falešný verdikt, SEC-M20).
- **Cílené mutace** (jen v kopiích `git archive efa61c1` ve scratchpadu, 20:10–22:08 UTC, žádný běh nad 2 h, kopie po běhu čisté):

| Filtr (`node netlify/mutace.mjs "<filtr>"`, velké po `--cast 1/2`, `2/2`) | Chycené | Čas |
|---|---|---|
| uzivatele | 44/44 | 36 min |
| obnova | 46/46 | 39 min |
| zakazky | 20/20 | 22 min |
| src/zamek.js | 43/43 | 58 min |
| lib/sdilene | 36/36 | 17 min |
| prihlaseni / odhlaseni / ja | 16/16, 3/3, 2/2 | 11 min |
| zaloha* / lib/uklid / lib/zalohovani | 24/24, 4/4, 67/67 | 108 min |
| controlling* | 27/27 | 27 min |
| pd_* / lib/pipedrive / lib/pd_stav | 10/10, 7/7, 12/12 | 39 min |
| lib/zakazka_kontrola | 74/74 | 46 min |
| sablony, program, firma, slovnik, popisy, analytika, zobrazeni, zakaznici, schvalovani, vypocet, zdravi | 60/60 | 37 min |
| **Server celkem** | **497/497** | |
| Jádro (`node mutace_jadro.mjs`): ui/common.js (vč. SEC-N3), zamek, online_ui, ares_ui | **34/34** | 7 min |

- **Vlastní mutace strážců** bez mutace v sadě (`regrese/vlastni_mutace.mjs`, 29 mutací, 36 min):
  - **24/29 chycených.** Patří sem kontrola role u obnovy, analytiky, zákazníků, matice a záloh, Origin, `nosniff`, X-Forwarded-Host a `esc()`, `escJs`, `xmlEsc` jako identita.
  - Nechycené R-M5, R-M7, R-M9, R-M22, R-M24 jsou SEC-M12, SEC-M13, SEC-M18, SEC-M19. Trvají i v integraci; ta na ně nemá ani mutaci (porovnáno s jejími 1 098 mutacemi).

## Matice oprávnění (bod 4)

Vyrobeno automaticky (`server_a/matice.mjs`, 56 řádků × 5 rolí = 280 volání), každá buňka porovnaná s očekávaným kódem podle záměru kódu a `BEZPECNOST_MEZE.md`.
- Buňka = skutečný HTTP kód, `✗` = odchylka.
- Role: anon = nepřihlášený, obch = Obchodník, ved = Vedoucí, admin2 = vedlejší Administrátor, admin = hlavní správce (`ADMIN_EMAIL`).
- IDOR: čtení i zápis cizí zakázky a karty zákazníka obchodníkem jsou záměr (sdílená firemní DB, #103). Mazání a cizí profil smí jen administrátor.
- `pd/*` řídí matice `crm.pipedrive` (výchozí stav: obchodník a vedoucí smějí, J. V. v15.10.7).

| Cesta + metoda/akce | anon | obch | ved | admin2 | admin | poznámka |
|---|---|---|---|---|---|---|
| prihlaseni POST (správné heslo obch) | 200 | 200 | 200 | 200 | 200 | anon se přihlásí; přihlášený také (bez cookie kontroly) |
| prihlaseni GET (špatná metoda) | 405 | 405 | 405 | 405 | 405 |  |
| odhlaseni POST | 200 | 200 | 200 | 200 | 200 | anon bez relace 200 (jen smaže cookie) |
| odhlaseni GET (špatná metoda) | 405 | 405 | 405 | 405 | 405 |  |
| ja GET | 401 | 200 | 200 | 200 | 200 |  |
| zdravi GET (veřejné) | 200 | 200 | 200 | 200 | 200 |  |
| zakazky GET rejstřík | 401 | 200 | 200 | 200 | 200 |  |
| zakazky GET vlastní | 401 | 200 | 200 | 200 | 200 |  |
| zakazky GET CIZÍ (IDOR čtení) | 401 | 200 | 200 | 200 | 200 | sdílená DB: čtení cizí zakázky je záměr (#103) |
| zakazky POST uložení (nové číslo) | 401 | 200 | 200 | 200 | 200 | zápis smí každý přihlášený (sdílená DB) |
| zakazky POST přepis CIZÍ (IDOR zápis) | 401 | 200 | 200 | 200 | 200 | přepis cizí zakázky obchodníkem je záměr (sdílená DB) |
| zakazky DELETE CIZÍ (IDOR mazání) | 401 | 403 | 403 | 200 | 200 | mazat smí jen admin → obch/ved 403 |
| zakazky PUT (špatná metoda) | 401 | 405 | 405 | 405 | 405 | metoda se kontroluje až po vyzadujRoli → anon 401 |
| zakaznici GET seznam | 401 | 200 | 200 | 200 | 200 |  |
| zakaznici GET CIZÍ karta | 401 | 200 | 200 | 200 | 200 |  |
| zakaznici POST uložení | 401 | 200 | 200 | 200 | 200 |  |
| zakaznici DELETE CIZÍ (IDOR) | 401 | 403 | 403 | 200 | 200 | mazat smí jen admin |
| uzivatele GET seznam | 401 | 403 | 403 | 200 | 200 |  |
| uzivatele POST mojeheslo (špatné staré) | 401 | 401 | 401 | 401 | 401 | přihlášený: staré nesouhlasí → 401; anon → 401 (nepřihlášen) |
| uzivatele POST profil VLASTNÍ | 401 | 200 | 200 | 200 | 200 |  |
| uzivatele POST profil CIZÍ (IDOR) | 401 | 403 | 403 | 200 | 200 | cizí profil jen admin → obch/ved 403 |
| uzivatele POST role (povýšení obch→admin bez hesla správce) | 401 | 403 | 403 | 401 | 401 | admin bez hesloSpravce → 401 (kód hesloSpravce) |
| uzivatele POST zaloz (bez hesloSpravce, role Obchodník) | 401 | 403 | 403 | 200 | 400 | obch/ved 403; admin2 založí (200), admin už existuje (400) — akce se potvrdila |
| uzivatele DELETE (špatná metoda) | 401 | 405 | 405 | 405 | 405 |  |
| obnova POST | 401 | 403 | 403 | 400 | 400 | admin: tělo bez platného režimu → 400 (auth prošla) |
| obnova GET (špatná metoda) | 405 | 405 | 405 | 405 | 405 | kontrola metody je PŘED auth → 405 i anonymovi |
| zaloha GET (stažení DB) | 401 | 403 | 403 | 200 | 200 |  |
| zaloha_vynuceno GET | 401 | 403 | 403 | 200 | 200 |  |
| zaloha_vynuceno POST (otisk) | 401 | 403 | 403 | 200 | 429 | admin2 otisk (200), admin v tomtéž okně limit 1/10 min (429) |
| zaloha_nocni PŘÍMÉ zavolání (bez plánovače) | 200 | 200 | 200 | 200 | 200 | nemá config.path; handler nemá žádnou kontrolu — viz SEC-I2 |
| program GET | 401 | 200 | 200 | 200 | 200 |  |
| program POST zveřejnit ceník | 401 | 403 | 403 | 200 | 400 | obch/ved 403; admin2 zveřejní prázdný ceník (200, mez B113), admin „neliší se" (400) |
| firma GET | 401 | 200 | 200 | 200 | 200 |  |
| firma POST | 401 | 403 | 403 | 400 | 400 |  |
| zobrazeni GET | 401 | 200 | 200 | 200 | 200 |  |
| zobrazeni POST (bez hesla správce) | 401 | 403 | 403 | 401 | 401 | změna matice chce hesloSpravce (B168) → admin bez něj 401 |
| popisy GET | 401 | 200 | 200 | 200 | 200 |  |
| popisy GET ?sber=1 (jen admin) | 401 | 403 | 403 | 200 | 200 |  |
| popisy POST | 401 | 403 | 403 | 200 | 200 |  |
| slovnik GET | 401 | 200 | 200 | 200 | 200 |  |
| slovnik POST (nic se neliší) | 401 | 403 | 403 | 400 | 400 |  |
| sablony GET rejstřík | 401 | 200 | 200 | 200 | 200 |  |
| sablony POST rezim | 401 | 403 | 403 | 200 | 200 |  |
| controlling GET | 401 | 403 | 403 | 200 | 200 |  |
| controlling POST (nic se neliší) | 401 | 403 | 403 | 400 | 400 |  |
| controlling/export GET (nákupní ceny) | 401 | 403 | 403 | 200 | 200 |  |
| analytika GET ?akce=rezim | 401 | 200 | 200 | 200 | 200 |  |
| analytika GET souhrn (jen admin) | 401 | 403 | 403 | 200 | 200 |  |
| analytika POST udalosti | 401 | 200 | 200 | 200 | 200 |  |
| analytika POST rezim (jen admin) | 401 | 403 | 403 | 200 | 200 |  |
| vypocet POST | 401 | 400 | 400 | 400 | 400 | přihlášený s prázdným vstupem → 400; anon → 401 |
| vypocet GET (špatná metoda) | 405 | 405 | 405 | 405 | 405 |  |
| pd/deal GET | 401 | 200 | 200 | 200 | 200 | právo crm.pipedrive výchozí = všichni (vychozi Obchodník/Vedoucí, rozhodnutí J. V. v15.10.7) |
| pd/dealy GET | 401 | 200 | 200 | 200 | 200 |  |
| pd/pole GET | 401 | 200 | 200 | 200 | 200 |  |
| pd/stav GET (bezPrava — vidí každý přihl.) | 401 | 200 | 200 | 200 | 200 | bezPrava:true → stačí přihlášení + vidět zakázku |

**Řádků: 56, odchylek od očekávání: 0.**

## Část B: ostrý engscalc.netlify.app (jen pasivně)

- **Kdy:** 27. 10. 2026, 20:05:03–20:08:48 UTC, ze sezení přes proxy.
- **Pravidla:** bez přihlášení (ani neplatný pokus), bez zápisů, žádné POST/PUT/DELETE, dotazy popořadě s pauzou 1,1 s.
- **Počet dotazů:** 55 curl (`zivy/sonda_engscalc.sh`) a 3 z Playwrightu (`zivy/klient_nacteni.cjs`: `/`, `/api/zdravi`, `/api/ja`), celkem **58**.
  - Úplnost: dva předchozí pokusy Playwrightu skončily časovým limitem. První šel bez proxy, takže na server nedošel. Druhý čekal na `networkidle` a mohl poslat nejvýš tytéž 3 dotazy. **Horní mez je 61.**
- **Nevolalo se:** Pipedrive, Google Disk, ARES ani schaftscalc.

| Kontrola | Výsledek |
|---|---|
| Verze | `/api/zdravi` → `{"verze":"25.10.1","prostredi":"ostre"}`. `/`, `/kalkulacka.html` a `/kalkulacka_v25.10.1.html` jsou totožné (SHA-256 `49f3ed37…`). Proti lokálnímu sestavení `efa61c1` se liší jen ve **3 řádcích s datem sestavení** (`BUILD_DATUM_ZNACKA` 2026-10-26 živě, 2026-10-27 lokálně). **Nasazení = `main`.** |
| CSP | **shodná s `netlify.toml` na `main` znak po znaku** (258 znaků; porovnáno skriptem) |
| Ostatní hlavičky HTML | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` = `netlify.toml`. HSTS `max-age=31536000; includeSubDomains; preload` (`preload` přidává platforma, SEC-Z3). `zivy/hlavicky_html.txt` |
| `/api/*` bez relace (25 cest, GET) | 20× 401 `{"ok":false,"chyba":"Nepřihlášen."}`, 4× 405 (`obnova`, `odhlaseni`, `prihlaseni`, `vypocet`), 1× 200 `zdravi` (jen verze a prostředí). Bez dat, stacku a cest. Všude `no-store` + `nosniff`, **bez CSP a Referrer-Policy (SEC-Z2 trvá na `main`)** |
| CORS | 0× `Access-Control-*` v 58 odpovědích. Preflight `OPTIONS /api/zakazky` z `https://zly.example` → 401, `OPTIONS /api/prihlaseni` s `Origin: null` → 405 |
| Výchozí adresy funkcí | `/.netlify/functions/{zakazky,prihlaseni,ja,zaloha,zaloha_vynuceno,controlling_export,obnova,neexistuje}` → 404. **`zaloha_nocni` → 403, prázdné tělo (K9-I9: plánovaná funkce přes URL nejde)** |
| Skryté cesty | 16× 404: `.git/HEAD`, `.git/config`, `.env`, `package.json`, `netlify.toml`, `PREDAVKA.md`, `podklady/…`, `netlify/functions/…`, `netlify/lib/…`, `src/engine.js`, `server/server.js`, `nastroje/…`, zdrojové mapy `index.html.map` a `kalkulacka.html.map`, `_redirects`, `verze.txt` |
| Playwright nepřihlášeně | 3 požadavky, všechny na vlastní doménu. **0 cizích, 0 porušení CSP**, 0 chyb stránky. V konzoli jen očekávané 401 z `/api/ja` (SEC-Z6). Bez cizích skriptů a rámů, cookie i localStorage prázdné. Přihlašovací pole `autocomplete` `username` / `current-password`. Verze na stránce v25.10.1 |

### Seznam dotazů na ostrý web (`zivy/vysledek_engscalc.tsv`)

| # | Čas UTC | Metoda | Cesta | Kód |
|---|---|---|---|---|
| 1 | 20:05:03 | GET | `/` | 200 |
| 2 | 20:05:06 | GET | `/kalkulacka.html` | 200 |
| 3 | 20:05:07 | GET | `/kalkulacka_v25.10.1.html` | 200 |
| 4 | 20:05:09 | GET | `/api/analytika` | 401 |
| 5 | 20:05:11 | GET | `/api/controlling` | 401 |
| 6 | 20:05:14 | GET | `/api/controlling/export` | 401 |
| 7 | 20:05:16 | GET | `/api/firma` | 401 |
| 8 | 20:05:18 | GET | `/api/ja` | 401 |
| 9 | 20:05:21 | GET | `/api/obnova` | 405 |
| 10 | 20:05:23 | GET | `/api/odhlaseni` | 405 |
| 11 | 20:05:25 | GET | `/api/pd/deal` | 401 |
| 12 | 20:05:27 | GET | `/api/pd/dealy` | 401 |
| 13 | 20:05:30 | GET | `/api/pd/pole` | 401 |
| 14 | 20:05:32 | GET | `/api/pd/stav` | 401 |
| 15 | 20:05:34 | GET | `/api/popisy` | 401 |
| 16 | 20:05:36 | GET | `/api/prihlaseni` | 405 |
| 17 | 20:05:39 | GET | `/api/program` | 401 |
| 18 | 20:05:41 | GET | `/api/sablony` | 401 |
| 19 | 20:05:43 | GET | `/api/schvalovani` | 401 |
| 20 | 20:05:45 | GET | `/api/slovnik` | 401 |
| 21 | 20:05:48 | GET | `/api/uzivatele` | 401 |
| 22 | 20:05:50 | GET | `/api/vypocet` | 405 |
| 23 | 20:05:52 | GET | `/api/zakazky` | 401 |
| 24 | 20:05:55 | GET | `/api/zakaznici` | 401 |
| 25 | 20:05:57 | GET | `/api/zaloha` | 401 |
| 26 | 20:05:59 | GET | `/api/zaloha_vynuceno` | 401 |
| 27 | 20:06:01 | GET | `/api/zdravi` | 200 |
| 28 | 20:06:04 | GET | `/api/zobrazeni` | 401 |
| 29 | 20:06:06 | OPTIONS | `/api/zakazky` | 401 |
| 30 | 20:06:07 | OPTIONS | `/api/prihlaseni` | 405 |
| 31 | 20:06:09 | GET | `/.netlify/functions/zakazky` | 404 |
| 32 | 20:06:10 | GET | `/.netlify/functions/prihlaseni` | 404 |
| 33 | 20:06:11 | GET | `/.netlify/functions/ja` | 404 |
| 34 | 20:06:12 | GET | `/.netlify/functions/zaloha` | 404 |
| 35 | 20:06:14 | GET | `/.netlify/functions/zaloha_vynuceno` | 404 |
| 36 | 20:06:15 | GET | `/.netlify/functions/controlling_export` | 404 |
| 37 | 20:06:16 | GET | `/.netlify/functions/obnova` | 404 |
| 38 | 20:06:18 | GET | `/.netlify/functions/zaloha_nocni` | 403 |
| 39 | 20:06:19 | GET | `/.netlify/functions/neexistuje` | 404 |
| 40 | 20:06:20 | GET | `/.git/HEAD` | 404 |
| 41 | 20:06:21 | GET | `/.git/config` | 404 |
| 42 | 20:06:23 | GET | `/.env` | 404 |
| 43 | 20:06:24 | GET | `/package.json` | 404 |
| 44 | 20:06:25 | GET | `/netlify.toml` | 404 |
| 45 | 20:06:27 | GET | `/PREDAVKA.md` | 404 |
| 46 | 20:06:28 | GET | `/podklady/SEC_AUDIT_24_10.md` | 404 |
| 47 | 20:06:29 | GET | `/netlify/functions/zaloha.mjs` | 404 |
| 48 | 20:06:30 | GET | `/netlify/lib/sdilene.mjs` | 404 |
| 49 | 20:06:32 | GET | `/src/engine.js` | 404 |
| 50 | 20:06:33 | GET | `/server/server.js` | 404 |
| 51 | 20:06:34 | GET | `/nastroje/kontrola_udaju.py` | 404 |
| 52 | 20:06:36 | GET | `/index.html.map` | 404 |
| 53 | 20:06:37 | GET | `/kalkulacka.html.map` | 404 |
| 54 | 20:06:38 | GET | `/_redirects` | 404 |
| 55 | 20:06:40 | GET | `/verze.txt` | 404 |
| 56 | 20:08:47 | GET (Playwright) | `/` | 200 |
| 57 | 20:08:48 | GET (Playwright) | `/api/zdravi` | 200 |
| 58 | 20:08:48 | GET (Playwright) | `/api/ja` | 401 |

## Bod po bodu (část A): co drží

1. **Dodavatelský řetězec a tajemství** (`repo/`)
   - Jediná závislost `@netlify/blobs` 8.2.0. Zámek je jen z `registry.npmjs.org`, sha512 sedí s registrem, bez git/tarball zdrojů a install skriptů, `npm audit` 0.
   - Všechny akce ve workflow na `main` jsou připnuté na SHA, `testy.yml` má `contents: read`.
   - `smazat_vetve.yml` má `contents: write` jen s podmínkou `ref == main` a nic neinstaluje.
   - V **6 367 blobech celé historie** (130 refů) ani ve zprávách commitů není token ani klíč: `ghp_`, `github_pat_`, `AKIA`, `nfp_`, `xox`, `AIza`, `sk-`, JWT, privátní klíče, 40 hex Pipedrive.
   - `TAJEMSTVI_RELACE`, `ADMIN_INIT_HESLO` a hesla mají jen zkušební hodnoty. `DEFAULT_CENIK` je vynulovaný v 67 z 68 historických blobů; jediný nenulový klíč byl vynulován dřív (vědomá mez K7-W8/B79).
   - `kontrola_udaju.py` je čistá na `main`, `test`, `test-draft` i v integraci. `dist/` obsahuje jen 3 HTML a nic z `podklady/` ani `.env`.
   - Repo je veřejné; secret scanning a push protection jsou zapnuté.
2. **Statická analýza** (`klient/staticka_html.mjs`, `redos.mjs`, `blob_klic_obnova.mjs`)
   - Mimo testy není `eval`, `new Function`, `setTimeout`/`setInterval` s řetězcem ani `javascript:`.
   - Zápisy HTML: `innerHTML` 68×, `document.write` 8×, `outerHTML` a `insertAdjacentHTML` 0×. V 1 160 HTML výrazech je 3 512 vložených hodnot:
     - 1 203 přes escapovací funkce, 188 čísel, 432 literálů, 714 fragmentů složených jinde;
     - 975 „jiných“: z nich 189 v obsluhách `on*` prošlo ručně (konstanty, nebo předem `escJs`/`keyAttr`), zbytek namátkou a dynamickou zkouškou (bod 10).
   - ReDoS: 607 výrazů, exponenciální 0, kvadratické 33 (SEC-M3, SEC-M17).
   - Klíče Blobs mají kontrolu tvaru všude kromě obnovy ze souboru (SEC-M9).
3. **Přihlášení** (`server_a/pokus_prihlaseni.mjs`, 27/27)
   - Cookie: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200`. Relace nese `exp` a `hv`; podpis váže i `PROSTREDI`.
   - Podvržená role nebo e-mail, rozbitý base64 i prázdný podpis → 401.
   - Relaci zneplatní: reset hesla správcem, vlastní změna hesla (i na jiném zařízení), odhlášení (všechna zařízení, B171) a vypnutí účtu. Snížení role platí hned.
   - Existující i neexistující účet dostane stejné 401 (scrypt i proti falešnému otisku, `timingSafeEqual`).
   - Brzda: 10 pokusů na e-mail, pak 429; na IP kolem 60. Správné heslo projde i po 9 chybných.
4. **Matice oprávnění:** 280 volání, 0 odchylek (výše). Citlivé akce správce chtějí `hesloSpravce`: povýšení na administrátora, reset cizího hesla, matice zobrazení.
5. **Původ** (`server_a/pokus_puvod.mjs`, 20/20)
   - Zápis s cizím Origin, `Origin: null`, tělem `text/plain`, `x-www-form-urlencoded` nebo `multipart/form-data` → 401.
   - Přihlášení a odhlášení z cizího původu → 403. Žádná funkce nevydává `Access-Control-*`.
   - Výjimka: GET exportu controllingu (SEC-M5).
6. **Fuzz** (`server_b/p1_fuzz_vse.mjs`)
   - 128 415 volání za 38 s: 26 funkcí, 4 role, query hodnoty `..`, `%2f`, NUL, U+2028, náhradní znaky, RTL, NFD, 100 kB; těla 5 a 20 MB, vnoření do 10 000, 200 000 klíčů, `__proto__`/`constructor`.
   - Bez stacku a cest v odpovědi. Nejdelší volání 605 ms. `Object.prototype` i `Array.prototype` čisté, zápisy jen pod očekávanými klíči.
   - Výjimky jen v SEC-M2 a SEC-M6.
7. **Obchodní logika** (`server_b/p2_obchodni_logika.mjs`, 55/55)
   - Zámek odeslané nabídky: změna dat, ceníku, slevy, zmrazeného výsledku nebo čísla → 409/403 (i s `prepsat:true` a i pro správce). Smazání varianty nebo zámku → 409.
   - Podvržené odemčení obchodníkem → 403. `tisky[]` a razítko drží. SEC-S1 v jedné instanci → 409.
   - Slevy: samoschválení, „automaticky“ nad strop, podvržený schvalovatel (B105), zvýšení po schválení, klon se schválenou slevou, návrat na „čeká“ (B101) — vše odmítnuto.
   - Minimální marže B71 se vynucuje. Podvržené schválení cenové výjimky → 403.
   - P12: obchodník nedostane historii ceníku ani nákladové klíče. Controlling, exporty, zálohy a analytika → 403 pro obchodníka i vedoucího.
8. **Zálohy a obnova** (`server_b/p4_zalohy_obnova.mjs`, 29/33; 4 FAIL = SEC-M7, SEC-M8, SEC-M9 a K9-S1)
   - Stáhne jen správce. Plná záloha ani kopie na Disk nenesou otisky hesel, `TAJEMSTVI_RELACE`, token Pipedrive, tokeny obnovy ani počítadla. Kopie na Disk má `podpisy: null`.
   - Obnova: bez potvrzení 428, účty bez hesla správce 401, cizí token 403, dva souběžné začátky → právě jeden 200 (SEC-N2).
   - Vynucené otisky: limit 200, pak 429. Žádná cesta API otisk nesmaže.
9. **Pipedrive proxy** (`server_b/p5_pipedrive.mjs`, 25/28; 3 informativní = SEC-M14, SEC-M15)
   - Id dealu přísně ověřené (14 tvarů → 400 nebo kanonický tvar).
   - Strop: 80 souběžných → 30 do Pipedrive. Seznam s 20 dotazy → 1 volání.
   - `obnovit` a změna `pdDealId` jen správce; `pd_stav` s cizím Origin → 403.
   - Token se neukládá a `src/` nezná jeho hlavičku ani proměnnou.
10. **Uložené XSS** (`klient/xss_ulozene.mjs` **2 179 OK / 0 FAIL**, `dokumenty_injekce.mjs` **109/0**, `csp.mjs` **30/0**)
    - Rozsah: 31 oblastí × 2 role × 5 druhů payloadu; 13 záložek, panely Nastavení a 9 tiskových náhledů. Payloady: `svg onload`, `</script>`, `javascript:`, `{{…}}`, `</w:t>`, `]]>`, řídicí znaky, náhradní znaky, řídicí pole.
    - Kontrola, že zkouška není prázdná: stejný payload vložený syrově se pod CSP spustí.
    - Dokumenty: 14 DOCX (well-formed, bez nového `w:t`, `{{FIRMA_ICO}}` se nerozvine), 4 XLSX (inlineStr, bez `<f>`), 3 CSV (apostrof před `= + - @`).
    - CSP dědí i tiskové náhledy.
11. **Regrese:** viz oddíl výše.

## Pokusy v repu (`podklady/SECM_pokusy/`)

Spouštět z kořene repa. Pokusy části A běží jen lokálně (paměť, podvržený fetch). Prohlížečové pokusy potřebují `KNG_DIST=<kopie>/dist/kalkulacka.html` ze sestavení `KNG_NEZVYSOVAT_VERZI=1 python3 build.py` v kopii stromu. Mutace jen v kopii (`regrese/vlastni_mutace.mjs --strom <kopie>` nad stromem repa běžet odmítne).

| Složka | Soubory | Nálezy |
|---|---|---|
| `server_a/` | `matice.mjs`, `matice.md`, `pokus_prihlaseni.mjs`, `pokus_puvod.mjs` | SEC-M5; matice |
| `server_b/` | `harness.mjs`, `p1_fuzz_vse.mjs`, `p2_obchodni_logika.mjs`, `p3_hluboke_typy.mjs`, `p4_zalohy_obnova.mjs`, `p5_pipedrive.mjs`, `p6_k9_na_main.mjs` | SEC-M2, M6–M9, M14, M15; K9 na `main` |
| `klient/` | `staticka_html.mjs`, `redos.mjs`, `redos_server.mjs`, `blob_klic_obnova.mjs`, `foto_externi.mjs`, `xss_ulozene.mjs`, `dokumenty_injekce.mjs`, `csp.mjs` | SEC-M3, M4, M9, M16, M17 |
| `repo/` | `sken_historie.py`, `kontrola_tipu.sh`, `kontrola_mezery.py`, `sestaveni_dist.sh`, `dodavatelsky_retezec.sh` | SEC-M1, M10, M11, M21, M22 |
| `regrese/` | `vlastni_mutace.mjs`, `r1_zamek_soubeh_main.mjs`, `r2_strazci_bez_testu.mjs`, `mutace_vysledky.txt` | SEC-M12, M13, M18–M20 |
| `zivy/` | `sonda_engscalc.sh`, `klient_nacteni.cjs`, `vysledek_engscalc.tsv`, `vysledek_klient.json`, `hlavicky_html.txt`, `hlavicky_api_ja.txt` | část B (sondy pouštět jen se souhlasem; 1 dotaz za 1,1 s) |

## Doporučení

1. **J. V., hned (repo, nezávisí na kódu):**
   - **zrušit sdílení odkazu `cshk_` v claude.ai** (SEC-S4, rozšířený o tagy v26.10.3 a v26.10.4);
   - smazat ref `refs/claude-teleport/83c754161ed65ad9` (SEC-M10);
   - rozhodnout o starých tazích a větvích se SEC-V1 a SEC-S4;
   - smazat `claude/testovani-po-opravach` (SEC-V2, SEC-N6).
2. **Posun integrace → `test` → `main`** (rozhoduje J. V.): na ostrý web přinese opravy K9-V1 (vysoký), pojistky úbytku a retence (K9-S…/N…), SEC-I7, SEC-Z2 a `nosniff` u exportu. Po nasazení pasivně zopakovat `zivy/sonda_engscalc.sh` (očekávaná CSP a Referrer-Policy i na `/api/*`).
3. **Opravná dávka (mění chování: ne):**
   - SEC-M1 (hook `pre-push` a workflow kontroly);
   - SEC-M2, M3, M4 (odolnost serveru vůči obchodníkovi);
   - SEC-M5, M6, M7, M8, M9;
   - SEC-M11, M12, M13 (testy s pojistkou podle pokusů);
   - informativní SEC-M14, M15, M16, M18, M20 při příležitosti.
4. **Nic neopravovat:** SEC-M17, SEC-M19, SEC-M21 a SEC-M22 jen sledovat.

## Otázky pro J. V.

1. Byl už zrušen sdílecí odkaz `cshk_` (SEC-S4)? Dokud ne, je přepis sezení veřejně čitelný z tagů v26.10.3 a v26.10.4.
2. Smazat ref `refs/claude-teleport/…` a tagy a větve se SEC-V1 a SEC-S4, nebo je vést jako vědomou mez historie?
3. Zavést hook `pre-push` s kontrolou údajů pro všechna sezení (SEC-M1)? Jde o změnu pracovního postupu, ne aplikace.
4. SEC-M16: omezit úvodní fotku na `data:image`? Fotka s webovou adresou by přestala fungovat, pokud ji někdo používá.
5. Kdy posun integrace na `main`? Na ostrém dnes běží kód s K9-V1 a starou pojistkou úbytku záloh.
