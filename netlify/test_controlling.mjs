/* CONTROLLING ONLINE (#447, dávka C1, 20. 10. 2026) — serverová sada.
 *
 * /api/controlling: čtení a zápis číselníku nákladových skupin a mapování
 * klíčů ceníku. Ověřuje:
 *   – práva (jen administrátor; matice v test_prava.mjs to měří po rolích),
 *   – verze a historii (historie jde ven bez dat),
 *   – odmítnutí vadných dat, prázdného zápisu a příliš velkého těla,
 *   – zálohu (záloha nese `controlling`) a obnovu touž očistou jako zápis
 *     (otrávený záznam ze zálohy se neobnoví). */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

import prihlaseni from './functions/prihlaseni.mjs';
import uzivatele from './functions/uzivatele.mjs';
import controllingFn from './functions/controlling.mjs';
import zaloha from './functions/zaloha.mjs';
import obnova from './functions/obnova.mjs';
import { ADMIN_EMAIL } from './lib/sdilene.mjs';
import { KOPIE_DISK_CASTI } from './lib/zalohovani.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../src/controlling.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 400))); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST',
  headers: cookie ? { cookie } : {}, body: typeof telo === 'string' ? telo : JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const ulz = (n) => globalThis.__TEST_ULOZISTE(n);
const kopie = (x) => JSON.parse(JSON.stringify(x));
const URL_C = 'http://x/api/controlling';

const r1 = await post(prihlaseni, 'http://x/api/prihlaseni', { email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' });
const cAdmin = (r1.headers.get('set-cookie') || '').split(';')[0];
test('administrátor se přihlásí', (await r1.json()).ok === true);
await post(uzivatele, 'http://x/api/uzivatele',
  { akce: 'zaloz', email: 'vedouci@priklad.cz', jmeno: 'Test Vedoucí', role: 'Vedoucí', heslo: 'VedouciHeslo1' }, cAdmin);
const r2 = await post(prihlaseni, 'http://x/api/prihlaseni', { email: 'vedouci@priklad.cz', heslo: 'VedouciHeslo1' });
const cVed = (r2.headers.get('set-cookie') || '').split(';')[0];
test('vedoucí se přihlásí', !!cVed);

/* ---- čtení a práva ---- */
const g0 = await (await get(controllingFn, URL_C, cAdmin)).json();
test('prázdná databáze: GET vrátí db null', g0.ok === true && g0.db === null, g0);
test('vedoucí controlling nečte (403)', (await get(controllingFn, URL_C, cVed)).status === 403);
test('vedoucí controlling nezapíše (403)', (await post(controllingFn, URL_C, { data: C.ctrlVychozi() }, cVed)).status === 403);
test('nepřihlášený nic (401)', (await get(controllingFn, URL_C)).status === 401);
test('jiná metoda → 405', (await controllingFn(new Request(URL_C, { method: 'DELETE', headers: { cookie: cAdmin } }))).status === 405);

/* ---- zápis a verze ---- */
const p1 = await (await post(controllingFn, URL_C, { data: C.ctrlVychozi(), poznamka: 'výchozí rozvržení A. Mácové' }, cAdmin)).json();
test('první zápis = verze 1', p1.ok === true && p1.verze === 1, p1);
const p1b = await post(controllingFn, URL_C, { data: C.ctrlVychozi() }, cAdmin);
test('stejná data znovu → 400 „není co ukládat"', p1b.status === 400 && /neliší/.test((await p1b.json()).chyba));
const d2 = C.ctrlVychozi(); d2.mapa['K.k7'] = 'mat-ostatni'; d2.skupiny[0].ucetBudouci = ['512001', '512002'];
const p2 = await (await post(controllingFn, URL_C, { data: d2, poznamka: 'zařazena trvalá položka', kdo: 'podvrh@priklad.cz' }, cAdmin)).json();
test('druhý zápis = verze 2', p2.ok === true && p2.verze === 2, p2);
const g2 = await (await get(controllingFn, URL_C, cAdmin)).json();
test('GET vrátí platnou verzi 2 s daty a autorem z relace',
  g2.db.platny.verze === 2 && g2.db.platny.kdo === ADMIN_EMAIL && g2.db.platny.data.mapa['K.k7'] === 'mat-ostatni', g2.db.platny);
test('historie jde ven bez dat', g2.db.historie.length === 1 && g2.db.historie[0].verze === 1
  && g2.db.historie[0].data === undefined && !!g2.db.historie[0].platnoDo, g2.db.historie);
const ulozeno = await ulz('program').cti('controlling');
test('v úložišti historie data nese (pro zálohu)', !!ulozeno.historie[0].data);
test('klient nepodvrhne autora: kdo je z relace', !JSON.stringify(ulozeno).includes('podvrh'));

/* ---- odmítnutí ---- */
const pred = JSON.stringify(await ulz('program').cti('controlling'));
const zle = async (jm, telo) => {
  const r = await post(controllingFn, URL_C, telo, cAdmin);
  test('odmítne ' + jm + ' (400)', r.status === 400, r.status);
};
await zle('tělo null', null);
await zle('tělo pole', []);
await zle('chybějící data', { poznamka: 'x' });
{ const d = C.ctrlVychozi(); d.mapa['C.transportKc'] = 'neni-takova'; await zle('mapování na neznámou skupinu', { data: d }); }
{ const d = C.ctrlVychozi(); d.mapa = JSON.parse('{"__proto__":"cestovne"}'); await zle('klíč __proto__', { data: d }); }
{ const d = C.ctrlVychozi(); d.skupiny = d.skupiny.filter(s => s.id !== 'nezarazeno'); await zle('zrušení skupiny Nezařazeno', { data: d }); }
{ const d = C.ctrlVychozi(); d.skupiny[1].typ = 'cokoli'; await zle('neznámý typ nákladu', { data: d }); }
await zle('nevalidní JSON', '{nevalidni');
{ const d = C.ctrlVychozi(); d.skupiny[0].manVysl = 'x'.repeat(C.CTRL_MEZE.telo + 10);
  const r = await post(controllingFn, URL_C, { data: d }, cAdmin);
  test('příliš velké tělo → 413', r.status === 413, r.status);
  const rH = await controllingFn(new Request(URL_C, { method: 'POST',
    headers: { cookie: cAdmin, 'content-length': String(C.CTRL_MEZE.telo + 1) }, body: '{}' }));
  test('hlášená délka těla nad strop → 413 dřív, než se tělo čte', rH.status === 413, rH.status); }
test('odmítnuté pokusy nic nezapsaly', JSON.stringify(await ulz('program').cti('controlling')) === pred);

/* ---- záloha a obnova ---- */
const zal = (await (await get(zaloha, 'http://x/api/zaloha', cAdmin)).json()).zaloha;
test('záloha nese controlling s historií', !!zal.controlling && zal.controlling.platny.verze === 2
  && zal.controlling.historie.length === 1, zal.controlling && zal.controlling.platny);
test('kopie na Disk controlling nese (povolený seznam částí)', KOPIE_DISK_CASTI.includes('controlling'));
await ulz('program').zapis('controlling', null);
const ob = await (await post(obnova, 'http://x/api/obnova',
  { zdroj: { soubor: zal }, rezim: 'doplnit', potvrzeni: 'OBNOVIT', casti: ['controlling'] }, cAdmin)).json();
const poObnove = await ulz('program').cti('controlling');
test('obnova vrátí controlling ze zálohy', ob.ok === true && !!poObnove && poObnove.platny.verze === 2
  && poObnove.platny.data.mapa['K.k7'] === 'mat-ostatni', ob.casti && ob.casti.controlling);
const nahled = await (await post(obnova, 'http://x/api/obnova',
  { zdroj: { soubor: zal }, rezim: 'prepsat', nahled: true, casti: ['controlling'] }, cAdmin)).json();
test('náhled obnovy uvádí část controlling', !!(nahled.casti && nahled.casti.controlling), nahled.casti && Object.keys(nahled.casti));
const otrava = kopie(zal); otrava.controlling.platny.data.mapa['C.transportKc'] = 'neni-takova';
const predOtr = JSON.stringify(await ulz('program').cti('controlling'));
const o1 = await (await post(obnova, 'http://x/api/obnova',
  { zdroj: { soubor: otrava }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['controlling'] }, cAdmin)).json();
test('otrávený záznam ze zálohy se neobnoví (přeskočeno, beze změny)',
  o1.ok === true && o1.casti.controlling.preskocene === 1 && JSON.stringify(await ulz('program').cti('controlling')) === predOtr, o1.casti);
const vadnaHist = kopie(zal); vadnaHist.controlling.historie[0].data = { skupiny: [] };
vadnaHist.controlling.platny.poznamka = 'z vadné historie';
const o2 = await (await post(obnova, 'http://x/api/obnova',
  { zdroj: { soubor: vadnaHist }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['controlling'] }, cAdmin)).json();
const poO2 = await ulz('program').cti('controlling');
test('vadná starší verze vypadne, platná se obnoví', o2.ok === true && poO2.platny.poznamka === 'z vadné historie'
  && poO2.historie.length === 0, o2.casti);

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
