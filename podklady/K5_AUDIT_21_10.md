# Bezpečnostní audit K5 — Kalkulator Next Gen v21.10.4

- **Datum:** 21. 10. 2026 (dávka K5; koordinace „ŘÍDÍCÍ 21.10“). Zadání J. V.: celé kolo s mutacemi + audit jako podmínka posunu `test` → `main` (main je v20.10.1).
- **Kód:** `7652bb9` (v21.10.4, integrace C3 + C4); zápis ve větvi `claude/k5-kolo`. Kód aplikace se v dávce neměnil.
- **Navazuje na:** `podklady/K4_AUDIT_20_10.md` (K4-N1…K4-N23).
- **Rozsah:** `git diff b6f49a7..7652bb9` (v20.10.7 → v21.10.4; 66 souborů, 71 commitů): v20.10.8 K29-N1 (můstky), O8 (oprava nástroje W2 — K4-N2, N3, N9, N10, N11, N19; test K4-N22), v21.10.1 Controlling C1 + C2 (`/api/controlling`, export varianty) a S10 (šablona PROJ v8), v21.10.2 O9 (opravy K4 bez J. V.), v21.10.3 O10 (K4-N1 zmrazení kapitol OCK) + O11 (K4-N4, K4-N13, K4-N17, #451 měď), v21.10.4 Controlling C3 + C4 (`/api/controlling/export`, protokol exportů mimo zálohy — schváleno J. V., `pdDealId` jen admin).
- **Metoda:** jen čtení (`git show 7652bb9:…`) ve třech čočkách třemi nezávislými subagenty — (1) server, zálohy, autorizace, úložiště; (2) klient, dokumenty, XSS, zámek a integrita odeslané nabídky; (3) nástroje, workflow W2, CI, supply chain, tajemství. Pokusy nad kopiemi stromu (`git archive`) s úložištěm v paměti a nad lokálními holými repy (W2 — `origin` vždy lokální soubor), nikdy proti GitHubu ani síti. Nálezy K5-S1, K5-S2, K5-K1 a K5-W1 ověřeny druhým, vlastním čtením. Opravy kódu se v dávce nedělaly (zadání).
- Ceny ani osobní údaje v auditu nejsou.

## Testovací kolo

<!-- K5-KOLO -->

## Verdikt

**VYHOVUJE — 0 kritických, 0 vysokých, 0 středních, 5 nízkých, 10 informativních.** Opravy K4 drží: z 23 nálezů K4 je 19 opraveno (z toho K4-N4 a K4-N13 podle rozhodnutí J. V., K4-N1 se zapsanou zbytkovou mezí `{FIRMA}` v doložkách PROJ), K4-N17 trvá podle rozhodnutí J. V. („ponechat“), K4-N20 (Rulesets) je mimo repo a čeká na J. V.; regrese žádná. Controlling drží hranici „jen administrátor“ na serveru (`/api/controlling` GET i POST, export i protokol; matice `test_prava.mjs`), parametry exportu jsou z pevných výčtů s mezemi před čtením, XLSX nevytváří vzorce, `pdDealId` mění jen administrátor. W2 po O8: čerstvá větev nad starou špičkou `test` se nesmaže, souběžný push se neztratí (pokus). Výhrady jsou drobné: objekt v `pdDealId` shodí uložení zakázky na HTTP 500 (K5-S1, třída K4-N12), CSV pro controlling propustí `+ `/`- ` na začátku textu bez apostrofu (K5-K1), kokpit koordinace vkládá dekódované jméno větve bez escapu (K5-W1).

| | Počet | Nálezy |
|---|---|---|
| Kritické | 0 | — |
| Vysoké | 0 | — |
| Střední | 0 | — |
| Nízké | 5 | K5-S1, K5-K1, K5-W1, K5-W2, K5-W3 |
| Informativní | 10 | K5-S2 … K5-S5, K5-K2 … K5-K4, K5-W4 … K5-W7 (K5-S6 sloučen do K5-K3) |
| Regrese K4-N1…K4-N23 | **0** | 19 opraveno, K4-N17 ponecháno (J. V.), K4-N20 mimo repo, viz tabulka |

Statické kontroly (přidané řádky `src/`, `netlify/`, `nastroje/`, `.github/`, 4071 řádků): `eval`/`new Function`/`innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`/`javascript:` žádný nový výskyt; nová místa `onclick`/`onchange` s interpolací (7, všechna `src/ui/controlling_ui.js`) jen s indexem z `map`, literály nebo `escJs` (pokus s `a');alert(1);//"><img…>` bez úniku); nové regexy ukotvené a lineární; tajemství žádná (jen smyšlená zkušební hesla v `netlify/test_controlling.mjs`), e-maily jen `*@priklad.cz` a povolené `admin@example.com`, zákazník jen „Zkušební zákazník s.r.o.“; `package.json`, `package-lock.json`, `netlify.toml`, `testy.yml` beze změny, `NODE_VERSION` 22.23.2 připnutá, akce na plném SHA, `contents: write` jen `smazat_vetve.yml`; hlavičky CSP/X-Frame-Options/nosniff/HSTS trvají (`'unsafe-inline'` jako dřív, B5).

## Nálezy

| ID | Vážnost | Oblast | Nález | Kde (7652bb9) | Opravit bez J. V.? |
|----|---------|--------|-------|-----|----|
| **K5-S1** | nízká | Controlling C4 — vstup serveru (třída K4-N12) | **`pdDealId` jako objekt shodí uložení zakázky na HTTP 500.** `ctrlPdDealIdNorm` volá `String(x)`; u JSON `{"toString":1}` vyhodí TypeError a `zakazkaServerKontrola` volání nemá v `try`. Pokus (kopie stromu, úložiště v paměti): přihlášený obchodník POST `/api/zakazky` s `"pdDealId":{"toString":1}` → nezachycená výjimka, nic se nezapsalo. Táž výjimka v obnově (smyčka bez `try`) by přerušila obnovu zakázek uprostřed dávky (část zapsaná, rejstřík nepřestavěný) — odvozeno z kódu, nespouštěno; obnova jen Administrátor. | `src/controlling.js:716-721`, `:725-732`; `netlify/lib/zakazka_kontrola.mjs:242-243`; `netlify/functions/zakazky.mjs:47`; `netlify/functions/obnova.mjs:584-586` | **ANO** — v `ctrlPdDealIdNorm` pustit jen `typeof` string/number, jinak `null` (→ 400); test 500 → 400 s pojistkou před/po a mutace |
| **K5-K1** | nízká | Controlling — CSV (formula injection) | **Ochrana proti vzorcům propustí `+`/`-` následované mezerou nebo tabulátorem.** `csvBunka` přidá apostrof jen při `^([=@\t\r]\|[+\-][^\s])`; bez apostrofu projdou `"+ 1+1"`, `"- 2+3"`, `"+\tHYPERLINK(…)"` (pokus). Výjimka je v `format.js` záměrná (odrážka „- položka“ v CSV překladů, `test_csv_vzorce.js:21`), controlling ale do CSV nově posílá texty, které píše obchodník (název akce, zákazník, názvy vlastních řádků), a CSV jde controllingu do Excelu. Zda Excel takovou buňku při otevření CSV vyhodnotí, je **neověřené** (Excel v cloudu není). XLSX je bezpečný (jen `inlineStr`, žádné `<f>`, `src/xlsx.js:37`). | `src/format.js:118`; `src/controlling.js:851-858`; data `:596-604`, `:784-786` | **ANO** — pro controlling přísnější varianta (`^[+\-]\s*\S` nebo apostrof u každého textu začínajícího `+`/`-`), test `"+ 1+1"` a `"-\tX"`; globální `csvBunka` neměnit (rozbije odrážky překladů) |
| **K5-W1** | nízká | Kokpit koordinace — XSS (nový kód po K4) | **Popisek odkazu se dekóduje a jde do HTML bez escapu.** `kratko()` dělá `decodeURIComponent` jména větve/tagu/souboru a `lnk` výsledek vloží za už escapovaný text; odkaz `…/tree/claude/%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E` vyrobí `<img src=x onerror=alert(1)>` (ověřeno v Node; takové jméno větve git povolí). Vadné `%E0` vyhodí „URI malformed“ a kokpit se nevykreslí. Data píše jen koordinace, jména větví ale přebírá z gitu. | `.claude/skills/kokpit-koordinace/kokpit_sablona.html:413-422` (`:416`, `:417`, `:419`, `:420`) | **ANO** — `esc()` na výstup `kratko`, `decodeURIComponent` v `try/catch` |
| K5-W2 | nízká | W2 — dotaz na GitHub API | Jméno větve jde do `activity?ref=refs/heads/$1` bez URL-kódování: pro větev `a&ref=refs/heads/stara` odejde zdvojený `ref`, u `h#x` se zbytek usekne (pokus s podvrženým `gh`). Vezme-li GitHub druhé `ref` (neověřeno), převezme se čas cizí staré větve — a čas z API v pokusu přebil pojistku „hlavní linie“ (smazala se i čerstvá větev nad `test`). Zneužít může jen ten, kdo smí pushovat. | `nastroje/sloucene_vetve.sh:140`, `:170-174` | **ANO** — zakódovat (`jq -rn --arg v "$1" '$v\|@uri'`) nebo jména se znaky `&#%?=` vynechat |
| K5-W3 | nízká | W2 — zbytek K4-N2 bez API | Čerstvá větev založená přesně na špičce už sloučené dávkové větve (ne na `test`/`test-draft`/`claude/integrace-*`) se bez času z API smaže (pokus: `nova-na-davce` smazána); skript to v komentáři přiznává. Zda `/activity` s `GITHUB_TOKEN` vrací data a jak dlouho je drží, je neověřené — bez API platí právě tahle slabší pojistka. | `nastroje/sloucene_vetve.sh:38-39`, `:175-181` | **J. V.** — doporučeno: první ostrý běh s `jen_vypsat` (souhrn ukáže důvod „GitHub“) a zapnout Rulesets (K4-N20) |
| K5-S2 | informativní | Controlling C4 — funkční vada | Neplatné uložené `pdDealId` (např. `'x'` z doby před C4) zablokuje obchodníkovi uložení zakázky beze změny: nová hodnota se ověří (400) dřív, než se porovná s uloženou; komentář slibuje „neplatná hodnota v uložené verzi se bere jako prázdná“. Pokus nad čistou funkcí. Zneužít nejde. | `src/controlling.js:723-727` | **ANO** — shodná příchozí a uložená hodnota kontrolu tvaru přeskočí; test |
| K5-S3 | informativní | Zálohy / protokol — souběh | Potvrzení retence dělá „přečti, uprav, zapiš“ (`{...v, potvrzeno}`); zapíše-li noční běh mezi tím nové varování, potvrzení ho přepíše starým s razítkem `potvrzeno` a retence by mazala. Okno velmi úzké (klik správce v okamžiku noční zálohy). Obdobně protokol exportů — při souběžných exportech jen ztráta záznamu. | `netlify/functions/zaloha_vynuceno.mjs:85-94`; `netlify/functions/controlling_export.mjs:86-89` | **J. V.** — doporučeno zapsat do `BEZPECNOST_MEZE.md`; případně před zápisem přečíst znovu a porovnat `kdy` |
| K5-S4 | informativní (neověřeno) | Controlling C3 — meze | Strop 600 čtení platí správně před čtením, ale 600 čtení Blobs + `importZakazka` + výpočet za sebou (zakázky až 4 MB) může přesáhnout časový limit funkce Netlify dřív, než zabere mez → správce dostane holé 502 místo 413. Neměřeno. Jen Administrátor. | `netlify/functions/controlling_export.mjs:56-84`; `src/controlling.js:623` | **J. V.** — změřit na reálných datech, případně snížit `cteni` |
| K5-S5 | informativní | Controlling — náklady (B88) | Role u controllingu sama náklady nechrání: každý přihlášený čte celou zakázku přes GET `/api/zakazky?soubor=` i s ceníkem varianty; hromadný export přidává jen pohodlné sloučení. Vědomá zapsaná mez. | `netlify/functions/zakazky.mjs:35-43`; `BEZPECNOST_MEZE.md:979-981` | — (vědomá mez) |
| K5-K2 | informativní | Zámek — obsah snímku (K4-N1, K3-N2) | Snímek kapitol a vět skládá při prvním zamčení klient, server obsah neověřuje (jen velikost a neměnnost po zamčení). Obchodník s devtools může zamknout variantu s upravenými kapitolami IV.–VI./doložkami a dotisk je od O10 trvale reprodukuje (dřív by spadl na aktuální Firmu). Papír, který odešel, nese týž text — nejde o přepis odeslané nabídky. | `src/kryci.js:946`; `src/ui/zamek_ui.js:356`; `netlify/lib/zakazka_kontrola.mjs:65`, `:347-358` | **J. V.** — doporučeno zapsat jako mez do `BEZPECNOST_MEZE.md`; případně při prvním uložení zámku porovnat snímek s online Firmou (obdoba B59) |
| K5-K3 | informativní | Controlling — CSV záložní cesta | `ctrlCsvBunka` bez globálního `csvBunka` tiše vrátí buňku bez ochrany proti vzorcům. V sestavení je `format.js` dřív, dnes nenastane; test si `csvBunka` nastaví sám, záložní cestu nevidí. (Hlásily obě čočky 1 a 2.) | `src/controlling.js:851-855` | **ANO** — záložní cesta s toutéž ochranou, nebo výjimka |
| K5-K4 | informativní | Controlling C2 — export varianty | Export jedné varianty (karta i tlačítko v Přehledu) běží v prohlížeči z lokální `ZAK`; hranici drží jen klient (`ctrlUiSmi` z relace, `nahledJakykoli`). Zapsaná mez (`BEZPECNOST_MEZE.md` oddíl Controlling C2); nákladová data jsou v prohlížeči i tak (B88). | `src/ui/controlling_ui.js:213-223`, `:231-236` | **J. V.** — doporučeno ponechat |
| K5-W4 | informativní | W2 — test | Test W2 nehlídá mazání plným jménem: mutant `--delete "$v"` (návrat K4-N9) prošel 48/0. Dnes nic nehrozí jen díky gitu. | `nastroje/test_sloucene_vetve.sh` (chybí scénář) | **ANO** — scénář s větví shodnou s tagem a větví `-x` |
| K5-W5 | informativní | W2 — druhá vrstva | Pojistka „jen z main“ (K4-N11) chrání před omylem ve formuláři; při spuštění z jiné větve běží její kopie workflow i skriptu (lze `if` odstranit). Kdo smí pushovat, přidá i vlastní workflow — nová práva nezíská. Skutečná druhá vrstva = Rulesets (K4-N20). | `.github/workflows/smazat_vetve.yml:50`; `nastroje/sloucene_vetve.sh:100-103` | **J. V.** (Rulesets, K4-N20) |
| K5-W6 | informativní | Veřejné repo — hygiena | Přibylo křestní jméno zaměstnankyně controllingu (v b6f49a7 ani jednou): v komentářích a textech mutací `src/controlling.js` (6×), `src/test_controlling.js` (2×), `src/ui/controlling_ui.js`, `netlify/mutace.mjs` (2×), `CHANGELOG.md`, `BEZPECNOST_MEZE.md` a 32× `podklady/CONTROLLING_NAVRH_20_10.md`. Není to zákazník ani cena. | `git grep -c <jméno> 7652bb9` | **J. V.** — doporučeno nahradit rolí „controlling“ |
| K5-W7 | informativní | W2 — test | Nečíselný čas commitu se obsluhuje bezpečně (větev se vynechá), ale tuhle větev nic netestuje (mutant bez kontroly `*:` prošel). Prakticky nenastane. | `nastroje/sloucene_vetve.sh:161-163` | ANO (volitelné) |

<!-- K5-MUTACE-NALEZY -->

## Regrese K4

| Nález | Stav | Doklad (řádky podle `7652bb9`) |
|---|---|---|
| K4-N1 | **OPRAVENO** (O10; zbytková mez zapsaná) | Snímek `kryci.zmrazenoPodminky.kapitoly` (`src/kryci.js:946`, `src/firma.js:341-352`), tisk ze snímku jen u zamčené varianty (`src/nabidka.js:298-299`, `:350`, `:530-536`), varianty bez snímku jako dřív (`firma.js:355-356`), po zamčení neměnné (`zamek.js:322-331`, `zakazka_kontrola.mjs:355`). Trvá `{FIRMA}` v doložkách PROJ z aktuálního názvu (`nabidka_proj.js:776-782`) — pravdivě v `BEZPECNOST_MEZE.md:882-897`. Obsah snímku viz K5-K2. |
| K4-N2 | **OPRAVENO** (O8; zbytek bez API → K5-W3) | `sloucene_vetve.sh:151-183`; pokus: čerstvá větev nad starou špičkou `test` i nad `claude/integrace-*` zůstala. |
| K4-N3 | **OPRAVENO** (O8) | `sloucene_vetve.sh:189` `--force-with-lease="refs/heads/$v:$sha" … --delete "refs/heads/$v"`; souběžný push v testu → smazání odmítnuto, commit zůstal, kód 1. |
| K4-N4 | **OPRAVENO dle J. V.** (O11) | Přepis ceny výjezdu pod B112 (`uloziste.js:1186-1193`, `:1483-1484`), přepínač `akceMimoPrahu` volný; test `test_prava.mjs:1502-1515`. |
| K4-N5 | **OPRAVENO** (O9) | Rezervace a druhá kontrola limitu (`zalohovani.mjs:135-199`, `zaloha_vynuceno.mjs:100`). Neověřeno: konzistence `list()` Blobs mezi instancemi. |
| K4-N6 | **OPRAVENO** (O9) | `docxgen.js:391-392`, `:427-429`. |
| K4-N7 | **OPRAVENO** (O9) | `firma.js:745-754`, `online_ui.js:697-703`, `podminky_ui.js:84`. |
| K4-N8 | **OPRAVENO** (O9) | `test_d2_proj_sikora.js:202-209`. |
| K4-N9 | **OPRAVENO** (O8; test nehlídá → K5-W4) | pokus: `-x`, `--mirror`, větev shodná s tagem se smazaly čistě, tag/`main`/`test` zůstaly. |
| K4-N10 | **OPRAVENO** (O8) | `sloucene_vetve.sh:89-97`; `08`→8, přetečení/`1e3`/`0x10`/`8761` → kód 2. |
| K4-N11 | **OPRAVENO** (O8; proti omylu → K5-W5) | `smazat_vetve.yml:50`, `sloucene_vetve.sh:100`. |
| K4-N12 | **OPRAVENO** (O9) | `zaloha_vynuceno.mjs:31-33`, `:56-73`, `:97`. Táž třída chyby nově v `pdDealId` → K5-S1. |
| K4-N13 | **OPRAVENO dle J. V.** (O11) | `zalohovani.mjs:382-390`, `:459-465`; `zaloha_vynuceno.mjs:84-95` (heslo správce, ≤ 30 dní, kontrola dne). Souběh → K5-S3. |
| K4-N14 | **OPRAVENO** (O9) | `zalohovani.mjs:547-555`. |
| K4-N15 | **OPRAVENO** (O9) | `online_ui.js:1816-1819`, `:1864`. |
| K4-N16 | **OPRAVENO** (O9) | `online_ui.js:1128-1135`, `:2968`, `:2978`, `:3018`. |
| K4-N17 | TRVÁ — rozhodnutí J. V. „ponechat“ (#472) | `vyjimky.js:272-277` beze změny. |
| K4-N18 | **OPRAVENO** (O9) | `zakazka_kontrola.mjs:47-75`; `zakazky.mjs:87`, `:94`. |
| K4-N19 | **OPRAVENO** (O8) | `sloucene_vetve.sh:61-62` (`set -euo pipefail`, `set -f`), `:161-163`. |
| K4-N20 | TRVÁ — mimo repo, J. V. | Rulesets „Restrict deletions“ z repa ověřit nejde. |
| K4-N21 | **OPRAVENO** | `kokpit_sablona.html:407-409` (`trida` z povoleného seznamu). Nový problém v témže souboru → K5-W1. |
| K4-N22 | **OPRAVENO** (O8) | `test_sod_en.js:209-213` (česká DPH výslovně + kontrolní případ bytový dům). |
| K4-N23 | **OPRAVENO** (O9) | `netlify/test_obnova.mjs:68-72`, `:118`. |

## Co testy nehlídají (podklad pro opravnou dávku)

- **Server / controlling:** objekt v `pdDealId` (K5-S1 — 500 v uložení i pád obnovy); uložení beze změny s neplatným uloženým `pdDealId` (K5-S2; `test_controlling.js:428` měří jen smazání); stropy 150 zakázek a 5 MB odpovědi exportu (test 413 i mutace chybí, testuje se jen strop čtení `test_controlling.mjs:202-206`); GET protokolu vrací 50 záznamů; souběh potvrzení retence s nočním během a souběžné zápisy protokolu (K5-S3); doba exportu nad 600 zakázkami (K5-S4); `retence-potvrdit` od obchodníka/vedoucího (test jen 401 nepřihlášeného, role kryje sdílené `vyzadujRoli`).
- **Klient / dokumenty:** CSV buňky `+ `, `- `, `+\t` (K5-K1) a záložní cesta `ctrlCsvBunka` (K5-K3); tlačítko „Export pro controlling“ v Přehledu jen admin online a ne v náhledu a pole `#ctrlPdDeal` jen admin — hlídá jen prohlížečový harness `overit_controlling.mjs:201-214` (mutace žádná); mutace „`kryciZmrazPodminky` nezaloží `kapitoly`“ chybí (kryje jen `test_o10_kapitoly.js:70`); obsah snímku na serveru (K5-K2); `{FIRMA}` v doložkách PROJ po přejmenování firmy; tlačítko „Úbytek byl záměrný“ jen `overit_online.mjs:985-989`; vstup ceny výjezdu v UI jen `overit_o11_vyjezd.mjs`.
- **W2:** mazání krátkým jménem (K5-W4), prázdný/nečíselný čas commitu (K5-W7), filtr nečíselné odpovědi API (`:169`), jména se znaky `& # %` v dotazu na API (K5-W2), samotný YAML workflow (`if` na `main`, předání přes `env`) — žádný test ho nečte, zbytek K4-N2 bez API (K5-W3). Oproti K4 je cesta „smazání selhalo“ už hlídaná (mutant `|| true` zachycen, 5 kontrol).

## Co je v pořádku

- **Controlling — oprávnění:** `/api/controlling` (GET, POST), `/api/controlling/export` i protokol volají `vyzadujRoli(…,'Administrátor')` (`controlling.mjs:33`, `controlling_export.mjs:33`); matice `test_prava.mjs:410-435` pro všechny role. Autor verze i exportu (`kdo`) ze serveru (mutace „#447 C3: autora exportu určí dotaz“, „#447: autora verze controllingu určí klient“).
- **Controlling — vstupy:** `od`/`do` regexem a zpětným převodem, období ≤ 400 dní, `oblast`/`rada` z pevného výčtu, neznámá hodnota 400 (ne tiché „obojí“) (`controlling.js:644-656`); do klíčů Blobs jde jen `soubor` z rejstříku, který píše server; strop čtení před čtením; tělo POST s dvojím stropem velikosti (413, `controlling.mjs:47-52`); zakázané klíče pokrývají `Object.prototype` (`controlling.js:176-178`), import mapování XLSX s povoleným tvarem klíčů (`:918-926`).
- **Protokol exportů:** zapisuje jen server, drží 200 záznamů (`controlling.js:702-705`), GET vrací 50; e-mail správce a rozsah filtru, osobní údaje zákazníků ne. Mimo zálohy podle schválení J. V.; controlling sám je v otisku, kopii na Disk i obnově (`zalohovani.mjs:59`, `:78`, `:500-501`; `obnova.mjs:536-537`).
- **Export:** server vrací JSON, soubor skládá prohlížeč; XLSX jen `inlineStr`; bere zmrazený výsledek jen zamčené řídící varianty (`zamek.js:179-209`, `controlling.js:568-573`, mutace C2, C3).
- **pdDealId:** jediné serverové cesty zápisu zakázky (`zakazky.mjs:149`, `obnova.mjs:577`) jdou přes `zakazkaServerKontrola`; 403 jiné roli i u nové zakázky; duplikát nepřebírá (`zakazka.js:1652`); pole jen v admin kartě.
- **XSS:** data zakázky v `controlling_ui.js` přes `esc` (číslo, název, `pdDealId`, protokol, soubor importu, chyby — `:305-308`, `:389-393`, `:419-431`), hlášky escapované; `seznam_ui.js:251-253` nic neinterpoluje; `kalk_proj.js:592-604` přes `esc`.
- **Retence / heslo správce:** heslo jen v lokální proměnné, jednou v těle požadavku, neloguje se; den a stav varování se kontrolují před heslem (špatný den nespotřebuje pokus), limit pokusů sdílený (`sdilene.mjs:579-598`); rezervace vynuceného otisku se uklízí, neblokuje > 24 h.
- **#451 a K29-N1:** přepsaná plocha zastřešení pod B112 a kontrolou záporných hodnot (`uloziste.js:1141`, `:1471`), nečitelný přepis → vypočtená plocha (`engine.js:1115-1116`), test `test_mustky.js:282-288`.
- **W2:** vstupy jen přes `env:`, `concurrency`, `timeout-minutes: 10`, žádné cizí akce; test si ruší `GITHUB_ACTIONS`/`GITHUB_REF` (v CI nedá falešný výsledek); mutační nástroje vracejí zdroják ve `finally` i na SIGINT/SIGTERM/SIGHUP a drží zámek.

## Doporučený postup

<!-- K5-POSTUP -->
