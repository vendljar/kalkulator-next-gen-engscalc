# Čočka AD — autorizace nad ostatními daty (noční audit KNG, 20. 11. 2026)

Stav: větev `claude/audit-2026-11-20` (kód = origin/test, v19.11.11). Jen čtení kódu a lokální PoC
s paměťovým úložištěm; žádná síť. PoC jsou v `podklady/audit_2026-11-20/` (`poc_AD_*.mjs`, společná
příprava `poc_AD_spolecne.mjs`), všechny jsem spustil — výstupy níže.

Souhrn: **kritická 0 · vysoká 0 · střední 1 · nízká 2 · informativní 4.**
Zvýšení práv obchodníka, únik údajů zákazníka B do dokumentu zákazníka A ani anonymní přístup
k zálohám jsem v rozsahu čočky nenašel.

## Tabulka nálezů

| ID | Závažnost | Nález | Kde | PoC | main dotčen |
|---|---|---|---|---|---|
| AD-1 | střední (integrita) | Kterýkoli obchodník tiše přepíše cizí kartu zákazníka (číslo účtu, e-maily, zástupce); karta nemá historii verzí, zůstane jen poslední `upravil`. Mez není v `BEZPECNOST_MEZE.md`. | `netlify/functions/zakaznici.mjs:69-79`, `src/zakaznici.js:130-142, 257-269` | `poc_AD_zakaznici.mjs` | ano (soubory shodné) |
| AD-2 | nízká | Objekt v textovém poli karty (`{"toString":1}`) shodí `/api/zakaznici` neošetřenou výjimkou (500) — třída SEC-N1 tu ošetřená není. | `src/zakaznici.js:63, 260`, `netlify/functions/zakaznici.mjs:69` | `poc_AD_zakaznici.mjs` | ano |
| AD-3 | nízká | Číselník zákazníků nemá strop počtu karet ani délky pole `zalozen` (u nové karty ho navíc určuje klient); seznam se čte kartu po kartě bez stránkování. | `netlify/functions/zakaznici.mjs:41-47, 69-78`, `src/zakaznici.js:265` | `poc_AD_zakaznici.mjs` | ano |
| AD-4 | informativní (neověřeno na platformě) | Noční funkce `zaloha_nocni` nemá v kódu žádnou kontrolu volajícího; že nejde zavolat z internetu, stojí jen na chování Netlify u plánovaných funkcí a test hlídá jen chybějící `config.path`. | `netlify/functions/zaloha_nocni.mjs:56, 113`, `netlify/test_prava.mjs:2964-2970` | `poc_AD_zaloha_hesla.mjs` (část) | ano |
| AD-5 | informativní | Tiskový pohled zákazníka B po odemčení sdílené varianty nese v `odemceni[].zamek.tisky[].zakaznik` snímek adresáta A (název, IČO); pravidlo D3 čistí jen živý zámek. Žádný generátor historii netiskne. | `src/vice_zakazniku.js:1262-1268, 648` | `poc_AD_vz_pohled.mjs` | ne (VZ v main není) |
| AD-6 | informativní | Statická kontrola úniku VZ hledá jen doslovný řetězec `dalsiZakaznici` v 8 souborech; volání `vzZakaznici(` / `vzDalsi(` v generátoru by neodhalila. Dnes je stav čistý. | `nastroje/kontrola_vz_unik.sh` (seznam `SOUBORY`, `grep 'dalsiZakaznici'`) | ne | ne |
| AD-7 | informativní | Obnova karet zákazníků přijme klíč `z/<cokoli bez lomítka>`, který nemusí odpovídat klíči spočítanému z karty (`zakaznikKlic`). Jen administrátor. | `netlify/functions/obnova.mjs:889-899` | ne (jen čtení kódu) | neověřeno |

## Detail nálezů

### AD-1 — tichý přepis cizí karty zákazníka (střední, integrita dat)

- **Předpoklady:** přihlášený obchodník (libovolná role).
- **Kroky:** `POST /api/zakaznici { zakaznik: { ico: <IČO existující karty>, nazev, ucet, banka, smluvniEmail, … } }`.
  Klíč se počítá z IČO (`zakaznikKlic`), server kartu celou nahradí očištěným vstupem
  (`zakaznici.mjs:69-78`); ze starého záznamu drží jen `autor` a `zalozen`.
- **Výstup PoC:** `ZRANITELNÉ AD-1 — cizí obchodník přepsal číslo účtu karty (ucet=999-UTOCNIK/0100, autor dál
  obchodnik.a@priklad.cz, upravil=obchodnik.b@priklad.cz); historie verzí karty: žádná`.
- **Dopad:** karta předvyplňuje zakázky ostatních obchodníků (`zakaznikDoZakazky`, `zakaznikDoZakazkyPrazdne`,
  `zakaznikPredvypln` — `src/zakaznici.js:130-235`), tedy i pole zástupců a bankovního spojení objednatele, která
  jdou do smlouvy o dílo. Podvržený e-mail nebo účet zákazníka se tak dostane do cizí zakázky; po dalším
  přepisu není z čeho zjistit, kdo původní hodnotu změnil (jen poslední `upravil`/`upraven`). Pole, která
  útočník pošle prázdná, se v kartě vymažou. Cenu nabídky to nemění.
- **Kontext:** právo zápisu pro každého přihlášeného je vědomé rozhodnutí J. V. z 20. 8. 2026 (hlavička
  `zakaznici.mjs:8-11`). V `BEZPECNOST_MEZE.md` ale tahle mez ani její dopad (bez historie) zapsaná není.
- **Návrh:** (a) historie předchozích verzí karty po vzoru `popisy_historie` (`popisy.mjs`, posledních N),
  nebo (b) zapsat jako vědomou mez. Rozhodnutí je na J. V. (mění, kdo co smí).

### AD-2 — 500 při objektu v poli karty (nízká)

- **Kroky:** `POST /api/zakaznici { zakaznik: { nazev: { "toString": 1 }, ico: "…" } }`.
  `_txt` volá `String(v)` (`src/zakaznici.js:63`), u objektu bez volatelného `toString` to hodí výjimku;
  funkce ji nechytá a neprošla `textovaPoleChyba` (ostatní funkce ano — SEC-N1).
- **Výstup PoC:** `ZRANITELNÉ AD-2 — pole nazev = {"toString":1} → výjimka: Cannot convert object to primitive value (čeká se 400)`.
- **Dopad:** jen chybná odpověď (500 místo 400), data se nezmění.
- **Návrh:** v `zakaznici.mjs` odmítnout `t.zakaznik`, který není objekt, a jeho pole, která nejsou text/číslo (400).

### AD-3 — bez stropu počtu karet a délky `zalozen` (nízká)

- **Kroky:** obchodník pošle libovolný počet karet s různými názvy (klíč `n-<název>`); u nové karty pošle
  `zalozen` libovolné délky. `zakaznikOciste` ořezává pole na 300 / 2 000 znaků, `zalozen` ne
  (`src/zakaznici.js:265`); server ho u nové karty nepřepisuje (`zakaznici.mjs:76-77` řeší jen `autor`).
  Obnova přitom `zalozen` ořezává na 40 znaků (`obnova.mjs:895`).
- **Výstup PoC:** `ZRANITELNÉ AD-3 — obchodník založil 300 karet bez stropu; pole zalozen uloženo v délce 1000000 znaků`;
  `seznam: 302 karet, odpověď 1149429 B (čte se kartu po kartě, bez stránkování)`.
- **Dopad:** zahlcení číselníku a zpomalení `GET /api/zakaznici` všem (čtení `for … await s.cti`, řádky 41-47),
  karty jdou i do nočního otisku; mazat smí jen administrátor po jedné. Datum založení nové karty lze podvrhnout.
- **Návrh:** `zalozen` u nové karty psát ze serveru, strop počtu karet (a případně délky těla).

### AD-4 — noční funkce bez vlastní kontroly volajícího (informativní, neověřeno)

- `export default async () => {…}` (`zaloha_nocni.mjs:56`) požadavek vůbec nečte; `config` má jen `schedule`.
  PoC: `zaloha_nocni() bez argumentu a bez přihlášení → ok=true, vrací klíče: ok, den, hotovo, pocetZakazek,
  pocetUctu, velikostB, …`.
- Test (`test_prava.mjs:2964`) dokládá jen to, že funkce nemá `config.path`. Jestli Netlify u plánované funkce
  opravdu neobslouží výchozí adresu `/.netlify/functions/zaloha_nocni`, **jsem neověřoval** (pravidla auditu
  zakazují síť) — dokumentaci ani chování nasazeného webu jsem nečetl.
- **Dopad, pokud by adresa šla zavolat:** anonym by spustil otisk a retenci (obojí jednou za den, běh je
  idempotentní) a v odpovědi viděl počet zakázek a účtů a velikost databáze. Obsah zálohy odpověď nenese.
- **Návrh:** ověřit jedním anonymním GET na testovacím webu (rozhodne J. V. / testovací sezení); případně
  obranu do hloubky — funkce by přijala jen volání plánovače.

### AD-5 — zbytek razítek cizího zákazníka v historii odemčení (informativní)

- `vzVariantaBezCizichRazitek` (`vice_zakazniku.js:1262-1268`) vyjímá snímek adresáta jen z `v.zamek.tisky`.
  Po odemčení varianty správcem se zámek přesune do `v.odemceni[].zamek` (`zamek.js:1023-1029`) a ten se
  v tiskovém pohledu nečistí.
- **Výstup PoC:** `zamčená varianta: pohled B nese název A: false`; `po odemčení: pohled B nese název A: true, IČO A: true`;
  `kde: varianty[0].odemceni[0].zamek.tisky[0].zakaznik = {"id":"z1",…,"objednatel":"KANAREK-ALFA s.r.o.","ico":"27182818"}`.
- **Dopad:** dnes žádný únik do papíru — generátory (`nabidka*.js`, `sod.js`, `kryci*.js`, `docxgen.js`,
  `dokumenty.js`, `nazvy_souboru.js`) `odemceni` nečtou (grep bez výskytu). Je to oslabená pojistka: generátor,
  který by historii odemčení začal tisknout, by údaje A dostal. Sada `test_vz_unik.js` historii odemčení
  nenasazuje, takže by to nezachytila. Podobný zbytek (`zamek.snimek`, `data.kryci.zmrazeno`) sada vědomě
  připouští (`test_vz_unik.js:535-538`).
- **Návrh:** v tiskovém pohledu `odemceni` vynechat nebo vyčistit stejně jako živý zámek; doplnit kanárek.

### AD-6 — statická kontrola úniku VZ je úzká (informativní)

- `kontrola_vz_unik.sh` projde 8 souborů a hledá jen řetězec `dalsiZakaznici`. Funkce `vzZakaznici`, `vzDalsi`,
  `vzZakaznik` vracejí tatáž data a kontrola je nezná; mimo seznam jsou `podminky.js`, `plan_plateb.js`, `techspec.js`.
- Ověřil jsem ručně: v generátorech dnes žádné z těchto volání není. Návrh: rozšířit vzor a seznam souborů.

### AD-7 — obnova karet: klíč neodpovídá kartě (informativní)

- `obnova.mjs:897` žádá jen tvar `z/<bez lomítka>` a neprázdný `zakaznikKlic(z)`, ne jejich shodu. Karta ze
  zálohy tak může ležet pod jiným klíčem, než pod jakým by ji uložil běžný zápis (další uložení z obrazovky
  pak založí druhou kartu). Jen administrátor, jen ze zálohy; bez PoC, jen čtení kódu.

## Odpovědi na otázky zadání

1. **Víc zákazníků.** Výstupy po zákaznících vznikají jen v prohlížeči z `vzTiskPohled` (Word CN, CN PROJ, SoD,
   plná moc, krycí listy, náhledy, porovnání, specifikace, názvy souborů). Server dokumenty netvoří a žádný
   „pohled zákazníka“ nezná — v `netlify/` není jediný výskyt `vzPohled`/`vzTiskPohled`; `GET /api/zakazky`
   vrací celou zakázku. „Pohled zákazníka“ není role ani odkaz, jen přepínač na obrazovce. To je známá
   přijatá mez B223/B224. Serverové výstupy s údaji více zákazníků: rejstřík (jen název, číslo, stav —
   `src/uloziste.js:467-493`, B228 doplněk E6) a poznámka v Pipedrive (B225). Sadu úniku jsem spustil:
   174 OK, 0 FAIL.
2. **Číselník zákazníků.** Číst a zapisovat smí každý přihlášený, mazat jen administrátor; slučování není.
   Obchodník vidí a přepíše karty všech (záměr z 20. 8. 2026) — viz AD-1 až AD-3. Hromadný export = `GET` seznamu.
3. **Zálohy a obnova.** Vše jen administrátor (`zaloha.mjs:11`, `zaloha_vynuceno.mjs:53`, `obnova.mjs:396`,
   `controlling*.mjs`). Stažená záloha otisky hesel nenese ve všech čtyřech tvarech (PoC); noční otisk
   v Blobs je nese záměrně. Relace jsou podepsané cookie, v úložišti nejsou; tokeny integrací jsou
   v proměnných prostředí, ne v záloze. Obnova: účty a podpisy jen ze serverového otisku, hlavní účet jen on
   sám, heslo správce a potvrzení — četl jsem preambuli a kontrolní místa, ne všech 980 řádků. Plánovaná
   funkce: AD-4. `zaloha_disk` chrání token v hlavičce se stálým porovnáním a limitem pokusů (B210).
4. **Ceník, slovník, popisy, šablony, program, Firma, matice.** Zápis všude jen administrátor (PoC: 9× 403
   pro obchodníka); matice navíc heslo správce. Obchodník do společných dat nezapíše. Návrhy textů
   (`popisyNavrhy`) žijí v zakázce obchodníka a do číselníku je převezme až administrátor; výpis
   kandidátů se kreslí přes `esc` (`src/ui/cenik_ui.js:402-405`).
5. **Analytika a controlling.** Čtení analytiky, controlling i export jen administrátor (403 obchodníkovi).
   Matice zobrazení je vrstva pohodlí v prohlížeči; server podle ní ořezává jen historii ceníku
   (`netlify/functions/program.mjs:36-37`); nákladové sazby v platném ceníku obchodník dostane (známá mez B88).
6. **Úložiště.** Každá oblast má vlastní úložiště (`uloziste('zakaznici')`, `'program'`, `'sablony'`, `'zalohy'`…),
   klíč z jednoho nedosáhne do druhého. Klíče ze vstupu: zákazník — číslice nebo `n-[a-z0-9-]`, z adresy bez
   lomítka (`sdilene.mjs:423`); šablona — typ z výčtu a číslo verze; otisky — pevné regulární výrazy;
   analytika časů — `[\w\-. ]{1,60}` a jen zakázka z rejstříku. Průchod cestou ani přepis systémového klíče
   jsem nenašel (PoC: `?klic=../uzivatele/x` → 400, `typ=../rejstrik`, `__proto__`, `constructor` → 400).

## Co je v pořádku (ověřeno)

- Zápisy číselníků a zálohové cesty obchodníkem → 403 (17 případů, `poc_AD_cteni_a_500.mjs`, výsledek ODOLNÉ).
- Vadné vstupy obchodníka do `/api/analytika` a `/api/sablony` → 200/400, žádná 500 (tamtéž).
- Stažená záloha bez otisků hesel: `GET /api/zaloha`, `?zdroj=nocni`, `?strana=1`, `?strana=1&zdroj=nocni`
  (`poc_AD_zaloha_hesla.mjs`, ODOLNÉ; `zalohovani.mjs:1104-1112, 1244, 1309`).
- Mazání karty zákazníka jen administrátor; klíč z adresy s lomítkem → 400 (`poc_AD_zakaznici.mjs`).
- Slovník a controlling vydávají historii bez obsahu (`slovnik.mjs:40-43`, `controlling.mjs:41-44`).
- Šablony: zveřejnění jen administrátor, kontrola .docx, strop velikosti, kontrola obsahu (`sablony.mjs:54, 76-83`).
- Tiskový pohled VZ: živý zámek bez cizích razítek, krycí listy jen s vlastními ručními hodnotami, protokol
  vyjmut (`vice_zakazniku.js:609-656`); `test_vz_unik.js` 174/0; `kontrola_vz_unik.sh` čistá.
- UI číselníku zákazníků kreslí data přes `esc`/`escJs` (`src/ui/zakaznici_ui.js:70-71, 367-368, 445`) —
  procházel jsem jen tato místa, ne celý soubor.

## Co testy/mutace NEhlídají

- `zakaznici.mjs` má v `mutace.mjs` 4 mutace (hloubka těla, autor nové karty, tělo `null`, klíč z adresy).
  Nehlídá se: přepis karty jiným uživatelem, strop počtu a délek, objekt v poli (AD-1 až AD-3), pole `zalozen`.
- `test_prava.mjs` má pro zákazníky jen matici rolí (řádky 398-413) a tělo `null`/pole/číslo (2170).
- `test_vz_unik.js` nenasazuje historii odemčení (`odemceni`) — AD-5; zbytky v `zamek.snimek`
  a `kryci.zmrazeno` připouští.
- `kontrola_vz_unik.sh` — jen doslovný řetězec, 8 souborů (AD-6).
- Noční funkce: test hlídá `config.path === undefined`, ne chování platformy (AD-4).
- `netlify/lib/zakaznici_modul.cjs`, `retence_modul.cjs` v `mutace.mjs` nejsou (jsou to obaly `require`);
  `lib/uklid.mjs` 4 mutace.
- Neprověřoval jsem do hloubky: `obnova.mjs` (celý průběh), `retenceProved`, `firma.js` (tabulka lhůt),
  obsahovou kontrolu šablon, klientské `vice_zakazniku_ui.js` / `vz_tisk_ui.js`. Vše je za rolí
  Administrátor nebo kryté přijatými mezemi B221–B228; nové nálezy tam netvrdím ani nevylučuji.
