# F1 — nestabilní výchozí stav mutací: `test_vyjimky.mjs: 1 selhalo` (B194)

Dávka F1, 19. 10. 2026 (koordinace „ŘÍDÍCÍ 19.10“). Větev `claude/f1-test-vyjimky`,
verze v19.10.10.

## Nález

19. 10. 2026 ~13:07 UTC nad integrací 4cc1b81 (v19.10.5) skončil
`node netlify/mutace.mjs b168` hláškou
„PŘERUŠENO: sady nejsou zelené ani bez mutace — test_vyjimky.mjs: 1 selhalo“.
Hned potom prošel `node netlify/test_vyjimky.mjs` 3× za sebou (72 OK / 0 FAIL)
a `b168` znovu 1/1. Výstup padlé sady se nikde neuložil (mutace.mjs ho
zahazoval), takže není známo, která kontrola spadla.

## Co se zkoušelo (vše nad 4cc1b81, kontejner se 4 jádry)

| Zkouška | Běhů | Výsledek |
|---|---|---|
| `test_vyjimky.mjs` samostatně, za sebou | 30 | 30 × 72/0 |
| totéž, 4 souběžně (`xargs -P4`) | 400 | 400 × 72/0 |
| pod zátěží: 8 souběžně na 4 jádrech, 4 kola | 32 | 32 × 72/0 |
| posunuté hodiny (`--import` náhrada `Date`, ověřeno): 12:59:59.3, 13:06:59.5, 21:59:59.3, 23:59:59.3 UTC, 31. 10. 23:59:59.3, 31. 12. 23:59:59.3, 25. 10. 00:59:59.3 (změna času) | 21 | 21 × 72/0 |
| výchozí stav všech 42 sad v pořadí `mutace.mjs` (`node netlify/mutace.mjs zzz-zadna-mutace`) | 10 | 10 × „Výchozí stav: obě sady zelené“ (63–70 s) |
| **souběžně běžící `mutace.mjs b178`** (mutuje `src/vyjimky.js`) + samostatné běhy test_vyjimky | 11 | **7 × FAIL (1–5 selhalo)**, 4 × 72/0 |

Prohlédnuté časové a sdílené závislosti (bez nálezu):

- Úložiště je v paměti procesu (`globalThis.__TEST_ULOZISTE`), každá sada má
  vlastní proces — sdílený stav úložiště mezi sadami není.
- Žádná ze sad v `SADY` nepíše do repozitáře (`writeFileSync` jen v sadách mimo
  seznam); čte se jen `verze.txt` (`serverVerze`).
- Časová okna: tolerance času rozhodnutí 10 min (B105, `schvalovaniKdyBlizko`),
  okno pokusů přihlášení 15 min, relace 12 h — v běhu dlouhém 1,5 s se
  nemohou překlopit. B192 (okno hesla správce) je jen v UI.
- Razítko uložení = ISO čas v ms; dvě uložení v téže ms dají stejné razítko,
  test ale vždy posílá aktuální razítko, takže shoda kolizi jen nezpůsobí.
- Id variant `v<Date.now base36><počítadlo>` — počítadlo v procesu je drží
  jedinečná. Dotisk se pozná podle počtu `tisky[]`, ne podle času.
- Náhodnost: jen sůl hesla a id obnovy, na výsledek testu nemá vliv.

## Přepis koordinace (13:07)

`beh.sh` pouštěl mutace postupně (`zaloh → h2 → b178 → b168`), každý další až
po skončení předchozího; mutace.mjs vrací soubor synchronně v `finally`.
Ve 12:17 koordinace zabila osiřelý běh `import('./netlify/mutace.mjs')`
(kontrola syntaxe, která mutace spustila) a ve 12:18 `pgrep` žádný další
mutační proces neukázal. **Souběh ve 13:07 se tedy z přepisu nepotvrdil
a příčina toho jednoho pádu zůstává neprokázaná.**

## Závěr a oprava (výchozí volba dávky)

- Test `test_vyjimky.mjs` se **neměnil** — vnitřní nestabilita se nenašla
  v 493 bězích.
- Jediný doložený mechanismus je souběžný mutační běh nad toutéž pracovní
  kopií. Proti němu **B194 — zámek mutačních běhů** (`nastroje/mutace_zamek.mjs`)
  v `mutace_jadro.mjs` i `netlify/mutace.mjs`: soubor `.mutace_bezi.json`
  (atomicky, s PID), druhý běh skončí kódem 2 a řekne, kdo zámek drží; zámek
  po mrtvém procesu se převezme; `--kontrola` zámek nebere. U jádra se zámek
  bere dřív, než skript uloží zálohu souborů (jinak by si zálohoval
  a na konci „vrátil" cizí mutaci).
- **Diagnostika:** padne-li výchozí stav `netlify/mutace.mjs`, vypíšou se řádky
  `FAIL`/`✗` padlé sady. Opakuje-li se pád, bude hned vidět, která kontrola.
- Test `netlify/test_mutace_zamek.mjs` (9 kontrol): bez zámku 4 FAIL,
  se zámkem 9 / 0. Ověřeno i naživo: při běžící `mutace.mjs b178` se
  `mutace.mjs b168` i `mutace_jadro.mjs h2` odmítly (kód 2), zámek po
  doběhnutí b178 zmizel.

## Doporučení

Kdyby se pád výchozího stavu opakoval bez souběhu, z nového výpisu FAIL vzít
název kontroly a zkusit ji izolovat (případně vypsat i `info` z řádku FAIL).
