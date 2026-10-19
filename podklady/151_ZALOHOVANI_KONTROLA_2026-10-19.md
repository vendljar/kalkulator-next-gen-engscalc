# #151 — Kontrola nočního zálohování v Netlify (19. 10. 2026)

Jednorázová kontrola kódu nad `origin/claude/integrace-16-10` (e3995e6).
Nic se neopravovalo; nálezy s návrhem oprav jsou v oddílu 6 (půjdou
samostatnou dávkou). Ověřeno: `spust_testy.sh --smoke` 211/0/1, mezi nimi
`test_funkce`, `test_obnova`, `test_obnova_nanecisto`, `test_prava`,
`test_uklid` zelené.

## 1. Co a kdy se zálohuje

Tři cesty, jedna knihovna (`netlify/lib/zalohovani.mjs`):

| Cesta | Kdy | Kam | Hesla |
|---|---|---|---|
| `functions/zaloha_nocni.mjs` (plánovaná, `schedule: '0 2 * * *'`) | každou noc 2:00 UTC (3:00 SEČ / 4:00 SELČ) | Netlify Blobs, úložiště `zalohy`, klíč `YYYY-MM-DD`, zdroj `nocni-otisk` | otisky hesel (scrypt) ANO |
| `POST /api/zaloha_vynuceno` (Administrátor) | ručně „Zálohovat teď" (`duvod: rucne`) a automaticky při přihlášení správce, když dnešní otisk chybí (`onlineZalohaAuto`, `duvod: auto`) | totéž úložiště a klíč, zdroj `vynuceno` | ANO |
| `GET /api/zaloha` (Administrátor) | ručně, a automaticky při přihlášení správce s připojenou složkou na Disku (`onlineZalohaDoSlozkyAuto`) | soubor JSON do složky na Disku Google (mimo Netlify) | NE (jen e-mail, jméno, role, aktivní) |
| otisk před obnovou | před každou ostrou obnovou | `zalohy`, klíč `<den>T<hhmmss>-pred-obnovou` | ANO |

Obsah otisku (`porizOtisk` + `zalohaDoplnky`, sdíleno se staženou zálohou):

| Část otisku | Úložiště / klíč | Co v tom je |
|---|---|---|
| `program` | `program/db` | platný ceník OCK, ceník PROJ, katalog, slevy, historie verzí ceníku |
| `firma` | `program/firma` | firemní údaje |
| `zobrazeni` | `program/zobrazeni` | matice zobrazení (práva) |
| `popisy` | `program/popisy` | dodatkové texty položek |
| `slovnik` | `program/slovnik` | zveřejněný slovník (#401) |
| `zakazky`, `rejstrik` | `zakazky/z/*`, `zakazky/_rejstrik` | všechny zakázky vč. variant, zámků a příloh; rejstřík |
| `uzivatele` | `uzivatele/*` | celé účty vč. otisků hesel a `hesloVerze` |
| `sablony` | `sablony/*` (vč. `rejstrik`) | centrální šablony dokumentů, všechny verze souborů |
| `zakaznici` | `zakaznici/*` | kartotéka zákazníků (#162) |
| `podpisy` | `podpisy/*` | skeny podpisů obchodníků (#145) |
| `smazani` | `smazani/*` | kniha smazaných účtů (B58) |

Po otisku noční funkce pustí `nocniUklid()` (pd_cache starší 30 dní,
očista analytiky B175); jeho chyba zálohu neohrozí.

**Generace:** jedna za den (klíč = datum UTC), **nemaže se nic** — klíčů
přibývá ~365 za rok. Přehled v aplikaci (`GET /api/zaloha_vynuceno`)
ukazuje posledních 14 denních + 10 otisků před obnovou; starší v Blobs
leží dál a obnovit se z nich dá zadáním klíče.

## 2. Obnova a kdo smí obnovit

`POST /api/obnova` (`functions/obnova.mjs`), obrazovka Nastavení → Databáze.

- **Role:** jen Administrátor (kterýkoli, ne jen hlavní účet).
- **Pojistky:** povinný náhled (nic nezapíše), ostrá obnova jen s
  `potvrzeni: 'OBNOVIT'`; před zápisem otisk současného stavu (nepovede-li
  se, obnova neproběhne); uzamčené (odeslané) nabídky se nepřepíšou;
  obnova nikdy nemaže; poškozený/cizí soubor se odmítne; zámek proti
  souběžné obnově (409); režim `doplnit` / `prepsat`; výběr částí.
- **Heslo správce** (`potvrdHesloSpravce`, s limitem pokusů):
  - účty z otisku (B77) — přepisují otisky hesel;
  - matice zobrazení z otisku i ze souboru (B188).
  - Ceník, firma, zakázky, šablony, zákazníci, podpisy: bez hesla (stačí
    role + `OBNOVIT`).
- **Účty a podpisy jen ze serverového otisku** (B27); ze staženého souboru
  se přeskočí. Hlavní účet (`ADMIN_EMAIL`) a jeho podpis smí obnovit jen
  on sám. Smazané účty se neoživí (B30), `hesloVerze` neklesne (B31),
  obnova měnící heslo zvedne verzi a odhlásí dotčené (B93).
- **Po úplné havárii** (prázdné Blobs): správce se přihlásí náhradním
  heslem `ADMIN_INIT_HESLO` z prostředí Netlify; je-li otisk, obnoví vše
  vč. účtů s původními hesly (scénář A v `test_obnova_nanecisto.mjs`);
  jsou-li pryč i otisky, obnoví se ze souboru z Disku vše kromě účtů a
  podpisů — účty se zakládají znovu (scénář B).

## 3. Co se NEzálohuje (mezery)

| Co | Kde | Dopad | Hodnocení |
|---|---|---|---|
| **Samotné otisky mimo Netlify** | `zalohy/*` | otisky leží ve stejném Blobs jako ostrá data. Smazání webu/úložiště v Netlify nebo chyba účtu vezme data i zálohy najednou. Mimo Netlify je jen soubor na Disku — a ten vzniká **jen při přihlášení správce s připojenou složkou** a nenese hesla ani podpisy k obnově. | **hlavní mezera** |
| proměnné prostředí | Netlify → Environment variables | `TAJEMSTVI_RELACE`, `ADMIN_INIT_HESLO`, `ADMIN_EMAIL`, token Pipedrive aj. nejsou v žádné záloze | J. V. je má mít mimo Netlify (správce hesel) |
| historie popisů | `program/popisy_historie` | posledních 30 verzí dodatkových textů; po obnově zmizí historie, platné popisy zůstanou | nízké |
| analytika | `analytika/*` (`rezim`, `den/…`) | statistiky použití; po havárii začnou od nuly | nízké, vědomé |
| mapa polí Pipedrive | `pipedrive/pole` | cache, znovu se načte z Pipedrive | žádné |
| cache Pipedrive | `pd_cache/*` | cache (osobní data, maže se po 30 dnech) | správně se nezálohuje |
| počítadla pokusů přihlášení | `pokusy/*` | krátkodobá | správně se nezálohuje |
| token rozpracované obnovy | `zalohy/obnova-<id>` | žije hodinu | správně |

Chybí test, který by hlídal úplnost: nové úložiště nebo klíč, který
nikdo nepřidá do `porizOtisk`/`zalohaDoplnky`, obnova tiše smaže (stalo se
3× — B9, B104, slovník #401). Viz návrh N4.

## 4. Co se stane při selhání noční úlohy

- `zaloha_nocni.mjs` nemá kolem `porizOtisk` ošetření chyby: výjimka
  skončí jako chyba funkce v **logu funkce v Netlify**. Netlify ve výchozím
  stavu **nikoho neupozorní** (žádný e-mail, žádné opakování); další pokus
  je až příští noc.
- V aplikaci hlídá výpadek **hlídka noční zálohy** (#152,
  `uloZalohaHlidka` v `src/uloziste.js`): po přihlášení správce a v
  Nastavení → Databáze varuje, když poslední otisk se zdrojem
  `nocni-otisk` je starší než **48 hodin** nebo mezi posledními 14 žádný
  není. Upozornění tedy přijde nejdřív po dvou zmeškaných nocích a jen
  tomu, kdo se jako správce přihlásí.
- Mezitím data chrání automatický otisk při přihlášení správce (pokud
  dnešní chybí) — ten ale výpadek noční funkce zakrývá, proto hlídka
  kouká jen na noční zdroj.
- Plánované funkce běží **jen na produkčním (publikovaném) nasazení**,
  ne na náhledech nasazení ani větvových nasazeních. Každý web (schaftscalc,
  engscalc) má vlastní Blobs a vlastní noční běh.

## 5. Jak J. V. ověří v Netlify, že úloha běží

1. **Netlify → web (schaftscalc) → Logs → Functions** (u starších
   rozhraní záložka *Functions*). V seznamu najít `zaloha_nocni` — musí
   mít štítek **Scheduled** a údaj o příštím spuštění (*Next execution*,
   denně 02:00 UTC). Chybí-li štítek, plánování se nenasadilo.
2. Otevřít `zaloha_nocni` → **log**: hledat běh kolem 2:00 UTC
   (3:00/4:00 našeho času) za poslední dny. Úspěch = bez chybového
   řádku, s délkou běhu; zapsat si **délku běhu** (limit plánované funkce
   je 30 s — viz N2). Chyba = řádek s `Error`/stack trace.
3. **Netlify → web → Blobs** (v novém rozhraní *Storage → Blobs*):
   úložiště `zalohy` musí mít klíč s dnešním (resp. včerejším) datem a
   řadu klíčů po dnech bez děr.
4. V aplikaci jako správce: **Nastavení → Databáze → přehled záloh** —
   poslední řádky mají zdroj „nocni-otisk" a čas kolem 2:00 UTC;
   hlídka nehlásí varování. Řádky „vynuceno" jsou ruční/při přihlášení.
5. **Deploys → poslední produkční nasazení → Functions**: ověřit, že
   `zaloha_nocni` je mezi nasazenými funkcemi (a že produkce není
   zamčená na starém nasazení — plánuje se z publikovaného).
6. Volitelně **Project configuration → Notifications**: zapnout e-mail
   při selhání nasazení; pro selhání funkce Netlify notifikaci nemá,
   proto zůstává hlídka v aplikaci (a návrh N1).

## 6. Nálezy s návrhem oprav (NEopraveno)

**N1 — Ruční „Zálohovat teď" přepíše dnešní noční otisk (střední).**
`porizOtisk('vynuceno', …)` míří bez `klic` pod dnešní datum, tedy přes
noční otisk z 2:00. Pokazí-li se data dopoledne a správce pak zmáčkne
„Zálohovat teď", přepíše poslední dobrý stav (zbude jen včerejší noc).
Navíc hlídka (#152) pak ten den noční otisk nevidí; kdo zálohuje ručně
každý den, dostane po 48 h falešné varování. *Návrh:* ruční otisk do
vlastního slotu `<den>T<hhmmss>-rucne` (jako `klicPredObnovou`, rozšířit
`OTISK_KLIC` a limit v přehledu), nebo nepřepisovat klíč, jehož
`zdroj === 'nocni-otisk'`. Test: noční → ruční → noční otisk dne zůstal.

**N2 — Noční funkce může narazit na 30s limit plánované funkce
(střední, roste s daty).** `porizOtisk` čte každý záznam zvlášť a
postupně (zakázky, šablony, zákazníci, podpisy, účty…); stovky čtení po
desítkách ms se blíží 30 s. Po překročení funkce skončí bez zápisu a
zjistí se to až hlídkou po 48 h. *Návrh:* číst po dávkách paralelně
(`Promise.all` po ~20), v odpovědi a logu vypisovat `trvaniMs`; J. V.
mezitím zkontroluje délku běhu v logu (krok 2).

**N3 — Přehled záloh načítá celé otisky jen kvůli počtům (nízká–střední).**
`seznamOtisku` čte až 24 celých otisků (stažená záloha ze schaftscalc
měla 19 MB) jen pro `pocetZakazek`/`pocetUctu`. Pomalé načtení
Nastavení → Databáze a riziko limitu běžné funkce. *Návrh:* při zápisu
uložit souhrn (Blobs metadata nebo klíč `souhrn/<den>`) a přehled číst
z něj; starší otisky bez souhrnu dočíst jako dosud.

**N4 — Chybí test úplnosti zálohy (nízká, prevence).** *Návrh:* test,
který projde všechna úložiště/klíče, které funkce zapisují (náhradní
úložiště v paměti zaznamená `zapis`), a ověří, že každé je buď v otisku,
nebo na výslovném seznamu výjimek (`analytika`, `pd_cache`, `pokusy`,
`pipedrive`, `popisy_historie`, `zalohy`). Zachytil by B9/B104/#401.

**N5 — Neplatný komentář o velikosti (kosmetika).** `zaloha_nocni.mjs`
tvrdí „každý pár set kB", ale otisk nese i šablony, podpisy a přílohy
(obnova počítá s ~20 MB). Při ~20 MB × 365 ≈ 7 GB za rok v Blobs.
*Návrh:* opravit komentář; J. V. rozhodne o retenci (např. denní 60 dní,
pak 1. den v měsíci natrvalo) — mazání jen vědomou dávkou.

**N6 — Žádná kopie otisků mimo Netlify (rozhodnutí J. V.).** Viz oddíl 3.
*Návrh k rozhodnutí:* (a) pravidelně (týdně) stáhnout zálohu na Disk ručně
— dnes bez hesel, po havárii celého webu se účty zakládají znovu; nebo
(b) samostatná dávka: týdenní šifrovaná kopie otisku mimo Netlify.

## 7. Test obnovy bez zásahu do produkce

1. **Automaticky (hotové):** `bash spust_testy.sh` → sada
   `netlify/test_obnova_nanecisto.mjs` simuluje havárii nad úložištěm v
   paměti: A) prázdná databáze, obnova z nočního otisku (zakázky, ceník,
   firma, zámek odeslané nabídky, původní hesla); B) prázdné i zálohy,
   obnova ze staženého souboru (účty se neobnoví). `test_obnova.mjs` kryje
   pojistky. Obojí dnes zelené.
2. **Náhled na produkci (nic nezapíše):** Nastavení → Databáze → obnova
   z otisku včerejšího dne → **Náhled**. Výsledek má hlásit u všech
   částí „bez změny" nebo malé rozdíly odpovídající dnešní práci; prázdná
   nebo chybějící část = problém zálohy. Náhled nic nezapisuje, nechce
   heslo ani potvrzení.
3. **Ostrá zkouška na testovacím webu** (vlastní Blobs, např. engscalc,
   není-li to produkce): stáhnout zálohu → pořídit „Zálohovat teď" →
   smazat/změnit jednu zkušební zakázku → obnovit z otisku v režimu
   `doplnit` → zakázka je zpět; ověřit, že vznikl otisk `…-pred-obnovou`.
4. **Kontrola souboru z Disku:** otevřít poslední `zaloha_*.json`, ověřit
   `porizena`, `zdroj` a že nese části `program`, `zakazky`, `sablony`,
   `zakaznici`, `zobrazeni` (vložit ho do obnovy jako soubor → Náhled).
5. Výsledek zapsat do testovacího protokolu (datum, web, klíč otisku,
   výsledek náhledu).

## 8. Doporučení (pořadí)

1. J. V. projde kroky oddílu 5 (10 min) a pošle délku nočního běhu.
2. Samostatná dávka: N1 + N2 (+ test N4) — malé změny v
   `lib/zalohovani.mjs` a `src/ui/online_ui.js`.
3. Rozhodnutí J. V.: retence (N5) a kopie mimo Netlify (N6).
4. Zkouška obnovy dle oddílu 7 jednou za čtvrtletí.

## 9. Doplněk 19. 10. 2026 — opravy N1–N6 (dávka O4, v19.10.5)

N1–N4 opraveny podle oddílu 6. N5 a N6 rozhodl J. V. 19. 10. (~11:45 a
~11:50 UTC, přes koordinaci) a jsou hotové v téže verzi:

- **N5 retence (Netlify Blobs `zalohy`):** noční otisky posledních 30 dní
  (věk 0–29 dní) + první noční otisk každého měsíce 12 měsíců zpět (měsíc
  dneška + 12 předchozích); ruční a přihlašovací otisky (`…-rucne`,
  `…-auto`) 90 dní; otisky před obnovou se nemažou. Maže noční funkce až po
  úspěšném zápisu dnešního otisku, nikdy poslední otisk; v logu funkce řádek
  `zaloha_nocni: retence smazala N otisků: …`.
- **N6 kopie na Disk Google:** složka `_Zaloha Netlify DB` (vedle `_DB`),
  soubor `otisk_RRRR-MM-DD.json` (poslední noční otisk, BEZ otisků hesel
  a podpisů) + `posledni_kopie.json` (datum, velikost, SHA-256). Na Disku se
  nic nemaže.

### Postup prvního běhu kopie na Disk (J. V., po nasazení v19.10.5)

1. Na počítači s **Diskem Google pro počítače** otevřít aplikaci v **Chrome
   nebo Edge** (jiné prohlížeče zápis do složky neumí) a přihlásit se jako
   **Administrátor**.
2. Karta **Online databáze** (Nastavení → Databáze) → tlačítko
   **„Zkopírovat zálohu na Disk teď“**.
3. Prohlížeč otevře výběr složky: vybrat na Disku Google složku
   **`_Zaloha Netlify DB`** (ve stejné nadřazené složce jako `_DB`) →
   **Vybrat složku** → na dotaz o úpravách souborů **Povolit** (u Chrome
   nabídne-li „Povolit při každé návštěvě“, zvolit to — pak týdenní kopie
   poběží po přihlášení sama).
4. Aplikace ohlásí `Záloha zkopírována na Disk: _Zaloha Netlify DB/otisk_RRRR-MM-DD.json (velikost, noční otisk RRRR-MM-DD)`.
   Hlásí-li „aktuální stav — noční otisk za posledních 7 dní chybí“, noční
   funkce neběží (oddíl 5); hlásí-li, že se složka jmenuje jinak, byla
   vybrána jiná složka — kopie proběhla tam.
5. Kontrola na Disku: ve složce leží `otisk_RRRR-MM-DD.json` (u schaftscalc
   řádově jednotky až desítky MB) a `posledni_kopie.json`; v kartě se řádek
   „Poslední kopie záloh na Disku Google: …“ ukáže bez varování.
6. Dál: kopie se pořídí sama při přihlášení správce, je-li poslední starší
   než 7 dní (jen v prohlížeči s vybranou složkou a povoleným zápisem). Je-li
   starší než 14 dní, karta i hláška po přihlášení varuje — pak zopakovat
   krok 2 (složka se pamatuje, výběr se neopakuje; prohlížeč se jen může
   znovu zeptat na povolení).
