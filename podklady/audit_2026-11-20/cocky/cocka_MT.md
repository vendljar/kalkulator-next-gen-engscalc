# Čočka MT — bezpečnostní rozdíly ostrý (`origin/main`) × testovací (`origin/test`)

Audit 20. 11. 2026. Stav: `origin/main` = `6c4bc80e` (**v11.11.1**, 11. 11. 2026), `origin/test` = `cda289e2` (v19.11.11).
Pozn. k zadání: zadání uvádí main „v13.11.x“; `git show origin/main:verze.txt` i `PREHLED.md:10` říkají **v11.11.1**. Co skutečně běží na ostrém webu, jsem neověřoval (ostrý web se nevolá) — vše níž platí pro kód větve `origin/main`.

## Anonymní útočný povrch na ostrém (bod 4 zadání)

**Nadpis „KRITICKÉ NA OSTRÉM“ nepoužívám — nic anonymně zneužitelného jsem v kódu main nedoložil.**

Ověřeno čtením `origin/main`:
- Funkce bez relace jsou jen: `prihlaseni.mjs`, `zdravi.mjs`, `pd_webhook.mjs`, `zaloha_disk.mjs`, `zaloha_nocni.mjs` (ostatních 25 volá `vyzadujRoli` / `pdPristup`).
- `pd_webhook.mjs:79-84` (main): klíč z `PIPEDRIVE_WEBHOOK_KLIC`, kratší než 32 znaků = nenastaveno → 503 (`lib/pd_webhook.mjs:30,52-55`), porovnání `tajneShodne` (`:76-79`), klíč v adrese se nepřijímá; z těla jen ID dealu. Žádný výchozí klíč.
- `zaloha_disk.mjs:42-47` (main): token `KNG_DISK_TOKEN` jen v hlavičce, `tajneShodne`. `zaloha_nocni.mjs` má jen `config.schedule` (bez `path`); `zaloha_vynuceno.mjs:239` má `path` a vyžaduje relaci.
- `lib/sdilene.mjs:344-347` (main): `TAJEMSTVI_RELACE` bez výchozí hodnoty (chybí → výjimka).
- `zdravi.mjs` vrací jen verzi, prostředí a čas.
- Tyto soubory jsou na main a testu **shodné** kromě `pd_webhook.mjs` a `prihlaseni.mjs` (jen zápis aktivity #ON). `netlify.toml`, `.github/`, `nastroje/hooky`, `nastroje/kontrola_udaju.py`, `package.json`, `package-lock.json` jsou na main a testu **beze změny** (`git diff --stat` prázdný).

## (a) Na main chybí / je horší

| ID | Téma | Vada na main | Důkaz `origin/main:` | Opraveno na testu | Závažnost na ostrém | PoC |
|---|---|---|---|---|---|---|
| MT-1 | Antedatovaný prodej (K40-S1, #580) | Obchodník uloží novou zakázku s vlastnoručně vyrobeným zámkem −300 dní a prodejem téhož dne; server nemá razítko přijetí zámku, dolní mez data prodeje je jen `zamek.kdy` z dat klienta | `src/objednane.js:385-395`, `netlify/lib/zakazka_kontrola.mjs:371` a `:708` (razítko `prijato` se nepíše), `src/uloziste.js:669` | v12.11.2 (`zakazka_kontrola.mjs:811`, `src/objednane.js:400-429`) | **střední** (integrita controllingu / období prodeje; obchodník, ne anonym) | `poc_MT_prodej_antedatace.mjs` — main ZRANITELNÉ, test ODOLNÉ |
| MT-2 | Kvadratický ořez konce textu (K40-X1/X2, #579) | `nazevCast` s výrazem `[-.]+$`: 60 000 znaků = 1,5 s na jedno volání | `src/nazvy_souboru.js:44-51`; stejný vzor `src/preklad.js:1332`, `src/plan_plateb.js:435` | v12.11.1 (`src/format.js` `orezKonce`) | nízká (DoS prohlížeče; dosah z uložených dat bez stropu délky jsem neověřil) | `poc_MT_orez_konce.mjs` — main ZRANITELNÉ, test ODOLNÉ |
| MT-3 | Drahá diagnostika rozdílu zámku (K40-S2, #580) | `zamekDataRozdilCesta` kanonizuje oba podstromy na každé úrovni (hloubka × velikost) — běží na serveru při uložení zamčené varianty | `src/zamek.js:632` | v12.11.2 | nízká (DoS přihlášeným; neměřeno) | ne |
| MT-4 | Webhook Pipedrive bez pojistek vazby (K40c, #581) | Webhook naváže EXISTUJÍCÍ kalkulaci na deal podle čísla nabídky bez potvrzení, bez možnosti vazbu odmítnout a bez stopy v protokolu zakázky; firma se bere z dealu, ne z ARES | `netlify/functions/pd_webhook.mjs:150-170` (hledání podle čísla), `netlify/lib/pd_webhook.mjs:160-185` | v12.11.7 (`pdVazbaWebhook`, `pdOdmitnuto`, `pdProtokol`) | nízká / informativní (vyžaduje klíč webhooku nebo zápis do CRM; známé meze B199–B202) | ne |
| MT-5 | Úklid kopií na Disku (K40-X4, D2) | Srovnávací kopie pro pojistku úbytku se vybírá i z kopií se stejným/budoucím dnem; neplatný den srovnání tiše přeskočí a maže se dál | `src/retence_zaloh.js` (funkce `retenceZalohDiskPredchozi` na main chybí) | v12.11.1 (+ nový `kopie_disk.gs`) | nízká (vyžaduje zápis do složky Disku; mez B205) | ne |
| MT-6 | `escJs` u cest v `onchange` (K40-X6, D7) | `set('${path}', …)` bez `escJs`; cesty jsou dnes z konstant — jen obrana do hloubky | `src/ui/common.js:845-850` | v12.11.1 | informativní (nezneužitelné, dokud cesta nepochází z dat) | ne |
| MT-7 | Ceník můstků ve složené zahraniční řadě (K40-N5) | Nulová montáž / nevěrohodná šířka jen v zahraniční řadě se zveřejní bez potvrzení | `netlify/functions/program.mjs:108-110` (kontrola jen české řady) | v12.11.1 | informativní (jen administrátor, vada ceny, ne bezpečnost) | ne |
| MT-8 | Smlouva v jazykové verzi převážně česky (C7, K48-N1) | Server zveřejní i vrátí jazykovou šablonu smlouvy bez kontroly podílu češtiny | `netlify/functions/sablony.mjs:83-86` (kontrola chybí) | v18.11.7 | informativní (dokument, ne bezpečnost) | ne |

Mimo bezpečnost, ale na main trvá a mění cenu: #614 (K40-N1 čelní sklo) — `PREHLED.md:43,72`; nehodnotím.

## (b) Nový povrch jen na testu (na main není)

| ID | Co | Kde (origin/test) | Poznámka |
|---|---|---|---|
| MT-N1 | `POST /api/pd/vazba` (nahlásit / zrušit vazbu z webhooku) | `netlify/functions/pd_vazba.mjs:40,62` | relace povinná (`pdPristup` s `bezPrava`), zrušit jen autor / administrátor |
| MT-N2 | `POST /api/pd/organizace` (oprava firmy v CRM podle ARES, „vítěz“) — **zápis do Pipedrive** | `netlify/functions/pd_organizace.mjs:55,82,86,101` | autor / administrátor + právo Pipedrive; kontrola, že organizace patří dealu zakázky |
| MT-N3 | Server volá ARES (odchozí síť z funkce, i z webhooku) | `netlify/lib/ares_server.mjs:11-33,109-127` | 1 pokus, 3 s, strop odpovědi 200 kB |
| MT-N4 | **Uvolnění práva:** deal id zakázky smí měnit i autor zakázky (main: jen administrátor) | `src/controlling.js:1061-1068` (main `:1040`) | vědomé rozhodnutí J. V. 11. 11.; dopad na zápisy do cizího dealu jsem neověřoval |
| MT-N5 | Poznámky dealu (šachty, další zákazníci) psané při uložení zakázky — zápis do Pipedrive z `/api/zakazky` | `netlify/functions/zakazky.mjs:196-213`, `netlify/lib/pd_poznamka.mjs` | za vypínači `viceSachet` / `viceZakazniku` |
| MT-N6 | Víc zákazníků na zakázce (VZ E0–E6, T1, F1, F2) | `netlify/lib/zakazka_kontrola.mjs:303-364`, `src/vice_zakazniku.js` (1 841 řádků), `netlify/lib/pd_org_vitez.mjs` | výchozí VYP; riziko úniku údajů mezi zákazníky (VZ-N3 #653 opravena v18.11.8); meze B220–B228 |
| MT-N7 | Webhook: čísla s písmenem zákazníka a příponou varianty | `netlify/functions/pd_webhook.mjs:161-184`, `netlify/lib/pd_webhook.mjs:253-304` | širší hledání kalkulace podle čísla |
| MT-N8 | #ON čas poslední aktivity | `netlify/lib/sdilene.mjs:625,655-711`, `netlify/functions/uzivatele.mjs:546-549` | nové úložiště `aktivita`; ven jen ve výpisu pro administrátora |
| MT-N9 | UE úprava cizího účtu správcem, razítko se seznamem polí | `netlify/functions/uzivatele.mjs:181-198` | pravidla práv beze změny |
| MT-N10 | D6 návrh obchodníka do číselníku (`varianta.popisyNavrhy`) | `netlify/functions/popisy.mjs:76-98` | čte se přes `popisyOciste` |
| MT-N11 | Nové klientské dokumenty skládající HTML: náhled podkladů (NP), Objednávka / Smlouva PROJ (D3), lhůty PROJ (D8) | `src/nahled_word.js`, `src/ui/nahled_word_ui.js`, `src/objednavka_proj.js`, `src/ui/objednavka_proj_ui.js`, `src/lhuty_proj.js` | nejmladší kód (19. 11.), nejméně prověřený |
| MT-N12 | `pdZavolej` — volby `pokusu`, `casLimitMs` | `netlify/lib/pipedrive.mjs:132-160` | změna jediného místa, kde se sahá na síť CRM |

## (c) Detail

### MT-1 — antedatovaný prodej (střední, main dotčen: ano; test: opraveno)
- **Předpoklady:** přihlášený Obchodník.
- **Kroky:** `POST /api/zakazky` s novou zakázkou; varianta nese zámek `nabidkaTisk` s `kdy` = dnes − 300 dní a `prodano.datum` téhož dne.
- **Proč to projde:** dolní mez je jen `prodDatumOd(v)` = den z `v.zamek.kdy` (`origin/main:src/objednane.js:385-395`), a ten čas u NOVÉHO zámku dodává klient. Server čas prvního přijetí zámku nezapisuje (`origin/main:netlify/lib/zakazka_kontrola.mjs:708` — jen `zamek.kdo`).
- **Výstup PoC (main):** `HTTP 200`, `prodano.datum = 2026-01-23`, `zamek.prijato = PODVRŽENÉ převzato`, „ZRANITELNÉ“. **Test:** `HTTP 400 … nejvýš 7 dní před přijetím odeslané nabídky serverem`, „ODOLNÉ“.
- **Dopad:** prodej i odeslání nabídky lze zapsat do libovolného minulého období (controlling, vyhodnocení obchodníků). Cena ani práva se nemění.
- **Oprava:** sloučit K40b (#580, v12.11.2) do main. Zbytková mez B207 (antedatovaný čas tisku dál určuje období odeslání) platí i na testu.

### MT-2 — kvadratický ořez (nízká)
- PoC nad main: 15 000 zn. 108 ms, 30 000 zn. 424 ms, 60 000 zn. 1 550 ms; test ≤ 0,3 ms.
- Na serveru se `nazevCast` ani `prekladNorm` nevolá (grep `netlify/functions`, `netlify/lib` na main bez nálezu) — jde o prohlížeč.
- **Neověřeno:** kterou cestou se na main dostane do `nazevCast` text bez stropu délky (číslo nabídky má strop 60). CHANGELOG v12.11.1 uvádí název varianty a zákazníka.

### MT-3, MT-5 — bez PoC
Rozdíl doložen jen diffem a popisem opravy v CHANGELOG (v12.11.1, v12.11.2); čas ani scénář jsem neměřil.

### MT-4 — webhook
Na main chybí `pdVazbaWebhook`, `pdOdmitnuto` i `pdProtokol`. Chování zmrazené hlavičky je rovnocenné: main `lib/pd_webhook.mjs:165` (`varianty.some(zamcena)`) pokrývá totéž co nové `hlavickaZmrazena`, protože zmrazení vždy předpokládá zamčenou variantu.

### Klient — escapování (bod 5)
`git diff origin/main origin/test -- src/ui/common.js src/test_escape.js`:
- jediná oprava escapování existujícího kódu je K40-X6 / D7 (`escJs` u `path`, `cesta`, `bind` v obsluhách; `path|cesta|bind` přidány do `RIZIKO` v `test_escape.js`). Na main jsou tyto cesty literály → **žádné doložené XSS na main**, které by test opravoval.
- ostatní změny `common.js` jsou nové funkce (víc zákazníků, vazba z webhooku, čeština šablon); nové interpolace jsou zapsané v seznamu ověřených v `test_escape.js`.
- další zmínky „escape“ v CHANGELOG od v11.11.1 (SP #667 N4 výběr volby, VZ-F1, NP logo) se týkají kódu, který na main není.

## Položky CHANGELOG / roadmapy s bezpečnostním významem, které NEJSOU na main
- v12.11.1 K40a #579: K40-X1/X2 (MT-2), K40-X4 + D2 (MT-5), K40-X5 (`csvBunka` v záložních větvích — na main se záložní větev v sestavené aplikaci nepoužije, `src/slovnik.js:150`, `src/pd_nanecisto.js:148`), K40-X6 + D7 (MT-6), K40-N2/N5 (MT-7); meze B203–B205b.
- v12.11.2 K40b #580: K40-S1, K40-N3 (MT-1), K40-S2 (MT-3); meze B206, B207.
- v12.11.5 VSD #588: poznámka šachet do Pipedrive, mez B217.
- v12.11.7 K40c #581: vazba z webhooku, ARES na serveru, oprava firmy; meze B208, B209 (MT-4, MT-N1–N4).
- v12.11.4 C5 #585: nástroj obnovy testovací sady; meze B215, B216.
- v16.11.1–v19.11.4 VZ #598–#606, #653–#663, #669: víc zákazníků; meze B220–B228 (jen nový kód).
- v18.11.7 C7 #615 (MT-8); v18.11.9 UE #664; v19.11.8 #ON #679.
- Otevřené v roadmapě (ani na testu): #624 (zakázka bez autora dostane autora z relace, B73), #636 (B226 souběh), #640 (B221 role jen ke čtení), #644 (občasné selhání testu úniku `test_vz_unik.js`), #665.

## Co je v pořádku
- Anonymní povrch main = test (viz výše), bez výchozích tajemství.
- Diff `netlify/functions` a `netlify/lib` (30 → 32 funkcí) neobsahuje jinou opravu práv než MT-1; ostatní změny jsou nové funkce nebo neutrální (`funkce.mjs`, `obnova.mjs`, `odhlaseni.mjs`, `pd_nanecisto.mjs`, `popisy.mjs`, `program.mjs`, `sablony.mjs`, `zalohovani.mjs`, `pd_mapa.mjs`, `pd_prevod.mjs`).
- CSP a hlavičky (`netlify.toml`), workflow a hooky jsou na obou větvích stejné.

## Co testy / mutace NEhlídají
- Žádný test ani krok kola neběží nad stromem `origin/main`; rozdíl main × test hlídá jen porovnání cen (`porovnej_sestaveni`), ne práva. Oba PoC berou `KNG_STROM`, takže jdou pustit nad libovolným stromem.
- MT-1 hlídá na testu `netlify/test_k40b_prodej_mez.mjs` a mutace „[K40b]“ (14 výskytů v `netlify/mutace.mjs`); nové oblasti mají značky v mutacích ([K40c], [VZ E*], [VZ T1], [VZ F*], [ON], UE, [C7], VSD, D8).
- `netlify/mutace.mjs` neobsahuje nic k `objednavka_proj` ani `nahled_word` (D3, NP — čistě klientský kód); pokrytí mutacemi jádra jsem neověřoval.
- `netlify/test_prava.mjs` má `pd_vazba` a `pd_organizace` v tabulce koncových bodů (`:592,598`); uvolnění práva MT-N4 (autor mění deal id) jsem proti zápisům do cizího dealu nezkoušel.

## PoC (spuštěno, výstupy výše)
- `podklady/audit_2026-11-20/poc_MT_prodej_antedatace.mjs`
- `podklady/audit_2026-11-20/poc_MT_orez_konce.mjs`
- Strom main: `scratchpad/main_strom` (`git archive origin/main netlify src verze.txt package.json`).
