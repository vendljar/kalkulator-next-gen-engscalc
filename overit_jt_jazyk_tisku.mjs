/* Ověření v prohlížeči: dávka JT (J. V. 22. 11. 2026, větev claude/jt-jazyk-tisku)
 * — jazyk hlavičky technické specifikace OCK = Jazyk tisku nabídky.
 *   1) EN v hlavičce „Jazyk dokumentu" → náhled EN, Jazyk tisku = anglicky,
 *      pod „Print specification / PDF" karta Cenová nabídka (OCK) se třemi
 *      tlačítky ve stejném pořadí a barvách jako v české verzi;
 *   2) z EN náhledu: Vytvořit nabídku (Word) jde do Wordu v EN (jazyk předaný
 *      sablonaProTisk i dokumentVygeneruj), Kompletní náhled a tisk nabídky
 *      otevře anglickou nabídku v eurech, Kompletní náhled podkladů hlásí EN;
 *   3) brány platí i z EN náhledu: kontroly „Než nabídku odešlete…" jsou tytéž
 *      jako z kontrolyPanel(), zábrana zhasne tlačítka a nabidkaWord dokument
 *      nevyrobí;
 *   4) zpět CZ v hlavičce → Jazyk tisku česky, Word v CZ;
 *   5) opačný směr: Jazyk tisku „německy" u nabídky OCK přepne náhled na DE;
 *      PROJ beze změny (select volá tiskJazykNastav, jazyk dokumentu nemění);
 *   6) bez chyb v konzoli.
 * Ceník = zkušební (src/zkusebni_cenik.js), smyšlená TEST zakázka.
 * Pojistka: nad 05a496d (bez JT) selžou body 1–5 (tlačítka v EN náhledu nejsou).
 *
 * Spuštění: KNG_NEZVYSOVAT_VERZI=1 python3 build.py && NODE_PATH=$(npm root -g) node overit_jt_jazyk_tisku.mjs */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail).slice(0, 700))); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1300, height: 1000 } });
const p = await ctx.newPage();
const konzole = [];
const hlidej = (pg) => {
  pg.on('pageerror', e => konzole.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') konzole.push('error: ' + m.text()); });
};
hlidej(p);
ctx.on('page', hlidej);
await p.goto(KDE);
await p.waitForTimeout(600);

const ZC = createRequire(import.meta.url)(KOREN + 'src/zkusebni_cenik.js');
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  NAST.jeAdmin = true; NAST.jazyk = 'cz';
  ZAK = novaZakazka(); syncVarianta();
  ZAK.cislo = 'TEST-2026-OPR-CN-9722'; ZAK.nazevAkce = 'TEST · jazyk tisku (smyšlená zakázka)';
  ZAK.objednatel = 'TEST – Testovací odběratel s.r.o.'; ZAK.adresa = 'TEST – Testovací 1, 170 00 Praha 7';
  C.kurzEurKc = 25;
  Object.assign(Z, { prejezd: 3.5, zdvih: 12, prohluben: 1.1, sirka: 1.6, hloubka: 1.5, nastupiste: 4, typSachty: 'interiérová' });
  prepniTab('spec'); render();
  /* Word: zachytit jazyk na obou místech skutečné cesty (šablona i generátor),
   * dokument nevyrobit (bez zámku varianty). */
  window.__jt = { sablona: [], generuj: [] };
  window.sablonaProTisk = (typ, L) => { window.__jt.sablona.push(typ + ':' + L); return Promise.resolve(null); };
  window.dokumentVygeneruj = (typ, s, zak, v, J, L) => { window.__jt.generuj.push(typ + ':' + L); return Promise.reject(new Error('harness JT')); };
  window.hlaska = () => Promise.resolve();
  SABLONY.nabidka = { nazev: 'TEST_sablona.docx', data: new ArrayBuffer(8) };   // místní cesta, ať nečeká na výběr souboru
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
await p.waitForTimeout(250);

const stav = () => p.evaluate(() => {
  const pg = document.getElementById('page-spec');
  const karta = [...pg.querySelectorAll('.card')].find(c => /Cenová nabídka \(OCK\)/.test(c.textContent)) || null;
  const btn = karta ? [...karta.querySelectorAll('button')].filter(x => /nabidka(Nahled|Word|OckDokument)\(\)/.test(x.getAttribute('onclick') || ''))
    .map(x => ({ text: x.textContent.trim(), primary: x.classList.contains('primary'), disabled: x.disabled, title: x.title })) : [];
  const sel = karta ? karta.querySelector('select.tiskJazyk') : null;
  const tiskSpec = [...pg.querySelectorAll('button')].find(x => /Print specification|Tisk specifikace|Spezifikation drucken/.test(x.textContent));
  return {
    nast: NAST.jazyk, tisk: tiskJazyk(), preklad: !!pg.querySelector('.spec-row.ro'),
    karta: !!karta, btn, sel: sel ? sel.value : null, selOnchange: sel ? sel.getAttribute('onchange') : '',
    kartaPodTiskem: !!(karta && tiskSpec && (tiskSpec.compareDocumentPosition(karta) & Node.DOCUMENT_POSITION_FOLLOWING)),
    tiskSpecText: tiskSpec ? tiskSpec.textContent.trim() : '',
    kontroly: karta ? ((karta.querySelector('.kontroly-panel') || {}).innerText || '') : '',
    kontrolyPrimo: (() => { const d = document.createElement('div'); d.innerHTML = kontrolyPanel(); document.body.appendChild(d);
      const t = (d.querySelector('.kontroly-panel') || {}).innerText || ''; d.remove(); return t; })(),
  };
});
const vlajka = (k) => p.evaluate((k) => {
  const x = [...document.querySelectorAll('#page-spec button')].find(b => new RegExp("(tsJazykPrepni|jazykSet)\\('" + k + "'\\)").test(b.getAttribute('onclick') || ''));
  if (x) x.click(); return !!x;
}, k);
const PORADI = 'Kompletní náhled podkladů | Vytvořit nabídku (Word) | Kompletní náhled a tisk nabídky';

/* ---------- výchozí CZ: karta jako dřív ---------- */
const cz0 = await stav();
zkus('0 CZ: karta Cenová nabídka (OCK) se třemi tlačítky (Word modrý)', cz0.karta && cz0.btn.map(x => x.text).join(' | ') === PORADI
  && cz0.btn.map(x => x.primary).join() === 'false,true,false', cz0.btn);

/* ---------- 1) EN v hlavičce ---------- */
zkus('1 tlačítko EN v hlavičce specifikace', await vlajka('en'));
await p.waitForTimeout(150);
const en = await stav();
zkus('1 EN: náhled jen ke čtení, jazyk dokumentu en', en.preklad && en.nast === 'en', en);
zkus('1 EN: Jazyk tisku = anglicky (select en, tiskJazyk en)', en.sel === 'en' && en.tisk === 'en', [en.sel, en.tisk]);
zkus('1 EN: karta Cenová nabídka (OCK) pod „Print specification / PDF"', en.karta && en.kartaPodTiskem && en.tiskSpecText === 'Print specification / PDF', en.tiskSpecText);
zkus('1 EN: tři tlačítka ve stejném pořadí a barvách jako v CZ', en.btn.map(x => x.text).join(' | ') === PORADI
  && en.btn.map(x => x.primary).join() === 'false,true,false', en.btn);
zkus('1 EN: select Jazyk tisku je ten OCK (tiskJazykNastavOck)', /tiskJazykNastavOck/.test(en.selOnchange), en.selOnchange);

/* ---------- 3a) kontroly jako z kontrolyPanel() ---------- */
zkus('3 EN: blok „Než nabídku odešlete…" je týž jako z kontrolyPanel() (jazyk tisku EN)',
  en.kontroly === en.kontrolyPrimo && (en.kontrolyPrimo === '' || /Než nabídku odešlete/.test(en.kontroly)), [en.kontroly.slice(0, 300), en.kontrolyPrimo.slice(0, 300)]);

/* ---------- 2) tisk z EN náhledu ---------- */
{
  await p.evaluate(() => { window.__jt.sablona = []; window.__jt.generuj = []; });
  await p.evaluate(() => { [...document.querySelectorAll('#page-spec button')].find(x => /nabidkaWord\(\)/.test(x.getAttribute('onclick') || '')).click(); });
  await p.waitForTimeout(400);
  const w = await p.evaluate(() => window.__jt);
  zkus('2 EN: Vytvořit nabídku (Word) → šablona i generátor v EN', w.sablona.join() === 'nabidka:en' && w.generuj.join() === 'nabidka:en', w);

  const [okno] = await Promise.all([ctx.waitForEvent('page'),
    p.evaluate(() => { [...document.querySelectorAll('#page-spec button')].find(x => /nabidkaOckDokument\(\)/.test(x.getAttribute('onclick') || '')).click(); })]);
  await okno.waitForLoadState('load'); await okno.waitForTimeout(300);
  const t = await okno.evaluate(() => document.body.innerText);
  zkus('2 EN: Kompletní náhled a tisk nabídky = anglicky v eurech', /€|EUR/.test(t) && !/Kč/.test(t) && !/Objednatel/.test(t), t.slice(0, 300));
  await okno.close();

  const [okno2] = await Promise.all([ctx.waitForEvent('page'),
    p.evaluate(() => { [...document.querySelectorAll('#page-spec button')].find(x => /nabidkaNahled\(\)/.test(x.getAttribute('onclick') || '')).click(); })]);
  await okno2.waitForLoadState('load'); await okno2.waitForTimeout(400);
  const lista = await okno2.evaluate(() => (document.querySelector('.nw-lista') || {}).innerText || document.body.innerText.slice(0, 400));
  zkus('2 EN: Kompletní náhled podkladů hlásí Jazyk: EN', /Jazyk: EN/.test(lista), lista.slice(0, 300));
  await okno2.close();
}

/* ---------- 3b) zábrana platí i z EN náhledu ---------- */
{
  await p.evaluate(() => { window.__puvZ = window.dokumentZabrana;
    window.dokumentZabrana = (typ) => (typ === 'nabidka' || typ === 'nabidkaTisk' || !typ) ? 'Zkušební zábrana JT (harness).' : '';
    window.__jt.sablona = []; window.__jt.generuj = []; render(); });
  await p.waitForTimeout(150);
  const z = await stav();
  zkus('3 EN se zábranou: Word i tisk zhasnuté s důvodem, náhled podkladů ne', z.preklad && z.btn.length === 3 && !z.btn[0].disabled
    && z.btn[1].disabled && z.btn[2].disabled && /Zkušební zábrana JT/.test(z.btn[1].title), z.btn);
  await p.evaluate(() => nabidkaWord());
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => ({ jt: window.__jt, stav: (document.querySelector('.nabidkaStav') || {}).textContent || '' }));
  zkus('3 EN se zábranou: nabidkaWord dokument nevyrobí a řekne proč', r.jt.generuj.length === 0 && /Dokument nevznikl — Zkušební zábrana JT/.test(r.stav), r);
  await p.evaluate(() => { window.dokumentZabrana = window.__puvZ; render(); });
}

/* ---------- 4) zpět CZ ---------- */
zkus('4 tlačítko CZ v hlavičce', await vlajka('cz'));
await p.waitForTimeout(150);
{
  const cz = await stav();
  zkus('4 CZ: editace, Jazyk tisku česky', !cz.preklad && cz.nast === 'cz' && cz.tisk === 'cz' && cz.sel === 'cz', [cz.nast, cz.tisk, cz.sel]);
  await p.evaluate(() => { window.__jt.sablona = []; window.__jt.generuj = []; nabidkaWord(); });
  await p.waitForTimeout(400);
  const w = await p.evaluate(() => window.__jt);
  zkus('4 CZ: Word v češtině', w.sablona.join() === 'nabidka:cz' && w.generuj.join() === 'nabidka:cz', w);
}

/* ---------- 5) opačný směr + PROJ ---------- */
{
  await p.evaluate(() => { const s = document.querySelector('#page-spec select.tiskJazyk'); s.value = 'de'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.waitForTimeout(150);
  const de = await stav();
  zkus('5 Jazyk tisku německy u nabídky OCK → náhled specifikace DE', de.preklad && de.nast === 'de' && de.tisk === 'de' && de.sel === 'de'
    && de.tiskSpecText === 'Spezifikation drucken / PDF', [de.nast, de.tisk, de.sel, de.tiskSpecText]);
  const proj = await p.evaluate(() => {
    const h = nabidkaProjKarta(); const d = document.createElement('div'); d.innerHTML = h;
    const s = d.querySelector('select.tiskJazyk'); const on = s ? s.getAttribute('onchange') : '';
    const pred = NAST.jazyk; tiskJazykNastav('fr'); const po = NAST.jazyk; tiskJazykNastav('');
    return { on, pred, po };
  });
  zkus('5 PROJ beze změny: select volá tiskJazykNastav a jazyk dokumentu nemění', /^tiskJazykNastav\(this\.value\)$/.test(proj.on) && proj.pred === proj.po, proj);
  await vlajka('cz');
}

zkus('6 bez chyb v konzoli', konzole.length === 0, konzole);
await b.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
