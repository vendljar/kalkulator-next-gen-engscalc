# Předávka — stav k 30. 9. 2026 (v30.9.2 na test-draft, v30.9.1 na test)

Na `main`: **v25.9.3** (+ oprava Node), tag `v25.9.3`.
Na `test`: **v30.9.1** (opravy šesti nálezů 21. kola, release vydaný J. V.
30. 9.). Na `test-draft`: **v30.9.2** — etapa B platebních podmínek (plán
plateb projekce, #367) z větve `claude/etapa-b-plan-plateb-v30.9.1`
(fast-forward na pokyn J. V. 30. 9. 2026 „pokračuj etapou B v nové větvi…
výstup pošli zatím do test-draft"); do `test` jen na pokyn J. V.
Releasy **v29.9.3**, **v29.9.4**, **v29.9.7** a **v30.9.1** vydané;
**v30.9.2** — odkaz na release poslán J. V. (tagy z cloudu pushnout nejde —
proxy HTTP 403, viz CLAUDE.md).

**Větve k 30. 9. 2026** (ověřeno `git merge-base --is-ancestor`):
- **Celé v `test-draft` — J. V. je smaže, až nebudou potřeba:**
  `claude/etapa-b-plan-plateb-v30.9.1` (v30.9.2), `claude/oprava-sesti-nalezu-v29.9.1`
  (v30.9.1), `k16-nalezy` a `claude/stoic-cerf-j915ax` (z dřívějška).
- **Nahrazená, ne celá v `test-draft`:** `claude/etapa-b-plan-plateb-proj`
  (etapa B z v29.9.4) — krok 1 přenesen do nové větve, zbytek hotový tam;
  k práci už není potřeba (smazání rozhodne J. V.).
- **Nesloučené, nemazat:** `claude/testovani-po-opravach` (předávka 22. kola
  nad v29.9.7 = kód v30.9.1: VYHOVUJE S NÁLEZY — 2 nové vysoké v třídě
  „koncová cena" #374, B99 obejitelná; čeká na rozhodnutí J. V.),
  `claude/pensive-curie-s6yzs3` (zbývá předávka fd1be2b),
  `claude/komplexni-test-v29.9.1` (výsledky 21. kola), `claude/opravy-v29.9.1`
  (předávka + prompt šesti oprav).
Roadmapa: `roadmapa/roadmap.json` (374 položek, nejvyšší #374), stránka se
generuje `python3 roadmapa/roadmapa.py`.

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

## Výchozí návrhy etapy B — čekají na potvrzení J. V.
Q1 projednání 100 % „po předání vyjádření odboru památkové péče HMP";
Q2 geodet 100 % „po předání geodetického zaměření"; Q4 celé koruny, poslední
splátka činnosti dorovná; Q5 dřívější záloha se nepřepíná sama (tlačítko);
Q8 Standard se v Nastavení mění převzetím z otevřené zakázky; Q9 nové texty
přes slovník, vlastní text milníku zůstává v EN/DE/FR česky (bez varování);
Q10 způsob fakturace z předvolby; Q11 řádek smlouvy „Platba ve výši … + DPH
proběhne …"; Q12 řádky nabídky „Platba {milník} – N % z nabídkové ceny za
{činnost}". Z revize: brána počítá plán v korunách — nesedící ruční částka
v Kč zastaví i cizojazyčnou smlouvu (ta ruční částky nebere, eura se
dopočítají); server nekontroluje tvar `planPlateb` / `zmrazenoPlan` ve
variantě (jen firemní plán).

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
- **Release v30.9.2** (odkaz v závěrečné zprávě sezení) a **smazat větve**,
  které jsou celé v `test-draft` (seznam výše;
  https://github.com/vendljar/kalkulator-next-gen-engscalc/branches).
- **Nahrát šablony** nabídky PROJ v4 (+EN/DE/FR) a SoD PROJ v2 (Nastavení →
  Šablony) — až do verze s etapou B; v30.9.1 nové symboly nezná.
- Potvrdit výchozí návrhy etapy B (výše) a pokyn k etapám A a C.
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
- Pokyn k přenosu `test-draft` do `test` a `test` do `main`.
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
  k 30. 9.: sad 205, mutace jádra 87, mutace serveru 207.
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
Čeká se na J. V. (výše): release v30.9.2, šablony, potvrzení výchozích
návrhů etapy B, rozhodnutí o nálezech 22. kola, pokyn k etapě A (OCK
platební kalendář) a C (číslo smlouvy, #366) a ke sloučení `test-draft`
do `test`. Nová práce vždy v paralelní větvi (`claude/…`) z `test-draft`.
