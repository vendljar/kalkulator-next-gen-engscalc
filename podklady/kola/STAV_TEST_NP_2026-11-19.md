# STAV – zkouška NP (Kompletní náhled podkladů ve vzhledu Wordu, roadmapa #681) na testu, 19. 11. 2026

## Hlavička

- **Test:** v19.11.9 (`origin/test` 0925de8). Šablona na testu: `Sablona_NABIDKA_CN_v17.docx` (verze 7), EN a DE `…_v17_EN/DE` (verze 6).
- **Souhlas:** trvalý souhlas J. V. s testem, potvrzený v sezení. Zadání od koordinace.
- **Postup:**
  - Body 1–4 a 6 se dělaly jen čtením: zápisy blokované, úpravy zakázek jen v paměti, nic se neuložilo.
  - Náhled se otevřel funkcí `nabidkaNahled` (okno, po stránkování).
  - Word vznikl generátorem `dokumentVygeneruj('nabidka')` ze serverové šablony pro tutéž variantu. Varianta se přitom nezamyká.
  - Porovnání proběhlo slovo po slově: text stránek náhledu proti `document.xml` Wordu (`np_porovnej.py`).
  - Vzhled se porovnal na snímcích: náhled ze stránek okna, Word přes LibreOffice → PDF.
- **Bod 5** se dělal na TEST 9815 se zápisem `/api/zakazky`. Zábrana se zkoušela jen v paměti s blokovaným uložením.
- **Harness:** `podklady/kola/harness_testovani/np.js` (scénáře), `np_porovnej.py` (rozdíly), `np_word.js` (bod 5).
- **Snímky** (`podklady/kola/np_test_2026-11-19/`, náhled | Word střídavě po stranách): všechny číslice, e-maily a jména jsou začerněné (█).

## Scénáře

- **S1:** TEST 9603-K19T-C103. V paměti klon zamčené varianty (Varianta 3), sleva 3 % (schváleno automaticky) a vlastní řádek
  DALŠÍ UJEDNÁNÍ „Vlastní ujednání (TEST)“. Jazyk tisku CZ, EN, DE.
- **S3:** TEST 9949-K49, Varianta 2: 2 šachty, můstky ano.
- **S4:** TEST 9813, víc zákazníků, pohled zákazníka B.

## Výsledky

| bod | výsledek | poznámka |
|---|---|---|
| 1 pořadí a hodnoty (S1 CZ) | ⚠ | Text náhledu a Wordu je **shodný slovo po slově (1320 slov Wordu) kromě nálezů NP-N1 a NP-N2**: všechny hodnoty, pořadí sekcí, hlavička, technická část, DALŠÍ UJEDNÁNÍ, ceny. **Řádek slevy** je v obou: „Cena před slevou“, „Sleva − … (3 %)“, pak cena šachty, DPH, CELKEM. **II. ROZŠÍŘENÍ CENOVÉ NABÍDKY – Příplatky** jsou hned za cenou (4 příplatky ve stejném pořadí). Stran: náhled 6, Word (LibreOffice) 6. Členění stran na snímcích souhlasí (str. 1 hlavička a Popis záměru, str. 2–3 technická část, str. 3–4 cena a příplatky, str. 4–6 podmínky, IV.–VI., doložky, Vypracoval/Kancelář). |
| 2 pevný text šablony | ✅ | Věty Popisu záměru, poznámky k CN, „Dojde-li…“, poznámky k platbám, splatnost a platnost, věta pod VI., Vypracoval / Kancelář: v CZ **bez jediné odchylky** od Wordu z pravé CN v17. |
| 3 EN / DE | ⚠ | Pevný text i hodnoty v EUR se shodují s Wordem EN (1568 slov) a DE (1332 slov). Výjimky jsou nálezy NP-N1, NP-N2, NP-N3 a NP-N4. **#682 potvrzen:** Word EN má prázdný pruh „BRIDGES BETWEEN THE BUILDING AND THE STEEL STRUCTURE“, DE „BRÜCKEN ZWISCHEN GEBÄUDE UND STAHLKONSTRUKTION“. Je to šachta bez můstků (9603) a CZ Word pruh nemá. Náhled ho vynechá. |
| 4 víc šachet (S3) | ⚠ | Náhled má 2× „VARIANTA ŠACHTY:“ jako Word, technická část i řádky šachet a můstků v ceně se shodují. Výjimka: NP-N1 (u obou šachet) a NP-N2. Stran: náhled 7, Word (LibreOffice) 8. |
| 4 víc zákazníků (S4) | ✅ | Pohled zákazníka B: hlavička „TEST VZ F2 Zákazník B s.r.o.“ s jeho kontaktem, číslo s písmenem **…9813-B** v náhledu i ve Wordu (`NABIDKA_TEST-2026-OPR-CN-9813-B-…`). Text je shodný až na NP-N1 a NP-N2. |
| 5 tlačítko Word | ✅ | TEST 9815, varianta nezamčená. „Vytvořit nabídku (Word)“ v pruhu okna: okno napíše „Nabídka (Word) se vytváří v okně aplikace…“ a stáhne se `NABIDKA_TEST-2026-OPR-CN-9815-OCK-CZ.docx`. **Varianta 1 je zamčená**, uložení 200. **Zábrana** (v paměti šířka 0,3 m): tlačítko vypnuté, v `title` je důvod a v pruhu „Word teď vytvořit nejde: Kontrola před nabídkou … Rozměr šachty menší než 0,6 m …“. |
| 6 stránkování a vzhled | ✅ / ⚠ logo | Na **každé** stránce (S1 6, S3 7, S4 6 stran) je záhlaví (číslo, „Cenová nabídka“ / „PRICE QUOTATION“ / „PREISANGEBOT“ jako Word) a zápatí s patičkou firmy. Žádná stránka nepřetéká, všechny mají výšku A4. Písmo Calibri → Carlito. **Tisk z náhledu do PDF** dává stejný počet stran jako okno a bez pruhu (v PDF chybí „Vytvořit nabídku“, „Stran:“ i titul okna; „Cenová nabídka“ je v záhlaví 6×). **Logo:** Firma na testu logo nemá, takže náhled píše „ENGINEERS CZ s.r.o.“ textem. Word má logo ze šablony (viz NP-I1). Logo vložené do Firmy jen v paměti (8×8 PNG) se vykreslilo v záhlaví všech 6 stran. |

## Nálezy

- **NP-N1 (střední, dokument):** řádek **SVĚTLÍKY U ŠACHETNÍCH DVEŘÍ** (#375) je v náhledu, ale **ve Wordu z pravé CN v17 na testu chybí**.
  Platí v CZ/EN/DE a u obou šachet VS. Šablona nemá pole `{{TS_SVETLIKY_DVERI}}`. `nabidkaNahledSekce` řádek přidá
  (`nabidka.js` ř. 787), Word ho nemá kam dát. Náhled tak ukazuje údaj, který zákazník ve Wordu nedostane.
  Doporučení: rozhodnout, zda řádek patří do šablony CN v17 (pak doplnit šablonu), nebo ho náhled vynechá, dokud ho šablona nemá.
  Rozhoduje J. V.
- **NP-N2 (nízká, vzhled):** popisky technické části jsou v náhledu převedené na verzálky (CSS) i tam, kde je Word nemá:
  jednotky „[m]“ → „[M]“ a „[mm]“ → „[MM]“ (rozměry, prohlubeň, přejezd, zdvih…), vlastní řádek DALŠÍ UJEDNÁNÍ
  „Vlastní ujednání (TEST)“ → „VLASTNÍ UJEDNÁNÍ (TEST)“, DE „(inkl. Revisionsbericht)“ → „(INKL. REVISIONSBERICHT)“.
- **NP-N3 (nízká, EN/DE):** v hlavičce chybí dvojtečka. Word má „Site address / project:“ / „… Projekt:“, náhled „project“ / „Projekt“.
- **NP-N4 (nízká, EN/DE):** v bloku Kancelář je Word EN/DE ze šablony česky „IČ:“ a „Tel.:“. Náhled překládá: EN „Company ID (IČ):“
  a „Phone:“, DE „Identifikationsnummer (IČ):“. Náhled se tu od pravé CN v17 liší. Možná je správně náhled a šablona EN/DE
  je nepřeložená. Rozhoduje J. V.
- **#682 potvrzen** (viz bod 3).
- **NP-I1 (informace):** Word bere logo ze šablony, náhled z Nastavení → Firma. Firma na testu logo nemá, takže náhled ukazuje
  název textem a vzhledem se od Wordu liší. S logem ve Firmě je náhled v pořádku (zkoušeno v paměti).
- **NP-I2 (informace):** počty stran Wordu jsou z LibreOffice (Carlito), ne z MS Word: S1 CZ 6/6, EN 6/6, DE 6/7, VS 7/8,
  VZ 6/6 (náhled/Word). Stránkování je tedy jen orientační.

## Úklid

- TEST 9815: Varianta 1 je teď zamčená (vytištěná CN z náhledu). Ostatní zakázky beze změny, úpravy byly jen v paměti.
