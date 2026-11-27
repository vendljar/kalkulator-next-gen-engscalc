# PREDAVKA — živý stav (18. 11. 2026)

Jen živý stav: větve a verze, běžící dávky, co čeká na J. V., další krok. Nejvýš 15 kB (krok `staticke`).
Předávky dávek: `podklady/predavky/RRRR-MM.md` (nejnovější nahoře). Rozhodnutí J. V.: `podklady/ROZHODNUTI_LOG.md`.
Svěřená rozhodnutí: `podklady/SVERENA_ROZHODNUTI.md`. Pravidla: `CLAUDE.md`.

## Větve a verze

| větev | commit | verze | poznámka |
|---|---|---|---|
| `main` | 4e69c27 | v24.11.7 | ostrý web; víc šachet i víc zákazníků ZAPNUTO správcem (J. V. 25. 11. 15:17, K70-I1) |
| `test` | 694ddee | v26.11.3 | = kandidát plného kola 70 (27. 11.) |
| `claude/integrace-16-10` (integrace) | d77ca6a+ | v26.11.3 | nad test jen dokumenty (seznam kola 70, rozhodnutí); další sloučení = v27.11.N; `main` je předkem |
| `claude/vz-t1` | (tato dávka) | v19.11.2 | VZ T1 #669: řídící varianta a zákazník v hlavičce; s d8e4fc1 a 82cbd72; revize poradce; viz CHANGELOG |
| `claude/vz-f2` | (tato dávka) | v19.11.4 | VZ-F2 #660–#663 + VZF1-I1 nad a3fad44; číslo verze přečísluje koordinace |
| `claude/d3-objednavka-proj` | (tato dávka) | v19.11.11 | D3 #688 Objednávka / Smlouva PROJ nad integrací 042fcbc; číslo verze přečísluje koordinace |
| `claude/np-nahled` | (tato dávka) | v19.11.9 | NP: Kompletní náhled podkladů OCK ve vzhledu Wordu CN v17 (#681 prac.); nad 6092af3 |
| `claude/on-online` | (tato dávka) | v19.11.8 | #ON kdo je online (Nastavení → Uživatelé) nad 042fcbc; verzi přečísluje koordinace |
| `claude/d8-lhuty` | (tato dávka) | v19.11.7 | D8 #677 (pracovní) lhůty PROJ → termíny krycího listu; nad integrací 042fcbc; verzi přečísluje koordinace |
| `claude/rj-rozhodnuti` | (tato dávka) | v22.11.9 | RJ (#714, #715); v22.11.9 revize N1/N2/I3 (#717), sloučeno s 60086f7 |
| `claude/jt-jazyk-tisku` | (tato dávka) | v22.11.6 | JT #713 prac.: jazyk specifikace OCK = Jazyk tisku; nad 05a496d |
| `claude/pr-pripominky` | (tato dávka) | v22.11.5 | PR #707–#712 Připomínky z aplikace, sloučeno s integrací 6fa67af |
| `claude/hn-harnessy` | (tato dávka) | v22.11.2 | HN zpevnění testů kola (#638, #644, #646, #647, #695) nad cda289e; aplikace beze změny; verzi přečísluje koordinace |
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

### MT3 — mutace z Actions #218 (větev `claude/mt3-mutace`, nad a40abbbe, dočasná verze MT3)

- Hotovo, čeká na sloučení koordinací. Jen testy: `netlify/test_vz_organizace.mjs` (E5b P2 — razítko v téže ms),
  `netlify/test_pd_prevod.mjs` (#114 — „0,05 %“ bez slov), `src/test_sablona_obsah.js` (B142 — zpráva věrohodnosti konce).
- Cíleně všechny tři mutace „Chycených 1 z 1“; kolo `--bez-mutaci --proti origin/test` VŠE ZELENÉ, SHODA 395/395.
- Svěřené rozhodnutí MT3-1, roadmapa #829. Pro kolo: verze.txt 27.11.3 + dočasný oddíl CHANGELOG (necommitováno,
  jinak `test_release_odkaz.js` „popis aktuální verze“ FAIL).

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
- **Víc šachet a víc zákazníků** jsou za vypínači správce (výchozí VYP; na main i testu zapnuto J. V. 25. 11.); klíč `funkce` je výjimkou zálohy (po obnově
  vypnuto). Stabilní API jádra VZ: `src/vice_zakazniku.js` a předávka VZ-E0 v `podklady/predavky/2026-11.md`.
- **Číslování:** roadmapa a meze B — další volná čísla podle `roadmapa/roadmap.json` a `BEZPECNOST_MEZE.md`
  (koordinace drží rezervu, např. B229). Roadmapa obsazená do #643 (#609/#610 `claude/sl-sod-sleva`, #613–#643 S6).

## Další krok

1. Koordinace zreviduje `claude/s7-podklady` a sloučí do integrace (konflikt v `PREDAVKA.md`: předávky dávek
   sloučených mezitím jdou do `podklady/predavky/2026-11.md`, živý stav sem).
2. J. V. nahraje skill `testovaci-procedura-kng`; skill `kalkulator-next-gen` zkrátit do 25 kB (návrh S7, mimo repo).
3. Rychlá cesta K40-N1 do `test` (nad integrací) → J. V. ověří rozdíly cen → do `main` jen na jeho pokyn se sloučením testu.
