/* D8 — LHŮTY PROJ NA SERVERU (rozhodnutí J. V. 19. 11. 2026).
 *
 * Ověřuje serverovou stranu:
 *   – /api/firma: lhůty PROJ se zveřejní s firmou (čistá kopie), vadné
 *     odmítne (400 s důvodem), obchodník je nezveřejní (403);
 *   – /api/zakazky: Prodáno zapíše snímek lhůt do odeslané varianty a uložení
 *     projde; ručně zadaný termín prodané varianty projde; snímek lhůt ani
 *     jiné pole krycího listu prodané varianty se už nezmění (odmítnutí).
 * Model a dopočet hlídá src/test_d8_lhuty.js.
 * Pojistka: nad integrací 042fcbc sada padá (lhuty_proj.js neexistuje,
 * firma lhůty nezveřejní, ruční termín prodané varianty server odmítne).
 *
 * Paměťové úložiště, zkušební ceník, smyšlené údaje.
 * Spuštění: node netlify/test_d8_lhuty.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR', 'PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PROSTREDI',
  'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL']) delete process.env[k];
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
globalThis.fetch = async (url) => { throw new Error('síť je v testu zakázaná: ' + url); };
const R = new URL('..', import.meta.url).pathname;
const { existsSync } = await import('node:fs');
let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
test('src/lhuty_proj.js existuje', existsSync(R + 'src/lhuty_proj.js'));
if (fail) { console.log(`\n${ok} OK, ${fail} FAIL`); process.exit(1); }

const { default: prihlaseni } = await import(R + 'netlify/functions/prihlaseni.mjs');
const { default: program } = await import(R + 'netlify/functions/program.mjs');
const { default: zakazky } = await import(R + 'netlify/functions/zakazky.mjs');
const { default: uzivatele } = await import(R + 'netlify/functions/uzivatele.mjs');
const { default: firmaFn } = await import(R + 'netlify/functions/firma.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
const { JEKLY } = await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
for (const f of ['plan_plateb.js', 'nabidka_proj.js']) Object.assign(globalThis, require(R + 'src/' + f));
const zk = require(R + 'src/zakazka.js');
const zam = require(R + 'src/zamek.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const OBJ = require(R + 'src/objednane.js');
const LH = require(R + 'src/lhuty_proj.js');
const FM = require(R + 'src/firma.js');
const KP = require(R + 'src/kryci_proj.js');

const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const kopie = x => JSON.parse(JSON.stringify(x));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const uloz = async (zak, c, razitko) => { const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: razitko }, c); return { status: r.status, ...(await r.json()) }; };
const nacti = async (soubor, c) => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), c)).json()).zakazka;

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const rp = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15, 'Administrátor': 1 } }, poznamka: 'd8' }, cA)).json();
if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
{
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obch.d8@priklad.cz', jmeno: 'Test D8', role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
}
const cO = await prihlas('obch.d8@priklad.cz', 'Heslo12345x');
const platny = () => JSON.parse(pamet.get('program/db')).platny;

/* ---------- /api/firma ---------- */
const JINE = kopie(LH.lhutyProjVychozi());
JINE.radky.studie = { od: 8, do: 9 }; JINE.platnostOd = '2026-12-01';
const firma = Object.assign(FM.firmaDefault(), { nazev: 'Firma D8 s.r.o.', ico: '12345678', sidloUlice: 'Zkušební 1', sidloPsc: '11000',
  sidloMesto: 'Praha', telefon: '+420 000 000 000', lhutyProj: JINE });
delete firma.ukazkove;
{
  const r = await post(firmaFn, 'http://x/api/firma', { udaje: firma }, cA);
  test('firma s lhůtami PROJ se zveřejní (200)', r.status === 200, await r.clone().json());
  const g = await (await get(firmaFn, 'http://x/api/firma', cO)).json();
  test('…online kopie nese čisté lhůty', JSON.stringify(g.firma.udaje.lhutyProj) === JSON.stringify(LH.lhutyProjCisty(JINE)), g.firma.udaje.lhutyProj);
  const spatne = Object.assign(kopie(firma), { lhutyProj: { radky: { studie: { od: 13, do: 12 } } } });
  const r2 = await post(firmaFn, 'http://x/api/firma', { udaje: spatne }, cA);
  const t2 = await r2.json();
  test('vadné lhůty server odmítne (400 s důvodem)', r2.status === 400 && /Lhůty PROJ/.test(t2.chyba || ''), t2);
  const navic = Object.assign(kopie(firma), { lhutyProj: Object.assign(kopie(JINE), { skript: '<x>' }) });
  test('lhůty s cizím klíčem server odmítne', (await post(firmaFn, 'http://x/api/firma', { udaje: navic }, cA)).status === 400);
  test('obchodník lhůty nezveřejní (403)', (await post(firmaFn, 'http://x/api/firma', { udaje: firma }, cO)).status === 403);
}

/* ---------- /api/zakazky: Prodáno se snímkem lhůt ---------- */
globalThis.NAST = { firma: kopie(firma) };
const z = zk.novaZakazka(); z.cislo = '2026 - OPR - OVP - 8081'; z.nazevAkce = 'TEST D8'; z.adresa = 'Zkušební 1, Praha';
const v = z.varianty[0];
v.data.cenik = kopie(platny().cenik); v.data.proj.cenik = kopie(platny().cenikProj);
v.data.kryciProj = { hodnoty: {} };
KP.kryciProjZmrazPodminky(z, v);
zam.zamkniVariantu(v, { typ: 'nabidkaProjTisk', kdy: new Date().toISOString(), kdo: 'Test D8', cislo: zam.variantaCislo(z, v),
  vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-d8'), snimek: zam.zamekSnimekSpocti(v) });
const r1 = await uloz(z, cO);
if (r1.status !== 200) throw new Error('příprava ' + r1.status + ' ' + r1.chyba);
let g = await nacti(r1.soubor, cO);
const a = zk.importZakazka(kopie(g));
test('prodNastav projde', OBJ.prodNastav(a, a.varianty[0], OBJ.objDnes(), { kdo: 'x' }) === '');
test('…a zapíše snímek lhůt z Firmy', JSON.stringify((a.varianty[0].data.kryciProj.lhutyProj || {}).radky) === JSON.stringify(JINE.radky));
test('…prodej je jediná změna z pohledu zámku čtení', OBJ.prodJedinaZmena(a, g) === true);
const r2 = await uloz(a, cO, g.uloRazitko);
test('uložení prodeje se snímkem lhůt projde (200)', r2.status === 200, r2);
g = await nacti(r1.soubor, cO);
test('…po načtení je snímek lhůt ve variantě', JSON.stringify(g.varianty[0].data.kryciProj.lhutyProj.radky) === JSON.stringify(JINE.radky));
{
  const b = zk.importZakazka(kopie(g));
  b.varianty[0].data.kryciProj.hodnoty.terminDps = '2028-05-05';
  const r = await uloz(b, cO, g.uloRazitko);
  test('ruční termín prodané varianty projde (200)', r.status === 200, r);
  g = await nacti(r1.soubor, cO);
  test('…a zůstane uložený', g.varianty[0].data.kryciProj.hodnoty.terminDps === '2028-05-05');
}
{
  const b = zk.importZakazka(kopie(g));
  b.varianty[0].data.kryciProj.lhutyProj.radky.dps = { do: 99 };
  const r = await uloz(b, cO, g.uloRazitko);
  test('snímek lhůt prodané varianty se nezmění (odmítnuto)', r.status >= 400, r);
}
{
  const b = zk.importZakazka(kopie(g));
  b.varianty[0].data.kryciProj.hodnoty.terminJine = 'jiné pole';
  const r = await uloz(b, cO, g.uloRazitko);
  test('jiné pole krycího listu prodané varianty se nezmění (odmítnuto)', r.status >= 400, r);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
