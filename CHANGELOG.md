# Změny Kalkulátoru Next Gen

Zapisují se sem dávky a to, co v nich bylo opravené. Verze nese konvenci
`vDEN.MĚSÍC.pořadí` (`v21.9.2` = 21. září, druhá dávka toho dne).

Podrobné zdůvodnění každé opravy je ve zprávě commitu a v komentáři u kódu —
tenhle soupis slouží k rychlé orientaci, ne jako náhrada za ně.

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
