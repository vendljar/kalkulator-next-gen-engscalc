---
name: testovaci-procedura-kng
description: Testovací procedura aplikace Kalkulator Next Gen (ENGINEERS CZ, testengscalc / engscalc) — stupně kol (automat po dávce, cílená sada, plné kolo), porovnání sestavení, kolo main-před × main-po, zkoušky v testovacím rozhraní, STAV kola v podklady/kola a bezpečnostní audit kódu. Použij, když se má spustit „testovací kolo", „kolo NN", „cílená sada", „plné kolo", „bezpečnostní audit", „zkouška na testu", nebo zapsat STAV kola či testovací protokol. Komunikace vždy česky.
---
# Testovací procedura — Kalkulator Next Gen (stav 19. 11. 2026)

Cíl: ověřit, že dávka nebo verze dělá, co má, a nic jiného — ceny, dokumenty,
práva a data. Pravidla v `CLAUDE.md` (oddíl Testy) mají přednost; tenhle skill
je postup.

## Závazná pravidla

1. **Zdroj je git**, ne zipy z Disku. Větev a commit určí prompt; bez pokynu
   `test` (nebo integrační větev, kterou prompt jmenuje).
2. **Žádné ceny ani osobní údaje** do repa, STAV, protokolu ani zpráv. Částky
   jen jako rozdíl, a jen když je potřeba ukázat nesoulad.
3. **Odchylka od očekávání = nález.** Nikdy se tiše nepřizpůsobuje očekávání,
   aby kolo „prošlo". Výjimky jen ty, které vede evidence (např. N46 jen INFO).
4. **Opravy se v rámci kola nedělají.** Nález jde do evidence a opravuje ho
   samostatná dávka. Výjimka: testy, harnessy a nástroje kola (svěřeno koordinaci).
5. **`git push --no-verify` je zakázané.** Na začátku `bash nastroje/instaluj_hooky.sh`.
6. **Mutační běh se nikdy nepřerušuje**, nikdy s `--help`; dočasné změny mutací
   se necommitují. Po restartu kontejneru nejdřív `git status` (zbytek mutace
   → `git checkout -- <soubor>`).
7. **Weby:** ostrý `engscalc` jen ČÍST. Testovací `testengscalc`: testovací
   sezení (prostředí `kalkulator-testovani`) smí zapisovat v plném rozsahu
   (J. V. 19. 11. 2026), ale souhlas musí dát J. V. přímo v tom sezení —
   souhlas předaný koordinací nestačí. Ostatní automaty (dávky, Actions) test
   jen čtou. Pipedrive jen simulátor / suchý běh nebo deal **TEST**.
8. Zakládat jen zakázky `TEST …` / `TEST VZ – …`; zákazníci smyšlení nebo
   právnické osoby z ARES; kontakty `…@priklad.cz`, telefony ze smyšlené řady.

## 1 · Prostředí

```
git fetch origin <větev> && git checkout <commit z promptu>
bash nastroje/instaluj_hooky.sh
mkdir -p node_modules && ln -sfn /opt/node-tools/node_modules/playwright node_modules/playwright   # necommitovat
```
Přihlašovací údaje testovacího sezení jsou proměnné prostředí `KNG_TEST_*`
a `KNG_MAIN_*` (zadává J. V. v nastavení prostředí). Nikdy je nevypisovat.
Zdraví webu: `curl https://testengscalc.netlify.app/api/zdravi` (verze).

## 2 · Stupně kol — kdy který

| Stupeň | Kdy | Co |
|---|---|---|
| **1 automat** | po každé dávce (dělá dávka i koordinace při slučování) | `ADMIN_EMAIL=spravce@priklad.cz bash nastroje/testovaci_kolo.sh --bez-mutaci --proti origin/<integrace nebo test>` — sestavení, sady, hodiny +400 dní, statické kontroly, porovnání sestavení nad pevnou sadou. Výsledek „VŠE ZELENÉ" a „SHODA" (nebo jen očekávané rozdíly). |
| **2 cílená sada** | po sloučení do testu, na změněnou oblast | testovací sezení ověří funkci přímo na testu (prohlížeč, Playwright, API), podle zadání koordinace; mutace dané dávky (`[ZNAČKA]`). |
| **3 plné kolo** | jen před main a po nasazení do main | celé kolo včetně mutací po částech, kolo main-před × main-po, ruční kontrola dokumentů J. V. |

Mutace po částech: `KNG_MUTACE_CAST=K/N bash nastroje/testovaci_kolo.sh --jen mutace-server`
(jádro N = 4, server N = 12–16; každá část < 2 h; přerušené navázat `--od`).
Kolo s částí hlásí „ZELENÁ ČÁST", nikdy „VŠE ZELENÉ".

## 3 · Kolo main-před × main-po

Dvě sestavení, stejná pevná sada, stejný ceník:
`bash nastroje/porovnej_sestaveni.sh <main> <kandidát> --ocekavane podklady/porovnani/<seznam>`.
Očekávané rozdíly se vypíší PŘEDEM (soubor v `podklady/porovnani/`); vše
ostatní je nález a nic nejde do main. Ceny main × test si J. V. ověřuje sám —
nástroj není brána do main. Návod `podklady/POROVNANI_SESTAVENI.md`.

## 4 · Sady

- **Standardní:** `spust_testy.sh` (Node, server, prohlížeč) — součást kola.
- **Regresní:** pevná sada porovnání sestavení + zlatá sada VS/VZ.
- **Cílené:** testy a harnessy dané dávky (`src/test_<č>_*.js`, `overit_*.mjs`).
- **Fuzz:** `src/test_fuzz_invarianty.js` (semínko; N46 jen INFO).
- **Tok Word a zámek:** `overit_klon_tisk`, `overit_prodano_zamek`, `overit_kryci_po_tisku`, `overit_sod*`.
- **Víc šachet / víc zákazníků:** `overit_vs_*`, `test_vz_*`, `overit_vz_*`, `test_vz_unik` (kanárky).

Každý nový test má pojistku: doložit v commitu, že před opravou selže a po
opravě projde. Harness, který padá jen pod zátěží kola a samostatně projde,
se pustí znovu samostatně a zapíše; opakovaný pád = nález.

## 5 · Výstup

`podklady/kola/STAV_KOLOnn.md` (u zkoušky funkce `STAV_TEST_<ZKRATKA>_<RRRR-MM-DD>.md`)
v testovací větvi, pevná osnova:

1. **Hlavička:** verze testu / main (z `/api/zdravi`), datum, kdo, rozsah, účty a přístupy.
2. **Výsledky:** tabulka bod × výsledek (OK / NÁLEZ / NEOVĚŘENO) × poznámka, počty sad a mutací.
3. **Nálezy:** ID `K<nn>-N<n>` (vada) nebo `K<nn>-I<n>` (informace / návrh), vážnost
   (vysoká = únik údajů jiného zákazníka, špatná cena nebo adresát; střední = chybné chování;
   nízká = text, vzhled), dopad na cenu ano/ne, přesné kroky, co se stalo a co se mělo stát.
4. **Úkoly a úklid:** co zůstalo na testu (zakázky, vypínače), co čeká na J. V.

Protokol xlsx (`TESTOVACI_PROTOKOL_<RRRR-MM-DD>_v<verze>.xlsx`) jen u plného kola,
bez cen z ceníku; struktura listů Souhrn / Checklist / Nálezy / Postup se nemění
a vzorce Souhrnu se roztáhnou na poslední řádek Checklistu.

## 6 · Nález = položka evidence

Jediná evidence je `roadmapa/roadmap.json`. Číslo přiděluje koordinace při
slučování (nikdy si ho nevymýšlet napřed). Pole: `typ: "nalez"`, `kolo`,
`dulezitost`, `dopadCena` (ano/ne), `alias` (`K49-I5`…), `cekaNa` „<kdo>: <co>",
`proc`, `detail`, `hotovoKdyz`. Kontrola `python3 roadmapa/roadmapa.py --kontrola`.

## 7 · Bezpečnostní audit kódu (beze změny, jen čtení)

Subagenti, každý s jasným rozsahem a pokynem „jen čtení, každý nález doložit
citací soubor:řádek, bez spekulací".

- **A. Regrese známých nálezů:** každý B-nález z posledního auditu — trvá /
  opraven / vrátil se. Opravený zůstává v seznamu s `OPRAVENO v<verze>`.
- **B. Nové nálezy podle změn:** vždy statika (`onclick` s neescapovanou
  interpolací, CSP a hlavičky v `netlify.toml`, `package-lock.json` a
  `NODE_VERSION`, `eval`/`new Function`/`innerHTML` bez nových výskytů,
  žádná tajemství — `nastroje/kontrola_udaju.py`). Změnil-li se `netlify/`
  nebo `server/`: tři čočky nad změněnými soubory — (1) autentizace a účty,
  (2) autorizace a úložiště dat (role vs. pole od klienta, zámky, schválení,
  limity, zálohy), (3) nasazení, integrace, XSS a dokumenty. Jednou za
  čtvrtletí (nebo na pokyn) plný audit celého stromu.
- **C. Výstup:** `podklady/<RRRR-MM-DD>_BEZPECNOSTNI_AUDIT_v<verze>.md`
  (tabulka ID · závažnost · oblast · nález · kde; detail vysokých; co je
  v pořádku; doporučený postup). B-čísla pokračují, nerecyklují se.
- **D. Vážnost:** kritická = zneužitelné anonymně z internetu; vysoká =
  obchodník získá práva administrátora, přepíše odeslanou nabídku nebo obejde
  schvalování; střední = integrita dat, supply chain; nízká = DoS, hygiena;
  informativní = doporučení. Vysoké a kritické nahoře ve STAV.

Auditním subagentům vždy dát `netlify/test_prava.mjs` a `netlify/mutace.mjs`
s pokynem „uveď, co test NEhlídá"; vysoké nálezy ověřit druhým nezávislým čtením.

## Známé zrady

- Heredoc v bashi rozbíjí české uvozovky „ " a `*/` — skripty psát přes Write.
- Víc harnessů v jednom volání s výchozím timeoutem spadne — pouštět po malých
  dávkách nebo s delším timeoutem.
- Verze `vDEN.MĚSÍC.pořadí` musí sedět na den commitu (statická kontrola);
  dávka z jiného dne verzi posune, harnessy z jiného dne s `KNG_VERZE_MIMO_DEN=1`.
- `PREDAVKA.md` nad 15 kB shodí statické kontroly — starší oddíly do
  `podklady/predavky/RRRR-MM.md`.
- Sady s firemními podklady (`overit_sod`, `overit_manual`, `overit_sablona`…)
  se bez `KNG_PODKLADY` přeskočí — to není zelená, uvést ve STAV jako „přeskočeno".
- Prohlížečové harnessy (např. `overit_zobrazeni`) občas padnou pod zátěží
  celého kola; samostatný opakovaný běh rozhodne.
