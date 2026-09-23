# #149 — Model 1 × Model 2: rozdíly, dopad a návrh pro Model 3

> Podklad k rozhodnutí, připraven 23. 9. 2026 večer (dávka D4).
> Čísla v tabulkách jsou spočítaná se **zkušebním ceníkem** z repozitáře
> (smyšlené ceny). Ukazují **řád a směr** dopadu, ne skutečné koruny.
> Skutečný dopad spočítáte u sebe jedním příkazem, viz „Jak spočítat
> se skutečným ceníkem“ níž.

## Co je dnes pravda

- Od **17. 9. 2026** začíná každá nová zakázka **Modelem 2** (rozhodnutí
  J. V. po nálezu V9). Text položky #149 v roadmapě („výchozí je Model 1“)
  je zastaralý.
- Model platí **pro každou variantu zvlášť** (`OCK.fixes`) a jde přepnout
  v kalkulaci. Starší zakázky si drží model, se kterým vznikly.
- Model 1 se **nikdy neopravuje**. Je to měřítko shody s excelovou předlohou
  a po opravě by ztratil smysl.
- Rozdílů je dnes **12**, ne 8 jako 18. 8.: přibyly kotvicí lišty (7),
  záporná plocha světlíku (8, 9) a zámečník ATYP (10). Všechny jsou v
  `src/engine.js` pod příznakem `fixes`.

## Dvanáct rozdílů

| # | Místo | Model 1 (jako Excel) | Model 2 (opravený) | Kdy se projeví | Směr ceny M2 proti M1 |
|---|---|---|---|---|---|
| 1 | Spojovací materiál — kusy u „spodní rám roh“ a „kotvení“ (D51/D52) | bere kusy z **opačného** typu šachty | ze správného typu | každá zakázka | podle ceníku spojů |
| 2 | Spojovací materiál — m² kotvení ($D$3) | vždy exteriérová plocha | plocha podle typu šachty | interiér | nepatrně |
| 3 | Lakování profilů — plocha | bez lemování | s lemováním | exteriér | ↑ |
| 4 | Lakování profilů — běžné metry | bez délky lemování | s délkou lemování | exteriér | ↑ |
| 5 | Lakování oplechování — podesty | plocha podle vzorce předlohy | skutečná plocha podest | každá zakázka | ↑ nebo ↓ |
| 6 | Boční zasklení — hloubka skla (D19 místo D18) | hloubka z terčového systému i pro lišty | hloubka zvoleného systému | zasklení mezi příčníky + světlík | ↓ |
| 7 | Kotvicí lišty (+10 %) | 10 % z **počtu kusů** | 10 % z **metrů** | zasklení mezi příčníky | ↑ (metry) |
| 8 | Světlík nad dveřmi — záporná výška | záporná plocha se **odečte** | nula | světlá výška pod 2,3 m se světlíkem | ↑ |
| 9 | Totéž u zadních světlíků (průchozí šachta) | záporná plocha se odečte | nula | průchozí, nízká podlaží | ↑ |
| 10 | Zámečník ATYP — starší zadání v kusech | kusy × sazba z ceníku | **jen jedna částka**, kusy se neberou | starší zakázky s kusy | ↓ (**viz nález M1**) |
| 11 | Rezerva základu | z ceny **s přirážkou** a přirážka ještě jednou | z nákladu, přirážka jednou | rezerva > 0 (ATYP) | ↓ |
| 12 | Rezerva příplatků | z ceny s přirážkou | z nákladu | rezerva příplatků > 0 | ↓ |

## Dopad na vzorových zakázkách (zkušební ceník)

| Vzor | Zakázka | Základní cena M2 − M1 | Příplatky M2 − M1 | Co to táhne |
|---|---|--:|--:|---|
| A | exteriér, terče, bez rezerv | **+0,38 %** | 0 | lakování s lemováním (3, 4) |
| B | interiér, terče, bez rezerv | −0,09 % | 0 | lakování podest (5); spoje 12 → 4 ks (1) |
| C | interiér, mezi příčníky, světlík | **−1,38 %** | −0,39 % | boční sklo −7,9 m² (6), lišty +10,6 bm (7) |
| D | exteriér, ATYP, rezervy 30 % | **−4,22 %** | −1,37 % | dvojí přirážka v rezervě (11, 12) |
| E | nízká podlaží se světlíkem | **+1,42 %** | +0,26 % | Model 1 odečítá −3,4 m² „záporného“ skla (8) |
| F | starší zakázka, zámečník 2 ks | +0,23 % | 0 | zámečník v M2 zmizí (10); lakování (3, 4) |

**Čtení tabulky:**
- **Největší rozdíl jsou rezervy (11, 12).** U ATYP s 30% rezervou je
  Model 1 o 4 % dražší, protože přirážku počítá dvakrát. To je čistá chyba
  předlohy, ne obchodní politika.
- **Zasklení mezi příčníky (6, 7)** jde každé jinam: méně skla, víc lišt.
  V součtu je Model 2 levnější o jednotky procent.
- **Nízká podlaží (8, 9):** Model 1 tu počítá zápornou plochu skla
  a zlevňuje tím zakázku. Nesmysl bez obchodního výkladu.
- **Lakování (3–5)** zdražuje o desetiny procenta. Model 2 lakuje, co se
  skutečně lakuje.
- **Spoje (1):** kusy se liší o celé násobky. Ve zkušebním ceníku to na
  korunách vidět není, protože má pro obě strany stejné ceny. Se skutečným
  ceníkem to vidět bude.

Úplné tabulky po složkách jsou v příloze níž.

## Nález M1 — přepnutím modelu zmizí zámečník ATYP (nový, 23. 9. 2026)

Model jde přepnout u každé varianty. Starší zakázka, kde je zámečník ATYP
zadaný **v kusech** (`zamecnikAtypKs`), se v Modelu 1 počítá kusy × sazba.
Po přepnutí na Model 2 se řádek **tiše ztratí** (vzor F: 1 600 → 0 ve
zkušebním ceníku), protože Model 2 zná jen jednu částku. Nic na to
neupozorní.

**Návrh:** při přepnutí na Model 2 u zakázky s kusy buď převést kusy ×
sazbu na částku (`Z.zamecnikAtypKc`), nebo přepnutí zastavit s vysvětlením.
Zapsáno do roadmapy a do přehledu nálezů.

## Návrh výchozích odpovědí (odpovězte jen tam, kde se chcete odchýlit)

1. **Model 3 = Model 2 ve všech 12 bodech.** Všechny rozdíly jsou logické
   chyby předlohy, žádný není obchodní volba. Model 3 tedy nevzniká jako
   třetí výpočet, ale jako **zmrazení dnešního Modelu 2** pod vlastním
   jménem, aby se k němu dalo vztahovat i po dalších změnách.
2. **Model 1 zůstává beze změny** a dál slouží jen ke srovnání
   s předlohou. Přepínač u nové zakázky nabízet jen administrátorovi.
3. **Nález M1 opravit** převodem kusů na částku při přepnutí (bez změny
   ceny té zakázky v Modelu 1).
4. Dopad **se skutečným ceníkem** spočítat u vás (příkaz níž). Jestli se
   u některého bodu ukáže rozdíl, který obchodně nechcete (typicky 1 –
   spoje), rozhodneme ho zvlášť.

## Jak spočítat se skutečným ceníkem

```
node nastroje/porovnani_modelu.js --md --cenik /cesta/k/ceniku_ock.json
```

- `ceniku_ock.json` = ceník OCK ve tvaru, jaký aplikace ukládá (klíče jako
  `profilasKgKc`, `powertechExt`, …). Chybějící klíče doplní zkušební ceník.
- Soubor ceníku ani výstup se skutečnými čísly **nepatří do repozitáře**.
- Bez `--cenik` se počítá se zkušebním ceníkem (tak vznikly tabulky tady).

---

## Příloha — úplné tabulky (zkušební ceník)

Vygenerováno `node nastroje/porovnani_modelu.js --md` 23. 9. 2026.

### Vzor A — exteriér, zasklení na terče, bez rezerv

| Složka | Rozdíly | Model 1 | Model 2 | M2 − M1 | % základní ceny |
|---|---|--:|--:|--:|--:|
| Spoje „spodní rám roh" (ks) | 1 | 4 | 12 | 8 | — |
| Spoje „kotvení" (ks) | 1 | 28 | 28 | 0 | — |
| Spoje „kotvení" (m² k lakování) | 2 | 1,19 | 1,19 | 0 | — |
| Spojovací materiál (Kč) | 1, 2 | 33 380 | 33 380 | 0 | +0 % |
| Lakování (Kč) | 3, 4, 5 | 90 426 | 94 475 | 4 049 | +0,31 % |
| Boční zasklení (m²) | 6 | 69,86 | 69,86 | 0 | — |
| Lišty vč. kotvicích (bm) | 7 | 0 | 0 | 0 | — |
| Světlíky čelní + zadní (m²) | 8, 9 | 9,79 | 9,79 | 0 | — |
| Zámečník ATYP (Kč) | 10 | 0 | 0 | 0 | +0 % |
| Opláštění — náklad sekce (Kč) | 6, 8, 9 | 363 952 | 363 952 | 0 | +0 % |
| Rezerva základu (Kč, s přirážkou) | 11 | 0 | 0 | 0 | +0 % |
| **Základní cena (Kč, zaokrouhlená)** | vše | 1 305 000 | 1 310 000 | **5 000** | +0,38 % |
| **Příplatky celkem (Kč, vč. rezervy)** | 12 | 375 000 | 375 000 | **0** | +0 % |

### Vzor B — interiér, zasklení na terče, bez rezerv

| Složka | Rozdíly | Model 1 | Model 2 | M2 − M1 | % základní ceny |
|---|---|--:|--:|--:|--:|
| Spoje „spodní rám roh" (ks) | 1 | 12 | 4 | -8 | — |
| Spoje „kotvení" (ks) | 1 | 28 | 28 | 0 | — |
| Spoje „kotvení" (m² k lakování) | 2 | 1,19 | 1,2 | 0,01 | — |
| Spojovací materiál (Kč) | 1, 2 | 29 220 | 29 220 | 0 | +0 % |
| Lakování (Kč) | 3, 4, 5 | 85 153 | 84 753 | -400 | -0,04 % |
| Boční zasklení (m²) | 6 | 69,86 | 69,86 | 0 | — |
| Lišty vč. kotvicích (bm) | 7 | 0 | 0 | 0 | — |
| Světlíky čelní + zadní (m²) | 8, 9 | 9,79 | 9,79 | 0 | — |
| Zámečník ATYP (Kč) | 10 | 0 | 0 | 0 | +0 % |
| Opláštění — náklad sekce (Kč) | 6, 8, 9 | 224 114 | 224 114 | 0 | +0 % |
| Rezerva základu (Kč, s přirážkou) | 11 | 0 | 0 | 0 | +0 % |
| **Základní cena (Kč, zaokrouhlená)** | vše | 1 054 000 | 1 053 000 | **-1 000** | -0,09 % |
| **Příplatky celkem (Kč, vč. rezervy)** | 12 | 242 000 | 242 000 | **0** | +0 % |

### Vzor C — interiér, zasklení mezi příčníky, světlík nad dveřmi

| Složka | Rozdíly | Model 1 | Model 2 | M2 − M1 | % základní ceny |
|---|---|--:|--:|--:|--:|
| Spoje „spodní rám roh" (ks) | 1 | 12 | 4 | -8 | — |
| Spoje „kotvení" (ks) | 1 | 28 | 28 | 0 | — |
| Spoje „kotvení" (m² k lakování) | 2 | 1,19 | 1,2 | 0,01 | — |
| Spojovací materiál (Kč) | 1, 2 | 26 460 | 26 460 | 0 | +0 % |
| Lakování (Kč) | 3, 4, 5 | 101 551 | 101 681 | 130 | +0,01 % |
| Boční zasklení (m²) | 6 | 66,68 | 58,75 | -7,93 | — |
| Lišty vč. kotvicích (bm) | 7 | 383,16 | 393,76 | 10,6 | — |
| Světlíky čelní + zadní (m²) | 8, 9 | 7,77 | 7,77 | 0 | — |
| Zámečník ATYP (Kč) | 10 | 0 | 0 | 0 | +0 % |
| Opláštění — náklad sekce (Kč) | 6, 8, 9 | 175 030 | 162 898 | -12 133 | -1,19 % |
| Rezerva základu (Kč, s přirážkou) | 11 | 0 | 0 | 0 | +0 % |
| **Základní cena (Kč, zaokrouhlená)** | vše | 1 031 000 | 1 017 000 | **-14 000** | -1,38 % |
| **Příplatky celkem (Kč, vč. rezervy)** | 12 | 233 000 | 229 000 | **-4 000** | -0,39 % |

### Vzor D — exteriér, ATYP s rezervami 30 % (základ i příplatky)

| Složka | Rozdíly | Model 1 | Model 2 | M2 − M1 | % základní ceny |
|---|---|--:|--:|--:|--:|
| Spoje „spodní rám roh" (ks) | 1 | 4 | 12 | 8 | — |
| Spoje „kotvení" (ks) | 1 | 28 | 28 | 0 | — |
| Spoje „kotvení" (m² k lakování) | 2 | 1,19 | 1,19 | 0 | — |
| Spojovací materiál (Kč) | 1, 2 | 33 380 | 33 380 | 0 | +0 % |
| Lakování (Kč) | 3, 4, 5 | 90 426 | 94 475 | 4 049 | +0,23 % |
| Boční zasklení (m²) | 6 | 69,86 | 69,86 | 0 | — |
| Lišty vč. kotvicích (bm) | 7 | 0 | 0 | 0 | — |
| Světlíky čelní + zadní (m²) | 8, 9 | 9,79 | 9,79 | 0 | — |
| Zámečník ATYP (Kč) | 10 | 0 | 0 | 0 | +0 % |
| Opláštění — náklad sekce (Kč) | 6, 8, 9 | 363 952 | 363 952 | 0 | +0 % |
| Rezerva základu (Kč, s přirážkou) | 11 | 483 572 | 404 435 | -79 138 | -4,51 % |
| **Základní cena (Kč, zaokrouhlená)** | vše | 1 827 000 | 1 753 000 | **-74 000** | -4,22 % |
| **Příplatky celkem (Kč, vč. rezervy)** | 12 | 510 000 | 486 000 | **-24 000** | -1,37 % |

### Vzor E — nízká podlaží (světlá výška pod 2,3 m) se světlíkem

| Složka | Rozdíly | Model 1 | Model 2 | M2 − M1 | % základní ceny |
|---|---|--:|--:|--:|--:|
| Spoje „spodní rám roh" (ks) | 1 | 4 | 12 | 8 | — |
| Spoje „kotvení" (ks) | 1 | 20 | 20 | 0 | — |
| Spoje „kotvení" (m² k lakování) | 2 | 0,85 | 0,85 | 0 | — |
| Spojovací materiál (Kč) | 1, 2 | 19 680 | 19 680 | 0 | +0 % |
| Lakování (Kč) | 3, 4, 5 | 49 089 | 50 897 | 1 808 | +0,23 % |
| Boční zasklení (m²) | 6 | 28,97 | 28,97 | 0 | — |
| Lišty vč. kotvicích (bm) | 7 | 0 | 0 | 0 | — |
| Světlíky čelní + zadní (m²) | 8, 9 | -3,38 | 0 | 3,38 | — |
| Zámečník ATYP (Kč) | 10 | 0 | 0 | 0 | +0 % |
| Opláštění — náklad sekce (Kč) | 6, 8, 9 | 150 471 | 157 332 | 6 861 | +0,88 % |
| Rezerva základu (Kč, s přirážkou) | 11 | 0 | 0 | 0 | +0 % |
| **Základní cena (Kč, zaokrouhlená)** | vše | 766 000 | 777 000 | **11 000** | +1,42 % |
| **Příplatky celkem (Kč, vč. rezervy)** | 12 | 220 000 | 222 000 | **2 000** | +0,26 % |

### Vzor F — starší zakázka: zámečník ATYP v kusech (2 ks)

| Složka | Rozdíly | Model 1 | Model 2 | M2 − M1 | % základní ceny |
|---|---|--:|--:|--:|--:|
| Spoje „spodní rám roh" (ks) | 1 | 4 | 12 | 8 | — |
| Spoje „kotvení" (ks) | 1 | 28 | 28 | 0 | — |
| Spoje „kotvení" (m² k lakování) | 2 | 1,19 | 1,19 | 0 | — |
| Spojovací materiál (Kč) | 1, 2 | 33 380 | 33 380 | 0 | +0 % |
| Lakování (Kč) | 3, 4, 5 | 90 426 | 94 475 | 4 049 | +0,31 % |
| Boční zasklení (m²) | 6 | 69,86 | 69,86 | 0 | — |
| Lišty vč. kotvicích (bm) | 7 | 0 | 0 | 0 | — |
| Světlíky čelní + zadní (m²) | 8, 9 | 9,79 | 9,79 | 0 | — |
| Zámečník ATYP (Kč) | 10 | 1 600 | 0 | -1 600 | -0,12 % |
| Opláštění — náklad sekce (Kč) | 6, 8, 9 | 363 952 | 363 952 | 0 | +0 % |
| Rezerva základu (Kč, s přirážkou) | 11 | 0 | 0 | 0 | +0 % |
| **Základní cena (Kč, zaokrouhlená)** | vše | 1 307 000 | 1 310 000 | **3 000** | +0,23 % |
| **Příplatky celkem (Kč, vč. rezervy)** | 12 | 375 000 | 375 000 | **0** | +0 % |

