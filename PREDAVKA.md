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
| `claude/hn-harnessy` | (tato dávka) | v22.11.1 | HN zpevnění testů kola (#638, #644, #646, #647, #695 prac.) nad cda289e; aplikace beze změny; verzi přečísluje koordinace |
| `claude/pg-tisk` | (tato dávka) | v19.11.10 | PG #684–#687 nad integrací 042fcbc; čísla a verzi přečísluje koordinace |

Tagy: jen pro stav, který jde do `main` (J. V. 18. 11.). Verze pro main bez tagu: `python3 nastroje/release_odkaz.py --chybejici`
(18. 11.: žádná).

## Běžící dávky

- **HN** (`claude/hn-harnessy`, v22.11.1, nad cda289e = v19.11.11): jen testy a nástroje kola. #638 harnessy zobrazení /
  záporné bez pauz + test_577 T4 (náhodný token končící X) (příčina: `ADMIN_EMAIL` čtený při importu → `nastroje/harness_prostredi.mjs`), #644 test_vz_unik
  (falešná shoda ceny s razítkem času, ne únik), #646 overit_sod + syntetické šablony (`nastroje/smlouvy_syntet.mjs`),
  #647 případy `k40:*` v porovnání sestavení (+ `podklady/porovnani/ocekavane_k40n1_main_2026-11-21.txt` pro main × test),
  #695 (prac.) kolo bez playwrightu = chyba s návodem (`KNG_BEZ_PROHLIZECE=1`), `PRESKOCENO_CAST` v souhrnu.
  Statické kontroly nově 10. Svěřená HN-T1/T2. Tabulka S7 přesunuta do archivu `2026-11.md`. Kolo VŠE ZELENÉ (496/0/6, hodiny 401/0/1, 10/10, SHODA 367/367 proti 885577e). HOTOVO, předáno koordinaci.
- **PG** (`claude/pg-tisk`, v19.11.10, nad 042fcbc): #684 tlačítka tisku CN OCK (náhled podkladů → Word modře → náhled
  a tisk), #685 vlastní řádek TS v SOUČÁSTÍ DODÁVKY NENÍ (`extra[i].sekce='neni'`), #686 DALŠÍ UJEDNÁNÍ v nabídce PROJ
  (`PJ.dalsiUjednani`, Word přes šablonu PROJ v9 `--proj-v9`, kontrola `dalsiUjednaniWordProj`), #687 číslo stránky: vada šablony CN v9–v17 (pevná „1“ v záhlaví) → `--cn-v18`,
  upozornění v průvodci šablon (`docxCisloStranky`). Testy `test_pg_*.js`. Kolo `--bez-mutaci --proti integrace`
  VŠE ZELENÉ (sady 482/0/7, hodiny 392/0/1, statické 9/9, porovnání SHODA), mutace jádra [PG] 16/16. HOTOVO, předáno koordinaci.
  Šablony PROJ v9 a CN v18 vyrobí a nahraje J. V. (`podklady/SABLONA_PROJ_V9_19_11.md`, `SABLONA_CN_V18_19_11.md`).

  | | cesta / položka | sdílí / chybí | stav |
  |---|---|---|---|
  | A1 | `C.statikaKc` | statika OCK + opláštění | opraveno #667 |
  | A2 | `C.priplatky.madlaBmKc` | madla boky + zadní stěna | J. V. (dop. ponechat) |
  | A3 | `C.leseniFix` | fix lešení vnitřní + vnější, bez ceny z nabídky | J. V. (dop. ponechat) |
  | A4 | `C.profilasKgKc` | profily + sloupy můstků | J. V. (dop. ponechat) |
  | A5–A7 | powertech, `oplechPracKc`, sklo | týž materiál / sazba | ponechat |
  | B1–B2 | spojovací materiál, lakování | souhrn skupiny, bez ceny z nabídky | J. V. (lak: dop. cena z nabídky) |
  | B6 | nulová cena z nabídky | dřív odmítnuta | opraveno #667 |

- **D3 #688** (`claude/d3-objednavka-proj`, v19.11.11, nad 042fcbc): nový dokument „Objednávka / Smlouva“ PROJ
  (`src/objednavka_proj.js`, `src/ui/objednavka_proj_ui.js`; karta v KL PROJ pod SoD PROJ; tisk/PDF + Word bez šablony;
  číslo CN → OBJ; ceny = nabídka PROJ). Sdílené soubory jen po řádku: `build.py`, `kryci_proj_ui.js` (karta),
  `vice_zakazniku.js` (vzTypProj), `kontroly.js` (strana), `plan_plateb_ui.js` (brána), `nazvy_souboru.js` (druh).
  Rozhodnutí J. V. #689 zapracována (pole KL PROJ „Číslo zakázky“, jen z odeslané CN, rozvržení podle vzoru).
  Kolo `--bez-mutaci --proti integrace` VŠE ZELENÉ (479/0/7, hodiny 388/0/1, 9/9, SHODA 359/359), mutace jádra [D3] 12/12. HOTOVO.
- **VZ-F2** (`claude/vz-f2`, v19.11.4): #660 IČO nového/změněného zákazníka proti všem (klient hned při úpravě),
  #663 zástupci+DIČ dalšího zákazníka zmrazení po JEHO SoD, hlavičku zmrazí jen SoD řídícímu, #661 KL PROJ v pohledu
  otevřeného zákazníka, #662 `overit_vz_f2.mjs`, VZF1-I1 název plné moci. Kolo VŠE ZELENÉ (475/0/7, 385/0/1, 9/9, SHODA 353/353),
  mutace [VZ F2] jádro 19/19, server 5/5. Detail v CHANGELOG. HOTOVO, slučuje koordinace.
- **NP #681** (`claude/np-nahled`, v19.11.9, nad 6092af3): „Kompletní náhled podkladů" = dokument ve vzhledu Wordu CN v17
  (`src/nahled_word.js`, `src/ui/nahled_word_ui.js`): stránky A4, záhlaví/zápatí, pořadí Wordu, **řádek slevy** (oprava
  nálezu), příplatky za cenou, pruh (Jazyk tisku, upozornění, Word se zábranami). Data jako Word, cenu ani Word nemění.
  Pojistka shody `test_np_nahled_word.js` (náhled = text Wordu ze syntetické CN v17), `test_np_okno.js`,
  `overit_np_nahled.mjs`, snímky `podklady/kola/np_nahled_2026-11-19/`. Nález #682 (prac.): cizojazyčný Word nechá
  prázdný pruh sekce — čeká na J. V. Kolo `--bez-mutaci --proti integrace` VŠE ZELENÉ (483/0/7, hodiny 391/0/1,
  statické 9/9, porovnání SHODA 359/359), mutace [NP] 16/16 + VZ-E2 1/1. Testovací sezení: porovnat s Wordem z pravé CN v17.
- **ON** (`claude/on-online`, v19.11.8, nad 042fcbc): čas poslední aktivity (jen čas, 1×/min, best-effort, úložiště
  `aktivita` mimo zálohu), výpis jen správci, sloupec „Naposledy aktivní“ se zelenou tečkou. Testy test_on_aktivita,
  test_prava #ON, test_on_naposledy, overit_on_online; mutace [ON] 11/11. Kolo 480/0/7, 9/9, SHODA 359/359, hodiny 389/0/1 (na 2. pokus; občasné selhání test_vz_unik). Mez B — návrh v BEZPECNOST_MEZE.md. HOTOVO.
- **D8 #677** (`claude/d8-lhuty`, v19.11.7, nad 042fcbc): tabulka lhůt PROJ v Nastavení → Firma (zveřejní se s firmou),
  čísla v textu termínů nabídky PROJ z tabulky (online i Word, 4 jazyky; s výchozí tabulkou beze změny), po Prodáno
  dopočet termínů krycího listu PROJ (řetěz, horní mez, 4,3 t/měsíc, ruční přednost, ↺, zdroj u data), lhůty zamrzne
  prodej. Šablona v8 pevné týdny nemá → nová šablona netřeba. Otázky J. V. #678 (pracovní). Kolo VŠE ZELENÉ (427/0/59, 389/0/1, 9/9, SHODA 359/359), mutace [D8] 19/19 + 6/6. HOTOVO.

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
