# Předávka — větev `claude/etapa-b-plan-plateb-proj` (29. 9. 2026 večer)

Etapa B platebních podmínek (úkol 2 ze sezení
https://claude.ai/code/session_01XFo3AzDzkjt8xGnMVH53p7). Větev vznikla
z `origin/test-draft` **57ebc02** (v29.9.4). Pushuje se jen sem; o sloučení
do `test-draft` rozhoduje J. V. Předávka `test-draft` (stav větví, pravidla,
zadání obou úkolů) je v `git show 57ebc02:PREDAVKA.md`.

## Zadání (beze změny z úkolu 2)
Podklady: `podklady/NAVRH_PLATEBNI_PODMINKY_2026-09-29.md` oddíl 3 (koncept)
a 7 (rozhodnutí J. V. 29. 9.), roadmapa **#367** (etapy B a A) a **#366**
(bod P9.3 dopočet SoD PROJ patří do etapy B), klikací prototyp
https://claude.ai/artifact/6sbxbaAsBpphfPfE2wnM3a (chování krycího listu
PROJ, texty, dopočet a sčítání plateb). Rozhodnuto: čtyři předvolby —
Standard po činnostech (= dnešní procenta v `src/nabidka_proj.js`), Záloha +
zbytek po předání (= dnešní krycí list PROJ, 30/50/70 % nebo bez), 100 % po
dokončení stupně (= dnešní Nastavení → Firma), Vlastní; výchozí Standard.
Splátky SoD PROJ se stejným milníkem se sečtou do jedné platby. Šablona SoD
PROJ dostane seznam plateb jedním symbolem místo 8 pevných SODP_PLATBA1–8_KC.
Postup: Pravidlo 0 → test, který bez opravy selže → oprava → commit po
bodech; build; celé kolo `nastroje/testovaci_kolo.sh`; CHANGELOG, roadmapa
(#367: etapa B hotová, etapa A zbývá), PREDAVKA. Etapy A a C až na pokyn
J. V. (u C chybí poslední číslo papírových smluv OPR a OVP).

## Stav

| Krok | Stav | Commit | Poznámka |
|------|------|--------|----------|
| Rozbor kódu a návrh | ✅ | ab75234 | `podklady/ETAPA_B_PODKLAD_2026-09-29.md` (254 ř.) — místa zapojení se soubory a řádky, datový model, dotčené testy, Q1–Q12 |
| 1. Jádro `src/plan_plateb.js` | ✅ | ab75234 (v29.9.5) | předvolby, katalog 14 milníků, dopočet, sčítání, kontroly, převod `sodpPlatba1–8`; `src/test_plan_plateb.js` 0/1 → 36/0; CORE za `zpracovatel.js` |
| 2. Firma: `planPlatebProj` (výchozí, validace, zveřejnění, UI ve Smluvních standardech) | ⬜ | | podklad 3.3; `firma.js` 69, 270–281, 461–551 (mutace `firma.mjs:46–48` páruje přesný text — neměnit) |
| 3. Krycí list PROJ: editor plánu, pseudo-pole pro tisk, „SoD — splátky" s dopočtem a přepisem, snímek `zmrazenoPlan` při zamčení | ⬜ | | podklad 3.2, 3.5; `kryci_proj.js` 190–290, 323–420; `ui/kryci_proj_ui.js`; `ui/zamek_ui.js` (nové settery do `ZAMEK_CHRANENE`) |
| 4. Nabídka PROJ online + Word z plánu (`{typ:'platby'}`, `PROJ_PLATBY_*`), šablona PROJ v4 + EN/DE/FR (`nastroje/vyrob_sablony.js`) | ⬜ | | podklad 3.5; zamčená bez snímku → dnešní pevné bloky (kopie) |
| 5. SoD PROJ: `SODP_PLATEBNI_KALENDAR` (jeden symbol), `sablonaSymboly:true`; úprava šablony SoD PROJ | ⬜ | | bez `Sablona_SOD_PROJEKCE.docx` z Disku jen dopočet + symbol, šablonu upraví J. V. (napsat) |
| 6. Zábrany (`planPlateb100`, `planPlatebSoucet` v `kontroly.js`, brána `dokumentZabrana`) | ⬜ | | podklad 3.6 |
| 7. Převod starších zakázek (líně, bez zápisu v importu; `zaloha`, `fakt*`, `sodpPlatba1–8`) | ⬜ | | podklad 3.7; jádro převodu hotové (`planPlatebZeStarych`) |
| 8. Testy dotčené + nové, celé kolo, CHANGELOG, roadmapa #367 „etapa B hotová" | ⬜ | | podklad oddíl 4 |

## Výchozí návrhy použité v jádru (čekají na potvrzení J. V.)
- Q1 projednání: 100 % „po předání vyjádření odboru památkové péče HMP".
- Q2 geodet: 100 % „po předání geodetického zaměření".
- Q4 splátky na celé koruny, poslední splátka činnosti dorovná (i haléře).
Ostatní otázky Q3, Q5–Q12 viz podklad oddíl 5 (výchozí odpovědi kurzívou) —
Q11 = dodat `Sablona_SOD_PROJEKCE.docx` (#350) a potvrdit formát řádku
seznamu plateb.

## Upozornění pro další sezení
- **Čísla verzí:** tahle větev má v29.9.5 (z test-draft v29.9.4); větev
  `claude/oprava-sesti-nalezu-v29.9.1` má vlastní v29.9.2–v29.9.7. Při
  slučování do test-draft srovná pořadí `build.py`.
- **Konflikty s větví oprav** (podklad oddíl 5): `kontroly.js` (počet
  pravidel — tam přibylo `zapornaPolozka`), `docxgen.js` (B99), `uloziste.js`,
  `zakazka_kontrola.mjs`, `build.py` CORE (tam `sablona_obsah.js`, tady
  `plan_plateb.js`), `mutace.mjs`, roadmapa (tam #373, #374 — tady žádné nové
  číslo, jen poznámka u #367).
- Podklady z Disku (mimo repo): CN v13 + EN/DE/FR, PROJ v3 (test-draft ji
  podporuje), SoD realizace/projekce, plná moc, příručka (přepsat číslo
  verze — krok 0.7). `ADMIN_EMAIL=spravce@priklad.cz`, symlink
  `node_modules/playwright`. Mutace jen jeden běh naráz, nikdy nepřerušit.

## Další krok
Krok 2 (Firma) a 3 (krycí list PROJ) podle podkladu; každý bod: test, který
bez změny selže → změna → commit. Doporučeno **nové sezení** s oddílem
„ÚKOL 2 — ETAPA B" z promptu a touto předávkou (větev už existuje, pokračovat
na ní).
