/* ============================================================
 * PRAVIDLO RETENCE ZÁLOH PRO SERVER (#523 Z2, 26. 10. 2026)
 *
 * Pravidlo „které zálohy zůstanou" žije v src/retence_zaloh.js, aby ho
 * server (otisky v Blobs) i prohlížeč (kopie na Disku) brali z jednoho
 * místa. Soubor je .cjs ze stejného důvodu jako zakaznici_modul.cjs:
 * bundler Netlify vystopuje jen skutečný `require` s doslovnou cestou
 * (createRequire v obsluze je zakázaný — viz jadro_moduly.cjs).
 * ============================================================ */
module.exports = require('../../src/retence_zaloh.js');
