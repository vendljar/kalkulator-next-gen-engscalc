/* Červená lišta „Ceník není nahraný" až po ověření (S5, v15.10.4).
 *
 * Zadání J. V. 15. 10. 2026: „pozdrž zobrazení červené lišty při načtení
 * aplikace o pár vteřin. Dnes se zobrazuje hned a teprve po ověření zmizí.
 * … zobrazit ji až tehdy, když ceník skutečně není nahraný."
 *
 * Sestavená aplikace běží přes lokální http server (online vrstva se probouzí
 * jen nad http/https); /api/* obsluhují OPRAVDOVÉ funkce z netlify/functions
 * s pamětovým úložištěm (jako overit_online.mjs). Zkušební ceník a zkušební
 * firmu zveřejní administrátor přímo serverovou funkcí; prohlížeč startuje
 * s živou relací (jako po F5). Odpověď na GET /api/program harness zdrží,
 * nechá selhat, nebo ji nechá viset.
 *
 * Stránka si od prvního okamžiku sama vzorkuje (addInitScript, à 50 ms):
 * jestli lišta svítí, jestli je ceník prázdný a jestli platí zábrana
 * dokumentu. Měří se tedy přímo v prohlížeči, ne odhadem z Node.
 *
 *  A) ceník přijde za 2 s  → lišta se neukáže vůbec, ceník je nasazený,
 *     a dokud byl prázdný, zábrana dokumentu i varování do tisku platily,
 *  B) /api/program selže za 1,5 s → do té doby nic, pak lišta (dřív než 5 s),
 *  C) /api/program visí → do 4,8 s nic, po 5 s lišta,
 *  D) bez přihlášení → lišta hned po zjištění, že relace není (jako dosud),
 *  E) ze souboru (file://) → lišta hned jako dosud (online se nic nenačítá).
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_lista_cekani.mjs
 */
process.env.TAJEMSTVI_RELACE = 'zkusebni-tajemstvi-jen-pro-harness';
process.env.ADMIN_INIT_HESLO = 'Zkusebni.Heslo.123';
if (!process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) {
    return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
      .map(x => x.slice(nazev.length + 1));
  },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const KOREN = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);

/* Funkce se importují AŽ po nastavení prostředí výš (ADMIN_EMAIL se čte při
 * načtení modulu). */
const fn = async (j) => (await import('./netlify/functions/' + j + '.mjs')).default;
const FUNKCE = {
  '/api/zdravi': await fn('zdravi'), '/api/ja': await fn('ja'),
  '/api/prihlaseni': await fn('prihlaseni'), '/api/odhlaseni': await fn('odhlaseni'),
  '/api/program': await fn('program'), '/api/zakazky': await fn('zakazky'),
  '/api/firma': await fn('firma'), '/api/zobrazeni': await fn('zobrazeni'),
  '/api/popisy': await fn('popisy'), '/api/zakaznici': await fn('zakaznici'),
  '/api/sablony': await fn('sablony'), '/api/analytika': await fn('analytika'),
  '/api/slovnik': await fn('slovnik'), '/api/uzivatele': await fn('uzivatele'),
  '/api/zaloha': await fn('zaloha'),
};

let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_lista_cekani.mjs');
  process.exit(2);
}

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* ---- příprava: administrátor zveřejní zkušební ceník a zkušební firmu ---- */
const ZKC = require('./src/zkusebni_cenik.js');
const FM = require('./src/firma.js');
const EMAIL = process.env.ADMIN_EMAIL;
const rA = await FUNKCE['/api/prihlaseni'](new Request('http://x/api/prihlaseni', { method: 'POST',
  body: JSON.stringify({ email: EMAIL, heslo: 'Zkusebni.Heslo.123' }) }));
const COOKIE = (rA.headers.get('set-cookie') || '').split(';')[0];
test('příprava: administrátor přihlášen', rA.status === 200 && !!COOKIE, rA.status);
/* Zkušební ceník nese značku ukázkových dat (do sestavení nevede); tady má
 * hrát roli ZVEŘEJNĚNÉHO ostrého ceníku, jinak by lišta po načtení správně
 * hlásila „ceny jsou ukázkové" a scénář A by nic neměřil. */
const bezZnacky = (c) => { delete c.ukazkove; delete c.prazdny; return c; };
const rp = await (await FUNKCE['/api/program'](new Request('http://x/api/program', { method: 'POST',
  headers: { cookie: COOKIE },
  body: JSON.stringify({ cenik: bezZnacky(ZKC.zkusebniCenik()), cenikProj: bezZnacky(ZKC.zkusebniCenikProj()),
    /* smyšlené stropy (jako overit_cenik_prava.mjs) — bez nich zůstane
     * ukázková slevová politika a lišta by svítila oprávněně */
    slevy: { minMarze: 0.10, maxGlobalni: 1, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15, 'Administrátor': 1 } },
    poznamka: 'S5 zkušební ceník (harness)' }) }))).json();
test('příprava: zkušební ceník zveřejněn', rp.ok === true, JSON.stringify(rp).slice(0, 200));
const firma = FM.firmaDefault(); delete firma.ukazkove;
Object.assign(firma, { nazev: 'Zkušební ocelárna s.r.o.', ico: '12345678', sidloUlice: 'Zkušební 1',
  sidloPsc: '110 00', sidloMesto: 'Praha' });
const rf = await (await FUNKCE['/api/firma'](new Request('http://x/api/firma', { method: 'POST',
  headers: { cookie: COOKIE }, body: JSON.stringify({ udaje: firma }) }))).json();
test('příprava: zkušební firma zveřejněna', rf.ok === true, JSON.stringify(rf).slice(0, 200));

/* ---- http server jen pro stránku (API řeší route) ---- */
const HTML = readFileSync(KOREN + 'dist/kalkulacka.html');
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ADRESA = 'http://127.0.0.1:' + server.address().port + '/';

const prohlizec = await chromium.launch({ args: ['--no-sandbox'] });
const { hlidejHarness } = require('./nastroje/harness_hlidac.js');
hlidejHarness({ uklid: async () => { await prohlizec.close(); server.close(); } });

/* Vzorkování uvnitř stránky — běží od prvního okamžiku (před skripty aplikace).
 * Vzorek: [ms od začátku navigace, lišta svítí, ceník prázdný, zábrana
 * dokumentu, varování do tisku]. */
const VZORKOVANI = () => {
  window.__vzorky = [];
  setInterval(() => {
    const el = document.getElementById('ukazkoveLista');
    let prazdny = null, zabrana = null, tisk = null;
    try {
      prazdny = !!ukazkoveStavAkt().prazdne;
      zabrana = dokumentZabrana() !== '';
      tisk = ukazkoveTiskLista() !== '';
    } catch (e) { /* aplikace ještě nenaběhla */ }
    window.__vzorky.push([Math.round(performance.now()), !!(el && el.innerHTML.trim()), prazdny, zabrana, tisk]);
  }, 50);
};

/* program: 'ok' | 'chyba' | 'visi'; zpozdeni v ms pro GET /api/program. */
async function scenar({ prihlasen, program, zpozdeni, kolik, soubor }) {
  const ctx = await prohlizec.newContext();
  const page = await ctx.newPage();
  const chyby = [];
  page.on('pageerror', e => chyby.push('pageerror: ' + e.message));
  await page.addInitScript(VZORKOVANI);
  const casovace = [];
  await page.route('**/api/**', async route => {
    const r = route.request();
    const url = new URL(r.url());
    const f = FUNKCE[url.pathname];
    if (!f) return route.fulfill({ status: 404, body: '{"ok":false}' });
    if (url.pathname === '/api/program' && r.method() === 'GET' && program !== 'ok-hned') {
      await new Promise(res => casovace.push(setTimeout(res, zpozdeni)));
      if (program === 'chyba')
        return route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false,"chyba":"zkušební výpadek"}' })
          .catch(() => {});
    }
    const init = { method: r.method(), headers: { cookie: prihlasen ? COOKIE : '' } };
    if (r.method() === 'POST') init.body = r.postData() || '';
    const odp = await f(new Request(r.url(), init));
    await route.fulfill({ status: odp.status, contentType: 'application/json; charset=utf-8',
      body: await odp.text() }).catch(() => {});
  });
  await page.goto(soubor ? new URL('dist/kalkulacka.html', import.meta.url).href : ADRESA);
  await page.waitForTimeout(kolik);
  const v = await page.evaluate(() => ({
    vzorky: window.__vzorky,
    cenikPouzit: typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.cenikPouzit,
    lista: document.getElementById('ukazkoveLista').innerHTML,
    kde: (ukazkoveStavAkt().kde || []).join(', '),
  }));
  casovace.forEach(clearTimeout);
  await ctx.close();
  v.chyby = chyby;
  /* jen vzorky, kdy už aplikace běžela */
  v.bezi = v.vzorky.filter(x => x[2] !== null);
  v.prvniLista = (v.bezi.find(x => x[1]) || [null])[0];
  return v;
}

/* ---------- A) ceník přijde za 2 s ---------- */
{
  const v = await scenar({ prihlasen: true, program: 'ok', zpozdeni: 2000, kolik: 6500 });
  test('A: aplikace naběhla a vzorkovala', v.bezi.length > 20, v.bezi.length);
  test('A: lišta se za celou dobu neukázala ani na okamžik', v.prvniLista === null,
    { prvniLista: v.prvniLista });
  test('A: platný ceník z online databáze se nasadil', v.cenikPouzit === true);
  test('A: lišta na konci prázdná', v.lista.trim() === '', v.kde + ' / ' + v.lista.slice(0, 120));
  const behemPrazdna = v.bezi.filter(x => x[2]);
  test('A: aplikace nějakou dobu běžela nad prázdným ceníkem (čekání se opravdu měřilo)',
    behemPrazdna.length > 5, behemPrazdna.length);
  test('A: po celou dobu prázdného ceníku platila zábrana dokumentu i varování do tisku',
    behemPrazdna.every(x => x[3] === true && x[4] === true),
    behemPrazdna.filter(x => !(x[3] && x[4])).slice(0, 3));
  test('A: bez chyb stránky', v.chyby.length === 0, v.chyby);
}

/* ---------- B) /api/program selže za 1,5 s ---------- */
{
  const v = await scenar({ prihlasen: true, program: 'chyba', zpozdeni: 1500, kolik: 4500 });
  test('B: před selháním (do 1,4 s) lišta nesvítí',
    v.bezi.filter(x => x[0] < 1400).every(x => !x[1]), v.prvniLista);
  test('B: po selhání se lišta ukáže, dřív než uplyne 5 s',
    v.prvniLista !== null && v.prvniLista >= 1400 && v.prvniLista < 4500, v.prvniLista);
  test('B: a mluví o nenahraném ceníku', /není nahraný|nuly/i.test(v.lista), v.lista.slice(0, 160));
  test('B: zábrana dokumentu platila po celou dobu (i během čekání)',
    v.bezi.filter(x => x[2]).every(x => x[3] === true && x[4] === true));
  test('B: bez chyb stránky', v.chyby.length === 0, v.chyby);
}

/* ---------- C) /api/program visí ---------- */
{
  const v = await scenar({ prihlasen: true, program: 'visi', zpozdeni: 30000, kolik: 6300 });
  test('C: do 4,8 s lišta nesvítí (čeká se na ověření)',
    v.bezi.filter(x => x[0] < 4800).every(x => !x[1]), v.prvniLista);
  test('C: po 5 s se lišta ukáže sama', v.prvniLista !== null && v.prvniLista < 6300, v.prvniLista);
  test('C: zábrana dokumentu platila i během čekání',
    v.bezi.filter(x => x[2] && !x[1]).length > 10
    && v.bezi.filter(x => x[2]).every(x => x[3] === true && x[4] === true));
  test('C: bez chyb stránky', v.chyby.length === 0, v.chyby);
}

/* ---------- D) bez přihlášení ---------- */
{
  const v = await scenar({ prihlasen: false, program: 'ok-hned', zpozdeni: 0, kolik: 2500 });
  test('D: bez přihlášení se lišta ukáže hned po zjištění (do 2 s), ne až po 5 s',
    v.prvniLista !== null && v.prvniLista < 2000, v.prvniLista);
  test('D: bez chyb stránky', v.chyby.length === 0, v.chyby);
}

/* ---------- E) ze souboru (file://) ---------- */
{
  const v = await scenar({ soubor: true, prihlasen: false, program: 'ok-hned', zpozdeni: 0, kolik: 1500 });
  test('E: nad file:// lišta svítí hned jako dosud (první vzorek běžící aplikace)',
    v.bezi.length > 0 && v.bezi[0][1] === true, v.bezi.slice(0, 2));
  test('E: bez chyb stránky', v.chyby.length === 0, v.chyby);
}

await prohlizec.close();
server.close();
console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
