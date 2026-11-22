# Předávka dávky PR — Připomínky z aplikace (21. 11. 2026)

Větev `claude/pr-pripominky` nad integrací `cda289e`. Pracovní čísla roadmapy #692 (úkol, hotovo),
#693 (nález PR-N1), #694 (otázka e-mail), #695 (otázka záloha) — přečísluje koordinace. Verze v22.11.1
(přečísluje koordinace). Revizi rozdílu před sloučením dělá poradce.

## Co je hotové

- **Obchodník** (`src/ui/pripominky_ui.js`): plovoucí tlačítko vpravo dole (#0B2E6B, červené číslo nových
  odpovědí), panel zprava 430 px se záložkami Nová / Moje připomínky; typ 2×2 (placeholder podle typu),
  text, 📍 místo (lišta, oranžový přerušovaný rámeček, mousedown/pointerdown/click zachycené → prvek se
  neaktivuje, čip „📍 Sekce › Popisek“ s ×), šedý blok „Přiložíme automaticky“ (miniatura, obrazovka,
  zakázka + varianta, verze, zaškrtávátko snímku), Odeslat neaktivní bez typu a věty, děkovná obrazovka
  s P-XXXX a „Co bude dál“. Moje připomínky: štítek stavu, typ, datum, text, průběh 4 kroky, odpověď
  (oranžově u odložení/zamítnutí), nové zvýrazněné a po otevření přečtené. Panel žije mimo překreslovaný
  strom (render() rozepsaný text nesmaže).
- **Snímek obrazovky — rozhodnutí:** serializace viditelné části DOM do SVG `<foreignObject>` → `<canvas>`
  → JPEG (≤ 1280 px, ≤ 700 kB). Bez knihoven (CSP `script-src 'self'`). V Chromiu ověřeno (plátno se
  nezašpiní). Neplatná jména atributů se z klonu odfiltrují (nález #693 rozbíjel XML). Hesla se nevkládají.
  Selhání nebo > 4 s = odeslat bez snímku; strukturovaný kontext jde vždy.
- **Správce**: Nastavení → „💬 Připomínky (N)“ hned za Uživateli (jen admin, natvrdo jako Analytika),
  tlačítko „💬 Připomínky N“ v liště; čipy filtrů s počty, zdroj, hledání, tabulka (nepřečtené tučně),
  detail (hlavička, text, kontext s „otevřít zakázku“, snímek s vyznačeným místem, průběh, akce
  Do fronty / Odpovědět a uzavřít / Odložit / Zamítnout / Duplicitní s…), Nastavení připomínek (vypínač,
  role, snímek, e-mail, zdroj fronty, interval koordinace jako informace, limit/den, uchovávání, klíč).
- **Server** `netlify/functions/pripominky.mjs` + `src/pripominky.js` (přes `lib/pripominky_modul.cjs`).
  Záloha: `pripominky` v otisku, ruční záloze, kopii na Disk a obnově (s očistou); `pripominky_snimky`,
  `pripominky_limit` a `program/pripominky_klic` mimo zálohu (N4 výjimky).
- **Dokumentace**: B231 v `BEZPECNOST_MEZE.md`, příručka obchodníka kap. 34, správce A16 (+ snímky
  v generátorech), provozní příloha (API, úložiště).

## Bezpečnostní rozhodnutí (pro poradce)

1. Klíč koordinace: vydání jen správce + vlastní heslo (B77); `kngpr_` + 256 b náhody, vrácen jednou,
   uložen jen SHA-256 (porovnání `tajneShodne`). Platí jen pro `GET ?pro=koordinace` a `PATCH` stavu;
   v adrese 400, spolu s cookie 400, jinde neplatí. Jen připomínky ≠ `nova`; bez autora, zakázky, polí,
   snímku. Mění jen stav / odpověď / roadmapu. Špatný klíč 10 za 15 min/adresu → 429, správný 300/h → 429;
   záznam bez obsahu v `pripominky_limit/klic_zaznam`, správce ho vidí.
2. Autor/čas/stav/číslo píše server. Autor vidí jen svoje a bez kontextu; snímek jen správce.
3. Snímek jen `data:image/jpeg|png;base64` (žádné SVG/odkaz), tělo ≤ 800 kB (413), text 10–4000.
4. Limit 20/den/účet (nastavitelný 1–200). Funkce výchozí VYPNUTÁ.
5. Odložení/zamítnutí bez zdůvodnění 400 (správce i koordinace).
6. Meze: počítadla řazená jen v jedné instanci (jako B158); text píše obchodník volně → koordinace ho
   nesmí kopírovat doslova do repa ani kokpitu.

## Výsledky

- `src/test_pripominky.js` 66/0, `netlify/test_pripominky.mjs` 74/0, `test_prava` 1039/0 (+8 řádků, PATCH),
  `test_obnova` 241/0 (+3), `test_zalohy` 165/0, `overit_pripominky.mjs` 47/0, mutace `[PR]` viz zpráva.
- Pojistky: před změnou modul/funkce neexistovaly (sady padají na importu), harness padá na 1).

## Co má ověřit testovací sezení (testengscalc)

1. Zapnout funkci (Nastavení → Připomínky → Funkce zapnutá), obchodníkem odeslat připomínku s místem
   a snímkem na několika záložkách (Kalkulace OCK, Technická specifikace, Nastavení) — snímek čitelný?
2. Správcem: detail, vyznačené místo ve snímku, Odložit bez zdůvodnění (odmítne), Odpovědět a uzavřít.
3. Obchodníkem: číslo na tlačítku, odpověď, po otevření zmizí.
4. Vydat klíč, z příkazové řádky `GET /api/pripominky?pro=koordinace` s `Authorization: Bearer` (bez cookie),
   PATCH stavu; špatný klíč → 401 a po 10 pokusech 429; zrušit klíč.
5. Limit za den (nastavit 1, poslat dvě) a zobrazení na mobilu / úzkém okně.

## Čeká na J. V.

- #694 e-mail správci (aplikace e-maily neumí — dop. až s dalším e-mailovým požadavkem).
- #695 (1) snímky mimo zálohu, (2) klíč mimo zálohu, (3) uchovávání 365 dní — dop. vše ponechat.
