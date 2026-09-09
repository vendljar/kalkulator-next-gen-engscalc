# Které zakázky zasáhla změna zasklení (verze 9.9.4)

Prověřeno 9. 9. 2026 nad online databází: **51 zakázek, 82 variant**, všechny se
podařilo načíst.

## Shrnutí

| Skupina | Počet variant | Dopad |
|---|---|---|
| Exteriérová šachta | 68 | **žádný** — materiál i sazba beze změny, mění se jen název řádku |
| Interiérová šachta | 14 | **mění se materiál i cena** |
| z toho zkušební („TEST" v čísle) | 13 | k ověření, ne k odeslání |
| z toho ostrá zakázka | **1** | viz níž |
| Uzamčené (odeslané) interiérové nabídky | 0 | žádná odeslaná nabídka není dotčená |

**Nejdůležitější zjištění:** ze 14 interiérových variant je 13 zkušebních.
Jediná ostrá zakázka s interiérovou šachtou je **2026 - OPR - CN - 0348**.
Žádná dotčená varianta není uzamčená, takže se nemění nic, co už odešlo
zákazníkovi.

## Interiérové zakázky — všechny dotčené

| Soubor | Číslo nabídky | Zasklení | Nový materiál |
|---|---|---|---|
| 2026-OPR-CN-0348.json | **2026 - OPR - CN - 0348** | mezi příčníky | VSG 4.4.1 |
| 2025-OPR-0640-TEST.json | 2025 - OPR - 0640 - TEST | mezi příčníky | VSG 4.4.1 |
| 2025-OPR-0640-TEST-II.json | 2025 - OPR - 0640 - TEST II | mezi příčníky | VSG 4.4.1 |
| 2026-OPR-0669-TEST.json | 2026 - OPR - 0669 - TEST | **na terče** | **VSG 4.4.2** |
| 2026-OPR-CN-0124-TEST.json | 2026 - OPR - CN - 0124 - TEST | mezi příčníky | VSG 4.4.1 |
| 2026-OPR-CN-0128-TEST.json | 2026 - OPR - CN - 0128 - TEST | mezi příčníky | VSG 4.4.1 |
| 2026-OPR-CN-0174-TEST.json | 2026 - OPR - CN - 0174 - TEST | mezi příčníky | VSG 4.4.1 |
| 2026-OPR-CN-0216-TEST.json | 2026 - OPR - CN - 0216 - TEST | mezi příčníky | VSG 4.4.1 |
| 2026-OPR-CN-0254-TEST.json | 2026 - OPR - CN - 0254 - TEST | mezi příčníky | VSG 4.4.1 |

Pět z nich má dvě varianty, obě interiérové — proto 9 souborů, ale 14 variant.

**Co se u nich přesně změní.** Řádek „MATERIÁL boční + zadní stěna" počítal
dvojsklem, nově počítá stejným VSG jako čelní stěna. Rozdíl v ceně je rozdíl
mezi sazbou dvojskla a sazbou VSG — u třinácti variant „mezi příčníky" jde
o sazbu VSG 4.4.1, kterou už v ceníku máte. U jediné varianty „na terče"
(2026 - OPR - 0669 - TEST) se použije VSG 4.4.2; dokud tu sazbu v ceníku
nevyplníte, počítá se cenou VSG 4.4.1.

## Zakázky s ručním zásahem u skel

Šest variant má u řádků se sklem ruční přepis množství. Migrace jim názvy
převede automaticky při prvním otevření, ale stojí za kontrolu:

| Číslo nabídky | Typ šachty | Co je přepsané |
|---|---|---|
| 2026 - OPR - 0669 - TEST | interiérová | množství u „boční + zadní stěna" |
| 2026 - OPR - CN - 0174 - TEST (2 varianty) | interiérová | množství u skel |
| 2026 - OPR - CN - 0348 | interiérová | množství u skel |
| 2026 - OPR - CN - 0248 - TEST OMITKA (2 varianty) | exteriérová | množství u „boční + zadní stěna" |

U exteriérových se mění jen název řádku, ne cena.

## Co doporučuju udělat

1. **Otevřít 2026 - OPR - CN - 0348** a zkontrolovat cenu opláštění. Je to
   jediná ostrá zakázka, které se změna dotkne.
2. **Doplnit v ceníku sazbu „Sklo VSG 4.4.2"** (sekce OPLÁŠTĚNÍ). Dokud tam
   nic není, počítá se sazbou VSG 4.4.1 — nabídka nespadne na nulu, ale číslo
   nemusí odpovídat skutečnosti.
3. Zkušebních zakázek si nevšímat, pokud na nich zrovna něco neověřujete.

Prověřeno 9. 9. 2026 nad ostrou databází (engscalc.netlify.app), verze 9.9.4.
