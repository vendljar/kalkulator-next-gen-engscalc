/* ============================================================
 * MODUL PŘIPOMÍNEK PRO SERVER (dávka PR, 21. 11. 2026)
 *
 * Stejný důvod jako zakaznici_modul.cjs: /api/pripominky potřebuje jen
 * čistou logiku ze src/pripominky.js (bez závislostí), ne celé jádro.
 * `require` musí být skutečný příkaz CommonJS s doslovnou cestou, aby ho
 * bundler Netlify vystopoval — proto .cjs obal, ne createRequire v obsluze
 * (zakázáno, hlídá netlify/test_funkce.mjs).
 * ============================================================ */
module.exports = require('../../src/pripominky.js');
