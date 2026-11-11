# Prompt VSD — drobnosti víc šachet: upozornění `vsTvar` a stabilní harness `overit_lista_cekani.mjs` (K43-T1)

Jsi vývojové sezení projektu Kalkulator Next Gen (model Opus 5.5). Komunikuj česky. Na začátku přečti `CLAUDE.md`,
`PREDAVKA.md` (oddíl „Předávka koordinace — 11. 11. 2026“) a `podklady/PROMPT_RIDICI_SEZENI_PO_KOLE47.md`
(B0 „Drobnosti VS“, C4 „K43-T1“, C6). Spusť `bash nastroje/instaluj_hooky.sh`. Nikdy AskUserQuestion — u nejasnosti
zvol výchozí variantu a napiš ji do závěrečné zprávy.

| | |
|---|---|
| větev | `claude/vsd-drobnosti` |
| báze | `aa445a12f187701351c627c15c820d512fc66e1b` (integrace, obsah = test v11.11.1) |
| roadmapa | **#586** (`vsTvar`), **#587** (K43-T1); před zápisem ověř, že jsou volná |
| meze B | žádné (server se nemění — mez 10 variant a 1–20 ks hlídá už dnes) |
| odhad | 2–3 h |
| riziko | drobnost — bez revize poradce; výpočet ceny ani server se nemění |

Do `test-draft`, `test`, `main` ani do integrace nic. Nic do Pipedrive ani na Disk. Žádné ceny ani osobní údaje do
repa. `git push --no-verify` je zakázané.

**Mimo rozsah (nezařazovat):** Pipedrive pole poznámky se seznamem šachet — čeká na J. V., které pole to má být
(otázka je u koordinace). ATYP podle kterékoli šachty a Typ produktu podle šachty 1 jsou potvrzené a hotové.
Velikost zámku u 10 šachet se neřeší.

## 1. `vsTvar` — upozornění v kontrolách (K47-I3, #586)

**Stav nad bází:** server odmítne uložení zakázky, která má víc než 10 variant šachet nebo počet kusů mimo 1–20
(`vsTvarProblemy` v `src/vice_sachet.js`, volá `src/uloziste.js`; konstanty `VS_VARIANT_MAX`, `VS_KS_MAX`,
`VS_NAZEV_MAX`). Pole v kartě šachet mají `min`/`max`, ale data z klonu, ze souboru nebo z ručně upravené zakázky
mez nehlídají — obchodník se o problému dozví až chybou uložení.

**Úkol:** pravidlo kontrol `vsTvar` v `src/kontroly.js`:

- Úroveň **upozornění** (rozhodnutí J. V. 11. 11. 2026), `zabranaMozna` ne, strana `ock`.
- Ptá se `vsTvarProblemy(ock)` — stejná funkce jako server, žádná druhá kopie mezí. Text lidsky a konkrétně:
  „Nabídka má N variant šachet, nejvýš jich může být 10 — zakázku nepůjde uložit.“ / „Šachta ‚Výtah B‘ má počet
  kusů X, povoleno je 1–20 — zakázku nepůjde uložit.“ (čísla z konstant, ne napevno). Jeden nález za variantu
  nabídky, vyjmenuje všechny problémy (důvod `limit` i `typ` u `ks` a `nazev`; ostatní tvarové vady `typ` shrň
  jednou větou „data šachet mají neplatný tvar“).
- Pozor na kontext: `ctx.__vs` vzniká jen v platném režimu víc šachet a `vsKs()` neplatný počet kusů tiše bere
  jako 1 (výpočet se nesmí rozbít). Pravidlo proto čte **surová data** varianty (`ctx.ock`, případně varianta ze
  zakázky jako `kontrolyVsOck`), ne normalizovaný výsledek. Ověř, že běží i u šachty 1 s `ock.ks = 0` / `21` /
  `1.5` / textem a u jedenácti variant.
- Bez dat víc šachet (`ock.dalsi` není a `ock.ks` není nebo je 1) mlčí — **jedna šachta beze změny** (zlatá
  zásada VS). S vypnutou funkcí víc šachet pravidlo mlčí také (jako ostatní pravidla `vs…`; ověř, co dnes
  dělá `vsVypnutoHlaska`, a nezdvojuj hlášku).
- **Umístění v seznamu pravidel: mezi `vsModel1` a `vsSablona`.** Souběžná dávka C2+C3 (`claude/c23-sod-v5`)
  přidává pravidla za `vsSablona` na konec seznamu — jinde by větve kolidovaly.
- Pravidlo je za variantu, ne po šachtě — do `KONTROLY_PO_SACHTE` nepatří.
- Výpočet, server, uložení ani karta šachet se nemění.

**Testy** (pojistka: nad bází selžou — v commitu počty před/po):

- `src/test_vs_kontroly.js`: 11 variant → upozornění s číslem 10; `ks` 0, 21, 1,5, text → upozornění s názvem
  šachty; šachta 1 i šachta 2+; 10 variant × 20 ks → nic; jedna šachta → nic; úroveň není zábrana (tisk nabídky
  i SoD projde); text obsahuje hodnoty konstant (změna `VS_VARIANT_MAX` v testu přes modul se propíše).
- Shoda s uložením: pro stejná data `vsTvarProblemy` ≠ prázdné ⇔ pravidlo hlásí ⇔ serverová kontrola v
  `src/uloziste.js` odmítne (jeden test nad všemi třemi).
- `node src/test_vs_zlata.js` (319) beze změny; `src/test_kontroly.js` beze změny.
- Mutace „[VSD]“ v `mutace_jadro.mjs` (`kontroly.js` je jádro): úroveň upozornění → zábrana, vynechání větve `ks`,
  vynechání větve `limit`; doloz, že jsou chycené; `node mutace_jadro.mjs --kontrola`.

## 2. K43-T1 — `overit_lista_cekani.mjs` pod zátěží (#587)

**Nález (kolo 43):** harness v souběhu s jinými běhy skončí 31/1, samostatně 32/0. Stejná třída jako K40-T2
(`overit_online.mjs`, opraveno ve FL #576 a K40): **čeká se pevný čas, ne konkrétní stav.** K43-T1 není v žádné
dávce K40 (ověřeno poradcem 11. 11. 2026 nad `claude/k40a`, `claude/k40b`, `claude/k40-posudek`).

**Úkol** (jen harness, aplikace beze změny):

1. Reprodukuj: pusť harness 10× samostatně a 10× pod zátěží (souběžně např. `node mutace_jadro.mjs --kontrola`
   nebo dvě další instance harnessu / `stress`-smyčka na obou jádrech). Zapiš, která kontrola padá a s jakými
   hodnotami vzorků.
2. Najdi pevná čekání a časové meze, které závisí na rychlosti stroje: `page.waitForTimeout(kolik)` po
   `page.goto`, `waitForTimeout(800)` / `(1500)` ve scénářích D a G, meze typu „do 14,5 s nic, po 15 s lišta“,
   vzorkování po 50 ms od `addInitScript`.
3. Oprav tak, aby se čekalo na **konkrétní stav** (`page.waitForFunction` nad stavem aplikace: ceník nasazený
   `ONLINE_STAV.cenikPouzit`, lišta v DOM, konec zdržené odpovědi `/api/program`, přihlášení dokončeno) a časové
   tvrzení se měřilo **relativně k události v prohlížeči** (čas odpovědi serveru zaznamenaný harnessem), ne
   k absolutním hodinám Node. Kde je čas sám předmětem zkoušky (lišta nejdřív po 15 s — PS #558), nech rezervu
   odvozenou z naměřeného zpoždění startu stránky, ne pevné číslo.
4. Smysl kontrol se nesmí oslabit: všech 32 kontrol zůstává, žádná se nepřeskakuje ani neopakuje „dokud
   neprojde“. Pojistka proti prázdnému testu: dočasně vrať chování aplikace, které harness hlídá (lišta hned po
   startu — např. lokální úprava v `dist/`, která se necommituje), a doloz, že harness dál selže.
5. Doloz: 20× pod zátěží 32/0 (před opravou N selhání z 20) — čísla do commitu a předávky.
6. Podívej se stejnýma očima na ostatní harnessy lišty (`overit_lista.mjs`, `overit_zaloha_lista.mjs`): najdeš-li
   stejný vzor, jen ho vypiš do předávky (neopravuj bez nálezu selhání).

Souběžné koordinační sezení „Zefektivnění programu“ má v plánu obecné měření nestabilních čekání (etapa M0/O) —
tahle oprava je cílená na jeden harness; do předávky napiš, co jsi změnil, aby se nedělalo dvakrát.

## 3. Závěr

- `bash nastroje/testovaci_kolo.sh --bez-mutaci` (harnessy s Playwright: `NODE_PATH=$(npm root -g)`) — počty do
  předávky. Celé mutace pouští koordinace při slučování.
- Příručka obchodníka (`manual/obsah.json`, kap. 25 Víc šachet): jedna věta o upozornění na meze. Bez nových snímků.
- `CHANGELOG.md`, `roadmapa/roadmap.json` (#586, #587; `python3 roadmapa/roadmapa.py --kontrola`), `verze.txt`
  (číslo potvrdí koordinace), `PREDAVKA.md` nahoře. Commit + push do `claude/vsd-drobnosti`, na konci
  `get_session` → `context_usage`.
- Zpráva koordinaci (send_message): SHA, počty, čísla stability před/po, odchylky.

## 4. Kolize

- **C2+C3 (`claude/c23-sod-v5`)**: `src/kontroly.js` (jiné místo seznamu — viz výše), `src/test_vs_kontroly.js`,
  `mutace_jadro.mjs`, `manual/obsah.json`.
- **K40a/K40b**: `mutace_jadro.mjs`, `manual/obsah.json` (řádek verze). `overit_lista_cekani.mjs` žádná jiná dávka nemění.
- Vždy: `CHANGELOG.md`, `PREDAVKA.md`, `roadmapa/roadmap.json`, `verze.txt`.
