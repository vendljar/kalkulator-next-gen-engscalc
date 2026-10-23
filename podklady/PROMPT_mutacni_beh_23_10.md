# Zadání: mutační běh, který doběhne v cloudovém sezení i v GitHub Actions (23. 10. 2026)

Pracuj česky. Založ větev `claude/mutace-beh` nad `origin/test` a pracuj jen v ní. Do `test`, `test-draft` ani
`main` nic, slučuje koordinace na pokyn J. V. Na začátku si přečti `CLAUDE.md`, `PREDAVKA.md` (oddíl 22. 10. „Stav
Pipedrive“ ve větvi `claude/eager-carson-1xznt2`) a skill `testovaci-procedura-kng`.

## Proč

- Mutací přibývá: `netlify/mutace.mjs` má 808 mutací (30. 9. jich bylo 206), `mutace_jadro.mjs` 432.
- Cloudové sezení: úloha na pozadí má tvrdý limit 2 hodiny. Mutace serveru v kontejneru trvají kolem 5 hodin
  (22. 10.: 303 mutací za 2 h), takže `testovaci_kolo.sh` tam nikdy nedoběhne. Restart kontejneru běh navíc přeruší
  a nechá ve zdrojácích dočasnou mutaci.
- GitHub Actions, Testy #194 (23. 10., c73770f): joby `mutace-server` a `mutace-jadro` ukončil `timeout-minutes: 45`
  (server zhruba 280 z 808). Job `testy` spadl na `npx playwright install --with-deps chromium`: `ubuntu-latest` je
  od 19. 10. Ubuntu 26.04 a Playwright 1.56.1 ho nepodporuje. Totéž se stalo běhu #193 na `main` 22. 10.
- Oba skripty vybírají mutace jen podle názvu (filtr), ne podle pořadí. Zbytek přerušeného běhu proto nejde pustit.

## Co udělat

1. **Výběr části běhu podle pořadí** v `netlify/mutace.mjs` i `mutace_jadro.mjs`:
   - `--cast K/N`: každá N-tá mutace počínaje K-tou, pro souběžné joby (části se rovnoměrně rozloží),
   - `--od N`: pokračování přerušeného běhu od N-té mutace (číslováno od 1 podle pořadí v `MUTACE`),
   - řádek výsledku nese pořadí (`[528/808] chycená …`), aby šlo z logu poznat, kde běh skončil,
   - souhrn řekne, jakou část běh pokryl („část 2/4: 202 z 808 mutací“), a nikdy netvrdí, že prošlo všech 808,
   - filtr podle názvu, `--kontrola` a zámek mutací (`zamkniMutace`) fungují beze změny.
2. **`nastroje/testovaci_kolo.sh`** předá část oběma mutačním krokům proměnnou prostředí (např.
   `KNG_MUTACE_CAST=2/4`, `KNG_MUTACE_OD=528`). Souhrn kola u části píše „část K/N“ a nikdy „VŠE ZELENÉ“ za celé kolo.
   Jediný seznam kroků zůstává v tomto skriptu.
3. **`.github/workflows/testy.yml`**:
   - `runs-on: ubuntu-24.04` u všech jobů, pokud to koordinace mezitím neudělala (zkontroluj `origin/test`),
   - mutace serveru jako matrix po částech (např. 4), mutace jádra také (např. 2), `fail-fast: false`,
   - `timeout-minutes` každé části změř a nech rezervu,
   - akce zůstávají připnuté na celý SHA a token má jen čtení (B125).
4. **`CLAUDE.md`, oddíl Testy:** jeden odstavec, jak pustit celé kolo v cloudovém sezení po částech pod 2 hodiny,
   a že po restartu kontejneru je nejdřív `git status` a dočasná mutace se vrátí `git checkout -- <soubor>`.

## Testy a pojistky

- Nový test výběru části: části 1 až N dohromady pokryjí každou mutaci právě jednou, `--od` začne na správné
  mutaci, neplatný zápis (`0/4`, `5/4`, `abc`) skončí chybou a nespustí celý běh. Doložit, že před úpravou selže
  (napsat do commitu).
- `node netlify/mutace.mjs --kontrola` a `node mutace_jadro.mjs --kontrola` zelené.
- Celé kolo v sezení po částech, každá úloha na pozadí pod 2 hodiny. Mutační běh nepřerušovat a během něj
  needitovat `src/` ani `netlify/`.
- Statické kontroly pouštět až po commitu (kontrola verze měří den posledního commitu) a nepushovat, dokud nejsou
  zelené.
- Po pushi požádat J. V. o ruční spuštění Actions → Testy → Run workflow na větvi `claude/mutace-beh` a ověřit,
  že všechny joby doběhnou zeleně v limitu.

## Dokumentace a konec dávky

CHANGELOG (oddíl s verzí dne), roadmapa (nová položka podle skillu `roadmapa-kng`), `PREDAVKA.md`, `verze.txt`
podle dne posledního commitu. Dávku zakončit tabulkou úkolů ✅ / ⬜.

## Navazuje

Na větvi `claude/eager-carson-1xznt2` (c73770f, v22.10.2) zatím nikde celé neběžely mutace serveru 528–808.
Až bude výběr části v `test`, pustit je tam, nebo až po revertu Stavu Pipedrive, podle toho, jak rozhodne
koordinace.
