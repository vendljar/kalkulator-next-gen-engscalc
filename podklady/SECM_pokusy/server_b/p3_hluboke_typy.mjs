/* SEC-M server-B: reprodukce nálezů fuzzu (p1) jednotlivě.
 *  H) hluboké vnoření (10 000 úrovní, ~20 kB těla) v poli, které server čte — výjimka = 500?
 *  O) obnova: `faze` / `obnovaId` / `rezim` / `zdroj.otisk` jako {"toString":1} — 500?
 *  P) `__proto__` v těle zveřejnění ceníku se uloží do program/db a jde každému v GET /api/program. */
import { priprav, pripravData, F, req, pamet, jsonOf, sada } from './harness.mjs';
const T = sada('p3_hluboke_typy');
const U = await priprav();
await pripravData(U.admin.cookie);
const N = 10000;
const hluboke = (n) => '['.repeat(n) + ']'.repeat(n);
const volej = async (fn, metoda, url, telo, cookie) => {
  try { const r = await req(fn, metoda, url, telo, cookie, { 'content-type': 'application/json' }); return { st: r.status, t: (await r.text()).slice(0, 120) }; }
  catch (e) { return { st: 'VÝJIMKA→500', t: e.constructor.name + ': ' + e.message }; }
};
console.log('--- H) hluboké vnoření (' + N + ' úrovní, ' + (2 * N) + ' B) ---');
const H = [
  ['zakazky POST {zakazka:[[[…]]]}', F.zakazky, '/api/zakazky', '{"zakazka":' + hluboke(N) + '}', 'obch'],
  ['zakazky POST {zakazka:{cislo,x:[[…]]}}', F.zakazky, '/api/zakazky', '{"zakazka":{"cislo":"2026-H-1","x":' + hluboke(N) + '}}', 'obch'],
  ['zakazky POST {zakazka:{…}, navic:[[…]]}', F.zakazky, '/api/zakazky', '{"zakazka":{"cislo":"2026-H-2"},"navic":' + hluboke(N) + '}', 'obch'],
  ['vypocet POST', F.vypocet, '/api/vypocet', '{"zakazka":' + hluboke(N) + '}', 'obch'],
  ['zakaznici POST', F.zakaznici, '/api/zakaznici', '{"zakaznik":{"nazev":"Pokusna","x":' + hluboke(N) + '}}', 'obch'],
  ['analytika POST udalosti den', F.analytika, '/api/analytika', '{"akce":"udalosti","den":{"x":' + hluboke(N) + '}}', 'obch'],
  ['uzivatele POST profil', F.uzivatele, '/api/uzivatele', '{"akce":"profil","jmeno":"x","x":' + hluboke(N) + '}', 'obch'],
  ['program POST (admin)', F.program, '/api/program', '{"cenik":{"x":' + hluboke(N) + '}}', 'admin2'],
  ['popisy POST (admin)', F.popisy, '/api/popisy', '{"texty":{"x":' + hluboke(N) + '}}', 'admin2'],
  ['slovnik POST (admin)', F.slovnik, '/api/slovnik', '{"db":{"x":' + hluboke(N) + '}}', 'admin2'],
  ['firma POST (admin)', F.firma, '/api/firma', '{"udaje":{"x":' + hluboke(N) + '}}', 'admin2'],
  ['controlling POST (admin)', F.controlling, '/api/controlling', '{"data":{"x":' + hluboke(N) + '}}', 'admin2'],
  ['obnova POST náhled soubor.zakazky', F.obnova, '/api/obnova', '{"rezim":"prepsat","nahled":true,"zdroj":{"soubor":{"porizena":"2026-10-01T00:00:00Z","zakazky":{"a.json":{"x":' + hluboke(N) + '}}}}}', 'admin2'],
  ['obnova POST náhled soubor.firma', F.obnova, '/api/obnova', '{"rezim":"prepsat","nahled":true,"zdroj":{"soubor":{"porizena":"2026-10-01T00:00:00Z","firma":{"udaje":{"x":' + hluboke(N) + '}}}}}', 'admin2'],
  ['sablony POST (admin)', F.sablony, '/api/sablony', '{"akce":"zverejnit","x":' + hluboke(N) + '}', 'admin2'],
];
const pet = [];
for (const [n, fn, url, telo, kdo] of H) {
  const v = await volej(fn, 'POST', url, telo, U[kdo].cookie);
  console.log('   ' + n + ' [' + kdo + '] → ' + v.st + ' ' + v.t);
  if (!(typeof v.st === 'number' && v.st < 500)) pet.push(n);
}
T.t('H: žádná cesta nespadne na hlubokém vnoření (500 = ' + pet.length + ': ' + pet.join('; ') + ')', pet.length === 0);

console.log('--- O) obnova s objektem v textovém poli ---');
const O = [['faze', { faze: { toString: 1 } }], ['obnovaId (konec)', { faze: 'konec', obnovaId: { toString: 1 } }],
  ['obnovaId (zrusit)', { faze: 'zrusit', obnovaId: { valueOf: 1, toString: 1 } }], ['rezim', { rezim: { toString: 1 } }],
  ['zdroj.otisk', { rezim: 'doplnit', nahled: true, zdroj: { otisk: { toString: 1 } } }]];
const peto = [];
for (const [n, telo] of O) {
  const v = await volej(F.obnova, 'POST', '/api/obnova', telo, U.admin2.cookie);
  console.log('   obnova ' + n + ' → ' + v.st + ' ' + v.t);
  if (!(typeof v.st === 'number' && v.st < 500)) peto.push(n);
}
T.t('O: obnova nespadne na objektu v textovém poli (500 = ' + peto.join(', ') + ')', peto.length === 0);

console.log('--- P) __proto__ ve zveřejnění ceníku ---');
const db0 = JSON.parse(pamet.get('program/db'));
db0.platny.cenik.marze = (+db0.platny.cenik.marze || 0) + 0.01;   // ať je co zveřejnit
const telo = JSON.stringify({ cenik: db0.platny.cenik, cenikProj: db0.platny.cenikProj, slevy: { minMarze: 0.1, stropy: { 'Obchodník': 0.05 } }, katalog: { pokus: 1 } })
  .replace('"slevy":{', '"slevy":{"__proto__":{"minMarze":0,"stropy":{"Obchodník":1}},')
  .replace('"katalog":{', '"katalog":{"__proto__":{"znecisteno":1},');
const r = await req(F.program, 'POST', '/api/program', telo, U.admin2.cookie);
const ulozeno = pamet.get('program/db');
const g = await (await req(F.program, 'GET', '/api/program', undefined, U.obch.cookie)).text();
console.log('   POST program (admin2) →', r.status, (await jsonOf(r)).chyba || '', '· `__proto__` uložen v program/db:', /"__proto__"/.test(ulozeno), '· v GET obchodníka:', /"__proto__"/.test(g),
  '· Object.prototype čistý:', ({}).znecisteno === undefined && ({}).minMarze === undefined);
const slevy = JSON.parse(g).db.platny.slevy;
const sl = Object.assign({}, slevy);              // jak by klient slil nastavení (vzor SEC-I3)
console.log('   Object.assign({}, slevy) → prototyp výsledku převzat:', Object.getPrototypeOf(sl) !== Object.prototype, '· sl.stropy.Obchodník =', sl.stropy && sl.stropy['Obchodník']);
T.t('P: `__proto__` se do program/db neuloží (třída SEC-I3)', !/"__proto__"/.test(ulozeno));
process.exitCode = T.konec() ? 1 : 0;
