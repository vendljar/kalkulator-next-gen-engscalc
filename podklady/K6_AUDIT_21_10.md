# Bezpečnostní audit K6 — Kalkulator Next Gen v21.10.5

- **Datum:** 21. 10. 2026 (dávka K6, roadmapa #475; koordinace „ŘÍDÍCÍ 21.10 noc 2“). Zadání: celé kolo s mutacemi + audit jako podmínka návrhu posunu `test` → `main`.
- **Kód:** `7fac477` (v21.10.5 = `test`); zápis ve větvi `claude/k6-kolo`. Kód aplikace se v dávce neměnil.
- **Navazuje na:** `podklady/K5_AUDIT_21_10.md` (K5-S1…K5-W7) a `podklady/K4_AUDIT_20_10.md`.
- **Rozsah:** `git diff 7652bb9..7fac477` (v21.10.4 → v21.10.5; 42 souborů, 27 commitů): O12 #474 (průvodce šablon — jazykové verze k platné češtině), S11 (šablona SoD realizace v4, `vyrob_sablony.js --sod-real-v4`), Controlling C5 (export v2) + C6 #447 (objednané příplatky — `src/objednane.js`, `objKontrola` na serveru, krycí list, export `podle=prodej`, SoD), O13 (opravy K5-S1, K5-K1 + K5-K3, K5-W1, K5-W2; „(DPZ)*“ v jazykové verzi), zápis K5.
- **Metoda:** jen čtení ve třech čočkách třemi nezávislými subagenty — (1) server, autorizace, úložiště; (2) klient, dokumenty, XSS, zámek a integrita odeslané nabídky; (3) nástroje, W2, CI, supply chain, tajemství. Pokusy nad kopiemi stromu (`git archive 7fac477`) s úložištěm v paměti, W2 nad lokálním holým repem s podvrženým `gh`; nikdy proti GitHubu ani síti. Nálezy K6-S1, K6-S3, K6-K1, K6-K2, K6-W1 a K6-W2 ověřeny druhým, vlastním čtením kódu. Opravy kódu se v dávce nedělaly (zadání).
- Ceny ani osobní údaje v auditu nejsou.

## Testovací kolo

Celé kolo nad `7fac477` (v21.10.5), 21. 10. 2026 od 16:30 UTC; `ADMIN_EMAIL=spravce@priklad.cz`, `KNG_NEZVYSOVAT_VERZI` do kola NEexportováno:

| Krok | Výsledek | Pozn. |
|---|---|---|
| Kontrola verze + sestavení | ✓ | `bash nastroje/testovaci_kolo.sh --jen build,sady,staticke` |
| Sady (`spust_testy.sh --smoke`) | **296 prošlo / 0 selhalo / 6 přeskočeno** (302 sad) | 19 min 0 s; přeskočené `test.js` (ostrý ceník) + 5 harnessů bez `KNG_PODKLADY` (`overit_manual`, `overit_nabidka_proj_word`, `overit_sablona`, `overit_sablony_online`, `overit_sod`) |
| Statické kontroly | **4/4** | verze, CRLF, osobní údaje a tajemství, test výběru větví W2 51/0 |
| Mutace jádra (`mutace_jadro.mjs`) | _běží_ | 417 mutací, samostatný `git worktree` nad `7fac477` |
| Mutace serveru (`netlify/mutace.mjs`) | _běží_ | 753 mutací, 64 souborů = 64 částí filtrem podle cesty souboru ve třech frontách (3 `git worktree` nad `7fac477`); `--kontrola` 753/753 |

## Verdikt

_Doplní se po doběhnutí mutací._

| | Počet | Nálezy |
|---|---|---|
| Kritické | 0 | — |
| Vysoké | 0 | — |
| Střední | 1 | K6-K1 |
| Nízké | 9 | K6-S1, K6-S2, K6-S3, K6-K3, K6-K4, K6-W1, K6-W2, K6-W3, K6-W4 |
| Informativní | 12 | K6-S4 … K6-S7, K6-K2, K6-K5 … K6-K9, K6-W5, K6-W6 |

## Nálezy — opravit bez J. V.

Jasné a malé; doporučeno jednou opravnou dávkou (jedna verze, testy s pojistkou před/po, mutace).

| ID | Vážnost | Oblast | Nález | Kde (7fac477) | Oprava |
|----|---------|--------|-------|-----|----|
| **K6-K1** | **střední** (funkční, integrita záznamu) | C6 — objednané příplatky | **Objednaný vlastní příplatek nejde uložit, SoD se s ním přesto vytiskne.** Klíč vlastního příplatku je `vlastni:N` (`src/engine.js:2197`, `:1929`); `OBJ_KLIC_TVAR = /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/` dvojtečku nepustí → `objKontrola` vrátí 400 „neplatný nebo zdvojený klíč“ (pokus) a server odmítne celé uložení zakázky. Karta ho nabízí (`objNabidnute`), `objNastav` tvar neověřuje a `sodWordGeneruj` tiskne z lokální `ZAK` (`src/ui/sod_ui.js:88`) — smlouva odejde s vlastním příplatkem v ceně díla, záznam tisku SoD (`zamekPoTisku`, `kryciZmrazSod`) se na server nedostane. | `src/objednane.js:31`, `:97-110`, `:150-152` | povolit `:` v `OBJ_KLIC_TVAR` (`[A-Za-z0-9_.:-]`); test „vlastní příplatek objednán → null“ (bez opravy 400) + mutace |
| **K6-S1** | nízká | C6 — vstup serveru (třída K4-N12 / K5-S1) | **Objekt v `objednane.klice[]`, `.varianta` nebo `.datum` shodí uložení zakázky na HTTP 500.** `objKontrola` volá `objOtisk` dřív, než ověří tvar; `objOtisk` dělá `String(o.varianta)`, `o.klice.map(String)`, `String(o.datum)` → u JSON `{"toString":1}` TypeError, `zakazkaServerKontrola` volání nemá v `try`. Pokus (obchodník, POST `/api/zakazky`): `klice:[{"toString":1}]` → „Cannot convert object to primitive value“, nic se nezapsalo; totéž `varianta`, `datum`. V obnově (smyčka bez `try`) by výjimka přerušila dávku uprostřed — odvozeno z kódu, nespouštěno (obnova jen Administrátor). | `src/objednane.js:113-125`; `netlify/lib/zakazka_kontrola.mjs:249-257`; `netlify/functions/zakazky.mjs:141`; `netlify/functions/obnova.mjs:586` | na začátku `objKontrola` ověřit tvar (`varianta`, `datum` string, `klice` pole stringů ≤ 200) → 400; `objOtisk` s `typeof`; test 500 → 400 v uložení i obnově + mutace |
| **K6-S3** | nízká | C6 — typ `varianta` | **`objednane.varianta` jako pole `["<id>"]` projde a skryje prodej z exportu.** `String(["id"]) === "id"` v `objOtisk` i `vari(zak, String(…))`; uloží se pole, export a krycí list ale porovnávají `=== v.id`. Pokus (obchodník): uložení 200; `ctrlHromadnyZakazka` s `podle=prodej` → `mimo`, zakázka tiše chybí i mezi přeskočenými; `ctrlExportVarianty` → prázdné datum prodeje, 0 řádků „Objednáno dodatečně“; `objText` → „nic objednáno“. | `src/objednane.js:115`, `:144`; `src/controlling.js:604`, `:713-717` | vyžadovat `typeof nova.varianta === 'string'` (spolu s K6-S1); test |
| **K6-W1** | nízká | Kokpit koordinace — XSS (zbytek K5-W1 jinou cestou) | **Jméno větve s `</ScRiPt>` vyskočí z datového bloku kokpitu.** Data leží v `<script type="application/json">`; prohlížeč blok ukončí na `</script` bez ohledu na velikost písmen. `claude/x</ScRiPt><svg/onload=alert(1)>` git povolí (`check-ref-format`), `kontrola.py` hledá jen malé `</script>` a vrátí „kokpit JSON OK“ (pokus). Spuštění v prohlížeči odvozeno ze specifikace HTML. `overit_kokpit.mjs` data vkládá s `<` → `<`, SKILL.md to ale nepředepisuje. | `.claude/skills/kokpit-koordinace/kokpit_sablona.html:109`; `.claude/skills/kokpit-koordinace/kontrola.py:3` | při zápisu dat vždy `<` → `<` (SKILL.md); `kontrola.py` odmítne `<` v datovém bloku |
| **K6-W2** | nízká | Statická kontrola osobních údajů | **`kontrola_udaju.py` nečte `podklady/` ani `.claude/`.** `SLOZKY = ['src','netlify','server','nastroje','manual','roadmapa','.github']` + kořen; pokus: e-mail a telefon v `podklady/*.md` a token tvaru `ghp_…` v `.claude/skills/*/SKILL.md` prošly jako čisté. Přitom tam leží předávky, audity a data kokpitu. | `nastroje/kontrola_udaju.py:31` | přidat `podklady` a `.claude`, případné výskyty do povoleného seznamu |
| K6-W3 | nízká (funkční) | S11 — `vyrob_sablony.js --sod-real-v4` | `<w:ind>` se vkládá hned za `<w:pPr>`, tj. **před** `<w:pStyle>` — porušuje pořadí prvků `w:pPr` podle schématu OOXML (pokus). `test_sod_real_v4.js` ani `docxXmlVady` pořadí nehlídají. Zda Word hlásí nečitelný obsah nebo styl ignoruje, je neověřené. | `nastroje/vyrob_sablony.js:1052` | vkládat za `pStyle`/`numPr`; vyrobenou v4 před zveřejněním otevřít ve Wordu |
| K6-W4 | nízká | W2 — test | Diakritiku ve jméně větve test nepokrývá: mutant bez `local LC_ALL=C` prošel 51/0; v C.UTF-8 by `claude/příliš` zakódoval chybně (API nevrátí čas → slabší pojistka K5-W3). | `nastroje/test_sloucene_vetve.sh:205-217`; `nastroje/sloucene_vetve.sh:139` | scénář s diakritikou |
| K6-S4 | informativní | C6 — povolený seznam polí | `objednane` s polem `x` o 100 kB a vlastním klíčem `"__proto__"` → 200, uloží se celé (prototype pollution nenastala). U „beze změny otisku“ se cizí pole uloží bez nového razítka; v obnově zůstane i prázdný záznam. | `netlify/lib/zakazka_kontrola.mjs:251-257`; `src/objednane.js:113-116` | server sestaví záznam jen z `{varianta, klice, datum, kdo, kdy}` |
| K6-S6 | informativní | Controlling export | `ctrlHromadnyZakazka` ve smyčce exportu není v `try` — nečekaný tvar uložené zakázky by shodil celý export na 500 místo „přeskočeno“. Dnes nedosažitelné (server takový tvar neuloží). Odvozeno z kódu. | `netlify/functions/controlling_export.mjs:72`; `src/controlling.js:699-719` | obalit `try`, zapsat jako přeskočenou |
| K6-K5 | informativní | C6 — UI | Karta tiše přepíše objednané u jiné zamčené varianty (`objUiPrepni` začne prázdným seznamem); server to dovolí, není-li stará varianta podepsaná. | `src/ui/sod_ui.js:137-145`, `:151-176` | upozornění / `potvrd` |
| K6-K6 | informativní | C6 — SoD | Vlastní název příplatku s `\n` se ve SoD rozpadne na dva řádky (vypadá jako další položka). XML escapované správně, strukturu docx podvrhnout nejde (pokus). | `src/sod.js:263` | v názvu `\s+` → mezera |
| K6-K8 | informativní (předchozí stav) | Controlling — XLSX | `xlsxEsc` neodstraňuje řídicí znaky XML (U+0000–U+001F mimo TAB/LF/CR) — název akce nebo zákazník s takovým znakem rozbije XLSX, u hromadného exportu celý soubor za období. Odvozeno z kódu. | `src/xlsx.js:20-23` | filtr jako `XML_RIDICI` v `docxgen.js` |
| K6-K9 | informativní | C6 — UI | Karta ukazuje u eurové nabídky ceny příplatků v Kč, SoD tiskne eura. | `src/ui/sod_ui.js:162-165` | měna dokumentu |
| K5-S2 | informativní (trvá z K5) | Controlling C4 | V O13 neopraveno: neplatné uložené `pdDealId` dál blokuje uložení beze změny (`ctrlPdDealKontrola({pdDealId:'x'},{pdDealId:'x'},'Obchodník')` → 400, pokus); komentář slibuje opak. | `src/controlling.js:760-766` | shoda příchozí a uložené přeskočí kontrolu tvaru; test |
| K5-W4 | informativní (trvá z K5) | W2 — test | Mutant `--delete "$v"` dál prošel (51/0). | `nastroje/test_sloucene_vetve.sh` | scénář s větví shodnou s tagem a `-x` |
| K5-W7 | informativní (trvá z K5) | W2 — test | Mutant bez kontroly nečíselného času i bez filtru nečíselné odpovědi API (`:183`) prošel 51/0. | `nastroje/sloucene_vetve.sh:161-163`, `:183` | volitelné |

## Nálezy — rozhodnutí J. V.

| ID | Vážnost | Oblast | Nález | Kde (7fac477) | Doporučení |
|----|---------|--------|-------|-----|----|
| **K6-S2** | nízká | C6 — pravidlo „po podpisu SoD jen admin“ (Q3) | **Obchodník podpis „vrátí“.** `sodDatumPodpisu` je volné, dokud zámek nemá tisk `sod`; server bere „podepsáno“ jen z uložené verze a změnu data podpisu nehlídá. Pokus (obchodník-autor): datum podpisu = dnes → 200; změna objednaných → 403 (správně); smazat datum podpisu → 200; změna objednaných → **200**. Jde i běžným UI. A dále: datum podpisu `2999-01-01` → 200, dotisk `sod` → 200 (datum pak zamčené), obchodník objednané mění i maže → 200. Posun do budoucna je zapsaný jako mez (`BEZPECNOST_MEZE.md:1014-1016`), „vrácení“ podpisu ne. | `src/objednane.js:55-64`, `:134-149`; `src/zamek.js:313-331`; `netlify/lib/zakazka_kontrola.mjs:368-370` | ne-adminovi odmítnout změnu/smazání platného uloženého data podpisu ≤ dnes (403) a datum podpisu v budoucnosti (400), nebo brát tisk `sod` jako podepsáno; aspoň doplnit mez |
| K6-K3 | nízká | C6 — SoD vs. nabídka | Nabídka tiskne přechodové plechy (`prechMat` + `prechMont`) jedním řádkem a v eurech zaokrouhluje nahoru součet; karta i SoD je berou po položkách — jde objednat jen půlku, ve smlouvě jsou dva řádky s názvy, které v nabídce nebyly, a v eurech o 1 € víc (pokus). | `src/nabidka.js:429`, `:473-477`; `src/sod.js:255`, `:263`; `src/objednane.js:67-77` | sloučit dvojici v kartě i ve SoD jako v nabídce |
| K6-K4 | nízká | C6 — stopa tisku SoD | Záznam tisku SoD neukládá otisk objednaných ani cenu díla; po tisku může admin objednané změnit (obchodník jen s budoucím datem podpisu) a krycí list, export i dotisk pak ukážou jinou cenu díla než podepsaná smlouva, bez stopy. Text meze „tisk SoD se do pravidla nepočítá“ je nepřesný — první tisk opíše do krycího listu datum podpisu (dnešek), takže `objPodepsano` je hned true (odvozeno z kódu). | `src/zamek.js:339-358`; `src/ui/zamek_ui.js:336`; `src/kryci.js:420-421`, `:969-984`; `BEZPECNOST_MEZE.md:1008-1016` | ukládat do záznamu tisku SoD `objOtisk` + cenu díla; upřesnit text meze |
| K6-K2 | informativní | C6 — SoD se starší šablonou | Se šablonou bez rozpisu (v3 je dosud platná, v4 nezveřejněná) a s objednanými příplatky dostane SoD vyšší celkovou cenu než nabídka bez vysvětlujícího rozpisu (pokus `sodData` se symboly jen `CENA_BEZ_DPH`). Je to **záměr C6** (CHANGELOG: „Starší šablony dostanou správnou celkovou cenu, jen bez rozpisu“), ale chybí test i upozornění. | `src/sod.js:244-268` | zveřejnit v4 CZ/EN/DE/FR spolu s C6 (postup `podklady/SABLONA_SOD_REALIZACE_V4_21_10.md`); případně upozornění v dialogu SoD, dokud šablona nemá `SOD_PRIPLATKY_OBJEDNANE` |
| K6-S5 | informativní | C6 — datum prodeje | Datum prodeje nemá spodní mez (`1900-01-01` → 200); obchodník přesune prodej do jiného, i už vyexportovaného období `podle=prodej`. | `src/objednane.js:142-143` | datum ≥ den zámku varianty |
| K6-S7 | informativní | C6 — obnova | Obnova ze souboru přebírá `objednane.kdo`/`kdy`, jak jsou (u zámku a odemčení se razítkům ze souboru nevěří — B98). Jen Administrátor. | `netlify/lib/zakazka_kontrola.mjs:244-258`; `netlify/functions/obnova.mjs:584-586` | razítko ze souboru jen při shodě s databází, jinak relací obnovujícího |
| K6-K7 | informativní | Controlling — CSV | Bez apostrofu zůstanou `" =1"`, `" =1"`, `"＝1"`, `"\n=1"`; sadu OWASP (`= + - @ TAB CR`) `ctrlCsvBunka` pokrývá. Vyhodnocení Excelem neověřené (pravděpodobně ne). | `src/controlling.js:906-912` | ponechat |
| K6-W5 | informativní | Veřejné repo — hygiena (K5-W6) | Křestní jméno zaměstnankyně controllingu: 47 výskytů (7652bb9) → 48 (7fac477), nově `netlify/mutace.mjs:916`; iniciála + příjmení téže osoby 4× ve 3 souborech (`src/controlling.js:5`, `roadmapa/roadmap.json`, `podklady/CONTROLLING_NAVRH_20_10.md:20`); mimo diff celé jméno externího dodavatele v `podklady/CONTROLLING_NAVRH_20_10.md:149`, `:331`, `:360`. Není to zákazník ani cena. | viz text | nahradit rolí („controlling“, „lakovna B“) |
| K6-W6 | informativní | Ceny v podkladech | Tabulka ověření SoD v4 uvádí konkrétní výsledné částky ze „zkušebního ceníku“ (i s 1 a 3 příplatky); původ ceníku neověřen. | `podklady/SABLONA_SOD_REALIZACE_V4_21_10.md:96-97` | ověřit, že jde o smyšlená čísla, jinak nahradit vztahy |

Trvají z K5 (beze změny, čekají na J. V.): **K5-W3** (první ostrý běh W2 s `jen_vypsat`, Rulesets K4-N20), **K5-W5** (Rulesets), **K5-K2** (obsah snímku kapitol — mez v `BEZPECNOST_MEZE.md` dosud nezapsaná), **K5-S3** (souběh potvrzení retence), **K5-S4** (doba hromadného exportu — neměřeno), **K5-K4** (export varianty jen s klientskou hranicí — ponechat), **K5-S5** (vědomá mez B88).

## Regrese K5 a K4

| Nález | Stav | Doklad (7fac477) |
|---|---|---|
| K5-S1 | **OPRAVENO** (O13) | `src/controlling.js:753-755` (`typeof` string/number, jinak `null` → 400); pokus: objekt → 400, `1e3` a `" 12 "` od admina → 200; test `netlify/test_prava.mjs` (objekt i pole), obnova jde touž funkcí. Táž třída chyby nově v `objednane` → K6-S1. |
| K5-S2 | TRVÁ (v O13 neopraveno) | `src/controlling.js:760-766`, pokus → 400 |
| K5-S3, K5-S4, K5-S5 | TRVAJÍ (J. V. / vědomá mez) | `zaloha_vynuceno.mjs:93`, `controlling_export.mjs:56-89` beze změny mezí; `podle=prodej` jde stejným předvýběrem a nic nevynechá |
| K5-K1 | **OPRAVENO** (O13) | vlastní `ctrlCsvBunka` (`src/controlling.js:903-912`); pokus `"+ 1+1"`, `"-\tX"`, `"-1e5"`, `"+420…"`, `"@…"`, `"\r=1"` dostanou apostrof, čísla zůstanou čísly; test `src/test_controlling.js:313-327`, mutace `netlify/mutace.mjs:822` |
| K5-K3 | **OPRAVENO** (O13) | `ctrlCsvBunka` nezávisí na `csvBunka` |
| K5-K2, K5-K4 | TRVAJÍ (J. V.) | beze změny |
| K5-W1 | **OPRAVENO** (O13; jiná cesta → K6-W1) | `esc` na výstup `kratko`, `%E0` nic neshodí; pokus `%3Cimg…onerror…%3E` → text; `overit_kokpit.mjs` +3 kontroly |
| K5-W2 | **OPRAVENO** (O13; diakritika bez testu → K6-W4) | `uri_segmenty` souhlasí s `encodeURIComponent` po segmentech (`& # % ? = + mezera ; " \`, čeština, €, emoji; locale C i C.UTF-8); ruční mutanty (nezakódovaný dotaz, `%`, `#`, `/`) test chytí |
| K5-W3, K5-W5 | TRVAJÍ (J. V.) | `sloucene_vetve.sh:38-39`, `smazat_vetve.yml:50` beze změny |
| K5-W4, K5-W7 | TRVAJÍ (v O13 neopraveno) | mutanty prošly 51/0 |
| K5-W6 | TRVÁ, +1 výskyt | → K6-W5 |
| **K4-N1…K4-N23** | **regrese žádná** | serverové soubory K4 (`zaloha_vynuceno.mjs`, `zalohovani.mjs`, `obnova.mjs`, `zakazky.mjs`, `sdilene.mjs`) se nezměnily; `docxgen.js` jen `docxPrelozUseky` (lineární regexy); `firma.js`, `podminky_ui.js` beze změny, `online_ui.js` jen převod base64; snímek kapitol (K4-N1) beze změny, C6 nesahá do `v.data` ani otisku zámku; W2: N3 (`--force-with-lease`, `:203`, mutant chycen), N10, N11, N19 testy prochází, N21 `trida()` na místě; N17 ponecháno (J. V.), N20 mimo repo |

## Statické kontroly a supply chain

- Přidané řádky `src/` (1030): `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`/`eval`/`new Function`/`javascript:` — 0 nových; `onclick`/`onchange` s interpolací 4× (`sablPruvodceZverejni()` 2× bez argumentu, `objUiPrepni('${escJs(p.key)}', …)`, `objUiDatum(this.value)`) — v pořádku; pokus XSS v `objKarta` (název `<img onerror>`, klíč `x');alert(1);//`, datum `" onfocus=…`) bez úniku. Nové regexy (`OBJ_DATUM_TVAR`, `OBJ_KLIC_TVAR`, `/^[=+\-@\t\r]/`, `/\(/g`, `/\)\s*$/`) ukotvené a lineární.
- `kontrola_udaju.py` čistá (485 souborů; mimo rozsah složek viz K6-W2); přidané řádky celého diffu: jen smyšlené `@priklad.cz` / `@example.com`, žádné telefony, tokeny, klíče, hesla; ceny jen K6-W6 a zjevně smyšlené v testech.
- `.github/workflows/*`, `package.json`/lock, `netlify/package*.json`, `netlify.toml` (CSP a hlavičky) beze změny; `build.py` jen přidal `objednane.js` do CORE. `--kontrola` mutací: jádro 417/417, server 753/753.
- `--sod-real-v4` vkládá jen konstantní, pro XML escapované texty, jazyk z pevného výčtu, výstup `…_v4` nepřepíše vstup.

## Co testy nehlídají (podklad pro opravnou dávku)

- **C6 server:** objekt v `objednane.klice`/`varianta`/`datum` v uložení i obnově (K6-S1); `varianta` jiného typu (K6-S3); dvoukrokové „vrácení“ podpisu a budoucí datum podpisu s tiskem SoD (K6-S2 — `test_prava.mjs:1676-1714` jen jednokroková změna); cizí pole a `__proto__` v `objednane` (K6-S4); datum prodeje před zámkem (K6-S5); obnova s `objednane` (`netlify/test_obnova.mjs` ho nezmiňuje) a razítka ze souboru (K6-S7); přepis `kdy` (mutace hlídá jen `kdo`, `kdy` jen test `o1`); výjimka v exportní smyčce (K6-S6); K5-S2.
- **C6 klient / SoD:** objednávka vlastního příplatku (K6-K1); SoD s objednanými a šablonou bez rozpisu (K6-K2); dvojice přechodových plechů (K6-K3); escapování `objKarta` (bez testu i mutace — jen pokus auditu); přepsání záznamu jiné varianty (K6-K5).
- **Nástroje:** `</ScRiPt>` v datech kokpitu a `kontrola.py` (K6-W1); rozsah složek `kontrola_udaju.py` (K6-W2); pořadí prvků `w:pPr` (K6-W3); diakritika ve W2 (K6-W4); K5-W4, K5-W7; YAML workflow.

## Co je v pořádku

- **C6 — role a razítka:** obchodník na cizí zakázce → 403 (pokus); vedoucí a admin smějí; beze změny `objednane` projde každému; `kdo`/`kdy` ze serveru, podvrh se přepíše, beze změny drží razítko uložené verze.
- **C6 — data:** klíč musí být nabídnutý v zamčené variantě (zmrazený výsledek, porovnání se zámkem v témže požadavku); datum v budoucnosti → 400; nezamčená varianta → 400; 300 000 klíčů → 400 za 0,35 s (strop 200, tělo ≤ 4 MB).
- **Zámek odeslané nabídky:** objednané leží v `zak.objednane` mimo zámek; `nabidkaData` beze změny (test „C6 nabídka se … nemění“); DPH ve SoD z celku stejně jako v nabídce; odstavce rozpisu se mažou jen u šablony, která symboly má; hodnota se nerozvine podruhé (`&#123;`).
- **Export:** `podle` z pevného výčtu (neznámá → 400), zapisuje se do protokolu, export dál jen Administrátor; `ctrlHromadnyVarianta` / `povolitNeridici` jen v hromadném exportu; XLSX jen `inlineStr` a čísla.
- **O12 průvodce šablon:** verze, název souboru i chyby po jazycích přes `esc` / dialog s escapem; shoda s platnou češtinou se před zveřejněním ověří znovu; chyba jednoho jazyka nezastaví ostatní; server beze změny.
- **Mutační nástroje:** nové mutace míří na existující úseky; `ui/sablony_sprava_ui.js` v `JADRA` (zálohuje se a vrací); server přidal sady `test_objednane.js` a `test_sod.js`.

## Doporučený postup

_Doplní se po doběhnutí mutací._
