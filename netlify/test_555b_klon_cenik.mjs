/* ZO2 #555b — TISK KLONU: „první rozdíl v datech: cenik" (serverová část).
 *
 * Hlášení J. V. 3. 11. 2026 (test v3.11.3): po tisku klonu „Neuloženo:
 * změnila by se data uzamčené (odeslané) nabídky „Varianta 1" (…), první
 * rozdíl v datech: cenik". Odeslané variantě uložené starší verzí chyběly
 * klíče ceníku, které přibyly později. Prohlížeč je při otevření doplnil
 * podle zveřejněného ceníku — v JINÉM POŘADÍ (a s jiným textem) než server,
 * který uloženou verzi před porovnáním migruje s ceníkem sestavení. Porovnání
 * textem JSON pak hlásilo změnu, i když se hodnoty nelišily.
 *
 * Tady tělo uložení tak, jak ho posílal prohlížeč do v3.11.3 (doplněné klíče
 * na konci v jiném pořadí), proti skutečné serverové kontrole:
 *   – projde (pořadí klíčů není obsah — zamekDataPorovnani),
 *   – pojistka zůstává: změněná cena, jiný doplněný text i chybějící ceník
 *     odeslané varianty se dál odmítnou (409) a uložená verze se nezmění,
 *   – hláška u chybějící strany řekne kterou: „cenik (chybí v ukládané)".
 * Prohlížečovou příčinu (vzor doplnění v importZakazka) hlídají
 * src/test_555b_klon_cenik.js a overit_klon_tisk.mjs 5).
 *
 * Pojistka: nad 198ed4c selže první test (409 „… první rozdíl v datech:
 * cenik") a testy hlášky (viz commit). Paměťové úložiště, zkušební ceník,
 * smyšlené údaje. Spuštění: node netlify/test_555b_klon_cenik.mjs */
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
  slevy: { minMarze: 0, maxGlobalni: 1, stropy: {} }, poznamka: 'zo2-555b' }, cookie);

/* Odeslaná varianta 1 a klon, uloženo; pak „zestárnutí" uložené verze. */
const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 8781'; z.nazevAkce = 'TEST ZO2 555b';
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
const STARE = ['zamecnikAtypKc', 'kurzEurKc', 'atypMontazPct', 'dleNabidky', 'skloBokyNazev'];
{
  const u = JSON.parse(pamet.get(klic));
  STARE.forEach(k => delete u.varianty[0].data.cenik[k]);
  pamet.set(klic, JSON.stringify(u));
}
const nacti = async () => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(r0.soubor), cookie)).json()).zakazka;
const g = await nacti();
test('(uložená odeslaná varianta nemá klíče, které přibyly později)', STARE.every(k => !(k in g.varianty[0].data.cenik)));
/* Co doplní server (ceník sestavení) — hodnota i pořadí. */
const srv = globalThis.importZakazka(kopie(g)).varianty[0].data.cenik;
const poradiSrv = Object.keys(srv).filter(k => STARE.indexOf(k) >= 0);

/* Tělo uložení jako z prohlížeče: klon změněný, odeslaná varianta s klíči
 * doplněnými na konec v JINÉM pořadí než na serveru. */
const telo = (upravV1) => {
  const o = kopie(g);
  const c = o.varianty[0].data.cenik;
  poradiSrv.slice().reverse().forEach(k => { c[k] = kopie(srv[k]); });
  if (upravV1) upravV1(o.varianty[0].data);
  o.varianty[1].data.ock.zadani.zdvih = 10.5;
  return o;
};
test('(tělo: doplněné klíče v jiném pořadí než na serveru — jinak test nic neověřuje)',
  Object.keys(telo().varianty[0].data.cenik).filter(k => STARE.indexOf(k) >= 0).join() !== poradiSrv.join(), poradiSrv);
const uloz = async (o) => (await (await post(zakazky, 'http://x/api/zakazky', { zakazka: o, ocekavaneRazitko: g.uloRazitko }, cookie)).json());

/* Pojistka nejdřív (uložená verze se nemění), pak platné uložení. */
const ulozenoPred = pamet.get(klic);
let r = await uloz(telo(d => { d.cenik.montazHodKc = (+d.cenik.montazHodKc || 0) + 1; }));
let t = String(r.chyba || '');
test('pojistka: změněná cena odeslané varianty se dál odmítne', r.ok === false && /změnila by se data uzamčené \(odeslané\) nabídky/.test(t), r);
test('…cesta k položce bez poznámky a bez hodnoty', /první rozdíl v datech: cenik\.montazHodKc\. Pokračujte/.test(t) && !/\d{2,}/.test(t.replace(/2026 - OPR - CN - 8781/g, '')), t);
r = await uloz(telo(d => { d.cenik.skloBokyNazev = 'jiný text skla (zkušební)'; }));
t = String(r.chyba || '');
test('pojistka: jiný doplněný text ceníku se odmítne (cesta cenik.skloBokyNazev)', r.ok === false && /první rozdíl v datech: cenik\.skloBokyNazev\./.test(t), t);
r = await uloz(telo(d => { delete d.cenik; }));
t = String(r.chyba || '');
test('#555b: chybějící ceník odeslané varianty se odmítne', r.ok === false && /změnila by se data uzamčené/.test(t), r);
test('#555b: hláška řekne, která strana ceník nemá: „cenik (chybí v ukládané)"', /první rozdíl v datech: cenik \(chybí v ukládané\)\. Pokračujte/.test(t), t);
r = await uloz(telo(d => { d.cenik = []; }));
t = String(r.chyba || '');
test('#555b: ceník jako pole → „cenik (jiný typ)"', r.ok === false && /první rozdíl v datech: cenik \(jiný typ\)\./.test(t), t);
test('uložená verze se po odmítnutích nezměnila', pamet.get(klic) === ulozenoPred);

r = await uloz(telo());
test('#555b: tělo z prohlížeče (doplněné klíče v jiném pořadí) se uloží', r.ok === true, r);
const po = JSON.parse(pamet.get(klic));
test('…klon uložen se změnou', po.varianty[1].data.ock.zadani.zdvih === 10.5);
test('…odeslaná varianta věcně beze změny (po téže migraci jako server)',
  zm.zamekDataPorovnani(globalThis.importZakazka(kopie(po)).varianty[0].data, po.varianty[0])
  === zm.zamekDataPorovnani(globalThis.importZakazka(kopie(g)).varianty[0].data, g.varianty[0]));

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
