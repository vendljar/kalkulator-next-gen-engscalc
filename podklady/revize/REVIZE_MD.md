# Revize dávky MD (poradce) — 25. 11. 2026

- **Větev:** `claude/md-mala-davka`, HEAD `42717294e735bcc5201a595df680390b74447c3e`
- **Základ:** integrace `claude/integrace-16-10` = `c5e8127` (merge-base; integrace je ve větvi sloučená)
- **Rozsah:** #763, #766, #767, #768, #769, #770, #772 (K58-N1), #773 (K58-N2), #774, č. 775 (K58-I2)

## Verdikt: SLOUČIT

Vysoký nález nemám. Dva střední nálezy sloučení nebrání, ale J. V. by o nich měl vědět před nasazením (S1) a jeden
stojí za drobnou opravu v další dávce (S2).

## Co jsem ověřil a jak

Čtení celého diffu kódu (bez mutací a dokumentace) a vlastní zkoušky v dočasném stromu nad HEAD větve.
**Nepouštěl jsem** celé kolo, mutace ani porovnání 390 — u nich spoléhám na údaje dávky.

| co | výsledek |
|---|---|
| sady dávky | `test_766` 25/0, `test_767` 25/0, `test_k58i2` 12/0, `test_k58n1` 18/0, `test_md4` 4/0, `test_md5` 17/0, `test_md_cenik_engineering` 5/0 |
| související sady | zlatá sada VS 319/319, `test_kontroly` 159/0, `test_pd_prevod` 176/0, `test_cn_cislo_nabidky` 30/0, `test_po_116_odeslani` 90/0, `test_pv_597_zapis` 74/0, `test_pd_mapa_prehled` 47/0 |
| #767 vlastní zkouška | nový výběr × starý (zamčená bez značky) nad 5 zakázkami se dvěma šachtami — viz níž |
| K58-N2 vlastní zkouška | 28 zápisů částky přes `pdDoPd` s definicí pole „Správní poplatky“ — viz S2 |

## Zaměření koordinace

### Cena

- **K58-I2 platí jen pro novou kalkulaci.** Podmínka je `kalkNova(z)` (kalkVerze ≥ 2) a nulová plocha opláštění;
  stará kalkulace má řádky beze změny (sada to hlídá pro Model 1 i 2). V režimu po stěnách se do plochy počítá každý
  pás, který není „bez“, i světlíky — šachta opláštěná jiným materiálem než sklem o cestovné a čištění nepřijde.
  Ruční přepis množství na řádku má dál přednost.
- **#767 cenu nabídky nemění.** Ve všech pěti zkoušených zakázkách je cena bez DPH, DPH i cena s DPH stejná novou
  i starou cestou; mění se jen výčet a částky příplatků v oddílu příplatků.
- **#767 při stejném výběru v obou šachtách nemění nic.** Seznam příplatků je znak po znaku stejný (18 příplatků
  v obou šachtách; tři vybrané; nová kalkulace; šachta B jiných rozměrů). Při různém výběru: příplatek jen v šachtě
  A (1 ks) má částku jedné šachty místo tří kusů, příplatek jen v šachtě B se nově vytiskne s částkou 2 × šachta B.
- **Jedna šachta:** `vsPriplatkyVyber` vrací `null`, nabídka, objednané i kontrola jdou původní cestou.

### Zpětná kompatibilita starých zámků

- **#767:** odeslaná nabídka bez značky `priplatkyVyber` ve snímku zámku se tiskne postaru (ověřeno zkouškou —
  dotisk dává původní výčet). Značku píše `zamekSnimekSpocti` jen u víc šachet; snímek jedné šachty se nemění.
  Server snímek nového zámku porovnává se svým výpočtem, takže značku nejde vynechat ani podvrhnout.
- **#772 (K58-N1):** zámek PROJ se starým číslem OCK server toleruje (`zamekCisloSedi`), nemigruje ho a všude ho
  zobrazí číslem z papíru PROJ (`zamekCisloZobraz`). Zámek OCK tolerance nedostává. Kombinovaná zakázka s vyplněným
  číslem OCK vyjde beze změny.
- **K58-I2:** odeslané nabídky tisknou ze zmrazeného výsledku a razítko ověření se píše jen při prvním uložení
  zámku — starým zámkům se nic nepřepočítá. K rozpracovaným viz S1.

### Zápis do Pipedrive

- **#763:** pole „Datum nabídky“ dostane hodnotu jen při odeslání nabídky (`pdOdeslaniStrany` s datem zámku, jen
  platný tvar RRRR-MM-DD). Prodej a suchý běh datum nedodávají, takže ho nepošlou. Řádek „datum je jen v poznámce“
  z tabulky zmizel. Jiné pole dealu dávka nepřidává.
- **#773 (K58-N2):** částka se pošle jen z čísla s měnou a několika povolenými slovy; „TEST K57 – Správní poplatky“
  ani „cca 2 týdny“ už číslo nedají. K zápisu s tečkou viz S2.
- **#768:** změna je jen v mapě polí (pole smí být jen Velký text). Viz N3.

## Nálezy

### Vysoké

Žádné.

### Střední

**S1 — K58-I2 změní cenu i rozpracovaným novým kalkulacím, které už existují.**
„Nová kalkulace“ je v kódu každá s kalkVerze 2, tedy i ty založené od zavedení nové kalkulace do dneška. Neodeslaná
varianta se šachtou bez opláštění po nasazení při příštím otevření zlevní o plastové kotvy, cestovné a čištění.
Klon odeslané nabídky téhož typu vyjde levněji než papír, který má zákazník. Odeslaných nabídek se to netýká.
Podle zadání („jako #761“) je to nejspíš záměr, ale rozhodnutí J. V. z 25. 11. mluví o „nových kalkulacích, staré
beze změny“ — doporučuji mu výslovně říct, že „staré“ znamená kalkVerze 1, ne „založené před nasazením“.
Porovnávací sada takovou kalkulaci nemá, takže rozsah na skutečných datech nikdo neviděl.

**S2 — částka s tečkou jako oddělovačem tisíců se do Pipedrive pošle špatně.**
„5.000 Kč“ se převede na **5 CZK** (tečka se čte jako desetinná). Není to regrese — dělal to už původní převod —
ale K58-N2 má přesně tento druh chyby zavřít a zápis „5.000“ je v češtině běžný. Stejně tak „-500 Kč“ dá 500
(znaménko se ztratí). Ostatní zkoušené tvary dopadly správně: „5 000 Kč“, „5 000,50 Kč“, „5000,- Kč“,
„5 000 Kč bez DPH“, „500 Kč/den“, „200 €“ se pošlou; „cca 5 000 Kč“, „500 Kč denně“, „5 tis. Kč“, „12 000 Kč vč. DPH“
se nepošlou a tabulka řekne proč. Návrh: číslo ve tvaru `d.ddd` (tečka a právě tři číslice) nebrat jako desetinné,
ale odmítnout s důvodem, nebo číst jako tisíce — rozhodnutí J. V.; do té doby zapsat jako známou mez.

### Nízké

**N1 — #767 pořadí příplatků při různém výběru.** Seznam jde v pořadí prvního zaškrtnutého výskytu: nejdřív
příplatky šachty 1, příplatek zaškrtnutý jen v další šachtě až na konec. Ve zkoušce se „Sklo VSG“ (jen šachta B)
vytisklo jako poslední, za přechodovými plechy. Při stejném výběru se pořadí nemění. Návrh: seřadit podle pořadí
příplatků ve výsledku varianty (`r.priplatky`), aby nabídka držela obvyklé pořadí.

**N2 — stránka načtená před nasazením a tisk nabídky s víc šachtami.** Starý klient spočítá snímek bez značky
`priplatkyVyber`, server ho odmítne (409 „snímek podmínek … nesedí“). Hláška radí otevřít zakázku ze serveru, ne
obnovit stránku; po otevření ve staré stránce se situace zopakuje. Týká se jen okna po nasazení a jen víc šachet.
Návrh: doplnit do hlášky „obnovte stránku (Ctrl+F5)“, jako to má hláška o nesouhlasu výsledku.

**N3 — #768: ověřit typ pole v účtu.** Pole „Příplatky v nabídce“ smí být nově jen Velký text. Je-li v účtu
Pipedrive pořád krátký text, přehled ho po sloučení ohlásí jako nesedící typ a hodnota se přestane zapisovat, dokud
se typ pole nezmění. Do účtu jsem se nedíval — potvrdit u J. V., že pole už je Velký text.

**N4 — kontrola `dodatekCesky` u staré odeslané nabídky víc šachet** bere nový výběr i tam, kde se nabídka tiskne
postaru. Jde jen o text upozornění, dokument se nemění.

**N5 — pojistky a čísla, která jsem nepřepočítával.** Mutace (jádro i server) a porovnání 390 jsem nepouštěl.
Očekávané rozdíly (`podklady/porovnani/ocekavane_md_2026-11-25.txt`) sedí s kódem: jediný vzor je snímek zámku víc
šachet. Soubor sám říká, že sada nemá případ pro K58-I2 ani K58-N1 — ty drží jen jednotkové sady.

## Lehce prošlé části

- **#766 ruční značky ATYP po šachtách:** šachta 2+ nové kalkulace dostane vlastní mapu při založení a kopii; šachta
  1, stará kalkulace a šachty založené dřív čtou mapu varianty jako dosud. Tvar přijme i server (sada). Bez nálezu.
- **#769 „Dne“ podle Prahy, #770 barvy záloh, #774 Engineering v ceníku mezi příplatky:** #774 je jen přesun řádku
  v editoru ceníku, klíč `C.engineeringKc` i výpočet beze změny. Bez nálezu.
