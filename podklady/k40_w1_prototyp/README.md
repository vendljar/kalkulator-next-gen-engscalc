# Prototyp K40-W1 — vazba z webhooku (podklad k otázce 5 a 5b posudku)

Jen podklad k rozhodnutí J. V., **není součást aplikace** (nic z této složky se nesestavuje do `dist/`).

- `prototyp.js`, `prototyp.css` — panel prototypu a žluté upozornění; server, Pipedrive i webhook jsou jen
  napodobené v paměti stránky, data jsou smyšlená, nic se nikam neposílá.
- `sestav.mjs` — vloží panel za sestavenou aplikaci:
  `KNG_NEZVYSOVAT_VERZI=1 python3 build.py && node podklady/k40_w1_prototyp/sestav.mjs dist/kalkulacka.html <výstup.html>`
  (sestaveno nad integrací `c664c9e`, v11.11.1; výstup má tvar pro artefakt — bez obalu dokumentu).

Průchod: 1. výchozí stav → 2. webhook s překlepem v čísle nabídky → 3. rozhodnutí v upozornění
(„V pořádku“ / „Zrušit vazbu“ / „Vazba je chybná“ podle role) → 4. webhook znovu.

- **a)** webhook jen naváže a upozorní; prázdná pole hlavičky doplní až další doručení po „V pořádku“;
  zrušení vazby vymaže i odkaz v dealu a deal u kalkulace odmítne (další webhook 409).
- **b)** jako dnes: webhook hned doplní prázdná pole hlavičky a termín předání a zapíše odkaz do dealu;
  zrušení vazby (podle promptu v1) doplněné údaje ani odkaz nevrátí.
