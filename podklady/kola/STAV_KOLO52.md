# STAV kola 52: cenové nabídky test × main (22. 11. 2026)

Testovací sezení, větev `claude/testovani`. Postup je stejný jako v kole 51 (balíček `KNG_KOLO_BALICEK`, `run_kolo52.sh`).
Nová náhodná sada má **100 kalkulací (G001–G100, semínko 20261122)**. Bez cen a nákladů. Protokol
`VYHODNOCENI_TESTU_KOLO52_TEST_MAIN_2026-11-22.xlsx` s prodejními cenami TEST zakázek zůstal jen ve scratchpadu sezení, do repa nejde.

## Výsledek v kostce

**Žádný nový nález s dopadem na cenu. Test a main počítají všech 458 kalkulací stejně.**
- **K40-N1 z main zmizel.** Main je teď `cda289e`, tedy test z kola 51 s opravou. T × Mt má 0 rozdílů v číslech. Ze 55 kalkulací
  s K40-N1 v kole 51 jich je v plánu 49 a všech 49 má teď v main stejnou cenu jako v testu. Šest bylo v sadě 47, která z regrese vypadla.
- Dávky VZD, HN, BZ, PR, OP1, DS, DOS a SB (v21.11.1–v22.11.5) cenu nemění, jak uvádí CHANGELOG. Kolo to potvrdilo: 458/458, fuzz 600/600, K29/K36 78/78.
- Nevysvětlených rozdílů je 0, chyb harnessu 0, opakování 0 a pádů rendereru 0. Kulatá cesta export → import sedí ve všech případech.

## Verze, data a šablony

| | test | main |
|---|---|---|
| verze (web = `dist`) | **v22.11.5** (`05a496d`). Ověřeno na začátku (22. 11. 07:30 UTC) i na konci (08:44 UTC): text na stránce, `/api/zdravi` i `git ls-remote origin test`. Během kola se test neposunul. | **v19.11.11** (`cda289e`), nasazeno 22. 11. Ověřeno stejně, beze změny |
| regrese | **Tp = `cda289e`** = test z kola 51. **Je to tentýž kód jako main**, proto Tp × T = Mt × T. Tp i Mt daly na 458 kalkulacích stejné výsledky bit po bitu | main se od kola 51 posunul z v11.11.1 na v19.11.11 |
| ceník | v11 (16. 11.) | v37 (2. 11.). Shodné kromě nulových klíčů `mustek*` (#625) a popisu, jako v kole 51 |
| firma | 6. řádek termínů realizace (K49-I5) | 5 řádků. Kód s K49-I5 už v main je, data firmy main se nezměnila |
| šablony (`sab_kolo.js`) | CN **v17** (`nabidka` v7, DE v6), SoD realizace v6 (v5), SoD projekce v4 (v3), PROJ **v8** (v6) | CN **v18** (`nabidka` v15, DE v8), SoD realizace **v6** (v4), SoD projekce v4 (v4), PROJ **v9** (v7) |
| jazyk šablon (`jazyk.py`) | SoD v6 DE/EN/FR 4/143, CN v17 DE/EN 1/149, plná moc v2 (12 symbolů). SoD projekce DE/EN/FR chybí (K49-I9) | SoD v6 DE/EN/FR 4/143, SoD projekce v4 DE/EN/FR 4/99, CN v18 DE/EN 1/149, plná moc v1 (12 symbolů) |
| vypínače | viceSachet ZAP, viceZakazniku ZAP | viceSachet VYP, viceZakazniku VYP |

Main má teď novější šablony CN a PROJ než test (v18 / v9 proti v17 / v8). Podle SB se na test nahrají až po odeslání do main.
`dist_T` a `dist_M` jsou sestavené z `git archive` ve scratchpadu (`KNG_NEZVYSOVAT_VERZI=1`) a `dist_Tp` je kopie `dist_M`.
Data: 216 TEST zakázek K28/K29/K36 z databáze testu (`export.js`, jen GET). Proti kolu 51 se nezměnila žádná zakázka.
Z main se stáhl jen ceník, nastavení a šablony, žádné zakázky. Na test ani na main se nic nezapisovalo a Pipedrive se nevolal.

## Plán

**458 kalkulací**: 50 standardních + **nová sada G001–G100 (100)** + regrese 250 (**F001–F100 z kola 51**, E01–E50, D, 48)
+ cílené L+G 34 + C01–C24 24.
- `gen_plan52.py` = `gen_plan51.py` (2× skladba po 50: 30 C, 30 C s můstky, 12 hran, 18 zahraničních, 10 PROJ). Sada 47 vypadla.
- Dál: K29/K36 78, fuzz 600, víc šachet 40, víc zákazníků 216 a tok Word/zámek 174 (std 50 + G 100 + C 24).

## Výsledky

| dvojice / oblast | výsledek | kolo 51 | poznámka |
|---|---|---|---|
| T × Mt (kód test × main) | **458/458** shodných čísel | 353/408 | K40-N1 0 (main opraven), nevysvětleno 0. Dokumenty: jen `nazevSouboru` krycího listu (číslo verze) 458×, řádky krycího listu i symboly Word/SoD jsou shodné |
| Mt × M (data prostředí) | 458/458 | 408/408 | liší se jen `FIRMA_NAB_TERMINY*` (K49-I5) v nabídce CZ/DE a SoD |
| Tp × T (změna kódu testu) | 458/458 | 384/408 | Tp = kód main, výsledek je stejný jako T × Mt |
| shoda s kolem 51 | 358/358 | | společné kalkulace (std, F, E, D, 48, cílené): Tp kola 52 = T kola 51 ve všech číslech |
| K29/K36 T × Mt | 78/78 čísel | 78/78 | dokumenty: jen název souboru krycího listu 78× (počty sekcí a řádků shodné) |
| fuzz 600 | **600/600** | 600/600 | kulatá cesta 0, chyby 0 |
| zábrany v plánu | 15 (T, Mt, M i Tp shodně) | 11 | správné: zdvih 0 (7×, hrana „jedno nástupiště“) a opláštění níž než dno prohlubně (8×, náhodná data) |
| tok Word/zámek | T **169/174** + 5 správných zábran (G), M 169/174 + 5 | 169/174 + 5 | Word CZ/DE obsahuje cenu bez vad, SoD obsahuje cenu, zámek, znovuotevření i `zamekOvereni` shoda/0. Nevyplněné symboly SoD: test v6 0, **main v6 0** (v kole 51 main v4 16–25) |
| víc šachet | 40/40 | 40/40 | cena = Σ šachet 40/40, rozpis = celkem 38/38, CN v16 zastaví, v17 CZ/DE ok 39/39, SoD bez vad 39/39, zámek shoda 40/40, VF39 zábrana (víc šachet v Modelu 1) |
| víc zákazníků | sdílená 216/216, vlastní 213/216 | stejně | 3× K49-N2 (K29-N19, N24, N49), únik 0 |
| jednotkové sady (`spust_testy.sh`, **git worktree** 05a496d) | **414 / 0 / 1 přeskočena** | 400/1/1 | přeskočen jen `test.js` (není v exportu). K51-I1 je vyřešené pouštěním ve worktree |
| harnessy (`overit_*.mjs` + smoke) | 97/102 | 94/100 | 4 bez podkladů v cloudu (`manual`, `nabidka_proj_word`, `prirucka_admin`, `sablona`), `overit_sablony_online` přeskočen. `overit_sod` už běží nad syntetickými šablonami (HN #646) |

### Změny dokumentů podle CHANGELOG v21.11.1–v22.11.5 a co z nich kolo vidí

| dávka | změna | v kole |
|---|---|---|
| VZD #665 | „Vypracoval“ ze snímku zámku při dotisku odeslané nabídky | harness nedotiskuje odeslanou nabídku, kolo to nepokrývá |
| VZD #683 | krycí list PROJ jen u slevy PROJ 100 % | řádky krycích listů T × Mt jsou shodné 458/458 a K29/K36 78/78, takový případ se v plánu neprojevil |
| DS #648 | „Shaft N / Schacht N“ u nepřejmenované šachty v EN/DE/FR | symboly DE nabídky T × Mt shodné. Smyčka šachet v EN/DE/FR se proti main neporovnává (VS jen v T) |
| OP1 #682, D3-N1, PG-N1 | prázdný pruh EN/DE/FR, rozvržení objednávky PROJ, náhled podkladů | struktura Wordu a náhled nejsou v porovnání harnessu, kolo je nepokrývá |
| BZ B231/B232 | zmrazená strana zakázky, přísné ověření zámku | tok zámku T: `zamekOvereni` shoda/0 169/169, VS 40/40 |
| PR, HN, SB, DOS | připomínky (výchozí VYP), testy, nástroj šablon, náhled | bez vlivu na čísla a symboly |

## Nálezy

| ID | vážnost | co | stav |
|---|---|---|---|
| K40-N1 | střední | main: čelní sklo po přepnutí typu | ✅ **z main zmizel** (cda289e): T × Mt 0 rozdílů, 49/49 dřívějších případů má M = T |
| K49-N2 | nízká | klon varianty a světlík „zajistí stavba“ (3 zakázky VZ) | trvá |
| K49-I5 | info | 6. řádek termínů firmy | kód v main, data firmy main mají dál 5 řádků |
| K51-I1 | info (harness) | `test_kontrola_udaju.js` ve stromu bez `.git` | ✅ vyřešeno: sady ve worktree 414/0/1 |
| K52-I1 | info (harness) | export testu (`export.js`) zablokoval 1 požadavek, který nebyl GET. Neodešel, takže se nic nezapsalo. Při kontrolním přihlášení na konci kola 0 | jen zapsáno |

Žádný nový nález K52-N.

## Odchylky od zadání a od kola 51

- Tp se nesestavoval zvlášť: `dist_Tp` je kopie `dist_M`, protože jde o tentýž commit `cda289e`. Běh Tp přesto proběhl a dal stejné výsledky jako Mt.
- Kolo běželo po fázích (`run_kolo52.sh o | w | zbytek`, potom `spust_testy.sh` a `harnessy.py` s `KNG` = git worktree `wt_T`),
  postupně a bez souběhu prohlížečů. Výpočetní fáze trvaly 07:32–08:09 UTC. 0 opakování, 0 pádů rendereru.
- Vyhodnocení dělají `vyhodnot52.py` a `vyhodnot52_zbytek.py`, protokol `protokol52.py` (listy Přehled, 50 standardních, nová sada G (100),
  regrese 250, cílené 58, víc šachet 40, víc zákazníků 216, nálezy).

## Úklid

Pracovní složka `scratchpad/kolo52/KOLO` (sestavení, exporty, výsledky, `POSTUP.md`) je mimo repo. Pomocný worktree `wt_T` je odstraněný.
Na test se nic nezapisovalo, TEST sada je beze změny (216 zakázek K28/K29/K36).

## Úkoly

- ✅ kolo 52 celé (458 kalkulací, z toho nová sada G 100 a regrese F 100; fuzz, tok, VS, VZ, jednotkové sady ve worktree, harnessy), protokol, STAV
- ✅ K40-N1 z main zmizel
- ⬜ po nahrání CN v18 / PROJ v9 na test zopakovat tok Word s novými šablonami na obou stranách
