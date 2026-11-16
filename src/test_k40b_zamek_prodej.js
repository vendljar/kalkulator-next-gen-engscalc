/* K40b (#580) — dolní mez data prodeje s razítkem přijetí zámku serverem
 * (K40-S1 + K40-N3) a levná diagnostika rozdílu zámku (K40-S2). Model.
 *
 * K40-S1: čas zámku `kdy` píše prohlížeč a server ho u nového zámku připustí
 * až 400 dní zpět (K7-S5) — prodej šel zapsat do uzavřeného období. Server
 * proto zapíše `zamek.prijato`; mez = max(den(kdy), den(prijato − 7 dní)),
 * pod ni jen vedoucí/administrátor s důvodem, pod den odeslání nikdo.
 * K40-N3: mez nejvýš dnes (zámek 23:55 s hodinami 6 min napřed).
 * K40-S2: zamekDataRozdilCesta kanonizovala oba podstromy na každé úrovni —
 * výsledek musí zůstat stejný jako dřív (referenční kopie níž), čas lineární.
 *
 * Pojistka: nad c664c9e (v11.11.1) sada padá — prodDatumMez, prodVyjimkaText
 * a onlinePrijatoZeServeru neexistují, uloZamekRazitkaDrz `prijato` nedrží,
 * prodServer bere mez nového zámku z času klienta (−300 dní projde) a rozdíl
 * hlubokých dat trvá řádově déle. Smyšlené údaje, žádné ceny. */
const fs = require('fs');
const path = require('path');
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
['./format.js', './preklad.js', './cenik.js', './engine.js'].forEach(f => { try { nacti(f); } catch (e) {} });
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
['./techspec.js', './sleva.js', './zaokrouhleni.js', './podminky.js', './firma.js', './zakazka.js', './zamek.js', './kryci.js', './kryci_proj.js']
  .forEach(f => { try { nacti(f); } catch (e) { /* v Node nemusí jít */ } });
const O = nacti('./objednane.js');
const U = require('./uloziste.js');
const Z = require('./zamek.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));
const DEN = 86400000;
const iso = t => new Date(t).toISOString();

test('prodDatumMez, prodVyjimkaText a PROD_PRIJATO_TOLERANCE_DNI existují', typeof O.prodDatumMez === 'function'
  && typeof O.prodVyjimkaText === 'function' && O.PROD_PRIJATO_TOLERANCE_DNI === 7);
if (typeof O.prodDatumMez !== 'function') { console.log(`\n${ok} OK, ${fail} FAIL`); process.exit(1); }

const ted = Date.now();
const dnes = O.objDnes(ted);
const den = t => O.objDnes(t);
const varZ = (kdy, prijato) => ({ id: 'v1', zamek: Object.assign({ zamceno: true, kdy }, prijato === undefined ? {} : { prijato }) });

console.log('--- K40-S1: mez z razítka přijetí ---');
{
  const v = varZ(iso(ted - 300 * DEN), iso(ted));
  const m = O.prodDatumMez(v, ted);
  test('zámek −300 dní přijatý dnes: mez = dnes − 7 dní, tvrdá mez = den odeslání', m.od === den(ted - 7 * DEN) && m.tvrda === den(ted - 300 * DEN), m);
  test('…prodej téhož dne jako zámek (−300) obchodník → chyba', /nejvýš 7 dní před přijetím/.test(O.prodDatumProblem(den(ted - 300 * DEN), v, ted, { role: 'Obchodník', duvod: 'x' })));
  test('…prodej −5 dní (v toleranci) → platí', O.prodDatumProblem(den(ted - 5 * DEN), v, ted) === '');
  test('…vedoucí s důvodem −30 dní → platí', O.prodDatumProblem(den(ted - 30 * DEN), v, ted, { role: 'Vedoucí', duvod: 'Tisk bez sítě, smlouva podepsána dřív' }) === '');
  test('…administrátor s důvodem −30 dní → platí', O.prodDatumProblem(den(ted - 30 * DEN), v, ted, { role: 'Administrátor', duvod: 'Doloženo e-mailem' }) === '');
  test('…vedoucí bez důvodu → chyba', O.prodDatumProblem(den(ted - 30 * DEN), v, ted, { role: 'Vedoucí', duvod: '' }) !== '');
  test('…vedoucí s důvodem jen z řídicích znaků → chyba', O.prodDatumProblem(den(ted - 30 * DEN), v, ted, { role: 'Vedoucí', duvod: '\u0001\u0002\n\t' }) !== '');
  test('…obchodník s důvodem → chyba', O.prodDatumProblem(den(ted - 30 * DEN), v, ted, { role: 'Obchodník', duvod: 'Mám důvod' }) !== '');
  test('…pod den odeslání ani administrátor s důvodem', /dřív než odeslání nabídky/.test(O.prodDatumProblem(den(ted - 301 * DEN), v, ted, { role: 'Administrátor', duvod: 'Mám důvod' })));
  test('…budoucnost dál neplatí', /budoucnosti/.test(O.prodDatumProblem(den(ted + 2 * DEN), v, ted)));
}
{
  const v = varZ(iso(ted - 300 * DEN));
  test('zámek bez razítka přijetí (uložený před opravou): mez z `kdy` jako dřív', O.prodDatumOd(v, ted) === den(ted - 300 * DEN)
    && O.prodDatumProblem(den(ted - 300 * DEN), v, ted) === '');
  test('…text chyby pod mezí beze změny (K37-N4)', /^Datum prodeje nesmí být dřív než odeslání nabídky \(/.test(O.prodDatumProblem(den(ted - 301 * DEN), v, ted)));
  test('nezamčená varianta mez nemá', O.prodDatumOd({ zamek: null }, ted) === '');
  test('neplatné razítko přijetí se ignoruje', O.prodDatumOd(varZ(iso(ted - 300 * DEN), 'xx'), ted) === den(ted - 300 * DEN));
}
console.log('--- K40-N3: mez nejvýš dnes ---');
{
  /* Pražský den X, čas serveru 23:55, hodiny klienta 6 min napřed → den(kdy) = X + 1. */
  const zaklad = Date.parse('2026-11-10T22:55:00.000Z');   // 23:55 SEČ
  const kdy = iso(zaklad + 6 * 60000), prijato = iso(zaklad);
  const v = varZ(kdy, prijato);
  test('den zámku je zítřek (předpoklad)', den(kdy) === '2026-11-11' && den(zaklad) === '2026-11-10');
  test('N3: mez = dnes (ne zítřek)', O.prodDatumOd(v, zaklad) === '2026-11-10', O.prodDatumMez(v, zaklad));
  test('N3: prodej dnešním dnem projde', O.prodDatumProblem('2026-11-10', v, zaklad) === '');
  test('N3: prodej včerejším dnem ne', O.prodDatumProblem('2026-11-09', v, zaklad) !== '');
  test('N3: i bez razítka přijetí mez nejvýš dnes', O.prodDatumOd(varZ(kdy), zaklad) === '2026-11-10');
}
console.log('--- důvod výjimky ---');
test('prodVyjimkaText: řídicí znaky pryč, ořez, ne-text → ""', O.prodVyjimkaText(' a\u0000b\nc ') === 'a b c'
  && O.prodVyjimkaText('x'.repeat(2000)).length === 500 && O.prodVyjimkaText(42) === '' && O.prodVyjimkaText(null) === '');

console.log('--- prodNastav (klient) ---');
{
  const zak = novaZakazka(); zak.cislo = '2026 - OPR - CN - 8901';
  const v = zak.varianty[0];
  v.zamek = { zamceno: true, kdy: iso(ted - 100 * DEN), prijato: iso(ted), typ: 'nabidkaTisk' };
  test('obchodník −20 dní → chyba', O.prodNastav(zak, v, den(ted - 20 * DEN), { ted, role: 'Obchodník', duvod: 'abc' }) !== '' && !v.prodano);
  test('vedoucí −20 dní s důvodem → zapsáno s důvodem výjimky', O.prodNastav(zak, v, den(ted - 20 * DEN), { ted, role: 'Vedoucí', duvod: 'Podpis\u0007 doložen' }) === ''
    && v.prodano && v.prodano.vyjimka === 'Podpis  doložen', v.prodano);
  delete v.prodano;
  test('vedoucí v toleranci → bez výjimky', O.prodNastav(zak, v, dnes, { ted, role: 'Vedoucí', duvod: 'abc' }) === '' && v.prodano && v.prodano.vyjimka === undefined, v.prodano);
}

console.log('--- prodJedinaZmena: razítko přijetí není změna ---');
{
  const zak = novaZakazka(); zak.cislo = '2026 - OPR - CN - 8902';
  const v = zak.varianty[0];
  v.zamek = { zamceno: true, kdy: iso(ted - DEN), typ: 'nabidkaTisk', prijato: iso(ted - DEN) };
  const ulozeno = JSON.stringify(zak);
  const okno = kopie(zak); delete okno.varianty[0].zamek.prijato;
  test('jen chybějící prijato v okně → není to prodej ani změna', O.prodJedinaZmena(okno, ulozeno) === false);
  okno.varianty[0].prodano = { datum: dnes, kdo: 'a', kdy: iso(ted) };
  test('Prodáno od klienta bez razítka přijetí → jediná změna je prodej', O.prodJedinaZmena(okno, ulozeno) === true);
  const ok2 = kopie(okno); ok2.varianty[0].zamek.prijato = '2001-01-01T00:00:00.000Z';
  test('…i s podvrženým razítkem (server ho stejně nepřevezme)', O.prodJedinaZmena(ok2, ulozeno) === true);
}

console.log('--- prodServer: odkud se bere razítko přijetí ---');
const relO = { email: 'obch.k40b@priklad.cz', role: 'Obchodník' };
const relV = { email: 'ved.k40b@priklad.cz', role: 'Vedoucí' };
const zakSZamkem = (kdy, prijato) => {
  const z = novaZakazka(); z.cislo = '2026 - OPR - CN - 8903'; z.autor = relO.email;
  z.varianty[0].zamek = Object.assign({ zamceno: true, kdy, typ: 'nabidkaTisk' }, prijato ? { prijato } : {});
  return z;
};
{
  /* Nová zakázka se zámkem i prodejem v jednom požadavku: mez z času serveru. */
  const z = zakSZamkem(iso(ted - 300 * DEN), '2001-01-01T00:00:00.000Z');   // podvržené prijato
  z.varianty[0].prodano = { datum: den(ted - 300 * DEN) };
  const r = O.prodServer(null, z, relO, { ted });
  test('nová zakázka se zámkem −300 dní a prodejem téhož dne → 400', r && r.status === 400, r);
  const z2 = zakSZamkem(iso(ted - 300 * DEN), iso(ted - 400 * DEN));
  z2.varianty[0].prodano = { datum: den(ted - 5 * DEN) };
  test('…prodej −5 dní → v pořádku (podvržené prijato se nečte)', O.prodServer(null, z2, relO, { ted }) === null);
  const z3 = zakSZamkem(iso(ted - 300 * DEN));
  z3.varianty[0].prodano = { datum: den(ted - 200 * DEN), vyjimka: 'Smlouva podepsána v terénu' };
  test('vedoucí s důvodem −200 dní → v pořádku a důvod v historii', O.prodServer(null, z3, relV, { ted }) === null
    && z3.prodejHistorie && z3.prodejHistorie[0].duvod === 'Smlouva podepsána v terénu' && !('vyjimka' in z3.varianty[0].prodano), z3.prodejHistorie);
  const z4 = zakSZamkem(iso(ted - 300 * DEN));
  z4.varianty[0].prodano = { datum: den(ted - 200 * DEN), vyjimka: 'Smlouva podepsána v terénu' };
  test('obchodník (autor) s důvodem −200 dní → 400', (O.prodServer(null, z4, relO, { ted }) || {}).status === 400);
  const z5 = zakSZamkem(iso(ted - 300 * DEN));
  z5.varianty[0].prodano = { datum: den(ted - 3 * DEN), vyjimka: 'zbytečný důvod' };
  test('prodej v toleranci: důvod se do historie nepíše', O.prodServer(null, z5, relO, { ted }) === null && z5.prodejHistorie[0].duvod === '');
}
{
  /* Uložený zámek: razítko z uložené verze; podvržené v příchozích datech nic nezmění. */
  const stara = zakSZamkem(iso(ted - 300 * DEN), iso(ted - 2 * DEN));
  const z = kopie(stara); z.varianty[0].zamek.prijato = iso(ted - 300 * DEN);
  z.varianty[0].prodano = { datum: den(ted - 100 * DEN) };
  test('uložený zámek přijatý před 2 dny: podvržené starší prijato mez neposune → 400', (O.prodServer(stara, z, relO, { ted }) || {}).status === 400);
  const z2 = kopie(stara); delete z2.varianty[0].zamek.prijato;
  z2.varianty[0].prodano = { datum: den(ted - 8 * DEN) };
  test('…klient bez prijato: mez z uložené verze (−9 dní projde)', O.prodServer(stara, z2, relO, { ted }) === null);
  const staraBez = zakSZamkem(iso(ted - 300 * DEN));
  const z3 = kopie(staraBez); z3.varianty[0].zamek.prijato = iso(ted);
  z3.varianty[0].prodano = { datum: den(ted - 250 * DEN) };
  test('uložený zámek bez prijato (před opravou): mez z `kdy`, podvržené prijato se nečte', O.prodServer(staraBez, z3, relO, { ted }) === null);
}
{
  /* Obnova ze souboru (otázka 3a): nový zámek bez razítka → mez z `kdy`. */
  const z = zakSZamkem(iso(ted - 200 * DEN), iso(ted));
  z.varianty[0].prodano = { datum: den(ted - 150 * DEN) };
  test('obnova ze souboru: starší prodej se obnoví (mez z kdy, razítko ze souboru se nečte)', O.prodServer(null, z, relO, { ted, obnova: true, zeSouboru: true }) === null);
}

console.log('--- uloZamekRazitkaDrz drží prijato ---');
{
  const stara = { varianty: [{ id: 'a', zamek: { zamceno: true, kdy: iso(ted), kdo: 'x', prijato: iso(ted - DEN) } },
    { id: 'b', zamek: { zamceno: true, kdy: iso(ted), kdo: 'x' } }] };
  const nova = kopie(stara);
  nova.varianty[0].zamek.prijato = '2001-01-01T00:00:00.000Z';
  nova.varianty[1].zamek.prijato = '2001-01-01T00:00:00.000Z';
  U.uloZamekRazitkaDrz(stara, nova);
  test('uložené razítko se drží, podvržené se nahradí', nova.varianty[0].zamek.prijato === iso(ted - DEN));
  test('zámek bez razítka ho od klienta nedostane', !('prijato' in nova.varianty[1].zamek));
  test('prijato není v klíči zámku (starší klient bez 409)', U.uloZamekKlic(nova.varianty[0]) === U.uloZamekKlic(Object.assign({}, nova.varianty[0], { zamek: Object.assign({}, nova.varianty[0].zamek, { prijato: undefined }) })));
}

console.log('--- onlinePrijatoZeServeru (prohlížeč) ---');
{
  const ui = fs.readFileSync(path.join(__dirname, 'ui', 'online_ui.js'), 'utf8');
  const i = ui.indexOf('function onlinePrijatoZeServeru(');
  test('onlinePrijatoZeServeru v online_ui.js', i >= 0);
  if (i >= 0) {
    const konec = ui.indexOf('\n}\n', i);
    const f = new Function(ui.slice(i, konec + 2) + '\nreturn onlinePrijatoZeServeru;')();
    const zak = { varianty: [{ id: 'a', zamek: { zamceno: true } }, { id: 'b', zamek: null }, { id: 'c', zamek: { zamceno: true } }, { id: 'd', zamek: { zamceno: false } }] };
    const n = f(zak, { a: '2026-11-11T10:00:00.000Z', b: '2026-11-11T10:00:00.000Z', c: 5, d: '2026-11-11T10:00:00.000Z', __proto__: { x: 1 } });
    test('dopíše razítko jen zamčeným variantám s textovou hodnotou', n === 1 && zak.varianty[0].zamek.prijato === '2026-11-11T10:00:00.000Z'
      && zak.varianty[1].zamek === null && !('prijato' in zak.varianty[2].zamek) && !('prijato' in zak.varianty[3].zamek));
    test('starší server bez pole → nic', f(zak, undefined) === 0);
  }
  test('uložení předává zamkyPrijato do okna i do „naposledy uloženo"', /onlinePrijatoZeServeru\(ZAK, o\.zamkyPrijato\)/.test(ui)
    && /onlinePrijatoZeServeru\(z, zamkyPrijato\)/.test(ui)
    && /onlineOdeslanoSRazitkem\(odeslanoText, o\.razitko, o\.zamkyPrijato\)/.test(ui));
}

console.log('--- K40-S2: rozdíl zamčených dat ---');
/* Referenční kopie zamekDataRozdilCesta z c664c9e (kanonizace na každé úrovni). */
function referencni(data, ulozena, v) {
  let a, b;
  try { a = JSON.parse(Z.zamekDataPorovnani(data, v)); b = JSON.parse(Z.zamekDataPorovnani(ulozena, v)); }
  catch (e) { return ''; }
  const cesta = [];
  let pozn = '';
  const druh = (h) => (h === undefined || h === null) ? 'chybi' : (Array.isArray(h) ? 'pole' : typeof h);
  const jdi = (x, y) => {
    if (Z.zamekJsonKanon(x) === Z.zamekJsonKanon(y)) return false;
    if (x && y && typeof x === 'object' && typeof y === 'object' && Array.isArray(x) === Array.isArray(y)) {
      const klice = Array.isArray(x) ? Array.from({ length: Math.max(x.length, y.length) }, (_, i) => String(i))
        : Array.from(new Set(Object.keys(x).concat(Object.keys(y)))).sort();
      for (const k of klice) {
        cesta.push(k);
        if (jdi(x[k], y[k])) return true;
        cesta.pop();
      }
    }
    const dx = druh(x), dy = druh(y);
    if (dx === 'chybi' && dy !== 'chybi') pozn = ' (chybí v ukládané)';
    else if (dy === 'chybi' && dx !== 'chybi') pozn = ' (chybí v uložené)';
    else if (dx !== dy) pozn = ' (jiný typ)';
    return true;
  };
  if (!jdi(a, b)) return '';
  const t = cesta.map(k => String(k).replace(/[\u0000-\u001f]/g, ' ')).join('.');
  return (t || '(celá data)').slice(0, 200 - pozn.length) + pozn;
}
test('zamekJsonKanon a zamekDataPorovnani exportované', typeof Z.zamekJsonKanon === 'function' && typeof Z.zamekDataPorovnani === 'function');
{
  /* Náhodné páry (deterministický generátor): stejné cesty jako referenční. */
  let seme = 12345;
  const nah = n => { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme % n; };
  const gen = (h) => {
    const r = nah(10);
    if (h > 3 || r < 3) return [0, 1, 'a', '', null, true, false, 2.5, 'x\u0001y'][nah(9)];
    if (r < 6) return Array.from({ length: nah(4) }, () => gen(h + 1));
    const o = {};
    for (let i = nah(5); i > 0; i--) o[['a', 'b', 'c', '10', '2', '__proto__', 'x.y', 'k\u0002'][nah(8)]] = gen(h + 1);
    return o;
  };
  const mutuj = (x, h) => {
    if (!x || typeof x !== 'object' || nah(4) === 0) return gen(h);
    const k = Array.isArray(x) ? (x.length ? nah(x.length + 1) : 0) : (Object.keys(x)[nah(Object.keys(x).length + 1)] || 'novy');
    const c = Array.isArray(x) ? x.slice() : Object.assign({}, x);
    if (nah(5) === 0) { if (Array.isArray(c)) c.pop(); else delete c[k]; } else c[k] = mutuj(c[k], h + 1);
    return c;
  };
  const v = { id: 'v', zamek: null };
  let shoda = 0, celkem = 0, rozdil = [];
  for (let i = 0; i < 3000; i++) {
    const a = { ock: gen(0), proj: gen(0) };
    const b = nah(6) === 0 ? kopie(a) : { ock: mutuj(a.ock, 0), proj: nah(2) ? a.proj : mutuj(a.proj, 0) };
    const n1 = Z.zamekDataRozdilCesta(a, b, v), n2 = referencni(a, b, v);
    celkem++; if (n1 === n2) shoda++; else if (rozdil.length < 3) rozdil.push([n1, n2, a, b]);
  }
  test('3 000 náhodných párů: cesta beze změny proti referenční implementaci', shoda === celkem, rozdil);
}
{
  /* Zamčená varianta s 10 šachtami v ock.dalsi (víc šachet #570). */
  const zak = novaZakazka();
  const vz = zak.varianty[0];
  vz.data.ock.dalsi = Array.from({ length: 10 }, () => ({ zadani: kopie(vz.data.ock.zadani), pocet: 1 }));
  vz.zamek = { zamceno: true, kdy: iso(ted), typ: 'nabidkaTisk' };
  const d2 = kopie(vz.data); d2.ock.dalsi[3].zadani.sirka = 2.4;
  const c = Z.zamekDataRozdilCesta(d2, vz.data, vz);
  test('10 šachet: cesta ock.dalsi.3.zadani.sirka', c === 'ock.dalsi.3.zadani.sirka' && c === referencni(d2, vz.data, vz), c);
  const d3 = kopie(vz.data); delete d3.ock.dalsi[9].pocet;
  test('…chybějící pole hlásí stranu', Z.zamekDataRozdilCesta(d3, vz.data, vz) === referencni(d3, vz.data, vz)
    && / \(chybí v ukládané\)$/.test(Z.zamekDataRozdilCesta(d3, vz.data, vz)));
  test('…shoda → prázdná cesta', Z.zamekDataRozdilCesta(kopie(vz.data), vz.data, vz) === '');
}
{
  /* Hloubka 50, ~2 000 objektů, rozdíl úplně dole. */
  const stavej = () => {
    let x = { list: 'konec' };
    for (let h = 0; h < 50; h++) {
      const o = { dalsi: x };
      for (let j = 0; j < 40; j++) o['s' + j] = { a: h, b: [j, 'x'] };
      x = o;
    }
    return x;
  };
  const a = { ock: stavej() }, b = { ock: stavej() };
  let y = b.ock; while (y.dalsi) y = y.dalsi; y.list = 'jinak';
  const v = { id: 'v', zamek: null };
  const t0 = process.hrtime.bigint();
  const c = Z.zamekDataRozdilCesta(a, b, v);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const t1 = process.hrtime.bigint();
  const cr = referencni(a, b, v);
  const msRef = Number(process.hrtime.bigint() - t1) / 1e6;
  const t2 = process.hrtime.bigint();
  Z.zamekDataPorovnani(a, v); Z.zamekDataPorovnani(b, v);
  const msKanon = Number(process.hrtime.bigint() - t2) / 1e6;
  console.log('    čas: nový ' + ms.toFixed(1) + ' ms, referenční ' + msRef.toFixed(1) + ' ms, dvě kanonizace ' + msKanon.toFixed(1) + ' ms');
  test('hloubka 50: táž cesta (ořez 200 znaků)', c === cr && c.length <= 200, [c.length, cr.length]);
  test('hloubka 50: diagnostika nejvýš ~3× dvě kanonizace (lineární) a pod polovinou referenční', ms <= Math.max(3 * msKanon, 5) + 5 && ms < msRef / 2, [ms, msKanon, msRef]);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
