# Plán realizace VS — víc šachet v jedné nabídce OCK (#570)

(Název souboru `VS_PLAN_REALIZACE.md`, ne `PLAN_VS_…`: vzor `PLAN_*.md` je v `.gitignore` pro pracovní poznámky.)

10. 11. 2026, sezení tématu „Víc šachet v OCK (#570)“, větev `claude/vs-vice-sachet`.
**Plán. ZMĚNA 10. 11. (J. V.): žádná sběrná větev — VS se slučuje do INTEGRACE po etapách za vypínačem v Nastavení (R21, oddíl 2). Realizace E0 + E1 + vypínač běží v sezení „VS-E0/E1 #570“, větev `claude/vs-e0e1` nad integrací `3ff5403`, a čte podklady z `claude/vs-vice-sachet`.**

- Závazný návrh: `podklady/NAVRH_VICE_SACHET_05_11.md` (rozhodnutí R1–R21; O15 rozhodnuta = R20, vypínač = R21).
- Závazný vzhled a chování: klikací prototyp v9
  https://claude.ai/artifact/PPL2GLSARywu7j2whk2KY2, zdroj `podklady/VS_PROTOTYP_06_11.html`
  a vrstvy `podklady/vs_prototyp/`. Prototyp běží na skutečné sestavě integrace
  7eab7a8; vrstva `b_vice_sachet.js` je referenční implementace obalu výpočtu,
  součtu, rozpočtu a vložených prvků.
- Výchozí SHA realizace: **integrace `3ff5403`** (E0 + E1; další etapy nad aktuální integrací).
  Stav 10. 11.: test = v7.11.1, main = v6.11.5.

---

## 1. Cíl

Víc šachet se staví **po etapách přímo v integraci** a s ní jde do testu,
ale **schované za vypínačem** v Nastavení (R21). J. V. testuje na testovacím
webu (testengscalc) se zapnutým vypínačem; s vypnutým je aplikace přesně
jako dnes. Do `main` jde VS až po odsouhlasení J. V. (zapnutí vypínače na
ostrém webu je samostatné rozhodnutí).

---

## 2. Slučování do integrace a do testu (změna J. V. 10. 11.)

Původní plán se sběrnou větví `claude/vs-balik` (celý balíček najednou) je
**zrušený**. Platí:

1. **Vypínač „Víc šachet v nabídce“ v Nastavení** (R21):
   - mění ho jen správce (právo jako ostatní volby Nastavení), **výchozí VYP**;
   - ukládá se v nastavení programu na serveru (jako ostatní firemní volby),
     platí pro všechny uživatele daného webu — na testu ho J. V. zapne,
     na ostrém zůstane vypnutý;
   - **VYP:** v UI není pole „Počet variant šachet v nabídce“ ani „Počet
     kusů“ a žádný prvek víc šachet; výpočet, dokumenty, zámek i server
     jsou **bajt po bajtu jako dnes** (hlídá zlatá sada E0 ve stavu VYP);
   - **ZAP:** chování podle R16–R20 (jedna šachta = dnešní vzhled + pole
     Počet variant a Počet kusů; od 2 variant nebo ks > 1 režim víc šachet).
   - Zakázka, která už má víc šachet (`ock.dalsi` nebo ks > 1), a vypínač je
     VYP: výpočet a dokumenty se **počítají podle dat** (cena se vypnutím
     nemění), editace šachet je nedostupná a lišta řekne „Zakázka má víc
     šachet — funkce je v Nastavení vypnutá“. (Potvrzeno J. V. 10. 11.;
     vypnutí tak nemění cenu uložených nabídek.)
2. **Každá etapa se slučuje do integrace samostatně** (běžný postup:
   vlastní větev `claude/vs-e<N>-…` nad aktuální integrací, celé kolo,
   sloučení na pokyn koordinace, vlastní verze). Rozpracovaná funkce je
   v testu jen za vypínačem.
3. **Kolize se souběžnými dávkami** (`kalk_ock.js`, `common.js`,
   `nabidka.js`, `kryci.js`, `engine.js`): každá etapa začíná nad aktuální
   integrací, takže konflikty se řeší při jejím sloučení jako u jiných dávek;
   zlatá sada se po každém sloučení pouští znovu.
4. **Zlatá sada ve dvou stavech:** VYP = dnešní stav bajt po bajtu (všechny
   etapy); ZAP + 1 šachta = dnešní výpočet a dokumenty, v UI navíc jen dvě
   pole v záhlaví Zadání (pixelové srovnání jako u prototypu).
5. **Testovací web:** po sloučení etapy J. V. zapne vypínač na testu a
   zkouší, co etapa přinesla; scénáře z prototypu v9.
6. **Roadmapa po etapách** (oddíl 10); zastřešující #570 zůstává.

---

## 3. Etapy

Pracnost: S = hodiny, M = 1–2 dny, L = 3–5 dní (dny práce sezení).

### E0 — Zlatá sada „1 šachta“ (S, ½ dne)
- **Před první změnou kódu** vyrobit otisky z `7eab7a8`:
  `nastroje/zlata_vs.js` → `src/test_vs_zlata.json`.
- Co se otiskuje pro každou fixturu (`src/fixtury`, dnes 1 odeslaná zakázka) a 300 náhodných zadání
  fuzzu (`test_fuzz_invarianty.js`, pevné semínko):
  - výsledek `vypocet` a `vypocetZ` (stabilní JSON, haléře);
  - koncová cena `cenaNabidkyOck`;
  - náhled CN `nabidkaData` a placeholdery Wordu (v16), text dokumentu z
    `docxVyplnSablonu` nad zkušební šablonou;
  - krycí list `kryciData` (OCK), technická specifikace (`TECHSPEC_DEF`
    předvyplnění), SoD data, controlling export (CSV), Pipedrive náhled
    (`pd_nanecisto`), otisk zámku `zamekSnimekSpocti`.
- Test `src/test_vs_zlata.js` porovná bajt po bajtu; jako vzor slouží
  `test_560_zlata.json` + `nastroje/zlata_560.js`.

### E1 — Data, jádro, server a vypínač (M, 2–2½ dne)
- **Nový modul `src/vice_sachet.js`** (do CORE v `build.py` za `engine.js`,
  do `netlify/lib/jadro_moduly.cjs`):
  - `sachtyZ(d)`, `rezimViceSachet(d)`;
  - `vypocetZakazkyOck(d, jekly)`: u jedné šachty vrátí přímo `vypocet()`;
    jinak výsledek každé šachty, součet × ks, slučování řádků sekcí,
    příplatků, volitelných a můstků, CEIL jen na součtu (R3), popisné
    objekty ze šachty 1, `sachty[]`;
  - `rozpocetSachet(T, castky)`: BigInt, největší zbytek (R7);
  - `priplatkySloucene()` (R8, R13).
- **`engine.js`**: jen 3 nová pole v `souhrn` — `zakladCenaPredZaokr`,
  `priplatkyCenaPredZaokr`, `mustkyCenaPredZaokr`. Nic jiného.
- **`zamek.js` `vypocetZ`** volá obal → všech 17 souborů, které čtou
  výsledek přes `vypocetZ` / `vypocetAkt`, dostane součet bez úprav.
- **`zakazka.js`**: `ock.dalsi[]`, `ock.nazev`, `ock.ks` nejsou ve vzoru
  (import je nedoplní); klon a kopie varianty kopírují `dalsi`; porovnání
  variant ze součtu.
- **Migrace starých zakázek: žádná.** Chybějící `dalsi` = jedna šachta.
- **Server `uloziste.js`**: kontrola tvaru `ock.dalsi` (≤ 10 variant, ks
  1–20, název ≤ 80 znaků, zadání každé šachty stejnou kontrolou jako
  šachta 1, vč. skupin můstků), 409 při ztrátě `dalsi` proti uložené verzi;
  `netlify/functions/vypocet.mjs` a `sluzba.js` přes obal.
- **Vypínač R21:** volba v Nastavení (jen správce, výchozí VYP), uložení
  v nastavení programu na serveru, funkce `viceSachetZapnuto()`; s VYP se
  nezobrazí žádný prvek VS a nový kód se v cestě výpočtu nevykoná (u dat
  bez `dalsi` a ks 1). Zlatá sada E0 ve stavu VYP i ZAP.
- **Testy:** `test_vs_vypinac.js`, `test_vs_soucet.js`, `test_vs_rozpocet.js` (10 000 sad),
  `test_vs_hrana_tisicovky.js`, `test_vs_server.js`, `test_vs_model1.js`,
  zlatá sada zelená. Nový modul do mutačních cílů jádra
  (`netlify/mutace.mjs`).

### E2 — Zadání a karta Šachty varianty (M, 1½ dne)
- **`ui/kalk_ock.js`, `ui/common.js`**:
  - pole „Počet variant šachet v nabídce“ (`CISLO_POLE`) v záhlaví Zadání
    šachty (R17, R19) a vedle něj u jedné šachty pole „Počet kusů“ (R20,
    2+ ks zapne režim víc šachet s jednou variantou);
  - karta „Šachty varianty“ přes `kartaRezim`: přepínač `.rada-prep`,
    název, Počet stejných kusů (`CISLO_POLE`), Kopírovat, Smazat;
  - v záhlaví karty Počet variant (vstup) + Počet šachet celkem (Σ ks)
    (R19); v záhlaví Zadání „Počet kusů této šachty“ (R19);
  - přepínání globálního `Z` na aktivní šachtu (`syncVarianta`) a
    `renderInputs` s výsledkem aktivní šachty;
  - potvrzení snížení na stránce (R18), historie Zpět;
  - Model 1: počet variant jen 1, volba Model 1 u víc šachet zakázaná;
  - karta Můstky po šachtách (už funguje přes `Z`).
- **Harness `overit_vs_zadani.mjs`** (Playwright): 1 ↔ 2 ↔ 3 varianty, 1 varianta × 3 ks (R20), ks,
  přejmenování, kopie, smazání s potvrzením, Model 1, en-US „17,3“.

### E3 — Kalkulace, cena, sleva, přehledy (M, 2 dny)
- **`ui/kalk_ock.js` `renderOutputs`**: přepínač šachta / Součet v Cenové
  kalkulaci (Součet jen ke čtení); hlavička ceny s rozpisem; Detail výpočtu
  po šachtě.
- **`ui/zaokrouhleni_ui.js`**: tabulka rozpočtu do šachet.
- **Sleva a schvalování** (`sleva.js`, `ui/schvalovani_ui.js`): limit ze
  součtu, žádost ukáže počet variant / šachet celkem.
- **Příplatky**: sloučený pohled (R8, R13).
- **Přehled nabídek a porovnání** (`ui/seznam_ui.js`, `zakazka.js`):
  „2 varianty / 3 ks“.
- **Harness `overit_vs_kalkulace.mjs`**, test `test_vs_sleva.js`,
  `test_vs_priplatky.js`.

### E4 — Cenová nabídka, Word v17, specifikace, překlady (L, 3–4 dny)
- **`nabidka.js`**: tabulka variant šachet (R4, R12), u víc šachet bez řádku
  Můstky a s „vč. můstků“ (R14), jedna šachta jako dnes (R15), technická
  část MŮSTKY po šachtách; placeholdery `SACHTA_NAZEV`, `SACHTA_KS`,
  `SACHTA_CENA_BEZ_DPH`, `POCET_VARIANT`, `POCET_SACHET_CELKEM`.
- **`docxgen.js`**: smyčka `{#sachty}…{/sachty}` (obdoba
  `nabidkaMustkyKlon` / `DOCX_CENA_CASTI`), technické řádky `TS_*` ve
  smyčce.
- **Šablona v17**: `node nastroje/vyrob_sablony.js --cn-v17 <podklady>` z v16
  (firemní šablony nejsou v repu, předávají se přes `KNG_PODKLADY`). U jedné
  šachty dá v17 stejný dokument jako v16 (zlatá sada).
- **Zábrana v15/v16 u víc šachet** — funkce pro `kontroly.js` (zapojí E5).
- **Technická specifikace** (`techspec.js`, `ui/techspec_ui.js`): oddíl po
  šachtách; ruční hodnoty šachty 2+ v `dalsi[i].techspec`; přepínač šachty;
  `tsMaSklo` / `tsOplPasyPoStenach` s výsledkem šachty.
- **Překlady** (`preklad.js`, EN/DE/FR): nové texty CN a specifikace
  (Varianta šachty, šachet celkem, „vč. můstků“, Cena celkem před slevou…).
  E4 vlastní `preklad.js` pro celý balíček; E5 mu pošle své texty.
- **Testy:** `test_vs_nabidka.js`, `test_vs_docx_v17.js`, `test_vs_techspec.js`,
  `overit_vs_dokumenty.mjs` (Word i náhled).

### E5 — Krycí list, SoD, controlling, Pipedrive, zámek, kontroly (L, 3 dny)
- **`kryci.js`, `ui/kryci_ui.js`**: předmět „N variant šachet, celkem X ks“,
  tabulka variant, `kryciMustkyText` po šachtách, hodiny součtem (R9).
- **`sod.js`, `objednane.js`**: předmět vyjmenuje varianty a ks, cena = součet,
  rozpis v příloze; objednané položky ze součtu.
- **`controlling.js`**: beze změny tvaru (R5), jen test, že kapitoly =
  součet šachet; v hlavičce exportu počet variant / šachet celkem.
- **`pd_nanecisto.js`**: hodnota = cena nabídky, do poznámky seznam variant
  s ks (R6); jedna šachta jako dnes.
- **`zamek.js`**: otisk nese `sachty[]` a `sachtyVerze: 1`; dotisk ze snímku;
  zamčená varianta nedovolí přidat / smazat šachtu.
- **`kontroly.js`**: kontroly po šachtách s názvem šachty, zábrana šablony
  v15/v16 a Modelu 1 u víc šachet, nepotvrzená ruční cena.
- **Testy:** `test_vs_vystupy.js`, `test_vs_zamek.js`, `test_vs_kontroly.js`,
  `overit_vs_kryci_sod.mjs`.

### E6 — Dokumentace a celé kolo (M, 1½ dne + kolo)
- Manuály: `manual/` (obsah, admin, kompletní: kapitola víc šachet),
  `manual_vypocet/` (další vydání: součet, rozpočet, můstky po šachtách),
  příručka „Co je nového“, CHANGELOG, roadmapa #570 + #590–#596.
- Celé testovací kolo `nastroje/testovaci_kolo.sh` s mutacemi po částech
  (jádro N = 4, server N = 12–16), Playwright přes `node_modules/playwright`.
- Ruční zkouška scénářů z prototypu na sestavě balíčku.
- Poslední sloučení do integrace, příprava na `main` (vypínač na ostrém zůstává VYP, zapnutí rozhodne J. V.).

---

## 4. Pořadí, závislosti a paralelní sezení

```
E0+E1+vypínač ─► integrace ─┬─► E2 ─► integrace ─► E3 ─► integrace ─┐
                            ├─► E4 (dokumenty) ─► integrace ────────┤─► E6 ─► integrace ─► test (vypínač ZAP na testu)
                            └─► E5 (KL, SoD, zámek) ─► integrace ───┘
(každé sloučení jde s integrací do testu; s vypínačem VYP beze změny)
```

| Sezení | Etapy | Soubory (vlastní) | Smí paralelně s |
|---|---|---|---|
| S1 (téma VS) | E0, E1, pak E2, E3, nakonec E6 | `vice_sachet.js`, `engine.js` (souhrn), `zamek.js` (`vypocetZ`), `zakazka.js`, `uloziste.js`; pak `ui/kalk_ock.js`, `ui/common.js`, `ui/zaokrouhleni_ui.js`, `sleva.js`, `ui/schvalovani_ui.js`, `ui/seznam_ui.js` | S2, S3 po E1 |
| S2 | E4 | `nabidka.js`, `docxgen.js`, `techspec.js`, `ui/techspec_ui.js`, `preklad.js`, `nastroje/vyrob_sablony.js` | S1 (E2/E3), S3 |
| S3 | E5 | `kryci.js`, `ui/kryci_ui.js`, `sod.js`, `objednane.js`, `controlling.js`, `pd_nanecisto.js`, `zamek.js` (snímek), `kontroly.js` | S1 (E2/E3), S2 |

- **Sériově:** E0 → E1 (jádro a data musí být hotové dřív, než na ně
  kdokoli stavějí dokumenty a UI); E2 → E3 (stejné soubory UI); E6 na konec.
- **Paralelně po E1:** S2 a S3 mají oddělené soubory. Jediná sdílená místa:
  - `preklad.js` vlastní jen S2 (S3 posílá texty přes koordinaci);
  - `kontroly.js` vlastní jen S3 (S2 dodá funkci zábrany šablony);
  - `zamek.js`: E1 mění jen `vypocetZ`, E5 jen snímek. E5 začíná až po
    sloučení E1 do integrace.
- Každé sezení dělá vlastní větev `claude/vs-e<N>-…` nad aktuální
  integrací a po ucelené etapě se slučuje do integrace (na pokyn koordinace).

---

## 5. Testy

| Druh | Co | Kdy |
|---|---|---|
| **Zlatá sada** | `test_vs_zlata.js`: 1 šachta = 7eab7a8 bajt po bajtu (výpočet, cena, náhled CN, Word v16 i v17, KL, specifikace, SoD, controlling CSV, Pipedrive, otisk zámku) | od E0, při každé etapě |
| Nové sady | `test_vs_soucet`, `_rozpocet`, `_hrana_tisicovky`, `_server`, `_model1`, `_sleva`, `_priplatky`, `_nabidka`, `_docx_v17`, `_techspec`, `_vystupy`, `_zamek`, `_kontroly` | v etapě, která věc zavádí |
| Harnessy | `overit_vs_zadani`, `overit_vs_kalkulace`, `overit_vs_dokumenty`, `overit_vs_kryci_sod` (Playwright, 1200/1440/1920, en-US) | E2–E5 |
| Pixely | Kalkulace s 1 šachtou = sestava 7eab7a8 mimo pole Počet variant (jako u prototypu) | E2, E6 |
| Mutace | `vice_sachet.js` a nové funkce v `uloziste.js` do mutačních cílů; po částech | E1 (jádro), E6 (celé) |
| Pojistky | každý nový test před implementací selže (zapsat do commitu) | vždy |
| Celé kolo | `testovaci_kolo.sh` bez přerušení mutací, výsledek „VŠE ZELENÉ“ | E6 |

---

## 6. Odhad času

| Etapa | Práce sezení | Poznámka |
|---|---|---|
| E0 | ½ dne | |
| E1 | 2 dny | + mutace jádra po částech |
| E2 | 1½ dne | |
| E3 | 2 dny | |
| E4 | 3–4 dny | + šablona v17 (závisí na podkladech) |
| E5 | 3 dny | |
| E6 | 1½ dne + celé kolo | kolo s mutacemi po částech ~1 den |

Celkem asi **13–15 dní práce**. Se třemi sezeními paralelně (S2, S3 po E1)
asi **8–10 dní kalendářně** do zeleného kola balíčku. Odhad, ne závazek;
nejistota je hlavně v E4 (Word šablona) a v kolizích se souběžnými dávkami.

---

## 7. Rizika

| Riziko | Ošetření |
|---|---|
| Tichá změna ceny nebo dokumentu staré zakázky | zlatá sada od E0; u jedné šachty obal vrací výsledek jádra beze změny |
| Skok o 1 000 Kč na hraně tisícovky | pole `zakladCenaPredZaokr`, test hrany |
| Kolize s jinými dávkami v `kalk_ock.js` / `nabidka.js` | každá etapa nad aktuální integrací, zlatá sada po každém sloučení |
| Word šablona v17 (podklady mimo repo) | generátor z v16, zlatá sada v16 = v17 u jedné šachty, zábrana starých šablon |
| Starší karta prohlížeče zahodí `dalsi` | 409 na serveru |
| Výkon u 10 variant | výpočet po šachtách v ms; mezipaměť aktivní šachty |
| Mutace nestihnou časový limit | po částech, `--od` navazuje |
| Překlady EN/DE/FR nových textů | jeden vlastník `preklad.js` (S2), kontrola nepřeložených (`overit_neprelozene.mjs`) |
| Zámek a dotisk starých nabídek | otisk bez `sachtyVerze` = jedna šachta, test |

---

## 8. Co musí dodat J. V.

1. ~~Odpověď na O15~~ — rozhodnuto 10. 11.: R20 (pole „Počet kusů“ i u jedné šachty).
2. **Podklady s firemními šablonami** (CN v16 a starší) pro výrobu v17 přes
   `KNG_PODKLADY`, a po E4 **nahrání šablony v17** do šablon online.
3. **Rozhodnutí o souběžných dávkách** (bod 2.2): zmrazit dávky v
   `kalk_ock.js`, `common.js`, `nabidka.js`, `kryci.js`, `engine.js`
   po dobu E1–E5, nebo souhlas s průběžným přeskládáním.
4. **Pipedrive:** potvrdit, do kterého pole dealu jde seznam variant
   (poznámka dealu, nebo existující textové pole z mapy #115/#553).
5. **Čas na ruční test** na testengscalc se zapnutým vypínačem po sloučení každé etapy.
6. ~~Chování zakázky s víc šachtami při VYP~~ — rozhodnuto 10. 11. (cena a dokumenty podle dat, editace zamčená s hláškou; R21).

---

## 9. Otázky pro J. V. (doporučená odpověď první)

- **O15** — rozhodnuto 10. 11. = a) (R20).
- **P1 — Souběžné dávky během VS:** a) zmrazit dávky v kolizních souborech
  po dobu E1–E5 (doporučeno, méně konfliktů a jistější zlatá sada) ·
  b) pouštět dál, každá etapa nad aktuální integrací (po změně 10. 11.
  s vypínačem je b) bezpečnější než dřív — zlatá sada VYP po každém sloučení).
- **P2 — Sezení:** a) tři sezení (S1 téma VS, S2 dokumenty, S3 KL/SoD/zámek)
  po E1 paralelně (doporučeno, rychlejší) · b) vše postupně v jednom sezení.

---

## 10. Položky roadmapy (návrh)

Zastřešující **#570** zůstává. Pod ní (od #590, obsazeno do #578, K40 drží
#567 a #579+):

| # | Název | Vlna | Složitost | Závisí |
|---|---|---|---|---|
| #590 | VS-E0: zlatá sada „1 šachta = beze změny“ (otisky z 7eab7a8) | C | S | — |
| #591 | VS-E1: data `ock.dalsi[]`, modul `vice_sachet.js`, obal `vypocetZ`, server | C | M | #590 |
| #592 | VS-E2: zadání — Počet variant / šachet celkem, karta Šachty varianty | C | M | #591 |
| #593 | VS-E3: kalkulace šachta/Součet, hlavička ceny, rozpočet, sleva, přehledy | C | M | #592 |
| #594 | VS-E4: CN tabulka variant, Word v17, specifikace po šachtách, překlady | C | L | #591 |
| #595 | VS-E5: krycí list, SoD, controlling, Pipedrive, zámek, kontroly | C | L | #591 |
| #596 | VS-E6: manuály, CHANGELOG, celé kolo, sloučení balíčku do integrace | C | M | #592–#595 |

Do `roadmap.json` se zapíšou až po souhlasu koordinace (čísla může
přečíslovat).

---

## 11. Prompt pro spuštění (šablona)

> SPUSŤ VS E<N> nad <SHA aktuální integrace>. Větev
> `claude/vs-e<N>-<popis>`. Závazné: `podklady/NAVRH_VICE_SACHET_05_11.md`
> (R1–R21), `podklady/VS_PLAN_REALIZACE.md` (etapa E<N>, vlastní soubory),
> prototyp `podklady/VS_PROTOTYP_06_11.html` + `podklady/vs_prototyp/b_vice_sachet.js`.
> CLAUDE.md: hooky, žádné `--no-verify`, číselná pole jen `CISLO_POLE`,
> pojistky testů, zlatá sada `test_vs_zlata.js` zelená, verze se nezvyšuje
> (`KNG_NEZVYSOVAT_VERZI=1`). Po ucelené etapě commit + push + PREDAVKA,
> ohlásit koordinaci (SHA, testy, co dál).
