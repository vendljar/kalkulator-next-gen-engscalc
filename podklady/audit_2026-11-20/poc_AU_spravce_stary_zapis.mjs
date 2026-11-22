/* PoC AU-2 (audit 20. 11. 2026, čočka AU): zásah správce zapisuje CELÝ účet
 * přečtený před potvrzením hesla správce (zbytek meze B156) — a tím vrátí
 * i verzi hesla a otisk hesla, které si uživatel mezitím změnil.
 *
 * Děj: oběť zjistí, že jí někdo vzal cookie (sdílený počítač), a (a) odhlásí
 * se „všude", nebo (b) změní si heslo. Ve stejné chvíli správce dokončuje
 * akci nad jejím účtem, která chce jeho heslo (povýšení na Administrátora;
 * mezi čtením účtu a zápisem leží počítadla pokusů, čekání brzdy a scrypt).
 * Zápis správce vrátí účet do stavu před zásahem oběti: ukradená cookie zase
 * platí, staré heslo zase platí, nová cookie oběti neplatí.
 *
 * Úložiště: paměť; čtení/zápis úložiště „pokusy" trvá 5 ms (síťové volání
 * Blobs), u počítadla správce 60 ms — tím se napodobuje čekání brzdy
 * (`pockej`, v ostrém běhu 0–2 s podle předchozích neúspěchů správce;
 * s paměťovým úložištěm se nečeká). Okno v ostrém běhu = dva zápisy a dvě
 * čtení Blobs + scrypt + čekání brzdy.
 *   node podklady/audit_2026-11-20/poc_AU_spravce_stary_zapis.mjs
 * Bez sítě, smyšlené účty @priklad.cz. */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const R = path.resolve(process.env.KNG_STROM || new URL('../..', import.meta.url).pathname) + '/';
const imp = (p) => import(pathToFileURL(R + p).href);
process.env.TAJEMSTVI_RELACE = 'testovaci-poc-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
const pamet = new Map();
const cekej = (ms) => new Promise(r => setTimeout(r, ms));
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { if (nazev === 'pokusy') await cekej(/spravce@/.test(k) ? 60 : 5); return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { if (nazev === 'pokusy') await cekej(/spravce@/.test(k) ? 60 : 5); if (v === null) pamet.delete(nazev + '/' + k); else pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const { default: prihlaseni } = await imp('netlify/functions/prihlaseni.mjs');
const { default: odhlaseni } = await imp('netlify/functions/odhlaseni.mjs');
const { default: ja } = await imp('netlify/functions/ja.mjs');
const { default: uzivatele } = await imp('netlify/functions/uzivatele.mjs');
const J = { 'content-type': 'application/json' };
const post = (fn, cesta, telo, h) => fn(new Request('http://x' + cesta, { method: 'POST', headers: { ...J, ...(h || {}) }, body: JSON.stringify(telo) }));
const prihlas = (email, heslo) => post(prihlaseni, '/api/prihlaseni', { email, heslo });
const cookieZ = (r) => (r.headers.get('set-cookie') || '').split(';')[0];
const kdo = async (cookie) => (await ja(new Request('http://x/api/ja', { headers: { cookie } }))).status;
const cA = cookieZ(await prihlas('spravce@priklad.cz', 'Docasne.Heslo.123'));
const zaloz = (e, h) => post(uzivatele, '/api/uzivatele', { akce: 'zaloz', email: e, jmeno: 'Účet', role: 'Obchodník', heslo: h }, { cookie: cA });
let zranitelne = 0;

/* ---------- (a) odhlášení „všude" proti zásahu správce ---------- */
await zaloz('obet-a@priklad.cz', 'PuvodniHeslo1');
const ukradena = cookieZ(await prihlas('obet-a@priklad.cz', 'PuvodniHeslo1'));   // tuhle cookie má i útočník
const spravce = post(uzivatele, '/api/uzivatele', { akce: 'role', email: 'obet-a@priklad.cz', role: 'Administrátor',
  hesloSpravce: 'Docasne.Heslo.123' }, { cookie: cA });                       // účet oběti už přečetl, teď ověřuje své heslo
await cekej(5);
const odh = await post(odhlaseni, '/api/odhlaseni', {}, { cookie: ukradena }); // oběť: odhlásit všude
const poOdhlaseni = await kdo(ukradena);
const rs = await spravce;
const poZasahu = await kdo(ukradena);
console.log('(a) odhlášení HTTP ' + odh.status + ' → ukradená cookie hned po odhlášení: ' + poOdhlaseni
  + '; zásah správce HTTP ' + rs.status + ' → ukradená cookie po zásahu: ' + poZasahu);
if (poOdhlaseni === 401 && poZasahu === 200) { zranitelne++; console.log('    → odhlášená relace OŽILA (a účet je teď Administrátor)'); }

/* ---------- (b) změna hesla proti zásahu správce ---------- */
await zaloz('obet-b@priklad.cz', 'PuvodniHeslo1');
const ukradenaB = cookieZ(await prihlas('obet-b@priklad.cz', 'PuvodniHeslo1'));
const spravceB = post(uzivatele, '/api/uzivatele', { akce: 'role', email: 'obet-b@priklad.cz', role: 'Administrátor',
  hesloSpravce: 'Docasne.Heslo.123' }, { cookie: cA });
await cekej(5);
const zmena = await post(uzivatele, '/api/uzivatele', { akce: 'mojeheslo', stare: 'PuvodniHeslo1', nove: 'NoveBezpecne12' }, { cookie: ukradenaB });
const novaCookie = cookieZ(zmena);
const hned = { stara: await kdo(ukradenaB), nova: await kdo(novaCookie) };
await spravceB;
const pak = { stara: await kdo(ukradenaB), nova: await kdo(novaCookie),
  stareHeslo: (await prihlas('obet-b@priklad.cz', 'PuvodniHeslo1')).status, noveHeslo: (await prihlas('obet-b@priklad.cz', 'NoveBezpecne12')).status };
console.log('(b) změna hesla HTTP ' + zmena.status + ' → hned: stará cookie ' + hned.stara + ', nová ' + hned.nova
  + '; po zásahu správce: stará cookie ' + pak.stara + ', nová ' + pak.nova + ', přihlášení starým heslem ' + pak.stareHeslo + ', novým ' + pak.noveHeslo);
if (hned.stara === 401 && pak.stara === 200 && pak.stareHeslo === 200) { zranitelne++; console.log('    → změna hesla se tiše VRÁTILA: platí staré heslo i stará cookie'); }

console.log('\n' + (zranitelne
  ? 'ZRANITELNÉ: zásah správce vrátil verzi hesla účtu (' + zranitelne + ' ze 2 scénářů) — zneplatněná relace znovu platí.'
  : 'ODOLNÉ: zásah správce verzi hesla ani otisk nevrátil.'));
process.exit(0);
