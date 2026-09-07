/* OBNOVA DATABÁZE ZE ZÁLOHY — serverová sada (7. 9. 2026).
 *
 * Proč vedle test_funkce.mjs: záloha byla do 7. 9. 2026 jednosměrná a tahle
 * sada projde celý cyklus, který dřív neexistoval: záloha → simulovaná
 * ztráta → náhled → obnova → kontrola, že je to zpátky. Zvlášť hlídá pět
 * pojistek z functions/obnova.mjs — právě ty dělají rozdíl mezi obnovou
 * a nástrojem, kterým si člověk jedním kliknutím přepíše databázi.
 *
 * Běží nad paměťovým úložištěm, bez Netlify a bez sítě (stejně jako
 * test_funkce.mjs). Spuštění: node netlify/test_obnova.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
const pamet = new Map();
/* Pojistka 2 se zkouší simulovaným výpadkem: zápis do úložiště tohoto jména
 * vyhodí chybu. Nastavuje se jen na dobu jednoho požadavku. */
globalThis.__SELHAT_ZAPIS = null;
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) {
    if (globalThis.__SELHAT_ZAPIS === nazev) throw new Error('simulovaný výpadek úložiště ' + nazev);
    pamet.set(nazev + '/' + k, JSON.stringify(v));
  },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

import prihlaseni from './functions/prihlaseni.mjs';
import uzivatele from './functions/uzivatele.mjs';
import program from './functions/program.mjs';
import firma from './functions/firma.mjs';
import zakazky from './functions/zakazky.mjs';
import zaloha from './functions/zaloha.mjs';
import zalohaVynuceno from './functions/zaloha_vynuceno.mjs';
import obnova from './functions/obnova.mjs';
import { ADMIN_EMAIL } from './lib/sdilene.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
Object.assign(globalThis, require('../src/format.js'), require('../src/engine.js'), require('../src/engine_proj.js'),
  require('../src/techspec.js'), require('../src/sleva.js'), require('../src/zaokrouhleni.js'), require('../src/zamek.js'));
const zk = require('../src/zakazka.js');
const ZC = require('../src/zkusebni_cenik.js');
const fmod = require('../src/firma.js');
const zm = require('../src/zamek.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST',
  headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const ulz = (n) => globalThis.__TEST_ULOZISTE(n);
const kopie = (x) => JSON.parse(JSON.stringify(x));
const obnov = (telo, cookie) => post(obnova, 'http://x/api/obnova', telo, cookie);
const obnovJson = async (telo, cookie) => (await obnov(telo, cookie)).json();
const dnes = () => new Date().toISOString().slice(0, 10);

/* ---- 0) příprava: administrátor, obchodník, ceník, firma, dvě zakázky ---- */
const r1 = await post(prihlaseni, 'http://x/api/prihlaseni', { email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' });
const cookie = (r1.headers.get('set-cookie') || '').split(';')[0];
test('administrátor se přihlásí (bootstrap)', (await r1.json()).ok === true);
const z1 = await (await post(uzivatele, 'http://x/api/uzivatele',
  { akce: 'zaloz', email: 'obchodnik@engineers-cz.cz', jmeno: 'Test Obchodník', role: 'Obchodník', heslo: 'ObchodHeslo1' }, cookie)).json();
test('obchodník založen', z1.ok === true, z1);
const r2 = await post(prihlaseni, 'http://x/api/prihlaseni', { email: 'obchodnik@engineers-cz.cz', heslo: 'ObchodHeslo1' });
const cookieObch = (r2.headers.get('set-cookie') || '').split(';')[0];

const pub = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0.1, maxGlobalni: 0.3, stropy: { 'Obchodník': 0.05 } }, poznamka: 'první verze' }, cookie)).json();
test('ceník zveřejněn (verze 1)', pub.ok && pub.verze === 1, pub);
const SKUT = fmod.firmaDefault(); delete SKUT.ukazkove;
SKUT.nazev = 'Zkušební firma pro obnovu s.r.o.'; SKUT.ico = '12345678';
test('firma zveřejněna', (await (await post(firma, 'http://x/api/firma', { udaje: SKUT }, cookie)).json()).ok === true);

const novaZak = (cislo, nazev) => { const z = zk.novaZakazka(); z.cislo = cislo; z.nazevAkce = nazev; return z; };
const zakA = novaZak('2026 - OPR - CN - 0777', 'Zakázka A');
const zakB = novaZak('2026 - OPR - CN - 0778', 'Zakázka B');
const ulA = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: zakA }, cookieObch)).json();
const ulB = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: zakB }, cookieObch)).json();
test('dvě zakázky uložené online', ulA.ok && ulB.ok && !!ulA.soubor && !!ulB.soubor, [ulA, ulB]);
const A = 'z/' + ulA.soubor, B = 'z/' + ulB.soubor;

/* ---- 1) záloha ke stažení + serverový otisk ---- */
const zalSoubor = (await (await get(zaloha, 'http://x/api/zaloha', cookie)).json()).zaloha;
test('záloha ke stažení nese obě zakázky a účty bez hesel',
  Object.keys(zalSoubor.zakazky).length === 2 && zalSoubor.uzivatele.length === 2
  && zalSoubor.uzivatele.every(u => u.heslo === undefined));
const vyn = await (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', {}, cookie)).json();
test('serverový otisk pořízen pod dnešním dnem', vyn.ok && vyn.den === dnes(), vyn);
const otiskDen = vyn.den;
const otiskPuvodni = kopie(await ulz('zalohy').cti(otiskDen));

/* ---- 2) ochrany vstupu ---- */
const platnyNahled = { zdroj: { soubor: zalSoubor }, rezim: 'doplnit', nahled: true };
test('bez přihlášení 401', (await obnov(platnyNahled)).status === 401);
test('obchodník 403 (i na náhled)', (await obnov(platnyNahled, cookieObch)).status === 403);
test('GET se odmítne (405)', (await get(obnova, 'http://x/api/obnova', cookie)).status === 405);
test('cizí soubor 400', (await obnov({ zdroj: { soubor: { foo: 1, bar: [] } }, rezim: 'doplnit', nahled: true }, cookie)).status === 400);
test('soubor bez razítka pořízení 400',
  (await obnov({ zdroj: { soubor: { zakazky: {} } }, rezim: 'doplnit', nahled: true }, cookie)).status === 400);
test('neznámý režim 400', (await obnov({ zdroj: { soubor: zalSoubor }, rezim: 'smazat', nahled: true }, cookie)).status === 400);
test('neznámá část 400', (await obnov({ ...platnyNahled, casti: ['hesla'] }, cookie)).status === 400);
test('neexistující otisk 404', (await obnov({ zdroj: { otisk: '1999-01-01' }, rezim: 'doplnit', nahled: true }, cookie)).status === 404);
test('otisk se špatným klíčem 400', (await obnov({ zdroj: { otisk: '../x' }, rezim: 'doplnit', nahled: true }, cookie)).status === 400);
test('chybějící zdroj 400', (await obnov({ rezim: 'doplnit', nahled: true }, cookie)).status === 400);
const bezPotvrzeni = await obnov({ zdroj: { soubor: zalSoubor }, rezim: 'doplnit' }, cookie);
test('ostrá obnova bez potvrzení se odmítne (428)', bezPotvrzeni.status === 428);
test('a bez potvrzení nevznikl ani otisk před obnovou',
  (await ulz('zalohy').cti(otiskDen + '-pred-obnovou')) === null);

/* ---- 3) simulovaná ztráta ---- */
await ulz('zakazky').smaz(A);
const rejPo = (await ulz('zakazky').cti('_rejstrik'));
await ulz('zakazky').zapis('_rejstrik', { ...rejPo, zakazky: rejPo.zakazky.filter(z => z.soubor !== ulA.soubor) });
const HAVARIE = kopie(SKUT); HAVARIE.nazev = 'Po havárii s.r.o.';
await post(firma, 'http://x/api/firma', { udaje: HAVARIE }, cookie);
await ulz('uzivatele').smaz('obchodnik@engineers-cz.cz');
test('ztráta nastala: zakázka A pryč, firma přepsaná, obchodník pryč',
  (await ulz('zakazky').cti(A)) === null && (await ulz('program').cti('firma')).udaje.nazev === 'Po havárii s.r.o.'
  && (await ulz('uzivatele').cti('obchodnik@engineers-cz.cz')) === null);

/* ---- 4) náhled ze souboru: čísla + nic nezapsal ---- */
const n1 = await obnovJson(platnyNahled, cookie);
test('náhled odpoví ok a označí se jako náhled', n1.ok === true && n1.nahled === true, n1);
test('náhled: zakázky 1 nová, 1 beze změny', n1.casti.zakazky.nove === 1 && n1.casti.zakazky.bezeZmeny === 1, n1.casti.zakazky);
test('náhled: firma se v režimu doplnit přeskočí s důvodem',
  n1.casti.firma.preskocene === 1 && /doplnit/.test(n1.casti.firma.duvody[0].duvod), n1.casti.firma);
test('náhled: účty ze souboru se přeskočí a řekne se proč (chybí otisk hesla)',
  n1.casti.uzivatele.preskocene === 2 && n1.casti.uzivatele.nove === 0
  && n1.casti.uzivatele.duvody.every(d => /otisk/.test(d.duvod)), n1.casti.uzivatele);
test('náhled: rejstřík by měl 2 zakázky a není přestavený', n1.rejstrik.zakazek === 2 && n1.rejstrik.prestaven === false, n1.rejstrik);
test('náhled sám nic nezapsal', (await ulz('zakazky').cti(A)) === null
  && (await ulz('program').cti('firma')).udaje.nazev === 'Po havárii s.r.o.'
  && (await ulz('zalohy').cti(otiskDen + '-pred-obnovou')) === null && n1.otiskPred === null);

/* ---- 5) obnova „doplnit" ze souboru ---- */
const o1 = await obnovJson({ zdroj: { soubor: zalSoubor }, rezim: 'doplnit', potvrzeni: 'OBNOVIT' }, cookie);
test('obnova doplnit proběhla', o1.ok === true && o1.nahled === false, o1);
test('zakázka A je zpátky beze změny', JSON.stringify(await ulz('zakazky').cti(A)) === JSON.stringify(zalSoubor.zakazky[ulA.soubor]));
test('doplnit nepřepíše novější ruční změnu (firma zůstala „Po havárii")',
  (await ulz('program').cti('firma')).udaje.nazev === 'Po havárii s.r.o.' && o1.casti.firma.preskocene === 1);
const rej1 = await ulz('zakazky').cti('_rejstrik');
test('rejstřík se přestavil ze skutečného obsahu (2 zakázky, A i B)',
  rej1.zakazky.length === 2 && rej1.zakazky.some(z => z.soubor === ulA.soubor) && rej1.zakazky.some(z => z.soubor === ulB.soubor)
  && o1.rejstrik.prestaven === true, rej1);
test('rejstřík nese číslo a název obnovené zakázky',
  rej1.zakazky.some(z => z.soubor === ulA.soubor && z.cislo === zakA.cislo && z.nazevAkce === 'Zakázka A'));
const pred = await ulz('zalohy').cti(otiskDen + '-pred-obnovou');
test('před obnovou vznikl otisk pod vlastním klíčem a hlásí se v odpovědi',
  !!pred && o1.otiskPred === otiskDen + '-pred-obnovou', o1.otiskPred);
test('otisk před obnovou nese stav PŘED obnovou (firma „Po havárii", bez zakázky A)',
  pred.firma.udaje.nazev === 'Po havárii s.r.o.' && !(ulA.soubor in pred.zakazky) && pred.zdroj === 'pred-obnovou' && pred.kdo === ADMIN_EMAIL);
test('dnešní otisk zůstal nedotčený (žádná kolize klíčů)',
  JSON.stringify(await ulz('zalohy').cti(otiskDen)) === JSON.stringify(otiskPuvodni));
const seznamOt = await (await get(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', cookie)).json();
test('přehled otisků ukazuje i otisk před obnovou',
  seznamOt.otisky.some(o => o.den === otiskDen + '-pred-obnovou' && o.zdroj === 'pred-obnovou'), seznamOt.otisky.map(o => o.den));
test('účty ze souboru se ani ostrou obnovou nezaložily',
  (await ulz('uzivatele').cti('obchodnik@engineers-cz.cz')) === null && o1.casti.uzivatele.preskocene === 2);
test('odpověď upozorní na slot otisku před obnovou', o1.upozorneni.some(u => /pred-obnovou/.test(u)));

/* ---- 6) obnova „přepsat" ze souboru vrátí stav ze zálohy ---- */
const o2 = await obnovJson({ zdroj: { soubor: zalSoubor }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['firma'] }, cookie);
test('přepsat vrátí firmu ze zálohy', o2.ok && o2.casti.firma.prepsane === 1
  && (await ulz('program').cti('firma')).udaje.nazev === SKUT.nazev, o2.casti.firma);
test('obnova po částech se nedotkne ostatního (zakázky v odpovědi nejsou)', o2.casti.zakazky === undefined);

/* ---- 7) novější ruční změna zakázky: doplnit ji nechá, přepsat vrátí ---- */
const zakA2 = kopie(await ulz('zakazky').cti(A)); zakA2.nazevAkce = 'Ručně upraveno po záloze';
test('ruční změna zakázky A se uloží', (await (await post(zakazky, 'http://x/api/zakazky', { zakazka: zakA2 }, cookieObch)).json()).ok === true);
const o3 = await obnovJson({ zdroj: { soubor: zalSoubor }, rezim: 'doplnit', potvrzeni: 'OBNOVIT', casti: ['zakazky'] }, cookie);
test('doplnit nepřepíše novější ruční změnu zakázky',
  (await ulz('zakazky').cti(A)).nazevAkce === 'Ručně upraveno po záloze' && o3.casti.zakazky.preskocene === 1, o3.casti.zakazky);
const o4 = await obnovJson({ zdroj: { soubor: zalSoubor }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['zakazky'] }, cookie);
test('přepsat vrátí zakázku ze zálohy',
  (await ulz('zakazky').cti(A)).nazevAkce === 'Zakázka A' && o4.casti.zakazky.prepsane === 1, o4.casti.zakazky);

/* ---- 8) obnova nikdy nemaže: záznam mimo zálohu zůstane ---- */
const zakC = novaZak('2026 - OPR - CN - 0779', 'Zakázka C (po záloze)');
const ulC = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: zakC }, cookieObch)).json();
const o5 = await obnovJson({ zdroj: { soubor: zalSoubor }, rezim: 'prepsat', potvrzeni: 'OBNOVIT' }, cookie);
test('přepsat neodstraní zakázku, která v záloze není', o5.ok && (await ulz('zakazky').cti('z/' + ulC.soubor)) !== null);
const rej5 = await ulz('zakazky').cti('_rejstrik');
test('a rejstřík ji dál eviduje (3 zakázky)', rej5.zakazky.length === 3 && rej5.zakazky.some(z => z.soubor === ulC.soubor), rej5.zakazky.map(z => z.soubor));

/* ---- 9) uzamčené nabídky se nepřepíšou ani v režimu přepsat ---- */
const zakBz = kopie(await ulz('zakazky').cti(B));
zm.zamkniVariantu(zakBz.varianty[0], { typ: 'nabidka', kdy: new Date().toISOString(), kdo: 'Test' });
test('zakázka B se uloží se zámkem', (await (await post(zakazky, 'http://x/api/zakazky', { zakazka: zakBz }, cookieObch)).json()).ok === true);
const n9 = await obnovJson({ zdroj: { soubor: zalSoubor }, rezim: 'prepsat', nahled: true, casti: ['zakazky'] }, cookie);
test('náhled: obnova ze zálohy před zámkem by zámek sundala → B přeskočena s důvodem',
  n9.casti.zakazky.preskocene === 1 && n9.casti.zakazky.duvody.some(d => d.klic === B && /uzam/.test(d.duvod)), n9.casti.zakazky);
const o9 = await obnovJson({ zdroj: { soubor: zalSoubor }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['zakazky'] }, cookie);
test('ostrá obnova B přeskočí a zámek zůstane',
  o9.casti.zakazky.preskocene === 1 && !!(await ulz('zakazky').cti(B)).varianty[0].zamek.zamceno);
const zalPoZamku = (await (await get(zaloha, 'http://x/api/zaloha', cookie)).json()).zaloha;
const zalZmenena = kopie(zalPoZamku);
zalZmenena.zakazky[ulB.soubor].varianty[0].data.ock.zadani.sirka = 9.99;
const o9b = await obnovJson({ zdroj: { soubor: zalZmenena }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['zakazky'] }, cookie);
test('záloha se změněnými daty uzamčené nabídky se u B přeskočí',
  o9b.casti.zakazky.preskocene === 1 && /uzam|odeslan/.test(o9b.casti.zakazky.duvody[0].duvod)
  && (await ulz('zakazky').cti(B)).varianty[0].data.ock.zadani.sirka !== 9.99, o9b.casti.zakazky);
test('rejstřík po přeskočení nemá sirotka a B v něm zůstává',
  (await ulz('zakazky').cti('_rejstrik')).zakazky.filter(z => z.soubor === ulB.soubor).length === 1);

/* ---- 10) účty se obnoví jen z otisku — včetně otisků hesel ---- */
const n10 = await obnovJson({ zdroj: { otisk: otiskDen }, rezim: 'doplnit', nahled: true, casti: ['uzivatele'] }, cookie);
test('náhled z otisku: obchodník by se založil, administrátor beze změny',
  n10.casti.uzivatele.nove === 1 && n10.casti.uzivatele.bezeZmeny === 1 && n10.zdroj.typ === 'otisk', n10.casti.uzivatele);
const o10 = await obnovJson({ zdroj: { otisk: otiskDen }, rezim: 'doplnit', potvrzeni: 'OBNOVIT', casti: ['uzivatele'] }, cookie);
const obchZpet = await ulz('uzivatele').cti('obchodnik@engineers-cz.cz');
test('z otisku se obchodník obnovil i s otiskem hesla', o10.ok && !!obchZpet && typeof obchZpet.heslo === 'string' && obchZpet.heslo.includes(':'));
const r3 = await post(prihlaseni, 'http://x/api/prihlaseni', { email: 'obchodnik@engineers-cz.cz', heslo: 'ObchodHeslo1' });
test('obnovený obchodník se přihlásí původním heslem', r3.status === 200 && (await r3.json()).ok === true);
test('obnova z otisku před obnovou jde taky (je to platný zdroj)',
  (await obnovJson({ zdroj: { otisk: otiskDen + '-pred-obnovou' }, rezim: 'doplnit', nahled: true }, cookie)).ok === true);

/* ---- 11) pojistka 2: když se otisk před obnovou nepovede, nic se nezapíše ---- */
const HAVARIE2 = kopie(SKUT); HAVARIE2.nazev = 'Druhá havárie s.r.o.';
await post(firma, 'http://x/api/firma', { udaje: HAVARIE2 }, cookie);
globalThis.__SELHAT_ZAPIS = 'zalohy';
const o11 = await obnov({ zdroj: { soubor: zalSoubor }, rezim: 'prepsat', potvrzeni: 'OBNOVIT' }, cookie);
globalThis.__SELHAT_ZAPIS = null;
test('bez otisku se obnova neprovede (500) a řekne to', o11.status === 500 && /NEPROVEDLA/.test((await o11.json()).chyba));
test('a databáze zůstala, jak byla', (await ulz('program').cti('firma')).udaje.nazev === 'Druhá havárie s.r.o.');

/* ---- 12) hlavní administrátor se obnovou nedá vypnout ---- */
const otiskVypnuty = kopie(await ulz('zalohy').cti(otiskDen));
otiskVypnuty.uzivatele = otiskVypnuty.uzivatele.map(u => (u.email === ADMIN_EMAIL ? { ...u, aktivni: false } : u));
await ulz('zalohy').zapis('2026-01-01', otiskVypnuty);
await obnovJson({ zdroj: { otisk: '2026-01-01' }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['uzivatele'] }, cookie);
test('hlavní administrátor zůstává aktivní i po obnově z otisku, kde byl vypnutý',
  (await ulz('uzivatele').cti(ADMIN_EMAIL)).aktivni === true);

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
