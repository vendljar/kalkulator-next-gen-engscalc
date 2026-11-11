# Prompt pro řídící (koordinační) sezení — stav po testovacím kole 47, otázky a návrh dávek (11. 11. 2026)

Jsi koordinační sezení projektu Kalkulator Next Gen. Komunikuj česky. Na začátku přečti `CLAUDE.md` a `PREDAVKA.md` na `origin/test` (6c4bc80, v11.11.1). Ve složce `Testovani` na Disku (a v projektu) přečti:
- `STAV_KOLO41` až `STAV_KOLO47`,
- `PROMPT_K40_OPRAVY.md`,
- `PROMPT_KOORDINACE_ZEFEKTIVNENI_PROGRAMU.md`.

Úkoly:
1. Otázky v oddílu B projdi s J. V. a jeho odpovědi zapiš do PREDAVKA.
2. Podle odpovědí z návrhů v oddílu C vyrob prompty do paralelních větví `claude/…`.
3. Nic neslučuj bez pokynu J. V.

Pravidla projektu platí beze změny:
- úpravy jen promptem do paralelní větve,
- žádné ceny ani osobní údaje do repa,
- pojistka u každého nového testu,
- mutace po částech,
- `git push --no-verify` je zakázané.

## A. Stav k 11. 11. 2026 (kola 41–47, test × main)

| | main | test |
|---|---|---|
| verze | v6.11.5 (e2c2137) | v11.11.1 (6c4bc80) |
| ceník | v37 („2.11.2“) | v10 („2.11.1“) |
| šablona nabídky | CN v16 (zveřejněno 10. 11.) | CN v16 (zveřejněno 10. 11.) |
| SoD realizace / projekce | v4 / **v3** | v4 / v4 |
| víc šachet (#570) | kód není | **zapnuto** od 11. 11. 10:49 UTC |

- **Výpočet jedné šachty:** test = main ve všech kolech 44–47. Kolo 47: 284/284 kalkulací, fuzz 600/600, K29/K36 78/78. Zlatá zásada VS (jedna šachta = výstupy jako dřív) platí, Word CZ 100/100 stejný text.
- **Nasazení v6.11.5 do main (kolo 46):** nezměnilo žádnou cenu. Změnily se jen texty #572 a #569 a přibyly prázdné symboly CN v16.
- **Víc šachet (kolo 47, 40 zakázek, šablona v17 vyrobená nástrojem z v16):**
  - Výpočet bez chyby: zaokrouhlení jen na součtu, rozpis = celkem, N kusů = N kopií.
  - Model 1 tisk zastaví, CN v16 tisk správně zastaví.
  - Word v17 CZ i DE v pořádku, zámek a znovuotevření 40/40.
- **Sady a harnessy:** jednotkové sady 343/0/1. Harnessy 83/89; zbytek jsou podklady v cloudu a K40-T3.
- **Nová chyba ve výpočtu se v kolech 41–47 nenašla.**
- **Otevřené nálezy:** K40-N1 (čelní sklo, střední, prompt K40 čeká „po VS“), K44-I1, K46-I1, K47-I1–I3, K38-I2, K39-I1, K40-T1–T3, K43-T1.

## B0. Rozhodnutí J. V. z 11. 11. 2026 (odpovědi na B1–B10, zapiš do PREDAVKA)

1. **Víc šachet na ostrém:** zatím **ne**. Na main zůstává vypnuto, rozhodne se později po ruční zkoušce na testu.
2. **CN v17:** vyrobit, zkontrolovat, zveřejnit.
   - Sezení vyrobí v17 CZ + EN/DE/FR a vypíše nepřeložené texty k doplnění.
   - J. V. zkontroluje a zveřejní v testu i v main naráz.
3. **DE nadpisy „USAZENÍ OCK“:** sjednotit na **„POSITIONIERUNG DER SCHACHTKONSTRUKTION – …“** u všech stěn, v v16 i v17. Upravit i zdroj překladu, aby to `--cn-v17` nevrátil.
4. **SoD u víc šachet:** vyrobit **SoD realizace v5** se `{{SACHTY_SOD_PREDMET}}` a `{{SACHTY_SOD_ROZPIS}}`. Se starou šablonou aplikace u víc šachet jen **upozorní**, nezastaví.
5. **Nevyplněná pole SoD:** nahradit tečkami „……“. Kontrola před tiskem SoD chybějící údaje vyjmenuje, jen **upozornění**.
6. **SoD projekce:** zveřejnit v4 i v main (nahraje J. V.).
7. **Ceníky:** srovnat **test podle main**. Ceník a termíny firmy v testu zveřejnit podle main (v37), to provede J. V.
8. **Skladebné můstky:** sazby doplní J. V. v testu (Nastavení → Ceník). Potom samostatné testovací kolo zaměřené na můstky.
9. **TEST sada:** obnovit do testovací databáze nástrojem `test_sada_obnov.mjs` (C5). Spustí J. V.
10. **Pořadí:** K40 a CN v17 hned, souběžně. SoD v5 a tečky ve SoD potom. TEST sada kdykoli. Zefektivnění podle svého promptu.

**Drobnosti VS do další dávky:**
- upozornění `vsTvar` (víc než 10 variant, kusy mimo 1–20),
- Pipedrive poznámka se seznamem šachet (pole určí J. V.),
- potvrzeno: ATYP zakázky podle kterékoli šachty, Typ produktu podle šachty 1.

Velikost zámku u 10 šachet se teď neřeší.

## B. Otázky pro J. V. (zodpovězeno v B0)

1. **Víc šachet na ostrém:** zapnout až po zveřejnění CN v17 a SoD se šachtami (návrh C1, C2)? Nebo dřív s tím, že nabídku s víc šachtami nejde vytisknout?
2. **CN v17:** zveřejnit v obou prostředích naráz? Kdo zkontroluje EN/DE/FR texty? v17 cizích jazyků vzniká strojovým překladem z CZ (139 ze 147 textů).
3. **DE nadpisy „USAZENÍ OCK“ (K46-I1):** sjednotit na „POSITIONIERUNG DER SCHACHTKONSTRUKTION – …“ (usazení), nebo na „BEFESTIGUNG DES SCHACHTGERÜSTS – …“ (upevnění)? Dnes jsou v v16 smíšené: čelní, boční a zadní mají Befestigung, levá a pravá Positionierung.
4. **SoD u víc šachet (K47-I2):**
   - stačí, aby předmět díla doplnil obchodník ve Wordu (dnešní chování s v4),
   - nebo vyrobit SoD realizace v5 se `{{SACHTY_SOD_PREDMET}}` a `{{SACHTY_SOD_ROZPIS}}`,
   - a má aplikace tisk SoD víc šachet se šablonou bez těchto symbolů zastavit (obdoba `vsSablona`), nebo jen varovat?
5. **Nevyplněná pole ve SoD:** u zakázky bez údajů objednatele a termínů zůstanou v dokumentu viditelné značky `{{OBJEDNATEL_ICO}}`, `{{SOD_TERMIN_MONTAZ_OD}}` apod. (v testu 25 značek u každé TEST zakázky). Je to záměr (obchodník doplní ve Wordu), nebo se mají nahradit tečkami a kontrola před tiskem SoD je vyjmenovat?
6. **Main má zveřejněnou SoD projekce v3, test v4.** Zveřejnit v4 i v main?
7. **Ceníky test v10 × main v37 (K38-I2):** liší se marže, sklo VSG 4.4.2, čelní sklo a popis „Sklo VSG s mléčnou fólií“ (jen main); liší se i termíny firmy (CZ/EN/DE). Který ceník je správný? Mají se prostředí srovnat? Testovací kola pak budou srovnávat i nabídky na dnešním ceníku.
8. **Skladebné můstky (K44-I1):** kdy a s jakými sazbami se zveřejní ceník s novými klíči (`mustekRamBmKc`, podlahy, zábradlí, kotvení…)? Bez nich se sekce MŮSTKY ani řádek ceny můstků v CN v16/v17 neprojeví. Hodnoty dodá J. V., v kódu žádné nejsou.
9. **TEST sada zakázek (K39-I1):** od 2.–3. 11. nejsou TEST zakázky K28/K29/K36 v testu ani v main. Kola běží nad kopií z 2. 11. v cloudu. Obnovit sadu do testovací databáze (viz C5), nebo počítat dál jen nad kopií?
10. **Pořadí dávek:** platí „K40 po VS“? Návrh pořadí je v oddílu D.

## C. Návrh úprav (podle odpovědí z B rozepiš do promptů paralelních větví)

### C1. Šablona CN v17 ke zveřejnění (dokumenty, bez změny kódu výpočtu)

- Z `Sablona_NABIDKA_CN_v16*.docx` (Disk) vyrob v17 nástrojem `node nastroje/vyrob_sablony.js --cn-v17 <složka>`. V kole 47 vyrobeno bez problémů, 127 symbolů.
- Zkontroluj EN/DE/FR texty, které nástroj nepřeložil (8 ze 147), a nadpisy podle odpovědi B3. Pokud se nadpisy mění, uprav je i ve zdroji překladu (`preklad.js`), ať je příští `--cn-v17` nevrátí.
- Ověř:
  - `overit_vs_*` a `test_vs_docx_v17.js`,
  - jedna šachta v17 = v16 znak po znaku (kolo 47: 98/98 CZ),
  - víc šachet: všechny šachty v textu, Cena celkem, počet kusů.
- Zveřejnění v aplikaci (Nastavení → Šablony) provede J. V.

### C2. SoD se šachtami (podle B4)

- Nástroj `vyrob_sablony.js --sod-real-v5` z v4: řádek předmětu díla se `{{SACHTY_SOD_PREDMET}}` a rozpis `{{SACHTY_SOD_ROZPIS}}`. Bez víc šachet se řádky odstraní, takže jedna šachta = v4 znak po znaku. EN/DE/FR podle `sodJazykZabrana`.
- Volitelně kontrola `vsSablonaSod`: víc šachet + šablona SoD bez symbolů → upozornění nebo zábrana tisku SoD.
- Testy:
  - jedna šachta beze změny,
  - víc šachet: předmět vyjmenuje varianty a rozpis dává součet = cena díla,
  - EN/DE bez českých slov.
- Mutace.

### C3. Nevyplněná pole SoD (podle B5)

- `sod.js` / `docxgen.js`: nevyplněný symbol smlouvy nahradit tečkami „……“ (nikdy ne `{{…}}`).
- Kontrola před tiskem SoD vypíše chybějící údaje objednatele a termíny. Ať je to jen upozornění, ne zábrana — pokud J. V. neřekne jinak.
- Test, že vygenerovaná SoD neobsahuje `{{`. Mutace.

### C4. Opravy K40 — prompt `PROMPT_K40_OPRAVY.md` (v2)

- Prompt je připravený ze 4. 11., nad v4.11.4. Před vydáním ho aktualizuj na `origin/test` 6c4bc80 a ověř řádky souborů. Kód se mezitím posunul o MU #560, CA #575 a VS #570.
- Hlavní body:
  - K40-N1 čelní sklo (střední),
  - K40-S1/N3 mez data prodeje s razítkem `prijato`,
  - K40-W1 vazba webhooku,
  - K40-X1/X2 kvadratický ořez,
  - K40-T1/T3 harnessy šablon.
- **Nově přidej:**
  - **K43-T1:** `overit_lista_cekani.mjs` v souběhu s jinými běhy selže 31/1, samostatně 32/0. Stejná třída jako K40-T2: čekat na konkrétní stav, ne na libovolnou hlášku.
  - **VS u K40-N1:** migrace čelního skla musí platit i pro šachty 2+ (`ock.dalsi[i].zadani`). `skloMigraceAkt` dnes migruje `v.data`, ověř, že zasáhne i další šachty. Test s víc šachtami.

### C5. Obnova testovací sady zakázek (podle B9)

- Nástroj `nastroje/test_sada_obnov.mjs`. Ze souboru exportu (JSON zakázek s číslem `TEST - …`) založí zakázky v **testovacím** prostředí přes běžné `/api/zakazky` jako administrátor. Na ostrém webu odmítne běžet (stejná pojistka jako simulátor Pipedrive).
- Zakázky bez změny čísel a variant, zámky ponechá.
- Spustí J. V. lokálně s exportem, který dodá testovací sezení (TEST zakázky jsou smyšlené, ceny jen prodejní).

### C6. Drobnosti k rozhodnutí (z předávek VS, k potvrzení J. V.)

- **Pipedrive pole poznámky** se seznamem šachet: náhled ho ukazuje, zápis ho neposílá. Je potřeba určit pole.
- **ATYP a Typ produktu u smíšených zakázek:** ATYP podle kterékoli šachty, Typ produktu podle šachty 1.
- **Velikost zámku u 10 šachet:** ≈ 350 kB na variantu, strop zakázky 4 MB.
- **Klient nehlídá mez 10 variant a 1–20 ks v datech (K47-I3).** Server ano. Návrh: pravidlo kontroly `vsTvar` jako upozornění, aby to obchodník viděl dřív než chybu uložení.

## D. Návrh pořadí

1. **C1 (CN v17) a odpovědi B1–B4** jsou předpokladem zapnutí víc šachet na ostrém.
2. **C4 (K40)** běží paralelně, má jiné soubory. K40-N1 je jediný otevřený nález se střední vážností.
3. **C2 a C3 (SoD)** — po rozhodnutí B4/B5.
4. **C5 (TEST sada)** — kdykoli, nezávislé.
5. **Program Zefektivnění** podle `PROMPT_KOORDINACE_ZEFEKTIVNENI_PROGRAMU.md`, nekoliduje s C1–C3.
6. **Po každém sloučení do testu** jedno testovací kolo test × main (cenové nabídky + sonda víc šachet). Před nasazením do main také kolo main-před × main-po s ceníkem main, jako v kole 46.

Na konci koordinace vypiš:
- odpovědi J. V. na B1–B10,
- vydané prompty (větev, základ, rozsah),
- co zůstalo otevřené.
