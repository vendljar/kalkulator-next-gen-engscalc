# Rozhodovací list — otevřené otázky k 6. 10. 2026

Stav: `main` = v30.9.1, `test-draft` = `test` = v2.10.1 (release vydán).
Konvence: **odpovídá se jen tam, kde se J. V. chce odchýlit** — jinak platí
výchozí odpověď a dávky 6. 10. podle ní pokračují. Zdroje: PREDAVKA
(test-draft), roadmapa, STAV 20. kola (2. 10.), vyhodnocení 19. kola
(list Nálezy), audity 30. 9. a 2. 10.

| # | Otázka | Výchozí odpověď | Dopad, když platí výchozí | Kde / dávka |
|---|---|---|---|---|
| 1 | **K20-N1** — rozpracovaná varianta PROJ s uloženou předvolbou „Záloha“ bez uloženého procenta se po #383 tiše řídí 70/30 (dřív 50/50), včetně plateb SoD PROJ | **Vědomé chování** (jako rozhodnutí k #383: výchozí plán platí i pro rozpracované zakázky, stejně jako každá změna firemního plánu); kód beze změny, dopsat do CHANGELOG a doplnit test, který to drží | rozpracované varianty ukážou 70/30; odeslané nabídky a zamčené varianty beze změny (zmrazený plán). 50 % se zachová jen na výslovný pokyn | dávka D |
| 2 | **#374 bod 1–2 (B114)** — hodiny/rezerva/sazba/fixKey standardních položek PROJ a cena trvalé položky s `kid` jdou obchodníkovi změnit ručním požadavkem | **Opravit**: server je proti uložené verzi (nová zakázka proti výchozímu zadání a katalogu) obchodníkovi nedovolí změnit; vlastní položka smí dál, administrátor vše | obchodník bez práva `sloupce.naklad` dostane u podvrženého požadavku 403; v UI se nic nemění | dávka A |
| 3 | **#374 / B113** — výjimka „celý ceník sestavení“ | **Zúžit** na zakázku, jejíž uložená verze ceník sestavení sama nese, nebo novou zakázku; + tvrdá zábrana dokumentu pro nulovou cenu prodávané sekce PROJ (i v kombinované nabídce) | jiné pokusy 403; dokument s nulovou cenou PROJ se nevytiskne | dávka A |
| 4 | **#374 bod 3 (B117)** — obchodní zaokrouhlení z výčtu může podtéct minimální marži nejvýš o krok − 1 | **Ponechat** jako vědomou mez (zapsat do `BEZPECNOST_MEZE.md`) | beze změny chování | dávka A |
| 5 | **#374 bod 4 (B96)** — marže z koncové ceny i bez slevy | **Jen návrh** do `podklady/`, kód ne | rozhodnutí později podle návrhu | dávka A |
| 6 | **#374 vážnost** | **Zvýšit na vysokou** (doporučení obou auditů) | roadmapa | dávka A |
| 7 | **K19-N106** — záporná plocha čelního skla v Modelu 1 u nízkých podlaží (C065, C082); Model 2 (nabídka) ji omezí nulou | **Ponechat** (Model 1 = 1:1 s Excelem v1.0, nabídka je v pořádku) | beze změny | — |
| 8 | **K19-N108** — položky ceníku v29 proti praxi v Excelech (statika, tmelení, lešení, čištění, 3D sken, cestovné …) | **Podklad pro revizi ceníku J. V.**, aplikace beze změny | žádný; revizi ceníku dělá J. V. v Nastavení | — |
| 9 | **K19-N110** — vnější lešení u interiérové šachty jen v příplatcích (C007) | **Ponechat pravidlo** (vnější lešení jen exteriér); u šachty na pavlači ručně v příplatku | beze změny | — |
| 10 | **K19-N111** — doprava projekce mimo Prahu a zaokrouhlení sekcí proti šabloně OVP | **Ponechat** (vědomá pravidla) | beze změny | — |
| 11 | **K19-N113** — kontrola #375 „boky dveří bez“ hlásí mezeru vedle dveří u 60 ze 108 převedených zakázek | **Ponechat kontrolu** (mezeru nic neoceňuje — kontrola je přínosná); zmírnit hlášku jen, když J. V. potvrdí, že ji kryje portál | beze změny | — |
| 12 | **#366** — poslední čísla papírových smluv OPR (realizace) a OVP (projekce) pro návrh dalšího čísla smlouvy; kontrola jedinečnosti při uložení | **J. V. dodá dvě čísla**; kontrola jedinečnosti ano (jen upozornění) | bez čísel se etapa C (#366 P9.1) nezačne | čeká na J. V. |
| 13 | **#380 Q7** — rozsah díla SoD PROJ je v šabloně natvrdo „DPZ+DSP“ | **Rozsah z nabízených činností** (symbol plněný z kalkulace PROJ, v šabloně SoD PROJ v3) | nová šablona SoD PROJ + symbol; samostatná dávka | další dávka |
| 14 | **#355 / #356** — můstky × přechodové plechy a × zastřešení (EXT); otázky (a)–(e) v roadmapě | **#355:** plech v nástupišti s můstkem odpadá celý, jen Model 2, ve specifikaci počet plechů. **#356:** přesah 0,2 m do šířky, do hloubky žádný; přičíst do položky zastřešení šachty (i měď); oplechování k fasádě beze změny; zaškrtávátko „můstek i v nejvyšším nástupišti“ v zadání; jen Model 2 | do odpovědi beze změny; pak samostatná dávka (zakázky bez můstků beze změny, Model 1 1:1) | čeká na J. V. |
| 15 | **#346 (B85)** — nastavení Netlify (branch deploys, náhledy, citlivé proměnné, rozdílné tajemství relace test × ostrá) | **J. V. projde 6 kroků podle podkladu z 24. 9.** a výsledek zapíše (nebo nadiktuje) do `NASAZENI_NETLIFY.md` | mimo cloud | J. V. |
| 16 | **#172** — zámek závislostí `package-lock.json` lokálně, etag na skutečných Netlify Blobs, Rate Limiting `/api/prihlaseni` | **Ponechat v roadmapě** (mimo cloud, nízká naléhavost; CI už lockfile má — ověřit lokálně) | beze změny | J. V. |
| 17 | **#383 zbytky** — vlastní plán firmy v Nastavení → Firma má přednost před výchozím 70/30; šablona PROJ v3 tiskne natvrdo „Standard“ | **Nahrát PROJ v4** a ve Firmě buď nastavit předvolbu, nebo „Vrátit výchozí z kódu“ | po nahrání se plán plateb vytiskne ve Wordu | J. V. (Nastavení) |
| 18 | **#385 zbytek** — nové znění věty o zbytku mezery u jedněch dveří | **Ponechat nové znění** | beze změny | — |
| 19 | **Nahrát šablony** SoD realizace v2, SoD PROJ v2 a nabídky PROJ v4 (Nastavení → Šablony) v testu i v ostré | **Ano** — šablony SoD v2 dávka E uloží na Disk do Output documents | cloudová kola přestanou přeskakovat `overit_sod`; K18-N92 (geodet ve Wordu PROJ) se uzavře | J. V. |
| 20 | **#379** — překlad firemní věty SKN do EN/DE/FR v číselníku na ostrém webu | **J. V. vyplní** (do repozitáře nepatří) | do té doby česká věta v cizojazyčné nabídce | J. V. |
| 21 | **#392** — VSG/SKN z ručně přepsané plochy skla | **Ano** (schváleno 2. 10.) | bez přepisu beze změny; s přepisem příplatky z přepsané plochy | dávka D |
| 22 | **Převod v2.10.1 do `main`** | **Až po vyzkoušení v testu** (P1–P6, viz PREDAVKA „Další krok“) | ostrá zůstává v30.9.1 | J. V. |
| 23 | **Archivace sezení** session_0152gTk16B8GKboeQJxTy49m (30. 9., čeká na pokyn k #374) | **Archivovat** — nahrazeno dávkou A | žádný | J. V. |
| 24 | **Smazání sloučených větví** `claude/k19-nalezy`, `claude/davka-2-10` + seznam v PREDAVKA | **Smazat** (ověřeno `merge-base --is-ancestor`) | úklid | J. V. (z cloudu HTTP 403) |
| 25 | **K20-N2** — vstupy a RUNBOOK kola (replikace 118 zakázek) nejsou v cloudu | **Nahrát balíček + RUNBOOK na Disk do Testovani** před 21. kolem | bez nich kolo H replikaci znovu vynechá | J. V. |
