# STAV kola 70, část A — plné kolo před main (stupeň 3), TESTOVÁNÍ 4 bez Pipedrive (27. 11. 2026)

- **Sezení:** TESTOVÁNÍ 4 (`kalkulator-testovani`, session_018mwHQHn8gkmk4ksTXk6caP).
- **Kandidát:** `origin/test` = **694ddeef** (v26.11.3), na testengscalc nasazeno (`/api/zdravi` 26.11.3). **Main:** 4e69c27 (v24.11.7), předek kandidáta, `/api/zdravi` 24.11.7.
- **Zadání:** `podklady/kola/ZADANI_PLNE_KOLO_PRED_MAIN_2026-11-27.md` (větev `claude/plne-kolo-zadani`), §4 A1–A12 + doplněk Fable k A4.
- **Weby:** main jen ČTENÍ (přihlášení a GET). Zápis na test: souhlas J. V. přímo v tomto sezení (25. 11.: „se zápisy na testu souhlasím vždy a v jakémkoliv rozsahu“), jen zakázky TEST.
- **Nástroje:** balíček K49 / `run_kolo57.sh` v gitu nejsou (kolo 57 je nepushnulo), proto náhrada: worktree T (694ddee) a M (4e69c27), `build.py` bez zvýšení verze,
  export TEST zakázek z testu (jen čtení, mimo repo) a výpočet obou kódů nad stejnými daty kopií `porovnani_sada.js` s režimem „data“ (jen v sezení, mimo repo).
- **Bez cen a osobních údajů.** Mutace nespouštím (běží v Actions).

## Průběh (průběžně doplňováno)

| bod | stav | výsledek |
|---|---|---|
| A1 sestavení a weby | ✅ | viz níže |
| A2 kalkulace T × Mt | ⏳ | běží |
| A3 porovnání sestavení main × kandidát | ⏳ | čeká na seznam očekávaných rozdílů od koordinace |
| A4 dotisk starých odeslaných nabídek | ⏳ | |
| A5 nová nabídka (rozdíly pro J. V.) | ⏳ | |
| A6 nová kalkulace (rozdíly pro J. V.) | ⏳ | |
| A7 SoD, plná moc, objednávka PROJ | ⏳ | |
| A8 krycí listy | ⏳ | |
| A9 tok Word / zámek, fuzz, víc šachet, víc zákazníků | ⏳ | |
| A10 kontroly před odesláním | ⏳ | |
| A11 připomínky | ⏳ | |
| A12 automat (sady, harnessy) | ⏳ | `testovaci_kolo.sh --bez-mutaci` nad worktree kandidáta běží |

## A1 — sestavení a weby

- `build.py` (KNG_NEZVYSOVAT_VERZI=1) nad 694ddee a 4e69c27: obě sestavení projdou. **Web testu = sestavení kandidáta, web main = sestavení main** bajt po bajtu
  (liší se jen značka data sestavení `BUILD_DATUM_ZNACKA`: test 2026-11-26, main 2026-11-25).
- **Vypínače:** test i main `viceSachet: true`, `viceZakazniku: true`. Na main je zapnul J. V. 25. 11. 2026 15:17 (PREDAVKA.md uvádí „víc šachet vypnuto“) → K70-I1.
- **Šablony (platné verze, otisk souboru):**

| šablona | test | main | |
|---|---|---|---|
| CN OCK CZ / EN / DE / FR | `Sablona_NABIDKA_CN_v18*` | totéž | **stejné otisky** (číslo verze v historii se liší) |
| nabídka PROJ CZ | v8 `25adbd5f985a734f` (#805 oprava překlepu, kolo 66) | v7 `2abd9a08d81b216e` | **liší se** — #805 čeká na zveřejnění na main (J. V.) |
| nabídka PROJ EN / DE / FR | `ea80bb40…` / `5afad752…` / `9447ea0e…` | totéž | stejné |
| SoD realizace v6 CZ/EN/DE/FR, SoD projekce v4 CZ/EN/DE/FR, plná moc | | | stejné otisky |

  **CN v19 na testu není** (doplněk Fable k A4 a): platná je CN v18 se stejným otiskem jako main. Úprava CN pro V5/V6 (zadání §0.4) tedy na testu není → K70-I2.
- Ceník: `/api/cenik` (GET) na obou webech vrací 404 — ceník se porovná v A2 přes data zakázek (každá nese vlastní ceník).
