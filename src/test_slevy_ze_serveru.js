/* Revize 13. 10. 2026 (B101/B105): prohlížeč po uložení převezme slevy tak,
 * jak je uložil server (orazítkovaný čas, vrácené rozhodnutí) — ale jen
 * u varianty, jejíž slevu uživatel mezi odesláním a odpovědí neměnil. */
const fs = require('fs');
const vm = require('vm');
let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const zdroj = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
const vyrez = (jm) => { const i = zdroj.indexOf('function ' + jm + '('); if (i < 0) return ''; const j = zdroj.indexOf('\n}\n', i); return zdroj.slice(i, j + 2); };
const kod = vyrez('onlineSlevyOtisk') + vyrez('onlineSlevyZeServeru');
test('funkce jsou v online_ui.js', /onlineSlevyZeServeru/.test(kod) && /onlineSlevyOtisk/.test(kod));
const ctx = { ZAK: null, vykresleno: 0, syncVarianta() {}, render() { ctx.vykresleno++; } };
vm.createContext(ctx);
try { vm.runInContext(kod, ctx); } catch (e) { /* níž FAIL */ }
if (typeof ctx.onlineSlevyZeServeru === 'function') {
  const zak = () => ({ varianty: [{ id: 'a', data: { sleva: { procenta: 0.1, stav: 'čeká na schválení' }, slevaProj: null } },
                                  { id: 'b', data: { sleva: { procenta: 0.05, stav: 'schváleno', schvalilKdy: 'K' } } }] });
  ctx.ZAK = zak();
  const odeslane = ctx.onlineSlevyOtisk(ctx.ZAK);
  const n = ctx.onlineSlevyZeServeru([{ id: 'a', sleva: { procenta: 0.1, stav: 'zamítnuto', zamitl: 'V' } },
                                      { id: 'b', sleva: { procenta: 0.05, stav: 'schváleno', schvalilKdy: 'S' } }], odeslane);
  test('převezme vrácené rozhodnutí i čas ze serveru', n === 2 && ctx.ZAK.varianty[0].data.sleva.stav === 'zamítnuto'
    && ctx.ZAK.varianty[1].data.sleva.schvalilKdy === 'S' && ctx.vykresleno === 1, ctx.ZAK);
  ctx.ZAK = zak();
  const od2 = ctx.onlineSlevyOtisk(ctx.ZAK);
  ctx.ZAK.varianty[0].data.sleva.procenta = 0.2;              // uživatel mezitím změnil
  ctx.onlineSlevyZeServeru([{ id: 'a', sleva: { procenta: 0.1, stav: 'zamítnuto' } }], od2);
  test('slevu změněnou po odeslání nepřepíše', ctx.ZAK.varianty[0].data.sleva.procenta === 0.2 && ctx.ZAK.varianty[0].data.sleva.stav === 'čeká na schválení');
  test('bez slev v odpovědi nic', ctx.onlineSlevyZeServeru(undefined, od2) === 0);
}
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
