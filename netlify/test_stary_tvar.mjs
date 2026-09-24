/* ODESLANÁ NABÍDKA VE STARŠÍM TVARU DAT JDE ULOŽIT (N43, hloubkový test 24. 9. 2026).
 *
 * Zakázka s odeslanou (zamčenou) nabídkou uložená dřív, než přibyly nové
 * klíče dat (cetrisKc 17. 9., zaokrProj, kryciProj…), se po otevření v nové
 * verzi nedala uložit vůbec: `importZakazka` klíče doplnil i do zamčené
 * varianty a server ji porovnával s nemigrovanou uloženou verzí → 409 celé
 * zakázce, i práci na odemčených variantách. Server teď porovnává
 * migrované s migrovaným. Tahle sada hlídá, že:
 *   – starší tvar dat jde po otevření uložit (200),
 *   – skutečná změna dat odeslané nabídky se dál odmítne (409),
 *   – totéž platí pro obnovu ze zálohy.
 *
 * Paměťové úložiště, zkušební ceník. Spuštění: node netlify/test_stary_tvar.mjs */
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
import program from './functions/program.mjs';
import zakazky from './functions/zakazky.mjs';
import obnova from './functions/obnova.mjs';
import { ADMIN_EMAIL } from './lib/sdilene.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
Object.assign(globalThis, require('../src/format.js'), require('../src/engine.js'), require('../src/engine_proj.js'),
  require('../src/techspec.js'), require('../src/sleva.js'), require('../src/zaokrouhleni.js'), require('../src/zamek.js'));
const zk = require('../src/zakazka.js');
const ZC = require('../src/zkusebni_cenik.js');
const zm = require('../src/zamek.js');
const JEKLY = require('../src/jekly.json');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const kopie = x => JSON.parse(JSON.stringify(x));

const r1 = await post(prihlaseni, 'http://x/api/prihlaseni', { email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' });
const cookie = (r1.headers.get('set-cookie') || '').split(';')[0];
await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0.1, maxGlobalni: 0.3, stropy: {} }, poznamka: 'x' }, cookie);

/* Zakázka se zamčenou variantou (i se zmrazeným výsledkem) a odemčeným klonem. */
const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 0901'; z.nazevAkce = 'Starší tvar';
const v = z.varianty[0];
v.data.cenik = Object.assign(v.data.cenik, ZC.zkusebniCenik());
v.data.proj.cenik = Object.assign(v.data.proj.cenik, ZC.zkusebniCenikProj());
zm.zamkniVariantu(v, { cislo: zm.variantaCislo(z, v), typ: 'nabidka', vysledek: zm.zamekVysledekSpocti(v, JEKLY, 'test') });
zm.klonujVariantu(z, v.id);
const r0 = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: z }, cookie)).json();
test('zakázka s odeslanou nabídkou uložena', r0.ok === true, r0);
const klic = 'zakazky/z/' + r0.soubor;

/* Simulace staršího tvaru: z uložené zamčené varianty zmizí klíče, které
 * přibyly později. */
const ulozena = JSON.parse(pamet.get(klic));
const sd = ulozena.varianty[0].data;
delete sd.cenik.cetrisKc; delete sd.zaokrProj; delete sd.kryciProj;
pamet.set(klic, JSON.stringify(ulozena));

const g = await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(r0.soubor), cookie)).json();
const otevrena = zk.importZakazka(kopie(g.zakazka)); zm.zajistiZamek(otevrena);
test('(otevření v nové verzi opravdu doplní klíče do zamčené varianty)',
  JSON.stringify(otevrena.varianty[0].data) !== JSON.stringify(g.zakazka.varianty[0].data));
/* Práce na odemčené variantě a uložení. */
otevrena.varianty[1].data.ock.zadani.sirka = 1.77;
const r2 = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: otevrena, ocekavaneRazitko: g.zakazka.uloRazitko }, cookie)).json();
test('N43: po otevření v nové verzi jde zakázka uložit (dřív 409)', r2.ok === true, r2);
test('N43: práce na odemčené variantě se uložila', JSON.parse(pamet.get(klic)).varianty[1].data.ock.zadani.sirka === 1.77);
const r3 = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: kopie(g.zakazka), ocekavaneRazitko: JSON.parse(pamet.get(klic)).uloRazitko }, cookie)).json();
test('N43: projde i klient, který pošle přesně to, co dostal (bez vlastní migrace)', r3.ok === true, r3);

/* Pojistka nesmí povolit skutečnou změnu odeslané nabídky. */
const g2 = await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(r0.soubor), cookie)).json();
const zmenena = zk.importZakazka(kopie(g2.zakazka));
zmenena.varianty[0].data.cenik.cetrisKc = 999;
const r4 = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: zmenena, ocekavaneRazitko: g2.zakazka.uloRazitko }, cookie)).json();
test('změna dat odeslané nabídky se dál odmítne (409)', r4.ok === false && /uzamčen/.test(r4.chyba || ''), r4);
const zmenena2 = zk.importZakazka(kopie(g2.zakazka));
zmenena2.varianty[0].data.ock.zadani.sirka = 9.99;
const r5 = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: zmenena2, ocekavaneRazitko: g2.zakazka.uloRazitko }, cookie)).json();
test('ani změna zadání odeslané nabídky neprojde', r5.ok === false, r5);

/* Obnova ze zálohy: soubor ve starém tvaru nad uloženou (novější) verzí. */
const vUlozisti = JSON.parse(pamet.get(klic));
const souborZalohy = { porizena: new Date().toISOString(), zakazky: { [r0.soubor]: ulozena } };
const o = await (await post(obnova, 'http://x/api/obnova',
  { zdroj: { soubor: souborZalohy }, rezim: 'prepsat', nahled: true, casti: ['zakazky'] }, cookie)).json();
const duvody = (o.casti && o.casti.zakazky && o.casti.zakazky.duvody) || [];
test('N43: obnova ze zálohy ve starším tvaru nehlásí změnu dat odeslané nabídky',
  o.ok === true && !duvody.some(d => /změnila by se data uzamčené/.test(d.duvod)), o.casti && o.casti.zakazky);
test('(úložiště náhledem nezměněno)', pamet.get(klic) === JSON.stringify(vUlozisti));

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
