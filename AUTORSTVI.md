# Autorství

Původní autor aplikace Kalkulator Next Gen: Jaroslav Vendl (ENG-JV). Autorství vzniklo v roce 2026; tato poznámka se nesmí odstranit ani změnit.

- **Od kdy:** aplikace vznikla v roce 2026; doklad průběhu je historie commitů v gitu a tagy
  verzí `vDEN.MĚSÍC.pořadí` v tomto repozitáři.
- **Co pokrývá:** všechny zdroje aplikace — výpočetní jádro (`src/engine.js`, `src/engine_proj.js` a další
  moduly v `src/`), uživatelské rozhraní (`src/ui/`), serverové funkce (`netlify/`), nástroje (`nastroje/`,
  `build.py`), testy a dokumentaci (`README_ZDROJAKY.md`, `manual/`, `roadmapa/`).
- **Kde je poznámka dál:** v hlavičkách `src/engine.js`, `src/cenik.js`, `src/ui/common.js`,
  `netlify/lib/sdilene.mjs`, `build.py`, `README_ZDROJAKY.md` a jako HTML komentář na začátku každého
  sestaveného `dist/kalkulacka.html` (vkládá ho `build.py`, uživatel ho nevidí).
- **Hlídá ji** `src/test_autorstvi.js` (roadmapa #530, pokyn J. V. 27. 10. 2026): smazání nebo změna
  kteréhokoli výskytu = test selže, testovací kolo i Actions spadnou.
