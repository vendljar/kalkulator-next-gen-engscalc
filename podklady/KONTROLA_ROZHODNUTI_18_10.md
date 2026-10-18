# Kontrola rozhodnutí J. V. z 16.–18. 10. 2026 — kód, příručka, EN/DE/FR (dávka V6)

- **Dávka:** V6 (zadání koordinace „ŘÍDÍCÍ 16.10“, session_011B3ruyPigNEMSUdesbk4Hd), větev
  `claude/v6-kontrola-rozhodnuti` nad `origin/claude/integrace-16-10` (`0dbec56`, v17.10.5), verze **v18.10.5**.
- **Vzor:** `podklady/KONTROLA_ROZHODNUTI_16_10.md` (dávka V4).
- **Zdroje rozhodnutí:** CHANGELOG v16.10.1–v17.10.5, `podklady/PREDAVKA_KOORDINACE_15_10.md`
  (rozhodnutí 16. 10., stav 17. 10.: překlad V4-1 schválen, S12 1A/2A/3A), roadmapa (#355, #356, #366,
  #367, #420–#425), `BEZPECNOST_MEZE.md`, audity kol 25 a 26.
- **Rozsah:** jen nálezy a drobné opravy (texty, překlady, příručka, roadmapa, meze). Změny chování nejsou.
  V3 (SoD EN/DE/FR, DPH, skladné, #157) a V5 (#380) běží souběžně — nekontrolovány.
- **Jak se kontrolovalo:** čtení kódu (`src/`, `src/ui/`, `netlify/`), `manual/obsah.json` (kapitoly
  i „Co je nového"), roadmapa, meze, audity; slovník `src/preklad.js` u všech textů, které jdou do
  cizojazyčných dokumentů.

**Sloupce EN / DE / FR:** aplikace **nepřekládá obrazovku** (UI je jen česky — viz CHANGELOG v17.10.2);
přeložené jsou jen dokumenty (nabídky OCK/PROJ, smlouvy). U nových textů obrazovky proto „n/a"
znamená: ověřeno, že text **do cizojazyčného dokumentu nejde** (štítek `noprint`, karta Schvalování,
kontroly před nabídkou, krycí list jen CZ). „✓" = text, který do dokumentu jde, má heslo EN/DE/FR.

## Souhrn

| | Počet |
|---|---|
| Rozhodnutí zkontrolováno | 12 |
| Nové texty obrazovky v16.10.x–v17.10.x prověřené na únik do dokumentu | 6 |
| Nálezy | 10 (V6-1 až V6-10) |
| Opraveno v této dávce | 9 (V6-1 až V6-7, V6-9, V6-10) |
| Předáno | 1 (V6-8) |

## Rozhodnutí J. V. 16.–18. 10. 2026 × kód / příručka / EN / DE / FR

| # | Rozhodnutí (zdroj) | Kód | Příručka | EN | DE | FR | Stav | Nález |
|---|---|---|---|---|---|---|---|---|
| 1 | **S12** lešení v technické specifikaci + vlastní řádky v nabídce; odpovědi J. V. **1A, 2A, 3A** (jak je v kódu) — popisek „LEŠENÍ VNITŘNÍ PRO STAVBU OCK", „nabízeno jako příplatek", sekce DALŠÍ UJEDNÁNÍ za SOUČÁSTÍ DODÁVKY NENÍ | ✓ `tsLeseniNeniRadek` (`src/techspec.js`), `tsExtra` / `tsRadkyNavic` (`src/nabidka.js`), `docxRadkyNavic` | ✓ kap. 17, 23, Co je nového v16.10.x | ✓ | ✓ | ✓ | promítnuto (slovník: popisek lešení, „DALŠÍ UJEDNÁNÍ", „nabízeno jako příplatek", „zajistí objednatel v rámci SP") | **V6-3** (roadmapa #422 „ke schválení" → schváleno, opraveno) |
| 2 | **S13** cena dle nabídky, 8 předzaškrtnutých (návrh), platí až po zveřejnění ceníku | ✓ `CENIK_DLE_NABIDKY_VYCHOZI` (8 cest), `cenikDleNabidkyNavrh/DoplnNavrh`, `progKontext` | ✓ kap. 17 (podkapitola + krok pro správce), Co je nového | n/a (štítky `noprint`) / ✓ názvy všech 8 příplatků ve slovníku | n/a / ✓ | n/a / ✓ | promítnuto | — |
| 3 | **B179** příznak jen u příplatků, mapa pro zveřejnění z platného ceníku (J. V. 17. 10.) | ✓ `cenikDleNabidkySmi` (`^C\.priplatky\.`), `cenikDleNabidkyProZverejneni` | ✓ kap. 17, Co je nového v17.10.x | n/a | n/a | n/a | promítnuto | **V6-3** (#423 bez odkazu na B179, doplněno); **V6-4** (audit 26 „Rozhodnout J. V." bez zápisu, doplněno) |
| 4 | **Překlad V4-1** (rekapitulace PROJ: EZC, KOLAUDACE) schválen J. V. 17. 10. | ✓ hesla v `src/preklad.js` | ✗→✓ Co je nového (chyběl) | ✓ | ✓ | ✓ | promítnuto | **V6-1** (komentář „čeká na kontrolu"), **V6-5** (příručka) — opraveno |
| 5 | **V1 #366** číslo SoD = číslo nabídky s SOD místo CN, přípona varianty (.2) zůstává; J. V. 17. 10. potvrdil výklad | ✓ `sodCisloNavrh` (`src/zakazka.js`), `kryciZmrazSod`, `kryciProjZmrazSod`, `zamekPrvniSmlouva` | ✓ kap. 24, Co je nového; ✗→✓ starší novinka v15.10.14 „nic se nepředvyplňuje" | n/a (zdroj „návrh z čísla nabídky" jen v krycím listu = CZ; číslo SoD je evidenční kód, `prekladNeutral`) | n/a | n/a | promítnuto | **V6-6** (opraveno) |
| 6 | **A2 #355** přechodové plechy u můstků — výpočet beze změny, jen upozornit | ✓ pravidlo `mustkyPrechodove` (`src/kontroly.js`), upozornění, ne zábrana | ✓ kap. 11, Co je nového | n/a (kontroly před nabídkou jsou obrazovka) | n/a | n/a | promítnuto, roadmapa #355 hotovo | — |
| 7 | **O6 / B178** plocha pásu „jiné" v kartě, meze po ořezu; zbytek jako mez → B165 | ✓ `oplasteniPasyMeze` (`src/engine.js`), `vyjimkyPasyPlochy`; zbytek v17.10.5 `vyjimkyPlochyJadra`, server `ctx.jekly` | ✓ kap. 19, Co je nového v17.10.4 a v17.10.5 | n/a (karta Schvalování) | n/a | n/a | promítnuto; `BEZPECNOST_MEZE.md` B178 ✓, #424 hotovo | — |
| 8 | **B165** karta: použitá vs. ceníková sazba, dopad v % a Kč (J. V. 16. 10.) | ✓ `vyjimkyDopad`, `vyjimkyDopadText` (`src/ui/schvalovani_ui.js`), obchodník čísla nevidí | ✓ kap. 19, Co je nového v17.10.5 | n/a | n/a | n/a | promítnuto | — |
| 9 | **#425** vlastní schválení výjimky = budoucí bod (J. V. 18. 10.: „zatím ponechat") | ✓ beze změny (`vyjimkyServerKontrola` hlídá právo, ne osobu) | n/a (příručka obchodníka) | n/a | n/a | n/a | roadmapa #425 ✓; ✗→✓ `BEZPECNOST_MEZE.md`, audit 25, roadmapa #420 | **V6-2** (opraveno) |
| 10 | **#356** střecha přes můstek — jen návrh, rozhodne J. V. 19. 10. | ✓ v kódu NENÍ (revert 63c0f75; `ZASTŘEŠENÍ ŠACHTY (EXT)` beze změny, kód jen ve větvi `claude/a2-356-navrh`) | ✓ příručka nic neslibuje (kap. 11 jen #355) | n/a | n/a | n/a | roadmapa #356 `ceka` s odkazem na návrh ✓ | — |
| 11 | **#367** platební podmínky — odloženo na 19. 10. | ✓ beze změny | ✓ beze změny | n/a | n/a | n/a | roadmapa #367 `ceka`, „ODLOŽENO" ✓ | — |
| 12 | **B163** (A1, v16.10.4) údaje zmocnitele plné moci volné po tisku SoD | ✓ `zamekKryciPolePlnaMoc` (`src/zamek.js`) | ✗→✓ kap. 8 a 24 a novinky v15.10.14 tvrdily „po SoD zamčený celý" | n/a (plná moc jen CZ) | n/a | n/a | promítnuto | **V6-7** (opraveno) |

## Nové texty obrazovky z v16.10.x–v17.10.x × EN / DE / FR

| Text | Kde | Do dokumentu? | EN / DE / FR |
|---|---|---|---|
| Kontrola před nabídkou „Můstky a přechodové plechy" (#355) | `src/kontroly.js` `mustkyPrechodove` | ne — seznam kontrol na obrazovce, tisk nezastaví | n/a (jako ostatní kontroly) |
| Karta výjimky B165 (sazby, dopad %, Kč, plocha m², světlíky) | `src/ui/schvalovani_ui.js` | ne — záložka Schvalování | n/a |
| Rozsah pásu B155 („stěna B (Deska, 0–1 m)") | `src/vyjimky.js` `vyjimkyPasRozsah` | ne — karta výjimky | n/a |
| Štítky „cena dle nabídky", „vlastní cena" | `src/ui/kalk_ock.js` (`pill … noprint`) | ne — třída `noprint` | n/a |
| Sloupec a hlášky „Cena dle nabídky" v Nastavení → Ceník, rozpis zveřejnění (B180) | `src/ui/cenik_ui.js`, `src/cenik.js` `cenikDleNabidkyRozpis` | ne — správa ceníku | n/a |
| Zdroj „návrh z čísla nabídky" u Čísla SoD | `src/kryci.js`, `src/kryci_proj.js` | jen krycí list (jen CZ); do SoD jde samotné číslo | n/a |

Texty, které do dokumentů jdou, mají hesla: lešení a DALŠÍ UJEDNÁNÍ (S12), osm příplatků „cena dle
nabídky" (názvy v nabídce OCK), EZC a KOLAUDACE (V4-1).

## „Co je nového" v příručce × verze v16.10.1–v17.10.5

| Verze | Obsah pro uživatele | V příručce před V6 | Po V6 |
|---|---|---|---|
| v16.10.1 | B155 rozsah pásu v kartě, výjimky s pásem „jiné" schválit znovu | ✗ (jen kap. 19) | ✓ |
| v16.10.2 | lešení ve specifikaci, vlastní řádky v nabídce | ✓ | ✓ |
| v16.10.3 | cena dle nabídky | ✓ | ✓ |
| v16.10.4 | B163 plná moc po SoD volná (ostatní B158–B166 neviditelné pro obchodníka) | ✗ | ✓ |
| v16.10.5 | V4-1 rekapitulace PROJ EN/DE/FR | ✗ | ✓ |
| v17.10.1 | B180 rozpis zveřejnění ceníku se změnami příznaků (správce) | ✗ | ✓ |
| v17.10.2 | návrh čísla SoD, zámek po tisku SoD | ✓ | ✓ |
| v17.10.3 | upozornění na přechodové plechy (#356 do kódu nešel) | ✓ | ✓ |
| v17.10.4 | B178, B179 | ✓ | ✓ |
| v17.10.5 | B165 karta, plocha pásu a světlíky | ✓ | ✓ |

Nadpisy sekcí říkaly jen poslední verzi skupiny („v17.10.4", „v16.10.5"), ačkoli obsahovaly i starší
verze — nově „ve verzích v17.10.1–v17.10.4" a „ve verzích v16.10.1–v16.10.5". Verze příručky
v18.10.5 (`manual/sestav.sh` hlídá shodu s `verze.txt`). Snímky příručky se přegenerují při integraci.

## Nálezy

| ID | Vážnost | Kde | Nález | Oprava | Stav |
|---|---|---|---|---|---|
| **V6-1** | nízká (evidence) | `src/preklad.js` u hesel EZC a KOLAUDACE | Komentář „NÁVRH PŘEKLADU — čeká na kontrolu J. V.", J. V. ho schválil 17. 10. | Komentář „schválil J. V. 17. 10. 2026". | **OPRAVENO** |
| **V6-2** | nízká (evidence) | `BEZPECNOST_MEZE.md` B165, audit kola 25 (souhrn a řádek B165), roadmapa #420 | B165 část 2 vedená jako „otevřeno, rozhodne J. V." — J. V. 18. 10. rozhodl „zatím ponechat", budoucí bod #425. #420 zůstával `ceka`, ač podmínka „opraveno, nebo vědomá mez s rozhodnutím" je splněná. | Zápis rozhodnutí a odkaz #425; #420 → hotovo (v17.10.5). | **OPRAVENO** |
| **V6-3** | nízká (evidence) | roadmapa #422, #423 | #422 nesl „výchozí volby ke schválení" (J. V. 17. 10.: 1A, 2A, 3A — schváleno); #423 nezmiňoval B179 (jen příplatky). | Doplněno. | **OPRAVENO** |
| **V6-4** | informativní | `podklady/AUDIT_2026-10-17_v16.10.5.md`, Doporučený postup bod 2 | „Rozhodnout J. V." u B178/B179 bez zápisu rozhodnutí 17. 10. | Doplněno rozhodnutí a verze provedení. | **OPRAVENO** |
| **V6-5** | nízká (příručka) | `manual/obsah.json`, Co je nového | Chyběly novinky v16.10.1 (B155), v16.10.4 (B163), v16.10.5 (V4-1), v17.10.1 (B180); nadpisy neříkaly rozsah verzí. | Čtyři odrážky, nadpisy s rozsahem, verze příručky v18.10.5. | **OPRAVENO** |
| **V6-6** | nízká (příručka) | `manual/obsah.json`, novinky v15.10.14 | „Číslo SoD … nic se nepředvyplňuje" — od v17.10.2 neplatí. | Odkaz na návrh od v17.10.2. | **OPRAVENO** |
| **V6-7** | nízká (příručka) | `manual/obsah.json` kap. 8, kap. 24 (Plná moc), novinky v15.10.14 | „Po vytištění smlouvy o dílo je krycí list zamčený celý" — od v16.10.4 (B163) kromě údajů zmocnitele plné moci. | Doplněna výjimka na všech třech místech. | **OPRAVENO** |
| **V6-8** | nízká (evidence) | roadmapa #157, `detail` | Začátek detailu nese rozhodnutí 16. 10. (překlad české šablony), ale pokračuje původní větou „Potřeba: anglické znění šablon … od právníka — aplikace si právní text nesmí vymýšlet. Po dodání …" — dvě protichůdná zadání v jedné položce. | Při uzavření #157 v dávce V3 přepsat detail na nový postup. V6 needitovala (souběh s V3). | předáno koordinaci / V3 |
| **V6-9** | informativní | V4-5 (registr dokumentů) | Nález V4-5 („Krycí list – Backoffice / Techdata" místo „Krycí list zakázky OCK – …") byl dál otevřený. | Název v `src/kryci.js` sjednocen; test `src/test_kryci_docx.js` +2 (před opravou 55/2, po ní 57/0). Jen text, chování beze změny. | **OPRAVENO** (uzavírá V4-5) |
| **V6-10** | nízká (evidence) | roadmapa #425 | Odložená položka (vlna F) bez `cekaNa` → stránka roadmapy „bez uvedeného důvodu", `overit_roadmapu.mjs` 12/1 (už nad `0dbec56`). | Doplněn důvod podle rozhodnutí 18. 10.; 13/0. | **OPRAVENO** |

## Testy

- `src/test_kryci_docx.js` +2 kontroly (V6-9): před opravou **55 OK / 2 FAIL**, po ní **57 / 0**.
- Ostatní opravy jsou text komentáře, dokumentace, roadmapa a příručka — bez testu (nemění chování).
- `python3 build.py --kontrola-verze` čistá, `python3 roadmapa/roadmapa.py --kontrola` 425 položek bez
  nálezu, `python3 nastroje/kontrola_udaju.py` čistá.
- `./spust_testy.sh --smoke` (bez KNG_PODKLADY): **259 prošlo / 0 selhalo / 6 přeskočeno** (265 sad).
  První běh hlásil `overit_roadmapu.mjs` 12/1 — roadmapa #425 (vlna F) bez `cekaNa`, selhání už nad
  `0dbec56`; doplněn důvod odkladu, 13/0 (nález **V6-10**, opraveno).
- Mutace: nespuštěny — změna v `src/kryci.js` je jen text názvu v registru, test ho hlídá přímo
  (pojistka 55/2).
