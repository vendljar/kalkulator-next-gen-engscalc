# W1 — šablona Wordu nabídky PROJ v6 (texty nabídky PROJ z Nastavení → Firma)

Dávka W1, 19. 10. 2026 (noc, bez J. V.), větev `claude/w1-sablona-proj-v6` nad `claude/v8-367-firma` (v19.10.7).
Verze **v19.10.9**. Roadmapa #434 (předběžné id), navazuje na #367 fáze 2b (Q5).

## Co v5 obsahovala (ověřeno na souboru z Disku, složka „Sablony“)

`Sablona_NABIDKA_PROJ_v5.docx` (14. 10. 2026, + `_EN/_DE/_FR`) = v4 + blok autorského dozoru ve značkách
(`{{BLOK_AD_ZAC/KON}}`, `{{PROJ_CENA_AD_BLOK}}`, `{{PLATBY_AD_ZAC/KON}}`, `{{PROJ_PLATBY_AD_NADPIS}}`).
Pod cenami stály **pevně**:

| Blok | Stavba ve v5 |
|---|---|
| CENA NEZAHRNUJE | tabulka o 1 sloupci: nadpis + 3 řádky odrážek |
| POŽADOVÁNO OD INVESTORA | tabulka o 1 sloupci: nadpis + 3 řádky |
| TERMÍNY | tabulka o 2 sloupcích: nadpis + 10 řádků činnost \| termín, pod ní 2 poznámky („*) Termíny pro vyjádření…“, „Termíny zpracování…“) |
| DOLOŽKY | ve v5 nebyly |

## Co dělá v6

`node nastroje/vyrob_sablony.js --proj-v6 <složka s v5> [výstupní složka]` → `Sablona_NABIDKA_PROJ_v6.docx` + `_EN/_DE/_FR`.

- CENA NEZAHRNUJE / POŽADOVÁNO OD INVESTORA: nadpisový řádek zůstává, pevné řádky nahradí jeden řádek (vzhled
  prvního) se symbolem `{{PROJ_CENA_NEZAHRNUJE}}` / `{{PROJ_POZADOVANO_OD_INVESTORA}}`.
- TERMÍNY: jeden dvousloupcový řádek `{{PROJ_TERMINY_CINNOST}}` | `{{PROJ_TERMINY_TERMIN}}` (nové symboly).
- Každá tabulka mezi značkami `{{BLOK_CENA_NEZAHRNUJE_ZAC/KON}}`, `{{BLOK_POZADOVANO_ZAC/KON}}`,
  `{{BLOK_TERMINY_ZAC/KON}}` (poznámky pod termíny uvnitř bloku termínů).
- Nový blok `{{BLOK_DOLOZKY_ZAC}}` … tabulka „DOLOŽKY:“ (vzhled CENA NEZAHRNUJE) s `{{PROJ_DOLOZKY}}` …
  `{{BLOK_DOLOZKY_KON}}` hned za termíny. Doložky PROJ jsou výchozí vypnuté → blok zmizí i s nadpisem.
- Aplikace řádek se symbolem zopakuje za každou odrážku (u termínů za každou nabízenou činnost —
  činnost vlevo, termín vpravo). Jazykové verze přeložily nadpisy (THE PRICE DOES NOT INCLUDE, CLAUSES, …),
  hodnoty dosazuje aplikace v jazyce tisku.

Výsledek běhu: CZ/EN/DE/FR XML bez vad, 82 symbolů v každém jazyce, symboly shodné s češtinou,
přeloženo 198 z 209 odstavců (zbytek jsou symboly / čísla, „česky zůstalo“ prázdné).

## Rozdíl Wordu v6 proti v5 (výchozí Firma)

- Mimo tři bloky je text dokumentu **shodný** (test nad skutečnou v5).
- V blocích se tiskne výchozí znění Firmy = to, co už dnes ukazuje online nabídka. Proti pevnému textu v5 se
  liší 5 řádků (jen znění, smysl stejný):
  1. „Součástí ceny není řešení samostatných řízení vyplývají**cích** … památkové péče**,** a řešení …“ (v5 bez čárky, „vyplývající“, s tečkou),
  2. termín zaměření v jednom řádku („…plné moci; zpracování VÝSTUPŮ do 4–6 týdnů od zaměření“),
  3. termín stanovisek v jednom řádku (v5 zalomený),
  4. termín IČ bez dovětku „(reálné termíny jsou závislé na vytížení státní správy)“,
  5. činnost „Ekonomická zadávací část (EZC)“ bez „– zpracování položkového rozpočtu a výkazu výměr“.
  Další drobnosti (velká písmena „Studie Proveditelnosti“, „4-6“ × „4–6“, „*)“ u činností IČ) test bere
  jako shodu. Kdo chce znění v5, upraví texty v Nastavení → Smlouvy / Šablony → PROJ → Texty nabídky PROJ.
- **Termíny jen nabízených činností** (v5 tiskla všech 10 řádků, i u nenabízené studie nebo DPS) — jako online nabídka.

## Výchozí volby (J. V. se v noci neptal)

1. Řádek tabulky za odrážku (vzhled v5) místo jednoho řádku se zalomením — rozšířen `DOCX_RADKY_ZA_RADEK`
   v `src/docxgen.js`, termíny jako dvojice symbolů. `{{PROJ_TERMINY}}` („činnost – termín“) zůstává pro šablonu s jedním místem.
2. Poznámky pod termíny patří do bloku termínů (zmizí jen s ním) a tisknou se pevně jako ve v5 — poznámka „*)“
   se netiskne podmíněně podle IČ (online nabídka ji podmiňuje; případně další krok).
3. DOLOŽKY stojí za termíny, před REKAPITULACÍ (pořadí online nabídky), nadpis „DOLOŽKY:“.
4. Kontrola „texty Firmy PROJ upravené, ale nahraná šablona PROJ je starší než v6“ (obdoba `autorskyDozorWordProj`)
   **nepřidána** — symboly šablony PROJ se stahují jen za určitých podmínek, rozšíření by sahalo do UI kontrol. Návrh na později.

## Kde jsou soubory a co má J. V. udělat

- Hotové `.docx` jsou v sezení v `podklady/sablony_vystup/` (v gitu nejsou — `.gitignore`), poslané J. V. jako
  soubory sezení. **Na Disk se nahrát nepodařilo:** konektor Google Drive přijímá obsah jen jako base64 v jednom
  volání (~1,4 MB na šablonu), to sezení nepřenese. Cílová složka: Disk → … → Kalkulator NextGen → **Sablony**
  (vedle `Sablona_NABIDKA_PROJ_v5*.docx`).
- Kdyby se soubory sezení ztratily, vyrobí je znovu příkaz (repo na větvi `claude/w1-sablona-proj-v6` nebo
  po sloučení, Node 18+):

  ```
  node nastroje/vyrob_sablony.js --proj-v6 "<složka se Sablona_NABIDKA_PROJ_v5.docx>" "<výstupní složka>"
  ```

  Výpis musí končit „Bez problémů.“ (4× ✓). Ověření se skutečnou v5:
  `cd src && KNG_PODKLADY="<složka s v5>" node test_sablona_proj_v6.js` → „35 prošlo, 0 selhalo“.

### Nahrání v aplikaci (Nastavení → Šablony) — až bude v produkci verze s v19.10.9

Šablonu v6 nahrávat **až po nasazení aplikace v19.10.9** (starší aplikace symboly `PROJ_TERMINY_CINNOST/_TERMIN`
nezná a nechala by je ve Wordu viset, řádky odrážek by nerozvinula).

1. Nastavení → Šablony → „Šablona cenové nabídky PROJ (OVP-CN)“ → **Nahrát novou českou verzi…** →
   `Sablona_NABIDKA_PROJ_v6.docx`. Průvodce ukáže rozdíl symbolů proti v5: přibude 13 symbolů (69 → 82)
   (`PROJ_CENA_NEZAHRNUJE`, `PROJ_POZADOVANO_OD_INVESTORA`, `PROJ_TERMINY_CINNOST`, `PROJ_TERMINY_TERMIN`,
   `PROJ_DOLOZKY` a 8 značek `BLOK_CENA_NEZAHRNUJE`, `BLOK_POZADOVANO`, `BLOK_TERMINY`, `BLOK_DOLOZKY` _ZAC/_KON), neubude žádný.
2. V kroku jazykových verzí nahrát `…_v6_EN.docx`, `…_v6_DE.docx`, `…_v6_FR.docx` (nebo je nechat vyrobit
   překladem v aplikaci — výsledek je týž překlad).
3. Zveřejnit najednou.
4. Kontrola: zakázka s PROJ → Vytvořit nabídku PROJ (Word) — pod cenami CENA NEZAHRNUJE / POŽADOVÁNO /
   TERMÍNY s odrážkami po řádcích, termíny jen nabízených činností, DOLOŽKY žádné (dokud se v Nastavení
   nezapne „Tisknout doložky v nabídce PROJ“). Totéž v EN.
