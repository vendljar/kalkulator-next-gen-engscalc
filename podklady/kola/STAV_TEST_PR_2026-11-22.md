# STAV – zkouška PR #707 (připomínky z aplikace, v22.11.5) na testu, 22. 11. 2026

## Hlavička

- **Test:** v22.11.5 (`origin/test` 05a496d), dávka PR = v22.11.5 (#707, mez B257).
- **Souhlas:** trvalý souhlas J. V. se zápisem na test (19. 11. 2026). Zadání od koordinace.
- **Kdo:** testovací sezení Claude v Playwrightu, dva účty: **správce** a **obchodník** (autor připomínek).
- **Zápisy:** jen `/api/pripominky` (nastavení, připomínky, stav, klíč). Zakázka TEST 9831 se jen otevírala (kontext připomínek), neukládala se.
  - Pipedrive a POST zakázek bez čísla „TEST - …“ harness blokuje (`d3_spolecne.js`). Žádný blok nebyl potřeba.
- **Harness:**
  - `podklady/kola/harness_testovani/pr.js`: celý průběh. `PR_RESUME=1` naváže na odeslané připomínky, `PR_OD=6` pustí jen odhlášení a vypnutí.
  - `pr_uklid.js`: nouzové vypnutí a zrušení klíče.
  - `pr_stav.js`: kontrola stavu jen čtením.
  - Vydaný klíč žije jen v proměnné harnessu. Do logu ani do souborů nejde.
- **Běhy:**
  - Běhy 1–6 padaly na harnessu (výběr prvku pro „místo“, druhé otevření panelu po „Děkujeme“, otevřené Nastavení). Při nich vznikly P-0001 a P-0002.
  - Běh 7 (P-0003–P-0005) prošel body PR1–PR23.
  - Běh 8: pád harnessu ve vypnutí (viz PR25). Vznikla P-0006. Hned po něm `pr_uklid.js` funkci vypnul.
  - Běh 9 (`PR_OD=6`): body PR23–PR25.
- **Limit za den (z kódu):** `limitDen` v nastavení připomínek.
  - Výchozí `PRIPOMINKA_LIMIT_DEN = 20` za den (UTC) na uživatele, správce smí 1–200.
  - Počítadlo je `pripominky_limit/den/<UTC den>/<e-mail>`. Při překročení vrací server 429 s `kod: 'limit'`.
  - Klíč koordinace: špatný klíč 10 pokusů za 15 min na adresu, pak 429. Platný klíč nejvýš 300 požadavků za hodinu.

## Výsledky

| bod | výsledek | důkaz |
|---|---|---|
| PR0 výchozí stav | ✅ OK | Běh 1: `zapnuto: false`, klíč nevydaný, limit 20, role všechny tři. Obchodník tlačítko Připomínka nevidí. 0 připomínek na testu. |
| PR1–PR2 zapnutí v Nastavení | ✅ OK | Nastavení → 💬 Připomínky: zaškrtnutí „Funkce zapnutá“ a „Uložit nastavení připomínek“ → `POST /api/pripominky 200`. Obchodník po načtení vidí plovoucí tlačítko. |
| PR3–PR5 odeslání z více záložek, s místem a snímkem | ✅ OK | P-0003 z **Kalkulace OCK**. „📍 Ukázat místo“ ukáže lištu výběru. Klik na popisek „Číslo nabídky (CN)“ prvek neaktivoval (záložka se nezměnila). V panelu je čip „📍 Kalkulace OCK › Číslo nabídky (CN)“, zdroj `popis`. P-0004 z **Krycího listu OCK** s místem (klik do karty, zdroj `obsah`). P-0005 z **Kalkulace PROJ** bez místa. Všechny mají snímek JPEG (asi 150 kB) a „Děkujeme“ s číslem. Každé odeslání `POST 200`. |
| snímek čitelný | ✅ OK | Snímky stažené správcem (`?snimek=`) mají 1280×853 px. Na obrázku je čitelná lišta aplikace, záložky, hlavička zakázky, pole a hodnoty. Snímek P-0003 je z Kalkulace OCK, P-0004 z Krycího listu OCK, P-0005 z Kalkulace PROJ. Snímky zůstaly jen v dočasné složce: nesou jména a e-maily testovacích účtů. |
| PR6 správce: lišta a záložka | ✅ OK | Tlačítko v liště „💬 Připomínky 5“ a záložka „💬 Připomínky (5)“ s počtem nepřečtených. |
| PR7 detail, místo ve snímku | ✅ OK | Klik na řádek: detail s kontextem (obrazovka, zakázka s odkazem, označené místo, verze v22.11.5, prohlížeč) a snímkem. P-0003 má rámeček místa na popisku „Číslo nabídky (CN)“ (`left 2.47 %, top 29.4 %`). Rámeček ve snímku sedí na označené pole. P-0005 je bez rámečku. Řádek se označí jako přečtený. |
| PR8 „Odložit“ bez zdůvodnění | ✅ OK | Klient hlásí „U odložení a zamítnutí napište zdůvodnění — autor ho uvidí.“ a žádný PATCH neodejde. Přímý PATCH vrátí server **400** „…zdůvodnění povinné…“. Stav zůstává „Nová“. |
| PR9 „Odpovědět a uzavřít“ | ✅ OK | S odpovědí `PATCH 200`, P-0003 → **Hotovo**. |
| PR10 další akce | ✅ OK | P-0004 „Do fronty oprav“ → fronta. P-0005 „Odložit“ se zdůvodněním → odloženo. |
| PR11 autor: odznak zmizí po otevření | ✅ OK | Na tlačítku obchodníka je odznak **3**. Klik otevře „Moje připomínky“: 3 zvýrazněné karty, odpověď správce a oranžové zdůvodnění odložení. `PATCH precteno 200`. Po zavření je odznak pryč, po F5 taky (`novych 0`). |
| PR12–PR13 co vidí autor | ✅ OK | Pohled autora nese jen `id, typ, text, kdy, zmeneno, stav, odpoved, odpovedKdy, odpovedNova, duplicitniS, prubeh`, tedy bez kontextu, snímku a roadmapy. `?snimek=` pod obchodníkem → **403**. |
| PR14–PR15 vydání klíče | ✅ OK | „Vydat klíč“ s heslem správce → `POST 200`. Klíč `kngpr_…` se ukáže jednou. Po přepnutí na jinou záložku Nastavení a zpět už ukázaný není (N2). |
| PR16 `GET ?pro=koordinace` s `Authorization: Bearer` | ✅ OK | **200**, `zdroj: test`. Vidí P-0003 (hotovo), P-0004 (fronta) a P-0005 (odloženo), nové (P-0001, P-0002) ne. Klíče záznamu: `id, typ, text, kdy, zmeneno, zdroj, stav, roadmapa, odpoved, duplicitniS, kontext, prubeh`. V `kontext` je jen obrazovka, místo, selektor a verze, bez autora, zakázky, polí a snímku. Místo jde ke koordinaci jen ze zdroje `popis` („Číslo nabídky (CN)“), u P-0004 (`obsah`) je prázdné. |
| PR17 klíč v adrese | ✅ OK | `?pro=koordinace&klic=…` → **400**. Bez hlavičky → 401. |
| PR18 PATCH koordinace | ✅ OK | P-0004 → `resi`, roadmapa `#707`, odpověď → **200**. |
| PR19 špatný klíč | ✅ OK | **401**. |
| PR20 zrušení klíče | ✅ OK | „Zrušit klíč“ (UI, heslo správce) → `POST 200`, `klic.nastaven: false`. Starý klíč → **401**. |
| PR21 opakování → 429 | ✅ OK | Po 10 neplatných pokusech za 15 min (bez hlavičky, špatný, zrušený a 7× smyšlený) je další **429**. Záznam událostí klíče: „klíč není vydaný (nad limitem)“. |
| PR22 limit za den | ✅ OK | Správce nastavil limit 1. Další připomínka obchodníka → **429** „Dnes jste odeslali už 5 připomínek (limit 1 za den)…“. Limit vrácen na 20. |
| PR23 odhlášení obchodníka → správce | ✅ OK | Obchodník má rozepsaný text, náhled snímku a otevřený panel. Po `onlineOdhlas` jsou text, snímek, panel i „Moje připomínky“ prázdné. Správce přihlášený ve stejném okně koncept v DOM nemá. |
| PR24 odhlášení správce → obchodník | ❌ nález **PR-N1** | Stav `PRIP.sp` je vynulovaný: seznam, snímky, klíč i záznam prázdné, tlačítko v liště není. Ve skrytém `#nastaveni-overlay` ale zůstalo HTML záložky Připomínky správce (157 kB): tabulka připomínek s e-maily autorů a **plný snímek** P-0003 jako `data:image` (148 kB) v `#prip-sp-telo`. Přihlášený obchodník ho má v DOM stránky. |
| PR25 VYPNUTÍ | ✅ OK | Odškrtnutí v UI a uložení, k tomu výchozí nastavení zpět přes API. `zapnuto: false` u správce i obchodníka (`smiOdesilat: false`). Obchodník po F5 tlačítko nevidí, POST připomínky → **403** `vypnuto`. |

**Uzavírá se:** dávka PR #707 na testu je kromě PR-N1 ověřená. Plní zadání J. V. 21. 11. 2026: odložení a zamítnutí jen se zdůvodněním, koordinace bez osobních údajů (B257).

## Nálezy

- **PR-N1 (střední, soukromí / B257, cenu ani dokumenty nemění):** po odhlášení správce zůstává v DOM skrytého okna Nastavení vykreslená záložka Připomínky.
  - Je v ní seznam s e-maily autorů, kontext a plný snímek obrazovky obchodníka.
  - Další uživatel přihlášený ve stejném okně prohlížeče (bez obnovení stránky) ho najde v DOM (nástroje vývojáře). Není vidět, dokud se Nastavení znovu nevykreslí.
  - `pripominkyReset` (N2 revize) maže stav `PRIP` a panel obchodníka, ale ne `#nastaveni-overlay` / `#prip-sp-telo`.
  - Doporučení: při odhlášení vyprázdnit obsah Nastavení (`#nastaveni-overlay`, nebo aspoň `#prip-sp-telo` a `.prip-snimek`) a test v `overit_pripominky.mjs`, že po odhlášení správce DOM neobsahuje `data:image` snímku.
  - Totéž platí obecně pro jiné záložky Nastavení (Uživatelé apod.), tam ale není snímek.
- **PR-N2 (nízká, vzhled):** v detailu připomínky u správce přetéká tabulka Kontext doprava za okraj karty. Týká se dlouhého řetězce prohlížeče, označeného místa ze zdroje `obsah` a odkazu „otevřít zakázku“.
  - Plovoucí tlačítko Připomínka správce navíc zakrývá pravý dolní roh snímku v detailu.
- **PR-I1 (informace):** odhlášení je na všech zařízeních. Odhlášení správce v druhém okně odhlásilo i první okno zkoušky. Je to známé chování, ne vada PR.
- **PR-I2 (informace):** označené místo ze zdroje `obsah` (klik do karty, ne na popisek) koordinace nedostane (`misto: ""`), dostane jen selektor. Je to záměr N1 revize.

## Úklid

- **Připomínky jsou VYPNUTÉ** (`zapnuto: false` u správce i obchodníka, ověřeno `pr_stav.js` jen čtením). Ostatní nastavení je výchozí (limit 20, role všechny, snímek výchozí, uchovat 365 dní).
- **Klíč koordinace je zrušen.** `klic.nastaven: false`, starý klíč dal 401 (PR20). Neplatný klíč teď dává 401.
- Na testu zůstává 6 zkušebních připomínek obchodníka. Smazat je API neumí, vyřízené zmizí po 365 dnech.
  - P-0001, P-0002: nové, z padlých běhů harnessu.
  - P-0003: hotovo.
  - P-0004: řeší se, #707 (koordinace).
  - P-0005: odloženo.
  - P-0006: nová, text „TEST PR po vypnutí“, vznikla v běhu 8, kdy vypnutí v UI selhalo.
- Záznam událostí klíče (`pripominky_limit/klic_zaznam`) nese události zkoušky.
- Zakázky, Firma, ceník, šablony ani číselníky se neměnily. Zápisy: `/api/pripominky` POST/PATCH 200, záměrné 400/401/403/429. Žádný `/api/zakazky`.
