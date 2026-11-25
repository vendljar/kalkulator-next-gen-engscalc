# STAV kola 61 — test v25.11.3, regrese bez Pipedrive po ER, ZK, MD (25. 11. 2026)

- **Sezení:** TESTOVÁNÍ 4 (`kalkulator-testovani`, session_018mwHQHn8gkmk4ksTXk6caP), Playwright (Chromium headless) přímo na testengscalc, účet testera (administrátor).
- **Verze:** test **v25.11.3** (`/api/zdravi`, prostředí test; větev `test` 5c42ca1); main v24.11.7 (jen čtení zdraví).
- **Souhlas se zápisy na test:** J. V. přímo v tomto sezení („se zápisy na testu souhlasím vždy a v jakémkoliv rozsahu; ve jméně cenové nabídky vždy uváděj slovo TEST“).
- **Rozsah:** body 1–4 zadání koordinace; Pipedrive ani dealy NE (dělá TESTOVÁNÍ 3); zakázek 9877, 9878 ani cizích jsem se nedotkl.
- **Bez cen:** v textu jen čísla položek, množství a shody / rozdíly.

## Zkušební zakázky (zůstávají na testu)

| číslo | název akce | co | stav |
|---|---|---|---|
| TEST - 2026 - OPR - CN - 9961 | TEST K61 – OCK dvě šachty (testování 4) | nová kalkulace (kalkVerze 2), Šachta A (ATYP automat) + Šachta B bez opláštění, příplatky po šachtách | odeslaná (zamčená tiskem CN) |
| TEST - 2026 - OVP - CN - 9962 | TEST K61 – PROJ (testování 4) | jen projekce, nabídka PROJ, SoD PROJ, plná moc | odeslaná (zamčená tiskem CN) |
| připomínka P-0008 | „TEST K61 … neřešit“ | odeslána s místem a snímkem, správce odpověděl a uzavřel | Hotovo |

Zákazníci jsou smyšlení (TEST Zkušební stavby / projekty s.r.o.), bez IČO a kontaktů. Do databáze zákazníků se nic neuložilo.

## Výsledky

| bod | výsledek | poznámka |
|---|---|---|
| 1a víc šachet v nové kalkulaci | OK | Nová zakázka = kalkVerze 2, Model 2; „Počet variant šachet“ 2 založí šachtu 2 s kalkVerze 2 a vlastní mapou ručních značek. |
| 1b #767 příplatky po šachtách | OK | A: ventilátor + zábrany dveří; B: madla boky + zábrany dveří + engineering. Word CN: 4 řádky — ventilátor = jen A, madla = jen B, zábrany = A + B (součet obou šachet sedí na Kč), engineering 1× z šachty B (první, která ho má v Nabídce). Krycí list BO: „Příplatky v nabídce 4 – … (Šachta A, Šachta B …)“ se stejným výběrem. |
| 1c #766 ruční ATYP po šachtách | OK | Ruční rezerva základu v š. 1 (značka jen v mapě varianty) → automat ATYP v š. 2 dosadil předlohu z ceníku; opačně ruční rezerva příplatků v š. 2 → automat v š. 1 dosadil předlohu, ruční pole š. 1 nechal (#758 B), š. 2 beze změny. Ověřeno s hodnotou odlišnou od předlohy. |
| 1d #775 šachta bez opláštění | OK (cena) / **NÁLEZ** (text) | Š. B (všechny stěny „bez“, světlík nad dveřmi „bez“): PRÁCE OPLÁŠTĚNÍ, PLASTOVÉ KOTVY, TMELENÍ, CESTOVNÍ NÁKLADY, ČIŠTĚNÍ množství 0, Opláštění celkem 0; řádek Statické posouzení opláštění chybí (#761). Specifikace v nabídce ale dál popisuje opláštění → **K61-N1**. |
| 1e #757 Engineering jako příplatek | OK | V nové zakázce mimo nabídku (Nabídka ☐), v Režii není; u šachty se 2 ks v náhledu nabídky 1× (ne × 2). |
| 1f #774 Engineering v ceníku | OK | Ceník nákladů OCK → sekce PŘÍPLATKOVÉ POLOŽKY, poslední řádek (C.engineeringKc). |
| 2a CN Word OCK | OK | Součet šachet A + B = cena celkem bez DPH na Kč, DPH 12 % sedí; rozpis šachet s počtem kusů; specifikace pro každou šachtu zvlášť. |
| 2b CN Word PROJ (jen projekce) | OK | Součet položek (bez „variantní řešení / 1 varianta“) = rekapitulace na Kč. Překlep v textu šablony → K61-I4. |
| 2c krycí list OCK / PROJ, pole „Dne“ #769 | OK | Dne = 25. 11. (Praha). Živě ověřeno i v prohlížeči s pásmem UTC+14 (tam už 26. 11.): pole Dne, `kryciDnesIso()` i datum zakázky = 25. 11. |
| 2d SoD OCK | OK | Cena díla = CN, rozpis šachet A/B shodný, předmět „2 varianty šachet, celkem 2 ks“; příplatky se nepropisují (nic objednáno). |
| 2e SoD PROJ + plná moc | OK | Cena díla = nabídka PROJ, součet 8 plateb = cena díla na Kč; plná moc s adresou stavby, zmocnitel tečky (záměr). |
| 2f porovnání s předchozím stavem | částečně | Porovnáno proti očekávání z CHANGELOG (MD, ER) a proti kalkulaci, ne proti dokumentu z main (main #767 nemá; zápis na main zakázán). |
| 3a Nastavení → Databáze, barvy záloh #770 | OK / info | Záloha databáze a noční záloha zelené „V pořádku (před 13 h)“; kopie na Disk oranžová „Chyba — zkontrolujte“ → K61-I1. |
| 3b Připomínky | OK | Typ, text, „📍 Ukázat místo na obrazovce“ → klik do stránky → čip místa; odeslání P-0008; správce: seznam, detail (obrazovka, zakázka s odkazem, označené místo, verze, prohlížeč, snímek s vyznačeným rámečkem), odpověď a uzavření; autor vidí stav Hotovo a odpověď. Drobnosti → K61-I2. |
| 4 volný průzkum | NÁLEZY | K61-N2, K61-N3, K61-N4, K61-I3. |

Automatické sady ani mutace se v tomto kole nepouštěly (kolo je zkouška v testovacím rozhraní, stupeň 2).

## Nálezy

| ID | vážnost | dopad na cenu | co |
|---|---|---|---|
| K61-N1 | střední | ne | Specifikace šachty bez opláštění odporuje „bez opláštění“ |
| K61-N2 | střední | ne | Uložit zakázku bez čísla / názvu: přepne na Přehled, důvod není vidět |
| K61-N3 | nízká | ne | Kontrola před odesláním míchá SoD OCK a PROJ (i u zakázky jen PROJ) |
| K61-N4 | nízká | ne | „4 položek“ v kartě Cenová nabídka |
| K61-I1 | info | ne | Kopie záloh na Disk: „Chyba“ kvůli stavu prohlížeče; noční kopie za 25. 11. chybí |
| K61-I2 | info | ne | Připomínka: místo popsané hodnotou (částkou), „varianta Varianta 1“ |
| K61-I3 | info | ne | Krycí list: „Dne“ a „Datum podpisu smlouvy“ v tisku jako 2026-11-25 |
| K61-I4 | info | ne | Šablona PROJ: překlep „STUDII PROVDITELNOSTI“ |

### K61-N1 — specifikace šachty bez opláštění (střední, cena ne)

Kroky: TEST - 2026 - OPR - CN - 9961, Šachta B: Opláštění „po stěnách“, stěny A–D „bez opláštění“, Světlík nad dveřmi „bez“ → Vytvořit nabídku (Word).
Stalo se: ve specifikaci Šachty B je správně MATERIÁL „bez opláštění (stěny A, B, C, D)“ a ROZSAH „stěna A: bez opláštění; …“, ale zůstávají řádky
TYP OPLÁŠTĚNÍ „plnostěnné“, VNĚJŠÍ OPLÁŠTĚNÍ ŠACHTY „kotvené na vnější stranu ocelové konstrukce“, ZPŮSOB KOTVENÍ OPLÁŠTĚNÍ „na kotevní terče“,
VZHLED KOTVENÍ ZASKLENÍ „obdélníkový terč …“, NAPOJENÍ ŠACHETNÍCH DVEŘÍ „dokrytí lakovaným plechem“ (a OPLÁŠTĚNÍ ČELA POD NÁSTUPIŠTĚM „plech v celé ploše podesty“);
ODVĚTRÁNÍ „větrací mřížka … zadní stěny“ (stěna neexistuje). Nabídka tedy zákazníkovi tvrdí opláštění, které se nedodává (cena ho už nemá — #775).
Mělo se stát: u šachty bez opláštění řádky o typu, kotvení a vzhledu opláštění vynechat nebo napsat „není součástí dodávky“ — znění rozhodne J. V. (text dokumentu).
Pozn.: v evidenci jsem shodnou položku nenašel (#675 řeší jen název „bez opláštění“, #775 jen cenu).

### K61-N2 — uložení bez čísla nabídky / názvu akce (střední, cena ne)

Kroky: Nová zakázka (prázdné číslo a název) → Kalkulace OCK → 💾 Uložit zakázku.
Stalo se: aplikace přepne na Přehled cenových nabídek a nic neřekne; zakázka uložená není. Hláška „Vyplňte v hlavičce: Číslo nabídky (CN), Název akce – …“
se vykreslí jen do stránek Kalkulace OCK / PROJ, které jsou po přepnutí skryté (`zakUlozUI` → `prepniTab('zakazka')`, `src/ui/zakulozeni_ui.js:261–266`;
hláška v `zakulozeni_ui.js:200–201`). Totéž je na main (od #727, 23. 11.).
Mělo se stát: hláška vidět tam, kde uživatel skončí (Přehled), nebo zůstat v Kalkulaci s hláškou.

### K61-N3 — kontrola před odesláním míchá OCK a PROJ (nízká, cena ne)

Tisk krycího listu PROJ u zakázky „jen projekce“ (9962) ukazuje nahoře „Ve smlouvě zůstalo 28 míst … termín montáže, opláštění … Doplňte je v krycím listu OCK“
(SoD realizace, která u zakázky jen PROJ nevznikne) a k tomu hlášení SoD PROJ. Obráceně krycí list OCK (9961) ukazuje i chybějící údaje SoD PROJ, přestože
kalkulace PROJ je u ní „uzamčená a vynulovaná“. Mělo by se hlásit jen to, co se u zakázky skutečně tiskne.

### K61-N4 — „4 položek“ (nízká, cena ne)

Kalkulace OCK → Cenová nabídka (CN) → živý náhled: „Příplatky do nabídky 4 položek (výběr …)“. Skloňování podle počtu (1 položka, 2–4 položky, 5+ položek);
`src/ui/zakazka_ui.js:573`.

### Informace

- **K61-I1:** Nastavení → Databáze: řádek „Poslední kopie záloh na Disku Google (prostředí test)“ je oranžový se štítkem „Chyba — zkontrolujte“, kopie je stará asi 29 h
  (méně než mez 36 h). Pod ním je vysvětlení, že v tomto prohlížeči není vybraná složka — to je stav prohlížeče, ne chyba zálohy; štítek „Chyba“ přehání.
  Zároveň na Disku není noční kopie za 25. 11. (poslední 24. 11.) — souvisí s otevřenou položkou „Apps Script kopie na Disk na testu“ (PREDAVKA). Barvy jinak podle #770.
- **K61-I2:** Připomínka — označené místo se popisuje textem kliknutého prvku: klik na cenu dal „Kalkulace PROJ › ‹částka v Kč›“ (do připomínky jde částka, ne název pole
  „Základní cena bez DPH“). V panelu i detailu správce „varianta Varianta 1“ (zdvojené slovo).
- **K61-I3:** Tisk krycího listu OCK i PROJ: „Datum podpisu smlouvy“ a „Dne“ ve tvaru 2026-11-25, nabídka a SoD píšou 25.11.2026.
- **K61-I4:** Nabídka PROJ (šablona, text J. V.): „díky obsahu a zpracování je možné naší STUDII PROVDITELNOSTI projednat …“ — překlep „PROVDITELNOSTI“ (klíč i ve slovníku `src/preklad.js:1242`).

## Úkoly a úklid

- Na testu zůstávají zakázky 9961 a 9962 (odeslané) a uzavřená připomínka P-0008. Vypínače ani nastavení jsem neměnil (Nastavení jen čteno).
- K rozhodnutí J. V.: znění specifikace u šachty bez opláštění (K61-N1); překlep v šabloně PROJ (K61-I4).
- Čísla nálezů do evidence přidělí koordinace.
