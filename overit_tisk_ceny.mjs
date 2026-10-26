/* overit_tisk_ceny.mjs — ceny v tiskovém náhledu nabídky se ručně nepřepíšou
 *
 * VZNIK (SEC-S3, rozhodnutí J. V. 26. 10. 2026 = A, #517). „Upravit text
 * před tiskem" zapínal contentEditable na celém dokumentu, takže obchodník
 * mohl v náhledu CN přepsat i cenu. Tisk pak variantu zamkl s PŮVODNÍM
 * výsledkem a zákazník dostal jinou částku, než nese zámek, dotisk,
 * controlling i Pipedrive (pokus podklady/S1_pokusy/klient/tisk_uprava_ceny.mjs).
 * Od #517 mají buňky s částkou v náhledu se zámkem (nabidkaTisk,
 * nabidkaProjTisk) contenteditable="false"; ostatní text se upravit dá.
 *
 * Hlídá se (psaním z klávesnice, jak to dělá člověk):
 *  1) CN OCK: psaní do buňky s cenou dokument nezmění, buňka není upravitelná;
 *  2) CN OCK: psaní do běžného textu (odstavec) dál funguje;
 *  3) CN OCK: po „Vrátit původní znění" zůstávají ceny needitovatelné;
 *  4) CN PROJ: buňky s částkou needitovatelné, text upravitelný;
 *  5) náhled bez zámku (krycí list PROJ) zůstává upravitelný celý.
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_tisk_ceny.mjs
 * (pracuje nad dist/kalkulacka.html; ceník je zkušební ze src/zkusebni_cenik.js)
 */
import { chromium } from 'playwright';
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';

const KOREN = fileURLToPath(new URL('.', import.meta.url));
let ok = 0, fail = 0;
const test = (n, c, info) => {
  if (c) { ok++; console.log('  ✓ ' + n); }
  else { fail++; console.log('  ✗ ' + n + (info !== undefined ? '  → ' + String(typeof info === 'string' ? info : JSON.stringify(info)).slice(0, 300) : '')); }
};

const ZC = createRequire(import.meta.url)('./src/zkusebni_cenik.js');
const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
const p = await ctx.newPage();
const chyby = [];
p.on('pageerror', e => chyby.push(e.message));
await p.goto('file://' + KOREN + 'dist/kalkulacka.html');
await p.waitForFunction(() => typeof NAST !== 'undefined' && typeof render === 'function', null, { timeout: 15000 });
await p.waitForTimeout(300);
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); Object.assign(DEFAULT_CENIK_PROJ, cp);
  ZAK = novaZakazka(); syncVarianta();
  NAST.jeAdmin = true;
  window.__hl = []; window.potvrd = () => Promise.resolve(true);
  window.hlaska = (t) => { window.__hl.push(String(t)); return Promise.resolve(); };
  const bez = o => { if (o) { delete o.ukazkove; delete o.prazdny; } };
  [DEFAULT_CENIK, DEFAULT_CENIK_PROJ, C, PC, NAST.slevy, NAST.firma].forEach(bez);
  ZAK.varianty.forEach(v => { bez(v.data.cenik); bez(v.data.proj.cenik); });
  ZAK.cislo = '2026 - OPR - CN - 0517'; ZAK.nazevAkce = 'Zkouška'; ZAK.objednatel = 'Zkušební zákazník'; ZAK.adresa = 'Ulice 1';
  Object.assign(Z, { prejezd: 2.7, zdvih: 12, prohluben: 1.05, sirka: 1.51, hloubka: 1.515 });
  render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);

/* Otevře náhled funkcí aplikace a vrátí okno (nebo null). */
async function otevri(fn) {
  const okP = ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null);
  await p.evaluate((f) => (0, eval)(f), fn);
  const okno = await okP;
  if (okno) { await okno.waitForLoadState('domcontentloaded'); await okno.waitForTimeout(400); }
  return okno;
}
/* Klik do prvku + psaní z klávesnice; vrací, zda se text prvku změnil. */
async function napis(okno, selektor, text) {
  const pred = await okno.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent : null; }, selektor);
  if (pred === null) return { nalezeno: false };
  await okno.click(selektor);
  await okno.keyboard.press('End');
  await okno.keyboard.type(text);
  const po = await okno.evaluate(s => document.querySelector(s).textContent, selektor);
  return { nalezeno: true, zmeneno: po !== pred, pred, po };
}

/* ---- 1)–3) cenová nabídka OCK ---- */
{
  const okno = await otevri('nabidkaOckDokument()');
  test('náhled CN OCK se otevřel', !!okno, await p.evaluate(() => window.__hl));
  if (okno) {
    await okno.evaluate(() => tiskEditace(true));   // „Upravit text před tiskem"
    const s = await okno.evaluate(() => {
      const d = document.getElementById('dok');
      const ceny = [...d.querySelectorAll('.castka')];
      ceny.forEach((e, i) => e.setAttribute('data-t', 'c' + i));
      const odst = [...d.querySelectorAll('p, h1')].find(e => !/\d\s*Kč/.test(e.textContent) && e.textContent.trim().length > 3);
      if (odst) odst.setAttribute('data-t', 'text');
      return { pocet: ceny.length, upravitelne: ceny.filter(e => e.isContentEditable).length,
               dok: d.isContentEditable, maText: !!odst };
    });
    test('CN OCK: dokument je v režimu úprav', s.dok, s);
    test('CN OCK: v dokumentu jsou buňky s cenou', s.pocet > 0, s);
    test('CN OCK: žádná buňka s cenou není upravitelná', s.pocet > 0 && s.upravitelne === 0, s);
    const c = await napis(okno, '[data-t="c0"]', '999');
    test('CN OCK: psaní do ceny dokument nezmění', c.nalezeno && !c.zmeneno, c);
    const t = await napis(okno, '[data-t="text"]', ' doplněno');
    test('CN OCK: běžný text se upravit dá', t.nalezeno && t.zmeneno, t);
    const meny = await okno.evaluate(() => [...document.querySelectorAll('#dok td')]
      .filter(e => !e.querySelector('td') && /\d[\s ]*Kč/.test(e.textContent) && e.isContentEditable).map(e => e.textContent.slice(0, 60)));
    test('CN OCK: ani jiná buňka s částkou v Kč není upravitelná', meny.length === 0, meny);
    await okno.evaluate(() => tiskVratPuvodni());
    const po = await okno.evaluate(() => {
      const ceny = [...document.querySelectorAll('#dok .castka')];
      return { pocet: ceny.length, upravitelne: ceny.filter(e => e.isContentEditable).length };
    });
    test('CN OCK: po „Vrátit původní znění" ceny dál needitovatelné', po.pocet > 0 && po.upravitelne === 0, po);
    await okno.close();
  }
}

/* ---- 4) cenová nabídka PROJ ---- */
{
  /* samostatná zakázka projekce (řada OVP) — u čísla OPR je PROJ vynulovaná */
  await p.evaluate(() => {
    ZAK = novaZakazka(); syncVarianta();
    const bez = o => { if (o) { delete o.ukazkove; delete o.prazdny; } };
    [C, PC].forEach(bez); ZAK.varianty.forEach(v => { bez(v.data.cenik); bez(v.data.proj.cenik); });
    ZAK.cislo = '2026 - OVP - CN - 0517'; ZAK.nazevAkce = 'Zkouška'; ZAK.objednatel = 'Zkušební zákazník'; ZAK.adresa = 'Ulice 1';
    render();
  });
  const okno = await otevri('nabidkaProjNahled()');
  if (!okno) {
    test('náhled CN PROJ se otevřel', false, await p.evaluate(() => window.__hl.slice(-2)));
  } else {
    await okno.evaluate(() => tiskEditace(true));
    const s = await okno.evaluate(() => {
      const d = document.getElementById('dok');
      const ceny = [...d.querySelectorAll('.castka')];
      return { pocet: ceny.length, upravitelne: ceny.filter(e => e.isContentEditable).length, dok: d.isContentEditable,
               text: [...d.querySelectorAll('p,h1')].some(e => e.isContentEditable) };
    });
    test('CN PROJ: buňky s částkou needitovatelné', s.pocet > 0 && s.upravitelne === 0, s);
    test('CN PROJ: ostatní text zůstává upravitelný', s.dok && s.text, s);
    await okno.close();
  }
}

/* ---- 5) náhled bez zámku (krycí list PROJ) zůstává upravitelný celý ---- */
{
  const okno = await otevri("kryciProjTiskPohled('bo')");
  if (!okno) {
    test('náhled krycího listu se otevřel', false, await p.evaluate(() => window.__hl.slice(-2)));
  } else {
    await okno.evaluate(() => { if (typeof tiskEditace === 'function') tiskEditace(true); });
    const s = await okno.evaluate(() => ({
      zamcene: document.querySelectorAll('#dok [contenteditable="false"]').length,
      dok: !!document.getElementById('dok') && document.getElementById('dok').isContentEditable }));
    test('krycí list (bez zámku): nic není needitovatelné', s.dok && s.zamcene === 0, s);
    await okno.close();
  }
}

test('bez chyb stránky', chyby.length === 0, chyby);
await b.close();
console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
