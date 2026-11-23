# STAV kola 53 — TESTOVÁNÍ 3: Pipedrive deal 432, novinky v22.11.6–v22.11.10, data testu (23. 11. 2026)

Stav: **PROBÍHÁ** — test v23.11.1 (e96e03f) od 13:28 UTC (`/api/zdravi`), `PIPEDRIVE_ZAPIS = ano`. Body 1–3 hotové.

## Hlavička

- Test před nasazením: v22.11.5 (`origin/test` 05a496d). Cíl: integrace `claude/integrace-16-10` = 133a8f5 (v23.11.1, kód aplikace = v22.11.10).
- Main (jen čtení): v19.11.11.
- Kdo: testovací sezení (prostředí `kalkulator-testovani`), větev `claude/testovani-3-pipedrive`.
- **Souhlas J. V. se zápisem na test v plném rozsahu dán přímo v tomto sezení 23. 11. 2026** (zakázky TEST, vazba na deal 432,
  Nastavení → Šablony/Smlouvy, připomínky P-0001–P-0006, šablony CN v18 a PROJ v9). Pipedrive jen deal 432. Ostrý web jen čtení.
- Navazuje na TESTOVÁNÍ 2 (větev `claude/testovani`, STAV_KOLO49–52 a STAV_TEST_* tam).

## Výchozí stav (zjištěno čtením 23. 11. před nasazením)

| co | stav |
|---|---|
| Deal 432 | otevřený, „Vygenerovat nabídku“ prázdné, „Odkaz na kalkulaci“ prázdné, filtr automatizace = 432, číslo nabídky z názvu (CN-432), 1 poznámka |
| Organizace dealu | „[TEST] MoveEr“, sdílená 7 TEST dealy (3 otevřené, 4 uzavřené) |
| Kalkulace na testu | `CN-432` založená webhookem 23. 11. 08:56 UTC, vazba `stav: webhook`, protokol „Založeno z dealu 432 …“, 1 varianta |
| Příčina nezapsání odkazu 08:56 | `PIPEDRIVE_ZAPIS` se projeví až nasazením (krok 7 webhooku → `pdZavolej` PATCH odmítne, `odkazDoDealu: nezapsano` + varování) |
| Vypínače testu | víc šachet ZAP, víc zákazníků ZAP |
| Šablony test × main | test CN v17 / PROJ v8 (CZ/EN/DE/FR); main CN v18 / PROJ v9 |
| Firma → podmínky PROJ → termíny | test: vlastní text se starým řádkem `dpz` (VZD-N1); main: pole vymazané (výchozí), zveřejněno 23. 11. |
| Připomínky | P-0001 nova, P-0002 nova, P-0003 hotovo, P-0004 resi, P-0005 odlozeno, P-0006 nova |

## Scénáře (plán)

### 1 · Pipedrive, deal 432 (priorita)

| bod | postup | očekávání |
|---|---|---|
| 1a | J. V. přepne „Vygenerovat nabídku“ = Ano | webhook → `CN-432` beze změny / aktualizace, protokol, odkaz v dealu |
| 1b | Pipedrive: pole „Odkaz na kalkulaci“ v dealu 432 | `https://testengscalc.netlify.app/?zakazka=CN-432.json`, odkaz otevře `CN-432` |
| 1c | „Ve pořádku“: vazba z webhooku u kalkulace založené webhookem | `stav: webhook` dokládá zápis (bez potvrzení) |
| 1d | vazba „čeká“ | jen pokud jde bez rozbití vazby 432 (existující kalkulace bez vazby navázaná podle čísla) — jinak NEOVĚŘENO s důvodem |
| 1e | poznámka do dealu: šachty (víc šachet) a další zákazníci — `CN-432` | zapsáno, 1 poznámka na druh, opakované uložení = beze změny |
| 1f | druhá zakázka TEST s `pdDealId` 432 bez vlastní vazby | poznámka nezapsána, varování „nepatří této zakázce“ (RJ #704-7) |
| 1g | „Opravit firmu“ — jen náhled (organizace sdílená TEST dealy) | 409 / náhled rozdílů; zápis jen s výslovným souhlasem |
| 1h | 409 u nesouhlasného razítka (`/api/pd/vazba` se starým razítkem) | 409 „Zakázku mezitím někdo uložil …“ |
| 1i | varování při vypnutém zápisu | jen bez vypínání proměnné — jinak NEOVĚŘENO |
| 1j | druhá automatizace na stejném poli | na dealu 432 neběží (historie dealu) |

### 2 · Novinky v22.11.6–v22.11.10

JT (jazyk specifikace = Jazyk tisku, karta tisku pod cizojazyčným náhledem), RJ (B232 409 + dialog, pravidlo 3 zrušeno,
podpis autora při dotisku), LAK (částka z nabídky lakovny, bez zdroje zábrana, vlastní položky, × ks), NN (PR-T1 okno
Nastavení po odhlášení, B251 šablony, B243 zákazníci).

### 3 · Data testu

(a) termíny PROJ vymazat (výchozí) a zveřejnit, náhled Lhůt PROJ 8 řádků se dvěma hrubopisy DPZ; (b) P-0001–P-0006 uzavřít
jako zkušební; (c) šablony CN v18 a PROJ v9 z main (jen čtení) nahrát a zveřejnit na testu.

## Výsledky

### 1 · Pipedrive, deal 432

| bod | výsledek | poznámka |
|---|---|---|
| 1a | OK | J. V. přepnul „Vygenerovat nabídku“ = Ano ~13:31 UTC; webhook CN-432 našel podle vazby, akce beze změny (protokol bez nového záznamu — kód zapisuje do protokolu jen změnu), vazba `webhook` beze změny; automatizace pole „Vygenerovat nabídku“ vrátila na prázdné |
| 1b | OK | „Odkaz na kalkulaci“ v dealu 432 = `https://testengscalc.netlify.app/?zakazka=CN-432.json` (změna dealu 13:31:49 UTC); J. V. odkaz otevřel a kalkulaci uložil 13:31:57 (viz K53-I1) |
| 1c | OK | vazba kalkulace založené webhookem `stav: webhook` = v pořádku bez potvrzení; `potvrdit` vrací 409 „Vazba už je potvrzená.“ (RA #723 „V pořádku jen admin“ na testu ještě není — až v23.11.2) |
| 1d | NEOVĚŘENO | vazba „čeká“ jen u existující kalkulace bez vazby navázané podle čísla — na dealu 432 by to znamenalo rozbít platnou vazbu CN-432 (zrušení = deal v odmítnutých, další webhook 409) |
| 1e | OK | CN-432 (šachta 1 = 2 ks) → poznámka „Šachty v nabídce: 1 varianta šachty, celkem 2 ks (Šachta 1 2 ks) — nabídka CN-432“; opakované uložení = táž poznámka (stejné id); + další zákazník → poznámka „Další zákazníci na zakázce: • TEST K53 Zákazník B s.r.o. — nabídka zatím neodeslána (CN-432-B) — nabídka CN-432“; obě ověřeny v Pipedrive |
| 1f | OK | druhá zakázka `TEST - 2026 - OPR - CN - 9853` s `pdDealId` 432 a 2 ks: uloženo 200, poznámka do dealu nezapsána, varování „Deal v Pipedrive nepatří této zakázce (zakázka nemá vazbu … a pole „Odkaz na kalkulaci“ v dealu nemíří na tuto zakázku) — do dealu se nic nezapsalo“ |
| 1g | OK | „Opravit firmu“ náhled CN-432 → 409 „Organizace dealu v Pipedrive nemá IČ — opravu firmy nejde ověřit.“ (zápis nezkoušen — organizace sdílená TEST dealy) |
| 1h | OK | `/api/pd/vazba` se starým razítkem → 409 „Zakázku mezitím někdo uložil — otevřete ji znovu.“ (kontrola razítka před akcí) |
| 1i | NEOVĚŘENO | varování při vypnutém zápisu nejde bez vypnutí `PIPEDRIVE_ZAPIS` (pokrývá jednotkový test RJ) |
| 1j | ČEKÁ NA J. V. | druhá automatizace („Deal - generate offer -> send data to Make“): v dealu 432 žádná nová poznámka od Make; historii běhů automatizací API nevidí — ověří J. V. v historii dealu |

### 2 · Novinky v22.11.6–v22.11.10 (Playwright, harness `k53_nov.js` / `k53_nov2.js` / `k53_podpis.js`)

| bod | výsledek | poznámka |
|---|---|---|
| JT1 | OK | hlavička specifikace EN → Jazyk tisku EN (a náhled EN) |
| JT2 | OK | Jazyk tisku nabídky OCK = DE → náhled specifikace DE |
| JT3 | OK | „dle Nastavení“ nic nepřepíná |
| JT4 | OK | pod EN náhledem karta „Cenová nabídka (OCK)“ se třemi tlačítky a úvodní fotkou (žlutý blok kontrol jen při upozornění — na zkušební zakázce žádné) |
| JT5 | OK | „Vytvořit nabídku (Word)“ z EN náhledu → `PRICE-QUOTATION_…-OCK-EN.docx`, anglicky; jazyk pak vrácen na CZ |
| LAK1–2 | OK | obchodník má u LAKOVÁNÍ „✎ cena z nabídky“; řádek s poznámkou (za šachtu, × ks, vlastní položky). Testovací obchodník má v matici právo `sloupce.naklad`, proto vidí výpočet z ceníku a odchylku (P12 podle matice — správně); jednotka dvakrát = K53-N1 |
| LAK3–5 | OK | bez zdroje: „chybí zdroj“, Potvrdit zakázané, zábrana tisku; řádek = částka; uložení 200; Word se nevytvoří s hláškou „Ruční cena položky nepotvrzená …“ |
| LAK6–7 | OK | se zdrojem „nepotvrzeno“ → Potvrdit → „✓ potvrzeno“, tisk volný |
| LAK8–9 | OK | 2 kusy šachty → řádek lakování 2 × částka; uložení 200 |
| RJ1–3 | OK | B232: nový zámek s rozporem (zastaralá stránka) → neuloženo, hláška „nesouhlasí … Ctrl+F5“, dialog právě jednou, na serveru nezamčeno |
| RJ pravidlo 3 | OK | shoda čísla nabídky vazbu nedokládá — viz 1f (druhá zakázka na dealu 432 = „nepatří“) |
| RJ podpis | NEOVĚŘENO | dotisk 9854 správcem má tytéž obrázky jako originál obchodníka, ale zámek nemá snímek zpracovatele — testovací účet obchodníka nemá jméno ani sken podpisu (profil se neměnil) |
| RJ PR N5 | NEOVĚŘENO | klíč koordinace v sezení není (pokrývá `test_pripominky`) |
| NN1 | OK | PR-T1: okno Nastavení po odhlášení prázdné a skryté |

### 3 · Data testu

| bod | výsledek | poznámka |
|---|---|---|
| 3a | OK | Firma → podmínky PROJ → termíny vymazány (výchozí), zveřejněno 13:36:42 UTC, ostatní údaje beze změny; náhled Lhůt PROJ 8 řádků, 2× hrubopis DPZ, bez upozornění na pevný text |
| 3b | OK | P-0001–P-0006 → zamítnuto s odpovědí „Zkušební záznam testovacího sezení (zkouška dávky PR 22. 11.), nejde o vadu.“ |
| 3c | OK | zveřejněno z main (jen čtení): nabidka v18 CZ/EN/DE/FR, nabidkaProj v9 CZ/EN/DE/FR; otisky = main (CN CZ f090ef47…, PROJ CZ 2abd9a08…), mutace se `zdrojOtisk` platné CZ |

## Nálezy

- **K53-I1** (informace, nízká, dopad na cenu: ne): první uložení kalkulace založené webhookem zapíše do protokolu
  „a dalších 106 změn“ (montazZakladHod, sazby, doprava, kurz, fixy… — doplnění ceníku do kalkulace bez ceníku).
  Protokol tím zahltí šum; návrh: první doplnění ceníku do webhookové kalkulace zapsat jedním řádkem.
- **K53-I2** (ZNÁMÉ, BEZ AKCE — roadmapa #652, J. V. 19. 11.: 6. řádek termínů se netiskne, záruka jde z krycího listu): Firma → texty termínů OCK (`kapTerminy` CZ/EN/DE/FR) — na main
  chybí řádek „5 let záruka na celé dílo.“ (a překlady), na testu je. Nesynchronizováno (text nabídky = J. V.).
- **K53-N1** (vada, nízká, dopad na cenu: ne, jen obrazovka): rozbalený řádek „Cena z nabídky lakovny“ ukazuje
  „Výpočet z ceníku: <částka> Kč Kč“ (`rcRadekPod`: `fmt()` jednotku už nese a `jed` = Kč). Uživatel s právem na náklady.

V roadmapě: #727 (K53-N1), #728 (K53-I1); K53-I2 = #652 — čísla předběžná, přečísluje koordinace. #726 bod (1) (data DPZ testu) splněn bodem 3a.

## Úklid

- CN-432: zkušební data VRÁCENA 13:45 UTC (zákazník „TEST K53 Zákazník B s.r.o.“ odebrán, šachta 1 = 1 ks — ks vrátil už J. V. 13:43). Poznámky v dealu 432 se samy aktualizovaly: id 1110 „Šachty v nabídce: 1 šachta — nabídka CN-432“, id 1111 „Další zákazníci na zakázce: žádní — nabídka CN-432“ (ověřeno v Pipedrive; aktualizace poznámek tím ověřena také). Poznámky v dealu zůstávají — smazat jen na pokyn J. V.
- `TEST - 2026 - OPR - CN - 9853` (druhá zakázka s `pdDealId` 432) zůstává.
- Zakázky bodu 2: `… 9854` (JT, obchodník, CN EN vytištěna → zamčená), `… 9855` (LAK, potvrzená částka, 2 ks), `… 9856` (RJ B232, nezamčená).
- Firma testu: termíny PROJ = výchozí (13:36:42 UTC); šablony CN v18 / PROJ v9 platné; připomínky P-0001–P-0006 zamítnuté.
- Harnessy kola (Playwright) v kontejneru sezení (`scratchpad/h/k53*.js`), do repa se nedávají.
