# STAV kola 54 — TESTOVÁNÍ 3: firemní šablony Word po SA (v24.11.1 na testu, 24. 11. 2026)

Stav: **HOTOVO** — vše jen čtením (šablony staženy z testu i main přes API, nabídky generovány z neuložené zakázky,
zápisy na server v harnessu zablokované). Souhlas se zápisem nebyl potřeba.

## Hlavička

- Test: v24.11.1 (`/api/zdravi`, `origin/test` 0fd6410). Main: jen čtení.
- Kdo: testovací sezení (prostředí `kalkulator-testovani`), větev `claude/testovani-3-sablony` (nad `origin/test`).
- Zadání koordinace 24. 11.: (1) verze 24.11.1, (2) firemní šablony × nová kontrola SA, (3) pole pro rozhodnutí R3,
  (4) nabídka OCK a PROJ z platných šablon.
- `KNG_PODKLADY` v prostředí není → podklady = platné šablony stažené z `/api/sablony` (test 14 typů, main 17 typů).

## Výsledky

| bod | výsledek | poznámka |
|---|---|---|
| 1 | OK | `/api/zdravi` test = 24.11.1 |
| 2a | OK | `src/test_sablona_obsah.js` s `KNG_PODKLADY` = šablony testu: 105 prošlo / 0 selhalo; firemní SoD realizace (CZ/EN/DE/FR), SoD projekce a plná moc ověřeny |
| 2b | NÁLEZ (informace) | seznam firemních šablon v `test_sablona_obsah.js` je zastaralý (hledá CN v14, CN v11, PROJ v3/v4) → platné CN v18 a PROJ v9 tam vypadnou jako „chybí“ (fakticky přeskočeno) — K54-I1 |
| 2c | OK | vlastní průchod `sablonaObsahVady` + názvy položek ZIPu (`sablonaNazevVada`) + největší XML část nad **31 šablonami** (test 14, main 17): CN v18 CZ/EN/DE/FR, PROJ v9 CZ/EN/DE/FR, SoD realizace v6 CZ/EN/DE/FR, SoD projekce v4 (CZ; main i EN/DE/FR), plná moc — **0 vad**; největší XML část 0,33 MB (strop 8 MB), největší soubor 1,01 MB; žádná dvojtečka, U+FFFD ani prázdný úsek v názvech |
| 3 | OK | pole Word ve všech 31 šablonách: jen `PAGE` (1–2×). **USERINITIALS, USERADDRESS, LASTSAVEDBY, TEMPLATE, INFO, DOCPROPERTY — 0 výskytů** (ani USERNAME, AUTHOR, FILENAME, MERGEFIELD, DOCVARIABLE, AUTOTEXT; kontrolováno i prostým hledáním v `word/*.xml`) |
| 4a | OK | nabídka OCK (Word CZ) z neuložené TEST zakázky: vznikla z platné šablony CN v18, žádné nevyplněné `{{…}}`, číslo nabídky, akce i zákazník vyplněné |
| 4b | OK | nabídka PROJ (Word CZ) na zakázce řady OVP: platná šablona PROJ v9, žádné `{{…}}`, číslo, akce, zákazník vyplněné. (Na zakázce OPR aplikace PROJ správně odmítne: „Kalkulace PROJ je uzamčená … samostatnou zakázkou řady OVP“.) |
| 4c | OK | jediný pokus o zápis (`POST /api/zakazky` — záznam odeslání po tisku) harness zablokoval; na test se nic nezapsalo |

Rozdíl dat test × main (jen informace): test nemá jazykové verze SoD projekce (`sodProj_en/_de/_fr`), main je má (v2).

## Nálezy

- **K54-I1** (informace, nízká, cena ne): `src/test_sablona_obsah.js` (blok „Firemní šablony“, `pozadovane`) hledá staré názvy
  (CN_v14, CN_v11, PROJ bez verze, PROJ_v4) → s dnešními podklady (CN v18, PROJ v9) je kontrola nabídek fakticky přeskočená,
  přestože kolo hlásí zeleně. Návrh: vzory podle typu (`CN_v\d+`, `PROJ_v\d+` + jazyky) nebo „každý `Sablona_*.docx` ve složce“.
- **K54-I2** (informace pro J. V.): na testu chybí jazykové verze SoD projekce v4 (EN/DE/FR), main je má.

R3 (rozhodnutí J. V.): firemní šablony žádné z polí USERINITIALS, USERADDRESS, LASTSAVEDBY, TEMPLATE, INFO, DOCPROPERTY
nepoužívají — jejich zákaz by žádnou dnešní šablonu nerozbil.

## Úklid

Nic — na test se nezapisovalo. Harnessy kola v kontejneru sezení (`scratchpad/h/k54_word.js`, `sa_kontrola.js`, `pole_scan.py`), do repa se nedávají.
