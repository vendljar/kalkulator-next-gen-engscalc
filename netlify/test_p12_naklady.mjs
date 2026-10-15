/* P12 / ROADMAPA #369 — GET /api/program BEZ HISTORIE VERZÍ PRO ROLI BEZ PRÁVA
 * NA NÁKLADY (v15.10.3, zadání podklady/PROMPT_p12_naklady.md, bod 2d).
 *
 * Do v15.10.3 posílal server každému přihlášenému platný ceník i až 60
 * starších verzí — celé nákladové ceníky. Platný ceník obchodník potřebuje
 * (výpočet běží v prohlížeči, test S12 v test_obchodnik.mjs), historii ne.
 * O právu rozhoduje klíč matice zobrazení `naklady.ceniky` (výchozí: všem
 * zapnuto — pokyn J. V. 15. 10. 2026, skrývá administrátor), administrátor
 * ho má vždy.
 *
 * Pojistka: nad v14.10.8 (před opravou) 8 prošlo / 3 selhalo (S6, S8, S9 —
 * historie šla i roli se skrytými náklady), po opravě 11 / 0.
 *
 * Spuštění: node netlify/test_p12_naklady.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const R = new URL('..', import.meta.url).pathname;
const { default: prihlaseni } = await import(R + 'netlify/functions/prihlaseni.mjs');
const { default: program } = await import(R + 'netlify/functions/program.mjs');
const { default: uzivatele } = await import(R + 'netlify/functions/uzivatele.mjs');
const { default: zobrazeni } = await import(R + 'netlify/functions/zobrazeni.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const ZC = require(R + 'src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (id, n, cond, info) => {
  if (cond) { ok++; console.log('OK   ' + id + ' ' + n); }
  else { fail++; console.log('FAIL ' + id + ' ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 300)); }
};
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const db = async (c) => (await (await get(program, 'http://x/api/program', c)).json()).db;

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
for (const [e, j, r] of [['obch1@priklad.cz', 'Obch Jedna', 'Obchodník'], ['ved@priklad.cz', 'Ved Test', 'Vedoucí']]) {
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: e, jmeno: j, role: r, heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
}
const cO = await prihlas('obch1@priklad.cz', 'Heslo12345x'), cV = await prihlas('ved@priklad.cz', 'Heslo12345x');

/* Bez historie (jediná verze) se nic neořezává ani nepřidává. */
const c1 = ZC.zkusebniCenik(), p1 = ZC.zkusebniCenikProj();
const r1 = await (await post(program, 'http://x/api/program', { cenik: c1, cenikProj: p1, poznamka: 'p12 v1' }, cA)).json();
if (!r1.ok) throw new Error('program v1 ' + JSON.stringify(r1));
const o0 = await db(cO);
test('P12-S1', 'jediná verze: obchodník dostane platný ceník, bez značky vynechání',
  o0 && o0.platny && o0.platny.verze === 1 && o0.historieVynechana === undefined, o0 && { verze: o0.platny.verze, vyn: o0.historieVynechana });

/* Druhá verze → první jde do historie. */
const c2 = ZC.zkusebniCenik(); c2.marze = (+c2.marze || 0) + 0.01;
const r2 = await (await post(program, 'http://x/api/program', { cenik: c2, cenikProj: p1, poznamka: 'p12 v2' }, cA)).json();
if (!r2.ok) throw new Error('program v2 ' + JSON.stringify(r2));

const a = await db(cA), o0b = await db(cO), v = await db(cV);
test('P12-S2', 'obchodník (výchozí matice) historii dostane — náklady zatím vidí (pokyn J. V. 15. 10.)',
  o0b && o0b.historie.length === 1 && o0b.historieVynechana === undefined, o0b && o0b.historie.length);
test('P12-S4', 'administrátor historii dostane', a && a.historie.length === 1 && a.historieVynechana === undefined, a && a.historie.length);
test('P12-S5', 'vedoucí (výchozí matice) historii dostane — beze změny proti dnešku',
  v && v.historie.length === 1 && v.historieVynechana === undefined, v && v.historie.length);

/* Administrátor obchodníkům náklady skryje (Nastavení → Zobrazení). */
const mz = await (await post(zobrazeni, 'http://x/api/zobrazeni',
  { matice: { 'naklady.ceniky': { 'Obchodník': false, 'Vedoucí': true } } }, cA)).json();
test('P12-S7', 'administrátor uloží matici s klíčem naklady.ceniky', mz.ok, mz);
const o = await db(cO);
test('P12-S8', 'obchodník se skrytými náklady nedostane historii verzí ceníku',
  o && Array.isArray(o.historie) && o.historie.length === 0 && o.historieVynechana === 1, o && { h: o.historie.length, vyn: o.historieVynechana });
test('P12-S3', 'obchodník dál dostane celý platný ceník (výpočet v prohlížeči se nemění)',
  o && JSON.stringify(o.platny) === JSON.stringify(a.platny), o && o.platny && o.platny.verze);
let norm = null; try { norm = globalThis.programNormalizuj(o); } catch (e) { norm = String(e); }
test('P12-S6', 'ořezaná databáze projde programNormalizuj (prohlížeč ji přijme)',
  norm && typeof norm === 'object' && norm.platny.verze === 2 && norm.historie.length === 0, norm);

/* A naopak: vedoucímu odebrat, obchodníkovi vrátit. */
await post(zobrazeni, 'http://x/api/zobrazeni', { matice: { 'naklady.ceniky': { 'Obchodník': true, 'Vedoucí': false } } }, cA);
const o2 = await db(cO), v2 = await db(cV);
test('P12-S9', 'vedoucí s odebraným právem historii nedostane, obchodník s vráceným ano',
  v2 && v2.historie.length === 0 && v2.historieVynechana === 1 && o2 && o2.historie.length === 1, { v: v2 && v2.historie.length, o: o2 && o2.historie.length });

/* Uložená data na serveru se nemění — ořezává se jen odpověď. */
const a2 = await db(cA);
test('P12-S10', 'historie v úložišti zůstává celá (ořez je jen v odpovědi)', a2 && a2.historie.length === 1, a2 && a2.historie.length);

/* Bez přihlášení dál 401. */
const nep = await get(program, 'http://x/api/program');
test('P12-S11', 'nepřihlášený dál dostane 401', nep.status === 401, nep.status);

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
