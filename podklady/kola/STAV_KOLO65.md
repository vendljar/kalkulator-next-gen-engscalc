# STAV kola 65 — test v25.11.6, cílená sada PD2 (tisk CN #771 V1/V2/V4, #800, KL PROJ), bez Pipedrive (25. 11. 2026)

- **Sezení:** TESTOVÁNÍ 4 (`kalkulator-testovani`, session_018mwHQHn8gkmk4ksTXk6caP), Playwright (Chromium headless) na testengscalc, účet testera (administrátor; v profilu bez telefonu).
- **Verze:** test **v25.11.6** (`/api/zdravi`; větev `test` 10b9bed).
- **Souhlas se zápisy na test:** J. V. přímo v tomto sezení (kolo 61): „souhlasím vždy a v jakémkoliv rozsahu; ve jméně cenové nabídky vždy uváděj slovo TEST“.
- **Srovnání:** dotisky starých nabídek proti výtiskům z kola 62 (v25.11.4, stejné šablony).
- **Bez cen a osobních údajů.**

## Zkušební data

| číslo | název | co |
|---|---|---|
| TEST - 2026 - OPR - CN - 9961 | TEST K61 – OCK dvě šachty | odeslaná v25.11.3 → dotisk CN CZ, EN |
| TEST - 2026 - OVP - CN - 9962 | TEST K61 – PROJ | odeslaná v25.11.3 → dotisk nabídky PROJ CZ |
| TEST - 2026 - OPR - CN - 9966 | TEST K65 – CN bez fotky, šachta bez opláštění | nová: Šachta A s opláštěním, Šachta B bez opláštění; CN Word CZ/EN/DE/FR + online; odeslaná |
| TEST - 2026 - OVP - CN - 9967 | TEST K65 – PROJ bez fotky | nová jen PROJ; nabídka Word + online; odeslaná; KL PROJ „Jiné odchylky…“ vyplněno po odeslání |

## Výsledky

| bod | výsledek | poznámka |
|---|---|---|
| V1 bez fotky bez „Pohled na objekt z ulice:“ — OCK | OK | Word CZ/EN/DE/FR i online tisk 9966: nadpis není. |
| V1 — PROJ | **NÁLEZ** | Word PROJ 9967 bez fotky dál tiskne „POHLED NA OBJEKT“ (textové pole rámečku fotky v šabloně PROJ v9, ne odstavec „Pohled na objekt z ulice:“) → K65-N2. Online náhled PROJ nadpis nemá. |
| V2 bez telefonu bez „Tel:“ | OK | CN OCK (4 jazyky) i nabídka PROJ: u Vypracoval jen jméno, funkce a e-mail; „Tel.:“ firmy v Kanceláři zůstává (je vyplněný). Online tisk totéž. |
| V4 konečná splátka | OK (text k posouzení) | CZ „…bude vystaven 3. konečný daňový doklad ve výši 10 % (bez DPH) z celkové ceny díla s vyúčtováním DPH v zákonné výši.“; EN „the 3rd final tax invoice will be issued in the amount of 10 % (excl. VAT) …“; DE „wird die 3. Schlussrechnung in Höhe von 10 % (zzgl. MwSt.) …“; FR „la 3e facture finale sera émise pour un montant de 10 % (hors TVA) …“. Číslování 1. / 2. / 3. v souladu, procento sedí s Firmou (50/40/10). Připomínky viz K65-I2. Online tisk CN má platební podmínky dál jako tabulku („Konečná faktura 10 % – po předání“), V4 se ho netýká. |
| #800 šachta bez opláštění | OK | Šachta B: v bloku Opláštění šachty jen „TYP OPLÁŠTĚNÍ: bez opláštění“ (EN „Without cladding“, DE „Ohne Verkleidung“, FR „Sans bardage“), Word i online. Zbytky mimo blok → K65-I1. Šachta A beze změny (plný blok). |
| dotisk starších odeslaných nabídek | PROJ OK / **OCK NÁLEZ** | 9962 (PROJ): `document.xml`, záhlaví i zápatí bajt po bajtu stejné jako v kole 62 (nadpis fotky i „Tel:“ ponechány). 9961 (OCK, víc šachet): V1/V2/V4 se nepropsaly, ale **změnilo se pořadí řádků příplatků** v CZ i EN → K65-N1. |
| KL PROJ „Jiné odchylky oproti smluvnímu standardu“ | OK | Nové pole v krycím listu PROJ, editovatelné před i po odeslání (9967): zápis po odeslání se uložil na server a je v tisku KL PROJ (Backoffice). |
| Nastavení → Firma „Způsob fakturace — projekce“ | OK | Pole v Nastavení → Firma není (symbol `{{FIRMA_FAKTURACE_PROJ}}` v seznamu symbolů zůstává — podle CHANGELOG s výchozí větou). |

Automatické sady ani mutace se nepouštěly (stupeň 2).

## Nálezy

| ID | vážnost | dopad na cenu | co |
|---|---|---|---|
| K65-N1 | střední | ne | Dotisk odeslané nabídky víc šachet (před PD2) mění pořadí řádků příplatků |
| K65-N2 | nízká | ne | Word PROJ bez fotky dál tiskne „POHLED NA OBJEKT“ (V1 jen u OCK) |
| K65-I1 | info | ne | Šachta bez opláštění: zbytky opláštění mimo blok (požární klasifikace, odvětrání zadní stěnou, lešení vně) |
| K65-I2 | info | ne | Připomínky k textu V4 a k překladům (pro J. V.) |

### K65-N1 — dotisk staré nabídky víc šachet mění pořadí příplatků (střední, cena ne)

Kroky: TEST - 2026 - OPR - CN - 9961 (odeslaná 25. 11. na v25.11.3, 2 šachty, příplatky ventilátor A, zábrany A+B, madla B, engineering B) → Vytvořit nabídku (Word) CZ a EN na v25.11.6.
Stalo se: jediný rozdíl `word/document.xml` proti dotisku z kola 62 je pořadí v „II. ROZŠÍŘENÍ CENOVÉ NABÍDKY – Příplatky“: dřív ventilátor, zábrany, madla, engineering;
teď ventilátor, madla, zábrany, engineering (částky beze změny). Pravděpodobně #778 (MD N1 „pořadí příplatků víc šachet podle ceníku“).
Mělo se stát: „Odeslané starší nabídky při dotisku beze změny“ — pořadí ze zámku / podle starého pravidla. Text odeslaného dokumentu se nemá měnit.

### K65-N2 — „POHLED NA OBJEKT“ ve Wordu PROJ bez fotky (nízká, cena ne)

Kroky: TEST - 2026 - OVP - CN - 9967 (jen PROJ, bez úvodní fotky) → Vytvořit nabídku PROJ (Word).
Stalo se: v dokumentu zůstává nadpis „POHLED NA OBJEKT“ — je to text v textovém poli šablony PROJ v9 (`w:txbxContent`, rámeček fotky), oprava V1 maže jen odstavec
„Pohled na objekt z ulice:“ (OCK). Online náhled PROJ nadpis netiskne. Rozhodnout: maže se i rámeček s nadpisem v PROJ, nebo je to v šabloně záměr.

### Informace

- **K65-I1:** Šachta B bez opláštění — mimo blok Opláštění šachty zůstává: „POŽÁRNÍ KLASIFIKACE KONSTRUKCE: materiály DP1, opláštění bez deklarované požární odolnosti“
  (DE „Verkleidung ohne deklarierten Feuerwiderstand“), „ODVĚTRÁNÍ ŠACHTY: … větrací mřížka v horní i dolní části zadní stěny“ a ve společné části
  „LEŠENÍ – VNĚ ŠACHTY: je součástí dodávky pro provedení kompletního opláštění šachty“ (u zakázky, kde jen jedna šachta je opláštěná, je to v pořádku; u zakázky jen se šachtou
  bez opláštění ne). Zbytek K61-N1, #800 řešil jen blok Opláštění.
- **K65-I2 (text V4 a překlady, k posouzení J. V.):**
  - CZ: „ve výši 10 % (bez DPH) … s vyúčtováním DPH v zákonné výši“ — spojení „bez DPH“ a „s vyúčtováním DPH“ v jedné větě je správně míněné (procento ze základu, doklad s DPH),
    ale čte se rozporně; lepší by bylo „ve výši 10 % z celkové ceny díla bez DPH; konečný daňový doklad obsahuje vyúčtování DPH v zákonné výši“.
  - FR: blok Opláštění má nadpis „HABILLAGE DE LA GAINE / TYPE D’HABILLAGE“, ale hodnota je „Sans bardage“ (jiný termín než u šachty A: „Plein“); jednotně „Sans habillage“.
  - DE: nadpis bloku je „SCHACHTAUSKLEIDUNG“ (vnitřní obklad), hodnoty a ostatní řádky mluví o „Verkleidung“ — sjednotit na „SCHACHTVERKLEIDUNG“ (platí pro obě šachty).
  - EN/DE/FR: popisek u Vypracoval je bez dvojtečky a EN malým písmenem („compiled by“), CZ „Vypracoval:“ (šablona).

## Úkoly a úklid

- Na testu přibyly odeslané zakázky 9966 a 9967 (9967 s textem „TEST K65 odchylka po odeslání“ v KL PROJ). Nastavení, šablony ani vypínače jsem neměnil.
- Čísla nálezů přidělí koordinace.
