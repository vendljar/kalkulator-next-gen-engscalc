/* Společný základ PoC harnessů čočky AZ (audit 20. 11. 2026).
 * Skutečné funkce netlify/functions nad PAMĚŤOVÝM úložištěm a zkušebním
 * ceníkem — nic se nezapisuje do Netlify, žádná síť. Vzor: netlify/test_obchodnik.mjs.
 * Jen smyšlené kontakty …@priklad.cz. Sám o sobě nic nezkouší (import z poc_AZ_*.mjs). */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
export const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const R = new URL('../..', import.meta.url).pathname;
export const { default: prihlaseni } = await import(R + 'netlify/functions/prihlaseni.mjs');
export const { default: program } = await import(R + 'netlify/functions/program.mjs');
export const { default: zakazky } = await import(R + 'netlify/functions/zakazky.mjs');
export const { default: uzivatele } = await import(R + 'netlify/functions/uzivatele.mjs');
export const { default: schvalovani } = await import(R + 'netlify/functions/schvalovani.mjs');
export const { default: vypocetFn } = await import(R + 'netlify/functions/vypocet.mjs');
export const { default: funkceFn } = await import(R + 'netlify/functions/funkce.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
export const { JEKLY } = await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
export const zk = require(R + 'src/zakazka.js');
export const zam = require(R + 'src/zamek.js');
export const ZC = require(R + 'src/zkusebni_cenik.js');
export const SCHV = require(R + 'src/schvalovani.js');
export const SL = require(R + 'src/sleva.js');
export const G = globalThis;

export const kopie = x => JSON.parse(JSON.stringify(x));
export const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: typeof telo === 'string' ? telo : JSON.stringify(telo) }));
export const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
export const del = (fn, url, cookie) => fn(new Request(url, { method: 'DELETE', headers: cookie ? { cookie } : {} }));
export async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
/* Uložení přesně jako prohlížeč; `navic` = další klíče těla (prepsat…). razitko undefined = starší klient bez pole. */
export const uloz = async (zak, c, razitko, navic) => {
  const r = await post(zakazky, 'http://x/api/zakazky', Object.assign({ zakazka: zak, ocekavaneRazitko: razitko }, navic || {}), c);
  let t; try { t = await r.json(); } catch (e) { t = { neJson: true }; }
  return { status: r.status, ...t };
};
export const nacti = async (soubor, c) => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), c)).json()).zakazka;

export const NASTSL = { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.03, 'Vedoucí': 0.12, 'Administrátor': 1 } };
export const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
{
  const rp = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(), slevy: NASTSL, poznamka: 'audit AZ' }, cA)).json();
  if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
  for (const [e, j, r] of [['obch1@priklad.cz', 'Obch Jedna', 'Obchodník'], ['obch2@priklad.cz', 'Obch Dva', 'Obchodník'], ['ved@priklad.cz', 'Ved Test', 'Vedoucí']]) {
    const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: e, jmeno: j, role: r, heslo: 'Heslo12345x' }, cA)).json();
    if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
  }
}
export const cO = await prihlas('obch1@priklad.cz', 'Heslo12345x');
export const cO2 = await prihlas('obch2@priklad.cz', 'Heslo12345x');
export const cV = await prihlas('ved@priklad.cz', 'Heslo12345x');

let n = 9700;
export function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++) + ' - TEST'; z.nazevAkce = 'TEST ' + nazev; z.objednatel = 'TEST – TESTOVACÍ ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.cenik = ZC.zkusebniCenik(); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
/* Zamčení přesně jako prohlížeč po tisku (zamekPoTisku): zmrazený výsledek + snímek. */
export const zamkni = (z, v, typ) => {
  const vysledek = zam.zamekVysledekSpocti(v, JEKLY, 'audit');
  zam.zamkniVariantu(v, { typ: typ || 'nabidka', kdy: new Date().toISOString(), kdo: 'Obch Jedna', cislo: zam.variantaCislo(z, v), vysledek, snimek: zam.zamekSnimekSpocti(v) });
};
export const cenaOck = (v) => G.vypocetOckDat(v.data, JEKLY).souhrn.zakladCena;
export function verdikt(zranitelne, text) {
  console.log('\n' + (zranitelne ? 'ZRANITELNÉ' : 'ODOLNÉ') + ' — ' + text);
}
