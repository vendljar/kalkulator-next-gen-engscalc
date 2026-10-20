# Předávka — 20. 10. 2026: Controlling (návrh + dávka C1), větev `claude/controlling-navrh`

Nad `test` (`5dc28d1`, v20.10.1). Do `test` / integrace nic — slučuje koordinace
(session_01Ln2mMn7iC6W9ECztHTJpZe). C1 v kódu.

- **Hotovo:** rozbor rozvržení nákladů A. Mácové × ceník a výpočet, návrh Nastavení → Controlling
  (číselník skupin, mapování klíčů, hlídání nezařazených, export předkalkulace XLSX/CSV), dávky C1–C4,
  otázky J1–J11 a A1–A6 → `podklady/CONTROLLING_NAVRH_20_10.md`; roadmapa #447 (předběžné id, `ceka`).
- **Artefakt pro J. V.:** https://claude.ai/artifact/MNaTnXQ4847f2rNiAT9br7
- **Čeká se na:** pokyn J. V. k C2. A. Mácová je mimo do prosince (A1–A6 počkají).
- **Rozhodnutí J. V. J1–J11 zapsaná** (podklad, oddíl Rozhodnutí). **C1 hotová** (f377c80): src/controlling.js,
  /api/controlling, záloha/obnova, testy + mutace #447 11/11, kolo --bez-mutaci zelené.
- **Další krok:** C2 (UI Nastavení → Controlling + upozornění při zveřejnění ceníku + export varianty) — na pokyn J. V.
- **Ke slučování:** `roadmapa/roadmap.json` (#447 za #437), CHANGELOG oddíl „(bez verze) — C1“ (verzi přidělí
  koordinace), `netlify/mutace.mjs` (blok #447 + opravené dvě mutace #401 v obnově), `obnova.mjs`/`zalohovani.mjs` (část controlling).

---

# Předávka — 19. 10. 2026: dávka W1 (v19.10.9), větev `claude/w1-sablona-proj-v6` — šablona Wordu PROJ v6

Nad `claude/v8-367-firma` (v19.10.7, `4d9f67a`). Do integrace / `test` nic — slučuje koordinace
(session_017KEALG3ppimL5fW2XswzrB). Podrobnosti a postup pro J. V.: `podklady/W1_SABLONA_PROJ_V6.md`,
CHANGELOG v19.10.9, roadmapa #434 (předběžné id).

- **Hotovo:** `nastroje/vyrob_sablony.js --proj-v6` (v5 → v6 + EN/DE/FR): CENA NEZAHRNUJE, POŽADOVÁNO OD
  INVESTORA, TERMÍNY ze symbolů Firmy (řádek tabulky za odrážku, termíny dvojice `PROJ_TERMINY_CINNOST/_TERMIN`),
  bloky `BLOK_*_ZAC/KON`, nový blok DOLOŽKY. `src/docxgen.js` rozvíjí řádky i pro texty PROJ (skupiny symbolů),
  `src/nabidka_proj.js` nové symboly termínů, popis v Nastavení. Test `src/test_sablona_proj_v6.js`
  (35 se skutečnou v5 / 30 bez ní), mutace „W1: …“ (11) v `mutace_jadro.mjs`, `nabidka_proj.js` v JADRA.
- **Šablony v6** vyrobené ze skutečné v5 (Disk, složka „Sablony“): v sezení `podklady/sablony_vystup/` (gitignore),
  poslané J. V. jako soubory sezení; **na Disk nenahrané** (konektor neunese 1 MB base64) — J. V. je nahraje
  do složky „Sablony“ sám, nebo je vyrobí příkazem z podkladu.
- **Ke slučování:** CHANGELOG / `verze.txt` / `manual/obsah.json` — O4 má v19.10.8, nechat oddíly všech, novější nahoru.
  `mutace_jadro.mjs` (JADRA + blok W1 za #367b), `src/docxgen.js` (DOCX_RADKY_ZA_RADEK, exporty).
- **Kolo `--bez-mutaci`:** 277 / 0 / 6 přeskočeno, statické 3/3; mutace W1 11/11.
- **Nahrání v aplikaci až po nasazení v19.10.9** (starší aplikace nové symboly nezná).

# Předávka — 19. 10. 2026: dávka O4 rozšíření (v19.10.8), větev `claude/o4-zalohy` — #151 N5 retence + N6 kopie na Disk

# Předávka — 19. 10. 2026: dávka V8 (v19.10.6 + v19.10.7), větev `claude/v8-367-firma` — #367 platební podmínky z Nastavení → Firma

Nad `origin/claude/integrace-16-10` (`e3995e6`). Do integrace / `test` / `main` nic — slučuje koordinace
(session_017KEALG3ppimL5fW2XswzrB). Návrh a náhled: `podklady/367_NASTAVENI_FIRMA_NAVRH.md`,
https://claude.ai/artifact/UZC5zQB14xBBvkN1MMdnPE. Podrobnosti: CHANGELOG v19.10.6 a v19.10.7, roadmapa #367.

- **Rozhodnutí J. V. 19. 10.:** varianta B, „z kódu vše převést do Firma“; Q1–Q6 podle doporučení
  (Q4 rozhodnuto J. V. „Nedovolit zveřejnit“ — `PODMINKY_SOUCET_BLOKUJE = true` v `src/podminky.js`).
- **Větev obsahuje integraci `4cc1b81` (v19.10.5: A2, O3, H2, O4)** — sloučeno 19. 10.; FR kapitoly mají `{TERMIN}`,
  doplnění výchozích textů (O3) zahrnuje i FR.
- **v19.10.6 (a):** `src/podminky.js` (továrna = dnešní hodnoty, sloučení s Firmou při čtení po polích),
  krycí listy OCK/PROJ bez literálů platebních podmínek, zveřejnění + serverová kontrola, Nastavení →
  Smlouvy / Šablony: společný blok + přepínač OCK | PROJ (`src/ui/podminky_ui.js`), filtr šablon.
- **v19.10.7 (b):** věty kalendáře nabídky OCK a splátek SoD realizace v CZ/EN/DE/FR (cizí výchozí = slovník),
  texty nabídky PROJ z Firmy (+ symboly `PROJ_*`), doložky PROJ prázdné a vypnuté, rozšíření (typ smlouvy,
  Cena nezahrnuje, licence, pojištění), kap. V. bez věty o záruce, FR výchozí kapitoly IV.–VI.
  (`podklady/367_PREKLADY_KONTROLA.md`).
- **Testy:** `test_podminky.js` 74, `test_podminky_texty.js` 50, `overit_podminky_firma.mjs` 26,
  `test_funkce` +4; pojistky doloženy v commitech; mutace #367 jádro 18/18, server 2/2.
- **Výchozí volby (J. V. se neptal):** plán plateb PROJ jen na kartě PROJ; platnost nabídky ve společném
  bloku; procenta zádržného se zamčené variantě z Firmy nedoplní; neplatné uložené pole → továrna;
  texty PROJ cizí znění platí jen se stejným počtem řádků jako čeština.
- **Meze:** Word šablona PROJ (v3–v5) má texty nabídky pevně — symboly `PROJ_CENA_NEZAHRNUJE` atd. čekají
  na novou šablonu; plné mutační kolo neběželo (jen cílené); harnessy s `KNG_PODKLADY` přeskočeny.
- **Při slučování s O3 (`claude/o3-kapitoly-vychozi`):** CHANGELOG, `verze.txt`, `manual/obsah.json`,
  roadmapa #367, `src/firma.js` (DEFAULT_FIRMA — FR kapitoly + kap. V bez záruky; O3 TD1 přidává `{TERMIN}`
  do kap. V — doplnit i do FR), `src/ui/nastaveni_ui.js` (nastSmluvniStandardy vs. nastKapitolyNabidky).
- **Další krok:** sloučení do integrace; šablona Wordu PROJ se symboly textů; kontrola
  překladů rodilými mluvčími; releasy v19.10.6/v19.10.7 až po sloučení.

# Předávka — 19. 10. 2026: dávka O4 (v19.10.5), větev `claude/o4-zalohy` — #151 opravy zálohování N1–N4

N1–N4 (v19.10.5, `f07d650`) jsou v integraci (`4cc1b81`); ta je sloučená do `claude/o4-zalohy` a nad ní je rozšíření
N5+N6 jako **v19.10.8** (v19.10.6–7 = V8 #367). Do integrace / `test` nic — slučuje koordinace
(session_017KEALG3ppimL5fW2XswzrB). Podklad `podklady/151_ZALOHOVANI_KONTROLA_2026-10-19.md`, oddíl 9 (doplněk
a postup prvního běhu). CHANGELOG v19.10.8, roadmapa #151a (N5), #151b (N6) hotovo v19.10.8.

- **N5 retence (J. V. 19. 10.):** noční 30 dní + první v měsíci 12 měsíců zpět, vynucené 90 dní, před obnovou nikdy;
  `retenceProved` v `zaloha_nocni` až po úspěšném otisku, nikdy nejnovější, log klíčů. **Pojistka (koordinace):**
  maže jen při záznamu kopie na Disk (`zalohy/kopie-disk`) mladším 7 dní, jinak log „retence čeká na první kopii na Disk“.
  **Staré zálohy do 19. 10. 2026 se nemažou nikdy** (J. V. ~13:20 UTC): `RETENCE_OD = '2026-10-20'`.
- **N6 kopie na Disk (J. V. 19. 10.):** prohlížeč správce → vlastní vybraná složka `_Zaloha Netlify DB` (IndexedDB
  `zalohaDisk`; `_DB` je od #150 vypnutá); `GET /api/zaloha?zdroj=nocni` (bez hesel a podpisů), `otisk_YYYY-MM-DD.json`
  + `posledni_kopie.json`; záznam na serveru → hlídka 14 dní všude; auto po 7 dnech jen s uděleným právem.
- **Testy:** `test_zalohy` 64/0, `src/test_kopie_disk.js` 10/0, `overit_online` 5c3; `--smoke` 274/0/6; mutace `zaloh` 50/50, `#151 N6` 11/11;
  pojistky v CHANGELOG v19.10.8.
- **Výchozí volby (J. V. se neptal):** 30 dní = věk 0–29; 12 měsíců = měsíc dneška + 12 předchozích, drží se nejstarší
  otisk měsíce; před obnovou se nemaže; pojistka retence platí trvale (bez čerstvé kopie retence stojí); kopie ze dne
  nočního otisku, bez nočního za 7 dní aktuální stav; jen Chrome/Edge; složka s jiným jménem projde s varováním.
- **Při slučování:** CHANGELOG / PREDAVKA / `verze.txt` / `manual/obsah.json` / `roadmap.json` (#151, #151a, #151b) /
  `netlify/mutace.mjs` (SADY + blok #151) / `overit_online.mjs` (5c3) / podklad 151 (oddíl 9).
- **Na J. V.:** první běh kopie na Disk po nasazení v19.10.8 (podklad oddíl 9) — do té doby retence nic nemaže;
  zálohy do 19. 10. 2026 nesmaže nikdy.

# Předávka — 19. 10. 2026: dávka H2 (v19.10.4), větev `claude/h2-drobnosti` — V7-N1, B191, B192

Nad `origin/claude/integrace-16-10` (`e3995e6`, v19.10.1). Do integrace / `test` nic — slučuje koordinace
(ŘÍDÍCÍ 19.10, session_017KEALG3ppimL5fW2XswzrB). Souběžně A2 (v19.10.2), O3 (v19.10.3). Podrobnosti: CHANGELOG
v19.10.4, `BEZPECNOST_MEZE.md` (B191–B193), roadmapa #433 (předběžné id, 431–432 nechány souběžným dávkám).

- **Hotovo:** V7-N1 — karta výjimky ukáže plochu na celé m² (`vyjimkyM2Schvaleni`, totéž zaokrouhlení jako obsah)
  s poznámkou „zaokrouhleno pro schválení“; B183 beze změny. B191 — `odstranPrazdneBloky` hází u nevyváženého bloku
  z `blokyPryc` (SoD projekce nevznikne). B192 — okno hesla správce od zadání, neprodlužuje se; mez o XSS zapsána.
- **Výchozí volby (J. V. se neptal):** poznámka jen u neceločíselné plochy; B191 chybou při generování (ne kontrolou
  při zveřejnění šablony); B192 okno neprodlužovat (víc dotazů na heslo při dlouhém nastavování).
- **Doporučení pro J. V.:** B191 navíc kontrolovat při zveřejnění šablony; B192 úplně — heslo nedržet (token od serveru).
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` / `manual/obsah.json` (verze, úvod) /
  `roadmap.json` (konec seznamu) / `mutace_jadro.mjs` / `netlify/mutace.mjs` (SADY + blok H2) / `BEZPECNOST_MEZE.md`.

# Předávka — 19. 10. 2026: dávka O3 (v19.10.3), větev `claude/o3-kapitoly-vychozi` — výchozí texty kapitol + TD1 {TERMIN}

Nad `origin/claude/integrace-16-10` (`e3995e6`, v19.10.1; v19.10.2 drží A2). Do integrace / `test` nic — slučuje
koordinace (session_017KEALG3ppimL5fW2XswzrB). Podrobnosti: CHANGELOG v19.10.3, roadmapa #431 (hotovo), #330 (TD1).

- **Hotovo (pushnuto):** `firmaDoplnVychoziTexty` po každém načtení firmy (import / `_nastaveni.json` přes
  `konfiguraceImport`, online firma v `online_ui.js`) doplní CHYBĚJÍCÍ klíče kapitol CZ/EN/DE (bílá listina,
  FR ne); `""` = vědomé vypuštění zůstává. Tlačítka „Doplnit výchozí text“ (pole) a „Doplnit všechny prázdné“.
  TD1: výchozí kapitola V. se značkou `{TERMIN}` (termín dodání zakázky s ATYP, přeložený); se značkou bez
  odrážky „Termín dodání“, bez termínu lhůta z Firmy / „dle dohody“; kontrola `terminAtyp` přepracovaná.
  Řešení TD1 schválil J. V. 19. 10. ~11:25 UTC (přes koordinaci).
- **Testy:** `test_kapitoly_vychozi` 51, `test_termin_kapitola` 39, `test_kontroly` +10; kolo nad 91f8111 VŠE
  ZELENÉ 271/0/6, statické 3/3; cílené mutace 43/43.
- **Po nasazení (J. V.):** Nastavení → Smlouvy / Šablony → Kapitoly nabídky zkontrolovat doplněné texty (kapitola V.
  nově se `{TERMIN}`) → Nastavení → Firma → Zveřejnit firemní údaje online. Starší text kapitoly V. s pevným
  číslem hlásí kontrola před nabídkou (radí značku).
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` / `roadmap.json` (#431 předběžné id) /
  `manual/obsah.json` / `src/firma.js` (V8 #367 sahá na Firmu) / `src/preklad.js` (heslo „dle dohody“).

# Předávka — 19. 10. 2026: dávka A2 dokončení (v19.10.2), větev `claude/a2-356` — #356 střecha přes nejvyšší můstek

Nad `origin/claude/integrace-16-10` (e3995e6, v19.10.1). Do integrace / `test` / `main` nic —
slučuje koordinace (ŘÍDÍCÍ 19.10, session_017KEALG3ppimL5fW2XswzrB). Podrobnosti: CHANGELOG v19.10.2.

- **Hotovo:** #356 podle rozhodnutí J. V. 19. 10. (A1 + B1 + C1 + D1 + E1, návrh
  https://claude.ai/artifact/9nMGAMnggiVEByuZoty9Qt) — kód převzatý cherry-pickem 75f9fd1
  z `claude/a2-356-navrh`; konflikt jen v `mutace_jadro.mjs` (blok #355 / #356). Příručka
  (kap. 11, Co je nového v19.10.2, záhlaví verze v19.10.2), roadmapa #356 → hotovo.
- **Testy:** test_mustky 53/6 → 59/0, test_kontroly 137/1 → 138/0 (37 pravidel), otisky
  test_profil_neznamy 30/0, fuzz 19/0; mutace jádra #356 5 (výsledek v CHANGELOG/souhrnu).
- **Při slučování:** konflikty v CHANGELOG / PREDAVKA / `verze.txt` / `manual/obsah.json`
  (Co je nového, záhlaví) / počet pravidel kontrol (37 v `src/test_kontroly.js`, `overit_lista.mjs`).
- **Větev `claude/a2-356-navrh`** je tím převzatá — po sloučení ke smazání (J. V.).
- **Další krok:** žádný — dávka A2 uzavřená.

# Předávka — 19. 10. 2026: dávka O2 (v19.10.1), větev `claude/o2-b189` — B189 výchozí režim DPH ve SoD realizace

Nad `origin/claude/integrace-16-10` (`62bd0b6`, v18.10.15). Do `test-draft` / `test` / `main` ani do integrace nic —
slučuje koordinace (session_0144Y7gXWeprriv4yf4wKL5T). Podrobnosti: CHANGELOG v19.10.1, `BEZPECNOST_MEZE.md` (B189),
`podklady/SOD_EN_KONTROLA.md` (oddíl „Výchozí režim podle DIČ“), roadmapa #430 (hotovo).

- **Hotovo (pushnuto):** rozhodnutí J. V. 19. 10. — DIČ CZ → přenesená (tuzemsko, § 92e), bez DIČ → česká DPH,
  DIČ EU i mimo EU → bez výchozí volby; bez režimu SoD realizace nevznikne (`sodDphZabrana` v `src/sod.js`:
  `sodData` hází → serverová i místní šablona; `dokumentZabrana('sod')` zhasne tlačítko; pod tlačítkem důvod
  + „Přejít na volbu režimu DPH“). Ruční volba přednost, uložená / zmrazená volba beze změny.
- **Věty:** nové nepřibyly (tuzemská věta existuje od v3, odlišná od čl. 196); znění předběžné do kontroly účetní,
  nové otázky (5) § 92e / „domestic reverse charge“, (6) věta pro zákazníka mimo EU se stavbou v ČR.
- **Testy:** `test_sod_en` 2c B189 (proti 62bd0b6 40/7 → 47/0); kolo nad 542d0ef VŠE ZELENÉ 274/0/1, statické 3/3;
  mutace B189 8/8 + 1/1, DPH 13/13, sod 28/28.
- **Výchozí volby (J. V. se neptal):** vlastní znění režimu = volba (tiskne se, symboly `{{…}}`); DIČ bez předpony
  CZ (jen číslice) = cizí → bez volby; zábrana jen SoD realizace (projekce a plná moc režim DPH nemají);
  `KRYCI_SOD_OPIS` beze změny (režim se při tisku nezmrazuje navíc — zamčená varianta drží zmrazené předvyplnění).
- **Mez:** smlouvy vytištěné před v19.10.1 bez uložené volby se při dotisku řídí novou výchozí volbou.
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` / `roadmap.json` (#430) / `mutace_jadro.mjs`
  (blok DPH/B189) / `netlify/mutace.mjs` (SADY + B189) / `BEZPECNOST_MEZE.md` / `manual/obsah.json`.
- **Další krok:** sloučení do integrace; J. V. předat účetní `SOD_EN_KONTROLA.md`; release v19.10.1 až po sloučení.

# Předávka — 18. 10. 2026: dávka O1 (v18.10.15), větev `claude/o1-b188` — B188 heslo u obnovy matice

Nad `origin/claude/integrace-16-10` (`cdca5f3`, v18.10.14). Do `test-draft` / `test` / `main` / integrace
nic — slučuje koordinace (session_0144Y7gXWeprriv4yf4wKL5T).

- **Hotovo:** B188 (#429) — `obnova.mjs` chce `potvrdHesloSpravce`, kdykoli by obnova zapsala matici
  (`obnovaNeseMatici`), u souboru, otisku i dávky; před zámkem a otiskem, fail-closed. UI obnovy: dialog
  a 10min paměť jako panel Zobrazení. Jiné cesty zápisu `program/zobrazeni` nejsou (jen `/api/zobrazeni`).
  Pokus AUDIT28 P3 → 401. Testy: `test_zobrazeni_heslo` 23/0 (před opravou 7 selhání), `test_obnova` 232/0,
  `overit_online` 238/0; mutace B188 (4), B77 obnovy přepsána na nový tvar podmínky.
- **Kolo `--jen build,sady,staticke`:** 270 prošlo / 0 selhalo / 2 přeskočeno (test.js mimo export, overit_manual
  bez firemního podkladu), statické 3/3. Mutace B188 4/4, B168 1/1, zobrazen 11/11, obnova 50/50 (66/66), `--kontrola` 524 úseků.
- **Výchozí volby (J. V. se neptal):** záloha s `zobrazeni: null` heslo nechce (nic se nezapíše); u otisku
  UI chce heslo vždy, když je část zaškrtnutá (obsah otisku klient nezná); `program`/`firma` beze změny (mez B168).
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` / `manual/obsah.json` (verze) /
  roadmapě (#429) / `netlify/mutace.mjs` / `BEZPECNOST_MEZE.md`.

# Předávka — 18. 10. 2026: dávka V7 (v18.10.14), větev `claude/v7-kontrola` — kontrola rozhodnutí 16.–18. 10.

Nad `origin/claude/integrace-16-10` (`8480133`, v18.10.11). Do `test-draft` / `test` / `main` / integrace
nic — slučuje koordinace (session_0144Y7gXWeprriv4yf4wKL5T). Výsledek: `podklady/KONTROLA_ROZHODNUTI_V7_18_10.md`.

- **Hotovo (pushnuto):** 9 rozhodnutí × kód / příručka / EN-DE-FR / roadmapa; opravy jen textů V7-1 až V7-7
  (příručka kap. 19 a 24, komentář B183 v `src/vyjimky.js`, roadmapa #366, #380, #425, SOD_EN_KONTROLA).
- **Nálezy pro další dávku:** V7-N1 karta výjimky ukazuje setiny m², schválení drží celé m² (B183 c);
  V7-N2 výchozí DPH podle DIČ × místo stavby (účetní).
- **Testy:** smoke 266/0/6 přeskočeno (firemní podklady); kontroly verze, roadmapy, mutací čisté.
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` / `manual/obsah.json` / roadmapě.

# Předávka — 18. 10. 2026: dávka N4 (v18.10.12), větev `claude/kolo28-audit` — kolo 28 + audit v17.10.5 → v18.10.11

Nad `origin/claude/integrace-16-10` (`8480133`, v18.10.11). Do `test-draft` / `test` / `main` ani do integrace nic —
slučuje koordinace (session_0144Y7gXWeprriv4yf4wKL5T). Podrobnosti: `podklady/AUDIT_2026-10-18_v18.10.11.md`,
CHANGELOG v18.10.12, `BEZPECNOST_MEZE.md` (oddíl „Audit kola 28“).

- **Hotovo (pushnuto):** audit — 0 kritických/vysokých, **2 střední** (B188 obnova matice bez hesla správce,
  B189 výchozí DPH podle DIČ), B190 nízký **opraven** (skladné „1.500“ → „2,- Kč“; `sodSkladneKc`, test
  `test_sod_en` 2c, mutace B190 1/1), B191–B193 informativní; pokusy `podklady/AUDIT28_pokus_*.mjs`.
- **Testy:** kolo nad 8480133 268/2/2 (obě selhání = podklad B193), po opravě 270/0/2, statické 3/3.
- **Čeká (další dávka):** #429 B188 (heslo u obnovy části `zobrazeni`), #430 B189 (rozhodnutí J. V. / účetní —
  návrh: CZ DIČ → přenesená, EU/mimo EU bez výchozí volby). Před zveřejněním SoD realizace v3 upozornit J. V. na B189.
- **Výchozí volby (J. V. se neptal):** B188/B189 neopraveny (střední); B190 fail-closed (nejednoznačný zápis
  → symbol zůstane); B193 jen popsán (harnessy beze změny).
- **Podklady:** šablony z Disku mimo repo; PROJ v3 musí pod jménem `Sablona_NABIDKA_PROJ.docx` (B193);
  SoD realizace v3 a projekce v4 vyrobit `nastroje/vyrob_sablony.js --sod-real-v3 / --sod-proj-v4`.
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` / `roadmap.json` (#428–#430) /
  `mutace_jadro.mjs` (mutace B190) / `BEZPECNOST_MEZE.md`.

# Předávka — 18. 10. 2026: dávka H1 (v18.10.13), větev `claude/h1-hygiena` — hygiena B171, B174, B175, B186, B187

Nad `origin/claude/integrace-16-10` (`8480133`). Do `test-draft` / `test` / `main` ani do integrace nic —
slučuje koordinace (session_0144Y7gXWeprriv4yf4wKL5T; integrace je mezitím na v18.10.14, bere se vyšší verze).
Podrobnosti: CHANGELOG v18.10.13, `BEZPECNOST_MEZE.md` (B171, B174, B175, B186, B187), roadmapa #427 (hotovo).

- **Hotovo (pushnuto):** B171 nápověda + věta u Odhlásit; B174 noční úklid `pd_cache` (`netlify/lib/uklid.mjs`,
  volá `zaloha_nocni.mjs`); B175 serverová očista klíčů analytiky + jednorázová noční očista dnů (značka
  `ocista-b175`); B186 převod čísel textem v `importZakazka` (`zadaniCislaZTextu`); B187 oblast v `overit_xss.mjs`.
- **Výchozí volby (J. V. se neptal):** UI jen česky (rozhraní se nepřekládá), bez potvrzovacího okna u odhlášení;
  lhůta cache Pipedrive 30 dní (`PD_CACHE_UKLID_DNU`), záznam bez stáří se maže; převod jen čísel s desetinnou
  tečkou — čárka dál 400 (B134/B137), nečíselný text zůstává; příručka beze změny (kap. 1 to už uvádí).
- **Testy:** mutace H1 14/14 (B171 2, B174 4, B175 4, B186 4), `--kontrola` 534/534; overit_xss 383/0
  (pojistka 379/4); kolo `--jen build,sady,staticke`: sady 270/4/1 přeskočeno (test.js), statické 3/3.
  `overit_roadmapu` padal kvůli #427 ve vlně F (= odloženo) — opraveno na vlnu B, 13/0. Zbylá 3 selhání jsou
  z podkladů mimo repo: `test_sablona_proj_v4.js` (37/4) a `overit_nabidka_proj_word.mjs` dostaly srpnovou
  `Sablona_NABIDKA_PROJ.docx` (na Disku je v5 z 14. 10.), `overit_manual.mjs` příručku v25.9.3 (novější na Disku
  není) — H1 se PROJ šablon ani příručky nedotýká.
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` / `roadmapa/roadmap.json` (#427) /
  `netlify/mutace.mjs` (SADY + 14 mutací) / `BEZPECNOST_MEZE.md` / `overit_xss.mjs`.
- **Další krok:** sloučení do integrace (koordinace).

# Předávka — 18. 10. 2026: dávka V3b (v18.10.11), větev `claude/v3b-sod-preklad` — mutace V3, činnosti SoD PROJ EN/DE/FR, šablony v4

Nad `origin/claude/integrace-16-10` (`0bf74e6`, v18.10.10) + sloučený doplněk V3 `817b378`. Do `test-draft` /
`test` / `main` nic — slučuje koordinace. Podrobnosti: CHANGELOG v18.10.11, `podklady/SOD_EN_KONTROLA.md`.

- **Hotovo (pushnuto):** 25 mutací dávky V3 v `mutace_jadro.mjs` (jádra + sod.js a nástroje šablon SoD),
  `--kontrola` 247/247, filtry 25/25; názvy činností SoD PROJ ve slovníku EN/DE/FR (zaměření u činnosti);
  šablony SoD projekce v4 EN/DE/FR + slovníky v4 = **přílohy sezení V3** (session_01GyotCYY7DhFnyXhceNA3de).
- **Nasazení (J. V.):** česká SoD projekce v4 (sezení V5), pak EN/DE/FR v4 z přílohy; realizace podle
  předávky V3 níž (Nastavení → Firma skladné, česká v3, pak jazykové).
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` / příručce / `mutace_jadro.mjs`.

# Předávka — 18. 10. 2026: dávka B168 (v18.10.6), větev `claude/b168-matice-heslo` — B168, B176, zápis nálezů 15. 10.

Nad `origin/claude/integrace-16-10` (`0dbec56`, v17.10.5). Do `test-draft` / `test` / `main` nic —
slučuje koordinace (session_011B3ruyPigNEMSUdesbk4Hd). Podrobnosti: CHANGELOG v18.10.6,
`BEZPECNOST_MEZE.md` (oddíl „Audit 15. 10. 2026“), roadmapa #426, #427.

- **Hotovo (pushnuto):** B168 — `POST /api/zobrazeni` chce `hesloSpravce` (401/429 `kod: 'hesloSpravce'`),
  klient `onlineZobrazeniPost` (dialog jako B77, heslo v paměti stránky 10 min, zrušení = hláška);
  B176 — `zobrazeniSmi` fail-closed pro neznámý klíč (admin vždy) + statická kontrola dotazovaných práv.
  Zápis B169–B177 a kolize B178 (15. 10. = B31, uzavřeno v15.10.14).
- **Testy:** pred_pushem 260/0/6 přeskočeno; mutace B168 1/1, B176 1/1, „zobrazen“ 10/10, B80 Pipedrive 1/1.
- **Výchozí volba (J. V. se neptal):** heslo k matici držet 10 min v paměti stránky (`ZOBRAZENI_HESLO_MS`).
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` / `roadmapa/roadmap.json`
  (#426, #427 předběžná id) / `netlify/mutace.mjs` (seznam SADY + 2 mutace) / `BEZPECNOST_MEZE.md` /
  harnessy `overit_*.mjs` (stub `dotazHeslo`). Nové sady/harnessy, které ukládají matici, musí posílat heslo.
- **Další krok:** #427 (B171, B174, B175) podle kapacity.

# Předávka — 18. 10. 2026: dávka V5 (v18.10.3), větev `claude/v5-sod-proj-rozsah` — rozsah díla SoD projekce (#380 Q7)

Nad `origin/claude/integrace-16-10` (`9bb7caf`, v17.10.4). Do `test-draft` / `test` / `main` nic —
slučuje koordinace (session_011B3ruyPigNEMSUdesbk4Hd). Podrobnosti: CHANGELOG v18.10.3,
`podklady/POSTUP_SABLONY_SOD_PROJ_V4_18_10.md`.

- **Hotovo (pushnuto):** `nastroje/vyrob_sablony.js --sod-proj-v4` (v3 → v4: `{{SODP_ROZSAH_DILA}}`
  ve větě přílohy, 7 činností čl. II a III ve značkách `{{CIN_<X>_ZAC/_KON}}`); builder
  `sodProjRozsah` (výčet plnými názvy, `blokyPryc`), generátor `odstranPrazdneBloky(…, blokyPryc)`;
  v3 funguje beze změny. Odkaz „odst. 5“ v čl. VII je správný (odst. 5 = potvrzení poštou) — beze
  změny, nástroj ho hlídá. Příručka kap. 24 + Co je nového v18.10.3, roadmapa #380 → hotovo.
- **Šablona v4:** vyrobená z v3 z Disku (ID 113i9u…), přiložená k sezení V5
  (`Sablona_SOD_PROJEKCE_v4.docx`, 124 302 B, sha256 b4ef4a91…); na Disk ani do aplikace nenahrána —
  udělá J. V. (postup v CHANGELOG / podklady).
- **Výchozí volby:** plné názvy činností (zkratky = jen `sodProjRozsahText`); IČ → IČ DOSS
  i povolení, EZČ → EZČ i výběr dodavatele (jako věty plateb staré šablony); studie / projednání /
  kolaudace / geodet do výčtu nepatří (šablona je v předmětu díla nemá); věta přílohy „na činnosti: …“.
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` / `roadmap.json` (#380) /
  `netlify/mutace.mjs` (SADY + mutace #380) / `manual/obsah.json` (Co je nového, kap. 24) /
  `src/docxgen.js` (odstranPrazdneBloky). Záhlaví „verze“ příručky jsem neměnil.
- **Navazuje V3:** po zveřejnění v4 přegenerovat EN/DE/FR z v4 (`nastroje/preklad_sod.js`).
- **Další krok:** žádný v této větvi — dávka uzavřená.

# Předávka — 18. 10. 2026: dávka V3 (v18.10.7), větev `claude/v3-sod-en` — režim DPH a skladné v SoD realizace v3

Rozhodnutí J. V. 18. 10. (přes koordinaci): DPH volbou v krycím listu OCK, skladné kurzem do měny smlouvy.
Verze v18.10.7 (přidělila koordinace). Symboly {{SOD_DPH_REZIM}}, {{SOD_DPH_PROHLASENI}}, {{SOD_SKLADNE}};
výchozí režim podle DIČ objednatele (CZ / bez DIČ / mimo EU → česká DPH, EU → reverse charge EU).

- **Hotovo (pushnuto):** `vyrob_sablony.js --sod-real-v3` (CZ v3 se symboly SOD_DPH_REZIM,
  SOD_DPH_PROHLASENI, SOD_SKLADNE); pole krycího listu „Režim DPH ve smlouvě“ (výchozí podle DIČ);
  Nastavení → Firma „Skladné … Kč za den“ (bez výchozího čísla); `sodDphSymboly`, `sodSkladne`, věty
  EN/DE/FR ve slovníku. Šablony realizace v3 CZ/EN/DE/FR + projekce v3 EN/DE/FR + slovníky v3 =
  **přílohy sezení V3**. Testy test_sod_en 30/0, test_sod_real_v3 11/0, mutace 12/12.
- **Pořadí nasazení (J. V.):** 1) Nastavení → Firma: skladné Kč/den; 2) Nastavení → Šablony → SoD
  realizace: česká v3; 3) jazykové verze realizace v3 a projekce v3 (EN/DE/FR). Bez kroku 1 zůstane
  ve smlouvě {{SOD_SKLADNE}}.
- **Čeká na J. V.:** kontrola vět DPH účetní (SOD_EN_KONTROLA.md), rodilí mluvčí, nahrání šablon.

# Předávka — 18. 10. 2026: dávka V3 pokračování (v18.10.7), větev `claude/v3-sod-en` — SoD v DE a FR

Na pokyn J. V. 18. 10. (přes koordinaci session_011B3ruyPigNEMSUdesbk4Hd). Do `test-draft` / `test` /
`main` nic. Podrobnosti: CHANGELOG v18.10.7, `podklady/SOD_EN_KONTROLA.md`.

- **Hotovo (pushnuto):** nástroj `preklad_sod.js --jazyk en|de|fr` + pojmenovaná místa `[[…]]`;
  šablony SoD realizace v2 a projekce v3 v DE a FR (kontrola bez problémů) a slovníky EN/DE/FR
  s místy `DPH_REZIM`, `DPH_SNIZENA_SAZBA`, `SKLADNE` — **přílohy sezení V3** (session_01GyotCYY7DhFnyXhceNA3de).
  EN šablony beze změny (bajtově shodné). Příručka, roadmapa #157 (DE/FR), #380 (zvolena B → V5).
- **Testy:** test_preklad_sod 14/5 (nástroj v17.10.6) → 19/0, test_sod_en 20/0, mutace 18/18,
  smoke 262/0/6 (přeskočené = firemní podklady).
- **Čeká na J. V.:** znění sporných míst (pak přepsat záznam místa ve slovníku a `node
  nastroje/preklad_sod.js --jazyk <j> <složka>`), kontrola rodilými mluvčími, nahrání šablon EN/DE/FR.
- **Verze v18.10.7** (přidělila koordinace).

# Předávka — 17. 10. 2026: dávka V3 (v17.10.6), větev `claude/v3-sod-en` — SoD v angličtině (#157), #380 Q7 návrh

Nad `origin/claude/integrace-16-10` (`9bb7caf`, v17.10.4). Do `test-draft` / `test` / `main` nic —
slučuje koordinace (session_011B3ruyPigNEMSUdesbk4Hd). Podrobnosti: CHANGELOG v17.10.6,
`podklady/SOD_EN_KONTROLA.md`.

- **Hotovo (pushnuto):** #157 — nástroj `nastroje/preklad_sod.js` (kostra slovníku → anglická
  šablona + kontrola); anglické šablony SoD realizace v2 a projekce v3 vyrobené, kontrola bez
  problémů, **předané J. V. jako přílohy sezení V3** (session_01GyotCYY7DhFnyXhceNA3de: dva .docx
  a dva slovníky .preklad_en.json; do repozitáře nepatří). Aplikace: Jazyk tisku u karet SoD,
  splátky / platby / místo plnění v jazyce smlouvy, EUR, bez jazykové šablony smlouva v cizím
  jazyce nevznikne. Příručka kap. 24 + Co je nového v17.10.6, roadmapa #157 → hotovo.
- **#380 Q7:** jen návrh koordinaci (A věta přílohy, B i bloky činností čl. II/III — doporučeno B,
  samostatná dávka); roadmapa #380 `otazka` aktualizovaná. Kód beze změny.
- **Testy:** test_sod_en 8/10 → 18/0, test_preklad_sod 0/1 → 13/0, harness overit_sod_en 2/4 → 6/0;
  smoke 261/0/6 (přeskočené = firemní podklady, mezi nimi overit_sod.mjs); mutace 12/12.
  Pozn. k prostředí: `npm i playwright` bez verze stáhne 1.64 → v kontejneru chybí prohlížeč
  (chromium_headless_shell-1248); funguje `npm i --no-save playwright@1.56.1` (chromium 1194).
- **Čeká na J. V.:** kontrola překladu rodilým mluvčím (opravy do slovníku → `node
  nastroje/preklad_sod.js <složka>`), nahrání EN šablon v Nastavení → Šablony → SoD → EN (test
  i ostrá); sporná místa české šablony (DPH v režimu přenesení × snížená sazba, skladné v Kč,
  odkaz „odst. 5“ v SoD PROJ) — viz SOD_EN_KONTROLA.md.
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` / `roadmap.json`
  (#157, #380) / `manual/obsah.json` (verze, Co je nového) / `src/preklad.js`.
- **Další krok:** žádný v této větvi — dávka uzavřená.

# Předávka — 18. 10. 2026: dávka V6 (v18.10.5), větev `claude/v6-kontrola-rozhodnuti` — kontrola rozhodnutí 16.–18. 10.

Nad `origin/claude/integrace-16-10` (`0dbec56`, v17.10.5). Do `test-draft` / `test` / `main` nic —
slučuje koordinace (session_011B3ruyPigNEMSUdesbk4Hd). Výstup: `podklady/KONTROLA_ROZHODNUTI_18_10.md`,
CHANGELOG v18.10.5.

- **Hotovo (pushnuto):** 12 rozhodnutí (S12, S13, B179, V4-1, V1 #366, A2 #355, O6/B178, B165, #425,
  #356, #367, B163) × kód / příručka / EN / DE / FR — v kódu vše promítnuto. Opraveno: příručka (Co je
  nového v16.10.1–v17.10.5, plná moc po SoD, číslo SoD), meze + audity + roadmapa (#420 hotovo, #422,
  #423, B165 část 2 → #425), komentář překladu V4-1 (schváleno 17. 10.), V4-5 název krycího listu
  v registru (test 55/2 → 57/0).
- **Předáno:** V6-8 — roadmapa #157 nese v detailu i původní „čeká na právníka“ (dořeší V3).
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` / `roadmap.json` (#420, #422,
  #423) / `manual/obsah.json` (verze, nadpisy Co je nového — V3/V5 budou přidávat novinky nahoru).
- **Další krok:** žádný; po sloučení přegenerovat příručku ze snímků.

# Předávka — 18. 10. 2026: dávka N3, větev `claude/kolo27-audit` — kolo 27, bezpečnostní audit v16.10.5 → v17.10.5

Nad `origin/claude/integrace-16-10` (`0dbec56`, v17.10.5). Kód aplikace beze změny (verze zůstává v17.10.5).
Do `test-draft` / `test` / `main` nic — slučuje koordinace (session_011B3ruyPigNEMSUdesbk4Hd).

- **Hotovo (pushnuto):** `podklady/AUDIT_2026-10-18_v17.10.5.md` — 0 kritických / vysokých / středních,
  nízký **B183** (zaokrouhlení plochy pásu na celé m²: nekrytý nárůst až < 1 m², dokumentace říká ±0,5),
  informativní B184 (ruční přepisy řádku pásu mimo obsah), B185 (opis čísla SoD a data podpisu jen
  v prohlížeči), B186 (číselná pole zadání jako text, zámek fail-closed), B187 (XSS harness bez pohledu
  schvalovatele). Pokus `podklady/AUDIT27_pokus_vyjimky.mjs` 16/0; cílené sady a harnessy 0 FAIL.
- **Rozhodnuto výchozí volbou:** B183 neopravováno v této dávce (volba mezi zněním a chováním) — návrh (a)
  opravit znění meze v další dávce výjimek; (b) 0,1 m² jen na pokyn J. V.
- **Celé kolo s mutacemi:** dávka K1 (souběžně).
- **Při slučování:** konflikt jen v `PREDAVKA.md`.

# Předávka — 17. 10. 2026: dávka B165 (v17.10.5), větev `claude/b165-karta-vyjimky` — sazby a dopad v kartě výjimky, zbytek B178

Nad `origin/claude/integrace-16-10` (`9bb7caf`, v17.10.4). Do `test-draft` / `test` / `main` nic —
slučuje koordinace (session_011B3ruyPigNEMSUdesbk4Hd). Podrobnosti: CHANGELOG v17.10.5,
`BEZPECNOST_MEZE.md` (B165, B178 zbytek).

- **Hotovo (pushnuto):** B165 část 1 — karta Cenové výjimky ukazuje schvalovateli použitou vs. ceníkovou
  sazbu, dopad na cenu OCK/PROJ v % a Kč (položka i celkem), plochu pásu a světlíky (`vyjimkyDopad`);
  obchodník čísla nevidí. Zbytek B178 — obsah s pásem „jiné“ nese plochu z jádra na celé m² a klíč `l`
  se světlíky „jiné“ (`vyjimkyPlochyJadra`, server `ctx.jekly`). Roadmapa #420, příručka kap. 19 + Co je
  nového v17.10.5, audity kol 25/26.
- **Testy:** src/test_vyjimky 83/8+pád → 105/0, netlify/test_vyjimky 69/3 → 72/0; mutace 12/12.
- **Čeká na J. V. (poslané koordinaci):** B165 část 2 — vlastní schválení role se `sleva.schvalovani`;
  doporučeno zakázat kromě administrátora (žadatel/autor ≠ schvalovatel). Neměněno.
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` / `roadmap.json` (#420) /
  `netlify/mutace.mjs` / `src/vyjimky.js` / `manual/obsah.json`. Po sloučení schválené výjimky s pásem
  „jiné“ čekají znovu (změna tvaru obsahu); výjimky jen se směsí platí dál.
- **Další krok:** po rozhodnutí J. V. k části 2 případně navazující dávka; jinak uzavřeno.

# Předávka — 17. 10. 2026: dávka O6 (v17.10.4), větev `claude/o6-b178-b179` — oprava B178 a B179

Nad `origin/claude/kolo26-audit` (`54174ee`, v17.10.1). Do `test-draft` / `test` / `main` nic —
slučuje koordinace (session_011B3ruyPigNEMSUdesbk4Hd). Podrobnosti: CHANGELOG v17.10.4,
`BEZPECNOST_MEZE.md` (audit kola 26), `podklady/AUDIT_2026-10-17_v16.10.5.md`.

- **Hotovo (pushnuto):** B178 — sdílená `oplasteniPasyMeze` (jádro i výjimka), obsah pásu nese meze
  po ořezu a délku stěny, karta výjimek plochu m² z jádra (`vyjimkyPasyPlochy`, základ pro B165);
  B179 — příznak jen `C.priplatky.*` (`cenikDleNabidkySmi` v očistě i v `cenikDleNabidkyJe`), mapa pro
  zveřejnění z platného ceníku + změn správce (`cenikDleNabidkyProZverejneni`, `CENIK_DLE_ZMENY`).
  Pokusy N2 po opravě 403. Roadmapa #424 hotovo, příručka kap. 17/19 + Co je nového v17.10.4.
- **Testy:** viz CHANGELOG v17.10.4 (pojistky před/po), mutace B155 3/3, B178 5/5, B179 5/5 a dvě
  upravené starší „výjimky:“ 2/2; `--kontrola` server 491, jádro 219. Harnessy `overit_schvalovani`
  (smyšlené rozměry šachty) a `overit_cena_dle_nabidky` (nové chování sloupce) upravené.
  `overit_online` padá na timeoutu i na `54174ee` (prostředí, ne tato dávka).
- **Zbývá jako mez (k rozhodnutí J. V. přes koordinaci):** světlíky u dveří podle převažujícího pásu
  a vnější rozměr stěny (profily/zasklení) — obsah je nenese; návrh: plocha světlíků z výsledku jádra.
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` / `roadmap.json` (#424) /
  `netlify/mutace.mjs` (B155, B178, B179) / `src/cenik.js` / `src/vyjimky.js` / `manual/obsah.json`.
  Po sloučení se schválené výjimky s pásem „jiné“ vrátí do „čeká znovu“ (změna tvaru obsahu).
- **Další krok:** žádný v této větvi — dávka uzavřená.

# Předávka — 17. 10. 2026: dávka A2 (v17.10.3), větev `claude/a2-mustky` — můstky (#355; #356 jen návrh)

Nad `origin/claude/integrace-16-10` (e2c773a, v16.10.5). Do `test-draft` / `test` / `main` nic —
slučuje koordinace (session_011B3ruyPigNEMSUdesbk4Hd). Podrobnosti: CHANGELOG v17.10.3.

- **Hotovo (pushnuto):** #355 pravidlo kontrol `mustkyPrechodove` (výpočet beze změny,
  upozornění ne zábrana, tisk CZ/EN/DE/FR nezastaví); příručka (kap. 11, Co je nového v17.10.3),
  roadmapa #355 → hotovo. Testy: test_mustky 34/8 → 42/0, test_kontroly 137/1 → 138/0
  (36 pravidel); mutace jádra +3, chycené.
- **#356 — pokyn J. V. 17. 10. (přes koordinaci): „toto přeskoč a připrav mi na pondělí detailní
  vizuální návrh variant“.** Implementace (commit 75f9fd1) je v této větvi **revertovaná**;
  hotový kód doporučené kombinace leží ve větvi `claude/a2-356-navrh` (nesloučí se; test_mustky
  59/0, mutace 5/5, smoke 258/0/6). **Návrh pro J. V. na 19. 10.:**
  https://claude.ai/artifact/9nMGAMnggiVEByuZoty9Qt — varianty (a) přesahy, (b) položka,
  (c) oplechování, (d) podmínka, (e) Model 1/2, dopad na 3 ukázkové zakázky (zkušební ceník).
  Doporučení A1 + B1 + C1 + D1 + E1. Roadmapa #356: „čeká“ s odkazem.
- **Po schválení #356:** převzít kód z `claude/a2-356-navrh` (commit 75f9fd1 + jeho dokumentace),
  při jiné volbě upravit vzorec `strechaMustekM2` v `src/engine.js` a referenci v `src/test_mustky.js`.
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` / `manual/obsah.json`
  (Co je nového) / počet pravidel v `src/test_kontroly.js` a `overit_lista.mjs` (36).
  Záhlaví „verze“ v `manual/obsah.json` jsem neměnil (nastaví koordinace).
- **Další krok:** čeká se na rozhodnutí J. V. k #356 (19. 10.).

# Předávka — 17. 10. 2026: dávka V1 (v17.10.2), větev `claude/v1-cislo-sod` — návrh čísla SoD a zámek po tisku SoD (#366)

Nad `origin/claude/integrace-16-10` (e2c773a, v16.10.5). Do `test-draft` / `test` / `main`
nic — slučuje koordinace (session_011B3ruyPigNEMSUdesbk4Hd). Podrobnosti: CHANGELOG v17.10.2.

- **Hotovo (pushnuto, commit po bodech):** V1-1 návrh čísla SoD z čísla nabídky (CN → SOD,
  `sodCisloNavrh`, prefill v obou krycích listech, ↺); V1-2 první tisk SoD opíše číslo SoD
  a datum podpisu do zakázky (`zamekPrvniSmlouva`, `kryciZmrazSod`, `kryciProjZmrazSod`);
  V1-3 příručka (kap. 24, Co je nového v17.10.2), roadmapa #366 hotovo, CHANGELOG.
- **Výchozí volby (k potvrzení koordinací / J. V.):** (a) „řada" = číslo nabídky s SOD
  místo CN, ne samostatná průběžná řada od papírových smluv (rozhodnutí 29. 9.);
  (b) varianta ≥ 2 nese příponu `.2` i v čísle SoD (unikátnost).
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` / `roadmap.json` /
  `netlify/mutace.mjs` (mutace #366, upravené kotvy S7) / `manual/obsah.json` (verze a novinky).
- **Další krok:** žádný — dávka uzavřená; celé kolo pustí koordinace.

# Předávka — 17. 10. 2026: dávka N2 (v17.10.1), větev `claude/kolo26-audit` — kolo 26 a bezpečnostní audit

Nad `origin/claude/integrace-16-10` (`e2c773a`, v16.10.5). Do `test-draft` / `test` / `main` nic —
slučuje koordinace (session_011B3ruyPigNEMSUdesbk4Hd). Podrobnosti: CHANGELOG v17.10.1,
`podklady/AUDIT_2026-10-17_v16.10.5.md`, pokusy `podklady/AUDIT26_pokus_*.mjs`.

- **Hotovo (pushnuto):** audit změn v15.10.14 → v16.10.5 — 0 kritických a vysokých, **2 střední**
  (B178 výška šachty × schválený pás, B179 příznak „cena dle nabídky“ z ceníku varianty do
  platného ceníku), B180 nízký **opraven** (rozpis zveřejnění ukazuje příznaky; test 41/10 → 51/0,
  mutace 3/3), B181–B182 informativní; regrese 0. Roadmapa #424 (předběžné id). Protokol
  `TESTOVACI_PROTOKOL_2026-10-17_v17.10.1.xlsx` poslán v chatu (na Disku je poslední protokol
  12. 10., kola 23–25 tam protokol nemají — navazuje se na něj).
- **Testy:** cílené sady a harnessy zelené (viz CHANGELOG); `netlify/mutace.mjs --kontrola` 481,
  `mutace_jadro.mjs --kontrola` 219. Celé kolo s mutacemi pouští koordinace (server 481 úseků vč. 3 nových B180, jádro 219).
- **Na co se čeká:** oprava B178 a B179 v okně O6 (samostatná dávka, návrh v auditu);
  rozhodnutí J. V. přes koordinaci: B179 — příznak jen u příplatků? (doporučeno ano);
  B178 — plocha pásu v kartě výjimky? (souvisí s B165).
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` / `roadmap.json`
  (#424 předběžné) / `netlify/mutace.mjs` (B180 na konci seznamu) / `src/cenik.js`.
- **Další krok:** žádný v této větvi — dávka uzavřená.

# Předávka — 16. 10. 2026: dávka V4 (v16.10.5), větev `claude/v4-kontrola-rozhodnuti` — kontrola rozhodnutí 15.–16. 10.

Nad `origin/claude/integrace-16-10` (= test v15.10.14). Do `test-draft` / `test` / `main` nic —
slučuje koordinace (session_011B3ruyPigNEMSUdesbk4Hd). Podrobnosti: CHANGELOG v16.10.5,
`podklady/KONTROLA_ROZHODNUTI_16_10.md`.

- **Hotovo (pushnuto):** V4-1 překlad rekapitulace PROJ (EZC, KOLAUDACE) + test 70/3 → 73/0;
  V4-2 roadmapa — rozhodnutí 16. 10. (#355, #356, #366, #157, B165, #367); V4-3 příručka
  „Co je nového“ (P12, čekání lišty). Smoke 252/0/6 (po zápisu CHANGELOG).
- **Čeká na J. V.:** schválit návrh překladu V4-1 (znění v kontrolním dokumentu).
- **Pro koordinaci / A1:** V4-4 — B158 má od B80 dopad na všechny účty. Při sloučení nastavit
  verzi a nadpis novinek v `manual/obsah.json` a příručku přegenerovat ze snímků.
- **Další krok:** žádný — dávka uzavřená.

# Předávka — 16. 10. 2026: dávka A1 (v16.10.4), větev `claude/a1-audit25` — dočištění auditu 25 (#420)

Nad `origin/claude/integrace-16-10` (58db0b6, test v15.10.14). Do `test-draft` /
`test` / `main` nic — slučuje koordinace (session_011B3ruyPigNEMSUdesbk4Hd).
Podrobnosti: CHANGELOG v16.10.4, `BEZPECNOST_MEZE.md` (oddíl „Audit kola 25 —
B158, B159, B161, B162a, B164").

- **Hotovo (pushnuto, commit po bodech):** B158 výhradní úsek stropu Pipedrive
  (`vyhradne` v `sdilene.mjs`); B159 `zapisMimoAplikaci` v `prihlaseny()`
  (Origin „null" a ne-JSON tělo u zápisu → 401, bez Origin beze změny);
  B160 klíče `Object.prototype` ve slovníku (server i klient); B163 údaje
  plné moci `pm*` volné i po SoD; B166 harness XSS (výjimka, aktivní zamčená
  varianta, lišta #404) + CI Node 22.23.2; vědomé meze B161, B162a, B164;
  audit a roadmapa (#420) aktualizovány. Zbývá jen B165 (rozhodnutí J. V.).
- **Testy před → po:** test_pd_pristup 51/3 → 54/0; test_prava 843/6 → 849/0
  (B159), 848/3 → 851/0 (B160); src/test_slovnik 84/5 → 89/0;
  src/test_kryci_po_tisku 98/5 → 103/0; netlify/test_kryci_po_tisku 17/1 → 18/0;
  overit_xss 338/0 → 370/0 (se sabotáží 359/11). Smoke 222 / 0 / 36 přeskočeno; 32 prohlížečových sad přeskočených pro chybějící místní playwright puštěno zvlášť (symlink na globální): 30 prošlo, 2 přeskočeny (firemní šablony) → celkem 252 / 0 / 6 jako v15.10.14.
- **Mutace (cílené):** B158 2/2, B159 3/3, B17 (upravená kotva) 1/1, B160 3/3,
  rev #401 N2 (upravená kotva) 1/1, B163 3/3 (čtvrtá ekvivalentní vyřazena),
  KL 14. 10. 5/5; `--kontrola` serveru 460, jádra 205.
- **Pozor pro koordinaci:** mutační běhy nepouštět souběžně nad týmž
  souborem — dva běhy najednou si přepsaly `sdilene.mjs` (opraveno před
  commitem, ověřeno diffem). `build.py` bez přepínače zvedá verzi
  (i s `--help`) — v kolech `KNG_NEZVYSOVAT_VERZI=1`.
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt` /
  `roadmap.json` / `netlify/mutace.mjs` (nové mutace B158–B163).
- **Další krok (koordinace):** celé kolo s mutacemi — čekané 460 z 460
  (server) a 205 (jádro).

# Předávka — 16. 10. 2026: dávka S13 (v16.10.3), větev `claude/cena-dle-nabidky` — příznak ceníku „cena dle nabídky"

Nad `origin/test` (1cbab3a, v15.10.14). Zadání J. V. 16. 10. (varianta A,
e-mail D. S. 15. 10.: vlastní cena prosklené stěny blokovala tisk nabídky).
Do `test-draft` / `test` / `main` nic — sloučení a celé kolo dělá koordinace
(session_01NQjWzfqv1obHAg7DWPHAKH). Podrobnosti: CHANGELOG v16.10.3.

- **Hotovo (pushnuto):** příznak `cenik.dleNabidky` (model `src/cenik.js`,
  zveřejnění + otisk, výchozí zaškrtnutí osmi položek, starý ceník =
  nezaškrtnuto); výjimky / kontrola ceníku na serveru / automatický přepočet
  berou příznak jen z platného ceníku; sloupec v Nastavení → Ceník (správce),
  štítky v příplatcích; hláška „<název>: cena pod ceníkem". Testy: jednotkový
  0/1 → 32/0, serverový 6/7 → 13/0, harness 5/9 → 14/0; mutace S13 serveru
  12/12, jádra 2/2; `--kontrola` 461 / 207; smoke 255 / 0 / 6. Příručka kap. 17, roadmapa #423
  (předběžné id), `BEZPECNOST_MEZE.md` (S13).
- **Doplněk (J. V. 16. 10., varianta A + „předzaškrtnuté v UI"):** ceník bez
  mapy příznaků ukáže v Nastavení → Ceník výchozích osm jako návrh, do
  zveřejnění se hlídá, zveřejnění návrh zapíše; prázdná mapa `{}` = výslovně
  nic. Jednotkový 41/0, harness 21/0, mutace S13 serveru 15/15, jádra 2/2,
  `--kontrola` 464 / 207, smoke 255 / 0 / 6.
- **Po nasazení (J. V.):** v Nastavení → Ceník zkontrolovat předzaškrtnutý
  návrh a zveřejnit ceník (test i ostrá) — teprve tím příznaky platí.
- **Při slučování:** zkušební `git merge-tree` proti S11
  (`claude/b155-rozsah-pasu`, mění `src/vyjimky.js` i `BEZPECNOST_MEZE.md`)
  a S12 (`claude/leseni-spec-radek`): `vyjimky.js`, `BEZPECNOST_MEZE.md`
  a `netlify/mutace.mjs` se sloučí samy, konflikt je v `roadmapa/roadmap.json`
  (meta + položky 421/423) a čekej ho v CHANGELOG, PREDAVKA a `verze.txt`.

# Předávka — 16. 10. 2026: dávka S12 (v16.10.2), větev `claude/leseni-spec-radek` — lešení a vlastní řádky specifikace v CN

Nad `origin/test` (1cbab3a, v15.10.14). Připomínky D. S. 15. 10. 2026, body 2
a 3. Do `test-draft` / `test` / `main` nic — sloučení a celé kolo dělá
koordinace (session_01NQjWzfqv1obHAg7DWPHAKH). Podrobnosti: CHANGELOG v16.10.2.

- **Hotovo (pushnuto):** bod 2 — nový řádek LEŠENÍ VNITŘNÍ PRO STAVBU OCK
  v SOUČÁSTÍ DODÁVKY NENÍ, oba řádky lešení řídí `tsLeseniNeniRadek`
  (v ceně → vypadne, příplatek v nabídce → „nabízeno jako příplatek",
  vyřazený → „zajistí objednatel v rámci SP"), ručně + ↺ funguje; nabídka
  OCK náhled, tisk, Word (klon řádku, `docxRadkyNavic`). Bod 3 — vlastní
  řádky specifikace jako sekce DALŠÍ UJEDNÁNÍ v náhledu, tisku i Wordu CN.
  Testy `test_leseni_specifikace` 45/0, `test_techspec_vlastni_radky` 22/0,
  mutace jádra LEŠ 8/8 a VLR 4/4 (jedna díra v testu doplněna), harness
  `overit_leseni_spec.mjs` se šablonami CN v11–v15 CZ/EN/DE/FR, příručka,
  roadmapa #422 (přečíslováno koordinací).
- **Výchozí volby ke schválení J. V.:** popisek „LEŠENÍ VNITŘNÍ PRO STAVBU
  OCK" (převzatý od obchodníka); věta „nabízeno jako příplatek" jako u soklu
  (ne „lze doplnit – viz příplatkové ceny" z N49); sekce DALŠÍ UJEDNÁNÍ za
  SOUČÁSTÍ DODÁVKY NENÍ.
- **Pozor pro obchodníka:** kdo si vnitřní lešení dřív přidal vlastním
  řádkem (jako D. S.), uvidí ho teď dvakrát — vlastní řádek smazat.
- **Při slučování:** konflikty čekej v CHANGELOG, PREDAVKA, `verze.txt`,
  `manual/obsah.json`, `roadmapa/roadmap.json` (#421 — S11 si mohla vzít
  totéž číslo, přečíslovat při slučování) a v `MUTACE` v `mutace_jadro.mjs`.
- **Další krok (koordinace):** celé kolo s mutacemi.

# Předávka — 16. 10. 2026: dávka S11 (v16.10.1), větev `claude/b155-rozsah-pasu` — B155 rozsah pásu „jiné" ve výjimce

Nad `origin/test` (1cbab3a, v15.10.14). Rozhodnutí J. V. 16. 10. 2026: B155
se opraví úzce (jen rozsah pásu v obsahu výjimky a v kartě, ne B165). Do
`test-draft` / `test` / `main` nic — sloučení rozhoduje J. V., koordinace
session_01NQjWzfqv1obHAg7DWPHAKH. Podrobnosti: CHANGELOG v16.10.1.

- **Hotovo (pushnuto):** `vyjimkyPasyJine` nese `odM`/`doM` pásu, obsah
  `p` = `[stěna, i, název, sazba, odM, doM]`; karta „stěna B (Deska, 0–1 m)".
  `src/test_vyjimky.js` 62 → 76 OK, `netlify/test_vyjimky.mjs` 46 → 59 OK,
  mutace B155 3 z 3, skupina „výjimky" 22 z 22, `--kontrola` 452 úseků.
  Pokus `podklady/AUDIT25_pokus_B155_rozsah.mjs` upraven (reálný tvar 0–1 m
  + ceníkový pás nad ním): před opravou shoda obsahů, po opravě různé.
- **Ověření:** `spust_testy.sh` 198/0/1; celé mutace serveru přerušil limit
  úlohy po 288 z 452 (288 chycených, nic nechycené); cílené „B31: hesloVerze
  se obnovou sníží" 1 z 1 (chycená od v15.10.14), „B155" 3 z 3. Celé kolo
  pustí koordinace (session_011B3ruyPigNEMSUdesbk4Hd).
- **⚠ Pro J. V.:** rozhodnutí o výjimkách **s pásem „jiné"** vydaná před
  v16.10.1 přejdou do „čeká znovu" — je potřeba je **schválit znovu**.
  Výjimky jen se směsí ceníku se nemění.
- **Výchozí volby:** poslední pás má v obsahu vždy `doM: null` (jádro jeho
  mez nečte); nečitelná mez = 0 jako v jádru; rozsah se neořezává na výšku
  šachty (obsah = zadání); záporný začátek se v kartě píše „-1,2".
- **Při slučování:** konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt`,
  `roadmapa/roadmap.json` (#421, `meta.poradi`) a v `MUTACE` v `netlify/mutace.mjs`.

# Předávka — 15. 10. 2026: dávka S10 (v15.10.14), větev `claude/mutace-b8-b31` — nechycené mutace B8 a B31

Nad `origin/test` (f8fe243, v15.10.13). Do `test-draft` / `test` / `main`
nic — sloučení a celé kolo dělá koordinace (session_01NQjWzfqv1obHAg7DWPHAKH).
Podrobnosti: CHANGELOG v15.10.14.

- **Hotovo (pushnuto):** obě nechycené mutace jsou díry v testu (ne v kódu,
  ne ekvivalentní mutace); kód aplikace i kotvy `MUTACE` beze změny.
  B8: test v `test_prava.mjs` dává do rejstříku zakázku přesně s cizím číslem
  (od B151 už nestačil převod na jméno souboru). B31: nový oddíl
  v `test_obnova.mjs` — obnova stejného hesla po odhlášení (B6) verzi nesníží
  (226 → 232 OK). Cílené mutace B8 15/15, B31 1/1, B151 1/1, B93 1/1;
  `--kontrola` 449; kontrola údajů čistá.
  Smoke 252 / 0 / 6 (viz CHANGELOG — dočasné selhání release_odkaz).
- **Při slučování:** mění se jen dva testy, CHANGELOG, PREDAVKA, `verze.txt`;
  konflikty čekej v CHANGELOG / PREDAVKA / `verze.txt`.
- **Další krok (koordinace):** celé kolo s mutacemi — čekané 449 z 449.

# Předávka — 15. 10. 2026: dávka S9 (v15.10.11), větev `claude/sod-proj-cislo` — číslo SoD ve smlouvě PROJ

Nad `origin/claude/integrace-15-10` (e0704b6: S7 v15.10.9 + S8 v15.10.10).
Zadání J. V.: „Aktualizuj šablony, aby se nám do nich číslo SoD propisovalo
z krycího listu zakázky ve chvíli, kdy tam bude vyplněné." Do `test-draft` /
`test` / `main` nic — sloučení dělá koordinace (session_01NQjWzfqv1obHAg7DWPHAKH).
Podrobnosti: CHANGELOG v15.10.11, postup `podklady/POSTUP_SABLONY_SOD_15_10.md`.

- **Hotovo (pushnuto):** `nastroje/vyrob_sablony.js --sod-proj-cislo`
  (`sodProjCislo`): pod nadpis SoD PROJ řádek „číslo {{SOD_CISLO_SMLOUVY}}"
  (v2 → `_v3.docx`, v1 → `_v1_cislo.docx`); test `src/test_sod_proj_cislo.js`
  0/1 → 24/0, harness `overit_sod_proj_cislo.mjs` 6/0, kontroly S9
  v `overit_sod.mjs`, mutace S9 4 z 4, smoke 252/0/6, `--kontrola` 443 / 205,
  kontrola údajů čistá. Aplikace beze změny (číslo plní od v15.10.9).
- **NEHOTOVO — šablony na Disku:** firemní .docx nešly v kontejneru přečíst
  (uložený výsledek konektoru Drive — čtení zamítl strážce oprávnění),
  takže v3 / v1_cislo nevznikly ani se nenahrály. J. V.: vyrobit lokálně
  (`node nastroje/vyrob_sablony.js --sod-proj-cislo <složka se šablonami>`),
  nahrát vedle původních na Disk a v3 zveřejnit v Nastavení → Šablony
  (typ „Šablona smlouvy o dílo — PROJEKČNÍ PRÁCE"), test i ostrá.
- **Pozor:** commit 8b6b284 zachytil dočasnou mutaci, opraveno 4d17ccc —
  při slučování brát hlavu větve.
- **Při slučování:** konflikty čekej v CHANGELOG, PREDAVKA, `verze.txt`
  a na konci `MUTACE` / `SADY` v `netlify/mutace.mjs`.

# Předávka — 15. 10. 2026: větev `claude/hodiny-po-listech` (v15.10.10), hodiny v krycím listu po listech (S8)

Nad `origin/claude/integrace-15-10` (9ead7b5). Zadání
`podklady/PROMPT_hodiny_po_listech.md` + `podklady/_SPOLECNE_15_10.md`.
Do `test-draft` / `test` / `main` nic — sloučení a celé kolo dělá koordinační
sezení (session_01NQjWzfqv1obHAg7DWPHAKH). Podrobnosti: CHANGELOG v15.10.10.

- **Hotovo (pushnuto):** krycí list OCK jen hodiny OCK, PROJ jen hodiny
  PROJ (jeden sloupec), vyřazená strana bez tabulky; obrazovka, tisk, Word;
  testy (jednotkové 34/0, harness 16/0), mutace jádra HOD 4/4; příručka
  kap. 24, roadmapa #414.
- **Při slučování se S7 (`claude/kryci-cislo-sod`):** změny v `src/kryci.js`
  jsou jen ve funkcích `kryciHodiny` / `kryciHodinySekce` a v jednom řádku
  `kryciData`; v `src/ui/kryci_ui.js` jen `kryciTiskTabulka`
  a `kryciHodinyBlok`; v `src/docxgen.js` jedna podmínka. Konflikty čekej
  v CHANGELOG, PREDAVKA, `verze.txt`, `manual/obsah.json` a v `JADRA`
  v `mutace_jadro.mjs` (přibyly kryci.js, kryci_proj.js).
- **Otevřené:** potvrdit výchozí volby (CHANGELOG v15.10.10).

# Předávka — 15. 10. 2026 odpoledne: větev `claude/b80-pipedrive` (v15.10.7), Pipedrive všem

Znovu založená nad `origin/test` (8f7be40, v15.10.4). Rozhodnutí J. V.:
právo `crm.pipedrive` zatím všem uživatelům, strop 30 načtení za hodinu a
cache 90 s jsou OK. Podrobnosti: CHANGELOG v15.10.7. Do `test-draft` /
`test` / `main` nic, sloučení dělá koordinační sezení.

- **Hotovo (pushnuto):** výchozí matice Obchodník ano / Vedoucí ano, testy
  51/0, 839/0, 71/0, 64/0, mutace B80 8/8, smoke 251/0/2.
- **Releasy bez vydání (ověřeno přes GitHub 15. 10.):** v14.10.4–v14.10.7,
  v15.10.1, v15.10.2 (vydány v14.10.8, v15.10.3, v15.10.4).
- **Při slučování:** konflikty čekej v CHANGELOG, PREDAVKA, `verze.txt`
  (v15.10.5 P12 a v15.10.6 kolo 25 se slučují zvlášť).

# Předávka — 15. 10. 2026: dávka S7 (v15.10.9), větev `claude/kryci-cislo-sod` — Krycí list zakázky OCK + „Číslo SoD"

Nad `origin/claude/integrace-15-10` (9ead7b5, v15.10.6). Zadání
`podklady/PROMPT_kryci_cislo_sod.md` + `podklady/_SPOLECNE_15_10.md` (větev
`claude/davky-15-10`). Do `test-draft` / `test` / `main` nic — sloučení
a celé kolo dělá koordinační sezení (session_0191A71yUFarU952Vy7h2hc5).
Podrobnosti: CHANGELOG v15.10.9.

- **Hotovo (pushnuto):** nadpis „Krycí list zakázky OCK" (stránka, dokument,
  registr zámku); pole „Číslo SoD" (`cisloSod`) pod Číslem nabídky v obou
  krycích listech, ruční, doplnitelné po odeslání nabídky, zamčené tiskem
  SoD; plní `{{SOD_CISLO_SMLOUVY}}` ve SoD realizace i projekce. Testy,
  harness `overit_kryci_cislo_sod.mjs`, 5 mutací S7, příručka, roadmapa #366.
- **Čeká na J. V.:** šablony SoD projekce (v1 i v2) symbol čísla smlouvy
  nemají — doplnit `{{SOD_CISLO_SMLOUVY}}` (realizace ho má v nadpisu
  „SMLOUVA O DÍLO … číslo …"). Návrh další čísla řady (#366) dál čeká.
- **Při slučování:** konflikty čekej v CHANGELOG, PREDAVKA, `verze.txt`,
  `manual/obsah.json` (verze + Co je nového) a na konci `MUTACE` / `SADY`
  v `netlify/mutace.mjs`. v15.10.7 má jiná dávka.
- Podklady: `/home/user/kng_podklady_s7` (30 šablon, jen v tomto kontejneru).
- **Ověřeno:** smoke se šablonami z Disku 253 prošlo / 0 selhalo / 2 přeskočeno
  (`test.js`, `overit_manual.mjs` — příručka v podkladech nebyla); mutace S7
  5 z 5 chycených; `--kontrola` server 439, jádro 202; kontrola údajů čistá;
  `build.py --kontrola-verze` v15.10.9. Celé kolo nespouštěno (koordinace).
- **Pozor:** commit 47cf6c8 zachytil dočasnou mutaci (`verze: ['bo']`),
  opraveno v 36cbfec — při slučování brát stav hlavy větve.

# Předávka — 15. 10. 2026: větev `claude/b153-b154` (v15.10.8), B153 + B154, uzavření B155 a B156 (S6)

Nad `origin/claude/integrace-15-10` (9ead7b5, v15.10.6). Zadání
`podklady/PROMPT_b153_b154.md` + `podklady/_SPOLECNE_15_10.md`. Do `test-draft`
/ `test` / `main` nic — sloučení a celé kolo dělá koordinační sezení
(session_0191A71yUFarU952Vy7h2hc5). Podrobnosti: CHANGELOG v15.10.8.

- **Hotovo (pushnuto):** B153 (dotisk nové strany hlídá cenovou výjimku
  a marži — server 403, prohlížeč zábrana), B154 (schválení výjimky = celý
  kanonický obsah, přesná shoda; FNV otisk zrušen); B155 a B156 uzavřeny
  jako vědomé meze a B157 jako záměrné chování (`BEZPECNOST_MEZE.md`,
  audit, test v `test_kryci_po_tisku`); roadmapa #420; příručka. Verze
  přečíslována na v15.10.8 (v15.10.7 má B80). Výsledek hlásit koordinaci
  session_01NQjWzfqv1obHAg7DWPHAKH.
- **Výchozí volba (zapsáno v CHANGELOG a příručce):** rozhodnutí o výjimce
  z doby před v15.10.8 (jen otisk) neplatí — výjimka se schválí znovu.
  Dotisk posuzuje potřebu jen z části obsahu dotištěné strany; schválení
  musí sedět na celý obsah. Klient nezastaví dokument bez strany.
- **Při slučování:** konflikty čekej v CHANGELOG, PREDAVKA, `verze.txt`,
  `roadmapa/roadmap.json` (#420 — přečíslovat, pokud ho mezitím vzal jiný)
  a v `netlify/mutace.mjs` (blok B153/B154 před „revize N4"). Celé kolo
  s mutacemi nad výsledkem nespuštěno (pokyn) — smoke 247/0/6 (šablony
  z Disku přeskočeny), cílené mutace 35/35.
- **Pozor:** ad9e2ee omylem zachytil mutaci (commit během běhu mutací);
  opraveno v 768c02f — při slučování brát celou větev, ne jednotlivý commit.

---

# Předávka — 15. 10. 2026: větev `claude/kolo25-audit` (v15.10.6), kolo 25 + bezpečnostní audit (S4)

Nad `origin/test` (db60d8d, v15.10.3; během dávky sloučen 8f7be40, v15.10.4
se S5). Zadání `podklady/PROMPT_kolo25_audit.md` + `podklady/_SPOLECNE_15_10.md`.
Do `test-draft` / `test` / `main` nic — sloučení a celé kolo dělá koordinační
sezení (session_0191A71yUFarU952Vy7h2hc5). Podrobnosti: CHANGELOG v15.10.6,
`podklady/AUDIT_2026-10-15_v15.10.6.md`.

- **Hotovo (pushnuto):** audit B151–B167 (2 vysoké, 2 střední, 4 nízké,
  9 informativních; regrese 0); opraveny B151, B152 (nízké) a B167 (test)
  s testy a mutacemi; audit i na Disku (Testovani).
- **Testy:** smoke 247/0/6 (bez šablon z Disku), mutace B35/B151/B152
  6 z 6, `--kontrola` 434. Celé kolo neběželo (dělá koordinace).
- **Čeká na J. V.:** B153 a B154 (vysoké, schvalování cenové výjimky —
  malé opravy popsané v auditu, pokusy `podklady/AUDIT25_pokus_*.mjs`),
  B155 a B156 (střední), B157 (sporné: cizí obchodník a volná pole krycího
  listu), B161–B165 (meze / UX).
- **Na vědomí:** úprava P12 (93b6a02, v15.10.5) posouzena z commitu —
  ochrana nákladů je teď volitelná (zapíná administrátor), viz B162.
- **Při slučování:** konflikty čekej v CHANGELOG, PREDAVKA, `verze.txt`
  a na konci `MUTACE` v `netlify/mutace.mjs` (B152 za S5).

---

# Předávka — 15. 10. 2026: dávka S5 (v15.10.4) — lišta „Ceník není nahraný" až po ověření

Větev `claude/lista-cenik-zpozdeni` nad `origin/test` (5a42369, v14.10.8);
zadání `podklady/PROMPT_lista_cenik_zpozdeni.md` + `_SPOLECNE_15_10.md`
(větev `claude/davky-15-10`). Do `test-draft` / `test` / `main` nic —
sloučení a celé kolo s mutacemi dělá koordinační sezení
(session_0191A71yUFarU952Vy7h2hc5).

- **Hotovo:** lišta ukázkových dat při startu nad http(s) čeká na první
  pokus o načtení z online databáze, nejdéle 5 s (`ukazkoveListaRozhodni`,
  `UKAZKOVE_CEKANI`, `ukazkoveCekaniKonec` z `onlineStart`); zábrany
  dokumentů beze změny. Test `src/test_ukazkove.js` (+9), harness
  `overit_lista_cekani.mjs` (nový), 4 mutace S5 v `netlify/mutace.mjs`
  (+ `../src/test_ukazkove.js` v `SADY`), příručka kap. 4, CHANGELOG.
- **Výchozí volby:** `file://` nečeká (online se nic nenačítá); čeká se jen
  při prvním startu stránky, ne po „Zkusit znovu" / pozdějším přihlášení.
- **Smoke (`spust_testy.sh --smoke`, šablony z Disku v `KNG_PODKLADY`):** 246 prošlo / 0 selhalo / 2 přeskočeno (`test.js` — není v exportu; `overit_manual.mjs` — příručka ze snímků v podkladech nebyla). Před dávkou (v14.10.8) 246/0/1 i s `overit_manual`; přibyl `overit_lista_cekani.mjs`. Mutace `--kontrola`: server 404 úseků, jádro 202; cíleně `node netlify/mutace.mjs "S5"` 4 z 4. Kontrola údajů čistá. Celé kolo se nespouštělo (dělá koordinační sezení).
- **Další krok:** koordinační sezení — sloučit do `test`, celé kolo.
# Předávka — 15. 10. 2026: větev `claude/p12-naklady` (v15.10.3), P12 obchodník nevidí náklady

Z `origin/test` (5a42369, v14.10.8), zadání `podklady/PROMPT_p12_naklady.md`
(dávka S3, #369) + `podklady/_SPOLECNE_15_10.md`. Do `test-draft` / `test` /
`main` nic — sloučení a celé kolo dělá koordinační sezení J. V.
Podrobnosti: CHANGELOG v15.10.3.

- **Úprava J. V. 15. 10. odpoledne (93b6a02):** `naklady.ceniky` výchozí
  všem zapnuto — obchodník náklady zatím vidí, administrátor je skryje
  v Nastavení → Zobrazení (přepínač existuje, ukládá se na server). Bez
  práva vidí obchodník **prodejní sazbu** (s přirážkou sekce). Testy:
  harness 21/8 → 29/0, server 8/3 → 11/0, unit 31/0, mutace P12 13 z 13,
  smoke se šablonami 248/0/2.
- **Hotovo (pushnuto):** klíč matice `naklady.ceniky` (Vedoucí ano,
  Obchodník ne); (a) Kalkulace PROJ bez sloupce Sazba / nákladů v souhrnu /
  částky dopravy; (b) `kontroly.cisla` rozhoduje (vedoucí beze změny);
  (c) soubor zakázky bez ceníků rozpracovaných variant (jen odchylky),
  import doplní z platného; (d) `GET /api/program` bez historie verzí.
  Příručka (kap. 8 a 28), roadmapa #369 → hotovo (v15.10.3).
- **Testy:** `src/test_p12_naklady.js` 3/2+pád → 31/0;
  `netlify/test_p12_naklady.mjs` 8/3 → 11/0; `overit_p12_naklady.mjs`
  17/7 → 24/0; smoke bez šablon 244/0/6, se šablonami 248/0/2; mutace P12 13 z 13.
- **Smoke se šablonami z Disku** nad v15.10.3: 248 / 0 / 2 přeskočeno
  (test.js, overit_manual.mjs). Šablony jen v kontejneru
  (`/home/user/kng_podklady_p12`). Nic rozdělaného.
- **Rozhodnuto J. V. 15. 10.:** ceny se na serveru zatím počítat nebudou
  (varianta C se nedělá). Otevřené zůstává jen, kdy obchodníkům náklady
  skrýt (odškrtnutí v matici). Release v15.10.3 (db60d8d) nese první podobu
  P12; úprava (prodejní sazba, výchozí zobrazeno) je v `test` až od v15.10.7.
- **Meze:** platný ceník v prohlížeči a ceníky v online zakázkách zůstávají
  (varianta C z rozboru se nedělá).
# Předávka — 15. 10. 2026: větev `claude/b80-pipedrive` (v15.10.1), B80 `/api/pd/*` — dávka S1

Nad `origin/test` (5a42369, v14.10.8), zadání `podklady/PROMPT_b80_pipedrive.md`
a `podklady/_SPOLECNE_15_10.md` (větev `claude/davky-15-10`). Do
`test-draft` / `test` / `main` nic. Sloučení do `test` a celé kolo
s mutacemi dělá koordinační sezení J. V. (session_0191A71yUFarU952Vy7h2hc5).
Podrobnosti: CHANGELOG v15.10.1.

- **Hotovo (pushnuto):** B80 ověřen, že trval. Oprava: právo z matice
  `crm.pipedrive`, původ u GET, cache detailu 90 s, strop 30 načtení za
  hodinu na uživatele, číslo případu. Nová sada `netlify/test_pd_pristup.mjs`
  (19/29 → 48/0) je v `SADY`, mutace B80 chytily 8 z 8. Roadmapa #345 →
  hotovo (v15.10.1), ostatní body #345 ověřeny. Smoke 246/0/2 (test.js,
  overit_manual), `--kontrola` mutací 202 + 408. Podklady:
  `/home/user/kng_podklady_b80` (30 šablon, bez příručky).
- **Výchozí volby (k potvrzení J. V.):** `crm.pipedrive` výchozí Obchodník
  ne / Vedoucí ne (návrh ano, až bude výběr z CRM v rozhraní); strop 30
  čerstvých načtení detailu za hodinu; cache detailu 90 s.
- **Při slučování:** konflikty čekej jen v CHANGELOG, PREDAVKA, `verze.txt`
  a v seznamu `SADY` / konci `MUTACE` v `netlify/mutace.mjs`.
# Předávka — 15. 10. 2026: větev `claude/b89-b95` (v15.10.2), #347 informativní nálezy B89–B95

Dávka S2 (zadání `podklady/PROMPT_b89_b95.md` + `podklady/_SPOLECNE_15_10.md`
ve větvi `claude/davky-15-10`). Z `origin/test` 5a42369 (v14.10.8). Do
`test-draft` / `test` / `main` nic — sloučení a celé kolo s mutacemi dělá
koordinační sezení J. V. Podrobnosti: CHANGELOG v15.10.2, `BEZPECNOST_MEZE.md`
(oddíl „Informativní nálezy B89–B95").

- **Hotovo (pushnuto):** B89, B92, B93, B95 opraveny s testy a mutacemi;
  B91 uzavřen dokladem (revize #401); B90 a B94 vědomé meze; roadmapa #347
  hotovo (v15.10.2); verze, CHANGELOG, příručka (verze + novinka).
- **Testy:** `spust_testy.sh --smoke` 242 prošlo / 0 selhalo / 6 přeskočeno
  (bez podkladů); harnessy se šablonami z Disku (`KNG_PODKLADY`) zvlášť:
  `overit_nabidka_proj_word` 63, `overit_sablona` 99, `overit_sablony_online`
  53, `overit_sod` 49 — vše OK. `overit_manual` neběžel (příručka v15.10.2 se
  sestaví v integraci), `test.js` mimo export.
- **Rozhodnuto J. V. 15. 10.:** B90 nezpřísňovat (mez trvá); B94 varianta A
  — neměnit („zbytečný extrém, rozhodně ne teď").
- **Na vědomí:** B93 — po obnově účtů z otisku se dotčení uživatelé
  musí přihlásit znovu heslem z doby otisku.
- Podklady: `/home/user/kng_podklady_b89` (34 šablon, jen v tomto kontejneru).

---

# Předávka — 14. 10. 2026 noc: `test` = v14.10.8, celé kolo VŠE ZELENÉ

Noční dávky (pokyn J. V. 14. 10. večer) hotové a v `test`:
- v14.10.4 slovník a zápis v OR (kolo nad větví VŠE ZELENÉ, 224 min),
- v14.10.5 krycí list odeslané nabídky se dá doplňovat,
- v14.10.6 integrace slovník + krycí list,
- R1 roadmapa #405, #406; R2 dorovnání roadmapy za 13.–14. 10. (#407–#419),
- v14.10.7 O1 „jiné znění" v krycím listu respektuje zámek,
- v14.10.8 P1 zbytky češtiny v nabídce PROJ EN/DE/FR.
**Celé kolo nad ee0f6ff (v14.10.8) VŠE ZELENÉ (216 min 32 s):** sady
246/0/1, jádro 202/202, server 400/400, statické 3/3.

- `main` = eff7724 (v14.10.3) — dál nic bez potvrzení J. V.
- `test-draft` beze změny (v14.10.1).
- **Čeká na J. V.:** převod do `main`; releasy v14.10.3–v14.10.8 (odkazy
  v závěrečné zprávě); kontrola návrhů překladu P1 (popis ceny DPS, štítek
  „Požárně bezpečnostní řešení", díly popisů) — **SCHVÁLENO J. V.
  15. 10. 2026**, poznámky v kódu a CHANGELOG opraveny; roadmapa #366, #367, #369,
  #380 (bez dokladu uzavření) a #345 / B80 (opravit, nebo vědomá mez);
  souvislá próza `{ cz }` v nabídce PROJ EN/DE/FR (překládat?); body 4, 5,
  8, 9 připomínek obchodu; mazání sloučených větví.
- Podklady: `/home/user/kng_podklady_integrace` (šablony + příručka v14.10.8).

---

# Předávka — 14. 10. 2026 večer: noční dávky, `test` = v14.10.6 (slovník + krycí list)

Pokyn J. V. 14. 10. večer: „slovník sluč a rozběhni vše, co jsi naplánoval na
dnešní noc i zítřek. Vše řádně otestuj a veškeré změny pošli rovnou do
prostředí test. Do main nic, dokud to nepotvrdím." Plán dávek:
`podklady/DAVKY_2026-10-14_noc.md` (větev `claude/davky-14-10`).

- **`main`** = eff7724 (v14.10.3), dál nic bez potvrzení J. V.
- **`test`** = v14.10.6: v14.10.5 (krycí list odeslané nabídky se dá
  doplňovat) + sloučená `claude/slovnik-14-10` (v14.10.4: zápis v OR se
  nepřekládá, řádek AD ve slovníku) — větev `claude/integrace-14-10c`.
- **Koordinační sezení** session_0191A71yUFarU952Vy7h2hc5 slučuje výsledky
  nočních dávek do `test` a nakonec pouští celé kolo s mutacemi nad výsledným
  stavem (K1 tím odpadá). Dávky v samostatných sezeních:
  R1 `claude/k24-roadmapa-p5` (session_01HvZWAVHqyk6PE8w5bNZxfo),
  O1 `claude/kryci-jine-zneni` (session_01HL2oQfXzE1yqypbQZ3TQaS),
  P1 `claude/proj-preklad-zbytky` (session_01JAUuerdfMdVrsDZxSRjRAj),
  R2 `claude/roadmapa-13-14-10` (spustí se po R1).
- `test-draft` beze změny (v14.10.1).
- Podklady pro kolo: `/home/user/kng_podklady_slovnik-14-10` (šablony
  z Disku) — příručku sestavit znovu pro výslednou verzi.
# Předávka — 14. 10. 2026 večer: větev `claude/proj-preklad-zbytky` (v14.10.8), zbytky češtiny v nabídce PROJ

Z `origin/claude/slovnik-14-10` (774f269 — `test` sloučený slovník v14.10.6
v době založení ještě neobsahoval), zadání
`podklady/PROMPT_proj_preklad_zbytky.md` (P1). Do `test-draft` / `test` /
`main` nic — o sloučení rozhodne J. V. Podrobnosti: CHANGELOG v14.10.8.

- **Hotovo (pushnuto):** bod 2 pojistka `src/test_proj_zbytky_preklad.js`
  (17/52 → 69/0); bod 3 popis ceny DPZ/DPS hledá celou větu ve slovníku
  (příčina, proč DPZ zůstávala česky: kód skládal větu z dílů), hesla
  podle textu nabídky s překladem ze šablon PROJ v4/v5 (CENA NEZAHRNUJE,
  IČ ×3, hvězdička DPZ); bod 4 verze, CHANGELOG, příručka.
- **Schváleno J. V. 15. 10. 2026 (dříve NÁVRH PŘEKLADU, šablony větu nemají):**
  popis ceny DPS (EN „Preparation of the detailed design documentation,
  including structural and electrical design", DE „Erstellung der
  Ausführungsplanung einschließlich Statik- und Elektroplanung", FR
  „Établissement du dossier d'exécution, y compris structure et
  électricité"); díly pro jiné kombinace částí (včetně / PBŘ / STATIKY /
  STATICKÉ ČÁSTI / ELEKTRO PROJEKTU / STUDIE OSVITU / Zpracování projektu
  pro DPZ / Zpracování prováděcí dokumentace); štítek části 2 DPZ
  „Požárně bezpečnostní řešení" (EN „Fire safety design", DE
  „Brandschutzkonzept", FR „Conception de la sécurité incendie").
- **Dál zůstává česky (záměrně, překlad jen na pokyn J. V.):** souvislá
  próza `{ cz }` — úvody bloků STUDIE PROVEDITELNOSTI, DPZ, DPS; poznámky
  pod studií (2 paré, 5 pracovních dní, rozšíření studie do DPZ); řádky
  rozsahu studie a DPZ (vizuální prohlídka, PŮVODNÍ STAV, ROZSAH BOURÁNÍ,
  NAVRHOVANÝ STAV, situace stavby, dokumentace stávajícího/nového stavu,
  bourací dokumentace); zápis v OR (nepřekládá se).
- **Podklady:** šablony PROJ v4/v5 CZ/EN/DE/FR z Disku v
  `/home/user/kng_podklady_proj` (jen v kontejneru, mimo repo).
- **Testy:** `test_proj_zbytky_preklad.js` 17/52 → 69/0; `spust_testy.sh
  --smoke` po sestavení 212/0 (32 sad v prohlížeči přeskočeno — chyběl
  playwright). S `playwright@1.56.1` (sedí na Chromium 1194 v /opt/pw-browsers;
  novější verze padá na revizi prohlížeče) prošlo všech 230 sad smoke až po
  `overit_vypnuty_radek` (běh pak ukončil strop nástroje) a zbylé sady
  zvlášť: xss 338/0, zabrany_dokumenty 24/0, zadani_detail 53/0,
  zahranicni 56/0, zaloha_lista 58/0, zaokrouhleni 16/0, zaporne 15/0,
  zobrazeni 140/0 (zaporne a zobrazeni napoprvé spadly bez `ADMIN_EMAIL`
  / při souběhu; nad základem i větví se stejným prostředím zelené).
  `kontrola_udaju.py` čistá. Celé kolo s mutacemi pustí koordinační sezení
  při sloučení do `test`.
- **Další krok:** J. V. odsouhlasí návrhy překladu a rozhodne o sloučení;
  při sloučení s v14.10.5–7 ručně spojit `verze.txt`, CHANGELOG, příručku
  (`manual/obsah.json`) a PREDAVKA.

---

# Předávka — 14. 10. 2026 večer: větev `claude/slovnik-14-10` (v14.10.4), slovník a zápis v OR

Z `test` (v14.10.3, eff7724), zadání `podklady/PROMPT_slovnik_14_10.md`.
Do `test-draft` / `test` / `main` nic — o převodu rozhodne J. V.
Podrobnosti a testy před/po: CHANGELOG v14.10.4.

- **Hotovo (pushnuto):** bod 1 zápis v OR se nepřekládá (vrácen d9bedae,
  `test_firma_zapis.js` 19/72 → 91/0, příručka opravena); bod 2 řádek
  „100 % z celkové ceny za tuto činnost, fakturováno měsíčně" ve slovníku
  EN/DE/FR + odstavec AUTORSKÝ DOZOR (AD) se překládá
  (`test_proj_ad_preklad.js` 7/5 → 12/0).
- **Rozhodnuto J. V. 14. 10. 2026 („s tvými návrhy souhlasím") — výchozí
  volby dávky v14.10.2 platí, kód beze změny:**
  1. stará data bez volby AD (`proj.zadani.nabizetAD` chybí) = AD se tiskne;
  2. starší specifikace s vyplněným názvem akce = ruční přepis (nemění se);
  3. v kombinaci s P6 vyplňuje tabulka hodin krycího listu jen sloupec
     vedoucí strany (číslo OPR/OVP);
  4. AD v tabulce hodin „max. 30 h / měsíc", do celku se nepočítá.
- **Zápis v OR se nepřekládá** (J. V. 14. 10.) — platí trvale; nevracet
  vzory `PREKLAD_SOUDY`.
- **Co v online nabídce PROJ v EN/DE/FR dál zůstává česky (bez opravy,
  mimo zadání — k rozhodnutí J. V.):**
  - souvislá próza `{ cz }` záměrně česky: úvod bloků STUDIE PROVEDITELNOSTI,
    DPZ, DPS; poznámky pod studií (2 paré, 5 pracovních dní na připomínky,
    rozšíření studie do DPZ); řádky rozsahu studie a DPZ (vizuální
    prohlídka, PŮVODNÍ STAV, ROZSAH BOURÁNÍ, NAVRHOVANÝ STAV, situace
    stavby, dokumentace stávajícího/nového stavu, bourací dokumentace)
    a štítek části 2 DPZ („Požárně bezpečnostní řešení…" v závorce);
  - slovník je zná, ale znění se liší (pravděpodobně drobná neshoda textu):
    CENA NEZAHRNUJE „Součástí ceny není řešení samostatných řízení
    vyplývajících… péče, a řešení…" (slovník má „vyplývající… péče a"),
    INŽENÝRSKÁ ČINNOST „Podání a projednání… (Hasičský záchranný sbor, …)"
    (slovník bez závorky), popis ceny DPZ „Zpracování projektu pro DPZ,
    včetně PBŘ, STATIKY a ELEKTRO PROJEKTU" (ve slovníku je — prověřit,
    proč se nepoužije);
  - bez překladu: popis ceny DPS „Zpracování prováděcí dokumentace, včetně
    STATICKÉ ČÁSTI a ELEKTRO PROJEKTU", hvězdička DPZ „Cena je platná
    v případě návaznosti na STUDII PROVEDITELNOSTI.", IČ „V průběhu celého
    řízení komunikujeme…", „Vyřízení POVOLENÍ ZÁMĚRU (dle platného
    stavebního zákona…)".
- **Podklady:** `/home/user/kng_podklady_slovnik-14-10` (30 šablon z Disku
  — CN v7/v11/v13/v14/v15 + jazyky, PROJ v3/v4 + EN/DE/FR, SoD v1/v2, plná
  moc; příručka v14.10.4 ze snímků).
- **Další krok:** celé kolo s mutacemi nad touto větví (ověří i sloučený
  stav v14.10.3), výsledek do CHANGELOG a sem; release odkazy v14.10.3
  a v14.10.4.
# Předávka — 14. 10. 2026 večer: větev `claude/kryci-jine-zneni` (v14.10.7, O1)

- **`claude/kryci-jine-zneni`** nad `test` (v14.10.5, 3538875): „jiné znění"
  v krycím listu (`klVyber` / `klpVyber`) je nově v obalu zámku
  (`ZAMEK_CHRANENE` + `ZAMEK_KRYCI_FUNKCE`) — u pole nabídky zamčené
  varianty dialog „Uzamčená varianta", hodnota zůstane. Zadání
  `podklady/PROMPT_kryci_jine_zneni.md` (větev `claude/davky-14-10`).
- Testy: `overit_kryci_po_tisku.mjs` 19/27 → 27/27, `overit_lista.mjs`
  255/255, smoke 243/0/2 (přeskočeno `test.js` a `overit_manual.mjs` —
  příručka se v této dávce nesestavovala). Ruční mutace obalu 2/2 zabité.
  Server beze změny, mutace serveru netřeba.
- **Čeká na integraci:** celé kolo s mutacemi nad výsledným stavem pustí
  koordinační sezení J. V. při sloučení do `test`. Konflikty čekej
  v CHANGELOG, PREDAVKA a `verze.txt` (v14.10.6 drží I1).
- Podklady (šablony z Drive) `/home/user/kng_podklady_kryci-jine-zneni`.
  Na Disku je nová `Sablona_NABIDKA_PROJ_v5` (+EN/DE/FR, 14. 10.), ta se
  nestahovala. SoD v1 na Disku pod tím názvem není, místo ní jsou varianty
  bez čísla z 14. 8.

---

# Předávka — 14. 10. 2026 večer: `test` = v14.10.5 (krycí list odeslané nabídky), `main` = v14.10.3

- **`main`** = eff7724 (v14.10.3) — převod z `test` na pokyn J. V. 14. 10.
  („pošli aktuální test do main"), fast-forward.
- **`test`** = v14.10.5 z větve `claude/kryci-odemceny-14-10` (pokyn J. V.
  14. 10.: „krycí list by nemusel být zamčený … uprav a pošli do testu"):
  po tisku nabídky jsou v krycím listu zamčená jen pole nabídky, po SoD celý;
  sady 244/0/1, nové testy a mutace serveru 5/5 (CHANGELOG v14.10.5).
  Celé kolo s mutacemi nad v14.10.5 zatím neproběhlo — pustit při dalším
  sloučení. Podklady `/home/user/kng_podklady_kryci-14-10`.
- **`claude/slovnik-14-10`** (v14.10.4, nad v14.10.3): zápis v OR se
  nepřekládá, řádek AD ve slovníku, výchozí volby v14.10.2 rozhodnuté —
  nesloučeno, o převodu rozhodne J. V. Při sloučení do `test`: verze na
  další číslo, konflikty čekej v CHANGELOG, PREDAVKA, `manual/obsah.json`
  (úvod novinek) a `verze.txt`.
- `test-draft` beze změny.
- Pozn. mimo zadání: `klVyber` / `klpVyber` s volbou „jiné znění" mažou
  hodnotu pole bez dotazu na zámek (i u pole nabídky zamčené varianty →
  server pak uložení odmítne „Neuloženo"). Starší chování — opraveno ve
  větvi `claude/kryci-jine-zneni` (v14.10.7, nesloučeno).

---

# Předávka — 14. 10. 2026 odpoledne: `test` = v14.10.3 (připomínky obchodu + K23T-N1)

`test` = v14.10.3: sloučení `claude/pripominky-14-10` (v14.10.2, kolo zelené)
a `claude/k23-odm-prohluben` (v14.10.2, kolo zelené) na pokyn J. V. 14. 10.;
po sloučení kolo bez mutací VŠE ZELENÉ (sady 241/0/1, statické 3/3).
`test-draft` a `main` beze změny. Release v14.10.2 a v14.10.3 vydává J. V.

**Rozhodnutí J. V. 14. 10. k závěrečné zprávě v14.10.2:** výchozí volby
odsouhlaseny (AD u starých dat tisknout; starší název akce specifikace =
ruční; hodiny jen sloupec vedoucí strany; AD v hodinách „max. 30 h / měsíc"
mimo celek); **zápis v OR nepřekládat** (vrátit bod 6); řádek „100 % z celkové
ceny za tuto činnost, fakturováno měsíčně" doplnit do slovníku EN/DE/FR.
Řeší nové sezení ve větvi `claude/slovnik-14-10` nad `test` — zadání
`podklady/PROMPT_slovnik_14_10.md`; to sezení pustí i celé kolo s mutacemi
nad sloučeným stavem.

---

# Předávka — 14. 10. 2026: větev `claude/pripominky-14-10` (v14.10.2), připomínky obchodu

Z `test-draft` (v14.10.1, 823c61e). Připomínky D. Sikory a J. Laudy,
rozhodnutí J. V. 14. 10. Do `test-draft` / `test` / `main` nic — rozhodne J. V.
Podrobnosti a testy před/po: CHANGELOG v14.10.2.

- **Hotovo (pushnuto):** bod 1 autorský dozor jen když se nabízí (volba
  v kartě Cenová nabídka PROJ, výchozí NE, stará data jako dřív; šablona
  PROJ v5 `vyrob_sablony.js --proj-v5` — vyrobená v5 + EN/DE/FR je jen
  v `/home/user/kng_podklady_pripominky-14-10`, do aplikace ji nahraje J. V.);
  bod 2 název akce specifikace z hlavičky (ručně + ↺); bod 3 sokl ve
  specifikaci (společná `tsSoklRadek`); bod 6 zápis v OR v EN/DE/FR (vzor
  slovníku — návrh překladu ke kontrole); **hodiny z kalkulace** v krycích
  listech BO (zadání J. V. během dávky, návrh
  `podklady/NAVRH_HODINY_KRYCI_LIST_2026-10-14.md` odsouhlasen, celé hodiny);
  harness `overit_pripominky_14_10.mjs`; příručka (úvod v14.10.2).
- **Celé kolo VŠE ZELENÉ:** nad 1410141 mutace jádra 201/201, serveru 393/393,
  statické 3/3, sady 238/3/1 (dvojí id tabulky hodin, počet pravidel
  v overit_lista) → opraveno 8ffce8f, kolo bez mutací 241/0/1, statické 3/3.
  Podklady `/home/user/kng_podklady_pripominky-14-10`.
- **Převod do `test`** na pokyn J. V. 14. 10. (fast-forward z 823c61e);
  `test-draft` beze změny (rozhodne J. V.). Release odkaz v14.10.2 poslán.
- **Paralelně `claude/k23-odm-prohluben`** (K23T-N1, opláštěná prohlubeň P2):
  hotovo, kolo VŠE ZELENÉ, nesloučeno — čeká na J. V.
- **Výchozí volby k potvrzení:** stará data bez volby AD = AD se tiskne;
  starší specifikace s vyplněným názvem = ruční přepis (nemění se); v kombinaci
  s P6 má tabulka hodin vyplněný jen sloupec vedoucí strany (číslo OPR/OVP);
  AD v tabulce hodin „max. 30 h / měsíc", do celku se nepočítá.
- **Neřešeno dle zadání:** body 4, 5, 9; 7 prověřuje J. V.; 8 (Helios) jen návrh.
# Předávka — větev `claude/k23-odm-prohluben` (v14.10.2, 14. 10. 2026)

Z `test` (823c61e, v14.10.1). Oprava nálezu K23T-N1 (opláštěná prohlubeň P2
nejde uložit) — detaily v CHANGELOG v14.10.2 této větve. Do `test-draft`,
`test` ani `main` nic; **B134 (0af419c) se nesmí dostat do `main` bez téhle
opravy.** Ověření pro J. V. po nasazení na test: zakázka TEST s prohlubní
a „Opláštit i prohlubeň" se uloží, vytiskne a zamkne („shoda"); v kole 24
projdou C001, C018, C029, C035, C046, C063. **Celé kolo nad 4717864 VŠE
ZELENÉ** (sady 235/0/1, jádro 194/194, server 395/395, statické 3/3).
Při slučování s `claude/pripominky-14-10` (taky v14.10.2): konflikty čekej
v CHANGELOG, PREDAVKA, `mutace_jadro.mjs` (nové mutace obou větví) a verzi.

---

# Předávka — 14. 10. 2026 ráno: noční integrace v14.10.1 zelená (`claude/integrace-14-10`)

Noční větve `claude/listy-404`, `claude/bezpecnost-noc`,
`claude/vyjimky-schvalovani`, `claude/prirucka-13-10` (každá s vlastním
zeleným kolem) sloučeny do `claude/integrace-14-10` nad v13.10.2 = v13.10.4;
**celé kolo nad b51af9b VŠE ZELENÉ** (sady 235/0/1, jádro 193/193, server
393/393, statické 3/3); zápis výsledku = v14.10.1 (jen verze a dokumentace).

Čeká na J. V.: převod do `test-draft` a `test` (push do sdílených větví
zablokovalo oprávnění sezení — fast-forward z 1df7283, stačí převést
`claude/integrace-14-10`); `main` až po ověření na testu; release odkaz
v14.10.1 (zahrnuje v13.10.2–v13.10.4).

Otázky (výchozí): (1) celá starší verze ceníku u obchodníka = cenová výjimka
do schvalování (ano); (2) přidělit Vedoucímu právo sleva.schvalovani v matici
(ano); (3) mez pásu „jiné“ = nejnižší ceníková sazba opláštění pro typ šachty
(ano); (4) rozměr pod 0,6 m = 400 (ano); (5) chybné staré heslo u „Změnit
heslo“ odhlásí — opravit (ano, další dávka); (6) příručka: kurzíva (ano),
novou příručku na Disk nahraje J. V. Příručka v14.10.1 k nahrání se sestaví
`manual/sestav.sh` ze snímků (`node manual/snimky_auto.mjs`).

---

# Předávka — 13. 10. 2026 večer: v13.10.2 zelená, převod do test-draft a test; noční dávky

Integrace tří větví (`claude/davka-13-10`, `claude/cenik-barvy`,
`claude/k22-p2-p6`) = v13.10.2 ve větvi `claude/integrace-13-10b`, **celé kolo
VŠE ZELENÉ** (sady 232/0/1, jádro 193/193, server 358/358, statické 3/3).
Převod do `test-draft` a `test` (pokyn J. V.) — push zablokovalo oprávnění
sezení, čeká na J. V. (fast-forward z 1df7283). Do `main` až po ověření na testu.

Odpovědi J. V. z dialogu 13. 10. (artefakt „KNG rozhodnutí 13. 10.“):
lišty #404 ano dle návrhu; B35 cas/ jen pro existující zakázku; B77 citlivé
akce správce s heslem; směs ceníku do schvalování; pás „jiné“ do schvalování;
meze rozměrů jen zdvih, šířka, hloubka < 0,6 m (ostatní neřešit); test ano;
main po ověření na testu; větve NEmazat; popisy starších releasů NE;
příručka ano. Další dávka: všech šest bodů.

Noční větve (z `claude/integrace-13-10b`, každá s celým kolem):
| Větev | Stav |
|---|---|
| `claude/prirucka-13-10` | hotovo 846c502, kolo zelené |
| `claude/listy-404` | hotovo 181fdd1, kolo zelené |
| `claude/bezpecnost-noc` | hotovo 2f98268, kolo zelené |
| `claude/vyjimky-schvalovani` | běží |
Ráno: integrace nočních větví do nové verze, celé kolo, převod na pokyn J. V.

# Předávka — větev `claude/listy-404` (v13.10.3, noc 13./14. 10. 2026)

Z `claude/integrace-13-10b` (v13.10.2). Roadmapa #404 — lišty rozpracované
a odeslané zakázky podle návrhu odsouhlaseného J. V. 13. 10. 2026. Do
`test-draft` nic (rozhodne J. V.). Detaily a testy před/po: CHANGELOG v13.10.3.

- **Hotovo:** model `listaZakazkyRozhodni` (zamek.js) + Node test; jediná
  žlutá lišta „Rozpracovaná kalkulace" (Pokračovat / Založit novou, odkaz
  Zahodit zálohu), odeslaná jedním řádkem, modrý pruh Odemknout k úpravám
  jen s právem `zamek.odemknout`, cizí zakázka jen Založit novou; záloha
  odeslané nabídky se nenabízí; zakázka jen ke čtení nepřepisuje zálohu;
  příručka (kap. 8, 29, slovníček); harnessy overit_zaloha_lista, overit_online,
  overit_v23, overit_manual.
- **Kolo nad 7e19e40 VŠE ZELENÉ:** sady 233/0/1 (test.js), jádro 193/193, server 358/358, statické 3/3.
- **Výklady k potvrzení (výchozí v závorce):** odeslaná = aktivní varianta
  zamčená (ano — klon odeslané má žlutou lištu); v oranžové liště zůstalo
  „Založit novou zakázku" (ano); zápis do odeslané nabídky jen ke čtení
  nabídne klon místo odemknutí okna (ano).
- **Při slučování:** příručku obchodníka přegenerovat z `manual/obsah.json`
  (kopie podkladů pro kolo: `/home/user/kng_podklady_listy-404`, obsah
  příručky vložen z této větve).

---

# Předávka — větev `claude/bezpecnost-noc` (v13.10.3, noc 13./14. 10. 2026)

Subagent sezení session_01WrUq3gXEhsWk8cxRWfPvsg, z `claude/integrace-13-10b`
(v13.10.2). Zadání J. V. 13. 10. 2026 (obojí „Ano"): B35 a B77. Detaily
a testy před/po: CHANGELOG v13.10.3. Do `test-draft` nic — na pokyn J. V.

- **B35 hotovo** — klíč `cas/` v analytice jen pro zakázku z rejstříku.
- **B77 hotovo** — založení správce, povýšení na správce, reset cizího hesla
  a obnova účtů z otisku chtějí `hesloSpravce` (UI se ptá dialogem).
- **Celé kolo VŠE ZELENÉ** nad 9756817: sady 232/0/1, jádro 193/193,
  server 368/368, statické 3/3.
- Při slučování: konflikty čekej v `netlify/mutace.mjs` (nové mutace B35/B77),
  `netlify/test_prava.mjs` (matice + blok B77), `src/ui/online_ui.js`
  (onlineApi, správa účtů, obnova). Roadmapa needitována (B35 je v položce
  „Dlouhodobě otevřené nízké nálezy", B77 v F5) — doplní integrace.

# Předávka — 13. 10. 2026 noc: větev `claude/vyjimky-schvalovani` (v13.10.3)

Subagent sezení session_01WrUq3gXEhsWk8cxRWfPvsg. Větev z `claude/integrace-13-10b`
(v13.10.2, 0512c51). Do `test-draft`/`test`/`main` nic. Detaily: CHANGELOG v13.10.3.

## Hotovo (pushnuto)
- 801f2ff — mez 0,6 m pro zdvih, šířku a hloubku (nový zámek OCK 400, zábrana „rozmery").
- a168f6c — cenové výjimky (`src/vyjimky.js`): směs ceníku a pás „jiné" pod
  ceníkovou sazbou → schválení nadřízeným (karta „Cenové výjimky" v záložce
  Schvalování, server 403 u nového zámku bez schválení).
- 15f6a53 — testy #395 V3 / B136 čtou větu V3, overit_lista 34 pravidel.
- **Celé kolo nad 15f6a53 VŠE ZELENÉ** (sady 234/0/1, jádro 193/193, server 383/383, statické 3/3).

## Otázky pro J. V. (výchozí odpověď)
1. Celá starší verze ceníku (kvitance „ceny jsou dohodnuté") se taky liší od
   platného → u obchodníka do schvalování. *Výchozí: ano.*
2. Schvaluje tentýž nadřízený jako slevy (`sleva.schvalovani`, výchozí matice
   ho Vedoucímu nedává — jen administrátor). *Výchozí: ano, přidělit v matici.*
3. Mez pásu „jiné" = nejnižší kladná ceníková sazba opláštění šachty. *Výchozí: ano.*
4. Kód odmítnutí rozměru pod 0,6 m je 400 (jako B137), ne 403. *Výchozí: ponechat.*

---

# Větev `claude/prirucka-13-10` (v13.10.3) — příručka obchodníka

Z `claude/integrace-13-10b` (v13.10.2). Příručka (`manual/obsah.json`,
snímky, renderer) aktuální k v13.10.2: P6 zámek strany, P2, barvy ceníků,
B77-zbytek, B6, B101; detaily CHANGELOG v13.10.3. Hotové HTML jen
v `/home/user/kng_podklady_prirucka-13-10` (sestavit znovu:
`node manual/snimky_auto.mjs <mimo repo>/snimky.json` a
`bash manual/sestav.sh <snimky.json> <složka>`).
- **Navazující po integraci #404 (`claude/listy-404`):** kapitolu o lištách
  rozpracované/odeslané zakázky (kap. 6, 8, 29) přepsat podle nových lišt
  a přefotit snímky — tady se vědomě neměnila.
- Kolo: viz CHANGELOG v13.10.3.

# Předávka — 13. 10. 2026: dávka po 22. kole ve větvi `claude/davka-13-10` (v13.10.1)

Sezení session_01WrUq3gXEhsWk8cxRWfPvsg (založilo koordinační sezení 22. kola).
Větev z `test-draft` v12.10.4 (1df7283). Do `test-draft`/`test`/`main` nic —
na pokyn J. V. Detaily a testy před/po: CHANGELOG v13.10.1.

## Hotovo (pushnuto)
- Pravidlo J. V. 13. 10.: odkaz na release s popisem změn — `CLAUDE.md`,
  `nastroje/release_odkaz.py` (+ test). Skilly needitovány — pravidlo doplnit
  do skillu `kalkulator-next-gen` (oddíl releasy) ručně.
- A (#402) hlídač harnessů + `timeout` v `spust_testy.sh`.
- #400 zbytek: B138, B77-zbytek, B107 (+B42, B25), B129, B130 → #400 hotovo.
- F (#403): B83, B81, B103, B101, B105, B6, B35 — všechny body F hotové.

- Revize dávky (audit dvěma čočkami, jen čtení): vysoký nález žádný; opraveno
  regrese B105 (409 po tisku), obchvaty B101, B138 (výslovná nula), B103,
  souběh B6, drobnosti — CHANGELOG „Revize dávky".
- **Celé kolo nad dd9c24b VŠE ZELENÉ** (sady 228/0/1, jádro 189/189, server
  346/346, statické 3/3). Kolo nad ea34e65 bylo červené (B133 ×2, platnost
  relace, literál hesla) — opraveno.

## Běží / čeká
- Paralelně (subagenti tohoto sezení, zadání J. V. 13. 10. odpoledne):
  - `claude/k22-p2-p6` z 1df7283 — P2 „Opláštit i prohlubeň", P6 zámek strany
    (vynulování druhé strany, ruší „Počítat i tuhle stranu"); prompt
    `PROMPT_PARALELNI_VETEV_K22_P2_P6.md` (kopie mimo repo v kng_podklady/prompty).
    Konflikt čekej v `zahrJenRealizaceNabidnout` (B129 tady × P6 tam).
    **Hotovo:** a42f9ea, kolo zelené (sady 226/0/1, jádro 193/193, server
    345/345 po vyřazení nedosažitelné mutace B137 „dokument strany PROJ").
  - `claude/cenik-barvy` z 1df7283 — probarvení buněk ceníků (0/prázdné světle
    červeně, Kč > 40 000 světle oranžově), odebrání „Historická kalkulace".
    **Hotovo:** 10fd294, kolo zelené (sady 221/0/6 — 5 harnessů bez podkladů,
    jádro 189/189, server 333/333, statické 3/3).
  - Všechny tři větve nesou v13.10.1 → při integraci nová verze.
- #404 lišty — návrh níže, čeká na J. V.

## Návrh #404 — lišty rozpracované / odeslané zakázky (k odsouhlasení)
Dnes jsou to tři nezávislé mechanismy: (1) žlutá „V prohlížeči je
rozpracovaná kalkulace… Obnovit / Zahodit zálohu" (`historie.js`, záloha
v prohlížeči), (2) oranžová lišta zámku „odeslaná nabídka – needituje se…
Klonovat / Založit novou" (`zamek_ui.js`), (3) modrá „Nabídka je otevřená jen
ke čtení… Odemknout k úpravám" (`common.js` zamekCteniLista) + štítek dole.
Návrh (výchozí odpovědi J. V. v závorkách):
1. Neodeslaná zakázka (žádná varianta vytištěná): jediná žlutá lišta
   „Rozpracovaná kalkulace <číslo · název>, naposledy <kdy>" s tlačítky
   **Pokračovat v rozpracované kalkulaci** (= obnoví zálohu z prohlížeče, je-li
   novější, a odemkne režim jen ke čtení) a **Založit novou kalkulaci**.
   Modrá lišta „jen ke čtení" u neodeslané vlastní zakázky odpadá — tu
   roli převezme žlutá. Zahodit zálohu = malý odkaz v liště (ano).
2. Odeslaná zakázka: žádná žlutá lišta ani nabídka zálohy (záloha odeslané
   zakázky se tiše zahodí — ano). Zůstane jen jednořádková informace
   „Odeslaná nabídka (… vytištěno …) — needituje se" s tlačítky Klonovat
   a pokračovat / Založit novou (ano, bez dlouhého textu).
3. Administrátor (a vedoucí? — výchozí: jen role s právem `zamek.odemknout`
   v matici zobrazení, dnes administrátor) vidí u odeslané nabídky modrý pruh
   **Odemknout k úpravám** (odemkne zámek varianty s potvrzením a záznamem).
   Obchodník modrý pruh nevidí.
4. Cizí neodeslaná zakázka (autor jiný obchodník): žlutá lišta jen s
   „Založit novou kalkulaci" a větou, kdo ji založil (zachová B-pravidlo
   zamekCteniSmiOdemknout).
Rozsah: `historie.js`, `zamek_ui.js`, `common.js`, harnessy
overit_zaloha_lista / overit_online / overit_dialogy / overit_neulozene;
odhad 1 dávka (½ dne). Po odsouhlasení samostatná větev.

## Otázky pro J. V. (výchozí odpověď)
1. B6: odhlášení odhlásí účet na všech zařízeních (ano — jinak by server
   musel vést seznam relací).
2. B35: strop 5 000 zakázek s měřeným časem (ano).
3. #404 návrh lišt výše (ano, jak je napsáno).

# Předávka — 13. 10. 2026: větev `claude/cenik-barvy` (v13.10.1)

Paralelní větev z `test-draft` (1df7283, v12.10.4) podle zadání J. V. 13. 10. 2026:
1. **Probarvení buněk ceníků OCK a PROJ** — 0/prázdné světle červeně, > 40 000 Kč
   (jen položky s jednotkou „Kč…") světle oranžově; živě při psaní, jen vzhled.
2. **Odstraněno tlačítko „↩ Historická kalkulace…"** (lišta OCK/PROJ, seznam
   kalkulací) i s oknem a modelem archivu; `puvodPopis` zůstává pro staré varianty.
Výklad, testy před/po: CHANGELOG v13.10.1. Do `test-draft`/`test`/`main` nic —
o sloučení rozhoduje J. V. (u sloučení: verze se srovná, CHANGELOG/PREDAVKA ručně).
**Kolo VŠE ZELENÉ:** sady 221/0/6, mutace jádra 189/189, serveru 333/333, statické 3/3.
Otevřené: prázdná Cena Zahraničí („jako ČR") červeně nesvítí; pole přirážky a DPH
nad tabulkou se neprobarvují — výchozí výklad, změní se na pokyn.

# Předávka — 13. 10. 2026: paralelní větev `claude/k22-p2-p6` (P2 + P6, v13.10.1)

Subagent sezení session_01WrUq3gXEhsWk8cxRWfPvsg podle promptu J. V.
`PROMPT_PARALELNI_VETEV_K22_P2_P6.md`. Větev z `test-draft` = `1df7283`
(v12.10.4). Do `test-draft`/`test`/`main` nic; o sloučení rozhoduje J. V.
Netlify: produkční větve jsou `main` (ostrá) a `test` (testovací), branch
deploy pro `claude/…` v `netlify.toml` ani v `NASAZENI_NETLIFY.md` není.

| Bod | Stav |
|---|---|
| P2 — „Opláštit i prohlubeň" | hotovo (commit P2), test `src/test_oplastit_prohluben.js` (1/5 → 7/0) |
| P6 — zámek strany: vyřazená strana zamčená a vynulovaná | hotovo (commit P6), `src/test_zamek_strany.js` (17/31 → 52/0), server blok P6 v `netlify/test_koncova_cena.mjs` (74/5 → 82/0), UI v `overit_zahranicni.mjs` |
| celé testovací kolo | hotovo (2 části kvůli 2h limitu procesu): sady 226/0/1, mutace jádra 193/193, serveru 345/346 → nedosažitelná B137 mutace vyřazena s komentářem, statické 3/3 — CHANGELOG |

Rozhodnutí D6a–D6g a výklady: CHANGELOG, oddíl „větev claude/k22-p2-p6".
Další krok (J. V.): rozhodnout o sloučení do `test-draft` (verze se
sjednotí s v13.10.1 z `claude/davka-13-10`); po sloučení ověření podle
promptu (TEST zakázka OPR/OVP, K22-C001).

Otevřené otázky pro J. V. (s výchozí odpovědí, jak je ve větvi):
1. Serverové kontroly „nikomu" (záporné částky B111, rozměry B137 při
   uložení, typy #340) platí dál i pro data vyřazené strany — uvolněné jsou
   jen kontroly nového zámku. *Výchozí: ponechat.*
2. Otisk souhrnu nového zámku (`zamek.otisk`, z porovnání variant) nese
   u čísla OPR jen OCK (archiv „odesláno za"); zmrazený výsledek
   `zamek.vysledek` dál obě strany. *Výchozí: takto.*
3. Snímky obrazovky v příručce (lišta zámku strany) se nepřegenerovaly.
   *Výchozí: přegenerovat při příští dávce příručky.*
4. Zakázky v ostré, které dnes počítají obě strany (čísla obou stran,
   dřívější tlačítko), po nasazení ukážou druhou stranu vynulovanou
   a kontrola „stranyDriv" na to upozorní. *Výchozí: bez migrace dat.*

Souběžně: větev `claude/davka-13-10` mění `zahrJenRealizaceNabidnout`
(`src/zakazka.js`, B129: nic nenabídne u zakázky se zamčenou variantou) —
při slučování s P6 čekat konflikt v téže funkci (P6 přidává podmínku D6f
a mění návratovou hodnotu na `'zrusitJenOck'`); obě podmínky ponechat.


**Celé kolo nad b2181e9 VŠE ZELENÉ** (sady 232/0/1, jádro 193/193, server 358/358, statické 3/3).
---

# Předávka — 12. 10. 2026 noc: integrace N1–N3 ve větvi `claude/integrace-13-10` (v12.10.4)

Integrační subagent koordinačního sezení session_01CKiH2sXWq6U8xoJwqivhiN.
Větev z `test-draft` (v12.10.2) + merge N1 (`claude/koncova-cena-398`), N2
(`claude/sablony-399`), N3 (`claude/slovnik-hromadne`) a `claude/kolo22-v12.10.2`.
Konflikty a jejich řešení: CHANGELOG v12.10.4. Roadmapa: #398, #399 hotovo,
#400 čeká (B138, B77-zbytek, B107, B129, B130), #401 hotovo.
Do `test-draft`/`test`/`main` nic — převod dělá koordinátor po zeleném kole.
**Celé kolo VŠE ZELENÉ** (105 min 57 s): sady 224/0/1, mutace jádra 189/189,
serveru 333/333, statické 3/3. Další krok (koordinátor): převod do `test-draft`
a `test`, release odkaz v12.10.4 pro J. V.

---

# Předávka — 12. 10. 2026 večer: 22. kolo hotové, noční dávky N1–N3 běží

Koordinační sezení **session_01CKiH2sXWq6U8xoJwqivhiN** (22. kolo nad v12.10.2), větev
`claude/kolo22-v12.10.2`. `main` = v12.10.1 (86be538), `test-draft` = `test` = v12.10.2 (d562da1).

**Kolo VŠE ZELENÉ** (82 min): sady 222/0/1, mutace jádra 169/169, serveru 249/249, statické 3/3.
**Audit: 5 nových VYSOKÝCH** (B133–B137, obchodník zamkne nabídku se sníženou cenou bez schválení;
B134 záporná rezerva i v běžném UI) — platí i v ostré v12.10.1 (ověřeno pokusem). Celkem B133–B150;
roadmapa #398 (vysoké), #399 (střední), #400 (nízké/info). Na Disku (Testovani): audit
`2026-10-12_kalkulator_BEZPECNOSTNI_AUDIT_v12.10.2.md` (1d5W08MWoOWdVOj9pdm20z5bOd92f5rXX),
`TESTOVACI_PROTOKOL_2026-10-12_v12.10.2.xlsx`, `STAV_KOLO22_2026-10-12.md`.

**Pokyn J. V. 12. 10. (večer):** „souhlasím s výchozími, dokonči N3, spusť N1 a N2 po kole, následně
commit do test. stále platí do ostré main nic neposílej.“ Výchozí odpovědi: B138 opravit jako nález;
B137 server odmítne každé uložení s rozměry ≤ 0 (prázdné ≠ nula).

| # | Dávka | Sezení / větev | Stav |
|---|---|---|---|
| N1 | #398 B133–B137 (+ B145, mutace B128) | session_01D1a2z6V9wHr72cRN43yLjt / `claude/koncova-cena-398` | běží |
| N2 | #399 + část #400 (šablony B139–B143, B100-zbytek, B144, B146–B150) | session_01Jg4PxyyuYpMpQprT1UPipw / `claude/sablony-399` | běží |
| N3 | slovník: tabulka J. V. (44 znění), hromadné převzetí, slovník na serveru jako ceník (#401) | subagent tohoto sezení / `claude/slovnik-hromadne` | běží |
| N5 | integrace N1–N3 do `claude/integrace-13-10`, celé kolo, pak `test-draft` a `test` (NE `main`), release odkazy | toto sezení (nebo nástupce) | čeká |

Konflikty k čekání při integraci: `roadmapa/roadmap.json` (#398–#400 zde, #401 v N3), `CHANGELOG.md`,
`PREDAVKA.md`, `src/uloziste.js` (N1 i N2 B144), verze (každá větev v12.10.3 → při integraci nová verze dne).

Podklady v kontejneru: `/home/user/kng_podklady` (CN v14/v15, PROJ v3/v4, SoD v2, plná moc, příručka v12.10.2).
Worktree: `/home/user/kng_audit` (test-draft, jen čtení), `/home/user/kng_main` (main), `/home/user/kng_slovnik` (N3).

---

# Předávka — 12. 10. 2026 večer: větev `claude/koncova-cena-398` (v12.10.3, #398)

Noční dávka N1 (založilo koordinační sezení 22. kola session_01CKiH2sXWq6U8xoJwqivhiN,
pokyn J. V. 12. 10.). Větev z `test-draft` v12.10.2 (d562da1). Do `test-draft`,
`test` ani `main` se z této větve nic nepouštělo — integraci dělá koordinační
sezení. Roadmapa #398 je v koordinační větvi `claude/kolo22-v12.10.2`
(tady jen odkaz v CHANGELOG).

## Hotovo
- B134, B133, B135 (+B145), B136, B137, B150a — viz CHANGELOG v12.10.3;
  nová sada `netlify/test_koncova_cena.mjs`, mutace serveru doplněny.
- Nezávislá revize (2 subagenti): N1 `cenik.jenZahr`, N2 `nepocitat`,
  Model 1 (`ock.fixes`), N3 záporná sazba pásu „jiné", N4 dotisk jiné
  strany — opraveno (028edad); mutace jádra K17-N91 přesměrovány (c8aecb4).
- Kolo nad 0af419c: červené jen kvůli věcem opraveným v 028edad/c8aecb4
  a staré verzi příručky v podkladech (kopie přejmenována na v12.10.3).
- **Celé kolo nad 7291879 VŠE ZELENÉ** (sady 223/0/1, mutace jádra
  169/169, serveru 278/278, statické 3/3; 102 min 44 s).
- Nízký nález mimo zadání: `overit_online.mjs` po selhání testu B59 neskončí,
  ale visí (page.evaluate) — kolo pak stojí; výchozí: opravit v příští dávce.

## Otázky pro J. V. (s výchozí odpovědí)
1. **Výjimka B113** (nová zakázka s celým ceníkem sestavení se uloží, i když
   je ceník zveřejněný) — zadání ji navrhovalo zrušit, test e4 ji chce.
   Po B133 + B136 z ní nevznikne směs ani zámek. *Výchozí: ponechat.*
2. **Věcné meze rozměrů a počtů** (revize, střední): zdvih 0,001 m, hloubka
   0,01 m, nástupiště 0/0,5, sloupky 2,5, čistý vstup širší než šachta
   projdou (i v UI) a sníží cenu o 4–40 %. *Výchozí návrh: na novém zámku
   OCK zdvih ≥ 2 m, šířka i hloubka ≥ 0,8 m, rozteč ≥ 0,5 m, sloupky
   a nástupiště celé číslo ≥ 1 (sloupky ≥ 4), čistý vstup + 2× rám ≤ šířka —
   čísla potvrdí J. V.; do té doby beze změny.*
3. **Kladná ruční sazba pásu „jiné"** (1 Kč/m²) — funkce UI pro atyp,
   cenu sníží (−17 %). *Výchozí: ponechat jako obchodní rozhodnutí,
   případně do schvalování.*
4. **Záporná přirážka sekce PROJ / globální přirážka** administrátora —
   ponecháno jako vědomá výjimka (BEZPECNOST_MEZE.md). *Výchozí: ponechat.*

## Další krok
Koordinační sezení: sloučit `claude/koncova-cena-398` do `test-draft`
(po zeleném kole), release v12.10.3 dle pokynu J. V.

---

# Předávka — 12. 10. 2026 večer: noční dávka N2 ve větvi `claude/sablony-399` (v12.10.3)

Sezení N2 (založené koordinačním sezením 22. kola session_01CKiH2sXWq6U8xoJwqivhiN).
Větev z `test-draft` v12.10.2 (d562da1). Do `test-draft`/`test`/`main`
nic — integraci dělá koordinační sezení (souběžně N1 v `claude/koncova-cena-398`
mění `src/uloziste.js` a `lib/zakazka_kontrola.mjs`; N2 v `uloziste.js` jen
malý strop B144 v `uloZaporneVZadani`, `zakazka_kontrola.mjs` netknuta;
konflikt čekej ve `verze.txt`/CHANGELOG/PREDAVKA).

Hotovo (detail v CHANGELOG v12.10.3): B139, B140, B141, B142 (+ R1 z revize),
B143, B100-zbytek, B144, B146, B147, B148, B149 (mez), B150. Testy
před/po: test_sablona_obsah 77/23 → 114/0 (s podklady), test_obnova 192/8 →
200/0, test_profil 37/1 → 38/0, test_zaporne 30/3 → 33/0, test_prava 742/4 →
746/0, overit_xss 323/3 → 326/0. Revizní subagent (jen čtení): žádný obchvat
B139–B143; našel falešné odmítnutí (R1: bajty PK\x05\x06 v obrázku) —
opraveno tak, že B142 i #395 drží.

Celé kolo VŠE ZELENÉ: mutace jádra 188/188, serveru 275/275, statické 3/3,
sady 222/0/1 (opakované po přejmenování kopie příručky na v12.10.3).

Podklady v `/home/user/kng_podklady` (20 souborů vč. CN v15, SoD v2,
příručky přejmenované na v12.10.3) — firemní šablony kontrolou projdou všechny.

Otevřené (výchozí odpověď v závorce): B149 přísné ověření zámku i v obnově
(ne, ponechat jako mez); roadmapa #399/#400 — zápis nechávám koordinačnímu
sezení (ano).

---

# Předávka — 12. 10. 2026 večer: větev claude/slovnik-hromadne = v12.10.3 (#401)

Paralelní větev z `test-draft` v12.10.2 (d562da1); do `test-draft` jen na
pokyn J. V. Zadání J. V. 12. 10.: slovník ukládat jako ceník, hromadně převzít
odlišné znění, převzít jeho tabulku `SLOVNIK_ENG_2026-10-12.xlsx`.

Hotovo: tabulka převzata do `src/preklad.js` (44 rozdílných, 0 doplnit,
0 nových); tlačítko „Převzít všech N z tabulky"; `/api/slovnik` (zveřejnění
jen Administrátor, verze + historie, kontrola tvaru, strop 1 MB), klient
položí platný slovník po přihlášení, Nastavení → Slovník „Zveřejnit slovník";
slovník v záloze, otisku i obnově; roadmapa #401. Nálezy nezávislé revize
#401 (N1 razítko slovníku v zámku + upozornění při dotisku, N2–N7) opraveny
ve stejné větvi. Testy a výsledek kola (VŠE ZELENÉ nad d493a2b) v CHANGELOG
v12.10.3.

Čeká na J. V.: sloučení do `test-draft`; po nasazení slovník jednou
zveřejnit (tabulka je už v kódu, takže první verze ponese jen případné
další odchylky); odchylka od zadání — strop délky hesla 1000 místo 300
(zabudovaná hesla mají až 419 znaků).

---

# Předávka — 12. 10. 2026 odpoledne: main = v12.10.1, test = v12.10.2

`main` = **v12.10.1** (86be538, pokyn J. V. „pošli stávající test do main";
release vydán). `test-draft` = `test` = **v12.10.2** (B126 vysoká, B127,
B128, B131 z auditu 6. 10.; šablony CN v15; větev `claude/b126-cn-v15`).
Celé kolo zelené (sady 222/0/1, mutace jádra 169/169, serveru 249/249).

Šablony pro ostrou i test poslány J. V. (CN v15 + EN/DE/FR, PROJ v4 +
EN/DE/FR, SoD realizace v2, SoD projekce v2) — `nastroje/vyrob_sablony.js`
`--cn-v15`. V ostré byla platná CN v13: varování průvodce „chybí
PODM_ZALOHA1_PROC, PODM_FAKTURA2_PROC" je správně (od v14 platební kalendář).

Čeká na J. V.: release v12.10.2; 22. kolo (protokol + audit, B-čísla od
B133) — výchozí: další krok; zbytek auditu 6. 10.: B129, B130 (nízké),
B132 (info); smazání sloučených větví; převod v12.10.2 do main.

Prostředí: podklady v `/home/user/kng_podklady` (15 šablon + v15 + SoD v2 +
příručka přejmenovaná na v12.10.2). Klon kontejneru byl mělký — před
porovnáním s `main` `git fetch --unshallow origin`.

---

# Předávka — 12. 10. 2026: v12.10.1 v test-draft i test

`test-draft` = `test` = **v12.10.1** (pokyn J. V. 12. 10.: „po dokončení pošli
do testu a odkaz na release"). Obsahuje #395 (v8.10.1, větev
`claude/cenik-395`) a #396 (větev `claude/nabidka-usazeni-telefon`):
usazení OCK v nabídce podle specifikace (levá/pravá boční stěna, řádky bez
volby pryč; Word CN v14 je dostane do řádku „boční stěny"), tlačítko
Kontakt… u účtů. Telefon D. Sikory opravil J. V. v profilu (chyba v účtu).
`main` = v30.9.1. Release v6.10.1 a v12.10.1 čekají na J. V.

Čeká na J. V.: B126 (vysoká) + B127, B128, B131 z auditu 6. 10. (výchozí:
oprava v nové větvi), pak 22. kolo; šablona CN v15 s vlastními řádky levé
a pravé boční stěny (výchozí: není nutná, v14 funguje sloučeně); smazání
sloučených větví (`claude/cenik-395`, `claude/nabidka-usazeni-telefon`
a seznam z 8. 10.); převod do `main`.

---

# Předávka — stav k 8. 10. 2026 (#395 ve větvi claude/cenik-395, v8.10.1)

Sezení session_01DrQLceJMdr6XWCvRcFSjbY (založené ze session_01FbEVKCocjc6ZDk2hyoDe3k).
`main` = v30.9.1, `test` = `test-draft` = v6.10.1 (4bbceef). Release v6.10.1
zatím nevydán (odkaz J. V. poslán 8. 10.; releasy do v2.10.1 včetně).

Pokyn J. V. 8. 10.: „souhlasím s výchozími návrhy, začni #395". Mail
D. Sikory z 18. 9. (role zadavatele / sleva do CN) ověřen jako vyřešený:
v25.9.6 (volba role z karty slevy zmizela, server roli bere z relace)
a v29.9.1 #364 (činnosti PROJ v nabídce za cenu před slevou) — obojí v `main`.

## Hotovo ve větvi `claude/cenik-395` (z test-draft v6.10.1) — v8.10.1

| Bod | Co | Testy |
|---|---|---|
| V3 | server odmítne NOVÝ zámek role bez práva obou ceníků z ceníku bez cen / s cenou nabídky 0 (`zakazka_kontrola.mjs`, `zamekNovyCenaProblem`); odchylka od návrhu: výměnu ceníku server udělat nejde (zakázku nevrací) | test_prava 694/4 → 698/0 |
| N2/N3 | kid v každém výskytu + `volitelneVlastni`; katalog PROJ z uložených variant (`uloziste.js`) | test_prava 699/4 → 703/0 |
| S2 | vědomá mez (`BEZPECNOST_MEZE.md`) | — |
| šablony | kódování (UTF-16 bez BOM, UTF-32, deklarace ≠ UTF-8/16), strop ZIPu 64 MB, jednoznačný EOCD (bajty za koncem nevadí), ověření platných šablon po obnově | test_sablona_obsah 62/5 → 68/0, test_obnova 191/1 → 192/0 |

Fixtury test_funkce, test_obnova_nanecisto a overit_online (P2) dostaly
zveřejněný ceník + rozměry (zamykaly obchodníkem ceník bez cen). Mutace
serveru #395 9/9, B114 7/7; jádra #395 5/5. Rychlé kolo zelené po opravě
dvou harnessů. **Celé kolo nad 518532b VŠE ZELENÉ (84 min 57 s):** sady
221/0/1, mutace jádra 167 z 167, serveru 245 z 245, statické 3 z 3.

**Pozor — 21. kolo už proběhlo 6. 10. mimo tuto řadu sezení:** audit
`2026-10-06_kalkulator_BEZPECNOSTNI_AUDIT_v2.10.1_a_v30.9.1.md` (Disk/Testovani,
id 1ncRIsD3trEUaTiibGAXBNvPMI2geqnfC) a `VYHODNOCENI_TESTU_KOLO21_MAIN_TEST_2026-10-06.xlsx`.
Nové nálezy B126–B132: **B126 vysoká** (profil, který není objekt — `null`,
chybějící klíč, `profily = {}` — projde #372, jádro dá nulovou hmotnost;
`src/engine.js:668`, v claude/cenik-395 pořád živý), B127 a B128 střední,
B129–B131 nízké, B132 informativní. V repozitáři ani roadmapě zatím nejsou.
Příští kolo je tedy 22., B-čísla od B133.

## Čeká na J. V.

- Sloučení `claude/cenik-395` do `test-draft` (po zeleném celém kole).
- Release v6.10.1; ostatní body z předávky 6. 10. níž (rozhodovací list,
  Pipedrive P1–P12, šablony SoD v2 a PROJ v4 v testu i ostré, převod do main).
- Smazání sloučených větví (seznam a odkazy v hlášení 8. 10.); NEmazat
  `claude/oprava-sesti-nalezu-v29.9.1`, `claude/stoic-cerf-j915ax`,
  `k16-nalezy`, `claude/etapa-b-plan-plateb-proj`,
  `claude/komplexni-test-v29.9.1`, `claude/opravy-v29.9.1`,
  `claude/pensive-curie-s6yzs3`, `claude/testovani-po-opravach` (nejsou
  celé v test-draft).

## Další krok

Výchozí návrh J. V. (8. 10.): nejdřív B126 (+ B131, B127, B128) v nové
větvi z `claude/cenik-395`, pak 22. kolo (protokol +
`<datum>_kalkulator_BEZPECNOSTNI_AUDIT_v<verze>.md`, B-čísla od B133). Podklady v kontejneru: `/home/user/kng_podklady`
(všech 15 šablon + SoD v2 + příručka přejmenovaná na v8.10.1).

---

# Paralelní práce 6. 10. 2026 — koordinační sezení dávek na pozadí

Na pokyn J. V. 6. 10. 2026 („tag je releasnutý, vytvoř nové sezení a navrhni
další dávky k běhu na pozadí během tohoto dne") běží koordinační sezení
**session_01FbEVKCocjc6ZDk2hyoDe3k** („KNG — dávky na pozadí 6. 10. 2026",
založené ze session_01WRbkr4tfxtUB1k8PR37dUR). Každá dávka vlastní větev
z `test-draft` (v2.10.1), integrace do `claude/davka-6-10` (v6.10.1) s celým
kolem; do `test-draft` a `test` až na pokyn J. V. Release v2.10.1 vydán
6. 10. — release mají všechny verze.

| # | Dávka | Větev |
|---|---|---|
| G | rozhodovací list otevřených otázek | (v `podklady/` větve D) |
| D | #392 VSG/SKN z přepsané plochy skla + K20-N1 zapsat jako vědomé | `claude/vsg-skn-prepis-skla` |
| A | #374 koncová cena bez schválení (B113, B114) | `claude/koncova-cena-374` |
| C | B115, B116, B100 kontrola obsahu šablon | `claude/sablony-obsah-b115` |
| B | B120, B119, B121, B122 | `claude/audit-b119-b122` |
| E | B124, B125 + šablony SoD v2 na Disk | `claude/testy-ci-b124` |
| F | Pipedrive: návrh polí dealu × kalkulátor (rozbor) | `claude/pipedrive-pole-rozbor` |
| H | 21. kolo nad integrační větví (pokud zbude čas) | — |

Podklady 20. kola (2. 10., nad v1.10.2, Disk/Testovani): `STAV_KOLO20_2026-10-02.md`,
`VYHODNOCENI_TESTU_KOLO20_TEST_2026-10-02.xlsx`,
`2026-10-02_kalkulator_BEZPECNOSTNI_AUDIT_v1.10.2.md` — B118 (= K19-N102) je
opravené ve v2.10.1 (P1); otevřené vysoké B113, B114 řeší dávka A.
Nečinné sezení session_0152gTk16B8GKboeQJxTy49m (30. 9., opravy B113–B118)
je tímto plánem nahrazené.

---

# Předávka — stav k 6. 10. 2026 (v6.10.1 v integrační větvi claude/davka-6-10)

Na `main`: **v30.9.1**. Na `test-draft` = `test`: **v2.10.1**. Integrační
větev **`claude/davka-6-10`** = **v6.10.1** (pokyn J. V. 6. 10. 2026:
„nerozděluj … sezení" + „ano, sluč do claude/davka-6-10"; podřízená sezení
A a C zastavena a archivována J. V., jejich větve sloučeny). Do `test-draft`
a `test` až na pokyn J. V. Sezení session_01FbEVKCocjc6ZDk2hyoDe3k.

## Obsah v6.10.1 (podrobně CHANGELOG)

| Dávka | Co | Roadmapa | Stav |
|---|---|---|---|
| G | rozhodovací list `podklady/ROZHODNUTI_2026-10-06.md` (25 otázek s výchozími odpověďmi) | — | ✅ |
| D | #392 VSG/SKN z ručně přepsané plochy skla; K20-N1 jako vědomé chování (test) | #392 | ✅ |
| A | #374 B113, B114 (identita položek PROJ, cena trvalých položek, ceník sestavení, zábrana PROJ za 0 Kč); B117 mez; návrh B96 | #374 | ✅ |
| B | B119 přísné ověření nového zámku, B120 obnova překladů dodatků, B121 rejstřík, B122 symboly v textu plateb | #393 | ✅ |
| C | B115 kontrola obsahu šablon, B116 vrácení verze, B100 obnova šablon | — | ✅ |
| E | B124 overit_xss (215 → 299), B125 CI; šablony SoD v2 předány J. V. (SendUserFile) | — | ✅ |
| Sikora | poznámka *) jen s IČ, velká písmena v Out of scope, Follow project milestones, název souboru v jazyce | #394 | ✅ |
| Revize | dva nezávislí revizoři: B119 vždy přísně, šablony bez 5 dalších obchvatů, strop rejstříku, doprava PROJ, záporná sazbaKc, duplicitní sekce, čísla jako jádro | #395 (zbytky) | ✅ |
| F | rozbor polí Pipedrive `podklady/PIPEDRIVE_POLE_DEALU_ROZBOR_2026-10-06.md` + xlsx s návrhem vyjádření (SendUserFile) | — | ✅ |
| H | 21. kolo (protokol + audit na Disk) | — | ⬜ nestihlo se |

## Celé kolo

**Celé kolo nad b292d32 VŠE ZELENÉ (73 min 13 s):** sady 221 prošlo,
0 selhalo, 1 přeskočeno (test.js), mutace jádra 162 z 162, mutace serveru
236 z 236, statické 3 z 3; se všemi firemními šablonami. Předchozí kolo
nad 5b3213d selhalo jen na zadání mutace B59 (úsek změnil B119) — opraveno.

## Čeká na J. V.

- Rozhodovací list 6. 10. (`podklady/ROZHODNUTI_2026-10-06.md`) — odpovídá
  se jen tam, kde se chce odchýlit.
- **#395 V3 (vysoká):** nová zakázka obchodníka s ceníkem sestavení +
  vlastní položka nastaví cenu libovolně. Výchozí návrh: server u nové
  zakázky obchodníka při zveřejněném ceníku nahradí ceník sestavení
  zveřejněným + serverová zábrana nového zámku s cenou ≤ 0 (samostatná
  dávka; prostý zákaz by shodil legitimní toky).
- **F — Pipedrive:** otázky P1–P12 v rozboru (výchozí odpovědi tam);
  poslat vyplněnou kopii tabulky integrátorovi po kontrole J. V.
  Pozor: navržené názvy polí by rozbily párování `pd_mapa.mjs` (#114).
- Nahrát šablony SoD realizace v2 a SoD PROJ v2 a nabídky PROJ v4
  (Nastavení → Šablony) v testu i v ostré.
- Sikora S2: česká nabídka zůstala malými písmeny (výchozí: ponechat).
  Word PROJ má poznámku *) pevně v šabloně — zmizí jen z online nabídky
  (výchozí: v šabloně PROJ v5 nahradit symbolem).
- Převod v6.10.1 do `test-draft` a `test` („pošli do testu"), release
  v6.10.1 (odkaz pošle sezení po převodu), převod do `main`.
- Smazat sloučené větve: `claude/vsg-skn-prepis-skla`,
  `claude/audit-b119-b122`, `claude/koncova-cena-374`,
  `claude/sablony-obsah-b115`, `claude/testy-ci-b124` (až budou celé
  v `test-draft`), dál `claude/k19-nalezy`, `claude/davka-2-10` a seznam
  níž.

## Podklady v cloudu

`/home/user/kng_podklady` (CN v14, CN v11, PROJ v3 jako
Sablona_NABIDKA_PROJ.docx, SoD v1, plná moc, příručka přejmenovaná na
v6.10.1) a `/home/user/kng_podklady_jazyky` (navíc CN v14 EN/DE/FR, PROJ
v4 + EN/DE/FR, SoD v2) — mimo repozitář.

## Další krok

Čekat na pokyn J. V. („pošli do testu") — pak rychlý posun `test-draft`
a `test` na `claude/davka-6-10` a odkaz na release v6.10.1.

---

# Předávka — stav k 2. 10. 2026 (v2.10.1 na test-draft i test, v30.9.1 na main)

Na `main`: **v30.9.1**. Na `test-draft` = `test`: **v2.10.1** (pokyn J. V.
2. 10. 2026: „souhlasím s výchozími návrhy, zapracuj P2, P4, P6; P5 —
statiku udělej tak, jak jsem navrhoval, ve dvou řádcích. Vypiš, které
konkrétní zakázky z ostré verze tím budou dotčeny. P3 ok; P1 OK. připrav,
otestuj a pošli do testu. tag je releasnutý"). Paralelní větev
**`claude/k19-nalezy`** (z `b5253c9`) sloučena přes integrační větev
**`claude/davka-2-10`** nad v1.10.2 (8a7b069); konflikty jen v CHANGELOG
a PREDAVKA. Sezení session_01WRbkr4tfxtUB1k8PR37dUR.

## Hotovo v2.10.1 — nálezy 19. kola (podrobně CHANGELOG.md)

| # | Nález | Co | Testy |
|---|---|---|---|
| P1 | K19-N102 | #372 kontroluje i nově zamčenou variantu (zámek jen v příchozích datech) | test_obnova 176/4 → 180/0; mutace serveru +1 |
| P2 | K19-N104 | zkratka „Prosklít i prohlubeň" (všem stěnám odM = −prohlubeň) | test_prohluben_sklo 33/0; overit_oplasteni +7; mutace jádra +2 |
| P3 | K19-N105 | ruční přepis plochy skla posune PRÁCI OPLÁŠTĚNÍ a TMELENÍ | test_prepis_skla_prace 31/22 → 53/0; mutace jádra +2 |
| P4 | K19-N107 | nápověda „jiné sklo = opláštění po stěnách" | overit_oplasteni +2 |
| P5 | K19-N109 | statika ve dvou řádcích: nová položka ceníku `C.statikaOplHod` (výchozí 0), kontrola `statikaDvakrat` | test_statika_oplasteni 16/22 → 38/0; mutace jádra +3 |
| P6 | K19-N114 | přepnutí na zahraniční ceník nabídne „jen realizace" | test_zahr_jen_realizace 12/0; overit_zahranicni 40 → 45 |

Rozbor s variantami: `podklady/K19_ROZBOR_2026-10-01.md`.

## Celé kolo nad v2.10.1

Celé kolo nad ca02d5f (kód = bd43ad5, další commity jen dokumentace) VŠE ZELENÉ (77 min 32 s): sady 218 prošlo, 0 selhalo, 1 přeskočeno (test.js — skutečný ceník v repozitáři není), mutace jádra 138 z 138, mutace serveru 211 z 211, statické kontroly 3 z 3; s firemními podklady (KNG_PODKLADY: šablony CN v14, CN v11, PROJ v3, SoD, plná moc, příručka přejmenovaná na v2.10.1). Předchozí dva běhy: první visel na overit_dialogy.mjs (harness neobsloužil nový dotaz P6, přerušeno před mutacemi), druhý selhal jen v overit_lista.mjs (32 pravidel; zakázané zaškrtávátko P2) — obojí opraveno.

## Čeká na J. V.

- **P5:** nastavit v Ceníku OCK (REŽIE) „Statické posouzení opláštění –
  hodin" (např. 6) a zveřejnit — do té doby se nic nemění. Dotčené
  zakázky viz CHANGELOG v2.10.1 (testovací K19 jsou zamčené; 13 s ručně
  dorovnanou statikou hlídá kontrola `statikaDvakrat`).
- **P3:** příplatky VSG/SKN navázat na přepsanou plochu skla (výchozí:
  ano, další dávka).
- Release v2.10.1 (odkaz poslán; tag z cloudu nejde — HTTP 403). Releasy vydané do v1.10.2 včetně (ověřeno přes GitHub 2. 10.).
- Převod do `main` (výchozí: až po vyzkoušení v testu).
- Smazat sloučené větve `claude/k19-nalezy` a `claude/davka-2-10` (celé
  v `test-draft`) — mazání z cloudu nejde.
- Ostatní otevřené body z 1. 10. níž beze změny.

## Další krok

Čekat na vyzkoušení v testu: P1 novou TEST zakázkou, P3 K19T-C088
v klonu varianty proti „OCK – test × Excel", P2/P4/P6 proklikem, P5 po
nastavení hodin v ceníku.

---

# Předchozí stav (1. 10. 2026 večer — v1.10.2)

Na `main`: **v30.9.1**. Na `test-draft` = `test`: **v1.10.2** (pokyn J. V.
1. 10. 2026: „po zeleném kole to pošli do testu“) — rychlý posun z integrační
větve **`claude/davka-1-10-2`** po zeleném celém kole. Releasy vydané do
**v1.10.1** včetně (ověřeno přes GitHub 1. 10. odpoledne); **v1.10.2 release
ani tag ještě nemá** — odkaz na release poslán J. V. (tag z cloudu pushnout
nejde — HTTP 403).
Sezení session_01RJSPgrM27cZ1mGsJWPdfWv navázalo na
session_01H73EkBoAG3hp8ic9PHKqwS.

## Hotovo v1.10.2 — dávka 1. 10. 2026 odpoledne (podrobně CHANGELOG.md)
Zadání J. V. (snímky): výchozí plán plateb, zarovnání polí opláštění,
prověřit rám dveří a větu „Vedle dveří zůstane 1,50 m“, odpovědi na
otázky k #381, roadmapa, otevřené body. Každý úkol vlastní větev
z `test-draft` (b5253c9), integrace bez konfliktů.

| Úkol | Větev | Roadmapa |
|---|---|---|
| Plán plateb PROJ: výchozí předvolba Záloha 70 % + zbytek po předání | `claude/plan-plateb-zaloha-70` | #383 |
| Opláštění po stěnách: pole stěny v pevných sloupcích (materiál / výška / křížek) | `claude/oplasteni-zarovnani-poli` | #384 |
| Věta o zbytku mezery u jedněch dveří + test rámu dveří (rám se počítá 2× už teď) | `claude/svetlik-zbytek-vedle-dveri` | #385 |
| Rozhodnutí J. V. k #381: mezeru mezi příčníky ponechat, nápovědu s výpočtem mezery nezobrazovat | (jen záznam) | #381 |

Vysvětlení pro J. V. (změna šířky bočního světlíku při přepnutí zasklení):
mezera vedle dveří se měří ze šířky skla — na terče 1 500 + 2 × 80 + 20 =
1 680 mm, mezi příčníky 1 500 − 2 × 80 − 8 = 1 332 mm; otvor dveří 800 +
2 × 100 + 40 = 1 040 mm; mezera 600 mm × 252 mm; plocha 6,600 × 2,772 m².

**Podklady v cloudu:** šablony CN v14, CN v11, PROJ v3 (jako
`Sablona_NABIDKA_PROJ.docx`), SoD realizace, SoD projekce, plná moc
a příručka v25.9.3 staženy konektorem Disku do `/home/user/kng_podklady`
(mimo repozitář). Pro `overit_manual.mjs` kopie příručky s verzí
přepsanou na v1.10.2 (`2026-10-01_kalkulator_v1.10.2_MANUAL_OBCHODNIK.html`
— postup ze skillu testovací procedury; skutečná příručka v1.10.2 se
v cloudu vyrobit nedá, chybí snímky z testovacího webu). Malé soubory
přijdou z Disku přímo ve výsledku nástroje — vytáhnout je z přepisu
sezení (JSONL), viz skript v sezení.

## Celé kolo nad v1.10.2
VŠE ZELENÉ (84 min 29 s) nad 7d544b7 — sady 214 prošlo, 0 selhalo, 1 přeskočeno (test.js — skutečný ceník v repozitáři není), mutace jádra 131 z 131, mutace serveru 210 z 210, statické kontroly 3 z 3; s firemními podklady (KNG_PODKLADY: šablony CN v14, CN v11, PROJ v3, SoD, plná moc, příručka). Dílčí ověření před integrací: ./spust_testy.sh v každé větvi
164/0/1; harnessy plan_plateb 49/0, oplasteni 82/0, svetliky_sirka 24/0,
xss 215/0, smoke 50/0; mutace jádra --kontrola 131 úseků.

## Čeká na J. V.
- Release v1.10.2 (odkaz poslán; tag z cloudu nejde).
- Převod v1.10.2 do `main` (výchozí: až po vyzkoušení v testu).
- #383: výchozí plán platí i pro rozpracované zakázky bez uložené
  předvolby (výchozí: ano, jako každá změna firemního plánu); je-li
  v Nastavení → Firma uložený vlastní plán firmy, má přednost — nastavit
  tam předvolbu a zálohu, nebo „Vrátit výchozí z kódu“; šablona nabídky
  PROJ v3 vytiskne natvrdo Standard → nahrát PROJ v4 (výchozí: nahrát).
- #385: znění věty o zbytku (výchozí: ponechat nové znění).
- SoD: znění rozsahu SoD PROJ (bod 7 návrhu), čísla papírových smluv OPR
  a OVP pro etapu C (#366); datum podpisu i v SoD PROJ (výchozí ano);
  slepené „V Praze, dne …" v šabloně SoD realizace (výchozí opravit ve v2);
  pokuta za prodlení splatnosti „0" (výchozí ve v2 větu vypustit).
- #381 zbývající otázky (výchozí: ponechat) — tolerance 0,5 mm, dvě věty
  kontroly, ruční šířka po změně počtu, zábrana i u „zajistí stavba",
  krycí list bez šířky.
- #377: zábrana platí i pro dotisk zamčené varianty (výchozí: ano).
- Vyplnit překlad firemní věty SKN v číselníku na ostrém webu (#379);
  nahrát šablony SoD v2.
- Smazat sloučené větve (celé v `test-draft`, ověřeno `git merge-base --is-ancestor` 1. 10. večer; mazání z cloudu nejde — HTTP 403): `claude/ciselnik-prednost-dodatku`, `claude/davka-1-10`, `claude/davka-k18-svetliky`, `claude/etapa-b-plan-plateb-v30.9.1`, `claude/etapa-b-q5-zaloha-automaticky`, `claude/k18-drobnosti`, `claude/k18-n96-dodatky-preklady`, `claude/k18-nalezy-word-preklady`, `claude/model2-nadsvetlik-bez`, `claude/ock-platebni-podminky-nabidka`, `claude/oprava-sesti-nalezu-v29.9.1`, `claude/sirka-bocniho-svetliku-381`, `claude/sod-generator-sablony`, `claude/stoic-cerf-j915ax`, `claude/svetliky-u-dveri-375`, `claude/zabrany-blokuji-dokumenty`, `claude/davka-1-10-2`, `claude/plan-plateb-zaloha-70`, `claude/oplasteni-zarovnani-poli`, `claude/svetlik-zbytek-vedle-dveri`. `k16-nalezy` celá v `test-draft` není (2 commity navíc: rozbor D kola 16, v25.9.8) — nemazat bez kontroly.

## Další krok
- Paralelní větev **`claude/k19-nalezy`** (nálezy 19. kola, P1–P6, z `b5253c9`)
  běží v samostatném sezení podle promptu J. V. (pokyn 1. 10. 2026 „rozběhni
  následující prompt“): session_01WRbkr4tfxtUB1k8PR37dUR
  (https://claude.ai/code/session_01WRbkr4tfxtUB1k8PR37dUR). Vlastní
  `PREDAVKA.md` vede ve své větvi; o sloučení rozhoduje J. V.
- Čekat na odpovědi J. V. k otevřeným bodům výš.

## Předchozí stav (1. 10. 2026 dopoledne — v1.10.1 na test-draft i test, v30.9.1 na main)

Na `main`: **v30.9.1**. Na `test-draft` = `test`: **v1.10.1** (pokyn J. V.
1. 10. 2026: „s návrhem šířky bočního světlíku souhlasím, zapracuj ho pro
model 2 (modelu 1 nic neměň) a vše pošli do testu"). Převod rychlým posunem
z integrační větve `claude/davka-1-10` po zeleném celém kole (finální celé kolo nad d596290 VŠE ZELENÉ (59 min 7 s): sady 214 prošlo, 0 selhalo, 1 přeskočeno (test.js), mutace jádra 128 z 128, mutace serveru 210 z 210, statické 3 z 3; kód v1.10.1 (373861f) je s d596290 shodný, liší se jen CHANGELOG, PREDAVKA a roadmapa; na pokyn J. V. „potřeboval bych to už odeslat do testu" převedeno ještě před doběhnutím mutací serveru, výsledek dopsán po doběhnutí; předchozí celé kolo nad a7889c5 (úkoly 1–4 bez SoD rozhodnutí, #381 a #382) VŠE ZELENÉ: sady 210/0/1, mutace jádra 121 z 121, serveru 210 z 210, statické 3 z 3).
Releasy vydané do **v1.10.1** včetně (ověřeno přes GitHub 1. 10. — tag
v1.10.1 i release založil J. V.; z cloudu tag pushnout nejde — HTTP 403).
Sezení 1. 10. navázalo na session_01XFo3AzDzkjt8xGnMVH53p7.

## Hotovo v1.10.1 — dávka 1. 10. 2026 (podrobně CHANGELOG.md)
Každý úkol vlastní větev; integrace `claude/davka-1-10` (konflikty jen
v CHANGELOG, roadmapě, mutace_jadro.mjs, overit_sod.mjs a zamek_ui.js —
obě strany ponechány).

| Úkol | Větev | Roadmapa |
|---|---|---|
| Model 2: nadsvětlík „bez" bez odpočtu 0,2 h (Model 1 ubírá dál) | `claude/model2-nadsvetlik-bez` | #378 |
| Zábrany z kontroly blokují dokumenty své strany (OCK × PROJ) | `claude/zabrany-blokuji-dokumenty` | #377 |
| K18-N96: překlady dodatkových textů EN/DE/FR v číselníku | `claude/k18-n96-dodatky-preklady` | #379 |
| Návrh SoD + generátor podle šablon, K18-N100, K18-N101, „% %", rozhodnutí J. V. (termíny, místo plnění, denní pokuta, datum podpisu = datum tisku, pokuta zhotovitele, šablony v2) | `claude/sod-generator-sablony` | #380 |
| Šířka bočního světlíku při ručním počtu — jen Model 2 | `claude/sirka-bocniho-svetliku-381` | #381 |
| Dodatkové texty: číselník má přednost před zveřejněným ceníkem | `claude/ciselnik-prednost-dodatku` | #382 |

**Návrhy (artefakty):** SoD a šablony https://claude.ai/artifact/GXZGaJBMR9PQXnp9bz6Xwh,
šířka bočního světlíku https://claude.ai/artifact/7tNaMb8Fu1tNt9ADCyYheL.
Šablony SoD realizace v2 a SoD PROJ v2 poslány J. V. (vyrábí je
`nastroje/vyrob_sablony.js --sod-real | --sod-proj`, necommitují se) —
nahrát v Nastavení → Smlouvy / Šablony.

**K18-N101:** tester zkoušel P18 na ostré v30.9.1 (před plánem plateb).
**#382:** v testu nese zveřejněný ceník u SKN starší text — nově má
přednost číselník; zakázku založenou dřív srovná tlačítko v číselníku.

**Podklady v cloudu:** šablony CN v14, PROJ v4 (+EN/DE/FR), PROJ v3 (jako
Sablona_NABIDKA_PROJ.docx), SoD, plná moc a příručka staženy konektorem
Disku do `/home/user/kng_podklady` — velké soubory se uloží do
`…/tool-results/…txt` (JSON s base64), kontext nezahltí (viz skill).
Aktualizovaný skill (nové znění zásady o symbolech SoD + rozhodnutí 1. 10.)
poslán J. V. jako `2026-10-01_kalkulator_v1.10.1_skill.skill`.

## Čeká na J. V.
- Převod v1.10.1 do `main` (release v1.10.1 už vydán).
- SoD: znění rozsahu SoD PROJ (bod 7 návrhu), čísla papírových smluv OPR
  a OVP pro etapu C (#366); otázky agentů s výchozími odpověďmi (datum
  podpisu i v SoD PROJ — výchozí ano; slepené „V Praze, dne …" v šabloně
  SoD realizace — výchozí opravit ve v2; pokuta za prodlení splatnosti „0"
  — výchozí ve v2 větu vypustit).
- #381 otázky (výchozí: ponechat) — tolerance 0,5 mm, dvě věty kontroly,
  ruční šířka po změně počtu, zábrana i u „zajistí stavba", krycí list bez šířky.
- #377: zábrana platí i pro dotisk zamčené varianty (výchozí: ano).
- Vyplnit překlad firemní věty SKN v číselníku na ostrém webu (#379);
  nahrát šablony SoD v2.

## Další krok
- Navazující sezení (založené 1. 10. ze sezení session_01H73EkBoAG3hp8ic9PHKqwS)
  nejdřív vysvětlí J. V., proč se při přepnutí zasklení „na terče" →
  „mezi příčníky" změní předpočítaná šířka bočního světlíku (mezera vedle
  dveří se měří z šířky skleněné plochy: na terče vnitřní šířka + 2 × příčník
  + 0,02 m, mezi příčníky vnitřní šířka − 2 × sloupek − 0,008 m; v příkladu
  J. V. 600 mm × 252 mm) a nabídne otázku s výchozí odpovědí. Bez pokynu
  J. V. se nic nemění.

## Předchozí stav (30. 9. 2026)

Na `main`: **v30.9.1** (pokyn J. V. 30. 9. 2026 „pošli aktuální test do
main"; ostrá aplikace se z `main` nasazuje sama). Na `test`: **v30.9.3**
(pokyn J. V. 30. 9. odpoledne „co máme aktuálně v draftu pošli už do testu").
Na `test-draft`: **v30.9.4** — dávka K18 + světlíky u šachetních dveří
(integrační větev `claude/davka-k18-svetliky`, převod fast-forwardem po
zeleném celém kole). Do `test` a `main` jen na pokyn J. V.
Releasy do **v30.9.3** včetně vydané a odsouhlasené (J. V. 30. 9.; ověřeno
přes GitHub 30. 9. večer). **v30.9.4** — odkaz na release poslán J. V.
(tagy z cloudu pushnout nejde — proxy HTTP 403, viz CLAUDE.md).

**Větve k 30. 9. 2026 večer** (ověřeno `git merge-base --is-ancestor`):
- **Celé v `test-draft` — J. V. je smaže, až nebudou potřeba:**
  `claude/davka-k18-svetliky`, `claude/svetliky-u-dveri-375`,
  `claude/k18-drobnosti`, `claude/k18-nalezy-word-preklady`,
  `claude/ock-platebni-podminky-nabidka` (v30.9.4),
  `claude/etapa-b-q5-zaloha-automaticky` (v30.9.3),
  `claude/etapa-b-plan-plateb-v30.9.1` (v30.9.2),
  `claude/oprava-sesti-nalezu-v29.9.1` (v30.9.1), `k16-nalezy`
  a `claude/stoic-cerf-j915ax` (z dřívějška).
- **Nahrazená, ne celá v `test-draft`:** `claude/etapa-b-plan-plateb-proj`
  (etapa B z v29.9.4) — krok 1 přenesen do nové větve, zbytek hotový tam;
  k práci už není potřeba (smazání rozhodne J. V.).
- **Nesloučené, nemazat:** `claude/testovani-po-opravach` (předávka 22. kola
  nad v29.9.7 = kód v30.9.1: VYHOVUJE S NÁLEZY — 2 nové vysoké v třídě
  „koncová cena" #374, B99 obejitelná; čeká na rozhodnutí J. V.),
  `claude/pensive-curie-s6yzs3` (zbývá předávka fd1be2b),
  `claude/komplexni-test-v29.9.1` (výsledky 21. kola), `claude/opravy-v29.9.1`
  (předávka + prompt šesti oprav).
Roadmapa: `roadmapa/roadmap.json` (377 položek, nejvyšší #377), stránka se
generuje `python3 roadmapa/roadmapa.py`.

## Hotovo v30.9.4 — dávka K18 + světlíky u šachetních dveří (podrobně CHANGELOG.md)
Zadání J. V. 30. 9. 2026 odpoledne; čtyři paralelní větve z `test-draft`,
sloučené v `claude/davka-k18-svetliky` (konflikty sjednocené, pravidel
kontroly 31, mutace jádra 111 úseků):
- **#375 světlíky u dveří** (`claude/svetliky-u-dveri-375`; návrh
  https://claude.ai/artifact/2x3pM2fGfAQaXz7ziUVxbE odsouhlasen J. V.): boky
  mají tytéž volby jako nadsvětlík (nové zakázky „bez"), pole **Celkem
  světlíků na bocích dveří** (nástupiště × 2, ručně s ↺), ocenění po
  dveřích, sklo podle stěny s dveřmi, materiál podle stěn B–D, kontrola
  `bokyDveri`, řádek specifikace SVĚTLÍKY U ŠACHETNÍCH DVEŘÍ + symbol
  `{{TS_SVETLIKY_DVERI}}` (šablona CN ho zatím nemá — Word popisuje
  světlíky dál řádkem `{{TS_OPLASTENI_NADSVETLIKU}}` bez počtu), převod
  starších zakázek beze změny ceny. Nadsvětlík „zajistí stavba" už neubírá
  0,2 h montáže na nástupiště, „bez" odpočet drží (Model 1 = Excel).
- **B1–B3** (`claude/k18-drobnosti` + doplněk v integrační větvi): 3D
  zaměření ve specifikaci i řádek **Zaměření strojovna** v krycím listu OCK
  odvozené z položky ZAMĚŘENÍ 3D SKENEREM v Režii (množství 0 = ne, ruční
  přepis neplatí, zamčená varianta drží odeslané); opláštění po stěnách
  samo o sobě atyp nedělá; zdvih nejvýš 99 m (zábrana v kontrole „rozmery",
  pole max 99).
- **K18-N92, N93, N95–N97** (`claude/k18-nalezy-word-preklady`): šablona
  PROJ v4 s blokem ceny geodetu + kontrola `cenaWordProj`, záruka
  v cizojazyčné online nabídce přeložená, úvod a termíny PROJ přeložené
  (návrh), kontrola `dodatekCesky`, materiály po stěnách se stěnami.
- **K18-N94 + měsíční fakturace** (`claude/ock-platebni-podminky-nabidka`,
  #367 etapa A část 1): platební kalendář z krycího listu (0 % se vynechá,
  doklady se přečíslují; „Měsíční" = věta o měsíční fakturaci místo
  50/40/10), šablona **CN v14**, kontrola `platbyWordOck`.
- Šablony **CN v14** a **PROJ v4** (CZ + EN/DE/FR) vyrobené
  `nastroje/vyrob_sablony.js --cn-v14 / --proj-v4` z podkladů na Disku,
  poslány J. V. v sezení 30. 9. večer (v repozitáři nejsou).
- Příručka (`manual/obsah.json`) a `podklady/OBRAZOVKA_OPLASTENI.md`
  opravené; roadmapa #375 a #376 hotovo, #367 doplněno, **nová #377**.
- **Ověřeno celým kolem** nad d7e2f32 (62 min 5 s): VŠE ZELENÉ — sady 207
  prošlo, 0 selhalo, 1 přeskočeno (test.js); mutace jádra 111 z 111; mutace
  serveru 207 z 207; statické kontroly 3 z 3. Po kole strom čistý.

## Hotovo v30.9.2 — etapa B: plán plateb projekce (podrobně CHANGELOG.md)
Jeden plán plateb PROJ (krycí list PROJ), nabídka PROJ, tisk krycího listu,
smlouva o dílo PROJ a Nastavení ho jen čtou. Rozhodnutí J. V. 29. 9. 2026:
čtyři předvolby (Standard po činnostech = dosavadní procenta, Záloha +
zbytek po předání 0/30/50/70 %, 100 % po dokončení stupně, Vlastní),
výchozí Standard; splátky SoD PROJ se stejným milníkem sečtené, dopočet =
procento × cena činnosti po slevě, poslední splátka nese zaokrouhlení,
ruční přepis; zábrany (100 % u činnosti, součet plateb = cena díla).
- Jádro `src/plan_plateb.js` (v JADRA mutačního testu), firemní plán
  `NAST.firma.planPlatebProj` (Nastavení → Smlouvy / Šablony, zveřejnění
  s firmou, kontrola tvaru v prohlížeči i na serveru), karta plánu a tabulka
  plateb v krycím listu PROJ, snímek `kryciProj.zmrazenoPlan` při KAŽDÉM
  prvním zamčení (i klonu a po odemčení; dotisk ho nepřepíše), zábrany
  `planPlateb100` / `planPlatebSoucet`, varování `planPlatebWordProj`
  (proti Standardu z kódu), brána `dokumentZabrana(typ, varianta)` hlídá
  variantu, ze které dokument vzniká (pravidel kontroly 27).
- Word: nabídka PROJ symboly `{{PROJ_PLATBY_<ČINNOST>}}` mezi
  `{{PLATBY_<X>_ZAC/_KON}}` (šablona **PROJ v4**), smlouva o dílo PROJ
  `{{SODP_PLATEBNI_KALENDAR}}` — odstavec za platbu (šablona **SoD PROJ v2**;
  stará s osmi platbami dostane `SODP_PLATBAn_KC`, plán, který neumí,
  smlouvu nevyrobí). Šablony vyrábí `node nastroje/vyrob_sablony.js
  --proj-v4 | --sod-proj <podklady>`; vyrobené (CZ + EN/DE/FR, SoD) poslány
  J. V. v sezení — v repozitáři nejsou.
- Převod starších zakázek: ruční splátky `sodpPlatba1–8` = ruční částky
  plateb se stejným milníkem (líně, bez zápisu), dřívější záloha („Záloha
  30 %") nabídnutá tlačítkem; odeslaná nabídka bez snímku se chová jako
  dřív a nová šablona SoD z jejích ručních splátek dostane seznam plateb.
- **Revize před sloučením** (dvě nezávislé): opravy F1–F9 v 843ff63 —
  blokující snímek plánu u klonu / po odemčení, závažná brána podle
  varianty, sedm menších (převod zálohy, „upraveno" u zamčené, varování
  ve Wordu, `PODM_*` jen z viditelných polí, SoD starší nabídky, odolnost
  vůči poškozeným datům, odebrání milníku se zeptá).
- **Ověřeno celým kolem** 30. 9. 2026 nad 843ff63 (72 min 17 s): VŠE ZELENÉ —
  sady 204 prošlo, 0 selhalo, 1 přeskočeno (test.js); mutace jádra 87 z 87;
  mutace serveru 207 z 207; statické kontroly 3 z 3.
- **v30.9.3 — Q5:** dřívější záloha krycího listu se přepne na předvolbu
  plánu sama (líně, první zápis ji zhmotní). Celé kolo nad 8cb2534 VŠE
  ZELENÉ (71 min 53 s: sady 204/0/1, mutace jádra 88 z 88, serveru 207 z 207,
  statické 3 z 3).

## Hotovo v30.9.1 — opravy šesti nálezů 21. kola (podrobně CHANGELOG.md)
B111 záporné položky, B96 krok zaokrouhlení, B112 ceník varianty a přepisy
podle role (vysoké); B97 klíč brzdy přihlášení, B98 obnova ze souboru a
odemčení, B99 šablona bez maker a vnějších vztahů (střední). Ověřeno
celým kolem (sady 199/0/1, mutace jádra 80, serveru 206). Testování po
opravách (22. kolo): větev `claude/testovani-po-opravach` (viz výše).

## Hotovo dřív v test-draft (v29.9.1–v29.9.4)
- v29.9.4: sloučení #371 (testovací sekvence A1–A5, jedno testovací kolo,
  opravy B72/P4, B75–B78, N43) a #372 (neznámý rozměr profilu).
- v29.9.1–v29.9.3: #364 nabídka PROJ se slevou, rozhodnutí J. V. k rozboru
  D kola 16 (`podklady/K16_ROZBOR_2026-09-25.md`), P8b, P9.2/P9.4/P9.5,
  P10.x, P11 `projZahranici`, P8A značky bloků + šablony CN v13 a PROJ v3.

## Platební podmínky z krycího listu — ROZHODNUTO 29. 9. 2026
Návrh `podklady/NAVRH_PLATEBNI_PODMINKY_2026-09-29.md` (oddíl 7 =
rozhodnutí), podklad etapy B `podklady/ETAPA_B_PODKLAD_2026-09-29.md`,
prototyp https://claude.ai/artifact/6sbxbaAsBpphfPfE2wnM3a.
- OCK (etapa A): tři firemní milníky, jak jsou; věty o podmínce úhrady u 1.
  a 2. splátky jako dnes; měsíční fakturace větou „Fakturace probíhá měsíčně
  podle skutečně provedených prací."
- PROJ (etapa B): **hotovo ve v30.9.2** (viz výše).
- Číslo smlouvy (etapa C, #366): ruční pole v krycím listu s návrhem dalšího
  čísla, formát `2026 - OPR - SOD - 0001` (realizace) a `2026 OVP SOD 0001`
  (projekce), navázat na papírové smlouvy.
- **Pořadí etap: B → A → C.** A a C až na pokyn J. V.

## Otázky etapy B — rozhodnutí J. V. 30. 9. 2026
- **Q5 změněno:** dřívější záloha se přepne na předvolbu **automaticky**
  (hotovo ve v30.9.3).
- **Potvrzeno:** Q9 (nové texty přes slovník, vlastní text milníku zůstává
  v EN/DE/FR česky, bez varování), Q10 (způsob fakturace z předvolby),
  body revize a (brána počítá plán v korunách — nesedící ruční částka v Kč
  zastaví i cizojazyčnou smlouvu) a b (server nekontroluje tvar plánu ve
  variantě) — „zatím OK".
- **Bez námitky (platí výchozí návrh):** Q1 projednání 100 % „po předání
  vyjádření odboru památkové péče HMP", Q2 geodet 100 % „po předání
  geodetického zaměření", Q4 celé koruny, poslední splátka dorovná, Q11
  řádek smlouvy „Platba ve výši … + DPH proběhne …", Q12 řádky nabídky
  „Platba {milník} – N % z nabídkové ceny za {činnost}".
- **Q8 „ponechat":** firemní „Standard po činnostech" se dál mění převzetím
  splátek upravených v krycím listu otevřené zakázky (Nastavení → Smlouvy /
  Šablony → „Převzít Standard z otevřené zakázky"), bez zvláštního editoru.

## Rozhodnutí z oprav v30.9.1 podle výchozího návrhu — čekají na potvrzení J. V.
- **B111:** zápornou položku, množství ani hodiny nesmí nikdo, ani
  administrátor (dobropis ne; jako N56).
- **B96 bod 4:** marže z koncové ceny i bez slevy — jen návrh, nerealizováno.
- **B112:** vedeno jako nový nález (vysoká); B88 dál jen čtecí strana.
- **B97:** vážnost střední.
- **B98:** odemčení ze souboru, které v databázi není → zakázku přeskočit
  s důvodem v náhledu obnovy.
- **B99:** vnější odkazy `http(s):` a `mailto:` v šabloně zůstávají povolené.

## Čeká na J. V.
- **Release v30.9.4** (odkaz v závěrečné zprávě sezení 30. 9. večer)
  a **smazat větve**, které jsou celé v `test-draft` (seznam výše;
  https://github.com/vendljar/kalkulator-next-gen-engscalc/branches).
- **Nahrát šablony** (Nastavení → Šablony) až do verze s v30.9.4: nabídka
  OCK **CN v14** (+EN/DE/FR), nabídka PROJ **v4** (+EN/DE/FR — nová s cenou
  geodetu, nahrazuje v4 z etapy B) a SoD PROJ v2 z etapy B.
- **Otázky dávky K18 (výchozí odpovědi platí, dokud J. V. neřekne jinak):**
  (1) nadsvětlík „bez" dál ubírá 0,2 h na nástupiště (Model 1 = Excel) —
  ponechat; (2) #377 zábrany z kontroly do `dokumentZabrana()` — ano,
  v paralelní větvi; (3) řádek `{{TS_SVETLIKY_DVERI}}` do šablony CN
  (v15) — ano v další dávce; (4) předpoklady #375: terče a lišty u plechu
  a „zajistí stavba" zůstávají, „převažující" = podle plochy (materiál) /
  výšky pásu (sklo), specifikace exteriéru píše u nadsvětlíku se sklem VSG
  (dřív dvojsklo) — OK; (5) svázání zaměření vyloženo jako Režie OCK
  (ZAMĚŘENÍ 3D SKENEREM) ↔ specifikace a krycí list OCK, dílenská
  dokumentace ruční volbu drží — OK; (6) `cenaWordProj` a `dodatekCesky`
  jsou varování, ne zábrana — OK; (7) SoD realizace: bez zálohy a měsíční
  fakturace šablona SoD zatím neumí (symboly `SOD_SPLATKA*` se doplňují ve
  Wordu) — řešit s etapou A / soubory SoD (#350).
- **Odborná kontrola překladů** EN/DE/FR označených „NÁVRH PŘEKLADU"
  (světlíky u dveří, úvod a termíny PROJ, měsíční fakturace, „stěny").
- Pokyn ke zbytku etapy A (smlouva o dílo OCK, 10.3) a k etapě C (číslo
  smlouvy, #366).
- Rozhodnout nálezy 22. kola (`claude/testovani-po-opravach`), bod 4 B96
  a **#374** (zbývající cesty třídy „koncová cena": hodiny a rezerva
  standardních položek PROJ, cena trvalé položky s kid, zaokrouhlení
  z výčtu); množství příplatků obchodníkem vs. `sloupce.naklad`.
- Spustit `node nastroje/detekce_zneuziti.mjs <záloha ostré databáze>`
  (Nastavení → Databáze → Zálohovat teď) — najde dřívější zneužití B111
  a B96 i v odeslaných nabídkách.
- **Poslední číslo papírových smluv** realizace (OPR) a projekce (OVP)
  pro etapu C.
- Soubory SoD (#350) — bez nich nejde ověřit symboly smluv (i pro etapu B:
  symbol seznamu plateb v šabloně SoD PROJ). SoD PROJ v2 je vyrobená
  z `Sablona_SOD_PROJEKCE.docx` z Disku.
- Pokyn k přenosu `test-draft` (v30.9.4) do `test` (a dál do `main`).
- **N46** (nástupiště A ↔ C u zrcadlové šachty): neopraveno, fuzz hlásí INFO.
- Z dřívějška: rozhodnutí z dávky B kola 16 (bez čísla se neukládá; přepočet
  po zveřejnění ceníku není neuložená změna; „ß" = „ss") a překlady z dávky C;
  telefon a jméno kolegy v `overit_nabidka_proj_word.mjs` (#346 / B79);
  CSP bez `'unsafe-inline'`; #369 (vypnout náklady obchodníkovi).

## Odložené nálezy 21. kola (neopravovat, jen evidovat)
Zbytek B77, B100–B110, zbytek B32, B4 souběh, B6, N59–N61 (větev
`claude/komplexni-test-v29.9.1`). N46 se neopravuje bez pokynu J. V.

## Poznámky pro další sezení
- **Testy jedním příkazem:** `bash nastroje/testovaci_kolo.sh` (celé kolo
  ~70 min) nebo `--bez-mutaci`, `--jen sady` apod. Mutační běh nepřerušovat,
  spouštět na pozadí nástroje (ne setsid); po přerušení
  `grep -rn "if (false)" netlify src` a `git diff netlify src`. Počty
  k 30. 9. večer (v30.9.4): mutace jádra 111 úseků, mutace serveru 207,
  pravidel kontroly 31.
- Šablony pro harnessy: `KNG_PODKLADY=<složka>` s CN v13 (+EN/DE/FR) jako
  nejvyšší verzí, CN i jako `Sablona_NABIDKA_CN_v11.docx` a PROJ v3
  pojmenovanou `Sablona_NABIDKA_PROJ.docx`; SoD realizace/projekce, plná moc
  a příručka (kopie s číslem aktuální verze, krok 0.7 skillu). V novém
  sezení nejsou — konektor Disku (hledat podle názvu), nebo
  `node nastroje/vyrob_sablony.js <CN v12 a PROJ v2> [výstup]`; PROJ v4
  a SoD PROJ v2 přepínači `--proj-v4` / `--sod-proj` (testy si je vyrobí samy).
- Harnessy a serverové sady s `ADMIN_EMAIL=spravce@priklad.cz`
  (testovaci_kolo.sh ho nastaví sám); symlink `node_modules/playwright`
  → `$(npm root -g)/playwright` (a `playwright-core`).
- Pojistky uložení i obnovy stojí v `netlify/lib/zakazka_kontrola.mjs`
  (ne v `functions/zakazky.mjs`) — tam patří i nové kontroly zakázky.
  Pořadí: typy → B111 záporné → B96 zaokrouhlení → B112 ceník → #372 profil.
- **Od B112 test nebo harness, který ukládá zakázku se změněným ceníkem,**
  musí ukládat jako administrátor, nebo nejdřív zveřejnit ceník
  (vzor `overit_online.mjs`, `cenikPlatnyTed()` v `netlify/test_prava.mjs`).
- Plán plateb: data `varianta.data.kryciProj.planPlateb` (řídký),
  snímek `zmrazenoPlan` (+ `upravene`), firemní `NAST.firma.planPlatebProj`;
  pole krycího listu `stary` (dřívější záloha / fakturace / splátky 1–8)
  jsou vidět jen u odeslané nabídky bez snímku; zapisující `planKlp*` musí
  být v `ZAMEK_CHRANENE`.
- Testovací zakázky v `netlify/test_obnova.mjs` sdílejí jednu databázi —
  nový blok potřebuje volná čísla (obsazeno 0777–0785, 0790–0794,
  0800–0804, 0999).
- `profilyNezname()` z `engine.js` volá i server (přes `globalThis`).
- Server musí načítat v `jadro_moduly.cjs` tytéž moduly migrací jako
  prohlížeč (pořadí CORE v build.py) — hlídá `src/test_zamek_historie.js`.
- Nový smyšlený kontakt v testu → `nastroje/povolene_kontakty.txt`.
- Komentář uvnitř `KOD_STRANKY` v `overit_xss.mjs` nesmí obsahovat zpětné
  apostrofy; komentář s doslovnou uzavírací značkou skriptu v `src/`
  rozbije celou aplikaci; výčet `INCLUDE*/DDE` v blokovém komentáři ho
  ukončí (`*/`).
- Kontejner běží v UTC: verze vDEN.MĚSÍC se měří k datu posledního commitu.
- LibreOffice v kontejneru nemá Writer — .docx jen strukturou XML.
- Dvě nezávislé pojistky potřebují každá vlastní cílený test.
- Čísla roadmapy přiděluje ten, kdo slučuje — před přidáním položky zjistit
  nejvyšší id v cílové větvi.

## Další krok
Čeká se na J. V. (výše): release v30.9.4, šablony CN v14 a PROJ v4,
otázky dávky K18 (výchozí odpovědi), #377, pokyn ke zbytku etapy A
a k etapě C, rozhodnutí o nálezech 22. kola a pokyn ke sloučení
`test-draft` do `test`. Nová práce vždy v paralelní větvi (`claude/…`)
z `test-draft`.
