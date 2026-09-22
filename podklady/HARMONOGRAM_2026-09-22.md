# Harmonogram oprav — 22. 9. 2026

Vstupy: bezpečnostní audit v21.9.18 (Opus 5, nálezy B53–B58), STAV 19. testovacího
kola (N12–N20) a otevřené položky z předchozí dávky (#296, #298, P8, P14, N30).
Každý nález z auditu jsem si před zařazením ověřil ve zdroji — všech šest sedí.

## Podle čeho je pořadí

1. **Ztráta práce a peněz** má přednost před všechním ostatním — to je pravidlo,
   které platí od začátku.
2. **Nejdřív vidět, pak opravovat.** Dvě z dnešních vážných věcí (N12, N13) se
   osm dní neukázaly jen proto, že jejich harnessy neběží v CI. Než se pustím do
   oprav, chci vědět, co všechno ve skutečnosti padá — jinak harmonogram
   plánuje naslepo.
3. Serverové pojistky (audit) až po tom, co vidí obchodník — s jednou výjimkou:
   B53 jde hned za N12/N13, protože sahá na částky už odeslané nabídky.
4. **Nic, co mění cenu, se nedělá bez rozhodnutí J. V.** — ty položky jsou dole
   ve zvláštním oddílu a dnes se na ně nesahá.

Každá dávka = oprava + test, který bez opravy padá + zápis do CHANGELOG
a roadmapy + push do `test`. Do `main` nic, PR žádné — čeká se na výslovný pokyn.

---

## Dávka 1 — vidět: N15 + N16 (dopoledne, S)

**N15** — `overit_sod.mjs` a `overit_nabidka_proj_word.mjs` používají `KOREN`
o dvacet řádků dřív, než ho deklarují (řádky 23 vs 42 a 29 vs 48). Od 14. 9.
nenastartují, takže **sedm kontrol smluv o dílo a plné moci neběží nikde.**
Oprava je přesun jednoho řádku v každém souboru. Ověřeno ve zdroji.

**N16** — CI pouští 10 z 37 harnessů; právě ve zbylých vyšly N12, N13 i N14.
Rozhodnutí: **všech 37 do CI**, do samostatného jobu `harnessy`, který už
existuje a běží paralelně. Prodlouží ho to na odhadem 12–15 minut, což je
únosné — cena za opak byla osm dní slepoty. Netlify kreditů se to netýká:
GitHub Actions jsou samostatný rozpočet a CI se spouští pushem, ne PR.
Totéž do `spust_testy.sh --smoke`, aby seznam zůstal shodný (pravidlo z 21. 9.).

Harnessy, které dnes NEMOHOU projít ani po opravě, se v CI označí jako
**vědomě přeskočené s důvodem**, ne tiše vynechané: `overit_roadmapu.mjs`
(N18 — míří na `/home/claude/work/...`, cestu z cizího prostředí, a
`roadmapa.py` v repozitáři není), `overit_sablona.mjs` (potřebuje wordovou
šablonu, která leží jen na Drive; navíc hledá v7, existuje jen v8).

**Výstup dávky:** skutečný seznam padajících kontrol → podle něj se upřesní
dávka 2.

### Co se v dávce 1 ukázalo navíc (doplněno po provedení)

TDZ byla jen polovina N15. I po opravě by se obě sady mohly **jen přeskočit**,
protože šablony mají napevno cestu z cizího prostředí — a pak by N15 nesplnilo,
kvůli čemu vzniklo. Vznikl proto `nastroje/harness_podklady.mjs` s přepisem
přes `KNG_PODKLADY`.

Táž vada byla ve **čtyřech dalších** harnessech a dva z nich by po zapojení do
CI svítily červeně kvůli chybějícímu firemnímu dokumentu, ne kvůli aplikaci:
`overit_manual.mjs` (ENOENT nad neexistující složkou) a
`overit_sablony_online.mjs` (četl šablonu bez kontroly, padal uprostřed běhu).
Bez téhle části by zapojení všech 37 do CI rozbilo CI hned první den.

A `overit_sablona.mjs` hledal šablonu CN **v7, která už neexistuje** — to je
přesně ta „záměna místo ověření", kterou popisuje STAV.

## Dávka 2 — ztráta ruční práce: N12 + N13 (dopoledne–poledne, M)

**N12** — ruční přirážka se po znovuotevření zakázky změní (40 % → 0,42)
a značka „nastavil jsem si ji sám" se neuloží. **N13** — po obnovení stránky
se rozdělaná zakázka neotevře, vrátí se prázdný formulář, ačkoli na serveru
leží. Obě míří na totéž: **obchodník přijde o to, co ručně udělal.** Ironií
je, že vynucené obnovení kvůli nové verzi změnu ukládá správně
(`overit_online.mjs`, 140 OK) — rozbité je prosté F5.

**Reprodukováno lokálně ještě před začátkem** (třináct harnessů mimo CI,
22. 9. ráno) — přesně tři padají a přesně sedí na N12–N14:

| nález | harness | padající kontrola | co vyšlo |
|---|---|---|---|
| N12 | `overit_prirazka_cenik.mjs` | „po znovuotevření zakázky je přirážka pořád 40 %" | **0,42** |
| N12 | `overit_prirazka_cenik.mjs` | „a značka ‚nastavil jsem si ji sám' se uložila taky" | prázdno |
| N13 | `overit_obnova_zakazky.mjs` | „po obnovení stránky je zakázka zase otevřená" | číslo předlohy, soubor `""`, marže 0 |
| N13 | `overit_obnova_zakazky.mjs` | „a přirážka v ní zůstala 40 %" / „i číslo nabídky sedí" | 0 / předloha |
| N14 | `overit_program.mjs` | „uzamčená varianta si značku ponechá" / „a nehlásí se jako změna" | značky pryč, `zmen: 2` |

Co z toho plyne pro N12: po znovuotevření není 40 %, ale **0,42** — to není
40 % převedené na podíl (bylo by 0,40), to je **jiné číslo**. Nejpravděpodobněji
sazba z ceníku, která ruční hodnotu přepsala, protože se neuložila značka
„ručně nastaveno". Příčina je tedy nejspíš ve ztrátě té značky při ukládání
nebo načtení, ne v přirážce samé. Je to hypotéza podložená měřením — potvrdím
nebo vyvrátím reprodukcí v kódu, než cokoli změním.

Co z toho plyne pro N13: po F5 je otevřená **nová prázdná zakázka**, ne ta
uložená (`soubor: ""`). Tedy se buď ztratila paměť „naposledy otevřená", nebo
se načtení nespustilo. Přihlášení přitom drží (`prihlasen: true`).

N13 má přednost před N12: bez otevřené zakázky je přirážka jedno.

## Dávka 3 — B53: zmrazený výsledek odeslané nabídky (odpoledne, M)

Zámek varianty si od 15. 9. ukládá celý výsledek výpočtu (`zamek.vysledek`)
a dokumenty berou částky odtud. Otisk zámku (`uloZamekKlic`, `uloziste.js:429`)
ale nese jen `{ kdy, typ, cislo, otisk }` a server porovnává jen `data`
(`zakazky.mjs:183`). Kdo pošle upravený `vysledek`, přepíše čísla „neměnné"
nabídky bez stopy. Ověřeno ve zdroji, obojí přesně tak.

Oprava na třech místech: `vysledek` do otisku zámku; server porovná i zámek,
ne jen `data`; totéž v obnově ze zálohy (`obnova.mjs:441–453`). Plus mutace
„zmrazený výsledek se bere, jak přijde" a serverový test. Pozor na existující
zakázky: klíč se počítá čerstvě pro obě strany porovnání, takže starší zámky
bez `vysledek` projdou dál — ověřím testem, ne úvahou.

### Jak to dopadlo (doplněno po provedení)

Stačilo opravit **jedno místo**, ne tři: `zakazky.mjs` i `obnova.mjs` volají
tutéž `uloKontrolaZamku`, takže oprava klíče pokryla obě cesty naráz.

Do klíče šel nakonec **celý výsledek**, ne jeho otisk. První verze měla otisk
(FNV-1a, 32 bitů) kvůli velikosti (~25 kB na variantu). Při kontrole před
commitem jsem si vlastní řešení zamítl: FNV není kryptografická funkce a její
kód je ve vydané stránce, takže kdo chce částky přepsat, dopočítá si k nim
výplň se shodným otiskem. Klíč se skládá jen při ukládání, ne při vykreslování,
takže přesné porovnání je zaplatitelné — a je to totéž, čím se o řádek vedle
porovnávají `data` uzamčené varianty.

Předpoklad o starších zakázkách se potvrdil a je pokrytý vlastní kontrolou,
ne úvahou.

## Dávka 4 — serverové pojistky: B54, B55, B56 (odpoledne, M)

**B54** — prázdná proměnná `ADMIN_EMAIL` tiše vypne všechny ochrany hlavního
účtu (reset hesla, změna role, smazání, ochrana při obnově). Oprava: bez
proměnné odmítnout obsluhu chráněných cest (503) místo tichého vypnutí;
test s prázdnou hodnotou (CI i mutace ji dnes vždy dosadí, takže tahle větev
nikdy neběžela).

**B55** — pojistka zveřejnění ceníku porovnává ČR hodnoty proti odchylkám
**z téhož požadavku** (`program.mjs:60`: `ctx.zahranicni`), ne proti uloženým.
Kdo odchylky v požadavku vynechá, pojistku obejde. Oprava: porovnávat proti
tomu, co je uložené; test na vynechané pole.

**B56** — zákaz změnit číslo nabídky po odeslání žije jen v prohlížeči
(`common.js:564`); server (`zakazky.mjs:88–91`) hlídá jen délku. Doplnit
serverovou kontrolu u uzamčené varianty.

### Rozhodnuto před psaním kódu (22. 9. 2026)

**B54 — kam přesně patří 503.** Ne na celou obsluhu `uzivatele.mjs`: jedna
akce v ní je dostupná i bez role administrátora (změna VLASTNÍHO hesla) a tu
by odmítnutí připravilo o jedinou cestu k nápravě. Tři místa:
`uzivatele.mjs` hned za `relace.role !== 'Administrátor'` (kryje nový účet,
reset hesla, roli, zapnutí, archiv, převod i smazání), dále větev resetu
CIZÍHO hesla o kus výš, a `obnova.mjs` za jeho kontrolou role. Přihlášení
zůstává funkční schválně — bez něj by se závada nedala opravit zevnitř.

Kontrola se ptá na konstantu `ADMIN_EMAIL` **i** na živou proměnnou
prostředí. Konstanta se čte jednou při načtení modulu (to je hodnota, na
které ochrany opravdu stojí), živá proměnná dovolí test v témže procesu.
Odmítne se, když je prázdná kterákoli z nich — tedy přísněji.

**B55 — proti čemu porovnávat.** Prostá výměna „odchylky z požadavku" za
„odchylky uložené" by uměla zamknout ceník: kdo chce zrušit víc než pět
odchylek naráz, neprojde, protože se pořád porovnává proti tomu, co ruší.
Proto sjednocení uložených a příchozích odchylek PLUS podmínka, že se počítá
jen položka, jejíž ČR cena se tímhle zveřejněním **mění**. Cena, která
zůstala stejná jako v platné verzi, nemohla přijít ze zahraniční varianty.
Vyžaduje načíst `db` dřív než posudek a rozšířit `cenikZverejneniShody`
o předchozí záznam.

**B56 — z čeho se pozná změna čísla.** Ne z uložené zakázky: změna čísla
zakázku přesune pod JINÉ jméno souboru, takže server nemá co porovnávat
(právě tudy díra vede). Pozná se ze zámku samotného — `zamek.cislo` drží
číslo z okamžiku odeslání (`zamek_ui.js` ho plní z `variantaCislo`). Kontrola
je tedy vnitřní: u každé uzamčené varianty musí `zamek.cislo` odpovídat
`variantaCislo(zak, v)`. Prázdné `zamek.cislo` (zámky před zavedením pole)
se přeskakuje. Výjimka pro administrátora podle rozhodnutí J. V. z 15. 9.
2026 („Pouze administrátor"), a razítko čísla v zámku pak přepíše server,
aby zakázka nezůstala trvale v rozporu.

### Jak dávka 4 dopadla (doplněno po provedení)

Všechny tři opravy sedí tam, kde je plán čekal. Dvě věci se ukázaly až při
psaní kódu:

**B54:** prohlížeč tu nebyl slabší článek — slabší byl server. A hlavně:
tahle větev nikdy neběžela v žádném testu, protože prostředí proměnnou vždy
dosadí. Test ji proto maže za běhu a po sobě zase uklízí.

**B55:** prostá výměna zdroje odchylek by ceník zamkla (víc než pět
zrušených odchylek by neprošlo nikdy). Bez podmínky „počítá se jen položka,
jejíž ČR cena se mění" by oprava vyrobila horší problém, než jaký řešila.
Prohlížeč přitom porovnával správně už dřív — server byl ten, kdo se ptal
na špatný zdroj.

**B56:** kontrola nemohla stát na porovnání s uloženou zakázkou, protože
právě tudy díra vede (jiné číslo = jiný soubor = není s čím porovnávat).
Stojí proto na zámku samotném.

## Dávka 5 — drobnosti (podvečer, S)

- **B11** — `package-lock.json` nikdy v historii nebyl; `@netlify/blobs` je
  v rozsahu `^8.1.0`. Vygenerovat a commitnout.
- **N14** — uzamčená varianta si nedrží značky `prazdny`/`ukazkove` a hlásí
  dvě změny (`overit_program.mjs`, reprodukováno). Podezření na souvislost
  s P2 z 21. 9. (server značky odstraňuje) — uzamčená varianta se ale
  nepřepočítává a sahat se na ni nemá vůbec. Střední.
- **N18** — `overit_roadmapu.mjs` s cizí pevnou cestou; `roadmapa.py` chybí.
  Buď generátor doplnit, nebo harness poctivě přeskočit s důvodem.
- **Popisky v `test_prava.mjs`** — tři bloky nesou stará čísla B27–B29, která
  kolidují s auditem z 9. 9. (správně L27–L31). Jen popisek, ale plete.
- **`README_ZDROJAKY.md`** — sekce o prohlížečových testech dopsat podle
  skutečného stavu po dávce 1.

---

## Nesahá se — čeká na rozhodnutí J. V.

| # | co | proč nečekat na mě |
|---|---|---|
| **#296** | světlíky u průchozí šachty vycházejí větší než celá stěna (75 m² vs 37,9 m²) — opravit i ve standardu? | zlevnilo by každou průchozí zakázku |
| **#298** | P11 — má přepočet ceníku u chybějící sazby použít tutéž náhradu jako zaškrtnutí ATYP? | začalo by se přepočítávat, kde se dosud nepřepočítávalo |
| **P8** | 4 volby: číslo zakázky k N9, lešení (objednatel vs. položka v ceně), hmotnost spojky 90×90, DPH u zahraniční řady (→ účetní) | každá mění cenu nové nabídky |
| **P14** | migrace značek `prazdny`/`ukazkove` v ostré databázi — nástroj je hotový | sahá do ostrých dat |
| **N30** | limit Netlify (503 „usage_exceeded" během kola) — tarif, spotřeba, oddělení testu | provozní, mimo repozitář |

## Nesahá se — vědomě odloženo (dnes není kapacita ani důvod spěchat)

- **B57** (informativní) — `/api/zdravi` hlásí `spravceNastaven` anonymně. Je to
  záměr z 21. 9. (J. V. si to sám ověřoval); nechat.
- **B58** (informativní) — kniha smazaných účtů není v záloze. Malá věc, ale
  týká se struktury zálohy; zařadit do příští serverové dávky.
- **N17** — příručka obchodníka pro aktuální verzi. Samostatná práce na den.
- **N19** — mutační testování jádra v repozitáři nikdy nebylo. Nový nástroj,
  samostatná dávka; dnes ne.
- **N20** — očišťovací skripty pro GitHub. Repozitář je veřejný a ceník v něm
  záměrně není — možná už bezpředmětné; ověřit, co přesně skill očekává.
- **3. dávka z auditu 9. 9.** (B34, B36–B38, B40–B42) — dál trvá, nic z toho
  neblokuje.

## Co potřebuji od J. V. dnes

Nic pro dávky 1–5 — ty jdou bez otázek. Jen potvrzení jedné věci k N16:
**všech 37 harnessů do CI** (můj návrh), nebo ponechat 10 a zbytek pouštět
jednou týdně testovací procedurou? Dokud neřeknete jinak, dělám první.
