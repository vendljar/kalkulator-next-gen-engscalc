# Čočka XS — XSS a vkládání HTML v klientu (noční audit KNG, 20. 11. 2026)

Stav: `origin/test` v19.11.11 (cda289e), srovnání s `origin/main` (sestavení hlásí v11.11.1). Jen čtení kódu; obě větve jsem sestavil z `git archive` do scratchpadu (`KNG_NEZVYSOVAT_VERZI=1 python3 build.py`), pracovní strom ani `verze.txt` se nezměnily. Žádná síť (ARES jen jako místní podvrh přes `page.route`).

## Závěr jednou větou

V klientu jsem **nenašel žádné zneužitelné XSS** — ani z dat uložené zakázky (obchodník → administrátor), ani z odpovědí serveru, ani z odpovědi ARES. Jediné místo, kde se payload opravdu spustil, je tabulka počítadel Analytiky (čísla ze serveru jdou do HTML bez `esc`), a tam server text do počtů nepustí. Nálezy jsou proto jen nízké a informativní.

## Počty podle závažnosti

| kritická | vysoká | střední | nízká | informativní |
|---|---|---|---|---|
| 0 | 0 | 0 | 2 | 2 |

## Tabulka nálezů

| ID | Závažnost | Nález | Kde (origin/test) | PoC | Main dotčen |
|---|---|---|---|---|---|
| XS-1 | nízká | Analytika vkládá počty z `/api/analytika` do HTML bez `esc()`/`num()`; kdyby server vrátil text, spustí se administrátorovi. Server dnes vrací vždy čísla. | `src/ui/analytika_ui.js:175-178`, `:249-255`, `:259`, `:261` | `poc_XS_odpovedi_serveru.mjs` (běh „čísla → text": spuštěno 13 cest odpovědi), `poc_XS_analytika_cisla.mjs` (server: ODOLNÉ) | ano (stejné) |
| XS-2 | informativní | Další čísla z odpovědí serveru jdou do HTML bez `esc()`/`num()` (náhled obnovy, souhrn mapy polí CRM, souhrn „nanečisto"). **Neověřeno PoC** — tyto obrazovky jsem v běhu neotevřel. | `src/ui/online_ui.js:4042`, `:4061`; `src/ui/pd_mapa_ui.js:68-73`; `src/ui/pd_nanecisto_ui.js:94`, `:103` | ne | ano (`pd_mapa_ui.js` beze změny, řádek náhledu obnovy je na main stejný; `pd_nanecisto_ui.js` se liší o 5 řádků, neporovnáváno) |
| XS-3 | informativní | CSP neudrží data uvnitř po případném XSS: odvod navigací a `window.open` projde. Mez SEC-I9 v `BEZPECNOST_MEZE.md` to nezmiňuje (píše, že CSP „drží `connect-src` a `img-src` ven"). | `netlify.toml:39` | `poc_XS_csp_odvod.mjs` | ano (`netlify.toml` beze změny) |
| XS-4 | nízká | `POST /api/analytika` s počtem ve tvaru objektu (`{"pocty":{"prihlaseni":{"toString":1}}}`) vyhodí výjimku v `analytikaCislo` — podle kódu odpověď 500 místo 400. Nic se neuloží, postihne jen odesílatele. Není to XSS, předávám koordinátorovi. | `src/analytika.js:164-165`, volání bez `try` v `netlify/functions/analytika.mjs:118-133` | `poc_XS_analytika_cisla.mjs` (výjimka na úrovni funkcí jádra; stavový kód 500 jsem přes HTTP neověřoval) | ano (oba soubory beze změny proti main) |

PoC jsou v `podklady/audit_2026-11-20/`.

## Souhrnná čísla (statický soupis)

Počítáno nad soubory ze seznamu `build.py` (bez `test_*.js`), vlastním skenerem šablon (`scratchpad/xs/scan.js`):

| | origin/test | origin/main |
|---|---|---|
| výskyty `innerHTML` | 78 | 78 |
| `document.write` (okna náhledů) | 12 | 11 |
| `onclick=` skládané v řetězci | 403 | 372 |
| všechny obsluhy `on*=` v řetězci | 720 | 671 |
| interpolace `${…}` v šablonách s HTML | 3 789 | 3 491 |
| z toho celé obalené `esc()` | 1 094 | 978 |
| z toho celé obalené `escJs()` / `keyAttr()` | 191 | 170 |
| z toho číselné obaly (`num`, `fmt*`, `Math.*`) a konstanty | 109 | 107 |
| z toho bez přímého obalu | 2 395 | 2 236 |

- `outerHTML`, `insertAdjacentHTML`, `srcdoc`, `eval`, `new Function`, `setTimeout` s řetězcem, `postMessage`/`onmessage`, `DOMParser`: **0 výskytů**.
- „Bez přímého obalu" neznamená díru: jsou to vnořené hotové kusy HTML, ternáry s literály, indexy smyček a konstanty. Skener neumí rozlišit data od kódu, proto rozhodl dynamický test.
- Interpolace v kontextu JavaScriptu obsluhy bez `escJs`/`keyAttr`: 197. Prošel jsem je všechny: indexy, literály z kódu, předem escapované proměnné (`origJs = keyAttr(…)`, `cj = rcCestaJs(…)`, `kidJs = escJs(…)`), kódy jazyků z pevných seznamů. Žádná hodnota z dat. Vzorec „`esc()` uvnitř JS řetězce v `onclick`" (entita se dekóduje zpět): **0 výskytů**.
- Dynamicky se spustilo: **13 cest odpovědi `/api/analytika`** (≈ 14 míst vložení v `analytika_ui.js`), nic jiného.

## Detail nálezů

### XS-1 — počítadla Analytiky bez escapování (nízká)

- **Kde:** `analytikaSrovnani` (`analytika_ui.js:175-178`: `${p.zakazky}` … `${p.chyby}`), tabulka přehledu (`:249-255`: `${c.zakazky}` … `${p.dnu}`), počty u záložek a prvků (`:259`, `:261`: `' (' + n + '×)'`).
- **Předpoklad útočníka:** musel by do odpovědi `/api/analytika` dostat text místo čísla. Přihlášený uživatel to přes `POST /api/analytika` nedokáže: dávka i už uložený den procházejí `analytikaCislo` (`src/analytika.js:164-168`) v `analytikaSlij` (`:206`), počet dnů je `dvojice.length` (`netlify/functions/analytika.mjs:89`). Zbývá jen kompromitovaný server nebo budoucí změna serveru.
- **PoC:** `poc_XS_odpovedi_serveru.mjs`, běh „čísla → text" — spustilo se `celkem.pocty.*`, `poMesicich.<měsíc>.pocty.*` a `dnu`. `poc_XS_analytika_cisla.mjs` — nepřátelská dávka i poškozený denní záznam: „hodnoty, které nejsou číslo: žádné", výsledek ODOLNÉ.
- **Dopad dnes:** žádný přímý; chybí druhá vrstva. Analytiku vidí jen administrátor, takže případný průchod by běžel pod jeho relací.
- **Oprava:** obalit `num()` nebo `esc()` (≈ 14 míst), stejně jako to dělají ostatní obrazovky.

### XS-2 — další neescapovaná čísla ze serveru (informativní, neověřeno)

- Náhled obnovy: `<td>${b.nove}</td><td>${b.prepsane}</td>…` (`online_ui.js:4042`), `${s.nove + s.prepsane}`, `n.davek` (`:4061`).
- Mapa polí CRM: `${n || 0}`, `${s.celkem || 0}`, `${s.nezarazeno || 0}` (`pd_mapa_ui.js:68-73`).
- Nanečisto: `${s[k] || 0}`, `${s.kolize || 0}` (`pd_nanecisto_ui.js:94`, `:103`).
- Hodnoty počítá server; zda je vždy vrací jako čísla, jsem neověřoval (`/api/obnova` a `/api/pd/*` v PoC nejsou — Pipedrive potřebuje síť). Doporučení stejné jako u XS-1.

### XS-3 — CSP a odvod dat po XSS (informativní)

- **PoC:** stránka s hlavičkou CSP z `netlify.toml`, skript vložený obsluhou `onerror`:
  - vložená obsluha se spustila; `eval`/`new Function` zablokováno;
  - odvod na cizí původ: `fetch` zablokován, `img` zablokován, formulář zablokován, **`window.open` prošel, navigace (`location.href`) prošla**;
  - vlastní `/api/*` dostupné pod relací oběti.
- **Dopad po případném XSS:** cookie relace je `HttpOnly; Secure; SameSite=Lax` (`netlify/lib/sdilene.mjs:382`), ukrást ji nejde. Skript ale může pod relací oběti volat vlastní API (u administrátora založit účet, číst zakázky) a přečtená data poslat ven v adrese navigace nebo nového okna.
- **Návrh:** doplnit větu do SEC-I9. Technicky to řeší až odstranění `'unsafe-inline'` (delegované posluchače + hash skriptu, v SEC-I9 už vedeno jako dlouhodobý záměr); direktivu `navigate-to` prohlížeče nepodporují.

### XS-4 — výjimka v `analytikaCislo` (nízká, hygiena)

- `Math.round(+n)` nad objektem bez převoditelné hodnoty vyhodí `TypeError`. `analytikaDavkaOcisti` pouští mapu `pocty` dál bez kontroly typů hodnot, volání ve funkci není v `try`.
- Stejná třída jako dřívější „objekt → 400, ne 500". Oprava: v `analytikaCislo` vracet 0 pro vše, co není číslo nebo řetězec.

## Co je v pořádku (ověřeno)

**Data uložené zakázky (obchodník → administrátor)** — `poc_XS_zakazka_taint.mjs`, 14 běhů, výsledek ODOLNÉ na test i main:
- obarveno 211–565 řetězců zakázky (hlavička, další zákazníci VZ, varianty, PROJ, poznámky, přílohy, vazba z webhooku Pipedrive, vítěz organizace), zvlášť běh „čísla → text" (třída B69);
- vykresleno všech 13 záložek, otevřený další zákazník, všechna Nastavení, jako administrátor i obchodník;
- otevřeno až 10 oken náhledů: nabídka OCK, **náhled podkladů ve vzhledu Wordu**, porovnání variant, detail položek, krycí list BO/Tech, detail výpočtu, nabídka PROJ, **Objednávka PROJ**, krycí list PROJ; i v tisku EN/DE (skript „bez překladu" s daty v `<script>`);
- kromě spuštění se hledal payload v kódu obsluh `on*` mimo řetězec a adresy `javascript:` — nic;
- každý běh má pozitivní kontrolu (syrové vložení payload spustí), jinak by výsledek neplatil.
- Omezení: Objednávka PROJ a část náhledů se u plně obarvené zakázky otevřou jen s vypnutými zábranami dokumentů (obarvené výčty neprojdou kontrolou); běhy „volné texty" je otevírají se zábranami zapnutými, kde to kontrola dovolí.

**Odpovědi serveru** — `poc_XS_odpovedi_serveru.mjs`, skutečné funkce nad paměťovým úložištěm, obarven každý řetězec v odpovědích 16 adres (`/api/ja`, `uzivatele`, `zakazky`, `zakaznici`, `schvalovani`, `firma`, `sablony`, `slovnik`, `program`, `popisy`, `zobrazeni`, `funkce`, `analytika`, `controlling`, `zaloha_vynuceno`, `zdravi`):
- texty (včetně e-mailu a jména souboru): **nic se nespustilo**, test i main;
- prošlo 51 kroků: záložky, Nastavení → Uživatelé s přítomností online (#679), kontakt účtu, Databáze se seznamem zakázek, otisky, obnova, Zákazníci s kartou, schvalování napříč zakázkami, otevření zakázky ze serveru.

**ARES (cizí strana → uživatel):** podvržená odpověď s obarvenými poli, panel rozdílů i potvrzený přepis do hlavičky — nic se nespustilo (`ares_ui.js:200-214` vše přes `esc`).

**Čtením kódu:**
- `esc` escapuje `& < > " '`, `escJs` navíc `\`, `'`, konce řádků a U+2028/2029 (`common.js:651-658`).
- Náhled Wordu: všechen text přes `nwEsc`/`nwP` (`nahled_word.js`, `nwHtml`), třídy a úrovně nadpisů jsou literály; fotka a podpis jen `data:image/(png|jpeg|webp);base64` (`nwFotoPlatna`), logo `data:image/(png|jpeg)` (`nahled_word_ui.js`, `nwLogoHtml`).
- Objednávka PROJ: každé pole přes `esc` (`objednavka_proj_ui.js`, `objednavkaProjHtml`).
- Data vkládaná do `<script>` náhledu: `JSON.stringify` + náhrada `<` za `<` (`common.js:2651`).
- Odkazy: krycí list pouští jen `https?://` (`kryci_ui.js:74-77`), příloha jen bezpečné `data:` (`poznamky_ui.js:84-90`, B82), parametr `?zakazka=` jen `[A-Za-z0-9._-]{1,200}` (`online_ui.js:1680-1689`). Jiné čtení `location` do HTML nevede.
- Schvalování: kategorie jen z pevného výčtu, počty přes `Math.max(0, +x || 0)` (`schvalovani.js:286-345`); rejstřík zakázek si klient normalizuje sám (`uloziste.js:543-544`), počty počítá server (`uloziste.js:412-413`).
- Pipedrive: stav dealu jen z whitelistu (`controlling.js:1091-1099`), upozornění vazby vše přes `esc` (`pd_vazba_ui.js:75-84`), texty z CRM jdou do dialogů přes `dlgEsc`.
- CSP nemá `'unsafe-eval'` — potvrzeno během (PoC musel rozbor obsluh přesunout do Node).

**Srovnání s main:** žádný výskyt, který by byl na main navíc nebo horší; XS-1 až XS-4 jsou na obou větvích stejné. Nové části testu (náhled Wordu, Objednávka PROJ, lhůty PROJ, víc zákazníků, přítomnost online) žádný průchod nepřidaly.

## Co testy/mutace NEhlídají

- **`src/test_escape.js`** hlídá interpolace podle seznamu JMEN proměnných (`RIZIKO`) a seznamu `PROVERENO`. Číselně vypadající hodnoty (`c.zakazky`, `p.dnu`, `b.nove`, `n`) do něj nespadají — proto XS-1 a XS-2 prošly. Hodnota předaná jako argument funkci skládající HTML se kontroluje jen u `dvKrok`.
- **`overit_xss.mjs`** obarvuje jen vybraná pole zakázky. Nepokrývá: odpovědi serveru (uživatelé, rejstřík, zákazníci, schvalování, analytika), odpověď ARES, okno Objednávky PROJ, payload v kódu obsluhy `on*` (hlídá jen spuštění bez kliknutí).
- **`mutace_jadro.mjs`**: mutace na vypuštění escapování existují jen pro pár míst (`common.js` K40-X6 a P1, `escJs` SEC-N3, VZ-E1 název zákazníka). Žádná pro `nwEsc`/`nwP` v `nahled_word.js` (mutace [NP] jsou jen obsahové), pro `objednavkaProjHtml`, `lhuty_proj_ui.js`, `ares_ui.js`, `online_ui.js` (řádek uživatele a zakázky), `analytika_ui.js`.
- **`netlify/mutace.mjs` a `netlify/test_prava.mjs`** jsou serverové; že `/api/analytika` vrací v počtech jen čísla, drží `analytikaCislo`, ale žádný test neříká, že je to bezpečnostní předpoklad klienta.
- Objednávka PROJ má jeden jednotkový test escapování (`src/test_objednavka_proj.js:314`), náhled Wordu v `src/test_np_nahled_word.js` vlastní test escapování nemá (kryje ho jen `overit_xss.mjs` přes `nabidkaNahled`).
- Doporučení: `poc_XS_zakazka_taint.mjs` a `poc_XS_odpovedi_serveru.mjs` převzít jako prohlížečové sady kola — obarvují vše plošně, takže nové pole bez `esc()` chytí bez údržby seznamů. Běh zakázky trvá zhruba 3–4 min, běh serveru zhruba 2 min.

## Spuštění PoC a výsledky

```
KNG_DIST=<dist/kalkulacka.html> node podklady/audit_2026-11-20/poc_XS_zakazka_taint.mjs     → ODOLNÉ (test i main)
KNG_DIST=<dist/kalkulacka.html> node podklady/audit_2026-11-20/poc_XS_odpovedi_serveru.mjs  → texty: nic; čísla → text: ZRANITELNÉ (13 míst, jen /api/analytika) — test i main
node podklady/audit_2026-11-20/poc_XS_analytika_cisla.mjs                                   → ODOLNÉ (server vrací čísla) + výjimka u počtu-objektu
node podklady/audit_2026-11-20/poc_XS_csp_odvod.mjs                                         → okno a navigace PROŠLY, fetch/img/formulář zablokovány
```

Poznámky k běhům:
- Sestavení main jsem zkoušel proti serverovým funkcím z testu (pracovní strom); hodnotí se tím klient, ne server main.
- `poc_XS_zakazka_taint.mjs` jsem po doplnění ARES a vazby Pipedrive znovu pustil jen na testu; na main běžela předchozí verze bez těchto dvou kroků (výsledek ODOLNÉ).
- Zda se upozornění vazby z webhooku po `importZakazka` opravdu vykreslilo, jsem neověřoval; opírám se o čtení `pd_vazba_ui.js`.
- `poc_XS_analytika_cisla.mjs` je nový soubor, zatím necommitnutý; `poc_XS_odpovedi_serveru.mjs` má po posledním commitu jednu úpravu (přihlášení voláním funkce místo kliknutí).
