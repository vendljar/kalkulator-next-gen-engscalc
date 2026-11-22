# STAV kola 51: cenové nabídky test × main (21.–22. 11. 2026)

Testovací sezení, větev `claude/testovani`. Postup je stejný jako v kole 50 (balíček `KNG_KOLO_BALICEK`, `run_kolo51.sh`).
Zadání J. V.: otestovat **alespoň 100 cenových nabídek různých konfigurací**. Proto je v kole nová náhodná sada se 100 kalkulacemi
místo 50. Bez cen a nákladů. Protokol `VYHODNOCENI_TESTU_KOLO51_TEST_MAIN_2026-11-21.xlsx` s prodejními cenami TEST zakázek
zůstal jen ve scratchpadu sezení, do repa nejde.

## Výsledek v kostce

**Žádný nový nález s dopadem na cenu.** Všechny rozdíly v číslech mají známou příčinu:
- **K50-N1 je na testu pryč.** T × Mt má 0 rozdílů s příčinou K50-N1. Fuzz vyšel 600/600 (v kole 50 bylo 20 rozdílných kalkulací).
  Mezi Tp (v19.11.2, ještě s vadou) a T se liší právě 24 zahraničních kalkulací s novým ceníkem, a to je ta oprava.
- **K40-N1 v main trvá** (55 kalkulací, čelní sklo VSG po přepnutí typu). V testu je opravené, zmizí po sloučení do main.
- Nevysvětlených rozdílů je 0, chyb harnessu 0 a kulatá cesta export → import sedí ve všech případech.

## Verze, data a šablony

| | test | main |
|---|---|---|
| verze (web = `dist`) | **v19.11.11** (`cda289e`), ověřeno na začátku (21. 11. 19:20 UTC) i na konci (21. 11. 20:17 a 22. 11. 00:34 UTC): text na stránce, `/api/zdravi` i `git ls-remote origin test`. Test se během kola neposunul (J. V. ho zafixoval do 24. 11.). | v11.11.1 (`6c4bc80`), beze změny |
| regrese | **Tp = v19.11.2 (`a3fad448`)** = test z kola 50 | main se od kola 50 nezměnil |
| ceník | v11 (16. 11.) | v37 (2. 11.). Shodné kromě nulových klíčů `mustek*` (#625) a popisu „Sklo VSG s mléčnou fólií“, jako v kole 50 |
| firma | 6. řádek termínů realizace (K49-I5) | 5 řádků |
| šablony | CN v17 (`nabidka` v7), SoD realizace **v6** (`sod` v5), SoD projekce v4, PROJ v8 | CN v17 (v14), SoD realizace v4 (v3), SoD projekce v4, PROJ v8 |
| vypínače | viceSachet ZAP, viceZakazniku ZAP | viceSachet VYP |

`dist_T`, `dist_M` a `dist_Tp` jsou sestavené z `git archive` daných commitů ve scratchpadu (`KNG_NEZVYSOVAT_VERZI=1`). Verze se nezvyšovala
a nic se necommitovalo. Data: 216 TEST zakázek K28/K29/K36 z databáze testu (`export.js`, jen GET, zablokováno 0 požadavků).
Z main se stáhl jen ceník, nastavení a šablony, žádné zakázky. Šablony stáhl `sab_kolo.js`.
Na test ani na main se nic nezapisovalo, Pipedrive se nevolal.

Jazyk šablon (`jazyk.py`, jen čtení) vyšel stejně jako v kole 50. Test SoD v6 DE/EN/FR má 4/143 odstavců s českými znaky,
CN v17 DE/EN 1/149, plná moc v2 12 symbolů. Main SoD v4 DE/EN/FR 4/143, SoD projekce v4 DE/EN/FR 4/99. Test pořád nemá SoD projekce
DE/EN/FR (K49-I9).

## Plán

**408 kalkulací**: 50 standardních + **nová náhodná sada F001–F100 (100 kalkulací, semínko 20261121)** + regrese 200
(E01–E50 z kola 50, D z kola 49, sady 48 a 47) + cílené L+G 34 + C01–C24 24.

- Plán kola 50 se v kontejneru nedochoval. Zrekonstruoval ho balíčkový `gen_plan.py` se stejnými vstupy (semínko 20261119, písmeno E,
  tentýž export). Generátor je deterministický.
- Nová sada se jmenuje **F**, ne E. Písmeno E už nese sada kola 50, která je teď v regresi (`nahE`), a stejné písmeno by zdvojilo ID.
- `gen_plan51.py` je `gen_plan.py` s parametrem N. Sada 100 = 2× skladba po 50: 30 C, 30 C s můstky (z toho 24 s novým ceníkem),
  12 hran (nízká, vysoká, jedno nástupiště, prázdný můstek, můstek 6000, všechny volitelné), 18 zahraničních (12 s můstky,
  8 s novým ceníkem, tedy přímá kontrola K50-N1) a 10 PROJ. ID jsou trojmístná.
- Dále: K29/K36 78, fuzz 600, víc šachet 40, víc zákazníků 216, tok Word/zámek 174 (std 50 + F 100 + C 24).

## Výsledky

| dvojice / oblast | výsledek | kolo 50 | poznámka |
|---|---|---|---|
| T × Mt (kód test × main) | **353/408** shodných čísel | 290/358 | 55 = K40-N1 (F 9, E 7, D 7, 48 4, 47 6, cílené 22), **K50-N1 0**, nevysvětleno 0 |
| Mt × M (data prostředí) | 408/408 | 358/358 | liší se jen `FIRMA_NAB_TERMINY*` (K49-I5) |
| Tp × T (změna kódu testu) | 384/408 | 338/358 | 24 = **oprava K50-N1** (v19.11.3): všechny zahraniční kalkulace s novým ceníkem (F 8, E/D/48/47 po 4). Jinde čísla shodná |
| K29/K36 T × Mt | 78/78 čísel | 78/78 | dokumenty: název souboru krycího listu (verze) 78×; 5 PROJ má 2 nové prázdné symboly `PROJ_DALSI_UJEDNANI_*` (PG, v19.11.10) |
| fuzz 600 | **600/600** | 580 + 20 K50-N1 | kulatá cesta 0, chyby 0 |
| zábrany v plánu | 11 (T, Mt, M i Tp shodně) | | správné: zdvih 0 (6×), opláštění níž než dno prohlubně (5×, náhodná data) |
| tok Word/zámek | T **169/174** + 5 správných zábran; M 169/174 + 5 | 121/124 + 3 | Word CZ/DE obsahuje cenu bez vad, SoD obsahuje cenu, zámek, znovuotevření, `zamekOvereni` shoda/0. Nevyplněné symboly: test SoD v6 0, main SoD v4 16–25 |
| víc šachet | 40/40 | 40/40 | cena = Σ šachet 40/40, rozpis = celkem 38/38. CN v16 zastaví, v17 CZ/DE ok 39/39, SoD bez vad 39/39, zámek shoda 40/40, VF39 zábrana (víc šachet v Modelu 1) |
| víc zákazníků | sdílená 216/216, vlastní 213/216 | stejně | 3× K49-N2 (K29-N19, N24, N49), únik 0 |
| jednotkové sady (`spust_testy.sh`, strom cda289e) | 400 / 1 / 1 přeskočena | 384/0/1 | 1 FAIL = `test_kontrola_udaju.js` SEC-N5 jen ve stromu z `git archive` bez `.git`. V git worktree cda289e 27 OK / 0 FAIL (K51-I1, harness) |
| harnessy (`overit_*.mjs` + smoke) | 94/100 | 89/95 | 5 bez podkladů v cloudu (`manual`, `nabidka_proj_word`, `prirucka_admin`, `sablona`, `sod`), `overit_sablony_online` přeskočen (podklady) |

### Rozdíly dokumentů (bez vlivu na cenu), všechny odpovídají CHANGELOG v19.11.3–v19.11.11

| co | kde | verze testu |
|---|---|---|
| „bez — dodá stavba“ → „bez opláštění“ v `OPLASTENI_VETA`, `TS_MATERIAL_OPLASTENI`, `TS_ROZSAH_OPLASTENI` (CN i SoD) | 12 kalkulací s pásem bez opláštění (T proti Tp i Mt) | v19.11.6 (DO, D2) |
| nové symboly `PROJ_DALSI_UJEDNANI_NAZEV/_TEXT` (prázdné) v nabídce i SoD PROJ | 38 PROJ | v19.11.10 (PG) |
| nový řádek krycího listu PROJ „Číslo zakázky“ (prázdný) | 38 PROJ | v19.11.11 (D3) |
| `nazevSouboru` krycího listu nese číslo verze | všech 408 | — |

## Nálezy

| ID | vážnost | co | stav |
|---|---|---|---|
| K50-N1 | vysoká (cena) | statika opláštění v zahraniční řadě českou sazbou | ✅ **na testu opraveno** (v19.11.3): 0 rozdílů T × Mt, fuzz 600/600, 24/24 opravených proti Tp. Na main se nedostal. |
| K40-N1 | střední | main: čelní sklo po přepnutí typu (55 kalkulací) | opraveno v testu, trvá v main |
| K49-N2 | nízká | klon varianty a světlík „zajistí stavba“ (3 zakázky VZ) | trvá |
| K49-I5 | info | 6. řádek termínů firmy | rozhodnuto, na main při nasazení |
| K51-I1 | info (harness) | `test_kontrola_udaju.js` (SEC-N5, `git check-ignore`) selže ve stromu bez `.git` z `git archive`. Aplikace v pořádku | příští kolo pouštět jednotkové sady v git worktree |

Žádný nový nález K51-N.

## Odchylky od zadání a od kola 50

- Nová sada je F (ne E), důvod je uvedený u plánu. Plán kola 50 je zrekonstruovaný generátorem.
- Kolo běželo po fázích (`run_kolo51.sh o | w | zbytek | unit`, hotové výstupy se přeskakují), postupně, bez souběhu prohlížečů.
  0 opakování, 0 pádů rendereru. Vyhodnocení dělají `vyhodnot51.py` (T × Mt, Mt × M, Tp × T s tříděním příčin)
  a `vyhodnot51_zbytek.py` (tok, K29/K36, fuzz, VS, VZ). Na výstupu jsou jen počty a ID. Protokol vyrábí `protokol51.py`.
- Protokol xlsx (Přehled, 50 standardních, nová sada F (100), regrese 200, cílené 58, víc šachet 40, víc zákazníků 216, nálezy)
  zůstal jen ve scratchpadu.

## Úklid

Pracovní složka `scratchpad/kolo51/KOLO` (sestavení, exporty, výsledky) a pomocný worktree `wt_T` (odstraněný) jsou mimo repo.
Na test se nic nezapisovalo, TEST sada je beze změny (216 zakázek K28/K29/K36).

## Úkoly

- ✅ kolo 51 celé (408 kalkulací, z toho nová sada 100; fuzz, tok, VS, VZ, jednotkové sady, harnessy), protokol, STAV
- ⬜ K40-N1 zmizí po sloučení testu do main
- ⬜ K51-I1: v příštím kole pouštět `spust_testy.sh` v git worktree
