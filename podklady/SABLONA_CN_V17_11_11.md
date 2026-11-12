# Šablona cenové nabídky CN v17 — CZ + EN + DE + FR a oprava nadpisů usazení v16 DE/EN (11.–12. 11. 2026)

Dávka C1 (roadmapa #582), větev `claude/c1-cn-v17` nad integrací `aa445a1` (v11.11.1). Rozhodnutí J. V.
11. 11. 2026: B0.2 (CN v17 CZ + EN/DE/FR, zveřejnit v testu i v main naráz), B0.3 (DE nadpisy „USAZENÍ OCK“
jednotně „POSITIONIERUNG DER SCHACHTKONSTRUKTION – …“) a doplněk (EN jednotně „SHAFT STRUCTURE POSITION – …“),
obojí ve v16 i v17 a ve zdroji překladu. Výpočet ceny se nemění.

> **v17 = zveřejněná v16 téhož jazyka + dvě smyčky šachet, nic jiného** (u DE a EN po opravě nadpisů usazení).
> Nahrávat **všechny čtyři jazyky najednou** průvodcem, v testu i v main naráz.

## 1. Soubory

Předané J. V. v sezení (SendUserFile), v repozitáři ani na Disku nejsou (`podklady/sablony_vystup/`, gitignore).

| Soubor | Jazyk | Symbolů | Velikost (B) | Vznikl z (Disk, Kalkulator NextGen / Sablony) |
|---|---|---|---|---|
| `Sablona_NABIDKA_CN_v17.docx` | CZ | 127 | 443 059 | `Sablona_NABIDKA_CN_v16.docx` (1ihP134uu_i7aQWcwpWxzOX1k_2Uf9yLg) |
| `Sablona_NABIDKA_CN_v17_EN.docx` | EN | 127 | 445 657 | `…_v16_EN.docx` (13amvcaalA4fvOMQXflECl3barJYjfWZe) + oprava nadpisů |
| `Sablona_NABIDKA_CN_v17_DE.docx` | DE | 127 | 446 221 | `…_v16_DE.docx` (1-yswRVN6xipAQtkYmuZpzNUJU_CJwJI2) + oprava nadpisů |
| `Sablona_NABIDKA_CN_v17_FR.docx` | FR | 127 | 446 829 | `…_v16_FR.docx` (1f7zScl-qMhXtPENEcMUpbxfC1bUgYhWQ) |
| `v16_oprava/Sablona_NABIDKA_CN_v16_DE.docx` | DE | 122 | 433 711 | `…_v16_DE.docx`, jen nadpisy usazení |
| `v16_oprava/Sablona_NABIDKA_CN_v16_EN.docx` | EN | 122 | 433 149 | `…_v16_EN.docx`, jen nadpisy usazení |

- Zdrojové v16 na Disku mají datum úpravy **10. 11. 2026** (13:52 UTC, všechny čtyři) — J. V. potvrdí, že jsou
  totožné s tím, co 10. 11. zveřejnil v aplikaci.
- Výroba: `node nastroje/vyrob_sablony.js --cn-usazeni <podklady> <výstup>/v16_oprava` a
  `node nastroje/vyrob_sablony.js --cn-v17 <podklady> <výstup>`.

## 2. Co se proti v16 mění

**Smyčky šachet (všechny jazyky, beze změny proti kolu 47):** 5 nových symbolů `{{SACHTA_NAZEV}}`,
`{{SACHTA_POPIS}}`, `{{SACHTA_CENA_BEZ_DPH}}`, `{{SACHTA_TS_NAZEV}}`, `{{SACHTY_CELKEM_POPIS}}` a dvě smyčky
`{#sachty} … {/sachty}` (technická část od pruhu ZÁKLADNÍ PARAMETRY ŠACHTY po řádek MŮSTKY / sloupy navíc,
obchodní část řádek šachty před řádkem VÝTAHOVÁ ŠACHTA). Jedna šachta = dokument jako z v16.

**Nové: jazykové v17 vznikají přímo ze zveřejněné jazykové v16** (dřív strojovým překladem české v17). Ruční
znění v16 tak zůstane (strojový překlad by např. řádek „LIFT SHAFT“ / „AUFZUGSSCHACHT“ / „GAINE D'ASCENSEUR“
v ceně přepsal na „shaft“ / „Schacht“ / „gaine“, viz část 3). Strojový překlad zůstává jen jako záloha, když
jazyková v16 ve složce chybí (nástroj to hlasitě vypíše).

**Nadpisy usazení (DE a EN, v16 i v17; FR beze změny):**

| řádek | DE před | DE po | EN před | EN po |
|---|---|---|---|---|
| čelní | BEFESTIGUNG DES SCHACHTGERÜSTS - VORDERWAND | POSITIONIERUNG DER SCHACHTKONSTRUKTION – VORDERWAND | SHAFT STRUCTURE FIXING - FRONT WALL | SHAFT STRUCTURE POSITION – FRONT WALL |
| boční | BEFESTIGUNG DES SCHACHTGERÜSTS - SEITENWÄNDE | POSITIONIERUNG DER SCHACHTKONSTRUKTION – SEITENWÄNDE | SHAFT STRUCTURE FIXING - SIDE WALLS | SHAFT STRUCTURE POSITION – SIDE WALLS |
| levá | POSITIONIERUNG … – LINKE SEITENWAND | beze změny | SHAFT STRUCTURE POSITION – LEFT SIDE WALL | beze změny |
| pravá | POSITIONIERUNG … – RECHTE SEITENWAND | beze změny | SHAFT STRUCTURE POSITION – RIGHT SIDE WALL | beze změny |
| zadní | BEFESTIGUNG DES SCHACHTGERÜSTS - RÜCKWAND | POSITIONIERUNG DER SCHACHTKONSTRUKTION – RÜCKWAND | SHAFT STRUCTURE FIXING - REAR WALL | SHAFT STRUCTURE POSITION – REAR WALL |

Totéž ve zdroji překladu `src/preklad.js` (hesla `USAZENÍ OCK - ČELNÍ STĚNA`, `- BOČNÍ STĚNY`, `– ZADNÍ STĚNA`,
`USAZENÍ ZADNÍ STĚNY OCK`) — projeví se i v online německé/anglické nabídce a specifikaci. Ve slovníku už není
„BEFESTIGUNG DES SCHACHTGERÜSTS“ ani „SHAFT STRUCTURE FIXING“.

## 3. Texty, které zůstaly česky nebo se liší od v16

Jazykové v17 = v16 téhož jazyka (po opravě nadpisů) znak po znaku mimo řádky smyčky — nástroj to ověřuje
(`rozdíl textu proti v16: 0` u EN, DE i FR). **Nový nepřeložený text proto nevznikl.**

| jazyk | český text | kde v dokumentu | návrh |
|---|---|---|---|
| EN, DE, FR | „IČ:“ | zápatí, údaje firmy | ponechat (zkratka českého identifikátoru, stejné ve v16) |

Pro úplnost — co by dal strojový překlad české v17 (dosavadní cesta) proti zveřejněné v16:

| jazyk | v16 (zůstává) | strojový překlad | kde | návrh |
|---|---|---|---|---|
| EN | LIFT SHAFT | shaft | cenová tabulka, řádek VÝTAHOVÁ ŠACHTA (2×) | nic — v17 se už nepřekládá strojově |
| DE | AUFZUGSSCHACHT | Schacht | totéž | totéž |
| FR | GAINE D'ASCENSEUR | gaine | totéž | totéž |

Příčina: slovník normalizuje velikost písmen, heslo „výtahová šachta“ → „shaft / Schacht / gaine“ (malými,
jako slovo ve větě) pokryje i nadpis „VÝTAHOVÁ ŠACHTA“. Online náhled cizojazyčné nabídky z téhož hesla
tiskne v řádku ceny „SHAFT / SCHACHT / GAINE“ (`src/nabidka.js`, převod na velká písmena). Návrh k rozhodnutí J. V.: samostatné heslo pro nadpis nejde (stejný klíč) — buď změnit
heslo na „LIFT SHAFT / AUFZUGSSCHACHT / GAINE D'ASCENSEUR“ (pak bude velkými i ve větách), nebo nechat.
**Do `src/preklad.js` nepřidáno.**

## 4. Ověření (12. 11. 2026)

- Nástroj: `--cn-usazeni` DE 3 nahrazeny + 2 už správně, EN totéž; FR jen přečteno. Druhé spuštění nad
  opravenými soubory: 0 nahrazeno, všechny části zipu bajt po bajtu stejné. `--cn-v17`: 4× „✓“, 127 symbolů,
  bez vad XML, symboly jazyků = CZ, text v17_L bez smyčky = v16_L.
- **Jedna šachta, Word z v17 = Word z v16** (text dokumentu včetně záhlaví a zápatí) nad všemi 319 scénáři
  zlaté sady VS × CZ/EN/DE/FR: **1276 / 1276** shodných (DE a EN proti opravené v16).
- **Víc šachet** (5 scénářů Model 2 se šachtou B 2 ks × 4 jazyky = 20): obě šachty v technické i cenové části,
  součet řádků šachet = cena (před slevou), „šachet celkem: 3 ks“, žádný symbol ani značka smyčky; v EN/DE/FR
  česky jen data zkušební zakázky a zkušebního ceníku (název objednatele, materiály ceníku, ručně psaný termín) —
  20 / 20.
- Harnessy s podklady: `overit_vs_dokumenty` 20/0, `overit_vs_kryci_sod` 23/0, `overit_neprelozene` 22/0,
  `overit_k39_sablony_filtr` 9/0; `overit_sablona` 95/96 — jediná chyba (v12) je stejná i nad bází: šablona v12
  na Disku ve složce Sablony už není. `overit_sablony_online` a ostatní viz kolo v `PREDAVKA.md`.
- Testy: `src/test_preklad.js` (+25 kontrol C1), `src/test_cn_usazeni.js` 32/0, `src/test_vs_docx_v17.js` 47/0
  (+18 „F: v17 z jazykové v16“), zlaté sady 319/319 a #560 228/0 po přegenerování otisků (jen `nahled-en`,
  doloženo v commitu). Mutace [C1] 8/8 chycené.

## 5. Návod pro J. V.

1. **Kontrola slovníku před nahráním** (Nastavení → Slovník): zveřejňují se jen odchylky od slovníku
   zabudovaného v aplikaci, takže nové znění platí samo — **pokud** zveřejněná verze nenese vlastní přepis hesel
   `USAZENÍ OCK - ČELNÍ STĚNA`, `USAZENÍ OCK - BOČNÍ STĚNY`, `USAZENÍ OCK – ZADNÍ STĚNA` nebo
   `USAZENÍ ZADNÍ STĚNY OCK`. Když ho nese (staré „BEFESTIGUNG …“ / „SHAFT STRUCTURE FIXING …“), přepis smazat
   nebo přepsat a slovník znovu zveřejnit. Pozor při „Vybrat tabulku Vocabulary“: firemní tabulka může mít staré
   znění — tato čtyři hesla z ní nepřebírat (a v tabulce je opravit).
2. **Opravená v16 DE a EN** (`v16_oprava/`): nahrát jako novou verzi šablony v16 (DE, EN), dokud se tiskne z v16
   — v testu i v main.
3. **CN v17**: Nastavení → Šablony → průvodce, **všechny čtyři jazyky najednou**, v testu i v main naráz.
   Aplikace v17 pozná podle symbolů šachet; jedna šachta tiskne stejně jako v16.
4. Na Disk (Kalkulator NextGen / Sablony) nahrát ručně vedle v16; v16 nepřepisovat (opravené v16 DE/EN jako
   nové soubory, např. s datem).
5. **Víc šachet na ostrém zůstává vypnuté** (B0.1) — v17 v main tomu nevadí, smyčka se u jedné šachty neprojeví.

## 6. Otázky pro J. V.

1. Návrh k „VÝTAHOVÁ ŠACHTA“ v online cizojazyčné nabídce (část 3) — změnit heslo, nebo nechat?
2. FR nadpisy usazení jsou psané různě („Fixation de la structure de gaine - paroi avant“ u čelní, boční a
   v hesle `USAZENÍ ZADNÍ STĚNY OCK` × „FIXATION DE LA STRUCTURE DE GAINE – PAROI …“ velkými u levé, pravé
   a zadní). Sjednotit také (velkými, s „–“)? Zatím beze změny podle zadání.
