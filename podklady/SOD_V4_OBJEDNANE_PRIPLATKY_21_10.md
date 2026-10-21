# SoD realizace v4 — objednané příplatky (#447 C6, 21. 10. 2026)

Podklad pro šablonovou dávku (šablona SoD realizace v4 CZ + EN/DE/FR vzniká z v3
na Disku). Kód je hotový ve větvi `claude/controlling-c3` (`src/sod.js`,
`sodObjednaneSymboly`); šablona v3 i starší fungují dál beze změny.

## Rozhodnutí J. V. (21. 10. 2026, předala koordinace)

- Obchodník při vystavení SoD zaškrtne, které příplatky z odeslané nabídky
  zákazník **objednal** (krycí list OCK → karta Smlouva o dílo → „Objednané
  příplatky"). Odeslaná nabídka se nemění.
- **Cena díla = cena nabídky (po slevě) + součet objednaných příplatků.**
  Sleva se na příplatky **neuplatní** (jako v nabídce, sekce II.), DPH se počítá
  **z celku**.
- „Po podpisu" = v krycím listu ručně vyplněné **Datum podpisu smlouvy**
  ≤ dnes; potom objednané příplatky mění jen administrátor.

## Symboly

| Symbol | Hodnota | Bez objednaných příplatků |
|---|---|---|
| `{{CENA_BEZ_DPH}}` | **celková cena díla** bez DPH = nabídka po slevě + příplatky | = cena nabídky (jako dosud) |
| `{{DPH_KC}}` | DPH z celkové ceny díla | jako dosud |
| `{{CENA_S_DPH}}` | celková cena díla s DPH | jako dosud |
| `{{SOD_CENA_NABIDKY}}` | cena dle cenové nabídky (po slevě) bez DPH | **prázdné** → řádek zmizí |
| `{{SOD_PRIPLATKY_OBJEDNANE}}` | seznam „název – cena" (řádek na příplatek, oddělené novým řádkem) | **prázdné** → řádek zmizí |
| `{{SOD_PRIPLATKY_KC}}` | součet objednaných příplatků bez DPH | **prázdné** → řádek zmizí |

Částky jsou ve měně dokumentu (CZ Kč, EN/DE/FR eura — celá eura nahoru po
položkách, stejně jako v nabídce; DPH z eurového základu). Názvy příplatků jsou
přeložené stejně jako v sekci II. nabídky. Přechodové plechy (materiál
a montáž) jdou ve smlouvě jako dvě položky, pokud byly objednány obě —
v nabídce jsou sloučené; v4 to může sjednotit, kód je připravený obojí.

`{{CENA_PRED_SLEVOU}}`, `{{SLEVA_PROC}}`, `{{SLEVA_KC}}` zůstávají **ceny nabídky**
(před slevou / sleva) — s celkovou cenou díla se už nesčítají, pokud jsou
objednané příplatky. Pokud je šablona v3 v článku o ceně má, doporučuji je ve v4
přesunout do bloku „Cena dle nabídky" (viz níže).

## Kam v šabloně (článek Cena díla)

Navržené znění bloku v článku o ceně díla (CZ; EN/DE/FR obdobně):

```
Cena díla dle cenové nabídky č. {{CISLO_NABIDKY}}:           {{SOD_CENA_NABIDKY}}
Objednané příplatky: {{SOD_PRIPLATKY_OBJEDNANE}}
Příplatky celkem:                                              {{SOD_PRIPLATKY_KC}}
Celková cena díla bez DPH:                                     {{CENA_BEZ_DPH}}
DPH {{DPH_SAZBA}} %:                                           {{DPH_KC}}
Celková cena díla s DPH:                                       {{CENA_S_DPH}}
```

Každý z prvních tří řádků (popisek a symbol v TÉMŽE odstavci) má být **samostatný odstavec** (ne řádek tabulky):
bez objednaných příplatků je builder vrátí v `odstavcePryc` a docxgen
(`odstranOdstavceSeSymboly`) odstavec odstraní celý — smlouva bez příplatků pak
vypadá přesně jako dnes. V buňce tabulky by po odstranění zůstal prázdný
odstavec a řádek tabulky by v dokumentu visel prázdný. `{{SOD_PRIPLATKY_OBJEDNANE}}` nese víc řádků (konce řádků
`\n`), ať stojí v odstavci, kde je zalomení v pořádku.

Splátky (`{{SOD_PLATEBNI_KALENDAR}}`, `SOD_SPLATKA*_PROC`) jsou v procentech
z celkové ceny díla — přepočítají se samy, šablona nic nového nepotřebuje.
