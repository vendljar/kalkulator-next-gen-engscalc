# D1 — postřehy D. Sikory z 19. 10. 2026 („online kalkulak“)

Dávka D1, verze **v20.10.3**, větev `claude/d1-sikora` (nad `claude/integrace-16-10` 5dc28d1, v20.10.1).
Návrh k bodu 3 je v samostatné větvi `claude/d1-sikora-navrh-profily` (o jeden commit dál, **nesloučit**).
Roadmapa #440–#443 (předběžná id, přidělí koordinace). Částky níž jsou ze **zkušebního ceníku** (smyšlené).

| # | Postřeh | Stav |
|---|---|---|
| 1 | Nabídka PROJ bez studie: věta „DPZ navazuje na vzájemně odsouhlasenou STUDII PROVEDITELNOSTI. Ta …“ | ✅ opraveno (online, Word v7, EN/DE/FR) — #440; další místa se studií čekají (Q1–Q3, #441) |
| 2 | OCK — předpočítaná šířka bočního světlíku 600 mm | ⬜ rozbor hotový, chyba není jednoznačná → varianty A–C k rozhodnutí (#442) |
| 3 | Dimenze profilů portálu EXT / INT | ⬜ nic se neměnilo; návrh + dopad + otázky, kód ve větvi návrhu (#443) |

---

## 1. Nabídka PROJ bez studie proveditelnosti (opraveno)

**Pravidlo:** úvod bloku DOKUMENTACE PRO POVOLENÍ ZÁMĚRU (DPZ) se odkazuje na studii jen tehdy,
když má **studie** v nabídce cenu (samotné projednání bez studie nestačí — věta mluví
o odsouhlasené studii):

- se studií: „Dokumentace pro povolení záměru (DPZ) navazuje na vzájemně odsouhlasenou STUDII
  PROVEDITELNOSTI. Ta rozpracovává dokumentaci dle platné vyhlášky do legislativou požadované
  úrovně s autorizacemi inženýrů dle příslušných oborů. Dokumentace pro povolení záměru obsahuje
  tyto části:“
- bez studie: „Dokumentace pro povolení záměru (DPZ) rozpracovává dokumentaci dle platné vyhlášky
  do legislativou požadované úrovně s autorizacemi inženýrů dle příslušných oborů. Dokumentace pro
  povolení záměru obsahuje tyto části:“

**Kde:**
- online nabídka — `src/nabidka_proj.js` (`NABIDKA_PROJ_DPZ_UVOD`, odstavec úvodu nese sekci
  `studie` a znění `jinak`). Souvislá próza úvodů zůstává v online EN/DE/FR česky jako dosud
  (`test_proj_zbytky_preklad.js`).
- Word — nový symbol `{{PROJ_DPZ_UVOD}}` v jazyce dokumentu (EN/DE/FR ze slovníku, `src/preklad.js`).
  Šablona **PROJ v7** vznikne z v6 nástrojem:
  `node nastroje/vyrob_sablony.js --proj-v7 <složka se Sablona_NABIDKA_PROJ_v6.docx> [výstup]`
  → `Sablona_NABIDKA_PROJ_v7.docx` + `_EN/_DE/_FR` (odstavec úvodu DPZ nahradí jediný symbol,
  písmo a odstavec zůstávají; skript ověří XML a symboly a při nečekané stavbě skončí chybou).
  Ve skutečné šabloně v5 (Disk, ověřeno čtením) stojí věta v buňce tabulky „DPZ“ v jednom odstavci.
  **Šablonu v7 vyrobí a nahraje J. V.** (Nastavení → Šablony), v sezení v6 k dispozici nebyla.
- kontrola `dpzUvodWordProj` (varování, ne zábrana): studie se nenabízí, DPZ ano a nahraná šablona
  PROJ nemá `{{PROJ_DPZ_UVOD}}` → „Nahrajte šablonu nabídky PROJ v7, nebo větu ve Wordu upravte ručně.“

**Testy:** `src/test_d1_dpz_bez_studie.js` 51 kontrol (online CZ se studií / bez / jen projednání,
symbol CZ/EN/DE/FR, slovník, `--proj-v7` na syntetickém XML vč. chyb, kontrola); pojistka —
před opravou selže na prvním testu. Cílené mutace „D1: …“ **13/13**. `test_kontroly` a
`overit_lista` počítají 38 pravidel.

### Další místa, která se odkazují na studii, i když se nenabízí (neměněno — rozhodnutí J. V.)

- **Q1 — hvězdička ceny DPZ** „* Cena je platná v případě návaznosti na STUDII PROVEDITELNOSTI.“
  (online i Word pevně). Bez studie zní jako „cena neplatí“.
  **Doporučení:** bez studie vynechat (online podmínkou, Word symbolem v příští šabloně).
  *(Alternativa: nechat — cena DPZ bez studie by pak měla být jiná.)*
- **Q2 — termín DPZ** z Nastavení → Firma: „Zpracování dokumentace pro dotčené orgány (hrubopis DPZ)
  – do 10–12 týdnů **od schválení studie investorem** a objednání“.
  **Doporučení:** bez studie znění „do 10–12 týdnů od objednání a předání podkladů“ (druhý text
  ve Firmě, vybírá se podle studie).
- **Q3 — Word tiskne studii pevně:** v šabloně PROJ stojí bloky STUDIE PROVEDITELNOSTI (ST), ceny
  částí 1–3, poznámka „V případě, že se investor rozhodne pro zpracování STUDIE…“ a v titulu
  „Název akce: … STUDIE PROVEDITELNOSTI / Navazující PROJEKTOVÉ a INŽENÝRSKÉ ČINNOSTI“
  (online nabídka je vynechá). **Doporučení:** značky bloků studie a symbol titulu v další šabloně
  (stejně jako autorský dozor ve v5).
- Bez nálezu: „Případné studie a průzkumy nad rámec nabídky“ (Cena nezahrnuje — obecné), plán plateb
  (platby jen nabízených činností), úvod „Naše NABÍDKA a doporučení“ (věty podle sekcí, P11).

## 2. OCK — šířka bočního světlíku 600 mm (rozbor, beze změny)

Zadání: vnitřní šířka 1 500 mm, hloubka 1 550 mm, 4 nástupiště, zapuštěný portál, boky sklo
**4 ks** (celkem za šachtu = jeden světlík u každých dveří), rám dveří 100 mm, čistý vstup 800 mm.

**Odkud je 600 mm** (`src/engine.js`, #375 / #381 / #385):

| Krok | Vzorec | Hodnota |
|---|---|---|
| otvor dveří | čistý vstup + 2 × rám + 2 × 20 mm spára (`:801`, z Excelu) | 800 + 200 + 40 = **1 040** |
| šířka skla stěny (na terče) | vnitřní šířka + 2 × B příčníku boku (80) + 20 (`:909`) | 1 500 + 160 + 20 = **1 680** |
| mezera vedle dveří (obě strany) | šířka skla − otvor − 40 (`:1135`) | 1 680 − 1 040 − 40 = **600** |
| 4 ks / 4 dveře → u dveří jeden | jeden světlík u dveří vyplní celou mezeru (rozhodnutí 30. 9.) | **600 mm** |

Mezi příčníky (lišty) je šířka skla 1 332 → mezera 252 mm. Prázdný počet (automaticky 8 = dva u dveří)
dá 300 mm (na terče) / 126 mm (lišty). Model 1 i 2 shodně; pole šířky je vidět jen v Modelu 2
s ručním počtem. Typ portálu (zapuštěný / předsazený) ani profil sloupku portálu výpočet nebere.

**Proč to není jednoznačná chyba:** J. V. základ „mezera ze šířky skla — ponechat“ potvrdil
1. 10. a 6. 10. 2026 (#381, #385) a mezera je i v Modelu 1 (1:1 s Excelem). Jednoznačné je jen,
že **popisek „šířka bočního světlíku“ mate** (čte se jako světlá šířka) a že jádro nese pro tentýž
prvek dvě šířky (sklo 600 / 252 × délka krátkých příčníků světlíku 1 500 − 1 040 = 460 mm).

**Varianty k rozhodnutí (J. V. / Jirka L.)** — jeden světlík u dveří / dva u dveří:

| Varianta | Vzorec | Šířka | Plocha boků (4 ks) |
|---|---|---|---|
| **A** dnešní stav, jen přejmenovat na „šířka skla bočního světlíku (přes sloupky)“ | šířka skla − otvor − 40 | **600 / 300** | 5,28 m² |
| **B** výpočet D. Sikory | vnitřní šířka − vstup − 2 × rám | **500 / 250** | 4,40 m² |
| **C** světlá šířka z vnitřní šířky (fyzikálně, shodná s příčníky) | (1 500 − 1 040 − n × 40) / n | **420 / 190** | 3,70 m² |

**Doporučení:** A hned (přejmenování, cena beze změny) a C až po potvrzení Jirky L., a to jen
v Modelu 2 (Model 1 zůstává 1:1 s Excelem). Testy, kterých se změna týká: `test_svetliky_boky.js`,
`test_svetliky_sirka.js`, `overit_svetliky_sirka.mjs`, mutace #375 / #381 / #385 v `mutace_jadro.mjs`.

## 3. Dimenze profilů portálu (návrh, beze změny)

**Dnes** (`src/engine.js` `PROFILY_VYCHOZI`; `DEFAULT_ZADANI.profily` = exteriér; přepnutí typu šachty
dosadí sadu typu, `src/ui/kalk_ock.js` `typSachtyPrepni`; uložené zakázky nesou profily ve svém zadání):

| Prvek | EXT dnes | INT dnes | Postřeh D. Sikory |
|---|---|---|---|
| sloupek | 80×80/4 | 80×40/4 | – |
| příčníky bok / zadek | 80×80/3 | 80×40/3 | – |
| **sloupek portálu** | **40×40/3** | 40×40/3 | **EXT → 80×40** |
| **příčník portálu** | 80×40/3 | **80×40/3** | **INT → 40×40** |
| spojka | 70×70/3 | 70×30/3 | – |

Profil vstupuje do ceny přes hmotnost (`src/jekly.json`: 80×40/3 = 5,289 kg/m, 40×40/3 = 3,405 kg/m),
materiál „PROFILY - HLAVNÍ NOSNÉ PRVKY“ a lakování (plocha m²/m). Délky: sloupek portálu
= 2,2 × počet bočních světlíků + (zapuštěný ? 0 : nástupiště × světlá výška × 2); příčníky portálu
= 3 × nástupiště × šířka + světlíky × (šířka − otvor dveří) × 2. Standard OCK profily portálu nehlídá.

**Návrh** (větev `claude/d1-sikora-navrh-profily`, commit „NÁVRH D1“): dva řádky v `PROFILY_VYCHOZI`
(EXT `sloupekPortal` 80×40/3, INT `precnikPortal` 40×40/3) + přegenerované otisky
`test_profil_neznamy.js` s pojistkou. Plné kolo nad návrhem neběželo.

**Dopad na cenu — zkušební ceník**, šachta 1,50 × 1,55 m, 4 nástupiště, zdvih 9 m:

| Případ | Délka prvku | Δ kg | Δ cena |
|---|---|---|---|
| EXT zapuštěný, boky bez (výchozí nová nabídka) | 0 m | 0 | **0 %** |
| EXT zapuštěný, boky sklo (8 světlíků) | 17,6 m | +33 | +0,6 % |
| EXT předsazený, boky bez | 22,4 m | +42 | +0,75 % |
| EXT předsazený, boky sklo | 40,0 m | +75 | +1,3 % |
| INT, boky bez | 18,0 m | −34 | −0,8 % |
| INT, boky sklo | 25,4 m | −48 | −1,0 až −1,1 % |

**Otázky pro J. V. / Jirku L.** (doporučení v závorce):
- **Q4** Platí EXT sloupek portálu 80×40 pro zapuštěný i předsazený portál? (ano)
- **Q5** U EXT zůstává příčník portálu 80×40/3 a u INT sloupek portálu 40×40/3? (ano)
- **Q6** Tloušťka 80×40/**3** jako příčník, nebo /4 jako hlavní sloupek? (3)
- **Q7** Krátké příčníky u bočních světlíků se dnes počítají jako příčník portálu — mají u INT jít
  taky na 40×40? (ano, je to týž prvek)
- **Q8** Potřebuje INT příčník 40×40 limit rozpětí (šířka až 1 800 mm) ve Standardu OCK? (zeptat se Jirky L.)
- **Q9** Bereme výchozí profily jako předvolbu (mění oba modely), nebo jako součást excelové předlohy
  Modelu 1? (předvolba — vzorce Modelu 1 se nemění)
- **Q10** Rozpracované nabídky: změna se projeví jen u nových a po přepnutí typu šachty. (ano)
