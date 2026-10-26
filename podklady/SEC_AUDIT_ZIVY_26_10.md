# Bezpečnostní audit S2: živá část nad testengscalc.netlify.app (v25.10.1), 26. 10. 2026

- **Datum:** 26. 10. 2026, 09:04–09:20 UTC (dávka S2, roadmapa #520; koordinace session_01TMQ5bLDJuS5k5NWWYy7jLx). Navazuje na S1 #515 (`podklady/SEC_AUDIT_24_10.md`, lokální část), jehož živou část tehdy blokovala síťová politika.
- **Cíl:** https://testengscalc.netlify.app, nasazená **v25.10.1** = větev `test` (`efa61c1`). Ostrý https://schaftscalc.netlify.app jen pasivně: hlavička a verze hlavní stránky (2 dotazy).
- **Zápis:** větev `claude/s2-zivy-test` nad `6076128`. **Kód aplikace se neměnil**, verze se nezvyšovala.
- **Pravidla (dialog J. V. https://claude.ai/artifact/VTamxkz2Xum9uMq7nuBRiM, SEC-3/4/5/6 = A):** bez přihlášení, bez zápisů, bez zátěže. Všechny dotazy šly popořadě s pauzou 1,1 s, celkem **≈ 175 dotazů** (74 + 71 + 17 sondy curl, 2 na ostrý web a ≈ 9 z Playwrightu). Žádný fuzz ve smyčce, žádný Pipedrive ani jiné cizí služby, ARES se nevolal.
- **Pokus o přihlášení: 1×** se smyšleným účtem `nikdo.s2@priklad.cz` a neplatným heslem, kvůli tvaru odpovědi (povoleno nejvýš 2). Jediný zápis, který mohl vzniknout, je počítadlo neúspěšných pokusů pro tuto smyšlenou adresu a IP proxy (`pokusyZacatek`). Ostatní dotazy na `/api/prihlaseni` (cizí Origin, `null`, formulář, prázdné tělo, `{"toString":1}`, neplatný JSON) odmítne funkce dřív, než se počítadlo dotkne.
- **`/.netlify/functions/zaloha_nocni`: 1× GET bez těla.** Dokumentace Netlify říká, že plánovanou funkci „nejde zavolat přímo přes URL“; platforma odpověděla 403 s prázdným tělem, funkce neběžela.
- Sondy a výsledky leží v `podklady/S2_zivy/` (viz konec zprávy). V zápisu nejsou ceny ani osobní údaje.

## Verdikt

**Testovací web VYHOVUJE. Mimo testovací web je 1 vysoký nález k ověření J. V. (ostrý web), dál 1 nízký a 4 informativní.**

- **Nasazení = `test`:** `/api/zdravi` hlásí `25.10.1`, prostředí `test`. `dist/index.html` z lokálního sestavení nad `efa61c1` (`KNG_NEZVYSOVAT_VERZI=1 python3 build.py`) se s živým `/`, `/index.html`, `/kalkulacka.html` a `/kalkulacka_v25.10.1.html` (4 soubory se stejným SHA-256 `787add6c…`) liší jen ve **3 řádcích s datem sestavení** (`BUILD_DATUM_ZNACKA` 2026-10-25 živě, 2026-10-26 lokálně, protože build bere den sestavení). Jiný rozdíl není.
- **Hlavičky HTML** sedí s `netlify.toml`: CSP shodná znak po znaku, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, HSTS.
- **API bez relace (25 cest × GET/POST/OPTIONS):** 51× 401, 18× 405, 2× 400 (neplatný JSON), 3× 200 jen `/api/zdravi`. Žádná data, žádný stack ani cesta v těle. Všude `Cache-Control: no-store` a `nosniff`, což znamená, že **SEC-I1 je v nasazení ověřeně opravené** (#514). **CORS nikde** (žádná `Access-Control-*`), preflight z cizí domény dostane 401/405.
- **Původ:** cizí Origin, `Origin: null` i `text/plain` u zápisu → 401, u přihlášení a odhlášení → 403. Podvržená cookie `relace` → 401.
- **Cookie:** odhlášení vrací `relace=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`, tedy stejné atributy, jaké nese přihlašovací cookie (`relaceCookie`). Neplatné přihlášení cookie nenastaví (401 „Nesprávný e-mail nebo heslo.“).
- **Výchozí cesty funkcí:** `/.netlify/functions/<každá z 25 funkcí s config.path>` → 404, `zaloha_nocni` → 403 (platforma). Žádná funkce tak není dostupná mimo `/api/*`.
- **Mimo `dist/` není veřejně nic:** 44 cest (`.git/`, `.env`, `podklady/`, `netlify/`, `src/`, `server/`, `nastroje/`, `roadmapa/`, `manual/`, `PREDAVKA.md`, `CLAUDE.md`, `netlify.toml`, `build.py`, `package*.json`, `verze.txt`, `_redirects`, `_headers`, `robots.txt`, zdrojová mapa, starší `kalkulacka_v*.html`, `zaloha.json`, `cenik.xlsx`, `.netlify/`…) → 404. Veřejné jsou jen 4 kopie aplikace a výchozí `favicon.ico` platformy (SEC-Z5).
- **Klient (Playwright, nepřihlášený):** 3 požadavky, všechny na vlastní doménu (`/`, `/api/zdravi`, `/api/ja`). **0 porušení CSP**, 0 chyb stránky, v konzoli jen očekávané 401 z `/api/ja` (SEC-Z6). Žádné externí skripty, styly ani rámy, cookie i localStorage prázdné. Přihlašovací pole mají `autocomplete` `username` / `current-password`. Vložení do cizího rámu zablokuje `frame-ancestors 'none'`.

| | Počet | Nálezy |
|---|---|---|
| Kritické | 0 | — |
| Vysoké | 1 | SEC-Z1 (ostrý web schaftscalc, provoz, ne kód; k ověření J. V.) |
| Střední | 0 | — |
| Nízké | 1 | SEC-Z2 |
| Informativní | 4 | SEC-Z3 … SEC-Z6 |

SEC-Z1 byl ověřený dvakrát (GET 09:11:50 a HEAD 09:12 UTC, tentýž ETag) a koordinaci nahlášený hned (send_message 26. 10. dopoledne).

## Nálezy

| ID | Závažnost | Oblast | Nález | Důkaz | Mění chování/vzhled/výpočet | Oprava |
|----|----|----|----|----|----|----|
| **SEC-Z1** | **vysoký** (k ověření) | Provoz: ostrý web | **https://schaftscalc.netlify.app vrací starou aplikaci „Kalkulačka v7.9.2“** (`BUILD_DATUM_ZNACKA = '2026-09-07'`; `main` je dnes v22.10.1, `test` v25.10.1) **bez bezpečnostních hlaviček.** Chybí CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy i Permissions-Policy, je tam jen HSTS platformy. Podle `NASAZENI_NETLIFY.md` („Dva weby, dva repozitáře, 7. 9. 2026“) patří schaftscalc sesterskému repu `vendljar/kalkulator-next-gen`. Datum sestavení odpovídá dni rozdělení, takže nejspíš jde o **opuštěné nasazení, které dál žije veřejně**. Má-li ještě funkční `/api/*` a data v Blobs (účty, zakázky), běží tam kód bez oprav všech auditů po 7. 9. (B4 brzda přihlášení, B75, B78 přihlášení z cizí stránky, B5 CSP…, K3–K8, S1) a stránku jde vložit do cizího rámu (clickjacking). API schaftscalc se podle pravidel **nezkoušelo**, závažnost proto stojí na tom, co tam běží. | `curl -sS -D - https://schaftscalc.netlify.app/` (09:11:50 UTC) a `curl -I` (09:12 UTC): ETag `"dade5a09…-ssl"`, ani jedna z pěti hlaviček; v těle „Kalkulačka v7.9.2“. Testovací web tytéž hlavičky má (viz verdikt). | ne (aplikace se nemění; jde o provoz webu) | **J. V.:** 1) ověřit, který web je skutečně ostrý (linie `main` → podle `NASAZENI_NETLIFY.md` engscalc.netlify.app?) a zda schaftscalc ještě někdo používá; 2) jestli ne: Netlify → projekt schaftscalc → po záloze obsahu Blobs (Site configuration → Blobs) projekt smazat, nebo aspoň Stop builds a nasadit prázdnou stránku s odkazem na ostrý web; 3) jestli ano: převést ho na aktuální `main` (stejný `netlify.toml`) a ověřit hlavičky `curl -I`. Ostrý web, na který míří `main`, by měla pasivně (jen hlavičky a verze) ověřit příští dávka. |
| SEC-Z2 | nízký | Hlavičky odpovědí funkcí | Odpovědi `/api/*` (JSON i 401/405) **nenesou CSP, X-Frame-Options, Referrer-Policy ani Permissions-Policy** z `[[headers]] for = "/*"` a blok `[[headers]] for = "/api/*"` (`Cache-Control: no-store`) se na ně neuplatní. Potvrzuje se domněnka SEC-I1: vlastní hlavičky Netlify se na funkce s `config.path` nevztahují. `no-store` a `nosniff` tam jsou jen díky `JSON_HLAVICKY` (#514). Dopad je malý: JSON s `nosniff` prohlížeč nevykreslí jako HTML, CORS chybí. HSTS dodává platforma. Odpověď `controlling_export` (soubor) nese hlavičky vlastní, s relací se neověřovala. | `podklady/S2_zivy/vysledek1_api.tsv`: 74/74 `cc=no-store nosniff=1 csp=0`. Hlavičky `out/013_ja_get.h`: jen content-type, cache-control, nosniff, HSTS. | ne | Do `JSON_HLAVICKY` (`netlify/lib/sdilene.mjs`) přidat `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` a `Referrer-Policy: no-referrer`. Totéž u vlastních hlaviček `controlling_export.mjs`. V `netlify.toml` k bloku `/api/*` připsat, že se na funkce neuplatní (nebo ho smazat). Test: `netlify/test_funkce.mjs`, každá funkce vrací obě hlavičky (dnes FAIL). |
| SEC-Z3 | info | HSTS | Živé HSTS je `max-age=31536000; includeSubDomains; preload`, `netlify.toml` má bez `preload`. Hlavičku přepisuje platforma (doména `netlify.app` je v preload seznamu). Na vlastní doméně by platila hodnota z `netlify.toml`. | hlavičky HTML i API | ne | nic, jen vědět při přechodu na vlastní doménu. |
| SEC-Z4 | info | Pořadí kontrol v `analytika` | `POST /api/analytika` s neplatným JSON vrátí anonymovi 400 („Vstup není platný JSON.“) dřív než 401. Data ani zápis to nezpřístupní, jen se tvar odpovědi liší od ostatních funkcí. Podobně `/api/prihlaseni` s `{"email":{"toString":1}}` hlásí „Vstup není platný JSON.“ (tělo platné je; 400 správně, hláška nepřesná). | `vysledek1_api.tsv` ř. 2, `vysledek3_puvod_cookie.tsv` ř. 14 | ne | volitelně: v `analytika.mjs` ověřit relaci před čtením těla (akce se pozná až z těla, takže nejdřív `vyzadujRoli(req)` a pak podle akce roli Administrátor); v `prihlaseni.mjs` odlišit hlášku chybného typu („E-mail a heslo musí být text.“). |
| SEC-Z5 | info | Statické soubory | `/favicon.ico` vrací 200 s výchozí ikonou platformy Netlify (`fwd-status=404`, soubor není v `dist/`). Aplikace má vlastní ikonu vloženou v HTML, takže v záložce se zobrazuje správně. Únik to není. | `vysledek2_funkce_soubory.tsv` ř. 58 | ne | nic (případně `build.py` může kopírovat `favicon.ico` do `dist/`, mění vzhled jen u přímé adresy). |
| SEC-Z6 | info | Konzole nepřihlášeného klienta | Jediná položka v konzoli je „Failed to load resource: 401“ z `/api/ja`. Tak aplikace zjišťuje relaci, takže je to očekávané a není to vada. Kdo čte konzoli při hledání chyb, ji ale uvidí. | `vysledek_klient1.json` | ano (jiná odpověď API) | nechat; případně `/api/ja` bez relace → 200 `{ok:false, prihlasen:false}` (rozhodnutí J. V., mění rozhraní). |

## Bod po bodu podle zadání

1. **Hlavičky:** HTML = `netlify.toml` (CSP shodná, XFO, nosniff, Referrer, Permissions, HSTS s `preload` od platformy: SEC-Z3); HTML `cache-control: public,max-age=0,must-revalidate`. Samostatné JS soubory nasazení nemá (aplikace je jeden HTML soubor s vloženými skripty). `/api/*` nese jen `no-store` + `nosniff` z kódu, hlavičky z `netlify.toml` ne (SEC-Z2). `/.netlify/functions/*` → 404 / 403. Stránka 404 platformy CSP i XFO nese.
2. **Endpointy bez relace:** 401/403/405, tělo jen `{"ok":false,"chyba":"…"}`, bez stacku a cest. Neplatné JSON tělo → 401 (relace se ověřuje dřív než tělo), u `prihlaseni` a `analytika` 400, **nikde 500**. GET/POST/OPTIONS/PUT/DELETE/HEAD → 401/405. CORS chybí. Cizí `Origin`: zápis 401, přihlášení a odhlášení 403.
3. **Cookies:** neplatné přihlášení cookie nenastaví. Atributy `HttpOnly; Secure; SameSite=Lax; Path=/` (odhlášení živě, přihlášení podle kódu `relaceCookie` + `Max-Age=43200`). Prefix `__Host-` chybí, což je vědomá mez SEC-I8 (na `*.netlify.app` v pořádku).
4. **Veřejný obsah:** jen `dist/` (3 HTML + `/`), nic dalšího (44 cest 404). Zdrojové mapy, `.git`, `podklady/`, `netlify/`, testy, ceníky, zálohy, `_redirects`, robots, tajemství: nic.
5. **Verze:** v25.10.1 = `test`, obsah `dist/` shodný až na datum sestavení (výše).
6. **Noční záloha:** `/.netlify/functions/zaloha_nocni` → 403 od platformy (1 dotaz, funkce neběžela). `/api/zaloha_vynuceno` GET/POST → 401. Jiné plánované funkce nasazení nemá.
7. **Klient:** konzole bez chyb kromě očekávaného 401 (SEC-Z6), CSP neporušená, žádné načítání z cizích domén, rámování zablokované.

## Regrese S1

| Nález S1 | Stav živě |
|---|---|
| SEC-I1 (hlavičky odpovědí funkcí) | **opraveno a ověřeno**: `no-store` + `nosniff` na 74/74 odpovědích API. Zbytek hlaviček je SEC-Z2. |
| SEC-I2 (`zaloha_nocni` přes URL) | **ověřeno: nejde**, platforma vrací 403 |
| SEC-I8 (cookie bez `__Host-`) | trvá jako vědomá mez (doména `netlify.app`) |
| SEC-N1 (`{"toString":1}` → 500) | u přihlášení živě 400, ne 500 (ostatní cesty potřebují relaci, neověřováno) |

## Sondy v repu (`podklady/S2_zivy/`)

Spouštět jen šetrně a jen se souhlasem pravidel výše (každý skript dělá 1 dotaz za 1,1 s; výstup do `${KNG_S2_OUT:-/tmp/s2_zivy}`). Za proxy sezení nese první řádek hlaviček `HTTP/1.1 200 Connection Established`, proto se stav bere z posledního řádku `HTTP/2`.

| Soubor | Co dělá | Výsledek 26. 10. |
|---|---|---|
| `sonda1_api.sh` | 25 cest `/api/*` × GET / POST s neplatným JSON / OPTIONS s cizím Origin | `vysledek1_api.tsv` (74 dotazů) |
| `sonda2_funkce_soubory.sh` | `/.netlify/functions/*` (vč. 1× `zaloha_nocni`) a 44 statických cest | `vysledek2_funkce_soubory.tsv` (71 dotazů) |
| `sonda3_puvod_cookie.sh` | cizí Origin, `null`, `text/plain`, metody, podvržená cookie, tvary přihlášení (**1 pokus se smyšleným účtem**), odhlášení | `vysledek3_puvod_cookie.tsv` (17 dotazů) |
| `klient1_nacteni.cjs` | Playwright: načtení bez přihlášení, požadavky, konzole, CSP | `vysledek_klient1.json` |
| `klient2_prihlaseni_ram.cjs` | přihlašovací overlay (bez odeslání), vložení do cizího rámu | `frame-ancestors 'none'` zablokuje |

## Doporučení

1. **J. V., hned:** SEC-Z1. Rozhodnout o schaftscalc.netlify.app (vypnout, nebo převést na `main`) a potvrdit, který web je ostrý.
2. **Opravná dávka (mění chování: ne):** SEC-Z2 (CSP a Referrer-Policy v `JSON_HLAVICKY` + test), volitelně SEC-Z4.
3. **Příští živá kontrola:** po posunu `test → main` pasivně ověřit hlavičky a verzi ostrého webu z linie `main`. Při změně `netlify.toml` zopakovat `sonda1_api.sh`.
