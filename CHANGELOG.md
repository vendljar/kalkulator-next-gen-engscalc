# Změny Kalkulátoru Next Gen

Zapisují se sem dávky a to, co v nich bylo opravené. Verze nese konvenci
`vDEN.MĚSÍC.pořadí` (`v21.9.2` = 21. září, druhá dávka toho dne).

Podrobné zdůvodnění každé opravy je ve zprávě commitu a v komentáři u kódu —
tenhle soupis slouží k rychlé orientaci, ne jako náhrada za ně.

---

## v25.9.1 — Zadání šachty: pořadí polí (25. 9. 2026)

Zadání J. V. obrázkem:

- 2. sloupec: vnitřní šířka, hloubka, **počet nástupišť** (na místě typu
  portálů), **počet sloupků**, stříška.
- 3. sloupec: způsob zasklení, opláštění, **typ portálů** (na místě počtu
  sloupků), světlík nad dveřmi, světlíky na bocích.
- 4. sloupec: rozteč, šířka rámu, čistý vstup, **přechodové plechy**,
  můstek, ATYP.

Výpočet ani data se nemění. Harness `overit_zadani_detail` hlídá pořadí
ve všech třech sloupcích.

---

## v24.9.7 — dávka N58 (24. 9. 2026 večer): co je nad dveřmi a vedle nich

Rozhodnutí J. V. 24. 9. večer (vizuální návrh odsouhlasen: výchozí plech,
sazby podle návrhu, boční pole ve stejné dávce).

- **Nad šachetními dveřmi volba výplně (N58).** Do 24. 9. bylo
  zaškrtávátko a bez něj se pole nad dveřmi (šířka stěny × (světlá výška
  − 2,3 m) na každé nástupiště) neocenilo vůbec. Teď rolovací menu:
  - *bez*: 0 Kč, kontrola před nabídkou upozorní na otvor;
  - *sklo*: dřívější světlík (sklo stěny, lišty/terče);
  - *plech*: 8,5 kg/m² do plechů dveří, práce +1 ks na nástupiště,
    lakování obou stran, montáž jako u světlíku; záporná výška se ořízne
    na nulu v obou modelech;
  - *materiál opláštění*: materiál stěny (ve standardu sklo stěny,
    v režimu po stěnách typ pásu);
  - *zajistí stavba*: 0 Kč a věta ve specifikaci.
  Výchozí volba nové zakázky je plech. Starší zakázky se převádějí beze
  změny ceny (zaškrtnuto = sklo, nezaškrtnuto = bez) v obou modelech.
- **Boční pole vedle dveří (N58b).** Pod *Světlíky na bocích dveří* se
  s počtem stran objeví *Výplň boků dveří* (sklo, plech, materiál
  opláštění, zajistí stavba). Plech a stavba berou plochu ze skla stěny,
  portálové sloupky zůstávají. Chybějící volba = sklo jako dřív.
- **Zadání šachty (úprava podle návrhu).** Světlík nad dveřmi je ve
  3. sloupci mezi počtem sloupků a světlíky na bocích. Můstek mezi budovou
  a OCK se přesunul do 4. sloupce na jeho dřívější místo.
- **Specifikace:** ŘEŠENÍ PORTÁLŮ (ČLENĚNÍ) a OPLÁŠTĚNÍ NADSVĚTLÍKŮ podle
  výplně. Skleněné kombinace mají dosavadní znění, nové texty se překládají
  po částech. Nová hesla EN/DE/FR jsou **návrh, čeká na kontrolu J. V.**
- Testy: `src/test_nadprazi.js` 48, `overit_zadani_detail` +6,
  `test_kontroly` (16 pravidel), mutace jádra +8. Upraveny `overit_oplasteni`
  (nová zakázka má plech, sklo se volí hodnotou) a `overit_lista`
  (16 pravidel).

## v24.9.6 — dávka F4a (24. 9. 2026 večer): průchozí šachta, lešení, záporné hodiny

Rozhodnutí J. V. 24. 9. večer.

- **Průchozí šachta podle pravidla nástupišť (N46, N45).** Zadání:
  „Nástupiště obsahuje světlíky, dveře, portály s plechy a nástupní plechy.
  Nástupiště je všude tam, kde jsou dveře. Kde dveře nejsou, je provedeno
  opláštění zvoleným materiálem po celé ploše.“
  - Platí stejně pro čelní (A) i zadní (C) stěnu, ve standardu i v režimu
    po stěnách (#295 „stejné pravidlo platí i po stěnách“).
  - Stěna se dělí podle skutečných výšek. Patra pod nejvyšší stanicí mají
    pás o výšce podlaží, nejvyšší patro pás hlavy (přejezd). Prohlubeň do
    stěn nepatří, má vlastní sokl.
  - Pás s dveřmi má sklo jen ve světlících, pás bez dveří se opláští celý.
  - Každá stěna má jedno sklo a světlíky jsou z téhož skla jako jejich
    stěna.
  - Boční světlíky patří ke stěně s dveřmi (N45). Spojovací plechy
    čelního rámu se počítají podle počtu stěn s dveřmi.
  - Neprůchozí šachta se nemění. Zrcadlová šachta (A4C0 × A0C4) má
    zrcadlové stěny. Zapnutí režimu po stěnách zase nehne cenou.
  - Zadání nese jen počty dveří, proto se u nejvyššího patra předpokládají
    dveře vpředu, má-li čelní stěna nějaké dveře.
  - Detail výpočtu ukazuje rozpad stěn A a C na nástupiště a patra bez
    dveří.
  - Rozpracované průchozí zakázky se přecení (odsouhlaseno), odeslané
    nabídky se zmrazeným výsledkem ne.
- **Lešení při přepisu množství (N51, schváleno):** ve volitelných
  položkách i v příplatcích se počítá metry × sazba + celá fixní část.
  Přepis na 0 m = 0 Kč; dřív ve volitelných zůstal fix.
- **Záporné hodiny ručně zadat nejde (N56):** hodiny montáže a projekce
  (základ i ATYP) a hodiny i rezerva položek PROJ. Aplikace vrátí hlášku
  a pole mají `min="0"`. Korekce hodin montáže od referenční šachty
  (21 m, 6 nástupišť) zůstávají. Výpočet sám do minusu nejde.
- Testy:
  - nová sada `test_nastupiste.js` (20 kontrol, proti dosavadnímu jádru
    13 selže);
  - na nové pravidlo přepsány `test_oplasteni_zapnuti`,
    `test_pruchozi_zadni`, `test_sklo_steny` a `test_prepisy`;
  - `overit_zadani_detail` +5;
  - mutace jádra +5.

---

## v24.9.5 — dávka G1 (24. 9. 2026 večer): nová správa šablon dokumentů

Podle vizuálního návrhu, který J. V. 24. 9. večer odsouhlasil („návrh
správy šablon vypadá super, ten nahraj do testu").

- **Proč.** Jako česká šablona nabídky OCK se zveřejnil soubor
  `…_v11_DE.docx` (verze 9) a jazykové verze EN/DE hlásily „zastaralá“,
  i když byly nahrané moderní šablony. Příčiny:
  - tlačítko „Nahrát .docx“ nahrávalo vždy do češtiny a jazyk
    nekontrolovalo;
  - doladěnou jazykovou verzi nešlo nahrát k jazyku;
  - zastaralost se poznávala podle data zveřejnění a server stejný
    soubor podruhé nezveřejní, takže hláška nešla odstranit.
- **Nastavení → Šablony (online)** ukazuje jednu tabulku dokument ×
  CZ/EN/DE/FR se stavem ze serveru. Po kliknutí na dokument se zobrazí
  jeho detail s jazykovými verzemi a historií.
- **Průvodce novou českou verzí:** vybere se soubor a proběhne kontrola:
  - jazyk souboru (německý soubor se jako čeština nepustí a aplikace
    nabídne „Uložit jako DE verzi“);
  - symboly `{{…}}` a rozdíl proti platné verzi (chybějící symboly
    ohlásí).

  Pak aplikace sama vyrobí jazykové verze (ukáže, kolik procent se
  přeložilo) a vše se zveřejní najednou.
- **Jazykové verze u dokumentu:** „Přegenerovat z češtiny“, „Nahrát
  doladěný soubor“ (aplikace zkontroluje, že je opravdu v tom jazyce a má
  symboly platné češtiny), „Stáhnout“, „Nepřeložené fráze (CSV)“.
- **Zastaralá podle obsahu:** jazyková verze nese otisk české verze, ze
  které vznikla (`zdrojOtisk`). Server ho přijme jen k platné češtině
  (jinak 409). Stejný soubor k nové češtině se dá zveřejnit znovu.
  Starší záznamy bez otisku se posuzují postaru podle času.
- **Vrátit:** starší verze se zveřejní znovu jako nová verze s poznámkou
  „vráceno z verze N“. Nic se nepřepisuje ani nemaže.
- Bez přihlášení k serveru zůstává původní obrazovka.
- Testy:
  - `test_sablony_online` +23;
  - nová serverová sada `netlify/test_sablony.mjs` (19 kontrol, bez
    opravy 10 selže);
  - `overit_sablony_online` +20 (celkem 47): celý průvodce v prohlížeči
    nad skutečnou šablonou CN v11 včetně vrácení verze;
  - mutace jádra +3, serveru +3.
- **Zjištěno při zkoušce na skutečných šablonách:** slovník přeloží
  nabídku OCK na 100 %, nabídku PROJ jen na 26 % a smlouvy o dílo na
  0–3 %. Jejich jazykové verze by tedy vyšly skoro celé česky. Průvodce
  to ukáže (u verze pod 90 % varování); doplnění slovníku je v roadmapě.

---

## v24.9.4 — dávka F1 (24. 9. 2026): bezpečnost a ztráta práce z hloubkového testu

Opravy nejzávažnějších nálezů 20. kola (hloubkový test 24. 9. 2026). Ke
každé opravě je test. Každý test byl spuštěn i proti kódu bez opravy
a v tom běhu selhal.

- **Uložená zakázka nespustí cizí skript (B69, B70, B87).** Hodnoty ze
  zakázky, které šly do obrazovky bez escapování, se teď escapují. Jde
  o prostřední sloupec detailu výpočtu, sazbu DPH, hodiny a rezervu PROJ
  a spojky a počty v odvozených parametrech. Typ pásu opláštění jádro
  bere jen z číselníku. Cesta ceny v obsluze změny je escapovaná.
  `set`/`pjSet`/`cenikSet` odmítnou `__proto__`, `constructor`
  a `prototype`. Nová prohlížečová sada `overit_xss.mjs` (27 kontrol):
  vkládá payload do dat zakázky a vykresluje všechny záložky pro
  obchodníka i administrátora, místo aby četla zdroják (B87).
- **Příloha nespustí skript (B82).** Obsah přílohy smí být jen `data:`
  adresa. Server zakázku s `javascript:` v příloze neuloží ani neobnoví
  a tlačítko Stáhnout takovou přílohu odmítne.
- **Odeslanou nabídku ve starším tvaru dat jde uložit (N43).** Server
  porovnával migrovaná data zamčené varianty s nemigrovanou uloženou
  verzí a vracel 409 celé zakázce, i práci na odemčených variantách.
  Teď porovnává migrované s migrovaným, stejně tak obnova. Skutečná
  změna odeslané nabídky se dál odmítne. Do zamčené varianty klient
  nedoplňuje katalog ani kurz. Nová sada `netlify/test_stary_tvar.mjs` (9).
- **Klon varianty a alternativa nepřebírají schválení slevy (N44).**
  Obchodník zakázku s klonem schválené varianty dřív neuložil (403).
  Vedoucí se jejím uložením stal schvalovatelem slevy, kterou nikdy
  neviděl. Kopie si teď nese procenta a poznámku, stav a schvalovatele
  ne (stejně jako duplikát). Nová sada `netlify/test_klon_sleva.mjs` (13).
- **Zadání bez volitelných položek neshodí výpočet (N57).** Import doplní
  prázdný objekt a jádro samo nespadne. U běžné zakázky se výsledek
  nemění. Nová sada `src/test_volitelne_chybi.js` (18).
- **Autora existující zakázky server nebere od klienta (B73).** Uložením
  se zakázka nedá přestěhovat jinému obchodníkovi. Nová sada
  `netlify/test_autor.mjs` (11).
- **Zapnutí a archiv účtu berou jen true/false (B74).** Hodnota `0` nebo
  `""` obešla pojistky a vypnula i hlavní nebo vlastní účet. Teď vrátí 400.
- **Přihlášení z cizí stránky se odmítne (B78).** Cizí Origin, Origin
  `null` a formulářové tělo vrátí 403. Cizí stránka tak už nepřihlásí
  prohlížeč obchodníka do účtu útočníka.
- Příručka obchodníka má snímky a číslo verze pro v24.9.4, obsah je beze
  změny.

---

## v24.9.3 — dávka E4 (24. 9. 2026): obnova nanečisto, zámek, FR kapitoly, T4

- **Zkouška obnovy nanečisto a postup obnovy (#152, 2. část).** Nová sada
  `netlify/test_obnova_nanecisto.mjs` (20 kontrol) simuluje úplnou havárii
  ve dvou krocích:
  - Zmizí celá ostrá databáze a noční otisky zůstanou. Administrátor se
    přihlásí náhradním heslem a obnoví noční otisk. Vrátí se zakázky
    (i se zámkem odeslané nabídky), ceník v2, firma i účty; obchodník se
    přihlásí původním heslem.
  - Zmizí i zálohy. Obnova ze staženého souboru vrátí zakázky, ceník
    a firmu. Účty ne, protože soubor otisky hesel nenese.

  `podklady/POSTUP_OBNOVY_ZALOHY.md` popisuje tytéž situace s názvy
  tlačítek z aplikace a čtvrtletní ruční náhled na testu.
- **Vykreslení nezapisuje do zamčené varianty (N41d, ověřeno).**
  `oplZadani()` a `oplStena()` doplňovaly chybějící opláštění, stěny
  a pásy přímo do zadání i u odeslané nabídky. Pouhé otevření tak
  přepsalo data dokladu. U zamčené varianty se výchozí podoba jen
  spočítá. `overit_oplasteni.mjs` má 2 nové kontroly; bez opravy jedna
  selže.
- **Odstup světlé výšky 0,2 m je pojmenovaná konstanta (#327, K9-N35).**
  Konstanta `SVETLA_VYSKA_ODSTUP_M` nese vysvětlení, že 0,25 m v předloze
  0216 je překlep. Hodnota ani ceny se nemění. Mutace jádra 52/52.
- **Francouzské kapitoly nabídky (N41c).** Nastavení → Firma má FR pole
  kapitol IV.–VI. a doložek, bez výchozího textu (smluvní podmínky se
  nevymýšlejí). Vyplněné FR znění se ve francouzské nabídce použije.
  Prázdné pole dál spadne na češtinu s upozorněním a nic se nevypustí.
  `test_nabidka_kapitoly` má 6 nových kontrol.
- **T4, další krok.** Popisky zadání a detail výpočtu ověřuje prohlížeč
  (`overit_zadani_detail.mjs`, 21 kontrol), ne regulární výrazy nad
  zdrojákem. Sada hlídá i to, že má každý řádek detailu OCK a PROJ
  vysvětlení. Obráceně: vyprázdněné vysvětlení sada chytí.
  `test_zadani_popisky.js` si ponechal jen čistou funkci `nulaOznac`.
- **Podklady Pipedrive** z nesloučené větve jsou v `podklady/` (návrh
  zápisu a patch serverových funkcí, do kódu se zatím nepouští).

---

## v24.9.2 — dávka E3 (24. 9. 2026): cizojazyčná nabídka podle 10. kola

- **13 příplatků má překlad EN/DE/FR (#335, K10-N38).** V anglické
  nabídce se dosud tisklo česky třeba „LEŠENÍ - vnitřní" vedle
  „SCAFFOLDING – external". Názvy drží terminologii sousedních hesel.
  Nová sada `test_preklad_priplatky.js` (50 kontrol) bere názvy příplatků
  přímo ze zdrojáku jádra, takže nový příplatek bez překladu ji shodí.
  Obráceně: bez nových hesel selže 35 kontrol.
- **Pevné texty šablony nabídky OCK jsou ve slovníku (#334, K10-N36).**
  Jde o 24 textů v EN/DE/FR: nadpisy A./B./I./II., úvod, poznámky k ceně,
  platební podmínky, kapitola V. šablony v10 a věta o předávacím
  protokolu. Kontaktní blok firmy (web, telefon, IČ, PSČ a město, ulice,
  název s právní formou, oddělovací čára) se nově pozná jako text, který
  se nepřekládá. Vzory jsou úzké a test hlídá, že běžný text s číslem
  pořád jde do překladu. Překladač šablony teď nad v10 i v11 nenechá
  česky nic: v anglické i německé mutaci chybí 0 textů (dříve 31 u v10
  a 27 u v11).
- **Pojistka zastaralé jazykové mutace (#334, K10-N36/N37).** Mutace
  EN/DE/FR zveřejněná dřív než platná česká šablona je zastaralá. V ostré
  šlo o mutaci z v8 proti české v10: 17 % textu bylo česky a chyběl
  řádek soklu. V přísném režimu se z takové mutace netiskne; hláška řekne
  proč a že ji administrátor přegeneruje. Česká nabídka tím zastavená
  není. V měkkém režimu se tiskne dál, ale s upozorněním. Nastavení →
  Šablony u mutace ukáže „⚠ zastaralá". `overit_sablony_online.mjs` má
  7 nových kontrol (28/28); obráceně bez pojistky selžou 3.
- **Příručka obchodníka nezmiňuje testovací web** (pokyn J. V.:
  obchodníkům přístupný nebude). Kapitola 4, heslo ve slovníčku a zmínky
  v úvodu jsou pryč. Kapitoly jsou přečíslované (33 → 32) i se 40 odkazy
  v textu. Kontrola v `manual/overit.js` je obrácená a nad starou
  příručkou selže. Příručka nese v24.9.2.
- **Postup vydání ve třech krocích:** 1) `test-draft` (rozpracované,
  Netlify ho nenasazuje), 2) `test` (testovací web, před nahráním
  `nastroje/pred_pushem.sh`), 3) `main` (ostrý web, CI běží samo).

---

## 24. 9. 2026 — dávka E2: příručka obchodníka pro v24.9.1 (aplikace beze změny)

- **Text příručky (`manual/obsah.json`) odpovídá v24.9.1.** Poslední
  příručka byla z v17.9.3. Přibyl rámeček „Co je nového od příručky ze
  17. 9. 2026" a upravilo se 18 kapitol. Hlavní témata:
  - zmrazený Model 1 a nová podkapitola „Režim výpočtu";
  - termín dodání s ATYP v kapitole V. a kontrola před nabídkou;
  - kapitoly III.–VI. v nabídce;
  - opláštění po stěnách;
  - zakázka jen ke čtení a jedno číslo varianty;
  - DPH 0 % u zahraničí;
  - obnovení stránky bez ztráty práce;
  - nové hlášky ve slovníčku.
- **Snímky se pořizují automaticky (`manual/snimky_auto.mjs`).** Dosud se
  fotily ručně v prohlížeči nad testovacím webem. Nástroj spustí aplikaci
  lokálně se zkušebním ceníkem a vymyšlenými zakázkami, přihlásí se jako
  obchodník a za zhruba 30 s pořídí všech 21 snímků (3 nové: režim
  výpočtu, kapitola V. nabídky, panel kontrol). Snímky nenesou skutečné
  ceny a příručka to říká. Výstup jde mimo repozitář; hotová příručka se
  do repozitáře dál neukládá.
- **`overit_manual.mjs` je přepsaný na nový tvar příručky (N17).** Do teď
  hlídal srpnový tvar s 25 zapečenými PNG a nad každou novou příručkou
  hlásil 13 falešných selhání. Nově pouští v Chromiu `manual/overit.js`
  a přidává kontrolu verze proti `verze.txt` a povinná témata. Nad novou
  příručkou prošlo 37 kontrol z 37. Nad starou v17.9.3 selhávají 4 kontroly
  a všechny právem: stará verze, chybějící témata E1 a tři vysvětlivky,
  které tam mířily na text, jenž na snímcích nebyl.
- **CI:** automaticky běží jen při nahrání na main, jinak ručně (viz
  záznam níž).

---

## 24. 9. 2026 — testy lokálně, CI jen při nahrání na main (aplikace beze změny)

- **GitHub Actions běží automaticky jen při nahrání na main** (rozhodnutí
  J. V. 24. 9. 2026: „testovat lokálně", CI „když řeknu nahraj na main").
  Na main se nahrává jen na pokyn, tedy při vydání na ostrý web; CI tam
  poběží celé včetně mutací. Na větvi test se nespouští, ručně jde pustit
  vždy (GitHub → Actions → Testy → Run workflow). Do té doby běželo při
  každém pushi na test i main a opakovalo to, co už proběhlo v sezení.
- **Nový `nastroje/pred_pushem.sh`** dělá totéž co CI, a to před pushem:
  kontrolu verze proti dni commitu, kontrolu CRLF, sady v Node a všechny
  prohlížečové harnessy. S přepínačem `--mutace` pustí i celý mutační běh
  serveru a jádra (jen když se měnil server nebo jádro). Firemní šablony
  se předávají přes `KNG_PODKLADY`.
- **Jedna dávka = jeden push na test** na jejím konci (každý push je
  nasazení na Netlify). Do main jen na pokyn „slouč".

---

## v24.9.1 — dávka E1 (24. 9. 2026): rozhodnutí J. V. k #149 a #277

- **Model 1 je zmrazený pro ne-administrátory (#332).** Rozhodnutí J. V.
  z 24. 9.: dál se rozvíjí jen Model 2 a na Model 1 nepůjde přepnout.
  Na Model 1 přepne jen administrátor. Pojistka je v `set()`, takže ji
  neobejde ani jiné volání než přepínač. Zakázka, která v Modelu 1 už je,
  se počítá dál beze změny ceny. Obchodník ji smí převést na Model 2,
  zpátky ne, a u volby vidí štítek „Model 1 (zmrazený)". Harness
  `overit_zobrazeni.mjs` +4. Ověřeno i obráceně: bez pojistky 2 selhání,
  bez úpravy přepínače 2 selhání.
- **Termín dodání s ATYP je v nabídce (#330, nález TD1).** Termín dodání
  z krycího listu (`{{PODM_TERMIN_DODANI}}`) je první odrážkou kapitoly V.
  v náhledu i v PDF. Zahrnuje prodloužení za ATYP i ruční přepis. Zbytek
  kapitoly zůstává textem z Firmy. Když lhůta ve Firmě chybí, odrážka se
  vynechá (nic se nevymýšlí). Překlad EN/DE/FR zajišťuje nový vzor, který
  stojí před obecným „cca …", aby nevznikla půlka věty česky.
  Nové 15. pravidlo kontrol před nabídkou **„Termín dodání u atypické
  zakázky"** hlásí dva případy: kapitola V. z Firmy uvádí jinou lhůtu než
  termín ze zakázky, nebo ve Firmě chybí standardní lhůta. Testy:
  `test_nabidka_kapitoly` +11, `test_kontroly` +8. Obráceně: bez opravy
  8 a 5 selhání.
- **Šablona CN v11 (#331) — kapitoly ze symbolů, ne natvrdo.** Šablona je
  připravená mimo repozitář a nahraje ji administrátor. Kapitoly IV.–VI.
  a nové DOLOŽKY v ní plní `{{FIRMA_NAB_POZADAVKY}}`,
  `{{FIRMA_NAB_PREDANI}}` a `{{FIRMA_NAB_DOLOZKY}}`. Kapitola V. je jeden
  symbol `{{NAB_KAP_TERMINY}}`: termín dodání ze zakázky plus text z Firmy.
  Jde o jeden symbol, aby při nevyplněné lhůtě nezůstal prázdný řádek
  tabulky. Word i náhled teď tisknou kapitoly ze stejného zdroje.
  `overit_sablona.mjs` má novou sadu pro v11+ (v11: 54/54). U starší
  šablony sadu přeskočí a řekne to. `test_nabidka_kapitoly` +4.
- **Hlídka noční zálohy (#152, první část).** Administrátor při přihlášení
  dnešní otisk dopořídí sám, takže přehled záloh vypadal zdravě, i když
  noční funkce neběžela. Nová `uloZalohaHlidka()` v `src/uloziste.js`
  sleduje zvlášť poslední **noční** otisk. Když je starší než 48 hodin
  (dvě zmeškané noci) nebo chybí, administrátor dostane varování po
  přihlášení i v Nastavení → Databáze. Jinak tam vidí klidný řádek
  s datem poslední noční zálohy. Obchodník hlídku nevidí. Testy:
  `test_uloziste` +8, `overit_online` +5. Obráceně: bez filtru na noční
  otisk 4 a 2 selhání. Zkouška obnovy nanečisto (2. část #152) zůstává
  otevřená.

---

## v23.9.3 — dávka D3 (23. 9. 2026 večer): nástroje a testy, aplikace beze změny

- **Mutační testování jádra je v repozitáři (N19).** `mutace_jadro.mjs`
  (převzato ze zdrojáků v21.8.1, bez cen) do té doby v repozitáři chybělo,
  takže ho nespustilo CI ani cloud. Šest kotev mířilo do prázdna, protože
  se jádro od 17. 8. změnilo. Kotvy jsou opravené a přibyl rychlý režim
  `--kontrola`, který pouští `spust_testy.sh` i CI. V CI je nový job
  `mutace-jadro` s plným během.
- **První běh ukázal 11 nechycených mutací z 52.** Dřív je hlídaly sady
  shody s Excelem, které potřebují skutečný ceník a v repozitáři nejsou.
  Nová sada `src/test_jadro_pojistky.js` (24 kontrol nad zkušebním ceníkem)
  je hlídá chováním: DPH ze zaokrouhleného základu, sazby plechů podle
  provedení, sazba statiky, zaokrouhlení příplatků, rozdíly Modelu 1
  ($D$3, lemování, podesty, D19/D18), doprava, rezerva hodin a sazba
  zaměření v PROJ. Teď je chyceno **52/52**.
- **Harness šablony nabídky bere nejnovější verzi.** `overit_sablona.mjs`
  hledal napevno v8/v7, a tak kontroloval šablonu, se kterou se už netiskne.
  Nově ji vybírá `najdiNejnovejsi` (v10 porazí v9 jako číslo). Od v9 je
  titulní obrázek rámečkem úvodní fotky, proto harness dodá i fotku.
  Výsledek: v10 42/42, v7 42/42.
- **T4, první krok.** Kontroly obrazovek zaokrouhlení OCK × PROJ se
  přestaly ověřovat čtením zdrojáku (`test_zaokrouhleni.js`) a ověřuje je
  nový harness `overit_zaokrouhleni.mjs` (12 kontrol, se sabotáží 3
  selhání). Ostatní testy tvaru zdrojáku se přepisují postupně.

---

## v23.9.3 — 23. 9. 2026 (noční dávka D1 + D2)

### D1 — drobnosti z 9. testovacího kola a revize v22.9.9

- **Varování, když chybí kapitoly IV.–VI. (#324, K9-N32).** Prázdná kapitola
  se z nabídky OCK vypouští i s nadpisem, takže odešla bez požadavků, termínů
  a předání díla a nikdo o tom nevěděl. Nově je v kontrolách před nabídkou
  pravidlo „Nevyplněné kapitoly nabídky“ (varování, jazyk podle tisku)
  a Nastavení → Firma → Kapitoly nabídky ukazuje, které české kapitoly chybí.
  `firmaKapitolyPrazdne` v `src/firma.js`. Test: `test_kontroly.js` (+8).
- **Zablokované vyskakovací okno (#328, K6).** Osm tiskových náhledů padalo
  na `w.document`, když prohlížeč okno zablokoval, a obchodník neviděl nic.
  Teď přes `oknoNahledu()` dostane hlášku, jak okna povolit. Test:
  `overit_dialogy.mjs` (+3, bez opravy 2 selhání).
- **Technická specifikace vypisuje jen započítané pásy (N41b).** Věta
  o opláštění po stěnách se skládá z pásů, které jádro opravdu spočítalo.
  Pás nad horní hranou prosklení nebo pod předchozím pásem už ve specifikaci
  není. Test: `test_oplasteni_zapnuti.js` (+5, bez opravy 2 selhání).
- **Hlavní správce v Nastavení (#278).** Administrátor v Nastavení →
  Uživatelé vidí, jestli je na serveru nastavená proměnná `ADMIN_EMAIL`.
  Pokud chybí, dostane varování s návodem.

### D2 — bezpečnost (B57, B58, B61, B62, B68) a meze v dokumentaci

- **B57:** `/api/zdravi` už anonymně nehlásí, jestli je nastavený hlavní
  správce. Údaj dostává jen administrátor v `/api/ja` a v odpovědi na
  přihlášení (viz #278).
- **B58:** kniha smazaných účtů jde s oběma zálohami. Obnova ze serverového
  otisku ji doplní, existující záznam nepřepíše a u e-mailu, pod kterým žije
  účet, nic nezapíše.
- **B61:** server odmítne nový zámek, jehož číslo nesedí na data zakázky
  nebo nemá značku `cisloPapir`. Dřív tudy prošla „odeslaná“ nabídka pod
  novým číslem bez porovnání. Administrátorovi při změně čísla server
  razítko dál srovná (B56).
- **B62:** u existujícího zámku bere server `kdo`, `popis` a `sablona`
  z uložené verze. Z `tisky[]` a `odemceni[]` platí uložený začátek:
  přidávat se smí, přepsat ani ubrat ne (`uloZamekRazitkaDrz`).
- **B68:** textová pole firmy mají kontrolu typu a délky (2 000 znaků,
  u kapitol 20 000).
- Nový dokument **`BEZPECNOST_MEZE.md`**: B65–B67 a zbytkové meze B61/B62.

Testy: `test_prava.mjs` (534, +12), `test_obnova.mjs` (+4), `test_firma.js`
(+4), `overit_zobrazeni.mjs` (+2). Šest nových mutací (150 celkem), všechny
chycené. Testy, které zakládaly zámek bez čísla, teď dělají zámek stejně
jako aplikace. Staré zámky zapisují rovnou do úložiště, jako by tam ležely
odjakživa.

---

## v23.9.2 — 23. 9. 2026

### Skrýt / srolovat u všech karet Kalkulace OCK; skrytí se obchodníkovi projeví hned

Zadání J. V.: „přidej skrývací a rolovací tlačítka do všech sekcí kalkulace
OCK a prověř funkčnost skrývání pro obchodníky. Přijde mi, že když vyberu
skrýt, tak obchodník sekci stále vidí."

**Co bylo špatně.** Volbu zobrazit / skrýt / srolovat měly jen sekce
tabulky (Hrubá OCK, Opláštění, Volitelné, Režie), Příplatky, Detail
mezivýpočtů a Interní poznámky. Karty Zadání šachty, Opláštění po stěnách,
Dimenze profilů, Práce a režie, Cenová kalkulace, Sleva, Obchodní
zaokrouhlení a Cenová nabídka (CN) ji neměly vůbec. A hlavně: obchodník
dostával nastavení zobrazení jen při přihlášení. Kdo měl aplikaci otevřenou
(stránka běží i celé dny), viděl skrytou sekci dál až do obnovení stránky.
Změřeno v prohlížeči: v jednom okně skrytí fungovalo, u už přihlášeného
obchodníka se neprojevilo.

**Co platí teď.**
- Všechny karty Kalkulace OCK mají v nadpisu stejný select a u srolované
  karty tlačítko „▸ rozbalit" (stejný vzhled jako Detail mezivýpočtů).
  Dimenze profilů zůstávají ve výchozím stavu sbalené. U PROJ se nic
  nemění.
- Přihlášený obchodník nebo vedoucí si nastavení zobrazení načte znovu
  každé 3 minuty a při každém návratu do okna (nejčastěji jednou za
  minutu). Překreslí se, jen když se něco změnilo. Administrátora to
  vynechává, aby mu stažení nepřepsalo neuložené zaškrtnutí.
- Kotva skryté sekce zmizí i z klouzající lišty (OCK i PROJ), aby
  neukazovala do prázdna.

Skrytá sekce se dál počítá, jen není vidět. Skrytím Zadání šachty by
obchodník přišel o možnost zadat rozměry, takže tuto volbu používejte
s rozmyslem.

Testy: `overit_zobrazeni.mjs` (+13 kontrol: select u každé karty, rozbalení,
skrytá karta i kotva u přihlášeného obchodníka, změna za chodu a její
vrácení).

### CI: harness overit_verzi nepadá den po commitu

Běh CI na main (commit 94a7267 z 22. 9., spuštěný 23. 9.) selhal ve dvou
harnessech, ačkoli týž commit na testu den předtím prošel. `overit_verzi.mjs`
vrací verzi z gitu příkazem `build.py --ver …` a pojistka data (od 20. 8.)
verzi ze včerejška odmítla — i v bloku `finally`. V `dist/` tak zůstala verze
z lokálního buildu a `overit_zobrazeni.mjs` narazil na blokující překryv
„nesoulad verzí". Aplikace ani ostrý web to nezasáhlo (Netlify verzi jen
přebírá). Návrat verze teď pojistku vědomě obchází (`KNG_VERZE_MIMO_DEN=1`).
Ověřeno nad stavem main: bez opravy harness spadne, s ní 7/7 a
overit_zobrazeni 121/0.

---

## v23.9.1 — 23. 9. 2026

### Nová tuzemská zakázka už nehlásí falešný rozdíl ceníku (K9-N31)

Nález z 9. testovacího kola. **Co bylo špatně:** každá nová tuzemská
zakázka hned po založení ukazovala lištu „Ceník v této kalkulaci se liší od
dnešního ceníku aplikace – 1 položka … −100 %". Šlo o položku označenou
„jen zahraničí": přehled ji srovnává s ceníkem složeným pro tuzemskou řadu,
kde je nulová, kdežto nová zakázka brala holý ceník aplikace. Na cenu to
vliv nemělo, obchodník ale dostával planý poplach.

**Co platí teď:** nová zakázka i nová varianta dostanou ceník už složený pro
tuzemskou řadu — položky „jen zahraničí" se zahraniční cenou jsou na nule,
stejně jako po přepočtu (`novaVariantaData` v `zakazka.js`). Test:
`test_cenik_rady.js` (4 kontroly; bez opravy dvě selžou).

---

## v22.9.22 — 22. 9. 2026

### Jedno číslo varianty — platí číslo na papíře (#320)

Rozhodnutí J. V.: „platí číslo na papíře, nové klony dostanou příponu shodnou
s pořadím a odeslaným nabídkám zůstane číslo, se kterým odešly."

**Co bylo špatně.** Varianta měla dvě čísla. Dokumenty (nabídky OCK i PROJ,
krycí listy) číslovaly podle POŘADÍ v zakázce — druhá varianta …555.2 —
kdežto zámek odeslané nabídky, seznam variant, archiv, hlášky i serverová
kontrola čísla (B56) podle přípony klonu, kterou první klon dostal .1.
Změřeno: druhá varianta odešla zákazníkovi jako 0555.2, v zámku stála
0555.1 a číslo 0555.2 v aplikaci patřilo jiné nabídce než na papíře. Číslo
podle pořadí se navíc posouvalo: po smazání dřívější varianty nesl dotisk
téže odeslané nabídky jiné číslo, než jaké odešlo.

**Co platí teď.** Číslo je jedno — přípona varianty — a berou ho odsud
dokumenty, zámek, seznamy i server. Nová varianta (klon, alternativa
z archivu, duplikát) dostane příponu podle pořadí: druhá .2, třetí .3.
Po smazání varianty se její číslo znovu nepoužije — další dostane číslo
nad maximem (…555.4 místo uvolněného .3), protože číslo, které jednou
padlo, nesmí patřit jiné nabídce. Název klonu nese totéž číslo
(„Varianta 3" = .3).

**Uložené zakázky.** Při prvním načtení se jednou přečíslují podle pořadí
— tedy na přesně to číslo, které jim dosud tiskly dokumenty. Týká se to
i odeslaných variant: jejich papír nesl číslo podle pořadí. Od té chvíle se
číslo nemění ani po smazání jiné varianty (značka `priponySchema`).
Samotného zámku se migrace nedotkne — `zamek.cislo` je v klíči zámku
a zůstává, jak byl pořízen; lišta zámku ale ukazuje číslo z papíru.

**Server (B56).** Nový zámek nese značku `cisloPapir` (je v klíči zámku,
nedá se sundat) a server u něj hlídá celé číslo včetně přípony —
přečíslovat odeslanou nabídku .2 na .7 obchodník nesmí. U starých zámků se
hlídá jen základ čísla; jinak by migrace sama zablokovala každé uložení
zakázky se starou odeslanou variantou.

**Mez.** Nabídka odeslaná před touto změnou, u níž se mezitím smazala
dřívější varianta, nese na papíře jiné číslo, než jaké jí dává pořadí dnes.
Kolik variant tehdy existovalo, se nikde nezapisovalo — zůstává jí číslo,
které aplikace ukazovala naposledy.

Testy: `test_zamek.js` oddíl #320 (20 kontrol: dokument = zámek u každé
varianty, číslo drží po smazání dřívější varianty, znovunačtení
nepřečísluje, migrace starého zámku bez zásahu do klíče, duplikáty
z v22.9.16 se třemi nulami, značka v klíči), `test_prava.mjs` (10: stará
zakázka se starým zámkem se po migraci uloží, změna základu u starého
zámku i přečíslování přípony u nového se odmítnou, sundaná značka → 409),
`overit_online.mjs` 10e (stará zakázka v prohlížeči: lišta i dokument
nesou .2), `overit_lista.mjs` (klon .2 a nabídka ho vytiskne pod týmž
číslem). Upravena očekávání starého číslování v `test_archiv`, `test_seznam`
a `test_zakazka_duplikace`. Tři nové mutace, serverových mutací je 144.

---

## v22.9.21 — 22. 9. 2026

### Dávka R5 z revize v22.9.9 — testy říkají pravdu o tom, co neověřily

Aplikace se v této dávce nemění; mění se to, co o ní hlásí testy.

**Přeskočený harness už není „prošlo" (T3).** Harness bez firemního
podkladu (wordové šablony, příručka obchodníka) končil kódem 0, takže CI
psalo „OK" a `spust_testy.sh` „✓ prošlo". Souhrn hlásil „všechny prošly",
zatímco pět harnessů — příručka, nabídka PROJ ve Wordu, šablona nabídky,
šablony online a smlouvy — v CI nikdy neběželo. `preskoc()` teď končí
vlastním kódem 4; `spust_testy.sh` ho počítá jako PŘESKOČENO s důvodem
a CI ho vypíše jako „PŘESKOČENO" i jako upozornění v přehledu běhu. Souhrn
místo „159 prošlo" říká „155 prošlo, 6 přeskočeno" a vyjmenuje je.

**Selhání před přeskočením se nezamete (T2).** `overit_sablony_online.mjs`
pouští pět kontrol přísného režimu ještě před hledáním šablony — a když
šablona chyběla (v CI vždy), skončil kódem 0 i se selháním. Harness teď
předává `preskoc()` svůj stav a selhání před přeskočením je selháním
harnessu. Že to dělá každý harness s kontrolou nad přeskočením, hlídá
nová sada.

**Chybějící playwright (T5).** Kód 2 se dosud nepočítal nikam a harness,
který playwright importuje (ESM proměnnou `NODE_PATH` nečte), padal bez
místního `node_modules/playwright` jako selhání s radou „npm i -g
playwright", která mu nepomůže. Obojí je teď přeskočení s radou
„v kořeni: npm i playwright".

**Obnova proměnné v testu (T5).** `test_prava.mjs` po bloku B54 vracel
`ADMIN_EMAIL` přiřazením — u nenastavené proměnné tím zapsal řetězec
„undefined". Nenastavená teď zůstane nenastavená.

Nová sada `src/test_harness_podklady.js` nezkouší text skriptů, ale jejich
chování: spouští skutečné `preskoc()`, skutečný krok z workflow a skutečnou
funkci `spust_prohlizec` nad podstrčenými harnessy s kódy 0, 1, 2, 4
a s chybějícím playwrightem. Nad skripty před opravou 16 selhání z 21.

---

## v22.9.20 — 22. 9. 2026

### Dávka R4 z revize v22.9.9 — server a mutační nástroj

**Výsledek nově odeslané nabídky ověří server (B59).** Oprava B53 chrání
zmrazený výsledek odeslané nabídky PO zamčení, jenže ten výsledek do té doby
pořizoval jedině prohlížeč a server ho při vzniku zámku převzal, jak přišel.
Upravený klient tak mohl zamknout nabídku s jinými čísly, než dávají data
(třeba s větší slevou, než smí schválit), a B53 ji pak chránil jako pravdu.

Server teď výsledek každého NOVÉHO zámku přepočítá tímž jádrem a porovnání
zapíše do zámku jako razítko: shoda / nesouhlasí / neověřeno. Výsledek skládá
jediná funkce `zamekVysledekSpocti` v `zamek.js` — tou ho pořizuje prohlížeč
při tisku i tou ho ověřuje server, aby se dva opisy téhož vzorce časem
nerozešly. Razítko píše výhradně server: u nového zámku ho spočítá, u zámku,
který už v databázi je, ho převezme z uložené verze. Klient ho tedy
nepodvrhne ani nesmaže.

Rozpor uložení **neodmítne** — vědomé rozhodnutí. Papír v tu chvíli už
odešel a odmítnutí by jen nechalo variantu v databázi odemčenou a dál
upravitelnou, což je horší stopa než zámek s rozporem zapsaným natrvalo.
A poctivého obchodníka se stránkou načtenou těsně před nasazením nové verze
by zablokovalo: jeho čísla spočítalo starší jádro a papír nese právě ta.
Rozpor proto hlásí hned hláška po uložení a trvale lišta zámku u každého,
kdo variantu otevře (i se jménem verze, která výsledek spočítala).

Ověřeno v prohlížeči: nabídka zamčená skutečným tiskovým náhledem má
u serveru shodu (po cestě přes síť i přes `importZakazka`), upravený klient
dostane varování a rozpor v liště.

**Mutace na větev role u B56 (T5).** Dosavadní mutace vypínala celou
kontrolu čísla odeslané nabídky; nově se zkouší i to, že by kontrola běžela,
ale nikoho nezastavila. Přibyly čtyři mutace B59. Serverových mutací je 141.

**Přerušený mutační běh vrátí zmutovaný soubor (T5).** V 19. kole zůstal
po přerušení v pracovní kopii rozbitý serverový soubor. `mutace.mjs` teď
na SIGINT, SIGTERM i SIGHUP nejdřív vrátí právě zmutovaný soubor, pak
ukončí běžící sadu, počká na ni (jinak po ní v kontejneru visí zombie)
a skončí kódem 130. Sady se kvůli tomu spouštějí asynchronně — se
synchronním `execFileSync` by se obsluha signálu dostala ke slovu až po
doběhnutí všech mutací. Hlídá to nová sada `netlify/test_mutace.mjs`:
skutečný běh s podstrčenou čekající sadou, oba signály, soubor bajt po
bajtu, žádný visící proces.

---

## v22.9.19 — 22. 9. 2026

### Dávka R3 z revize v22.9.9 — pojistky ceníku

**Značka prázdného ceníku se sundávala sama (N33).** Pravidlo „jediné
nenulové číslo dokazuje skutečné ceny" počítalo s tím, že vynulovaný ceník
má nuly všude. Sestavení ale nese skutečné sazby DPH (zákonné, ne firemní
data) — OCK 12 % a předvolby, PROJ 21 %. Každý ceník tak „měl čísla" a při
otevření zakázky se značka prázdného ceníku sundala; u uzamčené varianty
natrvalo, i s červenou lištou a zábranou tisku nad nulovými cenami. Za
důkaz cen se nově nepočítají sazby a předvolby DPH, přirážka, procenta
a kurz. Test se ptá přímo výchozích ceníků ze sestavení, ne umělé fixtury
s `dph: 0`.

Harness `overit_program` na té chybě nevědomky stál: jeho „ceník projekce
s čísly" byl ve skutečnosti samé nuly se sazbou DPH. Dostal jednu
smyšlenou hodinovou sazbu a přibyl případ ceníku PROJ samých nul se sazbou
DPH, kterému značka zůstat musí.

**Návrat do tuzemska u položky jen pro zahraničí (N38).** Tuzemská řada má
u takové položky nulu, návrat ale dosazoval hodnotu z ČR sloupce ceníku
(změřeno: 50 000 místo 0). Přepočet při dalším otevření pak hlásil „Změnila
se 1 cena", ačkoli se nic nezměnilo. Návrat bere hodnotu ze složené
tuzemské řady — tatáž funkce jako přepočet.

---

## v22.9.18 — 22. 9. 2026

### Dávka R2 z revize v22.9.9 — kde se ztrácela nebo tiše ukládala práce

Všechny čtyři nálezy revize ověřila čtením kódu; tady jsou poprvé
**změřené v prohlížeči** — každý test nad kódem před opravou selže.

**Ruční přihlášení po vypršení relace (N34).** Posluchače „uživatel něco
udělal" sedí na celém dokumentu a přihlašovací okno je v tomtéž dokumentu:
napsání hesla značku nastavilo dřív, než se člověk přihlásil. Poslední
zakázka se pak neotevřela (změřeno: místo ní prázdná zakázka s firemní
přirážkou) a aplikace hlásila neuložené změny, které nikdo neudělal. Oprava
N12/N13 tak platila jen pro F5 se živou relací. Události z přihlašovacího
okna se nově nepočítají; ochrana rozdělané práce zůstává.

**Společné dodatkové texty po nasazení ceníku (N35).** Nasazení platného
ceníku vyměňuje výchozí ceník celý — a texty vlité po přihlášení tím
zmizely, podle toho, který požadavek doběhl dřív; po zveřejnění nového
ceníku pokaždé. Texty se teď vlévají znovu po každé výměně ceníku.

**Duplikace s neuloženými změnami (N36).** Dotaz se ptal jen režimu složky,
který je vypnutý — v online režimu se nepoložil nikdy a duplikace práci
tiše zahodila. Nově se ptá jako otevření jiné zakázky (uložit / zahodit /
zůstat) a od předlohy se odpojí toutéž funkcí jako „Nová zakázka", která
ruší i naplánovaný autosave předchozí zakázky.

**„Vrátit původní ceny" v obnovené záloze (N37).** Větev vrácení prohlásila
zakázku za uloženou — u zálohy z prohlížeče, která na serveru není, tím
autosave i varování při zavření okna ztichly. U zálohy se to už neděje;
u zakázky ze serveru ano (jinak by první klik uložil odmítnuté ceny).

---

## v22.9.17 — 22. 9. 2026

### Dávka R1 z revize v22.9.9 — rychlé opravy

Pořadí dávek schválil J. V. („ano, začni dávkou R1"). Tři z oprav jdou za
mnou: B60 a protokol poznámek vznikly s jediným textovým polem poznámek
(#311), a B63 s tím, že dodatkový text vidí každý (#310).

**Duplikace zakázky (N32 + B60).** Všechny varianty duplikátu dostávaly
příponu 0, tedy v zámku, v seznamu variant i v hláškách tři nabídky pod
holým číslem; test to dokonce zafixoval. Nově přípony podle pořadí (holé
číslo, .1, .2) a nejvyšší přípona odpovídá duplikátu, ne předloze. Duplikát
navíc nesl celé jediné textové pole poznámek — zápisky o jednání s jiným
zákazníkem —, ačkoli dialog tvrdí, že se poznámky nekopírují. Už nenese.

**Dodatkový text v zamčené zakázce (B63).** Pole textu pod položkou se ptalo
jen na zámek varianty. V zakázce jen ke čtení text přijalo a po F5 byl pryč;
v náhledu cizího uživatele by ho administrátor zapsal i na server. Teď ho
hlídá týž obal jako ostatní zápisy (náhled, zámek čtení, zámek varianty).

**Varování u stěny s nulovou plochou (N39).** Tvrdilo, že se čelní stěna
bere ze světlíků — stav před #295. Dnes říká pravý důvod: otvory dveří
a portálů zaberou celou stěnu (nízká šachta s mnoha nástupišti), a totéž
umí i u zadní stěny průchozí šachty.

**Protokol zakázky vidí úpravu poznámky (N41).** Od #311 se poznámka píše do
jediného pole a protokol porovnával jen počty v seznamech — úprava v něm
nebyla vůbec. Zapisuje se, že se poznámka změnila a o kolik znaků, nikdy
obsah. Porovnává se text, který uživatel vidí, takže první uložení pole
u starší zakázky se za změnu nevydává.

**Obnova společných dodatkových textů ze zálohy (B64).** Zapisovala je
doslova; nově projdou toutéž očistou jako běžný zápis (strop délky, počtu
a tvaru). Nová mutace to hlídá, chycená — celkem 136.

**Cenový test režimu po stěnách (T1).** Dosavadní kontrola byla rovnost
z konstrukce a cenu neměřila — proto prošel N31. Nově: na 128 zadáních
(oba modely) se náklad opláštění hýbe stejným směrem jako plocha, a regrese
N31 — u průchozí šachty zaškrtnutí světlíku nad dveřmi v režimu po stěnách
nemění základ čelní ani zadní stěny a cenu nesníží. Ověřeno, že nad jádrem
v22.9.9 sada padá (24 selhání), nad dnešním prochází.

Každá oprava je ověřená i opačně: test nad kódem před opravou selže.

**Mimo R1 se při práci ukázal nový nález, ne k opravě bez rozhodnutí:**
číslo varianty v dokumentu (index v zakázce: druhá varianta „.2") se liší
od čísla v zámku, v hláškách a na serveru (přípona klonu: první klon „.1").
U odeslané nabídky tak zákazník má na papíře jiné číslo, než jaké o ní
aplikace ukazuje. Zapsáno do roadmapy jako #320 s otázkou.

---

## v22.9.16 — 22. 9. 2026

### Vnější lešení je u interiérové šachty zase příplatkem

Pokyn J. V. večer: „vnější lešení vrať do příplatkových položek."

Oprava K1 z odpoledne (v22.9.12) ho u interiérové šachty vyřadila ze
základní ceny **i z příplatků**. Rozhodnutí přitom znělo „primárně
nenabízet" — tedy nedávat do základní ceny, ne zakázat. U interiérové šachty
je teď vnější lešení **vždycky příplatkem**: do základní ceny se tam dostat
nemůže, zákazník si ho ale doobjedná. Cena příplatku je tatáž jako na
exteriérové šachtě (obvod lešení × výška + fixní část). Nabídka u něj tiskne
cenu, specifikace „lze doplnit viz příplatkové ceny" a kapitola IV. dál žádá
lešení po objednateli, dokud si ho neobjedná.

### Technická specifikace se řídí cenou (P8/6 statika, P8/7 lešení)

**Statika:** „statiku nastav tak, ať dokument respektuje to, co je v ceně."
Pole OVĚŘOVACÍ STATICKÝ VÝPOČET KONSTRUKCE mělo pevné „ano" a šlo přepsat na
„ne", zatímco statika v ceně zůstala — a naopak. Nově je **odvozené**: „ano",
když je v Kalkulaci OCK položka STATICKÉ POSOUZENÍ s nenulovým množstvím,
jinak „ne". Na obrazovce je jen ke čtení a říká, kde se statika vypíná
(množstvím 0). Statika zdarma (cena 0, množství nenulové) je pořád „ano" —
dělá se.

**Lešení kolem OCK:** schválený návrh k P8/7 chtěl srovnat specifikaci
i kapitolu IV.; oprava K1 srovnala jen kapitolu. U exteriérové šachty
s lešením v ceně tak dokument tvrdil v jedné sekci „je součástí dodávky"
a v sekci SOUČÁSTÍ DODÁVKY NENÍ „zajistí objednatel". Ten řádek se teď
v tom případě **vynechá** — stejně jako sokl od 16. 9. Mimo tenhle případ
volí text dál obchodník.

**Ruční hodnota se nemaže.** Zůstává v datech a obrazovka ukáže, že se
nepoužije. Vrátí se, kdyby cena přestala rozhodovat.

U odeslané nabídky se znění řídí zmrazeným výsledkem, takže se zpětně
nezmění — kromě případu, kdy ruční text ceně odporoval; takový dokument si
odporoval už při odeslání.

### P8/5 montáž — uzavřeno bez zásahu

„Počet lidí na montáž neřeš." Čtyřka v kódu zůstává. Tím je uzavřených všech
devět voleb P8 (#285).

---

## v22.9.15 — 22. 9. 2026

### Zahraniční zakázka má po přepnutí sazbu DPH 0 %

J. V. ke snímku zahraniční zakázky se sazbou 12 %: „sazba DPH se při
přepnutí na zahraniční ceník nepřepíná na 0 % … to by bylo optimální."

Pole pro zahraniční sazbu DPH přibylo dávkou N18 (v22.9.13), jenže
zveřejněný ceník ho nemá vyplněné a ceník se během testu nemění. Přepnutí
tedy sazbu nechalo tuzemskou. **Prázdná zahraniční sazba DPH teď znamená
0 %**, ne „jako v ČR" — dodávka s montáží do zahraničí se běžně fakturuje
bez české daně. Výslovně zadaná sazba v ceníku má přednost; kdo chce
i v zahraničí českou sazbu, zapíše ji. Návrat zakázky do tuzemska vrátí
tuzemskou sazbu a ruční volba obchodníka se nepřepisuje nikdy (#177).

**Výchozí nula se do ceníku neukládá**, takže nemění jeho otisk ani verzi.
Doplňuje se na třech místech, která musí mluvit stejně: přepnutí varianty,
dnešní ceník pro přepočet při otevření a složení zahraniční řady. Kdyby ji
znalo jen přepnutí, přepočet by prázdné zakázce při příštím otevření vrátil
tuzemskou sazbu.

Nabídka měla u sazby podmínku „do 15 % snížená, jinak základní" a tiskla by
**„DPH 0 % (snížená sazba)"**. Nulová sazba má teď vlastní jméno — nulová,
v angličtině *zero*, v němčině *Null*.

Přepnutí se dál odmítne nad zahraničním ceníkem, který nemá **žádnou
výslovnou** odchylku — samotná výchozí nula k přepnutí nestačí, jinak by se
zakázka tvářila jako zahraniční s tuzemskými cenami.

Zakázky přepnuté do zahraničí před touhle dávkou si svou sazbu nechávají.
Nulu dostanou přepnutím zpět do tuzemska a znovu do zahraničí, nebo výběrem
v hlavičce.

---

## v22.9.14 — 22. 9. 2026

### V zamčené zakázce se uložení nenabízí, odemyká se na jednom místě (N25)

Tohle očekávání se během dvou dnů změnilo dvakrát, a proto stojí za to mít
celý vývoj pohromadě.

Do 21. 9. bylo tlačítko „Uložit zakázku" v zakázce jen ke čtení **mrtvé**:
vypadalo jako tlačítko a kliknutí neudělalo nic. Jediná zmínka o tom, proč,
skončila v kartě Databáze, kam se v tu chvíli nikdo nedívá — uživatel
odcházel s dojmem, že je práce uložená (nález N4).

21. 9. se tedy oživilo a přejmenovalo na „🔒 Odemknout a uložit". Jenže ani
to akci nedokončilo: zůstala hláška o režimu čtení, nic se neuložilo
a otevřel se panel Zakázky online. Uživatel měl před sebou tlačítko, které
slibovalo dvě věci a neudělalo ani jednu (N25).

Rozhodnutí J. V. 22. 9.: **tlačítko u otevřené zakázky nenabízet.** V režimu
čtení se proto nekreslí vůbec a lišta začíná „Načíst zakázku". Odemčení má
jedno místo — lištu zámku nad Kalkulací OCK, Kalkulací PROJ i oběma ceníky,
kde je i důvod, smí-li odemykat jen někdo jiný.

**Zábrana zápisu zůstala v kódu, ne v nedostupnosti prvku.** `zakUlozUI()` se
dál ptá `zamekCteniStop()`: vede sem i automatické ukládání a klávesnice.
Odznak „jen ke čtení" už neposílá na tlačítko, které neexistuje.

### Dialog o přepočtu mluví česky (K5)

Vycházelo z něj „přepočítala se na **nová verze**. **Změnilo se 3** ceny."
Číslo verze se skládalo v 1. pádě a dosazovalo do věty, která žádá 4. pád,
a sloveso bylo napsané jednou pro všechny tvary počtu.

Věta je teď samostatná funkce, takže se dá změřit testem bez otevírání
dialogu a bez vyrábění zakázky s přesným počtem změněných cen. **Nula patří
do tvaru „0 cen"**, ne mezi 2–4; dosavadní podmínka `zmen < 5` to nehlídala.

### N28 — odpověď, ne oprava

Dvě zakázky v ostré databázi nesou uvnitř uloženého ceníku značku zahraniční
řady, ačkoli jejich varianta je česká. **Na výpočet to nemá vliv** (o řadě
rozhoduje `cenikRada`, značka v ceníku je až druhá v pořadí) a klon počítá
správně. **Na zveřejnění ceníku taky ne**, a to dvakrát pojištěně: podklad se
od značek čistí před odesláním a nad tím stojí pojistka, která zveřejnění
zastaví, kdyby se zahraniční ceník vydával za tuzemský.

Rozhodnutí J. V.: **migrace ostré databáze se nedělá** — riziko převyšuje
užitek. U odemčené zakázky značka zmizí sama při nejbližším uložení; u
odeslané je uložený ceník doklad o tom, co odešlo zákazníkovi. Zapsáno do
roadmapy jako #316, v kódu se nemění nic.

---

## v22.9.13 — 22. 9. 2026

### Zahraniční řada ceníku umí i sazbu DPH (N18)

Po přepnutí zakázky na zahraniční ceník naskočila zahraniční globální
přirážka a ceny se přepsaly, ale **sazba DPH zůstala tuzemská**. Zahraniční
nabídka se tiskla v eurech s českou sazbou.

Nebylo to chybějící pravidlo, ale **chybějící pole**. Sazba DPH je sledovaná
ceníková cesta úplně stejně jako globální přirážka, takže mechanismus pro ni
existoval. Administrátor ji ale neměl kam zadat: sloupec „Cena Zahraničí" se
kreslí jen u řádků tabulky a sazba DPH v tabulce není, je to hodnota
hlavičky. Dialog přepnutí přitom sliboval správně, že se sazba přepne, má-li
pro ni ceník odchylku.

Pole je teď v obou cenících, u přirážky. **Nula je platná hodnota**,
přenesená daňová povinnost, a od prázdného pole se liší: prázdné znamená
„jako v ČR". Ověřeno testem, ne čtením kódu, protože přesně tenhle rozdíl se
v pravdivostní podmínce ztratí.

Poznámka u ceníku PROJ tvrdila, že sazby DPH jsou celé společné s OCK.
Společné jsou **předvolby**; vybraná sazba nabídky zůstává projekci vlastní,
a proto má i vlastní zahraniční odchylku.

**Ceník se touhle dávkou nezveřejňuje.** Sazbu do ostrého ceníku zadá J. V.
sám, až bude oprava odsouhlasená.

---

## v22.9.12 — 22. 9. 2026

### Interiérová šachta neplatí lešení, které se u ní nestaví (K1, P8/7)

Rozhodnutí J. V.: „u interiérové šachty vnější lešení primárně nenabízet."

Dělení volitelných položek podle typu šachty v jádře existovalo od začátku,
háky a sokl jen venku, zábradlí jen uvnitř. **Vnější lešení do něj nikdo
nedopsal**, takže ho interiérová zakázka platila v základní ceně. Nově se
u ní nenabízí ani mezi volitelnými, ani mezi příplatky.

Dvě místa se musela srovnat spolu s tím. Nabídka vracela u chybějícího
příplatku vždycky „v základní ceně", což by u interiérové šachty tvrdilo, že
lešení v ceně je, ačkoli v kalkulaci není vůbec; teď rozlišuje **„je
v základní ceně"** od **„u téhle šachty neexistuje"** a v druhém případě
tiskne pomlčku. Technická specifikace u interiérové šachty říká, že lešení
zajistí objednatel, místo dosavadního odkazu na příplatkové ceny.

**Kapitola IV. si přestala odporovat se specifikací.** Žádala po objednateli
zajištění montážního lešení i tehdy, když specifikace u téže zakázky říkala,
že vnější lešení je součástí dodávky. Zákazník si mohl vybrat výklad, který
je pro něj levnější. Odrážka teď zmizí, právě když je lešení v dodávce, a to
ve všech třech jazycích kapitoly.

**Testy:** čtrnáct kontrol, které bez opravy padají. Interiérová zakázka
o položku zlevní a přepínač s ní nehne, exteriérová se nezmění, a to v obou
režimech výpočtu.

---

## v22.9.11 — 22. 9. 2026

### Světlík se počítá k té stěně, na které je nástupiště (#296)

Rozhodnutí J. V.: „zadní světlíky patří pochopitelně na zadní stěnu."

Počet světlíků byl správný, je jich tolik, kolik je nástupišť. Všechny se
ale sčítaly do položky **čelní stěny**, a zadní stěna si svůj pás odečítala,
aby se plocha nepočítala dvakrát. Dvě věci na tom byly špatně. U průchozí
šachty vycházela položka čelní stěny **větší než celá čelní stěna**, na ostré
zakázce 75,16 m² proti 37,9 m². A protože čelní a zadní stěna mají
u exteriérové šachty jiné sklo, počítaly se zadní světlíky **sazbou čelního
skla**.

Nově nese čelní položka jen nástupiště A a pás nad zadními dveřmi je
obyčejné sklo zadní stěny. Od zadní stěny se proto odečítají už jen dveře.

**Celková plocha skla se nemění**, přesouvá se jen podíl mezi stěnami.
Změřeno na zkušební průchozí šachtě 2 plus 2, obojí 71,97 m²:

| šachta | před | po |
|---|---|---|
| exteriérová | 978 000 Kč | 986 000 Kč |
| interiérová | 804 000 Kč | 804 000 Kč |

Exteriérová podražila proto, že zadní sklo je dražší než čelní, a zadní
světlíky se teď počítají tím, čím doopravdy jsou. Interiérová má obě stěny
ze stejného skla, takže se nehne vůbec. Neprůchozí šachty se změna netýká,
nemají nástupiště C.

Zamčené nabídky zůstávají, jak jsou, mají zmrazený výsledek. Rozpracovaná
průchozí exteriérová zakázka se po otevření přepočítá.

---

## v22.9.10 — 22. 9. 2026

### Roadmapa se dá vydat z repozitáře (#312)

Generátor roadmapy v repozitáři nebyl. Žil v pracovní kopii mimo GitHub,
což mělo dva důsledky. Kdo měl po ruce jen repozitář, stránku přegenerovat
neuměl, a roadmapa proto zůstala na **v17.9.2**, zatímco aplikace byla o pět
buildů dál. A prohlížečový harness, který stránku kontroluje, se **od svého
vzniku jen přeskakoval** — třináct kontrol, které nikdy neběžely.

Z vydané stránky ze 16. 9. je nově **šablona**: vyříznutá data nahradila
značka, kam je generátor vkládá. Vzhled a vykreslení se tedy mění v šabloně,
data v JSONu, a obojí je v repozitáři.

```
python3 roadmapa/roadmapa.py --kontrola   # jen pravidla, nic nezapíše
python3 roadmapa/roadmapa.py              # → ROADMAPA.html + ROADMAPA.md
```

**Výstupy se necommitují** (stejný důvod jako u `dist/`): rozcházely by se
se zdrojem a každá dávka by nafoukla diff o půl megabajtu. Sada
`./spust_testy.sh --smoke` i CI si stránku před prohlížečovými harnessy
vyrobí samy, takže `overit_roadmapu.mjs` běží. Prošel napoprvé, 13 kontrol.

Kontrola pravidel je ve skriptu i v Node sadě. Dvě místa schválně: sada
hlídá repozitář v CI, skript hlídá i toho, kdo generuje mimo něj.

---

## v22.9.9 — 22. 9. 2026

### Sazba ATYP se bere vždy z ceníku, drobnosti v poznámkách, roadmapa (#298)

**#298 je rozhodnuté a zavedené.** Hlášený rozdíl 5 versus 6 hodin nevznikal
jiným vzorcem, ale jiným zdrojem sazby: zaškrtnutí ATYP sáhlo při chybějící
sazbě po náhradě ze sestavení, kdežto přepočet na platný ceník hodiny nechal,
jak byly. Rozhodnutí J. V.: sazba se bere vždy z ceníku, ať se ATYP spustí
automaticky nebo ručně, a co si obchodník přepíše, je jeho věc.

Obě cesty teď čtou touž hodnotu týmž způsobem. **Když ceník sazbu má, a to je
normální stav, dávají obě totéž** a rozdíl nemá jak vzniknout. Ruční přepis
zůstává nedotčený a uzamčené ani kvitované varianty se do přepočtu vůbec
nedostanou, takže odeslanými nabídkami to nehne.

**Interní poznámky v Kalkulaci PROJ dostaly ovládání sekce** (zobrazit,
srolovat, skrýt) stejně jako v Kalkulaci OCK. Vysvětlivka pod polem se
zkrátila na to podstatné: karta se netiskne.

**Roadmapa doplněna ke stavu v22.9.9.** Chyběly v ní položky **#267**
(dodatkový text místo množství v nabídce, v18.9.1) a **#268** (opláštění po
stěnách ve třech krocích, v18.9.2 až v21.9.4) — čísla padla v commitech
z 18. a 21. 9., ale záznam v pořadníku k nim nikdo nezaložil. Doplněny
z commitů, ne z odhadu. Pořadník končil 17. 9.; přibyly dávky z 18., 21.
a 22. 9. a hlavička je na dnešku.

---

## v22.9.8 — 22. 9. 2026

### Dodatkové texty zůstávají v aplikaci, zápisník je jedno pole (#310, #311)

**Dodatkový text pod položkou teď platí pro celou firmu (#310).** Od #267
se text píše do ceníku, jenže ceník se **zveřejňuje** — vydat kvůli jedné
větě novou verzi ceníku znamená novou verzi pro všechny budoucí nabídky.
Nikdo to nedělal, takže text zůstal v zakázce toho, kdo ho napsal, a nikdo
jiný ho neviděl. Pole navíc viděl jedině administrátor.

Nově jsou dvě úrovně, přesně podle zadání:

- **Aplikace.** Co napíše administrátor, se uloží na server a od příštího
  přihlášení se předvyplňuje všem. Zveřejněný ceník má přednost: kdyby ho
  společná mapa přebíjela, správce by změnu ve vydané verzi nikdy
  neprosadil.
- **Zakázka.** Pole vidí a upraví každý, ale jeho změna platí jen pro jeho
  nabídku. Výchozí text tím nikdo nepřepíše nedopatřením.

Odeslané nabídky se tím nemění. Zakázka si nese vlastní kopii ceníku, takže
pozdější úprava textu nesahá na to, co už zákazník dostal.

Texty putují i do **zálohy a obnovy**. Nový klíč, který záloha nenese, by
obnova tiše smazala — přesně kvůli tomu vznikl nález B9.

**Interní poznámky jsou jedno textové pole (#311).** Z karty zmizely štítky
druhu poznámky, zápisník jednotlivých záznamů i nahrávání příloh. V provozu
se zápisník používal jako jeden odstavec pod druhým, takže druh, autor a čas
u každé věty byly režie navíc; přílohy se navíc nosily přímo v souboru
zakázky a nafukovaly ho na hranici odeslatelnosti e-mailem.

**Nic se nesmazalo.** Model umí dál všechno, co uměl. Starší zakázky se
svými záznamy se v poli ukážou jako předvyplněný text a přílohy, které v nich
už jsou, jdou pořád stáhnout — jen nové přibývat nemůžou. Čtení přitom
zakázku nemění: kdyby se pole materializovalo při vykreslení, zakázka by se
sama označila za neuloženou, což je táž past jako u dnešních nálezů N12/N13.

**Karta se přestěhovala nahoru** — v Kalkulaci OCK mezi souhrn zakázky
a Zadání šachty, v Kalkulaci PROJ mezi souhrn a Cenovou kalkulaci PROJ.
Dosud stála úplně dole pod Detailem mezivýpočtů, kam obchodník musel projet
celou kalkulaci. Je to **jeden zápisník zakázky**, ne dva: co se napíše
v OCK, je vidět i v PROJ.

**Testy:** sedm serverových k novým textům a pět k úplnosti zálohy,
jedenáct modelových k očistě a přednosti ceníku, deset k textovému poli
a pět ke stavu obrazovky. Prohlížečový harness ověřuje obě nové polohy karty
i to, že se text nedostane do žádného dokumentu. Dvě nové mutace, celkem 135.

---

## v22.9.7 — 22. 9. 2026

### Mutace se teď kontrolují za vteřinu, ne za sedmnáct minut (#309)

**Co se stalo.** Dávka 4 změnila dva řádky, na které mířily starší mutace.
Mutace se tím staly nespustitelnými — jejich hledaný úsek se v kódu už
nenašel. Sady i harnessy v CI byly zelené, mutační job červený, a to až
po sedmnácti minutách běhu.

Je to chyba v **zadání mutace**, ne v kódu. Obě mutace jsou srovnané a obě
znovu ověřené jednotlivě: chytají se.

**Oprava u kořene.** Mutační skript umí `--kontrola`: projde všechna zadání
a ověří, že každé najde svůj úsek právě jednou. Nespustí přitom ani jednu
testovou sadu, takže je hotov za vteřinu. Běží nově v CI jako krok **před**
plným během a taky v běžné sadě `./spust_testy.sh` — tedy dřív, než se
vůbec dá pushnout.

Celý mutační běh po opravě: **131 ze 131 chycených**, žádné chybné zadání.
Mezi nimi všechny čtyři dnešní: zmrazený výsledek (B53), ADMIN_EMAIL (B54),
odchylky ceníku (B55) i číslo odeslané nabídky (B56).

---

## v22.9.6 — 22. 9. 2026

### Dávka 5: drobnosti, na kterých ale stojí důvěra v běh (#307, #308)

**Repozitář dostal `package-lock.json` (B11).** Jediná závislost byla
zapsaná rozsahem, takže si každé sestavení na Netlify mohlo vzít jinou
verzi, aniž by se v repozitáři cokoli změnilo. Zámek se generoval v čistém
adresáři: na místě by do něj `npm` zapsal i symbolické odkazy na globální
playwright z tohohle prostředí a jinde by pak `npm ci` spadl.

**Pravidla pořadníku teď kontroluje Node sada (N18).** `roadmap.json` je
jediný zdroj pravdy o tom, co je hotové, ale jeho pravidla hlídal jedině
generátor, který v repozitáři není. Dnes se soubor rozbil dvakrát a pokaždé
se to našlo ručně. Nová sada ověřuje přesně to, co vypisuje README
v roadmapě — nic navíc, aby nebyla přísnější než dohoda.

První běh rovnou našel položku **#295** ve stavu „hotovo", která si držela
„čeká na J. V.". Odpověď z dnešního rána je teď zapsaná přímo u ní, čekání
je pryč.

**Popisky tří bloků v matici práv nesly čísla, která už patří jinému
auditu.** Testy z 23. 8. se jmenovaly stejně jako nálezy z 9. 9.
Přeznačeny na řadu L, jak je to od začátku v souboru mutací.

**Návod ke zdrojákům popisoval dva prohlížečové testy, ne třicet sedm.**
Sekce dopsaná podle skutečného stavu: co harnessy pokrývají, že se pouštějí
globem (a proč), které se bez firemních podkladů přeskočí a co k tomu
potřebují za prostředí.

**N14 se sem nevrací** — vyřešila ji už dávka 2: nebyla to chyba kódu, ale
zastaralé očekávání testu.

---

## v22.9.5 — 22. 9. 2026

### Dávka 4: tři serverové pojistky (#304, #305, #306)

Společné všem třem: pravidlo existovalo, ale server ho neuplatňoval — hlídal
ho prohlížeč, nastavení webu nebo obsah požadavku.

**Prázdná `ADMIN_EMAIL` tiše vypnula ochrany hlavního účtu (B54).** Všechny
jsou psané jako „e-mail se rovná hlavnímu"; proti prázdné hodnotě se
nerovná žádná skutečná adresa. Vedlejší správce tedy směl hlavnímu účtu
změnit roli, vypnout ho, smazat ho, resetovat heslo i přepsat podpis — a
nikde se nic neozvalo. Že to hlásí kontrola zdraví, je málo: hlášení si
někdo musí přečíst, kdežto oslabení platí hned. **Tahle větev v testech
nikdy neběžela**, protože CI i mutační běh proměnnou vždycky dosadí.

Nově se chráněné cesty neobsluhují (503 — chyba není u volajícího, ale
v nastavení webu): správa uživatelů a obnova ze zálohy. **Přihlášení
a změna vlastního hesla zůstávají funkční schválně** — bez nich by se
závada nedala opravit zevnitř.

**Pojistku zveřejnění ceníku šlo vypnout vynecháním pole (B55).** Shoda ČR
ceny se zahraniční odchylkou se porovnávala výhradně proti odchylkám
z téhož požadavku. Stačilo je neposlat a pojistka mlčky vypadla — přitom
takový podklad je nejpodezřelejší. Server přitom uložené odchylky zná
vždycky a prohlížeč proti nim porovnával odjakživa.

Porovnává se proti sloučení uložených a příchozích. Samotné sloučení by ale
**umělo ceník zamknout**: kdo ruší víc než pět odchylek naráz, by neprošel,
protože se pořád porovnává proti tomu, co ruší. Proto se nepočítá položka,
jejíž ČR cena se tímhle zveřejněním nemění — taková z přepnuté varianty
pocházet nemůže, v ceníku je už dnes.

**Číslo odeslané nabídky hlídal jen prohlížeč (B56).** Server u něj
kontroloval jen délku. U čísla je to zákeřné: číslo určuje jméno souboru,
takže se změněným číslem spadne zakázka pod jiné jméno, uložená verze
k porovnání neexistuje a **všechny kontroly zámku se přeskočí**. Odeslaná
nabídka tak mohla dostat jiné číslo, než jaké má zákazník na papíře.

Pozná se to ze zámku samotného — drží si číslo z okamžiku odeslání — takže
kontrola funguje i tam, kde není s čím porovnávat. Neshoda: administrátor
smí (rozhodnutí z 15. 9.), ostatním se to odmítne. Zámky pořízené dřív
razítko čísla nemají a přeskakují se.

**Mez, kterou to nezavře:** kdo si upraví klienta, přepíše číslo i razítko
najednou. Výsledek je ale nová zakázka pod novým jménem a původní soubor
zůstává nedotčený, takže se stopa neztrácí.

**Testy:** devět kontrol k B54, třináct k B55 (osm modelových, pět
serverových přes skutečnou cestu) a sedm k B56. U všech tří ověřeno, že bez
opravy padají. Tři nové mutace, celkem 133.

---

## v22.9.4 — 22. 9. 2026

### Dávka 3: čísla už odeslané nabídky šlo přepsat beze stopy (#303)

Jediný **vysoký** nález bezpečnostního auditu. Od 15. 9. si zámek varianty
ukládá **celý výsledek výpočtu** a všechny dokumenty i přehledy berou částky
odtud. Otisk zámku ho ale nezahrnoval.

Dvě varianty lišící se **pouze** ve zmrazeném výsledku měly tedy shodný
klíč, kontrola zámku vrátila „v pořádku" a serverová pojistka porovnávala
jen `data` — ta jsou shodná. Razítko „kdo" se u existujícího zámku záměrně
přeskakuje, takže se nezměnilo ani ono.

**Cesta zneužití:** obchodník si stáhne vlastní zakázku, v JSONu změní
jedině `varianty[i].zamek.vysledek.ock` a pošle ji zpět. Od té chvíle tisk
téže „neměnné" nabídky, krycí list i celý přehled ukazují jiné peníze, než
jaké dostal zákazník — **bez jediné stopy**, protože `tisky[]` ani
`odemceni[]` nepřibudou. Táž mezera byla v obnově ze zálohy.

Změřeno před opravou: cena v zámku **912 000 → 1**, klíč zámku **shodný**,
kontrola v pořádku, `data` shodná.

Do klíče zámku proto přibyl **celý zmrazený výsledek**. První verze opravy
tam dávala jen krátký otisk (FNV‑1a, 32 bitů), aby se nepracovalo s 25 kB
na variantu — jenže FNV není kryptografická funkce a její kód je v každé
vydané stránce, takže kdo chce částky přepsat, dopočítá si k nim výplň se
shodným otiskem. U kontroly, která má hlídat podvrh, je to málo. Přesné
porovnání skulinu nemá a je to totéž, čím se o řádek vedle porovnávají
`data` uzamčené varianty. Zaplatí se to jen při ukládání, ne při
vykreslování, a celá zakázka se u téhož uložení stejně serializuje.

**Obě cesty jsou pokryté naráz** — ukládání i obnova volají tutéž kontrolu,
takže stačilo opravit klíč. **Starší zakázky se nerozbily:** klíč se skládá
čerstvě pro obě strany porovnání, takže zámek bez zmrazeného výsledku dává
null proti null. Ověřeno vlastní kontrolou.

Pět serverových kontrol včetně pojistky proti prázdnému testu (podvrh se smí
lišit **výhradně** ve zmrazeném výsledku, jinak by ho zastavila jiná
kontrola a test by neměřil B53). Ověřeno, že bez opravy dvě z nich padají.
Plus mutace „zmrazený výsledek se bere, jak přijde".

---

## v22.9.3 — 22. 9. 2026

### Dávka 2: po F5 se ztrácela rozdělaná práce (#301, #302)

**N12 a N13 byla jedna chyba se dvěma projevy.** Po obnovení stránky se
vracel prázdný formulář, ačkoli zakázka ležela na serveru — a s ní se
„ztrácela" ruční přirážka 40 %, kterou obchodník viděl přepsanou na
firemních 0,42.

Návrat k poslední zakázce se ptal, jestli se zakázka liší od otisku
pořízeného **při startu stránky**. Jenže mezi startem a tím dotazem proběhne
přihlášení, a to do čerstvé zakázky samo nasype **platný ceník** a **matici
zobrazení**. Zakázka se tím od otisku liší vždycky — takže se návrat
neprovedl **nikdy**.

Změřeno po refreshi: rozdíl proti otisku byl `marze` 0 → 0,42,
`montazHodKc` 0 → 1234, zmizely značky `ukazkove`/`prazdny` a přibylo
`cenikRazitko`. Ani jedné z těch změn se uživatel nedotkl.

**Přirážka se přitom nikdy neztratila** — ověřeno dotazem na server, kde
ležela správně i se značkou „nastavil jsem si ji sám". Jen se k té zakázce
nikdo nevrátil.

**Táž příčina byla i o úroveň níž — a projevila se jako nestabilita.**
Otevření zakázky se na totéž ptá taky a otevře nad tím **dialog** „máte
neuložené změny". Obě automatické synchronizace přitom běží v jednom
`Promise.all`, takže záleželo na jejich pořadí: sada padala zhruba **jednou
ze tří**. To je nejhorší druh chyby — takovému testu lidé přestanou věřit.

Opraveno u kořene: ptáme se `ONLINE_STAV.zmenaUzivatele` místo otisku,
a otisk se srovnává až **po všech načteních**, takže na pořadí nezáleží.
Ověřeno pěti běhy po sobě. Ten
příznak je v souboru odjakživa a nastavují ho posluchače na `input`,
`change` a klik — tedy **události od člověka**, schválně ne `set()`, protože
„zakázkou hýbe i sama aplikace". Táž věta platí i pro návrat k zakázce.
Ochrana rozdělané práce zůstává: kdo do formuláře sáhl nebo si kliknutím
obnovil zálohu, má příznak nastavený.

**N14 nebyla chyba, ale zastaralé očekávání testu.** Kód se chová přesně
tak, jak to 21. 9. vědomě zavedla dávka P2: značka „ukázkový / prázdný
ceník" se smí srovnat i u uzamčené varianty, ale **jen když jí obsah
odporuje** — u opravdu prázdného ceníku zůstane. Test přepsán na skutečné
pravidlo a měří teď i to, co starou kontrolu znepokojovalo: že se ceny
uzamčené varianty nezmění a že se doklad o prázdném ceníku nepřepisuje.

---

## v22.9.2 — 22. 9. 2026

### Dávka 1: harnessy, které nikde neběžely (#299, #300)

**Dva harnessy od 14. 9. vůbec nenastartovaly.** `overit_sod.mjs`
a `overit_nabidka_proj_word.mjs` končily hned při načtení chybou
*Cannot access 'KOREN' before initialization* — `const KOREN` stálo až pod
prvním použitím. `import` se vytahuje nahoru sám, `const` ne. **Sedm kontrol
smluv o dílo a plné moci tím osm dní neběželo nikde**, ani lokálně, ani
v CI, protože v CI tyhle sady nebyly. Změřeno před opravou: oba skončily
kódem 1.

**Ani po opravě by se ale nespustily** — wordové šablony mají napevno cestu
z cizího prostředí. Vznikl proto `nastroje/harness_podklady.mjs`: podklady
mimo repozitář se hledají i v adresáři z proměnné `KNG_PODKLADY`, a když
nejsou, harness se přeskočí **s vysvětlením** a kódem 0.

Táž vada byla ve čtyřech dalších a dvě z nich by **shodily CI**:
`overit_manual.mjs` padal na ENOENT nad neexistující složkou,
`overit_sablony_online.mjs` četl šablonu bez kontroly, takže padal uprostřed
běhu po polovině kontrol. `overit_roadmapu.mjs` mířil na cizí `file://`
cestu. A `overit_sablona.mjs` hledal výhradně šablonu CN **v7, která už
neexistuje** — bere se nejdřív v8 a vypisuje se, která to byla; „prošlo" nad
starou šablonou totiž nejde odlišit od ověření.

**CI pouštělo 10 harnessů z 37 — nově všechny.** Právě ve zbylých dvaceti
sedmi vyšly nálezy N12, N13 a N14. Jádro opravy ale není *doplnit seznam*,
nýbrž **zrušit ho**: týž příběh se odehrál už 21. 9., kdy se dva ruční
seznamy srovnaly — a zůstaly ruční. Harnessy se proto berou **globem**, a to
v `spust_testy.sh --smoke` i ve workflow. Nový soubor je v sadě sám od sebe.

Job „harnessy" je pouští v jednom kroku se `::group::` na soubor, takže se
**pokračuje i po prvním selhání** a v logu je vidět všechno rozbité najednou.
Limit zvednut na 45 minut. Job „testy" si nechává jen kouřový test.

---

## v22.9.1 — 22. 9. 2026

### P11: rozdíl 5 vs 6 hodin u ATYP pojmenován a zajištěn testem (#298)

Vzorec je v obou cestách **týž**. Liší se **zdroj sazby**:

- **zaškrtnutí ATYP** (ruční i automatické) vezme sazbu z ceníku, a když ji
  ceník nemá, použije **náhradu ze sestavení**;
- **přepočet na platný ceník** při otevření zakázky vrátí u chybějící sazby
  `null` a hodiny **vůbec nepřepočítá**.

Jedna cesta tedy má záchrannou hodnotu a druhá ne. Změřená citlivost
zaokrouhlení (základ 24 h, hodiny navíc −3,25): sazba 0,30 → **6 h**,
sazba 0,25 → **5 h**. Hlášený rozdíl vznikne i při nezměněné geometrii.

**Nesjednotil jsem to** — dát přepočtu tutéž náhradu znamená začít
přepočítávat tam, kde se dosud nepřepočítávalo, a to hne cenou existujících
zakázek. Čeká na rozhodnutí. Rozdíl mezi cestami teď drží test, aby se
nezměnil nikým nepozorovaně.

`README_ZDROJAKY.md` přestal psát číslo verze natvrdo — stálo v něm
„v7.9.2", zatímco archiv byl o víc než sto dávek dál.

---

## v21.9.18 — 21. 9. 2026

### Rozhodnutí J. V.: plocha čelní stěny a překlad platebních podmínek (#295, #283)

**Čelní stěna se v režimu po stěnách počítá jako celá stěna mínus otvory
dveří a portálů.** Varianta (b) z #295. Vzorec není nový — přesně tak se už
počítá zadní stěna u průchozí šachty, takže obě strany s nástupišti se teď
počítají stejně. `sirkaDveri` už obsahuje rámy, takže „dveře a portály" jsou
v jednom čísle. **Standardní režim se tím nemění ani o haléř** — je to
samostatný základ, který platí jen v režimu po stěnách.

Tím padla dosavadní podmínka, že zapnutí režimu nesmí hnout cenou. **A hnula
oběma směry, což stojí za pozornost:**

- šachta **bez světlíků** → čelní stěna dosud vycházela na **0 m²**, teď má
  plochu, takže cena jde **nahoru** (to byl původní nález);
- **průchozí** šachta → cena jde **dolů**, změřeno −92 000 Kč u 16 z 32
  zkušebních zadání.

Ten druhý případ má vlastní příčinu: `svetlikM2` počítá světlíky ze **všech**
nástupišť včetně zadních, takže u průchozí šachty vyjde plocha světlíků
**větší než celá stěna** — změřeno 75,16 m² proti 37,9 m² skutečné stěny. Je
to táž vada předlohy, kvůli které umí ta plocha vyjít i záporně (nález N14).
Režim po stěnách ji nově nedědí; ve standardu zůstává. **Jestli se má opravit
i tam, je otázka — #296.**

**Do zahraničních nabídek se platební podmínky tisknou přeložené (#283).**
Kapitola III. brala hodnoty z krycího listu a ty šly slovníkem beze změny,
takže anglická nabídka měla nadpisy anglicky a hodnoty česky. Přeložila se
konečná sada předvyplněných hodnot — zálohy, dílčí i konečná faktura,
platnost nabídky, způsob fakturace, limit i sazby pokut. **Co obchodník
napíše ručně, projde beze změny**; vymýšlet překlad cizí věty se nesmí.

Zapsána dvě rozhodnutí bez zásahu do kódu: **terče a lišty** se zatím na typ
opláštění vázat nebudou (#287) a **sazba plechů pro interiérovou šachtu**
zůstává — je to aktualizace, ne zbytek po poškozeném ceníku (#297). Ověřeno
měřením, že **interiérová šachta se netmelí** — aplikace to tak už dělá.

---

## v21.9.17 — 21. 9. 2026

### Čelní stěna se v režimu po stěnách počítala za nulu (#294)

Nález J. V. ze snímku: stěna A vyšla na **3,36 m²**, zatímco B, C i D přes
38 m². Změřeno a potvrzeno — a příčina je horší, než vypadá.

Plocha se v režimu po stěnách bere z dosavadního výpočtu a pásy si ji dělí
poměrem výšek, aby zapnutí režimu nehnulo cenou. **U čelní stěny je ale tou
dosavadní plochou jen světlík nad dveřmi a po stranách** — zbytek zabírají
dveře a portály. Šachta bez světlíků má tedy plochu čelní stěny **nulovou**:
obchodník si vybere sklo přes celou stěnu, nákres mu ji vybarví celou,
specifikace ji zákazníkovi slíbí — a v ceně nebude ani koruna. Těch 3,36 m²
byla jen část pod úrovní nástupiště, tedy prohlubeň.

Změřeno: šachta bez světlíků, stěna A celá ze skla od −2 m do 23 m → **0 m²
nad nulou**, stěny B, C a D přes 40 m² každá.

**Obrazovka to teď řekne.** Varování pojmenuje, že se z té stěny do ceny
nedostane nic, a proč. Hlásí se až naposled — chybějící dělicí výška nebo
„jiné" bez sazby jsou konkrétní chyby, se kterými obchodník něco udělá hned,
kdežto tohle je vlastnost výpočtu, kterou sám nespraví.

**Čím plochu čelní stěny nahradit, je obchodní rozhodnutí** (kolik z ní
ukrojí dveře a portály), ne otázka pro kód — zapsáno jako **#295**. Dokud
nepadne, musí být aspoň vidět.

Při té příležitosti ověřeno měřením v prohlížeči, že **P12** (nová varianta
v režimu jen ke čtení nabídne odemčení místo mlčení) a **P15** (nová zakázka
shodí zámek čtení i vazbu na soubor) jsou hotové. P15 má nově test na řetěz,
na kterém stojí.

---

## v21.9.16 — 21. 9. 2026

### Opláštění: pořadí řádků, popisky — a místo, kde zadání přežije (#293)

**„Opláštění začíná" se přesunulo pod „+ přidat pás".** Je to spodní hrana
opláštění, takže nad pásy působilo, že se sloupec čte zdola nahoru a pak
zase shora dolů — a šel proti nákresu vedle sebe. Tlačítko zůstává hned pod
pásy, protože se týká jich.

**Popisky bez pomlčky, velkým písmenem:** `Pás 1` místo `— pás 1`. Totéž
u můstku (`Hloubka můstku`, `Šířka můstku`). Pomlčku dál nese jen
`— (jen exteriérová šachta)` u lemování — tam není popisek, ale hodnota ve
smyslu „neuplatní se".

**A hlavně: vzniklo `podklady/`.** Vizuál opláštění se dnes ztratil proto, že
byl popsaný jen v chatu — a chat se u dlouhého sezení shrnuje, takže zadání,
které žije jen tam, zanikne zákonitě. Co leží v repozitáři, se naopak čte
znovu na začátku každé práce. `podklady/OBRAZOVKA_OPLASTENI.md` je teď
závazný popis té obrazovky; `podklady/README.md` říká, kam co ukládat.

Dokument sám ale nestačí — **pojistkou je test.** `overit_oplasteni.mjs`
nově měří pořadí řádků i tvar popisků a je ověřeno, že při návratu ke staré
podobě spadne.

---

## v21.9.15 — 21. 9. 2026

### Pojistka, která se dá tiše vypnout, potřebuje vlastní test (#292)

Oprava z v21.9.13 — zveřejnění nesmí umazat ČR hodnotu, ze které dědí
zahraniční řada — sedí v `programZaznam` za `typeof` strážemi. **V prohlížeči
jsou ta jména globální vždycky, na serveru je skládá `jadro_moduly.cjs`:**
kdyby tam někdo změnil pořadí načítání nebo modul vynechal, stráž by prošla
a oprava by se **tiše vypnula**. Jádro by mělo dál zelené testy a chyba by
se vrátila jen serverovou cestou.

Ověřeno proti skutečné serverové funkci `/api/program`, že tou cestou
oprava opravdu platí (dosud to bylo jen doložené na jádře, ne na serveru),
a doplněna mutace — takže je ověřené i to, že by testy odstranění té
pojistky poznaly. Že test umí selhat, jsem změřil: s vypnutou opravou
padají dvě kontroly.

---

## v21.9.14 — 21. 9. 2026

### Hláška, která tvrdila nepravdu — a test, který ji nechytil (#291)

Dialog o přepočtu odmítne vrátit původní ceny, když se zakázka mezi
dotazem a odpovědí vymění. Odmítnout je správně, ale vysvětlení bylo
špatné: **stejná věta se ukazovala i uživateli, který si jen vzal krok
Zpět.** „Zpět" dosadí jiný objekt téže zakázky, takže se do téhle větve
dostane taky — a věta „Mezitím se otevřela jiná zakázka. Otevřete tu
původní znovu" mu tvrdí nepravdu a radí něco, co mu nepomůže. Dva různé
důvody teď mají dvě různé věty; odmítnutí platí v obou (vrácení snímku by
ten krok zpět tiše zahodilo).

**Kontrola v harnessu tu chybu nemohla odhalit, protože ji sama měla.** Za
„cizí zakázku" vydávala re-import **téže** zakázky — případ opravdu jiné
zakázky se tedy neměřil vůbec. Rozdělena na oba případy: jiné číslo → jiná
zakázka, stejné číslo → změnila se.

Nalezl závěrečný běh revize; zpřístupnila to dnešní oprava, která dialog
zavedla i k obnově zálohy z prohlížeče.

---

## v21.9.13 — 21. 9. 2026

### Třetí kolo revize — a regrese, kterou zavedla dnešní oprava (#290)

Revize dnešních oprav našla pět věcí. **Jednu z nich jsem zavedl dnes já,
a stála by obchodníka rozhodnutí podle čísla, které není pravda.**

**Dopad přepočtu na cenu počítal projekci i tam, kde se projekce nenabízí.**
Zakázka může být jen OCK, jen PROJ, nebo obojí. Ranní oprava přičítala
projekci vždy, takže každá zakázka „jen OCK" nesla fantomovou cenu projekce
z výchozího zadání. Horší než nafouknutá částka je ale druhý následek:
kdyby nová verze ceníku hnula **jen sazbou projektanta**, dialog by
u čistě ocelářské nabídky hlásil pohyb ceny, který se nestal — změřeno
**160 961 Kč při nezměněné nabízené ceně**. Obchodník by podle toho klikl
„Vrátit původní ceny" a vrátil si zastaralý ceník kvůli změně, která se ho
netýká. Počítá se teď jen strana, která jde do nabídky. Ve stejném místě:
když výpočet spadne, nezůstane v součtu půlka varianty (dřív vycházelo
`cena` z varianty hlášené jako chyba).

**Kopie zakázky dědila schválenou slevu i s razítkem schvalovatele.** Táž
úvaha jako u kvitance, ale s tvrdšími následky — změřeno na obou koncích:
obchodník duplikát **vůbec neuloží** (server vidí rozhodnutí jako nové a
odmítne ho, aniž by aplikace řekla proč), a vedoucí, který ho uloží, se
stane schvalovatelem slevy, kterou nikdy neviděl. Procenta a poznámka
zůstávají, zahazuje se jen rozhodnutí — nic se tiše neuplatní ani neztratí.

**Kopie dědila i číslo nabídky PROJ** (řada OVP). Je to identifikátor jiného
dokumentu a kontrola duplicit ho neodhalí — porovnává jen stranu OCK. Dvě
zakázky tak vystupovaly navenek pod týmž číslem.

**Zveřejnění ceníku umělo umazat cenu, která se dědí do zahraničí.**
Zahraniční řada je řídká tabulka odchylek: co v ní není, dědí se z ČR
sloupce. Varianta vedená v řadě ČR má ale takovou položku záměrně na nule —
a zveřejnění z ní tu nulu zapsalo do platného ceníku. Dokud odchylka
existuje, nepozná se nic; jakmile ji správce zruší v dobré víře, že se
hodnota zdědí, **zdědí se nula**. Opravit to v editoru nejde: ČR pole je
zašedlé „neplatí v ČR". Zveřejnění proto tu hodnotu přebírá z dosud platné
verze. Změna přes tabulku odchylek funguje dál.

**Obnova zálohy z prohlížeče se teď ptá stejně jako otevření ze složky.**
Dialog o přepočtu (#284) u ní chyběl — a přitom je to táž situace, spíš
horší: záloha mohla ležet od minulého ceníku.

Dva testy navíc byly prázdné a nic neměřily — kontrola „projekce se do
součtu započítá" procházela i bez projekce a „zahraniční řada cenu drží"
si hodnotu dosazovala ručně, takže skutečné zveřejnění jí neprocházelo.
Obojí přepsáno tak, aby měřilo.

---

## v21.9.12 — 21. 9. 2026

### Červené CI tří dávek za sebou — kontrola hledala slovo, ne protokol (#289)

Lokálně bylo zeleno, v CI červeno. **`./spust_testy.sh --smoke` pouštěl
jinou sadu prohlížečových harnessů než CI** — šest jich lokálně nikdy
neběželo. Tři dávky tak odešly s červeným CI, aniž by o tom kdokoli věděl.

Padalo `overit_lista.mjs`, kontrola „protokol se do dokumentů nedostane".
Ta procházela sestavená data výrazem `/protokol/i` — a **dnešní kapitola
V. TERMÍNY REALIZACE mluví v němčině o „Protokolle der Schachttüren"**,
tedy o předávacích protokolech šachetních dveří. Se záznamem o změnách to
nemá nic společného; kontrola padala na vlastním textu nabídky. Jediná
cesta, jak ji „spravit" beze změny kontroly, by byla přepsat větu, kterou
dostane zákazník.

**Žádná data neunikla** — ověřeno měřením: v dokumentech není klíč
`"protokol"`, není tam `protokolKlic` zakázky ani id jediného záznamu.

Kontrola teď hledá to, co ven opravdu nesmí: klíč struktury, klíč
protokolu, id záznamů a texty záznamů. Že umí selhat, je ověřeno — po
vložení id záznamu do textu kontrola zabere. Přibyla u ní pojistka proti
prázdnému měření (musí existovat aspoň jeden citlivý záznam). *Poctivá mez:
hodnoty kratší než čtyři znaky se nehledají — dvojciferná sazba se
v dokumentu plném čísel neodliší od běžného údaje.*

**A hlavně: `--smoke` teď pouští přesně to, co CI.** Seznam je v obou
souborech záměrně shodný a je to u něj napsané.

---

## v21.9.11 — 21. 9. 2026

### Druhé kolo nezávislé revize — sedm nálezů (#288)

Revize pokračovala i na dávkách v21.9.8–v21.9.10. Sedm nálezů: **dvě braly
peníze z ceny, jedna mohla přepsat cizí zakázku.**

**Položka „jen zahraniční" mizela z ceny OBOU řad.** Zahraniční ceník je
**řídká tabulka odchylek** — co v ní není, dědí se z českého sloupce.
Zveřejnění ale nulovalo český sloupec u každé takové položky bez ohledu na
to, jestli odchylka existuje. Změřeno: bez odchylky vyjde `cr → 0` a
zveřejněný ceník pak dá i `zahr → 0`. Nově se nuluje jen tam, kde
zahraniční cena opravdu je. *Očekávání v `test_jen_zahranicni.js` se proto
změnilo — dřív se nulování vyžadovalo vždy; to bylo špatně.*

**Dialog přepočtu mohl obnovit zálohu do jiné zakázky.** Volba „vrátit
zálohu" se držela v modulové proměnné, takže mezi otevřením dialogu a
kliknutím stačilo přepnout zakázku a záloha se zapsala jinam. Identita
zakázky i zálohy se teď zachytí **před** čekáním na odpověď a při neshodě
se obnova odmítne s hláškou. `importZakazka` je navíc v try/catch — dřív
by selhání zůstalo tiché.

**Dialog tvrdil „na celkovou cenu to nemělo vliv" i tam, kde měl.** Součet
dopadu počítal jen OCK, přestože přepočet mění i ceník projekce. U zakázky,
kde se hnula jen PROJ, dostal obchodník falešné ujištění — a to je horší
než mlčení.

**Kopie zakázky si brala protokol a kvitanci ceníku originálu.** Vypadala
tak, že u ní někdo odsouhlasil ceník a že má za sebou historii, kterou
nemá. Duplikace teď protokol i kvitanci zahazuje.

**Jazykové symboly kapitol nesly do Wordu značku `{FIRMA}`.** Formulář
v Nastavení nabízí `{{FIRMA_NAB_DOLOZKY_DE}}`, ale vydával se syrový text
pole — v dokumentu pak stálo „…von {FIRMA} weitergegeben…". Jazykové
symboly se nově prohánějí přes stejné zpracování jako české.

**Německá doložka vynechávala „die Eigentums-".** Z věty zmizelo vyhrazení
**vlastnického** práva a zůstalo jen autorské. Srovnáno se zdrojovým
dokumentem.

**Přehled rozdílů mezi řadami hlásil rozdíly, které nejsou.** Do porovnání
šel celý objekt databáze místo platného ceníku. Změřeno 1 → 0.

Testy: `test_jen_zahranicni.js` (20), `test_cenik_dopad.js` (17),
`test_zakazka_duplikace.js` (29), `test_nabidka_kapitoly.js` (99),
`overit_prepocet_dialog.mjs` (27). Celkem 120 sad zeleně.

---

## v21.9.10 — 21. 9. 2026

### Opravy z nezávislé revize dnešních změn (#286)

Revizi dnešních úprav dělal jiný model (Fable 5.1) se zadáním „hledej
skutečné chyby, ne stylistiku". Našel šest věcí, které stojí za opravu —
**a jednu z nich jsem zavedl dnes já**.

**Zaškrtnutí „po celé výšce" zpět smazalo ruční název i sazbu u typu
„jiné".** Dopolední oprava zaškrtávátka zakládala nový pás holý
(`{ typ, doM }`), a protože se při slučování bere **první** pás, dvě
kliknutí stěnu tiše zlevnila na nulu — v kalkulaci zůstal řádek „JINÉ" za
0 Kč. Nově se kopíruje celý pás; totéž u tlačítka „+ přidat pás".

**Technická specifikace tiskla větu o rozsahu opláštění česky i v EN/DE/FR.**
`techspec_ui.js` volal `tsHodnota` **bez jazyka**, takže se nová cesta
z dnešní dávky uplatnila jen v nabídce, ne ve specifikaci. Ta věta se navíc
objevovala v exportu „chybějící překlady", přestože přeložená je.

**Text na kartě sliboval, co kód nedělá.** Stálo tam „Terče a lišty se
počítají jen z pásů se sklem" — změřeno: u čtyř stěn ze skla, z Cetrisu
i „bez" vyjde řádek TERČE/LIŠTY **stejně**. Slib v obrazovce, který kód
neplní, je horší než mlčení. Text opraven; jestli se terče a lišty **mají**
vázat na sklo, je otázka na J. V. (#287).

**Dvě stěny „jiné" se stejným názvem a různou sazbou se slily do jedné
sazby.** Klíč byl jen název, sazba se brala z prvního pásu — druhá stěna se
spočítala za cenu té první, tiše a bez stopy. Klíč nově nese i sazbu.
**Tohle některým zakázkám cenu zvedne — na správnou.**

**Chyběla varování u zadání, které výpočet mlčky spolkne:** dolní mez nad
horní hranou stěny (stěna z ceny zmizí celá), dolní mez pod dnem prohlubně
(počítá se plocha, která neexistuje), dělicí výška nad horní hranou (pásy
nad ní zmizí, ale specifikace je zákazníkovi dál slibuje) a typ „jiné" bez
sazby.

**Nákres si ořezával spodní pás.** Minimum 2 px na pás přeteklo pruh
s `overflow:hidden`. Výška pruhu se nově počítá ze **skutečných** výšek pásů
a kóty se umisťují podle nich, ne lineárním přepočtem z metrů.

Sada `overit_oplasteni.mjs` narostla na **46 kontrol**.

### Ověření

120 sad prošlo / 0 selhalo (1 přeskočena).

---

## v21.9.9 — 21. 9. 2026

### P5 — tichý přepočet na dnešní ceník má konečně dialog (#284)

*Nálezy N7 a N22*

Rozpracovaná zakázka se po otevření přepočítá na platný ceník — to je
správně, staré ceny v ní nejsou doklad, ale past. Dělo se to ale **potichu**:
do lišty se napsala věta, kterou je snadné přehlédnout, a hlavně neříkala to
podstatné. **„12 změněných položek" může znamenat stokorunu i sto tisíc.**

Nově se otevře dialog, který řekne:

- na kterou **verzi ceníku** se přepočítalo,
- **kolik cen** se změnilo,
- a hlavně **o kolik se hnula cena nabídky** — v korunách, před i po.

A nabídne **vrácení původních cen**. Bez toho je to jen hlášení hotové věci.
Vrací se ze zálohy pořízené *před* přepočtem; dopočítávat staré ceny zpětně
by znamenalo druhý výpočet, který by se s tím prvním mohl rozejít.

Nabídka vrátit je **jednorázová** — příště se zakázka zeptá znovu, protože
se tím nic trvalého nerozhodlo. Dialog proto sám ukáže na trvalé řešení:
potvrdit u varianty „ceny jsou dohodnuté".

**Escape a klik mimo znamenají „nic nedělej", tedy ponechat přepočet.**
Zavřít okno je útěk z dialogu, ne rozhodnutí — kdyby Escape vracel ceny,
ztratil by obchodník přepočet, o kterém se ještě nerozhodl.

Po vrácení se obnoví i otisky pro autosave. Bez toho by první klik kamkoli
uložil zakázku s cenami, které uživatel právě odmítl (týž mechanismus jako
nález V35).

Nové sady: `src/test_cenik_dopad.js` (13 kontrol na součet cen) a
`overit_prepocet_dialog.mjs` (21 kontrol v prohlížeči — text dialogu, obě
tlačítka, Escape i to, že se bez změn neotevře vůbec).

### Ověření

120 sad prošlo / 0 selhalo (1 přeskočena).

---

## v21.9.8 — 21. 9. 2026

### P7 — nabídka končila cenou, chyběly čtyři kapitoly (#282)

*Nálezy N15 a N16; mail D. Sikory: „nám tam schází úplně — platební
podmínky, požadavky na provedení realizace, termíny realizace, předání
díla."*

Wordová šablona ty kapitoly měla, aplikace ne — dokument z aplikace se tedy
s tím, co zákazník dostal, neshodoval. Nově se tisknou všechny čtyři
a k nim závěrečné doložky (oprava zjevných chyb, autorská práva).

**Dva zdroje, záměrně různé:**

- **III. PLATEBNÍ PODMÍNKY se skládá z údajů zakázky** — zálohy, splatnost,
  platnost nabídky a způsob fakturace už v krycím listu jsou. Druhý opis
  týchž vět by se dřív nebo později rozešel s tím, co obchodník nastavil.
- **IV., V., VI. a doložky jsou firemní standard** (Nastavení → Smlouvy
  / Šablony → *Kapitoly nabídky III.–VI.*). Jeden řádek = jedna odrážka.

**Každý jazyk má vlastní pole.** Smluvní podmínky se nepřekládají strojově —
totéž pravidlo jako u cen: co nikdo nenapsal, si aplikace nevymyslí. Výchozí
znění v češtině, angličtině a němčině je převzaté z nabídek dodaných J. V.
Nevyplněný jazyk se z nabídky **vypustí i s nadpisem**; francouzština se
podle rozhodnutí zatím neřeší a vytiskne češtinu **s viditelným
upozorněním** — tiché vytištění češtiny cizímu zákazníkovi je horší, protože
se to nikdo nedozví.

Název firmy v doložce o autorských právech zastupuje značka `{FIRMA}`:
firemní údaje jsou v repozitáři schválně ukázkové a skutečné bydlí mimo něj.

Nová sada `src/test_nabidka_kapitoly.js` (**72 kontrol**) hlídá i to, že
všechny tři jazyky mají u každé kapitoly **stejný počet odrážek** — jinak
by se někde při přepisu ztratil řádek a cizí zákazník by dostal kratší
podmínky než český.

**Při psaní testů se našla chyba v mé vlastní logice:** prázdné pole
a nedodaný jazyk byly jedním příznakem, takže prázdná *česká* kapitola
hlásila „překlad nebyl dodán". Jsou to dvě různé věci a teď je rozlišuje
`prazdne` / `jazykChybi`.

### Ověření

118 sad prošlo / 0 selhalo (1 přeskočena).

---

## v21.9.7 — 21. 9. 2026

### Nákres stěny u opláštění po stěnách (#281)

Zadání J. V. po prvním proklikání: *„kalkulace opláštění postrádá
vizualizaci, takhle je to nepřehledné."* Tabulka pásů řekne, co je zadané —
neřekne, jak stěna **vypadá**. Čtyři stěny po dvou pásech si člověk musí
v hlavě skládat a záporná dolní mez v prohlubni se z čísel nepozná vůbec.

U každé stěny proto stojí **schematický nákres**:

- svislý pruh rozdělený na pásy **v poměru skutečných výšek**,
- **barva podle typu** opláštění, název materiálu v pásu,
- **kóty** u horní hrany, každého rozhraní pásů i dolní meze,
- **čárkovaná čára úrovně nástupu (0 m)**, takže je vidět, co sahá do
  prohlubně; záporné kóty jsou hnědé,
- `bez — dodá stavba` je **šrafa, ne barva** — není to materiál,
- pod nákresem **plocha stěny**, nebo výslovné **„bez plochy k opláštění"**.

Pod kartou přibyla **legenda s plochami podle typu** a celkovou plochou —
tatáž čísla, která jdou do kalkulace.

**Nákres kreslí pásy, které spočítalo jádro** (`r.oplasteni.pasy`, nově se
vydávají z `vypocet()`), ne vlastní přepočet zadání. Jádro dělicí výšku
ořezává a plochu pod nulou bere jinak než nad ní; obrázek, který by si to
počítal po svém, by při první změně pravidel ukazoval něco jiného, než
z čeho vyšla cena.

**Proč je ta plocha pod nákresem důležitá:** čelní stěna nese dveřní
portály, takže její plocha k opláštění jsou jen světlíky nad dveřmi — a bez
nich vyjde **nula**. Barevné pásy by pak slibovaly materiál, za který se nic
nepočítá. S číslem je to na první pohled vidět.

Sada `overit_oplasteni.mjs` narostla na **36 kontrol**; ověřeno negativně —
bez nákresu jich 7 padá. Kontroly měří skutečné rozměry vykreslených prvků
(poměry výšek pruhů proti výškám pásů), ne přítomnost tříd.

Mimochodem: první pokus měl u výpočtu zálohu přes `vypocet()`, která by
obcházela zámek odeslané nabídky. **Chytil to `test_zamek_otisk.js`** dřív,
než se to stihlo dostat do commitu.

### Ověření

117 sad prošlo / 0 selhalo (1 přeskočena).

---

## v21.9.6 — 21. 9. 2026

### P9 — nabídka si u soklu prohlubně odporovala (#279, nález N17)

Oprava z 16. 9. znala u oplechování soklu jen dva stavy: v základní ceně →
sekce *Doplňkové konstrukce*, jinak → „není součástí nabídky". Jenže **od
16. 9. se sokl nabízí i mezi příplatky** a ty se do nabídky dávají všechny,
dokud je obchodník ve sloupci „Nabídka" nevyřadí.

Výchozí exteriérová nabídka proto zákazníkovi tvrdila **obojí naráz**:
kapitola II. mu sokl nabízela za cenu a tabulka specifikace u téhož řádku
psala „není součástí nabídky".

Třetí stav má nově vlastní větu — **„nabízeno jako příplatek"** (přeloženo do
EN/DE/FR). Řádek zůstává v sekci *Součástí dodávky není*, protože v základní
ceně opravdu není, ale místo popření odkazuje na příplatek. Rozhoduje týž
seznam, ze kterého se sází kapitola II., takže se obě místa nemůžou rozejít.

Dvě sady musely změnit očekávání, protože stará věta byla nepravdivá:
`test_nabidka.js` a `test_docx_preklad.js`. U druhé se navíc zkouška
zpevnila — místo hledání konkrétních anglických slov se ověřuje, že hodnota
prochází slovníkem.

### P6 — migrace stříšky: nález se nereprodukuje, ale chyběl test (#280)

N10 hlásí, že staré zakázky nesou obě položky stříšky naráz a počítají ji
dvakrát. **Na dnešním kódu se to nereprodukuje** — migrace z #240
(`zakazka.js`) dosadí starší zakázce přesně jeden kus a ve výpočtu stojí
řádek právě jednou. Ověřeno i to nejpodezřelejší: **idempotence**, tedy že
pětinásobné načtení zakázky (ze serveru, z historie kroků, ze souboru) nedá
pět stříšek.

Skutečná díra byla jinde: **migrace neměla jedinou kontrolu**. Je to přesně
ten druh kódu, který se rozbije nepozorovaně — běží jen nad starými daty,
která nikdo v testech nemá, a pozná se to až na ceně u zákazníka. Nová sada
`src/test_migrace_striska.js` (14 kontrol) správné chování přibíjí, včetně
toho, že ručně zadaná nula ani dvojka se migrací nepřepíše.

### Adresa testovacího webu v dokumentaci

Návod uváděl `engscalc-test.netlify.app`; skutečná adresa je
**`testengscalc.netlify.app`** — `test` jako předpona. Kvůli tomu se marně
hledalo `/api/zdravi`.

### Ověření

117 sad prošlo / 0 selhalo (1 přeskočena).

---

## v21.9.5 — 21. 9. 2026

### Opláštění po stěnách: dvě chyby z prvního proklikání (#276)

J. V. zapnul režim po stěnách na testovacím webu a narazil na obojí hned:

- **Zaškrtávátko „po celé výšce" nešlo odškrtnout**, takže stěnu nebylo jak
  rozdělit na pásy — celá funkce po stěnách byla nedostupná. „Po celé výšce"
  je **odvozený** stav (dolní mez 0, jediný pás až nahoru), ne příznak
  v datech. Odškrtnutí ale pásy jen přepsalo zase na jeden jediný, takže se
  ze stejných dat odvodilo znovu „po celé výšce" a zaškrtávátko se okamžitě
  vrátilo. Nově odškrtnutí stěnu **opravdu rozdělí**: přidá druhý pás stejně
  jako tlačítko „+ přidat pás". Dělicí výška zůstává prázdná a obrazovka
  rovnou řekne, že ji má obchodník vyplnit.
- **Vizuál se rozsypal.** `.inputs .card .body` je mřížka
  `repeat(auto-fill, minmax(300px,1fr))`, která sází do sloupců **každý
  `.row` zvlášť** — hlavičky čtyř stěn tedy stály vedle sebe v ~290px
  sloupcích, popisek „Stěna A — čelní stěna" se lámal do svislého proužku
  a „po celé výšce" se trhalo na dva kusy. Po rozdělení stěny na pásy by se
  navíc hlavička, dolní mez a pásy rozletěly do různých sloupců a vedle sebe
  by stály pásy různých stěn. Stěna je nově **jeden blok** ve vlastní mřížce
  (`.opl-steny` / `.opl-stena`), dva sloupce na širokém okně, jeden pod
  1100 px.

**Nová sada `overit_oplasteni.mjs` (23 kontrol) v prohlížeči.** Jádro obě
chyby vidět nemohlo — `src/test_oplasteni_zapnuti.js` hlídá, že zapnutí
režimu nehne cenou, a to platilo dál. Obojí bylo čistě v obrazovce. Sada je
zapojená do `spust_testy.sh --smoke` i do CI.

Ověřeno i **negativně**: nad neopraveným kódem sada padá (5 kontrol na
rozložení, 4 na zaškrtávátko), takže nehlídá naprázdno.

### Ověření

116 sad prošlo / 0 selhalo (1 přeskočena), včetně prohlížečových.

---

## v21.9.4 — 21. 9. 2026

### Opláštění po stěnách — obrazovka, specifikace a překlady (#268, 3. krok)

Výpočet, typy i kontrola standardu přišly dvěma dávkami 18. 9. 2026. Chyběla
**obrazovka** — režim se dal zapnout jedině ruční úpravou JSON, takže ho
obchodník neměl jak použít a kód ležel v aplikaci nečinně.

- **Přepínač „Opláštění"** v Zadání šachty (jednotné / po stěnách A–D).
  Karta se stěnami se kreslí **až po přepnutí**; ve standardním režimu
  obchodník o čtyřech stěnách vůbec neví.
- **Řádek stěny:** typ · „po celé výšce" · dolní mez · pásy. Zaškrtnuté „po
  celé výšce" schová rozsah i pásy — většina stěn je celá stejná.
- **Pásy** se přidávají a odebírají po jednom, bez umělého stropu. Ukládá se
  **dělicí výška**, ne dva nezávislé rozsahy, takže překryv ani mezera nejdou
  zapsat. Úsek, který se oplášťovat nemá, se zadá jako pás **„bez — dodá
  stavba"**; zůstane tak vidět, že se na to myslelo.
- **Záporná dolní mez** sahá do prohlubně. **„Jiné"** dovolí napsat název
  a náklad za m² rovnou do zadání.
- **Varování**, když dělicí výška chybí nebo neroste. Výpočet takový pás
  přeskočí — ale mlčky, a tiché přeskočení se pozná až u zákazníka.
- **Technická specifikace** nově popisuje rozsah opláštění po stěnách
  (řádek ROZSAH OPLÁŠTĚNÍ), a to **ve všech čtyřech jazycích**. Věta se
  skládá z proměnlivého počtu kusů, takže ji slovník nemůže trefit celou —
  `tsOplasteniRozsah` ji proto staví rovnou v cílovém jazyce a tisk přes ni
  nepouští `tr()` podruhé.
- Výchozí podobu stěn skládá **jádro** (`oplasteniStenyVychozi`), ne
  obrazovka. Jedině tak platí slib dávky #268, že **zapnutí režimu beze změny
  zadání nehne cenou** — doloženo na 32 zadáních napříč typem šachty,
  zasklením, průchozí šachtou, prohlubní i ATYP.

Nová sada: `src/test_oplasteni_zapnuti.js` (31 kontrol).

### Rozhodnutí J. V. k opláštění (21. 9. 2026)

Obě otázky, které u #268 zůstávaly otevřené, jsou zodpovězené — a obě
**potvrzují dnešní stav**, takže se nic nepřepočítává:

- Sazby **práce a tmelení** se počítají **po celé ploše** bez ohledu na typ
  opláštění.
- U **dělicí výšky**, která nepadne na rozteč příčníků, se počítá **skutečná
  plocha**, ne celá tabule.

Obojí si J. V. vyhradil k pozdější úpravě. Zapsáno do roadmapy (#275), aby se
o tom podruhé nespekulovalo.

### Testy k P1–P3: tři díry, které samy testy neukázaly

Kontrola po dokončení P1–P4 — otázka zněla, jestli oprava ceníku opravdu
nemůže znovu propadnout. Našly se **tři místa, kde se opravené chování
nehlídalo vůbec**, a jedno, kde se hlídalo jen naoko:

- **Serverová pojistka P1 neměla test.** Zákaz zveřejnit ceník z varianty
  přepnuté na Zahraničí byl v `netlify/functions/program.mjs`, ale žádná
  sada ho nevolala. Doplněno 8 kontrol na konec `netlify/test_funkce.mjs`
  (203 prošlo / 0 selhalo).
- **Zámek jen ke čtení neměl kontrolu v prohlížeči.** `overit_online.mjs`
  nově ověřuje, že tlačítka „nová varianta" a „kopie" v režimu čtení
  **nejsou mrtvá** a řeknou, co udělají — přesně ta chyba, která se u P3
  jednou už stala (135/0 → **140/0**).
- **Žádná z oprav P1–P3 neměla mutaci.** Doplněno 5 mutací do
  `netlify/mutace.mjs`.

**A pak mutace odhalila čtvrtou, nepříjemnější věc.** Ze 128 mutací zůstala
jediná nechycená: „klíče řady se zapíšou do platného ceníku". Test na to
existoval — jenže ověřoval čištění nad **čistým zkušebním ceníkem, který
`rada` ani `jenZahr` vůbec neobsahoval**. Čištění nemělo co odebrat, takže
kontrola prošla i s vypnutým čištěním. Test, který platí vždycky, je horší
než žádný: tvářil se, že hlídá přesně tu chybu z v27. Podklad teď klíče
skutečně nese (tak, jak je do něj přidá `cenikSlozRadu` u každé varianty)
a k tomu stojí kontrola, že je tam opravdu má. Mutace je po opravě chycená.

Navíc: `netlify/mutace.mjs` si doplní `ADMIN_EMAIL` sám, stejně jako to už
umí `spust_testy.sh`. Bez něj se ručně spuštěný běh zastavil hned na „sady
nejsou zelené ani bez mutace" a vypadalo to jako rozbitý kód.

### Ověření

115 sad prošlo / 0 selhalo (1 přeskočena), včetně prohlížečových. Harnessy:
`overit_lista` 268/0, `overit_atyp` 57/0, `overit_zobrazeni` 121/0,
`overit_ock_cela_cesta` 42/0, `overit_vypnuty_radek` 21/0,
`overit_online` 140/0, kouřový test 50/0.

Mutační testování serveru: **127 z 128 chycených**; jediná nechycená byla ta
popsaná výše. Po opravě testu je chycená i ona — ověřeno cíleným během
`node netlify/mutace.mjs "klíče řady"` (1 z 1).

---

## v21.9.3 — 21. 9. 2026

### P4 — Položky „jen pro zahraničí" už nezdražují české zakázky

*Nález N6*

- **Příčina byla v pořadí, ne ve filtru.** Základ **přirážky za ATYP** se
  počítal z celého pole `rezie`, a to o pár řádků **nad** filtrem, který
  skryté a vyřazené položky odstraňuje. Řádek PŘEKLADY CZ→DE se v tuzemské
  kalkulaci správně neukázal, ale jeho cena přesto vstupovala do přirážky —
  a přes ni ještě jednou do rezervy. Po otevření zakázky a přepočtu „na
  ceník, který platí dnes" cena vyskočila, aniž by přibyl jediný viditelný
  řádek.
- Základ přirážky nově bere `jenPocitane(rezie)`, tedy přesně ty řádky,
  které jdou do součtu. **Týká se to i ručně vyřazených položek**
  (`nepocitat`) — ty přirážku nafukovaly úplně stejně.
- **V tuzemské řadě taková položka nemá cenu.** Obě funkce, které skládají
  ceník pro danou řadu (`cenikSlozRadu`, `cenikDnesniProRadu`), ji nulují.
  Protože nulují obě, nemá přepočet při otevření zakázky co hlásit.
- Sjednoceny dva zdroje pravdy: značky `jenZahr` od administrátora a pevný
  seznam `CENIK_JEN_ZAHR`. Jádro je spojovalo, skládání řady znalo jen
  značky — a z té nerovnosti nález plynul.
- **V editoru ceníku je tuzemské pole u takové položky zašedlé** („neplatí
  v ČR"). Vadná hodnota ve verzi 27 se tam dala prostě napsat.

**Ceny některých zakázek se tím MĚNÍ — vždy dolů.** Týká se to tuzemských
zakázek se zaškrtnutým ATYP, které měly buď položku „jen zahraniční"
s vyplněnou ČR cenou, nebo ručně vyřazený řádek v režii. Uzamčené nabídky
se nepřepočítávají, ale jejich cena se v aplikaci zobrazuje z dat — u takové
nabídky proto bude nově nižší než na vytištěném PDF, které odešlo
zákazníkovi. Rozhodující je PDF; aplikace teď ukazuje, kolik ta nabídka měla
stát.

Nová sada: `src/test_jen_zahranicni.js` (17 kontrol).

### Ověření

112 sad prošlo / 0 selhalo (1 přeskočena), s `--smoke` 114. Harnessy:
`overit_lista` 268/0, `overit_atyp` 57/0, `overit_zobrazeni` 121/0,
`overit_ock_cela_cesta` 42/0, `overit_vypnuty_radek` 21/0,
`overit_online` 135/0.

---

## v21.9.2 — 21. 9. 2026

Opravy z **kola 6** testování (zakázky CN-0383 a CN-0377/377), priorita 1.
Vyhodnocení testů je ve sešitu na Drive; konkrétní sazby do repozitáře
nepatří.

### P1 — Ceník: zahraniční ceny se nedostanou do tuzemské řady

*Nálezy N1, N20, N6 (částečně)*

- **Zveřejnění ceníku z varianty přepnuté na řadu Zahraničí je zakázané.**
  Takhle vznikl vadný platný ceník verze 27, který měl u čtrnácti položek
  v ČR sloupci zahraniční hodnoty. Hlídá to aplikace i server — dialog jde
  obejít, server ne.
- **Druhá pojistka:** shoduje-li se ČR cena se zahraniční odchylkou u více
  než pěti položek, zveřejnění se zastaví a položky se vypíšou. Chytí
  i podklad, ze kterého někdo značku řady odstranil.
- **Klíče `rada` a `jenZahr`** se do zveřejněného ceníku nezapisují.
  U varianty je pokaždé znovu složí `cenikSlozRadu`.
- **Dialog zveřejnění** ukazuje řadu varianty a rozdíly **zvlášť pro ČR
  a zvlášť pro ZAHR**. Dřív to bylo jedno číslo, ve kterém tahle chyba
  nebyla vidět.
- **Historie verzí** nese počty změn proti předchozí verzi (ČR / ZAHR).
- **Falešné varování „do souboru někdo sáhl ručně" zmizelo.** Vzorec otisku
  se dvakrát změnil (#181, #267), takže varování svítilo u všech 27 verzí
  a přestalo něco znamenat. Každá verze si nově pamatuje verzi vzorce
  a porovnává se jen se shodnou; skutečný ruční zásah se pozná dál.
- Postup k vydání opravené verze 28: `POSTUP_CENIK_V28_2026-09-21.md`.
  **Ceník sami nezveřejňujeme.**

Nová sada: `src/test_cenik_zverejneni.js` (26 kontrol).

### P2 — Značky ukázkového a prázdného ceníku

*Nálezy N2, N3*

- **Příčina:** server při uložení zakázky doplňoval chybějící klíče ceníku
  z `DEFAULT_CENIK` ze sestavení, které je pro GitHub vynulované a nese
  `ukazkove: true` i `prazdny: true`. Vtisklo je to do každé varianty, i když
  je klient neposlal. U uzamčených variant, které se při otevření
  nepřepočítávají, tam zůstaly napořád — červená lišta „Ceník není nahraný"
  a **vypnutý tisk nabídky u ostrých zakázek 0383 a 377**.
- `cenikDoplnKlice` značky ze vzoru **nedoplňuje** (jedno místo pro klienta
  i server). Chybějící ceny doplňuje dál — nález V38 platí.
- Server **odstraňuje značky před zápisem**, a to i z kopie uložené zakázky,
  kterou drží jen pro porovnání. Jinak by kontrola „nesmí se změnit data
  uzamčené nabídky" odmítla legitimní uložení.
- Aplikace si značku **srovná podle skutečného obsahu i u uzamčené varianty**
  — bez přepočtu cen. Nenulové ceny dokazují, že ceník prázdný není.
  Záměrně jen odebírá, nikdy nepřidává.
- Hromadná náprava starších zakázek: `nastroje/migrace_znacky.mjs`
  (náhled → potvrzení → zápis, nic nemaže, zapisuje do protokolu zakázky).

Nová sada: `src/test_ukazkove_znacky.js` (24 kontrol) + serverové kontroly
v `netlify/test_funkce.mjs`.

### P3 — Zámek „jen ke čtení" nesmí tiše zahazovat práci

*Nálezy N4, N5*

- **„+ Nová varianta" a kopie ⧉** v zakázce otevřené jen ke čtení variantu
  vyrobily, ale neměl ji kdo uložit — po `Ctrl+F5` byla pryč. Obojí teď
  nabídne odemknutí.
- **Tlačítko uložení** v tomhle stavu nic nezapsalo a vysvětlení šlo jen do
  karty Databáze. Nově se jmenuje **„🔒 Odemknout a uložit"** a nabídne
  odemknutí.
- **Odmítnutí dialogu vrátí pole**, aby na obrazovce nezůstala hodnota,
  která v datech není.
- **Stav „jen ke čtení" má výrazný štítek v liště** nad kalkulací (jantarový;
  červená už znamená odeslanou nabídku — dvě různé věci nesmějí mít stejnou
  barvu).
- **Nová akce „Duplikovat jako novou zakázku"** v Přehledu. Kopíruje
  hlavičku, zadání a ceníky; **nekopíruje** zámky, doklady o odemčení,
  poznámky ani přílohy a nedědí identitu uložené předlohy. Dřív na to nebyla
  cesta a lidé si starou zakázku přepisovali.

Nová sada: `src/test_zakazka_duplikace.js` (23 kontrol).

### Opraveno při práci na dávce

- **Aplikace se vůbec nespouštěla.** Seznam `CENIK_NEDOPLNOVAT` v `engine.js`
  sahal na konstanty z `ukazkove.js`, který v sestaveném souboru stojí až za
  ním — odkaz padl do dočasné mrtvé zóny a výjimka ukončila vyhodnocení
  celého skriptu. `typeof` před tím nechrání: u proměnné v TDZ hází taky.
  Chytil to kouřový test v prohlížeči.

- **Tlačítko uložení bylo v režimu čtení mrtvé, ne jen špatně pojmenované.**
  Lišta „Zakázka a varianta" dává v režimu čtení všem tlačítkům
  `pointer-events:none` kromě těch se značkou `cteni-ok` — a tlačítko
  uložení ji nemělo. Přejmenování samo by nepomohlo, dialog by se neměl jak
  otevřít. Odhalil to `overit_online.mjs` v CI; jeho očekávání „tlačítko je
  nedostupné" se změnilo na „je klikatelné a říká, co se stane" — nedostupné
  tlačítko není vysvětlení. Zápis dál hlídá `zamekCteniStop()`.
- **`spust_testy.sh --smoke` nově pouští i `overit_online.mjs`** (pokyn
  J. V.): dvě chyby této dávky chytil až prohlížeč v CI. Skript si zároveň
  sám doplní smyšlený `ADMIN_EMAIL`, když v prostředí chybí — stejně jako
  CI; bez něj serverové sady padaly na „Nepřihlášen" a vypadalo to jako
  rozbitý kód.

### Ověření

111 testovacích sad prošlo, 0 selhalo (1 přeskočena — `test.js` potřebuje
skutečný ceník mimo repozitář); s `--smoke` 113. Kouřový test 50/0,
`overit_online` 135/0. Prohlížečové harnessy: `overit_lista` 268/0,
`overit_zobrazeni` 121/0, `overit_ock_cela_cesta` 42/0,
`overit_vypnuty_radek` 21/0.

---

## v21.9.1 — 21. 9. 2026

- Kouřový test si držel starý výchozí model výpočtu a shazoval CI sedm běhů
  po sobě. Při opravě vyšlo najevo, že testu podstrkované řetězce
  `'fix'`/`'compat'` nikdy nic nepřepnuly (`fixes` je boolean), takže se
  varovná větev štítku režimu za celou dobu ani jednou neproběhla.
