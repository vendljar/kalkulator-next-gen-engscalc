/* #548 — nález K10-S2: migrace ceníku můstků na SERVERU, bez sazeb v kódu.
 *
 * POST /api/program:
 *   – ceník ve starém tvaru (paušál) se převede na nový tvar z platného
 *     ceníku na serveru (db.platny.cenik); bez zdroje zůstane paušálem,
 *   – ceník v novém tvaru s nulovou cenou za metr / montáží se zveřejní jen
 *     s `mustkyPotvrzeno: true` (400 `kod: 'mustky'` jinak).
 * Paměťové úložiště, smyšlené sazby (src/zkusebni_cenik.js), smyšlené účty.
 * Před opravou: převod z platného ceníku vezme sazby z kódu, nulová cena
 * projde bez potvrzení (FAIL); po opravě projde.
 * Spuštění: node netlify/test_548_mustky.mjs */
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
const V = ZC.zkusebniMustky();
const stary = (zmena) => Object.assign(ZC.zkusebniCenik(), zmena || {});     // paušál (smyšlený), starý tvar
const novy = (zmena) => Object.assign(ZC.zkusebniCenik(), V, zmena || {});

/* 1) Bez zdroje: platný ceník (zatím žádný / starý) → nic se nevymýšlí. */
let r = await zverejni({ cenik: stary() });
test('starý tvar bez platného ceníku → zveřejní se (dosavadní chování)', r.st === 200, r);
test('… a zůstane paušálem: žádná referenční šířka, žádná sazba z kódu',
  !(+platny().cenik.mustekRefSirkaMm > 0) && platny().cenik.mustekKc === ZC.zkusebniCenik().mustekKc
  && !(+platny().cenik.mustekMontazHodKc > 0), platny().cenik);
r = await zverejni({ cenik: stary({ profilasKgKc: 101 }) });
test('starý tvar nad platným starým → pořád paušál', r.st === 200 && !(+platny().cenik.mustekRefSirkaMm > 0), r);

/* 2) Nový tvar s nulovou cenou → jen s potvrzením. */
r = await zverejni({ cenik: novy({ mustekKc: 0 }) });
test('nový tvar s nulovou cenou za metr bez potvrzení → 400 mustky', r.st === 400 && r.o.kod === 'mustky'
  && (r.o.chybi || []).includes('mustekKc') && /Nastavení → Ceník/.test(r.o.chyba || ''), r);
r = await zverejni({ cenik: novy({ mustekMontazHodKc: 0 }) });
test('nový tvar s nulovou sazbou montáže bez potvrzení → 400 mustky', r.st === 400 && r.o.kod === 'mustky'
  && (r.o.chybi || []).includes('mustekMontazHodKc'), r);
r = await zverejni({ cenik: novy({ mustekKc: 0 }), mustkyPotvrzeno: 'ano' });
test('potvrzení musí být true, ne řetězec', r.st === 400 && r.o.kod === 'mustky', r);
r = await zverejni({ cenik: novy({ mustekKc: 0 }), mustkyPotvrzeno: true });
test('… s potvrzením správce projde', r.st === 200, r);

/* 3) Úplný nový tvar → platný ceník je zdrojem pro převod starého. */
r = await zverejni({ cenik: novy() });
test('úplný nový tvar se zveřejní bez potvrzení', r.st === 200 && platny().cenik.mustekKc === V.mustekKc, r);
r = await zverejni({ cenik: stary({ profilasKgKc: 102, mustekMontazHodKc: 450 }) });
const c = platny().cenik;
test('starý tvar nad platným novým → server převede z platného ceníku', r.st === 200
  && c.mustekKc === V.mustekKc && c.mustekRefSirkaMm === V.mustekRefSirkaMm
  && c.mustekMontazZakladHod === V.mustekMontazZakladHod && c.mustekMontazBmHod === V.mustekMontazBmHod
  && c.mustekMontazMinHod === V.mustekMontazMinHod, c);
test('… sazbu montáže vyplněnou správcem nechá', c.mustekMontazHodKc === 450, c);
test('… a paušál se jako cena za metr nečte (#529 E)', c.mustekKc !== ZC.zkusebniCenik().mustekKc, c);
r = await zverejni({ cenik: [1, 2] });
test('pole místo ceníku server nesloží (žádná výjimka → 500)', r.st !== 500, r);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
