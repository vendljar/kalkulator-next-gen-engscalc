/* PROSTŘEDÍ HARNESSU PŘED IMPORTEM SERVEROVÝCH FUNKCÍ (#638, 21. 11. 2026).
 *
 * netlify/lib/sdilene.mjs čte ADMIN_EMAIL jako konstantu PŘI IMPORTU
 * (`export const ADMIN_EMAIL = …`). Harnessy si proměnnou nastavovaly
 * přiřazením v těle (`process.env.ADMIN_EMAIL = … || 'spravce@priklad.cz'`),
 * jenže statické `import` se v ES modulu vykonají DŘÍV než tělo. Bez
 * ADMIN_EMAIL v prostředí tak sdilene.mjs vidělo prázdný e-mail, první
 * přihlášení správce skončilo 401 a harness vypršel na čekání na přihlášení
 * (overit_zobrazeni.mjs) nebo spadl na „Nepřihlášen." (overit_zaporne.mjs).
 * V kole to nebylo vidět, protože spust_testy.sh a testovaci_kolo.sh
 * ADMIN_EMAIL exportují; samostatný běh padal vždy.
 *
 * Importy se vykonávají v pořadí zápisu, proto stačí tento modul importovat
 * jako PRVNÍ (před ./netlify/…). Hlídá src/test_harness_cekani.js. */
if (!String(process.env.ADMIN_EMAIL || '').trim()) process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
export const ADMIN_EMAIL_HARNESS = process.env.ADMIN_EMAIL;
