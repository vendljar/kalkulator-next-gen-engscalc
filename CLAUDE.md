# Pokyny pro Claude — Kalkulator Next Gen

Komunikace česky. Know-how projektu je ve skillech `kalkulator-next-gen`,
`roadmapa-kng` a `testovaci-procedura-kng`. Datovaná rozhodnutí J. V. a jejich
důvody jsou v `podklady/ROZHODNUTI_LOG.md`; tady jsou jen platná pravidla.
Evidence (úkoly, nálezy, otázky, rozhodnutí, dávky) je jen `roadmapa/roadmap.json`: nové značky jen čísla #, staré řady v poli `alias`, nehotové `python3 roadmapa/roadmapa.py --zive`.
`PREHLED.md` (verze main × test, co je jen v testu, vady ceny, čeká na J. V.) vyrobí koordinace po každém sloučení: `python3 nastroje/prehled_stavu.py`.
`NOVINKY.md` po sloučení do main: `python3 nastroje/novinky.py <od> <do> --zapsat`; z téhož textu skládá popis releasu `release_odkaz.py` (`--od`).

## Větve

- Úpravy se dělají vždy promptem do paralelní větve `claude/…` nad commitem,
  který určí prompt. Větev zůstává; o sloučení rozhoduje koordinace (do
  integrace a test) a J. V. (do main). Určuje-li prompt větev a zakazuje jiné,
  platí prompt.
- Integrační větev je `claude/integrace-…` (jméno drží `PREDAVKA.md`). Koordinace
  do ní slučuje po revizi a zeleném kole dávky. Nové sezení bez jiného pokynu
  začíná z ní (`CLAUDE.md` + `PREDAVKA.md`).
- Do `test` posílá koordinace integraci po celém zeleném kole.
- Do `main` jen na pokyn J. V., se sloučením testu.
- `main` musí být předkem integrace. Kontrola: `git rev-list --count
  <integrace>..origin/main` je 0 (krok `staticke` jinak upozorní).
- Nejvýš 4 souběžná sezení (limit účtu 5 h).
- U složitých a rizikových úkolů (výpočet ceny, bezpečnost, dokumenty) nejdřív
  poradce navrhne postup a před sloučením zreviduje rozdíl.
- `test-draft` se už nepoužívá (stojí od 25. 10. 2026).

## Rychlá cesta pro vady ceny a dokumentu

Platí pro malou opravu vady, která mění cenu nabídky nebo text vytištěného
dokumentu. Jde rovnou do `test`, ne do `main`, a nečeká na velkou dávku.

1. Větev `claude/rychla-<ID nálezu>` nad aktuální integrací (= test). Obsah:
   jen oprava a její test s pojistkou. Žádná jiná změna.
2. Kolo `bash nastroje/testovaci_kolo.sh --bez-mutaci` a cílené mutace.
3. Koordinace sloučí do integrace a pošle do `test` (výjimka z čekání na dávku).
4. J. V. dostane ID vady a popis, které kalkulace se mají změnit.
5. Rozdíly cen mezi `main` a `test` ověřuje J. V. sám.
6. Do `main` dál jen na jeho pokyn, se sloučením testu.

## Kdo rozhoduje

- J. V.: cena, ceník, sazby; text nabídky, smlouvy a plné moci; sloučení do
  main a nasazení; zápis do produkčních dat; bezpečnostní meze; zveřejnění
  šablon, právní texty; vše, co není níže svěřeno.
- J. V. nebo kolega, kterého J. V. jmenuje (jen test): datové úkoly na `test`
  (šablony, TEST sada, Apps Script); na `main` nic. Hotovo ověří koordinace.
- Koordinace: pořadí dávek, sloučení do integrace a test, číslo verze.
- Svěřená rozhodnutí (sezení dávky i koordinace): jen technické varianty
  **testů, harnessů a nástrojů kola**, které nemění žádné číslo, text
  dokumentu, právo ani data na serveru a jdou vrátit jedním commitem. Zápis
  do `podklady/SVERENA_ROZHODNUTI.md` (datum, ID, co, proč, jak vrátit).
  Když si sezení není jisté, ptá se.
- Otázky pro J. V. jdou průběžně v dialogu, každá s doporučenou variantou;
  balíček jen u souvisejících otázek.

## Předávací soubor `PREDAVKA.md`

Cloudové sezení může spadnout a s ním zmizí vše, co není na GitHubu. Proto:

1. Na začátku sezení přečíst `CLAUDE.md` a `PREDAVKA.md` na integrační větvi.
2. `PREDAVKA.md` nese jen živý stav: větve a verze, běžící dávky, co čeká
   na J. V., další krok. Nejvýš 15 kB (hlídá krok `staticke`).
3. Předávka dávky má nejvýš 3 kB. Po sloučení dávky ji koordinace přesune do
   `podklady/predavky/RRRR-MM.md` (archiv, nejnovější nahoře). Paralelní
   větev si vede vlastní oddíl; při slučování se sloučí ručně.
4. Datovaná rozhodnutí J. V. se píší do `podklady/ROZHODNUTI_LOG.md`
   (řádek = datum, rozhodnutí, čeho se týká). Do CLAUDE.md jde jen pravidlo,
   které z rozhodnutí trvale plyne.
5. Po každé ucelené dávce (a vždy před delší prací) aktualizovat svůj oddíl
   předávky, commitnout a pushnout do větve, ve které se pracuje.
6. Hlídat limit sezení: `context_usage` nástrojem `get_session` (bez
   `session_id`) na konci každé dávky. Nad 60 % upozornit J. V., nad 75 %
   aktualizovat předávku a doporučit nové sezení.
7. Rozdělanou práci nenechávat jen v kontejneru — radši commit „WIP“ do
   své větve než ztráta.

## Tagy, releasy a mazání větví

- Tag a release dostává jen verze nasazená do `main` (HEAD `main`). Mezilehlé
  verze integrace a testu — i ty, které do `main` přišly s nasazenou —
  zůstávají v CHANGELOG bez tagu.
- Tagy jsou jednoduché (lightweight) ve tvaru `vDEN.MĚSÍC.pořadí`.
- Z cloudového sezení nejde pushnout tag ani smazat vzdálenou větev (proxy
  vrací HTTP 403) — neobcházet, udělá to J. V.
- Ke každé verzi pro `main` poslat J. V. odkaz na nový release s předvyplněným
  tagem, cílem a popisem změn (`&body=`, URL-kódovaný souhrn z CHANGELOG: co je
  nové, co opravené, čísla roadmapy a nálezů, výsledek kola; bez cen
  a osobních údajů). Odkaz vyrobí `python3 nastroje/release_odkaz.py <verze>
  <plný SHA>` (oddíly `## v<verze>` z CHANGELOG, test `src/test_release_odkaz.js`).
- Před každým odkazem ověřit, že tag ještě neexistuje — `release_odkaz.py` to
  dělá sám (`git ls-remote --tags`): u existujícího tagu odkaz nevyrobí (kód 3)
  a vypíše odkaz na vydaný release. U vydaného releasu bez popisu poslat odkaz
  na úpravu a text k vložení (`release_odkaz.py <verze> --upravit`).
- Verze bez tagu: `python3 nastroje/release_odkaz.py --chybejici` (hlásí jen
  nasazenou verzi = HEAD `origin/main`, pokud nemá tag; pustit po každém
  nasazení). Na konci dávky vypsat, jestli nasazená verze release ještě nemá;
  tagy a releasy ověřovat přes GitHub, ne odhadem.
- Po každém sloučení do `main` koordinace vyrobí `NOVINKY.md` (5–10 řádků
  česky: co je nové, co opravené, co má uživatel udělat jinak; bez cen).
- Sloučené pomocné větve maže J. V. tlačítkem v Actions: GitHub → Actions →
  „Smazat sloučené větve“ → Run workflow
  (https://github.com/vendljar/kalkulator-next-gen-engscalc/actions/workflows/smazat_vetve.yml).
  Smaže větve celé v `test` (`git merge-base --is-ancestor origin/<větev> origin/test`),
  nikdy `main`, `test`, `test-draft`, `claude/integrace-*` ani větev s posledním
  commitem mladším než `stari_hodin` (výchozí 24 h); vstupy `vynechat`
  a `jen_vypsat`. Logika je v `nastroje/sloucene_vetve.sh` (lokálně
  `--jen-vypsat` ukáže, co by se smazalo), test `nastroje/test_sloucene_vetve.sh`.
  Koordinace seznam odkazů na mazání jednotlivých větví nepřipravuje —
  nanejvýš J. V. připomene, že je co mazat.

## Testy

- Stupně kol: (1) po každé dávce `testovaci_kolo.sh` a porovnání sestavení
  nad pevnou sadou; (2) cílená sada na změněnou oblast; (3) plné kolo
  cenových nabídek jen před main a po nasazení.
- Porovnání sestavení po dávce (stupeň 1): každá dávka, která sahá do `src/`,
  pustí kolo s `--proti origin/test` (nebo `--jen porovnani --proti
  <předchozí stav>`). Dávka, která výsledek měnit nemá, musí dát „SHODA“;
  vědomou změnu (cena, dokument) zapíše do seznamu očekávaných rozdílů
  (`--ocekavane`, vzor `podklady/porovnani/`) a přiloží ho ke zprávě
  koordinaci. Neočekávaný rozdíl = nález, nic se neslučuje. Nástroj není
  brána do main (ceny main × test ověřuje J. V.). Návod
  `podklady/POROVNANI_SESTAVENI.md`.
- Testovací web testengscalc: **testovací sezení** (prostředí
  `kalkulator-testovani`) smí zapisovat v plném rozsahu (J. V. 19. 11. 2026);
  souhlas dává J. V. přímo v tom sezení, souhlas přes koordinaci nestačí.
  Ostatní automaty (dávky, Actions) test jen ČTOU. Ostrý web engscalc jen
  ČÍST. Pipedrive jen simulátor / suchý běh nebo deal TEST. Postup zkoušek
  je ve skillu `.claude/skills/testovaci-procedura-kng/`.
- STAV kola se zapisuje do `podklady/kola/STAV_KOLOnn.md`. Kopie jinde nejsou
  zdroj.
- Jediný seznam kroků je `nastroje/testovaci_kolo.sh` (sestavení bez zvýšení
  verze → `spust_testy.sh --smoke` → mutace jádra → mutace serveru → statické
  kontroly → souhrn s počty, nenulový kód při selhání). `nastroje/pred_pushem.sh`
  je obal (`--mutace` = celé kolo), CI volá tentýž skript. Mutační běh se
  nikdy nepřerušuje.
- Každý nový test musí mít pojistku proti prázdnému testu: doložit, že před
  opravou selže a po opravě projde (napsat do commitu).
- Statická kontrola osobních údajů a tajemství: `nastroje/kontrola_udaju.py`,
  povolený seznam `nastroje/povolene_kontakty.txt` (nový smyšlený kontakt v
  testu se tam zapíše s důvodem; skutečný do repa nepatří).
- **Kontrola údajů před každým pushem (SEC-M1, #542):** na začátku sezení
  `bash nastroje/instaluj_hooky.sh` (zapne `core.hooksPath = nastroje/hooky`;
  dělá to i `testovaci_kolo.sh` a `pred_pushem.sh`). Hook `pre-push` pustí
  `kontrola_udaju.py --rozsah` nad každým pushovaným commitem (i tagu, i zprávy
  commitů) a při nálezu push zastaví. **`git push --no-verify` je zakázané.**
  Nález se opraví ve vlastní, ještě nepushnuté větvi; co už odešlo, hlásit
  J. V. Druhá vrstva: workflow `kontrola_udaju.yml` na push do všech větví
  a tagů `v*`. Test hooku `nastroje/test_pre_push.sh` (statické kontroly kola).
- Krok `staticke` hlídá i startovní podklady (`nastroje/kontrola_podkladu.sh`):
  `PREDAVKA.md` nad 15 kB = chyba; `main` není předkem HEAD = upozornění.
- **Mutace po částech:** celé mutace se v cloudovém sezení do 2 h úlohy na
  pozadí nevejdou (server ~5 h). Pouštět po částech:
  `KNG_MUTACE_CAST=K/N bash nastroje/testovaci_kolo.sh --jen mutace-server`
  (K = 1…N, např. N = 4 pro jádro a 12 pro server — každá část pod 2 h), nebo
  přímo `node netlify/mutace.mjs --cast K/N`; přerušený běh naváže
  `--od <číslo>` podle posledního řádku `[pořadí/celkem]` v logu. Kolo
  s částí hlásí „ZELENÁ ČÁST", nikdy „VŠE ZELENÉ". Actions běží v matrixu
  (server 24 částí s limitem 100 min, jádro 3). Neznámá volba (i `--help`)
  a prázdný výběr skončí chybou s kódem 2; `--od` navazuje jen na pracovní
  kopii bez zbytku mutace. `KNG_MUTACE_OD` patří k jednomu kroku kola
  (číslování jádra a serveru se liší).
  **Po restartu kontejneru** nejdřív `git status`: změněný soubor v `src/`
  nebo `netlify/` bez běžícího mutačního procesu je zbytek mutace →
  `git checkout -- <soubor>`.
- N46 (nástupiště A ↔ C u zrcadlové šachty) se neopravuje bez pokynu J. V. —
  fuzz `src/test_fuzz_invarianty.js` rozdíl jen hlásí jako INFO.
