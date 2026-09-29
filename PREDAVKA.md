# Předávka — stav k 29. 9. 2026 večer (v29.9.4 na test, nové sezení)

Na `main`: **v25.9.3** (+ oprava Node), tag `v25.9.3`.
Na `test` i `test-draft`: **v29.9.4** (`test` převeden 29. 9. večer na pokyn
J. V.) — sloučeny větve `claude/pensive-curie-s6yzs3` (testovací sekvence
A1–A5, #371) a `claude/stoic-cerf-j915ax` (#372). Releasy **v29.9.3**
a **v29.9.4** vydal J. V. 29. 9. (tagy z cloudu pushnout nejde — proxy
HTTP 403, proto odkazy na release, viz CLAUDE.md).

**Větve k 29. 9. 2026 večer:**
- `k16-nalezy` a `claude/stoic-cerf-j915ax` jsou celé v `test-draft` —
  J. V. je smaže (pokyn 29. 9., z cloudu to nejde).
- `claude/pensive-curie-s6yzs3` má po sloučení **3 další commity** jiného
  sezení (PREDAVKA, CHANGELOG, verze 29.9.1 — „úpravy vždy promptem do
  paralelní větve", tag v29.9.1 se nepoužil; hlava kódu v26.9.1 = `9a48ee8`),
  `claude/komplexni-test-v29.9.1` **5 commitů** (výsledky komplexní testovací
  procedury nad v29.9.1 — 21. kolo, rozhodnutí J. V. „šest oprav teď, zbytek
  po dalším testování") a `claude/opravy-v29.9.1` (tatáž předávka + sloučený
  prompt šesti oprav). Do `test-draft` nesloučené, nemazat.
- Opravy šesti nálezů poběží ve větvi `claude/oprava-sesti-nalezu-v29.9.1`
  z `9a48ee8` (zatím neexistuje, založí ji nové sezení).
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
- **Ověřeno celým kolem:** celé kolo 29. 9. 2026 nad sloučeným stavem (47 min)
  VŠE ZELENÉ: sestavení ✓; sady 193 prošlo, 0 selhalo, 3 přeskočeno z 196
  (test.js — shoda s Excelem; overit_manual, overit_sod — firemní podklad
  mimo repozitář); mutace jádra 80 z 80; mutace serveru 192 z 192;
  statické kontroly 3 z 3.

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

## Další krok — nové sezení (29. 9. 2026 večer, pokyn J. V.)
Sezení: @@SEZENI@@ — dostalo zadání níže (oddíl „Prompt nového sezení").
1. **Oprava šesti nálezů 21. kola** (B111, B96, B112, B97, B98, B99) přesně
   podle `podklady/PROMPT_oprava_sesti_nalezu_v29.9.1.md` — větev
   `claude/oprava-sesti-nalezu-v29.9.1` z `9a48ee8`, dvě celá kola, do
   `test-draft` nic. Testování po opravách: sezení „Testování po opravách
   v29.9.1 (22. kolo)" https://claude.ai/code/session_011bKm7zw36TH8By3Ef7rF1i.
2. **Potom etapa B** (#367): větev `claude/etapa-b-plan-plateb-proj`
   z `test-draft` — plán plateb PROJ v krycím listu PROJ (model činnost →
   splátky procento + milník), předvolby v Nastavení → Firma (výchozí
   Standard po činnostech), nabídka PROJ online + šablona PROJ v4 z plánu,
   dopočet splátek SoD PROJ sečtených podle milníku + symbol seznamu plateb
   (nová šablona SoD PROJ).
3. Při slučování větve oprav do `test-draft`: volání B111/B96/B112 a blok
   #372 (neznámý rozměr profilu) stojí v `zakazka_kontrola.mjs` na témž
   místě za `uloTypyProblemy` — ponechat všechny; nové položky roadmapy
   z větví číslovat od #373.

## Čeká na J. V.
- **Smazat větve** `k16-nalezy` a `claude/stoic-cerf-j915ax`
  (https://github.com/vendljar/kalkulator-next-gen-engscalc/branches).
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

## Prompt nového sezení (29. 9. 2026 večer)
Poslaný při založení sezení @@SEZENI@@; když sezení spadne, nové dostane
tentýž text (úkol 1 pak pokračuje podle POKRAČOVÁNÍ v zadání oprav).

```
Pracuješ na Kalkulator Next Gen (repo vendljar/kalkulator-next-gen-engscalc). Navazuješ na sezení https://claude.ai/code/session_01NVWqCjy1gg39993mFY7sJS („Kalkulator Next Gen dávka B"); klíčové informace z něj jsou níže a v PREDAVKA.md na větvi test-draft.

KOMUNIKACE A PRAVIDLA
- Česky; nikdy AskUserQuestion — ptej se prózou s navrženou výchozí odpovědí. Uživatel je J. V.
- Než začneš: git fetch origin test-draft; přečti CLAUDE.md a PREDAVKA.md z origin/test-draft (git show origin/test-draft:CLAUDE.md, …:PREDAVKA.md) a skill kalkulator-next-gen; testy podle skillu testovaci-procedura-kng.
- Pravidlo J. V. 29. 9. 2026: úpravy vždy v paralelní větvi (každý úkol svou), o sloučení do test-draft rozhoduje J. V. Do test-draft, test ani main nic bez jeho pokynu.
- Z cloudu nejde pushnout tag ani smazat větev (proxy HTTP 403) — neobcházet. Tag = pošli J. V. odkaz releases/new?tag=…&target=<plný SHA>&title=… (CLAUDE.md, oddíl „Tagy, releasy a mazání větví"); na konci dávky vypiš verze, které release ještě nemají (ověř přes GitHub).
- Kontext: get_session (bez session_id) → context_usage na konci každé dávky; nad 60 % upozorni J. V., nad 75 % přepiš PREDAVKA.md své větve a doporuč nové sezení.

STAV K 29. 9. 2026 VEČER
- main v25.9.3; test i test-draft v29.9.4 (releasy v29.9.3 a v29.9.4 vydané). test-draft nese kolo 16 (v29.9.1–3), testovací sekvenci A1–A5 (#371, z pensive-curie), opravu neznámého rozměru profilu (#372) a rozhodnutí J. V. k platebním podmínkám.
- Roadmapa v test-draft má 372 položek, nejvyšší #372. Nové položky v kterékoli větvi čísluj od #373 — ve větvích z 9a48ee8 je roadmapa starší (tamní #364/#365 = #371/#372 v test-draft; #366–#370 jsou v test-draft jiné úkoly).
- Větve k smazání (udělá J. V.): k16-nalezy, claude/stoic-cerf-j915ax. Nesloučené, nemazat: claude/pensive-curie-s6yzs3, claude/komplexni-test-v29.9.1, claude/opravy-v29.9.1.

ÚKOL 1 — OPRAVA ŠESTI NÁLEZŮ 21. KOLA (nejdřív)
Proveď beze změny zadání v souboru podklady/PROMPT_oprava_sesti_nalezu_v29.9.1.md (git show origin/test-draft:podklady/PROMPT_oprava_sesti_nalezu_v29.9.1.md) — celé, včetně příloh A–F: větev claude/oprava-sesti-nalezu-v29.9.1 z commitu 9a48ee86f66f83e7c71b1f6c94189f6f2663634d (neexistuje, založ ji), pořadí B111 → B96 → B112 → celé kolo 1 → B97 → B98 → B99 → celé kolo 2, závěr pro J. V. Toto zadání má přednost před čímkoli níže.
Doplňky z předchozího sezení (zadání neruší):
- #372 (neznámý rozměr profilu) je opravený jen v test-draft; v kódu 9a48ee8 ho neopravuj. V test-draft stojí serverový blok #372 hned za uloTypyProblemy v netlify/lib/zakazka_kontrola.mjs a je tam i razítko upravilJmeno (P7) — při pozdějším slučování do test-draft se volání B111/B96/B112 a blok #372 zařadí za sebe (konflikt na tomto místě je očekávaný; zapiš to do PREDAVKA.md).
- Šablony z Disku slož do složky pro KNG_PODKLADY: CN v13 (+EN/DE/FR) jako nejvyšší verze, kopii CN i jako Sablona_NABIDKA_CN_v11.docx, PROJ šablonu pojmenuj Sablona_NABIDKA_PROJ.docx; přidej SoD realizace/projekce, plnou moc a příručku, ať overit_sod/overit_manual neběží naprázdno. Nic z podkladů necommitovat.
- Harnessy: ADMIN_EMAIL=spravce@priklad.cz; symlink node_modules/playwright → $(npm root -g)/playwright. Mutace jen jeden běh naráz na pozadí nástroje, nikdy nepřerušit; potom git status a grep -rn "if (false)" netlify src.

ÚKOL 2 — ETAPA B PLATEBNÍCH PODMÍNEK (potom)
Po závěru úkolu 1 pokračuj etapou B (když kontext nestačí, přepiš PREDAVKA.md a doporuč nové sezení s tímto oddílem). Nová paralelní větev claude/etapa-b-plan-plateb-proj z origin/test-draft (ne z větve oprav).
Podklady: podklady/NAVRH_PLATEBNI_PODMINKY_2026-09-29.md v test-draft — oddíl 3 (koncept) a oddíl 7 (rozhodnutí J. V. 29. 9.); roadmapa #367 (etapy B a A) a #366 (bod P9.3 dopočet SoD PROJ patří do etapy B); klikací prototyp https://claude.ai/artifact/6sbxbaAsBpphfPfE2wnM3a (chování krycího listu PROJ, texty, dopočet a sčítání plateb).
Rozhodnuto: čtyři předvolby — Standard po činnostech (= dnešní procenta v src/nabidka_proj.js), Záloha + zbytek po předání (= dnešní krycí list PROJ, záloha 30/50/70 % nebo bez), 100 % po dokončení stupně (= dnešní Nastavení → Firma), Vlastní; výchozí Standard po činnostech. Splátky SoD PROJ se stejným milníkem se sečtou do jedné platby. Šablona SoD PROJ dostane seznam plateb jedním symbolem místo 8 pevných SODP_PLATBA1–8_KC.
Rozsah: model plánu plateb v krycím listu PROJ (činnost → splátky procento + milník, jen nabízené činnosti, autorský dozor měsíčně mimo splátky); katalog milníků projekce a předvolby v Nastavení → Firma; nabídka PROJ online i Word z plánu místo pevných bloků PLATEBNÍ PODMÍNKY v src/nabidka_proj.js (šablona PROJ v4 přes nastroje/vyrob_sablony.js, i EN/DE/FR); dopočet splátek SoD PROJ = procento × cena činnosti po slevě, zaokrouhlení nese poslední splátka, ruční přepis částky zůstává, kontrola součet plateb = cena díla (zábrana) a součet 100 % u každé činnosti (zábrana); převod starších zakázek (zaloha, faktZamereni/faktDpz/faktDps, sodpPlatba1–8) bez ztráty ručně zadaných částek. Šablonu SoD PROJ (Sablona_SOD_PROJEKCE.docx, #350) vezmi z Disku; bez ní udělej dopočet a symbol a úpravu šablony nech na J. V. (napiš to).
Postup: Pravidlo 0 → test, který bez opravy selže → oprava → commit po bodech; build (verze podle dne commitu); celé kolo nastroje/testovaci_kolo.sh; CHANGELOG, roadmapa (#367: etapa B hotová, etapa A zbývá), PREDAVKA.md ve větvi; push jen do claude/etapa-b-plan-plateb-proj. Etapy A a C až na pokyn J. V. (u C chybí poslední číslo papírových smluv OPR a OVP).

ZÁVĚR
Po každém úkolu krátká zpráva J. V.: tabulka úkolů ✅/⬜, výsledky kol s počty, hlava větve, odkazy na release jen u verzí, které má J. V. tagovat, a context_usage.
```
