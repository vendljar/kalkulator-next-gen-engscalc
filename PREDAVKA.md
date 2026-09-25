# Předávka — stav k 25. 9. 2026 v noci (dávky B a C kola 16)

Na `main`: **v25.9.3** (+ oprava Node), tag `v25.9.3`.
Na `test`: **v25.9.5**. Na `test-draft` a `k16-nalezy`: **v25.9.8** (dávky B
a C kola 16) — čeká na pokyn J. V. k přenosu do `test`.
Roadmapa: `roadmapa/roadmap.json` (363 položek), publikovaná na
https://claude.ai/artifact/RmrdBw1QbyyBxDLhZcExTq

## Hotovo v25.9.7 (větev `k16-nalezy` → `test-draft`) — roadmapa #361
- P5 (K14-N65, K14-N62, K15-N69): nová zakázka a razítko platného ceníku
  nehlásí falešné „neuložené změny"; bez čísla nabídky se neukládá (ruční
  uložení odmítne, autosave uložené zakázky s vymazaným číslem čeká).
- P6 (K15-N67): ověření zmrazeného výsledku zámku jen nad čísly; texty,
  příznaky a klíče jiné verze nejsou rozdíl; jádro dokumentu musí mít obě strany.
- P7 (K15-N68, K16-N87): tlačítka dialogu uzamčené varianty (a dvou dialogů
  složky) říkají, co udělají; kolize verzí jmenuje člověka (server píše
  `upravilJmeno` z relace, starší zakázky dohledá v účtech; `kdoVy`).
- P15 (K16-N85): adresa stavby v rejstříku, v hledání, v našeptávači
  a v seznamu; starší záznamy doplňuje server po 25 při ukládání; „ss" = „ß".
- P14 (K16-N81): zalomení ve Wordu `</w:t><w:br/><w:t>` místo `<w:br/>`
  uvnitř `<w:t>` (i krycí listy od nuly).
- Nové testy: `overit_neulozene.mjs`, `netlify/test_rejstrik.mjs` (v mutacích),
  rozšíření test_prava, test_zamek_otisk, test_ulozeni, test_uloziste,
  test_docxgen, test_dialogy, overit_dialogy, overit_zobrazeni, overit_sablona.
- Ověřeno: sady v Node 143/0, `nastroje/pred_pushem.sh`: 40 ze 42 harnessů
  se šablonami CN v12 + PROJ v2 (`overit_manual` a `overit_sod` se přeskočí —
  chybí příručka a šablony SoD, pred_pushem je hlásí jako ✗).
  Mutace serveru (spuštěné po pushi): **176 ze 176 chyceno** (nové P6, P7,
  P15; mutace B59 přepsaná).

## Rozhodnutí udělaná v dávce B (k odsouhlasení J. V.)
- Bez čísla nabídky se už NEUKLÁDÁ ani autosave dříve uložené zakázky, které
  někdo číslo vymazal (do teď by vznikl soubor „bez-cisla-…" vedle původního).
  Test z 4. 8. „ukládá se i s vyprázdněnou hlavičkou" platí dál pro vymazaný
  NÁZEV akce (soubor nese číslo).
- Přepočet na nový ceník vtisknutý aplikací (po zveřejnění) se nepočítá za
  neuloženou práci a sám se neukládá — stejně jako při otevření zakázky (V35).
- Hledání bere „ß" jako „ss" (týká se i hledání variant).

## Hotovo v25.9.8 (větev `k16-nalezy` → `test-draft`) — roadmapa #362
- P3 (K14-N63, K16-N84): překlad šablon po úsecích mezi symboly, tabulátory
  a zalomeními (`docxPrelozUseky`), každý úsek ve svém běhu, všechno, nebo nic.
  CN v12 i PROJ v2 do EN/DE/FR bez českého odstavce. Nová hesla slovníku jsou
  **návrh překladu ke kontrole J. V.** („bez DPH" → „excl. VAT" / „zzgl. MwSt.").
- P4 (K14-N64, K15-N66): vlastní a trvalé položky PROJ v online nabídce u své
  sekce; symboly `{{PROJ_POLOZKY_NAVIC}}` a `{{PROJ_NAVIC_<SEKCE>}}`; řádky slevy
  PROJ ve Wordu zmizí bez slevy; kontroly `slevaWordProj` a `polozkyNavicWordProj`
  (pravidel kontrol 21).
- Nové testy: `src/test_k16_proj_word.js` (30), rozšíření test_docx_preklad,
  overit_sablona, overit_nabidka_proj_word, overit_nabidky_dph, test_kontroly,
  overit_lista.

## Další práce
- Rozbor D = #363 (P8 kapitoly nabídky, P9/P10 SoD a platební podmínky,
  P11/P12 zahraniční PROJ a náklady) → `podklady/K16_ROZBOR_2026-09-25.md`.
  Po něm sloučit `k16-nalezy` do `test-draft` a navrhnout J. V. smazání větve.
- Úkol pro šablonu PROJ (J. V.): tabulka součtu se symboly `PROJ_CELKEM_BEZ_DPH`,
  `PROJ_CENA_PRED_SLEVOU`, `PROJ_SLEVA_PROC`, `PROJ_SLEVA_KC`, `PROJ_DPH_KC`,
  `PROJ_CELKEM_S_DPH` a odstavec `{{PROJ_POLOZKY_NAVIC}}`.
- Po nasazení přegenerovat jazykové mutace šablon (dodané CN v12 EN/DE nesou
  české odstavce z doby před P3).
- #350 slovník SoD: čeká na soubory Sablona_SOD_REALIZACE/PROJEKCE od J. V.

## Poznámky pro další sezení
- Šablony pro harnessy (CN v12 + EN/DE/FR, PROJ v2_opravena) v novém sezení
  nejsou — požádat J. V.; `KNG_PODKLADY=<složka>`, PROJ jako `Sablona_NABIDKA_PROJ.docx`,
  pro `overit_sablony_online.mjs` kopie CN v12 i jako `Sablona_NABIDKA_CN_v11.docx`.
- Harnessy a serverové sady pouštět s `ADMIN_EMAIL=spravce@priklad.cz`
  (statické importy čtou proměnnou dřív, než ji harness nastaví; nastroje/pred_pushem.sh
  ji nastaví sám).
- Mutace serveru jen jednou naráz, spouštět přes běh na pozadí nástroje (ne
  setsid) a NIKDY souběžně s pred_pushem ani s úpravami `src/`/`netlify/`
  (runner soubory dočasně mění). Po přerušení `grep -rn "if (false)" netlify src`
  a `git diff netlify src`.
- Kontejner běží v UTC: verze vDEN.MĚSÍC se měří k datu posledního commitu —
  dávku uzavřít a commitnout před půlnocí UTC, nebo ji sestavit s novým dnem.
- Čekací smyčky nepsat přes `pgrep -f` se stejným vzorem (chytí samy sebe).
- Harnessy potřebují symlink `node_modules/playwright` → `$(npm root -g)/playwright`
  (a `node_modules/playwright-core` → `…/playwright/node_modules/playwright-core`).
- LibreOffice v kontejneru nemá Writer — vykreslení .docx se ověřit nedá,
  jen strukturou XML.
- Komentář s doslovnou uzavírací značkou skriptu v src/ rozbije celou aplikaci.
- Dvě nezávislé pojistky potřebují každá vlastní cílený test, jinak mutace
  jedné projde.

## Čeká na J. V.
- Pokyn k přenosu v25.9.8 do `test`, v25.9.x do `main`.
- Soubory SoD (#350); texty kapitol nabídky (#363/P8); rozhodnutí P9–P12;
  #355, #356 (můstky); #346 Netlify; #172 lokálně npm.
- Odsouhlasit rozhodnutí z dávky B výš a překlady nových hesel z dávky C.

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
Úkol: dávka C z roadmapy #362 (P3 zbytek: překlad textu kolem symbolů po úsecích se
zachováním běhů, mezera a slovník u „včetně DPH"; P4: vlastní/katalogové položky PROJ
v nabídce online i ve Wordu, sleva a součet ve Wordu PROJ — symboly + kontrola slevaWord
pro PROJ + úkol pro šablonu), pak rozbor D (#363) do podklady/K16_ROZBOR_2026-09-25.md.
U každého bodu: test, který bez opravy selže → oprava → vlastní commit. Pak build,
nastroje/pred_pushem.sh, mutace (jen jeden běh naráz, na pozadí nástroje), CHANGELOG,
roadmapa, PREDAVKA.md, push do k16-nalezy a převod do test-draft.
Na konci tabulka úkolů ✅/⬜ a stav kontextu (get_session → context_usage).
```
