# Předávka — větev `claude/testovani-po-opravach` (22. kolo, 30. 9. 2026)

Testování po opravách šesti nálezů 21. kola. Testovaný kód: **commit `148e1c4`**
(tag `v29.9.7`, hlava `claude/oprava-sesti-nalezu-v29.9.1`; sloučeno do
`test-draft` jako **v30.9.1**). Základ = `9a48ee8` (v29.9.1 / kód v26.9.1).
Procedura jen testuje a čte — zdrojáky se v tomto sezení neměnily; do této
větve jde jen tato předávka (pravidlo J. V.: úpravy vždy promptem do paralelní
větve). Výstupy 22. kola (protokol, audit, STAV, prompty) posílá sezení v chatu
— **do Output documents je nahraje J. V.** (device bridge v cloudu není).

## Verdikt 22. kola: VYHOVUJE S NÁLEZY

Automatizované kolo je celé zelené. **Všech šest oprav 21. kola drží** proti
doloženým útokům i proti obcházení jinou rolí a obnovou, a neblokují legitimní
práci. Audit ale ukázal, že **třída „koncová cena bez schválení" (#374) není
zavřená** (2 nové vysoké nálezy) a **oprava B99 je obejitelná** (1 střední).
0 regresí B1–B112 a N43–N61.

## Automatizované kolo (`KNG_PODKLADY=<složka> bash nastroje/testovaci_kolo.sh`)
- kontrola verze + sestavení ✓
- **sady: 191 prošlo, 0 selhalo, 1 přeskočeno** (jen `test.js` — skutečný ceník).
  Proti 21. kolu (187) +4 sady = nové testy oprav (`test_zaporne.mjs`,
  `test_sablona_obsah.js`, oddíly B97/B98/B112).
- **mutace jádra: 76 z 76** (jako 21. kolo)
- **mutace serveru: 201 z 201**, 0 chybně zadaných (21. kolo 187; +14 mutací
  oprav). Běh kvůli 30min limitu okna na pozadí rozdělen na části
  `functions/` (110) + `lib/` (59) + `../src/` (32), každá doběhla celá —
  mutační běh se nepřerušil, strom po každé části čistý.
- statické kontroly: verze = den commitu, 0 CRLF, `kontrola_udaju.py` čisté → **3 z 3**
- šest oprav nezavedlo nový XSS (`escJs`, `min=0`), `eval` ani tajemství; CSP dál
  `'unsafe-inline'` (B5), NODE_VERSION připnutá (B11).

## Šest oprav — ověření (dnešní pokusy nad paměťovým úložištěm)
- **B111** (záporná položka/množství/hodiny) — DRŽÍ: server 400 (OCK i PROJ,
  jiná role, text s mezerami, obnova přeskočí); prohlížeč `overit_zaporne.mjs`
  (obchodník) OK; kladná projde.
- **B96** (krok/směr zaokrouhlení mimo výčet) — DRŽÍ: server 400 (číslo i text,
  OCK+PROJ, admin, obnova); krok 10 000 z výčtu projde.
- **B112** (ceník varianty a přepisy podle role) — DRŽÍ pro doložené útoky:
  přirážka/jednotkové ceny/přepisy → 403 (obchodník, vedoucí, uložená); admin
  projde. Tři kontroly B111/B96/B112 na jednom místě `zakazka_kontrola.mjs`
  (sloučení drží). **Třída ale neuzavřena → B113/B114.**
- **B97** (kolize klíčů brzdy) — DRŽÍ: „ip:"/„ip6:" e-mail (i velká písmena,
  mezery) nezasáhne počítadlo adresy; jmenné prostory disjunktní (předpona „e:").
- **B98** (razítka obnovy ze souboru) — DRŽÍ: „shoda" → přepočet „nesouhlasi",
  odemčení bez záznamu v DB přeskočí; nejde obejít dávkami ani otisk+soubor.
- **B99** (obsah šablony) — základ DRŽÍ (volán na 3 cestách, firemní šablony
  projdou), ale **obejitelný → B115**.

## Nové nálezy 30. 9. 2026 (B113–B118) — plné texty v auditu
| ID | Vážnost | Nález |
|----|---------|-------|
| **B113** | vysoká | Obchodník nahradí celý ceník varianty ceníkem sestavení (nuly) → PROJ 0 Kč a nabídka vznikne (OCK 0 zastaví `cenaNula`). Výjimka „celý ceník sestavení" `uloziste.js:1230-1232`. #374 |
| **B114** | vysoká | B112 nehlídá identitu standardních položek PROJ (klíč sazby, `fixKey`, přímá cena/hodiny) → PROJ −35 až −65 %. `uloB112PrepisyProj uloziste.js:1103-1123`; `engine_proj.js:157,165`. #374 |
| **B115** | střední | Kontrola obsahu šablony (B99) obejitelná (číselné entity, jiný namespace prefix, `word2/`, interní OLE mimo `embeddings/`, chybějící `LINK`) → útok B99 obnovitelný. `sablona_obsah.js`. Firemní šablony ale projdou |
| **B116** | nízká | Akce „vrátit" znovuzveřejní šablonu bez kontroly obsahu. `sablony.mjs:120-142` |
| **B117** | nízká | Zbytek #38: krok zaokrouhlení z výčtu dolů podteče min. marži (~9 999 Kč/část). #374 bod 3 |
| **B118** | nízká (mez) | Obnova ze souboru přebírá `zámek.kdo` doslova — admin může zfalšovat „odeslal hlavní správce". Do `BEZPECNOST_MEZE.md` |

Každý potvrzen pokusem a druhým nezávislým čtením (subagent + koordinátor).

## Trvající (odložené) — potvrzeno pokusem/čtením
B100 (obnova zapisuje firmu/šablony ze souboru bez kontroly — se šablonami
souvisí B115), **B77-zbytek** (self-reset správce akcí „heslo" bez starého hesla
a brzdy — nejzávažnější), B106, B107, B108, B4 souběh, B6, B32-zbytek, B101, B102,
B103, B104; #345: B80/B81/B83/B85/B88; B79 ponecháno; N46, N59, N60 (J. V.), N61.

## Co čeká na J. V.
1. **#374 (B113, B114)** — dotáhnout třídu „koncová cena" (prompt 1 v souboru
   promptů). **Přehodnotit vážnost #374 na vysokou** (dnes „střední", threat
   model = B112). Rozhodnout bod 4 B96.
2. **B115 + B116 + B100** — dotáhnout kontrolu obsahu šablony (prompt 2):
   robustní XML parsování, všechny části a `.rels`, `LINK`; volat i při „vrátit"
   a v obnově.
3. **B77-zbytek** — akci „heslo" na vlastní účet odmítnout (prompt 3).
4. Odložené nálezy — návrhy promptů z 29. 9. platí dál.
5. **N60** (adresa .eu v šabloně PROJ v3) a **osobní e-mail** (`bdj@volny.cz`) ve
   firemní šabloně PROJ — mimo repozitář, řeší J. V.
6. Nahrát výstupy 22. kola do Output documents (protokol, audit, STAV, prompty).
7. Kroky „před ostrým nasazením" (shoda s Excelem `test.js`/`test_proj.js`,
   porovnání s ostrou zakázkou, vizuální kontrola PDF/Wordu, `curl -I` na `/api/*`,
   nastavení náhledů Netlify — B85) dělá J. V. lokálně.

## Sezení
| Sezení | Větev | Účel |
|---|---|---|
| Komplexní test v29.9.1 (21. kolo) | `claude/komplexni-test-v29.9.1` | kolo, audit, prompty 21. kola |
| Opravy v29.9.1 | `claude/oprava-sesti-nalezu-v29.9.1` | šest oprav (v29.9.2–v29.9.7), sloučeno do test-draft (v30.9.1) |
| Testování po opravách (22. kolo) | `claude/testovani-po-opravach` | toto sezení — kolo, audit, protokol, prompty, tato předávka |

## Prostředí (pro další sezení)
- Podklady (mimo repozitář): `/home/user/kng_podklady` — CN v13 (+EN/DE/FR),
  CN v11, PROJ = `Sablona_NABIDKA_PROJ_v2_opravena` (v3 je novější než kód této
  linie — nese neznámé symboly), SoD realizace/projekce, plná moc, příručka
  s přepsaným číslem verze (krok 0.7 skillu). Stahuje se konektorem Drive.
- `ADMIN_EMAIL=spravce@priklad.cz`; `node_modules/playwright` →
  `$(npm root -g)/playwright`, `playwright-core` → `…/playwright/node_modules/…`.
- **Kolo v cloudu jen po částech:** okno běhu na pozadí je 30 min, celé kolo
  ~55 min. Sady + mutace jádra + statické projdou v jednom běhu (~12 min);
  mutace serveru (~30 min) pustit zvlášť po částech přes filtr souboru
  (`node netlify/mutace.mjs "functions/"`, `"lib/"`, `"src/"`), každá doběhne
  celá. Počty po sadách až po mutacích (stejná pracovní kopie).
- Auditní subagenti čtou čistou kopii (`git archive`), zprávy do souborů;
  vysoká tvrzení ověřit druhým nezávislým čtením s pokusem.
