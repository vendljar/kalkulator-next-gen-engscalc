# PREDAVKA — živý stav (18. 11. 2026)

Jen živý stav: větve a verze, běžící dávky, co čeká na J. V., další krok. Nejvýš 15 kB (krok `staticke`).
Předávky dávek: `podklady/predavky/RRRR-MM.md` (nejnovější nahoře). Rozhodnutí J. V.: `podklady/ROZHODNUTI_LOG.md`.
Svěřená rozhodnutí: `podklady/SVERENA_ROZHODNUTI.md`. Pravidla: `CLAUDE.md`.

## Větve a verze

| větev | commit | verze | poznámka |
|---|---|---|---|
| `main` | 6c4bc80 | v11.11.1 | ostrý web; víc šachet vypnuto |
| `test` | dcb1678 | v18.11.3 | = integrace |
| `claude/integrace-16-10` (integrace) | dcb1678 | v18.11.3 | C9 #608 (v18.11.1), víc zákazníků VZ #598 E0–E6 (v18.11.2, vypínač výchozí VYP), S3 #611 porovnání sestavení (v18.11.3); `main` je předkem |
| `claude/rychla-k40n1` | b4a9622 | — | rychlá cesta K40-N1 nad main 6c4bc80 (cherry-pick b4e2023) |
| `claude/navrh-rezie` | e6c1020 | — | návrh režie vývoje (S1–S8) + rozhodnutí J. V. 18. 11.; kopie návrhu v `podklady/NAVRH_REZIE_2026-11-18.md` |
| `claude/s7-podklady` | (tato dávka) | v18.11.4 | S7 startovní podklady #612, sloučeno s integrací dcb1678 |
| `claude/s6s8-evidence` | (tato dávka) | v18.11.5 | S6 + S8 #613: jedna evidence, PREHLED.md, NOVINKY; nad integrací 9bd6dc8 |
| `claude/vz-t1` | (tato dávka) | v19.11.2 | VZ T1 #669: řídící varianta a zákazník v hlavičce; s d8e4fc1 a 82cbd72; revize poradce; viz CHANGELOG |
| `claude/vz-f2` | (tato dávka) | v19.11.4 | VZ-F2 #660–#663 + VZF1-I1 nad a3fad44; číslo verze přečísluje koordinace |
| `claude/d3-objednavka-proj` | (tato dávka) | v19.11.11 | D3 #688 Objednávka / Smlouva PROJ nad integrací 042fcbc; číslo verze přečísluje koordinace |
| `claude/np-nahled` | (tato dávka) | v19.11.9 | NP: Kompletní náhled podkladů OCK ve vzhledu Wordu CN v17 (#681 prac.); nad 6092af3 |
| `claude/on-online` | (tato dávka) | v19.11.8 | #ON kdo je online (Nastavení → Uživatelé) nad 042fcbc; verzi přečísluje koordinace |
| `claude/d8-lhuty` | (tato dávka) | v19.11.7 | D8 #677 (pracovní) lhůty PROJ → termíny krycího listu; nad integrací 042fcbc; verzi přečísluje koordinace |
| `claude/vz-f1` | (tato dávka) | v18.11.8 | VZ-F1 #659 opravy nálezů ruční zkoušky VZ; nad ec5bbac, sloučeno s integrací 41bbe99 |
| `claude/rj-rozhodnuti` | (tato dávka) | v22.11.9 | RJ (#714, #715); v22.11.9 revize N1/N2/I3 (#717), sloučeno s 60086f7 |
| `claude/jt-jazyk-tisku` | (tato dávka) | v22.11.6 | JT #713 prac.: jazyk specifikace OCK = Jazyk tisku; nad 05a496d |
| `claude/pr-pripominky` | (tato dávka) | v22.11.5 | PR #707–#712 Připomínky z aplikace, sloučeno s integrací 6fa67af |
| `claude/hn-harnessy` | (tato dávka) | v22.11.2 | HN zpevnění testů kola (#638, #644, #646, #647, #695) nad cda289e; aplikace beze změny; verzi přečísluje koordinace |
| `claude/vzd-drobnosti` | (tato dávka) | v22.11.1 | VZD #673 #674 #665 #683 #635, sloučeno s integrací 885577e; viz CHANGELOG |
| `claude/dos-drobnosti` | (tato dávka) | v21.11.4 | DOS #680 #690 #691 nad cda289e |
| `claude/pg-tisk` | (tato dávka) | v19.11.10 | PG #684–#687 nad integrací 042fcbc; čísla a verzi přečísluje koordinace |
| `claude/ds-sablony` | (tato dávka) | v21.11.3 | DS #648–#650 nad cda289e; verzi přečísluje koordinace |
| `claude/op1-drobnosti` | (tato dávka) | v21.11.2 | OP1: PG-N1, #682, D3-N1, D3-N2 nad cda289e; kolo --bez-mutaci VŠE ZELENÉ, S3 SHODA 359/359, mutace [OP1] 9/9, [D3] 18/18, [NP] 16/16, [PG] 16/16; #692–#694 a verzi přečísluje koordinace |
| `claude/bz-bezpecnost` | (tato dávka) | v22.11.3 | BZ audit B231–B236, B195 nad cda289e; revize Fable |
| `claude/cn-cislo-nabidky` | (tato dávka) | v23.11.3 | CN #727 číslo nabídky nad 8411eb9 |
| `claude/ra-rozhodnuti` | (tato dávka) | v23.11.2 | RA #723 #724 #726 + log webhooku nad integrací 133a8f5; verzi přečísluje koordinace |
| `claude/pd-webhook-uprava` | (tato dávka) | v23.11.5 | PD #733 #732 #728 #729 nad 173ab6a; verzi přidělí koordinace |
| `claude/mt-mutace-2311` | (tato dávka) | v23.11.3 | MT #735: 4 nechycené mutace kola 45162888071 — jen testy, nad c8d3d9d |
| `claude/sa-sablony` | (tato dávka) | v23.11.6 | SA #719–#721 kontrola šablon nad 133a8f5; verzi přečísluje koordinace |
| `claude/lak-lakovani` | (tato dávka) | v22.11.8 | LAK #666 lakování z nabídky lakovny nad 05a496d, s integrací 36e2681 |
| `claude/dt-datum-tisku` | (tato dávka) | — | DT #745 #746 datum nabídky = den tisku nad 0fd6410; verzi přidělí koordinace |
| `claude/pv-pipedrive` | (tato dávka) | v23.11.7 | PV #597 zápis prodeje do dealu + #734 autor = vlastník dealu nad 1280831; revize Fable; verzi přidělí koordinace |
| `claude/ut-texty` | (tato dávka) | — | UT #741 #742 #743 (#744 čeká na J. V.) nad 0fd6410; verzi přidělí koordinace |
| `claude/po-odeslani-pipedrive` | (tato dávka) | v24.11.10 | PO #116 nad 0d8a95f; Fable SLOUČIT; předávka v archivu |
| `claude/r3-pole-wordu` | (tato dávka) | — | R3 #751 zákaz dalších polí Wordu nad 3cab0c5 (v24.11.2); verzi přidělí koordinace |
| `claude/er-engineering-rezerva` | (tato dávka) | v24.11.9 | ER #757 #758 #761 nová kalkulace; předávka v archivu |
| `claude/zk-zakaznici-ze-zakazek` | (tato dávka) | v24.11.8 | ZK #755 zákazníci ze zakázek podle ARES (nástroj správce) nad c89e872, sloučeno s integrací d3d449b (v24.11.7); revize Fable SLOUČIT |

Tagy: jen verze nasazená do `main` (HEAD), mezilehlé ne (J. V. 22. 11.). Kontrola: `python3 nastroje/release_odkaz.py --chybejici`
(22. 11.: žádná — main v19.11.11, tag vydán).

## Běžící dávky

ZK #755 (v24.11.8, `claude/zk-zakaznici-ze-zakazek`): předávka dávky v `podklady/predavky/2026-11.md` (nahoře).

Stav 24. 11. 2026 21:00 (koordinace session_01TMQ5bLDJuS5k5NWWYy7jLx, kontext 74 % → doporučeno nové sezení; kokpit https://claude.ai/artifact/LLLBVLxKcWDHhd8axapiU2):
- **main** v24.11.7 (4e69c27, 25. 11. — test → main na pokyn J. V.; release v24.11.7 čeká na J. V.). **test** v24.11.7 (4e69c27). **integrace** v25.11.1 = UT, R3, DT, RP, ZK, ER, PO, TZ-1; Actions nad aa8f651 ZELENÉ 36/36.
- **v24.11.7 pro test** (lokálně v pracovní kopii koordinace, NEpushnuto): test 6722ad9 + claude/rychla-PT-ZAB (7d1b3d1, #759 překlad zábradlí + výčet víc skupin můstků) + claude/rychla-K56-I2 (7ddb87f, #760 SoD a objednávka PROJ = kdo tiskne, CN snímek zámku). Postup: sloučit obě větve nad origin/test (konflikty jen přidané řádky — sjednotit), verze 24.11.7, kolo `--bez-mutaci --proti origin/test --ocekavane podklady/porovnani/ocekavane_pt-zab_2026-11-24.txt`, push do test, /api/zdravi, pak test sloučit do integrace.
- **Další:** integrace v25.11.1 → test (pokyn); pak testovací sezení: PO na deal TEST, ZK naplnění, R1 RP Word na CN v18. PIPEDRIVE_ZAPIS na main vypnutý.
- **ER** (claude/er-engineering-rezerva, 3f3162f, #757 engineering příplatek 1× za variantu, #758 rezerva v položkách + automat ATYP, #761 přepínače; jen nové kalkulace kalkVerze 2): opravy po revizi Fable (N1 engineering víc šachet, N3 server hlídá příznak, N5, N6) → dorevize (session_018mwHQEfyWwjwB8mdLvYCpJ). J. V.: N2 a N3 ano.
- **ZK** (claude/zk-zakaznici-ze-zakazek, 62403a4, #755 naplnění zákazníků podle ARES): dorevize běží (session_018mwHQJYxTLw32SuMNrUtwJ). J. V.: R7, R9 a ostatní ponechat.
- **PO** (claude/po-odeslani-pipedrive, #116): revize i dorevize Fable SLOUČIT, sloučeno s 0d8a95f jako v24.11.10; v integraci, TZ-1 = v25.11.1. J. V. založí pole „Datum nabídky“ (#763).
- **Fronta:** K56-D hotovo (`claude/k56-porovnani`, předávka v `podklady/predavky/2026-11.md`); doprava a přesun hmot OCK (PDF návrh u majitele); R1 RP Word na skutečných šablonách CN v18 před main (testovací sezení).
- Sloučené dnes: PV, MT2, UT, R3, DT, K54-N1, RP — předávky v `podklady/predavky/2026-11.md`.
- Sloučené dávky (SA, PD, CN, RA, LAK, JT, NN, PR, BZ, HN, RJ, VZD, MT) — oddíly přesunuty do `podklady/predavky/2026-11.md` (23. 11. 2026). Běží: PV (#734 + #597), RP (prototyp ručních položek, čeká na J. V.).

## Dávka PV (`claude/pv-pipedrive`, 23. 11. 2026)

- Nad integrací 1280831 (v23.11.5), v23.11.7. **#734:** webhook při založení dohledá vlastníka dealu
  (owner_id → GET /api/v1/users → e-mail → aktivní účet) = autor; jinak technický účet + varování a `autor` v logu.
  Vazba nese `zalozil` (pdVazbaDokladaZapis). **#597:** POST `/api/pd/prodej` náhled/zápis (functions/pd_prodej.mjs,
  lib/pd_prodej.mjs, lib/jadro_pd.cjs), karta Prodej v `src/ui/sod_ui.js`; stav `v.prodano.pipedrive` zapsano/chyba.
- Testy: test_pv_597_zapis 57/0, test_pv_734_autor 51/0, overit_pv_prodej 19/0, mutace [PV] 18/18 chycených,
  kolo `--bez-mutaci --proti origin/claude/integrace-16-10` VŠE ZELENÉ (534/0, hodiny 433/0, S3 SHODA 367/367); sloučeno s 9f2445a.
- Do živého Pipedrive nic. Po nasazení do testu: testovací sezení zkušební zápis na deal TEST (PIPEDRIVE_SPUSTENI A6b, A9).
- Revize Fable (`podklady/revize/REVIZE_PV.md`): V1 (texty krycího listu ze serveru), S1 (převzetí: úmysl před PATCH,
  poznámka při opakování), S2 (výhradní úsek na deal), S3 (limit `/users` ve webhooku), S4 (pevné věty chyb) opraveny;
  mez okna GET–PATCH = B277. Otázky pro J. V.: O1 práva vlastníka-autora, O2 právo pro zápis prodeje (kód podle doporučení).
- Návrhy do roadmapy (revize N1–N6): N1 vypnutý uživatel PD (`active_flag`) jako autor; N2 `pdPoleMapa` v časovém rozpočtu
  zápisu; N3 deal se čte dvakrát (vrátit ho z `pdDealPatriZakazce`); N4 neúspěch kvůli vypnutému zápisu / vazbě nemá psát
  zakázku ani přepsat „zapsano“; N5 řádek logu `pd_prodej` bez osobních údajů; N6 komentář `icoShoda` v `pd_vazba.mjs:53`.

## Dávka MT2 (`claude/mt2-testy`, 24. 11. 2026)

- Nad integrací db1e9e7 (v23.11.7), v24.11.1. Jen testy a nástroje kola (svěřená MT2-1, MT2-2); aplikace beze změny.
- **#737:** mutace „#553: kontakt v odpovědi“ nechycená — test zeslábl po #729 (kontakt = jméno). `test_553_webhook.mjs`
  hlídá jména kontaktů a pole `kontakt` v odpovědích; mutace před 0/1, po 1/1.
- **#738:** sady bz/cn/nn/ra červené 00–01 Praha (datum prodeje v UTC). `netlify/pomoc_den.mjs` (dnesPraha),
  `netlify/pomoc_falesne_hodiny.mjs`, hlídka `test_mt2_pulnoc.mjs`; před 8 FAIL, po 16 OK. Klient bere `objDnes()` — v aplikaci vada není.

## Čeká na J. V.

Otázky průběžně v dialogu, každá s doporučenou variantou (J. V. 18. 11.). Od S6 je zdrojem evidence
(`python3 roadmapa/roadmapa.py --zive`, oddíl „čeká na: J. V.“, a `PREHLED.md`); tabulka níž je přechodná kopie.

| položka | doporučení | poznámka |
|---|---|---|
| Revize diffu S7 (`CLAUDE.md`, rozdělení PREDAVKA) | schválit | seznam přesunů níže |
| Nahrát skill `testovaci-procedura-kng` | podle `podklady/NAVRH_SKILL_TESTOVACI_PROCEDURA.md` | skill není v repu |
| Ruční zkouška víc zákazníků na testu (po sloučení integrace do test) | udělat | vypínač `viceZakazniku` zapíná jen administrátor |
| Ruční zkouška víc šachet na testu se ZAP; rozhodnutí o main | odloženo do 25. 11. | B0.1 „zatím ne“ |
| K40-N1 v testu: ověřit rozdíly cen main × test | J. V. sám (ID vady a popis dotčených kalkulací dodá koordinace) | rychlá cesta do test |
| Kdy sloučit test → main | spojit s rychlou cestou | zbytek po kole 49 |
| B1 pojistka jazyka SoD (K48-N1) | hotovo v C7 #615 (v18.11.7), čeká na sloučení | ruční zkouška na testu: nahrát SoD v5 DE, tisk DE |
| B4 obnova TEST sady (nástroj `test_sada_obnov.mjs`, podle `podklady/NAVOD_TEST_SADA_OBNOVA.md`) | udělat (kolega na testu) | kola běží nad kopií z 2. 11.; K39-I1 |
| B5 SoD projekce v4 v main | udělat (datový úkol J. V.) | main tiskne starší znění smlouvy |
| SoD v5 DE/EN do testu, CN v17 zveřejnit (test i main naráz) | udělat (kolega na testu; main J. V.) | bez toho smlouva DE/EN vyjde česky |
| Otázky k SoD v5: umístění řádků šachet, řádek slevy v rozpisu (doporučeno a), žluté tečky v realizaci, šum kontroly nevyplněných polí | rozhodnout | z integrace v12.11.6 |
| Apps Script kopie na Disk na testu | udělat (kolega) | bez něj otisky nejsou denní |
| Token Pipedrive na test; první zápis poznámky šachet a organizace (K40c N6) nad dealem TEST | udělat nebo odložit s datem | blokuje #510, #16 |
| K40c N5: zakázka bez autora dostane autora z relace prvního ukládajícího (B73) | zvážit nedoplňovat autora u existující zakázky | na později |
| Sazby skladebných můstků (K44-I1) | odložit s datem | sekce Můstky prázdná, cena se nekazí |
| Pole DIČ v Pipedrive | odložit (správce Pipedrive) | oprava firmy DIČ přeskakuje |
| DP #573 termín DPZ, dotazy obchodu D1–D8, T1 | rozhodnout | obsah v artefaktu dotazů |
| GD #578 smlouva | odložit s datem | čeká na vzor smlouvy |
| Zefektivnění programu | start po sloučení do main | `podklady/PROMPT_KOORDINACE_ZEFEKTIVNENI_PROGRAMU.md` |
| Jmenovat kolegu s rolí administrátora | J. V. jmenuje | jen test |
| Netlify testengscalc: kontrola Deploys, když po pushi nenasadí | — | zaznamenáno 4. 11. |

## Trvalé pokyny mimo CLAUDE.md

- **Pipedrive (J. V. 23. 10., 3. a 4. 11.):** Make se pro proces kalkulátor ↔ Pipedrive nepoužívá a v ničem, co jde
  integrátorovi, se nezmiňuje (mluví se o „automatizacích v účtu“). Integraci API koordinuje J. V. v sezení
  „Pipedrive API integrace“ (session_01HpevFD8dLfB4Keo5veExeG); kód jde paralelní větví, slučuje koordinace.
  Kontrola: `git grep -n -i '\bmake\b' -- 'podklady/PIPEDRIVE_*'` nesmí najít nic. #553: podklad odeslán 4. 11.
  (`podklady/PIPEDRIVE_WEBHOOK_553.md`), čeká na pole „Vygenerovat nabídku“, „Odkaz na kalkulaci“ a automatizaci.
- **Víc šachet a víc zákazníků** jsou za vypínači správce (výchozí VYP); klíč `funkce` je výjimkou zálohy (po obnově
  vypnuto). Stabilní API jádra VZ: `src/vice_zakazniku.js` a předávka VZ-E0 v `podklady/predavky/2026-11.md`.
- **Číslování:** roadmapa a meze B — další volná čísla podle `roadmapa/roadmap.json` a `BEZPECNOST_MEZE.md`
  (koordinace drží rezervu, např. B229). Roadmapa obsazená do #643 (#609/#610 `claude/sl-sod-sleva`, #613–#643 S6).

## Další krok

1. Koordinace zreviduje `claude/s7-podklady` a sloučí do integrace (konflikt v `PREDAVKA.md`: předávky dávek
   sloučených mezitím jdou do `podklady/predavky/2026-11.md`, živý stav sem).
2. J. V. nahraje skill `testovaci-procedura-kng`; skill `kalkulator-next-gen` zkrátit do 25 kB (návrh S7, mimo repo).
3. Rychlá cesta K40-N1 do `test` (nad integrací) → J. V. ověří rozdíly cen → do `main` jen na jeho pokyn se sloučením testu.
