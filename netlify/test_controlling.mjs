/* CONTROLLING ONLINE (#447, dávka C1, 20. 10. 2026) — serverová sada.
 *
 * /api/controlling: čtení a zápis číselníku nákladových skupin a mapování
 * klíčů ceníku. Ověřuje:
 *   – práva (jen administrátor; matice v test_prava.mjs to měří po rolích),
 *   – verze a historii (historie jde ven bez dat),
 *   – odmítnutí vadných dat, prázdného zápisu a příliš velkého těla,
 *   – zálohu (záloha nese `controlling`) a obnovu touž očistou jako zápis
 *     (otrávený záznam ze zálohy se neobnoví);
 *   – C3 (21. 10. 2026): /api/controlling/export — hromadný export za období
 *     jen pro správce, výběr podle dne zamčení v českém čase, řada, oblast,
 *     přeskočené zakázky, protokol exportů a strop 413. */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
const pamet = new Map();
/* #504: zpoždění čtení zakázky (ms) — simulace úložiště Blobs pro souběh a časový rozpočet. */
let zpozdeni = 0;
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) {
    if (zpozdeni && nazev === 'zakazky' && k.startsWith('z/')) await new Promise(r => setTimeout(r, zpozdeni));
    return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

import prihlaseni from './functions/prihlaseni.mjs';
import uzivatele from './functions/uzivatele.mjs';
import controllingFn from './functions/controlling.mjs';
import controllingExport from './functions/controlling_export.mjs';
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
const p1 = await (await post(controllingFn, URL_C, { data: C.ctrlVychozi(), poznamka: 'výchozí rozvržení controllingu' }, cAdmin)).json();
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

/* ---- C3: hromadný export za období (/api/controlling/export) ---- */
{
  const G = globalThis;
  const URL_E = 'http://x/api/controlling/export';
  const JEKLY = require('../src/jekly.json');
  const zamcena = (cislo, kdy, rada) => {
    const zak = G.novaZakazka();
    zak.cislo = cislo; zak.nazevAkce = 'Akce ' + cislo; zak.objednatel = 'Zkušební zákazník s.r.o.';
    const v = zak.varianty[0];
    Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2 });
    if (rada) v.data.cenikRada = rada;
    G.zamkniVariantu(v, { cislo: G.variantaCislo(zak, v), kdo: 'admin@priklad.cz', typ: 'nabidka',
      vysledek: G.zamekVysledekSpocti(v, JEKLY, 'test') });
    v.zamek.kdy = kdy;
    return zak;
  };
  const sZ = ulz('zakazky');
  const rejstrik = [];
  const vloz = async (zak, upravit) => {
    const soubor = G.uloJmenoSouboru(zak);
    await sZ.zapis('z/' + soubor, zak);
    /* Razítko úpravy jako na serveru: uložení po zamčení. */
    const zam = zak.varianty[0].zamek;
    const z = G.uloRejstrikZaznam(zak, { soubor, razitko: zam ? new Date(Date.parse(zam.kdy) + 60000).toISOString() : '' });
    if (upravit) upravit(z);
    rejstrik.push(z);
    await sZ.zapis('_rejstrik', { schema: 1, zakazky: rejstrik });
    return soubor;
  };
  await vloz(zamcena('2026 - OPR - CN - 0801', '2026-10-05T09:00:00Z'));
  await vloz(zamcena('2026 - OPR - CN - 0802', '2026-10-31T23:30:00Z'));          // v Praze už 1. 11.
  await vloz(zamcena('2026 - OPR - CN - 0803', '2026-09-20T09:00:00Z'));          // mimo období
  await vloz(zamcena('2026 - OPR - CN - 0804', '2026-10-12T09:00:00Z', 'zahr'));
  { const z = zamcena('2026 - OPR - CN - 0805', '2026-10-15T09:00:00Z'); z.varianty[0].zamek = null; await vloz(z, r => { r.odeslane = 1; }); }
  /* C5: řídící nezamčená, zamčená je jen neřídící varianta (2. 11.) — vyveze se ona, označená. */
  { const z = zamcena('2026 - OPR - CN - 0806', '2026-11-02T09:00:00Z');
    const v2 = JSON.parse(JSON.stringify(z.varianty[0])); v2.id = 'v-ridici-rozpracovana'; v2.zamek = null;
    z.varianty.forEach(x => { x.ridici = false; }); v2.ridici = true; z.varianty.push(v2);
    await vloz(z, r => { r.upraveno = '2026-11-02T09:01:00Z'; }); }
  await sZ.zapis('z/rozbita.json', { schema: 2, varianty: 'nesmysl' });
  rejstrik.push({ soubor: 'rozbita.json', cislo: 'ROZBITA', odeslane: 1, upraveno: '2026-10-20T09:00:00Z' });
  await sZ.zapis('_rejstrik', { schema: 1, zakazky: rejstrik });

  /* #504: stav Pipedrive má výchozí „vyhrané"; sady C3 bez dealu jdou s pd=vse, není-li v dotazu jiný. */
  const sPd = (q) => /protokol=/.test(q) ? q
    : q + (/[?&]pd=/.test(q) ? '' : '&pd=vse') + (/[?&]podle=/.test(q) ? '' : '&podle=zamceni');   // výchozí je prodej + vyhrané
  const ex = async (q, c) => { const r = await get(controllingExport, URL_E + sPd(q), c); return { st: r.status, o: await r.json() }; };
  test('C3: vedoucí hromadný export nedostane (403)', (await get(controllingExport, URL_E + '?od=2026-10-01&do=2026-10-31', cVed)).status === 403);
  test('C3: nepřihlášený nic (401)', (await get(controllingExport, URL_E + '?od=2026-10-01&do=2026-10-31')).status === 401);
  test('C3: POST → 405', (await post(controllingExport, URL_E, {}, cAdmin)).status === 405);
  test('C3: neplatné období → 400', (await ex('?od=2026-10-31&do=2026-10-01', cAdmin)).st === 400);
  test('C3: neznámá oblast → 400', (await ex('?od=2026-10-01&do=2026-10-31&oblast=vse', cAdmin)).st === 400);

  const e1 = await ex('?od=2026-10-01&do=2026-10-31', cAdmin);
  const cisla = (o) => (o.exporty || []).map(e => e.strany[0].cislo).sort().join(',');
  test('C3: říjen = zamčené řídící v období (0801, 0804), bez 1. 11. v Praze, září ani nezamčené',
    e1.st === 200 && cisla(e1.o) === '2026 - OPR - CN - 0801,2026 - OPR - CN - 0804', cisla(e1.o));
  test('C3: nečitelná zakázka se hlásí jako přeskočená', (e1.o.preskoceno || []).some(p => p.soubor === 'rozbita.json'), e1.o.preskoceno);
  test('C3: export nese platné mapování a jeho verzi', e1.o.verzeMapovani === 2 && e1.o.data && e1.o.data.mapa['K.k7'] === 'mat-ostatni');
  test('C3: kdo a kdy z relace a serveru', e1.o.kdo === ADMIN_EMAIL && /^\d{4}-\d{2}-\d{2}T/.test(e1.o.kdy)
    && e1.o.exporty.every(e => e.kdo === ADMIN_EMAIL));
  test('C3: řádky nesou zmrazený výsledek (hlavička zmrazeno)', e1.o.exporty.every(e => e.hlavicka.zmrazeno === true && e.radky.length > 0));
  const e2 = await ex('?od=2026-11-01&do=2026-11-30', cAdmin);
  test('C3+C5: listopad = 0802 (zámek 23:30 UTC 31. 10.) a 0806 (zamčená neřídící)', cisla(e2.o) === '2026 - OPR - CN - 0802,2026 - OPR - CN - 0806', cisla(e2.o));
  const e806 = (e2.o.exporty || []).find(e => /0806/.test(e.strany[0].cislo));
  test('C5: zamčená neřídící jde s příznakem ridici=false', !!e806 && e806.hlavicka.ridici === false, e806 && e806.hlavicka);
  test('C3: řada ZAHR jen zahraniční', cisla((await ex('?od=2026-10-01&do=2026-10-31&rada=zahr', cAdmin)).o) === '2026 - OPR - CN - 0804');
  test('C3: řada ČR bez zahraniční', cisla((await ex('?od=2026-10-01&do=2026-10-31&rada=cr', cAdmin)).o) === '2026 - OPR - CN - 0801');
  const eO = await ex('?od=2026-10-01&do=2026-10-31&oblast=ock', cAdmin);
  test('C3: filtr OCK nechá jen řádky OCK', eO.st === 200 && eO.o.exporty.length === 2
    && eO.o.exporty.every(e => e.radky.every(r => r.oblast === 'ock')));
  const sesit = C.ctrlExportListy(e1.o.exporty, e1.o.data, { hromadny: e1.o.filtr });
  test('C5: z odpovědi se složí sešit Řádky / Příplatky – volby / Kapitoly / Popis', sesit.map(l => l.nazev).join(',') === 'Řádky,Příplatky – volby,Kapitoly,Popis'
    && sesit[0].rows.length === 1 + e1.o.exporty.reduce((a, e) => a + e.radky.filter(r => r.vZakladu).length, 0)
    && sesit[1].rows.length === 1 + e1.o.exporty.reduce((a, e) => a + e.radky.filter(r => !r.vZakladu).length, 0));

  /* C6: výběr podle data prodeje (objednané příplatky) — 0801 prodaná 25. 10. */
  { const soub = rejstrik.find(r => r.cislo === '2026 - OPR - CN - 0801').soubor;
    const z = G.importZakazka(await sZ.cti('z/' + soub));
    z.objednane = { varianta: z.varianty[0].id, klice: [G.objNabidnute(z.varianty[0], JEKLY)[0].key], datum: '2026-10-25' };
    await sZ.zapis('z/' + soub, z);
    /* Záznam rejstříku jako po uložení na serveru (zápis prodeje = uložení
     * zakázky; #504: záznam nese i den prodeje). */
    rejstrik[rejstrik.findIndex(r => r.soubor === soub)] = G.uloRejstrikZaznam(z, { soubor: soub, razitko: '2026-10-25T12:00:00Z' });
    await sZ.zapis('_rejstrik', { schema: 1, zakazky: rejstrik }); }
  const eP = await ex('?od=2026-10-25&do=2026-10-25&podle=prodej', cAdmin);
  test('C6: hromadně podle data prodeje jen prodaná zakázka s objednaným řádkem', cisla(eP.o) === '2026 - OPR - CN - 0801'
    && eP.o.exporty[0].radky.some(r => r.objednano) && eP.o.filtr.podle === 'prodej', cisla(eP.o));
  test('C6: neznámý výběr podle → 400', (await ex('?od=2026-10-01&do=2026-10-31&podle=tisk', cAdmin)).st === 400);
  const prot = await ex('?protokol=1', cAdmin);
  test('C3: každý export je v protokolu (kdo, rozsah, počet)', prot.st === 200 && prot.o.zaznamy.length === 6
    && prot.o.zaznamy[0].podle === 'prodej' && prot.o.zaznamy[1].oblast === 'ock' && prot.o.zaznamy[0].kdo === ADMIN_EMAIL && prot.o.zaznamy[1].zakazek === 2, prot.o.zaznamy && prot.o.zaznamy[0]);
  test('C3: odmítnutý dotaz se do protokolu nezapíše', prot.o.zaznamy.every(z => z.od <= z.do));
  test('C3: protokol vedoucí nečte (403)', (await get(controllingExport, URL_E + '?protokol=1', cVed)).status === 403);

  /* Strop čtení (dřív 413 nad 600 kandidátů) zrušen v #504 — viz blok #504 níž. */

  /* #504 (doplnění J. V. 22. 10.): filtr Stav Pipedrive, výchozí „vyhrané". 0801 má vyhraný
   * deal (poslední známý stav uložený u zakázky), 0804 deal nemá. Před doplněním 0 / 6
   * (parametr pd server neznal, export bral obě), po něm 6 / 6. */
  {
    const soub = rejstrik.find(r => r.cislo === '2026 - OPR - CN - 0801').soubor;
    const z = await sZ.cti('z/' + soub);
    z.pdDealId = '501'; z.pdStav = { status: 'won', nacteno: '2026-10-20T10:00:00.000Z' };
    await sZ.zapis('z/' + soub, z);
    const holy = async (q) => { const r = await get(controllingExport, URL_E + q + '&podle=zamceni', cAdmin); return { st: r.status, o: await r.json() }; };
    const ePdV = await holy('?od=2026-10-01&do=2026-10-31');
    test('#504 PD: výchozí filtr = vyhrané — jen 0801, 0804 bez dealu vyřazená jako „bez stavu"',
      ePdV.st === 200 && cisla(ePdV.o) === '2026 - OPR - CN - 0801' && ePdV.o.filtr.pd === 'won'
      && ePdV.o.vyrazenoPd.bez === 1 && ePdV.o.vyrazenoPd.jiny === 0, { c: cisla(ePdV.o), v: ePdV.o.vyrazenoPd });
    const ePdB = await holy('?od=2026-10-01&do=2026-10-31&pd=bez');
    test('#504 PD: „bez stavu" = zakázky bez dealu nebo bez známého stavu (0804), vyhraná vyřazena jako jiný stav',
      cisla(ePdB.o) === '2026 - OPR - CN - 0804' && ePdB.o.vyrazenoPd.jiny === 1 && ePdB.o.vyrazenoPd.bez === 0, ePdB.o.vyrazenoPd);
    const ePdA = await holy('?od=2026-10-01&do=2026-10-31&pd=vse');
    test('#504 PD: „všechny" bere obě, nic nevyřadí', cisla(ePdA.o) === '2026 - OPR - CN - 0801,2026 - OPR - CN - 0804'
      && ePdA.o.vyrazenoPd.jiny + ePdA.o.vyrazenoPd.bez === 0);
    const ePdL = await holy('?od=2026-10-01&do=2026-10-31&pd=lost');
    test('#504 PD: ztracené — prázdný export, vyřazené spočítané zvlášť (jiný stav 1, bez stavu 1)',
      ePdL.st === 200 && ePdL.o.exporty.length === 0 && ePdL.o.vyrazenoPd.jiny === 1 && ePdL.o.vyrazenoPd.bez === 1, ePdL.o.vyrazenoPd);
    test('#504 PD: neplatný stav → 400', (await holy('?od=2026-10-01&do=2026-10-31&pd=WON')).st === 400
      && (await holy('?od=2026-10-01&do=2026-10-31&pd=x')).st === 400);
    const pPd = ((await ulz('program').cti('controlling_exporty')) || {}).zaznamy || [];
    const popis = C.ctrlExportListy(ePdV.o.exporty, ePdV.o.data, { hromadny: Object.assign({}, ePdV.o.filtr, { vyrazenoPd: ePdV.o.vyrazenoPd }) })
      .find(l => l.nazev === 'Popis').rows;
    const radek = (t) => (popis.find(r => r[0] === t) || [])[1];
    test('#504 PD: filtr a počty vyřazených v protokolu i v listu Popis (stav se z Pipedrive nedotahuje)',
      pPd[0].pd === 'lost' && pPd[0].vyrazenoPd === 1 && pPd[0].vyrazenoBez === 1 && pPd[3].pd === 'won'
      && /^Vyhrané .*nedotahuje/.test(radek('Stav Pipedrive') || '')
      && radek('Vyřazeno filtrem stavu — jiný stav') === 0 && radek('Vyřazeno filtrem stavu — bez stavu (bez dealu nebo stav neznámý)') === 1,
      { p: pPd[0], st: radek('Stav Pipedrive') });
  }
  /* #508 (E2, J. V. 23. 10. 2026: „Není možné stáhnout celou databázi"): mez 400 dní zrušena,
   * volba celé databáze vse=1. Před opravou 0 / 4 (400 „delší než 400 dní", vse server neznal
   * a bez od/do odmítl), po opravě 4 / 4. */
  {
    const eDlouhe = await ex('?od=2025-04-01&do=2026-10-23', cAdmin);
    test('#508: období 1. 4. 2025 – 23. 10. 2026 (přes 400 dní) projde', eDlouhe.st === 200
      && cisla(eDlouhe.o) === '2026 - OPR - CN - 0801,2026 - OPR - CN - 0803,2026 - OPR - CN - 0804', { st: eDlouhe.st, c: cisla(eDlouhe.o), ch: eDlouhe.o.chyba });
    const eVse = await ex('?vse=1', cAdmin);
    test('#508: celá databáze (vse=1) = všechny zamčené bez omezení obdobím, filtr nese vse',
      eVse.st === 200 && eVse.o.filtr.vse === true
      && cisla(eVse.o) === ['0801', '0802', '0803', '0804', '0806'].map(c => '2026 - OPR - CN - ' + c).join(','), { st: eVse.st, c: cisla(eVse.o), ch: eVse.o.chyba });
    const pV = (((await ulz('program').cti('controlling_exporty')) || {}).zaznamy || [])[0] || {};
    test('#508: protokol u celé databáze nese vse', pV.vse === true && pV.zakazek === 5 && pV.stav === 'hotovo', pV);
    test('#508: celá databáze s obdobím nebo s neznámou hodnotou → 400',
      (await ex('?vse=1&od=2026-10-01&do=2026-10-31', cAdmin)).st === 400 && (await ex('?vse=ano', cAdmin)).st === 400 && (await ex('?vse=ano&od=2026-10-01&do=2026-10-31', cAdmin)).st === 400);
  }
  /* K6-S6 (D3): nečekaný tvar uložené zakázky (sem podstrčený mimo server —
   * datum prodeje jako objekt, String() vyhodí výjimku) shodil celý export na
   * 500; má jít mezi přeskočené a zbytek se vyveze. */
  {
    const z = zamcena('2026 - OPR - CN - 0807', '2026-10-06T09:00:00Z');
    z.objednane = { varianta: z.varianty[0].id, klice: ['x'], datum: { toString: 1 } };
    const sb = await vloz(z);
    const eS = await (async () => { try { return await ex('?od=2026-10-01&do=2026-10-31&podle=prodej', cAdmin); }
      catch (e) { return { st: 500, o: { chyba: e.message } }; } })();
    test('K6-S6: výjimka u jedné zakázky v exportu → 200, zakázka mezi přeskočenými', eS.st === 200
      && (eS.o.preskoceno || []).some(p => p.soubor === sb), eS);
    rejstrik.pop(); await sZ.smaz('z/' + sb); await sZ.zapis('_rejstrik', { schema: 1, zakazky: rejstrik });
  }

  /* #504 (22. 10. 2026, hlášení J. V.): „exporty od určité velikosti nefungují" —
   * 1.–22. 10. skončilo 413 (633 kandidátů nad strop 600), protože předvýběr
   * bral každou zakázku upravenou v období; pod stropem server četl sekvenčně
   * a funkce vypršela (504). Rejstřík: 300 zakázek zamčených v říjnu a 400
   * v září, všechny upravené 21. 10. (hromadné přeuložení). Před opravou
   * 0 / 10 prošlo (413 nad strop čtení, strop 150 zakázek v souboru, dávky nebyly),
   * po opravě 10 / 10. */
  {
    const M = C.CTRL_HROMADNY;
    const puvodne = { ...M };
    const vzor = zamcena('2026 - OPR - CN - 5000', '2026-10-01T09:00:00Z');
    const rej504 = [];
    /* Úložiště odpovídá rejstříku: zakázky sad C3 výš zmizí i ze z/ — jinak by
     * je samooprava exportu (K7-S1, #507) jako ztracené z rejstříku přidala. */
    for (const k of [...pamet.keys()]) if (k.startsWith('zakazky/z/')) pamet.delete(k);
    /* Kopie vzoru náhradou v textu (rychlejší než 700× klonovat objekt — sada běží v každé mutaci). */
    const tpl = JSON.stringify(vzor);
    for (let i = 0; i < 700; i++) {
      const cislo = '2026 - OPR - CN - ' + (5001 + i);
      const kdy = i < 300 ? '2026-10-' + String(1 + (i % 22)).padStart(2, '0') + 'T09:00:00Z'
        : '2026-09-' + String(1 + (i % 25)).padStart(2, '0') + 'T09:00:00Z';
      const text = tpl.split('2026 - OPR - CN - 5000').join(cislo).split('2026-10-01T09:00:00Z').join(kdy);
      const z = JSON.parse(text);
      const soubor = G.uloJmenoSouboru(z);
      pamet.set('zakazky/z/' + soubor, text);
      rej504.push(G.uloRejstrikZaznam(z, { soubor, razitko: '2026-10-21T10:00:00Z' }));
    }
    await sZ.zapis('_rejstrik', { schema: 1, zakazky: rej504 });
    const fRijen = C.ctrlHromadnyFiltr({ od: '2026-10-01', do: '2026-10-22', pd: 'vse', podle: 'zamceni' }).filtr;
    test('#504: z 700 zakázek upravených včera jsou kandidáti jen ti zamčení v období (300)',
      C.ctrlHromadnyKandidati(await sZ.cti('_rejstrik'), fRijen).length === 300, C.ctrlHromadnyKandidati(await sZ.cti('_rejstrik'), fRijen).length);
    let volani = 0;
    const api = async (cesta) => {
      volani++;
      const r = await get(controllingExport, 'http://x' + cesta, cAdmin);
      const o = await r.json();
      if (!r.ok || o.ok === false) { const e = new Error(o.chyba || ('server odpověděl ' + r.status)); e.stav = r.status; e.data = o; throw e; }
      return o;
    };
    const stahni = async (f) => { volani = 0; try { return await C.ctrlHromadnyStahni(api, f); } catch (e) { return { chyba: e.message, stav: e.stav }; } };
    const pocetProt = async () => ((await sProgCti()).zaznamy || []).length;
    const sProgCti = async () => (await ulz('program').cti('controlling_exporty')) || {};
    const prot0 = await pocetProt();
    const e300 = await stahni(fRijen);
    test('#504: export 300 zakázek za 1.–22. 10. nespadne na strop', !e300.chyba && (e300.exporty || []).length === 300
      && !(e300.preskoceno || []).length, e300.chyba || (e300.exporty || []).length);
    const p300 = (await sProgCti()).zaznamy || [];
    test('#504: protokol má jeden záznam na export, dokončený, s počtem zakázek a filtrem stavu',
      p300.length === prot0 + 1 && p300[0].stav === 'hotovo' && p300[0].zakazek === 300 && p300[0].davek >= 1 && p300[0].pd === 'vse', p300[0]);

    /* Dávkování a souběh vrátí tentýž obsah jako jeden sekvenční dotaz. */
    const fKratke = C.ctrlHromadnyFiltr({ od: '2026-10-01', do: '2026-10-03', pd: 'vse', podle: 'zamceni' }).filtr;
    /* Čas exportu (`kdy`) má každý běh vlastní — porovnává se obsah bez něj. */
    const obsah = (o) => JSON.stringify({ e: (o.exporty || []).map(e => ({ ...e, kdy: '' })), p: o.preskoceno });
    Object.assign(M, { soubeh: 1, davkaMax: 100000, casMs: 1e9 });
    const sekv = await stahni(fKratke);
    const sekvVolani = volani;
    Object.assign(M, { soubeh: 1, davkaMax: 7 });
    const davky = await stahni(fKratke);
    const davkyVolani = volani;
    Object.assign(M, { soubeh: 12, davkaMax: 100000, casMs: 15 });
    zpozdeni = 4;
    const soub = await stahni(fKratke);
    const soubVolani = volani;
    zpozdeni = 0;
    Object.assign(M, puvodne);
    /* K7-W4 (#507): strop bajtů dávky — po zakázce nad strop se další bere až v nové dávce. */
    Object.assign(M, { soubeh: 1, davkaMax: 100000, casMs: 1e9, davkaBajty: 1 });
    const poBajtech = await stahni(fKratke);
    const poBajtechVolani = volani;
    Object.assign(M, puvodne);
    test('#504: dávky po 7 i souběh 12 se zpožděným úložištěm a rozpočtem 15 ms = tentýž obsah jako sekvenční běh',
      !sekv.chyba && sekv.exporty.length > 30 && sekvVolani === 1 && davkyVolani > 1 && soubVolani > 1
      && obsah(davky) === obsah(sekv) && obsah(soub) === obsah(sekv),
      { sekv: sekv.chyba || sekv.exporty.length, sekvVolani, davkyVolani, soubVolani, d: davky.chyba, s: soub.chyba });

    /* Navazující dávka serveru nevěří: kurzor bez exportu, cizí id, jiný filtr. */
    const st = async (q) => (await get(controllingExport, URL_E + q, cAdmin)).status;
    const idHot = ((await sProgCti()).zaznamy || [])[0].id;
    test('#504: kurzor bez id exportu → 400, neznámé nebo dokončené id → 409',
      await st('?od=2026-10-01&do=2026-10-03&po=x.json') === 400
      && await st('?od=2026-10-01&do=2026-10-03&export=abcdefgh12345678&po=x.json') === 409
      && await st('?od=2026-10-01&do=2026-10-03&export=' + idHot + '&po=x.json') === 409
      && await st('?od=2026-10-01&do=2026-10-03&export=' + encodeURIComponent('../x') + '&po=x.json') === 400);
    Object.assign(M, { davkaMax: 5 });
    const prvni = await (await get(controllingExport, URL_E + '?od=2026-10-01&do=2026-10-03&podle=zamceni&pd=vse', cAdmin)).json();
    Object.assign(M, puvodne);
    test('#504: navazující dávka s jiným filtrem než první → 409', !!prvni.dalsi
      && await st('?od=2026-10-01&do=2026-10-04&podle=zamceni&pd=vse&export=' + prvni.export + '&po=' + encodeURIComponent(prvni.dalsi)) === 409, prvni.dalsi);

    test('K7-W4: strop bajtů dávky dělí export (aspoň dávka na zakázku), obsah stejný jako sekvenční běh',
      !poBajtech.chyba && poBajtechVolani >= (poBajtech.exporty || []).length && poBajtechVolani > 1
      && obsah(poBajtech) === obsah(sekv), { chyba: poBajtech.chyba, volani: poBajtechVolani, n: (poBajtech.exporty || []).length });
    test('#504: všechny dávky jednoho exportu nesou týž čas exportu (z první dávky)',
      new Set((davky.exporty || []).map(e => e.kdy)).size === 1 && new Set((soub.exporty || []).map(e => e.kdy)).size === 1);
    /* #504 (doplnění J. V. 22. 10.): žádný strop počtu — rejstřík s 3001 kandidáty (dřív 413 nad 600)
     * se stáhne po dávkách; jejich zakázky v úložišti nejsou, takže jsou všechny přeskočené. */
    const velky = { schema: 1, zakazky: Array.from({ length: 3001 }, (_, i) => ({ soubor: 'x' + String(i).padStart(5, '0') + '.json', cislo: 'X' + i, odeslane: 1 })) };
    const ulozeny = await sZ.cti('_rejstrik');
    await sZ.zapis('_rejstrik', velky);
    const eVelky = await stahni(fKratke);
    await sZ.zapis('_rejstrik', ulozeny);
    test('#504: 3001 kandidátů bez stropu čtení — po dávkách, všechny nečitelné přeskočené, žádné 413',
      !eVelky.chyba && (eVelky.preskoceno || []).length === 3001 && eVelky.davek > 1, eVelky.chyba || eVelky.davek);
    /* Technická pojistka zůstává: odpověď jedné dávky nad strop velikosti → 413 s výzvou zkrátit období. */
    Object.assign(M, { odpoved: 2000 });
    const eVel = await stahni(fKratke);
    Object.assign(M, puvodne);
    test('#504: odpověď dávky nad strop velikosti → 413 „příliš velký … kratší období"', eVel.stav === 413
      && /příliš velký.*kratší období/.test(eVel.chyba || ''), eVel);

    /* Starší záznamy rejstříku bez dnů zámků: hrubý předvýběr jako dřív — export dál správný. */
    const bezDnu = (await sZ.cti('_rejstrik')).zakazky.map(z => { const x = { ...z }; delete x.ctrlDny; return x; });
    await sZ.zapis('_rejstrik', { schema: 1, zakazky: bezDnu });
    const eStare = await stahni(fKratke);
    test('#504: starší rejstřík bez dnů zámků — předvýběr hrubý (700), export týž jako s dny',
      C.ctrlHromadnyKandidati({ zakazky: bezDnu }, fKratke).length === 700 && !eStare.chyba && obsah(eStare) === obsah(sekv),
      eStare.chyba || (eStare.exporty || []).length);
    /* Změna mapování mezi dávkami: navazující dávka se odmítne (soubor by míchal dvě verze). */
    Object.assign(M, { davkaMax: 5 });
    const d1 = await (await get(controllingExport, URL_E + '?od=2026-10-01&do=2026-10-03&podle=zamceni&pd=vse', cAdmin)).json();
    const dm = C.ctrlVychozi(); dm.mapa['K.k7'] = 'mat-ostatni'; dm.mapa['C.transportKc'] = 'cestovne';
    const pm = await (await post(controllingFn, URL_C, { data: dm, poznamka: 'změna během exportu' }, cAdmin)).json();
    const d2 = await get(controllingExport, URL_E + '?od=2026-10-01&do=2026-10-03&podle=zamceni&pd=vse&export=' + d1.export + '&po=' + encodeURIComponent(d1.dalsi || ''), cAdmin);
    Object.assign(M, puvodne);
    test('#504: změna mapování mezi dávkami → navazující dávka 409', !!d1.dalsi && pm.ok === true && d2.status === 409, { d: d1.dalsi, pm, st: d2.status });

    Object.assign(M, puvodne);
    for (const z of rej504) await sZ.smaz('z/' + z.soubor);
    await sZ.zapis('_rejstrik', { schema: 1, zakazky: rejstrik });
  }
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
