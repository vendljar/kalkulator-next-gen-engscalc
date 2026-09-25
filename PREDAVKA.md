# Předávka — stav k 25. 9. 2026 pozdě večer

Na `main`: **v25.9.3** (+ oprava Node), tag `v25.9.3`.
Na `test` i `test-draft`: **v25.9.5** (přeneseno na pokyn J. V. 25. 9. večer).
Roadmapa: `roadmapa/roadmap.json` (359 položek), publikovaná na
https://claude.ai/artifact/RmrdBw1QbyyBxDLhZcExTq

## Hotovo v25.9.5 (jen `test-draft`)
- #344: N48 (specifikace/krycí list neslibují vyřazené položky), N49 („lze
  doplnit – viz příplatkové ceny" u nabízených příplatků), N50 (VSG/SKN po
  stěnách jen ze skel), N52 (dva pásy „jiné"), N55 (sleva v přehledu jako
  v dokumentu, krycí list s haléři).
- #350 část: překladač šablon překládá i odstavce se symbolem {{…}}.
- Ověřeno: sady v Node, harnessy (kromě příručky a SoD), mutace jádra 76/76.

## Rozdělané
- #350 slovník obou SoD — BLOKOVÁNO: šablony Sablona_SOD_REALIZACE.docx
  a Sablona_SOD_PROJEKCE.docx jsou na Drive (složka se zprávami testů),
  ale přesné odstavce je potřeba vzít ze souboru .docx — požádat J. V.
  o nahrání do sezení. Text PROJEKCE (~90 odstavců) je čitelný přes
  Google Drive read_file_content. Smluvní překlad = návrh ke kontrole J. V.;
  zveřejnění jazykové verze je rozhodnutí administrátora (#157).

## Poznámky pro další sezení
- Šablony pro harnessy (CN v12 + EN/DE/FR, PROJ v2_opravena) v novém
  sezení nejsou — požádat J. V. nebo stáhnout; `KNG_PODKLADY=<složka>`,
  PROJ pojmenovat `Sablona_NABIDKA_PROJ.docx`.
- Mutace serveru pouštět JEN JEDNOU naráz (setsid běh vypadá skončený, ale
  běží dál). Po přerušení `grep -rn "if (false)" netlify src` a `git diff netlify`.
- Čekací smyčky nepsat přes `pgrep -f` se stejným vzorem (chytí samy sebe).
- Harnessy potřebují symlink `node_modules/playwright` → `$(npm root -g)/playwright`.
- Komentář s doslovnou uzavírací značkou skriptu v src/ rozbije celou aplikaci.

## Čeká na J. V.
- Pokyn k přenosu v25.9.5 z `test` do `main`.
- Soubory SoD pro #350; #355, #356 (můstky); #346 Netlify; #172 lokálně npm.

## Kolo 16 (podklady J. V. 25. 9. večer: PROMPT_PARALELNI_VETEV_K16.md, VYHODNOCENI_TESTU_KOLO16, test_obchodnik16.mjs)
- Prompt počítá s větví `k16-nalezy` z 4f714a3 (v25.9.3) — dnes zastaralé:
  v25.9.4/9.5 už sahají do schvalovani.js, zakazky.mjs, uloziste.js,
  kontroly.js, docxgen.js, techspec.js (P1, P2, P3 by kolidovaly).
- test_obchodnik16 nad v25.9.5: 21/22, padá jen S5 (vedoucí otevře a uloží
  „čeká" s rolí Administrátor → „schváleno automaticky", schvalil prázdné).
  → P1 je skutečná VYSOKÁ chyba i po #341.
- P3 z části hotové v25.9.5 (odstavec se symbolem přes slovník); run-level
  překlad kolem symbolů + „včetně DPH" zbývá.
- Soubor audit-2026-09-24-zapis-sezeni.md je z JINÉHO projektu (Portfolio
  Tracker / Lovable), s kalkulátorem nesouvisí.
- Návrh pořadí: dávka A (P1, P2, P13, P16-N89), B (P5, P6, P7, P15, P14-N81),
  C (P3 zbytek + P4), rozbor D (P8, P9, P10, P11, P12) do podklady/K16_ROZBOR.

## Další krok (lze spustit hned)
- #345 přihlašování (B75–B83); #319 revize; N50 — potvrdit, že SKN se po
  stěnách počítá jen z dvojskla.
