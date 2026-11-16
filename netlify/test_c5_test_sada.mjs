/* C5 (#585, 11. 11. 2026): nástroj obnovy testovací sady zakázek
 * (nastroje/test_sada_jadro.mjs + test_sada_obnov.mjs) proti SKUTEČNÝM
 * serverovým funkcím nad paměťovým úložištěm — bez sítě a bez webu.
 *
 * Postup jako v provozu: „zdrojový" server (kopie testovací databáze z 2. 11.)
 * — obchodník tam založí TEST zakázky (rozpracovanou, odeslanou, prodanou
 * se SoD, víc šachet); export = zakázky tak, jak leží v úložišti. Úložiště se
 * pak vyprázdní (= testovací databáze bez sady) a nástroj sadu obnoví.
 * `fetch` nástroje vede na funkce zdravi / prihlaseni / odhlaseni / zakazky;
 * zaznamenává se každé volání (P2).
 *
 * Body 1–9 zadání C5 (podklady/PROMPT_C5_PO_KOLE47.md, oddíl 4). Pojistka:
 * bez nástroje (před C5) sada neběží; mutace „[C5]" v netlify/mutace.mjs
 * vypínají jednotlivé kontroly P1–P5 a každou chytí některý test níž.
 * Spuštění: node netlify/test_c5_test_sada.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
delete process.env.PROSTREDI;
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const R = new URL('..', import.meta.url).pathname;
const { default: prihlaseni } = await import(R + 'netlify/functions/prihlaseni.mjs');
const { default: odhlaseni } = await import(R + 'netlify/functions/odhlaseni.mjs');
const { default: zdravi } = await import(R + 'netlify/functions/zdravi.mjs');
const { default: program } = await import(R + 'netlify/functions/program.mjs');
const { default: zakazky } = await import(R + 'netlify/functions/zakazky.mjs');
const { default: uzivatele } = await import(R + 'netlify/functions/uzivatele.mjs');
const { default: funkce } = await import(R + 'netlify/functions/funkce.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { ZAKAZKA_MAX_B: SERVER_MAX_B } = await import(R + 'netlify/lib/zakazka_kontrola.mjs');
const { pdSimulatorStav } = await import(R + 'netlify/lib/pipedrive_simulator.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
const { JEKLY } = await jadro();
const J = await import(R + 'nastroje/test_sada_jadro.mjs');
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const zam = require(R + 'src/zamek.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const OBJ = require(R + 'src/objednane.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 600)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const kopie = x => JSON.parse(JSON.stringify(x));
const HESLO_ADMIN = 'Docasne.Heslo.123';
const HESLO_OBCH = 'ObchHeslo.C5x';
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const uloz = async (zak, c, razitko) => { const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: razitko }, c); return { status: r.status, ...(await r.json()) }; };
const nacti = async (soubor, c) => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), c)).json()).zakazka;
const OBCH = 'obch.c5@priklad.cz';
const CENIK = () => Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky());

/* Databáze „testovacího webu": ceník, firma ne, víc šachet zapnuto, obchodník. */
async function pripravDatabazi() {
  const cA = await prihlas(ADMIN_EMAIL, HESLO_ADMIN);
  const r = await post(program, 'http://x/api/program', { cenik: CENIK(), cenikProj: ZC.zkusebniCenikProj(),
    slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.05, 'Administrátor': 1 } }, poznamka: 'C5' }, cA);
  if (r.status !== 200) throw new Error('program ' + r.status);
  const f = await post(funkce, 'http://x/api/funkce', { viceSachet: true }, cA);
  if (f.status !== 200) throw new Error('funkce ' + f.status);
  const u = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: OBCH, jmeno: 'Obch C5', role: 'Obchodník', heslo: HESLO_OBCH }, cA)).json();
  if (!u.ok) throw new Error('uzivatel ' + JSON.stringify(u));
  return cA;
}

/* ================= ZDROJ: TEST zakázky jako v kopii z 2. 11. ================= */
const cZ = await pripravDatabazi();
const cO = await prihlas(OBCH, HESLO_OBCH);
const platny = () => JSON.parse(pamet.get('program/db')).platny;
const ROZMERY = { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 };
let n = 1;
function nova(nazev, cislo) {
  const z = zk.novaZakazka();
  z.cislo = cislo || ('TEST - 2026 - OPR - CN - 958' + (n++) + ' - C5');
  z.nazevAkce = 'TEST C5 ' + nazev;
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, ROZMERY);
  v.data.ock.fixes = true;
  v.data.cenik = kopie(platny().cenik); v.data.proj.cenik = kopie(platny().cenikProj);
  v.data.kryci = { hodnoty: { jmenoPrijmeni: 'Zkušební Kontakt', zaloha1: '30 % – po podpisu smlouvy' } };
  return z;
}
const zamkni = (z, v, typ) => zam.zamkniVariantu(v, { typ: typ || 'nabidkaTisk', kdy: new Date().toISOString(), kdo: 'Test C5',
  cislo: zam.variantaCislo(z, v), vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-c5') });
async function ulozZdroj(z, c) { const r = await uloz(z, c || cO); if (r.status !== 200) throw new Error('zdroj ' + z.cislo + ' ' + r.status + ' ' + r.chyba); return r; }

/* A — rozpracovaná, dvě varianty */
const zA = nova('rozpracovaná'); zam.klonujVariantu(zA, zA.varianty[0].id);
const rA = await ulozZdroj(zA);
/* B — odeslaná nabídka (zámek) + rozpracovaný klon */
const zB = nova('odeslaná'); zamkni(zB, zB.varianty[0]); zam.klonujVariantu(zB, zB.varianty[0].id);
const rB = await ulozZdroj(zB);
/* C — odeslaná, pak prodaná (druhé uložení jako prohlížeč) */
const zC = nova('prodaná'); zamkni(zC, zC.varianty[0]);
const rC = await ulozZdroj(zC);
{ const g = zk.importZakazka(kopie(await nacti(rC.soubor, cO)));
  g.varianty[0].prodano = { datum: OBJ.objDnes() };
  const r = await uloz(g, cO, g.uloRazitko);
  if (r.status !== 200) throw new Error('prodej ' + r.status + ' ' + r.chyba); }
/* D — víc šachet (dvě varianty šachet), odeslaná */
const zD = nova('víc šachet'); { const ock = zD.varianty[0].data.ock; ock.nazev = 'Výtah A';
  ock.dalsi = [{ id: 's_b1', nazev: 'Výtah B', ks: 2, zadani: Object.assign(kopie(ock.zadani), { zdvih: 12 }) }]; }
zamkni(zD, zD.varianty[0]);
const rD = await ulozZdroj(zD);
/* Cizí (ne-TEST) zakázka — v kopii databáze je taky. */
const zX = nova('ostrá', '2026 - OPR - CN - 0500'); zX.nazevAkce = 'Cizí zakázka';
await ulozZdroj(zX);

const zakazkyZdroje = () => [...pamet.keys()].filter(k => k.startsWith('zakazky/z/')).map(k => JSON.parse(pamet.get(k)));
const EXPORT = zakazkyZdroje().filter(z => J.cisloJeTest(z.cislo));
const OTISK = { porizena: new Date().toISOString(), zdroj: 'nocni-otisk', kdo: 'x', program: platny(),
  uzivatele: [{ email: OBCH, jmeno: 'Obch C5', role: 'Obchodník', aktivni: true }],
  zakazky: Object.fromEntries(zakazkyZdroje().map(z => [J.jmenoSouboru(z), z])) };
test('příprava: zdroj nese 4 TEST zakázky (rozpracovaná, odeslaná, prodaná, víc šachet) a 1 cizí',
  EXPORT.length === 4 && Object.keys(OTISK.zakazky).length === 5
  && EXPORT.some(z => z.varianty[0].prodano) && EXPORT.some(z => (z.varianty[0].data.ock.dalsi || []).length === 1),
  EXPORT.map(z => z.cislo));
const souborC = rC.soubor, souborB = rB.soubor, souborD = rD.soubor, souborA = rA.soubor;

/* ================= CÍL: testovací databáze bez sady ================= */
pamet.clear();
const cA = await pripravDatabazi();
process.env.PROSTREDI = 'test';

/* Síť nástroje: povolené dvojice vedou na funkce, každé volání se zapíše. */
const FN = { '/api/zdravi': zdravi, '/api/prihlaseni': prihlaseni, '/api/odhlaseni': odhlaseni, '/api/zakazky': zakazky,
  '/api/funkce': funkce, '/api/program': program, '/api/uzivatele': uzivatele };
let VOLANI = [];
let TELA = [];          // těla POST /api/zakazky
let TELA_COOKIE = '';   // poslední cookie relace, kterou nástroj poslal
let HAKY = {};        // 'METODA /cesta' → async (init) před předáním funkci
let PRESMERUJ = {};   // původ → cílový původ (simulované 302)
let SPOOF = {};       // původ → odpověď zdraví podvrženého webu
async function falesnyFetch(url, init) {
  init = init || {};
  const u = new URL(url);
  const metoda = (init.method || 'GET').toUpperCase();
  VOLANI.push({ metoda, cesta: u.pathname, puvod: u.origin, redirect: init.redirect });
  if (metoda === 'POST' && u.pathname === '/api/zakazky') TELA.push(JSON.parse(init.body));
  if (init.headers && init.headers.cookie) TELA_COOKIE = String(init.headers.cookie);
  if (PRESMERUJ[u.origin]) {
    if (init.redirect === 'error') throw new TypeError('fetch failed: redirect mode is set to error');
    return falesnyFetch(PRESMERUJ[u.origin] + u.pathname + u.search, Object.assign({}, init, { redirect: 'follow-done' }));
  }
  if (SPOOF[u.origin]) return Response.json(SPOOF[u.origin]);
  const hak = HAKY[metoda + ' ' + u.pathname];
  if (hak) await hak(init);
  const fn = FN[u.pathname];
  if (!fn) return new Response('{"ok":false}', { status: 404 });
  return fn(new Request('http://x' + u.pathname + u.search, { method: metoda, headers: init.headers || {}, body: init.body }));
}
const WEB = 'http://127.0.0.1:8888';
let VYSTUP = [];
let HESLO_DOTAZ = 0;
async function spust(o) {
  VOLANI = []; TELA = []; VYSTUP = []; HESLO_DOTAZ = 0;
  const odpovedi = (o.odpovedi || [o.email || ADMIN_EMAIL, 'OBNOVIT']).slice();
  const r = await J.obnovSadu({
    web: ('web' in o) ? o.web : WEB, zakazky: o.zakazky, zapsat: !!o.zapsat, fetch: falesnyFetch, pauzaMs: 0,
    zeptej: async () => odpovedi.shift(), zeptejHeslo: async () => { HESLO_DOTAZ++; return o.heslo || HESLO_ADMIN; },
    vypis: (s) => VYSTUP.push(String(s)), prerusit: o.prerusit,
  });
  return Object.assign(r, { volani: VOLANI.slice(), vystup: VYSTUP.join('\n'), hesloDotaz: HESLO_DOTAZ });
}
const kanonTela = (z) => J.kanon(z);
const zapisu = (r) => r.volani.filter(v => v.metoda === 'POST' && v.cesta === '/api/zakazky').length;
const prihlaseno = (r) => r.volani.some(v => v.cesta === '/api/prihlaseni');
const naServeru = () => [...pamet.keys()].filter(k => k.startsWith('zakazky/z/'));

/* ---- 1) cíl ---- */
console.log('===== 1) cíl (P1) =====');
for (const a of ['https://testengscalc.netlify.app', 'https://testengscalc.netlify.app/', 'http://localhost:8888', 'http://127.0.0.1:3000'])
  test('cíl povolen: ' + a, J.cilPovolen(a).ok === true, J.cilPovolen(a));
/* Zavináč skládaný zvlášť: adresa s uživatelem v URL není e-mail (kontrola_udaju.py). */
const ZAV = '@';
const SPATNE = ['https://engscalc.netlify.app', 'https://x--engscalc.netlify.app', 'https://ENGSCALC.netlify.app', 'https://schaftscalc.netlify.app',
  'https://muj-schaftscalc.example.cz', 'https://evil.example.com', 'http://testengscalc.netlify.app', 'https://uzivatel' + ZAV + 'testengscalc.netlify.app',
  'https://u:h' + ZAV + 'testengscalc.netlify.app', 'https://testengscalc.netlify.app/api', 'https://testengscalc.netlify.app?x=1',
  'https://TestEngscalc.netlify.app', 'https://testengscalc.netlify.app.', 'https://testengscalc.netlify.app:443', 'https://testengscalc.netlify.app.evil.cz',
  'http://localhost', 'https://localhost:8888', 'http://localhost:0', 'http://[::1]:8888', 'ftp://testengscalc.netlify.app', '', 'nesmysl'];
for (const a of SPATNE) {
  const r = await spust({ web: a, zakazky: EXPORT, zapsat: true });
  test('cíl odmítnut před heslem (kód 2, žádné volání, heslo nevyžádáno): ' + JSON.stringify(a),
    r.kod === 2 && r.volani.length === 0 && r.hesloDotaz === 0 && !naServeru().length, { kod: r.kod, v: r.volani, h: r.hesloDotaz });
}
for (const a of ['https://engscalc.netlify.app', 'https://deploy-1--engscalc.netlify.app', 'https://schaftscalc.netlify.app'])
  test('ostrý web má srozumitelnou hlášku: ' + a, /OSTRÝ web/.test(J.cilPovolen(a).chyba || ''), J.cilPovolen(a));
/* Shoda se simulátorem Pipedrive: tytéž adresy simulátor odmítne jako ostrý web. */
for (const a of ['https://engscalc.netlify.app', 'https://x--engscalc.netlify.app', 'https://schaftscalc.netlify.app',
  'https://testengscalc.netlify.app', 'https://deploy-preview-3--testengscalc.netlify.app', 'http://localhost:8888']) {
  const sim = pdSimulatorStav({ PIPEDRIVE_SIMULATOR: '1', URL: a, PROSTREDI: 'test' });
  test('ostrý web = simulátor Pipedrive: ' + a, !!J.cilOstry(a) === /ostrý web/.test(sim.duvod || ''), { nastroj: J.cilOstry(a), sim });
}

/* ---- 2) /api/zdravi ---- */
console.log('===== 2) prostředí (P1) =====');
{ delete process.env.PROSTREDI;
  const r = await spust({ zakazky: EXPORT, zapsat: true });
  test('zdraví hlásí ostré (proměnná nenastavená) → konec bez přihlášení a hesla', r.kod === 2 && !prihlaseno(r) && r.hesloDotaz === 0 && !naServeru().length, r);
  process.env.PROSTREDI = 'ostre';
  const r2 = await spust({ zakazky: EXPORT, zapsat: true });
  test('zdraví hlásí „ostre" → konec bez přihlášení', r2.kod === 2 && !prihlaseno(r2) && r2.hesloDotaz === 0, r2);
  process.env.PROSTREDI = 'test';
  SPOOF['http://127.0.0.1:7777'] = { ok: true, verze: '1' };
  const r3 = await spust({ web: 'http://127.0.0.1:7777', zakazky: EXPORT, zapsat: true });
  test('zdraví bez prostředí → konec bez přihlášení', r3.kod === 2 && !prihlaseno(r3), r3);
  /* Přesměrování z povoleného cíle na podvržený web, který se tváří jako test. */
  PRESMERUJ['http://127.0.0.1:7778'] = 'https://jinde.example.cz';
  SPOOF['https://jinde.example.cz'] = { ok: true, prostredi: 'test' };
  const r4 = await spust({ web: 'http://127.0.0.1:7778', zakazky: EXPORT, zapsat: true });
  test('přesměrování se nenásleduje → konec bez přihlášení', r4.kod === 2 && !prihlaseno(r4) && r4.volani.every(v => v.redirect === 'error'), r4.volani);
  /* Prostředí se změní po přihlášení / těsně před zápisem. */
  let k = 0;
  HAKY['GET /api/zdravi'] = async () => { k++; process.env.PROSTREDI = k >= 2 ? 'ostre' : 'test'; };
  const r5 = await spust({ zakazky: EXPORT, zapsat: true });
  test('zdraví po přihlášení hlásí ostré → konec bez zápisu, odhlášeno', r5.kod === 2 && zapisu(r5) === 0
    && r5.volani.some(v => v.cesta === '/api/odhlaseni'), r5.volani);
  k = 0;
  HAKY['GET /api/zdravi'] = async () => { k++; process.env.PROSTREDI = k >= 3 ? 'ostre' : 'test'; };
  const r6 = await spust({ zakazky: EXPORT, zapsat: true });
  test('zdraví těsně před zápisem hlásí ostré → konec bez zápisu', r6.kod === 2 && zapisu(r6) === 0 && k === 3, { k, v: r6.volani });
  delete HAKY['GET /api/zdravi']; process.env.PROSTREDI = 'test';
  test('nic se nezapsalo', !naServeru().length, naServeru()); }

/* ---- 3) role ---- */
console.log('===== 3) role (P2) =====');
{ const r = await spust({ zakazky: EXPORT, zapsat: true, email: OBCH, heslo: HESLO_OBCH });
  test('obchodník → konec bez zápisu (kód 1), odhlášen', r.kod === 1 && zapisu(r) === 0 && !naServeru().length
    && r.volani.some(v => v.cesta === '/api/odhlaseni'), r.vystup);
  const r2 = await spust({ zakazky: EXPORT, zapsat: true, heslo: 'spatne-heslo' });
  test('špatné heslo → konec bez zápisu', r2.kod === 1 && zapisu(r2) === 0, r2.vystup); }

/* ---- 4) jen TEST ---- */
console.log('===== 4) jen TEST (P3) =====');
{ test('číslo TEST: „TEST - 2026 - OPR - CN - 9578 - K19T-C078"', J.cisloJeTest('TEST - 2026 - OPR - CN - 9578 - K19T-C078'));
  for (const c of ['2026 - OPR - CN - 9578 - TEST', 'TEST', 'TEST -', 'TESTX - 1', 'test - 2026', ' X TEST - 1', null, 5, { a: 1 }])
    test('číslo není TEST: ' + JSON.stringify(c), !J.cisloJeTest(c));
  const cizi = kopie(OTISK.zakazky[Object.keys(OTISK.zakazky).find(k => !k.startsWith('TEST'))]);
  const e1 = J.vyberZExportu(EXPORT.concat([cizi]));
  test('export s jednou ne-TEST zakázkou → výběr odmítnut, vypíše ji', !e1.ok && e1.cizi.length === 1 && e1.cizi[0].cislo === '2026 - OPR - CN - 0500', e1);
  const r = await spust({ zakazky: EXPORT.concat([cizi]), zapsat: true });
  test('…a jádro samo nezapíše nic ani bez výběru (kód 2, žádné volání)', r.kod === 2 && r.volani.length === 0 && !naServeru().length, r);
  const zamCizi = kopie(EXPORT.find(z => z.varianty[0].zamek)); zamCizi.varianty[0].zamek.cislo = '2026 - OPR - CN - 0500';
  const e2 = J.vyberZExportu([zamCizi]);
  test('varianta se zámkem s ne-TEST číslem → výběr odmítnut', !e2.ok && e2.cizi[0].duvody.some(d => d.kde === 'číslo v zámku'), e2);
  const r2 = await spust({ zakazky: [zamCizi], zapsat: true });
  test('…nula zápisů', r2.kod === 2 && zapisu(r2) === 0, r2);
  const projCizi = kopie(EXPORT[0]); projCizi.projHlavicka = Object.assign({}, projCizi.projHlavicka, { cislo: '2026 - OPR - PROJ - 0500' });
  test('číslo PROJ ne-TEST → výběr odmítnut', !J.vyberZExportu([projCizi]).ok && (await spust({ zakazky: [projCizi], zapsat: true })).kod === 2);
  const bezCislaZamku = kopie(EXPORT.find(z => z.varianty[0].zamek)); bezCislaZamku.varianty[0].zamek.cislo = '';
  test('zámek bez čísla → výběr odmítnut (bezpečnější výchozí)', !J.vyberZExportu([bezCislaZamku]).ok);
  test('export { zakazky: [...] } se přijme', J.vyberZExportu({ zakazky: EXPORT }).ok === true);
  test('prázdný export → chyba', !J.vyberZExportu([]).ok && !J.vyberZExportu({ x: 1 }).ok);
  const z1 = J.vyberZeZalohy(OTISK);
  test('--zaloha vybere jen TEST (4 ze 5), účty a ceník nečte', z1.ok && z1.zakazky.length === 4 && z1.ostatnich === 1
    && z1.zakazky.every(z => J.cisloJeTest(z.cislo)), { ok: z1.ok, n: z1.zakazky && z1.zakazky.length, o: z1.ostatnich });
  const ot2 = kopie(OTISK); ot2.zakazky.x = zamCizi;
  const z2 = J.vyberZeZalohy(ot2);
  test('--zaloha: TEST zakázka s cizím číslem zámku se vyřadí, ostatní projdou', z2.ok && z2.zakazky.length === 4 && z2.vyrazene.length === 1, z2.vyrazene);
  test('--zaloha bez TEST zakázek → chyba', !J.vyberZeZalohy({ zakazky: { a: cizi } }).ok);
  test('--zaloha: manifest po částech → chyba', !J.vyberZeZalohy({ format: 'casti-1', casti: 3 }).ok);
  test('prázdný výběr v jádru → kód 2', (await spust({ zakazky: [], zapsat: true })).kod === 2); }

/* ---- 5) náhled a potvrzení ---- */
console.log('===== 5) náhled (P4) =====');
{ const r = await spust({ zakazky: EXPORT });
  test('náhled: kód 0, rejstřík přečten, nic nezapsáno', r.kod === 0 && zapisu(r) === 0 && !naServeru().length
    && /NÁHLED/.test(r.vystup) && /Založí se 4/.test(r.vystup), r.vystup);
  const r2 = await spust({ zakazky: EXPORT, zapsat: true, odpovedi: [ADMIN_EMAIL, 'ano'] });
  test('--zapsat bez napsaného OBNOVIT → nic (kód 1)', r2.kod === 1 && zapisu(r2) === 0 && !naServeru().length, r2.vystup);
  const r3 = await spust({ zakazky: EXPORT, zapsat: true, odpovedi: [ADMIN_EMAIL, ''] });
  test('--zapsat s prázdným potvrzením → nic', r3.kod === 1 && zapisu(r3) === 0); }

/* ---- 6) nic se nepřepíše ---- */
console.log('===== 6) nic se nepřepíše (P4) =====');
let predExistujici;
{ /* Na serveru už leží zakázka B — jiná (kolega ji mezitím založil znovu). */
  const jina = nova('jiná pod stejným číslem', EXPORT.find(z => J.jmenoSouboru(z) === souborB).cislo);
  const ru = await uloz(jina, await prihlas(ADMIN_EMAIL, HESLO_ADMIN));   // odhlášení nástroje zrušilo relace účtu
  test('příprava: na cíli leží jiná zakázka s číslem B', ru.status === 200 && ru.soubor === souborB, ru);
  predExistujici = pamet.get('zakazky/z/' + souborB);
  /* Souběh: zakázku C založí kolega mezi čtením rejstříku a zápisem. */
  let souper = null;
  HAKY['POST /api/zakazky'] = async (init) => {
    const t = JSON.parse(init.body);
    if (J.jmenoSouboru(t.zakazka) === souborC && !souper) {
      const r = await uloz(nova('souběh', t.zakazka.cislo), await prihlas(OBCH, HESLO_OBCH));
      souper = pamet.get('zakazky/z/' + souborC);
      if (r.status !== 200) throw new Error('souběh ' + r.status);
    }
  };
  const r = await spust({ zakazky: EXPORT, zapsat: true });
  delete HAKY['POST /api/zakazky'];
  test('existující zakázka B se přeskočí (stav „už existuje"), POST na ni nejde', r.souhrn.existuje === 1
    && r.volani.filter(v => v.metoda === 'POST' && v.cesta === '/api/zakazky').length === 3, { s: r.souhrn, v: r.vystup });
  test('…obsah B na serveru před = po', pamet.get('zakazky/z/' + souborB) === predExistujici);
  test('souběh u C → 409 = přeskočeno (souběh), obsah soupeře zůstal', r.souhrn.soubeh === 1 && pamet.get('zakazky/z/' + souborC) === souper, r.souhrn);
  test('každý zápis nese ocekavaneRazitko "" a nikdy prepsat', r.volani.length > 0 && TELA.every(t => t.ocekavaneRazitko === '' && !('prepsat' in t)), TELA.map(t => Object.keys(t)));
  test('kód 1 (souběh není „vše založeno"), A a D založeny', r.kod === 1 && r.souhrn.zalozeno === 2 && !!pamet.get('zakazky/z/' + souborA)
    && !!pamet.get('zakazky/z/' + souborD), r.souhrn);
  /* Druhé spuštění je bezpečné: vše už je → nic se nezapíše, kód 0. */
  const r2 = await spust({ zakazky: EXPORT, zapsat: true });
  test('druhé spuštění: vše přeskočeno, nic zapsáno, kód 0', r2.kod === 0 && zapisu(r2) === 0 && r2.souhrn.existuje === 4, r2.souhrn); }

/* ---- 7) zámky, prodej, víc šachet ---- */
console.log('===== 7) zámky a data (P5) =====');
{ pamet.clear(); await pripravDatabazi();
  const r = await spust({ zakazky: EXPORT, zapsat: true });
  if (process.env.C5_VYPIS) console.log(r.vystup);
  test('čistá databáze: všechny 4 založeny a ověřeny, kód 0', r.kod === 0 && r.souhrn.zalozeno === 4 && r.souhrn.rozdil === 0, { s: r.souhrn, v: r.vystup });
  for (const z of EXPORT) {
    const g = JSON.parse(pamet.get('zakazky/z/' + J.jmenoSouboru(z)) || 'null');
    if (process.env.C5_LADENI && g) { const { rozdil } = await import(process.env.C5_LADENI); g.varianty.forEach((w, i) => console.log(z.nazevAkce, i, rozdil(z.varianty[i].data, w.data).join('\n  '))); }
    test('…' + z.nazevAkce + ': porovnání bez rozdílu, autor z exportu zachován', g && !J.porovnej(z, g).length && g.autor === z.autor && g.autor === OBCH,
      g && { roz: J.porovnej(z, g), autor: g.autor });
  }
  const gC = JSON.parse(pamet.get('zakazky/z/' + souborC));
  test('prodaná varianta: zámek i prodej zůstaly', gC.varianty[0].zamek && gC.varianty[0].zamek.zamceno && !!gC.varianty[0].prodano, gC.varianty[0].prodano);
  const gD = JSON.parse(pamet.get('zakazky/z/' + souborD));
  test('víc šachet se zapnutou funkcí projde, zámek zůstal', (gD.varianty[0].data.ock.dalsi || []).length === 1 && gD.varianty[0].zamek.zamceno);
  /* Víc šachet s VYPNUTOU funkcí: server odmítne, nástroj nic neupravuje, jen vypíše. */
  pamet.clear(); const cA2 = await pripravDatabazi();
  await post(funkce, 'http://x/api/funkce', { viceSachet: false }, cA2);
  const r2 = await spust({ zakazky: EXPORT, zapsat: true });
  test('víc šachet s vypnutou funkcí → odmítnuto serverem s důvodem, ostatní založeny, kód 1',
    r2.kod === 1 && r2.souhrn.odmitnuto === 1 && r2.souhrn.zalozeno === 3 && /odmítnuto serverem \(409\)/.test(r2.vystup), { s: r2.souhrn, v: r2.vystup });
  /* Prodaná varianta s vytištěnou SoD (záznam tisku v zámku) a starý zámek
   * bez značky „číslo z papíru" (před #320, 9/2026). Číslo se přejmenuje
   * i v zámku, aby šlo o novou zakázku. */
  pamet.clear(); await pripravDatabazi();
  const prejmenuj = (z, c) => { const x = kopie(z); const stare = x.cislo; x.cislo = c;
    x.varianty.forEach(v => { if (v.zamek && v.zamek.cislo) v.zamek.cislo = v.zamek.cislo.replace(stare, c); }); return x; };
  const sod = prejmenuj(EXPORT.find(z => J.jmenoSouboru(z) === souborC), 'TEST - 2026 - OPR - CN - 9590 - C5 SoD');
  sod.varianty[0].zamek.tisky = (sod.varianty[0].zamek.tisky || []).concat([{ kdy: new Date().toISOString(), typ: 'sod', popis: 'SoD', kdo: 'Test C5' }]);
  const stary = prejmenuj(EXPORT.find(z => J.jmenoSouboru(z) === souborB), 'TEST - 2026 - OPR - CN - 9591 - C5 stary');
  delete stary.varianty[0].zamek.cisloPapir;
  const r3 = await spust({ zakazky: [sod, stary], zapsat: true });
  if (process.env.C5_VYPIS) console.log(r3.vystup);
  const gS = JSON.parse(pamet.get('zakazky/z/' + J.jmenoSouboru(sod)) || 'null');
  test('P5: prodaná varianta s tiskem SoD se založí, zámek i tisk SoD zůstaly', gS && gS.varianty[0].prodano
    && (gS.varianty[0].zamek.tisky || []).some(t => t && t.typ === 'sod') && !J.porovnej(sod, gS).length, r3.vystup);
  test('P5: starý zámek bez značky čísla z papíru → odmítnuto serverem (409 s důvodem), nástroj ho neupravuje',
    r3.souhrn.odmitnuto === 1 && /odmítnuto serverem \(409\): Neuloženo: nová odeslaná/.test(r3.vystup) && r3.kod === 1
    && !pamet.get('zakazky/z/' + J.jmenoSouboru(stary)), r3.vystup);
  test('P5: odeslané tělo = export (nástroj data nemění)', TELA.length === 2 && kanonTela(TELA[1].zakazka) === kanonTela(stary), TELA.length);
  /* B2 (revize 12. 11., K40b #580 ve sloučeném stromu): prodej starší než
   * 7 dní před razítkem přijetí zámku (u nové zakázky = dnes) server odmítne;
   * nástroj data nemění, jen vypíše s doporučením obnovy ze zálohy. */
  pamet.clear(); await pripravDatabazi();
  const prodStary = prejmenuj(EXPORT.find(z => J.jmenoSouboru(z) === souborC), 'TEST - 2026 - OPR - CN - 9592 - C5 prodej');
  prodStary.varianty[0].prodano = Object.assign({}, prodStary.varianty[0].prodano, { datum: OBJ.objDnes(Date.now() - 10 * 86400000) });
  const ruProdStary = kopie(prodStary);
  const r4 = await spust({ zakazky: [prodStary, EXPORT.find(z => J.jmenoSouboru(z) === souborA)], zapsat: true });
  if (process.env.C5_VYPIS) console.log(r4.vystup);
  test('B2: prodej starší než 7 dní → odmítnuto serverem (400), ostatní založena, kód 1',
    r4.souhrn.odmitnuto === 1 && r4.souhrn.zalozeno === 1 && r4.kod === 1 && /9592 - C5 prodej — odmítnuto serverem \(400\)/.test(r4.vystup)
    && !pamet.get('zakazky/z/' + J.jmenoSouboru(prodStary)), r4.vystup);
  test('B2: souhrn u odmítnuté prodané zakázky doporučí Obnovit ze zálohy', /ODMÍTNUTÉ ZAKÁZKY[\s\S]*9592 - C5 prodej — doporučení: prodanou zakázku obnovte v aplikaci přes „Obnovit ze zálohy“/.test(r4.vystup), r4.vystup);
  test('B2: nástroj datum prodeje nezměnil (tělo = export)', J.kanon(TELA[0].zakazka) === J.kanon(ruProdStary));
  test('B2: doporučení u zamčené (neprodané) a u rozpracované zakázky',
    /odeslanou \(zamčenou\)/.test(J.doporuceniOdmitnute(EXPORT.find(z => J.jmenoSouboru(z) === souborB)))
    && /koordinaci/.test(J.doporuceniOdmitnute(EXPORT.find(z => J.jmenoSouboru(z) === souborA))));
  /* Výpadek při čtení zpět: souhrn se vypíše, zakázka „s rozdílem", kód 1. */
  pamet.clear(); await pripravDatabazi();
  HAKY['GET /api/zakazky'] = async (init) => { if (VOLANI.filter(v => v.metoda === 'GET' && v.cesta === '/api/zakazky').length >= 2) throw new TypeError('fetch failed'); };
  const r5 = await spust({ zakazky: [EXPORT[0]], zapsat: true });
  delete HAKY['GET /api/zakazky'];
  test('čtení zpět spadne → souhrn vypsán, „nepodařilo přečíst zpět“, odhlášeno, kód 1', /SOUHRN/.test(r5.vystup)
    && /se nepodařilo přečíst zpět/.test(r5.vystup) && r5.kod === 1 && r5.volani.some(v => v.cesta === '/api/odhlaseni'), r5.vystup);
  test('před heslem upozornění na odhlášení', /Po běhu budete v aplikaci odhlášeni — uložte si rozdělanou práci\./.test(r5.vystup));
  /* Porovnání chytí rozdíl v zámku a datech. */
  const a = kopie(EXPORT.find(z => J.jmenoSouboru(z) === souborB)), b = kopie(a);
  b.varianty[0].zamek.kdy = '2020-01-01T00:00:00.000Z';
  test('porovnání: jiný čas zámku = rozdíl', J.porovnej(a, b).includes('varianta 1: zámek.kdy'), J.porovnej(a, b));
  const c = kopie(a); c.varianty[0].zamek.typ = 'sod';
  test('porovnání: jiný typ zámku = rozdíl', J.porovnej(a, c).includes('varianta 1: zámek.typ'));
  const d = kopie(a); delete d.varianty[0].zamek;
  test('porovnání: chybějící zámek = rozdíl', J.porovnej(a, d).includes('varianta 1: zámek chybí'));
  const e = kopie(a); e.varianty[1].data.ock.zadani.sirka = 2.2;
  test('porovnání: změna dat varianty = rozdíl', J.porovnej(a, e).includes('varianta 2: data varianty (ock.zadani.sirka)'));
  const f = kopie(a); f.varianty.pop();
  test('porovnání: jiný počet variant = rozdíl', J.porovnej(a, f).some(x => /počet variant/.test(x)));
  const h = kopie(a); h.varianty[0].data.sleva = Object.assign({}, h.varianty[0].data.sleva, { role: 'Administrátor' });
  test('porovnání: role slevy (razí server z relace) není rozdíl', !J.porovnej(a, h).length, J.porovnej(a, h));
  const i2 = kopie(a); i2.varianty[0].data.sleva = Object.assign({}, i2.varianty[0].data.sleva, { procenta: 7 });
  test('porovnání: procenta slevy jsou rozdíl', J.porovnej(a, i2).some(x => /sleva\.procenta/.test(x)), J.porovnej(a, i2));
  test('kanonický otisk nezávisí na pořadí klíčů', J.kanon({ a: 1, b: { c: 2, d: 3 } }) === J.kanon({ b: { d: 3, c: 2 }, a: 1 })); }

/* ---- strop velikosti ---- */
{ test('strop těla = server (4 MB)', J.ZAKAZKA_MAX_B === SERVER_MAX_B, [J.ZAKAZKA_MAX_B, SERVER_MAX_B]);
  pamet.clear(); await pripravDatabazi();
  const velka = kopie(EXPORT[0]); velka.cislo = 'TEST - 2026 - VELKA'; velka.poznamkyText = 'x'.repeat(SERVER_MAX_B + 10);
  const r = await spust({ zakazky: [velka, EXPORT[1]], zapsat: true });
  test('zakázka nad strop se přeskočí předem (bez POST), ostatní založena, kód 1', r.souhrn.velka === 1 && zapisu(r) === 1 && r.souhrn.zalozeno === 1 && r.kod === 1, r.souhrn);
  /* Dvakrát v souboru = druhá se přeskočí. */
  pamet.clear(); await pripravDatabazi();
  const r2 = await spust({ zakazky: [EXPORT[0], kopie(EXPORT[0])], zapsat: true });
  test('dvakrát v souboru → druhá přeskočena', r2.souhrn.dvojice === 1 && zapisu(r2) === 1, r2.souhrn);
  /* Přerušení: po první zakázce konec, druhé spuštění dokončí. */
  pamet.clear(); await pripravDatabazi();
  let i = 0;
  const r3 = await spust({ zakazky: EXPORT, zapsat: true, prerusit: () => (i++ >= 1) });
  test('přerušení: založena 1, kód 1, odhlášeno', r3.souhrn.zalozeno === 1 && r3.kod === 1 && r3.volani.some(v => v.cesta === '/api/odhlaseni'), r3.souhrn);
  const r4 = await spust({ zakazky: EXPORT, zapsat: true });
  test('…druhé spuštění založí zbytek (3), první přeskočí', r4.souhrn.zalozeno === 3 && r4.souhrn.existuje === 1 && r4.kod === 0, r4.souhrn); }

/* ---- 8) volání ---- */
console.log('===== 8) volání (P2) =====');
{ pamet.clear(); await pripravDatabazi();
  const r = await spust({ zakazky: EXPORT, zapsat: true });
  const dvojice = new Set(r.volani.map(v => v.metoda + ' ' + v.cesta));
  test('volané dvojice = povolený seznam', [...dvojice].sort().join('|') === J.VOLANI.slice().sort().join('|'), [...dvojice]);
  test('žádné DELETE, obnova, záloha, Pipedrive', !r.volani.some(v => v.metoda === 'DELETE' || /obnova|zaloha|pd/.test(v.cesta)));
  test('všechna volání jen na cíl a s redirect: error', r.volani.every(v => v.puvod === WEB && v.redirect === 'error'));
  test('poslední volání je odhlášení', r.volani[r.volani.length - 1].cesta === '/api/odhlaseni');
  /* ---- 9) výpis ---- */
  console.log('===== 9) výpis (P6) =====');
  test('výpis nenese heslo', !r.vystup.includes(HESLO_ADMIN));
  test('výpis nenese cookie relace', !/kng_relace|=ey|Set-Cookie/i.test(r.vystup) && !r.vystup.includes(TELA_COOKIE || '§'), r.vystup);
  test('výpis nenese e-maily ani ceny (Kč, €)', !/@/.test(r.vystup) && !/Kč|€|EUR/.test(r.vystup), r.vystup);
  test('výpis nenese názvy akcí ani kontakt', !/TEST C5|Zkušební Kontakt/.test(r.vystup), r.vystup);
  test('výpis nese čísla a stav', EXPORT.every(z => r.vystup.includes(z.cislo)) && /založeno a ověřeno/.test(r.vystup));
  test('očištění textu serveru: e-mail a částka', J.ocistiText('uložil jan.novak@priklad.cz, cena 125 000 Kč, marže 12,5 %') === 'uložil …@…, cena … Kč, marže … %',
    J.ocistiText('uložil jan.novak@priklad.cz, cena 125 000 Kč, marže 12,5 %')); }

/* ---- 10) obal z příkazové řádky (přepínače, soubor .json.gz, klávesnice) ----
 * Místní HTTP server jen na 127.0.0.1 nad týmiž funkcemi v paměti. */
console.log('===== 10) obal test_sada_obnov.mjs =====');
{ const { createServer } = await import('node:http');
  const { spawn } = await import('node:child_process');
  const { writeFileSync, mkdtempSync, rmSync } = await import('node:fs');
  const { gzipSync } = await import('node:zlib');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  pamet.clear(); await pripravDatabazi();
  const srv = createServer(async (q, o) => {
    const kusy = []; for await (const k of q) kusy.push(k);
    const fn = FN[q.url.split('?')[0]];
    if (!fn) { o.writeHead(404); return o.end('{}'); }
    const odp = await fn(new Request('http://x' + q.url, { method: q.method, headers: q.headers,
      body: ['GET', 'HEAD'].includes(q.method) ? undefined : Buffer.concat(kusy) }));
    const h = { 'content-type': 'application/json' }; const sc = odp.headers.get('set-cookie'); if (sc) h['set-cookie'] = sc;
    o.writeHead(odp.status, h); o.end(await odp.text());
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const web = 'http://127.0.0.1:' + srv.address().port;
  const slozka = mkdtempSync(join(tmpdir(), 'c5-'));
  const fExport = join(slozka, 'test_sada_export.json'); writeFileSync(fExport, JSON.stringify(EXPORT));
  const fZaloha = join(slozka, 'test_sada_otisk.json.gz'); writeFileSync(fZaloha, gzipSync(JSON.stringify(OTISK)));
  const fCizi = join(slozka, 'test_sada_cizi.json'); writeFileSync(fCizi, JSON.stringify(Object.values(OTISK.zakazky)));
  const obal = (args, radky) => new Promise((hotovo) => {
    const p = spawn(process.execPath, [R + 'nastroje/test_sada_obnov.mjs', ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = ''; p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
    /* Řádky klávesnice po jednom, až nástroj vypíše otázku. */
    const fronta = (radky || []).slice();
    const pis = () => { if (fronta.length) p.stdin.write(fronta.shift() + '\n'); };
    let otazek = 0;
    const hlidej = setInterval(() => { const n = (out.match(/(E-mail administrátora|Heslo: |Napište OBNOVIT)/g) || []).length; while (otazek < n) { otazek++; pis(); } }, 20);
    p.on('close', (kod) => { clearInterval(hlidej); hotovo({ kod, out }); });
  });
  let r = await obal(['--web', web, '--export', fExport, '--neznamy']);
  test('obal: neznámý přepínač → kód 2 a nápověda', r.kod === 2 && /Použití/.test(r.out), r);
  r = await obal(['--web', web]);
  test('obal: chybí soubor → kód 2', r.kod === 2, r);
  r = await obal(['--web', web, '--export', join(slozka, 'neni.json')]);
  test('obal: neexistující soubor → kód 2', r.kod === 2 && /neexistuje/.test(r.out), r);
  r = await obal(['--web', 'https://engscalc.netlify.app', '--export', fExport]);
  test('obal: ostrý web → kód 2 bez dotazu na heslo', r.kod === 2 && /OSTRÝ/.test(r.out) && !/Heslo/.test(r.out), r);
  r = await obal(['--web', web, '--export', fCizi]);
  test('obal: export s cizí zakázkou → kód 2, vypíše ji, bez přihlášení', r.kod === 2 && /2026 - OPR - CN - 0500/.test(r.out) && !/Heslo/.test(r.out), r);
  r = await obal(['--web', web, '--zaloha', fZaloha], [ADMIN_EMAIL, HESLO_ADMIN]);
  test('obal: náhled ze zálohy .json.gz → kód 0, vybrány 4 TEST, nic nezapsáno', r.kod === 0 && /vybráno 4 TEST/.test(r.out) && /NÁHLED/.test(r.out) && !naServeru().length, r);
  test('obal: heslo není ve výstupu (bez ozvěny)', !r.out.includes(HESLO_ADMIN), r.out);
  r = await obal(['--web', web, '--export', fExport, '--zapsat'], [ADMIN_EMAIL, HESLO_ADMIN, 'OBNOVIT']);
  test('obal: --zapsat s OBNOVIT → kód 0, 4 založeny', r.kod === 0 && naServeru().length === 4 && /založeno 4/.test(r.out), r);
  r = await obal(['--web', web, '--export', fExport, '--zapsat'], [ADMIN_EMAIL, HESLO_ADMIN, 'OBNOVIT']);
  test('obal: druhé spuštění → vše přeskočeno, kód 0', r.kod === 0 && /Založí se 0, přeskočí 4/.test(r.out), r);
  /* B1 (revize Fable 12. 11.): heslo v SKUTEČNÉM terminálu. Mimo terminál
   * (roura) readline nic neopakuje, proto se obal pustí v pseudo-terminálu
   * přes `script` (util-linux). Heslo se píše až po výzvě „Heslo: ". */
  const { execFileSync } = await import('node:child_process');
  let maScript = false; try { execFileSync('script', ['--version'], { stdio: 'ignore' }); maScript = true; } catch (e) { /* bez script */ }
  if (!maScript) console.log('PŘESKOČENO terminál: chybí program script (util-linux)');
  else {
    const vTerminalu = (args, radky) => new Promise((hotovo) => {
      const prikaz = [process.execPath, R + 'nastroje/test_sada_obnov.mjs', ...args].map(a => "'" + a.replace(/'/g, "'\\''") + "'").join(' ');
      const p = spawn('script', ['-qfec', prikaz, '/dev/null'], { stdio: ['pipe', 'pipe', 'pipe'] });
      let out = ''; p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
      const fronta = (radky || []).slice(); let otazek = 0;
      const hlidej = setInterval(() => { const n = (out.match(/(E-mail administrátora|Heslo: |Napište OBNOVIT)/g) || []).length;
        while (otazek < n) { otazek++; setTimeout(() => { if (fronta.length) p.stdin.write(fronta.shift() + '\r'); }, 150); } }, 30);
      const stop = setTimeout(() => p.kill('SIGKILL'), 30000);
      p.on('close', (kod) => { clearInterval(hlidej); clearTimeout(stop); hotovo({ kod, out }); });
    });
    pamet.clear(); await pripravDatabazi();
    const rt = await vTerminalu(['--web', web, '--export', fExport], [ADMIN_EMAIL, HESLO_ADMIN]);
    test('B1: v terminálu se heslo nezobrazí (ani po znacích)', /NÁHLED/.test(rt.out) && !rt.out.includes(HESLO_ADMIN)
      && !rt.out.includes(HESLO_ADMIN.slice(0, 6)), rt.out.slice(-1500));
    test('B1: e-mail se v terminálu zobrazí (readline po hesle funguje)', rt.out.includes(ADMIN_EMAIL), rt.out.slice(-800));
    pamet.clear(); await pripravDatabazi();
    const rz = await vTerminalu(['--web', web, '--export', fExport, '--zapsat'], [ADMIN_EMAIL, HESLO_ADMIN, 'OBNOVIT']);
    test('B1: v terminálu i zápis (OBNOVIT po hesle) → 4 založeny, heslo nikde', /založeno 4/.test(rz.out) && naServeru().length === 4
      && !rz.out.includes(HESLO_ADMIN.slice(0, 6)), rz.out.slice(-800));
    /* Stejný vzor měl nastroje/migrace_znacky.mjs (jen náhled — bez --zapsat nic nezapíše). */
    const vTerminaluSkript = (skript, args, radky) => { const puv = R + 'nastroje/test_sada_obnov.mjs';
      return new Promise((hotovo) => {
        const prikaz = [process.execPath, R + skript, ...args].map(a => "'" + a.replace(/'/g, "'\\''") + "'").join(' ');
        const p = spawn('script', ['-qfec', prikaz, '/dev/null'], { stdio: ['pipe', 'pipe', 'pipe'] });
        let out = ''; p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
        const fronta = (radky || []).slice(); let otazek = 0;
        const hlidej = setInterval(() => { const n = (out.match(/(E-mail administrátora|Heslo: )/g) || []).length;
          while (otazek < n) { otazek++; setTimeout(() => { if (fronta.length) p.stdin.write(fronta.shift() + '\r'); }, 150); } }, 30);
        const stop = setTimeout(() => p.kill('SIGKILL'), 30000);
        p.on('close', (kod) => { clearInterval(hlidej); clearTimeout(stop); hotovo({ kod, out, puv }); });
      }); };
    const rm = await vTerminaluSkript('nastroje/migrace_znacky.mjs', ['--web', web], [ADMIN_EMAIL, HESLO_ADMIN]);
    test('B1: migrace_znacky.mjs v terminálu heslo nezobrazí a doběhne náhledem', /Přihlášen jako/.test(rm.out)
      && !rm.out.includes(HESLO_ADMIN.slice(0, 6)), rm.out.slice(-800));
  }
  srv.close(); rmSync(slozka, { recursive: true, force: true }); }

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
