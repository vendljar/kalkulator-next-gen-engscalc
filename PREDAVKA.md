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
| `claude/vz-t1` | (tato dávka) | v19.11.2 | VZ T1 #667: řídící varianta a zákazník v hlavičce; s d8e4fc1 a 82cbd72; revize poradce; viz CHANGELOG |
| `claude/vz-f1` | (tato dávka) | v18.11.8 | VZ-F1 #659 opravy nálezů ruční zkoušky VZ; nad ec5bbac, sloučeno s integrací 41bbe99 |

Tagy: jen pro stav, který jde do `main` (J. V. 18. 11.). Verze pro main bez tagu: `python3 nastroje/release_odkaz.py --chybejici`
(18. 11.: žádná).

## Běžící dávky

- **UE #664** (`claude/ue-uzivatele`, v18.11.9, nad integrací 41bbe99): Nastavení → Uživatelé → **Upravit…**
  (titul, jméno, funkce, telefon; e-mail jen ke čtení s vysvětlením). Server beze změny pravidel, razítko `zmenil`
  + seznam polí. Testy `netlify/test_ue_uzivatele.mjs`, `src/test_ue_zpracovatel.js`, matice práv, overit_online/xss,
  mutace [UE]. **Otázka #665 pro J. V.:** dotisk odeslané nabídky bere „Vypracoval“ z přihlášeného účtu — doporučeno
  zmrazit při zámku. Čísla #664/#665 můžou kolidovat se SP (VZ-F1 má do #652). **Kolo `--bez-mutaci --proti origin/test`
  VŠE ZELENÉ** (sady 467/0/7, hodiny 379/0/1, statické 9/9, porovnání 353/353 SHODA). Mutace [UE] server 6/6, jádro 2/2, B148 2/2. HOTOVO, slučuje koordinace.
- **VZ-F1 #659** (`claude/vz-f1`, v18.11.8 — číslo přečísluje koordinace): opravy z `podklady/kola/STAV_TEST_VZ_2026-11-18.md`.
  N3 #653 (vysoká): zástupci a DIČ v krycím listu OCK/PROJ jdou do položky adresáta (`vzKlCesta`, `vzCesta` i pro
  `ZAK.zastupci.*`); #657 KL BO/Tech/PROJ tiskne zástupce i banku/účet/rejstřík (i 1 zákazník — mění text KL);
  N1 #654 stejné IČO odmítnuto (klient + server 400); N2 #655 hlavička jen varianty otevřeného zákazníka; N4 #656 KL
  `…9801.2-C`; #658 controlling `…9801-B` po prodeji; plná moc jen řídící (věta v příručce). Testy `src/test_vz_f1.js`
  49/0 (pojistka na ec5bbac 32 FAIL), `test_vz_server.mjs` 110/0, `overit_vz_tisk` 198/0 (očekávání KL C upraveno).
  Mutace [VZ F1] jádro 17/17, server 4/4; přepsané mutace E1 ×2, E2, K40a D7 ×2. Porovnání sestavení proti test SHODA
  353/353. Kolo `--bez-mutaci`: statické 9/9; 1. běh sady 465/1/7 (`overit_vz_tisk` =
  očekávaný N4, harness upraven) a hodiny 377/1/1 (`test_577_kopie_skript` T4 občasné, samostatně 5× zelené);
  opakované kroky sady 466/0/7 a hodiny +400 dní 378/0/1 zelené. **Před sloučením revize poradce (N3 = únik do SoD).**
  Neřešeno: zástupci dalšího zákazníka se po jeho SoD nezmrazují (zmrazení hlídá jen hlavičku řídícího) — k rozhodnutí.

- **C7 #615 + NS #645** (`claude/c7-sablony`, v18.11.7, nad 9bd6dc8 + sloučená integrace 41bbe99): výroba jazykové verze
  z češtiny zrušena u všech šablon (jen nahraný přeložený soubor); `sablonaJazykPodil` + mez 20 %: smlouvy (SoD, SoD proj.,
  plná moc) nad mezí server nezveřejní/nevrátí a klient nevytiskne, CN jen upozornění. Ověřeno na textech z Disku
  (SoD v5 DE 2,8 %, CN v17 DE 0,7 %, SoD proj. v4 DE 3,1 %; DE z české SoD v5 85 % → neprojde). NS: šablony pod přepínačem
  OCK | PROJ (filtr beze změny). Mutace [C7] jádro 7/7, server 5/5. **Kolo `--bez-mutaci --proti origin/test` nad 6ed6f8d VŠE ZELENÉ** (sady 465/0/7, hodiny 377/0/1, statické 9/9, porovnání 353/353 SHODA).
  Pozor při slučování s SL: v `src/sod.js` změněna jen `sodJazykZabrana`. Firemní .docx nebyly v kontejneru (KNG_PODKLADY
  chybí) — test s podklady v `netlify/test_sablony.mjs` se přeskočí; hledá i `Sablona_SOD_REALIZACE_v5_DE_z_cestiny.docx`.
- Starší sloučené dávky 18. 11. (S6+S8, S7, SL, rychlá cesta K40-N1) → `podklady/predavky/2026-11.md`.

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
