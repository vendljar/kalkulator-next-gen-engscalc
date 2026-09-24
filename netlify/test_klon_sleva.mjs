/* KLON VARIANTY A ALTERNATIVA NEPŘEBÍRAJÍ SCHVÁLENÍ SLEVY (N44, hloubkový
 * test 24. 9. 2026).
 *
 * Duplikát zakázky rozhodnutí o slevě zahazoval už od 21. 9., klon varianty
 * (⧉) a alternativa z archivu ne. Následky:
 *   – obchodník zakázku s klonem schválené varianty neuložil vůbec (403 —
 *     server bral převzaté „schváleno" jako rozhodnutí, na které nemá právo),
 *   – vedoucí ji uložil a stal se schvalovatelem slevy, kterou nikdy neviděl.
 * Teď si kopie ponese procenta a poznámku, stav a schvalovatele ne; původní
 * varianta své schválení drží dál.
 *
 * Paměťové úložiště, zkušební ceník. Spuštění: node netlify/test_klon_sleva.mjs */
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
import uzivatele from './functions/uzivatele.mjs';
import { ADMIN_EMAIL } from './lib/sdilene.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
/* V prohlížeči jsou všechny moduly globální; tady je vystavíme stejně. */
Object.assign(globalThis, require('../src/format.js'), require('../src/engine.js'), require('../src/engine_proj.js'),
  require('../src/techspec.js'), require('../src/sleva.js'), require('../src/zaokrouhleni.js'), require('../src/zamek.js'),
  require('../src/zakazka.js'));
const zk = require('../src/zakazka.js');
const zm = require('../src/zamek.js');
const AR = require('../src/archiv.js');
const ZC = require('../src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const kopie = x => JSON.parse(JSON.stringify(x));
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h }))
  .headers.get('set-cookie') || '').split(';')[0];
const nacti = async (soubor, c) => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), c)).json()).zakazka;
const uloz = async (zak, razitko, c) => (await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: razitko }, c)).json();

const cA = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 0.3, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15 } }, poznamka: 'x' }, cA);
for (const [e, j, r] of [['obch@priklad.cz', 'Obch Test', 'Obchodník'], ['ved@priklad.cz', 'Ved Test', 'Vedoucí']])
  await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: e, jmeno: j, role: r, heslo: 'Heslo12345x' }, cA);
const cO = await login('obch@priklad.cz', 'Heslo12345x'), cV = await login('ved@priklad.cz', 'Heslo12345x');

/* Obchodník požádá o 12 % (nad svůj strop), vedoucí schválí. */
const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 0902'; z.nazevAkce = 'Klon a sleva';
Object.assign(z.varianty[0].data.cenik, ZC.zkusebniCenik());
Object.assign(z.varianty[0].data.sleva, { procenta: 12, role: 'Obchodník', stav: 'čeká na schválení', poznamka: 'stálý zákazník' });
const r0 = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: z }, cO)).json();
test('obchodník uložil žádost o slevu', r0.ok === true, r0);
let g = await nacti(r0.soubor, cV);
const zz = zk.importZakazka(kopie(g));
Object.assign(zz.varianty[0].data.sleva, { stav: 'schváleno', schvalil: 'Ved Test' });
const r1 = await uloz(zz, g.uloRazitko, cV);
g = await nacti(r0.soubor, cV);
const schvalenoKdy = g.varianty[0].data.sleva.schvalilKdy;
test('vedoucí slevu schválil', r1.ok === true && g.varianty[0].data.sleva.stav === 'schváleno' && !!schvalenoKdy, g.varianty[0].data.sleva);

/* A) Obchodník naklonuje schválenou variantu. */
const a = zk.importZakazka(kopie(g));
const kl = zm.klonujVariantu(a, a.varianty[0].id);
test('A: klon nenese stav ani schvalovatele', kl.data.sleva.stav === '' && !('schvalil' in kl.data.sleva)
  && !('schvalilKdy' in kl.data.sleva), kl.data.sleva);
test('A: klon si nese procenta a poznámku', kl.data.sleva.procenta === 12 && kl.data.sleva.poznamka === 'stálý zákazník', kl.data.sleva);
test('A: sleva klonu se neuplatní, dokud ji někdo neschválí', slevaPlati(kl.data.sleva) === false);
test('A: původní varianta schválení drží', a.varianty[0].data.sleva.stav === 'schváleno'
  && a.varianty[0].data.sleva.schvalilKdy === schvalenoKdy);
const rA = await uloz(a, g.uloRazitko, cO);
test('A: obchodník zakázku s klonem uloží (dřív 403)', rA.ok === true, rA);

/* B) Vedoucí naklonuje — uložením se nesmí stát schvalovatelem klonu. */
g = await nacti(r0.soubor, cV);
const b = zk.importZakazka(kopie(g));
const kl2 = zm.klonujVariantu(b, b.varianty[0].id);
const rB = await uloz(b, g.uloRazitko, cV);
const gB = await nacti(r0.soubor, cV);
const s2 = gB.varianty.find(v => v.id === kl2.id).data.sleva;
test('B: vedoucí zakázku s klonem uloží', rB.ok === true, rB);
test('B: klon uložený vedoucím nemá schvalovatele (dřív ho získal uložením)', s2.stav !== 'schváleno' && !s2.schvalil, s2);

/* C) Alternativa z archivního záznamu se schválenou slevou. */
const c = zk.importZakazka(kopie(gB));
const alt = AR.vytvorAlternativu(c, { data: kopie(g.varianty[0].data), cislo: 'X', varianta: 'V1' }, { cenik: 'historicky' });
test('C: alternativa nenese stav ani schvalovatele', alt && alt.data.sleva.stav === '' && !('schvalil' in alt.data.sleva),
  alt && alt.data.sleva);
const rC = await uloz(c, gB.uloRazitko, cO);
test('C: obchodník zakázku s alternativou uloží', rC.ok === true, rC);

/* D) Duplikát zakázky se chová stejně (sdílená funkce). */
const d = zk.zakazkaDuplikuj(kopie(g), '2026 - OPR - CN - 0903');
test('D: duplikát nenese stav ani schvalovatele', d.varianty[0].data.sleva.stav === '' && !('schvalil' in d.varianty[0].data.sleva));

/* E) Funkce je vůči chybějícím částem tolerantní. */
test('E: data bez slev projdou', JSON.stringify(zk.slevaRozhodnutiZahod({})) === '{}' && zk.slevaRozhodnutiZahod(null) === null);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
