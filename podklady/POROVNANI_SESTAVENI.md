# Porovnání sestavení (S3, #611, 18. 11. 2026)

Návrh režie 18. 11. 2026, oddíl S3, a rozhodnutí J. V. téhož dne:

- **stupně kol:** (1) po každé dávce automat — `testovaci_kolo.sh` + porovnání sestavení,
  (2) cílená sada na změněnou oblast, (3) plné kolo cenových nabídek **jen před main a po nasazení**;
- **kolo main-před × main-po u rychlé cesty dělá koordinace nástrojem**, J. V. dostane tabulku rozdílů;
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
| ukázkové zakázky | smyšlené zakázky testovacího webu (`src/testdata.js`) | 12 |
| fuzz | generátor fuzz invariantů, semínko 20261110 (`--fuzz N`, výchozí 300) | 300 |

Porovnávaná pole: **cena celkem** (`cenaNabidkyOck`), **řádky** (sekce + příplatky), výsledek jádra
(`vypocet`, `vypocetZ`), **symboly CN** po klíčích (změněný × jen nový symbol), **text dokumentu**
(Word nabídky ze zkušební šablony, online náhled CZ/EN, řádky navíc, krycí list, specifikace, SoD)
a ostatní (Pipedrive, controlling CSV, snímek a výsledek zámku). Vše přes otisk sha256 —
**výstup nenese ceny ani texty**, jen počty, případy a pole. Běh trvá kolem 11 s (se sestavením).

Ceník: zkušební ceník testů (`src/zkusebni_cenik.js`), nebo `--cenik <soubor>` ve tvaru
`{cenik, cenikProj}` — **soubor patří mimo repozitář**, do výstupu nejde žádná jeho hodnota.

Kód: **0** shoda nebo jen očekávané rozdíly, **1** neočekávaný rozdíl, **2** chybné použití /
nejde postavit nebo spočítat.

## Rychlá cesta (main-před × main-po) — koordinace

```bash
git fetch origin main test
bash nastroje/porovnej_sestaveni.sh origin/main origin/test --max 60
```

1. Tabulku (skupiny, „Vzory rozdílů", případy) pošli J. V.
2. Ke každému vzoru rozdílu najdi dávku, která ho způsobila (`git log origin/main..origin/test -- <soubor>`),
   a zapiš ho do seznamu očekávaných rozdílů (vzor: `podklady/porovnani/ocekavane_main_test_2026-11-18.txt`).
3. Pusť znovu s `--ocekavane <soubor>`; kód 0 = mezi main a test jsou jen vysvětlené rozdíly.
   Vzor, který nemá vysvětlení, je nález — do main se nejde.

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

## Seznam očekávaných rozdílů

```
# komentář
<vzor případu>  <pole,pole|*>   # důvod
*            nahled-en           # C1 #582: nadpisy USAZENÍ OCK v EN
fuzz:*       cena-celkem,radky   # oprava ceny XY
k36:*        *                   # #550 zahraniční montáž můstků
```

Vzor: jméno případu, `*` = cokoli. Pole: klíč (`cena`, `radky`, `docx`, `nahled-en`, `sod`, …), skupina
(`cena-celkem`, `radky`, `vysledek`, `symboly`, `symboly-nove`, `dokument`, `ostatni`) nebo `*`.
Rozdíl případu je očekávaný, když každé jeho rozdílné pole pokryje některé pravidlo. Pravidlo, které nic
nepokrylo, se vypíše jako upozornění (kód nemění) — u rychlé cesty je to signál, že se čekaná změna
do sestavení nedostala.

## Meze

- Sada vidí jádro a generátory dokumentů ze `src/` — ne živý ceník, zveřejněné šablony Wordu
  ani prohlížeč. Ty dál hlídá plné kolo (stupeň 3) před main a po nasazení.
- Případ, který v jedné straně spadne chybou, se porovnává podle textu chyby (stejná chyba = shoda).
- Test nástroje: `nastroje/test_porovnej_sestaveni.sh` (statické kontroly kola).
