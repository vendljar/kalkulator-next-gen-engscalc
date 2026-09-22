# Změny Kalkulátoru Next Gen

Zapisují se sem dávky a to, co v nich bylo opravené. Verze nese konvenci
`vDEN.MĚSÍC.pořadí` (`v21.9.2` = 21. září, druhá dávka toho dne).

Podrobné zdůvodnění každé opravy je ve zprávě commitu a v komentáři u kódu —
tenhle soupis slouží k rychlé orientaci, ne jako náhrada za ně.

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
