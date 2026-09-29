# Předávka — stav k 29. 9. 2026 (rozhodnutí k rozboru D kola 16)

Na `main`: **v25.9.3** (+ oprava Node), tag `v25.9.3`.
Na `test` a `test-draft`: **v29.9.3** (převedeno 29. 9. 2026 na pokyn J. V.,
fast-forward 11a8f9a → 2184f9d). Šablony CN v13 a PROJ v3 (+ EN/DE/FR) má
J. V. nahrané v Nastavení → Šablony (29. 9. 2026).
Větev `k16-nalezy` (v25.9.8) splnila účel a je sloučená do `test-draft`;
navrženo J. V. ji smazat (z cloudu to nejde).
Roadmapa: `roadmapa/roadmap.json` (370 položek), stará publikace
https://claude.ai/artifact/RmrdBw1QbyyBxDLhZcExTq (není aktuální).

## Hotovo v29.9.1 (`test-draft`)
- #364 nabídka PROJ se slevou: činnosti za cenu před slevou, rekapitulace
  se sečte (nález J. V. 29. 9.). Šablona bez `{{PROJ_SLEVA_KC}}` (PROJ v2)
  a SoD PROJ dál po slevě. `dokumentVygeneruj` předává builderu symboly
  šablony (`def.sablonaSymboly`).
- Rozhodnutí J. V. k rozboru D zapsaná (tabulka na začátku
  `podklady/K16_ROZBOR_2026-09-25.md`), #363 uzavřena, nové #365–#370.
- Dávky B (v25.9.7) a C (v25.9.8) kola 16: viz CHANGELOG; mutace serveru
  nad v25.9.7 176/176.

## Hotovo v29.9.2 (`test-draft`) — rozhodnutí k rozboru D
- P8b termín v týdnech (#365), P9.2/P9.4 SoD OCK z krycího listu, P9.5 zámek
  zmrazí předvyplněné podmínky (`data.kryci.zmrazeno`, `data.kryciProj.zmrazeno`,
  platí jen u zamčené varianty) (#366), P10.1/10.2/10.4/10.5/10.7 (#367),
  P11 kontrola `projZahranici` (#368, hotovo). Nová sada `src/test_rozhodnuti_k16.js`.

## Hotovo v29.9.3 (`test-draft`)
- P8A značky bloků v generátoru (`odstranPrazdneBloky`), šablony CN v13
  a PROJ v3 i s EN/DE/FR (`nastroje/vyrob_sablony.js <podklady> [výstup]`),
  soubory předány J. V. (nejsou v repozitáři; kopie ve scratchpadu sezení
  `sablony_nove/`). #365 a #370 hotovo.
- Návrh `podklady/NAVRH_PLATEBNI_PODMINKY_2026-09-29.md` (10.3, 10.6, P9.1,
  P9.3) — #366 a #367 blokované na odsouhlasení.

## Další práce
- Po odsouhlasení návrhu: etapa A (OCK platební kalendář + šablona CN v14),
  B (PROJ plán plateb + šablona PROJ v4), C (číslo smlouvy ze serverové řady).
- #369 (vypnout náklady obchodníkovi) — až řekne J. V.
- Harnessy se šablonami v13/v3: složit složku podkladů s v13 (nejvyšší verze
  CN) a PROJ v3 pojmenovanou `Sablona_NABIDKA_PROJ.docx`.

## Čeká na J. V.
- Pokyn k přenosu `test` do `main` (po vyzkoušení v29.9.3 na testovacím webu).
- Soubory SoD (#350) — bez nich nejde ověřit symboly smluv.
- Odsouhlasit rozhodnutí z dávky B (bez čísla se neukládá; přepočet po
  zveřejnění ceníku není neuložená změna; „ß" = „ss") a překlady z dávky C.
- Odsouhlasit návrh platebních podmínek (otázky v oddílu 6 návrhu).

## Poznámky pro další sezení
- Platné šablony od 29. 9. 2026: CN v13 (+ EN/DE/FR) a PROJ v3 (+ EN/DE/FR).
  V novém sezení nejsou — požádat J. V., nebo je vyrobit
  `node nastroje/vyrob_sablony.js <složka s CN v12 a PROJ v2> [výstup]`.
  `KNG_PODKLADY=<složka>`: CN v13 jako nejvyšší verze, PROJ v3 pojmenovat
  `Sablona_NABIDKA_PROJ.docx`, pro `overit_sablony_online.mjs` kopie CN
  i jako `Sablona_NABIDKA_CN_v11.docx`.
- Harnessy a serverové sady pouštět s `ADMIN_EMAIL=spravce@priklad.cz`
  (statické importy čtou proměnnou dřív, než ji harness nastaví; nastroje/pred_pushem.sh
  ji nastaví sám).
- Mutace serveru jen jednou naráz, spouštět přes běh na pozadí nástroje (ne
  setsid) a NIKDY souběžně s pred_pushem ani s úpravami `src/`/`netlify/`
  (runner soubory dočasně mění). Po přerušení `grep -rn "if (false)" netlify src`
  a `git diff netlify src`.
- Kontejner běží v UTC: verze vDEN.MĚSÍC se měří k datu posledního commitu —
  dávku uzavřít a commitnout před půlnocí UTC, nebo ji sestavit s novým dnem.
- Čekací smyčky nepsat přes `pgrep -f` se stejným vzorem (chytí samy sebe).
- Harnessy potřebují symlink `node_modules/playwright` → `$(npm root -g)/playwright`
  (a `node_modules/playwright-core` → `…/playwright/node_modules/playwright-core`).
- LibreOffice v kontejneru nemá Writer — vykreslení .docx se ověřit nedá,
  jen strukturou XML.
- Komentář s doslovnou uzavírací značkou skriptu v src/ rozbije celou aplikaci.
- Dvě nezávislé pojistky potřebují každá vlastní cílený test, jinak mutace
  jedné projde.

## Prompt pro nové sezení (větev test-draft)
Sezení založit nad `vendljar/kalkulator-next-gen-engscalc`, větev `test-draft`;
přiložit šablony CN v13 (CZ/EN/DE/FR), PROJ v3 (CZ/EN/DE/FR) a případně
Sablona_SOD_REALIZACE.docx + Sablona_SOD_PROJEKCE.docx.

```
Pracuješ na Kalkulator Next Gen ve větvi test-draft (repo vendljar/kalkulator-next-gen-engscalc).
Do test a main nic bez pokynu J. V.
Než začneš:
1. git fetch origin test-draft && git checkout -B test-draft origin/test-draft
2. Přečti CLAUDE.md a PREDAVKA.md a skill kalkulator-next-gen.
3. Připrav prostředí: symlink node_modules/playwright → $(npm root -g)/playwright;
   přiložené šablony dej do složky podkladů a pouštěj testy s KNG_PODKLADY=<složka>
   (PROJ šablonu pojmenuj Sablona_NABIDKA_PROJ.docx).
4. Ověř výchozí stav: ADMIN_EMAIL=spravce@priklad.cz ./spust_testy.sh (má být 0 selhání).
Úkol: zapracovat rozhodnutí J. V. k rozboru D kola 16
(podklady/K16_ROZBOR_2026-09-25.md): <doplnit rozhodnutí k P8–P12>.
U každého bodu: test, který bez opravy selže → oprava → vlastní commit. Pak build,
nastroje/pred_pushem.sh, mutace (jen když se měnil server nebo jádro; jen jeden běh
naráz, na pozadí nástroje), CHANGELOG, roadmapa, PREDAVKA.md, push do test-draft.
Na konci tabulka úkolů ✅/⬜ a stav kontextu (get_session → context_usage).
```
