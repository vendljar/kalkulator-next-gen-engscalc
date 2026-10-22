# Šablona Smlouvy o dílo – realizace v4 — CZ + EN + DE + FR (21. 10. 2026)

Dávka S11 (Controlling C6, #447), větev `claude/s11-sod-realizace-v4` nad `claude/integrace-16-10` 7ce01b3 (v21.10.4).
Kód aplikace beze změny. Podklad symbolů: `podklady/SOD_V4_OBJEDNANE_PRIPLATKY_21_10.md` ve větvi
`claude/controlling-c3` (kód `sodObjednaneSymboly` dodá C6 tamtéž).

> **v4 = v3 + blok objednaných příplatků v čl. V (Cena za dílo).** Na **test** až po sloučení C6 do test,
> na **main** až s C6 v main. Nahrávat **všechny čtyři jazyky najednou** průvodcem.

## 1. Soubory

| Soubor | Jazyk | Symbolů | Velikost | base64 | Vznikl z |
|---|---|---|---|---|---|
| `Sablona_SOD_REALIZACE_v4.docx` | CZ | 59 | 394 kB | 0,50 MB | `Sablona_SOD_REALIZACE_v3.docx` (Disk, Sablony, 1lMzwgBR5L4oHoaSd2SnQ6Gw3fsQPXJot) |
| `Sablona_SOD_REALIZACE_v4_EN.docx` | EN | 59 | 344 kB | 0,44 MB | `…_v3_EN.docx` (Disk, Sablony, 1RGNRPDiByNOJRmZI24bB7MfTYTKRNXLz) |
| `Sablona_SOD_REALIZACE_v4_DE.docx` | DE | 59 | 346 kB | 0,44 MB | `…_v3_DE.docx` (1oU7nIanpioiQSF4IdT5TrB3CxRaZLc35) |
| `Sablona_SOD_REALIZACE_v4_FR.docx` | FR | 59 | 347 kB | 0,44 MB | `…_v3_FR.docx` (1FIXz80dbQmhQzS1Y3GlHA0-JzHtkD6sE) |

Soubory sezení S11 (`podklady/sablony_vystup/`, gitignore), přiložené J. V. v sezení. **Na Disk je sezení
nenahrálo** — konektor bere obsah jen jako base64 přímo ve volání (0,44–0,50 MB na soubor), to nejde jinak než
ručním přepisem (stejně jako S9/S10). Nahrát ručně do Kalkulator NextGen / Sablony vedle v3; v3 nepřepisovat.

## 2. Co se mění (čl. V – CENA ZA DÍLO A FAKTURACE)

v3: odst. 1 „Objednatel se zavazuje zaplatit … dohodnutou cenu …, a to ve výši" a pod ním odrážka
„{{CENA_BEZ_DPH}} (bez DPH)". v4 za tu odrážku přidá **tři samostatné odstavce** (ne tabulka, bez odrážky —
číslování článku a odkaz „bod 4." se neposunou; styl a zarovnání jako odrážka, odsazení na text odrážky,
písmo běhu s cenou — Cambria 11):

```
• {{CENA_BEZ_DPH}} (bez DPH)                                       ← beze změny = CELKOVÁ cena díla
  z toho cena díla dle cenové nabídky č. {{CISLO_NABIDKY}}: {{SOD_CENA_NABIDKY}} (bez DPH)
  objednané příplatky:
  {{SOD_PRIPLATKY_OBJEDNANE}}                                       ← řádek na příplatek „název – cena"
  příplatky celkem: {{SOD_PRIPLATKY_KC}} (bez DPH)
```

- **Pořadí proti podkladu C3:** podklad navrhuje „Cena dle nabídky / Příplatky / Celkem / DPH / s DPH". v3 ale
  nemá v článku DPH v Kč ani cenu s DPH — jen „a to ve výši {{CENA_BEZ_DPH}} (bez DPH)". Kdyby blok stál před ní,
  věta „a to ve výši" by ukazovala na cenu dle nabídky a celková cena by zůstala bez popisku. Proto celková cena
  zůstává první a blok je její rozpis „z toho …". Bez objednaných příplatků builder vrátí tři symboly
  v `odstavcePryc`, docxgen (`odstranOdstavceSeSymboly`) odstraní odstavce celé → **smlouva vypadá přesně jako s v3**.
- **Sleva:** v3 nemá v článku o ceně `{{CENA_PRED_SLEVOU}}` ani `{{SLEVA_*}}` — není co přesouvat.
- `{{SOD_PRIPLATKY_OBJEDNANE}}` je víceřádkový — stojí na vlastním řádku pod popiskem (zalomení `<w:br/>`
  v témže odstavci), ať každý příplatek začíná na stejném odsazení.
- Splátky (`{{SOD_PLATEBNI_KALENDAR}}`) jsou v procentech z celkové ceny — šablona nic nového nepotřebuje.

**Překlad bloku** (terminologie jako revidované v3: EN Work / price quotation / excl. VAT, DE Werkpreis /
Preisangebot / ohne MwSt., FR Ouvrage / offre de prix / HT; příplatky jako sekce II. nabídky):

| CZ | EN | DE | FR |
|---|---|---|---|
| z toho cena díla dle cenové nabídky č. … | of which the price of the Work according to price quotation No. … | davon Werkpreis gemäß Preisangebot Nr. … | dont prix de l’Ouvrage selon l’offre de prix n° … |
| objednané příplatky: | ordered surcharges: | bestellte Zuschläge: | suppléments commandés : |
| příplatky celkem: … (bez DPH) | surcharges in total: … (excl. VAT) | Zuschläge insgesamt: … (ohne MwSt.) | total des suppléments : … (HT) |

Strojový překlad — ke kontrole rodilými mluvčími spolu s `SOD_EN_KONTROLA.md`.

## 3. Výroba

```
node nastroje/vyrob_sablony.js --sod-real-v4 <složka> [výstup]
```

Složka: `Sablona_SOD_REALIZACE_v3.docx` + `…_v3_EN/_DE/_FR.docx` (Disk, Sablony). **Kotvy sedly napoprvé.**

- **NÁLEZ — jazykové v3 na Disku jsou revidované:** `…_v3_EN/_DE/_FR.docx` (nahrané 21. 10. 13:42, deflate ~50 kB)
  se liší od výstupu `nastroje/preklad_sod.js` se slovníky `…_v3.preklad_<en|de|fr>.json` (Disk, 20. 10.) — v EN
  99 odstavců (např. „hereinafter the “Civil Code”" místo „NOZ", „excl. VAT", přeložený název v docProps). Aby se
  revize neztratila, nástroj vloží přeložený blok **přímo do jazykové v3** (kotva „{{CENA_BEZ_DPH}} (…)" v jazyce
  dokumentu); mimo blok je v4 shodná s v3 (0 rozdílných odstavců v EN, DE i FR). Když jazyková v3 ve složce není,
  nástroj přeloží CZ v4 slovníkem v3 + záznamy `SOD_REAL_V4_PREKLAD` (záloha, ověřeno: také 4× ✓). **Slovníky
  na Disku revidované znění neobsahují** — pro další verze je potřeba je srovnat (nebo vyrábět dál z jazykových v3).
- Každá kotva musí být právě jedna, jinak chyba (nic se nehádá); v CZ se navíc ověří úvod „… dohodnutou cenu … ve výši".

## 4. Ověření (funkce serveru `sablony.mjs` a průvodce)

| Soubor | testzip | base64 ≤ 5 MB | `sablonaObsahVady` | XML | jazyk | symboly |
|---|---|---|---|---|---|---|
| v4 CZ | OK | 0,50 MB | prázdné | bez vad | cz 100 % | proti v3 **+3 −0** |
| v4 EN | OK | 0,44 MB | prázdné | bez vad | en 99 % | proti CZ v4 +0 −0; proti v3_EN +3 −0 |
| v4 DE | OK | 0,44 MB | prázdné | bez vad | de 96 % | proti CZ v4 +0 −0; proti v3_DE +3 −0 |
| v4 FR | OK | 0,44 MB | prázdné | bez vad | fr 100 % | proti CZ v4 +0 −0; proti v3_FR +3 −0 |

Přibylo přesně `SOD_CENA_NABIDKY`, `SOD_PRIPLATKY_KC`, `SOD_PRIPLATKY_OBJEDNANE`. Česky v EN/DE/FR zůstaly jen
zkratky IČ / DIČ (jako v v3). Test `src/test_sod_real_v4.js` 17/0 (pojistka: před úpravou nástroje 0/1) —
smyšlený úryvek: tři samostatné odstavce bez odrážky, symbol v jednom běhu, chyba u dvojí / chybějící kotvy,
vyplnění `docxVyplnSablonu` bez příplatků (odstavce zmizí celé) a s příplatky, překlad bloku, jazyková kotva.

**Vyplnění kódem C6** — oddělený worktree nad `origin/claude/controlling-c3` 5d6ae24 (`sodObjednaneSymboly`),
`dokumentVygeneruj('sod', v4, …)` přesně jako aplikace, zkušební ceník, zakázka 1,6 × 1,8 m, zdvih 9 m, sleva 10 %,
kurz 25, zamčená řídící varianta; objednané = první 1 / 3 nabízené příplatky. **72 kontrol prošlo, 0 selhalo.**

| | bez příplatků | 1 příplatek | 3 příplatky |
|---|---|---|---|
| CZ | cena díla = cena nabídky (po slevě); DPH z ní; s DPH = cena díla + DPH | cena díla = cena nabídky + příplatek (bez slevy); DPH z celku | cena díla = cena nabídky + součet 3 příplatků; DPH z celku |
| EN/DE/FR | totéž v eurech (cena nabídky převedená celými eury nahoru); DPH z celku nahoru | cena díla = nabídka v € + příplatek v € (po položce nahoru); DPH z celku nahoru | cena díla = nabídka v € + součet příplatků v € (každý nahoru); DPH z celku nahoru |

*(K6-W6, rozhodnutí J. V. 22. 10. 2026: konkrétní částky ze zkušebního ceníku nahrazeny vztahy — test
`src/test_sod.js` a `src/test_d5_rozhodnuti_k6.js` ověřují právě tyto vztahy.)*

- **Bez příplatků** tři odstavce zmizí celé — žádný popisek „objednané příplatky" / „ordered surcharges" …,
  žádný prázdný odstavec; za cenou rovnou věta o režimu DPH, jako v3.
- **S příplatky** tři odstavce pod celkovou cenou; seznam má řádek na příplatek (`<w:br/>` v témže odstavci jako
  popisek), součet řádků = „příplatky celkem", celková cena = nabídka + příplatky, s DPH = celek + DPH (DPH z celku;
  v eurech po položkách nahoru). Názvy příplatků přeložené (např. EN „SILL EXTENSION PLATES - STAINLESS STEEL
  (MATERIAL)"; přechodové plechy šly jako dvě položky materiál / montáž; od D5 (K6-K3, rozhodnutí J. V. 22. 10. 2026) jsou jednou položkou „Přechodové plechy“ jako v nabídce).
- **Žádný symbol ceny ani rozpisu nezůstal.** Zbylé `{{OBJEDNATEL_*}}`, `{{SOD_TERMIN_*}}`, `{{SOD_SKLADNE}}` …
  jsou pole krycího listu, která zkušební zakázka nevyplnila — stejné jako u v3.

Skript ověření leží jen ve scratchpadu sezení (potřebuje kód C6, který v této větvi není); test šablony
`src/test_sod_real_v4.js` (18/0) hlídá totéž na smyšleném úryvku přes `docxVyplnSablonu` + `odstavcePryc`.

## 5. Starší verze aplikace

- **Aplikace bez C6 + v4:** symboly `SOD_CENA_NABIDKY` / `SOD_PRIPLATKY_*` nemají hodnotu ani nejsou v `odstavcePryc`
  → ve Wordu zůstanou viditelné `{{…}}` ve třech řádcích. ⇒ **nenahrávat před C6.**
- **C6 + stará v3:** smlouva vznikne, `{{CENA_BEZ_DPH}}` je celková cena díla (s příplatky), jen bez rozpisu.

## 6. Postup nahrání (J. V.)

0. Web běží s kódem C6 (test: po sloučení C6 do test; main: až s C6 v main).
1. Administrátor → **Nastavení → Šablony → Šablona smlouvy o dílo — REALIZACE (OCK)** → „Nahrát novou českou verzi…"
   → `Sablona_SOD_REALIZACE_v4.docx`. Kontrola: proti v3 **přibylo 3** (SOD_CENA_NABIDKY, SOD_PRIPLATKY_KC,
   SOD_PRIPLATKY_OBJEDNANE), **ubylo 0**, jazyk čeština, bez vad.
2. Krok jazykových verzí: nahrát `…_v4_EN/_DE/_FR.docx` z tohoto sezení (ne „vyrobit" v aplikaci — ta by
   nepoužila revidované znění) → **Zveřejnit**.
3. Tabulka šablon: SoD realizace v4 a EN/DE/FR „✓ z v4", nic „zastaralá".
4. Zkouška: zakázka OCK, krycí list → karta Smlouva o dílo → „Objednané příplatky" **nic** → Word CZ: čl. V jako
   dřív; zaškrtnout 1 a pak 3 příplatky → pod celkovou cenou „z toho …", seznam a součet, celková cena = nabídka +
   příplatky, DPH z celku; totéž EN. Žádné `{{…}}`.

## 7. Vyrobeno znovu 22. 10. (S12)

Zadání J. V. 22. 10. 2026: „šablony SoD realizace v4 potřebuji připravit ke stažení, ve složce nejsou“. Dávka S12,
větev `claude/s12-sod-v4-soubory` nad integrací 2f25daa (test v22.10.1 + P1 v22.10.2). Kód beze změny, verze beze změny.
Výroba **bez jazykových v3** ve složce — EN/DE/FR ze slovníků D4 (`nastroje/preklad_sod.js` přes `vyrob_sablony.js
--sod-real-v4`, nové odstavce rozpisu ze `SOD_REAL_V4_PREKLAD` = terminologie D4), už s opravou pořadí `w:pPr` (K6-W3).

**Zdroje** (Disk, Kalkulator NextGen / Sablony, 1RDW2m9p-OzDScADrhSi0H8ef6Mq_gyh7) — stažené bajtově
(`download_file_content` → soubor výsledku → dekódování base64 skriptem, žádný ruční přepis); soubory `…_VADNE.json`
nepoužité. Velikosti i sha256 slovníků se shodují s tabulkou D4 (`podklady/D4_SOD_SLOVNIKY_22_10.md`).

| Soubor | ID | Bajtů | sha256 |
|---|---|---|---|
| `Sablona_SOD_REALIZACE_v3.docx` | 1lMzwgBR5L4oHoaSd2SnQ6Gw3fsQPXJot | 392 457 | d756a31e8df7662abe046b82e8d7e916c3ad25cdce07cc938fcc13f0430ca7d1 (testzip OK) |
| `Sablona_SOD_REALIZACE_v3.preklad_en.json` | 1Snd3Y4GlrwYgCgVpvAt2-ZzIVL_QfOGR | 66 168 | 4586ac9a6432f98a4d038a046977250940f7ebdf778a166663873c0c5b63eed7 |
| `Sablona_SOD_REALIZACE_v3.preklad_de.json` | 1MvSeg8nqDMak9Y1T1p55Sn1mBay2CRr5 | 68 292 | 5c6acffaf288aaee773e04595b9520ba56f701efc44ab98fa504f4838f1aa5ba |
| `Sablona_SOD_REALIZACE_v3.preklad_fr.json` | 1oo6uORItk98CDeGai3z6yHElb3MJvBGi | 69 270 | 0356a45606757fd65ee5a6dcd255fc8837c8c944752ce959265530c96912e546 |

**Výstup** (soubory sezení S12, do repozitáře ani na Disk se nedávají):

| Soubor | Bajtů | sha256 |
|---|---|---|
| `Sablona_SOD_REALIZACE_v4.docx` | 393 846 | e8d39b804002835d7bdde046739ba2b13e3acbe1b766563bad8ade558c487e8a |
| `Sablona_SOD_REALIZACE_v4_EN.docx` | 343 540 | 681b899cc19e444e46db6d37f68d017372021c9d8933e44fde11d0b8c1daa830 |
| `Sablona_SOD_REALIZACE_v4_DE.docx` | 346 226 | da3e8aa8ab5b9e2869684207249067a9c7a5a7590a5649a1e8f7e47d7229d992 |
| `Sablona_SOD_REALIZACE_v4_FR.docx` | 346 751 | c1cff16ca4ff0f1e73ecbf28dc8e92e72d5c31fb5d36758a52718ecef05ccbb8 |

**Ověření** (`vyrob_sablony.js --sod-real-v4` kód 0 + ověřovací skript sezení nad kódem C6 v této větvi, 63 / 0):

| Soubor | symboly | `sablonaObsahVady` | `docxXmlVady` | `w:pPr` mimo pořadí | jazyk | w:lang / themeFontLang |
|---|---|---|---|---|---|---|
| v4 CZ | 59; proti v3 **+3 −0** | prázdné | prázdné | 0 / 267 (nové 3 OK) | cz 100 % | — |
| v4 EN | 59; proti CZ v4 **+0 −0** | prázdné | prázdné | 0 / 267 (nové 3 OK) | en 99 % | jen en-GB / en-GB |
| v4 DE | 59; proti CZ v4 **+0 −0** | prázdné | prázdné | 0 / 267 (nové 3 OK) | de 96 % | jen de-DE / de-DE |
| v4 FR | 59; proti CZ v4 **+0 −0** | prázdné | prázdné | 0 / 267 (nové 3 OK) | fr 100 % | jen fr-FR / fr-FR |

- Přibylo přesně `SOD_CENA_NABIDKY`, `SOD_PRIPLATKY_KC`, `SOD_PRIPLATKY_OBJEDNANE`; přeloženo 140 odstavců v každém jazyce.
- Nové odstavce: EN „of which the price of the Work according to price quotation No. … (excl. VAT)“ · „ordered surcharges:“ ·
  „surcharges in total: … (excl. VAT)“; DE „davon Werkpreis gemäß Preisangebot Nr. … (ohne MwSt.)“ · „bestellte Zuschläge:“ ·
  „Zuschläge insgesamt: …“; FR „dont prix de l’Ouvrage selon l’offre de prix n° … (HT)“ · „suppléments commandés :“ ·
  „total des suppléments : … (HT)“ — shodně s D4 bod 3 (k ověření J. V. zůstává).
- **Vyplnění kódem C6** (`dokumentVygeneruj('sod', v4, …)` jako aplikace, zkušební ceník, zakázka 1,6 × 1,8 m, zdvih 9 m,
  sleva 10 %, kurz 25, zamčená varianta; objednané 0 / 1 / 3 první nabízené příplatky), všechny 4 jazyky: žádný symbol ceny
  ani rozpisu nezůstal, XML vyplněného souboru bez vad; bez příplatků rozpis zmizí celý (žádný popisek); s příplatky
  celkem = nabídka + příplatky, řádek na příplatek. Součty shodné s tabulkou v oddílu 4 (vzorová zakázka, ne ceny firmy).
- Repo testy: `test_sod_real_v4` 20 / 0, `test_sod` 60 / 0, `test_preklad_sod` 19 / 0. Prohlížečové sady a celé kolo
  nepouštěny (pustí koordinace).

**Ke stažení:** soukromý artefakt „Šablony SoD realizace v4“ https://claude.ai/artifact/46MdDQowmCeKPdP5Z7ghfw (capability
`downloads`, tlačítko u každého souboru + „Stáhnout všechny čtyři“; před uložením ověří sha256). HTML vyrobil skript
sezení (base64 vkládá skript, kontrola zpětným dekódováním: 4 × shoda sha256). Soubory jsou i přílohami sezení S12.
Postup nahrání beze změny (oddíl 6) — nahrát EN/DE/FR z artefaktu, ne vyrábět v aplikaci.
