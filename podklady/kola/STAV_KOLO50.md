# STAV kola 50 — cenové nabídky test × main (19. 11. 2026)

Testovací sezení převzalo proceduru kol 37–49 podle `PROMPT_PRENOS_TESTOVACI_PROCEDURY_2026-11-19.md` (balíček `KNG_KOLO_BALICEK_K49`).
Bez cen a nákladů. Protokol `VYHODNOCENI_TESTU_KOLO50_TEST_MAIN_2026-11-19.xlsx` (prodejní ceny TEST zakázek) šel jen J. V. do chatu.

## Výsledek v kostce

**Jeden nový nález s dopadem na cenu: K50-N1.** Jinde odpovídá kolo očekávání z kola 49.

## Verze, data a šablony

| | test | main |
|---|---|---|
| verze (web = `dist`) | v19.11.2 (`a3fad448`) | v11.11.1 (`6c4bc80`) |
| regrese | Tp = v18.11.2 (`5e21f89c`, kolo 49) | main se od kola 49 nezměnil |
| ceník | v11 (16. 11.) | v37 (2. 11.) — shodný kromě nulových klíčů `mustek*` (#625) a popisu „Sklo VSG s mléčnou fólií“ v testu |
| firma | 6. řádek termínů realizace (K49-I5) | 5 řádků |
| šablony | CN v17, SoD realizace **v6**, SoD projekce v4 | CN v17, SoD realizace v4, SoD projekce v4 |
| vypínače | viceSachet ZAP, viceZakazniku ZAP | viceSachet VYP |

Data: 216 TEST zakázek K28/K29/K36 z databáze testu (jen čtení), z main jen ceník, nastavení a šablony (bez zakázek).
Plán: nová sada E (50 náhodných, 20261119) + regrese B/A/Z/Q + cílené L+G + C01–C24 = 358.

## Výsledky

| dvojice / oblast | výsledek | kolo 49 | poznámka |
|---|---|---|---|
| T × Mt (kód test × main) | 290/358 shodných čísel | 309/358 | 50 = K40-N1, 20 = **K50-N1**; nevysvětleno 0 |
| Mt × M (data prostředí) | 358/358 | 358/358 | liší se jen `FIRMA_NAB_TERMINY*` |
| Tp × T (změna kódu testu) | 338/358 | — | 20 = **K50-N1** (SP #667, v19.11.1) |
| K29/K36 T × Mt | 78/78 | 78/78 | |
| fuzz 600 | 580 shodných, 20 = K50-N1 | 600/600 | všech 20 rozdílných = zahraniční základ (Z0x) s novým ceníkem; kulatá cesta 0 |
| tok Word/zámek | 121/124 + 3 správné zábrany | 123/124 + 1 | zábrany: zdvih 0; opláštění níž než dno prohlubně (2×, náhodná data). Test SoD v6 0 nevyplněných symbolů, main SoD v4 16–25 |
| víc šachet | 40/40 | 40/40 | CN v16 zastaví, v17 CZ/DE ok, SoD vyjmenuje šachty 39/39, zámek shoda 40/40, VF39 zábrana |
| víc zákazníků | sdílená 216/216, vlastní 213/216 | stejné | 3× K49-N2 (K29-N19, N24, N49); únik 0 |
| jednotkové sady | 384 / 0 / 1 přeskočena | 376/0/1 | |
| harnessy | 89/95 | 89/94 | 5 bez podkladů v cloudu + nový `overit_sablony_online` přeskočen (podklady) |
| jazyk šablon | test SoD v6 DE/EN/FR 4/143, main SoD v4 4/143, main SoD projekce v4 4/99 | | **K49-N1 vyřešen**; test nemá SoD projekce DE/EN/FR (K49-I9) |
| plná moc | 12 symbolů v testu (v2) i main (v1) | | **VZ-N5 vyřešen** |

## Nálezy

| ID | vážnost | co | stav |
|---|---|---|---|
| **K50-N1** | **vysoká (cena)** | Zahraniční řada ceníku (`cenikRada` „zahr“): položka „STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ“ se od v19.11.1 (SP #667) počítá **českou** sazbou statiky místo zahraniční. `cenikSlozRadu(cr, zahr, 'zahr')` vezme český ceník, kde `cenikMigraceStatikyOpl` (nebo `DEFAULT_CENIK`) už nastavila `statikaOplKc` = česká `statikaKc`. Zahraniční ceník `C.statikaOplKc` nemá, proto se nepřepíše. Položka vyjde asi na 21 % dřívější ceny a klesne i přirážka za ATYP – projekční práce. Dotčeno 20/20 zahraničních kalkulací s novým ceníkem v plánu i 20/20 ve fuzzu. Main to nemá. CHANGELOG v19.11.1 slibuje „výchozí stav = dnešní ceny“. Porovnání sestavení S3 (SHODA 353/353) to neodhalilo, jeho sada nemá zahraniční cestu s novým ceníkem a statikou opláštění. | nový, hlášen koordinaci 19. 11. |
| K40-N1 | střední | main: čelní sklo po přepnutí typu (50 kalkulací) | opraveno v testu, trvá v main |
| K49-N2 | nízká | klon varianty a světlík „zajistí stavba“ (3 zakázky) | trvá |
| K49-I5 | info | 6. řádek termínů firmy | rozhodnuto, na main při nasazení |
| K49-N1, VZ-N5 | — | jazyk SoD projekce v main, plná moc bez symbolů | vyřešeno |

Návrh pro vývoj ke K50-N1: v `cenikSlozRadu` pro řadu `zahr` bez `C.statikaOplKc` v zahraničním ceníku převzít zahraniční `C.statikaKc`
(nebo migraci statiky pouštět až po složení řady). Plus pojistka testem nad zahraničním ceníkem a doplnění sady porovnání S3.

## Odchylky od přenesené procedury

- Přihlášení nedělal J. V. v prohlížeči. Sezení se přihlašovalo samo přes `KNG_TEST_*` / `KNG_MAIN_*` (souhlas J. V. 18. 11.).
  Exporty běžely v Playwrightu stejnými dotazy jako skripty 1 a 2 v `export_prohlizec.md` (jen GET).
- Šablony se nebraly z Disku, ale z `/api/sablony` (platné verze) pod jmény z balíčku.
- Pracovní složka byla ve scratchpadu sezení (ne `/home/claude/work`). Regrese Tp se přidala do kopie `run_kolo.sh` (`run_kolo50.sh`).
- Protokol je zjednodušený podle vzoru (Přehled, 50 standardních, nová sada, regrese, cílené, víc šachet, víc zákazníků, nálezy).
- `device_commit_files` a `project_write` nejsou v tomto sezení k dispozici. Protokol a STAV šly do chatu, STAV do `claude/testovani`.

## Úkoly

- ✅ kolo 50 celé (výpočet, tok, fuzz, VS, VZ, jednotkové sady, harnessy), protokol, STAV
- ⬜ K50-N1: oprava vývojem (rychlá cesta, pokud J. V. rozhodne) a pak cílené kolo nad zahraniční řadou
- ⬜ K40-N1 zmizí po sloučení testu do main
