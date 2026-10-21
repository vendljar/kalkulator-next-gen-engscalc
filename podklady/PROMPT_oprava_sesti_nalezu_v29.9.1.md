Oprava šesti nálezů komplexního testu 29. 9. 2026 (21. kolo, v29.9.1) v JEDNOM
sezení a JEDNÉ větvi — B111, B96, B112 (vysoké, třída „koncová cena bez
schválení") a B97, B98, B99 (střední). Kalkulator Next Gen.

KDO, KDE, JAK
- Komunikace česky, nikdy AskUserQuestion — ptej se prózou s navrženými
  výchozími odpověďmi. Dodrž skill kalkulator-next-gen (podklady z Disku podle
  skillu testovaci-procedura-kng).
- Repozitář vendljar/kalkulator-next-gen-engscalc. Vyjdi z commitu
  9a48ee86f66f83e7c71b1f6c94189f6f2663634d (tag v29.9.1 = hlava větve
  claude/pensive-curie-s6yzs3; kód = v26.9.1; verze.txt 29.9.1).
- Jediná větev tohoto sezení: claude/oprava-sesti-nalezu-v29.9.1. Když
  neexistuje, založ ji z 9a48ee8; když existuje, pokračuj na ní (viz
  POKRAČOVÁNÍ). Pushuješ jen do ní. Do test-draft, test ani main nic;
  o sloučení rozhoduje J. V. CLAUDE.md ještě jmenuje test-draft — tohle
  zadání má přednost.
- Podrobnosti nálezů: PREDAVKA.md 21. kola, pevně commit 4505aa4 na větvi
  claude/komplexni-test-v29.9.1 (git fetch origin
  claude/komplexni-test-v29.9.1 && git show 4505aa4:PREDAVKA.md).

PROČ JEDNO SEZENÍ (J. V. 29. 9. 2026)
Místo šesti paralelních větví jedna větev a nálezy postupně. Odpadá slučování
tří serverových kontrol na totéž místo (netlify/lib/zakazka_kontrola.mjs:88–90,
src/uloziste.js, netlify/test_prava.mjs, netlify/mutace.mjs) a souběžné
změny CHANGELOG.md, PREDAVKA.md a verze.txt. Šest zadání v PŘÍLOHÁCH A–F jsou
původní samostatné prompty beze změny: platí celá (Pravidlo 0, nález,
požadované chování, testy, konvence, dokumentace), jen s výjimkami níž.

CO Z PŘÍLOH PLATÍ JINAK
1. „REPOZITÁŘ A VĚTEV": „paralelní větev, kterou ti přidělí sezení" =
   claude/oprava-sesti-nalezu-v29.9.1.
2. „SOUBĚŽNÉ OPRAVY": žádné paralelní větve neběží, všech šest děláš ty
   v pořadí níž. Dál platí: odložené nálezy (zbytek B77, B100–B110, zbytek
   B32, B4 souběh, B6, N59–N61) neopravuj, jen je zapiš do PREDAVKA.md.
3. Serverové kontroly B111, B96 a B112 přesto piš jako tři samostatné funkce
   v src/uloziste.js, každou s jedním řádkem volání vedle uloTypyProblemy
   v zakazkaServerKontrola, hlášky ve tvaru #340 („varianta X: <cesta>: …"),
   každá s vlastní mutací. Pořadí volání: uloTypyProblemy → B111 (záporné
   částky) → B96 (zaokrouhlení) → B112 (ceník a přepisy proti uložené verzi).
   Opakující se kousky (přeskočení varianty zamčené už v uložené verzi,
   čtení výčtů přes globalThis) vytáhni do jedné pomocné funkce — nekopíruj
   je třikrát. Každá kontrola musí pokrýt uložení i obnovu (B72/P4).
4. „Na konci celé kolo" z každé přílohy nahrazují DVĚ celá kola (viz TESTY).

POŘADÍ (jeden nález = jeden ucelený krok, vysoké napřed)
  1. B111 — příloha A (vysoká, jde v běžném UI)
  2. B96  — příloha B (vysoká)
  3. B112 — příloha C (vysoká, ruční požadavek)
     → CELÉ KOLO č. 1 (tři kontroly na jednom místě se musí snést)
  4. B97  — příloha D (střední, přihlášení)
  5. B98  — příloha E (střední, obnova ze souboru)
  6. B99  — příloha F (střední, šablony Wordu; potřebuje podklady z Disku)
     → CELÉ KOLO č. 2

U KAŽDÉHO NÁLEZU
a) Pravidlo 0 pokusem. Když už vada neplatí, nic neměň, zapiš čím je
   opravená a jdi na další.
b) Nejdřív test (pojistka proti prázdnému testu): spusť ho proti kódu PŘED
   opravou a zapiš, kolik kontrol selže.
c) Oprava. Pak rychlé kontroly: dotčené sady, bash nastroje/pred_pushem.sh
   (= kolo bez mutací; spouštět PO commitu, kontrola verze měří den
   posledního commitu) a node netlify/mutace.mjs --kontrola (kotvy mutací).
   Novou mutaci ověř cíleně, že ji nový test chytí.
d) python3 build.py (zvedne pořadí verze — každý nález má vlastní verzi
   a vlastní oddíl v CHANGELOG.md), dokumentace podle přílohy (CHANGELOG,
   BEZPECNOST_MEZE.md, příručka manual/obsah.json, roadmapa roadmap.json →
   python3 roadmapa/roadmapa.py). Commit: co, proč, počty testů před/po
   opravě. Push do claude/oprava-sesti-nalezu-v29.9.1.
e) Přepiš PREDAVKA.md: tabulka šesti nálezů (stav, commit, verze, testy
   před/po, poznámka), rozhodnutí podle výchozího návrhu, co čeká na J. V.,
   další krok. Commit a push (může být v témže commitu jako d).
f) get_session (bez session_id) → context_usage. Nad 60 % upozorni J. V.
   Nad 75 % dokonči rozdělaný nález (nebo commitni „WIP B…" a napiš do
   PREDAVKA.md, kde přesně stojíš), přepiš PREDAVKA.md a doporuč nové
   sezení (viz POKRAČOVÁNÍ).

ROZHODNUTÍ — NEČEKEJ, POUŽIJ VÝCHOZÍ NÁVRH
Kde příloha říká „K rozhodnutí J. V.", proveď výchozí návrh, zapiš ho do
PREDAVKA.md jako „provedeno podle výchozího návrhu — čeká na potvrzení J. V."
a pokračuj:
- B111: zápornou položku, množství ani hodiny nesmí nikdo, ani
  administrátor (dobropis ne; jako N56).
- B96 bod 4 (serverová kontrola marže z koncové ceny i bez slevy): jen
  návrh do PREDAVKA.md a BEZPECNOST_MEZE.md, nerealizovat. Po B112 posuď,
  zda B111 + B96 + B112 dohromady zavírají třídu „koncová cena bez
  schválení", nebo co zůstává otevřené — závěr do PREDAVKA.md.
- B112: vedeno jako nový nález B112; B88 dál jen čtecí strana.
- B97: vážnost střední.
- B98: odemčení ze souboru, které v databázi není → zakázku přeskočit
  s důvodem v náhledu obnovy.
Zastav se a zeptej J. V. jen tehdy, když by oprava změnila cenu už odeslané
nabídky (princip dokladu), zablokovala běžnou práci (legitimní přepisy
obchodníka N50/N51, dnešní firemní šablony) nebo vyžadovala sáhnout na
odložený nález.

TESTY A PODKLADY
- Celé kolo: KNG_PODKLADY=<složka> bash nastroje/testovaci_kolo.sh na
  pozadí (~45 min). Mutační běh NIKDY nepřerušovat; mutace přepisují pracovní
  strom — během nich necommitovat a nic neupravovat, po doběhnutí ověřit
  git status. Výsledky s počty (sady prošlo/selhalo/přeskočeno, mutace jádra,
  mutace serveru, statické kontroly, doba) do PREDAVKA.md.
- Podklady (šablony CN v13 + EN/DE/FR, CN v11, PROJ, SoD realizace
  a projekce, plná moc, příručka) stáhni z Google Disku podle skillu
  testovaci-procedura-kng a oddílu „Poznámky pro další sezení"
  v PREDAVKA.md 4505aa4 (hledat podle názvu, ne podle složky; ukládat MIMO
  repozitář; nic z nich necommitovat). Zjisti to hned na začátku: když Disk
  není dostupný, řekni to J. V. jednou větou — B111 až B98 mohou běžet bez
  podkladů (kolo č. 1 pak jen s přeskočenými harnessy, zapsat), B99 bez nich
  uzavřít nejde (firemní šablony musí projít).
- Nový smyšlený kontakt v testu → nastroje/povolene_kontakty.txt s důvodem;
  nastroje/kontrola_udaju.py musí zůstat čistá.
- N46 neopravovat (fuzz jen INFO). netlify/test_mutace.mjs nepouštět
  souběžně s mutačním během. overit_verzi.mjs nechá v dist/ soubor
  kalkulacka_v<verze+1>.html (N61) — po kole smazat, dist/ se necommituje.
- Šetři kontext: průzkum kódu a pokusy Pravidla 0 smíš dát podřízenému
  agentovi (výsledek do souboru ve scratchpadu, ne do chatu); kód měníš
  sám a ne souběžně s během testů.

POKRAČOVÁNÍ (když sezení spadne nebo dojde kontext)
Nové sezení dostane tento prompt beze změny. Postup: git fetch origin
claude/oprava-sesti-nalezu-v29.9.1 → checkout → přečíst PREDAVKA.md (tabulka
stavu) → pokračovat prvním nehotovým nálezem; hotové nálezy znovu nedělat.
Proto se PREDAVKA.md přepisuje po každém nálezu.

PRAVIDLA
Úpravy kódu jen v src/, netlify/, nastroje/; dokumentace v CHANGELOG.md,
PREDAVKA.md, BEZPECNOST_MEZE.md, manual/obsah.json, roadmapa/. Nikdy dist/*.
Žádné ceny, firemní ani osobní údaje (jen zkušební ceník, smyšlená jména),
nic z _soukrome/. Konce řádků LF. Komentáře česky s datem a číslem nálezu.
Server a prohlížeč ve shodě (moduly v netlify/lib/jadro_moduly.cjs ve
stejném pořadí jako CORE v build.py — poučení N43). Commit v jiný den než
předchozí: python3 build.py dá vDEN.MĚSÍC.1 — v pořádku.

ZÁVĚR PRO J. V.
Krátce: tabulka šesti nálezů (ID · stav · commit · verze · testy před/po),
výsledek obou celých kol s počty, rozhodnutí provedená podle výchozího
návrhu (čekají na potvrzení), co z třídy „koncová cena bez schválení"
zůstává otevřené, a hlava větve claude/oprava-sesti-nalezu-v29.9.1.
Připomeň, že testování pokračuje v sezení „Testování po opravách v29.9.1
(22. kolo)": https://claude.ai/code/session_011bKm7zw36TH8By3Ef7rF1i —
J. V. mu řekne větev claude/oprava-sesti-nalezu-v29.9.1 a commit k testování.

PŘÍLOHY A–F — PŮVODNÍ ZADÁNÍ BEZE ZMĚNY (platí s výjimkami výše)

=== PŘÍLOHA A — B111 ===
Oprava VYSOKÉHO nálezu B111 — obchodník v běžném UI zadá vlastní položku se
zápornou cenou (nebo množstvím) a sníží cenu nabídky bez schválení, bez
varování marže a beze stopy v dokumentu. Kalkulator Next Gen.

REPOZITÁŘ A VĚTEV
Repozitář vendljar/kalkulator-next-gen-engscalc. Vyjdi z commitu
9a48ee86f66f83e7c71b1f6c94189f6f2663634d (tag v29.9.1 = hlava větve
claude/pensive-curie-s6yzs3; kód = v26.9.1). Pracuj jen ve své paralelní větvi,
kterou ti přidělí sezení. Do test-draft, test ani main nic (pravidlo J. V.
29. 9. 2026). CLAUDE.md ještě jmenuje test-draft — tohle zadání má přednost.
Komunikace česky, nikdy AskUserQuestion — ptej se prózou s navrženými
výchozími odpověďmi. Dodrž skill kalkulator-next-gen.
Podrobnosti nálezu: PREDAVKA.md na větvi claude/komplexni-test-v29.9.1
(git fetch origin claude/komplexni-test-v29.9.1 && git show
FETCH_HEAD:PREDAVKA.md).

PRAVIDLO 0
Nejdřív ověř, že vada trvá (zkušební ceník, stropy Obchodník 5 %, Vedoucí 15 %,
minMarze 10 % jako v overit_schvalovani.mjs):
- server (vzor netlify/test_obchodnik.mjs / test_prava.mjs): obchodník uloží
  vlastniPolozky.hrubaOck = [{ nazev:'Obchodní úprava', mnozstvi:1,
  cena:-302167 }] → dnes 200, cena OCK 980 000 → 617 000 Kč (−37 %), marže
  podle aplikace 16,7 %, kontroly prázdné, /api/schvalovani nic;
- prohlížeč (vzor overit_role_nahled.mjs): obchodník klikne „+ přidat
  položku", do ceny napíše −302167 → cena v hlavičce 617 000 Kč, žádná lišta,
  uložení 200. PROJ: „+ přidat fixní položku" −90 400 → PROJ 271 200 →
  162 720 Kč (−40 %).

NÁLEZ (vysoká — obchodník obejde schvalování slev v běžném UI)
- Právo kalk.pridatPolozku je ve výchozí matici Obchodník i Vedoucí true
  (src/zobrazeni.js:203–212). Pole ceny vlastní položky <input type=number>
  bez min (src/ui/kalk_ock.js:1366–1375, 1497–1508; množství 1195–1196),
  vlastniSet zapíše +v bez kontroly znaménka (:1126–1134). PROJ: vlastní fix
  bez min (src/ui/kalk_proj.js:290, 356); ochrana N56 (HODINY_BEZ_ZAPORU,
  src/ui/common.js:590–595) kryje jen hodiny a rezervu.
- Server: uloTypyProblemy u vlastniPolozky kontroluje jen, že jde o pole
  (src/uloziste.js:767–768), u PROJ připouští mínus (ULO_CISLO_TEXT :735, 803,
  820). B71 (schvalovaniServerMarze, src/schvalovani.js:488–510) bez platné
  slevy marži nepočítá — a i se slevou vyjde marže stejně, protože záporná
  položka sníží vykázaný náklad i cenu stejným poměrem (src/engine.js:1219,
  1238, 1242–1249; src/marze.js:49–52). Skutečná marže je pak asi −32 %,
  aplikace ukazuje +16,7 %.
- Dokument: položka se v nabídce OCK neobjeví, SLEVA_* prázdné
  (src/nabidka.js:237–252, 497–501); v PROJ se schová v ceně sekce.
  Rejstřík schvalování bere jen slevu > 0 (netlify/functions/schvalovani.mjs:
  44–50). Protokol změn zapíše jen „počet položek 0 → 1" bez částky
  (src/protokol.js:254–258).
- Související: N56 drží jen v UI — záporné hodiny PROJ poslané ručním
  požadavkem server přijme (cena PROJ −99 %).
- Záměr to není: #33 plánoval tvrdý zákaz záporného množství či ceny, N56
  (J. V. 24. 9.) zakázal záporné hodiny, záporná sleva je chyba
  (src/kontroly.js:283–290); BEZPECNOST_MEZE.md nic takového neuvádí.

POŽADOVANÉ CHOVÁNÍ
1) Server (hranice): nová funkce v src/uloziste.js (např.
   uloZaporneProblemy(zak, stara)), volaná v zakazkaServerKontrola hned za
   uloTypyProblemy (netlify/lib/zakazka_kontrola.mjs:88–90 — pokryje uložení
   i obnovu). Odmítne 400 s hláškou „záporná částka nebo množství (<kde>)":
   cena < 0 nebo mnozstvi < 0 v ock.zadani.vlastniPolozky.<sekce>[],
   volitelneVlastni[], priplatkyVlastni[]; cena, hodiny, rezerva, cenaPrepis,
   sazbaPrepis < 0 v proj.zadani.sekce[].polozky[]; ock.zadani.mnozstviPrepis,
   cenyPrepis a hodiny N56 (montazZakladHod …) < 0. Hlídej i typ polí
   vlastní položky. Varianty zamčené už v uložené verzi přeskočit (doklad).
   K rozhodnutí J. V.: smí administrátor výjimku (dobropis)? Výchozí návrh:
   zakázat všem, jako u N56.
2) UI: min="0" do polí kalk_ock.js:1196, 1203, 1371, 1505, 1508 a
   kalk_proj.js:356; HODINY_BEZ_ZAPORU (common.js:595) rozšířit o
   polozky\.\d+\.cena; vlastniSet odmítne zápornou cenu a množství s hláškou
   jako hodinyZaporneOdmitni.
3) Kontroly: nové pravidlo zapornaPolozka jako zábrana
   (KONTROLY_UROVEN_ZABRANA, src/kontroly.js) pro už uložené zakázky —
   dokument nevznikne, dokud se to neopraví.
4) Jednorázový skript do nastroje/ (jen čte), který v exportu/záloze databáze
   najde varianty se zápornou vlastní položkou, množstvím nebo hodinami —
   detekce dřívějšího zneužití; spustí ho J. V.

TESTY (pojistka proti prázdnému testu — dnes útok vrací 200)
- Server (netlify/test_obchodnik.mjs nebo nový netlify/test_zaporne.mjs,
  zařadit do nastroje/testovaci_kolo.sh přes glob sad): cena −302167 → 400
  s „záporn" v hlášce a úložiště beze změny; POZITIVNÍ kontrola +302167 →
  200 (pravidlo neodmítá všechno); mnozstvi −1, vlastní fix PROJ < 0,
  hodiny −200, role Vedoucí → 400; odeslaná varianta, která zápornou položku
  už nese, se beze změny uloží 200.
- Prohlížeč (oddíl v overit_role_nahled.mjs nebo nový harness): obchodník
  vyplní −302167 → hláška, cena položky 0, cena nabídky 980 000 Kč, pole
  min="0"; totéž PROJ.
- src/test_kontroly.js: záporná položka → kód zapornaPolozka, brani true;
  kladná položka pravidlo nespustí.
- netlify/mutace.mjs: mutace „záporná položka projde" (vypnutí nové
  kontroly) — test ji musí chytit; `node netlify/mutace.mjs --kontrola`.
- Do zprávy commitu: kolik testů selže proti kódu PŘED opravou a že po ní
  projdou. Na konci celé kolo: KNG_PODKLADY=<složka> bash
  nastroje/testovaci_kolo.sh (mutace nikdy nepřerušovat), výsledky do
  PREDAVKA.md.

SOUBĚŽNÉ OPRAVY (29. 9. 2026)
Ve stejnou dobu běží v jiných větvích nad týmž commitem opravy B96, B112, B97, B98, B99
(každá svým promptem). Drž se jen B111. Odložené nálezy (zbytek B77,
B100–B110, zbytek B32, B4 souběh, B6, N59–N61) neopravuj, i kdybys na ně
narazil — jen je zapiš do PREDAVKA.md. J. V. bude větve slučovat: změny drž
malé a soustředěné, v CHANGELOG.md piš jen svůj oddíl, nové testy a mutace
přidávej jako samostatné bloky (ne přepisem cizích).
Pozor: B96 a B112 přidávají serverovou kontrolu na TOTÉŽ místo
(netlify/lib/zakazka_kontrola.mjs:88–90, vedle uloTypyProblemy; src/uloziste.js;
netlify/test_prava.mjs; netlify/mutace.mjs). Svou kontrolu napiš jako
samostatnou funkci s jedním řádkem volání vedle uloTypyProblemy a hlášky
ve stejném tvaru jako #340 („varianta X: <cesta>: …"), ať jde větve sloučit
bez přepisování.

KONVENCE
Úpravy jen v src/, netlify/, nastroje/ — nikdy dist/*; pak python3 build.py
(verze = den commitu). Server a prohlížeč ve shodě (moduly v jadro_moduly.cjs
ve stejném pořadí jako CORE v build.py — poučení N43). Konce řádků LF. Žádné
ceny, firemní ani osobní údaje (jen zkušební ceník). Komentáře česky s datem
a číslem nálezu.

DOKUMENTACE
CHANGELOG.md (vysoký nález nahoře), PREDAVKA.md (co čeká na J. V.: výjimka
pro administrátora, detekční skript), příručka (manual/obsah.json — věta
u „+ přidat položku", že částka nesmí být záporná a sleva jde přes
schvalování), roadmapa (roadmap.json → python3 roadmapa/roadmapa.py; #33).

=== PŘÍLOHA B — B96 ===
Oprava VYSOKÉHO nálezu B96 — server nekontroluje krok obchodního zaokrouhlení,
obchodník jím sníží cenu nabídky skoro o polovinu bez schválení. Kalkulator Next Gen.

REPOZITÁŘ A VĚTEV
Repozitář vendljar/kalkulator-next-gen-engscalc. Vyjdi z commitu
9a48ee86f66f83e7c71b1f6c94189f6f2663634d (tag v29.9.1 = hlava větve
claude/pensive-curie-s6yzs3; kód = v26.9.1). Pracuj jen ve své paralelní větvi,
kterou ti přidělí sezení. Do test-draft, test ani main nic (pravidlo J. V.
29. 9. 2026). CLAUDE.md ještě jmenuje test-draft — tohle zadání má přednost.
Komunikace česky, nikdy AskUserQuestion — ptej se prózou s navrženými
výchozími odpověďmi. Dodrž skill kalkulator-next-gen.
Podrobnosti nálezu: PREDAVKA.md na větvi claude/komplexni-test-v29.9.1
(git fetch origin claude/komplexni-test-v29.9.1 && git show
FETCH_HEAD:PREDAVKA.md).

PRAVIDLO 0
Nejdřív pokusem ověř, že vada trvá (vzor netlify/test_prava.mjs, zakázka
zakazkaSCeny, zkušební ceník; stropy Obchodník 3 %, Vedoucí 10 %,
minMarze 10 % přes POST /api/program): obchodník uloží variantu se slevou 0 %
a data.zaokr = { krok: ⌊z/2⌋+1, smer: 'dolu' } (z = základ OCK) → dnes 200
a cena nabídky OCK klesne z 980 000 na 490 001 Kč (marže −66,6 %, pod
náklad). Táž sleva zadaná procentem dostane 403 i u administrátora (B71).

NÁLEZ (vysoká — obchodník obejde schvalování)
- src/zaokrouhleni.js:108–111 zaokrKrok bere jakékoli kladné číslo;
  výčet ZAOKR_KROKY (:44–54, 0–10 000 Kč) a ZAOKR_SMERY platí jen pro
  <select> v src/ui/zaokrouhleni_ui.js:46–47; nastavovač zaokrSetKrok
  (:24–27) výčet nevynucuje — stačí zaokrSetKrok(490001) z konzole.
  Pojistka „nikdy nula" (:130) omezí pokles těsně pod 50 % (OCK); u PROJ
  (zaokrProj, po činnostech :225–227) pokus dal −28 %.
- Server: uloTypyProblemy (src/uloziste.js:828–858, voláno
  netlify/lib/zakazka_kontrola.mjs:88–90) kontroluje ock.zadani, oplasteni,
  profily, cenik, proj.zadani, proj.cenik — ne data.zaokr ani data.zaokrProj.
  schvalovaniServerMarze (src/schvalovani.js:488–510) běží jen u platné slevy
  a počítá z ceny PŘED zaokrouhlením. Ověření nového zámku (B59,
  src/zamek.js:322, 362–375) porovnává jen výsledek jádra, do kterého
  zaokrouhlení nevstupuje → nový zámek dostane „shoda". Rejstřík
  schvalování (netlify/functions/schvalovani.mjs:49) variantu bez slevy
  vedoucímu neukáže. Nabídka (src/nabidka.js:137–144, 237, 246–256) tiskne už
  zaokrouhlený základ (zaokrouhleni.js:187) → řádek slevy ani zaokrouhlení
  v dokumentu není.

POŽADOVANÉ CHOVÁNÍ
1) Server (hlavní oprava, ve stylu #340): v uloTypyProblemy nebo nové
   uloZaokrProblemy volané na stejném místě (zakazka_kontrola.mjs:88 —
   pokryje uložení i obnovu) odmítnout 400 s cestou „varianta X: zaokr.krok"
   každé data.zaokr / data.zaokrProj, které není objekt s krokem z
   ZAOKR_KROKY a směrem ze ZAOKR_SMERY (číslo jako text tolerovat, nic
   nepřevádět). Varianty zamčené už v uložené verzi přeskočit (doklad, vzor
   uloziste.js:839). ZAOKR_KROKY/ZAOKR_SMERY číst přes globalThis
   (jadro_moduly.cjs je načítá).
2) UI (hygiena): zaokrSetKrok, zaokrProjSetKrok, zaokrSetSmer,
   zaokrProjSetSmer přijmou jen hodnoty z výčtu; <select> ukáže uloženou
   hodnotu (dnes nemá „selected", takže u neznámé hodnoty ukáže „bez
   zaokrouhlení" — zavádějící).
3) NEMĚNIT sémantiku zaokrKrok v jádře — změnila by cenu už odeslaných
   nabídek (princip dokladu). Místo toho připrav jednorázový skript do
   nastroje/ (jen čte, nic nepřepisuje), který v exportu/záloze databáze
   najde varianty (i zamčené) s krokem nebo směrem mimo výčet — detekce
   případného dřívějšího zneužití; spustí ho J. V.
4) K rozhodnutí J. V. (třída problému — navrhni, nerealizuj bez souhlasu):
   serverová kontrola marže z KONCOVÉ ceny (cenaNabidkyOck/Proj), kdykoli je
   nižší než základ, i bez platné slevy. Roadmapa #38 („nic se neblokuje")
   to u povolených kroků vědomě dovoluje, proto rozhodnutí produktu.
   Tatáž třída má dva další VYSOKÉ nálezy, potvrzené dvěma čteními, každý
   s vlastním promptem: B111 (záporná vlastní položka — obchodník ji zadá
   v běžném UI, cena −37 %) a B112 (ceník varianty a skryté přepisy hlídá jen
   UI — zápisová strana B88). Oprava B96 sama riziko obejití schvalování
   nezavře. Drž se svého rozsahu (zaokrouhlení), ale navrhni, zda serverová
   kontrola marže z koncové ceny (bod 4) pokryje všechny tři, a sladěj
   hlášky a místo volání s větvemi B111/B112 (běží paralelně — neřeš jejich
   rozsah).

TESTY (pojistka proti prázdnému testu — dnes útok vrací 200)
Do netlify/test_prava.mjs oddíl „B96: krok obchodního zaokrouhlení hlídá
server" vedle #340 a #341:
1. obchodník, zaokr {krok ⌊z/2⌋+1, smer 'dolu'} → 400 a GET → 404;
2. totéž zaokrProj → 400;
3. směr mimo výčet ('x', 'dolů') → 400;
4. všechny kombinace ZAOKR_KROKY × ZAOKR_SMERY → 200 (oprava nesmí
   zablokovat běžnou práci);
5. nový zámek s krokem mimo výčet → 400 (zámek nevznikne, žádné „shoda");
6. varianta zamčená už v uložené verzi s krokem mimo výčet (vložená přímo do
   úložiště): uložení beze změny → 200, změna → 409;
7. obnova ze zálohy s takovou nezamčenou variantou → přeskočena s důvodem.
Jednotkový test nové funkce v src/ (cesta v hlášce, zamčená se přeskočí).
Mutace v netlify/mutace.mjs: „kontrola zaokrouhlení se nevolá" a „výčet
kroků se nekontroluje" — obě musí shodit test 1. Do zprávy commitu: kolik
testů selže proti kódu PŘED opravou a že po ní projdou.
Na konci celé kolo: KNG_PODKLADY=<složka> bash nastroje/testovaci_kolo.sh
(mutace nikdy nepřerušovat), výsledky s počty do PREDAVKA.md.

SOUBĚŽNÉ OPRAVY (29. 9. 2026)
Ve stejnou dobu běží v jiných větvích nad týmž commitem opravy B111, B112, B97, B98, B99
(každá svým promptem). Drž se jen B96. Odložené nálezy (zbytek B77,
B100–B110, zbytek B32, B4 souběh, B6, N59–N61) neopravuj, i kdybys na ně
narazil — jen je zapiš do PREDAVKA.md. J. V. bude větve slučovat: změny drž
malé a soustředěné, v CHANGELOG.md piš jen svůj oddíl, nové testy a mutace
přidávej jako samostatné bloky (ne přepisem cizích).
Pozor: B111 a B112 přidávají serverovou kontrolu na TOTÉŽ místo
(netlify/lib/zakazka_kontrola.mjs:88–90, vedle uloTypyProblemy; src/uloziste.js;
netlify/test_prava.mjs; netlify/mutace.mjs). Svou kontrolu napiš jako
samostatnou funkci s jedním řádkem volání vedle uloTypyProblemy a hlášky
ve stejném tvaru jako #340 („varianta X: <cesta>: …"), ať jde větve sloučit
bez přepisování.

KONVENCE
Úpravy jen v src/, netlify/, nastroje/ — nikdy dist/*; pak python3 build.py
(verze = den commitu). Server a prohlížeč musí zůstat ve shodě (moduly v
jadro_moduly.cjs ve stejném pořadí jako CORE v build.py — poučení N43).
Konce řádků LF. Žádné ceny, firemní ani osobní údaje (jen zkušební ceník).
Komentáře česky s datem a číslem nálezu.

DOKUMENTACE
CHANGELOG.md (vysoký nález nahoře), PREDAVKA.md (co čeká na J. V.: bod 4
a detekční skript), BEZPECNOST_MEZE.md (co z třídy „koncová cena" zůstává
vědomě), roadmapa (roadmap.json → python3 roadmapa/roadmapa.py).

=== PŘÍLOHA C — B112 ===
Oprava VYSOKÉHO nálezu B112 (zápisová strana B88, #345) — server nevynucuje,
kdo smí měnit ceník varianty a skryté přepisy; obchodník ručním požadavkem
(konzole prohlížeče) sníží cenu nabídky o 25–42 % bez schválení. Kalkulator
Next Gen.

REPOZITÁŘ A VĚTEV
Repozitář vendljar/kalkulator-next-gen-engscalc. Vyjdi z commitu
9a48ee86f66f83e7c71b1f6c94189f6f2663634d (tag v29.9.1 = hlava větve
claude/pensive-curie-s6yzs3; kód = v26.9.1). Pracuj jen ve své paralelní větvi,
kterou ti přidělí sezení. Do test-draft, test ani main nic (pravidlo J. V.
29. 9. 2026). CLAUDE.md ještě jmenuje test-draft — tohle zadání má přednost.
Komunikace česky, nikdy AskUserQuestion — ptej se prózou s navrženými
výchozími odpověďmi. Dodrž skill kalkulator-next-gen.
Podrobnosti nálezu: PREDAVKA.md na větvi claude/komplexni-test-v29.9.1
(git fetch origin claude/komplexni-test-v29.9.1 && git show
FETCH_HEAD:PREDAVKA.md).

PRAVIDLO 0
Nejdřív pokusem ověř (zkušební ceník, vzor netlify/test_prava.mjs,
overit_role_nahled.mjs), že vada trvá: obchodník uloží uloženou variantu
s cenik.marze 0,20 → −0,10 → dnes 200, cena OCK 980 000 → 735 000 Kč (−25 %);
PC.marze −0,30 → cena PROJ −41,7 %; profilasKgKc 100 → 1 → cena −14,2 % a
nic se nehlásí; mnozstviPrepis hlavních profilů 0 a sekce[].prirazkaPct −50
→ 200. V prohlížeči z konzole set('C.marze', -0.1) a běžné uložení → 200.

NÁLEZ (vysoká — obchodník obejde slevové stropy; jen ručním požadavkem mimo UI,
stejná třída jako dřívější B2 a B71)
- UI: pole.prirazka má výchozí Obchodník/Vedoucí false s vlastním
  zdůvodněním „kdo ji smí měnit, obchází tím slevové stropy"
  (src/zobrazeni.js:213–220); tab.cenik a tab.cenikproj výchozí false
  (:69–86). Obchodník pole ani záložku nevidí — ale klient zápis nezastaví.
- Server: zakazkaServerKontrola u d.cenik a d.proj.cenik kontroluje jen typy
  (src/uloziste.js:850–853); porovnání se zveřejněným ceníkem, s uloženou
  verzí ani s rolí neexistuje (netlify/lib/zakazka_kontrola.mjs:72–241).
  src/zobrazeni.js:23–31 sám říká „Zobrazení je věc pohodlí, ne bezpečnosti".
- U snížené přirážky svítí lišta marže (jen varování), změna jednotkových cen
  nebo přepis množství je úplně tichá; rejstřík schvalování nic neukáže.
- Čtecí strana B88 (ceník a náklady v DOM každé roli) zůstává informativní
  a není předmětem tohoto promptu.

POŽADOVANÉ CHOVÁNÍ
V zakazkaServerKontrola pro roli bez práva (administrátor smí vždy; u
ostatních rozhoduje matice uložená na serveru — program/zobrazeni, klíče
tab.cenik, tab.cenikproj, pole.prirazka — jinak výchozí):
1) ceník varianty d.cenik a d.proj.cenik (po ocistiZnacky, BEZ popisy —
   dodatkové texty smí měnit každý) musí být (a) shodný s uloženou verzí téže
   varianty, nebo (b) shodný se zveřejněným ceníkem (program.platny, u
   zahraniční řady složený přes cenikSlozRadu) — nová zakázka nebo přepočet
   na platný ceník, nebo (c) shodný s ceníkem jiné varianty téže uložené
   zakázky (klon). Jinak 403 „Ceník varianty smí měnit jen …".
2) Totéž pro mnozstviPrepis, cenyPrepis a proj sekce[].prirazkaPct /
   sazbaPrepis / cenaPrepis: role bez práva je proti uložené verzi nezmění
   (u nové varianty jen výchozí hodnoty). Ověř v UI, které z těchto přepisů
   obchodník legitimně smí (např. ruční množství u příplatků, N50/N51) —
   ty nech a v komentáři vyjmenuj proč; rozhoduje matice.
3) Varianty zamčené už v uložené verzi přeskočit (doklad). Obnova ze zálohy
   (rezim obnova) zůstává administrátorská.
K rozhodnutí J. V.: v protokolu 29. 9. vedeno jako nový nález B112 (zápisová
strana B88). Výchozí návrh: B88 dál jen čtecí strana (informativní), B112
vysoká.

TESTY (pojistka proti prázdnému testu — dnes vše 200)
- netlify/test_prava.mjs (nebo test_obchodnik.mjs): obchodník změní uloženou
  variantu cenik.marze 0,20 → 0,05 a → −0,10 → 403; profilasKgKc 100 → 1 →
  403; PC.marze −0,30 → 403; mnozstviPrepis/prirazkaPct mimo právo → 403.
- Kontroly, že oprava neblokuje práci: stejná změna od administrátora → 200;
  obchodník s nezměněným ceníkem → 200; nová zakázka s ceníkem shodným se
  zveřejněným → 200; změna jen popisy → 200; klon varianty → 200; obchodník
  s právem pole.prirazka uloženým v matici → 200.
- Prohlížeč: obchodník set('C.marze', -0.1) z konzole a uložení → odmítnutí
  serveru s hláškou v liště.
- netlify/mutace.mjs: „ceník varianty se nehlídá", „přepis množství se
  nehlídá" — doložit, že je testy chytí; `node netlify/mutace.mjs --kontrola`.
- Do zprávy commitu: kolik testů selže PŘED opravou a že po ní projdou. Na
  konci celé kolo: KNG_PODKLADY=<složka> bash nastroje/testovaci_kolo.sh
  (mutace nikdy nepřerušovat), výsledky do PREDAVKA.md.

SOUBĚŽNÉ OPRAVY (29. 9. 2026)
Ve stejnou dobu běží v jiných větvích nad týmž commitem opravy B111, B96, B97, B98, B99
(každá svým promptem). Drž se jen B112. Odložené nálezy (zbytek B77,
B100–B110, zbytek B32, B4 souběh, B6, N59–N61) neopravuj, i kdybys na ně
narazil — jen je zapiš do PREDAVKA.md. J. V. bude větve slučovat: změny drž
malé a soustředěné, v CHANGELOG.md piš jen svůj oddíl, nové testy a mutace
přidávej jako samostatné bloky (ne přepisem cizích).
Pozor: B111 a B96 přidávají serverovou kontrolu na TOTÉŽ místo
(netlify/lib/zakazka_kontrola.mjs:88–90, vedle uloTypyProblemy; src/uloziste.js;
netlify/test_prava.mjs; netlify/mutace.mjs). Svou kontrolu napiš jako
samostatnou funkci s jedním řádkem volání vedle uloTypyProblemy a hlášky
ve stejném tvaru jako #340 („varianta X: <cesta>: …"), ať jde větve sloučit
bez přepisování.

KONVENCE
Úpravy jen v src/, netlify/, nastroje/ — nikdy dist/*; pak python3 build.py
(verze = den commitu). Server a prohlížeč ve shodě (jadro_moduly.cjs v pořadí
CORE). Konce řádků LF. Žádné ceny, firemní ani osobní údaje (jen zkušební
ceník). Komentáře česky s datem a číslem nálezu.

DOKUMENTACE
CHANGELOG.md (vysoký nález nahoře), BEZPECNOST_MEZE.md (co z matice zobrazení
zůstává jen v UI — čtecí strana B88), PREDAVKA.md, roadmapa (roadmap.json →
python3 roadmapa/roadmapa.py; #345).

=== PŘÍLOHA D — B97 ===
Oprava nálezu B97 (střední) — kolize klíčů e-mailu a adresy v brzdě přihlášení:
anonym zablokuje přihlášení celé cizí adrese. Kalkulator Next Gen.

REPOZITÁŘ A VĚTEV
Repozitář vendljar/kalkulator-next-gen-engscalc. Vyjdi z commitu
9a48ee86f66f83e7c71b1f6c94189f6f2663634d (tag v29.9.1 = hlava větve
claude/pensive-curie-s6yzs3; kód = v26.9.1). Pracuj jen ve své paralelní větvi,
kterou ti přidělí sezení. Do test-draft, test ani main nic (pravidlo J. V.
29. 9. 2026: úpravy se dělají vždy promptem do paralelní větve; o sloučení
rozhoduje J. V.). CLAUDE.md ještě jmenuje test-draft — tohle zadání má přednost.
Komunikace česky, nikdy AskUserQuestion — ptej se prózou s navrženými
výchozími odpověďmi. Dodrž skill kalkulator-next-gen.
Podrobnosti nálezu: PREDAVKA.md na větvi claude/komplexni-test-v29.9.1
(git fetch origin claude/komplexni-test-v29.9.1 && git show
FETCH_HEAD:PREDAVKA.md).

PRAVIDLO 0
Než cokoli změníš, ověř pokusem nad paměťovým úložištěm (vzor
netlify/test_prihlaseni.mjs), že vada trvá: z jedné adresy 61× přihlášení
s e-mailem „ip:198.51.100.55" → uživatel z 198.51.100.55 dostane 429 i se
správným heslem; totéž „Změnit moje heslo" (uzivatele.mjs:92–96). Když už je
opravená, nic neměň a napiš, čím.

NÁLEZ (střední — anonymně z internetu, ale „jen" výpadek přihlášení; vážnost
potvrdí J. V.)
- netlify/lib/sdilene.mjs:187 pokusyKlic(email) klíčuje e-mail malými
  písmeny BEZ předpony; pokusyIpKlic (:230–236) vrací „ip:<adresa>" nebo
  „ip6:<prefix>::/64" — obojí v tomtéž úložišti „pokusy".
- netlify/functions/prihlaseni.mjs:28–36 kontroluje jen délku e-mailu, ne
  tvar; pokusyZacatek (sdilene.mjs:258–263) započte pokus dřív, než rozhodne
  limit; od opravy B75 je nad limitem adresy 429 PŘED ověřením hesla
  (prihlaseni.mjs:50–52). Útočníkovi vlastní limit nevadí — pokus se
  započítá před 429.
- Blok drží, dokud útočník posílá aspoň jeden pokus za čtvrt hodiny, protože
  okno se posouvá každým pokusem (to je samostatný informativní nález B108 —
  ODLOŽENÝ, neřeš ho; jen ho nerozbij).
- Opačný směr (vynulování cizí adresy) nejde: účet s e-mailem „ip:…" neprojde
  emailPlatny. Je to jen cílený výpadek, ne zesílení hádání.

POŽADOVANÉ CHOVÁNÍ
- Jmenné prostory e-mailu a adresy se nesmějí nikdy překrýt (např. předpona
  „e:" u e-mailového klíče nebo samostatné úložiště). Stávající počítadla
  jsou krátkodobá (15 min) — migrace není potřeba, napiš to do komentáře.
- E-mail neplatného tvaru (emailPlatny) nesmí zakládat ani zvedat žádné
  e-mailové počítadlo; počítadlo ADRESY se ale započítat musí (jinak by šlo
  hádat bez brzdy). Odpověď dál stejná hláška 401 jako u špatného hesla —
  tvar vstupu nesmí prozradit, co existuje.
- Totéž u „mojeheslo" (uzivatele.mjs:92–96) a všude, kde se volá
  pokusyZacatek / pokusyNeuspech / pokusyUspech.
- Oprava B75 (429 před scryptem, IPv6 po /64, cizí úspěch nenuluje) musí
  dál platit — test_prihlaseni.mjs a mutace B75 ×3 zůstanou zelené.

TESTY (pojistka proti prázdnému testu — dnes útok projde)
- netlify/test_prihlaseni.mjs, nový oddíl „B97": 61+ pokusů s e-mailem
  „ip:<adresa>" z jiné adresy → majitel z napadené adresy správným heslem 200;
  totéž pro „ip6:<prefix>::/64"; e-mail neplatného tvaru dál zvedá počítadlo
  adresy (61. pokus z téže adresy → 429); mojeheslo se nedá zablokovat
  e-mailovým klíčem.
- Do zprávy commitu: kolik testů selže proti kódu PŘED opravou a že po
  opravě projdou.
- netlify/mutace.mjs: mutace „e-mailový klíč bez předpony" (a „neplatný
  e-mail zvedá e-mailové počítadlo") — doložit, že je nový test chytí; kotvy
  ověřit `node netlify/mutace.mjs --kontrola`.
- Na konci celé kolo: KNG_PODKLADY=<složka s podklady> bash
  nastroje/testovaci_kolo.sh (mutační běh NIKDY nepřerušovat), výsledky
  s počty do PREDAVKA.md.

SOUBĚŽNÉ OPRAVY (29. 9. 2026)
Ve stejnou dobu běží v jiných větvích nad týmž commitem opravy B111, B96,
B112, B98 a B99 (každá svým promptem). Drž se jen B97. Odložené nálezy
(zbytek B77 — akce „heslo" na vlastní účet správce, B106 tělo null → 500,
B107 bootstrap bez hesloVerze, B108 klouzavé okno, ani B4 souběh) neopravuj,
i kdybys na ně narazil — jen je zapiš do PREDAVKA.md. J. V. bude větve
slučovat: změny drž malé a soustředěné, v CHANGELOG.md piš jen svůj oddíl,
nové testy a mutace přidávej jako samostatné bloky.

KONVENCE
Úpravy jen v src/, netlify/, nastroje/ — nikdy dist/*; pak python3 build.py
(verze vDEN.MĚSÍC.pořadí = den commitu). Konce řádků LF. Žádné ceny, firemní
ani osobní údaje (nový smyšlený kontakt v testu → nastroje/povolene_kontakty.txt
s důvodem). Komentář u kódu česky s datem a číslem nálezu (vzor B75
v sdilene.mjs).

DOKUMENTACE
CHANGELOG.md (nová verze, B97: co a proč), PREDAVKA.md (výsledky kola, co
čeká na J. V.), roadmapa (roadmapa/roadmap.json → python3
roadmapa/roadmapa.py; #345 nebo nová položka).

=== PŘÍLOHA E — B98 ===
Oprava nálezu B98 (střední) — obnova ze SOUBORU zálohy převezme razítko
ověření nového zámku i razítko odemčení tak, jak jsou v souboru.
Kalkulator Next Gen.

REPOZITÁŘ A VĚTEV
Repozitář vendljar/kalkulator-next-gen-engscalc. Vyjdi z commitu
9a48ee86f66f83e7c71b1f6c94189f6f2663634d (tag v29.9.1 = hlava větve
claude/pensive-curie-s6yzs3; kód = v26.9.1). Pracuj jen ve své paralelní větvi,
kterou ti přidělí sezení. Do test-draft, test ani main nic (pravidlo J. V.
29. 9. 2026). CLAUDE.md ještě jmenuje test-draft — tohle zadání má přednost.
Komunikace česky, nikdy AskUserQuestion — ptej se prózou s navrženými
výchozími odpověďmi. Dodrž skill kalkulator-next-gen.
Podrobnosti nálezu: PREDAVKA.md na větvi claude/komplexni-test-v29.9.1
(git fetch origin claude/komplexni-test-v29.9.1 && git show
FETCH_HEAD:PREDAVKA.md).

PRAVIDLO 0
Než cokoli změníš, ověř pokusem nad paměťovým úložištěm (vzor
netlify/test_obnova.mjs a test_obnova_nanecisto.mjs, role vedlejší správce
a hlavní správce), že vada trvá: (a) obnova ze souboru se zakázkou, jejíž
nový zámek má podvržený zmrazený výsledek (např. zakladCena = 1) a
overeni.stav = „shoda" a kdo = „<hlavní správce>" → dnes zapsáno se „shoda",
kdežto běžné uložení téhož zámku dá „nesouhlasi"; (b) obnova ze souboru, která
odemkne odeslanou nabídku s razítkem odemčení na jméno hlavního správce
a libovolným datem → dnes projde. Když už je opravená, nic neměň a napiš, čím.

NÁLEZ (střední — jen administrátor, ale podvržení dokladů na jméno jiného
správce; přesně hrozba, kvůli které B27 zakázal obnovu účtů a podpisů ze
souboru)
- netlify/lib/zakazka_kontrola.mjs:213–219: v obnově (rezim obnova) se razítko
  ověření nového zámku spočítá jen tam, kde CHYBÍ; razítko ze souboru zůstane.
- zakazka_kontrola.mjs:113–125: razítko odemčení (kdo/kdy) píše server
  z relace jen mimo obnovu; v obnově zůstává ze souboru (komentář „doklad").
- netlify/functions/obnova.mjs:468–493 — cesta obnovy zakázek ze souboru.

POŽADOVANÉ CHOVÁNÍ
- Obnova ze SOUBORU: razítko ověření nového zámku vždy spočítat znovu
  (globalThis.zamekOvereni jako při běžném uložení); nesouhlas nechat zapsat
  jako „nesouhlasi" a ukázat ho v náhledu obnovy (důvod u zakázky).
- Obnova ze SOUBORU: odemčení, které v databázi není, neobnovit (zakázku
  přeskočit s důvodem v náhledu), nebo ho orazítkovat relací obnovujícího
  správce. Výchozí návrh: přeskočit s důvodem — soubor zálohy jde upravit
  v editoru (zásada B27).
- Obnova z OTISKU (serverová záloha, kterou klient nemůže upravit) smí zůstat,
  jak je — zdůvodni v komentáři.
- Oprava B72/P4 (jedna kontrola zakazkaServerKontrola pro uložení i obnovu)
  musí dál platit; test_obnova.mjs a mutace P4 ×5 zůstanou zelené.

TESTY (pojistka proti prázdnému testu — dnes obojí projde)
- netlify/test_obnova.mjs, nový oddíl „B98": (a) podvržená „shoda" ze souboru
  → po obnově „nesouhlasi" a důvod v náhledu; (b) podvržené odemčení ze
  souboru → zakázka přeskočena s důvodem (nebo kdo = relace, podle zvolené
  varianty); (c) totéž z otisku → dnešní chování beze změny.
- Do zprávy commitu: kolik testů selže proti kódu PŘED opravou a že po
  opravě projdou.
- netlify/mutace.mjs: mutace „obnova nechá overeni ze souboru" a „obnova
  převezme odemčení ze souboru" — doložit, že je nové testy chytí; kotvy
  ověřit `node netlify/mutace.mjs --kontrola`.
- Na konci celé kolo: KNG_PODKLADY=<složka> bash nastroje/testovaci_kolo.sh
  (mutační běh NIKDY nepřerušovat), výsledky s počty do PREDAVKA.md.

SOUBĚŽNÉ OPRAVY (29. 9. 2026)
Ve stejnou dobu běží v jiných větvích nad týmž commitem opravy B111, B96,
B112, B97 a B99 (každá svým promptem). Drž se jen B98. Odložené nálezy obnovy
(B100 firma/zákazníci/šablony bez očisty, zbytek B32 — klíč zakázky a strop
4 MB, B104 historie textů mimo zálohu, B109 popis B72 v CHANGELOG) neopravuj,
i kdybys na ně narazil — jen je zapiš do PREDAVKA.md. Pozor: B111, B96 a B112
mění netlify/lib/zakazka_kontrola.mjs kolem řádku 88 (kontroly typů) — ty
měníš jiná místa téhož souboru; drž změny malé, ať jde slučovat. V CHANGELOG.md
piš jen svůj oddíl, nové testy a mutace přidávej jako samostatné bloky.

KONVENCE
Úpravy jen v src/, netlify/, nastroje/ — nikdy dist/*; pak python3 build.py
(verze = den commitu). Konce řádků LF. Žádné ceny, firemní ani osobní údaje
v testech ani fixturách (smyšlená jména, ukázkový ceník). Komentáře česky
s datem a číslem nálezu.

DOKUMENTACE
CHANGELOG.md, BEZPECNOST_MEZE.md (co z obnovy z otisku vědomě zůstává),
PREDAVKA.md, roadmapa (roadmap.json → python3 roadmapa/roadmapa.py).

=== PŘÍLOHA F — B99 ===
Oprava nálezu B99 — šablony DOCX se zveřejňují bez kontroly externích vztahů
a vložených objektů. Kalkulator Next Gen.

REPOZITÁŘ A VĚTEV
Repozitář vendljar/kalkulator-next-gen-engscalc. Vyjdi z commitu
9a48ee86f66f83e7c71b1f6c94189f6f2663634d (tag v29.9.1 = hlava větve
claude/pensive-curie-s6yzs3; kód = v26.9.1). Pracuj jen ve své paralelní větvi,
kterou ti přidělí sezení. Do test-draft, test ani main nic (pravidlo J. V.
29. 9. 2026). CLAUDE.md ještě jmenuje test-draft — tohle zadání má přednost.
Komunikace česky, nikdy AskUserQuestion — ptej se prózou s navrženými
výchozími odpověďmi. Dodrž skill kalkulator-next-gen.
Podrobnosti nálezu: PREDAVKA.md na větvi claude/komplexni-test-v29.9.1
(git fetch origin claude/komplexni-test-v29.9.1 && git show
FETCH_HEAD:PREDAVKA.md).

PRAVIDLO 0
Nejdřív ověř, že vada trvá: sestav v testu syntetický .docx (JSZip nebo
ruční ZIP — žádné firemní podklady do repozitáře) s
word/_rels/settings.xml.rels, vztahem attachedTemplate,
Target="https://example.invalid/x.dotm" a TargetMode="External", a ukaž, že
ho zveřejnění (netlify/functions/sablony.mjs) i průvodce přijmou a generátor
ho přenese do vygenerované nabídky.

NÁLEZ (střední — integrita dokumentů, supply chain)
Server ověří jen začátek ZIPu „UEsDB" (src/sablony_online.js:50–52,
netlify/functions/sablony.mjs:71). Průvodce (src/ui/sablony_sprava_ui.js:
219–240; vlastní verze od překladatele :336–339, :378–397) kontroluje jen text,
jazyk, symboly a strukturu XML (src/docxgen.js:753–763). Generátor
(src/docxgen.js:506–527) mění jen document/header/footer a zbytek ZIPu
(_rels, settings.xml.rels, embeddings) kopíruje beze změny; totéž
docxPrelozSablonu pro jazykové mutace. Kontrola TargetMode="External",
attachedTemplate, oleObject, altChunk, vbaProject ani polí INCLUDE*/DDE
v kódu není. Scénář: EN verze od externího překladatele se vzdálenou šablonou
Wordu projde kontrolami, zveřejní se jako nabidka_en a každá EN nabídka
odeslaná zákazníkovi si při otevření ve Wordu stáhne cizí šablonu s makry
(případně prozradí NTLM hash přes \\server\share).

POŽADOVANÉ CHOVÁNÍ
- Jedna sdílená funkce (src/, běží v prohlížeči i na serveru přes
  jadro_moduly nebo import jako sablony_online.js), která nad rozbaleným
  ZIPem odmítne: vztahy s TargetMode="External" kromě hypertextových odkazů
  http(s); typy vztahů attachedTemplate, oleObject, package, aFChunk
  (altChunk), vbaProject, frame/subDocument s externím cílem; části
  word/embeddings/*, word/vbaProject.bin, *activeX*; content type
  macroEnabled; pole INCLUDETEXT, INCLUDEPICTURE, DDE, DDEAUTO v
  instrText/fldSimple.
- Volá ji zveřejnění na serveru (400 s českou hláškou, co přesně vadí) i
  průvodce před zveřejněním; generátor ji pro jistotu volá nad šablonou před
  generováním (obrana do hloubky — odmítnout, ne tiše vyhodit).
- DŮLEŽITÉ: dnešní firemní šablony (Sablona_NABIDKA_CN_v13 + EN/DE/FR,
  Sablona_NABIDKA_PROJ, SoD, plná moc) musí projít. Ověř to s
  KNG_PODKLADY=<složka> (overit_sablona.mjs, overit_sablony_online.mjs,
  overit_sod.mjs, overit_nabidka_proj_word.mjs) a v PREDAVKA.md vypiš,
  které vztahy v nich jsou (hyperlinky apod.). Nic z podkladů necommitovat.

TESTY (pojistka proti prázdnému testu)
- Nový src/test_sablona_obsah.js (nebo rozšíření existující sady šablon):
  syntetické .docx s každým zakázaným prvkem → odmítnuto; čistý .docx
  a .docx s hypertextovým odkazem https → přijat. Doložit do zprávy commitu,
  že proti kódu PŘED opravou testy selžou (kolik) a po opravě projdou.
- netlify/test_sablony.mjs: zveřejnění šablony s externím attachedTemplate
  → 400.
- netlify/mutace.mjs: mutace „kontrola obsahu šablony se na serveru
  nevolá" — doložit, že ji test chytí; `node netlify/mutace.mjs --kontrola`.
- Na konci celé kolo: KNG_PODKLADY=<složka> bash nastroje/testovaci_kolo.sh
  (mutace nikdy nepřerušovat), výsledky do PREDAVKA.md.

SOUBĚŽNÉ OPRAVY (29. 9. 2026)
Ve stejnou dobu běží v jiných větvích nad týmž commitem opravy B111, B96, B112, B97, B98
(každá svým promptem). Drž se jen B99. Odložené nálezy (zbytek B77,
B100–B110, zbytek B32, B4 souběh, B6, N59–N61) neopravuj, i kdybys na ně
narazil — jen je zapiš do PREDAVKA.md. J. V. bude větve slučovat: změny drž
malé a soustředěné, v CHANGELOG.md piš jen svůj oddíl, nové testy a mutace
přidávej jako samostatné bloky (ne přepisem cizích).

KONVENCE
Úpravy jen v src/, netlify/, nastroje/ — nikdy dist/*; pak python3 build.py
(verze = den commitu). Nový modul src/ zařadit do CORE v build.py a — pokud
ho potřebuje server — do netlify/lib/jadro_moduly.cjs ve stejném pořadí
(poučení N43). Konce řádků LF. Žádné ceny, firemní ani osobní údaje.
Komentáře česky s datem a číslem nálezu.

DOKUMENTACE
CHANGELOG.md, PREDAVKA.md, příručka (manual/obsah.json — věta u „Nahrát
vlastní verzi", co průvodce odmítne a proč), roadmapa (roadmap.json →
python3 roadmapa/roadmapa.py).
=== KONEC PŘÍLOH ===
