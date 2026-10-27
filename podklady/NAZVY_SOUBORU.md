# Názvy souborů, které kalkulátor vytváří (#533, v27.10.2)

Zadání J. V. 27. 10. 2026: „nastav konvenci pojmenování souborů při exportu z kalkuláku, aby respektovaly to, co
exportují, např. ceník dnes Cenik_2026-OPR-CN-.xls, přičemž ve skutečnosti obsahuje data OCK i PROJ a měl by tedy být
pojmenován např. CENIK_2026-OCK+PROJ_27.10.1.xlsx".

## Konvence

```
TYP_<KLÍČ>-<OBSAH>_<verze aplikace>.<přípona>
```

| úsek | pravidlo |
|---|---|
| **TYP** | velkými písmeny bez diakritiky; víceslovný typ spojuje pomlčka (`KRYCI-LIST`, `PLNA-MOC`) |
| **KLÍČ** | u souboru jedné zakázky **číslo zakázky / nabídky** (bez mezer: `2026-OPR-CN-555`, varianta `.2` zůstává); jinak **rok** (ceník varianty) nebo **datum RRRR-MM-DD** (snímek dat k danému dni — záloha, slovník, konfigurace, controlling) |
| **OBSAH** | co v souboru skutečně je: `OCK`, `PROJ`, `OCK+PROJ`, jazyk `CZ/EN/DE/FR`, verze listu (`BACKOFFICE`), zákazník, varianta…; části spojuje pomlčka, souběh `+` |
| **verze** | verze aplikace bez „v" (`27.10.2`) — jen u interních souborů |
| **přípona** | podle skutečného formátu |

Bez mezer a diakritiky, jen `A–Z a–z 0–9 . + -`; podtržítko jen mezi úseky.

**Odchylky od výchozího návrhu koordinace (a proč):**

- **Číslo zakázky místo roku** u souborů jedné zakázky — číslo už rok nese (`2026-OPR-CN-555`), rok navíc by se jen
  opakoval (`ZAKAZKA_2026-2026-OPR-…`).
- **Dokumenty pro zákazníka** (nabídka OCK/PROJ, smlouva o dílo, plná moc, technická specifikace) **verzi aplikace
  nenesou**: soubor jde zákazníkovi, číslo `27.10.2` by si spletl s revizí nabídky a číslo nabídky má stát hned za
  typem. Slovo nabídky zůstává v jazyce dokumentu (obchodník 3. 10. 2026): `NABIDKA` / `PRICE-QUOTATION` / `ANGEBOT` /
  `DEVIS` (v angličtině pomlčka místo podtržítka, které odděluje úseky). Jazyk se uvádí vždy, i `CZ`.
  Změna rozhodnutí = jeden řádek `verze: false` v `src/nazvy_souboru.js`.
- **Ceník varianty** má v klíči rok (přesně podle příkladu J. V.), ne číslo zakázky: soubor je ceník, ne zakázka.
- **Controlling (předkalkulace)** si nechává typ `PREDKALKULACE` (tak se soubor v controllingu jmenuje už od #447
  a říká, co obsahuje); mapování položek na účty je `CONTROLLING_…-MAPOVANI`.

**Formáty:** všechny `.xlsx` (ceník, controlling, slovník) vyrábí `src/xlsx.js` jako skutečný sešit Office Open XML
(ZIP se `xl/workbook.xml`), ne HTML/XML tabulku — přípona `.xlsx` sedí. Soubor ceníku měl `.xlsx` už dřív; ve
starém názvu ale stálo číslo zakázky (`CENIK_2026-OPR-CN-555.xlsx`, bez čísla `CENIK_ENG.xlsx`), ne obsah.
Word je `.docx`, PDF vzniká tiskem prohlížeče (navržené jméno = titulek okna).

## Starý → nový název

Příklady pro zakázku `2026 - OPR - CN - 555` (PROJ `2026 - OVP - CN - 77`), aplikaci v27.10.2 a den 27. 10. 2026.

| kde v aplikaci | obsah | starý název | nový název |
|---|---|---|---|
| Ceník → Export do Excelu | ceník aktivní varianty, listy OCK i PROJ | `CENIK_2026-OPR-CN-555.xlsx` (bez čísla `CENIK_ENG.xlsx`) | `CENIK_2026-OCK+PROJ_27.10.2.xlsx` |
| Nastavení → Databáze → Přenos ceníku | platný ceník OCK + PROJ (+ katalog, slevy, zahraniční řada), verze 12 | `cenik_platny_v12.json` | `CENIK_2026-10-27-PLATNY-V12-OCK+PROJ_27.10.2.json` |
| Uložit zakázku do souboru | celá zakázka, všechny varianty OCK i PROJ | `zakazka_2026_-_OPR_-_CN_-_555.json` (bez čísla `zakazka_nova.json`) | `ZAKAZKA_2026-OPR-CN-555_27.10.2.json` (bez práva na náklady `ZAKAZKA_2026-OPR-CN-555-BEZ-CENIKU_27.10.2.json`, bez čísla `ZAKAZKA_NOVA_…`) |
| Cenová nabídka (OCK) → Word / tisk PDF | nabídka OCK | `NABÍDKA_2026 - OPR - CN - 555[_zákazník][_varianta][_EN].docx` | `NABIDKA_2026-OPR-CN-555-OCK[-zakaznik][-varianta]-CZ.docx`; EN `PRICE-QUOTATION_…-EN`, DE `ANGEBOT_…-DE`, FR `DEVIS_…-FR` |
| Cenová nabídka (PROJ) → Word / tisk PDF | nabídka PROJ | `NABÍDKA_PROJ_2026 - OVP - CN - 77[_zákazník][_EN].docx` | `NABIDKA_2026-OVP-CN-77-PROJ[-zakaznik]-CZ.docx` (cizí jazyky jako u OCK) |
| Smlouva o dílo (OCK) | SoD realizace | `SOD_<číslo>[_zákazník][_EN].docx` | `SOD_2026-OPR-CN-555-OCK[-zakaznik]-CZ.docx` |
| Smlouva o dílo (PROJ) | SoD projekce | `SOD_PROJ_<číslo>[_zákazník][_EN].docx` | `SOD_2026-OVP-CN-77-PROJ[-zakaznik]-CZ.docx` |
| Plná moc (PROJ) | plná moc, vždy česky | `PLNA_MOC_2026-OVP-CN-77.docx` | `PLNA-MOC_2026-OVP-CN-77-PROJ-CZ.docx` |
| Krycí list OCK → Word / tisk PDF | verze Backoffice / Techdata | `KRYCI_LIST_Backoffice_2026-OPR-CN-555.docx` | `KRYCI-LIST_2026-OPR-CN-555-OCK-BACKOFFICE_27.10.2.docx` (`…-TECHDATA_…`, PDF `.pdf`) |
| Krycí list PROJ → Word / tisk PDF | verze Backoffice / Techdata | `KRYCI_LIST_PROJ_Techdata_2026-OVP-CN-77.docx` | `KRYCI-LIST_2026-OVP-CN-77-PROJ-TECHDATA_27.10.2.docx` |
| Technická specifikace → Tisk specifikace / PDF | specifikace OCK v jazyce náhledu | titulek aplikace (`Kalkulátor OCK + PROJ.pdf`) | `SPECIFIKACE_2026-OPR-CN-555-OCK-CZ.pdf` |
| Porovnání variant → Detail položek (PDF) | rozdíly položek mezi variantami | `Detail položek 2026 - OPR - CN - 555.pdf` | `DETAIL-POLOZEK_2026-OPR-CN-555-VARIANTY_27.10.2.pdf` |
| Porovnání variant (PDF) | porovnání variant | `Porovnání variant 2026 - OPR - CN - 555.pdf` | `POROVNANI-VARIANT_2026-OPR-CN-555_27.10.2.pdf` |
| Detail mezivýpočtů OCK (PDF) | detail výpočtu OCK | `Detail vypoctu 2026_-_OPR_-_CN_-_555.pdf` | `DETAIL-VYPOCTU_2026-OPR-CN-555-OCK_27.10.2.pdf` |
| Protokol o kalkulaci → Stáhnout jako text | protokol změn zakázky | `protokol_2026_-_OPR_-_CN_-_555.txt` | `PROTOKOL_2026-OPR-CN-555_27.10.2.txt` |
| Controlling → export předkalkulace zakázky | řídící varianta, strany OCK / PROJ | `PREDKALKULACE_2026_-_OPR_-_CN_-_555_2026-10-27.xlsx` (`.csv`) | `PREDKALKULACE_2026-OPR-CN-555-OCK+PROJ-2026-10-27_27.10.2.xlsx` (`.csv`) |
| Controlling → hromadný export za období | zakázky období, zúžení filtru | `PREDKALKULACE_2026-01-01_2026-03-31_OCK_CR_PD-WON.xlsx` | `PREDKALKULACE_2026-01-01-az-2026-03-31-OCK-CR-PD-WON_27.10.2.xlsx` |
| Controlling → celá databáze (#508) | všechny zamčené řídící varianty | `PREDKALKULACE_CELA-DB_2026-10-27_OCK.xlsx` | `PREDKALKULACE_2026-10-27-CELA-DB-OCK_27.10.2.xlsx` |
| Controlling → stáhnout mapování | číselník a mapování na účty | `CONTROLLING_MAPOVANI_2026-10-27.xlsx` | `CONTROLLING_2026-10-27-MAPOVANI_27.10.2.xlsx` |
| Nastavení → Databáze → Zálohovat (stáhnout) | celá online databáze | `zaloha_online_2026-10-27.json` | `ZALOHA_2026-10-27-ONLINE-DB_27.10.2.json` |
| Nastavení → Konfigurace → Export | vybrané sekce konfigurace | `konfigurace_v27.10.2.json` | `KONFIGURACE_2026-10-27-NASTAVENI+KATALOG_27.10.2.json` (všechny sekce `…-VSE_…`) |
| Nastavení → Slovník → Stáhnout do Excelu | slovník CZ + EN + DE + FR | `SLOVNIK_ENG_2026-10-27.xlsx` | `SLOVNIK_2026-10-27-CZ+EN+DE+FR_27.10.2.xlsx` |
| Nastavení → Slovník → jen v aplikaci (CSV) | hesla, která tabulka překladatelů nemá | `slovnik_jen_v_aplikaci.csv` | `SLOVNIK_2026-10-27-JEN-V-APLIKACI_27.10.2.csv` |
| Šablony → nepřeložené fráze (CSV) | fráze šablony bez překladu | `sablona_nabidka_nepreloz_en.csv` | `NEPRELOZENE_2026-10-27-SABLONA-NABIDKA-EN_27.10.2.csv` |
| Technická specifikace → nepřeložené (CSV) | fráze specifikace bez překladu | `neprelozene_en.csv` | `NEPRELOZENE_2026-10-27-SPECIFIKACE-EN_27.10.2.csv` |
| Nastavení → data specifikace → Export | číselníky a výchozí hodnoty specifikace | `techspec_data.json` | `SPECIFIKACE_2026-10-27-CISELNIKY_27.10.2.json` |
| Krycí list → Co by se zapsalo do Pipedrive → CSV | náhled zápisu do dealu (suchý běh) | — (nové v P3) | `PIPEDRIVE_2026-OPR-CN-555-NANECISTO_27.10.4.csv` |

## Výjimky — názvy se NEMĚNÍ

| soubor | proč |
|---|---|
| `otisk_RRRR-MM-DD.json` / `.json.gz` (kopie zálohy na Disk, složka `_Zaloha Netlify DB`) | hledá ji naplánovaná úloha, hlídka kopie na serveru (`zaloha_vynuceno.mjs`, `zalohovani.mjs`) i úklid Disku (`src/retence_zaloh.js`) — jiné jméno by úklid buď minul, nebo smazal cizí soubor |
| `posledni_kopie.json` (tamtéž) | značka poslední kopie, kterou čte hlídka |
| `_nastaveni.json`, `_program.json`, `_rejstrik.json` (archivní složka `_DB`) | složka se čte podle jména (nouzové stažení „Stáhnout _nastaveni.json" musí jít nakopírovat zpět) |
| šablony `.docx` a jejich jazykové mutace (`<název šablony>_EN.docx`) | nesou jméno nahraného souboru; rejstřík šablon ho ukazuje jako verzi (J. V. 25. 9. 2026: „nahrál CN v12 a tabulka hlásila v10") |
| přílohy poznámek | původní jméno souboru od uživatele |

## Import — staré i nové názvy

Žádné načítání jméno souboru nekontroluje — soubor se pozná podle obsahu: zakázka (`.json`), ceník z Excelu
(`.xlsx`), konfigurace, platný ceník (`typ` a `schema` v JSON), obnova zálohy (`.json` i `.gz`, gzip podle prvních
bajtů), mapování controllingu (`.xlsx`). Staré soubory (`zakazka_….json`, `CENIK_….xlsx`, `zaloha_online_….json`,
`cenik_platny_v….json`, `konfigurace_….json`) se tedy načtou stejně jako nové. Hlídá `src/test_nazvy_souboru.js`
(bod 4).

## Kde to žije

- `src/nazvy_souboru.js` — jediné místo, kde se rozhoduje o názvu (`NAZVY_DRUHY`, `nazevExportu(druh, údaje)`);
  v `CORE` build.py hned za `build_info.js`.
- `tiskSNazvem(nazev)` v `src/ui/common.js` — tisk hlavního okna (technická specifikace) s navrženým jménem PDF.
- Test `src/test_nazvy_souboru.js` (tabulka všech druhů, tvar názvů, výjimky, import, každé `a.download` v UI jde přes
  konvenci). Mutace filtr `#533` v `mutace_jadro.mjs`.
