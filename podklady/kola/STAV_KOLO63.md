# STAV kola 63 — test v25.11.5, cílená sada PP (#780, #781, #791–#793) a nálezy kola 61 (#801–#804), bez Pipedrive (25. 11. 2026)

- **Sezení:** TESTOVÁNÍ 4 (`kalkulator-testovani`, session_018mwHQHn8gkmk4ksTXk6caP), Playwright (Chromium headless) na testengscalc;
  dva účty současně: tester (administrátor) a zkušební obchodník (role Obchodník).
- **Verze:** test **v25.11.5** (`/api/zdravi`; větev `test` f9b31b8).
- **Souhlas se zápisy na test:** J. V. přímo v tomto sezení (kolo 61): „souhlasím vždy a v jakémkoliv rozsahu; ve jméně cenové nabídky vždy uváděj slovo TEST“.
- **Word → PDF** pro kontrolu stran: LibreOffice (`soffice --convert-to pdf`) — rozložení se od Wordu může lišit o řádky; PDF objednávky z náhledu: tisk do PDF v Chromiu (A4).
- **Bez cen a osobních údajů.**

## Zkušební data

| číslo / ID | název | co |
|---|---|---|
| TEST - 2026 - OVP - CN - 9964 | TEST K63 – PROJ objednávka (testování 4) | jen PROJ; varianty 1–5 odeslané (tisk nabídky PROJ), varianty 2–5 s přidanými položkami v DPZ (+4 až +22 řádků) na prodloužení objednávky |
| TEST - 2026 - OPR - CN - 9965 | TEST K63 – kombinovaná OCK + PROJ (testování 4) | neodeslaná, uložila se sama |
| P-0009 | připomínka obchodníka „TEST K63 … neřešit“ | 2 značky, uzavřena správcem |

## Výsledky

| bod | výsledek | poznámka |
|---|---|---|
| 1a #781 značky (obchodník) | OK | „✏️ Zakroužkovat problém na snímku“ → editor: Rámeček, Kroužek (tažením), počítadlo „1 vyznačené místo / 2 vyznačená místa“, ↶ Zpět, Ctrl+Z, 🗑 Smazat vše, ✓ Hotovo; Esc = zrušit (nakreslená 3. značka zahozena, zůstaly 2). Po Hotovo tlačítko „Upravit vyznačení — 2 vyznačená místa“. Odesláno jako P-0009. |
| 1b #780 zvětšení (správce) | OK | Detail P-0009: snímek se 2 značkami (SVG rámeček + elipsa). Klik → zvětšení přes celé okno se značkami; start „Přizpůsobit“ (81 %), +/−, 1:1 = 100 %, kolečko 100 → 115 → 100 %, tažení posune obraz, strop 800 % (tlačítko + se zakáže), Přizpůsobit, Esc zavře zvětšení a Nastavení zůstane otevřené. |
| 1c obchodník značky nevidí | OK | Moje připomínky: karta P-0009 bez obrázku i SVG. API `?moje=1` bez snímku a značek; `?snimek=P-0009` → 403 „Snímek obrazovky vidí jen správce.“; `?spravce=1` obchodníkovi vrátí jen jeho vlastních 7 připomínek (bez snímku, autora, kontextu). Správce dostane plná pole. Odpovídá návrhu (snímek a značky jen pro správce). |
| 2a #792 karta krycího listu PROJ | OK | Jedna karta „Objednávka, smlouva o dílo a plná moc (PROJ)“, tlačítka v pořadí: Náhled a tisk objednávky (PDF) → Vytvořit objednávku (Word) → Vytvořit plnou moc (Word) → Vytvořit smlouvu o dílo PROJ (Word). Stará samostatná karta není. |
| 2b #791 podpis objednatele na konci | OK | Základ (2 strany, PDF i Word): Poznámka → Platební kalendář → Termíny → Vystavil → Datum / Podpis objednatele. |
| 2c podpis nikdy sám (hodně textu) | OK / **drobnost** | Varianty s +4 … +22 řádky: PDF var. 4 a 5 i Word var. 5 přetečou na 3. stranu a s podpisem jde celý blok (Poznámka, kalendář, termíny, Vystavil); podpis nikdy sám. Ve var. 4 (PDF) ale zůstal na konci str. 2 sám nadpis „Poznámka“ a jeho text je na str. 3 → K63-N1. |
| 3 #793 „Co by se zapsalo do Pipedrive“ | OK | Obchodník (vlastní nová zakázka i odeslaná 9961): v krycím listu OCK ani PROJ karta není a u Prodeje není náhled „Ukázat, co by se zapsalo (deal → fáze …)“; tlačítko Prodáno zůstává. Správce: obě karty i náhled u Prodeje vidí. |
| 4a #801 uložení bez čísla | OK / info | Kalkulace OCK i PROJ: po „Uložit zakázku“ zůstane stránka a hláška „Vyplňte v hlavičce: Číslo nabídky (CN), Název akce …“ je vidět. Pod ní je ale i původní „Zakázka ještě není v databázi. Vyplňte v hlavičce …“ — dvě skoro stejné věty (K63-I1). |
| 4b #802 kontrola podle strany | OK / **neověřitelné v UI** | Jen PROJ (9964): krycí list PROJ hlásí jen SoD PROJ. OCK s vynulovanou PROJ (9961): krycí list OCK hlásí jen SoD realizace. „Kombinovanou“ zakázku (obě strany) v UI nevytvořím: číslo OPR → „Kalkulace PROJ je uzamčená a vynulovaná“, číslo OVP → jen PROJ; větev „hlásí obě“ kryje jen `src/test_pp_k61.js` (K63-I2). |
| 4c #803 skloňování | OK | 0 položek, 1 položka, 2 položky, 4 položky, 5 položek. |
| 4d #804 datum v krycím listu | OK | Tisk KL OCK (9961): „Dne 25. 11. 2026“, „Datum podpisu smlouvy 25. 11. 2026“; KL PROJ (9964): „Dne 25. 11. 2026“. |

Automatické sady ani mutace se nepouštěly (stupeň 2, zkouška v rozhraní).

## Nálezy

| ID | vážnost | dopad na cenu | co |
|---|---|---|---|
| K63-N1 | nízká | ne | Objednávka PROJ (PDF z náhledu): nadpis „Poznámka“ sám na konci strany, text až na další |
| K63-I1 | info | ne | #801: dvě skoro stejné hlášky „Vyplňte v hlavičce …“ pod sebou |
| K63-I2 | info | ne | #802: „kombinovaná“ zakázka (SoD realizace i PROJ) v UI nevznikne — jen jednotkový test |

### K63-N1 — osiřelý nadpis „Poznámka“ v objednávce PROJ (nízká, cena ne)

Kroky: TEST - 2026 - OVP - CN - 9964, Varianta 4 (18 vlastních položek v DPZ, nabídka PROJ vytištěná) → Krycí list PROJ → Náhled a tisk objednávky (PDF) → tisk do PDF (A4).
Stalo se: strana 2 končí souhrnem (DPH, Celkem) a samotným nadpisem „Poznámka“; věta poznámky, kalendář, termíny, Vystavil a podpis jsou na straně 3.
Podpis tedy sám není (#791 splněno), jen nadpis poznámky se odtrhl od svého textu. Mělo by se stát: nadpis „Poznámka“ držet s textem (`break-after: avoid`
jako u ostatních nadpisů posledního bloku). Word téže varianty v LibreOffice přetekl jinde (2 strany), ve Wordu jsem neověřil.

### Informace

- **K63-I1:** Po „Uložit zakázku“ bez čísla a názvu jsou na Kalkulaci OCK i PROJ dvě hlášky pod sebou: „Zakázka ještě není v databázi. Vyplňte v hlavičce: Číslo nabídky (CN),
  Název akce – pak zakázku uložte (dál už se ukládá sama).“ a „Vyplňte v hlavičce: Číslo nabídky (CN), Název akce – pak zakázku uložte. Než ji vyplníte, uložte si práci do souboru …“. Funkčně OK.
- **K63-I2:** #802 „kombinovaná hlásí obě“ v rozhraní ověřit nejde: s číslem OPR je kalkulace PROJ uzamčená a vynulovaná (tisk PROJ se odmítne), s číslem OVP jde o zakázku jen PROJ.
  Kontrola nevyplněných míst SoD se navíc objeví až u zakázky, kde už smlouva byla vytištěna (nová 9965 bez tisku SoD nehlásí nic).

## Úkoly a úklid

- Na testu přibyly 9964 (5 odeslaných variant) a 9965 (neodeslaná); P-0009 uzavřena. Nastavení, šablony ani vypínače jsem neměnil.
- Čísla nálezů přidělí koordinace.
