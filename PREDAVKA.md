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
https://claude.ai/artifact/6sbxbaAsBpphfPfE2wnM3a. Rozhodnuto: čtyři
předvolby — Standard po činnostech (= dosavadní procenta nabídky PROJ),
Záloha + zbytek po předání (0/30/50/70 %), 100 % po dokončení stupně,
Vlastní; výchozí Standard. Splátky SoD PROJ se stejným milníkem se sečtou,
dopočet = procento × cena činnosti po slevě, poslední splátka nese
zaokrouhlení, ruční přepis zůstává, zábrany (100 % u činnosti, součet =
cena díla). Šablona SoD PROJ se seznamem plateb jedním symbolem. Převod
starších zakázek bez ztráty ručních částek. **Etapy A a C až na pokyn J. V.**

## Stav

| Krok | Stav | Commit | Poznámka |
|------|------|--------|----------|
| 1. Jádro `src/plan_plateb.js` + test | ✅ | 0fff2d1 | přeneseno ze staré větve; CORE za `zpracovatel.js` |
| 2. Firemní plán (`NAST.firma.planPlatebProj`, Nastavení → Smlouvy / Šablony, zveřejnění, kontrola tvaru) | ✅ | f871f04 | `src/ui/plan_plateb_ui.js`, `firmaLzeZverejnit` |
| 3. Krycí list PROJ: karta Plán plateb, „SoD — splátky" s dopočtem a přepisem, tisk, snímek `zmrazenoPlan` | ✅ | f5e2bd0 | `src/kryci_proj.js`, zámek (`ZAMEK_CHRANENE`) |
| 4. Nabídka PROJ online + Word z plánu, šablona PROJ v4 (+EN/DE/FR) | ✅ | e4751cd | `nabidkaProjCeny`/`nabidkaProjPlatby`, `nastroje/vyrob_sablony.js --proj-v4` |
| 5. SoD PROJ: `{{SODP_PLATEBNI_KALENDAR}}`, most na starou šablonu | ✅ | 40a44da | `src/sod.js`, `rozvinOdstavceZaRadek` v `docxgen.js`, `--sod-proj` |
| 6. Zábrany `planPlateb100`, `planPlatebSoucet`, varování `planPlatebWordProj`, brána `dokumentZabrana(typ)` | ✅ | 40a44da | pravidel kontroly 27 |
| 7. Převod starších zakázek (`sodpPlatba1–8`, záloha tlačítkem) | ✅ | 40a44da | nic se nepřepisuje samo |
| 8. Mutace (+5 jádro, +1 server), příručka, sestavení v30.9.2, CHANGELOG, roadmapa | ✅ | 2d4f6f4 + sestavení | celé kolo: viz CHANGELOG v30.9.2 |
| 9. Celé kolo zelené → fast-forward `test-draft` | ⏳ | | `test` se nemění |

## Šablony pro J. V. (nejsou v repozitáři)
Vyrobené z podkladů Disku nástrojem `nastroje/vyrob_sablony.js`, poslané
J. V. v sezení (SendUserFile), nahrát v aplikaci Nastavení → Šablony:
- `Sablona_NABIDKA_PROJ_v4.docx` + `_EN`, `_DE`, `_FR` (61 symbolů) —
  platební podmínky po činnostech ze symbolů `{{PROJ_PLATBY_*}}`. Dokud je
  nahraná v3, nabídka PROJ dál vychází (staré bloky), jen při plánu jiném
  než Standard kontrola varuje (`planPlatebWordProj`).
- `Sablona_SOD_PROJEKCE_v2.docx` (39 symbolů) — `{{SODP_PLATEBNI_KALENDAR}}`.
  Se starou šablonou (osm pevných plateb) smlouva vznikne, jen když plán
  jde do starých řádků; jinak se zastaví s vysvětlením.
Znovu vyrobit: `node nastroje/vyrob_sablony.js --proj-v4 <podklady>`
a `--sod-proj <podklady>` (podklady = složka se `Sablona_NABIDKA_PROJ.docx`
v3 a `Sablona_SOD_PROJEKCE.docx`).

## Výchozí návrhy (čekají na potvrzení J. V.)
Q1 projednání 100 % „po předání vyjádření odboru památkové péče HMP";
Q2 geodet 100 % „po předání geodetického zaměření"; Q4 celé koruny,
poslední splátka činnosti dorovná; Q5 dřívější záloha se nepřepíná sama,
nabídne se tlačítkem; Q8 Standard se v Nastavení mění převzetím z otevřené
zakázky; Q9 nové texty přes slovník překladů, vlastní milník zůstává česky
(bez varování); Q10 „způsob fakturace" plyne z předvolby (pole jen
u starších odeslaných); Q11 řádek smlouvy „Platba ve výši … + DPH proběhne
…"; Q12 řádky nabídky „Platba {milník} | N % z nabídkové ceny za
{činnost}". Server zatím nekontroluje tvar `planPlateb` ve variantě (jen
firemní plán) — možné navazující zpřísnění.

## Prostředí
- Podklady mimo repozitář: `/home/user/kng_podklady` (CN v13 + EN/DE/FR,
  PROJ v3 jako `Sablona_NABIDKA_PROJ.docx`, SoD realizace/projekce, plná
  moc, příručka s číslem verze — skript `scratchpad/manual_verze.sh`).
  V novém sezení stáhnout konektorem Disku.
- `ADMIN_EMAIL=spravce@priklad.cz`, symlink `node_modules/playwright`.
  Mutace jen jeden běh naráz na pozadí, nikdy nepřerušit; potom
  `git status` a `grep -rn "if (false)" netlify src`.

## Další krok
Po zeleném kole fast-forward `test-draft` na hlavu větve (ověřit, že
`origin/test-draft` je pořád fde25ff). Pak čekat na J. V.: potvrzení
výchozích návrhů, nahrání šablon, pokyn k etapě A (OCK platební kalendář)
a C (číslo smlouvy, #366), sloučení do `test`.
