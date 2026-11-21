# Čočka AU — autentizace a účty (noční audit 20. 11. 2026)

Stav: `origin/test` cda289e (v19.11.11), srovnání s `origin/main` (verze.txt 11.11.1; rozdíl v rozsahu AU je jen #ON a #UE: `git diff --stat origin/main origin/test` = `sdilene.mjs` +83, `uzivatele.mjs` +23, `prihlaseni.mjs` 4, `odhlaseni.mjs` 3; `server/server.js` shodný).
Jen čtení kódu a lokální PoC s paměťovým úložištěm, žádná síť. PoC jsou v `podklady/audit_2026-11-20/poc_AU_*.mjs`, všechny spuštěné (výstupy níž).

**Souhrn: 0 kritických, 0 vysokých, 1 střední, 3 nízké, 5 informativních.** Žádný anonymně dostupný koncový bod bez klíče kromě `/api/zdravi`, `/api/prihlaseni` a `/api/odhlaseni` (bez relace nic nedělá). Obchodník se k právům administrátora v rozsahu AU nedostane (53 pokusů, vše odmítnuto).

## Tabulka nálezů

| ID | Závažnost | Nález | Kde | PoC | main dotčen |
|---|---|---|---|---|---|
| AU-1 | střední | Počítadla pokusů o přihlášení (e-mail i adresa) jsou čtení–změna–zápis bez zámku; vlna souběžných požadavků z JEDNÉ adresy limit 60/15 min vůbec nepocítí (400 ze 400 hesel ověřeno, správné prošlo). Otevřený zbytek B4, v `BEZPECNOST_MEZE.md` jako mez zapsaný není. | `netlify/lib/sdilene.mjs:235-249, 314-319`; `functions/prihlaseni.mjs:43-54` | `poc_AU_soubeh_pocitadla.mjs` | ano (stejné) |
| AU-2 | nízká | Akce správce (`role`, `aktivni`, `archiv`, `heslo`) zapisují celý účet přečtený před potvrzením hesla správce — vrátí i `hesloVerze` a otisk hesla: relace zneplatněná odhlášením znovu platí, změna hesla uživatele se tiše vrátí. Zbytek B156 je v mezích popsán jako „bezpečný směr“; není. | `functions/uzivatele.mjs:231, 292-295, 306-313, 514` | `poc_AU_spravce_stary_zapis.mjs` | ano (stejné) |
| AU-3 | nízká | Počítadlo e-mailu nikdy nebrání správnému heslu (#92), jediný tvrdý strop je adresa; útočník s více adresami (blok IPv6 /48 = 65 536 bloků /64) hádá jedno heslo bez stropu i popořadě. Návrhové rozhodnutí, ale jako mez zapsané není; síla hesla = jen délka 8. | `functions/prihlaseni.mjs:74-97`; `sdilene.mjs:139-149, 282-288` | `poc_AU_hadani_vice_adres.mjs` (1), (3) | ano |
| AU-4 | nízká | Adresa klienta: bez `x-nf-client-connection-ip` se bere první položka `X-Forwarded-For` (píše ji klient) a bez obou se limit adresy nevede vůbec. Na Netlify hlavičku doplňuje platforma (neověřeno živě); dopad jen při běhu mimo Netlify. | `sdilene.mjs:303-308, 317` | `poc_AU_hadani_vice_adres.mjs` (2) | ano |
| AU-5 | informativní | 11 funkcí načítá jádro (`jadro()`) PŘED ověřením přihlášení; při vadném nasazení vrátí `jadroChyba` text výjimky (`e.message`, typicky cesta modulu) i anonymovi, a bez hlaviček `no-store`/`nosniff`. | `lib/jadro.mjs:42-48`; např. `functions/analytika.mjs:53`, `zakazky.mjs:32`, `program.mjs:19` | ne (čtením) | ano |
| AU-6 | informativní | `emailPlatny` pustí řídicí znaky, znaky nulové šířky, obrácení směru textu, `<`, `>`, `"` a cizí abecedy — správce může založit účet vizuálně shodný s jiným. Zakládá jen Administrátor. | `sdilene.mjs:142-145`; `uzivatele.mjs:229` | ne (ověřeno jednorázovým během) | ano |
| AU-7 | informativní | Profil a podpis JINÉHO správce (ne hlavního) změní správce bez `hesloSpravce` — s ukradenou cookie správce jde kolegovi-správci podstrčit telefon a sken podpisu do jeho nabídek. SEC-I7 a B28 to nekryjí. | `uzivatele.mjs:160-214` | ne (čtením) | ano |
| AU-8 | informativní | `server/server.js` je nenasazovaná kostra bez přihlášení (`/api/vypocet` anonymně); `server/NASAZENI.md` dál popisuje nasazení na rosti.cz bez zmínky o tom, že server nemá autentizaci. Výchozí poslech jen 127.0.0.1. | `server/server.js:79-120, 139-144`; `server/NASAZENI.md:1-14` | ne | ano (shodný soubor) |
| AU-9 | informativní | Oddělení cookie test × ostrý při STEJNÉM tajemství drží jen shodou okolností: podpis testu je HMAC(`test|`+tělo) a ostrý web ho nad tělem `test|<tělo>` uzná; cookie odmítne až `JSON.parse` (předpona se dekóduje jako smetí). | `sdilene.mjs:360-366, 384-397` | `poc_AU_relace_a_prava.mjs` odd. 4 | ano |

## Detail nálezů

### AU-1 — souběžná vlna obejde brzdu proti hádání hesel (střední)
- **Předpoklady:** anonym z internetu, zná (nebo hádá) e-mail účtu. Nic dalšího.
- **Kód:** `pokusyNeuspechKlic` čte stav, přičte 1 a zapíše (`sdilene.mjs:244-249`) bez `vyhradne` a bez podmíněného zápisu. `pokusyZacatek` (`:314`) ho volá pro e-mail i adresu; `prihlaseni.mjs:51` rozhoduje 429 adresy podle hodnoty, kterou požadavek sám zapsal. Stejně `mojeheslo` (`uzivatele.mjs:114`) a `potvrdHesloSpravce` (`sdilene.mjs:736`). Komentář `sdilene.mjs:273-275` to vede jako „otevřenou část nálezu B4“; strop Pipedrive dostal `vyhradne` (B158), přihlášení ne.
- **Kroky / výstup PoC** (`node podklady/audit_2026-11-20/poc_AU_soubeh_pocitadla.mjs`):
  ```
  popořadě z jedné adresy: 65 pokusů, z toho 429: 55 (limit adresy 60, limit e-mailu 10)
  vlna 400 souběžných pokusů z 198.51.100.77: stavy {"200":1,"401":399}
  počítadlo adresy po vlně: n=0 (mělo být 400), počítadlo e-mailu: n=0
  ověřeno hesel scryptem: 400 z 400; správné heslo ve vlně PROŠLO (200)
  druhá vlna 400 (jiné e-maily, táž adresa): stavy {"401":400}, počítadlo adresy n=1
  ZRANITELNÉ
  ```
  Totéž i bez zpoždění úložiště (`KNG_BEZ_ZPOZDENI=1`) a nad exportem `origin/main`.
- **Dopad:** limit 60 pokusů / 15 min na adresu ani zpoždění 0–2 s neplatí pro toho, kdo hesla posílá najednou; slovníkový útok na účet (i administrátora) brzdí jen výkon funkcí. Úspěch navíc počítadla vynuluje/vrátí. Heslo má jen pravidlo délky 8 (AU-3). Není to přímý průnik — proto střední, ne kritická; je to ale anonymní a brzda je jediná ochrana slabého hesla.
- **Co PoC neříká:** na Netlify běží souběžné požadavky převážně v různých instancích funkce — `vyhradne` v paměti by proto nestačilo (mez B158); závod je o dobu čtení+zápisu Blobs. Živě neověřeno (audit nesmí na síť).
- **Návrh opravy:** počítadlo zapisovat podmíněně (`@netlify/blobs` má u `set`/`setJSON` volby `onlyIfMatch`/`onlyIfNew` — ověřit ve verzi, která se nasazuje; `package.json` má `^8.1.0`, v repu není `node_modules`) s opakováním při kolizi; nebo místo jednoho klíče zapisovat každý pokus jako vlastní klíč `ip:<adresa>/<čas>-<náhoda>` a počítat `list(prefix)` (bez závodu, úklid nočním během). K tomu `vyhradne` uvnitř instance. Test: vlna `Promise.all` nad úložištěm se zpožděním (vzor PoC).

### AU-2 — zásah správce vrátí verzi hesla a otisk (nízká)
- **Předpoklady:** útočník má ukradenou cookie oběti (sdílený počítač); oběť se „odhlásí všude“ nebo si změní heslo ve chvíli, kdy správce dokončuje akci nad jejím účtem. Útočník souběh sám nevyvolá — proto nízká.
- **Kód:** `uzivatele.mjs:231` čte účet; mezi tím a zápisem `:514` leží `potvrdHesloSpravce` (dvě počítadla, `pockej` 0–2 s, scrypt). Zapíše se celý starý záznam včetně `hesloVerze` a `heslo`. `mojeheslo` a `profil` už čtou čerstvý záznam (SEC-S2), akce správce ne.
- **Výstup PoC** (`poc_AU_spravce_stary_zapis.mjs`):
  ```
  (a) odhlášení 200 → ukradená cookie hned po odhlášení: 401; zásah správce 200 → po zásahu: 200
      → odhlášená relace OŽILA (a účet je teď Administrátor)
  (b) změna hesla 200 → hned: stará cookie 401, nová 200; po zásahu správce: stará cookie 200,
      nová 401, přihlášení starým heslem 200, novým 401
  ZRANITELNÉ (2 ze 2 scénářů)
  ```
  V PoC je okno roztažené zpožděním počítadla správce (60 ms), které napodobuje čekání brzdy.
- **Dopad:** `BEZPECNOST_MEZE.md` (B156, „Zbývá“) tvrdí „bezpečný směr: platí zásah správce“. Zásah správce ale neplatí jen sám — smaže i obranný krok uživatele a oživí zneplatněnou relaci.
- **Návrh opravy:** stejný vzor jako SEC-S2: těsně před zápisem přečíst čerstvý záznam ve `vyhradne('uzivatele/<e-mail>')` a přepsat jen pole akce (`role` / `aktivni` / `archiv…` / `heslo`+`hesloVerze = max(čerstvá, stará)+1`); `hesloVerze` nikdy nesnižovat. Opravit text B156.

### AU-3 — hádání jednoho hesla z více adres nemá strop (nízká, návrh)
- **Kód:** `prihlaseni.mjs:78-79` ověřuje heslo vždy, 429 e-mailu (`:94`) dostane jen špatné heslo. Tvrdý strop je jen adresa (`:51`), IPv6 po /64.
- **Výstup PoC** (`poc_AU_hadani_vice_adres.mjs`): `1150 pokusů popořadě z 30 bloků /64 na jeden účet: heslo ověřeno 1150×, odmítnuto limitem adresy 0×; správné heslo jako 1150. pokus PROŠLO`; `založení účtu se slabým heslem: "12345678"→200, "aaaaaaaa"→200, "heslo123"→200, "        "→200`.
- **Dopad:** 60 hesel / 15 min na každý blok /64; poskytovatelé běžně přidělují /56 i /48. Zásada #92 (nezamykat majitele) je vědomá, ale tenhle důsledek v mezích zapsaný není.
- **Návrh:** rozhodnutí J. V.: (a) zapsat jako mez, (b) druhý stupeň pro IPv6 po /48 s vyšším stropem, (c) při > N neúspěších na e-mail za hodinu pevné zpoždění i pro správné heslo (ne zámek) a upozornění správci, (d) odmítat nejběžnější hesla / hesla shodná s e-mailem při zakládání a změně.

### AU-4 — adresa z X-Forwarded-For (nízká)
- **Výstup PoC:** `100 pokusů s vlastní první položkou X-Forwarded-For, bez x-nf-client-connection-ip: 429 = 0; 100 pokusů bez jakékoli adresy: 429 = 0`; kontrola: s `x-nf-client-connection-ip` má ta přednost (429 = 10 ze 70).
- **Dopad:** jen když funkce poběží mimo Netlify nebo by platforma hlavičku nedoplnila; tehdy limit adresy neexistuje. Stejnou funkci používá i brzda tokenu `zaloha_disk`.
- **Návrh:** záložní větev zrušit (bez `x-nf-client-connection-ip` počítat pod společným klíčem `ip:neznama`), ať se chybějící adresa projeví přísněji, ne volněji. Živě ověřit, že Netlify klientem poslanou `x-nf-client-connection-ip` přepisuje (**neověřeno**).

### AU-5 až AU-9 (informativní)
- **AU-5:** `jadro()` před přihlášením mají `analytika:53`, `controlling:28`, `controlling_export:40`, `firma:26`, `popisy:43`, `program:19`, `sablony:24`, `slovnik:29`, `zakazky:32`, `zobrazeni:41` (a `obnova:202` v pomocné funkci). `vypocet` už `e.message` neposílá (SEC-I5), `jadroChyba` ano. Návrh: přihlášení jako první krok; `jadroChyba` přes `json()` a podrobnost jen do logu. Nezachycená výjimka (např. chybějící `TAJEMSTVI_RELACE`, `sdilene.mjs:347`) končí obecnou chybou platformy — její tvar na Netlify **neověřen**.
- **AU-6:** jednorázový běh: `emailPlatny` vrací true pro adresu se znakem U+200B, U+0000, U+202E, s `<b>` i s azbukou. Návrh: povolit jen tisknutelné ASCII bez `<>"'` a mezer (stávající účty tím neprojdou jen při zakládání).
- **AU-7:** `uzivatele.mjs:162-171` — cizí profil/podpis smí Administrátor, heslo se chce jen u hlavního účtu (B28 = zákaz). Návrh: `hesloSpravce` i pro `profil`/`podpis` jiného účtu s rolí Administrátor (rozšíření SEC-I7), nebo zapsat mez.
- **AU-8:** `server.js` nikde v nasazení není (`netlify.toml` má jen `functions`; žádný workflow ho nespouští). Liší se od funkcí: žádné přihlášení, účty, úložiště ani limit pokusů; jen `/api/zdravi`, `/api/vypocet`, statická stránka. Návrh: do `NASAZENI.md` větu „nenasazovat veřejně, nemá přihlášení“, nebo složku označit jako historickou.
- **AU-9:** první bajt dekódované předpony z malých písmen/číslic je vždy ≥ 104, tedy nikdy bílý znak JSON — odmítnutí je spolehlivé, ale není to záměr kódu. Návrh: podepisovat vždy `prostředí|tělo` (i prázdné prostředí jako `ostre|`) — jednorázově odhlásí uživatele ostrého webu, proto až s jinou takovou změnou (jako SEC-I8).

## Odpovědi na otázky zadání

1. **Relace a cookie.** `relace=<base64url JSON {email, role, hv, exp}>.<HMAC-SHA256>`; `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200` (`sdilene.mjs:375-383`), bez `Domain`. Bezstavová (žádné úložiště relací), 12 h pevně, neobnovuje se (novou vydá jen přihlášení a `mojeheslo`). Podpis porovnán `timingSafeEqual` (`:391-392`). Bez `TAJEMSTVI_RELACE` nebo s kratším než 16 znaků výjimka — žádný výchozí klíč (`:344-350`). Server relaci ruší verzí hesla účtu (`:618`): odhlášení zvedne verzi = odhlásí všude (`odhlaseni.mjs:32-37`), stejně změna hesla, reset správcem, vypnutí, archivace; smazaný/nový účet má verzi = čas založení. Role se bere z účtu při každém požadavku (`:612-624`), cookie se nevěří. Fixace: cookie vydává jen server po ověření hesla, přihlášení z cizího původu se odmítá (B78). Token není odvoditelný bez tajemství.
2. **Hesla.** scrypt N=2^14, r=8, p=1, sůl 16 B, 64 B (`:152-163`, známá mez B94), porovnání v konstantním čase. Síla: jen délka 8–200 (AU-3). Limity: e-mail 10 (jen špatná hesla), adresa 60/15 min před ověřením, zpoždění 250 ms × (n−2) do 2 s — souběhem obejitelné (AU-1). E-mail se ořízne a převede na malá písmena stejně pro účet i počítadlo (`prihlaseni.mjs:30`, `sdilene.mjs:233`), takže velikost písmen, mezery ani znak Kelvin (U+212A → k) počítadlo neobejdou; neplatný tvar e-mailu počítá jen adresu. X-Forwarded-For viz AU-4. Výčet účtů: stejná odpověď i čas (zástupný otisk; měřeno 39,5 × 38,1 ms). Reset hesla: jen správce, s vlastním heslem, ne sobě a ne hlavnímu účtu. První administrátor: jen když účet neexistuje, e-mail = `ADMIN_EMAIL` a heslo = `ADMIN_INIT_HESLO` (≥ 8 znaků, konstantní čas, `prihlaseni.mjs:66-72`); výchozí účty ani heslo v kódu nejsou. V bootstrapu je natvrdo jméno autora (`:68`) — totéž jméno je v hlavičce souboru.
3. **Uživatelé (UE).** Obchodník a Vedoucí smí jen `mojeheslo` (se starým heslem a brzdou) a vlastní `profil`/`podpis`; vše ostatní 403 (PoC odd. 1). Pole se přebírají jmenovitě (`uzivatele.mjs:186-189, 203, 255-259`) — hromadné přiřazení neprojde (PoC: `role`, `heslo`, `hesloVerze`, `__proto__` v těle nic nezmění). Hlavní účet nejde snížit, vypnout, archivovat, smazat ani mu resetovat heslo; vlastní roli/účet si správce nesníží/nevypne/nesmaže. Duplicitní e-mail: klíč je e-mail malými písmeny, „Účet už existuje“; vizuální dvojníci viz AU-6.
4. **Role a náhled role.** Náhled role je čistě klientský (`NAST.nahledRole`, `online_ui.js:477-484, 1405`); server žádný parametr, hlavičku ani cookie s rolí nečte (grep `nahled` v `netlify/` = jen náhledy obnovy a PD). PoC odd. 2: parametr, hlavičky, cookie `role`, přepsané tělo cookie → nic. Tabulka koncových bodů níž.
5. **Online (ON, B230).** Zapisuje se jen čas (`a/<e-mail>`, `o/<e-mail>`), e-mail z podepsané relace po kontrole účtu (`sdilene.mjs:625`) — cizí aktivitu podvrhnout nejde. Ven jde jen v `GET /api/uzivatele` pro Administrátora (`uzivatele.mjs:521, 549`); `/api/ja` ji nenese; výpis účtů Obchodník/Vedoucí 403. Objem: 1 zápis/min na účet a instanci. Bez nového nálezu.
6. **CSRF/CORS.** `SameSite=Lax` + kontrola `Origin` proti hostiteli u všech ne-GET (`:479-513`), `Origin: null` a tělo jiné než JSON odmítnuto, přihlášení a odhlášení mají vlastní kontrolu, PD a export controllingu i u GET. Žádná funkce neposílá `Access-Control-*`. Bez `Origin` se neodmítá (známá mez B159). PoC odd. 5: 7 pokusů odmítnuto.
7. **Chybové odpovědi.** Zásobník ani hodnoty prostředí v odpovědích nejsou; `e.message` jde ven v `jadroChyba` (AU-5, i anonymně), u PD jen vlastní texty `PdChyba`, u obnovy/záloh jen Administrátorovi nebo držiteli tokenu. `/api/zdravi` anonymně hlásí verzi, prostředí, popis prostředí a čas serveru (potřebuje to klient).

## Tabulka koncových bodů (`netlify/functions/*.mjs`, stav origin/test)

| Funkce (cesta) | Metody | Přihlášení | Role / další podmínka |
|---|---|---|---|
| `zdravi` (/api/zdravi) | jakákoli | **ne** | — (verze, prostředí, čas) |
| `prihlaseni` (/api/prihlaseni) | POST | **ne** | kontrola původu, brzda pokusů |
| `odhlaseni` (/api/odhlaseni) | POST | ne (bez platné relace jen smaže cookie) | kontrola původu |
| `pd_webhook` (/api/pd/webhook) | POST | **ne — klíč** v hlavičce (≥ 32 znaků, konstantní čas), bez klíče v prostředí 503 | strop volání |
| `zaloha_disk` (/api/zaloha_disk) | GET, POST | **ne — token** Bearer (`KNG_DISK_TOKEN`), s `Origin` 403, brzda špatného tokenu | — |
| `zaloha_nocni` | plánovaná (cron), bez cesty | — | dostupnost přes URL na Netlify neověřena |
| `ja` (/api/ja) | jakákoli | ano | — |
| `vypocet` (/api/vypocet) | POST | ano | — |
| `schvalovani` (/api/schvalovani) | GET | ano | — (filtr uvnitř neposuzován) |
| `zakazky` (/api/zakazky) | GET, POST, DELETE | ano | pravidla autora uvnitř (jiná čočka) |
| `zakaznici` (/api/zakaznici) | GET, POST | ano | DELETE jen Administrátor |
| `analytika` (/api/analytika) | GET `?akce=rezim`, POST `udalosti` | ano | GET ostatní a POST `rezim`: Administrátor; jádro a čtení těla před přihlášením |
| `firma`, `funkce`, `program`, `sablony`, `slovnik`, `zobrazeni` | GET | ano | POST jen Administrátor |
| `popisy` (/api/popisy) | GET | ano | GET `?sber=1` a POST jen Administrátor |
| `uzivatele` (/api/uzivatele) | POST `mojeheslo`, vlastní `profil`/`podpis` | ano | GET a ostatní akce jen Administrátor (+ `hesloSpravce` u citlivých) |
| `controlling` | GET, POST | ano | Administrátor |
| `controlling_export` | GET | ano | Administrátor, cizí Origin 403 |
| `obnova` | POST | ano | Administrátor (+ heslo správce u účtů a matice) |
| `zaloha` | jakákoli | ano | Administrátor |
| `zaloha_vynuceno` | GET, POST | ano | Administrátor |
| `pd_deal`, `pd_dealy` | jakákoli | ano | právo `crm.pipedrive` z matice (Administrátor vždy), cizí Origin 403 |
| `pd_nanecisto` | POST | ano | právo `crm.pipedrive` |
| `pd_pole` | jakákoli | ano | Administrátor |
| `pd_stav` | GET | ano | bez práva PD (deal bere server ze zakázky) |
| `pd_vazba` | POST | ano | bez práva PD; pravidla uvnitř (čočka IN) |
| `pd_organizace` | POST | ano | `vitez`: přihlášený + pravidla uvnitř; `nahled`/`zapis`: právo PD + autor zakázky nebo Administrátor |

Anonymně bez klíče tedy jen `zdravi`, `prihlaseni`, `odhlaseni`. Navíc anonym u funkcí z AU-5 spustí načtení jádra (a u `analytika` čtení těla) před 401.

## Co je v pořádku (ověřeno)

- Atributy cookie, podpis, vypršení, konstantní čas, žádný výchozí klíč — `sdilene.mjs:344-397`; PoC `poc_AU_relace_a_prava.mjs` odd. 2, 3, 6 (**ODOLNÉ: všech 53 pokusů server odmítl**, i nad `origin/main`).
- Odhlášení, změna hesla, reset, vypnutí, zapnutí, smazání a znovuzaložení: stará cookie nikdy neožije (odd. 3) — kromě souběhu AU-2.
- Role z účtu, ne z cookie ani z požadavku (`sdilene.mjs:612-627`; odd. 2).
- Správa účtů: Obchodník i Vedoucí 22× 403; hromadné přiřazení neprojde (odd. 1).
- Výčet účtů: stejná odpověď, stejný čas (`prihlaseni.mjs:78`, `sdilene.mjs:186`; odd. 7).
- CSRF a CORS (odd. 5). Všechny odpovědi `json()` nesou `no-store`, `nosniff`, CSP `default-src 'none'`.
- ON: jen čas, jen správci, identita z relace (`sdilene.mjs:653-711`, `uzivatele.mjs:549`).
- Klient: heslo se neukládá do `localStorage`/`sessionStorage` (po přihlášení se jen předá samočinné kopii na Disk, `online_ui.js:317-320`); volání `credentials: 'same-origin'`; seznam účtů vykreslen přes `esc`/`escJs` (`online_ui.js:4507-4582`).
- Známé meze nezhoršené: B94 (scrypt), B159 (bez Origin), SEC-I8 (`__Host-`), B171 (odhlášení všude), B230.

## Co testy/mutace NEhlídají

- **Souběh počítadel pokusů:** žádný test neposílá přihlášení přes `Promise.all`; `test_prava.mjs:3569` hlídá jen pořadí řádků v kódu („pokus se započítá před ověřením“). Mutace B4/B75 měří jen sekvenční běh. AU-1 proto projde celým kolem.
- **Starý zápis akcí správce (AU-2):** `test_ucty_informativni.mjs` má háček souběhu jen pro převod zakázek (B92); pro `role`/`aktivni`/`archiv`/`heslo` test ani mutace není.
- **Adresa klienta:** v `mutace.mjs` není žádná mutace nad `x-nf-client-connection-ip` / `x-forwarded-for` (0 výskytů) — záměna pořadí hlaviček by prošla.
- **Mazání cookie při odhlášení** (`Max-Age=0`) a **pole `exp` při vydání relace** nemají mutaci (0 výskytů řetězců); mutace je jen na ověření platnosti.
- **Minimální délka hesla** (`HESLO_MIN`) nemá vlastní mutaci (jen volání `hesloPlatne`).
- **Tvar e-mailu** (AU-6): testy neznají řídicí znaky ani znaky nulové šířky.
- **Pořadí jádro × přihlášení** (AU-5) a text `jadroChyba` nehlídá nic.
- **Zpoždění brzdy** se v testech přeskakuje (`pockej` s `__TEST_ULOZISTE`), hlídá ho jen regulární výraz nad zdrojákem.
- `server/server.js` nemá bezpečnostní test (jen kostra).

## Poznámky k PoC

- Soubory: `poc_AU_soubeh_pocitadla.mjs`, `poc_AU_spravce_stary_zapis.mjs`, `poc_AU_hadani_vice_adres.mjs`, `poc_AU_relace_a_prava.mjs`; každý jde pustit i nad exportem main (`KNG_STROM=<složka>`).
- Po commitu koordinace jsem v `poc_AU_relace_a_prava.mjs` upravil jeden řádek: hromadná úprava hodnoty tajemství změnila zkoušku „tajemství kratší než 16 znaků“ na 16znakovou hodnotu a zkouška přestala platit; teď je `'testovaci-kratke'.slice(0, 12)`. **Tato změna není commitnutá.** `python3 nastroje/kontrola_udaju.py` po úpravě: čisté.
- Neověřeno (vyžadovalo by síť): chování Netlify k hlavičce `x-nf-client-connection-ip` od klienta, tvar odpovědi platformy na nezachycenou výjimku, dostupnost plánované funkce přes URL, skutečná míra souběhu mezi instancemi.
