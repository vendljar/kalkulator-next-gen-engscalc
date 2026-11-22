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
| `claude/lak-lakovani` | (tato dávka) | v22.11.8 | LAK #666 lakování z nabídky lakovny nad 05a496d, s integrací 36e2681 |

Tagy: jen verze nasazená do `main` (HEAD), mezilehlé ne (J. V. 22. 11.). Kontrola: `python3 nastroje/release_odkaz.py --chybejici`
(22. 11.: žádná — main v19.11.11, tag vydán).

## Běžící dávky

- **LAK #666** (`claude/lak-lakovani`, v22.11.8, nad 05a496d + 36e2681): cena z nabídky lakovny jako částka řádku
  `C.lak.nabidkaKc` (mimo ceník/Nastavení, `RC_CASTKY_RADKU` v `rucni_ceny.js`), ruční cena #561 se zdrojem a potvrzením;
  bez zdroje = nepotvrzená (zábrana, 403). Svěřené LAK-1/LAK-2, otázky #716. Testy `test_666_lakovani` (53 + 31), revize Fable L1/L2 opraveny,
  `overit_lakovani` 13, mutace [LAK] 10/10 + 12/12, kolo proti 36e2681 VŠE ZELENÉ, SHODA 367/367. PG blok přesunut (je v archivu 2026-11).
- **JT #713** (`claude/jt-jazyk-tisku`, prac.): HOTOVO, detail `podklady/predavky/JT_jazyk_tisku.md`.
- **NN** (`claude/nn-nizke-nalezy`, v22.11.10, nad 6d3f3b4): #702 B237–B256, #703 mez, #705, #708, #711, #712, N1, PR-T1/T2; revize Fable R2–R5 (R2 mez → #721), nové #718–#720. Kolo viz CHANGELOG. Detail MEZE oddíl NN.
- **PR #707** (`claude/pr-pripominky`, v22.11.5): Připomínky z aplikace, mez B257, HOTOVO; revize poradce před sloučením. Detail a bezpečnostní rozhodnutí: `podklady/predavky/PR_pripominky.md`.
- **BZ** (`claude/bz-bezpecnost`, v22.11.3, nad cda289e): opravy auditu 20. 11. (rozhodnutí J. V. 21. 11.), #696–#704
  prac. Testy `netlify/test_bz_bezpecnost.mjs`, `test_bz_pipedrive.mjs`, mutace [BZ] 21. **Před sloučením revize Fable.**
  Rozhodnutí v dávce (k revizi): (1) B231: zmrazeny jen příznaky `jenProj`/`jenOck`, pro každou roli, ven = odemčení
  správcem; snímek `zamek.strana` je razítko mimo klíč (drží server); obnova příznak bere ze zálohy; změna strany
  po revizi zmrazena i strana podle čísla (R2). Dotisk nově hlídá i `rucniCenyZamekProblem`. (2) B232: „nesouhlasí“ dál jen
  varuje (B59), neodmítá (#704-2); test P6 v `test_prava` zúžen na texty a klíče bez čísel. (3) B233: Blobs 8.2.0
  nemá podmíněný zápis → `vyhradne` v instanci; mezi instancemi mez (#703). (4) B234: návrh změny = pole `navrhy`
  na kartě (vzor `popisyNavrhy`), převzetí/zamítnutí autor nebo administrátor; „správce“ = role Administrátor;
  historie `zakaznici/h/<klíč>` (50), v záloze (N4) i obnově. (5) B235/B236: jednotný vypínač nebyl → nová proměnná
  Netlify `PIPEDRIVE_ZAPIS=ano` (výchozí VYP, simulátor nehlídá) v `pdZavolej`; vazba dealu (`lib/pd_overeni.mjs`):
  vazba z webhooku / odkaz na kalkulaci / číslo nabídky (pole CN, jinak z názvu); strop 30 nových dealů/h na
  uživatele; dvě zakázky s různým číslem na dealu píše jen ta s číslem dealu; oprava firmy (B209) beze změny
  (#704-4). (6) B195: kód beze změny, ověřeno testem; mez opravena. Upravené cizí testy: `test_koncova_cena` N4,
  `test_vyjimky` B153/B155 (stav „před B231“ zapsán přímo do úložiště), přípravky Pipedrive (deal nese číslo
  nabídky zakázky), `test_vsd_pd_poznamka` 10 (N3 → jedna poznámka).
  Revize Fable: R1–R5 + flake opraveno, #705, #704 (5)(6). PG v archivu.
- **HN** (`claude/hn-harnessy`, v22.11.2, nad cda289e = v19.11.11): jen testy a nástroje kola. #638 harnessy zobrazení /
  záporné bez pauz + test_577 T4 (náhodný token končící X) (příčina: `ADMIN_EMAIL` čtený při importu → `nastroje/harness_prostredi.mjs`), #644 test_vz_unik
  (falešná shoda ceny s razítkem času, ne únik), #646 overit_sod + syntetické šablony (`nastroje/smlouvy_syntet.mjs`),
  #647 případy `k40:*` v porovnání sestavení (+ `podklady/porovnani/ocekavane_k40n1_main_2026-11-21.txt` pro main × test),
  #695 kolo bez playwrightu = chyba s návodem (`KNG_BEZ_PROHLIZECE=1`), `PRESKOCENO_CAST` v souhrnu.
  Statické kontroly nově 10. Svěřená HN-T1/T2. Tabulka S7 přesunuta do archivu `2026-11.md`. Kolo VŠE ZELENÉ (496/0/6, hodiny 401/0/1, 10/10, SHODA 367/367 proti 885577e). HOTOVO, předáno koordinaci.
- **RJ** (`claude/rj-rozhodnuti`, v22.11.7, nad 05a496d, sloučeno s integrací 21eeffa): rozhodnutí J. V. 22. 11. (#704, #706, #709, #710,
  #665 podpis) → roadmapa #714 (dávka), #715 (podpis). (2) nový zámek „nesouhlasi“ → 409 `zamekNesouhlasi` + dialog Ctrl+F5;
  (3) R2 potvrzeno testem; (4) oprava firmy přes `pd_overeni` (409 neovereno); (6)(7) pravidlo 3 zrušeno, druhá zakázka
  na dealu zapisuje s vlastní vazbou, s vypnutým zápisem poznámka varuje; #665 `podpisOtisk` ve snímku + kopie `podpisy/zamek/<otisk>`, GET `?podpisZamku=`;
  #710-4 koordinace 403 u uzavřené správcem; #706 `nastroje/kontrola_konfliktu.sh` (staticke 11). #709 → vlna F (stav
  „odlozeno“ schéma nezná). Testy `netlify/test_rj_rozhodnuti.mjs` + přípravky PD (odkaz místo čísla). Kolo proti 21eeffa
  VŠE ZELENÉ (514/0/6, hodiny 416/0/1, 11/11, SHODA 367/367), mutace [RJ] server 16/16, jádro 5/5. HOTOVO, k revizi.
  v22.11.9 (#717): revize N1 („ceka“), R2 (zrušená vazba), N2, I3; R1 → otázka #718; kolo proti 60086f7 VŠE ZELENÉ, [RJ] 22/22. Mez: „V pořádku“ smí i autor.
- **VZD** (`claude/vzd-drobnosti`, v22.11.1, s integrací 885577e): HOTOVO. Kolo VŠE ZELENÉ (505/0/7, hodiny 410/0/1, 9/9, SHODA 359/359),
  mutace [VZD] jádro 16/16, server 4/4. #674 d a podpis u #665 k potvrzení J. V. Detail v CHANGELOG.

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
