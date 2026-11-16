/* ============================================================
 * ARES PRO SERVER (K40c #581, 12. 11. 2026)
 *
 * Webhook „Vygenerovat nabídku“ a oprava organizace v Pipedrive čtou firmu
 * z ARES ze serveru. Mapování odpovědi (`aresZpracuj`, `ARES_POLE`,
 * `aresRozdily`) je v src/ares.js — stejné jako v prohlížeči. Soubor je .cjs
 * ze stejného důvodu jako zakaznici_modul.cjs: bundler Netlify vystopuje jen
 * skutečný `require` s doslovnou cestou (createRequire v obsluze je zakázaný,
 * viz jadro_moduly.cjs) a kvůli ares.js se nesmí tahat celé jádro.
 * ============================================================ */
module.exports = require('../../src/ares.js');
