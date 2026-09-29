# Předávka — stav k 29. 9. 2026

Na `main`: **v25.9.3** (+ oprava Node), tag `v25.9.3`.
Na `test`: **v25.9.5**. Na `test-draft`: **v25.9.6** (dávka A kola 16).
Na `claude/pensive-curie-s6yzs3` (tohle sezení, nad `test-draft`): **v29.9.1**
(kód = v26.9.1, 29. 9. jen předávka) — testovací sekvence A1–A5 + opravy B72/P4, B75–B78, N43 (server). Pravidlo
J. V. (29. 9. 2026): úpravy se dělají vždy promptem do paralelní větve; větev
zůstává, o sloučení rozhoduje J. V.
Roadmapa: `roadmapa/roadmap.json` (365 položek), stránka se generuje
`python3 roadmapa/roadmapa.py`.

## Tag v29.9.1 a komplexní test v novém sezení (29. 9. 2026)
- Tag **`v29.9.1`** označuje tuto dávku (hlava větve
  `claude/pensive-curie-s6yzs3`). Na rozdíl od dřívějších tagů NENÍ na `main`
  — je to stav k testu, ne vydání.
- Komplexní testovací procedura (skill `testovaci-procedura-kng`) běží
  v samostatném sezení nad tagem, se zadáním níže. Výsledky (protokol,
  bezpečnostní audit, prompty k opravám) přijdou odtamtud; kód se opravuje
  jen promptem do paralelní větve.

```
Komplexní testovací procedura Kalkulator Next Gen nad tagem v29.9.1
(repozitář vendljar/kalkulator-next-gen-engscalc). Komunikace česky, nikdy
AskUserQuestion — ptej se prózou s navrženými výchozími odpověďmi. Dodrž
skilly kalkulator-next-gen a testovaci-procedura-kng (kroky 0–9 včetně
bezpečnostního auditu). Kde se skill rozchází s tímto zadáním, platí zadání.

CO SE TESTUJE
Tag v29.9.1 (hlava větve claude/pensive-curie-s6yzs3; kód = v26.9.1,
v29.9.1 je jen předávka). Obsah dávky: testovací sekvence A1–A5
(src/test_fuzz_invarianty.js, hlídač členských výrazů v src/test_escape.js
a obecný oddíl overit_xss.mjs, src/test_zamek_historie.js + src/fixtury/,
nastroje/kontrola_udaju.py + nastroje/povolene_kontakty.txt,
nastroje/testovaci_kolo.sh) a opravy N43 na serveru (jadro_moduly.cjs),
B72/P4 (netlify/lib/zakazka_kontrola.mjs), B75–B78 (přihlášení, nová sada
netlify/test_prihlaseni.mjs). Podrobně CHANGELOG.md (v26.9.1, v29.9.1)
a PREDAVKA.md v tagu.

VĚTEV A PRAVIDLA
- Pracuj jen ve své větvi (přidělí ji sezení, vychází z tagu). Do test-draft,
  test ani main nic. Pravidlo J. V. 29. 9. 2026: úpravy se dělají vždy
  promptem do paralelní větve. CLAUDE.md v tagu ještě jmenuje test-draft —
  toto zadání má přednost.
- Procedura jen testuje a čte (pravidlo 7 skillu): zdrojáky se v tomto
  sezení nemění. Každá odchylka od očekávání je nález do protokolu
  (pravidlo 6). Ke každému nálezu, který chce opravu, připrav samostatný
  prompt pro paralelní větev: repo a větev nad tagem, Pravidlo 0 (nejdřív
  ověřit, že vada trvá), požadované chování, testy s pojistkou proti
  prázdnému testu (selže před opravou, projde po ní), konvence, dokumentace.
- Nikdy needituj dist/*. Žádné ceny, firemní ani osobní údaje do repozitáře
  ani do protokolu, nic z _soukrome/. Konce řádků LF. Mutační běh se nikdy
  nepřerušuje.

PROSTŘEDÍ (krok 0 skillu platí takto)
- Zdrojáky se NEstahují ze zipu na Disku: pracovní strom je klon repozitáře
  na tagu v29.9.1. Pevná cesta /home/claude/work/kng už není potřeba —
  harnessy od 22. 9. 2026 hledají firemní podklady ve složce z KNG_PODKLADY.
- Firemní podklady (v repozitáři nejsou, NIKDY je necommituj): konektorem
  Google Drive (složka Kalkulator NextGen: Output documents, šablona CN i
  ve složce _CN) stáhni do jedné složky MIMO repozitář a nastav KNG_PODKLADY:
  Sablona_NABIDKA_CN_v<nejvyšší>.docx (i jazykové mutace EN/DE/FR, jsou-li),
  Sablona_NABIDKA_CN_v11.docx (část overit_sablony_online),
  Sablona_NABIDKA_PROJ.docx (z Sablona_NABIDKA_PROJ_v2_opravena.docx,
  přejmenovat), Sablona_SOD_REALIZACE.docx, Sablona_SOD_PROJEKCE.docx,
  Sablona_PLNA_MOC.docx a nejnovější *_MANUAL_OBCHODNIK.html (overit_manual
  chce v názvu aktuální verzi — postupuj podle skillu). Když konektor nebo
  soubor chybí, řekni J. V. jednou větou, co má přiložit, a pokračuj;
  dotčené harnessy se hlásí jako PŘESKOČENÉ (nic neověřily), nikdy jako
  prošlé.
- Playwright: symlinky node_modules/playwright a node_modules/playwright-core
  na $(npm root -g)/…, nikdy playwright install.
- test.js a test_proj.js (shoda s Excelem) potřebují ostrý ceník — v cloudu
  se přeskočí vždy; známé omezení, ne nález.
- Z Drive stáhni i poslední TESTOVACI_PROTOKOL_*.xlsx a poslední
  *_BEZPECNOSTNI_AUDIT_*.md — navazuje se na ně, nikdy prázdná tabulka.

AUTOMATIZOVANÁ ČÁST (kroky 1–5 skillu) = jeden příkaz
    KNG_PODKLADY=<složka> bash nastroje/testovaci_kolo.sh
(kontrola verze + sestavení bez zvýšení verze → všechny sady v Node i na
serveru → smoke + všechny overit_*.mjs → mutace jádra → mutace serveru →
statické kontroly → souhrn s počty). Trvá kolem 40 minut: pusť na pozadí,
počkej na konec, NEPŘERUŠUJ. Když overit_verzi.mjs narazí na jiný den než
29. 9., pusť kolo s KNG_VERZE_MIMO_DEN=1 — to není nález.
Základ z 26. 9. 2026 (bez podkladů): sady 182 prošlo / 0 selhalo /
6 přeskočeno, mutace jádra 76/76, mutace serveru 187/187, statické kontroly
3/3. S podklady má zůstat přeskočený jen test.js; každé jiné číslo je nález,
nebo musí být v protokolu vysvětlené.
Krok 6 skillu (pripravit_github.py, zkontroluj_pred_gitem.py,
vyrob_vzorky.py) v repozitáři není — nahrazuje ho statická kontrola
nastroje/kontrola_udaju.py uvnitř kola; zapiš to do protokolu, není to nález.

BEZPEČNOSTNÍ AUDIT (krok 7)
Regrese VŠECH známých nálezů (audit 22. 8. 2026 a hloubkový test 24. 9. 2026:
B1…B88, N43…N57); u B72, B75, B76, B77, B78 a N43 (server) ověř opravu.
Nové nálezy ve třech čočkách nad netlify/ a server/ (v období se měnily).
Subagenti jen čtou, každý nález doloží soubor:řádek, vysoké ověř druhým
nezávislým čtením. Dej jim netlify/test_prava.mjs, netlify/test_prihlaseni.mjs
a netlify/mutace.mjs s pokynem „uveď, co testy NEhlídají".

ZNÁMÉ A ROZHODNUTÉ — uvést stav, nehlásit jako nové
- N46 se neopravuje bez pokynu J. V. (fuzz ho hlásí jen jako INFO).
- #365 (rozměr profilu mimo tabulku JEKLY shodí Kalkulaci OCK) — oprava běží
  v paralelním sezení; proto overit_xss.mjs zatím neotravuje dim a tl.
- Telefon a jméno kolegy v overit_nabidka_proj_word.mjs — čeká na
  rozhodnutí J. V. (dočasně v nastroje/povolene_kontakty.txt).
- CSP bez 'unsafe-inline' — jen návrh. B79 ponecháno rozhodnutím J. V.
  B80, B81, B83, B88 (#345) jsou otevřené.

VÝSTUPY (kroky 8–9)
- TESTOVACI_PROTOKOL_<RRRR-MM-DD>_v29.9.1.xlsx (navázaný na poslední,
  struktura listů beze změny, vzorce Souhrnu roztažené na poslední řádek),
  <RRRR-MM-DD>_kalkulator_BEZPECNOSTNI_AUDIT_v29.9.1.md, STAV .md
  a prompty k opravám (.md, jeden na nález nebo ucelenou skupinu) — vše
  přes SendUserFile. Device bridge v cloudu není: řekni to jednou větou.
- Do své větve commitni jen PREDAVKA.md (výsledky, nálezy, prompty, co čeká
  na J. V.) — protokol ani podklady ne. Commit v jiný den než 29. 9.:
  kontrola verze měří den posledního commitu, proto zvedni verzi
  (python3 build.py) a zapiš do CHANGELOG „jen předávka" (vzor v29.9.1).
- Na konci tabulka úkolů ✅/⬜ a spotřeba kontextu (get_session →
  context_usage; nad 60 % upozornit, nad 75 % přepsat předávku a doporučit
  nové sezení).
```

## Hotovo v26.9.1 — roadmapa #364 (podrobně CHANGELOG.md)
- **Pravidlo 0:** B69, B70, B71, B73, B74, N43 (klient), N44, N45, N47–N57
  už byly opravené (v24.9.4–v25.9.5) — přeskočeno. **N46 neopraveno** (bez
  pokynu J. V.; fuzz ho hlásí jen jako INFO).
- **Opraveno:** N43 na serveru (`jadro_moduly.cjs` + kryci, kryci_proj,
  poznamky, protokol), B72/P4 (`netlify/lib/zakazka_kontrola.mjs` — jedna
  kontrola pro uložení i obnovu; #342 hotovo), B75–B78 (přihlášení jako
  celek; část #345 — zbývá B80, B81, B83, B88).
- **Nové testy:** A1 `src/test_fuzz_invarianty.js`, A2 hlídač členů
  v `src/test_escape.js` + obecný oddíl v `overit_xss.mjs` (207 kontrol),
  A3 `src/test_zamek_historie.js` + `src/fixtury/*.json`, A4
  `nastroje/kontrola_udaju.py` + `nastroje/povolene_kontakty.txt`, A5
  `nastroje/testovaci_kolo.sh` (pred_pushem.sh = obal, CI volá tentýž
  skript), `netlify/test_prihlaseni.mjs`, +9 testů B72, +14 mutací serveru.
  U každého je v commitu doloženo selhání před opravou.
- **Ověřeno celým kolem:** celé kolo `nastroje/testovaci_kolo.sh` 26. 9. 2026 (38 min): kontrola verze + sestavení ✓; sady 182 prošlo, 0 selhalo, 6 přeskočeno (test.js — skutečný ceník není v repozitáři; overit_manual, overit_nabidka_proj_word, overit_sablona, overit_sablony_online, overit_sod — firemní podklady mimo repozitář, KNG_PODKLADY); mutace jádra chycených 76 z 76; mutace serveru 187 z 187 (z toho 14 nových); statické kontroly 3 z 3. Dvě předchozí kola téhož dne našla a bylo opraveno: `test_mutace.mjs` po přesunu B59 měřil prázdno; mutace „vypnutý účet se nepozná“ přežila (dvě nezávislé pojistky, jeden test — doplněn cílený test v `test_prava.mjs`); dva testy struktury CI četly workflow (přesměrovány na testovaci_kolo.sh, kontrola verze přesunuta na začátek kola); souhrn kola nevypisoval přeskočené sady (pole v podshellu).

## Čeká na J. V. (rozhodnutí)
- **N46** (nástupiště A ↔ C u zrcadlové šachty, #343 „ověřit s J. V."): fuzz
  I8a/I8b hlásí rozdíly jen jako INFO; oprava až na pokyn.
- **#365 (nález A2-1):** zakázka s rozměrem profilu mimo tabulku JEKLY shodí
  vykreslení Kalkulace i Detailu OCK (`JEKLY[p.dim].kg` v `ui/kalk_ock.js`).
  J. V. 29. 9. 2026 rozhodl opravit; prompt k opravě připraven
  (`2026-09-29_PROMPT_CLAUDE_CODE_oprava_365_neznamy_profil.md`, má ho J. V.),
  oprava poběží v samostatné paralelní větvi nad touto.
- **Telefon a jméno kolegy** v `overit_nabidka_proj_word.mjs` (kontrola „v
  šabloně nezůstal"): skutečný údaj ve veřejném repu; dočasně v povoleném
  seznamu `nastroje/povolene_kontakty.txt` s poznámkou (viz #346 / B79).
- **CSP bez `'unsafe-inline'`:** jen návrh (nikde needitováno).
- Dál platí z minula: soubory SoD (#350), kolo 16 dávky B/C/D (#361–#363),
  #355, #356, #346 Netlify, #172 lokálně npm.

## Poznámky pro další sezení
- **Testy jedním příkazem:** `bash nastroje/testovaci_kolo.sh` (celé kolo,
  ~50 min) nebo `--bez-mutaci`; `--jen sady` apod. Mutační běh nepřerušovat.
  Logy kroků v `$KNG_KOLO_LOGY` nebo v mktemp složce vypsané v souhrnu.
- `netlify/test_mutace.mjs` spouští skutečnou mutaci (B59) a posílá signály —
  nepouštět souběžně s mutačním během.
- Nový smyšlený kontakt v testu → zapsat do `nastroje/povolene_kontakty.txt`
  s důvodem, jinak statická kontrola (a CI) skončí červeně.
- Harnessy potřebují `node_modules/playwright` (symlink na `$(npm root -g)`)
  a `ADMIN_EMAIL=spravce@priklad.cz` (testovaci_kolo.sh ho nastaví sám);
  šablony pro harnessy přes `KNG_PODKLADY=<složka>` — jinak se hlásí jako
  přeskočené (nic neověřily).
- Komentář uvnitř `KOD_STRANKY` v `overit_xss.mjs` nesmí obsahovat zpětné
  apostrofy (je to template literal). Komentář s uzavírací značkou skriptu
  v `src/` rozbije celou aplikaci.
- Server musí načítat v `jadro_moduly.cjs` tytéž moduly migrací jako
  prohlížeč (pořadí CORE v build.py) — jinak se odeslané zakázky po
  uložení liší (N43). Hlídá `src/test_zamek_historie.js`.
- Sezení 25.–26. 9. běželo přes 1,5 M tokenů kontextu bez pádu díky
  automatickému shrnutí; přesto předávku psát po každé dávce.
