# Šablona cenové nabídky OCK (CN) v18 — číslo stránky jako pole PAGE — CZ + EN + DE + FR (19. 11. 2026)

Dávka PG #4 (hlášení J. V. 19. 11. 2026: všechny stránky vytištěné CN mají číslo „1"; větev `claude/pg-tisk`).
Předchozí krok: `SABLONA_CN_V17_11_11.md`.

> **v18 = v17 + číslo stránky v záhlaví jako pole PAGE; v EN/DE/FR navíc přeložené popisky „IČ:" a „Tel.:" v bloku
> Kancelář (dávka SB, 21. 11. 2026, oddíl 7). Nic jiného.** Šablonu vyrobí a nahraje **J. V.** (firemní
> šablony v repozitáři nejsou). v18 nevyžaduje novou verzi aplikace — dá se nahrát na test i na main hned;
> upozornění v průvodci šablon (bod 4) přijde s verzí aplikace s dávkou PG.

## 1. Příčina (diagnostika testovacího sezení 19. 11. 2026)

- **CN OCK v9–v17** (všechny jazyky, test i main): v `word/header1.xml` je číslo stránky v textovém poli
  (`w:txbxContent`, v `mc:AlternateContent` dvakrát — tvar wps a záloha VML) napsané jako **pevný text „1"**, ne jako
  pole PAGE. Word ho nepřepočítá, každá stránka má „1".
- Generátor aplikace pole PAGE nerozbíjí: `src/test_pg_pole_page.js` (složená pole PAGE/NUMPAGES, kód ve dvou bězích,
  `fldSimple`, pole vedle symbolu, v tabulce zápatí a v záhlaví — vyplnění nabídky i smlouvy s tečkami, překlad
  EN/DE/FR i překlad + vyplnění, 46 kontrol). CN PROJ v8, SoD v6/v4 a plná moc mají PAGE a ten projde.

## 2. Co v18 mění

Běh s textem „1" v textovém poli záhlaví se nahradí polem:

```
fldChar begin · instrText " PAGE \* MERGEFORMAT " · fldChar separate · „1" · fldChar end
```

Každý z pěti běhů nese **vlastnosti původního běhu** (`w:rPr` — písmo, barva, velikost), takže číslo vypadá stejně.
Nahradí se v obou kopiích textového pole (wps i VML). Tělo dokumentu (`document.xml`), zápatí, styly a symboly se
nemění — nástroj to ověří (symboly v18 = v17, `document.xml` znak po znaku shodný, XML bez vad, pole PAGE nalezeno).

## 3. Výroba

```
node nastroje/vyrob_sablony.js --cn-v18 <složka s v17> <výstupní složka>
```

- Vstup: `Sablona_NABIDKA_CN_v17.docx` a `_EN`, `_DE`, `_FR` (zveřejněné v17 ze serveru — Nastavení → Šablony →
  stáhnout). Chybějící jazyk se přeskočí s poznámkou ve výpisu. **Každý jazyk se upraví přímo** (žádný překlad,
  revidované znění v17 zůstane).
- Výstup: `Sablona_NABIDKA_CN_v18.docx` (+ `_EN/_DE/_FR`). Výpis: „pole PAGE: 2× (textové pole záhlaví)" a ✓;
  ✗ nebo kód 1 = nenahrávat.
- Nástroj nic nehádá a odmítne: záhlaví, které pole PAGE už má; běh „1" v záhlaví mimo textové pole; víc běhů „1"
  v jednom textovém poli (nebo víc než dvě kopie); šablonu bez textového pole s „1". Pak je potřeba podívat se do
  šablony ručně (ve Wordu: dvojklik do záhlaví → textové pole → smazat „1" → Vložení → Číslo stránky → Aktuální pozice).

## 4. Upozornění v průvodci šablon

Nastavení → Šablony → průvodce (česká i jazyková verze CN): šablona **bez pole PAGE** v záhlaví i zápatí, která má
v záhlaví pevnou číslici, dostane upozornění *„Číslo stránky je pevný text („1" v záhlaví), ne pole PAGE — každá
vytištěná stránka bude mít „1". Opravte šablonu (… --cn-v18 …)."* Je to **upozornění, ne zábrana** — šablonu lze
zveřejnit. Funkce `docxCisloStranky` / `docxCisloStrankyVarovani` (`src/docxgen.js`), test `src/test_pg_cislo_stranky.js`.

## 5. Postup nahrání (J. V.)

1. Administrátor → **Nastavení → Šablony → Šablona cenové nabídky OCK (CN)** → „Nahrát novou českou verzi…" →
   `Sablona_NABIDKA_CN_v18.docx`. Kontrola průvodce: proti v17 **přibylo 0, ubylo 0**, jazyk čeština, bez vad,
   bez upozornění na číslo stránky.
2. Jazykové verze: nahrát `…_v18_EN/_DE/_FR.docx` → **Zveřejnit**.
3. Tabulka šablon: CN v18 a EN/DE/FR „✓ z v18", nic „zastaralá".
4. Zkouška: nabídka OCK s víc stránkami → Word CZ + EN → stránky 1, 2, 3… v záhlaví (ve Wordu i v PDF z Wordu).

## 7. EN/DE/FR: popisky IČ a Tel. v bloku Kancelář (dávka SB, 21. 11. 2026, NPT-N4 #691)

Rozhodnutí J. V.: jazyková CN měla v podpisovém bloku Kancelář pevný český text „IČ: …" a „Tel.: …", náhled je
překládá. `--cn-v18` je v EN/DE/FR přeloží **stejně jako náhled** — popisek se bere z `NW_TEXT.kIco/kTel` přes
`nwPreloz` (`src/nahled_word.js`, slovník `src/preklad.js`), ne natvrdo:

| jazyk | IČ | Tel. |
|---|---|---|
| EN | Company ID (IČ): | Phone: |
| DE | Identifikationsnummer (IČ): | Tel.: (beze změny) |
| FR | Numéro d’identification (IČ) : | Tél. : |

- Mění se jen úvodní popisek v prvním běhu dvou odstavců za nadpisem bloku (Office: / Büro: / Bureau :, rovněž ze
  slovníku) až do prvního prázdného odstavce; číslo, telefon, písmo, `w14:paraId` i zbytek těla zůstanou. Česká
  v18 se nemění. Výpis: „Kancelář: IČ: → Company ID (IČ):, Tel.: → Phone:".
- Nástroj nic nehádá: chybí nadpis bloku, popisek je dvakrát, je rozdělený mezi běhy nebo už přeložený = chyba.
- Řádek SVĚTLÍKY se do Wordu **nepřidává** (J. V.: nepotřebuje ho).
- Funkce `cnV18Kancelar` / `cnV18Soubor(bajty, popis, L)`, test `src/test_sb_kancelar.js`, mutace [SB].

## 8. Kontrola v PDF z LibreOffice (dávka SB)

Záhlaví CN v17 (test, všechny jazyky) má číslo stránky v **textovém poli VML** (`w:pict`/`v:textbox`, bez kopie wps).
LibreOffice pole v takovém textovém poli **nepřepočítá** a vytiskne uložený výsledek („1" na každé stránce) —
ověřeno podvrženým výsledkem „9", který LibreOffice vytiskl na všech stránkách. Word pole PAGE v textovém poli
přepočítá (stejně jsou postavená vestavěná čísla stránek Wordu „Okraje stránky"). Číslování v18 proto ověřuje
**Word** (bod 5.4: Word a PDF z Wordu); PDF z LibreOffice tady není doklad. Šablona PROJ (textové pole wps) čísluje
1, 2, 3… i v LibreOffice.

## 6. Vlastní řádek v SOUČÁSTÍ DODÁVKY NENÍ (PG #2)

Kotvu v šabloně nepotřebuje: řádek se klonuje za `{{TS_NENI_PRISTUP}}`, který v16 i v17 mají. v18 proto nic dalšího nenese.
