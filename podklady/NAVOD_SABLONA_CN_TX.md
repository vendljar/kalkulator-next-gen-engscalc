# Úprava šablony CN v18 → v19 pro dávku TX (#771 V5, V6; #815) — CZ + EN + DE + FR (26. 11. 2026)

Datový úkol **jen na testu** (J. V. nebo jmenovaný kolega; CLAUDE.md „Kdo rozhoduje"). Hotovo ověří koordinace.
Aplikace s dávkou TX funguje i se **starou** šablonou v18 beze změny (záruka zůstane v kapitole V., poznámky
k ceně jako dosud) — úprava šablony jen zapne nové chování ve Wordu. Firemní šablony v repozitáři nejsou.

## 1. Co se mění (a co ne)

| bod | v18 dnes | v19 | kde v aplikaci |
|---|---|---|---|
| V5 záruka jako vlastní bod | „Záruka: 60 měsíců" je poslední řádek kapitoly V. (`{{NAB_KAP_TERMINY}}`) | vlastní odstavec `{{NAB_ZARUKA}}` v bloku značek; z kapitoly V. záruka zmizí **sama** (aplikace pozná symbol v šabloně) | `src/nabidka.js` (NAB_ZARUKA), test `src/test_tx_texty.js` |
| V6 poznámky k ceně | jeden odstavec „Poznámky k cenové nabídce: a. cena vychází …" a řádky „b. …", „c. …" zarovnané mezerami / tabulátory | nadpis „Poznámky k cenové nabídce:" + **seznam s písmeny** (Word: Domů → Číslování → „a." ), body **bez** ručně psaných písmen | jen šablona (pevný text); online tisk už seznam má |
| #815 DE nadpis | „SCHACHTAUSKLEIDUNG" (je-li v DE šabloně jako pevný text) | „SCHACHTVERKLEIDUNG" | slovník `src/preklad.js` (online tisk) |
| #815 popisek Vypracoval | EN „compiled by", DE „Zusammengestellt von", FR „établi par" (bez dvojtečky) | EN „Compiled by:", DE „Zusammengestellt von:", FR „Établi par :" | slovník (online tisk) |

Symboly, které v19 **přibývají**: `NAB_ZARUKA`, `NAB_ZARUKA_ZAC`, `NAB_ZARUKA_KON`. Ubývá: nic.
Šablona PROJ v9: **beze změny** (#814 řeší aplikace — nadpis „POHLED NA OBJEKT" v rámečku fotky se bez fotky vymaže).

## 2. Postup ve Wordu (každý jazyk zvlášť; znění se nepřekládá znovu)

Vstup: zveřejněné v18 ze serveru testu (Nastavení → Šablony → Šablona cenové nabídky OCK (CN) → stáhnout CZ, EN, DE, FR).

**V5 — záruka.** Za tabulku kapitoly „V. TERMÍNY REALIZACE" (za odstavec se značkou `{{KAP_V_KON}}`, před
`{{KAP_VI_ZAC}}`) vložit tři **samostatné** odstavce, každý jen s tímto textem (žádné mezery navíc):

```
{{NAB_ZARUKA_ZAC}}
{{NAB_ZARUKA}}
{{NAB_ZARUKA_KON}}
```

Prostřední odstavec naformátovat jako ostatní body (písmo, velikost, odsazení jako řádky kapitoly V.; tučně podle
uvážení J. V.). Symbol se píše **jedním tahem** (Word ho nesmí rozdělit kontrolou pravopisu — po vložení
zkontrolovat, že průvodce šablon symbol vidí). Aplikace dosadí „Záruka: 60 měsíců" (EN „Warranty: 60 months",
DE „Gewährleistung: 60 Monate", FR „Garantie: 60 mois" — interpunkce jako dosavadní řádek kapitoly V.) podle krycího listu; prázdná záruka → blok zmizí i se značkami.

**V6 — poznámky k ceně.** Pod blokem ceny (za „CELKEM za nabídku … včetně DPH"):

1. Odstavec „Poznámky k cenové nabídce:" nechat jako nadpis (smazat z něj „a. cena vychází …" a tabulátory).
2. Pod něj tři odstavce **číslovaného seznamu s písmeny** (a., b., c.):
   - cena vychází z technické specifikace nabídky – viz výše
   - DPH bude účtováno dle aktuálně platných daňových předpisů
   - k úpravě celkové ceny může dojít po přesném zaměření a vyhodnocení statiky
3. Písmena **nepsat rukou** (dělá je číslování); žádné mezery ani tabulátory na zarovnání.
4. Jazykové verze: totéž s jejich dosavadním zněním (EN „Notes on the price quotation:" + a. the price is based on …;
   DE „Hinweise zum Preisangebot:" …; FR „Remarques sur l’offre de prix :" …) — jen odstranit písmena a zarovnání.

**#815 (jen EN/DE/FR, pokud je text v šabloně pevně):** DE nadpis bloku „SCHACHTAUSKLEIDUNG" → „SCHACHTVERKLEIDUNG";
popisek u podpisu EN „Compiled by:", DE „Zusammengestellt von:", FR „Établi par :".

## 3. Nahrání na test a kontrola

1. Uložit jako `Sablona_NABIDKA_CN_v19.docx` (+ `_EN`, `_DE`, `_FR`).
2. Nastavení → Šablony → CN → „Nahrát novou českou verzi…" → v19. Průvodce: proti v18 **přibylo 3**
   (`NAB_ZARUKA`, `NAB_ZARUKA_ZAC`, `NAB_ZARUKA_KON`), **ubylo 0**, jazyk čeština, bez vad. Jinak nezveřejňovat.
3. Jazykové verze nahrát a zveřejnit; tabulka šablon: CN v19 a EN/DE/FR „✓ z v19".
4. Zkouška (testovací sezení): nová nabídka OCK → Word CZ a EN:
   - „Záruka: 60 měsíců" jako samostatný bod za kapitolou V., v kapitole V. **není**;
   - poznámky k ceně: nadpis + seznam a. b. c., zarovnané bez mezer;
   - dotisk nabídky odeslané **před TX**: záruka zůstane v kapitole V. a samostatný bod se nevytiskne (blok zmizí).
5. Na main až s verzí aplikace s dávkou TX (pokyn J. V.).

## 4. Proč aplikace čeká na šablonu (bez regrese)

Kapitola V. vynechá záruku **jen** u šablony se symbolem `{{NAB_ZARUKA}}`; šablona bez něj (v18 a starší,
online tisk) dostane záruku v kapitole V. jako dosud — jinak by z dokumentu vypadla. Nabídka odeslaná před TX
(snímek podmínek bez značky `txTisk`) má `NAB_ZARUKA` prázdný a záruku v kapitole V. i s novou šablonou.
