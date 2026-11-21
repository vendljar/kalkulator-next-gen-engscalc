# Čočka R2 — regrese známých bezpečnostních nálezů (B151–B230, SEC-M / SEC-Z / SEC-I)

Noční bezpečnostní audit KNG 20. 11. 2026. Stav kódu: `origin/test` = `cda289e` (v19.11.11). Jen čtení kódu a lokální běhy
(paměťové úložiště, bez sítě).

**Pozor na `origin/main`:** společná pravidla uvádějí „v13.11.x“, ale místní `origin/main` je `6c4bc80` = **v11.11.1**
(`git show origin/main:verze.txt`; shodně `PREHLED.md`). `git fetch` jsem nepouštěl (síť). Sloupec „main“ se vztahuje k v11.11.1.

## Jak bylo ověřováno

- Všechny serverové sady `netlify/test_*.mjs` kromě `test_mutace*` (78 souborů) — **vše 0 FAIL** (mj. `test_prava` 1006/0,
  `test_vyjimky` 79/0, `test_kryci_po_tisku` 48/0, `test_zobrazeni_heslo` 23/0, `test_secm` 60/0, `test_sec_i7` 32/0,
  `test_sec_m16` 44/0, `test_sec_z2` 40/0, `test_obnova` 238/0, `test_vz_server` 128/0, `test_on_aktivita` 38/0,
  `test_ue_uzivatele` 34/0, `test_uklid` 20/0, `test_koncova_cena` 111/0, `test_pd_pristup` 54/0).
- Cílené sady jádra (17 souborů): `test_slovnik` 89/0, `test_vyjimky` 124/0, `test_zobrazeni` 68/0, `test_sod_en` 51/0,
  `test_analytika` 69/0, `test_cena_dle_nabidky` 62/0, `test_kryci_po_tisku` 103/0, `test_odhlaseni_text` 4/0,
  `test_zobrazeni_heslo_okno` 15/0, `test_meze_cisla` 6/0, `test_o5_docx` 14/0, `test_sod_proj_rozsah` 38/0,
  `test_vz_tisk_vstupy` 78/0, `test_vz_ui` 161/0, `test_vz_kl_pole` 48/0, `test_zmrazeni_kl` 126/0. Zbylých ~300 sad jádra
  a prohlížečové harnessy (`overit_*.mjs`) jsem **nepouštěl**.
- Staré pokusy `podklady/AUDIT2*_pokus_*.mjs` (9) a `podklady/SECM_pokusy/{server_a,server_b,regrese}` (9) spuštěny;
  výsledky jsou v tabulce. Pokusy psané „v útočném smyslu“ hlásí FAIL tam, kde oprava drží (útok dostal 403/409).
- U každé opravy grep místa opravy v dnešním kódu a přítomnost téhož symbolu na `origin/main` (`git grep`).
- Mutace nepuštěny (zákaz). Počty mutací ve sloupci důkazů jsou počty výskytů značky v `netlify/mutace.mjs` /
  `mutace_jadro.mjs`, ne výsledek běhu.

## Souhrn

- **VRÁTIL SE: 0.** Žádný dříve opravený nález B151–B230 ani SEC-M/Z/I se na `origin/test` znovu neotevřel.
- **Zhoršené / zastaralé meze: 3** (R2-1 nízká, R2-2 a R2-3 informativní) + 1 poznámka k hlídání (R2-4 informativní).
- **Opravy, které NEJSOU na `origin/main` (v11.11.1):** B205 / K40-X4 (výběr srovnávací kopie na Disku, v12.11.1)
  a K40-S1 (dolní mez data prodeje z razítka přijetí zámku, v12.11.2 — k ní patří meze B206, B207). Všechny opravy
  B151–B194 a SEC-M/Z/I na main jsou.
- NENALEZENO: B218, B219, B222, B229 (čísla nepřidělena; B220–B229 rezervovala koordinace etapám VZ, použita jen část).

## Nové nálezy čočky

| ID | závažnost | nález jednou větou | kde | PoC | main dotčen |
|---|---|---|---|---|---|
| R2-1 | nízká | Mez B195 se od SP #667 (v19.11.1) rozšířila o nulovou cenu z nabídky a `BEZPECNOST_MEZE.md` dál tvrdí opak („nula ani záporná neprojde“, „nekladnou cenu odmítne 400“); obchodník sám, se zdrojem o jednom znaku, odešle nabídku za zlomek ceníkové ceny bez schválení a bez kontroly minimální marže. | `src/rucni_ceny.js:131`, `:163`, `:301`; `BEZPECNOST_MEZE.md:1458-1464`, `:1475-1484` | `podklady/audit_2026-11-20/poc_AZ_8_rucni_cena_nula.mjs` (čočka AZ); doplňkově `poc_R2_b195_nulova_cena.mjs` | ne (main nulu odmítá: `h > 0`), mez B195 s kladnou cenou platí i tam |
| R2-2 | informativní | SEC-M14 a SEC-M15 byly odloženy „až se zápisem do Pipedrive“; zápisy dnes běží (PATCH/POST/PUT), ošetření se neudělalo a meze to neříkají. | `netlify/lib/pipedrive.mjs:67-74` (`pdZaklad`), `:91-107` (`popisStavu`), `netlify/functions/pd_deal.mjs:73-78` | `podklady/SECM_pokusy/server_b/p5_pipedrive.mjs` (S1, D2, TK1 dnes FAIL) | ano (čtecí část); zápisy organizace/poznámek/vítěze na main nejsou |
| R2-3 | informativní | Strážci úniku mezi zákazníky (B223) neznají nové generátory: Objednávka PROJ a náhled podkladů ve vzhledu Wordu nejsou ve statické kontrole, Objednávka není ani ve strukturním testu vstupů. | `nastroje/kontrola_vz_unik.sh:11`; `src/test_vz_tisk_vstupy.js:39-53` | ne (chování je dnes správné, chybí jen hlídání) | ne (funkce na main nejsou) |
| R2-4 | informativní | Pět starých pokusů už neodpovídá dnešním pravidlům a hlásí falešné FAIL (nebo spadnou), takže se jako regresní sada nedají číst bez výkladu. | viz detail | — | — |

## Tabulka B151–B230

Stav: OPRAVENO = oprava v dnešním kódu je a test ji hlídá (sada zelená). TRVÁ = neopraveno; „vědomá mez“ = zapsáno
v `BEZPECNOST_MEZE.md` s rozhodnutím.

| ID | původní nález | závažnost | stav | důkaz (origin/test) | main |
|---|---|---|---|---|---|
| B151 | Analytika: převod čísla zakázky sléval tvary, jeden účet zaplnil strop klíčů | nízká | OPRAVENO v15.10.6 | `netlify/functions/analytika.mjs:31-50`; `netlify/test_funkce.mjs:532` | ano |
| B152 | Server nekontroloval typ `kryci.hodnoty` (objekt shodil vykreslení) | nízká | OPRAVENO v15.10.6 | `src/uloziste.js:1102-1126`; `netlify/test_kryci_po_tisku.mjs:162` | ano |
| B153 | Dotisk dokumentu druhé strany obešel schválení cenové výjimky | vysoká | OPRAVENO v15.10.8 | `netlify/test_vyjimky.mjs:314`, `:452`; pokus `AUDIT25_pokus_B153_dotisk.mjs` → dotisk 403 | ano |
| B154 | Otisk výjimky (FNV 32 bit) šel záměrně trefit | vysoká | OPRAVENO v15.10.8 | `src/vyjimky.js:284-299` (porovnává se celý text obsahu); `netlify/test_vyjimky.mjs`; pokus `AUDIT25_pokus_B154_kolize.mjs` padá na vlastní chybě (RangeError), neověřuje nic | ano |
| B155 | Obsah výjimky nenesl rozsah pásu „jiné“ | střední | OPRAVENO v16.10.1 | `src/vyjimky.js:88`, `:153`; `netlify/test_vyjimky.mjs:279`; pokus `AUDIT25_pokus_B155_rozsah.mjs` „shoda false“ | ano |
| B156 | Odhlášení a profil zapisovaly celý účet (ztráta zásahu správce) | střední | OPRAVENO v23.10.5 (SEC-S2); zbytek = okno mezi čtením a zápisem bez podmíněného zápisu | `netlify/functions/uzivatele.mjs:199-201` (jen pole profilu na čerstvý záznam), `netlify/functions/odhlaseni.mjs:26-30`; `netlify/test_ok8.mjs`; UE #664 jde stejnou cestou | ano |
| B157 | Volná pole krycího listu cizí odeslané nabídky změní kterýkoli obchodník | nízká | TRVÁ — záměrné chování (J. V. 15. 10.) | `BEZPECNOST_MEZE.md:561`; `netlify/test_kryci_po_tisku.mjs:185` | ano (stejné) |
| B158 | Strop Pipedrive šel obejít souběhem | nízká | OPRAVENO v16.10.4; zbytek TRVÁ (mez mezi instancemi funkce) | `netlify/lib/sdilene.mjs:112`, `netlify/lib/pipedrive.mjs:243-257`; `netlify/test_pd_pristup.mjs:189`. Třída meze se rozrostla o další počítadla (B200, B212, strop oprav organizace, vítěz, poznámky, rozestup B230) — každé zapsané | ano |
| B159 | `Origin: null` a `text/plain` prošly zápisovými body | informativní | OPRAVENO v16.10.4; zbytek TRVÁ (požadavek bez Origin projde — vědomá mez) | `netlify/lib/sdilene.mjs:497-512`; `netlify/test_prava.mjs:2872`; pokus `SECM_pokusy/server_a/pokus_puvod.mjs` 18 drží | ano |
| B160 | Slovník přijal klíč `hasOwnProperty` | informativní | OPRAVENO v16.10.4 | `src/slovnik.js:304-307`; `netlify/test_prava.mjs:2396`, `src/test_slovnik.js` | ano |
| B161 | Dotisk odeslané nabídky nese aktuální hlavičku zakázky | informativní | TRVÁ — vědomá mez | `BEZPECNOST_MEZE.md:644` | ano (stejné) |
| B162 (B162a) | Obchodník přečte starší ceníky v online zakázkách | informativní | TRVÁ — vědomá mez; B196 ji vědomě rozšiřuje o `zaklad` ruční ceny | `BEZPECNOST_MEZE.md:657`, `:1485` | ano (stejné) |
| B163 | Po tisku SoD zamčené i údaje zmocnitele plné moci | informativní | OPRAVENO v16.10.4 | `src/zamek.js:323-330`; `netlify/test_kryci_po_tisku.mjs:146` | ano |
| B164 | Zámek SoD stojí na záznamu tisku od klienta | informativní | TRVÁ — vědomá mez (u víc zákazníků přiznáno i podvržení typu záznamu, B228) | `BEZPECNOST_MEZE.md:669` | ano (stejné) |
| B165 | Schvalovatel neviděl částky; role si schválí vlastní výjimku | informativní | část 1 OPRAVENO v17.10.5; část 2 TRVÁ — vědomá mez (#425 se nedělá) | `src/ui/schvalovani_ui.js:501`, `:553`; `src/test_vyjimky.js:421`; `BEZPECNOST_MEZE.md:526-533` | ano |
| B166 | `overit_xss.mjs` nehlídal kartu výjimky, lištu zámku, verzi Node v CI | informativní | OPRAVENO v16.10.4 | `overit_xss.mjs:19`, `:249`; `.github/workflows/testy.yml:72` (22.23.2 = `netlify.toml:19`). Harness jsem nepouštěl | ano |
| B167 | `test_ucty_informativni.mjs` padal bez `ADMIN_EMAIL` | informativní | OPRAVENO v15.10.6 | sada 21/0 | ano |
| B168 | Matice zobrazení šla změnit bez hesla správce | střední | OPRAVENO v18.10.6 | `netlify/test_zobrazeni_heslo.mjs` 23/0; pokus `SEC_AUDIT_MAIN` matice (401 bez hesla) | ano |
| B169 | Server nehlídá nástupiště, sloupky a horní mez čistého vstupu | — | TRVÁ — vědomá mez | `BEZPECNOST_MEZE.md:378` (neověřováno pokusem) | ano (stejné) |
| B170 | Překlad ze slovníku může změnit číslo v podmínkách | — | TRVÁ — vědomá mez | `BEZPECNOST_MEZE.md:387` | ano (stejné) |
| B171 | Odhlášení odhlásí všechna zařízení a UI to neříkalo | informativní | OPRAVENO v18.10.13 | `src/ui/online_ui.js:460`; `src/test_odhlaseni_text.js` 4/0 | ano |
| B172 | `w:delInstrText` v kontrole šablon | — | TRVÁ — vědomá mez | `BEZPECNOST_MEZE.md:407` | ano (stejné) |
| B173 | Slovník vloží nový symbol `{{…}}` | — | TRVÁ — vědomá mez | `BEZPECNOST_MEZE.md:413` | ano (stejné) |
| B174 | `pd_cache` a `strop:` bez mazání (osobní údaje z CRM) | informativní | OPRAVENO v18.10.13 | `netlify/lib/uklid.mjs:28-50`; `netlify/test_uklid.mjs`. Nová počítadla (`strop:organizace:`, `strop:vazba:`, `strop:org-vitez:`…) leží v tomtéž úložišti a úklid je bere (`netlify/lib/pipedrive.mjs:245`) | ano |
| B175 | Analytika: server klíče prvků jen ořízl | informativní | OPRAVENO v18.10.13 | `src/analytika.js:106`, `:170`; `src/test_analytika.js` 69/0 | ano |
| B176 | Neznámé právo znamenalo „povoleno“ | informativní | OPRAVENO v18.10.6 | `src/zobrazeni.js:566-574`; `src/test_zobrazeni.js` 68/0 | ano |
| B177 | Podobné znaky ‹ › ve jménu u razítka | — | TRVÁ — vědomá mez | `BEZPECNOST_MEZE.md:447` | ano (stejné) |
| B178 | Schválený pás „jiné“ šel zvětšit změnou výšky šachty | střední | OPRAVENO v17.10.4 (+ v17.10.5) | `netlify/test_vyjimky.mjs:333`; pokus `AUDIT26_pokus_B178_vyska.mjs`: zámek se zdvihem 40 m → 403 | ano |
| B179 | Příznak „cena dle nabídky“ přecházel do platného ceníku z ceníku varianty | střední | OPRAVENO v17.10.4 | `netlify/test_cena_dle_nabidky.mjs:127`; pokus `AUDIT26_pokus_B179_priznak.mjs`: krok 3 → 403 | ano |
| B180 | Rozpis zveřejnění ceníku neukazoval změny příznaků | nízká | OPRAVENO v17.10.1 | `src/ui/program_ui.js:385`, `src/cenik.js:448`; `src/test_cena_dle_nabidky.js:194` | ano |
| B181 | Znění hlášky výjimky podle razítka ceníku z požadavku | informativní | TRVÁ — vědomá mez znění | `BEZPECNOST_MEZE.md:554` | ano (stejné) |
| B182 | Testy nehlídaly B178 a B179 | informativní | OPRAVENO (doplněno s opravami) | viz B178, B179 | ano |
| B183 | Zaokrouhlení plochy v obsahu výjimky krylo nárůst až 1 m² | nízká | OPRAVENO v20.10.5; starý tvar schválení TRVÁ (vědomě, K4-N17) | `src/vyjimky.js:63`, `:284-290`; `netlify/test_vyjimky.mjs:364` | ano |
| B184 | Ruční množství a cena řádku pásu nejsou v obsahu výjimky | informativní | TRVÁ — vědomá mez | `BEZPECNOST_MEZE.md:725`; pokus `AUDIT27_pokus_vyjimky.mjs` P3 | ano (stejné) |
| B185 | Opis čísla SoD a data podpisu při prvním tisku dělá jen prohlížeč | informativní | TRVÁ — vědomá mez | `BEZPECNOST_MEZE.md:728` | ano (stejné) |
| B186 | Číselná pole zadání jako text | informativní | OPRAVENO v18.10.13 | `src/zakazka.js:865`, `:954`; `netlify/test_koncova_cena.mjs:279`; pokus `AUDIT27` P4 (import už převádí) | ano |
| B187 | `overit_xss.mjs` neprocházel kartu výjimky schvalovatele | informativní | OPRAVENO v18.10.13 | `overit_xss.mjs:259` (nepouštěno) | ano |
| B188 | Matice zobrazení šla zapsat obnovou ze zálohy bez hesla | střední | OPRAVENO v18.10.15 | `netlify/test_obnova.mjs:1171`, `netlify/test_zobrazeni_heslo.mjs:14`; pokus `AUDIT28_pokus_obnova_matice.mjs` 4/0 (P3 401) | ano |
| B189 | Výchozí režim DPH ve SoD podle předpony DIČ | střední | OPRAVENO v19.10.1 (upraveno V7-N2 v20.10.x: bez DIČ přenesená povinnost) | `src/ui/sod_ui.js:265`; `src/test_sod_en.js:112`; pokus `AUDIT28_pokus_sod.mjs` P1 hlásí FAIL jen kvůli V7-N2 | ano |
| B190 | Skladné s tečkou tisíců se četlo jako desetinné | nízká | OPRAVENO v18.10.12 | `src/sod.js:161`; `src/test_sod_en.js:230` | ano |
| B191 | Nevyvážený blok `CIN_*` zůstal ve smlouvě | informativní | OPRAVENO v19.10.4 | `src/docxgen.js:498-507`; `src/test_sod_proj_rozsah.js`, `src/test_o5_docx.js` | ano |
| B192 | Heslo správce čitelně v paměti stránky 10 min | informativní | zmírněno v19.10.4, TRVÁ — vědomá mez (jen spolu s XSS) | `src/ui/online_ui.js:1234-1238`; `src/test_zobrazeni_heslo_okno.js` 15/0 | ano (stejné) |
| B193 | Harnessy PROJ čekají v podkladech jinou verzi šablony | informativní | TRVÁ — podklad, ne kód | `BEZPECNOST_MEZE.md:811` | — |
| B194 | Souběžné mutační běhy si přepisovaly zdroje | — (vývoj) | OPRAVENO v19.10.10 | `nastroje/mutace_zamek.mjs`; `netlify/test_mutace_zamek.mjs` (nepouštěno) | ano |
| B195 | Obchodník smí bez schválení snížit nákladovou sazbu kterékoli položky (ruční cena s potvrzením) | vědomá mez | TRVÁ — **zhoršeno, viz R2-1** | `src/rucni_ceny.js:131`, `:163`, `:301` | mez ano, nula ne |
| B196 | Ceníková sazba (`zaklad`) je vidět v datech zakázky | vědomá mez | TRVÁ | `BEZPECNOST_MEZE.md:1485` | ano |
| B197 | `zaklad` nepotvrzené ruční ceny je od klienta | vědomá mez | TRVÁ | `BEZPECNOST_MEZE.md:1494`; `netlify/test_561_rucni_cena.mjs` | ano |
| B198 | Starší vlastní cena příplatku „dle nabídky“ = potvrzeno bez dokladu | vědomá mez | TRVÁ | `BEZPECNOST_MEZE.md:1500` | ano |
| B199 | Webhook Pipedrive bez přihlášení, jen klíč v hlavičce | vědomá mez | TRVÁ | `netlify/test_553_webhook.mjs` 76/0; statická kontrola KLICEM_CHRANENE v `test_prava.mjs` | ano |
| B200 | Strop webhooku 60/h jen v instanci funkce | vědomá mez | TRVÁ | `netlify/functions/pd_webhook.mjs:104-105` | ano |
| B201 | Webhook zapisuje do databáze zakázek bez člověka | vědomá mez | TRVÁ; od K40c navíc volá ARES a zapisuje odkaz do dealu (B208), od VZ respektuje neshodu IČO | `netlify/functions/pd_webhook.mjs:129-135`, `:316`; `netlify/test_k40c_webhook.mjs` 105/0 | ano (bez ARES) |
| B202 | `pd_webhook/deal:<id>` se nezálohuje ani neuklízí | vědomá mez | TRVÁ | `BEZPECNOST_MEZE.md:1441` | ano |
| B203 | Heslo z přihlášení správce potvrdí kopii zálohy na Disk bez dotazu | vědomá mez | TRVÁ | `BEZPECNOST_MEZE.md:1591`; `onlineKopieDiskAuto` v `src/ui/online_ui.js` | chování na main je, zápis meze ne |
| B204 | Po Prodáno a před tiskem SoD mění číslo SoD a datum podpisu kdokoli | vědomá mez | TRVÁ | `BEZPECNOST_MEZE.md:1601`; `zamekProdanoSodVolne` (`src/zamek.js`) | chování na main je |
| B205 | Srovnávací kopie na Disku se vybírala podle posledního jména (soubor s budoucím datem vyřadil pojistku úbytku) | střední (K40-X4) | OPRAVENO v12.11.1; zbytková mez (podvržený soubor s minulým dnem) TRVÁ | `src/retence_zaloh.js` (`retenceZalohDiskPredchozi`); `netlify/test_577_apps_script.mjs:25`, `:361` | **NE — main opravu nemá** |
| B206 | Tolerance 7 dní a výjimka s důvodem z dolní meze data prodeje | vědomá mez | TRVÁ (mez opravy K40-S1) | `netlify/test_k40b_prodej_mez.mjs` 31/0 | **oprava K40-S1 na main není — main horší** |
| B207 | Antedatovaný čas tisku určuje období odeslání v controllingu | vědomá mez | TRVÁ | `BEZPECNOST_MEZE.md:1673` | ano (stejné) |
| B208 | Webhook volá ARES ze serveru | vědomá mez | TRVÁ | `netlify/lib/ares_server.mjs`; `netlify/test_k40c_webhook.mjs` | funkce na main není |
| B209 | Zápis organizace do Pipedrive z kalkulátoru | vědomá mez | TRVÁ | `netlify/functions/pd_organizace.mjs:96-123` (id organizace přes `Number`, shoda IČO); `netlify/test_prava.mjs:596` | funkce na main není |
| B210 | Kopie skriptem vydává noční zálohu chráněnou jen tokenem | vědomá mez | TRVÁ | `netlify/functions/zaloha_disk.mjs`; `netlify/test_577_kopie_skript.mjs` 53/0 | ano |
| B211 | Token jen v hlavičce, konstantní čas | vědomá mez | TRVÁ | `netlify/functions/zaloha_disk.mjs:41-43` | ano |
| B212 | Omezení četnosti jen v instanci funkce | vědomá mez | TRVÁ | `netlify/lib/kopie_skript.mjs:70` | ano |
| B213 | Token potvrdí kopii a odemkne retenci | vědomá mez | TRVÁ | `netlify/functions/zaloha_disk.mjs:107` | ano |
| B214 | Token smí ohlásit úbytek dat | vědomá mez | TRVÁ | `netlify/lib/kopie_skript.mjs:35` | ano |
| B215 | Nástroj testovací sady zapisuje jako administrátor mimo prohlížeč | vědomá mez | TRVÁ | `nastroje/test_sada_jadro.mjs:10`; `netlify/test_c5_test_sada.mjs` 131/0 | nástroj na main není |
| B216 | Nástroj jen na testovací web a jen TEST zakázky | vědomá mez | TRVÁ (neověřováno pokusem) | `BEZPECNOST_MEZE.md:1776` | nástroj na main není |
| B217 | Uložení zakázky píše poznámku do Pipedrive | vědomá mez | TRVÁ | `netlify/lib/pd_poznamka.mjs:225-251` (id poznámky ověřené jako celé číslo); `netlify/test_vsd_pd_poznamka.mjs` 49/0 | funkce na main není |
| B218, B219 | — | — | NENALEZENO | žádný zdroj | — |
| B220 | Data víc zákazníků hlídá server jen tvarem a vypínačem | vědomá mez | TRVÁ; E3/E4 doplnily práva (B227, B228) | `netlify/test_vz_server.mjs` 128/0 | funkce na main není |
| B221 | Obrazovka víc zákazníků hlídá práva jen v prohlížeči | vědomá mez | TRVÁ; server od v16.11.6 a v19.11.4 drží písmeno, id, `zalozen` a duplicitní IČO | `src/vice_zakazniku.js:1073`, `netlify/lib/zakazka_kontrola.mjs:335` | funkce na main není |
| B222 | — | — | NENALEZENO | — | — |
| B223 | Únik mezi zákazníky hlídá vstup tisku v prohlížeči | vědomá mez | TRVÁ — nezhoršeno chováním, hlídání neúplné (R2-3) | `src/ui/vz_tisk_ui.js:42-63`; `src/ui/objednavka_proj_ui.js:30-48`; `src/ui/nahled_word_ui.js:188` | funkce na main není |
| B224 | Zábrana cizího zákazníka v textu je heuristika | vědomá mez | TRVÁ | `src/test_vz_tisk_vstupy.js:190` | funkce na main není |
| B225 | Uložení píše poznámku „Další zákazníci na zakázce“ do Pipedrive | vědomá mez | TRVÁ | `netlify/test_vz_poznamka.mjs` 61/0 | funkce na main není |
| B226 | Aplikace zakládá organizaci v Pipedrive (vítězný zákazník) | vědomá mez | TRVÁ | `netlify/lib/pd_org_vitez.mjs:260-310`; `netlify/test_vz_organizace.mjs` 48/0 | funkce na main není |
| B227 | Razítko „komu“, platná nabídka a odstranění zákazníka hlídá server | vědomá mez | TRVÁ | `netlify/test_vz_server.mjs` | funkce na main není |
| B228 | Zmrazení údajů po odeslání nabídky u víc zákazníků | vědomá mez | TRVÁ; #663 (v19.11.4) zpřísnil zástupce a DIČ po SoD — text meze o tom mlčí | `BEZPECNOST_MEZE.md:2068` | funkce na main není |
| B229 | — (rezervováno etapám VZ, nepoužito) | — | NENALEZENO | `roadmapa/roadmap.json:8103` | — |
| B230 | Server ukládá čas poslední aktivity uživatele | vědomá mez | TRVÁ — kód odpovídá zápisu | `netlify/lib/sdilene.mjs:625`, `:653-705`; výpis jen správci `netlify/functions/uzivatele.mjs:520-522`; smazání účtu maže záznam `:502-504`; `netlify/test_on_aktivita.mjs` 38/0 | funkce na main není |

## Tabulka SEC-M, SEC-Z, SEC-I

| ID | původní nález | závažnost | stav | důkaz (origin/test) | main |
|---|---|---|---|---|---|
| SEC-M1 | Údaje a tajemství se dostaly do pushe | střední (proces) | OPRAVENO v1.11.1 | `nastroje/hooky/pre-push`, `.github/workflows/kontrola_udaju.yml` (test hooku nepouštěn) | ano |
| SEC-M2 | Hluboké vnoření těla → 500 | nízká | OPRAVENO v1.11.1 | `netlify/lib/sdilene.mjs:462-466`, 13 funkcí; `netlify/test_secm.mjs` M2; pokus `p3_hluboke_typy.mjs` 3/0. Nové funkce bez kontroly (`pd_organizace`, `pd_vazba`) berou z těla jen řetězce nejvyšší úrovně (`pd_organizace.mjs:59-63`, `pd_vazba.mjs:44-47`) — čtením bez dopadu, vlastní pokus jsem nepsal | ano |
| SEC-M3, M4 | Kvadratický ořez čísla nabídky; číslo PROJ nad strop | nízká | OPRAVENO v1.11.1 | `netlify/test_secm.mjs` M3, M4 | ano |
| SEC-M5 | GET exportu controllingu s cizím Origin | nízká | OPRAVENO v1.11.1 | pokus `pokus_puvod.mjs`: 403, protokol 0 → 0 | ano |
| SEC-M6 | Objekt ve `faze` / `obnovaId` / `rezim` obnovy → 500 | nízká | OPRAVENO v1.11.1 | `netlify/test_secm.mjs` M6 | ano |
| SEC-M7 | `__proto__` v těle programu a popisů | nízká | OPRAVENO v1.11.1; mez (obnova programu ze souboru bez kontroly zveřejnění) TRVÁ | `netlify/functions/program.mjs:49`, `popisy.mjs:114`; pokus `p4` O16 | ano |
| SEC-M8 | Jednorázová obnova nedržela zámek | nízká | OPRAVENO v1.11.1 | pokus `p4` O13, O14 OK (O13b viz R2-4) | ano |
| SEC-M9 | Klíč zakázky ze zálohy s „/“ | nízká | OPRAVENO v1.11.1 | pokus `p4` O15 | ano |
| SEC-M10 | Skrytý ref `refs/claude-teleport/…` nese telefon | nízká | neověřeno (vyžaduje síť); podle zápisu čeká na J. V. | `BEZPECNOST_MEZE.md` oddíl O-SECM | — |
| SEC-M11 | Mezery detekce tajemství | nízká | OPRAVENO v1.11.1 (`src/test_kontrola_udaju.js` nepouštěn) | `nastroje/kontrola_udaju.py` | ano |
| SEC-M12, M13 | Strážci bez testu (archivace hlavního účtu, zpoždění hesla) | nízká | OPRAVENO v1.11.1 | pokus `r2_strazci_bez_testu.mjs` drží; `netlify/test_prava.mjs` | ano |
| SEC-M14 | `PIPEDRIVE_DOMENA` bez ověření tvaru | informativní | TRVÁ — podmínka odkladu nastala (R2-2) | `netlify/lib/pipedrive.mjs:67-74`; pokus `p5` S1 | ano |
| SEC-M15 | Id z odpovědi Pipedrive do cesty, `telo.error` do prohlížeče | informativní | TRVÁ na čtecí cestě (R2-2); nové zápisové cesty id převádějí na číslo | `netlify/functions/pd_deal.mjs:73-78`, `netlify/lib/pipedrive.mjs:107`; pokus `p5` D2, TK1 | ano |
| SEC-M16 | Úvodní fotka přijímala libovolnou adresu | nízká | OPRAVENO v3.11.4 | `netlify/test_sec_m16.mjs` 44/0 | ano |
| SEC-M17 | 33 kvadratických výrazů nad vstupy správce | informativní | TRVÁ — vědomě (neprocházeno) | — | ano |
| SEC-M18 | Kontrola autora tokenu obnovy bez testu | informativní | TRVÁ (neověřeno, zda test přibyl) | — | ano |
| SEC-M19, M20 | Zdvojená pojistka; falešný verdikt pokusu S1 | informativní | beze změny; náhradní pokus `r1_zamek_soubeh_main.mjs` drží (409) | — | ano |
| SEC-M21 | `NODE_VERSION` pevně 22.23.2 | informativní | TRVÁ | `netlify.toml:19`, `.github/workflows/testy.yml:72` | ano |
| SEC-M22 | `@netlify/blobs` `^8.1.0` | informativní | TRVÁ | `package.json:6`, zámek 8.2.0 | ano |
| SEC-Z1 | Opuštěné veřejné nasazení schaftscalc se starou verzí bez hlaviček | vysoká (k ověření) | neověřeno — mimo repo, síť zakázána | — | — |
| SEC-Z2 | Odpovědi `/api/*` bez CSP a Referrer-Policy | nízká | OPRAVENO | `netlify/lib/sdilene.mjs:409-415`; `netlify/test_sec_z2.mjs` 40/0 | ano |
| SEC-Z3 – Z6 | HSTS preload, pořadí kontrol v analytice, favicon, 401 v konzoli | informativní | beze změny (neprocházeno, bez dopadu) | — | ano |
| SEC-I1 | API bez `no-store` a `nosniff` | informativní | OPRAVENO | `netlify/lib/sdilene.mjs:409-415` | ano |
| SEC-I2 | Plánovaná záloha přes URL | informativní | podle auditu 26. 10. ověřeno na živém (403); dnes neověřeno | — | — |
| SEC-I3 | `__proto__` v zadání se uložil | informativní | OPRAVENO | `netlify/lib/zakazka_kontrola.mjs:95`; pokus `p1_fuzz_vse.mjs`: 129 735 volání, 0 nálezů, prototypy čisté | ano |
| SEC-I4 | Klíč z adresy bez kontroly tvaru | informativní | OPRAVENO | `netlify/lib/sdilene.mjs:416` (`klicZAdresyPlatny`) | ano |
| SEC-I5 | `vypocet` vracel `e.message` | informativní | OPRAVENO | `netlify/functions/vypocet.mjs:35-40` | ano |
| SEC-I6 | Kostra `server/server.js` slabší než Netlify | informativní | OPRAVENO; `/api/vypocet` kostry bez přihlášení TRVÁ (vědomě) | `server/server.js:51-66`, `:87-105` | ano |
| SEC-I7 | Zásah do jiného správce bez hesla | informativní | OPRAVENO v26.10.2 | `netlify/functions/uzivatele.mjs:232`, `:310`, `:328`; `netlify/test_sec_i7.mjs` 32/0 | ano |
| SEC-I8 | Cookie bez prefixu `__Host-` | informativní | TRVÁ — vědomá mez do vlastní domény | `BEZPECNOST_MEZE.md:1248` | ano |
| SEC-I9 | CSP s `'unsafe-inline'` | informativní | TRVÁ — vědomá mez | `netlify.toml:41` | ano |
| SEC-I10 | Mezery testů XSS | informativní | neověřeno (patří čočce XSS) | — | — |
| SEC-I11, I12 | Částky v textech repa; adresy v metadatech commitů | informativní | neověřeno (mimo kód) | — | — |
| SEC-I13 | Chybí Dependabot | informativní | TRVÁ | `.github/` obsahuje jen `workflows/` | ano |
| SEC-I14 | Integrační větve se nemažou | informativní | TRVÁ — pravidlo v `CLAUDE.md` | — | — |
| SEC-I15 – I17 | Měna kalendáře, DPH a hodnota dealu při zápisu do Pipedrive | informativní | TRVÁ jako podmínky #115; zápis hodnoty dealu dál neběží (`pdZapisDealu` volá jen náhled, `netlify/lib/pd_prevod.mjs:537`) | — | ano |
| SEC-I18 | Hláška plánu plateb natvrdo „Kč“ | informativní | neověřeno | `src/plan_plateb.js` | — |

## Detail nálezů

### R2-1 — mez B195 rozšířená o nulovou cenu, dokumentace tvrdí opak (nízká)

- **Předpoklady:** přihlášený obchodník bez práva ceníku; zveřejněný ceník. Nic dalšího.
- **Kroky:** u položek ceníku OCK s cenou v Kč (zkušební ceník: 69 položek) zapíše nákupní cenu 0, do pole dodavatel
  jeden znak, potvrdí sám, vytiskne nabídku. Server potvrzení orazítkuje a zámek přijme (200). Jednu položku je nutné
  nechat nenulovou — úplně nulovou cenu nabídky zámek odmítá.
- **Dopad (vlastní běh `poc_R2_b195_nulova_cena.mjs`, minMarze 30 %):** 68 z 68 potvrzení orazítkováno, zámek 200,
  základ ceny OCK 14 % výchozí hodnoty, příplatky 0. Bez zdroje zámek 403 (rozhodnutí N3 drží). Minimální marže se
  u ruční ceny nehlídá (to mez B195 říká už dnes).
- **Co je nové a co ne:** samotné snížení bez schválení je rozhodnutí J. V. (B-Q3) a s cenou těsně nad nulou šlo
  i před #667. Nové je, že projde přesná nula a že `BEZPECNOST_MEZE.md` (`:1458-1464` „stejnou kladnou hodnotou“,
  „nekladnou cenu“; `:1479` „nula ani záporná neprojde“) popisuje stav před v19.11.1. Rozhodnutí N3 je jen v `CHANGELOG.md`.
- **Návrh:** přepsat oddíl RC #561 a B195 podle v19.11.1 (nula se zdrojem platí, bez zdroje jde ke schválení). K rozhodnutí
  J. V.: strop počtu ručních cen na variantu bez schválení, nebo kontrola minimální marže i u ruční ceny.
- **PoC:** hlavní je `podklady/audit_2026-11-20/poc_AZ_8_rucni_cena_nula.mjs` (čočka AZ). Můj
  `poc_R2_b195_nulova_cena.mjs` vznikl dřív, než přišel pokyn nepsat ho znovu; je v téže složce a lze ho smazat.

### R2-2 — SEC-M14 / SEC-M15: podmínka odkladu nastala (informativní)

- Zápis z 1. 11.: „přidat `^[a-z0-9-]{1,63}$` až s odesíláním do Pipedrive“, „ošetřit spolu s #510 (zápis)“.
- Dnes aplikace do Pipedrive zapisuje: `pd_organizace.mjs:123` (PATCH organizace), `pd_vazba.mjs:119` a
  `pd_webhook.mjs:316` (PATCH dealu), `pd_poznamka.mjs:247`, `:251` (PUT/POST poznámky), `pd_org_vitez.mjs:310` (PATCH dealu).
- `pdZaklad` (`pipedrive.mjs:67-74`) doménu dál neověřuje — pokus `p5` S1: hodnoty typu `utok.example#` pošlou
  `x-api-token` mimo `*.pipedrive.com`. Nastavit to umí jen správce Netlify (chyba nastavení, ne útok zvenčí).
- `pd_deal.mjs:73-78` dává `org_id` / `person_id` z odpovědi do cesty bez převodu (D2); `popisStavu` vrací `telo.error`
  do prohlížeče (TK1). Nové zápisové cesty id převádějí (`Number(...)`), tam se mez nerozšířila.
- **Návrh:** tři řádky podle původního doporučení (regex domény, `Number.isSafeInteger` u id v `pd_deal.mjs`, ořez
  `telo.error` na 200 znaků bez hodnoty tokenu) a pokus `p5` převést do sady.

### R2-3 — hlídání meze B223 nezná nové generátory (informativní)

- Chování je správné: Objednávka PROJ jde přes `vzTiskVstup` a `dokumentVygeneruj` (`objednavka_proj_ui.js:30-48`,
  hlídá `vzTiskHlidej`), je vedená jako dokument PROJ jen pro řídícího (`src/vice_zakazniku.js:839`,
  `src/test_objednavka_proj.js:202-214`); náhled podkladů jde přes `vzTiskVstup` (`nahled_word_ui.js:188`).
- Chybí hlídání: `nastroje/kontrola_vz_unik.sh:11` kontroluje jen `nabidka*.js`, `sod.js`, `kryci*.js`, `docxgen.js`,
  `dokumenty.js`, `nazvy_souboru.js` — ne `src/objednavka_proj.js` ani `src/nahled_word.js`. Seznam `VSTUPY`
  v `src/test_vz_tisk_vstupy.js:39-53` nemá `objednavkaProjVstup`. `src/test_vz_unik.js` (kanárky) Objednávku nezmiňuje.
- **Dopad:** kdyby někdo později v těchto souborech sáhl na `ZAK` nebo `dalsiZakaznici`, kolo to nepozná.
- **Návrh:** doplnit oba soubory do `SOUBORY`, `objednavkaProjVstup` do `VSTUPY`, kanárka do testu úniku.

### R2-4 — staré pokusy dávají falešné FAIL (informativní)

- `AUDIT25_pokus_B154_kolize.mjs` — padá na `RangeError` (známé od auditu 18. 10.), B154 neověřuje.
- `AUDIT28_pokus_sod.mjs` P1 — čeká „bez DIČ česká DPH“, od V7-N2 platí přenesená povinnost.
- `SECM_pokusy/server_a/pokus_prihlaseni.mjs` — snížení role druhého správce posílá bez `hesloSpravce` (SEC-I7), takže
  se role nesníží a pokus hlásí FAIL; okamžitá platnost role je v kódu (`sdilene.mjs:624`, role z účtu).
- `SECM_pokusy/server_b/p5_pipedrive.mjs` PS1/PS2 — čeká „`pdDealId` jen administrátor“; od K40c ho smí u vlastní
  zakázky nastavit i autor (vědomě, B209).
- `SECM_pokusy/server_b/p4_zalohy_obnova.mjs` R1 (400 místo 401), R2 (403 místo 409), O13b — kódy se po K9 / #517
  změnily. **Neověřoval jsem do hloubky**, zda jde jen o jiné pořadí kontrol; O13b (otisk „před obnovou“ nese stav před
  obnovou) stojí za jedno přečtení čočkou záloh.

## Co je v pořádku

- Žádná regrese B151–B194: opravy jsou v kódu, jejich sady zelené, útočné pokusy kol 25–28 končí 403 / 401 / 409.
- UE #664 (úprava účtu správcem) nezhoršila B156: zapisují se jen pole profilu na čerstvě přečtený záznam, validace
  shodná se založením (`uzivatele.mjs:181-201`); `test_ue_uzivatele` 34/0.
- ON #679 odpovídá mezi B230: žádná IP ani cesta, oddělené úložiště mimo zálohu, ven jen ve výpisu pro Administrátora,
  smazání účtu záznam maže, zápis požadavek neshodí.
- B174: všechna nová počítadla stropů leží v `pd_cache` pod `strop:` a noční úklid je bere.
- Návrhy do číselníku (DO D6): server z varianty čte jen očištěný text a příznak `navrh` (`popisy.mjs:76-92`); cesta
  sběru textů existovala už dřív, nová plocha je jen příznak. Vykreslení u správce jsem neověřoval (čočka XSS).
- Lhůty PROJ (D8 #677): žádný B-nález ani mez se jich netýká; neposuzováno hlouběji.
- Fuzz `p1_fuzz_vse.mjs`: 129 735 volání, 0 výjimek, prototypy čisté. Hlášené „klíče mimo očekávaný tvar“ jsou jen nové
  úložiště `aktivita` a klíče záloh, které pokus z 28. 10. nezná.

## Co testy / mutace NEhlídají

- Meze B157, B161, B162a, B164, B169, B170, B172, B173, B177, B181, B184, B185, B195–B198, B203, B204, B206, B207,
  B220, B223, B227–B230 nemají v `netlify/mutace.mjs` ani `mutace_jadro.mjs` žádnou značku — jsou to přiznané meze,
  ne strážci; jejich zhoršení kolo nepozná (R2-1 je toho příklad: mez se změnila, text ne).
- `src/test_meze_cisla.js` hlídá jen duplicitu čísel mezí, ne shodu textu meze s kódem.
- SEC-M14, SEC-M15 a TK1 nemají test; pokus `p5_pipedrive.mjs` není v sadě.
- Hlídání úniku mezi zákazníky nepokrývá Objednávku PROJ a náhled podkladů (R2-3).
- SEC-M18 (autor tokenu obnovy po dávce) — test jsem nenašel, nehledal jsem důkladně.
- `test_prava.mjs`: statická kontrola KLICEM_CHRANENE a matice práv drží (1006/0); u nových funkcí `pd_organizace`
  a `pd_vazba` hlídá práva (`:596`), hloubku těla ne (SEC-M2 — čtením bez dopadu).
- Nepouštěl jsem: mutace, prohlížečové harnessy `overit_*.mjs` (B166, B187), `nastroje/test_pre_push.sh`,
  `test_mutace_zamek.mjs` (B194), ~300 zbylých sad jádra.
