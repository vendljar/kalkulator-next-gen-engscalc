# STAV – zkouška OP1 / DS / DOS / SB na testu v22.11.5, 22. 11. 2026

## Hlavička

- **Test:** v22.11.5 (`origin/test` 05a496d). Dávky:
  - OP1 = v21.11.2 (PG-N1, #682, D3-N1, D3-N2);
  - DS = v21.11.3 (#648–#650);
  - DOS = v21.11.4 (DO-N1 #680, NPT-N1–N4 #690/#691);
  - SB = v21.11.1 (nástroj šablon CN v18 / PROJ v9).
- **Souhlas:** trvalý souhlas J. V. se zápisem na test. Zadání od koordinace.
- **Kdo:** testovací sezení Claude v Playwrightu, správce (A–D) a obchodník (D).
- **Harness:** `podklady/kola/harness_testovani/op1.js` (fáze `OP1_FAZE=a,b,c,d`). Používá `nahled`/`word` z `d3.js` a filtr zápisů z `d3_spolecne.js`.
  - Ceny se do logu nepíšou. Úpravy zakázek v B a C jen v paměti (klon zamčené varianty).
  - Word se generuje ze serverové šablony bez zamykání. Ve fázi A tlačítkem karty.
- **Zápisy na test:** jen fáze D, 2× `POST /api/zakazky 200` u TEST 9816 (návrh obchodníka a jeho odebrání). Fáze A–C nezapsaly nic (`zápisy []`).
- Pomocně puštěný starší `pg.js` (jen čtení) spadl v části A (tlačítka #684) na harnessu dřív, než došel k náhledu. Body PG-N1 proto pokrývá `op1.js` B.

## Výsledky

| bod | dávka / nález | výsledek | důkaz |
|---|---|---|---|
| A1–A2 objednávka PROJ 9821 (4 činnosti) | OP1 / **D3-N1** | ✅ OK | PDF z tisku náhledu má **2** strany (19. 11.: 3), Word → PDF (LibreOffice) **2** (dřív 2). Náhled a Word se shodují. |
| A1–A2 objednávka PROJ 9822 (7 činností) | OP1 / **D3-N1** | ✅ OK | PDF z tisku **2** (dřív 4), Word **2** (dřív 3). Hlavička tabulky: Č. · Označení · Popis dodávky, pod ním řádek čísel (Množ. · MJ · J. cena · C. cena · Celkem bez DPH · DPH % · Celkem s DPH). |
| A3 lišta „Kontrola před odesláním“ | OP1 / D3-N2 | ✅ OK | V okně náhledu objednávky 9821 i 9822 není žádné upozornění SoD OCK / SoD PROJ (prázdný seznam). |
| B1 náhled podkladů bez SVĚTLÍKŮ, CZ i EN | DOS / **NP-N1 #690** | ✅ OK | TEST 9603-K19T-C103 (klon V3): řádek SVĚTLÍKY U ŠACHETNÍCH DVEŘÍ je 0× v náhledu i ve Wordu (CN v17 v7, EN v17 v6). Řádek vynechán podle rozhodnutí J. V. 21. 11. (CHANGELOG v21.11.4). |
| B2 řádek NENÍ jednou, CZ i EN | OP1 / **PG-N1** | ✅ OK | Vlastní řádek přepnutý na NENÍ je v náhledu i ve Wordu 1×, před pruhem DALŠÍ UJEDNÁNÍ (19. 11. byl v náhledu 2×). |
| B4 jen řádek NENÍ | OP1 / **PG-N1** | ✅ OK | Náhled podkladů nemá pruh DALŠÍ UJEDNÁNÍ, stejně jako Word. Řádek je 1×. |
| B3 Word CN EN bez prázdného pruhu | OP1 / #682 | ✅ OK | Šachta bez můstků: ve Wordu EN není „BRIDGES BETWEEN THE BUILDING…“. |
| C1 název šachty ve Wordu CN CZ / EN / DE | DS / **#648 (K49-I6)** | ✅ OK | TEST 9949-K49 (2 šachty, klon). Šachta 1 má prázdný název, šachta 2 uložený výchozí tvar „Šachta 2“. CZ „Šachta 1/2“. EN „Shaft 1/2“ a DE „Schacht 1/2“, v obou 0× „Šachta N“. |
| C2 náhled podkladů EN | DS / #648 | ✅ OK | „Shaft 1/2“, 0× „Šachta“. |
| C3 FR | DS / #648 | ✅ OK | `vsNazevL`: Gaine 1/2. Word FR se nezkoušel. |
| C4 SoD EN / DE | DS / #648 | ✅ OK | `Sablona_SOD_REALIZACE_v6_EN/DE`: „Shaft 1/2“ / „Schacht 1/2“, 0× „Šachta“. |
| C5 ručně zadaný název | DS / #648 | ✅ OK | „Dvorní TEST“ zůstává i v EN, vedle něj „Shaft 1“. |
| D1 návrhy k položkám mimo číselník | DOS / **DO-N1 #680** | ✅ OK | Na začátku žádná zakázka návrh ke klíči neměla (sběr 2 položky, 1. běh D1 FAIL jen proto). Obchodník v TEST 9816 vyplnil text příplatku „PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)“, klikl „navrhnout do číselníku“ a uložil (200). Správce v Ceník → Dodatkové texty → „Najít texty v uložených zakázkách“ (3 položky) vidí oddíl **„Návrhy k položkám mimo číselník“** s řádkem klíče, textem návrhu, štítkem **návrh** a tlačítkem **převzít**. Převzetí se nezkoušelo, číselník se neměnil. |
| D3 po odebrání návrhu | DOS / DO-N1 | ✅ OK | Obchodník text a návrh odebral a uložil (200). Oddíl mimo číselník zmizel, sběr ukazuje znovu 2 položky. |
| SB šablony CN v18 / PROJ v9 | SB | — nezkoušeno | Dávka mění jen nástroj `vyrob_sablony.js`. Šablony v18/v9 se podle CHANGELOG nahrají na test až po odeslání do main. Na testu je dál CN v17 (verze 7, EN/DE verze 6). |

**Uzavírá se:** D3-N1 a D3-N2 (OP1), PG-N1 (OP1), #682 (OP1), NP-N1 / #690 (DOS), DO-N1 / #680 (DOS), #648 (DS).
SB na testu nemá co ověřit, dokud se nenahrají šablony v18.

## Nálezy

- Žádný nový nález.
- **OP1-I1 (informace, harness):** `pg.js` z 19. 11. na testu v22.11.5 hlásí v části A „Vytvořit nabídku (Word)“ zhasnuté u klonu varianty 9603 bez zábrany (A3/A7) a padá na kliknutí.
  - Nesouvisí s OP1, týká se tlačítek #684 a stavu dat zakázky 9603.
  - Neprověřováno. Doporučeno pustit cíleně v dalším kole tlačítek.

## Úklid

- Fáze A–C: nic uloženo (Word objednávky a CN jen stažen, okna náhledu zavřena).
- TEST 9816: `prechodovePlechy` = false a `priplatkyVynechat` = [] (jako po zkoušce DO). Text i návrh příplatku MATERIÁL odebrány a uloženy.
- Firma, ceník, šablony ani číselník dodatkových textů se neměnily.
- Výstupy (PDF, docx, texty) jsou jen v dočasné složce sezení. Do repa nejdou kvůli cenám.
