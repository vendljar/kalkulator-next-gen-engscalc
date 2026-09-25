# Předávka — stav k 25. 9. 2026 odpoledne

Poslední vydání: **v25.9.3** (větev `test`). Roadmapa: `roadmapa/roadmap.json`
(358 položek, 317 hotovo), publikovaná na https://claude.ai/artifact/RmrdBw1QbyyBxDLhZcExTq

## Hotovo dnes
- Sezení „Kalkulátor NextGen Eng Aplikace Cloud“ spadlo na „Prompt is too long“
  po pushi v25.9.3; práce na GitHubu je úplná, větev `k13-nalezy` byla už sloučená.
- Netlify: build `test` padal na timeout (Node 22.23.3 se kompiloval ze zdrojů
  kvůli poškozené cache). Oprava `NODE_VERSION = "22.23.2"` v `netlify.toml`,
  na `test` i `test-draft`, web test běží (#358).
- Roadmapa aktualizována k 25. 9. — jen na `test-draft`.
- Rozdělané desktopové změny k #268 zahozeny (stejná práce už je na `test`),
  větev `main-ymk5ia` smazána.

## Rozdělané / čeká na přenos
- `test-draft` je před `test` o roadmapu, CLAUDE.md a tento soubor — přenést
  do `test` na pokyn J. V.
- `main` = `test` (4f714a3, v25.9.3 + oprava Node), nahráno 25. 9. odpoledne;
  CI na main běží (run 187). Tag `v25.9.3` z cloudu nahrát nejde (403) —
  založit ručně přes GitHub → Releases.

## Čeká na J. V.
- #355, #356: potvrdit výpočet můstků ↔ přechodové plechy a zastřešení.
- #325, #331, #334: nahrát/zveřejnit šablony PROJ a CN v11.
- #346: projít nastavení Netlify (6 kroků); #172: lokální `npm install --package-lock-only`.

## Další krok (lze spustit hned)
- #340, #341 (serverové kontroly zakázky a minimální marže), #319 revize, #344, #345, #350.
