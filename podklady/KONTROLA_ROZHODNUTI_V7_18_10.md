# Kontrola rozhodnutí J. V. z 16.–18. 10. 2026 — SoD, DPH, skladné, #380, #425, B183 (dávka V7)

- **Dávka:** V7 (zadání koordinace „ŘÍDÍCÍ 18.10“, session_0144Y7gXWeprriv4yf4wKL5T), větev
  `claude/v7-kontrola` nad `origin/claude/integrace-16-10` (`8480133`, v18.10.11), verze **v18.10.14**.
- **Vzor:** `podklady/KONTROLA_ROZHODNUTI_18_10.md` (V6), `…_16_10.md` (V4). V6 nekontrolovala V3 a V5 —
  to dělá tato dávka.
- **Zdroje rozhodnutí:** `podklady/PREDAVKA_KOORDINACE_15_10.md` (rozhodnutí 16. 10., předání 18. 10.),
  CHANGELOG v18.10.7, v18.10.8, v18.10.11, `PREDAVKA.md` (V3, V3b, V5), `podklady/SOD_EN_KONTROLA.md`,
  roadmapa (#157, #355, #366, #380, #420, #425, #427), `BEZPECNOST_MEZE.md`, audit kola 27.
- **Rozsah:** jen nálezy a drobné opravy textů. Změny chování žádné.

**Sloupec EN/DE/FR:** obrazovka je jen česky; „✓“ = text, který jde do cizojazyčné smlouvy, má heslo
EN/DE/FR ve slovníku (`src/preklad.js`, ověřeno `tr()` pro všechny věty), „n/a“ = do dokumentu nejde.

## Souhrn

| # | Rozhodnutí | Kód | Příručka | EN/DE/FR | Roadmapa |
|---|---|---|---|---|---|
| 1 | Režim DPH ve SoD volbou, výchozí podle DIČ (CZ / EU / mimo EU) | OK (`kryciDphRezimVychozi`: prázdné, CZ, mimo EU → česká DPH; EU vč. EL/GR → reverse charge EU; `sodDphSymboly`) | **V7-1 opraveno** (kap. 24 neuváděla mimo EU) | ✓ 3 věty režimu + 2 věty odst. 3 | OK (#157) |
| 2 | Skladné z Nastavení → Firma, kurzem EUR | OK (`sodSkladne`: CZ „N,- Kč“, jinak `mena.na` celá eura nahoru; bez částky `{{…}}`) | **V7-2 opraveno** (kap. 24 bez přepočtu a bez `{{SOD_SKLADNE}}`; Co je nového v18.10.7 OK) | ✓ místo `[[SKLADNE]]` ve slovnících šablon | OK (#157) |
| 3 | SoD v DE/FR vedle EN, jazyk tisku, zábrana bez šablony | OK (`sodJazykZabrana` v `src/ui/sod_ui.js` — serverová i místní cesta; plná moc jen CZ) | **V7-3 opraveno** („zkontrolovaný rodilými mluvčími“ — kontrola teprve čeká; nadpis jen „v angličtině“) | ✓ | OK (#157) |
| 4 | #380 varianta B — SoD projekce v4, jen nabízené činnosti, bloky CIN_* | OK (`SODP_CINNOSTI`, `sodProjRozsahText`, výčet v jazyce smlouvy) | OK (kap. 24, Co je nového v18.10.8 a v18.10.11) | ✓ 7 názvů (zaměření přes `preklad` u činnosti) | **V7-4 opraveno** (chyběl `hotovoV`, verze v18.10.3 → v18.10.8, EN/DE/FR v4) |
| 5 | #425 budoucí bod — vlastní schválení výjimky | OK — beze změny (`vyjimkaSmiRozhodnout` hlídá jen právo) | n/a | n/a | **V7-5 opraveno** (`kde` uváděl neexistující `netlify/lib/vyjimky_server.mjs`, razítko `pozadalEmail` → `pozadal`) |
| 6 | B183 — znění meze zaokrouhlení plochy (celé m²) | **V7-6 opraveno** (komentář `vyjimkyPlochyJadra` „nejvýš ±0,5 m²“) | **V7-6 opraveno** (kap. 19 a Co je nového v17.10.5 „o půl m² a víc“) | n/a | OK (`BEZPECNOST_MEZE.md` už správně „< 1 m²“) |
| 16.10/1 | #355 jen upozornění | OK (`mustkyPrechodove`, ne zábrana) | OK (kap. 11) | n/a | OK |
| 16.10/4 | #366 číslo SoD z řady, přepis | OK (`sodCisloNavrh`, zámek po tisku) | OK (kap. 24) | n/a | **V7-7 opraveno** (otázka výkladu — odpovídá příkladu J. V.; otevřená jen přípona .2) |
| 16.10/3 | B165 karta schvalovatele | OK (sazby, dopad %, Kč) | OK (kap. 19) | n/a | OK (#420) |

## Opravy (jen texty)

- **V7-1** příručka kap. 24: zákazník mimo EU → předvyplní se česká DPH, režim zvolí obchodník.
- **V7-2** příručka kap. 24: skladné česky v Kč, cizojazyčně v eurech kurzem ceníku (celá eura nahoru);
  bez částky `{{SOD_SKLADNE}}`.
- **V7-3** příručka kap. 24: nadpis „…v angličtině, němčině a francouzštině“; překlad „před zveřejněním
  ho kontrolují rodilí mluvčí“ místo „zkontrolovaný“; věty DPH a výčet činností v4 v jazyce smlouvy.
- **V7-4** roadmapa #380: `hotovoV` „v18.10.8 …, EN/DE/FR v4 v18.10.11“, číslo verze Q7.
- **V7-5** roadmapa #425: správné soubory a název razítka.
- **V7-6** B183 volba (a): `src/vyjimky.js` komentář, `netlify/test_vyjimky.mjs` komentář, příručka
  kap. 19 + Co je nového v17.10.5 — nekrytý nárůst až těsně pod 1 m² (2,50 → 3,49 m² = týž obsah).
- **V7-7** roadmapa #366 `otazka`.
- `podklady/SOD_EN_KONTROLA.md`: v tabulce souborů chyběla SoD projekce v4 EN/DE/FR (V3b).
- `PREDAVKA.md`: dva osiřelé nadpisy po slučování (V3 v18.10.7 nad B168, V3 v18.10.1) odstraněny.

## Nálezy pro další dávku (změna chování — jen návrh)

- **V7-N1 (B183 volba c):** karta Cenové výjimky ukazuje plochu na setiny (`m2`), schválení drží celé m².
  Návrh: v kartě vedle plochy „(schvaluje se 3 m²)“ nebo plochu na celé m² — `src/vyjimky.js:346`,
  `src/ui/schvalovani_ui.js`. Obsah výjimky beze změny, takže schválení neshodí.
- **V7-N2 (účetní, už v SOD_EN_KONTROLA bod 1):** výchozí režim podle DIČ nezohledňuje místo stavby —
  u prací na nemovitosti je místem plnění místo nemovitosti, takže u stavby v ČR a zákazníka z EU
  může jít o českou DPH (případně § 92e). Čeká na účetní; kód beze změny.
