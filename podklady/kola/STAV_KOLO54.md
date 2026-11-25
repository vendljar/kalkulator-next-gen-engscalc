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

## Doplněk 24. 11. (~11:25 UTC) — CN-432 „po smazání“ zase s marží 0 (jen čtení)

Zjištěno čtením `GET /api/zakazky?soubor=CN-432.json`: záznam na serveru existuje s celou historií od 23. 11. (prodaná
a zamčená Varianta 1, ceník s marží 0), 24. 11. 11:19 přidána Varianta 2, 11:21:08 webhook „Aktualizace z dealu 432“
(ne „Založeno“), vazba nově „ceka“ (uložený záznam vazbu neměl → byl zapsán bez serverových polí).
Výklad: J. V. CN-432 smazal, ale zakázka zůstala otevřená v prohlížeči (`onlineSmazVybrane` ji v paměti drží), další
uložení (Varianta 2) ji zapsalo znovu ze staré kopie; webhook pak jen aktualizoval → oprava #733 se neuplatnila.

- **K54-N1** (vada, střední, dopad na cenu: nepřímo ano): smazanou otevřenou zakázku jde dál upravovat a uložit — uložení
  ji „vzkřísí“ se starými cenami, prodanou variantou a protokolem, bez serverových polí. Návrh: po smazání otevřené
  zakázky ji zavřít nebo přepnout na „smazaná, jen ke čtení“ a uložení pod týmž číslem bez potvrzení odmítnout; test s pojistkou.
- Doporučení J. V.: smazat CN-432 v Seznamu zakázek, hned Ctrl+F5 (smazanou neupravovat), ověřit, že v Seznamu není,
  pak v dealu 432 „Vygenerovat nabídku“ = Ano.

## Doplněk 25. 11. — rozhodnutí J. V. k reportu a ověření (test v24.11.7)

| bod | výsledek | poznámka |
|---|---|---|
| CN-432 smazána | OK | `GET CN-432` = 404, v rejstříku není (J. V. smazal) |
| Kalkulace z Pipedrive s marží 0 | OK podle J. V. | oprava #733 v testu |
| Druhá automatizace (Make) | UZAVŘENO | J. V. ji v Pipedrive zastavil (bod 1j kola 53) |
| R3 | ROZHODNUTO | J. V.: zakázat USERINITIALS, USERADDRESS, LASTSAVEDBY, TEMPLATE, INFO, DOCPROPERTY — předáno koordinaci do dávky a ROZHODNUTI_LOG |
| „Příplatky v nabídce“ | OK | J. V. změnil pole v Pipedrive na Velký text; po obnovení mapy polí (`/api/pd/pole?obnovit=1`, bez chybějících a nesouhlasných typů) náhled nanečisto s výčtem 858 znaků na deal 432 = „zapíše“ (dřív „nelze, pojme 255“) → K53-I3 vyřešen |
| SoD projekce EN/DE/FR na test | OK | souhlas J. V. v sezení 25. 11.: z main (jen čtení) zveřejněno na testu sodProj_en v1 (587b2ad22049712c), sodProj_de v1 (8640937bec60dcab), sodProj_fr v1 (cc1e8c571de2b1ef), vše se `zdrojOtisk` platné CZ sodProj v4 (6fed289dd9609a0d) = shodné s main; nová kontrola SA bez vady. Ostatní platné šablony test × main: shodné otisky (CN v18, PROJ v9 ×4, SoD realizace v6 ×4, SoD projekce CZ v4, plná moc) |
| Poznámky 1110/1111 v dealu 432 | ponechány | dle návrhu |
| RJ #715 podpis při dotisku | **OK 6/6** | testovací obchodník: smyšlené jméno a zkušební podpis (souhlas J. V. v sezení). Zakázka `TEST - 2026 - OPR - CN - 9860`: CN obchodníka → zámek nese snímek zpracovatele s otiskem podpisu; dotisk správcem obsahuje tentýž obrázek podpisu a jméno obchodníka, sada obrázků shodná s originálem |

## Úklid

Kolo 54 na test nezapisovalo. Doplněk 25. 11.: mapa polí Pipedrive obnovena; testovací obchodník má smyšlené jméno a zkušební podpis (ponechat pro další zkoušky); zakázka `TEST - 2026 - OPR - CN - 9860` (odeslaná CN) zůstává. Harnessy kola v kontejneru sezení (`scratchpad/h/k54_word.js`, `sa_kontrola.js`, `pole_scan.py`), do repa se nedávají.
