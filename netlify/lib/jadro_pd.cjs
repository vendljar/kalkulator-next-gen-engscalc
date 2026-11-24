/* ============================================================
 * JÁDRO NAVÍC PRO ZÁPIS PRODEJE DO PIPEDRIVE (PV #597, 23. 11. 2026)
 *
 * Zápis prodeje do dealu (functions/pd_prodej.mjs) počítá hodnotu dealu
 * a platební kalendář PROJ NA SERVERU z uložené zakázky (K8-S3) — TÝMŽ
 * kódem, jakým prohlížeč skládá náhled „Co by se zapsalo do Pipedrive“
 * (src/pd_nanecisto.js pdnPodklad → pdnStranaOck / pdnStranaProj). Ten kód
 * potřebuje navíc plán plateb a texty nabídky PROJ (nabidkaProjPlatby).
 * Nepatří do jadro_moduly.cjs (dokumentové moduly server jinak nenačítá),
 * proto se načtou až tady, jednou za život instance, po jádru. Proč .cjs:
 * viz jadro_moduly.cjs (bundler musí `require` s doslovnou cestou vidět).
 * ============================================================ */
Object.assign(globalThis, require('../../src/plan_plateb.js'));
Object.assign(globalThis, require('../../src/nabidka_proj.js'));
Object.assign(globalThis, require('../../src/pd_nanecisto.js'));
module.exports = { nacteno: true };
