# Roadmapa — pořadník projektu

`roadmap.json` je **jediný zdroj pravdy** o tom, co je hotové, co se čeká
a co se teprve chystá. Stránka `ROADMAPA.html` se z něj generuje; ručně se
needituje, protože při příštím generování by se změny ztratily.

## Co s tím

Soubor se vkládá do šablony stránky (`sablona.html`) na místo značky
`<?ROADMAP_JSON?>`. Od 22. 9. 2026 je **generátor i šablona v repozitáři**:

```
python3 roadmapa/roadmapa.py --kontrola   # duplicitní id, neznámé stavy, viselce
python3 roadmapa/roadmapa.py              # → ROADMAPA.html + ROADMAPA.md
```

Oba výstupy jsou v `.gitignore` — jsou to výstupy, ne zdroje, a v repozitáři
by se rozcházely se zdrojem. `./spust_testy.sh --smoke` i CI si je před
prohlížečovými sadami vyrobí samy, takže `overit_roadmapu.mjs` běží.

**Vzhled a vykreslení se mění v `sablona.html`, data v `roadmap.json`.**
Ruční úpravy vygenerované stránky se při příštím generování ztratí.

Bez Pythonu jde JSON vložit do šablony i ručně — jen se musí `</` v textech
zapsat jako `<\/`, jinak by to ukončilo `<script>` dřív, než má (generátor
to dělá sám).

## Pravidla, která se tu hlídají

- **Stav je jen `hotovo` / `ceka` / `blokovano`.** Jiný neexistuje.
- `blokovano` **vyžaduje `cekaNa`** — na čí podklad se čeká.
- Hotová položka **nemá `cekaNa`**: nemůže na nic čekat.
- **Čísla se nepoužívají podruhé a nic se nepřečísloVává zpětně.** Uzavřená
  položka mění stav, ne existenci; odložená dostane důvod a datum (vlna F).
- `odemyka` se do zdroje **nepíše** — obrácené vazby si stránka dopočítá ze
  `zavisi` sama, aby nešlo zapsat půlku vazby a druhou zapomenout.

## Archiv hotových položek (#642, od 22. 11. 2026)

Hotové položky dokončené před víc než 60 dny leží v `roadmap_archiv.json`
(každá na jednom řádku, beze změny). Živý `roadmap.json` nese otevřenou
a čerstvou práci, takže se rychle čte a souběžné větve se při slučování
nehádají o megabajt textu.

```
python3 roadmapa/roadmapa.py --archivuj --nanecisto   # co by se přesunulo
python3 roadmapa/roadmapa.py --archivuj               # přesun (k dnešku, 60 dní)
python3 roadmapa/roadmapa.py --archivuj --k 22.11.2026 --dni 60
```

- Archiv je **část evidence**: `--kontrola` i `src/test_roadmapa.js` čtou
  živý soubor a archiv dohromady — číslo z archivu se znovu nepoužije,
  závislost na archivované položce není viselec, alias z archivu nedostane
  jiná položka. V archivu smějí být jen hotové položky.
- `--hledej` hledá i v archivu; `ROADMAPA.html` a `ROADMAPA.md` se vyrábějí
  z obojího. `--zive`, `PREHLED.md` a `NOVINKY.md` čtou jen živý soubor.
- Datum dokončení = verze (`verze`, jinak první vDEN.MĚSÍC.pořadí
  v `hotovoV`), jinak datum „D. M. RRRR“ v `hotovoV`. Hotová položka bez
  zjistitelného data zůstává v živém souboru.
- Do archivu se ručně nepíše; položka, kterou je potřeba znovu otevřít,
  se vrátí do živého souboru (stejné číslo) a změní stav.

## Žádné ceny

Repozitář je veřejný. Do roadmapy proto **nepatří skutečné částky, sazby ani
interní čísla** — platí pro ni totéž co pro kód.

Kde částka nesla smysl věty, je nahrazená řádově: `[řádově desetitisíce Kč]`
místo konkrétního čísla. Argument („cena se propadla o desítky tisíc")
tím zůstává čitelný, údaj nikoli. Nula zůstává nulou, protože nic neprozrazuje,
a zaokrouhlovací kroky (100 / 500 / 1 000 …) taky — to je nastavení, ne cena.

Stav k 17. 9. 2026, build v17.9.3: 266 položek, 240 hotovo.
