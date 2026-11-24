/* FALEŠNÉ HODINY PRO SADY (MT2, 24. 11. 2026).
 *
 * Načítá se před sadou: node --import ./netlify/pomoc_falesne_hodiny.mjs …
 * Proměnná KNG_FALESNE_HODINY = ISO čas (např. 2026-11-23T23:30:00Z); od něj
 * hodiny běží dál reálnou rychlostí (Date.now, new Date() bez argumentu).
 * Bez proměnné modul nic nemění. Hlídá netlify/test_mt2_pulnoc.mjs (kolo
 * kolem půlnoci Praha × UTC). Jméno nezačíná „test_“. */
const cil = process.env.KNG_FALESNE_HODINY;
if (cil) {
  const RealDate = globalThis.Date;
  const posun = RealDate.parse(cil) - RealDate.now();
  if (!Number.isFinite(posun)) throw new Error('KNG_FALESNE_HODINY: neplatný čas ' + cil);
  class FalesneDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(RealDate.now() + posun); else super(...a); }
    static now() { return RealDate.now() + posun; }
  }
  globalThis.Date = FalesneDate;
}
