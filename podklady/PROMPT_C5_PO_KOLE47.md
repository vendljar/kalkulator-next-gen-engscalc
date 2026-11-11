# Prompt C5 — obnova testovací sady zakázek nástrojem `nastroje/test_sada_obnov.mjs` (po kole 47)

Jsi vývojové sezení projektu Kalkulator Next Gen (model Opus 5.5). Komunikuj česky. Na začátku přečti `CLAUDE.md`,
`PREDAVKA.md` (oddíl „Předávka koordinace — 11. 11. 2026“) a `podklady/PROMPT_RIDICI_SEZENI_PO_KOLE47.md`
(B0 bod 9, B9, C5). Spusť `bash nastroje/instaluj_hooky.sh`. Nikdy AskUserQuestion — u nejasnosti zvol výchozí
(bezpečnější) variantu a napiš ji do závěrečné zprávy.

| | |
|---|---|
| větev | `claude/c5-test-sada` |
| báze | `aa445a12f187701351c627c15c820d512fc66e1b` (integrace, obsah = test v11.11.1) |
| roadmapa | **#585** (před zápisem ověř, že je volné) |
| meze B | **B215–B216** vyhrazené pro tuto dávku (nejvyšší nad bází je B214; K40 drží B199–B209) — zapiš do `BEZPECNOST_MEZE.md`, co nástroj smí a co ne |
| odhad | 4–5 h |
| riziko | **bezpečnostně citlivé — nástroj zapisuje do databáze jako administrátor.** Před sloučením revize poradce (Fable) nad celým diffem; nástroj se nikomu nedává ke spuštění před revizí |

Do `test-draft`, `test`, `main` ani do integrace nic. Nic do Pipedrive ani na Disk. **Sezení nástroj proti žádnému
skutečnému webu nespouští** (ani testovacímu) — jen proti místnímu serveru v paměti. Spustí ho J. V. lokálně.
Žádné ceny, osobní údaje ani export zakázek do repa. `git push --no-verify` je zakázané.

Kód aplikace a serveru (`src/`, `netlify/functions`, `netlify/lib`) se v této dávce **nemění**. Kdyby nástroj bez
změny serveru nešel udělat, zastav se a napiš koordinaci.

## 1. Proč a co

Od 2.–3. 11. 2026 nejsou TEST zakázky kol K28/K29/K36 v testovací ani v ostré databázi (K39-I1); kola běží nad
kopií z 2. 11. J. V. rozhodl (B0.9): obnovit sadu do **testovací** databáze nástrojem, spustí ho sám.

Nástroj ze souboru exportu založí zakázky s číslem `TEST - …` v testovacím prostředí přes běžné `/api/zakazky`
jako přihlášený administrátor — stejnou cestou a se stejnými kontrolami jako prohlížeč. Čísla ani varianty nemění,
zámky ponechá. Vzor stavby nástroje: `nastroje/migrace_znacky.mjs` (přihlášení, heslo z klávesnice, náhled před
zápisem).

## 2. Bezpečnostní požadavky (každý má vlastní test a mutaci)

**P1 — ostrý web se odmítne, dřív než se zadá heslo.**
- Cíl jen z **povoleného seznamu**: `https://testengscalc.netlify.app` a místní adresy (`http://localhost:<port>`,
  `http://127.0.0.1:<port>`). Cokoli jiného = chyba s kódem 2, bez přepínače, kterým by to šlo obejít. Jiný
  testovací web se přidá úpravou seznamu v kódu (a revizí), ne parametrem.
- Navíc výslovné odmítnutí ostrých webů se srozumitelnou hláškou — stejná pravidla jako
  `pdSimulatorOstryWeb` / `pdSimulatorStav` v `netlify/lib/pipedrive_simulator.mjs`: host `engscalc.netlify.app`,
  `<nasazení>--engscalc.netlify.app`, cokoli se `schaftscalc`. Porovnání hostu **přesně** z `new URL()` (podřetězec
  „engscalc“ by trefil i testengscalc); jen `https` (mimo místní adresy), bez uživatele a hesla v adrese, bez
  cesty. Pravidla nekopíruj volně — importuj sdílenou funkci, nebo test hlídá shodu se simulátorem.
- Před přihlášením `GET /api/zdravi`: musí vrátit `prostredi === 'test'` (viz `netlify/functions/zdravi.mjs`;
  nenastavená proměnná = `ostre`). Jinak konec, heslo se vůbec nevyžádá.
- Všechna volání `fetch` s `redirect: 'error'` — přesměrování z testovacího webu jinam se nenásleduje.
- Po přihlášení a znovu těsně před prvním zápisem ověř `/api/zdravi` ještě jednou.

**P2 — jen administrátor, jen `/api/zakazky`.**
- Přihlášení `POST /api/prihlaseni`; role z odpovědi musí být přesně `Administrátor`, jinak konec (obchodník by
  založil zakázky pod sebou a server by mu přepsal autora).
- E-mail a heslo jen z klávesnice (heslo bez ozvěny, jako `migrace_znacky.mjs`); ne z parametru, ne z proměnné
  prostředí, ne ze souboru. Relace (cookie) jen v paměti, nikam se nezapisuje a nevypisuje. Na konci
  `POST /api/odhlaseni`.
- Nástroj smí volat jen: `GET /api/zdravi`, `POST /api/prihlaseni`, `POST /api/odhlaseni`, `GET /api/zakazky`
  (rejstřík a čtení zpět), `POST /api/zakazky`. Žádné `DELETE`, žádná `/api/obnova`, `/api/zaloha`, Pipedrive.
  Test hlídá seznam volaných cest a metod.

**P3 — jen čísla `TEST - …`.**
- Zakázka se zpracuje jen tehdy, když její číslo **a čísla všech jejích variant** (funkce aplikace
  `variantaCislo`, čísla v zámcích `zamek.cislo`, číslo PROJ v `projHlavicka.cislo`) začínají `TEST - ` (přesný
  tvar ověř na exportu a zapiš do návodu; mezery normalizuj stejně jako server u jména souboru).
- Najde-li se v exportu jediná zakázka, která pravidlo nesplňuje, nástroj **nezapíše nic** a vypíše je (soubor
  je jiný, než má být — nejspíš celá záloha; viz P6 o záloze).
- Jméno souboru zakázky počítá server; nástroj ho z exportu neposílá jako cestu.

**P4 — nic se nepřepíše.**
- Výchozí běh je **náhled**; zapisuje jen `--zapsat` po potvrzení napsáním slova (např. `OBNOVIT`) s vypsaným
  počtem zakázek a adresou webu.
- Před zápisem rejstřík (`GET /api/zakazky`): zakázka, která na serveru už je (stejné číslo / jméno souboru), se
  **přeskočí**.
- Server kolizi hlídá jen tehdy, když klient pošle `ocekavaneRazitko` jako **řetězec** (viz
  `netlify/functions/zakazky.mjs`: `if (stara && typeof t.ocekavaneRazitko === 'string' && t.prepsat !== true)`).
  Bez pole by server existující zakázku tiše přepsal. Nástroj proto posílá vždy `ocekavaneRazitko: ''` a **nikdy**
  `prepsat: true`. Odpověď 409 = přeskočeno (závod s jiným uživatelem), ne chyba běhu.
- Zakázky po jedné, s krátkou pauzou; strop těla 4 MB kontroluj předem a větší zakázku přeskoč s hláškou.

**P5 — data se nemění, zámky zůstávají.**
- Zakázka se posílá tak, jak je v exportu: žádný přepočet, žádná migrace na straně nástroje, žádné odebírání
  zámků, razítek, příloh. Co upraví server (autor, razítka úpravy, ověření zámku), je jeho věc.
- **Riziko k ověření hned na začátku:** běžné uložení bere nově příchozí zámek jako neověřený a kontroluje
  variantu jako nezamčenou (`netlify/lib/zakazka_kontrola.mjs`, B59/B61; jen režim obnovy bere zámek jako
  doklad). Zamčená TEST zakázka ze starší verze tak může projít s varováním („sporné“ ověření zámku), nebo ji
  server odmítne (profil mimo katalog, zámek bez dokumentu, stará podoba dat). Nástroj takovou zakázku
  **neupravuje**, jen ji vypíše s důvodem serveru. Na místním serveru ověř, co se stane se zamčenou variantou
  (odeslaná nabídka, tisk SoD, prodaná varianta) a s víc šachtami, a výsledek popiš v předávce. Cizího autora smí
  u nové zakázky ponechat jen administrátor — ověř, že se autor z exportu zachová.
- **K40b (#580)** přidává razítko přijetí zámku a dolní mez data prodeje. Až bude K40b v integraci, pusť testy
  nástroje i nad sloučeným stromem (dočasný worktree, `git merge --no-commit origin/claude/k40b`) a napiš, jestli
  server prodané TEST zakázky se starším datem prodeje přijme.
- Po zápisu každou zakázku přečti zpět a porovnej: číslo, počet a čísla variant, přítomnost a klíčová pole zámků
  (`cislo`, `typ`, `kdy`), kanonický otisk dat variant. Rozdíl = řádek ve zprávě „založeno s rozdílem: …“.

**P6 — soubor exportu.**
- Vstup `--export <soubor>`: JSON pole zakázek nebo `{ zakazky: […] }` (dodá testovací sezení z kopie z 2. 11.).
- Druhý vstup `--zaloha <otisk.json | otisk.json.gz>`: otisk databáze (kopie na Disku ve složce
  „_Zaloha Netlify DB“, viz `podklady/POSTUP_OBNOVY_ZALOHY.md` a `netlify/lib/zalohovani.mjs`). Z otisku se
  vyberou **jen** zakázky s číslem `TEST - …`; účty, ceník, nastavení a ostatní zakázky se nečtou dál než pro
  výběr a nikam se neposílají. (U `--zaloha` pravidlo „jediná cizí zakázka = nic“ z P3 neplatí — platí filtr.)
- Soubor se nikdy nekopíruje do repa. Přidej do `.gitignore` vzor pro pracovní název (např. `test_sada_*.json*`)
  a do návodu větu, že soubor patří mimo složku repa.
- Výpisy nástroje neobsahují ceny, e-maily zákazníků ani jména — jen číslo zakázky, počty variant, stav.

**P7 — běh bez překvapení.**
- Neznámý přepínač, chybějící soubor, prázdný výběr = kód 2 a nápověda. Kód 0 jen když vše, co se mělo založit,
  je založeno a ověřeno; jinak 1 a souhrn (založeno / přeskočeno – už existuje / odmítnuto serverem / s rozdílem).
- Přerušení (Ctrl+C) uprostřed: co je založeno, zůstává; druhé spuštění je bezpečné (existující přeskočí).
- Nástroj nevyžaduje sestavení (`build.py`) ani Playwright; Node 20+, bez závislostí mimo repo.

## 3. Stavba

- Rozhodování v čistých funkcích bez sítě (např. `nastroje/test_sada_jadro.mjs`: povolení cíle, výběr a kontrola
  zakázek, plán kroků, porovnání po zápisu) a tenký obal `nastroje/test_sada_obnov.mjs` (klávesnice, `fetch`).
  `fetch` se do jádra předává — testy běží proti **skutečným serverovým funkcím nad paměťovým úložištěm** (vzor
  `overit_obnova_zakazky.mjs`, `netlify/test_obnova.mjs`, `netlify/pomoc_test_admin.mjs` z K40a až bude sloučen).

## 4. Testy (každý s pojistkou: doloz v commitu, že bez příslušné kontroly selže)

`netlify/test_c5_test_sada.mjs` (+ případně `src/test_c5_test_sada_jadro.js`), syntetické zakázky vyrobené v testu
(žádný skutečný export):

1. cíl: testengscalc a místní adresy projdou; engscalc, `x--engscalc.netlify.app`, schaftscalc, cizí host,
   `http://` mimo místní, adresa s `@`, s cestou, velká písmena, tečka na konci hostu → odmítnuto **před**
   dotazem na heslo (test hlídá, že se `prihlaseni` nezavolalo),
2. `/api/zdravi` vrací `ostre` nebo nic → konec bez přihlášení; přesměrování → konec,
3. role jiná než Administrátor → konec bez zápisu,
4. export s jednou ne-TEST zakázkou → nula zápisů; varianta s ne-TEST číslem → nula zápisů; `--zaloha` vybere jen TEST,
5. náhled nic nezapisuje; `--zapsat` bez potvrzení nic nezapisuje,
6. existující zakázka se nepřepíše (obsah na serveru před = po), ani když se rejstřík mezi čtením a zápisem
   změní (409),
7. zamčená varianta: zámek po zápisu na serveru je (nebo je zakázka vypsaná jako odmítnutá — podle zjištění P5),
   data variant beze změny; víc šachet (`ock.dalsi`) projde se zapnutou funkcí,
8. seznam volaných cest a metod = povolený seznam z P2; žádné `DELETE`,
9. výpis neobsahuje heslo, cookie ani ceny.

Sady přidej do `spust_testy.sh` a do `SADY` serverových mutací. Mutace „[C5]“ v `netlify/mutace.mjs` (nebo
`mutace_jadro.mjs`, podle toho, kde jádro nástroje leží): vypnutí každé z kontrol P1–P4 musí některý test chytit.
`node netlify/mutace.mjs --kontrola`, `node mutace_jadro.mjs --kontrola`. Celé mutace pouští koordinace.
Na konci `bash nastroje/testovaci_kolo.sh --bez-mutaci` — počty do předávky.

## 5. Návod pro J. V. — `podklady/NAVOD_TEST_SADA_OBNOVA.md`

Krok za krokem, bez předpokladu znalosti kódu:

1. Co je potřeba: počítač s Node 20+, klon repa na commitu, který určí koordinace (po sloučení dávky), účet
   administrátora na **testengscalc**.
2. **Odkud vzít export** — dvě cesty, napiš obě:
   - soubor od testovacího sezení (kopie TEST zakázek z 2. 11.; sezení ho J. V. pošle jako soubor ke stažení —
     ne přes repo, ne e-mailem zákazníkům),
   - nebo kopie zálohy testovací databáze z Disku, složka „_Zaloha Netlify DB“, poslední otisk **před 2. 11.**
     (retence drží první otisk měsíce a nedělní — 1. 11. 2026 je obojí; přesné jméno souboru podle #552 doplň
     z `src/nazvy_souboru.js`). Stáhnout do složky mimo repo.
3. Náhled: přesný příkaz, ukázka výstupu a jak ho číst.
4. Zápis: příkaz s `--zapsat`, potvrzení, co znamenají stavy.
5. Kontrola v aplikaci (rejstřík s filtrem TEST) a co dělat se zakázkami, které server odmítl.
6. Jak to vrátit: hromadné mazání v aplikaci (jen administrátor) s filtrem na TEST — nástroj sám nemaže.
7. Co nástroj nikdy neudělá (ostrý web, přepis, mazání) a co hlásit koordinaci.

## 6. Dokumentace a předávka

`BEZPECNOST_MEZE.md` (B215–B216), `CHANGELOG.md`, `roadmapa/roadmap.json` #585 (`python3 roadmapa/roadmapa.py
--kontrola`), `verze.txt` (číslo potvrdí koordinace), `README_ZDROJAKY.md` (řádek o nástroji), `PREDAVKA.md`
nahoře (tabulka, zjištění k zámkům z P5, co čeká na J. V.). Průběžně commit + push, na konci `get_session` →
`context_usage`. `nastroje/kontrola_udaju.py` musí projít (smyšlené kontakty v testech zapiš do
`nastroje/povolene_kontakty.txt` s důvodem).

## 7. Závěrečná zpráva koordinaci (send_message)

SHA, počty testů a mutací, výsledek ověření zámků (P5), odchylky, otázky pro J. V.:

1. Zamčené TEST zakázky, které běžné uložení odmítne (pokud takové budou): nechat neobnovené a vypsat
   (doporučení), nebo pro ně připravit obnovu přes otisk v aplikaci (Obnovit ze zálohy)?
2. Zdroj exportu: soubor od testovacího sezení (doporučení — obsahuje jen TEST zakázky), nebo otisk z Disku?

## 8. Kolize

Nové soubory; společné jen `netlify/mutace.mjs` / `mutace_jadro.mjs` (K40a, K40b, K40c, C2+C3), `spust_testy.sh`,
`BEZPECNOST_MEZE.md` (K40a–c zapisují B203–B209), `.gitignore`, `README_ZDROJAKY.md` a vždy `CHANGELOG.md`,
`PREDAVKA.md`, `roadmapa/roadmap.json`, `verze.txt`. Pořadí sloučení libovolné; kvůli razítku přijetí zámku
(P5) doporučeno **po K40b**.
