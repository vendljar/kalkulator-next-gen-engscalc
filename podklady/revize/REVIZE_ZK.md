# Revize dávky ZK (#755) — zákazníci ze zakázek podle ARES

- **Datum:** 24. 11. 2026
- **Revidovaný rozdíl:** `git diff c89e872..63448cb` (větev `claude/zk-zakaznici-ze-zakazek`)
- **Větev revize:** `claude/revize-zk` (jen tento soubor; revidovaná větev beze změny)
- **Rozsah:** nezávislá revize bezpečnosti a dat. Nic na weby, do Pipedrive ani na Disk; ARES jen zástupným
  `fetch` v testech a sondách.

## Verdikt: SLOUČIT PO OPRAVÁCH

Bezpečnostní jádro je v pořádku: jen administrátor, role z účtu, zápis jen ze serverového náhledu, nic se
nepřepíše, klient nedostane kontakty ani jména souborů zakázek. Cena a dokumenty se nemění (porovnání sestavení proti základu dávky `c89e872`: SHODA 367/367).

Před sloučením srovnat větev s integrací (**R0**) a opravit **R1** (zápis karet bez časového rozpočtu — při větším počtu karet spadne v půlce
a protokol je neúplný). Před spuštěním na ostrém webu opravit nebo změřit **R2** a **R3**. Zbytek jsou
doplnění testů, drobnosti a věci k vědomí J. V.

## Nálezy

| # | Závažnost | Nález | Kdy opravit |
|---|-----------|-------|-------------|
| R0 | procesní | Větev je za integrací (RP, v24.11.6); kolo proti dnešní integraci hlásí 137 rozdílů | před sloučením |
| R1 | střední | Zápis karet běží celý v jednom volání bez časového rozpočtu | před sloučením |
| R2 | střední | Karty se čtou po jedné, v jednom volání až dvakrát; dávka ruší předpoklad „karet jsou desítky“ | před ostrým spuštěním |
| R3 | střední až nízká | Strop 600 dotazů na náhled: „Zkusit znovu“ nic neudělá a nový náhled se ptá stále na tatáž IČO | před ostrým spuštěním |
| R4 | nízká | Testy nehlídají strop počtu karet, dvojče podle názvu, pokračování s cizím id, tvar IČO existující karty | se sloučením |
| R5 | nízká | Propadlý náhled se nemaže a GET ho dál vydává | se sloučením |
| R6 | nízká | Novější zakázka uložená mezi náhledem a zápisem: karta dostane kontakty ze starší | zapsat jako mez |
| R7 | k vědomí J. V. | Do karty jde i banka a číslo účtu ze zakázky (ARES je neověřuje) | rozhodnutí J. V. |
| R8 | informace | Hraniční případy shody sídla a názvu | přijmout |
| R9 | informace | Úložiště `zakaznici_hromadne` mimo zálohu — dopady | k vědomí J. V. |
| R10 | drobnost | Náhled nese seskupení dvakrát; nepoužitý export | volitelně |

### R0 (procesní) — větev je za integrací

Integrace `origin/claude/integrace-16-10` se od založení dávky posunula na `7339a9e` (sloučená dávka RP
#736, v24.11.6 — ruční položky v nabídce a krycím listu, vědomá změna dokumentů). Kolo předepsané zadáním
(`--proti origin/claude/integrace-16-10`) proto dnes dává **137 neočekávaných rozdílů z 367** (symboly
ceny CN a text dokumentů). Tvrzení předávky „SHODA 367/367“ platilo proti integraci v době dávky.

Rozdíly nejsou z dávky ZK: `c89e872` je předek integrace, dávka mění v `src/` jen `zakaznici_ui.js`
a porovnání proti `c89e872` je SHODA 367/367.

**Návrh:** před sloučením sloučit do větve aktuální integraci (čekejte konflikty v `PREDAVKA.md`,
`CHANGELOG.md`, `netlify/mutace.mjs`, `roadmapa/roadmap.json`) a pustit kolo znovu; musí dát SHODA.

### R1 (střední) — zápis karet bez časového rozpočtu

`functions/zakaznici_ze_zakazek.mjs`, větev `akce === 'zalozit'` (ř. 102–138). Náhled se dělá po kouscích
s rozpočtem 7 s, zápis ne: pro každou navrženou kartu jde čtení karty, čtení zakázky a zápis, vše za sebou
v jednom volání.

Sonda (300 navržených karet, úložiště v paměti s počítadlem operací): jedno volání zápisu = **603 čtení
+ 301 zápisů**. Čas jedné operace nad Netlify Blobs se silnou konzistencí jsem tady měřit nemohl; kód sám
počítá s limitem funkce 10 s (`rozpocetMs`), do toho se 900 operací nevejde ani při 15 ms na operaci.

Co se stane, když funkce spadne v půlce (sonda: pád po 100. kartě):

- 100 karet je zapsaných, **protokol žádný**, náhled zůstal;
- obrazovka ukáže „Nezaloženo: …“, i když karty vznikly;
- opakování zápisu doběhne (idempotence funguje), ale protokol pak říká `zalozeno: 201, uzExistovalo: 100`
  — kdo a kdy založil prvních 100 karet, v protokolu není (dohledat jde jen z autora a poznámky karty).

Data se nepoškodí. Vada je v neúplné stopě a v klamné hlášce.

**Návrh:** zápis po kouscích stejně jako náhled — fáze `zapis` v náhledu, v každém volání nejvýš N karet
nebo do rozpočtu, průběžné počty uložené v náhledu, protokol jedním záznamem na konci se součtem;
prohlížeč volá, dokud není hotovo. Test s pojistkou: zápis s malým `rozpocetMs` doběhne na víc volání
a protokol nese celkový počet.

### R2 (střední) — čtení karet po jedné, dvakrát za volání

`karty(s)` čte všechny karty jednu po druhé. Volá se na konci fáze čtení (ř. 166), znovu na začátku fáze
ARES (ř. 179) a při zápisu (ř. 108). Smyčka ARES navíc pustí první dotaz vždy (`dotazy === 0 ||`), i když
je rozpočet volání už vyčerpaný čtením.

Sonda při 300 kartách a 301 zakázkách: první volání náhledu = **904 čtení** (301 zakázek + 2 × 300 karet)
a k tomu až 3 s na jeden dotaz do ARES. Při prvním běhu na ostrém webu (2 karty) to nevadí. Po naplnění
už každý další náhled ano.

Širší dopad dávky: `GET /api/zakaznici` (seznam na záložce Zákazníci, našeptávač) a `dvojceKarty` čtou
karty také po jedné a v komentáři stojí „karet jsou desítky, ne tisíce“. Hromadné naplnění z nich udělá
stovky (sonda: 301 čtení na jedno načtení seznamu).

**Návrh:**
1. v jednom volání číst karty nejvýš jednou a první dotaz do ARES pustit jen, když zbývá čas;
2. množinu IČO existujících karet si uložit do náhledu po fázi čtení a ve fázi ARES číst jen kartu daného
   klíče (kontrola těsně před zápisem zůstává);
3. před ostrým spuštěním změřit na testu s reálným počtem zakázek dobu `GET /api/zakaznici` po naplnění;
   když bude nad jednotky sekund, zrychlit čtení seznamu (souběžně po dávkách) jako samostatný úkol.

### R3 (střední až nízká) — strop 600 dotazů na náhled

Když náhled vyčerpá `aresMaxNavrh`, zbylé položky dostanou „strop dotazů … — zkusit znovu později“
a tlačítko „Zkusit znovu ARES (n)“. To ale nikdy nepomůže: počítadlo `n.dotazu` patří náhledu a už neklesne
(sonda: 0 dotazů navíc). Pomůže jen nový náhled — ten se ale znovu ptá na **všechna** IČO bez karty,
tedy i na ta, která minule vyšla „nesedí“, a to ve stejném pořadí (`fronta.sort()`).

Sonda se stropem 8, 12 IČO (8 nesedí, 4 sedí): tři kola náhled → zápis → nový náhled, pokaždé 8 dotazů
na tatáž nesedící IČO, **založeno 0**, na 4 sedící se nikdy nedošlo. Na ostrých číslech to nastane, když
je IČO bez karty víc než 600; úplně se to zasekne při 600 a víc nesedících. Zbytečné dotazy navíc ubírají
z denního stropu 1 500.

**Návrh:** výsledky „nesedí“ si mezi náhledy pamatovat (IČO + razítko nejnovější zakázky; změna zakázky
= dotaz znovu), nebo aspoň řadit frontu tak, aby dosud nedotázaná IČO šla první. U stropu na náhled
nenabízet „Zkusit znovu“, ale napsat „založte navržené a spusťte nový náhled“.

### R4 (nízká) — mezery v testech

Vlastní mutace nad kopií větve (mimo pracovní strom), sada `test_zk_zakaznici_ze_zakazek.mjs` po každé:

| Mutace | Výsledek |
|--------|----------|
| zápis bez stropu `ZAKAZNICI_MAX` | **přežila** (74/74) |
| zápis nehledá kartu bez IČO se stejným názvem | **přežila** |
| náhled nehledá kartu bez IČO se stejným názvem | **přežila** |
| pokračování náhledu s cizím id (`if (id && …)` vypnuto) | **přežila** |
| existující karta se hledá podle IČO, jak je zapsané (bez `zzIco`) | **přežila** |
| `znovu` i mimo hotový náhled | přežila (bez dopadu na data) |
| prázdný název po normalizaci projde; sídlo bez slova projde | přežily (okrajové) |
| odpověď vydá jméno souboru zakázky | chycena |
| karta bez autora | chycena |
| zápis nemaže náhled | chycena |

Chování samo je správně (sonda: ruční karta se 7místným IČO, karta bez IČO s týmž názvem i karta s IČO
zapsaným jako „CZ…“ zůstaly beze změny a dvojče nevzniklo). Chybí jen testy, které by to hlídaly.

**Návrh:** doplnit čtyři testy s pojistkou — strop počtu karet (`strop` ve výsledku), karta bez IČO se
stejným názvem (náhled „už existuje“, zápis nic), ruční karta se 7místným IČO, pokračování s cizím id → 409.
Mutace [ZK] dávky (24) jsem nepouštěl znovu; přečetl jsem je a míří na správná místa.

### R5 (nízká) — propadlý náhled zůstává

Platnost 24 h se kontroluje jen u POST. `GET` vrací náhled bez ohledu na stáří a záznam `zk-navrh` nikdo
nesmaže, dokud správce nespustí nový náhled nebo „Zahodit“. Dokumentace (`manual/kompletni/provoz.json`)
uvádí „náhled do zápisu nebo 24 h“. Náhled nese názvy a sídla firem ze zakázek; u podnikající fyzické
osoby je to jméno a adresa (veřejný údaj z rejstříku, ale osobní).

**Návrh:** v `GET` propadlý náhled nevracet a smazat; totéž na začátku POST.

### R6 (nízká) — novější zakázka mezi náhledem a zápisem

Zápis znovu čte zakázku z náhledu a ověří ji proti uloženému subjektu ARES. Neověří, že je pořád
nejnovější: když mezitím někdo uloží novější zakázku téže firmy s jiným kontaktem, karta dostane kontakt
ze starší (sonda 8: „Starý Kontakt“). ARES se při zápisu znovu neptá — „nové ověření“ je porovnání zakázky
se subjektem starým nejvýš 24 h.

**Návrh:** přijmout a zapsat do `BEZPECNOST_MEZE.md` (okno nejvýš 24 h, kontakt jde v kartě opravit).

### R7 (k vědomí J. V.) — co se ze zakázky přenáší

Z nejnovější zakázky (u dalšího zákazníka z jeho hlavičky a jeho zástupců) jde do karty: kontaktní osoba,
zápis v rejstříku, **banka, číslo účtu**, zástupce smluvní (jméno, pozice, telefon, e-mail), obchodní
a technický (jméno, telefon, e-mail), fakturace (e-mail, telefon). Každé pole nejvýš 300 znaků, objekty
a pole se zahodí. Název, sídlo, IČO a DIČ jsou jen z ARES.

- Okruh lidí, kteří údaje vidí, se nemění: zakázky i karty čte každý přihlášený.
- Banku a účet ARES neověřuje; karta je pak předvyplňuje do dalších zakázek. Autor karty je správce, takže
  obchodník je může jen navrhnout ke změně (B234).

**Otázka pro J. V.:** přenášet do hromadně založené karty i banku a číslo účtu? **Doporučení: ano,
ponechat** — je to stejné jako ruční „Založit z otevřené zakázky“ a manuál to uvádí.

### R8 (informace) — shoda názvu a sídla

Totožnost firmy drží IČO (ARES vrátí subjekt jen se shodným IČO — sonda s cizím IČO v odpovědi: „nevede“)
a název shodný po normalizaci. Cizí podobná firma neprojde: musela by mít pod IČO ze zakázky stejný název.
Hraniční případy sídla, které projdou a nevadí:

- číslovaná ulice („17. listopadu 2172/15“): první číslo adresy je „17“, takže hlavička projde i bez čísla
  popisného;
- hlavička bez ulice (obec + PSČ + číslo popisné);
- adresa ARES bez PSČ a čísla: stačí shoda slov.

Správně neprojde: „Praha 10“ proti „Praha 1“, jiné PSČ, jiná ulice, „v likvidaci“ jen na jedné straně.
Přísnost názvu dává jen zbytečná „nesedí“ („X as“ ≠ „X a.s.“, „A-B“ ≠ „AB“). Regulární výrazy jsem zkusil
na nepříznivých vstupech do 300 znaků — bez zpoždění.

### R9 (informace) — `zakaznici_hromadne` mimo zálohu

Po obnově ze zálohy zmizí protokol hromadných zápisů, rozpracovaný náhled a denní počítadlo. Dopady:
náhled se spustí znovu; počítadlo začne od nuly (ten den nejvýš o 1 500 dotazů víc); stopa „kdo a kdy“
zůstane jen v kartách (autor, čas založení, poznámka s datem ověření). Karty v záloze jsou.
**Souhlasím s výjimkou**, J. V. ji má potvrdit.

### R10 (drobnost)

- Uložený náhled drží po fázi čtení `seskup.skupiny` i `polozky` — tytéž údaje dvakrát (300 IČO ≈ 100 kB).
- `ZZ_POLE_ARES` se nikde nepoužívá.

## Co jsem prověřil a je v pořádku

1. **Autorizace.** `vyzadujRoli(req, 'Administrátor')` je první řádek obsluhy pro všechny metody; role se
   čte z účtu v úložišti. Sondy: cizí `Origin` 401, `Origin: null` 401, role v těle bez relace 401, PUT 405,
   obchodník a vedoucí 403 na GET i POST bez jediného dotazu do ARES. Chybové hlášky nenesou data zakázek.
   Protokol nese jen e-mail správce a počty.
2. **Náhled → zápis.** Zápis nebere z těla nic kromě `akce` a `id`; podvržené `polozky` v těle se ignorují
   (409), `id` jako objekt 409, hluboké tělo 400. Změna hlavičky po náhledu → karta nevznikne. Karta vzniklá
   ručně mezi náhledem a zápisem se nepřepíše. Druhý běh nic nezaloží. Existující karta se stejným IČO
   a jiným názvem zůstane beze změny. Souběh dvou správců ve dvou instancích je zapsaná mez; souhlasím —
   nejhorší případ je táž karta zapsaná dvakrát.
3. **ARES.** Limity 10 na volání, 400 ms, 600 na náhled a 1 500 za den drží (testy i mutace dávky).
   Výpadek = „zkusit znovu“, nic se nezapíše. Nevalidní odpověď (objekt místo názvu, cizí IČO) = „nevede“.
   Název s HTML z ARES i ze zakázky se uloží jako text a obrazovka ho všude vypisuje přes `esc()` (náhled,
   seznam, karta). Dlouhé řetězce se oříznou (název ARES 200, pole karty 300).
4. **Kontakty.** Viz R7. Uložený náhled ani odpověď klientovi kontakty nenesou.
5. **Cena a dokumenty.** Dávka sahá v `src/` jen do `src/ui/zakaznici_ui.js`. Porovnání sestavení proti základu dávky
   `c89e872`: **367 kalkulací, 367 shodných**. Proti dnešní integraci vychází 137 rozdílů — nejsou z dávky ZK,
   viz R0.

## Spuštěno

- `node netlify/test_zk_zakaznici_ze_zakazek.mjs` — 74 prošlo, 0 selhalo
- `node netlify/test_prava.mjs` — 1063 prošlo, 0 selhalo
- `node netlify/test_zalohy.mjs` — 165 OK, 0 FAIL
- vlastní sondy (9 oddílů) a 12 mutací nad kopií větve v odkladišti
- `bash nastroje/testovaci_kolo.sh --bez-mutaci --proti origin/claude/integrace-16-10` — sady 543 prošlo, 0 selhalo,
  6 přeskočeno (chybí firemní podklady); hodiny +400 dní 441 prošlo, 0 selhalo; statické kontroly 12 z 12;
  **porovnání sestavení SELHALO: 230 shodných, 137 neočekávaných rozdílů** (viz R0)
- `bash nastroje/testovaci_kolo.sh --jen porovnani --proti c89e872` — SHODA 367/367

Nespuštěno: mutace jádra a serveru (kolo `--bez-mutaci`), nic proti skutečnému ARES ani webům.
