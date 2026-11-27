# STAV kola 70, část B — Pipedrive (plné kolo před main, test v26.11.3, 694ddeef)

Stav: **ČTECÍ BODY HOTOVÉ, ZÁPISOVÉ BODY ČEKAJÍ NA SOUHLAS J. V.** (TESTOVÁNÍ 5, 27. 11. 2026).
Zadání: `podklady/kola/ZADANI_PLNE_KOLO_PRED_MAIN_2026-11-27.md` (větev `claude/plne-kolo-zadani`), §5 B0–B11.
Dosud bez nálezu. Bez dopadu na cenu.

## Hlavička

- Test v26.11.3 (`/api/zdravi`), kandidát `origin/test` = 694ddeef. Main nic.
- Kdo: testovací sezení TESTOVÁNÍ 5, větev `claude/testovani-5`. Účty: testovací správce (`KNG_TEST_*`),
  obchodník (`KNG_TEST_OBCHODNIK_*`). Pipedrive jen dealy TEST 432 (OCK) a 437 (PROJ), čtení.
- Souhlas se zápisem pro kolo 70: **zatím nedán** (souhlas z 25. 11. byl pro kolo 60). Do Pipedrive ani na test
  se v tomto kole nic nezapsalo; náhledy jen čtou (počítají se jen do stropu náhledů).
- Kolo 64 (PD2 na v25.11.6) se nedokončilo — restart sezení přerušil zápis ještě před ním; obsah kola 64
  pokrývají body B2–B8 tohoto kola.
- Harnessy (mimo repo): curl nad `/api/pd/*`, Playwright `k70_b10.js` (karta náhledu #793).

## Výsledky

| bod | scénář | výsledek | poznámka |
|---|---|---|---|
| B0 | GET dealu: prázdná / vyplněná pole osoba a organizace | ČÁSTEČNĚ OK | Dealy 432 i 437: všechna vlastní pole typu osoba (kontakty, Druhý podepisující, Zmocnitel, Zdroj – osoba) a organizace (Podepisující firma, Zdroj – organizace) jsou v odpovědi jako klíč s `null`. Aplikace je pozná jako prázdná (náhled: Podepisující firma u obou „zapíše se“, `vCrm` prázdné). Standardní `person_id` / `org_id` vyplněné = celé číslo. **Vyplněné vlastní pole osoba / organizace: ČEKÁ NA SOUHLAS** (v dealech TEST žádné vyplněné není; ověření = vyplnit pole v dealu TEST a přečíst). |
| B1 | Mapa polí proti účtu | OK | `/api/pd/pole?obnovit=1`: 73 spárováno, chybí 0, jiný typ 0, nejednoznačné 0 (deal i organizace), 6 nezařazených polí CRM (systémová / interní). Spárována všechna pole PD2: Datum nabídky, Příplatky v nabídce, Platba 1–8, kontakty ×3, Podepisující firma, Druhý podepisující, Zmocnitel, Informováno BO / Tech, Nabídku vypracoval, Odpovědná osoba, Odchylky, Pokuta, Správní poplatky. |
| B2 | Odeslání OCK do dealu | ČEKÁ NA SOUHLAS | Náhled 432 (čtení) OK: prodaná zakázka → údaje dealu „ponechá se“, zapíše se jen poznámka; kontakty ×3 „nelze — osoba s tímto e-mailem v Pipedrive není (kalkulátor osoby nezakládá)“; Nabídku vypracoval „nelze — … mezi uživateli Pipedrive není“ (testovací účet). Nalezený kontakt a „dva stejné“ potřebují zakázku s e-mailem osoby z Pipedrive (zápis). |
| B3 | Odeslání PROJ, značka poznámky #779 | ČÁSTEČNĚ OK | Náhled 437: poznámka nese CN-437 4×, závěrečná značka „— nabídka CN-437“, předloha OCK v ní není (K59-N1 opraveno). Opakované odeslání bez zdvojení: ČEKÁ NA SOUHLAS. |
| B4 | Prodej OCK | ČEKÁ NA SOUHLAS | Náhled 432: skutečné změny jen v prázdných polích PD2 (Podepisující firma, Informováno BO / Tech); ostatní řádky „beze změny“ (hodnota v dealu = kalkulace), fáze „deal už v této fázi je“; Druhý podepisující, kopie prázdné v KL → nic. |
| B5 | Prodej PROJ, Platba 1–8 | ČEKÁ NA SOUHLAS | Náhled 437: Platba 1, 2, 4–7 „zapíše se“ do prázdných polí, Platba 3 a 8 bez milníku („prázdné“), „Mimo pole Platba“ jen v textu platebního kalendáře; Správní poplatky „nelze — … není částka“ (#773); Druhý podepisující a Zmocnitel „nelze — osoba s tímto jménem u organizace dealu není“. Součet proti ceně díla se ověří po zápisu. |
| B6 | Prodej PROJ se starým plánem / v eurech | ČEKÁ NA SOUHLAS | potřebuje TEST zakázku PROJ se starým plánem nebo v EUR navázanou na deal TEST. |
| B7 | Souběh náhled × ruční změna v Pipedrive | ČEKÁ NA SOUHLAS | |
| B8 | Částky „5.000 Kč“, záporná, text | ČÁSTEČNĚ OK | Text místo částky: Správní poplatky 437 → „nelze“ s důvodem, ostatní řádky dál „zapíše se“. „5.000 Kč“ a záporná: ČEKÁ NA SOUHLAS (úprava TEST zakázky). |
| B9 | Kombinovaná OCK + PROJ, víc šachet | ČEKÁ NA SOUHLAS | |
| B10 | Práva | ČÁSTEČNĚ OK | Obchodník u cizí zakázky (CN-432 / 437): náhled odeslání i prodeje 403 („zapisuje autor zakázky, kdo nabídku odeslal / prodal, vedoucí nebo administrátor“); zápis prodeje s platným otiskem náhledu správce 403; zápis bez platného otisku 400 — protokol zakázky beze změny. #793: karta „Co by se zapsalo do Pipedrive“ v krycím listu OCK — obchodník ji nevidí, správce ano (9878, CN-432). Vypnutý zápis: ověřen v kole 60 na v25.11.3; na v26.11.3 znovu jen se souhlasem a přepnutím PIPEDRIVE_ZAPIS (J. V.). Obchodník — potvrzení zápisu u vlastní zakázky: ČEKÁ NA SOUHLAS. |
| B11 | Úklid | — | Nic se nezapsalo. Na testu z kola 60 zůstává deal TEST 439, kalkulace CN-439, TEST 9877 / 9878 (mazat jen na pokyn J. V.). |

## Nálezy

Žádné. (Informace: náhled prodeje 432 / 437 má stav `zapise` i u řádků s příznakem `bezeZmeny`; skutečná změna
jen v polích PD2 — v souladu s dávkou, ne nález.)

## Co je potřeba k dokončení

1. Souhlas J. V. v tomto sezení se zápisem na test a do dealů TEST 432 / 437 (a případně nové TEST zakázky / deal
   pro B6, B9) pro kolo 70 B.
2. Pro B10 „vypnutý zápis“ přepnutí `PIPEDRIVE_ZAPIS` J. V. (nebo převzít výsledek kola 60).
