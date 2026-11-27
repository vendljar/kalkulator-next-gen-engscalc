# Přehled stavu — Kalkulátor Next Gen

Generuje `python3 nastroje/prehled_stavu.py` z evidence `roadmapa/roadmap.json` a gitu; ručně needitovat.
Bez cen a osobních údajů. Spouští koordinace po každém sloučení.

## Verze

| prostředí | verze |
|---|---|
| ostrý web (`main`) | **v24.11.7** (`4e69c276`, 24. 11. 2026) |
| testovací web (`test`) | **v27.11.2** (`a40abbbe`, 27. 11. 2026) |

Test je proti main napřed o 240 commitů.

## V testu, ještě ne v main

| # | typ | co | verze |
|---|---|---|---|
| #824 (dřív K70-I3) | nález | Dotisk staré odeslané nabídky s ruční položkou se liší od originálu (řádek ve specifikaci, rozpis cenového bloku) | v27.11.2 |
| #823 (dřív K70-N1) | nález | Dotisk cizojazyčné nabídky odeslané před 26. 11. ukazuje planý dialog „Dotisk se změněným slovníkem“ (text „verze 1 → verze 1“) | v27.11.1 |
| #822 | úkol | Pojistka dočasné značky verze i mimo novinky.py: krok staticke upozorní na hotovou položku s dočasnou značkou v origin/main a origin/test (… | v26.11.3 |
| #821 | úkol | Varování rucniPolozkaPomer u víc šachet uvádí šachtu (F5) | v26.11.3 |
| #820 | úkol | Vlastnosti Wordu: náhrada bezpečná i u CDATA / atributu s „>“ / vnořeného prvku (F3); Manager prázdný, autor a iniciály komentářů a sledova… | v26.11.3 |
| #818 | otázka | Schválit znění TX: V4 překlady EN/DE/FR, #815 texty šachty bez opláštění (požární klasifikace, odvětrání, vnější lešení) a překlady popisků | v26.11.2 |
| #816 (dřív K66-I1) | nález | Slovník: heslo „… naší STUDII PROVDITELNOSTI projednat …“ s překlepem — po opravě šablony PROJ (#805) by se věta nepřeložila | v26.11.2 |
| #815 (dřív K65-I1, K65-I2) | otázka | Texty: šachta bez opláštění — zmínky o opláštění mimo blok (požární klasifikace, odvětrání zadní stěnou, lešení vně); V4 česká věta „10 % (… | v26.11.2 |
| #814 (dřív K65-N2) | nález | Word nabídky PROJ bez fotky tiskne „POHLED NA OBJEKT“ (textové pole rámečku fotky v šabloně PROJ v9; V1 maže jen odstavec) | v26.11.2 |
| #813 (dřív K65-N1) | nález | Dotisk staré odeslané nabídky víc šachet změnil pořadí řádků příplatků (madla před zábranami) — odeslané má zůstat beze změny (pravděpodobn… | v26.11.1 |
| #812 (dřív K63-I1) | nález | Uložení zakázky bez čísla / názvu: dvě skoro stejné hlášky pod sebou (#801) | v26.11.2 |
| #811 (dřív K63-N1) | nález | Objednávka PROJ (PDF): nadpis „Poznámka“ zůstane sám na konci strany, text až na další | v26.11.2 |
| #810 (dřív K62-I1) | otázka | Šablona SoD PROJ v4 (z LibreOffice) nemá ve vlastnostech prvek Company → Společnost zůstane prázdná (generátor chybějící prvek nepřidává) | v25.11.6 |
| #809 (dřív K62-N2) | nález | Text upozornění #756 v množném čísle i u jedné položky („Ruční položky … řádku „A“ a „B“ …, který je přepsaný“) | v26.11.2 |
| #808 (dřív K62-N1) | nález | Dotisk (CN, SoD) nad odeslanou zakázkou otevřenou jen ke čtení zapíše záznam tisku a protokolu jen v paměti a neuloží ho; při přepnutí zaká… | v26.11.2 |
| #807 | úkol | Nízké návrhy revize G1: F3 náhrada vlastností Wordu bezpečná i u CDATA / atributu s „>“ (po náhradě ověřit strukturu, při vadě nechat původ… | v26.11.3 |
| #804 (dřív K61-I3) | nález | Krycí list tiskne „Dne“ a datum podpisu ve tvaru 2026-11-25 místo 25. 11. 2026 | v26.11.2 |
| #803 (dřív K61-N4) | nález | Skloňování „4 položek“ v kartě Cenová nabídka | v25.11.5 |
| #802 (dřív K61-N3) | nález | Kontrola před odesláním míchá SoD OCK a PROJ (zakázka jen PROJ hlásí 28 míst SoD realizace a obráceně) | v25.11.5 |
| #801 (dřív K61-N2) | nález | Uložit zakázku bez čísla / názvu přepne na Přehled, hláška „Vyplňte v hlavičce…“ zůstane na skryté stránce Kalkulace (i main od #727) | v25.11.5 |
| #800 (dřív K61-N1) | nález | Specifikace šachty bez opláštění v nabídce dál píše opláštění (plnostěnné, kotevní terče, vzhled kotvení zasklení, vnější opláštění kotvené… | v25.11.6 |
| #795 | úkol | Jazykové verze šablony SoD projekce v4 (EN/DE/FR, 16 kB, o měsíc starší) proti české (124 kB) — ověřit úplnost | v25.11.3 |
| #794 | úkol | Vlastnosti Wordu ze šablon: Company → „ENGINEERS CZ s.r.o.“, název dokumentu (dc:title) vymazat (revize G1 N1) | v25.11.4 |
| #793 | úkol | Sekce „Co by se zapsalo do Pipedrive (náhled)“ jen pro administrátory (OCK i PROJ) | v25.11.5 |
| #792 | úkol | Krycí list PROJ: objednávka (PDF i Word) ve společné sekci se smlouvou o dílo a plnou mocí; Vytvořit smlouvu o dílo PROJ jako poslední tlač… | v25.11.5 |
| #791 | úkol | Objednávka PROJ: datum a podpis objednatele až na konec 2. strany (za Termíny a Vystavil) | v25.11.5 |
| #783 | úkol | Protokol zápisu prodeje uřízl větu o převzetí dealu | v25.11.6 |
| #782 | dávka | PD2: doplnění polí krycího listu do dealu Pipedrive + vady tisku CN + nálezy revizí | v25.11.6 |
| #781 | úkol | Připomínky: obchodník označí na obrazovce, kde je problém (zvýraznění na snímku) | v25.11.5 |
| #780 | úkol | Připomínky: snímek obrazovky jde zvětšit (otevřít v plné velikosti, přiblížit a posouvat) | v25.11.5 |
| #779 (dřív K59-N1) | nález | Poznámka dealu PROJ: závěrečná značka „— nabídka …“ nese předlohu čísla OCK (ZAK.cislo) místo čísla PROJ | v25.11.6 |
| #778 | úkol | Nízké nálezy revize MD: N1 pořadí příplatku jen z další šachty, N2 hláška 409 bez rady Ctrl+F5, N4 dodatekCesky u staré odeslané nabídky ví… | v25.11.6 |
| #777 | úkol | Částka „…“ (tečka jako oddělovač tisíců) jde do Pipedrive jako …; „-…“ jako 500 (revize MD S2) | v25.11.6 |
| #776 | otázka | K58-I2 (#775) mění cenu i rozpracovaným neodeslaným kalkulacím s kalkVerze 2 (revize MD S1) | v25.11.3 |
| #775 (dřív K58-I2) | nález | Nová kalkulace: šachta bez opláštění bez plastových kotev, cestovného a čištění | v25.11.3 |
| #774 | úkol | Ceník OCK: řádek Engineering v sekci Příplatkové položky (jen zobrazení) | v25.11.3 |
| #773 (dřív K58-N2) | nález | Pipedrive: částka převzatá jako jediné číslo z libovolného textu | v25.11.3 |
| #772 (dřív K58-N1) | nález | Zámek nabídky PROJ nese číslo OCK (předlohu) místo čísla PROJ | v25.11.3 |
| #771 | úkol | Vady tisku cenové nabídky CN (posudek CN-432): V1–V6 | v26.11.2 |
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
| #756 (dřív RP-D1) | úkol | Ruční položka Spojovacího materiálu / Lakování při ručně přepsaném řádku Hrubé OCK — cena v rozpisu podle poměru přepsaného řádku | v25.11.4 |
| #755 (dřív ZK) | úkol | Zákazníci ze zakázek: hromadné naplnění databáze zákazníků jen tam, kde data sedí podle ARES (nástroj správce) | v24.11.8 |
| #754 (dřív SA-META) | úkol | Vlastnosti dokumentu šablony (docProps/core.xml: autor, kdo naposledy uložil) se kopírují do každé vygenerované nabídky | v25.11.4 |
| #753 (dřív SA-R6, SA-R9, SA-R10) | úkol | Nízké nálezy revize SA (kontrola šablon Word): R6 skrytá položka ZIPu, R9 UTF-32 BOM, R10 selhání dekodéru UTF-16 | v25.11.4 |
| #752 (dřív PV-N1, PV-N2, PV-N3, PV-N4, PV-N5, PV-N6) | úkol | Nízké nálezy revize PV (zápis prodeje do Pipedrive): N1–N6 | v25.11.6 |
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
| #726 (dřív VZD-N1) | úkol | Zastaralé řádky termínu DPZ ve Firmě: oprava dat testu + varování v aplikaci | bod 3 — zkontrolovat Firmu na main (test bod 1 není potřeba: výchozí znění, 26. 11.) |
| #730 | dávka | Spuštění propojení s Pipedrive na main — procedura (podklady/PIPEDRIVE_SPUSTENI.md) | seznam polí pro #597 a uživatel tokenu (B1, B2) |
| #805 (dřív K61-I4) | nález | Překlep „PROVDITELNOSTI“ v šabloně nabídky PROJ | zveřejnit opravenou šablonu nabídky PROJ (čeština v8, na testu 26. 11.) i na main — postup v STAV_KOLO66 (claude/testovani-4) |
| #806 (dřív K60-I1) | otázka | Automatizace Pipedrive „Pojmenování nového dealu v4“ přepíše při založení dealu „Číslo nabídky (CN)“ na CN-<id> → existující kalkulaci nejd… | 27. 11. projde pojmenování CN a sladí s nastavením Pipedrive (návod vs. úprava automatizace) |

K tomu 15 odložených položek (vlna F) — `python3 roadmapa/roadmapa.py --zive`.

## Nehotové položky evidence

Celkem 44: J. V. 34, kolega 5, koordinace 2, dávka 3. Výpis: `python3 roadmapa/roadmapa.py --zive`.
