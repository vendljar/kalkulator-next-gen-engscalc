# Předávka — větev `claude/etapa-b-plan-plateb-v30.9.1` (30. 9. 2026)

Etapa B platebních podmínek (plán plateb PROJ, roadmapa **#367**, bod P9.3
z **#366**). Pokyn J. V. 30. 9. 2026: „pokračuj etapou B v nové větvi, vše
potřebné předej a výstup pošli zatím do test-draft" — J. V. mezitím testuje
v30.9.1 na `test`. Větev vznikla z `test-draft` **fde25ff** (v30.9.1, se
sloučenými opravami šesti nálezů); pushuje se sem, **po dokončení a zeleném
celém kole se sloučí do `test-draft`** (ne do `test`). Stará větev
`claude/etapa-b-plan-plateb-proj` (z v29.9.4) je tímhle nahrazená — krok 1
z ní je přenesený; J. V. ji smaže, až bude etapa v `test-draft`.
Předávka `test-draft` (stav větví, co čeká na J. V.) je v
`git show origin/test-draft:PREDAVKA.md`.

## Zadání
Podklady: `podklady/NAVRH_PLATEBNI_PODMINKY_2026-09-29.md` oddíl 3 (koncept)
a 7 (rozhodnutí J. V. 29. 9.), **`podklady/ETAPA_B_PODKLAD_2026-09-29.md`**
(rozbor kódu, datový model, místa zapojení, testy, otázky Q1–Q12 — čísla
řádků jsou z v29.9.4), klikací prototyp
https://claude.ai/artifact/6sbxbaAsBpphfPfE2wnM3a (záložka „Krycí list
PROJ": editor plánu, tabulka plateb SoD, texty nabídky). Rozhodnuto: čtyři
předvolby — Standard po činnostech (= dnešní procenta v
`src/nabidka_proj.js`), Záloha + zbytek po předání (0/30/50/70 %), 100 % po
dokončení stupně, Vlastní; výchozí Standard. Splátky SoD PROJ se stejným
milníkem se sečtou do jedné platby, dopočet = procento × cena činnosti po
slevě, poslední splátka nese zaokrouhlení, ruční přepis částky zůstává,
zábrany (100 % u činnosti, součet plateb = cena díla). Šablona SoD PROJ
dostane seznam plateb jedním symbolem místo `SODP_PLATBA1–8_KC`. Převod
starších zakázek bez ztráty ručních částek. Etapy A a C až na pokyn J. V.

## Stav

| Krok | Stav | Commit | Poznámka |
|------|------|--------|----------|
| 1. Jádro `src/plan_plateb.js` + `src/test_plan_plateb.js` | ✅ | 0fff2d1 | přeneseno ze staré větve (ab75234); 36/36; CORE za `zpracovatel.js` |
| 2. Firma: `planPlatebProj` (výchozí, validace, zveřejnění, UI ve Smluvních standardech) | ⬜ | | podklad 3.3 |
| 3. Krycí list PROJ: editor plánu, tisk, „SoD — splátky" s dopočtem a přepisem, snímek `zmrazenoPlan` | ⬜ | | podklad 3.2, 3.5 |
| 4. Nabídka PROJ online + Word z plánu, šablona PROJ v4 + EN/DE/FR | ⬜ | | podklad 3.5 |
| 5. SoD PROJ: `SODP_PLATEBNI_KALENDAR`, `sablonaSymboly:true` | ⬜ | | `Sablona_SOD_PROJEKCE.docx` je v podkladech z Disku |
| 6. Zábrany (`planPlateb100`, `planPlatebSoucet`, brána dokumentu) | ⬜ | | podklad 3.6 |
| 7. Převod starších zakázek | ⬜ | | podklad 3.7 |
| 8. Testy, celé kolo, CHANGELOG, roadmapa #367, sloučení do `test-draft` | ⬜ | | |

## Výchozí návrhy (čekají na potvrzení J. V.)
Q1 projednání 100 % „po předání vyjádření odboru památkové péče HMP";
Q2 geodet 100 % „po předání geodetického zaměření"; Q4 splátky na celé
koruny, poslední splátka činnosti dorovná (i haléře). Ostatní Q3, Q5–Q12
v podkladu oddíl 5 (výchozí odpovědi kurzívou) — používají se, dokud J. V.
neřekne jinak.

## Prostředí
- Podklady mimo repozitář: `/home/user/kng_podklady` (CN v13 + EN/DE/FR,
  **PROJ v3** jako `Sablona_NABIDKA_PROJ.docx`, SoD realizace/projekce, plná
  moc, příručka s číslem verze — skript
  `scratchpad/manual_verze.sh`). V novém sezení stáhnout konektorem Disku.
- `ADMIN_EMAIL=spravce@priklad.cz`, symlink `node_modules/playwright`.
  Mutace jen jeden běh naráz na pozadí, nikdy nepřerušit; potom
  `git status` a `grep -rn "if (false)" netlify src`.

## Další krok
Krok 2 (Firma) podle podkladu 3.3; každý bod: test, který bez změny selže →
změna → commit.
