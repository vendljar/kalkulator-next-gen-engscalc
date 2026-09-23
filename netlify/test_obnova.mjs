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
import { ADMIN_EMAIL, SMAZANI_ULOZISTE } from './lib/sdilene.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
Object.assign(globalThis, require('../src/format.js'), require('../src/engine.js'), require('../src/engine_proj.js'),
  require('../src/techspec.js'), require('../src/sleva.js'), require('../src/zaokrouhleni.js'), require('../src/zamek.js'));
const zk = require('../src/zakazka.js');
const ZC = require('../src/zkusebni_cenik.js');
const fmod = require('../src/firma.js');
const zm = require('../src/zamek.js');
/* Zámek jako v aplikaci (zamek_ui.js): nese číslo z papíru. Od 23. 9. 2026
 * (nález B61) server nový zámek bez něj odmítne. Výslovně zadané `cislo`
 * v testu přebije výchozí. */
const zamkniJakoAplikace = (z, v, info) => zm.zamkniVariantu(v,
  Object.assign({ cislo: zm.variantaCislo(z, v) }, info || {}));


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
  { akce: 'zaloz', email: 'obchodnik@priklad.cz', jmeno: 'Test Obchodník', role: 'Obchodník', heslo: 'ObchodHeslo1' }, cookie)).json();
test('obchodník založen', z1.ok === true, z1);
const r2 = await post(prihlaseni, 'http://x/api/prihlaseni', { email: 'obchodnik@priklad.cz', heslo: 'ObchodHeslo1' });
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
/* Otisky před obnovou mají od 9. 9. 2026 klíč s časem (B28) — hledají se
 * podle přípony, ne podle jednoho pevného jména. */
const otiskyPredObnovou = async () => (await ulz('zalohy').seznam()).filter(k => /-pred-obnovou$/.test(k));
const PRED_OBNOVOU = /^\d{4}-\d{2}-\d{2}T\d{6}-pred-obnovou$/;
test('a bez potvrzení nevznikl ani otisk před obnovou', (await otiskyPredObnovou()).length === 0);

/* ---- 3) simulovaná ztráta ---- */
await ulz('zakazky').smaz(A);
const rejPo = (await ulz('zakazky').cti('_rejstrik'));
await ulz('zakazky').zapis('_rejstrik', { ...rejPo, zakazky: rejPo.zakazky.filter(z => z.soubor !== ulA.soubor) });
const HAVARIE = kopie(SKUT); HAVARIE.nazev = 'Po havárii s.r.o.';
await post(firma, 'http://x/api/firma', { udaje: HAVARIE }, cookie);
await ulz('uzivatele').smaz('obchodnik@priklad.cz');
test('ztráta nastala: zakázka A pryč, firma přepsaná, obchodník pryč',
  (await ulz('zakazky').cti(A)) === null && (await ulz('program').cti('firma')).udaje.nazev === 'Po havárii s.r.o.'
  && (await ulz('uzivatele').cti('obchodnik@priklad.cz')) === null);

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
  && (await otiskyPredObnovou()).length === 0 && n1.otiskPred === null);

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
const pred = await ulz('zalohy').cti(String(o1.otiskPred));
test('před obnovou vznikl otisk pod vlastním klíčem s časem (B28) a hlásí se v odpovědi',
  !!pred && PRED_OBNOVOU.test(o1.otiskPred) && o1.otiskPred.startsWith(otiskDen + 'T'), o1.otiskPred);
test('otisk před obnovou nese stav PŘED obnovou (firma „Po havárii", bez zakázky A)',
  pred.firma.udaje.nazev === 'Po havárii s.r.o.' && !(ulA.soubor in pred.zakazky) && pred.zdroj === 'pred-obnovou' && pred.kdo === ADMIN_EMAIL);
test('dnešní otisk zůstal nedotčený (žádná kolize klíčů)',
  JSON.stringify(await ulz('zalohy').cti(otiskDen)) === JSON.stringify(otiskPuvodni));
const seznamOt = await (await get(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', cookie)).json();
test('přehled otisků ukazuje i otisk před obnovou',
  seznamOt.otisky.some(o => o.den === o1.otiskPred && o.zdroj === 'pred-obnovou'), seznamOt.otisky.map(o => o.den));
test('účty ze souboru se ani ostrou obnovou nezaložily',
  (await ulz('uzivatele').cti('obchodnik@priklad.cz')) === null && o1.casti.uzivatele.preskocene === 2);
test('odpověď upozorní na slot otisku před obnovou', o1.upozorneni.some(u => /pred-obnovou/.test(u)));

/* ---- 6) obnova „přepsat" ze souboru vrátí stav ze zálohy ---- */
const o2 = await obnovJson({ zdroj: { soubor: zalSoubor }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['firma'] }, cookie);
test('přepsat vrátí firmu ze zálohy', o2.ok && o2.casti.firma.prepsane === 1
  && (await ulz('program').cti('firma')).udaje.nazev === SKUT.nazev, o2.casti.firma);
test('obnova po částech se nedotkne ostatního (zakázky v odpovědi nejsou)', o2.casti.zakazky === undefined);

/* ---- 7) novější ruční změna zakázky: doplnit ji nechá, přepsat vrátí ----
 * Od kroku 3 obchodníkův účet neexistuje (ztráta), takže jeho relace
 * správně neprojde — ukládá administrátor. */
const zakA2 = kopie(await ulz('zakazky').cti(A)); zakA2.nazevAkce = 'Ručně upraveno po záloze';
test('ruční změna zakázky A se uloží', (await (await post(zakazky, 'http://x/api/zakazky', { zakazka: zakA2 }, cookie)).json()).ok === true);
const o3 = await obnovJson({ zdroj: { soubor: zalSoubor }, rezim: 'doplnit', potvrzeni: 'OBNOVIT', casti: ['zakazky'] }, cookie);
test('doplnit nepřepíše novější ruční změnu zakázky',
  (await ulz('zakazky').cti(A)).nazevAkce === 'Ručně upraveno po záloze' && o3.casti.zakazky.preskocene === 1, o3.casti.zakazky);
const o4 = await obnovJson({ zdroj: { soubor: zalSoubor }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['zakazky'] }, cookie);
test('přepsat vrátí zakázku ze zálohy',
  (await ulz('zakazky').cti(A)).nazevAkce === 'Zakázka A' && o4.casti.zakazky.prepsane === 1, o4.casti.zakazky);

/* ---- 8) obnova nikdy nemaže: záznam mimo zálohu zůstane ---- */
const zakC = novaZak('2026 - OPR - CN - 0779', 'Zakázka C (po záloze)');
const ulC = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: zakC }, cookie)).json();
test('zakázka C se uložila', ulC.ok === true && !!ulC.soubor, ulC);
const o5 = await obnovJson({ zdroj: { soubor: zalSoubor }, rezim: 'prepsat', potvrzeni: 'OBNOVIT' }, cookie);
test('přepsat neodstraní zakázku, která v záloze není', o5.ok && (await ulz('zakazky').cti('z/' + ulC.soubor)) !== null);
const rej5 = await ulz('zakazky').cti('_rejstrik');
test('a rejstřík ji dál eviduje (3 zakázky)', rej5.zakazky.length === 3 && rej5.zakazky.some(z => z.soubor === ulC.soubor), rej5.zakazky.map(z => z.soubor));

/* ---- 9) uzamčené nabídky se nepřepíšou ani v režimu přepsat ---- */
const zakBz = kopie(await ulz('zakazky').cti(B));
zamkniJakoAplikace(zakBz, zakBz.varianty[0], { typ: 'nabidka', kdy: new Date().toISOString(), kdo: 'Test' });
test('zakázka B se uloží se zámkem', (await (await post(zakazky, 'http://x/api/zakazky', { zakazka: zakBz }, cookie)).json()).ok === true);
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
const obchZpet = await ulz('uzivatele').cti('obchodnik@priklad.cz');
test('z otisku se obchodník obnovil i s otiskem hesla', o10.ok && !!obchZpet && typeof obchZpet.heslo === 'string' && obchZpet.heslo.includes(':'));
const r3 = await post(prihlaseni, 'http://x/api/prihlaseni', { email: 'obchodnik@priklad.cz', heslo: 'ObchodHeslo1' });
test('obnovený obchodník se přihlásí původním heslem', r3.status === 200 && (await r3.json()).ok === true);
test('obnova z otisku před obnovou jde taky (je to platný zdroj)',
  (await obnovJson({ zdroj: { otisk: o1.otiskPred }, rezim: 'doplnit', nahled: true }, cookie)).ok === true);

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

/* ---- 13) obnova po dávkách (soubor větší než jeden požadavek, 7. 9. 2026 večer) ----
 * Netlify přijme ~6 MB; záloha se šablonami a přílohami má i 20 MB. Klient
 * ji dělí: 'zacatek' pořídí otisk a vydá obnovaId, dávky nesou obnovaId
 * (bez dalšího otisku, bez přestavby rejstříku), 'konec' přestaví rejstřík
 * a vrátí součet. */
const HAV3 = kopie(SKUT); HAV3.nazev = 'Třetí havárie s.r.o.';
await post(firma, 'http://x/api/firma', { udaje: HAV3 }, cookie);
await ulz('zakazky').smaz(A);
const rej13 = await ulz('zakazky').cti('_rejstrik');
await ulz('zakazky').zapis('_rejstrik', { ...rej13, zakazky: rej13.zakazky.filter(z => z.soubor !== ulA.soubor) });
const hlava = { porizena: zalSoubor.porizena, zdroj: zalSoubor.zdroj };
test('zacatek bez potvrzení se odmítne (428)',
  (await obnov({ faze: 'zacatek', rezim: 'prepsat' }, cookie)).status === 428);
const zac = await obnovJson({ faze: 'zacatek', rezim: 'prepsat', potvrzeni: 'OBNOVIT' }, cookie);
test('zacatek vydá token a pořídí otisk před obnovou', zac.ok && /^[0-9a-f]{32}$/.test(zac.obnovaId)
  && PRED_OBNOVOU.test(zac.otiskPred), zac);
const predDavkami = kopie(await ulz('zalohy').cti(zac.otiskPred));
test('otisk před obnovou nese stav před dávkami (firma „Třetí havárie", bez A)',
  predDavkami.firma.udaje.nazev === HAV3.nazev && !(ulA.soubor in predDavkami.zakazky));
test('dávka s cizím tokenem 403',
  (await obnov({ obnovaId: 'f'.repeat(32), zdroj: { soubor: { ...hlava, firma: zalSoubor.firma } }, rezim: 'prepsat', potvrzeni: 'OBNOVIT' }, cookie)).status === 403);
test('dávka s nesmyslným tokenem 400',
  (await obnov({ obnovaId: '../x', zdroj: { soubor: { ...hlava, firma: zalSoubor.firma } }, rezim: 'prepsat', potvrzeni: 'OBNOVIT' }, cookie)).status === 400);
test('dávka s jiným režimem než zahájená obnova 400',
  (await obnov({ obnovaId: zac.obnovaId, zdroj: { soubor: { ...hlava, firma: zalSoubor.firma } }, rezim: 'doplnit', potvrzeni: 'OBNOVIT' }, cookie)).status === 400);
const d1 = await obnovJson({ obnovaId: zac.obnovaId, zdroj: { soubor: { ...hlava, firma: zalSoubor.firma } }, rezim: 'prepsat', casti: ['firma'], potvrzeni: 'OBNOVIT' }, cookie);
test('dávka 1 (firma) zapsala a hlásí pořadí', d1.ok && d1.davka === 1 && d1.casti.firma.prepsane === 1
  && (await ulz('program').cti('firma')).udaje.nazev === SKUT.nazev, d1);
test('dávka nepořizuje další otisk (stav před obnovou zůstal)',
  JSON.stringify(await ulz('zalohy').cti(zac.otiskPred)) === JSON.stringify(predDavkami));
const d2 = await obnovJson({ obnovaId: zac.obnovaId, zdroj: { soubor: { ...hlava, zakazky: { [ulA.soubor]: zalSoubor.zakazky[ulA.soubor] } } }, rezim: 'prepsat', casti: ['zakazky'], potvrzeni: 'OBNOVIT' }, cookie);
test('dávka 2 (zakázka A) zapsala, rejstřík ještě nestaví', d2.ok && d2.davka === 2 && d2.casti.zakazky.nove === 1
  && d2.rejstrik.prestaven === false && (await ulz('zakazky').cti(A)) !== null
  && !(await ulz('zakazky').cti('_rejstrik')).zakazky.some(z => z.soubor === ulA.soubor), d2);
const kon = await obnovJson({ faze: 'konec', obnovaId: zac.obnovaId }, cookie);
test('konec přestaví rejstřík a vrátí součet obou dávek', kon.ok && kon.davek === 2
  && kon.souhrn.nove === 1 && kon.souhrn.prepsane === 1 && kon.rejstrik.prestaven === true
  && (await ulz('zakazky').cti('_rejstrik')).zakazky.some(z => z.soubor === ulA.soubor), kon);
test('po konci token neplatí (403)', (await obnov({ faze: 'konec', obnovaId: zac.obnovaId }, cookie)).status === 403);
/* Vypršelý token. UPRAVENO 14. 9. 2026 (nález B49): platnost se počítá od
 * POSLEDNÍ ČINNOSTI, ne od začátku — velká obnova po dávkách hodinu klidně
 * přesáhne a dosud vypršela uprostřed práce. Zestárnout musí obojí, jinak
 * token žije dál (a právě tak se ta změna pozná). */
const zac2 = await obnovJson({ faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' }, cookie);
const tokenZaznam = await ulz('zalohy').cti('obnova-' + zac2.obnovaId);
const stary = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
await ulz('zalohy').zapis('obnova-' + zac2.obnovaId, { ...tokenZaznam, zacatek: stary, naposled: stary });
test('vypršelý token 410',
  (await obnov({ obnovaId: zac2.obnovaId, zdroj: { soubor: { ...hlava, firma: zalSoubor.firma } }, rezim: 'doplnit', potvrzeni: 'OBNOVIT' }, cookie)).status === 410);
test('obchodník zacatek nezahájí (403)',
  (await obnov({ faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' }, cookieObch)).status === 403);

/* ---- 14) záloha z jiného webu (schaftscalc → engscalc) se neodmítá, ale upozorní ---- */
const cizi = await (await obnova(new Request('http://x/api/obnova', { method: 'POST',
  headers: { cookie, host: 'engscalc.netlify.app' },
  body: JSON.stringify({ zdroj: { soubor: { ...zalSoubor, zdroj: 'schaftscalc.netlify.app' } }, rezim: 'doplnit', nahled: true }) }))).json();
test('náhled zálohy z jiného webu projde a upozorní na původ',
  cizi.ok === true && cizi.zdroj.web === 'schaftscalc.netlify.app'
  && cizi.upozorneni.some(u => /jiného webu/.test(u) && /schaftscalc/.test(u) && /engscalc/.test(u)), cizi.upozorneni);
const domaci = await (await obnova(new Request('http://x/api/obnova', { method: 'POST',
  headers: { cookie, host: 'engscalc.netlify.app' },
  body: JSON.stringify({ zdroj: { soubor: { ...zalSoubor, zdroj: 'engscalc.netlify.app' } }, rezim: 'doplnit', nahled: true }) }))).json();
test('záloha z téhož webu bez upozornění na původ', domaci.ok && !domaci.upozorneni.some(u => /jiného webu/.test(u)));

/* ===== bezpečnostní audit 9. 9. 2026: B27, B28, B30, B31, B32 =====
 * Každý test posílá přesně to, co by poslal upravený klient nebo druhý
 * správce — obnova je jediná cesta, která umí přepsat celou databázi. */

/* ---- B28) souběh a opakování obnovy: zámek „obnova běží" ---- */
console.log('\n===== B28: souběh obnov =====');
const zacA = await obnovJson({ faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' }, cookie);
test('B28: vypršelý token z kroku 13 novému začátku nebrání a uklidí se', zacA.ok === true
  && (await ulz('zalohy').cti('obnova-' + zac2.obnovaId)) === null, zacA);
const pocetPredA = (await otiskyPredObnovou()).length;
const druhy = await obnov({ faze: 'zacatek', rezim: 'prepsat', potvrzeni: 'OBNOVIT' }, cookie);
const druhyTelo = await druhy.json();
test('B28: druhý zacatek během živého tokenu → 409 s tím, kdo a kdy obnovu zahájil', druhy.status === 409
  && !!druhyTelo.obnovaBezi && druhyTelo.obnovaBezi.kdo === ADMIN_EMAIL && druhyTelo.obnovaBezi.obnovaId === zacA.obnovaId
  && /zahájil/.test(druhyTelo.chyba), druhyTelo);
test('B28: jednorázová obnova během živého tokenu → 409',
  (await obnov({ zdroj: { soubor: zalSoubor }, rezim: 'doplnit', potvrzeni: 'OBNOVIT', casti: ['firma'] }, cookie)).status === 409);
test('B28: náhled během živého tokenu projde (nic nezapisuje)',
  (await obnovJson({ zdroj: { soubor: zalSoubor }, rezim: 'doplnit', nahled: true, casti: ['firma'] }, cookie)).ok === true);
test('B28: odmítnuté obnovy nepořídily žádný další otisk před obnovou (cesta zpátky nepřepsána)',
  (await otiskyPredObnovou()).length === pocetPredA && (await ulz('zalohy').cti(zacA.otiskPred)) !== null);

const z2 = await (await post(uzivatele, 'http://x/api/uzivatele',
  { akce: 'zaloz', email: 'spravce2@priklad.cz', jmeno: 'Druhý správce', role: 'Administrátor', heslo: 'SpravceHeslo2' }, cookie)).json();
test('vedlejší správce založen', z2.ok === true, z2);
const r4 = await post(prihlaseni, 'http://x/api/prihlaseni', { email: 'spravce2@priklad.cz', heslo: 'SpravceHeslo2' });
const cookieAdmin2 = (r4.headers.get('set-cookie') || '').split(';')[0];
test('B28: vedlejší správce nezahájí obnovu přes cizí rozpracovanou (409)',
  (await obnov({ faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' }, cookieAdmin2)).status === 409);
test('B28: cizí rozpracovanou obnovu nedokončí (403)',
  (await obnov({ faze: 'konec', obnovaId: zacA.obnovaId }, cookieAdmin2)).status === 403);
const zrus = await obnovJson({ faze: 'zrusit', obnovaId: zacA.obnovaId }, cookieAdmin2);
test('B28: ale smí ji zahodit — rejstřík se přestaví, token zmizí, odpověď ukáže otisk', zrus.ok === true && zrus.faze === 'zrusit'
  && zrus.rejstrik.prestaven === true && zrus.otiskPred === zacA.otiskPred
  && (await ulz('zalohy').cti('obnova-' + zacA.obnovaId)) === null, zrus);
test('B28: zahození neznámého tokenu 404', (await obnov({ faze: 'zrusit', obnovaId: 'a'.repeat(32) }, cookie)).status === 404);
test('B28: zahození s nesmyslným tokenem 400', (await obnov({ faze: 'zrusit', obnovaId: '../x' }, cookie)).status === 400);
const zacB = await obnovJson({ faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' }, cookieAdmin2);
test('B28: po zahození jde zahájit znovu', zacB.ok === true, zacB);
const konB = await obnovJson({ faze: 'konec', obnovaId: zacB.obnovaId }, cookieAdmin2);
const zacC = await obnovJson({ faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' }, cookie);
test('B28: po konci jde zahájit znovu', konB.ok === true && zacC.ok === true, [konB, zacC]);
test('B28: a uzavřít', (await obnovJson({ faze: 'konec', obnovaId: zacC.obnovaId }, cookie)).ok === true);

/* ---- B27) účty a podpisy jen ze serverového otisku; hlavní účet jen on sám ---- */
console.log('\n===== B27: účty a podpisy =====');
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const adminSrv = kopie(await ulz('uzivatele').cti(ADMIN_EMAIL));
const podvrh = kopie(zalSoubor);
podvrh.uzivatele = [{ email: ADMIN_EMAIL, jmeno: 'Podvrh', role: 'Administrátor', aktivni: true, heslo: 'aa:bb' },
                    { email: 'novy@priklad.cz', jmeno: 'Nový', role: 'Obchodník', aktivni: true, heslo: 'cc:dd' }];
podvrh.podpisy = { [ADMIN_EMAIL]: { obrazek: PNG }, 'obchodnik@priklad.cz': { obrazek: PNG } };
const o27 = await obnovJson({ zdroj: { soubor: podvrh }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['uzivatele', 'podpisy'] }, cookieAdmin2);
test('B27: vedlejší správce ze souboru hlavní účet nepřepíše — účty ze souboru se přeskočí s důvodem',
  o27.ok === true && o27.casti.uzivatele.preskocene === 2 && o27.casti.uzivatele.nove === 0 && o27.casti.uzivatele.prepsane === 0
  && o27.casti.uzivatele.duvody.every(d => /otisk/.test(d.duvod))
  && JSON.stringify(await ulz('uzivatele').cti(ADMIN_EMAIL)) === JSON.stringify(adminSrv), o27.casti.uzivatele);
test('B27: podpisy ze souboru se nezapíšou (ani hlavního účtu)',
  o27.casti.podpisy.preskocene === 2 && (await ulz('podpisy').cti(ADMIN_EMAIL)) === null
  && (await ulz('podpisy').cti('obchodnik@priklad.cz')) === null, o27.casti.podpisy);
test('B27: odpověď na to upozorní', o27.upozorneni.some(u => /otisk/.test(u)));
test('B27: účet ze souboru nevznikne ani hlavnímu správci',
  (await obnovJson({ zdroj: { soubor: podvrh }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['uzivatele'] }, cookie)).casti.uzivatele.nove === 0
  && (await ulz('uzivatele').cti('novy@priklad.cz')) === null);

const otiskPodvrh = kopie(await ulz('zalohy').cti(otiskDen));
otiskPodvrh.uzivatele = otiskPodvrh.uzivatele
  .map(u => (u.email === ADMIN_EMAIL ? { ...u, heslo: 'aa:bb', jmeno: 'Podvrh' } : u))
  .concat([{ email: 'buh@priklad.cz', jmeno: 'X', role: 'Bůh', aktivni: true, heslo: 'aa:bb' },
           { email: 'ne mail', jmeno: 'X', role: 'Obchodník', aktivni: true, heslo: 'aa:bb' }]);
otiskPodvrh.podpisy = { [ADMIN_EMAIL]: { obrazek: PNG },
                        'obchodnik@priklad.cz': { obrazek: 'data:image/svg+xml;base64,PHN2Zz4=' },
                        'spravce2@priklad.cz': { obrazek: PNG } };
await ulz('zalohy').zapis('2026-01-02', otiskPodvrh);
const o27b = await obnovJson({ zdroj: { otisk: '2026-01-02' }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['uzivatele', 'podpisy'] }, cookieAdmin2);
const u27 = o27b.casti.uzivatele;
test('B27: z otisku vedlejší správce hlavní účet nepřepíše (přeskočeno „jen on sám")',
  u27.duvody.some(d => d.klic === ADMIN_EMAIL && /jen on sám/.test(d.duvod))
  && JSON.stringify(await ulz('uzivatele').cti(ADMIN_EMAIL)) === JSON.stringify(adminSrv), u27);
test('B27: role mimo výčet se nezapíše',
  u27.duvody.some(d => d.klic === 'buh@priklad.cz' && /role/.test(d.duvod)) && (await ulz('uzivatele').cti('buh@priklad.cz')) === null);
test('B27: e-mail v neplatném tvaru se nezapíše', u27.duvody.some(d => d.klic === 'ne mail' && /tvar/.test(d.duvod)));
const p27 = o27b.casti.podpisy;
test('B27: podpis hlavního účtu z otisku vedlejší správce nezapíše',
  p27.duvody.some(d => d.klic === ADMIN_EMAIL && /jen on sám/.test(d.duvod)) && (await ulz('podpisy').cti(ADMIN_EMAIL)) === null, p27);
test('B32: podpis v jiném formátu než PNG/JPEG (SVG) se z otisku nezapíše',
  p27.duvody.some(d => d.klic === 'obchodnik@priklad.cz' && /PNG/.test(d.duvod))
  && (await ulz('podpisy').cti('obchodnik@priklad.cz')) === null, p27);
test('B27: platný podpis jiného účtu se z otisku zapíše', p27.nove === 1 && !!(await ulz('podpisy').cti('spravce2@priklad.cz')), p27);

/* ---- B32) zakázky a ceník ze zálohy procházejí stejnou kontrolou id jako při ukládání ---- */
console.log('\n===== B32: kontrola id v obnově =====');
const zalKid = kopie(zalSoubor);
const podvrhZak = kopie(zalSoubor.zakazky[ulA.soubor]);
podvrhZak.cislo = '2026 - OPR - CN - 0790';
const dz = podvrhZak.varianty[0].data;
dz.proj = dz.proj || {}; dz.proj.cenik = dz.proj.cenik || {};
dz.proj.cenik.vlastniPolozky = { zamereni: [{ kid: "pk1');fetch('/api/zaloha');//", nazev: 'x', typ: 'fix', cena: 1 }] };
zalKid.zakazky = { podvrh: podvrhZak };
const o32 = await obnovJson({ zdroj: { soubor: zalKid }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['zakazky'] }, cookie);
test('B32: zakázka s podvrženým kid se z obnovy přeskočí s důvodem',
  o32.casti.zakazky.preskocene === 1 && /nepovoleném tvaru/.test(o32.casti.zakazky.duvody[0].duvod)
  && (await ulz('zakazky').cti('z/podvrh')) === null, o32.casti.zakazky);
const zalDupl = kopie(zalSoubor);
const duplZak = kopie(zalSoubor.zakazky[ulA.soubor]);
duplZak.varianty.push(kopie(duplZak.varianty[0]));
zalDupl.zakazky = { dupl: duplZak };
const o29 = await obnovJson({ zdroj: { soubor: zalDupl }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['zakazky'] }, cookie);
test('B29: zakázka s duplicitním id varianty se z obnovy přeskočí',
  o29.casti.zakazky.preskocene === 1 && /duplicitní/.test(o29.casti.zakazky.duvody[0].duvod), o29.casti.zakazky);
const zalProg = kopie(zalSoubor);
zalProg.program.platny.cenikProj = { ...(zalProg.program.platny.cenikProj || {}), vlastniPolozky: { dpz: [{ kid: "pk1'", nazev: 'x', typ: 'fix' }] } };
const o26 = await obnovJson({ zdroj: { soubor: zalProg }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['program'] }, cookie);
test('B26: platný ceník s podvrženým kid se z obnovy přeskočí',
  o26.casti.program.preskocene === 1 && /trvalé položky/.test(o26.casti.program.duvody[0].duvod), o26.casti.program);

/* ---- B30/B31) smazané a archivované účty, verze hesla ---- */
console.log('\n===== B30/B31: smazané, archivované účty a verze hesla =====');
const sm = await (await post(uzivatele, 'http://x/api/uzivatele',
  { akce: 'smaz', email: 'obchodnik@priklad.cz', i_se_zakazkami: true }, cookie)).json();
test('obchodník řádně smazán (zapsán do knihy smazaných)', sm.ok === true && sm.smazano === true, sm);
const o30 = await obnovJson({ zdroj: { otisk: otiskDen }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['uzivatele'] }, cookie);
test('B30: smazaný účet se z otisku neoživí a důvod říká, kdy a kdo ho smazal',
  o30.casti.uzivatele.duvody.some(d => d.klic === 'obchodnik@priklad.cz' && /smazán/.test(d.duvod) && d.duvod.includes(ADMIN_EMAIL))
  && (await ulz('uzivatele').cti('obchodnik@priklad.cz')) === null, o30.casti.uzivatele);
test('B30: smazaný obchodník se po obnově nepřihlásí',
  (await post(prihlaseni, 'http://x/api/prihlaseni', { email: 'obchodnik@priklad.cz', heslo: 'ObchodHeslo1' })).status === 401);

test('účty pro B30/B31 založeny',
  (await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'archiv@priklad.cz', jmeno: 'Archivovaný', role: 'Obchodník', heslo: 'ArchivHeslo1' }, cookie)).json()).ok === true
  && (await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'verze@priklad.cz', jmeno: 'Verze', role: 'Obchodník', heslo: 'VerzeHeslo1' }, cookie)).json()).ok === true);
const otiskB30 = await (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', {}, cookie)).json();
test('otisk s oběma účty činnými pořízen', otiskB30.ok === true, otiskB30);
test('archiv@ archivován', (await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'archiv', email: 'archiv@priklad.cz', archiv: true }, cookie)).json()).ok === true);
test('verze@ dostal reset hesla (hesloVerze 1)',
  (await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'heslo', email: 'verze@priklad.cz', heslo: 'VerzeHeslo2' }, cookie)).json()).ok === true
  && (await ulz('uzivatele').cti('verze@priklad.cz')).hesloVerze === 1);
const o31 = await obnovJson({ zdroj: { otisk: otiskB30.den }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['uzivatele'] }, cookie);
const arch = await ulz('uzivatele').cti('archiv@priklad.cz');
test('B30: archivovaný zůstane archivovaný a vypnutý i po „přepsat" z otisku, kde byl činný',
  arch.archiv === true && arch.aktivni === false && !!arch.archivKdy
  && o31.casti.uzivatele.duvody.some(d => d.klic === 'archiv@priklad.cz' && /drží server/.test(d.duvod)), [arch, o31.casti.uzivatele]);
test('B31: hesloVerze po obnově z otisku neklesne (zůstává 1)',
  (await ulz('uzivatele').cti('verze@priklad.cz')).hesloVerze === 1 && o31.casti.uzivatele.prepsane >= 1, o31.casti.uzivatele);

console.log('\n===== B50: vědomě znovu založený účet obnova nepřeskakuje =====');

/* Knihu smazaných čte obnova, aby z otisku neoživila účet, který mezitím
 * někdo smazal (B30). Záznam v ní ale zůstával napořád — i když správce
 * tentýž e-mail vědomě založil znovu. Takový účet pak každá obnova potichu
 * přeskakovala: existoval, fungoval, ale ze zálohy se nikdy neobnovil.
 * Obchodník je v téhle chvíli smazaný z oddílu B30 výš. */
{
  const kniha = ulz(SMAZANI_ULOZISTE);
  test('B50: výchozí stav — smazaný obchodník je v knize smazaných',
    !!(await kniha.cti('obchodnik@priklad.cz')));
  const zaloz = await (await post(uzivatele, 'http://x/api/uzivatele',
    { akce: 'zaloz', email: 'obchodnik@priklad.cz', jmeno: 'Obchodník znovu',
      role: 'Obchodník', heslo: 'ObchodHeslo3' }, cookie)).json();
  test('B50: účet se stejným e-mailem jde vědomě založit znovu', zaloz.ok === true, zaloz);
  test('B50: a z knihy smazaných tím zmizí',
    (await kniha.cti('obchodnik@priklad.cz')) === null);
  /* Teď už ho obnova z otisku, kde byl činný, nepřeskočí. */
  const o = await obnovJson({ zdroj: { otisk: otiskDen }, rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['uzivatele'] }, cookie);
  test('B50: obnova účet nepřeskakuje kvůli starému smazání',
    !o.casti.uzivatele.duvody.some(d => d.klic === 'obchodnik@priklad.cz' && /smazán/.test(d.duvod)),
    o.casti.uzivatele.duvody);
  test('B50: a účet v úložišti zůstal', !!(await ulz('uzivatele').cti('obchodnik@priklad.cz')));
}

console.log('\n===== B58: kniha smazaných účtů jde se zálohou (23. 9. 2026) =====');
{
  const kniha = ulz(SMAZANI_ULOZISTE);
  await kniha.zapis('byvaly@priklad.cz', { email: 'byvaly@priklad.cz', smazano: true, kdy: '2026-09-01T08:00:00.000Z', kdo: ADMIN_EMAIL, zakazek: 0 });
  const zal = (await (await get(zaloha, 'http://x/api/zaloha', cookie)).json()).zaloha;
  test('B58: záloha ke stažení nese knihu smazaných', !!(zal.smazani && zal.smazani['byvaly@priklad.cz']), Object.keys(zal.smazani || {}));
  const v2 = await (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', {}, cookie)).json();
  const ot = await ulz('zalohy').cti(v2.den);
  test('B58: serverový otisk nese knihu smazaných', !!(ot && ot.smazani && ot.smazani['byvaly@priklad.cz']));
  /* Havárie: kniha zmizela. Obnova ze serverového otisku ji doplní. */
  await kniha.smaz('byvaly@priklad.cz');
  const o = await obnovJson({ zdroj: { otisk: v2.den }, rezim: 'doplnit', potvrzeni: 'OBNOVIT', casti: ['uzivatele'] }, cookie);
  test('B58: obnova ze serverového otisku knihu doplní', !!(await kniha.cti('byvaly@priklad.cz')) && o.casti.smazani && o.casti.smazani.nove >= 1,
    JSON.stringify(o.casti && o.casti.smazani));
  /* Pod e-mailem, kde dnes žije účet, se do knihy nezapisuje. */
  const ot2 = kopie(ot); ot2.smazani = { 'obchodnik@priklad.cz': { smazano: true, kdy: '2026-01-01', kdo: 'x' } };
  await ulz('zalohy').zapis(v2.den + 'T000001-pred-obnovou', ot2);
  await obnovJson({ zdroj: { otisk: v2.den + 'T000001-pred-obnovou' }, rezim: 'doplnit', potvrzeni: 'OBNOVIT', casti: ['uzivatele'] }, cookie);
  test('B58: živý účet se do knihy smazaných nezapíše', (await kniha.cti('obchodnik@priklad.cz')) === null);
}

console.log('\n===== B47–B49, B52: dotažení obnovy po dávkách (19. kolo, 14. 9. 2026) =====');

/* --- B47: zrušená obnova se zápisem na konci dávky nevzkřísí ---
 * Dávka běží sekundy a správce mezitím může v jiném okně kliknout na
 * „Zrušit obnovu". Slepý zápis tokenu na konci dávky ho vzkřísil — zámek
 * ožil a databáze zůstala zamčená obnovou, kterou už nikdo nevedl. */
{
  /* Zrušení PŘED dávkou chytne už `nactiToken` a vrátí 403 — to fungovalo
   * i dřív. Nález B47 je o něčem jiném: o zrušení UPROSTŘED dávky, kdy
   * `nactiToken` token ještě viděl a smazal se až během zpracování. */
  const z = await obnovJson({ faze: 'zacatek', rezim: 'prepsat', potvrzeni: 'OBNOVIT' }, cookie);
  test('B47: obnova zahájena', z.ok === true && !!z.obnovaId, z);
  const zr = await obnovJson({ faze: 'zrusit', obnovaId: z.obnovaId, rezim: 'prepsat' }, cookie);
  test('B47: obnova zrušena', zr.ok === true, zr);
  const po = await obnov({ obnovaId: z.obnovaId, zdroj: { soubor: { ...hlava, firma: zalSoubor.firma } },
    rezim: 'prepsat', casti: ['firma'], potvrzeni: 'OBNOVIT' }, cookie);
  test('B47: dávka po zrušení se odmítne (403 od nactiToken)', po.status === 403, po.status);
  test('B47: token po odmítnuté dávce v úložišti NENÍ (zámek neožil)',
    (await ulz('zalohy').cti('obnova-' + z.obnovaId)) === null);

  /* ZRUŠENÍ UPROSTŘED DÁVKY. Dávka běží sekundy; správce mezitím v jiném
   * okně klikne na „Zrušit obnovu". Token tedy při vstupu do dávky ještě
   * byl, ale při zápisu na konci už není. Simuluje se úložištěm, které
   * token vydá jednou a podruhé už ne — časováním by to spolehlivě nešlo. */
  const z2 = await obnovJson({ faze: 'zacatek', rezim: 'prepsat', potvrzeni: 'OBNOVIT' }, cookie);
  test('B47: druhá obnova zahájena', z2.ok === true && !!z2.obnovaId, z2);
  const puvodniUloziste = globalThis.__TEST_ULOZISTE;
  const klicTokenu = 'obnova-' + z2.obnovaId;
  let precteno = 0;
  globalThis.__TEST_ULOZISTE = (nazev) => {
    const s = puvodniUloziste(nazev);
    if (nazev !== 'zalohy') return s;
    return { ...s, async cti(k) {
      if (k === klicTokenu && ++precteno > 1) return null;   // mezitím zrušeno
      return s.cti(k);
    } };
  };
  const behem = await obnov({ obnovaId: z2.obnovaId, zdroj: { soubor: { ...hlava, firma: zalSoubor.firma } },
    rezim: 'prepsat', casti: ['firma'], potvrzeni: 'OBNOVIT' }, cookie);
  globalThis.__TEST_ULOZISTE = puvodniUloziste;
  test('B47: zrušení uprostřed dávky skončí 410, ne zápisem tokenu', behem.status === 410, behem.status);
  const telo = await behem.json();
  test('B47: odpověď říká, že se obnova zrušila a kde je cesta zpátky',
    telo.zruseno === true && /zrušena/.test(telo.chyba || ''), telo.chyba);

  await obnovJson({ faze: 'zrusit', obnovaId: z2.obnovaId, rezim: 'prepsat' }, cookie);
  const znovu = await obnovJson({ faze: 'zacatek', rezim: 'prepsat', potvrzeni: 'OBNOVIT' }, cookie);
  test('B47: po zrušení jde rovnou zahájit novou obnovu (databáze není zamčená)',
    znovu.ok === true, znovu);
  await obnovJson({ faze: 'zrusit', obnovaId: znovu.obnovaId, rezim: 'prepsat' }, cookie);
}

/* --- B48: token vzniká hned po kontrole zámku, ne až po otisku ---
 *
 * CO SE OPRAVDU ZMĚNILO A CO NE. Do 14. 9. bylo pořadí zámek → otisk → token
 * a pořízení otisku trvá SEKUNDY, takže okno, ve kterém dva požadavky
 * `zacatek` viděly prázdný zámek, bylo sekundy dlouhé. Token teď vzniká
 * jako první, takže se to okno zkrátilo na jedno kolo smyčky událostí.
 *
 * ZÁVOD TÍM NENÍ ZAVŘENÝ a nemá smysl předstírat, že je: Netlify Blobs
 * neumí zápis podmíněný tím, že klíč neexistuje, takže dva požadavky, které
 * si sáhnou pro zámek v témže kole, projdou pořád oba. Zavřít to jde jedině
 * atomickým compare-and-set na straně úložiště — a to je vlastní úkol.
 * Kontrola níž proto měří, co se skutečně zlepšilo: token existuje DŘÍV,
 * než je hotový otisk, takže každý další požadavek už zámek uvidí. */
{
  const s = ulz('zalohy');
  const predem = (await s.seznam('obnova-')).length;
  const z = await obnovJson({ faze: 'zacatek', rezim: 'prepsat', potvrzeni: 'OBNOVIT' }, cookie);
  test('B48: zahájení projde', z.ok === true, z);
  const token = await s.cti('obnova-' + z.obnovaId);
  test('B48: token v úložišti je a nese značku poslední činnosti', !!token && !!token.naposled, token);
  test('B48: druhý požadavek hned po prvním narazí na zámek',
    (await obnovJson({ faze: 'zacatek', rezim: 'prepsat', potvrzeni: 'OBNOVIT' }, cookie)).obnovaBezi != null);
  test('B48: a živý token je právě jeden', (await s.seznam('obnova-')).length === predem + 1);
  /* Zápis tokenu PŘED otiskem se hlídá i na zdroji — pořadí je to jediné,
   * co tenhle nález řeší, a z běhu se nedá poznat. */
  const zdrojObnovy = (await import('node:fs')).readFileSync(new URL('./functions/obnova.mjs', import.meta.url), 'utf8');
  const zac = zdrojObnovy.slice(zdrojObnovy.indexOf("if (faze === 'zacatek')"));
  /* Pozor na past: `indexOf` vrací −1, když zápis ve zdroji vůbec není —
   * a −1 je menší než cokoli, takže by kontrola prošla i u kódu, kde se
   * token nezapisuje. Existence se proto ověřuje zvlášť. */
  const iZapis = zac.indexOf('await s.zapis(tokenKlic(id)');
  const iOtisk = zac.indexOf('porizOtisk(');
  test('B48: zápis tokenu ve zdroji vůbec je', iZapis >= 0, iZapis);
  test('B48: token se zapisuje PŘED pořízením otisku',
    iZapis >= 0 && iOtisk >= 0 && iZapis < iOtisk, [iZapis, iOtisk]);
  test('B48: nepovedený otisk token uklidí, aby zámek nezůstal viset',
    /catch \(e\) \{\s*await s\.smaz\(tokenKlic\(id\)\);/.test(zac));
  await obnovJson({ faze: 'zrusit', obnovaId: z.obnovaId, rezim: 'prepsat' }, cookie);
}

/* --- B49: platnost je hodina NEČINNOSTI, ne hodina od začátku --- */
{
  const z = await obnovJson({ faze: 'zacatek', rezim: 'prepsat', potvrzeni: 'OBNOVIT' }, cookie);
  test('B49: obnova pro tenhle oddíl zahájena (zámek po předchozích oddílech volný)',
    z.ok === true && !!z.obnovaId, z);
  const s = ulz('zalohy');
  const pred = await s.cti('obnova-' + z.obnovaId);
  test('B49: token nese značku poslední činnosti', !!pred && !!pred.naposled, pred);
  /* Posuneme začátek o hodinu a půl zpět — kdyby platnost stála na `zacatek`,
   * další dávka by token zahodila. */
  await s.zapis('obnova-' + z.obnovaId, { ...pred, zacatek: new Date(Date.now() - 90 * 60 * 1000).toISOString() });
  const d = await obnovJson({ obnovaId: z.obnovaId, zdroj: { soubor: { ...hlava, firma: zalSoubor.firma } },
    rezim: 'prepsat', casti: ['firma'], potvrzeni: 'OBNOVIT' }, cookie);
  test('B49: dávka po 90 minutách od začátku projde, když se mezitím pracovalo',
    d.ok === true, d);
  const po = await s.cti('obnova-' + z.obnovaId);
  test('B49: dávka posunula značku poslední činnosti',
    !!po.naposled && Date.parse(po.naposled) > Date.parse(pred.naposled) - 1, [pred.naposled, po.naposled]);

  /* A naopak: hodina bez jediné dávky token ukončí — a rejstřík se přestaví.
   * Rejstřík se schválně SMAŽE, aby se poznalo, že ho přestavělo vypršení
   * a ne že tam zbyl z předchozích kroků. Právě to je smysl té opravy:
   * token zmizí uprostřed rozdělané obnovy a rejstřík by jinak zůstal ze
   * stavu před dávkami, takže by zakázky v seznamu chyběly. */
  await ulz('zakazky').smaz('_rejstrik');
  test('B49: rejstřík je pro účel zkoušky smazaný', (await ulz('zakazky').cti('_rejstrik')) === null);
  await s.zapis('obnova-' + z.obnovaId, { ...po, naposled: new Date(Date.now() - 90 * 60 * 1000).toISOString() });
  const vyprsel = await obnov({ obnovaId: z.obnovaId, zdroj: { soubor: { ...hlava, firma: zalSoubor.firma } },
    rezim: 'prepsat', casti: ['firma'], potvrzeni: 'OBNOVIT' }, cookie);
  test('B49: hodina nečinnosti token ukončí (410)', vyprsel.status === 410, vyprsel.status);
  const t410 = await vyprsel.json();
  test('B49: a řekne, že rejstřík byl přestavěn', /rejstřík/.test(t410.chyba || ''), t410.chyba);
  const rej = await ulz('zakazky').cti('_rejstrik');
  test('B49: vypršení rejstřík opravdu přestavělo', !!rej && Array.isArray(rej.zakazky), rej);
}

/* --- B52: otisky před obnovou nevytlačí denní zálohy z přehledu --- */
{
  const { seznamOtisku, OTISKY_PRED_OBNOVOU_LIMIT } = await import('./lib/zalohovani.mjs');
  const s = ulz('zalohy');
  /* Denní otisk musí v přehledu zůstat i po sérii pokusů o obnovu. */
  await s.zapis('2026-01-02', { porizena: '2026-01-02T00:00:00.000Z', zdroj: 'test', zakazky: {}, uzivatele: [] });
  for (let i = 0; i < 20; i++) {
    const kl = '2026-01-03T' + String(100000 + i).slice(0, 6) + '-pred-obnovou';
    await s.zapis(kl, { porizena: '2026-01-03T10:00:00.000Z', zdroj: 'pred-obnovou', zakazky: {}, uzivatele: [] });
  }
  const seznam = await seznamOtisku(14);
  const predObnovou = seznam.filter(o => o.den.indexOf('-pred-obnovou') >= 0);
  const denni = seznam.filter(o => o.den.indexOf('-pred-obnovou') < 0);
  test('B52: otisků před obnovou je v přehledu nejvýš deset',
    predObnovou.length <= OTISKY_PRED_OBNOVOU_LIMIT, predObnovou.length);
  test('B52: denní otisky z přehledu nezmizely',
    denni.some(o => o.den === '2026-01-02'), denni.map(o => o.den));
  test('B52: obojí se vejde do jednoho seznamu seřazeného od nejnovějšího',
    seznam.length === denni.length + predObnovou.length
    && seznam.map(o => o.den).join() === seznam.map(o => o.den).slice().sort().reverse().join(),
    seznam.map(o => o.den));
}

/* ---- B64 (revize v22.9.9): obnova společných dodatkových textů je čistí ----
 *
 * Běžný zápis textů (/api/popisy) hlídá délku klíče i textu, počet položek
 * a tvar hodnot. Obnova ze zálohy je zapisovala doslova — soubor zálohy
 * přitom mohl projít čímkoli. */
{
  const DLOUHY = 'x'.repeat(1000);
  const spinava = {
    porizena: new Date().toISOString(),       // bez razítka pořízení obnova soubor odmítne
    popisy: {
      texty: { 'Sklo VSG': DLOUHY, ['K'.repeat(250)]: 'klíč přes strop', 'Číslo místo textu': 42,
               'Prázdný': '   ', 'Sklo SKN': 'Platná věta.' },
      kdo: 'p'.repeat(500), kdy: 'k'.repeat(100), navic: 'cizí pole',
    },
  };
  const ob = await obnovJson({ zdroj: { soubor: spinava }, rezim: 'prepsat', potvrzeni: 'OBNOVIT',
    casti: ['popisy'] }, cookie);
  test('B64: obnova textů proběhla', ob.ok === true, ob);
  const ul = await ulz('program').cti('popisy');
  const tx = (ul && ul.texty) || {};
  test('B64: text přes strop se zkrátil jako při běžném zápisu', (tx['Sklo VSG'] || '').length === 300,
    (tx['Sklo VSG'] || '').length);
  test('B64: klíč přes strop se nezapsal', !Object.keys(tx).some(k => k.length > 200), Object.keys(tx));
  test('B64: číslo místo textu ani prázdný text se nezapsaly',
    !('Číslo místo textu' in tx) && !('Prázdný' in tx), Object.keys(tx));
  test('B64: platná věta prošla beze změny', tx['Sklo SKN'] === 'Platná věta.', tx['Sklo SKN']);
  test('B64: cizí pole ze zálohy se nezapsalo a razítko má strop',
    ul && !('navic' in ul) && ul.kdo.length === 200 && ul.kdy.length === 40,
    ul && { klice: Object.keys(ul), kdo: ul.kdo.length, kdy: ul.kdy.length });
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
