/* ============================================================
 * P1 — STAV DEALU PIPEDRIVE U ZAKÁZKY (rozhodnutí J. V. 22. 10. 2026)
 * Podklad: podklady/PIPEDRIVE_STAV_DEALU_22_10.md
 *
 * Hlídá serverovou část:
 *   1. /api/pd/stav?soubor=… — přihlášení a původ, vidí VŠICHNI (bez práva
 *      crm.pipedrive), deal id bere server z uložené zakázky, ven jde jen
 *      { status, nacteno } ze whitelistu, cache, strop;
 *   2. chyba API, deal nenalezen, neznámý stav, nenastavené napojení →
 *      poslední známý stav (smazaný deal zůstane „deleted");
 *   3. uložení zakázky: tvar pdStav (objekt / cizí typ → 400, ne 500),
 *      obsah dosazuje server (podvrh z prohlížeče se neuloží), změna dealu
 *      stav odebere; čtení zakázky stav připojí;
 *   4. do Pipedrive se nic nezapisuje (jen GET).
 * Pipedrive je nahrazený náhradním `fetch` — žádné volání ven.
 * Spuštění: node netlify/test_pd_stav.mjs
 * ============================================================ */
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
const { default: uzivatele } = await import('./functions/uzivatele.mjs');
const { default: pdStavFn } = await import('./functions/pd_stav.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const PD = await import('./lib/pipedrive.mjs');
const PS = await import('./lib/pd_stav.mjs');
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
Object.assign(globalThis, require('../src/format.js'), require('../src/engine.js'), require('../src/engine_proj.js'),
  require('../src/techspec.js'), require('../src/sleva.js'), require('../src/zaokrouhleni.js'), require('../src/zamek.js'));
const zk = require('../src/zakazka.js');
const ZC = require('../src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie, hlavicky = {}) =>
  fn(new Request(url, { headers: { ...(cookie ? { cookie } : {}), ...hlavicky } }));
const kopie = x => JSON.parse(JSON.stringify(x));
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h }))
  .headers.get('set-cookie') || '').split(';')[0];
const nacti = async (soubor, c) => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), c)).json()).zakazka;
const uloz = async (zak, razitko, c) => { const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: razitko }, c);
  return { status: r.status, ...(await r.json().catch(() => ({}))) }; };
const stav = async (soubor, c, hlavicky) => { const r = await get(pdStavFn, 'http://x/api/pd/stav?soubor=' + encodeURIComponent(soubor), c, hlavicky);
  return { status: r.status, telo: await r.json().catch(() => ({})) }; };
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/* ---------- náhradní Pipedrive ---------- */
let volani = [];
const DEALY = { 4711: { status: 'won' }, 4712: { status: 'open' } };
/* P2 (převzato z claude/eager-carson-1xznt2, 23. 10. 2026): deal v koši —
 * detail v2 vrátí 404, seznam `status=deleted&ids=<id>` ho najde. */
const KOS = new Set();
let ciziVKosi = false;   // seznam smazaných vrátí jen cizí deal (9999)
let rezim = 'ok';   // ok | chyba500 | sit
let zpozdeniPd = 0;   // K7-S6: zpoždění odpovědi Pipedrive (ms)
globalThis.fetch = async (url, init) => {
  volani.push({ url: String(url), metoda: (init && init.method) || 'GET' });
  if (zpozdeniPd) await new Promise(r => setTimeout(r, zpozdeniPd));
  if (rezim === 'sit') throw new Error('ECONNRESET');
  if (rezim === 'chyba500') return new Response('{"success":false}', { status: 500 });
  const u = new URL(String(url));
  const md = /^\/api\/v2\/deals\/(\d+)$/.exec(u.pathname);
  if (u.pathname === '/api/v2/deals' && u.searchParams.get('status') === 'deleted') {
    const ids = String(u.searchParams.get('ids') || '').split(',').map(Number);
    return new Response(JSON.stringify({ success: true, data: (ciziVKosi ? [9999] : ids.filter(i => KOS.has(i)))
      .map(i => ({ id: i, title: 'CN-' + i + ' Zkušební', status: 'lost', is_deleted: true })) }),
      { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (md && DEALY[md[1]]) return new Response(JSON.stringify({ success: true,
    data: Object.assign({ id: Number(md[1]), title: 'CN-' + md[1] + ' Zkušební', value: 123 }, DEALY[md[1]]) }),
    { status: 200, headers: { 'Content-Type': 'application/json' } });
  return new Response('{"success":false,"error":"Deal not found"}', { status: 404 });
};
process.env[PD.PD_TOKEN_PROMENNA] = 'zkusebni-token-jen-pro-test';
process.env[PD.PD_DOMENA_PROMENNA] = 'zkusebni-firma';

/* ---------- účty a zakázky ---------- */
const cA = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 0.3, stropy: {} }, poznamka: 'x' }, cA);
for (const [e, j, r] of [['obch@priklad.cz', 'Obch Test', 'Obchodník'], ['ved@priklad.cz', 'Ved Test', 'Vedoucí']])
  await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: e, jmeno: j, role: r, heslo: 'Heslo12345x' }, cA);
const cO = await login('obch@priklad.cz', 'Heslo12345x'), cV = await login('ved@priklad.cz', 'Heslo12345x');
test('příprava: tři přihlášené účty', !!(cA && cO && cV));

const zalozit = async (cislo, dealId) => {
  const z = zk.novaZakazka(); z.cislo = cislo; z.nazevAkce = 'Stav Pipedrive';
  Object.assign(z.varianty[0].data.cenik, ZC.zkusebniCenik());
  if (dealId) z.pdDealId = dealId;
  const r = await uloz(z, undefined, cA);
  return r.soubor;
};
const sDeal = await zalozit('2026 - OPR - CN - 0961', '4711');
const sBez = await zalozit('2026 - OPR - CN - 0962', '');
const sSmaz = await zalozit('2026 - OPR - CN - 0963', '4713');
const sKos = await zalozit('2026 - OPR - CN - 0964', '4714');
const sZmiz = await zalozit('2026 - OPR - CN - 0965', '4715');
test('příprava: zakázky uložené', !!(sDeal && sBez && sSmaz && sKos && sZmiz), [sDeal, sBez, sSmaz, sKos, sZmiz]);

console.log('\n===== 1) PŘÍSTUP =====\n');
test('nepřihlášený → 401', (await stav(sDeal)).status === 401);
volani = [];
const cizi = await stav(sDeal, cA, { origin: 'https://utocnik.example', host: 'kalkulator.example' });
test('cizí původ → 403 a do Pipedrive se nešlo', cizi.status === 403 && volani.length === 0, cizi);
test('neplatné jméno souboru → 400', (await stav('../z/x', cO)).status === 400 && (await stav('', cO)).status === 400);
test('neexistující zakázka → 404', (await stav('neni-takova.json', cO)).status === 404);
/* Vidí ho všichni — i obchodník, kterému administrátor čtení CRM odebral. */
pamet.set('program/zobrazeni', JSON.stringify({ matice: { 'crm.pipedrive': { 'Obchodník': false, 'Vedoucí': false } } }));
volani = [];
const o1 = await stav(sDeal, cO);
test('obchodník bez práva crm.pipedrive stav čte → 200', o1.status === 200 && o1.telo.ok === true, o1);
test('stav = won, čas načtení ISO', o1.telo.pdStav && o1.telo.pdStav.status === 'won' && ISO.test(o1.telo.pdStav.nacteno), o1.telo);
test('ven jde jen { ok, nastaveno, pdStav: { status, nacteno } }',
  JSON.stringify(Object.keys(o1.telo).sort()) === '["nastaveno","ok","pdStav"]'
  && JSON.stringify(Object.keys(o1.telo.pdStav).sort()) === '["nacteno","status"]', o1.telo);
/* K7-W15 (#507): čas načtení (`nacteno`, ISO s milisekundami) smí obsahovat
 * „123" — hledá se jen mimo něj, jinak test náhodně padal (…T01:52:46.123Z). */
const unik = (telo) => /zkusebni-token|123|Zkušební/.test(JSON.stringify(Object.assign({}, telo,
  { pdStav: Object.assign({}, telo && telo.pdStav, { nacteno: '' }) })));
test('K7-W15: čas načtení s „123" se za únik nepovažuje, hodnota dealu ano',
  !unik({ ok: true, nastaveno: true, pdStav: { status: 'won', nacteno: '2026-10-23T01:52:46.123Z' } })
  && unik({ ok: true, nastaveno: true, pdStav: { status: 'won', nacteno: '', hodnota: 123 } }));
test('token ani hodnota dealu v odpovědi nejsou', !unik(o1.telo), o1.telo);
test('do Pipedrive jeden GET na deal ze zakázky (4711)', volani.length === 1 && /\/api\/v2\/deals\/4711$/.test(new URL(volani[0].url).pathname)
  && volani[0].metoda === 'GET', volani);
const v1 = await stav(sDeal, cV);
test('vedoucí bez práva stav čte → 200', v1.status === 200 && v1.telo.pdStav.status === 'won', v1);
pamet.delete('program/zobrazeni');

console.log('\n===== 2) CACHE, CHYBY, POSLEDNÍ ZNÁMÝ STAV =====\n');
volani = [];
const c2 = await stav(sDeal, cO);
test('do 10 minut se z Pipedrive znovu nečte (cache)', volani.length === 0 && c2.telo.pdStav.nacteno === o1.telo.pdStav.nacteno, volani);
const zastarej = (id) => { const k = 'pd_stav/deal:' + id; const x = JSON.parse(pamet.get(k)); x.nacteno = '2026-01-01T00:00:00.000Z'; pamet.set(k, JSON.stringify(x)); };
zastarej(4711); DEALY[4711].status = 'lost'; volani = [];
const c3 = await stav(sDeal, cO);
test('po vypršení se načte nový stav (lost)', volani.length === 1 && c3.telo.pdStav.status === 'lost' && c3.telo.pdStav.nacteno !== '2026-01-01T00:00:00.000Z', c3.telo);
for (const [n, r] of [['výpadek API (500)', 'chyba500'], ['síť selhala', 'sit']]) {
  zastarej(4711); rezim = r;
  const x = await stav(sDeal, cO);
  test(n + ' → 200 a poslední známý stav (lost) beze slova', x.status === 200 && x.telo.ok === true && x.telo.pdStav.status === 'lost' && !x.telo.chyba, x);
}
rezim = 'ok';
zastarej(4711); DEALY[4711].status = 'hacked<script>';
const c4 = await stav(sDeal, cO);
test('stav mimo whitelist se nepřevezme (zůstane lost)', c4.telo.pdStav.status === 'lost', c4.telo);
DEALY[4711].status = 'won';
/* Smazaný deal: API v2 nese is_deleted; po 30 dnech ho Pipedrive nevrátí (404). */
DEALY[4713] = { status: 'lost', is_deleted: true };
const s1 = await stav(sSmaz, cO);
test('smazaný deal (is_deleted) → deleted', s1.telo.pdStav && s1.telo.pdStav.status === 'deleted', s1.telo);
delete DEALY[4713]; zastarej(4713);
const s2 = await stav(sSmaz, cO);
test('deal po 30 dnech v API není (404) → zůstane deleted', s2.status === 200 && s2.telo.pdStav.status === 'deleted', s2);
/* P2 (oprava z claude/eager-carson-1xznt2): detail smazaného dealu v koši
 * vrátí 404 → dotaz na seznam smazaných (status=deleted&ids=<id>) ho najde.
 * Před převodem: stav null, jen 1 volání (FAIL). */
KOS.add(4714); volani = [];
const k1 = await stav(sKos, cO);
const k1u = volani.map(v => new URL(v.url));
test('P2: detail 404 → seznam smazaných (status=deleted&ids=4714) → deleted',
  k1.status === 200 && k1.telo.pdStav && k1.telo.pdStav.status === 'deleted' && ISO.test(k1.telo.pdStav.nacteno)
  && volani.length === 2 && k1u[1].pathname === '/api/v2/deals' && k1u[1].searchParams.get('status') === 'deleted'
  && k1u[1].searchParams.get('ids') === '4714' && volani.every(v => v.metoda === 'GET'), { telo: k1.telo, volani });
/* Deal odstraněný úplně (ani v koši): zůstane poslední známý stav a další
 * dotaz do 10 minut do Pipedrive nejde (bez toho každé otevření = 11 tokenů). */
DEALY[4715] = { status: 'won' };
const z0 = await stav(sZmiz, cO);
delete DEALY[4715]; zastarej(4715); volani = [];
const z2 = await stav(sZmiz, cO);
test('P2: deal zmizel i z koše → poslední známý stav (won), ptalo se detailem i seznamem',
  z0.telo.pdStav && z0.telo.pdStav.status === 'won' && z2.status === 200 && z2.telo.pdStav && z2.telo.pdStav.status === 'won'
  && volani.length === 2, { z2: z2.telo, volani: volani.length });
/* Odpověď seznamu s cizím smazaným dealem zakázku za smazanou neoznačí. */
pamet.delete('pd_stav/overeno:4715'); zastarej(4715); ciziVKosi = true;
const z2b = await stav(sZmiz, cO);
ciziVKosi = false;
test('P2: cizí deal v seznamu smazaných stav nezmění (zůstane won)', z2b.telo.pdStav && z2b.telo.pdStav.status === 'won', z2b.telo);
volani = [];
const z3 = await stav(sZmiz, cO);
test('P2: … další dotaz do 10 minut už do Pipedrive nejde', z3.telo.pdStav && z3.telo.pdStav.status === 'won' && volani.length === 0, volani);
test('P2: záznam stavu zůstal v čistém tvaru { status, nacteno }',
  JSON.stringify(Object.keys(JSON.parse(pamet.get('pd_stav/deal:4715'))).sort()) === '["nacteno","status"]');
volani = [];
const b1 = await stav(sBez, cO);
test('zakázka bez dealu → pdStav null, do Pipedrive se nejde', b1.status === 200 && b1.telo.pdStav === null && volani.length === 0, b1);
/* Napojení nenastavené: nic se nehlásí, ukáže se poslední známý stav. */
const tok = process.env[PD.PD_TOKEN_PROMENNA]; delete process.env[PD.PD_TOKEN_PROMENNA];
zastarej(4711); volani = [];
const n1 = await stav(sDeal, cO);
test('Pipedrive nenastaven → nastaveno:false, poslední známý stav, bez chyby a bez volání',
  n1.status === 200 && n1.telo.nastaveno === false && n1.telo.pdStav.status === 'lost' && !n1.telo.chyba && volani.length === 0, n1);
process.env[PD.PD_TOKEN_PROMENNA] = tok;
/* Strop čerstvých dotazů: nad ním se nečte, vrátí se poslední známý stav. */
pamet.set('pd_cache/strop:stav:obch@priklad.cz', JSON.stringify({ od: Date.now(), pocet: PS.PD_STAV_MAX }));
zastarej(4711); volani = [];
const st1 = await stav(sDeal, cO);
test('nad stropem se do Pipedrive nejde, stav zůstane', volani.length === 0 && st1.telo.pdStav.status === 'lost', st1.telo);
pamet.delete('pd_cache/strop:stav:obch@priklad.cz');
test('strop stavu má vlastní počítadlo (detail dealu se nezapočítal)', !pamet.has('pd_cache/strop:obch@priklad.cz'));
/* K7-S6 (#508, J. V. 23. 10. 2026): souběžné dotazy na zastaralý stav téhož dealu
 * se spojí do jednoho volání Pipedrive. Před opravou 10 volání (FAIL), po ní 1. */
zastarej(4711); volani = []; zpozdeniPd = 30;
const soubezne = await Promise.all(Array.from({ length: 10 }, () => stav(sDeal, cO)));
zpozdeniPd = 0;
test('K7-S6: 10 souběžných dotazů na zastaralý stav = 1 volání Pipedrive, všichni dostanou nový stav',
  volani.length === 1 && soubezne.every(x => x.status === 200 && x.telo.pdStav && x.telo.pdStav.status === 'won'
    && x.telo.pdStav.nacteno === soubezne[0].telo.pdStav.nacteno), { volani: volani.length, st: soubezne.map(x => x.telo.pdStav && x.telo.pdStav.status) });
DEALY[4711].status = 'lost'; zastarej(4711); await stav(sDeal, cO);   // zpět na „lost" pro další bloky

console.log('\n===== 3) ZAKÁZKA: ČTENÍ A ULOŽENÍ =====\n');
let g = await nacti(sDeal, cO);
test('čtení zakázky připojí poslední známý stav', g.pdStav && g.pdStav.status === 'lost', g.pdStav);
const spatne = [['řetězec', 'won'], ['pole', ['won']], ['číslo', 7], ['objekt s cizím polem', { status: 'won', nacteno: '2026-10-22T08:00:00.000Z', x: 1 }],
  ['stav mimo whitelist', { status: 'vyhrano', nacteno: '2026-10-22T08:00:00.000Z' }],
  ['nacteno není ISO', { status: 'won', nacteno: '22. 10. 2026' }],
  ['status jako objekt ({"toString":1})', { status: { toString: 1 }, nacteno: '2026-10-22T08:00:00.000Z' }],
  ['nacteno jako objekt', { status: 'won', nacteno: { toString: 1 } }]];
for (const [n, hodnota] of spatne) {
  const a = kopie(g); a.pdStav = hodnota; a.nazevAkce = 'změna ' + n;
  const r = await uloz(a, g.uloRazitko, cO).catch(e => ({ status: 500, chyba: e.message }));
  test('pdStav ' + n + ' → 400 (ne 500)', r.status === 400 && /Stav Pipedrive/.test(r.chyba || ''), r);
}
/* Podvrh v platném tvaru: server dosadí stav z úložiště, ne z prohlížeče. */
const a1 = kopie(g); a1.pdStav = { status: 'won', nacteno: '2026-10-22T08:00:00.000Z' }; a1.nazevAkce = 'podvrh stavu';
const r1 = await uloz(a1, g.uloRazitko, cO);
g = await nacti(sDeal, cO);
const ulozena = JSON.parse(pamet.get('zakazky/z/' + sDeal));
test('obchodník uložil zakázku s pdStav v platném tvaru', r1.status === 200, r1);
test('uložený stav je serverový (lost), ne podvrh (won)', ulozena.pdStav && ulozena.pdStav.status === 'lost'
  && ulozena.pdStav.nacteno !== '2026-10-22T08:00:00.000Z', ulozena.pdStav);
/* Bez záznamu v úložišti platí uložená verze (deal se nezměnil). */
pamet.delete('pd_stav/deal:4711');
const a2 = kopie(g); a2.pdStav = { status: 'won', nacteno: '2026-10-22T08:00:00.000Z' }; a2.nazevAkce = 'bez záznamu';
const r2 = await uloz(a2, g.uloRazitko, cO);
const ulozena2 = JSON.parse(pamet.get('zakazky/z/' + sDeal));
test('bez záznamu v úložišti zůstane stav uložené verze (lost)', r2.status === 200 && ulozena2.pdStav && ulozena2.pdStav.status === 'lost', ulozena2.pdStav);
/* /api/pd/stav bez záznamu v úložišti a s výpadkem API vrátí stav zakázky. */
rezim = 'chyba500';
const z1 = await stav(sDeal, cO);
test('stav bez záznamu v úložišti a s výpadkem → stav uložené zakázky', z1.telo.pdStav && z1.telo.pdStav.status === 'lost', z1.telo);
rezim = 'ok';
/* Zakázka bez dealu: podvrh stavu se neuloží vůbec. */
let gb = await nacti(sBez, cO);
const b2 = kopie(gb); b2.pdStav = { status: 'won', nacteno: '2026-10-22T08:00:00.000Z' };
const rb = await uloz(b2, gb.uloRazitko, cO);
test('zakázka bez dealu: pdStav z prohlížeče se neuloží', rb.status === 200 && JSON.parse(pamet.get('zakazky/z/' + sBez)).pdStav === undefined, rb);
/* Administrátor deal změní → starý stav k zakázce nepatří. */
g = await nacti(sDeal, cA);
const a3 = kopie(g); a3.pdDealId = '4712';
const r3 = await uloz(a3, g.uloRazitko, cA);
test('změna dealu (administrátor) stav odebere', r3.status === 200 && JSON.parse(pamet.get('zakazky/z/' + sDeal)).pdStav === undefined, r3);
const r4 = await stav(sDeal, cO);
test('… a další otevření načte stav nového dealu (open)', r4.telo.pdStav && r4.telo.pdStav.status === 'open', r4.telo);
test('do Pipedrive jen GET, žádný zápis', volani.every(v => v.metoda === 'GET'), volani);

/* Kopie zakázky (nová ze staré) stav nepřebírá — patří dealu. */
const kop = zk.zakazkaDuplikuj(Object.assign(kopie(g), { pdStav: { status: 'won', nacteno: '2026-10-22T08:00:00.000Z' } }), 'CN-NOVA');
test('nová zakázka z kopie nenese pdStav ani deal', kop.pdStav === undefined && kop.pdDealId === undefined, kop.pdStav);

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
