/* P11 (K12-N45, schváleno J. V. 25. 9. 2026) — úvod nabídky PROJ podle
 * rozsahu. Dřív pevný odstavec sliboval zaměření, studii i projednání
 * s Odborem památkové péče HMP i nabídkám bez nich a nabídka jen na DPS
 * začínala „v počáteční fázi nabízíme ZAMĚŘENÍ…". */
const np = require('./nabidka_proj.js');
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const uvod = sekce => np.nabidkaProjUvod(k => sekce.includes(k));

const vse = uvod(['zamereni', 'studie', 'projednani', 'dpz', 'ic', 'dps', 'ezc']);
test('vše: tři odstavce + závěr', vse.length === 4, vse);
test('vše: začíná „V rámci zamýšlené VÝSTAVBY" a zaměřením', /^V rámci zamýšlené VÝSTAVBY VÝTAHU A VÝTAHOVÉ ŠACHTY v počáteční fázi nabízíme ZAMĚŘENÍ/.test(vse[0]));
test('vše: projednání s památkáři je v textu', vse.join(' ').includes('Odborem památkové péče HMP'));

const dps = uvod(['dps']);
test('jen DPS: nezačíná zaměřením', !/ZAMĚŘENÍ/.test(dps.join(' ')), dps);
test('jen DPS: první věta obecná', dps[0] === 'V rámci zamýšlené VÝSTAVBY VÝTAHU A VÝTAHOVÉ ŠACHTY nabízíme PROVÁDĚCÍ PROJEKT (DPS).', dps[0]);
test('jen DPS: + závěr', dps.length === 2 && /dalších stránkách/.test(dps[1]));

const bezProj = uvod(['zamereni', 'studie', 'dpz']);
test('bez projednání: památkáři se neslibují', !bezProj.join(' ').includes('památkové péče'), bezProj);
test('bez projednání: DPZ bez inženýrské činnosti', !/INŽENÝRSK/.test(bezProj.join(' ')));

test('nic v rozsahu: úvod prázdný', uvod([]).length === 0);

/* Nabídka s daty: blok se v online nabídce skládá z vět a Word dostane
 * {{UVOD_NABIDKY_PROJ}}. Úplná data si bere test_nabidka_proj.js; tady jen
 * že symbol existuje a sedí na bloky. */
{
  const eng = require('./engine.js'); const ZC = require('./zkusebni_cenik.js');
  global.vypocet = eng.vypocet; global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI; global.DEFAULT_CENIK = ZC.zkusebniCenik();
  const ep = require('./engine_proj.js');
  global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
  global.vypocetProj = ep.vypocetProj;
  const tsm = require('./techspec.js');
  global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
  const fm = require('./firma.js'); Object.keys(fm).forEach(k => { global[k] = fm[k]; });
  const zk = require('./zakazka.js');
  const zak = zk.novaZakazka(); zak.cislo = '2026 - OPR - CN - 9135';
  const d = np.nabidkaProjData(zak, zak.varianty[0], 'cz');
  const blok = d.bloky.find(b => b.nadpis === 'Naše NABÍDKA a doporučení');
  test('data: UVOD_NABIDKY_PROJ existuje', typeof d.placeholders.UVOD_NABIDKY_PROJ === 'string');
  test('data: online blok = odstavce symbolu', !blok ? d.placeholders.UVOD_NABIDKY_PROJ === ''
    : blok.odstavce.join('\n') === d.placeholders.UVOD_NABIDKY_PROJ, { blok, u: d.placeholders.UVOD_NABIDKY_PROJ });
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
