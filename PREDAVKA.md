# Předávka — stav k 29. 9. 2026 (komplexní test v29.9.1)

Na `main`: **v25.9.3** (+ oprava Node), tag `v25.9.3`.
Na `test`: **v25.9.5**. Na `test-draft`: **v25.9.6** (dávka A kola 16).
Na `claude/pensive-curie-s6yzs3`: **v29.9.1** (kód = v26.9.1, 29. 9. jen předávka) —
testovací sekvence A1–A5 + opravy B72/P4, B75–B78, N43 (server). Tag `v29.9.1`
na její hlavu (`9a48ee8`) zakládá J. V. ručně.
Na `claude/komplexni-test-v29.9.1` (tohle sezení, nad `9a48ee8`): **jen tahle
předávka** — kód beze změny, výsledky komplexní testovací procedury.
Pravidlo J. V. (29. 9. 2026): úpravy se dělají vždy promptem do paralelní
větve; o sloučení rozhoduje J. V.
Roadmapa: `roadmapa/roadmap.json` (365 položek), stránka se generuje
`python3 roadmapa/roadmapa.py`.

## Výsledek komplexní testovací procedury 29. 9. 2026 (21. kolo)

**Verdikt: VYHOVUJE S NÁLEZY.** Automatizované kolo je celé zelené, audit našel
**3 vysoké nálezy jedné třídy „koncová cena bez schválení" (B111, B96, B112)** —
každý potvrzený dvěma nezávislými čteními s pokusem — a 3 střední.

- **Celé kolo** `KNG_PODKLADY=<složka> bash nastroje/testovaci_kolo.sh` (45 min 32 s):
  kontrola verze + sestavení ✓; **sady 187 prošlo, 0 selhalo, 1 přeskočeno** (jen
  `test.js` — skutečný ceník); **mutace jádra 76 z 76**; **mutace serveru 187 z 187**
  (0 chybně zadaných); **statické kontroly 3 z 3**; strom po běhu čistý.
- Podklady z Disku (mimo repozitář): šablony CN v13 + EN/DE/FR, CN v11, PROJ
  (v2_opravena), SoD realizace a projekce, plná moc, příručka v25.9.3 (číslo verze
  přepsáno podle kroku 0.7 skillu). Se všemi podklady se nic dalšího nepřeskočilo.
- Počty po sadách (každá sada zvlášť po kole): 185 sad, všechny kód 0, 9 291
  kontrol OK, 0 FAIL — mimo jiné `test_prava` 582, `test_prihlaseni` 43,
  `test_obnova` 158, `overit_xss` 207, `test_zamek_historie` 56.
- Krok 6 skillu (`pripravit_github.py` a spol.) v repozitáři není — nahrazuje ho
  statická kontrola `nastroje/kontrola_udaju.py` (350 souborů čistých); podle
  zadání, ne nález.
- **Opravy v26.9.1 drží:** B72/P4, B75, B76, B78, N43 (server). **B77 jen z poloviny**
  (akce „heslo" na vlastní účet správce projde bez starého hesla a brzdy).
  Regrese B1–B95 a N43–N57: **0 regresí**.

### Nálezy (číslování pokračuje od B96 a N59)

| ID | Vážnost | Nález | Prompt |
|---|---|---|---|
| **B96** | **vysoká** | Server nekontroluje krok obchodního zaokrouhlení (`zaokr`, `zaokrProj`): obchodník (jedno volání z konzole) sníží cenu OCK těsně pod polovinu bez schválení a pod marži; táž sleva procentem 403 i u administrátora; nový zámek „shoda", dokument slevu neukáže. | B96 |
| **B111** | **vysoká** | Vlastní položka se zápornou cenou/množstvím projde v **běžném UI** obchodníka i na serveru: cena −37 % (PROJ −40 %) bez schválení; marže se neukáže, kontroly a fronta schvalování mlčí, nabídka bez stopy. N56 drží jen v UI. | B111 |
| **B112** | **vysoká** (ruční požadavek) | Zápisová strana B88: ceník varianty (přirážka, jednotkové ceny) a skryté přepisy hlídá jen UI; z konzole cena −25 až −42 %. | B112 |
| B97 | střední | Kolize klíčů e-mailu a adresy v úložišti `pokusy`: anonym e-mailem `ip:<adresa>` zablokuje přihlášení celé cizí adrese (regrese B33 vlivem B75). | přihlášení a účty |
| B98 | střední | Obnova ze souboru převezme podvržené razítko ověření nového zámku i odemčení. | obnova |
| B99 | střední | Šablona Wordu se zveřejní bez kontroly externích vztahů, maker a OLE. | šablony |
| B100–B104 | nízká | obnova: firma/zákazníci/šablony bez očisty; smazání rozhodnutí o slevě; otisk zámku bez ověření; `?sber=1` padá na klíči z Object.prototype; historie textů mimo zálohu | obnova · schvalování · sběr |
| B105–B110 | informativní | datum schválení od klienta; tělo null → 500; bootstrap bez hesloVerze; klouzavé okno brzdy; CHANGELOG B72; slepá místa hlídačů XSS | různé |
| B77, B32, B4 | zbytky | vlastní heslo správce; klíč a 4 MB v obnově; souběh brzdy | přihlášení · obnova · — |
| N59–N61 | drobné | kryci_proj.js bez fixtury; šablona PROJ s webovou adresou .eu (v2_opravena i v3); `overit_verzi.mjs` nechá v `dist/` soubor s vyšší verzí | testy · J. V. · testy |

Výstupy (v chatu sezení, do Output documents je nahraje J. V. — device bridge
v cloudu není): `TESTOVACI_PROTOKOL_2026-09-29_v29.9.1.xlsx` (281 kontrol:
257 VYHOVUJE, 19 NEVYHOVUJE, 5 NEOVĚŘENO — shoda s Excelem a ostré zakázky se
v cloudu neověřují), `2026-09-29_kalkulator_BEZPECNOSTNI_AUDIT_v29.9.1.md`,
`2026-09-29_kalkulator_v29.9.1_STAV_komplexni_test.md` a prompty
`2026-09-29_PROMPT_*.md` (B111; B96; B112; přihlášení a účty; obnova ze souboru; šablony
Wordu; schvalování a zámek; sběr textů; testovací mezery). Každý prompt je
samostatný pro paralelní větev nad `9a48ee8`: Pravidlo 0, požadované chování,
testy s pojistkou proti prázdnému testu, konvence, dokumentace.

## Čeká na J. V. (rozhodnutí)
- **B111, B96, B112:** pustit opravy prioritně, tři samostatné paralelní větve
  (výchozí návrh: ano, B111 první — jde v běžném UI); rozhodnout, zda server
  počítá marži z koncové ceny i bez slevy (návrh: ano pro kroky mimo výčet).
- **B111:** smí administrátor zápornou položku (dobropis)? Návrh: ne, jako N56.
- **B112:** nové číslo (návrh), nebo B88b? B88 dál jen čtecí strana.
- **B97:** vážnost střední (návrh) nebo nízká (DoS).
- **B4 souběh a B6 odhlášení:** opravit, nebo zapsat do `BEZPECNOST_MEZE.md`
  (návrh: zapsat).
- **N60:** opravit webovou adresu v šabloně PROJ (v2_opravena i v3) a v dalším
  kole přejít s harnessem na PROJ v3.
- **Příručka:** na Disku je v25.9.3, `manual/obsah.json` mluví jen o v25.9.3 —
  novou příručku vyrobit (návrh: až po opravě B96).
- Dál platí: **N46** (bez pokynu se neopravuje, fuzz jen INFO), **#365** (oprava
  v paralelním sezení; `overit_xss.mjs` zatím neotravuje `dim` a `tl`), **telefon
  a jméno kolegy** v `overit_nabidka_proj_word.mjs` (dočasně v
  `nastroje/povolene_kontakty.txt`), **CSP bez `'unsafe-inline'`** (jen návrh),
  **B79** ponecháno, **B80, B81, B83, B88** (#345) otevřené; soubory SoD (#350),
  kolo 16 dávky B/C/D (#361–#363), #355, #356, #346 Netlify, #172 lokálně npm.
- **Před ostrým nasazením lokálně:** `test.js`/`test_proj.js` se skutečným
  ceníkem, porovnání s ostrými zakázkami, vizuální kontrola PDF/Wordu,
  `curl -I` na `/api/*` (no-store, nosniff — B37), nastavení náhledů Netlify (B85).

## Poznámky pro další sezení
- **Stahování z Disku:** malé soubory vrací konektor přímo (base64), velké uloží
  do souboru v `tool-results/` — dekódovat Pythonem, nikdy nekopírovat base64
  ručně. Protokol ani podklady do repozitáře nepatří.
- **Kolo jedním příkazem** běží na pozadí ~45 min a mutace přepisují pracovní
  strom — hook „necommitnuté změny" během kola hlásí právě je; necommitovat,
  počkat na konec a ověřit `git status`. Auditní subagenti čtou čistou kopii
  (`git archive HEAD | tar -x -C <složka>`), zprávy ať zapisují do souborů
  (předávaná zpráva se usekává).
- **Počty po sadách** pro protokol: po kole (ne souběžně s mutacemi) spustit
  každou sadu zvlášť a vzít souhrn „N OK, M FAIL" / „N prošlo, M selhalo" /
  „PASS=N FAIL=M".
- **Protokol:** Výsledek „NEOVĚŘENO" pro kontroly, které v cloudu nemohou běžet
  (shoda s Excelem, ostré zakázky) — nepočítá se do VYHOVUJE ani NEVYHOVUJE.
  V protokolu 24. 9. byly řádky B78, B85, B91 listu Nálezy omylem sloučené
  přes A:F a prázdné — v protokolu 29. 9. opraveno.
- Testy jedním příkazem: `bash nastroje/testovaci_kolo.sh` (celé kolo) nebo
  `--bez-mutaci`; `--jen sady` apod. Logy kroků v `$KNG_KOLO_LOGY`.
- `netlify/test_mutace.mjs` spouští skutečnou mutaci (B59) — nepouštět souběžně
  s mutačním během.
- Nový smyšlený kontakt v testu → `nastroje/povolene_kontakty.txt` s důvodem.
- Komentář uvnitř `KOD_STRANKY` v `overit_xss.mjs` nesmí obsahovat zpětné
  apostrofy; komentář s uzavírací značkou skriptu v `src/` rozbije aplikaci.
- Server musí načítat v `jadro_moduly.cjs` tytéž moduly migrací jako prohlížeč
  (pořadí CORE v build.py) — N43; `kryci_proj.js` zatím bez hlídače (N59).
