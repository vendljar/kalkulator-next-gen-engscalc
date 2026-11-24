# Nezávislá revize dávky PO — odeslání nabídky do Pipedrive (#116, CRM-17)

- Datum: 24. 11. 2026
- Revidovaný rozdíl: `git diff 7339a9e..a605d5c` (větev `claude/po-odeslani-pipedrive`)
- Revizní větev: `claude/revize-po` (jen tento soubor; ve větvi PO se nic neměnilo)
- Pipedrive: jen simulátor (`netlify/lib/pipedrive_simulator.mjs`); živý účet, weby ani Disk se nepoužily.

## Verdikt: SLOUČIT PO OPRAVÁCH

Brána zápisu (práva, vazba, vypínač, otisk, výpočet na serveru) drží a odpovídá vzoru #597.
Před sloučením je nutné opravit **R1** (krok „soubor“ obchází zastavení u ztraceného dealu a u cizího čísla
nabídky). **R2** doporučuji opravit ve stejné dávce (duplicitní soubory, stav jen jeden na zakázku).
**R3** a **R4** jsou otázky pro J. V. — bez odpovědi bych do skutečného Pipedrive zápis nezapínal.
Ostatní jsou drobnosti a mezery v testech.

## Co se spustilo

| Co | Výsledek |
|---|---|
| `bash nastroje/testovaci_kolo.sh --bez-mutaci --proti origin/claude/integrace-16-10` | VŠE ZELENÉ (41 min): sady 544 / 0 selhalo / 6 přeskočeno (firemní podklady), hodiny 443 / 0, statické 12 / 12, porovnání S3 **SHODA 367 / 367**. Běželo nad špičkou větve `a605d5c` (a605d5c + pozdější commity dokumentace) |
| `node netlify/test_po_116_odeslani.mjs` (nad `a605d5c`) | 59 OK, 0 FAIL |
| `node src/test_po_116_ui.js` (v kole) | prošel (v sadách i s posunutými hodinami) |
| Vlastní sondy proti simulátoru (11 scénářů, níže P1–P11) | viz nálezy |
| Vlastní cílené mutace (12 ks, oddělená pracovní kopie) | 1 zabita, 11 přežilo — viz R12 |

Mutační kroky kola (jádro, server) jsem nepouštěl (`--bez-mutaci` podle zadání); 27 mutací [PO] dávky jsem
znovu neověřoval, jen doplnil vlastní.

## Nálezy

### R1 — krok „soubor“ nezná zastavení (ztracený deal, cizí číslo nabídky) — STŘEDNÍ, opravit před sloučením

`functions/pd_odeslani.mjs:190` volá `souborKrok` hned po ověření vazby, dřív než se načte deal a spočítá
`zastaveno` (ř. 213). Zastavení tak platí jen pro akci `zapis`.

Sonda proti simulátoru:
- P1a: deal `lost` → `akce: 'soubor'` vrátí 200 `zapsano`, soubor u dealu je.
- P1b: v dealu „Číslo nabídky (CN)“ = cizí `CN-77777` → 200 `zapsano`, soubor u dealu je.

Odporuje zadání („ztracený zastaví vše“) a doporučení v otázce #760 (a), (c). Stačí přímé volání API nebo
tlačítko „Přiložit Word k dealu“ na kartě (to je vidět i u zastaveného náhledu).

Návrh: v kroku `soubor` načíst deal (`GET /api/v2/deals/{id}`) a použít totéž zastavení jako zápis
(stav `lost` / `deleted`, cizí CN přes `pdProdejCnSedi`) → 409 `kod: 'zastaveno'`, `soubor.stav = 'chyba'`.
Test s pojistkou (ztracený deal, cizí CN → žádný soubor) a mutace „soubor se nezastaví“.

### R2 — stav zápisu je jeden na zakázku; soubor se nahraje dvakrát — STŘEDNÍ, doporučuji opravit

`pdOdeslaniZaznam` při jiné variantě nebo novém zámku založí nový záznam (zůstane jen id poznámky).
Dohledání souboru u dealu (`GET /deals/{id}/files`) běží jen při stavu `zahajeno` / `chyba`.

- P5: dvě odeslané varianty. Zápis + soubor varianty 1, zápis varianty 2 → záznam varianty 1 zmizí.
  Karta varianty 1 pak hlásí „nezapsáno“ a další „Přiložit Word“ nahraje **druhý soubor téhož názvu**
  (u dealu 2× `CN_CN-213_2026-11-24.docx`).
- P7: odemčení a nový zámek téže varianty (týž den) → opět druhý soubor téhož názvu.

Návrh (nejmenší): shodu názvu a velikosti hledat u dealu **vždy** před nahráním (jedno čtení navíc),
ne jen po nepotvrzeném pokusu. Lepší: stav vést po variantách (`pdOdeslani.varianty[id]`), aby karta
první varianty nelhala. Poznámka zůstává jedna (ověřeno — P5: 1 poznámka, upravena).

### R3 — prodaná zakázka / vyhraný deal: odeslání jiné varianty přepíše hodnotu dealu — STŘEDNÍ, otázka pro J. V.

U vyhraného dealu se fáze ponechá, ale pole krycího listu a **Hodnota dealu** se zapíšou.
P2: deal `won` s hodnotou 999 999 → po zápisu odeslání 980 000 (cena odesílané varianty).
Po Prodáno (#597) nese deal cenu prodané varianty, případně cenu díla ze SoD; první tisk CN jiné
varianty ji po odklepnutí tabulky přepíše. Otázka #760 (b) mluví jen o „polích a poznámce“, hodnotu nezmiňuje.

Doporučení: u prodané zakázky (`prodStav`) nebo dealu `won` neposílat hodnotu ani pole krycího listu —
jen poznámku a soubor; případně zápis zastavit s větou. Rozhodne J. V. (doplnit do #760).

### R4 — více zákazníků: tisk pro dalšího zákazníka zapisuje do dealu řídícího — STŘEDNÍ, otázka pro J. V.

Ověřeno čtením kódu, ne během. `zamekPoTisku` u prvního zámku volá kartu bez ohledu na to, komu se
tisklo (`zamek.zakaznik`); `odeslPdSoubor` si Word uloží také bez ohledu na zákazníka; server
`zamek.zakaznik` nečte. První CN vytištěná pro dalšího zákazníka tak nabídne zápis polí, hodnoty a fáze
do dealu řídícího zákazníka a přiloží k němu Word s hlavičkou jiné firmy pod názvem `CN_<číslo>_<datum>.docx`.

Doporučení: zeptat se J. V., zda se má odeslání dalšímu zákazníkovi do dealu propisovat. Do rozhodnutí
u zámku se `zakaznik` ≠ řídící kartu jen informativně (bez zápisu a bez souboru) a na serveru 409.

### R5 — kontrola Wordu jen podle podřetězců — NÍZKÁ až STŘEDNÍ (mez B279, otázka #759)

`pdOdeslaniDocx` ověří hlavičku `PK\x03\x04` a výskyt textů `[Content_Types].xml` a `word/document.xml`
kdekoli v datech. P4: soubor, který není platný ZIP, a obsahuje `macroEnabled` a `word/vbaProject.bin`,
projde a přiloží se — i bez potvrzeného náhledu (krok `soubor` otisk nevyžaduje). Server soubor
nerozbaluje, takže ZIP bomba serveru neublíží; riziko nese ten, kdo soubor z Pipedrive otevře.
Mez B279 to vědomě přijímá („totéž umí ručně v Pipedrive“) — platí ovšem jen pro uživatele, kteří mají
v Pipedrive vlastní účet; zápis jde pod společným tokenem aplikace.

Návrh (levné zpřísnění, nemění chování pro poctivý Word): odmítnout data s `vbaProject` / `macroEnabled`
(vzor `src/sablona_obsah.js`), ověřit konec centrálního adresáře ZIP, a soubor přijmout až po zapsaných
polích (`pole.stav === 'zapsano'`), aby šel k dealu jen po potvrzení tabulky. Rozhodne J. V. v #759.

### R6 — po prvním pokusu o zápis se Word v paměti ztratí — NÍZKÁ

Čtením kódu: `odeslPdSoubor` váže Word na objekt `ZAK`. `odeslPdZapis` i `odeslPdPrilozUI` po pokusu volají
`onlineOtevri`, které `ZAK` vymění (`online_ui.js:1931`) → `odeslPdBlob` vrátí `null` a tlačítko
„Přiložit Word k dealu“ zmizí. Když se přiložení nepovede (502, 504, 413), nejde krok opakovat bez nového
vygenerování Wordu, ač hláška i hlavička souboru slibují opak.
Návrh: Word vázat na `ONLINE_STAV.soubor` + variantu + `zamek.kdy`; test „po neúspěchu tlačítko zůstává“.

### R7 — v důvodu chybějící fáze je jméno cizí proměnné — NÍZKÁ

P10: `PIPEDRIVE_FAZE_ODESLANO=99999` → řádek říká „fáze id 99999 (PIPEDRIVE_FAZE_PRODANO) v Pipedrive není“.
Sdílený `pdFazeNajdi` zná jen proměnnou prodeje. Správce by opravoval špatné nastavení.
Návrh: jméno proměnné předat v `konf` (např. `konf.promenna`).

### R8 — deal bez pole `status` se bere jako otevřený — NÍZKÁ

P10: bez `status` se fáze posune (22 → 23). Rozhodnutí „jen dopředu, vyhraný ponechá“ by mělo při
neznámém stavu fázi nechat. Návrh: přesun jen při `status === 'open'`, jinak „nelze“.

### R9 — nahrání proběhne, i když se stav `zahajeno` nezapsal — NÍZKÁ

`zaznamenej` po odemčení varianty (jiný `zamek.kdy`) tiše nic neuloží, `souborKrok` ale pokračuje
nahráním. Okno je krátké (odemčení mezi dvěma čteními). Návrh: prázdné razítko ze `zaznamenej` před
nahráním = 409 `zamekNeulozen`, nic nenahrávat.

### R10 — tělo do 6 MB se čte a parsuje i u náhledu a zápisu — NÍZKÁ

Kontrola 512 kB přijde až po `JSON.parse` celého těla. Jen pro přihlášené s právem, strop Netlify 6 MB.
Bez opravy; stačí test (mutace M16 přežila).

### R11 — dohledání souboru čte jen prvních 100 souborů dealu — NÍZKÁ

U dealu s více než 100 soubory se dřívější pokus nenajde → druhá kopie. Přijatelné, zapsat k B280.

### R12 — mezery v testech (vlastní mutace) — STŘEDNÍ pro CRM zápis

V oddělené pracovní kopii jsem pustil 12 mutací proti `test_po_116_odeslani.mjs` a `test_po_116_ui.js`.
Přežilo 11:

| Mutace | Co chybí v testech |
|---|---|
| M2 „kdo nabídku odeslal“ nesmí (jen autor) | kladný test: odeslal ≠ autor smí; autor, který neodeslal, smí |
| M3 záznam se připíše i po odemčení | test `zaznamenej` při jiném `zamek.kdy` |
| M4, M10 id poznámky se přenese na jiný deal | test změny dealu zakázky (druhou vrstvu drží `zapisDoPipedrive`) |
| M5 strop náhledu vypnut | test 429 u náhledu |
| M11 obnova ze souboru stav přebírá | test `pdOdeslaniDrz` pro obnovu ze souboru a z otisku |
| M12 smazaný deal nezastaví | test stavu `deleted` |
| M13 výhradní úsek dealu vypnut | test souběhu (dva zápisy / dva soubory naráz) |
| M14 poznámka se nezkracuje na 2000 znaků | test dlouhé poznámky (značka na konci zůstane) |
| M15 dohledání souboru bez velikosti | test: stejný název, jiná velikost = nový soubor |
| M16 kontrola 512 kB pryč | test 413 u náhledu |

K tomu chybí test escapování poznámky (test hlídá jen `<br>`; sonda P3 escapování potvrdila) a test R1.
Každý nový test s pojistkou podle CLAUDE.md.

## Prověřeno bez nálezu

1. **Práva a vazba.** `pdPristup` (přihlášení, cizí původ — P9 odmítnuto, právo `crm.pipedrive`), pak autor /
   kdo odeslal / vedoucí / administrátor. Deal id jen z uložené zakázky, z těla se nebere. Vazbu ověřuje
   sdílený `pdDealPatriZakazce` (bez vazby 409, „čeká“ nestačí, zrušená vazba nestačí). Cizí CN zastaví
   zápis polí (ne soubor — R1). Zámek i `zamek.zpracovatel` ověřuje a píše server při uložení (#665).
   Vypnutý `PIPEDRIVE_ZAPIS` → 503 dřív, než se sáhne na síť; druhá pojistka v `pdZavolej`.
2. **Data z prohlížeče.** Z těla jde jen `soubor`, `varianta`, `zamekKdy`, `akce`, `otisk`, popisky `zdroje`
   a `obsah` Wordu. Cenu, CN, pole KL, fázi, poznámku i název souboru skládá server. Parametr `stav` /
   `status` → 400. Text nad 255 znaků se neposílá (řádek „nezapíše se“ s důvodem, sdílený převod).
   Poznámka se escapuje (P3: `<img onerror>` a `<script>` v názvu varianty a jméně → `&lt;…&gt;`),
   řídicí znaky a konce řádků v polích se čistí. Karta v prohlížeči escapuje vše (`esc`, `dlgEsc`).
3. **Idempotence a souběh.** Opakovaný zápis: žádný další PATCH, poznámka beze změny. P6: dva zápisy naráz
   v jedné instanci → 1 PATCH, 1 poznámka, jeden 200 a jeden 409; dva soubory naráz → 1 soubor. Výpadek po zápisu polí:
   stav `pole zapsano / soubor chyba`, opakování projde. `zahajeno` nevisí — další pokus dohledá, nebo nahraje.
   Mezi instancemi výhradní úsek neplatí (B158, B280 — přijato).
4. **Fáze.** Jen dopředu podle `order_nr` v téže pipeline; stejná nebo pozdější ponechá; vyhraný ponechá;
   ztracený zastaví zápis polí; jiná pipeline nebo chybějící `order_nr` → fáze „nelze“, pole se zapíšou
   (P10). `status` se v PATCH neposílá nikdy.
5. **Osobní údaje.** Poznámka: jen titul a jméno zpracovatele, bez e-mailů a telefonů. Protokol: jen názvy
   zapsaných polí a pevné věty chyb. `pdOdeslani.duvod`: pevné věty. Surový text chyby Pipedrive jde jen
   v odpovědi tomu, kdo zapisoval (jako #597). Funkce nic neloguje.
6. **Zámek, cena, dokumenty.** Do výpočtu ani šablon dávka nesahá; kolo: SHODA 367 / 367.
   `pdOdeslani` píše jen server (`pdOdeslaniDrz`), kopie zakázky ho maže, pohled dalšího zákazníka ho nenese.
   Se zápisem prodeje sdílí převody a `pdProdejZmeny`; kolizi viz R3. Webhook: zápis mění jen pole dealu,
   odkaz na kalkulaci ani vazbu ne (čtením, bez samostatné zkoušky).

## Doporučený postup

1. Opravit R1 (+ test, mutace). Zvážit R2, R6–R9 v téže opravné dávce.
2. Doplnit testy podle R12.
3. J. V.: R3 (doplnit #760), R4 (nová otázka), R5 (#759).
4. Zkouška na deal TEST až po bodu 1 (strop těla Netlify, skutečné Files API).

---

# Dorevize oprav (24. 11. 2026, rozdíl `a605d5c..6ddd54e`)

## Verdikt dorevize: SLOUČIT

Všechny nálezy první revize jsou opravené a opravy drží. Zbývá jedno doporučení k R5 (**D1**), které
sloučení nebrání, ale doporučuji ho dodělat před zapnutím zápisu do skutečného Pipedrive.

## Co se spustilo

| Co | Výsledek |
|---|---|
| `bash nastroje/testovaci_kolo.sh --bez-mutaci --proti origin/claude/integrace-16-10` nad `6ddd54e` | hodiny 443 / 0, statické 12 / 12, porovnání S3 **SHODA 367 / 367**; sady 543 / **1 selhala** (`overit_zobrazeni.mjs`, 2 kontroly skryté karty v prohlížeči). Sada se dávky netýká, souběžně s kolem běžely moje mutace a sondy; samostatně hned poté prošla 3× ze 3 (159 OK, 0 FAIL). Kolo jako celek tedy v tomto sezení zelené nebylo — beru to jako kolísavý test pod zátěží, ne jako nález dávky (kolo dávky hlásí VŠE ZELENÉ) |
| `node netlify/test_po_116_odeslani.mjs` | 85 OK, 0 FAIL |
| `node src/test_po_116_ui.js` | 23 OK, 0 FAIL |
| Sondy proti simulátoru (Q1–Q9) a 15 podvržených ZIPů proti `pdOdeslaniDocx` | viz níže |
| Vlastní mutace (18 ks: 10 původních přeživších + 8 nových na opravy) | 17 zabito, 1 přežila (D4) |

44 mutací [PO] dávky jsem znovu nepouštěl.

## Stav nálezů

| Nález | Stav | Ověření |
|---|---|---|
| R1 soubor bez zastavení | opraveno | Q1: ztracený deal i cizí CN → 409 `zastaveno`, 0 souborů; mutace zabita |
| R2 stav po variantách, duplicitní soubor | opraveno | Q3–Q5: dvě varianty naráz → 1 PATCH (druhý 409 `zmeneno`), 1 poznámka, 2 různé soubory, opakování „už je“; nový zámek → nejdřív zápis, pak shoda názvu a velikosti, žádná kopie; starý zámek 409 |
| R3 prodaná / vyhraný deal | opraveno | Q6: deal `won` → 0 PATCH, hodnota beze změny, poznámka zapsána |
| R4 další zákazník | opraveno | test + mutace; viz poznámka D2 |
| R5 kontrola Wordu | zčásti | makra, OLE, ActiveX, neplatný ZIP odmítnuty; soubor až po zapsaných polích (Q2: 409 `nejdrivZapis`); zbývá D1 |
| R6 Word po znovuotevření | opraveno | čtením kódu |
| R7 jméno proměnné, R8 neznámý stav, R9 bez `zahajeno` | opraveno | čtením; mutace N7 zabita |
| R10, R11 | přijato | zapsáno k mezím |
| R12 testy | doplněno | všech 10 původních přeživších mutací teď zabito |

## Nové poznámky

### D1 — kontrola Wordu nehlídá vztahy; kontrola šablon je hlídá — STŘEDNÍ až NÍZKÁ, doporučuji dodělat

`pdOdeslaniDocx` si vede vlastní kratší seznam (názvy částí a `[Content_Types].xml`). Podvržené soubory:

| Soubor | `pdOdeslaniDocx` | kontrola šablon `sablonaObsahVady` |
|---|---|---|
| vztah `attachedTemplate` na vnější adresu (stažení cizí šablony s makry při otevření) | **projde** | odmítne |
| vztah `aFChunk` (vložený cizí dokument) | **projde** | odmítne |
| vnější odkaz `oleObject` | **projde** | odmítne |
| typ obsahu `vbaProject` v `[Content_Types].xml` kódovaném UTF-16, část přejmenovaná | **projde** | odmítne |
| název části `word/vba%50roject.bin` | **projde** | odmítne |
| `word/vbaProject.bin`, `embeddings/oleObject1.bin`, typ obsahu maker v UTF-8 | odmítne | odmítne |
| část bez přípony, vnořený ZIP v `word/media` | projde | projde (Word je nespouští) |

Q9: Word s vnější šablonou se po zapsaných polích k dealu skutečně přiložil (simulátor).
Vnější šablona je u `.docx` reálná cesta k makrům; ostatní řádky jsou spíš obcházení vlastního seznamu.
Kdo to může zneužít: jen oprávněný uživatel u vlastního dealu (mez B279), proto to sloučení nebrání.

Návrh: místo vlastního seznamu zavolat nad rozbalenými částmi `sablonaObsahVadyZipu` (týž kód jako
u šablon) a při jakékoli vadě soubor odmítnout. Vygenerovaná nabídka vzniká ze šablon, které touto
kontrolou prošly; doplnit test „vygenerovaný Word projde“ (v tomto sezení neověřeno — firemní šablony
tu nejsou) a mutaci.

### D2 — komu šel první tisk, říká prohlížeč — NÍZKÁ, přijatelné

Razítko `zamek.tisky[0].zakaznik` skládá server (`vzServerRazitka`), ale z id, které pošle prohlížeč;
tisk bez id = řídící. Upravený prohlížeč tak může tisk pro dalšího zákazníka vydávat za tisk řídícímu
a zastavení R4 obejít. Dosah: jen vlastní deal oprávněného uživatele a jen jeho vlastní záznam o tisku —
stejná třída jako B279 (obsah Wordu server také neověří). Id řídícího je stálé (`zak.vzRidici.id`),
výměna řídícího stará razítka nepřepíše. Zapsat k mezi B279, bez opravy.

### D3 — rozbalení až 64 MB před kontrolou práv k zakázce a stropem — NÍZKÁ

`pdOdeslaniDocx` běží po `pdPristup`, ale před čtením zakázky, kontrolou „kdo smí“ a stropem pokusů.
Strop rozbalení je sdílený se šablonami (B272: 64 MB celkem, 8 MB na část `.xml` / `.rels`); část bez
přípony `.xml` má jen strop 64 MB. Změřeno: 82 kB ZIP → 60 MB, asi 0,7–0,8 s na požadavek. Kdokoli
s právem `crm.pipedrive` to může opakovat bez stropu. Návrh: kontrolu Wordu přesunout za práva a strop
(do `zpracuj`), nebo zapsat k B272.

### D4 — test: nový zámek téže varianty = nový stav — NÍZKÁ

Mutace `pdOdeslaniVariantaStav` („jiný `zamekKdy` vrátí starý stav“) přežila. Chování je správně
(sonda Q4), chybí jen test s pojistkou.

### D5 — Word z ještě neuložené zakázky se nezapamatuje — NÍZKÁ

`odeslPdSoubor` Word zahodí, když zakázka ještě nemá `ONLINE_STAV.soubor`. U zakázky z webhooku to
nenastane; u ručně založené a navázané až později se Word nepřiloží (karta tlačítko nenabídne, jde
vygenerovat znovu). Bez opravy, stačí vědět.
