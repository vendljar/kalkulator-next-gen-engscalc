# Roadmapa — pořadník projektu

`roadmap.json` je **jediný zdroj pravdy** o tom, co je hotové, co se čeká
a co se teprve chystá. Stránka `ROADMAPA.html` se z něj generuje; ručně se
needituje, protože při příštím generování by se změny ztratily.

## Co s tím

Soubor se vkládá do šablony stránky na místo dat (`const RM = { … }`).
Generátor (`roadmapa.py`) v tomhle repozitáři není — je v pracovní kopii
mimo GitHub. Kdo má po ruce Python:

```
python3 roadmapa.py --kontrola   # duplicitní id, neznámé stavy, viselce
python3 roadmapa.py              # → ROADMAPA.html + ROADMAPA.md
```

Bez Pythonu jde JSON vložit do šablony i ručně — jen se musí `</` v textech
zapsat jako `<\/`, jinak by to ukončilo `<script>` dřív, než má.

## Pravidla, která se tu hlídají

- **Stav je jen `hotovo` / `ceka` / `blokovano`.** Jiný neexistuje.
- `blokovano` **vyžaduje `cekaNa`** — na čí podklad se čeká.
- Hotová položka **nemá `cekaNa`**: nemůže na nic čekat.
- **Čísla se nepoužívají podruhé a nic se nepřečísloVává zpětně.** Uzavřená
  položka mění stav, ne existenci; odložená dostane důvod a datum (vlna F).
- `odemyka` se do zdroje **nepíše** — obrácené vazby si stránka dopočítá ze
  `zavisi` sama, aby nešlo zapsat půlku vazby a druhou zapomenout.

## Žádné ceny

Repozitář je veřejný. Do roadmapy proto **nepatří skutečné částky, sazby ani
interní čísla** — platí pro ni totéž co pro kód.

Kde částka nesla smysl věty, je nahrazená řádově: `[řádově desetitisíce Kč]`
místo konkrétního čísla. Argument („cena se propadla o desítky tisíc")
tím zůstává čitelný, údaj nikoli. Nula zůstává nulou, protože nic neprozrazuje,
a zaokrouhlovací kroky (100 / 500 / 1 000 …) taky — to je nastavení, ne cena.

Stav k 16. 9. 2026, build v16.9.16: 260 položek, 231 hotovo.
