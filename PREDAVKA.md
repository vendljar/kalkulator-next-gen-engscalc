# Předávka — stav k 25. 9. 2026 v noci (dávky B, C a rozbor D kola 16)

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

## Rozbor D (#363) — hotov, čeká na rozhodnutí J. V.
`podklady/K16_ROZBOR_2026-09-25.md`: P8 prázdné kapitoly ve Wordu a termín
bez jednotky, P9 mapa `PODM_*` → `SOD_*`, P10 platební podmínky (devět míst,
sedm rozporů), P11 PROJ u zahraniční varianty, P12 náklady u obchodníka.
Kód se nezměnil. Nejnaléhavější: **P12 — kalkulace PROJ ukazuje obchodníkovi
nákladové sazby** (sloupec „Sazba Kč/h · fix"), oprava je malá (varianta A),
čeká jen na pokyn, co má obchodník vidět místo sazby.

## Další práce
- Větev `k16-nalezy` splnila účel (#361–#363) a je sloučená do `test-draft`;
  navrženo J. V. ji smazat (z cloudu to nejde). Další práce podle rozhodnutí
  z rozboru D začne z `test-draft`.
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
- Soubory SoD (#350); texty kapitol nabídky; rozhodnutí P8–P12 z rozboru D
  (otázky v `podklady/K16_ROZBOR_2026-09-25.md`, souhrnná tabulka nahoře);
  #355, #356 (můstky); #346 Netlify; #172 lokálně npm.
- Odsouhlasit rozhodnutí z dávky B výš a překlady nových hesel z dávky C.

## Prompt pro nové sezení (větev test-draft)
Sezení založit nad `vendljar/kalkulator-next-gen-engscalc`, větev `test-draft`;
přiložit šablony CN v12 (CZ/EN/DE/FR), Sablona_NABIDKA_PROJ_v2_opravena.docx
(nebo novější PROJ se součtem) a případně Sablona_SOD_REALIZACE.docx
+ Sablona_SOD_PROJEKCE.docx.

```
Pracuješ na Kalkulator Next Gen ve větvi test-draft (repo vendljar/kalkulator-next-gen-engscalc).
Do test a main nic bez pokynu J. V.
Než začneš:
1. git fetch origin test-draft && git checkout -B test-draft origin/test-draft
2. Přečti CLAUDE.md a PREDAVKA.md a skill kalkulator-next-gen.
3. Připrav prostředí: symlink node_modules/playwright → $(npm root -g)/playwright;
   přiložené šablony dej do složky podkladů a pouštěj testy s KNG_PODKLADY=<složka>
   (PROJ šablonu pojmenuj Sablona_NABIDKA_PROJ.docx).
4. Ověř výchozí stav: ADMIN_EMAIL=spravce@priklad.cz ./spust_testy.sh (má být 0 selhání).
Úkol: zapracovat rozhodnutí J. V. k rozboru D kola 16
(podklady/K16_ROZBOR_2026-09-25.md): <doplnit rozhodnutí k P8–P12>.
U každého bodu: test, který bez opravy selže → oprava → vlastní commit. Pak build,
nastroje/pred_pushem.sh, mutace (jen když se měnil server nebo jádro; jen jeden běh
naráz, na pozadí nástroje), CHANGELOG, roadmapa, PREDAVKA.md, push do test-draft.
Na konci tabulka úkolů ✅/⬜ a stav kontextu (get_session → context_usage).
```
