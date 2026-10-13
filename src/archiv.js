/* ============================================================
 * PŮVOD VARIANTY PŘEVZATÉ Z HISTORICKÉ KALKULACE (#17)
 *
 * Do 13. 10. 2026 tu byl celý model archivu historických kalkulací: okno
 * „↩ Historická kalkulace…" nahlédlo do uložených souborů zakázek, hledalo
 * v nich a vybranou kalkulaci přineslo do otevřené zakázky jako další
 * variantu (alternativní nabídku). Na pokyn J. V. 13. 10. 2026 („Odstraň
 * z hlavičky tlačítka Historická kalkulace. Myslím, že už k ničemu není.")
 * zmizela tlačítka, okno (ui/archiv_ui.js) i model, který už nic nevolalo.
 *
 * Zůstává jen věta o původu: varianty, které tím oknem dřív vznikly, jsou
 * v uložených zakázkách dál a nesou `v.puvod` (číslo staré nabídky, soubor,
 * kterým ceníkem se počítalo). Hlavička kalkulace (ui/common.js) a seznam
 * kalkulací (ui/seznam_ui.js, značka ⤺) ji ukazují i nadále — bez ní by se
 * nedalo poznat, že se u takové varianty nepočítalo od nuly.
 * ============================================================ */

/* Věta pro obrazovku i pro seznam kalkulací. Prázdný řetězec u varianty,
 * která z archivu nevznikla – volající pak nic nevypisuje. */
function puvodPopis(v) {
  const p = v && v.puvod;
  if (!p || !p.cislo) return '';
  const casti = ['převzato z nabídky ' + p.cislo];
  if (p.varianta) casti.push('varianta „' + p.varianta + '"');
  if (p.nazevAkce) casti.push(p.nazevAkce);
  if (p.soubor) casti.push('soubor ' + p.soubor);
  casti.push(p.cenik === 'historicky' ? 'počítáno historickým ceníkem' : 'přepočteno dnešním ceníkem');
  return casti.join(' · ');
}

if (typeof module !== 'undefined')
  module.exports = { puvodPopis };
