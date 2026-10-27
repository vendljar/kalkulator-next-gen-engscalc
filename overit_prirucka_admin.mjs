/* Kontrola hotové PŘÍRUČKY ADMINISTRÁTORA (…_kalkulator_v*_MANUAL_ADMINISTRATOR.html, M8)
 *
 * Sourozenec overit_manual.mjs: pustí manual/admin/overit.js v Chromiu nad
 * hotovou příručkou (se skutečnými snímky, takže i cíle kliknutí) a přidá,
 * co se dá ověřit jen proti repozitáři — verzi proti verze.txt.
 * Hotová příručka se do repozitáře neukládá (nese snímky), proto se harness
 * bez ní přeskočí; v CI ji hlídá src/test_prirucka_admin.js se zástupnými snímky.
 *
 * Spuštění:  KNG_PODKLADY=<složka s příručkou> node overit_prirucka_admin.mjs
 */
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

import { najdiSlozku, preskoc } from './nastroje/harness_podklady.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const KAM = najdiSlozku(['/home/claude/work/deliver']);
if (!KAM) preskoc('složka s příručkou administrátora', ['/home/claude/work/deliver', '$KNG_PODKLADY']);
/* Nejnovější podle data v názvu (verze DEN.MĚSÍC.pořadí se abecedně neřadí). */
const soubor = readdirSync(KAM).filter((f) => /^\d{4}-\d{2}-\d{2}_kalkulator_v.*_MANUAL_ADMINISTRATOR\.html$/.test(f))
  .sort().pop();
if (!soubor) preskoc('příručka administrátora (…_MANUAL_ADMINISTRATOR.html)', [KAM]);
const html = readFileSync(KAM + '/' + soubor, 'utf8');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : info); }
};

const verzeApp = readFileSync(new URL('./verze.txt', import.meta.url), 'utf8').trim();
test('příručka nese AKTUÁLNÍ verzi aplikace (v' + verzeApp + ')', html.includes('Platí pro aplikaci v' + verzeApp + ' '), verzeApp);
test('jméno souboru nese tutéž verzi', soubor.includes('_kalkulator_v' + verzeApp + '_'), soubor);
test('žádná zkušební hesla ze skriptu snímků v souboru', !/Zkusebni\.Heslo|Vzorove\.Heslo|zkusebni-tajemstvi/.test(html));

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}).listen(0);
const prohlizec = await chromium.launch();
const stranka = await prohlizec.newPage({ viewport: { width: 794, height: 1100 } });
const chyby = [];
stranka.on('pageerror', (e) => chyby.push(String(e)));
await stranka.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil: 'load' });
await stranka.waitForFunction(() => window.PRIRUCKA, null, { timeout: 60000 }).catch(() => {});
await stranka.waitForTimeout(500);
const vysl = await stranka.evaluate(readFileSync(new URL('./manual/admin/overit.js', import.meta.url), 'utf8'));
if (!vysl || !Array.isArray(vysl.radky)) test('manual/admin/overit.js doběhl', false, String(vysl));
else for (const r of vysl.radky) test('[vykreslení] ' + r.replace(/^(OK|CHYBA)\s+/, ''), /^OK /.test(r));
test('žádná chyba JavaScriptu', chyby.length === 0, chyby.slice(0, 2).join(' | '));

await prohlizec.close();
server.close();
console.log('\n' + soubor + ': ' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
