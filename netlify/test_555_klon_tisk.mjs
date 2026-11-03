/* ZO #555 — TISK KLONU ODESLANÉ NABÍDKY: serverová část.
 *
 * Hlášení J. V. 3. 11. 2026: po tisku klonu odeslané nabídky dialog
 * „Odeslaná nabídka není uložená … (Neuloženo: změnila by se data uzamčené
 * (odeslané) nabídky. Pokračujte klonem varianty.)" — bez vodítka, KTERÁ
 * zamčená varianta a CO se liší. Příčinu (typSachtyPrepni dosazoval profily
 * do odeslané varianty) hlídá prohlížečový harness overit_klon_tisk.mjs;
 * tady:
 *   – hláška odmítnutí jmenuje zamčenou variantu (název a číslo) a první
 *     rozdílnou cestu v datech, bez hodnot (žádné ceny) — uložení i obnova;
 *   – pojistka zůstává: změna dat odeslané varianty se dál odmítne (409)
 *     a uložená verze se nezmění;
 *   – povolená změna DPH po CN (Z1) projde i se značkou „nastaveno ručně"
 *     (cenikRucni), kterou `set` při změně DPH poznamená (nalezeno hlídačem
 *     zápisů harnessu).
 *
 * Pojistka: nad 6e4bf49 selžou testy hlášky a DPH se značkou (viz commit).
 * Paměťové úložiště, zkušební ceník, smyšlené údaje.
 * Spuštění: node netlify/test_555_klon_tisk.mjs */
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
const ZC = require('../src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 500))); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const kopie = x => JSON.parse(JSON.stringify(x));

const r1 = await post(prihlaseni, 'http://x/api/prihlaseni', { email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' });
const cookie = (r1.headers.get('set-cookie') || '').split(';')[0];
await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 1, stropy: {} }, poznamka: 'zo555' }, cookie);

/* Odeslaná varianta 1 (zámek se snímkem — Z1) a klon, uloženo. */
const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 8751'; z.nazevAkce = 'TEST ZO 555';
const v = z.varianty[0];
Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2 });
v.data.cenik = Object.assign(v.data.cenik, ZC.zkusebniCenik());
v.data.proj.cenik = Object.assign(v.data.proj.cenik, ZC.zkusebniCenikProj());
zm.zamkniVariantu(v, { cislo: zm.variantaCislo(z, v), typ: 'nabidkaTisk', kdy: new Date().toISOString(),
  vysledek: zm.zamekVysledekSpocti(v, JEKLY, 'test'), snimek: zm.zamekSnimekSpocti(v) });
zm.klonujVariantu(z, v.id);
const r0 = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: z }, cookie)).json();
test('příprava: zakázka s odeslanou variantou a klonem uložena', r0.ok === true, r0);
const klic = [...pamet.keys()].find(k => k.endsWith('/' + r0.soubor) && k.includes('zakazky/'));
const nacti = async () => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(r0.soubor), cookie)).json()).zakazka;

/* 1) změna dat odeslané varianty → 409 s variantou a cestou, bez hodnot */
let g = await nacti();
test('(uložený zámek nese snímek — DPH je po CN editovatelná)', !!(g.varianty[0].zamek && g.varianty[0].zamek.snimek));
const ulozenoPred = pamet.get(klic);
let o = zk.importZakazka(kopie(g));
o.varianty[0].data.ock.zadani.profily.sloupek.dim = '60x40';   // jako typSachtyPrepni do v3.11.1
o.varianty[1].data.ock.zadani.zdvih = 10.5;
let r = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: o, ocekavaneRazitko: g.uloRazitko }, cookie)).json();
const t = String(r.chyba || '');
test('změna dat odeslané varianty se dál odmítne', r.ok === false && /změnila by se data uzamčené \(odeslané\) nabídky/.test(t), r);
test('#555: hláška jmenuje zamčenou variantu názvem a číslem', /„Varianta 1" \(2026 - OPR - CN - 8751\)/.test(t), t);
test('#555: hláška uvádí první rozdílnou cestu', /první rozdíl v datech: ock\.zadani\.profily\.sloupek\.dim/.test(t), t);
test('#555: hláška nenese hodnoty', !/60x40|10[.,]5/.test(t), t);
test('#555: hláška dál radí klon', /Pokračujte klonem varianty\.$/.test(t), t);
test('uložená verze se nezměnila', pamet.get(klic) === ulozenoPred);

/* 2) povolená změna DPH po CN se značkou „nastaveno ručně" projde */
g = await nacti();
o = zk.importZakazka(kopie(g));
const d0 = o.varianty[0].data;
const nova = (+d0.cenik.dph === 0.21) ? 0.12 : 0.21;
d0.cenik.dph = nova;
d0.cenikRucni = Object.assign({}, d0.cenikRucni || {});
delete d0.cenikRucni['C.dph'];
d0.cenikRucni['C.dph'] = true;   // co poznamená set('C.dph') v prohlížeči
test('(značka C.dph ve výchozím stavu nebyla — test něco ověřuje)', !(zk.importZakazka(kopie(g)).varianty[0].data.cenikRucni || {})['C.dph']);
r = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: o, ocekavaneRazitko: g.uloRazitko }, cookie)).json();
test('#555: změna DPH odeslané nabídky po CN projde i se značkou cenikRucni', r.ok === true, r);
test('…a uložila se', (JSON.parse(pamet.get(klic)).varianty[0].data.cenik.dph) === nova);

/* 3) zámek bez snímku (odeslaný před Z1): DPH ani její značka se měnit nesmí */
const z2 = zk.novaZakazka(); z2.cislo = '2026 - OPR - CN - 8752'; z2.nazevAkce = 'TEST ZO 555 bez snímku';
const w = z2.varianty[0];
Object.assign(w.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2 });
w.data.cenik = Object.assign(w.data.cenik, ZC.zkusebniCenik());
w.data.proj.cenik = Object.assign(w.data.proj.cenik, ZC.zkusebniCenikProj());
zm.zamkniVariantu(w, { cislo: zm.variantaCislo(z2, w), typ: 'nabidkaTisk', kdy: new Date().toISOString(), vysledek: zm.zamekVysledekSpocti(w, JEKLY, 'test') });
const r02 = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: z2 }, cookie)).json();
const klic2 = [...pamet.keys()].find(k => k.endsWith('/' + r02.soubor) && k.includes('zakazky/'));
const ul2 = JSON.parse(pamet.get(klic2)); delete ul2.varianty[0].zamek.snimek;
if (ul2.varianty[0].data.cenikRucni) delete ul2.varianty[0].data.cenikRucni['C.dph'];
pamet.set(klic2, JSON.stringify(ul2));
const g2 = (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(r02.soubor), cookie)).json()).zakazka;
const o2 = zk.importZakazka(kopie(g2));
o2.varianty[0].data.cenikRucni = Object.assign({}, o2.varianty[0].data.cenikRucni || {}, { 'C.dph': true });
r = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: o2, ocekavaneRazitko: g2.uloRazitko }, cookie)).json();
test('zámek bez snímku: ani samotná značka DPH neprojde (cesta cenikRucni.C.dph)', r.ok === false
  && /první rozdíl v datech: cenikRucni\.C\.dph/.test(String(r.chyba || '')), r);

/* 4) obnova ze zálohy: důvod nese variantu a cestu */
const vUlozisti = JSON.parse(pamet.get(klic));
const zmenena = kopie(vUlozisti); zmenena.varianty[0].data.ock.zadani.zdvih = 11;
const ob = await (await post(obnova, 'http://x/api/obnova',
  { zdroj: { soubor: { porizena: new Date().toISOString(), zakazky: { [r0.soubor]: zmenena } } }, rezim: 'prepsat', nahled: true, casti: ['zakazky'] }, cookie)).json();
const duvody = (ob.casti && ob.casti.zakazky && ob.casti.zakazky.duvody) || [];
const du = duvody.map(x => x.duvod).join(' | ');
test('#555: obnova — důvod jmenuje variantu a cestu (bez hodnoty)',
  /změnila by se data uzamčené \(odeslané\) nabídky „Varianta 1" \(2026 - OPR - CN - 8751\), první rozdíl v datech: ock\.zadani\.zdvih/.test(du)
  && !/\b11\b/.test(du.replace(/8751/g, '')), du || ob);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
