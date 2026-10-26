/* ============================================================
 * #522 Z1 (26. 10. 2026) — klient zálohy po stránkách a otisku po krocích
 *
 *   uloZalohaSloz (uloziste.js)     stránky /api/zaloha?strana=1… do tvaru
 *                                   dřívější celé zálohy (mapy se slučují,
 *                                   účty se řadí za sebe, razítko z první);
 *   onlineZalohaStrankami           následuje `dalsi`, nese klíč otisku;
 *   onlineOtiskDopor                pokračuje, dokud server nevrátí hotovo.
 *
 * Úseky src/ui/online_ui.js se vyříznou a spustí ve vm s náhradou
 * onlineApi (vzor test_o7_kopie_klient.js).
 * Pojistka: s uloziste.js a online_ui.js z v26.10.7 spadne (funkce chybí).
 * ============================================================ */
const fs = require('fs');
const vm = require('vm');
const U = require('./uloziste.js');
const zdroj = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
const usek = (od, po) => { const a = zdroj.indexOf(od), b = zdroj.indexOf(po, a + 1); return a > 0 && b > a ? zdroj.slice(a, b) : ''; };

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

(async () => {
  /* ---- uloZalohaSloz ---- */
  const S = U.uloZalohaSloz;
  test('uloZalohaSloz je v exportu', typeof S === 'function');
  if (typeof S === 'function') {
    let z = S({}, { porizena: 'A', zdroj: 'web', program: { v: 1 }, zakazky: { a: 1 }, uzivatele: [{ email: 'x' }] });
    z = S(z, { porizena: 'B', zakazky: { b: 2 }, uzivatele: [{ email: 'y' }], sablony: null });
    z = S(z, { sablony: { s: 1 }, podpisy: null, smazani: null });
    test('mapy se slučují (zakázky z obou stránek)', JSON.stringify(z.zakazky) === '{"a":1,"b":2}', z.zakazky);
    test('účty se řadí za sebe', z.uzivatele.map(u => u.email).join() === 'x,y', z.uzivatele);
    test('razítko platí z první stránky', z.porizena === 'A' && z.zdroj === 'web', z);
    test('prázdná mapa (null) se později doplní, null zůstane, když nic nepřijde',
      JSON.stringify(z.sablony) === '{"s":1}' && z.podpisy === null && z.smazani === null, z);
    test('jednozáznamová část se převezme celá', z.program.v === 1);
  }

  /* ---- onlineZalohaStrankami a onlineOtiskDopor ---- */
  const strankami = usek('/* ZÁLOHA PO STRÁNKÁCH (#522 Z1)', 'const KOPIE_DISK = ');
  const dopor = usek('const ONLINE_OTISK_KROKU_MAX', '/* ---------- KOPIE ZÁLOH NA DISK');
  test('úseky online_ui.js nalezeny', !!strankami && !!dopor);
  const ctx = { Promise, JSON, String, Error, Object, Array, encodeURIComponent, setTimeout, uloZalohaSloz: S, volani: [] };
  vm.createContext(ctx);
  vm.runInContext(strankami + dopor + '\nthis.strankami = onlineZalohaStrankami; this.dopor = onlineOtiskDopor;', ctx);
  ctx.onlineApi = async (cesta, telo) => {
    ctx.volani.push([cesta, telo]);
    if (cesta.startsWith('/api/zaloha?zdroj=nocni&strana=1')) {
      if (!/po=/.test(cesta)) return { ok: true, puvod: 'nocni-otisk', otisk: '2026-10-26', zaloha: { porizena: 'P', zakazky: { a: 1 } }, dalsi: '1' };
      if (/po=1/.test(cesta)) return { ok: true, zaloha: { zakazky: { b: 2 } }, dalsi: '2|z/b' };
      return { ok: true, zaloha: { uzivatele: [{ email: 'u' }] }, dalsi: null };
    }
    if (telo && telo.akce === 'pokracovat') {
      const n = ctx.volani.filter(v => v[1] && v[1].akce === 'pokracovat').length;
      return n < 3 ? { ok: true, hotovo: false, den: telo.klic, postup: { hotovo: n, celkem: 3 } } : { ok: true, hotovo: true, den: telo.klic, pocetZakazek: 7 };
    }
    return { ok: true };
  };
  const r = await ctx.strankami('/api/zaloha?zdroj=nocni', null);
  test('stránky se složí (3 požadavky, zakázky a účty ze všech)', ctx.volani.length === 3 && JSON.stringify(r.zaloha.zakazky) === '{"a":1,"b":2}'
    && r.zaloha.uzivatele.length === 1 && r.otisk === '2026-10-26' && r.puvod === 'nocni-otisk', [ctx.volani.map(v => v[0]), r]);
  test('další stránky nesou klíč otisku a ukazatel', ctx.volani[1][0] === '/api/zaloha?zdroj=nocni&strana=1&otisk=2026-10-26&po=1'
    && ctx.volani[2][0] === '/api/zaloha?zdroj=nocni&strana=1&otisk=2026-10-26&po=2%7Cz%2Fb', ctx.volani.map(v => v[0]));
  ctx.volani.length = 0;
  const prubeh = [];
  const o = await ctx.dopor(Promise.resolve({ ok: true, hotovo: false, den: '2026-10-26T101010-rucne', postup: { hotovo: 0, celkem: 3 } }), p => prubeh.push(p.hotovo));
  test('otisk po krocích: pokračuje, dokud není hotovo, a hlásí průběh', o.hotovo === true && o.pocetZakazek === 7
    && ctx.volani.length === 3 && ctx.volani.every(v => v[1].klic === '2026-10-26T101010-rucne') && prubeh.join() === '0,1,2', [ctx.volani, prubeh]);
  const stary = await ctx.dopor(Promise.resolve({ ok: true, den: 'x', pocetZakazek: 1 }), null);
  test('odpověď bez „hotovo" (starší server) se bere jako hotová', stary.den === 'x' && ctx.volani.length === 3);

  console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka ' + (e && e.stack || e)); console.log('\n' + ok + ' prošlo, ' + (fail + 1) + ' selhalo'); process.exit(1); });
