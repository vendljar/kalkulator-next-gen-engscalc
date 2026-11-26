# Zadání plného kola cenových nabídek před main — pátek 27. 11. 2026 odpoledne

Poradce Fable, 26. 11. 2026, pro koordinaci. Stupeň 3 podle `.claude/skills/testovaci-procedura-kng/`.
Cíl J. V.: test připravený ke sloučení do `main` v sobotu 28. 11. ráno.
Bez cen a osobních údajů; výsledek do `podklady/kola/STAV_KOLOnn.md` (číslo kola přidělí koordinace).

## 0. Než kolo začne (koordinace, pátek dopoledne)

1. V `test` je konečný kandidát: integrace včetně TX a #813, po revizi a zeleném kole dávky.
   Kolo se pouští nad jedním pevným commitem `test`; pozdější sloučení = kolo znovu aspoň v části B.
2. `main` je předkem kandidáta (`git rev-list --count <kandidát>..origin/main` = 0).
3. Seznam očekávaných rozdílů `podklady/porovnani/ocekavane_main_test_2026-11-27.txt` je hotový
   PŘEDEM (základ `ocekavane_main_test_2026-11-25.txt` + seznamy dávek MD, PP, PD2, TX, #813).
   Vzory co nejužší — žádné `*` přes celý výstup tam, kde se má měnit jen jeden řádek.
4. Na testu jsou šablony, které TX vyžaduje (úprava CN pro V5/V6 — J. V. / kolega), a je zapsáno,
   které šablony jsou na testu a které na main (otisky). Rozdíl šablon test × main = bod pro J. V.
5. Mutace po částech doběhly nad kandidátem nebo běží v Actions (jádro 3 části, server 32);
   kolo je nečeká, ale do main se nejde bez jejich výsledku.
6. TESTOVÁNÍ 5: J. V. dá souhlas se zápisem na test a do Pipedrive (jen dealy TEST) přímo v tom
   sezení; `PIPEDRIVE_ZAPIS` na testu podle jeho pokynu.

## 1. Co se změnilo mezi main (v24.11.7) a testem

Kolo 57 (25. 11.) už ověřilo stav v25.11.1 proti main bez nálezu (DT, RP, ZK, ER, PO, TZ-1).
Tohle kolo proto míří na v25.11.2 až kandidáta, a stav z kola 57 jen znovu potvrdí regresí.

| Dávka | Co mění | Cena | Dokument | Pipedrive |
|---|---|---|---|---|
| ER (v24.11.9, kolo 57) | nová kalkulace: Engineering jako příplatek, rezerva v příplatcích, Režie bez přepínačů | jen NOVÉ kalkulace | příplatky v nabídce | — |
| PO (v24.11.10, kolo 57) | odeslání nabídky do dealu | ne | ne | zápis při odeslání |
| K56-D, TZ-1 | jen nástroje kola a test | ne | ne | ne |
| MD (v25.11.3) | #767 víc šachet — příplatky v nabídce jako sjednocení šachet; #766 ruční značky ATYP po šachtách; #775 nová kalkulace bez opláštění bez kotev, cestovného a čištění; #772 zámek PROJ nese číslo PROJ; „Dne“ podle Prahy | #775 a #766 jen nové kalkulace (i rozpracované, #776) | #767 text nabídky víc šachet | #768, #763, #773 |
| G1 (v25.11.4) | vlastnosti Wordu (autor, Company, název), kontrola šablon, nové pravidlo kontrol | ne | jen vlastnosti souboru | ne |
| PP (v25.11.5) | připomínky se značkami; objednávka PROJ — podpis na konci; společná karta PROJ; náhled Pipedrive jen administrátor; kontrola SoD podle strany; datum v krycím listu | ne | objednávka PROJ, krycí listy (datum) | jen viditelnost náhledu |
| PD2 (v25.11.6) | kontakty, podpisy, Informováno a Platba 1–8 do dealu (jen do prázdných, Platby i mazání); zrušen Způsob fakturace PROJ; pole Odchylky v KL PROJ; vady CN V1, V2, V4, #800 jen pro nové nabídky | ne | text nové nabídky (V1, V2, V4, #800), KL PROJ | hlavní změna |
| #813 | dotisk staré odeslané nabídky víc šachet — pořadí řádků příplatků | ne | dotisk beze změny proti main | ne |
| TX | V4 upřesněné znění, V5/V6 (záruka, seznam v online tisku), #815 texty u šachty bez opláštění, #804 datum „25.11.2026“ | ne | text nabídky a krycí list | ne |

Řádky #813 a TX doplní koordinace podle skutečného obsahu dávek po jejich revizi.

## 2. Co je „zelené“

Kolo je zelené, když platí všechno:

1. **Ceny uložených zakázek:** všechny kalkulace pevné sady (608 z kol 55–57) dávají na testu stejná
   čísla jako na main. Rozdíl ceny u uložené nebo odeslané zakázky = vada ceny.
2. **Nové kalkulace:** rozdíly jen ty, které popisuje ER, #775 a #766, a jen u kalkulací s příznakem
   nové kalkulace.
3. **Staré odeslané nabídky:** dotisk (Word i online tisk, všechny jazyky sady) je na testu
   znak po znaku stejný jako na main — včetně pořadí příplatků (#813), konečné faktury bez pořadí
   (V4), opláštění (#800), popisků (V1, V2) a čísla nabídky. Zámek, snímek zpracovatele a otisk se nemění.
4. **Smlouva o dílo, plná moc:** text stejný jako main; liší se nejvýš vlastnosti souboru (G1).
5. **Porovnání sestavení** main × kandidát: 0 neočekávaných rozdílů proti seznamu z bodu 0.3.
6. **Automat:** `testovaci_kolo.sh` VŠE ZELENÉ, mutace jádra i serveru bez přeživších (po částech).
7. **Pipedrive (jen dealy TEST):** nic se nepřepsalo ani nezaložilo mimo to, co ukázal náhled.

Cokoli jiného je nález (ID `Knn-N…`), do main se nejde, dokud koordinace a J. V. nerozhodnou.

## 3. Vada ceny / dokumentu → rychlá cesta

Vada ceny = jiné číslo u zakázky, která se měnit neměla, nebo jiné číslo než popisuje dávka.
Vada dokumentu = jiný text vytištěné nabídky, smlouvy, objednávky nebo plné moci, který není
v seznamu očekávaných rozdílů, nebo změna dotisku odeslané nabídky.
Postup podle CLAUDE.md: větev `claude/rychla-<ID>` nad integrací, jen oprava a test s pojistkou,
kolo `--bez-mutaci` + cílené mutace, sloučení do `test`, J. V. dostane ID a popis, které kalkulace
se mají změnit. Po rychlé opravě se zopakuje část kola, které se oprava týká (viz A1–A4 nebo B).
Ostatní nálezy (vzhled, texty rozhraní) jdou do evidence a sloučení do main nebrání, pokud J. V. neřekne jinak.

## 4. TESTOVÁNÍ 4 — bez Pipedrive (ceny, dokumenty, zámky)

Weby jen ČTENÍ (test i main); zápis na test jen se souhlasem J. V. v sezení a jen zakázky `TEST …`.
Postup a nástroje jako kolo 57 (`run_kolo57.sh`, balíček K49, rozšířená sada K56-1).

| Č. | Scénář | Proti main porovnat | Zelené |
|---|---|---|---|
| A1 | Sestavení T (kandidát), Mt (main kód nad daty testu), M; shoda sestavení s oběma weby (`/api/zdravi`, bajty) | verze, otisky šablon, ceník, vypínače | weby = sestavení z gitu |
| A2 | 608 kalkulací T × Mt × M, K29/K36 | všechna čísla; symboly dokumentů | čísla shodná; rozdíly dokumentů jen ze seznamu |
| A3 | Porovnání sestavení main × kandidát, rozšířená sada | podle `ocekavane_main_test_2026-11-27.txt` | 0 neočekávaných; každý očekávaný ověřen na surovém výstupu |
| A4 | **Dotisk starých odeslaných nabídek**: jedna šachta, víc šachet (různé příplatky po šachtách), bez opláštění, s ruční položkou, PROJ, víc zákazníků; CZ + EN + DE (+ FR, kde je šablona) | Word i online tisk celý text; pořadí příplatků; platební věty; číslo a datum nabídky | znak po znaku stejné; zámek beze změny |
| A5 | Nová nabídka po kandidátu (neodeslaná): V1 bez fotky, V2 bez telefonu, V4 konečná faktura, V5/V6, #800 a #815 bez opláštění, #767 víc šachet | proti main jen vypsat rozdíly | rozdíly přesně podle TX / PD2 / MD; znění odpovídá rozhodnutí J. V. 26. 11. |
| A6 | Nová kalkulace (ER, #775, #766): jedna šachta, víc šachet, bez opláštění, ATYP s ruční rezervou v šachtě 1 | cena proti main jen jako rozdíl | rozdíl jen z popsaných položek; klon a stará kalkulace beze změny |
| A7 | Smlouva o dílo OCK a PROJ (4 jazyky), plná moc, objednávka PROJ | text smlouvy a plné moci; vlastnosti souboru | text shodný; Company a autor podle G1; objednávka — podpis na konci, nikdy sám na straně |
| A8 | Krycí list OCK a PROJ (tisk, Word): datum, pole Odchylky PROJ, Způsob fakturace u staré odeslané PROJ | řádky krycího listu | datum ve tvaru podle rozhodnutí 26. 11.; stará odeslaná PROJ beze změny věty |
| A9 | Tok Word / zámek (174), fuzz 600, víc šachet (40), víc zákazníků (216 + únik) | počty jako kolo 57 | stejné zábrany na obou stranách, únik 0 |
| A10 | Kontroly před odesláním: zakázka jen OCK, jen PROJ, kombinovaná (#802); uložení bez čísla (#801) | — | kombinovaná hlásí obě SoD; jednostranná jen svou |
| A11 | Připomínky: značky a zvětšení (#780, #781) — obchodník odešle, administrátor vidí; záloha bez snímků | — | značky vidí jen administrátor; neplatný vstup = odmítnuto |
| A12 | Jednotkové sady a harnessy nad kandidátem; které se přeskočily bez firemních podkladů | počty proti kolu 57 | 0 FAIL; přeskočené vyjmenovat |

Výstup: STAV kola, protokol xlsx (bez cen z ceníku), seznam rozdílů A5 a A6 pro J. V. k jeho
vlastnímu ověření cen main × test.

## 5. TESTOVÁNÍ 5 — Pipedrive (jen dealy TEST)

Zápis jen do dealů TEST a jen po souhlasu J. V. v sezení. Před každým zápisem uložit náhled
(tabulka „dnes / nově“) a po zápisu přečíst deal a porovnat pole po poli. Hodnoty osob jen jako
„sedí / nesedí“, bez jmen a e-mailů ve STAV.

| Č. | Scénář | Zelené |
|---|---|---|
| B0 | Čtení: `GET` dealu TEST — v jakém tvaru API vrací prázdná a vyplněná pole typu osoba a organizace (revize PD2 N5) | prázdné pole je v odpovědi a pozná se jako prázdné |
| B1 | Mapa polí: přehled polí proti účtu (chybějící, jiný typ) — Datum nabídky, Příplatky v nabídce, Platba 1–8, kontakty, Informováno | žádné „chybí pole“ u polí, která PD2 zapisuje |
| B2 | Odeslání nabídky OCK do dealu: kontakty podle e-mailu (nalezený, nenalezený, dva stejné), Datum nabídky, poznámka | zapsáno jen to, co ukázal náhled; nic nezaloženo; poznámka jednou |
| B3 | Odeslání nabídky PROJ: značka poznámky s číslem PROJ (#779), opakované odeslání poznámku nezdvojí | jedna poznámka |
| B4 | Prodej OCK: podepisující firma, druhý podepisující, Informováno BO / Tech, Nabídku vypracoval (snímek zámku), hodnota dealu, fáze | pole vyplněná v dealu zůstala; prázdná doplněna; stav dealu se nezměnil |
| B5 | Prodej PROJ s novým plánem plateb: Platba 1–8, řádek „Mimo pole Platba“, mazání Platby bez milníku, zmocnitel | součet Plateb a plateb mimo pole = cena díla; vymazáno jen to, co náhled označil |
| B6 | Prodej PROJ se starým plánem a v eurech | Platby se nepíší ani nemažou |
| B7 | Souběh: pole vyplnit ručně v Pipedrive mezi náhledem a zápisem | odmítnutí, nic se nepřepsalo |
| B8 | Částky: „5.000 Kč“, záporná, text místo částky (#777, #773) | řádek „nelze“ s důvodem, ostatní pole zapsána |
| B9 | Kombinovaná zakázka OCK + PROJ a víc šachet: hodnota dealu, Odchylky, Příplatky v nabídce | OCK má přednost; hodnota = součet |
| B10 | Práva: obchodník bez práva k dealu, cizí zakázka, vypnutý zápis; náhled „Co by se zapsalo“ jen administrátor (#793) | odmítnutí bez zápisu do zakázky; obchodník náhled nevidí, potvrzení zápisu ano |
| B11 | Úklid: dealy TEST vrátit do výchozího stavu, vypsat, co na testu zůstalo | seznam ve STAV |

## 6. Co dostane J. V. v pátek večer

1. Verdikt kola (zelené / nálezy s ID a vážností, dopad na cenu ano/ne).
2. Seznam rozdílů, které po nasazení uvidí: nové kalkulace (ER, #775, #766), text nové nabídky
   (V1, V2, V4–V6, #800, #815, #767), krycí listy, objednávka PROJ, Pipedrive.
3. Co má udělat před sloučením: šablony CN na main podle TX, pole v ostrém Pipedrive,
   rozhodnutí o `PIPEDRIVE_ZAPIS` na main, otevřené otázky z evidence (#765, #776).
4. Po nasazení: kolo main-před × main-po, `release_odkaz.py`, `NOVINKY.md`.
