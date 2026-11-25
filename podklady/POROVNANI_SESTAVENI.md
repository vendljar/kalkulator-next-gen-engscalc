# Porovnání sestavení (S3, #611, 18. 11. 2026)

Návrh režie 18. 11. 2026, oddíl S3, a rozhodnutí J. V. téhož dne:

- **stupně kol:** (1) po každé dávce automat — `testovaci_kolo.sh` + porovnání sestavení,
  (2) cílená sada na změněnou oblast, (3) plné kolo cenových nabídek **jen před main a po nasazení**;
- kolo main-před × main-po u rychlé cesty dělá koordinace nástrojem, J. V. dostane tabulku rozdílů
  (upřesněno týž den: rozdíly cen main × test si J. V. ověřuje sám — viz níž);
- noční porovnání v Actions zatím **ne**.

## Co nástroj dělá

`nastroje/porovnej_sestaveni.sh <ref A> <ref B>` postaví obě reference gitu do dočasných worktree
(`build.py` bez zvýšení verze), nad každou spočítá **pevnou sadu kalkulací** a porovná otisky výstupů.
Sada i ceník se berou ze stromu, kde leží nástroj, takže obě strany dostanou stejné vstupy:

| skupina | co | počet |
|---|---|---|
| fixtury | `src/fixtury/*.json`, každá varianta | 7 |
| scénáře #560 + můstky | zlatá pojistka #560, skladebné můstky (jako `zlata_vs.js`), Model 1 a 2 | 12 |
| K29-N1 / #451 | zastřešení vyřazené, ruční množství 0 / prázdné / 9,5, vlastní měď, 3 můstky | 14 |
| K36-N2 / #550 | zahraniční řada s montáží můstků bez / s vlastní sazbou, skladebné, ČR | 8 |
| K56: LAK #666 | částka lakovny se záznamem / bez zdroje / nula / s vlastní položkou, Model 1 a 2 | 10 |
| K56: víc šachet #648 | výchozí a ruční názvy šachet (SoD a Word EN/DE) | 2 |
| K56: dotisk #665 | odeslaná nabídka se snímkem zpracovatele a bez něj | 2 |
| K56: PROJ #683 / D8 | výchozí, sleva 30 / 100 %, studie vyřazená, prodaná s lhůtami (i se slevou 100 %) | 6 |
| K56-D: víc zákazníků #673 / #674 | `vz:ridici`, `vz:ridici-vymena` (podklad Pipedrive z pohledu řídícího), `vz:ico-nula` (plná moc, hlídač, IČO 0…) | 3 |
| ukázkové zakázky | smyšlené zakázky testovacího webu (`src/testdata.js`) | 12 |
| fuzz | generátor fuzz invariantů, semínko 20261110 (`--fuzz N`, výchozí 300) | 300 |

Porovnávaná pole: **cena celkem** (`cenaNabidkyOck`), **řádky** (sekce + příplatky), výsledek jádra
(`vypocet`, `vypocetZ`), **symboly CN** po klíčích (změněný × jen nový symbol), **text dokumentu**
(Word nabídky ze zkušební šablony, online náhled CZ/EN, Kompletní náhled podkladů CZ/EN `nahled-np-*`,
smyčka šachet Wordu `vs-word-*`, řádky navíc, krycí list OCK **ve verzi BO i techdata** `kryci-bo/-tech`,
specifikace CZ/EN, SoD CZ/EN/DE, **Word EN/DE** `docx-en/de`), **PROJ** (`proj-vyp`, `proj-cena` = skupina `cena-proj`; symboly nabídky
PROJ `proj-ph-cz/en`; krycí list PROJ `kryci-proj-bo/-tech`, SoD projekce, plná moc `pm` (u `vz:*` i z pohledu
řídícího `pm-ridici`), objednávka PROJ)
a ostatní (Pipedrive, controlling CSV, snímek a výsledek zámku). Vše přes otisk sha256 —
**výstup nenese ceny ani texty**, jen počty, případy a pole. Běh trvá kolem minuty (se sestavením; K56-D přidalo Word EN/DE a bloky náhledu), s `--pd-webhook` o 1–2 minuty déle.

Ceník: zkušební ceník testů (`src/zkusebni_cenik.js`), nebo `--cenik <soubor>` ve tvaru
`{cenik, cenikProj}` — **soubor patří mimo repozitář**, do výstupu nejde žádná jeho hodnota.

Kód: **0** shoda nebo jen očekávané rozdíly, **1** neočekávaný rozdíl, **2** chybné použití /
nejde postavit nebo spočítat.

## Upřesnění J. V. (18. 11. 2026, přes koordinaci)

- **Nástroj je stupeň 1 po dávce** — integrace proti testu nebo proti předchozímu stavu. **Není to brána do main:**
  rozdíly cen mezi main a testem si J. V. ověřuje sám. Výchozí `--proti` zůstává `origin/test`.
- Automat smí z testovacího webu (testengscalc) jen **číst**; zápis ani ostrý web ne. Zatím se to nevyužívá
  (návrh využití je v `PREDAVKA.md`).

## Main × test (jen pro informaci, ne brána)

```bash
git fetch origin main test
bash nastroje/porovnej_sestaveni.sh origin/main origin/test --max 60
```

Tabulka („Vzory rozdílů") ukáže, ve kterých polích se main a test liší; ke každému vzoru se dá najít dávka
(`git log origin/main..origin/test -- <soubor>`) a zapsat do seznamu očekávaných rozdílů (vzor:
`podklady/porovnani/ocekavane_main_test_2026-11-18.txt`). Ověření cen před main dělá J. V.

## Po dávce (stupeň 1) — vývojové sezení

```bash
bash nastroje/testovaci_kolo.sh --bez-mutaci --proti origin/test          # kolo + porovnání
bash nastroje/testovaci_kolo.sh --jen porovnani --proti origin/test \
     --ocekavane podklady/porovnani/<dávka>.txt                         # jen porovnání
```

Krok `porovnani` porovná `<ref>` (výchozí `origin/test`) s **pracovní kopií** (`.`, i necommitnuté změny).
Dávka, která výsledek mění vědomě (nová funkce, oprava ceny), si seznam očekávaných rozdílů napíše sama
a přiloží ho ke zprávě pro koordinaci; dávka, která výsledek měnit nemá, musí dát „SHODA".

Výsledek je v souhrnu kola: `porovnání sestavení (S3)  proti origin/test: N kalkulací, …`.

## Kompletní náhled podkladů po blocích (K56-2, 25. 11. 2026)

Otisk `nahled-np-cz/en` je rozdělený na bloky dokumentu se stabilním klíčem `nahled-np-<L>/<blok>`:
`hlavicka`, `popis`, `cena`, `podpis`, `zlom`; `nadpis:<TEXT>`, `ramecek:<NADPIS>` (text bez diakritiky
a dvojtečky, A–Z0–9 a pomlčky); `odstavce:<STYL>`; `priplatek`, `priplatek#2` …; technická část po sekcích
`ts:titul`, `ts:<PRUH>` (např. `ts:OPLASTENI-SACHTY`, EN `ts:SHAFT-CLADDING`), pruh šachty `ts:sachta`;
opakovaný klíč dostane `#2`, `#3`. Klíč nese jen nadpis, obsah je v otisku. Pravidlo pak kryje jen bloky,
které dávka mění — např. NPT-N1 jen `nahled-np-cz/ts:OPLASTENI-SACHTY*`; změna ceny v náhledu je nález.

## Word v cizím jazyce `docx-en/de` (K56-4)

Zkušební šablona jako u `docx` (všechny symboly CN), ale symboly `TS_` ve vlastních sekcích s pruhy technické
části (`MŮSTKY MEZI BUDOVOU A OCK`, `DOPLŇKOVÉ KONSTRUKCE`), šablona přeložená `docxPrelozSablonu` (jako jazykové
šablony CN) a vyplněná symboly téhož jazyka. Vidí prázdný přeložený pruh (#682). Fixtury mají uložený ceník
bez kurzu EUR — cizojazyčný tisk je u nich správně chyba („chybí Kurz EUR“), totéž `ph-en`, náhled EN.

## Kontrola sady (K56-5)

Výstup otisků nese `kontrola` (jen počty): krycí list OCK/PROJ BO i techdata má řádky polí, náhled podkladů
má > 5 bloků, `docx-en/de` bez chyby (bez fixtur), PROJ zamčené varianty bez chyby. Tabulka porovnání vypíše
`kontrola sady A/B: nová pole neprázdná (8 kontrol)`, jinak `POZOR — …` s počtem a prvním případem (kód nemění).
Slepé místo kola 56 (krycí list bez verze = 0 řádků) by kontrola hlásila u každého případu.

## Kalkulace z webhooku Pipedrive `--pd-webhook` (#733, #729; K56-5)

`bash nastroje/porovnej_sestaveni.sh A B --pd-webhook` po porovnání sady pustí nad každým sestaveným stromem
POSTUPNĚ `nastroje/porovnani_pd_webhook.mjs` (serverové funkce v paměti, simulátor PD, Chromium) a porovná oba
výstupy: `node nastroje/porovnani_pd_webhook.mjs --porovnej a.json b.json` — pro každou stranu „kalkulace
z webhooku = Nová zakázka“ po polích (marže OCK/PROJ, zábrany, sazba, cena, cenové symboly bez `NAZEV_AKCE`,
zadání, PROJ) a strany mezi sebou, Kontaktní osoba (#729) jen jako příznaky „má e-mail / má telefon / = jméno
osoby dealu“. Jen pole a ✓/✗, žádné částky ani jména. Kód 1 = vada v B. Nejde s `--bez-sestaveni`.

## Seznam očekávaných rozdílů

```
# komentář
<vzor případu>  <pole,pole|*>   # důvod
*            nahled-en           # C1 #582: nadpisy USAZENÍ OCK v EN
fuzz:*       cena-celkem,radky   # oprava ceny XY
k36:*        *                   # #550 zahraniční montáž můstků
```

Vzor: jméno případu, `*` = cokoli. Pole: klíč (`cena`, `radky`, `docx`, `nahled-en`, `sod`, …), skupina
(`cena-celkem`, `radky`, `vysledek`, `symboly`, `symboly-nove`, `dokument`, `ostatni`) nebo `*`; základní
pole kryje i své bloky (`nahled-np-cz` = všechny `nahled-np-cz/…`), pole s `*` je vzor (`nahled-np-en/ts:*`).
`--ocekavane` jde zadat víckrát — platí sjednocení seznamů (např. seznamy dávek integrace × test).

Platné seznamy K56-D (25. 11. 2026): main v19.11.11 × main v24.11.7 `ocekavane_k56d_main_2026-11-25.txt`
(úplný, po blocích); test v24.11.7 × integrace v25.11.1 `ocekavane_test_integrace_2026-11-25.txt`
+ doplněk `ocekavane_k56d_test_integrace_2026-11-25.txt` (jen nová pole a scénáře K56).
Rozdíl případu je očekávaný, když každé jeho rozdílné pole pokryje některé pravidlo. Pravidlo, které nic
nepokrylo, se vypíše jako upozornění (kód nemění) — u rychlé cesty je to signál, že se čekaná změna
do sestavení nedostala.

## Meze

- Sada vidí jádro a generátory dokumentů ze `src/` — ne živý ceník, zveřejněné šablony Wordu
  ani prohlížeč. Ty dál hlídá plné kolo (stupeň 3) před main a po nasazení.
- Do kola 56 (24. 11. 2026) sada krycí list volala bez verze (0 řádků — slepé místo), PROJ, Kompletní
  náhled podkladů a cizí jazyky SoD vůbec nepočítala; rozšíření svěřené K56-1 (`podklady/kola/STAV_KOLO56.md`),
  doplněné K56-D (náhled po blocích, `docx-en/de`, `vz:*`, kontrola sady, `--pd-webhook`).
- Kalkulaci založenou webhookem Pipedrive (#733) pevná sada nevidí — průběh je v prohlížeči a na serveru;
  pokrývá ji volba `--pd-webhook` (výše). Zápis do Pipedrive (PV #597) dál jen ruční zkouška na dealu TEST.
- Krycí listy a SoD scénářů `vz:*` ze surové zakázky správně končí hlídačem (tisk jen z pohledu zákazníka);
  z pohledu řídícího se počítá jen plná moc (`pm-ridici`).
- Případ, který v jedné straně spadne chybou, se porovnává podle textu chyby (stejná chyba = shoda).
- Test nástroje: `nastroje/test_porovnej_sestaveni.sh` (statické kontroly kola).
