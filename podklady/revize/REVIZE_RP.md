# REVIZE RP — ruční položky kalkulace OCK v nabídce CN a krycím listu (#736, #740)

Nezávislá revize, 24. 11. 2026. Revidovaný rozdíl `git diff 0fd6410 b36b97a` (větev `claude/rp-rucni-polozky`,
30 souborů, +1158 −183). Větev revize `claude/revize-rp` (nad b36b97a, jen tento soubor). V revidované větvi
nebylo nic měněno; na weby, Pipedrive ani Disk se nesahalo.

## Verdikt: SLOUČIT PO OPRAVÁCH

Jádro výpočtu je beze změny, cena ani zámek se nemění, součet cenového bloku sedí na korunu i na euro a Word
odpovídá náhledu. Vadu ceny ani vadu zámku jsem nenašel. Před sloučením do integrace chci dvě malé věci
(T1, S1), protože jde o dávku „cena + dokument“:

1. **T1** — doplnit pojistku na převod ceny ručního řádku do eur (mutace dnes přežije všechny sady).
2. **S1** — kontrola před tiskem, když šablona Wordu nemá kotvu pro ruční řádek (řádek specifikace se dnes
   tiše nevytiskne, cenový řádek ano).

Před `main` navíc ruční zkouška Wordu na skutečných šablonách CN v18 CZ/EN/DE/FR (R1) — šablony v repu
nejsou, automat je ověřit nemůže. Ostatní nálezy jsou nízké a mohou jít následnou dávkou.

## Co jsem spustil

| Zkouška | Výsledek |
|---|---|
| Kolo `testovaci_kolo.sh --bez-mutaci --proti origin/claude/integrace-16-10 --ocekavane …` | **VŠE ZELENÉ**, kód 0 — sady 536/0/6, hodiny +400 dní 435/0/1, statické 12/12, porovnání viz níž; mutace vynechány (dle zadání) |
| Porovnání sestavení (samostatně, `--jen porovnani`) | 367 kalkulací: 230 SHODA, 137 očekávaných, **0 neočekávaných** |
| Důkaz seznamu očekávaných: `rucniPolozkyVysledku → []` v pracovní kopii, porovnání bez seznamu | **SHODA 367/367** — všech 137 rozdílů teče jen přes ruční položky |
| Zlatá sada VS (`src/test_vs_zlata.json`) | změna v týchž 137 případech, jen pole `ph-*`, `radky-*`, `docx`, `sod`; `vyp`, `vypZ`, `cena`, `kryci`, `pd`, `ctrl`, `snimek`, `zamek` beze změny |
| Vlastní fuzz ceny (600 zakázek × CZ/EN, ruční položky s haléři, sleva, zaokrouhlení, můstky, kurz 25–27,2) | 678 nabídek s ruční položkou: součet řádků = cena před slevou **vždy**, žádný záporný ani nulový řádek, CENA CELKEM = koncová cena |
| Vlastní zkoušky Wordu (syntetická šablona v17 z `test_np_nahled_word.js` + vlastní stará v15) | náhled = Word u interiérové, můstků se slevou i víc šachet; stará šablona v15 tiskne rozpis správně |
| Namátkové mutace v kopii zdrojů (6) | 3 chyceny, **3 přežily** — viz T1, T2 |

Poznámka k běhu: první pokus o kolo skončil kódem 2 (chyběl odkaz `node_modules/playwright`), druhý zastavil
limit úlohy na pozadí (30 min) uprostřed prohlížečových harnessů — do té doby 528 ✓, 0 ✗. Třetí běh s limitem
2 h je v tabulce.

## 1. Cena

- `engine.js`, `zaokrouhleni.js`, `marze.js`, `sleva.js` nejsou v rozdílu. Cena položky v dokumentu je `sMarzi`
  řádku z výsledku (u odeslané ze zmrazeného), žádný druhý výpočet.
- `rpRozpisCeny` počítá v haléřích; šachta je zbytek do ceny před slevou, takže součet sedí z konstrukce.
  V eurech se každá ruční položka převádí nahoru na celé euro, šachta opět zbytek. Ověřeno fuzzem i ručně
  (haléřové ceny, 12 položek po 1 €, můstky + ruční můstek, sleva 3–7 %).
- Sleva, DPH, `CENA_BEZ_DPH`, `CENA_PRED_SLEVOU`, `SLEVA_KC`, PROJ: beze změny (porovnání; symboly se mění
  jen `CENA_SACHTA_BEZ_DPH`, `CENA_BEZ_DPH_SACHTA`, `CENA_BEZ_DPH_CELKEM`, u můstků `CENA_MUSTKY_BEZ_DPH`).
- Nabídka bez ruční položky: `rozpisRucni = null`, všechny symboly jako dřív (důkaz SHODA 367/367).
- Víc šachet (i jedna varianta s ks > 1): cenový blok po šachtách beze změny, ruční řádky jen ve specifikaci —
  podle rozhodnutí.
- Seznam očekávaných rozdílů: 135× `fuzz:N` + 2× fixtura odeslané nabídky ze srpna (`volitelneVlastni` —
  dotisk odeslané nabídky nově s řádky, podle rozhodnutí). Případy vyjmenované jednotlivě, žádný zástupný
  vzor; nepokrývá nic navíc.

## 2. Zámek

- Dotisk zamčené nabídky bere řádky i ceny ze zmrazeného výsledku (`vysledekStrany`); podvržená cena a název
  v zadání se do dotisku ani do krycího listu nedostanou (ověřeno vlastní zkouškou).
- `zamekVysledekRozdily` v přísném režimu: 0 rozdílů; otisk částek, snímek i zmrazený výsledek mají v porovnání
  stejný otisk jako před dávkou. `rpJazykSet` je v `ZAMEK_CHRANENE`, `vlastniSet` (jednotka, dodatkový text) tam
  byl — odeslaná nabídka se tedy tiskne s „ks“ a česky, což sedí s rozhodnutím.
- Pole KL `rucniPolozky` má stav „editovatelné“ (čeká na potvrzení J. V., je v předávce).

## 3. Dokument

- Text obchodníka jde do Wordu přes `xmlEsc` + `{` jako entita: `& < > " '`, `{{CENA_S_DPH}}`, `{#sachty}`,
  `]]>`, `<w:br/>`, emoji, řídicí znaky, název 600 znaků a dodatkový text 3000 znaků dají platné XML, symbol se
  nerozvine. Konec řádku v dodatkovém textu = zalomení (`<w:br/>`), v náhledu `<br>` až po escapování.
- Prázdný název (jen mezery) se netiskne; název „-“ se vytiskne.
- Pořadí: řádek za posledním řádkem cílové sekce (před poznámkou „** parametry profilů…“), v cenovém bloku
  šachta → můstky → ruční položky → sleva → CENA CELKEM. Prázdná kotva (např. sokl u interiérové) klon nezruší.
- Víc šachet: řádky sekcí šachty u své šachty, Režie ve společné sekci s názvem šachty v závorce.
- **Nešlo ověřit:** kotvy ve skutečných šablonách CN v18 všech jazyků — šablony v repu nejsou
  (`overit_sablona.mjs`, `overit_sablony_online.mjs` se přeskakují bez firemního podkladu). Viz R1.

## Nálezy

Závažnost: **S** střední, **N** nízká, **I** informace.

### K opravě před sloučením

**T1 (S, test ceny) — převod ceny ručního řádku na eura nehlídá žádný test.**
Mutace `cenaH: hal(prevod(p.sMarzi))` → `hal(p.sMarzi)` v `src/rucni_polozky.js` projde `test_rp_rucni_polozky.js`
(41/41), `test_np_nahled_word.js`, `test_vs_nabidka.js`, `test_560_mustky_sekce.js` i `test_mena.js`. Eurová
nabídka by pak nesla u ruční položky korunovou částku se znakem € a řádek šachty by vyšel záporný — součet by
dál seděl, takže test C „EN“ nic nepozná.
*Návrh:* v oddílu C pro EN doplnit, že řádek „NOSNÁ…“ = `ceil(67 200 / 25)` = € 2 688, a že žádný řádek
rozpisu není záporný; přidat mutaci [RP] na `prevod`.

**S1 (S, dokument) — chybějící kotva: řádek specifikace se z Wordu tiše ztratí.**
Když šablona nemá žádnou z kotev sekce (`RP_KOTVY`), `rpRadkyWord` řádek zahodí. Cenový řádek se přitom
vytiskne a náhled řádek ukazuje — zákazník dostane cenu položky bez jejího popisu a nikdo se to nedozví
(žádná kontrola před tiskem, ověřeno: `kontrolyProved` nic nehlásí). Je to stejný druh vady jako CN-431.
U šablon v15–v18 náhradní kotvy existují, takže se to týká jen upravené nebo starší šablony.
*Návrh:* pravidlo kontrol po vzoru `slevaWord`/`mustky` (zná `ctx.sablonaNabidka`): „Šablona Wordu nemá řádek
pro ruční položku X (sekce Y) — ve Wordu nebude“. Totéž pro cenový blok (chybí `CENA_MUSTKY_BEZ_DPH`
i `CENA_BEZ_DPH`).

### Doporučené (může jít následnou dávkou)

**R1 (S, ověření) — Word na skutečných šablonách CN v18 CZ/EN/DE/FR.** Testovací sezení: jedna šachta
s ruční položkou v každé sekci (s dodatkovým textem), se slevou, s můstky + ruční můstek, víc šachet; ve všech
čtyřech jazycích. Dívat se na: řádek ve správné sekci, zalomení dodatkového textu, řádek „CENA CELKEM“ bez
podtitulu a bez prázdných řádků pod ním (N3), smlouvu o dílo realizace beze změny textu (N8).

**T2 (N, testy) — další dvě přeživší mutace.** (a) název řádku ze zadání místo ze zmrazeného výsledku;
(b) krycí list z živého výpočtu místo ze zámku (`rucniPolozkyVysledku(vypocetZ(…))`) — neprojde to žádnou
sadou krycího listu ani zámku. Chybí také test Wordu s chybějící kotvou, kontroly `rucniPolozkaCesky` u víc
šachet a součtu s haléřovými cenami. *Návrh:* do oddílu G přidat krycí list zamčené nabídky po změně ceníku
a po podvrhu názvu.

**N1 (N, krycí list) — víc kusů šachty: cena ruční položky v KL je za jeden kus.** Šachta „Výtah B“ 2 ks
s ruční položkou 10 000 Kč zvedne cenu nabídky o 24 000 Kč, krycí list píše „12 000 Kč (Volitelné, Výtah B)“.
*Návrh:* násobit počtem kusů, nebo dopsat „× 2 ks“. Text KL je věc J. V.

**N2 (N, sekce) — Spojovací materiál a Lakování: převod je v kódu, ale nikdy se nepoužije.** Jádro vede
vlastní položky těchto sekcí mimo `r.sekce` (`spojovaciRows`, `lakovani.vlastniRows`), takže je
`rucniPolozkyVysledku` nenajde: položka zvedne cenu (ověřeno: +120 000 Kč), ale nevytiskne se a není v KL.
V UI se tam ruční položka (bez `kid`) přidat nedá — jen trvalá z ceníku — takže to dnes může nastat jen
u importovaného nebo ručně upraveného souboru. *Návrh:* buď řádky doplnit (bez zásahu do jádra — číst
`r.spojovaci`/`r.lakovani`), nebo převod z `RP_SEKCE_TS` vyjmout a v předávce napsat, že se těchto sekcí
netýká.

**N3 (N, vzhled Wordu) — po přejmenování zůstávají prázdné odstavce.** `prejmenuj` a klon z řádku můstků
vyprázdní druhý a třetí odstavec první buňky („rozsah dodávky…“, „výtahová šachta a můstky…“,
`{{SACHTY_CELKEM_POPIS}}`), ale odstavce v buňce zůstanou — ve skutečné šabloně pravděpodobně prázdné řádky
pod názvem. Syntetická šablona to neukáže. Ověřit v R1.

**N4 (N, stará šablona v15) — ruční položka Můstků skončí v DOPLŇKOVÝCH KONSTRUKCÍCH.** Náhradní kotva
`TS_SOKL` leží nad naklonovaným pruhem MŮSTKY, řádek tedy stojí o sekci výš. Cena v pořádku. Týká se jen
šablony bez sekce MŮSTKY.

**N5 (N, zámek — pojistka) — trvalá položka se pozná jen podle `kid` ve výsledku.** Zmrazený výsledek ze
starší verze, který by u řádku neměl `kid`, by trvalou položku z ceníku vytiskl jako ruční. Historii jádra
jsem neměl (mělký klon), nedokážu vyloučit. *Návrh:* `row.kid || src.kid` (zdroj v zadání `kid` má vždy).

**N6 (N, server) — nová pole bez kontroly délky a typu.** `dodatek` a `jazyky` u ruční položky server
(`uloZaporneVZadani`, kontrola délek) nehlídá; klient je čte obranně (`String()`, kontrola typu), takže nejde
o bezpečnostní díru, jen o chybějící strop jako u ostatních textů.

**N7 (N, nástroj porovnání — starší slepé místo) — krycí list a náhled porovnání nevidí.**
`nastroje/porovnani_sada.js` i `zlata_vs.js` volají `kryciData(zak, v, J)` bez verze → 0 sekcí, a
`nabidkaNahledSekce` bez šachet a ručních položek. Věta v hlavičce seznamu očekávaných („krycí list … beze
změny ve všech 367 případech“) proto není doložená: krycí list se u zakázek s ruční položkou mění (nový řádek,
záměrně), jen to nástroj nezměří. *Návrh:* svěřené rozhodnutí — volat s verzí `bo` a s `data.sachty`,
`data.rucni`; zlatou sadu přegenerovat.

**N8 (I) — smlouva o dílo dostává tytéž řádky navíc.** `sodData` přebírá `tsRadkyNavic` a `dokumenty.js` je
pošle do Wordu smlouvy. Šablona SoD má cenu v odstavci, ne v řádku tabulky, takže se nic nevloží (stejný
mechanismus mají od #560 můstky). Ověřit v R1 na skutečné šabloně SoD v6.

**N9 (I) — náhled ≠ Word u řídicích znaků.** Word znaky U+0001–U+001F a U+FFFE zahodí, náhled je nechá.
Jen při vložení takového znaku do názvu.

**N10 (I) — `test_platby_ock.js`: vzor volání změkl.** Skupina `(, data\.rucni)?` je nepovinná; test by prošel
i bez šestého parametru. Ostatní upravené cizí testy (počet pravidel 53 → 54 v `test_kontroly.js`,
`overit_lista.mjs`, `cisla_vydani.json`; `!p.jenKdyz` v `test_kryci.js`; zlatá sada VS) oslabené nejsou.

**N11 (I) — `\n` → `<br>` platí pro všechny řádky online dokumentu a náhledu,** nejen pro ruční položky
(`zakazka_ui.js` `radek`, `nahled_word.js` `nwPv`). Víceřádková hodnota jiného řádku se nově zalomí jako ve
Wordu. Porovnání to neměří (N7).

**N12 (I, pro J. V.) — rezerva.** Při `rezervaZakladPct > 0` (výchozí 0) zůstává podíl rezervy z ruční
položky v řádku šachty; ruční řádek nese jen cenu s marží. Sedí s rozhodnutím „cena s marží“, jen ať se ví.

## Bezpečnost

- Word: jediný vstup textu je `xmlEsc`/`xmlEscRadky` + entita za `{`; injektáž značek ani symbolů nejde.
- HTML: kalkulace (`esc`, `escJs`), Kompletní náhled (`nwEsc` před `<br>`), online dokument (`esc` před `<br>`),
  panel kontrol (`esc(n.text)`), krycí list (`esc`) — `<script>` ani `<b>` z názvu se nevykreslí.
- Jednotka jen ze seznamu (`RP_JEDNOTKY`, klient i čtení), jazyk jen `en/de/fr`, pole jen `nazev/dodatek`.
- Pipedrive: suchý běh pole vynechá (`mimoPipedrive`), skutečný zápis jde přes pevnou mapu
  `netlify/lib/pd_mapa.mjs`, kde pole není.
- Záporná cena nebo množství ruční položky: server odmítne (stávající `uloZaporneVZadani`), beze změny.

## Staré soubory

Bez jednotky i s neznámou jednotkou = „ks“ (`rpJednotka`), starší `volitelneVlastni` → DOPLŇKOVÉ KONSTRUKCE
(fixtura ze srpna 2026 v porovnání). Nic se do dat nedopisuje.
