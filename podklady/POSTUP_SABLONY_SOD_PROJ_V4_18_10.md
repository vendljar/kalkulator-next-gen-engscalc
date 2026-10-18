# Šablona SoD projekce v4 — rozsah díla podle nabídky (#380 Q7)

Dávka V5 (v18.10.3, větev `claude/v5-sod-proj-rozsah`), 18. 10. 2026.
Rozhodnutí J. V. 17. 10. 2026: varianta B — rozsah díla z nabízených činností.
Odkud aplikace šablony bere a proč nejsou v repozitáři: `POSTUP_SABLONY_SOD_15_10.md`.

## 1. Co se změnilo proti v3

| Místo | v3 | v4 |
|---|---|---|
| Příloha č. 1 | „… na vypracování dokumentace DPZ+DSP včetně zajištění inženýringu tj. zajištění vydání povolení záměru včetně nabytí právní moci – objekt …" | „… na činnosti: `{{SODP_ROZSAH_DILA}}` – objekt …" |
| Čl. II Předmět díla | 7 činností natvrdo | každá ve značkách `{{CIN_<X>_ZAC}}` / `{{CIN_<X>_KON}}` |
| Čl. III Termíny plnění | 7 termínů natvrdo | totéž; věta o předání díla (2 paré) ve značkách není |
| Čl. VII odkaz „dle odst. 5." | — | beze změny: odst. 5 je odstavec o potvrzení oznámení poštou (ověřeno číslováním) |

Značky: `CIN_ZAMERENI`, `CIN_DPZ`, `CIN_IC_DOSS`, `CIN_POVOLENI`, `CIN_DPS`, `CIN_EZC`,
`CIN_VYBER`. Které sekce Kalkulace PROJ činnost drží: zaměření → zaměření, DPZ → DPZ,
IČ → IČ DOSS i podání a vyřízení povolení, DPS → DPS, EZČ → EZČ i výběr dodavatele
(stejně jako věty plateb staré šablony, K18-N101). Odstavce značek jsou v šabloně drobné
šedé — do smlouvy se nikdy nedostanou.

## 2. Výroba (pokud soubor nemáte)

1. Stáhnout `Sablona_SOD_PROJEKCE_v3.docx` (Disk, ID `113i9u-jFIKcB1QvlIRsSHgq4rBJ6-IW2`)
   do samostatné složky mimo repozitář; ověřit `python3 -c "import zipfile;print(zipfile.ZipFile('…').testzip())"` → `None`.
2. `node nastroje/vyrob_sablony.js --sod-proj-v4 <složka> [výstupní složka]` — vypíše
   „✓ Sablona_SOD_PROJEKCE_v4.docx — symbolů 56 (vstup 41), značek činností 14 … XML: bez vad".
3. Kontrola testem: `KNG_PODKLADY=<složka s v3 a v4> node src/test_sod_proj_rozsah.js`.

Sezení V5 soubor vyrobilo (z v3 staženého z Disku, testzip v pořádku) a přiložilo ho
k sezení; do repozitáře nepatří (firemní text).

## 3. Nasazení (udělá J. V.)

1. Nahrát `Sablona_SOD_PROJEKCE_v4.docx` na Disk vedle v3 (Kalkulator NextGen / Sablony),
   v3 nepřepisovat.
2. V aplikaci (test i ostrá zvlášť), jako administrátor: **Nastavení → Šablony → Šablona
   smlouvy o dílo — PROJEKČNÍ PRÁCE → „Nahrát novou českou verzi…"** → vybrat v4. Krok
   Kontrola musí ukázat „Proti platné verzi: přibylo SODP_ROZSAH_DILA, CIN_…" (rozsah
   a 14 značek) a nic nechybí → **Zveřejnit**.
3. Zkouška: zakázka PROJ, v Kalkulaci PROJ jen DPZ + IČ + DPS → krycí list PROJ →
   „Vytvořit smlouvu o dílo PROJ (Word)":
   - čl. II: a) Dokumentace pro povolení záměru, b) Inženýrská činnost DOSS,
     c) Podání žádosti …, d) Dokumentace pro provedení stavby;
   - čl. III: bez zaměření, EZČ a výběru dodavatele, věta o předání díla zůstává;
   - příloha č. 1: „… na činnosti: dokumentace pro povolení záměru, inženýrská činnost
     DOSS, podání žádosti na příslušný stavební úřad a vyřízení povolení záměru
     a dokumentace pro provedení stavby – objekt …".
4. Jazykové verze (EN/DE/FR, dávka V3) přegenerovat z v4 nástrojem
   `nastroje/preklad_sod.js` a nahrát jako jazykové verze téže šablony — do té doby se
   cizojazyčná SoD chová jako v3.

## 4. Meze

- Studie, projednání studie, kolaudace a geodetické zaměření v předmětu díla šablony
  nejsou — výčet je nebere; případně se dopíší ve Wordu.
- Nabídka bez kterékoli ze sedmi činností nechá `{{SODP_ROZSAH_DILA}}` ve Wordu vidět.
- Po vypuštění poslední odrážky čl. II (výběr dodavatele) navazuje další odstavec bez
  mezery — stejně jako ve v3 za výběrem dodavatele.
