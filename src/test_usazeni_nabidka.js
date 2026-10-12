/* USAZENÍ OCK V NABÍDCE PODLE TECHNICKÉ SPECIFIKACE (12. 10. 2026, pokyn J. V.)
 *
 * Specifikace má řádky „USAZENÍ OCK – LEVÁ BOČNÍ STĚNA" a „… PRAVÁ BOČNÍ
 * STĚNA"; nabídka OCK (Word i online) je neznala — ukazovala jen „boční
 * stěny" a „zadní stěnu", a to i s pomlčkou, když nebyla vybraná žádná volba.
 * Pravidlo: řádek usazení bez volby (výchozí „ -") v nabídce není; levá
 * a pravá boční stěna jsou v online nabídce vlastní řádky, ve Wordu se šablonou
 * bez symbolů {{TS_USAZENI_LEVA}} / {{TS_USAZENI_PRAVA}} (CN v14) jdou do řádku
 * „boční stěny" jako „levá – …; pravá – …".
 *
 * Spuštění: cd src && node test_usazeni_nabidka.js */
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
global.vypocet = eng.vypocet; global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI; global.DEFAULT_CENIK = ZC.zkusebniCenik();
const ep = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const tsm = require('./techspec.js');
global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
Object.assign(global, require('./preklad.js'));
const zk = require('./zakazka.js');
const fm = require('./firma.js');
Object.keys(fm).forEach(k => { global[k] = fm[k]; });
const N = require('./nabidka.js');
const DG = require('./docxgen.js');
const JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const zakazka = () => {
  const z = zk.novaZakazka();
  z.cislo = '2026-OPR-CN-9395'; z.nazevAkce = 'Usazení OCK';
  Object.assign(z.varianty[0].data.ock.zadani, { prejezd: 3.26, zdvih: 17, prohluben: 1.25, sirka: 2.09, hloubka: 2.16 });
  return z;
};
const LEVA = 'přisazena k fasádě (bez opláštění)';
const PRAVA = 'dveřní vstup ze dvora (diagonálně průchozí kabina)';
const radkyUsazeni = (ph, lang) => {
  const s = N.nabidkaNahledSekce(ph, lang || 'cz', null).find(x => x.sekce === 'ZÁKLADNÍ PARAMETRY ŠACHTY');
  return (s ? s.radky : []).filter(r => /USAZENÍ OCK/.test(r[0]));
};

(async () => {
  /* 1) levá a pravá zadaná ručně, boční a zadní výchozí („ -") — případ ze skenu */
  const z = zakazka();
  const v = z.varianty[0];
  v.data.techspec.hodnoty.usazeniLeva = LEVA;
  v.data.techspec.hodnoty.usazeniPrava = PRAVA;
  const ph = N.nabidkaData(z, v, JEKLY).placeholders;
  test('symbol TS_USAZENI_LEVA nese levou boční stěnu ze specifikace', ph.TS_USAZENI_LEVA === LEVA, ph.TS_USAZENI_LEVA);
  test('symbol TS_USAZENI_PRAVA nese pravou boční stěnu ze specifikace', ph.TS_USAZENI_PRAVA === PRAVA, ph.TS_USAZENI_PRAVA);
  const r = radkyUsazeni(ph);
  const popisky = r.map(x => x[0]);
  test('online nabídka má řádek LEVÁ BOČNÍ STĚNA', r.some(x => x[0] === 'USAZENÍ OCK – LEVÁ BOČNÍ STĚNA' && x[1] === LEVA), r);
  test('online nabídka má řádek PRAVÁ BOČNÍ STĚNA', r.some(x => x[0] === 'USAZENÍ OCK – PRAVÁ BOČNÍ STĚNA' && x[1] === PRAVA), r);
  test('online nabídka nemá řádek BOČNÍ STĚNY bez volby', popisky.indexOf('USAZENÍ OCK – BOČNÍ STĚNY') < 0, popisky);
  test('online nabídka nemá řádek ZADNÍ STĚNA bez volby', popisky.indexOf('USAZENÍ OCK – ZADNÍ STĚNA') < 0, popisky);
  test('čelní stěna (předvyplněná z kalkulace) zůstává', popisky.indexOf('USAZENÍ OCK – ČELNÍ STĚNA') >= 0, popisky);

  /* 2) Word se šablonou bez symbolů levé a pravé stěny (CN v14) */
  const bez = N.nabidkaData(z, v, JEKLY, 'cz', { symboly: new Set(['TS_USAZENI_BOCNI', 'TS_USAZENI_ZADNI']) }).placeholders;
  test('šablona bez symbolů LEVA/PRAVA: řádek boční stěny nese levou i pravou',
    bez.TS_USAZENI_BOCNI === 'levá – ' + LEVA + '; pravá – ' + PRAVA, bez.TS_USAZENI_BOCNI);
  const s = await DG.zipPrecti(new Uint8Array(await DG.docxDokumentBlob('x', [
    { sekce: 'ZÁKLADNÍ PARAMETRY', radky: [['USAZENÍ OCK – BOČNÍ STĚNY', '{{TS_USAZENI_BOCNI}}'], ['USAZENÍ OCK – ZADNÍ STĚNA', '{{TS_USAZENI_ZADNI}}']] }]).arrayBuffer()));
  const sablona = await DG.zipZapis(s).arrayBuffer();
  const vysl = await DG.zipPrecti(new Uint8Array(await (await DG.docxVyplnSablonu(sablona, bez, [], {}, {})).arrayBuffer()));
  const xml = new TextDecoder().decode(vysl.find(p => p.nazev === 'word/document.xml').data);
  test('Word: řádek boční stěny nese levou a pravou stěnu', xml.indexOf('pravá – ' + PRAVA.replace(/\(/g, '(')) >= 0, xml.slice(0, 300));
  test('Word: řádek zadní stěny bez volby zmizel', xml.indexOf('ZADNÍ STĚNA') < 0);
  /* šablona se symboly → boční zůstává prázdná (řádky jsou zvlášť) */
  const se = N.nabidkaData(z, v, JEKLY, 'cz', { symboly: new Set(['TS_USAZENI_BOCNI', 'TS_USAZENI_LEVA', 'TS_USAZENI_PRAVA']) }).placeholders;
  test('šablona se symboly LEVA/PRAVA: boční stěny zůstanou bez volby prázdné', se.TS_USAZENI_BOCNI === '', se.TS_USAZENI_BOCNI);

  /* 3) anglicky: sloučený řádek přeložený */
  const en = N.nabidkaData(z, v, JEKLY, 'en', { symboly: new Set(['TS_USAZENI_BOCNI']) }).placeholders;
  test('EN: sloučený řádek začíná „left – "', /^left – /.test(en.TS_USAZENI_BOCNI) && /; right – /.test(en.TS_USAZENI_BOCNI), en.TS_USAZENI_BOCNI);

  /* 4) nic nezadané: žádný řádek levé/pravé/boční/zadní, Word beze změny */
  const z2 = zakazka();
  const ph2 = N.nabidkaData(z2, z2.varianty[0], JEKLY, 'cz', { symboly: new Set(['TS_USAZENI_BOCNI']) }).placeholders;
  test('bez volby: řádek boční stěny ve Wordu prázdný (zmizí)', ph2.TS_USAZENI_BOCNI === '', ph2.TS_USAZENI_BOCNI);
  const p2 = radkyUsazeni(N.nabidkaData(z2, z2.varianty[0], JEKLY).placeholders).map(x => x[0]);
  test('bez volby: online jen čelní stěna', p2.length === 1 && p2[0] === 'USAZENÍ OCK – ČELNÍ STĚNA', p2);

  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})();
