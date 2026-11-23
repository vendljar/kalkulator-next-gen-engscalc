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

**Testy:** `src/test_cn_cislo_nabidky.js` 52, `netlify/test_cn_cislo_nabidky.mjs` 23 (zapsána do SADY v `netlify/mutace.mjs`).
Mutace [CN] jádro 8/8 (+ JADRA: cislo_nabidky.js, ui/cislo_nabidky_ui.js), server 4/4. Kolo --bez-mutaci proti 8411eb9
VŠE ZELENÉ (527/0/6, hodiny 428/0/1, 12/12), SHODA 367/367.

**Nálezy / otázky pro koordinaci:**
- CN-N1: změna čísla odeslané varianty, která nese snímek lhůt z prodeje (i po odemčení prodeje), → 409 „snímek
  podmínek nové odeslané nabídky nesedí“. Předchází CN.
- CN-O1: změna čísla uložené zakázky dál zakládá NOVÝ záznam (starý zůstane). Text potvrzení to říká; přejmenování
  záznamu (smazat starý) by byla samostatná úloha — rozhodne J. V.
- CN-O2 (rozhodnutí v dávce, k potvrzení J. V.): u prodané nabídky jsem zrušil výjimku správce (B56) — zadání bod 5
  „číslo nejde změnit“. Vrácení = smazat větev `ZAMEK_CISLO_CESTA` v `zamekZakCestaZmrazena` a blok CN v `zakazka_kontrola.mjs`.

**Další krok:** revize poradce (zámky), zkouška na testu (hotovoKdyz #727).
