# Podklady pro controlling (C3 #537, 27. 10. 2026)

Složka pro dokončení #500 (controlling — co zbývá po #447). Otevřená rozhodnutí J. V. jsou v
`podklady/CONTROLLING_ROZHODNUTI.md`. **Žádná skutečná cena ani osobní údaj** — oba sešity jsou ze struktury
kódu a smyšlených dat (`nastroje/kontrola_udaju.py` čistá).

## 1. `SABLONA_PODKLADU_CONTROLLING.xlsx` — co potřebujeme od controllingu

Sešit k vyplnění, který J. V. pošle controllingu. Vyrábí ho `python3 nastroje/sablona_podkladu_controlling.py
[výstup.xlsx]` ze struktury kódu (`src/controlling.js` výchozí číselník a mapování, `src/cenik.js` ceník PROJ).
Modré řádky = převzato z kalkulátoru (jen id, názvy, klíče — žádné částky), žlutý řádek **VZOR** = smyšlený
příklad formátu, bílé buňky vyplňuje controlling. Výběrové seznamy hlídají typ, chování, oblast a změnu.

| List | Co controlling dodá | K čemu v #500 |
|---|---|---|
| **Návod** | — (účel, barvy, formát čísel, dat a účtů, co do sešitu nepatří) | |
| **Skupiny** | potvrzení číselníku 18 nákladových skupin; **budoucí účet Helios** (dnes chybí u 15); změny názvu, ManVysl, typu (přímý/nepřímý), chování (variabilní/fixní), oblasti; nové / zrušené skupiny | budoucí účty (rozhodnutí 8) |
| **Mapování PROJ** | ke všem 16 klíčům ceníku PROJ potvrzení nebo změna navržené skupiny (Projekce – vlastní práce / subdodávky / Inženýrská činnost a projednání / Cestovné), vlastní práce × subdodávka | rozvržení PROJ (rozhodnutí 7) |
| **PROJ sazby a hodiny** | nákladové hodinové sazby **za roli** (projektant, statik, zaměření — ne za osobu), co sazba obsahuje, platnost od–do, skupina, účet, jak se hodiny vykazují | PRE × POST hodin projekce (hodiny jsou v exportu ve sloupci Množství u řádků s jednotkou Kč/hod) |
| **Převodník CN–projekt** | jen formát párování čísla nabídky s projektem Helios (vzorový řádek, ne seznam) | J8: kalkulátor číslo projektu neukládá |
| **Otázky** | Q1–Q10: list pro import (Řádky / Kapitoly), XLSX × CSV, formát čísel v CSV, datum pro období, četnost, jen vyhrané, zaokrouhlení OCK, podíly Kapitol, hodiny jako množství, kdo mapování udržuje | formát exportu (A4 z návrhu 20. 10.), rozhodnutí 1, 4, 5 |

**Formáty (list Návod):** částky v Kč bez DPH jako číslo, nejvýš 2 desetinná místa, bez „Kč" a mezer; procenta
0–100; hodiny desetinně; datum RRRR-MM-DD nebo datum Excelu, období od–do včetně; účet Helios šestimístný TEXT,
víc účtů oddělit čárkou; id skupiny malými písmeny bez diakritiky, existující id neměnit.

**Co se stane s vyplněnou šablonou:** sezení z listů Skupiny a Mapování PROJ připraví soubor ve tvaru importu
mapování (Nastavení → Controlling → Import XLSX, listy Mapování + Skupiny; import mění názvy a účty
existujících skupin a zařazení klíčů — **novou skupinu je nutné nejdřív přidat v aplikaci**,
`ctrlImportZListu` ji jinak odmítne, `src/controlling.js:1221`), J. V. ho nahraje a zveřejní —
controlling účet v kalkulátoru nedostane (J7). Sazby PROJ do kalkulátoru nejdou; slouží controllingu pro
postkalkulaci v Reporting CZ.

**Hlídání:** `src/test_sablona_controlling.js` — uložený sešit musí mít všechny skupiny a klíče PROJ z kódu,
řádky VZOR, žádné číslo v převzaté struktuře, žádný e-mail. Přibude-li klíč ceníku PROJ nebo skupina, test spadne
→ šablonu vyrobit znovu.

## 2. `UKAZKA_2026-CONTROLLING-EXPORT_v27.10.1.xlsx` — ukázkový export dnešním kódem

Hromadný export za období 1.–31. 10. 2026 (OCK i PROJ, ČR i zahraničí, **výběr podle zamčení, všechny stavy
Pipedrive** — výběr podle prodeje by vzal jen dvě prodané zakázky), vyrobený kódem aplikace (verze ve jméně
souboru): `ctrlHromadnyFiltr` + `ctrlHromadnyZakazka` + `ctrlExportListy` (`src/controlling.js`), `xlsxZapis`
(`src/xlsx.js`). Verze struktury souboru **4**.

Vyrábí ho `node nastroje/ukazka_controlling_export.js [složka nebo soubor.xlsx] [--json]` (bez cíle sem);
jméno podle konvence `TYP_rok-OBSAH_verze.přípona` (E1 #533) s verzí z `verze.txt`. Hlídá
`src/test_ukazka_controlling.js` — změna exportu, která ukázku rozbije, spadne v kole hned.

**Data jsou smyšlená:** „Zkušební zákazník …", IČO 12345678, e-maily @priklad.cz, smyšlené deal id 9001–9005,
zkušební ceník testů (`src/zkusebni_cenik.js` — kulatá, schválně nesmyslná čísla), výchozí mapování.

| Číslo | Oblast | Pipedrive | Co předvádí |
|---|---|---|---|
| 2026 - OPR - CN - 0901 | OCK, ČR, Model 1 | vyhráno | **Prodáno** 14. 10. a zákazník přiobjednal dva příplatky (C6) → v Řádcích „Objednáno dodatečně = ano", datum prodeje |
| 2026 - OPR - CN - 0902 | OCK, ČR, Model 2 | otevřeno | schválená sleva 5 % (souhrn Kapitol: Sleva 5 %) |
| 2026 - OPR - CN - 0903 | OCK, zahraničí | bez dealu | řídící varianta B nezamčená → vyvezena zamčená A, „Řídící varianta = ne" (C5) |
| 2026 - OVP - CN - 0904 | PROJ, Praha | vyhráno | **Prodáno** 21. 10. bez objednaných příplatků; hodiny v Množství (Kč/hod) |
| 2026 - OVP - CN - 0905 | PROJ, mimo Prahu | prohráno | zámek bez zmrazeného výsledku → „Výsledek = přepočtený" |

Listy: **Řádky** 139 (jen náklady v ceně nabídky + objednané příplatky), **Příplatky – volby** 59,
**Kapitoly** (po skupinách + souhrn zakázky), **Popis** (verze struktury 4 a co se v ní změnilo, filtr, počty,
číselník, zakázky s datem prodeje).

**Zaokrouhlení a podíly:** souhrn Kapitol „Zaokrouhlení (Kč)" nese u OCK i zaokrouhlení základní ceny nahoru na
tisíce (součet prodejních cen řádků + zaokrouhlení = Cena před slevou); podíly skupin dávají u každé strany
součet přesně 100 %. Nástroj obojí vypisuje (`--json` → `zjisteni`).
