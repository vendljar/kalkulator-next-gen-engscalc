# Čočka AZ — autorizace nad zakázkami, zámky, schvalování, logika a peníze

Noční bezpečnostní audit KNG 20. 11. 2026. Stav `origin/test` v19.11.11 (cda289e), srovnání `origin/main` v11.11.1 (6c4bc80e).
Model útočníka: přihlášený OBCHODNÍK, který posílá vlastní těla JSON na API.

Všechny PoC jsou v `podklady/audit_2026-11-20/poc_AZ_*.mjs` (společný základ `poc_AZ_zaklad.mjs`: skutečné funkce
`netlify/functions` nad paměťovým úložištěm, zkušební ceník, smyšlené účty `…@priklad.cz`, bez sítě). Každý byl spuštěn
nad pracovním stromem (= origin/test). Dotčení `origin/main` jsem ověřil během týchž PoC nad snímkem
`git archive origin/main src netlify` rozbaleným do scratchpadu (větev se nepřepínala).

Počty: kritická 0 · vysoká 1 · střední 1 · nízká 3 · informativní 3.

## Tabulka nálezů

| ID | Závažnost | Nález jednou větou | Kde (origin/test) | PoC | main dotčen |
|----|-----------|--------------------|-------------------|-----|-------------|
| AZ-1 | **vysoká** | Příznak strany zakázky `jenProj`/`jenOck` není po odeslání ani po Prodáno zmrazený: kterýkoli přihlášený ho přepne, čímž změní, která strana prodané nabídky se počítá (hodnota dealu, controlling), a strana při zámku neposouzená (schválení ceny, nepotvrzená ruční cena, marže slevy) se po vypnutí příznaku počítá bez dotisku — zbytek B153. | `src/zamek.js:508-521, 594-626`; `src/zakazka.js:650-665`; `netlify/lib/zakazka_kontrola.mjs:199-201, 715-748`; `src/rucni_ceny.js:375-378`; `src/vyjimky.js:602-609`; `src/schvalovani.js:589-591`; `src/objednane.js:703-708`; `src/controlling.js:646-648` | `poc_AZ_1_strana_po_zamku.mjs` → ZRANITELNÉ (2/2) | ano (obě části; část B na main s kladnou nepotvrzenou cenou) |
| AZ-2 | střední | Přísné ověření zmrazeného výsledku nového zámku dá razítko „shoda“ i výsledku, ze kterého klient vypustil téměř všechna čísla (782 z ~790) nebo číslo přidal — nabídka je „odeslaná a ověřená“ s nulovým nákladem v controllingu a podvrženým řádkem můstků. | `src/zamek.js:872-881, 927-929, 947-953, 957-959` | `poc_AZ_2_vysledek_neuplny.mjs` → ZRANITELNÉ | ano |
| AZ-3 | nízká | Razítko verze (B10) je dobrovolné: tělo bez pole `ocekavaneRazitko` (nebo s `prepsat:true`) přepíše cizí rozpracovanou zakázku bez kolize 409, včetně smazání nezamčených variant. | `netlify/functions/zakazky.mjs:134-140` | `poc_AZ_3_prepis_bez_razitka.mjs` → ZRANITELNÉ | ano |
| AZ-4 | nízká | Snímek lhůt PROJ (D8 #677) `data.kryciProj.lhutyProj` píše klient bez kontroly tvaru i původu; u odeslané neprodané varianty ho smí přepsat kdokoli (i 200 kB libovolného obsahu) a Prodáno ho zmrazí. | `src/zamek.js:673-676`; `src/objednane.js:451-455`; `src/lhuty_proj.js:286-291`; `src/kryci_proj.js:121-124` (server žádnou kontrolu nemá) | `poc_AZ_4_lhuty_snimek.mjs` → ZRANITELNÉ | ne (D8 na main není) |
| AZ-5 | nízká | Limity: neznámé klíče zakázky a libovolně dlouhé texty se ukládají (do 4 MB na zakázku); `/api/vypocet` nemá strop velikosti, kontrolu hloubky ani typu těla a vrátí odpověď 11 MB (nad strop Netlify 6 MB); počet variant není omezen. | `netlify/lib/zakazka_kontrola.mjs:116-158`; `netlify/functions/zakazky.mjs:103-112`; `netlify/functions/vypocet.mjs:30-34` | `poc_AZ_5_limity.mjs` → ZRANITELNÉ (2/2; prototypové klíče ODOLNÉ) | ano |
| AZ-6 | informativní | Schválení slevy se váže na id varianty a procento, ne na obsah: po schválení 10 % jde pod týmž id uložit několikanásobně dražší šachta a schválení drží. | `src/schvalovani.js:428-435, 477-487` | `poc_AZ_6_schvaleni_obsah.mjs` → ZRANITELNÉ | ano |
| AZ-7 | informativní | Rejstřík žádostí o schválení projde nejvýš 500 zakázek (`seznam('z/')`), zbytek jen ohlásí `neuplny`; každé otevření záložky = až 500 čtení úložiště od kteréhokoli přihlášeného. | `netlify/functions/schvalovani.mjs:36, 112-123` | ne (čtení kódu; pořadí klíčů ze `seznam` neověřeno) | ano |
| AZ-8 | informativní (zhoršení známé meze B195) | Od #667 projde i nulová ruční cena položky: obchodník si potvrdí sám 68 položek na 0 Kč se zdrojem „x“ a odešle nabídku za 14 % ceníkové ceny bez schválení; text meze B195 dosud tvrdí „nula neprojde“. | `src/rucni_ceny.js:159-163, 301-302`; `BEZPECNOST_MEZE.md:1479` | `poc_AZ_8_rucni_cena_nula.mjs` → ZRANITELNÉ | ne (main nulu odmítá; kladná cena projde stejně — B195) |

## Detail nálezů

### AZ-1 — strana zakázky (jenProj / jenOck) jde přepnout po odeslání i po Prodáno (vysoká)

**Předpoklady:** jakýkoli přihlášený účet (i cizí obchodník, ne autor zakázky). Stačí běžné `POST /api/zakazky`.

**Co je špatně.** Zámek hlavičky po odeslání (`zamekZakCesty`, `zamekZakZmeny`, `src/zamek.js:508-521, 594-626`) hlídá jen
pole krycích listů s `bind` (název akce, adresa; po SoD/Prodáno údaje zákazníka). Příznaky `jenProj` a `jenOck` mezi nimi
nejsou. Přitom právě ony (spolu s číslem) určují vyřazenou stranu (`zakazkaVyrazenaStrana`, `src/zakazka.js:650-665`),
která se „nikde nesčítá, netiskne ani nekontroluje“.

**Část A — změna toho, co se u prodané nabídky počítá.** Výstup PoC:

```
obch1: nabídka OCK odeslána (200) a prodána (200); hodnota dealu ze strany: OCK | controlling strany: ock
obch2 (cizí obchodník) uloží jenProj=true → HTTP 200 ULOŽENO
po přepnutí: hodnota dealu ze strany: PROJ | controlling strany: proj | hodnota se změnila: true
zámek i prodej beze změny: true true | upravil: obch2@priklad.cz
```

`prodPdZapis` (`src/objednane.js:703-708`) a `ctrlExportVarianty` (`src/controlling.js:646-648`) berou stranu podle
příznaku: po přepnutí nese prodaná zakázka hodnotu a řádky controllingu JINÉ strany (neodeslané projekce), nebo žádné.
Zámek, zmrazený výsledek i záznam prodeje zůstávají beze změny, stopa je jen `upravil`.

**Část B — obejití schvalování (zbytek B153).** Nový zámek stranu vyřazenou příznakem neposuzuje:
`zamekNovyCenaProblem` (`zakazka_kontrola.mjs:199-201`), `vyjimkyZamekProblem` (`src/vyjimky.js:602-609`),
`rucniCenyZamekProblem` (`src/rucni_ceny.js:375-378`), `schvalovaniServerMarze` (`src/schvalovani.js:589-591`).
Oprava B153 (v15.10.8) posoudí novou stranu až při DOTISKU (`zakazka_kontrola.mjs:715-748`) — jenže záznam tisku
posílá klient (mez B164) a k tomu, aby se strana začala počítat, žádný dotisk potřeba není. Výstup PoC:

```
kontrola — zámek nabídky OCK s nepotvrzenou ruční cenou: HTTP 403 (ruční cena z nabídky bez zdroje …)
s jenProj=true zámek dokumentem nabidkaProj: HTTP 200 ULOŽENO
vypnutí jenProj (bez dotisku): HTTP 200 ULOŽENO
Prodáno: HTTP 200 ULOŽENO
prodaná odeslaná varianta: strany hodnoty dealu: OCK | controlling: ock | ruční cena potvrzena: false | ověření zámku: shoda
```

Obchodník tak má odeslanou, prodanou a razítkem „shoda“ ověřenou nabídku OCK s cenou, kterou by server při přímém
zámku odmítl (ruční cena 0 Kč bez zdroje = podle N3 #667 cena ke schválení nadřízeným; totéž čtením kódu platí pro
minimální marži platné slevy). Dokument si útočník vytiskne vlastním klientem; v databázi, controllingu a hodnotě dealu
figuruje jako řádně odeslaná.

**Dopad:** obejití schvalování ceny u odeslané nabídky; změna hodnoty a obsahu prodané zakázky v controllingu a v zápisu
do Pipedrive kterýmkoli přihlášeným uživatelem.

**Návrh opravy (rozhoduje J. V. — dotýká se ceny a dokumentů):**
1. `ZAK.jenProj`, `ZAK.jenOck` (a `obeStrany`) zařadit mezi cesty hlavičky zmrazené, jakmile je v ULOŽENÉ verzi
   kterákoli varianta zamčená (`zamekZakZmeny`); změnu pustit jen administrátorovi, nebo vůbec.
2. Nezávisle: při novém zámku posoudit OBĚ strany, které zmrazený výsledek nese (ne jen nevyřazenou), nebo vyřazenou
   stranu do `zamek.vysledek` vůbec nebrat, aby se po přepnutí neměla z čeho počítat.
3. Test: zámek PROJ s `jenProj` → vypnutí příznaku → 409; přepnutí u prodané → 409. Mutace: vypuštění nové cesty.

### AZ-2 — neúplný zmrazený výsledek dostane razítko „shoda“ (střední)

**Předpoklady:** obchodník, první uložení nového zámku (tisk) vlastním požadavkem.

**Co je špatně.** `zamekVysledekRozdily` v přísném režimu (`src/zamek.js:921-954`): klíč, který je jen v jednom výsledku,
se přeskočí (`:927`, `:947-953`), pokud to není pole; povinných je jen 6 + 2 částek jádra (`:872-881`, `:957-959`).
Klient tedy smí kterékoli jiné číslo VYPUSTIT (i uvnitř řádků v polích — řádek zůstane, jen bez čísel) a smí PŘIDAT
číslo, které přepočet serveru nemá. Výstup PoC:

```
podvržený zámek: vypuštěno čísel 782 (zbylo ~11) + 1 přidané → HTTP 200 bez varování
razítko ověření serveru: {"stav":"shoda","rozdilu":0}
controlling z podvrženého zámku: [{"oblast":"ock","nakladJeNula":true,"zaokrZakladu":0}]
vypocetZ — klíče souhrnu, které zbyly: zakladCena, zakladDph, zakladSDph, priplatkyCena, mustkyCena
cenaNabidkyOck nese řádek můstků z přidaného čísla: true
```

**Dopad:** zmrazený výsledek je jediný zdroj čísel odeslané nabídky (`vypocetZ`, `src/zamek.js:199-206`) a klíč zámku ho
drží napořád (`uloZamekKlic`, `src/uloziste.js:682-686`). Controlling pak u nabídky ukáže náklad 0 (`controlling.js:661`),
dotisk a krycí list nemají řádkové částky, přidané `souhrn.mustkyCena` rozdělí cenu v dokumentu na „můstky / šachta“
podle útočníka (`src/zaokrouhleni.js:194-195`; součet se nemění). Razítko přitom tvrdí shodu, takže lišta zámku ani
hláška po uložení nic neřeknou. Celkovou cenu bez DPH takto změnit nejde (jádro se porovnává).

**Návrh opravy:** v přísném režimu brát číslo jen na jedné straně jako rozdíl (obě směry), tedy doplnit do větví
`:927` a `:947-953` podmínku „`prisne` a číslo → `pridej`“; výjimku pro jinou verzi aplikace už přísný režim stejně
nemá (B119). Test s pojistkou: výsledek bez `ock.souhrn.zakladNaklad` a s `mustkyCena` navíc → „nesouhlasi“.

### AZ-3 — razítko verze je dobrovolné (nízká)

**Předpoklady:** kterýkoli přihlášený, zná číslo cizí zakázky (rejstřík vidí všichni).

**Kroky a výstup PoC:**

```
obch2 s ocekavaneRazitko:"" → 409 KOLIZE (správně)
obch2 BEZ pole ocekavaneRazitko → 200 PŘEPSÁNO
po útoku: varianty 1 | objednatel změněn: true | autor: obch1@priklad.cz | upravil: obch2@priklad.cz
obch2 s prepsat:true → 200
```

Podmínka `typeof t.ocekavaneRazitko === 'string'` (`zakazky.mjs:140`) je přechodná výjimka pro „staršího klienta“
z 22. 8. 2026. Zakázky vlastníka nemají (záměr #103, B157), takže úprava cizí zakázky je dovolená; tady jde o to, že
tichý přepis celé rozpracované zakázky (smazání nezamčených variant) nevyžaduje ani vědomé `prepsat`. Zamčené varianty
a interní poznámky jsou chráněné jinými pojistkami (409 / 403). Škodu vrací noční otisk.

**Návrh:** výjimku zrušit — chybějící pole brát jako prázdné razítko (kolize 409, pokud zakázka existuje). Zvážit, zda
`prepsat:true` cizí zakázky nemá smět jen autor, vedoucí a administrátor (týž okruh jako `poznamkySmiPsat`).

### AZ-4 — snímek lhůt PROJ bez kontroly (nízká)

**Předpoklady:** kterýkoli přihlášený; odeslaná, zatím neprodaná varianta.

Porovnání dat zamčené varianty klíč `kryciProj.lhutyProj` do prodeje vynechává (`src/zamek.js:673-676`), server ho
nevaliduje (`lhutyProjVady` volá jen `/api/firma`) a při Prodáno ho nepřepočítá z uložené Firmy — snímek dělá prohlížeč
(`src/objednane.js:451-455`). Výstup PoC:

```
cizí obchodník zapíše vlastní „tabulku lhůt" (vše 0,01) do odeslané nabídky → 200 ULOŽENO
libovolný tvar (200 kB textu, neznámé klíče) → 200 ULOŽENO | vady podle lhutyProjVady: 2
obch1 prodá s podvrženým snímkem → 200 | zmrazený snímek = podvrh: true | = tabulka firmy (výchozí): false
oprava snímku po prodeji → 409 (zmrazeno)
```

**Dopad:** tabulku lhůt smí měnit jen administrátor, snímek v prodané zakázce ale určuje obchodník; termíny krycího
listu PROJ se z něj dopočítají (`src/kryci_proj.js:121-124`) a u data se ukáže zdroj „ze lhůt“. Dopad je omezený tím, že
termíny jdou do tisku SoD přepsat i ručně. Vedlejší: úložiště pro libovolná data uvnitř odeslané nabídky.

**Návrh:** při uložení nového prodeje dosadit snímek na serveru z uložené Firmy (`lhutyProjEf`), u neprodané varianty
klíč zahazovat; aspoň `lhutyProjVady` → 400.

### AZ-5 — limity velikosti a tvaru (nízká)

Výstup PoC:

```
(a) 1 MB text + neznámé klíče → HTTP 200 | uloženo: popisZameru 1000000 zn., název varianty 300000 zn., neznamyKlic true, varianta.cokoli true
(b) /api/vypocet, 401 variant: vstup 2522 kB → HTTP 200, odpověď 11418 kB za 305 ms
(c) uložení 401 variant → HTTP 200 za 271 ms
(b) /api/vypocet hluboké pole → HTTP 400 (obecný try/catch, bez hloubkaChyba)
(d) __proto__/constructor v těle → HTTP 200 | Object.prototype čistý: true | klíče uloženy: false
```

- `zakazkaPrijmi` (`zakazka_kontrola.mjs:116-158`) nemá seznam povolených klíčů zakázky ani variant a délku hlídá jen
  u čísla; jediný strop je 4 MB na tělo (`zakazky.mjs:103-112`). Rejstřík se nenafoukne (ořez adresy, B121).
- `/api/vypocet` (`vypocet.mjs:30-34`): žádný strop těla, žádná `hloubkaChyba`, žádná kontrola typu; odpověď je ~4,5×
  větší než vstup a nad 6 MB ji Netlify nevrátí (holá 502 po odvedené práci). Aplikace bod dnes nevolá.
- Počet variant není omezen (401 variant se uloží za 0,3 s — výkon v pořádku).

**Návrh:** `/api/vypocet` dát stejné brány jako `/api/zakazky` (content-length, `hloubkaChyba`, objekt), případně bod
vypnout, dokud ho nic nevolá; u zakázky strop délky textů hlavičky a názvu varianty, neznámé klíče nejvyšší úrovně
zahazovat (pozor na zpětnou slučitelnost — rozhodnutí koordinace/J. V.).

### AZ-6 — schválení slevy platí pro procento, ne pro cenu (informativní)

Klíč rozhodnutí (`schvalovaniRozhodnutiKlic`, `src/schvalovani.js:428-435`) nese stav, procento a jméno; obsah varianty
ne. PoC: vedoucí schválí 10 % na šachtě se zdvihem 3 m, obchodník pod týmž id uloží zdvih 30 m (základ ×3) a sleva dál
platí se jménem vedoucího. Je to dokumentovaný návrh („rozhodnutí platí jen pro své procento“), ne chyba kontroly;
uvádím kvůli otázce „změna po schválení“. Možnost: vázat schválení i na základ ceny s tolerancí.

### AZ-7 — strop 500 zakázek v rejstříku žádostí (informativní)

`STROP_ZAKAZEK = 500` (`schvalovani.mjs:36`), `klice.slice(0, 500)` (`:113`). Nad 500 zakázek se žádosti ze zbytku
schvalovateli neukážou (odpověď nese `neuplny: true`); každý GET od kteréhokoli přihlášeného stojí až 500 čtení.
Které zakázky vypadnou, závisí na pořadí `seznam()` — neověřeno. Doporučení: číst žádosti z rejstříku zakázek.

### AZ-8 — nulová ruční cena (informativní, zhoršení známé meze B195)

Záměr J. V. (#561 B-Q3, #667 „i nulovou“). PoC: 68 položek ceníku na 0 Kč, zdroj „x“, vlastní potvrzení, tisk →
200, ověření „shoda“, cena 14 % ceníkové, žádná cenová výjimka ani sleva. Schvalování slev je touto cestou z principu
obejitelné; `BEZPECNOST_MEZE.md:1479` je třeba opravit („nula ani záporná neprojde“ už neplatí) a J. V. by měl vědět,
že mez sahá až k nule u všech položek s cenou v Kč. Zcela nulovou nabídku server odmítne (403 `cenaNula`).

## Co je v pořádku (ověřeno čtením i během)

Odpovědi na otázky zadání; pokusy pocházejí z průzkumných běhů nad týmž harnessem.

1. **Pole od klienta × role.** `autor`, `autorJmeno`, `upravil`, `upravilJmeno`, `uloRazitko` píše server
   (`zakazka_kontrola.mjs:679-694, 825-832`; `zakazky.mjs:213-214`) — podvržený autor se zahodí. Razítka zámku
   `kdo`, `prijato`, `overeni`, `hlavicka` server drží nebo přepíše (`uloZamekRazitkaDrz`, `src/uloziste.js:702-737`;
   `zakazka_kontrola.mjs:706-708, 808-817`) — pokus s podvrženým `overeni`/`kdo`/`prijato` skončil hodnotami serveru.
   Role slevy z relace (`schvalovani.js:474-476`). Záznam prodeje, stav Pipedrive a historii prodeje píše server
   (`src/objednane.js:659-680`) — podvržené `kdo`, `kdy`, `pipedrive.stav` se zahodily; historie z těla se nebere.
   Mazání zakázky jen administrátor (`zakazky.mjs:63-65`). Vypínače `/api/funkce` jen administrátor (`funkce.mjs:26`).
   Čtení cizí zakázky je záměr (#103). Klíč souboru nejde zneužít k zápisu mimo `z/` (`uloKlicSouboru`, přípona).
2. **Zámky.** Všechny pokusy odmítnuty: `zamceno:false`, `zamek:null` (409), `zamek:null` + `odemceni` (403 jen
   administrátor), jiné id nebo smazání zamčené varianty (409 chybí), id jako číslo (409), duplicitní id (400),
   změna `vysledek`, `kdy`, `snimek` (409), změna dat včetně `sleva`, `zaokr`, `techspec`, `zadaniRucni`, neznámého pole
   krycího listu (409), změna přípony = čísla (403), název akce po odeslání řídící (409). Nový zámek: číslo z papíru,
   čas, snímek a přísné ověření. Prodáno: cizí obchodník neprodá (403), obchodník neodemkne (403), prodaný krycí list
   a snímek lhůt po prodeji zmrazené (409). Souběh v instanci řeší `vyhradne` + druhé a třetí čtení
   (`zakazky.mjs:131-212`); mezi instancemi je to známá mez (BEZPECNOST_MEZE ř. 1095).
3. **Schvalování slev.** Odmítnuto: podvržené „schváleno“, zvýšení procent po schválení (i o 1e-10), kopie schválení
   do `slevaProj`, klon se schválením (nové id), starý tvar `slevaPct` u nové i existující zakázky, `procenta` jako
   text / hex / Infinity (server i `slevaPodil` převádějí stejně, rozdíl typů nic neobejde), neznámý stav. Rejstřík
   `/api/schvalovani` nenese částky (jmenovitý výběr polí).
4. **Ceny.** Zaokrouhlení jen z výčtu (400 u kroku 100 000, 1e9, záporného); záporné rozměry 400; `1e400` 400.
   Server cenu neukládá „jak přijde“ jen u jádra nového zámku (přepočet a porovnání) — s výhradou AZ-2; u nezamčené
   varianty se cena neukládá vůbec (počítá se z dat). `/api/vypocet` počítá jen z poslaných dat, nic neprozradí.
5. **Tvar těla.** Hloubka (`hloubkaChyba`), ne-objekt, `varianty` textem nebo s `null` → 400, ne 500. Prototypové klíče
   se zahazují a `Object.prototype` zůstává čistý (PoC AZ-5 d).
6. **Co je „odeslaná“.** Jen varianta se `zamek.zamceno` v ULOŽENÉ verzi; zámek i záznamy tisku posílá klient.
   Známé přijaté meze, které jsem potvrdil a nehlásím: podvržený výsledek dostane „nesouhlasi“ a uloží se (B59),
   tisk bez záznamu (B62, B164), zámek pod jiným číslem (B61), hlavička v dotisku (B161 — platí i pro `datum`,
   `objednatel`, `kontakt`, `popisZameru` a název varianty), volná pole krycího listu cizí nabídky (B157), „cena dle
   nabídky“ (S13), vlastní schválení výjimky (B165 část 2), ceníky v datech zakázky (B162a, B196).

## Co testy/mutace NEhlídají

- **AZ-1:** žádný serverový test nepřepíná `jenProj`/`jenOck` po zámku bez dotisku ani u prodané varianty
  (`test_prodano_zamek.mjs`, `test_563_prodano_ridici.mjs`, `test_mutace_zamek.mjs` příznak nepoužívají; `test_prava.mjs`
  ho má jen u nové zakázky, ř. 2140). Mutace `mutace.mjs:3868, 4144, 4148` hlídají jen větev DOTISKU (B153).
- **AZ-2:** `test_prava.mjs:1213-1236, 1290` a mutace `:1954-1966, 3128, 3150` zkoušejí vynechání částky JÁDRA, celého
  souhrnu a pole řádků; vynechané nejádrové číslo ani číslo navíc netestuje nic.
- **AZ-3:** mutace B10 (`mutace.mjs:2368-2369`) hlídá jen, že se razítko kontroluje, když přijde; testy posílají pole
  vždy (`test_prava.mjs:1529…`). Tělo bez pole u cizí zakázky nemá test.
- **AZ-4:** `test_d8_lhuty.mjs` kontroluje tvar lhůt jen u `/api/firma` (ř. 88-92) a zmrazení PO prodeji (ř. 127);
  podvržený snímek před prodejem a jeho tvar ne. Mutace `:279-283` hlídají jen podmínku `!variantaProdana`.
- **AZ-5:** `/api/vypocet` má v testech jen přihlášení a běžný výpočet (`test_funkce.mjs`, `test_ok8.mjs`,
  `test_prava.mjs`); velikost těla a odpovědi ne. Neznámé klíče a délky textů zakázky netestuje nic.
- **AZ-6, AZ-7:** bez testu (návrh / strop); strop 500 nemá test s více než 500 zakázkami.
- Obecně: `mutace.mjs` (≈1 700 mutací) i `test_prava.mjs` míří na jednotlivé pojistky; chybí test invariantu „po zámku
  se nesmí změnit nic, co mění výstupy odeslané varianty“ (hodnota dealu, controlling, cena) napříč poli hlavičky.
