# K40 — nezávislý posudek plánu oprav (poradce, 11. 11. 2026)

**Posuzováno:** `podklady/PROMPT_K40_OPRAVY.md` a `podklady/K40_PRIPRAVA.md` (větev `claude/k40-priprava`, `ba44b54`)
proti kódu integrace `origin/claude/integrace-16-10` = **`6c4bc80`** (v11.11.1; víc šachet #570 za vypínačem, AS #577,
CA #575, MU/MU2/MU3, DZ/DZ2). Kód aplikace se neměnil, nic se nespouštělo do `test`/`main`. Ověřováno čtením kódu
integrace a krátkými pokusy v Node se zkušebním ceníkem (bez cen a údajů z provozu).

Navržené úpravy promptu: `podklady/PROMPT_K40_OPRAVY_v2.md` (dodatek s předností před v1; v1 se nepřepisuje).

## 1. Shrnutí

- **Všech 19 bodů K40 nad 6c4bc80 trvá, žádný neodpadl.** Víc šachet, AS ani CA žádný bod neopravily.
- **Tři body je nutné upravit, jinak oprava přinese regresi nebo zůstane poloviční:**
  1. **K40-N1 (sklo)** — navržený vzor `^MATERIÁL VSG 4\.4\.[12]$` v `skloMigraceNazvu` by při otevření zakázky
     přemapoval i **staré osiřelé záznamy** a změnil cenu uložené rozpracované nabídky; `importZakazka` navíc
     migruje i **zamčené** varianty (ověřeno pokusem), takže by se pohnul přepočet odeslané nabídky bez
     zmrazeného výsledku a ověření zámku. Doporučuji přejmenovávat **jen při skutečném přepnutí** (viz 3.1).
  2. **K40-N1 × víc šachet (nový nález)** — `skloMigraceNazvu` i `skloMigraceAkt` pracují jen se šachtou 1
     (`ock.zadani`). U šachty 2+ se tak **vrátila vada K37-N1 i pro boky**: pokus nad 6c4bc80 — šachta 2
     interiér → exteriér s vyřazeným sklem boků: cena zakázky 1 833 000 → 2 218 000 Kč (zkušební ceník),
     migrace 0 změn. Projeví se jen se zapnutým vypínačem (na ostrém webu vypnuto).
  3. **K40-X4 (kopie na Disku)** — tatáž vada je po AS #577 i ve skriptu Apps Script
     (`nastroje/apps_script/kopie_disk.gs:304`, doslova stejný řádek). Oprava jen v prohlížeči nestačí — skript
     je dnes hlavní cesta, prohlížeč je záloha záloh.
- **Dva body potřebují doplnit návrh (jinak 409 nebo nedůsledná mez):** K40-S1 (razítko `prijato`: klient ho po
  uložení nezná a `prodServer` běží dřív než `uloZamekRazitkaDrz`) a K40-W1 (webhook při prvním navázání cizí
  kalkulace **doplní prázdná pole hlavičky** a zapíše odkaz do dealu — zrušení vazby to dnes nevrátí).
- **Zlatá sada víc šachet (319 scénářů) a zlatá sada můstků:** žádná oprava K40 nesahá do `vypocet()`; otisky se
  s vypnutým vypínačem nesmí změnit a nemají proč. Pojistku (spustit obě zlaté sady po každé dávce, nikdy je
  nepřegenerovat) dávám do promptu v2.
- **Rozdělení:** tři dávky — **K40a** (jádro bez ceny + hygiena, #579) ∥ **K40b** (zámek a prodej, #580), potom
  **K40c** (webhook W1, #581). K40c až po rozhodnutí J. V. a po sloučení K40b (sdílí `zakazka_kontrola.mjs`
  a `netlify/mutace.mjs`).
- **Čísla:** roadmapa nad 6c4bc80 má obsazeno do #596, volné jsou **#567 a #579–#589** (ověřeno skriptem nad
  `roadmapa/roadmap.json`). Meze: nejvyšší použité B214 (AS B210–B214), **B199–B209 volné** — odpovídá promptu.

## 2. Platnost bodů nad 6c4bc80

Řádky v promptu v1 jsou z `e2c2137`; v integraci se posunuly. Hledat podle jmen funkcí.

| bod | stav | místo nad 6c4bc80 | co se změnilo proti promptu v1 |
|---|---|---|---|
| K40-N1 čelní sklo | **trvá, upravit řešení** | `src/engine.js:426` `skloVolba`, `:464` `skloMigraceNazvu`; `src/ui/common.js:68`, `:83` `skloMigraceAkt`, `:815`; `src/ui/kalk_ock.js:145`; `src/zakazka.js:953` | pokus: `nepocitat` s `MATERIÁL VSG 4.4.2` po přepnutí zůstane, migrace 0 změn. Nové: šachty 2+ (viz 3.1) |
| **nový: sklo u šachty 2+** | **nový nález** (jen se zapnutým vypínačem) | `skloMigraceNazvu` čte jen `d.ock.zadani`; `importZakazka` volá migraci skla mimo smyčku `zadaniSachet` (`src/zakazka.js:953` × `:968`) | vrací K37-N1 pro boky i čelní sklo u `ock.dalsi[i].zadani` |
| K40-X1/X2 ořez konce | trvá | `src/nazvy_souboru.js:45–51`; `src/preklad.js:1324` `prekladNorm` (výraz ř. 1332); `src/plan_plateb.js:435`; `src/slovnik.js:279` | změřeno: 15 000× „.-“ 319 ms. VS ani AS nový výraz s kotvou jen na konci nepřidaly (grep) |
| K40-S2 diagnostika zámku | trvá | `src/zamek.js:621–651` (kanonizace na každé úrovni ř. 632); volá `netlify/lib/zakazka_kontrola.mjs:488` | víc šachet zvětšuje data zamčené varianty (až 10 celých zadání v `ock.dalsi`) → dopad větší |
| K40-N2 šířka můstku | trvá | `src/engine.js:792`, `:1021`; pokus: šířka 2 mm → `ok: true` | beze změny |
| K40-N5 zahraniční řada | trvá | `src/ui/program_ui.js:345`, `netlify/functions/program.mjs:106–108`, `src/cenik_rady.js:113` | soubory beze změny |
| K40-S1 mez data prodeje | trvá, **doplnit návrh** | `src/objednane.js:385` `prodDatumOd`, `:391`, `:474` `prodJedinaZmena`, `:549` `prodServer`; `src/zamek.js:666–676`; `netlify/lib/zakazka_kontrola.mjs:370` (`prodServer`), `:508` (`uloZamekRazitkaDrz`), `:669` (příjem nového zámku) | viz 3.4 |
| K40-N3 mez = zítřek | trvá | `src/zamek.js:667` | s S1 |
| K40-W1 webhook | trvá, **doplnit návrh** | `netlify/functions/pd_webhook.mjs:141–203`, `netlify/lib/pd_webhook.mjs:160` `pdWebhookPouzij`; `src/controlling.js:1035` | viz 3.5 |
| K40-X4 budoucí kopie | trvá, **dvě místa** | `src/ui/online_ui.js:2302`; **`nastroje/apps_script/kopie_disk.gs:304`** | AS #577 vadu zkopírovala do skriptu |
| K40-N4 komentář DPH PROJ | trvá | `src/zakazka.js:933` | — |
| K40-S4 `ADMIN_EMAIL` | trvá (dotčené sady se neměnily) | viz K40_PRIPRAVA | nové sady VS a AS výchozí hodnotu mají (`test_vs_server`, `test_vs_rejstrik`, `test_577_kopie_skript`) |
| X6 `path` bez `escJs` | trvá | `src/ui/cenik_ui.js:176`, `:177`, `:184`, `:185`, `:206`, `:208` | — |
| K40-X5 záložní buňka CSV | trvá | `src/slovnik.js:148–150`, `src/pd_nanecisto.js:148` (posun z 141) | — |
| K40-T1 harnessy šablon | trvá | `overit_sablony_online.mjs:291–343` chce CN v11/v12 | **šablona CN je po VS v17** (`src/test_vs_docx_v17.js`) — nikde nepsat pevné číslo |
| K40-T2 čekání na hlášku | trvá | průběžná hláška `src/ui/online_ui.js:3514`; `overit_online.mjs` se posunul (+31 ř.) | hledat podle textu |
| K40-T3 filtr #367 | trvá | filtr `src/ui/nastaveni_ui.js:939` | — |
| K40-P1 kolize B | trvá | `BEZPECNOST_MEZE.md:1360–` (meze #553 jako odrážky `- **B176 — …`) | AS oddíl ř. 1486 píše „B199–B202 drží K40“ — po K40 opravit na B199–B209 |
| K40-X3, K40-S3 (meze) | zapsat | `src/ui/online_ui.js:2339` `kopieDiskProved`, `:2473` `onlineKopieDiskAuto`; `src/zamek.js:414–416` | X3: po AS je prohlížeč jen záloha záloh a retenci odemyká i token skriptu (B213) — mez formulovat s odkazem na B213 |

**Mimo K40, pro koordinaci:** víc šachet #570 nemá v `BEZPECNOST_MEZE.md` vlastní oddíl ani číslo B (vypínač
`/api/funkce`, 409 při ztrátě `dalsi`, limity 10 variant × 20 ks). Doporučuji samostatnou drobnou položku.

## 3. Posouzení řešení po bodech

### 3.1 K40-N1 — sklo (cena; nejrizikovější bod)

**Co je na návrhu v1 špatně.** Dvojice `[/^MATERIÁL VSG 4\.4\.[12]$/, nove.celni.nazev]` v `skloMigraceNazvu` se
uplatní všude, kde migrace běží — tedy i v `importZakazka` (server i prohlížeč) a v `syncVarianta` při otevření:

- **Uložené rozpracované zakázky se starým sirotkem.** Kdo v minulosti vyřadil čelní sklo a přepnul zasklení,
  má dnes v datech `nepocitat: ['MATERIÁL VSG 4.4.2']` a sklo `4.4.1` se počítá — a s tou cenou zakázku uložil,
  případně poslal dál. Po opravě v1 by se při prvním otevření sklo znovu vyřadilo a **cena by tiše klesla**.
  Komentář v `importZakazka` (`src/zakazka.js`, migrace 9. 9.) říká výslovně, že migrace tichou změnu ceny
  uložené nabídky dělat nesmí.
- **Zamčené varianty.** `importZakazka` migruje sklo i u zamčené varianty (pokus: zamčená varianta se sirotkem
  boků má po importu přejmenovaný záznam). U zámku se zmrazeným výsledkem se tisk nezmění, ale `zamekOvereni`
  přepočítává z dat a začalo by hlásit „nesouhlasí“; zámek bez zmrazeného výsledku (před 15. 9.) by dotiskl
  jinou cenu. U boků to tak je od K37 a nedá se vrátit; u čelního skla to zavádět nedoporučuji.

**Doporučené řešení (minimální, bez dopadu na uložená data):** přejmenovat čelní sklo **jen v okamžiku
skutečného přepnutí**, kdy je starý název známý:

- `skloMigraceNazvu(data, opts)` dostane nepovinný `opts.predCelni` (název čelního skla před změnou). Je-li
  zadaný a liší se od `skloVolba(z, c).celni.nazev`, přidá se **přesná** dvojice `predCelni → nový název`. Bez
  `opts` se funkce chová jako dnes → `importZakazka` a server beze změny, žádný dopad na zámek.
- Název čelního skla závisí jen na `typSachty` a `zaskleni` (ne na ceníku), takže stačí dvě cesty:
  `set('Z.typSachty' | 'Z.zaskleni')` v `src/ui/common.js` a `typSachtyPrepni` v `src/ui/kalk_ock.js` — obě si
  před změnou zapamatují `skloVolba(Z, C).celni.nazev`.
- Kolize (cílový klíč už existuje): platí dnešní pravidlo „existující cíl má přednost, starý klíč se smaže“;
  v `nepocitat` nesmí vzniknout duplicita.
- **Víc šachet:** migrace musí běžet nad zadáním **otevřené šachty** (`Z`), ne jen nad `v.data.ock.zadani`,
  a dosavadní migrace boků (regex) nad **všemi** šachtami (`sachtyZ(d.ock)`), stejně jako to `importZakazka`
  dělá pro ostatní migrace (`zadaniSachet.forEach`). Zamčená varianta se nemění.

**Rizika a pojistky:** `mutace_jadro.mjs` má 6 mutací K37 kotvených na text `skloMigrace*` — po úpravě pustit
`--kontrola` a zadání mutací případně posunout. `vypocet()` se nemění → zlaté sady beze změny (ověřit během).
Zbývá vědomá vlastnost: starý sirotek v datech zůstane a po přepnutí zpět se znovu uplatní (jako dnes) — to je
otázka 1 pro J. V.

### 3.2 K40-X1/X2, K40-S2 (výkon)

Návrh je správný a minimální. Doplnit:
- X1: zkrácení úseku v `nazevCast` může změnit název dokumentu u dlouhých názvů — strop zvolit vysoký (např.
  200 znaků na úsek) a v testu doložit, že `test_nazvy_souboru` (141/0), `test_vs_vystupy` a `test_577_jmeno_kopie`
  zůstávají. Ořez smyčkou musí dát **stejný výsledek** jako výraz (včetně znaků `-` a `.` uprostřed).
- S2: do testu dát i zamčenou variantu s 10 šachtami (`ock.dalsi`), cesta typu `ock.dalsi.3.zadani.sirka` se
  nesmí změnit. Strop kroků nedoporučuji (mění výstup), stačí kanonizace jednou.

### 3.3 K40-N2, K40-N5 (ceník můstků)

Správně. Doplnit: rozsah šířky kontrolovat **až po** `cenikMigraceMustku` a jen když je šířka vyplněná (nula
a prázdno řeší dnešní větve); potvrzení mimo rozsah jde stejným mechanismem jako potvrzení nuly (dialog i server),
jinak by starý klient nemohl ceník zveřejnit vůbec — ověřit, že dnešní zveřejněný ceník (šířka z provozu) projde
bez dotazu. `src/test_560_zlata.json` se nesmí změnit. INFO z přípravy (šířka skupiny v zadání v metrech) je
otázka 6.

### 3.4 K40-S1 + K40-N3 (zámek a prodej; druhý nejrizikovější bod)

Rozhodnutí J. V. (razítko přijetí serverem, T = 7 dní, výjimka vedoucí/admin s důvodem) je v pořádku. V návrhu v1
chybí čtyři věci, které jsem ověřil v kódu:

1. **Kde razítko držet.** Klíč zámku `uloZamekKlic` (`src/uloziste.js:589`) je výčet polí (`kdy`, `typ`, `cislo`,
   `otisk`, `cisloPapir`, `vysledek`, `snimek`) — `prijato` do něj **nepatří** a starší klient tedy 409 nedostane.
   U uloženého zámku ho má držet existující mechanismus `uloZamekRazitkaDrz` (`:648`, seznam `kdo`, `popis`,
   `sablona`, `slovnik`, `hlavicka`) — přidat `prijato`. Tím je zároveň splněno „uložený zámek bez `prijato`
   ho nikdy nedostane od klienta“ (větev `sz[k] === undefined → delete`).
2. **Pořadí na serveru.** `prodServer` běží na ř. 370, `uloZamekRazitkaDrz` až na ř. 508. V okamžiku kontroly data
   tedy příchozí zakázka `prijato` **nenese** (klient ho nezná) nebo nese podvržené. `prodServer` proto musí
   `prijato` číst z **uložené** verze (`stara`), u nového zámku v témže požadavku vzít čas serveru, a
   `prodJedinaZmena` musí pole `zamek.prijato` při porovnání vynechat (jinak Prodáno od klienta bez razítka
   skončí jako „jiná změna“).
3. **Klient razítko nezná.** Odpověď `POST /api/zakazky` vrací jen `razitko`, `slevy`, `varovani`
   (`netlify/functions/zakazky.mjs:289`). Bez doplnění má pole data v kartě Prodáno volnější `min` než server
   a „jedna funkce pro obojí“ neplatí, dokud se zakázka neotevře znovu. Doporučuji vrátit v odpovědi
   `zamkyPrijato: { <id varianty>: <ISO> }` a v prohlížeči ho dopsat do místní kopie (jako dnes `slevy`).
4. **Obnova.** Z otisku se `prijato` přebírá (doklad). Ze souboru je to nedůvěryhodné pole (B98) — doporučuji
   zahodit, zámek se pak chová jako starý (mez z `kdy`); otázka 3.

Zbytková mez k zápisu: antedatovaný zámek (až 400 dní, K7-S5) dál určuje **období odeslání** v controllingu
(`src/controlling.js:834`, `:908`, `:929` čtou `zamek.kdy`). S1 opravuje jen datum prodeje. Navrhuji zapsat jako
mez a nechat na J. V. (otázka 4).

N3 (`mez ≤ dnes`) je správně; testovat s `ted` ze serveru, ne s hodinami testu.

### 3.5 K40-W1 (webhook)

Trvá. Návrh v1 předpokládá, že webhook u existující kalkulace „hodnoty nemění“. Není to přesné:
`pdWebhookPouzij` u nezamčené zakázky bez předchozího otisku **doplní prázdná pole hlavičky** z dealu (větev
`smi()` → `!a`) a termín předání do krycího listu, a krok 7 **zapíše do dealu odkaz** na kalkulaci. Při překlepu
CN tedy cizí kalkulace dostane údaje cizího zákazníka a deal odkaz na ni. Zrušení vazby podle v1 smaže jen
`pdDealId`.

Doporučení:
- **První navázání existující kalkulace = jen vazba.** Dokud je `pdVazbaWebhook.stav === 'ceka'`, webhook pole
  hlavičky ani krycí list nepřenáší (přenese je další doručení po „V pořádku“). Tím odpadá vracení údajů.
  (Otázka 5.)
- Zrušení vazby smaže i `pdZadani` (deal a otisky), `pdStav`, index `pd_webhook/deal:<id>` a přepíše rejstřík;
  odkaz v dealu řeší otázka 5b.
- Seznam odmítnutých dealů kontrolovat **před** jakýmkoli zápisem (zakázka, index, PATCH dealu).
- `pdVazbaWebhook` a seznam odmítnutých jsou pole, která píše jen server: při běžném uložení se berou z uložené
  verze (vzor `uloZamekRazitkaDrz` / interní poznámky), mění je jen výslovná akce. Obnova ze souboru je nepřebírá.
- Texty v upozornění (číslo nabídky, deal) přes `esc`; do `overit_xss.mjs` otrávené číslo.

### 3.6 K40-X4 (kopie na Disku)

Správně, ale ve **dvou** místech. Výběr srovnávací kopie přesunout do sdíleného `src/retence_zaloh.js` (např.
`retenceZalohDiskPredchozi(jmena, soubor, den, prostredi)`), volat z `kopieDiskUklid` i ze skriptu; do
`kopie_disk.gs` se kopie retence vkládá nástrojem `nastroje/apps_script/vloz_retenci.py` (ne ručně) a hlídá to
`netlify/test_577_apps_script.mjs`. **Skript v účtu správce se sám neaktualizuje** — po sloučení musí J. V. nový
`kopie_disk.gs` vložit do Apps Script (otázka 7); do té doby běží noční kopie se starou logikou.

### 3.7 Hygiena (bod 9 promptu)

V pořádku. Upřesnění:
- **P1 test duplicit:** meze se píší dvěma tvary (`### B176 — …` a `- **B176 — …`) a existují legitimní rozsahy
  a nadpisy typu „Kolize čísla B178“, „B191–B193“. Test má hlídat oba tvary a jen **definiční** výskyt
  (`^### B\d+ — ` a `^- \*\*B\d+ — `).
- **Rozdělení čísel B mezi dávky** (ať paralelní dávky nesáhnou na totéž): B199–B202 přečíslování #553 a
  B203–B205 (X3, S3, X4) → K40a; B206–B207 (S1/N3) → K40b; B208–B209 (W1) → K40c.
- **T1:** „nejvyšší verze“, žádné pevné číslo (CN je v17).
- Uživatelsky viditelné změny (důvod výjimky u data prodeje, upozornění na vazbu z webhooku) patří i do příruček
  (`manual/`) — v1 to nezmiňuje.

## 4. Pořadí, dávky, testy

| dávka | obsah | hlavní soubory | mutace | běh |
|---|---|---|---|---|
| **K40a** (#579) | N1 + sklo u šachet 2+, N2, N5, N4, X1/X2, X5, X6, X4 (+ skript), S4, T1–T3, P1, meze X3/S3 | `src/engine.js`, `src/ui/common.js`, `src/ui/kalk_ock.js`, `src/retence_zaloh.js`, `nastroje/apps_script/`, `netlify/functions/program.mjs`, harnessy, `BEZPECNOST_MEZE.md` | jádro (celé, 3 části) + cílené serverové (#548, kopie na Disk) | souběžně s K40b |
| **K40b** (#580) | S1 + N3, S2 | `src/zamek.js`, `src/objednane.js`, `src/uloziste.js`, `netlify/lib/zakazka_kontrola.mjs`, `netlify/functions/zakazky.mjs`, `src/ui/sod_ui.js` | server po částech (16) + jádro | souběžně s K40a |
| **K40c** (#581) | W1 + meze #553 | `netlify/functions/pd_webhook.mjs`, `netlify/lib/pd_webhook.mjs`, `netlify/lib/zakazka_kontrola.mjs`, `src/controlling.js`, `src/ui/online_ui.js` | server po částech | **po sloučení K40b** a po odpovědích J. V. |

- Souběh K40a ∥ K40b: kódové soubory se nepřekrývají (K40a `online_ui.js` jen `kopieDiskUklid`; K40b do něj
  sahá jen pro `zamkyPrijato` u odpovědi uložení). Konflikty budou jen v `CHANGELOG.md`, `roadmapa/roadmap.json`,
  `PREDAVKA.md`, `verze.txt`, `BEZPECNOST_MEZE.md` (jiné oddíly) a seznamech mutací — běžné slučování.
- K40c sdílí s K40b `zakazka_kontrola.mjs`, `netlify/mutace.mjs` a `test_prava.mjs` → ne souběžně.
- **Pojistky každé dávky:** `node src/test_vs_zlata.js` a zlatá sada můstků beze změny otisků (sady se
  nepřegenerují); `mutace_jadro.mjs --kontrola` a `netlify/mutace.mjs --kontrola` po každém zásahu do kódu, na
  který míří starší mutace; nový test doložit „před opravou FAIL, po opravě OK“; mutace nepřerušovat, po restartu
  `git status`.
- Celé kolo s plnými mutacemi až při slučování do integrace (jednou za všechny tři dávky šetří ~10 h běhu);
  každá dávka sama: celé `testovaci_kolo.sh` bez mutací + mutace jádra + serverové části, které se jí týkají.

## 5. Otázky pro J. V. (první varianta je doporučená)

1. **Sklo — staré osiřelé záznamy** (vyřazení nebo přepis čelního skla, který po dřívějším přepnutí zasklení
   „zůstal viset“ a sklo se dnes počítá):
   a) **nechat být** — oprava přejmenovává jen při novém přepnutí, cena uložených nabídek se nezmění;
   b) při otevření rozpracované zakázky obnovit vyřazení a ukázat upozornění „zkontrolujte cenu“;
   c) obnovit potichu (původní návrh; mění cenu uložených i přepočet odeslaných nabídek) — nedoporučuji.
2. **Sklo — ruční přejmenování řádku** při změně výrobku (4.4.2 ↔ 4.4.1): a) **přenést vše** (vyřazení,
   množství i vlastní název) jako u boků od K37; b) přenést jen vyřazení a množství, vlastní název zahodit.
3. **Razítko přijetí při obnově ze souboru zálohy:** a) **nepřebírat** (zámek se chová jako starší, mez z času
   tisku); b) dát čas obnovy (prodej starší než 7 dní pak jen vedoucí/administrátor s důvodem).
4. **Antedatovaný čas tisku a období odeslání v controllingu** (S1 řeší jen datum prodeje): a) **zapsat jako
   vědomou mez**; b) období odeslání brát z času přijetí serverem — samostatná položka roadmapy.
5. **Webhook při prvním navázání existující kalkulace:** a) **jen vazba a upozornění**, údaje z dealu se přenesou
   až po „V pořádku“; b) jako dnes hned doplnit prázdná pole a v upozornění je vyjmenovat.
   **5b. Odkaz na kalkulaci v dealu po „Zrušit vazbu“:** a) **server ho v Pipedrive vymaže**, pokud tam je náš
   odkaz (druhý povolený zápis do CRM); b) nechat, opraví člověk v Pipedrive.
6. **Rozměr skupiny můstku zadaný v metrech** (šířka 2 místo 2 000 mm dá tisícinu ceny podlahy): a) **přidat jen
   upozornění** v kontrolách pro rozměr pod 300 mm (cenu nemění) — do K40a; b) neřešit.
7. **Oprava X4 i ve skriptu Apps Script** (vyžaduje, abyste po sloučení vložil nový `kopie_disk.gs`): a) **ano,
   obojí hned**; b) jen prohlížeč, skript později.
8. **Rozsah věrohodnosti referenční šířky můstku 500–5 000 mm:** a) **potvrdit**; b) jiné meze.

Bez odpovědi lze spustit K40a (s 1a, 2a, 6b, 7a, 8a jako výchozími) a K40b (3a, 4a). K40c čeká na 5 a 5b.

## 6. Odškrtnutí zadání

| úkol | stav |
|---|---|
| 1. Platnost bodů nad 6c4bc80 (víc šachet, AS, CA; zámek se `sachty[]`, kopie z prohlížeče × skript, meze B199–B214, rejstřík) | ✅ oddíl 2 — vše trvá; nový nález sklo u šachet 2+; X4 i ve skriptu; rejstřík (štítek šachet) K40 neovlivňuje, snímek `sachty` v zámku se s `prijato` nepotká |
| 2. Správnost a minimálnost řešení, rizika regresí | ✅ oddíl 3 |
| 3. Pořadí, dávky, testy, mutace | ✅ oddíl 4 |
| 4. Otázky pro J. V. | ✅ oddíl 5 |
| Úpravy promptu | ✅ `podklady/PROMPT_K40_OPRAVY_v2.md` |
| Kód aplikace beze změny, nic do `test`/`main` | ✅ |
