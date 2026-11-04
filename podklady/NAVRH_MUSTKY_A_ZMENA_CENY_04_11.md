# Návrh NV — A. Sekce MŮSTKY v cenové nabídce, B. Změna ceny položky obchodníkem

Dávka NV, 4. 11. 2026, větev `claude/nv-mustky-cena` nad `test` (v4.11.3,
6109e39). **Jen návrh k rozhodnutí J. V. — kód aplikace se nemění.**
Všechna čísla v příkladech jsou smyšlená. Klíče ceníku jsou uvedené jen
jménem, bez částek.

Artefakt s náhledy obrazovek a otázkami: https://claude.ai/artifact/B72Xc4gXo9G6C2tdMhxjHs
(„Můstky a ruční ceny — návrh NV“, private).

---

## A. Samostatná sekce MŮSTKY v cenové nabídce

> Zadání J. V.: „navrhnout v cenové nabídce samostatnou sekci na můstky:
> šířka, délka, provedení podlahy – vana (beton), pororošt, pochozí plech,
> jiné; typ zábradlí – sklo, kov a cena; kotvení; sloupy navíc.“

### A0. Jak to funguje dnes (v4.11.3)

| Místo | Dnešní stav | Kde |
|---|---|---|
| Zadání | Karta zadání šachty, sloupec pod „Čistý vstup – šířka“: **Můstky mezi budovou a OCK** (ks, `Z.mustkyKs`; starší zakázka `Z.mustek` = 1 ks). Při ks > 0 **Délka můstku** (`Z.mustekHloubkaMm`, prázdná = 1 000 mm) a **Šířka můstku** jen ke čtení (= šířka šachty). | `src/ui/kalk_ock.js` ř. 271–291, `mustkySet` ř. 870 |
| Výpočet | `mustkyRozpad(z, c)`: materiál = délka_m × `C.mustekKc` × šířka/`C.mustekRefSirkaMm`; hodiny = max(min, základ + za bm × délka) × `C.mustekMontazHodKc`. Ceník bez kladné ref. šířky (zamčené varianty, ceník před #354) = paušál × ks. | `src/engine.js` ř. 731–776 |
| Kalkulace | Sekce **Hrubá OCK**: řádky „MŮSTKY VČ. ZÁBRADLÍ – MATERIÁL“ a „MONTÁŽ MŮSTKŮ“ (starý ceník: „MŮSTKY MEZI BUDOVOU A OCK“). Řádky vznikají jen při ks > 0, v **obou modelech**. | `src/engine.js` ř. 1932–1937 |
| Ceník | Hrubá OCK: `mustekKc` (Kč/bm vč. zábradlí), `mustekRefSirkaMm`, `mustekMontazHodKc`, `mustekMontazZakladHod`, `mustekMontazBmHod`, `mustekMontazMinHod` (`MUSTKY_CENIK_KLICE`). Žádná sazba v kódu (#548). Zahraniční řada má vlastní sazbu montáže (#550). | `src/cenik.js` ř. 44–50, `src/cenik_rady.js` |
| Střecha | Můstek v nejvyšším nástupišti → střecha přetažená přes můstek (šířka šachty + 0,2 m) × délka. | `src/engine.js` ř. 1203–1211 |
| Specifikace | Jeden řádek **MŮSTKY MEZI BUDOVOU A OCK** v DOPLŇKOVÝCH KONSTRUKCÍCH: „2 ks, rozměr 1 600 × 1 000 mm (šířka × délka), ocelová konstrukce vč. zábradlí a montáže“. Kotvení (#519) jen jako dovětek „… a přes můstky“ v řádku KOTVENÍ KONSTRUKCE (POLOHA). | `src/techspec.js` ř. 583–596, 457–459 |
| Cenová nabídka | Totéž jako specifikace: řádek v DOPLŇKOVÝCH KONSTRUKCÍCH, Word `{{TS_MUSTKY}}` (prázdné = řádek zmizí). **Cena můstků je skrytá v „Výtahová šachta (bez DPH)“** — samostatně ji zákazník nevidí. | `src/nabidka.js` ř. 237, 640, 668–673 |
| Krycí list | Můstky v něm nejsou. | `src/kryci.js` |
| Controlling | `C.mustekKc` → zámečníci, `C.mustekMontazHodKc` → stavební práce; ref. šířka a hodiny jen parametry. | `src/controlling.js` ř. 121–157 |
| Kontroly | `mustky` (chybí cena / sazba montáže → 0 Kč; víc můstků než nástupišť), `mustkyPrechodove`, `mustekStrecha`; standard OCK hlídá délku (max 1 000 mm). | `src/kontroly.js` ř. 490–560, `src/standard_ock.js` ř. 379–390 |

Co chybí vůči zadání: provedení podlahy, typ zábradlí, kotvení jako
volba, sloupy navíc, zadávaná šířka a **viditelná cena můstků**
v nabídce.

### A1. Zadání

**Kam.** Tři možnosti:

| | Varianta | Pro | Proti |
|---|---|---|---|
| **A1-a (doporučeno)** | **Samostatná karta „Můstky mezi budovou a OCK“** v Zadání šachty (Kalkulace OCK) pod kartou rozměrů. Pole počtu kusů zůstává tam, kde je dnes; karta se ukáže při ks > 0. | Pole jsou pohromadě, sloupec zadání se nenafoukne; karta jde srolovat/skrýt režimem sekce (`kartaRezim`, klíč `ock.mustky`). | O jednu kartu víc. |
| A1-b | Rozšířit dnešní řádky ve sloupci „Čistý vstup…“ | Nic se nestěhuje. | Sedm nových polí ve sloupci zadání — nepřehledné. |
| A1-c | Nová záložka „Můstky“ | Hodně místa. | Přeskakování mezi záložkami kvůli jedné části šachty. |

**Po kusech, nebo společně?**

| | Varianta | Pro | Proti |
|---|---|---|---|
| **A1-1 (doporučeno)** | **Skupiny můstků.** Tabulka, každý řádek = skupina stejných můstků (ks, šířka, délka, podlaha, zábradlí, kotvení, sloupy). Nová zakázka má jednu skupinu; „+ další provedení“ přidá řádek. Počet můstků = součet ks. | Běžný případ (všechny stejné) = jeden řádek, jako dnes. Odlišný můstek v přízemí jde zadat bez obcházení. | Datová změna: `Z.mustky = [ {…} ]` místo `mustkyKs` + `mustekHloubkaMm`. |
| A1-2 | Společná pole pro všechny | Nejjednodušší. | Různé můstky na jedné šachtě nejdou. |
| A1-3 | Řádek za každý kus | Nejpřesnější. | U pěti stejných můstků pětkrát totéž. |

Data (A1-1): `Z.mustky = [{ ks, sirkaMm, delkaMm, podlaha, podlahaNazev,
zabradli, zabradliNazev, zabradliStrany, kotveni, kotveniText, sloupyKs,
sloupVyskaM }]`. Starší zakázka bez pole se čte přes jednu funkci (rozšířené
`mustkyPocet` / nová `mustkySkupiny(z)`): `mustkyKs` (nebo `mustek`) →
jedna skupina, `mustekHloubkaMm` → délka, ostatní výchozí. **Nic se
nepřepisuje v uložených datech**, převod je jen při čtení (stejně jako
dnes `mustek` → 1 ks).

**Pole a výchozí hodnoty:**

| Pole | Volby | Výchozí | Poznámka |
|---|---|---|---|
| Počet kusů | číslo | 1 (nová skupina) | dnešní pole zůstává jako součet |
| Šířka | mm | **prázdná = šířka šachty** (šedá nápověda) | dnes nejde zadat; standard: max šířka OCK (`sirkaJakoOck`) |
| Délka | mm | prázdná = 1 000 mm | dnešní `mustekHloubkaMm`; standard max 1 000 mm |
| Podlaha | vana (beton) / pororošt / pochozí plech / jiné + název | **ta, které odpovídá dnešní sazba** (otázka A-Q3) | „jiné“ = cena dle nabídky (viz A2) |
| Zábradlí | kov / sklo / bez / jiné + název | kov | J. V. zmiňuje sklo a kov; „bez“ pro můstek mezi stěnami; „jiné“ = cena dle nabídky |
| Zábradlí – strany | jedna / obě | obě | bm zábradlí = strany × délka |
| Kotvení | do stropní desky / věnce budovy · do sloupů (na terén) · konzolově jen z OCK · jiné + text | do stropní desky | doplní větu #519 v řádku KOTVENÍ KONSTRUKCE (POLOHA) |
| Sloupy navíc | ks + výška (m) | 0 ks | výška prázdná = výška nástupiště nad prohlubní (otázka A-Q5) |

### A2. Výpočet

**Model ceny.** Tři možnosti:

| | Varianta | Popis | Pro | Proti |
|---|---|---|---|---|
| **A2-a (doporučeno)** | **Skladebný** | Můstek = nosná konstrukce + podlaha + zábradlí + sloupy + kotvení + montáž. Každá část má vlastní jednotku a sazbu. | Každá volba mění jen svou část; controlling ji umí přiřadit (zámečníci / sklo / beton / montáž); „jiné“ = jen ta část ručně. | Víc sazeb v ceníku (≈ 12). |
| A2-b | Přirážkový | Dnešní `C.mustekKc` = referenční provedení; jiná podlaha / sklo = příplatek Kč/m² nebo Kč/bm. | Dnešní ceník zůstává platný. | Admin musí počítat rozdíly proti referenci; „bez zábradlí“ = záporný příplatek. |
| A2-c | Matice provedení | Kč/bm pro každou kombinaci podlaha × zábradlí. | Jedno číslo na kombinaci. | 4 × 4 = 16 sazeb, „jiné“ nejde. |

**Skladebný vzorec (A2-a), na jednu skupinu:**

```
š = šířka (prázdná = šířka šachty), d = délka (prázdná = 1 000 mm)
konstrukce = ks × d_m × C.mustekRamBmKc × (š / C.mustekRefSirkaMm)     [Kč/bm při ref. šířce, jako dnes]
podlaha    = ks × š_m × d_m × C.mustekPodlaha<Typ>M2Kc                  [Kč/m²]
zábradlí   = ks × strany × d_m × C.mustekZabradli<Typ>BmKc              [Kč/bm]
sloupy     = sloupyKs × výška_m × C.mustekSloupBmKc                     [Kč/bm sloupu]
kotvení    = ks × C.mustekKotveni<Typ>Kc                                [Kč/sada na můstek]
hodiny     = ks × max(min, základ + za bm × d_m)
           + ks × strany × d_m × C.mustekZabradliSkloMontazHodBm (jen sklo)
           + sloupyKs × C.mustekSloupMontazHod
montáž     = hodiny × C.mustekMontazHodKc   (zahraniční řada: vlastní sazba #550)
„jiné“     = cena dle nabídky dodavatele v zakázce (Kč/m² podlahy nebo Kč/bm zábradlí),
             zadává obchodník a potvrzuje podle části B
```

**Nové klíče ceníku (jen názvy):**

| Klíč | Jednotka | Pozn. |
|---|---|---|
| `C.mustekRamBmKc` | Kč/bm při ref. šířce | nosná konstrukce bez podlahy a zábradlí |
| `C.mustekPodlahaVanaM2Kc` | Kč/m² | vana pro beton (betonáž dodává stavba? otázka A-Q4) |
| `C.mustekPodlahaPororostM2Kc` | Kč/m² | |
| `C.mustekPodlahaPlechM2Kc` | Kč/m² | pochozí (slzičkový) plech |
| `C.mustekZabradliKovBmKc` | Kč/bm | |
| `C.mustekZabradliSkloBmKc` | Kč/bm | výchozí; konkrétní nabídka skláře přes část B |
| `C.mustekSloupBmKc` | Kč/bm | sloup navíc |
| `C.mustekKotveniDeskaKc`, `C.mustekKotveniSloupKc`, `C.mustekKotveniKonzolaKc` | Kč/sada | jedna sada na můstek |
| `C.mustekZabradliSkloMontazHodBm` | hod/bm | montáž skla navíc |
| `C.mustekSloupMontazHod` | hod/ks | |

Zůstávají: `C.mustekRefSirkaMm`, `C.mustekMontazHodKc`,
`C.mustekMontazZakladHod`, `C.mustekMontazBmHod`, `C.mustekMontazMinHod`.
Dnešní `C.mustekKc` (vč. zábradlí) zůstává jen pro starší ceník — nový tvar
ho **nečte**, jinak by se zábradlí započetlo dvakrát.

**Rozpoznání tvaru ceníku** (stejný princip jako #354): nový skladebný
vzorec platí jen u ceníku s kladnou `C.mustekRamBmKc`. Ceník bez ní počítá
podle #354 (a ten bez ref. šířky paušálem). Sazby **nejsou v kódu** (#548);
nová položka chybějící ve starším ceníku = `+c.klic || 0`, kontrola
`mustky` hlásí nulu, zveřejnění ceníku s nulovou sazbou chce potvrzení
(jako `mustkyPotvrzeno`).

**Kalkulace OCK** (doporučeno): vlastní sekce **MŮSTKY** místo dvou
řádků v Hrubé OCK — řádky „konstrukce“, „podlaha – pororošt“, „zábradlí –
sklo“, „sloupy navíc“, „kotvení“, „montáž můstků“. Sekce se stejně jako
ostatní dá v režimu sekce srolovat. Řádek s nulovou částí (např. 0 sloupů)
nevzniká.

**Model 1 / Model 2.** Excel můstky nikdy neměl; od #354 jsou v obou
modelech stejné a zakázka bez můstků se nemění.

| | Varianta |
|---|---|
| **A2-M1 (doporučeno)** | Skladebný výpočet v obou modelech (jako #354). Zakázka bez můstků 1:1 — hlídá test. |
| A2-M2 | Model 1 zamrazit na vzorci #354, skladebný jen v Modelu 2. Model 1 by pak neuměl provedení podlahy ani zábradlí, takže by se dnešní nabídky v Modelu 1 dál tiskly bez popisu provedení. |

**Starší zakázky:** bez migrace ceny. Ceník je ve variantě zamrzlý,
starý tvar počítá dál starým vzorcem (test bajt po bajtu proti dnešnímu
jádru, jako u #354). Chybějící pole provedení = výchozí hodnoty, jen
do textu, ne do ceny starého tvaru.

**Rozpracované varianty po zveřejnění ceníku:** projdou obvyklým
srovnáním s platným ceníkem (`uloSrovnejSPlatnymCenikem`) → přejdou na
skladebný vzorec s výchozím provedením; dialog vypíše dopad (cena se může
změnit). Pole „jiné“ s cenou dle nabídky zůstávají (patří zakázce — doplnit
do `CENIK_ZAKAZKOVE`, viz B).

**Odeslané nabídky:** zámek beze změny — zamčená varianta se nepřepočítává,
v zadání karta Můstky jen ke čtení.

### A3. Cenová nabídka

**Kde je cena.**

| | Varianta | V části B (obchodní) |
|---|---|---|
| **A3-a (doporučeno)** | **Samostatný řádek ceny** | „Výtahová šachta (bez DPH)“ **bez** můstků, pod ní „Můstky mezi budovou a OCK (bez DPH)“ a součet. Se slevou: oba řádky před slevou, pak „Cena před slevou“, „Sleva“, „Cena bez DPH“ (tvar šablony v12+). |
| A3-b | „z toho můstky“ | Cena šachty zůstává celková, pod ní informativně „z toho můstky“. Se slevou nejasné, z jaké ceny „z toho“ je. |
| A3-c | Jako dnes (cena v ceně šachty) | Jen technický popis. Nesplňuje „a cena“. |

Částka řádku = součet řádků sekce MŮSTKY s přirážkou, zaokrouhlená
stejně jako ostatní položky (#135: součet ze zaokrouhlených položek);
v EUR přes `menaDokumentu.na` (celá eura nahoru), součet sečtený z
převedených čísel.

**Technická část — samostatná sekce.** Místo jednoho řádku v DOPLŇKOVÝCH
KONSTRUKCÍCH nová sekce **MŮSTKY MEZI BUDOVOU A OCK** (za DOPLŇKOVÝMI
KONSTRUKCEMI, jen při ks > 0):

| Řádek | Příklad (smyšlený) |
|---|---|
| POČET A ROZMĚR | 2 ks, 1 600 × 1 000 mm (šířka × délka) |
| PODLAHA | pororošt |
| ZÁBRADLÍ | sklo, oboustranně |
| KOTVENÍ MŮSTKŮ | do stropní desky budovy |
| SLOUPY NAVÍC | 2 ks, výška 3,2 m |
| (u více skupin) | řádky za každou skupinu: „Skupina 2: 1 ks, …“ |

Ve specifikaci (záložka Technická specifikace OCK) tytéž řádky, předvyplněné
ze zadání a přepsatelné jako ostatní řádky (`TS_RADKY`, číselníky pro
podlahu, zábradlí, kotvení). Ruční přepis vyhrává, jako dnes.

**Word.**

| | Varianta |
|---|---|
| **A3-W1 (doporučeno)** | Nové symboly `TS_MUSTKY_ROZMER`, `TS_MUSTKY_PODLAHA`, `TS_MUSTKY_ZABRADLI`, `TS_MUSTKY_KOTVENI`, `TS_MUSTKY_SLOUPY` a `CENA_MUSTKY`, **šablona CN v16** (CZ + EN/DE/FR). Šablona v15 a starší dál funguje: docxgen sekci naklonuje z kotvy `TS_MUSTKY` (mechanismus `tsRadkyNavic` s `pruh: true`) a řádek ceny z kotvy `CENA_BEZ_DPH`. Bez můstků zmizí sekce i řádek ceny. |
| A3-W2 | Jen klonování, bez nové šablony | Rychlejší, ale formát řádku ceny v části B je pak kopie řádku šachty — v cizích šablonách se nedá doladit. |

`{{TS_MUSTKY}}` zůstává (souhrnná věta) kvůli starším šablonám.

**Překlady** (návrh, kontrola J. V. — stejně jako u P7):

| CZ | EN | DE | FR |
|---|---|---|---|
| vana (beton) | concrete tray | Betonwanne | bac pour béton |
| pororošt | grating | Gitterrost | caillebotis |
| pochozí plech | walkable checker plate | begehbares Riffelblech | tôle larmée |
| zábradlí – sklo | glass balustrade | Glasgeländer | garde-corps en verre |
| zábradlí – kov | steel railing | Stahlgeländer | garde-corps métallique |
| sloupy navíc | additional columns | zusätzliche Stützen | poteaux supplémentaires |
| Můstky mezi budovou a OCK (bez DPH) | Bridges between building and steel structure (excl. VAT) | Brücken zwischen Gebäude und Stahlkonstruktion (ohne MwSt.) | Passerelles entre bâtiment et structure (HT) |

Text „jiné“ zadaný obchodníkem slovník nezná → kontrola `dodatekCesky`
upozorní (jako u vlastních řádků).

**Krycí list OCK:** nový řádek v technické části „Můstky: 2 ks,
1 600 × 1 000, pororošt, sklo, kotvení do desky, 2 sloupy“ (pro výrobu
a montáž). **Controlling:** `mustekRamBmKc`, zábradlí kov, sloupy, kotvení
→ zámečníci; zábradlí sklo → sklo; vana → zámečníci (beton je mimo
dodávku — otázka A-Q4); montáž → stavební práce (jako #354).

### A4. Pracnost, rizika, testy

| Krok | Obsah | Pracnost |
|---|---|---|
| 1 | Data `Z.mustky[]` + čtení starších tvarů, karta Můstky v Zadání, zámek | S–M |
| 2 | Jádro: skladebný vzorec, rozpoznání tvaru ceníku, sekce MŮSTKY, střecha ze zadané šířky | M |
| 3 | Ceník: klíče, import xlsx, kontrola zveřejnění (nulové sazby), zahraniční řada | S |
| 4 | Specifikace + online nabídka (sekce, řádek ceny), Word symboly a klon pro v15 | M |
| 5 | Šablona CN v16 CZ/EN/DE/FR (soubory J. V. nahraje) | S |
| 6 | Překlady, krycí list, controlling, standard OCK (šířka, provedení „jiné“) | S |
| 7 | Testy, mutace jádra, celé kolo | M |

Celkem **L** (≈ 2 dávky: 1–3, pak 4–7).

**Rizika.** (1) Dvojí započtení zábradlí, kdyby nový tvar četl i
`C.mustekKc` — test na to. (2) Rozpracované varianty změní cenu po
zveřejnění ceníku — dialog dopadu to ukáže. (3) Nulové sazby →
0 Kč v nabídce (#548): kontrola a potvrzení. (4) Šablony v15 v oběhu —
klon. (5) Sleva a rozpad ceny v části B musí sedět na korunu i euro.
(6) Model 1 bez můstků 1:1.

**Testy.** `src/test_<č>_mustky_provedeni.js`: starý tvar #354 a paušál
bajt po bajtu; skladebný vzorec na smyšlených sazbách (každá volba mění
jen svou část); 0 můstků beze změny v obou modelech; více skupin; „jiné“
bez ceny → kontrola; nabídka CZ/EN/DE/FR (sekce, řádek ceny, sleva, euro);
Word v16 i v15 (klon); `test_548_mustky_bez_cen.js` rozšířit o nové klíče
(dist bez sazeb); mutace jádra na nový vzorec. Pojistka: před změnou FAIL.

---

## B. Změna ceny položky obchodníkem a její potvrzení

> Zadání J. V.: „schvalování změny ceny v ceníku obchodníkem není jak
> provést. Pokud má obchodník cenovou nabídku na konkrétní materiál, např.
> sklo, může tuto cenu změnit a u změněné položky by mělo přibýt tlačítko
> k potvrzení změny obchodníkem. Navrhni, jak by to mohlo vypadat.“

### B0. Jak to funguje dnes (v4.11.3)

| Mechanismus | Co dělá | Kde |
|---|---|---|
| Jednotková cena v kalkulaci OCK | Buňka ceny (`bunkaCena`) zapisuje rovnou do ceníku varianty (`set('C.…')`) nebo do `Z.cenyPrepis`. **Kreslí se jen se sloupcem `sloupce.naklad`** — obchodník ani vedoucí ho ve výchozí matici nemají. | `src/ui/kalk_ock.js` ř. 1542–1550, 1622, 1763; `src/zobrazeni.js` ř. 207–215 |
| Server (B112) | `uloCenikProblemy`: role bez `tab.cenik` smí uložit jen ceník shodný s uloženou, zveřejněnou nebo jinou variantou. Jinak **403** „Ceník varianty smí měnit jen administrátor … snížení ceny zadejte jako slevu“. | `src/uloziste.js` ř. 1680, 1968; `netlify/lib/zakazka_kontrola.mjs` ř. 346 |
| Ruční ceník varianty `cenikRucni` (#177) | Jen **zakázkové** hodnoty (`CENIK_ZAKAZKOVE` = přirážka a DPH OCK/PROJ). Ceny položek se ho netýkají. | `src/cenik_stari.js` ř. 67, 93–116 |
| „Cena dle nabídky“ (S13, #423) | Příznak `cenik.dleNabidky` z **platného** ceníku, jen pro `C.priplatky.*` (8 výchozích). Taková položka nepodléhá výjimce ani přepočtu; server pustí libovolnou nezápornou hodnotu. Štítek „cena dle nabídky / vlastní cena“. **Žádné potvrzení, žádný zdroj, žádné razítko.** Zadat ji jde zase jen se `sloupce.naklad`. | `src/cenik.js` ř. 355–362; `src/uloziste.js` ř. 1871–1880; `kalk_ock.js` ř. 1693 |
| Cenová výjimka (B154, B155, B165) | Druhy: **směs ceníků** (varianta má část položek ze starší verze ceníku) a **pás opláštění „jiné“ pod ceníkem**. Blokuje jen **tisk** (zábrana `cenovaVyjimka`, server `vyjimkyZamekProblem` 403). Žádá kdokoli, schvaluje admin nebo `sleva.schvalovani` (výchozí jen admin). Schválení platí pro přesný obsah. | `src/vyjimky.js` ř. 156, 259–301, 462–517; `src/kontroly.js` ř. 1224–1245; `src/ui/schvalovani_ui.js` |
| „Ceny jsou dohodnuté“ (kvitance) | Ztiší varování a automatický přepočet, **tisk dál blokuje výjimka**. | `cenik_stari.js` ř. 239; `schvalovani_ui.js` ř. 423 |
| P12 / náklady | Obchodník v OCK vidí název, množství a **„Cena vč. přirážky“** (`r.sMarzi`). Nákladové sazby ceníku nevidí (`tab.cenik`, `sloupce.naklad`, `kpi.marze`). Prodej = náklad × (1 + přirážka). | `kalk_ock.js` ř. 1745; `engine.js` ř. 1843 |
| Controlling | Ruční ceny ani odchylky od ceníku nenese; jen příznak „vlastní“ a verzi/otisk ceníku. | `src/controlling.js` ř. 660–668, 1128 |

**Proč „to není jak provést“:**

1. Obchodník **nemá kam cenu napsat** — buňka ceny je za právem
   `sloupce.naklad`, ceník za `tab.cenik`.
2. Kdyby ji měl, **server uložení odmítne (403)** a pošle ho na slevu.
3. **Výjimky změnu jedné položky neznají** — umí jen směs ze starší verze
   ceníku a pás „jiné“. Není tedy co „poslat ke schválení“.
4. „Cena dle nabídky“ je jen pro příplatky, zapíná ji admin a **nemá
   potvrzení ani doklad** (od koho cena je).
5. Kvitance „Ceny jsou dohodnuté“ tisk neodemkne.

### B1. Co obchodník mění (P12)

| | Varianta | Pro | Proti |
|---|---|---|---|
| **B1-a (doporučeno)** | **Nákupní cenu z nabídky dodavatele** (nákladovou sazbu pro tuto zakázku), např. sklo Kč/m². Aplikace k ní přičte přirážku jako ke každé položce. | Zadává číslo, které má v ruce (nabídka skláře). Přirážka, controlling a marže fungují beze změny. Ceníkovou sazbu dál nevidí. | Z nákupní a prodejní ceny jde dopočítat přirážku. Tu ale nastavuje v hlavičce (`pole.prirazka`), takže ji zná. |
| B1-b | Prodejní cenu položky (vč. přirážky) | Nevidí nic nákladového. | Přirážka se u položky obchází, controlling neví, jaký byl náklad. Je to ve skutečnosti sleva/přirážka na položku, na to je sleva. |
| B1-c | Obojí podle práva | Pružné | Dvě cesty k jedné věci. |

Obchodníkovi se u položky ukáže **jen jeho číslo** a zdroj, nikdy
ceníková sazba („ceník: skryto“). Porovnání s ceníkem (nižší / vyšší
o kolik) vidí jen schvalovatel (jako B165).

### B2. Které položky smí obchodník přepsat

| | Varianta |
|---|---|
| **B2-a (doporučeno)** | **Rozšířit příznak „cena dle nabídky“** z příplatků na libovolnou položku, kterou admin v Nastavení → Ceník označí (sklo, zábradlí můstků – sklo, podlaha „jiné“ …). Jedno místo pravdy, platí ze zveřejněného ceníku. |
| B2-b | Všechny položky ceníku | Obchodník by mohl obcházet ceník u oceli a montáže. |
| B2-c | Pevný seznam v kódu | Každá změna = nová verze aplikace. |

### B3. UI

V Kalkulaci OCK (a u příplatků) dostane obchodník u **označené** položky
tlačítko **✎ cena z nabídky** (i bez sloupce `sloupce.naklad`). Otevře
se řádek pod položkou:

```
Sklo VSG 44.2  ·  23,4 m²                                    Cena vč. přirážky  …
  ✎ Cena z nabídky dodavatele
    Nákupní cena  [   1 234 ] Kč/m²   (smyšlené číslo)
    Dodavatel     [ Sklárna Příklad s.r.o. ]   Č. nabídky [ N-2026-0815 ]
    Datum nabídky [ 2. 11. 2026 ]              Platnost do [ 2. 12. 2026 ]
    Příloha       [ připojit PDF ] (volitelně, do příloh zakázky)
    [ Potvrdit cenu ]   [ ↺ vrátit na ceník ]
```

Stavy položky (štítek u názvu):

| Stav | Štítek | Tisk |
|---|---|---|
| ceníková | — | ano |
| ručně, nepotvrzeno | oranžový **ručně – nepotvrzeno** | **ne** (zábrana „Potvrďte ruční cenu u: …“) |
| potvrzeno obchodníkem | zelený **✓ potvrzeno** (bublina: kdo, kdy, dodavatel, č. nabídky) | ano |
| čeká na schválení (B4) | oranžový **⏳ čeká na schválení** | ne |
| schváleno | zelený **✓ schváleno** (kdo, kdy) | ano |
| platnost nabídky prošla | žlutý **nabídka dodavatele prošla** | ano, s upozorněním v kontrolách |

**↺ vrátit na ceník** smaže ruční cenu i razítka a vrátí ceníkovou sazbu
varianty. **Každá změna čísla po potvrzení** vrátí stav na „nepotvrzeno“.

**Razítko** (kdo potvrdil / schválil, kdy) píše **server z relace**,
nikdy klient (jako B2 / B13). Data varianty:

```
v.data.rucniCeny = {
  'C.skloVsg442M2Kc': { hodnota: 1234, zdroj: { dodavatel, cislo, datum, platnostDo, prilohaId },
                       potvrdil: { email, jmeno, kdy } | null,
                       schvalil: { email, jmeno, kdy } | null }
}
```

### B4. Pravidla

**Co potvrzení odemkne:** tisk dokumentů (nová zábrana
`rucniCenaNepotvrzena`) a vyřazení položky z kontroly „směs ceníků“
(jako dnes u ceny dle nabídky).

**Kdy je potřeba schválení administrátorem:**

| | Varianta | Snížení pod ceník | Zvýšení nad ceník |
|---|---|---|---|
| **B4-a (doporučeno)** | **Snížení ke schválení, zvýšení jen potvrzení** | potvrzení + **cenová výjimka nového druhu „ruční cena pod ceníkem“** → schválí admin / `sleva.schvalovani` | potvrzení stačí |
| B4-b | Tolerance | do X % pod ceník stačí potvrzení, víc → schválení (X nastaví admin v Nastavení → Schvalování; výchozí 0) | potvrzení |
| B4-c | Jen potvrzení | potvrzení stačí vždy | potvrzení |
| B4-d | Vše ke schválení | schválení | schválení |

Doporučení B4-a s volitelnou tolerancí z B4-b (výchozí 0 % = B4-a).
Snížení nákladu snižuje prodejní cenu stejně jako sleva, proto patří pod
stejné oko. Zvýšení chrání firmu, stačí doklad.

**Vztah k výjimkám a #425:** ruční cena pod ceníkem je **třetí druh
cenové výjimky** (vedle směsi a pásu „jiné“) — tatáž karta ve
Schvalování, totéž pravidlo B154 (schválení platí pro přesný obsah:
položka, hodnota, zdroj). Doporučuji **zároveň udělat #425**: vlastní
ruční cenu neschválí ten, kdo ji zadal (kromě admina) — jinak by si
vedoucí s `sleva.schvalovani` snížil náklad sám.

**Nový ceník:** potvrzená ruční cena **patří zakázce** — přepočet
rozpracovaných variant (`cenikPrepoctiRozpracovane`) ji nepřepíše
(stejně jako přirážku a cenu dle nabídky). Změní-li se v novém ceníku
sazba té položky, dostane obchodník informaci „ceník se změnil —
zkontrolujte, zda nabídka dodavatele platí“ (bez čísel) a admin ve
výjimce vidí nové srovnání. Schválení „pod ceníkem“ se přepočítá: je-li
ruční cena nově nad ceníkem, výjimka zmizí; je-li víc pod ceníkem,
vrátí se do „čeká“.

**Zámek odeslané nabídky:** zamčená varianta drží ruční cenu, zdroj
i razítka; nejde změnit ani vrátit. **Klon** přenese cenu i zdroj;
potvrzení a schválení zůstanou, protože obsah je stejný (B154) — první
změna je shodí.

**Controlling:** doporučuji **ano** — u položky sloupec „Zdroj ceny“
(ceník / nabídka dodavatele č. … / potvrdil / schválil) a „Odchylka od
ceníku“ (Kč, %). Controlling čte vedení, které náklady vidí.

| | Varianta |
|---|---|
| **B4-C1 (doporučeno)** | Zdroj + odchylka u každé ruční položky, souhrn „ruční ceny celkem“ v hlavičce exportu |
| B4-C2 | Jen příznak „ručně“ |
| B4-C3 | Nic (jako dnes) |

**Server:** `uloCenikProblemy` pustí změnu položky jen tehdy, když je
v platném ceníku označená jako „cena dle nabídky“ a ve `rucniCeny` je k ní
záznam se stejnou hodnotou. Razítka `potvrdil` / `schvalil` přepíše
z relace; podvržené razítko od klienta zahodí. Bez potvrzení se nový
zámek (tisk) odmítne 403.

### B5. Dnešní „cena dle nabídky“ u příplatků

| | Varianta |
|---|---|
| **B5-a (doporučeno)** | Sjednotit: i příplatky dle nabídky dostanou zdroj a potvrzení. Starší zakázky s vlastní cenou příplatku bez záznamu se berou jako „potvrzeno — bez dokladu“ (nic se jim nezablokuje). |
| B5-b | Příplatky nechat bez potvrzení (dvě pravidla vedle sebe). |

### B6. Pracnost, rizika, testy

| Krok | Obsah | Pracnost |
|---|---|---|
| 1 | Data `rucniCeny`, příznak dle nabídky na libovolnou cestu (ceník + UI ceníku) | S |
| 2 | UI řádek „cena z nabídky“, štítky stavů, ↺, bublina s razítkem | M |
| 3 | Server: `uloCenikProblemy` + razítka z relace + zábrana zámku | M |
| 4 | Výjimka „ruční cena pod ceníkem“ + #425 | S–M |
| 5 | Přepočet po novém ceníku, klon, zámek | S |
| 6 | Controlling (zdroj, odchylka) | S |
| 7 | Testy, mutace serveru, celé kolo | M |

Celkem **M–L** (≈ 1,5 dávky).

**Rizika.** (1) Obchodník z nákupní a prodejní ceny dopočítá přirážku —
přijatelné, přirážku nastavuje sám. (2) Podvržené razítko — razítko jen
ze serveru, test. (3) Zapomenutá platnost nabídky — štítek a kontrola.
(4) Obcházení ceníku u oceli — jen položky označené adminem. (5) Starší
zakázky s vlastní cenou příplatku nesmí po nasazení přestat tisknout.

**Testy.** Model: stavy (nepotvrzeno → potvrzeno → změna → nepotvrzeno;
↺); výjimka jen při snížení (a tolerance); klon a zámek; přepočet po
novém ceníku nepřepíše ruční cenu. Server (`test_prava`, mutace):
obchodník smí jen označenou položku; razítko z relace; bez potvrzení
403 při zámku; vlastní schválení odmítnuto (#425). Prohlížeč: harness
`overit_rucni_cena.mjs` (štítky, zábrana, P12 — obchodník nevidí
ceníkovou sazbu). Pojistka: před změnou FAIL.

---

## Otázky pro J. V. (doporučená odpověď první)

**A — Můstky**

1. A-Q1 Kam zadání můstků? — **samostatná karta „Můstky“ v Zadání šachty** / rozšířit dnešní řádky / nová záložka
2. A-Q2 Po kusech, nebo společně? — **skupiny stejných můstků (běžně 1 řádek)** / společná pole pro všechny / řádek za každý kus
3. A-Q3 Výchozí podlaha (odpovídá dnešní sazbě `C.mustekKc`)? — **pochozí plech** / pororošt / vana (beton)
4. A-Q4 Vana (beton): betonáž je naše dodávka? — **ne, jen ocelová vana, beton stavba** / ano, i betonáž
5. A-Q5 Sloupy navíc — jak oceňovat? — **Kč/bm × výška (prázdná = výška nástupiště)** / Kč/ks paušál
6. A-Q6 Model ceny? — **skladebný (konstrukce + podlaha + zábradlí + sloupy + kotvení + montáž)** / přirážky k dnešní ceně / matice provedení
7. A-Q7 Model 1? — **stejný výpočet v obou modelech** / Model 1 zůstane na #354
8. A-Q8 Cena v nabídce? — **samostatný řádek „Můstky“ v části B, šachta bez můstků** / „z toho můstky“ / jako dnes jen popis
9. A-Q9 Word? — **nová šablona CN v16 + klon pro v15** / jen klon bez nové šablony

**B — Ruční cena**

10. B-Q1 Co obchodník mění? — **nákupní cenu z nabídky dodavatele (+ přirážka)** / prodejní cenu položky / obojí podle práva
11. B-Q2 Které položky? — **jen označené adminem („cena dle nabídky“ pro libovolnou položku)** / všechny / pevný seznam
12. B-Q3 Kdy schválení adminem? — **snížení pod ceník ke schválení, zvýšení jen potvrzení** / tolerance X % / jen potvrzení / vše ke schválení
13. B-Q4 #425 (vlastní schválení) udělat zároveň? — **ano** / ne, zatím ponechat
14. B-Q5 Controlling? — **zdroj + odchylka od ceníku** / jen příznak „ručně“ / nic
15. B-Q6 Dnešní příplatky dle nabídky? — **sjednotit (zdroj + potvrzení), starší = potvrzeno bez dokladu** / nechat bez potvrzení
16. B-Q7 Pořadí? — **nejdřív B (ruční cena), pak A (můstky; zábradlí „sklo“ a „jiné“ využijí B)** / nejdřív A / obojí najednou
