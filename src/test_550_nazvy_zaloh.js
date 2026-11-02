/* ============================================================
 * #550 ZN — NÁZVY ZÁLOH NA DISKU S PROSTŘEDÍM A ČASEM (J. V. 2. 11. 2026)
 *
 * Ostrý i testovací web kopírují do téže složky „_Zaloha Netlify DB". Do
 * v2.11.3 se kopie jmenovala otisk_RRRR-MM-DD.json.gz a oba weby přepisovaly
 * posledni_kopie.json — kopie téhož dne se vzájemně přepsaly. Teď:
 *   otisk_<main|test|jiny>_RRRR-MM-DD_HHMM.json(.gz)  (čas Europe/Prague)
 *   posledni_kopie_<prostředí>.json
 * Zkouší se:
 *   1) jméno (prostředí ze serveru, letní/zimní čas, den otisku, bez prostředí nic);
 *   2) rozbor jména a úklid: jen vlastní prostředí, starý tvar nikdy,
 *      nejnovější per prostředí, víc kopií za den = jeden den;
 *   3) hláška „Poslední kopie…" jen vlastního prostředí;
 *   4) průběh kopie ve vm (úsek src/ui/online_ui.js) nad složkou se
 *      soubory obou webů a starými kopiemi.
 *
 * Pojistka: nad kódem b22f5df (v2.11.3) sada selže — uloKopieDiskJmeno dává
 * otisk_<den>.json.gz bez prostředí a času, retenceZalohDiskVyber maže starý
 * tvar a nezná prostředí, retenceZalohDiskRozeber a uloKopieDiskPosledniJmeno
 * neexistují, úklid smaže i kopie druhého webu (ověřeno, viz commit).
 * ============================================================ */
const fs = require('fs');
const vm = require('vm');
const U = require('./uloziste.js');
const R = require('./retence_zaloh.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const J = (x) => JSON.stringify(x);
const zkus = (n, fn) => { try { fn(); } catch (e) { test(n + ' (výjimka)', false, String(e && e.message || e)); } };

/* ---------------- 1) jméno kopie ---------------- */
zkus('jméno', () => {
  const N = U.uloKopieDiskJmeno;
  test('#550 jméno: main, den otisku, čas pořízení v Praze (zimní čas, +1 h)',
    N('2026-11-02', true, 'main', '2026-11-02T02:10:00Z') === 'otisk_main_2026-11-02_0310.json.gz');
  test('#550 jméno: test, letní čas (+2 h)', N('2026-07-01', true, 'test', '2026-07-01T01:05:00Z') === 'otisk_test_2026-07-01_0305.json.gz');
  test('#550 jméno: jiny (náhled / místní běh), nekomprimovaná .json', N('2026-11-02', false, 'jiny', '2026-11-02T12:00:00Z') === 'otisk_jiny_2026-11-02_1300.json');
  test('#550 jméno: datum = den otisku i přes pražskou půlnoc; bez dne den v Praze',
    N('2026-11-02', true, 'main', '2026-11-02T23:30:00Z') === 'otisk_main_2026-11-02_0030.json.gz'
    && N(null, true, 'main', '2026-11-02T23:30:00Z') === 'otisk_main_2026-11-03_0030.json.gz');
  test('#550 jméno: prostředí bez ohledu na velikost písmen; neplatné = žádné jméno',
    N('2026-11-02', true, ' MAIN ', '2026-11-02T02:10:00Z') === 'otisk_main_2026-11-02_0310.json.gz'
    && N('2026-11-02', true) === '' && N('2026-11-02', true, 'ostre') === '' && N('2026-11-02', true, '../x') === '');
  test('#550 jméno: neplatný den → den v Praze, nikdy cesta', /^otisk_main_\d{4}-\d{2}-\d{2}_\d{4}\.json\.gz$/.test(N('../../x', true, 'main')));
  test('#550 jméno: čas jako Date i číslo', N('2026-11-02', true, 'main', new Date('2026-11-02T02:10:00Z')) === 'otisk_main_2026-11-02_0310.json.gz'
    && N('2026-11-02', true, 'main', Date.parse('2026-11-02T02:10:00Z')) === 'otisk_main_2026-11-02_0310.json.gz');
  test('#550 posledni_kopie: jeden soubor na prostředí', U.uloKopieDiskPosledniJmeno('main') === 'posledni_kopie_main.json'
    && U.uloKopieDiskPosledniJmeno('test') === 'posledni_kopie_test.json' && U.uloKopieDiskPosledniJmeno('x') === '');
  test('#550 jméno projde rozborem retence (jedno pravidlo na obou stranách)',
    J(R.retenceZalohDiskRozeber(N('2026-11-02', true, 'test', '2026-11-02T02:10:00Z')))
      === J({ den: '2026-11-02', prostredi: 'test', hhmm: '0310', gzip: true, stary: false }));
});

/* ---------------- 2) rozbor a úklid ---------------- */
zkus('úklid', () => {
  const Rz = R.retenceZalohDiskRozeber;
  test('#550 rozbor: starý tvar se pozná (stary, bez prostředí)', J(Rz('otisk_2026-10-27.json')) === J({ den: '2026-10-27', prostredi: null, hhmm: null, gzip: false, stary: true }));
  test('#550 rozbor: cizí a vadná jména = null', ['otisk_main_2026-10-27_2400.json.gz', 'otisk_main_2026-10-27_0360.json', 'otisk_main_2026-02-31_0300.json',
    'otisk_prod_2026-10-27_0300.json', 'otisk_main_2026-10-27.json', 'otisk_main_2026-10-27_0300 (1).json', 'posledni_kopie_main.json', 'otisk_Main_2026-10-27_0300.json']
    .every(j => Rz(j) === null));
  const V = R.retenceZalohDiskVyber;
  const m = (d, t) => 'otisk_main_' + d + '_' + (t || '0310') + '.json.gz';
  const t = (d, h) => 'otisk_test_' + d + '_' + (h || '0315') + '.json.gz';
  const stare = ['otisk_2026-04-05.json', 'otisk_2026-08-30.json.gz', 'otisk_2026-10-13.json.gz'];
  const slozka = [m('2026-10-27'), m('2026-10-20'), m('2026-10-13'), m('2026-10-01'), m('2026-04-05'),
    t('2026-10-27'), t('2026-10-13'), t('2026-04-05')].concat(stare, ['posledni_kopie_main.json', 'posledni_kopie.json']);
  /* dnes 27. 10. 2026 (úterý): 20. 10. drží svůj týden (19.–25. 10. bez neděle), 13. 10. ne (týden drží 18. 10.? není → 13. 10. sám) */
  const vMain = V(slozka, '2026-10-27', [], 'main');
  test('#550 úklid main: maže jen kopie main podle pravidla, test a starý tvar nikdy',
    J(vMain) === J([m('2026-04-05')]) && vMain.every(j => j.startsWith('otisk_main_')), vMain);
  const vTest = V(slozka, '2026-10-27', [], 'test');
  test('#550 úklid test: maže jen kopie test', J(vTest) === J([t('2026-04-05')]), vTest);
  test('#550 úklid: bez prostředí / neplatné prostředí → nic', V(slozka, '2026-10-27').length === 0 && V(slozka, '2026-10-27', [], 'ostre').length === 0);
  test('#550 úklid: starý tvar otisk_<den>… bez prostředí se nesmaže ani po letech', V(stare.concat([m('2031-01-01')]), '2031-01-01', [], 'main').length === 0
    && V(stare, '2031-01-01', [], 'jiny').length === 0);
  /* nejnovější per prostředí: test má jen jednu starou kopii, main novější — test zůstane */
  test('#550 úklid: nejnovější kopie vlastního prostředí zůstane, i když druhý web má novější',
    V([t('2026-01-03'), m('2027-12-30'), m('2027-12-31')], '2028-01-01', [], 'test').length === 0
    && J(V([t('2026-01-03'), t('2026-01-04'), m('2027-12-31')], '2028-01-01', [], 'test')) === J([t('2026-01-03')]));
  /* víc kopií za den: pravidlo počítá dny — tři kopie dne odcházejí i zůstávají spolu a nevytlačí jiný den */
  const den3 = (d) => [m(d, '0310'), m(d, '1205'), m(d, '2359')];
  const tyden = [];
  for (let d = 21; d <= 27; d++) tyden.push(...den3('2026-10-' + d));
  test('#550 víc kopií za den: 7 dní po třech kopiích → nic se nesmaže (počítají se dny, ne soubory)',
    V(tyden, '2026-10-27', [], 'main').length === 0);
  test('#550 víc kopií za den: den k smazání odejde se všemi kopiemi, ponechaný den zůstane celý',
    J(V(den3('2026-04-07').concat(den3('2026-10-01'), den3('2026-10-27')), '2026-10-27', [], 'main')) === J(den3('2026-04-07').sort()));
  test('#550 víc kopií za den: právě zapsaná kopie chrání celý svůj den',
    V(den3('2026-04-07').concat(den3('2026-10-27')), '2026-10-27', [m('2026-04-07', '1205')], 'main').length === 0);
});

/* ---------------- 3) hláška jen vlastního prostředí ---------------- */
zkus('hláška', () => {
  const S = U.uloKopieDiskStav;
  const ted = Date.parse('2026-11-02T12:00:00Z');
  const z = (p) => ({ kdy: '2026-11-02T08:00:00Z', soubor: 'otisk_' + p + '_2026-11-02_0310.json.gz', prostredi: p });
  test('#550 hláška: vlastní kopie se ukáže s prostředím', /Poslední kopie záloh na Disku Google \(prostředí main\): .*otisk_main_2026-11-02_0310/.test(S(z('main'), ted, 'main').text)
    && S(z('main'), ted, 'main').potreba === false, S(z('main'), ted, 'main'));
  test('#550 hláška: záznam jiného prostředí = žádná vlastní kopie', /\(prostředí test\) .*zatím žádná není/.test(S(z('main'), ted, 'test').text)
    && S(z('main'), ted, 'test').potreba === true, S(z('main'), ted, 'test'));
  test('#550 hláška: starý záznam bez prostředí platí (psal ho jen tenhle web)', /Poslední kopie/.test(S({ kdy: '2026-11-02T08:00:00Z', soubor: 'otisk_2026-11-02.json.gz' }, ted, 'main').text));
  test('#550 hláška: bez známého prostředí jako dřív', /^Poslední kopie záloh na Disku Google: /.test(S(z('main'), ted).text));
});

/* ---------------- 4) průběh kopie ve vm ---------------- */
const zdroj = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
const usek = (od, po) => { const a = zdroj.indexOf(od), b = zdroj.indexOf(po, a + 1); return a > 0 && b > a ? zdroj.slice(a, b) : ''; };
const kopieKod = usek('/* ZÁLOHA PO STRÁNKÁCH (#522 Z1)', 'function kopieDiskVelikost');
test('úsek online_ui.js nalezen', !!kopieKod && kopieKod.includes('kopieDiskUklid'));
const slozka = (name, soubory) => {
  const m = new Map(Object.entries(soubory).map(([j, v]) => [j, Buffer.from(String(v))]));
  const h = { name, m, smazane: [],
    async getFileHandle(jm, o) {
      if (!m.has(jm) && !(o && o.create)) { const e = new Error('není'); e.name = 'NotFoundError'; throw e; }
      return { createWritable: async () => { const c = []; return { write: async (t) => { c.push(Buffer.from(t)); }, close: async () => { m.set(jm, Buffer.concat(c)); } }; },
        getFile: async () => { const d = m.get(jm); return { size: d.length, arrayBuffer: async () => d.buffer.slice(d.byteOffset, d.byteOffset + d.length),
          stream: () => new Blob([d]).stream() }; } };
    },
    async *values() { for (const jm of m.keys()) yield { kind: 'file', name: jm }; },
    async removeEntry(jm) { h.smazane.push(jm); m.delete(jm); },
  };
  return h;
};
const ZALOHA = { porizena: '2026-10-27T02:10:00.000Z', zdroj: 'nocni-otisk', program: { db: 1 }, zakazky: { 'Z1.json': { popis: 'x'.repeat(2000) } }, uzivatele: [], podpisy: null };
const novyCtx = (odpoved) => {
  const ctx = { Promise, JSON, String, Error, Date, Object, Array, Math, Uint8Array, Number, TextEncoder, TextDecoder, crypto: globalThis.crypto,
    encodeURIComponent, setTimeout, Blob, Response, CompressionStream, DecompressionStream, volani: [],
    ULO_KOPIE_DISK_SLOZKA: U.ULO_KOPIE_DISK_SLOZKA, uloKopieDiskJmeno: U.uloKopieDiskJmeno, uloZalohaSloz: U.uloZalohaSloz,
    uloKopieDiskProstredi: U.uloKopieDiskProstredi, uloKopieDiskPosledniJmeno: U.uloKopieDiskPosledniJmeno,
    retenceZalohDiskRozeber: R.retenceZalohDiskRozeber, retenceZalohDiskVyber: R.retenceZalohDiskVyber, retenceZalohPokles: R.retenceZalohPokles,
    RETENCE_ZALOH_DISK_JMENO: R.RETENCE_ZALOH_DISK_JMENO,
    ONLINE_STAV: { otisky: [], kopieDisk: null }, jeAdminOnline: () => true, render: () => {}, uloPravo: async () => true, onlineZprava: () => {},
    dotazHeslo: () => Promise.resolve('Heslo.Spravce.1'), uloDb: () => Promise.reject(new Error('bez IndexedDB')) };
  ctx.onlineApi = async (cesta, telo) => {
    ctx.volani.push([cesta, telo]);
    if (cesta === '/api/zaloha?zdroj=nocni&strana=1') return odpoved();
    return { ok: true, kopieDisk: { kdy: new Date(Date.now()).toISOString(), ...(telo && telo.kopie) }, retenceVarovani: null };
  };
  vm.createContext(ctx);
  vm.runInContext(kopieKod + '\nthis.proved = kopieDiskProved;', ctx);
  return ctx;
};
const realNow = Date.now;
Date.now = () => Date.parse('2026-10-27T09:00:00Z');
(async () => {
  const velka = 'y'.repeat(50000);   // kopie ostrého webu je mnohem větší než testovací
  const souboryObou = {
    'otisk_main_2026-10-27_0310.json.gz': 'kopie ostrého webu z dneška', 'otisk_main_2026-04-05_0310.json.gz': velka,
    'otisk_test_2026-10-20_0310.json': 'x', 'otisk_test_2026-04-05_0310.json': 'x',
    'otisk_2026-10-27.json.gz': velka, 'otisk_2026-04-05.json': velka, 'posledni_kopie.json': '{}', 'posledni_kopie_main.json': '{"prostredi":"main"}' };
  {
    const ctx = novyCtx(() => ({ ok: true, zaloha: JSON.parse(J(ZALOHA)), otisk: '2026-10-27', puvod: 'nocni-otisk', prostredi: 'test', porizena: ZALOHA.porizena }));
    const h = slozka('_Zaloha Netlify DB', souboryObou);
    const k = await ctx.proved(h);
    test('#550 kopie test: nový soubor otisk_test_<den>_<čas>.json.gz, kopie ostrého webu téhož dne zůstala beze změny',
      k.soubor === 'otisk_test_2026-10-27_0310.json.gz' && h.m.has('otisk_test_2026-10-27_0310.json.gz')
      && h.m.get('otisk_main_2026-10-27_0310.json.gz').toString() === 'kopie ostrého webu z dneška', k.soubor);
    const zaznam = (ctx.volani.find(v => v[0] === '/api/zaloha_vynuceno') || [])[1];
    test('#550 kopie test: server dostane jméno a prostředí', !!zaznam && zaznam.kopie.soubor === k.soubor && zaznam.kopie.prostredi === 'test', zaznam && zaznam.kopie);
    const posl = h.m.get('posledni_kopie_test.json');
    test('#550 posledni_kopie_test.json vznikne s prostředím; posledni_kopie_main.json a stará posledni_kopie.json se nedotknou',
      !!posl && JSON.parse(posl.toString()).prostredi === 'test' && JSON.parse(posl.toString()).soubor === k.soubor
      && h.m.get('posledni_kopie_main.json').toString() === '{"prostredi":"main"}' && h.m.get('posledni_kopie.json').toString() === '{}', posl && posl.toString());
    test('#550 úklid test: smazána jen stará kopie testu (5. 4.), nic z ostrého webu ani starého tvaru',
      J(h.smazane) === J(['otisk_test_2026-04-05_0310.json']) && h.m.has('otisk_main_2026-04-05_0310.json.gz') && h.m.has('otisk_2026-04-05.json'),
      { smazane: h.smazane, uklid: k.uklid });
    test('#550 pojistka úbytku: velké kopie ostrého webu a starý tvar se s kopií testu neporovnávají',
      !ctx.volani.some(v => v[1] && v[1].akce === 'retence-varovani-disk') && !k.uklid.duvod, k.uklid);
  }
  {
    const ctx = novyCtx(() => ({ ok: true, zaloha: JSON.parse(J(ZALOHA)), otisk: '2026-10-27', puvod: 'nocni-otisk' }));
    const h = slozka('_Zaloha Netlify DB', { 'otisk_2026-10-20.json': 'x' });
    let chyba = '';
    try { await ctx.proved(h); } catch (e) { chyba = e.message; }
    test('#550 server nehlásí prostředí → chyba, nic se nezapíše ani neohlásí', /nehlásí prostředí/.test(chyba) && h.m.size === 1
      && !ctx.volani.some(v => v[0] === '/api/zaloha_vynuceno'), [chyba, [...h.m.keys()]]);
  }
  {
    /* ostrý web: pojistka úbytku porovnává s předchozí kopií main, ne testu */
    const ctx = novyCtx(() => ({ ok: true, zaloha: JSON.parse(J(ZALOHA)), otisk: '2026-10-27', puvod: 'nocni-otisk', prostredi: 'main', porizena: ZALOHA.porizena }));
    const h = slozka('_Zaloha Netlify DB', { 'otisk_main_2026-10-20_0310.json': velka, 'otisk_test_2026-10-26_0310.json': 'x' });
    const k = await ctx.proved(h);
    const hl = (ctx.volani.find(v => v[1] && v[1].akce === 'retence-varovani-disk') || [])[1];
    test('#550 pojistka úbytku main: porovná s předchozí kopií main (ne s novější kopií testu)', !!hl
      && hl.disk.predSoubor === 'otisk_main_2026-10-20_0310.json' && hl.disk.novySoubor === 'otisk_main_2026-10-27_0310.json.gz' && h.smazane.length === 0, { hl, uklid: k.uklid });
  }
  Date.now = realNow;
  console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
  process.exit(fail ? 1 : 0);
})().catch(e => { Date.now = realNow; console.log('FAIL výjimka', e && e.stack || e); console.log('\n' + ok + ' prošlo, ' + (fail + 1) + ' selhalo'); process.exit(1); });
