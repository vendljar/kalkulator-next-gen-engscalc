/* PoC AD-5: tiskový pohled zákazníka B (vzTiskPohled) po odemčení sdílené
 * varianty nese v historii odemčení snímek adresáta A (název, IČO).
 * Žádný generátor historii netiskne (ověřeno grep-em) — jde o zbytek v datech
 * vstupu tisku, ne o únik do papíru.
 * Spuštění: node podklady/audit_2026-11-20/poc_AD_vz_pohled.mjs */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'vice_zakazniku.js'];
CORE.forEach(f => { const m = require('../../src/' + f); if (m && typeof m === 'object') Object.assign(globalThis, m); });
const zak = novaZakazka();
Object.assign(zak, { cislo: '2026 - OPR - CN - 9940', objednatel: 'KANAREK-ALFA s.r.o.', ico: '27182818', adresaObjednatele: 'Smyšlená 1' });
const r = vzPridej(zak, { objednatel: 'Beta odběratel s.r.o.', ico: '16180339', adresaObjednatele: 'Smyšlená 2', kontakt: '', zastupci: {} },
  { kdo: 'poc@priklad.cz', kdy: '2026-11-20T00:00:00.000Z' });
if (!r.ok) throw new Error(r.chyba);
const v = zak.varianty[0];
/* nabídka odešla A (razítko jako skládá server: vzRazitkoSnimek), pak ji správce odemkl */
zamkniVariantu(v, { typ: 'nabidka', kdo: 'poc@priklad.cz', cislo: zak.cislo, zakaznik: vzRazitkoSnimek(zak, 'z1', v) });
const zamcenyPohled = JSON.stringify(vzTiskPohled(zak, r.zakaznik.id));
odemkniVariantu(v, { jeAdmin: true, duvod: 'PoC', kdo: 'spravce@priklad.cz' });
const pohled = vzTiskPohled(zak, r.zakaznik.id);
const text = JSON.stringify(pohled);
console.log('zamčená varianta: pohled B nese název A: ' + zamcenyPohled.includes('KANAREK-ALFA') + ' (razítko v zamek.tisky se vyjímá)');
console.log('po odemčení:      pohled B nese název A: ' + text.includes('KANAREK-ALFA') + ', IČO A: ' + text.includes('27182818'));
const kde = pohled.varianty[0].odemceni && pohled.varianty[0].odemceni[0].zamek.tisky[0].zakaznik;
console.log('kde: varianty[0].odemceni[0].zamek.tisky[0].zakaznik =', JSON.stringify(kde));
console.log(text.includes('KANAREK-ALFA') ? 'VÝSLEDEK: ZRANITELNÉ (zbytek v datech pohledu; do dokumentu se netiskne)' : 'VÝSLEDEK: ODOLNÉ');
