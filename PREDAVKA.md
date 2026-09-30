# Předávka — stav k 30. 9. 2026 večer (v30.9.4 na test-draft, v30.9.3 na test, v30.9.1 na main)

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
- **Celé kolo nad d7e2f32 BĚŽÍ** (spuštěno 30. 9. večer) — výsledek doplní integrátor.

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
