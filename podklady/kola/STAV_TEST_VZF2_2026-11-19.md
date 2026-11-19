# STAV – zkouška VZ-F2 (víc zákazníků, IČO, zmrazení po SoD, KL PROJ) a #671 na testu, 19. 11. 2026

## Hlavička

- **Test:** v19.11.5 (`origin/test` 042fcbc2 = VZ-F2 v19.11.4 + #671).
- **Souhlas:** trvalý souhlas J. V. se zápisem na test (19. 11., `podklady/ROZHODNUTI_LOG.md`).
- **Kdo:** testovací sezení Claude v Playwrightu, administrátor `KNG_TEST_*`. Pole se plnila přes `set()` / `klpSet()`
  jako z obrazovky. Server se zkoušel obchvatem klienta, tedy přímou změnou dat a `onlineUloz()`.
- **Pipedrive:** blokováno. **Vypínač „Víc zákazníků“:** na začátku ZAP, pro bod 4 VYP, na konci ZAP.
- **Zakázky (nové):**
  - `TEST - 2026 - OPR - CN - 9813` („TEST VZ – F2“, OCK, zadání z 9603);
  - `TEST - 2026 - OVP - CN - 9814` („TEST VZ – F2 PROJ“, zadání z TEST 7650-K29-N50, protože PROJ jde jen v zakázce OVP).
  Smyšlení zákazníci A, B, C (IČO 99811073 / 99811081, C bez IČO), kanárky `KANAR-F2…`.

## Výsledky

| bod | výsledek | poznámka |
|---|---|---|
| 1 #660 IČO | ✅ | Formulář se IČO B: tlačítko „Přidat zákazníka“ zhasnuté s hláškou „⚠ Zákazník s tímto IČO už v zakázce je (… B). Týž subjekt nemůže být v zakázce dvakrát — zkontrolujte IČO.“ **Obchvaty:** a) IČO doplněné u C až po přidání → odmítnuto, b) IČO řídícího A → IČO B → odmítnuto, c) převzetí karty z databáze zákazníků do C → odmítnuto, d) výběr z našeptávače do C → odmítnuto. Karty jen v paměti, databáze zákazníků se neměnila. **Server:** C s IČO B vloženým přímo do dat → `POST /api/zakazky` **400**. Po vrácení uloženo (200). |
| 1 stará zakázka s duplicitou | ⬜ neověřeno na datech | Na testu není uložená zakázka s duplicitním IČO. Duplicita D v 9801 z 18. 11. byla odstraněna a nová už uložit nejde. Pokrývá jen jádro (`src/test_vz_f2.js`). |
| 2 #663 zmrazení po SoD | ✅ | Po **CN** B: zástupce B jde měnit (uloženo). Po **SoD** B: zástupce B odmítnut („Zákazníkovi … už odešla smlouva o dílo — zástupci a DIČ se už nemění…“), DIČ B odmítnuto, **kontakt B jde měnit**. Pole zástupce B v KL OCK je zhasnuté s 🔒 a vysvětlením. **Zástupce řídícího A (bez SoD) jde měnit.** **Server:** zástupce B změněný přímo v datech → **409**, na serveru zůstala hodnota před obchvatem. |
| 3 #661 KL PROJ u B | ⚠ **nález VZF2-N1** | KL PROJ u otevřeného B ukazuje údaje B. Zmocnitel zákazníka (`pmZmocnitel`) zapsaný u B se v plné moci A **neobjevil** (PM_ZMOCNITEL = zástupce A) ✅. Ale **„Za zhotovitele jedná (zmocněnec)“** (`pmJednajici`) zapsaný u B se uložil do hodnot varianty a **objevil se v plné moci A, v KL PROJ BO A** (Word i náhled) i v jejich SoD PROJ (`PM_JEDNAJICI`). Uloženo v `varianty[0].data.kryciProj.hodnoty.pmJednajici`. Tamtéž leží i B-ův `pmZmocnitel` (v tisku A se neuplatní). |
| 4 regrese 1 zákazník / VYP | ✅ | 9949-K49 (1 zákazník): SoD (.2) vytištěna a uložena. Pak změna objednatele, IČO, DIČ i zástupce odmítnuta („Ze zakázky odešla smlouva o dílo — údaje zákazníka v hlavičce se už nemění…“), nic neuloženo (autosave vypnut, stránka obnovena). Tisk 9603: CN, KL BO, KL Techdata, SoD a plná moc jsou **znak po znaku** stejné jako ve v19.11.2 (v19.11.3 tyto dokumenty neměnila). |
| 5 plná moc OPR | ✅ | `PLNA-MOC_TEST-2026-OPR-CN-9603-K19T-C103.2-PROJ-CZ` (dřív `PLNA-MOC_2026-OPR-CN-PROJ-CZ`), stejně u 9949. VZF1-I1 vyřešen. |
| 6 #671 ceník | ✅ | Nastavení → Ceník, sloupec Zahraničí: u statiky opláštění placeholder „jako statika zahr.“ a title „prázdné = platí zahraniční statické posouzení… — K50-N1“. Text dialogu zveřejnění (`cenikZahrStatikaOplUpozorneni`): „Zahraniční řada: statické posouzení opláštění (Kč/hod) není vyplněné — v zahraniční zakázce se použije zahraniční sazba statického posouzení (# Kč/hod)…“. Ceník se nezveřejňoval. |

## 7 — úklid TEST VZ zakázek

Ruční pole KL PROJ v hodnotách varianty (`kryciProj.hodnoty`) neobsahují žádné údaje dalšího zákazníka v hodnotách řídícího.
Kanárky jsou jen ve **zmrazených snímcích** zamčených variant (`kryciProj.zmrazeno`, snímek prefillů v okamžiku zámku):

| zakázka | varianta | kde | hodnota | posouzení |
|---|---|---|---|---|
| 9801 (TEST VZ – 1) | .1 zamčená | `zmrazeno.pmZmocnitel` | zástupce zákazníka **C** | stará kontaminace VZ-N3 (18. 11.): zástupce C ležel v hlavičce řídícího, když se zamykalo. Zamčené, beze změny, jen hlášeno |
| 9811 (TEST VZ – F1) | .1 a .2 zamčené | `zmrazeno.jmenoPrijmeni`, `zmrazeno.pmZmocnitel` | kontakt a zástupce **A** | A byl při zámku řídící. Ve snímku vlastní varianty C (.2) jsou údaje A. Zamčené, beze změny |
| 9812 (TEST VZ – T1) | .1 zamčená | `zmrazeno.jmenoPrijmeni` | kontakt **C** | C byl při zámku (CN B) řídící. Zamčené, beze změny |
| 9802 | — | — | žádné kanárky | — |

Nezamčená varianta s cizími údaji v hodnotách řídícího se nenašla, nic se nemazalo.

## Nálezy

| ID | vážnost | co |
|---|---|---|
| **VZF2-N1** | střední (dokument) | `pmJednajici` („Za zhotovitele jedná (zmocněnec)“, KL PROJ) zapsaný u otevřeného dalšího zákazníka B se uloží do hodnot sdílené varianty a vytiskne se v plné moci, KL PROJ BO i SoD PROJ řídícího A. Podle zadání zkoušky se zmocněnec zapsaný u B nesmí objevit v plné moci A. K rozhodnutí: buď je `pmJednajici` údaj zhotovitele, společný pro variantu (pak pole u B zamknout nebo označit „společné“), nebo patří zákazníkovi (pak zapisovat po zákaznících jako `pmZmocnitel`). Navíc: `pmZmocnitel` B leží také v `kryciProj.hodnoty` varianty, tedy ve stejném místě jako hodnota řídícího. V tisku A se teď neuplatní, ale ověřit, kudy vede. |
| VZF2-I1 | info | Zmrazené snímky KL PROJ (`kryciProj.zmrazeno`) zamčených variant nesou údaje toho, kdo byl při zámku řídící. U vlastní varianty dalšího zákazníka (9811 .2 C) jsou to údaje A. PROJ se dalšímu zákazníkovi netiskne, takže je to bez dopadu. Jen k vědomí. |
| VZF1-I2 | vysvětleno | Chybějící záznam tisku SoD DE na 9949 z 19. 11. dopoledne: skript zkoušky zavřel stránku dřív, než proběhlo tiché uložení po tisku. Po výslovném uložení se záznam `sod` uložil. Nejde o vadu aplikace. |

## Zápisy na test

Nové zakázky 9813 a 9814 (TEST sada má teď **320** „TEST -“). V 9949-K49 přibyl záznam tisku SoD u .2 (uloženo). Vypínač dvakrát přepnut, na konci ZAP.
Nic jiného se neměnilo, neúspěšné pokusy (400, 409, odmítnuté změny) se neuložily.
