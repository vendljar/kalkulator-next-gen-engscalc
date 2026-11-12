# Šablona Smlouvy o dílo – realizace v5 — CZ + EN + DE + FR (11.–12. 11. 2026)

Dávka C2 (#583, rozhodnutí J. V. 11. 11. 2026, B0.4), větev `claude/c23-sod-v5` nad integrací `aa445a1`
(test v11.11.1). Verze kódu v12.11.1 (číslo potvrdí koordinace).

> **v5 = v4 + dva odstavce se šachtami.** Na **test** po sloučení dávky C2/C3 do test (kód, který symboly
> plní a u jedné šachty odstavce maže). Na **main** až s kódem víc šachet (na main je víc šachet vypnuté).
> Nahrávat **všechny čtyři jazyky najednou** průvodcem.

## 1. Soubory

Vznikly nástrojem z revidovaných v4 na Disku (Kalkulator NextGen / Sablony, stažené bajtově, testzip OK).
Výstup sezení (`podklady/sablony_vystup/`, gitignore) — J. V. je dostal v sezení. **Do repa ani na Disk se nedávají.**

| Soubor | Jazyk | Symbolů | Bajtů | base64 | sha256 | Vznikl z (sha256 shodné s S12) |
|---|---|---|---|---|---|---|
| `Sablona_SOD_REALIZACE_v5.docx` | CZ | 61 | 394 671 | 0,53 MB | 752674d4…f59f6 | `…_v4.docx` (14gQQRMLM1yJhY4Wwe02pPL1JhfdW8t-L), e8d39b80… |
| `Sablona_SOD_REALIZACE_v5_EN.docx` | EN | 61 | 344 365 | 0,46 MB | f9b5f2f7…17ee58 | `…_v4_EN.docx` (12bDj9-b2rLl5ztGTRducgGyvGVMqC2yj), 681b899c… |
| `Sablona_SOD_REALIZACE_v5_DE.docx` | DE | 61 | 347 051 | 0,46 MB | d9603b62…c0e37c | `…_v4_DE.docx` (1ypTJpnPqGTuolJ88LXJGgn358rm8wzqA), da3e8aa8… |
| `Sablona_SOD_REALIZACE_v5_FR.docx` | FR | 61 | 347 576 | 0,46 MB | 633c9b27…0df86b | `…_v4_FR.docx` (1BVkqAVh1-LE5Jd8fO204B40d0s-3FX8r), c1cff16c… |

## 2. Co se mění

Dva **samostatné odstavce, které nesou jen symbol** — žádný pevný text, takže není co překládat a jazykové
verze vznikly úpravou každého revidovaného jazykového souboru (ne strojovým překladem).

1. **Čl. II – Předmět smlouvy:** za odstavec „Předmětem této smlouvy je dodávka a montáž ocelové konstrukce
   výtahové šachty včetně jejího opláštění (dále jen „dílo“).“ odstavec `{{SACHTY_SOD_PREDMET}}` — písmo
   sousedního odstavce (Cambria), **bez číslování** (numId 0 — číslo článku se neposune), odsazení na text
   odstavce, zarovnání vlevo.
2. **Čl. V – Cena za dílo:** za odstavec „z toho cena díla dle cenové nabídky č. {{CISLO_NABIDKY}}:
   {{SOD_CENA_NABIDKY}} (bez DPH)“ odstavec `{{SACHTY_SOD_ROZPIS}}` (stavba odstavců rozpisu v4, odsazení 1080).
   Celková cena `{{CENA_BEZ_DPH}}` zůstává první, takže věta „… a to ve výši“ ukazuje dál na **celkovou cenu
   díla** (úvaha o pořadí jako ve v4, oddíl 2 podkladu v4). Aplikace rozepíše rozpis na odstavec za šachtu
   (`docxRozpisOdstavce`: bez číslování, vlevo, bez mezer v bloku).

**Jedna šachta = v4 znak po znaku:** aplikace oba symboly vrátí v `odstavcePryc`, odstavce zmizí celé.

**Náhled textu (Výtah A 1 ks + Výtah B 2 ks, bez slevy; částky nahrazené vztahem — K6-W6):**

```
Předmětem této smlouvy je dodávka a montáž ocelové konstrukce výtahové šachty včetně jejího opláštění (dále jen „dílo“).
2 varianty šachet, celkem 3 ks (Výtah A 1 ks, Výtah B 2 ks)
…
Objednatel se zavazuje zaplatit … dohodnutou cenu …, a to ve výši
C Kč (bez DPH)                      ← celková cena díla
Výtah A – 1 ks – A Kč
Výtah B – 2 ks – B Kč               ← A + B = C (bez slevy)
DPH bude účtováno …
```

S objednaným příplatkem: celková cena → „z toho cena díla dle cenové nabídky č. …“ → řádky šachet → „objednané
příplatky:“ a seznam → „příplatky celkem: …“.

**Otázky k odsouhlasení (J. V.):**
- Uvozující text: odstavce nemají „z toho:“ ani „Předmět díla tvoří:“. Kdyby J. V. chtěl, návrh je dát ho
  **do hodnoty symbolu** (aplikace, slovník EN/DE/FR) — s jednou šachtou zmizí s odstavcem; šablona se nemění.
- Řádky rozpisu jsou ceny **před slevou** (rozpočet R7, VS-E5). U nabídky se slevou se součet řádků nerovná
  celkové ceně díla (ta je po slevě) — pak by se hodil řádek „sleva …“ (v symbolu, ne v šabloně).

## 3. Výroba

```
node nastroje/vyrob_sablony.js --sod-real-v5 <složka s v4 CZ/EN/DE/FR> [výstupní složka]
```

Kotvy nezávislé na jazyce: nadpis „Čl./Art. II –“ (první neprázdný odstavec za ním = popis předmětu, bez
symbolů) a odstavec se `{{SOD_CENA_NABIDKY}}`. Každá kotva právě jedna, jinak chyba — nic se nehádá.
Tvrdé kontroly nástroje (kód 1 při nálezu): přibyly právě `SACHTY_SOD_PREDMET` a `SACHTY_SOD_ROZPIS`, nic
neubylo, jazyky mají stejnou sadu symbolů jako CZ, `docxXmlVady` čisté, odhad jazyka sedí a **document.xml bez
dvou nových odstavců = v4 bajt po bajtu**.

## 4. Ověření

| Soubor | testzip | `sablonaObsahVadyZipu` | XML | jazyk | symboly | mimo nové odstavce = v4 |
|---|---|---|---|---|---|---|
| v5 CZ | OK | prázdné | bez vad | cz 100 % | proti v4 **+2 −0** | ano |
| v5 EN | OK | prázdné | bez vad | en 99 % | proti CZ v5 +0 −0 | ano |
| v5 DE | OK | prázdné | bez vad | de 96 % | proti CZ v5 +0 −0 | ano |
| v5 FR | OK | prázdné | bez vad | fr 100 % | proti CZ v5 +0 −0 | ano |

`src/test_sod_v5.js` (s `KNG_PODKLADY`): jedna šachta — Word z v5 = Word z v4 ve všech odstavcích pro CZ/EN/DE/FR;
víc šachet — předmět i řádky rozpisu ve Wordu, žádný `{{`.

**Nalezeno při ověření (opraveno v dávce):** generátor (`docxSmyckaSachet`, VS-E4) mazal v každém dokumentu
odstavce se symbolem `SACHTY_*`, který nebyl ve smyčce CN — tedy i `{{SACHTY_SOD_*}}`. Se šablonou v5 by se
šachty do Wordu smlouvy nikdy nedostaly. Filtr je teď jen na symboly smyčky CN.

## 5. Starší šablona

- **v4 (a starší) + víc šachet:** smlouva vznikne s celkovou cenou díla, předmět a rozpis šachet nevyjmenuje.
  Aplikace **upozorní** (stav pod tlačítkem, hláška, kontrola `vsSablonaSod`): „Šablona smlouvy neumí
  vyjmenovat šachty — předmět díla a rozpis šachet doplňte ve Wordu, nebo ať administrátor nahraje šablonu SoD
  realizace v5.“ Tisk **projde** (B0.4).
- **v5 + kód bez C2:** u jedné šachty by zůstaly dva odstavce (`{{SACHTY_SOD_*}}` nebo s C3 tečky) ⇒ nenahrávat
  před sloučením C2/C3.

## 6. Postup nahrání (J. V.)

0. Web běží s kódem C2/C3 (test po sloučení dávky; main až s víc šachtami).
1. Administrátor → **Nastavení → Šablony → Šablona smlouvy o dílo — REALIZACE (OCK)** → „Nahrát novou českou
   verzi…“ → `Sablona_SOD_REALIZACE_v5.docx`. Kontrola: proti v4 **přibylo 2** (SACHTY_SOD_PREDMET,
   SACHTY_SOD_ROZPIS), **ubylo 0**, čeština, bez vad.
2. Krok jazykových verzí: nahrát `…_v5_EN/_DE/_FR.docx` z tohoto sezení (ne „vyrobit“ v aplikaci) → **Zveřejnit**.
3. Zkouška: zakázka s jednou šachtou → Word SoD jako dřív (žádné nové řádky); zakázka se dvěma šachtami
   (vypínač víc šachet ZAP) → v čl. II řádek se šachtami a kusy, v čl. V řádek na šachtu pod celkovou cenou.
