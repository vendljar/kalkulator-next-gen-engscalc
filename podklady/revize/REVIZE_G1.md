# Revize dávky G1 (poradce) — 25. 11. 2026

- **Větev:** `claude/g1-uklid`, HEAD `4fde6fc3351fac966ce4125f81d712ca56d722b1`
- **Základ:** integrace `9776c346` (merge-base s `origin/claude/integrace-16-10`)
- **Rozsah:** #753 (SA R6, R9, R10), #754 (autor ve vlastnostech Wordu), #756 (kontrola `rucniPolozkaPomer`),
  svěřené G1-T1 (dočasná značka verze v roadmapě)

## Verdikt: OPRAVIT (jedna malá oprava #754), pak sloučit

Kontrola šablon (#753) a nová kontrola (#756) jsou v pořádku. **#754 u hlavní šablony nabídky nesplní účel** —
viz S1. Oprava je na pár řádků a jeden test; ostatní nálezy sloučení nebrání.

## Co jsem ověřil a jak

Čtení celého diffu kódu a vlastní zkoušky v dočasných stromech nad HEAD větve a nad základem.
Celé kolo, mutace ani porovnání 390 jsem nepouštěl — spoléhám na údaje dávky.

| co | výsledek |
|---|---|
| sady | `test_g1_uklid` 27/0, `test_kontroly` 159/0, `test_evidence` 69/0, `test_roadmapa` 26/0, `test_docxgen` OK, zlatá sada VS 319/319 |
| skutečné šablony z Disku (jen čtení, 17 souborů) | CN v18 CZ/EN/DE/FR, nabídka PROJ v9 CZ/EN/DE/FR, SoD realizace v6 CZ/EN/DE/FR, SoD projekce v4 CZ/EN/DE/FR, plná moc |
| soubory z jiných nástrojů (6) | python-docx, LibreOffice, `zip` s extra poli i bez, proudový zápis (data descriptor), archiv s komentářem |
| #756 | 5 běžných a hraničních kalkulací přes `rpPomerPrepsany` |

Šablona krycího listu ani objednávky na Disku pod názvem `Sablona_*` není (krycí list a objednávka PROJ vznikají od
nuly) — ty jsem zkoušet nemohl.

## Zaměření koordinace

### Kontrola šablon neodmítá platné šablony (#753)

- **Všech 17 skutečných šablon a 6 souborů z jiných nástrojů projde:** `zipPrecti` je přečte, `sablonaObsahVadyZipu`
  dá nula vad na HEAD i na základu. Žádná falešná vada u R6 (počet položek, jméno v lokální hlavičce, konec adresáře),
  R9 (BOM) ani R10.
- R6 je v `zipPrecti`, tedy i v cestě **tisku**, ne jen při nahrání šablony. Proto je podstatné, že už zveřejněné
  šablony projdou — projdou.
- R10: `sablonaObsahText` teď při nečitelné části hází; volá ji jen nový obal `sablonaObsahTextKontrola`, žádný jiný
  volající v `src/`, `netlify/` ani `nastroje/` není.

### #754 nemění nic jiného

- U všech 23 souborů se vygenerovaný Word na HEAD liší od základu **jen v `docProps/core.xml`**; `word/document.xml`
  a všechny ostatní části jsou bajt po bajtu stejné.
- V `core.xml` se mění jen `dc:creator` a `cp:lastModifiedBy`; zbytek souboru (data, revize, název…) je stejný.
  Prvek, který šablona nemá, se nepřidá (CN v18 nemá `dc:creator` — nevznikne).

### #756 nehlásí běžné kalkulace

Běžná kalkulace, nová kalkulace, přepsaný řádek Spojovací materiál bez ruční položky, přepsaná cena řádku Lakování
bez ruční položky, ruční položka v jiné sekci s přepsaným řádkem — pětkrát ticho. Pravidlo se ozve jen u ruční
položky Spojovacího materiálu nebo Lakování (vzniká jen importem) a zároveň ručně přepsaného řádku Hrubé OCK.
Je to upozornění, cenu ani tisk nemění; počet pravidel 56 je opravený na všech třech místech.

## Nálezy

### Vysoké

Žádné.

### Střední

**S1 — #754: šablona CN v18 má druhou část vlastností `docProps/core0.xml` a ta se nepřepisuje.**
Všechny čtyři jazykové verze cenové nabídky OCK v18 nesou vedle `docProps/core.xml` ještě `docProps/core0.xml`
(v `_rels/.rels` druhý odkaz typu core-properties, v `[Content_Types].xml` druhý záznam). V ní je `dc:creator`
i `cp:lastModifiedBy` se jmény osob. `docxVlastnostiAutor` přepisuje jen část se jménem přesně `docProps/core.xml`,
takže jména zaměstnanců jdou v nejčastějším dokumentu k zákazníkovi dál. Který z obou souborů Word ukáže ve
Vlastnostech, jsem neověřoval; kdo si soubor rozbalí nebo ho otevře jiným programem, jména uvidí.
Návrh opravy: přepsat každou část, jejíž typ obsahu je core-properties (podle `[Content_Types].xml`), nebo aspoň
každou `docProps/core*.xml`; test se dvěma částmi s pojistkou. Dlouhodobě šablonu v18 uložit bez `core0.xml`.

**S2 — G1-T1: dočasná značka verze může propadnout do testu i do main a nikdo se neozve.**
Dnes ji větev opravdu nese (#753, #754, #756 mají `verze: "G1"`). Když ji koordinace při sloučení nepřepíše:
`nastroje/novinky.py` vybírá hotové položky podle seznamu verzí, takže je do NOVINEK ani do popisu releasu
nezařadí; `nastroje/prehled_stavu.py` je ukáže s verzí „G1“ a neumí říct, jestli jsou v main. Před G1-T1 by na to
kontrola roadmapy spadla. Doporučení: **ponechat** (řeší skutečný problém dávky bez přiděleného čísla), ale doplnit
pojistku — kontrola roadmapy v režimu „bez dočasných“ (přepínač), kterou pustí krok `staticke` nebo koordinace nad
integrací po každém sloučení, a `novinky.py` ať na dočasnou značku skončí chybou. Do té doby je to ruční krok
koordinace; zapsat ho do postupu slučování.

### Nízké

**N1 — #754: jiné stopy ve vlastnostech zůstávají.** `docProps/app.xml` nese u nabídky PROJ v9 `Company`
„Notebook“ a u plné moci „MHMP“ (zbytek po původním dokumentu); plná moc má totéž i v `docProps/custom.xml`.
SoD realizace (jazykové verze), SoD projekce a plná moc mají vyplněný `dc:title`. Nejde o jména zaměstnanců, ale
zákazník to ve Vlastnostech vidí. K rozhodnutí J. V., jestli přepisovat i `Company` a `dc:title`.

**N2 — R6 je i v cestě tisku.** Kdyby se v úložišti našla starší zveřejněná šablona uložená nástrojem, který píše
adresář jinak, tisk by nově skončil chybou místo dokumentu. U současných šablon to nehrozí (ověřeno), jen to při
příští výměně šablony stojí za jeden zkušební tisk.

**N3 — mimo dávku, k ověření:** jazykové verze SoD projekce v4 na Disku mají 16 kB proti 124 kB české a jsou
z 21. 10., česká z 22. 11. Obsah jsem neporovnával; může jít jen o obrázek v české verzi.

## Co jsem neověřil

Mutace [G1] a [SA], celé kolo a porovnání 390. Chování Wordu u dvou částí core-properties (S1). Šablony nahrané
v aplikaci na testu a na ostrém jsem neviděl — zkoušel jsem soubory z Disku, které mají být jejich zdrojem.
