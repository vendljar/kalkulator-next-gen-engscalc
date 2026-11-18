# Prompt VZ-E0 — vypínač, jádro a serverová kontrola tvaru

Společná pravidla: `PROMPT_VZ_SPOLECNE.md`. Návrh § 1, § 2, § 2a, § 3, § 8. Větev `claude/vz-e0` nad `8462aea`.
Odhad: 1 sezení. **Po dokončení revize poradce** (datový model).

## Cíl

Datový model a čistá logika víc zákazníků bez jakékoli změny obrazovky a dokumentů. Po etapě umí jádro zakázku
s víc zákazníky načíst, zkontrolovat, uložit a vrátit pohled zákazníka; nikde se to ještě nepoužívá.

## Krok 0

Přečti `src/vice_sachet.js` (vzor „první na původním místě, ostatní v `dalsi`“), `src/zakazka.js` (`novaZakazka`,
`importZakazka`, `nastavRidici`, `ridiciVarianta`, `cisloSVariantou`, `icoPlatne`), `src/zamek.js` (`variantaCislo`,
`variantaPriponaVZakazce`, `dalsiPriponaVarianty`, `klonujVariantu`), `netlify/lib/funkce.mjs`,
`netlify/lib/zakazka_kontrola.mjs`, `netlify/lib/jadro_moduly.cjs`, `build.py` (seznam CORE).

## Co udělat

1. **Vypínač** `viceZakazniku` do `FUNKCE_ZNAME`; Nastavení → Zkušební funkce ukáže druhý vypínač; klient
   `viceZakaznikuZapnuto()` (vzor `viceSachetZapnuto`).
2. **`src/vice_zakazniku.js`** (čistá logika, do CORE i `jadro_moduly.cjs`):
   - tvar: `zak.vzRidici = { id, pismeno: '', varianta }`, `zak.dalsiZakaznici = [{ id, pismeno, hlavicka: { objednatel,
     adresaObjednatele, ico, dic, kontakt }, zastupci, varianta, zalozen: { kdo, kdy } }]`; `platna` se neukládá
     z klienta (E3 ji počítá ze zámků);
   - `vzRezim(zak)` (má 2+ zákazníků), `vzZakaznici(zak)` (řídící z hlavičky + další), `vzZakaznik(zak, id)`;
   - `vzPridej(zak, udaje, { vlastni })` — první volání založí `vzRidici` (id, varianta = řídící varianta);
     `vlastni` = `klonujVariantu` + ukazatel; `vzOdstran(zak, id, { smazatVariantu })` — po posledním smaže
     `vzRidici` i `dalsiZakaznici`; řídícího odmítne;
   - `vzPismenoDalsi(zak)` — první volné písmeno za nejvyšším v `dalsiZakaznici` **a v razítkách zámků**
     (`zamek.tisky[].zakaznik.pismeno`; razítka plní až E3 — funkce je má číst už teď); strop Z;
   - `vzVymenRidiciho(zak, id)` — výměna hlavička ↔ položka, `nastavRidici` na jeho variantu, písmena beze změny,
     smazání otisků webhooku pro pole firmy (`pdZadani.otisk`: objednatel, adresaObjednatele, ico, dic);
   - `vzSrovnej(zak)` — invariant „řídící varianta = varianta řídícího zákazníka“ (opraví, vrátí co změnil);
   - `vzPohled(zak, id)` — kopie zakázky s hlavičkou a zástupci zvoleného zákazníka, **bez** `dalsiZakaznici`
     a `vzRidici`, s `vzPohledZakaznika = { id, pismeno }` (jediný údaj navíc; čísla s písmenem řeší E2);
   - `vzTvarProblemy(zak)` — seznam vad tvaru (duplicitní id / písmeno, ukazatel na neexistující variantu, strop
     9 dalších zákazníků, délky polí jako u hlavičky, neznámé klíče).
3. **Import a uložení:** `importZakazka` tvar očistí (neznámé klíče pryč, vadný tvar = klíče pryč + varování jako
   u `uvodniFotoOcisti`); `zakazkaDuplikuj` další zákazníky nepřenáší.
4. **Server** (`zakazka_kontrola.mjs`): s VYP odmítne změnu `dalsiZakaznici` / `vzRidici` proti uložené verzi
   (400, vzor VS R21) — uložení beze změny těchto klíčů projde; se ZAP odmítne vadný tvar; `vzSrovnej` po uložení.
5. **Zlatá sada** `src/test_vz_zlata.js`: (a) VYP = dnešní otisky, (b) ZAP s jedním zákazníkem = dnešní otisky,
   (c) zakázka → přidat → odstranit zákazníka = JSON shodný s výchozím (test „bez stop“).

## Testy

`src/test_vz_model.js` (přidání, vlastní varianta, odstranění, písmena včetně razítek, výměna řídícího, invariant,
pohled neobsahuje žádný řetězec jiného zákazníka, tvar), `netlify/test_vz_server.mjs` (VYP odmítá změnu, ZAP
vadný tvar, podvržené `vzRidici`), zlatá sada. Mutace „[VZ E0]“ nad `vice_zakazniku.js` a kontrolou serveru.

## Poznámka k ARES

Čistá logika ARES (`src/ares.js`: `aresRozdily`, `aresPrepis` nad libovolným objektem s klíči `objednatel`,
`adresaObjednatele`, `ico`, `dic`) se pro formulář nového zákazníka a pro dalšího zákazníka použije beze změny —
`dalsiZakaznici[i].hlavicka` má proto **stejné klíče jako hlavička zakázky**. Ověř testem (`test_vz_model.js`), že
`aresRozdily` a `aresPrepis` nad `hlavicka` dalšího zákazníka dávají stejný výsledek jako nad hlavičkou zakázky.
Zobecnění obrazovky ARES je v E1.

## Co nedělat

Žádná obrazovka kromě vypínače v Nastavení, žádná změna čísel, dokumentů, zámku, rejstříku ani Pipedrive.
