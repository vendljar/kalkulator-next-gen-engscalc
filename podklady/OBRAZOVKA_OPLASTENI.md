# Obrazovka „Opláštění po stěnách (A–D)"

Zadání J. V., naposledy upřesněno 21. 9. 2026. Tenhle soubor je **závazný
popis, jak má obrazovka vypadat** — kód se řídí jím, ne naopak.

Hlídá ho `overit_oplasteni.mjs` (50 kontrol). Kód je v
`src/ui/kalk_ock.js`, funkce `oplStenaHtml`, `oplNakresStena`,
`oplasteniKarta`.

## Kde to je

Záložka **Zadání šachty**, karta se ukáže jen v režimu opláštění po stěnách.
Mimo tenhle režim se nekreslí vůbec — a rozdělení stěn se vypnutím režimu
**nezahodí** (kdo režim omylem vypne a zase zapne, nepřijde o práci).

## Stavba jedné stěny

Karta má čtyři stěny A–D ve **dvou sloupcích**. Každá stěna je dvojice
*pole vlevo, nákres vpravo*.

Pořadí řádků shora dolů:

1. **Stěna X — popis** (u čelní stěny „čelní stěna (dveře a světlíky)"),
   vpravo zaškrtávátko **po celé výšce**
2. **Pás N (až nahoru)** — nejvyšší pás, výška „po horní hranu"
3. **Pás N−1** … **Pás 1** — níž ležící pásy, u každého dělicí výška
4. **+ přidat pás**
5. **Opláštění začíná** — spodní hrana opláštění

### Proč zrovna takhle

- **Pásy se vypisují odshora dolů**, protože tak se člověk na stěnu dívá.
  V datech se ukládají zdola nahoru; obrácení dělá obrazovka, ne jádro.
- **„Opláštění začíná" patří až dolů** (upřesnění 21. 9. 2026). Je to spodní
  hrana, takže nad pásy působilo, že se sloupec čte zdola nahoru a pak zase
  shora dolů — a šel proti nákresu vedle sebe.
- **„+ přidat pás" zůstává hned pod pásy**, protože se týká jich.

## Popisky

**Bez pomlčky na začátku, velkým písmenem:** `Pás 1`, ne `— pás 1`.
Totéž platí jinde v zadání (`Hloubka můstku`, `Šířka můstku`).

Výjimka, která pomlčku nese dál: `— (jen exteriérová šachta)` u lemování.
Tam pomlčka **není popisek, ale hodnota** ve smyslu „neuplatní se"
(zadání J. V. z 9. 9. 2026).

## Nákres

Svislý pruh vedle polí, dělený podle skutečných výšek pásů:

- výška každého pásu odpovídá jeho podílu na stěně (ne lineárnímu přepočtu
  z metrů — ten spodní pás ořezával),
- **kóty** se umisťují podle sečtených výšek,
- **nula** (úroveň nástupiště) je čárkovaná čára; leží-li opláštění v
  prohlubni, protíná příslušný pás,
- pás **„bez — dodá stavba"** je odlišený **šrafou**, ne barvou materiálu,
- nákres se kreslí i u stěny **po celé výšce** — i tam nese informaci a čtyři
  stěny vedle sebe se pak čtou stejně.

## Varování, která obrazovka musí vypsat

Tiché spolknutí špatného zadání je horší než chybová hláška:

- typ **„jiné" bez sazby** (počítalo by se za nulu) — i u stěny po celé výšce,
- **dolní mez nad horní hranou** stěny (stěna by z ceny zmizela celá),
- **dolní mez pod dnem prohlubně** (počítala by se plocha, která neexistuje),
- **dělicí výška nad horní hranou** (pásy nad ní zmizí z ceny, ale
  specifikace je zákazníkovi dál slibuje),
- **chybějící dělicí výška**.

## Co obrazovka zatím NEdělá

Terče, lišty a plastové kotvy se počítají **z rozměrů šachty** a typ
opláštění s nimi nehýbe. Karta to takhle i říká. Jestli se mají vázat na
sklo, je otevřená otázka — roadmapa **#287**.

Práce a tmelení se zatím počítají **po celé ploše bez ohledu na typ**
(rozhodnutí J. V.); počítá se **skutečná plocha**.

Režim po stěnách je vždy **mimo standard** — standard zná jen jednotné
opláštění.
