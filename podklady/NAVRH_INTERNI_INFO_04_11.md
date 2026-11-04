# Návrh IK — sekce „Interní klíčové informace“ v krycím listu OCK a PROJ (4. 11. 2026)

Dávka IK, základ `test` v4.11.3 (6109e39). **Jen návrh, kód aplikace se neměnil.**
Vizuální mockup (private artefakt): https://claude.ai/artifact/Eaox3QqxRtS6Pz4iQUy54g

## Zadání J. V. (doslova)

„Přidej na začátek krycího listu sekci Interní klíčové informace, která bude obsahovat
soupis důležitých informací od obchodníka směrem do firmy a nikam jinam kromě krycího listu
se nebudou propisovat. Týká se jak OCK tak PROJ. Ukaž mi vizuálně, jak to bude vypadat.“

## Co jsem ověřil v kódu

| Místo | Zjištění | Důsledek pro IK |
|---|---|---|
| `src/kryci.js` / `src/kryci_proj.js` — `KRYCI_SEKCE`, `KRYCI_PROJ_SEKCE` | Sekce a pole krycích listů; ruční hodnoty ve **variantě** (`v.data.kryci.hodnoty`, `v.data.kryciProj.hodnoty`). | IK do těchto polí **nepatří** (viz Pipedrive a zámek). |
| `src/ui/kryci_ui.js` `renderKryci`, `src/ui/kryci_proj_ui.js` `renderKryciProj` | Nadpis → úvodní text → `zamekKryciPoznamka` → sekce (`<h3>`, `.kl-row`, štítky `BO`/`Tech`/`BO+Tech`, sloupec zdroje) → hodiny → tisk. | IK se vykreslí jako vlastní blok hned po poznámce o zámku, před „Základní údaje“. |
| Tisk `kryciTiskPohled` / `kryciData`, `kryciProjData`, Word `kryciWord` | Jedna verze na soubor (BO / Techdata), sekce z `*_SEKCE` filtrované štítkem `verze`. | IK se přidá jako samostatný blok na začátek `d.sekce`/výstupu, filtrovaný štítkem bodu. |
| Pipedrive nanečisto `src/pd_nanecisto.js` (`pdnStranaOck`/`pdnStranaProj`, #115), převod #553 | Procházejí **všechna** pole `KRYCI_SEKCE`/`KRYCI_PROJ_SEKCE` a nabízejí je do mapy polí. | Kdyby IK bylo běžné pole krycího listu, objevilo by se v mapě Pipedrive → proto **mimo `*_SEKCE`**. |
| SoD `src/sod.js` (`kryciSodSymboly`, `kryciPoleHodnota`) | Bere jen pole se symbolem `sod:` a vyjmenovaná id. | IK bez symbolu → do SoD se nedostane. |
| Controlling `src/controlling.js`, `netlify/functions/controlling_export.mjs` | Krycí list nečtou. | Beze změny. |
| Zámek `src/zamek.js` (`zamekKryciPoleStav`, `ZAMEK_KRYCI_PO_CN`, Z1, #540) | Po tisku CN zmrazení po polích, snímek `kryci`/`kryciProj` v zámku; po SoD celý list; po Prodáno vše kromě polí SoD. Neznámé pole = zmrazeno. | Data IK ve variantě by zámek zmrazil (a dostala by se do snímku). Na úrovni **zakázky** se zámku netýkají — stejně jako interní poznámky (#37, `poznamky.js` bod 2). |
| Interní poznámky `src/poznamky.js`, `src/ui/poznamky_ui.js` | `ZAK.poznamkyText` (volné pole), karta v Kalkulaci OCK i PROJ „Interní poznámky k zakázce (netisknou se)“, patří zakázce, netiskne se nikam; pojistka `test_poznamky.js` čte zdrojáky generátorů. | Vzor pro IK: stejné uložení na zakázce a stejný typ testu. |
| Zálohy, DB, soubor zakázky | Ukládají celou zakázku. | IK se nese automaticky; ověřit i soubor bez ceníků (P12, `zakazkaBezCeniku`). |
| Role (`netlify/lib/sdilene.mjs` `ROLE`) | Obchodník, Vedoucí, Administrátor (role „technik“ neexistuje). | Tech oddělení čte IK z tisku Techdata. |

## Návrh

1. **Obsah — varianta C (doporučeno):** 8 pevných bodů + volné odrážky „Další body“ (+ Přidat bod, × odebrat).
   Pevné body a štítky výstupu:
   - Rozhodující osoba — BO+Tech
   - Termínová rizika — BO+Tech
   - Specifika stavby a přístupu — Tech
   - Dohody nad rámec nabídky — BO+Tech
   - Konkurence a cena — BO
   - Platební morálka — BO
   - Na co si dát pozor při realizaci — Tech
   - Kontakt na stavbě — BO+Tech
   - Volná odrážka: štítek volí obchodník (výchozí BO+Tech).
   - Varianta A = jen pevné body, B = jen odrážky (obě v artefaktu přepínačem).
2. **Vztah k Interním poznámkám:** nechat zvlášť, sekce IK ukazuje odkaz „Interní poznámky k zakázce: N odstavců → otevřít v Kalkulaci“. Poznámky = průběžný zápisník (netisknou se nikam), IK = shrnutí pro předání do firmy (tiskne se do krycího listu).
3. **Propis:** jen krycí list — obrazovka OCK i PROJ, tisk PDF BO / Tech a Word krycího listu, podle štítku bodu. Nikdy CN, SoD, plná moc, specifikace, Pipedrive, controlling. Zálohu, databázi a soubor zakázky nese.
4. **Platnost:** zakázka — jeden záznam `ZAK.interniInfo` (pracovní název) pro OCK, PROJ a všechny varianty; v listu OCK i PROJ tentýž záznam.
5. **Zámek:** nezamyká se nikdy (po CN, SoD ani Prodáno); není to obsah nabídky. Nepatří do `ZAMEK_CHRANENE` ani do snímku. Server: ověřit, že `zamekDataPorovnani` porovnává jen data variant (IK leží mimo).
6. **Práva:** píše a čte každý, kdo smí upravovat zakázku (Obchodník, Vedoucí, Administrátor); u sekce „naposledy upravil kdo a kdy“.
7. **Tisk:** oranžový rámeček nahoře „INTERNÍ KLÍČOVÉ INFORMACE — pouze pro potřebu firmy, nepředávat“; tabulka bodů + odrážky + řádek „Stav k … , kdo“. Nevyplněný bod se netiskne; když ve verzi nezbude nic, rámeček se netiskne vůbec.
8. **Duplikace zakázky / zakázka ze šablony:** IK se nekopíruje.

## Odhad realizace (po odsouhlasení)

- Model: `src/interni_info.js` (zajištění pole, body, odrážky, filtr podle verze, sanitace, limit délky); render v `kryci_ui.js` a `kryci_proj_ui.js`; tisk a Word; server — validace tvaru v `zakazky.mjs` (jako poznámky).
- Testy: jednotkový (filtr BO/Tech, prázdná sekce se netiskne), pojistka „netiskne se jinam“ (čte zdrojáky CN, SoD, specifikace, `pd_nanecisto`, controllingu), zámek (editovatelné po CN/SoD/Prodáno), harness obrazovky; XSS u textu bodů.
- Složitost M.

## Otázky pro J. V. (doporučená odpověď první)

1. Podoba obsahu? — **C (8 bodů + odrážky)** / A (jen body) / B (jen odrážky)
2. Vztah k Interním poznámkám? — **zvlášť s odkazem** / sloučit (poznámky → „Další body“) / zvlášť bez odkazu
3. Body osnovy? — **8 bodů podle návrhu** / bez „Konkurence a cena“ / upravím seznam
4. Kam se tisknou? — **podle štítku bodu** / celé do obou verzí / jen Backoffice
5. Platnost? — **zakázka** / varianta
6. Doplňování po odeslání, SoD, Prodáno? — **ano, vždy** / po Prodáno jen Vedoucí a Administrátor
7. Kdo píše? — **každý, kdo smí upravovat zakázku** / jen obchodník zakázky + Vedoucí + Administrátor
8. Kopírovat při duplikaci / ze šablony? — **ne** / ano
