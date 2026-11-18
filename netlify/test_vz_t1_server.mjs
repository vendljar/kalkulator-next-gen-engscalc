/* VZ T1 — ŘÍDÍCÍ VARIANTA A ŘÍDÍCÍ ZÁKAZNÍK NA SERVERU (rozhodnutí J. V. 18. 11. 2026).
 * Celou cestou POST /api/zakazky (paměťové úložiště, ZAP):
 *  1) autor: vlastní varianta C → řídící C (200), invariant v uložené verzi;
 *     sdílená varianta a B (200); jiný obchodník: změna řídícího i JEN řídící
 *     varianty 403, administrátor 200; zakázka z webhooku jen administrátor;
 *  2) invariant 409: řídící přesunutý na vlastní variantu jiného zákazníka,
 *     ukazatel řídícího ≠ řídící varianta, sdílená bez řídícího, nová varianta
 *     bez zákazníka s výměnou — úložiště beze změny;
 *  3) E4 beze změny: ruční hodnota KL pole zákazníka dostane při výměně přes
 *     T1 vlastníka z1 (vzKlZafixuj), písmena se nemění;
 *  4) jeden zákazník: změna řídící varianty jiným obchodníkem jako dřív (200);
 *     VYP + víc zákazníků: hlavička jako dřív, výměna řídícího odmítnuta (VZ_VYPNUTO).
 * Pojistka: na 2856345 (před T1) padá 1 (403 u změny jen řídící varianty
 * chybí), 2 (server srovnával, neodmítal) — viz zpráva commitu.
 * Spuštění: node netlify/test_vz_t1_server.mjs */
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
globalThis.fetch = async (url) => { throw new Error('síť je v testu zakázaná: ' + url); };
const R = new URL('..', import.meta.url).pathname;
const { default: prihlaseni } = await import(R + 'netlify/functions/prihlaseni.mjs');
const { default: program } = await import(R + 'netlify/functions/program.mjs');
const { default: zakazky } = await import(R + 'netlify/functions/zakazky.mjs');
const { default: uzivatele } = await import(R + 'netlify/functions/uzivatele.mjs');
const { default: funkce } = await import(R + 'netlify/functions/funkce.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
await import(R + 'netlify/lib/jadro.mjs').then(m => m.jadro());
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const G = globalThis;
if (typeof G.vzT1Nastav !== 'function' || typeof G.vzServerInvariant !== 'function') { console.log('FAIL jádro nenese T1 (vzT1Nastav, vzServerInvariant)'); process.exit(1); }

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 400)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const kopie = x => JSON.parse(JSON.stringify(x));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const ulozenoText = (soubor) => pamet.get('zakazky/z/' + soubor) || null;
const ulozenoObj = (soubor) => { const s = ulozenoText(soubor); return s ? JSON.parse(s) : null; };
/* Uložení; při 200 převezme razítko a vrátí i uloženou verzi (jak by ji načetl prohlížeč). */
async function uloz(zak, c) {
  const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: zak.uloRazitko || undefined }, c);
  const t = { status: r.status, ...(await r.json()) };
  if (t.razitko) zak.uloRazitko = t.razitko;
  return t;
}
const nactiZ = (soubor, razitko) => { const z = G.importZakazka(ulozenoObj(soubor)); z.uloRazitko = razitko; return z; };

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
{ const r = await post(program, 'http://x/api/program', { cenik: Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()), cenikProj: ZC.zkusebniCenikProj(), poznamka: 'VZ T1' }, cA);
  if (r.status !== 200) throw new Error('program ' + r.status); }
for (const [e, j] of [['obch.t1@priklad.cz', 'Obch T1'], ['jiny.t1@priklad.cz', 'Jiný T1']]) {
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: e, jmeno: j, role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
}
const cO = await prihlas('obch.t1@priklad.cz', 'Heslo12345x');
const cJ = await prihlas('jiny.t1@priklad.cz', 'Heslo12345x');
const vypinac = async (telo) => { const r = await post(funkce, 'http://x/api/funkce', telo, cA); if (r.status !== 200) throw new Error('funkce ' + r.status); };

let n = 9801;
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = 'TEST - 2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST T1 ' + nazev; z.objednatel = 'TEST – ALFA ODBĚRATEL s.r.o.';
  z.ico = '25596641';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.ock.fixes = true;
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
const UB = { objednatel: 'TEST – BETA ODBĚRATEL s.r.o.', adresaObjednatele: 'Zkušební 2, Testov', ico: '', dic: '', kontakt: '' };
const UC = { objednatel: 'TEST – GAMA ODBĚRATEL s.r.o.', adresaObjednatele: 'Zkušební 3, Testov', ico: '', dic: '', kontakt: '' };
/* A (z1) a B (z2) sdílí V1, C (z3) vlastní V2; uloženo obchodníkem cO (autor). Vrací { z, soubor, vC }. */
async function tri(nazev, c = cO) {
  const z = nova(nazev);
  G.vzPridej(z, UB, { kdo: 'Obch T1', kdy: '2026-11-18T10:00:00.000Z' });
  const p = G.vzPridej(z, UC, { kdo: 'Obch T1', kdy: '2026-11-18T10:00:00.000Z', vlastni: true });
  const t = await uloz(z, c);
  if (t.status !== 200) throw new Error('tri ' + JSON.stringify(t));
  return { z: nactiZ(t.soubor, t.razitko), soubor: t.soubor, vC: p.zakaznik.varianta };
}

await vypinac({ viceZakazniku: true });

/* ---------- 1) práva a legitimní změny ---------- */
{
  const { z, soubor, vC } = await tri('vlastni');
  const pred = ulozenoText(soubor);
  const zj = kopie(z); G.vzT1Nastav(zj, vC);
  const tj = await uloz(zj, cJ);
  test('1 jiný obchodník: řídící C (vlastní varianta) → 403, úložiště beze změny', tj.status === 403 && /mění jen autor/.test(tj.chyba || '') && ulozenoText(soubor) === pred, tj);
  const r = G.vzT1Nastav(z, vC);
  const t = await uloz(z, cO);
  const u = ulozenoObj(soubor);
  test('1 autor: vlastní varianta C → 200, řídící C, řídící varianta = V2, invariant', r.ok && t.status === 200 && u.vzRidici.id === 'z3'
    && u.vzRidici.varianta === vC && u.varianty.find(v => v.ridici).id === vC && u.objednatel === UC.objednatel && u.vzRidici.pismeno === 'C', { t: t.chyba, r: u.vzRidici });
  const z2 = nactiZ(soubor, t.razitko);
  G.vzT1Nastav(z2, z2.varianty[0].id, 'z2');
  const t2 = await uloz(z2, cO);
  const u2 = ulozenoObj(soubor);
  test('1 autor: sdílená V1 a B → 200, řídící B na V1, C zůstal na V2', t2.status === 200 && u2.vzRidici.id === 'z2' && u2.vzRidici.varianta === u2.varianty[0].id
    && u2.dalsiZakaznici.find(d => d.id === 'z3').varianta === vC, { t2: t2.chyba, r: u2.vzRidici });
}
{
  const { z, soubor } = await tri('jen varianta');
  const nv = G.klonujVariantu(z, z.varianty[0].id, { aktivovat: false });
  const t0 = await uloz(z, cO);   // nová varianta bez zákazníka uložená
  const z1 = nactiZ(soubor, t0.razitko);
  const pred = ulozenoText(soubor);
  const zj = kopie(z1); G.vzT1Nastav(zj, nv.id);
  const tj = await uloz(zj, cJ);
  test('1 jiný obchodník: JEN řídící varianta (bez zákazníka) → 403 „řídící variantu …", beze změny', t0.status === 200 && tj.status === 403
    && /řídící variantu zakázky s víc zákazníky mění jen autor/.test(tj.chyba || '') && ulozenoText(soubor) === pred, tj);
  const za = kopie(z1); G.vzT1Nastav(za, nv.id);
  const ta = await uloz(za, cA);
  const u = ulozenoObj(soubor);
  test('1 administrátor: JEN řídící varianta → 200, řídící A na nové variantě', ta.status === 200 && u.vzRidici.id === 'z1' && u.vzRidici.varianta === nv.id
    && u.varianty.find(v => v.ridici).id === nv.id, { ta: ta.chyba, r: u.vzRidici });
}
{ /* zakázka z webhooku: řídícího mění jen administrátor */
  const { z, soubor, vC } = await tri('webhook', cA);
  const u0 = ulozenoObj(soubor); u0.autor = 'pipedrive-webhook'; pamet.set('zakazky/z/' + soubor, JSON.stringify(u0));
  const zz = kopie(z); zz.autor = 'pipedrive-webhook'; G.vzT1Nastav(zz, vC);
  const t = await uloz(zz, cO);
  test('1 webhook: obchodník 403', t.status === 403, t);
  const t2 = await uloz(zz, cA);
  test('1 webhook: administrátor 200', t2.status === 200 && ulozenoObj(soubor).vzRidici.id === 'z3', t2);
}

/* ---------- 2) invariant 409 ---------- */
{
  const { z, soubor, vC } = await tri('invariant');
  const pred = ulozenoText(soubor);
  const pokus = async (popis, uprav, re) => {
    const zz = kopie(z); uprav(zz);
    const t = await uloz(zz, cO);
    test('2 ' + popis + ' → 409, úložiště beze změny', t.status === 409 && re.test(t.chyba || '') && ulozenoText(soubor) === pred, { status: t.status, chyba: t.chyba });
  };
  await pokus('A přesunutý na vlastní variantu C', zz => { zk.nastavRidici(zz, vC); zz.vzRidici.varianta = vC; }, /vlastní varianta zákazníka C — TEST – GAMA/);
  await pokus('ukazatel řídícího ≠ řídící varianta', zz => { zk.nastavRidici(zz, vC); }, /řídící zákazník musí mít řídící variantu/);
  await pokus('C řídícím sdílené V1, kterou nedostal', zz => { G.vzVymenRidiciho(zz, 'z3'); zk.nastavRidici(zz, zz.varianty[0].id); zz.vzRidici.varianta = zz.varianty[0].id; },
    /jen zákazník, kterému patří/);
  await pokus('nová varianta bez zákazníka a výměna na B', zz => { const v = G.klonujVariantu(zz, zz.varianty[0].id, { aktivovat: false });
    G.vzVymenRidiciho(zz, 'z2'); zk.nastavRidici(zz, v.id); zz.vzRidici.varianta = v.id; }, /nepatří žádnému zákazníkovi/);
  const zv = kopie(z); const v = G.klonujVariantu(zv, zv.varianty[0].id, { aktivovat: false }); G.vzT1Nastav(zv, v.id);
  const tv = await uloz(zv, cO);
  test('2 nová varianta bez zákazníka v témže uložení, řídící A na ni přejde → 200', tv.status === 200 && ulozenoObj(soubor).vzRidici.varianta === v.id, tv);
}

/* ---------- 3) E4: fixace KL a písmena ---------- */
{
  const { z, soubor, vC } = await tri('kl');
  const v1 = z.varianty[0];
  v1.data.kryci = v1.data.kryci || {};
  v1.data.kryci.hodnoty = Object.assign({}, v1.data.kryci.hodnoty, { zakaznik: 'Ruční Alfa' });
  const t0 = await uloz(z, cO);
  const z1 = nactiZ(soubor, t0.razitko);
  G.vzT1Nastav(z1, vC);
  const t = await uloz(z1, cO);
  const u = ulozenoObj(soubor);
  test('3 výměna přes T1: ruční hodnota KL pole zákazníka nese vlastníka z1, písmena beze změny', t0.status === 200 && t.status === 200
    && u.varianty[0].data.kryci.vzVlastnik && u.varianty[0].data.kryci.vzVlastnik.zakaznik === 'z1'
    && u.vzRidici.pismeno === 'C' && u.dalsiZakaznici.map(d => d.id + ':' + d.pismeno).sort().join() === 'z1:,z2:B', { t: t.chyba, kl: u.varianty[0].data.kryci });
}

/* ---------- 4) jeden zákazník a VYP jako dřív ---------- */
{
  const z = nova('jeden');
  const t0 = await uloz(z, cO);
  const z1 = nactiZ(t0.soubor, t0.razitko);
  const v = G.klonujVariantu(z1, z1.varianty[0].id, { aktivovat: false });
  zk.nastavRidici(z1, v.id);
  const t = await uloz(z1, cJ);
  test('4 jeden zákazník: změna řídící varianty jiným obchodníkem → 200 jako dřív, bez klíčů VZ', t0.status === 200 && t.status === 200
    && !('vzRidici' in ulozenoObj(t0.soubor)) && ulozenoObj(t0.soubor).varianty.find(x => x.ridici).id === v.id, t);
}
{
  const { z, soubor, vC } = await tri('vyp');
  await vypinac({ viceZakazniku: false });
  const pred = ulozenoText(soubor);
  const zz = kopie(z); G.vzT1Nastav(zz, vC);
  const t = await uloz(zz, cO);
  test('4 VYP: výměna řídícího (data VZ) odmítnuta VZ_VYPNUTO, beze změny', t.status === 400 && t.chyba.indexOf(G.VZ_VYPNUTO.slice(0, 40)) >= 0 && ulozenoText(soubor) === pred, t);
  await vypinac({ viceZakazniku: true });
}

console.log('\nVZ T1 server: ' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
