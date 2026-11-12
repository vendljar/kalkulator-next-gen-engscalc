/* ===== K40-N4: SAZBA DPH PROJ U STARŠÍ ZAKÁZKY — OBĚ CESTY IMPORTU =====
 * (dávka K40a, roadmapa #579, 11. 11. 2026)
 *
 * Komentář v importZakazka tvrdil, že PROJ „převezme dosud platnou sazbu
 * z ceníku OCK". Platí to jen pro zakázku, která `data.proj` MÁ a sazbu
 * v ceníku PROJ nemá. Zakázka bez `data.proj` dostane celé `d.proj` ze vzoru
 * (DEFAULT_CENIK_PROJ) včetně sazby DPH. Chování se nemění (rozhodnutí
 * J. V. 4. 11.: strana PROJ zakázky naceněné v OCK se zamyká a nuluje) —
 * opravil se komentář a tahle sada obě cesty popisuje.
 *
 * Chování se neopravuje, proto popisné testy nad c664c9e projdou taky (5 OK);
 * selže jen kontrola komentáře (1 FAIL) — hlídá, aby se chování ani popis
 * potichu nezměnily.
 */
const fs = require('fs');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./engine.js');
global.DEFAULT_CENIK = Object.assign(ZC.zkusebniCenik(), { dph: 21 });
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = Object.assign(ZC.zkusebniCenikProj(), { dph: 12 });
nacti('./techspec.js');
const zk = nacti('./zakazka.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 300)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));

/* Cesta 1: starší zakázka BEZ data.proj (jen OCK) — sazba ze vzoru PROJ. */
{
  const zak = kopie(zk.novaZakazka());
  const v = zak.varianty[0];
  delete v.data.proj;
  v.data.cenik.dph = 15;          // sazba OCK téže varianty
  const imp = zk.importZakazka(zak);
  const d = imp.varianty[0].data;
  test('bez data.proj: proj vznikne ze vzoru', !!(d.proj && d.proj.cenik));
  test('bez data.proj: sazba DPH PROJ = vzor (12), NE sazba OCK (15)', d.proj.cenik.dph === 12, d.proj.cenik.dph);
}

/* Cesta 2: data.proj je, ceník PROJ sazbu nemá — převezme sazbu OCK. */
{
  const zak = kopie(zk.novaZakazka());
  const v = zak.varianty[0];
  v.data.cenik.dph = 15;
  delete v.data.proj.cenik.dph;
  const d = zk.importZakazka(zak).varianty[0].data;
  test('data.proj bez sazby: převezme sazbu OCK téže varianty (15)', d.proj.cenik.dph === 15, d.proj.cenik.dph);
}
/* Cesta 2b: ani OCK sazbu nemá — vzor. */
{
  const zak = kopie(zk.novaZakazka());
  const v = zak.varianty[0];
  delete v.data.cenik.dph;
  delete v.data.proj.cenik.dph;
  const d = zk.importZakazka(zak).varianty[0].data;
  test('data.proj bez sazby a OCK bez sazby: vzor (12)', d.proj.cenik.dph === 12, d.proj.cenik.dph);
}
/* Vyplněná sazba PROJ se nemění. */
{
  const zak = kopie(zk.novaZakazka());
  zak.varianty[0].data.proj.cenik.dph = 0;
  zak.varianty[0].data.cenik.dph = 21;
  const d = zk.importZakazka(zak).varianty[0].data;
  test('vyplněná sazba PROJ (0) zůstane', d.proj.cenik.dph === 0, d.proj.cenik.dph);
}

/* Komentář u migrace popisuje obě cesty (K40-N4). */
{
  const t = fs.readFileSync(__dirname + '/zakazka.js', 'utf8');
  const i = t.indexOf('if (d.proj.cenik.dph == null)');
  const okoli = t.slice(Math.max(0, i - 900), i);
  test('komentář u migrace DPH PROJ zmiňuje zakázku bez data.proj i vzor', /BEZ `data\.proj`/.test(okoli) && /vzor/i.test(okoli), okoli.slice(-300));
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
