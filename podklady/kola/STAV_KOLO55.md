# STAV kola 55 — TESTOVÁNÍ 3: v25.11.1 na testu (PO, PV, ZK, ER, RP, DT) — 25. 11. 2026

Stav: **HOTOVO** — všechny body OK, nová vada nenalezena (přetrvává K53-N3).

## Hlavička

- Test: v25.11.1 (`/api/zdravi`, `origin/test` 7144623). Main: v24.11.7 (jen čtení).
- Kdo: testovací sezení (prostředí `kalkulator-testovani`), větev `claude/testovani-3-po`.
- **Souhlas J. V. přímo v sezení 25. 11. 2026:** PO a PV na deal 432 (nová TEST/webhooková zakázka, zápis do dealu 432),
  ZK nejdřív náhled, pak naostro (druhý souhlas po náhledu), vlastní TEST zakázky pro RP/ER/DT.
- Pipedrive jen deal 432. Harnessy Playwright v kontejneru sezení (`scratchpad/h3/`), do repa se nedávají.

## Výsledky

### PD #733 — kalkulace z Pipedrive (předpoklad PO)

| bod | výsledek | poznámka |
|---|---|---|
| webhook | OK | „Vygenerovat nabídku“ = Ano na dealu 432 → nová CN-432 za ~10 s: vazba `webhook`, `pdCerstva`, `kalkVerze 2`, autor = vlastník dealu |
| #733 | OK | po prvním otevření marže OCK i PROJ z ceníku (> 0), 17 nenulových příplatků, kladná marže ve výsledku |
| rozměry | info | kalkulace z webhooku nemá rozměry šachty → tisk zastaví kontrola „Nesmyslný rozměr nebo počet“ (správně); rozměry doplněny ze zkušební zakázky |

### PO #116 — odeslání nabídky do dealu (CN-432 → deal 432)

| bod | výsledek | poznámka |
|---|---|---|
| PO1 | OK | první tisk CN (Word): zámek uložen, karta „Odeslání do Pipedrive“ sama ukázala tabulku Dnes / Nově (`/api/pd/odeslani nahled` 200) |
| PO2 | OK | před potvrzením se nic nezapsalo |
| PO3 | OK | „Potvrdit a zapsat“ → `zapis` 200; karta „Odeslání zapsáno do Pipedrive: …“ (pole KL, CN, Příplatky v nabídce, hodnota dealu, fáze) |
| PO4 | OK | Word přiložen k dealu (`soubor` 200, `CN_CN-432_2026-11-25.docx`); deal má 1 soubor |
| PO5 | OK | protokol zakázky: „Zápis odeslání nabídky CN-432 do dealu 432: zapsáno — …“ |
| PO6 | OK | dotisk: Word vznikl, do Pipedrive se nic nezapsalo (žádný `zapis` ani `soubor`) |
| A9b | OK | soubor nad 4 MB → 413 „Soubor nabídky je větší než 4 MB — přiložte ho k dealu ručně.“ |
| Pipedrive | OK | fáze 22 → 23 (Nabídka odeslána), hodnota = cena odesílané varianty bez DPH, CN, Příplatky v nabídce (Velký text), právě jedna poznámka „Nabídka odeslána: CN-432 ze dne 25. 11. 2026 …“ (varianta, Vypracoval, odkaz na kalkulaci, bez e-mailů), stav dealu `open` beze změny |

### PV #597 — zápis prodeje (CN-432 → deal 432)

| bod | výsledek | poznámka |
|---|---|---|
| PV1 | OK | Prodáno uloženo, náhled zápisu prodeje (`/api/pd/prodej nahled` 200): posílá se jen fáze 23 → 26 (ostatní už sedí) |
| PV2 | OK | před potvrzením nic nezapsáno |
| PV3 | OK | zápis 200, lišta „Prodej zapsán do Pipedrive: Fáze dealu.“, protokol „Zápis prodeje do dealu 432 … zapsáno — Fáze dealu“; Pipedrive: fáze 26 „Vyhrané k podpisu SoD“, stav `open` (Vyhrané až po SoD), soubor ani poznámka navíc nepřibyly |
| info | ZNÁMÉ | „Nabídku vypracoval“ dál „nelze převést“ (K53-N3: text „jméno, e-mail“ se porovnává celý s e-mailem uživatele) — v PO i PV se toto pole nezapíše |

### ZK #755 — zákazníci ze zakázek (ARES)

| bod | výsledek | poznámka |
|---|---|---|
| náhled | OK | 503 zakázek, 469 bez IČO, 1 neplatné IČO, 33 IČO do ARES: 15 „založit“ (název i sídlo sedí), 18 „nesedí — ARES subjekt nevede“ (všech 18 = smyšlená zkušební IČO 99…) |
| zápis | OK | po souhlasu J. V.: 15 karet založeno, protokol „dokončen“ (0 přepsáno, 0 změněno mezitím); karty mají sídlo (15/15) a DIČ (13/15), autor = správce |
| druhý běh | OK | nový náhled: 0 založit, 15 existuje, 18 nesedí; náhled zrušen |

### ER #757/#758/#761 — nová kalkulace

| bod | výsledek | poznámka |
|---|---|---|
| ER1 | OK | Nová zakázka má `kalkVerze 2` |
| ER2 | OK | ENGINEERING je příplatek (1 řádek), ve výchozím stavu ve „vynechaných“ (mimo nabídku), v Režii není |
| ER3 | OK | bez přepínačů Engineering, Výstup ze zaměření a Statika opláštění (ověřeno v DOM); řádek výstupu ze zaměření v Režii je |
| ER4 | OK | rezerva příplatků 10 %: položka nese `rezervaSMarzi` a cena = zaokrouhlení (náklad × (1+m) × 1,1) na tisíce |
| ER5 | OK | engineering zařazený do nabídky u šachty 2 ks = množství 1 (jednou za variantu); uložení 200 |
| ER6 | OK | stará kalkulace (TEST OPR 9855 z 23. 11.): bez příznaku, přepínače Engineering / Výstup / Statika zůstaly, engineering není příplatek |

### RP #736/#740 — ruční položky ve Wordu (šablona CN v18)

| bod | výsledek | poznámka |
|---|---|---|
| RP1 | OK | Word CZ: ruční položky (Volitelné, Režie) ve specifikaci VELKÝMI s „množství jednotka“ a dodatkovým textem |
| RP2 | OK | Word CZ: ruční položka v cenovém bloku, CENA CELKEM |
| RP3 | OK | Word EN (dotisk): přeložený název i dodatek, žádný český zbytek |
| RP4 | OK | jednotka kpl → „set“ v EN |

### DT #745 — datum nabídky

| bod | výsledek | poznámka |
|---|---|---|
| DT1 | OK | neodeslaná zakázka založená 23. 11. (TEST OPR 9856): první tisk 25. 11. → „Datum: 25.11.2026“ |
| DT2 | OK | nový zámek nese `datumNabidky` 2026-11-25 |
| DT3 | OK | nabídka odeslaná 23. 11. (TEST OPR 9854, zámek před DT): dotisk drží „Datum: 23.11.2026“ |

## Nálezy

Nové žádné. Přetrvává **K53-N3** (střední, cena ne): „Nabídku vypracoval“ se do Pipedrive nepřevede — týká se teď i PO
a PV (pole zůstane prázdné, v náhledu „nelze“). Návrh beze změny: z textu nejdřív e-mail, pak jméno před čárkou.

Poznámka k harnessu: první pokus ER4 / DT1 / DT3 hlásil FAIL kvůli měření (zaokrouhlení na tisíce, formát data
„25.11.2026“ bez mezer); doměřeno, aplikace v pořádku.

## Úklid / co zůstává na testu

- **CN-432** (založená webhookem 25. 11. 10:09 UTC): rozměry ze zkušební zakázky, nabídka odeslána (zamčená) a **prodaná**.
  Deal 432: fáze 26 „Vyhrané k podpisu SoD“, hodnota z CN-432, CN, Příplatky, poznámka 1112 „Nabídka odeslána…“,
  soubor `CN_CN-432_2026-11-25.docx`, „Vygenerovat nabídku“ vrátila automatizace. Vrátit fázi / hodnotu jen na pokyn J. V.
- Nové TEST zakázky: OPR 9870 (ER), 9871 (RP, odeslaná CN). TEST OPR 9856 je teď odeslaná (DT).
- 15 karet zákazníků ze ZK (ostrá data firem na testu, ověřená ARES).
