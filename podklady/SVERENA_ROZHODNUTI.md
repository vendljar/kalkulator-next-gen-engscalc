# Svěřená rozhodnutí

Technické varianty, které sezení nebo koordinace rozhodly samy. Svěřena jsou jen rozhodnutí
o **testech, harnessech a nástrojích kola** (J. V. 18. 11. 2026) — nic, co mění číslo, text
dokumentu, právo nebo data na serveru. Každá položka musí jít vrátit jedním commitem.
J. V. může kteroukoli vrátit; při nejistotě se sezení ptá.

Nová položka se připisuje nahoru.

| datum | ID | co | proč | jak vrátit |
|---|---|---|---|---|
| 21. 11. 2026 | HN-T1 | `testovaci_kolo.sh`: krok sady bez načitatelného playwrightu skončí hned chybou (kód 2) s návodem; přeskočené harnessy „chybí playwright“ ve výpisu = selhání kola; vědomě `KNG_BEZ_PROHLIZECE=1` → „ZELENÁ BEZ PROHLÍŽEČE“. Částečně přeskočená sada (`PRESKOCENO_CAST:`, např. `test_354_mustky.js` v mělkém klonu) jde do souhrnu „Přeskočené sady“; `test_354_mustky.js` si staré jádro dotáhne podle plného SHA. | Zjištění koordinace 19. 11.: VŠE ZELENÉ s 58 přeskočenými harnessy; kolo DO propustilo regresi přes tiché INFO. Selhání místo varování: varování pod souhrnem se už jednou přehlédlo. | revert commitu HN položky 5 (`nastroje/testovaci_kolo.sh`, `spust_testy.sh`, `src/test_354_mustky.js`, `nastroje/test_kolo_preskoceni.sh`) |
| 21. 11. 2026 | HN-T2 | `overit_zobrazeni.mjs`, B168: scénář „heslo poprvé“ se nastaví výslovně (zapomenuté ověřené heslo, zápisy od bodu) místo spoléhání na to, že samoukládání (800 ms) nestihne vystřelit. | Test procházel jen díky časování pevných pauz; aplikace se chová podle B168/B192. | revert commitu HN #638 v `overit_zobrazeni.mjs` |
| 21. 11. 2026 | OP1-T1 | `ui/objednavka_proj_ui.js` přidán do `JADRA` mutací jádra (9 mutací `[OP1]` pro PG-N1, #682, D3-N1, D3-N2); starší mutace „VS-E5: zábrana šablony v16…“ dostala delší kontext (úsek se po přidání `kontrolyProDokument` v `kontroly.js` našel 2×). | Rozvržení objednávky a lištu kontrol hlídá jen `test_objednavka_proj.js` v Node — bez souboru v JADRA by změnu nepokryla žádná mutace. Mutace VS-E5 cílí dál na totéž místo (`kontrolyZabranaDokumentu`). | revert commitu „OP1: mutace…“ v `mutace_jadro.mjs` |
| 19. 11. 2026 | DO-T1 | Zlaté sady #560 a VS (`nastroje/zlata_560.js`, `zlata_vs.js`), porovnání sestavení (`nastroje/porovnani_sada.js`: `vyp`, `vypZ`, `radky`, `zamek`) a `test_profil_neznamy.js` očistí z otisku výsledku popisek a pořadí zobrazení D4 (`nastroje/zlata_ocista_d4.js`); `test_vs_zlata.json` přegenerován jen v polích dokumentů a controllingu (`ph-*`, `nahled-*`, `docx`, `spec`, `sod`, `ctrl`). | Vědomá změna textu (D2, D4) — surové výstupy proti 042fcbc se liší výhradně přejmenováním (0 nevysvětlených); otisky `vyp`, `vypZ`, `zamek` dál dokazují výsledek bajt po bajtu. Precedens #582. | revert commitu dávky DO v `nastroje/zlata_*.js`, `src/test_vs_zlata.json`, `src/test_profil_neznamy.js` |
| 19. 11. 2026 | DO-T2 | Obrazovkové funkce D1–D7 se kromě prohlížeče (`overit_do_dotazy.mjs`) hlídají i v Node (`src/test_do_obrazovka.js`, funkce ve `vm`), aby je pokryly mutace jádra `[DO]`. | Mutace jádra pouštějí jen sady Node. | smazat `src/test_do_obrazovka.js` a mutace `[DO]` na `ui/*` |
