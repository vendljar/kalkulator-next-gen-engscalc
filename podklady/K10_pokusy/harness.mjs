/* K10 #541 — společná příprava pokusů auditu v27.10.6 (1. 11. 2026).
 * Jen smyšlené účty (example.com / priklad.cz), úložiště v paměti (i binární
 * části otisku), síť zakázaná. Vzor: podklady/S1_pokusy/server/harness.mjs.
 * Spouští se z kořene repa: node podklady/K10_pokusy/<pokus>.mjs */
process.env.TAJEMSTVI_RELACE = 'pokusne-tajemstvi-jen-lokalne-k10';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
export const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { const v = pamet.get(nazev + '/' + k); if (v == null) return null; if (Buffer.isBuffer(v)) throw new Error('JSON čtení binárního ' + k); return JSON.parse(v); },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async ctiBin(k) { const v = pamet.get(nazev + '/' + k); return v == null ? null : (Buffer.isBuffer(v) ? v : Buffer.from(v)); },
  async zapisBin(k, b) { pamet.set(nazev + '/' + k, Buffer.from(b)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
export const sitPokusy = [];
globalThis.fetch = async (u) => { sitPokusy.push(String(u)); throw new Error('SÍŤ ZAKÁZÁNA: ' + u); };
const F = {};
for (const n of ['prihlaseni','odhlaseni','ja','uzivatele','program','firma','zakazky','vypocet','zaloha','zaloha_vynuceno','zaloha_nocni','obnova','zdravi','zobrazeni','popisy','slovnik','controlling','controlling_export','zakaznici','schvalovani','sablony','analytika','pd_pole','pd_dealy','pd_deal','pd_stav','pd_nanecisto'])
  F[n] = (await import('../../netlify/functions/' + n + '.mjs')).default;
export { F };
export const S = await import('../../netlify/lib/sdilene.mjs');
export const HESLO_ADMIN = 'Docasne.Heslo.123';
export const req = (fn, metoda, url, telo, cookie, hl = {}) => fn(new Request('http://x' + url, {
  method: metoda, headers: { ...(cookie ? { cookie } : {}), ...hl },
  ...(telo !== undefined ? { body: typeof telo === 'string' ? telo : JSON.stringify(telo) } : {}) }));
export const jreq = async (...a) => { const r = await req(...a); let t = null; try { t = await r.clone().json(); } catch (e) { t = { text: await r.text() }; } return { status: r.status, headers: r.headers, ...t }; };
export async function prihlas(email, heslo) {
  const r = await req(F.prihlaseni, 'POST', '/api/prihlaseni', { email, heslo });
  const t = await r.clone().json();
  if (!t.ok) return { ok: false, stav: r.status, t };
  return { ok: true, cookie: (r.headers.get('set-cookie') || '').split(';')[0] };
}
export async function priprav() {
  const a = await prihlas(S.ADMIN_EMAIL, HESLO_ADMIN);
  if (!a.ok) throw new Error('admin: ' + JSON.stringify(a));
  const U = { admin: { email: S.ADMIN_EMAIL, heslo: HESLO_ADMIN, cookie: a.cookie } };
  for (const [k, role] of [['obch', 'Obchodník'], ['obch2', 'Obchodník'], ['ved', 'Vedoucí'], ['admin2', 'Administrátor']]) {
    const email = 'k10.' + k + '@example.com', heslo = 'PokusHeslo-' + k;
    const r = await (await req(F.uzivatele, 'POST', '/api/uzivatele', { akce: 'zaloz', email, jmeno: 'Pokus ' + k, role, heslo, hesloSpravce: HESLO_ADMIN }, a.cookie)).json();
    if (!r.ok) throw new Error(k + ': ' + JSON.stringify(r));
    U[k] = { email, heslo, cookie: (await prihlas(email, heslo)).cookie };
  }
  return U;
}
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export { require };
export const zk = require('../../src/zakazka.js');
const ZC = require('../../src/zkusebni_cenik.js'), fmod = require('../../src/firma.js'), CEN = require('../../src/cenik.js');
export const zam = require('../../src/zamek.js');
export const JEKLY = require('../../src/jekly.json');
export async function pripravData(cAdmin) {
  const FIRMA = fmod.firmaDefault(); delete FIRMA.ukazkove; FIRMA.nazev = 'Pokusná firma s.r.o.'; FIRMA.ico = '12345678';
  await req(F.firma, 'POST', '/api/firma', { udaje: FIRMA }, cAdmin);
  const c = ZC.zkusebniCenik(); CEN.cenikSet(c, 'C.profilasKgKc', (CEN.cenikGet(c, 'C.profilasKgKc') || 0) + 1);
  const r = await (await req(F.program, 'POST', '/api/program', { cenik: c, cenikProj: ZC.zkusebniCenikProj(), slevy: { minMarze: 0.1 } }, cAdmin)).json();
  if (!r.ok) throw new Error('program: ' + JSON.stringify(r));
}
export function zakazkaCislo(cislo) {
  const z = zk.novaZakazka();
  Object.assign(z.varianty[0].data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  z.cislo = cislo; z.nazevAkce = 'Pokus K10';
  const db = pamet.has('program/db') ? JSON.parse(pamet.get('program/db')) : null;
  if (db && db.platny) { z.varianty[0].data.cenik = JSON.parse(JSON.stringify(db.platny.cenik)); z.varianty[0].data.proj.cenik = JSON.parse(JSON.stringify(db.platny.cenikProj || {})); }
  return z;
}
/* Zamčení jako prohlížeč po tisku (zamekPoTisku) — viz test_prava.mjs odesliB59. */
export function odesli(z, typ) {
  const v = z.varianty[0];
  const vysledek = zam.zamekVysledekSpocti(v, JEKLY, 'v-k10');
  zam.zamkniVariantu(v, { typ: typ || 'nabidka', kdy: new Date().toISOString(), kdo: 'Pokus K10', cislo: zam.variantaCislo(z, v), vysledek });
  return z;
}
export const uloz = (z, cookie, extra) => jreq(F.zakazky, 'POST', '/api/zakazky', Object.assign({ zakazka: z }, extra || {}), cookie);
export const nacti = async (soubor, cookie) => (await jreq(F.zakazky, 'GET', '/api/zakazky?soubor=' + encodeURIComponent(soubor), undefined, cookie)).zakazka;
/* Načti → importZakazka → změň → ulož s razítkem (jako aplikace). */
export async function zmen(soubor, cookie, zmena, cAdmin) {
  const g = await nacti(soubor, cAdmin || cookie);
  const a = zk.importZakazka(JSON.parse(JSON.stringify(g)));
  zmena(a);
  return uloz(a, cookie, { ocekavaneRazitko: g.uloRazitko });
}

let ok = 0, fail = 0;
export const vysledky = [];
export function nalez(id, popis, podminka, info) {
  vysledky.push({ id, popis, reprodukovano: !!podminka, info });
  console.log((podminka ? 'REPRODUKOVÁNO ' : 'nereprodukováno ') + id + ' — ' + popis + (info !== undefined ? '\n    ' + (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 400)) : ''));
}
export function over(popis, podminka, info) {
  if (podminka) ok++; else fail++;
  console.log((podminka ? 'OK   ' : 'FAIL ') + popis + ((!podminka || process.env.K10_PODROBNE) && info !== undefined ? '  ' + JSON.stringify(info).slice(0, 400) : ''));
}
export function konec() {
  if (sitPokusy.length) { fail++; console.log('FAIL pokus sáhl na síť: ' + sitPokusy.join(', ')); }
  console.log('\nkontrol: ' + ok + ' OK, ' + fail + ' FAIL; nálezů reprodukováno: ' + vysledky.filter(v => v.reprodukovano).length + '/' + vysledky.length);
  process.exitCode = fail ? 1 : 0;
}
export const ticho = async (fn) => { const l = console.log, w = console.warn, e = console.error;
  console.log = console.warn = console.error = () => {}; try { return await fn(); } finally { console.log = l; console.warn = w; console.error = e; } };
