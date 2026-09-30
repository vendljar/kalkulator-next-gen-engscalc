# Předávka — stav k 30. 9. 2026 (v30.9.1 na test-draft i test)

Na `main`: **v25.9.3** (+ oprava Node), tag `v25.9.3`.
Na `test-draft` i `test`: **v30.9.1** — na pokyn J. V. 30. 9. 2026
(„pushni novinky do testu") sloučena větev `claude/oprava-sesti-nalezu-v29.9.1`
(opravy šesti nálezů 21. kola, roadmapa #373) a `test` převeden na
`test-draft`. Releasy **v29.9.3**, **v29.9.4** a **v29.9.7** (hlava větve oprav pro
22. kolo) vydané; **v30.9.1** — odkaz na release poslán J. V. (tagy z cloudu pushnout nejde — proxy HTTP 403,
viz CLAUDE.md).

**Větve k 30. 9. 2026:**
- **Celé v `test-draft` — J. V. je smaže:** `claude/oprava-sesti-nalezu-v29.9.1`
  (sloučeno ve v30.9.1), `k16-nalezy` a `claude/stoic-cerf-j915ax` (z dřívějška).
- **Rozpracovaná, nemazat:** `claude/etapa-b-plan-plateb-proj` (etapa B
  platebních podmínek, #367) — z `test-draft` 57ebc02 (v29.9.4), hotový krok
  1 z 8 (jádro `src/plan_plateb.js` + test, ve větvi v29.9.5); vlastní
  `PREDAVKA.md` s kroky 2–8, výchozími návrhy Q1/Q2/Q4 a otázkami.
- **Nesloučené, nemazat:** `claude/pensive-curie-s6yzs3` (hlava fd1be2b —
  commity 6459930 a 9a48ee8 přišly do `test-draft` s větví oprav, zbývá jen
  předávka fd1be2b), `claude/komplexni-test-v29.9.1` (výsledky 21. kola),
  `claude/opravy-v29.9.1` (tatáž předávka + prompt šesti oprav).
Roadmapa: `roadmapa/roadmap.json` (374 položek, nejvyšší #374), stránka se
generuje `python3 roadmapa/roadmapa.py`.

## Hotovo v30.9.1 — opravy šesti nálezů 21. kola (podrobně CHANGELOG.md)
Třída „koncová cena bez schválení" (vysoké):
- **B111** — zápornou částku, množství ani hodiny (vlastní položky,
  volitelné, příplatky, přepisy, hodiny N56, položky PROJ) server nepřijme
  nikomu, ani administrátorovi (`uloZaporneProblemy`); UI `min="0"`
  a hláška; zábrana `zapornaPolozka` pro starší zakázky; zamčená varianta
  se nekontroluje. Detekce dřívějšího zneužití: `nastroje/detekce_zneuziti.mjs`.
- **B96** — krok a směr obchodního zaokrouhlení jen z výčtu
  (`uloZaokrProblemy`), UI settery jen z výčtu + volba „mimo nabídku".
- **B112** (nový nález) — ceník varianty a skryté přepisy (množství, ceny,
  přirážka, sazba, cena PROJ) smí měnit jen administrátor nebo role, které to
  povoluje matice zobrazení (`uloCenikProblemy`; porovnání se zveřejněnými
  ceníky, uloženou variantou a ostatními variantami; bez zveřejněného ceníku
  se ceník nekontroluje).
Střední:
- **B97** — e-mailový klíč brzdy přihlášení má předponu `e:` (nekoliduje
  s počítadlem adresy IP).
- **B98** — obnova ze SOUBORU přepočítá ověření zámku (podvržená „shoda"
  neprojde, nesouhlas ohlásí náhled) a odemčení, které v databázi není,
  neobnoví (zakázka přeskočena s důvodem); obnova z OTISKU beze změny.
- **B99** — šablona Wordu nesmí nést makra, vložené objekty, vnější vztahy
  (`attachedTemplate`, `oleObject`, …) ani pole INCLUDE…/DDE
  (`src/sablona_obsah.js` — server při nahrání, UI, generátor i překlad).
- **Při sloučení:** kontroly B111/B96/B112 v `zakazka_kontrola.mjs` za
  kontrolou typů a před #372 (Git sloučil sám, ověřeno čtením); pravidel
  kontroly 24; B98 v `netlify/test_obnova.mjs` přečíslován na zakázky
  0800–0804 (0790–0794 má #372); roadmapa #373 hotovo, #374 čeká.
- **Ověřeno celým kolem** 30. 9. 2026 nad sloučeným stavem (69 min 50 s):
  VŠE ZELENÉ — sestavení ✓; sady 199 prošlo, 0 selhalo, 1 přeskočeno z 200
  (test.js — shoda s Excelem); mutace jádra 80 z 80; mutace serveru 206
  z 206; statické kontroly 3 z 3.
- Ve větvi obě celá kola zelená (v29.9.4 a v29.9.7 větve, mutace serveru
  201/201). Testování po opravách: sezení „Testování po opravách v29.9.1
  (22. kolo)" https://claude.ai/code/session_011bKm7zw36TH8By3Ef7rF1i.

## Hotovo dřív v test-draft (v29.9.1–v29.9.4)
- v29.9.4: sloučení #371 (testovací sekvence A1–A5, jedno testovací kolo,
  opravy B72/P4, B75–B78, N43) a #372 (neznámý rozměr profilu).
- v29.9.1–v29.9.3: #364 nabídka PROJ se slevou, rozhodnutí J. V. k rozboru
  D kola 16 (`podklady/K16_ROZBOR_2026-09-25.md`), P8b, P9.2/P9.4/P9.5,
  P10.x, P11 `projZahranici`, P8A značky bloků + šablony CN v13 a PROJ v3.

## Platební podmínky z krycího listu — ROZHODNUTO 29. 9. 2026
Návrh `podklady/NAVRH_PLATEBNI_PODMINKY_2026-09-29.md` (oddíl 7 =
rozhodnutí), prototyp https://claude.ai/artifact/6sbxbaAsBpphfPfE2wnM3a.
- OCK: tři firemní milníky, jak jsou; věty o podmínce úhrady u 1. a 2.
  splátky jako dnes; měsíční fakturace větou „Fakturace probíhá měsíčně
  podle skutečně provedených prací."
- PROJ: čtyři předvolby, výchozí „Standard po činnostech"; splátky SoD PROJ
  se stejným milníkem sečíst do jedné platby; šablona SoD PROJ dostane
  seznam plateb jedním symbolem místo 8 pevných řádků.
- Číslo smlouvy: ruční pole v krycím listu s návrhem dalšího čísla, formát
  `2026 - OPR - SOD - 0001` (realizace) a `2026 OVP SOD 0001` (projekce),
  navázat na papírové smlouvy.
- **Pořadí etap: B → A → C.** Etapa B běží ve větvi
  `claude/etapa-b-plan-plateb-proj` (viz výše); A a C až na pokyn J. V.

## Rozhodnutí z oprav podle výchozího návrhu — čekají na potvrzení J. V.
- **B111:** zápornou položku, množství ani hodiny nesmí nikdo, ani
  administrátor (dobropis ne; jako N56).
- **B96 bod 4:** marže z koncové ceny i bez slevy — jen návrh, nerealizováno.
- **B112:** vedeno jako nový nález (vysoká); B88 dál jen čtecí strana.
- **B97:** vážnost střední.
- **B98:** odemčení ze souboru, které v databázi není → zakázku přeskočit
  s důvodem v náhledu obnovy.
- **B99:** vnější odkazy `http(s):` a `mailto:` v šabloně zůstávají povolené.

## Čeká na J. V.
- **Release v30.9.1** (odkaz v závěrečné zprávě sezení) a **smazat větve**
  `claude/oprava-sesti-nalezu-v29.9.1`, `k16-nalezy`,
  `claude/stoic-cerf-j915ax`
  (https://github.com/vendljar/kalkulator-next-gen-engscalc/branches).
- Spustit `node nastroje/detekce_zneuziti.mjs <záloha ostré databáze>`
  (Nastavení → Databáze → Zálohovat teď) — najde dřívější zneužití B111
  a B96 i v odeslaných nabídkách.
- Rozhodnout bod 4 B96 a **#374** (zbývající cesty třídy „koncová cena":
  hodiny a rezerva standardních položek PROJ, cena trvalé položky s kid,
  zaokrouhlení z výčtu); množství příplatků obchodníkem vs. `sloupce.naklad`.
- **Poslední číslo papírových smluv** realizace (OPR) a projekce (OVP)
  pro etapu C.
- Soubory SoD (#350) — bez nich nejde ověřit symboly smluv (i pro etapu B:
  symbol seznamu plateb v šabloně SoD PROJ).
- Pokyn k přenosu `test` do `main`.
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
  ~60 min) nebo `--bez-mutaci`, `--jen sady` apod. Mutační běh nepřerušovat,
  spouštět na pozadí nástroje (ne setsid); po přerušení
  `grep -rn "if (false)" netlify src` a `git diff netlify src`.
- Šablony pro harnessy: `KNG_PODKLADY=<složka>` s CN v13 (+EN/DE/FR) jako
  nejvyšší verzí, CN i jako `Sablona_NABIDKA_CN_v11.docx` a PROJ v3
  pojmenovanou `Sablona_NABIDKA_PROJ.docx`; SoD realizace/projekce, plná moc
  a příručka (kopie s číslem aktuální verze, krok 0.7 skillu). V novém
  sezení nejsou — konektor Disku (hledat podle názvu), nebo
  `node nastroje/vyrob_sablony.js <CN v12 a PROJ v2> [výstup]`.
- Harnessy a serverové sady s `ADMIN_EMAIL=spravce@priklad.cz`
  (testovaci_kolo.sh ho nastaví sám); symlink `node_modules/playwright`
  → `$(npm root -g)/playwright` (a `playwright-core`).
- Pojistky uložení i obnovy stojí v `netlify/lib/zakazka_kontrola.mjs`
  (ne v `functions/zakazky.mjs`) — tam patří i nové kontroly zakázky.
  Pořadí: typy → B111 záporné → B96 zaokrouhlení → B112 ceník → #372 profil.
- **Od B112 test nebo harness, který ukládá zakázku se změněným ceníkem,**
  musí ukládat jako administrátor, nebo nejdřív zveřejnit ceník
  (vzor `overit_online.mjs`, `cenikPlatnyTed()` v `netlify/test_prava.mjs`).
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
**Etapa B** platebních podmínek pokračuje ve větvi
`claude/etapa-b-plan-plateb-proj` krokem 2 (Firma) podle její `PREDAVKA.md`
a podkladu `podklady/ETAPA_B_PODKLAD_2026-09-29.md` (ve větvi). Nové sezení
dostane oddíl „ÚKOL 2 — ETAPA B" z promptu v `git show 57ebc02:PREDAVKA.md`
a tuto předávku. Větev je z v29.9.4 — před sloučením do `test-draft` do ní
vmergovat `test-draft` (konflikty: `kontroly.js` počet pravidel 24 → +2,
`build.py` CORE `sablona_obsah.js` × `plan_plateb.js`, CHANGELOG v29.9.5
větve, `mutace.mjs`).
