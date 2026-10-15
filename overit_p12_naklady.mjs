/* Kontrola v prohlížeči: P12 / roadmapa #369 — obchodník nevidí náklady
 * (v15.10.3, zadání podklady/PROMPT_p12_naklady.md).
 *
 * Co se zkouší na sestavené aplikaci se skutečnými serverovými funkcemi
 * (most `page.route`, jako overit_role_nahled.mjs):
 *   – Kalkulace PROJ: ve výchozí matici vidí nákladovou sazbu všichni;
 *     když ji administrátor obchodníkům skryje (Nastavení → Zobrazení),
 *     vidí obchodník prodejní sazbu (s přirážkou sekce) a souhrn bez
 *     nákladů; tabulka zůstává obdélníková; vlastní fixní položku zadá dál;
 *   – kontroly.cisla: právo konečně rozhoduje (obchodník s lištou marže
 *     čísla v kontrolách nevidí, s kontroly.cisla ano; vedoucí beze změny);
 *   – Uložit do souboru: obchodník dostane soubor bez ceníků, administrátor
 *     celý; soubor jde načíst zpět a cena se nezmění;
 *   – ceník ze serveru: obchodník bez historie verzí, administrátor s ní;
 *   – OTISK NABÍDKY: tatáž zakázka dává u obchodníka i administrátora
 *     stejný výpočet i stejná data nabídky PROJ a OCK.
 *
 * Pojistka: nad v14.10.8 (origin/test 5a42369, před opravou) 21 OK / 8 FAIL
 * (historie, prodejní sazba ×2, souhrn, popisek vlastní položky,
 * kontroly.cisla, soubor ×2), po opravě 29 OK / 0 FAIL. Výchozí stav
 * (obchodník náklady vidí — pokyn J. V. 15. 10. 2026), chování administrátora
 * a vedoucího i otisk nabídky prošly už před opravou — to je záměr.
 *
 * Spouští se s ADMIN_EMAIL v prostředí (spust_testy.sh ji nastavuje).
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_p12_naklady.mjs
 */
process.env.TAJEMSTVI_RELACE = 'zkusebni-tajemstvi-jen-pro-kontrolu-p12';
process.env.ADMIN_INIT_HESLO = 'Zkusebni.Heslo.123';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) {
    return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
      .map(x => x.slice(nazev.length + 1));
  },
});

import { createRequire } from 'module';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import path from 'path';
import zdravi from './netlify/functions/zdravi.mjs';
import ja from './netlify/functions/ja.mjs';
import prihlaseni from './netlify/functions/prihlaseni.mjs';
import odhlaseni from './netlify/functions/odhlaseni.mjs';
import uzivatele from './netlify/functions/uzivatele.mjs';
import program from './netlify/functions/program.mjs';
import zakazky from './netlify/functions/zakazky.mjs';
import firma from './netlify/functions/firma.mjs';
import zobrazeni from './netlify/functions/zobrazeni.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_p12_naklady.mjs');
  process.exit(2);
}

const FUNKCE = {
  '/api/zdravi': zdravi, '/api/ja': ja, '/api/prihlaseni': prihlaseni,
  '/api/odhlaseni': odhlaseni, '/api/uzivatele': uzivatele,
  '/api/program': program, '/api/zakazky': zakazky,
  '/api/firma': firma, '/api/zobrazeni': zobrazeni,
};

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info)).slice(0, 300)); }
};

const html = readFileSync(path.resolve('dist/kalkulacka.html'));
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ADRESA = 'http://127.0.0.1:' + server.address().port;

const prohlizec = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await prohlizec.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();
const chyby = [];
page.on('pageerror', e => chyby.push(String(e)));

let cookieJar = '';
await page.route('**/api/**', async route => {
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

const dlgStub = async () => page.evaluate(() => {
  window.potvrd = () => Promise.resolve(true);
  window.hlaska = () => Promise.resolve();
  window.dotaz = (t, v) => Promise.resolve(v == null ? '' : v);
});
const prihlas = async (email, heslo) => {
  await page.fill('#onlineEmail', email);
  await page.fill('#onlineHeslo', heslo);
  await page.click('#prihlaseni-box >> text=Přihlásit');
  await page.waitForFunction(() => { try { return !!ONLINE_STAV.ja; } catch (e) { return false; } }, null, { timeout: 10000 });
  await page.waitForTimeout(600);
  await dlgStub();
};
const odhlas = async () => {
  await page.evaluate(() => onlineOdhlas());
  await page.waitForFunction(() => { try { return ONLINE_STAV.ja === null; } catch (e) { return false; } });
  await page.reload();
  await page.waitForFunction(() => typeof window.render === 'function');
  await page.waitForTimeout(400);
  await dlgStub();
};

/* Stav Kalkulace PROJ, jak ho vidí přihlášená role. */
const stavProj = () => page.evaluate(() => {
  prepniTab('proj'); render();
  const tabulky = [...document.querySelectorAll('#page-proj table')];
  const kalk = tabulky.find(t => [...t.querySelectorAll('th')].some(h => h.textContent.trim() === 'Položka'));
  const souhrn = tabulky.find(t => [...t.querySelectorAll('th')].some(h => h.textContent.trim() === 'Sekce'));
  const sirka = (tr) => [...tr.children].reduce((a, c) => a + (c.colSpan || 1), 0);
  const thK = kalk ? [...kalk.rows[0].children].map(x => x.textContent.trim()) : [];
  const thS = souhrn ? [...souhrn.rows[0].children].map(x => x.textContent.trim()) : [];
  const doprava = kalk ? [...kalk.rows].find(r => /^Doprava/.test((r.cells[0] || {}).textContent || '')) : null;
  return {
    thK, thS,
    obdelnik: !!kalk && [...kalk.rows].every(r => sirka(r) === sirka(kalk.rows[0])),
    obdelnikS: !!souhrn && [...souhrn.rows].every(r => sirka(r) === sirka(souhrn.rows[0])),
    dopravaBunek: doprava ? sirka(doprava) : null, sirkaHlavicky: kalk ? sirka(kalk.rows[0]) : null,
    sazbaZCeniku: (() => { try { return num(PC.sazby && Object.values(PC.sazby)[0]); } catch (e) { return ''; } })(),
    text: kalk ? kalk.textContent : '',
  };
});
/* Otisk ceny a dokumentů nad otevřenou zakázkou. */
const otisk = () => page.evaluate(() => {
  const v = aktivniVarianta(ZAK);
  const o = { proj: vypocetProjAkt().souhrn, ock: vypocetAkt().souhrn };
  try { o.nabProj = nabidkaProjData(ZAK, v, 'cz'); } catch (e) { o.nabProjChyba = String(e); }
  try { o.nabOck = nabidkaData(ZAK, v, JEKLY, 'cz'); } catch (e) { o.nabOckChyba = String(e); }
  /* Zpracovatel nabídky je přihlášená osoba — u obchodníka a administrátora
   * se liší záměrně; s cenou ani náklady nesouvisí. */
  [o.nabProj, o.nabOck].forEach(n => { const ph = n && n.placeholders;
    if (ph) Object.keys(ph).forEach(k => { if (/ZPRAC/.test(k)) delete ph[k]; }); });
  return JSON.stringify(o);
});
/* Obsah souboru z „Uložit do souboru" (Blob se zachytí, nic se nestahuje). */
const ulozenySoubor = () => page.evaluate(() => {
  let txt = null;
  const B = window.Blob, klik = HTMLAnchorElement.prototype.click;
  window.Blob = function (casti, o) { txt = casti.join(''); return new B(casti, o); };
  HTMLAnchorElement.prototype.click = function () {};
  try { ulozZakazku(); } finally { window.Blob = B; HTMLAnchorElement.prototype.click = klik; }
  return txt;
});

await page.goto(ADRESA);
await page.waitForFunction(() => typeof window.render === 'function');
await page.waitForTimeout(500);
await dlgStub();

/* ---------- 1) administrátor ---------- */
await prihlas('spravce@priklad.cz', 'Zkusebni.Heslo.123');
/* Dvě verze ceníku, ať má server historii. */
const zverejneno = await page.evaluate(async () => {
  const c = JSON.parse(JSON.stringify(DEFAULT_CENIK)), p = JSON.parse(JSON.stringify(DEFAULT_CENIK_PROJ));
  /* Ceník ze sestavení má sazby PROJ nulové — prodejní sazba by nešla ověřit. */
  p.sazby = Object.assign({}, p.sazby, { projektant: 1000, statik: 1000, zamereni: 1000 }); p.marze = 0.2;
  const a = await onlineApi('/api/program', { cenik: c, cenikProj: p, poznamka: 'p12 v1' });
  c.marze = (+c.marze || 0) + 0.01;
  const b = await onlineApi('/api/program', { cenik: c, cenikProj: p, poznamka: 'p12 v2' });
  await onlineNactiProgram();
  return { a: a.ok, b: b.ok, hist: (ONLINE_STAV.db && ONLINE_STAV.db.historie || []).length };
});
test('administrátor má ze serveru historii ceníku', zverejneno.a && zverejneno.b && zverejneno.hist === 1, zverejneno);

await page.evaluate(() => { otevriNastaveni(); nastPanel('uzivatele'); });
await page.waitForFunction(() => { try { return ONLINE_STAV.uzivateleNacteno; } catch (e) { return false; } });
await page.fill('#onlineUzEmail', 'obchodnik@priklad.cz');
await page.fill('#onlineUzJmeno', 'Petr Zkušební');
await page.fill('#onlineUzHeslo', 'ObchodniHeslo1');
await page.click('#nastaveni-panel >> text=Založit účet');
await page.waitForFunction(() => { try { return ONLINE_STAV.uzivatele.length === 2; } catch (e) { return false; } });
await page.evaluate(() => zavriNastaveni());

/* Zakázka s dopravou mimo Prahu a vlastní fixní položkou, ať je co ukazovat. */
await page.evaluate(() => {
  const i = PJ.sekce.findIndex(s => s.doprava);
  if (i >= 0) { PJ.sekce[i].doprava.km = 120; PJ.sekce[i].doprava.mimoPrahu = true; }
  PJ.sekce[0].polozky.push({ nazev: 'Vlastní zkušební položka', typ: 'fix', cena: 4000, vlastni: true });
  PC.sazby = Object.assign({}, PC.sazby, { projektant: 1000, statik: 1000, zamereni: 1000 }); PC.marze = 0.2;
  PJ.sekce.forEach(s => s.polozky.forEach(p => { if (p.typ === 'hod') { p.vyrazeno = false; if (!(+p.hodiny > 0)) p.hodiny = 4; } }));
  Object.assign(aktivniVarianta(ZAK).data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  syncVarianta(); render();
});
const adm = await stavProj();
test('administrátor vidí sloupec Sazba v Kalkulaci PROJ', adm.thK.includes('Sazba Kč/h · fix'), adm.thK);
test('administrátor vidí souhrn PROJ s náklady', adm.thS.join('|') === 'Sekce|Náklad|Přirážka|Doprava|Celkem', adm.thS);
const otiskAdmin = await otisk();
const souborAdmin = await ulozenySoubor();
const sa = JSON.parse(souborAdmin || '{}');
test('administrátor uloží soubor s celými ceníky variant',
  !!sa.varianty && sa.varianty.every(v => v.data.cenik && v.data.proj.cenik && !v.data.cenikVynechan));

/* Vedoucí (náhled role): beze změny proti dnešku. */
const ved = await page.evaluate(() => {
  NAST.nahledRole = 'Vedoucí'; nastSetAdmin(false);
  NAST.zobrazeni = NAST.zobrazeni || {};
  NAST.zobrazeni['marze.lista'] = { 'Obchodník': true, 'Vedoucí': true };
  NAST.zobrazeni['kontroly.cisla'] = { 'Obchodník': false, 'Vedoucí': false };
  const r = { role: zobrazeniRole(), cisla: kontrolySmiCisla() };
  delete NAST.zobrazeni['marze.lista']; delete NAST.zobrazeni['kontroly.cisla'];
  return r;
});
const vedP = await stavProj();
test('vedoucí (výchozí matice) sloupec Sazba vidí dál', ved.role === 'Vedoucí' && vedP.thK.includes('Sazba Kč/h · fix'), { ved, th: vedP.thK });
test('vedoucí vidí dál i souhrn s náklady', vedP.thS.includes('Náklad'), vedP.thS);
test('vedoucí s lištou marže vidí čísla v kontrolách jako dosud', ved.cisla === true, ved);
await page.evaluate(() => { NAST.nahledRole = null; nastSetAdmin(true); render(); });

await odhlas();

/* ---------- 2a) obchodník ve výchozí matici: náklady zatím vidí ----------
 * Pokyn J. V. 15. 10. 2026: „náklady zatím pro obchodníky nechat zobrazené
 * s tím, že je administrátor v budoucnu skryje". */
await prihlas('obchodnik@priklad.cz', 'ObchodniHeslo1');
const vych = await page.evaluate(() => ({ h: (ONLINE_STAV.db && ONLINE_STAV.db.historie || []).length }));
await page.evaluate((t) => { ZAK = StorageAdapter.importuj(t); syncVarianta(); render(); }, souborAdmin);
const obV = await stavProj();
test('výchozí matice: obchodník sloupec Sazba (nákladový) vidí jako dosud', obV.thK.includes('Sazba Kč/h · fix'), obV.thK);
test('výchozí matice: obchodník vidí souhrn s náklady a historii ceníku', obV.thS.includes('Náklad') && vych.h === 1, { th: obV.thS, vych });
const souborObchV = await ulozenySoubor();
test('výchozí matice: obchodník uloží soubor s celými ceníky',
  JSON.parse(souborObchV).varianty.every(v => v.data.cenik && !v.data.cenikVynechan));
await odhlas();

/* ---------- 2b) administrátor obchodníkům náklady skryje ---------- */
await prihlas('spravce@priklad.cz', 'Zkusebni.Heslo.123');
const skryto = await page.evaluate(async () => {
  ZOBR_ULOZ.stav = '';
  zobrSet('naklady.ceniky', 'Obchodník', false);
  for (let i = 0; i < 100 && ZOBR_ULOZ.stav !== 'ulozeno'; i++) await new Promise(r => setTimeout(r, 100));
  const radek = [...document.querySelectorAll('#nastaveni-panel tr, tr')].some(r => /Nákladové sazby PROJ, ceníky v souboru/.test(r.textContent));
  return { stav: ZOBR_ULOZ.stav, radek };
});
test('administrátor skryje náklady obchodníkům v matici zobrazení (uloženo na server)', skryto.stav === 'ulozeno', skryto);
await odhlas();

/* ---------- 2c) obchodník se skrytými náklady ---------- */
await prihlas('obchodnik@priklad.cz', 'ObchodniHeslo1');
const hist = await page.evaluate(() => ({ role: zobrazeniRole(), h: (ONLINE_STAV.db && ONLINE_STAV.db.historie || []).length,
  verze: ONLINE_STAV.db && ONLINE_STAV.db.platny && ONLINE_STAV.db.platny.verze }));
test('obchodník dostane ze serveru platný ceník bez historie verzí', hist.role === 'Obchodník' && hist.verze === 2 && hist.h === 0, hist);

/* Táž zakázka jako u administrátora (načtená z jeho plného souboru). */
await page.evaluate((t) => { ZAK = StorageAdapter.importuj(t); syncVarianta(); render(); }, souborAdmin);
const ob = await stavProj();
test('obchodník NEvidí nákladovou sazbu, místo ní sloupec Prodejní sazba',
  !ob.thK.includes('Sazba Kč/h · fix') && ob.thK.includes('Prodejní sazba Kč/h · cena'), ob.thK);
/* Prodejní sazba = nákladová × (1 + % sekce); nákladová se v buňce neobjeví. */
const sazbaP = await page.evaluate(() => {
  const r = vypocetProjAkt();
  const tab = [...document.querySelectorAll('#page-proj table')].find(t => [...t.querySelectorAll('th')].some(h => h.textContent.trim() === 'Položka'));
  const iSaz = [...tab.rows[0].children].findIndex(x => /Prodejní sazba/.test(x.textContent));
  if (iSaz < 0) return null;
  for (const s of r.sekce) for (const p of s.polozky) {
    if (p.typ !== 'hod' || !(+p.sazbaKc > 0) || p.vyrazeno || !(s.pouzitePct > 0)) continue;
    const radek = [...tab.rows].find(x => x.cells[0] && x.cells[0].textContent.trim().startsWith(p.nazev));
    if (!radek) continue;
    const ocek = num(Math.round(p.sazbaKc * (1 + s.pouzitePct / 100)));
    return { bunka: radek.cells[iSaz].textContent.trim(), ocek, naklad: num(p.sazbaKc) };
  }
  return { dbg: r.sekce.map(s => [s.pouzitePct, s.polozky.filter(p => p.typ === 'hod').map(p => [p.nazev, p.sazbaKc, p.vyrazeno]).slice(0, 2)]).slice(0, 3) };
});
test('ve sloupci je prodejní sazba (s přirážkou sekce), ne nákladová',
  !!sazbaP && sazbaP.bunka === sazbaP.ocek && sazbaP.bunka !== sazbaP.naklad, sazbaP);
test('tabulka kalkulace PROJ zůstává obdélníková', ob.obdelnik);
test('souhrn PROJ ukazuje obchodníkovi jen Sekce a Celkem', ob.thS.join('|') === 'Sekce|Celkem', ob.thS);
test('souhrn PROJ zůstává obdélníkový', ob.obdelnikS);
test('řádek dopravy má stejnou šířku jako hlavička',
  ob.dopravaBunek === ob.sirkaHlavicky, { d: ob.dopravaBunek, h: ob.sirkaHlavicky });
test('obchodník nevidí náklad ani přirážku (jako dosud)', !ob.thK.includes('Náklad') && !ob.thK.some(t => /Přirážka/.test(t)), ob.thK);

/* Vlastní fixní položku obchodník zadat musí dál. */
const vlastni = await page.evaluate(() => {
  const tab = [...document.querySelectorAll('#page-proj table')].find(t => [...t.querySelectorAll('th')].some(h => h.textContent.trim() === 'Položka'));
  const radek = [...tab.rows].find(r => r.querySelector('input.nazev-ed') && r.querySelector('input.nazev-ed').value === 'Vlastní zkušební položka');
  const vstup = radek && [...radek.querySelectorAll('input[type=number]')].pop();
  if (!vstup) return { je: false };
  const pred = vypocetProjAkt().souhrn.celkem;
  vstup.value = '5000'; vstup.dispatchEvent(new Event('change'));
  const po = vypocetProjAkt().souhrn.celkem;
  const v = { je: true, popisek: /před přirážkou/.test(radek.textContent), zmena: po > pred };
  PJ.sekce[0].polozky[PJ.sekce[0].polozky.length - 1].cena = 4000; syncVarianta(); render();
  return v;
});
test('obchodník vlastní fixní položku dál zadá (pole s popiskem „před přirážkou")',
  vlastni.je && vlastni.popisek && vlastni.zmena, vlastni);

/* OTISK: tatáž data → tatáž cena i data dokumentů jako u administrátora. */
const otiskObch = await otisk();
const rozdil = (a, b) => { const A = JSON.parse(a), B = JSON.parse(b), out = [];
  const jdi = (x, y, c) => { if (x && y && typeof x === 'object' && typeof y === 'object') { new Set([...Object.keys(x), ...Object.keys(y)]).forEach(k => jdi(x[k], y[k], c + '.' + k)); }
    else if (JSON.stringify(x) !== JSON.stringify(y)) out.push(c + ': ' + JSON.stringify(x) + ' ≠ ' + JSON.stringify(y)); };
  jdi(A, B, ''); return out; };
test('otisk výpočtu a dat nabídky (PROJ i OCK) je u obchodníka stejný jako u administrátora',
  otiskObch === otiskAdmin && !/Chyba"/.test(otiskObch), rozdil(otiskObch, otiskAdmin).slice(0, 8));

/* kontroly.cisla konečně rozhoduje. */
const kc = await page.evaluate(() => {
  NAST.zobrazeni = NAST.zobrazeni || {};
  NAST.zobrazeni['marze.lista'] = { 'Obchodník': true, 'Vedoucí': false };
  NAST.zobrazeni['kontroly.cisla'] = { 'Obchodník': false, 'Vedoucí': false };
  const jenMarze = kontrolySmiCisla();
  NAST.zobrazeni['kontroly.cisla'] = { 'Obchodník': true, 'Vedoucí': false };
  const sPravem = kontrolySmiCisla();
  delete NAST.zobrazeni['marze.lista']; delete NAST.zobrazeni['kontroly.cisla'];
  return { jenMarze, sPravem, vychozi: kontrolySmiCisla() };
});
test('obchodník s lištou marže, ale bez kontroly.cisla čísla v kontrolách nevidí', kc.jenMarze === false, kc);
test('s přiděleným kontroly.cisla je vidí', kc.sPravem === true, kc);
test('ve výchozí matici je nevidí', kc.vychozi === false, kc);

/* Soubor bez ceníků — a zpátky. */
const souborObch = await ulozenySoubor();
const so = JSON.parse(souborObch || '{}');
test('obchodník uloží soubor bez ceníků rozpracovaných variant',
  !!so.varianty && so.varianty.every(v => v.data.cenik === undefined && v.data.proj.cenik === undefined && v.data.cenikVynechan),
  so.varianty && Object.keys(so.varianty[0].data));
/* Soubor nese jen odchylky od platného ceníku — pár listů z celého ceníku. */
const cenikVSouboru = await page.evaluate((t) => {
  const listy = (x) => (x && typeof x === 'object' && !Array.isArray(x)) ? Object.values(x).reduce((a, y) => a + listy(y), 0) : 1;
  const d = cenikDnesniProVariantu(aktivniVarianta(ZAK));
  const v = JSON.parse(t).varianty[0].data.cenikVynechan || { rozdil: [] };
  return { listuCeniku: listy(d.cenik) + listy(d.proj.cenik), odchylek: v.rozdil.length,
           vynechan: !!JSON.parse(t).varianty[0].data.cenikVynechan, cesty: v.rozdil.map(x => x.c.join('.')).slice(0, 6) };
}, souborObch);
test('soubor obchodníka nese jen odchylky (zakázková přirážka), ne ceník',
  cenikVSouboru.vynechan && cenikVSouboru.listuCeniku > 50 && cenikVSouboru.odchylek <= 3, cenikVSouboru);
const zpet = await page.evaluate((t) => { ZAK = StorageAdapter.importuj(t); syncVarianta(); render();
  const v = aktivniVarianta(ZAK); return { ma: !!(v.data.cenik && v.data.proj.cenik), vyn: !!v.data.cenikVynechan }; }, souborObch);
test('soubor obchodníka jde načíst zpět (ceník doplněn z platného)', zpet.ma && !zpet.vyn, zpet);
const otiskZpet = await otisk();
test('otisk výpočtu a nabídky po uložení a načtení souboru je stejný', otiskZpet === otiskAdmin, rozdil(otiskZpet, otiskAdmin).slice(0, 8));

test('žádná chyba JavaScriptu', chyby.length === 0, chyby.slice(0, 2).join(' | '));

await prohlizec.close();
server.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
