# Prototyp K40-W1 — vazba z webhooku, ARES a oprava firmy v Pipedrive

Jen podklad k rozhodnutí J. V., **není součást aplikace** (nic z této složky se nesestavuje do `dist/`).
Zadání pro programování: `podklady/PROMPT_K40_OPRAVY_v3.md`.

- `prototyp.js`, `prototyp.css` — klouzavá lišta nahoře (situace, stav ARES, role, kroky, „▶ Přehrát“), panel
  „Co se mění“ (před → po se značkami) a žluté upozornění v aplikaci. Server, Pipedrive, ARES i webhook jsou jen
  napodobené v paměti stránky, data jsou smyšlená, nic se nikam neposílá.
- `sestav.mjs` — vloží panel za sestavenou aplikaci:
  `KNG_NEZVYSOVAT_VERZI=1 python3 build.py && node podklady/k40_w1_prototyp/sestav.mjs dist/kalkulacka.html <výstup.html>`
  (sestaveno nad integrací `c664c9e`, v11.11.1; výstup má tvar pro artefakt — bez obalu dokumentu).
- `snimky/` — desktop 1600 × 1000: správný deal (webhook + ARES, potvrzení opravy firmy, firma opravena),
  překlep v čísle nabídky (webhook, zrušení vazby), výpadek ARES.

Verze 4 (rozhodnutí J. V. 11. 11. 2026): jen chování „jako dnes“ — webhook hned doplní hlavičku a zapíše odkaz.
Firma (zákazník, sídlo, IČO, DIČ) jde z ARES podle IČO z dealu, kontakt a termín z dealu. Zapisuje se jen prázdné
pole nebo pole s hodnotou naposledy zapsanou webhookem. Zrušení vazby je pojistka: deal odmítnut (409), náš odkaz
v dealu smazán, doplněné údaje zůstávají. „Opravit firmu v Pipedrive“ zapíše po potvrzení jen lišící se pole
organizace. Verze 1–3 (porovnání variant a/b) jsou v historii větve.
