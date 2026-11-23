# Revize dávky CN (#727) — číslo nabídky

- Rozdíl: `8411eb9..b35dea4` (větev `claude/cn-cislo-nabidky`), revize 23. 11. 2026, poradce-revizor.
- Rozsah: zámek čísla prodané varianty (klient + server), dotazy při změně čísla, kolize, nápověda hledání, testy.
- Kód jsem neměnil. Nic na webech ani v Pipedrive; pokusy běžely jen nad paměťovým úložištěm (vzor `netlify/test_cn_cislo_nabidky.mjs`).

## Verdikt: SLOUČIT PO OPRAVÁCH

Serverový zámek drží a uložený prodaný záznam přes něj nezmění žádná role ani `prepsat: true`. Před sloučením
opravit **S1** (falešný dotaz u legitimních čísel se slovem TEST / PROJ) a doplnit mez **S2** do
`BEZPECNOST_MEZE.md`. Ostatní nálezy jsou nízké a sloučení nebrání.

## Co jsem ověřil spuštěním

| Co | Výsledek |
|---|---|
| `src/test_cn_cislo_nabidky.js` | 52 prošlo, 0 selhalo |
| `netlify/test_cn_cislo_nabidky.mjs` | 23 OK, 0 FAIL |
| `node netlify/mutace.mjs "[CN]"` | chycené 4 z 4 |
| `node mutace_jadro.mjs "[CN]"` | chycených 8 z 8, pracovní kopie beze změny |

Celé kolo ani porovnání sestavení jsem znovu nepouštěl (přebírám údaj dávky: 527/0/6, SHODA 367/367).

Pokusy o obejití zámku nad prodanou zakázkou, každý jako obchodník, vedoucí i administrátor:

| Pokus | Výsledek |
|---|---|
| nové číslo, jinak beze změny, `prepsat: true` | 403 „prodaná“ (všechny role) |
| stejné číslo bez mezer (tentýž soubor) | 403 „prodaná“ |
| mezera na konci čísla | 403 „prodaná“ |
| nové číslo + klient přepíše `zamek.cislo`, prodej ponechán | 409 snímek podmínek nesedí |
| totéž + smazaný `prodano` | 409 snímek podmínek nesedí |
| nové číslo + smazaný `prodano`, zámek původní | 403 B56 (obchodník, vedoucí), 409 snímek (administrátor) |
| starší zámek bez `cisloPapir` + přepsaný `zamek.cislo` | 409 „nová odeslaná nabídka nese jiné číslo“ |
| kopie stavu **před** prodejem + nové číslo + přepsaný `zamek.cislo` + `prodano` (obchodník) | **200** — viz S2 |

Ve všech pokusech zůstal původní prodaný záznam beze změny.

## Nálezy

### S1 — střední — falešný dotaz „Chtěli jste zakázku vyhledat?“ u legitimních čísel
`src/cislo_nabidky.js:31` (`cnTvarCisla`: žádné slovo ze 4+ písmen).

Ověřeno: `2026 - OPR - CN - 0123` a `…0123.2` projdou bez dotazu (správně). Dotaz ale vyvolají:
- `2026 - OPR - CN - 7270 - TEST` — konvence zkušebních zakázek (skill testovací procedury, 30× v repu, používá
  ji i serverový test této dávky). Každá zkouška na testu (hotovoKdyz #727) tak dostane dotaz navíc.
- `2026-PROJ-CN-0012` (řada PROJ se v repu vyskytuje) a `… - NANECISTO`.

Dopad: jedno kliknutí navíc („Je to číslo nabídky“), žádná ztráta dat; u zkoušek ale soustavně a mate to.
Návrh: text, který začíná tvarem řady (`^\d{4}\s*-\s*\p{L}{2,5}\s*-\s*\p{L}{2,5}\s*-\s*\d`), brát jako číslo bez
ohledu na zbytek; nebo před testem slov vypustit povolená slova (TEST, PROJ, NANECISTO). Doplnit řádky do
tabulky `cnTvarCisla` v `src/test_cn_cislo_nabidky.js` (s pojistkou: před opravou selžou).

### S2 — střední (mez a dokumentace) — kopie prodané nabídky pod novým číslem přes API
`src/zamek.js:657–668`, `netlify/lib/zakazka_kontrola.mjs:643–646`, `BEZPECNOST_MEZE.md:2438`.

Pravidlo porovnává číslo s `zamek.cislo` **z těla požadavku**; u nového čísla (= nový soubor) uloženou verzi
server nemá. Volání API mimo aplikaci proto pošle stav před prodejem s novým číslem, stejným číslem v
`zamek.cislo` a s `prodano` → 200, vznikne druhý prodaný záznam (server ho bere jako nově odeslanou a nově
prodanou nabídku, razítka z relace). Původní záznam se nezmění a totéž umí kdokoli legitimně (nová zakázka →
odeslat → Prodáno), takže to není eskalace práv. Věta „nezmění nikdo“ v B276 ale platí jen pro uložený záznam.
Stav **po** prodeji takhle zkopírovat nejde jen díky snímku lhůt (409, CN-N1) — to je náhoda, ne pojistka.

Návrh: doplnit do B276 mez („API mimo aplikaci může založit nový záznam s vlastním číslem a vlastním zámkem;
původní prodaný záznam zůstává; stopa = autor a razítka nového záznamu“). Tvrdší pojistka (odmítnout nový
záznam, jehož zámek nebo deal Pipedrive už nese jiná zakázka) by byla samostatná úloha — rozhodne J. V.
Souvisí s CN-O1 a CN-N1.

### N1 — nízká — test „mezery navíc“ nic nehlídá
`netlify/test_cn_cislo_nabidky.mjs:132`. Podmínka `zmena === '' || cisloA !== cisloB` je skoro tautologie a název
tvrdí opak skutečnosti: server mezery kolem čísla prodané nabídky odmítá 403 (ověřeno). Návrh: nahradit testem
skutečného chování (uložení s mezerou na konci → 403) nebo test smazat.

### N2 — nízká — výjimka `!obnova` bez testu a mutace
`netlify/lib/zakazka_kontrola.mjs:643`. Obnova se přeskakuje záměrně (mez je popsaná), ale žádný test ani
mutace nehlídá, že běžné uložení s jiným `rezim` pravidlem projde. Návrh: mutace „`!obnova &&` → `false &&`“
je už pokrytá; doplnit jen test, že obnova z otisku prodané zakázky projde (pojistka proti zpřísnění omylem).

### N3 — nízká — „Vyhledat zakázku“ mimo online kanál
`src/ui/cislo_nabidky_ui.js:28–35` + `src/ui/zakulozeni_ui.js:291–297`. Hledaný text se píše jen do
`ONLINE_STAV.hledat`. V kanálu složka se okno otevře bez textu; v kanálu soubor `zakNactiUI` volá
`fileIn.click()` — z odpovědi dialogu (mimo gesto uživatele) ho prohlížeč může zablokovat a výběr souboru
hledání není. Kontrola duplicity (`cnDuplicitniSoubor`) je také jen online. Návrh: mimo online kanál tlačítko
„Vyhledat zakázku“ nenabízet (nebo text předat i hledání ve složce). Čteno z kódu, v prohlížeči nezkoušeno.

### N4 — nízká (otázka pro J. V.) — kolize je teď tvrdé zamítnutí
`src/cislo_nabidky.js:67`. Dřív šla zakázka pod číslem jiné zakázky uložit po dotazu serveru („vědomě
přepište“); teď se číslo do pole vůbec nezapíše. Spolu s CN-O1 (starý záznam zůstává) to znamená, že po
potvrzené změně X → Y už nejde napsat zpět X — je třeba otevřít záznam X přes Načíst zakázku. Hláška to říká.
Doporučuji nechat (bezpečnější), jen to J. V. sdělit u CN-O1.

### N5 — nízká — odeslaná nabídka a role bez práva nedostane nabídku hledání
`src/ui/cislo_nabidky_ui.js:41`. Obchodník, který hledaný text napíše do čísla zakázky s odeslanou nabídkou,
dostane jen hlášku A3 („jen administrátor“). Změna neproběhne, takže bez škody; případ incidentu 21. 11. u
takové zakázky ale hledání nenabídne. Návrh: u textu bez tvaru čísla nabídnout hledání i tady, nebo nechat.

## K zadaným okruhům

1. **Obejití zámku prodané varianty:** uložení (`zakazky.mjs`) i obnova volají tutéž `zakazkaServerKontrola`;
   `prepsat: true` ani role administrátor pravidlo neobejdou. Klon varianty zámek ani prodej nepřebírá. Jediná
   cesta je nový záznam s vlastním zámkem (S2). Zrušení výjimky správce (CN-O2) je rozhodnutí J. V. — kód mu
   odpovídá, cesta ven (odemknout prodej, pak B56) funguje pro vedoucího; administrátor po odemčení narazí na
   CN-N1 (409), což CN nezpůsobila.
2. **Ukládání a protokol:** kód protokolu se nezměnil; `set()` volá `cnZmenaUI` po zmrazení hlavičky a před A3,
   opakovaný průchod (`CN_UI.pruchod`) se uvolní i při výjimce. Texty dialogů jdou přes `dlgEsc`, hledaný text
   přes `esc` — bez rizika vložení HTML. Regresi jsem nenašel.
3. **Falešné dotazy:** `2026 - OPR - CN - 0123` i přípona `.2`, `-B` a holé pořadí bez dotazu; chybně TEST / PROJ (S1).
4. **Pojistky:** mutace 12 z 12 chycené, hlavní pravidla testy opravdu hlídají; slabá místa N1 a N2.
