/* K40-N2, K40-N5 — server: věrohodnost ceníku můstků při zveřejnění
 * (dávka K40a, roadmapa #579, 11. 11. 2026).
 *
 * POST /api/program:
 *   – referenční šířka můstku mimo 500–5 000 mm (např. 2 = metry) → 400
 *     `kod: 'mustky'`, s `mustkyPotvrzeno: true` projde (N2, rozhodnutí 8a),
 *   – zahraniční řada (tuzemský ceník + odchylky k zveřejnění sloučené
 *     s platnými) s nulovou montáží můstků → 400, s potvrzením projde (N5).
 *   – dosavadní ceník (šířka 2 000 mm, bez odchylek) projde bez dotazu.
 * Paměťové úložiště, smyšlené sazby (src/zkusebni_cenik.js), smyšlené účty.
 * POJISTKA: nad c664c9e 4 FAIL (šířka 2 mm i zahraniční nula projdou bez
 * potvrzení); mutace „[K40a] N2/N5" v netlify/mutace.mjs.
 * Spuštění: node netlify/test_k40_mustky_program.mjs */
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

const prihlaseni = (await import('./functions/prihlaseni.mjs')).default;
const program = (await import('./functions/program.mjs')).default;
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const ZC = require('../src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };
const cA = ((await prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST',
  body: JSON.stringify({ email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' }) }))).headers.get('set-cookie') || '').split(';')[0];
test('příprava: správce přihlášen', /^relace=/.test(cA));
const zverejni = async (telo) => {
  const r = await program(new Request('http://x/api/program', { method: 'POST', headers: { cookie: cA }, body: JSON.stringify(telo) }));
  let o = {}; try { o = await r.json(); } catch (e) { /* bez těla */ }
  return { st: r.status, o };
};
const platny = () => (JSON.parse(pamet.get('program/db') || 'null') || {}).platny || {};
let n = 0;
/* každé zveřejnění jinou cenou profilu, ať se ceník od platného liší */
const novy = (zmena) => Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky(), { profilasKgKc: 100 + (++n) }, zmena || {});

let r = await zverejni({ cenik: novy() });
test('dosavadní ceník (šířka 2 000 mm, bez odchylek) projde bez potvrzení', r.st === 200, r);

/* N2 */
r = await zverejni({ cenik: novy({ mustekRefSirkaMm: 2 }) });
test('N2: šířka 2 mm bez potvrzení → 400 mustky', r.st === 400 && r.o.kod === 'mustky'
  && (r.o.chybi || []).includes('mustekRefSirkaMm') && /mimo věrohodný rozsah/.test(r.o.chyba || ''), r);
r = await zverejni({ cenik: novy({ mustekRefSirkaMm: 9000 }) });
test('N2: šířka 9 000 mm bez potvrzení → 400 mustky', r.st === 400 && r.o.kod === 'mustky', r);
r = await zverejni({ cenik: novy({ mustekRefSirkaMm: 2 }), mustkyPotvrzeno: true });
test('N2: šířka 2 mm s potvrzením → 200 a hodnota beze změny', r.st === 200 && platny().cenik.mustekRefSirkaMm === 2, r);
r = await zverejni({ cenik: novy({ mustekRefSirkaMm: 500 }) });
test('N2: šířka 500 mm (hrana rozsahu) projde', r.st === 200, r);

/* N5 */
r = await zverejni({ cenik: novy(), zahranicni: { ceny: { 'C.montazHodKc': 0 }, jenZahr: {} } });
test('N5: zahraniční montáž 0 bez montáže můstků, bez potvrzení → 400 mustky', r.st === 400 && r.o.kod === 'mustky'
  && (r.o.chybi || []).includes('zahr:mustekMontazHodKc') && /Zahraniční řada/.test(r.o.chyba || ''), r);
r = await zverejni({ cenik: novy(), zahranicni: { ceny: { 'C.montazHodKc': 0 }, jenZahr: {} }, mustkyPotvrzeno: true });
test('N5: … s potvrzením → 200', r.st === 200, r);
/* platné odchylky teď nesou montáž 0 — nové zveřejnění BEZ odchylek se
 * skládá se sloučením s platnými (jako cenikZverejneniKontrola), takže nula
 * z platných se ozve znovu */
r = await zverejni({ cenik: novy(), zahranicni: { ceny: {}, jenZahr: {} } });
test('N5: nula montáže v PLATNÝCH odchylkách se ozve i u zveřejnění bez nových odchylek', r.st === 400 && r.o.kod === 'mustky', r);
r = await zverejni({ cenik: novy(), zahranicni: { ceny: { 'C.montazHodKc': 0, 'C.mustekMontazHodKc': 650 }, jenZahr: {} } });
test('N5: zahraniční montáž 0, ale vlastní montáž můstků → 200 bez dotazu', r.st === 200, r);
/* platné odchylky už nesou nulu montáže a montáž můstků 650; nové odchylky
 * montáž můstků výslovně vynulují → sloučení s platnými se hlídá */
r = await zverejni({ cenik: novy(), zahranicni: { ceny: { 'C.mustekMontazHodKc': 0 }, jenZahr: {} } });
test('N5: výslovná nula montáže můstků v zahraničí → 400', r.st === 400 && r.o.kod === 'mustky', r);
r = await zverejni({ cenik: novy({ mustekMontazHodKc: 0 }), mustkyPotvrzeno: true });
test('tuzemská nula s potvrzením → 200 (zahraniční kontrola ji neopakuje jako blok)', r.st === 200, r);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
