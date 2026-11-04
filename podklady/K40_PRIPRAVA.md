# K40 — příprava: krok 0 nad integrací (4. 11. 2026)

Sezení K40 v režimu PŘÍPRAVA (pokyn J. V. 4. 11. 2026): **nic se neopravuje**, `claude/k40-opravy` se nezakládá.

**Ověřeno nad:** `origin/claude/integrace-16-10` = `df0138c` (v4.11.6). Obsahuje RC #561 (ruční cena)
a SV #564 (světlíky). Kód v `src/`, `netlify/` a `nastroje/` je shodný s `claude/k40-priprava` (3d0b346),
liší se jen `podklady/`.

**Dávky ze 4. 11., které v integraci ještě NEJSOU** (ověřeno přes `git merge-base`):

| dávka | větev | HEAD | základ | co mění (pro K40 důležité) |
|---|---|---|---|---|
| PR #563 prodaná = řídící | `claude/pr-prodano-ridici` | 9d46419 | b751c91 | `src/objednane.js` (+33 ř. za `prodNastav`, `prodJedinaZmena`, `prodServer` +2), `src/ui/sod_ui.js` (+3 ř. před polem data prodeje), `src/ui/online_ui.js` (+5 ř. u ř. 1366), `src/ui/common.js` (ř. 1434), mutace |
| IK interní poznámky | `claude/ik-poznamky-kryci` | f7d3ef6 | 6109e39 | `netlify/lib/zakazka_kontrola.mjs` (+15 ř. u ř. 523, tj. před příjmem nového zámku), `src/ui/common.js` (ř. 2624, 2923), krycí listy, mutace |
| MV4 manuál | `claude/mv4-manual-vypocet` | d8feaa6 | b751c91 | jen `src/test_manual_vypocet.js` — K40 se netýká |

Čísla řádků níž jsou z `df0138c`. U PR a IK je uvedený i očekávaný posun po sloučení („→ ~“). Po
sloučení zbylých dávek je potřeba krok 0 zopakovat (AKTUALIZUJ).

## Tabulka: bod → stav → místo → poznámka

| bod | stav | místo (df0138c) | poznámka, kolize, testy a mutace |
|---|---|---|---|
| **K40-N1** čelní sklo po změně zasklení / typu | **trvá** (ověřeno v Node: `nepocitat` i `mnozstviPrepis` s `MATERIÁL VSG 4.4.2` po přepnutí na „mezi příčníky“ zůstanou, `skloMigraceNazvu` vrátí 0 změn, aktuální název je `MATERIÁL VSG 4.4.1`) | `src/engine.js:420–447` `skloVolba` (čelní název ř. 427 a 445), `:458–487` `skloMigraceNazvu` (dvojice ř. 463–464); `src/ui/common.js:74–79` `skloMigraceAkt`, volání `:59` (`syncVarianta`) a `:797` (`set`); `src/zakazka.js:952` (`importZakazka`) | SV #564 sklo nezasáhla (mění jen světlíky, `svetlikSkloSteny` ř. 993). Další výskyty názvu čelního skla: `src/engine.js:1751`, `:2013`, `src/ui/detail_ui.js:47`, `src/ui/kalk_ock.js:1543` — vzor `^MATERIÁL VSG 4\.4\.[12]$` se s jinými řádky nepotká (jiné sekce `MATERIÁL VSG` nemají). Testy: `src/test_k37_sklo_prepnuti.js`, `test_sklo_vazba.js`, `test_cenik_rady.js` (ř. 490–495), `test_zahr_jen_realizace.js`, `test_555_klon_tisk.js`, `overit_k37_sklo.mjs`, fuzz `src/test_fuzz_invarianty.js`. Mutace: `mutace_jadro.mjs` (6 výskytů `skloMigrace`). |
| **K40-X1/X2** kvadratický ořez konce | **trvá** (30 000 znaků: `nazevCast` 453 ms) | `src/nazvy_souboru.js:44–51` `nazevCast` (výraz ř. 50); `src/preklad.js:1272` (`prekladNorm`); `src/plan_plateb.js:435` (`milnik`); `src/slovnik.js:279`; vzor smyčky `src/uloziste.js:64–70` | Dávky 4. 11. nezasáhly. Testy: `src/test_nazvy_souboru.js`, `src/test_ares.js` (volá `nazevCast`). Mutace pro `nazevCast` dnes žádná. |
| **K40-S2** drahá diagnostika rozdílu zámku | **trvá** | `src/zamek.js:607–637` `zamekDataRozdilCesta` (kanonizace na každé úrovni ř. 618, `zamekJsonKanon` ř. 566); volá `netlify/lib/zakazka_kontrola.mjs:451–452` | Prompt měl ř. 613–623. IK vkládá řádky až za ř. 523 → volání se neposune. Testy: `netlify/test_555_klon_tisk.mjs`, `netlify/test_555b_klon_cenik.mjs` (+ `src/test_555*.js`). Mutace: `netlify/mutace.mjs` (2 výskyty). |
| **K40-N2** šířka můstku bez rozsahu | **trvá** | `src/engine.js:783–786` `mustkyCenikNovy` (jen `> 0`), `:845–872` `mustkyCenikKontrola` (nový tvar šířku vůbec nehlídá, nový tvar = šířka > 0); `src/ui/program_ui.js:345–354` `progMustkyPotvrd`; `netlify/functions/program.mjs:104–110` | Prompt měl `engine.js:813` — posun +32 od NV/RC (návrh NV byl sloučen s RC, #560 můstky). Testy: `src/test_548_mustky_bez_cen.js` (+ serverová sada #548). Mutace: hledat pod „#548“. |
| **K40-N5** zahraniční řada bez kontroly můstků | **trvá** | dialog `src/ui/program_ui.js:347` a server `netlify/functions/program.mjs:106–108` čtou jen `ctx.cenik`; `cenikZahrSVychozimi` v `src/cenik_rady.js:113` | Jako N2. |
| **K40-S1** dolní mez data prodeje | **trvá** (mez z `zamek.kdy`, nový zámek až 400 dní zpět) | `src/objednane.js:365–369` `prodDatumOd`, `:371–377` `prodDatumProblem`, `:480` `prodServer` (kontrola data ř. 529); `src/zamek.js:652–663` (`ZAMEK_KDY_*`, `zamekKdyProblem`); `netlify/lib/zakazka_kontrola.mjs:616–618` (příjem nového zámku); `src/ui/sod_ui.js:390–391` (pole data, `min`) | **Kolize s PR #563:** `objednane.js` po PR → ~398–410 / `prodServer` ~513 (kontrola ~562); `prodServer` na konci volá `prodRidiciSrovnej` — razítko `prijato` musí projít i `prodJedinaZmena` (PR ji mění, ř. ~457–474). `sod_ui.js` → ~393. **Kolize s IK:** `zakazka_kontrola.mjs` +15 → příjem zámku ~631–633. Testy: `src/test_prodano_zamek.js`, `netlify/test_prodano_zamek.mjs`, `netlify/test_kryci_po_tisku.mjs`, `netlify/test_prava.mjs` (`zamekKdyProblem`), po PR i `test_563_prodano_ridici.*`. |
| **K40-N3** mez = zítřek při hodinách napřed | **trvá** | `src/zamek.js:653` `ZAMEK_KDY_NAPRED_MS` = 10 min; mez `prodDatumOd` bez stropu `dnes` | Opravuje se spolu s S1. |
| **K40-W1** webhook naváže existující kalkulaci | **trvá** (bez protokolu, bez `pdVazbaWebhook`) | `netlify/functions/pd_webhook.mjs:149–160` (nalezení podle čísla), `:186–187` (`bezVazby` → `pdDealId`), rejstřík `:214`; `src/controlling.js:1021–1029` `ctrlPdDealKontrola` | Prompt měl `controlling.js:1003–1012` (posun +18). `protokol.js` **už je** v jádru serveru (`netlify/lib/jadro_moduly.cjs:60`) — doplňovat netřeba. Dávky 4. 11. webhook nezasáhly. Testy: `netlify/test_553_webhook.mjs`, `test_prava.mjs`, `test_zalohy.mjs`. Mutace: `netlify/mutace.mjs` (19 výskytů `pd_webhook`). |
| **K40-X4** budoucí kopie na Disku | **trvá** | `src/ui/online_ui.js:2152` `kopieDiskUklid`, výběr `:2178` | Prompt měl ř. 2167. Po PR (+5 ř. u 1366) → ~2183. Testy: `src/test_552_nazvy_zaloh.js`, `test_554_kopie_denne.js`, `test_kopie_disk.js`, `test_z2_disk_retence.js`. Mutace: 1 v `netlify/mutace.mjs`. |
| **K40-N4** komentář DPH PROJ | **trvá** (jen komentář) | `src/zakazka.js:925–933` (komentář ř. 932) | Beze změny proti promptu. |
| **K40-S4** `ADMIN_EMAIL` bez výchozí hodnoty | **trvá, širší rozsah** | bez `ADMIN_EMAIL` skončí **výjimkou**: `netlify/test_555b_klon_cenik.mjs`, `test_555_klon_tisk.mjs`, `test_560_svetliky_stavba.mjs` (nová z SV), `test_controlling.mjs`, `test_funkce.mjs`, `test_klon_sleva.mjs`, `test_obnova_nanecisto.mjs`, `test_pipedrive.mjs`, `test_stary_tvar.mjs`; `test_zalohy.mjs` dá 116 OK / 31 FAIL | Vzor `podklady/K10_pokusy/harness.mjs:7`. `test_561_rucni_cena.mjs` (RC) projde 29/0. |
| **X6** `path` bez `escJs` | **trvá** | `src/ui/cenik_ui.js:206`, `:208`; stejně i `:176`, `:177`, `:184`, `:185` (`set('${path}', …)`) | Prompt jmenuje jen 206/208 — doporučuji obalit i 176–185. `RIZIKO` v `src/test_escape.js:170` `path`/`cesta` nemá. |
| **K40-X5** záložní buňka CSV | **trvá** | `src/slovnik.js:148–150`, `src/pd_nanecisto.js:141`; `csvBunka` `src/format.js:118–122` | Záloha ve `slovnik.js` má jiné pravidlo (`+`/`-` jen před ne-mezerou) než `csvBunka` (každé `+`/`-`), záloha v `pd_nanecisto.js` ochranu proti vzorcům nemá vůbec. Testy: `src/test_csv_vzorce.js`. |
| **K40-T1** harnessy bez `najdiNejnovejsi` | **trvá** | `najdiNejnovejsi` mají jen `overit_sablona.mjs` a `nastroje/harness_podklady.mjs`; pevná jména: `overit_nabidka_proj_word.mjs:48–52`, `overit_sablony_online.mjs:162–175`, `overit_sod.mjs:45–47`, `:167` (v3); výjimka „už seznam plateb“ z `nastroje/vyrob_sablony.js:869` | — |
| **K40-T2** čekání na „jakoukoli hlášku“ | **trvá** | `overit_online.mjs:1170`; průběžná hláška `src/ui/online_ui.js:3287` (prompt: 3274) | Podobné podmínky `!!o.hlaska` také `overit_online.mjs:1116`, `:1183`, `:1193`, `:1208` — zkontrolovat. |
| **K40-T3** filtr #367 skryje řádky PROJ a smluv | **trvá** | `overit_sablony_online.mjs:182`, `:184`, `:186`, `:275` (prompt: 181/183/274); `overit_sod.mjs:139` (prompt: 138); filtr `src/ui/nastaveni_ui.js:936` (prompt: 963); vzor `overit_nabidka_proj_word.mjs:192–201` | — |
| **K40-P1** kolize čísel B | **trvá** | `BEZPECNOST_MEZE.md` oddíl „PW #553“ ř. 1360, meze ř. 1374 (B176), 1387 (B177), 1395 (B178), 1409 (B179); odkazy #553: `CHANGELOG.md:163`, `roadmapa/roadmap.json` #553 (ř. 8397) | **Nejvyšší použité číslo je B198** (RC #561, B195–B198) — B199–B202 volné, nové meze od B203. V `netlify/mutace.mjs` žádná mutace #553 číslo B17x nenese. PR, IK ani MV4 žádné číslo B nepřidávají. |
| **K40-X3** (mez) heslo správce pro kopii na Disk | zapsat | `src/ui/online_ui.js:313`, `:393`, `:1955`/`:1994` (`onlineZalohaAuto`), `:2215–2225` (`kopieDiskProved`), `:2313–2324` (`onlineKopieDiskAuto`) | Prompt měl 315/390/1944/2212/2313. Po PR ř. ≥ 1367 +5. |
| **K40-S3** (mez) číslo SoD a datum podpisu po Prodáno | zapsat | `src/zamek.js:400–415` (`ZAMEK_PRODANO_SOD_POLE`, `zamekProdanoSodVolne`) | Prompt měl 396–399/413. |
| N46 | mimo | — | Podle rozhodnutí J. V. se neopravuje. |

## Opraveno při kroku 0
Nic. Všechny body K40 v `df0138c` trvají.

## Na co se čeká
- Sloučení PR #563, IK a MV4 do integrace → pokyn „AKTUALIZUJ K40 nad <SHA>“ (posuny řádků v S1, X4, X3 a W1/IK).
- Pokyn „SPUSŤ K40 nad <SHA>“.
