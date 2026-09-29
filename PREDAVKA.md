# Předávka — stav k 29. 9. 2026 (rozhodnutí k rozboru D kola 16)

Na `main`: **v25.9.3** (+ oprava Node), tag `v25.9.3`.
Na `test`: **v25.9.6**. Na `test-draft`: **v29.9.2** — čeká na pokyn J. V.
k přenosu do `test`. Větev `k16-nalezy` (v25.9.8) splnila účel a je
sloučená do `test-draft`; navrženo J. V. ji smazat (z cloudu to nejde).
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

## Rozpracováno — další kroky
1. P8A: značky bloků v generátoru ({{KAP_…_ZAC}} / {{KAP_…_KON}}) + šablona
   CN v13 (CZ/EN/DE/FR) se značkami a větami „(bez DPH)" (#365); šablona
   PROJ v3 se součtem, slevou a `{{PROJ_POLOZKY_NAVIC}}` (CZ/EN/DE/FR, #370).
   Šablony vyrábět skriptem z v12 / PROJ v2 (podklady ve scratchpadu sezení,
   `KNG_PODKLADY`); J. V. je nahraje v Nastavení → Šablony.
2. Návrh pro J. V.: „vše z krycího listu" (10.3), koncept plánu plateb PROJ
   (10.6), řada čísel smluv (P9.1), splátky SoD PROJ (P9.3) —
   `podklady/NAVRH_PLATEBNI_PODMINKY_2026-09-29.md`.

## Čeká na J. V.
- Pokyn k přenosu `test-draft` do `test`, pak do `main`.
- Soubory SoD (#350) — bez nich nejde ověřit symboly smluv.
- Odsouhlasit rozhodnutí z dávky B (bez čísla se neukládá; přepočet po
  zveřejnění ceníku není neuložená změna; „ß" = „ss") a překlady z dávky C.
- Úkoly z dávky C: po nasazení přegenerovat jazykové mutace šablon.

## Poznámky pro další sezení
- Šablony pro harnessy (CN v12 + EN/DE/FR, PROJ v2_opravena) v novém sezení
  nejsou — požádat J. V.; `KNG_PODKLADY=<složka>`, PROJ jako `Sablona_NABIDKA_PROJ.docx`,
  pro `overit_sablony_online.mjs` kopie CN v12 i jako `Sablona_NABIDKA_CN_v11.docx`.
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
přiložit šablony CN v12 (CZ/EN/DE/FR), Sablona_NABIDKA_PROJ_v2_opravena.docx
(nebo novější PROJ se součtem) a případně Sablona_SOD_REALIZACE.docx
+ Sablona_SOD_PROJEKCE.docx.

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
