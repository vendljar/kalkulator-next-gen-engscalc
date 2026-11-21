/* PoC čočky XS (audit 20. 11. 2026): „obarvení" odpovědí serveru.
 *
 * Skutečné serverové funkce běží v Node nad paměťovým úložištěm (most
 * page.route). Po založení dat (účty, uložená zakázka) se zapne obarvení:
 * KAŽDÝ řetězec (v druhém běhu i každé číslo) v JSON odpovědi /api/* dostane
 * příponu s neškodným payloadem (zavolá jen window.__x(N)). Administrátor
 * pak projde záložky, všechna Nastavení (Uživatelé s přítomností #ON, Firma,
 * Šablony, Slovník, Analytika, Controlling…), seznam zakázek, schvalování,
 * zákazníky, otisky, obnovu a otevře uloženou zakázku.
 * Odpovídá to nejhoršímu případu: server pustí do úložiště cokoli. Kde se
 * payload spustí, je v klientu vložení HTML bez escapování.
 *
 * Bez sítě. Spuštění z kořene repa:
 *   KNG_DIST=<dist/kalkulacka.html> node podklady/audit_2026-11-20/poc_XS_odpovedi_serveru.mjs
 * Výsledek: „ZRANITELNÉ" (seznam: adresa API + cesta v odpovědi) / „ODOLNÉ".
 */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-harness';
process.env.ADMIN_INIT_HESLO = 'Testovaci.Heslo.123';
process.env.ADMIN_EMAIL = 'spravce.xs@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
import { createRequire } from 'module';
import { createServer } from 'http';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
const require = createRequire(path.resolve('package.json'));
const { chromium } = require('playwright');
const ZC = require(path.resolve('src/zkusebni_cenik.js'));
const FUNKCE = {};
for (const f of readdirSync(path.resolve('netlify/functions'))) {
  if (/^(pd_|zaloha_nocni|zaloha_disk|vypocet)/.test(f)) continue;   // Pipedrive a disk potřebují síť — mimo tento PoC
  try { const m = await import(pathToFileURL(path.resolve('netlify/functions', f)).href); if (m.config && m.config.path) FUNKCE[m.config.path] = m.default; } catch (e) { console.log('INFO funkce ' + f + ' se nenačetla: ' + e.message.slice(0, 80)); }
}
const html = readFileSync(path.resolve(process.env.KNG_DIST || 'dist/kalkulacka.html'));
const CSP = (readFileSync(path.resolve('netlify.toml'), 'utf8').match(/Content-Security-Policy = "([^"]+)"/) || [])[1] || '';
const server = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': CSP }); res.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ADRESA = 'http://127.0.0.1:' + server.address().port;

const REG = [];
const pay = n => `');__x(${n});//'"></textarea></title></style></scr` + `ipt><img src=x onerror=__x(${n})>`;
let OBARVI = null;   // null | { rezim: 'texty'|'cisla', nech: RegExp }
function obarvi(o, kde, cfg) {
  for (const k of Object.keys(o)) {
    const v = o[k], c2 = kde + (Array.isArray(o) ? '[]' : '.' + k);
    if (v && typeof v === 'object') { obarvi(v, c2, cfg); continue; }
    if (cfg.nech.test(k)) continue;
    if (cfg.rezim === 'texty' && typeof v === 'string' && !/^data:/.test(v)) { let n = REG.indexOf(c2); if (n < 0) n = REG.push(c2) - 1; o[k] = v + pay(n); }
    if (cfg.rezim === 'cisla' && typeof v === 'number') { let n = REG.indexOf(c2); if (n < 0) n = REG.push(c2) - 1; o[k] = String(v) + pay(n); }
  }
}
const bezRetezcu = s => { let out = '', q = null; for (let i = 0; i < s.length; i++) { const ch = s[i];
  if (q) { if (ch === '\\') i++; else if (ch === q) q = null; continue; } if (ch === '"' || ch === "'" || ch === '`') { q = ch; continue; } out += ch; } return out; };

const b = await chromium.launch({ args: ['--no-sandbox'] });
async function beh(popis, cfg) {
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 }, locale: 'cs-CZ' });
  const page = await ctx.newPage();
  page.on('dialog', d => d.dismiss().catch(() => {}));
  const volana = new Set();
  let cookieJar = '';
  await page.route('**/api/**', async route => {
    const r = route.request(); const url = new URL(r.url()); const fn = FUNKCE[url.pathname];
    if (!fn) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"ok":false}' });
    const init = { method: r.method(), headers: { cookie: cookieJar } };
    if (r.method() === 'POST') { init.body = r.postData() || ''; init.headers['content-type'] = 'application/json'; }
    const odp = await fn(new Request(r.url(), init));
    const setc = odp.headers.get('set-cookie'); if (setc) cookieJar = setc.split(';')[0];
    let text = await odp.text();
    if (OBARVI) { try { const j = JSON.parse(text); obarvi(j, url.pathname + (r.method() === 'POST' ? ' POST' : ''), OBARVI); text = JSON.stringify(j); volana.add(url.pathname); } catch (e) { /* není JSON */ } }
    route.fulfill({ status: odp.status, contentType: 'application/json; charset=utf-8', body: text });
  });
  OBARVI = null;
  await page.goto(ADRESA);
  await page.waitForFunction(() => typeof window.render === 'function');
  await page.waitForTimeout(400);
  await page.fill('#onlineEmail', process.env.ADMIN_EMAIL); await page.fill('#onlineHeslo', process.env.ADMIN_INIT_HESLO);
  await page.evaluate(() => onlinePrihlas());   // ne kliknutím: u staršího sestavení (main) leží přes formulář lišta „nová verze“
  await page.waitForFunction(() => { try { return !!(ONLINE_STAV.ja && ONLINE_STAV.ja.email); } catch (x) { return false; } });
  await page.waitForTimeout(500);
  /* ---- data bez obarvení ---- */
  const zalozeno = await page.evaluate(async ([c, cp]) => {
    window.potvrd = () => Promise.resolve(true); window.hlaska = () => Promise.resolve();
    const out = {};
    for (const [e, r] of [['obchodnik.xs@priklad.cz', 'Obchodník'], ['vedouci.xs@priklad.cz', 'Vedoucí']])
      out[e] = (await onlineApi('/api/uzivatele', { akce: 'zaloz', email: e, jmeno: 'Účet XS', role: r, heslo: 'TestovaciHeslo1' })).ok;
    Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny; Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
    ZAK = novaZakazka(); syncVarianta();
    Object.assign(Z, { typSachty: 'exteriérová', profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová'])), zaskleni: 'na terče', sirka: 1.6, hloubka: 2.1, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 4 });
    Object.keys(C).forEach(k => delete C[k]); Object.assign(C, JSON.parse(JSON.stringify(c))); delete C.prazdny; delete C.ukazkove;
    ZAK.cislo = '2026 - OPR - CN - 9941'; ZAK.datum = '2026-11-16'; ZAK.nazevAkce = 'Akce XS'; ZAK.adresa = 'Adresa 5'; ZAK.objednatel = 'Objednatel XS s.r.o.';
    ZAK.ico = '81726350'; ZAK.kontakt = 'Kontakt XS'; ZAK.adresaObjednatele = 'Sidlo 1';
    try { const v = aktivniVarianta(ZAK); v.data.sleva = Object.assign(v.data.sleva || {}, { procenta: 30, stav: 'čeká na schválení', role: 'Obchodník', poznamka: 'prosím' }); } catch (e) {}
    syncVarianta(); render();
    try { await Promise.race([onlineUloz({ ticho: true }), new Promise(r => setTimeout(r, 6000))]); } catch (e) { out.ulozChyba = String(e && e.message || e); }
    out.soubor = ONLINE_STAV.soubor || '';
    try { if (typeof zakaznikUlozZeZakazky === 'function') await zakaznikUlozZeZakazky(); } catch (e) {}
    return out;
  }, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
  const ulozene = [...pamet.keys()].filter(k => k.startsWith('zakazky/z/')).length;
  /* ---- obarvení zapnuto, nové načtení stránky (relace trvá) ---- */
  OBARVI = cfg;
  await page.goto(ADRESA);
  await page.waitForFunction(() => typeof window.render === 'function');
  await page.waitForTimeout(2500);
  const r = await page.evaluate(async () => {
    const HITS = new Set(); window.__x = n => { HITS.add(n); };
    const cekej = ms => new Promise(res => setTimeout(res, ms));
    const pay = n => `'"><img src=x onerror=__x(${n})>`;
    { const d = document.createElement('div'); d.innerHTML = '<span title="x' + pay(999999) + '">'; document.body.appendChild(d); await cekej(150); d.remove(); }
    const kontrola = HITS.has(999999); HITS.delete(999999);
    window.potvrd = () => Promise.resolve(false); window.hlaska = () => Promise.resolve();
    const atributy = [], url = [], chyby = [], kroky = [];
    const sken = (kde) => { kroky.push(kde); document.querySelectorAll('*').forEach(el => { for (const a of el.attributes) {
      const n = a.name.toLowerCase(), v = a.value;
      if (/^on/.test(n) && v.indexOf('__x(') >= 0 && !/^__x\(\d+\)$/.test(v)) atributy.push([kde, n, v]);
      if (/^(href|src|action|formaction)$/.test(n) && /^\s*javascript:/i.test(v)) url.push(kde + ':' + v.slice(0, 80)); } }); };
    const krok = async (kde, fn, ms) => { try { await Promise.race([fn(), cekej(5000)]); } catch (e) { chyby.push(kde + ': ' + String(e && e.message || e).slice(0, 140)); } await cekej(ms || 350); sken(kde); };
    const stav = { ja: ONLINE_STAV.ja ? String(ONLINE_STAV.ja.role).slice(0, 14) : 'nepřihlášen', admin: typeof jeAdminOnline === 'function' && jeAdminOnline(), rejstrik: (ONLINE_STAV.rejstrik || []).length };
    sken('start');
    for (const t of TABY) await krok('záložka ' + t, async () => { prepniTab(t); render(); }, 500);
    await krok('nastavení', async () => otevriNastaveni());
    for (const pn of NAST_PANELY.map(x => x.id)) await krok('nastavení/' + pn, async () => nastPanel(pn), 900);
    await krok('uživatelé znovu (#ON)', async () => { nastPanel('firma'); nastPanel('uzivatele'); await onlineUzivateleNacti(); renderNastaveni(); }, 600);
    if (typeof onlineUzKontaktPanel === 'function') await krok('kontakt účtu', async () => { const u = (ONLINE_STAV.uzivatele || [])[1]; if (u) { onlineUzKontaktPanel(u.email); renderNastaveni(); } });
    await krok('databáze: zakázky', async () => { nastPanel('databaze'); if (typeof onlineNactiRejstrik === 'function') await onlineNactiRejstrik(); renderNastaveni(); }, 700);
    await krok('otisky', async () => { if (typeof onlineOtiskyNacti === 'function') await onlineOtiskyNacti(); renderNastaveni(); }, 600);
    await krok('obnova', async () => { if (typeof onlineObnovaOtevri === 'function') onlineObnovaOtevri(); }, 500);
    try { document.getElementById('nastaveni-overlay').style.display = 'none'; } catch (e) {}
    await krok('zákazníci', async () => { prepniTab('zakaznici'); await zakazniciNacti(); render(); const z = (ZAK_DB.seznam || [])[0]; if (z) { await zakaznikOtevri(z.klic); render(); } }, 700);
    await krok('schvalování cizí', async () => { prepniTab('schvalovani'); if (typeof SCHV_CIZI !== 'undefined') { SCHV_CIZI.vse = true; SCHV_CIZI.rozsah = 'vse'; } if (typeof schvNactiCizi === 'function') await schvNactiCizi(); render(); }, 1200);
    await krok('otevření zakázky', async () => { const z = (ONLINE_STAV.rejstrik || [])[0]; if (z) await onlineOtevri(z.soubor); render(); }, 1200);
    for (const t of TABY) await krok('zakázka ze serveru / ' + t, async () => { prepniTab(t); render(); }, 300);
    await krok('přehled zakázek', async () => { prepniTab('zakazka'); render(); }, 600);
    return { kontrola, hits: [...HITS], atributy, url, chyby, stav, kroky: kroky.length };
  });
  await ctx.close();
  const js = new Set(), rozbite = new Set();
  for (const [kde, n, v] of r.atributy) { const m = bezRetezcu(v).match(/__x\((\d+)\)/g);
    if (m) m.forEach(x => js.add(REG[+x.match(/\d+/)[0]] + ' → ' + kde + ':' + n));
    else { try { new Function(v); } catch (e) { rozbite.add(kde + ' ' + n + '=' + v.slice(0, 150)); } } }
  console.log(`\n== ${popis}: založeno ${JSON.stringify(zalozeno)}, zakázek v úložišti ${ulozene}; po obarvení: role „${r.stav.ja}", admin ${r.stav.admin}, rejstřík ${r.stav.rejstrik}, kroků ${r.kroky}, detekce ${r.kontrola ? 'funguje' : 'NEFUNGUJE'}`);
  console.log('   obarvené adresy: ' + [...volana].sort().join(' '));
  console.log('   spuštěno (HTML): ' + (r.hits.length ? '\n     ' + r.hits.map(n => REG[n]).join('\n     ') : 'nic'));
  console.log('   payload v kódu obsluhy on* / URL: ' + (js.size + r.url.length ? '\n     ' + [...js, ...r.url].join('\n     ') : 'nic'));
  if (rozbite.size) console.log('   rozbitá obsluha (k ruční kontrole):\n     ' + [...rozbite].slice(0, 10).join('\n     '));
  if (r.chyby.length) console.log('   chyby běhu (INFO): ' + r.chyby.slice(0, 10).join(' | '));
  if (!r.kontrola) { console.log('Harness nedetekuje — výsledek je neplatný'); process.exit(2); }
  pamet.clear();
  return r.hits.length + js.size + r.url.length;
}
let n = 0;
n += await beh('texty (role, e-mail a jméno souboru ponechány)', { rezim: 'texty', nech: /^(role|email|soubor)$/ });
n += await beh('texty včetně e-mailu a souboru (role ponechána)', { rezim: 'texty', nech: /^(role)$/ });
n += await beh('čísla → text', { rezim: 'cisla', nech: /^(schema)$/ });
await b.close(); server.close();
console.log('\nVÝSLEDEK: ' + (n ? 'ZRANITELNÉ (' + n + ' míst)' : 'ODOLNÉ — žádný payload z odpovědí serveru se nespustil'));
process.exit(n ? 1 : 0);
