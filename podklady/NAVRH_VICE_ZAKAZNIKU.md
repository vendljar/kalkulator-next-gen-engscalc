# Návrh v3: víc zákazníků na jedné zakázce (zkušební funkce „VZ“)

Poradce, v1 12. 11. 2026, v2 16. 11. 2026, **v3 16. 11. 2026 (rozhodnutí J. V.)**. Větev `claude/vz-navrh`, sloučeno s integrací `8462aea` (v12.11.7).
Kód aplikace se tímto návrhem nemění.

**Co mění v2** (připomínky J. V. 16. 11. 2026):
1. Dokud má zakázka jednoho zákazníka, aplikace vypadá a chová se přesně jako dnes. Navíc je jen tlačítko
   „Přidat zákazníka“ u pole Zákazník v hlavičce. Karta, přepínač ani štítky se neukážou (stejně jako u víc šachet).
2. Zákazníka jde odstranit (§ 2a). Po odstranění posledního dalšího zákazníka je zakázka i aplikace zpět
   ve standardním pohledu.
3. Otázky z v1 a v2 jsou rozhodnuté — viz níže.

**Rozhodnutí J. V. 16. 11. 2026 (v3):**

| č. | otázka | rozhodnutí | kde v návrhu |
|---|---|---|---|
| 1 | číslo nabídky dalších zákazníků | písmeno zákazníka: `…940-B` | § 3 |
| 2 | text o ostatních zákaznících v dealu | **poznámka u dealu**, ne pole; mechanismus poznámky šachet (VSD #588, mez B217) | § 7.2 |
| 3 | organizace dealu po prodeji jinému zákazníkovi | „organizace by se v Pipedrive měla přepsat na vítězného zákazníka a vítězná varianta je řídící cenou v Pipedrive“ — **při Prodáno se přepíše sama** | § 7.4 |
| 4 | odstranění zákazníka, kterému odešla nabídka | **jen administrátor**; bez odeslané nabídky kdo smí ukládat | § 2a |

**Víc šachet × víc zákazníků (doplněk J. V. 16. 11. 2026):** prototyp má vypínač víc šachet zapnutý, takže jde
klikat na skutečné ovládání šachet aplikace společně se zákazníky (situace „víc zákazníků + víc šachet“). Šachty
patří variantě, ne zákazníkovi: vlastní varianta zákazníka může mít jiné šachty než varianta řídícího; sdílená
varianta má pro všechny své zákazníky tytéž šachty (R6, etapa E6 má společný harness).

Prompty pro programování po etapách: `podklady/PROMPT_VZ_SPOLECNE.md` a `podklady/PROMPT_VZ_E0.md` … `E6.md` (§ 10).

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
| Pipedrive | deal nese řídícího zákazníka a řídící variantu; ostatní zákazníci v jedné přepisované poznámce u dealu; při Prodáno jinému zákazníkovi se organizace dealu přepíše na vítěze |
| standardní pohled | s jedním zákazníkem jen tlačítko „Přidat zákazníka“; karta a přepínač až od druhého zákazníka |
| odstranění | každého dalšího zákazníka s potvrzením; s odeslanou nabídkou jen administrátor a doklad zůstává v zámku varianty; řídícího a prodaného ne |
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
  v zakázce se zamčenými nabídkami a v poznámce dealu mají „neprodáno“. Hned po uložení prodeje se organizace
  dealu přepíše na vítězného zákazníka (§ 7.4).
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

- V hlavičce je tlačítko **„Přidat zákazníka“** (jen se zapnutou funkcí, jen kdo smí zakázku
  ukládat, ne u prodané zakázky). **Umístění (doplněk J. V. 16. 11. 2026):** text bez „+“, na stejném řádku hned
  vedle popisku „Zákazník“; řádek Zákazník má stejnou výšku jako sousední řádky (Kontaktní osoba, IČO) — pole
  Zákazník se o šířku tlačítka zúží (popisek s tlačítkem `flex: 0 0 auto`, pole `flex: 1`, nejméně 110 px).
  Ověřeno při 1600 px s panelem prototypu i bez něj; při 400 px smí zalomit. Nic jiného se nemění: žádná karta, přepínač, štítek, pruh u náhledu ani písmeno
  v čísle. Dokumenty, data i rejstřík jsou bajtově stejné jako dnes.
- Tlačítko otevře v hlavičce formulář „Nový zákazník na zakázce“ přes celou šířku karty: Zákazník, Sídlo, Kontaktní
  osoba, IČO, DIČ (pole široká na celý název a IČO), a volba nabídky — **stejná varianta jako řídící zákazník**
  (výchozí), nebo **vlastní varianta (kopie)**. Zrušení formuláře nic nezmění.
- **ARES a databáze zákazníků ve formuláři (doplněk J. V. 16. 11. 2026):** vedle IČO jsou tatáž tlačítka jako
  v hlavičce — „Vybrat z databáze zákazníků“ a „🔎 Najít firmu v ARES“ — a pole Zákazník má našeptávač. ARES ukáže
  tentýž panel jako v hlavičce (firma, tabulka „Údaj / Ve formuláři teď / Z rejstříku“, zaniklý subjekt, hlášky
  neplatné IČO / nenalezeno / výpadek) a údaje převezme **jen po potvrzení** („Převzít údaje do formuláře (N)“).
  Stejná logika jako dnes: `aresUrl`, `aresZpracuj`, `aresRozdily`, `aresPrepis`, `aresHlaska` (`src/ares.js`) —
  panel a dotaz z `src/ui/ares_ui.js` se zobecní na „cíl“ (hlavička OCK, hlavička PROJ, formulář nového zákazníka,
  později otevřený další zákazník), aby nevznikla druhá kopie. Výběr z databáze doplní všechna pole (`zakaznikPredvypln`).
  „Přidat zákazníka“ je zhasnuté, dokud není vyplněný název. Po přidání se do protokolu zapíše, odkud údaje jsou
  (ARES / databáze / ručně) — jen název firmy, žádné kontakty.
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
- **Poznámka u dealu:** při uložení po odstranění se poznámka „Další zákazníci na zakázce“ přepíše bez tohoto
  zákazníka; po odstranění posledního dalšího zákazníka se upraví na „Další zákazníci na zakázce: žádní“
  (poznámka se nikdy nemaže, stejně jako poznámka šachet). Selže-li zápis, uložení to nezastaví a zápis se
  zopakuje při dalším uložení (§ 7.2).
- **Rejstřík:** klíč `zakaznici` zmizí, štítek v Přehledu také.
- **Návrat do standardního pohledu:** po odstranění posledního dalšího zákazníka zmizí přepínač, karta i pruh
  a v hlavičce je zase jen tlačítko. V prototypu je hlavička po návratu znak po znaku stejná jako na začátku.
  Jediné, co může zůstat, je zamčená varianta odstraněného zákazníka (doklad) a záznam v protokolu.
- **Práva (rozhodnutí J. V.):** odstranit zákazníka, kterému nic neodešlo, smí kdo smí zakázku ukládat. Zákazníka,
  kterému už odešla nabídka, odstraní **jen administrátor** (server: role z relace, „odešla nabídka“ = razítko tisku
  s jeho id v zámku některé varianty ULOŽENÉ verze; ostatní 403).
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

### 7.2 Ostatní zákazníci: jedna přepisovaná poznámka u dealu (rozhodnutí J. V.)

Mechanismus je převzatý z poznámky se seznamem šachet (VSD #588, `netlify/lib/pd_poznamka.mjs`, mez B217):

- jedna poznámka u dealu (API v1 `/notes`), kterou server zakládá a přepisuje **při uložení zakázky**
  (`POST /api/zakazky`, ve výhradním úseku), jen když se text změnil (otisk SHA-256);
- id poznámky drží pole zakázky psané jen serverem — nové `pdPoznamkaZakaznici` { deal, id, otisk, kdy }
  (hodnota z prohlížeče se zahodí, platí uložená verze téhož dealu);
- před úpravou server poznámku přečte a přepíše ji jen, patří-li témuž dealu; bez id (nebo po 404) prohledá
  poznámky dealu a převezme tu, která začíná úvodem a končí značkou této zakázky — podvržené id cizí poznámku nepřepíše;
- právo `crm.pipedrive` (B80; administrátor vždy), bez práva stav `bez-prava` bez varování;
- strop pokusů za hodinu na deal, tvrdý časový limit volání, selhání uložení nezastaví; poznámka se nikdy nemaže.

**Spojit s poznámkou šachet, nebo vést zvlášť? Doporučuji zvlášť, se společným modulem.**

| | zvlášť (doporučeno) | jedna společná poznámka |
|---|---|---|
| rozpoznání | vlastní úvod „Další zákazníci na zakázce: “ + táž značka „ — nabídka <číslo>“ | změna úvodu a tvaru existující poznámky šachet → stávající poznámky v dealech by se přestaly poznávat |
| vypínače | `viceSachet` a `viceZakazniku` nezávislé; každá poznámka se řídí svým | čtyři kombinace vypínačů v jednom textu a jednom otisku |
| životní cyklus | šachty: řídící varianta; zákazníci: seznam zákazníků — mění se jindy | změna jedné části přepisuje i druhou |
| testy a mutace VSD | beze změny (jen refaktor na společné jádro) | přepsat zlaté texty a mutace #588 |
| čtení v Pipedrive | dvě krátké poznámky s jasným nadpisem | jedna delší |
| cena | druhé volání Pipedrive při uložení | jedno volání |

Druhé volání se ošetří **společným časovým rozpočtem**: obě poznámky dohromady nejvýš `PD_POZNAMKA_CELKEM_MS` (6 s),
šachty první, zákazníci druzí; nestihne-li se druhá, stav `chyba` a zkusí se při dalším uložení. Strop pokusů
je pro každou poznámku vlastní (klíč `strop:poznamka-zakaznici:deal:<id>`). Modul se zobecní na „druh poznámky“
(pole zakázky, úvod, stavba textu, věta pro prázdný stav, klíč stropu); funkce pro šachty zůstanou pod dnešními jmény.

Tvar textu (prostý text, escapovaný; řádky oddělené `<br>`; rozpoznává se bez značek HTML jako dnes):

```
Další zákazníci na zakázce:
• BETA Development a.s. — CN 2026 - OPR - CN - 9940.2-B z 12. 11. 2026, 1 333 000 Kč bez DPH
• GAMA invest s.r.o. — nabídka zatím neodeslána (2026 - OPR - CN - 9940-C)
— nabídka 2026 - OPR - CN - 9940
```

- „Platná nabídka“ = poslední **odeslaná** nabídka zákazníka (`platna`, počítá server ze zámků). Rozpracovaná nová
  varianta se uvede jen jako „připravuje se nová …“. Cena jen u odeslané nabídky, bez DPH, v měně nabídky, ze
  zmrazeného výsledku zámku.
- Po prodeji: u ostatních „— neprodáno“. Po odstranění posledního dalšího zákazníka: „Další zákazníci na zakázce:
  žádní — nabídka <číslo>“ (jen když poznámka existuje; zakázka, která víc zákazníků nikdy neměla, poznámku nemá).
- Do poznámky nejdou kontakty, osoby, IČO ani sleva. Strop délky (2 000 znaků + značka), řídicí znaky pryč;
  přetečení se zkrátí s „… a další N“.
- Suchý běh (#536) ukáže řádek „Poznámka dealu — další zákazníci“ se stejným textem.
- **Nová mez** (číslo přidělí koordinace, navazuje na B217): poznámka u dealu nese názvy dalších zákazníků a ceny
  jejich odeslaných nabídek — vidí ji každý, kdo vidí deal v Pipedrive; zbytkové meze B217 (dvojí založení při
  souběhu instancí, prvních 100 poznámek, změna dealu nechá starou poznámku) platí i zde.

### 7.3 Webhook #553, K40c a ARES

- Webhook a ARES na serveru (K40c) pracují jen s hlavičkou = s řídícím zákazníkem. `dalsiZakaznici`
  a `vzRidici` webhook nikdy nečte ani nemění; ARES se pro další zákazníky z webhooku nevolá.
- Další zákazníci se ověřují v ARES ručně stejným tlačítkem jako dnes (`ares_ui.js` nad otevřeným zákazníkem).
- „Opravit firmu v Pipedrive“ (K40c, `pd_organizace.mjs`) už podmínku **shody IČO** organizace dealu a hlavičky má
  (v integraci `8462aea`): dokud je deal veden na původní organizaci a řídící je jiný zákazník, vrací 409 a nic
  nepřejmenuje. Po přepsání organizace na vítěze (§ 7.4) IČO sedí a tlačítko funguje jako u běžné zakázky.
- Ruční změna řídícího zákazníka **bez prodeje** organizaci dealu nemění (deal patří tomu, kdo ho v Pipedrive vede);
  aplikace jen ukáže, že deal je veden na jiného zákazníka. Organizace se přepisuje až při Prodáno.
- Webhook při neshodě IČO firmu v hlavičce nepřepisuje (smazání otisků při výměně řídícího, § 2; výslovný test).
- `pdVazbaWebhook`, odmítnuté dealy a zrušení vazby (K40c) se zákazníků netýkají — vazba je na zakázce.

### 7.4 Prodáno jinému zákazníkovi: organizace dealu = vítězný zákazník (rozhodnutí J. V.)

Řídící varianta (cena v dealu) = prodaná varianta platí už dnes (#563). Nově se přepíše i organizace dealu.
Pozor: samotný zápis dat prodeje do dealu (hodnota, krycí list, fáze) dnes aplikace **neprovádí** — `prodano.pipedrive`
zůstává ve stavu „čeká na odeslání“ a existuje jen suchý běh (#510, #536). Přepsání organizace je proto samostatný
zápis s vlastním stavem a na zápisu dat prodeje nezávisí.

**Kdy.** Po úspěšném uložení prodeje prohlížeč sám zavolá `POST /api/pd/organizace { soubor, akce: 'vitez' }`
(bez dalšího dialogu — přepsání organizace je vypsané v potvrzení prodeje). Jen u zakázky s víc zákazníky
(`vzRidici` v uložené verzi) a jen když je prodaná. Zakázka s jedním zákazníkem se nemění.

**Co server udělá** (klientovi nevěří nic kromě jména souboru; vše z uložené zakázky a z Pipedrive):

1. Ověří: zakázka je prodaná, má navázaný deal, IČO hlavičky je platné (`icoPlatne`). Neplatné nebo prázdné IČO →
   stav `bez-ico`, nic se nezapisuje („doplňte IČO vítězného zákazníka“ — po prodeji je hlavička zmrazená, IČO
   doplní vedoucí nebo administrátor po odemčení, nebo se organizace změní ručně v Pipedrive).
2. Načte deal a jeho organizaci. IČO organizace = IČO hlavičky → stav `shoda`, nic se nezapisuje.
3. **Najde organizaci podle IČO:** hledání organizací v Pipedrive podle hodnoty vlastního pole IČ (pole z mapy
   organizace, `pd_mapa.mjs`; v účtu je číselné — hledá se bez úvodních nul). Každého kandidáta server **znovu
   načte a ověří** normalizovaným IČO (`pdIco`, kontrolní číslice) — výsledku hledání se nevěří.
   - právě jedna aktivní organizace → použije se;
   - žádná → **založí se**: název a adresa z ARES podle IČO hlavičky (`ares_server.mjs`, 3 s), při výpadku ARES
     z hlavičky zakázky; IČ do vlastního pole; DIČ jen když účet takové pole má (pole se nikdy nezakládá);
     vlastník = vlastník dealu;
   - dvě a víc aktivních se stejným IČO → stav `vice`, nic se nezapisuje, aplikace vypíše jejich názvy a počet
     („v Pipedrive je víc organizací s tímto IČO — sjednoťte je a zápis zopakujte“). Server nehádá.
4. `PATCH /api/v2/deals/<id>` jen `{ org_id }`. Původní organizace se nemění ani nemaže. **Kontaktní osoba dealu
   se nemění** — patří původní organizaci; odpověď to řekne a aplikace na to upozorní (otevřený bod 1 v § 11).
5. Zapíše stav do pole psaného jen serverem `zak.pdOrgVitez = { deal, org, stav, kdy, kdo }`, záznam do protokolu
   (název organizace, „nalezena“ / „založena“, žádné kontakty) a smaže cache detailu dealu.

**Kdo smí.** Ten, kdo právě prodal (e-mail relace = `prodano.kdo` uložené verze), autor zakázky nebo administrátor —
a k tomu právo `crm.pipedrive` z matice (B80). Bez práva: stav `bez-prava`, prodej platí, zápis čeká na někoho
s právem. Role a autor se berou z relace a z uložené verze.

**Když zápis selže** (výpadek, časový limit, limit Pipedrive, `vice`, `bez-ico`, `bez-prava`): prodej je uložený
a platný, nic se nevrací. U řádku Stav Pipedrive a v kartě Zákazníci zakázky svítí „Organizace dealu se
nepřepsala“ s důvodem a tlačítkem **„Zkusit zápis znovu“** (kdo smí viz výš). Opakování je bezpečné: před
založením se vždy hledá znovu, takže dvojí stisk dvě organizace nezaloží; zbytková mez je souběh dvou instancí
(jako u poznámky B217).

**Odemčení prodeje** organizaci dealu nevrací. Pole `pdOrgVitez` zůstává jako stopa; nový prodej zápis zopakuje.

**Meze a limity.** Jedno volání Pipedrive nejvýš 2,5 s, celá akce nejvýš 9 s včetně ARES; strop 10 pokusů za
hodinu na deal a 20 na uživatele (počítadla `pd_cache`); výhradní úsek zakázky; druhé čtení zakázky před zápisem
stavu (vzor SEC-S1). **Nová mez** (číslo přidělí koordinace): aplikace poprvé **zakládá organizaci** v Pipedrive
a přepojuje deal — co to nedělá: neslučuje duplicity, nemění osobu dealu, nemaže ani neupravuje původní
organizaci, nevrací změnu při odemčení prodeje.

**Vztah ke K40c.** Před přepsáním chrání cizí organizaci podmínka shody IČO (409). Po přepsání je IČO organizace
dealu = IČO hlavičky = vítěz, takže „Opravit firmu v Pipedrive“ i webhook s ARES pracují nad správnou organizací.
Nově založená organizace má údaje z ARES, takže rozdíl ARES × Pipedrive je prázdný.

**Testy jen proti simulátoru** (`pipedrive_simulator.mjs` rozšířit o hledání organizací, `POST /organizations`,
`PATCH /deals` s `org_id`, scénáře `visi`, `limit`, `vypadek`): nalezena / založena / víc shod / bez IČO / shoda /
bez práva / cizí uživatel 403 / neprodaná zakázka 409 / zakázka s jedním zákazníkem 409 / výpadek uprostřed
(organizace založena, PATCH selhal → opakování nezaloží druhou) / časový limit / strop / podvržené `pdOrgVitez`
z prohlížeče se zahodí / název firmy s HTML a řídicími znaky. Do skutečného Pipedrive testy nikdy nevolají.
Přesné cesty a parametry hledání organizací ověří programátor v dokumentaci Pipedrive; ověření proti ostrému
účtu (jen čtení) je věc J. V.

## 8. Práva, vypínač, zlatá sada

- Vypínač `viceZakazniku` v `FUNKCE_ZNAME` (`netlify/lib/funkce.mjs`), Nastavení → Zkušební funkce, jen
  administrátor, výchozí VYP. Rozhoduje server.
- **VYP + zakázka bez dalších zákazníků:** chování bajtově stejné (zlaté sady beze změny otisků, harness znak po
  znaku proti bázi jako `overit_vs_zadani.mjs` s `KNG_DIST_ZAKLAD`).
- **VYP + zakázka, která už další zákazníky má** (vypnuto po použití): data se nemažou, karta je jen ke čtení,
  tisk pro další zákazníky je zastaven s hláškou, server odmítne změnu `dalsiZakaznici` (vzor VS R21).
- **ZAP + jeden zákazník:** jediný rozdíl je tlačítko „Přidat zákazníka“ u pole Zákazník; dokumenty a data
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

**R3 — Pipedrive:** přejmenování cizí organizace přes K40c (kryje podmínka shody IČO, § 7.3); založení duplicitní
organizace nebo přepojení dealu na špatnou organizaci (§ 7.4: ověření IČO každého kandidáta, víc shod = nic);
poznámka přepsaná ručně v Pipedrive (aplikace ji při další změně přepíše); kontaktní osoba dealu zůstane původní.

**R4 — data a server:** souběh dvou obchodníků nad jednou zakázkou (stávající razítko úpravy stačí); velikost
zakázky (zákazník ≈ 2 kB, strop 4 MB neohrozí); migrace žádná (klíče jsou nepovinné); obnova ze zálohy přebírá
`dalsiZakaznici` celé, razítka tisků drží server.

**R5 — PROJ:** hlavička PROJ (`projHlavicka`) má vlastního objednatele. Doporučeno v první verzi: víc zákazníků
jen pro stranu OCK; u zakázky s `dalsiZakaznici` se dokumenty PROJ tisknou jen pro řídícího. PROJ pro další
zákazníky až podle zkušeností.

**R6 — víc šachet (#570):** bez kolize, šachty patří variantě. Ověřit jeden společný harness (víc šachet × víc zákazníků).

## 10. Etapy pro Opus

Prompty: `podklady/PROMPT_VZ_SPOLECNE.md` (společná pravidla, čte se s každou etapou) a `podklady/PROMPT_VZ_E0.md`
až `PROMPT_VZ_E6.md`. Báze integrace `8462aea` (v12.11.7); každou další etapu spouští koordinace nad SHA integrace
po sloučení předchozí. Čísla roadmapy a mezí přidělí koordinace. Vše za vypínačem, zlatá sada po každé etapě.

| etapa | obsah | hlavní soubory | odhad | revize poradce |
|---|---|---|---|---|
| E0 | vypínač, jádro (model, písmena, pohled zákazníka, invarianty), import, serverová kontrola tvaru, zlatá sada | `funkce.mjs`, `vice_zakazniku.js`, `zakazka.js`, `zakazka_kontrola.mjs` | 1 sezení | **ano** (datový model) |
| E1 | obrazovka: tlačítko a formulář v hlavičce, od 2. zákazníka přepínač a karta, odstranění neodeslaného zákazníka, návrat do standardního pohledu | `ui/vice_zakazniku_ui.js`, `ui/common.js`, `ui/ares_ui.js`, `ui/zakaznici_ui.js` | 1–2 sezení | ne |
| E2 | čísla s písmenem, tisk z pohledu zákazníka, kontroly před tiskem, **test úniku** | `zamek.js`, `zakazka.js`, `nabidka.js`, `nazvy_souboru.js`, `kontroly.js`, `dokumenty.js` | 1–2 sezení | **ano** (únik údajů) |
| E3 | zámek: razítko „komu“, stav po zákaznících, vlastní varianta, dotisk; odstranění zákazníka s odeslanou nabídkou (jen administrátor) | `zamek.js`, `zakazka_kontrola.mjs`, `uloziste.js` | 1 sezení | **ano** (zámek, server) |
| E4 | řídící zákazník, Prodáno u zákazníka, zmrazení hlavičky, krycí list a SoD pro prodaného zákazníka | `objednane.js`, `zamek.js`, `kryci.js`, `sod.js` | 1 sezení | ne |
| E5 | Pipedrive: poznámka „Další zákazníci“ (zobecnění `pd_poznamka.mjs`), suchý běh | `pd_poznamka.mjs`, `functions/zakazky.mjs`, `pd_nanecisto.js`, simulátor | 1 sezení | ne (vzor #588) |
| E5b | Pipedrive: organizace dealu = vítěz při Prodáno (najít podle IČO / založit / přepojit) | `functions/pd_organizace.mjs`, `lib/pd_vazba.mjs`, simulátor, `ui/` | 1 sezení | **ano** (první zakládání v Pipedrive) |
| E6 | rejstřík a Přehled, controlling, překlady, příručky, celé kolo s mutacemi po částech | `uloziste.js`, `ui/online_ui.js`, `controlling.js`, `preklad.js`, `manual/` | 1–2 sezení | ne |

Pořadí: **E0 → E1 → E2 → E3 → E4 → E5b → E6**; **E5** může běžet souběžně s E1–E3 (sahá jen do serverových
souborů poznámky), nejdřív po sloučení E0. E5b až po E4 (potřebuje prodej u zákazníka). „Sezení“ = jedno
cloudové sezení včetně kola bez mutací (≈ 4–6 h); mutace po částech navíc v E6.

## 11. Otevřené body po rozhodnutí J. V.

Všechny čtyři otázky jsou rozhodnuté (úvod). Zbývá jedna nová otázka a body, které řeším doporučením:

1. **Kontaktní osoba dealu po přepsání organizace** (nová, vyplývá z rozhodnutí 3). Osoba dealu patří původní
   organizaci. (a) aplikace osobu nemění a upozorní, že ji máte v Pipedrive změnit **— doporučeno**;
   (b) aplikace osobu z dealu odebere; (c) aplikace založí osobu z kontaktu vítězného zákazníka.

Rozhodnuto doporučením, pokud J. V. neřekne jinak:
- poznámka o zákaznících je samostatná, vedle poznámky šachet (§ 7.2);
- poznámka se nemaže — po odstranění posledního zákazníka říká „žádní“ (stejně jako poznámka šachet);
- ruční změna řídícího zákazníka bez prodeje organizaci dealu nemění (§ 7.3);
- víc organizací se stejným IČO v Pipedrive = nezapisuje se nic a aplikace je vypíše (§ 7.4);
- krycí list je jeden na variantu, údaje zákazníka ze zvoleného zákazníka; první verze jen OCK; strop 9 dalších
  zákazníků; sleva patří variantě; neodeslaná vlastní varianta se při odstranění zákazníka maže s ním (volba
  v potvrzení); hromadný tisk všem zákazníkům až později.
