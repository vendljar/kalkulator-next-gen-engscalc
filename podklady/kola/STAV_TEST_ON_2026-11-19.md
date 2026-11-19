# STAV – zkouška ON (kdo je online, roadmapa #679) na testu, 19. 11. 2026

## Hlavička

- **Test:** v19.11.9 (`origin/test` 0925de8).
- **Souhlas:** trvalý souhlas J. V. s testem, potvrzený v sezení. Zadání od koordinace.
- **Kdo:** dvě relace v Playwrightu: správce `KNG_TEST_*` a obchodník `KNG_TEST_OBCHODNIK_*`.
  Účet vedoucího nemám, proto vedoucí není ověřen na webu. Pokrývá ho `netlify/test_prava.mjs` blok #ON.
- **Zápisy:** jen přihlášení a odhlášení (zápis aktivity dělá server). Úložiště se nečetlo ani neměnilo.
- **Harness:** `podklady/kola/harness_testovani/on.js`. Výsledek **10 OK, 0 FAIL**. E-maily ani jména se nevypisují.
  Snímky obrazovky obsahují údaje uživatelů, proto nejsou v repu.

## Výsledky

| bod | výsledek | poznámka |
|---|---|---|
| 1 sloupec a online | ✅ | Nastavení → Uživatelé má sloupec „Naposledy aktivní“. U přihlášeného obchodníka je zelená tečka (rgb 26, 127, 55), „právě teď“ a „online“. V `title` je „Naposledy aktivní 19. 11. 2026 17:20:09“. |
| 1 obnovení | ✅ | Přepnutí na záložku Uživatelé (z jiné záložky) pošle `GET /api/uzivatele` (0 → 1). |
| 2 obchodník | ✅ | `GET /api/uzivatele` vrací **403** „K této akci je potřeba role: Administrátor.“ bez údajů. `/api/ja` nese jen ok, email, role, jmeno, titul, funkce, telefon, hlavni, podpis: o aktivitě nic. Ani `/api/ja` správce údaj nenese. **Vedoucí:** na webu neověřen (není účet). |
| 3 odhlášení | ✅ | Obchodník se odhlásil (`POST /api/odhlaseni`). U správce pak v řádku není tečka ani „online“, zůstane „právě teď“. `title` ukazuje „… · odhlášen(a) 19. 11. 2026 17:20:24“. API vrací `online: false` a zapsané `odhlaseni`. |
| 4 IP a prohlížeč | ✅ | Klíče účtu v `GET /api/uzivatele` (správce): email, jmeno, titul, funkce, telefon, role, aktivni, hlavni, archiv, archivKdy, posledniAktivita, odhlaseni, online. **IP ani prohlížeč v odpovědi nejsou.** Úložiště jsem nečetl. |

## Nálezy

Žádné. Vedoucí na webu neověřen (chybí testovací účet).
