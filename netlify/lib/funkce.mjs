/* Vypínače zkušebních funkcí (VS #570, rozhodnutí J. V. 10. 11. 2026).
 *
 * Víc šachet v jedné nabídce se slučuje do integrace po etapách, schované
 * za vypínačem: na testovacím webu si ho správce zapne a testuje, na ostrém
 * zůstává vypnutý. Stav leží na serveru v úložišti programu (klíč `funkce`,
 * zálohy ho berou s programem) — prohlížeči se nevěří, rozhoduje server.
 *
 * Tvar: { viceSachet: true|false, viceZakazniku: true|false, kdo, kdy }.
 * Chybí = vše VYPNUTO. `viceZakazniku` = víc zákazníků na zakázce (VZ #598,
 * E0 16. 11. 2026; J. V.: zapíná jen administrátor, i na testu a ostrém). */
export const FUNKCE_KLIC = 'funkce';
export const FUNKCE_ZNAME = ['viceSachet', 'viceZakazniku'];

export function funkceOciste(x) {
  const o = {};
  FUNKCE_ZNAME.forEach(k => { o[k] = !!(x && typeof x === 'object' && x[k] === true); });
  return o;
}

export async function funkceCti(sProg) {
  try { return funkceOciste(await sProg.cti(FUNKCE_KLIC)); }
  catch (e) { return funkceOciste(null); }      // nečitelné = vypnuto (bezpečná strana)
}
