# Předávka — stav k 29. 9. 2026 (sloučení do test-draft, v29.9.4)

Na `main`: **v25.9.3** (+ oprava Node), tag `v25.9.3`.
Na `test`: **v29.9.3**. Na `test-draft`: **v29.9.4**, tag `v29.9.4` —
sloučeny větve `claude/pensive-curie-s6yzs3` (testovací sekvence A1–A5,
#371) a `claude/stoic-cerf-j915ax` (#372) na pokyn J. V. 29. 9. 2026.
Obě větve i `k16-nalezy` jsou sloučené — navrženo J. V. je smazat (z cloudu
to nejde).
Roadmapa: `roadmapa/roadmap.json` (372 položek), stránka se generuje
`python3 roadmapa/roadmapa.py`.

## Hotovo v29.9.4 — sloučení (podrobně CHANGELOG.md)
- **#371 (ve větvi #364), v26.9.1:** testovací sekvence A1–A5 — fuzz
  (`src/test_fuzz_invarianty.js`), hlídač členských výrazů a obecný
  `overit_xss.mjs`, historické zakázky (`src/test_zamek_historie.js`
  + `src/fixtury/`), statická kontrola údajů (`nastroje/kontrola_udaju.py`),
  jedno testovací kolo `nastroje/testovaci_kolo.sh`; opravy B72/P4 (jedna
  kontrola zakázky pro uložení i obnovu — `netlify/lib/zakazka_kontrola.mjs`),
  B75–B78 (přihlášení), N43 na serveru.
- **#372 (ve větvi #365):** zakázka s neznámým rozměrem profilu jde otevřít —
  výpočet bez výjimky, zábrana `profilNeznamy`, volba „neznámý rozměr"
  v zadání šachty, server odmítne neuzamčenou variantu.
- **Při sloučení:** #364/#365 z větví přečíslovány na #371/#372 (i v kódu
  a testech); razítko `upravilJmeno` (P7) přestěhováno do společné kontroly
  uložení a mutace P7 za ním; pravidel kontroly 23; mutace jádra 80,
  serveru 192.
- **Ověřeno celým kolem:** @@KOLO_SLOUCENI@@

## Hotovo dřív v test-draft (v29.9.1–v29.9.3)
- #364 nabídka PROJ se slevou (činnosti za cenu před slevou, rekapitulace
  se sečte), rozhodnutí J. V. k rozboru D kola 16 (tabulka v
  `podklady/K16_ROZBOR_2026-09-25.md`), P8b termín v týdnech, P9.2/P9.4/P9.5
  (SoD OCK z krycího listu, zámek zmrazí podmínky), P10.1/10.2/10.4/10.5/10.7,
  P11 `projZahranici`, P8A značky bloků + šablony CN v13 a PROJ v3 (+EN/DE/FR).

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
- **Pořadí etap: B → A → C** (PROJ plán plateb → OCK platební kalendář →
  číslo smlouvy). Roadmapa #367 (etapy B a A) a #366 (etapa C; dopočet
  SoD PROJ jde s etapou B) odblokované.

## Další krok
- **Etapa B** (#367): plán plateb PROJ v krycím listu PROJ (model činnost →
  splátky procento + milník), předvolby v Nastavení → Firma (výchozí
  Standard po činnostech), nabídka PROJ online + šablona PROJ v4 z plánu,
  dopočet splátek SoD PROJ sečtených podle milníku + symbol seznamu plateb
  (nová šablona SoD PROJ). Test před opravou → oprava → commit po bodech.

## Čeká na J. V.
- **Poslední číslo papírových smluv** realizace (OPR) a projekce (OVP),
  na které má řada navázat — v odpovědi „v poznámce", poznámka nepřišla.
- Pokyn k přenosu `test-draft` (v29.9.4) do `test` a dál do `main`.
- Soubory SoD (#350) — bez nich nejde ověřit symboly smluv (i pro etapu B).
- **N46** (nástupiště A ↔ C u zrcadlové šachty): neopraveno, fuzz hlásí INFO.
- Z dřívějška: rozhodnutí z dávky B kola 16 (bez čísla se neukládá; přepočet
  po zveřejnění ceníku není neuložená změna; „ß" = „ss") a překlady z dávky C;
  telefon a jméno kolegy v `overit_nabidka_proj_word.mjs` (#346 / B79);
  CSP bez `'unsafe-inline'`; #369 (vypnout náklady obchodníkovi).

## Poznámky pro další sezení
- **Testy jedním příkazem:** `bash nastroje/testovaci_kolo.sh` (celé kolo
  ~65 min) nebo `--bez-mutaci`, `--jen sady` apod. Mutační běh nepřerušovat,
  spouštět na pozadí nástroje (ne setsid); po přerušení
  `grep -rn "if (false)" netlify src` a `git diff netlify src`.
- Šablony pro harnessy: `KNG_PODKLADY=<složka>` s CN v13 (+EN/DE/FR) jako
  nejvyšší verzí, CN i jako `Sablona_NABIDKA_CN_v11.docx` a PROJ v3
  pojmenovanou `Sablona_NABIDKA_PROJ.docx`. V novém sezení nejsou — požádat
  J. V., nebo `node nastroje/vyrob_sablony.js <CN v12 a PROJ v2> [výstup]`.
- Harnessy a serverové sady s `ADMIN_EMAIL=spravce@priklad.cz`
  (testovaci_kolo.sh ho nastaví sám); symlink `node_modules/playwright`
  → `$(npm root -g)/playwright`.
- Pojistky uložení i obnovy stojí v `netlify/lib/zakazka_kontrola.mjs`
  (ne v `functions/zakazky.mjs`) — tam patří i nové kontroly zakázky.
- `profilyNezname()` z `engine.js` volá i server (přes `globalThis`).
- Server musí načítat v `jadro_moduly.cjs` tytéž moduly migrací jako
  prohlížeč (pořadí CORE v build.py) — hlídá `src/test_zamek_historie.js`.
- Nový smyšlený kontakt v testu → `nastroje/povolene_kontakty.txt`.
- Komentář uvnitř `KOD_STRANKY` v `overit_xss.mjs` nesmí obsahovat zpětné
  apostrofy; komentář s doslovnou uzavírací značkou skriptu v `src/`
  rozbije celou aplikaci.
- Kontejner běží v UTC: verze vDEN.MĚSÍC se měří k datu posledního commitu.
- LibreOffice v kontejneru nemá Writer — .docx jen strukturou XML.
- Dvě nezávislé pojistky potřebují každá vlastní cílený test.
- Čísla roadmapy přiděluje ten, kdo slučuje — před přidáním položky zjistit
  nejvyšší id v cílové větvi.

## Prompt pro nové sezení (větev test-draft)
Sezení založit nad `vendljar/kalkulator-next-gen-engscalc`, větev
`test-draft`; přiložit šablony CN v13 (CZ/EN/DE/FR), PROJ v3 (CZ/EN/DE/FR)
a Sablona_SOD_REALIZACE.docx + Sablona_SOD_PROJEKCE.docx.

```
Pracuješ na Kalkulator Next Gen ve větvi test-draft (repo vendljar/kalkulator-next-gen-engscalc).
Do test a main nic bez pokynu J. V.
Než začneš:
1. git fetch origin test-draft && git checkout -B test-draft origin/test-draft
2. Přečti CLAUDE.md a PREDAVKA.md a skill kalkulator-next-gen.
3. Připrav prostředí: symlink node_modules/playwright → $(npm root -g)/playwright;
   přiložené šablony dej do složky podkladů a pouštěj testy s KNG_PODKLADY=<složka>
   (PROJ šablonu pojmenuj Sablona_NABIDKA_PROJ.docx).
4. Ověř výchozí stav: bash nastroje/testovaci_kolo.sh --bez-mutaci (má být vše zelené).
Úkol: etapa B platebních podmínek (#367) podle podklady/NAVRH_PLATEBNI_PODMINKY_2026-09-29.md,
oddíly 3 a 7: plán plateb PROJ v krycím listu PROJ, předvolby v Nastavení, nabídka PROJ
z plánu, dopočet splátek SoD PROJ sečtených podle milníku + seznam plateb jedním symbolem.
U každého bodu: test, který bez opravy selže → oprava → vlastní commit. Pak build, celé kolo
nastroje/testovaci_kolo.sh (mutace nepřerušovat), CHANGELOG, roadmapa, PREDAVKA.md, push do
test-draft. Na konci tabulka úkolů ✅/⬜ a stav kontextu (get_session → context_usage).
```
