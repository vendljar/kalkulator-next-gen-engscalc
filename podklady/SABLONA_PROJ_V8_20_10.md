# Šablona nabídky PROJ (OVP-CN) v8 — CZ + EN + DE + FR (20. 10. 2026)

Artefakt pro J. V.: https://claude.ai/artifact/5RqvHSPuuun2dcUg26UwUD (v8 nahrazuje v7)

Dávka S10, druhé zadání (J. V. ~15:25 přes koordinaci: „nemám šablonu v8"). Větev
`claude/s10-sablona-proj-v7` + sloučená integrace `claude/integrace-16-10` (fa08e9c = test = v20.10.7,
obsahuje D2 a `--proj-v8`). Kód aplikace beze změny; konflikt ve `vyrob_sablony.js` jen v exportech
(oprava závorky S10 × `projV8`/`PROJ_V8_CESTOVNE` D2) — zachováno obojí. Předchozí krok: `SABLONA_PROJ_V7_20_10.md`.

> **v8 = v7 + věty o cestovném (D2).** Na **test** nahrát rovnou v8 (test už běží na v20.10.7).
> Na **main** až s v20.10.7 v main. Nahrávat **všechny čtyři najednou** průvodcem. v7 se nenahrává vůbec.

## 1. Soubory

| Soubor | Jazyk | Symbolů | base64 |
|---|---|---|---|
| `Sablona_NABIDKA_PROJ_v8.docx` | CZ | 113 | 1,40 MB |
| `Sablona_NABIDKA_PROJ_v8_EN.docx` | EN | 113 | 1,40 MB |
| `Sablona_NABIDKA_PROJ_v8_DE.docx` | DE | 113 | 1,40 MB |
| `Sablona_NABIDKA_PROJ_v8_FR.docx` | FR | 113 | 1,40 MB |

Soubory sezení S10 (`podklady/sablony_vystup/`, gitignore). Na Disk konektorem nejdou (~1,4 MB base64).

## 2. Výroba

`node nastroje/vyrob_sablony.js --proj-v8 <složka s v7 z S10>` → vstup `Sablona_NABIDKA_PROJ_v7.docx`
(skutečná šablona, ne syntetická). **Kotvy D2 sedly napoprvé** — každý z šesti symbolů ceny
(`PROJ_CENA_ZAMERENI`, `_SP2`, `_DPZ`, `_IC`, `_KOLAUDACE`, `_AD_BLOK`) je v právě jedné tabulce těla.
Jazykové verze přeložil tentýž nástroj z české v8 (s opravou závorky S10): přeloženo **195 z 206**
odstavců v každém jazyce, česky zůstalo nic (kromě zkratky „IČ" jako v v6/v7). Nadpis
„CENA ZA DOKUMENTACI PRO POVOLENÍ ZÁMĚRU (DPZ){{PROJ_DPZ_HVEZDICKA_ZNACKA}}:" je přeložený ve všech
třech jazycích (PRICE FOR THE DOCUMENTATION… / PREIS FÜR DIE UNTERLAGEN… / PRIX DU DOSSIER…).

**Místa vět o cestovném** (v každém jazyce stejně, ověřeno pořadím odstavců): blok
`{{PROJ_CESTOVNE_X}}` stojí hned pod tabulkou ceny své činnosti — zaměření, studie (za tabulkou SP1–SP3
a variantou), DPZ, IČ, kolaudace; u AD uvnitř bloku AD pod měsíční sazbou. Odstavec: styl „Bezmezer",
9 pt kurzívou.

## 3. Ověření (funkce serveru `sablony.mjs` a průvodce)

| Soubor | .docx | base64 ≤ 5 MB | `sablonaObsahVady` | XML | jazyk | proti CZ |
|---|---|---|---|---|---|---|
| v8 CZ | ano | 1,40 MB | prázdné | bez vad | cz 100 % | — |
| v8 EN | ano | 1,40 MB | prázdné | bez vad | en 100 % | +0 −0 |
| v8 DE | ano | 1,40 MB | prázdné | bez vad | de 96 % | +0 −0 |
| v8 FR | ano | 1,40 MB | prázdné | bez vad | fr 100 % | +0 −0 |

**v8 proti v7: přibylo přesně 18, ubylo 0** — `PROJ_CESTOVNE_ZAMERENI/SP/DPZ/IC/KOLAUDACE/AD`
a 12 značek `BLOK_CESTOVNE_<X>_ZAC/_KON`. Proti v6 (dnes na webech) tedy přibude 31 symbolů
(13 z v7 + 18 z v8) — přesně to má průvodce ukázat při nahrání na web s v6.

**Vyplnění kódem v20.10.7** (`docxVyplnSablonu` + `nabidkaProjData` jako `dokumentVygeneruj`, zkušební
ceník, výjezd 3 500 Kč / kurz 25 → 140 €), 16 kombinací CZ/EN/DE/FR × se studií / bez × Praha / mimo Prahu:

| | Praha | mimo Prahu |
|---|---|---|
| bez studie | 0 vět o cestovném, bloky zmizí | 3 věty: zaměření + DPZ („zahrnuje … Případné další cesty…"), IČ („NEZAHRNUJE … ve výši …") |
| se studií | 0 vět | 4 věty: zaměření, DPZ, IČ, kolaudace (studie výjezd nedostane — zaměření je část 1, jedna cesta) |

Ve všech 16 dokumentech **nezůstal žádný symbol v7 ani v8** (zbylé `PODM_SPLATNOST_DNI_CISLO`,
`PODM_PLATNOST_NABIDKY`, `ZPRAC_*` plní UI z krycího listu a profilu — v v6 stejně). Částky v CZ
„3 500,00 Kč bez DPH", v EN/DE/FR „€ 140" bez DPH. Bez studie žádná zmínka o studii. Věta u AD se
v zkušební zakázce netiskne (AD není v nabídce) — tu hlídá `test_d2_proj_sikora` (AD nabízený → věta, nenabízený → prázdno).

Testy nad sloučeným stromem: `test_d2_proj_sikora` 73/0, `test_d1_dpz_bez_studie` 92/0,
`test_sablona_proj_v7_preklad` 13/0, `test_sablona_proj_v6` se skutečnou v5 35/0,
`test_sablona_proj_v4` 33/0, `kontrola_udaju.py` čisté.

## 4. Starší verze aplikace

- **main v20.10.1 + v8:** jako u v7 (viz `SABLONA_PROJ_V7_20_10.md` bod 5) — viditelné `{{PROJ_TITUL_*}}`,
  `{{PROJ_DPZ_UVOD}}`, `{{PROJ_DPZ_HVEZDICKA*}}`, bez studie zůstane celá studie; navíc bloky cestovného
  (v20.10.1 je nezná, symbol nemá hodnotu) → v dokumentu zůstanou i `{{PROJ_CESTOVNE_*}}`.
  Přísný režim nezastaví. ⇒ **na main až s v20.10.7.**
- **v20.10.7 + stará v6/v7:** nabídka vznikne, ale věty o cestovném ve Wordu chybí (šablona nemá kam je dát).

## 5. Postup nahrání

0. Web běží na **v20.10.7 nebo novější** (test ano; main až po nasazení).
1. Administrátor → **Nastavení → Šablony → Šablona cenové nabídky PROJ (OVP-CN)** → „Nahrát novou
   českou verzi…" → `Sablona_NABIDKA_PROJ_v8.docx`. Kontrola: proti v6 **přibylo 31, ubylo 0**
   (proti v7 18), jazyk čeština, bez vad.
2. Krok jazykových verzí: nahrát `…_v8_EN/_DE/_FR.docx` z tohoto sezení (ne „vyrobit" v aplikaci — ta by
   nechala nadpis ceny DPZ česky, oprava `docxPrelozUseky` jde do příští kódové dávky) → **Zveřejnit**.
3. Tabulka šablon: OVP-CN v8 a EN/DE/FR „✓ z v8", nic „zastaralá".
4. Zkouška: zakázka PROJ v Praze a **mimo Prahu** (přepínač v zadání PROJ, cena výjezdu v ceníku PROJ
   zveřejněná), se studií i bez, Word CZ + EN — věty o cestovném pod cenami, žádné `{{PROJ_…}}`.

## 6. Ke kontrole rodilými mluvčími

Texty v7 viz `SABLONA_PROJ_V7_20_10.md` bod 7 (titul bez studie potvrdil J. V. 20. 10.). Věty o cestovném
(D2, `NABIDKA_PROJ_CESTOVNE` v `src/nabidka_proj.js` + slovník) jsou strojový překlad — ke kontrole
rodilými mluvčími, např. DE „Der Preis beinhaltet auch die Reisekosten für 1 Fahrt eines Technikers zur
Baustelle (€ 140 ohne MwSt.)", FR „Le prix comprend également les frais de déplacement pour 1 visite d'un
technicien sur le chantier (€ 140 HT)".

## 7. Znovu vyrobit

```
node nastroje/vyrob_sablony.js --proj-v6 <podklady s v5> <podklady>
node nastroje/vyrob_sablony.js --proj-v7 <podklady> <podklady>
node nastroje/vyrob_sablony.js --proj-v8 <podklady> <výstup>
```
