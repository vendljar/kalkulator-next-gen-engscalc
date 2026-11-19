# Svěřená rozhodnutí

Technické varianty, které sezení nebo koordinace rozhodly samy. Svěřena jsou jen rozhodnutí
o **testech, harnessech a nástrojích kola** (J. V. 18. 11. 2026) — nic, co mění číslo, text
dokumentu, právo nebo data na serveru. Každá položka musí jít vrátit jedním commitem.
J. V. může kteroukoli vrátit; při nejistotě se sezení ptá.

Nová položka se připisuje nahoru.

| datum | ID | co | proč | jak vrátit |
|---|---|---|---|---|
| 19. 11. 2026 | DO-T1 | Zlaté sady #560 a VS (`nastroje/zlata_560.js`, `zlata_vs.js`) a `test_profil_neznamy.js` očistí z otisku výsledku popisek a pořadí zobrazení D4 (`nastroje/zlata_ocista_d4.js`); `test_vs_zlata.json` přegenerován jen v polích dokumentů a controllingu (`ph-*`, `nahled-*`, `docx`, `spec`, `sod`, `ctrl`). | Vědomá změna textu (D2, D4) — surové výstupy proti 042fcbc se liší výhradně přejmenováním (0 nevysvětlených); otisky `vyp`, `vypZ`, `zamek` dál dokazují výsledek bajt po bajtu. Precedens #582. | revert commitu dávky DO v `nastroje/zlata_*.js`, `src/test_vs_zlata.json`, `src/test_profil_neznamy.js` |
| 19. 11. 2026 | DO-T2 | Obrazovkové funkce D1–D7 se kromě prohlížeče (`overit_do_dotazy.mjs`) hlídají i v Node (`src/test_do_obrazovka.js`, funkce ve `vm`), aby je pokryly mutace jádra `[DO]`. | Mutace jádra pouštějí jen sady Node. | smazat `src/test_do_obrazovka.js` a mutace `[DO]` na `ui/*` |
