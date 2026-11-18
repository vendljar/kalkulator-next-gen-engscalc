# Návrh: režie vývoje Kalkulator Next Gen (18. 11. 2026)

Režim: jen analýza a návrh. Nic nebylo změněno, pushnuto, zapsáno na Disk ani založeno.
Období měření: 4. 11. – 18. 11. 2026 (14 dní).

## Úvod

### Hlavní zjištění

1. **K40-N1 nečeká na schopnost vydávat, ale na to, že je přibalená k velké dávce.** Main se za 14 dní posunul čtyřikrát (4. 11., 5. 11., 7.–10. 11., 11. 11.). Oprava K40-N1 je jeden commit o 5 souborech z 11. 11. 11:09 UTC a na dnešní main jde přenést bez konfliktu. Přesto v main není: 7 dní čekala na pokyn ke spuštění (pořadí „K40 až po víc šachet“), od 12. 11. čeká v testu na zralost všeho ostatního.
2. **Cenovou vadu nenašlo žádné ze sedmi porovnávacích kol.** K40-N1 našel rozbor kódu (kolo 40). Kola 41–47 ji ve vzorku 50–359 kalkulací neviděla, ukázala se až v cílené sadě kola 48. Druhý nález období (K48-N1) je vada nahraných šablon.
3. **Ruční práce J. V. je hlavně přenos a klikání:** 9 testovacích kol spuštěných ručně, 27 souborů nahraných na Disk v 11 dávkách, 31 vydaných tagů, 17 otázek B, 6 sezení čekajících na odpověď. Odhad celkem kolem 230 min týdně (jednotkové časy jsou odhad, viz S2).
4. **Startovní podklady neodpovídají praxi.** `PREDAVKA.md` má 557 kB (asi 148 tis. tokenů) a celá se přečíst nedá. `CLAUDE.md` jedenáctkrát jmenuje `test-draft`, která stojí od 25. 10.; o integrační větvi, kokpitu a poradci neříká nic.
5. **Zálohy na Disku nejsou denní.** Za 4.–17. 11. je tam 4× otisk main a 6× otisk test. Noční porovnání z nich napájet zatím nejde.

### Zdroje

| Zdroj | Co z něj je |
|---|---|
| git, `origin/main` 6c4bc80 (v11.11.1), `origin/test` 8462aea (v12.11.7), `origin/claude/integrace-16-10` 5e21f89 (v18.11.2) | sloučení, větve, tagy, velikosti souborů |
| Disk, složka Testovani | `STAV_KOLO40` až `STAV_KOLO48`, `VYHODNOCENI_TESTU_KOLO48…xlsx`, `PROMPT_RIDICI_SEZENI_PO_KOLE47.md` a `…48.md`, metadata souborů |
| Disk, složka záloh | názvy a data souborů `otisk_main_…`, `otisk_test_…` |
| `list_sessions` (children) koordinace session_01TMQ5bLDJuS5k5NWWYy7jLx | 100 nejnovějších podřízených sezení, sahá do 26. 10. |
| `PREDAVKA.md`, `CLAUDE.md`, `CHANGELOG.md`, `roadmapa/roadmap.json`, `.github/workflows/*`, `nastroje/*` na integrační větvi | pravidla, trvání kol, evidence |
| skilly `kalkulator-next-gen`, `roadmapa-kng`, `testovaci-procedura-kng`, `kokpit-koordinace` | velikost a aktuálnost |

### Co se nepodařilo ověřit

- **Trvání a náklad testovacího kola cenových nabídek.** STAV soubory čas neuvádějí a testovací sezení běží v jiném projektu, kam nevidím.
- **Skutečný čas J. V.** Počty úkonů jsou změřené, minuty na úkon jsou můj odhad.
- **Obsah dotazů obchodu D1–D8 a T1 a „DP #573 termín DPZ“.** Jsou v artefaktu dotazů, který nebyl mezi povolenými zdroji.
- **Zda oprava K40-N1 přenesená na main projde testy.** Ověřeno je jen, že se přenese bez konfliktu (`git merge-tree`, strom 1078161); testy jsem nepouštěl.
- **PLAN_ROADMAP.md.** Na Disku je jen 9 kopií z července (nejnovější `PLAN_ROADMAP_v30.7.13.md`, 1. 8.), ve složce Testovani žádná.
- **Zda se workflow Testy dnes spouští ručně nad větvemi.** Soubor to umožňuje (`workflow_dispatch`), použití jsem nedohledával.

---

## S1 Cesta oprav do main (přednostně)

### (a) Zjištění

**Časová osa K40-N1**

| Datum | Událost | Zdroj |
|---|---|---|
| 4. 11. | Nález v kole 40 (rozbor kódu testu v4.11.3), vážnost střední | `STAV_KOLO40` |
| 4. 11. 16:01 | `PROMPT_K40_OPRAVY.md` na Disku (19,4 kB, 17 nálezů v jedné dávce) | metadata Disku |
| 4. 11. 16:07 – 10. 11. 14:13 | Sezení „K40 — PŘÍPRAVA“ čeká 142 h na pokyn „SPUSŤ K40“ | `list_sessions` |
| 10. 11. | Pokyn J. V.: K40 až po víc šachet | PREDAVKA koordinace, ř. 1522+ |
| 11. 11. 05:56 | Main posunut na v11.11.1 (víc šachet), bez opravy | `git log origin/main`, PREDAVKA |
| 11. 11. 11:09 | Commit opravy b4e2023: 5 souborů, +328 −12, z toho 245 řádků nový test | `git show --stat b4e2023` |
| 12. 11. | K40a po revizi sloučeno do integrace v12.11.3 a do testu | PREDAVKA koordinace |
| 16. 11. | Kolo 48 potvrdilo opravu v testu; main vadu nese | `STAV_KOLO48` |
| 18. 11. | Stále jen v testu: 14 dní od nálezu, 7 dní od commitu opravy | `git log` |

**Dopad vady:** u 7 z 308 kalkulací kola 48 dá main nabídku o 12–45 tis. Kč vyšší (přepnutý typ šachty a vyřazené čelní sklo). Zdroj: `STAV_KOLO48`.

**Vydávání do main funguje.** Main se posunul 4× za 8 dní:

| Datum | Main | Zdroj |
|---|---|---|
| 4. 11. | v27.10.6 → v4.11.4 | `STAV_KOLO42` |
| 5. 11. | v4.11.8 | PREDAVKA koordinace („test = main = v4.11.8“) |
| 7.–10. 11. | v6.11.5 | `STAV_KOLO46` |
| 11. 11. | v11.11.1 | PREDAVKA koordinace |

Od 11. 11. main stojí 7 dní.

**Rozjetí test × main dnes:**

| Míra | Hodnota | Zdroj |
|---|---|---|
| Commity v testu navíc proti main | 85 | `git rev-list --count origin/main..origin/test` |
| Commity jen v main | 0 (main je předek testu) | `git rev-list --count origin/test..origin/main` |
| Rozdíl main × test | 118 souborů, +9 508 −699 | `git diff --shortstat` |
| Rozdíl main × integrace | 226 souborů, +26 745 −945 | `git diff --shortstat` |
| Commity v integraci navíc proti testu | 120 (víc zákazníků VZ, C9) | `git rev-list --count` |

**Proč main stojí:** test nese změny závislé na šablonách (CN v17, SoD v5) a nález K48-N1 (SoD v5 DE/EN převážně česky, 110 ze 143 řádků). Prompt po kole 48 navrhuje sloučit až po opravě K48-N1 a kole 49. Mezitím do integrace přibylo víc zákazníků (v16.11.1–v18.11.2).

**Proveditelnost rychlé cesty u K40-N1:** rodič opravy (c664c9e) je předkem main. Přenos commitu b4e2023 na main nemá konflikt.

### (b)–(c) Varianty

| | 0: nechat jak je | A: rychlá cesta pro vady ceny a dokumentu | B: týdenní vydání zeleného |
|---|---|---|---|
| Popis | Vše jde test → main najednou, když J. V. řekne | Malá větev `claude/rychla-…` z main, jen oprava a její test; cílené kolo main-před × main-po; po pokynu J. V. sloučit do main a týž den zpět do integrace | Pevný den v týdnu: co je zelené a za vypínačem, jde po kole main-před × main-po do main |
| Čas J. V. | beze změny | +5 min na opravu (jedno rozhodnutí „slouč“); odhad 0 až +10 min/týden | −10 min/týden (méně rozhodování kdy), odhad |
| Rychlost opravy do main | K40-N1: 14+ dní | 1–2 dny od nálezu | nejvýš 7 dní po dokončení; nedokončené šablony ji dál zdrží |
| Jistota ceny a dokumentů | známá vada žije v main | vyšší: změna je malá, rozdíl main-před × main-po smí ukázat jen případy vady | stejná jako dnes, pokud kolo před main zůstane plné |
| Objem testování | 1 plné kolo na sloučení | navíc na každou opravu: kolo `--bez-mutaci` (27–32 min, CHANGELOG ř. 887, 915, 1198), cílené mutace, cílené porovnání; celé mutace v Actions | 1 plné kolo týdně |
| Rozjíždění test × main | roste (dnes 85 commitů) | main dostane commit, který v testu je jinou cestou; hlídat pravidlem „main je předek integrace“ | klesá, main nejvýš týden pozadu |
| Riziko | vada v nabídkách zákazníkům | dvojí verze téhož commitu, kolize čísel verzí a CHANGELOG při zpětném sloučení | do main jde i velká funkce; spoléhá na vypínače |

**K objemu testování u A.** Workflow Testy dnes běží jen po pushi do main a ručně (`on: push: branches: [main]`, `workflow_dispatch`). Celé mutace tedy proběhnou až po nasazení. Ruční spuštění téhož workflow nad větví rychlé opravy před sloučením dá celé mutace (16 + 3 části, limit 100 min) bez času sezení a bez limitu účtu.

**K rozjíždění u A.** Stačí tři pravidla:
- oprava se píše nad main a do integrace se dostane sloučením main, ne druhým psaním;
- číslo verze přidělí koordinace a další verze integrace je vyšší;
- statická kontrola hlídá, že `git rev-list --count integrace..main` je 0.

**B samotné K40-N1 neřeší.** Týdenní rytmus v praxi už běžel (4 nasazení za 8 dní) a oprava přesto v main není, protože nebyla hotová samostatně.

### (d) Co se změní

- **CLAUDE.md:** nový oddíl „Rychlá cesta“ (text níže).
- **PREDAVKA koordinace:** řádek „vady ceny a dokumentu v main: ID, od kdy, stav rychlé cesty“.
- **Skill `testovaci-procedura-kng`:** stupeň „cílené kolo main-před × main-po“.
- **Nástroje:** `nastroje/porovnej_sestaveni.mjs` (dvě sestavení nad stejnou sadou, výpis rozdílů cen bez částek z ceníku). Dnes neexistuje; `nastroje/` má jen `test_sada_jadro.mjs`, zlaté sady a fuzz.
- **Testy:** statická kontrola „main je předek integrace“ v `testovaci_kolo.sh` (krok `staticke`), s pojistkou.
- **Workflow:** žádná změna souboru, jen ruční spouštění nad větví.

### (e) Doporučení

**Varianta A, B ponechat jako měkký rytmus v okně podle S4.** První použití: K40-N1 (commit b4e2023 nad main). Sloučení do main dál jen na pokyn J. V. a po kole main-před × main-po.

---

## S2 Přenos mezi sezeními

### (a) Zjištění: ruční úkony J. V. za 14 dní

| Úkon | Počet za 14 dní | Za týden | Zdroj |
|---|---|---|---|
| Testovací kola spuštěná ručně v jiném projektu | 9 (kola 40–48, 4.–16. 11.) | 4,5 | STAV soubory |
| Soubory nahrané do složky Testovani | 27 v 11 dávkách | 5,5 dávky | `createdTime` na Disku |
| Prompty přenesené z testovacího sezení do koordinace | 4 (K40, Zefektivnění, po kole 47, po kole 48) | 2 | Disk, `podklady/` |
| Vydané tagy (klik na odkaz releasu) | 31 (v4.11.1 – v12.11.7) | 15,5 | `git ls-remote --tags` |
| Otázky B z řídicích promptů | 17 (B1–B10 po kole 47, B1–B7 po kole 48) | 8,5 | oba prompty |
| Podřízená sezení čekající na J. V. (`need_input`) | 6 ze 49, z toho 1 dosud `blocked` | 3 | `list_sessions` |
| Místa „Na J. V.“ / „Otevřené pro J. V.“ / „k potvrzení“ v předávkách | 10 / 3 / 3 ve 43 oddílech | 8 | PREDAVKA ř. 1–1600 |
| Pokyny k posunu main | 4 | 2 | viz S1 |
| Datové úkoly (šablony CN v16, CN v17, SoD v5, ceník testu, zapnutí funkce) | nejméně 5 | 2,5 | STAV 46–48, prompt po kole 48 |

**Kopie stavu:** STAV 44 a 45 byly nahrány společně 10. 11. 13:32, STAV 46 a 47 společně 11. 11. 11:31. Koordinace je tedy viděla až 4 dny po kole 44. `PROMPT_RIDICI_SEZENI_PO_KOLE47.md` je na Disku i v `podklady/`.

**Čekání sezení na J. V.:**

| Sezení | Čekalo |
|---|---|
| K40 — PŘÍPRAVA | 142 h |
| Poradce — plán dávek po kole 47 | 121 h, dosud `blocked` |
| Poradce — víc zákazníků (návrh) | 117 h |
| C2+C3 SoD v5 | 21 h |
| C1 CN v17 | 18 h |

**Odhad času J. V.** (jednotkové časy jsou můj odhad, neověřeno):

| Úkon | Odhad na úkon | Min/týden |
|---|---|---|
| Spuštění kola a předání výsledku | 10 min | 45 |
| Nahrání dávky souborů | 5 min | 28 |
| Přenos promptu | 10 min | 20 |
| Klik na release | 1 min | 15 |
| Odpověď na otázku (asi 20 týdně) | 3 min | 60 |
| Datový úkol | 20 min | 50 |
| Rozhodnutí o main | 5 min | 10 |
| **Celkem** | | **asi 230** |

### (b)–(c) Varianty

| | 0: nechat | A: koordinace pouští i testovací kola | B: stav na jednom místě |
|---|---|---|---|
| Popis | Testovací sezení ručně, STAV přes Disk | Koordinace zakládá testovací sezení sama (`create_session`), dá mu prompt a čte výsledek; J. V. dostane jen souhrn | STAV se zapisuje jen do repa (`podklady/kola/STAV_KOLOnn.md`, pevný název), Disk dostane nanejvýš xlsx |
| Čas J. V. | 230 min/týden | −60 až −90 min/týden (kola, přenos promptů, nahrávání) | −20 min/týden |
| Rychlost oprav | výsledek kola s prodlevou až 4 dny | výsledek do hodin | výsledek hned v gitu |
| Jistota | plná kola nad živým webem v prohlížeči J. V. | stejná u výpočtu nad sestavením; nižší u toho, co je jen v živém prostředí (zveřejněné šablony, ceník), dokud automat nemá přístup | stejná |
| Riziko | — | automat potřebuje čtecí přístup k testu a main; limit účtu 5 h | STAV v repu nesmí nést ceny (dnes je nenese) |

**Co A dnes umí a co zbývá:**
- Umí: zakládat sezení, posílat zprávy, číst výsledky, slučovat, pouštět `testovaci_kolo.sh`.
- Zbývá: porovnání test × main nad živými daty. Testovací sezení pracuje v přihlášeném prohlížeči J. V. („Obě záložky jsem znovu načetl“, `STAV_KOLO42`) a stahuje ceník a šablony obou prostředí. Cloudové sezení tento přístup nemá.
- Bez přístupu jde hned: porovnání dvou sestavení nad TEST sadou z repa nebo Disku, fuzz 600, zlaté sady, tok Word se šablonami z `KNG_PODKLADY`.

### (d) Co se změní

- **CLAUDE.md:** kdo zakládá testovací kolo, kam se píše STAV.
- **Skill `testovaci-procedura-kng`:** přepsat. Dnes popisuje stav ze srpna (25 harnessů, mutace 52 a 71, zdrojáky ze zipu na Disku), kola běží nad 89 harnessy a gitem.
- **Nástroje:** `porovnej_sestaveni.mjs` (společné se S1), šablona promptu testovacího kola v `podklady/`.
- **Prostředí:** čtecí přístup k testu jako tajemství prostředí (rozhodnutí J. V., otázka 2).

### (e) Doporučení

**A po částech, B hned.** Nejdřív STAV do repa a kola nad sestavením pouštěná koordinací; kola nad živým prostředím zůstanou J. V. do rozhodnutí o přístupu.

---

## S3 Testovací kola podle rizika

### (a) Zjištění

| Kolo | Datum | Rozsah | Nový nález |
|---|---|---|---|
| 40 | 4. 11. | rozbor kódu, 4 revize | **K40-N1 (cena)** a 16 dalších (S1, X1–X5, N2–N5, T1–T3, P1, W1) |
| 41 | 4. 11. | 50 nabídek | žádný |
| 42 | 4. 11. | 50 nabídek po nasazení | žádný |
| 43 | 5. 11. | 209 kalkulací | žádný ve výpočtu (K43-I1 info, K43-T1 harness) |
| 44 | 6. 11. | 259 | žádný (K44-I1 info) |
| 45 | 10. 11. | 309 | žádný |
| 46 | 10. 11. | 359, po nasazení | žádný ve výpočtu (K46-I1 nadpisy DE) |
| 47 | 11. 11. | 284 + 40 víc šachet | žádný ve výpočtu (K47-I1, I2 k rozhodnutí) |
| 48 | 16. 11. | 308 + 40 | **K48-N1 (dokument)** |

Zdroj: `STAV_KOLO40`–`48`.

- **Vadu s dopadem na cenu nebo dokument našla 2 kola z 9.** Sedm kol stav potvrdilo; dvě z nich (42, 46) byla povinná ověření po nasazení do main.
- **K40-N1 nenašlo porovnání, ale rozbor kódu.** Kolo 41 výslovně: „V tomto vzorku se neprojevilo.“ Ukázala ji až cílená sada C01–C24 v kole 48.
- **Trvání kola cenových nabídek: neověřeno.** Nepřímo: STAV 41 a 42 byly nahrány 12 minut po sobě (4. 11. 14:55 a 15:07), tři kola proběhla v jednom dni.
- **Trvání kola v repu:** `--bez-mutaci` 27–32 min; celé kolo s mutacemi 224 min (CHANGELOG ř. 5797); mutace serveru se do 2 h úlohy nevejdou (CLAUDE.md).
- **Limit účtu** zastavil souběžná sezení 11. 11. 14:38 (PREDAVKA koordinace) a 16. 11. (sezení VZ-E3 skončilo `failed`).

**Noční otisky.** Za 4.–17. 11. je na Disku:

| Prostředí | Dny s otiskem | Velikost |
|---|---|---|
| main | 6., 10., 11., 16. 11. (4 dny) | 52–55 MB |
| test | 5., 10., 11., 12., 16. 11. (5 dní; s 3. 11. šest souborů) | 27 MB |

Soubory mají v názvu `_0300`, ale vznikly mezi 8. a 14. hodinou UTC, tedy při přihlášení uživatele. Skript Apps Script (#577) není nasazený; je mezi čekajícími úkoly.

**GitHub Actions.** Repozitář je veřejný (`roadmapa/README.md` ř. 40). Otisk main nese ostrá data a ceník. Do veřejného workflow s veřejnými logy nepatří.

### (b)–(c) Varianty

| | 0: plné kolo po každé změně testu | A: stupně podle rizika | B: A + noční porovnání |
|---|---|---|---|
| Popis | jako dnes, 4,5 kola týdně | Stupeň 1 po každé dávce: `testovaci_kolo.sh` a porovnání sestavení nad pevnou sadou (automat). Stupeň 2 cílené: sada na změněnou oblast. Stupeň 3 plné: jen před main (main-před × main-po) a po nasazení | navíc každou noc porovnání main × test nad TEST sadou a fuzz v Actions bez ostrých dat; výsledek do `podklady/kola/NOC_RRRR-MM-DD.md` |
| Čas J. V. | 45 min/týden na kola | −20 až −30 min/týden | stejné jako A |
| Rychlost oprav | kolo čeká na J. V. | cílené kolo do hodiny po dávce | regrese viditelná do rána |
| Jistota | vysoká, ale náhodný vzorek vadu K40-N1 minul | stejná před main; cílené sady míří tam, kde se měnilo | vyšší: denní důkaz, že se main a test liší jen čekaně |
| Riziko | — | mezi plnými koly unikne vada, kterou nevidí jednotkové sady ani pevná sada | noční běh nevidí živý ceník a zveřejněné šablony; falešný klid |

**Noční porovnání z otisků bez sezení:** zatím ne. Důvody:
1. otisky nejsou denní;
2. otisk main má 52–55 MB a ostrá data, do veřejných Actions nesmí;
3. zda ho cloudové sezení přes konektor Disku vůbec stáhne, je neověřeno.

Proveditelná náhrada: Actions na plán (`schedule`) nad sestavením `main` a `test` se zkušebním ceníkem a TEST sadou bez ostrých údajů. Otisky dál hlídá ranní trigger přes metadata.

### (d) Co se změní

- **CLAUDE.md, oddíl Testy:** tři stupně a kdy který.
- **Skill:** nová kapitola „stupně kol“, sada kalkulací jako soubor v repu (jen pokud nenese ceny; ověřit `kontrola_udaju.py`).
- **Nástroje:** `porovnej_sestaveni.mjs`; workflow `nocni_porovnani.yml` (schedule, bez tajemství).
- **Testy:** test nástroje porovnání s pojistkou (dvě sestavení lišící se o známou mutaci musí dát rozdíl).

### (e) Doporučení

**Varianta A hned, B až bude nástroj porovnání.** Plné kolo zůstává před každým main a po nasazení.

---

## S4 Fronta úkolů pro J. V.

### (a) Zjištění

- Otázky přicházejí průběžně ze tří míst: řídicí prompt (17 otázek B), předávky sezení (16 míst), artefakt dotazů.
- Pět sezení čekalo na odpověď 18–142 h (viz S2).
- Datové úkoly blokují kola: TEST sada chybí od 2.–3. 11. (K39-I1, trvá v kolech 41–48); SoD projekce v4 v main je otevřená od 11. 11. (B0.6).

### (b)–(c) Varianty

| | 0: průběžně | A: dvě okna týdně s balíčkem | B: jedno okno týdně |
|---|---|---|---|
| Popis | otázky chodí, kdy vzniknou | úterý a pátek: jeden balíček (otázky s doporučením, datové úkoly v pořadí, rozhodnutí o sloučení). Mimo okno jen vada ceny nebo dokumentu v main | totéž jednou týdně |
| Čas J. V. | 60 min/týden na otázky, roztříštěně | −30 min/týden (odhad, méně přepínání) | −40 min/týden |
| Rychlost oprav | sezení čekají 18–142 h | čekání nejvýš 3–4 dny, předvídatelné | až 7 dní |
| Jistota | stejná | stejná; rozhodnutí o main vždy s výsledkem kola v balíčku | stejná |
| Riziko | zapomenuté otázky | sezení stojí do okna; řeší výchozí varianta a svěření (S5) | delší stání |

**Datové úkoly pro jmenovaného kolegu s rolí administrátora** (pravidlo: ceník, právní texty a zveřejnění šablon schvaluje J. V. nebo jmenovaný kolega):

| Úkol | Může kolega | Jak se ověří hotovo |
|---|---|---|
| Nahrát připravenou šablonu z Disku do testu | ano | další kolo přečte verzi a jazyk šablony (u SoD podíl českých řádků, metoda K48-N1) |
| Obnovit TEST sadu v testu („Obnovit ze zálohy“, režim doplnit) | ano | kolo napočítá 216 TEST zakázek v databázi testu; K39-I1 se zavře |
| Nasadit Apps Script kopie na Disk | ano, s přístupem k účtu Google | ranní trigger vidí otisk každý den |
| Založit pole v Pipedrive | ano, správce Pipedrive | mapa polí v Nastavení přestane hlásit „chybí“ |
| Zveřejnit ceník nebo právní text v main | jen se schválením J. V. | kolo main-před × main-po |
| Sazby můstků | ne, cena | — |

### Dnes čekající položky

| Položka | Návrh | Riziko a poznámka |
|---|---|---|
| B1 pojistka jazyka SoD (K48-N1) | **udělat** v prvním balíčku | blokuje dávku C7 a sloučení do main |
| B2 kdy sloučit test → main | **udělat**, spojit s S1 | K40-N1 rychlou cestou hned, zbytek po kole 49 |
| B3 víc šachet na main | **odložit do 25. 11.** | platí B0.1 „zatím ne“, bez rizika |
| B4 jak obnovovat TEST sadu | **udělat** (obnova aplikací, 216/216 v simulaci) | nástroj odmítl 16 z 216 zakázek |
| B5 SoD projekce v4 v main | **udělat**, datový úkol | main tiskne starší znění smlouvy |
| B6 termíny firmy srovnány | **zrušit jako otázku** | ověří kolo 49 samo |
| B7 termín sazeb můstků | **odložit s datem**, které určí J. V. | sekce Můstky zůstává prázdná, cena se nekazí |
| SoD v5 DE/EN nahrát do testu | **udělat**, kolega | bez toho smlouva DE/EN vyjde česky |
| Obnova TEST sady | **udělat**, kolega | kola běží nad kopií z 2. 11. |
| Srovnání ceníku testu | **hotovo 16. 11.** podle promptu po kole 48, zbývá ověřit kolem 49 | — |
| Sazby můstků K44-I1 | **odložit s datem** | jako B7 |
| Apps Script na testu | **udělat**, kolega | bez něj nejsou otisky denní |
| Token Pipedrive na test | **udělat nebo odložit s datem** | blokuje zkušební zápis (K40c N6), #510, #16 |
| Pole DIČ v Pipedrive | **odložit**, správce Pipedrive | oprava firmy DIČ přeskakuje, nízké |
| DP #573 termín DPZ | **do balíčku**, obsah neověřen | text nabídky, rozhoduje J. V. |
| GD #578 | **odložit s datem** | roadmapa vlna F, čeká na vzor smlouvy |
| Zefektivnění programu | **odložit**: start po sloučení do main | plán byl konec týdne 45, skluz 2 týdny |
| Dotazy obchodu D1–D8, T1 | **do balíčku**, obsah neověřen | co nemění cenu ani text, může zodpovědět kolega z obchodu |

### (d) Co se změní

- **CLAUDE.md:** okna a výjimka pro vadu v main.
- **Kokpit:** „Čeká na vás“ se dělí na „do příštího okna“ a „hned“; u položky doporučení, termín a kdo ji smí udělat.
- **PREDAVKA koordinace:** balíček jako jeden oddíl s datem okna.

### (e) Doporučení

**Varianta A (dvě okna).** První balíček: B1, B2, B4, B5 a datové úkoly testu.

---

## S5 Svěření rozhodnutí

### (a) Zjištění

- Svěření už existuje, ale jen jako dočasný pokyn: J. V. 10. 11. („drobné otázky bez dopadu na cenu, zákazníka a bezpečnost rozhoduje koordinace doporučenou variantou a zapíše je“, platnost asi 2 dny).
- Sezení si výchozí varianty volí sama a zapisují je do předávek: oddíly „Rozhodnutí bez J. V.“, „Rozhodnutí sezení“, „Výchozí volby“ (3 oddíly), „rozhodnutí koordinace“ (3 místa), revize poradce (8 míst). Zdroj: PREDAVKA ř. 1–1600.
- Přehled těchto rozhodnutí na jednom místě není; jsou rozptýlená ve 43 oddílech.

### (b)–(c) Varianty

| | 0: dočasné pokyny | A: stálá tabulka tříd + týdenní přehled | B: svěřit jen testy a harnessy |
|---|---|---|---|
| Čas J. V. | 60 min/týden na otázky | −20 min/týden (odhad: třetina otázek je technická) | −5 min/týden |
| Rychlost | sezení čekají | technické varianty bez čekání | skoro beze změny |
| Jistota | závisí na tom, co sezení samo uzná za drobnost | stejná: cena, text a main zůstávají J. V.; vše svěřené je dohledatelné a vratné | stejná |
| Riziko | nejasná hranice | špatně zařazené rozhodnutí; kryje přehled a právo vrátit | malý přínos |

### Navržená tabulka tříd

| Třída rozhodnutí | Kdo rozhoduje | Kam se zapíše |
|---|---|---|
| Cena, ceník, sazby, marže, zaokrouhlení ceny | J. V. | evidence (typ rozhodnutí), CHANGELOG |
| Text nabídky, smlouvy, plné moci, právní znění, překlady právních textů | J. V. nebo jmenovaný kolega | evidence, podklad šablony |
| Sloučení do main, nasazení, zapnutí funkce na ostrém | J. V. | PREDAVKA koordinace, kokpit |
| Zápis do produkčních dat, Pipedrive, Disk | J. V. | PREDAVKA koordinace |
| Bezpečnostní mez, práva rolí | J. V. po doporučení poradce | `BEZPECNOST_MEZE.md` |
| Pořadí a rozdělení dávek, souběh sezení | koordinace | PREDAVKA koordinace |
| Sloučení do integrace a testu po zeleném kole | koordinace | PREDAVKA koordinace |
| Technická varianta bez dopadu na cenu a text dokumentu (struktura kódu, název funkce, tvar testu, čekání v harnessu, pořadí pravidel bez změny výsledku) | podagent podle kritérií | přehled svěřených rozhodnutí |
| Text hlášky a upozornění v aplikaci (ne v dokumentu) | koordinace, výchozí varianta | přehled svěřených rozhodnutí |

**Kritéria pro podagenta** (všechna musí platit):
1. zlaté sady a porovnání sestavení beze změny čísel;
2. žádný rozdíl v textu vytištěného dokumentu;
3. žádná změna práv, mezí ani dat na serveru;
4. změna jde vrátit jedním commitem.
Když kterékoli neplatí nebo si není jistý, otázka jde do balíčku.

**Přehled svěřených rozhodnutí:** jeden soubor `podklady/SVERENA_ROZHODNUTI.md`, řádek = datum, ID, kdo rozhodl, co, proč, jak vrátit (commit nebo větev), stav „platí / vráceno J. V.“. Do balíčku jde výpis od minulého okna. J. V. vrací odpovědí „vrať ID“; koordinace založí větev s vrácením.

### (d) Co se změní

- **CLAUDE.md:** tabulka tříd a kritéria.
- **Prompty dávek:** věta „svěřená rozhodnutí zapiš do přehledu“.
- **Testy:** `test_svereni.js` hlídá tvar přehledu (každý řádek má způsob vrácení), s pojistkou.

### (e) Doporučení

**Varianta A.**

---

## S6 Jedna evidence

### (a) Zjištění

V předávkách za 14 dní (PREDAVKA ř. 1–1600) se používá nejméně deset řad značek:

| Řada | Příklad | Různých značek | Kde žije |
|---|---|---|---|
| čísla roadmapy | #579 | 66 | `roadmap.json` |
| verze | v12.11.7 | 40 | `verze.txt`, CHANGELOG, tagy |
| bezpečnostní meze | B217 | 37 | `BEZPECNOST_MEZE.md` |
| otázky a rozhodnutí sezení | O15, P1, D1 | 18 | předávky |
| rozhodnutí návrhu | R21 | 16 | podklady návrhu |
| nálezy kol | K48-N1 | 13 | STAV na Disku |
| etapy | VS-E5, VZ-E5b | 13 | prompty |
| nálezy revize poradce | N1–N8 | 12 | předávky |
| dávky | C1–C10 | 6 | řídicí prompty |
| otázky a rozhodnutí J. V. | B1–B7, B0.1–B0.10 | 17 | řídicí prompty |

**Kolize:**
- „B“ znamená mez (B217), otázku (B1) i rozhodnutí (B0.1).
- „C“ znamená dávku (C7), kalkulaci (C01) i standardní zakázku (C002).
- „N1“ je nález kola i nález revize.
- Čísla mezí B176–B179 byla přidělena dvakrát (K40-P1, `STAV_KOLO40`).
- Etapy víc šachet mají dvojí čísla (#570 a #590–#596).

**Stav `roadmap.json`:** 600 položek (576 hotovo, 16 blokováno, 8 čeká), 1 177 kB, asi 311 tis. tokenů. Pole `cekaNa` má 21 položek. Vazbu na větev, kolo a verzi nemá (jen `hotovoV`). Nálezy kol, otázky ani datové úkoly v něm nejsou.

### (b)–(c) Varianty

| | 0: nechat | A: rozšířit `roadmap.json` | B: ClickUp | C: tabulka na Disku |
|---|---|---|---|---|
| Popis | deset řad | jedna řada ID; pole `typ` (úkol, nález, otázka, rozhodnutí, datový úkol), `cekaNa`, `kolo`, `vetev`, `verze`, `puvodniZnacka` | úkoly v ClickUp, repo jen odkazuje | sdílená tabulka |
| Čas J. V. | hledání v 43 oddílech | −10 min/týden (odhad) | −10 min/týden, navíc zavedení | −5 min/týden |
| Rychlost | — | sezení najde stav jedním dotazem | sezení potřebuje konektor a právo zápisu | koordinace na Disk zatím nepíše |
| Jistota | kolize značek | kontrola `roadmapa.py --kontrola` už hlídá duplicity a stavy | dva zdroje pravdy (repo a ClickUp) | bez kontroly |
| Riziko | záměna značek | soubor je velký (1,2 MB); veřejné repo, žádné ceny ani osoby | zápis mimo repo, kolegové musí mít účet | rozjede se s repem |

### (d) Co se změní

- **`roadmapa/roadmap.json`:** nová pole; staré značky zůstanou v `puvodniZnacka`, nic se nepřečíslovává zpětně (pravidlo roadmapy).
- **`roadmapa.py --kontrola`:** otevřená položka má `cekaNa`; nález má `kolo`; hotová má `verze`.
- **Zeštíhlení:** hotové položky starší než 60 dní do `roadmap_archiv.json` (živý soubor asi 60 položek místo 600).
- **Skill `roadmapa-kng`:** nové typy a pravidlo jedné řady.
- **Kokpit:** „Čeká na vás“ se generuje z evidence, ne ručně.

### (e) Doporučení

**Varianta A.** Repo je jediné místo, kam všechna sezení píšou a kde běží kontrola. ClickUp jen jako výstupní kanál pro kolegy (S8).

---

## S7 Startovní podklady

### (a) Zjištění

| Soubor | Velikost | Znaků | Odhad tokenů (3,5 znaku) |
|---|---|---|---|
| `CLAUDE.md` | 7,6 kB | 7 101 | 2,0 tis. |
| `PREDAVKA.md` (integrace) | 557 kB | 517 254 | 148 tis. |
| `PREDAVKA.md` (test) | 503 kB | — | asi 134 tis. |
| `CHANGELOG.md` | 846 kB | 774 149 | 221 tis. |
| `roadmap.json` | 1 177 kB | 1 089 022 | 311 tis. |
| `BEZPECNOST_MEZE.md` | 150 kB | 136 963 | 39 tis. |
| skill `kalkulator-next-gen` | 53,9 kB | 49 515 | 14,1 tis. |
| skill `testovaci-procedura-kng` | 12,9 kB | 11 927 | 3,4 tis. |
| skill `roadmapa-kng` | 9,6 kB | 8 820 | 2,5 tis. |
| skill `kokpit-koordinace` | 6,9 kB | 6 312 | 1,8 tis. |
| prompt dávky (medián 22 souborů `podklady/PROMPT_*`) | 3,9 kB | 3 899 | 1,1 tis. |
| řídicí prompt po kole 47 / 48 | 10,9 / 8,6 kB | 10 076 / — | 2,9 / 2,4 tis. |
| prompt K40 / Zefektivnění | 19,4 / 25,9 kB | — | 5,5 / 7,4 tis. |

**PREDAVKA.md:**
- 202 oddílů, 6 205 řádků; 43 oddílů (173 kB) je z posledních 14 dní.
- Přibývá asi 4 kB na dávku a nic se neodmazává.
- Stav koordinace je až na řádku 1 522, za 42 předávkami dávek.
- Pravidlo „na začátku přečíst PREDAVKA.md“ nejde splnit celé; sezení čte začátek.

**CLAUDE.md neodpovídá praxi:**
- 11× jmenuje `test-draft` jako integrační a předávací větev. Její poslední commit je z 25. 10. (efa61c1).
- Integrační větev `claude/integrace-16-10` zmiňuje jednou, kokpit a poradce vůbec.
- Nese splněné datované výjimky (`k16-nalezy`).
- Chybí platná pravidla z předávek: poradce u rizikových úkolů (11. 11.), sloučení do testu po zeleném kole (10.–11. 11.), nejvýš 4 souběžná sezení.

**Skill `testovaci-procedura-kng`** popisuje stav z 22. 8. (viz S2).

### (b)–(c) Varianty

| | 0: nechat | A: rozdělit pravidla, stav a log | B: jen ořezat PREDAVKA |
|---|---|---|---|
| Popis | — | `CLAUDE.md` = jen platná pravidla. `PREDAVKA.md` = jen živý stav. `podklady/predavky/RRRR-MM.md` = archiv dávek. `ROZHODNUTI_LOG.md` = datovaná rozhodnutí J. V. | starší oddíly do archivu |
| Čas J. V. | 0 | 0 přímo; méně chyb sezení z neplatných pravidel | 0 |
| Rychlost | start sezení čte zlomek | start čte vše podstatné do 10 tis. tokenů | zlepší jen PREDAVKA |
| Jistota | sezení může jednat podle neplatného pravidla | vyšší | beze změny pravidel |
| Riziko | — | při přesunu vypadne platné pravidlo; kryje kontrola J. V. nad diffem | — |

**Cílové velikosti:**

| Soubor | Dnes | Cíl |
|---|---|---|
| `CLAUDE.md` | 7,6 kB | do 8 kB, bez datovaných výjimek |
| `PREDAVKA.md` | 557 kB | do 15 kB (stav koordinace + běžící dávky) |
| předávka jedné dávky | asi 4 kB | do 3 kB, po sloučení do archivu |
| `ROZHODNUTI_LOG.md` | není | řádek na rozhodnutí, bez limitu, nečte se při startu celý |
| skill `kalkulator-next-gen` | 53,9 kB | do 25 kB, zbytek do příloh skillu |
| startovní čtení dávky celkem | neurčité | do 10 tis. tokenů |

### (d) Co se změní

- **CLAUDE.md:** přepis (návrh textu níže).
- **PREDAVKA.md:** přesun 190+ oddílů do archivu; pevná osnova.
- **Nástroje a testy:** statická kontrola velikosti (`PREDAVKA.md` nad 20 kB = selhání kroku `staticke`), s pojistkou.
- **Skilly:** aktualizace `testovaci-procedura-kng`; zkrácení `kalkulator-next-gen`.

### (e) Doporučení

**Varianta A.** Nekoliduje s programem Zefektivnění (ten řeší velikost aplikace, ne podkladů).

---

## S8 Přehled pro J. V. a kolegy

### (a) Zjištění

- Kokpit existuje (trvalý artefakt, dlaždice main / test / integrace / kolo, „Čeká na vás“). Data jsou ručně vedený JSON ve stránce; kolegové ho nevidí.
- Co je v main a co jen v testu, se dnes skládá z STAV souborů a předávek. Otevřené vady s dopadem na cenu nemají vlastní seznam: K40-N1 je uvedena jako „trvá“ v kolech 41–47.
- Poznámky k vydání: `release_odkaz.py` vyrábí popis releasu z CHANGELOG. Tag má každá verze integrace: 31 tagů za 14 dní, do main se dostaly 4 stavy.
- Bez tagu je 10 verzí z 16.–18. 11. (v16.11.1 – v18.11.2) a 10 starších (v1.11.1, v2.11.1–v2.11.9). Zdroj: CHANGELOG × `git ls-remote --tags`.

### (b)–(c) Varianty

| | 0: kokpit + release na GitHubu | A: soubor `STAV.json` v repu + poznámky k vydání, kokpit ho čte | B: ClickUp | C: e-mail po sloučení |
|---|---|---|---|---|
| Popis | — | generovaný z evidence a gitu: čeká na J. V., main × test, otevřené vady ceny; `NOVINKY.md` 5–10 řádků česky po každém sloučení do main | úkoly a novinky do ClickUp | souhrn mailem |
| Čas J. V. | 15 min/týden klikání releasů | −10 až −15 min/týden (tag jen pro stav v main) | −5 min/týden | 0 |
| Rychlost | — | kolega vidí, co je v main, bez ptaní | totéž, mimo repo | jednorázová zpráva |
| Jistota | vada v main není vidět na jednom místě | seznam vad ceny v main je povinná část přehledu | stejná | — |
| Riziko | — | veřejné repo: bez cen a jmen (hlídá `kontrola_udaju.py`) | zápis mimo repo vyžaduje souhlas | zapadne |

### (d) Co se změní

- **Nástroje:** `nastroje/stav_prehled.py` (z evidence a `git` vyrobí `STAV.json` a `NOVINKY.md`), test s pojistkou.
- **CLAUDE.md, oddíl Tagy:** tag a release jen pro stav, který jde do main; mezilehlé verze zůstávají v CHANGELOG.
- **Kokpit:** nová dlaždice „vady ceny v main“ (počet, nejstarší, dní).
- **Kanál:** soubor v repu jako zdroj; kokpit pro J. V.; ClickUp nebo e-mail až jako příjemce pro kolegy, po rozhodnutí J. V.

### (e) Doporučení

**Varianta A.** Kanál pro kolegy je otázka 7.

---

## Souhrnná tabulka

| Pořadí | Situace | Doporučení | Úspora času J. V. (min/týden, odhad) | Riziko | Zavedení (větví) |
|---|---|---|---|---|---|
| 1 | S1 cesta do main | A rychlá cesta, první K40-N1 | 0 až +10 (jde o rychlost: 14+ dní → 1–2 dny) | střední: rozjetí, hlídá kontrola předka | 2 (pravidla + kontrola; nástroj porovnání) |
| 2 | S7 podklady | A pravidla / stav / log | 0 přímo | nízké | 1 |
| 3 | S4 fronta | A dvě okna, balíček | 30 | nízké | 0–1 (kokpit) |
| 4 | S5 svěření | A tabulka tříd + přehled | 20 | střední: zařazení, kryje právo vrátit | 1 |
| 5 | S2 přenos | B hned, A po částech | 60–90 | střední: přístup automatu | 2 |
| 6 | S3 kola | A stupně, pak B noční | 20–30 | střední: méně plných kol | 2 (společné s S1, S2) |
| 7 | S8 přehled | A `STAV.json` + novinky, méně tagů | 10–15 | nízké | 1 |
| 8 | S6 evidence | A rozšířit `roadmap.json` | 10 | nízké | 2 |

Součet odhadu: 150–190 z asi 230 min týdně. Úspory S2 a S3 se zčásti překrývají.

---

## Otázky pro J. V.

**1. Rychlá cesta pro vady měnící cenu nebo dokument**
- a) Zavést teď a K40-N1 poslat jako první (doporučeno).
- b) Zavést až po sloučení testu do main (C10).
- c) Nezavádět, vše dál jde s celým testem.

**2. Kdo dělá cílené kolo main-před × main-po u rychlé cesty**
- a) Koordinace nástrojem nad sestaveními a TEST sadou; J. V. dostane tabulku rozdílů a rozhodne (doporučeno).
- b) Vždy testovací sezení v prohlížeči J. V., jako dnes.
- c) Obojí u vad ceny, jen a) u vad textu.
- d) Automat dostane čtecí přístup k testu (ne k main) a kolo dělá nad živým testem.

**3. Stupně testovacích kol**
- a) Po dávce automat, cílená sada na změněnou oblast, plné kolo jen před main a po nasazení (doporučeno).
- b) Totéž a navíc noční porovnání v Actions bez ostrých dat.
- c) Plné kolo po každé změně testu jako dnes.

**4. Okna pro rozhodování**
- a) Dvě okna týdně s jedním balíčkem; mimo okno jen vada v main (doporučeno).
- b) Jedno okno týdně.
- c) Průběžně jako dnes.

**5. Jmenovaný kolega s rolí administrátora**
- a) Jmenovat pro datové úkoly na testu (šablony z Disku, TEST sada, Apps Script); main dál J. V. (doporučeno).
- b) I pro main, kromě ceníku a právních textů.
- c) Nejmenovat.

**6. Svěřená rozhodnutí**
- a) Schválit tabulku tříd a kritéria; přehled svěřených v každém balíčku s právem vrátit (doporučeno).
- b) Svěřit jen testy a harnessy.
- c) Nesvěřovat nic trvale.

**7. Evidence a kanál pro kolegy**
- a) Jedna evidence v `roadmap.json`, přehled jako soubor v repu, kokpit pro J. V. (doporučeno).
- b) Totéž a novinky po sloučení do main posílat kolegům e-mailem.
- c) Totéž a úkoly zrcadlit do ClickUp.

**8. Tagy a releasy**
- a) Tag a release jen pro stav, který jde do main; mezilehlé verze jen v CHANGELOG (doporučeno).
- b) Tag pro každou verzi jako dnes, ale hromadně tlačítkem v Actions (jako „Smazat sloučené větve“).
- c) Nechat jak je (odkaz na každou verzi).

---

## Navržené změny textu CLAUDE.md a skillu (ke schválení, NEAPLIKOVAT)

### CLAUDE.md, oddíl „Větve“ (nahrazuje dnešní znění)

```
## Větve

- Úpravy se dělají vždy promptem do paralelní větve `claude/…` nad commitem,
  který určí prompt. Větev zůstává; o sloučení rozhoduje koordinace (do
  integrace a test) a J. V. (do main).
- Integrační větev je `claude/integrace-…` (jméno drží PREDAVKA.md). Koordinace
  do ní slučuje po revizi a zeleném kole dávky.
- Do `test` posílá koordinace integraci po celém zeleném kole.
- Do `main` jen na pokyn J. V. a vždy po kole main-před × main-po.
- `main` musí být předkem integrace. Kontrola: `git rev-list --count
  <integrace>..origin/main` je 0 (krok `staticke`).
- Nejvýš 4 souběžná sezení (limit účtu 5 h).
- U složitých a rizikových úkolů (výpočet ceny, bezpečnost, dokumenty) nejdřív
  poradce navrhne postup a před sloučením zreviduje rozdíl.
```

### CLAUDE.md, nový oddíl „Rychlá cesta“

```
## Rychlá cesta pro vady ceny a dokumentu

Platí pro vadu, která v `main` mění cenu nabídky nebo text vytištěného
dokumentu. Nic jiného touto cestou nejde.

1. Větev `claude/rychla-<ID nálezu>` nad `origin/main`. Obsah: jen oprava,
   její test s pojistkou a cílené mutace. Žádná jiná změna.
2. Kolo `bash nastroje/testovaci_kolo.sh --bez-mutaci` nad větví.
3. Celé mutace po částech: workflow Testy ručně nad větví.
4. Cílené kolo main-před × main-po nad ceníkem main. Rozdíl smí být jen
   v případech vady. Jiný rozdíl = stop a hlášení J. V.
5. J. V. dostane: ID vady, počet dotčených kalkulací, tabulku rozdílů,
   výsledek kola. Do `main` se slučuje jen na jeho pokyn.
6. Týž den se `main` sloučí do integrace. Číslo verze přidělí koordinace.
7. Po nasazení kolo nad `main` (ověření) a zápis do evidence.
```

### CLAUDE.md, nový oddíl „Kdo rozhoduje“

```
## Kdo rozhoduje

- J. V.: cena, ceník, sazby; text nabídky, smlouvy a plné moci; sloučení do
  main a nasazení; zápis do produkčních dat; bezpečnostní meze.
- J. V. nebo jmenovaný kolega: zveřejnění šablon, právní texty.
- Koordinace: pořadí dávek, sloučení do integrace a test, texty hlášek.
- Sezení dávky: technická varianta, která nemění žádné číslo, žádný text
  dokumentu, žádné právo ani data na serveru a jde vrátit jedním commitem.
  Zapíše ji do `podklady/SVERENA_ROZHODNUTI.md` (datum, ID, co, proč, jak
  vrátit). Když si není jisté, ptá se.
- Otázky pro J. V. jdou v balíčku ve dvou oknech týdně, každá s doporučenou
  variantou. Mimo okno jen vada ceny nebo dokumentu v main.
```

### CLAUDE.md, oddíl „Předávací soubor“ (nahrazuje body 1–2)

```
1. Na začátku sezení přečíst `CLAUDE.md` a `PREDAVKA.md` na integrační větvi.
2. `PREDAVKA.md` nese jen živý stav: větve a verze, běžící dávky, co čeká
   na J. V., další krok. Nejvýš 15 kB (hlídá krok `staticke`).
3. Předávka dávky má nejvýš 3 kB. Po sloučení dávky ji koordinace přesune do
   `podklady/predavky/RRRR-MM.md`.
4. Datovaná rozhodnutí J. V. se píší do `podklady/ROZHODNUTI_LOG.md`
   (řádek = datum, rozhodnutí, čeho se týká). Do CLAUDE.md jde jen pravidlo,
   které z rozhodnutí trvale plyne.
```

### CLAUDE.md, oddíl „Tagy, releasy“ (doplněk, podle otázky 8)

```
- Tag a release dostává jen stav, který jde do main. Mezilehlé verze
  integrace zůstávají v CHANGELOG bez tagu.
- Po každém sloučení do main koordinace vyrobí `NOVINKY.md` (5–10 řádků
  česky: co je nové, co opravené, co má uživatel udělat jinak; bez cen).
```

### CLAUDE.md, oddíl „Testy“ (doplněk)

```
- Stupně kol: (1) po každé dávce `testovaci_kolo.sh` a porovnání sestavení
  nad pevnou sadou; (2) cílená sada na změněnou oblast; (3) plné kolo
  cenových nabídek jen před main (main-před × main-po) a po nasazení.
- STAV kola se zapisuje do `podklady/kola/STAV_KOLOnn.md`. Kopie jinde nejsou
  zdroj.
```

### Z CLAUDE.md vypustit (přesun do ROZHODNUTI_LOG.md)

- odstavec o výjimce `k16-nalezy` (splněno),
- věty o `test-draft` jako integrační a předávací větvi,
- datované závorky u pravidel („upraveno 29. 9.“, „W2, 20. 10.“, čísla běhů Actions).

### Skill `testovaci-procedura-kng` (návrh osnovy přepisu)

```
1. Prostředí: git (větev a commit z promptu), `nastroje/testovaci_kolo.sh`,
   symlink `node_modules/playwright`. Žádné zipy z Disku.
2. Stupně kol (1 automat, 2 cílené, 3 plné) a kdy který.
3. Kolo main-před × main-po: dvě sestavení, stejná sada, stejný ceník;
   očekávané rozdíly se vypíší předem.
4. Sady: standardní, regresní, cílené, fuzz, tok Word a zámek, víc šachet.
5. Výstup: `podklady/kola/STAV_KOLOnn.md` (pevná osnova: verze, rozsah,
   výsledky, nálezy s ID z evidence, úkoly) a protokol xlsx bez cen z ceníku.
6. Nález = položka evidence (typ nález, kolo, vážnost, dopad na cenu ano/ne).
7. Bezpečnostní audit: beze změny, jen čtení.
```
