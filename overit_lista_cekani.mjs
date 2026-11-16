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
 * dokumentu. Měří se tedy přímo v prohlížeči, ne odhadem z Node. Od K43-T1
 * (#587) se čeká na stav aplikace a meze se měří od události ve stránce
 * (odpověď /api/program, začátek ověřování, klik) — viz VZORKOVANI.
 *
 *  A) ceník přijde za 2 s  → lišta se neukáže vůbec, ceník je nasazený,
 *     a dokud byl prázdný, zábrana dokumentu i varování do tisku platily,
 *  B) /api/program selže za 1,5 s → do té doby nic, pak lišta (do 3,5 s od chyby),
 *  C) /api/program visí → do 14,5 s od začátku ověřování nic, po 15 s lišta (PS #558),
 *  D) bez přihlášení → pod přihlašovacím oknem nic, po přihlášení formulářem
 *     taky nic, ceník se nasadí (PS #558; do v3.11.4 lišta hned),
 *  F) studený start (zdraví, ja, ceník po 2 s) → nic (PS #558),
 *  G) bez sítě → pod oknem nic, po „Pokračovat bez přihlášení" lišta hned,
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
 * dokumentu, varování do tisku].
 *
 * K43-T1 (#587, 11. 11. 2026): pod zátěží (souběh s jinými běhy) harness
 * padal 31/1 — čekal PEVNÝ čas od Node (`waitForTimeout(kolik)` po goto,
 * 800/1500 ms ve scénářích D a G) a časové meze měřil od začátku navigace,
 * ne od události, ke které se vážou. Teď si stránka zapisuje i události
 * (vše v čase performance.now() stránky):
 *   __api    — konec odpovědi každého /api/* (cesta, metoda, stav),
 *   __overujeOd — začátek ověřování ceníku po přihlášení (UKAZKOVE_CEKANI.
 *              overujeOd, převedeno z Date.now() na čas stránky; od něj
 *              aplikace odpočítává 15 s, PS #558),
 *   __klik   — okamžik kliknutí (zachycení události v dokumentu).
 * Harness čeká na KONKRÉTNÍ STAV (ceník nasazený, lišta v DOM, přihlášení)
 * a pak už jen na uplynutí času STRÁNKY (dobeh). */
const VZORKOVANI = () => {
  window.__vzorky = [];
  window.__api = [];
  window.__overujeOd = null;
  window.__klik = null;
  const puvodni = window.fetch.bind(window);
  window.fetch = function (vstup, init) {
    const cesta = String((vstup && vstup.url) || vstup);
    const metoda = String((init && init.method) || 'GET').toUpperCase();
    const p = puvodni(vstup, init);
    if (/\/api\//.test(cesta)) {
      const zapis = (stav) => window.__api.push({ cesta: cesta.replace(/^.*?(\/api\/[^?]*).*$/, '$1'), metoda, stav, konec: Math.round(performance.now()) });
      p.then(r => zapis(r.status), () => zapis(0));
    }
    return p;
  };
  document.addEventListener('click', () => { if (window.__klik === null) window.__klik = Math.round(performance.now()); }, true);
  setInterval(() => {
    const el = document.getElementById('ukazkoveLista');
    let prazdny = null, zabrana = null, tisk = null;
    try {
      prazdny = !!ukazkoveStavAkt().prazdne;
      zabrana = dokumentZabrana() !== '';
      tisk = ukazkoveTiskLista() !== '';
    } catch (e) { /* aplikace ještě nenaběhla */ }
    try {
      if (window.__overujeOd === null && typeof UKAZKOVE_CEKANI !== 'undefined' && typeof UKAZKOVE_CEKANI.overujeOd === 'number')
        window.__overujeOd = Math.round(UKAZKOVE_CEKANI.overujeOd - Date.now() + performance.now());
    } catch (e) { /* nic */ }
    window.__vzorky.push([Math.round(performance.now()), !!(el && el.innerHTML.trim()), prazdny, zabrana, tisk]);
  }, 50);
};

/* Podmínky stavu aplikace (běží ve stránce). */
const STAV = {
  cenik: () => typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.cenikPouzit === true,
  lista: () => { const el = document.getElementById('ukazkoveLista'); return !!(el && el.innerHTML.trim()); },
  bezi: () => Array.isArray(window.__vzorky) && window.__vzorky.some(x => x[2] !== null),
  prihlasenCenik: () => typeof ONLINE_STAV !== 'undefined' && !!ONLINE_STAV.ja && ONLINE_STAV.cenikPouzit === true,
};
/* Strop čekání na stav — jen pojistka proti zaseknutí, ne měřená mez
 * (meze se měří z událostí ve stránce). */
const STROP_STAVU = 60000;

/* Počká, až v čase STRÁNKY uplyne `ms` od teď (ne hodiny Node). */
async function dobeh(page, ms) {
  const od = await page.evaluate(() => performance.now());
  await page.waitForFunction((t) => performance.now() >= t, od + ms, { timeout: STROP_STAVU, polling: 50 });
}

/* program: 'ok' | 'chyba' | 'visi'; zpozdeni v ms pro GET /api/program.
 * `cekej` = podmínka stavu (STAV.*), na kterou se po načtení čeká, `pak` =
 * kolik ms času stránky ještě pozorovat po ní. */
async function scenar({ prihlasen, program, zpozdeni, cekej, pak, soubor, cesty, offline, akce }) {
  const ctx = await prohlizec.newContext();
  const page = await ctx.newPage();
  const chyby = [];
  page.on('pageerror', e => chyby.push('pageerror: ' + e.message));
  await page.addInitScript(VZORKOVANI);
  const casovace = [];
  let cookie = prihlasen ? COOKIE : '';
  await page.route('**/api/**', async route => {
    const r = route.request();
    const url = new URL(r.url());
    /* bez sítě (PS #558) */
    if (offline) return route.abort('internetdisconnected').catch(() => {});
    const f = FUNKCE[url.pathname];
    /* zdržení jednotlivých cest — studený start serveru (PS #558) */
    const zc = cesty && cesty[url.pathname];
    if (zc) await new Promise(res => casovace.push(setTimeout(res, zc)));
    if (!f) return route.fulfill({ status: 404, body: '{"ok":false}' });
    if (url.pathname === '/api/program' && r.method() === 'GET' && program !== 'ok-hned') {
      await new Promise(res => casovace.push(setTimeout(res, zpozdeni)));
      if (program === 'chyba')
        return route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false,"chyba":"zkušební výpadek"}' })
          .catch(() => {});
    }
    const init = { method: r.method(), headers: { cookie } };
    if (r.method() === 'POST') init.body = r.postData() || '';
    const odp = await f(new Request(r.url(), init));
    /* přihlášení formulářem v prohlížeči zapíše relaci (PS #558) */
    const sc = odp.headers.get('set-cookie');
    if (sc && url.pathname === '/api/prihlaseni') cookie = sc.split(';')[0];
    await route.fulfill({ status: odp.status, contentType: 'application/json; charset=utf-8',
      body: await odp.text() }).catch(() => {});
  });
  await page.goto(soubor ? new URL('dist/kalkulacka.html', import.meta.url).href : ADRESA);
  await page.waitForFunction(STAV.bezi, null, { timeout: STROP_STAVU, polling: 50 });
  if (akce) await akce(page);
  let dosazeno = true;
  if (cekej) dosazeno = await page.waitForFunction(cekej, null, { timeout: STROP_STAVU, polling: 50 }).then(() => true, () => false);
  if (pak) await dobeh(page, pak);
  const v = await page.evaluate(() => ({
    vzorky: window.__vzorky, api: window.__api, overujeOd: window.__overujeOd, klik: window.__klik,
    cenikPouzit: typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.cenikPouzit,
    lista: document.getElementById('ukazkoveLista').innerHTML,
    kde: (ukazkoveStavAkt().kde || []).join(', '),
    prihlasen: typeof ONLINE_STAV !== 'undefined' && !!ONLINE_STAV.ja,
  }));
  casovace.forEach(clearTimeout);
  await ctx.close();
  v.chyby = chyby;
  v.dosazeno = dosazeno;
  /* jen vzorky, kdy už aplikace běžela */
  v.bezi = v.vzorky.filter(x => x[2] !== null);
  v.prvniLista = (v.bezi.find(x => x[1]) || [null])[0];
  /* Zpoždění startu stránky (první vzorek běžící aplikace) — z něj rezerva
   * časových mezí, kde je čas sám předmětem zkoušky. */
  v.start = v.bezi.length ? v.bezi[0][0] : 0;
  v.rezerva = 1000 + v.start;
  v.program = v.api.find(x => x.cesta === '/api/program' && x.metoda === 'GET') || null;
  return v;
}

/* ---------- A) ceník přijde za 2 s ---------- */
{
  const v = await scenar({ prihlasen: true, program: 'ok', zpozdeni: 2000, cekej: STAV.cenik, pak: 2500 });
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

/* ---------- B) /api/program selže za 1,5 s ----------
 * Meze od okamžiku, kdy stránka dostala chybovou odpověď (__api), ne od
 * začátku navigace. */
{
  const v = await scenar({ prihlasen: true, program: 'chyba', zpozdeni: 1500, cekej: STAV.lista, pak: 300 });
  const t = v.program ? v.program.konec : null;
  test('B: před selháním (do odpovědi 503) lišta nesvítí',
    t !== null && v.program.stav === 503 && v.bezi.filter(x => x[0] < t).every(x => !x[1]), { prvniLista: v.prvniLista, program: v.program });
  test('B: po selhání se lišta ukáže, dřív než uplyne 3,5 s od odpovědi',
    t !== null && v.prvniLista !== null && v.prvniLista >= t && v.prvniLista < t + 3500, { prvniLista: v.prvniLista, odpoved: t });
  test('B: a mluví o nenahraném ceníku', /není nahraný|nuly/i.test(v.lista), v.lista.slice(0, 160));
  test('B: zábrana dokumentu platila po celou dobu (i během čekání)',
    v.bezi.filter(x => x[2]).every(x => x[3] === true && x[4] === true));
  test('B: bez chyb stránky', v.chyby.length === 0, v.chyby);
}

/* ---------- C) /api/program visí ----------
 * Od PS #558 (4. 11. 2026) čeká lišta na stažení ceníku po přihlášení až
 * UKAZKOVE_OVERENI_MS = 15 s (dřív 5 s od startu stránky — na studeném
 * serveru to nestačilo a lišta blikla). 15 s se odpočítává od začátku
 * ověřování (overujeOd), ne od navigace; horní mez má rezervu ze zpoždění
 * startu stránky. */
{
  const v = await scenar({ prihlasen: true, program: 'visi', zpozdeni: 90000, cekej: STAV.lista, pak: 300 });
  const od = v.overujeOd;
  test('C: do 14,5 s od začátku ověřování lišta nesvítí (ceník se po přihlášení ještě stahuje)',
    od !== null && v.bezi.filter(x => x[0] < od + 14500).every(x => !x[1]), { prvniLista: v.prvniLista, overujeOd: od });
  test('C: po stropu 15 s se lišta ukáže sama', od !== null && v.prvniLista !== null && v.prvniLista >= od + 14500
    && v.prvniLista < od + 15000 + v.rezerva, { prvniLista: v.prvniLista, overujeOd: od, rezerva: v.rezerva });
  test('C: zábrana dokumentu platila i během čekání',
    v.bezi.filter(x => x[2] && !x[1]).length > 10
    && v.bezi.filter(x => x[2]).every(x => x[3] === true && x[4] === true));
  test('C: bez chyb stránky', v.chyby.length === 0, v.chyby);
}

/* ---------- D) bez přihlášení (PS #558, 4. 11. 2026) ----------
 * Do v3.11.4 se lišta ukázala hned po zjištění, že relace není — tedy pod
 * přihlašovacím oknem, při prvním otevření aplikace každému. Ceník přitom
 * nechyběl, jen se bez přihlášení nedal načíst. Teď čeká, dokud je okno
 * vidět; po přihlášení formulářem čeká na stažení ceníku (zdržené o 2 s).
 * Před vyplněním formuláře se čeká na deset vzorků běžící aplikace pod
 * oknem (dřív pevných 800 ms). */
{
  const prihlas = async (page) => {
    await page.waitForSelector('#onlineEmail', { timeout: STROP_STAVU });
    await page.waitForFunction(() => window.__vzorky.filter(x => x[2] !== null).length > 10, null, { timeout: STROP_STAVU, polling: 50 });
    await page.fill('#onlineEmail', EMAIL);
    await page.fill('#onlineHeslo', 'Zkusebni.Heslo.123');
    await page.click('#prihlaseni-box button.primary');
  };
  const v = await scenar({ prihlasen: false, program: 'ok', zpozdeni: 2000, akce: prihlas, cekej: STAV.prihlasenCenik, pak: 1500 });
  test('D: aplikace naběhla a vzorkovala', v.bezi.length > 20, v.bezi.length);
  test('D: bez přihlášení ani po přihlášení formulářem se lišta neukázala ani na okamžik',
    v.prvniLista === null, { prvniLista: v.prvniLista, lista: v.lista.slice(0, 120) });
  test('D: přihlášení formulářem proběhlo a platný ceník se nasadil', v.prihlasen === true && v.cenikPouzit === true,
    { prihlasen: v.prihlasen, cenikPouzit: v.cenikPouzit });
  test('D: zábrana dokumentu platila po celou dobu prázdného ceníku',
    v.bezi.filter(x => x[2]).length > 5 && v.bezi.filter(x => x[2]).every(x => x[3] === true && x[4] === true));
  test('D: bez chyb stránky', v.chyby.length === 0, v.chyby);
}

/* ---------- F) studený start serveru (PS #558) ----------
 * Živá relace, ale zdraví, ja i ceník odpovídají každý po 2 s (dohromady
 * přes 6 s). Do v3.11.4 lišta naskočila v 5 s a za chvíli zmizela. */
{
  const v = await scenar({ prihlasen: true, program: 'ok-hned', zpozdeni: 0, cekej: STAV.cenik, pak: 2000,
    cesty: { '/api/zdravi': 2000, '/api/ja': 2000, '/api/program': 2000 } });
  test('F: studený start — lišta se neukázala ani na okamžik', v.prvniLista === null, { prvniLista: v.prvniLista });
  test('F: platný ceník se nasadil', v.cenikPouzit === true && v.lista.trim() === '');
  test('F: bez chyb stránky', v.chyby.length === 0, v.chyby);
}

/* ---------- G) bez sítě (PS #558) ----------
 * Server neodpovídá → přihlašovací okno „Zkusit znovu / Pokračovat bez
 * přihlášení". Dokud je okno vidět, lišta nesvítí; kdo pokračuje bez
 * přihlášení, ceník opravdu nemá — lišta se ukáže hned. Okamžik kliknutí
 * zapisuje stránka (dřív čas z Node před page.click, pod zátěží o kus dřív). */
{
  const v = await scenar({ offline: true, program: 'ok-hned', zpozdeni: 0, cekej: STAV.lista, pak: 300, akce: async (page) => {
    await page.waitForSelector('text=Pokračovat bez přihlášení', { timeout: STROP_STAVU });
    await page.waitForFunction(() => window.__vzorky.filter(x => x[2] !== null).length > 10, null, { timeout: STROP_STAVU, polling: 50 });
    await page.evaluate(() => { window.__klik = null; });
    await page.click('text=Pokračovat bez přihlášení');
  } });
  const klik = v.klik;
  test('G: bez sítě se lišta pod oknem „server neodpovídá" neukázala',
    klik !== null && v.bezi.filter(x => x[0] < klik).length > 10 && v.bezi.filter(x => x[0] < klik).every(x => !x[1]),
    { prvniLista: v.prvniLista, klik });
  test('G: po „Pokračovat bez přihlášení" se lišta ukáže hned (ceník opravdu chybí)',
    klik !== null && v.prvniLista !== null && v.prvniLista >= klik && v.prvniLista < klik + 600 + v.start && /není nahraný/.test(v.lista),
    { prvniLista: v.prvniLista, klik, start: v.start });
  test('G: bez chyb stránky', v.chyby.length === 0, v.chyby);
}

/* ---------- E) ze souboru (file://) ---------- */
{
  const v = await scenar({ soubor: true, prihlasen: false, program: 'ok-hned', zpozdeni: 0, pak: 1000 });
  test('E: nad file:// lišta svítí hned jako dosud (první vzorek běžící aplikace)',
    v.bezi.length > 0 && v.bezi[0][1] === true, v.bezi.slice(0, 2));
  test('E: bez chyb stránky', v.chyby.length === 0, v.chyby);
}

await prohlizec.close();
server.close();
console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
