/* Společná příprava pokusů S1 (jen smyšlené účty, úložiště v paměti, žádná síť). */
process.env.TAJEMSTVI_RELACE = 'pokusne-tajemstvi-jen-lokalne-s1';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
export const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { if (globalThis.__ZPOZDI_CTI) await globalThis.__ZPOZDI_CTI(nazev, k); const h = pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; if (globalThis.__ZPOZDI_PO_CTENI) await globalThis.__ZPOZDI_PO_CTENI(nazev, k); return h; },
  async zapis(k, v) { if (globalThis.__ZPOZDI_ZAPIS) await globalThis.__ZPOZDI_ZAPIS(nazev, k, v); pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
globalThis.fetch = async (u) => { throw new Error('SÍŤ ZAKÁZÁNA: ' + u); };
const F = {};
for (const n of ['prihlaseni','odhlaseni','ja','uzivatele','program','firma','zakazky','vypocet','zaloha','zaloha_vynuceno','obnova','zdravi','zobrazeni','popisy','slovnik','controlling','controlling_export','zakaznici','schvalovani','sablony','analytika','pd_pole','pd_dealy','pd_deal','pd_stav'])
  F[n] = (await import('../../../netlify/functions/' + n + '.mjs')).default;
export { F };
export const S = await import('../../../netlify/lib/sdilene.mjs');
export const HESLO_ADMIN = 'Docasne.Heslo.123';
export const req = (fn, metoda, url, telo, cookie, hl = {}) => fn(new Request('http://x' + url, {
  method: metoda, headers: { ...(cookie ? { cookie } : {}), ...hl },
  ...(telo !== undefined ? { body: typeof telo === 'string' ? telo : JSON.stringify(telo) } : {}) }));
export async function prihlas(email, heslo, hl) {
  const r = await req(F.prihlaseni, 'POST', '/api/prihlaseni', { email, heslo }, null, hl);
  const t = await r.clone().json();
  if (!t.ok) return { ok: false, stav: r.status, t };
  return { ok: true, cookie: (r.headers.get('set-cookie') || '').split(';')[0], setCookie: r.headers.get('set-cookie'), t };
}
export async function priprav() {
  const a = await prihlas(S.ADMIN_EMAIL, HESLO_ADMIN);
  if (!a.ok) throw new Error('admin: ' + JSON.stringify(a));
  const U = { admin: { email: S.ADMIN_EMAIL, heslo: HESLO_ADMIN, cookie: a.cookie } };
  for (const [k, role] of [['obch', 'Obchodník'], ['obch2', 'Obchodník'], ['ved', 'Vedoucí'], ['admin2', 'Administrátor']]) {
    const email = 'pokus.' + k + '@example.com', heslo = 'PokusHeslo-' + k;
    const r = await (await req(F.uzivatele, 'POST', '/api/uzivatele', { akce: 'zaloz', email, jmeno: 'Pokus ' + k, role, heslo, hesloSpravce: HESLO_ADMIN }, a.cookie)).json();
    if (!r.ok) throw new Error(k + ': ' + JSON.stringify(r));
    U[k] = { email, heslo, cookie: (await prihlas(email, heslo)).cookie };
  }
  return U;
}

/* Data jako v test_prava.mjs: firma, platný ceník, zakázka s rozměry, zámek jako v aplikaci. */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const zk = require('../../../src/zakazka.js');
const ZC = require('../../../src/zkusebni_cenik.js'), fmod = require('../../../src/firma.js'), CEN = require('../../../src/cenik.js');
export const zam = require('../../../src/zamek.js');
export async function pripravData(cAdmin) {
  const FIRMA = fmod.firmaDefault(); delete FIRMA.ukazkove; FIRMA.nazev = 'Pokusná firma s.r.o.'; FIRMA.ico = '12345678';
  await req(F.firma, 'POST', '/api/firma', { udaje: FIRMA }, cAdmin);
  const c = ZC.zkusebniCenik(); CEN.cenikSet(c, 'C.profilasKgKc', (CEN.cenikGet(c, 'C.profilasKgKc') || 0) + 1);
  const r = await (await req(F.program, 'POST', '/api/program', { cenik: c, cenikProj: ZC.zkusebniCenikProj(), slevy: { minMarze: 0.1 } }, cAdmin)).json();
  if (!r.ok) throw new Error('program: ' + JSON.stringify(r));
}
export function zakazkaCislo(cislo) {
  const z = zk.novaZakazka();
  Object.assign(z.varianty[0].data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2 });
  z.cislo = cislo; z.nazevAkce = 'Pokus S1';
  const db = pamet.has('program/db') ? JSON.parse(pamet.get('program/db')) : null;
  if (db && db.platny) { z.varianty[0].data.cenik = JSON.parse(JSON.stringify(db.platny.cenik)); z.varianty[0].data.proj.cenik = JSON.parse(JSON.stringify(db.platny.cenikProj || {})); }
  return z;
}
export const zamkni = (z, v, info) => zam.zamkniVariantu(v, Object.assign({ cislo: zam.variantaCislo(z, v) }, info || {}));
