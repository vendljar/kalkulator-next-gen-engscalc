# Návrh — „Hodiny z kalkulace“ na konci krycího listu OCK i PROJ (verze BO)

Zadání J. V. 14. 10. 2026: na konec krycího listu OCK i PROJ, verze pro
backoffice, jen část s hodinami. Vypsat hodiny ze všech položek, které se
nabízejí. **Ještě se nezapracovává — čeká na odsouhlasení.**

Čísla níže jsou skutečný výstup dnešního výpočtu (Model 2) nad
**zkušebním ceníkem z repozitáře** (`src/zkusebni_cenik.js`). Hodiny, které
bere jádro z ceníku (statické posouzení, stavbyvedoucí), budou u ostrého
ceníku jiné; hodiny montáže, dílenské dokumentace a projekce se počítají ze
zadání a rozměrů stejně.

## Odkud se která hodina bere

| Řádek | OCK — položka kalkulace | PROJ — položka kalkulace |
|---|---|---|
| montáž na stavbě | MONTÁŽ NA STAVBĚ (osoby × hodiny; základ + hodiny navíc za rozměry/exteriér + ATYP) | — |
| dílna — oplechování (práce) | PLECHY - OPLECH. DVEŘÍ A PODEST (PRÁCE) + PLECHY - OPLECHOVÁNÍ OSTATNÍ (PRÁCE) | — |
| projekce / konstrukce | DÍLENSKÁ DOKUMENTACE (základ + ATYP + lišty u zasklení mezi příčníky) | — |
| statické posouzení | STATICKÉ POSOUZENÍ (+ OPLÁŠTĚNÍ, je-li) | Statika v DPZ a DPS (je uvnitř činností) |
| stavbyvedoucí | PRÁCE STAVBYVEDOUCÍHO | — |
| činnosti PROJ | — | hodinové položky každé nabízené činnosti (hodiny + rezerva) |
| autorský dozor | — | jen když se nabízí: „max. 30 h / měsíc“ (paušál, v kalkulaci nemá hodiny) |

Nevypisuje se: vyřazená položka, položka s nulou, položka odškrtnutá ve
sloupci „Počítat“, činnost PROJ mimo nabídku, paušální činnosti bez hodin
(IČ, EZC, kolaudace, geodet — u nich „paušál“), položky v kusech nebo m²
(nýtování, tmelení, přechodové plechy).

## Varianta A — exteriérová šachta, 6 nástupišť, zdvih 17,3 m + výchozí PROJ (bez AD)

```
Hodiny z kalkulace                OCK                PROJ
  montáž na stavbě             128,4 h  (4 os. × 32,1 h)     —
  dílna — oplechování           29,0 h  (24 + 5)             —
  projekce / konstrukce         50,0 h                       —
  statické posouzení            10,0 h               (v DPZ a DPS)
  stavbyvedoucí                 40,0 h                       —
  studie                            —                28,0 h  (studie 24 + konzultace 4)
  DPZ                               —                64,0 h  (DOSS 52 + SÚ 6 + statika 6)
  DPS                               —                54,0 h  (stavební část 48 + statika 6)
  IČ / EZC / kolaudace              —                paušál (bez hodin)
  ───────────────────────────────────────────────────────────────────
  celkem                       257,4 h              146,0 h
```

## Varianta B — interiérová šachta, stejné rozměry + PROJ se zaměřením a s AD

```
Hodiny z kalkulace                OCK                PROJ
  montáž na stavbě              96,2 h  (4 os. × 24,0 h)     —
  dílna — oplechování           29,0 h  (24 + 5)             —
  projekce / konstrukce         50,0 h                       —
  statické posouzení            10,0 h               (v DPZ a DPS)
  stavbyvedoucí                 40,0 h                       —
  zaměření                          —                15,0 h  (zaměření 5 + výstup 10)
  studie                            —                28,0 h
  DPZ                               —                64,0 h
  DPS                               —                54,0 h
  IČ / EZC / kolaudace              —                paušál (bez hodin)
  autorský dozor                    —                max. 30 h / měsíc (do součtu se nepočítá)
  ───────────────────────────────────────────────────────────────────
  celkem                       225,2 h              161,0 h
```

## Výchozí návrhy (odpovězte jen tam, kde se chcete odchýlit)

1. **Stejná tabulka v obou krycích listech** (OCK i PROJ, verze BO), vždy se
   sloupci OCK a PROJ. Vyřazená strana zakázky (P6) má ve sloupci „—“.
2. **Montáž v osobohodinách** (4 os. × h, jak počítá kalkulace) — do celku
   jde 128,4 h, ne 32,1 h.
3. **Dílna — oplechování** jako vlastní řádek (v náčrtu nebyl; „ze všech
   položek, které se nabízejí“).
4. **Statické posouzení OCK** vlastním řádkem; u PROJ zůstává statika uvnitř
   DPZ a DPS (tak je v kalkulaci).
5. **PROJ po činnostech**, v závorce rozpad na položky.
6. **Autorský dozor** jen když se nabízí, jako „max. 30 h / měsíc“, do celku
   se nepočítá (počet měsíců není znám).
7. Desetinná místa: jedno (128,4 h).
8. Jen krycí list (tisk a Word verze BO); do nabídky pro zákazníka nic.
