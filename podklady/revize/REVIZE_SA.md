# Revize dávky SA — kontrola šablon Word B270–B272 (#719–#721)

Datum 23. 11. 2026. Rozsah `git diff 133a8f5..b3d710a` (větev `claude/sa-sablony`). Revizor: poradce (kód neměněn,
na weby nic). Pokusy běžely lokálně nad syntetickými .docx; firemní šablony (`KNG_PODKLADY`) v sezení nebyly.

## Verdikt: SLOUČIT PO OPRAVÁCH

Před sloučením opravit **R1** (strop B272 jde obejít) a **R2** (stejná cesta, 3,3 s rozboru). **R3** (příbuzná pole)
je rozhodnutí J. V. — doporučení níže. R4–R8 jsou nízké, mohou jít s opravou R1 nebo do další dávky.
B270 a B271 v zadaném rozsahu drží, regrese v generování jsem nenašel.

## Co jsem ověřil

- `src/test_sa_sablony.js` 41 OK / 0 FAIL; `src/test_sablona_obsah.js` 102 / 0 (firemní šablony přeskočeny).
- Pojistka: nový test nad kódem `133a8f5` → 11 OK, **30 FAIL** (CHANGELOG a předávka uvádějí 29 — opravit číslo).
- PoC `podklady/audit_2026-11-20/poc_DO_sablona_server.mjs`: C5, C6, C7, C12 odmítnuto, souhrn ODOLNÉ (C12 116 ms).
- Deklarovaná × skutečná velikost: `zipPrecti` deklarovanou velikost nečte, počítá skutečně rozbalené bajty po
  kouscích (`zipRozbal`) a u STORE délku dat — strop části podvrženou hlavičkou obejít nejde. Useknutý adresář nebo
  odkaz mimo soubor skončí výjimkou → „soubor nejde rozbalit“.
- Výchozí chování `zipPrecti(u8)` bez voleb je beze změny (ceníky `xlsx.js`, generátor, překlad).
- Legitimní tvary projdou: `[Content_Types].xml`, `_rels/.rels`, `image%201.png`, položka-složka `word/media/`,
  obrázek 9 MB, XML část přesně 8 MB, 7 × 8 MB XML (588 ms). Názvy z BOM na začátku se sjednotí (TextDecoder).
- Kolo, mutace jádra a porovnání sestavení jsem nepouštěl znovu — beru údaje dávky (SHODA 367/367, jádro 1308/1308).
  Celé mutace serveru dávka nepustila (jen „sablon“ 31/31) — doběhnout v Actions před `test`.

## Nálezy

### R1 — STŘEDNÍ — strop B272 se obejde příponou a 65 mezerami · `src/sablona_obsah.js:336-337`, `:349`

Strop se u části bez přípony `.xml` / `.rels` rozhoduje podle prvních 64 bajtů (`subarray(0, 64)`), ale o tom, zda se
část rozebírá, rozhoduje o pár řádků níž celý text (`sablonaJeXml(text)`, mezery na začátku přeskakuje). Část
`word/media/x.bin` = 65 mezer + 60 MB XML: strop ji nevidí, `zipPrecti` ji nezastaví (není `.xml`), rozbor ji celou
projde. Změřeno: šablona **přijata** (0 vad), kontrola 439–635 ms, generátor ji vyplní (725 ms). Tedy stav před B272,
jen s jinou příponou.

Návrh: jedno společné rozhodnutí „je to XML“ pro strop i rozbor, z bajtů a bez dekódování celé části — přeskočit BOM
a bajty 0x09/0x0A/0x0D/0x20/0x00, první jiný bajt musí být `<` (pokryje UTF-8 i UTF-16). Pořadí v
`sablonaObsahVadyZipu`: (1) `jeXml = přípona || začátek z bajtů`; (2) `!jeXml` → dál jen kontroly názvu, bez
dekódování; (3) `jeXml && delka > strop` → vada; (4) teprve pak `sablonaObsahText`. Test: `.bin` s 65 a s 100 000
mezerami před `<` nad strop → odmítnuto; mutace „rozhodnutí jen z prvních 64 B“.

### R2 — STŘEDNÍ (bylo už před dávkou, B272 ho nezavřel) — binární část čtená jako UTF-16 · `src/sablona_obsah.js:129`, `:345`

Každá část se před rozhodnutím celá převede na text. Část, jejíž 2. a 4. bajt je nula, jde smyčkou
`String.fromCharCode` po znaku. 60 MB `.bin` s obsahem `A\0A\0…`: kontrola **3 257 ms** a šablona projde — horší než
původní C12 (~1,9 s). Návrh: oprava R1 to zavře pro ne-XML části (nedekódují se vůbec); pro XML části pod stropem
nahradit smyčku `new TextDecoder('utf-16le' | 'utf-16be')`. Test s měřením času (mez např. 1 s) + mutace.

### R3 — STŘEDNÍ — B271 má rovnocenná pole, která projdou · `src/sablona_obsah.js:72-76` — rozhodnutí J. V.

Ověřeno, že projdou: `INFO FileName \p`, `INFO Author`, `DOCPROPERTY Author`, `DOCPROPERTY LastSavedBy`,
`TEMPLATE \p`, `LASTSAVEDBY`, `USERINITIALS`, `USERADDRESS`. Pole `INFO` a `DOCPROPERTY` umějí vrátit totéž co
zakázaná `AUTHOR` / `FILENAME`, takže B271 jde obejít jedním slovem navíc. `TEMPLATE \p` v mezích dávky chybí —
vrací cestu k šabloně Normal.dotm v profilu uživatele, tedy přihlašovací jméno Windows stejně jako `FILENAME \p`.

Doporučení: **přidat všech šest** — `USERINITIALS`, `USERADDRESS`, `LASTSAVEDBY`, `TEMPLATE`, `INFO`, `DOCPROPERTY`.
První čtyři v nabídce nemají co dělat. `INFO` a `DOCPROPERTY` bývají ve firemních šablonách (název, číslo dokumentu
z vlastností), proto před přidáním pustit `test_sablona_obsah.js` s `KNG_PODKLADY`; kdyby je šablony používaly,
zakázat jen argumenty `Author`, `LastSavedBy`, `LastAuthor`, `Manager`, `Company`, `FileName`, `Template`
(první slovo za typem, bez ohledu na velikost písmen a uvozovky). Pozor: zákaz platí i v generátoru
(`docxObsahZkontroluj`), takže už zveřejněná šablona s takovým polem by přestala jít vyplnit — proto nejdřív
ověření nad firemními šablonami. Chování Wordu u `INFO … \p` a `TEMPLATE \p` beru z dokumentace polí, ve Wordu
jsem ho nezkoušel.

Poznámka mimo rozsah: jméno autora nese i `docProps/core.xml` šablony (`dc:creator`, `cp:lastModifiedBy`) a generátor
ho kopíruje do každé nabídky bez ohledu na pole. Stojí za samostatnou položku roadmapy.

### R4 — NÍZKÁ — neplatné `%` vypne dekódování názvu · `src/sablona_obsah.js:88`, `:326`, `:418`

`decodeURIComponent` při jediné neplatné sekvenci vyhodí výjimku a kontroluje se jen surový název. Projdou
`word/%2e%2e/x%ZZ.xml` i `word/%2e%2e/100%.xml`; program, který dekóduje shovívavě, uvidí `..`. Návrh: vlastní
dekódování po jednotlivých sekvencích `nazev.replace(/%([0-9a-f]{2})/gi, …)` (neplatné nechat), stejná funkce na
všech třech místech. Test: oba názvy výše → odmítnuto.

### R5 — NÍZKÁ — další tvary názvu, které projdou · `src/sablona_obsah.js:86-95`

Ověřeno, že projdou: segment `.. ` a `..%20` (Windows koncové mezery a tečky segmentu ořezává), `word/x.xml:ads`
(dvojtečka jinde než na 2. místě — datový proud NTFS), `word//document.xml` vedle `word/document.xml` (uvedeno jako
mez, ale pro program, který lomítka slučuje, je to duplicita), název se znakem U+FFFD (neplatné UTF-8, např.
prodloužené kódování tečky). Návrh: místo dalších zákazů segment po ořezu koncových mezer a teček nesmí být prázdný
(`/^[. ]*$/`), prázdný segment povolit jen jako koncové lomítko složky, zakázat `:` kdekoli a U+FFFD; duplicity
porovnávat po sloučení lomítek a `normalize('NFC')`. Word sám píše jen ASCII názvy, legitimní šablonu to nezasáhne
(ověřit s `KNG_PODKLADY`).

### R6 — NÍZKÁ (mimo rozdíl, vrstva ZIP) — položka skrytá počtem v koncovém záznamu · `src/docxgen.js:84`

`zipPrecti` čte tolik položek, kolik říká počet v koncovém záznamu, a neověřuje, že tím adresář skončil. Archiv
s počtem o 1 menším: kontrola vidí čistou šablonu (0 vad), Python `zipfile` i `unzip -l` vidí navíc druhý
`word/document.xml` s `INCLUDETEXT` — obejde zároveň kontrolu duplicit B270. Podobně jméno v lokální hlavičce
(`../../../evil.xml`) se nečte vůbec. Dopad je malý: generátor ZIP zapisuje znovu z toho, co kontrola viděla, takže
zákazník skrytou položku nedostane; týká se jen surové šablony stažené z úložiště. Návrh (další dávka): po smyčce
vyžadovat `off === začátek adresáře + velikost adresáře`, shodu obou počtů v záznamu a shodu jména lokální hlavičky
s adresářem.

### R7 — KOSMETICKÁ — `jmena = {}` dědí z prototypu · `src/sablona_obsah.js:321`, `:332`

Jediná položka `constructor` nebo `__proto__` se hlásí jako „dvě položky téhož jména“. Bezpečný směr, jen matoucí
hláška. Návrh: `Object.create(null)` nebo `Set` (totéž by sneslo `odkazy` o řádek výš).

### R8 — NÍZKÁ — testy a mutace

- Pojistka drží (30 FAIL před opravou), jen číslo v CHANGELOG a předávce je 29.
- Řádek „řídicí znak“ (`sablona_obsah.js:90`) nemá mutaci; test `ridiciZnak` existuje, mutaci doplnit.
- Strop v `zipPrecti` se testuje jen příponou `.xml` malými; doplnit `.XML`, `.rels` a STORE × DEFLATE
  (test zapisuje jen STORE přes `zipZapis`, větev `zipRozbal` se stropem části hlídá jen PoC C12).
- Chybí testy obejití z R1, R2, R4 (doplnit s opravou, každý s pojistkou).
- Strop 8 MB neověřen na firemních šablonách — podmínka před `main`: `KNG_PODKLADY=… node src/test_sablona_obsah.js`.
  Riziko je malé (XML části Wordu ve stovkách kB, obrázky strop nemají), ale ověření je levné.

## Strop a legitimní šablony

8 MB na jednu XML část je bezpečně nad firemními šablonami (zabalené ~1,4 MB, většinu tvoří obrázky; `document.xml`
ve stovkách kB). Strop se netýká obrázků ani ceníků. Úprava R1 strop rozšíří jen na části, které začínají `<` —
obrázky a fonty to nejsou. Jediný legitimní případ, který by narazil, je obrázek SVG nad 8 MB; v šablonách nabídek
nepravděpodobný.

## Pro koordinaci

1. Sezení SA: opravit R1 + R2 (jedna úprava), doplnit testy a mutace z R8, opravit číslo pojistky. R4, R5, R7 podle
   kapacity ve stejné dávce.
2. J. V.: rozhodnout R3 (doporučení: přidat všech šest polí po ověření nad firemními šablonami).
3. Roadmapa: R6 (vrstva ZIP) a metadata autora v `docProps/core.xml` jako nové položky.
