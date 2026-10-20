# Nastavení → Controlling — rozbor a návrh (fáze 1)

Sezení 20. 10. 2026, větev `claude/controlling-navrh` nad `test` (`5dc28d1`, v20.10.1).
**Kód se v této fázi neměnil.** Jde jen o rozbor, návrh a otázky. Implementace začne až po souhlasu J. V.
Předběžné číslo v roadmapě je **#447** (přidělí koordinace).

Cíl (J. V.): dát controllerce Andree Mácové všechny informace o **předkalkulovaných nákladech rozdělených
do nákladových skupin (kapitol)**, aby je mohla v Reporting CZ porovnat s účetními daty z Heliosu (PRE × POST).

Podklady:

- vlákno „Dotazy nový kalkulák“ (31. 8. – 15. 9. 2026);
- tabulka A. Mácové „CENIK_2025-v2.9.4_rozvrzeni nakladu“ (Google Sheet);
- „Dotazy k analýze“ (17. 9., 23. 9., 20. 10.);
- „Nová ostrá databáze“ (9. – 15. 9.);
- „Analýza a návrh controllingu a reportingu“ (24. 9., Google Doc).

Ceny se do tohoto souboru nepřebírají. Jsou tu jen klíče, názvy, skupiny a účty.

> Termín: A. Mácová je podle e-mailu z 24. 9. **dva měsíce mimo PC a vrací se v prosinci**.
> Otázky na ni proto počkají. Do té doby se dá postavit všechno, co nepotřebuje její odpověď,
> a její rozvržení použít jako výchozí návrh (dá se později přepsat v Nastavení).

---

## A. Rozbor: Andyino rozvržení × současný ceník a výpočet

### A1. Co Andy navrhla

Dvanáct nákladových skupin („Název budoucí analytiky“). Ke každé patří položka manažerské výsledovky
(„Položka_v_ManVysl“) a analytický účet Helios, který platí dnes. Sloupec pro budoucí účet je až na
jeden řádek prázdný („bude doplněno“).

| # | Skupina (Název budoucí analytiky) | Položka v ManVysl | Účet Helios nyní | Počet klíčů |
|---|---|---|---|---|
| 1 | Cestovné | Ostatní přímé náklady | 512001 (budoucí 512001) | 1 |
| 2 | Ostatní služby – dopravné | Ostatní přímé náklady | 518400 (budoucí 518400) | 1 |
| 3 | Ostatní služby – lakování | Ostatní služby k zakázkám | 518800 a 518001 (budoucí 518001 = nevýrobní služby k zakázkám) | 8 |
| 4 | Ostatní služby – stavební práce | Stavební práce – kooperace | 518800 | 15 |
| 5 | Ostatní služby – projekce, engineering a dokumentace | Ostatní služby k zakázkám | 518800 a 518001 | 8 |
| 6 | Ostatní služby – lešení | Ostatní služby k zakázkám | 518800 | 4 |
| 7 | Ostatní služby – zámečníci | Stavební práce – kooperace | 518800 a 518001 | 5 |
| 8 | Spotřeba materiálu – stavební – ostatní | Přímý materiál | — | 14 |
| 9 | Spotřeba materiálu – stavební – plechy | Přímý materiál | — | 3 |
| 10 | Spotřeba materiálu – stavební – profily | Přímý materiál | — | 1 |
| 11 | Spotřeba materiálu – stavební – sklo | Přímý materiál | — | 7 |
| 12 | Spotřeba materiálu – stavební – spojovací materiál | Přímý materiál | — | 12 |
| — | Ostatní služby – ostatní, energie, … (jen Režie kanceláře) | Mix výrobní a správní režie | 518800 a 518001 | 1 |
| x | není náklad (přirážka, DPH, hodiny, výchozí hodnoty, kurz, přepínač lakování) | — | — | 13 |
| ? | bez skupiny (ATYP rezerva základ a příplatky, Tmelení) | — | — | 3 |

Andy rozvrhla ceník OCK celý (96 klíčů). Ceník PROJ nerozvrhla, má ho v tabulce jen pro úplnost.
To odpovídá dohodě „nejdřív OPR, PROJ později“.

### A2. Co v ceníku přibylo od v2.9.4 (a nemá skupinu)

Porovnáno strojově: 96 klíčů z tabulky × `CENIK_DEF` v `src/cenik.js` (114 řádků). **Žádný klíč
nezanikl ani se nepřejmenoval.** `C.marze` a `C.dph` stojí mimo `CENIK_DEF`, ale v ceníku dál jsou.

| Klíč | Název v ceníku | Od | Je to náklad? | Navržená skupina |
|---|---|---|---|---|
| `C.mustekKc` | Můstek mezi budovou a OCK (vč. montáže) | v25.9.2 (P7, K13-N59) | ano, Kč/ks | **Ostatní služby – zámečníci** (kooperace, dodávka i montáž) — potvrdit |
| `C.skloVsg442Kc` | Sklo VSG 4.4.2 | v9.9.4 (#234) | ano, Kč/m² | **Spotřeba materiálu – sklo** |
| `C.cetrisKc` | Cetris (cementotřísková deska) | 17. 9. (#268) | ano, Kč/m² (zatím do výpočtu nevstupuje) | **Spotřeba materiálu – ostatní** |
| `C.zaskleniListyProjHod` | Projekce navíc – zasklení mezi příčníky | v9.9.2 (#228) | ne, počet hodin | x — náklad se objeví v řádku Dílenská dokumentace (skupina projekce) |
| `C.statikaOplHod` | Statické posouzení opláštění – hodin | v2.10.1 (#390) | ne, počet hodin | x — náklad jde přes `C.statikaKc` (projekce) |
| `PC.dopravaHodKc` | PROJ: Cesta mimo Prahu – hodina cesty | v8.9.2 (#220) | ano, Kč/h | **Cestovné** (PROJ) |
| `PC.vyjezdTechnikKc` | PROJ: Akce mimo Prahu – 1 výjezd technika | jen větev `claude/d2-proj-sikora` (D2), v `test` zatím není | ano, Kč | **Cestovné** (PROJ) — až se D2 sloučí |

Sekce ceníku PROJ „Sazby DPH“ a „Cizí měna“ (`PC.dph*`) v Andyině tabulce ještě jsou. Ve v2.9.6 (#202)
se sloučily do `C.dph*` a `C.kurzEurKc`, nejsou to náklady a na rozvržení nemají vliv.

Ostatní body ze zadání, které jsem prověřil:

- **Lešení vnitřní/vnější a hlava šachty.** Klíče jsou stejné jako v2.9.4. Od září se změnilo jen chování
  (vnější lešení u interiéru jde do příplatků, odstup 0,25 m).
- **Můstky #355/#356.** Nový je jen `C.mustekKc`. Střecha přes můstek se počítá ze stávajících
  `C.zastreseniM2Kc` a `C.priplatky.medStrechaM2`.
- **Skladné** není položka ceníku. Je to firemní údaj ve Firmě (`skladneDenneKc`) a jde jen do
  smlouvy o dílo, ne do kalkulace. Pro předkalkulaci to není náklad.
- **Montáž ČR / zahraničí, cestovné ČR / zahraničí.** Nejsou to zvláštní klíče, jsou to odchylky téhož
  klíče v zahraniční řadě (`C.montazHodKc`, `C.cestovniKc`). Skupina je stejná, liší se jen sazba.
- **Slevy, cenové výjimky, minimální marže.** Nejsou to položky ceníku. Sleva je procento z ceny na
  variantě. Cenová výjimka je schvalovací záznam a výpočet nemění. Pro kapitoly nákladů jsou
  irelevantní, do exportu ale patří sleva jako údaj o výnosu (rozdíl prodejní ceny).
- **Přirážky.** `C.marze` / `PC.marze` jsou globální přirážky k nákladu, ne náklad (Andy správně „x“).

### A3. Řádky kalkulace, které nemají klíč ceníku (nelze je zařadit podle ceníku)

Výpočet OCK nese u většiny řádků stabilní `cenaPath` (např. `C.transportKc`), takže řádek jde zařadit podle
klíče, ne podle názvu. Výjimky, pro které je potřeba vlastní pravidlo:

| Řádek ve výpočtu | Dnes | Návrh pseudo-klíče | Navržená skupina |
|---|---|---|---|
| SPOJOVACÍ MATERIÁL (souhrn) | `cenaSkupina: 'C.spojovaci.*'` | `C.spojovaci.*` | Spotřeba materiálu – spojovací (všech 12 klíčů má stejnou skupinu) |
| LAKOVÁNÍ (souhrn) | `cenaSkupina: 'C.lak.*'` | `C.lak.*` | Ostatní služby – lakování |
| PRÁCE ZÁMEČNÍKA – OSTATNÍ (ATYP) | `cenaPath: 'Z.zamecnikAtypKc'` (částka ze zakázky) | `Z.zamecnikAtypKc` | Ostatní služby – zámečníci |
| PŘIRÁŽKA ZA ATYP – projekční a koordinační práce | bez klíče, % z nákladu Režie | `R.atypPrirazka` | Ostatní služby – projekce (shodně s Andy, `C.atypPrirazka`) |
| REZERVA základ / REZERVA příplatky | souhrn, % z nákladu | `R.rezervaZaklad`, `R.rezervaPriplatky` | **samostatná skupina „Rezerva“** (nerozpouštět, viz otázka J4) |
| Vlastní (trvalé) položky z katalogu | `kid` (kN, pkN) | `K.<kid>` | admin přiřadí v Nastavení; dokud ne, „Nezařazeno“ |
| Ruční řádek jen v zakázce („+ přidat položku“) | sekce + index, bez `kid` | `V.<sekce>` | výchozí skupina podle sekce (nastavitelná); v exportu příznak „ruční“ |
| Příplatky | `key` + `cenaPath C.priplatky.*` | podle `cenaPath` | podle klíče |
| PROJ položky | `sekce.key` + `fixKey` nebo `sazba` | `PC.sazby.<sazba>`, `PC.fixy.<fix>`, `PC.doprava` | rozvrhnout s Andy později (návrh v B2) |

Pozor na jednu vlastnost výpočtu: **jeden klíč může stát u více řádků.** Například `C.powertechInt` je u tří
řádků plechů, `C.oplechPracKc` u dvou řádků práce a `C.statikaKc` u statiky i statiky opláštění. Pro zařazení
do skupin to nevadí, protože skupina patří klíči. Export ale musí jít **po řádcích** (název řádku + klíč),
ne po klíčích.

### A4. Odpovědi na Andyiny otázky — z kódu

**„Režie kanceláře“ — co to je a s čím ji párovat?**

- Ve výpočtu je to **paušál v Kč za zakázku**: množství 1 × `C.rezieKancelareKc` (`src/engine.js:1930`).
- Je součástí **nákladu** sekce Režie a dostane stejnou globální přirážku jako každý jiný řádek.
- Na nic navázaná není: nezávisí na velikosti zakázky, hodinách ani ceně. Andy to odhadla správně.
- Kód ani poznámky neříkají, co přesně má krýt (nájem, back office, obchod, energie). To musí říct J. V.
  (otázka J1).
- **Doporučení pro controlling:** neporovnávat ji s přímými náklady z účetnictví. Vést ji jako
  **kalkulační příspěvek na správní režii** (typ „nepřímý / fixní“), který v POST datech nemá protějšek
  na zakázce. Porovnává se se skutečnou správní režií za období (součet příspěvků všech realizovaných
  zakázek × rozpočet režie).

**„Proč není Režie výroba?“** V kódu žádná procentní ani paušální výrobní režie neexistuje. Výroba
i montáž jdou z velké části přes kooperace (zámečníci, montáž, lakovna), takže jejich režie je v ceně
dodavatele. Potvrzuje to i odpověď J. V. ze 17. 9. („spíš outsourcovat než kupovat stroje“). Potvrdit
s J. V. (otázka J2).

**„Je to úplná kalkulace?“** **Není.** Kalkulace obsahuje:

- přímý materiál a přímé služby (sekce Hrubá OCK, Opláštění, Volitelné, Příplatky);
- „kancelářské“ práce zakázky jako paušál nebo hodiny × sazba (zaměření, dílenská dokumentace, statika,
  engineering, stavbyvedoucí);
- jeden paušál Režie kanceláře.

Fixní náklady firmy kryje **globální přirážka** `C.marze` (přirážka k nákladu, stejná pro všechny řádky)
a minimální marži hlídá `src/marze.js` (podíl (cena − náklad) / cena). Součet kalkulovaných nákladů
zakázek se proto **nemá** rovnat rozpočtu všech nákladů. Zbytek jde přes krycí příspěvek.

**„Primární klíče místo párování podle názvu?“** Ano. Každá položka ceníku má stabilní klíč (`C.transportKc`,
`C.lak.lakovnaProfilBm` atd.), který se nemění ani při přejmenování popisku. Andy je už v tabulce používá.
Řádky bez klíče řeší A3.

**„Vzorek dat skutečných zakázek“** — do repozitáře nepatří (ceny a zákazníci). Navrhuji, aby ho po
dávce C2 vyrobil J. V. exportem z ostré databáze (CSV/XLSX níže) a poslal Andy sám.

**Andyiny poznámky v tabulce:**

- „Tomáš – lakování: Tomáš Chládek?“ — kód zná jen „Tomáš“ (`C.lak.tomas*`), jde o druhý ceník lakování
  vedle lakovny. Potvrdí J. V.
- „Zaměření 3D skenerem — kdo to dělá?“ — v OCK je to paušál za zakázku. V PROJ je zaměření hodinová
  sazba `PC.sazby.zamereni`, tedy interní práce. Kdo skutečně měří, ví J. V. (otázka J3).
- „Výstup ze zaměření — to je co?“ — dokumentace ze zaměření předaná zákazníkovi. Bez ní se účtuje 50 %
  (množství 0,5). Skupina projekce a dokumentace sedí.
- „!! v %“ u `C.atypMontazPct`, `C.atypProjekcePct`: to **nejsou náklady**, jen podíly, které po
  zaškrtnutí ATYP předvyplní hodiny. Náklad se pak objeví v řádku Montáž na stavbě, resp. Dílenská
  dokumentace. Správně tedy „x“. Skupinu nese řádek, do kterého jdou. `C.atypPrirazka` je naopak
  sazba skutečného řádku nákladu (pseudo-klíč `R.atypPrirazka`).
- „Lešení / čištění / práce opláštění — samostatně, nebo jako stavební práce?“ — doporučuji **lešení
  samostatně** (jiný dodavatel, velká a proměnlivá částka, často příplatek), čištění a práce opláštění
  pod stavební práce. Rozhoduje Andy.
- „Tmelení — ideálně rozdělit“ — v ceníku je jedna sazba materiál + práce. Návrh: dočasně stavební
  práce. Kdyby bylo potřeba dělit, rozdělí se ceník na dva klíče (otázka J6).
- „ATYP rezervy — rozpustit do kategorií?“ — doporučuji **nerozpouštět**. Rezerva je nejistota, ne
  náklad konkrétní kategorie. Ve skupině „Rezerva“ je v PRE × POST přímo vidět, kolik se z rezervy
  spotřebovalo.

---

## B. Návrh sekce Nastavení → Controlling

### B1. Kde a pro koho

- Nová záložka v `NAST_PANELY` (`src/ui/nastaveni_ui.js`) s `jenAdmin: true`, stejně jako Analytika.
  Vidí ji a mění jen Administrátor.
- Server: nová funkce `netlify/functions/controlling.mjs`. GET i POST jen `vyzadujRoli(req,'Administrátor')`,
  zápis s heslem správce stejně jako matice (B168). Řádek v `MATICE` v `netlify/test_prava.mjs`.
  Bez něj test úplnosti spadne.
- Úložiště: Blobs `program/controlling` s **vlastní historií verzí** (`verze`, `kdo`, `kdy`, `poznamka`),
  podobně jako ceník. Není to ale součást otisku ceníku: změna mapování nemá vynutit nové zveřejnění
  ceníku ani přepočet zakázek. Export nese číslo verze mapování.
- Zálohy: přidat `controlling` vědomě do `KOPIE_DISK_CASTI` (#151 N6) a do zálohy online.

### B2. Obsah obrazovky (tři karty)

**1) Číselník nákladových skupin (kapitol).** Tabulka, řádek = skupina:

| Pole | Příklad | Pozn. |
|---|---|---|
| `id` | `sluzby-lakovani` | stabilní, nemění se ani při přejmenování |
| Název | Ostatní služby – lakování | Andyin „Název budoucí analytiky“ |
| Položka v ManVysl | Ostatní služby k zakázkám | |
| Účet Helios — nyní | 518800, 518001 | víc účtů dovoleno |
| Účet Helios — budoucí | 518001 | prázdné = zatím neurčeno |
| Typ nákladu | přímý / nepřímý | |
| Chování | variabilní / fixní | |
| Pořadí | 3 | pořadí v exportu |
| Aktivní | ano | zrušenou skupinu nejde mazat, dokud na ni něco ukazuje |

Výchozí obsah: Andyiných 12 skupin a k nim tři navržené, které v jejím číselníku chybějí:
**Režie – kalkulační příspěvek** (nepřímý/fixní), **Rezerva** a **Nezařazeno**.
Pro PROJ navrhuji (zatím jen jako návrh, rozhodne Andy v prosinci):

- **Projekce – vlastní práce** (sazby projektant, statik, zaměření; přímý/variabilní, osobní náklady);
- **Projekce – subdodávky** (PBŘ, elektro, studie osvitu, geodet, EZC);
- **Inženýrská činnost a projednání** (IČ, památkáři, územní rozvoj, kolaudace);
- **Cestovné** (doprava PROJ).

**2) Mapování položek ceníku na skupiny.** Řádek = **klíč** ceníku (ne název):

- sloupce: klíč, název z ceníku, sekce ceníku, jednotka, **skupina** (výběr), druh (náklad / parametr – není
  náklad), případná výjimka typu nákladu;
- obsahuje všechny klíče `CENIK_DEF` a `CENIK_DEF_PROJ`, pseudo-klíče z A3 a trvalé vlastní položky
  katalogu OCK i PROJ (`K.<kid>`);
- filtr **„jen nezařazené“** a počitadlo v záhlaví („3 položky bez skupiny“);
- import a export mapování do XLSX ve stejném tvaru jako Andyina tabulka (Klíč, Popis, Skupina, ManVysl,
  účty), aby ho Andy mohla upravit v Excelu a správce ho nahrál zpět (s náhledem rozdílů, stejně jako
  import ceníku).

**3) Export předkalkulace** — viz B4.

### B3. Hlídání nových položek bez skupiny

1. **Statický test** (`src/test_controlling_uplnost.js`): každý klíč `CENIK_DEF` / `CENIK_DEF_PROJ` musí mít
   ve výchozím mapování v kódu (`src/controlling.js`) skupinu, nebo být výslovně označen „není náklad“.
   Nová položka ceníku bez zařazení tak shodí testy dřív, než se dostane do provozu. Stejný vzor má
   `test_cenik_uplnost`.
2. **Při zveřejnění ceníku** (karta Zveřejnění v Ceníku): když ceník nebo katalog obsahuje položku, která
   v aktuálním mapování nemá skupinu, zobrazí se žluté **upozornění se seznamem** a odkazem do Nastavení →
   Controlling. **Zveřejnění to neblokuje**, aby obchod nečekal na controlling. Rozhodnutí J5.
3. **V Nastavení → Controlling** svítí štítek „N nezařazených“. V exportu jdou takové řádky do skupiny
   **Nezařazeno**, nikdy se neztratí a součet sedí.
4. Nová trvalá položka přidaná přes „+ přidat položku trvale“ dostane výchozí skupinu podle sekce
   (pravidlo `V.<sekce>`) a příznak „zkontrolovat“.

### B4. Export předkalkulace po kapitolách

**Odkud se berou čísla:** z výsledku výpočtu varianty přes `vypocetZ` / `vypocetProjZ` (`src/zamek.js`).
U **zamčené** varianty (odeslaná nabídka) se vrací **zmrazený výsledek** `v.zamek.vysledek` z okamžiku
prvního tisku. Předkalkulace odeslané nabídky je tedy už dnes zmrazená a export ji nepřepočítává podle
dnešního ceníku. U nezamčené varianty se počítá z ceníku uloženého ve variantě (`data.cenik`) a řádek nese
příznak „nezamčeno“. Mapování na skupiny se počítá **mimo jádro výpočtu** (nový modul `src/controlling.js`
podle `cenaPath` / `cenaSkupina` / `key`). Engine se nemění, Model 1 zůstává 1:1 a mutace jádra se
netýkají.

**List 1 — Řádky** (jeden řádek = jeden řádek kalkulace):

- *Identifikace:* číslo nabídky vč. přípony varianty (`2026 - OPR - CN - 555.2`), název akce, zákazník,
  IČO, obchodník, datum varianty, stav (zamčeno kdy / nezamčeno), řídící varianta ano/ne, OCK/PROJ,
  řada (ČR/zahraničí), model výpočtu (1/2), **verze ceníku + otisk** (`cenikRazitko`), verze mapování,
  **Pipedrive deal id**, číslo projektu Helios (zatím prázdné, viz B5);
- *Řádek:* sekce kalkulace (Hrubá OCK / Opláštění / Volitelné / Režie / Příplatky / PROJ sekce), název
  řádku, **klíč** (nebo pseudo-klíč), skupina, ManVysl, účet nyní/budoucí, typ nákladu,
  v základní ceně / příplatek (nabídnutý jako volba);
- *Hodnoty (Kč bez DPH):* množství, jednotka, jednotková nákladová cena, **náklad celkem**, přirážka,
  prodejní cena řádku.

**List 2 — Kapitoly** (souhrn varianta × skupina): náklad, podíl na nákladu, prodejní cena. Zvlášť
zakázkové řádky: rezerva, zaokrouhlení, **sleva**, cena nabídky bez DPH, marže v Kč a %.

**List 3 — Popis**: verze aplikace, datum exportu, kdo exportoval, verze mapování a číselník skupin.

Formáty: **XLSX** (vlastní `src/xlsx.js`, bez knihoven) a **CSV** (UTF-8 s BOM, středník, buňky přes
`csvBunka` kvůli ochraně proti vzorcům). Částky vždy v **Kč** i u zahraniční řady. Eurový přepočet je jen
pro dokument a do controllingu nepatří. Kurz je ve sloupci pro informaci.

**Rozsah exportu:**

- *jedna varianta / zakázka* — tlačítko v Přehledu cenových nabídek (jen admin) a v Nastavení → Controlling;
- *hromadně za období* — Nastavení → Controlling, filtr období (datum zamčení / odeslání), OCK × PROJ,
  řada, „jen řídící varianty“, „jen zamčené“. Počítá **server** (`GET /api/controlling/export?od=&do=…`).
  Přečte zakázky z úložiště a vrátí soubor. Rejstřík finanční údaje nenese, proto se musí číst každá
  zakázka, a export má strop počtu zakázek.

### B5. Vylepšení, která navrhuji navíc

1. **Které nabídky jsou vyhrané.** Kalkulátor to dnes neví (vyhraná = Pipedrive, projekt = Helios). Pro
   PRE × POST stačí exportovat **řídící zamčené varianty** a párovat v Reporting CZ přes převodník
   *číslo CN ↔ číslo projektu*, jak se J. V. s Andy dohodli 14. 9. Kalkulátor číslo projektu znát nemusí.
   Volitelně lze u zakázky doplnit ručně pole „Číslo projektu Helios“ (jen admin), až bude zakázka vyhraná.
2. **Pipedrive deal id do zakázky.** Dnes se nikde neukládá (je jen serverové čtení dealu). Pro
   párování CRM ↔ kalkulace je to nejlevnější klíč. Navazuje na připravovaný zápis do Pipedrive
   (`podklady/NAVRH_PIPEDRIVE_ZAPIS_2026-09-22.md`), samostatná dávka C4.
3. **Typ nákladu po skupině s výjimkou po klíči.** Přímý / nepřímý a variabilní / fixní se nastaví u
   skupiny a jednotlivý klíč ho může přepsat (např. Režie kanceláře = nepřímý/fixní).
4. **OPR × PROJ zvlášť.** Číselník skupin je společný, ale mapování a export se filtrují zvlášť. Kalkulace
   OCK a PROJ se nemíchají (závazné pravidlo 9).
5. **Zahraniční řada** nemá vlastní skupiny. Jiná je jen sazba. Do exportu jde sloupec `řada`,
   aby šlo zahraniční zakázky v Reportingu oddělit.
6. **Ochrana dat.** Export obsahuje nákupní ceny a marže, tedy totéž, co „nákupní ceny nemají opustit
   okruh administrátora“ (`cenik.import`). Proto:
   - export jen Administrátor, hlídá **server**, ne skrytí tlačítka;
   - každý export se zapíše do protokolu (kdo, kdy, rozsah);
   - Andy jako externí controllerka **nedostane účet s rolí Administrátor**. Export jí posílá J. V.,
     případně jí později zřídíme zvláštní právo `controlling.export` (výchozí jen admin, fail-closed
     podle B176). Rozhodnutí J7;
   - mez se zapíše do `BEZPECNOST_MEZE.md` (B88: náklady jsou v DOM každé role už dnes, export je ale
     hromadný a přenosný);
   - data z účetnictví se do kalkulátoru **netahají** (shoda s J. V. 31. 8.: „data, která tam nejsou
     potřeba, bych tam nepřidával“). Porovnání PRE × POST probíhá v Reporting CZ.
7. **Napojení na Reporting CZ** napřímo (API / ODBC od Assecu) až v další fázi. Nejdřív stabilní CSV/XLSX
   se stálou strukturou sloupců (verze struktury v listu Popis), aby se dal import v Reportingu nastavit
   jednou.
8. **Hodiny jako fyzická veličina.** Montážní hodiny (1 osoba × 4) a hodiny projekce dát do exportu
   i jako množství. Andy se 17. 9. ptala na přiřazování osobních nákladů. Hodiny umožní porovnat
   i výkaz dodavatele, nejen korunu.

### B6. Dávky (odhad)

| Dávka | Obsah | Velikost | Závisí na |
|---|---|---|---|
| **C1** | `src/controlling.js` (číselník skupin + výchozí mapování z Andyiny tabulky, pseudo-klíče, výpočet „řádek → skupina“), test úplnosti s pojistkou, server `/api/controlling` (GET/POST admin + heslo správce, historie verzí), záloha, `test_prava` | M | souhlas J. V. |
| **C2** | Nastavení → Controlling (3 karty: číselník, mapování s filtrem nezařazených, import/export mapování XLSX), upozornění při zveřejnění ceníku, export **jedné varianty** XLSX/CSV z `vypocetZ` | M | C1 |
| **C3** | Hromadný export za období na serveru, filtry, strop, protokol exportů, mez v `BEZPECNOST_MEZE.md`, Playwright harness | M–L | C2 |
| **C4** | Pipedrive deal id a (volitelně) číslo projektu Helios u zakázky; PROJ mapování podle Andy | S–M | rozhodnutí J4/J8, návrat Andy (prosinec) |

Každá dávka podle CLAUDE.md: testy s pojistkou (před opravou selže, po ní projde), mutace (C1–C3 se
dotýkají serveru, takže `netlify/mutace.mjs`), kolo `nastroje/testovaci_kolo.sh --bez-mutaci`, push do
`claude/controlling-navrh`. Do `test` a `main` slučuje koordinace.

---

## C. Otázky

### Pro J. V. (s doporučenou odpovědí — stačí odpovědět jen tam, kde chcete jinak)

| # | Otázka | Doporučení |
|---|---|---|
| J1 | Co má Režie kanceláře krýt (nájem, back office, obchod, energie…) a podle čeho se určila částka? | Napsat Andy jednou větou. V controllingu ji vést jako kalkulační příspěvek na správní režii (nepřímý/fixní), ne jako přímý náklad. |
| J2 | Potvrzujete, že výrobní režie se nekalkuluje, protože výroba a montáž jdou přes kooperace? | Ano. Skupinu „Režie výroba“ nezakládat. |
| J3 | Kdo dělá 3D zaměření u OCK (interně, nebo externě)? A je „Tomáš“ v lakování Tomáš Chládek? | Doplnit. Podle toho zůstane zaměření v „projekce“, případně přejde pod osobní náklady. |
| J4 | Rezervy (základ, příplatky) a přirážka za ATYP: samostatná skupina „Rezerva“, nebo rozpustit? | Rezerva samostatně, přirážka ATYP do projekce (jak navrhla Andy). |
| J5 | Má nezařazená položka zveřejnění ceníku **blokovat**, nebo jen upozornit? | Jen upozornit (obchod nečeká na controlling). |
| J6 | Tmelení: nechat jednu sazbu (stavební práce), nebo rozdělit ceník na materiál a práci? | Nechat jednu, rozdělit až na žádost Andy. |
| J7 | Kdo smí exportovat? Má Andy dostat účet? | Jen Administrátor. Andy účet zatím ne, exporty jí posílá J. V. |
| J8 | Ukládat u zakázky Pipedrive deal id a ručně číslo projektu Helios? | Deal id ano (C4, s mapováním Pipedrive). Číslo projektu ne, párovat převodníkem v Reportingu. |
| J9 | Exportovat jen zamčené (odeslané) varianty, nebo i rozpracované? | Výchozí jen zamčené řídící. Rozpracované na zaškrtnutí s příznakem. |
| J10 | Můstek (`C.mustekKc`, vč. montáže): zámečníci, nebo materiál? | Zámečníci (kooperace). |
| J11 | Začít C1–C2 hned s Andyiným rozvržením jako výchozím, než se v prosinci vrátí? | Ano. Mapování jde přepsat v Nastavení bez nové verze aplikace. |

### Pro A. Mácovou (až se vrátí; navržené odpovědi k potvrzení)

| # | Otázka | Navrženo |
|---|---|---|
| A1 | Lešení samostatná skupina, čištění a práce opláštění pod stavební práce — souhlasíte? | ano |
| A2 | Nová skupina „Režie – kalkulační příspěvek“ (jen Režie kanceláře) a „Rezerva“ — vyhovuje to manažerské výsledovce? | ano |
| A3 | Rozvržení PROJ (4 skupiny v B2) — doplnit účty Helios? | doplní Andy s Verčou |
| A4 | Struktura exportu (3 listy, sloupce v B4) — stačí pro import do Reporting CZ? Jaký formát čísel a dat? | XLSX, Kč bez DPH, datum ISO |
| A5 | Budoucí účty Helios — vyplní je Andy přímo v Nastavení → Controlling (přes import XLSX)? | ano, přes import, J. V. zveřejní |
| A6 | Hodiny montáže a projekce v exportu jako množství — využijete je pro postkalkulaci osobních nákladů? | ano |

---

## Rozhodnutí J. V. 20. 10. 2026 (dialog v sezení)

| # | Rozhodnutí |
|---|---|
| J1 | Režie kanceláře = **příspěvek na správní režii** (nepřímý/fixní), neporovnávat s přímými náklady. |
| J2 | Výrobní režie se nekalkuluje — skupinu **nezakládat**. |
| J3 | 3D zaměření dělá **interně** náš technik/projektant (skupina projekce). „Tomáš“ v lakování = **Tomáš Chládek**. |
| J4 | **Rezerva** samostatná skupina, **přirážka za ATYP do projekce**. |
| J5 | Při zveřejnění ceníku **upozornit a umožnit položku rovnou zařadit do skupiny** (neblokovat). |
| J6 | Tmelení **jedna sazba** (stavební práce). |
| J7 | Export **jen administrátor** (server), Andy účet nedostane. |
| J8 | **Pipedrive deal id ano** (C4), číslo projektu Helios ne — převodník v Reportingu. |
| J9 | Exportovat **jen zamčené řídící varianty** (bez volby rozpracovaných). |
| J10 | Můstek → **Ostatní služby – zámečníci**. |
| J11 | **Začít C1** s Andyiným rozvržením jako výchozím. |


## D. Stav

- Kód: beze změny.
- Roadmapa: přidána položka #447 (předběžné id), stav `ceka` na souhlas J. V.
- Artefakt pro J. V.: https://claude.ai/artifact/MNaTnXQ4847f2rNiAT9br7 („Controlling v kalkulátoru“).
- Další krok: dávka C1 (schváleno J. V. 20. 10.).
