# Obnova testovací sady zakázek — návod (C5, #585)

> Pro J. V. Nástroj `nastroje/test_sada_obnov.mjs` založí zakázky s číslem **TEST - …** v **testovací**
> databázi (testengscalc). Zakázky jdou přes stejné rozhraní a se stejnými kontrolami jako z prohlížeče.
> Nic nepřepíše, nic nemaže, čísla ani varianty nemění, zámky odeslaných nabídek ponechá.
> Spouštíte ho jen vy, na svém počítači. Cloudové sezení ho proti žádnému webu nespouští.

## 1. Co je potřeba

- Počítač s **Node.js 20 nebo novějším**. Ověříte příkazem `node --version`.
- Klon repa na commitu, který určí koordinace po sloučení dávky. Například:
  `git fetch origin && git checkout <commit>`.
  Nic se neinstaluje, nesestavuje (`build.py` netřeba) a Playwright není potřeba.
- Účet **administrátora** na `https://testengscalc.netlify.app`. Účet obchodníka nástroj odmítne.
- Soubor s TEST zakázkami (bod 2). **Soubor patří mimo složku repa**, např. do `~/Stažené/`.
  Do repa se nikdy nekopíruje. `.gitignore` sice zachytí jména `test_sada_*.json*` a `otisk_*.json*`,
  ale je to jen pojistka.

## 2. Odkud vzít export

### A) Soubor od testovacího sezení (doporučeno)

Testovací sezení má kopii TEST zakázek z 2. 11. 2026, ze které běží kola K28/K29/K36. Připraví z ní soubor
`test_sada_export_2026-11-02.json` a pošle vám ho jako **soubor ke stažení** (ne přes repo, ne e-mailem
zákazníkům). Soubor nese **jen** zakázky s číslem `TEST - …`.

- Tvar: JSON pole zakázek `[ {…}, {…} ]`, nebo `{ "zakazky": [ … ] }`. Zakázky jsou uložené tak, jak leží
  v databázi.
- Přepínač: `--export <soubor>`.
- Pravidlo: když v souboru najde **jedinou** zakázku, jejíž číslo nezačíná `TEST`, **nezapíše nic**
  a takové zakázky vypíše. Pak jde o jiný soubor, než má být (nejspíš celou zálohu, viz B).

### B) Kopie zálohy z Disku (druhá možnost)

Složka **„_Zaloha Netlify DB“** na Disku Google. Vezměte kopii **testovací** databáze s posledním otiskem
**před 2. 11. 2026**. Retence drží první otisk měsíce a nedělní otisk, takže soubor z **1. 11. 2026**
(je obojí) by tam měl být. Jméno souboru:

- `otisk_2026-11-01.json.gz` (starý tvar, do v2.11.9). Kopie z 1. 11. vznikla před #552 a ponese nejspíš tenhle tvar.
  Jméno ale **neříká prostředí**, takže kopii ostré a testovací databáze podle jména nerozlišíte.
- nebo `otisk_test_2026-11-01_HHMM.json.gz` (tvar od #552, v2.11.9: prostředí `test` a čas v Praze).

Soubor stáhněte do složky **mimo repo** a předejte ho přepínačem `--zaloha <soubor>` (.json i .json.gz).
Z otisku se vyberou **jen** zakázky s číslem `TEST - …`. Účty, ceník, nastavení ani ostatní zakázky se dál
nečtou a nikam neodcházejí. Kdyby šlo omylem o kopii ostré databáze, TEST zakázky v ní nejsou
a nástroj skončí hláškou „V záloze není žádná zakázka s testovacím číslem“.

### Jaké číslo je „TEST“

Číslo zakázky musí začínat `TEST`. Po převodu na jméno souboru, stejném jako na serveru (mezery a další
znaky → pomlčka, bez diakritiky), musí začínat `TEST-`. Příklad z testu: `TEST - 2026 - OPR - CN - 9578 - K19T-C078`.
Totéž musí platit pro:
- číslo každé varianty (`…​.1`, `…​.2`),
- číslo v zámku odeslané nabídky,
- vyplněné číslo PROJ.

Prázdné číslo PROJ a předloha „2026 - OPR - CN - “ se nehlídají. Zámek bez čísla neprojde.

## 2a. Co předem čekat: prodané a staré zamčené zakázky server neobnoví

Nástroj ukládá zakázky **běžnou cestou** jako z prohlížeče. Server je proto bere jako **nové**: zámek odeslané
nabídky dostane dnešní razítko přijetí (K40b, #580) a posoudí se jako nový zámek. Z toho plyne:

- **Prodaná zakázka s datem prodeje starším než 7 dní** se neobnoví. Server odpoví 400 „Datum prodeje nesmí být
  dřív než …“. U TEST sady z 2. 11. to budou **všechny prodané** zakázky.
- **Odeslaná nabídka se zámkem z doby před #320 (září 2026)** se neobnoví. Server odpoví 409 „nová odeslaná
  (uzamčená) nabídka nese jiné číslo …“, protože zámku chybí značka „číslo z papíru“.

Nástroj tyto zakázky **nemění** a ostatní založí. Na konci je vypíše v oddílu **„ODMÍTNUTÉ ZAKÁZKY — co s nimi“**
a ke každé přidá doporučení. **Co potom uděláte:** prodané a zamčené zakázky obnovte v aplikaci přes
**Nastavení → Databáze → Obnovit ze zálohy**, se souborem zálohy (bod 2 B) nebo s otiskem z doby, kdy v databázi
ještě byly. Režim obnovy bere zámek ze zálohy jako doklad a razítko přijetí nepřepisuje, takže tyto zakázky projdou.
Obnovu ze zálohy dělá aplikace, ne tento nástroj. Zbylé odmítnuté (bez zámku) pošlete koordinaci.

**Pozor na rozsah obnovy ze zálohy:** záloha nese celou databázi. V dialogu obnovy vyberte **jen část „zakázky“**
a režim **„doplnit“** (nikdy „přepsat“) — jinak obnova sáhne i na ceník, firmu, účty a ostatní zakázky testu.
„Doplnit“ přidá i jiné chybějící zakázky ze zálohy, nejen TEST. **Nejdřív si pusťte náhled obnovy** a zkontrolujte,
co se doplní. U obnovy ze **souboru** se ověření zámku počítá znovu, takže zámky z doby před #320 nemusí projít ani
tudy — spolehlivější je serverový otisk z doby, kdy zakázky v databázi ještě byly (např. 1. 11.), pokud ho
retence záloh ještě drží.

## 3. Náhled (nic se nezapíše)

V kořeni klonu repa:

```
node nastroje/test_sada_obnov.mjs --web https://testengscalc.netlify.app --export ~/Stažené/test_sada_export_2026-11-02.json
```

Nástroj nejdřív upozorní: „Po běhu budete v aplikaci odhlášeni — uložte si rozdělanou práci.“ Pak se zeptá
na **e-mail** a **heslo** administrátora. Heslo se při psaní nezobrazuje (ani po znacích, ověřeno
v pseudo-terminálu). Ukázka výstupu
(čísla jsou smyšlená):

```
Po běhu budete v aplikaci odhlášeni — uložte si rozdělanou práci.
E-mail administrátora testovacího webu: …
Heslo:
Přihlášeno jako administrátor na https://testengscalc.netlify.app.

NÁHLED (4 zakázek, web https://testengscalc.netlify.app):
  TEST - 2026 - OPR - CN - 9581 - C5  · variant 2  → založí se
  TEST - 2026 - OPR - CN - 9582 - C5  · variant 2, zamčených 1  → založí se
  TEST - 2026 - OPR - CN - 9583 - C5  · variant 1, zamčených 1  → přeskočí se — na serveru už je
  TEST - 2026 - OPR - CN - 9584 - C5  · variant 1, zamčených 1  → založí se

Založí se 3, přeskočí 1.
NÁHLED — nic se nezapsalo. Pro zápis spusťte znovu s --zapsat.
```

Jak výstup číst:
- **založí se**: zakázka na webu není a pošle se.
- **přeskočí se — na serveru už je**: na webu už leží zakázka se stejným číslem. Nástroj na ni nesáhne.
- **přeskočí se — v souboru dvakrát**: druhý výskyt téhož čísla v souboru se vynechá.
- **přeskočí se — větší než strop 4 MB**: server by ji stejně odmítl. Nahlaste koordinaci.

Výpis nese jen čísla zakázek, počty a stav. Ceny, jména ani e-maily v něm nejsou.

## 4. Zápis

```
node nastroje/test_sada_obnov.mjs --web https://testengscalc.netlify.app --export ~/Stažené/test_sada_export_2026-11-02.json --zapsat
```

Nástroj nejdřív ukáže stejný náhled. Pak se zeptá: `Založit N zakázek na https://testengscalc.netlify.app?
Napište OBNOVIT:`. Zapisuje jen po napsání **OBNOVIT** velkými písmeny. Cokoli jiného znamená „Zrušeno — nic se nezapsalo“.
Zakázky jdou po jedné, s krátkou pauzou. Ke každé vypíše stav:

| značka | stav | co to znamená |
|---|---|---|
| ✓ | založeno a ověřeno | zakázka se uložila a po přečtení zpět sedí číslo, varianty, zámky (číslo, typ, čas) i data variant |
| ! | založeno s rozdílem: … | uložila se, ale server něco změnil, cesta ke klíči je v závorce. Nahlaste koordinaci. |
| – | přeskočeno (mezitím ji někdo založil) | někdo ji uložil mezi náhledem a zápisem. Nic se nepřepsalo. |
| ✗ | odmítnuto serverem (kód): důvod | server zakázku nepřijal (důvod je jeho hláška). Viz bod 5. |

Na konci je souhrn a kód ukončení: **0** = vše, co se mělo založit, je založené a ověřené. **1** = něco
neprošlo nebo bylo zrušeno. **2** = odmítnutý web nebo soubor (bez přihlášení).

**Server sám mění dvě věci, a to není chyba:**
- **Autor zakázky** zůstane z exportu. Cizího autora smí u nové zakázky ponechat jen administrátor, proto
  nástroj vyžaduje jeho účet.
- **Role u slevy** (`sleva.role`) bude „Administrátor“. Server ji vždy bere z přihlášeného účtu („role slevy
  určuje relace, ne data“). Nástroj ji proto za rozdíl nepovažuje.

**Odhlášení na konci platí pro celý účet.** Nástroj se na konci odhlásí (`/api/odhlaseni`). Odhlášení ruší
**všechny** relace účtu, takže i přihlášení v prohlížeči. Po běhu nástroje se v aplikaci přihlaste znovu.

**Přerušení (Ctrl+C):** rozpracovaná zakázka se dokončí a nástroj skončí se souhrnem. Druhé Ctrl+C ho ukončí
hned. Co je založené, zůstává. **Další spuštění je bezpečné**: založené zakázky přeskočí a doplní zbytek.

## 5. Kontrola v aplikaci a co se zakázkami, které server odmítl

1. Na testengscalc otevřete **Přehled cenových nabídek** a do hledání napište `TEST`. Počet má sedět se souhrnem.
2. Otevřete pár zakázek, hlavně odeslané (zamčené) a prodané. Zámek a štítek „Nabídka prodána“ musí zůstat.
   Kdyby aplikace u odeslané nabídky hlásila sporné ověření („Pozor, nabídka …“), napište koordinaci číslo zakázky.
3. **Odmítnuté zakázky** nástroj **neupravuje**. Nejčastější důvody, ověřené na místním serveru:
   - *„nová odeslaná (uzamčená) nabídka nese jiné číslo …“ (409)*: zámek z doby před #320 (září 2026)
     nemá značku „číslo z papíru“. Běžné uložení takový zámek jako nový nepřijme.
   - *„… funkce víc šachet je vypnutá …“ (409)*: zakázka s víc šachtami, na testu je vypínač
     (Nastavení → Zkušební funkce) vypnutý. Zapněte ho a spusťte nástroj znovu. Ostatní zakázky přeskočí.
   - *profil mimo katalog, čas odeslání starší než 400 dní, ceník bez cen a podobně*: data starší verze
     neprojdou dnešními kontrolami nového zámku.

   - *„Datum prodeje nesmí být dřív než …“ (400)*: prodej starší než 7 dní (viz 2a).

   Prodané a zamčené obnovte přes **Obnovit ze zálohy** v aplikaci (Nastavení → Databáze), viz 2a. Tam je zámek
   ze zálohy doklad. Ostatní odmítnuté pošlete koordinaci.

## 6. Jak to vrátit

Nástroj sám **nemaže** nic. Obnovenou sadu odstraníte **hromadným mazáním v aplikaci** (jen administrátor):
Přehled cenových nabídek → filtr `TEST` → zaškrtnout → Smazat. Zakázky s odeslanou nabídkou chtějí zvláštní
potvrzení.

## 7. Co nástroj nikdy neudělá a co hlásit

**Nikdy:**
- **Neběží na ostrém webu.** Povolené jsou jen `https://testengscalc.netlify.app` a místní adresy
  `http://localhost:<port>`, `http://127.0.0.1:<port>`. Ostrý `engscalc.netlify.app`, jeho nasazení
  `…--engscalc.netlify.app` i cokoli se `schaftscalc` odmítne dřív, než se zeptá na heslo. Pak se ptá
  `/api/zdravi`, jestli web hlásí prostředí **test**: před přihlášením, po něm a těsně před prvním zápisem.
  Přesměrování na jinou adresu nenásleduje. Jiný testovací web se přidává úpravou seznamu v kódu s revizí,
  ne přepínačem.
- **Nepřepisuje.** Existující zakázku přeskočí. Server ji navíc chrání razítkem (`ocekavaneRazitko: ''`).
  Nástroj nikdy neposílá „vědomě přepsat“.
- **Nemaže.** Nevolá mazání, obnovu ze zálohy, zálohu ani Pipedrive. Volá jen `/api/zdravi`,
  `/api/prihlaseni`, `/api/odhlaseni`, `/api/zakazky` (čtení a uložení).
- **Nemění data.** Zakázka jde tak, jak je v souboru: bez přepočtu, bez migrace, se zámky, razítky
  a přílohami.
- **Neukládá heslo ani relaci.** E-mail a heslo jdou jen z klávesnice, ne z parametru, proměnné ani souboru.
  Cookie relace drží jen v paměti a nikam ji nevypisuje.

**Hlaste koordinaci:**
- řádky „založeno s rozdílem“ a „odmítnuto serverem“ (stačí číslo zakázky a hláška),
- konec „web neohlásil testovací prostředí“. Na testengscalc pak chybí proměnná `PROSTREDI=test`,
- cokoli, co by nástroj udělal jinak, než popisuje tento návod.
