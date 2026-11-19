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
| `claude/vz-f1` | (tato dávka) | v18.11.8 | VZ-F1 #659 opravy nálezů ruční zkoušky VZ; nad ec5bbac, sloučeno s integrací 41bbe99 |

Tagy: jen pro stav, který jde do `main` (J. V. 18. 11.). Verze pro main bez tagu: `python3 nastroje/release_odkaz.py --chybejici`
(18. 11.: žádná).

## Běžící dávky

- **DO** (`claude/do-dotazy`, v19.11.6, nad 042fcbc): dotazy obchodníků 16. 11. — D1 po celé výšce = jediný pás,
  D2 „bez opláštění" (klíč `bez`) + „do (m)" = 0, D4 montáž pod materiálem + „(MATERIÁL)" (klíč přepisů beze změny),
  D5 materiál nese montáž (příplatky), D6 „uloženo pro všechny…" / „jen pro tuto zakázku" + návrh do číselníku
  (`varianta.popisyNavrhy`, štítek návrh ve sběru), D7 adresa nahoře v seznamu. Cenu nemění; dokumenty jen
  přejmenování. Kolo VŠE ZELENÉ (480/0/7, 389/0/1, 9/9, porovnání 164 SHODA + 195 očekávaných — jen text
  D2/D4), mutace [DO] jádro 20/20, server 2/2. HOTOVO, slučuje koordinace. Otevřené: nové vydání manuálu výpočtu
  (popisek „bez opláštění"), odeslané nabídky drží starý text (zmrazené).
- **R-K50N1 #671** (`claude/r-k50n1`, v19.11.5, nad a018828): editor ceníku (prázdná zahr. statika opláštění =
  zahraniční statické posouzení), upozornění v dialogu zveřejnění, zahr. statika textem → číslo. Test oddíl 6, mutace [K50N1] 5/5 + 3/3. Kolo VŠE ZELENÉ (475/0/7, 386/0/1, 9/9, porovnání 359/359 SHODA). HOTOVO.
- **SP #667** (`claude/sp-statika`, verzi přidělí koordinace): statika opláštění Ano/Ne v zadání šachty
  (`Z.statikaOpl`, chybí = Ano u šachty s opláštěním), vlastní sazba `C.statikaOplKc` (migrace = `statikaKc`), cena
  z nabídky u obou statik zvlášť, nula z nabídky platí u každé položky. Mění cenovou logiku → **revize poradce**.
  Revize poradce N1/N2/N4 a N3 J. V. (cena z nabídky potvrdí obchodník jen se zdrojem, jinak schválení) zapracovány.
  Dorevize R1/R2/R4 (19. 11.): kolo `--bez-mutaci --proti integrace` nad 34f282f sady 467/0/7, hodiny 379/0/1,
  porovnání SHODA 353/353; po posunu verze na v19.11.1 build + statické 9/9 zelené; mutace jádro [SP] 13/13,
  server [SP] 23/23 + #561 19/19. Nad 910315b + 755062d. Audit
  `podklady/AUDIT_CENY_POLOZEK_667.md`, otázka J. V. #668:

  | | cesta / položka | sdílí / chybí | stav |
  |---|---|---|---|
  | A1 | `C.statikaKc` | statika OCK + opláštění | opraveno #667 |
  | A2 | `C.priplatky.madlaBmKc` | madla boky + zadní stěna | J. V. (dop. ponechat) |
  | A3 | `C.leseniFix` | fix lešení vnitřní + vnější, bez ceny z nabídky | J. V. (dop. ponechat) |
  | A4 | `C.profilasKgKc` | profily + sloupy můstků | J. V. (dop. ponechat) |
  | A5–A7 | powertech, `oplechPracKc`, sklo | týž materiál / sazba | ponechat |
  | B1–B2 | spojovací materiál, lakování | souhrn skupiny, bez ceny z nabídky | J. V. (lak: dop. cena z nabídky) |
  | B6 | nulová cena z nabídky | dřív odmítnuta | opraveno #667 |

- **VZ-F2** (`claude/vz-f2`, v19.11.4): #660 IČO nového/změněného zákazníka proti všem (klient hned při úpravě),
  #663 zástupci+DIČ dalšího zákazníka zmrazení po JEHO SoD, hlavičku zmrazí jen SoD řídícímu, #661 KL PROJ v pohledu
  otevřeného zákazníka, #662 `overit_vz_f2.mjs`, VZF1-I1 název plné moci. Kolo VŠE ZELENÉ (475/0/7, 385/0/1, 9/9, SHODA 353/353),
  mutace [VZ F2] jádro 19/19, server 5/5. Detail v CHANGELOG. HOTOVO, slučuje koordinace.

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

## S7: co bylo přesunuto kam

| co (dřív) | kam (teď) |
|---|---|
| `PREDAVKA.md` 557 kB, 202 oddílů (předávky dávek 1. 10.–17. 11. 2026 a stav koordinace 12. 11.) | beze změny textu do `podklady/predavky/2026-11.md` (60 oddílů), `2026-10.md` (143), `2026-09.md` (oddíl „Předchozí stav (30. 9. 2026)“ odtržený od předávky 1. 10.); ověřeno řádek po řádku |
| předávka S3 #611 (přišla se sloučením integrace dcb1678) | nahoru do archivu `2026-11.md`; navržené pravidlo porovnání → CLAUDE.md, Testy |
| stav koordinace 12. 11. (integrace v12.11.3–v12.11.7, pokyny 10. a 11. 11., B0 po kole 47) | archiv `2026-11.md`; platné pokyny → `CLAUDE.md` (Větve, Kdo rozhoduje) a `ROZHODNUTI_LOG.md`; otevřené body → tabulka „Čeká na J. V.“ výš |
| „Pravidla komunikace s integrátorem Pipedrive“ | archiv `2026-11.md` + zkráceně „Trvalé pokyny“ výš + `ROZHODNUTI_LOG.md` |
| datovaná rozhodnutí J. V. v předávkách | `podklady/ROZHODNUTI_LOG.md` (výtah, plné znění v archivu) |
| CLAUDE.md: `test-draft` jako integrační a předávací větev | `ROZHODNUTI_LOG.md` (25. 9., nahrazeno); CLAUDE.md: integrace `claude/integrace-…`, `test-draft` se nepoužívá |
| CLAUDE.md: výjimka `k16-nalezy` (splněno) | `ROZHODNUTI_LOG.md` (25. 9., neplatné) |
| CLAUDE.md: „do `test` jen na pokyn J. V.“ | nahrazeno schváleným „do `test` posílá koordinace po celém zeleném kole“ (pokyny 10. a 11. 11., návrh S7) |
| CLAUDE.md: „ke každé verzi, která má dostat tag, odkaz na release“ | „jen stav pro `main`“ (J. V. 18. 11.); postup s `release_odkaz.py`, `&body=`, kontrolou tagu a `--upravit` zůstal v CLAUDE.md |
| CLAUDE.md: datované závorky (25. 9., 29. 9., 13. 10., 15. 10., W2 20. 10., P2 23. 10., SEC-M1 1. 11., T2 #543 a čísla běhů Actions, K8-W2/W3/W9) | `ROZHODNUTI_LOG.md`; pravidla samotná v CLAUDE.md beze změny |
| CLAUDE.md: důvod předávky (pád 25. 9., 1,58 M tokenů) | `ROZHODNUTI_LOG.md` (25. 9.) |
| CLAUDE.md: body 1–4 Předávacího souboru (číst na `test-draft`, přepisovat celou PREDAVKA, limit 60/75 %, WIP) | CLAUDE.md, Předávací soubor body 1–7 (čte se na integraci; předávka dávky do 3 kB a archiv; limit 60/75 % a WIP beze změny) |
| ponecháno beze změny obsahu | kontrola údajů a hook `pre-push`, zákaz `--no-verify`, mutace po částech, restart kontejneru, N46, mazání větví tlačítkem v Actions, `release_odkaz.py`, pojistka testů, lightweight tagy, 403 z cloudu |
| nové v CLAUDE.md (schváleno 18. 11.) | Rychlá cesta (podle změny zadání J. V. 18. 11.: do test, ne do main), Kdo rozhoduje (s úpravami J. V.; kolegu jmenuje J. V., jen test), stupně kol, automat z testengscalc jen čte, STAV kol v `podklady/kola/`, `NOVINKY.md` po sloučení do main, limit 4 sezení, poradce, `main` předkem integrace |
