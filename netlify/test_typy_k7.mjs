/* TVAR RAZÍTKA A ŘADY CENÍKU A TEXTŮ HLAVIČKY (K7-S4, K7-S11, audit
 * 23. 10. 2026, #507).
 *
 * Objekt `{"toString":1}` v `data.cenikRazitko.verze` (src/vyjimky.js,
 * `+d.cenikRazitko.verze`) nebo v `data.cenikRada` (src/cenik_rady.js,
 * `String(rada)`) shodil POST /api/zakazky na HTTP 500. Pole `["zahr"]`
 * prošlo jako „zahr" (typová záměna). Název akce a adresa jako objekt se
 * uložily (200). Server má neplatný tvar odmítnout 400 — jako K5-S1/K6-S1.
 *
 * Paměťové úložiště, zkušební ceník. Spuštění: node netlify/test_typy_k7.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: program } = await import('./functions/program.mjs');
const { default: zakazky } = await import('./functions/zakazky.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const ZC = require('../src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h }))
  .headers.get('set-cookie') || '').split(';')[0];

const cA = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.03, 'Vedoucí': 0.12, 'Administrátor': 1 } } }, cA);
await get(zakazky, 'http://x/api/zakazky', cA);   // načte jádro
const G = globalThis;

let n = 0;
function nova(uprav) {
  const z = G.novaZakazka();
  z.cislo = '2026 - OPR - CN - ' + (9100 + (n++)); z.nazevAkce = 'Akce typy';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.cenik = ZC.zkusebniCenik(); v.data.proj.cenik = ZC.zkusebniCenikProj();
  uprav(z, v.data);
  return z;
}
/* Tělo se posílá jako text: `{"toString":1}` musí dorazit doslova. */
/* Výjimka obsluhy = na Netlify HTTP 500. */
const uloz = async (z) => { let r;
  try { r = await post(zakazky, 'http://x/api/zakazky', { zakazka: z, ocekavaneRazitko: '' }, cA); }
  catch (e) { return { st: 500, o: { chyba: e.message } }; }
  let o = {}; try { o = await r.json(); } catch (e) { /* 500 bez těla */ }
  return { st: r.status, o }; };
const PODVRH = { toString: 1 };

const pripady = [
  ['K7-S4: cenikRazitko.verze jako objekt → 400', (z, d) => { d.cenikRazitko = { verze: PODVRH, otisk: 'x' }; }],
  ['K7-S4: cenikRazitko.otisk jako objekt → 400', (z, d) => { d.cenikRazitko = { verze: 3, otisk: PODVRH }; }],
  ['K7-S4: cenikRazitko jako pole → 400', (z, d) => { d.cenikRazitko = [3]; }],
  ['K7-S4: cenikRada jako objekt → 400', (z, d) => { d.cenikRada = PODVRH; }],
  ['K7-S4: cenikRada jako pole ["zahr"] → 400', (z, d) => { d.cenikRada = ['zahr']; }],
  ['K7-S11: název akce jako objekt → 400', (z) => { z.nazevAkce = PODVRH; }],
  ['K7-S11: adresa stavby jako objekt → 400', (z) => { z.adresa = PODVRH; }],
  ['K7-S11: zákazník jako pole → 400', (z) => { z.objednatel = ['Firma']; }],
];
for (const [nazev, uprav] of pripady) {
  const r = await uloz(nova(uprav));
  test(nazev, r.st === 400 && /typ|tvar|Zakázka nese/.test(r.o.chyba || ''), [r.st, r.o.chyba]);
}
/* Platné tvary dál projdou. */
const platne = [
  ['razítko s číselnou verzí a otiskem projde', (z, d) => { d.cenikRazitko = { datum: '2026-10-23', build: 'v23.10.1', verze: 3, platnoOd: '', otisk: 'abc' }; }],
  ['razítko bez verze (null) projde', (z, d) => { d.cenikRazitko = { verze: null, otisk: 'abc' }; }],
  ['řada ceníku „cr" projde', (z, d) => { d.cenikRada = 'cr'; }],
  ['IČO jako číslo (starší data) projde', (z) => { z.ico = 12345678; }],
];
for (const [nazev, uprav] of platne) {
  const r = await uloz(nova(uprav));
  test(nazev, r.st === 200, [r.st, r.o.chyba]);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
