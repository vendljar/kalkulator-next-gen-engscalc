# Ukázka exportu pro controlling — verze 2 (C5 + C6, #447)

Soubor `controlling_export_v2_ukazka.xlsx` je **hromadný export za období** (Nastavení → Controlling →
Export, 1.–31. 10. 2026, OCK i PROJ, ČR i zahraničí), vyrobený přímo kódem aplikace v21.10.6
(`src/controlling.js` `ctrlHromadnyZakazka` + `ctrlExportListy`, `src/xlsx.js` `xlsxZapis`).
Znovu ho vyrobí `node podklady/ukazky/vyrob_controlling_export_v2.js`.

**Data jsou smyšlená:** pět zkušebních nabídek („Zkušební zákazník s.r.o.“ apod.), zkušební ceník
z testů (`src/zkusebni_cenik.js` — kulatá, schválně nesmyslná čísla), výchozí mapování skupin.
Žádná zakázka ani ceník z produkce; částky nemají obchodní význam.

## Pět nabídek v ukázce

| Číslo | Oblast | Co předvádí |
|---|---|---|
| 2026 - OPR - CN - 0901 | OCK, ČR, Model 1 | zákazník **objednal dva příplatky** (C6) — v Řádcích s „Objednáno dodatečně = ano“, datum prodeje 14. 10. |
| 2026 - OPR - CN - 0902 | OCK, ČR, Model 2 | sleva 5 %, bez objednaných příplatků |
| 2026 - OPR - CN - 0903 | OCK, zahraničí | řídící varianta B není zamčená → export vezme zamčenou variantu A a označí **„Řídící varianta = ne“** (C5) |
| 2026 - OVP - CN - 0904 | PROJ, Praha | běžná nabídka projekce |
| 2026 - OVP - CN - 0905 | PROJ, mimo Prahu | zámek **bez zmrazeného výsledku** (jako nabídky před 15. 9. 2026) → **„Výsledek = přepočtený“** |

## Listy (pořadí jako v aplikaci)

1. **Řádky** — jeden řádek na nákladovou položku kalkulace. Nese **jen náklady v ceně nabídky**
   a příplatky, které zákazník **dodatečně objednal** (C6, sloupec „Objednáno dodatečně = ano“).
   Bez objednaných je součet „Náklad celkem (Kč)“ roven nákladu základní ceny nabídky, takže
   kontingenční tabulka nad listem bez filtru sedí. Sloupce mimo jiné: číslo nabídky, akce, zákazník,
   zamčeno, řada, model, verze mapování, Pipedrive deal, **Řídící varianta** (ano/ne), **Výsledek**
   (zmrazený / přepočtený), **Objednáno dodatečně**, oblast, sekce, klíč ceníku, skupina, položka
   ManVysl, účty Helios nyní/budoucí, typ (přímý/nepřímý), chování (variabilní/fixní), množství,
   jednotková cena, náklad, prodejní cena před slevou a zaokrouhlením. Ukázka: 139 řádků.
2. **Příplatky – volby** — příplatky nabídnuté jako volba **mimo cenu nabídky**, stejné sloupce
   jako Řádky (objednané příplatky se sem nepočítají, jsou v Řádcích). Ukázka: 59 řádků (OCK).
3. **Kapitoly** — souhrn zakázky (cena nabídky, náklad) a náklad po nákladových skupinách s podílem;
   počítá se ze základu (v ceně nabídky), sloupec „Náklad příplatků – volby“ zvlášť.
4. **Popis** — verze struktury souboru **2** (`CTRL_EXPORT_VERZE`), kdo a kdy exportoval, období,
   oblast, řada, počet zakázek, kolik výsledků je zmrazených a kolik přepočtených, vysvětlení listů
   Řádky a Příplatky – volby, počet zakázek s objednanými příplatky, číselník skupin s účty a seznam
   zakázek v exportu (s datem prodeje u objednaných).

## Na co se při čtení dívat

- Zahraniční řada je v **Kč bez DPH** jako tuzemská (Popis to uvádí).
- Zaokrouhlení ceny OCK nahoru export neukazuje a Kapitoly zaokrouhlují po skupinách — otevřené
  nálezy z první ukázky 21. 10., čekají na J. V. (roadmapa #500).
