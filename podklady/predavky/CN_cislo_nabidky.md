# CN — číslo nabídky (#727), větev `claude/cn-cislo-nabidky`

Nad integrací `8411eb9` (v23.11.2). Pracovní verze v23.11.3 (přečísluje koordinace). Mez B276 (pracovní).

**Hotovo (body 1–5 + hledání):**
- `src/cislo_nabidky.js` (model: `cnTvarCisla`, `cnZmenaPosud`) + `src/ui/cislo_nabidky_ui.js` (dialogy), napojeno
  v `set()` (`ui/common.js`) pro `ZAK.cislo` — po zmrazení hlavičky, před A3. Tvar čísla = číslice a žádné slovo ze 4+ písmen.
- Uložená zakázka = `ONLINE_STAV.soubor` nebo `ULO_STAV.soubor`; duplikát / nová se neptá.
- Prodaná: `zamekCisloProdaneZmena` (zamek.js) → `zakazka_kontrola.mjs` před B56, 403 každé roli; klient `zamekZakCestaZmrazena`.
  Porovnává se s `zamek.cislo` ukládané prodané varianty, protože nové číslo = nový soubor (server uloženou verzi nevidí).
- Nápověda hledání: `hledaniNapovedaHtml` + `HLEDANI_TITULEK` v `ui/online_ui.js` (okno Zakázky online i Přehled).
- Protokol: kód beze změny, ověřeno testem (všechny cesty uložení volají `protokolZapisTed`).

**Testy:** `src/test_cn_cislo_nabidky.js` 58, `netlify/test_cn_cislo_nabidky.mjs` 24 (zapsána do SADY v `netlify/mutace.mjs`).
Mutace [CN] jádro 9/9 (+ JADRA: cislo_nabidky.js, ui/cislo_nabidky_ui.js), server 4/4. Kolo --bez-mutaci proti 8411eb9
VŠE ZELENÉ (527/0/6, hodiny 428/0/1, 12/12), SHODA 367/367.

**Nálezy / otázky pro koordinaci:**
- CN-N1: změna čísla odeslané varianty, která nese snímek lhůt z prodeje (i po odemčení prodeje), → 409 „snímek
  podmínek nové odeslané nabídky nesedí“. Předchází CN.
- CN-O1: změna čísla uložené zakázky dál zakládá NOVÝ záznam (starý zůstane). Text potvrzení to říká; přejmenování
  záznamu (smazat starý) by byla samostatná úloha — rozhodne J. V.
- CN-O2: ROZHODNUTO J. V. 23. 11. — číslo prodané nezmění nikdo (ani administrátor), cesta = odemknout prodej; kód beze změny.

**Další krok:** revize poradce (zámky), zkouška na testu (hotovoKdyz #727).

**Revize Fable (23. 11., SLOUČIT PO OPRAVÁCH, `podklady/revize/REVIZE_CN_727.md` ve větvi `claude/revize-cn-727`):**
S1 opraveno (tvar řady `CN_TVAR_RADY` na začátku = číslo; TEST / PROJ / NANECISTO), S2 mez v B276 + otázka CN-O3,
N1 test nahrazen skutečným chováním (mezera na konci → 403). Jen zapsáno:
- N2: obnova prodané zakázky (`!obnova`) bez testu a mutace.
- N3: „Vyhledat zakázku“ mimo online kanál — ve složce okno bez textu, v kanálu soubor `fileIn.click()` z dialogu;
  duplicita jen online.
- N4: kolize je tvrdé zamítnutí — po změně X → Y nejde napsat zpět X (otevřít X přes Načíst zakázku); sdělit J. V. u CN-O1.
- N5: obchodník u odeslané nabídky dostane jen hlášku A3, hledání se nenabídne.

