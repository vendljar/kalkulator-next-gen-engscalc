# Čočka IN — integrace (Pipedrive, ARES, Google Disk, e-mail)

Noční bezpečnostní audit KNG 20. 11. 2026, stav `origin/test` (v19.11.11, cda289e), větev `claude/audit-2026-11-20`.
Jen čtení kódu a lokální PoC (paměťové úložiště, simulátor Pipedrive, náhrada `fetch`); do sítě nešlo nic,
nástroje Pipedrive / Gmail / Disk nebyly volány. Kód aplikace nebyl změněn; přibyly jen PoC v `podklady/audit_2026-11-20/`.

**Souhrn: kritická 0 · vysoká 0 · střední 2 · nízká 2 · informativní 3.**
Anonymně zneužitelná chyba nenalezena: webhook i kopie na Disk bez platného tajemství nic nečtou ani nezapisují
(PoC `poc_IN_webhook_anonym.mjs`, 15/15 bodů odolných).

## Tabulka nálezů

| ID | Závažnost | Nález | Kde (origin/test) | PoC | main dotčen |
|---|---|---|---|---|---|
| IN-1 | střední | Obchodník s výchozími právy zapíše poznámku do libovolného dealu Pipedrive (deal určuje sám polem `pdDealId`); strop je jen 20/h na deal, na uživatele žádný — 40 dealů za jeden běh. | `netlify/lib/pd_poznamka.mjs:275,292`; `src/controlling.js:1060-1077` | `poc_IN_poznamka_cizi_dealy.mjs` | ne (na main `pd_poznamka.mjs` není, deal mění jen administrátor) |
| IN-2 | střední | Akce `vitez` přepojí organizaci libovolného dealu a založí v CRM novou organizaci — server neověřuje, že deal se zakázkou souvisí. | `netlify/lib/pd_org_vitez.mjs:246,304,310`; `netlify/functions/pd_organizace.mjs:68-80` | `poc_IN_vitez_cizi_deal.mjs` | ne (na main `pd_org_vitez.mjs` není) |
| IN-3 | nízká | `PIPEDRIVE_DOMENA` se nevaliduje: hodnota s `#`, `?` nebo `@` pošle token Pipedrive (hlavička `x-api-token`) na cizí hostitele. | `netlify/lib/pipedrive.mjs:67-74,121,125` | `poc_IN_pipedrive_klient.mjs` (a) | ano |
| IN-4 | nízká | Čtecí volání Pipedrive nemají výchozí časový limit (limit jen kde volající předá `casLimitMs`); webhook, detail, seznam, mapa polí, stav a suchý běh visí do limitu funkce, s až 3 pokusy. | `netlify/lib/pipedrive.mjs:134-143`; volání bez limitu `pd_webhook.mjs:64,129,316`, `pd_deal.mjs:40,70`, `pd_pole.mjs:44-45`, `pd_stav.mjs (lib):108,113`, `pd_nanecisto.mjs:123,130,139` | `poc_IN_pipedrive_klient.mjs` (b) | ano, main horší (limit není nikde) |
| IN-5 | informativní | `pd_deal.mjs` skládá cestu z `org_id` / `person_id` odpovědi Pipedrive bez `Number()` (webhook a ostatní `Number()` mají); cesta zůstává na hostiteli Pipedrive. | `netlify/functions/pd_deal.mjs:73-78` | `poc_IN_pipedrive_klient.mjs` (c) | ano |
| IN-6 | informativní | Bez proměnné `URL` za běhu funkce se odkaz zapisovaný do dealu skládá z hostitele požadavku (jiné jméno téhož webu, např. adresa staršího nasazení). | `netlify/lib/pd_webhook.mjs:308-313`; použití `pd_webhook.mjs:307`, `pd_vazba.mjs:117` | `poc_IN_webhook_anonym.mjs` (řádek INFO) | ano |
| IN-7 | informativní | `lib/pd_org_vitez.mjs` (jediný kód, který v CRM zakládá organizaci a přepojuje deal) nemá v `netlify/mutace.mjs` žádnou mutaci. | `netlify/mutace.mjs` (0 výskytů `pd_org_vitez`) | ne | ne (soubor na main není) |

Výstupy PoC (spuštěno 20. 11. 2026, vše lokálně):

```
poc_IN_poznamka_cizi_dealy.mjs
  stavy uložení (HTTP/pdPoznamka): {"200/zalozeno":40}
  nových poznámek v simulátoru Pipedrive: 40, různých dealů: 40
  ZRANITELNÉ: poznámka zapsána do 40 různých dealů jedním obchodníkem — žádný strop na uživatele, žádná vazba deal ↔ zakázka
  ODOLNÉ (uložený XSS v poznámce): obsah je escapovaný

poc_IN_vitez_cizi_deal.mjs
  A) uložení zakázky obchodníka s pdDealId cizího dealu 1101: HTTP 200
  C) POST /api/pd/organizace {akce:"vitez"}: HTTP 200 stav=zapsano zdroj=zalozena
     zápisy do Pipedrive: POST /api/v2/organizations ; PATCH /api/v2/deals/1101
     cizí deal 1101: org_id 1 → 11; organizací v CRM 10 → 11
  ZRANITELNÉ: obchodník přepojil organizaci cizího dealu (a založil v CRM novou organizaci)

poc_IN_pipedrive_klient.mjs
  ZRANITELNÉ PIPEDRIVE_DOMENA: token jde jen na *.pipedrive.com  [cizi.example# → cizi.example ; uzivatel@priklad.cz:443# → cizi.example ; cizi.example?x= → cizi.example]
  ZRANITELNÉ pdZavolej bez volby casLimitMs má vlastní časový limit  [stále čeká po 1504 ms]
  ODOLNÉ    pdZavolej s casLimitMs skončí včas (504)
  ZRANITELNÉ pd_deal: org_id / person_id z odpovědi jdou do cesty jen jako číslo  [… /api/v2/v1/users ; /api/v2/persons/9]
  ODOLNÉ    pd_deal: všechna volání zůstala na hostiteli Pipedrive
  ODOLNÉ    token Pipedrive není v žádné odpovědi /api/pd/deal (úspěch, 400, chyba CRM)
  ODOLNÉ    id dealu s „/“, „?“ nebo písmeny se odmítne dřív, než se sáhne na síť

poc_IN_webhook_anonym.mjs  →  ODOLNÉ — 15/15 bodů odolných (podrobně v oddíle „Co je v pořádku“)
```

## Detail nálezů

### IN-1 (střední) — poznámka do libovolného dealu, bez stropu na uživatele

**Předpoklady útočníka.** Přihlášený obchodník s výchozími právy (právo `crm.pipedrive` má podle rozhodnutí
J. V. 15. 10. 2026 každý — `netlify/test_pd_pristup.mjs:116`), zapnutý vypínač „víc šachet“ (pro druhý druh poznámky
„víc zákazníků“), napojení na Pipedrive nastavené.

**Kroky.**
1. Obchodník uloží vlastní zakázku s řídící variantou o víc šachtách a s `pdDealId` = číslo kteréhokoli dealu.
   Deal smí zadat i změnit autor zakázky (`ctrlPdDealSmiMenit`, `src/controlling.js:1060-1068`; u nové zakázky
   `!stara → true`). Server neověřuje, že deal k zakázce patří.
2. Uložení zapíše do toho dealu poznámku (`pdPoznamkaDruhUlozeni`, `pd_poznamka.mjs:275-299`, `POST /api/v1/notes`).
3. Další uložení s jiným `pdDealId` zapíše poznámku do dalšího dealu. Strop `pdStropCerstvych('deal:' + dealId, …)`
   (`pd_poznamka.mjs:292`) se počítá **na deal**, takže se při střídání dealů nikdy nenaplní.

**Dopad.** Text poznámky nese názvy šachet (volný text obchodníka, escapovaný — uložený XSS v Pipedrive nehrozí)
a číslo nabídky. Jeden účet tak zanese poznámky do všech dealů firmy a spotřebuje denní rozpočet volání Pipedrive.
Poznámky aplikace nemaže (B217), úklid je ruční. Čtení ani ceny se netýká.

**Vztah ke známým mezím.** B217 popisuje strop „20 pokusů za hodinu na deal“ a právo `crm.pipedrive`; že cílový deal
určuje autor a že chybí strop na uživatele, tam není. U opravy organizace je obdobná věc vědomě přijata (B209:
„kdo smí zakázku s dealem navázat, tím určuje, kterou organizaci jde opravit“).

**Návrh opravy (rozhodnutí J. V. — bezpečnostní mez).**
- strop zápisů poznámek i na uživatele (vzor `org-vitez`: `pd_org_vitez.mjs:269-270` má deal i uživatele), a/nebo
- zápis jen do dealu, jehož vazbu server ověřil: číslo nabídky v dealu sedí s číslem zakázky (totéž pravidlo jako
  webhook, `pdWebhookCisloSedi`), nebo pole „Odkaz na kalkulaci“ míří na tuto zakázku, nebo vazba z webhooku je
  potvrzená; případně ověření už při ruční změně `pdDealId`.

### IN-2 (střední) — `vitez` přepojí organizaci libovolného dealu

**Předpoklady útočníka.** Obchodník s výchozími právy, zapnutý vypínač „víc zákazníků“, vlastní prodaná zakázka
s víc zákazníky. PoC stav „prodáno“ dosazuje přímo do úložiště (stejně jako `netlify/test_vz_organizace.mjs`);
zda obchodník prodej vlastní zakázky provede sám přes API, tato čočka neověřovala (patří čočce prodeje/zámků).

**Kroky.**
1. Obchodník založí zakázku s `pdDealId` cizího dealu (PoC krok A: HTTP 200 přes `/api/zakazky`) a s IČO, které zvolí.
2. Po prodeji zavolá `POST /api/pd/organizace { soubor, akce: 'vitez' }`. Server ověří roli (autor / kdo prodal /
   administrátor), stav prodáno, víc zákazníků a platné IČO hlavičky (`pd_org_vitez.mjs:234-272`) — vazbu dealu
   na zakázku ne (deal bere z `ulozena.pdDealId`, `:246`).
3. Server najde nebo **založí** organizaci podle IČO (`:304`) a dealu přepíše `org_id` (`:310`).

**Dopad.** Cizí deal v CRM vede jinou organizaci; v CRM vznikne nová organizace (název z ARES, při výpadku ARES
z hlavičky zakázky). Původní organizace se nemaže, změna je v historii Pipedrive. Stropy 10/h na deal a 20/h na
uživatele rozsah omezují na 20 dealů za hodinu.

**Vztah ke známým mezím.** B226 uvádí „klientovi se nevěří nic kromě jména souboru“; deal ale pochází od autora
zakázky a to v mezi popsáno není.

**Návrh opravy (rozhodnutí J. V.).** Před `PATCH` ověřit vazbu dealu stejně jako v IN-1 (číslo nabídky v dealu /
odkaz na kalkulaci / potvrzená vazba z webhooku); jinak stav „nelze ověřit“ a nic nezapisovat.

### IN-3 (nízká) — `PIPEDRIVE_DOMENA` bez validace

`pdZaklad()` z proměnné odstraní schéma, cestu a příponu `.pipedrive.com` a složí `https://<d>.pipedrive.com`
(`pipedrive.mjs:67-74`). Znaky `#`, `?`, `@`, `:` projdou; `new URL()` pak za hostitele vezme část před nimi
a `pdZavolej` tam pošle `x-api-token` (`:121-125`). Proměnnou nastavuje jen správce Netlify, uživatel ji neovlivní —
jde o pojistku proti překlepu nebo podvržené hodnotě v nastavení, ne o SSRF z uživatelského vstupu.
**Oprava:** přijmout jen `^[a-z0-9][a-z0-9-]{0,62}$`, jinak `PdChyba` a žádné volání; test s pojistkou.

### IN-4 (nízká) — čtení z Pipedrive bez výchozího časového limitu

`pdZavolej` zakládá `AbortController` jen s volbou `casLimitMs` (`pipedrive.mjs:142-143`). S limitem volají
`pd_poznamka.mjs`, `pd_org_vitez.mjs`, `pd_vazba.mjs:113,119`, `pd_organizace.mjs:96,102,123`; bez limitu webhook
(i jeho `PATCH` odkazu, `pd_webhook.mjs:316`), detail a seznam dealů, mapa polí, stav dealu při otevření zakázky
a suchý běh. Neodpovídající Pipedrive tak drží funkci do limitu platformy; při 429/5xx se navíc čeká 1 s a 2 s mezi
třemi pokusy (`:175`). Webhook drží i výhradní úsek dealu (`pd_webhook.mjs:115`). Dopad je dostupnost, ne data.
**Oprava:** výchozí limit v `pdZavolej` (např. 5 s) pro všechna volání, volající ho smí jen zkrátit.

### IN-5 (informativní) — `org_id` / `person_id` bez `Number()` v `pd_deal.mjs`

`pd_deal.mjs:77-78` skládá `'/api/v2/organizations/' + idFirmy`; hodnota je z odpovědi Pipedrive. PoC: odpověď
s `org_id: "5/../../v1/users"` vede na `/api/v2/v1/users`. Hostitel se nezmění, API v2 vrací čísla — obrana do hloubky.
Ostatní místa `Number()` mají (`pd_webhook.mjs:134-135`, `pd_organizace.mjs:99`, `pd_poznamka.mjs:371`).
`/api/pd/deal` a `/api/pd/dealy` klient nevolá (`src/` je nepoužívá). **Oprava:** `Number()` + kontrola kladného celého čísla.

### IN-6 (informativní) — odkaz do dealu z hostitele požadavku

`pdWebhookOdkaz` bere web z proměnné `URL`, jinak z `new URL(req.url).origin` (`pd_webhook.mjs (lib):308-313`).
Komentář v `pipedrive_simulator.mjs:68-70` sám uvádí, že za běhu funkce `URL` nastavená být nemusí. Pak rozhoduje
jméno, pod kterým byl webhook zavolán (jen držitel klíče). `pd_vazba.mjs:117` týž výpočet používá při mazání odkazu:
prohlížeč na jiném jménu webu odkaz vyhodnotí jako „cizí“ a nesmaže. Zda je `URL` na Netlify za běhu k dispozici,
jsem neověřoval (bez sítě). **Oprava:** web brát z pevné proměnné (např. `PROSTREDI` → pevná adresa), bez pádu na hostitele.

### IN-7 (informativní) — `pd_org_vitez.mjs` bez mutací

`netlify/mutace.mjs` má pro `functions/pd_organizace.mjs` 6 mutací, všechny K40c (oprava firmy); pro
`lib/pd_org_vitez.mjs` žádnou. Sada `netlify/test_vz_organizace.mjs` existuje, ale není doloženo, že zčervená při
vypnutí kontroly „kdo smí“ (`:120-126`, `:234`), „prodáno“ (`:236`), „víc zákazníků“ (`:238`), stropů (`:269-270`),
práva `crm.pipedrive` (`:272`) nebo ověření kandidáta podle IČO (`:158`). **Oprava:** doplnit mutace `[VZ E5b]`.

## Odpovědi na otázky zadání

1. **Webhook.** Sdílené tajemství `PIPEDRIVE_WEBHOOK_KLIC` (≥ 32 znaků) v hlavičce `x-kalkulator-klic`, `Bearer` nebo
   heslo `Basic`; z adresy se nepřijímá; porovnání `tajneShodne` = sha256 obou stran + `timingSafeEqual`
   (`sdilene.mjs:168-173`). Chybí-li tajemství (nebo je krátké / z mezer) → 503, nic se nepropustí. Podpis ani časové
   razítko nejsou — zachycený požadavek jde přehrát, ale doručení je idempotentní (`bezeZmeny`, žádný zápis). Tělo
   nejvýš 16 KiB, bere se jen ID dealu. Držitel klíče umí: založit kalkulaci z dealu, navázat existující kalkulaci
   podle čísla nabídky (stav „čeká“ + upozornění), doplnit prázdná pole hlavičky a termín v krycím listu nezamčených
   variant, zapsat odkaz do dealu, vyvolat dotaz do ARES; nejvýš 60×/h. Neumí: cenu, ceník, zámek, Prodáno, stav
   zakázky, zamčenou variantu ani hlavičku zakázky se zamčenou variantou. Vlastnictví dealu se ověřuje číslem nabídky
   (409). Anonym bez klíče neumí nic (401 před čtením těla, úložiště i Pipedrive). Meze B199–B202 platí beze změny.
2. **Pipedrive API.** Token jen v prostředí, jde v hlavičce `x-api-token`, ne v adrese; v odpovědích, chybách ani
   v logu není (funkce `pd_*` nelogují). Adresa se skládá z proměnné prostředí a číselných id (IN-3, IN-5 výš).
   Čtení libovolného dealu obchodníkem s právem je známá mez B80 (strop 30/h). Zápis mimo vlastní zakázky: IN-1, IN-2;
   oprava organizace B209 (přijato). Suchý běh do Pipedrive nezapisuje — `patch` se jen vrací, žádné volání s ním
   neexistuje (všechna `metoda:` v kódu: odkaz, mazání odkazu, organizace, vitez, poznámky). Simulátor se na ostrém
   webu nezapne (`pipedrive_simulator.mjs:87-105`, mutace K37-N7 a #536) a má přednost před tokenem. Opačný směr
   (skutečný token na testovacím webu bez `PIPEDRIVE_SIMULATOR=1`) kód nehlídá — je to věc nastavení.
   Poznámky: obsah escapovaný (`pdPoznamkaEsc`, `:84-93`), ověřeno PoC.
3. **ARES.** Z klienta (`ares_ui.js:83`, CSP `connect-src 'self' https://ares.gov.cz`) i ze serveru
   (`ares_server.mjs`). Adresa = pevný základ + 8 číslic po kontrolní číslici; server: jeden pokus, 3 s,
   `redirect: 'error'`, strop 200 kB, vrácené IČO musí sedět. V UI vše přes `esc`. Klient shodu vráceného IČO
   s dotazovaným neověřuje (ukáže ho uživateli k potvrzení). Mez B208 beze změny.
4. **Google Disk.** Server nikam nic neodesílá — skript si kopii **stahuje** (`/api/zaloha_disk`), takže podvržená
   adresa skriptu na serveru neexistuje. Ověření: `KNG_DISK_TOKEN` (≥ 32) jen v `Authorization: Bearer`, token
   v adrese 400, požadavek s `Origin` 403, konstantní čas. Token umí přečíst očištěnou noční zálohu (bez otisků
   hesel a podpisů), potvrdit kopii a ohlásit úbytek (B210–B214). Ve skriptu jsou token a adresy ve vlastnostech
   skriptu (nastavuje majitel Google účtu), adresa musí být `https://jméno` bez cesty, `followRedirects: false`,
   jméno souboru od serveru se kontroluje (`retenceZalohDiskRozeber`), kusy se ověřují SHA-256. Token se neloguje
   (jen délka, `kopie_disk.gs:70`).
5. **E-mail.** Server neodesílá nic (žádné SMTP ani služba). Jediný e-mail posílá skript Apps Script majiteli účtu
   (`Session.getEffectiveUser()`, `kopie_disk.gs:435-440`), příjemce není z dat. `mailto:` aplikace negeneruje
   (jen povolený odkaz v šablonách, `src/sablona_obsah.js:58`).
6. **Odchozí spojení serveru.** Dvě místa: `pipedrive.mjs:148` (`https://<doména>.pipedrive.com`, limit jen
   s `casLimitMs` — IN-4) a `ares_server.mjs:33,122` (`https://ares.gov.cz/…`, 3 s). Chyby jdou klientovi jako
   česká věta bez tokenu.

## Co je v pořádku (ověřeno čtením a PoC)

- Webhook bez tajemství v prostředí: 503; bez klíče / špatný klíč / klíč v adrese / v cookie / jako jméno Basic:
  401 a **žádné čtení ani zápis úložiště, žádný dotaz do Pipedrive** (`pd_webhook.mjs:84-88`; PoC 8 obměn).
- Tělo nad 16 KiB 413; z těla jen ID dealu, cena / soubor / autor ignorovány; odpověď bez e-mailu, telefonu, tokenu.
- Replay: `bezeZmeny`, razítko i počet zakázek stejné, žádný další `PATCH`. Strop 60/h → 429 bez Pipedrive.
- Zamčené varianty: `pdWebhookZamkyPoruseny` (`lib/pd_webhook.mjs:234-243`), mutace #553.
- `/api/pd/*` z prohlížeče: `vyzadujRoli` → `prihlaseny` odmítá cizí původ, `Origin: null` i tělo jiné než JSON
  (`sdilene.mjs:497-512`); `pd_pole` jen administrátor; `pd_stav` bere deal z uložené zakázky.
- `pd_vazba` „zrušit“ a `pd_organizace` „náhled/zápis“: autor z uložené verze nebo administrátor, shoda IČO,
  organizace musí patřit dealu, zapisují se jen potvrzená a stále odlišná pole.
- Suchý běh: jen čtení, vstup přes whitelist tvaru (`pd_nanecisto.mjs:47-69`), strop na uživatele.
- Klient: `ares_ui.js`, `pd_mapa_ui.js`, `pd_nanecisto_ui.js`, `pd_vazba_ui.js`, hlášky `vice_zakazniku_ui.js:893-928`
  — hodnoty z CRM a ARES přes `esc`; CSV přes `csvBunka` (ochrana vzorců, `src/pd_nanecisto.js:172`).
- `/api/zaloha_disk`: vypnuto bez tokenu, brzda špatných tokenů, metadata bez tokenu a hesel (PoC).
- Kopie na Disk: účty jen e-mail / jméno / role / aktivní, `podpisy: null` (`kopie_skript.mjs:168-172`, mutace #577).

## Co testy/mutace NEhlídají

- `lib/pd_org_vitez.mjs`: žádná mutace (IN-7).
- Vazbu deal ↔ zakázka při ručním `pdDealId` netestuje nic — sady naopak počítají s tím, že autor zadá libovolný deal
  (`test_vsd_pd_poznamka.mjs`, `test_vz_organizace.mjs`). Strop poznámek na uživatele neexistuje, test tedy také ne.
- `PIPEDRIVE_DOMENA`: žádný test tvaru hodnoty.
- Výchozí časový limit `pdZavolej`: mutace „VSD N2: limit volání se nevynutí“ hlídá jen větev s `casLimitMs`.
- Webhook: mez těla 413 má jeden test (`test_553_webhook.mjs`), ale žádnou mutaci; přijímání klíče z `Bearer` / `Basic`
  a odmítnutí klíče z adresy mutaci nemají (mutace jsou „klíč se neověřuje“, „prázdný klíč projde“, „krátký klíč“).
  Statická kontrola `KLICEM_CHRANENE` v `test_prava.mjs:3492-3494` hlídá pořadí v textu zdrojáku, ne chování.
- `pdWebhookOdkaz`: test jen pro větev s proměnnou `URL` (`test_553_webhook.mjs:158-160`), pád na hostitele požadavku ne.
- ARES server: strop velikosti odpovědi má test (`test_k40c_webhook.mjs:58`), mutaci ne (mutace: časový limit,
  neplatné IČO, jiné IČO v odpovědi, tvar DIČ, `redirect`).
- `pd_deal.mjs`: tvar `org_id` / `person_id` z odpovědi netestuje nic.
- Apps Script (`kopie_disk.gs`): 12 mutací; kontrola tvaru adresy webu (`:409`) a `followRedirects: false` jsem mezi nimi nehledal — neověřeno.

## Poznámka pro koordinátora (mimo čočku, neověřeno)

Netlify drží starší nasazení dostupná pod vlastními adresami (`<nasazení>--web.netlify.app`; kód s nimi počítá
v `pipedrive_simulator.mjs:68,81`). Pokud jejich funkce pracují nad stejným úložištěm, zůstává veřejně volatelný
i starý kód z doby před bezpečnostními opravami. V `BEZPECNOST_MEZE.md` jsem o tom zmínku nenašel. Bez sítě nešlo
ověřit — doporučuji předat čočce nasazení.

## Soubory PoC

- `/home/user/kalkulator-next-gen-engscalc/podklady/audit_2026-11-20/poc_IN_poznamka_cizi_dealy.mjs`
- `/home/user/kalkulator-next-gen-engscalc/podklady/audit_2026-11-20/poc_IN_vitez_cizi_deal.mjs`
- `/home/user/kalkulator-next-gen-engscalc/podklady/audit_2026-11-20/poc_IN_pipedrive_klient.mjs`
- `/home/user/kalkulator-next-gen-engscalc/podklady/audit_2026-11-20/poc_IN_webhook_anonym.mjs`
