# Návrh VS — víc šachet v jedné nabídce OCK (komplexní návrh, 5. 11. 2026)

Dávka VS. Artefakt s náhledy obrazovek:
https://claude.ai/artifact/PvayKJSLqoKbtUXHCPzNWa .
Klikací prototyp v7 (6. 11., R1–R18): https://claude.ai/artifact/PPL2GLSARywu7j2whk2KY2 — skutečná
sestavená aplikace v6.11.5 (další verze main, s kartou Můstky, MU3 a CA #575) + vrstva víc šachet (`podklady/vs_prototyp/`); u 1 šachty pixelově shodná s v6.11.5.
Větev `claude/vs-vice-sachet` nad `000924e` (= `main` = `test` = v4.11.8).

**Stav: NÁVRH UZAVŘEN, rozhodnutí R1–R21 (R19 = připomínka J. V. 10. 11. k prototypu v7, R20 = O15 a). R21 (10. 11.): VS se slučuje do integrace po etapách za vypínačem v Nastavení (jen správce, výchozí VYP). Realizace E0 + E1 + vypínač běží v sezení „VS-E0/E1 #570“, větev `claude/vs-e0e1` nad integrací 3ff5403. Podrobný plán realizace: `podklady/VS_PLAN_REALIZACE.md`. Nic se neprogramuje, dokud koordinace nepošle „SPUSŤ VS E<N> nad <SHA>“ na pokyn J. V.**
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
| R12 (O9) | **U šachty s víc kusy jen cena za všechny kusy dohromady** — tabulka CN má jeden sloupec ceny, cena za kus se netiskne. |
| R13 (O10) | **Sloučený příplatek = jedna volba pro všechny šachty**, kterých se týká; kdo chce příplatek jen pro jednu šachtu, obchodník ho u druhé odškrtne a nabídka vydá dva řádky. |
| R14 (O11, 6. 11.) | **U víc šachet se cena můstků v CN schová do ceny své šachty**; samostatný řádek Můstky zmizí (tabulka = řádky šachet + Cena celkem). |
| R15 (O12, 6. 11.) | **Jedna šachta s můstky zůstává v CN jako dnes** — „Výtahová šachta“, „Můstky“, „Cena celkem“ (v16 i v17 stejně). |
| R16 (6. 11., připomínka k prototypu) | **Jedna šachta = dnešní kalkulátor beze změny vzhledu.** Rozhraní víc šachet (karta Šachty varianty, přepínač šachta/Součet v kalkulaci, rozpis a rozpočet zaokrouhlení, tabulka šachet v CN, sloučené příplatky, rozpis v krycím listu) se ukáže až od 2 šachet (nebo když má šachta víc než 1 ks). Počet šachet se nastavuje na jednom jasném místě (O13); návrat na 1 šachtu vrátí dnešní zobrazení (O14). |
| R17 (O13, 6. 11.) | **Počet šachet se nastavuje polem „Počet šachet v nabídce“ (1–10) nahoře v kartě Zadání šachty**, nad Typem šachty. Zvýšení přidá šachty jako kopii poslední (název „Šachta N“). Počet stejných kusů je zvlášť u každé šachty (karta Šachty varianty) a ukáže se až v režimu víc šachet. Model 1 dovolí jen 1. |
| R18 (O14, 6. 11.) | **Snížení počtu šachet (i Smazat šachtu) se potvrzuje přímo na stránce** se jmény mazaných šachet; smažou se i jejich zadání, můstky a příplatky; šachta 1 zůstává vždy; omyl vrátí Zpět (historie). Návrat na 1 šachtu = dnešní zobrazení. |
| R19 (10. 11., připomínka k prototypu v7) | **Dvě čísla: Počet variant šachet v nabídce a Počet šachet celkem.** Pole R17 se jmenuje **„Počet variant šachet v nabídce“** (různé šachty, 1–10). U jedné šachty je v záhlaví karty Zadání šachty (jako R17). V režimu víc šachet se **přesune do záhlaví karty Šachty varianty** (vlevo od výběru zobrazit) a vedle něj je **„Počet šachet celkem: X ks“** jen ke čtení = Σ ks všech variant (např. 1 + 2 = 3). V záhlaví „Zadání šachty — Šachta N“ je místo něj **„Počet kusů této šachty: N ks“** převzaté z pole Počet stejných kusů (jedno místo pravdy). Všude, kde se mluví o počtu šachet (CN, krycí list, Pipedrive, controlling, štítky), se rozlišuje „variant šachet“ a „šachet celkem (ks)“. |
| R20 (O15, 10. 11.) | **U jedné šachty je v záhlaví Zadání šachty vedle „Počet variant šachet v nabídce“ i pole „Počet kusů“** (`CISLO_POLE`, výchozí 1). Zadání 2 a více kusů zapne režim víc šachet s jednou variantou (karta Šachty varianty, Počet šachet celkem = ks). Návrat na 1 ks (u jediné varianty) vrátí dnešní zobrazení. |
| R21 (J. V., 10. 11.) | **Vypínač „Víc šachet v nabídce“ v Nastavení** — mění jen správce, výchozí VYP, platí pro celý web. S VYP je aplikace přesně jako dnes (žádné pole Počet variant / Počet kusů, výpočet a dokumenty bajt po bajtu; hlídá zlatá sada). Se ZAP platí R16–R20. VS se slučuje do integrace po etapách (žádná sběrná větev), J. V. testuje na testovacím webu se ZAP. Zakázka s víc šachtami při VYP: cena a dokumenty podle dat, editace šachet zamčená s hláškou (potvrzeno J. V. 10. 11.). Podrobně `VS_PLAN_REALIZACE.md` oddíl 2. |

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
- **Technická specifikace po šachtách:** ruční hodnoty specifikace jsou
  dnes ve `v.data.techspec` (za variantu). Šachta 2+ dostane nepovinné
  `dalsi[i].techspec` jen pro pole, která popisují šachtu (typ, rozměry,
  opláštění, kotvení, povrch, můstky); chybí = předvyplnění z výpočtu té
  šachty. Pole za zakázku (stavba, termíny, podmínky) zůstávají ve
  `v.data.techspec`. Šachta 1 čte dál `v.data.techspec` beze změny.
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
Mᵢ = Rᵢ.souhrn.mustkyCenaPredZaokr                // NOVÉ pole (#560, jen skladebný model)

Základ zakázky   Z  = CEIL( Σ kᵢ·Uᵢ , 1000 )        // R3: jen na součtu
Náklad zakázky   N  = Σ kᵢ·Nᵢ
Marže            M  = Z − N
Příplatky        P  = CEIL( Σ kᵢ·Pᵢ , 1000 )
Můstky (#560)    Mu = min( CEIL( Σ kᵢ·Mᵢ , 1000 ), Z )   // jako dnes, jen ze součtu
                 souhrn.mustkyCena = Mu, souhrn.mustkyNaklad = Σ kᵢ·mustkyNakladᵢ
                 (jen když aspoň jedna šachta má sekci MŮSTKY; jinak pole chybí jako dnes)
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

- **Popisné (nesčitatelné) části výsledku** — `odvozene`, `parametry`,
  `oplasteni` (pásy, světlíky, razítko `skloJenSPlochou` z #572),
  `zaskleni.rozmer`, `zaskleni.vypln` — se v součtu **nepřepočítávají**:
  součet nese ty ze šachty 1 (aby kód, který o šachtách neví, dostal
  platná data a razítka), a kdo popisuje šachtu (specifikace, kontroly,
  nákres opláštění), čte vždy **výsledek své šachty** `sachty[i].vysl`.
  Funkce specifikace jako `tsMaSklo(Z, r)` a `tsOplPasyPoStenach(o, r)`
  se volají s dvojicí (zadání šachty, výsledek šachty), nikdy se součtem.
- Řádky sekcí se slučují podle **původního názvu a jednotkové ceny**:
  množství a náklad se sečtou × *kᵢ*. Stejný ceník → stejná položka
  se sloučí; vlastní položka s jinou cenou zůstane zvlášť.
- Kdo o šachtách neví (dnešní kód), dostane platný součet. Kdo o nich ví
  (CN, specifikace, KL, Pipedrive), čte `vysl.sachty`. Controlling čte jen
  sečtené kapitoly (R5) a nemění se.
- `vypocetZ(v, jekly)` v `zamek.js` (jediné místo rozhodnutí otisk / výpočet)
  volá místo `vypocet` obal — tím se změna dostane do všech 10 míst najednou.

### 3.3 Co se v jádře změní

Jen **přidání tří polí do `souhrn`** (`zakladCenaPredZaokr`,
`priplatkyCenaPredZaokr` a od #560 `mustkyCenaPredZaokr` =
`s5.sMarzi + rezMustky·(1 + m)`, jen když sekce MŮSTKY existuje) — žádné
jiné pole se nemění. Dnes se cena před
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
- **Můstky (#560, sloučeno v5.11.2):** skupiny `Z.mustky[]` jsou uvnitř
  zadání každé šachty a počítají se s ní (R2; limit skupin
  `MUSTKY_SKUPIN_MAX` platí na šachtu). Sekce MŮSTKY (`sekce.mustky`) se
  v součtu slučuje jako ostatní sekce; `souhrn.mustkyCena` ze součtu (3.1).
  Model (skladebný / starý) určuje ceník varianty (`mustkyCenikSkladebny`),
  je tedy u všech šachet stejný. Popisný objekt `vysl.mustky` (skupiny,
  efektivní rozměry) se nesčítá — kdo ho tiskne (specifikace, krycí list),
  bere ho ze své šachty (3.2). V CN u víc šachet je cena můstků v ceně
  své šachty (R14); technický popis můstků zůstává v oddílu šachty.

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
- **Můstky (R14):** u víc šachet se rozpočítává **celý** základ před
  slevou včetně můstků — `T = Z`, `sᵢ = kᵢ·Uᵢ` (`Uᵢ` už můstky své šachty
  obsahuje). Každá šachta tak v tabulce nese i své můstky; řádek Můstky
  není. `souhrn.mustkyCena` (ze součtu, 3.1) zůstává ve výsledku pro
  krycí list a controlling, do CN u víc šachet nejde.
  Příklad (ilustrační): Výtah B má můstky, Výtah A ne → v tabulce
  1 184 498 a 2 082 502 Kč, celkem 3 267 000 Kč (řádek B obsahuje můstky).
- V tabulce je u šachty s ks > 1 cena **za řádek** (všechny kusy); cena za
  kus se netiskne (R12).
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
| **Režim zobrazení (R16)** | `rezimViceSachet = dalsi.length > 0 || ks > 1` u některé šachty. Bez něj se nic z níže popsaného nezobrazuje a obrazovka je jako dnes (kromě pole Počet variant šachet v nabídce, R17/R19). |
| **Zadání (Kalkulace OCK)** | Nad kartami pruh šachet „Výtah A · Výtah B 2 ks · + přidat šachtu“. Akce: Přejmenovat, Kopírovat šachtu, Počet ks, Smazat (jen šachta 2+; šachtu 1 nejde smazat, jen přejmenovat). Karty pod pruhem patří vybrané šachtě, jsou to tytéž karty jako dnes. Hlavička zakázky / varianty (místo, model, ceník, sleva) zůstává nad pruhem a je společná. |
| **Hlavička ceny (KPI)** | Hlavní číslo = koncová cena za variantu (součet). Pod ní řádek s rozpisem „Výtah A 1× · Výtah B 2× · součet“, klik otevře šachtu. U jedné šachty se rozpis nezobrazuje (obrazovka jako dnes). |
| **Záložky kalkulace** (Dimenze profilů, Práce a režie, Cenová kalkulace, Hrubá OCK, Opláštění, Volitelné, Režie, Příplatky) | Přepínač „Výtah A · Výtah B · Součet“. V šachtě se edituje jako dnes, ceny šachty bez zaokrouhlení na tisíce (jen informačně „podíl na součtu“). Pohled Součet je jen ke čtení (sloučené řádky, × ks). |
| **Sleva** | Beze změny ovládání; nad polem „Sleva se počítá z ceny celé nabídky (3 šachty, 4 ks)“. |
| **Cenová nabídka (náhled)** | Viz oddíl 5. |
| **Technická specifikace** | Společné údaje jednou, pak oddíl za šachtu (název, ks, rozměry, provedení, opláštění, můstky). Předvyplnění každé šachty z její dvojice (zadání, výsledek) — vč. pravidla #572 „sklo jen s plochou“ (`tsMaSklo`), takže šachta bez skla nemá v oddílu sklo, i když jiná šachta sklo má. Ruční hodnoty šachty 2+ v `dalsi[i].techspec`. |
| **Krycí list OCK** (R9: jeden list za variantu) | Předmět „OCK – 2 šachty, 3 ks (Výtah A, Výtah B 2 ks)“, hodnota = koncová cena, nová tabulka rozpisu po šachtách. Hodiny montáže a materiál = součet. Souhrn můstků (`atypMustky`, `kryciMustkyText`) po šachtách s jejich názvem. |
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
- **Návaznost na šablonu CN v16 (#560):** v16 má v části B řádky
  „Výtahová šachta“ `{{CENA_SACHTA_BEZ_DPH}}` / „Můstky“
  `{{CENA_MUSTKY_BEZ_DPH}}` / „Cena celkem“ `{{CENA_BEZ_DPH_CELKEM}}`
  (bez skladebných můstků jen `{{CENA_BEZ_DPH_SACHTA}}`, prázdné řádky maže
  `odstranPrazdneTsRadky` podle `DOCX_CENA_CASTI`). Nová **v17** nahradí
  řádek „Výtahová šachta“ smyčkou `{#sachty}{SACHTA_NAZEV} … {SACHTA_KS} ks
  … {SACHTA_CENA_BEZ_DPH}{/sachty}` a nechá řádky Můstky
  `{{CENA_MUSTKY_BEZ_DPH}}` a Cena celkem `{{CENA_BEZ_DPH_CELKEM}}`.
  **U víc šachet (R14)** dostane `CENA_MUSTKY_BEZ_DPH` prázdnou hodnotu,
  takže řádek Můstky smaže dnešní `odstranPrazdneTsRadky` (`DOCX_CENA_CASTI`)
  — žádný nový mechanismus; tabulka = řádky šachet + Cena celkem. Název
  šachty s můstky dostane dovětek „vč. můstků“ (např. „Výtah B – uliční
  trakt, vč. můstků“), aby zákazník věděl, kde cena můstků je.
  **U jedné šachty** jako dnes (R15) — „Výtahová šachta“, „Můstky“,
  „Cena celkem“. Technické řádky můstků `TS_MUSTKY_*` (dnes
  jedna sada) jdou v v17 do smyčky šachet. Jedna šachta ve v17 = dokument
  jako ve v16 (zlatá sada porovná text v16 a v17 u jedné šachty).
- Stará šablona (v16, v15 s klonováním řádků `nabidkaMustkyKlon`, starší):
  zakázka s jednou šachtou se tiskne jako dnes; zakázka s víc šachtami →
  zábrana tisku „Šablona neumí rozpis po šachtách, použijte šablonu v17“.

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
  sloučí se jen to, co je vybrané. Sloučený řádek je pro zákazníka **jedna
  volba** pro všechny vypsané šachty (R13); příplatek jen pro jednu šachtu
  vznikne tak, že ho obchodník u ostatních šachet odškrtne — pak má vlastní
  řádek (a odškrtnuté šachty ve výčtu nejsou).
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

Otázky O1–O10 rozhodl J. V. 5. 11. 2026 (R4–R13), O11–O12 6. 11. 2026 (R14–R15).
Nové otázky, které vyplynou při realizaci nebo při aktualizaci návrhu na
nový kód, se zapíšou sem a do oddílu 0.

**O11 rozhodnuta J. V. 6. 11. 2026 = b)** (R14): u víc šachet je cena
můstků v ceně své šachty, řádek Můstky zmizí.

**O12 rozhodnuta J. V. 6. 11. 2026 = a)** (R15): jedna šachta s můstky
zůstává jako dnes.

**O13 a O14 rozhodnuty J. V. 6. 11. 2026 = a)** (R17, R18).

**R19 (10. 11.)** viz oddíl 0.

**O15 rozhodnuta J. V. 10. 11. 2026 = a)** (R20).

**Otevřené otázky: žádné.**

## 10. Položka roadmapy

Zapsaná do `roadmapa/roadmap.json` jako **#570** (vlna C, `ceka`,
složitost XL, závisí na #560). Koordinace může přečíslovat.

---

## 11. Prompt pro realizaci (po pokynu J. V.)

> Dávka VS-E<N> (#570): víc šachet v jedné nabídce OCK, etapa E<N>. Založ
> větev `claude/vs-e<N>-…` nad `<VÝCHOZÍ_COMMIT>` (určí koordinace zprávou
> „SPUSŤ VS E<N> nad <SHA>“). Etapy se spouštějí po jedné.
> Pracuj česky podle `CLAUDE.md`; na začátku `bash nastroje/instaluj_hooky.sh`,
> `git push --no-verify` zakázané, do `test-draft` / `test` / `main` nic.
> Závazný návrh: `podklady/NAVRH_VICE_SACHET_05_11.md` (rozhodnutí R1–R13).
> Výchozí SHA nejméně `e2c2137` (integrace v6.11.5: MU #560, MU2, MU3, PH, DP, DZ/DZ2, CA #575), viz oddíl 12.
> **Číselná pole jen přes `CISLO_POLE`** (`src/ui/cislo_pole.js`, `<input ${CISLO_POLE} …>`, čárka i tečka,
> zobrazení s čárkou, `el.value` vrací normalizovaný text s tečkou) — i nová pole „Počet šachet v nabídce“
> a „Počet stejných kusů“; žádné `type="number"`. Pole R19: „Počet variant šachet v nabídce“ (vstup),
> „Počet šachet celkem“ (jen ke čtení, Σ ks), „Počet kusů této šachty“ (z Počtu stejných kusů).
> Šablona CN v17 navazuje na v16 (5.1).
> Dávka MU (#560, `Z.mustky[]`) je sloučená (v5.11.2); souběžné dávky K40
> a PH mění sousední soubory — před začátkem ověř návrh proti výchozímu SHA.
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
>   jeden sloupec ceny u šachty (R12), sloučený příplatek = jedna volba (R13),
>   technická specifikace.
> - **E5** krycí list (jeden za variantu s tabulkou), SoD, controlling
>   (beze změny, test součtu), Pipedrive (poznámka), zámek a otisk
>   (`sachtyVerze`, `test_vs_zamek.js`), kontroly po šachtách,
>   `test_vs_vystupy.js`.
> - **E6** celé testovací kolo (mutace po částech), ruční zkouška na
>   testovacím webu, CHANGELOG, roadmapa #570 → hotovo.
>
> Každý nový test s pojistkou „před implementací selže“ (do commitu).
> Celé testovací kolo `nastroje/testovaci_kolo.sh` (Playwright přes odkaz
> `node_modules/playwright` → `npm root -g`), mutace po částech
> (`KNG_MUTACE_CAST=K/N`), kolo s částí hlásí „ZELENÁ ČÁST“.
> Zakázka s jednou šachtou musí dát na haléř výsledek i dokumenty jako
> výchozí commit. Na konci ohlas koordinaci: SHA, verze, výsledek kola.

---

## 12. Ověření návrhu proti kódu

| Datum | Nad | Co se změnilo v kódu | Dopad na návrh |
|---|---|---|---|
| 5. 11. 2026 | `5da7a2d` (integrace v5.11.1 = v4.11.8 + PH #568, #569, #572) | `engine.js`: `oplasteni.skloJenSPlochou: true` (razítko, ne číslo). `techspec.js`: `tsMaSklo(Z, r)`, `TS_OPL_SKLA`, filtr skla s nulovou plochou v `tsOplPasyPoStenach`, nové hodnoty číselníků kotvení. `docxgen.js`, `nabidka_proj.js`, `engine_proj.js`, `kontroly.js`, `ui/kalk_proj.js`: jen PROJ (hlavička, studie bez zaměření). | (1) Specifikace po šachtách volá `tsMaSklo` / `tsOplPasyPoStenach` s výsledkem **své** šachty, ne se součtem (doplněno 2, 3.2, 4). (2) Součet přebírá popisné objekty vč. razítka ze šachty 1, zlatá sada tím drží i #572. (3) Ruční hodnoty specifikace šachty 2+ v `dalsi[i].techspec` (doplněno 2). (4) PROJ změny se návrhu netýkají (PROJ beze změny, 5.7). (5) Výpočet OCK (`vypocet` ceny), `zamek.js`, `zaokrouhleni.js`, `uloziste.js`, `nabidka.js`, `kryci.js`, `controlling.js`, `pd_nanecisto.js`, `seznam.js` beze změny → vzorce, obal a výstupy platí. (6) Pozn.: v kódu je test `src/test_570_sklo_bez_plochy.js` pro #572 (PH původně #570) — jen název souboru, položka návrhu je dál #570. |
| 5. 11. 2026 | `6b70cc3` (`claude/integrace-16-10`, v5.11.3 = + MU #560 v5.11.2, DZ #571) | MU #560: `engine.js` skupiny `Z.mustky[]` (`mustkySkupiny`, `MUSTKY_SKUPIN_MAX`), skladebný model (`mustkyCenikSkladebny`), sekce `sekce.mustky`, `souhrn.mustkyCena = min(CEIL(s5 + rez, 1000), zakladCenaZaokr)` a `mustkyNaklad`, `souctySekci.mustky`, popisný `vysl.mustky`; `zaokrouhleni.js` `cenaNabidkyOck` vrací `mustky.mustkyPred`; `nabidka.js` řádky části B (`CENA_SACHTA_BEZ_DPH` = cena před slevou − můstky, `CENA_MUSTKY_BEZ_DPH`, `CENA_BEZ_DPH_CELKEM`, `CENA_BEZ_DPH_SACHTA`), `nabidkaMustkyKlon` pro starší šablony; `docxgen.js` `DOCX_CENA_CASTI`; `kryci.js` `kryciMustkyText(r)` a sekce mustky v hodinách; `controlling.js` sekce mustky a mapování klíčů můstků; `techspec.js` řádky můstků; `kontroly.js`, `uloziste.js` (tvar skupin). DZ #571: jen `online_ui.js` (kopie na Disk). | (1) Třetí nové pole `mustkyCenaPredZaokr`, `mustkyCena` ze součtu se stejným pravidlem `min(CEIL, Z)` (3.1, 3.3). (2) Můstky po šachtách uvnitř zadání, limit skupin na šachtu, model můstků z ceníku varianty (3.4). (3) Rozpočet zaokrouhlení jen z části bez můstků (3.6). (4) CN: šablona v17 navazuje na v16, smyčka šachet místo řádku „Výtahová šachta“, `TS_MUSTKY_*` ve smyčce; v15/v16 u víc šachet zábrana (5.1). (5) Krycí list: `kryciMustkyText` se volá po šachtách a spojí s názvem šachty („Výtah A: …; Výtah B 2×: …“), protože popisný `vysl.mustky` se nesčítá. (6) Controlling čte sečtenou `sekce.mustky` — beze změny (R5). (7) Validace serveru: zadání šachty 2+ prochází stejnou kontrolou skupin můstků jako šachta 1. (8) Nová otázka **O11** (oddíl 9). DZ se návrhu netýká. |
| 6. 11. 2026 | (rozhodnutí, ne kód) | O11 = b) | R14: rozpočet zaokrouhlení z celého základu vč. můstků (3.6); v17: u víc šachet prázdné `CENA_MUSTKY_BEZ_DPH` → řádek Můstky zmizí dnešním mechanismem, dovětek „vč. můstků“ u šachty (5.1); nová otázka O12 (jedna šachta). |
| 6. 11. 2026 | (rozhodnutí, ne kód) | O12 = a) | R15: jedna šachta s můstky v CN jako dnes; návrh uzavřen. Před spuštěním se slučují MU2, DP, DZ2 → po „AKTUALIZUJ VS“ znovu ověřit. |
| 6. 11. 2026 | (připomínka J. V. k prototypu) | R16 | Jedna šachta = dnešní vzhled; režim víc šachet od 2 šachet (nebo ks > 1); nové otázky O13 (místo nastavení počtu) a O14 (snížení počtu). Prototyp upraven (výchozí stav = 1 šachta). |
| 6. 11. 2026 | (rozhodnutí, ne kód) | O13 = a, O14 = a | R17 pole Počet šachet v nabídce v Zadání šachty, R18 potvrzení a smazání při snížení; návrh uzavřen, prototyp bez náhledů nezvolených variant. |
| 6. 11. 2026 večer | `0f16310` (integrace v6.11.4 = MU3) | MU3: výchozí výška sloupu navíc = H − 0,2 m (jako rohový sloupek), nápovědy karty Můstky s čárkou. | Návrh beze změny (sloupy jsou v zadání šachty, jádro je po šachtách přebírá). Prototyp přestavěn na v6.11.4 (v6), ověřen. |
| 6. 11. 2026 večer | `e2c2137` (integrace v6.11.5 = CA #575) | Všechna číselná pole = jeden prvek `CISLO_POLE` (`src/ui/cislo_pole.js`), textové pole s `data-cislo`, čárka i tečka, zobrazení s čárkou. | Prompt (oddíl 11): výchozí SHA nejméně `e2c2137`, číselná pole jen přes `CISLO_POLE`. Prototyp v7 na v6.11.5; pole Počet šachet a Počet stejných kusů jsou `CISLO_POLE`. |
| 10. 11. 2026 | `7eab7a8` (integrace v7.11.1 = v6.11.5 + FL #576 harness, kód aplikace beze změny) | Jen harness `overit_online.mjs`, roadmapa #578. | Návrh beze změny kódu; R19 a O15 doplněny; prototyp v8 na v7.11.1; plán realizace `podklady/VS_PLAN_REALIZACE.md`, výchozí SHA 7eab7a8. |
| 10. 11. 2026 | (rozhodnutí, ne kód) | O15 = a | R20: pole Počet kusů i u jedné šachty v záhlaví Zadání; prototyp v9; plán E2 doplněn. |
