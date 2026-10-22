# D2 — šablona nabídky PROJ obchodníka (v20.10.4, 20. 10. 2026)

Zdroj: šablona nabídky PROJ od obchodníka (OVP-CN „online calkulak“, rev. 33,
15. 9. 2026 — barevně vyznačené podmíněné texty; soubor má J. V.). Tím je
dodaná příloha roadmapy **#260** → uzavřeno. Větev `claude/d2-proj-sikora`,
koordinace „ŘÍDÍCÍ 19.10“. J. V. se v dávce neptal — výchozí volby níž.

## 1. Cestovné u akce mimo Prahu (#444)

- **Kalkulace PROJ** (horní karta): zaškrtávátko **Akce mimo Prahu**
  (`proj.zadani.akceMimoPrahu`); když je zapnuté, pole **Cena 1 výjezdu
  technika** (`proj.zadani.vyjezdKcPrepis`; prázdné = ceník, 0 = cestu
  neúčtujeme, ↺ vrací ceník).
- **Ceník nákladů PROJ → Doprava:** nová položka **Akce mimo Prahu – 1 výjezd
  technika** (`PC.vyjezdTechnikKc`, Kč). Starší zveřejněný ceník klíč nemá →
  0 → nic se nepřičte (žádné NaN). **J. V.: cenu výjezdu v ceníku vyplnit
  a zveřejnit** (skutečná cena do repozitáře nepatří).
- **Jádro (`engine_proj.js`, `vyjezdTechnikaKc`, `vyjezdPricti`):** výjezd
  se přičte k ceně sekce **po přirážce** (věta v nabídce říká „X Kč bez DPH“
  a X musí být přesně to, co se přičetlo), jen u sekce s nenulovým nákladem
  (vyřazená sekce se kvůli cestě nevrátí). `souhrn.vyjezd` nese součet.
  Krycí list PROJ, plán plateb, rekapitulace i SoD berou cenu sekce z jádra —
  cena činnosti s výjezdem je všude stejná. Sleva projekce se počítá z celé
  ceny činnosti (včetně výjezdu), jako u ostatních položek.
- **Texty** (online nabídka pod cenou činnosti; Word symboly):

  | činnost | věta | k ceně | symbol |
  |---|---|---|---|
  | ZAMĚŘENÍ | Cena zahrnuje i cestovní náklady na 1 výjezd technika na stavbu (X Kč bez DPH). | ano | `PROJ_CESTOVNE_ZAMERENI` |
  | STUDIE (SP, část 2) | totéž | ano* | `PROJ_CESTOVNE_SP` |
  | DPZ | totéž + Případné další cesty budou fakturovány individuálně. | ano | `PROJ_CESTOVNE_DPZ` |
  | IČ | Cena NEZAHRNUJE cestovní náklady – případné cesty budou fakturovány individuálně ve výši X Kč bez DPH za jeden výjezd. | ne | `PROJ_CESTOVNE_IC` |
  | KOLAUDACE | jako DPZ | ano | `PROJ_CESTOVNE_KOLAUDACE` |
  | AUTORSKÝ DOZOR | Cestovní náklady na každý 1 výjezd AD na stavbu (X Kč bez DPH) budou fakturovány individuálně. | ne | `PROJ_CESTOVNE_AD` |

  V Praze (vypnuto), bez ceny výjezdu, u nenabízené činnosti a u nenabízeného
  AD je symbol prázdný a blok ve Wordu zmizí.
- **Výchozí volba D2 (*):** zaměření je část 1 studie (jedna cesta na
  stavbu). Když se **zaměření počítá samostatně**, výjezd se přičte jen k němu
  a u studie věta není — jinak by zákazník platil tutéž cestu dvakrát. Bez
  samostatného zaměření se výjezd přičte ke studii. Změnit = `vyjezdSekceZ`
  v `src/engine_proj.js`.
- **Cizí jazyky:** EN/DE/FR výchozí znění v `src/preklad.js` (oddíl D2) — **do
  seznamu ke kontrole rodilými mluvčími**. Částka v eurech jako ostatní ceny.
- **Kontroly:** `vyjezdCenaChybi` (zapnuto, cena chybí v ceníku i u zakázky),
  `cestovneWordProj` (šablona Wordu bez `{{PROJ_CESTOVNE_…}}`).

### Šablona Wordu PROJ v8

D1 (`--proj-v7`) v integraci zatím není, proto vlastní krok:

```
node nastroje/vyrob_sablony.js --proj-v8 <složka se Sablona_NABIDKA_PROJ_v7.docx> [výstup]
```

Vstup v7 (D1); když ve složce není, vezme v6 a vypíše, že úpravy D1 výstup
nenese. Výstup `Sablona_NABIDKA_PROJ_v8.docx` + `_EN/_DE/_FR`. Pod tabulku
s `{{PROJ_CENA_ZAMERENI}}`, `{{PROJ_CENA_SP2}}`, `{{PROJ_CENA_DPZ}}`,
`{{PROJ_CENA_IC}}`, `{{PROJ_CENA_KOLAUDACE}}` a `{{PROJ_CENA_AD_BLOK}}` (uvnitř
bloku AD) vloží odstavec `{{PROJ_CESTOVNE_<X>}}` (Bezmezer, 9 pt kurzívou)
mezi `{{BLOK_CESTOVNE_<X>_ZAC/_KON}}`. Symbol ceny mimo právě jednu tabulku =
chyba, nic se nehádá. Skutečná šablona v sezení není (na Disku je v5; v6/v7
vyrábí J. V.) — ověřeno synteticky (`src/test_d2_proj_sikora.js`).
**J. V.: vyrobit v8 z v7 a nahrát v Nastavení → Šablony až po nasazení v20.10.4**
(starší aplikace symboly nezná a nechala by je viset).

## 2. Úvod „Naše NABÍDKA a doporučení“ (#445)

- Karta **Cenová nabídka (PROJ)** pod popisem záměru: pole úvodu předvyplněné
  jako dosud (podle nabízených činností), obchodník ho upraví; **↺ Vrátit
  výchozí**. Ruční text: `proj.zadani.uvodNabidkyRucne` (odstavce = řádky),
  s ním výchozí znění, ze kterého vycházel (`uvodNabidkyZaklad`).
- Když se po ruční úpravě změní nabízené činnosti: červená věta v kartě
  a kontrola `uvodProjNesedi` („ruční text nemusí sedět“). Text se nepřepíše.
- Zadání patří variantě → **zamčená varianta drží svůj text** (zápis přes
  `set()`, hlídá ho zámek).
- **Výchozí volba D2:** ruční text je česky a platí pro český dokument (online
  i Word `{{UVOD_NABIDKY_PROJ}}`); EN/DE/FR tisknou výchozí přeložený úvod.

## 3. Jednostupňová dokumentace (#446)

- Volba dosud neexistovala → nové zaškrtávátko **Jednostupňová dokumentace**
  v Kalkulaci PROJ (`proj.zadani.jednostupnova`).
- Kontrola `jednostupnovaProj` (upozornění, ne zábrana): nabídku je nutné
  upravit ve Wordu ručně — DPZ a DPS v jednom stupni (popis rozsahu a úvod),
  ceny DPZ a DPS, plán plateb, termíny. Nic se nepřepisuje ani nepřepočítává.

## Ke slučování

- `src/test_kontroly.js` — počet pravidel: integrace 37, D1 +1, D2 +4 → **42**.
- `nastroje/vyrob_sablony.js` — D1 přidává `--proj-v7` na stejná místa
  (exporty `module.exports`, seznam režimů); D2 má vlastní `hlavniV8()`.
- `src/nabidka_proj.js` — D1 mění `vRozsahu`, úvod bloku DPZ a návratový
  objekt (`blokyPryc`), D2 úvod a cenové bloky (`cestovne`) a návratový objekt
  (`uvod`, `vyjezdKc`) — sloučit obojí.
- CHANGELOG / `verze.txt` / `manual/obsah.json` — novější oddíl nahoru.
