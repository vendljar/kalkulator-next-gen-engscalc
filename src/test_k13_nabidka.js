/* Nálezy 12./13. testovacího kola v nabídce OCK (24. 9. 2026):
 *   P9  (K12-N48) online nabídka tiskla „šířka - × hloubka -" u vnějšího rozměru,
 *   P10 (K12-N46) stříšky (a příčka) jsou v ceně / specifikaci, ale ne v nabídce,
 *   P6  (K13-N57) zástupci POPIS_ZAMERU_OCK a OPLASTENI_VETA pro upravenou šablonu. */
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
global.vypocet = eng.vypocet; global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI; global.DEFAULT_CENIK = ZC.zkusebniCenik();
const ep = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const tsm = require('./techspec.js');
global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
const zk = require('./zakazka.js');
const fm = require('./firma.js');
Object.keys(fm).forEach(k => { global[k] = fm[k]; });
const pr = require('./preklad.js');
Object.keys(pr).forEach(k => { global[k] = pr[k]; });
const { nabidkaData, nabidkaNahledSekce } = require('./nabidka.js');
const JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

function zakazka(uprav) {
  const zak = zk.novaZakazka();
  zak.cislo = '2026 - OPR - CN - 9133'; zak.nazevAkce = 'K13';
  const z = zak.varianty[0].data.ock.zadani;
  Object.assign(z, { prejezd: 2.7, zdvih: 17.325, prohluben: 1.05, sirka: 1.51, hloubka: 1.515 });
  if (uprav) uprav(zak.varianty[0].data, z);
  return zak;
}
const radky = (zak, L) => {
  const d = nabidkaData(zak, zak.varianty[0], JEKLY, L || 'cz');
  const vse = [];
  nabidkaNahledSekce(d.placeholders, L || 'cz').forEach(s => s.radky.forEach(r => vse.push(r)));
  return { d, vse, najdi: lbl => vse.find(r => r[0] === lbl) };
};

/* P9 */
{
  const { vse } = radky(zakazka());
  test('P9: bez vnějšího rozměru se řádek „ROZMĚR ŠACHTY – VNĚJŠÍ" vynechá',
    !vse.some(r => r[0] === 'ROZMĚR ŠACHTY – VNĚJŠÍ [mm] *'));
  test('P9: nikde „šířka - × hloubka -"', !vse.some(r => /šířka\s*-\s*×\s*hloubka\s*-/.test(String(r[1]))));
  const s = radky(zakazka(d => { d.techspec = d.techspec || {}; d.techspec.hodnoty = Object.assign({}, d.techspec.hodnoty, { rozmerVnejsi: '1700 × 1720' }); }));
  const r = s.najdi('ROZMĚR ŠACHTY – VNĚJŠÍ [mm] *');
  test('P9: s ručně zadaným vnějším rozměrem řádek je', r && /1700/.test(r[1]) && /1720/.test(r[1]), r);
  test('P9: vnitřní rozměr se ukazuje dál', !!s.najdi('ROZMĚR ŠACHTY – VNITŘNÍ [mm] *'));
}

/* P10 */
{
  const bez = radky(zakazka(d => { d.ock.zadani.striskaKs = 0; }));
  test('P10: bez stříšek zástupce prázdný a řádek není', bez.d.placeholders.TS_PROSKLENA_STRISKA === ''
    && !bez.najdi('PROSKLENÁ STŘÍŠKA'), bez.d.placeholders.TS_PROSKLENA_STRISKA);
  const dve = radky(zakazka(d => { d.ock.zadani.striskaKs = 2; }));
  test('P10: 2 stříšky → TS_PROSKLENA_STRISKA „2× nad nástupišti"',
    dve.d.placeholders.TS_PROSKLENA_STRISKA === '2× nad nástupišti', dve.d.placeholders.TS_PROSKLENA_STRISKA);
  const r = dve.najdi('PROSKLENÁ STŘÍŠKA');
  test('P10: v náhledu nabídky je řádek v DOPLŇKOVÝCH KONSTRUKCÍCH', r && r[1] === '2× nad nástupišti', r);
  const jedna = radky(zakazka(d => { d.ock.zadani.striskaKs = 1; }), 'en');
  test('P10: v angličtině přeloženo (1 stříška)', jedna.d.placeholders.TS_PROSKLENA_STRISKA === 'over the landing',
    jedna.d.placeholders.TS_PROSKLENA_STRISKA);
  test('P10: příčka bez zadání = prázdno, řádek není', dve.d.placeholders.TS_PROSKLENA_PRICKA === ''
    && !dve.najdi('PROSKLENÁ PŘÍČKA VEDLE ŠACHTY'));
  const pricka = radky(zakazka(d => { d.techspec = d.techspec || {}; d.techspec.hodnoty = Object.assign({}, d.techspec.hodnoty, { prosklenaPricka: 'ano, dle výkresu' }); }));
  test('P10: ručně vyplněná příčka se do nabídky dostane',
    pricka.d.placeholders.TS_PROSKLENA_PRICKA === 'ano, dle výkresu' && !!pricka.najdi('PROSKLENÁ PŘÍČKA VEDLE ŠACHTY'),
    pricka.d.placeholders.TS_PROSKLENA_PRICKA);
}

/* P6 */
{
  const ph = (uprav) => radky(zakazka(uprav)).d.placeholders;
  const inter = ph(d => { d.ock.zadani.typSachty = 'interiérová'; });
  test('P6: interiér — popis záměru bez „fasády" a „dvojskla"',
    /Vestavba výtahu/.test(inter.POPIS_ZAMERU_OCK) && !/fasád|dvojskl/i.test(inter.POPIS_ZAMERU_OCK), inter.POPIS_ZAMERU_OCK);
  test('P6: interiér — věta o opláštění z materiálu specifikace (VSG, bez dvojskla)',
    /^Opláštění šachty: vrstvené bezpečnostní sklo VSG\.$/.test(inter.OPLASTENI_VETA), inter.OPLASTENI_VETA);
  const ext = ph(d => { d.ock.zadani.typSachty = 'exteriérová'; d.ock.zadani.profily = JSON.parse(JSON.stringify(eng.PROFILY_VYCHOZI['exteriérová'])); });
  test('P6: exteriér — přístavba k fasádě', /Přístavba výtahu/.test(ext.POPIS_ZAMERU_OCK) && /fasádě/.test(ext.POPIS_ZAMERU_OCK), ext.POPIS_ZAMERU_OCK);
  test('P6: exteriér — věta o opláštění s dvojsklem', /dvojsklo/.test(ext.OPLASTENI_VETA), ext.OPLASTENI_VETA);
  const pr_ = ph(d => { Object.assign(d.ock.zadani, { typSachty: 'interiérová', pruchoziSachta: true, nastupisteA: 3, nastupisteC: 2 }); });
  test('P6: průchozí — věta o nástupištích na čelní i zadní straně', /průchozí/.test(pr_.POPIS_ZAMERU_OCK), pr_.POPIS_ZAMERU_OCK);
  const zak = zakazka(); zak.popisZameru = '  Vestavba výtahu do zrcadla schodiště.  ';
  const vl = nabidkaData(zak, zak.varianty[0], JEKLY, 'cz').placeholders;
  test('P6: vlastní popis záměru z hlavičky má přednost', vl.POPIS_ZAMERU_OCK === 'Vestavba výtahu do zrcadla schodiště.', vl.POPIS_ZAMERU_OCK);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
