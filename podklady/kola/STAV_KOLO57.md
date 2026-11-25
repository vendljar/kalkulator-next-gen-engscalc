# STAV kola 57 — cenové nabídky test × main (25. 11. 2026)

- **Sezení:** testovací (`kalkulator-testovani`) s prohlížečem J. V. (karty testu a main jen ČTENÍ — na žádný web se nic nezapsalo)
- **Větev:** `claude/testovani-kolo57` nad `origin/test` 7144623e (+ nástroj K56-1 z kola 56)
- **Postup:** jako kolo 55 (balíček K49, `run_kolo57.sh`) + porovnání sestavení **rozšířenou sadou K56-1**
- **Bez cen a nákladů** v tomto textu. Protokol `VYHODNOCENI_TESTU_KOLO57_TEST_MAIN_2026-11-25.xlsx` nese jen prodejní ceny TEST zakázek (jako kola 52–55).

## Výsledek v kostce

**Žádný neočekávaný rozdíl ceny ani dokumentu (žádný nález K57-N).** Všechny rozdíly test × main odpovídají
dávkám, které jsou jen v testu: **DT #745** (datum nabídky = den tisku), **RP #736/#740** (ruční položky v textu
nabídky, SoD, krycím listu a náhledu podkladů) a **ER #757/#758/#761** (nová kalkulace — jen u kalkulací založených
po nasazení; uložené zakázky cenu nemění).

**Doporučení do main: ANO** (z pohledu cen a dokumentů; ceny main × test ověřuje J. V.). J. V. by měl vědět, že po
nasazení **nové** kalkulace vyjdou jinak než dnes na main (ER, K57-I3) a že ceník testu je starší než ceník main (K57-I2).

## Verze, data a šablony

| | test | main |
|---|---|---|
| verze | **v25.11.1** (`7144623e`), web bajt po bajtu = sestavení z `origin/test` | **v24.11.7** (`4e69c276`), web bajt po bajtu = sestavení z `origin/main` |
| regrese | Tp = v24.11.1 (`0fd6410c`, test z kola 55) | — |
| ceník | beze změny od 16. 11. | **nový ceník 24. 11.** (globální přirážka, statika opláštění) — K57-I2 |
| šablony | CN v18, PROJ v9, SoD realizace v6, SoD projekce v4 **nově i DE/EN/FR (25. 11.)** — vše stejné otisky jako main | totéž |
| vypínače | viceSachet ZAP, viceZakazniku ZAP | oba VYP |
| data | 216 TEST zakázek K28/K29/K36 z databáze testu, od kola 55 beze změny (porovnány celé zakázky) | jen ceník, nastavení, šablony (bez zakázek) |

Mezi main v24.11.7 a test v25.11.1 je 86 commitů: UT (texty), R3 #751 (pole Wordu), **DT #745/#746**, **RP #736/#740**,
ZK #755 (zákazníci z ARES, nástroj správce), **ER #757/#758/#761**, PO #116 (odeslání nabídky do Pipedrive), TZ-1 (test).

## Výsledky

| dvojice / oblast | výsledek | poznámka |
|---|---|---|
| **T × Mt** (kód test × main, data testu), 608 kalkulací | **608/608 shodných čísel** | Dokumenty: RP 304 (rozpis CENA_SACHTA_BEZ_DPH / CENA_BEZ_DPH_CELKEM místo CENA_BEZ_DPH_SACHTA, řádek „Ruční položky v ceně“ v krycím listu), DT 50 (DATUM = den tisku u uložených neodeslaných), krycí list i verze v názvu. 0 nevysvětlených. |
| Mt × M (data prostředí) | 608/608 | Jen FIRMA_NAB_TERMINY* (K49-I5). Nový ceník main uložené zakázky nemění (nesou vlastní ceník). |
| Tp × Mt (test v24.11.1 × main v24.11.7) | 608/608, symboly shodné | #759 a #760 se v sadě neprojevily; liší se jen verze v názvu krycího listu. |
| K29/K36 T × Mt | 78/78 čísla | Dokumenty: DATUM (DT) 78, rozpis RP 3 — ověřeno během bez „slim“. |
| fuzz 600 | 600/600 | kulatá cesta 0, chyby 0 |
| tok Word/zámek (174) | T 169 + 5 zábran, M 169 + 5 | Stejné zábrany v obou: záporné opláštění pod dnem prohlubně (N035, N040, N056), nesmyslný rozměr (N063, N069). SoD 0 nevyplněných symbolů. |
| víc šachet | 40/40 | beze změny proti kolu 55 (CN v16 zastaví, CN v18 CZ/DE ok, VF39 zábrana Model 1) |
| víc zákazníků | sdílená 216/216, vlastní 213/216 | 3× K49-N2, únik 0 |
| **porovnání sestavení, rozšířená sada K56-1** (387) | **220 rozdílných, 220 očekávaných, 0 neočekávaných** | Seznam `podklady/porovnani/ocekavane_main_test_2026-11-25.txt`; každý rozdíl ověřen na surových výstupech obou stran: ER 80 (nové kalkulace), RP 135 (fuzz + fixtury), DT 4 fixtury (odeslaná drží datum zámku). |
| jednotkové sady (worktree `7144623e`) | **448 / 0 / 1 přeskočena** | test.js (shoda s Excelem jen lokálně) |
| harnessy | **102/107 OK** (4216 kontrol, 0 FAIL) | nově `overit_zk_zakaznici`; 5 bez podkladů v cloudu jako kolo 55 (manual, nabidka_proj_word, prirucka_admin, sablona, sablony_online) |

## Nálezy

| ID | vážnost | co | stav |
|---|---|---|---|
| K57-I1 | info | Oficiální seznam očekávaných rozdílů integrace (`ocekavane_test_integrace_2026-11-25.txt`) tvrdí u RP „krycí list beze změny ve všech 367 případech“. Rozšířená sada ukazuje řádek „Ruční položky v ceně“ v krycím listu OCK (BO i techdata) a ruční položky v Kompletním náhledu podkladů u každé kalkulace s ruční položkou. Odpovídá CHANGELOG RP (krycí list je v názvu dávky) — chyba není v aplikaci, ale stará sada krycí list nevidí (K56-I1). | doporučení: sloučit K56-1 do integrace |
| K57-I2 | info | Ceník testu (16. 11.) je starší než ceník main (24. 11., globální přirážka a statika opláštění). Uložené zakázky to nemění; nové kalkulace na testu se počítají ze staršího ceníku. | k rozhodnutí J. V. (datový úkol na test) |
| K57-I3 | info | ER #757/#758/#761 mění cenu **nové** kalkulace (engineering jako příplatek mimo nabídku, výstup ze zaměření 1 ×, rezerva příplatků v cenách položek). Prohlížečová sada počítá uložené TEST zakázky, takže ER nevidí; pokrývá ho jen porovnání sestavení (80 případů). | návrh: do plánu kola přidat sadu nových kalkulací |
| K49-I9 | info | Test bez SoD projekce DE/EN/FR | ✅ **vyřešeno** — od 25. 11. stejné soubory jako main |
| K49-N2 | nízká | Klon varianty a světlík „zajistí stavba“ (3× vlastní varianta VZ) | trvá |
| K49-I5 | info | Termíny firmy test × main | trvá |
| K38-I2 | info | Popis „Test uložení“ v ceníku testu | trvá |
| K54-N1 | střední | Smazaná otevřená zakázka (#750) | oprava v testu i main od v24.11.5; toto kolo ji netestovalo |

## Úkoly

| úkol | stav |
|---|---|
| sestavení T/Mt/Tp, shoda s weby, export dat (jen čtení) | ✅ |
| 608 kalkulací T/Mt/M/Tp, tok Word/zámek, K29/K36, fuzz, víc šachet, víc zákazníků | ✅ |
| porovnání sestavení rozšířenou sadou + seznam očekávaných | ✅ |
| jednotkové sady, harnessy | ✅ |
| protokol xlsx, STAV | ✅ |
| push větve `claude/testovani-kolo57` (a `-kolo56`) | ⬜ 403 — repozitář není ve zdrojích sezení |
| K57-I2 ceník testu, K49-N2, K49-I5, K38-I2 | ⬜ J. V. |
