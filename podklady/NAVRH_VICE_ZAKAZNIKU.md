# Návrh v2: víc zákazníků na jedné zakázce (zkušební funkce „VZ“)

Poradce, v1 12. 11. 2026, **v2 16. 11. 2026**. Větev `claude/vz-navrh`, sloučeno s integrací `8462aea` (v12.11.7).
Kód aplikace se tímto návrhem nemění.

**Co mění v2** (připomínky J. V. 16. 11. 2026):
1. Dokud má zakázka jednoho zákazníka, aplikace vypadá a chová se přesně jako dnes. Navíc je jen tlačítko
   „+ Přidat zákazníka“ u pole Zákazník v hlavičce. Karta, přepínač ani štítky se neukážou (stejně jako u víc šachet).
2. Zákazníka jde odstranit (§ 2a). Po odstranění posledního dalšího zákazníka je zakázka i aplikace zpět
   ve standardním pohledu.
3. Čtyři otázky z v1 zůstaly bez odpovědi — návrh počítá s doporučenými volbami; otázky jsou znovu v § 11.

Klikací prototyp na skutečné aplikaci: https://claude.ai/artifact/8qc59CQ4prtV1a4cNQjY4V
(zdroj `podklady/vz_prototyp/`, snímky `podklady/vz_prototyp/snimky/`).

## 0. Zadání a shrnutí doporučení

Zadání J. V.: stejnou zakázku poptá víc zákazníků. Jedna nabídka může mít víc zákazníků ve stejné variantě,
zákazník může mít i vlastní variantu. Vše je napojené na **jeden deal** v Pipedrive; deal nese data řídící
varianty řídícího zákazníka, ostatní zákazníci jsou v dealu jen jako text (název firmy a platná nabídka).

Doporučení v jedné větě: **zákazníci jsou seznam uvnitř jedné zakázky** (ne propojené zakázky), první zákazník
zůstává v dnešní hlavičce a je řídící, další zákazníci leží vedle (`dalsiZakaznici`), každý ukazuje na jednu
variantu, nabídky dalších zákazníků nesou písmeno (`…9940-B`), a každý dokument se tiskne z „pohledu zákazníka“,
ve kterém ostatní zákazníci vůbec nejsou.

| téma | doporučení |
|---|---|
| datový model | seznam zákazníků v zakázce; hlavička = řídící zákazník (vzor víc šachet: první na původním místě, ostatní v `dalsi…`) |
| vazba na variantu | zákazník → jedna varianta („nabídka zákazníka“); víc zákazníků na téže variantě = sdílená |
| řídící | řídící varianta = varianta řídícího zákazníka; prodej jinému zákazníkovi z něj udělá řídícího (#563) |
| číslo CN | číslo varianty jako dnes + písmeno zákazníka: `…9940`, `…9940-B`, `…9940.2-B` |
| tisk | vždy pro jednoho zákazníka, z pohledu zákazníka (`vzPohled`) |
| zámek | varianta se zamkne prvním tiskem; tisk dalšímu zákazníkovi jen přidá razítko „komu“ se snímkem adresáta |
| Pipedrive | deal beze změny logiky (řídící); nové textové pole dealu „Další zákazníci (Kalkulátor)“, aplikace ho přepisuje celé |
| standardní pohled | s jedním zákazníkem jen tlačítko „+ Přidat zákazníka“; karta a přepínač až od druhého zákazníka |
| odstranění | každého dalšího zákazníka s potvrzením; odeslaná nabídka zůstává doložená v zámku varianty; řídícího a prodaného ne |
| vypínač | `viceZakazniku` v `/api/funkce`, výchozí VYP; s VYP a s jedním zákazníkem bajtově jako dnes |

## 1. Datový model

### 1.1 Doporučeno: zákazníci jako seznam na zakázce

```
zak.objednatel, zak.adresaObjednatele, zak.ico, zak.dic, zak.kontakt, zak.zastupci   ← ŘÍDÍCÍ zákazník (beze změny)
zak.vzRidici = { id: 'z1', pismeno: '', varianta: '<id varianty>' }                  ← jen když je zákazníků víc
zak.dalsiZakaznici = [                                                                ← chybí / [] = jeden zákazník = dnešek
  { id: 'z2', pismeno: 'B',
    hlavicka: { objednatel, adresaObjednatele, ico, dic, kontakt },
    zastupci: { …stejná pole jako zak.zastupci… },
    varianta: '<id varianty>',            // nabídka tohoto zákazníka (sdílená, nebo vlastní)
    platna: { varianta, cislo, kdy, cena, mena } | null,   // poslední ODESLANÁ nabídka (pro Pipedrive a rejstřík)
    zalozen: { kdo, kdy } }
]
```

- **Žádný klíč navíc, dokud je zákazník jeden.** `vzRidici` a `dalsiZakaznici` vzniknou přidáním druhého zákazníka
  a po odstranění posledního dalšího zákazníka se z dat smažou (vzor víc šachet: snížení na 1 = `dalsi: []`).
  Uložená zakázka je pak tvarem stejná jako zakázka, která víc zákazníků nikdy neměla.
- **Písmeno se nepočítá z uloženého čítače:** nové písmeno = první volné za nejvyšším písmenem, které nese některý
  další zákazník **nebo některé razítko tisku v zámku** (`zamek.tisky[].zakaznik.pismeno`). Písmeno, se kterým něco
  odešlo, se tak nikdy nepřidělí znovu, a písmeno, se kterým nic neodešlo, se po odstranění uvolní — bez stopy v datech.

- Hlavička zakázky je vždy řídící zákazník. Vše, co dnes čte `zak.objednatel` (Pipedrive, rejstřík, controlling,
  webhook, K40c, krycí list, SoD), funguje bez úprav a míří na řídícího zákazníka.
- Sdílená pro všechny zákazníky zůstává stavba: číslo zakázky, název akce, adresa stavby, datum, interní poznámky,
  přílohy, protokol.
- `v.zakaznik` (dnešní volný text „varianta zákazníka“ v seznamu variant) zůstává. Se zapnutou funkcí a víc
  zákazníky se sloupec jen ukazuje odvozeně (kdo na variantu ukazuje) a nejde přepsat.
- Jádro: nový soubor `src/vice_zakazniku.js` (čistá logika, vzor `vice_sachet.js`), obrazovka
  `src/ui/vice_zakazniku_ui.js`. Pozor na pravidlo z VS: sestavení je jeden `<script>`, jména funkcí s předponou `vz`.

### 1.2 Zvažovaná alternativa: samostatné zakázky propojené do skupiny

Každý zákazník by měl vlastní zakázku (soubor), zakázky by sdílely `skupina` a jedna by byla řídící.

| | seznam v zakázce (doporučeno) | propojené zakázky |
|---|---|---|
| sdílená varianta pro víc zákazníků | jedna varianta, jeden zámek, jistota stejného obsahu a ceny | kopie v každé zakázce, rozejdou se při první úpravě |
| jeden deal | `pdDealId` jednou, webhook a index beze změny | víc zakázek s týmž dealem — dnes zakázané (vlastnictví dealu #115, index `deal:<id>`) |
| číslo zakázky | jedno, duplicitu dál hlídá server | víc souborů se stejným základem čísla, nebo jiná čísla pro tutéž stavbu |
| prodej jinému zákazníkovi | přepnutí řídícího v jednom uložení | zápis do dvou souborů, souběh, dva zámky |
| únik údajů | riziko v jednom souboru → řeší pohled zákazníka a testy (§ 9) | fyzicky oddělené soubory (jediná výhoda) |
| controlling, rejstřík | jedna zakázka = jeden řádek | N řádků, které se nesmějí sečíst |

Propojené zakázky by vyžadovaly přepsat pravidla, na kterých stojí webhook, rejstřík a zámek. Výhodu oddělení
souborů nahradí pohled zákazníka s testem úniku. Proto seznam v zakázce.

## 2. Řídící zákazník a řídící varianta

- **Invariant:** řídící varianta zakázky = varianta řídícího zákazníka. Hlídá ho klient i server (vzor
  `prodRidiciSrovnej` — server nesoulad opraví, neodmítá).
- První zákazník je řídící od založení. Dokud je zákazník jeden, nic z toho není vidět.
- **Ruční změna řídícího zákazníka** (přepínač v kartě Zákazníci zakázky): autor zakázky a administrátor
  (stejné pravidlo jako změna vazby na deal v K40c), ostatní 403. Technicky výměna: hlavička ↔ položka
  `dalsiZakaznici[i]`, řídící varianta se přepne na variantu nového řídícího. Písmena se nemění.
- **Prodej jinému zákazníkovi:** „Prodáno“ se dává u zákazníka (ne u varianty). Před uložením potvrzení se
  seznamem před → po (viz prototyp, situace 3). Po potvrzení v jednom uložení: prodaná varianta = řídící (#563),
  její zákazník = řídící, hlavička nese jeho údaje, do dealu jdou data jeho varianty. Ostatní zákazníci zůstávají
  v zakázce se zamčenými nabídkami a v dealu mají poznámku „neprodáno“.
- Sdílená varianta prodaná jednomu ze zákazníků: prodej nese i `prodano.zakaznik = id` — bez toho by nebylo
  poznat, komu z adresátů se prodalo.
- Odemčení prodeje (vedoucí, administrátor) řídícího zákazníka nevrací; vrátí se ručně.
- Zmrazená hlavička (`zamekZakCestaZmrazena`): pravidla platí dál pro řídícího zákazníka. Údaje dalšího zákazníka
  se zmrazí, jakmile mu odešla SoD; název a adresa stavby se zmrazí po první odeslané nabídce komukoli
  (jsou vytištěné na papíře každého zákazníka) — to je zpřísnění proti dnešku jen u zakázek s víc zákazníky.
- Výměna řídícího smaže otisky webhooku (`pdZadani.otisk`) pro pole firmy, aby další webhook nepovažoval ručně
  vyměněné údaje za „své“ a nepřepsal je (§ 7.3).

## 2a. Standardní pohled, přidání a odstranění zákazníka (v2)

### Jeden zákazník = dnešní aplikace

- V hlavičce u pole Zákazník je tlačítko **„+ Přidat zákazníka“** (jen se zapnutou funkcí, jen kdo smí zakázku
  ukládat, ne u prodané zakázky). Nic jiného se nemění: žádná karta, přepínač, štítek, pruh u náhledu ani písmeno
  v čísle. Dokumenty, data i rejstřík jsou bajtově stejné jako dnes.
- Tlačítko otevře v hlavičce formulář (vzor panelu ARES): zákazník přes našeptávač a databázi zákazníků, IČO,
  „Najít firmu v ARES“, a volba nabídky — **stejná varianta jako řídící zákazník** (výchozí), nebo **vlastní varianta
  (kopie)**. Zrušení formuláře nic nezmění.
- Potvrzením vznikne druhý zákazník a teprve tehdy se objeví přepínač zákazníků v hlavičce (místo tlačítka; má
  vlastní „+“), karta „Zákazníci zakázky“ pod hlavičkou a pruh „náhled a tisk platí pro zákazníka X“.

### Odstranění zákazníka

Tlačítko **„Odstranit“** je u každého zákazníka v kartě. Vždy s potvrzením, které vypíše, co se stane:

| stav odstraňovaného zákazníka | co se stane |
|---|---|
| sdílí variantu, nic mu neodešlo | zákazník zmizí; varianta zůstává ostatním; písmeno se uvolní |
| vlastní varianta, neodeslaná | zákazník zmizí; v potvrzení volba: **smazat i jeho variantu** (výchozí) / ponechat ji jako běžnou variantu zakázky |
| odešla mu nabídka ze sdílené varianty | zákazník zmizí; razítko tisku se snímkem adresáta zůstává v zámku varianty (doklad); písmeno se už nepřidělí |
| odešla mu nabídka z vlastní varianty | zákazník zmizí; **zamčená varianta zůstává v zakázce jako doklad** s číslem z papíru (`…9940.2-B`), smazat ji smí jen správce jako dnes (#34); písmeno se už nepřidělí |
| řídící zákazník | odstranit nejde, dokud se řídícím nestane jiný (tlačítko zhasnuté s vysvětlením) |
| zákazník, kterému se prodalo | odstranit nejde; nejdřív odemknout prodej (vedoucí, administrátor) |

- **Údaje zákazníka** (název, sídlo, IČO, DIČ, kontakt, zástupci) se ze zakázky smažou. Karta v databázi zákazníků
  zůstává. V protokolu zakázky zůstane záznam „odstranil zákazníka X“ (jen název, žádné kontakty).
- **Odeslaná nabídka** se nikdy neruší potichu: platí dnešní pravidlo, že doklad o tom, co odešlo, v zakázce
  zůstává. Číslo doložené varianty se bere z razítka zámku (`zamek.cislo` + písmeno z razítka), ne ze seznamu
  zákazníků — proto drží i po odstranění.
- **Text v dealu:** při odstranění se pole „Další zákazníci (Kalkulátor)“ zapíše znovu bez tohoto zákazníka; po
  odstranění posledního dalšího zákazníka aplikace svůj text smaže (prázdné pole). Selže-li zápis, stav „čeká na
  zápis“ jako u ostatních zápisů (§ 7.2) — odstranění to nezastaví.
- **Rejstřík:** klíč `zakaznici` zmizí, štítek v Přehledu také.
- **Návrat do standardního pohledu:** po odstranění posledního dalšího zákazníka zmizí přepínač, karta i pruh
  a v hlavičce je zase jen tlačítko. V prototypu je hlavička po návratu znak po znaku stejná jako na začátku.
  Jediné, co může zůstat, je zamčená varianta odstraněného zákazníka (doklad) a záznam v protokolu.
- **Práva:** odstranit zákazníka, kterému nic neodešlo, smí kdo smí zakázku ukládat. Zákazníka s odeslanou nabídkou
  odstraní autor zakázky nebo administrátor (server z uložené verze a relace).
- **Server:** odstranění je výslovná akce v uložení; server ověří, že mizí jen zákazník, který není řídící ani
  prodaný, že razítka tisků zůstala beze změny a že zamčená varianta nezmizela bez práva `varianta.smazatUzamcenou`.

## 3. Číslování nabídek

**Doporučeno: jedno číslo zakázky, přípona varianty jako dnes, navíc písmeno zákazníka.**

| zákazník | varianta 1 | varianta 2 (kopie) |
|---|---|---|
| první (bez písmene) | `2026 - OPR - CN - 9940` | `2026 - OPR - CN - 9940.2` |
| druhý (B) | `2026 - OPR - CN - 9940-B` | `2026 - OPR - CN - 9940.2-B` |
| třetí (C) | `…9940-C` | `…9940.2-C` |

- První zákazník písmeno nemá: jeho čísla jsou stejná jako dnes a číslo v dealu (pole „Číslo nabídky (CN)“,
  podle kterého webhook hledá kalkulaci) se nemění.
- Písmeno patří zákazníkovi, ne roli. Po změně řídícího zákazníka se čísla odeslaných nabídek nemění
  (pravidlo #320: číslo na papíře se nikdy neposune). Písmeno odstraněného zákazníka se znovu přidělí jen tehdy,
  když s ním nic neodešlo (§ 1.1, § 2a).
- Strop 25 písmen (B–Z); doporučený strop v UI 9 dalších zákazníků, víc nedává obchodní smysl.
- Proč ne stejné číslo pro všechny: číslo SoD se odvozuje z čísla CN (`sodCisloNavrh`), název souboru taky;
  dva různé dokumenty pro dva zákazníky by nesly stejné číslo a v telefonu („máme nabídku 9940“) by nebylo
  poznat čí. Písmeno je i pojistka proti záměně souboru při odesílání.
- Proč ne vlastní číslo z řady pro každého zákazníka: webhook, index dealu, kontrola duplicit a rejstřík stojí
  na „jedna zakázka = jedno číslo“.
- Dotčená místa: `variantaCislo`, `cisloSVariantou` (nový nepovinný parametr zákazníka / pohled),
  `zamekCisloZakladSedi` (přípona `.N` a nově `-P`), `sodCisloNavrh` (písmeno zachovat), `nazvy_souboru.js`,
  `pdWebhookCisloKlic` (hledá podle základu — ověřit, že číslo s písmenem v dealu po prodeji najde tutéž zakázku).

## 4. Tisk nabídky, krycího listu a SoD pro konkrétního zákazníka

- V hlavičce se zapnutou funkcí a víc zákazníky přibude přepínač zákazníků (vzor přepínače šachet). Pole Zákazník,
  Kontaktní osoba, IČO, ARES a databáze zákazníků pracují s **otevřeným zákazníkem**. Otevřením zákazníka se
  otevře jeho varianta.
- Všechny dokumenty (náhled, Word CN, CN PROJ, krycí listy, SoD, plná moc, technická specifikace, porovnání,
  podklady) dostanou místo zakázky **pohled zákazníka**: `vzPohled(zak, idZakaznika)` = mělká kopie zakázky,
  kde hlavička a zástupci jsou údaje zvoleného zákazníka, `dalsiZakaznici` a `vzRidici` chybí a číslo nese jeho
  písmeno. Generátory dokumentů se tím nemění — dál čtou `zak.objednatel`. Jediné místo, kde se zákazník vybírá,
  je vstup do tisku.
- Tisk je vždy pro jednoho zákazníka. Hromadný tisk „všem“ = smyčka po zákaznících, každý soubor z vlastního
  pohledu (až v pozdější etapě).
- Varianta, na kterou zákazník neukazuje, se pro něj tisknout nedá (zábrana v kontrolách; důvod: aby mu neodešla
  cizí vlastní varianta).
- Karta „Cenová nabídka (CN)“ ukazuje pruh „Náhled a tisk platí pro zákazníka X — nabídka …-B“.
- Krycí list a SoD: jen pro zákazníka, kterému se prodalo, nebo pro otevřeného zákazníka; krycí list se vede
  po variantě jako dnes. U sdílené varianty jsou pole krycího listu svázaná s hlavičkou (`bind ZAK.*`) čtená
  z pohledu, ostatní pole sdílená — viz otázka 4.
- Název souboru: `…_9940-B_…`; název zákazníka v názvu souboru jde z pohledu.

## 5. Zámek a odeslání po zákaznících

- Zámek zůstává na variantě (obsah a cena „jako PDF“). První tisk komukoli variantu zamkne jako dnes.
- Každý záznam v `zamek.tisky[]` nově nese `zakaznik: { id, pismeno, cislo, objednatel, ico }` — snímek adresáta
  v okamžiku tisku (název se smí později opravit, razítko zůstane). U zakázky s jedním zákazníkem klíč chybí
  (zlatá sada beze změny).
- Stav nabídky zákazníka se odvozuje: `odeslána` = v zámku jeho varianty je tisk s jeho id; jinak `rozpracovaná`.
- Dotisk pro zákazníka: zmrazený výsledek varianty + snímek adresáta z jeho razítka.
- Zamčenou sdílenou variantu nejde upravit pro jednoho zákazníka → tlačítko „Vlastní varianta“ = `klonujVariantu`
  + přepnutí ukazatele zákazníka. Dosavadní odeslaná nabídka zůstává jeho `platna`, dokud neodejde nová.
- Server (`zakazka_kontrola.mjs`): razítka tisků drží z uložené verze (`uloZamekRazitkaDrz`); `dalsiZakaznici[i]`
  se zamčeným tiskem nejde smazat ani mu změnit písmeno; `platna` počítá server, klientovi nevěří.
- Schvalování slev: beze změny, sleva patří variantě. Sdílená varianta = jedna sleva pro všechny její zákazníky;
  jiná sleva = vlastní varianta.

## 6. Rejstřík a Přehled cenových nabídek

- Rejstřík: nepovinný klíč `zakaznici: [{ nazev, cislo, stav }]` jen u zakázek s víc zákazníky (vzor `sachty`
  z VS-E6), strop počtu a délky. `objednatel` zůstává řídící zákazník.
- Přehled: u zákazníka štítek „3 zákazníci“ (jen se zapnutou funkcí), hledání najde zakázku i podle názvu
  dalšího zákazníka. Rejstřík čtou všichni přihlášení — názvy dalších zákazníků v něm nejsou tajnější než dnešní
  `objednatel`; ceny dalších zákazníků do rejstříku nejdou.
- Karta „Kalkulace v zakázce“: sloupec Zákazník ukazuje, kteří zákazníci na variantu ukazují.
- Nová karta „Zákazníci zakázky“ (Kalkulace OCK pod hlavičkou a Přehled) **jen u zakázky s víc zákazníky**:
  řídící, zákazník, číslo nabídky, varianta, stav, cena, tlačítka Náhled / Tisk CN / Vlastní varianta / Prodáno /
  Odstranit. Přesný vzhled je v prototypu.
- Controlling: jedna zakázka = jeden řádek s řídícím zákazníkem; do popisu přibude počet zákazníků. Zámky
  dalších zákazníků se do období nepočítají dvakrát (sdílená varianta má jeden zámek).

## 7. Pipedrive

### 7.1 Deal = řídící varianta řídícího zákazníka

Zápis dealu (`pdZapisDealu`, `prodPdZapis`, suchý běh #536) se nemění: čte hlavičku a řídící variantu.
Po změně řídícího zákazníka tedy sám nese jeho data (hodnota, číslo nabídky, krycí list).

### 7.2 Ostatní zákazníci: jedno textové pole dealu

Doporučeno **vlastní pole dealu typu dlouhý text „Další zákazníci (Kalkulátor)“**, ne poznámka (note):

- pole jde přepsat jedním PATCH spolu s ostatními poli (stejný zápis, žádný token navíc); poznámky mají jen API v1,
  každá aktualizace by znamenala držet id poznámky, a ruční smazání poznámky by aplikace nepoznala;
- pole je vidět v detailu dealu a jde dát do filtru a sloupce;
- pole se nezakládá aplikací (pravidlo K40c „pole se nikdy nezakládá“): založí ho správce v Pipedrive, aplikace ho
  najde mapou polí (`pd_pole.mjs`). Chybí-li, suchý běh ukáže řádek „chybí pole“ a nic se nezapíše.
- Stejné pole vyřeší i otevřený bod VS-E5 (poznámka se seznamem šachet) — doporučuji druhé textové pole
  stejným mechanismem.

Tvar (aplikace vždy přepíše celý text; ruční úpravy v poli nevydrží):

```
Další zákazníci na zakázce (zapsal Kalkulátor 12. 11. 2026):
• BETA Development a.s. — CN 2026 - OPR - CN - 9940.2-B z 12. 11. 2026, 1 333 000 Kč bez DPH
• GAMA invest s.r.o. — nabídka zatím neodeslána (2026 - OPR - CN - 9940-C)
```

- „Platná nabídka“ = poslední **odeslaná** nabídka zákazníka (`platna`). Rozpracovaná nová varianta se uvede jen
  jako „připravuje se nová …“. Cena se uvádí jen u odeslané nabídky, bez DPH, v měně nabídky.
- Po prodeji: u ostatních „— neprodáno“. Jediný zákazník = pole prázdné (aplikace svůj text smaže).
- Do pole nejdou kontakty, osoby ani sleva. Délkový strop (20 000 znaků jako u šachet), řídicí znaky pryč.
- **Kdy se zapisuje:** se stejným zápisem jako dnes (Prodáno; ruční zápis), a nově po tisku nabídky dalšímu
  zákazníkovi a po přidání / odebrání zákazníka — jen když je deal navázaný a právo Pipedrive z matice (B80)
  to dovolí. Neúspěch zápisu tisk nezastaví: stav „čeká na zápis“ se ukáže u řádku Stav Pipedrive a zapíše do
  protokolu (vzor `prodano.pipedrive`).

### 7.3 Webhook #553, K40c a ARES

- Webhook a ARES na serveru (K40c) pracují jen s hlavičkou = s řídícím zákazníkem. `dalsiZakaznici`
  a `vzRidici` webhook nikdy nečte ani nemění; ARES se pro další zákazníky z webhooku nevolá.
- Další zákazníci se ověřují v ARES ručně stejným tlačítkem jako dnes (`ares_ui.js` nad otevřeným zákazníkem).
- **Organizace dealu po změně řídícího zákazníka:** deal v Pipedrive je dál veden na původní organizaci.
  K40c by to ukázalo jako „rozdíl ARES × Pipedrive“ a nabídlo „Opravit firmu v Pipedrive“ — to by ale **přejmenovalo
  cizí organizaci** na nového zákazníka. Proto:
  - tlačítko „Opravit firmu v Pipedrive“ smí být nabídnuto jen při shodě IČO organizace dealu s IČO hlavičky
    (doplnit do zadání K40c jako podmínku na serveru; liší-li se IČO, 409 s vysvětlením);
  - při neshodě IČO aplikace ukáže upozornění „deal je veden na X, řídící zákazník je Y“ a nabídne
    „Změnit organizaci dealu v Pipedrive…“ (autor, administrátor, po potvrzení; přepojí deal na organizaci
    s daným IČO, původní organizaci nemění) — nebo jen upozornění a ruční změnu v Pipedrive, viz otázka 3;
  - webhook při neshodě IČO firmu v hlavičce nepřepisuje (zajistí smazání otisků při výměně řídícího, § 2;
    přidat výslovný test) a do odpovědi dá varování.
- `pdVazbaWebhook`, odmítnuté dealy a zrušení vazby (K40c) se zákazníků netýkají — vazba je na zakázce.
- Slučitelnost při slučování větví: VZ sahá do `pd_webhook.mjs` jen testem; do `pd_organizace.mjs` (nová funkce
  K40c) přidává podmínku shody IČO. VZ se má programovat **po sloučení K40c**.

## 8. Práva, vypínač, zlatá sada

- Vypínač `viceZakazniku` v `FUNKCE_ZNAME` (`netlify/lib/funkce.mjs`), Nastavení → Zkušební funkce, jen
  administrátor, výchozí VYP. Rozhoduje server.
- **VYP + zakázka bez dalších zákazníků:** chování bajtově stejné (zlaté sady beze změny otisků, harness znak po
  znaku proti bázi jako `overit_vs_zadani.mjs` s `KNG_DIST_ZAKLAD`).
- **VYP + zakázka, která už další zákazníky má** (vypnuto po použití): data se nemažou, karta je jen ke čtení,
  tisk pro další zákazníky je zastaven s hláškou, server odmítne změnu `dalsiZakaznici` (vzor VS R21).
- **ZAP + jeden zákazník:** jediný rozdíl je tlačítko „+ Přidat zákazníka“ u pole Zákazník; dokumenty a data
  stejná. Harness porovná stránku s bází znak po znaku po odečtení tohoto jednoho tlačítka.
- **ZAP, přidat a zase odstranit zákazníka:** uložená zakázka je shodná s tou před přidáním (až na protokol
  a razítko úpravy) — samostatný test „bez stop“.
- Práva: přidat zákazníka, upravit ho, vlastní varianta, tisk — kdo smí zakázku ukládat (jako dnes hlavičku).
  Změna řídícího zákazníka a změna organizace dealu — autor zakázky a administrátor (server z uložené verze a
  relace). Prodáno jako dnes; odemčení vedoucí a administrátor. Role „jen čtení“ vidí kartu bez tlačítek.
- Zlatá sada `src/test_vz_zlata.js`: (a) VYP = dnešní otisky, (b) ZAP s jedním zákazníkem = dnešní otisky,
  (c) pohled prvního zákazníka u zakázky s víc zákazníky = dokumenty téže zakázky s jedním zákazníkem.

## 9. Rizika

**R1 — únik údajů jednoho zákazníka do dokumentu jiného (nejvážnější).**
- Jediný vstup dokumentů je `vzPohled`; pohled další zákazníky neobsahuje vůbec, takže generátor nemá z čeho
  uniknout. Statická kontrola: v `nabidka*.js`, `sod.js`, `kryci*.js`, `docxgen.js`, `dokumenty.js`,
  `nazvy_souboru.js` se nesmí vyskytnout `dalsiZakaznici`.
- Test „kanárek“ `src/test_vz_unik.js`: každý zákazník má jedinečné řetězce ve všech polích (název, sídlo, IČO,
  DIČ, kontakt, zástupci, název vlastní varianty, poznámka varianty, cena vlastní varianty). Pro každý typ
  dokumentu × každého zákazníka × jazyk se v celém výstupu (XML Wordu, HTML náhledu, název souboru, CSV, JSON
  podkladů) nesmí najít kanárek jiného zákazníka. Pojistka proti prázdnému testu: bez pohledu test selže.
- Sdílená pole zakázky, která se tisknou: popis záměru, úvodní fotka, název akce, adresa. Kontrola před tiskem
  (nové pravidlo v `kontroly.js`): sdílený text ani název varianty nesmí obsahovat název jiného zákazníka zakázky
  (zábrana tisku, ne jen varování).
- Porovnání variant a podklady: tisknou se jen varianty, na které zákazník ukazuje.
- Krycí list u sdílené varianty: viz § 4 a otázka 4.
- Přílohy a interní poznámky jsou společné a do nabídky se netisknou; krycí list tiskne interní poznámky —
  upozornit v UI, že poznámka je společná pro všechny zákazníky.

**R2 — poslání správného souboru špatnému zákazníkovi** (aplikace neposílá e-maily): písmeno v čísle a název
zákazníka v názvu souboru; pruh „tisk platí pro zákazníka X“.

**R3 — Pipedrive:** přejmenování cizí organizace přes K40c (§ 7.3); text v poli přepsaný ručně; pole neexistuje.

**R4 — data a server:** souběh dvou obchodníků nad jednou zakázkou (stávající razítko úpravy stačí); velikost
zakázky (zákazník ≈ 2 kB, strop 4 MB neohrozí); migrace žádná (klíče jsou nepovinné); obnova ze zálohy přebírá
`dalsiZakaznici` celé, razítka tisků drží server.

**R5 — PROJ:** hlavička PROJ (`projHlavicka`) má vlastního objednatele. Doporučeno v první verzi: víc zákazníků
jen pro stranu OCK; u zakázky s `dalsiZakaznici` se dokumenty PROJ tisknou jen pro řídícího. PROJ pro další
zákazníky až podle zkušeností.

**R6 — víc šachet (#570):** bez kolize, šachty patří variantě. Ověřit jeden společný harness (víc šachet × víc zákazníků).

## 10. Etapy pro Opus

Pořadí je závazné; každá etapa samostatná větev nad integrací, vše za vypínačem, zlatá sada po každé etapě.
Čísla roadmapy přidělí koordinace. Programovat po sloučení K40c.

| etapa | obsah | hlavní soubory | testy |
|---|---|---|---|
| E0 | vypínač `viceZakazniku`, jádro `vice_zakazniku.js` (model, písmena, `vzPohled`, invariant řídící), import a serverová kontrola tvaru, zlatá sada | `funkce.mjs`, `zakazka.js`, `zakazka_kontrola.mjs`, `uloziste.js` | `test_vz_zlata.js`, `test_vz_model.js`, mutace |
| E1 | obrazovka: tlačítko „+ Přidat zákazníka“ a formulář v hlavičce; od druhého zákazníka přepínač a karta Zákazníci zakázky; odstranění neodeslaného zákazníka s návratem do standardního pohledu; ARES a databáze zákazníků nad otevřeným zákazníkem; VYP s daty jen ke čtení | `ui/vice_zakazniku_ui.js`, `ui/common.js`, `ui/ares_ui.js`, `ui/zakaznici_ui.js` | `overit_vz_zadani.mjs` (+ srovnání s bází znak po znaku) |
| E2 | čísla s písmenem, tisk z pohledu zákazníka (CN, náhled, názvy souborů), kontroly před tiskem, **test úniku** | `zamek.js`, `zakazka.js`, `nabidka.js`, `nazvy_souboru.js`, `kontroly.js` | `test_vz_unik.js`, `test_vz_cisla.js` |
| E3 | zámek: razítko „komu“, stav po zákaznících, vlastní varianta, dotisk, server drží razítka a `platna`; odstranění zákazníka s odeslanou nabídkou (doklad zůstává, písmeno z razítek) | `zamek.js`, `zakazka_kontrola.mjs` | `test_vz_zamek.js`, `netlify/test_vz_server.mjs` |
| E4 | řídící zákazník, Prodáno u zákazníka, zmrazení hlavičky, krycí list a SoD pro prodaného zákazníka | `objednane.js`, `zamek.js`, `kryci.js`, `sod.js` | `test_vz_prodej.js`, `overit_vz_prodej.mjs` |
| E5 | Pipedrive: textové pole, suchý běh, zápis, stav „čeká“, podmínka shody IČO u K40c, změna organizace dealu (podle otázky 3) | `pd_prevod.mjs`, `pd_nanecisto.js`, `pd_pole.mjs`, `pd_organizace.mjs`, simulátor | `netlify/test_vz_pd.mjs`, mutace serveru |
| E6 | rejstřík a Přehled (štítek, hledání), controlling, překlady, příručky, celé kolo s mutacemi | `uloziste.js`, `ui/online_ui.js`, `controlling.js`, `preklad.js`, `manual/` | `test_vz_rejstrik.mjs`, celé kolo |

## 11. Otázky pro J. V. (v2)

Návrh i prototyp počítají s doporučenou volbou (vždy první). Otázky 1–3 jsou z v1 a zůstaly bez odpovědi.

1. **Číslo nabídky dalších zákazníků.** (a) písmeno zákazníka za číslem varianty: `…9940-B`, `…9940.2-B`
   **— doporučeno**; (b) stejné číslo pro všechny zákazníky; (c) jiný tvar přípony (např. `/B`).
2. **Text v dealu u dalšího zákazníka.** (a) název firmy, číslo a datum platné nabídky a cena bez DPH, ve vlastním
   textovém poli dealu „Další zákazníci (Kalkulátor)“, které založíte v Pipedrive **— doporučeno**; (b) totéž bez
   ceny; (c) poznámka dealu místo pole.
3. **Organizace dealu po prodeji jinému zákazníkovi.** (a) aplikace upozorní a nabídne tlačítko „Změnit organizaci
   dealu v Pipedrive“ s potvrzením (autor, administrátor) **— doporučeno**; (b) jen upozornění, organizaci změníte
   v Pipedrive ručně; (c) měnit automaticky při Prodáno.
4. **Odstranění zákazníka, kterému už odešla nabídka** (nové ve v2). (a) odstranit jde, jeho odeslaná nabídka
   zůstává v zakázce doložená zamčenou variantou a razítkem tisku **— doporučeno** (dnešní pravidlo: doklad
   o odeslání se nemaže); (b) odstranit smí jen administrátor; (c) odstranit se vším, i s dokladem o odeslání.

Rozhodnuto doporučením, pokud J. V. neřekne jinak: krycí list je jeden na variantu a údaje zákazníka bere ze
zvoleného zákazníka, odlišné smluvní podmínky = vlastní varianta (otázka 4 z v1); první verze jen pro OCK (R5);
strop 9 dalších zákazníků; sleva patří variantě; neodeslaná vlastní varianta se při odstranění zákazníka maže
s ním (volba v potvrzení); hromadný tisk všem zákazníkům až později.
