# Šablony smluv o dílo — odkud je aplikace bere a jak se nová verze dostane k uživatelům

Dávka S9 (v15.10.11, větev `claude/sod-proj-cislo`), 15. 10. 2026. Zadání J. V.:
„Aktualizuj šablony, aby se nám do nich číslo SoD propisovalo z krycího listu
zakázky ve chvíli, kdy tam bude vyplněné."

## 1. Odkud aplikace šablony SoD bere

- **Jen ze serveru — centrální šablony (#139, `src/sablony_online.js`).**
  Šablona každého typu dokumentu (`sod` = SoD realizace, `sodProj` = SoD
  projekce, `plnaMoc`, nabídky) leží v online úložišti aplikace jako číslovaná
  verze s otiskem, jménem souboru, kdo ji zveřejnil a kdy. Všichni přihlášení
  tisknou z platné (naposledy zveřejněné) verze. Režim `prisny` (výchozí):
  bez serverové šablony smlouva nevznikne; `mekky` (přepne jen admin) dovolí
  nouzově vybrat soubor z disku.
- **Repozitář šablony nemá** (firemní texty). `nastroje/vyrob_sablony.js`
  z nich vyrábí nové verze (v2 se seznamem plateb, nově v3 s číslem smlouvy),
  ale do aplikace je nenahrává.
- **Google Disk je archiv a zdroj podkladů pro testy** (`KNG_PODKLADY`,
  `nastroje/harness_podklady.mjs`), aplikace z něj nečte:

  | Soubor | Složka (Kalkulator NextGen /) | ID |
  |---|---|---|
  | Sablona_SOD_PROJEKCE.docx (v1) | Output documents | 1bMFlWscMw0bmHEkJBFJKN1-XFQR3-OVF |
  | Sablona_SOD_PROJEKCE_v2.docx | Sablony | 13Q_T96MyQ6W521u-_ptCQFEGYVah_Iv5 |
  | Sablona_SOD_REALIZACE.docx (v1) | Output documents | 1qpLkct4xFY2ufzJEsD1w8oN9U4JPzZ1z |
  | Sablona_SOD_REALIZACE_v2.docx | Sablony | 1-Snm0dDVlV6IeYj_97QEutJg-brox6Ti |
  | Sablona_PLNA_MOC.docx | Output documents | 1_JIgInHn2cCkqwqDfIJy8XE_sypHGTGG |

  (Složka Output documents 1id4nUybzvgHuaUeaJ-GjVVMMGHuAdITl, Sablony
  1RDW2m9p-OzDScADrhSi0H8ef6Mq_gyh7.)

## 2. Co se změnilo

SoD realizace má pod nadpisem řádek „číslo {{SOD_CISLO_SMLOUVY}}"; SoD
projekce ho neměla. `node nastroje/vyrob_sablony.js --sod-proj-cislo <složka>`
vloží stejný řádek pod nadpis „SMLOUVA O DÍLO / na zhotovení projektové
dokumentace" (zarovnání a písmo podtitulu, symbol v jednom běhu):

- `Sablona_SOD_PROJEKCE_v2.docx` → **`Sablona_SOD_PROJEKCE_v3.docx`** (tuhle zveřejnit),
- `Sablona_SOD_PROJEKCE.docx` → `Sablona_SOD_PROJEKCE_v1_cislo.docx` (stará řada
  s osmi pevnými platbami — jen pro úplnost, nezveřejňovat).

Aplikace se nemění: pole „Číslo SoD" krycího listu PROJ symbol plní od
v15.10.9 (S7); prázdné pole nechá `{{SOD_CISLO_SMLOUVY}}` ve Wordu vidět
k doplnění.

## 3. Jak nová šablona začne platit (udělá J. V.)

1. Vyrobit soubory (pokud je nevyrobilo sezení — viz bod 4): stáhnout
   `Sablona_SOD_PROJEKCE.docx` a `Sablona_SOD_PROJEKCE_v2.docx` do jedné složky a
   `node nastroje/vyrob_sablony.js --sod-proj-cislo <složka>`; skript vypíše
   „✓ … přibyl řádek číslo {{SOD_CISLO_SMLOUVY}}, XML bez vad".
2. Nahrát nové soubory na Disk vedle původních (v3 do „Sablony", v1_cislo do
   „Output documents"); původní nepřepisovat.
3. V aplikaci (test i ostrá zvlášť), jako administrátor: **Nastavení → Šablony
   → Šablona smlouvy o dílo — PROJEKČNÍ PRÁCE → „Nahrát novou českou verzi…"**
   → vybrat `Sablona_SOD_PROJEKCE_v3.docx`. Krok Kontrola musí ukázat
   „Proti platné verzi: přibylo SOD_CISLO_SMLOUVY" a nic nechybí → **Zveřejnit**.
   Jazykové verze smlouva nemá (jen česky).
4. Zkouška: zakázka PROJ, krycí list PROJ → Číslo SoD „2026 OVP SOD 0001",
   „Vytvořit smlouvu o dílo PROJ (Word)" → pod nadpisem „číslo 2026 OVP SOD 0001".

## 4. Proč sezení S9 soubory na Disk nenahrálo

Konektor Google Drive vrací obsah .docx jako base64 do výsledku nástroje;
u souborů nad ~20 kB ho harness uloží do souboru v adresáři sezení, ale čtení
toho souboru z kontejneru zamítl automatický strážce oprávnění (subagent dostal
„PII Data Handling", hlavní sezení „Auto-Mode Bypass"). Ruční přepis base64
(16–390 kB) spolehlivě nejde (subagent u v1 udělal chybu, testzip ji odhalil).
Bez původních bajtů nejde novou šablonu vyrobit ani nahrát — nic se nehádá.
Další sezení to zvládne, když J. V. povolí čtení uložených výsledků konektoru,
nebo když šablony vloží do kontejneru / větve; pak stačí body 1–2.
