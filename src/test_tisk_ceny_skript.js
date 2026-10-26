/* SKRIPT TISKOVÉHO NÁHLEDU: CENY SE ZÁMKEM NEEDITOVATELNÉ (SEC-S3, #517).
 *
 * Rychlá Node obdoba prohlížečového harnessu overit_tisk_ceny.mjs — tentýž
 * skript náhledu (tiskListaSkript v ui/common.js) se spustí nad malým
 * náhradním dokumentem. Hlídá se:
 *  1) náhled se zámkem (nabidkaTisk) dá buňkám s částkou contenteditable=false
 *     hned při otevření (tedy i „původnímu znění" pro návrat);
 *  2) buňka tabulky s částkou v měně bez třídy .castka taky;
 *  3) obyčejný text a buňky bez částky zůstávají bez atributu;
 *  4) zapnutí úprav ceny znovu označí (i po „Vrátit původní znění");
 *  5) náhled bez zámku (krycí list) nic needitovatelného nemá.
 * Spuštění: cd src && node test_tisk_ceny_skript.js */
const fs = require('fs');
const vm = require('vm');
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const common = fs.readFileSync(__dirname + '/ui/common.js', 'utf8');
const i = common.indexOf('function tiskListaSkript(');
const kod = i >= 0 ? common.slice(i, common.indexOf('\n}\n', i) + 2) : '';
const gen = vm.runInNewContext(kod + '; tiskListaSkript', { dokumentZamyka: t => /^nabidka/.test(t), JSON });

/* Náhradní DOM: prvky s tagem, třídami, textem a atributy. */
function prvek(tag, tridy, text, deti) {
  const e = { tagName: tag.toUpperCase(), attrs: {}, deti: deti || [], textContent: text || '', title: '',
    classList: { s: new Set(tridy || []), contains(x) { return this.s.has(x); }, add(x) { this.s.add(x); }, remove(x) { this.s.delete(x); } },
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k]; } };
  e.querySelector = (sel) => (sel === 'td,table' && e.deti.some(d => /^(TD|TABLE)$/.test(d.tagName))) ? e.deti[0] : null;
  return e;
}
function dokument() {
  const castka = prvek('td', ['castka'], '1 045 000,00 Kč');
  const tdMena = prvek('td', [], '12 000,00 Kč bez DPH');
  const tdEur = prvek('td', [], 'EUR 1 500');
  const tdText = prvek('td', [], 'Zdvih 12 m');
  const p = prvek('p', [], 'Nabídka platí 30 dní.');
  const vsechny = [castka, tdMena, tdEur, tdText];
  const dok = { classList: { add() {}, remove() {} }, innerHTML: '<puvodni>', contentEditable: 'inherit', focus() {},
    querySelectorAll: (sel) => sel === '.castka,td,th' ? vsechny : [] };
  const document = { getElementById: id => id === 'dok' ? dok : null };
  return { document, dok, castka, tdMena, tdEur, tdText, p, vsechny };
}
function spust(zamek) {
  const html = gen({}, zamek);
  const js = html.replace(/^<scr' \+ 'ipt>|^<script>/, '').replace(/<\/script>$/, '');
  const d = dokument();
  const ctx = { document: d.document, window: { addEventListener() {}, opener: null }, Date };
  vm.createContext(ctx); vm.runInContext(js, ctx);
  return { d, ctx };
}
const zamcene = e => e.attrs.contenteditable === 'false';

test('skript náhledu je ve zdroji', typeof gen === 'function');
{
  const { d, ctx } = spust({ typ: 'nabidkaTisk', varId: 'v1' });
  test('se zámkem: .castka needitovatelná hned při otevření', zamcene(d.castka), d.castka.attrs);
  test('se zámkem: buňka s částkou v Kč needitovatelná', zamcene(d.tdMena), d.tdMena.attrs);
  test('se zámkem: buňka s částkou v EUR needitovatelná', zamcene(d.tdEur), d.tdEur.attrs);
  test('se zámkem: buňka bez částky zůstává upravitelná', !zamcene(d.tdText), d.tdText.attrs);
  test('se zámkem: buňka s cenou má vysvětlení v bublině', /neupravují/.test(d.castka.title), d.castka.title);
  /* „Vrátit původní znění" → nové prvky bez atributu; zapnutí úprav je označí znovu. */
  d.castka.attrs = {}; d.tdMena.attrs = {};
  ctx.tiskEditace(true);
  test('zapnutí úprav ceny znovu označí', zamcene(d.castka) && zamcene(d.tdMena), [d.castka.attrs, d.tdMena.attrs]);
  test('zapnutí úprav zapne úpravy dokumentu', d.dok.contentEditable === 'true');
}
{
  const { d, ctx } = spust(null);
  ctx.tiskEditace(true);
  test('bez zámku (krycí list): nic needitovatelného', !d.vsechny.some(zamcene), d.vsechny.map(e => e.attrs));
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
