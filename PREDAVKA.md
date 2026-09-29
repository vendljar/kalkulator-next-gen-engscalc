# Předávka — stav k 29. 9. 2026

Na `main`: **v25.9.3**. Na `test`: **v29.9.3**. Na `test-draft`: **v29.9.3**
(kolo 16 — dávky B, C, rozbor D a rozhodnutí J. V. k rozboru D; tamní
PREDAVKA.md popisuje tu práci).
Na `claude/pensive-curie-s6yzs3`: **v26.9.1** — testovací sekvence A1–A5
+ opravy B72/P4, B75–B78, N43 (server); čeká na pokyn J. V. k přenosu.
Na `claude/stoic-cerf-j915ax` (tohle sezení, nad pensive-curie): **v29.9.1**
— oprava #365. Do `test-draft`, `test` ani `main` nic — rozhoduje J. V.
Roadmapa: `roadmapa/roadmap.json` (365 položek), stránka se generuje
`python3 roadmapa/roadmapa.py`.

## Hotovo v29.9.1 — roadmapa #365 (podrobně CHANGELOG.md)
- **Pravidlo 0:** nález trval — výpočet padal na „Neznámá dimenze
  profilu", `ui/kalk_ock.js` na `JEKLY[p.dim].kg`, server zakázku uložil
  i obnovil.
- **Výpočet:** `jekl()` v `src/engine.js` u rozměru/tloušťky mimo katalog
  jeklů dosadí nulovou hmotnost i plochu, profil zapíše do
  `vysledek.profily.nezname` (nová `profilyNezname()`). Platná data beze
  změny (otisky v `src/test_profil_neznamy.js`).
- **Kontrola `profilNeznamy`** (`src/kontroly.js`) = ZÁBRANA; pravidel 20.
- **UI:** volba „neznámý rozměr: …" / „neznámá: …" se štítkem „mimo
  katalog", tolerantní `zkontrolujTl()`.
- **Server:** `netlify/lib/zakazka_kontrola.mjs` — neznámý rozměr v
  neuzamčené variantě → 400 (uložení i obnova), uzamčená se nekontroluje.
- **Testy:** `src/test_profil_neznamy.js` (22), `test_kontroly.js`,
  `overit_lista.mjs`, `overit_xss.mjs` (A2 otravuje i `dim`, `tl`), nový
  `overit_profil_neznamy.mjs` (10), `netlify/test_obnova.mjs` blok #365;
  mutace jádra +4 (`JADRA` nově i `kontroly.js`), serveru +2. U každého
  commitu je doloženo selhání před opravou.
- **Ověřeno celým kolem:** celé kolo `nastroje/testovaci_kolo.sh` 29. 9. 2026
  (62 min 51 s) VŠE ZELENÉ: sestavení ✓; sady 187 prošlo, 0 selhalo,
  3 přeskočeno z 190 (test.js — shoda s Excelem; overit_manual,
  overit_sod — firemní podklad mimo repozitář); mutace jádra 80 z 80;
  mutace serveru 189 z 189; statické kontroly 3 z 3.

## Pozor při slučování do `test-draft`
- **Čísla roadmapy kolidují.** Tady (i v pensive-curie) je #364 =
  testovací sekvence A1–A5 a #365 = tento nález; v `test-draft` je #364 =
  sleva PROJ v nabídce a #365 = P8 (značky bloků, CN v13). Čísla přiděluje
  ten, kdo slučuje — návrh: #364 → #371, #365 → #372 (test-draft končí
  na #370).
- **Verze:** v29.9.1 je tady oprava #365, v `test-draft` jiná dávka (sleva
  PROJ). Při sloučení se verze určí podle dne sloučení (`build.py`).
- CHANGELOG.md a PREDAVKA.md přepsaly obě větve — sloučit ručně.
- Pořadí: nejdřív pensive-curie (A1–A5), pak tahle větev (stojí na ní).

## Čeká na J. V.
- Pokyn k přenosu pensive-curie a této větve do `test-draft` a dál.
- **N46** (nástupiště A ↔ C u zrcadlové šachty): neopraveno, fuzz ho hlásí
  jen jako INFO.
- **Platební podmínky z krycího listu** (návrh
  `podklady/NAVRH_PLATEBNI_PODMINKY_2026-09-29.md` v `test-draft`, tamní
  #366/#367): 29. 9. hotový klikací prototyp
  https://claude.ai/artifact/6sbxbaAsBpphfPfE2wnM3a (krycí list OCK
  a PROJ, náhled nabídky CZ/EN/DE/FR, smlouvy a tisku, číslo smlouvy,
  pět otázek s kopírováním odpovědí). Soubor prototypu není v repozitáři.
  Čeká se na odpovědi na 5 otázek → pak etapa A.
- Z pensive-curie dál: telefon a jméno kolegy v
  `overit_nabidka_proj_word.mjs` (#346 / B79), CSP bez `'unsafe-inline'`.

## Poznámky pro další sezení
- **Testy jedním příkazem:** `bash nastroje/testovaci_kolo.sh` (celé kolo,
  ~50 min) nebo `--bez-mutaci`; `--jen sady` apod. Mutační běh nepřerušovat.
  Firemní šablony pro harnessy přes `KNG_PODKLADY=<složka>`.
- `profilyNezname()` z `engine.js` volá i server (přes `globalThis`
  z `jadro_moduly.cjs`) — při přejmenování hlídá mutace serveru.
- `netlify/test_mutace.mjs` spouští skutečnou mutaci (B59) — nepouštět
  souběžně s mutačním během.
- Nový smyšlený kontakt v testu → `nastroje/povolene_kontakty.txt`
  s důvodem, jinak statická kontrola skončí červeně.
- Harnessy potřebují `node_modules/playwright` a
  `ADMIN_EMAIL=spravce@priklad.cz` (testovaci_kolo.sh ho nastaví sám).
- Komentář uvnitř `KOD_STRANKY` v `overit_xss.mjs` nesmí obsahovat zpětné
  apostrofy (template literal).
- Server musí načítat v `jadro_moduly.cjs` tytéž moduly migrací jako
  prohlížeč (pořadí CORE v build.py) — hlídá `src/test_zamek_historie.js`.
- Předávku psát po každé dávce; kontext hlídat přes `get_session`.
