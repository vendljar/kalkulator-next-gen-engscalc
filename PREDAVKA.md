# Předávka — stav k 25. 9. 2026 v noci

Na `main`: **v25.9.3** (+ oprava Node), tag `v25.9.3`.
Na `test`: **v25.9.5**. Na `test-draft`: **v25.9.6** (dávka A kola 16) — čeká
na pokyn J. V. k přenosu do `test`.
Roadmapa: `roadmapa/roadmap.json` (363 položek), publikovaná na
https://claude.ai/artifact/RmrdBw1QbyyBxDLhZcExTq

## Hotovo v25.9.6 (jen `test-draft`) — roadmapa #360
- P1 (K16-N73, N74): role slevy z přihlášeného / z relace, cizí „čeká" se
  uložením neschválí, auto nad stropem role = zábrana tisku.
- P2 (K16-N75, K14-N61): rozměry a nová kontrola „cenaNula" = zábrana;
  chybějící cena v ceníku nedá NaN. POZOR: nová prázdná zakázka (zdvih,
  šířka, hloubka 0) teď nejde tisknout, dokud se nevyplní — záměr.
- P13 (K16-N77): v náhledu autosave stojí, ruční uložení v rolovém náhledu se ptá.
- N89: „Smazat vybrané" jen s právem uloziste.mazani.
- Nová sada `netlify/test_obchodnik.mjs` (24 scénářů, v mutacích serveru).
- Ověřeno: sady v Node, harnessy (kromě příručky a SoD), jádro 76/76,
  mutace serveru — viz CHANGELOG.

## Další práce — J. V. chce NOVOU VĚTEV (25. 9. 2026)
- Dávka B = roadmapa #361, dávka C = #362, rozbor D = #363 (podklady kola 16:
  PROMPT_PARALELNI_VETEV_K16.md, VYHODNOCENI_TESTU_KOLO16_2026-09-25.xlsx —
  J. V. je má; v repu nejsou). Prompt K16 počítal s 4f714a3 — P1, P2, P13,
  N89 už hotové, P3 z části (v25.9.5), zbytek platí.
- #350 slovník SoD: čeká na soubory Sablona_SOD_REALIZACE/PROJEKCE od J. V.

## Poznámky pro další sezení
- Šablony pro harnessy (CN v12 + EN/DE/FR, PROJ v2_opravena) v novém sezení
  nejsou — požádat J. V.; `KNG_PODKLADY=<složka>`, PROJ jako `Sablona_NABIDKA_PROJ.docx`.
- Harnessy a serverové sady pouštět s `ADMIN_EMAIL=spravce@priklad.cz`
  (nastroje/pred_pushem.sh ho nastaví sám).
- Mutace serveru jen jednou naráz, spouštět přes běh na pozadí nástroje (ne
  setsid). Po přerušení `grep -rn "if (false)" netlify src` a `git diff netlify`.
- Čekací smyčky nepsat přes `pgrep -f` se stejným vzorem (chytí samy sebe).
- Harnessy potřebují symlink `node_modules/playwright` → `$(npm root -g)/playwright`.
- Komentář s doslovnou uzavírací značkou skriptu v src/ rozbije celou aplikaci.
- Dvě nezávislé pojistky (např. P1 role + P1 vrácení stavu) potřebují každá
  vlastní cílený test, jinak mutace jedné projde (S17, S18).

## Čeká na J. V.
- Pokyn k přenosu v25.9.6 do `test`, v25.9.x do `main`.
- Soubory SoD (#350); texty kapitol nabídky (#363/P8); rozhodnutí P9–P12;
  #355, #356 (můstky); #346 Netlify; #172 lokálně npm.

## Prompt pro nové sezení (větev k16-nalezy)
Sezení založit nad `vendljar/kalkulator-next-gen-engscalc`, větev `k16-nalezy`;
přiložit šablony CN v12 (CZ/EN/DE/FR), Sablona_NABIDKA_PROJ_v2_opravena.docx
a případně Sablona_SOD_REALIZACE.docx + Sablona_SOD_PROJEKCE.docx.

```
Pracuješ na Kalkulator Next Gen ve větvi k16-nalezy (repo vendljar/kalkulator-next-gen-engscalc).
Pravidla větví (schváleno J. V. 25. 9. 2026, viz CLAUDE.md):
- k16-nalezy je DOČASNÁ pracovní větev jen pro dávky B, C a rozbor D kola 16
  (roadmapa #361–#363). Pracuj a pushuj v ní; po každé ucelené dávce ji převeď
  do test-draft (fast-forward nebo merge). Po dokončení #361–#363 ji sluč do
  test-draft a navrhni J. V. smazání (mazání větví z cloudu nejde — smaže ji on).
- Trvalá předávací větev je test-draft; PREDAVKA.md veď v té větvi, kde pracuješ,
  a při převodu ji přenes do test-draft.
- Do test a main nic bez pokynu J. V.
Než začneš:
1. git fetch origin k16-nalezy test-draft && git checkout -B k16-nalezy origin/k16-nalezy
2. Přečti CLAUDE.md a PREDAVKA.md (v této větvi) a skill kalkulator-next-gen.
3. Připrav prostředí: symlink node_modules/playwright → $(npm root -g)/playwright;
   přiložené šablony dej do složky podkladů a pouštěj testy s KNG_PODKLADY=<složka>
   (PROJ šablonu pojmenuj Sablona_NABIDKA_PROJ.docx).
4. Ověř výchozí stav: ADMIN_EMAIL=spravce@priklad.cz ./spust_testy.sh (má být 0 selhání).
Úkol: dávka B z roadmapy #361 — P5 (falešné „neuložené změny", uložení bez čísla),
P6 (ověření zámku jen nad penězi a množstvím), P7 (texty dialogů zámku a kolize verzí
se jménem), P15 (hledání podle adresy stavby), P14/K16-N81 (zalomení řádků ve Wordu).
U každého bodu: test, který bez opravy selže → oprava → vlastní commit. Pak build,
nastroje/pred_pushem.sh, mutace (jen jeden běh naráz, na pozadí nástroje), CHANGELOG,
roadmapa, PREDAVKA.md, push do k16-nalezy a převod do test-draft.
Na konci tabulka úkolů ✅/⬜ a stav kontextu (get_session → context_usage).
Pokračuj dávkou C (#362) a rozborem D (#363), dokud je kontext pod 60 %.
```
