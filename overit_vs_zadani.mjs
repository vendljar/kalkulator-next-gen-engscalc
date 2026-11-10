/* Ověření v prohlížeči: VÍC ŠACHET — ZADÁNÍ A KARTA ŠACHTY VARIANTY
 * (VS #570, etapa E2 = roadmapa #592; návrh R16–R21, prototyp v9).
 *
 * Co se hlídá:
 *  1. VYPNUTO (R21): Kalkulace OCK s jednou šachtou je ZNAK PO ZNAKU jako
 *     výchozí sestava (#inputs, #outputs, #kalk-souhrn) — KNG_DIST_ZAKLAD
 *     = dist sestavený z 079cfc6 (bez něj se srovnání přeskočí a hlásí).
 *  2. ZAPNUTO + 1 šachta (R16, R17, R20): navíc jen pole Počet variant
 *     a Počet kusů v nadpisu Zadání šachty; zbytek obrazovky shodný se
 *     základem (po odstranění toho jednoho prvku).
 *  3. Počet variant 1 → 2 → 3, přepínání šachet (Z = zadání otevřené
 *     šachty, zápis do šachty 2 nemění šachtu 1), Počet stejných kusů,
 *     Počet šachet celkem (R19), přejmenování, Kopírovat, Smazat
 *     s potvrzením na stránce (R18), snížení na 1 → `dalsi: []` (klíč se
 *     NEMAŽE, jinak server 409), Zpět vrátí šachty.
 *  4. R20: jedna varianta × 3 ks zapne režim víc šachet, návrat na 1 ks
 *     vrátí dnešní zobrazení (ks se z dat smaže).
 *  5. Model 1: pole zhasnutá, u víc šachet přepnutí na Model 1 odmítnuto.
 *  6. Vypnuto + zakázka s víc šachtami (R21): lišta, žádné pole, šachta 1,
 *     zápis šachet odmítnut.
 *  7. en-US „17,3" do Zdvihu šachty 2.
 *  8. 1200 / 1440 / 1920: prvky nadpisu se nepřekrývají a nepřetékají.
 *
 * Pojistka: na 079cfc6 (před E2) selže (pole ani karta neexistují).
 * Spuštění: node overit_vs_zadani.mjs  (KNG_DIST, KNG_DIST_ZAKLAD) */
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright není k dispozici.'); process.exit(2); }
const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = process.env.KNG_DIST ? pathToFileURL(process.env.KNG_DIST).href
  : new URL('dist/kalkulacka.html', import.meta.url).href;
const ZAKLAD = process.env.KNG_DIST_ZAKLAD && fs.existsSync(process.env.KNG_DIST_ZAKLAD)
  ? pathToFileURL(process.env.KNG_DIST_ZAKLAD).href : null;
const ZC = require(KOREN + 'src/zkusebni_cenik.js');

let ok = 0, fail = 0, preskoc = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });

async function otevri(url, { locale = 'cs-CZ', width = 1440, zap = false } = {}) {
  const ctx = await b.newContext({ locale, viewport: { width, height: 950 } });
  const p = await ctx.newPage();
  const chyby = [];
  p.on('pageerror', e => chyby.push(String(e)));
  await p.goto(url);
  await p.waitForFunction(() => typeof window.render === 'function');
  await p.waitForTimeout(300);
  await p.evaluate(([c, cp, zap]) => {
    Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
    Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
    window.__hl = [];
    window.hlaska = (t) => { window.__hl.push(String(t)); return Promise.resolve(); };
    window.potvrd = () => Promise.resolve(true);
    if (zap) window.viceSachetZapnuto = () => true;
    ZAK = novaZakazka(); syncVarianta();
    Object.assign(Z, { sirka: 1.6, hloubka: 2.1, zdvih: 12, prejezd: 2.7, prohluben: 1.05 });
    OCK.fixes = true;
    prepniTab('kalk'); render();
  }, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj(), zap]);
  await p.waitForTimeout(150);
  return { ctx, p, chyby };
}

const obrazovka = (p) => p.evaluate(() => {
  /* Nadpis zakázky nese datum a čas sestavení / verzi — srovnává se obsah karet. */
  const g = id => (document.getElementById(id) || {}).innerHTML || '';
  return { inputs: g('inputs'), outputs: g('outputs'), souhrn: g('kalk-souhrn') };
});
const bezVsPole = (p) => p.evaluate(() => {
  document.querySelectorAll('#ock-zadani h2 .vs-pocet').forEach(e => e.remove());
  return (document.getElementById('inputs') || {}).innerHTML || '';
});

/* ---------- 1 a 2: vypnuto = základ, zapnuto + 1 šachta = základ + pole ---------- */
{
  const vyp = await otevri(KDE);
  const sVyp = await obrazovka(vyp.p);
  test('VYP: žádné pole Počet variant ani Počet kusů', await vyp.p.evaluate(() => !document.getElementById('vsPocet') && !document.getElementById('vsKs1')));
  test('VYP: žádná karta Šachty varianty', await vyp.p.evaluate(() => !document.getElementById('vs-sachty')));
  test('VYP: nadpis Zadání šachty beze změny', await vyp.p.evaluate(() => document.querySelector('#ock-zadani h2 span').textContent === 'Zadání šachty'));
  const zap = await otevri(KDE, { zap: true });
  test('ZAP + 1 šachta: pole Počet variant = 1 a Počet kusů = 1 v nadpisu Zadání', await zap.p.evaluate(() => {
    const a = document.querySelector('#ock-zadani h2 #vsPocet'), k = document.querySelector('#ock-zadani h2 #vsKs1');
    return !!a && !!k && a.value === '1' && k.value === '1' && !a.disabled;
  }));
  test('ZAP + 1 šachta: bez karty Šachty varianty (R16)', await zap.p.evaluate(() => !document.getElementById('vs-sachty')));
  const sZap = await obrazovka(zap.p);
  test('ZAP + 1 šachta: kalkulace a souhrn shodné s VYP', sZap.outputs === sVyp.outputs && sZap.souhrn === sVyp.souhrn);
  test('ZAP + 1 šachta: zadání = VYP + jen pole v nadpisu', (await bezVsPole(zap.p)) === sVyp.inputs);
  if (ZAKLAD) {
    const z = await otevri(ZAKLAD);
    const sZ = await obrazovka(z.p);
    test('VYP: #inputs znak po znaku jako 079cfc6', sVyp.inputs === sZ.inputs, sVyp.inputs.length + ' / ' + sZ.inputs.length);
    test('VYP: #outputs znak po znaku jako 079cfc6', sVyp.outputs === sZ.outputs);
    test('VYP: souhrn znak po znaku jako 079cfc6', sVyp.souhrn === sZ.souhrn);
    await z.ctx.close();
  } else { preskoc++; console.log('SKIP srovnání se základem 079cfc6 (KNG_DIST_ZAKLAD)'); }
  test('VYP/ZAP: bez chyb stránky', !vyp.chyby.length && !zap.chyby.length, vyp.chyby.concat(zap.chyby));
  await vyp.ctx.close(); await zap.ctx.close();
}

/* ---------- 3–5, 7: zapnuto ---------- */
{
  const { ctx, p, chyby } = await otevri(KDE, { zap: true, locale: 'en-US' });
  const zapis = async (sel, txt) => {
    const el = p.locator(sel).first();
    try { await el.click({ timeout: 3000 }); }
    catch (e) { test('pole ' + sel + ' existuje', false); return; }
    await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
    await p.keyboard.type(txt); await p.keyboard.press('Tab');
    await p.waitForTimeout(120);
  };
  const stav = () => p.evaluate(() => ({
    n: sachtyZ(OCK).length, akt: VS_UI.akt, dalsi: OCK.dalsi, maDalsi: 'dalsi' in OCK, ks1: OCK.ks,
    zJeAkt: VS_UI.akt === 0 ? Z === OCK.zadani : Z === OCK.dalsi[VS_UI.akt - 1].zadani,
    karta: !!document.getElementById('vs-sachty'),
    titul: (document.querySelector('#ock-zadani h2 span') || {}).textContent,
    celkem: (document.getElementById('vsCelkem') || {}).textContent,
    ksTeto: (document.getElementById('vsKsTeto') || {}).textContent,
    potvrzeni: (document.getElementById('vsPotvrzeni') || {}).textContent || '',
    prep: [...document.querySelectorAll('#vsPrepinac button')].map(x => x.textContent),
  }));
  const cena1 = await p.evaluate(() => vypocetAkt().souhrn.zakladCena);

  await zapis('#ock-zadani h2 #vsPocet', '2');
  let s = await stav();
  test('2 varianty: dalsi má 1 šachtu, otevřená je šachta 2', s.n === 2 && s.akt === 1 && s.zJeAkt, s);
  test('2 varianty: karta Šachty varianty, nadpis „Zadání šachty — Šachta 2"', s.karta && s.titul === 'Zadání šachty — Šachta 2', s.titul);
  test('2 varianty: Počet šachet celkem 2 ks, Počet kusů této šachty 1 ks (R19)', s.celkem === '2 ks' && s.ksTeto === '1 ks', s);
  test('2 varianty: pole Počet variant se přesunulo do karty Šachty varianty', await p.evaluate(() =>
    !!document.querySelector('#vs-sachty h2 #vsPocet') && !document.querySelector('#ock-zadani h2 #vsPocet')));
  test('2 varianty: šachta 2 = kopie šachty 1, cena = 2× šachta před zaokrouhlením (R2, R3)', await p.evaluate((c1) => {
    const r = vypocetAkt();
    const u = r.sachty[0].vysl.souhrn.zakladCenaPredZaokr;
    return JSON.stringify(OCK.dalsi[0].zadani) === JSON.stringify(OCK.zadani) && r.souhrn.zakladCena === Math.ceil(2 * u / 1000 - 1e-9) * 1000 && c1 > 0;
  }, cena1));

  /* zápis do šachty 2 + en-US čárka */
  await zapis("#ock-zadani input[onchange^=\"set('Z.zdvih'\"]", '17,3');
  test('šachta 2: Zdvih „17,3" v en-US → 17,3 jen v šachtě 2', await p.evaluate(() => OCK.dalsi[0].zadani.zdvih === 17.3 && OCK.zadani.zdvih === 12));
  test('šachta 2: kalkulace ukazuje šachtu (nezaokrouhleno)', await p.evaluate(() =>
    /CELKEM ŠACHTY Šachta 2/.test(document.getElementById('ock-kalkulace').textContent)));
  await p.evaluate(() => vsAkt(0));
  test('přepnutí na šachtu 1: Z = OCK.zadani, pole ukazuje 12', await p.evaluate(() => Z === OCK.zadani
    && document.querySelector("#ock-zadani input[onchange^=\"set('Z.zdvih'\"]").value === '12'));

  /* přejmenování, kusy */
  await zapis('#vsNazev', 'Výtah A');
  await p.evaluate(() => vsAkt(1));
  await zapis('#vsKs', '2');
  s = await stav();
  test('přejmenování šachty 1 → OCK.nazev, přepínač „Výtah A"', s.prep[0] === 'Výtah A', s.prep);
  test('ks šachty 2 = 2: Počet šachet celkem 3 ks, Počet kusů této šachty 2 ks', s.celkem === '3 ks' && s.ksTeto === '2 ks' && s.dalsi[0].ks === 2, s);

  /* 3 varianty, kopie */
  await zapis('#vs-sachty h2 #vsPocet', '3');
  s = await stav();
  test('3 varianty: nová „Šachta 3" jako kopie poslední (ks 1)', s.n === 3 && s.akt === 2 && s.dalsi[1].nazev === 'Šachta 3' && s.dalsi[1].ks === 1
    && JSON.stringify(s.dalsi[1].zadani) === JSON.stringify(s.dalsi[0].zadani), s.prep);
  await p.click('#vsKopie', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(100);
  s = await stav();
  test('Kopírovat šachtu: 4 varianty, „Šachta 3 (kopie)", jedinečná id', s.n === 4 && s.dalsi[2].nazev === 'Šachta 3 (kopie)'
    && new Set(s.dalsi.map(x => x.id)).size === 3 && s.dalsi.every(x => /^[A-Za-z0-9._-]{1,80}$/.test(x.id)), s.dalsi.map(x => x.id));
  test('tvar dat projde kontrolou serveru (vsTvarProblemy)', await p.evaluate(() => vsTvarProblemy(OCK).length === 0));

  /* smazání s potvrzením */
  await p.click('#vsSmaz', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(80);
  s = await stav();
  test('Smazat šachtu: potvrzení na stránce se jménem (R18)', /Smazat šachtu Šachta 3 \(kopie\)\?/.test(s.potvrzeni) && s.n === 4, s.potvrzeni);
  await p.click('#vsPotvrdNe', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(80);
  s = await stav();
  test('Zrušit: nic se nesmazalo', s.n === 4 && !s.potvrzeni);
  await p.click('#vsSmaz', { timeout: 3000 }).catch(() => {}); await p.click('#vsPotvrdAno', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(80);
  s = await stav();
  test('Smazat: 3 varianty, otevřená šachta 1', s.n === 3 && s.akt === 0 && s.zJeAkt, s.prep);

  /* snížení na 1 */
  await zapis('#vs-sachty h2 #vsPocet', '1');
  s = await stav();
  test('Počet variant 1: potvrzení vyjmenuje mazané šachty', /Smazat šachty Šachta 2, Šachta 3\?/.test(s.potvrzeni) && s.n === 3, s.potvrzeni);
  await p.click('#vsPotvrdAno', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(100);
  s = await stav();
  test('po potvrzení: 1 šachta, dalsi = [] (klíč zůstává), dnešní zobrazení', s.n === 1 && s.maDalsi && Array.isArray(s.dalsi) && s.dalsi.length === 0
    && !s.karta && s.titul === 'Zadání šachty', s);
  test('po potvrzení: cena = jedna šachta jako na začátku', await p.evaluate((c1) => vypocetAkt().souhrn.zakladCena === c1 && !vypocetAkt().sachty, cena1));
  await p.evaluate(() => historieZpet()); await p.waitForTimeout(150);
  s = await stav();
  test('Zpět vrátí smazané šachty', s.n === 3, s.n);
  await p.evaluate(() => { OCK.dalsi = []; syncVarianta(); render(); });

  /* R20 */
  await zapis('#ock-zadani h2 #vsKs1', '3');
  s = await stav();
  test('R20: jedna varianta × 3 ks → režim víc šachet, celkem 3 ks', s.karta && s.celkem === '3 ks' && s.ks1 === 3 && s.n === 1, s);
  test('R20: cena = CEIL(3 × šachta)', await p.evaluate(() => { const r = vypocetAkt();
    return r.souhrn.zakladCena === Math.ceil(3 * r.sachty[0].vysl.souhrn.zakladCenaPredZaokr / 1000 - 1e-9) * 1000; }));
  await zapis('#vsKs', '1');
  s = await stav();
  test('R20: návrat na 1 ks → dnešní zobrazení, ks z dat pryč', !s.karta && s.ks1 === undefined && s.titul === 'Zadání šachty', s);

  /* Model 1 */
  await p.evaluate(() => { set('OCK.fixes', false); });
  await p.waitForTimeout(80);
  test('Model 1 + 1 šachta: Počet variant i Počet kusů zhasnuté', await p.evaluate(() =>
    document.getElementById('vsPocet').disabled && document.getElementById('vsKs1').disabled));
  await p.evaluate(() => { __hl.length = 0; vsPocetVariant('2'); });
  test('Model 1: přidání šachty odmítnuto s hláškou', await p.evaluate(() => sachtyZ(OCK).length === 1 && /jen Model 2/.test(__hl.join(' '))));
  await p.evaluate(() => { set('OCK.fixes', true); vsPocetVariant('2'); __hl.length = 0; set('OCK.fixes', false); });
  test('víc šachet: přepnutí na Model 1 odmítnuto (R3)', await p.evaluate(() => OCK.fixes === true && /jen Model 2/.test(__hl.join(' '))));
  test('víc šachet: volba Model 1 v hlavičce zakázaná', await p.evaluate(() => {
    const o = document.querySelector('select.rezim-vypoctu option[value="compat"]'); return !o || o.disabled; }));

  /* rozložení na třech šířkách */
  for (const w of [1200, 1440, 1920]) {
    await p.setViewportSize({ width: w, height: 950 });
    await p.waitForTimeout(100);
    const r = await p.evaluate(() => {
      const prekryv = (h) => {
        if (!h) return 'chybí';
        const deti = [...h.children].map(e => e.getBoundingClientRect()).filter(x => x.width > 0);
        for (let i = 0; i < deti.length; i++) for (let j = i + 1; j < deti.length; j++) {
          const a = deti[i], c = deti[j];
          if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) return 'překryv ' + i + '/' + j;
        }
        const hb = h.getBoundingClientRect();
        if ([...h.querySelectorAll('input,b')].some(e => e.getBoundingClientRect().right > hb.right + 1)) return 'přetéká';
        return '';
      };
      return [prekryv(document.querySelector('#vs-sachty h2')), prekryv(document.querySelector('#ock-zadani h2')),
        document.documentElement.scrollWidth <= window.innerWidth ? '' : 'vodorovný posuv'];
    });
    test(`šířka ${w}: nadpisy bez překryvu a přetečení`, r.every(x => !x), r);
  }
  test('ZAP: bez chyb stránky', !chyby.length, chyby);
  await ctx.close();
}

/* ---------- 1 šachta ZAP: rozložení nadpisu Zadání na třech šířkách ---------- */
for (const w of [1200, 1440, 1920]) {
  const { ctx, p } = await otevri(KDE, { zap: true, width: w });
  const r = await p.evaluate(() => {
    const h = document.querySelector('#ock-zadani h2');
    const t = h.children[0].getBoundingClientRect(), v = h.querySelector('.vs-pocet').getBoundingClientRect();
    const k = document.getElementById('vsKs1').getBoundingClientRect();
    return { prekryv: t.right > v.left + 1, uvnitr: k.right <= h.getBoundingClientRect().right + 1 };
  });
  test(`1 šachta ZAP, šířka ${w}: pole v nadpisu se nepřekrývá s titulkem`, !r.prekryv && r.uvnitr, r);
  await ctx.close();
}

/* ---------- 6: vypnuto + zakázka s víc šachtami (R21) ---------- */
{
  const { ctx, p, chyby } = await otevri(KDE);
  await p.evaluate(() => {
    OCK.nazev = 'Výtah A';
    OCK.dalsi = [{ id: 's_b', nazev: 'Výtah B', ks: 2, zadani: JSON.parse(JSON.stringify(OCK.zadani)) }];
    VS_UI.akt = 1; syncVarianta(); render();
  });
  test('VYP + víc šachet: lišta „funkce je v Nastavení vypnutá"', await p.evaluate(() =>
    /funkce je v Nastavení vypnutá/.test((document.getElementById('vsVypnuto') || {}).textContent || '')));
  test('VYP + víc šachet: bez vstupů, zadání = šachta 1', await p.evaluate(() =>
    !document.getElementById('vsPocet') && !document.getElementById('vsKs') && Z === OCK.zadani && VS_UI.akt === 0));
  test('VYP + víc šachet: cena podle dat (součet)', await p.evaluate(() => Array.isArray(vypocetAkt().sachty) && vypocetAkt().sachty.length === 2));
  const pred = await p.evaluate(() => JSON.stringify(OCK));
  await p.evaluate(() => { __hl.length = 0; vsKopie(); vsKsSet('3'); vsNazevSet('X'); });
  test('VYP + víc šachet: změna šachet odmítnuta s hláškou', await p.evaluate((pr) => JSON.stringify(OCK) === pr && /vypnuté/.test(__hl.join(' ')), pred));
  test('VYP + víc šachet: bez chyb stránky', !chyby.length, chyby);
  await ctx.close();
}

await b.close();
console.log(`\nVýsledek: ${ok} OK, ${fail} FAIL${preskoc ? ', ' + preskoc + ' přeskočeno' : ''}`);
process.exit(fail ? 1 : 0);
