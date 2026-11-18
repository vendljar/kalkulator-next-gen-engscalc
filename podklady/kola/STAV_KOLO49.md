# STAV kola 49 — test × main (18. 11. 2026, rozpracováno)

Testovací sezení, větev `claude/testovani` nad `origin/test` 41bbe99. Bez cen, bez osobních údajů.
Ostrý web jen čtení. Přístup potvrdil J. V. v chatu 18. 11.

## Verze

| prostředí | web (`/api/zdravi`) | větev |
|---|---|---|
| test (testengscalc) | v18.11.6 (ve 12:47 ještě v18.11.5) | `origin/test` 41bbe99 |
| ostrý (engscalc) | v11.11.1 | `origin/main` 6c4bc80 |

## Rozsah a výsledky

| # | bod | výsledek |
|---|---|---|
| 0 | přihlášení test (administrátor) | ✅ Přehled se načetl, 481 řádků = rejstřík |
| 0 | přihlášení main (`KNG_MAIN_*`) | ❌ → ✅ Napoprvé „Nesprávný e-mail nebo heslo.“ (2 pokusy, pak stop). J. V. přístup opravil, další pokus prošel. Na main jen GET a `/api/prihlaseni`, ostatní požadavky skript zablokoval. |
| #618 | TEST sada na testu | ✅ 315 zakázek „TEST -“, všechny s jiným číslem (víc než 216) → **neobnovovat**. **J. V. 18. 11.: 315 je správný stav, nový základ místo 216.** Poslední úprava podle dnů: 1. 10. 95, 19. 10. 138, 20. 10. 55, 27. 10. 23, 4. 11. 2, 18. 11. 2. Akcí „TEST VZ“ jsou 2. |
| #611 | `porovnej_sestaveni.sh origin/main origin/test` | ✅ s `--ocekavane podklady/porovnani/ocekavane_main_test_2026-11-18.txt`: **JEN OČEKÁVANÉ ROZDÍLY**. 353 kalkulací: 7 shodných, 346 rozdílných, všechny jen `nahled-en` (C1 #582). Cena, řádky, symboly, Word ani SoD se neliší. Bez seznamu očekávaných rozdílů 346 neočekávaných (kód 1). |
| #614 | K40-N1 (přepnutí typu šachty / zasklení s čelním sklem) | ✅ liší se, jak má: `src/test_k40_celni_sklo.js` nad test **75 OK / 0 FAIL**, nad main (worktree 6c4bc80) **47 OK / 28 FAIL**. Ve všech případech zůstane v main čelní sklo vyřazené pod novým názvem a nezapočítá se do ceny. Jinde se nic neliší (viz #611: cena a řádky shodné ve všech 353 případech). Pozn.: pevná sada porovnání přepnutí typu šachty neobsahuje, proto K40-N1 neukáže. |
| #632 (B6) | ceník a termíny firmy test × main | ⚠ **skoro srovnané**. Porovnávaly se jen otisky sha256 po větvích, žádné hodnoty. Ceník main v37 (platí od 2. 11.) × test v11 (platí od 16. 11.): `cenikProj`, `zahranicni`, `katalog` a `slevy` **shodné**. V `cenik` je na testu navíc 10 klíčů `mustek*` s hodnotou 0 (sazby skladebných můstků #625 nevyplněné, main klíče nemá) a popis položky „Sklo VSG s mléčnou fólií“; jinak shoda. Firemní údaje: liší se jen termíny realizace `kapTerminy` / `kapTerminyEn` / `kapTerminyDe`. Prvních 5 řádků je shodných, **test má navíc 6. řádek** ve všech třech jazycích (FR v obou chybí). Ostatní pole firmy shodná. → K49-I5 |
| #615 (K48-N1) | šablony SoD v5 DE/EN/FR v testu | ✅ šablony: platné na testu `sod` v4 = soubor `…_v5`, `sod_en`/`sod_de`/`sod_fr` v2 = `…_v5_EN/DE/FR`. Ve 147 odstavcích jsou v DE/EN/FR jen 4 s českými znaky, a to české zkratky „(IČ)“ a „(DIČ)“ za cizím názvem; jinak je český jen symbol. Česká v5: 117/147. ✅ **Vygenerovaná smlouva** z aplikace na testu: 3 TEST zakázky (9603-K19T-C103, 9578-K19T-C078, 8727-K36-D39b) × CZ/EN/DE/FR. Šablona se vybrala stejnou funkcí jako v UI (`sablonaProTisk`), dokument vyrobila `dokumentVygeneruj`, bez zámku a bez uložení; zapisující požadavky byly blokované, žádný nepadl. EN/DE/FR vyšly z jazykových šablon `sod_en/de/fr` v2 (`mutaceChybi` ne). V 9 ze 143–148 odstavců zůstala čeština jen u jmen, názvu zákazníka („TESTOVACÍ ODBĚRATEL“), adresy a (IČ)/(DIČ). Záhlaví a zápatí jsou bez češtiny. 29 míst s tečkami „……“ je ve všech jazycích stejně, symbol `{{…}}` žádný. **K48-N1 na testu splněno.** |
| — | `overit_sod.mjs` — proč padá | rozbor níž |

Dále platné šablony na testu: CN `nabidka` v7 = `…_CN_v17`, `sodProj` v3 = `…_PROJEKCE_v4`. **Plná moc (`plnaMoc`) na testu
zveřejněná není** (rejstřík prázdný).

## `overit_sod.mjs` — rozbor

Spuštěno nad sestavením 41bbe99 s `KNG_PODKLADY` = platné šablony stažené z testu do scratchpadu (mimo repo). Plná moc na testu
není, proto byla dosazena zástupná šablona se symboly `PM_ZMOCNITEL*`. Výsledek: **5 z 51 selhalo**. Jsou to tytéž
body, které hlásila větev SL na 9bd6dc8 a ec5bbac:

1. K18-N100 splátky 50/40/10 % a zmizelá věta o opláštění,
2. stavební připravenost „v1 má datum podkladů dodavatele výtahu dál pevné“,
3. „v1 beze změny: věta o prodlení zhotovitele (0,05 %)“,
4. symboly `SODP_*` zůstaly viditelné,
5. symboly `PM_*` zůstaly viditelné.

**Příčina: harness je zastaralý, nejde o vadu aplikace.**
- Body 1–3 jsou očekávání psaná na **šablonu v1** (1. 10. 2026). `najdiSablonu` (K40-T1) ale bere šablonu s nejvyšším
  číslem, dnes realizaci v5 a projekci v4. Ta znění mají jiné věty o splátkách, připravenosti a prodlení.
- Body 4–5: od C3 #584 (11. 11.) dostane nevyplněný symbol ve Wordu tečky „……“ (`sodNevyplnene`, `docxgen` `nevyplnene`).
  Symboly `{{SODP_*}}`/`{{PM_*}}` tedy v hotovém dokumentu viditelné být nemají.

Návrh (k rozhodnutí koordinace, je to oprava testu): očekávání 1–3 vázat na verzi šablony, nebo je pouštět jen nad v1 z `vyrob_sablony.js`.
Body 4–5 přepsat na „místo symbolu jsou tečky ……“. Dřív se sada kvůli chybějícím podkladům nepouštěla, proto zastaralost nebyla vidět.

## Nálezy

| ID | co | závažnost |
|---|---|---|
| K49-I1 | Přihlášení `KNG_MAIN_*` na ostrý web selhalo („Nesprávný e-mail nebo heslo.“) | vyřešeno (J. V. opravil 18. 11.) |
| K49-I2 | `overit_sod.mjs` 5/51: zastaralá očekávání (v1 šablona, před C3) — vada testu, ne aplikace | nízká |
| K49-I3 | Na testu není zveřejněná šablona plné moci; harness bez ní sadu přeskočí | informace |
| K49-I5 | Termíny realizace firmy: test má proti main 6. řádek navíc (CZ/EN/DE). Buď ho J. V. doplní do main při sloučení, nebo ho na testu smaže | k rozhodnutí J. V. |
| K49-I4 | Pevná sada `porovnani_sada.js` nemá případ přepnutí typu šachty nebo zasklení (K40-N1 nevidí) | návrh doplnit |

## Zbývá (po opravě přístupu na main)

- Porovnat výpočty test × main nad stejnými zakázkami v UI (jen čtení na main).
- #615 v main: jen pro informaci. Na main jsou šablony starší (B5 #619), J. V. je zveřejní při sloučení.
