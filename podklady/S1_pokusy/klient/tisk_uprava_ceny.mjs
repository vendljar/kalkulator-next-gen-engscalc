/* Pokus: tiskový náhled CN OCK (nabidkaOckDokument) dovolí přepsat cenu ve
 * vytištěném dokumentu („Upravit text před tiskem"). Zámek varianty (Z1)
 * se při tisku vytvoří s původním výsledkem a o úpravě nic neví. */
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
const ZC = createRequire(import.meta.url)('../../../src/zkusebni_cenik.js');
const KDE = new URL('../../../dist/kalkulacka.html', import.meta.url).href;
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
const p = await ctx.newPage();
await p.goto(KDE);
await p.waitForFunction(() => typeof NAST !== 'undefined' && typeof render === 'function', null, { timeout: 15000 });
await p.waitForTimeout(300);
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); Object.assign(DEFAULT_CENIK_PROJ, cp);
  ZAK = novaZakazka(); syncVarianta();
  NAST.jeAdmin = false; NAST.nahledRole = 'Obchodník';
  window.__hl = []; window.potvrd = () => Promise.resolve(true); window.hlaska = (t) => { window.__hl.push(String(t)); return Promise.resolve(); };
  const bez = o => { if (o) { delete o.ukazkove; delete o.prazdny; } };
  [DEFAULT_CENIK, DEFAULT_CENIK_PROJ, C, PC, NAST.slevy, NAST.firma].forEach(bez);
  ZAK.varianty.forEach(v => { bez(v.data.cenik); bez(v.data.proj.cenik); });
  ZAK.cislo = '2026 - OPR - CN - 0901'; ZAK.nazevAkce = 'Zkouška'; ZAK.objednatel = 'Zkušební zákazník'; ZAK.adresa = 'Ulice 1';
  Object.assign(Z, { prejezd: 2.7, zdvih: 12, prohluben: 1.05, sirka: 1.51, hloubka: 1.515 });
  render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
const okP = ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null); await p.evaluate(() => (0, eval)('nabidkaOckDokument()')); const okno = await okP; if (!okno) { console.log('nenaotevřeno, hlášky:', await p.evaluate(() => window.__hl)); process.exit(3); }
await okno.waitForLoadState('domcontentloaded'); await okno.waitForTimeout(400);
const r = await okno.evaluate(() => {
  const dok = document.getElementById('dok');
  const pred = dok.innerText;
  const m = pred.match(/\d{1,3}(?:[  ]\d{3})+(?:,\d+)?\s*Kč/);
  tiskEditace(true);                                   // tlačítko „Upravit text před tiskem"
  const walker = document.createTreeWalker(dok, NodeFilter.SHOW_TEXT);
  let n, zmeneno = 0;
  while ((n = walker.nextNode())) if (m && n.nodeValue.includes(m[0])) { n.nodeValue = n.nodeValue.split(m[0]).join('1 Kč'); zmeneno++; }
  window.dispatchEvent(new Event('beforeprint'));     // Ctrl+P → tiskZamkni → opener.zamekPoTisku
  return { cenaPuvodne: m && m[0], zmenenoUzlu: zmeneno, vDokumentuTed: dok.innerText.includes('1 Kč'), stav: document.getElementById('tiskStav').textContent };
});
await okno.waitForTimeout(300);
const z = await p.evaluate(() => {
  const v = aktivniVarianta(ZAK); const zm = v.zamek || {};
  return { zamceno: !!zm.zamceno, typ: zm.typ, tisky: zm.tisky, cenaVZamku: zm.vysledek && zm.vysledek.ock && zm.vysledek.ock.souhrn && zm.vysledek.ock.souhrn.zakladCena,
           stopaUpravy: JSON.stringify(zm).includes('uprav') };
});
console.log('náhled:', JSON.stringify(r));
console.log('zámek :', JSON.stringify(z));
console.log(r.vDokumentuTed && z.zamceno && !z.stopaUpravy
  ? 'VÝSLEDEK: vytištěná CN nese ručně změněnou cenu, zámek drží původní výsledek a o úpravě nemá záznam'
  : 'VÝSLEDEK: neprokázáno');
await b.close();
