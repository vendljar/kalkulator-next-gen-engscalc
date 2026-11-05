# Prompt: opravy nálezů kola 40 — v2 s rozhodnutími J. V. ze 4. 11. 2026

Pracuj v nové paralelní větvi `claude/k40-opravy` založené nad commitem, který ti koordinace pošle ve zprávě „SPUSŤ K40 nad <SHA>“ (bude to `origin/test` po sloučení dávek z 4. 11.: RC #561 ruční cena, SV #564 světlíky, PR prodaná = řídící, IK interní poznámky na krycím listu, MV4 manuál). Výchozí v4.11.4 (b751c91) z kola 42 už NEPLATÍ. Do `test-draft`, `test` ani `main` nic neslučuj, o sloučení rozhodne J. V. Komunikace česky. Na začátku přečti `CLAUDE.md` a `PREDAVKA.md` a spusť `bash nastroje/instaluj_hooky.sh`.

**Podklady:**
- `podklady/K40_PRIPRAVA.md` — krok 0 všech bodů nad integrací (stav, místo, kolize). Čísla řádků v tomto promptu jsou z `9a16ff5` (integrace v4.11.8 se všemi dávkami ze 4. 11.: RC, SV, PR, IK, MV4). Ověřeno i nad `000924e` (`origin/test` = `origin/main` = v4.11.8, proti `9a16ff5` jen PREDAVKA) — řádky beze změny. Roadmapa: K40 má volné **#567**, dávka PH (`claude/ph-proj-hlavicka`) bere od **#568** — další položky K40 až za posledním číslem PH (ověř grepem v `roadmapa/roadmap.json`).
- **Souběh s dávkou PH** (hlavička ceny PROJ, text studie v `src/nabidka_proj.js`/`src/podminky.js`, sklo 4.4.1 v textu OCK): je-li ve výchozím commitu a mění názvy řádků skla (`skloVolba`) nebo heslo „Sklo VSG 4.4.1“, zopakuj krok 0 u K40-N1 — vzor migrace musí sedět na starý i nový název.
- `Testovani/2026-11-04_kalkulator_BEZPECNOSTNI_AUDIT_v4.11.3.md` na Disku.
- Rozhodnutí J. V. ze 4. 11. 2026 jsou zapsaná přímo u bodů níž (v1 tohoto promptu je měla jako otevřená).
- Prompt vydává koordinační sezení „Zefektivnění programu“ (`PROMPT_KOORDINACE_ZEFEKTIVNENI_PROGRAMU.md`) a výsledek také ověří.

**Pravidla:**
- **Souběh s dávkami ze 4. 11. (už ve výchozím commitu):** RC #561 přidala ruční ceny (`v.data.rucniCeny`, B195–B198, kontroly `rucniCena*`, počet pravidel kontrol); SV #564 zrušila volbu světlíku „zajistí stavba“ a změnila `src/engine.js` kolem `skloVolba`/světlíků; PR změnila Prodáno a řídící variantu; IK přidala interní poznámky na krycí list. U K40-N1 (sklo v `src/engine.js`) a K40-S1 (Prodáno) proto krok 0 dělej proti výchozímu commitu, ne proti řádkům v tomto promptu.
- **Krok 0 u každého bodu:** nejdřív v aktuálním kódu ověř, že vada pořád trvá. Když je už opravená, napiš to jednou větou a pokračuj dalším bodem.
- **Kde se smí měnit:** jen v `src/`, `netlify/`, `nastroje/`, `BEZPECNOST_MEZE.md` a harnessech `overit_*.mjs`. `dist/` needituj.
- **Data:** žádné ceny ani osobní údaje do repa. Testy jen se zkušebním ceníkem a smyšlenými účty.
- **Testy a mutace:**
  - Každý nový test musí mít pojistku: doložit, že před opravou selže a po ní projde (napiš to do commitu).
  - Ke každé opravě patří mutace v `mutace_jadro.mjs` nebo `netlify/mutace.mjs` a musí být chycená.
  - Mutace se nepřerušují.
- **Na konci:**
  - celé `nastroje/testovaci_kolo.sh` a mutace po částech podle `CLAUDE.md`,
  - zvyš verzi (`python3 build.py`), doplň CHANGELOG a roadmapu, přepiš PREDAVKA.
- `git push --no-verify` je zakázané.
- **Mimo tuto větev:** komentáře v sestavení, minifikaci, mrtvý kód a zápisník poznámek **nedělej**. Přešly do programu Zefektivnění (větve `claude/zef-…`).

## 1. K40-N1 — vyřazené čelní sklo se po změně zasklení nebo typu znovu počítá (střední)

**Kde:** `src/engine.js` — `skloMigraceNazvu` (ř. 458–487, dvojice ř. 463–464) a `skloVolba` (ř. 420–447). Volá ji `skloMigraceAkt` v `src/ui/common.js:74` (volání `:59` a `:797`), při importu také `importZakazka` (`src/zakazka.js:952`). Krok 0 nad 9a16ff5: trvá (dávky 4. 11. sklo nezasáhly).

**Příčina.** Název řádku čelního skla závisí na typu šachty a zasklení:
- `MATERIÁL VSG 4.4.1` — exteriér, nebo interiér „mezi příčníky“,
- `MATERIÁL VSG 4.4.2` — interiér „na terče“.

Vyřazení (`nepocitat`) a přepisy (`mnozstviPrepis`, `cenyPrepis`, `nazvyPrepis` apod.) se klíčují názvem řádku. `skloMigraceNazvu` přemapuje boky, protože vzor `^MATERIÁL boční \+ zadní stěna \(` sedí na starý i nový tvar. Čelní sklo pozná jen ve starém tvaru „MATERIÁL čelní stěna (…“. K37-N1 tak opravil jen boky.

**Reprodukce** (zkušební ceník, Node):
1. Interiér, zasklení „na terče“, 1,6 × 1,8 m, zdvih 15 + přejezd 2, 5 nástupišť. Do `nepocitat` dej `MATERIÁL VSG 4.4.2`.
2. Dál buď `set('Z.zaskleni', 'mezi příčníky')`, nebo `typSachtyPrepni('exteriérová')`.
3. `nepocitat` dál nese `MATERIÁL VSG 4.4.2`, ale řádek `MATERIÁL VSG 4.4.1` se počítá a cena vzroste. Ruční přepisy čelního skla zůstanou bez řádku.

**Oprava:**
- Do `skloMigraceNazvu` přidej dvojici `[/^MATERIÁL VSG 4\.4\.[12]$/, nove.celni.nazev]` nebo ekvivalent, který přemapuje oba názvy čelního skla na aktuální název ze `skloVolba`. Platí pro všechny mapy, které migrace dnes prochází, i pro `nepocitat`.
- Ověř, že se vzor nepotká s řádky jiných sekcí ani s režimem opláštění po stěnách: v `src/` vyhledej všechny výskyty názvů `MATERIÁL VSG`.
- Zamčená varianta se nesmí změnit (`skloMigraceAkt` zámek hlídá — ověř testem). Import se má chovat stejně v prohlížeči i na serveru, aby ověření zámku dál souhlasilo.

**Testy:**
- `src/test_k37_sklo_prepnuti.js` rozšiř, nebo založ `src/test_k40_celni_sklo.js`:
  - int „na terče“ ↔ „mezi příčníky“,
  - int ↔ ext,
  - tam a zpět: cena se vrátí na původní a vyřazení i přepisy čelního skla přežijí,
  - import staré zakázky,
  - zamčená varianta beze změny.
- Rozšiř fuzz `src/test_fuzz_invarianty.js` o invariant „vyřazená položka zůstane vyřazená i po změně zasklení a typu“.
- Mutace: „skloMigraceNazvu bez dvojice pro čelní sklo“.

## 2. K40-X1, K40-X2 — kvadratický ořez konce textu výrazem (nízká)

**Kde:**
- `src/nazvy_souboru.js:50` — `nazevCast`, poslední `.replace(/^[-.]+|[-.]+$/g, '')`.
- `src/preklad.js:1272` (`prekladNorm`), `src/plan_plateb.js:435` (`milnik`), `src/slovnik.js:279` — ořez konce výrazem s kotvou.

**Příčina.** Výraz s kotvou na konci zkouší shodu od každé pozice, takže nad dlouhým textem roste kvadraticky. `nazevCast` volá `nabidkaKarta` při každém `render()` Kalkulace OCK. Název varianty ani zákazník nemají délkový strop. Naměřeno na v4.11.3: 20 000 znaků 0,36 s, 60 000 znaků 3,6 s na jedno volání. Oprava #542 to vyřešila jen v `uloKlicSouboru` (`src/uloziste.js:64–70`).

**Oprava:**
- Jeden společný pomocník (např. `orezKonce(s, znaky)`) se smyčkou místo výrazu, podle vzoru #542. Použij ho ve všech čtyřech místech.
- V `nazevCast` navíc zkrať úsek na rozumnou délku ještě před výrazy, a tím zavři i K10-N1 (název souboru bez stropu). Délku zvol tak, aby se nezměnil žádný dnešní název ze sady `src/test_nazvy_souboru.js`.

**Testy:** u každé funkce text 100 000 znaků do 50 ms a beze změny výstupu proti dnešku na běžných vstupech (`test_nazvy_souboru` 141/0 musí zůstat). Mutace: „nazevCast ořezává koncové znaky výrazem“.

## 3. K40-S2 — diagnostika rozdílu zámku je drahá u hlubokých dat (nízká)

**Kde:** `src/zamek.js:607–637` — `zamekDataRozdilCesta`, rekurze `jdi` (ř. 618) volá na každé úrovni `zamekJsonKanon` obou podstromů. Volá ji `netlify/lib/zakazka_kontrola.mjs:451` při každém 409.

**Oprava:** kanonizace jednou nahoře a sestup přímým porovnáním kanonických struktur, případně strop počtu kroků (po něm vrátit dosavadní cestu s „…“). Výsledná cesta, ořez na 200 znaků a náhrada řídicích znaků se nesmí změnit (sady `test_555*`, `test_555b*`).

**Test:** zamčená varianta s hloubkou 50 a ~2 000 objekty. Odmítnuté uložení nesmí trvat víc než dvojnásobek uložení beze změny (dnes ~6×). Mutace: „rozdíl cesty kanonizuje na každé úrovni“.

## 4. K40-N2, K40-N5 — kontroly věrohodnosti ceníku můstků (drobné)

**K40-N2:** `mustkyCenikKontrola` (`src/engine.js:845–872`, po sloučení návrhu NV posun z 813) hlídá u `C.mustekRefSirkaMm` jen hodnotu > 0 (přes `mustkyCenikNovy`, ř. 783–786). Šířka zadaná v metrech (2 místo 2 000) dá 1 000× dražší materiál můstku a nikdo nevaruje.
- Doplň rozsah věrohodnosti, např. 500–5 000 mm. Mimo něj chtěj při zveřejnění ceníku potvrzení — v dialogu i na serveru (`netlify/functions/program.mjs`), stejným mechanismem jako dnešní potvrzení nuly.

**K40-N5:** kontrola můstků v dialogu (`src/ui/program_ui.js:345–354`) i na serveru (`program.mjs:104–110`) čte jen tuzemský ceník. Zahraniční řada s nulovou hodinovou sazbou montáže a bez sazby montáže můstků dá v zahraniční zakázce montáž můstků za 0 Kč/hod bez potvrzení.
- Kontroluj i složenou zahraniční řadu (`cenikZahrSVychozimi`) a nulu dej na potvrzení.

**Testy:** obě cesty (dialog i server) s potvrzením i bez něj. Mutace u každého bodu.

## 5. K40-S1 a K40-N3 — dolní mez data prodeje (střední, rozhodnutí J. V. 4. 11.)

Oba nálezy jsou ve stejném kódu, proto se opravují spolu.

**Kde** (čísla řádků jsou z v4.11.3 — dávka PR 4. 11. v `src/objednane.js` přidala `prodRidiciSrovnej`/`prodRidiciZamceno` a `prodServer` teď na konci srovnává řídící variantu na prodanou; řádky se posunuly, hledej podle jmen funkcí a respektuj chování PR):
- `src/objednane.js` (`prodDatumOd`, `prodDatumProblem`, `prodServer`).
- `src/zamek.js:652–663` (`ZAMEK_KDY_*`, `zamekKdyProblem`, K7-S5).
- `netlify/lib/zakazka_kontrola.mjs:631–633` (příjem nového zámku).
- `src/ui/sod_ui.js:393–394` (pole data prodeje).
- Nad 9a16ff5: `prodDatumOd` ř. 365, `prodDatumProblem` ř. 371, `prodJedinaZmena` ř. 454, `prodServer` ř. 529 (kontrola data ř. 578, `prodRidiciSrovnej` ř. 586). Razítko `prijato` musí projít i `prodJedinaZmena` (PR ji upravila: srovnává řídící a `aktivni`).

**Příčina S1.** Dolní mez data prodeje je den zámku (`zamek.kdy`). U **nového** zámku (nová zakázka, nový klon varianty) ale `kdy` píše prohlížeč a server ho připustí až 400 dní zpět (K7-S5). Prodej tak jde zapsat do starého, i uzavřeného období controllingu. Stačí špatné hodiny počítače. Pokus kola 40 nad v4.11.3: nová zakázka se zámkem i prodejem −300 dní → 200; existující zakázka s novým klonem −200 dní → 200.

**Příčina N3.** Server připouští čas nového zámku až 10 min napřed (`ZAMEK_KDY_NAPRED_MS`). Tisk těsně před půlnocí s hodinami napřed dá den zámku = zítřek. Prodáno pak do půlnoci serveru nejde zapsat.

**Oprava (rozhodnutí J. V.: čas přijetí serverem):**
- **Razítko serveru:** server při **prvním přijetí** nového zámku zapíše vlastní čas `zamek.prijato` (ISO UTC).
  - Píše ho jen server. U nového zámku příchozí hodnotu zahodí, u uloženého zámku vezme hodnotu z uložené verze.
  - Ověř, že razítko nezpůsobí rozdíl při porovnání zámku (`zamekDataPorovnani`, klíčová pole zámku, dotisk) ani při obnově. Starší klient, který `prijato` nezná, musí dál ukládat bez 409.
- **Dolní mez:** `max(den(kdy), den(prijato) − T)`, kde T = **7 dní** jako tolerance pro tisk bez sítě uložený později. Konstantu pojmenuj a zdokumentuj.
  - Zámek bez `prijato` (uložený před opravou): mez z `kdy` jako dnes.
  - **K40-N3:** výsledná mez nejvýš `dnes` (Praha).
- **Výjimka:** datum pod mezí smí zapsat jen **vedoucí nebo administrátor s vyplněným důvodem**. Důvod se zapíše do historie prodeje (`prodejHistorie`). Obchodník dostane 400, i když důvod vyplní.
- **Jedna funkce pro obojí:** klient (pole data v kartě Prodáno, `min` a hláška) i `prodServer` musí brát mez touž funkcí.

**Testy:**
- Nová zakázka a nový klon s časem zámku −300 a −200 dní a prodejem téhož dne → 400.
- −5 dní (v toleranci) → 200.
- Vedoucí nebo administrátor s důvodem −30 dní → 200 a záznam v historii; bez důvodu → 400; obchodník s důvodem → 400.
- Podvržené `prijato` v příchozích datech se ignoruje.
- Uložený zámek bez `prijato` se chová jako dnes.
- N3: zámek 23:55 SEČ s hodinami o 6 min napřed → prodej dnešním dnem projde, včerejším ne.

**Mutace:**
- „prijato se bere z příchozích dat“,
- „mez bez tolerance / bez prijato“,
- „výjimka bez důvodu“,
- „mez nad dnes“.

## 6. K40-W1 — vazba webhooku na existující kalkulaci: záznam a upozornění (info → oprava, rozhodnutí J. V. 4. 11.)

**Kde:** `netlify/functions/pd_webhook.mjs:149–160`, `:186–187` (`if (bezVazby) zak.pdDealId = dealId`); `src/controlling.js:1021–1029` (`ctrlPdDealKontrola`, pravidlo C4); UI otevření zakázky (`src/ui/online_ui.js`, lišta zpráv).

**Dnes.** Webhook #553 naváže podle čísla nabídky i existující nenavázanou kalkulaci, a to i se zamčenou variantou. Hodnoty variant nemění, ale vazba `pdDealId` vznikne bez člověka a bez záznamu v protokolu. Překlep CN v Pipedrive tak naváže cizí kalkulaci: deal dostane odkaz na ni a stav dealu se k ní páruje i v controllingu.

**Oprava:**
- **Při navázání existující kalkulace webhookem:**
  - Zapiš událost do protokolu zakázky (`protokolZapis`, `kdo: 'pipedrive-webhook'`, deal, číslo nabídky, „navázáno podle čísla nabídky“). `protokol.js` už v jádru serveru je (`netlify/lib/jadro_moduly.cjs:60`). Vzor pole na zakázce mimo varianty, které se zapisuje i u zamčené a prodané zakázky: interní poznámky IK (`netlify/lib/zakazka_kontrola.mjs:531–`).
  - Do zakázky ulož `pdVazbaWebhook = { deal, kdy, cislo, stav: 'ceka' }`.
- **Upozornění při otevření** (každý, kdo zakázku otevře, dokud je `stav: 'ceka'`): „Kalkulace byla <datum> automaticky navázána na deal <id> v Pipedrive podle čísla nabídky.“
  - **„V pořádku“** — potvrdí (`stav: 'potvrzeno'`, záznam v protokolu). Smí každý s právem ukládat.
  - **„Zrušit vazbu“** smí jen **autor zakázky nebo administrátor** (rozhodnutí J. V.). Pravidlo C4 (deal mění jen administrátor) se mění **jen** pro zrušení nepotvrzené vazby z webhooku a hlídá to server.
    - Zrušení smaže `pdDealId`, zapíše `stav: 'zruseno'` a protokol a smaže záznam `pd_webhook/deal:<id>`.
    - Deal přidá do seznamu odmítnutých vazeb zakázky. Další doručení webhooku pro tentýž deal pak tuto kalkulaci **znovu nenaváže** (409 s vysvětlením).
  - Ostatní uživatelé mají místo zrušení **„Vazba je chybná“**: záznam v protokolu a upozornění pro administrátora.
- Zamčená varianta se nemění, vazba je v hlavičce. Upozornění se ukáže i u zamčené zakázky a zakázky jen ke čtení. Potvrzení a zrušení jdou cestou povolené akce nad zamčenou variantou (vzor zápisníku a Prodáno).
- Nová zakázka založená webhookem (autor `pipedrive-webhook`) upozornění nepotřebuje. Vazbu u ní dál zruší jen administrátor.

**Testy:**
- Server: navázání existující kalkulace → protokol + `pdVazbaWebhook`.
- Potvrzení; zrušení autorem a administrátorem → 200; zrušení jiným obchodníkem → 403.
- Webhook po zrušení → 409 a žádná nová vazba.
- Zamčená varianta beze změny.
- Klient: upozornění a obě tlačítka podle role.

**Mutace:**
- „vazba bez záznamu v protokolu“,
- „zrušení vazby kýmkoli“,
- „webhook naváže znovu po zrušení“.

## 7. K40-X4 — výběr srovnávací kopie na Disku (info → oprava, rozhodnutí J. V. 4. 11.)

**Kde:** `src/ui/online_ui.js:2183` (`kopieDiskUklid` od ř. 2157): `const predchozi = jmena.filter(j => datum(j) && datum(j) !== den && j !== kopie.soubor).sort().pop();`

**Dnes.** Jako srovnávací kopie pro pojistku úbytku se bere abecedně poslední jméno ve sdílené složce. Soubor s budoucím datem od kohokoli se zápisem do složky pojistku vyřadí (malý soubor), nebo mazání zastaví (velký).

**Oprava:** brát jen jména s dnem **menším než den aktuální kopie** (`den` pochází z otisku serveru), tedy nikdy s budoucím datem. Jména s budoucím datem ohlásit ve výsledku úklidu jako podezřelá a nemazat je.

**Test:** složka s podvrženou „budoucí“ kopií → srovnává se s poslední skutečně předchozí. Mutace.

## 8. K40-N4 — DPH PROJ u starší zakázky: oprava komentáře (rozhodnutí J. V. 4. 11.)

**Kde:** `src/zakazka.js:925–933` (komentář ř. 932).

Zakázka bez `data.proj` dostane `d.proj.cenik` ze vzoru, včetně sazby DPH. Větev „převezme dosud platnou z ceníku OCK“ (ř. 932) se tak uplatní, jen když `data.proj` existuje a sazbu nemá.

**Chování neměň** (strana PROJ se u zakázky naceněné v OCK zamyká a nuluje, rozhodnutí 1. 10.). Oprav komentář a přidej test, který obě cesty popíše.

## 9. Hygiena testů a dokumentace

- **K40-S4:** do `netlify/test_555b_klon_cenik.mjs` a `netlify/test_555_klon_tisk.mjs` a dalších sad, které `ADMIN_EMAIL` čtou bez výchozí hodnoty — krok 0 nad 9a16ff5: výjimkou dál končí i `test_560_svetliky_stavba`, `test_controlling`, `test_funkce`, `test_klon_sleva`, `test_obnova_nanecisto`, `test_pipedrive`, `test_stary_tvar`; `test_zalohy` dá 31 FAIL doplň výchozí smyšlený e-mail jako v `podklady/K10_pokusy/harness.mjs:7`. Samostatné spuštění musí skončit OK/FAIL, ne výjimkou.
- **X6:** v `src/ui/cenik_ui.js:206`, `:208` (a stejně `:176`, `:177`, `:184`, `:185`) obal `path` do `escJs`. Do seznamu `RIZIKO` v `src/test_escape.js` přidej `path` a `cesta`. Dnes to zneužít nejde, `path` je jen z konstant ceníku.
- **K40-X5:** záložní buňka CSV pro běh bez `format.js` (`src/slovnik.js:148–150` — jiné pravidlo než `csvBunka`; `src/pd_nanecisto.js:141` — bez ochrany vzorců): smazat, nebo sjednotit s `csvBunka` (`src/format.js:118`) včetně ochrany proti vzorcům. Test.
- **K40-T1:** harnessy `overit_nabidka_proj_word.mjs`, `overit_sod.mjs` a `overit_sablony_online.mjs` ať hledají šablonu s nejvyšší verzí (`najdiNejnovejsi`) jako `overit_sablona.mjs`. Na Disku jsou šablony verzované (CN v15, PROJ v8, SoD v4) a pod pevným jménem se nenajdou. Při chybějící šabloně dál platí přeskočení s kódem 4.
  - `overit_sablony_online.mjs` (část „správa šablon“) ať nechce přesně CN v11.
  - `overit_sod.mjs` dnes umí jen smlouvy v1 a v2 si vyrábí sám (`vyrob_sablony.js`). Nad aktuální v4 spadne výjimkou „šablona už seznam plateb má“. Ať pozná, že šablona už je převedená, a ověří ji přímo. Nikdy nesmí skončit výjimkou místo FAIL nebo přeskočení.
- **K40-T2:** `overit_online.mjs:1170` čeká na `ONLINE_STAV.obnova.soubor || ONLINE_STAV.obnova.hlaska`. Podmínku ale splní už průběžná hláška „Načítám soubor…“ (`src/ui/online_ui.js:3292`), takže kontrola #523 pod zátěží selže (v kole 274/1, samostatně 275/0). Čekej na `souborJmeno` nahraného souboru, nebo na hlášku, která nezačíná „Načítám“. Totéž zkontroluj u dalších `waitForFunction` (např. `overit_online.mjs:1116`, `:1183`, `:1193`, `:1208`) v harnessech, které čekají na „jakoukoli hlášku“.
- **K40-T3 (táž příčina jako K39-N2):** `overit_sablony_online.mjs:182`, `:184`, `:186`, `:275` a `overit_sod.mjs:139` hledají v `nastSablony()` řádky PROJ a smluv. Ve výchozím pohledu OCK je ale filtr #367 skryje (`src/ui/nastaveni_ui.js:936`). S aktuálními šablonami to dnes dává 3 FAIL a 1 FAIL. Udělej to stejně jako v `overit_nabidka_proj_word.mjs:193–201`: přepni `NAST.sablonyVse`, po kontrole ho vrať a přidej i kontrolu, že filtr řádky opravdu skrývá. Ověř se šablonami z Disku: výsledek 29/0 a 51/0.
- **K40-P1 — kolize čísel B:**
  - Meze webhooku #553 v `BEZPECNOST_MEZE.md` (oddíl „PW #553“) nesou B176–B179, a ta čísla už mají starší nálezy (B176 ř. 369, B177 447, B178 454/464, B179 534). Meze #553 jsou na ř. 1374, 1387, 1395, 1409; odkaz na ně `CHANGELOG.md:163` a roadmapa #553. Krok 0 nad 9a16ff5: nejvyšší použité číslo je B198, mutace #553 číslo B nenesou.
  - Přečísluj meze #553 na **B199–B202** (B195–B198 už 4. 11. obsadila RC #561 — ruční cena). Před přečíslováním grepem ověř nejvyšší použité číslo v `BEZPECNOST_MEZE.md`, CHANGELOG, roadmapě a `podklady/` nad výchozím commitem; je-li vyšší než B198, vezmi další volná čísla.
  - Uprav i odkazy v CHANGELOG, roadmapě, komentářích a názvech mutací, kde jde o #553. Ke starému číslu připiš poznámku „dříve B17x (#553)“.
  - Přidej test (např. do `src/test_kontrola_udaju.js` nebo nové sady), který selže, když se nadpis „B<číslo> —“ v `BEZPECNOST_MEZE.md` opakuje.
- **Nové meze do `BEZPECNOST_MEZE.md`** (rozhodnutí J. V. 4. 11.: chování ponechat, jen zapsat; čísla za přečíslovanými mezemi #553, tj. od B203):
  - **K40-X3:** po přihlášení správce se jeho heslo bez dalšího dotazu použije k potvrzení kopie zálohy na Disk (#554), která na serveru odemyká mazání starých záloh (`src/ui/online_ui.js:313`, `:393`, `:1960`, `:1999`, `:2220–2230`, `:2318–2329`). Heslo se nikam neukládá.
  - **K40-S3:** po Prodáno a před prvním tiskem SoD smí číslo SoD a datum podpisu měnit kdokoli s právem ukládat (B157 „podle běžných pravidel zámku“, `src/zamek.js:400–415`).
  - **K40-W1:** doplň do mezí #553 popis vazby, upozornění a zrušení z bodu 6.
- **Mezery hlídačů (volitelné, jen testy):**
  - `test_escape.js` ať vidí víceřádkové `${…}` v šablonách HTML.
  - `overit_xss.mjs` ať otráví i prodej (`prodano`, historie prodeje), objednané příplatky, náhled Pipedrive a mapu polí, a ať v náhledu nenahrazuje `hlaska`/`potvrd`/`dotaz` prázdnou funkcí. Do upozornění z bodu 6 ať dá otrávené číslo nabídky.

## Nedělat v této větvi

- **N46** — rozhodnutí J. V. 4. 11.: ponechat mimo.
- Komentáře v sestavení, minifikace, mrtvý kód, duplicity, zápisník poznámek, kreslení jen viditelné záložky, PREKLAD, lehké jádro, rejstřík → program Zefektivnění.

Na konci vypiš:
- co bylo při kroku 0 už opravené,
- co jsi změnil (soubor:řádek),
- výsledky sad a mutací,
- otevřené otázky pro J. V. (hlavně kdyby razítko `prijato` nebo zrušení vazby narazilo na pravidla zámku či zálohy).
