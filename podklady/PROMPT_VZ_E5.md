# Prompt VZ-E5 — Pipedrive: poznámka „Další zákazníci na zakázce“

Společná pravidla: `PROMPT_VZ_SPOLECNE.md`. Návrh § 7.1, § 7.2. Větev `claude/vz-e5` nad SHA od koordinace
(nejdřív po E0; může běžet souběžně s E1–E3). Odhad: 1 sezení. Rozhodnutí J. V.: poznámka u dealu, ne pole;
mechanismus VSD #588 (mez B217).

## Cíl

Uložení zakázky s víc zákazníky a navázaným dealem založí nebo přepíše jednu poznámku u dealu se seznamem
ostatních zákazníků. Poznámka šachet se nemění.

## Krok 0

Celý `netlify/lib/pd_poznamka.mjs`, jeho volání ve `netlify/functions/zakazky.mjs` (výhradní úsek, třetí čtení N1),
oddíl B217 v `BEZPECNOST_MEZE.md`, testy a mutace #588 (`netlify/test_vsd*`), `src/pd_nanecisto.js` a
`netlify/lib/pd_prevod.mjs` (řádek „Poznámka dealu — šachty v nabídce“), simulátor (`/api/v1/notes`).

## Co udělat

1. **Zobecni modul na „druh poznámky“** { pole zakázky, úvod, stavba textu, text prázdného stavu, klíč stropu,
   vypínač }. Šachty zůstanou pod dnešními jmény a s dnešním chováním — testy a mutace #588 musí projít beze změny.
2. **Druh „zákazníci“:** pole `pdPoznamkaZakaznici` { deal, id, otisk, kdy } (píše jen server), úvod
   „Další zákazníci na zakázce: “, značka „ — nabídka <číslo zakázky>“ (táž funkce), klíč stropu
   `strop:poznamka-zakaznici:deal:<id>`, vypínač `viceZakazniku`.
3. **Text** (návrh § 7.2): řádek za každého dalšího zákazníka — název; „CN <číslo> z <den>, <cena> bez DPH“ u odeslané
   nabídky (`vzPlatna` z E3 — dokud E3 není sloučená, použij stejnou logiku nad zámky a razítky a po sloučení ji
   nahraď; bez razítek = „nabídka zatím neodeslána (<číslo>)“); „připravuje se nová <číslo>“; po prodeji „— neprodáno“.
   Řádky odděl `<br>`, vše escapuj (`pdPoznamkaEsc`), řídicí znaky pryč, strop 2 000 znaků („… a další N“).
   Bez kontaktů, IČO a slev. Po odstranění posledního dalšího zákazníka (pole poznámky existuje): „Další zákazníci
   na zakázce: žádní“ + značka. Zakázka bez poznámky a bez dalších zákazníků: nic.
4. **Společný časový rozpočet:** obě poznámky dohromady nejvýš `PD_POZNAMKA_CELKEM_MS`; šachty první, zákazníci
   druzí; nestihne-li se druhá, stav `chyba` + varování a zkusí se při dalším uložení. Jedno třetí čtení zakázky
   pro obě. Právo `crm.pipedrive`, stavy a varování jako u šachet.
5. **Suchý běh:** řádek „Poznámka dealu — další zákazníci“ se stejným textem (`pd_nanecisto.js`, `pd_prevod.mjs`).
6. **Mez** do `BEZPECNOST_MEZE.md` (číslo od koordinace): co poznámka nese (názvy dalších zákazníků, ceny odeslaných
   nabídek), kdo ji vidí, zbytkové meze B217 platí i zde.

## Testy (jen simulátor)

`netlify/test_vz_poznamka.mjs`: založení, úprava jen při změně textu, převzetí podle úvodu a značky, cizí id,
bez práva, strop, časový limit (scénář `visi`), výpadek, obě poznámky v jednom uložení v rozpočtu, poznámka šachet
se nepřepíše poznámkou zákazníků a naopak, „žádní“, VYP = nic, název zákazníka s HTML. Testy #588 beze změny.
Mutace serveru „[VZ E5]“.

## Co nedělat

Organizace dealu (E5b), zápis dat prodeje do dealu (není předmětem VZ), mazání poznámek.
