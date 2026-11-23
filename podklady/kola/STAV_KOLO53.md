# STAV kola 53 — TESTOVÁNÍ 3: Pipedrive deal 432, novinky v22.11.6–v22.11.10, data testu (23. 11. 2026)

Stav: **PŘÍPRAVA** — čeká se na nasazení v23.11.1 na test (`/api/zdravi` → `"verze":"23.11.1"`).

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

(doplní se)

## Nálezy

(doplní se)

## Úklid

(doplní se)
