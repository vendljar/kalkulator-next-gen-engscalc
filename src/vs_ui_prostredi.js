/* Společné prostředí sad VS #570 E3 (test_vs_priplatky.js, test_vs_sleva.js):
 * src/ui/vice_sachet_ui.js ve vm se skutečným jádrem (engine, vice_sachet)
 * a stuby aplikace. Není to sada (nezačíná na test_). */
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const E = require('./engine.js');
Object.keys(E).forEach(k => { global[k] = E[k]; });   // vice_sachet.js volá vypocet() jako globální (jako v buildu)
const VS = require('./vice_sachet.js');
const ZC = require('./zkusebni_cenik.js');
const J = require('./jekly.json');

const kop = x => JSON.parse(JSON.stringify(x));
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cenik = () => Object.assign(kop(E.DEFAULT_CENIK), ZC.zkusebniCenik(), { kurzEurKc: 25 });
const zad = (u) => Object.assign(kop(E.DEFAULT_ZADANI), { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 }, u || {});

function prostredi({ zap = true, ock, cenik: C } = {}) {
  const st = { hl: [] };
  const ctx = vm.createContext(Object.assign({ console, esc, JSON, Math, String, Set, Array, Object, Number,
    CISLO_POLE: 'inputmode="decimal" autocomplete="off" data-cislo="1"',
    kartaRezim: (o, k, t, obsah, id, z, navic) => '<karta id="' + id + '"><h2>' + t + (navic || '') + '</h2>' + obsah + '</karta>',
    fmt: x => 'F' + (Math.round(x * 100) / 100), fmt0: x => 'F0' + Math.round(x), num: x => String(x),
    VS_UI: { vid: null, akt: 0, pohled: 'akt', potvrdit: null },
    KATALOG: {}, katalogAplikuj: () => {},
    hlaska: t => { st.hl.push(String(t)); return Promise.resolve(); },
    render: () => {}, viceSachetZapnuto: () => zap,
    nahledStop: () => false, zamekCteniStop: () => false, zamekStop: () => false, variantaUzamcena: () => false,
    JEKLY: J, CENIK: C || cenik(),
  }, E, VS));
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'ui', 'vice_sachet_ui.js'), 'utf8'), ctx, { filename: 'vice_sachet_ui.js' });
  vm.runInContext(`
    var V = { id: 'v1', data: { ock: null } };
    var ZAK = { varianty: [V] };
    var OCK, Z;
    function aktivniVarianta() { return V; }
    function syncVarianta() { OCK = V.data.ock; Z = OCK.zadani; vsSyncZ(V, false); }
    function vypocetAkt() { return vypocetZakazkyOck(V.data.ock, CENIK, JEKLY); }
  `, ctx);
  ctx.V.data.ock = ock;
  ctx.syncVarianta();
  return { ctx, st };
}
module.exports = { prostredi, kop, cenik, zad, E, VS, J };
