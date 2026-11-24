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
| `claude/r3-pole-wordu` | (tato dávka) | — | R3 #751 zákaz dalších polí Wordu nad 3cab0c5 (v24.11.2); verzi přidělí koordinace |
| `claude/zk-zakaznici-ze-zakazek` | (tato dávka) | — | ZK #755 zákazníci ze zakázek podle ARES (nástroj správce) nad c89e872 (v24.11.5); revize Fable; verzi přidělí koordinace |

Tagy: jen verze nasazená do `main` (HEAD), mezilehlé ne (J. V. 22. 11.). Kontrola: `python3 nastroje/release_odkaz.py --chybejici`
(22. 11.: žádná — main v19.11.11, tag vydán).

## Běžící dávky

24. 11. 2026 odpoledne: RP (#736/#740, opravy po revizi Fable). Sloučené dávky PV, MT2, UT (v24.11.2), R3 (v24.11.3), DT (v24.11.4) a K54-N1 (v24.11.5, rychlou cestou v test 6722ad9) — předávky v `podklady/predavky/2026-11.md`. Kokpit koordinace: https://claude.ai/artifact/LLLBVLxKcWDHhd8axapiU2

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

## Dávka ZK (24. 11. 2026) — #755 zákazníci ze zakázek podle ARES

Větev `claude/zk-zakaznici-ze-zakazek` nad `c89e872`. Nic na weby, do Pipedrive ani na Disk; ARES jen zástupný fetch.
- **Hotovo:** Zákazníci → „Naplnit ze zakázek (ARES)…“ (jen admin). Server `/api/zakaznici-ze-zakazek`
  (`functions/zakaznici_ze_zakazek.mjs`, logika `lib/zakaznici_ze_zakazek.mjs`): náhled po kouscích (zakázky →
  seskupení podle IČO → ARES jen pro IČO bez karty, 10/volání, pauza 400 ms, 600/náhled, 1 500/den), zápis po
  potvrzení ze serverového náhledu s novým ověřením zakázky, protokol bez osobních údajů. UI `src/ui/zakaznici_ui.js`.
- **Testy:** `netlify/test_zk_zakaznici_ze_zakazek.mjs` 73 OK, `overit_zk_zakaznici.mjs` 15 OK, `test_prava.mjs`
  a `test_zalohy.mjs` N4 doplněny; mutace [ZK] MUTACE_PREDAVKA; kolo `--bez-mutaci --proti origin/claude/integrace-16-10` KOLO_PREDAVKA.
- **Pro J. V. (k vědomí / rozhodnutí):** (1) úložiště `zakaznici_hromadne` (náhled, denní počítadlo, protokol) je
  **výjimka ze zálohy** — doporučení: ponechat (karty samy se zálohují); (2) diakritika v názvu se při shodě
  s ARES **nezahazuje** („Novy dum“ ≠ „Nový dům“ → nesedí) — doporučení: ponechat přísně, takové položky založit ručně;
  (3) DIČ karty je výhradně z ARES (neplátce = prázdné, i když zakázka DIČ má) — doporučení: ponechat.
- **Další krok:** revize Fable (bezpečnost: role, únik dat, meze ARES — `BEZPECNOST_MEZE.md` oddíl ZK) → sloučení
  koordinací; spuštění na testu testovací sezení, na ostrém J. V.

## Další krok

1. Koordinace zreviduje `claude/s7-podklady` a sloučí do integrace (konflikt v `PREDAVKA.md`: předávky dávek
   sloučených mezitím jdou do `podklady/predavky/2026-11.md`, živý stav sem).
2. J. V. nahraje skill `testovaci-procedura-kng`; skill `kalkulator-next-gen` zkrátit do 25 kB (návrh S7, mimo repo).
3. Rychlá cesta K40-N1 do `test` (nad integrací) → J. V. ověří rozdíly cen → do `main` jen na jeho pokyn se sloučením testu.
