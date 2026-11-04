# Prompt: koordinační sezení „Zefektivnění programu“

> Spuštění: konec týdne 45 (6.–8. 11. 2026), samostatné sezení v projektu **Kalkulator NextGen**, s propojeným počítačem (složka Kalkulator NextGen na Disku) a s Claude v Chrome.
> Připraveno 4. 11. 2026 podle auditu kola 40 a rozhodnutí J. V. ze 4. 11.

Jsi **koordinační sezení** programu „Zefektivnění programu“ pro Engscalc (Kalkulator Next Gen Gen 2, repo `vendljar/kalkulator-next-gen-engscalc`). Cíl: aplikace se má rychleji stahovat, rychleji reagovat, méně zatěžovat server a mít rychlejší testy. Zefektivnění přitom nesmí změnit jediný výpočet ani dokument; záměrné změny chování přinášejí jen opravy etapy O.

Úkoly:
1. **Nejdřív opravy nalezených chyb z kola 40** (etapa O): vydat prompt oprav, ověřit výsledek a navrhnout sloučení.
2. **Potom zefektivnění:** změřit výchozí stav nad opraveným kódem, sestavit plán po etapách, napsat prompty pro paralelní větve Claude Code, po jejich dokončení výsledky ověřit a navrhnout sloučení.

Kód sám neměníš. Komunikuješ česky.

## Kontext (stav ke 4. 11. 2026)

**Verze:**
- Podle kola 42 běží test i main na **v4.11.4** (b751c91).
- Opravy kola 40 ještě nebyly předané Claude Code. K40-N1 trvá.
- Prompt oprav je hotový ve verzi **v2 s rozhodnutími J. V. ze 4. 11.**: `PROMPT_K40_OPRAVY.md`, větev `claude/k40-opravy`. Komentáře v sestavení, mrtvý kód a zápisník z něj přešly do tohoto programu.

**Podklady v projektu:**
- `claude/2026-11-04_kalkulator_BEZPECNOSTNI_AUDIT_v4.11.3.md`, hlavně oddíl 4 „Balast a výkon“,
- `claude/STAV_KOLO40_2026-11-04.md`, `claude/STAV_KOLO41_2026-11-04.md`, `claude/STAV_KOLO42_2026-11-04.md`,
- `claude/PROMPT_K40_OPRAVY.md`.

Stejné soubory jsou i ve složce **Testovani** na Disku. Postup prostředí popisuje skill `testovaci-procedura-kng`.

**Výchozí čísla z kola 40** jsou jen orientační. Čísla M0 změříš znovu nad výchozím commitem.

| Oblast | v4.11.3 |
|---|---|
| Sestavení `dist/kalkulacka.html` | 3 617 kB; gzip-9 1 175 kB; brotli-11 847 kB |
| Komentáře a prázdné řádky | 1 333 kB (37 %). Bez nich 2 284 / 634 / 469 kB; s minifikací JS i CSS (esbuild) 1 815 / 558 / 418 kB |
| Velké literály | PREKLAD 224 kB (brotli 58 kB); CSS tiskových šablon v řetězcích JS ≤ 256 kB; CSS šablony 72,6 kB |
| Překreslení `render()` | medián 76–140 ms podle scénáře (měřeno na v3.11.4); `set('sirka')` 117–125 ms, špičky až 571 ms |
| Čím se překreslení prodlužuje | kreslí se všechny záložky i skryté: 29× `innerHTML`, 0,8–1,1 MB HTML, 13–21 tis. prvků; `vypocet` 44× a `vypocetProj` 67× se stejnými vstupy (5–9 ms); ZAK se serializuje ~4×; ~8,5 tis. dvojic `JSON.stringify`/`parse` |
| Start | 0,36–0,54 s do prvního vykreslení (rychlý stroj, soubor z disku) |
| Server | studený start funkce s `jadro()` načte 35 modulů = 1 666 kB zdrojů; uložení zakázky = 5–7 čtení + 2 zápisy Blobs a rejstřík se přepíše celý (~224 B na záznam; rejstřík testu měl v kole 36 přes 1 500 záznamů) |
| Testy | testovací kolo bez mutací 32 min (sady 27 min 51 s); mutace serveru 1 249, plný běh ~5 h; CI v matrixu (server 16 částí, jádro 3) |
| Balast | 63 kandidátů mrtvého kódu ≈ 461 ř. ≈ 20 kB, z toho 27 jistě mrtvých funkcí (166 ř.); duplicity pod 10 kB (krycí listy OCK × PROJ, Word OCK × PROJ, `fmt`/`kc`/`pct` 4×, `esc` v 6 variantách) |

## Rozhodnutí J. V. ze 4. 11. 2026 (závazná)

1. **Rozsah:** všechny čtyři oblasti.
   - Sestavení a přenos.
   - Rychlost v aplikaci.
   - Server a databáze.
   - Úklid kódu a testů.
2. **Po etapách:**
   - Etapa 1 jen beze změny chování: ceny, dokumenty i data musí zůstat bajtově stejné.
   - Architektonické změny až v etapě 2, každou zvlášť po souhlasu J. V.
3. **Výchozí verze a pořadí:** **nejdřív opravy** (etapa O), zefektivnění až nad testem **po sloučení K40**. Měření M0 i zlatá sada vzniknou nad opraveným kódem.
4. **Výstup sezení:**
   - plán, prompty pro paralelní větve a ověření výsledků (měření před a po, celé kolo),
   - návrh sloučení.
5. **Cíle (potvrdíš je, nebo upravíš po změření M0):**
   - přenos ≤ **450 kB** — brotli, případně to, co skutečně přenese Netlify;
   - překreslení ≤ **50 ms** medián;
   - testovací kolo ≤ **25 min**.
6. **Zmenšení sestavení:**
   - Nejdřív jen odstranit komentáře. Kód v prohlížeči zůstane čitelný.
   - Plná minifikace až po zeleném kole a po vyřešení čitelnosti chyb (source mapa).
7. **Živé měření:** test i main, **jen čtení**, přes Chrome J. V.
8. **Zápisník poznámek:**
   - Odstranit nepoužívaný zápis: `poznamkyPridej`, `poznamkyUprav`, `poznamkySmaz`, `poznamkyObnov`, `poznamkyShrnuti`, `prilohyPridej`, `prilohySmaz`.
   - **Čtení starých záznamů a stažení starých příloh zůstává.**
   - Je to poslední krok úklidu, s nízkou prioritou.
9. **Opravy nalezených chyb** jsou součástí tohoto programu (etapa O). U nálezů, které čekaly na J. V.:
   - **K40-S1:** dolní mez data prodeje z času, kdy server nový zámek poprvé přijal (`zamek.prijato`), s tolerancí 7 dní pro tisk bez sítě. Datum pod mezí smí zapsat jen vedoucí nebo administrátor s důvodem. Opravuje se spolu s K40-N3.
   - **K40-W1:**
     - Vazbu, kterou webhook vytvoří u existující kalkulace, zapsat do protokolu a ukázat při otevření (potvrdit / zrušit).
     - Zrušit smí **autor zakázky nebo administrátor**. Pravidlo C4 se mění jen pro nepotvrzenou vazbu z webhooku.
     - Zrušenou vazbu webhook znovu sám nevytvoří.
   - **K40-X4:** zpřísnit výběr srovnávací kopie na Disku (nikdy s budoucím datem).
   - **K40-N4:** jen opravit komentář, chování ponechat.
   - **K40-X3 a K40-S3:** chování ponechat a jen zapsat do `BEZPECNOST_MEZE.md` (S3 podle B157).
   - **N46:** ponechat mimo.

## Pravidla

- **Kód neměníš ani nepushuješ.** Úpravy jdou vždy promptem do paralelní větve (`claude/k40-opravy`, `claude/zef-…`) nad commitem, který určíš (`CLAUDE.md`, pravidlo od 29. 9. 2026). Do `test-draft`, `test` ani `main` nic neslučuješ. Sloučení připravíš jako prompt (vzor `PROMPT_SLOUCENI_TEST_DO_MAIN_v21.10.3.md` v Testovani) a rozhodne o něm J. V.
- **Každá odchylka je nález.** Nic tiše nepřizpůsobuj. Nálezy čísluj **ZEF-N…** (vada) a **ZEF-I…** (info). Čísla B nepoužívej, kvůli kolizi K40-P1.
- **Data a výpočet:**
  - Žádné ceny ani osobní údaje ve výstupech, jen zkušební ceník a smyšlené účty.
  - Do databází nezapisuj a TEST zakázky nemaž.
  - Mimo opravy etapy O se výpočet ani ceník nemění. N46 neopravuj.
- **Testy a mutace:**
  - Mutační běh se nikdy nepřerušuje.
  - Mutace pouštěj jen v kopii stromu (klon s `.git`), nikdy souběžně s měřením nebo harnessy prohlížeče. Souběh na 2 CPU dělá falešná selhání (K40-T2).
- **Čísla:** každé číslo ve zprávě musí mít původ (M0/M1, soubor:řádek, log). Subagenty smíš použít na měření a revize, ale klíčová čísla ověř sám.
- **Otázky na J. V.:** ptej se dialogovými otázkami, jen na kontrolních bodech. Nejvýš 4 najednou, doporučenou volbu dej první. Mezi kontrolními body rozhoduj sám a rozhodnutí zapiš.
- **Navazování:** po každém kontrolním bodě zapiš stav do projektu (`claude/STAV_ZEFEKTIVNENI_<datum>.md`), ať jde navázat v novém sezení.

## Krok 0 — příprava

1. Přečti podklady výše, `CLAUDE.md` a `PREDAVKA.md` repa a skill `testovaci-procedura-kng` (prostředí).
2. **Zjisti stav oprav K40.**
   - Existuje větev `origin/claude/k40-opravy` a co v ní je (CHANGELOG, PREDAVKA)? Je už sloučená v `origin/test`? Hledej v CHANGELOG K40-N1 a v kódu `skloMigraceNazvu` (čelní sklo).
   - **Ke 4. 11. prompt předaný nebyl.**
     - Větev neexistuje → začni etapou O od vydání.
     - Existuje, ale není sloučená → převezmi ji v etapě O od ověření.
     - Je sloučená → ověř to a jdi na etapu 0.
3. **Prostředí:**
   - Naklonuj repo přes `git`/`gh` (proxy je nastavená) a spusť `npm ci`. Po `npm ci` znovu vytvoř symlinky `playwright` a `playwright-core` do `node_modules`. `playwright install` nespouštěj.
   - Proměnné: `ADMIN_EMAIL` smyšlený (`spravce@priklad.cz`), `KNG_NEZVYSOVAT_VERZI=1`.
4. **Firemní šablony pro harnessy** přes most do počítače (jen kopie do cloudu, do `KNG_PODKLADY`). Do opravy K40-T1 je dej pod jmény, která harnessy čekají:
   - `Sablony/Sablona_NABIDKA_CN_v15.docx` (bere se nejvyšší verze),
   - `Sablony/Sablona_NABIDKA_PROJ_v8.docx` → `Sablona_NABIDKA_PROJ.docx`,
   - smlouvy **v1** z `Output documents`: `Sablona_SOD_REALIZACE.docx`, `Sablona_SOD_PROJEKCE.docx`, `Sablona_PLNA_MOC.docx` (`overit_sod` si z nich v2 vyrábí sám, s v4 spadne),
   - `KNG_Podklady/negativni_kontrola.json` — obsah nikdy nevypisuj.
   
   Dokud není opravené K40-T3, hlásí `overit_sablony_online` 3 a `overit_sod` 1 falešný FAIL.

## Etapa O — opravy nalezených chyb (před zefektivněním)

**Vydání.**
- Předej J. V. k vložení do Claude Code `PROMPT_K40_OPRAVY.md` v2 (Testovani i projekt). Jen ho zkontroluj proti aktuálnímu `origin/test`: výchozí commit, čísla řádků.
- Prompt ponese:
  - **K40-N1** — čelní sklo,
  - **K40-X1/X2** — ořez textu smyčkou a strop délky,
  - **K40-S2** — diagnostika zámku,
  - **K40-N2/N5** — kontroly můstků,
  - **K40-S1 + N3** — mez data prodeje podle `zamek.prijato`, 7 dní tolerance, výjimka vedoucí/administrátor s důvodem,
  - **K40-W1** — protokol, upozornění, zrušení autorem nebo administrátorem, bez opětovného navázání,
  - **K40-X4** — srovnávací kopie,
  - **K40-N4** — komentář,
  - **hygienu:** S4, X5, X6, T1–T3, P1 (přečíslování B195–B198 a test jedinečnosti) a nové meze X3 a S3.
- Nedělá komentáře v sestavení, mrtvý kód ani zápisník; to patří etapě 1.

**Ověření,** až Claude Code skončí. Výstup `Testovani/OVERENI_K40_<datum>.md`.
1. Fetch, sestavení a celé kolo bez mutací. Mutace z CI větve (`gh`, jen čtení), případně cílené mutace v kopii stromu.
2. Harnessy se šablonami z Disku. Po K40-T1 a T3 už bez přejmenování: očekává se `overit_sablony_online` 29/0 a `overit_sod` 51/0. `overit_online` je stabilní i pod zátěží (K40-T2).
3. **Reprodukce nálezů** proti původnímu kódu (před) a větvi (po):
   - **K40-N1:** vyřazené čelní sklo přežije změnu zasklení i přepnutí typu tam a zpět. Cena se vrátí a zamčená varianta zůstane beze změny.
   - **X1/X2:** 100 000 znaků do 50 ms.
   - **S2:** odmítnuté uložení nejvýš 2× uložení.
   - **S1/N3:**
     - nová zakázka a klon −300 a −200 dní → 400, −5 dní → 200,
     - vedoucí s důvodem → 200 a záznam v historii,
     - podvržené `prijato` se ignoruje,
     - případ těsně před půlnocí.
   - **W1:**
     - protokol a upozornění,
     - potvrzení; zrušení autorem a administrátorem projde, jiným obchodníkem 403,
     - webhook po zrušení → 409.
   - **X4:** soubor s budoucím datem se neuplatní.
   - **N2/N5:** potvrzení v dialogu i na serveru.
   - **P1:** test jedinečnosti nadpisů B.
4. **Nezáměrné změny výsledků:**
   - Porovnej výpočty a dokumenty nad pevnou sadou (fuzz se semínkem a TEST zakázky z kol 41/42, jen kopie): výchozí commit × větev.
   - Rozdíl smí být jen u kalkulací s vyřazeným čelním sklem po změně zasklení nebo typu (K40-N1). Každý jiný rozdíl je nález ZEF-N.
5. Připrav prompt sloučení a nech o něm rozhodnout J. V. (kontrolní bod O, dialogové otázky).

**Po sloučení K40** pokračuj etapou 0. Když se sloučení protáhne, smíš měřit M0 nad ověřenou hlavou `claude/k40-opravy`. Po sloučení pak jen potvrdíš, že sestavení i zlatá sada jsou shodné.

## Etapa 0 — výchozí stav M0 (nic se nemění)

Všechny skripty měření a srovnání si napiš sám (cloud). Po etapě 0 je ulož do `Testovani/cloud/zefektivneni/`, ať se před i po měří stejně. Měř na nezatíženém stroji. U každého měření zapiš prostředí (CPU, Node, Chromium) a počet opakování.

1. **Sestavení:**
   - raw, gzip-9, brotli-11 a brotli-5 souboru `dist/kalkulacka.html`, rozpad podle zdrojových souborů,
   - podíl komentářů v JS i CSS, velikost PREKLAD a CSS v řetězcích,
   - zda je nutné, aby `dist` nesl tři shodné kopie.
2. **Prohlížeč** (Chromium headless, pevný viewport, 5 zahřívacích běhů se zahodí, pak 30 opakování, medián a p90):
   - **Scénáře:**
     - 1 varianta, záložka OCK,
     - 1 varianta, záložka Ceník,
     - 10 variant,
     - 10 variant + 50 vlastních položek + 50 příplatků.
   - **Měř:**
     - `render()`, `set('sirka')`, start do prvního vykreslení,
     - počet prvků DOM, bajty `innerHTML` na render,
     - počty volání `vypocet`/`vypocetProj` a `JSON.stringify`/`parse` na render, s rozpadem podle funkcí záložek,
     - zátěž GC (uzly vyrobené a zahozené).
3. **Node:** `vypocet`, `vypocetProj`, `importZakazka` a `zamekJsonKanon` podle velikosti zakázky (1, 10 a 50 variant).
4. **Server (lokálně):**
   - Čítač operací Blobs na paměťovém úložišti: kolik čtení a zápisů a kolik bajtů má `POST /api/zakazky` (nová, uložení, kolize), `GET` rejstříku a export controllingu, při 100 / 1 000 / 2 000 zakázkách.
   - Čas a objem importu `jadro()` při studeném startu pro každou funkci.
5. **Živě (Chrome J. V., jen čtení, test i main):**
   - **Co měřit:**
     - přenesené bajty a `Content-Encoding` stránky aplikace,
     - `Cache-Control`/`ETag` a zda se po znovunačtení přenáší celý soubor, nebo jen 304,
     - TTFB, DOMContentLoaded, load a čas do prvního vykreslení,
     - velikost a doba odpovědi rejstříku po přihlášení,
     - doba prvního a dalších volání jen čtecích API (studený a teplý start).
   - **Jak:**
     - Adresy vezmi z `NASAZENI_NETLIFY.md`/`PREDAVKA.md` nebo ze záložek, které J. V. používá (kolo 42).
     - Načti tab znovu a čti síťové požadavky a `performance` přes nástroje rozšíření.
     - **Nic neukládej, nezveřejňuj, neobnovuj, neodemykej a nevyplňuj.** Přihlašuj se jen tam, kde už J. V. přihlášený je. Žádné dialogy `alert`/`confirm`.
6. **Testy:**
   - Délky kroků `nastroje/testovaci_kolo.sh --bez-mutaci` a 15 nejpomalejších sad (časy si změř obalem, log je dnes nenese).
   - Délky částí mutací z posledních běhů CI (`gh run list/view`, workflow `testy.yml`, jen čtení).
   - Nejpomalejší mutace podle logu.
7. **Zlatá sada výstupů** (důkaz „beze změny chování“). Pevná sada se zkušebním ceníkem:
   - **Vstupy:**
     - fuzz zadání s pevným semínkem (např. 2 000 zadání ve stylu `src/test_fuzz_invarianty.js`),
     - TEST zakázky z kol 41/42, pokud jsou kopie v `Testovani/cloud`. Bere se jen kopie, nic se nezapisuje.
   - **Výstupy:** výsledky `vypocet`/`vypocetProj` (JSON), Word nabídky OCK a PROJ, SoD a plná moc, krycí listy, technická specifikace, tiskové HTML, CSV a XLSX.
   - **Porovnání:** obsah (XML uvnitř .docx/.xlsx, text tisku) bajt po bajtu, mimo razítka času a čísla verze.
   - Nad výchozím commitem musí být sada sama se sebou shodná při dvou bězích. Když není, je to nález ZEF-I.

**Výstup etapy 0:** `Testovani/ZEFEKTIVNENI_PLAN_<datum>.md`.
- M0 proti kolu 40 a odchylky.
- Potvrzené nebo upravené cíle a které etapy je reálně splní. Samotné odstranění komentářů dá ~469 kB brotli-11, takže cíl 450 kB splní až minifikace nebo úprava PREKLAD. Překreslení ≤ 50 ms bez E2-B (jen viditelná záložka) nejspíš nevyjde.
- Položky plánu s přínosem, rizikem, závislostmi a soubory, kterých se dotknou. Co nepřinese měřitelně aspoň 5 %, vyřaď a napiš proč.

### Kontrolní bod 1 (J. V., dialogové otázky)

Schválení plánu, cílů a pořadí etapy 1. Případně výchozí commit, pokud K40 ještě není sloučené.

**Výchozí commit etapy 1** = `origin/test` se sloučeným K40.

## Etapa 1 — beze změny chování (prompty pro paralelní větve)

**Každý prompt** (`Testovani/PROMPT_ZEF_E1x_….md`) nese:
- větev a výchozí commit,
- seznam souborů, kterých se smí dotknout (kvůli souběhu větví),
- **krok 0 — ověřit, že položka pořád platí**,
- pravidla z `CLAUDE.md`:
  - hooky, `git push --no-verify` zakázané,
  - `dist/` ručně needitovat,
  - verze přes `build.py`, CHANGELOG, roadmapa, PREDAVKA,
- ke každé změně test, který před změnou selže a po ní projde (u refaktoringu: rozpočet velikosti nebo času, nebo srovnání výstupů),
- celé kolo a mutace po částech,
- měření M1 stejnými skripty,
- výpis změn soubor:řádek a čísla před a po.

Rozdělení (E1-A, E1-B a E1-C běží souběžně, E1-D až po sloučení E1-B):

- **E1-A Sestavení** (`claude/zef-e1-sestaveni`; `build.py`, `nastroje/`, testy čtoucí `dist`):
  - **Komentáře pryč:** `build.py` odstraní komentáře JS i CSS **nástrojem**, ne regexem (tokenizér nebo terser/esbuild bez minifikace).
  - **Co se nesmí změnit:** řetězce, šablonové literály, regulární výrazy ani globální jména (`onclick` v šablonách).
  - **Ověřit:** `smoke.mjs`, harnessy, testy čtoucí text `dist`, `kontrola_udaju.py` a lištu render-chyba.
  - **Hlídání do budoucna:** test rozpočtu velikosti (raw, gzip, brotli a podíl komentářů), který selže při nárůstu nad dohodnutou mez.
  - Zda jsou tři shodné kopie v `dist` nutné, jen ověřit a navrhnout.
- **E1-B Úklid kódu** (`claude/zef-e1-uklid`; `src/`, `src/ui/`):
  - **Mrtvý kód — 27 kandidátů z kola 40:**
    - `renderProgramKarta` (+ `progStavPopis`), `renderOnlineCenikKarta`, `onlineVerzeInfo`,
    - `zakHlavickaKopiruj` (+ `zakazkaKopirujHlavicku`, `zakazkaHlavickaKolize`, `zakazkaHlavickyShodne`),
    - `slevaGlobalniMaxPct`, `smiZobrazitVse`, `slevaRefreshStav`, `slevaProjRefreshStav`,
    - `zakaznikDoZakazkyPrazdne`, `zakaznikPodleNazvu`,
    - `nastSetAtyp`, `atypSazbaProc`, `uzAdd`, `uzDel`, `uzSet`,
    - `vlastniAddTrvale`, `priplatekVlastniAddTrvale`, `cenikRadaPopis`, `cenikZahrDphVychozi`,
    - `prepocetOtevreno`, `ulozisteOtevreno`, `poznamkyKdo`, `nabidkaStavHtml`.
    
    Každou ověř grepem včetně řetězců v šablonách, `ZAMEK_CHRANENE`, harnessů a `smoke.mjs`. `vlastniDoCeniku` nech (ponechaná záměrně).
  - **Harness-only funkce:** u funkcí, které volají jen harnessy (`kryciWord`, `kryciProjWord`, `onlineZverejniZobrazeni`, …), harness přepni na skutečnou cestu aplikace, nebo doložit, proč tam jsou.
  - **Duplicity:** sjednoť `kryci_ui` × `kryci_proj_ui`, `nabidka_proj_ui` × `zakazka_ui`, `nabidkaWord` × `nabidkaProjWord` a pomocníky `fmt`/`kc`/`pct`, jen tam, kde zlatá sada zůstane shodná. XML varianty `esc` zůstávají. `JSON.parse(JSON.stringify(` hromadně neměň.
  - **Poslední krok — zápis zápisníku poznámek a příloh** (rozhodnutí 8):
    - Odstranit 7 funkcí zápisu.
    - Ukázkovou zakázku testovacího webu (`src/testdata.js:122`) přepnout na textové pole (`poznamkyTextNastav`).
    - `overit_xss.mjs:199–201` a `overit_lista.mjs:959` mají staré záznamy a přílohy zakládat přímo jako data (fixtury), ať zůstane pokrytá XSS starých dat.
    - `src/test_poznamky.js` přestavět na čtení starých dat (`poznamkyText`, `poznamkyPoleText`, `prilohySeznam`, stažení) a na `poznamkyJedinaZmena`.
    - `poznamkyZajisti`, `POZN_POLE_ZAPISNIKU`, druhy poznámek a pole v datech, zálohách, obnově a protokolu **zůstávají**.
    - Limity `POZN_MAX_*` (8/24 MB, dnes v rozporu se stropem serveru 4 MB) smazat, nikdo jiný je nepoužívá.
    - Grepnout i `manual/` a příručky.
- **E1-C Testy a kolo** (`claude/zef-e1-testy`; `nastroje/`, `spust_testy.sh`, `overit_*.mjs`, `netlify/mutace.mjs`, `mutace_jadro.mjs`; kód aplikace ne):
  - **Časy a stabilita:**
    - Časy jednotlivých sad v souhrnu kola (15 nejpomalejších).
    - Další nestabilní nebo falešná čekání, která najde měření M0 (K40-T2/T3 řeší už etapa O).
    - Sloučit nebo zrušit zdvojené a zastaralé harnessy (prověřit `overit_lista*`, `overit_sod*` a další), jen s doložením, že každá mutace zůstane chycená.
  - **Souběh:** volitelný souběh nezávislých sad v Node (`KNG_SOUBEZNE=N`, výchozí 1; harnessy se serverem s vlastním portem).
  - **Mutace:**
    - U nejpomalejších mutací zúžit sady, které je pouštějí, jen když mutace zůstane chycená. Počet mutací se nesnižuje.
    - Vyvážit části CI (limit 100 min).
  - **Cíl:** kolo ≤ 25 min bez ztráty pokrytí.
- **E1-D Výpočet v renderu** (`claude/zef-e1-render`; `src/ui/common.js` a záložky; po E1-B; volitelné podle M0):
  - Jednou spočítat `vypocet`/`vypocetProj` na jedno překreslení (paměť s invalidací v `set()`/`syncVarianta`).
  - Jednou serializovat ZAK na render (`renderKalkHlavicka`, `historieTik`, `protokolTik`).
  - `vypocetAkt` a hlídání zámku zůstávají jedinou cestou.
  - Očekávání −5 až −13 ms. Když M0 ukáže méně, vyřaď.

### Ověření etapy 1 a kontrolní bod 2

U každé větve, až ji Claude Code dokončí:
- fetch a sestavení,
- M1 stejnými skripty,
- **zlatá sada proti výchozímu commitu (musí být shodná)**,
- celé kolo bez mutací,
- harnessy se šablonami,
- mutace z CI dané větve (`gh`, jen čtení), případně cílené mutace v kopii,
- nálezy ZEF-…

**Výstupy:**
- `Testovani/ZEFEKTIVNENI_OVERENI_E1_<datum>.md` — M0 × M1 proti cílům, výsledky, konflikty mezi větvemi, navržené pořadí sloučení,
- prompt sloučení.

**Kontrolní bod 2 (J. V.):** sloučení etapy 1 a výběr položek etapy 2.

## Etapa 2 — architektura (každá položka až po souhlasu J. V.)

Každá položka se dá vrátit přepínačem a zlatá sada musí zůstat shodná. Aplikace se otevírá i jako **soubor z disku bez sítě**, a to musí dál fungovat.

- **E2-A Plná minifikace JS a CSS** (rozhodnutí 6).
  - Jen po zeleném E1-A.
  - Source mapa se nenasazuje: vzniká jako artefakt k verzi a nástroj `nastroje/` z ní přeloží chybu z lišty render-chyba.
  - Ověřit, že globální jména a `onclick` dál fungují.
- **E2-B Kreslit jen viditelnou záložku.**
  - Render kreslí záhlaví a aktivní záložku, ostatní až při přepnutí.
  - Tisk, export a Word nesmí číst DOM skrytých záložek: dostanou výslovné vykreslení nebo data.
  - Harnessy, které čtou skryté záložky, se přepnou.
  - Přepínač pro návrat ke kreslení všeho. Cíl ≤ 50 ms.
- **E2-C PREKLAD bez zátěže pro češtinu.**
  - `tr()` je synchronní a soubor musí fungovat offline, takže **žádné načítání ze sítě**.
  - Spíš odložené zpracování (např. data jako řetězec, rozparsovat až při první cizojazyčné potřebě) nebo jiné uspořádání.
  - Přínos změřit, rozhodnout podle čísel.
- **E2-D Lehké jádro serveru.**
  - Funkce, které potřebují jeden modul (`controlling.mjs`, `lib/pd_stav.mjs` a další podle M0), načtou jen své moduly ze stejných zdrojů. Zásada „stejný kód“ (B72/N43) platí dál.
  - Test pro každou funkci, že jí žádná závislost nechybí.
  - Studený start měřit lokálně i živě.
- **E2-E Rejstřík bez celého přepisu — nejdřív jen návrh.**
  - Varianty (dělení podle klíče nebo měsíce, přírůstkový záznam s průběžným slučováním).
  - Souběh K7-S1 (Blobs bez podmíněného zápisu, výhradní úseky), záloha a obnova, migrace, živá velikost rejstříku z M0.
  - Implementace jen po schválení návrhu.
- **E2-F Serverové kontroly mimo klientské sestavení** (≤ 82 kB) — jen rozbor proti zásadě „stejný kód“, bez změny.

Ověření etapy 2 probíhá stejně jako u etapy 1 a končí výstupem `Testovani/ZEFEKTIVNENI_OVERENI_E2_<datum>.md`. Po nasazení (rozhodne J. V.) zopakuj živé měření jako M2.

## Výstupy a předání

- **Testovani na Disku:**
  - ověření oprav `OVERENI_K40_<datum>.md`,
  - plán,
  - prompty `PROMPT_ZEF_…`,
  - zprávy ověření,
  - prompt sloučení,
  - skripty v `Testovani/cloud/zefektivneni/`.
- **Projekt:** `claude/STAV_ZEFEKTIVNENI_<datum>.md` po každém kontrolním bodě: co je hotovo, co čeká, na co se čeká, otevřené otázky pro J. V. a další krok.
- **Na konci každého sezení** tabulka úkolů ✅/⬜ a seznam rozhodnutí, která čekají na J. V.

## Zrady prostředí (zjištěno v kole 40)

- **Mutace jádra v kopii bez `.git`** se přeruší („sady padají už BEZ mutace“), protože `test_kontrola_udaju.js` (SEC-N5) volá `git check-ignore`. Kopie musí být klon, nebo stačí `git init` a commit.
- **Souběh mutací a harnessů prohlížeče** na 2 CPU: `overit_online.mjs` #523 selže (274/1), samostatně projde 275/0.
- **`npm ci` smaže symlinky Playwrightu.**
- **Délka příkazu:** jeden příkaz v cloudu má omezenou délku běhu. Dlouhé běhy pouštěj na pozadí (`nohup`) s logem a stav čti průběžně.
- **Subagenti** mohou narazit na limit. Ať své zprávy průběžně ukládají do souboru.

## Nedělat

- Mimo opravy etapy O neměnit výpočet ani ceníky. Šablony na Disku ani data v databázích neměnit nikdy.
- Neopravovat N46.
- Neslučovat, netagovat a nemazat větve. Z cloudu to ani nejde, dělá to J. V.
- V etapě 1 neměnit chování. Neodstraňovat čtení starých poznámek a příloh.
- Necpát do etapy 1 nic z etapy 2, ani „když už jsme u toho“.
