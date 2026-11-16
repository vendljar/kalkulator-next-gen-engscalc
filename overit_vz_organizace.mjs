/* Ověření v prohlížeči: VÍC ZÁKAZNÍKŮ — ORGANIZACE DEALU = VÍTĚZNÝ ZÁKAZNÍK
 * (VZ-E5b, návrh podklady/NAVRH_VICE_ZAKAZNIKU.md § 7.4, prompt
 * podklady/PROMPT_VZ_E5b.md bod 6 „Obrazovka").
 *
 * Co se hlídá (server nahrazuje podvržený fetch, síť se nevolá nikdy):
 *  1. Prodaná zakázka se 2 zákazníky + pdOrgVitez.stav 'zapsano' → u řádku
 *     Stav Pipedrive (OCK) i v kartě Zákazníci zakázky PŘESNĚ věta
 *     „Doplňte v Pipedrive kontaktní osobu vítězného zákazníka před posunem
 *     dealu na Vyhráno."; neprodaná zakázka → nic.
 *  2. 'shoda' → nic.
 *  3. 'chyba' / 'vice' / 'bez-ico' → „Organizace dealu se nepřepsala" +
 *     důvod (u 'vice' počet a názvy) + tlačítko „Zkusit zápis znovu";
 *     uživatel, který nesmí (ani admin, ani autor, ani prodal), tlačítko nemá.
 *  4. Klik na „Zkusit zápis znovu" pošle POST /api/pd/organizace
 *     { soubor, akce: 'vitez' }, převezme razitko (ZAK.uloRazitko
 *     i ONLINE_STAV.razitko) a nový stav; zakázka nezůstane „neuložená".
 *     Odpověď 200 s ok:false (stav 'vice') se převezme taky; 403 → chyba
 *     bez tlačítka, 503 → chyba s tlačítkem.
 *  5. HTML v názvu organizace / důvodu se neprovede (escapováno).
 *  6. VYP (s daty víc zákazníků) a jeden zákazník = žádné upozornění
 *     a hlavička znak po znaku jako bez pdOrgVitez.
 *  7. vzPoProdejiPd bez online souboru nebo u neprodané zakázky nic nevolá.
 *  8. Žádná chyba stránky.
 * Pojistka: bez funkcí vzOrgVitezHtml / vzPoProdejiPd (stav před E5b) selže
 * hned první kontrola i všechny kontroly upozornění.
 * Spuštění: python3 build.py && node overit_vz_organizace.mjs  (KNG_DIST) */
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright není k dispozici.'); process.exit(2); }
const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = process.env.KNG_DIST ? pathToFileURL(process.env.KNG_DIST).href
  : new URL('dist/kalkulacka.html', import.meta.url).href;
const ZC = require(KOREN + 'src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const VETA = 'Doplňte v Pipedrive kontaktní osobu vítězného zákazníka před posunem dealu na Vyhráno.';
const chyby = [];

const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'cs-CZ', viewport: { width: 1440, height: 950 } });
const p = await ctx.newPage();
p.on('pageerror', e => chyby.push(String(e).slice(0, 200)));
await p.goto(KDE);
await p.waitForFunction(() => typeof window.render === 'function');
await p.waitForTimeout(300);

test('funkce vzOrgVitezHtml a vzPoProdejiPd existují', await p.evaluate(() =>
  typeof vzOrgVitezHtml === 'function' && typeof vzPoProdejiPd === 'function'));

/* Výchozí stav: zkušební ceník, podvržený fetch, přihlášený obchodník. */
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  window.hlaska = () => Promise.resolve();
  window.potvrd = () => Promise.resolve(true);
  window.__vzZap = true;
  window.viceZakaznikuZapnuto = () => window.__vzZap;
  window.__dotazy = [];
  window.__odp = { status: 200, json: { ok: true } };
  window.fetch = async (url, o) => {
    const u = String(url);
    if (u.indexOf('/api/pd/organizace') === 0) {
      window.__dotazy.push({ url: u, metoda: o && o.method, telo: o && o.body ? JSON.parse(o.body) : null });
      const r = window.__odp;
      return { status: r.status, ok: r.status >= 200 && r.status < 300, json: async () => JSON.parse(JSON.stringify(r.json)) };
    }
    return { status: 200, ok: true, json: async () => ({ ok: true }) };
  };
  window.__online = (email, role) => {
    ONLINE_STAV.ja = { email, jmeno: 'Zkušební', role };
    ONLINE_STAV.soubor = 'zkusebni-zakazka.json';
    ONLINE_STAV.razitko = 'r-puvodni';
  };
  /* Zakázka: 2 zákazníci (vzRidici), deal, varianta v1 prodaná (zamčená). */
  window.__zakazka = ({ prodana = true, dva = true, org = null } = {}) => {
    ZAK = novaZakazka();
    ZAK.varianty[0].id = 'v1'; ZAK.aktivni = 'v1';
    Object.assign(ZAK, { objednatel: 'Řídící firma s.r.o.', ico: '25596641', pdDealId: '4321',
      autor: 'autor@priklad.cz', uloRazitko: 'r-puvodni' });
    syncVarianta();
    if (dva) vzPridej(ZAK, { objednatel: 'Druhý zákazník s.r.o.' }, {});
    if (prodana) {
      ZAK.varianty[0].zamek = { zamceno: true, kdy: '2026-11-16T08:00:00.000Z', kdo: 'prodal@priklad.cz' };
      ZAK.varianty[0].prodano = { datum: '2026-11-16', kdo: 'prodal@priklad.cz', kdy: '2026-11-16T08:00:00.000Z' };
    }
    if (org) ZAK.pdOrgVitez = org;
    VZ_UI.org = null;
    syncVarianta();
    prepniTab('kalk'); render();
    ONLINE_STAV.posledni = JSON.stringify(ZAK);
    if (typeof historieOznacUlozeno === 'function') historieOznacUlozeno();
  };
  window.__upoz = () => {
    const ctiz = (sel, karta) => [...document.querySelectorAll(sel)].filter(e => !!e.closest('.vz-karta') === karta).map(e => ({
      druh: e.getAttribute('data-vz-org'), text: e.textContent.replace(/\s+/g, ' ').trim(),
      veta: (e.querySelector('[data-vz-org-veta]') || {}).textContent || '',
      tl: [...e.querySelectorAll('button')].map(x => ({ t: x.textContent.trim(), dis: x.disabled })) }));
    return { hlavicka: ctiz('#kalk-hlavicka .vz-org-upoz', false), karta: ctiz('#vzKarta_ock .vz-org-upoz', true),
      vsechny: document.querySelectorAll('.vz-org-upoz').length, xss: !!window.__xss || !!document.querySelector('img[data-xss]') };
  };
  __online('prodal@priklad.cz', 'Obchodník');
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);

const klik = (sel) => p.click(sel, { timeout: 3000 }).catch(() => test('klik na ' + sel, false));
const zakazka = (o) => p.evaluate((o) => __zakazka(o), o);
const upoz = () => p.evaluate(() => __upoz());
const ORG = (stav, navic) => Object.assign({ deal: '4321', org: 456, stav, kdy: '2026-11-16T08:01:00.000Z', kdo: 'prodal@priklad.cz' }, navic || {});

/* ---------- 1: zapsano ---------- */
await zakazka({ org: ORG('zapsano', { zdroj: 'nalezena', nazev: 'Druhý zákazník s.r.o.' }) });
{
  const u = await upoz();
  test('zapsano: věta u řádku Stav Pipedrive přesně', u.hlavicka.length === 1 && u.hlavicka[0].veta === VETA && u.hlavicka[0].druh === 'kontakt', u.hlavicka);
  test('zapsano: věta i v kartě Zákazníci zakázky', u.karta.length === 1 && u.karta[0].veta === VETA, u.karta);
  test('zapsano: bez tlačítka a bez „se nepřepsala"', u.hlavicka.every(x => !x.tl.length && !/nepřepsala/.test(x.text)), u.hlavicka);
  test('zapsano: upozornění je u řádku Stav Pipedrive (hned za ním)', await p.evaluate(() => {
    const r = document.querySelector('#kalk-hlavicka .pd-stav-radek');
    return !!r && !!r.nextElementSibling && r.nextElementSibling.classList.contains('vz-org-upoz');
  }));
}
await zakazka({ prodana: false, org: ORG('zapsano') });
test('neprodaná zakázka se zapsano: nic', (await upoz()).vsechny === 0);
await zakazka({});
test('prodaná bez pdOrgVitez: nic', (await upoz()).vsechny === 0);

/* ---------- 2: shoda ---------- */
await zakazka({ org: ORG('shoda') });
test('shoda: nic', (await upoz()).vsechny === 0);

/* ---------- 3: chyba / vice / bez-ico ---------- */
await zakazka({ org: ORG('chyba', { org: 0, duvod: 'Pipedrive neodpověděl včas.' }) });
{
  const u = await upoz();
  const h = u.hlavicka[0] || { text: '', tl: [] };
  test('chyba: „Organizace dealu se nepřepsala" + důvod u řádku Stav Pipedrive', u.hlavicka.length === 1
    && /^Organizace dealu se nepřepsala/.test(h.text) && h.text.indexOf('Pipedrive neodpověděl včas.') >= 0, h);
  test('chyba: tlačítko „Zkusit zápis znovu" (ten, kdo prodal)', h.tl.length === 1 && h.tl[0].t === 'Zkusit zápis znovu' && !h.tl[0].dis, h.tl);
  test('chyba: totéž v kartě', u.karta.length === 1 && /nepřepsala/.test(u.karta[0].text) && u.karta[0].tl.length === 1, u.karta);
  test('chyba: věta o kontaktní osobě tu není', !u.hlavicka.concat(u.karta).some(x => x.text.indexOf(VETA) >= 0));
}
await zakazka({ org: ORG('vice', { org: 0, duvod: 'V Pipedrive je víc organizací s tímto IČO.', vice: { pocet: 2, nazvy: ['Druhý A s.r.o.', 'Druhý B s.r.o.'] } }) });
{
  const u = await upoz();
  const t = (u.hlavicka[0] || {}).text || '';
  test('vice: důvod, počet a názvy organizací', /nepřepsala/.test(t) && t.indexOf('víc organizací') >= 0 && /\b2 organizací/.test(t)
    && t.indexOf('Druhý A s.r.o.') >= 0 && t.indexOf('Druhý B s.r.o.') >= 0, t);
  test('vice: tlačítko', ((u.hlavicka[0] || {}).tl || []).some(x => x.t === 'Zkusit zápis znovu'));
}
await zakazka({ org: ORG('bez-ico', { org: 0, duvod: 'Vítězný zákazník nemá platné IČO.' }) });
{
  const u = await upoz();
  const t = (u.hlavicka[0] || {}).text || '';
  test('bez-ico: důvod a tlačítko', /nepřepsala/.test(t) && t.indexOf('nemá platné IČO') >= 0 && ((u.hlavicka[0] || {}).tl || []).length === 1, u.hlavicka);
}
/* Kdo smí: cizí obchodník ne, autor a administrátor ano. */
for (const [email, role, smi] of [['cizi@priklad.cz', 'Obchodník', false], ['autor@priklad.cz', 'Obchodník', true], ['spravce@priklad.cz', 'Administrátor', true]]) {
  await p.evaluate(([e, r]) => { __online(e, r); render(); }, [email, role]);
  const u = await upoz();
  test(`tlačítko pro ${email} (${role}): ${smi ? 'ano' : 'ne'}`, u.hlavicka.length === 1 && (u.hlavicka[0].tl.length === 1) === smi, u.hlavicka);
}
await p.evaluate(() => { __online('prodal@priklad.cz', 'Obchodník'); render(); });

/* ---------- 5: escapování ---------- */
await zakazka({ org: ORG('vice', { org: 0, duvod: 'Důvod <img src=x data-xss onerror="window.__xss=1">',
  vice: { pocet: 2, nazvy: ['<img src=x data-xss onerror="window.__xss=1">Zlá s.r.o.', '<b>Tučná</b> a.s.'] } }) });
await p.waitForTimeout(100);
{
  const u = await upoz();
  test('HTML v důvodu a názvech organizací se neprovede', !u.xss && u.vsechny >= 2, u);
  test('… a je vidět jako text', ((u.hlavicka[0] || {}).text || '').indexOf('<b>Tučná</b> a.s.') >= 0, u.hlavicka);
}

/* ---------- 4: Zkusit zápis znovu ---------- */
await zakazka({ org: ORG('chyba', { org: 0, duvod: 'Pipedrive neodpověděl včas.' }) });
await p.evaluate(() => {
  window.__dotazy = [];
  window.__odp = { status: 200, json: { ok: true, stav: 'zapsano', zdroj: 'zalozena', duvod: '', upozorneni: 'kontaktni-osoba',
    pdOrgVitez: { deal: '4321', org: 789, stav: 'zapsano', zdroj: 'zalozena', kdy: '2026-11-16T09:00:00.000Z', kdo: 'prodal@priklad.cz', nazev: 'Druhý zákazník s.r.o.' },
    razitko: 'r-nove-1' } };
});
await klik('#kalk-hlavicka .vz-org-upoz button[data-vz-org="znovu"]');
await p.waitForTimeout(200);
{
  const s = await p.evaluate(() => ({ d: window.__dotazy, r: ZAK.uloRazitko, ro: ONLINE_STAV.razitko, st: ZAK.pdOrgVitez && ZAK.pdOrgVitez.stav,
    neul: historieNeulozeno(), posl: ONLINE_STAV.posledni === JSON.stringify(ZAK) }));
  test('klik pošle jeden POST /api/pd/organizace { soubor, akce: vitez }', s.d.length === 1 && s.d[0].metoda === 'POST'
    && s.d[0].url === '/api/pd/organizace' && s.d[0].telo && s.d[0].telo.akce === 'vitez' && s.d[0].telo.soubor === 'zkusebni-zakazka.json'
    && Object.keys(s.d[0].telo).length === 2, s.d);
  test('razítko převzato do ZAK.uloRazitko i ONLINE_STAV.razitko', s.r === 'r-nove-1' && s.ro === 'r-nove-1', s);
  test('nový stav převzat (zapsano)', s.st === 'zapsano', s);
  test('zápis serveru není neuložená změna', !s.neul && s.posl, s);
  const u = await upoz();
  test('po zápisu věta o kontaktní osobě místo chyby', u.hlavicka.length === 1 && u.hlavicka[0].veta === VETA && !/nepřepsala/.test(u.hlavicka[0].text), u.hlavicka);
}
/* 200 s ok:false (onlineApi hází) — stav se převezme. */
await zakazka({ org: ORG('chyba', { org: 0 }) });
await p.evaluate(() => {
  window.__dotazy = [];
  window.__odp = { status: 200, json: { ok: false, stav: 'vice', duvod: 'V Pipedrive je víc organizací s tímto IČO.',
    vice: { pocet: 3, nazvy: ['X s.r.o.', 'Y s.r.o.', 'Z s.r.o.'] },
    pdOrgVitez: { deal: '4321', org: 0, stav: 'vice', kdy: '2026-11-16T09:05:00.000Z', kdo: 'prodal@priklad.cz', duvod: 'V Pipedrive je víc organizací s tímto IČO.',
      vice: { pocet: 3, nazvy: ['X s.r.o.', 'Y s.r.o.', 'Z s.r.o.'] } }, razitko: 'r-nove-2' } };
});
await klik('#vzKarta_ock .vz-org-upoz button[data-vz-org="znovu"]');
await p.waitForTimeout(200);
{
  const s = await p.evaluate(() => ({ n: window.__dotazy.length, r: ZAK.uloRazitko, st: ZAK.pdOrgVitez.stav }));
  const t = ((await upoz()).hlavicka[0] || {}).text || '';
  test('200 ok:false (vice): stav i razítko převzaty, upozornění s 3 organizacemi', s.n === 1 && s.r === 'r-nove-2' && s.st === 'vice'
    && /\b3 organizací/.test(t) && t.indexOf('Z s.r.o.') >= 0, { s, t });
}
/* 403 → chyba bez tlačítka; razítko beze změny. */
await p.evaluate(() => { window.__odp = { status: 403, json: { ok: false, chyba: 'Zápis smí jen ten, kdo prodal, autor nebo administrátor' } }; });
await p.evaluate(() => vzPoProdejiPd(ZAK));
{
  const u = await upoz();
  const h = u.hlavicka[0] || { text: '', tl: [] };
  test('403: chyba serveru bez tlačítka', u.hlavicka.length === 1 && h.druh === 'odmitnuto' && h.text.indexOf('Zápis smí jen ten') >= 0 && h.tl.length === 0, h);
  test('403: razítko beze změny', await p.evaluate(() => ZAK.uloRazitko === 'r-nove-2' && ONLINE_STAV.razitko === 'r-nove-2'));
}
await p.evaluate(() => { window.__odp = { status: 503, json: { ok: false, chyba: 'Pipedrive není nastavený' } }; });
const vrat = await p.evaluate(async () => { try { return { r: await vzPoProdejiPd(ZAK), hodilo: false }; } catch (e) { return { hodilo: true }; } });
{
  const h = (await upoz()).hlavicka[0] || { text: '', tl: [] };
  test('503: chyba s tlačítkem, nic se nehází ven', !vrat.hodilo && h.text.indexOf('Pipedrive není nastavený') >= 0 && h.tl.length === 1, { vrat, h });
}
/* Výjimka sítě: nic se nehází. */
await p.evaluate(() => { window.__odp = { status: 0, json: {} }; });
const vrat2 = await p.evaluate(async () => { try { await vzPoProdejiPd(ZAK); return false; } catch (e) { return true; } });
test('chyba sítě se nehází ven', !vrat2);

/* ---------- 7: kdy se nevolá ---------- */
await zakazka({ prodana: false });
await p.evaluate(() => { window.__dotazy = []; return vzPoProdejiPd(ZAK); });
test('neprodaná zakázka: vzPoProdejiPd nic nevolá', await p.evaluate(() => window.__dotazy.length === 0));
await zakazka({ dva: false });
await p.evaluate(() => { window.__dotazy = []; return vzPoProdejiPd(ZAK); });
test('jeden zákazník: vzPoProdejiPd nic nevolá', await p.evaluate(() => window.__dotazy.length === 0));
await zakazka({});
await p.evaluate(() => { ONLINE_STAV.soubor = ''; window.__dotazy = []; return vzPoProdejiPd(ZAK); });
test('zakázka bez online souboru: vzPoProdejiPd nic nevolá', await p.evaluate(() => window.__dotazy.length === 0));
await p.evaluate(() => { __online('prodal@priklad.cz', 'Obchodník'); });
test('vzPoProdejiPd se nikde automaticky nevolá (háček E4 ještě není)', await p.evaluate(() => {
  const src = [...document.scripts].map(s => s.textContent).join('\n');
  return (src.match(/vzPoProdejiPd\(/g) || []).length === 2;   // definice + onclick tlačítka
}));

/* ---------- 6: VYP a jeden zákazník ---------- */
const rozdil = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return [a.slice(i, i + 120), b.slice(i, i + 120)]; };
/* Hlavička OCK s maskovaným počítadlem kroků Zpět / Znovu (každé __zakazka přidá krok). */
const hlavickaHtml = () => p.evaluate(() => {
  const el = document.getElementById('kalk-hlavicka');
  if (!el) return '';
  const c = el.cloneNode(true);
  c.querySelectorAll('.jsHistZpet, .jsHistZnovu').forEach(e => { e.removeAttribute('title'); e.removeAttribute('disabled'); e.textContent = ''; });
  return c.innerHTML;
});
for (const stav of ['zapsano', 'chyba']) {
  await p.evaluate(() => { window.__vzZap = false; });
  await zakazka({});
  const bez = await hlavickaHtml();
  await zakazka({ org: ORG(stav, { org: 0, duvod: 'Důvod.' }) });
  const s = await hlavickaHtml();
  test(`VYP + víc zákazníků (${stav}): žádné upozornění, hlavička znak po znaku jako bez pdOrgVitez`, (await upoz()).vsechny === 0 && s === bez,
    { n: (await upoz()).vsechny, rozdil: rozdil(bez, s) });
  await p.evaluate(() => { window.__vzZap = true; });
  await zakazka({ dva: false });
  const bez1 = await hlavickaHtml();
  await zakazka({ dva: false, org: ORG(stav, { org: 0, duvod: 'Důvod.' }) });
  const s1 = await hlavickaHtml();
  test(`ZAP + jeden zákazník (${stav}): žádné upozornění, hlavička znak po znaku jako bez pdOrgVitez`, (await upoz()).vsechny === 0 && s1 === bez1,
    { n: (await upoz()).vsechny, rozdil: rozdil(bez1, s1) });
}

test('žádná chyba stránky (pageerror)', chyby.length === 0, chyby);
await b.close();
console.log(`\nVýsledek: ${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
