# Plán dávek po kole 47 — návrh poradce (11. 11. 2026)

Podklad: `podklady/PROMPT_RIDICI_SEZENI_PO_KOLE47.md` (odpovědi J. V. B1–B10 v oddílu B0), `PREDAVKA.md` „Předávka
koordinace — 11. 11. 2026“. Báze všech dávek: `aa445a12f187701351c627c15c820d512fc66e1b` (integrace
`claude/integrace-16-10`, obsah = test v11.11.1). Kód se v této větvi nemění — jsou tu jen prompty.

## 1. Dávky

| dávka | prompt | větev | roadmapa | odhad | riziko / revize poradce | smí běžet |
|---|---|---|---|---|---|---|
| **C1** CN v17 + DE nadpisy usazení | `PROMPT_C1_PO_KOLE47.md` | `claude/c1-cn-v17` | #582 | 3–4 h | běžná; lehká revize diffu `preklad.js` a nástroje | hned |
| **C2+C3** SoD realizace v5 + tečky ve smlouvě | `PROMPT_C23_PO_KOLE47.md` | `claude/c23-sod-v5` | #583, #584 | 6–8 h | **složitá** (smlouva se podepisuje, `docxgen.js`) — revize před sloučením | hned, souběžně s C1 |
| **C5** obnova TEST sady | `PROMPT_C5_PO_KOLE47.md` | `claude/c5-test-sada` | #585, meze B215–B216 | 4–5 h | **bezpečnostně citlivá** — revize před sloučením a před předáním J. V. | hned |
| **VSD** `vsTvar` + K43-T1 | `PROMPT_VSD_PO_KOLE47.md` | `claude/vsd-drobnosti` | #586, #587 | 2–3 h | drobnost, bez revize | hned |

Čísla roadmapy: nad bází jsou volná #582–#589 a od #597 (K40a #579, K40b #580, K40c #581). Meze B: nejvyšší nad
bází B214, K40 drží B199–B209.

## 2. Zjištění z přípravy

- **K43-T1 není pokryté nikde** (K40a `ed98942`, K40b `2529afc`, posudek `6a2551b` — `overit_lista_cekani.mjs` beze
  změny, v promptech K40 v1/v2 se neuvádí). Zařazeno do VSD.
- **Šablony v16 a SoD v4 jsou na Disku čitelné z cloudu** (složka Kalkulator NextGen / Sablony; ID v promptech C1
  a C2+C3). Sezení s konektorem Disku si je stáhne samo (jen čtení). J. V. musí soubory nahrát do sezení jen
  tehdy, když sezení konektor nemá — pak čtyři soubory `Sablona_NABIDKA_CN_v16*.docx`, resp.
  `Sablona_SOD_REALIZACE_v4*.docx`.
- **Výstupní `.docx` do repa nejdou** (repo je veřejné, firemní texty; zvyklost `podklady/SABLONA_*.md` +
  `podklady/sablony_vystup/` v `.gitignore`). Sezení je předá J. V. jako soubory, na Disk a do aplikace je nahraje
  J. V.
- **C2 je menší, než vypadá:** symboly `SACHTY_SOD_PREDMET` a `SACHTY_SOD_ROZPIS` kód plní už od VS-E5/E6. Zbývá
  šablona v5, upozornění u staré šablony a pravidlo kontrol.
- **C1 — jazykové v17:** dnešní nástroj jazykové verze strojově překládá z CZ (8 ze 147 textů zůstává česky).
  v17 proti v16 nepřidává žádný pevný text, proto prompt žádá v17_L = zveřejněná v16_L + smyčky (nástroj nad
  jazykovým souborem). Tím odpadne většina „nepřeložených“.
- **C1 — anglické nadpisy usazení jsou smíšené stejně jako německé** (FIXING × POSITION). J. V. rozhodl jen DE.
- **C5 — dvě pasti, které prompt ošetřuje:** (1) `/api/zakazky` bez pole `ocekavaneRazitko` existující zakázku
  tiše přepíše — nástroj ho musí posílat vždy; (2) běžné uložení bere příchozí zámek jako neověřený (B59/B61) —
  některé zamčené TEST zakázky může server odmítnout nebo označit jako sporné. Nástroj data neupravuje, jen hlásí.
- **C3 — rozsah:** tečky pro SoD realizace i projekce; plná moc zůstává (otázka níž).

## 3. Kolize souborů

| soubor | C1 | C2+C3 | C5 | VSD | K40a | K40b | K40c |
|---|---|---|---|---|---|---|---|
| `nastroje/vyrob_sablony.js` | ● | ● | | | | | |
| `src/preklad.js`, `src/slovnik.js` | ● | | | | ● | | |
| `src/sod.js`, `src/docxgen.js` | | ● | | | | | |
| `src/kontroly.js`, `src/test_vs_kontroly.js` | | ● (konec seznamu) | | ● (před `vsSablona`) | | | |
| `src/ui/kontroly_ui.js` | | ● | | | | | |
| `src/ui/sod_ui.js` | | ● (texty SoD) | | | | ● (karta prodeje) | ? |
| `overit_sod.mjs` | | ● (očekávání) | | | ● (výběr verze) | | |
| `overit_lista_cekani.mjs` | | | | ● | | | |
| `mutace_jadro.mjs` | ● | ● | (●) | ● | ● | ● | ? |
| `netlify/mutace.mjs` | | | ● | | ● | ● | ● |
| `BEZPECNOST_MEZE.md` | | | ● | | ● | ● | ● |
| `manual/obsah.json` | | ● | | ● | ● | ● | ● |
| `manual/admin/obsah.json` | ● | ● | | | ● | | |
| `CHANGELOG.md`, `PREDAVKA.md`, `roadmapa/roadmap.json`, `verze.txt` | ● | ● | ● | ● | ● | ● | ● |

Skutečné (logické) kolize nejsou žádné; všechny jsou textové a řeší je prompty umístěním změn (exporty nástroje
vlastním řádkem, pravidla kontrol na různých místech seznamu). Verze: K40a i K40b nesou v11.11.2 — čísla přidělí
koordinace při slučování.

## 4. Doporučené pořadí sloučení do integrace

1. **K40a** (hotová) → 2. **K40b** → 3. **C1** → 4. **VSD** → 5. **C2+C3** (po C1 kvůli `vyrob_sablony.js`, po VSD
   kvůli `kontroly.js`; po revizi poradce) → 6. **C5** (po K40b kvůli razítku přijetí zámku; po revizi poradce) →
   7. **K40c** podle svého plánu.
- C1 a VSD jsou malé a navzájem nezávislé — pořadí mezi nimi je volné; C1 dřív, protože na ni čeká zveřejnění
  šablon J. V.
- „SoD potom“ (B0.10) je priorita, ne závislost: C2+C3 smí běžet hned souběžně s C1, slučuje se po ní.
- Po každém sloučení kolo podle oddílu D bodu 6 promptu J. V.

## 5. Otázky pro J. V. (doporučená volba první)

1. **Anglické nadpisy „USAZENÍ OCK“** jsou smíšené jako německé (FIXING × POSITION). Sjednotit také — na
   „SHAFT STRUCTURE POSITION – …“ (**doporučeno**, stejná logika jako DE, vejde se do C1), nebo nechat?
2. **Tečky „……“ i v plné moci?** Prompt C3 je dává do SoD realizace a projekce; plná moc se vyplňuje ručně celá.
   **Doporučeno:** ano, tečky i v plné moci, bez kontroly před tiskem (doplní se do C2+C3, řekne-li J. V. hned).
3. **Pipedrive — které pole dealu má nést poznámku se seznamem šachet?** (Náhled ji ukazuje, zápis neposílá.)
   **Doporučeno:** nové vlastní textové pole dealu (např. „Šachty v nabídce“), které založí integrátor a přiřadí
   se v Mapě polí CRM jako ostatní pole — při každém zápisu se přepíše; alternativa je poznámka (Note) u dealu,
   ta by se ale při opakovaném zápisu množila. Bez odpovědi se nezařazuje.
4. **Zdroj exportu TEST sady pro C5:** soubor od testovacího sezení (kopie z 2. 11., jen TEST zakázky —
   **doporučeno**), nebo otisk testovací databáze z Disku (1. 11.)? Nástroj umí obojí; jde o to, co J. V. stáhne.
