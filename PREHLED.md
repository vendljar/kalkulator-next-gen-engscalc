# Přehled stavu — Kalkulátor Next Gen

Generuje `python3 nastroje/prehled_stavu.py` z evidence `roadmapa/roadmap.json` a gitu; ručně needitovat.
Bez cen a osobních údajů. Spouští koordinace po každém sloučení.

## Verze

| prostředí | verze |
|---|---|
| ostrý web (`main`) | **v24.11.7** (`4e69c276`, 24. 11. 2026) |
| testovací web (`test`) | **v25.11.3** (`63d1d9ee`, 25. 11. 2026) |

Test je proti main napřed o 138 commitů.

## V testu, ještě ne v main

| # | typ | co | verze |
|---|---|---|---|
| #776 | otázka | K58-I2 (#775) mění cenu i rozpracovaným neodeslaným kalkulacím s kalkVerze 2 (revize MD S1) | v25.11.3 |
| #775 (dřív K58-I2) | nález | Nová kalkulace: šachta bez opláštění bez plastových kotev, cestovného a čištění | v25.11.3 |
| #774 | úkol | Ceník OCK: řádek Engineering v sekci Příplatkové položky (jen zobrazení) | v25.11.3 |
| #773 (dřív K58-N2) | nález | Pipedrive: částka převzatá jako jediné číslo z libovolného textu | v25.11.3 |
| #772 (dřív K58-N1) | nález | Zámek nabídky PROJ nese číslo OCK (předlohu) místo čísla PROJ | v25.11.3 |
| #770 | úkol | Nastavení → Databáze: barvy stavových řádků záloh (zelená / oranžová / červená) | v25.11.3 |
| #769 | úkol | Krycí list: pole „Dne“ podle pražského dne (kryciDnesIso) | v25.11.3 |
| #768 | úkol | Mapa polí Pipedrive: „Příplatky v nabídce“ jen pole typu text | v25.11.3 |
| #767 (dřív ER-MIMO) | úkol | Víc šachet: příplatek zaškrtnutý jen v šachtě 2 je na krycím listu a v Pipedrive, ale ne v nabídce | v25.11.3 |
| #766 (dřív ER-N4) | úkol | Ruční značky ATYP jsou na variantu, ne na šachtu (víc šachet) | v25.11.3 |
| #765 | otázka | PO-O4: odeslání do dealu jiné nabídky, vyhraného a ztraceného | v24.11.10 |
| #764 | otázka | PO-O3: Word jako soubor k dealu (koncept) a mez B279 | v24.11.10 |
| #763 | otázka | PO-O2: pole „Datum nabídky“ v Pipedrive | v24.11.10 |
| #762 | otázka | PO-O1: odeslání do Pipedrive — která varianta a dotisk | v24.11.10 |
| #761 (dřív ER-REZIE) | úkol | Nová kalkulace bez přepínačů Výstup ze zaměření (vždy 1 ×) a Statické posouzení opláštění (podle opláštění) | v24.11.9 |
| #758 (dřív ER-REZ) | úkol | REZERVA příplatky v cenách příplatků (nové kalkulace); automat ATYP nepřepíše ruční pole | v24.11.9 |
| #757 (dřív ER-ENG) | úkol | Engineering jako příplatková položka (nové kalkulace); staré dál v Režii | v24.11.9 |
| #755 (dřív ZK) | úkol | Zákazníci ze zakázek: hromadné naplnění databáze zákazníků jen tam, kde data sedí podle ARES (nástroj správce) | v24.11.8 |
| #744 (dřív K54-I2) | nález | Na testu chybí jazykové šablony SoD projekce | v25.11.1 |
| #743 (dřív K54-I1, UT-3) | nález | test_sablona_obsah: zastaralý seznam firemních šablon — CN v18 a PROJ v9 se přeskočily | v24.11.2 |
| #742 (dřív UT-2, O2) | úkol | Popisek práva crm.pipedrive: „Pipedrive: čtení a zápis do vlastních obchodních případů“ | v24.11.2 |
| #741 (dřív UT-1) | úkol | Nápověda u volby Opláštění podle zvolené hodnoty (standard / po stěnách) | v24.11.2 |
| #740 (dřív RP-2) | úkol | Ruční položka: jednotka, dodatkový text do nabídky a překlad EN/DE/FR s kontrolou před tiskem | v24.11.6 |
| #736 (dřív RP) | úkol | Ruční položky kalkulace OCK v nabídce CN (specifikace a cenový blok) a v krycím listu | v24.11.6 |
| #640 (dřív B221) | otázka | Role jen ke čtení: „kdo smí ukládat“ je dnes každý přihlášený | v25.11.3 |
| #639 | otázka | Ruční cena: příloha PDF nabídky dodavatele a ruční cena v ceníku PROJ | v25.11.3 |
| #624 (dřív K40c-N5) | otázka | Zakázka bez autora dostane autora z relace prvního ukládajícího (B73) | v25.11.3 |
| #510 | úkol | Pipedrive: zkušební zápis na testovacím dealu | v25.11.1 |
| #116 | úkol | CRM-17 — Odeslání vygenerované nabídky do případu | v24.11.10 |
| #115 | úkol | CRM-16 — Potvrzený zápis do obchodního případu | v25.11.1 |

## Otevřené vady s dopadem na cenu

| # | co | kolo | stav | čeká na |
|---|---|---|---|---|
| #614 (dřív K40-N1) | Vada ceny v main: po přepnutí typu šachty se čelní sklo přejmenuje a zůstane vyřazené (opraveno v testu v12.11.1) | 40 | oprava ve verzi v12.11.1, v testu ještě ne | — |
| #775 (dřív K58-I2) | Nová kalkulace: šachta bez opláštění bez plastových kotev, cestovného a čištění | 58 | opraveno v testu (v25.11.3), v main ne | — |

## Čeká na J. V.

| # | typ | co | čeká na |
|---|---|---|---|
| #16 | úkol | CRM-12 — Pipedrive (zastřešující) | spuštění na main podle PIPEDRIVE_SPUSTENI C3–C9 (#730); na testu vše ověřeno 25. 11. |
| #19 | úkol | Notifikace a schvalování slev přes mobil | zadání a priorita (notifikace přes mobil zatím nezařazeny do dávky) |
| #28 | úkol | Napojit kalkulačku přes MCP na Claude | zadání a priorita (MCP napojení zatím nezařazeno do dávky) |
| #113 | úkol | CRM-14 — Výběr zakázky z Pipedrive v hlavičce kalkulace | API token a doména v proměnných Netlify (odsunuto 10. 8. 2026) |
| #117 | úkol | CRM-18 — Souběžný zápis a synchronizace změn z CRM | rozhodnutí o nedopsaných polích v CRM (odsunuto 10. 8. 2026) |
| #172 | úkol | Dokončení auditu mimo cloud: zámek závislostí, etag, brzda v Netlify | lokální `npm install --package-lock-only` a pár kliknutí v administraci Netlify |
| #222 | otázka | Nálezy čekající na rozhodnutí J. V.: V8, N1, N5, V9, V10, V11, V13, V17, V24 | rozhodnutí J. V. — sloupec „Rozhodnutí J. V.“ na listu Nálezy (sešit VYHODNOCENI_TESTU_KALKULACE); testem se do té doby jen potvrzuje, že se chování nezměnilo |
| #617 (dřív B3, B0.1) | rozhodnutí | Víc šachet na ostrém webu (main) — po ruční zkoušce na testu se zapnutým vypínačem | zapnutí víc šachet na main zatím ne (25. 11. 2026); znovu na pokyn |
| #625 (dřív K44-I1, B7, B0.8) | úkol | Sazby skladebných můstků v ceníku testu, pak samostatné kolo na můstky | sazby doplní v testu (odložit s datem; sekce Můstky je prázdná, cena se nekazí) |
| #627 (dřív DP-D1–D8, DP-T1) | otázka | DP #573 termín DPZ a dotazy obchodu D1–D8, T1 | rozhodnout (obsah v artefaktu dotazů) |
| #629 | rozhodnutí | Jmenovat kolegu s rolí administrátora (jen test) | jmenuje |
| #630 | úkol | Nahrát skill testovaci-procedura-kng podle osnovy; zkrátit skill kalkulator-next-gen do 25 kB | nahrát skilly (mimo repo) |
| #633 (dřív N46) | otázka | Nástupiště A ↔ C u zrcadlové šachty — opravit? | pokyn (bez něj se neopravuje, fuzz hlásí jen INFO) |
| #637 | úkol | Ověřit hledání organizace (itemSearch) proti ostrému účtu Pipedrive — jen čtení | ověření (automat na ostrý účet nesmí) |
| #643 | úkol | Skill roadmapa-kng: typy položek, aliasy a pravidlo jedné řady čísel (S6) | nahrát upravený skill (mimo repo) |
| #730 | dávka | Spuštění propojení s Pipedrive na main — procedura (podklady/PIPEDRIVE_SPUSTENI.md) | seznam polí pro #597 a uživatel tokenu (B1, B2) |

K tomu 13 odložených položek (vlna F) — `python3 roadmapa/roadmapa.py --zive`.

## Nehotové položky evidence

Celkem 42: J. V. 29, kolega 4, koordinace 2, dávka 7. Výpis: `python3 roadmapa/roadmapa.py --zive`.
