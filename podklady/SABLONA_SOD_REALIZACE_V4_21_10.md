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
| CZ | 983 000,00 Kč; DPH 117 960,00; s DPH 1 100 960,00 | 989 000,00 = 983 000,00 + 6 000,00; DPH 118 680,00 | 1 041 000,00 = 983 000,00 + 58 000,00; DPH 124 920,00 |
| EN/DE/FR | € 39 320; DPH € 4 719; s DPH € 44 039 | € 39 560 = € 39 320 + € 240; DPH € 4 748 | € 41 640 = € 39 320 + € 2 320; DPH € 4 997 |

- **Bez příplatků** tři odstavce zmizí celé — žádný popisek „objednané příplatky" / „ordered surcharges" …,
  žádný prázdný odstavec; za cenou rovnou věta o režimu DPH, jako v3.
- **S příplatky** tři odstavce pod celkovou cenou; seznam má řádek na příplatek (`<w:br/>` v témže odstavci jako
  popisek), součet řádků = „příplatky celkem", celková cena = nabídka + příplatky, s DPH = celek + DPH (DPH z celku;
  v eurech po položkách nahoru). Názvy příplatků přeložené (např. EN „SILL EXTENSION PLATES - STAINLESS STEEL
  (MATERIAL)"; přechodové plechy jdou jako dvě položky materiál / montáž, jak říká podklad).
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
