# Předávka — stav k 25. 9. 2026 v noci

Na `main`: **v25.9.3** (+ oprava Node), tag `v25.9.3`.
Na `test`: **v25.9.5**. Na `test-draft`: **v25.9.6** (dávka A kola 16) — čeká
na pokyn J. V. k přenosu do `test`.
Roadmapa: `roadmapa/roadmap.json` (363 položek), publikovaná na
https://claude.ai/artifact/RmrdBw1QbyyBxDLhZcExTq

## Hotovo v25.9.6 (jen `test-draft`) — roadmapa #360
- P1 (K16-N73, N74): role slevy z přihlášeného / z relace, cizí „čeká" se
  uložením neschválí, auto nad stropem role = zábrana tisku.
- P2 (K16-N75, K14-N61): rozměry a nová kontrola „cenaNula" = zábrana;
  chybějící cena v ceníku nedá NaN. POZOR: nová prázdná zakázka (zdvih,
  šířka, hloubka 0) teď nejde tisknout, dokud se nevyplní — záměr.
- P13 (K16-N77): v náhledu autosave stojí, ruční uložení v rolovém náhledu se ptá.
- N89: „Smazat vybrané" jen s právem uloziste.mazani.
- Nová sada `netlify/test_obchodnik.mjs` (24 scénářů, v mutacích serveru).
- Ověřeno: sady v Node, harnessy (kromě příručky a SoD), jádro 76/76,
  mutace serveru — viz CHANGELOG.

## Další práce — J. V. chce NOVOU VĚTEV (25. 9. 2026)
- Dávka B = roadmapa #361, dávka C = #362, rozbor D = #363 (podklady kola 16:
  PROMPT_PARALELNI_VETEV_K16.md, VYHODNOCENI_TESTU_KOLO16_2026-09-25.xlsx —
  J. V. je má; v repu nejsou). Prompt K16 počítal s 4f714a3 — P1, P2, P13,
  N89 už hotové, P3 z části (v25.9.5), zbytek platí.
- #350 slovník SoD: čeká na soubory Sablona_SOD_REALIZACE/PROJEKCE od J. V.

## Poznámky pro další sezení
- Šablony pro harnessy (CN v12 + EN/DE/FR, PROJ v2_opravena) v novém sezení
  nejsou — požádat J. V.; `KNG_PODKLADY=<složka>`, PROJ jako `Sablona_NABIDKA_PROJ.docx`.
- Harnessy a serverové sady pouštět s `ADMIN_EMAIL=spravce@priklad.cz`
  (nastroje/pred_pushem.sh ho nastaví sám).
- Mutace serveru jen jednou naráz, spouštět přes běh na pozadí nástroje (ne
  setsid). Po přerušení `grep -rn "if (false)" netlify src` a `git diff netlify`.
- Čekací smyčky nepsat přes `pgrep -f` se stejným vzorem (chytí samy sebe).
- Harnessy potřebují symlink `node_modules/playwright` → `$(npm root -g)/playwright`.
- Komentář s doslovnou uzavírací značkou skriptu v src/ rozbije celou aplikaci.
- Dvě nezávislé pojistky (např. P1 role + P1 vrácení stavu) potřebují každá
  vlastní cílený test, jinak mutace jedné projde (S17, S18).

## Čeká na J. V.
- Pokyn k přenosu v25.9.6 do `test`, v25.9.x do `main`.
- Soubory SoD (#350); texty kapitol nabídky (#363/P8); rozhodnutí P9–P12;
  #355, #356 (můstky); #346 Netlify; #172 lokálně npm.
