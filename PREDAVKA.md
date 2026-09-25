# Předávka — stav k 25. 9. 2026 večer

Poslední vydání na `main`: **v25.9.3** (+ oprava Node), tag `v25.9.3`.
Na `test-draft`: **v25.9.4** — čeká na pokyn J. V. k přenosu do `test`.
Roadmapa: `roadmapa/roadmap.json` (359 položek), publikovaná na
https://claude.ai/artifact/RmrdBw1QbyyBxDLhZcExTq

## Hotovo v dávce v25.9.4 (jen `test-draft`)
- #341 (B71): server ověřuje minimální marži u platné slevy.
- #340: P1 typy polí zadání a ceníku na serveru (i obnova) + N47, N53, N54,
  B84, B86.
- #359: tabulka šablon ukazuje i název souboru.
- Uzavřeny #325, #331, #334, #326 — šablony CN v12 (CZ/EN/DE/FR) a PROJ v2
  zveřejněny na testu i ostrém webu (potvrdil J. V.); CN v12 ověřena
  `overit_sablona.mjs` 60/60, PROJ v2 `overit_nabidka_proj_word` 51 OK.
- Ověřeno: sady v Node zelené, test_prava 579, všechny harnessy (kromě
  overit_manual a overit_sod — chybí příručka a šablony SoD v cloudu),
  nové mutace serveru 5/5; celý mutační běh serveru viz commit dávky.

## Poznámky pro další sezení
- Šablony pro harnessy: J. V. je nahrál do chatu 25. 9. (CN v12 + EN/DE/FR,
  PROJ v2_opravena). V novém sezení je nemáme — požádat, nebo stáhnout
  z Google Drive. `KNG_PODKLADY=<složka>` a PROJ pojmenovat
  `Sablona_NABIDKA_PROJ.docx`.
- Mutace serveru pouštět JEN JEDNOU naráz (běh na pozadí přes `setsid`
  vypadá jako skončený, ale běží dál — dva běhy si mutace přepisují).
  Po přerušení `grep -rn "if (false)" netlify src` a `git diff netlify`.
- Harnessy potřebují symlink `node_modules/playwright` → `$(npm root -g)/playwright`.

## Čeká na J. V.
- Pokyn k přenosu v25.9.4 z `test-draft` do `test` (a pak `main`).
- #355, #356: výpočet můstků ↔ přechodové plechy a zastřešení.
- #346: nastavení Netlify (6 kroků); #172: lokální `npm install --package-lock-only`
  a Rate Limiting v Netlify.

## Další krok (lze spustit hned)
- #350 slovník šablon pro smlouvy o dílo; #344 soulad dokumentů
  (N48–N52, N55, N56); #345 přihlašování (B75–B83); #319 revize.
