# Návrh VS — víc šachet v jedné nabídce OCK (komplexní návrh, 5. 11. 2026)

Dávka VS. Artefakt s náhledy obrazovek:
https://claude.ai/artifact/PvayKJSLqoKbtUXHCPzNWa .
Větev `claude/vs-vice-sachet` nad `000924e` (= `main` = `test` = v4.11.8).

**Stav: návrh uzavřený rozhodnutími R1–R11 (zbývají dvě drobné otázky O9–O10, oddíl 9). Nic se neprogramuje, dokud J. V. neřekne**
(„zatím připrav komplexní návrh, který si nejprve odladíme, a spustíme až
řeknu“, 5. 11. 2026). Všechny částky jsou **smyšlené a ilustrační**.

---

## 0. Rozhodnutí J. V. (dialog 5. 11. 2026)

| # | Rozhodnutí |
|---|---|
| R1 | **Architektura A** — šachty uvnitř varianty: `ock.zadani` = šachta 1, další šachty v `ock.dalsi[]`. |
| R2 | **Jednou za zakázku se nepočítá nic.** Každá šachta se počítá celá, jako by byla samostatná zakázka (včetně režie kanceláře, stavbyvedoucího, překladů, 3D zaměření, transportu, lešení, dílenské dokumentace a statiky). Cena zakázky = čistý součet šachet. Pole „N ks“ = čistý násobek šachty. |
| R3 | **Zaokrouhlení na tisíce jen na součtu** (šachty se nezaokrouhlují, `CEIL` až na celkové ceně), **jedna sleva** na celou nabídku s limitem ze součtu, **víc šachet jen v Modelu 2**. |
| R4 (O1) | **Cenová nabídka: tabulka šachet** (název, ks, cena), pod ní součet, sleva a cena celkem. |
| R5 (O2) | **Controlling jen za celou zakázku**, jako dnes (žádný list po šachtách). |
| R6 (O3) | **Pipedrive:** hodnota obchodu = cena celé nabídky, do poznámky seznam šachet (název, ks). |
| R7 (O4) | **Zaokrouhlovací rozdíl se rozpočítá do šachet** podle podílu na ceně; tabulka sedí na korunu, žádný řádek navíc (algoritmus 3.6). |
| R8 (O5) | **Stejné příplatky všech šachet se sloučí** do jednoho řádku s počtem (pravidla 5.1.1). |
| R9 (O6) | **Jeden krycí list za variantu** s tabulkou šachet. |
| R10 (O7) | **Nejvýš 10 šachet ve variantě**; šachta s N ks je jedna šachta. |
| R11 (O8) | **Ruční cena #561 platí pro všechny šachty varianty**, jedno potvrzení. |

---

## 1. Dnešní stav (stručně)

Varianta má jedno zadání `v.data.ock.zadani` (`DEFAULT_ZADANI`,
`src/engine.js:490`). Jediný vstup do výpočtu je `vypocetZ(v, jekly)`
(`src/zamek.js`): zamčená varianta vydá otisk, rozpracovaná spočítá
`vypocet(zadani, cenik, jekly, fixes)` (`src/engine.js:874`). Z výsledku
čte 10 míst (`nabidka.js`, `kryci.js`, `controlling.js`, `objednane.js` 3×,
`pd_nanecisto.js`, `sluzba.js`, `uloziste.js`, `zakazka.js`) a obrazovka
kalkulace. Koncovou cenu skládá `cenaNabidkyOck(vysl, sleva, zaokr)`
(`src/zaokrouhleni.js:173`): základ → sleva → obchodní zaokrouhlení.

Základ šachty je dnes `souhrn.zakladCena = CEIL(cena před zaokrouhlením,
1000)` (`engine.js:2233`), příplatky `CEIL(…, 1000)` zvlášť (`engine.js:2381`).
Ceník (vč. přirážky a ručních cen #561), sleva, obchodní zaokrouhlení,
zámek a Model patří **variantě**.

---

## 2. Datový model

```js
v.data.ock = {
  zadani: { ... },          // šachta 1 — beze změny cesty i obsahu
  fixes: true,              // Model 2 (víc šachet jen tady)
  nazev: 'Výtah A',         // NOVÉ, nepovinné; chybí = „Šachta 1“
  ks: 1,                    // NOVÉ, nepovinné; chybí = 1
  dalsi: [                  // NOVÉ, nepovinné; chybí / [] = dnešní zakázka
    { id: 's_k3x9', nazev: 'Výtah B', ks: 2, zadani: { ... } }
  ]
}
```

- `zadani` šachty 2+ má **úplně stejný tvar** jako dnes (`DEFAULT_ZADANI`,
  vč. můstků `Z.mustky[]` z dávky MU #560, opláštění, volitelných,
  příplatků, vlastních položek, přepisů množství a názvů, `nepocitat`).
- Pomocná funkce `sachtyZ(d)` vrací jednotný seznam
  `[{ id:'s1', nazev, ks, zadani }, ...dalsi]`; nový kód čte jen ji.
- **Stará zakázka nemá `dalsi` ani `ks` → nemění se nic**, žádná migrace,
  import nic nedoplňuje (pozor: import dnes doplňuje chybějící klíče
  ze vzoru — `dalsi` ani `ks` do `DEFAULT_ZADANI` ani do vzoru `ock`
  **nepatří**, stejně jako se to řešilo u `mustkyKs`).
- `id` šachty: jedinečné v rámci varianty (`s_` + náhodný řetězec), stálé
  i po přejmenování; podle něj se váže otisk, kontroly a controlling.
- Klon a „Nová varianta (kopie otevřené)“ kopírují `dalsi` celé (nová `id`
  šachet se nevytvářejí — jsou jedinečné jen uvnitř varianty).
- **Server (`uloziste.js`):** kontrola tvaru `ock.dalsi` (pole objektů,
  `ks` celé číslo 1–20, `nazev` text do 80 znaků, `zadani` stejná kontrola
  jako šachta 1) a **limit nejvýš 10 šachet** (R10; šachta s N ks se počítá jako jedna) — jinak by šlo
  poslat zakázku s tisíci šachet a zahltit výpočet (bezpečnost).

---

## 3. Výpočet

### 3.1 Vzorce

Pro šachtu *i* (počet kusů *kᵢ*):

```
Rᵢ = vypocet(zadaniᵢ, cenik, jekly, true)        // jádro beze změny
Uᵢ = Rᵢ.souhrn.zakladCenaPredZaokr               // NOVÉ pole, viz 3.3
Nᵢ = Rᵢ.souhrn.zakladNaklad
Pᵢ = Rᵢ.souhrn.priplatkyCenaPredZaokr             // NOVÉ pole

Základ zakázky   Z  = CEIL( Σ kᵢ·Uᵢ , 1000 )        // R3: jen na součtu
Náklad zakázky   N  = Σ kᵢ·Nᵢ
Marže            M  = Z − N
Příplatky        P  = CEIL( Σ kᵢ·Pᵢ , 1000 )
Koncová cena        = cenaNabidkyOck(součtový výsledek, sleva, zaokr)
                      // dnešní funkce beze změny: Z → sleva → obchodní zaokrouhlení
```

**Jedna šachta s `ks = 1`: obal vrátí přímo `R₁`** — nic nesčítá, nic
nepřepočítává, `CEIL` se nedělá podruhé. To je zlaté pravidlo
(oddíl 7): výsledek je tentýž objekt jako dnes, na haléř.

### 3.2 Tvar výsledku (aby výstupy nemusely všechny umět šachty hned)

`vypocetZakazkyOck(d)` vrací **stejný tvar jako dnešní `vypocet()`**
(`souhrn`, sekce, `profily`, `plechy`, `zaskleni`, `rezie`, `priplatky`…),
jen sečtený, a navíc:

```js
vysl.sachty = [ { id, nazev, ks, vysl: Rᵢ, cenaPredZaokr: kᵢ·Uᵢ,
                  cenaRozpis /* celé Kč, algoritmus 3.6 */ } , ... ]
```

- Řádky sekcí se slučují podle **původního názvu a jednotkové ceny**:
  množství a náklad se sečtou × *kᵢ*. Stejný ceník → stejná položka
  se sloučí; vlastní položka s jinou cenou zůstane zvlášť.
- Kdo o šachtách neví (dnešní kód), dostane platný součet. Kdo o nich ví
  (CN, specifikace, KL, Pipedrive), čte `vysl.sachty`. Controlling čte jen
  sečtené kapitoly (R5) a nemění se.
- `vypocetZ(v, jekly)` v `zamek.js` (jediné místo rozhodnutí otisk / výpočet)
  volá místo `vypocet` obal — tím se změna dostane do všech 10 míst najednou.

### 3.3 Co se v jádře změní

Jen **přidání dvou polí do `souhrn`** (`zakladCenaPredZaokr`,
`priplatkyCenaPredZaokr`) — žádné jiné pole se nemění. Dnes se cena před
zaokrouhlením dá dopočítat jako `zakladNaklad + zakladMarze`, ale součet
v plovoucí čárce se může lišit o zlomek haléře a `CEIL` na hraně tisícovky
by pak skočil o 1 000 Kč. Proto vlastní pole.

### 3.4 Sleva, schvalování, ruční ceny, přirážka

- **Sleva jedna** (`v.data.sleva`), `slevaPodil` a pravidla `sleva.js`
  (pojistka marže, strop role, schvalování nad strop) běží nad **součtem**
  — `Z` a `M`. Žádost o schválení ukazuje součet a počet šachet.
- **Obchodní zaokrouhlení** (`v.data.zaokr`) jednou na konci (beze změny).
- **Ruční ceny (#561)** se váží na cestu ceníku varianty (`C.…`) → platí
  pro všechny šachty stejně; potvrzení obchodníkem jedno (R11).
- **Globální přirážka** (`c.marze`) z ceníku varianty — společná.
- **Můstky (#560, dávka MU):** `Z.mustky[]` je uvnitř zadání každé šachty,
  počítá se s šachtou, sekce MŮSTKY v CN se tiskne pod svou šachtou.

### 3.5 Model 1

Model 1 je předloha Excel 1:1 a ta zná jednu šachtu. U varianty
v Modelu 1 je tlačítko „+ přidat šachtu“ neaktivní s vysvětlením
„Víc šachet počítá jen Model 2“ a nabídkou „Přepnout variantu na Model 2“
(stejná akce jako dnes). Obal u `fixes === false` s neprázdným `dalsi`
(např. ručně upravený soubor) počítá jen šachtu 1 a kontrola to hlásí jako
chybu, která zastaví tisk.

### 3.6 Rozpočet zaokrouhlení do šachet (R7)

Cíl: ceny šachet v tabulce CN, KL a SoD jsou celé koruny a dávají
**přesně** základ zakázky `Z` (už zaokrouhlený na tisíce). Bez plovoucí
čárky, vždy stejný výsledek.

Vstup: `Z` (celé Kč), `sᵢ = kᵢ·Uᵢ` převedené na **celé haléře**
(`Math.round(sᵢ·100)`), počítá se v `BigInt`, `S = Σ sᵢ`.

```
1. Je-li jen jedna šachta → cena = Z. Je-li S = 0 → všem 0 (a Z = 0).
2. Pro každou šachtu:  qᵢ = ⌊Z·sᵢ / S⌋   (celé Kč)
                       zbᵢ = (Z·sᵢ) mod S  (zbytek dělení)
3. Chybějící koruny:   r = Z − Σ qᵢ       (vždy 0 ≤ r < počet šachet)
4. Po jedné koruně je dostanou šachty seřazené podle:
     a) většího zbᵢ (největší „useknutá“ část),
     b) při shodě větší sᵢ (dražší šachta),
     c) při shodě nižší pořadí šachty v zadání.
5. cenaRozpisᵢ = qᵢ (+1, pokud dostala korunu).  Σ = Z přesně.
```

Příklad (ilustrační): Výtah A s = 1 184 350,40, Výtah B 2 ks s = 2 082 241,50,
Z = 3 267 000 → q = 1 184 498 a 2 082 501, r = 1 → koruna připadne B
(větší zbytek) → **1 184 498 + 2 082 502 = 3 267 000**.

- Rozpočítává se **základ před slevou**; sleva a obchodní zaokrouhlení
  jsou pod tabulkou jednou za nabídku (dnešní `cenaNabidkyOck`).
- V tabulce je u šachty s ks > 1 cena **za řádek** (všechny kusy); cena za
  kus se netiskne, aby se nemusela dělit (otázka O9).
- Uloží se do otisku (`sachty[].cenaRozpis`), dotisk ji nepočítá znovu.
- Test `test_vs_rozpocet.js`: součet = Z pro 10 000 náhodných sad (1–10
  šachet, ks 1–20, ceny 0 – 10 mil. Kč), deterministika (2× stejný vstup =
  stejný výstup, pořadí šachet se při shodě drží), krajní případy (1 šachta,
  S = 0, Z přesně na tisícovce, všechny zbytky stejné), příklad výše.

### 3.7 Výkon

Jeden `vypocet` trvá jednotky milisekund. Obrazovka při psaní přepočítá
jen **aktivní šachtu** a součet poskládá z uložených výsledků ostatních
(mezipaměť podle otisku zadání šachty). 10 šachet × pár ms = pod 50 ms
i při plném přepočtu.

---

## 4. Obrazovky

| Obrazovka | Změna |
|---|---|
| **Zadání (Kalkulace OCK)** | Nad kartami pruh šachet „Výtah A · Výtah B 2 ks · + přidat šachtu“. Akce: Přejmenovat, Kopírovat šachtu, Počet ks, Smazat (jen šachta 2+; šachtu 1 nejde smazat, jen přejmenovat). Karty pod pruhem patří vybrané šachtě, jsou to tytéž karty jako dnes. Hlavička zakázky / varianty (místo, model, ceník, sleva) zůstává nad pruhem a je společná. |
| **Hlavička ceny (KPI)** | Hlavní číslo = koncová cena za variantu (součet). Pod ní řádek s rozpisem „Výtah A 1× · Výtah B 2× · součet“, klik otevře šachtu. U jedné šachty se rozpis nezobrazuje (obrazovka jako dnes). |
| **Záložky kalkulace** (Dimenze profilů, Práce a režie, Cenová kalkulace, Hrubá OCK, Opláštění, Volitelné, Režie, Příplatky) | Přepínač „Výtah A · Výtah B · Součet“. V šachtě se edituje jako dnes, ceny šachty bez zaokrouhlení na tisíce (jen informačně „podíl na součtu“). Pohled Součet je jen ke čtení (sloučené řádky, × ks). |
| **Sleva** | Beze změny ovládání; nad polem „Sleva se počítá z ceny celé nabídky (3 šachty, 4 ks)“. |
| **Cenová nabídka (náhled)** | Viz oddíl 5. |
| **Technická specifikace** | Společné údaje jednou, pak oddíl za šachtu (název, ks, rozměry, provedení, můstky). |
| **Krycí list OCK** (R9: jeden list za variantu) | Předmět „OCK – 2 šachty, 3 ks (Výtah A, Výtah B 2 ks)“, hodnota = koncová cena, nová tabulka rozpisu po šachtách. Hodiny montáže a materiál = součet. |
| **SoD** | Předmět díla vyjmenuje šachty s počty, cena díla = koncová cena, rozpis v příloze / článku o ceně. |
| **Přehled nabídek** (`seznam.js`) | Jeden řádek za variantu, cena = součet, u názvu štítek „2 šachty / 3 ks“; hledání najde i podle názvu šachty. |
| **Porovnání variant** | Porovnávají se součty, přibude řádek „Počet šachet / ks“. |

---

## 5. Výstupy

### 5.1 Cenová nabídka a Word šablona
- **R4: tabulka „Rozpis ceny po šachtách“** (šachta, ks, cena za řádek
  podle 3.6) a součet, pod ní sleva a koncová cena jako dnes. Technický
  popis po šachtách; shodné šachty (ks > 1) jednou s počtem kusů.
- **R8: příplatky sloučené** do jednoho seznamu za nabídku (5.1.1).
- Word: nová smyčka `{#sachty}{nazev}{ks}{cena}{/sachty}` a značka
  `{pocetSachet}`; **nová verze šablony** (v serverových šablonách
  `sablony_online.js` s verzí, razítko slovníku v zámku zůstává).
- Stará šablona bez smyčky: zakázka s jednou šachtou se tiskne jako dnes;
  zakázka s víc šachtami → zábrana tisku „Šablona neumí rozpis po šachtách,
  použijte šablonu verze N“.

#### 5.1.1 Sloučení příplatků (R8)

- **„Stejný“ příplatek** = stejný klíč příplatku (`p.key`, např.
  `leseniVnejsi`, `haky`, `sokl`, `zabradli`, `vsgFolie`; u vlastního
  příplatku z katalogu `kid`, u ručního vlastního příplatku název po
  normalizaci mezer a velikosti písmen) **a** stejná jednotková sazba
  (cena za jednotku bez fixní části, na haléř).
- Sloučený řádek: název, **počet = Σ kᵢ·množstvíᵢ** (jednotka jako dnes —
  ks, m, m²), **cena = Σ kᵢ·cenaᵢ** (vč. fixní části každé šachty, R2),
  pod názvem drobně „Výtah A, Výtah B 2×“, kterých šachet se týká.
- **Liší-li se sazba** (např. dva ruční příplatky téhož názvu s jinou
  cenou), řádky se nesloučí: každá sazba má svůj řádek s výčtem šachet.
- Příplatek, který mají jen některé šachty (háky jen venkovní), má výčet
  jen těch šachet.
- Pořadí řádků: jako dnes u šachty 1, příplatky ostatních šachet za nimi
  v pořadí, v jakém se objevily.
- Celkem příplatků `P = CEIL(Σ, 1000)` (oddíl 3.1). Ceny jednotlivých
  řádků se tisknou jako dnes (bez rozpočtu zaokrouhlení).
- Výběr příplatků do nabídky (sloupec Nabídka) zůstává po šachtách;
  sloučí se jen to, co je vybrané.
- Test `test_vs_priplatky.js`: shodný klíč a sazba → 1 řádek se součtem;
  jiná sazba → 2 řádky; příplatek jen u jedné šachty; ks × množství.

### 5.2 Krycí list a SoD
Viz tabulka v oddíle 4. Zmrazení krycího listu po Prodáno (#540) zmrazí
i rozpis.

### 5.3 Controlling
**R5: jen za celou zakázku, jako dnes.** Export čte sečtené kapitoly
z obalu (oddíl 3.2) — tvar listu, sloupce i navazující tabulky se nemění,
`controlling.js` se neupravuje (jen test, že součet sedí). Do hlavičky
exportu se doplní počet šachet / kusů jako text.

### 5.4 Pipedrive
**R6:** hodnota obchodu = **koncová cena celé nabídky** (jako dnes); do
poznámky obchodu seznam šachet „Výtah A 1 ks, Výtah B 2 ks“. Jedna šachta =
poznámka jako dnes (nic nového). Produkty po šachtách se nezakládají.

### 5.5 Zámek a otisk
- `zamekVysledek(v).ock` = součtový výsledek **včetně `sachty[]`** → dotisk
  CN, KL, SoD ze snímku dává tentýž rozpis.
- Otisk dostane `sachtyVerze: 1`. Starý otisk bez něj = jedna šachta, čte
  se jako dnes.
- Zamčená (odeslaná) varianta: přidat / kopírovat / smazat šachtu nejde;
  nová šachta = nová varianta (dnešní pravidlo).
- Prodáno a řídící varianta (#563) beze změny — platí pro variantu celou.

### 5.6 Kontroly před nabídkou
- **Po šachtách** (rozměry, standard, můstky, světlíky, opláštění) — hláška
  nese název šachty: „Výtah B: …“.
- **Za variantu** (marže, sleva, ruční ceny nepotvrzené, Model 1 s víc
  šachtami, šablona bez rozpisu, prázdný název šachty → doplní se
  „Šachta N“).

### 5.7 PROJ
Projekce (`engine_proj.js`) se v této položce **nemění** — počítá se dál
za zakázku. Projekce po šachtách je samostatné téma (např. kolaudace „pro
1 ks výtahu“), případně další položka roadmapy.

---

## 6. Kompatibilita

- Stará zakázka = jedna šachta, **žádná migrace dat ani ceny**.
- Odeslané nabídky drží zámek a otisk; nic se nepřepočítává.
- Ceník se nemění (žádné nové klíče kvůli šachtám).
- Server přijme zakázku bez `dalsi` jako dnes; zakázku s `dalsi` jen
  aplikace ve verzi, která šachty umí (starší otevřená karta prohlížeče by
  `dalsi` při uložení zahodila → NOVÁ kontrola serveru: odmítnout
  uložení, když uložená verze `dalsi` má a posílaná ne, kód 409).

---

## 7. Testy

| Test | Co hlídá |
|---|---|
| `test_vs_zlata_sada.js` | Všechny fixtury (`src/fixtury`) + 1 000 náhodných zadání z fuzzu: `vypocetZakazkyOck` = `vypocet` (hluboká rovnost, tentýž objekt), CN, KL, SoD, controlling a PD na haléř a znak po znaku jako v4.11.8. |
| `test_vs_rozpocet.js` | Rozpočet zaokrouhlení (3.6): součet = Z, deterministika, krajní případy. |
| `test_vs_priplatky.js` | Sloučení příplatků (5.1.1). |
| `test_vs_soucet.js` | 2 šachty: `Z = CEIL(U₁+U₂)`, ne `CEIL(U₁)+CEIL(U₂)`; ks = 2 je přesně šachta + kopie šachty; sloučení řádků sekcí. |
| `test_vs_hrana_tisicovky.js` | Součet těsně nad / pod tisícovkou (proč nové pole `zakladCenaPredZaokr`). |
| `test_vs_sleva.js` | Strop role a schvalování ze součtu; marže po slevě. |
| `test_vs_vystupy.js` | Rozpis v CN sedí na součet, specifikace po šachtách, KL s tabulkou šachet, SoD, controlling = součet, PD hodnota + poznámka. |
| `test_vs_zamek.js` | Otisk s `sachty[]`, dotisk; starý otisk bez `sachtyVerze`. |
| `test_vs_server.js` | Validace `ock.dalsi`, limit počtu šachet, 409 při ztrátě `dalsi` (nová kontrola). |
| `test_vs_model1.js` | Model 1 + `dalsi` → počítá jen šachtu 1 + zábrana. |
| Mutace | Obal `vypocetZakazkyOck` a `sachtyZ` jako nové mutační cíle jádra. |

Každý test s pojistkou „před implementací selže“.

---

## 8. Etapy, pracnost, rizika

| Etapa | Obsah | Pracnost |
|---|---|---|
| E1 | Data `dalsi`/`ks`/`nazev`, `sachtyZ`, obal `vypocetZakazkyOck`, 2 nová pole v `souhrn`, `vypocetZ` přes obal, validace serveru, zlatá sada | M |
| E2 | Zadání: pruh šachet, přidat / kopírovat / přejmenovat / smazat, ks, Model 1 | M |
| E3 | KPI s rozpisem, záložky kalkulace (šachta / Součet), sleva a schvalování ze součtu, přehled nabídek, porovnání variant | M |
| E4 | CN (náhled + Word, nová verze šablony), technická specifikace | L |
| E5 | KL, SoD, controlling (jen test součtu), Pipedrive (poznámka), zámek a otisk, kontroly | M–L |
| E6 | Celé testovací kolo, mutace (po částech), ruční zkouška na testu | M |

Celkem **XL**. E1 nemá dopad na obrazovku (u jedné šachty se nic
nemění) a dá se sloučit samostatně jako bezpečný první krok.

**Rizika**
1. *Tichá změna ceny staré zakázky* — zlatá sada; obal u jedné šachty
   vrací `R₁` beze změny.
2. *Skok o 1 000 Kč na hraně tisícovky* — nové pole ceny před zaokrouhlením.
3. *Rozpis v CN nesedí na součet* — kvůli R3 (zaokrouhlení jen na součtu);
   řeší rozpočet 3.6 (R7).
4. *Word šablony v oběhu* — verze šablony a zábrana tisku.
5. *Starší otevřená karta zahodí šachty* — 409 na serveru.
6. *Výkon a zneužití* — limit počtu šachet a ks na serveru.
7. *Souběh s dávkou MU (#560)* — `Z.mustky[]` je uvnitř zadání šachty,
   takže se nic nekříží; jen pořadí slučování (MU dřív).

---

## 9. Otázky

O1–O8 rozhodl J. V. 5. 11. 2026 (R4–R11 v oddíle 0). Při zapracování
vyplynuly dvě drobnosti:

- **O9 — Cena v tabulce u šachty s víc kusy.** Má být u Výtahu B (2 ks)
  cena za oba kusy dohromady, nebo za jeden kus?
  *Doporučeno:* za oba kusy dohromady (řádek pak sedí na součet a nic se
  nedělí). *Jinak:* dva sloupce, cena za kus i celkem (cena za kus se pak
  musí zaokrouhlit a kus × počet nemusí přesně sedět).
- **O10 — Sloučený příplatek v nabídce.** Když je třeba vnější lešení
  sloučené pro Výtah A i Výtah B, objednává ho zákazník jen pro všechny
  šachty najednou?
  *Doporučeno:* ano, jeden řádek = jedna volba; kdo chce příplatek jen
  pro jednu šachtu, obchodník ho u druhé šachty odškrtne a nabídka vydá
  dva řádky. *Jinak:* u sloučeného řádku uvést i cenu za každou šachtu
  zvlášť.

## 10. Položka roadmapy

Zapsaná do `roadmapa/roadmap.json` jako **#570** (vlna C, `ceka`,
složitost XL, závisí na #560). Koordinace může přečíslovat.

---

## 11. Prompt pro realizaci (po pokynu J. V.)

> Dávka VS-R (#570): víc šachet v jedné nabídce OCK. Založ větev
> `claude/vs-realizace` nad `<VÝCHOZÍ_COMMIT>` (určí koordinace).
> Pracuj česky podle `CLAUDE.md`; na začátku `bash nastroje/instaluj_hooky.sh`,
> `git push --no-verify` zakázané, do `test-draft` / `test` / `main` nic.
> Závazný návrh: `podklady/NAVRH_VICE_SACHET_05_11.md` (rozhodnutí R1–R11,
> O9 a O10 podle odpovědí J. V.). Dávka MU (#560, `Z.mustky[]`) musí být
> sloučená dřív.
>
> Postupuj po etapách, po každé commit + push + `PREDAVKA.md`:
> - **E1** data `ock.nazev/ks/dalsi[]`, `sachtyZ`, obal `vypocetZakazkyOck`
>   (stejný tvar výsledku + `sachty[]`), pole `zakladCenaPredZaokr`
>   a `priplatkyCenaPredZaokr` v `souhrn`, rozpočet 3.6, `vypocetZ` přes obal,
>   validace serveru (`uloziste.js`, max 10 šachet, ks 1–20, 409 při ztrátě
>   `dalsi`), zlatá sada `test_vs_zlata_sada.js` + `test_vs_soucet.js`,
>   `test_vs_hrana_tisicovky.js`, `test_vs_rozpocet.js`, `test_vs_server.js`.
>   Na obrazovce se nic nemění.
> - **E2** zadání: pruh šachet, přidat / kopírovat / přejmenovat / smazat,
>   ks, Model 1 (přepnutí na Model 2), `test_vs_model1.js`.
> - **E3** hlavička ceny s rozpisem, záložky kalkulace (šachta / Součet),
>   sleva a schvalování ze součtu (`test_vs_sleva.js`), přehled nabídek,
>   porovnání variant.
> - **E4** CN (náhled + Word: smyčka `{#sachty}`, nová verze šablony,
>   zábrana staré šablony), sloučené příplatky 5.1.1 (`test_vs_priplatky.js`),
>   technická specifikace.
> - **E5** krycí list (jeden za variantu s tabulkou), SoD, controlling
>   (beze změny, test součtu), Pipedrive (poznámka), zámek a otisk
>   (`sachtyVerze`, `test_vs_zamek.js`), kontroly po šachtách,
>   `test_vs_vystupy.js`.
> - **E6** celé testovací kolo (mutace po částech), ruční zkouška na
>   testovacím webu, CHANGELOG, roadmapa #570 → hotovo.
>
> Každý nový test s pojistkou „před implementací selže“ (do commitu).
> Zakázka s jednou šachtou musí dát na haléř výsledek i dokumenty jako
> výchozí commit. Na konci ohlas koordinaci: SHA, verze, výsledek kola.
