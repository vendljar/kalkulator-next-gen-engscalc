# Revize dávky DT — datum cenové nabídky = den tisku (#745, #746)

- Datum revize: 24. 11. 2026, nezávislé sezení (větev `claude/revize-dt`).
- Revidovaný rozdíl: `git diff 0fd6410..fe95509` (větev `claude/dt-datum-tisku`, 25 souborů, +610 −34).
- Ve větvi DT se nic neměnilo; nic nešlo na weby, do Pipedrive ani na Disk.

## Verdikt: SLOUČIT PO OPRAVÁCH

Kód dělá, co J. V. 24. 11. zadal, a nenašel jsem vadu, která by měnila cenu, číslo
nabídky, otisk zámku nebo kontrolu shody tisku. Před sloučením je potřeba doplnit testy
k řetězu „datum z náhledu → zámek“ (N1): je to jediná část, která zajišťuje, že dotisk
ponese stejné datum jako papír zákazníka, a dnes ji nehlídá žádný test. N2 a N3 jsou
malé doplňky testů téhož druhu. N4 a N5 jsou otázky pro J. V., sloučení neblokují.

## Co jsem spustil

| Co | Výsledek |
|---|---|
| `bash nastroje/testovaci_kolo.sh --bez-mutaci --proti origin/test --ocekavane podklady/porovnani/ocekavane_dt_2026-11-24.txt` nad fe95509 | KOLO_VYSLEDEK |
| `src/test_dt_datum_tisku.js` nad fe95509 | 60 prošlo, 0 selhalo |
| `netlify/test_dt_datum_tisku.mjs` nad fe95509 | 12 prošlo, 0 selhalo |
| Pojistka: tytéž dvě sady nad 0fd6410 | 49 z 60 selže; 8 z 12 selže (souhlasí s předávkou; u serveru předávka uvádí „6 → 12“, naměřeno 4 → 12) |
| Porovnání sestavení 0fd6410 × DT bez seznamu očekávaných | 367 kalkulací, 4 rozdílné — přesně 4 případy ze seznamu, pole `ph-cz` (jen symbol DATUM), `nahled-cz`, `docx`, `sod` |
| Porovnání 0fd6410 × DT s dočasně vráceným pravidlem data (neodeslaná = datum založení, jen v kopii `src`) | texty dokumentů a symboly shodné u všech 367 kalkulací |
| 11 vlastních mutací (kopie stromu, ne větev DT) | 6 zachyceno, 5 přežilo (N1–N3) |
| Sonda serveru (paměťové úložiště): zpětné datum, odemčení a nové zamčení, dotisk s přepisem, meze, tvary | viz body 1 a N5 |

## Prověřené oblasti

### 1. Zámek a `zamek.datumNabidky`

- **Kdo ho zapisuje.** Jen `zamkniVariantu` při prvním zamčení; všechny zámky vznikají
  přes `zamekPoTisku` (CN OCK, CN PROJ, SoD, náhled). Dotisk pole nepřepíše (větev
  „další tisk“, mutace DT to hlídá).
- **Server, nový zámek.** Platné datum v mezi přijme, jiné nahradí dnem `kdy` v Praze.
  Sonda: posun −8 → dnešek, −7 a −1 → ponecháno, +1 → dnešek; číslo, objekt, `null`,
  prázdný řetězec, ISO s časem, mezera na začátku → dnešek. Chybějící pole zůstane
  chybět (starší klient v mezipaměti tiskl datum založení, dotisk ho ponese také).
- **Server, uložený zámek.** `uloZamekRazitkaDrz` vrátí uloženou hodnotu při přepisu,
  smazání i dopsání starému zámku (sonda i sada DT). Zámky před DT tedy pole nezískají
  a tisknou dál `variantaDatum`.
- **Mimo klíč.** `uloZamekKlic` pole nenese; otisky `zamek`, `snimek`, `vyp`, `cena`
  ve zlaté sadě i v porovnání beze změny.
- **Odemčení a nové zamčení.** `odemkniVariantu` přesune celý zámek do `odemceni[]`
  a nový zámek dostane nové datum (sonda: 21. 11. → odemčeno → 24. 11.). Odemčení a nové
  zamčení v jednom uložení neprojde (jiný klíč → 409), takže se staré datum nemůže
  přenést na nový zámek.
- **Víc variant.** Každá varianta má svůj zámek a své datum. **Prodej** pole nemění
  (drží ho server).
- **Obnova.** Z otisku i ze souboru se datum ponechá, je-li v mezi vůči `kdy`, jinak
  se zahodí. Obnova je jen pro administrátora a `kdy` je ze stejného zdroje, takže to
  mez nerozšiřuje. Větev nemá test (N2).
- **Podvržení z prohlížeče.** Mez „≤ den odeslání, nejvýš 7 dní před“ je smysluplná
  a vůči `kdy` ji obejít nejde. `kdy` ale píše prohlížeč — viz N5.

### 2. Půlnoc, letní a zimní čas, hodiny klienta

- `zamekDenPraha`: 23:00 UTC v zimě a 22:00 UTC v létě už dává další pražský den,
  Silvestr přechází do nového roku, přechody času 29. 3. a 25. 10. v pořádku. Výsledek
  nezávisí na časovém pásmu procesu (ověřeno s `TZ=America/New_York`).
- Mez 7 dní se počítá v milisekundách, takže přes jarní změnu času je o hodinu volnější
  (kolem půlnoci projde i 8. den). Bez praktického dopadu.
- Neodeslaná nabídka bere den z hodin prohlížeče (dokument se skládá v prohlížeči).
  Hodiny napřed o víc než 10 minut server u zámku odmítne (`zamekKdyProblem`, beze změny).
- Náhled otevřený před půlnocí a vytištěný po ní: zámek převezme den z náhledu, papír
  i dotisk se shodují. Tohle chování nemá test (N1).

### 3. Dokumenty

| Místo | Po DT | Posudek |
|---|---|---|
| CN OCK, všechny jazyky, Word, tiskový i online náhled (`nabidka.js`, symbol DATUM) | datum nabídky | v pořádku |
| CN PROJ, všechny jazyky (`nabidkaProjDatumIso`) | datum nabídky; zámek před DT původní řetěz `v.datum → variantaDatum → hlavička` | v pořádku |
| SoD OCK a PROJ „nabídka ze dne“ (přes `nabidkaData` / `nabidkaProjData`) | datum nabídky | v pořádku |
| Objednávka PROJ „ze dne“ (`p.DATUM`) | datum nabídky | v pořádku |
| Krycí list OCK a PROJ „Dne“ | neodeslaná dnešek v Praze; odeslaná zmrazená hodnota | v pořádku, výhrada N4 |
| Plná moc (`sod.js`, `variantaDatum`) | beze změny | v pořádku |
| Datum podpisu smlouvy (`sodDatumPodpisu`) | beze změny | v pořádku |
| Controlling (`controlling.js`, `variantaDatum`), technická specifikace (`ZAK.datum`), stáří ceníku, seznamy | beze změny | v pořádku |
| Pipedrive (podklad poznámky) | nese pole krycího listu včetně „Dne“; hodnota stejná jako dřív (dnešek, u odeslané zmrazená) | beze změny |

Jiné místo, které by bralo datum nabídky ze starého zdroje, jsem nenašel (prohledáno
`variantaDatum`, `.DATUM`, `datumCz`, `kryciDnesIso`, volání `nabidkaData` a `nabidkaProjData`).

### 4. Porovnání sestavení a seznam očekávaných

Seznam má 4 pravidla, každé na jeden případ a čtyři pole; žádná hvězdička. Že pravidla
nezakrývají jinou změnu, jsem ověřil dvakrát: nástroj u `ph-cz` vypisuje jako změněný
jen symbol DATUM, a s dočasně vráceným pravidlem data vyjdou symboly i texty dokumentů
u všech 367 kalkulací shodně. (V té kontrolní variantě se liší otisk `pd` u jedné
fixtury — je to důsledek mého zásahu do „Dne“ krycího listu, ne vlastnost DT; skutečné
porovnání 0fd6410 × DT má `pd` shodné.)

Omezení nástroje, ne chyba dávky: pevná sada neobsahuje dokumenty PROJ ani zámek
s `datumNabidky`. Tyhle části hlídá jen sada DT.

### 5. Svěřená rozhodnutí

- **DT-1** (normalizace v `overit_vz_tisk.mjs`, hledané úseky mutací): test neoslabuje.
  Nová náhrada odstraní jen `zakaznik:TISK_ZAMEK.zakaznik,` ze společného objektu, původní
  náhrada pro skript bez data zůstala. Upravené mutace mění stejný prvek seznamu jako
  dřív a `datumNabidky` v náhradě ponechávají. Splňuje podmínky svěřeného rozhodnutí.
- **DT-2** (zlatá sada `test_vs_zlata.json`): změnily se 4 řádky, v každém jen `ph-cz`,
  `nahled-cz`, `docx`, `sod`; `cena`, `vyp`, `vypZ`, `kryci`, `spec`, `pd`, `ctrl`, `snimek`,
  `zamek` beze změny. Jde o vědomou změnu dokumentu podle rozhodnutí J. V., ne o technickou
  variantu testu — do svěřených patří jen jako záznam o přegenerování, což zápis říká.

### 6. Testy s pojistkou

Pojistka obou sad doložena (viz tabulka). Z 11 vlastních mutací sady zachytily: mez
7 dní, mez „po dni odeslání“, nezapsání data při zamčení, PROJ zámek před DT, krycí list
OCK u zámku před DT, server doplňující datum zámku bez něj. Pět přežilo — N1 až N3.

## Nálezy

### N1 — řetěz „datum z náhledu → zámek“ nemá žádný test (střední, testy)

Tři mutace přežily sady DT i deset souvisejících sad tisku a zámku
(`test_tisk_ceny_skript`, `test_vz_zamek`, `test_snimek_po_tisku`, `test_tisk_behem_ulozeni`,
`test_tisk_kolize_k8`, `test_zmrazeni_kl`, `test_zamek_strany`, `test_zamek_otisk`,
`test_vz_tisk_vstupy`, `test_vz_ui`):

- `zamek_ui.js`: `zamekPoTisku` ignoruje `navic.datumNabidky` a vždy bere dnešek;
- `common.js`: `tiskListaSkript` datum do volání `zamekPoTisku` nepředá;
- `zakazka_ui.js`: náhled OCK datum do skriptu nevloží.

Pole `datumNabidky` se mimo dvě sady DT v žádném testu nevyskytuje. Při každé z těch
tří chyb by nabídka z náhledu otevřeného před půlnocí nesla na papíře včerejšek a dotisk
dnešek — tedy přesně rozdíl, kterému má pole zabránit.

Návrh: do `src/test_dt_datum_tisku.js` (nebo vedle) přidat
- `tiskListaSkript` s datem → skript volá `zamekPoTisku(…, null, {datumNabidky:…})`,
  se zákazníkem i bez; bez data → skript stejný jako před DT;
- `zamekPoTisku` s `navic.datumNabidky` = včerejšek → zámek nese včerejšek; 8 dní staré
  nebo neplatné → dnešek; u dotisku se datum nemění;
- náhled OCK a PROJ vkládá do skriptu stejný den, jaký tiskne symbol DATUM;
- tři mutace [DT] k tomu.

Drobnost k téže části: náhled OCK počítá datum pro skript zvlášť (`nabidkaDatum`), ne
z už spočítaného symbolu DATUM. Rozdíl je v milisekundách, ale vzít hodnotu z jednoho
místa by vyloučilo i ten.

### N2 — obnova: zahození neplatného data nemá test (nízká, testy)

Mutace, která v `zakazka_kontrola.mjs` ve větvi obnovy neplatné datum nesmaže, obě sady
přežila. Návrh: po vzoru `test_k40b_prodej_mez.mjs` (obnova z otisku a ze souboru) přidat
dva případy — platné datum zůstane, datum mimo mez se zahodí — a mutaci.

### N3 — krycí list PROJ „Dne“ nemá účinný test (nízká, testy)

Mutace vracející v `kryci_proj.js` `kryciDnesIso()` přežila. Test na řádku 173 srovnává
předvyplnění s datem nabídky jen u neodeslané varianty, kde je obojí dnešek. Návrh:
stejná kontrola po odeslání jako u OCK (řádek 176) a mutace.

### N4 — krycí list „Dne“ a nabídka se přes půlnoc rozejdou (nízká, chování — rozhodne J. V.)

Při zamčení se „Dne“ zmrazí (`kryciZmrazPodminky`) ještě před vznikem zámku, tedy na
dnešek. Nabídka z náhledu otevřeného včera drží včerejšek. Krycí list pak nese jiný den
než nabídka, a protože zmrazená hodnota má přednost, `kryciDatumNabidky` to u odeslané
už neopraví. Nastane jen při tisku z náhledu otevřeného přes půlnoc.

Doporučení: při prvním zamčení zmrazit „Dne“ na `datumNabidky` zámku. Jde o text
dokumentu, proto rozhodnutí J. V.; lze i přijmout jako známou drobnost.

### N5 — mez data se měří od času prohlížeče (nízká, bezpečnostní mez — rozhodne J. V.)

Server ověřuje datum nabídky vůči `zamek.kdy`, a `kdy` píše prohlížeč (smí být až
400 dní staré kvůli tisku bez sítě). Upravený klient tak může nový zámek opatřit datem
nabídky až zhruba 407 dní zpět. Sonda: `kdy` −300 dní, datum −306 dní → uloženo (200),
razítko přijetí serveru přitom neslo dnešek.

Není to zhoršení proti stavu před DT (dřív nabídka tiskla `v.datum`, které klient psal
bez jakékoli meze) a do budoucnosti datum posunout nejde. „Server datum ověřuje“ ale
platí jen relativně ke `kdy`.

Doporučení: ponechat a zapsat do `BEZPECNOST_MEZE` jako vědomou mez. Přísnější varianta
(datum nabídky nejvýš N dní před časem přijetí serverem) by zpřísnila i tisk bez sítě.

### N6 — náhled otevřený déle než 7 dní (informace)

Tisk z takového náhledu: papír nese staré datum, zámek dostane dnešek (klient i server
ho nahradí), dotisk se od papíru liší. Doporučení: přijmout, případně při tisku z náhledu
staršího než dnešek obchodníka upozornit.

### N7 — víc zákazníků (informace pro J. V.)

Datum je jedno na variantu. Dotisk pro dalšího zákazníka o několik dní později nese den
prvního odeslání varianty. Odpovídá zadání („odeslaná drží datum zámku“); uvádím, aby
to nepřekvapilo.

### N8 — předávka: počet selhání pojistky serveru (informace)

Předávka uvádí u `netlify/test_dt_datum_tisku.mjs` „6 → 12 OK“; nad 0fd6410 projdou 4
a selže 8. Na závěr to nemá vliv, jen upřesnit číslo.

## Co se nezměnilo (ověřeno)

Cena, řádky kalkulace, číslo nabídky, klíč a otisk zámku, snímek, zmrazený výsledek
a kontrola shody (B59, B232 pracují s čísly výsledku, datum v nich není), controlling,
Pipedrive, plná moc, datum podpisu smlouvy, `v.datum` a `zak.datum`.
