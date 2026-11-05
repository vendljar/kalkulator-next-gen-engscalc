# K40 — příprava: krok 0 nad integrací (4.–5. 11. 2026)

Sezení K40 v režimu PŘÍPRAVA (pokyn J. V. 4. 11. 2026): **nic se neopravuje**, `claude/k40-opravy` se nezakládá.

**Ověřeno nad:** `origin/claude/integrace-16-10` = `9a16ff5` (v4.11.8; pokyn koordinace „AKTUALIZUJ K40
nad 9a16ff5“). Obsahuje RC #561, SV #564, PR #563 (prodaná = řídící), IK #565 (interní poznámky na krycím
listu) a MV4 #566 (manuál). Všechny dávky ze 4. 11. jsou tedy už ve výchozím stavu.

**Historie kroku 0:** 1. průchod nad `df0138c` (v4.11.6, a9ee49d), 2. průchod nad `9a16ff5` (6bb341f),
3. průchod nad `000924e` (5. 11. 2026, `origin/test` = `origin/main` = v4.11.8). `000924e` se od `9a16ff5` liší jen
v `PREDAVKA.md` (ověřeno `git diff --stat`) — **všechna místa a čísla řádků v tabulce platí beze změny.**

4. průchod nad `5da7a2d` (5. 11. 2026, `origin/claude/integrace-16-10`, v5.11.1 = v4.11.8 + PH). **Všechny body
trvají**; jediný posun řádku v K40: `prekladNorm` `src/preklad.js:1272` → **`:1286`** (PH přidala hesla překladu).

**Dávka PH ve výchozím stavu** (#568 hlavička ceny PROJ, #569 studie bez zaměření, #572 sklo jen s plochou):
mění `src/nabidka_proj.js`, `src/podminky.js`, `src/docxgen.js`, `src/techspec.js`, `src/engine_proj.js`,
`src/kontroly.js`, `src/preklad.js`, `src/ui/kalk_proj.js`, `mutace_jadro.mjs` a v `src/engine.js` jen
`vypocet` (ř. 2452: razítko `oplasteni.skloJenSPlochou`). **`skloVolba` ani `skloMigraceNazvu` PH nezměnila**,
názvy řádků skla („MATERIÁL VSG 4.4.x“) zůstaly → K40-N1 platí, jak je popsán. `techspec.js` vynechává sklo
s nulovou plochou podle cest ceníku (`TS_OPL_SKLA` = `C.skloBokyKc`, `C.skloCelniKc`, `C.skloVsg442Kc`), ne podle
názvu řádku — s migrací názvů se nepotká. Testy k N1 přibyly: `src/test_570_sklo_bez_plochy.js` (#572).

**Roadmapa:** obsazeno #568, #569, #572 (PH), #570 drží návrh víc šachet, #571 DZ → K40 má volné **#567** a pak
od **#573**.

**5. průchod nad `6b70cc3`** (5. 11. 2026, `origin/claude/integrace-16-10`, **v5.11.3** = v5.11.1 + MU #560 můstky
(v5.11.2) + DZ #571 kopie na Disk (v5.11.3)). **Všechny body trvají** (N1 a N2 znovu ověřeny v Node). **Čísla řádků
v tabulce jsou z `6b70cc3`.**

- **MU #560 — samostatná sekce MŮSTKY** (`Z.mustky[]` po skupinách, skladebný výpočet v Modelu 2, CN v16, nové
  klíče ceníku `C.mustekRamBmKc`, `C.mustekPodlaha*`, `C.mustekZabradli*`, `C.mustekKotveni*`,
  `C.mustekZabradliSkloMontazHodBm` — `src/cenik.js:54–64`, `MUSTKY_SKLADBA_KLICE` `src/engine.js:839`):
  - **K40-N2 trvá a dopad je širší:** `mustkyCenikNovy` (ř. 792–795) dál chce jen `mustekRefSirkaMm > 0`;
    ceník s referenční šířkou 2 mm vrátí z `mustkyCenikKontrola` `ok: true`. Referenční šířka teď škáluje i nosnou
    konstrukci skladebného modelu (`mustkyRozpad` ř. 914–, `bmRef` → `C.mustekRamBmKc`). Kontrola skladebných
    sazeb (nula → potvrzení) už v `mustkyCenikKontrola` je a její komentář na K40-N2 odkazuje — rozsah šířky patří
    do téže funkce. Testy MU: `src/test_560_mustky_sekce.js`, `netlify/test_560_mustky.mjs` (22/0 i bez
    `ADMIN_EMAIL`), zlatá pojistka `src/test_560_zlata.json` + `nastroje/zlata_560.js`; mutace „#560“ v obou sadách.
  - **K40-N5 trvá:** `src/ui/program_ui.js:345–354` a `netlify/functions/program.mjs:104–110` MU nezměnila (čtou jen
    `ctx.cenik`). Zahraniční řada může mít odchylky i u nových klíčů skladebného modelu → kontrolovat celou
    složenou řadu (`cenikZahrSVychozimi`, `src/cenik_rady.js:113`).
  - INFO (mimo K40): zadání skupiny má v kontrole jen horní mez rozměru (`KONTROLY_MUSTEK_MAX_MM` = 6 000,
    `src/kontroly.js:70`, `:588`); šířka skupiny zadaná v metrech (2) projde bez upozornění a dá 1/1 000 ceny
    podlahy. Nehlásím jako nález K40 — jen pro koordinaci.
- **DZ #571 — kopie na Disk nikdy tiše:** `src/ui/online_ui.js` (+77 ř.). Bez hesla z přihlášení (obnovená relace)
  kopie čeká na potvrzení heslem (`kopieDiskCeka('heslo', …)`). **K40-X3** (mez) tedy trvá jen pro přihlášení
  heslem; **K40-X4** — výběr srovnávací kopie (`kopieDiskUklid`) DZ nezměnila, trvá. Testy:
  `src/test_571_kopie_disk_stav.js`, `netlify/test_571_kopie_disk.mjs` (8/0), upravený `src/test_554_kopie_denne.js`.
- **Posuny řádků:** `skloVolba` 420 → 426, `skloMigraceNazvu` 458 → 464, `mustkyCenikKontrola` 845 → 1002,
  `prekladNorm` 1286 → 1314, `ctrlPdDealKontrola` 1021 → 1030, `online_ui.js` +5 až +77 (X3, X4, T2). Beze změny:
  `zamek.js`, `objednane.js`, `zakazka_kontrola.mjs`, `pd_webhook.mjs`, `sod_ui.js`, `common.js`, `zakazka.js`.
- **Roadmapa obsazená do #572** (#560 MU, #568/#569/#572 PH, #571 DZ; #567 a #570 volné, #570 drží návrh víc
  šachet) → **K40: #567 a dál od #573.**

**Změna 9a16ff5 proti df0138c** (jen to, co se K40 týká):
- PR #563: `src/objednane.js` (+33 ř. za `prodNastav`: `prodRidiciSrovnej`, `prodRidiciZamceno`; `prodJedinaZmena`
  srovnává řídící a ignoruje `aktivni`; `prodServer` na konci volá `prodRidiciSrovnej`), `src/ui/sod_ui.js` (+3 ř.
  nad polem data), `src/ui/online_ui.js` (+5 ř. u ř. 1367).
- IK #565: `netlify/lib/zakazka_kontrola.mjs` (+15 ř. za kontrolou ruční ceny, tedy před příjmem nového zámku).
  Interní poznámky jsou pole zakázky mimo data variant a zapisují se i u zamčené nebo prodané zakázky
  (autor z uložené verze). Je to přímý vzor pro `pdVazbaWebhook` (K40-W1).
- MV4 #566: jen `src/test_manual_vypocet.js`.
- **Čísla roadmapy jsou obsazená do #566** (#560 můstky čeká, #564 SV, #565 IK, #566 MV4). Nové položky K40
  dostanou čísla od **#567**.

Čísla řádků v tabulce jsou z `6b70cc3` (5. průchod).

## Tabulka: bod → stav → místo → poznámka

| bod | stav | místo (6b70cc3) | poznámka, kolize, testy a mutace |
|---|---|---|---|
| **K40-N1** čelní sklo po změně zasklení / typu | **trvá** (ověřeno v Node: `nepocitat` i `mnozstviPrepis` s `MATERIÁL VSG 4.4.2` po přepnutí na „mezi příčníky“ zůstanou, `skloMigraceNazvu` vrátí 0 změn, aktuální název je `MATERIÁL VSG 4.4.1`) | `src/engine.js:426–453` `skloVolba`, `:464–493` `skloMigraceNazvu` (dvojice ř. 469–470); `src/ui/common.js:74–79` `skloMigraceAkt`, volání `:59` (`syncVarianta`) a `:797` (`set`); `src/zakazka.js:952` (`importZakazka`) | SV #564 sklo nezasáhla (mění jen světlíky, `svetlikSkloSteny` ř. 993). Další výskyty názvu čelního skla: `src/engine.js:1936`, `:2237`, `src/ui/detail_ui.js:47`, `src/ui/kalk_ock.js:1543` — vzor `^MATERIÁL VSG 4\.4\.[12]$` se s jinými řádky nepotká (jiné sekce `MATERIÁL VSG` nemají). Testy: `src/test_k37_sklo_prepnuti.js`, `test_sklo_vazba.js`, `test_cenik_rady.js` (ř. 490–495), `test_zahr_jen_realizace.js`, `test_555_klon_tisk.js`, `overit_k37_sklo.mjs`, fuzz `src/test_fuzz_invarianty.js`. Mutace: `mutace_jadro.mjs` (6 výskytů `skloMigrace`). |
| **K40-X1/X2** kvadratický ořez konce | **trvá** (30 000 znaků: `nazevCast` 453 ms) | `src/nazvy_souboru.js:44–51` `nazevCast` (výraz ř. 50); `src/preklad.js:1314` (`prekladNorm`; v4.11.8 ř. 1272); `src/plan_plateb.js:435` (`milnik`); `src/slovnik.js:279`; vzor smyčky `src/uloziste.js:64–70` | Dávky 4. 11. nezasáhly. Testy: `src/test_nazvy_souboru.js`, `src/test_ares.js` (volá `nazevCast`). Mutace pro `nazevCast` dnes žádná. |
| **K40-S2** drahá diagnostika rozdílu zámku | **trvá** | `src/zamek.js:607–637` `zamekDataRozdilCesta` (kanonizace na každé úrovni ř. 618, `zamekJsonKanon` ř. 566); volá `netlify/lib/zakazka_kontrola.mjs:451–452` | Prompt měl ř. 613–623. IK vkládá řádky až za ř. 523 → volání se neposune. Testy: `netlify/test_555_klon_tisk.mjs`, `netlify/test_555b_klon_cenik.mjs` (+ `src/test_555*.js`). Mutace: `netlify/mutace.mjs` (2 výskyty). |
| **K40-N2** šířka můstku bez rozsahu | **trvá** | `src/engine.js:792–795` `mustkyCenikNovy` (jen `> 0`), `:1002–1045` `mustkyCenikKontrola` (nový tvar šířku vůbec nehlídá, nový tvar = šířka > 0); `src/ui/program_ui.js:345–354` `progMustkyPotvrd`; `netlify/functions/program.mjs:104–110` | Prompt měl `engine.js:813`; po MU #560 ř. 1002 — viz 5. průchod (skladebný model, širší dopad). Testy: `src/test_548_mustky_bez_cen.js` (+ serverová sada #548). Mutace: hledat pod „#548“. |
| **K40-N5** zahraniční řada bez kontroly můstků | **trvá** | dialog `src/ui/program_ui.js:347` a server `netlify/functions/program.mjs:106–108` čtou jen `ctx.cenik`; `cenikZahrSVychozimi` v `src/cenik_rady.js:113` | Jako N2. |
| **K40-S1** dolní mez data prodeje | **trvá** (mez z `zamek.kdy`, nový zámek až 400 dní zpět) | `src/objednane.js:365–369` `prodDatumOd`, `:371–377` `prodDatumProblem` (beze změny), `:454` `prodJedinaZmena`, `:529` `prodServer` (kontrola data ř. 578, `prodRidiciSrovnej` ř. 586); `src/zamek.js:652–663` (`ZAMEK_KDY_*`, `zamekKdyProblem`); `netlify/lib/zakazka_kontrola.mjs:631–633` (příjem nového zámku); `src/ui/sod_ui.js:393–394` (pole data, `min`) | **PR #563 už je ve výchozím stavu:** `prodJedinaZmena` kopíruje a srovnává uloženou verzi (řídící, `aktivni`) — razítko `prijato` musí projít i tímto porovnáním a `prodRidiciSrovnej` (mění jen `ridici` a `zamek.hlavicka`) ho nesmí rozbít. Testy: `src/test_prodano_zamek.js`, `netlify/test_prodano_zamek.mjs`, `netlify/test_kryci_po_tisku.mjs`, `netlify/test_prava.mjs` (`zamekKdyProblem`), `src/test_563_prodano_ridici.js`, `netlify/test_563_prodano_ridici.mjs` (36/0), `overit_prodano_zamek.mjs` (nový z PR). |
| **K40-N3** mez = zítřek při hodinách napřed | **trvá** | `src/zamek.js:653` `ZAMEK_KDY_NAPRED_MS` = 10 min; mez `prodDatumOd` bez stropu `dnes` | Opravuje se spolu s S1. |
| **K40-W1** webhook naváže existující kalkulaci | **trvá** (bez protokolu, bez `pdVazbaWebhook`) | `netlify/functions/pd_webhook.mjs:149–160` (nalezení podle čísla), `:186–187` (`bezVazby` → `pdDealId`), rejstřík `:214`; `src/controlling.js:1030–1038` `ctrlPdDealKontrola` | Prompt měl `controlling.js:1003–1012` (posun +18). `protokol.js` **už je** v jádru serveru (`netlify/lib/jadro_moduly.cjs:60`) — doplňovat netřeba. Dávky 4. 11. webhook nezasáhly. Vzor pole na zakázce mimo varianty, které jde zapsat i u zamčené či prodané zakázky: interní poznámky IK (`netlify/lib/zakazka_kontrola.mjs:531–`, `poznamkySmiPsat`). Testy: `netlify/test_553_webhook.mjs`, `test_prava.mjs`, `test_zalohy.mjs`. Mutace: `netlify/mutace.mjs` (19 výskytů `pd_webhook`). |
| **K40-X4** budoucí kopie na Disku | **trvá** | `src/ui/online_ui.js:2165` `kopieDiskUklid`, výběr `:2191` | Prompt měl ř. 2167. DZ #571 výběr nezměnila. Testy: `src/test_552_nazvy_zaloh.js`, `test_554_kopie_denne.js`, `test_kopie_disk.js`, `test_z2_disk_retence.js`. Mutace: 1 v `netlify/mutace.mjs`. |
| **K40-N4** komentář DPH PROJ | **trvá** (jen komentář) | `src/zakazka.js:925–933` (komentář ř. 932) | Beze změny proti promptu. |
| **K40-S4** `ADMIN_EMAIL` bez výchozí hodnoty | **trvá, širší rozsah** | bez `ADMIN_EMAIL` skončí **výjimkou**: `netlify/test_555b_klon_cenik.mjs`, `test_555_klon_tisk.mjs`, `test_560_svetliky_stavba.mjs` (nová z SV), `test_controlling.mjs`, `test_funkce.mjs`, `test_klon_sleva.mjs`, `test_obnova_nanecisto.mjs`, `test_pipedrive.mjs`, `test_stary_tvar.mjs`; `test_zalohy.mjs` dá 116 OK / 31 FAIL (stav nad 9a16ff5 stejný) | Vzor `podklady/K10_pokusy/harness.mjs:7`. Nové sady z dávek 4. 11. projdou i bez proměnné: `test_561_rucni_cena` 29/0, `test_563_prodano_ridici` 36/0, `test_ik_poznamky` 13/0. |
| **X6** `path` bez `escJs` | **trvá** | `src/ui/cenik_ui.js:206`, `:208`; stejně i `:176`, `:177`, `:184`, `:185` (`set('${path}', …)`) | Prompt jmenuje jen 206/208 — doporučuji obalit i 176–185. `RIZIKO` v `src/test_escape.js:170` `path`/`cesta` nemá. |
| **K40-X5** záložní buňka CSV | **trvá** | `src/slovnik.js:148–150`, `src/pd_nanecisto.js:141`; `csvBunka` `src/format.js:118–122` | Záloha ve `slovnik.js` má jiné pravidlo (`+`/`-` jen před ne-mezerou) než `csvBunka` (každé `+`/`-`), záloha v `pd_nanecisto.js` ochranu proti vzorcům nemá vůbec. Testy: `src/test_csv_vzorce.js`. |
| **K40-T1** harnessy bez `najdiNejnovejsi` | **trvá** | `najdiNejnovejsi` mají jen `overit_sablona.mjs` a `nastroje/harness_podklady.mjs`; pevná jména: `overit_nabidka_proj_word.mjs:48–52`, `overit_sablony_online.mjs:162–175`, `overit_sod.mjs:45–47`, `:167` (v3); výjimka „už seznam plateb“ z `nastroje/vyrob_sablony.js:869` | — |
| **K40-T2** čekání na „jakoukoli hlášku“ | **trvá** | `overit_online.mjs:1170`; průběžná hláška `src/ui/online_ui.js:3369` (prompt: 3274) | Podobné podmínky `!!o.hlaska` také `overit_online.mjs:1116`, `:1183`, `:1193`, `:1208` — zkontrolovat. |
| **K40-T3** filtr #367 skryje řádky PROJ a smluv | **trvá** | `overit_sablony_online.mjs:182`, `:184`, `:186`, `:275` (prompt: 181/183/274); `overit_sod.mjs:139` (prompt: 138); filtr `src/ui/nastaveni_ui.js:936` (prompt: 963); vzor `overit_nabidka_proj_word.mjs:192–201` | — |
| **K40-P1** kolize čísel B | **trvá** | `BEZPECNOST_MEZE.md` oddíl „PW #553“ ř. 1360, meze ř. 1374 (B176), 1387 (B177), 1395 (B178), 1409 (B179); odkazy #553: `CHANGELOG.md:163`, `roadmapa/roadmap.json` #553 (ř. 8397) | **Nejvyšší použité číslo je B198** (RC #561, B195–B198) — B199–B202 volné, nové meze od B203. V `netlify/mutace.mjs` žádná mutace #553 číslo B17x nenese. PR, IK ani MV4 žádné číslo B nepřidaly (ověřeno i nad 9a16ff5). |
| **K40-X3** (mez) heslo správce pro kopii na Disk | zapsat | `src/ui/online_ui.js:318`, `:398`, `:1965`/`:2004` (`onlineZalohaAuto`), `:2228–2238` (`kopieDiskProved`), `:2341–` (`onlineKopieDiskAuto`) | Po DZ #571 bez hesla z přihlášení kopie čeká na heslo (`kopieDiskCeka`), mez platí pro přihlášení heslem. |
| **K40-S3** (mez) číslo SoD a datum podpisu po Prodáno | zapsat | `src/zamek.js:400–415` (`ZAMEK_PRODANO_SOD_POLE`, `zamekProdanoSodVolne`) | Prompt měl 396–399/413. |
| N46 | mimo | — | Podle rozhodnutí J. V. se neopravuje. |

## Opraveno při kroku 0
Nic. Všechny body K40 trvají i nad `6b70cc3` (5. 11.) (N1 znovu ověřen v Node: `skloMigraceNazvu` 0 změn,
`MATERIÁL VSG 4.4.2` ve vyřazených zůstává).

## Na co se čeká
- Pokyn „SPUSŤ K40 nad <SHA>“ (výchozí bude nejspíš `5da7a2d` nebo novější).
