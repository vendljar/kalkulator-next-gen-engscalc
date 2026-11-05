# Návrh VS — výpočet OCK pro víc šachet v jedné nabídce (5. 11. 2026)

Dávka VS, zadání J. V. 5. 11. 2026 přes koordinaci. Artefakt s náhledy obrazovek: https://claude.ai/artifact/PvayKJSLqoKbtUXHCPzNWa . **Jen návrh k rozhodnutí,
kód aplikace se nemění.** Větev `claude/vs-vice-sachet` nad `000924e`
(= `main` = `test` = v4.11.8). Všechny částky v textu i v artefaktu jsou
**smyšlené a ilustrační**, nejde o ceny z ceníku.

---

## 1. Dnešní stav (co předpokládá „jedna šachta“)

**Model dat.** Zakázka → `varianty[]` → `v.data.ock = { zadani, fixes }`.
`zadani` je jedna šachta (`DEFAULT_ZADANI`, `src/engine.js:490`), `fixes`
volí Model 1 (`false`, předloha Excel 1:1) nebo Model 2 (`true`).
Výpočet `vypocet(zadani, cenik, jekly, fixes)` (`src/engine.js:874`) vrací
sekce (hrubá OCK, opláštění, volitelné, režie, příplatky…) a `souhrn`
se `zakladCena = CEIL(…, 1000)` (`engine.js:2233`). Ceník (`v.data.cenik`,
vč. přirážky `c.marze` a ručních cen #561 `v.data.rucniCeny`) je **jeden na
variantu**, sleva (`v.data.sleva`) a obchodní zaokrouhlení (`v.data.zaokr`)
také.

**Kde všude se počítá s jednou šachtou** (každé místo volá `vypocetZ(d)` →
jeden výsledek):

| Oblast | Soubor | Co čte |
|---|---|---|
| Zadání a záložky kalkulace | `app_template.html`, `engine.js` | `d.ock.zadani` |
| Hlavička ceny (KPI) | `app_template.html` | `souhrn` jednoho výpočtu |
| Cenová nabídka + Word šablona | `nabidka.js`, `docxgen.js`, `sablona_obsah.js` | jedna šachta, jedna cena |
| Technická specifikace | `techspec.js` | rozměry jedné šachty |
| Krycí list OCK | `kryci.js:577` | `cenaNabidkyOck` jednoho výpočtu |
| SoD | `sod.js` | předmět + cena |
| Controlling | `controlling.js` | kapitoly jednoho výpočtu |
| Pipedrive | `pd_nanecisto.js`, `sluzba.js` | hodnota dealu |
| Zámek a otisk | `zamek.js`, `zakazka.js` | otisk jednoho výpočtu |
| Porovnání variant | `zakazka.js:1175` | `c.ock.souhrn` |
| Kontroly před nabídkou | `kontroly.js` | jedna šachta |

**Jak se víc šachet řeší dnes:** pole typu počet (nástupiště, můstky) —
jen uvnitř jedné šachty; varianta 1/2 — slouží jako **alternativy** nabídky,
ne součet; klon / „Nová varianta (kopie otevřené)“ — kopie, ne součet.
Obchodník tedy dnes víc šachet buď sčítá ručně mimo aplikaci, nebo posílá
víc nabídek.

**Musí zůstat:** sleva a schvalování (výjimky), obchodní zaokrouhlení,
globální přirážka, Model 1 / Model 2, zámek a otisk, Prodáno a řídící
varianta (#563), ruční ceny (#561).

---

## 2. Varianty architektury

### A — Šachty uvnitř varianty (DOPORUČENO)
Varianta nese seznam šachet; každá má vlastní zadání, název a počet kusů.
Výpočet běží po šachtách, sčítá se, nabídka má jednu cenu a rozpis.
- **+** jedna nabídka, jedna sleva, jeden zámek, jedno číslo CN; varianty
  zůstávají alternativami (varianta 1 = 3 šachty ocel, varianta 2 = 3 šachty sklo).
- **+** jádro `vypocet()` se nemění — volá se N×, nový je jen součtový obal.
- **−** všechny výstupy se musí naučit rozpis (pracné, ale jednorázové).

### B — Součtová (souhrnná) varianta
Nadřazená „souhrnná nabídka“ skládá několik variant (každá = šachta) do jedné CN.
- **+** varianty a jejich výpočty se nemění vůbec.
- **−** varianty dnes znamenají alternativy; míchání dvou významů rozbije
  porovnání, řídící variantu (#563), Prodáno i číslování CN (…555.2).
- **−** sleva, zámek, zaokrouhlení by byly dvakrát (na variantě i na souhrnu);
  co se zamyká? Nejasné pro obchodníka i pro server.

### C — Násobek
Jen pole „počet stejných šachet“ × jedna šachta, s pravidly, co se nenásobí.
- **+** nejlevnější (dny), pokryje častý případ dvou stejných šachet.
- **−** neumí dvě různé šachty (jiná výška, int/ext) — to je ale běžné.
- Vejde se do A jako pole „ks“ u šachty, takže C je **první krok A**, ne
  alternativa.

**Doporučení: A**, s polem „N ks stejné šachty“ (tím je C v ní obsažena).

---

## 3. Doporučená varianta A podrobně

### 3.1 Data (kompatibilní)

```
v.data.ock = {
  zadani: {...},            // šachta 1 — BEZE ZMĚNY cesty i obsahu
  fixes: true,
  nazev: 'Výtah A – dvorní trakt',   // nepovinné, jen u víc šachet
  ks: 1,                    // nepovinné; chybí = 1
  dalsi: [                  // chybí nebo [] = zakázka s jednou šachtou
    { id: 's2…', nazev: 'Výtah B – uliční trakt', ks: 2, zadani: {...} }
  ],
  spolecne: { kde: 'sachta1' }  // kam patří položky „jednou za zakázku“
}
```

Proč `zadani` + `dalsi[]`, a ne rovnou `sachty[]`: **stará zakázka se ani
nedotkne**, všechny dnešní čtení `d.ock.zadani` fungují pro šachtu 1, import
nic nepřevádí a otisky zámků se nemění. Funkce `sachtyZ(d)` vrací jednotný
seznam `[{id:'s1', nazev, ks, zadani}, …dalsi]`, ze kterého čte nový kód.

### 3.2 Zadání (obrazovka)
- Nad kartami zadání pruh **„Šachta 1 · Šachta 2 · + přidat šachtu“** ve stylu
  dnešních záložek (`.tabs`), u každé název a štítek „2 ks“.
- Akce u šachty: **Přejmenovat · Kopírovat šachtu · Počet ks · Smazat**
  (smazat jen u šachty 2+, šachta 1 je „nosná“).
- Pod pruhem jedno zadání = vybraná šachta; karty jsou tytéž jako dnes.
- **Společné pro zakázku/variantu** (jednou, mimo přepínač): adresa, termíny,
  zákazník, ceník a přirážka, ruční ceny (#561, váží se na cestu ceníku),
  sleva, obchodní zaokrouhlení, Model, doprava/vzdálenost, jazyk, platební
  podmínky.
- **Po šachtách:** rozměry, typ, nástupiště, portály, světlíky, opláštění,
  můstky, profily, volitelné, příplatky, vlastní položky, přepisy množství
  a názvů, `nepocitat`, montáž/projekce hodiny (základ + atyp).

### 3.3 Výpočet
`vypocetZakazkyOck(d)`:
1. Pro každou šachtu `vypocet(zadani_i, cenik, jekly, fixes)` — **jádro beze
   změny**.
2. U šachty 2+ (a u kusů 2…N) se vynechají **položky „jednou za zakázku“**
   (seznam `SPOLECNE_POLOZKY`, viz tab.). Technicky: po výpočtu se z jejích
   sekcí odfiltrují řádky s těmito klíči/cestami ceníku — jádro se nemění.
3. Kusy: šachta s `ks = N` → položky po šachtách × N, „jednou za typ“
   (dílenská dokumentace, statika) × 1.
4. Rezerva a `CEIL(…, 1000)` **po šachtě** (stejně jako dnes), součet = součet
   zaokrouhlených šachet → rozpis v CN vždy sedí na korunu.
5. Sleva, schvalování a obchodní zaokrouhlení **jednou na součtu** — jako dnes
   na variantě.
6. Příplatky po šachtách (v CN „Příplatky – Výtah B“), nabízí se zvlášť jako dnes.

**Zlaté pravidlo:** `dalsi` prázdné a `ks` 1 → `vypocetZakazkyOck(d) ===
vypocet(d.ock.zadani, …)` objekt po objektu, na haléř. Nic se nefiltruje,
nic se nesčítá.

Návrh rozdělení položek (k potvrzení J. V., otázka 2 a 3):

| Položka (sekce) | Doporučení |
|---|---|
| Profily, plechy, zasklení, opláštění, lakování, spojovací materiál | po šachtách × ks |
| MONTÁŽ NA STAVBĚ, montáž můstků | po šachtách × ks |
| LEŠENÍ – množství (m) | po šachtách × ks |
| LEŠENÍ – fixní část (`C.leseniFix`, postavení + doprava) | jednou za zakázku |
| INTERNÍ TRANSPORT | jednou za zakázku |
| DÍLENSKÁ DOKUMENTACE, STATICKÉ POSOUZENÍ (+ opláštění) | jednou za **typ** šachty (× 1 i při ks > 1) |
| ZAMĚŘENÍ 3D SKENEREM, VÝSTUP ZE ZAMĚŘENÍ | jednou za zakázku |
| REŽIE KANCELÁŘE, PRÁCE STAVBYVEDOUCÍHO, PŘEKLADY | jednou za zakázku |
| ENGINEERING, ATYP přirážka | po šachtách (atyp je vlastnost šachty) |
| Příplatky (lešení vnější, háky, sklo…) | po šachtách |

**Model 1 vs. Model 2:** Model 1 je předloha Excel 1:1 a Excel zná jednu
šachtu → **víc šachet jen v Modelu 2**. Přidání druhé šachty u Modelu 1
aplikace nedovolí (hláška „Víc šachet počítá jen Model 2“). Stará zakázka
v Modelu 1 zůstává beze změny.

**Výkon:** jeden `vypocet` je v řádu milisekund; 5 šachet ≈ 5×. Přepočet
při psaní jen aktivní šachty + součet z mezipaměti ostatních.

**Ruční ceny (#561):** váží se na cestu ceníku varianty → platí pro všechny
šachty stejně (sklo od dodavatele pro celou zakázku). Potvrzení zůstává jedno.

### 3.4 Výstupy
- **Hlavička ceny:** dnešní KPI = součet; pod ní řádek rozpisu
  „Výtah A 1 × … · Výtah B 2 × … · společné …“; klik na šachtu ji otevře.
- **Kalkulace (záložky Hrubá OCK … Režie):** přepínač „Šachta 1 / 2 / Součet“;
  v pohledu Součet jen čtení, řádky sečtené podle položky.
- **Cenová nabídka:** nová tabulka „Rozpis ceny po šachtách“ (název, ks,
  cena za kus, cena celkem) + „Společné položky zakázky“ + součet, pod ní
  sleva a koncová cena jako dnes. Technický popis po šachtách; shodné
  šachty se tisknou jednou s „2 ks“.
- **Word šablona CN:** nová smyčka `{#sachty}…{/sachty}` a značka
  `{rozpisSachet}`; **nová verze šablony**. Stará šablona bez smyčky:
  kontrola před tiskem zastaví tisk zakázky s víc šachtami („šablona neumí
  rozpis po šachtách“), zakázka s jednou šachtou se tiskne jako dnes.
- **Technická specifikace:** oddíl za každou šachtu (název, ks, rozměry),
  společné údaje (adresa, termíny) jednou.
- **Krycí list OCK:** předmět „OCK – 3 šachty (A, B 2 ks)“, hodnota = součet,
  tabulka rozpisu po šachtách.
- **SoD:** předmět vyjmenuje šachty, cena = součet; příloha rozpis.
- **Controlling:** kapitoly × šachta (sloupec „Šachta“ v exportu, součtový
  list beze změny tvaru).
- **Pipedrive:** hodnota dealu = součet (tak jako dnes koncová cena);
  produktové řádky po šachtách až v další etapě.
- **Kontroly:** běží po šachtách, hláška nese název šachty.
- **Zámek a otisk:** otisk nese rozpis po šachtách a `sachtyVerze: 1`;
  starý otisk bez rozpisu se čte jako jedna šachta. Zamčená varianta se
  počítá ze svých uložených dat → beze změny.
- **Porovnání variant:** porovnává součty; řádek „počet šachet“.

### 3.5 Kompatibilita
- Stará zakázka = jedna šachta, **žádná migrace dat ani ceny**.
- Odeslané nabídky drží zámek a otisk; nic se nepřepočítává.
- Testy na haléř: zlatá sada „1 šachta = beze změny“ nad fixturami
  (`src/fixtury`) a fuzz `test_fuzz_invarianty.js` — porovnat celý výsledek
  `vypocetZakazkyOck` s `vypocet` a výstupy CN, KL, SoD, controlling (texty
  i čísla) s dneškem.

---

## 4. Etapy a pracnost

| Etapa | Obsah | Odhad |
|---|---|---|
| E1 | Datový model `dalsi[]`, `sachtyZ`, `vypocetZakazkyOck`, seznam společných položek v ceníku/konstantě, zlatá sada 1 šachta | M |
| E2 | Zadání: přepínač šachet, přidat/kopírovat/smazat/přejmenovat, ks; zákaz u Modelu 1 | M |
| E3 | Hlavička ceny s rozpisem, záložky kalkulace s pohledem Součet, sleva + schvalování ze součtu, porovnání variant | M |
| E4 | CN (náhled + Word, nová verze šablony), technická specifikace | L |
| E5 | Krycí list, SoD, controlling, Pipedrive, zámek/otisk, kontroly | L |

Celkem **XL** (víc než týden), dodatelné po etapách; E1 je bez dopadu na
obrazovku a dá se sloučit samostatně.

**Rizika:** (1) tichá změna ceny staré zakázky — kryje zlatá sada a pravidlo
„prázdné `dalsi` = žádný nový kód v cestě“; (2) dvojí započtení společných
položek — test součtu „2 stejné šachty jako 2 ks = šachta + šachta bez
společných“; (3) Word šablony u zákazníků — verze šablony a zábrana tisku;
(4) mutace jádra — nový obal má vlastní mutační cíle.

**Testy:** `test_vs_jedna_sachta.js` (zlatá sada, haléř), `test_vs_soucet.js`
(součty, ks, společné položky jednou), `test_vs_sleva.js` (sleva/schvalování
ze součtu), `test_vs_vystupy.js` (CN, KL, SoD, controlling rozpis), test
otisku starého zámku. Každý s pojistkou „před opravou selže“.

---

## 5. Otázky pro J. V. (doporučená odpověď první)

1. **Architektura?** — **A: šachty uvnitř varianty** (doporučeno) · B:
   souhrnná nabídka z variant · C: jen „počet stejných šachet“.
2. **Co se počítá jednou za zakázku?** — **Režie kanceláře, stavbyvedoucí,
   překlady, 3D zaměření + výstup, interní transport, fix lešení**
   (doporučeno) · jen režie kanceláře a překlady · nic, vše po šachtách.
3. **Shodné šachty „N ks“?** — **× N vše po šachtách, dílenská dokumentace
   a statika jen jednou** (doporučeno) · čistý násobek všeho · bez „ks“, jen
   kopie šachty.
4. **Zaokrouhlení na tisíce?** — **po šachtách, součet = součet šachet**
   (rozpis sedí, doporučeno) · jen na součtu (rozpis bez zaokrouhlení).
5. **Sleva a schvalování?** — **jedna sleva na celou nabídku, limit se
   posuzuje ze součtu** (doporučeno) · sleva po šachtách.
6. **Model 1 a víc šachet?** — **víc šachet jen v Modelu 2** (doporučeno) ·
   i Model 1 (každá šachta 1:1 Excel, součet).
7. **Rozpis v cenové nabídce?** — **tabulka po šachtách + součet, technická
   část po šachtách, shodné sloučené** (doporučeno) · jen celková cena,
   rozpis v příloze · samostatná CN za šachtu v jednom souboru.
8. **Controlling a Pipedrive?** — **Pipedrive = součet, controlling kapitoly ×
   šachta** (doporučeno) · controlling jen kapitoly za zakázku · Pipedrive
   s produktovým řádkem za šachtu hned.

---

## 6. Položka roadmapy (návrh, koordinace přečísluje)

```json
{
  "id": "570",
  "vlna": "C",
  "stav": "ceka",
  "hotovoV": "—",
  "dulezitost": "vysoka",
  "slozitost": "XL",
  "nazev": "VS: Víc šachet v jedné nabídce OCK (šachty uvnitř varianty, rozpis a součet)",
  "proc": "Zadání J. V. 5. 11. 2026 (dávka VS): zakázky s více výtahovými šachtami se dnes sčítají ručně nebo posílají jako víc nabídek; varianty slouží pro alternativy, ne pro součet.",
  "detail": "Návrh podklady/NAVRH_VICE_SACHET_05_11.md a artefakt VS. Doporučeno A: v.data.ock.zadani zůstává šachtou 1, další šachty v ock.dalsi[] s názvem a počtem ks; výpočet vypocet() po šachtách beze změny jádra + součtový obal, položky jednou za zakázku (režie kanceláře, stavbyvedoucí, překlady, 3D zaměření, interní transport, fix lešení), CEIL po šachtách, sleva/schvalování/zaokrouhlení ze součtu, jen Model 2. Výstupy CN (rozpis, nová verze Word šablony), technická specifikace, KL, SoD, controlling (kapitoly × šachta), Pipedrive (součet), zámek/otisk s rozpisem. Etapy E1–E5.",
  "kde": "src/engine.js (obal), src/zakazka.js, app_template.html, nabidka.js, docxgen.js, techspec.js, kryci.js, sod.js, controlling.js, pd_nanecisto.js, zamek.js, kontroly.js",
  "hotovoKdyz": "Zakázka s jednou šachtou dává na haléř dnešní výsledek ve výpočtu i ve všech výstupech (zlatá sada); zakázka se 2–3 šachtami a ks má jednu CN s rozpisem a součtem, sedící KL, SoD, controlling i Pipedrive; celé testovací kolo zelené.",
  "cekaNa": "rozhodnutí J. V. k otázkám 1–8 návrhu VS",
  "pozn": "Model 1 zůstává jedna šachta (Excel 1:1). Etapa E1 je bez dopadu na obrazovku a lze ji sloučit samostatně.",
  "zavisi": ["560"]
}
```
(`zavisi` #560: můstky v CN mají být po šachtách, je dobré je stavět ve
stejném tvaru.)
