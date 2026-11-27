# STAV kola 70, část B — Pipedrive (plné kolo před main, test v26.11.3, 694ddeef)

Stav: **HOTOVO** (TESTOVÁNÍ 5, 27. 11. 2026). Verdikt: **ZELENÁ s výhradami** — žádná vada ceny ani zápisu do Pipedrive;
1 nízký nález textu (K70-B1), 1 informace pro ostrý provoz (K70-B-I1); B9 a EUR část B6 NEOVĚŘENO (chybí TEST data).
Dopad na cenu: **ne**.
Zadání: `podklady/kola/ZADANI_PLNE_KOLO_PRED_MAIN_2026-11-27.md` (větev `claude/plne-kolo-zadani`), §5 B0–B11.

## Hlavička

- Test v26.11.3 (`/api/zdravi`), kandidát `origin/test` = 694ddeef. Main nic.
- Kdo: TESTOVÁNÍ 5, větev `claude/testovani-5`. Účty: testovací správce (`KNG_TEST_*`), obchodník (`KNG_TEST_OBCHODNIK_*`).
- **Souhlas J. V. v sezení 27. 11.:** „souhlasím, založ vlastní TEST organizaci“; „schvaluji všechny potřebné úpravy
  v testovacím dealu pipedrive“; vypínání zápisu znovu netestovat (převzít kolo 60).
- Pipedrive jen dealy TEST: 432 (OCK), 437 (PROJ), 439 (B0), nové 442 (B6) a 443 (B9). Založeno: organizace „TEST K70 s.r.o.“
  (1876), smyšlené osoby 2934–2938 (`@priklad.cz`). Osoby ve STAV jen „sedí / nesedí“.
- Postup jako uživatel: aplikace v prohlížeči (Playwright; dialogy potvrzeny harnessem) — Odemknout prodej, Odemknout
  k úpravám, úprava, zámek stejnou funkcí jako tisk (`zamekPoTisku`, bez generování Wordu), Prodáno; náhled a zápis
  `/api/pd/odeslani|prodej` jako tlačítka. Před každým zápisem uložen náhled, po zápisu deal čten pole po poli.
- Harnessy mimo repo: `k70.js`, `k70_pd.py`, `k70_b10.js`, `k70_plan.js`, `k70_strany.js`, `k70_hlav.js`.

## Výsledky

| bod | scénář | výsledek | poznámka |
|---|---|---|---|
| B0 | GET: prázdná / vyplněná pole osoba a organizace | OK | Prázdné = klíč s `null` (aplikace pozná jako prázdné). Vyplněné (deal 439: osoba, organizace, kontakt) = celé číslo ID; aplikace s ním počítá jako s vyplněným („ponechá se“, B4). |
| B1 | Mapa polí | OK | 73 spárováno, 0 chybí / jiný typ / nejednoznačné; všechna pole PD2. |
| B2 | Odeslání OCK (CN-432) | OK | Náhled: smluvní kontakt nalezen podle e-mailu — „Jméno (Organizace)“ sedí; obchodní (e-mail u dvou osob) „nelze — víc osob“; technický „nelze — osoba není“; Datum nabídky. Zápis: zapsáno přesně to (kontakt sedí, Datum nabídky = den zámku), obchodní/technický prázdné, poznámka aktualizována na místě (počet beze změny), fáze/hodnota/osoba/organizace dealu beze změny, nic nezaloženo. |
| B3 | Odeslání PROJ (CN-437) | OK | Poznámka nese CN-437 i v závěrečné značce (#779); dvě odeslání za sebou → stále jedna poznámka odeslání (aktualizace na místě, druhé „beze změny“). |
| B4 | Prodej OCK (CN-432) | OK | Zapsáno jen do prázdných: Podepisující firma (organizace podle názvu — sedí), Informováno Tech (dnešek). Ručně vyplněné Informováno BO zůstalo („ponechá se“), vyplněný kontakt nepřepsán, pokuta „5.000 Kč“ nelze (B8). Stav dealu open, fáze 26, hodnota beze změny. Nabídku vypracoval „nelze“ (testovací účet není uživatel Pipedrive — očekávané). |
| B5 | Prodej PROJ, nový plán (CN-437) | OK | Platba 1, 2, 4–7 zapsány a sedí s náhledem; součet Plateb + „mimo pole Platba“ = cena díla = součet Platebního kalendáře; Platba 3 a 8 bez milníku prázdné. Mazání: Platba 3 ručně vyplněná → náhled „vymaže se“ s důvodem → po zápisu prázdná, ostatní Platby beze změny. Způsob fakturace u PROJ nezapsán. Správní poplatky záporné „nelze“, hodnota v dealu nepřepsána. |
| B6 | Prodej PROJ se starým plánem (9454 K18-P14, deal 442) | OK (EUR NEOVĚŘENO) | Starý plán: Platby 1–8 „prázdné“, nic nezapsáno; ručně vyplněná Platba 1 po zápisu zůstala (nemaže se). Druhý podepisující a Zmocnitel nalezeni podle jména u organizace dealu — sedí. Podepisující firma nenalezena → „nelze“, nic nezaloženo. Fáze — viz K70-B-I1. PROJ v EUR: na testu žádná TEST zakázka PROJ v EUR (kód: `pdnPlatby` vrací nic pro `pl.eur`, stejná větev jako starý plán). |
| B7 | Souběh náhled × ruční změna | OK | Po náhledu prodeje 432 ručně vyplněno Informováno BO → zápis 409 „Deal v Pipedrive nebo podklad zápisu se od náhledu změnil — nic se nezapsalo“; nový náhled ukázal pole jako „ponechá se“. |
| B8 | Částky | OK | „5.000 Kč“ → „nelze — tečka jako oddělovač tisíců… napište 5 000 Kč“; záporná → „nelze — částka je záporná“; text → „nelze — není částka“; ostatní pole zapsána. |
| B9 | Kombinovaná OCK + PROJ | NEOVĚŘENO | Na testu není TEST zakázka s cenou OCK i PROJ (zkoušeno 13 kandidátů; „kombinované“ mají jednu stranu bez ceny). Ověřeno jen: zakázka s cenou jen OCK → hodnota z OCK, jen PROJ → z PROJ. Nová kombinovaná = celá kalkulace + tisk (TESTOVÁNÍ 4 / J. V.). |
| B10 | Práva | OK | Obchodník u cizí zakázky 403 (náhled i zápis s platným otiskem), protokol beze změny; #793 karta „Co by se zapsalo“ jen administrátor. Vypnutý zápis: převzato z kola 60 (v25.11.3; kontrola `PIPEDRIVE_ZAPIS` v `lib/pipedrive.mjs` se do v26.11.3 nezměnila) — J. V. 27. 11. |
| B11 | Úklid | OK | viz níže |

## Nálezy

### K70-B1 — Dialogy u zakázky jen PROJ ukazují číslo předlohy OCK (nízká, cena ne)

- Kroky: CN-437 (jen PROJ) → Odemknout prodej / Odemknout k úpravám / Prodáno.
- Stalo se: text dialogu „Odemčení prodeje varianty 2026 - OPR - CN - .“, „Označit variantu 2026 - OPR - CN -  jako PRODANOU“.
- Mělo být: CN-437 (číslo PROJ) — stejně jako #772 / K59-N1 u zámku a poznámky. Jen text dialogu; uložená data správně.

### K70-B-I1 — Automatizace Pipedrive vrátí fázi po zápisu prodeje (informace, cena ne)

- Deal bez kontaktní osoby s telefonem a e-mailem (442): zápis prodeje přesunul deal do fáze 26 a kalkulátor hlásí
  „Fáze dealu“ zapsáno; automatizace „Povinný kontakt v5“ ho za 3 s vrátila do 22 s poznámkou „Pro posun do další
  obchodní fáze prosím vyplň telefon a e-mail kontaktní osoby“. Kalkulátor o tom neví.
- Pro main: rozhodne J. V. — kontaktní osoba povinná v dealu před prodejem (návod), nebo kalkulátor po zápisu fázi
  přečte a upozorní (dávka).

## Úklid (B11) a co zůstalo

- Deal 432: vymazána pole vyplněná kolem (kontakt smluvní, Podepisující firma, Informováno BO / Tech). Zůstává
  Datum nabídky = 27. 11. (nový zámek nabídky). Fáze, hodnota, stav beze změny.
- Deal 437: vymazány Platby 1–7, Podepisující firma, Informováno. Datum podpisu a termíny PROJ odpovídají novému
  prodeji 27. 11. Správní poplatky dál stará hodnota (K59-I1, neřešeno). Poznámka odeslání jedna.
- Deal 439: vymazána pole z B0.
- Zakázky: CN-432 a CN-437 — hlavička a krycí list vráceny na hodnoty před kolem, nový zámek nabídky 27. 11., prodané.
  9454 (K18-P14), 9854, 9830 — krycí list vrácen, prodej odemčen (před kolem neprodané), vazba na deal zrušena
  (deal v zakázce odmítnutý, odkaz v dealu smazán). Historie zakázek nese záznamy kola (odemčení s důvodem „TEST K70“).
- Pipedrive zůstává (smazat jen na pokyn J. V.): dealy 439, 442, 443; organizace 1876; osoby 2934–2938.
- PIPEDRIVE_ZAPIS na testu beze změny (ano).
