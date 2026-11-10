/* Ověření v prohlížeči: VÍC ŠACHET — KALKULACE, CENA, SLEVA, PŘEHLEDY
 * (VS #570, etapa E3 = roadmapa #593; návrh R3, R7, R8, R19, prototyp v9).
 *
 *  1. Přepínač šachta / Součet v nadpisu Cenové kalkulace: šachta = její
 *     řádky a CELKEM šachty nezaokrouhleně; Součet = sloučené řádky, CELKEM
 *     = základní cena, VŠECHNA pole a tlačítka zhasnutá (jen ke čtení),
 *     příplatky s výčtem šachet „Výtah A, Výtah B 2×".
 *  2. Hlavička ceny: hlavní číslo = základ celé nabídky, rozpis po šachtách
 *     (ceny po rozpočtu, Σ = základ), klik na šachtu ji otevře.
 *  3. Karta Obchodní zaokrouhlení: tabulka rozpočtu do šachet.
 *  4. Sleva: věta „ze součtu", částka ze základu celé nabídky.
 *  5. Seznam variant: štítek „2 varianty / 3 ks", hledání podle šachty;
 *     porovnání variant se štítkem.
 *  6. Detail výpočtu = otevřená šachta.
 *  7. 1200 / 1440 / 1920: nadpis karty kalkulace bez překryvu, bez
 *     vodorovného posuvu.
 * Jedna šachta (VYP i ZAP) = základ znak po znaku hlídá overit_vs_zadani.mjs.
 * Pojistka: na 9909df5 (E2 bez E3) selže (přepínač, rozpis ani rozpočet nejsou).
 * Spuštění: node overit_vs_kalkulace.mjs  (KNG_DIST) */
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

const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ locale: 'cs-CZ', viewport: { width: 1440, height: 950 } });
const p = await ctx.newPage();
p.setDefaultTimeout(8000);
const chyby = [];
p.on('pageerror', e => chyby.push(String(e)));
await p.goto(KDE);
await p.waitForFunction(() => typeof window.render === 'function');
await p.waitForTimeout(300);
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  window.__hl = [];
  window.hlaska = (t) => { window.__hl.push(String(t)); return Promise.resolve(); };
  window.potvrd = () => Promise.resolve(true);
  window.viceSachetZapnuto = () => true;
  ZAK = novaZakazka(); syncVarianta();
  Object.assign(Z, { sirka: 1.6, hloubka: 2.1, zdvih: 12, prejezd: 2.7, prohluben: 1.05 });
  OCK.fixes = true;
  prepniTab('kalk'); render();
  vsNazevSet('Výtah A');
  vsPocetVariant('2');
  Z.zdvih = 17.3; vsKsSet('2'); vsNazevSet('Výtah B');
  vsAkt(0);
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
await p.waitForTimeout(150);

const txt = (sel) => p.evaluate((s) => (document.querySelector(s) || {}).textContent || '', sel);

/* 1. přepínač */
test('přepínač v nadpisu Cenové kalkulace: Výtah A, Výtah B, Součet', await p.evaluate(() =>
  [...document.querySelectorAll('#ock-kalkulace h2 #vsKalkPrepinac button')].map(x => x.textContent).join('|') === 'Výtah A|Výtah B|Součet'));
test('šachta A: CELKEM šachty nezaokrouhleně, pole editovatelná', await p.evaluate(() => {
  const k = document.getElementById('ock-kalkulace');
  return /CELKEM ŠACHTY Výtah A/.test(k.textContent) && [...k.querySelectorAll('.body input')].some(i => !i.disabled);
}));
test('šachta A: řádky z výsledku šachty A (hrubá OCK sedí na šachtu)', await p.evaluate(() => {
  const r = vypocetAkt().sachty[0].vysl;
  return document.getElementById('ock-kalkulace').textContent.indexOf(fmt(r.souhrn.zakladCenaPredZaokr)) >= 0;
}));
await p.click('#vsKalkSoucet');
await p.waitForTimeout(120);
test('Součet: CELKEM = základní cena celé nabídky (na tisíce)', await p.evaluate(() => {
  const t = document.getElementById('ock-kalkulace').textContent;
  return /CELKEM \(zaokrouhleno ↑ na tisíce\)/.test(t) && t.indexOf(fmt0(vypocetAkt().souhrn.zakladCena)) >= 0;
}));
test('Součet: jen ke čtení — žádné aktivní pole ani tlačítko v tabulkách', await p.evaluate(() =>
  ['ock-kalkulace', 'ock-priplatky'].every(id => [...document.querySelectorAll('#' + id + ' .body input, #' + id + ' .body select, #' + id + ' .body button')].every(e => e.disabled))));
test('Součet: věta „jen ke čtení" s počty variant', /jen ke čtení/.test(await txt('#vsKalkPozn')) && /2 varianty šachet, celkem 3 ks/.test(await txt('#vsKalkPozn')));
test('Součet: příplatek s výčtem „Výtah A, Výtah B 2×"', await p.evaluate(() =>
  [...document.querySelectorAll('#ock-priplatky .vs-sachty-popis')].some(e => e.textContent === 'Výtah A, Výtah B 2×')));
test('Součet: zadání zůstalo na šachtě A (Z se nemění)', await p.evaluate(() => Z === OCK.zadani && /Výtah A/.test(document.querySelector('#ock-zadani h2 span').textContent)));
{
  const pred = await p.evaluate(() => JSON.stringify(OCK));
  const pole = p.locator('#ock-kalkulace .body input[data-cislo]').first();
  const lzeEditovat = await pole.isEditable().catch(() => false);
  await pole.click({ timeout: 1500, force: true }).catch(() => {});
  await p.keyboard.type('999'); await p.keyboard.press('Tab');
  await p.waitForTimeout(100);
  test('Součet: do zhasnutého pole nejde psát, data beze změny', !lzeEditovat && await p.evaluate((pr) => JSON.stringify(OCK) === pr, pred));
}

/* 2. hlavička ceny */
test('hlavička: hlavní číslo = základ celé nabídky', await p.evaluate(() =>
  document.querySelector('#kalk-souhrn .kpi.main .v').textContent === fmt0(vypocetAkt().souhrn.zakladCena)));
const rozpis = await p.evaluate(() => ({ pills: [...document.querySelectorAll('#vsRozpis .vs-rozpis-sachta')].map(x => x.textContent),
  ceny: vypocetAkt().sachty.map(s => s.cenaRozpis), Z: vypocetAkt().souhrn.zakladCena }));
test('hlavička: rozpis „Výtah A · 1 ks · …", „Výtah B · 2 ks · …"', rozpis.pills.length === 2 && /^Výtah A · 1 ks · /.test(rozpis.pills[0]) && /^Výtah B · 2 ks · /.test(rozpis.pills[1]), rozpis);
test('hlavička: Σ cen šachet = základ (R7)', rozpis.ceny[0] + rozpis.ceny[1] === rozpis.Z, rozpis);
await p.click('#vsRozpis .vs-rozpis-sachta >> nth=1');
await p.waitForTimeout(120);
test('klik na šachtu v rozpisu ji otevře (zadání i kalkulace)', await p.evaluate(() => VS_UI.akt === 1 && VS_UI.pohled === 'akt'
  && Z === OCK.dalsi[0].zadani && /CELKEM ŠACHTY Výtah B/.test(document.getElementById('ock-kalkulace').textContent)));

/* 3. rozpočet v kartě zaokrouhlení */
test('karta Obchodní zaokrouhlení: tabulka rozpočtu, celkem = základ', await p.evaluate(() => {
  const t = document.querySelector('#ock-zaokr #vsRozpocet');
  return !!t && t.rows.length === 4 && t.rows[3].cells[3].textContent === fmt0(vypocetAkt().souhrn.zakladCena) && t.rows[3].cells[1].textContent === '3';
}));

/* 4. sleva */
await p.evaluate(() => { slevaSet('procenta', '3'); });
await p.waitForTimeout(120);
test('sleva: věta „ze součtu" v kartě slevy', /Sleva se počítá z ceny celé nabídky \(2 varianty šachet, celkem 3 ks\)/.test(await txt('#vsSlevaPozn')));
test('sleva: částka 3 % ze základu celé nabídky', await p.evaluate(() => {
  const cn = cenaNabidkyOck(vypocetAkt(), SL, ZO);
  return SL.procenta === 3 && Math.abs(cn.zaklad - vypocetAkt().souhrn.zakladCena) < 0.01;
}));

/* 6. detail */
test('Detail výpočtu = otevřená šachta B', await p.evaluate(() => {
  renderDetail();
  return document.getElementById('page-detail').textContent.indexOf('17,3') >= 0;
}));

/* 5. seznam a porovnání */
await p.evaluate(() => { varNova && varNova(); });
await p.waitForTimeout(150);
test('seznam variant: štítek „2 varianty / 3 ks" u varianty s víc šachtami', await p.evaluate(() => {
  if (typeof renderSeznam === 'function') { prepniTab('zakazka'); render(); }
  return [...document.querySelectorAll('.vs-stitek')].some(e => e.textContent === '2 varianty / 3 ks');
}));
test('seznam variant: hledání podle názvu šachty', await p.evaluate(() =>
  seznamHledej(seznamRadky(ZAK, {}), 'vytah b').length === ZAK.varianty.length));

/* 7. rozložení */
await p.evaluate(() => { prepniTab('kalk'); vsAkt(0); });
for (const w of [1200, 1440, 1920]) {
  await p.setViewportSize({ width: w, height: 950 });
  await p.waitForTimeout(100);
  const r = await p.evaluate(() => {
    const h = document.querySelector('#ock-kalkulace h2');
    const deti = [...h.children].map(e => e.getBoundingClientRect()).filter(x => x.width > 0);
    for (let i = 0; i < deti.length; i++) for (let j = i + 1; j < deti.length; j++) {
      const a = deti[i], c = deti[j];
      if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) return 'překryv';
    }
    if (document.querySelector('#vsKalkSoucet').getBoundingClientRect().right > h.getBoundingClientRect().right + 1) return 'přetéká';
    return document.documentElement.scrollWidth <= window.innerWidth ? '' : 'vodorovný posuv';
  });
  test(`šířka ${w}: nadpis Cenové kalkulace bez překryvu a přetečení`, !r, r);
}
test('bez chyb stránky', !chyby.length, chyby);
await b.close();
console.log(`\nVýsledek: ${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
