# Změny Kalkulátoru Next Gen

Zapisují se sem dávky a to, co v nich bylo opravené. Verze nese konvenci
`vDEN.MĚSÍC.pořadí` (`v21.9.2` = 21. září, druhá dávka toho dne).

Podrobné zdůvodnění každé opravy je ve zprávě commitu a v komentáři u kódu —
tenhle soupis slouží k rychlé orientaci, ne jako náhrada za ně.

---

## C3 — Controlling: hromadný export za období a export z Přehledu (#447, větev claude/controlling-c3) — verzi přidělí sloučení

Rozhodnutí J. V. 21. 10. 2026 (dialog s koordinací), body 1, 2 a 4. Nad `claude/integrace-16-10` 2cb9d2b (v21.10.2),
build bez zvýšení verze (`KNG_NEZVYSOVAT_VERZI=1`).

- **Tlačítko „Export pro controlling" v Přehledu cenových nabídek** (bod 1): u zamčené řídící varianty otevřené
  zakázky v seznamu variant, jen administrátor online (v rolovém náhledu se nekreslí). Stáhne týž XLSX jako
  Nastavení → Controlling → Export předkalkulace; mapování se dotáhne ze serveru, chyba jde do dialogu.
- **Hromadný export za období na serveru** (bod 2): nové `GET /api/controlling/export?od=&do=&oblast=&rada=`
  (`netlify/functions/controlling_export.mjs`), **jen administrátor** (server, matice `test_prava`). Výběr podle
  **dne zamčení (odeslání) v českém čase**, filtr **OCK / PROJ / obojí** a **číselná řada ČR / ZAHR / obojí**; jen
  zamčené řídící varianty, částky ze zmrazeného výsledku tisku, mapování = platná uložená verze. Prohlížeč z odpovědi
  složí **týž sešit** (Řádky, Kapitoly, Popis — stejné sloupce, víc zakázek) nebo CSV; Popis nese období, filtry,
  seznam zakázek (zmrazený / přepočtený výsledek) a **přeskočené zakázky s důvodem**. Ovládání v Nastavení →
  Controlling → Export předkalkulace → „Hromadně za období" (výchozí období = tento měsíc).
- **Protokol exportů:** každý hromadný export se zapíše (kdo z relace, kdy, období, oblast, řada, počet zakázek
  a řádků; posledních 200 v `program/controlling_exporty`), posledních 10 je vidět pod formulářem.
- **Meze:** období nejvýš 400 dní, nejvýš 600 zakázek k přečtení, 150 zakázek v souboru a 5 MB odpovědi — při
  překročení **413 s výzvou zúžit období**, nikdy potichu oříznutý soubor (`CTRL_HROMADNY`, `BEZPECNOST_MEZE.md`).
- **Nastavení controllingu dál bez hesla správce** (bod 4) — beze změny.
- **Sloupec „V nabídce" u příplatků (bod 3) se NEDĚLÁ** — čeká na rozhodnutí J. V.; text sloupce „V základní ceně"
  je nově na jednom místě (`ctrlVZakladuText`), kam se rozhodnutí doplní.
- Testy: `src/test_controlling.js` 170 (+24: filtr, den v Praze, předvýběr, výběr zakázky, oblast, sešit za období,
  CSV), `netlify/test_controlling.mjs` 50 (+22: práva, období, řada, oblast, přeskočené, protokol, strop 413),
  `test_prava` +2 řádky matice, `overit_controlling.mjs` 42 (+12: tlačítko v Přehledu jen admin a jen u zamčené
  řídící, stažení, hromadný XLSX/CSV, protokol, neplatné období se nepošle), mutace „#447 C3" (13).
  Pojistka: před opravou model padal (funkce neexistovaly), serverová sada nenašla funkci, harness neviděl tlačítko.

---

## v21.10.2 — O9: opravy kódu aplikace z auditu K4 bez rozhodnutí J. V. (větev claude/o8-k4-nalezy)

Dávka O9 (noční koordinace 21. 10. 2026) nad `claude/integrace-16-10` 12b41b0 (v20.10.8). Build bez zvýšení
verze (`KNG_NEZVYSOVAT_VERZI=1`), číslo přidělí sloučení. Audit `podklady/K4_AUDIT_20_10.md` (`claude/k4-kolo` 5113d0a).
Každá oprava má test s pojistkou (před opravou selže, po ní projde) a mutace „O9“.

- **#460 (K4-N1, K4-N5 — texty mezí).** `BEZPECNOST_MEZE.md` oddíl K3-N15 tvrdil, že odeslané nabídky změna Firmy
  nezasáhne — kapitoly IV.–VI. a doložky OCK se ale při zamčení nezmrazují (dotisk je bere z aktuální Firmy);
  opraveno na skutečný stav, zmrazení kapitol rozhodne J. V. Oddíl #151 N1 (limit otisků) popisuje opravu K4-N5.
- **#461 (K4-N5) — limit vynucených otisků bez souběhu.** `porizVynuceny` (`netlify/lib/zalohovani.mjs`): v instanci
  pod `vyhradne` kontrola limitu a zápis rezervace `vynucene-rezervace/<slot>~<náhoda>` PŘED pořízením otisku
  (rezervace se počítá jako otisk, se svým otiskem jako jeden slot); druhá kontrola bez vlastní rezervace — cizí
  rezervace jiné instance → vlastní smazat a 429 (fail-closed); po otisku se rezervace smaže, starší 24 h se uklidí.
  Pojistka: 5 souběžných požadavků před opravou 5× 200, po ní 1× 200 + 4× 429.
- **#462 (K4-N6)** — šablona nabídky PROJ v7 (`{{PROJ_DPZ_UVOD}}` / `{{PROJ_TITUL_CINNOSTI}}`) bez bloků
  `BLOK_STUDIE_*` ze seznamu k odstranění → dokument nevznikne s hláškou o šabloně nabídky (`src/docxgen.js`).
- **#463 (K4-N7)** — „Zapsat výchozí hodnoty“ zveřejní jen platební podmínky: `firmaJenPodminky` (`src/firma.js`) —
  liší-li se místní Firma od online kopie i jinde, odejde online kopie s novými podmínkami a ostatní rozdíly zůstanou
  místně (hláška je vyjmenuje). Zvolena varianta bez nového dialogu (J. V. U1: „zapisuj je rovnou stiskem“; dotaz by
  stisk zase zdržel a na stav Firmy se admin dívá ve Firmě). Bez online kopie jako dosud.
- **#464 (K4-N12, K4-N14)** — `/api/zaloha_vynuceno` bere pole těla jen jako text/číslo (objekt s `toString` dřív
  500 → teď 400 / běžná odpověď); záznam kopie na Disk odemkne retenci jen ke kopii jednoho ze 7 nejnovějších nočních
  otisků (z klíčů úložiště, ne z hodin — žádná časovaná bomba v testech).
- **#465 (K4-N15)** — automatika po přihlášení správce kopii na Disk nepořizuje a na heslo se neptá, jen připomene
  tlačítko; `posledni_kopie.json` se zapíše až po přijetí záznamu serverem (`src/ui/online_ui.js`).
- **#466 (K4-N16)** — okno hesla správce po obnově běží od ZADÁNÍ hesla; obnova delší než okno heslo neuloží.
- **#467 (K4-N18)** — 413 u zakázky nad 4 MB rozepíše velikost (přílohy a fotky / zmrazené údaje odeslaných variant
  / ostatní) a poradí podle největší části (`zakazkaVelikostHlaska`); tělo do 2× stropu se kvůli tomu přečte.
- **#468 (K4-N21)** — kokpit koordinace: třídy z dat jen z povoleného seznamu, čísla jen jako čísla; nový
  prohlížečový test `overit_kokpit.mjs` (stará šablona 5 ✕, XSS se spustil; nová 9/0).
- **Testy a pojistky:** `netlify/test_zalohy.mjs` 130 → 146 (před opravou 135/11; +1 souběh porizVynuceny = 147), `netlify/test_prava.mjs` +3
  (před 2 FAIL), nový `src/test_o9_k4.js` 10 (před opravou 5 FAIL: K4-N6 2, K4-N7 3), `src/test_zobrazeni_heslo_okno.js` +2
  (před 2 FAIL), `src/test_o7_kopie_klient.js` +2 (před 1 FAIL), `overit_online.mjs` (před 4 ✗, po 268/0),
  `overit_podminky_zverejnit.mjs` (před 3 ✗, po 35/0), `overit_kokpit.mjs` 9.
- **Mutace:** server +14 „O9“, jádro +3 „O9“; úseky starších mutací (#151 N1, K3-N8 ×2, K3-N1 ×2, K3-N4 ×3, jádro
  K3-N3 ×2) přepsané na nový kód (`--kontrola` server 682, jádro 402 úseků — vše právě jednou). Cílené běhy: jádro
  „O9“ 3/3, „K3-N3“ 3/3; server „O9“ 14/14, „K3-N1“ 26/26, „K3-N4“ 7/7, „#151 N1“ 5/5, „K3-N8“ 3/3. Při prvním běhu
  přežily 4 mutanty (dvojí kontrola po K4-N5/N14 je udělala ekvivalentními; „bez řazení v instanci“ test souběhu
  nevynutil) — kód zjednodušen, úseky přesměrovány, přidán test souběhu přímo nad `porizVynuceny` s bariérou.
- **Kolo `--bez-mutaci`:** sady 288 prošlo / 0 selhalo / 6 přeskočeno (firemní podklady); statické 3/4 —
  **kontrola verze selže záměrně**: commity jsou z 21. 10., `verze.txt` zůstává 20.10.8 (verzi přidělí sloučení,
  v21.10.2).
- **Příručka:** „Co je nového v dávce O9“ (admin: Zapsat výchozí hodnoty, kopie na Disk po kliknutí, hláška 413) —
  při sloučení přejmenovat na číslo verze.
- **Nedělá se (rozhodne J. V.):** zmrazení kapitol a doložek OCK (K4-N1), kdo smí přepsat výjezd (K4-N4), retence
  do potvrzení (K4-N13), termín starého tvaru výjimky (K4-N17), Rulesets (K4-N20).

---

## v21.10.1 — S10: nástroj šablon překládá nadpis „CENA ZA … (DPZ)*“ a šablona PROJ v8 (větev claude/s10-sablona-proj-v7)

- `nastroje/vyrob_sablony.js` (`trStavSeZavorkou`, `prelozSablonu`): překlad úseku se závorkou těsně před symbolem —
  nadpis „CENA ZA … (DPZ){{PROJ_DPZ_HVEZDICKA_ZNACKA}}:“ zůstával v EN/DE/FR šabloně česky. Test
  `src/test_sablona_proj_v7_preklad.js` 13/0 (před opravou selže). Kód aplikace beze změny — stejná chyba
  v `docxPrelozUseky` (aplikace, „vyrobit jazykovou verzi“) čeká na kódovou dávku.
- Šablona Wordu OVP-CN PROJ **v8** CZ + EN/DE/FR (v7 + cestovné D2): soubory mimo repozitář (sezení S10), postup
  `podklady/SABLONA_PROJ_V8_20_10.md`; ověřeno vyplnění kódem v20.10.7 v 16 kombinacích bez zbylých symbolů.

---

## v21.10.1 — C2: Controlling — obrazovka, upozornění u ceníku, export předkalkulace (#447, větev claude/controlling-navrh)

Spuštěno na pokyn J. V. předaný koordinací 20. 10. ~15:45 („C2 přes noc"). Verzi přidělí koordinace (C1 + C2 jako jedna verze).

- **Nastavení → Controlling** (jen administrátor online, J7; `src/ui/controlling_ui.js`): karty **Nákladové skupiny**
  (název, položka ManVysl, účty Helios nyní/budoucí, přímý/nepřímý, variabilní/fixní, oblast; přidat / zrušit),
  **Mapování položek** (každý klíč ceníku, pseudo-klíč i trvalá položka → skupina, filtr OCK/PROJ, „jen nezařazené",
  hledání, stažení a nahrání mapování v XLSX s náhledem změn) a **Export předkalkulace**. Změny v pracovní kopii,
  na server tlačítkem „Uložit jako novou verzi" (s poznámkou); ukládají se jen **odchylky** mapování od výchozího.
- **Upozornění u zveřejnění ceníku (J5):** karta „Platný ceník programu" ukáže trvalé položky bez skupiny a nabídne
  je rovnou zařadit a uložit; zveřejnění neblokuje.
- **Export předkalkulace jedné varianty (J9):** jen **zamčená řídící** varianta otevřené zakázky (zmrazený výsledek
  z tisku), XLSX s listy **Řádky** (32 sloupců: číslo, akce, zákazník, verze ceníku a mapování, klíč, skupina,
  účty, množství, jednotková a celková nákladová cena, prodejní cena), **Kapitoly** (součty po skupinách + souhrn
  zakázky se slevou, zaokrouhlením a marží) a **Popis**; CSV = list Řádky (středník, desetinná čárka, BOM, ochrana
  proti vzorcům). Kč bez DPH i u zahraniční řady; příplatky označené jako volby.
- Oprava modelu C1 nalezená harnessem: trvalé položky katalogu OCK leží pod `KATALOG.polozky` (dřív se hledaly
  o úroveň výš a nezařazené by se neukázaly).
- Testy: `src/test_controlling.js` 146 (export, CSV, import, odchylky), nový harness `overit_controlling.mjs` 30
  (záložka, uložení, zařazení z karty ceníku, stažený XLSX a CSV, import), mutace „#447 C2" (7).
  Pojistka: harness před opravou katalogu padal (TypeError / 0 nezařazených), testy exportu padají bez kontroly
  zámku, řídící varianty, ochrany CSV a odmítnutí klíče v importu (mutace).

---

## v21.10.1 — C1: Controlling — nákladové skupiny a mapování (#447, větev claude/controlling-navrh)

Nad `test` 5dc28d1 (v20.10.1). Návrh a rozhodnutí J. V. J1–J11: `podklady/CONTROLLING_NAVRH_20_10.md`.
Verzi přidělí koordinace při slučování.

- **Nové `src/controlling.js`** — číselník nákladových skupin (Andyiných 12 + Režie – kalkulační
  příspěvek, Rezerva, 3 návrhové PROJ, Nezařazeno), výchozí mapování každého klíče ceníku OCK i PROJ
  podle stabilního klíče (nové od v2.9.4 zařazené: můstek → zámečníci, VSG 4.4.2 → sklo, Cetris →
  materiál, hodina cesty PROJ → cestovné), pseudo-klíče řádků bez klíče ceníku (rezervy, přirážka
  ATYP, zámečník atyp, souhrny spojovacího materiálu a lakování, doprava PROJ, trvalé a ruční
  položky), rozvrh výsledku výpočtu OCK i PROJ do skupin a souhrn po kapitolách. Mimo jádro výpočtu —
  engine se nemění, Model 1 zůstává 1:1.
- **Nové `/api/controlling`** (GET/POST jen Administrátor, verze s historií, úložiště
  `program/controlling`); záloha, kopie na Disk a obnova (s očistou) controlling nesou.
- Testy: `src/test_controlling.js` (úplnost mapování proti ceníku i jádru, součty rozvrhu = náklad
  kalkulace v Modelu 1 i 2, záznam), `netlify/test_controlling.mjs` (práva, verze, odmítnutí, záloha,
  obnova), řádky v `test_prava.mjs`, mutace „#447“ v `netlify/mutace.mjs`.
  Pojistka: bez zařazení položky (C.oplechFasadaBmKc), bez řádku rezervy a bez rozpoznání přirážky
  ATYP testy padají; bez `controlling` v záloze a bez očisty v obnově padá serverová sada.

---

## Nástroj a testy (bez nové verze aplikace) — O8: opravy nálezů K4 bez rozhodnutí J. V. (větev claude/o8-k4-nalezy)

Dávka O8 (noční koordinace 20. 10. 2026) nad `claude/integrace-16-10` 89816fe (v20.10.8). Aplikace se nemění,
verze zůstává v20.10.8. Nálezy z auditu K4 (`podklady/K4_AUDIT_20_10.md` ve větvi `claude/k4-kolo`).

- **#452 (K4-N2) — W2 nesmaže čerstvou dávkovou větev.** `nastroje/sloucene_vetve.sh` dřív bral stáří jen
  z committer date špičky, takže nová větev bez vlastního commitu nad starou špičkou `test` (nebo `test-draft`,
  integrace) byla „stará a celá v test“ a smazala se. Git čas založení ani pushe vzdálené větve nezná, proto:
  1. s `--github-repo` (workflow předává `$GITHUB_REPOSITORY` a `GH_TOKEN`) se bere **čas poslední aktivity
     větve z GitHubu** (`gh api repos/<repo>/activity?ref=refs/heads/<větev>`) — push, založení, force-push;
     mladší než `stari_hodin` → větev zůstane;
  2. bez údaje z API (lokálně, selhání, prázdná historie) se smaže jen **doložitelně sloučená práce**: špička je
     druhým rodičem merge commitu v `test` a **neleží na hlavní linii (first-parent)** `main`, `test`, `test-draft`
     ani `claude/integrace-*`. Čerstvá větev nad test/integrací ukazuje na commit z jejich hlavní linie → zůstane,
     i když je ten commit zároveň druhým rodičem sloučení integrace. Větev sloučená převinutím (fast-forward) se od
     čerstvé odlišit nedá → zůstane s důvodem „stáří nelze doložit“. Zbylá mez bez API: větev založená přesně na
     špičce jiné, už mergem sloučené dávkové větve.
  Nad skutečným repem bez API (20. 10. noc): kandidátů 25 → 20; 5 větví (3 na hlavní linii test, 2 nesloučené
  mergem) je nově „stáří nelze doložit“ — s API ve workflow se rozhodnou podle času pushe.
- **#453 (K4-N3, s ním K4-N9) — mazání s `--force-with-lease`.** `git push --force-with-lease=refs/heads/<v>:<sha
  z fetch> origin --delete refs/heads/<v>`: pushne-li dávka do větve mezi načtením a smazáním, smazání se odmítne,
  větev i nový commit zůstanou, souhrn má oddíl „Smazání selhalo“ s vysvětlením, kód 1. Plné jméno ref.
  Nečitelná špička nebo čas commitu → větev vynechaná (část K4-N19).
- **Test `nastroje/test_sloucene_vetve.sh` 17 → 33 kontrol:** nové větve `nova-davka` (na staré špičce test),
  `nova-nad-integraci`, `ff-sloucena`, `vnitrni-commit`; podvržené `gh` (čas aktivity, selhání, bez údaje);
  podvržený `git`, který těsně před smazáním pushne z druhého klonu (souběh). **Pojistka:** původní skript
  12 prošlo / 21 selhalo, nový 33 / 0. Mutace skriptu ručně: bez lease 9 ✗, bez hlavní linie 10 ✗, bez merge
  kritéria 8 ✗, bez API 4 ✗, ignoruje čas API 2 ✗, selhání počítané jako smazání 5 ✗ — všechny chycené.
- **#454 — prázdný test po V7-N2.** `src/test_sod_en.js` „česká DPH + administrativní budova“ běžel s výchozím
  režimem (od V7-N2 přenesená povinnost), takže mutace „prohlášení o snížené sazbě i mimo stavbu pro bydlení“
  přežila. Test volí českou DPH výslovně a ověří i bytový dům (prohlášení má). `node mutace_jadro.mjs "snížené
  sazbě"`: před úpravou 1 nechycená, po ní 2/2; mutace „DPH“ 15/15. Kód aplikace beze změny.
- Kolo `--bez-mutaci`: sady 286 prošlo / 0 selhalo / 6 přeskočeno, statické kontroly 4/4.
- **Pokračování O8 (zadání koordinace 20. 10. noc):**
  - **#455 (K4-N10)** `--stari-hodin` jen 1–8760: nuly na začátku se odříznou („08“ = 8, ne oktal), nejvýš
    4 číslice (2^64 + 24 by v bash přeteklo na 24), 0 / nečíselné / mimo rozsah → kód 2.
  - **#456 (K4-N11)** job `smazat` má `if: github.ref == 'refs/heads/main'`; skript v Actions mimo
    `refs/heads/main` skončí kódem 2 bez mazání; komentář workflow opraven (formulář dovolí i jinou větev).
  - **#457 (K4-N19)** `set -euo pipefail` + `set -f` (`*` ve `--vynechat` je text); přepínač bez hodnoty
    nespadne na `shift`.
  - Cesta „smazání selhalo“ krytá (mutant `|| true` u mazání: 5 kontrol selže).
  - **#458 (K4-N8)** `src/test_d2_proj_sikora.js` „zamčená varianta: ruční text zůstává“: zámek přes
    `zamkniVariantu` (zamceno, zmrazený výsledek PROJ), výjimka z `nabidkaProjData` = selhání. Pojistka:
    s podvrženou výjimkou starý test 73/0, nový 72/1.
  - Test `nastroje/test_sloucene_vetve.sh` 33 → 48 kontrol; proti skriptu z první části O8 35 / 13 ✗, nový
    48/0. Ruční mutace finálního skriptu 14/14 chycené (`|| true` u mazání, bez lease, selhání jako smazání,
    bez `set -f`, bez délky, bez odříznutí nul, bez horní meze, nula povolena, bez kontroly ref, bez hlavní
    linie, bez merge kritéria, ignoruje čas API, bez API, bez stáří commitu).
  - Kolo `--bez-mutaci` po pokračování: sady 286 / 0 / 6 přeskočeno, statické 4/4; mutace jádra „D2“ 18/18.
- **O8 část 3 — #459 (K4-N23, jen test):** `netlify/test_obnova.mjs` posouvá hodiny o +11 min na každý vynucený
  otisk, ale klíč otisku porovnával s `dnes()` ze skutečných hodin → v okně ~23:49–24:00 UTC FAIL „serverový otisk
  pořízen pod dnešním dnem“ (červené mutace serveru i CI kolem půlnoci). `postVynuceny` si v době požadavku zapamatuje
  den posunutých hodin a kontrola porovnává s ním. Pojistka se zfalšovaným časem 23:55 UTC (`node --import` s
  podvrženým `Date`): před opravou 234 OK / 1 FAIL, po ní 235/0; ve skutečném čase 235/0. Kolo `--bez-mutaci`
  286 / 0 / 6 přeskočeno, statické 4/4; mutace serveru „obnov“ 55/55.
  - Mimo rozsah: opravy v kódu aplikace z K4 (N1, N4–N7, N12–N18, texty MEZE) čekají na konečný audit K4
    a rozhodnutí J. V.; K4-N20 (Rulesets) → J. V.

---

## v20.10.8 — K29-N1: příplatek za měď jen se zastřešením šachty v nabídce (větev claude/k29-med-bez-strechy)

Nález 29. testovacího kola (20. 10. 2026): PŘÍPLATEK ZA STŘECHU V MĚDI (EXT) se nabízel
i u EXT šachty, která zastřešení v nabídce nemá (řádek ZASTŘEŠENÍ ŠACHTY (EXT) vyřazený přes
`nepocitat`); od #356 v něm byla i plocha stříšky nad můstkem. Main v15.10.14 stejně (bez #356),
není to regrese. **Rozhodnutí J. V. 20. 10.:** „pokud není na zakázce střecha, tak zastřešení
můstku nejspíš řešit nebudeme.“

- `src/engine.js`: jedno místo `zastreseniVNabidce` = EXT && zastřešení není v `nepocitat` &&
  jeho ruční množství není platná nula (prázdno není nula). Bez toho řádek `medStrecha` nevznikne
  (Model 1 i 2). Výjimka: vlastní platné ruční množství mědi = vědomá dohoda, řádek zůstává.
  Název mědi se zapíše do rejstříku i bez řádku (přepisy nejsou sirotci). Výsledek nese
  `strecha.vNabidce` (mimo otisky).
- `src/kontroly.js`: `mustekStrecha` mlčí při `strecha.vNabidce === false`.
- Testy `src/test_mustky.js` +18 (oba modely): před opravou 18 selže, po ní 85/0.
  Mutace jádra „K29-N1“ +5 (5/5 chycených), celé mutace jádra 316/316; sady 222/0/1 přeskočeno; hledaný úsek mutace #356 „měď nezná střechu nad
  můstkem“ upraven na konstantu názvu.
- Zakázky se zastřešením v nabídce beze změny (stávající testy #356, fixtury 12 variant / 5 zamčených
  na korunu stejně).
- Mimo rozsah (nehlášeno jako oprava): zastřešení v nabídce s ručně přepsanou plochou (ne nulou) —
  měď dál bere vypočtenou plochu, ne přepsanou.

---

## Nástroj (bez nové verze aplikace) — W2: mazání sloučených větví jedním klikem (větev claude/w2-mazani-vetvi)

Dávka W2 (J. V. 20. 10. 2026) nad `test` 5dc28d1. Aplikace se nemění, verze zůstává v20.10.1.

- **Nový workflow `.github/workflows/smazat_vetve.yml` „Smazat sloučené větve“** — jen ruční spuštění
  (GitHub → Actions → Smazat sloučené větve → Run workflow), `permissions: contents: write` jen pro něj
  (testy.yml dál `contents: read`, B125), checkout připnutý na SHA, mazání `git push origin --delete`
  přes GITHUB_TOKEN. Vstupy `jen_vypsat` (výchozí false), `stari_hodin` (24), `vynechat`. Souhrn běhu:
  smazané, vynechané s důvodem, nesloučené, počty. **V Actions se objeví až po sloučení do `main`.**
- **`nastroje/sloucene_vetve.sh`** — výběr: větev celá v `test`, nikdy `main`, `test`, `test-draft`,
  `claude/integrace-*`, větev s commitem mladším než N hodin ani větev z `--vynechat`; lokálně `--jen-vypsat`.
- **Test `nastroje/test_sloucene_vetve.sh`** (17 kontrol na dočasném holém originu) ve statických
  kontrolách `testovaci_kolo.sh` (nově 4 kontroly). CLAUDE.md: mazání dělá J. V. tlačítkem, koordinace
  už odkazy po větvích nepřipravuje.

---

## v20.10.7 — U1: zveřejnění platebních podmínek přímo na záložce Smlouvy / Šablony, zarovnání limitu pokut (větev claude/u1-podminky-zverejnit)

**Celé kolo K4 nad b6f49a7 (v20.10.7, 20.–21. 10. 2026; dávka K4, koordinace „ŘÍDÍCÍ 20.10 noc“, větev claude/k4-kolo) — 1 PŘEŽIVŠÍ MUTACE JÁDRA (prázdný test po V7-N2, kód v pořádku):**
build OK; sady **286 prošlo / 0 selhalo / 6 přeskočeno** (`test.js` + 5 harnessů bez `KNG_PODKLADY`);
mutace jádra **393/394**, otisky obou jader po běhu souhlasí; mutace serveru **668/668**, 0 chybně
zadaných; statické kontroly **4/4**. Kód aplikace ani verze se neměnily.
- **Přeživší: „DPH: prohlášení o snížené sazbě i mimo stavbu pro bydlení“** (`sod.js`). Test
  „česká DPH + administrativní budova“ (`src/test_sod_en.js:206`) běží s výchozím režimem, který je od
  V7-N2 přenesená povinnost → kontrola projde vždy. Nález **K4-N22** (nízký), oprava testu bez J. V.
- **`netlify/test_obnova.mjs` padá ~23:49–24:00 UTC** (posun hodin +11 min na každý vynucený otisk proti
  nepřesunutému `dnes()`) — nález **K4-N23** (nízký). Doloženo v kole: 23 částí mutací serveru spuštěných
  v tom okně skončilo „sady nejsou zelené ani bez mutace“, po 00:01 UTC prošly.
- **Průběh:** server po 60 částech filtrem podle souboru (2h strop úlohy přerušil 3× rozběhnutou část —
  `vyjimky.js`, `zakazka.js`, `ukazkove.js`; SIGTERM, soubor vrácen, část opakována celá); úplnost
  ověřena po názvech proti zadání (668 unikátních mutací). Pracovní kopie po každé části čistá.
- **Bezpečnostní audit `1b0e2f7..b6f49a7`:** `podklady/K4_AUDIT_20_10.md` — 0 kritických, 0 vysokých,
  **3 střední** (K4-N1 kapitoly IV.–VI. a doložky OCK se při zamčení nezmrazují a `BEZPECNOST_MEZE.md`
  tvrdí opak; K4-N2 skript W2 smaže čerstvou dávkovou větev založenou nad starší špičkou `test`;
  K4-N3 W2 maže bez `--force-with-lease`, souběžný push se ztratí), 10 nízkých (vč. K4-N22, K4-N23),
  10 informativních. Regrese K3: 18 opraveno, K3-N2 částečně. Rozhodnutí J. V. chtějí K4-N1, K4-N4,
  K4-N13, K4-N17, K4-N20; ostatní jdou opravit bez něj (K4-N2, K4-N3, K4-N22 dělá O8).

Dávka U1 (postřehy J. V. 20. 10. 2026 + zpřesnění ~12:00), základ `test` 5dc28d1 (v20.10.1).

- **Tlačítko „Zapsat výchozí hodnoty"** (dřív „Zapsat výchozí hodnoty do Firmy"): stisk zapíše
  výchozí podmínky do firemních údajů a **na serveru je rovnou zveřejní** — stejná cesta a kontroly jako
  zveřejnění ve Firmě (`onlineZverejniFirmu(true)`: jen administrátor online, `firmaLzeZverejnit`, chyba
  serveru se ohlásí), jen bez druhého dotazu. Výsledek (úspěch / chyba) se ukáže přímo na záložce.
  Hláška dřív posílala na tlačítko „Zveřejnit", které na záložce nebylo.
- **Stav a tlačítko na záložce** (pod oddílem „Společné pro OCK i PROJ"): po ruční úpravě kteréhokoli
  pole záložky (sazby, limit, OCK/PROJ, věty, kapitoly) svítí **„Neuloženo online"** s výčtem rozdílů a
  primární **„Zveřejnit změny online"**; když je online totéž, jen nenápadné „Zveřejnit znovu (není
  potřeba)". Bez serveru / bez přihlášení administrátora se tlačítko nekreslí a záložka i hláška řeknou
  proč. Panel v Nastavení → Firma zůstává (sdílí `onlineFirmaZverejnitBlok`). Hláška „Doplnit všechny
  prázdné" u kapitol nabídky říká totéž.
- **Značka ukázkových dat:** „Zapsat výchozí hodnoty" ji nově nesundává (zápis mimo `firmaSet`, stejně
  jako doplnění kapitol) — se zveřejněním rovnou stiskem by jinak na server mohla jít ukázková firma.
- **Zarovnání:** řádky platebních podmínek mají sloupec jednotek pevné šířky (`.podm-jednotka`), takže
  vstupy končí v jedné svislici — „Limit smluvních pokut", „Splatnost faktur", „Doba záruky" a
  zádržné (výběr + %) byly posunuté doleva. Ověřeno snímkem 1400 i 760 px.
- **Test** `overit_podminky_zverejnit.mjs` (30): přejmenované tlačítko, offline jen zápis + věta proč,
  stisk online = zápis + POST `/api/firma` (podvržené `onlineApi`) bez dotazu, potvrzení a stav na
  záložce, ruční úprava → „Neuloženo online", chyba serveru, ukázková data, hláška kapitol, pravé okraje
  vstupů ±2 px v obou kartách a dvou šířkách. Pojistka: nad původním kódem padá (tlačítko, hlášky, stav).
  `test_escape.js`: `z.tlacitko` v `PROVERENO_CLENY` (literál z kódu).

---

## v20.10.6 — V7-N2: výchozí režim DPH v ČR = přenesená daňová povinnost (větev claude/v7n2-dph-pdp)

Dávka V7-N2, základ `test` 5dc28d1 (v20.10.1). **Rozhodnutí J. V. 20. 10. 2026:** „toto ignoruj,
zadej v ČR primárně přenesenou daňovou povinnost a obchodník si může měnit" — otázka pro účetní
(nález V7-N2, `podklady/SOD_EN_KONTROLA.md` body 1 a 4) se neřeší.

- **Změna chování (roadmapa #438):** `kryciDphRezimVychozi` — zákazník **bez DIČ** dostane ve SoD
  realizace výchozí **přenesenou daňovou povinnost (tuzemsko)** jako DIČ CZ (do v20.10.5 česká DPH,
  B189). Cizí DIČ beze změny (bez výchozí volby, zábrana `sodDphZabrana`). Ruční volba má přednost
  (rozbalovátko, ↺ vrátí výchozí), uložená volba i zmrazené předvyplnění zamčené varianty se nemění.
- **Testy:** `src/test_sod_en.js` — výchozí bez DIČ, přepnutí na českou DPH v SoD CZ/EN/DE/FR (věta
  i prohlášení o snížené sazbě), ↺, UI zábrana bez DIČ mlčí. Pojistka: proti 5dc28d1 3 FAIL, po
  opravě 49 / 0. Mutace `V7-N2` 3/3 (nahrazují „B189: bez DIČ přenesená povinnost"), `B189` 8/8.
- Příručka: „Co je nového v20.10.6" a kapitola 24; SOD_EN_KONTROLA: body 1 a 4 vyřešeny.
- **Ověření:** `testovaci_kolo.sh --bez-mutaci` VŠE ZELENÉ — 281 prošlo / 0 selhalo / 6 přeskočeno, statické 3/3.

---

## v20.10.5 — B183 volba (b): plocha v obsahu cenové výjimky na 0,1 m² (větev claude/b183-plocha-01)

Rozhodnutí J. V. 20. 10. 2026 (audit kola 27, `podklady/AUDIT_2026-10-18_v17.10.5.md`, B183;
kontrola V7: V7-6, V7-N1). Základ `test` 5dc28d1 (v20.10.1).

- **B183 (nízká, opraveno):** obsah výjimky nesl plochu pásu a světlíku „jiné“ na celé m² — zvětšení
  po schválení 2,50 → 3,49 m² dalo týž obsah (nekrytý nárůst až skoro 1 m²). Teď `vyjimkyM2Schvaleni`
  drží plochu **na 0,1 m² nahoru** (J. V. ~13:20: „pak bude vždy nákladově pokrývat horší variantu“;
  2,50 → 2,5, 2,51 i 2,60 → 2,6, 2,61 → 2,7; tolerance šumu plovoucí čárky): mez < 0,1 m² na pás či
  světlík × rozdíl sazeb, nejvýš do plochy, kterou schvalovatel viděl (`BEZPECNOST_MEZE.md`). Klient i server počítají obsah toutéž funkcí
  (`src/vyjimky.js`). Obsah s pásem nese značku tvaru `v: 2`; obsah jen se směsí se nemění.
- **Dřív schválené výjimky platí dál:** záznam z doby celých m² (bez značky) se porovná i s obsahem
  starého tvaru (`obsahStary`, `vyjimkaObsahSedi`) — v `vyjimkaPlati`, `vyjimkaKategorie`,
  `vyjimkaPrepocti`, serverové kontrole (B101) i zámku. Platí, dokud se obsah starého tvaru nezmění
  (u nich zůstává tehdy schválená mez < 1 m²); nové schválení razí server vždy v novém tvaru, nový
  záznam se starým zaokrouhlením neporovnává (značka) a starý tvar si obchodník podvrhnout nemůže (403).
- **V7-N1:** karta Cenové výjimky ukazuje plochu ve tvaru schválení („2,5 m² (zaokrouhleno pro
  schválení)“), u dřív schválené výjimky celé m² a poznámku „Schváleno před v20.10.5 s plochou na celé m²“.
- **Testy:** `src/test_vyjimky.js` +16 (2,50/2,51/2,60/2,61 a šum plovoucí čárky, schválení přes obal jádra, starý tvar, přepočet, kategorie,
  karta, desetiny nahoru 0,01–20 000 m² přesně), `netlify/test_vyjimky.mjs` +8 (server razí `v: 2`, podvrh starého
  tvaru 403, uložené schválení starého tvaru: uložení / „čeká“ od obchodníka / zámek 200, změna sazby 403;
  zasklení u pásu 1,2 m dřív 200, teď 403). Pojistka: proti 5dc28d1 obě sady spadnou.
- **Mutace:** `vyjimky.js` přidán do JADRA `mutace_jadro.mjs`; cílené „B183“ jádro 11, server 5; úseky
  starších mutací B154, B178, H2 a „výjimky:“ přesměrované na nový kód.
- **Ověření (20. 10. 2026, zaokrouhlení nahoru):** `testovaci_kolo.sh --bez-mutaci` **281 prošlo /
  0 selhalo / 6 přeskočeno**, statické 3/3; `--kontrola` jádro 322, server 643 úseků. Mutace: jádro
  `B183` **11/11** (vč. matematicky / dolů / bez tolerance šumu), server `B183` **5/5**, `H2 V7-N1`
  **3/3**. Předchozí varianta (dolů) měla navíc server `vyjimky.js` 40/40 a `schvalovani_ui` 6/6 —
  od té doby se v serverové cestě měnila jen zaokrouhlovací funkce.

---

## v20.10.4 — D2: šablona nabídky PROJ D. Sikory — cestovné mimo Prahu, upravitelný úvod, jednostupňová dokumentace (větev claude/d2-proj-sikora)

Dávka D2 (koordinace „ŘÍDÍCÍ 19.10“), základ `claude/integrace-16-10` 5dc28d1 (v20.10.1). Zdroj: šablona
nabídky PROJ od D. Sikory (OVP-CN „online calkulak“, rev. 33, 15. 9. 2026) — roadmapa **#260** tím
dodána a uzavřena. Rozhodnutí J. V. 20. 10. 2026, výchozí volby a postup v `podklady/D2_SIKORA_PROJ.md`.

**Nové**
- **#444 Akce mimo Prahu:** přepínač v Kalkulaci PROJ + cena 1 výjezdu technika v ceníku PROJ (Doprava,
  `PC.vyjezdTechnikKc`), přepsatelná u zakázky (prázdno = ceník, 0 = neúčtovat). Výjezd se přičte po
  přirážce k ceně ZAMĚŘENÍ, DPZ, KOLAUDACE a STUDIE (ke studii jen bez samostatného zaměření — jedna
  cesta); nabídka to řekne větou „Cena zahrnuje i cestovní náklady na 1 výjezd technika na stavbu
  (X Kč bez DPH)“ (DPZ a KOLAUDACE + „Případné další cesty…“), u IČ „Cena NEZAHRNUJE cestovní
  náklady…“ a u AD „Cestovní náklady na každý 1 výjezd AD…“ (bez přičtení). V Praze nic. Krycí list,
  plán plateb, rekapitulace a SoD berou cenu z jádra. Word: symboly `{{PROJ_CESTOVNE_ZAMERENI|SP|DPZ|IC|
  KOLAUDACE|AD}}`, šablona **PROJ v8** (`nastroje/vyrob_sablony.js --proj-v8`, vstup v7 z D1, jinak v6).
  EN/DE/FR výchozí znění (ke kontrole rodilými mluvčími). Kontroly `vyjezdCenaChybi`, `cestovneWordProj`.
- **#445 Úvod „Naše NABÍDKA a doporučení“** upravitelný obchodníkem u varianty (karta Cenová nabídka
  PROJ), **↺ Vrátit výchozí**, upozornění v kartě a kontrola `uvodProjNesedi`, když se po úpravě změní
  nabízené činnosti. Zamčená varianta drží svůj text; ruční text platí pro český dokument.
- **#446 Jednostupňová dokumentace:** nové zaškrtávátko v Kalkulaci PROJ; kontrola `jednostupnovaProj`
  upozorní, že nabídku je nutné upravit ve Wordu ručně (DPZ+DPS v jednom stupni, ceny, plán plateb,
  termíny). Nic se nepřepisuje.

**Testy:** `src/test_d2_proj_sikora.js` (71 kontrol; na stromu před D2 selže hned na prvních dvou —
pojistka), `src/test_kontroly.js` a `overit_lista.mjs` počet pravidel 37 → 41.

**Ověření (20. 10. 2026, nad sloučením integrace 6fe92d8):** `testovaci_kolo.sh --bez-mutaci` — sady **282 prošlo /
0 selhalo / 6 přeskočeno** (`test.js` + 5 harnessů bez `KNG_PODKLADY`), statické **3/3**; cílené mutace jádra
`D2` **18/18** (engine_proj, nabidka_proj, kontroly, vyrob_sablony), pracovní kopie po běhu čistá. Šablony
.docx se v dávce nevyráběly (navazující dávka S10).

---

## v20.10.3 — D1: postřehy D. Sikory 19. 10. 2026 (větev claude/d1-sikora)

Dávka D1 (koordinace „ŘÍDÍCÍ 19.10“), základ `claude/integrace-16-10` 5dc28d1 (v20.10.1).
Souběžně O7 má v20.10.2. Podklad `podklady/D1_SIKORA_19_10.md`, roadmapa #440–#443 (předběžná id).

**Ověření (20. 10. 2026, po všech rozhodnutích J. V.):** `testovaci_kolo.sh --bez-mutaci` **282 prošlo /
0 selhalo / 6 přeskočeno** (`test.js` + 5 harnessů bez `KNG_PODKLADY`), statické **3/3**; `--kontrola`
jádro 347 úseků; cílené mutace `mutace_jadro.mjs "d1"` **38/38** + po dosazení znění Q2 `"d1 q2"` **5/5**
chycených, pracovní kopie po každém běhu beze změny.

- **Bod 1 — nabídka PROJ bez studie proveditelnosti (#440, opraveno):** úvod bloku
  DOKUMENTACE PRO POVOLENÍ ZÁMĚRU (DPZ) zní bez studie v nabídce „Dokumentace pro povolení
  záměru (DPZ) rozpracovává dokumentaci dle platné vyhlášky…“ — věta „navazuje na vzájemně
  odsouhlasenou STUDII PROVEDITELNOSTI. Ta …“ jen tehdy, když má studie cenu (samotné
  projednání nestačí). `src/nabidka_proj.js` (`NABIDKA_PROJ_DPZ_UVOD`, odstavec úvodu se sekcí
  a zněním `jinak`), Word symbol `{{PROJ_DPZ_UVOD}}` v jazyce dokumentu (slovník EN/DE/FR,
  `src/preklad.js`), šablona **PROJ v7** z `nastroje/vyrob_sablony.js --proj-v7` (vstup v6;
  odstavec úvodu DPZ → jediný symbol, písmo zůstává). Kontrola **`dpzUvodWordProj`**
  (varování): studie se nenabízí, DPZ ano a šablona PROJ nemá `{{PROJ_DPZ_UVOD}}`.
  Pravidel kontrol je 38. Test `src/test_d1_dpz_bez_studie.js` (před opravou selže na první).
- **Další odkazy na studii bez studie (#441, rozhodnutí J. V. 20. 10. 2026 ~11:05, opraveno):**
  - **Q1** hvězdička ceny DPZ „Cena je platná v případě návaznosti na STUDII PROVEDITELNOSTI.“ se
    bez studie vynechá — online (`hvezdickaJenSe`), Word v7 `{{PROJ_DPZ_HVEZDICKA_ZNACKA}}`
    u nadpisu ceny a poznámka `{{PROJ_DPZ_HVEZDICKA}}` v bloku `BLOK_DPZ_HVEZDICKA`;
  - **Q2** termín hrubopisu DPZ (rozhodnutí J. V. 20. 10. ~11:35): se studií beze změny „do 10–12 týdnů
    od schválení studie investorem a objednání“, bez studie **„do 12 týdnů od zpracování výstupů ze
    zaměření“** (`PODMINKY_TERMIN_DPZ_BEZ_STUDIE`, EN/DE/FR ve slovníku, online i Word
    `{{PROJ_TERMINY_TERMIN}}`); dva řádky termínů ve Firmě s klíčem `dpz+studie` / `dpz-studie`
    (nový podmíněný klíč, Nastavení → Smlouvy / Šablony → Texty nabídky PROJ; **uložené vlastní
    termíny se nemění** — kdo je má uložené, doplní řádek sám);
  - **Q3** šablona **PROJ v7** navíc: titul `{{PROJ_TITUL_STUDIE}}` („STUDIE PROVEDITELNOSTI“ jen
    se studií nebo projednáním) a `{{PROJ_TITUL_CINNOSTI}}` („Navazující PROJEKTOVÉ a INŽENÝRSKÉ
    ČINNOSTI“, bez studie „PROJEKTOVÉ a INŽENÝRSKÉ ČINNOSTI“), bloky `BLOK_STUDIE_ROZSAH` (tabulka
    ST), `BLOK_STUDIE_CENA` (nadpis a ceny SP) — pryč bez studie i projednání, `BLOK_STUDIE_POZN`
    (poznámka o studii) — pryč bez studie (`blokyPryc` nabídky PROJ; smlouva o dílo PROJ si je
    nebere). Test rozšířen na 88 kontrol (před Q1–Q3 17 FAIL + pád sady).
- **Bod 2 — šířka bočního světlíku 600 mm (#442, rozhodnutí J. V. 20. 10. ~11:25, popisek):**
  600 = šířka skla na terčích 1 680 − otvor dveří 1 040 − 40 — výpočet je správně a zůstává
  (Model 1 i 2), variantu C neplánovat. Popisky: „Šířka skla bočního světlíku (přes sloupky)“,
  „předpočítaná šířka skla přes sloupky 600 mm“, Detail, technická specifikace „šířka skla N mm“
  (EN glass width / DE Glasbreite / FR largeur du verre; starší „šířka N mm“ se překládá dál),
  příručka; hlášky kontroly beze změny. Testy `test_svetliky_sirka.js` 70 (se starými popisky
  6 FAIL), `overit_svetliky_sirka.mjs` 24 (se starými 15 FAIL).
- **Bod 3 — dimenze profilů portálu (#443, uzavřeno beze změny):** rozhodnutí J. V. 20. 10.
  ~11:40 — dnešní stav je správně (sloupek portálu 40×40/3 EXT i INT, příčník portálu 80×40/3);
  návrh z větve `claude/d1-sikora-navrh-profily` se nepoužije (větev smaže J. V.).

---

## v20.10.2 — O7: rozhodnutí J. V. k auditu K3 (větev claude/o7-k3-rozhodnuti)

Dávka O7 (koordinace „ŘÍDÍCÍ 19.10“), základ `claude/integrace-16-10` 5dc28d1
(v20.10.1 = test), podklad `podklady/K3_AUDIT_19_10.md`, rozhodnutí J. V.
20. 10. 2026 (dialog). Roadmapa #437 uzavřena.

- **K3-N2 — odeslaná nabídka se nemění ani po změně Firmy.** Při PRVNÍM
  zamčení varianty se do ní opíše efektivní znění vět platebního kalendáře
  a dílů vět SoD (`data.kryci.zmrazenoPodminky`, kryciZmrazPodminky) a textů
  nabídky PROJ včetně `dolozkyTisk` (`data.kryciProj.zmrazenoPodminky`,
  kryciProjZmrazPodminky). Dotisk zamčené varianty (nabídka OCK v14, SoD
  realizace, online nabídka i Word PROJ) čte snímek (`podminkyEfZmrazene`);
  bez snímku — varianty zamčené před v20.10.2 — tiskne aktuální Firmu jako
  dosud. Snímek prochází týmiž pravidly jako Firma (poškozené pole = továrna).
  Data zamčené varianty hlídá server (zamekDataPorovnani), snímek nikdo
  nepřepíše. Test `src/test_o7_zmrazeni.js`.
- **K3-N1 — kopie na Disk s heslem správce a jen do „_Zaloha Netlify DB“.**
  `POST /api/zaloha_vynuceno {akce:'kopie-disk'}` chce `hesloSpravce`
  (potvrdHesloSpravce, jako matice a obnova) a odmítne jinou složku (400,
  složka se kontroluje před heslem, aby nespotřebovala pokus). Záznam nese
  `potvrzeno: 'heslo-spravce'`; retenci odemkne jen takový (kopieDiskPodlozena)
  — záznamy před v20.10.2 ne, retence počká na novou kopii. Klient se zeptá
  na heslo dřív, než cokoli stáhne, do jiné složky nezapíše a její výběr
  zapomene; týdenní automatika po přihlášení se zeptá taky (zrušení = nic).
- **K3-N4 — limit vynucených otisků 1 za 10 min a 20 za 24 h** (ruční i při
  přihlášení dohromady, klouzavě; `vynuceneLimit` z klíčů otisků). Nad limit
  429 `kod:'limitZalohy'` s časem, kdy to půjde (Praha). Noční otisk a otisk
  před obnovou se nepočítají a limit je nezastaví. Automatická záloha po
  přihlášení 429 nehlásí.
- **K3-N13 — pojistka retence.** Nový noční otisk s méně než 50 % zakázek
  nebo účtů proti předchozímu NOČNÍMU (nejvýš 7 denních klíčů zpět) →
  retence se ten den přeskočí, `console.warn` VAROVÁNÍ v logu noční funkce,
  záznam `retence-varovani` (GET přehledu ho vrací) a hlídka v Nastavení →
  Databáze i po přihlášení správce 30 dní (`uloRetenceVarovani`).
- **K3-N15 — beze změny** (Firma dál jen s relací administrátora), zapsáno
  v `BEZPECNOST_MEZE.md` spolu s K3-N1, N4 a N13.
- **K3-N18 — souhrnný strop podmínek ve Firmě 500 kB** (UTF-8 bajty JSON,
  `PODMINKY_MAX_B`): vada v `podminkyVady` → server odmítne zveřejnění
  srozumitelnou hláškou, formulář v Nastavení ji ukáže mezi vadami.
- **K3-N17 — rozměr můstku jen upozornit.** Nová kontrola `mustekRozmer`
  (38. pravidlo): šířka nebo hloubka > 6000 mm (výchozí volba,
  `KONTROLY_MUSTEK_MAX_MM`) nebo nečíselná / nekonečná hodnota → upozornění,
  ne zábrana; hodnota se do výpočtu bere, jak je (nečíselná = prázdná, O5).

**Testy s pojistkou (před → po):** `src/test_o7_zmrazeni.js` 21/13 → 34/0
(bez opravy podminky.js test spadne); `src/test_mustky.js` 68/5 → 73/0;
`netlify/test_zalohy.mjs` 87/17 → 130/0; `src/test_o7_kopie_klient.js`
9 selhání + pád → 16/0; `overit_online.mjs` +16 kontrol O7 (266/0, třikrát
po sobě). `test_obnova.mjs` a `test_zalohy.mjs` pořizují vynucené otisky
s posunem hodin o 11 min, `overit_online.mjs` posouvá klíče otisků před
ruční zálohou (limit K3-N4); 429 mezi očekávanými chybami konzole.

**Mutace:** jádro „O7“ 16, server „O7“ 25 (+ opravené zadání dvou mutací
#151, jejichž kód O7 změnil).

**Ověření (20. 10. 2026, 10:27–12:17 UTC) — VŠE ZELENÉ po dvou doplněních:**
cílené mutace jádro `O7` **16/16**, server `O7` **25/25**; server `#151`
**41/42** — přežila „#151 N6: záznam kopie bez kontroly jména souboru“ (test
posílal neplatné jméno bez složky, 400 vracela už kontrola složky K3-N1) →
test doplněn o správnou složku a heslo, opakování `#151 N6` **11/11**.
První kolo `--bez-mutaci` 282/1/6 (`overit_lista.mjs` čekal 37 pravidel
kontrol, s `mustekRozmer` je 38) → opraveno; konečné kolo `--bez-mutaci`
nad 56aa5cd: sady **283 prošlo / 0 selhalo / 6 přeskočeno**
(`test.js` + 5 harnessů bez `KNG_PODKLADY`), statické **3/3**; `--kontrola`
jádro 327, server 663 úseků. Pracovní kopie po každém běhu čistá.

---

## v20.10.1 — O5: opravy nálezů auditu K3 bez rozhodnutí J. V. (větev claude/o5-k3-nalezy)

Dávka O5 (koordinace „ŘÍDÍCÍ 19.10 noc“), základ `claude/integrace-16-10` 3b49d57
(v19.10.10 + M1 + zápis K3), podklad `podklady/K3_AUDIT_19_10.md`. J. V. nepřítomen —
výchozí volby zapsány u nálezů.

**Ověření nad e6f3b14 (v20.10.1, 20. 10. 2026 02:10–02:50 UTC) — VŠE ZELENÉ po doplnění jednoho testu:**
`testovaci_kolo.sh --bez-mutaci`: sady **281 prošlo / 0 selhalo / 6 přeskočeno** (`test.js`
+ 5 harnessů bez `KNG_PODKLADY`), statické **3/3**; `--kontrola` jádro 311, server 638 úseků.
Cílené mutace: jádro `O5` **12/13** — přežila „O5: K3-N11 vyváženost bez kontroly zbytku
zásobníku“ (`return true` místo `zas.length === 0`; testy neměly fragment s neuzavřeným
prvkem) → doplněny 2 kontroly v `src/test_o5_docx.js` (s mutací 12/2, bez 14/0), opakování
`mutace_jadro.mjs "O5: K3-N11"` **2/2**; server `O5` **11/11**; server `B58` **2/2**
(K3-N19 — „B58: obnova zapíše smazání i u živého účtu“ je chycená). Pracovní kopie po
každém běhu čistá.

**Doplněno O6 (20. 10. 2026, větev `claude/o6-hranice-kopie` nad 54f1cbc, jen testy):**
po O5 přežily mutace `#151` „kopie na Disk stačí 7 dní stará“ a „lhůta kopie 8 dní“
(`node mutace.mjs "#151"` 40/42). Příčina: test hranice 7 dní v `netlify/test_zalohy.mjs`
psal **nepodložený** záznam `kopie-disk` (bez původu, otisku, velikosti a SHA-256), takže
retenci zastavila už `kopieDiskPodlozena()` (K3-N1) a stáří kopie se neověřilo. Kód
aplikace je v pořádku. Test teď píše podložený záznam kopie stáří přesně 7 a 8 dní
(retence nic nesmaže a čeká „na první kopii na Disk“) a přímo ověří `kopieDiskCerstva`
pro 7 dní (ne) a 6 dní (ano). Pojistka: se starým testem obě mutace přežijí (0/1, 0/1),
s novým `#151` **42/42**; `test_zalohy.mjs` 88 OK / 0 FAIL; `testovaci_kolo.sh
--bez-mutaci` **281 prošlo / 0 selhalo / 6 přeskočeno**, statické 3/3.

- **K3-N19 (test B58 naprázdno):** `netlify/test_obnova.mjs` zapisoval podvržený otisk
  pod `v2.den + 'T000001-pred-obnovou'` — od #151 N1 neplatný klíč, obnova ho odmítla
  a kontrola „živý účet se do knihy smazaných nezapíše“ prošla, aniž obnova běžela.
  Klíč je teď `dnes() + 'T000001-pred-obnovou'` a test ověří, že obnova proběhla
  (`ok`, `casti.smazani`) a záznam živého účtu přeskočila s důvodem. Pojistka:
  s mutací B58 starý test 232 OK / 0 FAIL (přežila), nový 2–3 FAIL (chycena).
- **K3-N1 (část bez rozhodnutí):** retenci záloh odemkne jen záznam `kopie-disk`, který
  popisuje kopii **nočního otisku, který v úložišti je** — `kopieDiskPodlozena()`:
  původ `nocni-otisk`, otisk ve tvaru dne a v seznamu úložiště, jméno souboru
  `otisk_<den>.json`, velikost > 0, platný SHA-256. Jinak noční funkce zaloguje
  „retence čeká na podloženou kopii nočního otisku na Disk“. Velikost se proti souhrnu
  neporovnává (kopie je bez hesel a podpisů, velikosti se liší vždy). **Nedělá se**
  (J. V.): heslo správce u `kopie-disk`, omezení na složku „_Zaloha Netlify DB“.
- **K3-N3:** šablona SoD PROJ, která nese `{{SODP_ROZSAH_DILA}}` nebo značku `CIN_*`,
  musí mít blok každého jména z `blokyPryc`; chybí-li (oba odstavce značek smazané ve
  Wordu), dokument nevznikne s hláškou „Opravte šablonu“ (fail-closed jako B191).
  v3, záhlaví a zápatí beze změny.
- **K3-N10:** značka bloku se nerozpoznává z odstavce, který nese složenou závorku jako
  entitu (`&#123;` — text obchodníka ve vlastních řádcích TS, B122).
- **K3-N11:** `docxVyvazene` kontroluje pořadí zásobníkem — blok od buňky 1 do buňky 2
  téhož řádku už není „vyvážený“ (ze seznamu pryč → chyba místo sloučení buněk).
- **K3-N6:** klíče `__proto__`, `constructor` apod. v podmínkách Firmy jsou vada
  („neznámé pole / věta / blok“), ne výjimka (HTTP 500 na `/api/firma`, pád obnovy).
- **K3-N7:** procenta zálohy a faktur OCK se v `podminkyEf` i `podminkyCiste` převádějí
  přes `podmCislo` — „12,5“ z API/importu už nedá „NaN % – po podpisu smlouvy“.
- **K3-N9:** položka textů nabídky PROJ s `\n`/`\r` je neplatná (posunula by činnosti
  proti termínům); formulář už nezahodí 3. a další „|“ v řádku termínů (připojí je k termínu).
- **K3-N8:** heslo správce se po vypršení 10minutového okna z paměti stránky **maže**
  (časovač + kontrola při každém dotazu); obnova s heslem z paměti okno neprodlouží
  (`onlineZobrazeniHesloPoObnove`). „Heslo vůbec nedržet“ zůstává J. V.
- **K3-N5:** zámek mutačních běhů vzniká atomicky (`linkSync` z dočasného souboru, nikdy
  rozepsaný), mrtvý zámek smí smazat jen držitel výlučného zámku převzetí po znovupřečtení,
  záznam nese čas startu procesu (opětovné PID). Test: 6 běhů naráz nad mrtvým zámkem
  dřív dostali zámek tři, teď právě jeden (5 kol). Mutace se neregistrují — sada spouští
  podprocesy (desítky sekund na mutaci × 600 mutací); hlídá ji samotný test.
- **K3-N12:** kopie zálohy na Disk bere části **povoleným seznamem** `KOPIE_DISK_CASTI`
  (= dnešní části); test hlídá, že každá část zálohy v seznamu je.
- **K3-N14:** `BEZPECNOST_MEZE.md` — meze #151 N5/N6 a B194.
- **K3-N16:** název firmy se do kapitol a doložek PROJ dosazuje funkcí (`$&` v názvu se nerozvine).
- **K3-N17:** nekonečný rozměr můstku (`Infinity`, „1e400“) = nevyplněný (střecha jen nad
  šachtou, kontrola `mustekStrecha` upozorní). Horní mez rozměru je číslo pro J. V.
- **Nedělá se (rozhodnutí J. V.):** K3-N2, K3-N4, K3-N13, K3-N15, heslová část K3-N1;
  **K3-N18** (souhrnný strop velikosti podmínek) chce číslo — roadmapa #437.
- **Testy (pojistky v commitech):** nové `src/test_o5_docx.js` (před 5/7, po 14/0),
  `src/test_o5_podminky.js` (před 23/16 a 39/2, po 41/0); doplněné `netlify/test_obnova.mjs`,
  `netlify/test_zalohy.mjs` (K3-N1 před FAIL, K3-N12 83/3 → 86/0),
  `src/test_zobrazeni_heslo_okno.js` (7/3 → 13/0), `netlify/test_mutace_zamek.mjs`
  (13/3 → 16/0), `src/test_mustky.js` (59/6 → 65/0); `src/test_sod_proj_rozsah.js`
  (B191 e3 doplněn o vyvážený blok kvůli K3-N3).
- **Mutace:** jádro +13 „O5: …“ (docxgen, podminky, engine, nabidka_proj), server +11
  „O5: …“ (lib/zalohovani, ui/online_ui, firma; sada `../src/test_o5_podminky.js`
  přidána do serverových). Přepsané hledané úseky po změně kódu: „#367: výchozí záloha
  mimo volby“, „#367b: věta zálohy bez {PROC}“, „H2 B192“, „#151 N5 v19.10.8: retence
  bez pojistky“, „#151 N6: kopie pro Disk nese podpisy / otisky hesel“.

## v19.10.10 — B194: zámek mutačních běhů a výpis padlých kontrol výchozího stavu (větev claude/f1-test-vyjimky)

**Celé kolo K3 nad 1b0e2f7 (v19.10.10, 19.–20. 10. 2026; dávka K3, koordinace „ŘÍDÍCÍ 19.10 noc“) — 1 PŘEŽIVŠÍ MUTACE SERVERU (prázdný test B58, kód v pořádku):**
build OK (verze odpovídá dni commitu); sady **279 prošlo / 0 selhalo / 6 přeskočeno**
(285 sad; `test.js` + 5 harnessů bez `KNG_PODKLADY` — `overit_manual`,
`overit_nabidka_proj_word`, `overit_sablona`, `overit_sablony_online`, `overit_sod`);
mutace jádra **291/291**, otisky obou jader po běhu souhlasí; mutace serveru
**586/587**, 0 chybně zadaných; statické kontroly **3/3**.
Zbývá jen J. V. lokálně: sady s firemními podklady (šablony z Disku) a `test.js` s ostrým ceníkem.
- **Přeživší: „B58: obnova zapíše smazání i u živého účtu“** (`functions/obnova.mjs`).
  Kód obnovy je beze změny a v pořádku, vyprázdnil se test: od #151 N1 (v19.10.5)
  nese vynucený otisk klíč `RRRR-MM-DDTHHMMSS-rucne`, ale `netlify/test_obnova.mjs:553`
  zapisuje podvržený otisk pod `v2.den + 'T000001-pred-obnovou'`. To je neplatný klíč
  (`OTISK_KLIC`), obnova ho odmítne a kontrola „živý účet se do knihy smazaných
  nezapíše“ projde naprázdno. Nález **K3-N19** (nízký), oprava testu jde bez J. V.
- **Průběh:** celé kolo zastavil 2h strop úlohy na pozadí na začátku mutací serveru
  (po sadách a celém jádru). Odpojený opakovaný běh zanikl při restartu kontejneru
  (~18:27 UTC): zmutovaný `netlify/functions/prihlaseni.mjs` vrácen `git checkout`
  na commit, zámek `.mutace_bezi.json` převzat. Server se proto pouštěl po částech
  filtrem souboru: `functions/` 191, `lib/` 134, `../` 262 (součet 587, ověřeno
  výpisem „Mutací k ověření“). Část `../` opět zastavil strop po 182 mutacích
  (SIGTERM, skript soubor vrátil); pořadí 183–262 dopuštěno 18 filtry podle štítku
  názvu (P12, B62, B80, B89, S5, B152, S7, S9, #380, #366, S13, B180, V7-N1, B192,
  B189, B171, B175, B186 — pokrývají všech 80, 12 mutací proběhlo podruhé): 92/92.
  Žádná mutace nebyla přerušena uprostřed ověření, aniž by se opakovala. Pracovní
  kopie po každé části čistá.
- **Bezpečnostní audit `c9577ed..1b0e2f7`:** `podklady/K3_AUDIT_19_10.md` — 0 kritických,
  0 vysokých, **3 střední** (K3-N1 retenci záloh odemkne nepodložený záznam
  `kopie-disk` od klienta; K3-N2 odeslaná nabídka tiskne aktuální věty kalendáře,
  SoD a texty PROJ z Firmy, nezmrazují se; K3-N3 B191 nekryje šablonu, ze které
  značky `CIN_*` zmizely úplně), 9 nízkých (vč. K3-N19), 7 informativních.
  Rozhodnutí J. V. chtějí K3-N2 (zmrazovat vs. mez), heslo správce u `kopie-disk`
  a u Firmy (K3-N1, K3-N15), čísla limitů a prahů (K3-N4, K3-N13). Ostatní jdou opravit bez něj.

**Kolo `testovaci_kolo.sh --bez-mutaci` nad 3b50553 (v19.10.10, 19. 10. 2026) — VŠE ZELENÉ:** sady 278 prošlo / 0 selhalo / 6 přeskočeno (`test.js`, 5 harnessů bez `KNG_PODKLADY`), statické 3/3; `--kontrola` jádro 280, server 587 úseků.

Dávka F1 (koordinace „ŘÍDÍCÍ 19.10“), nález z 19. 10. 2026 ~13:07 UTC:
`node netlify/mutace.mjs b168` nad 4cc1b81 skončil „sady nejsou zelené ani
bez mutace — test_vyjimky.mjs: 1 selhalo“, hned potom 3× 72 OK / 0 FAIL.
Rozbor v `podklady/F1_TEST_VYJIMKY_NESTABILNI.md`.

- **Vnitřní nestabilita test_vyjimky.mjs se nenašla:** 400 samostatných běhů
  (4 souběžně), 32 pod zátěží (8 souběžně na 4 jádrech), 21 s posunutými
  hodinami (celá hodina, půlnoc, konec měsíce i roku, změna času), 10×
  výchozí stav všech 42 sad v pořadí `mutace.mjs` — vše zelené. Test se
  proto neměnil.
- **Doložený mechanismus — souběžný mutační běh nad toutéž pracovní kopií:**
  `mutace.mjs b178` (mutuje `src/vyjimky.js`) souběžně se samostatnými běhy
  test_vyjimky → 1–5 FAIL v 7 z 11 běhů. (Ve 13:07 se souběh z přepisu
  koordinace nepotvrdil — osiřelý `import()` mutací byl zabit ve 12:18; příčina
  toho jednoho pádu zůstává neprokázaná.)
- **B194 — zámek mutačních běhů** (`nastroje/mutace_zamek.mjs`): `mutace_jadro.mjs`
  i `netlify/mutace.mjs` berou zámek `.mutace_bezi.json` (v .gitignore, atomicky
  `wx`, s PID); druhý běh skončí kódem 2 s hláškou, kdo zámek drží. Zámek po
  mrtvém procesu se převezme, `--kontrola` zámek nebere. U jádra se zámek bere
  dřív, než si skript uloží zálohu souborů — jinak by si zálohoval cizí mutaci.
- **Výpis padlých kontrol:** když výchozí stav `netlify/mutace.mjs` není
  zelený, vypíšou se řádky `FAIL`/`✗` padlé sady (nejvýš 20) — jednorázový pád
  se tak příště dá dohledat.
- **Test:** `netlify/test_mutace_zamek.mjs` (9 kontrol; pojistka: bez zámku
  4 FAIL, se zámkem 9 / 0).

**Doplněno M1 (19. 10. 2026, větev `claude/m1-mutace-o3`, verze se nemění —
jen testovací infrastruktura):** mutace dávky O3 / TD1 (v19.10.3) ověřené
jen ručně (43/43) teď jsou zaregistrované a jdou opakovat filtrem „O3":
jádro **7** (`kontroly.js`, `terminAtyp` se značkou `{TERMIN}`), server **40**
(`firma.js`, `konfigurace.js`, `nabidka.js`, `preklad.js`, `ui/online_ui.js`,
`ui/nastaveni_ui.js`); do serverových sad přibyly `src/test_kapitoly_vychozi.js`
a `src/test_termin_kapitola.js` (`test_nabidka_kapitoly.js` ne — souhrn
„OK n" runner nečte). První běh: jádro 7/7, server 38/40 — přežily
„příznak termínu podle českého textu" a „vlastní text kapitoly se přepíše
bez potvrzení". Doplněné testy (pojistka proti mutaci před/po):
`src/test_termin_kapitola.js` +3 (příznak `termin` a `_TERMIN` podle textu
v jazyce tisku; se mutací 42 / 2, bez ní 44 / 0), `src/test_kapitoly_vychozi.js`
+3 (`firmaKapitolaVychozi` ve vm: bez potvrzení vlastní text zůstane; se
mutací 53 / 1, bez ní 54 / 0). Opakovaný běh `node mutace_jadro.mjs O3` **7/7**,
`cd netlify && node mutace.mjs O3` **40/40** (`--kontrola` obou zelená: 298 a 627
úseků). Kolo `testovaci_kolo.sh --bez-mutaci`: sady 279 prošlo / 0 selhalo /
6 přeskočeno, statické 3/3 — VŠE ZELENÉ.

## v19.10.9 — šablona Wordu nabídky PROJ v6: texty nabídky PROJ z Nastavení → Firma (větev claude/w1-sablona-proj-v6)

**Kolo `--bez-mutaci` nad eefcd88 (v19.10.9, 19. 10. 2026) — VŠE ZELENÉ:** sady 277 prošlo / 0 selhalo / 6 přeskočeno (`test.js` ostrý ceník, 5 harnessů bez `KNG_PODKLADY`), statické 3/3. Cílené mutace `W1` **11/11** chycených, `--kontrola` 291 úseků. Plné mutační kolo neběželo.

Dávka W1 (koordinace „ŘÍDÍCÍ 19.10“), nad `claude/v8-367-firma` (v19.10.7). Zadání J. V. 19. 10. 2026: texty nabídky PROJ z Firmy (#367 Q5) se mají tisknout i ve Wordu.

- **Šablona PROJ v6** (`node nastroje/vyrob_sablony.js --proj-v6 <podklady> [výstup]`,
  vstup `Sablona_NABIDKA_PROJ_v5.docx`, výstup v6 + `_EN/_DE/_FR`): pevné řádky
  tabulek **CENA NEZAHRNUJE** a **POŽADOVÁNO OD INVESTORA** nahradí jeden řádek
  se symbolem `{{PROJ_CENA_NEZAHRNUJE}}` / `{{PROJ_POZADOVANO_OD_INVESTORA}}`,
  **TERMÍNY** dvousloupcový řádek `{{PROJ_TERMINY_CINNOST}}` |
  `{{PROJ_TERMINY_TERMIN}}`; za termíny přibude blok **DOLOŽKY**
  (`{{PROJ_DOLOZKY}}`). Každý blok stojí ve značkách `{{BLOK_<X>_ZAC/_KON}}`
  (poznámky pod termíny patří k termínům), takže prázdný blok — výchozí
  vypnuté doložky PROJ — zmizí i s nadpisem. Nadpisy a vzhled tabulek z v5.
- **Aplikace:** řádek tabulky se symbolem textu PROJ se zopakuje za každou
  odrážku (`rozvinRadkyZaRadek`, jako věty platebního kalendáře CN v14);
  termíny se rozvíjí jako **dvojice symbolů** — i-tý řádek tabulky dostane
  i-tou činnost vlevo a i-tý termín vpravo. Nové symboly
  `{{PROJ_TERMINY_CINNOST}}`, `{{PROJ_TERMINY_TERMIN}}` (jen nabízené činnosti);
  `{{PROJ_TERMINY}}` zůstává pro šablonu s jedním místem.
- **Rozdíl Wordu v6 proti v5 s výchozí Firmou:** mimo tři bloky shodný text
  (ověřeno nad skutečnou v5). V blocích se tiskne výchozí znění Firmy (= online
  nabídka): pět řádků se od pevného textu v5 drobně liší (čárka a „vyplývajících“
  v CENA NEZAHRNUJE, termín zaměření v jednom řádku, termín stanovisek a IČ,
  EZC bez dovětku) a termíny se tisknou **jen u nabízených činností** (v5 všech 10).
- **Nastavení → Smlouvy / Šablony → PROJ → Texty nabídky PROJ:** popis říká, že
  Word je bere od šablony v6.
- **Testy:** `src/test_sablona_proj_v6.js` (35 kontrol se skutečnou v5,
  30 bez ní) — bez změny selže na prvních dvou kontrolách, po změně zelený.

## v19.10.8 — #151 N5 retence otisků a N6 týdenní kopie na Disk Google (rozhodnutí J. V., větev claude/o4-zalohy)

**Testy nad v19.10.8 (19. 10. 2026):** `spust_testy.sh --smoke` **274 prošlo / 0 selhalo / 6 přeskočeno** (`test.js`, 5 harnessů bez `KNG_PODKLADY`). Mutace serveru filtrem `zaloh` (sady test_zalohy, test_funkce, test_obnova, test_prava, test_obnova_nanecisto, test_uklid, ../src/test_kopie_disk.js) **50/50** (vč. hranice RETENCE_OD; smoke i po ní 274/0/6), filtrem `#151 N6` (vč. `src/uloziste.js`) **11/11**; `--kontrola` OK. Statická kontrola údajů čistá.

Rozšíření dávky O4 nad integrací `4cc1b81` (v19.10.5). Rozhodnutí J. V.
19. 10. 2026 (~11:45 a ~11:50 UTC, přes koordinaci) k nálezům N5 a N6
kontroly `podklady/151_ZALOHOVANI_KONTROLA_2026-10-19.md` (roadmapa
**#151a**, **#151b** → hotovo; postup prvního běhu kopie v podkladu, oddíl 9).

- **N5 — retence otisků v Blobs** (rozhodnutí J. V.): noční 30 dní (věk
  0–29) + první noční otisk každého měsíce 12 měsíců zpět (měsíc dneška + 12
  předchozích), vynucené 90 dní, otisky před obnovou nikdy. `retenceVyber`
  (čistá funkce) a `retenceProved` v `lib/zalohovani.mjs`; volá je
  `zaloha_nocni` až po úspěšném otisku (nový otisk musí v úložišti být,
  jinak se nemaže nic), nikdy nesmaže nejnovější, s otiskem maže i souhrn,
  do logu počet a klíče.
- **Staré zálohy do 19. 10. 2026 se nemažou (J. V. 19. 10. ~13:20 UTC:
  „Staré zálohy všechny ponech.“):** `RETENCE_OD = '2026-10-20'` (jediné
  místo v `lib/zalohovani.mjs`) — otisk ani jeho souhrn s datem před
  hranicí retence nikdy nesmaže, denní ani vynucený; pravidlo 30 dní +
  1. v měsíci + 90 dní platí jen pro otisky od 20. 10. 2026.
- **Pojistka retence (výchozí volba koordinace):** maže se jen tehdy, když
  existuje záznam úspěšné kopie na Disk (`zalohy/kopie-disk`) mladší než
  7 dní (`kopieDiskCerstva`); jinak se nesmaže nic a do logu jde „retence
  čeká na první kopii na Disk“. Staré otisky se tak neztratí dřív, než J. V.
  udělá první kopii; když se kopie přestanou dělat, retence se zastaví.
- **N6 — týdenní kopie na Disk Google** (rozhodnutí J. V.): prohlížeč
  správce zapisuje do vlastní vybrané složky `_Zaloha Netlify DB`
  (File System Access, pamatuje se v IndexedDB; složka `_DB` je od #150
  vypnutá) soubor `otisk_YYYY-MM-DD.json` + `posledni_kopie.json` (datum,
  velikost, SHA-256; kontrola délky zápisu). Obsah z nové
  `GET /api/zaloha?zdroj=nocni` — poslední noční otisk očištěný
  `otiskProDisk` (BEZ otisků hesel a BEZ podpisů; bez nočního otisku za 7 dní
  aktuální stav v témž tvaru). Záznam kopie drží server
  (`POST /api/zaloha_vynuceno {akce:'kopie-disk'}`, GET vrací `kopieDisk`),
  takže hlídka funguje v každém prohlížeči. Tlačítko „Zkopírovat zálohu na
  Disk teď“, automaticky po přihlášení správce po 7 dnech (jen s uděleným
  právem), varování nad 14 dní (`uloKopieDiskStav`, `src/uloziste.js`).
  Na Disku se nic nemaže. Běžná záloha ke stažení se nemění.
- **Testy hranice:** test_zalohy +5 (otisk 2026-08-01 a 2026-10-19 zůstane
  i v roce 2031, 2026-10-20+ podle pravidla, noční funkce v roce 2028 staré
  nesmaže) — proti `004d748` **59 OK / 5 FAIL**, po změně **64 / 0**; testy
  pravidla posunuty za hranici (rok 2028). Mutace hranice 5 (`#151 N5 hranice`).
- **Testy:** `netlify/test_zalohy.mjs` +30 kontrol (59 celkem) — N5/N6
  proti `f07d650` **33 OK / 6 FAIL** (+ výjimky), pojistka kopie proti
  `3ef7c6f` **50 / 3 FAIL**, po změně **59 / 0**; nová
  `src/test_kopie_disk.js` (10; proti f07d650 padá, po 10/0);
  `overit_online.mjs` oddíl 5c3 (15 kontrol se složkou v paměti stránky;
  proti f07d650 FAIL, po 0 FAIL). Mutace: 27 nových `#151 N5/N6`
  (`mutace.mjs` vč. `../src/uloziste.js`), sada `../src/test_kopie_disk.js`
  v SADY.

## v19.10.7 — #367 fáze 2b: věty kalendáře v jazycích, texty nabídky PROJ a rozšíření z Firmy (větev claude/v8-367-firma)

**Po sloučení integrace `4cc1b81` (v19.10.5: A2, O3, H2, O4) — kolo `--bez-mutaci` nad 4d9f67a, 19. 10. 2026 — VŠE ZELENÉ:** sady 276 / 0 / 6 přeskočeno (`test.js`, 5 harnessů bez `KNG_PODKLADY`), statické 3/3. Cílené mutace: `#367` jádro 18/18, server 2/2; místa sloučení V8 × O3 (FR v bílé listině doplnění, `{TERMIN}` ve FR, věta o záruce, prázdný FR text) 4/4. Testy O3 upravené na FR (`test_kapitoly_vychozi`, `test_termin_kapitola`, `test_nabidka_kapitoly` #330).

**Kolo `--jen build,sady,staticke` nad 7862576 (v19.10.7, 19. 10. 2026) — VŠE ZELENÉ:** sady 272 prošlo / 0 selhalo / 6 přeskočeno (`test.js` ostrý ceník, 5 harnessů bez `KNG_PODKLADY`), statické 3/3. Cílené mutace `#367` jádro 18/18, server 2/2. Plné mutační kolo neběželo.

Dávka V8b, navazuje na v19.10.6. Rozhodnutí J. V. 19. 10. 2026 k Q3, Q5 a Q6.

- **Věty platebního kalendáře (Q3):** věty nabídky OCK (záloha, dílčí
  doklad, konečný doklad, měsíční fakturace) a díly seznamu splátek smlouvy
  o dílo realizace (milník zálohy, konečné splátky, „zbývajících", „z celkové
  ceny díla") jsou v `podminky.vety` s poli CZ / EN / DE / FR. Značky
  `{PORADI}` (pořadí v jazyce: „1.", „1st", „1re") a `{PROC}` (anglicky
  desetinná tečka). Bez vlastního cizího znění se tiskne **překlad výchozí
  české věty ze slovníku** = dosavadní výstup, takže žádný jazyk nespadne do
  češtiny; upravená čeština bez cizího znění svítí v Nastavení „odpovídá
  výchozí češtině — přeložte úpravu". Zamčené nabídky ze starších pravidel
  (věty v13) beze změny.
- **Texty nabídky PROJ (Q5):** bloky CENA NEZAHRNUJE, POŽADOVÁNO OD
  INVESTORA a TERMÍNY (řádek = činnost + termín + sekce; tiskne se jen
  nabízená činnost) se přesunuly z `NABIDKA_PROJ_DEF` do `podminky.nabidkaProj`
  s jazykovými poli (výchozí cizí = slovník). Nový blok **DOLOŽKY PROJ —
  výchozí prázdný a vypnutý** (zaškrtávátko „Tisknout doložky", `{FIRMA}` se
  nahradí). Pro Word nové symboly `{{PROJ_CENA_NEZAHRNUJE}}`,
  `{{PROJ_POZADOVANO_OD_INVESTORA}}`, `{{PROJ_TERMINY}}`, `{{PROJ_DOLOZKY}}` —
  dnešní šablony PROJ (v3–v5) mají tyto bloky pevně, Word je ponese až nová
  šablona (návrh na příští dávku).
- **Rozšíření (Q6):** typ smlouvy (OCK i PROJ), „Cena nezahrnuje" krycího
  listu (OCK i PROJ), licence k PD a pojištění projektanta jsou ve Firmě;
  prefilly krycích listů už nemají literály. Ceny AD a variant SP zůstávají
  pro ceník PROJ (mimo Firmu).
- **Kapitola V.:** věta „5 let záruka na celé dílo." vypadla z výchozího textu
  ve všech jazycích (záruka z krycího listu, P10.7).
- **Francouzština kapitol IV.–VI. a doložek (Q3):** výchozí FR texty
  v `DEFAULT_FIRMA` (dosud žádné — FR nabídka tiskla češtinu s upozorněním).
  Seznam ke kontrole rodilým mluvčím: `podklady/367_PREKLADY_KONTROLA.md`.
- **Nastavení:** karta OCK = typ smlouvy, „Cena nezahrnuje", blok „Věty
  platebního kalendáře" (8 vět × 4 jazyky, šedá nápověda = co se vytiskne);
  karta PROJ = typ smlouvy, licence, pojištění, „Cena nezahrnuje", blok
  „Texty nabídky PROJ" (termíny `sekce | činnost | termín`); kapitoly nabídky mají nově
  i pole FR, aby šly francouzské texty opravit po kontrole.
- **Testy:** `src/test_podminky_texty.js` 50 kontrol — proti v19.10.6
  (`dd21d37`) padá (4 selhání a výjimka), po změně **50 / 0**;
  `test_nabidka_kapitoly.js` upraven (záloha češtinou se zkouší na firmě bez FR
  polí; nově výchozí FR bez upozornění a kapitola V. bez záruky);
  `overit_podminky_firma.mjs` 26 kontrol. Mutace „#367b: …“ 8 v `mutace_jadro.mjs`; cílený běh `#367` (a + b) **18 / 18** chycených, `--kontrola` 272 úseků.

## v19.10.6 — #367 fáze 2a: platební podmínky OCK a PROJ z Nastavení → Firma (větev claude/v8-367-firma)

**Kolo `--jen build,sady,staticke` nad 260df3e (v19.10.6, 19. 10. 2026):** sady 270 prošlo / 1 selhalo / 6 přeskočeno — selhal jen `overit_plan_plateb.mjs` (plán plateb PROJ je nově na kartě PROJ, harness otevíral kartu OCK; upraven, samostatně **49 / 0**). Přeskočeno: `test.js` (ostrý ceník) a 5 harnessů s firemními podklady (`KNG_PODKLADY` v sezení nebyly). Statické 3/3. Cílené mutace `#367`: jádro **10/10**, server **2/2**; `--kontrola` jádro 264, server 541 úseků. Plné mutační kolo neběželo.

Dávka V8a (koordinace „ŘÍDÍCÍ 19.10“), nad `origin/claude/integrace-16-10`
(`e3995e6`). Rozhodnutí J. V. 19. 10. 2026 k náhledu
(https://claude.ai/artifact/UZC5zQB14xBBvkN1MMdnPE, návrh
`podklady/367_NASTAVENI_FIRMA_NAVRH.md`): „Varianta B + z kódu vše převést do
Firma“, Q1–Q6 podle doporučení (Q4 zatím doporučené, izolované v jedné konstantě).

- **Nový modul `src/podminky.js`:** jediná továrna dnešních hodnot
  `PODMINKY_VYCHOZI` (splatnost 14 / 14 dní, zálohy 0 / 30 / 50 / 70 %
  s milníkem „po podpisu smlouvy“, výchozí 50 %, 40 % po zahájení montáže,
  10 % po předání, zádržné Ano / Ne bez procent, záruka 60 měsíců, pokuty 0
  a 0,05 % / den, číselník sazeb, limit 10 %). `podminkyEf(firma)` slučuje
  Firmu s továrnou **při čtení, po polích** (neplatná uložená hodnota → továrna),
  takže prázdné Nastavení, starší `_nastaveni.json` i starší online firma
  tisknou beze změny. `podminkyVady` / `podminkyCiste` pro zveřejnění.
- **Q4 (rozhodnutí J. V. 19. 10. 2026: „Nedovolit zveřejnit“):** `PODMINKY_SOUCET_BLOKUJE = true` — součet záloha + faktura 2
  + konečná ≠ 100 % zablokuje zveřejnění (prohlížeč i server) a v Nastavení
  svítí červeně. Přepnutí na „jen upozornění“ = jedna konstanta.
- **Krycí listy bez literálů:** `kryci.js` (splatnost, volby a výchozí záloha,
  faktura 2, konečná, zádržné ×2 včetně procent, záruka, pokuty, limit,
  dopočet faktury 2) a `kryci_proj.js` (splatnost, pokuty, limit) berou hodnoty
  z Firmy; rozbalovátka mají `o` jako getter nad Firmou. `NABIDKA_PROJ_SAZBY`
  splatnost čte Firmu. Zdroj u pole: „Nastavení → Firma“. `KRYCI_POKUTY`,
  `KRYCI_ZALOHY`, `KRYCI_LIMIT_POKUT` zůstávají jen jako znění továrny.
- **Zamčené varianty beze změny:** zmrazené hodnoty mají přednost; procenta
  zádržného (dřív bez předvyplnění) se zamčené variantě z Firmy nedoplní.
  Rozpracované varianty bez ručního přepisu převezmou změněný standard (Q2).
- **Firma a server:** `firmaLzeZverejnit` odmítne vadné podmínky,
  `firmaKZverejneni` nese čistou kopii, `firmaShodaSOnline` hlásí „Platební
  podmínky“; `netlify/lib/jadro_moduly.cjs` načítá `podminky.js`.
- **Nastavení → Smlouvy / Šablony (`src/ui/podminky_ui.js`):** společný blok
  (platnost nabídky, sazby pokut, limit), přepínač **OCK · ocelová konstrukce |
  PROJ · projekce**; karta OCK = platební podmínky OCK se živým součtem,
  smluvní standardy OCK, kapitoly nabídky (beze změny — doplnění kapitol řeší
  dávka O3); karta PROJ = podmínky PROJ, způsob fakturace PROJ, plán plateb
  projekce. Přepínač filtruje tabulku šablon (volba „všechny šablony“).
  Štítky „výchozí / upraveno“, tlačítka „Zapsat výchozí hodnoty do Firmy“
  a „↺ Vrátit platební podmínky na výchozí“. Měnit smí jen administrátor,
  ostatní vidí pole vypnutá.
- **Testy:** `src/test_podminky.js` 74 kontrol (továrna = dnešní výstup,
  propis Firmy do OCK i PROJ, ruční přednost, zamčená varianta, neplatná data,
  vady, zveřejnění, přepínač Q4, žádný literál v prefillech) — proti
  `e3995e6` **44 prošlo / 30 selhalo**, po změně **74 / 0**;
  `overit_podminky_firma.mjs` (prohlížeč, 22 kontrol; nad starým sestavením
  spadne); `netlify/test_funkce.mjs` +4 (zveřejnění, součet 105 %, vadná
  splatnost, obchodník 403) — proti `e3995e6` 3 selhaly, po změně 249 / 0.
  Mutace „#367: …“ 10 v `mutace_jadro.mjs` (`podminky.js` přidán do JADER),
  2 v `netlify/mutace.mjs`.

## v19.10.5 — #151: opravy nočního zálohování N1–N4 (větev claude/o4-zalohy)

**Testy nad v19.10.5 (19. 10. 2026):** `spust_testy.sh --smoke` **270 prošlo / 0 selhalo / 6 přeskočeno** (`test.js`, 5 harnessů bez `KNG_PODKLADY`), vč. `overit_online` (samočinná záloha, přehled, obnova). Mutace serveru filtrem `zaloh` (sady test_zalohy, test_funkce, test_obnova, test_prava, test_obnova_nanecisto, test_uklid) **22/22 chycených**, žádná nepřežila; `--kontrola` 549 úseků. Statická kontrola údajů čistá.

Dávka O4 (koordinace „ŘÍDÍCÍ 19.10“), nad `claude/z1-zalohy` (`421f556`).
Opravuje nálezy N1–N4 kontroly zálohování
(`podklady/151_ZALOHOVANI_KONTROLA_2026-10-19.md`, roadmapa **#151** → hotovo).
N5 (retence) a N6 (kopie mimo Netlify) čekají na rozhodnutí J. V.
(roadmapa **#151a**, **#151b**).

- **N1 — ruční záloha nepřepíše noční otisk dne.** „Zálohovat teď“
  (`duvod: rucne`) i otisk při přihlášení správce (`duvod: auto`) se ukládají
  do vlastního slotu `<den>T<hhmmss>-rucne` / `-auto` (`klicVynuceny`,
  `lib/zalohovani.mjs`); klíč `YYYY-MM-DD` patří jen noční funkci. `OTISK_KLIC`
  oba tvary přijímá (přehled i obnova), přehled drží vynucené otisky ve
  vlastním limitu (10, jako otisky před obnovou — B52), takže noční zálohy
  z něj nevytlačí a hlídka #152 nehlásí falešné varování. Klient: „dnešní
  otisk“ pro samočinnou zálohu se pozná podle dne v klíči, přehled ukazuje
  „při přihlášení“. Volba tvaru klíče (`T<hhmmss>-rucne` místo
  `_HHMMSS_rucni` ze zadání): sjednocení s otisky před obnovou (B28).
- **N2 — noční funkce blíž 30s limitu nenarazí.** Otisk čte paralelně po
  dávkách 20 (`ctiPoDavkach`, `Promise.all`) místo záznam po záznamu;
  odpověď nese `trvaniMs` a `velikostB`, `zaloha_nocni` je zapíše do logu
  (a chybu otisku celou přes `console.error`). Opraven komentář o velikosti
  otisku (~20 MB, ~7 GB/rok — retence je N5).
- **N3 — přehled záloh nečte celé otisky.** K otisku se zapíše souhrn
  `souhrn/<klíč>` (zdroj, čas, kdo, počty, velikost, trvání — bez dat);
  `seznamOtisku` čte jen souhrny, starší otisk bez souhrnu dočte celý jako dřív.
- **N4 — test úplnosti zálohy.** `netlify/test_zalohy.mjs` projde kód
  serverových funkcí, najde všechna zapisovaná úložiště a pevné klíče
  a každé musí být v tabulce zálohovaných, nebo výjimek s důvodem; tvrzení
  tabulky ověří skutečný otisk (značka v každém zálohovaném úložišti a klíči).
  Nové úložiště nebo klíč bez zálohy test shodí (ověřeno: vyřazený slovník
  i smyšlené nové úložiště → FAIL).
- **Testy:** nová sada `netlify/test_zalohy.mjs` (29 kontrol) — proti
  `421f556` **9 OK / 10 FAIL** (N1–N3; N4 je nová pojistka, na starém kódu
  projde a padá na vyřazený klíč), po opravě **29 / 0**. Upraveny
  `test_funkce.mjs` a `test_obnova.mjs` (vynucený otisk má slot s časem).
  Mutace serveru: 10 nových (`#151 N1–N4`), upraveny B52 a B58 (změněný kód);
  sada `test_zalohy.mjs` přidána do `mutace.mjs`.

## v19.10.4 — H2: plocha v kartě výjimky na celé m² (V7-N1), B191, B192 (větev claude/h2-drobnosti)

**Výsledky nad 755e84b (19. 10. 2026):** `./spust_testy.sh --smoke` (build bez zvýšení verze, Playwright 1.56.1,
bez KNG_PODKLADY) **270 prošlo / 0 selhalo / 6 přeskočeno** (test.js, overit_manual, overit_nabidka_proj_word,
overit_sablona, overit_sablony_online, overit_sod — firemní podklady). Mutace cíleně: jádro „h2“ 3/3, „blok“ 5/5;
server „h2“ 4/4, „b178“ 9/9, „b168“ 1/1 — bez přeživší; `--kontrola` jádro 257, server 543 úseků.

Dávka H2 (zadání koordinace „ŘÍDÍCÍ 19.10“), nad `origin/claude/integrace-16-10`
(`e3995e6`, v19.10.1). Souběžně běží A2 (v19.10.2) a O3 (v19.10.3).
Roadmapa **#433** (předběžné id).

- **V7-N1 (kontrola V7, B183 volba c):** karta Cenové výjimky ukazovala plochu
  pásu a světlíku „jiné“ na setiny (2,61 m²), schválení ale drží celé m².
  Výchozí volba dávky: karta ukáže **plochu na celé m²** toutéž funkcí jako
  obsah schválení (`vyjimkyM2Schvaleni`, `src/vyjimky.js`) a u plochy, která
  celá není, **poznámku „zaokrouhleno pro schválení“** („3 m² (zaokrouhleno
  pro schválení)“). Pravidlo B183 ani obsah výjimky se nemění — schválení
  neshodí.
- **B191 (audit kola 28, informativní) — opraveno:** blok `CIN_*` z
  `blokyPryc` s nevyváženými značkami (začátek v tabulce a konec za ní,
  značka bez páru — šablona SoD projekce upravená ve Wordu) dřív v dokumentu
  tiše zůstal a smlouva vyjmenovala nenabízenou činnost. `odstranPrazdneBloky`
  (`src/docxgen.js`) teď **hází — dokument nevznikne** s hláškou „Opravte
  šablonu“. Blok mimo seznam (kapitoly nabídek) beze změny. Kontrola už při
  zveřejnění šablony nepřibyla (doporučení v `BEZPECNOST_MEZE.md`).
- **B192 (audit kola 28, informativní) — zmírněno:** mez B168 doplněna o XSS
  (heslo správce v paměti stránky v čitelné podobě, CSP `unsafe-inline`). Okno
  10 min se nově počítá **od zadání hesla**, uložení matice ho neprodlouží
  (`onlineZobrazeniPost`, `src/ui/online_ui.js`; výchozí volba). Heslo vůbec
  nedržet (krátkodobý token) = změna rozhraní, doporučení pro J. V.
- **B193** se dávky netýká (podklad).
- **Testy (pojistka):** `src/test_vyjimky.js` (plocha v kartě na celé m²,
  shoda karty s obsahem u pásu i světlíku, B155 karta) — proti e3995e6
  **104 / 3**, po opravě **107 / 0**; `src/test_sod_proj_rozsah.js` (B191,
  4 kontroly) **36 / 2 → 38 / 0**; nový `src/test_zobrazeni_heslo_okno.js`
  (B192, vyříznutý úsek online_ui.js ve vm) **4 / 3 → 7 / 0**; pokus
  `podklady/AUDIT28_pokus_sod.mjs` P3 otočen (17 / 1 → 18 / 0).
- **Mutace:** jádro „H2 B191: …“ (3), server „H2 V7-N1: …“ (3) a „H2 B192: …“
  (1, sada `test_zobrazeni_heslo_okno.js` přidána do serverového seznamu);
  zadání mutace „B178 zbytek: plocha v obsahu na desítky m²“ posunuto na
  nový tvar (`vyjimkyM2Schvaleni`).

## v19.10.3 — O3: výchozí texty kapitol nabídky se doplní do Nastavení (větev claude/o3-kapitoly-vychozi)

**Kolo `--jen build,sady,staticke` nad 91f8111 (v19.10.3, 19. 10. 2026) — VŠE ZELENÉ:** sady 271 prošlo / 0 selhalo / 6 přeskočeno (`test.js` — ostrý ceník; `overit_manual`, `overit_nabidka_proj_word`, `overit_sablona`, `overit_sablony_online`, `overit_sod` — firemní šablony `KNG_PODKLADY` v sezení nebyly), statické 3/3. Cílené mutace O3 + TD1 (`firma.js`, `nabidka.js`, `kontroly.js`, `preklad.js`, `konfigurace.js`, `online_ui.js`, `nastaveni_ui.js`) 43/43 chycených; celé mutační kroky jádra a serveru se nepouštěly.

Dávka O3 (zadání J. V. 19. 10. 2026 „Doplň výchozí texty do Nastavení rovnou.“),
nad `origin/claude/integrace-16-10` (`e3995e6`, v19.10.1; v19.10.2 drží souběžná
dávka A2). Roadmapa **#431** (navazuje na #282).

- **Příčina** (rozbor V8, `podklady/367_NASTAVENI_FIRMA_NAVRH.md` odd. 8):
  v produkci byly v Nastavení → Smlouvy / Šablony → Kapitoly nabídky pole IV.,
  V., VI. a Doložky prázdná (žlutý rámeček „Česky nevyplněno … nabídka tyto
  kapitoly vypustí“), ač `DEFAULT_FIRMA` výchozí texty má. Uložená firma
  (online `/api/firma` i `_DB/_nastaveni.json`) je z doby před #282 a klíče
  kapitol vůbec nemá; `konfigNahradVMiste()` ji při načtení kopíruje celou
  (výchozí texty zmizí) a `KONFIG_DOPLNIT_KLICE` firmu záměrně vynechává.
- **Oprava (`src/firma.js`):** `firmaDoplnVychoziTexty(f, iPrazdne)` doplní
  CHYBĚJÍCÍ klíče z bílé listiny `FIRMA_KAP_VYCHOZI_KLICE` (kapitoly IV.–VI.
  a doložky CZ/EN/DE; FR výchozí text nemá). Volá se po každém načtení firmy:
  import konfigurace i `_nastaveni.json` (`konfiguraceImport`, s varováním,
  co se doplnilo) a nasazení online firmy (`src/ui/online_ui.js`).
  Identifikace firmy se nikdy nedoplňuje.
- **Vědomé vypuštění = prázdný řetězec** (výchozí volba koordinace): pole,
  které administrátor vymaže, se nedoplňuje a nabídka kapitolu vypustí;
  kontrola před nabídkou ji dál hlásí (K9-N32). Žádná zvláštní značka.
- **Tlačítka (jen administrátor):** „↺ Doplnit výchozí text“ u každé kapitoly
  a jazyka (CZ/EN/DE; vlastní text přepíše po potvrzení) a „↺ Doplnit všechny
  prázdné“ (doplní prázdná pole, vlastní texty ani FR nemění).
- **Zveřejnění:** `firmaKZverejneni` doplněné klíče zveřejní (jsou ve
  `FIRMA_POLE`), `firmaLzeZverejnit` je přijme; panel zveřejnění ukáže rozdíl
  proti online kopii bez kapitol, takže administrátorovi stačí **Zveřejnit**.
- **Test** `src/test_kapitoly_vychozi.js` (51 kontrol; před opravou padá —
  `firmaDoplnVychoziTexty` neexistuje a import nechá kapitoly prázdné).
- **Značka `{TERMIN}` v kapitole V. (TD1, #330) — ROZHODNUTÍ J. V.
  19. 10. 2026 (~11:25 UTC, přes koordinaci): schváleno přesně podle zadání —
  bez odrážky navíc při značce, záloha na standardní lhůtu z Firmy, značka
  nikdy viditelná v tisku, starý text funguje a kontrola radí značku.** výchozí text kapitoly V. (CZ/EN/DE) má místo
  pevného „cca 12 týdnů“ značku `{TERMIN}`; `firmaKapitola(f, base, jazyk,
  termin)` za ni dosadí termín dodání zakázky (týž jako `{{PODM_TERMIN_DODANI}}`,
  s ATYP i ručním přepisem, přeložený; u FR bez vlastního znění česky).
  S termínem v textu se samostatná odrážka „Termín dodání“ nepřidává (náhled
  i Word `{{NAB_KAP_TERMINY}}`, příznak `FIRMA_NAB_TERMINY_TERMIN`). Bez termínu
  platí standardní lhůta z Firmy, jinak „dle dohody“ (nové heslo slovníku) —
  značka nikdy nezůstane v tisku (ani v `firmaPlaceholders` mimo zakázku, tedy
  ani ve smlouvě). Kontrola `terminAtyp`: u textu se značkou mlčí, hlásí jen
  „dle dohody“ a ATYP se smazaným termínem; u starého textu s pevným číslem
  radí „nahraďte číslo značkou {TERMIN}“. Starý text bez značky beze změny.
  Test `src/test_termin_kapitola.js` (39 kontrol; před opravou 26 selže a sada spadne),
  `test_kontroly.js` +10 (před opravou 7 selže), testy #330 v `test_nabidka_kapitoly.js` a
  `test_kontroly.js` převedené na starý text s pevnou lhůtou.

**Po nasazení (J. V.):** Nastavení → Smlouvy / Šablony → Kapitoly nabídky
zkontrolovat doplněné texty → Nastavení → Firma → **Zveřejnit firemní údaje online**.

## v19.10.2 — #356 střecha EXT přes nejvyšší můstek (větev claude/a2-356)

Dávka A2, dokončení #356 podle rozhodnutí J. V. 19. 10. 2026: varianty
**A1 + B1 + C1 + D1 + E1** z návrhu https://claude.ai/artifact/9nMGAMnggiVEByuZoty9Qt.
Nad `origin/claude/integrace-16-10` (e3995e6, v19.10.1); kód převzatý
z `claude/a2-356-navrh` (cherry-pick 75f9fd1).

- **#356 hotovo — střecha přes nejvyšší můstek se připočte:** je-li můstek
  i v nejvyšším nástupišti (D1: můstků ≥ nadzemní nástupiště, táž podmínka
  jako věta specifikace „přetažená i přes nástupní můstek“), přičte jádro
  k ZASTŘEŠENÍ ŠACHTY (EXT) i k PŘÍPLATKU ZA STŘECHU V MĚDI (B1, jedna
  položka) plochu **(šířka můstku + 0,2 m) × hloubka můstku** (A1).
  Oplechování k fasádě beze změny (C1); platí v Modelu 1 i 2 (E1). Bez
  rozměrů můstku nic navíc a nové upozornění `mustekStrecha` (ne zábrana).
  Výsledek jádra nese `strecha` (`m2`, `mustekNahore`, `mustekM2`).
- **Ruční reference** (`src/test_mustky.js`): šachta 1,51 × 1,515 m →
  2,76165 m², můstek 1 300 × 900 mm → +1,35 m² = 4,11165 m²; zkušební ceník
  13 808,25 → 20 558,25 Kč nákladu. Ukázkové zakázky (zkušební ceník,
  Model 2): nabídka 1 550 000 → 1 558 000, 1 519 000 → 1 524 000,
  1 951 000 → 1 968 000 Kč.
- **Pojistka:** `src/test_mustky.js` 53/6 → 59/0, `src/test_kontroly.js`
  (37 pravidel, `overit_lista.mjs` čeká 37) 137/1 → 138/0. Zakázky bez
  můstku nebo s můstky jen níž beze změny: otisky výsledku
  `src/test_profil_neznamy.js` 30/0 (pole `strecha` mimo otisk), fuzz
  `src/test_fuzz_invarianty.js` 19/0.
- **Mutace jádra #356 +5** (plocha, přesah, podmínka, měď, upozornění).
- Příručka: kapitola 11 (můstky) a „Co je nového ve verzi v19.10.2“;
  roadmapa #356 → hotovo.

---

## v19.10.1 — B189: výchozí režim DPH ve smlouvě o dílo realizace podle rozhodnutí J. V. (větev claude/o2-b189)

**Kolo `--jen build,sady,staticke` nad 542d0ef (v19.10.1, 19. 10. 2026) — VŠE ZELENÉ:** sady 274 prošlo / 0 selhalo / 1 přeskočeno (`test.js`, ostrý ceník), statické 3/3. Mutace cíleně: `B189` jádro 8/8 + server 1/1, `DPH` 13/13, `sod`/`SoD` (filtr nerozlišuje velikost písmen) 28/28; `--kontrola` jádro 254, server 539 úseků. Podklady: šablony z Disku v `KNG_PODKLADY` (CN v8–v15 + EN/DE/FR v15, PROJ v3 i jako `Sablona_NABIDKA_PROJ.docx`, v4, v5, EN, SoD v1/v2, plná moc), SoD realizace v3 a projekce v4 vyrobené `vyrob_sablony.js`, příručka v19.10.1 vyrobená `manual/snimky_auto.mjs` + `sestav.sh` (22 snímků; první běh kola padl jen na `overit_manual` se starou příručkou v25.9.3 z Disku).

Dávka O2 (zadání koordinace „ŘÍDÍCÍ 18.10“), nad `origin/claude/integrace-16-10`
(`62bd0b6`, v18.10.15). Řeší střední nález **B189** z auditu kola 28 (roadmapa
**#430**) rozhodnutím J. V. 19. 10. 2026.

- **Výchozí režim (`kryciDphRezimVychozi`, `src/kryci.js`):** DIČ zákazníka
  **CZ… → přenesená daňová povinnost (tuzemsko, § 92e ZDPH)** — jako pevná věta
  šablony v2; **bez DIČ → česká DPH**; **DIČ jiného státu EU i mimo EU → bez
  výchozí volby** (pole „— nevybráno —“; rozhoduje místo stavby). Ruční volba
  má vždy přednost, uložená volba ani zmrazené předvyplnění zamčené varianty
  se nemění.
- **Zábrana tisku (fail-closed):** `sodDphZabrana` (`src/sod.js`) — bez
  zvoleného režimu smlouva o dílo realizace nevznikne. `sodData` hází (registr
  dokumentů → serverová i místní šablona), `dokumentZabrana('sod')` zhasne
  tlačítko s toutéž větou, pod tlačítkem svítí důvod a tlačítko *Přejít na
  volbu režimu DPH* (`src/ui/sod_ui.js`). Vlastní znění režimu se počítá jako
  volba (symboly zůstanou `{{…}}`). SoD projekce a plné moci se netýká.
- **Věty DPH:** tuzemská přenesená povinnost má vlastní větu (odlišnou od
  reverse charge čl. 196) už od šablony v3 — nový symbol ani věta nepřibyly,
  EN/DE/FR beze změny. Znění všech vět je **předběžné do kontroly účetní**;
  do `podklady/SOD_EN_KONTROLA.md` přibyl oddíl o výchozí volbě a otázky
  (5) odkaz na § 92e / „domestic reverse charge“ a (6) věta pro zákazníka mimo
  EU se stavbou v ČR.
- **Testy:** `src/test_sod_en.js` 2c, oddíl B189 (10 kontrol: CZ, bez DIČ, EU,
  mimo EU, zábrana v registru i v UI, ruční přednost, vlastní znění, zamčená
  varianta) — proti 62bd0b6 **40 prošlo / 7 selhalo**, po opravě **47 / 0**;
  pokus `podklady/AUDIT28_pokus_sod.mjs` P1 otočen (18 / 0). Mutace „B189: …“
  8 v `mutace_jadro.mjs` (dvě zastaralé mutace DPH nahrazeny), 1 v
  `netlify/mutace.mjs` (UI zábrana; sada `test_sod_en.js` přidána do SADY).
- **Zápis:** `BEZPECNOST_MEZE.md` a audit (B189 vyřešeno), roadmapa #430
  hotovo, příručka (kap. 24, „Co je nového ve verzi v19.10.1“).

## v18.10.15 — B188: obnova matice zobrazení ze zálohy jen s heslem správce (větev claude/o1-b188)

**Celé testovací kolo K2 nad d3fda27 (v18.10.15, 18. 10. 2026) — VŠE ZELENÉ:** build OK, příručka v18.10.15 (22 snímků); sady s podklady 274/0/1 (přeskočen jen `test.js`, ostrý ceník); mutace jádra 248/248; mutace serveru 538/538 v 56 skupinách, 0 přeživších, 0 chybně zadaných; statické kontroly 3/3. Podklady: 31 šablon z Disku, PROJ v3 i jako `Sablona_NABIDKA_PROJ.docx` (B193), SoD realizace v3 a projekce v4 vyrobené z testovaného SHA. **Integrace do `test`: fast-forward 1cbab3a → c9577ed 19. 10. 2026 (pokyn J. V. „pushni do test“).**

Dávka O1 (zadání koordinace „ŘÍDÍCÍ 18.10“), nad `origin/claude/integrace-16-10`
(`cdca5f3`, v18.10.14). Opravuje střední nález **B188** z auditu kola 28
(roadmapa **#429**): B168 chtěl heslo správce jen u `POST /api/zobrazeni`,
obnovou ze zálohy šla matice zapsat bez něj.

- **Server (`netlify/functions/obnova.mjs`):** mimo náhled se volá
  `potvrdHesloSpravce`, kdykoli by obnova matici zapsala (`obnovaNeseMatici`:
  část `zobrazeni` vybraná a záloha ji nese jako objekt) — ze **souboru**,
  z **otisku** i v **dávce** rozpracované obnovy. Ověří se před zámkem
  a otiskem; bez hesla / se špatným heslem 401 (`kod: 'hesloSpravce'`), série
  429 — nic se nezapíše. Náhled heslo nechce.
- **Obrazovka obnovy:** heslo se vyžádá týmž dialogem a s toutéž 10min pamětí
  jako panel Zobrazení (B168); u otisku s účty jeden společný dialog. Zrušený
  dialog obnovu zastaví s hláškou (lze odškrtnout část „zobrazení“).
- **Další cesty zápisu matice prověřeny:** serverově jen `/api/zobrazeni`
  (heslo, B168) a obnova; import konfigurace i migrace v prohlížeči jdou na
  server týmž `/api/zobrazeni`. Jiné endpointy `program/zobrazeni` nezapisují.
- **Testy:** `test_zobrazeni_heslo` +10 kontrol (oddíl B188; proti cdca5f3
  selhalo 7), `test_obnova` (B100 matice teď s heslem), `overit_online`
  (+4: dialog u otisku, paměť hesla, soubor s maticí bez hesla se neobnoví),
  pokus `AUDIT28_pokus_obnova_matice.mjs` P3 otočen (401). Mutace „B188: …“
  (3) v `netlify/mutace.mjs`, mutace B77 obnovy přepsána na nový tvar podmínky.
- **Příručka:** Co je nového a kap. 30 — obnovu nastavení zobrazení potvrzuje
  správce heslem.

## v18.10.14 — kontrola rozhodnutí 16.–18. 10.: SoD DPH, skladné, DE/FR, #380, #425, B183 (větev claude/v7-kontrola)

Dávka V7 (zadání koordinace „ŘÍDÍCÍ 18.10“), nad `origin/claude/integrace-16-10`
(`8480133`, v18.10.11). Ověřeno, že rozhodnutí J. V. z 16.–18. 10. 2026 jsou
v kódu, příručce, překladech EN/DE/FR a roadmapě; výsledek
v `podklady/KONTROLA_ROZHODNUTI_V7_18_10.md` (9 rozhodnutí, opravy V7-1 až
V7-7, nálezy V7-N1, V7-N2). Změny chování žádné.

- **Kód sedí** u všech bodů: režim DPH volbou a výchozí podle DIČ (CZ /
  bez DIČ / mimo EU → česká DPH, EU → reverse charge EU), skladné z Firmy
  v Kč / v eurech kurzem ceníku, SoD EN/DE/FR se zábranou bez šablony,
  SoD projekce v4 (#380 B), #425 beze změny, #355, #366, B165.
- **Příručka kap. 24:** mimo EU (V7-1), skladné v eurech a `{{SOD_SKLADNE}}`
  (V7-2), nadpis i DE/FR, „před zveřejněním kontrolují rodilí mluvčí“ místo
  „zkontrolovaný“, věty DPH a výčet činností v4 v jazyce smlouvy (V7-3).
- **B183 volba (a) — znění meze:** komentář `vyjimkyPlochyJadra`
  (`src/vyjimky.js`), komentář v `netlify/test_vyjimky.mjs`, příručka kap. 19
  a Co je nového v17.10.5 říkaly „±0,5 m² / o půl m² a víc“; obsah drží celé
  m², nekrytý nárůst je až těsně pod 1 m² (V7-6). `BEZPECNOST_MEZE.md` už
  sedělo.
- **Roadmapa:** #380 `hotovoV` a verze Q7 v18.10.8 + EN/DE/FR v4 (V7-4); #425
  `kde` mířil na neexistující `netlify/lib/vyjimky_server.mjs`, razítko
  `pozadal` (V7-5); #366 otázka výkladu — odpovídá příkladu J. V. 16. 10.,
  otevřená zůstává jen přípona .2 (V7-7).
- **Mimochodem:** `podklady/SOD_EN_KONTROLA.md` — řádek SoD projekce v4
  EN/DE/FR; `PREDAVKA.md` — dva osiřelé nadpisy po slučování.
- **Nálezy (návrh):** V7-N1 karta výjimky ukazuje plochu na setiny, schválení
  drží celé m² (B183 c); V7-N2 výchozí DPH podle DIČ nezohledňuje místo
  stavby (účetní, SOD_EN_KONTROLA bod 1).
- **Výsledky:** `./spust_testy.sh --smoke` (bez KNG_PODKLADY, Playwright
  1.56.1) **266 prošlo / 0 selhalo / 6 přeskočeno** (test.js, overit_manual,
  overit_nabidka_proj_word, overit_sablona, overit_sablony_online,
  overit_sod — firemní podklady). `build.py` (KNG_NEZVYSOVAT_VERZI=1),
  `--kontrola-verze`, `roadmapa.py --kontrola` (427), `mutace.mjs --kontrola`
  (520), `mutace_jadro.mjs --kontrola` (247), `kontrola_udaju.py` čisté.
  Mutace nespuštěny (změny jen v komentářích a textech).

---

## v18.10.12 — Testovací kolo 28 a bezpečnostní audit v18.10.11 (B188–B193), oprava B190 (větev claude/kolo28-audit)

Zadání koordinace „ŘÍDÍCÍ 18.10“ (dávka N4), nad `origin/claude/integrace-16-10`
(`8480133`, v18.10.11). Audit rozdílu v17.10.5 → v18.10.11:
`podklady/AUDIT_2026-10-18_v18.10.11.md`, pokusy `podklady/AUDIT28_pokus_obnova_matice.mjs`
a `podklady/AUDIT28_pokus_sod.mjs`, meze v `BEZPECNOST_MEZE.md`.

- **Verdikt:** 0 kritických, 0 vysokých, **2 střední** (B188, B189), 1 nízký (B190,
  opraven), 3 informativní (B191–B193); regrese B151–B187: 0.
- **B188 (střední, otevřeno, #429):** matici zobrazení jde zapsat bez hesla správce
  obnovou ze zálohy (`/api/obnova`, část `zobrazeni`) — B168 tak nezastaví ukradenou
  cookie správce. Návrh opravy ve zprávě.
- **B189 (střední, otevřeno, #430):** výchozí režim DPH podle DIČ — CZ → česká DPH
  (v2 měla přenesenou daňovou povinnost), EU → reverse charge bez ohledu na místo stavby.
- **B190 (nízká) — OPRAVENO:** skladné „1.500“ z Nastavení → Firma dalo ve smlouvě
  „2,- Kč“. `sodSkladneKc` (src/sod.js) přijme jen celé číslo nebo 1–2 desetinná místa,
  jinak `{{SOD_SKLADNE}}` zůstane k doplnění. Test `src/test_sod_en.js` 2c: před
  opravou 2 FAIL, po opravě 37/0; mutace „B190: skladné s tečkou tisíců“ 1/1
  (SKLADNE 3/3, `--kontrola` 248 úseků).
- **B193:** `test_sablona_proj_v4` a `overit_nabidka_proj_word` čekají PROJ v3 pod
  jménem `Sablona_NABIDKA_PROJ.docx` (podklad na Disku je starší); s v3 projdou 41/0 a 63/63.
- **Kolo nad 8480133** (šablony z Disku, `--jen build,sady,staticke`): 268 prošlo,
  2 selhalo (B193, podklad), 2 přeskočeno; statické 3/3. Po opravě (v18.10.12, PROJ v3
  v podkladech): 270 prošlo, 0 selhalo, 2 přeskočeno (po doplnění `cekaNa` k #430).
- Roadmapa #428 (hotovo), #429 B188, #430 B189 (čeká) — předběžná id.
- `podklady/AUDIT27_pokus_vyjimky.mjs`: zápis matice s heslem správce (po B168 padal na 401).

---

---

## v18.10.13 — hygiena drobných nálezů H1: odhlášení všude, úklid cache Pipedrive a analytiky, čísla zadání textem, XSS karty schvalovatele (větev claude/h1-hygiena)

Zadání koordinace „ŘÍDÍCÍ 18.10“ (dávka H1), nad `origin/claude/integrace-16-10`
(`8480133`). Nálezy B171, B174, B175 (audit 15. 10.) a B186, B187 (audit
18. 10., `podklady/AUDIT_2026-10-18_v17.10.5.md`). Výchozí volby rozhodla
dávka sama (J. V. se neptal), konzervativně a bez změny chování pro běžného
uživatele.

- **B171 — odhlášení odhlásí všechna zařízení.** Obě tlačítka Odhlásit
  (lišta účtu a panel online) mají nápovědu a panel online větu „Odhlášení
  platí pro všechna zařízení…“. *Výchozí volba:* jen česky — rozhraní
  aplikace se nepřekládá (EN/DE/FR jsou jen u dokumentů); žádné potvrzovací
  okno (odhlášení zůstává na jedno kliknutí). Příručka to uvádí od 13. 10.,
  beze změny.
- **B174 — úklid `pd_cache`.** Noční otisk po záloze smaže detail případu
  (kontakty z CRM), seznam případů a počítadlo stropu starší **30 dní**
  a záznam bez zjistitelného stáří (`netlify/lib/uklid.mjs`). *Výchozí
  volba:* 30 dní (`PD_CACHE_UKLID_DNU`); chyba úklidu zálohu neohrozí.
- **B175 — analytika.** Server čistí klíče prvků týmž pravidlem jako
  prohlížeč (`analytikaKlicOrez`: vše od „(“ → „(…)“), i u prvků po
  uživatelích; uložené dny jednou projde noční očista (značka `ocista-b175`,
  přepisuje jen dny, které to potřebují).
- **B186 — čísla zadání uložená jako text.** `importZakazka` převede
  číselná pole zadání OCK a PROJ (i formát v1) z textu na číslo („9“ → 9),
  takže jádro nesčítá řetězce; server zakázku importuje stejnou funkcí
  a ukládá čísla. *Výchozí volba:* jen text s desetinnou tečkou — čárku
  („9,5“) server dál odmítá 400 (B134, B137), nečíselný text zůstává.
- **B187 — `overit_xss.mjs`** prochází kartu výjimky v pohledu
  schvalovatele (sazby, dopad, světlíky „jiné“, payload v názvu pásu).

Testy (každý s pojistkou před/po opravě, doloženo v commitu):
`src/test_odhlaseni_text.js`, `netlify/test_uklid.mjs`,
`src/test_analytika.js` (B175), `src/test_cisla_textem.js`,
`netlify/test_koncova_cena.mjs` (B186), `overit_xss.mjs` (B187). Mutace
v `netlify/mutace.mjs`: B171 (2), B174 (4), B175 (4), B186 (4).

## v18.10.11 — SoD: mutace dávky V3 v sadách, činnosti SoD PROJ v jazyce smlouvy, šablony v4 EN/DE/FR (větev claude/v3b-sod-preklad)

**Ověření pro `test` (koordinace 18. 10. 2026):** celé kolo s mutacemi K1 nad 0dbec56 (v17.10.5): sady s podklady 262/2/1, mutace jádra 222/222, mutace serveru 509/509 (51 skupin), statické 2/3 — všechna selhání (kontrola verze, `test_sod_proj_cislo` část 4, `overit_roadmapu` #425) známá a opravená v integraci (v18.10.5). Sady + cílené mutace S1 nad d138384 (v18.10.11): 271/0/1, statické 3/3, cílené mutace serveru a jádra bez přeživší; oprava harnessu příručky po B168 (`claude/s1-opravy` af15443). Kandidát na `test`: a7f1f60 (v18.10.11).

Zadání koordinace 18. 10. 2026 (navazuje na V3 a V5 #380), nad
`origin/claude/integrace-16-10` (`0bf74e6`, v18.10.10); sloučen i doplněk
V3 `817b378` (symboly `{{SOD_DPH_REZIM}}` / `{{SOD_SKLADNE}}`, výchozí režim
DPH podle DIČ — v integraci chyběl).

- **Mutace V3 v sadách mutací jádra.** `mutace_jadro.mjs`: jádra + `sod.js`,
  `../nastroje/preklad_sod.js`, `../nastroje/vyrob_sablony.js` (výběr sad
  podle názvu souboru), 25 úseků MUTACE (#157 5, #380/#157 1, DPH 7,
  SKLADNE 3, SoD v3 3, preklad_sod 6), rychlé sady SoD v PRIORITA.
  `--kontrola` 247 úseků právě jednou; filtry 25/25 chycených.
- **Názvy sedmi činností SoD projekce v jazyce smlouvy** (#380 V5 —
  `{{SODP_ROZSAH_DILA}}` byl v EN/DE/FR česky). Šest názvů ve slovníku
  (`src/preklad.js`), „Zaměření a zpracování výstupů“ má překlad u činnosti
  (`SODP_CINNOSTI.preklad` v `src/sod.js`) — slovník porovnává bez ohledu na
  velikost písmen a nadpis nabídky „ZAMĚŘENÍ a zpracování výstupů“ by dal
  „sURVEY and processing …“; nadpis nabídky beze změny. Znění jako v čl. II
  přeložených šablon, ke kontrole rodilými mluvčími (SOD_EN_KONTROLA.md).
- **Šablony SoD projekce v4 EN/DE/FR** z české v4 (`--sod-proj-v4` nad v3)
  nástrojem `preklad_sod.js` (nově pracuje s realizací v3 a projekcí v4):
  slovníky v3 převzaty, nová věta přílohy „… for the activities /
  für die Leistungen / pour les prestations: {{SODP_ROZSAH_DILA}} …“,
  záznam „DPZ+DSP“ odstraněn, poznámka k „odst. 5“ zrušena (V5 ověřila, že
  odkaz sedí). Kontrola bez problémů (95 odstavců, 56 symbolů); celá cesta
  ověřená lokálně CZ/EN/DE/FR (výčet jen nabízených činností, žádná zbylá
  značka). Soubory jako přílohy sezení.
- **Testy:** `src/test_sod_en.js` +4 (výčet EN/DE/FR, nadpis nabídky beze
  změny) — bez doplnění 31 prošlo / 3 selhalo, po něm 34/0. Smoke
  266 prošlo / 0 selhalo / 6 přeskočeno (firemní podklady).

---

## v18.10.10 — B168, B176 a zápis nálezů 15. 10. (větev claude/b168-matice-heslo)

Dávka B168 (zadání J. V. 18. 10. 2026 přes koordinaci „ŘÍDÍCÍ 16.10“), nad
`origin/claude/integrace-16-10` (`0dbec56`, v17.10.5). Obranné zpevnění podle
bezpečnostních auditů 15. a 17. 10. 2026. B178 a B179 (O6) beze změny.

- **B168 (střední) — změna matice zobrazení chce heslo správce.** Matice
  řídí i serverová práva (CRM, čtení nákladového ceníku, úpravy ceníku
  v zakázce), ale `POST /api/zobrazeni` chtěl jen roli. Teď pole
  `hesloSpravce` (`potvrdHesloSpravce`, týž limit pokusů jako citlivé akce
  účtů B77), odmítnutí 401/429 s `kod: 'hesloSpravce'`; GET beze změny.
  Klient se ptá týmž dialogem; ověřené heslo drží jen paměť stránky
  10 minut po posledním uložení (výchozí volba dávky, jinak by autosave
  panelu chtěl heslo u každého zaškrtnutí), odhlášení a odmítnutí ho
  zahodí. Zrušené heslo matici neuloží a řekne to hláškou s návodem
  „Uložit teď“ — zaškrtnutí zůstane.
- **B176 (informativní) — neznámé právo už neznamená „povoleno“.**
  `zobrazeniSmi`: administrátor smí vždy, klíč mimo seznam prvků ostatním
  false. Nová statická kontrola: každé právo, na které se kód ptá (src/
  i netlify/), je v seznamu — všechny byly, nic se nedoplňovalo.
- **Zápis nálezů auditu 15. 10.:** roadmapa #426 (B168, B176 — hotovo)
  a #427 (B171, B174, B175 jako drobné úkoly; meze B169, B170, B172, B173,
  B177), `BEZPECNOST_MEZE.md` oddíl „Audit 15. 10. 2026“. Kolize čísla
  B178: nález 15. 10. (nechycená mutace B31) zapsán jako uzavřený
  v15.10.14 (S10, `6d9ecdb`), B178 = nález 17. 10.
- **Testy:** nová sada `netlify/test_zobrazeni_heslo.mjs` (před opravou
  3 OK / 10 FAIL, po ní 13/0); `src/test_zobrazeni.js` B176 (před opravou
  2 FAIL, po ní 0); `overit_zobrazeni.mjs` zrušené heslo a dialog hesla;
  sady a harnessy, které matici ukládají, posílají heslo. Mutace „B168:
  matice zobrazení se uloží bez potvrzení heslem“ a „B176: neznámý klíč
  matice znamená povoleno“.
- **Výsledky:** `nastroje/pred_pushem.sh` 260 prošlo / 0 selhalo /
  6 přeskočeno (firemní podklady mimo repo, `test.js`); cílené mutace
  B168 1/1, B176 1/1, filtr „zobrazen“ 10/10, „B80: právo Pipedrive“ 1/1.
- **Mimochodem:** #425 dostal `cekaNa` (overit_roadmapu chce u odložených
  důvod); stub `dotazHeslo` v harnessech, které ukládají matici.

## v18.10.8 — rozsah díla SoD projekce podle nabídky (#380 Q7; větev claude/v5-sod-proj-rozsah)

Dávka V5 (zadání koordinace „ŘÍDÍCÍ 16.10“, rozhodnutí J. V. 17. 10. 2026 —
varianta B), nad `origin/claude/integrace-16-10` (`9bb7caf`, v17.10.4).

- **Nové — šablona SoD projekce v4** (`node nastroje/vyrob_sablony.js
  --sod-proj-v4 <složka s Sablona_SOD_PROJEKCE_v3.docx> [výstup]`, funkce
  `sodProjV4`). Z v3: věta přílohy č. 1 „… na vypracování dokumentace
  DPZ+DSP včetně zajištění inženýringu tj. … včetně nabytí právní moci …“ →
  „… na činnosti: `{{SODP_ROZSAH_DILA}}` – objekt …“ (symbol v jednom běhu
  s písmem původního textu); sedm činností v čl. II (Předmět díla) a čl. III
  (Termíny plnění) ve značkách `{{CIN_<X>_ZAC}}`/`{{CIN_<X>_KON}}`
  (ZAMERENI, DPZ, IC_DOSS, POVOLENI, DPS, EZC, VYBER) i s prázdným odstavcem
  před odrážkou; věta o předání díla v čl. III ve značkách není. Kotvy
  (nadpisy článků, začátky odrážek, věta přílohy) musí být právě jednou,
  jinak nástroj skončí chybou. Výroba nad skutečnou v3 z Disku: „✓ … symbolů
  56 (vstup 41), značek činností 14, XML bez vad“. Hotový soubor se do repa
  necommituje (firemní text).
- **Nové — aplikace plní rozsah díla.** `sodProjData` → `sodProjRozsah`
  (`src/sod.js`): výčet nabízených činností plnými názvy jako v čl. II
  (`sodProjRozsahText`, „…, … a …“; kdyby J. V. chtěl zkratky, mění se jen
  ona), nenabízené činnosti do `blokyPryc`. Sekce Kalkulace PROJ podle vět
  plateb staré šablony (`PLAN_SODP_STARE_CINNOST`): zaměření → zaměření,
  DPZ → DPZ, IČ → IČ DOSS i podání a vyřízení povolení, DPS → DPS,
  EZČ → EZČ i výběr dodavatele. Nabídka vrací `nabizeneSekce`
  (`src/nabidka_proj.js`). Generátor: `odstranPrazdneBloky(xml, ph,
  blokyPryc)` odstraní blok ze seznamu celý i bez symbolu (`src/docxgen.js`,
  předává `src/dokumenty.js`). Odrážky čísluje Word — po vypuštění jdou
  a), b), c) … souvisle. Šablona v3 (bez značek a symbolu) dává smlouvu jako
  dřív.
- **Odkaz „odst. 5“ v čl. VII — ověřeno, bez opravy.** Podle číslování
  článku (odstavce 1–7, ověřeno i vykreslením v LibreOffice) je odst. 5
  „Kterákoliv ze smluvních stran je oprávněna požadovat … potvrzení
  kteréhokoliv oznámení poštou“ — přesně to, na co věta odst. 6 („…
  požadovat potvrzení oznámení poštou dle odst. 5.“) odkazuje. Odkaz je
  správný; `sodProjV4` ho podle číslování hlídá a chybný by opravil (test
  s „odst. 4“ → 5). Odkazy „článku II odst. 4“ (čl. IX) a „bodu III.“
  (čl. V) se vypouštěním činností nemění (činnosti jsou písmena, ne odstavce).
- **Meze:** studii, projednání studie, kolaudaci a geodetické zaměření
  šablona v předmětu díla nemá — výčet je nebere. Nabídka bez kterékoli ze
  sedmi činností nechá `{{SODP_ROZSAH_DILA}}` ve Wordu vidět. Výčet
  v cizím jazyce překládá `tr()` — názvy činností slovník zatím nemá
  (zůstanou česky), SoD je dnes jen česky.
- **EN/DE/FR šablony SoD (dávka V3) se v této dávce nemění.** Po zveřejnění
  v4 je potřeba jazykové verze přegenerovat z v4 nástrojem
  `nastroje/preklad_sod.js` (V3), jinak nebudou mít symbol rozsahu ani
  značky činností (budou se chovat jako v3).
- **Postup nasazení (udělá J. V.):** šablonu `Sablona_SOD_PROJEKCE_v4.docx`
  nahrát na Disk vedle v3 (složka Kalkulator NextGen / Sablony, v3
  nepřepisovat); v aplikaci (test i ostrá zvlášť) jako administrátor
  **Nastavení → Šablony → Šablona smlouvy o dílo — PROJEKČNÍ PRÁCE →
  „Nahrát novou českou verzi…“** → vybrat v4. Krok Kontrola musí ukázat
  „Proti platné verzi: přibylo SODP_ROZSAH_DILA, CIN_ZAMERENI_ZAC, …“
  (rozsah + 14 značek) a nic nechybí → **Zveřejnit**. Zkouška: zakázka PROJ
  jen s DPZ + IČ + DPS → „Vytvořit smlouvu o dílo PROJ (Word)“ → čl. II
  a) DPZ, b) IČ DOSS, c) podání žádosti, d) DPS; čl. III bez zaměření, EZČ
  a výběru; příloha „… na činnosti: dokumentace pro povolení záměru, …“.
  Podrobně `podklady/POSTUP_SABLONY_SOD_PROJ_V4_18_10.md`.
- **Testy (pojistka):** `src/test_sod_proj_rozsah.js` proti kódu před
  opravou 0/2 (sodProjV4 ani `blokyPryc` neexistují), po opravě 34/0;
  s `KNG_PODKLADY` (skutečná v3 a vyrobená v4) 42/0. Harness
  `overit_sod_proj_rozsah.mjs` (sestavená aplikace, zakázka PROJ jen
  DPZ + IČ + DPS / všechny činnosti / stará v3) 7/7 se syntetickou šablonou
  i se skutečnou v3 a v4. Mutace #380 (`netlify/mutace.mjs`, sada přidána
  do `SADY`) 9/9 chycených, `--kontrola` 510 úseků. Harness S9
  `overit_sod_proj_cislo.mjs` se skutečnou v3 6/6.
  Příručka kap. 24 (nový odstavec „Smlouva o dílo projekce vyjmenuje jen to,
  co nabízíte“) a Co je nového v18.10.3; roadmapa #380 → hotovo.

## v18.10.7 — smlouvy o dílo v němčině a francouzštině, režim DPH a skladné (#157; větev claude/v3-sod-en)

Pokračování dávky V3 podle rozhodnutí J. V. 18. 10. 2026 (přes koordinaci):
SoD i v DE a FR stejně jako EN; #380 Q7 = varianta B, udělá ji dávka V5;
sporná místa EN šablony (DPH u zahraničního zákazníka, skladné) J. V.
upřesní — šablony zatím beze změny, jen oddělená ve slovníku. Verze
v18.10.7 přidělila koordinace (dřív předběžně v18.10.1).

- **Režim DPH volbou a skladné kurzem (rozhodnutí J. V. 18. 10. 2026).**
  Šablona SoD realizace v2 nesla v čl. V natvrdo přenesenou daňovou
  povinnost a hned za ní prohlášení o snížené sazbě DPH — jedno vylučuje
  druhé. Nová česká šablona **SoD realizace v3**
  (`nastroje/vyrob_sablony.js --sod-real-v3`, kotvy právě jednou, jinak
  chyba): věta režimu → `{{SOD_DPH_REZIM}}`, tělo odstavce „3.“ →
  `{{SOD_DPH_PROHLASENI}}` (číslo zůstává kvůli odkazům na „bod 4“), pevná
  částka skladného → `{{SOD_SKLADNE}}`.
  - Krycí list OCK, sekce Smlouva o dílo: pole **Režim DPH ve smlouvě**
    (česká DPH v zákonné sazbě / přenesená daňová povinnost (tuzemsko) /
    reverse charge EU — čl. 196 směrnice 2006/112/ES). Výchozí podle země
    objednatele z předpony DIČ (`kryciDphRezimVychozi`: prázdné / CZ / mimo
    EU → česká DPH, kód státu EU → reverse charge EU); obchodník přepíše,
    zámek po tisku SoD jako u ostatních polí. `sodDphSymboly` (sod.js): věta režimu;
    prohlášení o snížené sazbě jen při české DPH a místě plnění bytový /
    rodinný dům, jinak věta o oznámení změny (druhá věta původního
    odstavce). Vlastní znění režimu symboly nevyplní ({{…}} ve Wordu). Věty
    EN/DE/FR ve slovníku; znění ke kontrole účetní (SOD_EN_KONTROLA.md).
  - Nastavení → Firma: **Skladné … Kč za den** (`skladneDenneKc`, bez
    výchozího čísla). `sodSkladne`: česky „N,- Kč“ (tvar dosavadní
    šablony), cizí jazyk v měně smlouvy `mena.na` (#155, celá eura nahoru);
    `nabidkaData` nově vrací `mena`. Prázdné pole nechá `{{…}}`.
  - Jazykové šablony **SoD realizace v3** EN/DE/FR vyrobené znovu
    (137 odstavců, 56 symbolů, kontrola bez problémů); slovníky v3 převzaly
    překlady v2, skladné je pojmenované místo `[[SKLADNE]]` = symbol
    v měně smlouvy, místa DPH zanikla (věty dodává aplikace).
    `preklad_sod.js` pracuje se šablonami realizace v3 a projekce v3.
- **Nástroj `nastroje/preklad_sod.js` zobecněný na jazyky** `--jazyk en |
  de | fr` (slovník `*.preklad_<jazyk>.json`, výstup `_DE` / `_FR`, překlad
  z pole jazyka, odhad jazyka a zakázaná česká diakritika podle cílového
  jazyka).
- **Pojmenovaná místa** `[[JMENO]]` — záznam `{ misto, en|de|fr, pozn }`
  ve slovníku; neznámé nebo nepřeložené místo se odmítne. V EN, DE i FR
  slovníku SoD realizace: `DPH_REZIM`, `DPH_SNIZENA_SAZBA`, `SKLADNE` —
  změna znění = přepis jednoho záznamu. Anglické šablony vyrobené znovu
  jsou s v17.10.6 bajtově shodné (document.xml).
- **Vyrobeny** `Sablona_SOD_REALIZACE_v2_DE/FR.docx` (139 odstavců)
  a `Sablona_SOD_PROJEKCE_v3_DE/FR.docx` (95), kontrola bez problémů (jazyk
  de 96–99 %, fr 100 %), testzip a převod do PDF v pořádku; předány J. V.
  jako přílohy sezení spolu se slovníky (do repozitáře nepatří). Kontrolní
  seznam termínů DE/FR a pojmenovaná místa v `podklady/SOD_EN_KONTROLA.md`.
- **Aplikace pro DE/FR:** hesla pro splátky, platby PROJ a místo plnění
  jsou ve slovníku od v17.10.6; zábrana bez jazykové šablony platí pro DE
  i FR. Příručka kap. 24 a Co je nového v18.10.7.
- **Režim DPH a skladné — testy:** `src/test_sod_en.js` +10 (režimy,
  prohlášení, vlastní znění, skladné Kč / € nahoru / prázdné; částka
  smyšlená) proti stavu před úpravou 25 prošlo / 5 selhalo, po ní 30/0;
  nový `src/test_sod_real_v3.js` (smyšlený úryvek čl. V a VI) bez
  `sodRealV3` 0/1, po něm 11/0. Mutace 12/12 (dvě částky ve větě
  o skladném napoprvé přežily → test). Celá cesta ověřená lokálně na
  skutečných šablonách v3 CZ/EN/FR (nic se necommituje).
- **Zarovnání se zadáním koordinace (18. 10., 07:52):** symboly
  `{{SOD_DPH_REZIM}}` a `{{SOD_SKLADNE}}` (dřív …_VETA / …_DENNE), výchozí
  režim podle DIČ objednatele, věta reverse charge EU s čl. 196 směrnice.
  Dvě vědomé odchylky: (1) odstavec „3.“ článku V se nemaže a nese
  `{{SOD_DPH_PROHLASENI}}` — ruční číslo „3.“ a odkazy „bod 4“ / „odst. 4“
  (čl. V, XIII) by se po smazání rozešly s číslováním; (2) částka skladného
  není v kódu, ale v Nastavení → Firma — skutečná cena do repozitáře
  nepatří; česky vyjde „N,- Kč“ jako dosud.
  Mutace po zarovnání 14/14 (+ výchozí podle DIČ, DIČ s mezerou a malými
  písmeny — napoprvé přežila → test). `overit_zobrazeni.mjs` zachytil
  v krycím listu slovo „objednatel“ (krycí list mluví o zákazníkovi) →
  volba „reverse charge EU (zákazník z jiného státu EU)“; pak 140/0.
  Smoke 263 prošlo / 0 selhalo / 6 přeskočeno (firemní podklady).
- **Testy (pojistka):** `src/test_preklad_sod.js` proti nástroji z v17.10.6
  14 prošlo / 5 selhalo, po rozšíření 19/0; `src/test_sod_en.js` +2 (DE
  splátky a místo plnění, FR platby PROJ) 20/0 — hlídají slovník z v17.10.6,
  mutace hesel DE je shodí.
- **Mutace (cílené, oddělená kopie):** 18/18 chyceno (12 z v17.10.6
  znovu + pole jazyka, rozvinutí míst, neznámé místo, odhad jazyka DE/FR,
  dvě hesla DE; mutace „pole jazyka“ napoprvé přežila → test „záznam jen
  s en“). `./spust_testy.sh --smoke` 262 prošlo / 0 selhalo / 6 přeskočeno
  (firemní podklady).

---

## v17.10.6 — smlouva o dílo v angličtině (#157; #380 Q7 jen návrh; větev claude/v3-sod-en)

Dávka V3 (zadání koordinace „ŘÍDÍCÍ 16.10“, rozhodnutí J. V. 16. 10. 2026:
anglická SoD = překlad české šablony ke kontrole rodilými mluvčími),
nad `origin/claude/integrace-16-10` (`9bb7caf`, v17.10.4).

- **#157 hotovo — anglické šablony SoD.** Nový nástroj
  `nastroje/preklad_sod.js`: `--kostra` vypíše odstavce české šablony do
  slovníku (JSON mimo repozitář, značky stylů `<s1>…</s1>`, tabulátory,
  symboly), druhý režim odstavce přeskládá z překladu (vlastnosti odstavce,
  písmo tučných úseků a symbolů zůstávají) a zkontroluje výsledek: symboly
  shodné s češtinou, tabulátory, platné XML, odhad jazyka en, žádná česká
  diakritika. Vyrobeny `Sablona_SOD_REALIZACE_v2_EN.docx` (139 odstavců)
  a `Sablona_SOD_PROJEKCE_v3_EN.docx` (95), kontrola bez problémů; soubory
  a slovníky předány J. V. jako přílohy sezení (firemní texty, v repozitáři
  nejsou). Kontrolní seznam termínů `podklady/SOD_EN_KONTROLA.md`.
- **Aplikace — smlouva v jazyce tisku.** Karty SoD (krycí list OCK i PROJ)
  mají **Jazyk tisku** jako nabídky. Hodnoty, které skládá aplikace, jsou
  v jazyce smlouvy: seznam splátek SoD realizace (`kryciSodPlatby`, lang),
  platby SoD PROJ (`planSodKalendar` s překladem — „Payment after … – € … +
  VAT.“), druh místa plnění (`sodPrelozHodnoty`); slovník `src/preklad.js`
  EN/DE/FR. Čeština beze změny. Částky v eurech podle #155.
- **Bez jazykové šablony smlouva v cizím jazyce nevznikne**
  (`sodJazykZabrana`, `src/ui/sod_ui.js`) — dřív vznikla z české šablony
  s upozorněním „pevný text zůstal český“, tj. český právní text s anglickými
  hodnotami. Hláška řekne, kde šablonu nahrát (Nastavení → Šablony → EN).
- **#380 Q7 — jen návrh koordinaci** (varianty A věta přílohy / B i bloky
  činností v čl. II a III SoD PROJ, doporučeno B); kód beze změny.
- **Testy (pojistka):** `src/test_sod_en.js` (smyšlená anglická šablona,
  žádný firemní text) proti kódu před opravou 8 prošlo / 10 selhalo, po
  opravě 18/0; `src/test_preklad_sod.js` bez nástroje 0/1, s nástrojem 13/0;
  harness `overit_sod_en.mjs` (karty, zábrana v sestavené aplikaci) nad
  v17.10.4 2/4, po úpravě 6/0. `./spust_testy.sh --smoke` 261 prošlo /
  0 selhalo / 6 přeskočeno (firemní podklady), před přidáním harnessu
  a 13. testu nástroje — ty prošly samostatně.
- **Mutace (cílené, v odděleném worktree):** 12/12 chyceno — zábrana vypnutá,
  místo plnění nepřeloženo, platby PROJ česky, splátky OCK česky, bez „the
  remaining“, DPH nepřeloženo; v nástroji kontrola symbolů, tabulátorů,
  písmo symbolu, styl úseku, zahozené pPr, odhad jazyka (původně přežila →
  doplněn test „česky bez diakritiky“).

## v18.10.5 — kontrola rozhodnutí 16.–18. 10. (větev claude/v6-kontrola-rozhodnuti)

Dávka V6 (zadání koordinace „ŘÍDÍCÍ 16.10“), nad
`origin/claude/integrace-16-10` (`0dbec56`, v17.10.5). Ověřeno, že
rozhodnutí J. V. z 16.–18. 10. 2026 jsou v kódu, příručce a překladech
EN/DE/FR; výsledek v `podklady/KONTROLA_ROZHODNUTI_18_10.md` (12 rozhodnutí,
nálezy V6-1 až V6-9). Změny chování žádné.

- **Příručka — Co je nového pokrývá v16.10.1–v17.10.5:** doplněny B155
  (rozsah pásu v kartě výjimky), B163 (plná moc po tisku SoD volná), V4-1
  (rekapitulace PROJ EN/DE/FR) a B180 (rozpis zveřejnění se změnami
  příznaků); nadpisy říkají rozsah verzí. Opraveno „po tisku SoD zamčený
  celý“ (kap. 8, 24, novinky v15.10.14 — kromě údajů plné moci) a „číslo
  SoD se nepředvyplňuje“ (od v17.10.2 návrh).
- **Evidence rozhodnutí:** B165 část 2 → vědomá mez do #425 (J. V. 18. 10.
  „zatím ponechat“) v `BEZPECNOST_MEZE.md`, auditu kola 25 a roadmapě (#420
  hotovo); #422 výchozí volby S12 schválené (1A, 2A, 3A); #423 odkaz na
  B179; audit kola 26 doplněn o rozhodnutí 17. 10.; komentář u překladu
  V4-1 „schválil J. V. 17. 10.“ (slovník beze změny).
- **V4-5 uzavřeno:** registr dokumentů nese „Krycí list zakázky OCK – …“.
  `src/test_kryci_docx.js` +2: před opravou 55/2, po ní 57/0.
- **Předáno:** V6-8 — roadmapa #157 má v detailu vedle rozhodnutí 16. 10.
  i původní „čeká na právníka“ (přepíše V3 při uzavření #157).
- **EN/DE/FR:** nové texty obrazovky (kontrola #355, karta B165, štítky
  cena dle nabídky, zdroj „návrh z čísla nabídky“) do cizojazyčných
  dokumentů nejdou; texty dokumentů z S12, S13 a V4-1 slovník zná.
- **Roadmapa #425** (vlna F, zapsala koordinace v `0dbec56`) neměla
  `cekaNa` → `overit_roadmapu.mjs` padal už nad `0dbec56` (12/1); doplněn
  důvod odkladu, 13/0.
- **Testy:** `./spust_testy.sh --smoke` (bez KNG_PODKLADY) **259 prošlo /
  0 selhalo / 6 přeskočeno** (265 sad; firemní podklady, test.js).
  `kontrola_udaju.py` čistá, `build.py --kontrola-verze` a
  `roadmapa.py --kontrola` (425 položek) čisté. Mutace nespuštěny (změna
  v `src/kryci.js` je jen text názvu, hlídá ho test přímo).

## v17.10.5 — B165: sazby a dopad v kartě cenové výjimky, zbytek B178 (větev claude/b165-karta-vyjimky)

Dávka B165 (zadání koordinace „ŘÍDÍCÍ 16.10“, rozhodnutí J. V. 16. a 17. 10.
2026), nad `origin/claude/integrace-16-10` (`9bb7caf`, v17.10.4).

- **B165 část 1 — schvalovatel vidí, kolik výjimka stojí.** Karta
  Schvalování → Cenové výjimky ukazuje tomu, kdo smí rozhodnout
  (administrátor, právo „Schvalování slevy nad strop role“), u každé
  položky směsi **použitou a ceníkovou hodnotu** (platný ceník), u pásu
  „jiné“ použitou a nejnižší ceníkovou sazbu a plochu m², světlíky „jiné“
  u dveří a **dopad na cenu strany** (OCK cena bez DPH, PROJ celkem) v %
  a Kč — u položky i celkem (`vyjimkyDopad`, `vyjimkyDopadText`). Dopad =
  cena varianty − cena, kdyby položka měla ceníkovou hodnotu. Obchodník
  bez práva rozhodovat vidí dál jen názvy (sazby platného ceníku se mu
  neukážou). Vše přes `esc()`; na obsah výjimky ani cenu vliv nemá.
- **B165 část 2 — vlastní schválení:** zjištěno chování (role s právem
  `sleva.schvalovani` schválí i výjimku, o kterou sama požádala; server
  hlídá jen právo, ne osobu), návrh poslán koordinaci. **Beze změny**,
  dokud J. V. nerozhodne.
- **Zbytek B178 — plocha z výsledku jádra v obsahu výjimky.** U pásu
  „jiné“ nese obsah i plochu z výpočtu jádra (vnější rozměr stěny podle
  profilů a zasklení) a nový klíč `l` se **světlíky „jiné“ u dveří**
  (plocha podle nástupišť a šířky vstupu) — `vyjimkyPlochyJadra`; server
  (`zakazka_kontrola.mjs`, `ctx.jekly`) i prohlížeč počítají týmž JEKLY.
  **Zaokrouhlení na celé m²** (výchozí volba): posun o centimetry u nízkého
  pásu schválení neshodí, změna o půl m² a víc ano; nekrytý zbytek nejvýš
  ±0,5 m² × rozdíl sazeb. Chyba výpočtu = plocha neznámá → schválení
  neplatí (fail-closed).
- **Pro obchodníky:** **výjimky s pásem opláštění „jiné“ schválené před
  v17.10.5 se vrátí do stavu „čeká znovu“** a před tiskem je musí
  nadřízený schválit znovu (změna tvaru obsahu). Výjimky jen se směsí
  ceníku platí dál.
- **Testy (pojistka):** `src/test_vyjimky.js` proti v17.10.4 83 OK,
  8 FAIL + pád (`vyjimkyDopad` chybí, 10 testů B165 neproběhne), po opravě
  105/0 (dřív 88/0; dvě starší kontroly tvaru obsahu upravené na 8 prvků,
  zápis zdvihu „9“ kontroluje meze); `netlify/test_vyjimky.mjs` proti
  v17.10.4 69/3, po opravě 72/0 (zasklení a nástupiště po schválení → 403,
  drobný posun u pásu 1,2 m → 200; pomocník `obsah` s JEKLY jako server).
  Mutace (`netlify/mutace.mjs`): nové B178 zbytek 4/4 (plocha pásu,
  světlíky, zaokrouhlení, server bez katalogu) a B165 4/4 (dosazení
  ceníkové hodnoty, sazba pásu, čísla obchodníkovi, `esc()` názvu pásu);
  upravené starší „výjimky:“ 2/2, B155 1/1, B178 1/1; `--kontrola` server
  509 úseků, jádro 222.
- `python3 nastroje/kontrola_udaju.py` čisté, `roadmapa.py --kontrola`
  424 položek bez nálezu; roadmapa #420 (B165 část 1 hotovo), příručka
  kap. 19 + Co je nového v17.10.5, `BEZPECNOST_MEZE.md` (B165, B178 zbytek),
  audit kol 25 a 26.

## v17.10.4 — oprava B178 a B179 (schvalování výjimek, příznak „cena dle nabídky“; větev claude/o6-b178-b179)

Dávka O6 (zadání koordinace „ŘÍDÍCÍ 16.10“, rozhodnutí J. V. 17. 10. 2026),
nad `origin/claude/kolo26-audit` (`54174ee`, v17.10.1).

- **B178 opraveno — schválený pás „jiné“ nejde zvětšit změnou šachty.**
  Meze pásů počítá jediná funkce `oplasteniPasyMeze` (`src/engine.js`) pro
  výpočet i obsah výjimky (horní hrana zdvih + přejezd, ořez, pás nulové
  výšky vypadne). Obsah pásu = `[stěna, i, název, sazba, odM, doM po ořezu,
  délka stěny]`; změna zdvihu, přejezdu, šířky nebo hloubky, která pás mění,
  vrátí výjimku do „čeká znovu“ (zámek 403). Karta Cenové výjimky ukazuje
  u pásu i **plochu v m² z výpočtu jádra** (`vyjimkyPasyPlochy`,
  `vyjimkyPasPlocha`) — podklad pro B165. Karta je jen česky (není
  přeložená). Výjimky s pásem „jiné“ schválené dřív se schvalují znovu.
- **B179 opraveno — příznak „cena dle nabídky“ jen u příplatků a nikdy
  z ceníku varianty.** `cenikDleNabidkySmi` pustí jen `C.priplatky.*`
  (očista mapy na serveru i v prohlížeči, `cenikDleNabidkyJe` — příznak
  u montáže ve starší platné verzi nic nepovolí). Mapa pro zveřejnění =
  `cenikDleNabidkyProZverejneni(platný ceník, změny správce v relaci)`;
  `progKontext` i sloupec Nastavení → Ceník (zaškrtávátko jen u příplatků)
  ceník varianty nečtou. Návrh osmi položek (S13) a rozpis B180 drží.
- **Testy (pojistka):** `src/test_vyjimky.js` proti v17.10.1 10 FAIL + pád,
  po opravě 88/0; `netlify/test_vyjimky.mjs` 61/4 → 65/0;
  `src/test_cena_dle_nabidky.js` B179 část proti v17.10.1 padá, po opravě
  62/0; `netlify/test_cena_dle_nabidky.mjs` 19/0 (pokus N2: platná mapa bez
  montáže, montáž 1 Kč/h + zámek 403; proti v17.10.1 16/3). Mutace
  (`netlify/mutace.mjs`): B155 3/3 (upravené na nový kód), B178 5/5,
  B179 5/5, upravené starší „výjimky:“ 2/2; `--kontrola` server 491 úseků,
  jádro 219. Harnessy `overit_schvalovani` (smyšlené rozměry šachty — pás se
  ořezává na zdvih + přejezd) 68/0 a `overit_cena_dle_nabidky` (nové chování
  sloupce) 21/0. Smoke s buildem 258 prošlo / 0 selhalo / 6 přeskočeno
  (firemní podklady, test.js).
- Dokumentace: audit kola 26 (B178, B179 opraveno, B182 uzavřeno),
  `BEZPECNOST_MEZE.md` (zbytek B178: světlíky a vnější rozměr stěny; B181),
  roadmapa #424 hotovo, příručka kap. 17 a 19, Co je nového v17.10.4.

## v17.10.3 — můstky: upozornění na přechodové plechy (větev claude/a2-mustky)

Dávka A2 (zadání koordinace „ŘÍDÍCÍ 16.10“, plán víkendu), nad
`origin/claude/integrace-16-10` (e2c773a, v16.10.5). Rozhodnutí J. V.
16. 10. 2026 k roadmapě #355 a #356.

- **#355 hotovo — přechodové plechy u můstků jen upozorní:** výpočet beze
  změny. Nové pravidlo kontrol před nabídkou `mustkyPrechodove`: má-li
  šachta můstky a přechodové plechy jsou v základní ceně nebo v příplatcích
  nabídky, řekne počet můstků, počet nástupišť a které řádky (materiál /
  montáž) se za všechna nástupiště počítají — ať obchodník zváží ruční
  úpravu. Upozornění, ne zábrana (tisk CZ/EN/DE/FR nezastaví); příplatky
  vynechané z nabídky se nehlásí. `src/test_mustky.js` 34/8 → 42/0.
- **#356 do kódu NEJDE (J. V. 17. 10.: „toto přeskoč a připrav mi na pondělí
  detailní vizuální návrh variant“).** Implementace doporučené kombinace byla
  v commitu 75f9fd1 a je revertovaná; kód zůstává ve větvi
  `claude/a2-356-navrh` (nesloučí se). Vizuální návrh variant (a)–(e) pro
  J. V. na 19. 10.: https://claude.ai/artifact/9nMGAMnggiVEByuZoty9Qt
- Kontroly mají 36 pravidel (`src/test_kontroly.js`, `overit_lista.mjs`).
- Mutace jádra +3 (#355), cílený běh chycených 3/3 (v běhu 8/8 i s #356).
- Příručka: kapitola 11 (můstky) a „Co je nového ve verzi v17.10.3“;
  roadmapa #355 → hotovo, #356 → čeká (návrh na 19. 10.).

## v17.10.2 — návrh čísla SoD a zámek po tisku SoD (větev claude/v1-cislo-sod)

Dávka V1 (zadání koordinace „ŘÍDÍCÍ 16.10“, plán víkendu, okno O5), nad
`origin/claude/integrace-16-10` (v16.10.5). Roadmapa #366, rozhodnutí
J. V. 16. 10. 2026: „Aplikace navrhne další číslo SoD z řady (podle čísla
nabídky), obchodník může přepsat; tisk SoD zamkne termín, podpisy
a podmínky."

- **Nové — návrh čísla SoD (V1-1):** pole „Číslo SoD“ v krycím listu OCK
  i PROJ se předvyplní z čísla nabídky — kód CN se vymění za SOD
  (`2026 - OPR - CN - 0412` → `2026 - OPR - SOD - 0412`), řada, oddělovače
  i přípona varianty (.2) zůstávají; starší číslo bez CN dostane SOD před
  pořadí, zakázka bez čísla návrh nedostane (`sodCisloNavrh`,
  `src/zakazka.js`). Zdroj „návrh z čísla nabídky“, ruční přepis má
  přednost, ↺ vrátí návrh. Návrh plní `{{SOD_CISLO_SMLOUVY}}`. Řada SoD se
  na serveru nevede — unikátnost nese číslo nabídky (kontrola duplicit
  a server).
- **Opraveno — zámek po tisku SoD (V1-2):** termíny, podpisy a podmínky už
  zámek SoD zamykal; datum podpisu smlouvy (předvyplněné dneškem, při
  odeslání nabídky se záměrně nezmrazuje) se ale po tisku smlouvy dál
  posouvalo a návrh čísla SoD by se měnil s číslem nabídky. První tisk
  smlouvy teď obojí (a číslo SoD projekce) zapíše do zakázky
  (`zamekPrvniSmlouva`, `kryciZmrazSod`, `kryciProjZmrazSod`); dotisk nic
  nepřepíše, plná moc zůstává volná (B163).
- **Příručka a texty:** kapitola 24 (Číslo SoD), „Co je nového“ v17.10.2,
  roadmapa #366 hotovo. EN/DE/FR: aplikace UI nepřekládá a číslo SoD je
  v dokumentech evidenční kód (`prekladNeutral`, test) — nic k překladu.
- **Testy:** nový `src/test_cislo_sod_navrh.js` (před opravou 2/24, po
  bodu 1 26/0, s bodem 2 53/0; před bodem 2 43/10), upravené
  `test_kryci_cislo_sod` (25/3 → 28/0), `test_sod` (50/0),
  `test_sod_proj_cislo` (24/0), `overit_kryci_cislo_sod` (28/0),
  `overit_sod_proj_cislo` (6/0), `overit_sod` (návrh místo symbolu;
  bez firemních šablon přeskočen). Mutace #366 10/10 (jedna ekvivalentní
  vyřazena), S7 s novými kotvami 5/5.
  Smoke (bez KNG_PODKLADY): 258 / 1 / 6 — jediné selhání `overit_verzi.mjs`,
  protože běh měl v prostředí `KNG_NEZVYSOVAT_VERZI=1`; samostatně 7/0,
  tedy 259 / 0 / 6 (265 sad). Kontrola údajů čistá, verze odpovídá dni.

---

## v17.10.1 — testovací kolo 26 a bezpečnostní audit změn od v15.10.14 (větev claude/kolo26-audit)

Dávka N2 (zadání koordinace „ŘÍDÍCÍ 16.10“, okno O4), nad
`origin/claude/integrace-16-10` (`e2c773a`, v16.10.5). Audit:
`podklady/AUDIT_2026-10-17_v16.10.5.md`, pokusy `podklady/AUDIT26_pokus_*.mjs`.
Celé kolo s mutacemi nad `e2c773a` pouští koordinace.

- **Výsledek auditu:** 0 kritických, 0 vysokých, **2 střední** (B178, B179),
  1 nízký (B180, opraven), 2 informativní (B181, B182). Regrese B151–B167: 0.
  Escapování vlastních řádků specifikace a lešení do Wordu drží (pokus 9/0),
  příznak „cena dle nabídky“ si zakázka sama nepodstrčí, B158/B159/B160/B163
  opravené správně.
- **B178 (střední, OTEVŘENO):** schválený pás „jiné“ až nahoru se zvětší
  zvýšením zdvihu — obsah výjimky nese zadané meze, ne horní hranu stěny
  (pokus: zdvih 9 → 40 m, plocha 26×, zámek 200). Návrh v auditu, oprava O6.
- **B179 (střední, OTEVŘENO):** příznak „cena dle nabídky“ jde do platného
  ceníku z ceníku otevřené varianty a očista pustí každou číselnou cestu OCK
  (pokus: mapa obchodníka → zveřejnění správce → montáž za 1 Kč/h bez
  schválení 200). Návrh v auditu, oprava O6.
- **B180 opraveno — rozpis zveřejnění ceníku ukazuje změny příznaků:**
  `cenikDleNabidkyRozpis` (`src/cenik.js`), `progZverejniRozpis`
  (`src/ui/program_ui.js`) ho připojí; „Ceník beze změny“ jen bez změny
  příznaků. Test `src/test_cena_dle_nabidky.js` +10 (i spuštění funkce
  dialogu vytažené ze zdroje): proti `e2c773a` 41/10, po opravě 51/0.
  Mutace B180 3 z 3 (`netlify/mutace.mjs`, `--kontrola` 481 úseků).
- **Cílené sady (před opravou):** test_vyjimky 59/0, test_cena_dle_nabidky
  (server) 13/0, test_kryci_po_tisku 18/0, test_pd_pristup 54/0, test_prava
  851/0; src: cena_dle_nabidky 41/0, vyjimky 76/0, leseni_specifikace 45/0,
  techspec_vlastni_radky 22/0, slovnik 89/0, kryci_po_tisku 103/0, escape
  37/0; harnessy overit_cena_dle_nabidky 21/0, overit_leseni_spec 15/0,
  overit_xss 370/0. Statické kontroly beze změny (onclick 24, innerHTML 75,
  tajemství 91, `kontrola_udaju.py` čistá).
- Roadmapa #424 (předběžné id).

## v16.10.5 — kontrola rozhodnutí 15.–16. 10. (větev claude/v4-kontrola-rozhodnuti)

Dávka V4 (zadání koordinace „ŘÍDÍCÍ 16.10“, plán víkendu), nad
`origin/claude/integrace-16-10` (= test v15.10.14). Ověřeno, že rozhodnutí
J. V. z 15.–16. 10. 2026 jsou v kódu, příručce a překladech EN/DE/FR;
výsledek v `podklady/KONTROLA_ROZHODNUTI_16_10.md` (18 rozhodnutí 15. 10.,
6 rozhodnutí 16. 10. v roadmapě, nálezy V4-1 až V4-5). Změny chování žádné.

- **V4-1 opraveno — rekapitulace nabídky PROJ v EN/DE/FR:** názvy sekcí
  „EZC – EKONOMICKÁ ZADÁVACÍ ČÁST (celý projekt)“ a „KOLAUDACE (pro 1 ks
  výtahu)“ slovník neznal, takže zůstávaly česky. Doplněna dvě hesla do
  `src/preklad.js` — **NÁVRH PŘEKLADU, čeká na kontrolu J. V.** Test
  `src/test_proj_zbytky_preklad.js` +4: před opravou 70/3, po ní 73/0.
- **V4-2 opraveno — roadmapa:** rozhodnutí 16. 10. tam chyběla. #355
  (výpočet beze změny, jen upozornit; dřív `hotovoKdyz` s opačným
  výpočtem), #356 (plochu připočítat), #366 (návrh čísla SoD z řady),
  #157 (překlad české šablony místo právníka), B165 v #420, #367 odklad
  na 19. 10.; u #355 a #356 odebráno `cekaNa`.
- **V4-3 opraveno — příručka:** do „Co je nového“ doplněny P12 (správce
  může skrýt nákladové sazby PROJ, pak prodejní sazba) a čekání červené
  lišty při startu. Verze a nadpis novinek v příručce ponechány
  (sjednotí integrace).
- **Nálezy bez opravy:** V4-4 — popis B158 v auditu kola 25 tvrdí
  „výchozí stav ne“, od B80 (v15.10.7) má právo `crm.pipedrive` každý,
  dopad B158 je tedy na všechny účty (předáno dávce A1). V4-5 — registr
  dokumentů nese u krycího listu OCK `nazev` „Krycí list – …“ (nikde se
  nezobrazuje).
- **Testy:** `./spust_testy.sh --smoke` (bez KNG_PODKLADY) 251 prošlo /
  1 selhalo / 6 přeskočeno — selhání `test_release_odkaz.js` jen proto, že
  CHANGELOG ještě neměl tento oddíl; po zápisu sada OK, tedy 252 / 0 / 6.
  Cílené mutace nespuštěny (nová kontrola hlídá data slovníku, sady PROJ
  překladů nejsou v `SADY`). `kontrola_udaju.py` čistá,
  `roadmapa.py --kontrola` čistá.

## v16.10.4 — dočištění auditu 25 (větev claude/a1-audit25)

Dávka A1 (koordinace 16. 10. 2026, roadmapa #420), nálezy z
`podklady/AUDIT_2026-10-15_v15.10.6.md`. Postaveno nad test v15.10.14
(`claude/integrace-16-10`).

- **B158 (nízká) — souběh stropu Pipedrive:** čtení a zápis počítadla 30
  čerstvých načtení dealu za hodinu ve výhradním úseku (`vyhradne` v
  `netlify/lib/sdilene.mjs`). 200 souběžných požadavků → nejvýš 30 do
  Pipedrive. Zbytek mezi instancemi funkce v `BEZPECNOST_MEZE.md`.
  `netlify/test_pd_pristup.mjs` 51/3 → 54/0, mutace 2 z 2.
- **B159 (informativní) — Origin „null" a text/plain u zápisů:**
  `prihlaseny()` u zápisu s hlavičkou Origin odmítne `null` a tělo jiného
  typu než JSON (401). Bez Origin (curl, testy) beze změny. Aplikace posílá
  vždy JSON (`onlineApi`), DELETE bez těla dál projde.
  `netlify/test_prava.mjs` 843/6 → 849/0, mutace B159 3 z 3, B17 1 z 1.
- **B160 (informativní) — slovník:** klíče s názvy vlastností
  `Object.prototype` (`hasOwnProperty`, `toString` …) se odmítají na serveru
  i v klientu (`src/slovnik.js`, `src/preklad.js`). `src/test_slovnik.js`
  84/5 → 89/0, `test_prava` +2, mutace 3 z 3.
- **B163 (informativní) — plná moc po SoD:** údaje zmocnitele (`pm*`,
  krycí list PROJ) zůstávají po tisku SoD volné; ostatní zámek SoD beze
  změny. `src/test_kryci_po_tisku.js` 98/5 → 103/0,
  `netlify/test_kryci_po_tisku.mjs` 17/1 → 18/0, mutace 3 z 3 (čtvrtá
  ekvivalentní, vyřazena).
- **B166 (informativní) — harness XSS a CI:** `overit_xss.mjs` hlídá
  `data.cenovaVyjimka`, lištu zámku u aktivní zamčené varianty a žlutou
  lištu #404 se zálohou z localStorage (včetně obnovy). CI má Node
  22.23.2 jako `netlify.toml`.
- **Vědomé meze** v `BEZPECNOST_MEZE.md`: B161 (hlavička odeslané nabídky
  v dotisku), B162a (starší ceníky v online zakázkách), B164 (zámek SoD
  stojí na záznamu tisku od klienta); stav nálezů opraven v auditu
  a roadmapě (#420). B165 čeká na rozhodnutí J. V.
- **Testy:** smoke 252 prošlo / 0 selhalo / 6 přeskočeno (firemní podklady);
  `--kontrola` mutací serveru 460, jádra 205; kontrola údajů čistá. Celé kolo
  pustí koordinace při sloučení.

## v16.10.3 — příznak ceníku „cena dle nabídky" (větev claude/cena-dle-nabidky)

Dávka S13 nad `origin/test` (1cbab3a, v15.10.14). E-mail obchodníka D. S.
15. 10. 2026: příplatek „Prosklená stěna vedle šachty" má v ceníku jen
orientační (přehnanou) cenu; po přepsání na reálnou nižší aplikace hlásila
„Ceník varianty je směs platného ceníku a starších cen (1 položka OCK) —
požádejte o schválení nadřízeného…" a zábrana zablokovala tisk nabídky
(server navíc takovou zakázku odmítl uložit — kontrola ceníku B128).
Řešení J. V. 16. 10. 2026, varianta A.

- **Nový příznak položky ceníku `dleNabidky`** (`src/cenik.js`:
  `cenikDleNabidkyJe/Nastav/Ociste`). Mapa `{ 'C.priplatky.x': true }` stojí
  v ceníku vedle cen jako `popisy`: verzuje se a zveřejňuje s ceníkem, otisk
  verze ji nese (jen neprázdnou — ceník bez příznaků má otisk beze změny,
  `PROG_OTISK_VERZE` zůstává 3), zveřejnění ji očistí na známé číselné cesty
  OCK. Ve výchozím ceníku zaškrtnuto osm nabídkových položek za akci; **starý
  ceník bez mapy = nezaškrtnuto** (`CENIK_NEDOPLNOVAT` + `dleNabidky`).
- **Nastavení → Ceník** (jen správce): sloupec „Cena dle nabídky" se
  zaškrtávátkem u číselných položek OCK, poznámka pod tabulkou.
- **Kalkulace OCK → Příplatky:** štítek „cena dle nabídky", po přepsání
  ceny navíc „vlastní cena" (do tisku nejdou). Orientační cena se dál
  předvyplňuje (výchozí návrh J. V.).
- **Bez výjimky, schválení a zábrany:** položka s příznakem PLATNÉHO ceníku
  do směsi nepatří (`vyjimkyObsah`), server ji v kontrole ceníku pustí
  s libovolnou **nezápornou** cenou (`uloCenikProblemy`), automatický
  přepočet rozdělané zakázky ji nepřepíše (`cenikPrepoctiRozpracovane`),
  schvalovatel ji nevidí. Příznak se bere jen z platného ceníku — mapa
  v ceníku zakázky se neporovnává ani nečte (`ULO_CENIK_VOLNE`), podstrčený
  příznak nic nepovolí. Hranice zapsaná v `BEZPECNOST_MEZE.md` (S13).
- **Konkrétní hláška:** varianta, která počítala z platné verze (razítko),
  s běžnou položkou pod ceníkem dostane „Ventilátor (ext): cena pod ceníkem
  — …požádejte o schválení nadřízeného…"; skutečná směs (starší verze,
  přepočet vybraných položek, vyšší hodnoty) má dál znění o směsi. Obsah
  výjimky ani platnost schválení se nemění.
- **Testy s pojistkou:** `src/test_cena_dle_nabidky.js` proti 1cbab3a
  0 OK / 1 FAIL → 32 / 0; `netlify/test_cena_dle_nabidky.mjs` 6 / 7 → 13 / 0;
  harness `overit_cena_dle_nabidky.mjs` 5 / 9 (reprodukuje hlášku z e-mailu)
  → 14 / 0. Upraveny `test_cenik_uplnost.js` (mapa není cena)
  a `test_ukazkove_znacky.js` (třetí nedoplňovaný klíč).
- **Mutace:** cílené „S13" — serveru **12 z 12** (vyjimky, uloziste B128, cenik_stari, cenik, cenik_rady, program), jádra **2 z 2** (engine.js); `--kontrola` 461 / 207 úseků. Sady `src/test_cena_dle_nabidky.js` a `netlify/test_cena_dle_nabidky.mjs` jsou v `SADY`. `test_escape.js`: záznam PROVERENO pro štítky (35/2 → 37/0).
- `spust_testy.sh --smoke` (v16.10.3, bez KNG_PODKLADY): **255 prošlo / 0 selhalo / 6 přeskočeno**; kontrola údajů čistá.
- Příručka kap. 17 (podkapitola „Cena dle nabídky"), roadmapa #423
  (předběžné číslo — 421 má S11, 422 nechávám S12; přidělí koordinace).

**Výchozí volby (zadání J. V., nic nebylo nejasné natolik, abych se odchýlil):**
příznak jen pro ceník OCK (příplatky jsou v OCK); sloupec vidí jen správce;
štítky vidí každý, kdo vidí řádek; záporná cena se nepouští; prázdná nová
zakázka orientační cenu dostane, rozdělaná si vlastní cenu nechá; id roadmapy
předběžné.

**Doplněk po rozhodnutí J. V. 16. 10. (varianta A + „předzaškrtnuté v UI"):**
ceník, který mapu příznaků vůbec nemá (zveřejněný před v16.10.3), ukáže
v Nastavení → Ceník výchozích osm položek zaškrtnutých jako **návrh** (štítek
„návrh" pod tabulkou); do zveřejnění se aplikace chová podle zadání
(nezaškrtnuto = hlídá), **zveřejnění návrh zapíše** do verze ceníku
(`progKontext` → `cenikDleNabidkyDoplnNavrh`, do kopie — ceník varianty
zůstává). Výslovně prázdná mapa `{}` se zachovává (zveřejní se i uloží) a návrh
se jí už nevnucuje. Model `cenikDleNabidkyMaMapu / Navrh / DoplnNavrh`.
Pojistka: `src/test_cena_dle_nabidky.js` proti 7a43370 31 / 2 → 41 / 0,
harness 18 / 3 → 21 / 0; mutace „S13" serveru **15 z 15** (3 nové: návrh pro ceník bez mapy, zápis návrhu, prázdná mapa), jádra 2 z 2; `--kontrola` 464 / 207; smoke po doplňku **255 / 0 / 6**.

**Po nasazení (J. V. / správce):** v Nastavení → Ceník zkontrolovat
předzaškrtnutý návrh a **zveřejnit ceník** (test i ostrá) — teprve tím
příznaky platí. Zveřejnění samotného příznaku projde (otisk ho nese).

## v16.10.2 — lešení a vlastní řádky technické specifikace v nabídce (větev claude/leseni-spec-radek)

Dávka S12, připomínky obchodníka D. S. z 15. 10. 2026 (e-mail „online
kalkulak"). Nad `origin/test` (1cbab3a, v15.10.14).

- **Bod 2 — lešení v technické specifikaci řízené kalkulací.** Obchodník měl
  v Kalkulaci OCK oba příplatky „LEŠENÍ - vnitřní" i „LEŠENÍ - vnější"
  v nabídce, tabulka SOUČÁSTÍ DODÁVKY NENÍ ale nesla jen „LEŠENÍ KOLEM OCK
  PRO PROVEDENÍ OPLÁŠTĚNÍ" s výchozím „zajistí objednatel v rámci SP"
  (štítek „výchozí") — opak toho, co nabídka nabízí v kapitole II.
  Nový řádek **LEŠENÍ VNITŘNÍ PRO STAVBU OCK** (před lešením kolem OCK) a oba
  řádky se řídí jedinou funkcí `tsLeseniNeniRadek` (techspec.js), obdobou
  `tsSoklRadek`: lešení v základní ceně → řádek se do dokumentu nedává
  (odvozené prázdno, P8/7 — dodávku říká sekce STAVEBNÍ A PŘÍPRAVNÉ PRÁCE);
  příplatek v nabídce → „nabízeno jako příplatek"; příplatek vyřazený ze
  sloupce Nabídka → „zajistí objednatel v rámci SP". Mimo základní cenu je
  text `prefill` (štítek „z kalkulace"), takže ruční přepis (štítek „ručně")
  i ↺ fungují jako u ostatních polí — na rozdíl od soklu, který je celý
  odvozený. Nabídka OCK: zástupce `TS_NENI_LESENI_VNITRNI`, řádek v náhledu
  i tisku; šablony CN v11–v15 symbol nemají, proto **docxgen naklonuje řádek**
  z řádku `{{TS_NENI_LESENI}}` (`docxRadkyNavic`, `volby.radkyNavic`, data
  `tsRadkyNavic` z nabidkaData) s popiskem v jazyce dokumentu; šablona, která
  symbol ponese, dostane hodnotu do svého řádku. Slovník: popisek EN/DE/FR.
  **Výchozí volby (návrh, zapsáno pro J. V.):** znění popisku převzaté od
  obchodníka („LEŠENÍ VNITŘNÍ PRO STAVBU OCK"); u příplatku v nabídce věta
  „nabízeno jako příplatek" jako u soklu (ne „lze doplnit – viz příplatkové
  ceny" z N49); hodnota přidána do číselníku poznámek k dodávce.
  Testy: `src/test_leseni_specifikace.js` před opravou 0 OK / 3 FAIL
  (přerušeno), po ní 45 / 0; `test_specifikace_cena.js` — 7 kontrol starého
  chování (výchozí text u nabízeného příplatku) upraveno na nové, 71 / 0.
  Mutace jádra „LEŠ 16. 10." 8 z 8. Harness `overit_leseni_spec.mjs` (bod 2
  obrazovka, náhled, tisk; Word CN v11, v13, v14, v15 CZ/EN/DE/FR).
- **Bod 3 — vlastní řádek specifikace se nepropsal do CN.** Příčina:
  `nabidkaData` četla jen pevná pole `TECHSPEC_DEF`; `techspec.extra`
  (tlačítko „+ přidat vlastní řádek", na obrazovce pod nadpisem DALŠÍ
  UJEDNÁNÍ) nečetl nikdo — ani online náhled a tisk (`nabidkaNahledSekce`),
  ani Word (šablona pro ně symbol nemá). Nově `nabidkaData` vrací `tsExtra`
  (prázdné řádky vynechané, popisek i hodnota přes slovník — známé fráze se
  přeloží, vlastní text zůstane, jak ho obchodník napsal) a náhled i tisk CN
  mají sekci **DALŠÍ UJEDNÁNÍ** hned za SOUČÁSTÍ DODÁVKY NENÍ (4. parametr
  `nabidkaNahledSekce`). Ve Wordu se za řádek `{{TS_NENI_PRISTUP}}`
  naklonuje sekční pruh (vzor = pruh SOUČÁSTÍ DODÁVKY NENÍ, převezme
  stínování i sloučení buněk) a řádky; text jde přes `xmlEsc` a `{` jako
  entita (B122), takže `{{…}}` z textu obchodníka se nerozvine. „DALŠÍ
  UJEDNÁNÍ" je v `TS_SEKCE_NAZVY`, aby prázdná sekce nad ním zmizela.
  Slovník: „DALŠÍ UJEDNÁNÍ" EN/DE/FR. **Výchozí volba:** sekce v nabídce se
  jmenuje stejně jako na obrazovce specifikace a stojí za SOUČÁSTÍ DODÁVKY
  NENÍ (před cenou); krycí list ani smlouva se nemění.
  Testy: `src/test_techspec_vlastni_radky.js` před opravou 3 OK / 16 FAIL,
  po ní 22 / 0; `test_platby_ock.js` — textová kontrola volání náhledu
  připouští nový parametr. Mutace jádra „VLR 16. 10." 4 z 4 — první běh
  3 z 4: escapování `{` v POPISKU klonovaného řádku žádný test nezkoušel
  (jen v hodnotě), doplněn test, po něm 1 z 1. Harness
  `overit_leseni_spec.mjs` před opravou bodu 3 24 / 12, po ní 36 / 0
  (Word CN v11, v13, v14, v15 CZ/EN/DE/FR se šablonami z Disku).
  Příručka: kapitola 17 (lešení), 23 (vlastní řádky), „Co je nového".

## v16.10.1 — B155: rozsah pásu „jiné" v obsahu schválené výjimky a v kartě (větev claude/b155-rozsah-pasu)

Dávka S11 nad `test` (1cbab3a, v15.10.14). Rozhodnutí J. V. 16. 10. 2026:
B155 se znovu otevírá a opraví se úzce — do obsahu cenové výjimky přibyl jen
rozsah pásu, schvalovatel ho vidí v kartě. Částky a princip čtyř očí (B165)
do dávky nepatří.

- **Obsah výjimky (`src/vyjimky.js`):** `vyjimkyPasyJine` vrací u pásu
  „jiné" pod ceníkovou sazbou i `odM` (začátek stěny u prvního pásu, jinak
  horní mez předchozího pásu) a `doM` (`null` = až nahoru; u posledního pásu
  vždy `null`, jádro jeho mez nečte). Čísla jako jádro (`+x || 0`): „1" a 1
  dají týž obsah, nečitelný zápis je 0. Obsah `p` = `[stěna, i, název,
  sazba, odM, doM]`. Server i prohlížeč volají tutéž funkci
  (`vyjimkyZamekProblem`, `vyjimkyObsahStran`, karta). Schválený pás 0–1 m
  roztažený na celou stěnu, posunutý na 0–3 m, nebo posun začátku stěny →
  zámek 403, kategorie „čeká znovu"; totéž u dotisku nové strany (B153).
- **Karta výjimek (`src/ui/schvalovani_ui.js`):** „stěna B (Deska, 0–1 m)",
  „stěna B (Deska, od 2,2 m až nahoru)"; desetinná čárka, záporný začátek se
  znaménkem, vše přes `esc()` (`vyjimkyPasRozsah`). `vyjimkyText` pásy
  nevypisuje (jen počet), beze změny.
- **⚠ Zneplatněná schválení:** rozhodnutí o výjimkách **s pásem „jiné"**
  vydaná před v16.10.1 mají jiný obsah → kategorie **„čeká znovu"**, je
  potřeba je **schválit znovu** (jako u B154). Výjimky jen se směsí ceníku
  (bez pásů) se nemění — ověřeno testem (obsah totožný s v15.10.14).
- **Testy:** `src/test_vyjimky.js` 62 → 76 OK (rozsah v obsahu, roztažení,
  posun začátku, posun meze ceníkového pásu pod „jiné", „1" × 1, nečitelná
  mez, výjimka jen se směsí, karta), `netlify/test_vyjimky.mjs` 46 → 59 OK
  (403 po roztažení / posunu / posunu začátku, 200 beze změny se zápisem
  „1", dotisk B153 s roztaženým pásem 403 a beze změny 200). Pojistka:
  proti v15.10.14 padá 10 testů modelu a 4 serverové.
- **Mutace:** nové „B155: obsah výjimky nenese rozsah pásu", „B155: začátek
  pásu vždy ze stěny, ne z předchozího pásu", „B155: karta výjimek rozsah
  pásu neukáže" — chycené 3 z 3; kotvy dvou mutací „výjimky:" posunuté na
  nový kód. Pokus `podklady/AUDIT25_pokus_B155_rozsah.mjs` po opravě: obsah
  pro `doM = 1` a `doM = null` se liší (shoda false).
- Dokumentace: `BEZPECNOST_MEZE.md` (B155 OPRAVENO v16.10.1), audit
  `podklady/AUDIT_2026-10-15_v15.10.6.md`, roadmapa #421.
- **Ověření dávky:** `./spust_testy.sh` 198 prošlo / 0 selhalo / 1 přeskočeno
  (test.js, není v exportu). Celé `node netlify/mutace.mjs` přerušil po
  288 z 452 dvouhodinový limit úlohy sezení — **288 z 288 chycených**, žádná
  nechycená, mutovaný soubor skript vrátil sám. Cílené: „B155" 3 z 3,
  „výjimky" 22 z 22, **„B31: hesloVerze se obnovou sníží" chycená 1 z 1**
  (`test_obnova.mjs`: 2 selhalo — oddíl odhlášení z v15.10.14; hlášení
  kola 25 jako B178 platí pro stav před v15.10.14). Celé kolo pustí koordinace.

## v15.10.14 — rozbor nechycených mutací B8 a B31, doplněné testy (větev claude/mutace-b8-b31)

Dávka S10. Celé kolo nad f8fe243 (v15.10.13): mutace serveru 447 z 449,
nechycené „B8: klíč času zakázky se bere, jak přijde" a „B31: hesloVerze se
obnovou sníží". U obou jde o **díru v testu**, ne v kódu a ne o ekvivalentní
mutaci — kód aplikace se nemění, kotvy v `MUTACE` zůstávají.

- **B8 (nechycená od 923ed48, B151):** test v `netlify/test_prava.mjs` dával
  do rejstříku zakázku se jménem souboru „x-fetch.json", na které se cizí
  tvar převedl. Od B151 se číslo porovnává s rejstříkem přesně, takže cizí
  tvar odmítl už rejstřík a tvarovou kontrolu nikdo nezkoušel. Číslo nabídky
  je ale volný text do 60 znaků (`CISLO_MAX`): zakázka s číslem
  „x');fetch('/')" uložit jde, rejstřík ji nese, a pak tvar hlídá jen B8.
  Test teď do rejstříku dává zakázku přesně s cizím číslem. Mutace 0 z 1 → 1 z 1.
- **B31 (nechycená od 91d6093, B93):** jediný test B31 měnil po otisku heslo;
  B93 pak verzi nastaví na `vz + 1` a mutovaný řádek přepíše. Verzi hesla ale
  zvedá i odhlášení (B6) bez změny hesla — obnova z otisku pořízeného před
  odhlášením by verzi snížila a odvolaná cookie by ožila. Nový oddíl
  v `netlify/test_obnova.mjs` (otisk → přihlášení → odhlášení → obnova
  „přepsat" → verze drží, cookie 401): sada 226 → 232 OK / 0 FAIL (ve zprávě
  commitu 6d9ecdb omylem „225"). Mutace 0 z 1 → 1 z 1.
- Cílené mutace: „B8" 15 z 15 (z toho „B8: klíč času" 1 z 1), „B31" 1 z 1,
  „B151" 1 z 1, „B93" 1 z 1; `--kontrola` 449 úseků; kontrola údajů čistá.
- `spust_testy.sh --smoke` (Playwright z globálních modulů, bez KNG_PODKLADY):
  251 prošlo / 1 selhalo / 6 přeskočeno — selhání `test_release_odkaz.js`
  („popis aktuální verze ze skutečného CHANGELOG") jen proto, že běh začal
  dřív, než CHANGELOG dostal oddíl v15.10.14; po jeho zapsání sada 24/0,
  tedy čistý stav 252 / 0 / 6.

**Integrace do test a celé kolo (koordinační sezení, 16. 10. 2026):** S10
sloučena bez konfliktu (d0e6cab); cílené mutace „B8“ 15/15, „B31“ 1/1.
**Celé kolo s mutacemi nad d0e6cab (16. 10. 01:47–05:05, 198 min): VŠE ZELENÉ**
— sady 257/0/1 (přeskočen test.js), mutace jádra **205 z 205**, mutace serveru
**449 z 449**, statické kontroly 3/3. (První běh přerušil v 01:05 restart
kontejneru; druhý padl na mutaci, kterou přerušený běh nechal v pracovní kopii
— kopie vrácena `git checkout`, kód beze změny.) Fast-forward do `test`.

## v15.10.13 — integrace S9 (číslo SoD v šablonách SoD projekce, v15.10.11) do test (větev claude/integrace-15-10)

`test` už nese v15.10.12, proto sloučení S9 (oddíl v15.10.11 níž) dostává
nové číslo. Kód aplikace S9 nemění (Číslo SoD plní `{{SOD_CISLO_SMLOUVY}}`
od v15.10.9); přidává `nastroje/vyrob_sablony.js --sod-proj-cislo`, testy,
harness a postup `podklady/POSTUP_SABLONY_SOD_15_10.md`.

**Integrace do test (koordinační sezení, 15. 10. 2026):** konflikty jen
v CHANGELOG a `verze.txt`; `test_sod_proj_cislo` 24/0, `--kontrola` mutací
serveru 449 úseků, jádra 205. Šablony v3 a v1_cislo nástrojem vyrobeny nad
šablonami z Disku a ověřeny (testzip, symbol přítomen); na Disk a do aplikace
je nahrává J. V. (postup v podkladech). Sady `spust_testy.sh --smoke`
s 30 šablonami z Disku nad 6c11e14: **257 prošlo / 0 selhalo / 1 přeskočeno**
(test.js). Fast-forward do `test`.

**Celé kolo s mutacemi nad `test` f8fe243 (15. 10. 16:20–20:02, 222 min):**
sady 257/0/1, mutace jádra **205 z 205**, mutace serveru **447 z 449**,
statické kontroly 3/3 → **SELHALO**. Nechycené: **B8** (klíč času v analytice;
nechycená od 923ed48 — B151, v15.10.6) a **B31** (hesloVerze při obnově;
nechycená od 91d6093 — B93, v15.10.2). Ověřeno cíleně na 5a42369 / 8f7be40 /
c9289f3. Oprava: dávka S10 (`claude/mutace-b8-b31`, v15.10.14), pak nové kolo.

## v15.10.12 — integrace S6 (B153 + B154, v15.10.8) do test (větev claude/integrace-15-10)

`test` už nese vydanou v15.10.10, proto sloučení S6 (oddíl v15.10.8 níž)
dostává nové číslo; v15.10.11 je přidělená S9 (číslo SoD v šablonách SoD
projekce). Navíc z koordinace: `nastroje/release_odkaz.py` hlídá dvojí vydání
(existující tag → bez odkazu na nový release, `--chybejici`), projektový skill
`.claude/skills/kokpit-koordinace` (živý kokpit dávek, pokyn J. V.).

**Integrace do test (koordinační sezení, 15. 10. 2026):** sloučení S6 bez
konfliktu v kódu; po sloučení `test_vyjimky` 62/0, `netlify/test_vyjimky.mjs`
46/0, `test_kryci_po_tisku` 91/0, `test_release_odkaz` 24/0; `--kontrola`
mutací serveru 445 úseků, jádra 205. Příručka ze snímků pro v15.10.12. Sady
`spust_testy.sh --smoke` s 30 šablonami z Disku nad cb8eb3b: **255 prošlo /
0 selhalo / 1 přeskočeno** (test.js). Fast-forward do `test`.

## v15.10.11 — číslo SoD ve smlouvě o dílo projekce: šablony SoD PROJ se symbolem čísla (větev claude/sod-proj-cislo)

Dávka S9 (zadání koordinace + `podklady/_SPOLECNE_15_10.md` ve větvi
`claude/davky-15-10`), nad `origin/claude/integrace-15-10` (S7 v15.10.9
+ S8 v15.10.10). Zadání J. V. 15. 10. 2026: „Aktualizuj šablony, aby se nám
do nich číslo SoD propisovalo z krycího listu zakázky ve chvíli, kdy tam
bude vyplněné."

- **Odkud aplikace šablony bere:** jen z centrálních šablon na serveru
  (#139, Nastavení → Šablony, typ `sodProj`); repozitář šablony nemá, Disk
  je archiv a podklad pro testy. Postup a ID souborů na Disku:
  `podklady/POSTUP_SABLONY_SOD_15_10.md`.
- **Výroba šablon:** `node nastroje/vyrob_sablony.js --sod-proj-cislo
  <podklady>` (nová funkce `sodProjCislo`) vloží pod nadpis „SMLOUVA O DÍLO /
  na zhotovení projektové dokumentace" řádek „číslo {{SOD_CISLO_SMLOUVY}}"
  stejně jako u realizace — zarovnání a písmo podtitulu, symbol v jednom
  běhu, nic jiného se nemění; kotva musí být právě jedna, jinak chyba.
  `Sablona_SOD_PROJEKCE_v2.docx` → `Sablona_SOD_PROJEKCE_v3.docx`,
  `Sablona_SOD_PROJEKCE.docx` → `Sablona_SOD_PROJEKCE_v1_cislo.docx`.
- **Chování aplikace beze změny:** vyplněné Číslo SoD z krycího listu OCK
  → smlouva OCK, z krycího listu PROJ → smlouva PROJ (od v15.10.9); prázdné
  → `{{SOD_CISLO_SMLOUVY}}` zůstane vidět k doplnění. Příručka beze změny
  (popisuje už cílový stav).
- **NEHOTOVO — soubory na Disku:** stažení přes konektor Google Drive
  skončilo na oprávnění kontejneru (čtení uloženého výsledku konektoru
  zamítnuto; ruční přepis base64 nespolehlivý), takže v3 a v1_cislo
  z firemních šablon nevznikly a na Disk se nenahrály. Udělá J. V. podle
  postupu (nebo další sezení s povoleným čtením) — nic se nehádalo.
- **Výchozí volby:** jméno `_v3` pro v2 s číslem (nejvyšší další verze),
  `_v1_cislo` pro starou řadu s pevnými platbami (aby „v4" neznamenalo
  starší obsah); řádek čísla jako samostatný odstavec pod podtitulem (jako
  realizace), ne v textu nadpisu; `--sod-proj` (v1 → v2) beze změny, aby
  znovu vyrobená v2 seděla se zveřejněnou.
- **Testy (pojistka před → po):** `src/test_sod_proj_cislo.js` (nový)
  0/1 → 24/0 (část se skutečnými šablonami přeskočena — nejsou v
  KNG_PODKLADY); `overit_sod_proj_cislo.mjs` (nový harness: zápis Čísla SoD
  do obou krycích listů, tisk SoD OCK i PROJ) bez `sodProjCislo` spadne,
  po 6/0; `overit_sod.mjs` doplněn o kontroly S9 nad v3 (běží jen se
  šablonami z Disku). Mutace S9 4 v `netlify/mutace.mjs`, sada v `SADY`.

## v15.10.10 — hodiny v krycím listu jen za vlastní stranu (větev claude/hodiny-po-listech)

Dávka S8 (zadání `podklady/PROMPT_hodiny_po_listech.md` + `podklady/_SPOLECNE_15_10.md`
ve větvi `claude/davky-15-10`), nad `origin/claude/integrace-15-10` (9ead7b5).
Zadání J. V. 15. 10. 2026: „V krycím listu zakázky hodinách PROJ a OCK
zobrazuj vždy jen tu část, která patří do konkrétního krycího listu."

- **Změněno (#414):** tabulka **Hodiny z kalkulace** (konec krycího listu,
  verze Backoffice) má jen stranu svého listu: krycí list OCK jen hodiny
  z Kalkulace OCK, krycí list PROJ jen z Kalkulace PROJ; jeden sloupec
  hodnot se záhlavím OCK resp. PROJ. AD („max. 30 h / měsíc", mimo celek)
  jen v listu PROJ. Nahrazuje rozhodnutí v14.10.2 („sloupec jen vedoucí
  strany", druhá strana „—").
- **Vyřazená / uzamčená strana** (P6: číslo OPR → PROJ, číslo OVP → OCK,
  `jenProj` / `jenOck`) — tabulka hodin v jejím listu není vůbec (žádné
  nuly ani pomlčky); počítá se přes `vysledekStrany` → null.
- **Všechny výstupy stejně:** obrazovka (`kryciHodinyBlok`), tiskový náhled
  (`kryciTiskTabulka`), Word (`docxTeloZeSekci` — hranice tabulky se
  záhlavím `>= 2` sloupce, ať záhlaví nezmizí), data `kryciData` /
  `kryciProjData` (BO; Techdata beze změny bez hodin).
- **API:** `kryciHodiny(zak, varianta, jekly, strana)` a
  `kryciHodinySekce(…, verze, strana)` — strana `'ock'` | `'proj'`, jiná
  hodnota → null.
- **Testy:** `src/test_kryci_hodiny.js` přepsán na nové pravidlo (oba listy,
  vyřazená strana OPR / OVP / jenProj / jenOck, Word OCK i PROJ) — před
  opravou 12/22, po 34/0. Nový harness `overit_hodiny_po_listech.mjs`
  (obrazovka + tisk BO obou listů, číslo OPR i OVP, Techdata) — před 6/10,
  po 16/0. `overit_pripominky_14_10.mjs` upraven (17/0).
- **Mutace jádra:** do `JADRA` přibyly `kryci.js` a `kryci_proj.js`;
  HOD 14. 10. přesměrována na novou hranici (`>= 2` → `> 2`), nové HOD
  15. 10. ×3 (list PROJ s hodinami OCK, list OCK s hodinami PROJ, vyřazená
  strana s tabulkou) — 4 z 4 chycené, `--kontrola` 205 úseků.
- **Výchozí volby (k potvrzení J. V.):** u vyřazené strany se tiskový
  náhled jejího listu beztak neotevře (zábrana dokumentu #377) — hodiny
  se v tom případě hlídají jen v datech tisku; řádek „celkem" zůstává
  i u listu s jediným řádkem.

**Integrace do test (koordinační sezení, 15. 10. 2026):** `claude/integrace-15-10`
= v15.10.7 + S7 (v15.10.9, Krycí list zakázky OCK, Číslo SoD) + S8 (v15.10.10,
hodiny v krycím listu jen za vlastní stranu); konflikty jen v dokumentaci
a příručce (novinky v15.10.9 a v15.10.10 v jednom oddílu). Testy krycího listu
po sloučení: `test_kryci` 129/0, `test_kryci_cislo_sod` 28/0, `test_kryci_hodiny`
34/0, `test_kryci_po_tisku` 91/0, `test_kryci_proj_model` 91/0, Word OCK i PROJ OK.
`--kontrola` mutací serveru 439 úseků, jádra 205. Příručka ze snímků pro
v15.10.10. Sady `spust_testy.sh --smoke` s 30 šablonami z Disku: **255 prošlo /
0 selhalo / 1 přeskočeno** (test.js). Fast-forward do `test`.

## v15.10.9 — Krycí list zakázky OCK a pole „Číslo SoD" (větev claude/kryci-cislo-sod)

Dávka S7 (zadání `podklady/PROMPT_kryci_cislo_sod.md` + `podklady/_SPOLECNE_15_10.md`
ve větvi `claude/davky-15-10`), nad `origin/claude/integrace-15-10` (v15.10.6).
Zadání J. V. 15. 10. 2026: „Krycí list objednávky / SoD přejmenuj na Krycí
list zakázky OCK. Pod číslo nabídky přidej i položku a okno Číslo SOD. To
platí jak pro OCK, tak pro PROJ."

- **Přejmenování:** nadpis stránky (`src/ui/kryci_ui.js`), dokumentu
  (`kryciData` → „Krycí list zakázky OCK — Backoffice / Techdata"), registr
  zámku (`ZAMEK_DOKUMENTY.kryci.popis`) a komentáře. Jméno souboru Wordu
  (`KRYCI_LIST_…`) starý název nenese, beze změny.
- **Pole „Číslo SoD"** (`cisloSod`, BO + Tech, ruční, bez předvyplnění)
  v Základních údajích hned pod Číslem nabídky (CN) — `KRYCI_SEKCE`
  i `KRYCI_PROJ_SEKCE`, každý list má své číslo (OCK = SoD realizace,
  PROJ = SoD projekce). Sekce není v nabídce → doplnit jde i po odeslání
  nabídky, zamkne ho tisk SoD. Objeví se ve výstupech krycího listu
  (tisk, Word, BO i Tech).
- **Smlouvy o dílo:** šablony SoD realizace v1 i v2 mají
  `{{SOD_CISLO_SMLOUVY}}` („SMLOUVA O DÍLO … číslo {{SOD_CISLO_SMLOUVY}}")
  — plní se z krycího listu OCK. **Šablony SoD projekce v1 i v2 symbol čísla
  smlouvy nemají** — aplikace pro ně plní tentýž `{{SOD_CISLO_SMLOUVY}}`
  z krycího listu PROJ; **do šablony SoD projekce ho doplní J. V.** (např.
  do nadpisu „SMLOUVA O DÍLO … číslo {{SOD_CISLO_SMLOUVY}}" jako u
  realizace). `vyrob_sablony.js` se neměnil — vložení odstavce do hlavičky
  smlouvy je rozhodnutí o vzhledu. Prázdné pole = symbol zůstane `{{…}}`.
- **Výchozí volby:** symbol PROJ pojmenovaný stejně jako u realizace
  (`SOD_CISLO_SMLOUVY`, ne nový `SOD_CISLO`) — jeden název pro číslo smlouvy
  v obou šablonách; návrh dalšího čísla řady (#366) mimo rozsah.
- **Testy (pojistka před → po):** `src/test_kryci_cislo_sod.js` (nový)
  6/22 → 28/0; `src/test_kryci_po_tisku.js` 89/2 → 91/0;
  `src/test_kryci_proj_docx.js` (společná pole OCK/PROJ) 2 FAIL → 0;
  harness `overit_kryci_cislo_sod.mjs` (nový) 4 ✗ + pád → 21/21.
  Mutace S7 v `netlify/mutace.mjs` (5), sada `../src/test_kryci_cislo_sod.js`
  v `SADY`.
- Příručka (Co je nového v15.10.9, kap. 24), roadmapa #366.

---

## v15.10.8 — B153 + B154: vysoké nálezy auditu kola 25, B155–B157 uzavřeny (větev claude/b153-b154)

Dávka S6 (zadání `podklady/PROMPT_b153_b154.md` + `podklady/_SPOLECNE_15_10.md`
ve větvi `claude/davky-15-10`), nad `origin/claude/integrace-15-10` (9ead7b5,
v15.10.6). Rozhodnutí J. V. 15. 10. 2026: „153 a 154 proveď dle tvého
doporučení; 155 a 156 řešit nebudeme a uzavři." Verze v15.10.8 (v15.10.7
dostala úprava B80 — přečíslováno na pokyn koordinace).

- **B153** (vysoká) — dotisk dokumentu nové strany do odeslané nabídky
  obešel cenovou výjimku a minimální marži: u zakázky „jen projekce" se
  zamkla nabídka PROJ (OCK se neposuzovala), příznak se vypnul a dotisk
  nabídky OCK se směsí ceníku prošel bez schválení. Server
  (`netlify/lib/zakazka_kontrola.mjs`, dotisk za `rozmerDotisk`) teď volá
  `vyjimkyZamekProblem` s `strany` dotištěných dokumentů (potřeba jen z části
  obsahu té strany — `vyjimkyObsahStran`; schválení musí sedět na celý obsah)
  a `schvalovaniMarzeCasti` (nová, vyčleněná ze `schvalovaniServerMarze`) pro
  slevu té strany → 403 „Pokračujte klonem varianty". Prohlížeč: zábrana
  dotisku `vyjimkyDotiskZabrana` (`src/ui/schvalovani_ui.js`, volaná
  z `dokumentZabrana`) se srozumitelnou hláškou. Dokument bez strany
  (technická specifikace) prohlížeč nezastaví.
- **B154** (vysoká) — rozhodnutí o výjimce nese místo 32bitového otisku FNV-1a
  (dal se dvěma znaky v názvu pásu dopočítat) **celý kanonický obsah**
  (`cenovaVyjimka.obsah`: směs s hodnotami + pásy) a porovnává se přesně
  (`vyjimkaPlati`, `vyjimkaKategorie`, `vyjimkaPrepocti`, klíč rozhodnutí,
  server i UI). `vyjimkyFnv` a pole `otisk` zrušeny. **Výchozí volba:
  rozhodnutí bez uloženého obsahu (staré, s otiskem) se berou jako neplatná —
  výjimka se musí schválit znovu** (karta je ukáže jako „čeká"). Rozsah pásu
  (`odM`/`doM`) do obsahu nepřidán (B155). Rejstřík obsah nenese.
- **B155, B156** (střední) — uzavřeny jako vědomé meze, zapsáno
  v `BEZPECNOST_MEZE.md` (cesta zneužití, dopad, rozhodnutí J. V.); stav
  v `podklady/AUDIT_2026-10-15_v15.10.6.md`.
- **B157** (nízká) — uzavřen jako **záměrné chování** (rozhodnutí J. V.
  15. 10. 2026: cizí obchodník smí měnit volná pole krycího listu odeslané
  nabídky; „pokud je to tak dnes nastavené, tak to neměň"). Kód beze změny;
  chování dokládá `netlify/test_kryci_po_tisku.mjs` 14/0 → 16/0 (+2: volné
  pole cizí odeslané nabídky 200 a autor zůstává, pole nabídky 409 — test
  dokládá stávající stav, proto nemá pojistku „před opravou selže").
  Zapsáno v `BEZPECNOST_MEZE.md`, auditu a roadmapě #420.
- **Testy** (pojistka: před opravou / po ní): `src/test_vyjimky.js` 4 FAIL a pád
  (TypeError, chybí obsah) → 62/0 (+22: B154 kolize „Deska㌷홧", staré
  rozhodnutí s otiskem, jeden znak navíc; B153 části obsahu, `vyjimkyZamekProblem`
  se `strany`, zábrana dotisku v prohlížeči ve vm nad `ui/schvalovani_ui.js`);
  `netlify/test_vyjimky.mjs` 41/5 → 46/0 (B153 podle pokusu: bez schválení
  403 a dotisk se nezapíše, administrátor 200, se schválením 200, sleva OCK
  pod minimální marží 403; dřívější test obsahu u žádosti procházel s
  `undefined === undefined`, teď kontroluje neprázdný obsah).
- **Mutace** (`netlify/mutace.mjs`, obě sady už v `SADY`): nové B154 ×2
  (porovnání 32bitovým otiskem FNV, staré rozhodnutí s otiskem platí), B153 ×4
  (dotisk bez výjimky, dotisk bez marže, část obsahu PROJ bere směs OCK,
  zábrana v prohlížeči mlčí); pět „výjimky:" mutací a #341 přepsáno na nové
  řádky. Kotvy 440 + 202. Cílené běhy: „B15" 11/11, „výjimky" 21/21,
  „#341" 2/2, „P6: server posuzuje" 1/1 (35 z 35 chycených).
- `overit_schvalovani.mjs`: žádost výjimky kontroluje `obsah` místo `otisk`
  (68/0).
- Smoke 247 prošlo / 0 selhalo / 6 přeskočeno (šablony z Disku, KNG_PODKLADY
  nedodány). Celé kolo nespuštěno (dělá koordinační sezení).
- Roadmapa #420 (audit kola 25), příručka (kap. 19 a Co je nového).

## v15.10.7 — B80: čtení z Pipedrive zatím všem uživatelům (větev claude/b80-pipedrive)

Rozhodnutí J. V. 15. 10. 2026 k výchozím volbám v15.10.1: „právo čtení
z Pipedrive zatím přidej všem uživatelům, časem to možná v nastavení změním;
strop načítání je OK; cache je ok“. Větev `claude/b80-pipedrive` je znovu
založená nad `origin/test` (8f7be40, v15.10.4), protože v15.10.1 už je celá
v `test`. Číslo v15.10.7 je první volné: v15.10.5 má P12 a v15.10.6 audit
kola 25. Do `test-draft` / `test` / `main` nic.

- `src/zobrazeni.js`: `crm.pipedrive` má výchozí hodnotu *Obchodník ano,
  Vedoucí ano* (dosud ne/ne). Administrátor právo může odebrat v Nastavení
  → Zobrazení. Server se na matici ptá dál (`pdPristup`).
- Potvrzeno beze změny: strop 30 čerstvých načtení detailu za hodinu na
  uživatele (429) a cache detailu 90 s.
- `NASAZENI_NETLIFY.md`, roadmapa #345 (poznámka, `hotovoV`).

**Testy:** `netlify/test_pd_pristup.mjs` přepsaný na nový výchozí stav.
Výchozí matice dává 200 obchodníkovi, vedoucímu i administrátorovi.
Odebrané právo dává 403 a nic se nevolá ven, administrátor má právo vždy.
Před změnou 35 / 16, po změně 51 / 0. `test_prava.mjs` 839 / 0 (Pipedrive
zpět `PRIHLASENY_OK`). `test_pipedrive.mjs` 71 / 0 (bez ručního přidělení).
`src/test_zobrazeni.js` 64 / 0 (`crm.pipedrive` mezi výchozími výjimkami).
Mutace B80 **8 z 8**; mutace výchozí matice je obrácená (bere obchodníkovi
čtení) a chytá ji `test_prava.mjs`. `--kontrola` serveru: 431 úseků.
`spust_testy.sh --smoke` s 30 šablonami z Disku: **251 prošlo / 0 selhalo /
2 přeskočeno** (test.js, overit_manual.mjs).

**Integrace (koordinační sezení, 15. 10. 2026):** `claude/integrace-15-10`
= v15.10.4 + úprava P12 (v15.10.5) + audit kola 25 s B151/B152/B167
(v15.10.6) + B80 (v15.10.7) + zápisy výsledků. Příručka ze snímků pro v15.10.7
(22 snímků). Sady `spust_testy.sh --smoke` nad sloučeným stavem s 30 šablonami
z Disku: **252 prošlo / 0 selhalo / 1 přeskočeno** (test.js); `--kontrola`
mutací serveru 434 úseků, jádra 202. Připraveno k fast-forwardu do `test`.

## v15.10.6 — testovací kolo 25 + bezpečnostní audit (větev claude/kolo25-audit)

Dávka S4 (zadání `podklady/PROMPT_kolo25_audit.md` + `podklady/_SPOLECNE_15_10.md`
ve větvi `claude/davky-15-10`). Audit změn v12.10.2 → v15.10.4 (S1–S5):
`podklady/AUDIT_2026-10-15_v15.10.6.md`, nálezy **B151–B167** (17 nových:
2 vysoké, 2 střední, 4 nízké, 9 informativních), regrese 0. v15.10.5 je
přidělená úpravě P12 (koordinační sezení), proto v15.10.6.

- **Opraveno:**
  - **B151** (nízká) — klíč `cas/` v analytice jen pro číslo zakázky přesně
    podle rejstříku nebo jméno souboru; převod na jméno souboru slil jiné
    zápisy téhož čísla a jeden účet tak zaplnil strop B35
    (`netlify/functions/analytika.mjs`). `test_funkce` 239/1 → 240/0, mutace
    B35 3/3 (kotva upravena), B151 1/1.
  - **B152** (nízká) — ruční hodnoty krycího listu (`kryci.hodnoty`,
    `kryciProj.hodnoty`) jen text, číslo nebo pravda, i u zamčené varianty;
    objekt shodil vykreslení krycího listu i data pro Word
    (`src/uloziste.js` `uloTypyKryci`). `test_kryci_po_tisku` 11/3 → 14/0,
    mutace B152 2/2.
  - **B167** (informativní) — `netlify/test_ucty_informativni.mjs` jde
    spustit i bez `ADMIN_EMAIL` (dynamické importy).
- **Čeká na rozhodnutí J. V. (jen popsáno, návrh v auditu):**
  - **B153 (vysoká)** — dotisk dokumentu nové strany (po vypnutí „jen
    projekce") obejde schválení cenové výjimky a minimální marži; dostupné
    v běžném UI. Pokus `podklady/AUDIT25_pokus_B153_dotisk.mjs`.
  - **B154 (vysoká)** — otisk výjimky (32bitový FNV-1a) jde dvěma znaky
    v názvu pásu dopočítat; schválení přežije snížení sazby. Pokus
    `podklady/AUDIT25_pokus_B154_kolize.mjs`.
  - B155 (střední) otisk bez rozsahu pásu; B156 (střední) souběh čtení
    a zápisu účtu v profilu a odhlášení; B157–B158 nízké; B159–B166
    informativní.
- **Výchozí volby:** B152 nezměněnou starší hodnotu propustí (ať starší
  zakázky jdou uložit); B151 bere obě podoby, které klient posílá (číslo
  z hlavičky, jméno souboru) — ostatní zápisy už klíč nezaloží.
- **Testy:** `./spust_testy.sh --smoke` nad v15.10.6: 247 prošlo / 0 selhalo /
  6 přeskočeno (test.js; 5 harnessů bez šablon z Disku — dávka nemění
  generování dokumentů). Před dávkou nad v15.10.3: 246/0/6. Cílené mutace
  B35 3/3, B151 1/1, B152 2/2; `mutace.mjs --kontrola` 434 úseků.
- **Audit se týkal i S5 (v15.10.4):** bez nálezu, zábrana dokumentů na
  čekání lišty nehledí.

## v15.10.4 — červená lišta „Ceník není nahraný" až po ověření (větev claude/lista-cenik-zpozdeni)

**Integrace do `test` (koordinační sezení, 15. 10.):** do `test` (v15.10.3 = S1
až S3) sloučena tahle větev merge commitem; konflikty jen v CHANGELOG,
PREDAVKA, `verze.txt` a seznamu sad `netlify/mutace.mjs`. Po sloučení
`spust_testy.sh --smoke` s firemními podklady a příručkou v15.10.4 ze snímků:
252 prošlo / 0 selhalo / 1 přeskočeno (test.js); `--kontrola` mutací jádra
202 a serveru 431 úseků. Celé kolo po sloučení oprav z auditu S4.

Zadání J. V. 15. 10. 2026 (dávka S5, `podklady/PROMPT_lista_cenik_zpozdeni.md`
na `claude/davky-15-10`): „pozdrž zobrazení červené lišty při načtení
aplikace o pár vteřin … zobrazit ji až tehdy, když ceník skutečně není
nahraný." Větev nad `origin/test` (5a42369, v14.10.8). Do `test-draft` /
`test` / `main` nic — sloučení a celé kolo dělá koordinační sezení.

- **Lišta při startu čeká**, dokud doběhne první pokus o načtení z online
  databáze (`/api/zdravi` → `/api/ja` → ceník, firma …; úspěch i chyba),
  nejdéle **5 s**. Načetl se ceník → lišta se neukáže vůbec; nenačetl →
  ukáže se hned po zjištění (bez přihlášení / chyba serveru), visí-li
  server, po 5 s. Potom reaguje okamžitě jako dosud (změna ceníku,
  odhlášení).
- **Zábrany dokumentů beze změny** — `dokumentZabrana`, `ukazkoveTiskLista`
  a panel „Ceník není nahraný – dokument nevznikne" platí od první vteřiny,
  i během čekání (ověřeno harnessem vzorkováním à 50 ms).
- Logika `ukazkoveListaRozhodni` / `ukazkoveCekaniTrva` (`src/ukazkove.js`,
  čas a „doběhlo" se předávají zvenčí); stav v jediné proměnné
  `UKAZKOVE_CEKANI { od, dobehlo }` (`src/ui/ukazkove_ui.js`); hradlo jen
  v `renderUkazkoveLista` — obsah lišty (`ukazkoveLista()`) se nemění, takže
  harnessy, které ho čtou přímo, nečekají. Konec čekání hlásí `onlineStart`
  v dalším tiku (po nasazení ceníku a firmy z `onlineTik`), takže nic neblikne.
- Příručka, kapitola 4 „Vidím červenou lištu": odstavec o čekání při startu.

**Výchozí volby (bez dotazu):** nad `file://` se online nic nenačítá, proto
se nečeká vůbec (lišta hned jako dosud; harnessy nad souborem beze změny).
Čeká se jen na první start stránky — „Zkusit znovu" ani přihlášení později
čekání znovu nezapínají. Pojistný časovač 5 s + 50 ms lištu vyhodnotí, i když
nic jiného nepřekreslí.

**Testy:** `src/test_ukazkove.js` +9 (před opravou pád — funkce neexistuje,
po ní 96/0); nový `overit_lista_cekani.mjs` (skutečné serverové funkce,
zdržená / selhávající / visící `GET /api/program`, bez přihlášení,
`file://`): nad v14.10.8 18/5 (lišta v ~0,65 s), po opravě 23/0. Mutace
serveru S5 4 z 4 (`../src/test_ukazkove.js` doplněn do `SADY`).
<!--VYSLEDKY-->
## v15.10.3 — P12: obchodník nevidí náklady (větev claude/p12-naklady)

**Integrace do `test` (koordinační sezení, 15. 10.):** do `test` (v14.10.8
+ P1 schválené překlady) sloučeny S1 `claude/b80-pipedrive` (v15.10.1),
S3 `claude/p12-naklady` (v15.10.3) a S2 `claude/b89-b95` (v15.10.2) merge
commity bez rebase; konflikty jen v CHANGELOG, PREDAVKA, úvodu příručky,
`verze.txt` a seznamu sad `netlify/mutace.mjs` (sady všech tří ponechány).
Po sloučení `spust_testy.sh --smoke` s firemními podklady a příručkou
v15.10.3 ze snímků: 251 prošlo / 0 selhalo / 1 přeskočeno (test.js);
`--kontrola` mutací jádra 202 a serveru 427 úseků. Celé kolo s mutacemi
poběží po sloučení S5 a auditu S4.
**Úprava podle J. V. 15. 10. 2026 odpoledne (platí přednostně před textem níž):**
„prodejní sazbu by obchodník vidět měl; skrývání nákladů by mělo probíhat na
základě nastavení administrátora zobrazit / skrýt … a náklady zatím pro
obchodníky nechat zobrazené s tím, že je administrátor v budoucnu skryje."
- Klíč `naklady.ceniky` má výchozí **všem zapnuto** (Obchodník i Vedoucí) —
  obchodník vidí totéž co ve v14.10.8: nákladovou sazbu, souhrn s náklady,
  celý soubor zakázky, historii ceníku.
- Přepínač zobrazit / skrýt **už existuje**: Nastavení → Zobrazení, skupina
  „Náklady, přirážka a marže", řádek „Nákladové sazby PROJ, ceníky v souboru
  zakázky a historie ceníku", zaškrtávátko zvlášť pro Obchodníka a Vedoucího;
  ukládá se na server (`/api/zobrazeni`) a platí pro všechny účty té role.
  Harness to zkouší přesně touto cestou (`zobrSet` → uloženo → obchodník).
- Po odškrtnutí vidí obchodník místo sloupce „Sazba Kč/h · fix" sloupec
  **„Prodejní sazba Kč/h · cena"**: hodinová sazba × (1 + % sekce), u fixní
  položky cena s přirážkou, u dopravy mimo Prahu příplatek s přirážkou.
  Souhrn jen Sekce / Celkem, soubor bez ceníků, server bez historie (beze změny).
- `kontroly.cisla` zůstává opravené: o částkách v kontrolách rozhoduje to
  zaškrtnutí (výchozí obchodník ne, jako dosud v matici). Pokud má obchodník
  v matici zapnutou lištu marže a má čísla vidět i v kontrolách, je potřeba
  zaškrtnout i „Částky v kontrolách před odesláním".
- Testy nad výsledkem: `src/test_p12_naklady.js` 31 / 0,
  `netlify/test_p12_naklady.mjs` 8 / 3 → 11 / 0, harness 21 / 8 → 29 / 0
  (pojistky nad v14.10.8). Mutace P12 13 z 13; smoke se šablonami z Disku
  248 prošlo / 0 selhalo / 2 přeskočeno (test.js, overit_manual.mjs).

Zadání `podklady/PROMPT_p12_naklady.md` (dávka S3, roadmapa #369), společná
pravidla `podklady/_SPOLECNE_15_10.md`. Z `origin/test` (5a42369, v14.10.8).
Do `test-draft` / `test` / `main` nic — sloučení a celé kolo s mutacemi dělá
koordinační sezení J. V.

**Bod 1 — kde obchodník náklady viděl (stav v14.10.8, výchozí matice):**

| Místo | Co viděl | Teď |
|---|---|---|
| Kalkulace PROJ, sloupec *Sazba Kč/h · fix* | hodinovou sazbu z Ceníku nákladů PROJ a fixní částku z ceníku; vedle ceny šla dopočítat přirážka | bez práva sloupec chybí |
| Kalkulace PROJ, karta *Souhrn projekčních prací* | náklad, přirážku (% i Kč) a dopravu každé sekce | bez práva jen Sekce a Celkem (+ zaokrouhlení) |
| Kalkulace PROJ, řádek dopravy mimo Prahu | částku příplatku (km / 60 × sazba hodiny cesty) | bez práva bez částky |
| Kontroly před odesláním | částky za varováním, pokud měl lištu marže — `kontroly.cisla` nemělo účinek (`kontrolySmiCisla` vrátil odpověď marže) | rozhoduje `kontroly.cisla` |
| *Uložit do souboru (JSON)* | celé ceníky OCK i PROJ v každé variantě | bez práva jen odchylky rozpracované varianty od platného ceníku |
| `GET /api/program` | platný ceník + až 60 starších verzí | bez práva bez historie verzí |
| Kalkulace OCK, KPI, porovnání variant, protokol, lišta marže, záložky ceníků / detailu | už dřív skryté (`sloupce.naklad`, `kpi.marze`, `porovnani.naklad`, `protokol.cisla`, `marze.lista`, `tab.*`) | beze změny |
| Okno přepočtu ceníku (V kalkulaci / Dnes) | otevírá se jen ze záložky Ceník (obchodník ji nemá) | beze změny |

**Bod 2 — výchozí rozsah:**
- **Klíč matice `naklady.ceniky`** („Nákladové sazby PROJ, ceníky v souboru
  zakázky a historie ceníku", skupina Náklady, přirážka a marže). Výchozí
  **Vedoucí ano, Obchodník ne** — vedoucí dnes sazby, celý soubor i historii
  vidí a zadání chování vedoucího měnit zakazuje. Kdo má `sloupce.naklad`,
  vidí sazby vždy (edituje je). Server se ptá týmž klíčem (`ZOBRAZENI_KLIC_NAKLADY`).
- **(a) Kalkulace PROJ** (`src/ui/kalk_proj.js`): bez práva bez sloupce
  Sazba, souhrn jen Sekce / Celkem, doprava bez částky příplatku. Vlastní
  fixní položku obchodník zadává dál — pole se přesunulo do buňky popisu
  s popiskem „vlastní částka před přirážkou".
- **(b) `kontroly.cisla`** (`src/ui/kontroly_ui.js`): obchodník vidí částky
  v kontrolách jen s tímto právem (dřív stačila lišta marže). Vedoucímu
  zůstává i cesta přes lištu marže (beze změny), ruční zviditelnění KPI
  „Marže" administrátorem platí dál pro všechny.
- **(c) Soubor zakázky** (`src/zakazka.js` `zakazkaBezCeniku` /
  `zakazkaCenikDopln`, `StorageAdapter.exportujBezCeniku`, `ulozZakazku`):
  bez práva se u rozpracovaných variant místo ceníku OCK a PROJ uloží
  `cenikVynechan` s odchylkami od platného ceníku (zakázková přirážka a DPH,
  dohodnuté ceny, chybějící klíče); `importZakazka` ceník doplní z platného
  (`cenikDnesniProVariantu`, bez něj ze sestavení) dřív, než proběhnou
  migrace. Se stejným platným ceníkem vznikne přesně původní varianta (otisk
  výpočtu i dat nabídky před/po stejný). Cesty z cizího souboru: jen řetězcové
  klíče, žádné `__proto__` / `constructor` / `prototype`.
- **(d) `GET /api/program`** (`netlify/functions/program.mjs`): bez práva
  `historie: []` a `historieVynechana: <počet>`; platný ceník beze změny,
  úložiště se nemění.
- Výpočet ani dokumenty se nemění: harness porovnává výpočet a data nabídky
  OCK i PROJ téže zakázky u administrátora a obchodníka (bez zpracovatele)
  a po uložení a načtení souboru.

**Výchozí volby (bez dalšího schvalování):** vlastní klíč místo
`sloupce.naklad` (vedoucí se nemění); ve sloupci Sazba obchodník nevidí nic
(ne prodejní sazbu — z hodin a ceny si ji spočítá sám); soubor nese odchylky,
ne nic (jinak by se dohodnuté ceny a zakázková přirážka po načtení ztratily
a cena změnila); zamčené (odeslané) varianty jdou do souboru celé.

**Vědomé meze (varianta C z rozboru se nedělá):** platný ceník dál dostává
každý přihlášený (výpočet běží v prohlížeči) a online zakázky
(`/api/zakazky`) dál nesou ceník v každé variantě i zmrazený výsledek zámku;
soubor nese ceník zamčených variant a protokol změn (s částkami, pokud je
zapsal někdo s právem). Odchylky rozpracované varianty od platného ceníku
(dohodnutá cena) jsou v souboru vidět. Mutace UI (`kalk_proj.js`,
`kontroly_ui.js`, `common.js`) mutační nástroje nepokrývají (hlídá je harness
nad sestavením).

**Testy (pojistky — před opravou / po opravě):**
- `src/test_p12_naklady.js` (nový): nad v14.10.8 3 OK / 2 FAIL a pád na
  chybějící funkci → 31 OK / 0 FAIL.
- `netlify/test_p12_naklady.mjs` (nový): 8 / 3 (S2, S6, S9) → 11 / 0.
- `overit_p12_naklady.mjs` (nový harness, obchodník × administrátor × vedoucí):
  nad sestavením v14.10.8 17 OK / 7 FAIL → 24 OK / 0 FAIL; chování
  administrátora a vedoucího i otisk nabídky prošly už před opravou (záměr).
- `src/test_zobrazeni.js`: zdokumentovaná výjimka výchozí matice 62 / 2 → 64 / 0.
- Mutace serveru: 3 nové na `program.mjs` (P12) + upravená kotva „ceník
  přečte i nepřihlášený" + 10 nových na `src/zakazka.js` a `src/zobrazeni.js`;
  sady `test_p12_naklady.mjs` a `../src/test_p12_naklady.js` v `SADY`.
  `node netlify/mutace.mjs P12`: chycených 13 z 13; „ceník přečte i
  nepřihlášený": 1 z 1. `--kontrola`: server 413 úseků, jádro 202 (jádra
  se dávka nedotkla), kontrola údajů čistá.
- `spust_testy.sh --smoke` bez šablon: 244 prošlo / 0 selhalo / 6 přeskočeno;
  se šablonami z Disku (KNG_PODKLADY, 29 šablon) nad v15.10.3: 248 prošlo /
  0 selhalo / 2 přeskočeno (test.js, overit_manual.mjs — příručka ze snímků
  se v dávce nestavěla).

**Příručka:** kapitola 28 (Co v aplikaci nevidíte a proč) — odstavec o Kalkulaci
PROJ; kapitola 8 — co nese soubor JSON; verze v15.10.3. **Roadmapa:** #369 → hotovo (v15.10.3).

---
## v15.10.1 — B80: rozhraní Pipedrive `/api/pd/*` (větev claude/b80-pipedrive)

Dávka S1 (zadání `podklady/PROMPT_b80_pipedrive.md`, společná pravidla
`podklady/_SPOLECNE_15_10.md`), roadmapa #345 → **hotovo**. Větev nad
`origin/test` (5a42369, v14.10.8). Do `test-draft` / `test` / `main` nic.

**Ověření, že B80 trvá (audit 24. 9., stav „TRVÁ“ v auditu 12. 10. 2026):**
kterýkoli přihlášený účet, tedy i obchodník, mohl ručním požadavkem
(DevTools s vlastní cookie) poslat `GET /api/pd/deal?id=1…N` a s nastaveným
tokenem si odnést celé CRM: objednatele, IČO, jména, e-maily a telefony
kontaktů. Detail se necachoval (deal + organizace + osoba = 6 tokenů za
načtení), takže tatáž smyčka vyčerpala denní limit Pipedrive celé firmě.
Seznam (`pd_dealy`) a mapa polí (`pd_pole`) šly číst také komukoli. Rozhraní
aplikace `/api/pd/*` nevolá.

**Oprava** (`netlify/lib/pipedrive.mjs` `pdPristup` + `pdStropCerstvych`,
`pd_deal.mjs`, `pd_dealy.mjs`, `pd_pole.mjs`, `src/zobrazeni.js`):
- čtení jen s právem z matice zobrazení — nový prvek **`crm.pipedrive`**
  („Čtení obchodních případů z Pipedrive“, skupina Data). Administrátor
  ho má vždy, ostatním ho přidělí v Nastavení → Zobrazení;
- `GET` z cizího původu → 403 (dosud se původ hlídal jen u zápisů);
- detail dealu je 90 s v cache (`pd_cache/deal:<id>`). Čerstvá načtení
  mají strop **30 za hodinu na uživatele** (429), načtení z cache se
  nepočítá;
- číslo případu smí být jen kladné celé číslo do 2^31−1 (dřív prošlo
  `-1`, `1.5`, `1e3` a podobně);
- `NASAZENI_NETLIFY.md`: kdo smí z CRM číst.

**Výchozí volby (bez dotazu, podle zadání):** v matici má `crm.pipedrive`
výchozí hodnotu *Obchodník ne, Vedoucí ne* a návrh *ano*. Odpovídá to dnešku,
protože rozhraní funkce nevolá. Až bude výběr zakázky z CRM v aplikaci,
přidělí právo administrátor. Strop 30 načtení za hodinu a cache 90 s (jako
u seznamu, B19) jsou výchozí návrh.

**Testy:** nová sada `netlify/test_pd_pristup.mjs` (paměťové úložiště,
náhradní `fetch`, žádné volání ven). Před opravou 19 prošlo / 29 selhalo, po
opravě 48 / 0. `test_prava.mjs` 839 / 0: Pipedrive je v matici práv
`JEN_ADMIN`, L27 se zkouší administrátorem a zdrojová kontrola zná
`pdPristup`. `test_pipedrive.mjs` 71 / 0 (obchodníkovi je právo přidělené).
`src/test_zobrazeni.js` 64 / 0. Mutace serveru B80: **8 z 8 chycených**
(právo z matice, překlep klíče matice, výchozí matice, původ, strop
a jeho počítadlo, cache detailu, číslo případu). Sada je přidaná do `SADY`.
`spust_testy.sh --smoke` s 30 šablonami z Disku: **246 prošlo / 0 selhalo /
2 přeskočeno** (test.js, overit_manual.mjs — příručka mezi podklady nebyla).
`--kontrola` mutací: jádro 202, server 408 úseků. Kontrola údajů je čistá.
Celé kolo se nespouštělo (dělá ho koordinační sezení).

**Ostatní body #345** ověřeny v CHANGELOG: B75–B78 v26.9.1, B81 a B83
v13.10.1, B77 v13.10.1 a v13.10.3, zápisová strana B88 v29.9.4 (B112).
Čtecí strana B88 zůstává informativní (`BEZPECNOST_MEZE.md`).
## v15.10.2 — #347 informativní nálezy B89–B95 (větev claude/b89-b95)

Dávka S2 (zadání `podklady/PROMPT_b89_b95.md`, společná pravidla
`podklady/_SPOLECNE_15_10.md`, větev `claude/davky-15-10`). Z `origin/test`
(5a42369, v14.10.8). Do `test-draft` / `test` / `main` nic — sloučení a celé
kolo s mutacemi dělá koordinační sezení. Každý nález B89–B95 (hloubkový test
24. 9. 2026, stav podle auditu 12. 10. 2026) ověřen v kódu a rozhodnut:

- **B89 opraveno** — klíč prvku v analytice zahodí vše od první „(“ do konce;
  do teď končil na první „)“, takže závorka v řetězci nebo vnořené volání
  nechaly zbytek argumentu (název akce, jméno zákazníka) v klíči. Karta
  Nastavení → Analytika a heat mapa už netvrdí „stopa jednotlivce
  neexistuje“ / „čistě anonymní souhrny“ — od 20. 8. / 31. 8. 2026 se
  počítadla, záložky a prvky ukládají i po uživatelích.
- **B90 vědomá mez** — záloha rozpracované zakázky v prohlížeči přežije
  odhlášení: je to pojistka proti ztrátě neuložené práce a odhlášení se na
  ni neptá. J. V. 15. 10. 2026: nezpřísňovat.
- **B91 opraveno dřív** — revize #401 (v12.10.3, a95e1a3): zakázané klíče
  i po normalizaci, rejstřík bez prototypu; `test_slovnik.js`, mutace.
- **B92 opraveno** — převod zakázek po kolegovi už na konci nezapisuje
  starou kopii jeho účtu (souběžná změna hesla nebo role se nevracela).
- **B93 opraveno** — obnova účtů z otisku, která účtu vrací jiné heslo,
  zvedne verzi hesla (dosavadní relace skončí) a dotčené účty vyjmenuje
  v upozornění. Že heslo z doby otisku pak platí, je smysl obnovy (kryje ho
  heslo správce, B77).
- **B94 vědomá mez** — scrypt 2^14 bez parametrů v otisku; postup přechodu
  (formát s parametry, přepočet při přihlášení) v `BEZPECNOST_MEZE.md`;
  J. V. 15. 10. 2026: varianta A — neměnit.
- **B95 opraveno** — jméno bez ostrých závorek při založení účtu, v profilu
  i v razítku zámku a odemčení (`razitkoKdo`, i pro starší účty).

Testy: nová sada `netlify/test_ucty_informativni.mjs` (před opravou 11 / 10,
po ní 21 / 0; v `SADY` mutací), `src/test_analytika.js` +5 (59 / 5 → 64 / 0),
`test_obnova` B31 upraven na novou verzi hesla (226 / 0). Mutace serveru +6
(B89 ×2, B92, B93, B95 ×2), kotvy B3 a B13 přesunuté na `razitkoKdo` — vše
chycené; `--kontrola` serveru 406, jádra 202. Roadmapa #347 hotovo.
**Smoke (`spust_testy.sh --smoke`, šablony z Disku v `KNG_PODKLADY`):** 246 prošlo / 0 selhalo / 2 přeskočeno (`test.js` — není v exportu; `overit_manual.mjs` — příručka ze snímků v podkladech nebyla). Před dávkou (v14.10.8) 246/0/1 i s `overit_manual`; přibyl `overit_lista_cekani.mjs`. Mutace `--kontrola`: server 404 úseků, jádro 202; cíleně `node netlify/mutace.mjs "S5"` 4 z 4. Kontrola údajů čistá. Celé kolo se nespouštělo (dělá koordinační sezení).

## v14.10.8 — zbytky češtiny v nabídce PROJ (větev claude/proj-preklad-zbytky)

**Integrace do `test` (koordinační sezení, 14. 10. večer):** do `test` (v14.10.6
= slovník + krycí list) sloučeny R1 (roadmapa #405, #406), O1
(`claude/kryci-jine-zneni`, v14.10.7) a P1 (tahle větev) merge commity bez
rebase; konflikty jen v CHANGELOG, PREDAVKA, úvodu příručky a `verze.txt`.
Po sloučení `spust_testy.sh --smoke` s firemními podklady a příručkou
v14.10.8 ze snímků: 246 prošlo / 0 selhalo / 1 přeskočeno (test.js);
`--kontrola` mutací jádra 202 a serveru 400 úseků, kontrola údajů čistá.
**Celé kolo nad ee0f6ff (v14.10.8) VŠE ZELENÉ (216 min 32 s):** sady 246
prošlo / 0 selhalo / 1 přeskočeno (test.js), mutace jádra 202 z 202, mutace
serveru 400 z 400, statické kontroly 3 z 3; firemní podklady z Disku
(30 šablon) a příručka v14.10.8 ze snímků. Ověřuje celý noční stav:
v14.10.4 (slovník), v14.10.5 (krycí list), v14.10.6 (integrace), R1,
v14.10.7 (O1) a v14.10.8 (P1).

Zadání `podklady/PROMPT_proj_preklad_zbytky.md` (P1), navazuje na soupis
z v14.10.4. Z `origin/claude/slovnik-14-10` (774f269; `test` sloučený slovník
v době založení ještě neobsahoval). Do `test-draft` / `test` / `main` nic —
rozhodne J. V. Jen řádky, které slovník zná v jiném znění nebo jsou krátké;
souvislá próza `{ cz }` a zápis v OR beze změny.

- **Bod 2 — pojistka.** Nová sada `src/test_proj_zbytky_preklad.js`: online
  nabídka PROJ (výchozí i všechny položky zapnuté, AD nabízený) v EN/DE/FR —
  vyjmenované řádky bez české věty, slovník je zná (`trStav … prelozeno`),
  popis DPZ přeložený pro všech 16 kombinací částí; próza `{ cz }` (úvody
  STUDIE / DPZ / DPS, poznámky pod studií, řádky rozsahu) zůstává česky.
  Před opravou 17/52, po opravě 69/0.
- **Bod 3 — oprava.** Popis ceny DPZ „Zpracování projektu pro DPZ, včetně
  PBŘ, STATIKY a ELEKTRO PROJEKTU" ve slovníku byl, ale `nabidkaProjData`
  skládala větu z dílů (`P('Zpracování projektu pro DPZ')` + `P('včetně')`
  + …) a celou ji nehledala. Nově má celá věta přednost (hledá se přímo
  v `PREKLAD_IDX`, nekompletní kombinace se nehlásí jako chybějící heslo),
  jinak se složí z přeložených dílů; spojka „a" je v `NABIDKA_PROJ_SPOJKA`
  (heslo „a" by `prekladNorm` použil i na samostatné „A"). Slovník: hesla
  podle textu nabídky s překladem beze změny ze šablon PROJ v4/v5 EN/DE/FR —
  CENA NEZAHRNUJE („vyplývajících … péče, a"), IČ „Podání a projednání …
  (Hasičský záchranný sbor, …)" (šablona má větu a závorku zvlášť),
  „V průběhu celého řízení komunikujeme …", „Vyřízení POVOLENÍ ZÁMĚRU (dle
  …)", hvězdička DPZ (bez „*", tisk ji přidává). **Vlastní překlad
  (šablony větu nemají), schválil J. V. 15. 10. 2026** („Návrhy překladu
  schvaluji"): popis ceny DPS „Zpracování
  prováděcí dokumentace, včetně STATICKÉ ČÁSTI a ELEKTRO PROJEKTU", díly
  popisů (Zpracování projektu pro DPZ, Zpracování prováděcí dokumentace,
  včetně, PBŘ, STATIKY, STATICKÉ ČÁSTI, ELEKTRO PROJEKTU, STUDIE OSVITU)
  a štítek části 2 DPZ „Požárně bezpečnostní řešení".
- **Testy:** `spust_testy.sh --smoke` zelené, `kontrola_udaju.py` čistá
  (počty v PREDAVKA). Celé kolo s mutacemi pustí koordinační sezení při
  sloučení.
## v14.10.7 — „jiné znění" v krycím listu respektuje zámek (větev claude/kryci-jine-zneni)

Nález O1 z dávky v14.10.5. Z `test` (v14.10.5, 3538875); v14.10.6 drží
integrace I1.

- **Chyba:** volba „jiné znění…" v rozbalovacím poli krycího listu
  (`klVyber` OCK, `klpVyber` PROJ) mazala ruční hodnotu pole přímo, mimo
  obal zámku. U pole cenové nabídky zamčené varianty (typ smlouvy, záloha,
  splatnost…) tak hodnota tiše zmizela a server pak uložení odmítl
  „Neuloženo: změnila by se data uzamčené (odeslané) nabídky" — obchodník
  nevěděl proč.
- **Oprava:** `klVyber` a `klpVyber` jsou v `ZAMEK_CHRANENE`
  i v `ZAMEK_KRYCI_FUNKCE` (`src/ui/zamek_ui.js`). Pole nabídky zamčené
  varianty teď „jiné znění" zastaví dialogem „Uzamčená varianta" (hodnota
  zůstane, textové pole se nerozbalí); pole mimo nabídku jde jako dřív
  (a zakázku jen ke čtení uvolní stejně jako `klSet`); po tisku SoD se
  nemění nic. Výběr z číselníku (`klpVyber` → `klpSet`) ukáže dialog jen
  jednou — zastaví ho už vnější obal.
- **Testy:** smoke 243/0/2 (přeskočeno `test.js`, `overit_manual.mjs`); `overit_kryci_po_tisku.mjs` 27 kontrol (+11) — nad v14.10.5
  8 selhalo, po opravě 27/27; `overit_lista.mjs` (kontrola obalení) 255/255.
  Ruční mutace obalu: vyřazení z `ZAMEK_CHRANENE` → 8 selhání, vyřazení
  jen z `ZAMEK_KRYCI_FUNKCE` → 2 selhání (obě zabité). Server se nemění.
- Příručka beze změny (popsané chování „pole nabídky zůstávají zamčená"
  teď platí i pro „jiné znění").
## v14.10.6 — integrace do `test`: slovník a zápis v OR (v14.10.4) + krycí list (v14.10.5) (větev claude/integrace-14-10c)

Pokyn J. V. 14. 10. 2026 večer („Ano, slovník sluč … veškeré změny pošli
rovnou do prostředí test"). `test` nesl v14.10.5 (3538875); do něj sloučena
`claude/slovnik-14-10` (v14.10.4) merge commitem bez rebase. Konflikty jen
v CHANGELOG, PREDAVKA, úvodu příručky a `verze.txt`; kód se sloučil
automaticky. Po sloučení: `spust_testy.sh --smoke` s firemními podklady
(příručka v14.10.6 ze snímků) 245 prošlo / 0 selhalo / 1 přeskočeno (test.js),
`--kontrola` mutací jádra 202 a serveru 400 úseků, kontrola údajů čistá. Celé
kolo s mutacemi poběží nad výsledným `test` po sloučení nočních dávek.

## v14.10.5 — krycí list odeslané nabídky se dá doplňovat (větev claude/kryci-odemceny-14-10)

Pokyn J. V. 14. 10. 2026 (se snímkem dialogu „Uzamčená varianta" nad krycím
listem PROJ): „krycí list by nemusel být zamčený vůbec … v době, kdy posílám
CN, se mi nechce vyplňovat všechno do krycího listu. Věci, které nejsou
v cenové nabídce, by mělo být možné v krycím listu upravovat i po vytištění
nabídky. Uprav a pošli do testu." Z `test` (v14.10.3, eff7724); v14.10.4 je
obsazená větví `claude/slovnik-14-10` (nesloučená).

- **Co se po tisku nabídky doplňuje:** všechna pole krycího listu OCK i PROJ
  kromě těch, která jdou do cenové nabídky — OCK sekce Typ smlouvy
  a produktu, Platební podmínky, Termín dodání; PROJ Typ smlouvy, Platební
  podmínky, plán plateb a u starších dat i splátky SoD projekce
  (`sodpPlatba…`, plní platby nabídky bez plánu). Ta zůstávají zamčená
  s dialogem „Uzamčená varianta" jako dřív. Neznámé pole = zamčené.
- **Po tisku smlouvy o dílo** (SoD realizace nebo projekce) je krycí list
  zamčený celý — smlouva jeho pole tiskne a podepisuje se.
- **Zakázka otevřená jen ke čtení** se zápisem do volného pole uvolní
  k ukládání — jen autorovi, vedoucímu a administrátorovi
  (`zamekCteniSmiOdemknout`); cizí obchodník zápis nedostane.
- Nad krycím listem zamčené varianty je poznámka, co se ještě doplňuje.
- **Model** `zamekKryciPoleVolne` / `zamekKryciPoleVNabidce` /
  `zamekKryciOtevreny` / `zamekDataPorovnani` v `src/zamek.js`; obal
  `klSet` / `klReset` / `klpSet` / `klpReset` v `src/ui/zamek_ui.js`.
  **Server** (`netlify/lib/zakazka_kontrola.mjs`) porovnává data zamčené
  varianty bez ručních hodnot volných polí; zámek bere z uložené verze
  (smazání záznamu o tisku SoD klientem nic neodemkne).
- Testy: `src/test_kryci_po_tisku.js` nový — před opravou 0/4, po 89/0;
  `netlify/test_kryci_po_tisku.mjs` nový — před 8/2, po 10/0;
  `overit_kryci_po_tisku.mjs` (prohlížeč) nový — před 9/4 (bez poznámky),
  po 15/0. Mutace serveru: 5 nových („KL 14. 10.") chycené 5 z 5, mutace
  „data uzamčené varianty lze změnit" přesměrovaná na nové porovnání
  (chycená), `--kontrola` 400 úseků; obě nové sady přidány do sad mutací.

## v14.10.4 — slovník a zápis v OR (větev claude/slovnik-14-10)

Rozhodnutí J. V. 14. 10. 2026 k závěrečné zprávě dávky v14.10.2. Z `test`
(v14.10.3, eff7724). Do `test-draft` / `test` / `main` nic — rozhodne J. V.

- **Bod 1 — zápis v obchodním rejstříku se nepřekládá** („zápisy v obchodním
  rejstříku nepřekládej"). Vrácen bod 6 dávky v14.10.2 (d9bedae): vzory
  `PREKLAD_SOUDY` a tři vzory zápisu v `src/preklad.js`, překlad hodnoty
  ve `firmaRadky(f, prekl, lang)` a u symbolu `{{FIRMA_ZAPIS}}`
  v `src/firma.js`, `lang` ve volání z `src/nabidka.js`. Zápis jde do CZ
  i EN/DE/FR nabídky (výpis DODAVATEL, `{{FIRMA_ZAPIS}}` OCK i PROJ) přesně
  tak, jak je zadaný v Nastavení → Firma; popisek řádku se překládá dál.
  Test `src/test_firma_zapis.js` přepsán na nové pravidlo (šest tvarů zápisu
  × CZ/EN/DE/FR × DODAVATEL, OCK, PROJ + slovník) — nad kódem v14.10.3
  19/72, po vrácení 91/0. Mutace: nová kontrola v kódu nevzniká (jen se
  odebírá), novou mutaci proto nepřidávám.
- **Bod 2 — platební podmínky autorského dozoru v EN/DE/FR.** Řádek
  „100 % z celkové ceny za tuto činnost, fakturováno měsíčně" (blok
  PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU, `NABIDKA_PROJ_DEF`) doplněn do slovníku
  (`src/preklad.js`) — znění podle buňky přeložených šablon PROJ v4/v5:
  EN „100 % of the total price for this service, invoiced monthly", DE
  „100 % des Gesamtpreises für diese Leistung, monatlich abgerechnet", FR
  „100 % du prix total de cette prestation, facturé mensuellement". Ve stejném
  bloku AD zůstával česky i odstavec AUTORSKÝ DOZOR (AD) — stál jako `{ cz }`,
  i když ho slovník od překladu šablony PROJ zná; nově se překládá (jako
  poznámky pod TERMÍNY u K18-N95). CZ beze změny. Test
  `src/test_proj_ad_preklad.js` nový (všechny řetězce čtyř bloků AD v EN/DE/FR
  přeložené a bez české diakritiky) — před opravou 7/5, po 12/0. Ostatní
  bloky PROJ, které v EN/DE/FR zůstávají česky, jsou vypsané v PREDAVKA
  (bez opravy, mimo zadání). Mutace: nová kontrola v kódu nevzniká (slovník
  a text), novou mutaci nepřidávám.
- **Bod 3 — výchozí volby dávky v14.10.2 odsouhlaseny** (J. V. 14. 10.: „s tvými
  návrhy souhlasím"): stará data bez volby AD = AD se tiskne; starší
  specifikace s vyplněným názvem akce = ruční přepis; tabulka hodin vyplňuje
  jen sloupec vedoucí strany (P6); AD v tabulce hodin „max. 30 h / měsíc",
  do celku se nepočítá. Zapsáno do PREDAVKA jako rozhodnuté, kód beze změny.

**Celé kolo nad 774f269 VŠE ZELENÉ (223 min 59 s):** sady 242 prošlo /
0 selhalo / 1 přeskočeno (test.js), mutace jádra 202 z 202, mutace serveru
395 z 395, statické kontroly 3 z 3; firemní podklady z Disku (30 šablon)
a příručka v14.10.4 ze snímků. Ověřuje zároveň sloučený stav v14.10.3.

## v14.10.3 — integrace do `test`: připomínky obchodu + K23T-N1 (větev claude/integrace-14-10b)

Pokyn J. V. 14. 10. 2026 („sluč k23-odm-prohluben do test"). `test` nesl
v14.10.2 z `claude/pripominky-14-10` (37cd805); do něj sloučena
`claude/k23-odm-prohluben` (6fe33b2, v14.10.2) merge commitem bez rebase.
Obě větve měly vlastní zelené celé kolo (připomínky: jádro 201/201, server
393/393, sady 241/0/1 po opravě; K23: jádro 194/194, server 395/395, sady
235/0/1). Konflikty jen v CHANGELOG, PREDAVKA, `mutace_jadro.mjs` (nové
mutace obou větví — ponechány všechny, `--kontrola` 202 úseků jádra,
395 serveru) a v úvodu příručky (novinky obou větví pod v14.10.3); kód se
sloučil automaticky. Ověření po sloučení a výsledek viz zápis níž
(celé kolo spustí navazující sezení).

**Kolo bez mutací nad 4bfcb40 VŠE ZELENÉ (15 min 52 s):** sady 241/0/1
(přeskočen jen `test.js`), statické 3 z 3; podklady s příručkou v14.10.3
ze snímků. Celé kolo s mutacemi nad sloučeným stavem pustí sezení
`claude/slovnik-14-10` (zadání `podklady/PROMPT_slovnik_14_10.md`).

## v14.10.2 — připomínky obchodu (větev claude/pripominky-14-10)

Připomínky D. Sikory a J. Laudy, rozhodnutí J. V. 14. 10. 2026. Z `test-draft`
(v14.10.1, 823c61e). Do `test-draft` nic — rozhodne J. V.

- **Bod 1 — autorský dozor (AD) v nabídce PROJ jen když se nabízí.** Volba
  „Nabízet autorský dozor" v kartě Cenová nabídka (PROJ) (`proj.zadani.nabizetAD`);
  nová varianta ji má vypnutou (výchozí NE). Bez AD vypadnou z online nabídky
  bloky ROZŠÍŘENÁ NABÍDKA, AUTORSKÝ DOZOR (AD), MĚSÍČNÍ SAZBA a PLATEBNÍ
  PODMÍNKY AUTORSKÉHO DOZORU a z technického krycího listu PROJ řádek
  „Autorský dozor (AD)". Stará data volbu nemají a tisknou AD jako dřív —
  uložené ani odeslané nabídky se nemění (test otisku). Word: nová šablona
  **PROJ v5** (`node nastroje/vyrob_sablony.js --proj-v5 <podklady>`, vstup
  PROJ v4) obalí blok AD značkami `{{BLOK_AD_ZAC/KON}}` (symbol
  `{{PROJ_CENA_AD_BLOK}}`) a platební podmínky `{{PLATBY_AD_ZAC/KON}}` (nadpis
  `{{PROJ_PLATBY_AD_NADPIS}}`); nadpis ROZŠÍŘENÁ NABÍDKA ve Wordu zůstává (stojí
  pod ním i geodetické zaměření). Starší šablona bez značek tiskne AD dál —
  ohlásí to nové varování `autorskyDozorWordProj`. Šablonu v5 (+ EN/DE/FR)
  nahraje J. V. do aplikace.
  Testy: `src/test_autorsky_dozor.js` nový — před opravou 0/1 (model chybí),
  po opravě 36/0, s KNG_PODKLADY 41/0 (skutečná v4 → v5, text s AD shodný
  s v4); `test_kontroly.js` 138/0 (35 pravidel; před opravou 137/1);
  `test_nabidka_proj.js` a `test_sablona_proj_v4.js` zapínají AD výslovně
  (hlídají jeho bloky). Mutace jádra: 2 nové („AD 14. 10.") chycené 2 z 2,
  `--kontrola` 195 úseků.
- **Bod 2 — název akce v technické specifikaci z hlavičky zakázky.** Výchozí
  název akce specifikace je název akce zakázky (`tsNazevAkce` v `techspec.js`)
  a mění se s hlavičkou; ruční přepis zůstává (štítek „ručně", ↺ vrátí
  převzatý; číselník čtyř textů je nabídka v poli). Cizojazyčný náhled
  převzatý název nepřekládá (vlastní jméno). Data před 14. 10. s vyplněným
  textem specifikace se berou jako ruční přepis — uložené ani odeslané
  specifikace se nemění. Testy: `src/test_techspec_nazev_akce.js` nový —
  před opravou 0/1, po opravě 18/0; `test_techspec.js` (zakázka v hlavičce
  nese název akce) a `test_techspec_sklo.js` (výchozí název z hlavičky)
  upraveny. Mutace jádra: `techspec.js` přidán mezi jádra, 2 nové („NA 14.
  10.") chycené 2 z 2, `--kontrola` 197 úseků.
- **Bod 3 — oplechování soklu prohlubně v technické specifikaci.** Jedna
  společná funkce `tsSoklRadek(r, Z)` (`techspec.js`) pro nabídku OCK
  i technickou specifikaci: sokl v základní ceně → řádek OPLECHOVÁNÍ SOKLU
  PROHLUBNĚ v DOPLŇKOVÝCH KONSTRUKCÍCH („je součástí dodávky"), jinak
  v SOUČÁSTÍ DODÁVKY NENÍ („nabízeno jako příplatek" / „není součástí
  nabídky") — i u vnitřní šachty. Ve specifikaci jsou to odvozená pole
  `sokl` a `neniSokl` (řídí se cenou, ruční přepis se nepoužije); nabídka OCK
  (`TS_SOKL` / `TS_NENI_SOKL`) čte tutéž funkci. Testy:
  `src/test_sokl_specifikace.js` nový — před opravou 0/1, po opravě 21/0
  (čtyři stavy × specifikace = nabídka, EN/DE/FR); `test_nabidka_sokl.js`
  (rozhodnutí čte výsledek přes společnou funkci) a `test_specifikace_cena.js`
  (seznam odvozených polí) upraveny. Mutace jádra: 3 nové („SOKL 14. 10.")
  chycené 3 z 3, `--kontrola` 200 úseků.
- **Bod 6 — zápis v obchodním rejstříku v cizojazyčné nabídce.** Firemní
  údaj („C 123456 vedená u Městského soudu v Praze") se v EN/DE/FR překládá
  vzorem slovníku (`PREKLAD_SOUDY` + tři vzory v `PREKLAD_VZORY`, `preklad.js`):
  „(spisová značka) C … vedená u …", „(zapsaná) v obchodním rejstříku
  vedeném …, oddíl …, vložka …" a „spisová značka C …, Městský soud v Praze";
  rejstříkové soudy Praha + šest krajských. Překládá se ve výpisu DODAVATEL
  nabídky OCK (`firmaRadky(f, prekl, lang)`) i v symbolu `{{FIRMA_ZAPIS}}`
  (nabídka OCK i PROJ); česky beze změny, krycí list beze změny. Jiný tvar
  zůstane česky a slovník ho hlásí jako nepřeložený (nic se nevymýšlí).
  **Návrh překladu čeká na kontrolu J. V.** Testy: `src/test_firma_zapis.js`
  nový — před opravou 5/27, po opravě 32/0. (`preklad.js` ani `firma.js`
  nejsou mezi jádry mutací; nová kontrola nevznikla.)
- **Hodiny z kalkulace v krycích listech (zadání J. V. 14. 10. 2026 během
  dávky; návrh `podklady/NAVRH_HODINY_KRYCI_LIST_2026-10-14.md` odsouhlasen
  s výhradou „desetinná čísla neuváděj, zaokrouhluj").** Na konci krycího
  listu OCK i PROJ, jen verze Backoffice (tisk PDF, Word i obrazovka), jedna
  tabulka se sloupci OCK a PROJ (`kryciHodiny` v `kryci.js`): montáž na
  stavbě (osoby × hodiny), dílna — oplechování (práce), projekce /
  konstrukce, statické posouzení, stavbyvedoucí; PROJ po nabízených
  činnostech s rozpadem na položky, paušální činnosti „paušál (bez hodin)",
  autorský dozor jen když se nabízí („max. 30 h / měsíc", do celku se
  nepočítá); řádek celkem. Jen nabízené položky (vyřazené, nepočítané
  a nulové ne), celé hodiny, řádek i celek ze zaokrouhlených částí.
  Vyřazená strana zakázky (P6 — číslo OPR / OVP) má sloupec „—", obě strany
  jen u zakázky bez čísla. Word krycího listu umí sekci se sloupci
  (`docxTeloZeSekci`). Testy: `src/test_kryci_hodiny.js` nový — před
  opravou 0/1, po opravě 23/0 (čísla varianty A a B návrhu);
  `test_kryci.js` a `test_kryci_proj_model.js` počítají jen pole formuláře.
  Harness `overit_pripominky_14_10.mjs` (body 1–3 a hodiny v prohlížeči)
  16/0. Mutace jádra: 1 nová („HOD 14. 10.", docxgen) chycená 1 z 1,
  `--kontrola` 201 úseků.

**Celé kolo VŠE ZELENÉ.** Kolo nad 1410141 (225 min): mutace jádra 201 z 201,
mutace serveru 393 z 393, statické 3 z 3, sady 238/3/1 — tři selhání
v harnessech: dvojí `id="kryciHodiny"` na stránkách krycích listů
(`overit_program`, `overit_podminky`) a `overit_lista` čekal 34 pravidel
kontrol. Opraveno v 8ffce8f (jen UI a harnessy, soubory jader ani serveru
beze změny); kolo nad 8ffce8f bez mutací: sady 241/0/1 (přeskočen jen
`test.js`), statické 3 z 3. Podklady: kopie s příručkou sestavenou ze snímků
v14.10.2. Převod do `test` na pokyn J. V. 14. 10. 2026.
## v14.10.2 — K23T-N1: opláštěná prohlubeň (P2) nejde uložit (větev claude/k23-odm-prohluben)

Nález 23. kola (test v14.10.1, 14. 10. 2026). Z `test` (823c61e). Do
`test-draft` / `test` / `main` nic — rozhodne J. V. V `main` / ostré chyba
není (B134 z 0af419c tam není); do `main` se B134 nesmí dostat bez téhle opravy.

- **Oprava:** zkratka P2 „Opláštit i prohlubeň" dává stěnám `odM = −prohlubeň`,
  B134 (`uloZaporneVZadani`) ho ale hlídal jako „nesmí být záporné" — zakázka
  nešla uložit (server 400), kontroly hlásily zábranu `zapornaPolozka`
  (kolo 23: C001, C018, C029, C035, C046, C063). Nově smí být `odM` záporné
  až do hloubky prohlubně (`z.prohluben`, tolerance `ULO_ODM_TOL` = 1e-9 jako
  `OPL_PROHLUBEN_TOL`); níž je chyba s vlastní větou „Opláštění stěny X začíná
  níž, než je dno prohlubně" (server i zábrana; ne obecná „záporná částka").
  Bez prohlubně jako dosud; `doM` a `naklad` pásů beze změny.
- **Testy:** `src/test_prohluben_sklo.js` +10 (K23T-N1) — před opravou 5 selhání
  a pád (chybějící `uloPodProhlubniText`), po opravě 42/0;
  `netlify/test_koncova_cena.mjs` +3 — před opravou 107/2, po opravě 110/0.
- **Mutace:** server 2 nové („odM pod dnem prohlubně se nehlídá", „odM se hlídá
  bez ohledu na prohlubeň"), kotva B134 „výška pásu se nehlídá" posunuta na
  větev bez prohlubně (test „odM −0,1 bez prohlubně" ji chytá); jádro 1 nová
  (zábrana s obecnou větou). `--kontrola`: jádro 194, server 395 úseků.

**Celé kolo nad 4717864 VŠE ZELENÉ (223 min 57 s):** sady 235/0/1 (přeskočen jen
`test.js`), mutace jádra 194 z 194, mutace serveru 395 z 395, statické kontroly
3 z 3. Podklady: kopie s příručkou sestavenou ze snímků v14.10.2.

## v14.10.1 — výsledek celého kola nad v13.10.4 (větev claude/integrace-14-10)

Jen zápis výsledku kola a verze — kód je beze změny proti v13.10.4 (b51af9b),
nad kterým kolo běželo. Verze se zvedá, protože zápis vzniká 14. 10. (statická
kontrola: verze = den posledního commitu). Obsah viz oddíl v13.10.4.

**Celé kolo nad b51af9b VŠE ZELENÉ (181 min 43 s):** sady 235/0/1 (přeskočen jen
`test.js`), mutace jádra 193 z 193, mutace serveru 393 z 393, statické
kontroly 3 z 3. Podklady: kopie s příručkou sestavenou ze snímků integrace
(v13.10.4).

## v13.10.4 — integrace nočních dávek 13./14. 10. 2026 (větev claude/integrace-14-10)

Rozhodnutí J. V. z dialogu 13. 10. 2026 („rozběhni přes noc“). Z
`claude/integrace-13-10b` (v13.10.2, 440eebf — kolo zelené), merge commity bez
rebase: `claude/listy-404`, `claude/bezpecnost-noc`,
`claude/vyjimky-schvalovani`, `claude/prirucka-13-10`. Každá nesla v13.10.3 →
integrace v13.10.4.

- **Lišty rozpracované a odeslané zakázky (#404):** jedna žlutá lišta
  Pokračovat v rozpracované kalkulaci / Založit novou kalkulaci jen
  u neodeslané kalkulace; u odeslané bez připomínání; modrý pruh Odemknout
  k úpravám jen pro roli s právem odemknout (administrátor).
- **B35:** záznam času zakázky jen pro zakázku v rejstříku. **B77:** založení
  účtu Administrátor, povýšení na Administrátora, reset hesla a obnova účtů
  z otisku s potvrzením heslem správce.
- **Meze rozměrů:** zdvih, šířka nebo hloubka pod 0,6 m nepustí nový zámek
  ani dokument OCK. **Cenové výjimky do schvalování:** směs ceníku a ruční
  sazba pásu „jiné“ pod mezí u role bez práva ceníku potřebují schválení
  nadřízeného (karta Cenové výjimky v Schvalování).
- **Příručka obchodníka** aktuální (P6, P2, probarvení ceníků, změny hesel
  a schvalování, kurzíva v rendereru), přefocené snímky.

Konflikty: jen `CHANGELOG.md` a `PREDAVKA.md` (zachovány záznamy všech větví);
kód se sloučil automaticky. Kontrola po sloučení: mutace serveru 393 úseků,
jádra 193, sady bez prohlížeče zelené.

## v13.10.3 — lišty rozpracované a odeslané zakázky (#404) (větev claude/listy-404)

Rozhodnutí J. V. 13. 10. 2026 („Ano, jak je navrženo"; jeho slova: „Aktuálně
je v tom chaos. Myslím, že by mohla stačit žlutá lišta … Pokračovat
v rozpracované kalkulaci / Založit novou kalkulaci … jen za předpokladu, že
kalkulace nebyla vytištěna … pro administrátora ponechal možnost Odemknout
k úpravám nabídku, která je už odeslaná (modrý pruh)"). Z integrace v13.10.2.

- **Co je nové:** jediná žlutá lišta **„Rozpracovaná kalkulace <číslo · název>,
  naposledy <kdy>"** nad záložkami s **Pokračovat v rozpracované kalkulaci**
  (odemkne režim jen ke čtení; je-li v prohlížeči novější záloha téže
  zakázky, obnoví ji) a **Založit novou kalkulaci**; **Zahodit zálohu** je
  malý odkaz (a záloha jiné kalkulace se nabídne odkazem, nepřijde se o ni).
  Nahrazuje žlutou lištu zálohy („Obnovit rozpracovanou kalkulaci") i modrou
  „Nabídka je otevřená jen ke čtení… Odemknout k úpravám" nad kalkulacemi
  a ceníky (zamekCteniLista zanikla).
- **Odeslaná nabídka:** žádná žlutá lišta ani nabídka zálohy (záloha téže
  zakázky i záloha odeslané nabídky po startu se tiše uklidí). Jednořádková
  informace „Odeslaná nabídka … (vytištěno …) — needituje se" s **Klonovat
  a pokračovat** / **Založit novou zakázku**; řádky B59 (rozpor ověření)
  a B130 („nejsou u zámku zmrazené") zůstaly. Klon v zakázce jen ke čtení
  okno odemkne, jinak by se neuložil.
- **Modrý pruh „Odemknout k úpravám"** u odeslané nabídky vidí jen role
  s právem `zamek.odemknout` (výchozí: administrátor; vedoucí ne). Je to
  existující zamekOdemkniUI s důvodem a záznamem; odemkne i okno, aby se
  záznam uložil. Obchodník pruh nevidí.
- **Cizí neodeslaná zakázka:** žlutá lišta jen se Založit novou kalkulaci
  a větou, kdo ji založil (B-pravidlo zamekCteniSmiOdemknout beze změny).
- Model: `listaZakazkyRozhodni(zak, zaloha, ja, prava, ctx)` v `src/zamek.js`
  (čistá funkce), `uloZalohaOdeslana` v `uloziste.js`. UI: `renderListaZakazky`,
  `listaPokracujUI`, `listaZalozNovouUI`, `listaObnovJinouUI` v `zamek_ui.js`.
- **Bezpečnost beze změny:** režim čtení dál blokuje zápis i autosave
  (mění se jen, která lišta ho ovládá); server dál odmítá změnu zamčené
  varianty (B3 — overit_online nově zkouší obejití tlačítka obchodníkem).
  Nově: zakázka jen ke čtení se do zálohy v prohlížeči nepíše — po F5 se
  poslední zakázka otevře sama a do teď tím přepsala zálohu s rozdělanou
  prací dřív, než na ni šlo kliknout. P2 (tisk z režimu čtení) beze změny.
- **Výklady (výchozí volby):** „odeslaná" = otevřená (aktivní) varianta
  zamčená tiskem — otevřený klon odeslané varianty je rozpracovaný a žlutou
  lištu má (jinak by nešel odemknout); „Založit novou" v oranžové liště
  zůstalo „Založit novou zakázku" (tlačítko z 8. 9. 2026), ve žluté je
  „Založit novou kalkulaci" podle znění J. V.; zápis do odeslané nabídky
  jen ke čtení nabídne klon (dřív odemknutí okna).
- **Příručka:** kapitola 8 („Otevřená zakázka: rozpracovaná, nebo
  odeslaná"), kapitola 29 a slovníček.

Testy před → po (před = sestavení v13.10.2 / zdroje před opravou):
`src/test_lista_zakazky.js` (nový) 0/1 (model neexistuje) → 46/0;
`overit_zaloha_lista` 6 ✕ + pád → 58/0 (případy 10–14 = body 1–4);
`overit_online` 220/7 → 227/0 (blok 10f obchodník × administrátor proti
serveru); `overit_v23` 26/5 → 31/0; `overit_manual` nad původní příručkou
36/2 → nad příručkou s novým obsahem 38/0.

Výsledek kola (nad 7e19e40, 160 min): **VŠE ZELENÉ** — sady 233 prošlo / 0 selhalo / 1 přeskočeno (test.js), mutace jádra 193/193, mutace serveru 358/358, statické kontroly 3/3.

## v13.10.3 — B35 a B77: měření času jen u existujících zakázek, citlivé akce správce s heslem (větev claude/bezpecnost-noc)

Rozhodnutí J. V. 13. 10. 2026 (obojí „Ano"). Z `claude/integrace-13-10b`
(v13.10.2). Do `test-draft` nic — na pokyn J. V.

- **Co je opravené:**
  - **B35** — strop `ANALYTIKA_MAX_CASU` (5 000 klíčů `cas/`) šel jedním
    účtem zaplnit smyšlenými čísly zakázek a měření času pak skončilo pro
    všechny. Klíč `cas/<číslo>` nově vznikne jen pro zakázku, která je
    v rejstříku zakázek (`_rejstrik`); číslo se převede na jméno souboru
    stejnou funkcí jako při uložení (`uloKlicSouboru`), takže projde
    i „2026 - OPR - CN - 0155" s mezerami. Rejstřík se čte jednou za
    požadavek a jen když přijde nový klíč; existující klíče se přičítají
    dál, strop zůstává druhou pojistkou. Důsledek: čas nově založené
    zakázky se začne zapisovat až od jejího prvního uložení online.
  - **B77** — citlivé akce správce chtějí pole `hesloSpravce` (vlastní heslo
    přihlášeného správce): (a) založení účtu s rolí Administrátor,
    (b) změna role NA Administrátora (snížení ani správce→správce ne),
    (c) reset cizího hesla, (d) obnova části „uzivatele" ze serverového
    otisku (náhled a soubor ne — ze souboru se účty nezapisují, B27).
    Ověření `potvrdHesloSpravce` (lib/sdilene.mjs) má brzdu jako
    `mojeheslo`: pokus se započítá před ověřením, nad limitem adresy 429
    hned, nad limitem e-mailu 429 jen u špatného hesla, správné heslo
    projde vždy a počítadlo vynuluje (#92). Chybějící pole → 401 bez
    započtení pokusu. Odmítnutí nese `kod: 'hesloSpravce'` — aplikace
    (onlineApi) pak NEshazuje přihlášení. B7 (hlavní účet) beze změny:
    reset hlavního účtu vedlejším správcem je 403 i se správným heslem.
  - **UI:** `dotazHeslo` v `src/ui/dialog.js` (pole type=password, prázdné);
    správa účtů se ptá před založením správce, povýšením a resetem hesla,
    obnova před zápisem účtů z otisku. Zrušení dialogu nic nepošle
    a řekne proč, špatné heslo hlásí „Vaše heslo nesouhlasí".
- **Testy před/po:** test_funkce 233/1 → 234/0 (B35, + zkouška stropu
  s existující zakázkou); test_prava 823/14 → 838/0 (blok AUDIT B77,
  matice práv posílá heslo + řádky „založení správce" a „povýšení na
  Administrátora", brzda e-mailu i adresy); test_obnova 222/4 → 226/0;
  test_dialogy 9/1 → 10/0; overit_online 225/0 (založení správce klikem:
  zrušení / špatné / správné heslo, reset hesla klikem, obnova z otisku
  se ptá); overit_dialogy 28/0 (skutečný modál s polem password).
  Mutace: B35 2 nové, B77 8 nových — všechny chycené; --kontrola zelené.
- **Celé kolo VŠE ZELENÉ** (188 min): sady 232 prošlo / 0 selhalo / 1 přeskočena
  (test.js), mutace jádra 193/193, mutace serveru 368/368, statické 3/3.

## v13.10.3 — mez rozměrů 0,6 m a cenové výjimky ve schvalování (větev claude/vyjimky-schvalovani)

Rozhodnutí J. V. 13. 10. 2026 (noční dávka). Větev z `claude/integrace-13-10b`
(v13.10.2, 0512c51).

- **Mez 0,6 m pro zdvih, šířku a hloubku šachty** (J. V.: „Ano pro zdvih
  a šířku i hloubku menší než 0,6 m. ostatní zatím neřeš."). Navazuje na
  B137: `kontrolyRozmery` (`src/kontroly.js`) nově vrací skupinu `male`
  (kladné číslo pod `KONTROLY_ROZMER_MIN_M` = 0,6 m u `zdvih`, `sirka`,
  `hloubka`). Zábrana „rozmery" ji nepustí do dokumentu OCK (věta „Rozměr
  šachty menší než 0,6 m: … — nejspíš překlep"), server ji odmítne jen
  u NOVÉHO ZÁMKU (`uloRozmeryVZadani` s `naZamek`, volá
  `zamekNovyRozmeryProblem`) — rozpracovaná zakázka se uloží dál. Přesně
  0,6 m projde; rozteč, sloupky, nástupiště, čistý vstup beze změny; strana
  vyřazená P6 se neposuzuje (stávající `zakazkaVyrazena`).
  *Výklad (výchozí volba):* kód odmítnutí je 400 jako u ostatních rozměrů
  nového zámku (B137), ne 403 — jde o vadné zadání, ne o právo.
  Testy: `test_koncova_cena.mjs` +7 (před opravou 4 FAIL: tři zámky pod mezí
  vracely 200, zábrana mlčela; po 107/0). Mutace +4 (chycené 4/4).
- **Cenové výjimky ve schvalování** (J. V.: „Ano, směs do schvalování"
  a u pásu „jiné" „Ponechat se schvalováním"). Nový modul `src/vyjimky.js`
  (v sestavení i v jádru serveru) nad schvalováním slev:
  - *Co je výjimka:* (a) ceník varianty se ve sledovaných položkách
    (`cenikSledovane`, bez přirážky a DPH — `CENIK_ZAKAZKOVE`) liší od
    platného ceníku řady varianty; (b) pás opláštění „jiné" (opláštění po
    stěnách, `oplasteni.steny.*.pasy[].naklad`) má ruční sazbu nižší než
    ceníková. Vyřazená strana (P6) se neposuzuje.
  - *Kdo ji potřebuje:* jen role bez práva ceníku té části (`tab.cenik` pro
    OCK a pás, `tab.cenikproj` pro PROJ); administrátor nikdy.
  - *Mechanismus:* razítko `data.cenovaVyjimka` varianty { stav (čeká /
    schváleno / zamítnuto), otisk, počty, žadatel, schvalil/zamitl + e-mail
    + čas, důvod }. Otisk = FNV z cest a hodnot rozdílných položek a pásů pod
    mezí — změna směsi nebo sazby po schválení schválení zruší (kryje obojí
    jedním rozhodnutím). Požádat smí každý, schválit / zamítnout / vrátit
    administrátor a role s právem „Schvalování slevy nad strop role"
    (`sleva.schvalovani`). Jméno, e-mail, čas i otisk razí server
    (`vyjimkyServerKontrola` v `zakazka_kontrola.mjs`, vzor B2/B101/B105);
    bez práva se nové rozhodnutí odmítne (403) a platné uložené se nesmaže
    ani nepřepíše (vrátí se uložené). Odpověď uložení nese výjimku jako
    slevy (prohlížeč si ji převezme — zámek pak nesouhlasí, B105).
  - *Zámek:* nový zámek (tisk = odeslání) varianty, která výjimku potřebuje
    a nemá platné schválení, odmítne server (`vyjimkyZamekProblem`, 403
    „… — odeslat ji smí jen se schválením nadřízeného …") i prohlížeč
    (zábrana `cenovaVyjimka` v `kontroly.js`, dokumenty obou stran).
    Rozpracované uložení beze zámku projde vždy. Klon variantu výjimku
    nepřenáší (`slevaRozhodnutiZahod`).
  - *UI:* záložka Schvalování — nová karta „Cenové výjimky" pod slevami
    (varianta, co se liší — názvy položek a pásů bez částek, stav,
    Požádat / Schválit / Zamítnout / Vrátit). Přehled „Všechny zakázky"
    (`/api/schvalovani`) nese výjimku jen se stavem a POČTEM položek a pásů
    (`vyjimkaRejstrik`, bez otisku a hodnot; klient hlídá pole).
  - *Výklad (výchozí volby):* 1) „směs" = jakýkoli rozdíl sledované
    položky proti platnému ceníku — i celá starší verze (kvitance „ceny jsou
    dohodnuté"), protože i ta jde ven pod platným ceníkem; 2) klíč, který
    platný ceník vůbec nenese, se neposuzuje (hodnotu doplnil import);
    3) mez pásu „jiné" = nejnižší kladná ceníková sazba opláštění, které se
    u šachty nabízí (interiér / exteriér) — co jde vybrat z číselníku bez
    schválení, jde i jako „jiné"; 4) schvaluje tentýž nadřízený jako slevy
    (právo `sleva.schvalovani`, popis v matici doplněn), bez stropu;
    5) dotisk dokumentu do už uloženého zámku se znovu neposuzuje (data
    zamčené varianty se nemění, výjimka se posoudila u nového zámku);
    6) obnova ze zálohy bere záznam jako doklad.
  - Model 1 ani výpočet ceny se nemění (modul jen posuzuje data).
  - Testy: nová sada `netlify/test_vyjimky.mjs` (37; bez serverových
    kontrol 13 FAIL — zámky směsi i pásu bez schválení 200, podvržené
    schválení obchodníka prošlo, razítka z těla), `src/test_vyjimky.js`
    (40 — otisk, směs, pás, potřeba, kategorie, zábrana, klon), harness
    `overit_schvalovani.mjs` oddíl 9 (zábrana, žádost, schválení, změna
    po schválení, pás). Obě sady zařazené do mutací; mutace +21 (chycené 21/21).
- Kolo nad a168f6c: 2 nechycené mutace (#395 V3, B136 — zámek z ceníku
  sestavení odmítne nově i výjimka, testy hlídaly jen 403) a overit_lista
  (33 → 34 pravidel); testy čtou větu V3 (15f6a53).
- **Celé kolo nad 15f6a53 VŠE ZELENÉ** (155 min): sady 234/0/1 (přeskočen
  jen `test.js`), mutace jádra 193/193, serveru 383/383, statické 3/3.

---

## v13.10.3 — příručka obchodníka aktuální k v13.10.2 (větev claude/prirucka-13-10)

Rozhodnutí J. V. 13. 10. 2026: „Příručka — Ano, v příští dávce". Větev
z `claude/integrace-13-10b` (v13.10.2, 0512c51). Do `test-draft` jen na
pokyn J. V.

- **Obsah (`manual/obsah.json`):** kap. 25 zámek strany (P6) — seznam
  OPR → PROJ vynulovaná, OVP → OCK vynulovaná, obě čísla → vede OCK, bez
  čísla obě strany; snímek lišty; rámeček o starších zakázkách
  s upozorněním „Zakázka dřív počítala projekci i OCK" (`stranyDriv`);
  zrušené tlačítko pro počítání vyřazené strany (bez doslovného názvu,
  hlídá `test_zamek_strany` (l)). Kap. 11 a 13 „Opláštit i prohlubeň" (P2).
  Kap. 28 probarvení ceníků (prázdná Cena Zahraničí nesvítí = jako v ČR).
  Kap. 1–3 odhlášení na všech zařízeních (B6), správce mění vlastní heslo
  jen „Změnit heslo…" (B77-zbytek). Kap. 19 rozhodnutí o slevě vrací jen
  nadřízený (B101). Úvod „Co je nového ve verzi v13.10". „Historická
  kalkulace" příručka nezmiňovala (ani na nových snímcích).
- **Snímky (`manual/snimky_auto.mjs`, Playwright nad zkušebním ceníkem):**
  přefoceno všech 22; nový `zamek-strany`; Detail výpočtu PROJ se fotí ze
  smyšlené zakázky `2026 - OVP - CN - 9104` (u 9100 s číslem OPR je teď
  PROJ vynulovaná).
- **Renderer (`manual/sablona.html`):** zná `*kurzívu*` — obsah.json ji
  psal na ~80 místech a v příručce svítily holé hvězdičky.
- **`overit_manual.mjs`** +10 kontrol (9 témat v13.10.2 + holé hvězdičky).
  Pojistka: nad příručkou v13.10.2 z podkladů 36 OK / 10 FAIL; nad novou
  před opravou rendereru 46/1; po 47 OK / 0 FAIL.
- Hotová příručka `2026-10-13_kalkulator_v13.10.3_MANUAL_OBCHODNIK.html`
  je jen v kopii podkladů `/home/user/kng_podklady_prirucka-13-10`
  (na Disk ani do repa se nenahrává).
- Navazující práce: kapitola o lištách rozpracované/odeslané zakázky
  (#404, větev `claude/listy-404`) se tu neměnila — po integraci #404
  upravit text (kap. 6, 8, 29) a přefotit.

**Celé kolo nad b2181e9 VŠE ZELENÉ (158 min 55 s):** sady 232/0/1 (přeskočen jen
`test.js`), mutace jádra 193 z 193, mutace serveru 358 z 358, statické
kontroly 3 z 3. Podklady: kopie s příručkou přejmenovanou na v13.10.3.

## v13.10.2 — integrace dávek 13. 10. 2026 do test-draft (větev claude/integrace-13-10b)

Pokyn J. V. 13. 10. 2026: „souhlasím s výchozími, slouč všechny tři větve do
test-draft". Z `test-draft` (v12.10.4, 1df7283), merge commity (bez rebase)
v pořadí: `claude/davka-13-10` (#400 zbytek, #402 hlídač harnessů a odkaz na
release s popisem, #403 nízké nálezy, revize auditu), `claude/cenik-barvy`
(probarvení ceníků, bez Historické kalkulace), `claude/k22-p2-p6` (P2
„Opláštit i prohlubeň", P6 zámek strany). Každá větev nesla v13.10.1 →
integrace v13.10.2. Výchozí odpovědi J. V. ke všem otevřeným otázkám
odsouhlaseny.

- **Co je nové:** probarvení buněk ceníků (0/prázdné světle červeně, Kč nad
  40 000 světle oranžově); P6 — druhá strana zakázky se podle čísla nabídky
  zamkne a vynuluje (OPR → PROJ, OVP → OCK), ruší se „Počítat i tuhle
  stranu"; P2 přejmenování „Opláštit i prohlubeň"; odkaz na release s popisem
  změn (`nastroje/release_odkaz.py`); hlídač prohlížečových harnessů.
- **Co je opravené:** B138, B77-zbytek, B107 (+B42, B25), B129, B130 (#400
  hotovo); B83, B81, B103, B101, B105, B6, B35 (#403); regrese a obchvaty
  z auditu dávky (409 po tisku hned po schválení, B101/B138/B103 obchvaty,
  souběh odhlášení).
- **Odebráno:** tlačítko a okno „Historická kalkulace".

Konflikty a jak se vyřešily:
- `CHANGELOG.md`, `PREDAVKA.md`: zachovány záznamy všech větví.
- `netlify/mutace.mjs` (seznam sad): `test_analytika`, `test_cenik_popisy`,
  `test_schvalovani` (dávka) + `test_zamek_strany` (P6).
- `netlify/test_koncova_cena.mjs`: blok B105/B138 (dávka) i blok P6/N4.
- `src/zakazka.js` `zahrJenRealizaceNabidnout`: sloučeno automaticky —
  drží B129 (nic u zakázky s odeslanou variantou) i D6f (nic u čísla OPR,
  návrat `'zrusitJenOck'`).

**Celé kolo nad 0512c51 VŠE ZELENÉ (165 min 38 s):** sady 232/0/1 (přeskočen jen
`test.js`), mutace jádra 193 z 193, mutace serveru 358 z 358, statické
kontroly 3 z 3. (První pokus přerušil v 16:54 restart kontejneru; spuštěno
znovu nad týmž commitem.)

## v13.10.1 — dávka po 22. kole: #400 zbytek, visící harness, popis releasů (větev claude/davka-13-10)

Pokyn J. V. 13. 10. 2026 přes koordinační sezení 22. kola. Větev
z `test-draft` (v12.10.4, 1df7283). Roadmapa #400 (zbytek) a #402–.

- **Pravidlo J. V. 13. 10.: odkaz na release nese popis změn.** `CLAUDE.md`
  (oddíl Tagy, releasy) + nový nástroj `nastroje/release_odkaz.py <verze>
  <SHA>` — z oddílů `## v<verze>` v CHANGELOG sestaví krátký popis (nálezy,
  čísla roadmapy, výsledek kola; řádek s částkou vynechá) a odkaz
  `releases/new?…&body=…`; `--upravit` dá odkaz na úpravu vydaného releasu
  a text k vložení. Test `src/test_release_odkaz.js` (21; bez nástroje
  7/14, mutace bez kódování a bez filtru částek po 1 FAIL).
- **Visící harness (nízká, z N1) — #402.** `overit_online.mjs` po selhání B59
  (server nabídku neuložil) visel: `onlineOtevri` neuložené zakázky otevřel
  skutečný modál a `page.evaluate` nemá limit — kolo stálo bez výpisu.
  Nový `nastroje/harness_hlidac.js`: strop každého `page.evaluate` (120 s,
  chyba nese, který krok visel), celkový strop (20 min), nezachycená chyba
  → úklid (sám se stropem 5 s) → kód 1. Zapojeno v `overit_online.mjs`;
  `spust_testy.sh` navíc pouští každý harness přes `timeout`
  (`KNG_HARNESS_LIMIT`, výchozí 900 s) — visení = selhání. Pojistka: s
  rozbitým B59 (šířka 0) harness před opravou visel do vnějšího `timeout`
  (kód 124 po 500 s), po opravě skončí za 120 s kódem 1 s popisem kroku.
  Test `src/test_harness_hlidac.js` (11; mutace bez obalení → kód 1 bez
  souhrnu, mutace `konec(0)` → 2 FAIL).
  Strop je proměnná uvnitř `spust_prohlizec` (sada `test_harness_podklady.js`
  si funkci vyjímá samotnou — s proměnnou mimo funkci padala 5/25); sada
  nově podstrčí i visící harness (`KNG_HARNESS_LIMIT=2`) → selhání s „HARNESS
  VISEL", 25/0.
- **B138 (střední) — dvoukrok se starší zveřejněnou verzí ceníku.** (1) nová
  zakázka se starší verzí celou (200), (2) platný ceník + klíč, který starší
  verze neměla (import ho doplnil nulou, např. hodiny statiky opláštění) = 0
  → 200 i se zámkem. Rozhodnutí J. V. 12. 10.: opravit. Kontrola ceníku
  (`src/uloziste.js`, skupiny B128) ve skupině „uložená verze + platný ceník"
  odmítne nulu, kterou nese jen uložená verze, ve SMĚSI (ceník se od uložené
  verze liší) — leda ji některá zveřejněná verze skutečně nesla nebo ji má
  i platný ceník. Uložení beze změny ceníku a přechod na platný ceník celý
  projdou dál. Klient: přepočet vybraných položek (`cenikPrepocti`) přepočte
  i takovou nulu (zakázkové hodnoty ne). Testy: `test_koncova_cena.mjs` +9
  (před 3 FAIL — krok 2, 2+3 se zámkem, klon; po 83/0), `test_cenik_stari.js`
  +1 (před FAIL, po OK); mutace serveru B138 ×2 (chycené 2/2).
- **B77-zbytek (střední) — reset hesla na vlastní účet.** Akce „heslo"
  (reset správcem) na VLASTNÍ účet obešla `mojeheslo` — bez starého hesla
  a bez brzdy; kdo se dostal k cookie správce (i hlavního), převzal účet
  natrvalo. Server ji teď odmítne (403, odkaz na „Změnit heslo"); v seznamu
  uživatelů vlastní řádek nabízí „Změnit heslo…" (dialog se starým heslem),
  cizí dál „Nové heslo…". Testy: `test_prava.mjs` +3 (před 2× 200, po 805/0),
  `overit_online.mjs` +2 (před 214/1, po 215/0); mutace serveru chycená.
- **B107 (střední) — bootstrap hlavního účtu.** Zakládal účet bez
  `hesloVerze` (= 0): po smazání účtu a novém bootstrapu platila cookie
  z doby před smazáním. Nově verze = čas založení (jako B76), heslo
  z prostředí se porovnává v konstantním čase (`tajneShodne` v
  `lib/sdilene.mjs`, B42 — hash obou stran, délka nevyteče) a musí splnit
  pravidlo délky (B25; krátké bootstrap nespustí). Testy:
  `test_prihlaseni.mjs` +10 (před 53/7, po 60/0); mutace serveru 2 nové
  + přesměrovaná „zaváděcí heslo se nekontroluje" (3/3).
- **Revize dávky (audit 13. 10. 2026, dvě čočky, subagenti jen četli; vysoký
  nález žádný).** Opraveno v téže dávce:
  - *Regrese B105 (střední):* server razil čas schválení vlastním časem,
    prohlížeč držel čas kliknutí → nabídka vytištěná hned po schválení
    skončila při dalším uložení 409. Čas z prohlížeče se přijme do 10 min
    od času serveru, jinak razí server; server navíc vrací v odpovědi slevy,
    jak je uložil (`slevy`), a prohlížeč si je převezme
    (`onlineSlevyZeServeru`, jen u neměněné slevy). U nezměněného
    rozhodnutí se z uložené verze obnoví všechna pole (e-mail, důvod).
  - *Obchvat B101 (nízká):* rozhodnutí šlo smazat stavem `''`, automatickým
    nebo neznámým — teď se bez práva a beze změny procent vrací uložené
    rozhodnutí při jakémkoli stavu (výjimka: prohlížečem přepnuté zamítnutí
    pod marží); neznámý stav slevy se odmítne. Mez: dvojí změna procent
    (10 → 10,001 → 10) je nová žádost.
  - *Obchvat B138 (střední):* aplikace od V38 zveřejňuje chybějící klíč
    výslovnou nulou, takže výjimka „nulu nesla některá verze" pustila tentýž
    útok (−0,7 % se zámkem). Výjimka zrušena; hlídají se jen položky, které
    klient umí přepočítat (`cenikSledovane`, bez přirážky a DPH) — mrtvý klíč
    přepočet nezablokuje. Klient vynucuje přepočet nuly jen roli bez práva
    ceníku (`vynutNuly`) — kdo ceník měnit smí, tomu odškrtnutá položka
    zůstane.
    Skupinu se základem v ceníku sestavení `doplnenaNula` nehlídá — tu
    hlídá B133 (kolo nad ea34e65 ukázalo, že by se pojistky překrývaly
    a mutace B133 zůstaly nechycené).
  - Kolo nad ea34e65 (129 min): sady 227/0/1, jádro 189/189, server 341/344,
    statické 2/3 — nechycené B133 ×2 (viz výš) a „platnost relace se
    neověřuje": test v `test_prava.mjs` podvrhoval cookie hlavního účtu
    s verzí hesla 0, kterou bootstrap od B107 nemá — teď bere verzi
    z úložiště. Statická kontrola: krátké heslo v testu B107 jako literál →
    proměnná.

**Celé kolo nad dd9c24b VŠE ZELENÉ (129 min 55 s):** sady 228/0/1 (přeskočen
jen `test.js`), mutace jádra 189 z 189, mutace serveru 346 z 346, statické
kontroly 3 z 3. Podklady: `/home/user/kng_podklady` (šablony z Disku, příručka
přejmenovaná na v13.10.1).
  - *Obchvat B103 (nízká):* „toString", „hasOwnProperty" aj. shodily sběr
    textů stejně — odmítá se vše z `Object.prototype`, mapa sběru je bez
    prototypu.
  - *B6 (nízká):* odhlášení zapisovalo celou kopii účtu z ověření relace —
    souběžná změna správce se mohla přepsat zpět. Účet se čte znovu těsně
    před zápisem a mění se jen verze hesla (okno zúžené, plně atomický zápis
    úložiště neumí — mez). Hláška neplatné relace už netvrdí „heslo bylo
    změněno".
  - Drobnosti: strop harnessu 25 min (nad hlídačem 20 min), bez GNU
    `timeout` běh bez stropu; `release_odkaz.py` filtruje částky i v titulku
    a ve tvaru „1 200,- Kč" a před zkrácením; `csvBunka` neprefixuje „- položka"
    s mezerou (komentář opraven: apostrof v CSV zůstane vidět); lišta B130
    jen pro počítané strany a bez tvrzení o důvodu.
  - Neopraveno (k rozhodnutí J. V.): B35 strop jde zaplnit smetím jedním
    účtem (návrh: zakládat `cas/` jen pro existující zakázku); B77-zbytek —
    s cookie správce lze dál založit nový účet Administrátor (návrh:
    citlivé akce správce znovu s heslem); B128/B138 záměr „dohodnutá cena
    zůstává" (směs se skutečnými staršími cenami) dál projde.
  Testy: `test_schvalovani.js` +6 (před 75/4), `test_koncova_cena.mjs` +6
  (regrese 409 před 85/2, výslovná nula před 88/1), nový
  `src/test_slevy_ze_serveru.js` (před 0/1, po 4/0), `test_cenik_stari.js`
  +1, `test_cenik_popisy.js`, `test_csv_vzorce.js`, `test_release_odkaz.js`
  (před 20/1); mutace: neznámý stav, chybějící `slevy` v odpovědi,
  přesměrované B101/B105/B6/B103.
- **B129 (nízká) — „jen realizace" u zakázky s odeslanou variantou.** `jenOck`
  je vlastnost zakázky — dotaz po přepnutí řady ceníku by změnil i odeslanou
  nabídku. `zahrJenRealizaceNabidnout` u zakázky se zamčenou variantou nic
  nenabídne (oběma směry). `test_zahr_jen_realizace.js` +3 (před 13/2, po 15/0).
- **B130 (nízká) — odeslaná nabídka bez zmrazeného výsledku.** Nový
  `zamekPrepoctenoDnes(v)` (strany bez zmrazených čísel); lišta zámku pak
  říká „Částky … nejsou zmrazené … přepočtené dnes". `test_zamek_otisk.js`
  +5, `overit_online.mjs` +2 (lišta starého zámku vs. zámku s výsledkem).
- **B83 (nízká) — CSV exporty bez ochrany vzorců.** Čtyři exporty pro
  překladatele (nepřeložené fráze šablon ×2, techspec, slovník jen v aplikaci)
  dávaly text do buňky, jak byl — „=HYPERLINK(…)" by Excel spustil. Nová
  `csvBunka` (format.js): uvozovky + apostrof před `= + - @ TAB CR`. Test
  `src/test_csv_vzorce.js` (15; před 1/5) hlídá i každý budoucí export
  `text/csv` v `src/ui`.
- **B81 (nízká) — prototypové klíče v analytice.** Klíč „constructor"
  v dávce klienta našel v mapě funkci Object (počítadlo se slilo do textu,
  `pocty.constructor` prošlo jako známé), „__proto__" psal do prototypu;
  totéž e-mail v `poUzivateli` a číslo zakázky v `cas/`. Nový
  `analytikaKlicPovolen` + dotaz jen na vlastní vlastnosti. `test_analytika.js`
  +6 (před 5 FAIL).
- **B103 (nízká) — prototypové klíče v dodatkových textech.** Položka
  „constructor" shodila sběr textů ze zakázek (`/api/popisy?sber=1` → 500),
  „__proto__" zmizel. `popisyOciste` a `popisyJazykyOciste` je nepřijmou.
  `test_cenik_popisy.js` +2 (před 2 FAIL). Mutace B81, B103 (sady přidány
  do mutací serveru) a přesměrovaná B8 — 3/3.
- **B105 (nízká) — čas rozhodnutí o slevě z prohlížeče.** Server bral
  `schvalilKdy`/`zamitlKdy`, pokud je klient poslal — rozhodnutí šlo
  antedatovat. Čas teď razí server vždy; porovnání „totéž rozhodnutí" čas
  nepočítá a uložený serverový čas se drží.
- **B101 (nízká) — rozhodnutí zpět na „čeká" bez práva.** Obchodník uložením
  vrátil zamítnutí (nebo schválení) do fronty jako nerozhodnuté. Bez změny
  procent a bez práva rozhodnout se vrací uložené rozhodnutí; vedoucí
  („Vzít rozhodnutí zpět") smí, nová procenta = nová žádost. Testy:
  `test_schvalovani.js` +6 (před 69/4, po 73/0); mutace B101, B105 chycené
  (sada přidána do mutací serveru); `overit_schvalovani` 57/0.
- **B6 (nízká) — odhlášení jen v prohlížeči.** Odhlášení mazalo cookie, ale
  zkopírovaná relace platila dál až 12 hodin. Teď odhlášení zvedne verzi
  hesla účtu — **neplatí pak žádná dosud vydaná relace toho účtu, vědomě
  i na ostatních zařízeních** (jako změna hesla; výchozí výklad, J. V. může
  chtít jen tuto relaci — to by vyžadovalo seznam relací na serveru).
  Odhlášení bez relace dál projde. `test_prihlaseni.mjs` +7 (před 65/2, po
  67/0); matice v `test_prava.mjs` se po odhlášení přihlásí znovu (805/0);
  mutace chycená.
- **B35 (nízká) — strop počtu klíčů `cas/` v analytice.** Tvar čísla hlídal
  B8, počet ne. Nově `ANALYTIKA_MAX_CASU` = 5 000 (výchozí, rezerva na roky):
  nad stropem se nová zakázka nezaloží, existující se přičítá dál. Seznam
  klíčů se čte jen při novém klíči. `test_funkce.mjs` +3 (před 228/2, po
  230/0); mutace chycená.

## v13.10.1 — probarvení ceníků, bez Historické kalkulace (větev claude/cenik-barvy)

Zadání J. V. 13. 10. 2026. Větev `claude/cenik-barvy` z `test-draft`
(1df7283, v12.10.4); do `test-draft` jen na pokyn J. V.

### Probarvení buněk ceníku

„Nastav v cenících pravidlo probarvení buněk. Světle červeně všechny, kde je
hodnota nula nebo není vyplněno a světle oranžově všechny, kde je hodnota
vyšší než 40000,- Kč."

Výklad:
- „Ceníky" = editory **Ceník nákladů OCK** a **Ceník nákladů PROJ**
  (`src/ui/cenik_ui.js`): všechna číselná pole tabulky — hodnoty z
  `CENIK_DEF`/`CENIK_DEF_PROJ`, sloupec Cena Zahraničí, trvalé (katalogové)
  položky OCK (cena i výchozí množství) a trvalé položky PROJ (cena / hodiny).
  Globální přirážka a sazby DPH nad tabulkou probarvené nejsou (nejsou to
  buňky ceníku, ale pole hlavičky).
- **Světle červená** = 0 nebo prázdné pole, u všech číselných položek bez
  ohledu na jednotku. Výjimka: prázdná **Cena Zahraničí** znamená „jako ČR",
  tedy platný stav — červeně svítí jen zapsaná nula.
- **Světle oranžová** = hodnota **> 40 000** (přesně 40 000 ne) u položek
  v Kč: jednotka začíná „Kč" (Kč, Kč/ks, Kč/kg, Kč/hod, Kč/h, Kč/m², Kč/bm,
  Kč/m, Kč/km, Kč/nýt, Kč/cesta, Kč/j., Kč/m výšky, Kč/nástupiště, Kč/EUR).
  Ne u %, hod, kg (CENIK_DEF) ani u množství (ks) a hodin trvalých položek.
  Jednotky jsou v ceníku u každé položky, odhad nebyl potřeba.
- Barva se počítá z hodnoty v políčku: při vykreslení (otevření záložky,
  načtení zakázky, přepnutí varianty či verze ceníku — vše ceník kreslí znovu)
  a živě při psaní (`input`/`change`). Jen vzhled — nic se nezapisuje do dat
  ani výpočtu.

Kód: pravidlo `cenikBunkaTrida(hodnota, jednotka, {prazdnaOk})` +
`cenikJednotkaKc`, `CENIK_BARVA_MEZ_KC` v `src/cenik.js` (export pro Node);
`cenikBarvaAttr`/`cenikObarvi`/`cenikObarviVse` a posluchač v
`src/ui/cenik_ui.js`; CSS třídy `cenik-nula`, `cenik-vysoka` s barvami jako
proměnné v `:root` (`--cenik-nula-bg` …). Tmavý režim aplikace nemá.

Testy (pojistka proti prázdnému testu):
- `src/test_cenik_barvy.js` — před opravou 0 OK / 1 FAIL (pravidlo
  neexistuje, test končí), po opravě 35 OK / 0 FAIL.
- `overit_cenik_barvy.mjs` (prohlížeč) — nad sestavením v12.10.4 4 OK /
  9 FAIL a pád (`cenikObarviVse is not defined`), po opravě 22 OK / 0 FAIL.

### Odstraněno tlačítko „↩ Historická kalkulace…"

„Odstraň z hlavičky tlačítka Historická kalkulace. Myslím, že už k ničemu
není."

- Tlačítko zmizelo z lišty zakázky v Kalkulaci OCK i PROJ
  (`src/ui/common.js`) a z karty Kalkulace v zakázce (`src/ui/seznam_ui.js`,
  i s vysvětlující poznámkou). V příručce (`manual/obsah.json`) zmíněné nebylo.
- Mrtvý kód pryč: okno archivu `src/ui/archiv_ui.js` (smazáno, i z
  `build.py`), `#archiv-overlay` a jeho CSS v `src/app_template.html`, model
  archivu v `src/archiv.js` (hledání, řazení, `vytvorAlternativu` …) — nic jiné
  ho nevolalo (ověřeno grepem přes `src/`, `netlify/`, harnessy).
- **Zůstává** `puvodPopis` (v `src/archiv.js`): varianty, které oknem dřív
  vznikly, jsou v uložených zakázkách dál a nesou `puvod` — věta o původu
  v hlavičce kalkulace a značka ⤺ v seznamu kalkulací se jim ukazují dál.
- Testy, které okno zkoušely: `src/test_archiv.js` zúžen na `puvodPopis` +
  pojistku, že se tlačítko/okno do zdrojů nevrátí; `netlify/test_klon_sleva.mjs`
  — vypuštěn oddíl C (alternativa z archivu, N44; klon a duplikát hlídají A, B,
  D); `overit_lista.mjs` — oddíl #17 nahrazen kontrolou, že tlačítko v liště
  ani v seznamu není a okno v sestavení chybí, varianta s `puvod` se pro #35
  vyrábí přímo; `overit_online.mjs` — tlačítko se už nepočítá mezi živá
  v režimu čtení, nově se hlídá, že chybí; `src/test_escape.js` — vypuštěn
  výjimkový záznam pro `archiv_ui.js`.

Testy (pojistka proti prázdnému testu, proti sestavení v12.10.4):
- `src/test_archiv.js` — před 7 OK / 8 FAIL, po 15 OK / 0 FAIL.
- `overit_lista.mjs` — před 250 ✓ / 5 ✗, po 255 ✓ / 0 ✗.
- `overit_online.mjs` — před 213 OK / 1 FAIL, po 214 OK / 0 FAIL.

**Celé kolo nad edb6c71 VŠE ZELENÉ:** sady 221/0/6 (přeskočeny `test.js` — není
v exportu — a pro chybějící firemní podklady `overit_manual`, `overit_nabidka_proj_word`,
`overit_sablona`, `overit_sablony_online`, `overit_sod`), mutace jádra 189 z 189,
mutace serveru 333 z 333, statické kontroly 3 z 3. (První běh celého kola narazil
na časový limit sezení uprostřed mutací serveru — 332 chycených, žádná nepřežila,
pracovní kopie čistá; mutace serveru + statické kontroly proto doběhly znovu
samostatně, 78 min.)

## větev claude/k22-p2-p6 (neuvolněno)

Paralelní větev z `test-draft` = `1df7283` (v12.10.4) podle promptu J. V.
`PROMPT_PARALELNI_VETEV_K22_P2_P6.md` (rozhodnutí J. V. 13. 10. 2026 k bodům
P2–P6 z 19. kola). Verze ve větvi v13.10.1 (sjednotí J. V. při integraci).
Nahrazuje podobu **P2 a P6 z v2.10.1** (větev `claude/k19-nalezy`, výchozí
návrhy). P4 a P5 zůstávají, jak jsou (rozhodnutí J. V. 13. 10.); hodiny
statického posouzení opláštění (P5) nastaví J. V. v Ceníku OCK sám — ceník
se ve větvi nemění.

### P2 · K19-N104 — „Opláštit i prohlubeň" (místo „Prosklít i prohlubeň")

Rozhodnutí J. V. 13. 10. 2026: řešení P2 z main je v pořádku, jen se
zaškrtávátko v zadání šachty přejmenuje. Zkratka nastaví všem stěnám A–D
„Opláštění začíná" = −prohlubeň a opláštění stěny nemusí být sklo (typ
stěny může být plech) — název má říkat, co zkratka dělá.
- Zadání šachty: popisek „Opláštit i prohlubeň", nápověda pole Prohlubeň
  („Opláštění i v prohlubni: zaškrtněte „Opláštit i prohlubeň"…"),
  nápověda zaškrtávátka („opláštění i v prohlubni", „není co opláštit")
  a hláška u nulové prohlubně („není co opláštit").
- Detail výpočtu: řádek „Opláštěná prohlubeň" a odkaz na zkratku novým
  názvem. Příručka text zkratky nenesla (beze změny).
- Jen texty: názvy funkcí (`prohlubenSkloSet`, `prohlubenSkloRadek`,
  `oplasteniProhlubenNastav/Vse/Sleduj`), uložená data ani výpočet se
  nemění. Komentáře a starší záznamy CHANGELOG zůstávají (historie).
- Test `src/test_oplastit_prohluben.js`: texty UI, detailu a příručky
  (a dist po sestavení) + otisk zadání po zaškrtnutí/odškrtnutí shodný
  s 1df7283 (sha256). Před opravou 1 OK / 5 FAIL, po ní 7 OK / 0 FAIL.
  `overit_oplasteni.mjs` přepsán na nový název (+1 kontrola popisku
  řádku, 92 OK), `overit_lista.mjs` 271/271.

### P6 · K19-N114 — zámek strany: vyřazená strana se uzamkne a vynuluje

Rozhodnutí J. V. 13. 10. 2026: vrací se zadání z 1. 10. 2026 („V případě,
že je kalkulace naceněna v OCK, měla by se kalkulace projekce uzamknout
a vynulovat. Toto platí vice versa." a „Druhou stranu kalkulace už nebudeme
umožňovat počítat" — Pipedrive eviduje OCK a projekci vždy zvlášť pod
vlastním číslem). Nahrazuje P6 z v2.10.1 (měkký zámek: zašedlá strana se
dál počítala, výjimka „Počítat i tuhle stranu", dialog „jen realizace" pro
každou zahraniční zakázku). Pojem: **zámek strany** (OCK × PROJ jedné
zakázky) — nesouvisí se zámkem varianty po tisku (`zamekPoTisku`) ani se
„stranami" dokumentů v jeho otisku.

Jedno pravidlo v jádře (`src/zakazka.js`):
- `zakazkaVedouciStrana` — `jenProj` → PROJ, `jenOck` → OCK, jinak číslo
  nabídky: číslo zakázky mimo řadu OVP → OCK (i když vlastní číslo má
  i hlavička PROJ), řada OVP / vlastní číslo PROJ → PROJ, bez čísla → ''.
- `zakazkaVyrazenaStrana` ('proj' | 'ock' | ''), `stranaZamcena` z ní;
  `vysledekStrany(zak, v, strana, jekly)` — vyřazená strana `null`, jinak
  `vypocetZ` / `vypocetProjZ` (ty zůstávají čisté, otisk se nemění);
  `zakazkaDrivObeStrany` (dřív `obeStrany: true` nebo čísla obou stran);
  `zakazkaVyrazenaText` (hláška zábrany a lišty).
- `obeStrany` nic nenastavuje (novaZakazka, migrace, dialog, tlačítko);
  ve starších datech zůstává a ignoruje se.

Výstupy (vyřazená strana se nikde nesčítá, netiskne ani nekontroluje):
- `sluzba.js` (server i přehledy) — `cenaOck`/`cenaProj` null, marže jen
  z vedoucí strany; `porovnaniVariant` vyřazenou stranu nesčítá (i otisk
  souhrnu nového zámku `zamekOtiskZPorovnani`); `spocitejVariantu`
  (souhrn řídící varianty, porovnání, seznam variant); marže v liště
  (`marzePrehledAkt`); krycí list OCK (`kryciCtx` — typ produktu bez
  „+ projekce" u čísla OPR, bez hodnoty OCK u OVP); `nabidkaProjPlatby`
  (plán plateb PROJ) null; `cenik_stari.js` (dopad ceníku) a rejstřík
  (`jenProj` = vedoucí PROJ, druh pro filtr, bez cen) jedním pravidlem;
  schvalování slev (UI i serverová marže slevy) vyřazenou stranu nebere.
- Kontroly: `kontrolyProved` odvodí `jenProj`/`jenOck` z vyřazené strany
  a data vyřazené strany z kontextu vyjme (`kontrolyCtxStrany`) — mlčí
  `projZahranici`, `planPlatebWordProj`, `cenaWordProj`, `slevaProj`,
  `cenaNula` za PROJ… (tím odpadá i K21-N1). Nové pravidlo `stranyDriv`
  (upozornění, ne zábrana): „Zakázka dřív počítala projekci i OCK. Od této
  verze se nabízejí zvlášť — Kalkulace PROJ je vynulovaná. Projekci nacen
  v samostatné zakázce."
- Dokumenty: `kontrolyStranaZabrana(zak, typ)` — v `dokumentZabrana`
  (jako první zábrana) i v `dokumentVygeneruj` (vzor #377): nabídka a tisk,
  krycí list, SoD vyřazené strany (plán plateb PROJ jede s nabídkou a SoD
  PROJ) nevzniknou, ani dotisk do odeslané varianty; kompletní náhled
  podkladů nabídky OCK taky. Buildery dokumentů (`nabidka.js`,
  `nabidka_proj.js`, `kryci_proj.js`) se neměnily — je to dokument jedné
  strany a vyřazenou zastaví zábrana.
- UI: lišta vyřazené strany („uzamčená a vynulovaná (0 Kč) … druhá strana
  se nabízí samostatnou zakázkou, protože Pipedrive eviduje každou nabídku
  zvlášť"), tlačítko „Počítat i tuhle stranu" a `zamekStranyPovol` zmizely,
  „Přejít do počítané kalkulace" zůstává; obrazovky vyřazené strany
  (kalkulace, nabídková karta, detail výpočtu, technická specifikace)
  se kreslí s vynulovanými částkami (`stranaNulujKresli`, `fmt`/`fmt0` →
  0 Kč) a štítkem „0 Kč — vynulováno, cenovka vzniká v …"; krycí list
  vyřazené strany jen panel. U `jenOck` je v liště PROJ přepínač „Zakázka
  je jen realizace (bez PROJ)" (tělo PROJ je zamčené, jinak by nešel zrušit).
- Server (`netlify/lib/zakazka_kontrola.mjs`, D6g): `zakazkaVyrazena` ze
  sdíleného pravidla; nový zámek vedoucí strany se neposuzuje podle ceníku
  ani ceny / rozměrů vyřazené strany; nový zámek i nový dotisk dokumentu
  vyřazené strany → 403. Data se nemění, uložení zamčené varianty projde.
- Příručka (`manual/obsah.json`, kap. 25): podnadpis „Uzamčená a vynulovaná
  kalkulace", věta o tlačítku a „při obou číslech se nezamyká nic" pryč.
  Snímky obrazovky v příručce se nepřegenerovaly (lišta se změnila jen
  textem a jedním tlačítkem).

Rozhodnutí (výchozí volba a výklad označeny, ať jde přepnout):
- **D6a** (J. V. 1. 10., potvrzeno 13. 10.) — výjimka „Počítat i tuhle
  stranu" se ruší.
- **D6b** (výchozí) — vynulování je pravidlo čtení: zadání vyřazené strany
  zůstává, po smazání / změně čísla se cena vrátí na korunu.
- **D6c** (výchozí) — spouštěč je číslo nabídky + `jenProj` / `jenOck`,
  ne cena.
- **D6d** (výchozí) — platí i pro varianty odeslané před změnou: přehledy
  a nový krycí list jen vedoucí strana, odeslané dokumenty a otisk
  (`zamek.vysledek`) beze změny, nový dotisk vyřazené strany zablokovaný
  (klient i server).
- **D6e** (výklad) — čísla na obou stranách → vede OCK (číslo zakázky).
- **D6f** (výchozí) — dialog „jen realizace" jen pro zahraniční zakázku
  bez čísla; zakázka s číslem OPR (tvar K22-Z02) ho nedostane. Návrat do
  tuzemska nabídne zrušení `jenOck` (návratová hodnota `'zrusitJenOck'`,
  dřív `'obeStrany'`). Vypnout: `zahrJenRealizaceNabidnout` → vždy `null`.
- **D6g** (výklad bezpečnostní zrcadlovosti) — server bere vyřazenou stranu
  ze stejného pravidla jako klient (V3, B137).
- Výklad navíc: serverové kontroly „nikomu" (záporné částky B111, rozměry
  B137 při uložení, typy #340) platí dál i pro data vyřazené strany —
  uvolnily se jen kontroly nového zámku. Otisk souhrnu nového zámku
  (`zamek.otisk`) nese u čísla OPR jen OCK.

Testy (počty před → po):
- nová `src/test_zamek_strany.js` (body a–m promptu): na 1df7283
  17 OK / 31 FAIL, po opravě 52 OK / 0 FAIL;
- `netlify/test_koncova_cena.mjs` + blok P6 (k, h): na 1df7283 74 OK /
  5 FAIL, po opravě 82 OK / 0 FAIL;
- `overit_zahranicni.mjs` + P6 UI (lišta, štítek, 0 Kč, krycí list panel,
  dokumenty zhasnuté, vratnost, OVP) a dialog K22-Z02: 56 OK / 0 FAIL;
- přepsané na nové pravidlo: `test_zakazka.js` (obě čísla → OCK, obeStrany
  ignorován), `test_zahr_jen_realizace.js` (14/0), `test_kryci.js`,
  `test_porovnani.js`, `test_sluzba.js`, `test_zamek.js`,
  `test_zaokrouhleni.js`, `test_kontroly.js` (33 pravidel),
  `test_cenik_dopad.js`, `netlify/test_prava.mjs` (#395 V3 PROJ s číslem
  OVP) — kombinace OCK + PROJ se v nich ověřuje na zakázce bez čísla;
- harnessy, které z jedné zakázky tiskly obě strany, přepínají číslo
  podle strany (`overit_sod.mjs` OPR/OVP 49/0, `overit_nabidky_dph.mjs`
  nabídka OCK s číslem OPR 24/0, `overit_xss.mjs` plán plateb PROJ u čísla
  OVP — 8 náhledů místo 9, 338/0); `overit_lista.mjs` čeká 33 pravidel;
- (m) souhrn a cena OCK testovacích zadání u zakázek s číslem OPR na korunu
  jako na 1df7283 (otisk sha256, Model 1 i 2); `engine.js` ani
  `engine_proj.js` se nezměnily — `nastroje/porovnani_modelu.js` dává
  stejný výstup jako na 1df7283;
- mutace: serveru +13 (P6, chycené 13/13), jádra +4 (chycené 4/4).

### Celé testovací kolo (13. 10. 2026)

`nastroje/testovaci_kolo.sh` s `KNG_PODKLADY=/home/user/kng_podklady`
(firemní šablony k dispozici — harnessy šablon a smluv běžely, žádný se
nehlásil jako přeskočený). Kolo se pustilo ve dvou částech, protože
nástroj sezení ukončí proces na pozadí po 2 h a první celé kolo (nad
7f6baa9) se tak zastavilo uprostřed mutací serveru — do té doby ukázalo
jedinou nechycenou mutaci „revize N4" (opraveno v 690d409, test N4 přes
přepnutí na jenOck).
- část 1 nad 690d409 (`--jen build,sady,mutace-jadro`, 44 min): sestavení
  ✓, sady **226 prošlo / 0 selhalo / 1 přeskočeno** (jen `test.js` — shoda
  s Excelem není v exportu), mutace jádra **193 z 193**;
- část 2 nad 690d409 (`--jen mutace-server,staticke`, 86 min): mutace
  serveru **345 z 346** — jediná nechycená „B137: rozměry OCK se hlídají
  i u dokumentu strany PROJ" je od P6 nedosažitelná (dokument PROJ smí
  vzniknout jen u zakázky s vyřazenou OCK, kterou zamekNovyRozmeryProblem
  pustí řádkem výš) → z mutací vědomě vyřazena s komentářem (345 úseků,
  `--kontrola` zelená); statické kontroly **3 z 3**.

---

## v12.10.4 — integrace nočních dávek N1–N3 (větev claude/integrace-13-10)

Integrační větev z `test-draft` (v12.10.2, d562da1), merge commity (bez
rebase) v pořadí: `claude/koncova-cena-398` (N1, #398 — B133–B137, B145,
B150a), `claude/sablony-399` (N2, #399 + část #400), `claude/slovnik-hromadne`
(N3, #401 slovník na serveru), `claude/kolo22-v12.10.2` (roadmapa #398–#400,
PREDAVKA 22. kola). Každá větev nesla v12.10.3 → integrace v12.10.4.

Konflikty a jak se vyřešily:
- `src/uloziste.js` (N1 × N2, `uloZaporneVZadani`, položky PROJ): N1 hlídá
  pole přes `hlidej` (typ, zápor, tvar čísla podle jádra — B135/B145), N2
  přidala strop B144 — ponecháno obojí (`hlidej` + `strop`).
- `netlify/mutace.mjs` (seznam sad serverových mutací): sjednoceno
  `test_koncova_cena.mjs` (N1) + `test_profil.mjs` (N2) + `../src/test_slovnik.js` (N3).
- `netlify/functions/obnova.mjs` (N2 × N3): větve obnovy `firma`
  a `zobrazeni` s očistou (B100-zbytek) i `slovnik` s kontrolou #401 —
  ponechány všechny tři.
- `roadmapa/roadmap.json`: #398–#400 z 22. kola + #401 z N3; #398 a #399
  hotovo (v12.10.4), #400 čeká na zbytek (B138, B77-zbytek, B107, B129, B130).
- `CHANGELOG.md`, `PREDAVKA.md`: zachovány záznamy všech větví.

Kontrola po sloučení: všechny `src/test_*.js` a `netlify/test_*.mjs`
prošly; `mutace.mjs --kontrola` 333 úseků, `mutace_jadro.mjs --kontrola`
189 úseků.

**Celé kolo nad 85374e3 VŠE ZELENÉ (105 min 57 s):** sady 224/0/1
(přeskočen jen `test.js` — shoda s Excelem není v exportu), mutace jádra
189 z 189, mutace serveru 333 z 333, statické kontroly 3 z 3. Podklady:
kopie `/home/user/kng_podklady` s příručkou přejmenovanou na v12.10.4.
Po kole přisloučen jen zápis výsledku kola N1 (4c6a42e, CHANGELOG + PREDAVKA,
bez změny kódu).

## v12.10.3 — #398 „koncová cena 2": B133–B137, B145, B150a (větev claude/koncova-cena-398)

Noční dávka N1 (pokyn J. V. 12. 10. 2026 přes koordinační sezení 22. kola).
Větev z `test-draft` (v12.10.2, d562da1). Roadmapa **#398** (položku přidává
koordinační větev `claude/kolo22-v12.10.2`). Audit 12. 10. 2026 našel pět
vysokých nálezů, ve všech server uložil NOVÝ ZÁMEK odeslané nabídky se
sníženou cenou, bez slevy, s razítkem „shoda" (přepočítal tatáž
zmanipulovaná data). Společný kořen: vstupy jádra, které ovlivňují cenu,
hlídal jen prohlížeč nebo je server četl jinak než jádro.

- **B134 (vysoká) — záporné procentní rezervy.** `rezervaZakladPct = −0,999`
  + zámek = 200 „shoda", −99,9 %; prošlo i v běžném UI. Nově
  `uloZaporneVZadani` hlídá všechna procenta a počty zadání OCK, které jádro
  násobí (`ULO_ZADANI_BEZ_ZAPORU`: rezervy, oplechování ostatní kg/hod,
  engineering, stříšky, atypická zámečnická práce a sazba, světlíky,
  nástupiště, můstky) a výšky pásů opláštění — server (400, nikomu) i zábrana
  `zapornaPolozka`. Úplnost seznamu proti `DEFAULT_ZADANI` drží test. Pole %
  rezerv a oplechování mají `min="0"`.
- **B133 (vysoká) — dvoukrok přes ceník sestavení.** Varianta, jejíž část je
  celý ceník sestavení (uložená verze i jiná varianta), už nevstupuje do
  skupin B128 po položkách — smí zůstat celá sestavením, nebo přejít na celou
  zveřejněnou verzi. Klon varianty s celým ceníkem sestavení projde.
  Výjimka B113 pro novou zakázku zůstává (test e4) — otázka v předávce.
- **B135 (vysoká) — číslo v ceníku jako text s čárkou.** Ve vstupech jádra
  (ceník varianty OCK i PROJ, přepisy, vlastní položky, rezervy, hodiny N56,
  % sekce PROJ, doprava) jen číslo, prázdno nebo text s desetinnou tečkou
  (`uloCisloJadro`) — „100,0" je pro `+x` NaN → 0. B112 porovnává sémantikou
  jádra. **B145** (nízká): přepis „12,5" stejným pravidlem; test B127, který
  ho výslovně pouštěl, opraven.
- **B136 (vysoká) — volný klíč ceníku obešel #395 V3.** `ukazkoveMaCisla`
  počítá cenu jen v klíčích vzoru (`DEFAULT_CENIK` / `DEFAULT_CENIK_PROJ`),
  pojistka nového zámku po částech se vzorem dané části.
- **B137 (vysoká) — rozměry šachty ≤ 0.** Pravidla z klientské zábrany
  „rozmery" přesunuta do `kontrolyRozmery` (kontroly.js) a čte je i server:
  záporné / nečitelné číslo a zdvih nad 99 m → 400 vždy, nikomu; nula
  a prázdno (rozpracovaná zakázka, `ZADANI_NOVA`) se uloží, nový zámek strany
  OCK z nich nevznikne (ani administrátorovi; zakázka jen projekce a dokumenty
  PROJ výjimkou). Detekční skript hlásí B137 a B134.
- **B150a — mutace B128** nahrazovala kód neexistující proměnnou `kand`
  (zabila se ReferenceError). Nově významová: jedna skupina ze všech
  kandidátů. Dalších 20 významových mutací pro #398, opraveno 5 mutací,
  jejichž hledaný úsek se změnil.
- **Nezávislá revize (dva čtecí subagenti, každý jinou čočkou)** našla další
  cesty téže třídy; každý vysoký nález potvrzen druhým pokusem a opraven:
  - **N1 (vysoká)** `cenik.jenZahr` — značka „jen zahraniční řada" skryje
    tuzemské řádky (jádro `jenTetoRady`), B112 ji přeskakoval: OCK −26 až
    −88 %, zámek „shoda". Nově smí ceník varianty nést jen značky, které má
    některý kandidát (uložená verze, jiná varianta, zveřejněná verze a její
    zahraniční odchylky, `CENIK_JEN_ZAHR`) — `uloJenZahrNavic`; tvar
    `{ cesta: true }` hlídá typová kontrola.
  - **N2 (vysoká)** `ock.zadani.nepocitat` — vyřazené řádky OCK (plní je jen
    matice Výchozí správce) server nehlídal: −5 až −19 %. Nově
    `uloModelProblemy`: role mimo administrátora jen podmnožinu seznamu
    z uložené verze, jiné varianty nebo z matice `vychozi`.
  - **N3 (vysoká)** ruční sazba pásu opláštění „jiné" (`pasy[].naklad`)
    záporná: −43 %. Nově v `uloZaporneVZadani` (nikomu); pole má `min="0"`.
  - **Model 1** (`ock.fixes` nepravda, zmrazený #332 jen v UI) — server ho
    roli mimo administrátora pustí jen tam, kde ho nese uložená verze (klon:
    jiná uložená varianta); převod na Model 2 smí každý; typ pravda/nepravda.
  - **N4 (střední)** dotisk nabídky OCK k zámku PROJ z nulové šachty obešel
    zrcadla V3 a B137 — nová strana z dotisku se posoudí jako nový zámek.
  - Mutace: 10 nových, `#395: zábrana posuzuje i uložený zámek` přesměrována,
    „revize N1 (6. 10.): podpis položky čte text s čárkou" vyřazena —
    od B135 ekvivalentní. Test `test_ukazkove_znacky.js` dostal skutečný
    klíč vzoru PROJ místo smyšleného `projHodKc`.
- Testy: nová sada `netlify/test_koncova_cena.mjs` (55: před opravou 13 OK /
  42 FAIL — všechny útoky 200, po opravě 55/0; revizní část 18 testů: před
  revizní opravou 7 OK / 11 FAIL, po ní celá sada 73/0); jednotkové v
  `test_uloziste.js` a `test_kontroly.js`. Fixtury zámků v `test_prava`,
  `test_obnova` a `test_stary_tvar` dostaly vyplněné rozměry šachty
  (zamykaly z nulových — zábrana by je v prohlížeči nepustila).
  `BEZPECNOST_MEZE.md` doplněna (výjimky administrátora).
- **Celé kolo nad 7291879 VŠE ZELENÉ (102 min 44 s):** sady 223/0/1,
  mutace jádra 169/169, serveru 278/278, statické 3/3. (Kolo nad 359b282
  mělo 277/278 — mutace #340 se chytala přes ceník, který od B135 hlídá
  přísnější kontrola; doplněn test, 7291879.) Fixtura `overit_online.mjs`
  (B59) dostala rozměry šachty — zamykala z nulových.

## v12.10.3 — #399 + část #400: šablony, obnova, integrita (audit 12. 10. 2026; větev claude/sablony-399)

Noční dávka N2 (pokyn J. V. 12. 10. 2026 přes koordinační sezení 22. kola).
Větev z `test-draft` (v12.10.2).

- **B139 (střední) — prefix s ne-ASCII písmenem.** Kontrola obsahu šablony
  znala jen prefix `[\w.-]+:`; `<é:instrText> INCLUDETEXT`, `<é:fldSimple>`,
  `<é:Relationship … attachedTemplate>`, `<é:altChunk>` prošly a generátor
  pole přenesl do nabídky. Prefix je teď cokoli až po dvojtečku (prvky
  i atributy).
- **B140 (střední) — návnada atributu.** `q:instr=" PAGE "` před
  `w:instr=" INCLUDETEXT …"` (q přes mc:Ignorable) ukázal kontrole PAGE. Platí
  jen atribut s prefixem prvku; jiný se stejným místním jménem je vada.
- **B141 (střední)** — zakázaná pole DATABASE a RD; hromadná korespondence
  s `connectString`/`query`/`udl` a vztahy `mailMergeSource` se odmítnou.
- **B142 (nízká) — rozdílné čtení konce ZIPu.** Čistý archiv + škodlivý za
  ním (komentář EOCD o 1 B delší než zbytek): kontrola četla čistý, Python
  `zipfile` i `unzip` škodlivý. Nevěrohodný podpis konce za věrohodným
  koncem archiv odmítne. Revize (R1): podpis náhodou uvnitř dat položky
  (obrázek) čistou šablonu neodmítne. Mutace na věrohodnost EOCD a souhrnný
  strop rozbalení včetně STORE.
- **B143 (nízká, DoS)** — neuzavřený `<w:instrText>`, `<Relationship` bez
  `>`, komentář, CDATA, instrukce i dlouhé jméno atributu: kvadratický čas
  (1 MB → 149 s). Rozbor jde jedním průchodem, neuzavřené je vada (1 MB pod 3 s).
- **B100-zbytek (nízká)** — obnova zapisuje firmu přes `firmaLzeZverejnit`
  a `firmaKZverejneni`, zákazníky přes `zakaznikOciste` (klíč `z/<klíč>`)
  a matici zobrazení přes `zobrazeniOciste` — stejně jako běžné cesty.
- **B144 (nízká)** — vlastní položky OCK a PROJ se stropem 1e9 jako přepisy
  (1e300 × 1e300 → Infinity/NaN).
- **B146 (nízká)** — přísné porovnání nového zámku počítá pole řádků mimo
  jádro nahrazené objektem, `null`, vynechané nebo navíc jako rozdíl.
- **B147 (info)** — náhled obnovy upozorní na platnou šablonu, která po
  obnově nebude použitelná; v úložišti šablon se obnoví jen `rejstrik`
  v očekávaném tvaru a `data/<typ>/<verze>`.
- **B148 (info)** — úprava kontaktu (i cizího) zapíše `zmenil` {kdo z relace, kdy}.
- **B149 (info)** — obnova ověřuje zámek volně: vědomá mez v `BEZPECNOST_MEZE.md`.
- **B150** — mutace B131 pro všech 10 funkcí (test i s tělem `[]` a číslem);
  `overit_xss.mjs` vykreslí dialog Kontakt… a otráví usazení OCK; smazán
  mrtvý řádek v `obnova.mjs`; `test_profil.mjs` v sadách serverových mutací.

Celé kolo nad 5680476 (96 min): mutace jádra 188 z 188, serveru 275 z 275,
statické 3 z 3; sady 221/1/1 — jediné selhání `overit_manual` (kopie příručky
v podkladech nesla v12.10.2). Po přejmenování kopie sady + statické znovu:
**222/0/1, VŠE ZELENÉ**.

## v12.10.3 — slovník se ukládá na server jako ceník; hromadné převzetí; tabulka Vocabulary J. V. (větev claude/slovnik-hromadne)

Zadání J. V. 12. 10. 2026: v Nastavení → Slovník musel u „Odlišné znění (44)"
přebírat řádek po řádku a po novém nahrání chtěla aplikace totéž znovu —
převzetí žilo jen v paměti relace. „Potřebuji, aby se slovník ukládal
stejným způsobem jako ceník." Větev z `test-draft` (v12.10.2). Roadmapa #401.

- **Tabulka J. V. v zabudovaném slovníku.** `SLOVNIK_ENG_2026-10-12.xlsx`
  (mimo repozitář) porovnána s `PREKLAD`: rozdílných 44 (23 hesel), doplnit 0,
  nových 0 — vše převzato přímo do `src/preklad.js`. Po změně 0 / 0 / 0,
  shodných 2715. Např. „POVRCHOVÁ ÚPRAVA KONSTRUKCE" EN → STEEL STRUCTURE
  FINISHING, „není součástí nabídky" EN → Out of scope.
- **Hromadné „Převzít všech N z tabulky"** v bloku Odlišné znění (jen
  administrátor, jedno potvrzení s počtem).
- **Zveřejněný slovník (`/api/slovnik`).** GET každý přihlášený, POST
  zveřejnit jen Administrátor (role z relace). Zveřejňují se odchylky od
  slovníku zabudovaného v sestavení — verze, kdy, kdo, poznámka, historie
  20 verzí. Server kontroluje tvar: objekt, klíč neprázdný ≤ 1000 znaků
  (zabudovaná hesla mají až 419 — zadání říkalo „např. 300"), žádné
  `__proto__` / `constructor` / `prototype`, trojice textů ≤ 2000 bez
  řídicích znaků, nejvýš 5000 hesel, tělo ≤ 1 MB (413), tělo `null` 400.
  Klient po přihlášení položí platný slovník přes zabudovaný, po odhlášení
  vrátí zabudované znění. Nastavení → Slovník ukazuje platnou verzi,
  nezveřejněné změny a tlačítko **Zveřejnit slovník** (s poznámkou).
  Režim bez online (složka, konfigurace) beze změny.
- **Záloha a obnova.** Slovník je v ruční záloze i nočním otisku; obnova má
  část „Slovník překladů" s touž kontrolou (vadná platná verze se přeskočí,
  vadné starší vypadnou).

Testy (před → po): `netlify/test_prava.mjs` 721 → 763 / 0; `netlify/test_obnova.mjs`
192 → 202 / 0; `src/test_slovnik.js` 41 → 63 / 0; `overit_slovnik.mjs` nový
14 / 0 (před změnou 2 ✕ a pád); `overit_online.mjs` 200 → 213 / 0;
`overit_xss.mjs` 299 → 311 / 0 (otrávený zveřejněný slovník, 9 náhledů EN).
Mutace serveru +18 (ověřeno samostatně 18 / 18 chycených).
**Ověřeno:** celé kolo nad 2baf471 (79 min 50 s) VŠE ZELENÉ: sady 223 prošlo,
0 selhalo, 1 přeskočeno (test.js — není v exportu); mutace jádra 169 z 169,
serveru 267 z 267; statické 3 z 3.

**Nezávislá revize #401 (12. 10. 2026) — opraveno ve stejné větvi:**
N1 (střední) zámek odeslané nabídky nese razítko slovníku { verze, otisk };
dotisk v cizím jazyce po změně slovníku upozorní (znění dnešní, částky
zmrazené), staré zámky bez razítka se neptají, razítko drží server (B62).
N2 klíče `__proto__:` / `__proto__.` (po prekladNorm `__proto__`) se
odmítají, `PREKLAD_IDX` je bez prototypu, prekladNastav/Import zakázané
klíče nepustí. N3 U+FFFE/U+FFFF odmítá slovník a odstraňuje `xmlEsc`.
N4 vymazaný překlad zabudovaného hesla → 400 (i v obnově). N5 strop
záznamu 2 MB v bajtech UTF-8. N6 strop těla v bajtech. N7 verze v obnově
jen celé číslo 1 … 1 000 000. Testy před → po: test_prava 764/11 → 775/0,
test_obnova 203/8 → 211/0, test_slovnik 63 + pád → 83/0,
test_docx_preklad 51/1 → 52/0, overit_slovnik 14 + pád → 21/0. Mutace
serveru +12, jádra +1; mutace syrového `__proto__` vyřazena (ekvivalentní
po N2 — první kolo 278 z 279). **Kolo nad d493a2b (82 min 27 s) VŠE
ZELENÉ:** sady 223 / 0 / 1 přeskočeno, mutace jádra 170 z 170, serveru
278 z 278, statické 3 z 3.

---

## v12.10.2 — B126, B127, B128, B131 z auditu 6. 10. 2026; šablony CN v15 (větev claude/b126-cn-v15)

Pokyn J. V. 12. 10. 2026: „připrav mi šablony v15, souhlasím s ostatními
výchozími návrhy, začni B126". Větev z `test-draft` (v12.10.1). Roadmapa #397.

- **B126 (vysoká) — profil, který není objekt.** `profily.<x> = null`,
  chybějící klíč, text nebo `profily = {}` prošly kontrolou typů i pojistkou
  #372 (filtr bral jen objekty); jádro dosadilo nulovou hmotnost i plochu,
  zábrana „profilNeznamy" mlčela a cena klesla bez schvalování;
  `profily = null` výpočet shodil. Oprava v `profilyNezname` (jádro = zábrana
  v prohlížeči i server #372): povinný profil bez rozměru je neznámý
  („rozměr chybí"), lemování jen u exteriérové šachty; výpočet s `profily`
  bez objektu nepadá. Platná data bajt po bajtu beze změny (otisky).
- **B127 (střední) — typ ručních přepisů.** `mnozstviPrepis` a `cenyPrepis`
  procházejí stejnou kontrolou čísla jako vlastní položky (text s exponentem
  „-1e3", pole, nečíselný text → 400) a strop 1e9 (obří hodnota →
  nekonečno v ceně). Platí pro všechny role.
- **B128 (střední) — ceník varianty jako celek.** Kontrola B112 brala každou
  položku zvlášť z kterékoli zveřejněné verze (chybějící klíč starší verze
  = 0): po zveřejnění hodin statiky opláštění šlo uložit platný ceník
  s nulovými hodinami. Nově musí ceník části sedět s jednou skupinou:
  uložená verze varianty (nebo jiná uložená varianta) po položkách s platným
  ceníkem (přepočet vybraných položek zůstává), anebo kterákoli zveřejněná
  verze celá.
- **B131 (nízká) — tělo JSON `null`.** Deset serverových funkcí (zakázky,
  zákazníci, uživatelé, program, firma, zobrazení, popisy, šablony, obnova,
  analytika) dřív spadlo na výjimku (500), `zobrazeni` a `popisy` vracely 200;
  nově 400 „Vstup musí být objekt JSON".
- **Šablony CN v15 (+EN/DE/FR)** — `node nastroje/vyrob_sablony.js --cn-v15`:
  v14 + řádky „USAZENÍ OCK – LEVÁ / PRAVÁ BOČNÍ STĚNA" (`{{TS_USAZENI_LEVA}}`,
  `{{TS_USAZENI_PRAVA}}`, #396). Kontrola obsahu bez vad. Nahrát až
  s aplikací ≥ v12.10.1 (v30.9.1 symboly nezná).

Testy (před opravou → po opravě): `src/test_profil_neznamy.js` 23/7 → 30/0;
`netlify/test_prava.mjs` 703/4 → 707/0 (B126), 708/9 → 717/0 (B131),
720/1 → 721/0 (B128); `netlify/test_zaporne.mjs` 25/4 → 29/0 (B127);
`src/test_usazeni_nabidka.js` +3 nad CN v15 (s KNG_PODKLADY). Mutace
jádra +2 (B126; kotva #372 převedena), serveru +5 (B127 2, B128 1, B131 2);
mutace B112 „zveřejněný ceník se nebere za kandidáta" převedena na skupiny
B128 a mutace #395 N3 vyřazena — útok, který hlídala, od B128 odmítne už
kontrola ceníku jako celku (N3 zůstává jako druhá vrstva). Kolo nad c19ea55:
sady 222/0/1, mutace jádra 169 z 169, serveru 248 z 250 (právě tyto dvě).
**Ověřeno:** kolo nad 179b00c (sady + mutace serveru; jádro se od c19ea55
nezměnilo) VŠE ZELENÉ: sady 222 prošlo, 0 selhalo, 1 přeskočeno, mutace
serveru 249 z 249, statické 3 z 3; mutace jádra 169 z 169 z kola nad c19ea55.

---

## v12.10.1 — usazení OCK v nabídce podle specifikace, kontakt účtu upraví správce (větev claude/nabidka-usazeni-telefon)

**Ověřeno:** kolo nad ba8fbb1 — sady 221/1 (jen `test_nabidka.js`: čekala 13
řádků základních parametrů, usazení bez volby teď záměrně mizí → 11),
mutace serveru 245 z 245; po úpravě testu kolo nad 3db9bb7 (bez mutací
serveru — server se nezměnil) VŠE ZELENÉ: sady 222 prošlo, 0 selhalo,
1 přeskočeno, mutace jádra 167 z 167, statické 3 z 3. Telefon D. Sikory
opravil J. V. v profilu 12. 10. (chyba byla v účtu).

Pokyn J. V. 12. 10. 2026 (mail D. Sikory a sken specifikace × nabídky).
Větev z `claude/cenik-395` (v8.10.1). Roadmapa #396.

- **Usazení OCK v nabídce OCK jako v technické specifikaci.** Specifikace má
  vedle „USAZENÍ OCK – BOČNÍ STĚNY" i levou a pravou boční stěnu zvlášť —
  do nabídky (Word i online) se nepropisovaly a řádky bez volby se v online
  nabídce vypisovaly s pomlčkou. Nově: online nabídka má řádky LEVÁ
  a PRAVÁ BOČNÍ STĚNA; řádek usazení bez volby (výchozí „ -") se v nabídce
  nezobrazuje (Word to dělal už dřív pro pomlčku). Word se šablonou bez
  symbolů `{{TS_USAZENI_LEVA}}` / `{{TS_USAZENI_PRAVA}}` (CN v14 a starší,
  i EN/DE/FR) dostane levou a pravou stěnu do řádku „boční stěny" jako
  „levá – …; pravá – …" (EN left/right, DE links/rechts, FR gauche/droite).
  Šablona, která symboly mít bude, je dostane do vlastních řádků.
  Čelní stěna zůstává (předvyplněná věta z kalkulace).
- **Telefon v bloku „Vypracoval".** Bere se z účtu zpracovatele (přihlášený
  uživatel) — v kódu žádné jiné číslo není a server účet čte při každém
  požadavku čerstvě; chybné číslo je tedy uložené v účtu. V tabulce
  Nastavení → Uživatelé byl telefon jen vidět, opravit ho mohl jen sám
  uživatel v Můj profil. Nově u každého účtu tlačítko **Kontakt…** —
  správce opraví titul, funkci a telefon (server to uměl od #145; profil
  hlavního účtu jen on sám, B28).

Testy: `src/test_usazeni_nabidka.js` (nová sada) před opravou 2 prošlo /
12 selhalo, po opravě 14 / 0; `overit_online.mjs` +3 kontroly (před
opravou harness spadne na chybějícím tlačítku), 200 / 0.

---

## v8.10.1 — #395: zbytky nezávislé revize 6. 10. 2026 (větev claude/cenik-395, neuvolněno)

**Ověřeno celým kolem:** nad 518532b VŠE ZELENÉ (84 min 57 s): sady 221
prošlo, 0 selhalo, 1 přeskočeno (test.js), mutace jádra 167 z 167, mutace
serveru 245 z 245, statické 3 z 3; se všemi 15 firemními šablonami.

Větev `claude/cenik-395` z `test-draft` (v6.10.1). Pokyn J. V. 8. 10. 2026
„souhlasím s výchozími návrhy, začni #395". Roadmapa #395 → hotovo.

- **V3 (vysoká) — nový zámek z ceníku bez cen nebo za 0 Kč.** Nová zakázka
  obchodníka smí nést ceník sestavení (samé nuly; zakázka založená před
  načtením ceníku — výjimka B113). Server jí ale značky prázdného ceníku
  strhne a klient je podle obsahu nepřidává, takže po znovuotevření
  zábrana `ukazkovyCenik` mlčela; vlastní položka pak určila cenu celé
  nabídky a tisk ji uzamkl — odeslaná nabídka za libovolnou cenu bez
  schválení. **Oprava (`netlify/lib/zakazka_kontrola.mjs`,
  `zamekNovyCenaProblem`):** server odmítne (403) NOVÝ zámek role bez práva
  obou ceníků, když ceník varianty nemá ceny, nebo když cena nabídky
  (strana dokumentu: OCK / PROJ) vyjde nulová — zrcadlo zábran
  `ukazkovyCenik` a `cenaNula`. Hlídá se jen část, jejíž platný zveřejněný
  ceník ceny má. Administrátor a zámky, které už v uložené verzi jsou, beze
  změny. **Odchylka od výchozího návrhu:** výměnu ceníku sestavení za
  zveřejněný server udělat nemůže — zakázku klientovi po uložení nevrací,
  prohlížeč by dál držel nuly a další uložení by B113 odmítl.
- **N2 — trvalá položka (kid) v každém výskytu.** Kontrola B114 brala jen
  první položku s daným kid; druhá se stejným kid nesla libovolnou cenu.
  Hlídá se i starší pole `ock.zadani.volitelneVlastni` (jádro ho čte, když
  sekce Volitelné vlastní položky nemá).
- **N3 — katalog PROJ z uložených variant.** Za katalog trvalých položek
  PROJ se bral ceník příchozí zakázky; ten B112 hlídá po listech, takže šel
  složit z cen jiné uložené varianty (trvalá položka 20 000 → 100 Kč).
  Příchozí ceník se bere jen u role, která ceník PROJ měnit smí.
- **S2** (vyřazení standardní položky + vlastní položka téhož názvu) zůstává
  vědomou mezí — zapsáno do `BEZPECNOST_MEZE.md`.
- **Kontrola šablon (nízké nálezy revize C):** UTF-16 bez BOM se pozná
  i se mezerou nebo koncem řádku na začátku; část v UTF-32 nebo
  s deklarací jiného kódování než UTF-8/UTF-16 (UTF-7 zapíše „<" jako
  „+ADw-") se odmítne (`src/sablona_obsah.js`). Čtení ZIPu
  (`src/docxgen.js`, `zipPrecti`): strop rozbalení 64 MB (ZIP bomba)
  a konec adresáře (EOCD) musí být jednoznačný — podvržený konec
  v komentáři archivu se odmítne (bajty za koncem archivu dál nevadí). Obnova šablon po zápisu ověří soubory
  platných verzí a správce dostane upozornění, když platná verze nemá
  použitelný soubor (`netlify/functions/obnova.mjs`). Všech 15 firemních
  šablon (CN v14 + EN/DE/FR, CN v11, PROJ v3, PROJ v4 + EN/DE/FR, SoD
  realizace a projekce v1 i v2, plná moc) dál projde.

Testy (každý před opravou selže, po opravě projde):
`netlify/test_prava.mjs` 694 / 4 → 698 / 0 (V3) a 699 / 4 → 703 / 0 (N2, N3);
`netlify/test_obnova.mjs` 191 / 1 → 192 / 0; `src/test_sablona_obsah.js`
62 / 5 → 68 / 0 (+1 kontrola, že bajty za koncem ZIPu nevadí). Fixtury
`test_funkce.mjs`, `test_obnova_nanecisto.mjs` a `overit_online.mjs` (P2)
zamykaly obchodníkem zakázku s ceníkem bez cen (stav, který přihlášený
prohlížeč nevytvoří) — dostaly zveřejněný ceník a rozměry šachty. Nové mutace:
serveru +9 (V3 4, N2/N3 4, obnova 1), jádra +5; dvě mutace B114 převedeny
na nové znění.

---

## v6.10.1 — dávky 6. 10. 2026 (integrační větev claude/davka-6-10, neuvolněno do test-draft)

Sloučeny větve `claude/vsg-skn-prepis-skla` (G, D), `claude/audit-b119-b122` (B),
`claude/koncova-cena-374` (A), `claude/sablony-obsah-b115` (C),
`claude/testy-ci-b124` (E) nad `test-draft` (v2.10.1); konflikty jen
v CHANGELOG a seznamu jader `mutace_jadro.mjs`. K tomu drobnosti D. Sikory,
opravy z nezávislé revize a rozbor F. Oddíly níž podle dávek.

**Ověřeno celým kolem:** celé kolo nad b292d32 VŠE ZELENÉ (73 min 13 s):
sady 221 prošlo, 0 selhalo, 1 přeskočeno (test.js — skutečný ceník
v repozitáři není), mutace jádra 162 z 162, mutace serveru 236 z 236,
statické kontroly 3 z 3; s firemními podklady (KNG_PODKLADY: CN v14
+ EN/DE/FR, CN v11, PROJ v3 i v4 + EN/DE/FR, SoD v1 i v2, plná moc,
příručka přejmenovaná na v6.10.1). Předchozí kolo nad 5b3213d (před
opravami z revize) selhalo jen na zadání mutace B59 (úsek změnil B119) —
opraveno. Po kole `git status` čistý, `if (false)` jen v legitimních místech.

## Nezávislá revize oprav A–C (6. 10. 2026) — v integrační větvi claude/davka-6-10

Dva revizoři (jen čtení nad čistou kopií), vysoké nálezy dvakrát nezávisle
přečtené. Opraveno v téže větvi:

- **B119 — vždy přísně.** První verze porovnávala volně, když výsledek
  uváděl jinou verzi aplikace; verzi ale posílá klient → obchvat. Teď nový
  zámek vždy přísně (`src/zamek.js`), viz oddíl dávky B a `BEZPECNOST_MEZE.md`.
- **Kontrola obsahu šablon (B115) — další obchvaty:** CDATA a komentáře
  se před rozborem normalizují (zakázané pole v CDATA, falešný konec pole
  v komentáři), sirotci kódu pole se kontrolují i jednotlivě, atributy
  vztahu `Type`/`Target`/`TargetMode` se čtou přesně a návnadový atribut
  jiné velikosti písmen nebo s prefixem vztah odmítne, pole, jehož typ dodá
  symbol `{{…}}`, se odmítne (`src/sablona_obsah.js`). Test
  `src/test_sablona_obsah.js` 52/6 → 58/0; všech 15 firemních šablon
  (CN v14 + EN/DE/FR, CN v11, PROJ v3, PROJ v4 + EN/DE/FR, SoD realizace
  a projekce v1 i v2, plná moc) projde. Mutace jádra +4.
- **Rejstřík — strop pro všechna textová pole** (N4; dávka B ho dala jen
  adrese): číslo, název akce, objednatel, autor, jméno autora, datum,
  razítko (`src/uloziste.js`). `netlify/test_rejstrik.mjs` 19/2 → 21/0.
- **#374 — doprava sekcí PROJ (V1):** km, ruční příplatek a „mimo Prahu"
  jsou součástí identity B114 (role bez `sloupce.naklad` je proti uložené
  verzi nezmění) a km i příplatek nesmějí být záporné (ani u správce).
- **#374 — záporná `sazbaKc` / `naklad` (V2)** položky PROJ se odmítne
  (vlastní hodinová položka se sazbou mimo ceník snižovala náklad).
- **#374 — duplicitní klíč sekce PROJ (S1)** se odmítne (kontroly viděly
  jen poslední sekci téhož klíče).
- **#374 — čísla v identitě jako v jádře (N1):** „24,0" je pro jádro 0,
  kontrola ho už nebere jako 24.
- Testy `netlify/test_prava.mjs` (blok „Revize 6. 10. 2026"): před opravou
  1 / 6, po opravě 7 / 0; celá sada 691 / 0. Mutace serveru +6, všechny
  chycené.
- **Neopraveno, k rozhodnutí J. V. (roadmapa #395):** V3 — nová zakázka
  s ceníkem sestavení + vlastní položka nastaví cenu libovolně (zákaz
  ceníku sestavení u nové zakázky při zveřejněném ceníku by dnes shodil
  legitimní toky; výchozí návrh: server u nové zakázky obchodníka nahradí
  ceník sestavení zveřejněným, samostatná dávka); S2 — vyřazení položky
  + vlastní položka téhož názvu (vědomá mez); N2/N3 revize A (duplicitní
  kid, `volitelneVlastni`, katalog z příchozího ceníku); nízké nálezy
  revize C (kódování XML bez BOM, strop dekomprese ZIPu, komentář EOCD,
  ověření souborů platných verzí šablon po obnově).

## Drobnosti z mailů D. Sikory (2. a 3. 10. 2026) — v integrační větvi claude/davka-6-10

Pokyn J. V. 6. 10. 2026 („přidej do oprav tyto drobnosti"). Roadmapa #394.

- **S1 — poznámka „*) Termíny pro vyjádření dotčených orgánů …" jen
  s inženýrskou činností.** Hvězdičku nesou jen řádky IČ; nabídka PROJ bez IČ
  (např. jen zaměření a studie) poznámku už netiskne (online nabídka
  a náhled, `src/nabidka_proj.js`). Wordová šablona PROJ má poznámku pevně
  v textu — tam zůstává.
- **S2 — „Co není součástí dodávky" v EN/DE/FR začíná velkým písmenem.**
  Hodnoty `TS_NENI_*` v cizím jazyce dostanou velké první písmeno (online
  i Word); česká nabídka beze změny (`src/nabidka.js`).
- **S3 — „Po milnících" anglicky „Follow project milestones"**
  (`src/preklad.js`). Záruka „60 měsíců" se v testu překládá už od
  K18-N93 (v2.10.1) — D. Sikora zkoušel ostrou v30.9.1.
- **S4 — název souboru v jazyce nabídky:** EN `PRICE_QUOTATION_…`,
  DE `ANGEBOT_…`, FR `DEVIS_…` (OCK i PROJ, přípona jazyka zůstává);
  česky dál `NABÍDKA_…`.
- Test `src/test_sikora_drobnosti.js`: před úpravou 7 prošlo / 13 selhalo,
  po úpravě 20 / 0. `src/test_docx_preklad.js` upraven na velké písmeno
  (51 / 0).

## Dávka E — testy a CI (B124, B125), 6. 10. 2026 — v integrační větvi claude/davka-6-10

- **B125 (informativní) — CI:** `.github/workflows/testy.yml` má
  `permissions: contents: read`, akce připnuté na celý SHA commitu (značka
  v komentáři: checkout v5.1.0, setup-node v5.0.0, setup-python v6.3.0,
  upload-artifact v5.0.0) a Playwright pevně 1.56.1. Hlídá
  `src/test_build_info.js`: před úpravou 42 / 3, po ní 45 / 0.
- **B124 (informativní) — `overit_xss.mjs` otravuje data období:** plán
  plateb v zakázce (vlastní milník = volné znění splátky), firemní plán
  plateb (katalog milníků), číselník dodatkových textů i s jazykovými
  variantami (klíč i texty), materiál „jiné" v opláštění po stěnách a nově
  i **tiskové náhledy** (nabídka OCK a PROJ, krycí listy OCK a PROJ ve dvou
  verzích, detail výpočtu, porovnání variant — do rámu v téže stránce,
  dialogy se odpovídají samy, strop 4 s na náhled, zábrany dokumentů se pro
  účel testu vypínají). Vada v kódu nenalezena; sada 215 → 299 kontrol,
  0 selhalo. Pojistka proti prázdnému testu: u každé oblasti se ověřuje, že
  se payload do stránky (i do náhledů) opravdu dostal, a že se otevřelo
  všech 9 náhledů — první běh bez cen PROJ a bez parametru verze krycího
  listu tyto kontroly shodil (47 selhání), než se přípravná data opravila.

## větev claude/vsg-skn-prepis-skla (neuvolněno)

Dávka D (6. 10. 2026) z `test-draft` (v2.10.1). Rozhodovací list otevřených
otázek s výchozími odpověďmi: `podklady/ROZHODNUTI_2026-10-06.md`.

### #392 — příplatky VSG a SKN z ručně přepsané plochy skla

- Navazuje na P3 (K19-N105): ve standardním režimu se příplatek **Sklo VSG
  s mléčnou fólií** počítá z efektivního skla celkem (přepis řádku skla
  boků/zad a čelního skla, jinak vypočtená plocha) a **Sklo SKN 176 (EXT)**
  z efektivního skla boků a zad. Bez přepisu beze změny (Model 1 1:1,
  `nastroje/porovnani_modelu.js` před i po shodný), režim po stěnách beze
  změny, ruční přepis množství příplatku má dál přednost.
- Detail výpočtu, krok 8 Zasklení: při přepisu skla řádek „Příplatek … —
  z ručně přepsané plochy skla"; příplatky nesou značku `zPrepisuSkla`
  (SKN jen při přepisu skla boků).
- Testy: nová sada `src/test_vsg_skn_prepis.js` — před opravou 32 OK /
  24 FAIL, po opravě 56 OK / 0 FAIL; `src/test_prepis_skla_prace.js`
  53/0 (kontrola „VSG beze změny" obrácena na „VSG z přepsané plochy").
  Mutace jádra +5 (#392), dvě mutace N50 přizpůsobené novému tvaru kódu.

### K20-N1 — dodatek k #383 (vědomé chování)

- Rozpracovaná varianta PROJ s uloženou předvolbou „Záloha" **bez
  uloženého procenta** se řídí aktuálním firemním procentem — po #383 tedy
  70/30 místo dřívějších 50/50, včetně dopočtu plateb SoD PROJ. Platí
  rozhodnutí J. V. k #383 („výchozí plán platí i pro rozpracované
  zakázky … jako každá změna firemního plánu"). Ručně zvolené procento
  (i 50 %) platí dál, zamčené varianty nesou snímek plánu a nemění se,
  vlastní plán firmy (Nastavení → Firma) má přednost. Kód beze změny;
  zachovat 50 % by šlo jen na výslovný pokyn J. V.
- Test `src/test_plan_plateb_k20n1.js` 15/0; s novou mutací jádra
  „K20-N1: záloha bez procenta zůstane na 50 %" 11/4.
## větev claude/audit-b119-b122 (neuvolněno)

Dávka B (6. 10. 2026) z `test-draft` (v2.10.1): nálezy bezpečnostního auditu
20. kola (2. 10. 2026), výchozí ANO z rozhodovacího listu. Roadmapa #393.

- **B119 (střední) — přísné ověření nového zámku.** Uvolnění P6 přeskakovalo
  řádek zmrazeného výsledku bez protějšku: příplatek s vymyšleným
  `origNazev` a jinou cenou dostal razítko „shoda" a dotisk odeslané nabídky
  bral podvrženou cenu. Nový zámek při uložení se teď porovnává přísně,
  pokud výsledek spočítala tatáž verze jako server: nespárovaný řádek je
  rozdíl (i řádek, který chybí), pole po pořadí s jinou délkou je rozdíl
  a k jádru přibyly `ock.souhrn.priplatkyCena` a
  `ock.souctySekci.volitelne.sMarzi`. Porovnává se přísně **vždy** —
  nezávislá revize 6. 10. ukázala, že první verze opravy (volně, když
  výsledek uvádí jinou verzi aplikace) šla obejít, protože verzi posílá
  klient. Stránka načtená před nasazením verze, která mění tvar výsledku,
  může dostat „nesouhlasí" (mez v `BEZPECNOST_MEZE.md`). Starší zámky
  a obnova beze změny (`src/zamek.js`, `netlify/lib/zakazka_kontrola.mjs`).
  Test `netlify/test_prava.mjs` (blok B119) před opravou 3 OK / 5 FAIL, po
  opravě 8 / 0; celá sada 684 / 0. Mutace serveru 4 (všechny chycené).
- **B120 (střední) — obnova přenese jazykové varianty dodatků.** Obnova
  části „popisy" skládala záznam jen z `texty`, `kdo`, `kdy`; `jazyky`
  (EN/DE/FR, #379) se ztratily. Teď projdou `popisyJazykyOciste` a drží se
  jen u položek s českým textem (`netlify/functions/obnova.mjs`). Test
  cyklu záloha → obnova → shoda v `netlify/test_obnova.mjs`: před opravou
  2 OK / 3 FAIL, po opravě 5 / 0 (sada 185 / 0). Mutace serveru +2.
- **B121 (nízká) — adresa v rejstříku se stropem a kontrolou typu.**
  `uloRejstrikAdresa` (strop 300 znaků, jiný typ než text nebo číslo dá
  prázdnou adresu) v záznamu, normalizaci i dávkovém doplnění starších
  záznamů (`src/uloziste.js`, `netlify/functions/zakazky.mjs`). Test
  `netlify/test_rejstrik.mjs`: před opravou 15 / 3, po opravě 18 / 0.
  Mutace serveru +2.
- **B122 (nízká) — symbol v uživatelském textu plateb se nerozvine.**
  Řádky seznamu plateb (vlastní milník, katalog milníků, volné znění
  splátky) se vkládají před hlavním průchodem náhrady; `nahradPlaceholdery`
  teď zapisuje složenou závorku z hodnoty jako znakovou entitu `&#123;`
  (Word ji vykreslí doslova, další průchod ji za symbol nepovažuje).
  Test v `src/test_plan_plateb_sod.js`: před opravou 3 / 2, po opravě 5 / 0.
  `docxgen.js` patří od teď k jádru mutací (`mutace_jadro.mjs`), mutace +1.
## větev claude/koncova-cena-374 (neuvolněno) — dávka A: #374 „koncová cena bez schválení" (B113, B114), 6. 10. 2026

Dávka A koordinačního sezení 6. 10. 2026 (výchozí odpovědi schválené
konvencí; doporučení auditů 30. 9. a 2. 10. 2026). Větev z `test-draft`
(v2.10.1 + PREDAVKA); o sloučení do `claude/davka-6-10` rozhoduje
koordinační sezení. Roadmapa #374 → priorita vysoká, stav hotovo.

### B114 — identita položek PROJ a cena trvalých položek hlídá server

- **Příčina:** B112 hlídal jen přepisová pole. Jádro PROJ bere hodnotu
  z dat zakázky, když ceník klíč nemá (`sazba` → `sazbaKc`, `fixKey` →
  `cena`), takže obchodník ručním požadavkem přepsal klíč sazby na
  neexistující + `sazbaKc=1`, odebral `fixKey` + `cena=1` nebo vynuloval
  hodiny a rezervu — projekce −35 až −65 %, vše 200. Totéž cena trvalé
  položky s `kid` (OCK i PROJ).
- **Oprava (`src/uloziste.js`, `uloCenikProblemy`):** role bez práva
  `sloupce.naklad` nezmění proti uložené verzi (nová varianta: výchozí
  zadání, jiná uložená varianta) u standardní položky PROJ `typ`, `sazba`,
  `sazbaKc`, `fixKey`, `cena`, `hodiny`, `rezerva`; standardní položku
  nesmaže ani nepřeznačí na vlastní. Trvalá položka s `kid`: přítomná musí
  nést hodnoty z uložené verze, jiné varianty nebo katalogu (PROJ: ceník
  varianty a zveřejněné ceníky; OCK: zveřejněný katalog a katalog
  sestavení — u OCK jen jednotková cena), smazat ji smí. Vlastní položka
  (`vlastni:true` bez `kid`) dál smí vše. Administrátor smí vždy.
  Vyřazení položky (rozsah, ne cena) se nehlídá — `BEZPECNOST_MEZE.md`.
- **UI (`src/ui/kalk_ock.js`, `radekKalk`):** cenu trvalé položky OCK
  v hlavních sekcích mohl obchodník přepsat (u volitelných a v PROJ ne) —
  sjednoceno: cena jen administrátor, obchodník množství a smazání jen
  v této zakázce.

### B113 — celý ceník sestavení a projekce za 0 Kč

- **Příčina:** výjimka „celý ceník sestavení" (`uloCenikProblemy`) platila
  pro každou zakázku; server značky ukázkového ceníku před uložením strhne,
  takže obchodník nahradil ceník uložené varianty nulami (200) a protože
  PROJ = 0 Kč v kombinované nabídce zábranu `cenaNula` nespustilo, dokument
  PROJ vznikl.
- **Oprava:** výjimka jen pro novou zakázku a pro variantu, jejíž uložená
  verze ceník sestavení sama nese; jinak 403. Zábrana `cenaNula`
  (`src/kontroly.js`) zastaví dokumenty PROJ (nabídka, náhled, SoD, krycí
  list PROJ) i v kombinované nabídce, když projekce má co prodávat
  (položka ani vyřazená, ani vypnutá nulou) a vyjde 0 Kč. Dokumenty OCK
  nezastaví. **Počet pravidel kontroly beze změny: 32.**

### B117 a bod 4 B96

- B117 (zaokrouhlení z výčtu dolů podteče minimální marži nejvýš o krok − 1)
  zapsáno jako vědomá mez do `BEZPECNOST_MEZE.md`.
- Bod 4 B96 (marže z koncové ceny i bez slevy) — jen návrh
  `podklady/NAVRH_B96_MARZE_2026-10-06.md`, kód beze změny.

### Testy

- `netlify/test_prava.mjs`, oddíl „#374 (B113, B114)": 31 nových testů —
  před opravou 660 prošlo / 16 selhalo (všech 16 útoků 200), po opravě
  676 / 0. Dvě starší fixtury obchodníka (B45 název sekce, B51 tvar kid
  příplatku) narážely na nové pravidlo (zadání bez standardních položek,
  příplatek mimo katalog) — převedeny pod správce, ověřují tvar, ne práva.
- `src/test_kontroly.js`: 5 nových testů zábrany PROJ za 0 Kč — před
  opravou 134 / 1, po opravě 135 / 0.
- Mutace serveru +8 (B113, B114), mutace jádra +2 (B113 v `kontroly.js`).
## větev claude/sablony-obsah-b115 (neuvolněno) — B115, B116, B100 kontrola obsahu šablon, 6. 10. 2026

Dávka C koordinačního sezení 6. 10. 2026 (doporučení auditu 30. 9. 2026, výchozí ANO). Větev z `test-draft` (v2.10.1); o sloučení do `claude/davka-6-10` rozhoduje koordinační sezení.

### B115 (střední) — kontrola obsahu šablony (B99) byla obejitelná

- **Příčina:** `src/sablona_obsah.js` dekódoval jen pět pojmenovaných entit (ne `&#NN;` / `&#xNN;`), `TargetMode` porovnával syrově, pole hledal jen s prefixem `w:` a jen ve `word/<jeden segment>.xml`, vložené objekty jen ve `word/embeddings/` a pole `LINK` neznal. Audit 30. 9. doložil pět obchvatů, kterými se útok B99 (vzdálená šablona s makry, únik otisku hesla NTLM) plně obnoví.
- **Oprava:** entity jako v XML (pojmenované i číselné, jedním průchodem); atributy i s „>" v uvozovkách; prvky a atributy bez ohledu na prefix; prochází se každá část ZIPu, která je XML podle obsahu (i mimo `word/`, i pod jiným názvem, i v UTF-16); vztah je vnější i bez `TargetMode`, když cíl nese schéma nebo síťovou cestu; zakázané typy vztahů rozšířené o ActiveX/VBA data; `embeddings/`, `oleObject*`, `vbaProject*`, `activeX` v kterékoli složce; typ obsahu oleObject/activeX; prvky OLEObject, altChunk, subDoc; pole se skládají po celých kódech (fldChar begin/separate/end, vnořená pole) — zakázané INCLUDETEXT, INCLUDEPICTURE, INCLUDE, IMPORT, LINK, DDE, DDEAUTO a pole, jehož typ dodá vnořené pole; DOCTYPE/ENTITY se odmítá.
- **Testy:** `src/test_sablona_obsah.js` 33/19 → 52/0 (20 obchvatů včetně pěti z auditu, 4 legitimní tvary, které projít musí); s `KNG_PODKLADY` navíc 13 firemních šablon (CN v14 + EN/DE/FR, CN v11, PROJ v3, PROJ v4 + EN/DE/FR, SoD realizace, SoD projekce, plná moc) — všechny projdou (s podklady 46/19 → 65/0). Bez podkladů se část přeskočí. `netlify/test_sablony.mjs`: obchvat s číselnými entitami → 400.
- **Mutace jádra:** `sablona_obsah.js` přidán mezi jádra `mutace_jadro.mjs`, +11 mutací (entity, prefix, rozsah částí, embeddings, LINK, „>" v atributu, vnořené pole, cíl bez TargetMode, UTF-16, DOCTYPE, rozdělený kód pole).

### B116 (nízká) — vrácení starší verze šablony bez kontroly obsahu

- **Oprava:** `netlify/functions/sablony.mjs`, akce `vratit` — soubor vracené verze projde touž kontrolou jako nové zveřejnění; vadná verze → 400, nová verze nevznikne.
- **Testy:** `netlify/test_sablony.mjs` 26/2 → 28/0 (vadná v1 podstrčená do úložiště jako po zveřejnění před B99). Mutace serveru +1.

### B100 (střední) — obnova šablon ze zálohy bez kontroly obsahu

- **Oprava:** `netlify/functions/obnova.mjs` — soubory šablon (`data/…`) ze souboru i z otisku projdou kontrolou obsahu; vadný nebo ne-.docx se přeskočí s důvodem v bilanci. Ověření v `obnovMapu` se nově čeká (`await`).
- **Testy:** `netlify/test_obnova.mjs` 181/4 → 185/0. Mutace serveru +2.

---

## v2.10.1 — nálezy 19. kola P1–P6 (větev claude/k19-nalezy), 2. 10. 2026

Sloučeno do `test-draft` nad v1.10.2 a převedeno do `test` na pokyn J. V. 2. 10. 2026 („souhlasím s výchozími návrhy, zapracuj P2, P4, P6; P5 — statiku udělej tak, jak jsem navrhoval, ve dvou řádcích … P3 ok; P1 OK. připrav, otestuj a pošli do testu"). Integrační větev `claude/davka-2-10`, konflikty jen v CHANGELOG a PREDAVKA.

**Ověřeno celým kolem:** celé kolo nad ca02d5f (kód = bd43ad5, další commity jen dokumentace) VŠE ZELENÉ (77 min 32 s): sady 218 prošlo, 0 selhalo, 1 přeskočeno (test.js — skutečný ceník v repozitáři není), mutace jádra 138 z 138, mutace serveru 211 z 211, statické kontroly 3 z 3; s firemními podklady (KNG_PODKLADY: šablony CN v14, CN v11, PROJ v3, SoD, plná moc, příručka přejmenovaná na v2.10.1). Předchozí dva běhy: první visel na overit_dialogy.mjs (harness neobsloužil nový dotaz P6, přerušeno před mutacemi), druhý selhal jen v overit_lista.mjs (32 pravidel; zakázané zaškrtávátko P2) — obojí opraveno.

Nálezy 19. kola (1. 10. 2026, ostrá v30.9.1 + test v1.10.1) podle promptu
J. V. Větev z `b5253c9` (v1.10.1); o sloučení rozhoduje J. V. Označení
P1–P6 z promptu, v závorce číslo nálezu kola.

**Ověřeno celým kolem:** celé kolo nad b2b901b (kód P1 + P3; další commity jen dokumentace) VŠE ZELENÉ (64 min 16 s): sady 215 prošlo, 0 selhalo, 1 přeskočeno (test.js — skutečný ceník v repozitáři není), mutace jádra 130 z 130, mutace serveru 211 z 211, statické kontroly 3 z 3; s firemními podklady (KNG_PODKLADY: šablony CN v14, CN v11, PROJ v3, SoD, plná moc, příručka přejmenovaná na v1.10.1). Po kole `git status` čistý, `grep "if (false)"` jen komentář v test_prava.mjs.

### P1 (K19-N102) — pojistka #372 a nově zamčená varianta

- **Příčina:** `netlify/lib/zakazka_kontrola.mjs` přeskakoval v kontrole
  neznámého rozměru profilu (#372) každou variantu, která do serveru PŘIŠLA
  zamčená. Porovnání zamčených variant s uloženou verzí bere jen varianty
  zamčené v uložené verzi, takže zámek, který server ještě neviděl, prošel
  oběma kontrolami. V ostré v30.9.1 tak tisk se zámkem uložil 10 zakázek
  s profilem mimo katalog jeklů, v testu v1.10.1 záměrná zkouška K19T-C070
  (zámek bez dokumentu + uložení).
- **Oprava:** při uložení se přeskakuje jen varianta zamčená UŽ V ULOŽENÉ
  VERZI (stejné `id`, `variantaUzamcena`); nově zamčená se kontroluje jako
  nezamčená. Obnova ze zálohy beze změny — zámek ze zálohy je doklad (stejně
  jako u ostatních pojistek v režimu obnovy).
- **Testy** (`netlify/test_obnova.mjs`): (a) nová zakázka se zámkem jen
  v příchozích datech a spojkou 70x40 / 3 mm → 400 a v databázi nic;
  (a2) uložená zakázka, zámek přidaný až v požadavku → 400, uložená verze
  beze změny; (b) varianta zamčená už v uložené verzi s profilem, který
  katalog (po změně) nemá → uloží se; (c) nezamčená → 400 jako dřív. Před
  opravou 176 OK / 4 FAIL (a, a2), po opravě 180 OK / 0 FAIL. Nová mutace
  serveru „K19-N102 (P1)" chycena (4 selhání), kotva mutace „#372 kontroluje
  profily i v odeslané variantě" posunuta na `zamcenaDriv` (chycena testem b).
- **Prověřeno, zda další kontroly téhož souboru nepřeskakují varianty
  zamčené jen v příchozích datech:** ne. Typy polí (`uloTypyProblemy`),
  záporné hodnoty (B111), zaokrouhlení (B96), ceník a přepisy podle role
  (B112, přes `uloProVarianty`), minimální marže (`schvalovaniServerMarze`),
  shoda dat zamčené varianty (N43) i razítka zámku (B59, B61) se řídí
  zámkem v ULOŽENÉ verzi; nový zámek navíc projde ověřením čísla z papíru
  a výsledku. **Návrh (neměněno):** obnova ze SOUBORU (B98 — soubor jde
  upravit) bere zámek ze zálohy jako doklad i pro #372; kdo by v editoru
  připsal zámek k variantě s profilem mimo katalog, obnovou ji do databáze
  dostane (obnovu smí jen administrátor). Výchozí návrh: ponechat; přísnější
  varianta = u `zeSouboru` kontrolovat jen zámek, který leží v databázi.

### P3 (K19-N105) — ruční přepis plochy skla posune PRÁCI OPLÁŠTĚNÍ a TMELENÍ

- **Příčina:** v Excelu je PRÁCE OPLÁŠTĚNÍ součtem ploch skel a TMELENÍ
  navazuje na sklo, takže ruční úprava plochy skla posune i práci.
  V aplikaci platil ruční přepis množství (`mnozstviPrepis[název]`) jen na
  řádku skla; `oplPlochaCelkem` se ve standardním režimu brala z geometrie
  (K19T-C071: sklo boků přepsáno na 93,2 m², práce 213,8 m², Excel
  120,6 m²; K19T-C088 +11,5 % proti Excelu). Ruční přepis skla nese 13
  převedených zakázek.
- **Oprava (`src/engine.js`):** ve standardním režimu se pro PRÁCI
  a TMELENÍ berou efektivní plochy skel — přepis řádku skla boků/zad
  a čelního skla (týž klíč a táž sémantika „prázdno není nula" jako
  u řádku), jinak vypočtená hodnota. Ruční přepis přímo na řádku PRÁCE
  OPLÁŠTĚNÍ / TMELENÍ má dál přednost. Režim po stěnách beze změny.
  V Detailu výpočtu (krok 11, sekce OPLÁŠTĚNÍ) nese řádek PRÁCE / TMELENÍ
  poznámku „(z ručně přepsané plochy skla)"; značku `zPrepisuSkla` dostane
  jen řádek, kde přepis skla platí, takže výstup bez přepisu se nemění.
- **Dopad na uložené zakázky:** bez ručního přepisu skla žádný (Model 1
  zůstává 1:1 — `nastroje/porovnani_modelu.js` před i po opravě shodný
  výstup, předlohy v sadách beze změny). Odeslané (zamčené) nabídky drží
  zmrazený výsledek. **Rozpracovaná (nezamčená) zakázka s ručním přepisem
  skla se po otevření přepočítá** — PRÁCE a TMELENÍ se srovnají s přepsaným
  sklem (to je smysl opravy; ověření J. V.: K19T-C088 v klonu varianty).
- **Testy:** nová sada `src/test_prepis_skla_prace.js` (exteriér
  i interiér × Model 1 i 2: bez přepisu beze změny; přepis skla boků →
  PRÁCE i TMELENÍ = přepsané sklo boků + čelní sklo; přepis čelního skla;
  přepis přímo na PRÁCI vyhrává; interiér bez tmelení jen PRÁCE; prázdný
  přepis nic nemění; po stěnách beze změny). Před opravou 31 OK / 22 FAIL,
  po opravě 53 OK / 0 FAIL.
- **Doporučení k příplatkům VSG a SKN (neměněno):** `vsgFolieM2`
  (standardně celé sklo) a `sknM2` (sklo boků a zad) se ve standardním
  režimu dál berou z geometrie. Fólie VSG i SKN jsou úpravou TÉHOŽ skla,
  takže by logicky měly sledovat efektivní plochu stejně jako PRÁCE
  (VSG = přepsané sklo boků + čelní, SKN = přepsané sklo boků). Výchozí
  návrh: sjednotit v další dávce; příplatky mají vlastní ruční přepis
  množství, takže dnes je obchodník dorovná ručně. Dopad jen na zakázky
  s ručním přepisem skla a zaškrtnutým příplatkem.

### P5 (K19-N109) — statické posouzení ve dvou řádcích (rozhodnutí J. V. 2. 10. 2026)

- **Zadání:** „statiku udělej tak, jak jsem navrhoval — ve dvou řádcích"
  (Excel 2026: statika OCK + statika opláštění).
- **Ceník:** nová položka „Statické posouzení opláštění – hodin"
  (`C.statikaOplHod`, sekce REŽIE, výchozí 0). Sazba je společná se
  statikou OCK (`C.statikaKc`). **Hodiny nastaví J. V. v Ceníku OCK
  a zveřejní** — ceník se ve větvi nemění.
- **Jádro (`src/engine.js`):** řádek „STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ" hned za
  statikou OCK, jen u šachty s opláštěním (plocha PRÁCE OPLÁŠTĚNÍ > 0;
  po stěnách se samými „bez" a světlíky od stavby ne) a jen při hodinách
  > 0. Ceník bez položky nebo s nulou = seznam položek i cena beze změny
  (Model 1 1:1). Ruční přepis hodin funguje jako u každé položky.
- **Kontrola `statikaDvakrat`** (upozornění, ne zábrana): ručně přepsané
  hodiny STATICKÉ POSOUZENÍ a zároveň řádek statiky opláštění — převod
  z Excelu dorovnával statiku ručně (10–20 h), takže by se opláštění
  zaplatilo dvakrát.
- **Dopad na ostrou databázi:** do zveřejnění ceníku s hodinami žádný.
  Pak dostanou řádek rozpracované (nezamčené) varianty, které převezmou
  nový ceník; odeslané (zamčené) drží zmrazený výsledek. Testovací
  zakázky kola 19 jsou všechny zamčené — beze změny. Ručně dorovnanou
  statiku nese 13 z nich (K19-C032, C034, C045, C069, C086, C093, C094,
  C099, C103, C104, C105, C109, C112 = 9532 … 9612); v klonu by kontrola
  upozornila na dvojí statiku.
- **Testy:** nová sada `src/test_statika_oplasteni.js` (exteriér
  i interiér × Model 1 i 2; ceník bez položky / s nulou beze změny;
  6 h → řádek, sazba, pořadí, cena; přepis hodin; šachta bez opláštění;
  kontrola upozorní / mlčí). Před zavedením 16 OK / 22 FAIL, po něm 38 OK /
  0 FAIL. `test_kontroly.js`: pravidel 32. Tři nové mutace jádra chyceny
  (3 z 3).

### P2 (K19-N104) — zkratka „Prosklít i prohlubeň" (rozhodnutí J. V. 2. 10. 2026: výchozí návrh)

- **Zadání šachty:** pod polem Prohlubeň zaškrtávátko „Prosklít i
  prohlubeň". Zaškrtnutí nastaví všem čtyřem stěnám „Opláštění začíná" =
  −prohlubeň a jednotné opláštění přepne na opláštění po stěnách
  s výchozími typy stěn (ty skládá jádro, `oplasteniStenyVychozi`).
  Odškrtnutí vrátí meze, které začínají v −prohlubeň, na 0 (rozdělení
  stěn a režim po stěnách zůstávají). Změna hloubky prohlubně meze posune,
  dokud zkratka platí; ruční mez u jedné stěny ji zruší. Stav se odvozuje
  z mezí (`oplasteniProhlubenVse`), žádný příznak v datech. Pole Prohlubeň
  i zaškrtávátko nesou nápovědu. U nulové prohlubně se zaškrtávátko
  nezakazuje (vstupy kalkulace mají zůstat živé — `overit_lista.mjs`),
  zaškrtnutí jen vysvětlí, že není co prosklít. Zámek varianty obě
  obsluhy hlídá (`zamek_ui.js`).
- **Výpočet beze změny:** jádro počítá dnešní cestou po stěnách (plocha pod
  nulou skutečnou šířkou stěny); nezaškrtnuté = dnešní stav, Model 1 1:1.
- **Detail výpočtu** (krok 8): řádek „Prosklená prohlubeň — všechny stěny
  od −X m". Technická specifikace beze změny (ROZSAH OPLÁŠTĚNÍ už píše „od
  výšky −X m, tedy do prohlubně").
- **Testy:** nová sada `src/test_prohluben_sklo.js` 33 OK / 0 FAIL (před
  zavedením padá — funkce v jádře chyběly); `overit_oplasteni.mjs` +7
  kontrol v prohlížeči (po sloučení s v1.10.2 91 OK / 0 FAIL). Dvě nové mutace jádra
  chyceny (2 z 2).

### P4 (K19-N107) — nápověda „jiné sklo = opláštění po stěnách" (rozhodnutí J. V. 2. 10. 2026: výchozí návrh B)

- Druh skla ve standardním režimu dál určuje typ šachty a způsob zasklení
  (`skloVolba`); jiné sklo jde přes opláštění po stěnách (typ skla
  z ceníku nebo „jiné" s vlastním názvem a sazbou). Věta to teď říká
  v bublině u názvu řádku skla boků/zad i čelního skla (jen ve standardním
  režimu), u volby Opláštění v zadání šachty a v Detailu výpočtu u řádku
  „Které sklo se počítá". Výpočet ani dokumenty beze změny.
- **Testy:** `overit_oplasteni.mjs` +2 kontroly (řádky skla nápovědu nesou,
  PRÁCE OPLÁŠTĚNÍ ne, volba opláštění ano), 80 OK / 0 FAIL.

### P6 (K19-N114) — přepnutí na zahraniční ceník nabídne „jen realizace" (rozhodnutí J. V. 2. 10. 2026: výchozí návrh A)

- Po přepnutí varianty na zahraniční řadu ceníku se aplikace zeptá
  „Zakázka jen realizace — projekci nepočítat?" (výchozí Ano). Ano nastaví
  `ZAK.jenOck` (strana PROJ zešedne, krycí list PROJ, SoD PROJ a plán
  plateb PROJ se nepoužijí, kontroly projekce mlčí) a zapíše to do
  protokolu. Dialog říká, že volba platí pro celou zakázku (všechny
  varianty) a jak ji vrátit („Počítat i tuhle stranu"). Po návratu VŠECH
  variant na tuzemský ceník nabídne opak (výchozí Ne). Nenabízí se, když
  zakázka nese číslo projekce (OVP ve společném čísle nebo vlastní číslo
  ve starší hlavičce PROJ), když je už jen realizace / jen projekce, nebo
  když obchodník vědomě zvolil počítat obě strany. Rozhoduje
  `zahrJenRealizaceNabidnout` (`src/zakazka.js`), zápis jde přes `set()`
  (zámek i náhled ho hlídají). Kontrola `projZahranici` beze změny.
- **Testy:** nová sada `src/test_zahr_jen_realizace.js` 12 OK / 0 FAIL (před
  zavedením padá — funkce chyběla); `overit_zahranicni.mjs` +5 kontrol
  (dotaz, Ano, návrat, Ne, OVP) a test dialogu s dopadem hledá svůj text
  mezi dialogy, 45 OK / 0 FAIL (před 40).
  `overit_dialogy.mjs` (skutečné modály): přepnutí na zahraniční ceník teď
  otevře druhý modál, který harness dřív neobsloužil a čekal donekonečna
  (první celé kolo nad v2.10.1 se na něm zastavilo — přerušeno ještě před
  mutacemi a spuštěno znovu); +2 kontroly (dotaz na celou zakázku, odpověď
  Ne), 26 OK / 0 FAIL.

### P2, P4, P5, P6 — rozbor (1. 10. 2026; rozhodnuto 2. 10., viz oddíly výš)

Body „prověřit + návrh" — rozbor s variantami a výchozími návrhy
v `podklady/K19_ROZBOR_2026-10-01.md`, čeká na rozhodnutí J. V.:
P2 prosklená prohlubeň (výchozí: zkratka „prosklít i prohlubeň" pro
všechny stěny + nápověda), P4 volba druhu skla (výchozí: nápověda „jiné
sklo = po stěnách", volba skla až po rozhodnutí o položkách ceníku),
P5 statika opláštění (výchozí: jen hodiny `statikaHod` v ceníku), P6
projekce u zahraniční zakázky (výchozí: přepnutí na zahraniční řadu
nabídne „jen realizace").

---

## v1.10.2 — dávka 1. 10. 2026 odpoledne: výchozí plán plateb PROJ, zarovnání polí opláštění, zbytek mezery vedle dveří (1. 10. 2026)

Zadání J. V. 1. 10. 2026 odpoledne (navazující sezení po v1.10.1): „Nastav
plán plateb viz příloha jako výchozí standard. Zarovnej datová pole
u různého opláštění zprava viz např. modrá linka obr. ve výpočtu šířky
světlíků zřejmě nezohledňujeme šířku rámu dveří x2 (rám obchází dveře
okolo), prověř to. Text vedle dveří zůstane 1,50 m je podle mně špatně.
Prověř to a dej mi vědět. Ad tvoje otázky: 1) nech to tak jak to aktuálně
je, 2) Nezobrazuj nápovědu. aktualizuj roadmapu a zopakuj mi otevřené
body znovu.“ Každý úkol vlastní větev z `test-draft` (b5253c9), integrace
`claude/davka-1-10-2` (bez konfliktů), převod do `test-draft` a `test` rychlým
posunem na pokyn J. V. („po zeleném kole to pošli do testu“). Roadmapa #383–#385, #381.

**Ověřeno celým kolem:** VŠE ZELENÉ (84 min 29 s) nad 7d544b7 — sady 214 prošlo, 0 selhalo, 1 přeskočeno (test.js — skutečný ceník v repozitáři není), mutace jádra 131 z 131, mutace serveru 210 z 210, statické kontroly 3 z 3; s firemními podklady (KNG_PODKLADY: šablony CN v14, CN v11, PROJ v3, SoD, plná moc, příručka). Převod do `test-draft` a `test` rychlým posunem na pokyn J. V. 1. 10. 2026: „po zeleném kole to pošli do testu“.

### Plán plateb PROJ: výchozí předvolba Záloha 70 % + zbytek po předání (#383)

Větev `claude/plan-plateb-zaloha-70`. Snímek J. V.: krycí list PROJ
s předvolbou „Záloha + zbytek po předání“ a zálohou 70 %.

- **Výchozí plán z kódu** (`PLAN_PROJ_VYCHOZI` v `src/plan_plateb.js`):
  výchozí předvolba Standard po činnostech → **Záloha + zbytek po
  předání**, záloha v předvolbě 50 % → **70 %**. Nová zakázka má u každé
  nabízené činnosti 70 % po podpisu smlouvy a 30 % po předání činnosti,
  způsob fakturace „záloha 70 % po podpisu smlouvy, zbytek po předání
  jednotlivých stupňů dokumentace“, smlouva o dílo PROJ to dopočítá.
- Platí i pro **rozpracovanou** variantu, která předvolbu nemá uloženou
  (plán je řídký — jako u každé změny firemního plánu). Odeslané nabídky
  mají snímek plánu a nemění se. Firma s vlastním plánem v Nastavení →
  Firma má vlastní výchozí předvolbu a zálohu, ty mají přednost.
- Šablona nabídky PROJ v3 má platební podmínky natvrdo (Standard) — u nové
  zakázky s v3 teď varuje pravidlo „Plán plateb se ve Wordu neukáže“;
  řešením je šablona PROJ v4.
- **Testy** (proti původnímu kódu → po změně): `test_plan_plateb.js`
  4 FAIL → 70/0 (nový úsek 0 — výchozí předvolba, řádky 70/30, popis,
  věta fakturace, dopočet SoD); `test_plan_plateb_kryci.js` 3 FAIL → 66/0;
  `test_plan_plateb_sod.js` 1 FAIL → 49/0; `test_sablona_proj_v4.js`
  1 FAIL → 33/0; `overit_plan_plateb.mjs` 4 FAIL → 49/0. Testy Standardu
  běží nad firmou s výchozím Standardem. Příručka (Plán plateb).

### Opláštění po stěnách: pole stěny v pevných sloupcích (#384)

Větev `claude/oplasteni-zarovnani-poli`. Snímek J. V. s modrou linkou:
materiál pásu „až nahoru“ přečníval materiál ostatních pásů.

- **Příčina:** pole řádku stěny se skládala za sebe, každý jinak široký
  prvek posunul ty před sebou (vedle pásu „až nahoru“ je místo pole výšky
  kratší text „po horní hranu“; „Opláštění začíná“ nemělo křížek;
  název a sazba „jiné“ byly mimo sloupce).
- **Oprava** (`src/ui/kalk_ock.js`, `src/app_template.html`): rastr
  `.opl-sloupce` materiál (190 px) | výška (90 px) | křížek (30 px),
  zarovnaný doprava; řádky bez materiálu (hlavička rozdělené stěny,
  „+ přidat pás“, „Opláštění začíná“) mají jen sloupce výška | křížek,
  takže popisek se na užším okně nezalomí víc než dřív. „jiné“: název
  pod materiálem, sazba pod výškou, jednotka Kč/m². Výpočet beze změny.
- **Test:** `overit_oplasteni.mjs` nový úsek „ZAROVNÁNÍ POLÍ STĚNY“ (měří
  hrany z obrazovky) — proti sestavení před úpravou 77 OK / 5 FAIL, po ní
  82 / 0; `overit_xss.mjs` 215/0, `smoke.mjs` 50/0.

### Šířka bočního světlíku: zbytek mezery u jedněch dveří; rám dveří ověřen (#385)

Větev `claude/svetlik-zbytek-vedle-dveri`.

- **Rám dveří** se do mezery vedle dveří počítá **dvakrát už teď**: otvor
  dveří = čistý vstup + 2 × šířka rámu + 2 × 20 mm (`sirkaDveri`, vzorec
  z Excelu, oba modely), mezera = šířka skla − otvor − 40 mm. Zakázka ze
  snímku: 800 + 2 × 100 + 40 = 1 040 mm; 1 680 − 1 040 − 40 = 600 mm.
  Kód se nemění; nový úsek testu 4b to drží (pojistka dočasnou mutací
  „rám jednou“: 4 kontroly selžou).
- **Věta o zbytku** (`kontrolyBokySirka`, jen Model 2 s ruční šířkou):
  „Vedle dveří zůstane 1,50 m šířky…“ nesla součet přes všechny dveře
  a zněla jako zbytek u jedněch dveří. Nově „Vedle každých dveří zůstane
  neoceněných 300 mm (mezera 600 mm − světlík 300 mm), u 5 dveří celkem
  1,50 m.“; dva u dveří „− 2 světlíky po … mm“; smíšené rozložení jen
  součet a z čeho vznikl; dveře bez světlíku se do zbytku nepočítají
  (hlásí je pravidlo počtu). Cena ani zábrany se nemění.
- **Testy:** `test_svetliky_sirka.js` — proti původnímu kódu 61/8, po
  změně 69/0; `overit_svetliky_sirka.mjs` 23/1 → 24/0; mutace jádra +3
  úseky (věta nese součet, dveře bez světlíku podruhé, rám jednou).

### Rozhodnutí J. V. k #381 (1. 10. 2026 odpoledne)

- Mezera vedle dveří u zasklení mezi příčníky dál vychází ze šířky skla
  mezi sloupky (shodně s Excelem a Modelem 1) — **ponechat**.
- Nápověda s výpočtem mezery („šířka skla … − otvor dveří … − 40 mm“) se
  **nezobrazuje** — nic se nepřidává.

---

## v1.10.1 — dávka 1. 10. 2026: SoD podle šablon, zábrany blokují dokumenty, šířka bočního světlíku, dodatkové texty (1. 10. 2026)

Zadání J. V. 1. 10. 2026 (úkoly 1–4) a jeho rozhodnutí během dne: návrh SoD
— výchozí odpovědi platí, datum podpisu = aktuální datum; „s návrhem šířky
bočního světlíku souhlasím, zapracuj ho pro model 2 (modelu 1 nic neměň)
a vše pošli do testu"; kontrola dodatkového textu, který se v testu
nepropisoval. Každý úkol vlastní větev z `test-draft` (643faa8), integrace
`claude/davka-1-10`, převod do `test-draft` a `test` rychlým posunem.
Roadmapa #377–#382.

**Ověřeno celým kolem:** finální celé kolo nad d596290 VŠE ZELENÉ (59 min 7 s): sady 214 prošlo, 0 selhalo, 1 přeskočeno (test.js), mutace jádra 128 z 128, mutace serveru 210 z 210, statické 3 z 3; kód v1.10.1 (373861f) je s d596290 shodný, liší se jen CHANGELOG, PREDAVKA a roadmapa; na pokyn J. V. „potřeboval bych to už odeslat do testu" převedeno ještě před doběhnutím mutací serveru, výsledek dopsán po doběhnutí; předchozí celé kolo nad a7889c5 (úkoly 1–4 bez SoD rozhodnutí, #381 a #382) VŠE ZELENÉ: sady 210/0/1, mutace jádra 121 z 121, serveru 210 z 210, statické 3 z 3.

### Dodatkové texty: číselník má přednost před zveřejněným ceníkem

Hlášení J. V. 1. 10. 2026: „proč se mi při načtení nové zakázky nepropisuje
dodatkový text přestože v ceníku ho mám … Tento problém eviduju jen v testu,
v main text propsaný mám." Větev `claude/ciselnik-prednost-dodatku`
z integrační `claude/davka-1-10`; roadmapa #382.

- **Příčina:** dodatkové texty mají dva zdroje — číselník (`/api/popisy`)
  a kopii ve zveřejněném ceníku. `popisyVlij` vlévala číselník do výchozího
  ceníku jen tam, kde zveřejněný ceník vlastní text neměl (rozhodnutí
  22. 9. 2026, ještě před zavedením číselníku). Zveřejněný ceník v testu nese
  u SKN starší krátký text, takže každá nová zakázka dostala ten a dlouhá
  věta z číselníku se nepropsala; v ostrém ceníku tam text zřejmě není,
  proto to ostrá verze nevykazuje. Úprava textu v číselníku platila jen do
  obnovení stránky.
- **Oprava:** číselník má přednost (jak slibuje jeho popis „nezávisle na
  verzi ceníku"); text zveřejněného ceníku zůstává náhradou u položek, pro
  které číselník text nemá. Překlady staré věty se u přepsaného textu
  zahodí a doplní se ty z číselníku (#379). Rozpracované a odeslané
  zakázky se nemění (mají vlastní kopii).
- **Číselník** ukáže, když zveřejněný ceník nese jiný text, a u otevřené
  zakázky s jiným textem nabídne tlačítko **použít text z číselníku
  v otevřené zakázce** (jen rozpracovaná varianta; zámek a náhled hlídá
  ZAMEK_CHRANENE).
- **Testy:** `src/test_cenik_popisy.js` (přednost číselníku, náhrada ceníku,
  záznam odlišných textů, překlady) — před opravou 4 z 28 selhaly, po opravě
  28 OK; nový `overit_popisy_prednost.mjs` — před opravou 5 z 9 selhalo, po
  opravě 11 OK. Příručka (kapitola o dodatkových textech).

### Šířka bočního světlíku při ručním počtu (#381, Model 2)

Rozhodnutí J. V. 1. 10. 2026: „s návrhem šířky bočního světlíku souhlasím,
zapracuj ho pro model 2 (modelu 1 nic neměň)“ (návrh
https://claude.ai/artifact/7tNaMb8Fu1tNt9ADCyYheL; výchozí odpovědi otázek
1–6 a 8 platí, otázka 7 změněna: **jen Model 2**). Větev
`claude/sirka-bocniho-svetliku-381` (nad integrační větví
`claude/davka-1-10`), roadmapa #381 hotovo.

Proč: podle #375 stojí dveře s jedním bočním světlíkem u sloupku a světlík
vyplní celou mezeru vedle dveří, takže plocha boků je od D do 2D světlíků
stejná (zakázka ze snímku J. V.: 5 × 0,60 m × 2,2 m = 6,60 m² pro 5 i 10 ks).
Obchodník to na obrazovce neviděl a nemohl změnit.

- **Data:** `Z.svetlikyBokySirkaMm` — prázdno / chybí = předpočítaná šířka,
  číslo = ruční šířka jednoho bočního světlíku v celých mm (prázdno není
  nula). Starší zakázky klíč nemají → cena beze změny. Server ho hlídá jako
  číslo (`ULO_CISLA_NAVIC`).
- **Jádro** (`src/engine.js`): jen v **Modelu 2** při ručním počtu, N > 0
  a platné šířce W je plocha boků N × W × 2,2 m — čte ji sklo, plech (kg
  i lakování), materiál opláštění, „zajistí stavba“, průchozí šachta i režim
  po stěnách. Konstrukce a montáž dál po kusech. **Model 1 šířku nečte**
  (ani při uložené hodnotě), automatický počet ji ignoruje v obou modelech.
  Výsledek vydává `zaskleni.vypln.sirkaPredpocitana` (dnešní plocha /
  (2,2 × N)), `sirkaRucne` (v Modelu 1 vždy null) a `sirka` (použitá).
- **Zadání šachty:** řádek **Šířka bočního světlíku** (mm) hned pod počtem —
  jen Model 2, výplň ≠ „bez“, ruční počet, N > 0. Hodnota = ruční šířka
  nebo zaokrouhlená předpočítaná; ruční nese štítek „ručně“ a ↺. Pod řádkem
  nápověda („předpočítáno z mezery vedle dveří 600 mm: 5 dveří s jedním
  (600 mm)“, smíšené „… → průměr“; nebo „zadáno ručně; předpočítaná šířka
  … mm“) a červená / oranžová věta z kontroly. ↺ u počtu ruční šířku smaže.
  `bokySirkaSet`, `bokySirkaZpet` jsou v `ZAMEK_CHRANENE`.
- **Kontrola** `bokyDveri` (jen Model 2, jen s ruční šířkou — model pozná
  z výsledku jádra, takže platí i pro zmrazený otisk a server): světlík
  širší než mezera nebo N × W > D × M = **zábrana**, která zastaví nabídku,
  SoD i krycí list OCK (brána dokumentů #377, pravidlo má `zabranaMozna`);
  jinak zbytek mezery nad 5 mm = upozornění „Vedle dveří zůstane … m šířky,
  kterou nic neoceňuje.“ Tolerance zaokrouhlení 0,5 mm na světlík
  (zaokrouhlená předpočítaná šířka zábranu nespustí).
- **Detail mezivýpočtů:** mezera vedle dveří, předpočítaná / použitá šířka
  a plocha boků se vzorcem. **Specifikace a nabídka:** „Světlíky na bocích
  dveří: 5 ks, šířka 300 mm, sklo VSG 4.4.1, na terče“ jen při ruční šířce;
  překlad EN/DE/FR vzorem s obecným heslem „šířka“, které slovník už má
  (NÁVRH PŘEKLADU — ke kontrole J. V.).
- **Testy (pojistka proti prázdnému testu):** nová `src/test_svetliky_sirka.js`
  (60 kontrol: zakázka ze snímku 6,60 → 3,30 / 4,95 m², plech v kg, Model 1
  se šířkou v datech bajt po bajtu shodný ve 1 120 zadáních, automatika,
  smíšené 7 ks = 5 · 0,6 / 7 m, kontrola 750 / 700 / 10 × 400 / 300 mm,
  specifikace, překlad, nabídka, server) — před opravou 16 prošlo / 44
  selhalo, po ní 60 / 0. Nový harness `overit_svetliky_sirka.mjs`
  (24 kontrol) — proti sestavení před opravou 6 OK / 18 FAIL, po ní 24 / 0.
  `overit_xss.mjs` + pole šířky. Upravené: `test_kontroly.js` (bokyDveri
  mezi pravidly se zábranou), `test_profil_neznamy.js` (tři nová pole
  `vypln` mimo otisk — otisky beze změny).
- **Porovnání jader:** 13 824 zadání (oba modely, int/ext, terče/lišty,
  všechny výplně, starší tvar boků, počty, šířky, průchozí, po stěnách)
  proti jádru před #381 — rozdíl jen u Modelu 2 s ručním počtem a šířkou
  (2 976 zadání), všude jinde bajt po bajtu shoda.
- **Mutace jádra:** +7 úseků „#381: …“ (Model 1 čte šířku, automatika čte
  šířku, plocha z jedné tabule, předpočítaná z poloviny výšky, kontrola
  šířky vypnutá, širší než mezera se nepozná, zábrana jen upozorní);
  filtrovaný běh `node mutace_jadro.mjs "#381"`: **chycených 7 z 7**
  (všechny `test_svetliky_sirka.js`), pracovní kopie po běhu beze změny;
  `--kontrola` 128 úseků.
- `./spust_testy.sh --smoke` (s `KNG_PODKLADY`): 212 prošlo, 0 selhalo,
  1 přeskočeno (`test.js` — skutečný ceník v repozitáři není).
- Podklad #149: 14. rozdíl M1 × M2; `nastroje/porovnani_modelu.js` vzor H
  a složka „Plocha boků vedle dveří“. Příručka (Zadání šachty, kapitola
  zábran).

### Model 2 neubírá montáž u nadsvětlíku „bez“

Zadání J. V. 1. 10. 2026: „v modelu 2 přestaň ubírat 0,2h montáže na
nástupiště v případě nadsvětlík bez“. Větev `claude/model2-nadsvetlik-bez`
(nad `test-draft` v30.9.4), roadmapa #378 hotovo.

- **Jádro** (`src/engine.js`, `hn.svetlik`): odpočet −0,2 h × nástupiště
  při světlíku nad dveřmi „bez“ se dělá **jen v Modelu 1** (1:1 Excel —
  nemění se ani o korunu). Model 2 neubírá u žádné volby; „zajistí stavba“
  neubírá v žádném modelu dál (#375).
- **Testy:** `test_nadprazi.js` — nový úsek 3b (oba modely, interiér
  i exteriér, rozdíl M2 − M1 = 0,2 h × nástupiště) a úsek „zajistí stavba“
  pro oba modely; `test_svetliky_boky.js` — úsek 6 rozdělen po modelech.
  Před opravou 6 selhání (4 + 2), po ní 0.
- **Mutace jádra:** nové úseky „#378: Model 2 zase ubírá montáž při ‚bez‘“
  a „#378: Model 1 přestane ubírat“ — oba chycené (test_nadprazi.js,
  test_kornpfortstrasse.js); úseky N58 a #375 přepsané na nový tvar řádku
  (chycené dál).
- **Nápověda a texty:** Detail mezivýpočtů (`src/ui/detail_ui.js`) popisuje
  odpočet podle modelu; příručka (světlík nad dveřmi); podklad #149
  (13. rozdíl M1 × M2); `nastroje/porovnani_modelu.js` — vzor G a složka
  „Montáž — hodiny navíc za světlík nad dveřmi“.

### Překlady dodatkových textů do cizojazyčné nabídky, K18-N96

Větev `claude/k18-n96-dodatky-preklady` (nad `test-draft` 643faa8, v30.9.4).
Nález K18-N96, J. V. ho zvýšil na STŘEDNÍ: v ostrém ceníku je u SKN
skutečná firemní věta, slovník ji nezná, takže v každé anglické, německé
i francouzské nabídce zůstala česky (v30.9.4 o tom jen varovala kontrola
`dodatekCesky`). Firemní věty do slovníku nepatří — překlad dodá
administrátor. Roadmapa #379 (navazuje na #267) hotovo.

**Číselník dodatkových textů (Ceník OCK)**
- Pod českým textem položky jsou pole **EN / DE / FR** (nepovinná, jen
  administrátor; obchodník vidí vyplněné překlady jako text). Každé pole se
  uloží hned po opuštění (`onlinePopisJazykyUloz` → `POST /api/popisy
  { klic, jazyky }`), český text se tím nemění. Bez českého textu se pole
  nekreslí.
- V Kalkulaci OCK pod polem dodatkového textu štítek „Překlad do nabídky:
  EN, DE…", má-li text v zakázce překlad.

**Data a nabídka**
- Vedle `cenik.popisy` stojí `cenik.popisyJazyky` (klíč → `{ en, de, fr }`),
  společná mapa na serveru nese `jazyky` vedle `texty`. Starší data platí
  beze změny.
- Překlad patří ke konkrétnímu českému znění: do výchozího ceníku
  i rozpracované zakázky se doplní jen k témuž textu (`popisyVlij`,
  `popisyJazykyDoplnChybejici`, otevření zakázky v `cenik_stari.js`),
  přepis textu v zakázce překlady u položky zahodí (`popisJazykySrovnej`
  v `popisSet`). Existující překlad zakázky se nepřepisuje.
- Výpočet dává překlady příplatku jako `popisNabidkaJazyky` (jen když
  existují — výstup bez nich je beze změny, Model 1 netknutý), takže se
  zmrazí s odeslanou nabídkou: co odešlo, to drží.
- `nabidkaData` v EN/DE/FR tiskne překlad jazyka tisku — online náhled
  i Word jdou toutéž cestou. Bez překladu dosavadní chování (slovník →
  jinak česky) a varování `dodatekCesky` jen tehdy; jeho text nově radí
  doplnit překlad v číselníku.

**Server**
- `/api/popisy`: tvar `{ klic, jazyky }` bez `text` mění jen překlady
  (po jazycích, prázdný smaže), celá mapa smí nést `jazyky`. Očista
  `popisyJazykyOciste` (src/cenik.js, týž kód v prohlížeči): jen klíče
  en/de/fr, jen řetězce, řídicí znaky pryč (zalomení → mezera), strop 300
  znaků jako u českého textu, překlad položky bez českého textu se zahodí
  (smazání českého textu vezme překlady s sebou). Práva jako u českého
  textu (jen administrátor).
- B112: `popisyJazyky` je volný text ceníku zakázky (jako `popisy`) —
  obchodníkovi se kvůli překladům odneseným z výchozího ceníku uložení
  neodmítne.

**Testy**
- `src/test_n96_dodatky_jazyky.js` (nová sada, 35 testů): před opravou
  15 + 3 FAIL, po opravě 35 OK.
- `netlify/test_prava.mjs`: blok N96 (10 testů) před opravou 4 FAIL a pád
  sady, B112 `popisyJazyky` před opravou 403; po opravě 645 prošlo, 0 selhalo.
- `overit_online.mjs` oddíl 4a2b (7 testů): se starým UI FAIL „pole EN,
  DE a FR", po opravě 197 OK.
- Mutace serveru: 3 nové (N96), filtrovaný běh 3/3 chycené. Mutace jádra:
  N96 kontrola upravena na nový kód + 2 nové; filtrovaný běh `k18-n96`
  5/5 chycených.

---

### Smlouvy o dílo podle aktuálních šablon: K18-N100, K18-N101, dvojí procento

Zadání J. V. 1. 10. 2026 (úkoly 3 a 4): „připrav návrh úpravy sod a aktualizaci
online generátoru cenových nabídek a sod, aby funkčně odpovídal aktuálním
šablonám" + nálezy K18-N100 a K18-N101 z 18. kola na ostré (v30.9.1).
Větev `claude/sod-generator-sablony` z `test-draft` (643faa8). Rozbor
symbolů všech aktuálních šablon a návrh pro J. V. je v artefaktu (odkaz
v PREDAVKA.md); šablony v repozitáři nejsou.

**K18-N100 — SoD realizace: záruka, splátky, předání k montáži**
- Záruka z krycího listu OCK do `{{SOD_ZARUKA_MESICU}}` (jen číslo, šablona
  píše „měsíců" sama); ruční přepis platí, zamčená varianta drží odeslané.
- Splátky z TÉHOŽ platebního kalendáře jako nabídka (`kryciPlatebniKalendar`,
  nová `kryciSodPlatby`): šablona v1 (čtyři pevné věty) dostane 1 ← záloha,
  2 ← dílčí faktura, 4 ← konečná; věta 3 (druhá dílčí platba, kterou krycí
  list nemá) a věta zálohy při „Bez zálohy" zmizí celé. Měsíční fakturaci
  v1 vyjádřit neumí — smlouva nevznikne a řekne proč.
- Nová šablona **SoD realizace v2** (`node nastroje/vyrob_sablony.js
  --sod-real <podklady>`): místo čtyř vět jeden odstavec
  `{{SOD_PLATEBNI_KALENDAR}}`, aplikace ho zopakuje za každou splátku
  (bez zálohy = dvě věty, měsíční = věta o měsíční fakturaci).
- Pole krycího listu „Ukončení montáže šachty a předání montáži výtahu"
  plní `{{SOD_TERMIN_PREDANI_K_MONTAZI}}`.

**K18-N101 — SoD projekce: platby k nenabízené činnosti, součet**
- Tester zkoušel P18 na ostré **v30.9.1** (před plánem plateb, šablona
  SOD_PROJEKCE v1). Ve v30.9.4 zbývalo: věta staré šablony o platbě, kterou
  plán nemá, zůstala s `{{SODP_PLATBAn_KC}}` (u projekce bez zaměření
  „… při předání 2D výstupů ze zaměření"); ruční splátky odeslané nabídky
  z doby před plánem se proti ceně díla nekontrolovaly.
- Generátor Wordu umí odstranit odstavec, o kterém builder řekne, že do
  dokumentu nepatří (`odstavcePryc`, `odstranOdstavceSeSymboly`); stará
  šablona tak nese jen věty plateb, které plán má.
- Se šablonou v ruce builder vždy kontroluje součet plateb proti ceně díla
  (plán i ruční splátky); ruční splátka k nenabízené činnosti smlouvu
  zastaví s vysvětlením. Náhled bez šablony se neodmítá.

**Dvojí procento ve smlouvách** — šablony SoD píšou „{{PODM_POKUTA_SPLATNOST_PROC}} %",
symbol ale nese „0,05 %" → „0,05 % %". Generátor znak z hodnoty vypustí,
když za symbolem v témže odstavci % následuje.

**Rozhodnutí J. V. 1. 10. 2026** (k návrhu SoD: souhlas s výchozími
odpověďmi, u bodu 10 změna) — ve větvi `claude/sod-generator-sablony`:
- Krycí list OCK, sekce **Termíny** — nová nepovinná data bez předvyplnění,
  pořadí podle průběhu stavby: *Finální podklady od dodavatele výtahu do*
  (`{{SOD_TERMIN_PODKLADY_VYTAH}}`, jen šablona v2), *Stavební připravenost
  zákazníka do* (`{{SOD_TERMIN_PRIPRAVENOST}}`), *Konec montáže ocelové
  konstrukce* (`{{SOD_TERMIN_MONTAZ_DO}}`), *Opláštění od / do*
  (`{{SOD_TERMIN_OPLASTENI_OD/DO}}`), *Osazení šachetních dveří zákazníkem
  do* (`{{SOD_TERMIN_DVERE}}`). Prázdné pole symbol neplní (zůstane `{{…}}`),
  datum jde do smlouvy jako DD.MM.RRRR.
- Sekce „Smlouva o dílo — podpisy a kopie (SoD realizace)" se jmenuje
  **„Smlouva o dílo (SoD realizace)"** a přibyly v ní: **místo plnění**
  (výběr bytový dům / rodinný dům / administrativní budova / jiné znění, bez
  předvyplnění → `{{SOD_MISTO_PLNENI_DRUH}}`; výběr bez předvyplnění začíná
  volbou „— nevybráno —"), **denní pokuta za prodlení zákazníka** (stavební
  připravenost, převzetí díla; bez předvyplnění → `{{SOD_POKUTA_DENNI}}`)
  a **datum podpisu smlouvy** (předvyplněné datem tisku →
  `{{SOD_DATUM_PODPISU}}`; zamčení varianty ho NEzmrazí — smlouva tištěná
  později nese den tisku, ne den odeslání nabídky; ruční přepis platí).
  Nic z toho nejde do cenové nabídky (sekce nejsou v `KRYCI_NABIDKA_SEKCE`).
- **Pokuta za prodlení zhotovitele** ve šablonách v2 z krycího listu:
  SoD realizace `{{PODM_POKUTA_DODAVKA_PROC}}` (prodlení dodávky), SoD PROJ
  `{{PODM_POKUTA_TERMIN_PROC}}` (prodlení s odevzdáním); věta o prodlení
  objednatele s placením zůstává se splatností. Pokuta „0" (i „0 %",
  „bez pokuty") větu ze smlouvy vypustí (`odstavcePryc`, jen když ji šablona
  má), vlastní znění bez procenta nechá symbol viditelný `{{…}}`. Šablony
  v1 beze změny.
- **Výroba šablon v2** (`nastroje/vyrob_sablony.js --sod-real / --sod-proj`):
  přepojení symbolu pokuty ve větě o prodlení zhotovitele a v SoD realizace
  pevné datum „19.06.2026" ve větě o podkladech dodavatele výtahu →
  `{{SOD_TERMIN_PODKLADY_VYTAH}}`. Datum je v XML rozdělené do běhů — přepisuje
  se po znacích, formátování zůstává; když ve větě není právě jedno datum na
  jejím konci, výroba skončí chybou. Skript vypíše, co nahradil, a ověří
  symboly i XML.

**Testy:** `src/test_sod_realizace.js` (nová sada, 25: před opravou 10
selhalo a sada spadla, po opravě 0), `src/test_plan_plateb_sod.js`
(oddíl 7, 11 nových: před opravou 8 selhalo, po 0), `src/test_docxgen.js`
(3 nové: před 1 selhal, po 0), `overit_sod.mjs` se skutečnými šablonami
(4 nové: před opravou 2 z 31 selhaly, po 31 OK). Mutace jádra: nový úsek
K18-N101 (plan_plateb.js) — chycená. K rozhodnutí J. V. 1. 10.:
`src/test_rozhodnuti_sod.js` (nová sada, 72: před úpravou 25 selhalo
a sada spadla, po úpravě 0), `src/test_sod_realizace.js` (výroba v2 s novými
kotvami: před 1 selhal, po 0), `overit_sod.mjs` (18 nových nad skutečnou
šablonou v1, v2 z ní vyrobenou a krycím listem v aplikaci: před úpravou 12
z 39 selhalo a harness spadl, po úpravě 49 OK).

### Zábrany z kontroly před nabídkou blokují dokumenty (#377)

Větev `claude/zabrany-blokuji-dokumenty` nad `test-draft` (643faa8, v30.9.4).
Pokyn J. V. 1. 10. 2026 k návrhu #377: „2. je za mě OK, nepotřebujeme k tomu
nález". Pravidla se zábranou psala „Dokument nevznikne, dokud se to
neopraví", ale brána dokumentů `dokumentZabrana` je nečetla — zdvih −5 m
i 1 000 000 000 m dal nabídku (ověřeno ve v30.9.4).

**Co se změnilo**
- `kontrolyZabranaDokumentu(vysl, typ)` v `src/kontroly.js` rozhoduje, který
  dokument která zábrana zastaví; nález nese `strany` (OCK / PROJ):

  | zábrana | zastaví |
  |---|---|
  | `rozmery` (i zdvih nad 99 m), `profilNeznamy`, `sleva` nad stropem | nabídka OCK (Word i náhled/tisk), SoD OCK, krycí list OCK |
  | `slevaProj` nad stropem | nabídka PROJ (Word i náhled/tisk), SoD PROJ, krycí list PROJ |
  | `zapornaPolozka`, `cenaNula` | dokumenty té strany, kde nález je |
  | `ukazkovyCenik` (prázdný), `planPlateb100/Soucet` | beze změny — vlastní brány |
  | plná moc | žádná zábrana z kontrol |
  | „Kompletní náhled podkladů" | nic — kontrolní pohled na vstupy, ne dokument |

  Pravidla nad symboly šablon stahovanými na pozadí (`slevaWord`,
  `platbyWordOck`, `slevaWordProj`, `polozkyNavicWordProj`, `cenaWordProj`,
  `planPlatebWordProj`) a `dodatekCesky` zůstávají varováním — neblokují.
- `dokumentZabrana(typ, varianta)` (`src/ui/ukazkove_ui.js`) se ptá kontrol nad
  variantou, ZE KTERÉ dokument vzniká (`kontrolyStavVarianta` v
  `src/ui/kontroly_ui.js`; řídící varianta po odpovědi „Ne" se posoudí nad
  vlastními daty, zamčená nad zmrazeným výsledkem).
- Tlačítka dostala typ dokumentu (`ukazkoveZabranaAttr(typ)`): náhled a Word
  nabídky OCK i PROJ, SoD OCK a PROJ, plná moc, tisk krycích listů. Hláška =
  název pravidla + text nálezu, stejná v bublině zhasnutého tlačítka i při
  pokusu o tisk (`dokumentZabranaHlas` — hláška místo „Chyba:" z registru).
  Vedlejší účinek typu u tlačítek: vadný plán plateb PROJ teď zhasne
  i tlačítka nabídky a smlouvy PROJ (do teď zůstala živá a zastavilo je až
  generování).
- Panel kontrol značí zábrany ⛔ (červeně) a pod seznamem říká, že dokument
  nevznikne a zábrana se neodklepává; „Beru na vědomí" zůstává pro varování.
- Příručka (kapitola 23 a slovníček hlášek): dokument nevznikne, dokud
  zábrana trvá.
- Nová zakázka má rozměry nulové = zábrana `rozmery`: dokumenty OCK vzniknou
  až po vyplnění rozměrů. Harnessy, které tiskly z čerstvé zakázky
  (`overit_dialogy`, `overit_lista`, `overit_nabidky_dph`, `overit_online`,
  `overit_plan_plateb`, `overit_sod`), proto vyplní rozměry vzorové šachty
  (nabídky DPH i zkušební ceník OCK; P2 v `overit_online` bránu vypne — testuje
  dotaz na odemčení, ne zábrany).

**Testy:** `src/test_kontroly.js` +15 (před opravou 1 selhání — funkce
chyběla, po opravě 130/0); nový `overit_zabrany_dokumenty.mjs` (před opravou
11 selhání z 24, po opravě 24/0); mutace jádra +5 úseků „#377" (kontroly.js,
`--kontrola` 116 úseků v pořádku, běh jen úseku #377: chycených 5 z 5).

**Otázka pro J. V.:** zábrana platí i pro zamčenou (odeslanou) variantu —
dotisk odeslané nabídky s historicky „neplatnými" daty neprojde (cesta: klon
a oprava). Výchozí odpověď: tak to nechat.

## v30.9.4 — světlíky u šachetních dveří (#375), nálezy 18. kola, platební podmínky OCK, zdvih nejvýš 99 m (30. 9. 2026)

Pokyn J. V. 30. 9. 2026: „co máme aktuálně v draftu pošli už do testu"
(`test` = v30.9.3, cd7a1ec), „s tvými návrhy řešení bočních světlíků
souhlasím", odpočet −0,2 h u nadsvětlíku „zajistí stavba" zrušit, svázat
zaměření v kalkulaci s položkou krycího listu, opravit K18-N92 až N97,
opláštění po stěnách „změň na standard", měsíční fakturaci „prověř a
nastav", maximální zdvih 99 m. Práce ve čtyřech paralelních větvích
z `test-draft`, sloučených v integrační větvi `claude/davka-k18-svetliky`:
`claude/svetliky-u-dveri-375` (#375), `claude/k18-drobnosti` (B1–B3),
`claude/k18-nalezy-word-preklady` (N92, N93, N95–N97) a
`claude/ock-platebni-podminky-nabidka` (N94 + měsíční fakturace, #367
etapa A část 1). Roadmapa #375 a #376 hotovo, #367 doplněno, nová #377.

**Světlíky u šachetních dveří (#375)**
- Světlíky na bocích dveří mají tytéž volby jako světlík nad dveřmi (bez,
  sklo, plech, materiál opláštění, zajistí stavba); nová zakázka začíná na
  „bez". Pod nimi pole **Celkem světlíků na bocích dveří** — automaticky
  nástupiště × 2, ručně se štítkem „ručně" a ↺ (`bokyPocet*`,
  `Z.svetlikyBokyKs`).
- Ocenění po dveřích (dveře se dvěma / jedním / žádným světlíkem), plocha
  min(N, D) × mezera × 2,2, konstrukce na kus světlíku; plech 8,5 kg/m²
  lakovaný z obou stran. **Sklo** = sklo stěny s dveřmi (po stěnách
  převažující sklo stěny A, jinak standardní sklo čelní stěny),
  **materiál opláštění** = převažující materiál stěn B, C, D (Cetris za m²
  bez lišt a terčů), **zajistí stavba** = naše konstrukce, výplň 0 Kč.
  Po stěnách už světlíky nejsou v pásech stěny A, mají vlastní řádky.
- Nadsvětlík **„zajistí stavba" už neubírá 0,2 h montáže na nástupiště**
  (oba modely); „bez" ubírá dál (Model 1 = Excel).
- Kontrola **bokyDveri** (31. pravidlo): mezera vedle dveří při „bez",
  N = 0, N > 2 × dveře, N < dveře. Specifikace: nový řádek SVĚTLÍKY
  U ŠACHETNÍCH DVEŘÍ a symbol `{{TS_SVETLIKY_DVERI}}` (šablona CN ho zatím
  nemá); překlad EN/DE/FR je návrh ke kontrole. Detail výpočtu ukazuje
  počet, rozložení a materiál. Server ověřuje `nadDvermi`/`bokyDveri`
  výčtem a `svetlikyBokyKs` jako číslo.
- Starší zakázky se převedou beze změny ceny (`svetlikyBokyMigrace`
  v importZakazka u všech variant; ověřeno 29 760 konfiguracemi proti
  předchozímu jádru, commitnutý test 192 zadání). **Cena se mění** jen
  u rozpracovaných zakázek: materiál opláštění u světlíků (dřív sklo
  čelní stěny), sklo po stěnách s nesklenou stěnou A, nadsvětlík
  „zajistí stavba" (+0,2 h × nástupiště) a oprava chyby (strany 0
  s uloženou výplní „plech" už neúčtují práci na plech). Zamčené
  varianty drží zmrazený výsledek.

**Drobnosti B1–B3 (rozhodnutí J. V. 30. 9. 2026)**
- **B1 — zaměření:** ZAMĚŘENÍ PROSTORŮ 3D SKENEREM ve specifikaci je
  odvozené jako statika z položky ZAMĚŘENÍ 3D SKENEREM v Režii OCK
  (`tsSken3dVCene`; množství 0 nebo vyřazení = „ne"); řádek **Zaměření
  strojovna** krycího listu OCK je odvozený taky (`odvozene` v
  `KRYCI_SEKCE`, jen ke čtení, dřívější ruční „Ano" se ohlásí jako
  neplatné; zamčená varianta drží, co se odeslalo).
- **B2 — po stěnách není atyp:** `standardVyhodnot` už nehlásí režim po
  stěnách jako mimo standard; posuzuje se stejně jako jednotné opláštění.
  Automaticky zaškrtnutý ATYP uklidí `standardAtypUklid`; ručně
  zaškrtnutý ATYP ani odeslané nabídky se nemění.
- **B3 — zdvih nejvýš 99 m (K17-N91):** `KONTROLY_ZDVIH_MAX_M = 99`
  v pravidle „rozmery" (zábrana), pole Zdvih má max 99 a upozornění;
  hodnota se neořezává. Server beze změny (odmítnutí by zastavilo
  ukládání rozpracované zakázky).

**Nálezy 18. kola**
- **K18-N92:** šablona PROJ v4 (`nastroje/vyrob_sablony.js --proj-v4`)
  má pod seznamem geodetických prací cenovou tabulku v bloku
  `{{CENA_GEODET_ZAC}}…{{CENA_GEODET_KON}}` se symbolem
  `{{PROJ_CENA_GEODET_BLOK}}` (bez geodetu blok zmizí). Kontrola
  **cenaWordProj**: nabízená činnost s cenou, pro kterou šablona nemá
  symbol → varování.
- **K18-N93:** záruka v cizojazyčné online nabídce OCK jde přes překlad
  („Warranty 60 months").
- **K18-N94 + měsíční fakturace (#367 etapa A část 1):** nabídka OCK
  tiskne platební kalendář z krycího listu — splátka s 0 % se vynechá
  a doklady se přečíslují, způsob fakturace „Měsíční" dá větu
  „Fakturace probíhá měsíčně podle skutečně provedených prací." místo
  50/40/10 (`kryciPlatebniKalendar`, `{{PODM_PLATEBNI_KALENDAR}}`,
  `{{PODM_FAKTURACE_MESICNE}}`, `rozvinRadkyZaRadek` v docxgen). Umí to
  šablona **CN v14** (`--cn-v14`, 112 symbolů); se starší šablonou
  varuje kontrola **platbyWordOck**. Odeslaná varianta bez značky
  `pravidlaPlateb` tiskne věty v13 jako dřív.
- **K18-N95:** úvod a termíny nabídky PROJ v EN/DE/FR přeložené
  (23 hesel slovníku, návrh ke kontrole); mutace šablony PROJ v4 bez
  napůl českých řádků.
- **K18-N96:** kontrola **dodatekCesky** — dodatkový text z ceníku, který
  slovník nepřeloží, v cizojazyčné nabídce → varování s výčtem položek.
- **K18-N97:** materiál opláštění po stěnách vyjmenuje specifikace
  i nabídka se stěnami („Sklo VSG 4.4.1 (stěna A); Cetris (stěny B, D)…").

**Šablony (mimo repozitář, předány J. V.):** Sablona_NABIDKA_CN_v14.docx
a Sablona_NABIDKA_PROJ_v4.docx, obě s mutacemi EN/DE/FR.

**Příručka:** světlíky u dveří, nadsvětlík „zajistí stavba", po stěnách
není atyp, platební podmínky OCK, 3D zaměření a Zaměření strojovna;
`podklady/OBRAZOVKA_OPLASTENI.md` opravený.

**Zjištěno, neopraveno (#377, čeká na J. V.):** zábrany z kontroly
(rozmery včetně stropu zdvihu, profilNeznamy, zapornaPolozka, cenaNula…)
neblokují tlačítka dokumentů — `dokumentZabrana()` hlídá jen ukázkový
ceník a plán plateb PROJ.

Testy (pojistka proti prázdnému testu, podrobně v commitech větví):
test_svetliky_boky 19/88 → 107/0, test_platby_ock 11/47 → 77/0,
test_k18_nalezy (oddíly N92–N97) vše selhávalo → 71/0,
test_sablona_proj_v4 25/12 → 40/0, test_specifikace_cena 57/14 → 71/0,
test_kryci 119/3 → 127/0 (dvě dávky), test_oplasteni_steny 26/11 → 37/0,
test_kontroly (31 pravidel), overit_oplasteni 64/7 → 71/0,
overit_specifikace_cena 17/6 → 25/0, overit_zadani_detail 39/3 → 53/0,
overit_sablona (sekce v14) → 102/0, overit_lista → 31 pravidel.
Mutace jádra 88 → 111 úseků (+2 B3, +3 platbyWordOck, +3 N92, +3 N96,
+12 #375), všechny nové chycené.

**Ověřeno celým kolem** (`nastroje/testovaci_kolo.sh`, nad d7e2f32): VŠE ZELENÉ
za 62 min 5 s — sady 207 prošlo, 0 selhalo, 1 přeskočeno (test.js); mutace
jádra 111 z 111; mutace serveru 207 z 207; statické kontroly 3 z 3. Po kole
strom čistý. Převedeno do `test-draft` (fast-forward), `test` zůstává na
v30.9.3 a `main` na v30.9.1.

---

## v30.9.3 — Q5: dřívější záloha se přepne na předvolbu sama; `main` = v30.9.1 (30. 9. 2026)

Větev `claude/etapa-b-q5-zaloha-automaticky` (z `test-draft` v30.9.2).
Rozhodnutí J. V. 30. 9. 2026 k otázkám etapy B: **Q5 — „zálohu přepni
automaticky"**; Q9 a Q10 potvrzeny; Q1, Q2, Q4, Q11 a Q12 bez námitky
(platí výchozí návrh); body revize a (brána v korunách) a b (server
nekontroluje tvar plánu ve variantě) „zatím OK"; **Q8 „ponechat"** —
firemní Standard po činnostech se dál mění převzetím splátek z krycího
listu otevřené zakázky (tlačítko v Nastavení), bez zvláštního editoru. Týž den na pokyn J. V. „pošli aktuální test do main": **`main`
fast-forward na `test`** (fde25ff, v30.9.1 — tag i release existují).

- **Dřívější záloha krycího listu PROJ** (uložená volba „Bez zálohy" /
  „Záloha 30 / 50 / 70 %") se u rozpracované zakázky, jejíž plán plateb
  ještě nemá předvolbu, přepne na předvolbu „Záloha X % + zbytek po
  předání" sama — do té doby ji nabízelo tlačítko. Líně jako ruční splátky
  (`planZalohaZeStarych` v `planPlatebVarianty`, bez zápisu do dat); první
  zápis do plánu převod zhmotní. Plán s vlastní předvolbou ani odeslaná
  nabídka z doby před plánem se nepřepínají; upravené splátky zůstanou.
  Vlastní znění, které předvolba neumí (třeba 40 %), se jen ohlásí.
  Tlačítko „Použít jako předvolbu" a `planKlpZalohaZeStare` zrušeny.
- Příručka: věta u hesla „Plán plateb".
- Testy (pojistka proti prázdnému testu): nové testy nad kódem bez úpravy
  selhaly — `test_plan_plateb_kryci` 6 z 65, `overit_plan_plateb` 2 z 47;
  po úpravě prošly. Mutace jádra +1 „dřívější záloha se nepřepne"
  (chycená, kotev 88).

**Ověřeno celým kolem** (`nastroje/testovaci_kolo.sh`, nad 8cb2534): VŠE ZELENÉ
za 71 min 53 s — sady 204 prošlo, 0 selhalo, 1 přeskočeno (test.js); mutace
jádra 88 z 88; mutace serveru 207 z 207; statické kontroly 3 z 3. Po kole
strom čistý. Převedeno do `test-draft` (fast-forward), `test` a `main`
zůstávají na v30.9.1.

---

## v30.9.2 — etapa B platebních podmínek: plán plateb projekce (30. 9. 2026)

Větev `claude/etapa-b-plan-plateb-v30.9.1` (z `test-draft` v30.9.1, pokyn
J. V. 30. 9. 2026 „pokračuj etapou B v nové větvi … výstup pošli zatím do
test-draft"). Roadmapa **#367** (etapa B hotová, etapa A zbývá) a **#366**
(bod P9.3 — dopočet plateb SoD PROJ). Rozhodnutí J. V. 29. 9. 2026: čtyři
předvolby, výchozí Standard po činnostech, splátky SoD PROJ se stejným
milníkem sečtené, šablona SoD PROJ se seznamem plateb jedním symbolem.
Plán plateb je JEDEN (krycí list PROJ); nabídka PROJ, tištěný krycí list,
smlouva o dílo PROJ a Nastavení → Firma ho jen čtou.

- **Jádro `src/plan_plateb.js`** (CORE za `zpracovatel.js`, i mezi jádry
  mutačního testu): katalog 14 milníků, předvolby Standard po činnostech
  (= dnešní procenta nabídky), Záloha + zbytek po předání (0/30/50/70 %),
  100 % po dokončení stupně, Vlastní; dopočet plateb smlouvy (procento ×
  cena činnosti po slevě, celé koruny, zaokrouhlení nese poslední splátka
  činnosti, stejný milník sečtený, ruční přepis, osiřelé přepisy); kontroly
  (100 % u činnosti, kladná procenta, známý milník, součet = cena díla);
  plán varianty (rozpracovaná → firemní plán, odeslaná → snímek, odeslaná
  bez snímku → jako dřív); snímek při prvním zamčení; převod starších
  ručních splátek; kontrola tvaru firemního plánu.
- **Nastavení → Smlouvy / Šablony → Plán plateb projekce** (administrátor):
  výchozí předvolba, záloha, Standard po činnostech (převzetím z otevřené
  zakázky — výchozí návrh Q8), milník „po předání", katalog milníků (text,
  přidat, odebrat jen nepoužitý), vady plánu. Zveřejňuje se s firemními
  údaji (`firmaKZverejneni`, kontrola tvaru na serveru i v prohlížeči).
- **Krycí list PROJ**: karta Plán plateb (předvolba, splátky nabízených
  činností — procento, milník z katalogu nebo vlastní text, ↑ ↓ ✕,
  + splátka, ↺ předvolba, součet 100 %, nedostatky) a v sekci „Smlouva
  o dílo — splátky" tabulka plateb (milník, složení, dopočet, ruční částka,
  ↺, součet proti ceně díla). Záloha, fakturace po stupních, způsob
  fakturace (nově z předvolby, Q10) a ruční splátky 1–8 zůstávají jen
  u odeslané nabídky z doby před plánem; tisk nese řádky „Plán plateb".
- **Nabídka PROJ** (online i Word): bloky „PLATEBNÍ PODMÍNKY …" jen
  nabízených činností z plánu (DPS a EZC zvlášť, nově i projednání
  a geodet); symboly `{{PROJ_PLATBY_<ČINNOST>}}` a `{{PROJ_PLATEBNI_PODMINKY}}`
  pro šablonu **PROJ v4** — vyrobí ji `node nastroje/vyrob_sablony.js
  --proj-v4 <podklady>` z PROJ v3 (i EN/DE/FR). Překlady nadpisů, řádků
  „Platba …" a vzor „N % z nabídkové ceny za …".
- **Smlouva o dílo PROJ**: `{{SODP_PLATEBNI_KALENDAR}}` — odstavec (odrážka)
  za každou platbu větou „Platba ve výši … + DPH proběhne …"; šablonu
  **SoD PROJ v2** vyrobí `node nastroje/vyrob_sablony.js --sod-proj
  <podklady>` ze stávající. Stará šablona s osmi pevnými platbami dostane
  `SODP_PLATBAn_KC` u plateb se stejným milníkem; plán s platbou, kterou
  neumí, smlouvu nevyrobí (s vysvětlením).
- **Zábrany** (J. V.: dokument nevznikne, odklepnout nejde): pravidla
  `planPlateb100` a `planPlatebSoucet`, varování `planPlatebWordProj`
  (šablona bez plánu a plán jiný než Standard); skutečná brána v
  `dokumentZabrana(typ)` pro nabídku PROJ (Word i náhled) a smlouvu o dílo
  PROJ. Pravidel kontroly 27.
- **Převod starších zakázek** (Q5): ruční splátky `sodpPlatba1–8` platí jako
  ruční částky plateb se stejným milníkem (nečitelná se ohlásí), dřívější
  záloha se nabídne tlačítkem jako předvolba; nic se nepřepisuje samo.
- Výpočet cen činností nabídky PROJ vyčleněn do `nabidkaProjCeny` (beze
  změny chování) — plán počítá z téže ceny po slevě jako nabídka.

**Výchozí návrhy použité do rozhodnutí J. V.** (podklad oddíl 5): Q1
projednání 100 % po předání vyjádření OPP HMP; Q2 geodet 100 % po předání
zaměření; Q4 celé koruny, poslední splátka dorovná; Q5 starší zálohu
nepřepínat, nabídnout; Q8 Standard převzetím z otevřené zakázky; Q10
způsob fakturace z předvolby; Q11 řádek smlouvy větou dřívější šablony;
Q12 řádky „Platba … / N % z nabídkové ceny za …".

**Testy (pojistka proti prázdnému testu — každý doložen selháním před
změnou ve zprávách commitů):** `src/test_plan_plateb.js` 65,
`src/test_plan_plateb_kryci.js` 41, `src/test_plan_plateb_sod.js` 24,
`src/test_sablona_proj_v4.js` 20, `src/test_firma.js` +8,
`netlify/test_funkce.mjs` +2, `overit_plan_plateb.mjs` 40 (prohlížeč),
`overit_sod.mjs` (SoD PROJ z nové šablony), upravené `test_kontroly`,
`test_kryci_proj_model`, `test_nabidka_proj`, `overit_lista` (27 pravidel).
Mutace jádra +5, serveru +1 — chycené všechny (mutace „neoceněná činnost"
byla nejdřív NECHYCENÁ, doplněn cílený test).

**Revize před sloučením (30. 9. 2026).** Dvě nezávislé revize celé etapy
(výpočet a dokumenty; obrazovky, zámek a ukládání) — obě vážné vady našly
obě. Opraveno v 843ff63, verze zůstává v30.9.2 (sestavení f4094a5 nikam
neodešlo):
- **Snímek plánu u klonu a po odemčení** (blokující): snímek se bere při
  každém prvním zamčení. Klon odeslané varianty i varianta odemčená
  správcem nesly snímek předlohy — zamčené pak tiskly a smlouvu dopočítaly
  z cizího plánu a činnost navíc zablokovala zábrana natrvalo.
- **Brána dokumentu hlídá variantu, ze které dokument vzniká** (závažná):
  Word nabídky PROJ i smlouva po odpovědi „Ne" vznikají z řídící varianty;
  brána kontrolovala otevřenou (vadnou řídící pustila, zdravou zastavila
  kvůli jiné). Plán, který nejde spočítat, dokument zastaví.
- menší: převod dřívější zálohy pozná uložené „Záloha 30 %" (tlačítko jen
  u 0/30/50/70 %, před zahozením upravených splátek se zeptá); zamčená
  varianta pod firemním Standardem se nehlásí „upraveno"; varování
  `planPlatebWordProj` srovnává se Standardem z kódu (co tiskne šablona
  v2/v3 — firemní Standard i přepsaný text milníku varují); symboly
  `{{PODM_…}}` nabídky PROJ jen z viditelných polí (skrytá záloha a
  fakturace po stupních se neplní, způsob fakturace z předvolby); smlouva
  starší odeslané nabídky s novou šablonou dostane seznam plateb z ručních
  splátek a prázdný seznam symbol nesmaže; poškozený snímek ani firemní
  plán nic neshodí (pole splátek oříznuté na 10, Nastavení s vysvětlením
  a „Vrátit výchozí"); odebrání nepoužitého milníku z katalogu se zeptá.
Nové testy napsané před opravou nad f4094a5 selhaly (`test_plan_plateb_kryci`
10 z 56, `test_plan_plateb_sod` 5 z 30, `overit_plan_plateb` 8 z 49, nový test
v `test_kryci_proj_model`), po opravě prošly; mutace jádra +2 (kotev 87).

**Ověřeno celým kolem** (`nastroje/testovaci_kolo.sh`): nad f4094a5 (před
revizí) VŠE ZELENÉ za 70 min 40 s — sady 204 prošlo, 0 selhalo,
1 přeskočeno (test.js — shoda s Excelem není v exportu); mutace jádra 85
z 85; mutace serveru 207 z 207; statické kontroly 3 z 3. Nad 843ff63
(s opravami revize) VŠE ZELENÉ za 72 min 17 s — sady 204 prošlo, 0 selhalo,
1 přeskočeno; mutace jádra 87 z 87; mutace serveru 207 z 207; statické
kontroly 3 z 3. Po kole strom čistý, `if (false)` mimo zadání mutací a testy
nikde. Větev převedena do `test-draft` (fast-forward), `test` beze změny.

---

## v30.9.1 — sloučení do test-draft: opravy šesti nálezů 21. kola (B111, B96, B112, B97, B98, B99) (30. 9. 2026)

Na pokyn J. V. 30. 9. 2026 („pushni novinky do testu“) sloučena do
`test-draft` větev `claude/oprava-sesti-nalezu-v29.9.1` (hlava 148e1c4,
roadmapa **#373**) a výsledek převeden do `test`. Větev vznikla nad 9a48ee8
(v29.9.1 ve větvi `claude/pensive-curie-s6yzs3`, jen předávka — kód jako
v26.9.1), tedy před sloučením v29.9.4; její opravy nesly vlastní čísla
v29.9.2–v29.9.7, která se kryjí s čísly v `test-draft`. Záznamy větve jsou
proto níže jako podkapitoly s číslem „ve větvi“. Tag `v30.9.1`.
Rozpracovaná etapa B platebních podmínek (`claude/etapa-b-plan-plateb-proj`,
v29.9.5 ve větvi) zůstává ve své větvi, dokud nebude hotová.

**Při sloučení:**
- `netlify/lib/zakazka_kontrola.mjs` (sloučeno bez konfliktu, ověřeno
  čtením): kontroly B111 (záporné), B96 (zaokrouhlení) a B112 (ceník
  a přepisy) stojí za kontrolou typů polí a před kontrolou neznámého rozměru
  profilu (#372); obnova ze souboru (B98) a razítko `upravilJmeno` (P7) vedle
  sebe beze změny.
- Pravidel kontroly je 24 (23 z `test-draft` + `zapornaPolozka`), zábrany
  v pořadí rozmery, profilNeznamy, zapornaPolozka, cenaNula, sleva,
  slevaProj, ukazkovyCenik (`src/test_kontroly.js`, `overit_lista.mjs`).
- `netlify/test_obnova.mjs`: bloky #372 a B98 nesly stejná čísla zakázek
  (0790–0794, sdílená databáze sady) — B98 přečíslován na 0800–0804.
- `src/docxgen.js` exportuje `docxObsahZkontroluj` (B99) i
  `odstranPrazdneBloky` / `docxZnackyBloku` (P8A); sady mutací serveru nesou
  `test_rejstrik.mjs` i `test_zaporne.mjs`.
- Roadmapa: #373 hotovo, #374 (zbývající cesty třídy „koncová cena“) čeká;
  čísla z větve jsou v `test-draft` volná, nic se nepřečíslovalo.

**Ověřeno celým kolem** `nastroje/testovaci_kolo.sh` 30. 9. 2026 nad
sloučeným stavem (commit 6ee8e83): VŠE ZELENÉ (69 min 50 s) — kontrola
verze + sestavení ✓; sady 199 prošlo, 0 selhalo, 1 přeskočeno z 200
(test.js — shoda s Excelem není v exportu pro GitHub; overit_manual.mjs
a overit_sod.mjs běžely s podklady přes KNG_PODKLADY); mutace jádra
chycených 80 z 80; mutace serveru 206 z 206 (192 z `test-draft` + 14
z větve oprav); statické kontroly 3 z 3. Šablony pro harnessy: CN v13
(+EN/DE/FR) a PROJ v3.

### B99: šablony Wordu bez maker, vložených objektů a vnějších vztahů (ve větvi v29.9.7, 29. 9. 2026)

Šestý ze šesti nálezů 21. kola (větev `claude/oprava-sesti-nalezu-v29.9.1`).
Roadmapa #373.

**Nález B99 (střední, integrita dokumentů).** Server ověřil jen začátek ZIPu
(„UEsDB"), průvodce text, jazyk, symboly a strukturu XML; generátor
i překlad kopírují zbytek ZIPu beze změny. Syntetická šablona s
`word/_rels/settings.xml.rels` → `attachedTemplate`
`https://example.invalid/x.dotm` (`TargetMode="External"`) prošla
zveřejněním (200) i kontrolami průvodce a generátor ji přenesl do
vygenerované nabídky — EN nabídka by si u zákazníka stáhla cizí šablonu
s makry.

- **Nový modul `src/sablona_obsah.js`** (CORE v `build.py` hned za
  `sablony_online.js`, na serveru v `jadro_moduly.cjs` ve stejném pořadí):
  `sablonaObsahVadyZipu()` nad rozbaleným ZIPem, `sablonaObsahVady()` pro
  ArrayBuffer / base64. Odmítá vnější vztahy kromě hypertextových odkazů
  **http(s) a mailto** (mailto nese dnešní šablona PROJ — bez něj by
  neprošla; odkaz Word sám nestahuje), typy vztahů attachedTemplate,
  oleObject, package, aFChunk, vbaProject, frame, subDocument, části
  `word/embeddings/*`, `vbaProject*.bin`, ActiveX, typ obsahu macroEnabled
  a pole INCLUDETEXT, INCLUDEPICTURE, DDE, DDEAUTO (i rozdělená do běhů).
- Volá ho **server** při zveřejnění (`/api/sablony` → 400 s českou hláškou,
  co vadí; nečitelný ZIP je taky vada), **průvodce** (`sablKontrolaSouboru`,
  i „Nahrát vlastní verzi") a **generátor i překlad** (`docxVyplnSablonu`,
  `docxPrelozSablonu` — obrana do hloubky: odmítnout, ne tiše vyhodit).
- Dnešní firemní šablony (CN v13 + EN/DE/FR, CN v11, PROJ v2_opravena i v3,
  SoD realizace a projekce, plná moc) kontrolou projdou.
- Serverové sady posílaly jako šablonu jen řetězec „UEsDB…" — teď skutečný
  minimální .docx z generátoru (`test_sablony`, `test_funkce`, řádek matice
  v `test_prava`).

**Testy (pojistka proti prázdnému testu):** `src/test_sablona_obsah.js`
(nová, 27 kontrol; před opravou 1 prošlo / 1 selhalo — modul neexistoval,
s modulem bez zapojení 25 / 2), `netlify/test_sablony.mjs` (+3; před
opravou 19 / 3 — zveřejnění s attachedTemplate 200 → 22 / 0). Mutace
serveru +1 („kontrola obsahu šablony se na serveru nevolá") — chycená.
Harnessy s firemními šablonami: overit_sablona 60, overit_sablony_online
53, overit_sod 25, overit_nabidka_proj_word 51 — vše OK.

### B98: obnova ze souboru nepřebírá razítka zámku a odemčení (ve větvi v29.9.6, 29. 9. 2026)

Pátý ze šesti nálezů 21. kola (větev `claude/oprava-sesti-nalezu-v29.9.1`).
Roadmapa #373.

**Nález B98 (střední) — podvržený doklad na jméno jiného správce.** Obnova
ze SOUBORU zálohy převzala (a) razítko ověření nového zámku — zmrazený
výsledek se `zakladCena = 1` a razítkem „shoda" na hlavního správce se
zapsal jako shoda, ačkoli běžné uložení dá „nesouhlasi"; (b) odemčení
odeslané nabídky s razítkem na hlavního správce a libovolným datem. Soubor
jde upravit v editoru — přesně hrozba, kvůli které B27 zakázal obnovu účtů
a podpisů ze souboru.

- `netlify/functions/obnova.mjs` předává `zeSouboru` (zdroj = nahraný
  soubor, i po dávkách).
- `netlify/lib/zakazka_kontrola.mjs`: ze souboru se ověření každého nového
  zámku spočítá **vždy znovu** (`zamekOvereni`); nesouhlas se zapíše jako
  „nesouhlasi" a náhled obnovy ho ukáže u zakázky (`upozorneni`).
  **Odemčení, které v databázi není** (i u zakázky, která v databázi vůbec
  není), zakázku přeskočí s důvodem — výchozí návrh J. V.
- Obnova z **otisku** (serverová záloha, klient ji upravit nemůže) přebírá
  razítka dál, jak byla. Jedna kontrola pro uložení i obnovu (B72/P4) platí
  dál; kotva mutace P4 „obnova nedoplní ověření" přešla na nový blok.

**Testy (pojistka proti prázdnému testu):** `netlify/test_obnova.mjs`
oddíl „B98" (8 kontrol; před opravou 160 OK / 6 FAIL → 166 / 0; dvě kontroly
obnovy z otisku procházejí před i po — hlídají, že se nezměnila). Mutace
serveru +2 („obnova nechá ověření ze souboru", „obnova převezme odemčení
ze souboru") — chycené 2 z 2; mutace P4 ×5 dál chycené.

### B97: e-mailový klíč brzdy přihlášení už nezasáhne počítadlo adresy (ve větvi v29.9.5, 29. 9. 2026)

Čtvrtý ze šesti nálezů 21. kola (větev `claude/oprava-sesti-nalezu-v29.9.1`).
Roadmapa #373, #345. Vážnost střední (výchozí návrh, čeká na potvrzení J. V.).

**Nález B97 — anonym zablokoval přihlášení celé cizí adrese.** Počítadlo
e-mailu (klíč = e-mail malými písmeny) a počítadlo adresy (`ip:<adresa>`,
`ip6:<prefix>::/64`) ležela v témže úložišti `pokusy` bez předpony. 61×
„přihlášení" s e-mailem `ip:198.51.100.55` z jiné adresy zvedlo počítadlo
adresy oběti a ta dostala 429 i se správným heslem (od B75 se limit adresy
rozhoduje před ověřením hesla); totéž „Změnit moje heslo".

- `netlify/lib/sdilene.mjs`: e-mailový klíč nese předponu **`e:`**, funkce
  nad syrovým klíčem (`pokusyStavKlic`, `pokusyNeuspechKlic`,
  `pokusyResetKlic`, `pokusyUber`) a e-mailové (`pokusyStav`,
  `pokusyNeuspech`, `pokusyReset`) jsou oddělené. Migrace není potřeba —
  počítadla žijí čtvrt hodiny.
- `pokusyZacatek`: e-mail neplatného tvaru (`emailPlatny`) žádné e-mailové
  počítadlo nezakládá ani nezvedá; počítadlo adresy se započítá vždy.
  Odpověď stejná 401 jako u špatného hesla. Platí pro přihlášení
  i `mojeheslo`.
- Oprava B75 (429 před scryptem, IPv6 po /64, cizí úspěch nenuluje) platí
  dál; kotva mutace B75 „úspěch nuluje i adresu" přešla na
  `pokusyResetKlic`, aby dál zkoušela totéž.

**Testy (pojistka proti prázdnému testu):** `netlify/test_prihlaseni.mjs`
oddíl „B97" (7 kontrol; před opravou 45 prošlo / 5 selhalo → 50 / 0).
Mutace serveru +2 („e-mailový klíč bez předpony", „neplatný e-mail zvedá
e-mailové počítadlo") — chycené 2 z 2; mutace B75 ×3 dál chycené.

### B112: ceník varianty a skryté přepisy podle role hlídá server (ve větvi v29.9.4, 29. 9. 2026)

Třetí ze šesti nálezů 21. kola (větev `claude/oprava-sesti-nalezu-v29.9.1`),
zápisová strana B88. Roadmapa #373, #345, nová #374 (zbývající cesty třídy).

**Vysoký nález B112 — obchodník ručním požadavkem snížil cenu nabídky o
25–42 % bez schválení.** Přirážka varianty 0,20 → −0,10: OCK 980 000 →
735 000 Kč (−25 %); přirážka PROJ −0,30: 271 200 → 158 200 Kč (−41,7 %);
cena profilů 100 → 1 Kč/kg: −14,2 %; přepis množství hlavních položek
a vlastní % sekce PROJ −50 — vše 200. V prohlížeči `set('C.marze', -0.1)`
z konzole a běžné uložení → uloženo. Ceník a přepisy hlídala jen matice
zobrazení v UI.

- **Server:** `uloCenikProblemy()` v `src/uloziste.js` (přes
  `uloProVarianty()`), volaná hned za kontrolou B96, odmítnutí **403**
  „Ceník varianty smí měnit jen administrátor nebo role, které to povoluje
  matice zobrazení …". Administrátor smí vždy; ostatním rozhoduje matice
  uložená na serveru (`program/zobrazeni`, jinak výchozí): bez `tab.cenik`
  / `tab.cenikproj` musí každá hodnota ceníku OCK / PROJ být z uložené verze
  téže varianty, ze zveřejněného ceníku (platná i dřívější verze, složená
  pro řadu varianty, po týchž migracích jako import) nebo z jiné uložené
  varianty (klon); přirážka se uvolní právem `pole.prirazka`. Porovnává se
  po položkách — přepočet jen vybraných položek je běžná práce. Dodatkové
  texty (popisy) a sazba DPH se nehlídají. Přepisy (`mnozstviPrepis`,
  `cenyPrepis`, PROJ `prirazkaPct`, `sazbaPrepis`, `cenaPrepis`) smí měnit
  jen role s právem `sloupce.naklad` — v UI se zadávají jen ve sloupcích,
  které to právo ukazuje (i ruční množství příplatků). Varianta zamčená
  v uložené verzi se přeskakuje; bez zveřejněného ceníku se ceník nehlídá.
- `netlify/functions/zakazky.mjs` čte pro kontrolu matici zobrazení (jen
  u neadministrátora) a předává zveřejněné ceníky.
- **Testy upravené kvůli realistickým datům:** fixtury `test_prava.mjs`
  (`zakazkaCislo`, `zakazkaSCeny`) nesou ceník jako aplikace po přihlášení
  — platný zveřejněný; B26 (tvar `kid` trvalé položky) a očista značek
  ceníku v `test_funkce.mjs` ukládají pod administrátorem (trvalou položku
  i vlastní ceník varianty zakládá jen on).

**Testy (pojistka proti prázdnému testu):** `netlify/test_prava.mjs` oddíl
„B112" (28 kontrol; před opravou 608 prošlo / 15 selhalo → 623 / 0 —
všechny útoky i hranice rolí dnes 200), `overit_cenik_prava.mjs` (nový
harness, 6 kontrol; před opravou 4 / 2 — podvrh uložen, cena 735 000 Kč).
Mutace serveru +4 („ceník varianty se nehlídá", „přepis množství se
nehlídá", „matice se na serveru nečte", „zveřejněný ceník se nebere za
kandidáta") — chycené 4 z 4.

### B96: krok obchodního zaokrouhlení hlídá server (ve větvi v29.9.3, 29. 9. 2026)

Druhý ze šesti nálezů 21. kola (větev `claude/oprava-sesti-nalezu-v29.9.1`).
Roadmapa #373, #38.

**Vysoký nález B96 — obchodník krokem zaokrouhlení snížil cenu nabídky
skoro o polovinu bez schválení.** Varianta bez slevy s `zaokr = { krok:
⌊z/2⌋+1, smer: 'dolu' }`: cena OCK 980 000 → 490 001 Kč (marže −66 %),
uložení 200, nový zámek dostal „shoda" (zaokrouhlení do výsledku jádra
nevstupuje), rejstřík schvalování nic. Výčet `ZAOKR_KROKY`/`ZAOKR_SMERY`
platil jen pro `<select>`; `zaokrSetKrok(490001)` z konzole prošel.

- **Server:** `uloZaokrProblemy()` v `src/uloziste.js` (přes společnou
  `uloProVarianty()`), volaná hned za kontrolou B111. `data.zaokr`
  i `data.zaokrProj` musí být objekt s krokem z výčtu (číslo i číslo jako
  text) a směrem z výčtu; chybějící nastavení se toleruje, nic se
  nepřevádí. Odmítnutí 400 „… obchodní zaokrouhlení mimo nabídku (varianta
  X: zaokr.krok) …". Varianta zamčená v uložené verzi se přeskakuje.
  Sémantika `zaokrKrok` v jádře beze změny (princip dokladu).
- **UI:** `zaokrSetKrok`, `zaokrProjSetKrok`, `zaokrSetSmer`,
  `zaokrProjSetSmer` přijmou jen hodnoty z výčtu (jinak hláška); uložená
  hodnota mimo výčet se v `<select>` ukáže jako „mimo nabídku — nepovolené"
  místo zavádějícího „bez zaokrouhlení".
- **Detekce:** `nastroje/detekce_zneuziti.mjs` hledá i krok/směr mimo výčet
  (i v zamčených variantách).
- **Bod 4 (marže z koncové ceny i bez slevy)** jen jako návrh do
  `BEZPECNOST_MEZE.md` a `PREDAVKA.md` — nerealizováno, čeká na J. V.
- `overit_zaokrouhleni.mjs` zkoušel oddělení OCK/PROJ krokem 100 000 Kč
  (mimo výčet) — přepnuto na 10 000 Kč; zámek se zkouší krokem z výčtu.

**Testy (pojistka proti prázdnému testu):** `netlify/test_prava.mjs` oddíl
„B96" (13 kontrol; před opravou 587 prošlo / 7 selhalo → 595 / 0, kontrola
detekčního skriptu přibyla po opravě), `src/test_uloziste.js` (+11; před
opravou 161 / 1 — funkce neexistovala), `overit_zaokrouhleni.mjs` (+4; před
opravou 12 OK / 4 FAIL → 16 / 0). Mutace serveru +2 („kontrola zaokrouhlení
se nevolá", „výčet kroků se nekontroluje") — chycené; sdílenou mutaci
přeskakování zamčené varianty chytá nově i `test_prava`.

### B111: záporná vlastní položka, množství ani hodiny neprojdou (ve větvi v29.9.2, 29. 9. 2026)

Větev `claude/oprava-sesti-nalezu-v29.9.1` (z v29.9.1 = 9a48ee8), první ze
šesti nálezů 21. kola. Roadmapa #373 (nová), #33.

**Vysoký nález B111 — obchodník v běžném UI snížil cenu nabídky bez
schválení.** „+ přidat položku" s cenou −302 167 Kč: cena OCK 980 000 →
617 000 Kč (−37 %), PROJ „+ přidat fixní položku" −90 400 Kč: 271 200 →
162 720 Kč (−40 %); uložení 200, žádná lišta, rejstřík schvalování nic.
Záporná položka sníží vykázaný náklad i cenu stejným poměrem, takže marže
vypadala zdravě (B71 ji nepozná) a v dokumentu po ní nezůstala stopa.

- **Server (hranice):** nová `uloZaporneProblemy()` v `src/uloziste.js`,
  volaná v `zakazkaServerKontrola` hned za `uloTypyProblemy` (uložení
  i obnova, B72/P4). Odmítne 400 „Zakázka nese zápornou částku nebo
  množství (varianta X: <cesta>)" u ceny a množství vlastních položek OCK
  (`vlastniPolozky.<sekce>[]`, `volitelneVlastni[]`, `priplatkyVlastni[]`,
  i typ polí), u přepisů `mnozstviPrepis`/`cenyPrepis`, hodin N56 (dosud
  jen v UI) a u PROJ `cena`, `hodiny`, `rezerva`, `cenaPrepis`,
  `sazbaPrepis`. Výjimku nemá nikdo, ani administrátor (výchozí návrh,
  čeká na potvrzení J. V.). Varianta zamčená už v uložené verzi se
  přeskakuje (doklad) — společná pomocná `uloProVarianty()` pro B111, B96
  a B112.
- **UI:** `min="0"` u polí vlastních položek, příplatků a přepisů OCK
  i PROJ; `zaporneOdmitni()` v `vlastniSet`, `priplatekVlastniSet`,
  `mnozstviSet`, `cenaSet`, `pjPrepis` a `HODINY_BEZ_ZAPORU` rozšířené
  o `polozky.N.cena` — hláška „Částka ani množství nemohou být záporné.
  Snížení ceny zadejte jako slevu — ta jde přes schvalování."
- **Odmítnutí serveru je vidět u tlačítka „Uložit zakázku"** — dosud se
  „Neuloženo online: …" psalo jen do panelu Databáze.
- **Kontroly:** nové pravidlo `zapornaPolozka` (zábrana) pro už uložené
  zakázky — dokument nevznikne, dokud se položka neopraví.
- **Detekce dřívějšího zneužití:** `nastroje/detekce_zneuziti.mjs
  <zaloha.json>` (jen čte; spustí J. V.) vypíše varianty se zápornou
  položkou, množstvím nebo hodinami, i zamčené.

**Testy (pojistka proti prázdnému testu):** `netlify/test_zaporne.mjs`
(nová, 24 kontrol; proti kódu před opravou 3 OK / 19 FAIL — dvě kontroly
detekčního skriptu přibyly po opravě), `overit_zaporne.mjs` (nový harness,
15 kontrol; před opravou 5 prošlo / 10 selhalo), `src/test_kontroly.js`
(+7; před opravou 8 selhalo včetně počtu pravidel). Mutace serveru +3
(„záporná položka projde", „záporné číslo se nepozná", „zamčená varianta se
nepřeskakuje") — chycené 3 z 3.

---

## v29.9.4 — sloučení do test-draft: testovací sekvence A1–A5 (#371) a neznámý rozměr profilu (#372) (29. 9. 2026)

Na pokyn J. V. 29. 9. 2026 sloučeny do `test-draft` větve
`claude/pensive-curie-s6yzs3` (v26.9.1 — testovací sekvence A1–A5 a opravy
B72/P4, B75–B78, N43 na serveru, záznam níže) a `claude/stoic-cerf-j915ax`
(oprava #372, ve větvi v29.9.1 — záznam následuje). Tag `v29.9.4`.

**Při sloučení:**
- Roadmapa: položky z větví přečíslovány — #364 → **#371**, #365 → **#372**
  (v `test-draft` jsou #364 a #365 jiné úkoly); odkazy „#365" v kódu,
  testech a názvech mutací opraveny na #372.
- Razítko „kdo naposledy uložil" jménem (`upravilJmeno`, P7 z v25.9.7) se
  s ostatními pojistkami uložení přestěhovalo do společné
  `netlify/lib/zakazka_kontrola.mjs` (jen při uložení; obnova nechá razítko
  ze zálohy); mutace P7 přesměrována tamtéž.
- Pravidel kontroly je 23 (22 z `test-draft` + `profilNeznamy`); sady mutací
  serveru nesou i `test_rejstrik.mjs`; mutací jádra 80, serveru 192.

**Ověřeno celým kolem** `nastroje/testovaci_kolo.sh` 29. 9. 2026:
VŠE ZELENÉ (47 min 2 s) — kontrola verze + sestavení ✓; sady 193 prošlo,
0 selhalo, 3 přeskočeno z 196 (test.js — shoda s Excelem není v exportu
pro GitHub; overit_manual.mjs a overit_sod.mjs — firemní podklad mimo
repozitář); mutace jádra chycených 80 z 80; mutace serveru 192 z 192;
statické kontroly 3 z 3. Šablony pro harnessy: CN v13 (+EN/DE/FR)
a PROJ v3 přes KNG_PODKLADY.

### #372 — zakázka s neznámým rozměrem profilu jde otevřít

Roadmapa #372 hotovo (nález A2-1 z 26. 9. 2026). Větev
`claude/stoic-cerf-j915ax` nad `claude/pensive-curie-s6yzs3` (v26.9.1);
rozsah jen #372, N46 se neopravuje. **Pravidlo 0:** nález trval —
`vypocet()` padal na „Neznámá dimenze profilu: 999x999" / „Dimenze 80x80
nemá tloušťku 99 mm", `ui/kalk_ock.js` sám na `JEKLY[p.dim].kg`
(`renderInputs` i `zkontrolujTl`) a server takovou zakázku uložil
i obnovil — pak se nikomu neotevřela.

**Opraveno:**
- **Výpočet nespadne, ale chybu nezamlčí.** `jekl()` v `src/engine.js`
  u rozměru mimo katalog jeklů (nebo tloušťky, kterou rozměr nemá) dosadí
  nulovou hmotnost i plochu a profil zapíše do `vysledek.profily.nezname`
  („sloupek: 999x999 / 4 mm"). Seznam dává nová `profilyNezname(zadani,
  jekly)`; lemování jen u exteriérové šachty (interiérová ho nepočítá).
  Platná data se nezměnila ani o korunu — otisky výsledku výchozího
  zadání (interiér i exteriér, Model 1 i 2) jsou stejné jako před změnou.
- **Kontrola `profilNeznamy` = ZÁBRANA** (`src/kontroly.js`,
  `zabranaMozna`): „Rozměr profilu … není v katalogu jeklů — vyberte
  platný. Dokument nevznikne, dokud se to neopraví." Cena s nulovým
  profilem se tak nikdy nevytiskne. Pravidel je 20.
- **Zadání šachty ukáže pravdu** (`src/ui/kalk_ock.js`): ve výběru navíc
  zvýrazněná volba „neznámý rozměr: 999x999" (u tloušťky „neznámá: 99")
  a štítek „mimo katalog"; ostatní volby jsou platné rozměry. Po výběru
  platného rozměru `zkontrolujTl()` dosadí platnou tloušťku jako dřív,
  u neznámého nic nemění a nepadá.
- **Server odmítne nová špatná data, stará nezablokuje**
  (`netlify/lib/zakazka_kontrola.mjs`, uložení i obnova): neznámý rozměr
  nebo tloušťka v NEUZAMČENÉ variantě → 400 „… rozměr profilu není
  v katalogu jeklů (CN … — sloupek: 999x999 / 4 mm). Vyberte v zadání
  šachty platný rozměr"; obnova zakázku přeskočí s důvodem. Uzamčená
  (odeslaná) varianta se nemění, proto se nekontroluje. Katalog je týž
  `JEKLY` z `jadro()`, seznam dává táž funkce jádra.

**Testy — každý doložen selháním před opravou (ve zprávě commitu):**
- nová sada `src/test_profil_neznamy.js` (22 testů; bez opravy 5 prošlo,
  14 selhalo — prošly jen otisky platných dat), `src/test_kontroly.js`
  (bez opravy 2 selhání) a `overit_lista.mjs` (20 pravidel);
- `overit_xss.mjs` (A2) otravuje nově i `dim` a `tl` — komentář o nálezu
  A2-1 smazán; bez opravy UI 4 ✕ „vykreslení nespadlo" (`reading 'kg'`),
  teď 207 OK;
- nový harness `overit_profil_neznamy.mjs` (10 kontrol v prohlížeči; bez
  opravy UI 5 ✕);
- `netlify/test_obnova.mjs` — blok #372 (bez opravy 4 selhání, teď 165 OK);
- mutace: jádro +4 (`JADRA` nově i `kontroly.js` — zábrana je jediné, co
  brání vytisknout nulový profil), server +2 (neznámý rozměr se
  nekontroluje; kontroluje se i odeslaná varianta). `--kontrola`: jádro
  80, server 189 úseků, každý právě jednou.

**Ověřeno celým kolem ve větvi** `nastroje/testovaci_kolo.sh` 29. 9. 2026:
VŠE ZELENÉ (62 min 51 s) — kontrola verze + sestavení ✓; sady 187 prošlo,
0 selhalo, 3 přeskočeno z 190 (test.js — shoda s Excelem není v exportu
pro GitHub; overit_manual.mjs a overit_sod.mjs — firemní podklad mimo
repozitář, KNG_PODKLADY); mutace jádra chycených 80 z 80 (4 nové); mutace
serveru 189 z 189 (2 nové); statické kontroly 3 z 3.

---

## v29.9.3 — prázdné kapitoly ve Wordu, šablony CN v13 a PROJ v3, návrh platebních podmínek (29. 9. 2026)

Větev `test-draft`.

- **Prázdná kapitola zmizí z Wordu i s nadpisem (P8 varianta A, #365).**
  Generátor zná značky bloků: šablona obalí kapitolu odstavci
  `{{KAP_IV_ZAC}}` … `{{KAP_IV_KON}}` a když jsou všechny symboly uvnitř
  prázdné, zmizí celý blok (nadpis, rámeček, u VI. i věta o předávacím
  protokolu); jinak zmizí jen značky. Starší šablona bez značek se chová
  jako dřív — texty kontrol a Nastavení to teď říkají poctivě.
- **Šablona CN v13 (CZ/EN/DE/FR)** = v12 + značky kapitol IV., V., VI.
  a doložek + věty o dílčích daňových dokladech „(bez DPH)" (P10.4).
- **Šablona PROJ v3 (CZ/EN/DE/FR, #370)** = v2 + rekapitulace před
  „Vypracoval" (cena před slevou, sleva, CELKEM bez DPH — řádky slevy bez
  slevy zmizí) a blok vlastních položek `{{PROJ_POLOZKY_NAVIC}}` (zmizí,
  když žádné nejsou). Se šablonou v3 stojí činnosti ve Wordu za cenu před
  slevou jako v online nabídce (#364).
- Šablony vyrábí `nastroje/vyrob_sablony.js` z dodaných v12 / PROJ v2
  a jazykové mutace týmž překladem šablon jako aplikace; každý soubor
  ověří (platné XML, symboly shodné s češtinou, nic česky). **Soubory
  předány J. V. — nahrát v Nastavení → Šablony** (šablony nejsou
  v repozitáři).
- **Návrh platebních podmínek z krycího listu** (P10.3, P10.6, P9.1, P9.3)
  v `podklady/NAVRH_PLATEBNI_PODMINKY_2026-09-29.md` — čeká na odsouhlasení.

Testy: nová sada `src/test_bloky_sablony.js` 19 (bez opravy padá),
`overit_sablona` +10 (šablona v13: 83/83), `overit_nabidka_proj_word` +9
(šablona v3: 63/63); se staršími šablonami v12 / PROJ v2 dál 73/73 a 54/54.

---

## v29.9.2 — rozhodnutí J. V. k rozboru D: termín, smlouva, platební podmínky, PROJ u zahraničí (29. 9. 2026)

Větev `test-draft`. Podklad: tabulka rozhodnutí v `podklady/K16_ROZBOR_2026-09-25.md`.

- **Termín dodání v týdnech (P8b, #365).** Holé číslo termínu dostane
  jednotku: „12" → „12 týdnů", „cca 3" → „cca 3 týdny" (česky skloňované,
  po přičtení ATYP srovnané s novým číslem: „2 týdny" + 4 → „6 týdnů").
  Platí i pro ruční přepis v krycím listu. Termín s ATYP se tím dá přeložit
  celý (dřív „16 (vč. 4 týdnů za ATYP)" zůstalo v cizí nabídce česky).
- **Platnost 2 měsíce, splatnost z krycího listu (P10.1, P10.2, #367).**
  Náhled nabídky PROJ tiskne splatnost a platnost z krycího listu PROJ
  (přepis 45 dní dřív viděl jen Word). Náhradní platnost PROJ 2 měsíce
  (dřív 3), počet měsíců se skloňuje („5 měsíců", ne „5 měsíce"). Slovník
  zná lhůty „N měsíc/e/ů" a „N dní" obecně.
- **Způsob fakturace po milnících, nebo měsíční (P10.5).** Pole v krycím
  listu OCK je výběr, výchozí „Po milnících" (standard 50 / 40 / 10 nesou
  pole záloha, dílčí a konečná faktura). Dosavadní výchozí „Náš standard /
  měsíční" uložené v Nastavení se čte jako „Po milnících".
- **Záruka z krycího listu (P10.7).** Kapitola V. nabídky (online i Word)
  nese „Záruka: N měsíců" z krycího listu; věta o záruce z textu Firmy
  („5 let záruka na celé dílo.") se vynechá — krycí list má přednost.
- **Věty „(bez DPH)" ve slovníku (P10.4).** Obě věty o dílčích daňových
  dokladech ve znění „(bez DPH)" pro šablonu CN v13 (EN/DE/FR).
- **Smlouva o dílo realizace z krycího listu (P9.2, P9.4, #366).** Termín
  převzetí staveniště → `{{SOD_TERMIN_MONTAZ_OD}}`, konečné předání →
  `{{SOD_TERMIN_DOKONCENI}}`; nová sekce krycího listu OCK „Smlouva o dílo —
  podpisy a kopie" (firma v podpisové doložce, druhý podepisující, kopie
  faktur) se předvyplní z krycího listu PROJ. Nevyplněné zůstane ve Wordu
  `{{…}}` k doplnění.
- **Zámek drží i podmínky předvyplněné z Nastavení (P9.5).** Při prvním
  zamčení po tisku se předvyplněné hodnoty krycích listů OCK i PROJ opíšou
  do zakázky; dokud je varianta zamčená, platí ony, ne dnešní Nastavení.
  Server je uloží a zámek dál ověří jako shodný.
- **Projekci u zahraničí nerealizujeme (P11, #368).** Nová kontrola před
  nabídkou (varování): zahraniční ceník + oceněná projekce → vyřadit
  projekci, nebo vrátit tuzemský ceník. Dialog přepnutí ceníku říká totéž.
  Pravidel kontrol je 22.

Testy (každý bod bez opravy selže): nová sada `src/test_rozhodnuti_k16.js`
50, `test_sod` +7, `overit_online` +1 (zmrazené podmínky uloží server);
upravené `test_nabidka_kapitoly`, `test_standardy`, `test_kontroly`,
`overit_lista` na nové chování. Server ani jádro výpočtu se neměnily.

---

## v29.9.1 — nabídka PROJ se slevou sčítá rekapitulaci; rozhodnutí k rozboru D (29. 9. 2026)

Větev `test-draft`.

- **Nabídka PROJ se slevou: činnosti za cenu před slevou (#364).** Nález
  J. V. 29. 9. 2026: „DPZ a IČ by mělo být za cenu před slevou" a „chyba
  v součtu při udělení slevy". Rekapitulace vypisovala činnosti už po slevě
  (DPZ 70 100 + IČ 28 000) a pod nimi „Cena před slevou 114 100 − Sleva
  16 000 = CELKEM 98 100" — řádky se do ceny před slevou nesečetly. Online
  nabídka a Word se šablonou, která má řádek slevy (`{{PROJ_SLEVA_KC}}`),
  teď vypisují činnosti za cenu před slevou (tutéž jako bez slevy):
  činnosti → cena před slevou → sleva → CELKEM bez DPH. Šablona PROJ v2
  (bez řádku slevy) a smlouva o dílo PROJ nesou ceny po slevě jako dosud —
  jinak by součet v nich neodpovídal ceně, kterou zákazník platí. Karta
  nabídky PROJ v aplikaci ukazuje v rekapitulaci taky cenu před slevou
  a slevu. Ceny činností jsou zaokrouhlené obchodním zaokrouhlením PROJ
  (na stokoruny nahoru) stejně jako bez slevy — DPZ 81 510 Kč z kalkulace
  je v nabídce 81 600 Kč; sleva je rozdíl zaokrouhlených částek.
- **Rozhodnutí J. V. k rozboru D** jsou zapsaná na začátku
  `podklady/K16_ROZBOR_2026-09-25.md`; roadmapa #363 uzavřená, práce podle
  rozhodnutí v nových položkách #365–#370.

Testy: nová sada `src/test_proj_sleva_nabidka.js` 13 (bez opravy 6
selže), `overit_nabidky_dph` +5 (bez opravy nesedí součet).

---

## v26.9.1 — testovací sekvence z hloubkového testu (A1–A5) a opravy B72, B75–B78, N43 na serveru (26. 9. 2026)

Roadmapa #371 (nová), #342 hotovo, #345 z části. Zadání J. V. 25. 9. 2026
„testovací sekvence do repa": každý nález se nejdřív ověřil v aktuálním kódu
(Pravidlo 0), každý nový test má doloženo, že před opravou selže.

**Pravidlo 0 — už opravené dřív, přeskočeno:** B69, B70, B71, N47, N53, N54
(v25.9.4), B73, B74, N43 klient, N44 (v24.9.4), N45, N51 (v24.9.6), N56,
N57 (v24.9.7), N48, N49, N50, N52, N55 (v25.9.5). **N46 se neopravuje** bez
pokynu J. V. — fuzz rozdíl jen hlásí (INFO), „čeká na rozhodnutí J. V.".

**Opraveno:**
- **N43 na serveru — server migruje zakázku stejnými moduly jako prohlížeč.**
  `netlify/lib/jadro_moduly.cjs` neměl `kryci.js`, `kryci_proj.js`,
  `poznamky.js` a `protokol.js`; starší odeslaná zakázka se po otevření
  a uložení v prohlížeči (kde migrace doběhly) na serveru porovnala s
  nemigrovanou podobou a skončila 409 „data uzamčené varianty se změnila".
- **B72 / P4 — obnova ze zálohy prochází stejnými kontrolami jako uložení.**
  Nová `netlify/lib/zakazka_kontrola.mjs`: `zakazkaPrijmi()` +
  `zakazkaServerKontrola(stara, nova, relace, {rezim})` volají `/api/zakazky`
  i `obnova.mjs`. Obnova už nepustí slevu pod marží ani „schválenou"
  vymyšleným jménem, nepřepíše číslo odeslané nabídky, nezapíše značky
  ukázkových dat, doplní chybějící ověření zámku a nechá razítka i autora
  být. Sleva a marže se porovnávají proti migrované uložené podobě (jinak
  uložení zakázky z doby před 12. 8. razítkovalo slevu znovu).
- **B75–B78 — přihlášení jako celek.** Nad limitem adresy 429 PŘED ověřením
  hesla (scrypt se nepočítá); IPv6 po /64; úspěch cizího účtu počítadlo
  adresy nenuluje; `hesloVerze` při založení, vypnutí i archivaci účtu
  (stará cookie neplatí); brzda i u změny vlastního hesla; odhlášení odmítá
  cizí Origin, `null` a formulářový Content-Type.

**Nové testy (A1–A5), každý s pojistkou proti prázdnému testu:**
- A1 `src/test_fuzz_invarianty.js` — deterministický fuzz (seed 20260925,
  2000 zadání OCK a PROJ): žádné NaN, součty, tisíce, DPH a zahraniční
  řada, jedinečné klíče (N52), volitelné položky (delta), „nepočítat",
  přepis nákladu, po stěnách vs. jednotné, zrcadlení stěn, N46 jen INFO.
  Pojistka: 8 záměrných rozbití jádra, všech 8 chyceno.
- A2 `src/test_escape.js` — hlídač ČLENSKÝCH VÝRAZŮ bez ohledu na jméno
  (přesně tvar B69: `Z.typPortalu`, `C.dph`, `p.hodiny`), 63 prověřených
  výrazů s důvodem. `overit_xss.mjs` — otráví VŠECHNA pole zakázky i ostatní
  zdroje dat (firma, profil, účty, rejstřík, kartotéka, zálohy, žádosti,
  standard), obě role, 13 záložek + všechny panely Nastavení; 207 kontrol.
  Pojistka: čtyři rozbitá místa → 16 selhání se jmény cest.
- A3 `src/test_zamek_historie.js` + `src/fixtury/` (3 historické tvary
  zakázek z 8. 8., 17. 9. a 23. 9.): klient otevře → server uloží (200) →
  změna 409 → obnova nanečisto bez hlášky o zámku. Před opravou jádra
  serveru 3 selhání.
- A4 `nastroje/kontrola_udaju.py` + `nastroje/povolene_kontakty.txt` —
  e-maily, telefony a tajemství mimo povolený seznam (B79 ponecháno
  rozhodnutím J. V., výskyty jsou v seznamu). Pojistka: podstrčený soubor
  s 5 nálezy → 5 hlášeno.
- A5 `nastroje/testovaci_kolo.sh` — celá sekvence jedním příkazem
  (sestavení → všechny sady a harnessy → mutace jádra → mutace serveru →
  statické kontroly → souhrn s počty, nenulový kód). `pred_pushem.sh` je
  obal, CI volá tentýž skript — žádný druhý seznam kroků.
- `netlify/test_prihlaseni.mjs` (43; proti kódu před opravou 21 selhalo),
  9 testů B72 v `test_obnova.mjs` (před P4 4 + 3 selhaly), 14 nových
  mutací serveru (P4 5, B75–B78 9), `test_mutace.mjs` čte cíl mutace ze
  seznamu (po přesunu B59 do lib měřil prázdno).

**Nálezy mimo zadání (k rozhodnutí J. V.):** #372 zakázka s neznámým
rozměrem profilu (mimo tabulku JEKLY) nejde otevřít; skutečný telefon
a jméno kolegy v `overit_nabidka_proj_word.mjs` (dočasně v povoleném
seznamu, viz #346). CSP bez `'unsafe-inline'` zůstává jen návrhem.

Ověřeno: celé kolo `nastroje/testovaci_kolo.sh` 26. 9. 2026 (38 min): kontrola verze + sestavení ✓; sady 182 prošlo, 0 selhalo, 6 přeskočeno (test.js — skutečný ceník není v repozitáři; overit_manual, overit_nabidka_proj_word, overit_sablona, overit_sablony_online, overit_sod — firemní podklady mimo repozitář, KNG_PODKLADY); mutace jádra chycených 76 z 76; mutace serveru 187 z 187 (z toho 14 nových); statické kontroly 3 z 3. Dvě předchozí kola téhož dne našla a bylo opraveno: `test_mutace.mjs` po přesunu B59 měřil prázdno; mutace „vypnutý účet se nepozná“ přežila (dvě nezávislé pojistky, jeden test — doplněn cílený test v `test_prava.mjs`); dva testy struktury CI četly workflow (přesměrovány na testovaci_kolo.sh, kontrola verze přesunuta na začátek kola); souhrn kola nevypisoval přeskočené sady (pole v podshellu).

---

## v25.9.8 — dávka C kola 16: překlad šablon kolem symbolů, nabídka PROJ s vlastními položkami (25. 9. 2026)

Roadmapa #362, větev `k16-nalezy`.

- **Cizojazyčné šablony bez českých zbytků (P3 / K14-N63, K16-N84).**
  Mutace šablony CN v12 do EN/DE/FR nechávala česky 15 odstavců se symbolem
  (PROJ v2 dvanáct): hlavičku „Číslo nabídky: {{…}}", „Email:", „Tel:",
  „{{CENA_S_DPH}} včetně DPH", jednotky u cen PROJ („/ měsíc", „dní")
  a věty platebních podmínek. Odstavec se symbolem se teď překládá po
  úsecích mezi symboly, tabulátory a zalomeními a každý úsek zůstává ve
  svém běhu — tabulátory mezi popiskem a symbolem ani zalomení pod cenou se
  nepohnou (dosavadní překlad celého odstavce by text přestěhoval přes ně).
  Všechno, nebo nic: neznámý úsek nechá odstavec česky a průvodce šablon
  ho vypíše. Nová hesla slovníku (platnost nabídky, splatnost, obě věty
  dílčích daňových dokladů, řádek DPH se sazbou, „včetně DPH" …) jsou
  **návrh překladu ke kontrole J. V.**; „bez DPH" je nově „excl. VAT" /
  „zzgl. MwSt." (ladí s „including VAT" / „inkl. MwSt."). Výsledek: CN v12
  i PROJ v2 do EN/DE/FR bez jediného českého odstavce, XML bez vad.
  **Po nasazení je potřeba jazykové mutace v Nastavení → Šablony
  přegenerovat** — dodané soubory CN v12 EN/DE nesou 6 českých odstavců.
- **Vlastní položky v nabídce PROJ (P4 / K14-N64).** Položka přidaná do
  sekce PROJ („+ přidat položku") nebo trvalá z ceníku PROJ byla v ceně
  sekce, ale text nabídky o ní mlčel. Online nabídka ji vypíše pod popisem
  ceny své sekce; pro Word jdou symboly `{{PROJ_POLOZKY_NAVIC}}` (souhrnně)
  a `{{PROJ_NAVIC_<SEKCE>}}`.
- **Sleva a součet ve Wordu PROJ (P4 / K15-N66).** Aplikace součet a slevu
  posílá (`PROJ_CELKEM_BEZ_DPH`, `PROJ_CENA_PRED_SLEVOU`, `PROJ_SLEVA_PROC`,
  `PROJ_SLEVA_KC`, `PROJ_DPH_KC`, `PROJ_CELKEM_S_DPH`), šablona PROJ v2 je
  nemá. Řádky slevy PROJ ve wordové tabulce zmizí, když sleva není. Nové
  kontroly před nabídkou „Sleva projekce se ve Wordu neukáže" a „Vlastní
  položky projekce se ve Wordu neukážou". **Úkol pro šablonu PROJ (J. V.):**
  doplnit tabulku součtu se symboly výš a `{{PROJ_POLOZKY_NAVIC}}`.

Testy (každý bod bez opravy selže): `test_docx_preklad` +15,
`overit_sablona` +12 (šablona CN v12, EN/DE/FR), `overit_nabidka_proj_word`
+3, nová sada `src/test_k16_proj_word.js` 30, `overit_nabidky_dph` +1;
počet pravidel kontrol 19 → 21.

Mutace serveru nad v25.9.7 (spuštěné po pushi dávky B): **176 ze 176
chyceno** — i nové P6 (chybějící jádro dokumentu), P7 (jméno „kdo uložil"
od klienta), P15 (nedoplněné adresy rejstříku) a přepsaná B59. Dávka C
server ani jádro výpočtu nemění, mutační běh se pro ni neopakuje.

**Rozbor D (#363)** — `podklady/K16_ROZBOR_2026-09-25.md`: prázdné kapitoly
nabídky ve Wordu a termín bez jednotky (P8), symboly smlouvy o dílo z nabídky
(P9), jedno znění platebních podmínek (P10), PROJ u zahraniční varianty (P11),
náklady u obchodníka (P12 — kalkulace PROJ ukazuje obchodníkovi nákladové
sazby). Kód se nemění, čeká se na rozhodnutí J. V.

---

## v25.9.7 — dávka B kola 16: neuložené změny, ověření zámku, dialogy, adresa, zalomení ve Wordu (25. 9. 2026)

Roadmapa #361, větev `k16-nalezy`.

- **Žádné falešné „neuložené změny" (P5 / K14-N65, K14-N62).** Nová zakázka
  posune otisk „naposledy uloženo" — do teď se porovnávala s tou předchozí,
  takže prohlížeč při zavření okna varoval a dialog „Otevřít jinou zakázku"
  se ptal na změny, které nikdo neudělal. Dotaz „Nová zakázka" mluví
  o neuložených změnách jen tehdy, když nějaké jsou. Razítko platného ceníku,
  které aplikace sama vtiskne otevřené zakázce (po zveřejnění ceníku,
  po přihlášení), se za práci uživatele nepočítá — rozepsanou práci to ale
  neschová.
- **Bez čísla nabídky se neukládá (P5 / K15-N69).** Uložení z karty Databáze
  nebo z dialogu „Otevřít jinou zakázku → Uložit změny" založilo záznam
  „bez-cisla-….json", který v seznamu nikdo nenajde. Teď aplikace odmítne
  s hláškou „vyplňte číslo nabídky v hlavičce"; autosave uložené zakázky,
  které někdo číslo vymazal, počká (dřív by zapsal nový soubor vedle).
- **Ověření odeslané nabídky jen nad penězi a množstvím (P6 / K15-N67).**
  Lišta zámku hlásila „čísla nesouhlasí" i u poctivých nabídek tištěných ze
  stránky načtené před nasazením nové verze — porovnávaly se i texty,
  příznaky a klíče, které přidala nebo ubrala jiná verze. Teď se porovnávají
  čísla, řádky se párují podle názvu a klíč jen v jednom výsledku se
  přeskočí. Jádro dokumentu (cena bez DPH, DPH, s DPH, cena a celkem PROJ,
  kurz EUR) musí být v obou — podvrh bez souhrnu dál neprojde.
- **Dialogy říkají, co tlačítka udělají (P7 / K15-N68).** Dialog uzamčené
  varianty radil „OK = založit klon…, Zrušit = …", ale modál má tlačítka
  Ano / Ne. Teď „Založit klon a pokračovat v něm" / „Nechat beze změny";
  totéž u dvou dialogů složky _DB. Nový hlídač v `test_dialogy.js`.
- **Kolize verzí jmenuje člověka (P7 / K16-N87).** „Zakázku mezitím uložil
  jan@firma.cz" → „Zakázku mezitím uložil(a) Jan Novák v 14:32"; týž účet
  v jiném okně se pozná („váš účet — jiné okno nebo záložka"). Jméno píše
  server z relace (`upravilJmeno`), u starších zakázek ho dohledá v účtech.
- **Hledání podle adresy stavby (P15 / K16-N85).** Rejstřík nese adresu
  stavby; hledání v Přehledu cenových nabídek i v okně Zakázky online ji
  prohledává, našeptávač ji nabízí a seznam ji ukazuje pod názvem akce.
  **Starší zakázky** doplňuje server po dávkách při ukládání (25 najednou),
  takže se podle adresy najdou po několika uloženích kohokoli. „strasse"
  najde „Straße".
- **Zalomení řádků ve Wordu (P14 / K16-N81).** Víceřádkové hodnoty (kapitoly
  nabídky, patička, dodatkové texty) se spojovaly značkou `<w:br/>` uvnitř
  textu `<w:t>`, kde ji Word nevykreslí — skončily na jednom řádku. Teď se
  text před zalomením uzavře (`</w:t><w:br/><w:t>`); totéž v krycích listech
  generovaných od nuly.

Testy (každý bod bez opravy selže): nový harness `overit_neulozene.mjs` 24,
nová serverová sada `netlify/test_rejstrik.mjs` 14, `test_ulozeni` +9,
`test_zamek_otisk` +17, `test_prava` +10, `test_uloziste` +11,
`test_docxgen` +6, `test_dialogy` +1, `overit_dialogy` +4,
`overit_zobrazeni` +1, `overit_sablona` zpřísněný na šabloně CN v12.
Nové serverové mutace: P6 (jádro dokumentu), P7 (jméno z relace), P15
(doplnění adres); mutace B59 přepsaná na nový kód porovnání.

Ověřeno: sady v Node 143/0 (1 přeskočená — test.js není v exportu),
`nastroje/pred_pushem.sh`: verze, CRLF, 40 ze 42 harnessů se šablonami
CN v12 a PROJ v2 (`overit_manual` a `overit_sod` přeskočeny — chybí
příručka a šablony SoD). Mutace serveru běžely po uzavření dávky (výsledek
v další dávce).

---

## v25.9.6 — dávka A kola 16: role slevy, zábrana nesmyslné nabídky, náhled (25. 9. 2026)

- **Sleva nad strop už nejde „schválit" volbou role (P1 / K16-N73, K16-N74).**
  Výběr „Role zadavatele" z karty slevy zmizel — roli určuje přihlášený,
  který zadal procenta (karta ji jen ukáže). Server roli přepíše z relace
  a cizí žádost „čeká na schválení" se uložením nadřízeného už neschválí
  (bez změny procent se vrátí uložený stav). Sleva „schválená automaticky"
  nad stropem role zadavatele zastaví tisk dokumentu.
- **Nabídka s nesmyslným zadáním nebo nulovou cenou nevznikne (P2 / K16-N75,
  K14-N61).** Nulový nebo záporný rozměr a nová kontrola „cena nabídky je
  nulová nebo není číslo" jsou zábrana (odklepnout nejde). Nová prázdná
  zakázka tedy tisknout nejde, dokud se nevyplní zdvih, šířka a hloubka.
  Chybějící cena v ceníku už v součtu nedá NaN.
- **Během náhledu se automaticky neukládá (P13 / K16-N77)**; ruční uložení
  v rolovém náhledu se zeptá, že se zapíše pod administrátorem.
- **„Smazat vybrané…" jen s právem mazat (N89)**, i v rolovém náhledu.
- Nová serverová sada `netlify/test_obchodnik.mjs` — 24 scénářů pohledu
  obchodníka z kola 16 (S5 před opravou selhával), zařazená i do mutací.

Ověřeno: sady v Node, test_obchodnik 24/24, harnessy (kromě příručky a SoD),
mutace jádra 76/76, mutace serveru 173/173 (z toho 2 nové pro P1).

---

## v25.9.5 — dokumenty souhlasí s cenou, překlad smluv se symboly (25. 9. 2026)

Roadmapa #344 (F4 z hloubkového testu) a první část #350.

- **Specifikace a krycí list neslibují vyřazené položky (N48).** 3D sken,
  dílenská dokumentace, střecha, větrací mřížka a montážní nosník se řídí
  tím, jestli jsou v ceně („ne" / „není součástí nabídky"); přechodové
  plechy podle volby v ceně. Ruční volba ve specifikaci dál vyhrává.
- **Nabízený příplatek ve specifikaci (N49):** zábrany do vstupů, ohrazení
  proti pádu a ventilátor mají u nabízeného příplatku znění „lze doplnit –
  viz příplatkové ceny" (schválené J. V.), jinak jako dřív.
- **VSG fólie a SKN po stěnách (N50)** se počítají jen ze skleněných pásů;
  SKN (náhrada dvojskla) jen z pásů „Dvojsklo". Standardní režim beze změny.
- **Dva pásy „jiné" stejného názvu (N52)** — druhý řádek dostane pořadí
  v závorce, ruční přepis jednoho nezasáhne druhý.
- **Sleva v přehledu variant a v otisku zámku jako v dokumentu (N55)**;
  krycí list OCK nese haléře, pokud je cena má.
- **Překladač šablon přeloží i odstavec se symbolem {{…}} (#350)**, když ho
  slovník zná a překlad nese tytéž symboly; ostatní průvodce vypíše zvlášť
  (u smluv o dílo jsou to články s cenou, platbami a pokutami).

Ověřeno: sady v Node zelené, všechny harnessy (kromě příručky a SoD —
chybí podklady), mutace jádra 76/76 (3 nové).

---

## v25.9.4 — server hlídá minimální marži a typy polí zakázky, drobné nálezy 20. kola (25. 9. 2026)

Dávka F2 + F3 z hloubkového testu 24. 9. 2026 (roadmapa #340, #341).

- **Minimální marži u slevy ověřuje i server (#341, B71).** Do teď ji hlídal
  jen prohlížeč; upravený klient uložil slevu pod firemním minimem jako
  „schváleno automaticky". Server teď přepočítá základ části (OCK, PROJ
  včetně dopravy) týmž jádrem a takovou slevu neuloží. Odeslané nabídky
  (zamčené už dřív) se nepřepočítávají. Hláška číslo minima neprozradí.
- **Server hlídá typy polí zadání a ceníku (#340, návrh P1).** Číslo musí být
  číslo, prázdno nebo číslo jako text; volby (typ šachty, portál, zasklení,
  režim opláštění, typ pásu, lakování) z nabídky; dimenze profilu tvaru
  „80x80". Nic se nepřevádí — co nesedí, zastaví uložení a hláška řekne kde.
  Druhá vrstva proti uloženému skriptu (B69, B70); platí i pro obnovu.
- **Krycí list a smlouva PROJ u odeslané nabídky počítají ze zmrazeného
  výsledku (N47)**, ne dnešním kódem — tvrdily jinou cenu, než odešla.
- **Kontrola „méně než dvě nástupiště" zná průchozí šachtu (N53)** — sčítá
  nástupiště A + C.
- **Nová varianta se jmenuje podle svého čísla (N54)** — po smazání varianty
  už nevzniknou dvě „Varianta 3".
- **Tiskové okno (B84):** JSON ve skriptu se nedá ukončit značkou, jazyk
  dokumentu jde přes escapování.
- **Symbol v názvu příplatku se ve Wordu nerozvine (B86).**
- Nastavení → Šablony: pod číslem verze i **název nahraného souboru**
  (číslo je pořadí zveřejnění, ne číslo z názvu souboru).
- Nasazení: připnutý Node 22.23.2 v `netlify.toml` (build padal na
  kompilaci 22.23.3 ze zdrojů).

Ověřeno: sady v Node zelené (test_schvalovani +13, test_uloziste +19,
test_kontroly +2, test_kryci_proj_model +2, test_pripona_prvni +3,
test_docxgen +3), test_prava 579, všechny prohlížečové harnessy včetně
šablon CN v12 (60/60) a PROJ v2; mutace serveru 171/171 chycených (z toho 5 nových).

---

## v25.9.3 — dodatkové texty se neztrácejí, číselník, vlastní jazyková verze, šablona PROJ EN/DE/FR (25. 9. 2026)

- **Dodatkové texty se ztrácely — dvě příčiny, obě opravené.**
  - Server při uložení textu přepsal celou mapu tím, co měl prohlížeč
    načteno při přihlášení. Druhé okno (nebo karta otevřená od rána) tak
    smazalo texty zapsané jinde. Teď se posílá jen měněný text a server ho
    sloučí; celá mapa smí mazat jen s razítkem posledního stavu (jinak
    409), starší prohlížeč jen doplňuje. Předchozí stavy (30) leží
    v `popisy_historie`.
  - Rozpracované zakázky společné texty nedostávaly (jen nové). Teď se
    při otevření doplní tam, kde zakázka u položky text nemá; odeslané se
    nemění, vědomě smazaný text se nevrací.
- **Číselník dodatkových textů v Ceníku OCK** (karta pod ceníkem): všechny
  příplatky a volitelné položky (EXT/INT) na jednom místě, administrátor
  zapisuje, ostatní vidí. Texty k položkám, které výpočet už nezná, se
  ukazují zvlášť. Tlačítko **Najít texty v uložených zakázkách**
  (`/api/popisy?sber=1`) — záchrana ztracených textů, převzetí po jednom.
- **Průvodce šablon: Nahrát vlastní verzi** u každého jazyka v kroku
  Jazykové verze. Kontrola jazyka a symbolů proti nové češtině, překlad
  aplikace jde vrátit, v záznamu „vlastní soubor k české verzi N“.
- **Kontrola poškozeného souboru** (`docxXmlVady`): průvodce odmítne
  šablonu s rozbitým XML. Šablona PROJ v2 z dopoledne ho měla (Word ji
  otevřel jen s opravou) — předána opravená.
- **Slovník šablony PROJ:** 162 hesel, EN/DE/FR pokrytí 100 %; kontaktní
  řádky hlavičky jsou neutrální. `#350` zbývá jen pro smlouvy o dílo.
- **K13-P1 v aplikaci:** Nastavení → Databáze → *Kontrola čísla první
  varianty* — kontrola jen čte, oprava neodeslaných běžným uložením.
- **Roadmapa:** body 3 a 4 k můstkům jako `#355` (přechodové plechy)
  a `#356` (zastřešení) s detailem výpočtu a otázkami; `#357` tato dávka.
- Testy: `test_popisy_trvale.js` 19, `test_docx_struktura.js` 5,
  `test_pripona_prvni` +8, `test_prava` +12, `overit_online` +9,
  `overit_sablony_online` +5, `overit_nabidka_proj_word` +7, mutace
  serveru +3.

---

## v25.9.2 — rozhodnutí J. V. k rozboru K13, můstky počtem, šablony v12 (25. 9. 2026)

- **Větev k13-nalezy sloučená do testu** (P1–P11 z 13. kola, viz oddíl
  níže). Rozhodnutí J. V.: P1 oprava dat podle návrhu, P2 varianta A,
  P5/P6/P10/P11 podle návrhu, P7 přes počet můstků.
- **Můstky mezi budovou a OCK počtem kusů (P7 / K13-N59).**
  - Pole v Zadání šachty hned pod čistým vstupem, výchozí 0. Stará
    zakázka se zaškrtnutým můstkem = 1 ks.
  - Nová ceníková položka *Můstek mezi budovou a OCK* (Kč/ks, Hrubá OCK)
    a řádek v hrubé OCK. Řádek vzniká jen u zakázky s můstky.
  - Specifikace: usazení čelní stěny podle počtu, střecha přes můstek
    a nový řádek MŮSTKY (Word `{{TS_MUSTKY}}`, online nabídka).
  - Kontrola před nabídkou `mustky`: chybějící cena, víc můstků než
    nástupišť. Kontrola standardu počítá s počtem.
  - Testy: `test_mustky.js` 30, `overit_zadani_detail` +3, mutace jádra +4.
- **Sleva ve Wordu (P5):** bez slevy jsou `SLEVA_PROC` a `SLEVA_KC`
  prázdné a docxgen vyhodí řádky slevy.
- **Popis záměru (P6)** v online nabídce OCK a pole v kartě nabídky OCK.
  Překlady vět jsou návrh ke kontrole.
- **Úvod nabídky PROJ podle rozsahu (P11)**, pro šablonu symbol
  `{{UVOD_NABIDKY_PROJ}}`. Test `test_uvod_proj.js` 11.
- **Šablony (mimo repozitář, předané J. V.):**
  - `Sablona_NABIDKA_CN_v12.docx`: popis záměru a věta o opláštění ze
    zakázky, řádky slevy, příčka, stříška a můstky;
  - jazykové verze EN/DE/FR se 100 % pokrytím slovníku;
  - `Sablona_NABIDKA_PROJ_v2.docx` s podmíněným úvodem;
  - `overit_sablona.mjs` má kontroly v12.
- **P1 data:** `podklady/K13_pripona_oprava.mjs` (náhled + soubor pro
  obnovu; odeslané zakázky se vypíší k ruční opravě).
- Rozbor `podklady/K13_ROZBOR_2026-09-24.md` revidovaný (rozhodnutí,
  dopad můstků, postup nahrání šablon).

---

## v25.9.1 — Zadání šachty: pořadí polí (25. 9. 2026)

Zadání J. V. obrázkem:

- 2. sloupec: vnitřní šířka, hloubka, **počet nástupišť** (na místě typu
  portálů), **počet sloupků**, stříška.
- 3. sloupec: způsob zasklení, opláštění, **typ portálů** (na místě počtu
  sloupků), světlík nad dveřmi, světlíky na bocích.
- 4. sloupec: rozteč, šířka rámu, čistý vstup, **přechodové plechy**,
  můstek, ATYP.

Výpočet ani data se nemění. Harness `overit_zadani_detail` hlídá pořadí
ve všech třech sloupcích.

---

## v24.9.7 — dávka N58 (24. 9. 2026 večer): co je nad dveřmi a vedle nich

Rozhodnutí J. V. 24. 9. večer (vizuální návrh odsouhlasen: výchozí plech,
sazby podle návrhu, boční pole ve stejné dávce).

- **Nad šachetními dveřmi volba výplně (N58).** Do 24. 9. bylo
  zaškrtávátko a bez něj se pole nad dveřmi (šířka stěny × (světlá výška
  − 2,3 m) na každé nástupiště) neocenilo vůbec. Teď rolovací menu:
  - *bez*: 0 Kč, kontrola před nabídkou upozorní na otvor;
  - *sklo*: dřívější světlík (sklo stěny, lišty/terče);
  - *plech*: 8,5 kg/m² do plechů dveří, práce +1 ks na nástupiště,
    lakování obou stran, montáž jako u světlíku; záporná výška se ořízne
    na nulu v obou modelech;
  - *materiál opláštění*: materiál stěny (ve standardu sklo stěny,
    v režimu po stěnách typ pásu);
  - *zajistí stavba*: 0 Kč a věta ve specifikaci.
  Výchozí volba nové zakázky je plech. Starší zakázky se převádějí beze
  změny ceny (zaškrtnuto = sklo, nezaškrtnuto = bez) v obou modelech.
- **Boční pole vedle dveří (N58b).** Pod *Světlíky na bocích dveří* se
  s počtem stran objeví *Výplň boků dveří* (sklo, plech, materiál
  opláštění, zajistí stavba). Plech a stavba berou plochu ze skla stěny,
  portálové sloupky zůstávají. Chybějící volba = sklo jako dřív.
- **Zadání šachty (úprava podle návrhu).** Světlík nad dveřmi je ve
  3. sloupci mezi počtem sloupků a světlíky na bocích. Můstek mezi budovou
  a OCK se přesunul do 4. sloupce na jeho dřívější místo.
- **Specifikace:** ŘEŠENÍ PORTÁLŮ (ČLENĚNÍ) a OPLÁŠTĚNÍ NADSVĚTLÍKŮ podle
  výplně. Skleněné kombinace mají dosavadní znění, nové texty se překládají
  po částech. Nová hesla EN/DE/FR jsou **návrh, čeká na kontrolu J. V.**
- Testy: `src/test_nadprazi.js` 48, `overit_zadani_detail` +6,
  `test_kontroly` (16 pravidel), mutace jádra +8. Upraveny `overit_oplasteni`
  (nová zakázka má plech, sklo se volí hodnotou) a `overit_lista`
  (16 pravidel).

---

## Nálezy 13. kola — větev k13-nalezy (sloučeno do testu 25. 9. 2026, schválil J. V.)

Nálezy 13. testovacího kola (24. 9. 2026, test v24.9.6). Označení P1–P11
podle zadání větve, v závorce číslo nálezu ze sešitu kola.

- **P1 (K13-N53) — první varianta dostala po uložení příponu .3.** Nová
  zakázka zakládala první variantu bez pole `pripona`. Po klonu založeném
  před prvním uložením (klon .2) ji `zajistiZamek` při importu bral jako
  chybějící a dal jí první volné číslo nad maximem. Vytištěná nabídka
  „…9140“ se tak v aplikaci změnila na „…9140.3“. Obchodníkovi server
  uložení odmítl (B56, 403), administrátorovi číslo v zámku tiše přepsal.
  Oprava: první varianta má příponu 0 od založení a varianta bez přípony
  na prvním místě dostane 0, pokud ji v zakázce ještě nikdo nemá. Testy:
  `src/test_pripona_prvni.js` (bez opravy 6 z 12 selže), `test_prava`
  +6 (bez opravy obchodník dostane 403). Uložená data se nemění; výpis
  dotčených zakázek ze zálohy dělá `podklady/K13_pripona_vypis.mjs`.
- **P2 (K13-N54) — tisk ze zakázky otevřené jen ke čtení zamkl variantu
  jen v prohlížeči.** Tlačítka tisku leží mimo šedé bloky režimu čtení.
  Word i tisk z náhledu proto variantu zamkly, uložení se ale odmítlo
  a odeslaná nabídka zůstala na serveru odemčená. Oprava (varianta A):
  před dokumentem, který zamyká, se aplikace zeptá „Tisk odešle nabídku
  a uzamkne variantu. K tomu je potřeba zakázku odemknout.“ s volbami
  Odemknout a tisknout / Zrušit. Kdo odemknout nesmí, dostane důvod
  a dokument nevznikne. Platí pro Word OCK i PROJ, smlouvy o dílo a tisk
  z náhledu nabídky OCK i PROJ; náhled se ptá před otevřením okna. Dotisk
  už zamčené varianty se neptá, plná moc a interní podklady beze změny.
  Harness `overit_online.mjs` +10 (bez opravy 6 selže).
- **P3 (K13-N55) — falešný dialog „Ceník se změnil, změnily se 2 ceny“
  u každé nové zakázky.** Příčina potvrzena: server při importu doplní
  klíč, který v ceníku zakázky chybí, nulou (`cenikDoplnKlice`). Platný
  ceník testu je ale starší než klíče `cetrisKc` a `zaskleniListyProjHod`
  a nenese je vůbec. `cenikRozdily` pak bral 0 proti ničemu jako změnu
  a přepočet klíče ze zakázky smazal. Oprava v `cenikRozdily` (varianta a):
  chybějící klíč se porovnává jako nula, tedy stejně jako ho doplňuje
  import. Nenulová hodnota proti chybějící i změna z nenuly na nulu se
  hlásí dál. Varianta b (doplnit klíče do platného ceníku při načtení)
  by změnila otisk platného ceníku, a tím zneplatnila dříve potvrzené
  „ceny jsou dohodnuté“.
- **P4 (K13-N58) — ruční sazba DPH se hlásila jako rozdíl ceníku.**
  `cenikPrehled` nefiltroval zakázkové hodnoty (přirážka, DPH), přestože
  je automatický přepočet vynechává. Varování i jeho souhrn je teď
  nepočítají; v okně přepočtu zůstávají. Věta varování říká směr stejně
  jako okno přepočtu: „nejvíc „X“ (dnes +25 % proti kalkulaci)“.
  Testy: `src/test_k13_cenik.js` 16 (bez opravy 8 selže). Upraveno
  `test_cenik_stari` (přirážka projekce už se do varování nepočítá)
  a fixtura `overit_lista.mjs` (varování #35 potřebuje skutečnou cenu).
- **P9 (K12-N48) — online nabídka tiskla „šířka - × hloubka -“.** Řádek
  „ROZMĚR ŠACHTY – VNĚJŠÍ“ se v náhledu nabídky vynechá, když chybí obě
  hodnoty (ruční přepis není vyplněný). Word ho vynechával už dřív.
- **P10 (K12-N46) — stříšky v ceně, ale ne v nabídce.** Nové zástupce
  `TS_PROSKLENA_STRISKA` a `TS_PROSKLENA_PRICKA` v datech nabídky. Když
  pole nic neříká, jsou prázdné a řádek zmizí. Náhled nabídky má oba
  řádky v sekci DOPLŇKOVÉ KONSTRUKCE. Šablona v11 na ně zatím symbol
  nemá, doplní se se šablonou. Testy: `src/test_k13_nabidka.js` 10
  (bez opravy 8 selže), `test_nabidka` (13 řádků základních parametrů).
- **P8 (K13-N60 + K12-N49) — nepřeložené texty cizojazyčné nabídky.**
  Nová hesla EN/DE/FR pro „TECHNICKÁ ČÁST – SPECIFIKACE DODÁVKY“,
  „žádné příplatky nejsou vybrány“, „nejsou součástí dodávky, viz
  příplatkové ceny“ a „přirozené, do prostoru schodiště“. **Návrh
  překladu, čeká na odbornou kontrolu J. V.** Test pokrytí
  `src/test_k13_preklad.js` projde všechny hodnoty specifikace v nabídce
  (TS_*) pro 16 zadání (interiér / exteriér, průchozí, přechodové plechy,
  lešení) a pevné texty online nabídky. Bez nových hesel selže právě na
  těchto čtyřech textech. Tisková lišta (netiskne se) a názvy ze
  zkušebního ceníku jsou z testu vyjmuté.
- **P5 (K13-N56) — Word nabídka neukazuje schválenou slevu (prověřeno,
  návrh v `podklady/K13_ROZBOR_2026-09-24.md`).** Aplikace symboly
  `CENA_PRED_SLEVOU`, `SLEVA_PROC` a `SLEVA_KC` vydává, šablona v11 je
  nemá a jiná cesta slevu do Wordu nevkládá (`ZAOKROUHLENI_KC` je vždy
  prázdný). Nová kontrola před nabídkou `slevaWord`: varianta má platnou
  slevu a šablona, ze které se tiskne, nemá `{{SLEVA_KC}}` → „Word slevu
  neukáže, zákazník uvidí jen konečnou cenu“. Symboly šablony se zjišťují
  na pozadí (stažení jen u varianty se slevou, cache podle verze), dokud
  nejsou známé, pravidlo mlčí. Testy `src/test_k13_kontroly.js` 9,
  `test_kontroly` (16 pravidel).
- **P6 (K13-N57) — pevný „Popis záměru“ a věta o opláštění ve Wordu
  (prověřeno, návrh v rozboru K13).** Šablona v11 tiskne natvrdo přístavbu
  k dvorní fasádě a izolační dvojsklo i u interiérových šachet s čistým
  VSG. Připravení zástupci pro upravenou šablonu: `POPIS_ZAMERU_OCK`
  (vlastní text z hlavičky zakázky, jinak věta podle typu šachty
  a průchodnosti) a `OPLASTENI_VETA` (z materiálu opláštění ve
  specifikaci). Šablona v11 je zatím nepoužívá. **Znění vět je návrh ke
  schválení J. V.**, překlady přibudou po schválení. Test
  `test_k13_nabidka.js` +6.

---

## v24.9.6 — dávka F4a (24. 9. 2026 večer): průchozí šachta, lešení, záporné hodiny

Rozhodnutí J. V. 24. 9. večer.

- **Průchozí šachta podle pravidla nástupišť (N46, N45).** Zadání:
  „Nástupiště obsahuje světlíky, dveře, portály s plechy a nástupní plechy.
  Nástupiště je všude tam, kde jsou dveře. Kde dveře nejsou, je provedeno
  opláštění zvoleným materiálem po celé ploše.“
  - Platí stejně pro čelní (A) i zadní (C) stěnu, ve standardu i v režimu
    po stěnách (#295 „stejné pravidlo platí i po stěnách“).
  - Stěna se dělí podle skutečných výšek. Patra pod nejvyšší stanicí mají
    pás o výšce podlaží, nejvyšší patro pás hlavy (přejezd). Prohlubeň do
    stěn nepatří, má vlastní sokl.
  - Pás s dveřmi má sklo jen ve světlících, pás bez dveří se opláští celý.
  - Každá stěna má jedno sklo a světlíky jsou z téhož skla jako jejich
    stěna.
  - Boční světlíky patří ke stěně s dveřmi (N45). Spojovací plechy
    čelního rámu se počítají podle počtu stěn s dveřmi.
  - Neprůchozí šachta se nemění. Zrcadlová šachta (A4C0 × A0C4) má
    zrcadlové stěny. Zapnutí režimu po stěnách zase nehne cenou.
  - Zadání nese jen počty dveří, proto se u nejvyššího patra předpokládají
    dveře vpředu, má-li čelní stěna nějaké dveře.
  - Detail výpočtu ukazuje rozpad stěn A a C na nástupiště a patra bez
    dveří.
  - Rozpracované průchozí zakázky se přecení (odsouhlaseno), odeslané
    nabídky se zmrazeným výsledkem ne.
- **Lešení při přepisu množství (N51, schváleno):** ve volitelných
  položkách i v příplatcích se počítá metry × sazba + celá fixní část.
  Přepis na 0 m = 0 Kč; dřív ve volitelných zůstal fix.
- **Záporné hodiny ručně zadat nejde (N56):** hodiny montáže a projekce
  (základ i ATYP) a hodiny i rezerva položek PROJ. Aplikace vrátí hlášku
  a pole mají `min="0"`. Korekce hodin montáže od referenční šachty
  (21 m, 6 nástupišť) zůstávají. Výpočet sám do minusu nejde.
- Testy:
  - nová sada `test_nastupiste.js` (20 kontrol, proti dosavadnímu jádru
    13 selže);
  - na nové pravidlo přepsány `test_oplasteni_zapnuti`,
    `test_pruchozi_zadni`, `test_sklo_steny` a `test_prepisy`;
  - `overit_zadani_detail` +5;
  - mutace jádra +5.

---

## v24.9.5 — dávka G1 (24. 9. 2026 večer): nová správa šablon dokumentů

Podle vizuálního návrhu, který J. V. 24. 9. večer odsouhlasil („návrh
správy šablon vypadá super, ten nahraj do testu").

- **Proč.** Jako česká šablona nabídky OCK se zveřejnil soubor
  `…_v11_DE.docx` (verze 9) a jazykové verze EN/DE hlásily „zastaralá“,
  i když byly nahrané moderní šablony. Příčiny:
  - tlačítko „Nahrát .docx“ nahrávalo vždy do češtiny a jazyk
    nekontrolovalo;
  - doladěnou jazykovou verzi nešlo nahrát k jazyku;
  - zastaralost se poznávala podle data zveřejnění a server stejný
    soubor podruhé nezveřejní, takže hláška nešla odstranit.
- **Nastavení → Šablony (online)** ukazuje jednu tabulku dokument ×
  CZ/EN/DE/FR se stavem ze serveru. Po kliknutí na dokument se zobrazí
  jeho detail s jazykovými verzemi a historií.
- **Průvodce novou českou verzí:** vybere se soubor a proběhne kontrola:
  - jazyk souboru (německý soubor se jako čeština nepustí a aplikace
    nabídne „Uložit jako DE verzi“);
  - symboly `{{…}}` a rozdíl proti platné verzi (chybějící symboly
    ohlásí).

  Pak aplikace sama vyrobí jazykové verze (ukáže, kolik procent se
  přeložilo) a vše se zveřejní najednou.
- **Jazykové verze u dokumentu:** „Přegenerovat z češtiny“, „Nahrát
  doladěný soubor“ (aplikace zkontroluje, že je opravdu v tom jazyce a má
  symboly platné češtiny), „Stáhnout“, „Nepřeložené fráze (CSV)“.
- **Zastaralá podle obsahu:** jazyková verze nese otisk české verze, ze
  které vznikla (`zdrojOtisk`). Server ho přijme jen k platné češtině
  (jinak 409). Stejný soubor k nové češtině se dá zveřejnit znovu.
  Starší záznamy bez otisku se posuzují postaru podle času.
- **Vrátit:** starší verze se zveřejní znovu jako nová verze s poznámkou
  „vráceno z verze N“. Nic se nepřepisuje ani nemaže.
- Bez přihlášení k serveru zůstává původní obrazovka.
- Testy:
  - `test_sablony_online` +23;
  - nová serverová sada `netlify/test_sablony.mjs` (19 kontrol, bez
    opravy 10 selže);
  - `overit_sablony_online` +20 (celkem 47): celý průvodce v prohlížeči
    nad skutečnou šablonou CN v11 včetně vrácení verze;
  - mutace jádra +3, serveru +3.
- **Zjištěno při zkoušce na skutečných šablonách:** slovník přeloží
  nabídku OCK na 100 %, nabídku PROJ jen na 26 % a smlouvy o dílo na
  0–3 %. Jejich jazykové verze by tedy vyšly skoro celé česky. Průvodce
  to ukáže (u verze pod 90 % varování); doplnění slovníku je v roadmapě.

---

## v24.9.4 — dávka F1 (24. 9. 2026): bezpečnost a ztráta práce z hloubkového testu

Opravy nejzávažnějších nálezů 20. kola (hloubkový test 24. 9. 2026). Ke
každé opravě je test. Každý test byl spuštěn i proti kódu bez opravy
a v tom běhu selhal.

- **Uložená zakázka nespustí cizí skript (B69, B70, B87).** Hodnoty ze
  zakázky, které šly do obrazovky bez escapování, se teď escapují. Jde
  o prostřední sloupec detailu výpočtu, sazbu DPH, hodiny a rezervu PROJ
  a spojky a počty v odvozených parametrech. Typ pásu opláštění jádro
  bere jen z číselníku. Cesta ceny v obsluze změny je escapovaná.
  `set`/`pjSet`/`cenikSet` odmítnou `__proto__`, `constructor`
  a `prototype`. Nová prohlížečová sada `overit_xss.mjs` (27 kontrol):
  vkládá payload do dat zakázky a vykresluje všechny záložky pro
  obchodníka i administrátora, místo aby četla zdroják (B87).
- **Příloha nespustí skript (B82).** Obsah přílohy smí být jen `data:`
  adresa. Server zakázku s `javascript:` v příloze neuloží ani neobnoví
  a tlačítko Stáhnout takovou přílohu odmítne.
- **Odeslanou nabídku ve starším tvaru dat jde uložit (N43).** Server
  porovnával migrovaná data zamčené varianty s nemigrovanou uloženou
  verzí a vracel 409 celé zakázce, i práci na odemčených variantách.
  Teď porovnává migrované s migrovaným, stejně tak obnova. Skutečná
  změna odeslané nabídky se dál odmítne. Do zamčené varianty klient
  nedoplňuje katalog ani kurz. Nová sada `netlify/test_stary_tvar.mjs` (9).
- **Klon varianty a alternativa nepřebírají schválení slevy (N44).**
  Obchodník zakázku s klonem schválené varianty dřív neuložil (403).
  Vedoucí se jejím uložením stal schvalovatelem slevy, kterou nikdy
  neviděl. Kopie si teď nese procenta a poznámku, stav a schvalovatele
  ne (stejně jako duplikát). Nová sada `netlify/test_klon_sleva.mjs` (13).
- **Zadání bez volitelných položek neshodí výpočet (N57).** Import doplní
  prázdný objekt a jádro samo nespadne. U běžné zakázky se výsledek
  nemění. Nová sada `src/test_volitelne_chybi.js` (18).
- **Autora existující zakázky server nebere od klienta (B73).** Uložením
  se zakázka nedá přestěhovat jinému obchodníkovi. Nová sada
  `netlify/test_autor.mjs` (11).
- **Zapnutí a archiv účtu berou jen true/false (B74).** Hodnota `0` nebo
  `""` obešla pojistky a vypnula i hlavní nebo vlastní účet. Teď vrátí 400.
- **Přihlášení z cizí stránky se odmítne (B78).** Cizí Origin, Origin
  `null` a formulářové tělo vrátí 403. Cizí stránka tak už nepřihlásí
  prohlížeč obchodníka do účtu útočníka.
- Příručka obchodníka má snímky a číslo verze pro v24.9.4, obsah je beze
  změny.

---

## v24.9.3 — dávka E4 (24. 9. 2026): obnova nanečisto, zámek, FR kapitoly, T4

- **Zkouška obnovy nanečisto a postup obnovy (#152, 2. část).** Nová sada
  `netlify/test_obnova_nanecisto.mjs` (20 kontrol) simuluje úplnou havárii
  ve dvou krocích:
  - Zmizí celá ostrá databáze a noční otisky zůstanou. Administrátor se
    přihlásí náhradním heslem a obnoví noční otisk. Vrátí se zakázky
    (i se zámkem odeslané nabídky), ceník v2, firma i účty; obchodník se
    přihlásí původním heslem.
  - Zmizí i zálohy. Obnova ze staženého souboru vrátí zakázky, ceník
    a firmu. Účty ne, protože soubor otisky hesel nenese.

  `podklady/POSTUP_OBNOVY_ZALOHY.md` popisuje tytéž situace s názvy
  tlačítek z aplikace a čtvrtletní ruční náhled na testu.
- **Vykreslení nezapisuje do zamčené varianty (N41d, ověřeno).**
  `oplZadani()` a `oplStena()` doplňovaly chybějící opláštění, stěny
  a pásy přímo do zadání i u odeslané nabídky. Pouhé otevření tak
  přepsalo data dokladu. U zamčené varianty se výchozí podoba jen
  spočítá. `overit_oplasteni.mjs` má 2 nové kontroly; bez opravy jedna
  selže.
- **Odstup světlé výšky 0,2 m je pojmenovaná konstanta (#327, K9-N35).**
  Konstanta `SVETLA_VYSKA_ODSTUP_M` nese vysvětlení, že 0,25 m v předloze
  0216 je překlep. Hodnota ani ceny se nemění. Mutace jádra 52/52.
- **Francouzské kapitoly nabídky (N41c).** Nastavení → Firma má FR pole
  kapitol IV.–VI. a doložek, bez výchozího textu (smluvní podmínky se
  nevymýšlejí). Vyplněné FR znění se ve francouzské nabídce použije.
  Prázdné pole dál spadne na češtinu s upozorněním a nic se nevypustí.
  `test_nabidka_kapitoly` má 6 nových kontrol.
- **T4, další krok.** Popisky zadání a detail výpočtu ověřuje prohlížeč
  (`overit_zadani_detail.mjs`, 21 kontrol), ne regulární výrazy nad
  zdrojákem. Sada hlídá i to, že má každý řádek detailu OCK a PROJ
  vysvětlení. Obráceně: vyprázdněné vysvětlení sada chytí.
  `test_zadani_popisky.js` si ponechal jen čistou funkci `nulaOznac`.
- **Podklady Pipedrive** z nesloučené větve jsou v `podklady/` (návrh
  zápisu a patch serverových funkcí, do kódu se zatím nepouští).

---

## v24.9.2 — dávka E3 (24. 9. 2026): cizojazyčná nabídka podle 10. kola

- **13 příplatků má překlad EN/DE/FR (#335, K10-N38).** V anglické
  nabídce se dosud tisklo česky třeba „LEŠENÍ - vnitřní" vedle
  „SCAFFOLDING – external". Názvy drží terminologii sousedních hesel.
  Nová sada `test_preklad_priplatky.js` (50 kontrol) bere názvy příplatků
  přímo ze zdrojáku jádra, takže nový příplatek bez překladu ji shodí.
  Obráceně: bez nových hesel selže 35 kontrol.
- **Pevné texty šablony nabídky OCK jsou ve slovníku (#334, K10-N36).**
  Jde o 24 textů v EN/DE/FR: nadpisy A./B./I./II., úvod, poznámky k ceně,
  platební podmínky, kapitola V. šablony v10 a věta o předávacím
  protokolu. Kontaktní blok firmy (web, telefon, IČ, PSČ a město, ulice,
  název s právní formou, oddělovací čára) se nově pozná jako text, který
  se nepřekládá. Vzory jsou úzké a test hlídá, že běžný text s číslem
  pořád jde do překladu. Překladač šablony teď nad v10 i v11 nenechá
  česky nic: v anglické i německé mutaci chybí 0 textů (dříve 31 u v10
  a 27 u v11).
- **Pojistka zastaralé jazykové mutace (#334, K10-N36/N37).** Mutace
  EN/DE/FR zveřejněná dřív než platná česká šablona je zastaralá. V ostré
  šlo o mutaci z v8 proti české v10: 17 % textu bylo česky a chyběl
  řádek soklu. V přísném režimu se z takové mutace netiskne; hláška řekne
  proč a že ji administrátor přegeneruje. Česká nabídka tím zastavená
  není. V měkkém režimu se tiskne dál, ale s upozorněním. Nastavení →
  Šablony u mutace ukáže „⚠ zastaralá". `overit_sablony_online.mjs` má
  7 nových kontrol (28/28); obráceně bez pojistky selžou 3.
- **Příručka obchodníka nezmiňuje testovací web** (pokyn J. V.:
  obchodníkům přístupný nebude). Kapitola 4, heslo ve slovníčku a zmínky
  v úvodu jsou pryč. Kapitoly jsou přečíslované (33 → 32) i se 40 odkazy
  v textu. Kontrola v `manual/overit.js` je obrácená a nad starou
  příručkou selže. Příručka nese v24.9.2.
- **Postup vydání ve třech krocích:** 1) `test-draft` (rozpracované,
  Netlify ho nenasazuje), 2) `test` (testovací web, před nahráním
  `nastroje/pred_pushem.sh`), 3) `main` (ostrý web, CI běží samo).

---

## 24. 9. 2026 — dávka E2: příručka obchodníka pro v24.9.1 (aplikace beze změny)

- **Text příručky (`manual/obsah.json`) odpovídá v24.9.1.** Poslední
  příručka byla z v17.9.3. Přibyl rámeček „Co je nového od příručky ze
  17. 9. 2026" a upravilo se 18 kapitol. Hlavní témata:
  - zmrazený Model 1 a nová podkapitola „Režim výpočtu";
  - termín dodání s ATYP v kapitole V. a kontrola před nabídkou;
  - kapitoly III.–VI. v nabídce;
  - opláštění po stěnách;
  - zakázka jen ke čtení a jedno číslo varianty;
  - DPH 0 % u zahraničí;
  - obnovení stránky bez ztráty práce;
  - nové hlášky ve slovníčku.
- **Snímky se pořizují automaticky (`manual/snimky_auto.mjs`).** Dosud se
  fotily ručně v prohlížeči nad testovacím webem. Nástroj spustí aplikaci
  lokálně se zkušebním ceníkem a vymyšlenými zakázkami, přihlásí se jako
  obchodník a za zhruba 30 s pořídí všech 21 snímků (3 nové: režim
  výpočtu, kapitola V. nabídky, panel kontrol). Snímky nenesou skutečné
  ceny a příručka to říká. Výstup jde mimo repozitář; hotová příručka se
  do repozitáře dál neukládá.
- **`overit_manual.mjs` je přepsaný na nový tvar příručky (N17).** Do teď
  hlídal srpnový tvar s 25 zapečenými PNG a nad každou novou příručkou
  hlásil 13 falešných selhání. Nově pouští v Chromiu `manual/overit.js`
  a přidává kontrolu verze proti `verze.txt` a povinná témata. Nad novou
  příručkou prošlo 37 kontrol z 37. Nad starou v17.9.3 selhávají 4 kontroly
  a všechny právem: stará verze, chybějící témata E1 a tři vysvětlivky,
  které tam mířily na text, jenž na snímcích nebyl.
- **CI:** automaticky běží jen při nahrání na main, jinak ručně (viz
  záznam níž).

---

## 24. 9. 2026 — testy lokálně, CI jen při nahrání na main (aplikace beze změny)

- **GitHub Actions běží automaticky jen při nahrání na main** (rozhodnutí
  J. V. 24. 9. 2026: „testovat lokálně", CI „když řeknu nahraj na main").
  Na main se nahrává jen na pokyn, tedy při vydání na ostrý web; CI tam
  poběží celé včetně mutací. Na větvi test se nespouští, ručně jde pustit
  vždy (GitHub → Actions → Testy → Run workflow). Do té doby běželo při
  každém pushi na test i main a opakovalo to, co už proběhlo v sezení.
- **Nový `nastroje/pred_pushem.sh`** dělá totéž co CI, a to před pushem:
  kontrolu verze proti dni commitu, kontrolu CRLF, sady v Node a všechny
  prohlížečové harnessy. S přepínačem `--mutace` pustí i celý mutační běh
  serveru a jádra (jen když se měnil server nebo jádro). Firemní šablony
  se předávají přes `KNG_PODKLADY`.
- **Jedna dávka = jeden push na test** na jejím konci (každý push je
  nasazení na Netlify). Do main jen na pokyn „slouč".

---

## v24.9.1 — dávka E1 (24. 9. 2026): rozhodnutí J. V. k #149 a #277

- **Model 1 je zmrazený pro ne-administrátory (#332).** Rozhodnutí J. V.
  z 24. 9.: dál se rozvíjí jen Model 2 a na Model 1 nepůjde přepnout.
  Na Model 1 přepne jen administrátor. Pojistka je v `set()`, takže ji
  neobejde ani jiné volání než přepínač. Zakázka, která v Modelu 1 už je,
  se počítá dál beze změny ceny. Obchodník ji smí převést na Model 2,
  zpátky ne, a u volby vidí štítek „Model 1 (zmrazený)". Harness
  `overit_zobrazeni.mjs` +4. Ověřeno i obráceně: bez pojistky 2 selhání,
  bez úpravy přepínače 2 selhání.
- **Termín dodání s ATYP je v nabídce (#330, nález TD1).** Termín dodání
  z krycího listu (`{{PODM_TERMIN_DODANI}}`) je první odrážkou kapitoly V.
  v náhledu i v PDF. Zahrnuje prodloužení za ATYP i ruční přepis. Zbytek
  kapitoly zůstává textem z Firmy. Když lhůta ve Firmě chybí, odrážka se
  vynechá (nic se nevymýšlí). Překlad EN/DE/FR zajišťuje nový vzor, který
  stojí před obecným „cca …", aby nevznikla půlka věty česky.
  Nové 15. pravidlo kontrol před nabídkou **„Termín dodání u atypické
  zakázky"** hlásí dva případy: kapitola V. z Firmy uvádí jinou lhůtu než
  termín ze zakázky, nebo ve Firmě chybí standardní lhůta. Testy:
  `test_nabidka_kapitoly` +11, `test_kontroly` +8. Obráceně: bez opravy
  8 a 5 selhání.
- **Šablona CN v11 (#331) — kapitoly ze symbolů, ne natvrdo.** Šablona je
  připravená mimo repozitář a nahraje ji administrátor. Kapitoly IV.–VI.
  a nové DOLOŽKY v ní plní `{{FIRMA_NAB_POZADAVKY}}`,
  `{{FIRMA_NAB_PREDANI}}` a `{{FIRMA_NAB_DOLOZKY}}`. Kapitola V. je jeden
  symbol `{{NAB_KAP_TERMINY}}`: termín dodání ze zakázky plus text z Firmy.
  Jde o jeden symbol, aby při nevyplněné lhůtě nezůstal prázdný řádek
  tabulky. Word i náhled teď tisknou kapitoly ze stejného zdroje.
  `overit_sablona.mjs` má novou sadu pro v11+ (v11: 54/54). U starší
  šablony sadu přeskočí a řekne to. `test_nabidka_kapitoly` +4.
- **Hlídka noční zálohy (#152, první část).** Administrátor při přihlášení
  dnešní otisk dopořídí sám, takže přehled záloh vypadal zdravě, i když
  noční funkce neběžela. Nová `uloZalohaHlidka()` v `src/uloziste.js`
  sleduje zvlášť poslední **noční** otisk. Když je starší než 48 hodin
  (dvě zmeškané noci) nebo chybí, administrátor dostane varování po
  přihlášení i v Nastavení → Databáze. Jinak tam vidí klidný řádek
  s datem poslední noční zálohy. Obchodník hlídku nevidí. Testy:
  `test_uloziste` +8, `overit_online` +5. Obráceně: bez filtru na noční
  otisk 4 a 2 selhání. Zkouška obnovy nanečisto (2. část #152) zůstává
  otevřená.

---

## v23.9.3 — dávka D3 (23. 9. 2026 večer): nástroje a testy, aplikace beze změny

- **Mutační testování jádra je v repozitáři (N19).** `mutace_jadro.mjs`
  (převzato ze zdrojáků v21.8.1, bez cen) do té doby v repozitáři chybělo,
  takže ho nespustilo CI ani cloud. Šest kotev mířilo do prázdna, protože
  se jádro od 17. 8. změnilo. Kotvy jsou opravené a přibyl rychlý režim
  `--kontrola`, který pouští `spust_testy.sh` i CI. V CI je nový job
  `mutace-jadro` s plným během.
- **První běh ukázal 11 nechycených mutací z 52.** Dřív je hlídaly sady
  shody s Excelem, které potřebují skutečný ceník a v repozitáři nejsou.
  Nová sada `src/test_jadro_pojistky.js` (24 kontrol nad zkušebním ceníkem)
  je hlídá chováním: DPH ze zaokrouhleného základu, sazby plechů podle
  provedení, sazba statiky, zaokrouhlení příplatků, rozdíly Modelu 1
  ($D$3, lemování, podesty, D19/D18), doprava, rezerva hodin a sazba
  zaměření v PROJ. Teď je chyceno **52/52**.
- **Harness šablony nabídky bere nejnovější verzi.** `overit_sablona.mjs`
  hledal napevno v8/v7, a tak kontroloval šablonu, se kterou se už netiskne.
  Nově ji vybírá `najdiNejnovejsi` (v10 porazí v9 jako číslo). Od v9 je
  titulní obrázek rámečkem úvodní fotky, proto harness dodá i fotku.
  Výsledek: v10 42/42, v7 42/42.
- **T4, první krok.** Kontroly obrazovek zaokrouhlení OCK × PROJ se
  přestaly ověřovat čtením zdrojáku (`test_zaokrouhleni.js`) a ověřuje je
  nový harness `overit_zaokrouhleni.mjs` (12 kontrol, se sabotáží 3
  selhání). Ostatní testy tvaru zdrojáku se přepisují postupně.

---

## v23.9.3 — 23. 9. 2026 (noční dávka D1 + D2)

### D1 — drobnosti z 9. testovacího kola a revize v22.9.9

- **Varování, když chybí kapitoly IV.–VI. (#324, K9-N32).** Prázdná kapitola
  se z nabídky OCK vypouští i s nadpisem, takže odešla bez požadavků, termínů
  a předání díla a nikdo o tom nevěděl. Nově je v kontrolách před nabídkou
  pravidlo „Nevyplněné kapitoly nabídky“ (varování, jazyk podle tisku)
  a Nastavení → Firma → Kapitoly nabídky ukazuje, které české kapitoly chybí.
  `firmaKapitolyPrazdne` v `src/firma.js`. Test: `test_kontroly.js` (+8).
- **Zablokované vyskakovací okno (#328, K6).** Osm tiskových náhledů padalo
  na `w.document`, když prohlížeč okno zablokoval, a obchodník neviděl nic.
  Teď přes `oknoNahledu()` dostane hlášku, jak okna povolit. Test:
  `overit_dialogy.mjs` (+3, bez opravy 2 selhání).
- **Technická specifikace vypisuje jen započítané pásy (N41b).** Věta
  o opláštění po stěnách se skládá z pásů, které jádro opravdu spočítalo.
  Pás nad horní hranou prosklení nebo pod předchozím pásem už ve specifikaci
  není. Test: `test_oplasteni_zapnuti.js` (+5, bez opravy 2 selhání).
- **Hlavní správce v Nastavení (#278).** Administrátor v Nastavení →
  Uživatelé vidí, jestli je na serveru nastavená proměnná `ADMIN_EMAIL`.
  Pokud chybí, dostane varování s návodem.

### D2 — bezpečnost (B57, B58, B61, B62, B68) a meze v dokumentaci

- **B57:** `/api/zdravi` už anonymně nehlásí, jestli je nastavený hlavní
  správce. Údaj dostává jen administrátor v `/api/ja` a v odpovědi na
  přihlášení (viz #278).
- **B58:** kniha smazaných účtů jde s oběma zálohami. Obnova ze serverového
  otisku ji doplní, existující záznam nepřepíše a u e-mailu, pod kterým žije
  účet, nic nezapíše.
- **B61:** server odmítne nový zámek, jehož číslo nesedí na data zakázky
  nebo nemá značku `cisloPapir`. Dřív tudy prošla „odeslaná“ nabídka pod
  novým číslem bez porovnání. Administrátorovi při změně čísla server
  razítko dál srovná (B56).
- **B62:** u existujícího zámku bere server `kdo`, `popis` a `sablona`
  z uložené verze. Z `tisky[]` a `odemceni[]` platí uložený začátek:
  přidávat se smí, přepsat ani ubrat ne (`uloZamekRazitkaDrz`).
- **B68:** textová pole firmy mají kontrolu typu a délky (2 000 znaků,
  u kapitol 20 000).
- Nový dokument **`BEZPECNOST_MEZE.md`**: B65–B67 a zbytkové meze B61/B62.

Testy: `test_prava.mjs` (534, +12), `test_obnova.mjs` (+4), `test_firma.js`
(+4), `overit_zobrazeni.mjs` (+2). Šest nových mutací (150 celkem), všechny
chycené. Testy, které zakládaly zámek bez čísla, teď dělají zámek stejně
jako aplikace. Staré zámky zapisují rovnou do úložiště, jako by tam ležely
odjakživa.

---

## v23.9.2 — 23. 9. 2026

### Skrýt / srolovat u všech karet Kalkulace OCK; skrytí se obchodníkovi projeví hned

Zadání J. V.: „přidej skrývací a rolovací tlačítka do všech sekcí kalkulace
OCK a prověř funkčnost skrývání pro obchodníky. Přijde mi, že když vyberu
skrýt, tak obchodník sekci stále vidí."

**Co bylo špatně.** Volbu zobrazit / skrýt / srolovat měly jen sekce
tabulky (Hrubá OCK, Opláštění, Volitelné, Režie), Příplatky, Detail
mezivýpočtů a Interní poznámky. Karty Zadání šachty, Opláštění po stěnách,
Dimenze profilů, Práce a režie, Cenová kalkulace, Sleva, Obchodní
zaokrouhlení a Cenová nabídka (CN) ji neměly vůbec. A hlavně: obchodník
dostával nastavení zobrazení jen při přihlášení. Kdo měl aplikaci otevřenou
(stránka běží i celé dny), viděl skrytou sekci dál až do obnovení stránky.
Změřeno v prohlížeči: v jednom okně skrytí fungovalo, u už přihlášeného
obchodníka se neprojevilo.

**Co platí teď.**
- Všechny karty Kalkulace OCK mají v nadpisu stejný select a u srolované
  karty tlačítko „▸ rozbalit" (stejný vzhled jako Detail mezivýpočtů).
  Dimenze profilů zůstávají ve výchozím stavu sbalené. U PROJ se nic
  nemění.
- Přihlášený obchodník nebo vedoucí si nastavení zobrazení načte znovu
  každé 3 minuty a při každém návratu do okna (nejčastěji jednou za
  minutu). Překreslí se, jen když se něco změnilo. Administrátora to
  vynechává, aby mu stažení nepřepsalo neuložené zaškrtnutí.
- Kotva skryté sekce zmizí i z klouzající lišty (OCK i PROJ), aby
  neukazovala do prázdna.

Skrytá sekce se dál počítá, jen není vidět. Skrytím Zadání šachty by
obchodník přišel o možnost zadat rozměry, takže tuto volbu používejte
s rozmyslem.

Testy: `overit_zobrazeni.mjs` (+13 kontrol: select u každé karty, rozbalení,
skrytá karta i kotva u přihlášeného obchodníka, změna za chodu a její
vrácení).

### CI: harness overit_verzi nepadá den po commitu

Běh CI na main (commit 94a7267 z 22. 9., spuštěný 23. 9.) selhal ve dvou
harnessech, ačkoli týž commit na testu den předtím prošel. `overit_verzi.mjs`
vrací verzi z gitu příkazem `build.py --ver …` a pojistka data (od 20. 8.)
verzi ze včerejška odmítla — i v bloku `finally`. V `dist/` tak zůstala verze
z lokálního buildu a `overit_zobrazeni.mjs` narazil na blokující překryv
„nesoulad verzí". Aplikace ani ostrý web to nezasáhlo (Netlify verzi jen
přebírá). Návrat verze teď pojistku vědomě obchází (`KNG_VERZE_MIMO_DEN=1`).
Ověřeno nad stavem main: bez opravy harness spadne, s ní 7/7 a
overit_zobrazeni 121/0.

---

## v23.9.1 — 23. 9. 2026

### Nová tuzemská zakázka už nehlásí falešný rozdíl ceníku (K9-N31)

Nález z 9. testovacího kola. **Co bylo špatně:** každá nová tuzemská
zakázka hned po založení ukazovala lištu „Ceník v této kalkulaci se liší od
dnešního ceníku aplikace – 1 položka … −100 %". Šlo o položku označenou
„jen zahraničí": přehled ji srovnává s ceníkem složeným pro tuzemskou řadu,
kde je nulová, kdežto nová zakázka brala holý ceník aplikace. Na cenu to
vliv nemělo, obchodník ale dostával planý poplach.

**Co platí teď:** nová zakázka i nová varianta dostanou ceník už složený pro
tuzemskou řadu — položky „jen zahraničí" se zahraniční cenou jsou na nule,
stejně jako po přepočtu (`novaVariantaData` v `zakazka.js`). Test:
`test_cenik_rady.js` (4 kontroly; bez opravy dvě selžou).

---

## v22.9.22 — 22. 9. 2026

### Jedno číslo varianty — platí číslo na papíře (#320)

Rozhodnutí J. V.: „platí číslo na papíře, nové klony dostanou příponu shodnou
s pořadím a odeslaným nabídkám zůstane číslo, se kterým odešly."

**Co bylo špatně.** Varianta měla dvě čísla. Dokumenty (nabídky OCK i PROJ,
krycí listy) číslovaly podle POŘADÍ v zakázce — druhá varianta …555.2 —
kdežto zámek odeslané nabídky, seznam variant, archiv, hlášky i serverová
kontrola čísla (B56) podle přípony klonu, kterou první klon dostal .1.
Změřeno: druhá varianta odešla zákazníkovi jako 0555.2, v zámku stála
0555.1 a číslo 0555.2 v aplikaci patřilo jiné nabídce než na papíře. Číslo
podle pořadí se navíc posouvalo: po smazání dřívější varianty nesl dotisk
téže odeslané nabídky jiné číslo, než jaké odešlo.

**Co platí teď.** Číslo je jedno — přípona varianty — a berou ho odsud
dokumenty, zámek, seznamy i server. Nová varianta (klon, alternativa
z archivu, duplikát) dostane příponu podle pořadí: druhá .2, třetí .3.
Po smazání varianty se její číslo znovu nepoužije — další dostane číslo
nad maximem (…555.4 místo uvolněného .3), protože číslo, které jednou
padlo, nesmí patřit jiné nabídce. Název klonu nese totéž číslo
(„Varianta 3" = .3).

**Uložené zakázky.** Při prvním načtení se jednou přečíslují podle pořadí
— tedy na přesně to číslo, které jim dosud tiskly dokumenty. Týká se to
i odeslaných variant: jejich papír nesl číslo podle pořadí. Od té chvíle se
číslo nemění ani po smazání jiné varianty (značka `priponySchema`).
Samotného zámku se migrace nedotkne — `zamek.cislo` je v klíči zámku
a zůstává, jak byl pořízen; lišta zámku ale ukazuje číslo z papíru.

**Server (B56).** Nový zámek nese značku `cisloPapir` (je v klíči zámku,
nedá se sundat) a server u něj hlídá celé číslo včetně přípony —
přečíslovat odeslanou nabídku .2 na .7 obchodník nesmí. U starých zámků se
hlídá jen základ čísla; jinak by migrace sama zablokovala každé uložení
zakázky se starou odeslanou variantou.

**Mez.** Nabídka odeslaná před touto změnou, u níž se mezitím smazala
dřívější varianta, nese na papíře jiné číslo, než jaké jí dává pořadí dnes.
Kolik variant tehdy existovalo, se nikde nezapisovalo — zůstává jí číslo,
které aplikace ukazovala naposledy.

Testy: `test_zamek.js` oddíl #320 (20 kontrol: dokument = zámek u každé
varianty, číslo drží po smazání dřívější varianty, znovunačtení
nepřečísluje, migrace starého zámku bez zásahu do klíče, duplikáty
z v22.9.16 se třemi nulami, značka v klíči), `test_prava.mjs` (10: stará
zakázka se starým zámkem se po migraci uloží, změna základu u starého
zámku i přečíslování přípony u nového se odmítnou, sundaná značka → 409),
`overit_online.mjs` 10e (stará zakázka v prohlížeči: lišta i dokument
nesou .2), `overit_lista.mjs` (klon .2 a nabídka ho vytiskne pod týmž
číslem). Upravena očekávání starého číslování v `test_archiv`, `test_seznam`
a `test_zakazka_duplikace`. Tři nové mutace, serverových mutací je 144.

---

## v22.9.21 — 22. 9. 2026

### Dávka R5 z revize v22.9.9 — testy říkají pravdu o tom, co neověřily

Aplikace se v této dávce nemění; mění se to, co o ní hlásí testy.

**Přeskočený harness už není „prošlo" (T3).** Harness bez firemního
podkladu (wordové šablony, příručka obchodníka) končil kódem 0, takže CI
psalo „OK" a `spust_testy.sh` „✓ prošlo". Souhrn hlásil „všechny prošly",
zatímco pět harnessů — příručka, nabídka PROJ ve Wordu, šablona nabídky,
šablony online a smlouvy — v CI nikdy neběželo. `preskoc()` teď končí
vlastním kódem 4; `spust_testy.sh` ho počítá jako PŘESKOČENO s důvodem
a CI ho vypíše jako „PŘESKOČENO" i jako upozornění v přehledu běhu. Souhrn
místo „159 prošlo" říká „155 prošlo, 6 přeskočeno" a vyjmenuje je.

**Selhání před přeskočením se nezamete (T2).** `overit_sablony_online.mjs`
pouští pět kontrol přísného režimu ještě před hledáním šablony — a když
šablona chyběla (v CI vždy), skončil kódem 0 i se selháním. Harness teď
předává `preskoc()` svůj stav a selhání před přeskočením je selháním
harnessu. Že to dělá každý harness s kontrolou nad přeskočením, hlídá
nová sada.

**Chybějící playwright (T5).** Kód 2 se dosud nepočítal nikam a harness,
který playwright importuje (ESM proměnnou `NODE_PATH` nečte), padal bez
místního `node_modules/playwright` jako selhání s radou „npm i -g
playwright", která mu nepomůže. Obojí je teď přeskočení s radou
„v kořeni: npm i playwright".

**Obnova proměnné v testu (T5).** `test_prava.mjs` po bloku B54 vracel
`ADMIN_EMAIL` přiřazením — u nenastavené proměnné tím zapsal řetězec
„undefined". Nenastavená teď zůstane nenastavená.

Nová sada `src/test_harness_podklady.js` nezkouší text skriptů, ale jejich
chování: spouští skutečné `preskoc()`, skutečný krok z workflow a skutečnou
funkci `spust_prohlizec` nad podstrčenými harnessy s kódy 0, 1, 2, 4
a s chybějícím playwrightem. Nad skripty před opravou 16 selhání z 21.

---

## v22.9.20 — 22. 9. 2026

### Dávka R4 z revize v22.9.9 — server a mutační nástroj

**Výsledek nově odeslané nabídky ověří server (B59).** Oprava B53 chrání
zmrazený výsledek odeslané nabídky PO zamčení, jenže ten výsledek do té doby
pořizoval jedině prohlížeč a server ho při vzniku zámku převzal, jak přišel.
Upravený klient tak mohl zamknout nabídku s jinými čísly, než dávají data
(třeba s větší slevou, než smí schválit), a B53 ji pak chránil jako pravdu.

Server teď výsledek každého NOVÉHO zámku přepočítá tímž jádrem a porovnání
zapíše do zámku jako razítko: shoda / nesouhlasí / neověřeno. Výsledek skládá
jediná funkce `zamekVysledekSpocti` v `zamek.js` — tou ho pořizuje prohlížeč
při tisku i tou ho ověřuje server, aby se dva opisy téhož vzorce časem
nerozešly. Razítko píše výhradně server: u nového zámku ho spočítá, u zámku,
který už v databázi je, ho převezme z uložené verze. Klient ho tedy
nepodvrhne ani nesmaže.

Rozpor uložení **neodmítne** — vědomé rozhodnutí. Papír v tu chvíli už
odešel a odmítnutí by jen nechalo variantu v databázi odemčenou a dál
upravitelnou, což je horší stopa než zámek s rozporem zapsaným natrvalo.
A poctivého obchodníka se stránkou načtenou těsně před nasazením nové verze
by zablokovalo: jeho čísla spočítalo starší jádro a papír nese právě ta.
Rozpor proto hlásí hned hláška po uložení a trvale lišta zámku u každého,
kdo variantu otevře (i se jménem verze, která výsledek spočítala).

Ověřeno v prohlížeči: nabídka zamčená skutečným tiskovým náhledem má
u serveru shodu (po cestě přes síť i přes `importZakazka`), upravený klient
dostane varování a rozpor v liště.

**Mutace na větev role u B56 (T5).** Dosavadní mutace vypínala celou
kontrolu čísla odeslané nabídky; nově se zkouší i to, že by kontrola běžela,
ale nikoho nezastavila. Přibyly čtyři mutace B59. Serverových mutací je 141.

**Přerušený mutační běh vrátí zmutovaný soubor (T5).** V 19. kole zůstal
po přerušení v pracovní kopii rozbitý serverový soubor. `mutace.mjs` teď
na SIGINT, SIGTERM i SIGHUP nejdřív vrátí právě zmutovaný soubor, pak
ukončí běžící sadu, počká na ni (jinak po ní v kontejneru visí zombie)
a skončí kódem 130. Sady se kvůli tomu spouštějí asynchronně — se
synchronním `execFileSync` by se obsluha signálu dostala ke slovu až po
doběhnutí všech mutací. Hlídá to nová sada `netlify/test_mutace.mjs`:
skutečný běh s podstrčenou čekající sadou, oba signály, soubor bajt po
bajtu, žádný visící proces.

---

## v22.9.19 — 22. 9. 2026

### Dávka R3 z revize v22.9.9 — pojistky ceníku

**Značka prázdného ceníku se sundávala sama (N33).** Pravidlo „jediné
nenulové číslo dokazuje skutečné ceny" počítalo s tím, že vynulovaný ceník
má nuly všude. Sestavení ale nese skutečné sazby DPH (zákonné, ne firemní
data) — OCK 12 % a předvolby, PROJ 21 %. Každý ceník tak „měl čísla" a při
otevření zakázky se značka prázdného ceníku sundala; u uzamčené varianty
natrvalo, i s červenou lištou a zábranou tisku nad nulovými cenami. Za
důkaz cen se nově nepočítají sazby a předvolby DPH, přirážka, procenta
a kurz. Test se ptá přímo výchozích ceníků ze sestavení, ne umělé fixtury
s `dph: 0`.

Harness `overit_program` na té chybě nevědomky stál: jeho „ceník projekce
s čísly" byl ve skutečnosti samé nuly se sazbou DPH. Dostal jednu
smyšlenou hodinovou sazbu a přibyl případ ceníku PROJ samých nul se sazbou
DPH, kterému značka zůstat musí.

**Návrat do tuzemska u položky jen pro zahraničí (N38).** Tuzemská řada má
u takové položky nulu, návrat ale dosazoval hodnotu z ČR sloupce ceníku
(změřeno: 50 000 místo 0). Přepočet při dalším otevření pak hlásil „Změnila
se 1 cena", ačkoli se nic nezměnilo. Návrat bere hodnotu ze složené
tuzemské řady — tatáž funkce jako přepočet.

---

## v22.9.18 — 22. 9. 2026

### Dávka R2 z revize v22.9.9 — kde se ztrácela nebo tiše ukládala práce

Všechny čtyři nálezy revize ověřila čtením kódu; tady jsou poprvé
**změřené v prohlížeči** — každý test nad kódem před opravou selže.

**Ruční přihlášení po vypršení relace (N34).** Posluchače „uživatel něco
udělal" sedí na celém dokumentu a přihlašovací okno je v tomtéž dokumentu:
napsání hesla značku nastavilo dřív, než se člověk přihlásil. Poslední
zakázka se pak neotevřela (změřeno: místo ní prázdná zakázka s firemní
přirážkou) a aplikace hlásila neuložené změny, které nikdo neudělal. Oprava
N12/N13 tak platila jen pro F5 se živou relací. Události z přihlašovacího
okna se nově nepočítají; ochrana rozdělané práce zůstává.

**Společné dodatkové texty po nasazení ceníku (N35).** Nasazení platného
ceníku vyměňuje výchozí ceník celý — a texty vlité po přihlášení tím
zmizely, podle toho, který požadavek doběhl dřív; po zveřejnění nového
ceníku pokaždé. Texty se teď vlévají znovu po každé výměně ceníku.

**Duplikace s neuloženými změnami (N36).** Dotaz se ptal jen režimu složky,
který je vypnutý — v online režimu se nepoložil nikdy a duplikace práci
tiše zahodila. Nově se ptá jako otevření jiné zakázky (uložit / zahodit /
zůstat) a od předlohy se odpojí toutéž funkcí jako „Nová zakázka", která
ruší i naplánovaný autosave předchozí zakázky.

**„Vrátit původní ceny" v obnovené záloze (N37).** Větev vrácení prohlásila
zakázku za uloženou — u zálohy z prohlížeče, která na serveru není, tím
autosave i varování při zavření okna ztichly. U zálohy se to už neděje;
u zakázky ze serveru ano (jinak by první klik uložil odmítnuté ceny).

---

## v22.9.17 — 22. 9. 2026

### Dávka R1 z revize v22.9.9 — rychlé opravy

Pořadí dávek schválil J. V. („ano, začni dávkou R1"). Tři z oprav jdou za
mnou: B60 a protokol poznámek vznikly s jediným textovým polem poznámek
(#311), a B63 s tím, že dodatkový text vidí každý (#310).

**Duplikace zakázky (N32 + B60).** Všechny varianty duplikátu dostávaly
příponu 0, tedy v zámku, v seznamu variant i v hláškách tři nabídky pod
holým číslem; test to dokonce zafixoval. Nově přípony podle pořadí (holé
číslo, .1, .2) a nejvyšší přípona odpovídá duplikátu, ne předloze. Duplikát
navíc nesl celé jediné textové pole poznámek — zápisky o jednání s jiným
zákazníkem —, ačkoli dialog tvrdí, že se poznámky nekopírují. Už nenese.

**Dodatkový text v zamčené zakázce (B63).** Pole textu pod položkou se ptalo
jen na zámek varianty. V zakázce jen ke čtení text přijalo a po F5 byl pryč;
v náhledu cizího uživatele by ho administrátor zapsal i na server. Teď ho
hlídá týž obal jako ostatní zápisy (náhled, zámek čtení, zámek varianty).

**Varování u stěny s nulovou plochou (N39).** Tvrdilo, že se čelní stěna
bere ze světlíků — stav před #295. Dnes říká pravý důvod: otvory dveří
a portálů zaberou celou stěnu (nízká šachta s mnoha nástupišti), a totéž
umí i u zadní stěny průchozí šachty.

**Protokol zakázky vidí úpravu poznámky (N41).** Od #311 se poznámka píše do
jediného pole a protokol porovnával jen počty v seznamech — úprava v něm
nebyla vůbec. Zapisuje se, že se poznámka změnila a o kolik znaků, nikdy
obsah. Porovnává se text, který uživatel vidí, takže první uložení pole
u starší zakázky se za změnu nevydává.

**Obnova společných dodatkových textů ze zálohy (B64).** Zapisovala je
doslova; nově projdou toutéž očistou jako běžný zápis (strop délky, počtu
a tvaru). Nová mutace to hlídá, chycená — celkem 136.

**Cenový test režimu po stěnách (T1).** Dosavadní kontrola byla rovnost
z konstrukce a cenu neměřila — proto prošel N31. Nově: na 128 zadáních
(oba modely) se náklad opláštění hýbe stejným směrem jako plocha, a regrese
N31 — u průchozí šachty zaškrtnutí světlíku nad dveřmi v režimu po stěnách
nemění základ čelní ani zadní stěny a cenu nesníží. Ověřeno, že nad jádrem
v22.9.9 sada padá (24 selhání), nad dnešním prochází.

Každá oprava je ověřená i opačně: test nad kódem před opravou selže.

**Mimo R1 se při práci ukázal nový nález, ne k opravě bez rozhodnutí:**
číslo varianty v dokumentu (index v zakázce: druhá varianta „.2") se liší
od čísla v zámku, v hláškách a na serveru (přípona klonu: první klon „.1").
U odeslané nabídky tak zákazník má na papíře jiné číslo, než jaké o ní
aplikace ukazuje. Zapsáno do roadmapy jako #320 s otázkou.

---

## v22.9.16 — 22. 9. 2026

### Vnější lešení je u interiérové šachty zase příplatkem

Pokyn J. V. večer: „vnější lešení vrať do příplatkových položek."

Oprava K1 z odpoledne (v22.9.12) ho u interiérové šachty vyřadila ze
základní ceny **i z příplatků**. Rozhodnutí přitom znělo „primárně
nenabízet" — tedy nedávat do základní ceny, ne zakázat. U interiérové šachty
je teď vnější lešení **vždycky příplatkem**: do základní ceny se tam dostat
nemůže, zákazník si ho ale doobjedná. Cena příplatku je tatáž jako na
exteriérové šachtě (obvod lešení × výška + fixní část). Nabídka u něj tiskne
cenu, specifikace „lze doplnit viz příplatkové ceny" a kapitola IV. dál žádá
lešení po objednateli, dokud si ho neobjedná.

### Technická specifikace se řídí cenou (P8/6 statika, P8/7 lešení)

**Statika:** „statiku nastav tak, ať dokument respektuje to, co je v ceně."
Pole OVĚŘOVACÍ STATICKÝ VÝPOČET KONSTRUKCE mělo pevné „ano" a šlo přepsat na
„ne", zatímco statika v ceně zůstala — a naopak. Nově je **odvozené**: „ano",
když je v Kalkulaci OCK položka STATICKÉ POSOUZENÍ s nenulovým množstvím,
jinak „ne". Na obrazovce je jen ke čtení a říká, kde se statika vypíná
(množstvím 0). Statika zdarma (cena 0, množství nenulové) je pořád „ano" —
dělá se.

**Lešení kolem OCK:** schválený návrh k P8/7 chtěl srovnat specifikaci
i kapitolu IV.; oprava K1 srovnala jen kapitolu. U exteriérové šachty
s lešením v ceně tak dokument tvrdil v jedné sekci „je součástí dodávky"
a v sekci SOUČÁSTÍ DODÁVKY NENÍ „zajistí objednatel". Ten řádek se teď
v tom případě **vynechá** — stejně jako sokl od 16. 9. Mimo tenhle případ
volí text dál obchodník.

**Ruční hodnota se nemaže.** Zůstává v datech a obrazovka ukáže, že se
nepoužije. Vrátí se, kdyby cena přestala rozhodovat.

U odeslané nabídky se znění řídí zmrazeným výsledkem, takže se zpětně
nezmění — kromě případu, kdy ruční text ceně odporoval; takový dokument si
odporoval už při odeslání.

### P8/5 montáž — uzavřeno bez zásahu

„Počet lidí na montáž neřeš." Čtyřka v kódu zůstává. Tím je uzavřených všech
devět voleb P8 (#285).

---

## v22.9.15 — 22. 9. 2026

### Zahraniční zakázka má po přepnutí sazbu DPH 0 %

J. V. ke snímku zahraniční zakázky se sazbou 12 %: „sazba DPH se při
přepnutí na zahraniční ceník nepřepíná na 0 % … to by bylo optimální."

Pole pro zahraniční sazbu DPH přibylo dávkou N18 (v22.9.13), jenže
zveřejněný ceník ho nemá vyplněné a ceník se během testu nemění. Přepnutí
tedy sazbu nechalo tuzemskou. **Prázdná zahraniční sazba DPH teď znamená
0 %**, ne „jako v ČR" — dodávka s montáží do zahraničí se běžně fakturuje
bez české daně. Výslovně zadaná sazba v ceníku má přednost; kdo chce
i v zahraničí českou sazbu, zapíše ji. Návrat zakázky do tuzemska vrátí
tuzemskou sazbu a ruční volba obchodníka se nepřepisuje nikdy (#177).

**Výchozí nula se do ceníku neukládá**, takže nemění jeho otisk ani verzi.
Doplňuje se na třech místech, která musí mluvit stejně: přepnutí varianty,
dnešní ceník pro přepočet při otevření a složení zahraniční řady. Kdyby ji
znalo jen přepnutí, přepočet by prázdné zakázce při příštím otevření vrátil
tuzemskou sazbu.

Nabídka měla u sazby podmínku „do 15 % snížená, jinak základní" a tiskla by
**„DPH 0 % (snížená sazba)"**. Nulová sazba má teď vlastní jméno — nulová,
v angličtině *zero*, v němčině *Null*.

Přepnutí se dál odmítne nad zahraničním ceníkem, který nemá **žádnou
výslovnou** odchylku — samotná výchozí nula k přepnutí nestačí, jinak by se
zakázka tvářila jako zahraniční s tuzemskými cenami.

Zakázky přepnuté do zahraničí před touhle dávkou si svou sazbu nechávají.
Nulu dostanou přepnutím zpět do tuzemska a znovu do zahraničí, nebo výběrem
v hlavičce.

---

## v22.9.14 — 22. 9. 2026

### V zamčené zakázce se uložení nenabízí, odemyká se na jednom místě (N25)

Tohle očekávání se během dvou dnů změnilo dvakrát, a proto stojí za to mít
celý vývoj pohromadě.

Do 21. 9. bylo tlačítko „Uložit zakázku" v zakázce jen ke čtení **mrtvé**:
vypadalo jako tlačítko a kliknutí neudělalo nic. Jediná zmínka o tom, proč,
skončila v kartě Databáze, kam se v tu chvíli nikdo nedívá — uživatel
odcházel s dojmem, že je práce uložená (nález N4).

21. 9. se tedy oživilo a přejmenovalo na „🔒 Odemknout a uložit". Jenže ani
to akci nedokončilo: zůstala hláška o režimu čtení, nic se neuložilo
a otevřel se panel Zakázky online. Uživatel měl před sebou tlačítko, které
slibovalo dvě věci a neudělalo ani jednu (N25).

Rozhodnutí J. V. 22. 9.: **tlačítko u otevřené zakázky nenabízet.** V režimu
čtení se proto nekreslí vůbec a lišta začíná „Načíst zakázku". Odemčení má
jedno místo — lištu zámku nad Kalkulací OCK, Kalkulací PROJ i oběma ceníky,
kde je i důvod, smí-li odemykat jen někdo jiný.

**Zábrana zápisu zůstala v kódu, ne v nedostupnosti prvku.** `zakUlozUI()` se
dál ptá `zamekCteniStop()`: vede sem i automatické ukládání a klávesnice.
Odznak „jen ke čtení" už neposílá na tlačítko, které neexistuje.

### Dialog o přepočtu mluví česky (K5)

Vycházelo z něj „přepočítala se na **nová verze**. **Změnilo se 3** ceny."
Číslo verze se skládalo v 1. pádě a dosazovalo do věty, která žádá 4. pád,
a sloveso bylo napsané jednou pro všechny tvary počtu.

Věta je teď samostatná funkce, takže se dá změřit testem bez otevírání
dialogu a bez vyrábění zakázky s přesným počtem změněných cen. **Nula patří
do tvaru „0 cen"**, ne mezi 2–4; dosavadní podmínka `zmen < 5` to nehlídala.

### N28 — odpověď, ne oprava

Dvě zakázky v ostré databázi nesou uvnitř uloženého ceníku značku zahraniční
řady, ačkoli jejich varianta je česká. **Na výpočet to nemá vliv** (o řadě
rozhoduje `cenikRada`, značka v ceníku je až druhá v pořadí) a klon počítá
správně. **Na zveřejnění ceníku taky ne**, a to dvakrát pojištěně: podklad se
od značek čistí před odesláním a nad tím stojí pojistka, která zveřejnění
zastaví, kdyby se zahraniční ceník vydával za tuzemský.

Rozhodnutí J. V.: **migrace ostré databáze se nedělá** — riziko převyšuje
užitek. U odemčené zakázky značka zmizí sama při nejbližším uložení; u
odeslané je uložený ceník doklad o tom, co odešlo zákazníkovi. Zapsáno do
roadmapy jako #316, v kódu se nemění nic.

---

## v22.9.13 — 22. 9. 2026

### Zahraniční řada ceníku umí i sazbu DPH (N18)

Po přepnutí zakázky na zahraniční ceník naskočila zahraniční globální
přirážka a ceny se přepsaly, ale **sazba DPH zůstala tuzemská**. Zahraniční
nabídka se tiskla v eurech s českou sazbou.

Nebylo to chybějící pravidlo, ale **chybějící pole**. Sazba DPH je sledovaná
ceníková cesta úplně stejně jako globální přirážka, takže mechanismus pro ni
existoval. Administrátor ji ale neměl kam zadat: sloupec „Cena Zahraničí" se
kreslí jen u řádků tabulky a sazba DPH v tabulce není, je to hodnota
hlavičky. Dialog přepnutí přitom sliboval správně, že se sazba přepne, má-li
pro ni ceník odchylku.

Pole je teď v obou cenících, u přirážky. **Nula je platná hodnota**,
přenesená daňová povinnost, a od prázdného pole se liší: prázdné znamená
„jako v ČR". Ověřeno testem, ne čtením kódu, protože přesně tenhle rozdíl se
v pravdivostní podmínce ztratí.

Poznámka u ceníku PROJ tvrdila, že sazby DPH jsou celé společné s OCK.
Společné jsou **předvolby**; vybraná sazba nabídky zůstává projekci vlastní,
a proto má i vlastní zahraniční odchylku.

**Ceník se touhle dávkou nezveřejňuje.** Sazbu do ostrého ceníku zadá J. V.
sám, až bude oprava odsouhlasená.

---

## v22.9.12 — 22. 9. 2026

### Interiérová šachta neplatí lešení, které se u ní nestaví (K1, P8/7)

Rozhodnutí J. V.: „u interiérové šachty vnější lešení primárně nenabízet."

Dělení volitelných položek podle typu šachty v jádře existovalo od začátku,
háky a sokl jen venku, zábradlí jen uvnitř. **Vnější lešení do něj nikdo
nedopsal**, takže ho interiérová zakázka platila v základní ceně. Nově se
u ní nenabízí ani mezi volitelnými, ani mezi příplatky.

Dvě místa se musela srovnat spolu s tím. Nabídka vracela u chybějícího
příplatku vždycky „v základní ceně", což by u interiérové šachty tvrdilo, že
lešení v ceně je, ačkoli v kalkulaci není vůbec; teď rozlišuje **„je
v základní ceně"** od **„u téhle šachty neexistuje"** a v druhém případě
tiskne pomlčku. Technická specifikace u interiérové šachty říká, že lešení
zajistí objednatel, místo dosavadního odkazu na příplatkové ceny.

**Kapitola IV. si přestala odporovat se specifikací.** Žádala po objednateli
zajištění montážního lešení i tehdy, když specifikace u téže zakázky říkala,
že vnější lešení je součástí dodávky. Zákazník si mohl vybrat výklad, který
je pro něj levnější. Odrážka teď zmizí, právě když je lešení v dodávce, a to
ve všech třech jazycích kapitoly.

**Testy:** čtrnáct kontrol, které bez opravy padají. Interiérová zakázka
o položku zlevní a přepínač s ní nehne, exteriérová se nezmění, a to v obou
režimech výpočtu.

---

## v22.9.11 — 22. 9. 2026

### Světlík se počítá k té stěně, na které je nástupiště (#296)

Rozhodnutí J. V.: „zadní světlíky patří pochopitelně na zadní stěnu."

Počet světlíků byl správný, je jich tolik, kolik je nástupišť. Všechny se
ale sčítaly do položky **čelní stěny**, a zadní stěna si svůj pás odečítala,
aby se plocha nepočítala dvakrát. Dvě věci na tom byly špatně. U průchozí
šachty vycházela položka čelní stěny **větší než celá čelní stěna**, na ostré
zakázce 75,16 m² proti 37,9 m². A protože čelní a zadní stěna mají
u exteriérové šachty jiné sklo, počítaly se zadní světlíky **sazbou čelního
skla**.

Nově nese čelní položka jen nástupiště A a pás nad zadními dveřmi je
obyčejné sklo zadní stěny. Od zadní stěny se proto odečítají už jen dveře.

**Celková plocha skla se nemění**, přesouvá se jen podíl mezi stěnami.
Změřeno na zkušební průchozí šachtě 2 plus 2, obojí 71,97 m²:

| šachta | před | po |
|---|---|---|
| exteriérová | 978 000 Kč | 986 000 Kč |
| interiérová | 804 000 Kč | 804 000 Kč |

Exteriérová podražila proto, že zadní sklo je dražší než čelní, a zadní
světlíky se teď počítají tím, čím doopravdy jsou. Interiérová má obě stěny
ze stejného skla, takže se nehne vůbec. Neprůchozí šachty se změna netýká,
nemají nástupiště C.

Zamčené nabídky zůstávají, jak jsou, mají zmrazený výsledek. Rozpracovaná
průchozí exteriérová zakázka se po otevření přepočítá.

---

## v22.9.10 — 22. 9. 2026

### Roadmapa se dá vydat z repozitáře (#312)

Generátor roadmapy v repozitáři nebyl. Žil v pracovní kopii mimo GitHub,
což mělo dva důsledky. Kdo měl po ruce jen repozitář, stránku přegenerovat
neuměl, a roadmapa proto zůstala na **v17.9.2**, zatímco aplikace byla o pět
buildů dál. A prohlížečový harness, který stránku kontroluje, se **od svého
vzniku jen přeskakoval** — třináct kontrol, které nikdy neběžely.

Z vydané stránky ze 16. 9. je nově **šablona**: vyříznutá data nahradila
značka, kam je generátor vkládá. Vzhled a vykreslení se tedy mění v šabloně,
data v JSONu, a obojí je v repozitáři.

```
python3 roadmapa/roadmapa.py --kontrola   # jen pravidla, nic nezapíše
python3 roadmapa/roadmapa.py              # → ROADMAPA.html + ROADMAPA.md
```

**Výstupy se necommitují** (stejný důvod jako u `dist/`): rozcházely by se
se zdrojem a každá dávka by nafoukla diff o půl megabajtu. Sada
`./spust_testy.sh --smoke` i CI si stránku před prohlížečovými harnessy
vyrobí samy, takže `overit_roadmapu.mjs` běží. Prošel napoprvé, 13 kontrol.

Kontrola pravidel je ve skriptu i v Node sadě. Dvě místa schválně: sada
hlídá repozitář v CI, skript hlídá i toho, kdo generuje mimo něj.

---

## v22.9.9 — 22. 9. 2026

### Sazba ATYP se bere vždy z ceníku, drobnosti v poznámkách, roadmapa (#298)

**#298 je rozhodnuté a zavedené.** Hlášený rozdíl 5 versus 6 hodin nevznikal
jiným vzorcem, ale jiným zdrojem sazby: zaškrtnutí ATYP sáhlo při chybějící
sazbě po náhradě ze sestavení, kdežto přepočet na platný ceník hodiny nechal,
jak byly. Rozhodnutí J. V.: sazba se bere vždy z ceníku, ať se ATYP spustí
automaticky nebo ručně, a co si obchodník přepíše, je jeho věc.

Obě cesty teď čtou touž hodnotu týmž způsobem. **Když ceník sazbu má, a to je
normální stav, dávají obě totéž** a rozdíl nemá jak vzniknout. Ruční přepis
zůstává nedotčený a uzamčené ani kvitované varianty se do přepočtu vůbec
nedostanou, takže odeslanými nabídkami to nehne.

**Interní poznámky v Kalkulaci PROJ dostaly ovládání sekce** (zobrazit,
srolovat, skrýt) stejně jako v Kalkulaci OCK. Vysvětlivka pod polem se
zkrátila na to podstatné: karta se netiskne.

**Roadmapa doplněna ke stavu v22.9.9.** Chyběly v ní položky **#267**
(dodatkový text místo množství v nabídce, v18.9.1) a **#268** (opláštění po
stěnách ve třech krocích, v18.9.2 až v21.9.4) — čísla padla v commitech
z 18. a 21. 9., ale záznam v pořadníku k nim nikdo nezaložil. Doplněny
z commitů, ne z odhadu. Pořadník končil 17. 9.; přibyly dávky z 18., 21.
a 22. 9. a hlavička je na dnešku.

---

## v22.9.8 — 22. 9. 2026

### Dodatkové texty zůstávají v aplikaci, zápisník je jedno pole (#310, #311)

**Dodatkový text pod položkou teď platí pro celou firmu (#310).** Od #267
se text píše do ceníku, jenže ceník se **zveřejňuje** — vydat kvůli jedné
větě novou verzi ceníku znamená novou verzi pro všechny budoucí nabídky.
Nikdo to nedělal, takže text zůstal v zakázce toho, kdo ho napsal, a nikdo
jiný ho neviděl. Pole navíc viděl jedině administrátor.

Nově jsou dvě úrovně, přesně podle zadání:

- **Aplikace.** Co napíše administrátor, se uloží na server a od příštího
  přihlášení se předvyplňuje všem. Zveřejněný ceník má přednost: kdyby ho
  společná mapa přebíjela, správce by změnu ve vydané verzi nikdy
  neprosadil.
- **Zakázka.** Pole vidí a upraví každý, ale jeho změna platí jen pro jeho
  nabídku. Výchozí text tím nikdo nepřepíše nedopatřením.

Odeslané nabídky se tím nemění. Zakázka si nese vlastní kopii ceníku, takže
pozdější úprava textu nesahá na to, co už zákazník dostal.

Texty putují i do **zálohy a obnovy**. Nový klíč, který záloha nenese, by
obnova tiše smazala — přesně kvůli tomu vznikl nález B9.

**Interní poznámky jsou jedno textové pole (#311).** Z karty zmizely štítky
druhu poznámky, zápisník jednotlivých záznamů i nahrávání příloh. V provozu
se zápisník používal jako jeden odstavec pod druhým, takže druh, autor a čas
u každé věty byly režie navíc; přílohy se navíc nosily přímo v souboru
zakázky a nafukovaly ho na hranici odeslatelnosti e-mailem.

**Nic se nesmazalo.** Model umí dál všechno, co uměl. Starší zakázky se
svými záznamy se v poli ukážou jako předvyplněný text a přílohy, které v nich
už jsou, jdou pořád stáhnout — jen nové přibývat nemůžou. Čtení přitom
zakázku nemění: kdyby se pole materializovalo při vykreslení, zakázka by se
sama označila za neuloženou, což je táž past jako u dnešních nálezů N12/N13.

**Karta se přestěhovala nahoru** — v Kalkulaci OCK mezi souhrn zakázky
a Zadání šachty, v Kalkulaci PROJ mezi souhrn a Cenovou kalkulaci PROJ.
Dosud stála úplně dole pod Detailem mezivýpočtů, kam obchodník musel projet
celou kalkulaci. Je to **jeden zápisník zakázky**, ne dva: co se napíše
v OCK, je vidět i v PROJ.

**Testy:** sedm serverových k novým textům a pět k úplnosti zálohy,
jedenáct modelových k očistě a přednosti ceníku, deset k textovému poli
a pět ke stavu obrazovky. Prohlížečový harness ověřuje obě nové polohy karty
i to, že se text nedostane do žádného dokumentu. Dvě nové mutace, celkem 135.

---

## v22.9.7 — 22. 9. 2026

### Mutace se teď kontrolují za vteřinu, ne za sedmnáct minut (#309)

**Co se stalo.** Dávka 4 změnila dva řádky, na které mířily starší mutace.
Mutace se tím staly nespustitelnými — jejich hledaný úsek se v kódu už
nenašel. Sady i harnessy v CI byly zelené, mutační job červený, a to až
po sedmnácti minutách běhu.

Je to chyba v **zadání mutace**, ne v kódu. Obě mutace jsou srovnané a obě
znovu ověřené jednotlivě: chytají se.

**Oprava u kořene.** Mutační skript umí `--kontrola`: projde všechna zadání
a ověří, že každé najde svůj úsek právě jednou. Nespustí přitom ani jednu
testovou sadu, takže je hotov za vteřinu. Běží nově v CI jako krok **před**
plným během a taky v běžné sadě `./spust_testy.sh` — tedy dřív, než se
vůbec dá pushnout.

Celý mutační běh po opravě: **131 ze 131 chycených**, žádné chybné zadání.
Mezi nimi všechny čtyři dnešní: zmrazený výsledek (B53), ADMIN_EMAIL (B54),
odchylky ceníku (B55) i číslo odeslané nabídky (B56).

---

## v22.9.6 — 22. 9. 2026

### Dávka 5: drobnosti, na kterých ale stojí důvěra v běh (#307, #308)

**Repozitář dostal `package-lock.json` (B11).** Jediná závislost byla
zapsaná rozsahem, takže si každé sestavení na Netlify mohlo vzít jinou
verzi, aniž by se v repozitáři cokoli změnilo. Zámek se generoval v čistém
adresáři: na místě by do něj `npm` zapsal i symbolické odkazy na globální
playwright z tohohle prostředí a jinde by pak `npm ci` spadl.

**Pravidla pořadníku teď kontroluje Node sada (N18).** `roadmap.json` je
jediný zdroj pravdy o tom, co je hotové, ale jeho pravidla hlídal jedině
generátor, který v repozitáři není. Dnes se soubor rozbil dvakrát a pokaždé
se to našlo ručně. Nová sada ověřuje přesně to, co vypisuje README
v roadmapě — nic navíc, aby nebyla přísnější než dohoda.

První běh rovnou našel položku **#295** ve stavu „hotovo", která si držela
„čeká na J. V.". Odpověď z dnešního rána je teď zapsaná přímo u ní, čekání
je pryč.

**Popisky tří bloků v matici práv nesly čísla, která už patří jinému
auditu.** Testy z 23. 8. se jmenovaly stejně jako nálezy z 9. 9.
Přeznačeny na řadu L, jak je to od začátku v souboru mutací.

**Návod ke zdrojákům popisoval dva prohlížečové testy, ne třicet sedm.**
Sekce dopsaná podle skutečného stavu: co harnessy pokrývají, že se pouštějí
globem (a proč), které se bez firemních podkladů přeskočí a co k tomu
potřebují za prostředí.

**N14 se sem nevrací** — vyřešila ji už dávka 2: nebyla to chyba kódu, ale
zastaralé očekávání testu.

---

## v22.9.5 — 22. 9. 2026

### Dávka 4: tři serverové pojistky (#304, #305, #306)

Společné všem třem: pravidlo existovalo, ale server ho neuplatňoval — hlídal
ho prohlížeč, nastavení webu nebo obsah požadavku.

**Prázdná `ADMIN_EMAIL` tiše vypnula ochrany hlavního účtu (B54).** Všechny
jsou psané jako „e-mail se rovná hlavnímu"; proti prázdné hodnotě se
nerovná žádná skutečná adresa. Vedlejší správce tedy směl hlavnímu účtu
změnit roli, vypnout ho, smazat ho, resetovat heslo i přepsat podpis — a
nikde se nic neozvalo. Že to hlásí kontrola zdraví, je málo: hlášení si
někdo musí přečíst, kdežto oslabení platí hned. **Tahle větev v testech
nikdy neběžela**, protože CI i mutační běh proměnnou vždycky dosadí.

Nově se chráněné cesty neobsluhují (503 — chyba není u volajícího, ale
v nastavení webu): správa uživatelů a obnova ze zálohy. **Přihlášení
a změna vlastního hesla zůstávají funkční schválně** — bez nich by se
závada nedala opravit zevnitř.

**Pojistku zveřejnění ceníku šlo vypnout vynecháním pole (B55).** Shoda ČR
ceny se zahraniční odchylkou se porovnávala výhradně proti odchylkám
z téhož požadavku. Stačilo je neposlat a pojistka mlčky vypadla — přitom
takový podklad je nejpodezřelejší. Server přitom uložené odchylky zná
vždycky a prohlížeč proti nim porovnával odjakživa.

Porovnává se proti sloučení uložených a příchozích. Samotné sloučení by ale
**umělo ceník zamknout**: kdo ruší víc než pět odchylek naráz, by neprošel,
protože se pořád porovnává proti tomu, co ruší. Proto se nepočítá položka,
jejíž ČR cena se tímhle zveřejněním nemění — taková z přepnuté varianty
pocházet nemůže, v ceníku je už dnes.

**Číslo odeslané nabídky hlídal jen prohlížeč (B56).** Server u něj
kontroloval jen délku. U čísla je to zákeřné: číslo určuje jméno souboru,
takže se změněným číslem spadne zakázka pod jiné jméno, uložená verze
k porovnání neexistuje a **všechny kontroly zámku se přeskočí**. Odeslaná
nabídka tak mohla dostat jiné číslo, než jaké má zákazník na papíře.

Pozná se to ze zámku samotného — drží si číslo z okamžiku odeslání — takže
kontrola funguje i tam, kde není s čím porovnávat. Neshoda: administrátor
smí (rozhodnutí z 15. 9.), ostatním se to odmítne. Zámky pořízené dřív
razítko čísla nemají a přeskakují se.

**Mez, kterou to nezavře:** kdo si upraví klienta, přepíše číslo i razítko
najednou. Výsledek je ale nová zakázka pod novým jménem a původní soubor
zůstává nedotčený, takže se stopa neztrácí.

**Testy:** devět kontrol k B54, třináct k B55 (osm modelových, pět
serverových přes skutečnou cestu) a sedm k B56. U všech tří ověřeno, že bez
opravy padají. Tři nové mutace, celkem 133.

---

## v22.9.4 — 22. 9. 2026

### Dávka 3: čísla už odeslané nabídky šlo přepsat beze stopy (#303)

Jediný **vysoký** nález bezpečnostního auditu. Od 15. 9. si zámek varianty
ukládá **celý výsledek výpočtu** a všechny dokumenty i přehledy berou částky
odtud. Otisk zámku ho ale nezahrnoval.

Dvě varianty lišící se **pouze** ve zmrazeném výsledku měly tedy shodný
klíč, kontrola zámku vrátila „v pořádku" a serverová pojistka porovnávala
jen `data` — ta jsou shodná. Razítko „kdo" se u existujícího zámku záměrně
přeskakuje, takže se nezměnilo ani ono.

**Cesta zneužití:** obchodník si stáhne vlastní zakázku, v JSONu změní
jedině `varianty[i].zamek.vysledek.ock` a pošle ji zpět. Od té chvíle tisk
téže „neměnné" nabídky, krycí list i celý přehled ukazují jiné peníze, než
jaké dostal zákazník — **bez jediné stopy**, protože `tisky[]` ani
`odemceni[]` nepřibudou. Táž mezera byla v obnově ze zálohy.

Změřeno před opravou: cena v zámku **912 000 → 1**, klíč zámku **shodný**,
kontrola v pořádku, `data` shodná.

Do klíče zámku proto přibyl **celý zmrazený výsledek**. První verze opravy
tam dávala jen krátký otisk (FNV‑1a, 32 bitů), aby se nepracovalo s 25 kB
na variantu — jenže FNV není kryptografická funkce a její kód je v každé
vydané stránce, takže kdo chce částky přepsat, dopočítá si k nim výplň se
shodným otiskem. U kontroly, která má hlídat podvrh, je to málo. Přesné
porovnání skulinu nemá a je to totéž, čím se o řádek vedle porovnávají
`data` uzamčené varianty. Zaplatí se to jen při ukládání, ne při
vykreslování, a celá zakázka se u téhož uložení stejně serializuje.

**Obě cesty jsou pokryté naráz** — ukládání i obnova volají tutéž kontrolu,
takže stačilo opravit klíč. **Starší zakázky se nerozbily:** klíč se skládá
čerstvě pro obě strany porovnání, takže zámek bez zmrazeného výsledku dává
null proti null. Ověřeno vlastní kontrolou.

Pět serverových kontrol včetně pojistky proti prázdnému testu (podvrh se smí
lišit **výhradně** ve zmrazeném výsledku, jinak by ho zastavila jiná
kontrola a test by neměřil B53). Ověřeno, že bez opravy dvě z nich padají.
Plus mutace „zmrazený výsledek se bere, jak přijde".

---

## v22.9.3 — 22. 9. 2026

### Dávka 2: po F5 se ztrácela rozdělaná práce (#301, #302)

**N12 a N13 byla jedna chyba se dvěma projevy.** Po obnovení stránky se
vracel prázdný formulář, ačkoli zakázka ležela na serveru — a s ní se
„ztrácela" ruční přirážka 40 %, kterou obchodník viděl přepsanou na
firemních 0,42.

Návrat k poslední zakázce se ptal, jestli se zakázka liší od otisku
pořízeného **při startu stránky**. Jenže mezi startem a tím dotazem proběhne
přihlášení, a to do čerstvé zakázky samo nasype **platný ceník** a **matici
zobrazení**. Zakázka se tím od otisku liší vždycky — takže se návrat
neprovedl **nikdy**.

Změřeno po refreshi: rozdíl proti otisku byl `marze` 0 → 0,42,
`montazHodKc` 0 → 1234, zmizely značky `ukazkove`/`prazdny` a přibylo
`cenikRazitko`. Ani jedné z těch změn se uživatel nedotkl.

**Přirážka se přitom nikdy neztratila** — ověřeno dotazem na server, kde
ležela správně i se značkou „nastavil jsem si ji sám". Jen se k té zakázce
nikdo nevrátil.

**Táž příčina byla i o úroveň níž — a projevila se jako nestabilita.**
Otevření zakázky se na totéž ptá taky a otevře nad tím **dialog** „máte
neuložené změny". Obě automatické synchronizace přitom běží v jednom
`Promise.all`, takže záleželo na jejich pořadí: sada padala zhruba **jednou
ze tří**. To je nejhorší druh chyby — takovému testu lidé přestanou věřit.

Opraveno u kořene: ptáme se `ONLINE_STAV.zmenaUzivatele` místo otisku,
a otisk se srovnává až **po všech načteních**, takže na pořadí nezáleží.
Ověřeno pěti běhy po sobě. Ten
příznak je v souboru odjakživa a nastavují ho posluchače na `input`,
`change` a klik — tedy **události od člověka**, schválně ne `set()`, protože
„zakázkou hýbe i sama aplikace". Táž věta platí i pro návrat k zakázce.
Ochrana rozdělané práce zůstává: kdo do formuláře sáhl nebo si kliknutím
obnovil zálohu, má příznak nastavený.

**N14 nebyla chyba, ale zastaralé očekávání testu.** Kód se chová přesně
tak, jak to 21. 9. vědomě zavedla dávka P2: značka „ukázkový / prázdný
ceník" se smí srovnat i u uzamčené varianty, ale **jen když jí obsah
odporuje** — u opravdu prázdného ceníku zůstane. Test přepsán na skutečné
pravidlo a měří teď i to, co starou kontrolu znepokojovalo: že se ceny
uzamčené varianty nezmění a že se doklad o prázdném ceníku nepřepisuje.

---

## v22.9.2 — 22. 9. 2026

### Dávka 1: harnessy, které nikde neběžely (#299, #300)

**Dva harnessy od 14. 9. vůbec nenastartovaly.** `overit_sod.mjs`
a `overit_nabidka_proj_word.mjs` končily hned při načtení chybou
*Cannot access 'KOREN' before initialization* — `const KOREN` stálo až pod
prvním použitím. `import` se vytahuje nahoru sám, `const` ne. **Sedm kontrol
smluv o dílo a plné moci tím osm dní neběželo nikde**, ani lokálně, ani
v CI, protože v CI tyhle sady nebyly. Změřeno před opravou: oba skončily
kódem 1.

**Ani po opravě by se ale nespustily** — wordové šablony mají napevno cestu
z cizího prostředí. Vznikl proto `nastroje/harness_podklady.mjs`: podklady
mimo repozitář se hledají i v adresáři z proměnné `KNG_PODKLADY`, a když
nejsou, harness se přeskočí **s vysvětlením** a kódem 0.

Táž vada byla ve čtyřech dalších a dvě z nich by **shodily CI**:
`overit_manual.mjs` padal na ENOENT nad neexistující složkou,
`overit_sablony_online.mjs` četl šablonu bez kontroly, takže padal uprostřed
běhu po polovině kontrol. `overit_roadmapu.mjs` mířil na cizí `file://`
cestu. A `overit_sablona.mjs` hledal výhradně šablonu CN **v7, která už
neexistuje** — bere se nejdřív v8 a vypisuje se, která to byla; „prošlo" nad
starou šablonou totiž nejde odlišit od ověření.

**CI pouštělo 10 harnessů z 37 — nově všechny.** Právě ve zbylých dvaceti
sedmi vyšly nálezy N12, N13 a N14. Jádro opravy ale není *doplnit seznam*,
nýbrž **zrušit ho**: týž příběh se odehrál už 21. 9., kdy se dva ruční
seznamy srovnaly — a zůstaly ruční. Harnessy se proto berou **globem**, a to
v `spust_testy.sh --smoke` i ve workflow. Nový soubor je v sadě sám od sebe.

Job „harnessy" je pouští v jednom kroku se `::group::` na soubor, takže se
**pokračuje i po prvním selhání** a v logu je vidět všechno rozbité najednou.
Limit zvednut na 45 minut. Job „testy" si nechává jen kouřový test.

---

## v22.9.1 — 22. 9. 2026

### P11: rozdíl 5 vs 6 hodin u ATYP pojmenován a zajištěn testem (#298)

Vzorec je v obou cestách **týž**. Liší se **zdroj sazby**:

- **zaškrtnutí ATYP** (ruční i automatické) vezme sazbu z ceníku, a když ji
  ceník nemá, použije **náhradu ze sestavení**;
- **přepočet na platný ceník** při otevření zakázky vrátí u chybějící sazby
  `null` a hodiny **vůbec nepřepočítá**.

Jedna cesta tedy má záchrannou hodnotu a druhá ne. Změřená citlivost
zaokrouhlení (základ 24 h, hodiny navíc −3,25): sazba 0,30 → **6 h**,
sazba 0,25 → **5 h**. Hlášený rozdíl vznikne i při nezměněné geometrii.

**Nesjednotil jsem to** — dát přepočtu tutéž náhradu znamená začít
přepočítávat tam, kde se dosud nepřepočítávalo, a to hne cenou existujících
zakázek. Čeká na rozhodnutí. Rozdíl mezi cestami teď drží test, aby se
nezměnil nikým nepozorovaně.

`README_ZDROJAKY.md` přestal psát číslo verze natvrdo — stálo v něm
„v7.9.2", zatímco archiv byl o víc než sto dávek dál.

---

## v21.9.18 — 21. 9. 2026

### Rozhodnutí J. V.: plocha čelní stěny a překlad platebních podmínek (#295, #283)

**Čelní stěna se v režimu po stěnách počítá jako celá stěna mínus otvory
dveří a portálů.** Varianta (b) z #295. Vzorec není nový — přesně tak se už
počítá zadní stěna u průchozí šachty, takže obě strany s nástupišti se teď
počítají stejně. `sirkaDveri` už obsahuje rámy, takže „dveře a portály" jsou
v jednom čísle. **Standardní režim se tím nemění ani o haléř** — je to
samostatný základ, který platí jen v režimu po stěnách.

Tím padla dosavadní podmínka, že zapnutí režimu nesmí hnout cenou. **A hnula
oběma směry, což stojí za pozornost:**

- šachta **bez světlíků** → čelní stěna dosud vycházela na **0 m²**, teď má
  plochu, takže cena jde **nahoru** (to byl původní nález);
- **průchozí** šachta → cena jde **dolů**, změřeno −92 000 Kč u 16 z 32
  zkušebních zadání.

Ten druhý případ má vlastní příčinu: `svetlikM2` počítá světlíky ze **všech**
nástupišť včetně zadních, takže u průchozí šachty vyjde plocha světlíků
**větší než celá stěna** — změřeno 75,16 m² proti 37,9 m² skutečné stěny. Je
to táž vada předlohy, kvůli které umí ta plocha vyjít i záporně (nález N14).
Režim po stěnách ji nově nedědí; ve standardu zůstává. **Jestli se má opravit
i tam, je otázka — #296.**

**Do zahraničních nabídek se platební podmínky tisknou přeložené (#283).**
Kapitola III. brala hodnoty z krycího listu a ty šly slovníkem beze změny,
takže anglická nabídka měla nadpisy anglicky a hodnoty česky. Přeložila se
konečná sada předvyplněných hodnot — zálohy, dílčí i konečná faktura,
platnost nabídky, způsob fakturace, limit i sazby pokut. **Co obchodník
napíše ručně, projde beze změny**; vymýšlet překlad cizí věty se nesmí.

Zapsána dvě rozhodnutí bez zásahu do kódu: **terče a lišty** se zatím na typ
opláštění vázat nebudou (#287) a **sazba plechů pro interiérovou šachtu**
zůstává — je to aktualizace, ne zbytek po poškozeném ceníku (#297). Ověřeno
měřením, že **interiérová šachta se netmelí** — aplikace to tak už dělá.

---

## v21.9.17 — 21. 9. 2026

### Čelní stěna se v režimu po stěnách počítala za nulu (#294)

Nález J. V. ze snímku: stěna A vyšla na **3,36 m²**, zatímco B, C i D přes
38 m². Změřeno a potvrzeno — a příčina je horší, než vypadá.

Plocha se v režimu po stěnách bere z dosavadního výpočtu a pásy si ji dělí
poměrem výšek, aby zapnutí režimu nehnulo cenou. **U čelní stěny je ale tou
dosavadní plochou jen světlík nad dveřmi a po stranách** — zbytek zabírají
dveře a portály. Šachta bez světlíků má tedy plochu čelní stěny **nulovou**:
obchodník si vybere sklo přes celou stěnu, nákres mu ji vybarví celou,
specifikace ji zákazníkovi slíbí — a v ceně nebude ani koruna. Těch 3,36 m²
byla jen část pod úrovní nástupiště, tedy prohlubeň.

Změřeno: šachta bez světlíků, stěna A celá ze skla od −2 m do 23 m → **0 m²
nad nulou**, stěny B, C a D přes 40 m² každá.

**Obrazovka to teď řekne.** Varování pojmenuje, že se z té stěny do ceny
nedostane nic, a proč. Hlásí se až naposled — chybějící dělicí výška nebo
„jiné" bez sazby jsou konkrétní chyby, se kterými obchodník něco udělá hned,
kdežto tohle je vlastnost výpočtu, kterou sám nespraví.

**Čím plochu čelní stěny nahradit, je obchodní rozhodnutí** (kolik z ní
ukrojí dveře a portály), ne otázka pro kód — zapsáno jako **#295**. Dokud
nepadne, musí být aspoň vidět.

Při té příležitosti ověřeno měřením v prohlížeči, že **P12** (nová varianta
v režimu jen ke čtení nabídne odemčení místo mlčení) a **P15** (nová zakázka
shodí zámek čtení i vazbu na soubor) jsou hotové. P15 má nově test na řetěz,
na kterém stojí.

---

## v21.9.16 — 21. 9. 2026

### Opláštění: pořadí řádků, popisky — a místo, kde zadání přežije (#293)

**„Opláštění začíná" se přesunulo pod „+ přidat pás".** Je to spodní hrana
opláštění, takže nad pásy působilo, že se sloupec čte zdola nahoru a pak
zase shora dolů — a šel proti nákresu vedle sebe. Tlačítko zůstává hned pod
pásy, protože se týká jich.

**Popisky bez pomlčky, velkým písmenem:** `Pás 1` místo `— pás 1`. Totéž
u můstku (`Hloubka můstku`, `Šířka můstku`). Pomlčku dál nese jen
`— (jen exteriérová šachta)` u lemování — tam není popisek, ale hodnota ve
smyslu „neuplatní se".

**A hlavně: vzniklo `podklady/`.** Vizuál opláštění se dnes ztratil proto, že
byl popsaný jen v chatu — a chat se u dlouhého sezení shrnuje, takže zadání,
které žije jen tam, zanikne zákonitě. Co leží v repozitáři, se naopak čte
znovu na začátku každé práce. `podklady/OBRAZOVKA_OPLASTENI.md` je teď
závazný popis té obrazovky; `podklady/README.md` říká, kam co ukládat.

Dokument sám ale nestačí — **pojistkou je test.** `overit_oplasteni.mjs`
nově měří pořadí řádků i tvar popisků a je ověřeno, že při návratu ke staré
podobě spadne.

---

## v21.9.15 — 21. 9. 2026

### Pojistka, která se dá tiše vypnout, potřebuje vlastní test (#292)

Oprava z v21.9.13 — zveřejnění nesmí umazat ČR hodnotu, ze které dědí
zahraniční řada — sedí v `programZaznam` za `typeof` strážemi. **V prohlížeči
jsou ta jména globální vždycky, na serveru je skládá `jadro_moduly.cjs`:**
kdyby tam někdo změnil pořadí načítání nebo modul vynechal, stráž by prošla
a oprava by se **tiše vypnula**. Jádro by mělo dál zelené testy a chyba by
se vrátila jen serverovou cestou.

Ověřeno proti skutečné serverové funkci `/api/program`, že tou cestou
oprava opravdu platí (dosud to bylo jen doložené na jádře, ne na serveru),
a doplněna mutace — takže je ověřené i to, že by testy odstranění té
pojistky poznaly. Že test umí selhat, jsem změřil: s vypnutou opravou
padají dvě kontroly.

---

## v21.9.14 — 21. 9. 2026

### Hláška, která tvrdila nepravdu — a test, který ji nechytil (#291)

Dialog o přepočtu odmítne vrátit původní ceny, když se zakázka mezi
dotazem a odpovědí vymění. Odmítnout je správně, ale vysvětlení bylo
špatné: **stejná věta se ukazovala i uživateli, který si jen vzal krok
Zpět.** „Zpět" dosadí jiný objekt téže zakázky, takže se do téhle větve
dostane taky — a věta „Mezitím se otevřela jiná zakázka. Otevřete tu
původní znovu" mu tvrdí nepravdu a radí něco, co mu nepomůže. Dva různé
důvody teď mají dvě různé věty; odmítnutí platí v obou (vrácení snímku by
ten krok zpět tiše zahodilo).

**Kontrola v harnessu tu chybu nemohla odhalit, protože ji sama měla.** Za
„cizí zakázku" vydávala re-import **téže** zakázky — případ opravdu jiné
zakázky se tedy neměřil vůbec. Rozdělena na oba případy: jiné číslo → jiná
zakázka, stejné číslo → změnila se.

Nalezl závěrečný běh revize; zpřístupnila to dnešní oprava, která dialog
zavedla i k obnově zálohy z prohlížeče.

---

## v21.9.13 — 21. 9. 2026

### Třetí kolo revize — a regrese, kterou zavedla dnešní oprava (#290)

Revize dnešních oprav našla pět věcí. **Jednu z nich jsem zavedl dnes já,
a stála by obchodníka rozhodnutí podle čísla, které není pravda.**

**Dopad přepočtu na cenu počítal projekci i tam, kde se projekce nenabízí.**
Zakázka může být jen OCK, jen PROJ, nebo obojí. Ranní oprava přičítala
projekci vždy, takže každá zakázka „jen OCK" nesla fantomovou cenu projekce
z výchozího zadání. Horší než nafouknutá částka je ale druhý následek:
kdyby nová verze ceníku hnula **jen sazbou projektanta**, dialog by
u čistě ocelářské nabídky hlásil pohyb ceny, který se nestal — změřeno
**160 961 Kč při nezměněné nabízené ceně**. Obchodník by podle toho klikl
„Vrátit původní ceny" a vrátil si zastaralý ceník kvůli změně, která se ho
netýká. Počítá se teď jen strana, která jde do nabídky. Ve stejném místě:
když výpočet spadne, nezůstane v součtu půlka varianty (dřív vycházelo
`cena` z varianty hlášené jako chyba).

**Kopie zakázky dědila schválenou slevu i s razítkem schvalovatele.** Táž
úvaha jako u kvitance, ale s tvrdšími následky — změřeno na obou koncích:
obchodník duplikát **vůbec neuloží** (server vidí rozhodnutí jako nové a
odmítne ho, aniž by aplikace řekla proč), a vedoucí, který ho uloží, se
stane schvalovatelem slevy, kterou nikdy neviděl. Procenta a poznámka
zůstávají, zahazuje se jen rozhodnutí — nic se tiše neuplatní ani neztratí.

**Kopie dědila i číslo nabídky PROJ** (řada OVP). Je to identifikátor jiného
dokumentu a kontrola duplicit ho neodhalí — porovnává jen stranu OCK. Dvě
zakázky tak vystupovaly navenek pod týmž číslem.

**Zveřejnění ceníku umělo umazat cenu, která se dědí do zahraničí.**
Zahraniční řada je řídká tabulka odchylek: co v ní není, dědí se z ČR
sloupce. Varianta vedená v řadě ČR má ale takovou položku záměrně na nule —
a zveřejnění z ní tu nulu zapsalo do platného ceníku. Dokud odchylka
existuje, nepozná se nic; jakmile ji správce zruší v dobré víře, že se
hodnota zdědí, **zdědí se nula**. Opravit to v editoru nejde: ČR pole je
zašedlé „neplatí v ČR". Zveřejnění proto tu hodnotu přebírá z dosud platné
verze. Změna přes tabulku odchylek funguje dál.

**Obnova zálohy z prohlížeče se teď ptá stejně jako otevření ze složky.**
Dialog o přepočtu (#284) u ní chyběl — a přitom je to táž situace, spíš
horší: záloha mohla ležet od minulého ceníku.

Dva testy navíc byly prázdné a nic neměřily — kontrola „projekce se do
součtu započítá" procházela i bez projekce a „zahraniční řada cenu drží"
si hodnotu dosazovala ručně, takže skutečné zveřejnění jí neprocházelo.
Obojí přepsáno tak, aby měřilo.

---

## v21.9.12 — 21. 9. 2026

### Červené CI tří dávek za sebou — kontrola hledala slovo, ne protokol (#289)

Lokálně bylo zeleno, v CI červeno. **`./spust_testy.sh --smoke` pouštěl
jinou sadu prohlížečových harnessů než CI** — šest jich lokálně nikdy
neběželo. Tři dávky tak odešly s červeným CI, aniž by o tom kdokoli věděl.

Padalo `overit_lista.mjs`, kontrola „protokol se do dokumentů nedostane".
Ta procházela sestavená data výrazem `/protokol/i` — a **dnešní kapitola
V. TERMÍNY REALIZACE mluví v němčině o „Protokolle der Schachttüren"**,
tedy o předávacích protokolech šachetních dveří. Se záznamem o změnách to
nemá nic společného; kontrola padala na vlastním textu nabídky. Jediná
cesta, jak ji „spravit" beze změny kontroly, by byla přepsat větu, kterou
dostane zákazník.

**Žádná data neunikla** — ověřeno měřením: v dokumentech není klíč
`"protokol"`, není tam `protokolKlic` zakázky ani id jediného záznamu.

Kontrola teď hledá to, co ven opravdu nesmí: klíč struktury, klíč
protokolu, id záznamů a texty záznamů. Že umí selhat, je ověřeno — po
vložení id záznamu do textu kontrola zabere. Přibyla u ní pojistka proti
prázdnému měření (musí existovat aspoň jeden citlivý záznam). *Poctivá mez:
hodnoty kratší než čtyři znaky se nehledají — dvojciferná sazba se
v dokumentu plném čísel neodliší od běžného údaje.*

**A hlavně: `--smoke` teď pouští přesně to, co CI.** Seznam je v obou
souborech záměrně shodný a je to u něj napsané.

---

## v21.9.11 — 21. 9. 2026

### Druhé kolo nezávislé revize — sedm nálezů (#288)

Revize pokračovala i na dávkách v21.9.8–v21.9.10. Sedm nálezů: **dvě braly
peníze z ceny, jedna mohla přepsat cizí zakázku.**

**Položka „jen zahraniční" mizela z ceny OBOU řad.** Zahraniční ceník je
**řídká tabulka odchylek** — co v ní není, dědí se z českého sloupce.
Zveřejnění ale nulovalo český sloupec u každé takové položky bez ohledu na
to, jestli odchylka existuje. Změřeno: bez odchylky vyjde `cr → 0` a
zveřejněný ceník pak dá i `zahr → 0`. Nově se nuluje jen tam, kde
zahraniční cena opravdu je. *Očekávání v `test_jen_zahranicni.js` se proto
změnilo — dřív se nulování vyžadovalo vždy; to bylo špatně.*

**Dialog přepočtu mohl obnovit zálohu do jiné zakázky.** Volba „vrátit
zálohu" se držela v modulové proměnné, takže mezi otevřením dialogu a
kliknutím stačilo přepnout zakázku a záloha se zapsala jinam. Identita
zakázky i zálohy se teď zachytí **před** čekáním na odpověď a při neshodě
se obnova odmítne s hláškou. `importZakazka` je navíc v try/catch — dřív
by selhání zůstalo tiché.

**Dialog tvrdil „na celkovou cenu to nemělo vliv" i tam, kde měl.** Součet
dopadu počítal jen OCK, přestože přepočet mění i ceník projekce. U zakázky,
kde se hnula jen PROJ, dostal obchodník falešné ujištění — a to je horší
než mlčení.

**Kopie zakázky si brala protokol a kvitanci ceníku originálu.** Vypadala
tak, že u ní někdo odsouhlasil ceník a že má za sebou historii, kterou
nemá. Duplikace teď protokol i kvitanci zahazuje.

**Jazykové symboly kapitol nesly do Wordu značku `{FIRMA}`.** Formulář
v Nastavení nabízí `{{FIRMA_NAB_DOLOZKY_DE}}`, ale vydával se syrový text
pole — v dokumentu pak stálo „…von {FIRMA} weitergegeben…". Jazykové
symboly se nově prohánějí přes stejné zpracování jako české.

**Německá doložka vynechávala „die Eigentums-".** Z věty zmizelo vyhrazení
**vlastnického** práva a zůstalo jen autorské. Srovnáno se zdrojovým
dokumentem.

**Přehled rozdílů mezi řadami hlásil rozdíly, které nejsou.** Do porovnání
šel celý objekt databáze místo platného ceníku. Změřeno 1 → 0.

Testy: `test_jen_zahranicni.js` (20), `test_cenik_dopad.js` (17),
`test_zakazka_duplikace.js` (29), `test_nabidka_kapitoly.js` (99),
`overit_prepocet_dialog.mjs` (27). Celkem 120 sad zeleně.

---

## v21.9.10 — 21. 9. 2026

### Opravy z nezávislé revize dnešních změn (#286)

Revizi dnešních úprav dělal jiný model (Fable 5.1) se zadáním „hledej
skutečné chyby, ne stylistiku". Našel šest věcí, které stojí za opravu —
**a jednu z nich jsem zavedl dnes já**.

**Zaškrtnutí „po celé výšce" zpět smazalo ruční název i sazbu u typu
„jiné".** Dopolední oprava zaškrtávátka zakládala nový pás holý
(`{ typ, doM }`), a protože se při slučování bere **první** pás, dvě
kliknutí stěnu tiše zlevnila na nulu — v kalkulaci zůstal řádek „JINÉ" za
0 Kč. Nově se kopíruje celý pás; totéž u tlačítka „+ přidat pás".

**Technická specifikace tiskla větu o rozsahu opláštění česky i v EN/DE/FR.**
`techspec_ui.js` volal `tsHodnota` **bez jazyka**, takže se nová cesta
z dnešní dávky uplatnila jen v nabídce, ne ve specifikaci. Ta věta se navíc
objevovala v exportu „chybějící překlady", přestože přeložená je.

**Text na kartě sliboval, co kód nedělá.** Stálo tam „Terče a lišty se
počítají jen z pásů se sklem" — změřeno: u čtyř stěn ze skla, z Cetrisu
i „bez" vyjde řádek TERČE/LIŠTY **stejně**. Slib v obrazovce, který kód
neplní, je horší než mlčení. Text opraven; jestli se terče a lišty **mají**
vázat na sklo, je otázka na J. V. (#287).

**Dvě stěny „jiné" se stejným názvem a různou sazbou se slily do jedné
sazby.** Klíč byl jen název, sazba se brala z prvního pásu — druhá stěna se
spočítala za cenu té první, tiše a bez stopy. Klíč nově nese i sazbu.
**Tohle některým zakázkám cenu zvedne — na správnou.**

**Chyběla varování u zadání, které výpočet mlčky spolkne:** dolní mez nad
horní hranou stěny (stěna z ceny zmizí celá), dolní mez pod dnem prohlubně
(počítá se plocha, která neexistuje), dělicí výška nad horní hranou (pásy
nad ní zmizí, ale specifikace je zákazníkovi dál slibuje) a typ „jiné" bez
sazby.

**Nákres si ořezával spodní pás.** Minimum 2 px na pás přeteklo pruh
s `overflow:hidden`. Výška pruhu se nově počítá ze **skutečných** výšek pásů
a kóty se umisťují podle nich, ne lineárním přepočtem z metrů.

Sada `overit_oplasteni.mjs` narostla na **46 kontrol**.

### Ověření

120 sad prošlo / 0 selhalo (1 přeskočena).

---

## v21.9.9 — 21. 9. 2026

### P5 — tichý přepočet na dnešní ceník má konečně dialog (#284)

*Nálezy N7 a N22*

Rozpracovaná zakázka se po otevření přepočítá na platný ceník — to je
správně, staré ceny v ní nejsou doklad, ale past. Dělo se to ale **potichu**:
do lišty se napsala věta, kterou je snadné přehlédnout, a hlavně neříkala to
podstatné. **„12 změněných položek" může znamenat stokorunu i sto tisíc.**

Nově se otevře dialog, který řekne:

- na kterou **verzi ceníku** se přepočítalo,
- **kolik cen** se změnilo,
- a hlavně **o kolik se hnula cena nabídky** — v korunách, před i po.

A nabídne **vrácení původních cen**. Bez toho je to jen hlášení hotové věci.
Vrací se ze zálohy pořízené *před* přepočtem; dopočítávat staré ceny zpětně
by znamenalo druhý výpočet, který by se s tím prvním mohl rozejít.

Nabídka vrátit je **jednorázová** — příště se zakázka zeptá znovu, protože
se tím nic trvalého nerozhodlo. Dialog proto sám ukáže na trvalé řešení:
potvrdit u varianty „ceny jsou dohodnuté".

**Escape a klik mimo znamenají „nic nedělej", tedy ponechat přepočet.**
Zavřít okno je útěk z dialogu, ne rozhodnutí — kdyby Escape vracel ceny,
ztratil by obchodník přepočet, o kterém se ještě nerozhodl.

Po vrácení se obnoví i otisky pro autosave. Bez toho by první klik kamkoli
uložil zakázku s cenami, které uživatel právě odmítl (týž mechanismus jako
nález V35).

Nové sady: `src/test_cenik_dopad.js` (13 kontrol na součet cen) a
`overit_prepocet_dialog.mjs` (21 kontrol v prohlížeči — text dialogu, obě
tlačítka, Escape i to, že se bez změn neotevře vůbec).

### Ověření

120 sad prošlo / 0 selhalo (1 přeskočena).

---

## v21.9.8 — 21. 9. 2026

### P7 — nabídka končila cenou, chyběly čtyři kapitoly (#282)

*Nálezy N15 a N16; mail D. Sikory: „nám tam schází úplně — platební
podmínky, požadavky na provedení realizace, termíny realizace, předání
díla."*

Wordová šablona ty kapitoly měla, aplikace ne — dokument z aplikace se tedy
s tím, co zákazník dostal, neshodoval. Nově se tisknou všechny čtyři
a k nim závěrečné doložky (oprava zjevných chyb, autorská práva).

**Dva zdroje, záměrně různé:**

- **III. PLATEBNÍ PODMÍNKY se skládá z údajů zakázky** — zálohy, splatnost,
  platnost nabídky a způsob fakturace už v krycím listu jsou. Druhý opis
  týchž vět by se dřív nebo později rozešel s tím, co obchodník nastavil.
- **IV., V., VI. a doložky jsou firemní standard** (Nastavení → Smlouvy
  / Šablony → *Kapitoly nabídky III.–VI.*). Jeden řádek = jedna odrážka.

**Každý jazyk má vlastní pole.** Smluvní podmínky se nepřekládají strojově —
totéž pravidlo jako u cen: co nikdo nenapsal, si aplikace nevymyslí. Výchozí
znění v češtině, angličtině a němčině je převzaté z nabídek dodaných J. V.
Nevyplněný jazyk se z nabídky **vypustí i s nadpisem**; francouzština se
podle rozhodnutí zatím neřeší a vytiskne češtinu **s viditelným
upozorněním** — tiché vytištění češtiny cizímu zákazníkovi je horší, protože
se to nikdo nedozví.

Název firmy v doložce o autorských právech zastupuje značka `{FIRMA}`:
firemní údaje jsou v repozitáři schválně ukázkové a skutečné bydlí mimo něj.

Nová sada `src/test_nabidka_kapitoly.js` (**72 kontrol**) hlídá i to, že
všechny tři jazyky mají u každé kapitoly **stejný počet odrážek** — jinak
by se někde při přepisu ztratil řádek a cizí zákazník by dostal kratší
podmínky než český.

**Při psaní testů se našla chyba v mé vlastní logice:** prázdné pole
a nedodaný jazyk byly jedním příznakem, takže prázdná *česká* kapitola
hlásila „překlad nebyl dodán". Jsou to dvě různé věci a teď je rozlišuje
`prazdne` / `jazykChybi`.

### Ověření

118 sad prošlo / 0 selhalo (1 přeskočena).

---

## v21.9.7 — 21. 9. 2026

### Nákres stěny u opláštění po stěnách (#281)

Zadání J. V. po prvním proklikání: *„kalkulace opláštění postrádá
vizualizaci, takhle je to nepřehledné."* Tabulka pásů řekne, co je zadané —
neřekne, jak stěna **vypadá**. Čtyři stěny po dvou pásech si člověk musí
v hlavě skládat a záporná dolní mez v prohlubni se z čísel nepozná vůbec.

U každé stěny proto stojí **schematický nákres**:

- svislý pruh rozdělený na pásy **v poměru skutečných výšek**,
- **barva podle typu** opláštění, název materiálu v pásu,
- **kóty** u horní hrany, každého rozhraní pásů i dolní meze,
- **čárkovaná čára úrovně nástupu (0 m)**, takže je vidět, co sahá do
  prohlubně; záporné kóty jsou hnědé,
- `bez — dodá stavba` je **šrafa, ne barva** — není to materiál,
- pod nákresem **plocha stěny**, nebo výslovné **„bez plochy k opláštění"**.

Pod kartou přibyla **legenda s plochami podle typu** a celkovou plochou —
tatáž čísla, která jdou do kalkulace.

**Nákres kreslí pásy, které spočítalo jádro** (`r.oplasteni.pasy`, nově se
vydávají z `vypocet()`), ne vlastní přepočet zadání. Jádro dělicí výšku
ořezává a plochu pod nulou bere jinak než nad ní; obrázek, který by si to
počítal po svém, by při první změně pravidel ukazoval něco jiného, než
z čeho vyšla cena.

**Proč je ta plocha pod nákresem důležitá:** čelní stěna nese dveřní
portály, takže její plocha k opláštění jsou jen světlíky nad dveřmi — a bez
nich vyjde **nula**. Barevné pásy by pak slibovaly materiál, za který se nic
nepočítá. S číslem je to na první pohled vidět.

Sada `overit_oplasteni.mjs` narostla na **36 kontrol**; ověřeno negativně —
bez nákresu jich 7 padá. Kontroly měří skutečné rozměry vykreslených prvků
(poměry výšek pruhů proti výškám pásů), ne přítomnost tříd.

Mimochodem: první pokus měl u výpočtu zálohu přes `vypocet()`, která by
obcházela zámek odeslané nabídky. **Chytil to `test_zamek_otisk.js`** dřív,
než se to stihlo dostat do commitu.

### Ověření

117 sad prošlo / 0 selhalo (1 přeskočena).

---

## v21.9.6 — 21. 9. 2026

### P9 — nabídka si u soklu prohlubně odporovala (#279, nález N17)

Oprava z 16. 9. znala u oplechování soklu jen dva stavy: v základní ceně →
sekce *Doplňkové konstrukce*, jinak → „není součástí nabídky". Jenže **od
16. 9. se sokl nabízí i mezi příplatky** a ty se do nabídky dávají všechny,
dokud je obchodník ve sloupci „Nabídka" nevyřadí.

Výchozí exteriérová nabídka proto zákazníkovi tvrdila **obojí naráz**:
kapitola II. mu sokl nabízela za cenu a tabulka specifikace u téhož řádku
psala „není součástí nabídky".

Třetí stav má nově vlastní větu — **„nabízeno jako příplatek"** (přeloženo do
EN/DE/FR). Řádek zůstává v sekci *Součástí dodávky není*, protože v základní
ceně opravdu není, ale místo popření odkazuje na příplatek. Rozhoduje týž
seznam, ze kterého se sází kapitola II., takže se obě místa nemůžou rozejít.

Dvě sady musely změnit očekávání, protože stará věta byla nepravdivá:
`test_nabidka.js` a `test_docx_preklad.js`. U druhé se navíc zkouška
zpevnila — místo hledání konkrétních anglických slov se ověřuje, že hodnota
prochází slovníkem.

### P6 — migrace stříšky: nález se nereprodukuje, ale chyběl test (#280)

N10 hlásí, že staré zakázky nesou obě položky stříšky naráz a počítají ji
dvakrát. **Na dnešním kódu se to nereprodukuje** — migrace z #240
(`zakazka.js`) dosadí starší zakázce přesně jeden kus a ve výpočtu stojí
řádek právě jednou. Ověřeno i to nejpodezřelejší: **idempotence**, tedy že
pětinásobné načtení zakázky (ze serveru, z historie kroků, ze souboru) nedá
pět stříšek.

Skutečná díra byla jinde: **migrace neměla jedinou kontrolu**. Je to přesně
ten druh kódu, který se rozbije nepozorovaně — běží jen nad starými daty,
která nikdo v testech nemá, a pozná se to až na ceně u zákazníka. Nová sada
`src/test_migrace_striska.js` (14 kontrol) správné chování přibíjí, včetně
toho, že ručně zadaná nula ani dvojka se migrací nepřepíše.

### Adresa testovacího webu v dokumentaci

Návod uváděl `engscalc-test.netlify.app`; skutečná adresa je
**`testengscalc.netlify.app`** — `test` jako předpona. Kvůli tomu se marně
hledalo `/api/zdravi`.

### Ověření

117 sad prošlo / 0 selhalo (1 přeskočena).

---

## v21.9.5 — 21. 9. 2026

### Opláštění po stěnách: dvě chyby z prvního proklikání (#276)

J. V. zapnul režim po stěnách na testovacím webu a narazil na obojí hned:

- **Zaškrtávátko „po celé výšce" nešlo odškrtnout**, takže stěnu nebylo jak
  rozdělit na pásy — celá funkce po stěnách byla nedostupná. „Po celé výšce"
  je **odvozený** stav (dolní mez 0, jediný pás až nahoru), ne příznak
  v datech. Odškrtnutí ale pásy jen přepsalo zase na jeden jediný, takže se
  ze stejných dat odvodilo znovu „po celé výšce" a zaškrtávátko se okamžitě
  vrátilo. Nově odškrtnutí stěnu **opravdu rozdělí**: přidá druhý pás stejně
  jako tlačítko „+ přidat pás". Dělicí výška zůstává prázdná a obrazovka
  rovnou řekne, že ji má obchodník vyplnit.
- **Vizuál se rozsypal.** `.inputs .card .body` je mřížka
  `repeat(auto-fill, minmax(300px,1fr))`, která sází do sloupců **každý
  `.row` zvlášť** — hlavičky čtyř stěn tedy stály vedle sebe v ~290px
  sloupcích, popisek „Stěna A — čelní stěna" se lámal do svislého proužku
  a „po celé výšce" se trhalo na dva kusy. Po rozdělení stěny na pásy by se
  navíc hlavička, dolní mez a pásy rozletěly do různých sloupců a vedle sebe
  by stály pásy různých stěn. Stěna je nově **jeden blok** ve vlastní mřížce
  (`.opl-steny` / `.opl-stena`), dva sloupce na širokém okně, jeden pod
  1100 px.

**Nová sada `overit_oplasteni.mjs` (23 kontrol) v prohlížeči.** Jádro obě
chyby vidět nemohlo — `src/test_oplasteni_zapnuti.js` hlídá, že zapnutí
režimu nehne cenou, a to platilo dál. Obojí bylo čistě v obrazovce. Sada je
zapojená do `spust_testy.sh --smoke` i do CI.

Ověřeno i **negativně**: nad neopraveným kódem sada padá (5 kontrol na
rozložení, 4 na zaškrtávátko), takže nehlídá naprázdno.

### Ověření

116 sad prošlo / 0 selhalo (1 přeskočena), včetně prohlížečových.

---

## v21.9.4 — 21. 9. 2026

### Opláštění po stěnách — obrazovka, specifikace a překlady (#268, 3. krok)

Výpočet, typy i kontrola standardu přišly dvěma dávkami 18. 9. 2026. Chyběla
**obrazovka** — režim se dal zapnout jedině ruční úpravou JSON, takže ho
obchodník neměl jak použít a kód ležel v aplikaci nečinně.

- **Přepínač „Opláštění"** v Zadání šachty (jednotné / po stěnách A–D).
  Karta se stěnami se kreslí **až po přepnutí**; ve standardním režimu
  obchodník o čtyřech stěnách vůbec neví.
- **Řádek stěny:** typ · „po celé výšce" · dolní mez · pásy. Zaškrtnuté „po
  celé výšce" schová rozsah i pásy — většina stěn je celá stejná.
- **Pásy** se přidávají a odebírají po jednom, bez umělého stropu. Ukládá se
  **dělicí výška**, ne dva nezávislé rozsahy, takže překryv ani mezera nejdou
  zapsat. Úsek, který se oplášťovat nemá, se zadá jako pás **„bez — dodá
  stavba"**; zůstane tak vidět, že se na to myslelo.
- **Záporná dolní mez** sahá do prohlubně. **„Jiné"** dovolí napsat název
  a náklad za m² rovnou do zadání.
- **Varování**, když dělicí výška chybí nebo neroste. Výpočet takový pás
  přeskočí — ale mlčky, a tiché přeskočení se pozná až u zákazníka.
- **Technická specifikace** nově popisuje rozsah opláštění po stěnách
  (řádek ROZSAH OPLÁŠTĚNÍ), a to **ve všech čtyřech jazycích**. Věta se
  skládá z proměnlivého počtu kusů, takže ji slovník nemůže trefit celou —
  `tsOplasteniRozsah` ji proto staví rovnou v cílovém jazyce a tisk přes ni
  nepouští `tr()` podruhé.
- Výchozí podobu stěn skládá **jádro** (`oplasteniStenyVychozi`), ne
  obrazovka. Jedině tak platí slib dávky #268, že **zapnutí režimu beze změny
  zadání nehne cenou** — doloženo na 32 zadáních napříč typem šachty,
  zasklením, průchozí šachtou, prohlubní i ATYP.

Nová sada: `src/test_oplasteni_zapnuti.js` (31 kontrol).

### Rozhodnutí J. V. k opláštění (21. 9. 2026)

Obě otázky, které u #268 zůstávaly otevřené, jsou zodpovězené — a obě
**potvrzují dnešní stav**, takže se nic nepřepočítává:

- Sazby **práce a tmelení** se počítají **po celé ploše** bez ohledu na typ
  opláštění.
- U **dělicí výšky**, která nepadne na rozteč příčníků, se počítá **skutečná
  plocha**, ne celá tabule.

Obojí si J. V. vyhradil k pozdější úpravě. Zapsáno do roadmapy (#275), aby se
o tom podruhé nespekulovalo.

### Testy k P1–P3: tři díry, které samy testy neukázaly

Kontrola po dokončení P1–P4 — otázka zněla, jestli oprava ceníku opravdu
nemůže znovu propadnout. Našly se **tři místa, kde se opravené chování
nehlídalo vůbec**, a jedno, kde se hlídalo jen naoko:

- **Serverová pojistka P1 neměla test.** Zákaz zveřejnit ceník z varianty
  přepnuté na Zahraničí byl v `netlify/functions/program.mjs`, ale žádná
  sada ho nevolala. Doplněno 8 kontrol na konec `netlify/test_funkce.mjs`
  (203 prošlo / 0 selhalo).
- **Zámek jen ke čtení neměl kontrolu v prohlížeči.** `overit_online.mjs`
  nově ověřuje, že tlačítka „nová varianta" a „kopie" v režimu čtení
  **nejsou mrtvá** a řeknou, co udělají — přesně ta chyba, která se u P3
  jednou už stala (135/0 → **140/0**).
- **Žádná z oprav P1–P3 neměla mutaci.** Doplněno 5 mutací do
  `netlify/mutace.mjs`.

**A pak mutace odhalila čtvrtou, nepříjemnější věc.** Ze 128 mutací zůstala
jediná nechycená: „klíče řady se zapíšou do platného ceníku". Test na to
existoval — jenže ověřoval čištění nad **čistým zkušebním ceníkem, který
`rada` ani `jenZahr` vůbec neobsahoval**. Čištění nemělo co odebrat, takže
kontrola prošla i s vypnutým čištěním. Test, který platí vždycky, je horší
než žádný: tvářil se, že hlídá přesně tu chybu z v27. Podklad teď klíče
skutečně nese (tak, jak je do něj přidá `cenikSlozRadu` u každé varianty)
a k tomu stojí kontrola, že je tam opravdu má. Mutace je po opravě chycená.

Navíc: `netlify/mutace.mjs` si doplní `ADMIN_EMAIL` sám, stejně jako to už
umí `spust_testy.sh`. Bez něj se ručně spuštěný běh zastavil hned na „sady
nejsou zelené ani bez mutace" a vypadalo to jako rozbitý kód.

### Ověření

115 sad prošlo / 0 selhalo (1 přeskočena), včetně prohlížečových. Harnessy:
`overit_lista` 268/0, `overit_atyp` 57/0, `overit_zobrazeni` 121/0,
`overit_ock_cela_cesta` 42/0, `overit_vypnuty_radek` 21/0,
`overit_online` 140/0, kouřový test 50/0.

Mutační testování serveru: **127 z 128 chycených**; jediná nechycená byla ta
popsaná výše. Po opravě testu je chycená i ona — ověřeno cíleným během
`node netlify/mutace.mjs "klíče řady"` (1 z 1).

---

## v21.9.3 — 21. 9. 2026

### P4 — Položky „jen pro zahraničí" už nezdražují české zakázky

*Nález N6*

- **Příčina byla v pořadí, ne ve filtru.** Základ **přirážky za ATYP** se
  počítal z celého pole `rezie`, a to o pár řádků **nad** filtrem, který
  skryté a vyřazené položky odstraňuje. Řádek PŘEKLADY CZ→DE se v tuzemské
  kalkulaci správně neukázal, ale jeho cena přesto vstupovala do přirážky —
  a přes ni ještě jednou do rezervy. Po otevření zakázky a přepočtu „na
  ceník, který platí dnes" cena vyskočila, aniž by přibyl jediný viditelný
  řádek.
- Základ přirážky nově bere `jenPocitane(rezie)`, tedy přesně ty řádky,
  které jdou do součtu. **Týká se to i ručně vyřazených položek**
  (`nepocitat`) — ty přirážku nafukovaly úplně stejně.
- **V tuzemské řadě taková položka nemá cenu.** Obě funkce, které skládají
  ceník pro danou řadu (`cenikSlozRadu`, `cenikDnesniProRadu`), ji nulují.
  Protože nulují obě, nemá přepočet při otevření zakázky co hlásit.
- Sjednoceny dva zdroje pravdy: značky `jenZahr` od administrátora a pevný
  seznam `CENIK_JEN_ZAHR`. Jádro je spojovalo, skládání řady znalo jen
  značky — a z té nerovnosti nález plynul.
- **V editoru ceníku je tuzemské pole u takové položky zašedlé** („neplatí
  v ČR"). Vadná hodnota ve verzi 27 se tam dala prostě napsat.

**Ceny některých zakázek se tím MĚNÍ — vždy dolů.** Týká se to tuzemských
zakázek se zaškrtnutým ATYP, které měly buď položku „jen zahraniční"
s vyplněnou ČR cenou, nebo ručně vyřazený řádek v režii. Uzamčené nabídky
se nepřepočítávají, ale jejich cena se v aplikaci zobrazuje z dat — u takové
nabídky proto bude nově nižší než na vytištěném PDF, které odešlo
zákazníkovi. Rozhodující je PDF; aplikace teď ukazuje, kolik ta nabídka měla
stát.

Nová sada: `src/test_jen_zahranicni.js` (17 kontrol).

### Ověření

112 sad prošlo / 0 selhalo (1 přeskočena), s `--smoke` 114. Harnessy:
`overit_lista` 268/0, `overit_atyp` 57/0, `overit_zobrazeni` 121/0,
`overit_ock_cela_cesta` 42/0, `overit_vypnuty_radek` 21/0,
`overit_online` 135/0.

---

## v21.9.2 — 21. 9. 2026

Opravy z **kola 6** testování (zakázky CN-0383 a CN-0377/377), priorita 1.
Vyhodnocení testů je ve sešitu na Drive; konkrétní sazby do repozitáře
nepatří.

### P1 — Ceník: zahraniční ceny se nedostanou do tuzemské řady

*Nálezy N1, N20, N6 (částečně)*

- **Zveřejnění ceníku z varianty přepnuté na řadu Zahraničí je zakázané.**
  Takhle vznikl vadný platný ceník verze 27, který měl u čtrnácti položek
  v ČR sloupci zahraniční hodnoty. Hlídá to aplikace i server — dialog jde
  obejít, server ne.
- **Druhá pojistka:** shoduje-li se ČR cena se zahraniční odchylkou u více
  než pěti položek, zveřejnění se zastaví a položky se vypíšou. Chytí
  i podklad, ze kterého někdo značku řady odstranil.
- **Klíče `rada` a `jenZahr`** se do zveřejněného ceníku nezapisují.
  U varianty je pokaždé znovu složí `cenikSlozRadu`.
- **Dialog zveřejnění** ukazuje řadu varianty a rozdíly **zvlášť pro ČR
  a zvlášť pro ZAHR**. Dřív to bylo jedno číslo, ve kterém tahle chyba
  nebyla vidět.
- **Historie verzí** nese počty změn proti předchozí verzi (ČR / ZAHR).
- **Falešné varování „do souboru někdo sáhl ručně" zmizelo.** Vzorec otisku
  se dvakrát změnil (#181, #267), takže varování svítilo u všech 27 verzí
  a přestalo něco znamenat. Každá verze si nově pamatuje verzi vzorce
  a porovnává se jen se shodnou; skutečný ruční zásah se pozná dál.
- Postup k vydání opravené verze 28: `POSTUP_CENIK_V28_2026-09-21.md`.
  **Ceník sami nezveřejňujeme.**

Nová sada: `src/test_cenik_zverejneni.js` (26 kontrol).

### P2 — Značky ukázkového a prázdného ceníku

*Nálezy N2, N3*

- **Příčina:** server při uložení zakázky doplňoval chybějící klíče ceníku
  z `DEFAULT_CENIK` ze sestavení, které je pro GitHub vynulované a nese
  `ukazkove: true` i `prazdny: true`. Vtisklo je to do každé varianty, i když
  je klient neposlal. U uzamčených variant, které se při otevření
  nepřepočítávají, tam zůstaly napořád — červená lišta „Ceník není nahraný"
  a **vypnutý tisk nabídky u ostrých zakázek 0383 a 377**.
- `cenikDoplnKlice` značky ze vzoru **nedoplňuje** (jedno místo pro klienta
  i server). Chybějící ceny doplňuje dál — nález V38 platí.
- Server **odstraňuje značky před zápisem**, a to i z kopie uložené zakázky,
  kterou drží jen pro porovnání. Jinak by kontrola „nesmí se změnit data
  uzamčené nabídky" odmítla legitimní uložení.
- Aplikace si značku **srovná podle skutečného obsahu i u uzamčené varianty**
  — bez přepočtu cen. Nenulové ceny dokazují, že ceník prázdný není.
  Záměrně jen odebírá, nikdy nepřidává.
- Hromadná náprava starších zakázek: `nastroje/migrace_znacky.mjs`
  (náhled → potvrzení → zápis, nic nemaže, zapisuje do protokolu zakázky).

Nová sada: `src/test_ukazkove_znacky.js` (24 kontrol) + serverové kontroly
v `netlify/test_funkce.mjs`.

### P3 — Zámek „jen ke čtení" nesmí tiše zahazovat práci

*Nálezy N4, N5*

- **„+ Nová varianta" a kopie ⧉** v zakázce otevřené jen ke čtení variantu
  vyrobily, ale neměl ji kdo uložit — po `Ctrl+F5` byla pryč. Obojí teď
  nabídne odemknutí.
- **Tlačítko uložení** v tomhle stavu nic nezapsalo a vysvětlení šlo jen do
  karty Databáze. Nově se jmenuje **„🔒 Odemknout a uložit"** a nabídne
  odemknutí.
- **Odmítnutí dialogu vrátí pole**, aby na obrazovce nezůstala hodnota,
  která v datech není.
- **Stav „jen ke čtení" má výrazný štítek v liště** nad kalkulací (jantarový;
  červená už znamená odeslanou nabídku — dvě různé věci nesmějí mít stejnou
  barvu).
- **Nová akce „Duplikovat jako novou zakázku"** v Přehledu. Kopíruje
  hlavičku, zadání a ceníky; **nekopíruje** zámky, doklady o odemčení,
  poznámky ani přílohy a nedědí identitu uložené předlohy. Dřív na to nebyla
  cesta a lidé si starou zakázku přepisovali.

Nová sada: `src/test_zakazka_duplikace.js` (23 kontrol).

### Opraveno při práci na dávce

- **Aplikace se vůbec nespouštěla.** Seznam `CENIK_NEDOPLNOVAT` v `engine.js`
  sahal na konstanty z `ukazkove.js`, který v sestaveném souboru stojí až za
  ním — odkaz padl do dočasné mrtvé zóny a výjimka ukončila vyhodnocení
  celého skriptu. `typeof` před tím nechrání: u proměnné v TDZ hází taky.
  Chytil to kouřový test v prohlížeči.

- **Tlačítko uložení bylo v režimu čtení mrtvé, ne jen špatně pojmenované.**
  Lišta „Zakázka a varianta" dává v režimu čtení všem tlačítkům
  `pointer-events:none` kromě těch se značkou `cteni-ok` — a tlačítko
  uložení ji nemělo. Přejmenování samo by nepomohlo, dialog by se neměl jak
  otevřít. Odhalil to `overit_online.mjs` v CI; jeho očekávání „tlačítko je
  nedostupné" se změnilo na „je klikatelné a říká, co se stane" — nedostupné
  tlačítko není vysvětlení. Zápis dál hlídá `zamekCteniStop()`.
- **`spust_testy.sh --smoke` nově pouští i `overit_online.mjs`** (pokyn
  J. V.): dvě chyby této dávky chytil až prohlížeč v CI. Skript si zároveň
  sám doplní smyšlený `ADMIN_EMAIL`, když v prostředí chybí — stejně jako
  CI; bez něj serverové sady padaly na „Nepřihlášen" a vypadalo to jako
  rozbitý kód.

### Ověření

111 testovacích sad prošlo, 0 selhalo (1 přeskočena — `test.js` potřebuje
skutečný ceník mimo repozitář); s `--smoke` 113. Kouřový test 50/0,
`overit_online` 135/0. Prohlížečové harnessy: `overit_lista` 268/0,
`overit_zobrazeni` 121/0, `overit_ock_cela_cesta` 42/0,
`overit_vypnuty_radek` 21/0.

---

## v21.9.1 — 21. 9. 2026

- Kouřový test si držel starý výchozí model výpočtu a shazoval CI sedm běhů
  po sobě. Při opravě vyšlo najevo, že testu podstrkované řetězce
  `'fix'`/`'compat'` nikdy nic nepřepnuly (`fixes` je boolean), takže se
  varovná větev štítku režimu za celou dobu ani jednou neproběhla.
