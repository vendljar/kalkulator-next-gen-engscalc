# Čočka NS — nasazení a supply chain (noční audit KNG, 20. 11. 2026)

Stav: `origin/test` = cda289e (v19.11.11), pracovní větev `claude/audit-2026-11-20`. Jen čtení kódu; síť: 15× GET na `https://testengscalc.netlify.app` (limit zadání vyčerpán), ostrý web nevolán. PoC v `podklady/audit_2026-11-20/poc_NS_*.mjs`, všechny spuštěné.

**Souhrn:** kritická 0 · vysoká 0 · střední 0 · nízká 4 · informativní 6. Rozdíl `origin/main` × `origin/test` v bodech 1–4 je nulový (viz oddíl 7), všechny nálezy tedy platí i pro main.

**Omezení ověření (čti před závěry):**
- Místní klon je **mělký** (`git rev-parse --is-shallow-repository` = true): 1655 commitů od 12. 8. 2026, jen refy `origin/main` a `origin/test`, **žádný tag, žádná jiná vzdálená větev**. Historie starší a historie ostatních větví/tagů (kam 26. 10. odešel odkaz `cshk_`) prohledána NEBYLA.
- `npm audit` nepuštěn (síť mimo testovací web zakázána); závislosti posouzeny offline.
- Nastavení repozitáře na GitHubu (ochrana větví, kdo smí spouštět workflow, secret scanning) a proměnné Netlify — **neověřeno** (mimo dosah).
- Shoda SHA akcí se značkou v komentáři (`# v5.1.0` …) — **neověřeno** (chce GitHub).

## Tabulka nálezů

| ID | Závažnost | Nález | Kde | PoC | main |
|---|---|---|---|---|---|
| NS-1 | nízká | Druhá vrstva kontroly údajů (workflow) při pushi dvou nových větví se stejnými commity naráz nezkontroluje žádný commit — oba běhy hlásí „čisté (0 commitů)“ | `.github/workflows/kontrola_udaju.yml:54-56` | `poc_NS_workflow_dve_vetve.mjs` → ZRANITELNÉ | ano |
| NS-2 | nízká | Kontrola údajů má doložené slepé skvrny: cesty se složkou `dist`/`_DB`/`_soukrome`/`node_modules` i v režimu `--rozsah`, soubory UTF-16, tajemství serveru bez uvozovek nebo s dvojtečkou, adresa Apps Script, zpráva anotovaného tagu | `nastroje/kontrola_udaju.py:51,132-134,137-140,86-87,223` | `poc_NS_kontrola_mezery.mjs` → ZRANITELNÉ (9 z 10) | ano |
| NS-3 | nízká | Kontrola i povolený seznam se berou z téhož pushe / pracovní kopie: commit, který přidá `*@doména` do `povolene_kontakty.txt`, pustí přes hook i workflow libovolnou adresu té domény; rozšíření seznamu nic nehlídá mimo tři stávající řádky `*@` | `nastroje/kontrola_udaju.py:109-124`, `nastroje/hooky/pre-push:23,50`, `kontrola_udaju.yml:38,51` | `poc_NS_kontrola_mezery.mjs` (případ h) | ano |
| NS-4 | nízká | Hook jde vynechat i jinak než zakázaným `--no-verify`: `git -c core.hooksPath=… push`, a zápisy přes API GitHubu (nástroje `push_files` / `create_or_update_file` dostupné v cloudových sezeních) hookem vůbec neprojdou; pravidlo v CLAUDE.md jmenuje jen `--no-verify` | `nastroje/hooky/pre-push:18-19`, `nastroje/instaluj_hooky.sh:21`, `CLAUDE.md` (oddíl Testy) | `poc_NS_kontrola_mezery.mjs` (případ j) | ano |
| NS-5 | informativní | Workflow kontroly běží jen pro tagy `v*`; tag jiného jména zveřejní commity bez druhé vrstvy | `.github/workflows/kontrola_udaju.yml:22` | ne | ano |
| NS-6 | informativní | 42 snímků PNG ve verzovaném stromu (33 v `podklady/vz_prototyp/snimky/`, 9 v `podklady/kola/np_nahled_2026-11-19/`) žádná kontrola číst neumí; `.gitignore` hlídá jen `snimek_*.png` | `.gitignore` (oddíl „Snímky obrazovky“), `kontrola_udaju.py:137-140` | ne | ano (část) |
| NS-7 | informativní | Hlavičky: chybí `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy` a `upgrade-insecure-requests`; HSTS v `netlify.toml` je bez `preload` (živý web ho má jen díky platformě `*.netlify.app` — na vlastní doméně by nebyl) | `netlify.toml:39,41` | ne (živé hlavičky níže) | ano |
| NS-8 | informativní | Starý server: `server/NASAZENI.md` dál popisuje nasazení na rosti.cz bez zmínky, že server nemá přihlášení a poslouchá jen na 127.0.0.1; komentář v kódu odkazuje na návod k reverse proxy, který v NASAZENI.md není; stavová stránka jde ven bez bezpečnostních hlaviček | `server/NASAZENI.md:1-18`, `server/server.js:126,139-142` | ne | ano |
| NS-9 | informativní | Připnutí verzí: Node 22.23.2 (v kontejneru už běží 22.23.5 — obsah oprav mezi nimi neověřen); `@netlify/blobs` 8.2.0 je za aktuální hlavní řadou (neověřeno online), známé CVE k němu neznám | `netlify.toml:22`, `.github/workflows/testy.yml:72`, `package-lock.json` | ne | ano |
| NS-10 | informativní | Historie gitu (mělká, viz omezení): žádný živě vypadající token; přetrvávají známé a přijaté výskyty — sdílecí odkaz `cshk_` (SEC-S4/K7-W1), adresy na firemní doméně a dřívější konstanta správce (B79), jedno mobilní číslo ve starém harnessu | viz oddíl 5 | ne | ano |

Nové nálezy střední a vyšší závažnosti v této čočce nejsou.

## Detail nálezů

### NS-1 — workflow „Kontrola údajů“ je slepý při pushi dvou nových větví naráz
- **Předpoklady:** kdokoli s právem pushe (sezení dávky, koordinace), kdo obejde nebo nemá zapnutý hook (čerstvý klon — známá mez SEC-M1) a pošle jedním `git push origin a b` dvě nové větve nad stejnými commity; totéž nastane, když druhá větev se stejnými commity dorazí dřív, než běh pro první udělá checkout.
- **Mechanismus:** u nové větve krok spočítá `jine` = všechny `refs/remotes/origin/*` kromě vlastní (`kontrola_udaju.yml:54`) a pustí `--rozsah "$PO" --not $jine` (`:56`). Commity jsou dosažitelné z druhé nové větve, takže `rev-list` je prázdný — v obou bězích. `kontrola_udaju.py:312-315` prázdný rozsah ohlásí jako „čisté (0 commitů…)“ s kódem 0.
- **Dopad:** druhá vrstva nezachytí údaj vložený a dalším commitem smazaný ani údaj ve zprávě commitu (špičku stromu krok „Strom špičky“ `:38` kontroluje dál). Přesně tvar incidentu z 26. 10. (odkaz odešel do více refů naráz). První vrstvu (hook) to neoslabuje.
- **PoC (spuštěno):** `node podklady/audit_2026-11-20/poc_NS_workflow_dve_vetve.mjs` — krok se bere doslova z workflow:
  ```
  1) jedna nová větev:        kód 1 — nález (správně)
  2) dvě nové větve naráz, běh pro dve-a: kód 0 — … čisté (0 commitů, 0 souborů a zpráv).
                           běh pro dve-b: kód 0 — … čisté (0 commitů, 0 souborů a zpráv).
  ZRANITELNÉ
  ```
- **Návrh opravy:** u nové větve vylučovat jen refy, které existovaly PŘED pushem — prakticky `--not` jen chráněné/dlouhodobé větve (`origin/main`, `origin/test`, integrace), ne všechny ostatní; cena je opakovaná kontrola už zveřejněných commitů (bezpečný směr). Navíc u nové větve brát prázdný rozsah při `PO` mimo `main`/`test` jako upozornění, ne tiché „čisté“.

### NS-2 — slepé skvrny `kontrola_udaju.py`
Nad rámec známých mezí SEC-M1/SEC-M11 (`BEZPECNOST_MEZE.md:1264-1285`: `--no-verify`, hook až po zapnutí, workflow až po pushi, 40 hex bez názvu). Doloženo PoC (hook zapnutý, kontrolní případ „e-mail v `src/x.js`“ zastaven):

| Případ | Proč projde | Kde |
|---|---|---|
| a) soubor v cestě se složkou `dist` (i `_DB`, `_soukrome`, `node_modules`, `__pycache__`) přidaný `git add -f` | `_vynechat()` platí i pro `--rozsah`, tedy pro obsah, který se skutečně pushuje | `kontrola_udaju.py:51,132-134,234` |
| b) text v UTF-16 (typický „Unicode text“/CSV z Excelu) | NUL v prvních 8 kB → „binární“, celý soubor se přeskočí | `:137-140,195-196` |
| c) `TAJEMSTVI_RELACE=hodnota` bez uvozovek (tvar `.env`, výpis prostředí, log) | vzor „tajemství serveru doslova v kódu“ chce uvozovky | `:86-87` |
| d) `"ADMIN_INIT_HESLO": "hodnota"` (JSON/YAML) | tentýž vzor chce `=` | `:86-87` |
| e) adresa `script.google.com/macros/s/<id>/exec` | žádný vzor | `:63-97` |
| g) zpráva anotovaného tagu | čte se jen zpráva commitu (`git log -1 --format=%B`); pravidlo „tagy jen lightweight“ je jen v CLAUDE.md | `:223`, `hooky/pre-push:28` |
| i) base64 | očekávaná mez každé kontroly vzorem | — |

Případ f) (heslo v adrese `schéma://uživatel:heslo@host`) se zachytil jen náhodou — `heslo@host` vypadá jako e-mail mimo seznam; s hostem z povolené domény (`…@priklad.cz`) by prošel, vlastní vzor na heslo v URL není (neověřeno během, plyne z `:55,281`).
Další, jen čtením kódu (bez PoC): z `.docx/.xlsx` se čtou jen vyjmenované části (`:50` — ne poznámky pod čarou, `xl/comments`, `docProps/app.xml`, `customXml`); `.xlsm`, `.pptx`, `.odt`, `.zip`, `.gz`, PDF a obrázky se nečtou vůbec; pevná linka bez `+420` a zahraniční čísla mimo `+4x` se nehledají (`:57-62`); řádek s `process.env.X = '…pokus…'` vypne VŠECHNY vzory tajemství na tom řádku (`:105-106,291-298`).
- **Dopad:** únik údaje do veřejného repa, který kontrola měla zachytit; nevratné (historie).
- **Návrh opravy:** v `--rozsah` nevynechávat podle složky (jen `VYNECHAT_SOUBORY`); UTF-16 s BOM dekódovat místo přeskočení a u přeskočeného binárního souboru s textovou příponou hlásit nález; vzor tajemství serveru rozšířit o `[:=]` a hodnotu bez uvozovek; přidat vzor Apps Script `/macros/s/<id>/exec` a `://[^/\s:@]+:[^/\s@]+@`; v hooku číst i zprávu objektu tagu (`git cat-file -t`), případně anotovaný tag odmítnout.

### NS-3 — kontrola a povolený seznam z téhož pushe
- **Mechanismus:** hook spouští `nastroje/kontrola_udaju.py` z pracovní kopie (`hooky/pre-push:23,50`), ta čte `povolene_kontakty.txt` z pracovní kopie (`kontrola_udaju.py:109-124`); workflow spouští skript i seznam z pushnutého commitu (`kontrola_udaju.yml:38,51`). Push, který zároveň přidá řádek `*@doména` (nebo upraví skript), projde oběma vrstvami — PoC případ h).
- `src/test_kontrola_udaju.js:71` hlídá jen to, že celodoménově jsou povolené právě `example.com`, `priklad.cz`, `zkusebni.cz` — běží ale v kole, ne v hooku ani ve workflow `kontrola_udaju.yml`; přidání přesné adresy nehlídá nic.
- Stav seznamu dnes: 3 celé domény, ~35 přesných adres, 10 telefonů. `priklad.cz` a `zkusebni.cz` nejsou vyhrazené domény (na rozdíl od `example.com`) — kdokoli si je může registrovat (neověřeno, zda registrované jsou); adresy typu `x@priklad.cz`, `…@b.cz`, `…@firma.cz`, `…@svj.cz` míří na skutečně registrovatelné domény. Seznam obsahuje jednu přesnou adresu na firemní doméně (přijato rozhodnutím J. V. 24. 9. 2026, hlavička `kontrola_udaju.py:4-9`). Příliš široký není.
- **Návrh opravy:** ve workflow porovnat `povolene_kontakty.txt` a `kontrola_udaju.py` s verzí na `origin/main` a změnu vypsat jako upozornění v souhrnu běhu (viditelné J. V.); test `:71` pustit i ve workflow kontroly.

### NS-4 — vynechání hooku mimo `--no-verify`
- `git -c core.hooksPath=/dev/null push` hook nespustí (PoC případ j); stejně `git config --unset core.hooksPath`. `instaluj_hooky.sh --kontrola` (`:15-17`) se nikde nevolá jako brána (kolo hook jen tiše zapíná, `testovaci_kolo.sh:73`).
- Zápis přes API GitHubu (nástroje GitHub MCP `push_files`, `create_or_update_file`, `create_branch`, které cloudové sezení má k dispozici) nejde přes `git push`, hook se tedy nespustí vůbec; zůstává jen následná vrstva workflow (s mezerou NS-1). CLAUDE.md zakazuje jen `git push --no-verify`.
- **Dopad:** hygiena procesu; žádné nové oprávnění.
- **Návrh opravy:** doplnit pravidlo v CLAUDE.md („zápis do repa jen `git push` se zapnutým hookem; žádné `-c core.hooksPath`, žádný zápis souborů přes API GitHubu“) — text pravidla je na J. V.; technicky by pomohl SessionStart hook (známá mez SEC-M1).

### NS-5 až NS-10 (informativní)
- **NS-5:** `on.push.tags: ['v*']` (`kontrola_udaju.yml:22`) — tag jiného jména (např. pracovní) nese commity veřejně bez běhu workflow. Návrh: `tags: ['**']`.
- **NS-6:** snímky PNG kontrola číst neumí (`kontrola_udaju.py:137-140`); `.gitignore` má jen `snimek_*.png`. Obsah 42 verzovaných snímků jsem neprohlížel (**neověřeno**, zda nesou ceny či jména) — doporučuji jednorázovou prohlídku očima a pravidlo, že snímky do repa jdou jen z ukázkových dat.
- **NS-7:** viz živé hlavičky níže. CSP na živém webu je doslova shodná s `netlify.toml:41` a obsahuje `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`. Chybí `upgrade-insecure-requests` (při HSTS malý přínos), COOP/CORP (`Cross-Origin-Opener-Policy: same-origin` by oddělil tisková okna cizích stránek; pozor — aplikace sama otevírá náhledy přes `window.open`, same-origin to nerozbije, ale je to změna chování → rozhodnutí a zkouška). `'unsafe-inline'` je známá mez SEC-I9. HSTS `preload` dodává platforma; při přechodu na vlastní doménu doplnit vědomě (spolu se SEC-I8).
- **NS-8:** `server/server.js` není součástí nasazení Netlify (`netlify.toml:10-11,24-26` publikuje jen `dist` a funkce z `netlify/functions`; žádná funkce ho neimportuje). Výchozí poslech 127.0.0.1 (`server.js:142`), `/api/vypocet` bez přihlášení je známá mez SEC-I6/B12 (`BEZPECNOST_MEZE.md:1199-1202`). Slabší než funkce je v tom, že nemá žádné přihlášení ani práva — nese ale jen výpočet z dat v požadavku, žádné úložiště. Zda někde běží (rosti.cz) nelze z repa zjistit — **neověřeno**; `NASAZENI_NETLIFY.md` ho nezmiňuje. Návrh: do `server/NASAZENI.md` první řádek „nepoužívá se, nasazení je Netlify; nikdy nevystavovat bez autentizace“ a stavové stránce (`server.js:126`) dát `HLAVICKY`.
- **NS-9:** připnutí je v pořádku (přesná verze Node na obou místech shodná: `netlify.toml:22` = `testy.yml:72,129,152`). Doporučení: při příštím vědomém povýšení srovnat s aktuální 22.x.
- **NS-10:** viz oddíl 5.

## 1. `netlify.toml`, `build.py`, živý web

- Publikuje se jen `dist` (`netlify.toml:10-11`); `build.py:179-182` do něj zapíše právě tři soubory (`kalkulacka.html`, `index.html`, `kalkulacka_v<verze>.html`), žádné mapy, zdrojáky ani podklady. Živě ověřeno: `/netlify.toml`, `/package.json`, `/build.py`, `/src/jadro.js`, `/.git/config`, `/.env`, `/verze.txt`, `/netlify/functions/zdravi.mjs`, `/robots.txt` → 404.
- Žádné `[[redirects]]` ani `_redirects` → žádné otevřené přesměrování; `/api/*` obsluhují funkce přes `config.path` (32 funkcí, každá vlastní cestu). Výchozí adresa `/.netlify/functions/zdravi` → 404 (živě).
- Plánovaná funkce: jen `zaloha_nocni.mjs:113` (`schedule`, bez `path`); živě `GET /.netlify/functions/zaloha_nocni` → **403** s prázdným tělem, přes HTTP tedy spustit nejde. Hlídá `netlify/test_o_k9_zalohy.mjs:509-512`.
- `included_files = ["verze.txt"]` (`netlify.toml:26`) — nic citlivého.
- Hlavičky z `netlify.toml` se na odpovědi funkcí neuplatní (živě: `/api/zdravi` nemá `X-Frame-Options` ani `Permissions-Policy`), funkce si nesou vlastní (`netlify/lib/sdilene.mjs:409-411`: `no-store`, `nosniff`, CSP `default-src 'none'; frame-ancestors 'none'`, `no-referrer`) — živě potvrzeno. Blok `/api/*` v `netlify.toml:43-46` je tedy bez účinku (neškodí).
- HTML: `cache-control: public,max-age=0,must-revalidate` + ETag (výchozí Netlify) — v pořádku, nová verze se načte hned.
- `/api/zdravi` anonymně hlásí verzi a prostředí — vědomé (`zdravi.mjs:7-14`, hlídka verze), ne nález.

### Skutečné hlavičky testovacího webu (19. 11. 2026 21:51 UTC; cookies žádná odpověď nenastavila)

`GET /` → 200 (4 439 439 B; `/kalkulacka.html` totožné včetně ETag):
```
cache-control: public,max-age=0,must-revalidate
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://ares.gov.cz; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'
content-type: text/html; charset=UTF-8
permissions-policy: camera=(), microphone=(), geolocation=()
referrer-policy: strict-origin-when-cross-origin
server: Netlify
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-content-type-options: nosniff
x-frame-options: DENY
```
`GET /api/zdravi` → 200, tělo `{"ok":true,"verze":"19.11.11","prostredi":"test",…,"beh":"netlify"}`:
```
cache-control: no-store
content-security-policy: default-src 'none'; frame-ancestors 'none'
content-type: application/json; charset=utf-8
referrer-policy: no-referrer
server: Netlify
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-content-type-options: nosniff
```
`GET /neexistuje-audit-ns` (a ostatní statické cesty výše) → 404, výchozí stránka Netlify 3 449 B, tytéž hlavičky jako `/` (CSP, HSTS, XFO, nosniff).
`GET /.netlify/functions/zaloha_nocni` → 403, `cache-control: private,max-age=0`, `content-length: 0`, HSTS; `GET /.netlify/functions/zdravi` → 404.

## 2. Závislosti

- `package.json`: jediná závislost `@netlify/blobs ^8.1.0`; `package-lock.json` (lockfileVersion 3): 1 balíček `@netlify/blobs` 8.2.0, má `integrity`, `resolved` na `registry.npmjs.org`, bez `hasInstallScript`, bez tranzitivních závislostí, žádná git/http závislost. Známé CVE k této verzi neznám (offline; `npm audit` nepuštěn).
- `server/package.json`: bez závislostí. `node_modules/` v repu není (ignorováno; místně jen symlink na Playwright).
- Vendorované cizí knihovny v `src/`: **žádné** — žádný `*.min.*`, žádná licenční hlavička cizího kódu, žádný odkaz na CDN; `src/docxgen.js` a `src/xlsx.js` jsou vlastní („bez externích knihoven“), CSP `script-src 'self'` cizí původ ani nedovolí.
- CI: Playwright `npm i --no-save playwright@1.56.1` bez zámku s integritou (`testy.yml:83`) — známá mez SEC-N7 (`BEZPECNOST_MEZE.md:1222-1226`), nezhoršila se; job má `contents: read`, `persist-credentials: false`, žádná tajemství.

## 3. GitHub Actions

- `testy.yml`: `permissions: contents: read` (`:53-54`), spouštěče `push` na main a `workflow_dispatch` bez vstupů; žádný `pull_request_target`; akce připnuté na 40znakové SHA (`:66,70,74,91`); žádné `secrets.*`, žádné `set -x`; artefakt `dist/` (`:89-96`) je sestavení z vynulovaných zdrojáků; matrix mutací jen čte.
- `kontrola_udaju.yml`: `contents: read`, `persist-credentials: false`, vstupy události jdou přes `env` (`:41-44`), ne vložením do `run`. `$jine` je schválně bez uvozovek (`:56`) — názvy refů nemohou nést mezeru ani znaky globu (`* ? [` Git zakazuje), bezpečné. `${REF#refs/heads/}` jde do `grep -vx` jako regulární výraz (`:54`): tečka v názvu větve může vyloučit o ref víc → zkontroluje se víc, bezpečný směr. Výpis nálezu je maskovaný (`kontrola_udaju.py:244-247`).
- `smazat_vetve.yml`: `contents: write` jen zde (`:41-42`), jen `workflow_dispatch`, job podmíněn `github.ref == 'refs/heads/main'` (`:50`) a skript totéž (`sloucene_vetve.sh:100-103`); vstupy jdou přes `env` do pole argumentů (`:61-69`). **Odolné** — PoC `poc_NS_sloucene_vetve_jmena.mjs` (spuštěno): 13 zlomyslných názvů větví (`$(…)`, zpětné apostrofy, `;`, `|`, `&&`, `-x`, `--delete`, uvozovky, `refs/heads/main`, `Main`, `TEST`, `claude/integrace`) a 5 zlomyslných vstupů (`vynechat` s `$(…)`, `stari_hodin` s `;`, `$(…)`, aritmetickou injekcí `a[$(…)]`, `vynechat` = `* main test --zaklad main`):
  ```
  Návratové kódy běhů se zlomyslnými vstupy: 0, 2, 2, 2, 0
  Smazané větve (12): … (jen nechráněné sloučené)
  Chráněné větve po bězích existují: ano — main, test, test-draft, claude/integrace-19-11
  Vedlejší příkaz spuštěn (soubor stopy): ne
  ODOLNÉ
  ```
  Důvody v kódu: všude uvozovky, `set -f` (`:62`), `--stari-hodin` jen číslice a ≤ 4 znaky před aritmetikou (`:89-97`), mazání plným `refs/heads/<větev>` s `--force-with-lease` na SHA (`:203`), chráněné přesnou shodou a vzorem (`:70-71,117-123`), klíče asociativních polí jsou SHA, ne názvy (`:129,133,189`). Zbytkové: název větve jde neescapovaný do Markdownu souhrnu běhu (`:223-240`) — jen vzhled souhrnu, ne spuštění.

## 4. Hook a kontrola údajů

- `python3 nastroje/kontrola_udaju.py` (režim čtení, pracovní strom): **„čisté (991 souborů, 242 e-mailů a 10 telefonů v povoleném seznamu)“, kód 0**; po přidání PoC souborů čočky znovu čisté (1025 souborů).
- V tomto kontejneru je hook zapnutý (`core.hooksPath = nastroje/hooky`).
- Hook: mazání refu přeskočí (`pre-push:27`), bez `python3` nebo bez nástroje push zastaví (`:34-41`), prázdný vstup = konec 0 (`:33`); nová větev bez základu → `--not --remotes=<vzdálené>` (`:44-48`), tj. kontrolují se všechny commity, které origin podle místních sledovacích refů nemá. `--rozsah` bez revizí → kód 2 (`kontrola_udaju.py:255-257`).
- Co nezachytí: viz NS-1 až NS-5.

## 5. Tajemství v historii gitu (mělká historie 12. 8. – 19. 11. 2026, 1655 commitů, `origin/main` + `origin/test`)

Prohledáno `git log --all -p` vlastními vzory (PEM, `ghp_`/`github_pat_`, `AIza`, `sk-`, `xox`, `nfp_`, `api_token=`, `Bearer`, heslo v URL, Apps Script `/exec`, `cshk_`, `claude.ai/share`, JWT, 40 hex u názvu klíče, názvy tajemství serveru, Slack webhook, složka Disku) a `kontrola_udaju.py --rozsah origin/test origin/main` (375 řádků nálezů). Soubory `.env*`, `*.pem`, `*.key`, `.netlify/`, `.npmrc`, `id_rsa`, `credentials` v historii: **žádné**.

| Typ | Místo (commit, soubor:řádek) | Hodnocení |
|---|---|---|
| sdílecí odkaz na sezení Claude (`cshk_`) | 76287513 `podklady/PREDAVKA_KOORDINACE_15_10.md:21`; 9abed073 tamtéž `:30`; b195b44c tamtéž `:38`; 76287513 / 9bc4965e / b195b44c `.claude/skills/kokpit-koordinace/kokpit_sablona.html:201/194/191` | **skutečný**, známé (K7-W1, SEC-S4 — `BEZPECNOST_MEZE.md:1275-1276`); z aktuálního stromu odstraněn (3c04445a, 25d2c32d), v historii `main` zůstává; zrušení sdílení je na J. V. |
| adresa správce jako konstanta (`ADMIN_EMAIL = '…'`) | 1cca1bc0, 7d1a6e7b, c1d42235, deb9551c, e11cb0db `netlify/lib/sdilene.mjs:20`; zpráva commitu 96f437c5 `:5` | **skutečná** adresa, známé (B79, rozhodnutí J. V. 24. 9. 2026 ponechat) |
| e-maily na firemní doméně v testech (6 různých místních částí, převážně obecné role) | `netlify/test_obnova.mjs` (749df09c, 50de3e78, 0b870000, 7d1a6e7b, fb06c7e9, 65026d05, 34cc5bb1), `overit_online.mjs` (21 commitů, např. fb06c7e9), `netlify/test_funkce.mjs` (1cca1bc0, e11cb0db, deb9551c, 17225312), `overit_role_nahled.mjs`, `overit_zobrazeni.mjs` | skutečná doména, místní části zčásti smyšlené role; známé (B79); v `main` |
| mobilní telefon | `overit_nabidka_proj_word.mjs:108-120` (17225312, 1e5a13ee, 711a1b0f, 74807051, 81ee771e, f9e83a71) | **neověřeno**, zda smyšlený; v aktuálním stromu už není mimo seznam |
| „tajemství serveru doslova v kódu“ | 6a0c904b `netlify/test_prihlaseni.mjs:258`, f8ab75f2 tamtéž `:275` | zkušební hodnota v testu (neověřeno hlouběji) |
| `Bearer <text>` | `netlify/test_577_kopie_skript.mjs:103` | smyšlená — test „token kratší než 32 znaků“ |
| názvy tajemství serveru u hodnoty (109 míst) | `netlify/test_*.mjs`, `overit_*.mjs`, `podklady/*_pokus*` | zkušební (`process.env.X = '…zkusebni…'` apod.) |

Token Pipedrive, klíč Netlify, tajemství relace, adresa Apps Script s ID, heslo v URL, PEM, tokeny GitHub/Google/OpenAI/Slack: **nenalezeny**.

## 6. Starý server
Viz NS-8. Není součástí nasazení, výchozí poslech jen localhost, bez úložiště a bez tajemství; hlavičky a CSP shodné s `netlify.toml` (`server.js:47-57,66-67`), strop těla 2 MB (`:44,83-101`), chybová odpověď bez vnitřních hlášek (`:113-117`).

## 7. `origin/main` × `origin/test` (body 1–4)
`git diff origin/main origin/test` nad `netlify.toml`, `package.json`, `package-lock.json`, `server/`, `.github/`, `nastroje/hooky/`, `nastroje/kontrola_udaju.py`, `nastroje/povolene_kontakty.txt`, `nastroje/instaluj_hooky.sh`, `nastroje/test_pre_push.sh`, `nastroje/sloucene_vetve.sh`: **beze změny**. Liší se jen `.gitignore` (test navíc: výjimka `!podklady/kola/STAV_*.md`, vzory `test_sada_*.json(.gz)`, `otisk_*.json(.gz)` — main je tedy v ochraně před omylem přidaným exportem TEST sady o krok pozadu) a `build.py` (jen seznam modulů). Všechny nálezy NS-1 až NS-10 platí pro main stejně.

## Co je v pořádku (ověřeno)
- Web publikuje jen tři HTML z `dist`; zdrojáky, konfigurace, `.git`, `.env` zvenku nedostupné (živě 404).
- CSP na živém webu = `netlify.toml:41`, včetně `frame-ancestors`, `object-src`, `base-uri`, `form-action`; HSTS, `nosniff`, XFO, Referrer-Policy, Permissions-Policy přítomné i na stránce 404.
- Funkce nesou vlastní `no-store` + CSP `default-src 'none'` (`sdilene.mjs:409-411`), živě potvrzeno na `/api/zdravi`.
- Plánovaná záloha není dostupná přes HTTP (403); výchozí adresy funkcí neodpovídají (404).
- Žádná přesměrování; žádné cookies na anonymních odpovědích.
- Závislosti: jediný balíček se zámkem a integritou, bez instalačních skriptů; žádný vendorovaný cizí kód.
- Workflows: nejmenší oprávnění, akce na SHA, vstupy přes `env`, bez tajemství; „Smazat sloučené větve“ odolné proti injekci názvem větve i vstupem a chráněné větve nesmaže (PoC ODOLNÉ).
- Kontrola údajů nad aktuálním stromem čistá; hook zastaví e-mail mimo seznam (kontrolní případ PoC).
- V dostupné historii žádný živě vypadající klíč ani token služby.

## Co testy/mutace NEhlídají
- `netlify/mutace.mjs` ani `mutace_jadro.mjs` se `netlify.toml`, `.github/` ani nástrojů kontroly údajů netýkají (0 zmínek) — mutace hlídají jen serverové funkce a jádro. `netlify/test_prava.mjs` do této oblasti nezasahuje.
- Obsah CSP a hlaviček v `netlify.toml` nehlídá žádný test (toml čte jen `netlify/test_o_k9_zalohy.mjs:509-512` kvůli přesměrování na `zaloha_nocni`); odstranění `frame-ancestors` nebo HSTS by kolo nepoznalo. Hlavičky funkcí hlídá `netlify/test_sec_z2.mjs`.
- `src/test_build_info.js:134` hlídá `permissions: contents: read` jen u jednoho workflow; připnutí akcí na SHA, `persist-credentials: false`, podmínku `if: github.ref == 'refs/heads/main'` ve `smazat_vetve.yml:50` a spouštěče nehlídá nic.
- Krok „Pushnuté commity“ workflow `kontrola_udaju.yml` nemá žádný test (NS-1 by jinak vyšel najevo); `nastroje/test_pre_push.sh` zkouší jen hook, a to jen: odkaz `cshk_`, e-mail, lightweight tag, zprávu commitu, mazání — ne anotovaný tag, ne dvě větve naráz, ne složky z `VYNECHAT_SLOZKY`, ne `-c core.hooksPath`.
- `src/test_kontrola_udaju.js` hlídá vzory a výčet celých domén (`:71`), ne UTF-16, ne tvary bez uvozovek / s dvojtečkou u tajemství serveru, ne Apps Script, ne rozšíření seznamu o přesné adresy.
- `nastroje/test_sloucene_vetve.sh` zkouší `-x`, znaky `& # %` a diakritiku; názvy s `$(…)`, zpětnými apostrofy, `;`, `|` a názvy podobné chráněným (`Main`, `refs/heads/main`, `claude/integrace`) zkouší jen nový PoC.
- Soulad `package-lock.json` (integrita, registr) nehlídá žádný test — přidání závislosti z gitu/URL by kolo nepoznalo.
- Skutečné hlavičky nasazeného webu neověřuje žádný automat (jen tato ruční zkouška).

## PoC soubory (všechny spuštěné, lokálně bez sítě)
- `podklady/audit_2026-11-20/poc_NS_workflow_dve_vetve.mjs` → ZRANITELNÉ (NS-1)
- `podklady/audit_2026-11-20/poc_NS_kontrola_mezery.mjs` → ZRANITELNÉ, 9 z 10 případů prošlo (NS-2, NS-3, NS-4)
- `podklady/audit_2026-11-20/poc_NS_sloucene_vetve_jmena.mjs` → ODOLNÉ (bod 3)
