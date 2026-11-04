/* #560 — ZRUŠENÁ VOLBA SVĚTLÍKU „ZAJISTÍ STAVBA": serverová část.
 *
 * Rozhodnutí J. V. 4. 11. 2026: „stavba" = „bez" (prostor světlíku dozdí
 * stavba). Nová „stavba" nesmí vzniknout; stará data ji nesou dál —
 * odeslaná (zamčená) nabídka beze změny, rozpracovaná do prvního otevření.
 *
 * Hlídá se proti skutečné funkci /api/zakazky (paměťové úložiště):
 *   1) nová zakázka se „stavba" se odmítne (400) s větou o zrušené volbě,
 *   2) uložená zakázka se „stavba" (odeslaná + rozpracovaná varianta): klient
 *      ji otevře, převede rozpracovanou (svetlikyStavbaPrevod) a uloží —
 *      BEZ chyby zámku; odeslaná zůstane v úložišti bajt po bajtu (data
 *      i zámek) a její cena z uložených dat se nehne o haléř,
 *   3) změna volby zpět na „stavba" se odmítne; starý klient, který
 *      rozpracovanou „stavbu" nepřevedl, uloží (stará data),
 *   4) administrátor odemkne odeslanou variantu se „stavba" bez 409 (proto
 *      převod není v importZakazka) a klon odeslané varianty se uloží,
 *   5) obnova ze zálohy starou rozpracovanou „stavba" neodmítne.
 *
 * Pojistka: nad 6109e39 selže bod 1 (server „stavba" pouštěl) a převod
 * (svetlikyStavbaPrevod neexistuje) — viz commit. Smyšlené údaje,
 * zkušební ceník.
 * Spuštění: node netlify/test_560_svetliky_stavba.mjs */
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
import { jadro } from './lib/jadro.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { JEKLY } = await jadro();
const zk = require('../src/zakazka.js');
const zm = require('../src/zamek.js');
const E = require('../src/engine.js');
const ZC = require('../src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 500))); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const kopie = x => JSON.parse(JSON.stringify(x));
const cenaZDat = d => E.vypocet(d.ock.zadani, d.cenik, JEKLY, d.ock.fixes).souhrn.zakladCena;

const r1 = await post(prihlaseni, 'http://x/api/prihlaseni', { email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' });
const cookie = (r1.headers.get('set-cookie') || '').split(';')[0];
await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 1, stropy: {} }, poznamka: 'sv560' }, cookie);

function zakazka(cislo) {
  const z = zk.novaZakazka(); z.cislo = cislo; z.nazevAkce = 'TEST SV 560';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2 });
  v.data.cenik = Object.assign(v.data.cenik, ZC.zkusebniCenik());
  v.data.proj.cenik = Object.assign(v.data.proj.cenik, ZC.zkusebniCenikProj());
  return z;
}
const stavba = zad => Object.assign(zad, { nadDvermi: 'stavba', svetlikNadDvermi: false, bokyDveri: 'stavba', svetlikyBokyKs: 6 });

/* 1) nová zakázka se „stavba" → 400 */
{
  const z = zakazka('2026 - OPR - CN - 9560');
  stavba(z.varianty[0].data.ock.zadani);
  const r = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: z }, cookie)).json();
  test('nová zakázka se „stavba" se odmítne', r.ok === false && /zrušenou volbu světlíku „zajistí stavba"/.test(String(r.chyba || '')), r);
  test('…věta radí „bez" a otevřít znovu', /se volí „bez".*otevřete zakázku znovu/.test(String(r.chyba || '')), r.chyba);
  test('…hláška nenese ceny', !/Kč|\d{4,}/.test(String(r.chyba || '').replace(/\d{1,2}\. \d{1,2}\. \d{4}/g, '')), r.chyba);
}

/* 2) uložená stará data: odeslaná + rozpracovaná varianta se „stavba" */
const z0 = zakazka('2026 - OPR - CN - 9561');
zm.klonujVariantu(z0, z0.varianty[0].id);
const r0 = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: z0 }, cookie)).json();
test('příprava: zakázka (zatím bez „stavba") uložena', r0.ok === true, r0);
const klic = [...pamet.keys()].find(k => k.endsWith('/' + r0.soubor) && k.includes('zakazky/'));
/* Starší verze aplikace: obě varianty „stavba", první odeslaná (zámek se
 * zmrazeným výsledkem spočteným se „stavba"). Zapisuje se rovnou do úložiště
 * — dnes by takový zápis server nepustil, a právě o stará data jde. */
{
  const ul = JSON.parse(pamet.get(klic));
  ul.varianty.forEach(v => stavba(v.data.ock.zadani));
  const v = ul.varianty[0];
  zm.zamkniVariantu(v, { cislo: zm.variantaCislo(ul, v), typ: 'nabidkaTisk', kdy: '2026-10-01T10:00:00.000Z',
    vysledek: zm.zamekVysledekSpocti(v, JEKLY, 'test'), snimek: zm.zamekSnimekSpocti(v) });
  pamet.set(klic, JSON.stringify(ul));
}
const nacti = async () => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(r0.soubor), cookie)).json()).zakazka;
/* Data a zmrazený výsledek odeslané varianty. Značku `zamek.hlavicka` (Z1)
 * doplní server sám při prvním uložení zámku — s #560 nesouvisí. */
const otiskOdeslane = v => JSON.stringify({ data: v.data, vysledek: v.zamek && v.zamek.vysledek, cislo: v.zamek && v.zamek.cislo });
const ulozenaOdeslana = () => otiskOdeslane(JSON.parse(pamet.get(klic)).varianty[0]);
const odeslanaPred = ulozenaOdeslana();
const cenaOdeslanePred = cenaZDat(JSON.parse(odeslanaPred).data);
let g = await nacti();
let o = zk.importZakazka(kopie(g));
const odeslanaPoImportu = JSON.stringify(o.varianty[0].data);
const cenaRozpracovanePred = cenaZDat(o.varianty[1].data);
/* Totéž, co obrazovka po otevření (uloSrovnejSPlatnymCenikem). */
const n = zk.svetlikyStavbaPrevod(o);
test('klient: převedena jen rozpracovaná varianta', n === 1 && o.varianty[0].data.ock.zadani.nadDvermi === 'stavba'
  && o.varianty[1].data.ock.zadani.nadDvermi === 'bez' && o.varianty[1].data.ock.zadani.bokyDveri === 'bez', n);
test('klient: data odeslané varianty se převodem nezměnila', JSON.stringify(o.varianty[0].data) === odeslanaPoImportu);
let r = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: o, ocekavaneRazitko: g.uloRazitko }, cookie)).json();
test('uložení po převodu projde bez chyby zámku', r.ok === true, r);
test('odeslaná varianta v úložišti beze změny (data a zmrazený výsledek, bajt po bajtu)', ulozenaOdeslana() === odeslanaPred);
g = await nacti();
test('rozpracovaná v úložišti „bez"', g.varianty[1].data.ock.zadani.nadDvermi === 'bez' && g.varianty[1].data.ock.zadani.bokyDveri === 'bez');
test('odeslaná: cena z uložených dat na haléř stejná', cenaZDat(zk.importZakazka(kopie(g)).varianty[0].data) === cenaOdeslanePred
  && cenaOdeslanePred === g.varianty[0].zamek.vysledek.ock.souhrn.zakladCena, [cenaOdeslanePred]);
test('rozpracovaná: přepočtená cena klesla (boční světlíky pryč)', cenaZDat(g.varianty[1].data) < cenaRozpracovanePred);

/* 3) změna zpět na „stavba" → 400; starý klient bez převodu → projde */
o = zk.importZakazka(kopie(g));
o.varianty[1].data.ock.zadani.nadDvermi = 'stavba';
r = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: o, ocekavaneRazitko: g.uloRazitko }, cookie)).json();
test('změna rozpracované varianty na „stavba" se odmítne', r.ok === false && /zajistí stavba/.test(String(r.chyba || '')), r);
{
  const ul = JSON.parse(pamet.get(klic));
  stavba(ul.varianty[1].data.ock.zadani);   // rozpracovaná varianta, kterou ještě nikdo nový neotevřel
  pamet.set(klic, JSON.stringify(ul));
}
g = await nacti();
o = zk.importZakazka(kopie(g));            // starý klient: bez převodu
o.varianty[1].pozn = 'poznámka ze staré verze';
r = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: o, ocekavaneRazitko: g.uloRazitko }, cookie)).json();
test('starý klient uloží rozpracovanou „stavba", kterou už nesla uložená verze', r.ok === true, r);

/* 4) odemčení odeslané varianty se „stavba" a klon */
g = await nacti();
o = zk.importZakazka(kopie(g));
const od = zm.odemkniVariantu(o.varianty[0], { jeAdmin: true, duvod: 'oprava překlepu', kdo: ADMIN_EMAIL });
r = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: o, ocekavaneRazitko: g.uloRazitko }, cookie)).json();
test('administrátor odemkne odeslanou variantu se „stavba" bez 409', od.ok && r.ok === true, r);
test('…odemčená varianta nese „stavba" do dalšího otevření', JSON.parse(pamet.get(klic)).varianty[0].data.ock.zadani.nadDvermi === 'stavba');
g = await nacti();
o = zk.importZakazka(kopie(g));
test('další otevření převede i odemčenou variantu', zk.svetlikyStavbaPrevod(o) === 2
  && o.varianty.every(v => v.data.ock.zadani.nadDvermi === 'bez' && v.data.ock.zadani.bokyDveri === 'bez'));
r = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: o, ocekavaneRazitko: g.uloRazitko }, cookie)).json();
test('…a uloží se', r.ok === true, r);

/* klon odeslané varianty (nová zakázka s odeslanou „stavba") */
const z3 = zakazka('2026 - OPR - CN - 9562');
const r3 = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: z3 }, cookie)).json();
const klic3 = [...pamet.keys()].find(k => k.endsWith('/' + r3.soubor) && k.includes('zakazky/'));
{
  const ul = JSON.parse(pamet.get(klic3));
  const v = ul.varianty[0]; stavba(v.data.ock.zadani);
  zm.zamkniVariantu(v, { cislo: zm.variantaCislo(ul, v), typ: 'nabidkaTisk', kdy: '2026-10-01T10:00:00.000Z',
    vysledek: zm.zamekVysledekSpocti(v, JEKLY, 'test'), snimek: zm.zamekSnimekSpocti(v) });
  pamet.set(klic3, JSON.stringify(ul));
}
const pred3 = otiskOdeslane(JSON.parse(pamet.get(klic3)).varianty[0]);
const g3 = (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(r3.soubor), cookie)).json()).zakazka;
const o3 = zk.importZakazka(kopie(g3));
test('(odeslaná jediná varianta: převod nic nemění)', zk.svetlikyStavbaPrevod(o3) === 0);
const k3 = zm.klonujVariantu(o3, o3.varianty[0].id);
r = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: o3, ocekavaneRazitko: g3.uloRazitko }, cookie)).json();
test('klon odeslané varianty („bez") se uloží', r.ok === true && k3.data.ock.zadani.nadDvermi === 'bez', r);
test('…odeslaná zůstala v úložišti beze změny', otiskOdeslane(JSON.parse(pamet.get(klic3)).varianty[0]) === pred3);

/* 5) obnova ze zálohy: rozpracovaná „stavba" je stará data, ne nová volba */
{
  const zb = zakazka('2026 - OPR - CN - 9564');
  stavba(zb.varianty[0].data.ock.zadani);
  const ob = await (await post(obnova, 'http://x/api/obnova',
    { zdroj: { soubor: { porizena: new Date().toISOString(), zakazky: { '2026-OPR-CN-9564.json': zb } } }, rezim: 'prepsat', nahled: true, casti: ['zakazky'] }, cookie)).json();
  const duvody = (ob.casti && ob.casti.zakazky && ob.casti.zakazky.duvody) || [];
  test('obnova ze zálohy se starou rozpracovanou „stavba" se neodmítne', ob.ok !== false && duvody.length === 0
    && !/zajistí stavba/.test(JSON.stringify(ob)), ob);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
