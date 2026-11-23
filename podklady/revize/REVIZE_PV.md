# Revize dávky PV (#597 zápis prodeje do dealu, #734 autor = vlastník dealu)

Datum: 23. 11. 2026. Rozsah: `git diff 9f2445a..52347f5` (větev `claude/pv-pipedrive`, v23.11.7).
Revizor: poradce (jen čtení kódu a běh testů proti simulátoru; do Pipedrive ani na weby nic).

## Verdikt: SLOUČIT PO OPRAVÁCH

Před sloučením do integrace opravit **V1** (vysoká) a **S1** (střední). S2–S4 doporučuji opravit v téže
dávce (jsou malé), N1–N6 mohou jít do roadmapy. Otázky O1–O2 patří J. V. (bezpečnostní meze).

Co je v pořádku (ověřeno čtením a pokusem): deal id jen z uložené zakázky, vazba deal ↔ zakázka přes
`pdDealPatriZakazce`, hodnota dealu, ATYP, kalendář PROJ, strany a měna ze serveru, stav dealu nikdy,
zápis jen s `PIPEDRIVE_ZAPIS = ano` (kontrola předem i v `pdZavolej`), otisk náhledu, strop, e-maily
uživatelů Pipedrive se klientovi ani do logu nevracejí, #734 nepřepisuje autora existující kalkulace.

Testy spuštěné revizí: `test_pv_597_zapis` 57/0, `test_pv_734_autor` 51/0, `test_prava` 1050/0,
`test_k40c_webhook` 118/0. Mutace a celé kolo jsem nepouštěl (beru výsledek dávky z předávky).

## Nálezy

### V1 (vysoká) — texty krycího listu včetně „Čísla nabídky (CN)“ jdou do dealu z prohlížeče

- Kde: `netlify/lib/pd_prodej.mjs:51` (`hodnoty: (kl && kl.hodnoty) || {}`), vstup
  `netlify/functions/pd_prodej.mjs:105-106`.
- Co: server si `hodnoty` krycího listu spočítá sám (`pdnPodklad` → `sv.hodnoty`), ale zahodí je
  a do převodu pustí hodnoty z těla požadavku. Pokusem proti simulátoru: podklad s podvrženým
  `cisloCN`, `splatnostDni`, `zarukaMesicu`, `pokutaSplatnost`, `pokutaLimit`, `priplatkyNabidka`
  → náhled 200, zápis 200 „zapsano“, v dealu je cizí číslo nabídky a podvržené podmínky. Další
  poctivý náhled téže zakázky už hlásí deal jako „cizí“.
- Proč vadí: (a) krycí list je po Prodáno definitivně zamčený — do CRM mají jít jeho uložené
  hodnoty, ne to, co pošle prohlížeč; (b) CN v dealu je podle #115 B značka vlastníka dealu —
  kdo má právo zapsat prodej, přepíše ji na číslo libovolné jiné nabídky bez převzetí, poznámky
  a protokolu; (c) zápis jde pod tokenem z účtu J. V. (B2), v historii dealu nese jeho jméno;
  (d) protokol zakázky nese jen názvy polí, hodnoty ne — podvrh se zpětně nedohledá.
  Rozsah je omezený na deal vlastní ověřené zakázky a na oprávněného (autor / kdo prodal /
  vedoucí / administrátor), cizí deal tím zapsat nejde.
- Ověření, že oprava je možná: serverové `sv.hodnoty` a hodnoty z prohlížeče se u zkušební zakázky
  shodují ve všech 43 neprázdných polích (0 rozdílů).
- Návrh opravy: v `pdProdejStrany` brát `hodnoty: sv.hodnoty || {}`; z těla požadavku `strany`
  vůbec nečíst (nechat jen `zdroje` = popisky pro tabulku). UI pak `strany` posílat nemusí.
  Kdyby se některé pole na serveru složit nedalo, vyjmenovat ho výslovně; `cisloCN` nikdy z klienta.
- Test s pojistkou: náhled a zápis s podvrženým `strany.ock.hodnoty` (CN, splatnost) → řádky
  i tělo PATCH nesou hodnoty z uložené zakázky. Mutace: návrat k `kl.hodnoty` musí test shodit.
  Dnešní sada tohle nehlídá (bod 1 testu podvrhuje jen cenu, ATYP, PROJ a kalendář).

### S1 (střední) — převzetí dealu bez stopy, když PATCH proběhl a odpověď nedorazila

- Kde: `netlify/functions/pd_prodej.mjs:206-226`.
- Co: PATCH s převzetím zapíše do dealu i naše CN. Když Pipedrive zápis provede, ale odpověď
  nestihne (504, nebo funkci ukončí limit Netlify před `zaznamenej`), zůstane stav „chyba“ /
  „čeká“. Opakování: deal už nese naše CN → `cizi` je prázdné → poznámka k dealu ani věta
  „PŘEVZAT od nabídky …“ v protokolu nikdy nevzniknou. Převzetí (#115 bod 4) tak proběhlo bez
  záznamu. (Odvozeno z kódu; simulátor „visí“ PATCH neprovede, takže to test neukáže.)
- Návrh opravy: úmysl převzetí zapsat do protokolu zakázky PŘED PATCH (věta „Převzetí dealu N od
  nabídky X — zahájeno“, ve výhradním úseku), po úspěchu doplnit výsledek. Poznámku k dealu při
  opakování dopsat, pokud protokol nese zahájené převzetí bez poznámky. Do simulátoru scénář
  „PATCH proveden, odpověď nedorazila“ a test.

### S2 (střední) — dva souběžné zápisy: dva PATCH a dvě poznámky o převzetí

- Kde: `netlify/functions/pd_prodej.mjs:198-227` (zápis není ve výhradním úseku).
- Co: pokus — dva současné požadavky `zapis` s týmž otiskem a `prevzit` → oba 200, 2× PATCH,
  2 poznámky k dealu, 2 věty v protokolu. PATCH je stejný (neškodí), poznámka se zdvojí.
  Dvojklik UI brzdí (`PROD_PD.nacita`), dvě okna nebo dva lidé ne.
- Návrh opravy: část od nového čtení dealu po `zaznamenej` obalit `vyhradne('pd/prodej/' + deal)`
  a deal uvnitř přečíst znovu (druhý požadavek pak uvidí nový `update_time` → 409 „zmeneno“).

### S3 (střední) — dotaz na uživatele Pipedrive ve webhooku bez vlastního časového limitu

- Kde: `netlify/functions/pd_webhook.mjs:241` (`pdZavolej('/api/v1/users')` s výchozími 8 s
  a opakováním po 429).
- Co: pomocný dotaz může sám spotřebovat čas funkce; webhook pak neskončí „technickým autorem“,
  ale spadne celý a kalkulace se nezaloží. #734 přitom říká „výpadek = technický účet + varování“.
- Návrh opravy: `{ casLimitMs: 2500, pokusu: 1 }` (vzor `pd_prodej.mjs:79`); test se scénářem
  „visí“ jen na `/users` → založeno, autor technický, stav „chyba“.

### S4 (střední) — text chyby Pipedrive jde do záznamu prodeje a protokolu

- Kde: `netlify/lib/pipedrive.mjs:128` (`popisStavu` připojí `telo.error`),
  použití `netlify/functions/pd_prodej.mjs:143,173,209`.
- Co: u odmítnutého PATCH (400) se text z Pipedrive uloží do `v.prodano.pipedrive.duvod` a do
  protokolu zakázky. Validační hlášky Pipedrive mohou opakovat odeslanou hodnotu (jméno, e-mail
  uživatelského pole). Dnes ořez na 300 znaků a bez řídicích znaků, obsah se nefiltruje.
- Návrh opravy: do záznamu a protokolu jen vlastní pevné věty podle stavu (400 → „Pipedrive
  zápis odmítl (neplatná hodnota pole)“); surový text nejvýš do odpovědi tomu, kdo zapisoval.

### N1 (nízká) — vypnutý uživatel Pipedrive se může stát autorem

- Kde: `netlify/lib/pd_webhook.mjs:377-393` — nečte se `active_flag` uživatele Pipedrive.
- Dopad malý (účet kalkulátoru musí být aktivní a mít stejný e-mail). Návrh: `active_flag === false`
  → „nenalezen“; test.

### N2 (nízká) — `pdPoleMapa()` mimo časový rozpočet zápisu

- Kde: `netlify/functions/pd_prodej.mjs:160`. Po vypršení mezipaměti (15 min) jdou dva dotazy
  s limitem 8 s mimo `volani()`. Zápis se tím nerozbije (PATCH je až potom), jen požadavek může
  skončit limitem funkce bez záznamu. Návrh: předat časovou mez, nebo mapu číst před startem rozpočtu.

### N3 (nízká) — deal se čte dvakrát

- Kde: `netlify/functions/pd_prodej.mjs:162-166` (ověření odkazem čte deal, hned nato znovu).
  Zbytečný token a 2,5 s z rozpočtu. Návrh: `pdDealPatriZakazce` ať deal vrátí.

### N4 (nízká) — každý neúspěšný pokus zapíše zakázku a protokol

- Kde: `netlify/functions/pd_prodej.mjs:142-145, 153, 164`. I vypnutý zápis nebo neověřená vazba
  změní razítko zakázky a přidá větu do protokolu (strop 20 za hodinu na deal); stav „zapsano“
  se tím vrátí na „chyba“, i když deal hodnoty má. Návrh: u 503 a „neovereno“ jen odpověď, bez
  zápisu do zakázky; nebo aspoň nepřepisovat „zapsano“.

### N5 (nízká) — zápis prodeje nemá řádek v logu funkce

- Webhook loguje jeden řádek bez osobních údajů; `pd_prodej` nic. Návrh: `pd_prodej: { dealId,
  akce, stav, pocetPoli, prevzato }` — bez jmen, e-mailů a hodnot.

### N6 (nízká) — komentář na špatném řádku

- `netlify/lib/pd_vazba.mjs:53` — komentář k `icoShoda` zůstal za řádkem `zalozil`.

## Zaměření revize (1–6)

1. **Cizí deal, vazba, CN, práva.** Deal id, zakázka i varianta jsou z uložené zakázky; tělo nese
   jen `soubor`. Cizí obchodník 403, neprodaná 409, bez vazby 409 (testy i mutace to hlídají).
   CN v dealu se porovnává s číslem uložené zakázky — to sedí; zapisované CN ale jde z klienta (V1).
2. **Hodnota dealu a kalendář.** Ze serveru z prodané varianty; podvrh ceny, PROJ strany a kalendáře
   se ignoruje (test + mutace „cena dealu od klienta“). Kombinovaná = součet, po SoD
   `ctrlCenaDilaSod` jen u OCK, měna vždy CZK (kalkulace cenu v jiné měně do podkladu nedává).
   Texty krycího listu ovlivnit jdou (V1).
3. **#734.** Cizí kalkulaci přes Pipedrive získat nejde: autor se určuje jen při založení nové
   kalkulace (`!stara`), existující (i podle čísla nabídky) dostane „ceka“ bez příznaku `zalozil`
   a autora nemění. Změna vlastníka nebo e-mailu v Pipedrive dá autorství nejvýš účtu se shodným
   e-mailem — útočník sám nezíská nic. Duplicitní id / e-mail → technický účet; vypnutý
   a archivovaný účet kalkulátoru → technický účet. Příznak `zalozil` klient nepodvrhne
   (`pdVazbaDrz` bere vazbu z uložené verze; nový soubor ji nedostane). Zbývá N1 a S3.
4. **Souběh, idempotence, limity, log.** Otisk s `update_time` funguje; opakování po 504 doběhne
   bez dalšího PATCH. Slabá místa S1, S2, N2. Log webhooku nese jen stav autora, bez e-mailu.
5. **Bez `PIPEDRIVE_ZAPIS = ano` a bez potvrzení nic.** Platí: kontrola před prvním dotazem
   (`pd_prodej.mjs:153`), druhá v `pdZavolej`; zápis bez otisku z náhledu 400. Náhled jen GET.
6. **Testy.** Pojistky u 18 mutací [PV] odpovídají kódu. Chybí: podvržené `hodnoty` (V1),
   PATCH proveden bez odpovědi (S1), souběh dvou zápisů (S2), visící `/users` (S3).

## Meze z předávky dávky

Soubor `PREDAVKA.md` uvádí tři; čtvrtou jsem v repu nenašel — pokud ji nese zpráva dávky
koordinaci, prosím o doplnění.

1. **Texty krycího listu z prohlížeče** — nepřijatelné v dnešní podobě, viz V1 (oprava je malá).
2. **Vlastník-autor má práva autora** (zrušit vazbu, opravit firmu, změnit deal) — technicky
   konzistentní se zakázkou založenou ručně a vlastník deal v Pipedrive stejně ovládá. Je to ale
   rozšíření proti dnešku (dosud jen administrátor) → rozhodnutí J. V., viz O1.
3. **Okno mezi GET a PATCH** — přijatelné. Pipedrive podmíněný zápis nemá, okno je pod 3 s,
   posílají se jen změněná pole a náhled ukáže „dnes v Pipedrive“. S2 ho zúží pro souběh z aplikace.

## Otázky pro J. V. (bezpečnostní meze)

- **O1:** Smí vlastník dealu jako autor kalkulace z webhooku zrušit vazbu, změnit deal a opravit
  firmu v Pipedrive? Doporučení: **ano** (stejná práva jako autor ručně založené zakázky;
  potvrzení vazby „V pořádku“ zůstává jen administrátorovi, #723).
- **O2:** Zápis prodeje hlídá právo „Čtení obchodních případů z Pipedrive“ (`crm.pipedrive`).
  Stačí, nebo zavést samostatné právo pro zápis? Doporučení: **zatím stačí** (k tomu musí být
  autor / kdo prodal / vedoucí / administrátor); popisek práva v Nastavení upravit, aby říkal
  i „zápis prodeje“.
