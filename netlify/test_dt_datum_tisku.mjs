/* ============================================================
 * DÁVKA DT (#745, J. V. 24. 11. 2026) — datum cenové nabídky = den tisku,
 * odeslaná drží den odeslání v `zamek.datumNabidky`. Server:
 *   – nový zámek: platné datum (ne po dni odeslání, nejvýš 7 dní před ním)
 *     přijme, jiné nahradí dnem odeslání v Praze, chybějící nechá chybět
 *     (starší klient → dotisk tiskne datum založení jako dosud);
 *   – uložený zámek: datum drží (klient ho nepřepíše ani nedopíše).
 * Pole je mimo klíč zámku — uložení bez něj nedostane 409.
 *
 * Skutečné funkce netlify/functions nad PAMĚŤOVÝM úložištěm, bez sítě.
 * Smyšlené kontakty …@priklad.cz. Spouští se `node netlify/test_dt_datum_tisku.mjs`.
 * Pojistka: před opravou selžou testy „nahradí“ (server nesmysl uložil)
 * a „drží“ (klient datum uloženého zámku přepsal).
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';

const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

import './pomoc_test_admin.mjs';
import { dnesPraha } from './pomoc_den.mjs'; // MT2: den prodeje v pražském čase jako server
import prihlaseni from './functions/prihlaseni.mjs';
import program from './functions/program.mjs';
import zakazky from './functions/zakazky.mjs';
import zaloha from './functions/zaloha.mjs';
import obnova from './functions/obnova.mjs';
import uzivatele from './functions/uzivatele.mjs';
import { ADMIN_EMAIL } from './lib/sdilene.mjs';
import { jadro } from './lib/jadro.mjs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { JEKLY } = await jadro();
const zk = require('../src/zakazka.js');
const zam = require('../src/zamek.js');
const ZC = require('../src/zkusebni_cenik.js');
const G = globalThis;

let ok = 0, fail = 0; const selhalo = [];
function test(nazev, podminka, detail) {
  if (podminka) { ok++; console.log('  ✓ ' + nazev); }
  else { fail++; selhalo.push(nazev); console.log('  ✗ ' + nazev + (detail ? ' — ' + detail : '')); }
}
const kopie = x => JSON.parse(JSON.stringify(x));
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST',
  headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const uloz = async (zak, c, razitko) => {
  const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: razitko }, c);
  let t; try { t = await r.json(); } catch (e) { t = {}; }
  return { status: r.status, ...t };
};
const nacti = async (soubor, c) => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), c)).json()).zakazka;

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
{
  const rp = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
    slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.03, 'Vedoucí': 0.12, 'Administrátor': 1 } }, poznamka: 'DT' }, cA)).json();
  if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
  for (const [e, j, r] of [['dt.obch@priklad.cz', 'Obch DT', 'Obchodník'], ['dt.ved@priklad.cz', 'Ved DT', 'Vedoucí']]) {
    const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: e, jmeno: j, role: r, heslo: 'Heslo12345x' }, cA)).json();
    if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
  }
}
const cO = await prihlas('dt.obch@priklad.cz', 'Heslo12345x');
const cV = await prihlas('dt.ved@priklad.cz', 'Heslo12345x');

let n = 7450;
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++) + ' - TEST'; z.nazevAkce = 'TEST ' + nazev;
  z.objednatel = 'TEST – TESTOVACÍ ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.cenik = ZC.zkusebniCenik(); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
const zamkni = (z, v, datumNabidky) => {
  const vysledek = zam.zamekVysledekSpocti(v, JEKLY, 'DT');
  zam.zamkniVariantu(v, { typ: 'nabidka', kdy: new Date().toISOString(), kdo: 'Obch DT',
    cislo: zam.variantaCislo(z, v), vysledek, snimek: zam.zamekSnimekSpocti(v), datumNabidky });
};
const dnes = dnesPraha();
const posun = (iso, dni) => new Date(Date.parse(iso + 'T12:00:00Z') + dni * 86400000).toISOString().slice(0, 10);
const ulozNovy = async (nazev, datumNabidky, upravit) => {
  const z = nova(nazev); zamkni(z, z.varianty[0], datumNabidky);
  if (upravit) upravit(z.varianty[0].zamek);
  const r = await uloz(z, cO);
  return { r, g: r.status === 200 ? await nacti(r.soubor, cO) : null };
};

console.log('\n===== DT #745: DATUM NABÍDKY V ZÁMKU =====\n');
{
  const { r, g } = await ulozNovy('DT dnes', dnes);
  test('nový zámek s dneškem: uložen (200)', r.status === 200, r.status + ' ' + (r.chyba || ''));
  test('… datumNabidky = dnešek', g && g.varianty[0].zamek.datumNabidky === dnes, g && g.varianty[0].zamek.datumNabidky);
  /* klient ho u uloženého zámku nepřepíše */
  const a = kopie(g); a.varianty[0].zamek.datumNabidky = posun(dnes, -3); a.poznamkaDt = 1;
  const x = await uloz(a, cO, g.uloRazitko);
  test('uložený zámek: přepis data uložení nezastaví (mimo klíč, 200)', x.status === 200, x.status + ' ' + (x.chyba || ''));
  const g2 = await nacti(r.soubor, cO);
  test('uložený zámek: server datum drží', g2.varianty[0].zamek.datumNabidky === dnes, g2.varianty[0].zamek.datumNabidky);
  const b = kopie(g2); delete b.varianty[0].zamek.datumNabidky; b.poznamkaDt = 2;
  const y = await uloz(b, cO, g2.uloRazitko);
  const g3 = await nacti(r.soubor, cO);
  test('uložený zámek: ani smazání datum neodstraní', y.status === 200 && g3.varianty[0].zamek.datumNabidky === dnes, y.status + ' ' + g3.varianty[0].zamek.datumNabidky);
}
{
  const { r, g } = await ulozNovy('DT náhled včera', posun(dnes, -1));
  test('nový zámek z náhledu otevřeného včera: datum zůstane', r.status === 200 && g.varianty[0].zamek.datumNabidky === posun(dnes, -1), r.status + ' ' + (g && g.varianty[0].zamek.datumNabidky));
}
{
  const { r, g } = await ulozNovy('DT budoucnost', null, z => { z.datumNabidky = posun(dnes, 5); });
  test('nový zámek s datem po odeslání: server nahradí dnem odeslání', r.status === 200 && g.varianty[0].zamek.datumNabidky === dnes, r.status + ' ' + (g && g.varianty[0].zamek.datumNabidky));
}
{
  const { r, g } = await ulozNovy('DT staré', null, z => { z.datumNabidky = posun(dnes, -30); });
  test('nový zámek s datem o měsíc starším: server nahradí dnem odeslání', r.status === 200 && g.varianty[0].zamek.datumNabidky === dnes, r.status + ' ' + (g && g.varianty[0].zamek.datumNabidky));
}
{
  const { r, g } = await ulozNovy('DT nesmysl', null, z => { z.datumNabidky = 'zítra'; });
  test('nový zámek s nesmyslem: server nahradí dnem odeslání', r.status === 200 && g.varianty[0].zamek.datumNabidky === dnes, r.status + ' ' + (g && g.varianty[0].zamek.datumNabidky));
}
{
  const { r, g } = await ulozNovy('DT starší klient', null);
  test('nový zámek bez data (starší klient): uložen (200)', r.status === 200, r.status + ' ' + (r.chyba || ''));
  test('… datum chybí dál (dotisk = datum založení)', g && g.varianty[0].zamek.datumNabidky === undefined, g && g.varianty[0].zamek.datumNabidky);
  const a = kopie(g); a.varianty[0].zamek.datumNabidky = dnes; a.poznamkaDt = 1;
  const x = await uloz(a, cO, g.uloRazitko);
  const g2 = await nacti(r.soubor, cO);
  test('… a klient ho dodatečně nedopíše', x.status === 200 && g2.varianty[0].zamek.datumNabidky === undefined, x.status + ' ' + g2.varianty[0].zamek.datumNabidky);
}

/* revize N2: obnova ze souboru (zálohy) — datum v mezi vůči `kdy` zůstane, mimo mez se zahodí. */
{
  const { r, g } = await ulozNovy('DT obnova', dnes);
  const k = 'zakazky/z/' + r.soubor;
  test('obnova příprava: zámek s datem uložen', r.status === 200 && g.varianty[0].zamek.datumNabidky === dnes, r.status);
  const soubor = (await (await get(zaloha, 'http://x/api/zaloha', cA)).json()).zaloha;
  test('obnova příprava: záloha nese zakázku', !!(soubor && soubor.zakazky && soubor.zakazky[r.soubor]));
  const obnov = async sb => { pamet.delete(k);
    const o = await (await post(obnova, 'http://x/api/obnova', { zdroj: { soubor: sb }, rezim: 'doplnit', potvrzeni: 'OBNOVIT', casti: ['zakazky'] }, cA)).json();
    return { o, z: pamet.has(k) ? JSON.parse(pamet.get(k)) : null }; };
  let x = await obnov(soubor);
  test('obnova: platné datum nabídky zůstane', x.o.ok && x.z && x.z.varianty[0].zamek.datumNabidky === dnes, [x.o.ok, x.o.chyba, x.z && x.z.varianty[0].zamek.datumNabidky]);
  const spatny = kopie(soubor); spatny.zakazky[r.soubor].varianty[0].zamek.datumNabidky = posun(dnes, 5);
  x = await obnov(spatny);
  test('obnova: datum po odeslání se zahodí (dotisk = datum založení)', x.o.ok && x.z && x.z.varianty[0].zamek.zamceno && !('datumNabidky' in x.z.varianty[0].zamek), [x.o.ok, x.o.chyba, x.z && x.z.varianty[0].zamek.datumNabidky]);
  const stary = kopie(soubor); stary.zakazky[r.soubor].varianty[0].zamek.datumNabidky = posun(dnes, -30);
  x = await obnov(stary);
  test('obnova: datum o měsíc starší než odeslání se zahodí', x.o.ok && x.z && !('datumNabidky' in x.z.varianty[0].zamek), [x.o.ok, x.o.chyba, x.z && x.z.varianty[0].zamek.datumNabidky]);
}

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo' + (fail ? ': ' + selhalo.join('; ') : ''));
process.exit(fail ? 1 : 0);
