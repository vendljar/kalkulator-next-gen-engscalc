/* SEC-M klient, bod 10 — úvodní fotka nabídky (zak.uvodniFoto / uvodniFotoProj)
 * s CIZÍ adresou místo data: URL.
 *   1) server: obchodník uloží zakázku s uvodniFoto = 'https://zlo.example/…' —
 *      projde? (logo firmy a podpis server na data:image omezuje, fotku ne)
 *   2) prohlížeč: kolega zakázku otevře a zobrazí podklady nabídky —
 *      a) web s produkční CSP (img-src 'self' data: blob:) → požadavek ven?
 *      b) soubor kalkulacka.html otevřený z disku (nouzový režim, bez CSP),
 *         zakázka načtená importem → požadavek ven? (sledovací pixel: IP, čas)
 *   3) Word: dataUrlNaBajty bere jen data:image — cizí adresu zahodí.
 * Úložiště v paměti, smyšlené účty, provoz ven zachycený routou (nic neodejde).
 * Spuštění z kořene repa:
 *   KNG_DIST=<cesta>/dist/kalkulacka.html node podklady/SECM_pokusy/klient/foto_externi.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { F, req, priprav, pripravData, zakazkaCislo, pamet } from '../../S1_pokusy/server/harness.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const KOREN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const DIST = process.env.KNG_DIST || path.join(KOREN, 'dist/kalkulacka.html');
const HTML = fs.readFileSync(DIST);
const CSP = /Content-Security-Policy\s*=\s*"([^"]+)"/.exec(fs.readFileSync(path.join(KOREN, 'netlify.toml'), 'utf8'))[1];
const URL_FOTO = 'https://zlo.example/pixel.png?kdo=otevrel';

/* 1) server */
const U = await priprav(); await pripravData(U.admin.cookie);
const z = zakazkaCislo('2026 - OPR - CN - 0902');
z.uvodniFoto = URL_FOTO; z.uvodniFotoNazev = 'foto.png';
const r = await req(F.zakazky, 'POST', '/api/zakazky', { zakazka: z }, U.obch.cookie);
const t = await r.json();
const ulozena = [...pamet.entries()].find(([k]) => /^zakazky\/z\/2026-OPR-CN-0902/.test(k));
const fotoNaServeru = ulozena ? JSON.parse(ulozena[1]).uvodniFoto : null;
console.log('server: HTTP', r.status, t.ok ? 'uloženo' : t.chyba, '| uvodniFoto v úložišti:', fotoNaServeru);
const zak = ulozena ? JSON.parse(ulozena[1]) : z;

/* 2) prohlížeč */
const b = await chromium.launch();
async function zkus(rezim) {
  const venku = [];
  const ctx = await b.newContext();
  await ctx.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.protocol === 'file:' || u.protocol === 'data:' || u.protocol === 'blob:') return route.continue();
    if (u.hostname === 'kng.test' && !u.pathname.startsWith('/api/'))
      return route.fulfill({ status: 200, body: HTML, headers: { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': CSP } });
    if (u.hostname === 'kng.test') return;
    venku.push(route.request().resourceType() + ' ' + u.href); return route.abort();
  });
  const p = await ctx.newPage();
  await p.goto(rezim === 'web' ? 'http://kng.test/kalkulacka.html' : 'file://' + DIST);
  await p.waitForFunction(() => typeof render === 'function' && typeof importZakazka === 'function', null, { timeout: 20000 });
  await p.waitForTimeout(300);
  const info = await p.evaluate(async (zz) => {
    window.dokumentZabrana = () => ''; window.potvrd = async () => true; window.hlaska = async () => {}; window.volba = async (t, m) => (m && m[0] && m[0].kod) || null;
    ZAK = importZakazka(zz); syncVarianta();
    for (const tab of ['zakazka', 'kalk', 'spec']) { try { prepniTab(tab); render(); } catch (e) {} await new Promise(r => setTimeout(r, 80)); }
    const ramy = [];
    window.open = () => { const f = document.createElement('iframe'); f.style.display = 'none'; document.body.appendChild(f); ramy.push(f); return f.contentWindow; };
    try { await nabidkaNahled(); } catch (e) {}
    await new Promise(r => setTimeout(r, 600));
    const imgs = [document, ...ramy.map(f => f.contentDocument)].flatMap(d => [...d.querySelectorAll('img')]).map(i => i.getAttribute('src')).filter(s => /zlo\.example/.test(s || ''));
    let docxFoto = null;
    try { docxFoto = typeof uvodniFotoObrazky === 'function' && typeof dataUrlNaBajty === 'function' ? dataUrlNaBajty(uvodniFotoObrazky(ZAK, 'ock').UVODNI_FOTO) : 'n/a'; } catch (e) { docxFoto = 'chyba ' + e.message; }
    return { imgs: imgs.length, docxFoto };
  }, zak);
  await p.waitForTimeout(500);
  await ctx.close();
  return { venku, info };
}
const web = await zkus('web'), soubor = await zkus('soubor');
await b.close();
console.log('web s CSP     :', JSON.stringify(web));
console.log('soubor bez CSP:', JSON.stringify(soubor));
const pixelWeb = web.venku.some(v => /zlo\.example/.test(v)), pixelSoubor = soubor.venku.some(v => /zlo\.example/.test(v));
console.log(`VÝSLEDEK: server cizí adresu fotky ${fotoNaServeru === URL_FOTO ? 'PŘIJAL' : 'odmítl'}; web s CSP: požadavek ven ${pixelWeb ? 'ODEŠEL' : 'zablokován'}; `
  + `soubor z disku (bez CSP): požadavek ven ${pixelSoubor ? 'ODEŠEL (sledovací pixel)' : 'neodešel'}; Word fotku s cizí adresou ${soubor.info.docxFoto === null ? 'zahodí' : 'vloží?'}`);
process.exit(0);
