/* ============================================================
 * MODUL CONTROLLINGU PRO SERVER (Stav Pipedrive, 22. 10. 2026)
 *
 * /api/pd/stav se volá při každém otevření zakázky a z jádra potřebuje
 * jen čistotu záznamu stavu (ctrlPdStavNorm v src/controlling.js) — žádný
 * výpočet. Celé jádro (`jadro()`) by studený start protáhl o vteřiny;
 * vzor a důvod, proč .cjs a ne createRequire, popisuje zakaznici_modul.cjs.
 * src/controlling.js nemá při načtení žádnou závislost.
 * ============================================================ */
module.exports = require('../../src/controlling.js');
