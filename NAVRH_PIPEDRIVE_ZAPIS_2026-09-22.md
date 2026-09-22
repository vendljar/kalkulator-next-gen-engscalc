# Zápis do Pipedrive — podmínky API a plán dalších kroků

**22. 9. 2026, nad v21.9.16.** Podklad k roadmapě #16 (CRM-12) a jejím dílčím
položkám #113 až #117, které jsou od 10. 8. 2026 odsunuté.

Zadání: *„načti si podmínky nastavení API s Pipedrive, do kterého budeme
zasílat některé informace — naplánuj, co bude potřeba a jaké mají být další
kroky."*

**Rozhodnutí J. V. z 22. 9. 2026** (druhé kolo) jsou zapracovaná v §4 a určují
celý §5 a §6.

---

## 1) Odkud jsou podmínky vzaté

Odkaz `https://developers.pipedrive.com/docs/api/v1/openapi-v2.yaml` **nešel
z tohoto prostředí stáhnout** — doménu `developers.pipedrive.com` odmítá
výstupní proxy (403 na CONNECT). Nechtěl jsem kvůli tomu psát plán z paměti,
tak jsem podmínky vytěžil ze tří zdrojů, které se navzájem kontrolují:

1. **Vlastní text specifikace** — J. V. ho 22. 9. 2026 vložil ručně poté,
   co doménu odmítla proxy. **Ověřeno proti oficiálnímu SDK `pipedrive@33.7.0`
   z npm** (generovanému generátorem OpenAPI z téže specifikace, verze
   dokumentu 2.0.0): **85 cest v obou, nula rozdílů v obou směrech.**
   Vložený text je tedy úplný a aktuální; od té chvíle je hlavním zdrojem
   a SDK jen kontrolou.
2. **Změnový log a znalostní báze Pipedrive** na dvě věci, které v OpenAPI
   nejsou: termín konce podpory v1 a způsob počítání denního rozpočtu tokenů.
3. **Skutečný účet ENGINEERS CZ** — přes připojený konektor Pipedrive
   (jen čtení) jsem si ověřil pipeline a fáze, viz §6.1. Doplňuje to audit
   z 9. 8. 2026 zapsaný v `netlify/lib/pd_mapa.mjs` (308 dealů, 1 820
   organizací).

> **Doplněno 22. 9. 2026:** vložená specifikace nese u každé operace
> `x-token-cost`, takže poslední odhadovaný údaj je nahrazený přesným —
> viz §3.3 a §3.5. Zároveň to opravilo pět čísel v našich vlastních
> komentářích, viz §3.6.

---

## 2) Co už v aplikaci je (a co z toho plyne)

Napojení **není zelená louka**. Hotová a otestovaná je celá čtecí polovina
(roadmapa #112, dodáno ve v9.8.2):

| soubor | co dělá |
|---|---|
| `netlify/lib/pipedrive.mjs` | klient: token z prostředí, hlavička `x-api-token`, stránkování kurzorem, opakování při 429 s couváním 1–2–4 s, překlad stavových kódů do českých vět |
| `netlify/lib/pd_mapa.mjs` | mapa vlastních polí podle **názvu** (hashe v kódu nejsou), překlad dealu na pole kalkulačky, dopočet konečné faktury |
| `netlify/functions/pd_pole.mjs` | `GET /api/pd/pole` — mapa polí s denní cache, obnovení jen administrátor |
| `netlify/functions/pd_dealy.mjs` | `GET /api/pd/dealy` — seznam případů, 90s cache, filtr na serveru |
| `netlify/functions/pd_deal.mjs` | `GET /api/pd/deal?id=` — detail přeložený do hlavičky a krycího listu |
| `netlify/test_pipedrive.mjs` | sada proti náhradnímu `fetch` (běží v `spust_testy.sh` globem `../netlify/test_*.mjs`) |

Tři věci z toho jsou pro zápis důležité:

- **Architektura už stojí správně.** Token žije jen v proměnné prostředí
  a nikdy nejde do prohlížeče; zápis se na tu samou vrstvu jen navěsí.
- **Zápis nemá ani řádek.** Klient `pdZavolej()` sice umí `metoda` i `telo`,
  ale žádná funkce toho nevyužívá, `pd_soubor.mjs` neexistuje a v `src/`
  není k Pipedrivu jediné tlačítko.
- **Krycí list už umí vydat sám sebe ve verzi Backoffice.**
  `kryciData(zak, varianta, jekly, 'bo')` vrátí hotové sekce a řádky
  a registr dokumentů zná `kryci_bo`, který z nich udělá `.docx`.
  **To je pro §5 klíčové** — nic se nepřepisuje, jen se použije.

---

## 3) Podmínky API pro zápis

### 3.1 Autentizace

- **API token** v hlavičce `x-api-token` — to, co používáme. Token dává
  přístup ke **všem** datům toho uživatele, proto jen na serveru.
- **OAuth2** je pro nás zbytečná složitost, ale jeho scopes ukazují, **jaká
  práva musí mít účet, pod kterým token vyrobíš**:

| operace | potřebné právo |
|---|---|
| zápis do dealu, poznámky, soubory | `deals:full` |
| osoby a organizace | `contacts:full` |
| aktivity | `activities:full` |
| **změna definic polí, webhooky** | `admin` |

Prakticky: účet **bez práv správce** zvládne všechno, co plánujeme.
**Nová vlastní pole podle §5.2 ale musí někdo založit — a to je práce pro
správce v CRM, ne pro aplikaci** (viz §7.2).

### 3.2 Verze API — kde se smí co

**Vybrané endpointy v1 jsou od 1. srpna 2026 mimo podporu** (hranice byla
31. 7. 2026) a mohou zmizet bez varování. Kontrola v SDK 33.7.0 potvrzuje
rozdělení:

- **v2 má** deals, persons, organizations, activities, dealFields,
  itemSearch, deal-products, deal-discounts, pipelines, stages, users.
- **v2 nemá vůbec** — a proto zůstávají v1 — **files, notes a webhooks**.
  Nejsou na seznamu zastaralých, takže je používat smíme; je to vědomý,
  ohlídaný ústupek.
- **Leads má v2 jen zpola:** `/leads/search` a převod na deal
  (`/leads/{id}/convert/deal`) ano, ale **založení, čtení a úprava leadu
  v2 nejsou** — na ty je pořád v1. Nás se to netýká (§4, rozhodnutí E:
  požadavek je deal, ne lead), ale kdyby se to někdy měnilo, je to past.

Pravidlo do kódu: **cokoli, co má v2, jde přes v2. v1 jen pro soubor,
poznámku a webhook.**

### 3.3 Endpointy, které budeme potřebovat

| co posíláme | volání | verze | cena | právo |
|---|---|---|---|---|
| částka, měna, fáze, strukturovaná pole | `PATCH /api/v2/deals/{id}` | v2 | **5** | `deals:full` |
| poznámka (krycí list BO jako tabulka) | `POST /api/v1/notes` | v1 | — | `deals:full` |
| přílohy (.docx nabídky a krycího listu) | `POST /api/v1/files` (multipart, `deal_id`) | v1 | — | `deals:full` |
| schválená sleva jako *deal discount* | `POST /api/v2/deals/{id}/discounts` | v2 | **5** | `deals:full` |
| kontrola definic polí | `GET /api/v2/dealFields` | v2 | **10** | `deals:read` stačí |
| odběr změn z CRM (později) | `POST /api/v1/webhooks` | v1 | — | `admin` |

Ceny (`x-token-cost`) jsou z vložené specifikace; u v1 je neuvádí, protože
vložený text je **jen v2**. Pro úplnost ceny čtení, které už děláme:
`GET /deals` **10** · `GET /deals/{id}` **1** · `GET /deals/archived` **20** ·
`GET /deals/search` **20** · `GET /organizations/{id}` **1** ·
`GET /persons/{id}` **1** · `GET /stages` **5** · `GET /pipelines` **5**.

`POST /api/v1/notes` bere `content` (HTML), `deal_id` a volitelně
`pinned_to_deal_flag` — poznámka tedy jde **připíchnout nahoru**, což je pro
Backoffice to správné chování.
`POST /api/v1/files` bere `file` (multipart) a `deal_id`.

### 3.4 Tvar dat — čtyři věci, které se dají udělat špatně

1. **`PATCH` je částečná aktualizace.** Co nepošlu, se nemění. Posílat **jen
   skutečně změněná pole** — kolize dvou lidí se tím zúží na tentýž údaj.
2. **Vlastní pole jdou v objektu `custom_fields`**, klíč je čtyřicetiznakový
   hash. Dvě pasti přímo z dokumentace:
   - **vymazání hodnoty = `null`**;
   - u vícevýběru (`set`) **prázdné pole `[]` neprojde** a vrátí chybu
     validace — smazat jde taky jen `null`.
3. **Typ pole určuje tvar hodnoty.** `double` → číslo · `varchar`/`text` →
   řetězec · `date` → `YYYY-MM-DD` · `monetary` → číslo + měna ·
   `org`/`people` → ID · **`enum`/`set` → ID volby, ne popiska.**
   Čtecí strana si dnes bere popisku přes `include_option_labels=true`
   a `pdHodnota()` ji rozbalí; **zpátky ale musí jít ID**. `pdMapaZPoli()`
   si seznam `options` už ukládá (`volby`), jen to zatím nikdo nečte.
4. **Standardní pole nejsou v `custom_fields`.** `value`, `currency`,
   `stage_id`, `status`, `expected_close_date` se posílají v kořeni těla.

### 3.5 Limity

- **Denní rozpočet tokenů** sdílí celá firma: `30 000 × násobič plánu ×
  počet míst`, reset po 24 hodinách; vyčerpání = 429 až do resetu.
- **Cena je za POŽADAVEK, ne za volání naší funkce.** `pdVsechny()` projde až
  deset stránek, takže jedno natažení seznamu stojí až `10 × 10 = 100` tokenů,
  ne deset. Tohle je nejdůležitější důsledek — a přesně to má dnes v kódu
  napsané špatně (§3.6).
- **Větší stránka je pořád levnější než víc malých**, protože cena na velikosti
  stránky nezávisí. Strop Pipedrive je 500, my bereme 200 — úvaha v kódu platí
  dál, jen s jiným číslem.
- **Zápis je levný.** Jeden kompletní zápis podle §5 = `PATCH` (5) + poznámka
  + dvě přílohy, tedy řádově jednotky až desítky tokenů. Proti jednomu
  natažení seznamu (až 100) je to zanedbatelné.
- **Specifikace nedokumentuje 429 ani `Retry-After`** — v celém textu žádná
  taková odpověď není. Naše couvání 1–2–4 s po svém tedy zůstává správně.
- **Počet vlastních polí je omezený podle tarifu** (řádově desítky na nižších,
  stovky na vyšších). Další důvod pro §5.2 — sto dvanáct nových polí by byl
  problém i tam, kde by se technicky vešla.

### 3.6 Co vložená specifikace opravila v našem kódu

Pět komentářů nese čísla z v1 (dvojnásobná) a jeden navíc zaměňuje cenu za
požadavek s cenou za volání. **Kód se chová správně, čísla v komentářích ne** —
kdo by podle nich plánoval rozpočet, spočítá to špatně oběma směry:

| kde | je napsáno | ve skutečnosti |
|---|---|---|
| `netlify/lib/pipedrive.mjs:29` | seznam stojí 20 tokenů | **10** |
| `netlify/functions/pd_deal.mjs:14` | dva dotazy po 2, načtení dealu 6 | **po 1, celkem 3** |
| `netlify/functions/pd_dealy.mjs:13` | hledání 40 (dvojnásobek seznamu) | **20** — poměr sedí, absolutní číslo ne |
| `netlify/functions/pd_dealy.mjs:47` | 10 stránek ≈ 20 tokenů | **až 100** (10 × 10) |
| `netlify/functions/pd_pole.mjs:8` | seznam polí 20 tokenů | **10** |

**Opraveno 22. 9. 2026** (commit `3d8dcea`): mění se jen komentáře, chování
ne; `test_pipedrive` 71/71, `test_funkce` 210/210.

### 3.7 Podle hodnoty vlastního pole se v seznamu filtrovat NEDÁ

Nález z vložené specifikace, který má přímý dopad na §6.2. `GET /deals` zná
parametry `filter_id`, `ids`, `owner_id`, `person_id`, `org_id`, `pipeline_id`,
`stage_id`, `status`, `updated_since/until` — **ale žádný parametr na hodnotu
vlastního pole**. Parametr `custom_fields` říká jen, která pole se mají vrátit
(max 15 klíčů), ne podle čeho filtrovat.

A hledání to nezachrání: `/deals/search` umí vlastní pole, ale **jen typy
`address`, `varchar`, `text`, `varchar_auto`, `double`, `monetary` a `phone`.
Typ `enum` mezi nimi NENÍ.** Příznak požadavku z §6.2 je přitom navržený jako
`enum`.

Zbývají dvě cesty a obě jsou v pořádku:

1. **Uložený filtr v Pipedrive** („Stav kalkulace = Zadáno") a pak
   `GET /deals?filter_id=…` za 10 tokenů. Čisté a levné — **filtr ale musí
   někdo v CRM založit, takže to patří na seznam pro integrátora.**
2. **Filtrovat u nás** nad seznamem, který už stahujeme a 90 s držíme v cache
   (`pd_dealy.mjs`). Funguje bez jakéhokoli zásahu v CRM a je to přesně to, co
   kód dnes dělá s textovým hledáním.

*Návrh: viz §3.8 — s webhookem se seznam u nás nefiltruje vůbec, protože
požadavky chodí samy.* Kdyby se místo `enum` zvolil `varchar`, šlo by hledat
i přes `/deals/search` — ale text se překlepne a výběr ne, takže `enum` je
pořád lepší volba.

### 3.8 Skutečné náklady přenosu — a kde se opravdu šetří

**Nejdřív narovnat, co stojí sto tokenů.** Sto není přenos. Je to teoretický
strop **čtení celého seznamu dealů** (deset stránek po deseti) a platí se jen
při vypršení 90s cache; při 308 dealech jsou to reálně 1–2 stránky, tedy
10–20. **Přenos** — zápis řídící varianty do dealu — stojí:

| krok | volání | tokenů |
|---|---|---|
| načíst deal pro potvrzovací tabulku | `GET /deals/{id}?custom_fields=<jen naše hashe>` | 1 |
| zapsat strukturovaná pole — **všechna najednou, bez ohledu na počet** | `PATCH /deals/{id}` | 5 |
| poznámka s krycím listem BO | `POST /v1/notes` | v1 — ve vložené specifikaci není; podle změnového logu řádově 10 |
| příloha krycí list `.docx` | `POST /v1/files` | v1 — totéž |
| příloha nabídka `.docx` | `POST /v1/files` | v1 — totéž |
| **celkem za jeden přenos** | | **6 + tři zápisy v1 ≈ 30–40** |

Proti rozpočtu `30 000 × násobič × počet míst` — i nejmenší představitelný
(Lite, 3 místa) je 90 000 denně — je jeden přenos **čtyři setiny procenta
dne**. Přenos tedy není místo, kde se šetří. Dvě věci z toho plynou:

- **Počet přenášených polí cenu nemění.** `PATCH` stojí 5, ať nese jedno pole
  nebo dvacet. To, že **nativní údaje neposíláme** (obchodník = vlastník
  dealu, název akce a číslo CN = titulek, zákazník/IČO/sídlo = organizace,
  kontakt = osoba, adresa stavby = existující vlastní pole), je správně kvůli
  **duplicitě dat**, ne kvůli tokenům — viz §5.2, kde jsou vyjmenované.
- **Kde se šetří, je čtení** — a hlavně to, které §6.2 přidává: hlídání
  požadavků. Dnešní návrh (kalkulačka se ptá na seznam a filtruje *Zadáno*)
  znamená 10–20 tokenů pokaždé, když někdo otevře kartu po vypršení cache.
  Za den při pěti obchodnících klidně stovky tokenů — pořád zlomek rozpočtu,
  ale zbytečný a hlavně **opožděný** (90 s).

#### Push místo pull: Pipedrive nám změny pošle sám

**Webhook** — v1 (v2 protějšek nemá, na seznamu zastaralých není), výchozí
verze 2.0 od 17. 3. 2025 posílá deal **ve stejném tvaru jako v2 API**, takže
mu naše `pd_mapa.mjs` rozumí bez úprav. Zakládá se **ručně v Pipedrive**
(Nastavení → Nástroje → Webhooky, právo správce má integrátor): **na jeho
straně žádný kód, na naší straně žádný dotaz do API.**

| krok | co se stane | tokenů |
|---|---|---|
| 1 | Integrátor založí webhook: `event_object = deal`, `event_action = change` (a `create`), `subscription_url = https://<web>/api/pd/webhook`, HTTP Basic auth (heslo = nová proměnná `PIPEDRIVE_WEBHOOK_HESLO` v Netlify), `user_id` = správce — jinak webhook posílá jen to, k čemu má daný uživatel přístup | 0 |
| 2 | Nová `netlify/functions/pd_webhook.mjs`: ověří Basic auth proti proměnné (`timingSafeEqual` jako u B22), cokoli jiného → 401; z těla vezme `data` (deal v2) a přečte `Stav kalkulace`; je-li *Zadáno*, zapíše záznam do úložiště `pd_pozadavky` (klíč = id dealu, hodnota = hlavička přes `pdDealNaNase` + čas); jinak záznam smaže. Odpoví 200 hned — Pipedrive při chybě opakuje | 0 |
| 3 | Karta *Požadavky z Pipedrivu* čte **z našeho úložiště** (`GET /api/pd/pozadavky`) | **0** |
| 4 | **Smyčka:** náš vlastní `PATCH` vyvolá webhook zpátky. Pozná se podle `meta.user_id` = účet integrace → ignorovat. **Další důvod pro samostatný účet z otázky A** | 0 |
| 5 | **Záchranná síť:** tlačítko *Srovnat s Pipedrive* (vedoucí/admin) — `GET /deals?updated_since=<čas posledního webhooku>&custom_fields=<hash stavu>` dorovná, co webhook zmeškal (výpadek, vypnutý webhook). Ručně, nebo jednou za noc z `zaloha_nocni.mjs`, která už běží | 10 / den |

Výsledek: **hlídání požadavků 0 tokenů denně** místo stovek, požadavek je
v kalkulačce **do vteřiny** místo do 90 s, a z #117 (souběh a synchronizace)
je tím hotová polovina práce rovnou — webhook byl tam stejně plánovaný, jen
se posouvá dřív, protože je to nejlevnější způsob, jak požadavky vůbec vidět.

#### Co jde srazit na zápisu (kdyby na tom někdy záleželo)

- **Nabídka `.docx` jako příloha volitelně** (zaškrtávátko u odeslání) — je
  největší a Backoffice ji nutně nepotřebuje, když má krycí list.
- Poznámka + krycí list `.docx` = to, co Backoffice chce. Nechat.
- `GET /deals/{id}` před zápisem stojí 1 token a nese potvrzovací tabulku —
  vyplatí se. S webhookem máme aktuální stav i v úložišti, ale za 1 token bych
  ho pro jistotu četl z Pipedrive dál: potvrzuje se proti CRM, ne proti kopii.

---

## 4) Rozhodnutí J. V. (22. 9. 2026)

| | otázka | rozhodnutí |
|---|---|---|
| **A** | token a doména v Netlify | *(zatím neodpovězeno — pořád blokuje)* |
| **B + C + D** | které údaje se posílají | **pole pro Back Office z krycích listů zakázky OCK a PROJ** |
| **E** | zakládají se z kalkulačky nové případy? | **Ne — opačný směr:** v Pipedrive vznikne **požadavek**, ten v kalkulačce **vynutí založení nové kalkulace**; nad ní vznikají varianty a do Pipedrive se propisuje ta, která je označená jako **řídící** |
| **F** | kdo smí zapisovat | podle návrhu: nové právo `crm.zapis`, výchozí zapnuté pro obchodníka i výš |

Rozhodnutí B+C+D odpovědělo i na dvě otázky, které visely od 10. 8. 2026:
**názvy čtyř neznámých polí ani osud sedmi nedopsaných polí už nejsou
blokátorem zápisu** — nebudeme do nich psát. Zůstávají otázkou pro **čtení**
(#114), kde jde jen o to, aby se krycí list předvyplnil správně.

---

## 5) Co se přenáší — pole Back Office z krycích listů

### 5.1 Kolik toho je (a proč to mění návrh)

Spočítal jsem to přímo ze zdrojáků (`src/kryci.js`, `src/kryci_proj.js`,
pole s `verze` obsahující `'bo'`):

| | počet |
|---|---|
| krycí list **OCK** | **71** polí pro Back Office |
| krycí list **PROJ** | **91** polí pro Back Office |
| společných id (stejné pole v obou) | 50 |
| jen OCK | 21 |
| jen PROJ | 41 |
| **unikátních polí celkem** | **112** |

Typově: převážně text, k tomu 12 přepínačů Ano/Ne, 11 dat, 8 delších textů,
2 sazby DPH a 2 odkazy.

**Sto dvanáct vlastních polí na dealu je špatná odpověď**, i kdyby se
tarifně vešla. Tři důvody:

1. **Většina těch polí nejsou údaje o obchodním případu.** Zhotovitel, jeho
   IČO, sídlo a bankovní spojení jsou naše konstanty. Osm splátek SoD
   projekce, plná moc a podpisové doložky jsou podklady pro dokument, ne
   data k filtrování.
2. **Část patří na jinou entitu.** IČO, DIČ, sídlo, banka a kontakty jsou
   v Pipedrive vlastnosti **organizace a osoby**, ne dealu. Zdvojit je na
   deal znamená mít je v CRM dvakrát a pokaždé jinak.
3. **Backoffice nepotřebuje sto dvanáct políček — potřebuje krycí list.**
   A ten už umíme vydat: `kryciData(…, 'bo')` vrátí přesně verzi Backoffice
   a registr dokumentů z ní udělá `.docx`.

### 5.2 Navržené rozdělení do tří vrstev

**Vrstva 1 — strukturovaná pole dealu (to, podle čeho se filtruje a reportuje).**
Návrh ~18 údajů, z nichž **šest už v CRM existuje** (audit 9. 8. 2026), takže
nově se zakládá **zhruba deset polí**:

| údaj z krycího listu | kam | stav v CRM |
|---|---|---|
| `hodnotaBezDph` | `value` + `currency` (standardní pole) | je |
| `splatnostDni` | vlastní pole | **je** |
| `zaloha1` / `zaloha` (PROJ) | vlastní pole | **je** |
| `faktura2` | vlastní pole | **je** |
| `zarukaMesicu` | vlastní pole | **je** |
| `pokutaDodavka` / `pokutaTermin` | vlastní pole | **je** |
| `zadrzne` + `zadrzneProc` | vlastní pole | **je** |
| `terminDodani` (OCK) / `terminDps` (PROJ) | vlastní pole (`date`) | **je** |
| `platnostNabidky` | vlastní pole | nové |
| `sazbaDph` + `platceDph` | vlastní pole | nové |
| `typSmlouvy` | `enum` (Naše bez úprav / Naše s úpravami / Cizí) | nové |
| `typProduktu` | vlastní pole | ověřit („Typ zakázky") |
| `typProjektu` | `enum` (Novostavba / Rekonstrukce) | nové |
| **služební:** druh kalkulace | `enum` (OCK / PROJ / OCK+PROJ) | nové |
| **služební:** řídící varianta | text (název varianty) | nové |
| **služební:** kalkulace zapsána | `date` | nové |
| **služební:** stav požadavku | `enum` (viz §6.2) | nové |

`fakturaKonc` se **neposílá** — dopočítává se do sta procent a v CRM pro něj
pole není (`pdZbytekDoSta()` to už umí oběma směry).

**Vrstva 2 — organizace a osoba** (IČO, DIČ, sídlo, banka, účet, zápis
v rejstříku, kontakty, zástupci). *Návrh: zatím **nezapisovat**, jen ukázat
rozdíly.* Důvod je rozhodnutí #162: dokud Pipedrive neumí vytěžovat ARES, je
přesnější karta zákazníka v kalkulátoru — a přepisovat CRM méně spolehlivým
zdrojem je krok zpátky. Až se to otočí, je to malá změna.

**Nativní pole se nepřenášejí vůbec** (rozhodnutí J. V. 22. 9. 2026) — jsou
v Pipedrive už dnes a jsou tam zdrojem, ne cílem. Vynechávají se jak
z `PATCH`, tak z poznámky ve vrstvě 3:

| pole krycího listu | kde v Pipedrive je |
|---|---|
| `obchodnik` | vlastník dealu (`owner_id`) |
| `nazevAkce`, `cisloCN` | titulek dealu (`title` — „CN-123 Název") |
| `zakaznik`, `ico`, `adresaZakaznik` | organizace (název, vlastní pole IČO, adresa) |
| `jmenoPrijmeni`, `kontaktZakaznikTel`, `kontaktZakaznikEmail` | osoba (jméno, telefony, e-maily) |
| `adresaStavby` | existující vlastní pole dealu (audit 9. 8. 2026) |
| celá sekce **Dodavatel (naše firma)** | není v CRM, ale je to **naše konstanta** — do CRM nepatří |

Poznámka ve vrstvě 3 tím zhubne zhruba na **55 řádků (OCK) / 75 (PROJ)**.
Na ceně to nic nemění (poznámka stojí stejně, ať je dlouhá jak chce), ale
Backoffice nedostane dvakrát totéž a nic se nerozejde s tím, co je na dealu.

**Vrstva 3 — celý krycí list Backoffice jako poznámka a příloha.**
Tohle je jádro odpovědi na B+C+D:

- **Poznámka** (`POST /api/v1/notes`, připíchnutá nahoru): HTML tabulka
  sestavená z `kryciData(zak, varianta, jekly, 'bo')` — tedy **všech 71
  (OCK) nebo 91 (PROJ) polí**, ve stejných sekcích a se stejnými popisky,
  jaké Backoffice zná z Wordu. Vyplní se v CRM sama, je vidět na první
  obrazovce dealu a dá se v Pipedrive fulltextem hledat.
- **Přílohy** (`POST /api/v1/files`): `.docx` **krycího listu ve verzi
  Backoffice** (`kryci_bo` z registru dokumentů) a `.docx` **cenové nabídky**.

Výsledek: Backoffice má v Pipedrive **všechno**, hledatelné i tisknutelné,
za cenu **deseti nových polí** místo sto dvanácti.

> Kdybys chtěl přesto některá další pole jako strukturovaná (protože se podle
> nich v CRM filtruje nebo se z nich dělá report), stačí je vyjmenovat —
> přesunout pole z vrstvy 3 do vrstvy 1 je práce na minuty. Opačně to neplatí:
> jednou založené pole v CRM už tam zůstane.

---

## 6) Tok: požadavek → kalkulace → řídící varianta → Pipedrive

### 6.1 Jak dnes vypadá pipeline (ověřeno 22. 9. 2026)

Jediná pipeline (`pipeline_id: 1`), pět fází:

| poř. | fáze | id | pravděpodobnost |
|---|---|---|---|
| 1 | Zkontaktováno | 22 | 10 % |
| 2 | Nabídka odeslána | 23 | 20 % |
| 3 | Vyjednávání | 24 | 50 % |
| 4 | Před podpisem | 25 | 75 % |
| 5 | Vyhrané k podpisu SoD | 26 | 90 % |

**Fáze „Požadavek" neexistuje.** Musí se tedy rozhodnout, čím se požadavek
v CRM pozná (§8, otázka G).

### 6.2 Navržený životní cyklus

Požadavek je **deal** s vlastním polem `Stav kalkulace` (`enum`), které
prochází třemi hodnotami. Nový je jen ten příznak — pipeline ani fáze se
nemění, takže se nerozbijí trychtýř ani reporty:

| stav | kdo ho nastaví | co znamená |
|---|---|---|
| **Zadáno** | člověk v Pipedrive | požadavek na kalkulaci; kalkulačka ho nabízí |
| **Vyřizuje se** | kalkulačka při založení zakázky | někdo na tom dělá (brání dvojímu zpracování) |
| **Vyřízeno** | kalkulačka po zápisu řídící varianty | v dealu je aktuální řídící varianta |

**Kroky:**

1. **V kalkulačce přibude seznam požadavků** — karta *Požadavky z Pipedrivu
   (n)*. **Čte se z našeho úložiště `pd_pozadavky`, které plní webhook**
   (§3.8) — 0 tokenů, aktuální do vteřiny. Do Pipedrive se na seznam ptá jen
   záchranné *Srovnat s Pipedrive* (10 tokenů, `updated_since`). Podle hodnoty
   vlastního pole Pipedrive filtrovat neumí a `enum` není ani vyhledatelný
   (§3.7), takže tohle je zároveň jediná cesta, jak požadavky dostat levně.
2. **Klik na požadavek založí NOVOU zakázku.** Nikdy se nepřipojí
   k otevřené — to je to „vynutí" ze zadání. Hlavička se předvyplní z dealu
   (funkce `/api/pd/deal` už to celé umí) a do zakázky se uloží vazba
   `ZAK.pdDealId`.
3. **Pojistka proti dvojímu zpracování:** když už v rejstříku zakázka
   s tímhle `pdDealId` je, aplikace to řekne a nabídne **otevřít ji**, místo
   aby založila druhou. (Rejstřík dostane index podle `pdDealId` — stejný
   princip jako dnešní hlídání duplicitního čísla nabídky.)
4. **Varianty vznikají volně**, do CRM se nepropisuje nic.
5. **Označení řídící varianty** (`varRidici()`, dnes zaškrtávátko v seznamu
   variant a tlačítko v liště) **nabídne zápis** — v liště se rozsvítí
   *„řídící varianta se změnila — odeslat do Pipedrivu"*.
6. **Zápis se odesílá kliknutím, ne sám.** Nejdřív se ukáže tabulka
   **pole / v CRM je / zapíšeme**, pak teprve `PATCH` + poznámka + přílohy.
   Proč ne automaticky: řídící variantu si člověk označuje i pro vlastní
   porovnání a tichý zápis by posouval čas poslední změny dealu — což
   rozbíjí pozdější synchronizaci (#117).
7. **Změna řídící varianty později** přepíše pole dealu a **přidá novou
   poznámku**; stará zůstane. Deal tedy nese vždy aktuální stav a poznámky
   drží historii.
8. **Po zápisu se hlídá rozjetí:** když se krycí list po zápisu změní,
   v liště svítí *„zapsáno v 14:12, od té doby se krycí list změnil"*.

### 6.3 Co se tím mění proti původnímu plánu

Původní #113 počítalo s tím, že si obchodník deal **vyhledá** v seznamu.
Nově je vstupním bodem **požadavek** — seznam podle příznaku. Ruční hledání
má smysl nechat jako druhou cestu (dopočet víceprací u starého případu), ale
hlavní tok je požadavek.

---

## 7) Navržené další kroky

### 7.1 Pořadí

**D‑1 — Odblokování (tvoje strana, bez kódu).**
Nastavit `PIPEDRIVE_TOKEN` a `PIPEDRIVE_DOMENA` v Netlify (postup
v `NASAZENI_NETLIFY.md`), dát *Trigger deploy* a v Nastavení spustit
`/api/pd/pole?obnovit=1`. Tím se proti **živému** účtu poprvé ověří čtecí
vrstva z 9. 8. a vypadne z toho aktuální seznam polí — podklad pro D‑2.

**D‑2 — Vlastní pole v CRM (tvoje strana, podle §5.2).**
Založit ~10 nových polí dealu včetně `Stav kalkulace`. **Dělá to člověk
v Pipedrive, ne aplikace** — vyžadovalo by to právo `admin` a tvar CRM patří
do CRM. Kalkulačka bude umět **říct, které pole chybí**, a poslat zbytek.

**D‑3 — Požadavky a založení zakázky (#113 + nové).**
Nová `netlify/functions/pd_webhook.mjs` (příjem změn z Pipedrive, Basic auth,
zápis do `pd_pozadavky`, ignorování vlastních zápisů) a `GET /api/pd/pozadavky`
(čtení z úložiště, 0 tokenů). Karta *Požadavky z Pipedrivu*, založení nové
zakázky z požadavku, vazba `ZAK.pdDealId`, pojistka proti dvojímu zpracování,
přepnutí stavu na *Vyřizuje se*. Záchranné *Srovnat s Pipedrive* přes
`updated_since`. **Na straně integrátora:** založit webhook (§3.8, krok 1)
a v Netlify přibude proměnná `PIPEDRIVE_WEBHOOK_HESLO`.

**D‑4 — Potvrzený zápis řídící varianty (#115).**
Nová `netlify/functions/pd_zapis.mjs` (`POST /api/pd/zapis`): server si deal
načte znovu → sestaví tabulku *pole / v CRM je / zapíšeme* → obchodník
potvrdí → `PATCH` **jen se změněnými poli** + poznámka s krycím listem BO.
Ochrana proti souběhu přes `update_time` proti času při načtení (stejný
princip jako `ocekavaneRazitko` u zakázek, nález B10). Právo `crm.zapis`.

**D‑5 — Přílohy (#116).**
Nová `netlify/functions/pd_soubor.mjs`: `.docx` vzniká v prohlížeči, takže
půjde na server a odtud multipartem na `POST /api/v1/files` s `deal_id`.
**Pozor na strop velikosti požadavku** — server má dnes strop 2 MB (nález
B12) a Pipedrive maximální velikost přílohy nedokumentuje. Než se to začne
psát, změřit skutečnou velikost nabídky i krycího listu; náhradní cesta je
generovat `.docx` rovnou na serveru.

**D‑6 — Souběh a zpětná synchronizace (#117).**
Webhook z D‑3 už chodí, takže tady zbývá jen druhá polovina: změny v CRM
u **navázaného** dealu (částka, podmínky) ukázat v kalkulačce jako rozdíl
proti zapsané řídící variantě, ne je tiše přebírat. Smyčka je ošetřená
v D‑3 (`meta.user_id` = účet integrace) — **další důvod pro samostatný účet
pro integraci.**

### 7.2 Co vědomě NEDĚLÁME

- **Nezakládáme vlastní pole z aplikace.** Potřebuje `admin` a tvar CRM
  patří do CRM. Když pole chybí, aplikace to **řekne** a pošle zbytek.
- **Nepřebíráme cenu z CRM do výpočtu.** `hodnotaCrm` je jen pro porovnání
  *„v CRM je X, spočítali jste Y"*. Směr je jednosměrný: kalkulace → CRM.
- **Nezapisujeme vrstvu 2** (IČO, sídlo, kontakty) — viz §5.2.
- **Nezakládáme dealy z kalkulačky** (rozhodnutí E).
- **Žádné tiché zápisy na pozadí.**

### 7.3 Testy, bez kterých se to nenasadí

- `netlify/test_pipedrive.mjs` o **zápisovou větev** proti náhradnímu
  `fetch`: posílají se jen změněná pole · `enum` se posílá jako ID volby ·
  prázdný `set` nejde `[]` · neshoda `update_time` zápis **zastaví** ·
  chybějící pole v CRM se ohlásí a zbytek projde · 429 couvá · token se
  neobjeví v adrese.
- Nová sada na **sestavení poznámky z krycího listu BO** — že se počty polí
  shodují s `kryciData(…, 'bo')` a že přejmenování sekce poznámku tiše
  nevyprázdní (stejná past, jakou hlídá `test_nabidka_podminky.js`).
- `netlify/mutace.mjs` — nové cíle na právo `crm.zapis` a na kontrolu
  souběhu.
- `netlify/test_prava.mjs` — `crm.zapis` napříč rolemi.
- Harness `overit_*.mjs` na kartu požadavků a na dialog potvrzení zápisu.

---

## 8) Co ještě potřebuju rozhodnout

Ke každé otázce je návrh — odpovídej prosím jen tam, kde se chceš odchýlit.

**A) Token a doména v Netlify** *(visí od 10. 8. 2026)*. **Neposílej mi je** —
nastav je přímo v Netlify. Zvaž **samostatný účet pro integraci**: token je
vázaný na člověka a u zápisu se ten účet podepisuje do historie případu.

**G) Čím se v CRM pozná požadavek?**
*Návrh: vlastní pole `Stav kalkulace` (Zadáno / Vyřizuje se / Vyřízeno)*, jak
je popsané v §6.2. Alternativy: nová fáze na začátku pipeline (mění trychtýř
a pravděpodobnosti), nebo štítek dealu (štítky jsou omezené a používají se
jinak).

**H) Potvrdit rozdělení do tří vrstev z §5.2** — hlavně že Backoffice
dostane krycí list jako **poznámku + přílohu** místo 112 vlastních polí.
Pokud jsou pole, podle kterých se v CRM opravdu **filtruje nebo reportuje**,
vyjmenuj je a přesunu je do vrstvy 1.

**I) Posouvá se fáze dealu při zápisu?**
*Návrh: ano, ale zaškrtávátkem, ne automaticky* — na *Nabídka odeslána*
(id 23), a jen když je fáze zatím nižší. Někdy se počítá jen na zkoušku.

**J) Zapisuje se i sleva** jako *deal discount*
(`POST /api/v2/deals/{id}/discounts`)? *Návrh: zatím ne* — až bude
schvalování slev v provozu a bude jasné, že se CRM a kalkulačka v číslech
neperou.

**K) Webhook místo dotazování** (§3.8). *Návrh: ano* — je to jediná cesta,
jak požadavky hlídat za nula tokenů, a integrátor ho založí v Pipedrive
ručně bez kódu. Potřebuje k tomu **adresu webu** a **heslo pro Basic auth**
(nastavíš ho v Netlify jako `PIPEDRIVE_WEBHOOK_HESLO`, jemu dáš totéž —
opět ne přes mě).

**L) Nabídka `.docx` jako příloha** — vždy, nebo jen na zaškrtnutí?
*Návrh: na zaškrtnutí, výchozí zapnuté.* Krycí list a poznámka jdou vždy.

---

## 9) Rizika

| riziko | co s tím |
|---|---|
| **Dvě zakázky nad jedním požadavkem** | stav *Vyřizuje se* + index podle `pdDealId` v rejstříku (§6.2, krok 3) |
| **Chybějící vlastní pole v CRM** | aplikace vyjmenuje, co chybí, a pošle zbytek — nikdy neselže celá |
| **Zápis do špatného pole** | párovat jen potvrzená pole; nespárované do zápisu vůbec nepustit |
| **Souběh dvou kalkulací** nad jedním případem | kontrola `update_time`; `PATCH` jen změněných polí kolizi zužuje |
| **Přegenerování tokenu** rozbije napojení | samostatný účet pro integraci; 401 už dnes hlásíme českou větou |
| **Velké přílohy** neprojdou stropem požadavku | změřit před psaním D‑5, náhradní cesta = generovat na serveru |
| **Rozjetí CRM a krycího listu** po zápisu | štítek *„zapsáno v HH:MM, od té doby se krycí list změnil"* |
| **v1 zmizí** (files, notes) | dnes bez v2 protějšku a mimo seznam zastaralých; izolované v jedné funkci, hlídat změnový log |

---

## 10) Úkoly

| # | Úkol | Stav | Poznámka |
|---|---|---|---|
| 1 | Načíst podmínky API z přiložené dokumentace | ✅ | doména blokovaná proxy → vytěženo z oficiálního SDK 33.7.0 generovaného z téže OpenAPI; §1 |
| 2 | Zjistit, co už v aplikaci je | ✅ | čtecí vrstva hotová (#112), zápis nemá ani řádek; §2 |
| 3 | Sepsat podmínky pro zápis | ✅ | §3 |
| 4 | Zapracovat rozhodnutí B–F | ✅ | §4 |
| 5 | Spočítat pole Back Office z obou krycích listů | ✅ | 71 (OCK) + 91 (PROJ) = 112 unikátních; §5.1 |
| 6 | Navrhnout, jak je dostat do CRM | ✅ | tři vrstvy, ~10 nových polí + poznámka + přílohy; §5.2 |
| 7 | Ověřit fáze na živém účtu | ✅ | jedna pipeline, pět fází, fáze „Požadavek" neexistuje; §6.1 |
| 8 | Navrhnout tok požadavek → řídící varianta | ✅ | §6.2 |
| 9 | Kroky D‑1 až D‑6 a testy | ✅ | §7 |
| 10 | Rozhodnutí A, G, H, I, J | ⬜ | **čeká na tebe**; §8 |
| 11 | Aktualizovat roadmapu (#16, #113–#117) | ⬜ | záměrně odloženo — G a H mění, co v položkách stojí |
| 12 | Ověřit token cost jednotlivých endpointů | ✅ | z `x-token-cost` ve vložené specifikaci; §3.3 a §3.5 |
| 13 | Ověřit úplnost vložené specifikace | ✅ | 85 cest proti SDK 33.7.0, nula rozdílů |
| 14 | Opravit pět čísel v komentářích kódu | ✅ | commit `3d8dcea`; testy 71/71 a 210/210 |
| 15 | Uložený filtr „Stav kalkulace = Zadáno" v CRM | ⬜ | pro integrátora — s webhookem (§3.8) už jen záloha, ne nutnost |
| 16 | Navrhnout úspornější přenos | ✅ | §3.8 — přenos ≈ 30–40 tokenů, čtení požadavků 0 přes webhook |
| 17 | Vyjmenovat nativní pole, která se nepřenášejí | ✅ | §5.2 |
| 18 | Webhook v Pipedrive + `PIPEDRIVE_WEBHOOK_HESLO` v Netlify | ⬜ | integrátor + ty; otázka K |
