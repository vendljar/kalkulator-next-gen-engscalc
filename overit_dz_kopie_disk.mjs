/* ============================================================
 * #571 DZ (hlášení J. V. 5. 11. 2026) — denní kopie zálohy na Disk se po
 * přihlášení správce na OSTRÉM webu neudělala a nic se neohlásilo.
 *
 * Harness: SKUTEČNÝ klient (dist/kalkulacka.html) proti SKUTEČNÝM serverovým
 * funkcím (vzor overit_online.mjs), pamětové úložiště místo Blobs.
 * Stav jako na ostrém 5. 11. 2026:
 *   - prostředí main (SITE_ID → prostrediZalohy() = 'main');
 *   - záznam poslední kopie ze 2. 11. ve STARÉM tvaru (před ZN #552 / DK
 *     #554): bez `prostredi`, soubor `otisk_<den>.json.gz`; ve složce na
 *     Disku leží starý `posledni_kopie.json`;
 *   - dnešní noční otisk (zdroj nocni-otisk).
 * Složka „_Zaloha Netlify DB" je v paměti stránky (headless Chromium výběr
 * složky neukáže) a chová se jako Chrome: `requestPermission` bez čerstvé
 * aktivace uživatelem (navigator.userActivation.isActive) vyhodí
 * SecurityError — přesně proto nejde o právo požádat až po přihlášení.
 *
 * Stavy práva: granted / prompt (uživatel povolí) / prompt (odmítne) /
 * denied / žádná složka; obnovené sezení bez hesla; testovací web.
 *
 * Pojistka: na 000924e (v4.11.8) padá — se stavem „prompt" se kopie
 * nepořídí a neukáže se žádná hláška ani tlačítko (tiché selhání). Po
 * opravě vše zelené.
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_dz_kopie_disk.mjs
 * ============================================================ */
/* Funkce se načítají až po nastavení prostředí (ADMIN_EMAIL čtou při importu). */
import { createRequire } from 'module';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import path from 'path';
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

const zdravi = (await import('./netlify/functions/zdravi.mjs')).default;
const ja = (await import('./netlify/functions/ja.mjs')).default;
const prihlaseni = (await import('./netlify/functions/prihlaseni.mjs')).default;
const odhlaseni = (await import('./netlify/functions/odhlaseni.mjs')).default;
const uzivatele = (await import('./netlify/functions/uzivatele.mjs')).default;
const program = (await import('./netlify/functions/program.mjs')).default;
const zakazky = (await import('./netlify/functions/zakazky.mjs')).default;
const zaloha = (await import('./netlify/functions/zaloha.mjs')).default;
const firma = (await import('./netlify/functions/firma.mjs')).default;
const zobrazeni = (await import('./netlify/functions/zobrazeni.mjs')).default;
const popisyFn = (await import('./netlify/functions/popisy.mjs')).default;
const zakazniciFn = (await import('./netlify/functions/zakaznici.mjs')).default;
const zalohaVynuceno = (await import('./netlify/functions/zaloha_vynuceno.mjs')).default;
const { porizOtisk } = await import('./netlify/lib/zalohovani.mjs');
const sablonyFn = (await import('./netlify/functions/sablony.mjs')).default;
const analytikaFn = (await import('./netlify/functions/analytika.mjs')).default;
const slovnikFn = (await import('./netlify/functions/slovnik.mjs')).default;
const controllingFn = (await import('./netlify/functions/controlling.mjs')).default;
const pdStavFn = (await import('./netlify/functions/pd_stav.mjs')).default;

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_dz_kopie_disk.mjs'); process.exit(2); }

/* VS #570 E2: klient čte vypínač zkušebních funkcí po přihlášení. */
const { default: funkceFn } = await import('./netlify/functions/funkce.mjs');
const FUNKCE = {
  '/api/zdravi': zdravi, '/api/funkce': funkceFn, '/api/ja': ja, '/api/prihlaseni': prihlaseni, '/api/odhlaseni': odhlaseni,
  '/api/uzivatele': uzivatele, '/api/program': program, '/api/zakazky': zakazky, '/api/zaloha': zaloha,
  '/api/firma': firma, '/api/zobrazeni': zobrazeni, '/api/popisy': popisyFn, '/api/zakaznici': zakazniciFn,
  '/api/zaloha_vynuceno': zalohaVynuceno, '/api/sablony': sablonyFn, '/api/analytika': analytikaFn,
  '/api/slovnik': slovnikFn, '/api/controlling': controllingFn, '/api/pd/stav': pdStavFn,
};

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const EMAIL = process.env.ADMIN_EMAIL, HESLO = process.env.ADMIN_INIT_HESLO;
const html = readFileSync(path.resolve('dist/kalkulacka.html'));
const server = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ADRESA = 'http://127.0.0.1:' + server.address().port;
const prohlizec = await chromium.launch({ args: ['--no-sandbox'] });
const { hlidejHarness } = require('./nastroje/harness_hlidac.js');

/* ---- stav serveru jako na ostrém 5. 11. 2026 ---- */
const DNES = new Date().toISOString().slice(0, 10);
const STARY_DEN = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
const SHA = 'a'.repeat(64);
/* Záznam kopie před #552/#554: bez prostředí, jméno otisk_<den>.json.gz. */
const STARY_ZAZNAM = { kdy: STARY_DEN + 'T10:42:41.000Z', soubor: 'otisk_' + STARY_DEN + '.json.gz', velikostB: 4096,
  sha256: SHA, otisk: STARY_DEN, puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB', potvrzeno: 'heslo-spravce' };
let otiskHotovy = false;
async function pripravServer(prostredi, zaznam) {
  delete process.env.PROSTREDI; delete process.env.SITE_ID;
  if (prostredi === 'main') process.env.SITE_ID = 'zkusebni-site';
  if (prostredi === 'test') { process.env.SITE_ID = 'zkusebni-site'; process.env.PROSTREDI = 'test'; }
  if (!otiskHotovy) { await porizOtisk('nocni-otisk', '', DNES); otiskHotovy = true; }
  if (zaznam) pamet.set('zalohy/kopie-disk', JSON.stringify(zaznam)); else pamet.delete('zalohy/kopie-disk');
}

/* ---- složka „_Zaloha Netlify DB" v paměti stránky ---- */
const SLOZKA_SKRIPT = () => {
  const soubory = new Map();
  const d = window.__disk = { soubory, pravo: 'granted', odpoved: 'granted', zadosti: 0, bezGesta: 0, vyber: 0,
    log: [], prisnyVyber: false, vyberBezGesta: 0 };
  /* #574: zastaralý handle jako v Chrome — name i queryPermission projdou,
   * práce se složkou hodí DOMException NotFoundError (text z Chrome) */
  const NENALEZENO = 'A requested file or directory could not be found at the time an operation was processed.';
  const novaSlozka = () => { const st = { zmizela: false, zmizetPriZapisu: false };
  const hl = { kind: 'directory', name: '_Zaloha Netlify DB', __st: st,
    queryPermission: async () => d.pravo,
    /* jako Chrome: žádost bez aktivace uživatelem = SecurityError */
    requestPermission: async () => {
      if (!(navigator.userActivation && navigator.userActivation.isActive)) {
        d.bezGesta++;
        throw new DOMException('Must be handling a user gesture to show a permission request.', 'SecurityError');
      }
      d.zadosti++;
      if (d.pravo === 'prompt') d.pravo = d.odpoved;
      return d.pravo;
    },
    getFileHandle: async (jmeno, o) => {
      if (st.zmizela || (st.zmizetPriZapisu && o && o.create)) throw new DOMException(NENALEZENO, 'NotFoundError');
      if (!soubory.has(jmeno) && !(o && o.create)) throw new DOMException('není', 'NotFoundError');
      return { createWritable: async () => { const casti = [];
          return { write: async (t) => { casti.push(t); }, close: async () => { soubory.set(jmeno, new Blob(casti)); } }; },
        getFile: async () => soubory.get(jmeno) || new Blob([]) };
    },
    values: async function* () {
      d.log.push('sonda');
      if (d.pravo !== 'granted') throw new DOMException('Permission was denied.', 'NotAllowedError');
      if (st.zmizela) throw new DOMException(NENALEZENO, 'NotFoundError');
      for (const jm of [...soubory.keys()]) yield { kind: 'file', name: jm }; },
    removeEntry: async (jmeno) => { soubory.delete(jmeno); } };
  return hl; };
  d.slozka = novaSlozka();
  window.showDirectoryPicker = async () => {
    /* #574: jako Chrome — výběr složky jen s čerstvou aktivací kliknutím */
    if (d.prisnyVyber && (d.gestoVyprselo || !(navigator.userActivation && navigator.userActivation.isActive))) {
      d.vyberBezGesta++;
      throw new DOMException('Must be handling a user gesture to show a file picker.', 'SecurityError');
    }
    d.vyber++; d.log.push('vyber'); d.pravo = 'granted'; d.slozka = novaSlozka(); return d.slozka; };
};

/* Jeden průchod: nová karta prohlížeče, přihlášení klikem, čekání na automatiku. */
async function pruchod(nazev, { prostredi = 'main', zaznam = STARY_ZAZNAM, pravo = 'granted', odpoved = 'granted',
  slozka = true, f5 = false, priprava = '' } = {}) {
  await pripravServer(prostredi, zaznam);
  const kontext = await prohlizec.newContext();
  const page = await kontext.newPage();
  hlidejHarness({ page, uklid: async () => { await prohlizec.close(); server.close(); } });
  const chyby = [];
  page.on('pageerror', e => chyby.push('pageerror: ' + e.message));
  let cookieJar = '', brana = null;
  await page.route('**/api/**', async route => {
    /* F5: odpovědi počkají, než harness nastaví složku (v aplikaci ji
     * kopieDiskSlozka čte z IndexedDB, tady ji podstrčí priprav) */
    if (brana) await brana;
    const r = route.request();
    const url = new URL(r.url());
    const fn = FUNKCE[url.pathname];
    if (!fn) return route.fulfill({ status: 404, body: '{"ok":false}' });
    const init = { method: r.method(), headers: { cookie: cookieJar } };
    if (r.method() === 'POST') init.body = r.postData() || '';
    const odp = await fn(new Request(r.url(), init));
    const setc = odp.headers.get('set-cookie');
    if (setc) cookieJar = setc.split(';')[0];
    route.fulfill({ status: odp.status, contentType: 'application/json; charset=utf-8', body: await odp.text() });
  });
  await page.addInitScript(SLOZKA_SKRIPT);
  const priprav = async () => {
    await page.waitForFunction(() => typeof window.render === 'function');
    await page.waitForTimeout(300);
    await page.evaluate(({ pravo, odpoved, slozka, priprava }) => {
      window.__dlgTexty = [];
      window.potvrd = (t) => { window.__dlgTexty.push(String(t)); return Promise.resolve(true); };
      window.hlaska = (t) => { window.__dlgTexty.push(String(t)); return Promise.resolve(); };
      window.dotaz = (t, v) => { window.__dlgTexty.push(String(t)); return Promise.resolve(v == null ? '' : v); };
      window.dotazHeslo = (t) => { window.__dlgTexty.push(String(t)); window.__disk.log.push('heslo'); return Promise.resolve(window.__dlgHeslo === undefined ? null : window.__dlgHeslo); };
      window.__disk.pravo = pravo; window.__disk.odpoved = odpoved;
      /* složka zapamatovaná z dřívějška (v aplikaci z IndexedDB) */
      KOPIE_DISK.slozka = slozka ? window.__disk.slozka : null; KOPIE_DISK.nacteno = true;
      /* starý záznam z doby před ZN/DK leží ve složce taky */
      if (slozka) window.__disk.soubory.set('posledni_kopie.json', new Blob(['{"kdy":"stary"}']));
      /* #574: zapamatovaná složka, která v počítači už není */
      if (priprava) { window.__disk.slozka.__st[priprava] = true; window.__disk.prisnyVyber = true;
        window.__dlgHeslo = 'Zkusebni.Heslo.123'; }
    }, { pravo, odpoved, slozka, priprava });
  };
  await page.goto(ADRESA);
  await priprav();
  await page.fill('#onlineEmail', EMAIL);
  await page.fill('#onlineHeslo', HESLO);
  await page.click('#prihlaseni-box >> text=Přihlásit');
  await page.waitForFunction(() => { try { return !!ONLINE_STAV.ja; } catch (e) { return false; } }, null, { timeout: 15000 })
    .catch(async () => { console.log('DEBUG', await page.evaluate(() => [ONLINE_STAV.hlaska, document.getElementById('prihlaseni-box').innerText.slice(0, 400)])); throw new Error('přihlášení neproběhlo'); });
  if (f5) {
    /* obnovení stránky: relace z cookie, heslo aplikace nemá */
    pamet.set('zalohy/kopie-disk', JSON.stringify(zaznam));
    let uvolni; brana = new Promise(r => { uvolni = r; });
    await page.reload();
    await priprav();
    brana = null; uvolni();
    await page.waitForFunction(() => { try { return !!ONLINE_STAV.ja; } catch (e) { return false; } });
  }
  /* automatika po přihlášení: kopie, nebo hláška o ní (nebo nic — 000924e) */
  await page.waitForFunction(() => /Denní kopie/.test(ONLINE_STAV.hlaska || '') || !!ONLINE_STAV.kopieDiskCeka,
    null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(300);
  await page.evaluate(() => render());
  const stav = await page.evaluate(() => ({
    hlaska: ONLINE_STAV.hlaska, typ: ONLINE_STAV.hlaskaTyp, ceka: ONLINE_STAV.kopieDiskCeka || null,
    soubory: [...window.__disk.soubory.keys()], zadosti: window.__disk.zadosti, bezGesta: window.__disk.bezGesta,
    lista: (document.getElementById('onlineLista') || {}).innerHTML || '',
    karta: typeof renderOnlineKarta === 'function' ? renderOnlineKarta() : '' }));
  stav.zaznam = JSON.parse(pamet.get('zalohy/kopie-disk') || 'null');
  stav.chyby = chyby;
  stav.page = page; stav.kontext = kontext;
  console.log('--- ' + nazev);
  return stav;
}
const kopieJmeno = (p) => new RegExp('^otisk_' + p + '_' + DNES + '_\\d{4}\\.json(\\.gz)?$');
const tlacitko = (s) => /id="online-lista-kopie-disk"/.test(s.lista) && /Zkopírovat zálohu na Disk teď/.test(s.lista)
  && /id="online-kopie-disk-ceka"/.test(s.karta) && /onclick="onlineKopieDiskTed\(\)"/.test(s.karta);

/* ---- A) ostrý, právo „prompt" (restart prohlížeče), správce povolí ---- */
{
  const s = await pruchod('A ostrý, právo prompt → povolí', { pravo: 'prompt', odpoved: 'granted' });
  test('DZ A: o právo se požádalo ve stejném gestu jako klik na „Přihlásit" (ne až po přihlášení bez gesta)',
    s.zadosti === 1 && s.bezGesta === 0, { zadosti: s.zadosti, bezGesta: s.bezGesta });
  test('DZ A: denní kopie se na ostrém pořídila (otisk_main_<dnešek>_HHMM.json.gz)',
    s.soubory.some(j => kopieJmeno('main').test(j)), s.soubory);
  test('DZ A: vznikl posledni_kopie_main.json, starý posledni_kopie.json zůstal',
    s.soubory.includes('posledni_kopie_main.json') && s.soubory.includes('posledni_kopie.json'), s.soubory);
  test('DZ A: server si kopii poznamenal jako prostředí main s dnešním otiskem',
    !!s.zaznam && s.zaznam.prostredi === 'main' && s.zaznam.otisk === DNES, s.zaznam);
  test('DZ A: hláška o samočinné kopii, nic nečeká', /Denní kopie zálohy se sama uložila na Disk/.test(s.hlaska) && !s.ceka, s.hlaska);
  test('DZ A: bez chyb stránky', s.chyby.length === 0, s.chyby);
  await s.kontext.close();
}
/* ---- B) ostrý, právo „prompt", správce odmítne ---- */
{
  const s = await pruchod('B ostrý, právo prompt → odmítne', { pravo: 'prompt', odpoved: 'denied' });
  test('DZ B: kopie se nepořídila', !s.soubory.some(j => kopieJmeno('main').test(j)), s.soubory);
  test('DZ B: NE tiše — hláška říká, že prohlížeč nepovolil zápis',
    s.typ === 'varovani' && /Denní kopie zálohy na Disk čeká/.test(s.hlaska) && /prohlížeč (nepovolil zápis|zápis do složky .* zakázal)/.test(s.hlaska), s.hlaska);
  test('DZ B: tlačítko „Zkopírovat zálohu na Disk teď" v liště i v Nastavení → Databáze', tlacitko(s), [s.lista.slice(0, 300)]);
  /* tlačítko: zapomenutá složka → výběr → kopie */
  await s.page.evaluate(() => { window.__dlgHeslo = 'Zkusebni.Heslo.123'; });
  const v = await s.page.evaluate(() => onlineKopieDiskTed());
  const po = await s.page.evaluate(() => ({ soubory: [...window.__disk.soubory.keys()], ceka: ONLINE_STAV.kopieDiskCeka }));
  test('DZ B: zamítnuté právo → tlačítko složku zapomene (příští klik nabídne výběr)', v === false, v);
  const v2 = await s.page.evaluate(() => onlineKopieDiskTed());
  const po2 = await s.page.evaluate(() => ({ soubory: [...window.__disk.soubory.keys()], ceka: ONLINE_STAV.kopieDiskCeka,
    vyber: window.__disk.vyber, lista: document.getElementById('onlineLista').innerHTML }));
  test('DZ B: druhý klik → výběr složky → kopie se pořídí a výzva zmizí',
    v2 === true && po2.vyber === 1 && po2.soubory.some(j => kopieJmeno('main').test(j)) && !po2.ceka
    && !/online-lista-kopie-disk/.test(po2.lista), [v2, po2.vyber, po2.soubory, po.ceka]);
  await s.kontext.close();
}
/* ---- C) ostrý, právo „denied" ---- */
{
  const s = await pruchod('C ostrý, právo denied', { pravo: 'denied' });
  test('DZ C: zakázaný zápis → bez kopie, hláška s důvodem a tlačítko',
    !s.soubory.some(j => kopieJmeno('main').test(j)) && /Denní kopie zálohy na Disk čeká: prohlížeč zápis/.test(s.hlaska) && tlacitko(s), s.hlaska);
  await s.kontext.close();
}
/* ---- D) ostrý, v tomhle prohlížeči žádná složka ---- */
{
  const s = await pruchod('D ostrý, žádná složka', { slozka: false });
  test('DZ D: bez složky → hláška „není vybraná složka" a tlačítko',
    /není vybraná složka „_Zaloha Netlify DB"/.test(s.hlaska) && s.typ === 'varovani' && tlacitko(s), s.hlaska);
  test('DZ D: po přihlášení se výběr složky sám neotevřel', await s.page.evaluate(() => window.__disk.vyber) === 0);
  await s.page.evaluate(() => { window.__dlgHeslo = 'Zkusebni.Heslo.123'; });
  const v = await s.page.evaluate(() => onlineKopieDiskTed());
  const soubory = await s.page.evaluate(() => [...window.__disk.soubory.keys()]);
  test('DZ D: postup pro J. V.: tlačítko → výběr složky → kopie', v === true && soubory.some(j => kopieJmeno('main').test(j)), soubory);
  await s.kontext.close();
}
/* ---- E) ostrý, právo udělené ---- */
{
  const s = await pruchod('E ostrý, granted', { pravo: 'granted' });
  test('DZ E: udělené právo → kopie bez žádosti o právo', s.soubory.some(j => kopieJmeno('main').test(j)) && s.zadosti === 0, s.soubory);
  test('DZ E: starý záznam (bez prostředí, otisk_<den>.json.gz) kopii nebrání', !!s.zaznam && s.zaznam.prostredi === 'main');
  await s.kontext.close();
}
/* ---- F) obnovené sezení (F5) bez hesla ---- */
{
  const s = await pruchod('F ostrý, F5 bez hesla', { pravo: 'granted', f5: true });
  test('DZ F: obnovené sezení → kopie čeká s důvodem „chybí heslo" a tlačítkem',
    /chybí heslo/.test(s.hlaska) && tlacitko(s) && !s.soubory.some(j => kopieJmeno('main').test(j)), s.hlaska);
  await s.kontext.close();
}
/* ---- G) testovací web dál funguje stejně ---- */
{
  const zaznamTest = { kdy: STARY_DEN + 'T02:00:00.000Z', soubor: 'otisk_test_' + STARY_DEN + '_0300.json.gz', velikostB: 4096,
    sha256: SHA, otisk: STARY_DEN, puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB', potvrzeno: 'heslo-spravce', prostredi: 'test' };
  const s = await pruchod('G testovací web, granted', { prostredi: 'test', zaznam: zaznamTest, pravo: 'granted' });
  test('DZ G: testovací web — kopie otisk_test_<dnešek> a posledni_kopie_test.json',
    s.soubory.some(j => kopieJmeno('test').test(j)) && s.soubory.includes('posledni_kopie_test.json') && !s.ceka, s.soubory);
  await s.kontext.close();
}
/* ---- H) nic nového → nic se neděje ---- */
{
  const dnesni = Object.assign({}, STARY_ZAZNAM, { kdy: new Date().toISOString(), otisk: DNES, soubor: 'otisk_main_' + DNES + '_0300.json.gz', prostredi: 'main' });
  const s = await pruchod('H ostrý, kopie dnešního otisku už je', { zaznam: dnesni, pravo: 'prompt', odpoved: 'granted' });
  test('DZ H: bez nového nočního otisku žádná kopie ani výzva', !s.ceka && !/Denní kopie/.test(s.hlaska)
    && !s.soubory.some(j => /^otisk_main_/.test(j)), [s.hlaska, s.soubory]);
  await s.kontext.close();
}

/* ---- #574 DZ2 (hlášení J. V. 6. 11. 2026): zapamatovaná složka v počítači už není ---- */
const DNESNI_ZAZNAM = () => Object.assign({}, STARY_ZAZNAM, { kdy: new Date().toISOString(), otisk: DNES,
  soubor: 'otisk_main_' + DNES + '_0300.json.gz', prostredi: 'main' });
const ANGLICKY = /could not be found|requested file|user gesture/i;
const zastarej = (page, jak = 'zmizela') => page.evaluate((jak) => {
  window.__disk.slozka.__st[jak] = true; window.__disk.prisnyVyber = true; window.__disk.log.length = 0;
  window.__dlgHeslo = 'Zkusebni.Heslo.123'; }, jak);
const poKliku = (page) => page.evaluate(() => ({ hlaska: ONLINE_STAV.hlaska, typ: ONLINE_STAV.hlaskaTyp, ceka: ONLINE_STAV.kopieDiskCeka,
  log: window.__disk.log.slice(), vyber: window.__disk.vyber, vyberBezGesta: window.__disk.vyberBezGesta,
  zapamatovana: KOPIE_DISK.slozka === null ? null : (KOPIE_DISK.slozka === window.__disk.slozka ? 'nova' : 'stara'),
  soubory: [...window.__disk.soubory.keys()] }));
const cekejNaKopii = (page) => page.waitForFunction(() => !ONLINE_STAV.pracuje, null, { timeout: 10000 });
/* ---- I) automatika po přihlášení: složka zmizela ---- */
{
  const s = await pruchod('I ostrý, složka zmizela → automatika po přihlášení', { pravo: 'granted', priprava: 'zmizela' });
  const st = await poKliku(s.page);
  test('DZ2 I: automatika — NE tiše: důvod „složka nenalezena — vyberte ji znovu"',
    s.typ === 'varovani' && /Denní kopie zálohy na Disk čeká: složka „_Zaloha Netlify DB" nenalezena/.test(s.hlaska)
    && /vyberte ji znovu/.test(s.hlaska) && !ANGLICKY.test(s.hlaska), s.hlaska);
  test('DZ2 I: automatika — důvod „nenalezena" a tlačítko v liště i v Nastavení → Databáze',
    !!s.ceka && s.ceka.duvod === 'nenalezena' && tlacitko(s), s.ceka);
  test('DZ2 I: automatika — zastaralá složka zapomenuta (paměť i IndexedDB), heslo se nestahovalo',
    st.zapamatovana === null && await s.page.evaluate(() => kopieDiskIdb()) === null
    && !s.soubory.some(j => kopieJmeno('main').test(j)), st);
  await s.page.click('#online-lista-kopie-disk');
  await cekejNaKopii(s.page);
  const po = await poKliku(s.page);
  test('DZ2 I: klik na tlačítko v liště → výběr složky (s gestem) → heslo → kopie, výzva zmizí',
    po.vyber === 1 && po.vyberBezGesta === 0 && po.soubory.some(j => kopieJmeno('main').test(j)) && !po.ceka
    && po.zapamatovana === 'nova', po);
  test('DZ2 I: bez chyb stránky', s.chyby.length === 0, s.chyby);
  await s.kontext.close();
}
/* ---- J) tlačítko: složka zmizela → v témže kliknutí výběr, heslo až potom ---- */
{
  const s = await pruchod('J ostrý, tlačítko se zmizelou složkou', { pravo: 'granted', zaznam: DNESNI_ZAZNAM() });
  await zastarej(s.page);
  await s.page.evaluate(() => { ONLINE_STAV.kopieDiskCeka = { duvod: 'chyba', text: 'x' }; render(); });
  await s.page.click('#online-lista-kopie-disk');
  await cekejNaKopii(s.page);
  const po = await poKliku(s.page);
  test('DZ2 J: zmizelá složka se pozná sondou DŘÍV, než se ptá na heslo (sonda → výběr → heslo)',
    po.log.indexOf('sonda') === 0 && po.log.indexOf('vyber') > 0 && po.log.indexOf('heslo') > po.log.indexOf('vyber'), po.log);
  test('DZ2 J: výběr složky v témže kliknutí (gesto platí), kopie do nové složky',
    po.vyber === 1 && po.vyberBezGesta === 0 && po.soubory.some(j => kopieJmeno('main').test(j))
    && /Záloha zkopírována na Disk/.test(po.hlaska) && po.zapamatovana === 'nova', po);
  await s.kontext.close();
}
/* ---- K) gesto už neplatí → česká hláška, žádné heslo; další klik vybere ---- */
{
  const s = await pruchod('K ostrý, zmizelá složka, výběr bez gesta', { pravo: 'granted', zaznam: DNESNI_ZAZNAM() });
  await zastarej(s.page);
  /* aktivace vyprchala (např. dlouhý dotaz na právo) — page.evaluate v Playwrightu
   * sám aktivaci dává, proto se vypršení napodobí příznakem */
  await s.page.evaluate(() => { window.__disk.gestoVyprselo = true; });
  const v = await s.page.evaluate(() => onlineKopieDiskTed());
  await s.page.evaluate(() => { window.__disk.gestoVyprselo = false; });
  const po = await poKliku(s.page);
  test('DZ2 K: česká hláška „Složka … na tomto počítači už není … Klikněte znovu a vyberte"',
    v === false && po.typ === 'varovani' && /^Složka „_Zaloha Netlify DB" na tomto počítači už není \(přesunutá nebo přejmenovaná/.test(po.hlaska)
    && /Klikněte znovu na „Zkopírovat zálohu na Disk teď" a vyberte složku „_Zaloha Netlify DB" na Disku Google/.test(po.hlaska), po.hlaska);
  test('DZ2 K: nikdy anglická systémová hláška', !ANGLICKY.test(po.hlaska), po.hlaska);
  test('DZ2 K: heslo se nežádalo, záloha nestahovala, složka zapomenuta',
    !po.log.includes('heslo') && po.zapamatovana === null && po.vyberBezGesta === 1, po);
  await s.page.evaluate(() => { ONLINE_STAV.kopieDiskCeka = { duvod: 'nenalezena', text: 'x' }; render(); });
  await s.page.click('#online-lista-kopie-disk');
  await cekejNaKopii(s.page);
  const po2 = await poKliku(s.page);
  test('DZ2 K: další klik → výběr složky → kopie', po2.vyber === 1 && po2.soubory.some(j => kopieJmeno('main').test(j)), po2);
  await s.kontext.close();
}
/* ---- L) sonda projde, složka zmizí až při zápisu ---- */
{
  const s = await pruchod('L ostrý, složka zmizí při zápisu', { pravo: 'granted', zaznam: DNESNI_ZAZNAM() });
  await zastarej(s.page, 'zmizetPriZapisu');
  const v = await s.page.evaluate(() => onlineKopieDiskTed());
  const po = await poKliku(s.page);
  test('DZ2 L: NotFoundError při zápisu → zapomenout + česká hláška (bez angličtiny)',
    v === false && /na tomto počítači už není/.test(po.hlaska) && !ANGLICKY.test(po.hlaska) && po.zapamatovana === null, po);
  await s.kontext.close();
}
/* ---- M) zmizelá složka a právo „prompt" (restart prohlížeče) ---- */
{
  const s = await pruchod('M ostrý, zmizelá složka + právo prompt', { pravo: 'granted', zaznam: DNESNI_ZAZNAM() });
  await zastarej(s.page);
  await s.page.evaluate(() => { window.__disk.pravo = 'prompt'; window.__disk.odpoved = 'granted';
    ONLINE_STAV.kopieDiskCeka = { duvod: 'pravo', text: 'x' }; render(); });
  await s.page.click('#online-lista-kopie-disk');
  await cekejNaKopii(s.page);
  const po = await poKliku(s.page);
  test('DZ2 M: bez práva čtení sonda nerozhodne → žádost o právo → sonda → výběr → kopie',
    po.vyber === 1 && po.soubory.some(j => kopieJmeno('main').test(j)) && po.log.filter(x => x === 'sonda').length >= 2, po);
  await s.kontext.close();
}

await prohlizec.close(); server.close();
console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
