# #367 bod P10 — platební podmínky z krycího listu: stav a návrh dotažení (22. 10. 2026)

Dávka **D2**, větev `claude/d2-p10-podklad` nad `test` = v21.10.6 (`4c127f5`).
**Kód aplikace se neměnil** — jen tento podklad a statická ukázka
`podklady/ukazky/P10_platebni_kalendar_ock.html`. K projití s J. V. po návratu
(harmonogram `podklady/HARMONOGRAM_21_23_10.md`, řádek D2).

Zdroje: roadmapa #367 (+ #363, #366, #383, #434), `podklady/K16_ROZBOR_2026-09-25.md`
(P10, rozpory 1–7), `podklady/NAVRH_PLATEBNI_PODMINKY_2026-09-29.md` (etapy A/B/C,
rozhodnutí oddíl 7), `podklady/367_NASTAVENI_FIRMA_NAVRH.md` (fáze 1, 19. 10.),
`podklady/367_PREKLADY_KONTROLA.md` (fáze 2b), CHANGELOG, kód `src/kryci.js`,
`src/podminky.js`, `src/plan_plateb.js`, `src/sod.js`. Všechny příklady jsou
smyšlené, bez cen z ceníku a bez osobních údajů.

---

## 0. Ve zkratce

- **PROJ je hotový.** Jeden plán plateb v krycím listu PROJ (4 předvolby,
  výchozí Záloha 70 % + zbytek), z něj nabídka online i Word (PROJ v4–v6),
  smlouva o dílo PROJ s dopočtenými a sečtenými platbami, zábrany 100 %
  a součet = cena díla. Firemní standard v Nastavení → Smlouvy / Šablony.
- **OCK je hotový „napůl".** Procenta, splatnost, platnost, způsob fakturace,
  záruka, zádržné a pokuty jdou z krycího listu (a z Firmy jako výchozí)
  do nabídky, Wordu i SoD. **Milníky ale ne:** krycí list má tři pevná pole
  „procento – milník", nabídka tiskne pevné firemní věty a SoD bere milník
  z krycího listu jen u 2. splátky. Výsledek: **u téže zakázky říká nabídka
  něco jiného než smlouva** (ověřeno, oddíl 3, Z1).
- Bod **10.3 „vše z krycího listu"** tedy zbývá jen pro **milníky a počet
  splátek OCK**. Návrh: platební kalendář OCK s katalogem milníků (to, co
  J. V. odsouhlasil v oddílu 2 návrhu 29. 9., ale v etapě A se udělala jen
  „část 1" nad třemi poli).
- **Doporučení:** P10 dokončit jednou dávkou „P10b — kalendář OCK"
  (velikost M–L, 2 sezení), #367 pak uzavřít; překlady rodilými mluvčími
  vést jako samostatnou položku (nečeká na kód).

---

## 1. Co P10 požaduje

Rozhodnutí J. V. 29. 9. 2026 k rozboru D kola 16 (P10 = K15-N71, „platební
podmínky žijí na devíti místech a v sedmi bodech si odporují"):

> Vše se dotahuje z krycího listu, při rozporu má přednost krycí list;
> standard 50 / 40 / 10; platnost 2 měsíce; splatnost z krycího listu;
> znění „bez DPH"; fakturace většinou po milnících, může být i měsíční;
> pro plán plateb PROJ (4 znění) a „vše z krycího listu" připravit návrh.

**Hotovo, když** (roadmapa): „Etapa B i A hotové: náhled, Word i SoD (OCK
i PROJ) berou platební podmínky z krycího listu; test před opravou → po opravě."

### Stav po bodech

| bod | požadavek | stav | kde / verze |
|---|---|---|---|
| 10.1 | platnost 2 měsíce všude, skloňování | ✅ hotovo | v29.9.2 |
| 10.2 | náhled PROJ bere splatnost a platnost z krycího listu | ✅ hotovo | v29.9.2 |
| 10.3 | „vše z krycího listu" (OCK i PROJ, nabídka, Word, SoD) | 🟡 **PROJ ano, OCK bez milníků** | etapa B v30.9.2, etapa A č. 1 v30.9.4, SoD OCK K18-N100 (1. 10.) |
| 10.4 | věty „(bez DPH)" | ✅ hotovo | slovník v29.9.2, CN v13+ |
| 10.5 | způsob fakturace Po milnících / Měsíční | ✅ hotovo | v29.9.2, věta měsíční fakturace v30.9.4 |
| 10.6 | plán plateb PROJ (4 znění → 1) | ✅ hotovo | etapa B v30.9.2, výchozí předvolba #383 (v1.10.2) |
| 10.7 | záruka z krycího listu | ✅ hotovo | v29.9.2, věta „5 let záruka" z kap. V. pryč v19.10.7 |
| fáze 2a/2b | „z kódu vše převést do Firma" (19. 10.) | ✅ hotovo | v19.10.6, v19.10.7, šablona PROJ v6 v19.10.9 (#434) |
| — | kontrola překladů rodilými mluvčími | ⏳ čeká | `podklady/367_PREKLADY_KONTROLA.md` |

### Sedm rozporů z rozboru K16 — co z nich zbylo

| # | rozpor (25. 9.) | dnes |
|---|---|---|
| 1 | platnost 2 × 3 měsíce, „5 měsíce" | ✅ vyřešeno |
| 2 | náhled PROJ z konstant | ✅ vyřešeno |
| 3 | **OCK krycí list × Word: jiné milníky; „Bez zálohy" → „ve výši  (+ DPH)"** | 🟡 „Bez zálohy" vyřešeno (splátka se vynechá, doklady se přečíslují); **milníky ne** — viz Z1, Z2 |
| 4 | slovník 40/50/10 vedle 50/40/10 | ✅ vyřešeno |
| 5 | „Náš standard / měsíční" | ✅ vyřešeno (čte se jako Po milnících) |
| 6 | PROJ čtyři znění | ✅ vyřešeno (plán plateb) |
| 7 | názvy symbolů, záruka dvakrát | ✅ záruka jednou; názvy `PODM_ZALOHA1` × `PODM_ZALOHA` zůstaly (neškodí, starší šablony je potřebují) |

---

## 2. Kde se platební podmínky berou dnes

```
Nastavení → Smlouvy / Šablony  (NAST.firma.podminky, přepínač OCK | PROJ; zveřejní administrátor)
   │ továrna PODMINKY_VYCHOZI v src/podminky.js, slučuje se při čtení (podminkyEf)
   ▼ předvyplní
KRYCÍ LIST varianty  (ruční zápis má přednost; zamčená varianta čte data.kryci.zmrazeno)
   ├─ OCK:  splatnost · platnost · způsob fakturace · zaloha1 (výběr) · faktura2 (dopočet) · fakturaKonc
   │        · zádržné ×2 · záruka · pokuty · limit
   └─ PROJ: splatnost · platnost · PLÁN PLATEB (předvolba + splátky po činnostech) · pokuty · licence …
   ▼ čtou
nabídka online · Word nabídky · smlouva o dílo · tisk krycího listu
```

### OCK

| údaj | krycí list (pole) | nabídka online + Word (CN v14/v15) | SoD realizace v2–v4 | SoD v1 |
|---|---|---|---|---|
| procenta splátek | `zaloha1`, `faktura2` (dopočet do 100 %), `fakturaKonc` | ✅ z krycího listu (`{{PODM_PLATEBNI_KALENDAR}}`) | ✅ (`{{SOD_PLATEBNI_KALENDAR}}`) | ✅ `SOD_SPLATKA1/2/4_PROC`, věta 3 vypadne |
| milník zálohy | text „– po podpisu smlouvy" | ❌ pevná věta Firmy „…po podpisu SoD" | ❌ pevná fráze „při uzavření této smlouvy o dílo" | ❌ pevná věta šablony |
| milník 2. splátky | text „– po zahájení montáže" | ❌ pevná věta „Po ukončení výroby, dodání materiálu na stavbu a po zahájení prací…" | ✅ **text z krycího listu** | ❌ pevná věta šablony |
| milník konečné | text „– po předání" | ❌ pevná věta „…po řádném předání a převzetí…" | ❌ pevná fráze „po provedení celého díla…" | ❌ |
| „Bez zálohy" | volba | ✅ splátka vynechána, přečíslování | ✅ | ✅ odstavec pryč |
| měsíční fakturace | volba | ✅ věta z Firmy | ✅ věta z Firmy | ❌ smlouva nevznikne, řekne proč |
| splatnost, platnost, záruka, zádržné, pokuty | pole | ✅ `PODM_*` | ✅ `PODM_*` / `SOD_*` | ✅ |
| jazyky EN/DE/FR | — | věty z Firmy / slovník | díly z Firmy / slovník; **vlastní milník zůstane česky** | — |
| počet splátek | **pevně 3** (záloha, dílčí, konečná) | 1–3 | 1–3 | 4 pevné věty |

### PROJ

Plán plateb `data.kryciProj.planPlateb` (`src/plan_plateb.js`) — krycí list
PROJ (editor), nabídka PROJ online + Word v4–v6 (`PROJ_PLATBY_*`), SoD PROJ
v2–v4 (`{{SODP_PLATEBNI_KALENDAR}}`, platby = procento × cena činnosti po
slevě, stejný milník sečten, ruční přepis, zábrana součet = cena díla),
firemní Standard v Nastavení. Starší pole (`zpusobFakturace`, `fakt*`,
záloha) mají příznak `stary` a ukazují se jen u nabídky odeslané před
plánem. **Ke P10 tu nic nezbývá** — model je přesně ten, který chybí u OCK.

### Export

Controlling export v2 (`src/controlling.js`, #447) platební podmínky
nenese (ani procenta, ani milníky). Pipedrive je také nedostává. Dopad P10
na export je tedy jen otázka Q8 (jestli je tam chceme).

---

## 3. Zbytky zjištěné při přípravě podkladu (ověřeno v Node, kód beze změny)

Výchozí zakázka (prázdné Nastavení = továrna), skript v scratchpadu nad
`kryciPlatebniKalendar` / `kryciPlatebniSymboly` / `kryciSodPlatby`:

```
krycí list:  50 % – po podpisu smlouvy | 40 % – po zahájení montáže | 10 % – po předání

nabídka CZ:  1. dílčí daňový doklad ve výši 50 % (bez DPH) … bude vystaven po podpisu SoD. …
             Po ukončení výroby, dodání materiálu na stavbu a po zahájení prací bude vystaven
             2. dílčí daňový doklad ve výši 40 % (bez DPH) … podmínkou pro předání díla objednateli.
             Po ukončení všech výše uvedených prací a po řádném předání … konečný daňový doklad …
SoD CZ:      při uzavření této smlouvy o dílo 50 % z celkové ceny díla
             po zahájení montáže 40 % z celkové ceny díla
             po provedení celého díla … zbývajících 10 % z celkové ceny díla
```

| # | zjištění | závažnost |
|---|---|---|
| **Z1** | **Milník 2. splátky se v nabídce a SoD liší** u výchozí zakázky: nabídka „po ukončení výroby, dodání materiálu na stavbu a po zahájení prací", SoD „po zahájení montáže". Zákazník podepíše jiný milník, než mu přišel v nabídce. | střední (obchodně citlivé, dnes každá SoD OCK) |
| **Z2** | Obchodník přepíše milník v krycím listu (např. „40 % – po dokončení opláštění") → **nabídka ho ignoruje** (pevná věta), SoD ho vezme. Milníky zálohy a konečné se nikam netisknou vůbec — pole krycího listu vypadá, že něco řídí, ale neřídí. | střední |
| **Z3** | Vlastní milník v **cizojazyčné SoD zůstane česky** uprostřed věty („po dokončení opláštění – 40 % des Gesamtpreises des Werks"); kontrolu, která by to hlásila (obdoba `dodatekCesky` / `platbyWordOck`), jsem nenašel. | střední u zahraničních zakázek |
| **Z4** | OCK umí jen **3 splátky** (záloha z voleb 0/30/50/70, dílčí = dopočet, konečná). Kalendář 30/30/30/10 nebo dvě dílčí faktury nejde zadat, ač ho SoD v1 (4 věty) i v2+ (seznam) unesou. | nízká–střední (podle praxe) |
| **Z5** | Roadmapa #367: stav `ceka`, v detailu „ZBÝVÁ z etapy A: smlouva o dílo OCK (symboly SOD_SPLATKA* aplikace neplní…)" — **zastaralé**, SoD OCK kalendář je hotový od K18-N100 (šablona v2 `--sod-real`, dnes v4). | evidence (opraví D1 / koordinace) |

Z1–Z3 jsou jediné, co brání splnit „hotovo, když" doslova. Všechny tři
odstraní jeden zdroj milníků (oddíl 5).

---

## 4. Otázky pro J. V. — s doporučením a dopady

### Q1 — Kdo je pravda pro milník: krycí list, nebo firemní věta?

- **A (doporučeno): krycí list přes katalog milníků.** Každá splátka v krycím
  listu = procento + milník vybraný z firemního katalogu (Nastavení →
  Smlouvy / Šablony → OCK). Milník v katalogu nese **větu nabídky, frázi SoD,
  překlady EN/DE/FR a příznak „podmínka úhrady"**. Nabídka i SoD skládají
  text z téhož milníku → Z1 a Z2 zmizí.
- B: firemní věty jsou pravda, pole milníku v krycím listu jen ke čtení —
  levnější, ale obchodník ztratí možnost dohodnout jiný milník a SoD by se
  musela vrátit k pevným frázím (krok zpět proti „vše z krycího listu").
- **Dopady A:** nabídka — 2. věta u výchozí zakázky se nemění (milník katalogu
  „po ukončení výroby, dodání materiálu na stavbu a zahájení prací" = dnešní
  věta); **SoD — u výchozí zakázky se změní 2. řádek** na tentýž milník
  (dnes „po zahájení montáže") → potřebuje souhlas, je to změna smluvního
  textu; krycí list — místo tří textových polí tabulka kalendáře; export —
  beze změny.
- **Pro rozhodnutí:** který text má být firemní milník 2. splátky v obou
  dokumentech? Návrh: znění nabídky (je delší a přesnější, J. V. ho 29. 9.
  odsouhlasil jako jeden ze tří firemních milníků).

### Q2 — Kalendář OCK: víc než 3 splátky a předvolby?

- **Doporučeno: ano**, 1–6 splátek, předvolby (Firma, upravitelné):
  *Standard 50 / 40 / 10* (výchozí), *Bez zálohy 90 / 10*, *30 / 60 / 10*,
  *Měsíční fakturace* (kalendář se schová), *Vlastní*. Poslední řádek je
  vždy konečný doklad („na zbývající část"), procento se mu dopočítá
  (dnešní `kryciFaktura2Dopocet` se přesune na poslední řádek).
- **Dopady:** nabídka — víc vět, doklady číslované pořadím (už dnes);
  SoD v2–v4 — víc řádků seznamu (šablona se nemění); **SoD v1** — viz Q6;
  krycí list (tisk) — tabulka místo tří řádků; export — beze změny.

### Q3 — Vlastní milník mimo katalog

- **Doporučeno:** povolit; u **cizojazyčné** nabídky nebo SoD vyžadovat
  překlad přímo u řádku (pole „EN/DE/FR" se objeví jen u zahraniční zakázky),
  jinak **zábrana dokumentu** (ne jen upozornění) — česká věta ve francouzské
  smlouvě je horší než nevygenerovaná smlouva. Česká zakázka bez omezení.
- **Dopady:** odstraní Z3; nová kontrola `platbyMilnikPreklad` (vzor
  `planPlatebWordProj`); krycí list — u vlastního milníku štítek „vlastní".

### Q4 — Firemní věty `vety.zaloha / faktura2 / konecna` ve Firmě

- **Doporučeno:** zůstanou jako **továrna starého znění** pro zamčené
  nabídky a jako výchozí texty tří firemních milníků při převodu do katalogu
  (nic, co administrátor upravil 19.–22. 10., se neztratí). V Nastavení se
  přesunou pod „Katalog milníků OCK"; značka `{MILNIK}` přibude jen do
  obecné věty „vlastního" milníku.
- **Dopady:** Nastavení — jedna karta se přestaví; zveřejnění Firmy —
  `firmaLzeZverejnit` rozšířit o katalog (server volá tutéž funkci).

### Q5 — Odeslané a zamčené nabídky

- **Doporučeno:** nesahat. Zamčená varianta bez nové značky
  `pravidlaPlateb ≥ 2` se tiskne dál dnešním kódem ze zmrazených tří polí
  (stejně jako dnes `pravidlaPlateb = 1` chrání nabídky z doby před D1/D2).
  Nezamčené varianty se při **čtení** převedou: tři pole → tři řádky
  kalendáře, milník rozpoznaný v katalogu (podle textu) dostane id, jinak
  „vlastní". Nic se nezapisuje při importu (parita prohlížeč × server, N43).
- **Dopady:** SoD k už odeslané nabídce nese dál dnešní text (tj. i Z1) —
  rozpor zmizí jen u nově odeslaných. **Pro rozhodnutí:** stačí to, nebo
  chcete u SoD k odeslané nabídce varování „milník se liší od nabídky"?
  Doporučuji varování (levné, jen kontrola).

### Q6 — Starší šablony

| šablona | dnes | po P10b |
|---|---|---|
| CN v13 (3 pevné věty se symboly) | tiskne procenta, kontrola `platbyWordOck` hlásí | beze změny; u kalendáře ≠ standard 3 řádky **zábrana** s odkazem na CN v14/v15 |
| CN v14 / v15 | `{{PODM_PLATEBNI_KALENDAR}}` | beze změny, jen víc řádků |
| SoD realizace v1 (4 pevné věty) | 3 splátky mapuje, 4. věta pryč | jen kalendář se standardními 3 milníky; jinak chyba „nahrajte šablonu se seznamem plateb" (jako dnes u měsíční) |
| SoD realizace v2–v4 | `{{SOD_PLATEBNI_KALENDAR}}` | beze změny |
| PROJ v4–v6, SoD PROJ v2–v4 | plán plateb | beze změny |

- **Doporučeno:** žádná nová verze šablony; jen rozšířit kontroly.
  **Otázka:** používá se v produkci ještě CN v13 nebo SoD v1? Pokud ne,
  stačí je v Nastavení → Šablony skrýt a zábrany se uplatní jen teoreticky.

### Q7 — Částky splátek v Kč ve SoD OCK

- Návrh 29. 9. je zmínil (`{{SOD_PLATBA1_KC}}`…), PROJ je má.
- **Doporučeno: zatím ne** — SoD OCK dnes pracuje s procenty a cena díla se
  může změnit dodatkem (příplatky, objednané položky C6); částky by se musely
  přepočítávat. Pokud ano, pak jen jako doplněk řádku „(… Kč bez DPH)"
  a jen v SoD, ne v nabídce.

### Q8 — Export (controlling, Pipedrive)

- **Doporučeno:** v P10b ne. Volitelně později jeden sloupec „Platební
  kalendář" (text „50 % po podpisu SoD · 40 % … · 10 % …") a „Záloha %"
  v controlling exportu v3 — užitečné pro cash-flow; rozhodne controlling.
- **Dopad při „ano":** `CTRL_EXPORT_VERZE` → 3, test `overit_controlling`.

### Q9 — Překlady rodilými mluvčími (fáze 2b)

- `podklady/367_PREKLADY_KONTROLA.md` čeká. **Doporučeno:** zadat překladateli
  jako samostatnou položku roadmapy (nečeká na kód; opravy jdou do Nastavení,
  ne do kódu). Nové milníky z katalogu přidat do téhož seznamu.

### Q10 — Evidence

- **Doporučeno:** #367 přepsat — etapy A, B, fáze 2a/2b hotové; nová položka
  **„P10b — platební kalendář OCK s katalogem milníků"** (Z1–Z4) a samostatně
  překlady (Q9). Zastaralý text o SoD OCK (Z5) opravit.

---

## 5. Prototyp

Statická ukázka: **`podklady/ukazky/P10_platebni_kalendar_ock.html`** (bez
serveru, otevře se v prohlížeči; předvolby, přidání řádku, součet, výstup
nabídky a SoD v CZ/EN vedle sebe na smyšlené zakázce). Data jsou smyšlená.

### 5a. UI krycího listu OCK — sekce Platební podmínky

```
PLATEBNÍ PODMÍNKY
  Způsob fakturace   (•) Po milnících   ( ) Měsíční
  Předvolba          [ Standard 50 / 40 / 10            ▼ ]   ↺ vrátit firemní
                     (Standard · Bez zálohy 90/10 · 30/60/10 · Vlastní)

  Platební kalendář                                                    součet 100 % ✓
  ┌───┬───────┬───────────────────────┬────────────────────────────────────────────┬─────┐
  │ # │   %   │ doklad (sám)          │ milník                                     │     │
  ├───┼───────┼───────────────────────┼────────────────────────────────────────────┼─────┤
  │ 1 │ [50]  │ 1. dílčí daňový doklad│ [po podpisu smlouvy o dílo             ▼] │  ✕  │
  │ 2 │ [40]  │ 2. dílčí daňový doklad│ [po ukončení výroby, dodání materiálu… ▼] │  ✕  │
  │ 3 │  10 ⟲ │ konečný daňový doklad │ [po řádném předání díla                ▼] │     │
  └───┴───────┴───────────────────────┴────────────────────────────────────────────┴─────┘
  [+ přidat dílčí splátku]          ⟲ = dopočet do 100 % (lze přepsat)
  Vybráno „vlastní…" → textové pole; u zahraniční zakázky navíc pole EN/DE/FR (Q3)

  Splatnost faktur [14] dní · Platnost nabídky [2 měsíce] · Zádržné … · Záruka [60] měsíců · Pokuty …
```

Zamčená varianta: tabulka jen ke čtení (zámek SoD `zamekKryciPoleVolne` beze
změny). Měsíční fakturace: tabulka se schová, ukáže se věta z Firmy.

### 5b. Nastavení → Smlouvy / Šablony → OCK → Katalog milníků

```
id         │ milník (krycí list)                         │ věta nabídky (CZ) / fráze SoD (CZ)          │ podm. úhrady │ EN DE FR
podpis     │ po podpisu smlouvy o dílo                    │ „…bude vystaven po podpisu SoD."  / „při uzavření této smlouvy o dílo" │ ✓ termíny │ ✓ ✓ ✓
vyroba     │ po ukončení výroby, dodání materiálu na stavbu a zahájení prací │ „Po ukončení výroby…" / „po ukončení výroby, dodání materiálu…" │ ✓ předání │ ✓ ✓ ✓
predani    │ po řádném předání díla (konečný)             │ „…konečný daňový doklad na zbývající část…" / „po provedení celého díla… zbývajících" │ — │ ✓ ✓ ✓
[+ milník]   (např. montaz_ok „po dokončení montáže ocelové konstrukce", oplasteni „po dokončení opláštění")
Předvolby:  Standard = podpis 50 · vyroba 40 · predani 10   …   (součet ≠ 100 % → nelze zveřejnit, Q4 z 19. 10.)
```

### 5c. Datový model

```js
// Firma — NAST.firma.podminky.ock (rozšíření, továrna v PODMINKY_VYCHOZI)
ock: {
  milniky: [
    { id: 'podpis',  text: { cz: 'po podpisu smlouvy o dílo', en: '…', de: '…', fr: '…' },
      vetaCn:  { cz: '{PORADI} dílčí daňový doklad ve výši {PROC} (bez DPH) z celkové ceny díla bude vystaven po podpisu SoD.' },
      frazeSod:{ cz: 'při uzavření této smlouvy o dílo' },
      podminka:{ cz: 'Úhrada tohoto daňového dokladu je podmínkou pro dodržení předem dohodnutých realizačních termínů.' } },
    { id: 'vyroba',  … }, { id: 'predani', konecny: true, … },
  ],
  predvolby: { std: [['podpis',50],['vyroba',40],['predani',10]], bezZalohy: [['vyroba',90],['predani',10]], … },
  predvolbaVychozi: 'std',
}

// Varianta — data.kryci.kalendar (chybí = převod ze zaloha1/faktura2/fakturaKonc při čtení)
kalendar: { v: 1, predvolba: 'std'|'bezZalohy'|…|'vlastni',
            radky: [ { m: 'podpis', p: 50 }, { m: 'vyroba', p: 40 }, { m: 'predani', p: null /* dopočet */ } ],
            // vlastní milník: { m: null, t: 'po dokončení opláštění', tj: { de: 'nach Fertigstellung der Verkleidung' }, p: 30 }
          }
// zmrazení (P9.5): kryciZmrazPodminky opíše i `kalendar` + značka pravidlaPlateb = 2
```

Vzor je `plan_plateb.js` (stálá id milníků, předvolby z Firmy, chybějící plán
= předvolba, převod starších polí, snímek při zamčení) — stejný tvar, menší.

### 5d. Ukázka výsledného textu (smyšlená zakázka)

*Zakázka „Bytový dům Ukázková 12" (smyšlená), kalendář 30 / 30 / 30 / 10 s jedním
vlastním milníkem, německá smlouva:*

| # | % | milník |
|---|---|---|
| 1 | 30 | podpis (katalog) |
| 2 | 30 | vyroba (katalog) |
| 3 | 30 | vlastní „po dokončení opláštění" / DE „nach Fertigstellung der Verkleidung" |
| 4 | 10 | predani (konečný, dopočet) |

**Nabídka CZ (online i Word CN v14/v15):**

> 1\. dílčí daňový doklad ve výši 30 % (bez DPH) z celkové ceny díla bude
> vystaven po podpisu SoD. Úhrada tohoto daňového dokladu je podmínkou pro
> dodržení předem dohodnutých realizačních termínů.
> Po ukončení výroby, dodání materiálu na stavbu a po zahájení prací bude
> vystaven 2. dílčí daňový doklad ve výši 30 % (bez DPH) z celkové ceny díla.
> Úhrada tohoto daňového dokladu je podmínkou pro předání díla objednateli.
> 3\. dílčí daňový doklad ve výši 30 % (bez DPH) z celkové ceny díla bude
> vystaven po dokončení opláštění.
> Po ukončení všech výše uvedených prací a po řádném předání a převzetí celého
> díla předávacím protokolem bude vystaven konečný daňový doklad na zbývající
> část celkové ceny díla s vyúčtováním DPH v zákonné výši.

**SoD CZ (v2–v4, `{{SOD_PLATEBNI_KALENDAR}}`):**

> při uzavření této smlouvy o dílo 30 % z celkové ceny díla
> po ukončení výroby, dodání materiálu na stavbu a zahájení prací 30 % z celkové ceny díla
> po dokončení opláštění 30 % z celkové ceny díla
> po provedení celého díla zhotovitele a jeho předání a převzetí bez vad a nedodělků bránících provozu výtahu zbývajících 10 % z celkové ceny díla

**SoD DE** (dnes by řádek 3 zůstal česky — Z3):

> nach Fertigstellung der Verkleidung – 30 % des Gesamtpreises des Werks

(věty 1, 2 a 4 z katalogu / slovníku jako dnes; bez překladu řádku 3 →
zábrana „Milník 3. splátky nemá německé znění").

**Krycí list (tisk):** „Platební kalendář: 30 % po podpisu smlouvy o dílo ·
30 % po ukončení výroby… · 30 % po dokončení opláštění (vlastní) · 10 % po
řádném předání díla (konečný). Splatnost 14 dní."

---

## 6. Fáze, pracnost, testy

| fáze | obsah | velikost | testy (každý doložit před → po) |
|---|---|---|---|
| **F1 jádro** | `src/kalendar_ock.js` (čistá logika: katalog, předvolby, převod 3 polí → řádky, dopočet posledního, kontroly 100 % / známý milník / překlad, snímek); `podminky.js` rozšířit o `ock.milniky` + `predvolby`; `firmaLzeZverejnit` | M | `test_kalendar_ock.js`: prázdná Firma + výchozí zakázka = **dnešní nabídka bajtově** (pojistka), převod starých polí (vč. „Bez zálohy", vlastní text), Z1 — nabídka a SoD mají týž milník (dnes selže), dopočet, 6 řádků max, poškozená data |
| **F2 dokumenty** | `kryciPlatebniKalendar` čte kalendář; `kryciPlatebniSymboly` a `kryciSodPlatby` skládají z milníku; SoD v1 a CN v13 zábrany; kontrola `platbyMilnikPreklad`; varování „SoD × odeslaná nabídka" (Q5) | M | rozšířit `test_platby_ock.js`, `test_podminky_texty.js`, `test_o7_zmrazeni.js` (zamčená varianta beze změny ve 4 jazycích), Z3 (DE bez češtiny, dnes selže), `test_sod` |
| **F3 UI** | editor kalendáře v krycím listu OCK (`kryci_ui.js`, vzor `plan_plateb_ui.js`), katalog milníků v Nastavení (`podminky_ui.js`), tisk krycího listu | M | prohlížeč `overit_kalendar_ock.mjs` (předvolba, přidání, součet, zamčení, role); pouští koordinace v celém kole |
| F4 evidence | příručka, CHANGELOG, roadmapa (#367 → hotovo, P10b), verze | S | — |

Celkem **M–L ≈ 2 dávky** (F1+F2 jedna, F3+F4 druhá). Cílené mutace: dopočet
posledního řádku, `pravidlaPlateb` u zamčené varianty, zábrana překladu,
převod „Bez zálohy". Šablony se nevyrábějí.

---

## 7. Rizika

| riziko | proč | opatření |
|---|---|---|
| **Zámek odeslané nabídky** | změna skládání vět by přepsala text už odeslaných nabídek a SoD k nim | značka `pravidlaPlateb = 2` jen u nově zamčených; starší čtou dnešní kód ze zmrazených tří polí; test `test_o7_zmrazeni` ve 4 jazycích jako pojistka |
| **SoD k odeslané nabídce s rozporem Z1** | stará nabídka má větu „po ukončení výroby…", SoD z ní dnes „po zahájení montáže" | varování v kontrole (Q5); obchodník rozhodne, SoD se nemění samo |
| **Změna textu smlouvy u výchozí zakázky** | Q1 A mění 2. řádek SoD | výslovný souhlas J. V. s firemním zněním milníku; zapsat do CHANGELOG jako změnu výstupu |
| **Jazykové verze EN/DE/FR** | nové milníky katalogu a vlastní milníky bez překladu; FR překlady 2b ještě nezkontrolované | továrna milníků = dnešní slovník (výstup se nezmění); zábrana bez překladu; nové texty do kontroly rodilým mluvčím (Q9) |
| **Starší šablony** (CN v13, SoD v1) | neumějí víc než 3 splátky / vlastní milník | zábrana s vysvětlením (vzor dnešní chyby u měsíční fakturace); ověřit, zda se v produkci ještě používají (Q6) |
| **Firma bez nových klíčů** | uložená firma se při načtení nahrazuje celá (kap. 8a návrhu 19. 10.) | katalog jen přes `podminkyEf` při čtení, nikdy spoléhat na uložené klíče |
| **Parita prohlížeč × server** | převod při importu by rozbil zamčené varianty (N43) | převod jen při čtení, nic se nezapisuje |
| Úpravy Firmy z 19.–22. 10. | administrátor mohl změnit věty `vety.zaloha/faktura2` | převod do katalogu je převezme jako texty milníků `podpis` / `vyroba` (Q4) |

---

## 8. Co potřebuju od J. V. (výběr na jednu obrazovku)

1. **Q1** — milník z krycího listu přes katalog (A)? A jaké je **firemní znění
   2. milníku** v nabídce i SoD: „po ukončení výroby, dodání materiálu na
   stavbu a zahájení prací" (doporučeno), nebo „po zahájení montáže"?
2. **Q2** — kalendář OCK 1–6 splátek s předvolbami?
3. **Q3** — vlastní milník u zahraniční zakázky jen s překladem (zábrana)?
4. **Q5** — varování u SoD k odeslané nabídce, kde se milník liší?
5. **Q6** — používá se ještě CN v13 / SoD realizace v1?
6. **Q7, Q8** — částky v Kč v SoD OCK a platební kalendář v exportu: odložit?
7. **Q9, Q10** — překlady jako samostatná položka; #367 uzavřít a založit P10b?
