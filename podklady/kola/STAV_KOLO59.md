# STAV kola 59 — TESTOVÁNÍ 3: cílená sada dávky MD na testu (v25.11.3, 25. 11. 2026)

Stav: **HOTOVO** — 7 bodů: 6 OK, 1 OK s novým nálezem (K59-N1, nízká), 1 bod neověřitelný bez nového tisku.
Bez dopadu na cenu.

## Hlavička

- Test v25.11.3 (`origin/test` 63d1d9e, `/api/zdravi`). Main jen čtení (nic).
- Kdo: testovací sezení, větev `claude/testovani-3-po`. Navazuje na kolo 58.
- **Souhlas J. V. v sezení 25. 11.:** celé kolo 59 — odemknout, upravit, znovu odeslat a prodat CN-432 a CN-437,
  zápis do dealů TEST 432 a 437, nové TEST zakázky.
- Mapa polí CRM obnovena (`/api/pd/pole?obnovit=1`): `datumNabidky` = datum, `priplatkyNabidka` = text, bez nesouladu.
- Harnessy (Playwright, mimo repo): `po59.js` (body 1–3), `k59b.js` + `k59c.js` (body 4, 5, 7).

## Výsledky

| bod | úkol | výsledek | poznámka |
|---|---|---|---|
| 1 | #763 Datum nabídky do Pipedrive | OK | CN-432 i CN-437: Odemknout prodej → náhled odeslání: řádek „Datum nabídky“ = datum zámku → zápis „Odeslání zapsáno do Pipedrive: Datum nabídky.“ → Prodáno → zápis prodeje 200. Prodej Datum nabídky nepíše. |
| 2 | #772 číslo PROJ v odeslání | OK + **K59-N1** | Náhled i poznámka nesou CN-437 (úvod „Nabídka odeslána: CN-437…“, řádek varianty). Závěrečná značka poznámky ale dál „— nabídka 2026 - OPR - CN -“ (předloha OCK). |
| 2b | #772 název Word souboru v dealu | NEOVĚŘENO | Soubor se přikládá jen po novém tisku; deal 437 má dál 1 soubor se starým názvem. Ověří až nový tisk PROJ. |
| 3 | #773 částka jen z čísla | OK + info | Správní poplatky (text bez částky) v náhledu „nelze … není částka“, nepíše se. Deal ale drží starou chybnou hodnotu z doby před #773 — aplikace ji nemaže (viz K59-I1). |
| 4 | #775 nová kalkulace bez opláštění | OK | Nová TEST zakázka (kalkVerze 2, všechny stěny „bez“, zasklení na terče): plocha 0, plastové kotvy / cestovné / čištění = 0; po uložení a znovuotevření stejně. Stará TEST OPR 9855 se stejnou úpravou (neuloženo): kotvy 1, cestovné 1, čištění 1 = beze změny. |
| 5 | #767 příplatek jen v šachtě 2 | OK | Nová zakázka, 2 šachty (šachta 2 = 2 ks), příplatek zaškrtnutý jen v šachtě 2: výběr = [Šachta 2], částka řádku = 2 × částka šachty 2, nabídka CZ ho tiskne (jediný příplatek), krycí list po šachtách „Šachta 2“. Uloženo, po znovuotevření 2 šachty. |
| 5b | #766 ruční ATYP po šachtách | OK | Šachta 2 nové kalkulace má vlastní `zadaniRucni` (`zadaniRucniVlastni` = ano); značka v šachtě 2 se do šachty 1 ani mapy varianty nepropíše; mapa přežije uložení. |
| 6 | #768 Příplatky v nabídce = Velký text | OK | Mapa: typ text (velký text), pole se plní (ověřeno čtením mapy a náhledu). |
| 7a | #769 „Dne“ krycího listu = den v Praze | OK | `kryciDnesIso()` = dnešek v Europe/Prague; `zamekDenPraha(25. 11. 23:30 UTC)` = 26. 11. |
| 7b | #770 barvy řádků záloh | OK | Nastavení → Databáze: záloha DB a noční záloha zelené „V pořádku (před 13 h)“, kopie na Disk oranžová „Chyba — zkontrolujte“ (headless prohlížeč nemá vybranou složku → čeká; správně oranžová, štítek slovy). |
| 7c | #774 Engineering v ceníku | OK | Editor ceníku OCK: `C.engineeringKc` v PŘÍPLATKOVÝCH POLOŽKÁCH, ne v REŽII. |

Pozn. k harnessu: první pokus o uložení #775 vrátil 400 — harness převzal z unit testu zrušenou volbu světlíku
„stavba“; server ji správně odmítl („od 4. 11. 2026 se volí bez“). Opraveno v harnessu (`k59c.js`), není to nález.

## Nálezy

### K59-N1 — Poznámka odeslání PROJ končí značkou s číslem předlohy OCK (nízká, cena ne)

- Kroky: zakázka jen PROJ (CN-437, `ZAK.cislo` = předloha OCK „2026 - OPR - CN - “, `projHlavicka.cislo` = CN-437)
  → Odemknout prodej → Odeslání do Pipedrive → náhled / zápis poznámky.
- Stalo se: úvod a řádek varianty nesou CN-437 (#772 OK), ale závěrečná značka poznámky je „— nabídka 2026 - OPR - CN -“.
- Mělo být: značka s číslem PROJ (CN-437), stejně jako úvod. Dopad: jen text poznámky v Pipedrive; párování poznámky
  při opakovaném odeslání (poznámka 1114 v dealu 437 se aktualizovala na místě) funguje.

### K59-I1 — Stará chybná částka správních poplatků zůstává v dealu (informace)

- #773 už text bez částky nepíše, ale hodnotu zapsanou před opravou nemaže. Deal TEST 437 drží starou hodnotu.
  Návrh: buď ruční vymazání u dotčených dealů (J. V.), nebo řádek „vymazat“ v náhledu, když KL nemá číslo a deal ano.
  Rozhodne J. V.

## Úkoly a úklid

- Dealy TEST 432 a 437: fáze 26 (prodáno); 432 poznámek 4 / souborů 1; 437 poznámek 2 / souborů 1. CN-432 a CN-437 prodané
  a zamčené jako před kolem (znovu prodané).
- Nové TEST zakázky: `TEST - 2026 - OPR - CN - 9877` (2 šachty, #767/#766) a `TEST - 2026 - OPR - CN - 9878` (bez opláštění, #775).
  Smazat jen na pokyn J. V.; deal 437 a CN-437 se nemažou bez pokynu J. V.
- TEST OPR 9855 neměněna (úprava jen v paměti, neuloženo).
- Čeká na J. V.: K59-I1 (mazat starou hodnotu?), #772 Word název ověřit při příštím tisku PROJ.
