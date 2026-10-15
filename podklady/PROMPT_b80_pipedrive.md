# Dávka S1 — #345 / B80: rozhraní Pipedrive `/api/pd/*` (verze v15.10.1)

Nejdřív přečti `podklady/_SPOLECNE_15_10.md` (stejná větev) — platí celé. Větev `claude/b80-pipedrive`.

Roadmapa #345 (F5: přihlašování jako celek a úklid) má jediný otevřený bod **B80 — `/api/pd/*`** (funkce `netlify/functions/pd_deal.mjs`, `pd_dealy.mjs`, `pd_pole.mjs`, knihovny `netlify/lib/pipedrive.mjs`, `pd_mapa.mjs`). Popis nálezu: zpráva `2026-09-24_kalkulator_REPORT_hloubkovy_test_a_BEZPECNOSTNI_AUDIT_v24.9.2.md` na Google Drive (id 1lTNHbQTm9fwQ5VvKLo-YMpPHKrdFwcuB), stav naposledy v `2026-10-12_kalkulator_BEZPECNOSTNI_AUDIT_v12.10.2.md` (id 1d5W08MWoOWdVOj9pdm20z5bOd92f5rXX) — přečti konektorem Google Drive (`read_file_content`).

1. Ověř v kódu, zda B80 pořád platí (přesná cesta zneužití: kdo, jaký požadavek, co se stane). Pokud už je opravený jinou dávkou, doloži to testem a commitem a jen uzavři v roadmapě.
2. Platí-li: nejdřív test v `netlify/test_*.mjs` (paměťové úložiště jako `netlify/test_prava.mjs`, Pipedrive API nahradit náhradou — žádné volání ven), doložit selhání; pak oprava (výchozí: stejná pravidla rolí, původu a omezení jako ostatní zapisující funkce; čtení jen přihlášenému s právem z matice). Mutace ke každé nové kontrole, sada do `SADY`.
3. Ostatní body #345 (B75–B78, B81, B83, B88) jsou hotové — jen ověř zápis v roadmapě.
4. Roadmapa (`roadmapa/roadmap.json`, textově, nepřeformátovat; skill `roadmapa-kng`): #345 → `hotovo`, `hotovoV` v15.10.1, nebo zůstává s důvodem. `python3 roadmapa.py --kontrola`.
5. Verze **v15.10.1**, CHANGELOG, PREDAVKA, smoke, push.
