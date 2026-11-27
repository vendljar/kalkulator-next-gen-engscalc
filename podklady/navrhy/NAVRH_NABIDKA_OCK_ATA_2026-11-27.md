# Vzor nabídky OCK s návrhy z porovnání ATA (27. 11. 2026)

> **Návrh k rozhodnutí J. V. — nic z toho není v aplikaci.** Naše nabídka je vyrobena z kódu (`nabidkaData` → náhled podkladů ve vzhledu Wordu CN v17, `src/nahled_word.js`) pro smyšlenou zakázku TEST: interiérová šachta, sklo VSG na terče, 6 stanic, rozměry jako ATA varianta 1, zkušební ceník. Všechny částky jsou nahrazené „X Kč". Firemní šablona CN v19 v repu není — pevné texty jsou ze šablony CN v17 opsané v `nahled_word.js`; kde dělá text jen šablona, je to označeno „(text šablony CN v19 — není v repu)".
>
> Vložené návrhy jsou bloky se štítkem **[A1]**, **[B2]**… — u každého: navržené znění, kam patří, co by to znamenalo pro aplikaci, pracnost S/M/L a dopad na cenu. Přehled všech štítků je na konci. Porovnání po tématech je v `POROVNANI_NABIDKA_OCK_ATA_2026-11-27.pdf`.
>
> Vyrobeno skriptem `podklady/navrhy/ATA_vzor_vyroba.js` (návrhy v `ATA_navrhy_data.js`).

**Cenová nabídka** *(záhlaví a logo: text šablony CN v19 — není v repu)*

| | |
|---|---|
| Objednatel: | TEST Objednatel s.r.o. · … |
| Datum: | 27.11.2026 |
| Název akce: | TEST – bytový dům, interiérová šachta (smyšlená zakázka) |
| Číslo nabídky: | 2026-OPR-CN-TEST |
| Adresa stavby / projekt: | Testovací 1, Praha |

### Popis záměru:

Vestavba výtahu v nové ocelové konstrukci výtahové šachty do vnitřního prostoru objektu.

**Naše nabídka obsahuje výrobu, dodání a stavbu MONTOVANÉ ocelové konstrukce výtahové šachty včetně jejího opláštění. Specifikace provedení nabízené šachty je v technické části této nabídky.**

**Opláštění šachty: vrstvené bezpečnostní sklo VSG.**

Nabídka se skládá z Technické a Obchodní části. Objednatelem odsouhlasená Technická část bude použita jako příloha smlouvy o dílo nebo závazné objednávky.

*(Pohled na objekt z ulice — fotka zakázky; ve vzoru bez fotky)*

> 🟨 **[B7] Výhody montované OK** — *NÁVRH*
>
> **Kam patří:** Popis záměru (pod větou „MONTOVANÉ ocelové konstrukce")
>
> **Navržené znění:**
>
> Výhody montované konstrukce: rychlá a čistá montáž bez svařování, broušení a nátěrů na stavbě, nízká hlučnost, přesnost, konstrukce přijede ve finální povrchové úpravě.
>
> **Co to znamená pro aplikaci:** Pevný text šablony CN (popis záměru) nebo text Firmy. Pozor: u nás je montovaná OK STANDARD, u ATA příplatek (o 3–4 týdny delší příprava) — u nás tedy výhoda, ne příplatek. Rozhodnout, jestli větu chceme (není to marketing o firmě, ale o výrobku).
>
> **Pracnost:** S · **Dopad na cenu:** ne

> 🟨 **[E1] Věta o shodě / odchylce od zadávací PD** — *NÁVRH*
>
> **Kam patří:** Popis záměru — první věta
>
> **Navržené znění:**
>
> Provedení díla vč. opláštění [odpovídá / NEODPOVÍDÁ / odpovídá s odchylkami uvedenými v technické části] zadávací projektové dokumentaci.
>
> **Co to znamená pro aplikaci:** Krycí list OCK nebo technická specifikace: výběr „shoda se zadávací PD" (odpovídá / neodpovídá / s odchylkami / neuvádět — výchozí neuvádět). Nový symbol POPIS_SHODA_PD, šablona + náhled + překlady.
>
> **Pracnost:** M · **Dopad na cenu:** ne

> 🟨 **[E2] Kdo navrhuje OK a dokládá statiku** — *NÁVRH*
>
> **Kam patří:** Popis záměru — za větou o montované OK
>
> **Navržené znění:**
>
> Ocelovou konstrukci šachty navrhuje zhotovitel a její únosnost doloží ověřovacím statickým výpočtem.
>
> **Co to znamená pro aplikaci:** Pevný text šablony CN; tiskne se jen se zaškrtnutou statikou (TS_STATIKA = ano), jinak by slibovala neoceněné.
>
> **Pracnost:** S · **Dopad na cenu:** ne

---

## A. TECHNICKÁ ČÁST NABÍDKY:

### I. TECHNICKÁ SPECIFIKACE VÝTAHOVÉ ŠACHTY

*(tato technická specifikace bude použita jako příloha Smlouvy o Dílo nebo závazné objednávky)*


> 🟨 **[A1] Tabulka „Technologie výtahu"** — *NÁVRH*
>
> **Kam patří:** A. Technická část, nová sekce na začátku technické specifikace (před Základními parametry šachty)
>
> **Navržené znění:**
>
> TECHNOLOGIE VÝTAHU (podklad objednatele / dodavatele výtahu)
> • TYP VÝTAHU: trakční bez strojovny
> • JEDNOSTRANNÉ ZAVĚŠENÍ (RUKSAK): ne
> • NOSNOST VÝTAHU [kg]: 1 000
> • POČET STANIC / NÁSTUPIŠŤ: 6 / 6
> • PRŮCHOZÍ KABINA: ne
> • PROSTOR POD ŠACHTOU POCHOZÍ: ne
> • ZDVIH [mm]: 22 850
> • HORNÍ PŘEJEZD / PROHLUBEŇ [mm]: 3 580 / 1 250
> • SVĚTLÉ PŮDORYSNÉ ROZMĚRY [mm]: š 1 810 × h 2 100
>
> **Co to znamená pro aplikaci:** Kalkulace OCK: dvě nová evidenční pole (typ výtahu – výběr, nosnost kg); do výpočtu nevstupují. Ruksak, průchozí kabina, zdvih, přejezd, prohlubeň, rozměry a stanice už v zadání jsou — jen se přeskupí do nové sekce. Nové symboly TS_VYTAH_* + řádky v šabloně CN a v náhledu NP; překlady EN/DE/FR.
>
> **Pracnost:** M · **Dopad na cenu:** ne

> 🟨 **[A2] Více variant rozměrů v jedné nabídce** — *NÁVRH*
>
> **Kam patří:** Tabulka A1 a Základní parametry šachty; v B. Obchodní části cena za každou variantu
>
> **Navržené znění:**
>
> • HORNÍ PŘEJEZD [mm]: Varianta 1 – 3 580 / Varianta 2 – 3 400
> • SVĚTLÉ ROZMĚRY [mm]: Varianta 1 – š 1 810 × h 2 100 / Varianta 2 – š 1 850 × h 2 105
> B. Obchodní část: VÝTAHOVÁ ŠACHTA – varianta 1 … X Kč / varianta 2 … X Kč (bez DPH)
>
> **Co to znamená pro aplikaci:** Dnes je každá varianta samostatná nabídka (číslo s příponou .2). Návrh: volba „tisknout varianty rozměrů v jedné nabídce" — dokument přečte zvolené varianty téže zakázky a rozdílné hodnoty spojí do jednoho řádku; cena za variantu z jejího vlastního výpočtu. Dotkne se nabidkaData, šablony CN (smyčka variant), náhledu NP, zámku a odeslání (zamkne se víc variant naráz).
>
> **Pracnost:** L · **Dopad na cenu:** ne – každá varianta se počítá jako dnes; mění se jen to, že dokument nese víc cen

> 🟨 **[A3] Doporučení ověřit parametry u dodavatele výtahu před SoD** — *NÁVRH*
>
> **Kam patří:** Poznámka pod tabulkou A1 (vedle dnešních poznámek * a **)
>
> **Navržené znění:**
>
> *** Parametry a rozměry technologie výtahu jsou převzaty z podkladů objednatele. Doporučujeme je ověřit u dodavatele výtahu před uzavřením smlouvy o dílo.
>
> **Co to znamená pro aplikaci:** Pevný text šablony CN (+ náhled NP, NW_TEXT) a 3 překlady. Bez nového pole.
>
> **Pracnost:** S · **Dopad na cenu:** ne

**ZÁKLADNÍ PARAMETRY ŠACHTY**

| položka | provedení |
|---|---|
| UMÍSTĚNÍ ŠACHTY | v interiéru |
| UMÍSTĚNÍ VÝTAHOVÉHO STROJE | v horní části OCK výtahové šachty (bezstrojovnový výtah) |
| ULOŽENÍ KONSTRUKCE | na dně prohlubně výtahové šachty |
| CELKOVÁ VÝŠKA KONSTRUKCE [m] * | 27,68 |
| ROZMĚR ŠACHTY – VNITŘNÍ [mm] * | šířka 1810 × hloubka 2100 |
| ZDVIH VÝTAHU [m] * | 22,85 |
| DOLNÍ PŘEJEZD [mm] | 1250 |
| HORNÍ PŘEJEZD [mm] | 3580 |
| POČET STANIC / NÁSTUPIŠŤ | 6 / 6 · neprůchozí kabina |
| PŮDORYSNÉ ŘEŠENÍ ŠACHTY | pravoúhlý tvar |
| USAZENÍ OCK – ČELNÍ STĚNA | přisazena k podestám (dle odchylky podest od svislice) |

** Uvažované rozměry nabízené šachty vychází ze zadání objednatele. Po přesném zaměření skutečného stavu zhotovitelem se mohou změnit!*

**KONSTRUKČNÍ ŘEŠENÍ ŠACHTY**

| položka | provedení |
|---|---|
| TYP KONSTRUKCE (ENG-M) | montovaná, průběžná |
| SVISLÉ NOSNÉ PRVKY | 4x rohový sloupek, ocelový uzavřený profil |
| PROFIL SLOUPKŮ ** | jekl 80x40 |
| VODOROVNÉ NOSNÉ PRVKY | příčníky z ocelových uzavřených profilů |
|  | svislá rozteč příčníků: · cca 1 250 mm |
| PROFIL PŘÍČNÍKŮ ** | jekl 80x40 |
| KOTVENÍ KONSTRUKCE (POLOHA) | prohlubeň, podesty ve všech nástupištích a hlava šachty |
| KOTVENÍ KONSTRUKCE (TYP) | kontaktní, přes chemické kotvy do zdiva |
| ŘEŠENÍ PORTÁLŮ (PROSTOROVÉ) | bez předsazených portálů |
| ŘEŠENÍ PORTÁLŮ (ČLENĚNÍ) | plechové nadpraží nade dveřmi |
| POVRCHOVÁ ÚPRAVA KONSTRUKCE | matný ochranný lak, odstín RAL 7016 |
| HÁKY PRO ČIŠTĚNÍ ŠACHTY | nejsou součástí konstrukce |
| STŘECHA ŠACHTY | bez zastřešení (OCK končí pod stropem) |
| POŽÁRNÍ KLASIFIKACE KONSTRUKCE | materiály DP1, opláštění bez deklarované požární odolnosti |

*** parametry profilů se mohou změnit po zpracování statického posouzení*


> 🟨 **[A5] Mez statiky — OK nese jen výtah** — *NÁVRH*
>
> **Kam patří:** Sekce Konstrukční řešení šachty, nový řádek
>
> **Navržené znění:**
>
> • ZATÍŽENÍ KONSTRUKCE: OK je navržena pouze na zatížení od výtahu a vlastního opláštění. Pro zatížení od jiných částí stavby (schodišťová ramena, střecha objektu, balkony apod.) navržena není.
>
> **Co to znamená pro aplikaci:** Pevný řádek šablony (+ náhled NP) nebo výchozí text nového řádku technické specifikace (TECHSPEC_DEF), aby šel u atypu přepsat. Překlady.
>
> **Pracnost:** S · **Dopad na cenu:** ne

> 🟨 **[E4] Únosnost nosných konstrukcí objektu pro kotvení** — *NÁVRH*
>
> **Kam patří:** Konstrukční řešení — doplněk řádku Kotvení konstrukce (typ)
>
> **Navržené znění:**
>
> Konstrukce objektu musí být pro kotvení OK staticky vyhovující; není-li, navrhne zhotovitel jiný způsob kotvení jako vícepráci se součinností objednatele.
>
> **Co to znamená pro aplikaci:** Výchozí text technické specifikace (doplněk TS_KOTVENI_TYP) nebo řádek DALŠÍ UJEDNÁNÍ. Dnes je „Statika objektu" v kapitole IV. jako požadavek — sjednotit.
>
> **Pracnost:** S · **Dopad na cenu:** ne (vícepráce jen ohlašuje, nic neoceňuje)

> 🟨 **[E5] Hydroizolace prohlubně a kotvení** — *NÁVRH*
>
> **Kam patří:** Konstrukční řešení — Kotvení konstrukce (poloha), doplněk
>
> **Navržené znění:**
>
> V prohlubni: krytí hydroizolace v ŽB prohlubni pro kotvení OK min. 200 mm zajistí objednatel.
>
> **Co to znamená pro aplikaci:** Výchozí text technické specifikace; hodnotu (200 mm) potvrdí technik pro naše kotvy.
>
> **Pracnost:** S · **Dopad na cenu:** ne

> 🟨 **[E6] Nestandardní odstíny za individuální kalkulaci** — *NÁVRH*
>
> **Kam patří:** Konstrukční řešení — Povrchová úprava konstrukce, doplněk
>
> **Navržené znění:**
>
> Metalické, kovářské a pastelové odstíny na vyžádání za individuální kalkulaci.
>
> **Co to znamená pro aplikaci:** Výchozí text technické specifikace (bez ceny — jen věta).
>
> **Pracnost:** S · **Dopad na cenu:** ne

**OPLÁŠTĚNÍ ŠACHTY**

| položka | provedení |
|---|---|
| TYP OPLÁŠTĚNÍ | plnostěnné |
| MATERIÁL OPLÁŠTĚNÍ | vrstvené bezpečnostní sklo VSG |
| POVRCHOVÁ ÚPRAVA OPLÁŠTĚNÍ | čiré sklo |
| OPLÁŠTĚNÍ ČELA POD NÁSTUPIŠTĚM | plech v celé ploše podesty |
| ROZSAH OPLÁŠTĚNÍ | kompletní opláštění šachty |
| OPLÁŠTĚNÍ NADSVĚTLÍKŮ | lakovaný ocelový plech |
| VNĚJŠÍ OPLÁŠTĚNÍ ŠACHTY | kotvené na vnější stranu ocelové konstrukce |
| ZPŮSOB KOTVENÍ OPLÁŠTĚNÍ | na zasklívací terče |
| VZHLED KOTVENÍ ZASKLENÍ | obdélníkový terč 80x50, lakovaný RAL 7016, zapuštěné pozink šrouby |
| NAPOJENÍ ŠACHETNÍCH DVEŘÍ | dokrytí lakovaným plechem |

> 🟨 **[A4] Odstup opláštění od světlých rozměrů** — *NÁVRH*
>
> **Kam patří:** Sekce Opláštění šachty, nový řádek
>
> **Navržené znění:**
>
> • ODSTUP OPLÁŠTĚNÍ OD SVĚTLÝCH ROZMĚRŮ ŠACHTY: min. NN mm – dodavatel výtahu ho musí zohlednit (zábradlí na kabině nebo háková uzávěra kabinových dveří); řešení odstupových vzdáleností není součástí dodávky
>
> **Co to znamená pro aplikaci:** Technická specifikace: nové pole „odstup opláštění [mm]" s předvyplněním podle profilu sloupku a umístění opláštění (vnější strana OK), ručně přepsatelné. Text upozornění pevný. Nový symbol TS_ODSTUP_OPLASTENI. Hodnotu (vzorec) musí potvrdit technik — nevymýšlet.
>
> **Pracnost:** M · **Dopad na cenu:** ne

**DOPLŇKOVÉ KONSTRUKCE**

| položka | provedení |
|---|---|
| MONTÁŽNÍ NOSNÍK NEBO OKA | na horním nosném rámu OCK |
| PŘÍPRAVA PRO KOTVENÍ VÝTAHU | ano, oválné otvory pro kotvení konzolí vodítek a šachetních dveří v příčnících OCK včetně dodávky T šroubů M12 s podložkou |
| ODVĚTRÁNÍ ŠACHTY | přirozené, do prostoru schodiště |
| PŘECHODOVÉ PLECHY V NÁSTUPIŠTÍCH | nejsou součástí dodávky, viz příplatkové ceny |

**STAVEBNÍ A PŘÍPRAVNÉ PRÁCE**

| položka | provedení |
|---|---|
| LEŠENÍ – UVNITŘ ŠACHTY | je součástí dodávky pouze po dobu stavby šachty |
| LEŠENÍ – VNĚ ŠACHTY | není součást dodávky, lze doplnit viz příplatkové ceny |
| ZÁBRANY DO DVEŘNÍCH VSTUPŮ | lze doplnit – viz příplatkové ceny |

**PROJEKČNÍ A PŘÍPRAVNÉ PRÁCE**

| položka | provedení |
|---|---|
| ZAMĚŘENÍ PROSTORŮ 3D SKENEREM | ano |
| VÝSTUP ZE ZAMĚŘENÍ PRO OBJEDNATELE | ano |
| ZPRACOVÁNÍ DÍLENSKÉ DOKUMENTACE | ano |
| OVĚŘOVACÍ STATICKÝ VÝPOČET KONSTRUKCE | ano |

> 🟨 **[C1] Zaškrtávací tabulka standardního rozsahu** — *NÁVRH*
>
> **Kam patří:** Sekce Projekční a přípravné práce → přejmenovat na „STANDARDNÍ ROZSAH DODÁVKY"
>
> **Navržené znění:**
>
> • zaměření skutečného stavu 3D skenerem a jeho vyhodnocení: ✔
> • koordinace s dodavatelem výtahu a se stavbou: ✔
> • dílenská dokumentace / ověřovací statický výpočet: ✔ / ✔
> • doprava osob a materiálu, manipulace na stavbě: ✔
> • výroba, dodávka a montáž OK vč. opláštění: ✔
> • vedení montážního deníku: ✔
> • likvidace odpadu a úklid po našich pracích: ✔
>
> **Co to znamená pro aplikaci:** 4 řádky už jsou (TS_SKEN3D, TS_VYSTUP_ZAMERENI, TS_DILENSKA_DOK, TS_STATIKA). Nové řádky pevné v šabloně (vždy ✔) nebo výchozí texty technické specifikace. Ověřit, že úklid a odpad opravdu děláme vždy (jinak by šlo o slib bez ceny).
>
> **Pracnost:** S · **Dopad na cenu:** ne

**SOUČÁSTÍ DODÁVKY NENÍ**

| položka | provedení |
|---|---|
| OSVĚTLENÍ NÁSTUPIŠŤ | není součástí nabídky |
| NUCENÉ VĚTRÁNÍ ŠACHTY VENTILÁTOREM | není požadováno |
| LEŠENÍ KOLEM OCK PRO PROVEDENÍ OPLÁŠTĚNÍ | nabízeno jako příplatek |
| ODBĚRNÉ MÍSTO EL. ENERGIE PO DOBU REALIZACE | bezúplatně zajistí objednatel |
| ÚLOŽNÉ PROSTORY | bezúplatně zajistí majitel objektu |
| DOZDĚNÍ KOLEM ŠACHETNÍCH DVEŘÍ | zajistí objednatel |
| STAVEBNÍ PŘÍPRAVA | zajistí objednatel v rámci SP |
| OPLECHOVÁNÍ SOKLU PROHLUBNĚ | není součástí nabídky |
| NAPÁJENÍ VÝTAHU VČET. REVIZNÍ ZPRÁVY | není součástí nabídky |
| PROHLUBEŇ PRO ZALOŽENÍ OCK VE SPRÁVNÉ POZICI A ROZMĚRU | zajistí objednatel v rámci SP |
| DOSTATEČNÉ PŘÍSTUPOVÉ A MANIPULAČNÍ PROSTORY | zajistí objednatel v rámci SP |

> 🟨 **[C2] „Nabídka NEOBSAHUJE" — doplnit řádky** — *NÁVRH*
>
> **Kam patří:** Sekce Součástí dodávky není, nové řádky
>
> **Navržené znění:**
>
> • PROJEKT A STATIKA ZALOŽENÍ ŠACHTY, PD PRO POVOLENÍ STAVBY: zajistí objednatel
> • UZEMNĚNÍ OCK: zajistí objednatel (zemnicí pásek v prohlubni)
> • OSVĚTLENÍ ŠACHTY: není součástí nabídky
> • VNITŘNÍ STĚNY PRO ODSTUPOVÉ VZDÁLENOSTI KABINY: není součástí nabídky (viz A4)
> • GEODETICKÉ ZAMĚŘENÍ OCK: není součástí nabídky
> • ZAPLACHTOVÁNÍ HRUBÉ OK PRO MONTÁŽ VÝTAHU: zajistí objednatel
> • OCHRANA PODLAH A ZAŘÍZENÍ STAVENIŠTĚ (voda, WC): zajistí objednatel
> • ČIŠTĚNÍ ŠACHTY OD NEČISTOT JINÝCH PROFESÍ, OPRAVY PO DLOUHÉM PŘERUŠENÍ PRACÍ: není součástí nabídky
> • PRÁCE MIMO BĚŽNOU PRACOVNÍ DOBU: po dohodě za příplatek
>
> **Co to znamená pro aplikaci:** Nové symboly TS_NENI_* s výchozím textem v technické specifikaci (TECHSPEC_DEF), řádky šablony CN + náhled NP + překlady. Řádek „práce mimo pracovní dobu" se tluče s dnešní odrážkou kapitoly IV. „možnost práce o víkendech" — rozhodnout jedno. Zádržné z ATA (nepřijímají) NEPŘEBÍRAT: u nás je zádržné podmínkou krycího listu.
>
> **Pracnost:** M · **Dopad na cenu:** ne

> 🟨 **[E3] Otvory pro LIP / LOP v opláštění** — *NÁVRH*
>
> **Kam patří:** Součástí dodávky není — nový řádek
>
> **Navržené znění:**
>
> • OTVORY V OPLÁŠTĚNÍ PRO DISPLEJE (LIP), PŘIVOLÁVAČE (LOP) A DALŠÍ PRVKY VÝTAHU: nejsou součástí nabídky (lze na vyžádání)
>
> **Co to znamená pro aplikaci:** Jeden symbol TS_NENI_OTVORY s výchozím textem; u skla zásadní (vrtání po kalení nejde).
>
> **Pracnost:** S · **Dopad na cenu:** ne

## B. OBCHODNÍ ČÁST NABÍDKY:

### I. CENOVÁ NABÍDKA:

| | |
|---|---|
| VÝTAHOVÁ ŠACHTA — rozsah dodávky dle Technické části nabídky - A. TECHNICKÁ SPECIFIKACE VÝTAHOVÉ ŠACHTY | X Kč bez DPH |
| DPH 12 % (snížená sazba) | X Kč |
| CELKEM za nabídku | X Kč včetně DPH |

Poznámky k cenové nabídce:

a. cena vychází z technické specifikace nabídky – viz výše
b. DPH bude účtováno dle aktuálně platných daňových předpisů
c. k úpravě celkové ceny může dojít po přesném zaměření a vyhodnocení statiky

*Dojde-li v průběhu realizace díla k VÝRAZNÉMU zvýšení cen vstupních materiálů, oceli, skla a dopravného a paliv, může zhotovitel cenu díla zvýšit o tento rozdíl. Pro posouzení cenových změn se přihlíží k cenám platným v době uzavření smlouvy o dílo (nebo objednávky) ve srovnání s cenami platnými v době, kdy byl zhotovitel povinen dílo provést.*

### II. ROZŠÍŘENÍ CENOVÉ NABÍDKY – Příplatky:

- **Sklo VSG s mléčnou fólií** … X Kč bez DPH
- **Přechodové plechy** — materiál a montáž … X Kč bez DPH
- **MADLA NA BOČNÍCH STĚNÁCH (dřevo, lak)** … X Kč bez DPH
- **MADLA NA ZADNÍ STĚNĚ (dřevo, lak)** … X Kč bez DPH
- **ZÁBRANY DO DVEŘNÍCH VSTUPŮ** … X Kč bez DPH
- **LEŠENÍ - dokončení hlavy šachty** … X Kč bez DPH
- **LEŠENÍ - vnější** … X Kč bez DPH
- **ENGINEERING** … X Kč bez DPH
> 🟨 **[B1] Lešení: pronájem N dní v ceně + denní sazba** — *NÁVRH*
>
> **Kam patří:** II. Příplatky — popis u příplatku „LEŠENÍ – vnější"
>
> **Navržené znění:**
>
> LEŠENÍ – vnější … X Kč bez DPH
> Cena obsahuje pronájem lešení na NN kalendářních dní. Bude-li lešení na stavbě déle z důvodů na straně objednatele nebo třetí osoby, účtuje se pronájem X Kč bez DPH za každý započatý den.
>
> **Co to znamená pro aplikaci:** Ceník OCK: nová položka „lešení – pronájem za den navíc" (sazbu určí J. V.) a firemní údaj „počet dní pronájmu v ceně" (Nastavení → Firma). Popis příplatku se složí z obou hodnot; bez vyplněné sazby se věta netiskne (ceny se nevymýšlejí).
>
> **Pracnost:** M · **Dopad na cenu:** ano – nová sazba v ceníku (základní cena se nemění, jde o podmínku příplatku)

> 🟨 **[B2] Dokrytí dveří za kus** — *NÁVRH*
>
> **Kam patří:** II. Příplatky — nový příplatek s jednotkou
>
> **Navržené znění:**
>
> DOKRYTÍ ŠACHETNÍCH DVEŘÍ – NEREZ BRUS … X Kč bez DPH / 1 ks
> V základní ceně je dokrytí lakovaným plechem v odstínu OK. Cena platí pro rozvinutou šíři plechu do 100 mm.
>
> **Co to znamená pro aplikaci:** Příplatky dnes nesou celkovou částku. Návrh: příplatek s jednotkou a jednotkovou cenou (ks / bm), počet z nástupišť; nová položka ceníku. V dokumentu „X Kč / 1 ks".
>
> **Pracnost:** M · **Dopad na cenu:** ano – nová položka ceníku

> 🟨 **[B3] Přechod prahu za kus** — *NÁVRH*
>
> **Kam patří:** II. Příplatky — dnešní „Přechodové plechy" s jednotkou a podmínkou
>
> **Navržené znění:**
>
> PŘECHOD MEZI PRAHEM DVEŘÍ A PODLAHOU NÁSTUPIŠTĚ … X Kč bez DPH / 1 ks
> Bez tohoto příplatku provede přechod objednatel stavebně (dobetonování, dlažba). Cena platí pro rozvinutou šíři plechu do 100 mm.
>
> **Co to znamená pro aplikaci:** Stávající příplatek „Přechodové plechy" — doplnit popis (text v ceníku / katalogu) a zobrazení za kus (jednotka jako B2).
>
> **Pracnost:** S · **Dopad na cenu:** ne – položka už je; jen jednotka a popis (při přepočtu na kus ano)

> 🟨 **[B4] Kotevní lišty (HALFEN) za bm** — *NÁVRH*
>
> **Kam patří:** II. Příplatky — nový příplatek s jednotkou bm
>
> **Navržené znění:**
>
> PŘÍPRAVA PRO KOTVENÍ VÝTAHU – KOTEVNÍ LIŠTY (např. HALFEN) … X Kč bez DPH / 1 bm
> V základní ceně jsou oválné otvory pro kotvení konzol vodítek a šachetních dveří v příčnících OCK.
>
> **Co to znamená pro aplikaci:** Nová položka ceníku s jednotkou bm a množstvím z výšky OK × počet linií (vzorec potvrdí technik). Stejný mechanismus jednotek jako B2.
>
> **Pracnost:** M · **Dopad na cenu:** ano – nová položka ceníku

> 🟨 **[B5] Nerezové úchyty skel (estetický příplatek)** — *NÁVRH*
>
> **Kam patří:** II. Příplatky — nový příplatek
>
> **Navržené znění:**
>
> KOTVENÍ ZASKLENÍ – NEREZ BRUS … X Kč bez DPH
> Estetický příplatek; v základní ceně terče lakované v odstínu OK.
>
> **Co to znamená pro aplikaci:** Nová položka ceníku (podle počtu terčů z výpočtu). Při volbě se v technické specifikaci změní „Vzhled kotvení zasklení".
>
> **Pracnost:** M · **Dopad na cenu:** ano – nová položka ceníku

> 🟨 **[B6] Mléčná fólie a madla — popisy** — *NÁVRH*
>
> **Kam patří:** II. Příplatky — popis u stávajících položek
>
> **Navržené znění:**
>
> Sklo VSG s mléčnou fólií … X Kč bez DPH — Estetický příplatek; cena za celé opláštění.
> MADLA … — s instalací na stěnu šachty, alternativně na stěnu schodiště.
>
> **Co to znamená pro aplikaci:** Jen texty popisu u příplatků (ceník / katalog). Položky už máme.
>
> **Pracnost:** S · **Dopad na cenu:** ne

### III. PLATEBNÍ PODMÍNKY:

**Cena díla je splatná v následujících dílčích splátkách:**

a) 1. dílčí daňový doklad ve výši 50 % (bez DPH) z celkové ceny díla bude vystaven po podpisu SoD. Úhrada tohoto daňového dokladu je podmínkou pro dodržení předem dohodnutých realizačních termínů.
b) Po ukončení výroby, dodání materiálu na stavbu a po zahájení prací bude vystaven 2. dílčí daňový doklad ve výši 40 % (bez DPH) z celkové ceny díla. Úhrada tohoto daňového dokladu je podmínkou pro předání díla objednateli.
c) Po ukončení všech výše uvedených prací a po řádném předání a převzetí celého díla předávacím protokolem bude vystaven 3. konečný daňový doklad na zbývajících 10 % ceny díla bez DPH, k níž bude připočtena DPH v zákonné výši.

*Poznámky k platebním podmínkám: v případě podepsané rámcové nebo subdodavatelské smlouvy, platí dohodnuté podmínky z těchto smluv. Bude-li potřeba upravit tyto standardní platební podmínky, jsme připraveni k jejich projednání na úrovni vedení společnosti.*

**Splatnost faktur a platnost nabídky:**

- Splatnost faktur 14 dní ode dne vystavení.
- Platnost této nabídky je 2 měsíce od data uvedeného v záhlaví.

> 🟨 **[D1] Zálohy vázané na výrobu a montáž** — *NÁVRH*
>
> **Kam patří:** III. Platební podmínky — věty platebního kalendáře
>
> **Navržené znění:**
>
> a) … po podpisu SoD. Úhrada je podmínkou pro zadání výroby a dodržení dohodnutých termínů.
> b) … po dodání materiálu na stavbu (nebo do skladu zhotovitele, nelze-li montovat z důvodů na straně objednatele). Úhrada je podmínkou pro zahájení montáže.
> c) konečný daňový doklad … beze změny.
>
> **Co to znamená pro aplikaci:** Věty platebního kalendáře jsou v Nastavení → Firma (podminky.js `vety`, ukládá se znění Firmy) — bez kódu, jen text a překlady EN/DE/FR. Procenta (50/40/10) se nemění. Pozor: mění text SoD jen tam, kde SoD bere tytéž věty (ověřit).
>
> **Pracnost:** S · **Dopad na cenu:** ne (procenta beze změny)

> 🟨 **[D2] Přerušení prací při neplacení** — *NÁVRH*
>
> **Kam patří:** III. Platební podmínky — poznámka pod splátkami
>
> **Navržené znění:**
>
> Při prodlení objednatele s úhradou splatné faktury zhotovitel přeruší práce do jejího uhrazení. Dohodnuté termíny se posouvají podle aktuálních montážních kapacit zhotovitele.
>
> **Co to znamená pro aplikaci:** Pevný text šablony (poznámka k platebním podmínkám, NW_TEXT.poznPlatby) nebo text Firmy. Překlady. Ověřit soulad se SoD (právní text — rozhoduje J. V.).
>
> **Pracnost:** S · **Dopad na cenu:** ne

### IV. POŽADAVKY PRO PROVEDENÍ REALIZACE:

- Pro dokončení projekční části je nutné poskytnout finální dispoziční výkresy výtahové technologie
- Dohoda ohledně termínů realizace a součinnosti s dodavatelem technologie výtahu
- Nutná koordinace s celkovým harmonogramem stavby.
- Zajištění přístupu na místo realizace a do všech prostor s realizací díla souvisejících včetně transportních cest (nutné dojednat před zahájením přípravných prací)
- Ochrana proti pádu nesmí bránit naší instalaci
- Zajištění montážního lešení
- Prostor pro skladování materiálu a nářadí během montáže
- Parkovací místo v bezprostřední blízkosti stavby pro potřeby montáže a vykládání materiálu.
- Připojení na elektřinu 230V
- Bez časového omezení v běžné pracovní době, možnost práce o víkendech
- WC
- Statika objektu a zkušební statika

> 🟨 **[C3] Podklady od objednatele k podpisu SoD** — *NÁVRH*
>
> **Kam patří:** IV. Požadavky pro provedení realizace — nový první blok
>
> **Navržené znění:**
>
> Objednatel předá nejpozději ke dni podpisu SoD (resp. do 7 dnů po podpisu):
> a) platnou projektovou dokumentaci stavby (výkresy PDF nebo DWG + technická zpráva),
> b) platný dispoziční výkres technologie výtahu,
> c) požárně bezpečnostní řešení stavby (PBŘ),
> d) odstín povrchové úpravy OK dle RAL (a odstín oplechování).
>
> **Co to znamená pro aplikaci:** Text kapitoly IV. v Nastavení → Firma (bez kódu). Dnešní první odrážka „finální dispoziční výkresy" by se nahradila. Volitelně pole „termín předání podkladů" v krycím listu.
>
> **Pracnost:** S · **Dopad na cenu:** ne

> 🟨 **[E7] Příloha „Podmínky stavební připravenosti a montáže"** — *NÁVRH*
>
> **Kam patří:** Nová příloha nabídky (nebo SoD) za kapitolou IV.
>
> **Navržené znění:**
>
> Stavební připravenost: čistá a suchá prohlubeň dle dispozičního výkresu zhotovitele; v šachtě žádná cizí vedení (ČSN EN 81-20); zabezpečené otvory proti pádu; hasicí přístroj.
> Výpomocné práce objednatele: podbetonování prahů, zapravení kolem dveří, malířské opravy, příjezd nákladních vozidel do 30 m, sklad do 20 m, přípojka 230 V / 16 A do 20 m, zemnicí pásek v prohlubni.
> Lešení objednatele (je-li jeho dodávkou): podlážky do 300 mm od OK, montážní nosník v hlavě šachty (hodnoty potvrdí technik).
>
> **Co to znamená pro aplikaci:** Nový text Firmy (nová kapitola) nebo samostatná příloha k nabídce. Dnes část v kapitole IV. a v Součástí dodávky není — sjednotit, ať se texty neopakují. Čísla (30 m, 20 m, 16 A, 300 mm) jsou ATA — naše musí určit technik.
>
> **Pracnost:** M · **Dopad na cenu:** ne

### V. TERMÍNY REALIZACE:

- Zahájení montáže dle dohody po podpisu SoD a odsouhlasení finálních dispozičních výkresů celé technologie výtahu a šachty.
- Montáž ocelové konstrukce výtahové šachty cca 1-2 týdny.
- Následné opláštění konstrukce šachty cca 1-2 týdny.
- Dokončovací práce do cca 2 týdny po ukončení montáže technologie výtahu – šachetních dveří.
- Harmonogram montáže bude vypracován cca 3 týdny po podpisu smlouvy.
- Záruka: 60 měsíců

> 🟨 **[D3] Teplotní limit montáže +5 °C** — *NÁVRH*
>
> **Kam patří:** V. Termíny realizace — nová odrážka
>
> **Navržené znění:**
>
> Montáž lze provádět při teplotě od +5 °C (dle technických listů materiálů, např. tmely a lepidla zasklení). Při poklesu pod limit se nové termíny sjednají dodatkem ke SoD.
>
> **Co to znamená pro aplikaci:** Text kapitoly V. v Nastavení → Firma. Technik potvrdí, které naše práce limit opravdu mají (montovaná OK bez nátěrů na stavbě — možná jen zasklení/tmely); u exteriéru důležitější.
>
> **Pracnost:** S · **Dopad na cenu:** ne

### VI. PŘEDÁNÍ DÍLA:

- 1.  předávací protokol bude požadován po dokončení montáže ocelové konstrukce
- 2.  předávací protokol bude požadován po provedení opláštění výtahové šachty
- 3.  předávací protokol bude požadován po provedení dokončovacích prací při předání a převzetí díla.

*Předávací protokol z bodů 1. a 2. lze nahradit oboustranně podepsaným zápisem do montážního deníku.*

> 🟨 **[D4] Předání hrubé OK pro montáž výtahu** — *NÁVRH*
>
> **Kam patří:** VI. Předání díla — upřesnění bodu 1.
>
> **Navržené znění:**
>
> Předáním hrubé OK pro montáž výtahu se rozumí předání ocelového skeletu šachty vč. povrchové úpravy, bez opláštění. Případné dočasné zaplachtování proti povětrnosti zajišťuje objednatel.
>
> **Co to znamená pro aplikaci:** Text kapitoly VI. v Nastavení → Firma (doplnit k bodu 1.). Souvisí s C2 (zaplachtování).
>
> **Pracnost:** S · **Dopad na cenu:** ne

> 🟨 **[D5] Koordinátor objednatele a montážní deník** — *NÁVRH*
>
> **Kam patří:** IV. nebo VI. — nová odrážka
>
> **Navržené znění:**
>
> Objednatel určí svého koordinátora prací, který s vedoucím montáže zhotovitele potvrzuje zápisy v montážním deníku (převzetí připravenosti, výpomocné práce, předání).
>
> **Co to znamená pro aplikaci:** Text Firmy (kapitola IV. nebo VI.). V krycím listu už je zástupce objednatele ve věcech technických — lze odkázat na něj.
>
> **Pracnost:** S · **Dopad na cenu:** ne

### DOLOŽKY:

- Zjevné chyby v nabídkovém řízení mohou být opraveny před podpisem smlouvy.
- Autorská práva – Ukázková firma s.r.o. si vyhrazuje vlastnické a autorské právo k ilustracím, výkresům, skicám a jiným dokumentům a vzorkům. Tyto musí být na požádání neprodleně vráceny a nesmí být předány třetím stranám bez souhlasu Ukázková firma s.r.o..

> ⬜ **Nezapracováno (z ATA)**
>
> - **[N1] Marketingový blok o firmě** — nezapracováno, viz rozhodnutí J. V. 25. 11. 2026 (posudek CN-432, novinky 7–12 nezavádět)
> - **[N2] Podmínka snížené sazby DPH 12 % (prohlášení objednatele)** — nezapracováno, viz rozhodnutí J. V. 25. 11. 2026 (CN-432, novinka „podmínka DPH 12 %")

**Vypracoval:** (zpracovatel nabídky = přihlášený uživatel)

**Kancelář:** Ukázková firma s.r.o., Vzorová 1, 100 00  Praha, IČ: 000 00 000

---

## Přehled návrhů (štítky)

| štítek | návrh | kam | aplikace (zkráceně) | pracnost | cena |
|---|---|---|---|---|---|
| **A1** | Tabulka „Technologie výtahu" | A. Technická část, nová sekce na začátku technické specifikace (před Základními parametry šachty) | Kalkulace OCK: dvě nová evidenční pole (typ výtahu – výběr, nosnost kg); do výpočtu nevstupují | M | ne |
| **A2** | Více variant rozměrů v jedné nabídce | Tabulka A1 a Základní parametry šachty; v B. Obchodní části cena za každou variantu | Dnes je každá varianta samostatná nabídka (číslo s příponou .2) | L | ne – každá varianta se počítá jako dnes; mění se jen to, že dokument nese víc cen |
| **A3** | Doporučení ověřit parametry u dodavatele výtahu před SoD | Poznámka pod tabulkou A1 (vedle dnešních poznámek * a **) | Pevný text šablony CN (+ náhled NP, NW_TEXT) a 3 překlady | S | ne |
| **A4** | Odstup opláštění od světlých rozměrů | Sekce Opláštění šachty, nový řádek | Technická specifikace: nové pole „odstup opláštění [mm]" s předvyplněním podle profilu sloupku a umístění opláštění (vnější strana OK), ručně přepsatelné | M | ne |
| **A5** | Mez statiky — OK nese jen výtah | Sekce Konstrukční řešení šachty, nový řádek | Pevný řádek šablony (+ náhled NP) nebo výchozí text nového řádku technické specifikace (TECHSPEC_DEF), aby šel u atypu přepsat | S | ne |
| **B1** | Lešení: pronájem N dní v ceně + denní sazba | II. Příplatky — popis u příplatku „LEŠENÍ – vnější" | Ceník OCK: nová položka „lešení – pronájem za den navíc" (sazbu určí J | M | ano – nová sazba v ceníku (základní cena se nemění, jde o podmínku příplatku) |
| **B2** | Dokrytí dveří za kus | II. Příplatky — nový příplatek s jednotkou | Příplatky dnes nesou celkovou částku | M | ano – nová položka ceníku |
| **B3** | Přechod prahu za kus | II. Příplatky — dnešní „Přechodové plechy" s jednotkou a podmínkou | Stávající příplatek „Přechodové plechy" — doplnit popis (text v ceníku / katalogu) a zobrazení za kus (jednotka jako B2). | S | ne – položka už je; jen jednotka a popis (při přepočtu na kus ano) |
| **B4** | Kotevní lišty (HALFEN) za bm | II. Příplatky — nový příplatek s jednotkou bm | Nová položka ceníku s jednotkou bm a množstvím z výšky OK × počet linií (vzorec potvrdí technik) | M | ano – nová položka ceníku |
| **B5** | Nerezové úchyty skel (estetický příplatek) | II. Příplatky — nový příplatek | Nová položka ceníku (podle počtu terčů z výpočtu) | M | ano – nová položka ceníku |
| **B6** | Mléčná fólie a madla — popisy | II. Příplatky — popis u stávajících položek | Jen texty popisu u příplatků (ceník / katalog) | S | ne |
| **B7** | Výhody montované OK | Popis záměru (pod větou „MONTOVANÉ ocelové konstrukce") | Pevný text šablony CN (popis záměru) nebo text Firmy | S | ne |
| **C1** | Zaškrtávací tabulka standardního rozsahu | Sekce Projekční a přípravné práce → přejmenovat na „STANDARDNÍ ROZSAH DODÁVKY" | 4 řádky už jsou (TS_SKEN3D, TS_VYSTUP_ZAMERENI, TS_DILENSKA_DOK, TS_STATIKA) | S | ne |
| **C2** | „Nabídka NEOBSAHUJE" — doplnit řádky | Sekce Součástí dodávky není, nové řádky | Nové symboly TS_NENI_* s výchozím textem v technické specifikaci (TECHSPEC_DEF), řádky šablony CN + náhled NP + překlady | M | ne |
| **C3** | Podklady od objednatele k podpisu SoD | IV. Požadavky pro provedení realizace — nový první blok | Text kapitoly IV | S | ne |
| **D1** | Zálohy vázané na výrobu a montáž | III. Platební podmínky — věty platebního kalendáře | Věty platebního kalendáře jsou v Nastavení → Firma (podminky.js `vety`, ukládá se znění Firmy) — bez kódu, jen text a překlady EN/DE/FR | S | ne (procenta beze změny) |
| **D2** | Přerušení prací při neplacení | III. Platební podmínky — poznámka pod splátkami | Pevný text šablony (poznámka k platebním podmínkám, NW_TEXT.poznPlatby) nebo text Firmy | S | ne |
| **D3** | Teplotní limit montáže +5 °C | V. Termíny realizace — nová odrážka | Text kapitoly V | S | ne |
| **D4** | Předání hrubé OK pro montáž výtahu | VI. Předání díla — upřesnění bodu 1. | Text kapitoly VI | S | ne |
| **D5** | Koordinátor objednatele a montážní deník | IV. nebo VI. — nová odrážka | Text Firmy (kapitola IV | S | ne |
| **E1** | Věta o shodě / odchylce od zadávací PD | Popis záměru — první věta | Krycí list OCK nebo technická specifikace: výběr „shoda se zadávací PD" (odpovídá / neodpovídá / s odchylkami / neuvádět — výchozí neuvádět) | M | ne |
| **E2** | Kdo navrhuje OK a dokládá statiku | Popis záměru — za větou o montované OK | Pevný text šablony CN; tiskne se jen se zaškrtnutou statikou (TS_STATIKA = ano), jinak by slibovala neoceněné. | S | ne |
| **E3** | Otvory pro LIP / LOP v opláštění | Součástí dodávky není — nový řádek | Jeden symbol TS_NENI_OTVORY s výchozím textem; u skla zásadní (vrtání po kalení nejde). | S | ne |
| **E4** | Únosnost nosných konstrukcí objektu pro kotvení | Konstrukční řešení — doplněk řádku Kotvení konstrukce (typ) | Výchozí text technické specifikace (doplněk TS_KOTVENI_TYP) nebo řádek DALŠÍ UJEDNÁNÍ | S | ne (vícepráce jen ohlašuje, nic neoceňuje) |
| **E5** | Hydroizolace prohlubně a kotvení | Konstrukční řešení — Kotvení konstrukce (poloha), doplněk | Výchozí text technické specifikace; hodnotu (200 mm) potvrdí technik pro naše kotvy. | S | ne |
| **E6** | Nestandardní odstíny za individuální kalkulaci | Konstrukční řešení — Povrchová úprava konstrukce, doplněk | Výchozí text technické specifikace (bez ceny — jen věta). | S | ne |
| **E7** | Příloha „Podmínky stavební připravenosti a montáže" | Nová příloha nabídky (nebo SoD) za kapitolou IV. | Nový text Firmy (nová kapitola) nebo samostatná příloha k nabídce | M | ne |
| N1 | Marketingový blok o firmě | — | nezapracováno, viz rozhodnutí J. V. 25. 11. 2026 (posudek CN-432, novinky 7–12 nezavádět) | — | — |
| N2 | Podmínka snížené sazby DPH 12 % (prohlášení objednatele) | — | nezapracováno, viz rozhodnutí J. V. 25. 11. 2026 (CN-432, novinka „podmínka DPH 12 %") | — | — |

Pracnost: **S** = text nebo jedno pole (hodiny), **M** = nové pole / symbol / položka ceníku se šablonou, náhledem a překlady (den), **L** = změna skladby dokumentu nebo zámku (víc dní, rizikové — poradce předem).
