# Dávka S5 — červená lišta „Ceník není nahraný" až po ověření (verze v15.10.4)

Nejdřív přečti `podklady/_SPOLECNE_15_10.md` (stejná větev) — platí celé. Větev `claude/lista-cenik-zpozdeni` nad `origin/test`.

Zadání J. V. 15. 10. 2026 (se snímkem v14.10.3, přihlášený administrátor): „pozdrž zobrazení červené lišty při načtení aplikace o pár vteřin. Dnes se zobrazuje hned a teprve po ověření zmizí. Myslím, že by mohlo její naběhnutí těch cca 5 vteřin vydržet a zobrazit ji až tehdy, když ceník skutečně není nahraný."

Kód: lišta `#ukazkoveLista` — `ukazkoveLista()` / `renderUkazkoveLista()` v `src/ui/ukazkove_ui.js` (volá `render()` v `src/ui/common.js`), text a stav v `src/ukazkove.js` (`ukazkoveStav`, `ukazkoveText`). Lišta svítí, dokud se nenačte zveřejněný ceník a firemní údaje z online databáze (přihlášení, `/api/program`, `/api/firma` — `src/ui/online_ui.js`).

Výchozí návrh (bez dalšího schvalování):
1. Při startu aplikace se lišta „ceník / firemní údaje nejsou skutečné" nevykreslí, dokud **doběhne první pokus o načtení ceníku a firmy z online databáze** (úspěch i chyba), nejdéle **5 s** od startu. Po té době, nebo po doběhnutí načtení, se stav vyhodnotí běžně: ceník opravdu chybí → lišta se ukáže; načetl se → nic neblikne.
2. Bez přihlášení / bez připojení (offline, práce ze složky) se po 5 s chová jako dnes. Jakmile čekání skončí, lišta reaguje okamžitě jako dosud (změna ceníku za běhu, odhlášení).
3. **Zábrany dokumentů se nemění:** tisk a Word nad prázdným ceníkem dál blokuje `ukazkoveTiskLista` / panel „Ceník není nahraný – dokument nevznikne" okamžitě, i během čekání (bezpečnost má přednost před vzhledem). Ověř testem.
4. Stav čekání drž v jedné proměnné s časem startu (testovatelné bez reálných 5 s — čas a „načtení doběhlo" injektovat).

Testy: jednotkový test rozhodnutí (čeká / ukázat / neukázat) + harness v prohlížeči (načtení stránky se zpožděnou odpovědí `/api/program`: v prvních vteřinách lišta není, po neúspěchu nebo po 5 s je; při úspěšném načtení se neobjeví vůbec; zábrana tisku platí hned). Pojistka před/po. Zkontroluj, že `overit_*` harnessy, které lištu čekají hned po načtení, projdou (případně jim přidej čekání, ne vypnutí kontroly).

Verze **v15.10.4**, CHANGELOG, příručka (jen pokud o liště píše), PREDAVKA, smoke, push. Na konci zpráva: co se změnilo, testy před/po, výchozí volby.
