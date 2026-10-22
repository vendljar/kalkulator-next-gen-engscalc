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
  /* Stav Pipedrive (22. 10. 2026): 0801 nese v uložené zakázce starší stav,
   * server zná novější (zakázku od uložení někdo otevřel); u 0804 je
   * novější uložený stav. Pojistka: bez doplnění ve funkci exportu by 0801
   * vyšla „Otevřené". */
  const sPd = ulz('pipedrive');
  const dealK = async (cislo, deal, pdStav, serverStav) => {
    const soub = rejstrik.find(r => r.cislo === cislo).soubor;
    const z = await sZ.cti('z/' + soub);
    z.pdDealId = deal; z.pdStav = pdStav;
    await sZ.zapis('z/' + soub, z);
    if (serverStav) await sPd.zapis('stav/' + deal, serverStav);
  };
  await dealK('2026 - OPR - CN - 0801', '4801', { status: 'open', nacteno: '2026-10-05T09:00:00.000Z' },
    { status: 'won', nacteno: '2026-10-21T10:00:00.000Z', overeno: '2026-10-21T10:00:00.000Z' });
  await dealK('2026 - OPR - CN - 0804', '4804', { status: 'lost', nacteno: '2026-10-20T10:00:00.000Z' },
    { status: 'open', nacteno: '2026-10-12T10:00:00.000Z', overeno: '2026-10-12T10:00:00.000Z' });

  const ex = async (q, c) => { const r = await get(controllingExport, URL_E + q, c); return { st: r.status, o: await r.json() }; };
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
  const stavExp = (o, c) => ((o.exporty || []).find(e => e.strany[0].cislo === c) || { hlavicka: {} }).hlavicka.pdStav || null;
  test('Stav Pipedrive: export vezme novější stav, který zná server',
    JSON.stringify(stavExp(e1.o, '2026 - OPR - CN - 0801')) === JSON.stringify({ status: 'won', nacteno: '2026-10-21T10:00:00.000Z' }),
    stavExp(e1.o, '2026 - OPR - CN - 0801'));
  test('Stav Pipedrive: starší záznam serveru novější uložený stav nepřepíše',
    (stavExp(e1.o, '2026 - OPR - CN - 0804') || {}).status === 'lost', stavExp(e1.o, '2026 - OPR - CN - 0804'));
  const sesitSt = C.ctrlExportListy(e1.o.exporty, e1.o.data, { hromadny: e1.o.filtr });
  const iSt = C.CTRL_RADKY_HLAVICKA.indexOf('Stav Pipedrive');
  test('Stav Pipedrive: sešit z odpovědi nese stav v řádcích i v seznamu zakázek',
    sesitSt[0].rows.slice(1).some(r => r[0] === '2026 - OPR - CN - 0801' && r[iSt] === 'Vyhrané')
    && sesitSt[0].rows.slice(1).some(r => r[0] === '2026 - OPR - CN - 0804' && r[iSt] === 'Ztracené')
    && sesitSt[3].rows.some(r => r[0] === '2026 - OPR - CN - 0801' && r[8] === 'Vyhrané'));
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
    /* Razítko úpravy jako po uložení na serveru (zápis prodeje = uložení zakázky). */
    rejstrik.find(r => r.soubor === soub).upraveno = '2026-10-25T12:00:00Z';
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

  /* Strop: víc zakázek k přečtení, než unese jeden export → 413, nic se neořízne potichu. */
  const strop = C.CTRL_HROMADNY.cteni;
  const velky = { schema: 1, zakazky: Array.from({ length: strop + 1 }, (_, i) => ({ soubor: 'x' + i + '.json', cislo: 'X' + i, odeslane: 1 })) };
  await sZ.zapis('_rejstrik', velky);
  const e413 = await ex('?od=2026-10-01&do=2026-10-31', cAdmin);
  test('C3: nad strop čtení → 413 s výzvou zúžit období', e413.st === 413 && /zužte/.test(e413.o.chyba), e413);
  await sZ.zapis('_rejstrik', { schema: 1, zakazky: rejstrik });
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
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
