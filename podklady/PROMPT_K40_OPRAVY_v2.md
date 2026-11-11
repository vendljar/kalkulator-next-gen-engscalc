# Prompt K40 — dodatek v2 (11. 11. 2026, po nezávislém posudku)

**Jak číst:** platí `podklady/PROMPT_K40_OPRAVY.md` (v1) **s úpravami níž; kde se liší, má přednost tento
dodatek.** Důvody jsou v `podklady/K40_POSUDEK_FABLE.md`. Návrh poradce — spouští se až po odsouhlasení J. V.
a koordinací (odpovědi na otázky z posudku, oddíl 5; výchozí varianty jsou níž označené „výchozí“).

## A. Společné změny (všechny dávky)

- **Výchozí stav:** `origin/claude/integrace-16-10` = `6c4bc80` (v11.11.1) nebo SHA ze zprávy koordinace. Obsahuje
  víc šachet #570 (vypínač `/api/funkce`, výchozí vypnuto), AS #577, CA #575, MU/MU2/MU3, DZ/DZ2.
  **Čísla řádků ve v1 neplatí** — hledej podle jmen funkcí; aktuální místa jsou v posudku, oddíl 2.
- **K40 se dělí na tři dávky a tři větve** (v1 počítala s jednou `claude/k40-opravy`):

  | dávka | větev | roadmapa | meze B | body |
  |---|---|---|---|---|
  | K40a | `claude/k40a-jadro` | #579 | B199–B205 | 1 (N1 + šachty 2+), 2 (X1/X2), 4 (N2, N5), 7 (X4), 8 (N4), 9 (S4, X6, X5, T1–T3, P1, meze X3 a S3, mezery hlídačů) |
  | K40b | `claude/k40b-zamek` | #580 | B206–B207 | 3 (S2), 5 (S1 + N3) |
  | K40c | `claude/k40c-webhook` | #581 | B208–B209 | 6 (W1) + doplnění mezí #553 |

  K40a a K40b smějí běžet souběžně. **K40c až po sloučení K40b do integrace** a po rozhodnutí J. V. (otázky 5
  a 5b). Souhrnná položka K40 je #567. Před zápisem ověř, že čísla #579–#581 a B199–B209 jsou pořád volná
  (nad 6c4bc80: roadmapa volné #567 a #579–#589, nejvyšší mez B214, B199–B209 volné).
- **Cena a zlaté sady:** žádná oprava K40 nesmí změnit výsledek `vypocet()`. Po každém zásahu do `src/` pusť
  `node src/test_vs_zlata.js` (319 scénářů) a zlatou sadu můstků (`src/test_560_zlata.json`). Otisky se
  **nepřegenerují** (`nastroje/zlata_vs.js`, `nastroje/zlata_560.js` nespouštět se zápisem). Změna otisku =
  chyba opravy, zastav a napiš koordinaci.
- **Starší mutace:** po zásahu do funkce, na kterou míří starší mutace (K37 sklo, #548 můstky, #555 zámek, #553
  webhook, kopie na Disk), pusť `node mutace_jadro.mjs --kontrola` / `node netlify/mutace.mjs --kontrola`
  a posunutá zadání oprav.
- **Mutace v dávce:** jádro celé (po částech), server jen části, kterých se dávka týká, plus `--kontrola`. Celé
  kolo s plnými mutacemi pouští koordinace při slučování.
- **Víc šachet:** u každého bodu, který čte `v.data.ock.zadani`, ověř chování u zakázky s `ock.dalsi[]`
  (zapnutý vypínač) — seznam šachet dává `sachtyZ(ock)`. S vypnutým vypínačem se nic nemění.
- **Příručky:** uživatelsky viditelné změny (K40b důvod výjimky u data prodeje, K40c upozornění na vazbu) doplň
  i do příruček v `manual/` podle zvyklostí repa.
- Kde se smí měnit (doplnění v1): také `CHANGELOG.md`, `roadmapa/`, `PREDAVKA.md`, `verze.txt`, `manual/`.

## B. Bod 1 — K40-N1 (nahrazuje odstavec „Oprava“ ve v1)

**Vzor `^MATERIÁL VSG 4\.4\.[12]$` do `skloMigraceNazvu` NEPŘIDÁVEJ.** Migrace běží i v `importZakazka`
(prohlížeč i server, i nad zamčenou variantou) a při každém otevření; vzor by přemapoval staré osiřelé záznamy,
změnil cenu uložené rozpracované nabídky a přepočet odeslané.

**Oprava (výchozí, otázka 1a):**
- `skloMigraceNazvu(data, opts)`: nepovinné `opts.predCelni` = název čelního skla **před** změnou. Je-li zadané
  a liší se od `skloVolba(z, c).celni.nazev`, přidej přesnou dvojici `predCelni → nový název` (všechny mapy
  i `nepocitat`, bez duplicit; existující cílový klíč má přednost jako dnes). Bez `opts` se funkce chová přesně
  jako dnes — `importZakazka` a server se nemění.
- Starý název si zapamatuj před změnou v obou cestách, které ho mění: `set()` pro `Z.typSachty` a `Z.zaskleni`
  (`src/ui/common.js`) a `typSachtyPrepni` (`src/ui/kalk_ock.js`). Název čelního skla na ceníku nezávisí.
- Zamčená varianta se nemění (`skloMigraceAkt` zámek hlídá).
- Varianta 1b (jen na pokyn J. V.): při otevření rozpracované zakázky sirotka obnovit **s upozorněním**.

**Nový nález — sklo u šachet 2+ (víc šachet #570, součást K40a):**
- `skloMigraceNazvu` a `skloMigraceAkt` pracují jen s `d.ock.zadani`. U šachty 2+ se proto po přepnutí typu
  nebo zasklení vyřazené sklo boků znovu počítá (vada K37-N1). Reprodukce nad 6c4bc80: dvě interiérové šachty,
  u šachty 2 vyřazené sklo boků, `typSachty = 'exteriérová'` → `skloMigraceNazvu(d)` vrátí 0 změn, cena zakázky
  vzroste.
- Oprava: migrace boků (dnešní vzor) nad **každým** zadáním ze `sachtyZ(d.ock)`; přechodová migrace čelního skla
  nad zadáním otevřené šachty (`Z`). V `importZakazka` přesuň volání migrace skla do smyčky `zadaniSachet`
  (pro jednu šachtu beze změny).
- Jedna šachta a vypnutý vypínač: chování i výstup migrace bajt po bajtu jako dnes.

**Testy (doplnění v1):**
- přepnutí tam a zpět: cena, vyřazení i přepisy se vrátí;
- **uložená zakázka se sirotkem** (`nepocitat: ['MATERIÁL VSG 4.4.2']` při zasklení „mezi příčníky“): po
  `importZakazka` i po `syncVarianta` beze změny dat i ceny (pojistka proti návratu vzoru);
- zamčená varianta se sirotkem: import nezmění `nepocitat` čelního skla, `zamekOvereni` dál „shoda“;
- víc šachet: šachta 2 boky i čelní sklo, int ↔ ext a obě zasklení; šachta 1 se při změně šachty 2 nemění;
- server: uložení po přepnutí projde, ověření zámku nové odeslané nabídky „shoda“;
- mutace: „přechod bez `predCelni`“, „migrace skla jen nad šachtou 1“, „přejmenování čelního skla i při importu“.

## C. Bod 2 — X1/X2 (doplnění)

- Strop délky úseku v `nazevCast` zvol vysoký (např. 200 znaků) a dolož, že `test_nazvy_souboru`,
  `test_vs_vystupy` a `test_577_jmeno_kopie` dávají stejné názvy.
- Ořez smyčkou musí dát **stejný výstup** jako dnešní výraz na sadě běžných i krajních vstupů (prázdný text,
  samé pomlčky, znaky uprostřed) — test porovnej s referenční implementací výrazem na krátkých vstupech.

## D. Bod 3 — K40-S2 (doplnění)

- Bez stropu kroků (měnil by výstup); stačí kanonizace jednou a sestup po kanonické struktuře.
- Test přidej i pro zamčenou variantu s 10 šachtami v `ock.dalsi` (cesta `ock.dalsi.<i>.zadani.<pole>` beze změny).

## E. Bod 4 — N2/N5 (doplnění)

- Rozsah šířky (výchozí 500–5 000 mm, otázka 8) kontroluj po `cenikMigraceMustku` a jen u vyplněné kladné
  hodnoty; mimo rozsah = **potvrzení**, ne odmítnutí (stejný mechanismus jako potvrzení nuly, dialog i server).
- Otázka 6 (rozměr skupiny v zadání pod 300 mm = jen upozornění v kontrolách): **nedělej bez pokynu J. V.**

## F. Bod 5 — K40-S1 + K40-N3 (doplnění; dávka K40b)

- **Kde razítko žije:** `zamek.prijato` **nepatří do klíče zámku** (`uloZamekKlic` je výčet polí — nepřidávat).
  U uloženého zámku ho drží `uloZamekRazitkaDrz` — přidej `prijato` do seznamu vedle `kdo`, `popis`, `sablona`,
  `slovnik`, `hlavicka`. U nového zámku ho zapiš tam, kde server píše `v.zamek.kdo` (příjem nového zámku).
- **Pořadí:** `prodServer` běží v `zakazkaServerKontrola` dřív než `uloZamekRazitkaDrz`. `prodServer` proto
  bere `prijato` z **uložené** verze (`stara`); u zámku, který v uložené verzi není (nový zámek v témže
  požadavku), bere čas serveru. Z příchozích dat ho nečte nikdy. `prodJedinaZmena` pole `zamek.prijato` při
  porovnání vynechá.
- **Klient:** odpověď `POST /api/zakazky` doplň o `zamkyPrijato: { <id varianty>: <ISO> }` a prohlížeč si ho
  dopíše do místní kopie zámku (jako `slevy`). Pole data v kartě Prodáno pak bere mez touž funkcí jako server.
  Dokud klient razítko nemá, platí pro něj mez z `kdy` a server může odpovědět 400 s hláškou — to je v pořádku.
- **Obnova:** z otisku se `prijato` přebírá; ze souboru se **zahodí** (výchozí, otázka 3a) — zámek se pak chová
  jako starší (mez z `kdy`).
- **Důvod výjimky:** délkový strop, bez řídicích znaků, v UI přes `esc`; zapisuje se do `prodejHistorie` spolu
  s tím, kdo a kdy (z relace).
- **Mez k zápisu (B206–B207):** tolerance 7 dní a výjimka; a zbytková mez — antedatovaný čas tisku (až 400 dní,
  K7-S5) dál určuje období odeslání v controllingu (výchozí otázka 4a: jen zapsat).
- **Testy navíc:** Prodáno od klienta, který `prijato` neposílá → 200; od klienta s podvrženým `prijato` → mez se
  nezmění; zámek a prodej v jednom požadavku; klon odeslané varianty (`kopie.zamek = null`) dostane při novém
  zámku nové razítko; obnova z otisku × ze souboru; starší klient ukládá zakázku se zámkem bez 409; zakázka
  s víc šachtami (snímek `sachty`, `sachtyVerze`) — zámek i prodej beze změny chování.

## G. Bod 6 — K40-W1 (doplnění; dávka K40c, čeká na otázky 5 a 5b)

- **První navázání existující kalkulace = jen vazba** (výchozí 5a): dokud je `pdVazbaWebhook.stav === 'ceka'`,
  webhook nevolá přenos polí hlavičky ani krycího listu (`pdWebhookPouzij` dnes u kalkulace bez otisku doplní
  prázdná pole z dealu). Přenese je další doručení po „V pořádku“. Protokol zapíše, co se stalo.
- **Zrušení vazby** smaže `pdDealId`, `pdZadani`, `pdStav` a index `pd_webhook/deal:<id>`, přepíše rejstřík
  a přidá deal do seznamu odmítnutých. Odkaz v dealu: výchozí 5b-a — vymazat pole „Odkaz na kalkulaci“ jen
  když nese náš odkaz na tuto kalkulaci; chyba Pipedrive zrušení nezastaví (varování).
- **Odmítnutý deal** kontroluj před jakýmkoli zápisem (zakázka, index, PATCH dealu) → 409 s vysvětlením.
- `pdVazbaWebhook` a seznam odmítnutých píše **jen server**: při běžném uložení se berou z uložené verze (vzor
  `uloZamekRazitkaDrz` / interní poznámky), mění je jen výslovná akce (potvrdit / zrušit / „vazba je chybná“).
  Obnova ze souboru je nepřebírá. Délkové stropy (seznam odmítnutých např. 50 položek).
- Upozornění i u zamčené a prodané zakázky a v režimu jen ke čtení; texty přes `esc`; `overit_xss.mjs` s otráveným
  číslem nabídky.
- Testy navíc: první navázání nezmění žádné pole hlavičky ani krycího listu; po potvrzení další webhook pole
  přenese; zrušení smaže `pdZadani` a index; podvržené `pdVazbaWebhook` od klienta se ignoruje.

## H. Bod 7 — K40-X4 (doplnění; dávka K40a)

- Vada je ve **dvou** místech: `kopieDiskUklid` (`src/ui/online_ui.js`) a skript
  `nastroje/apps_script/kopie_disk.gs` (týž výběr `…sort().pop()`).
- Výběr srovnávací kopie přesuň do `src/retence_zaloh.js` jako jednu funkci (jen jména téhož prostředí s dnem
  **menším** než den aktuální kopie; jména s budoucím dnem vrátit zvlášť jako podezřelá) a volej ji z obou míst.
  Do skriptu ji dostaň nástrojem `nastroje/apps_script/vloz_retenci.py`, ne ručně; `netlify/test_577_apps_script.mjs`
  musí zůstat zelený a dostat test s podvrženou „budoucí“ kopií.
- Podezřelá jména ohlas ve výsledku úklidu (prohlížeč) i v hlášení skriptu; nemazat.
- **Na konci napiš J. V.**, že má nový `kopie_disk.gs` vložit do Apps Script (skript se sám neaktualizuje) —
  s odkazem na `podklady/NAVOD_ZALOHA_APPS_SCRIPT.md`.

## I. Bod 9 — hygiena (doplnění; dávka K40a)

- **P1:** meze #553 jsou psané jako odrážky `- **B176 — …`. Test duplicit hlídej u **definičních** výskytů obou
  tvarů (`^### B\d+ — ` a `^- \*\*B\d+ — `); rozsahy („B191–B193“) a nadpisy typu „Kolize čísla B178“ nejsou
  definice. V oddílu AS #577 oprav větu „Čísla B199–B202 drží K40“ na B199–B209.
- **Čísla mezí v K40a:** B199–B202 přečíslované meze #553, B203 K40-X3, B204 K40-S3, B205 K40-X4. (B206–B207
  má K40b, B208–B209 K40c — nesahej na ně.)
- **K40-X3:** mez piš ve stavu po AS #577 — hlavní cesta je skript s tokenem (B213), prohlížeč je záloha záloh
  a heslo z přihlášení použije jen tehdy, když kopii nového nočního otisku skript nepotvrdil.
- **K40-T1:** nikde pevné číslo verze šablony (CN je po víc šachtách v17).
- **K40-T2:** `overit_online.mjs` se po VS posunul — místa hledej podle textu podmínky, ne podle řádku.
- **K40-S4:** nové sady VS a AS výchozí `ADMIN_EMAIL` mají; seznam z v1 platí.

## J. Na konci každé dávky (doplnění v1)

- výsledek obou zlatých sad (beze změny otisků),
- `--kontrola` obou mutačních sad,
- tabulka bodů dávky s odškrtnutím (✅ / ⬜ + poznámka),
- `context_usage` (`get_session`), `PREDAVKA.md`, odkaz na release podle `CLAUDE.md` jen na pokyn koordinace,
- K40a: připomínka pro J. V. k výměně skriptu Apps Script.
