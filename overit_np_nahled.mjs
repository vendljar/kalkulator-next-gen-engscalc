/* Ověření v prohlížeči: Kompletní náhled podkladů ve vzhledu Wordu (dávka NP,
 * zadání J. V. 19. 11. 2026, větev claude/np-nahled).
 *   1) stránky A4 pod sebou, na každé záhlaví (Cenová nabídka, logo/firma,
 *      číslo stránky 1…N) a zápatí s patičkou firmy; tělo nepřetéká;
 *   2) stránkování neztratí ani nepřehází text: text stránek = text toku
 *      (nwTextZHtml(nwHtml(nwBloky(…)))) řádek po řádku;
 *   3) pořadí jako Word: hlavička → Popis záměru → A. → B. → I. s řádkem slevy
 *      → II. PŘÍPLATKY před III. → … → Vypracoval; DODAVATEL a věta
 *      „Přesně tyto hodnoty…" chybí; první stránka končí Popisem záměru;
 *   4) pruh: jazyk podle volby „Jazyk tisku" (EN), upozornění (fotka),
 *      tlačítko Word zapnuté / se zábranou vypnuté; tisk bez pruhu;
 *   5) písmo Calibri / Carlito, bez chyb v konzoli;
 *   6) víc šachet (VS) — technická část za každou šachtu;
 * a uloží snímky stránek (TEST zakázka, smyšlená data) do
 * podklady/kola/np_nahled_2026-11-19/ (KNG_NP_SNIMKY=0 = bez snímků).
 * Ceník = zkušební (src/zkusebni_cenik.js).
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_np_nahled.mjs */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
const SNIMKY = process.env.KNG_NP_SNIMKY !== '0';
const CIL = KOREN + 'podklady/kola/np_nahled_2026-11-19/';
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail).slice(0, 700))); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1100, height: 1000 }, deviceScaleFactor: 2 });
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
/* malá smyšlená „fotka" (šedý obdélník s nápisem) — PNG z plátna */
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  NAST.jeAdmin = true;
  ZAK = novaZakazka(); syncVarianta();
  ZAK.cislo = 'TEST-2026-OPR-CN-9603'; ZAK.nazevAkce = 'TEST · K19T-C103 · domov seniorů (smyšlená zakázka)';
  ZAK.objednatel = 'TEST – Testovací odběratel s.r.o.'; ZAK.kontakt = 'TEST – Jan Zkouška'; ZAK.adresa = 'TEST – Testovací 1, 170 00 Praha 7';
  C.kurzEurKc = 25;
  Object.assign(Z, { prejezd: 3.5, zdvih: 12, prohluben: 1.1, sirka: 1.6, hloubka: 1.5, nastupiste: 4, typSachty: 'interiérová' });
  TS.extra = [{ label: 'Vlastní ujednání (TEST)', hodnota: 'Předání dokumentace do 14 dnů od dokončení (TEST)' }];
  render();
  /* sleva až po render(): zkušební sestavení má stropy slev nulové a render by
   * ji vrátil ke schválení — náhled render nevolá, čte data varianty */
  const v = aktivniVarianta(ZAK);
  v.data.sleva = Object.assign(v.data.sleva || {}, { procenta: 3, stav: 'schváleno', role: 'Vedoucí' });
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
await p.waitForTimeout(250);

async function okno() {
  const [w] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(() => nabidkaNahled())]);
  await w.waitForLoadState('load');
  await w.waitForFunction(() => document.getElementById('nwTok') && document.getElementById('nwTok').style.display === 'none', null, { timeout: 8000 }).catch(() => {});
  await w.waitForTimeout(150);
  return w;
}
/* text toku spočítaný v aplikaci týmiž funkcemi (ze stejných dat) */
const tokText = (L) => p.evaluate((L) => {
  const vt = vzTiskVstup('nabidka', aktivniVarianta(ZAK));
  const d = nabidkaData(vt.zak, vt.varianta, JEKLY, L);
  return nwTextZHtml(nwHtml(nwBloky(d, L, { foto: (d.obrazky && d.obrazky.UVODNI_FOTO) || '' })));
}, L);
const stav = (w) => w.evaluate(() => {
  const strany = [...document.querySelectorAll('#nwStranky .nw-strana')];
  return {
    pocet: strany.length,
    cisla: strany.map(s => s.querySelector('.nw-cislo').textContent),
    zahlavi: strany.every(s => /\S/.test(s.querySelector('.nw-zahlavi-text').textContent) && !!s.querySelector('.nw-logo, .nw-logo-text')),
    zapati: strany.map(s => s.querySelector('.nw-zapati').innerText.trim()),
    pretece: strany.map((s, i) => { const t = s.querySelector('.nw-telo'); return t.scrollHeight > t.clientHeight + 1 ? i + 1 : 0; }).filter(Boolean),
    html: strany.map(s => s.querySelector('.nw-telo').innerHTML).join('\n'),
    prvni: strany[0] ? strany[0].querySelector('.nw-telo').innerText : '',
    pismo: getComputedStyle(document.body).fontFamily,
    word: (() => { const x = document.getElementById('nwWord'); return x ? { disabled: x.disabled, title: x.title } : null; })(),
    lista: (document.querySelector('.nw-lista') || {}).innerText || '',
  };
});

/* ---------- 1–4) česky ---------- */
{
  const w = await okno();
  const s = await stav(w);
  zkus('1 aspoň 3 stránky A4, čísla 1…N', s.pocet >= 3 && s.cisla.join(',') === Array.from({ length: s.pocet }, (_, i) => String(i + 1)).join(','), s.cisla);
  zkus('1 záhlaví (Cenová nabídka + logo/firma) na každé stránce', s.zahlavi);
  zkus('1 zápatí s patičkou firmy na každé stránce', s.zapati.length === s.pocet && s.zapati.every(t => t && t === s.zapati[0]), s.zapati.slice(0, 2));
  zkus('1 žádná stránka nepřetéká', !s.pretece.length, s.pretece);
  const tok = await tokText('cz');
  const strany = await w.evaluate((h) => nwTextZHtml(h), s.html).catch(() => null)
    || await p.evaluate((h) => nwTextZHtml(h), s.html);
  const i = tok.findIndex((t, k) => t !== strany[k]);
  zkus('2 text stránek = text toku (stránkování nic neztratí ani nepřehází), ' + tok.length + ' řádků', tok.length > 150 && i < 0 && tok.length === strany.length,
    i < 0 ? { tok: tok.length, strany: strany.length } : { i, tok: tok.slice(i - 2, i + 3), strany: strany.slice(i - 2, i + 3) });
  const ix = t => tok.indexOf(t);
  zkus('3 pořadí: hlavička → Popis záměru → A. → B. → I. → II. → III. → Vypracoval',
    ix('Objednatel:') === 0 && ix('Popis záměru:') > 0 && ix('A. TECHNICKÁ ČÁST NABÍDKY:') > ix('Popis záměru:')
    && ix('B. OBCHODNÍ ČÁST NABÍDKY:') > ix('DALŠÍ UJEDNÁNÍ') && ix('I. CENOVÁ NABÍDKA:') > ix('B. OBCHODNÍ ČÁST NABÍDKY:')
    && ix('II. ROZŠÍŘENÍ CENOVÉ NABÍDKY – Příplatky:') > ix('CELKEM za nabídku') && ix('III. PLATEBNÍ PODMÍNKY:') > ix('II. ROZŠÍŘENÍ CENOVÉ NABÍDKY – Příplatky:')
    && ix('Vypracoval:') > ix('III. PLATEBNÍ PODMÍNKY:'), tok.filter(t => /^[A-Z]+\.|Popis|Vypracoval|CELKEM za/.test(t)));
  zkus('3 sleva: Cena před slevou a Sleva „− … (3 %)" před cenou', ix('Sleva') > ix('Cena před slevou') && /^− .+ \(3 %\)$/.test(tok[ix('Sleva') + 1]) && ix('CELKEM za nabídku') > ix('Sleva'),
    tok.slice(ix('Cena před slevou'), ix('Cena před slevou') + 6));
  zkus('3 DODAVATEL a věta „Přesně tyto hodnoty…" v náhledu nejsou', !tok.includes('DODAVATEL') && !/Přesně tyto hodnoty/.test(s.lista + tok.join(' ')));
  zkus('3 první stránka = hlavička a Popis záměru (A. TECHNICKÁ ČÁST až na druhé)', /Popis záměru/.test(s.prvni) && !/TECHNICKÁ ČÁST/.test(s.prvni), s.prvni.slice(-200));
  zkus('4 pruh: jazyk CZ, upozornění na chybějící fotku, Word zapnutý', /Jazyk: CZ/.test(s.lista) && /Chybí úvodní fotka/.test(s.lista) && s.word && !s.word.disabled, s.lista.slice(0, 400));
  zkus('5 písmo Calibri / Carlito', /Calibri/.test(s.pismo) && /Carlito/.test(s.pismo), s.pismo);
  /* tisk: pruh pryč, tok pryč, stránky zůstanou */
  await w.emulateMedia({ media: 'print' });
  const tisk = await w.evaluate(() => ({ lista: getComputedStyle(document.querySelector('.nw-lista')).display,
    strany: document.querySelectorAll('#nwStranky .nw-strana').length, tok: getComputedStyle(document.getElementById('nwTok')).display }));
  zkus('4 tisk: pruh se netiskne, stránky ano', tisk.lista === 'none' && tisk.tok === 'none' && tisk.strany === s.pocet, tisk);
  await w.emulateMedia({ media: 'screen' });
  if (SNIMKY) {
    mkdirSync(CIL, { recursive: true });
    await w.screenshot({ path: CIL + 'nahled_pruh.png', clip: { x: 0, y: 0, width: 1100, height: 260 } });
    /* pruh je přilepený nahoře — na snímcích stránek by je překryl */
    await w.evaluate(() => { document.querySelector('.nw-lista').style.display = 'none'; });
    const strany = await w.$$('#nwStranky .nw-strana');
    for (let k = 0; k < strany.length; k++) await strany[k].screenshot({ path: CIL + 'nahled_' + String(k + 1).padStart(2, '0') + '.png' });
    await w.evaluate(() => { document.querySelector('.nw-lista').style.display = ''; });
    console.log('  (snímky: ' + strany.length + ' stránek → ' + CIL.replace(KOREN, '') + ')');
  }
  /* Word z náhledu volá nabidkaWord v okně aplikace */
  const volano = await p.evaluate(() => { window.__nwWord = 0; const puv = window.nabidkaWord; window.nabidkaWord = () => { window.__nwWord++; }; window.__nwPuv = puv; return true; });
  await w.click('#nwWord');
  const pocet = await p.evaluate(() => { const n = window.__nwWord; window.nabidkaWord = window.__nwPuv; return n; });
  zkus('4 tlačítko „Vytvořit nabídku (Word)" v náhledu volá nabidkaWord()', volano && pocet === 1, pocet);
  await w.close();
}

/* ---------- 4) EN podle volby Jazyk tisku + zábrana ---------- */
{
  await p.evaluate(() => { tiskJazykNastav('en'); });
  const w = await okno();
  const s = await stav(w);
  const tok = await tokText('en');
  zkus('4 EN: pruh hlásí Jazyk: EN, dokument anglicky v eurech', /Jazyk: EN/.test(s.lista) && tok.some(t => /€|EUR/.test(t)) && !tok.some(t => /Kč/.test(t)) && !tok.includes('Objednatel:'),
    tok.slice(0, 6));
  zkus('1 EN: žádná stránka nepřetéká', !s.pretece.length, s.pretece);
  await w.close();
  await p.evaluate(() => { tiskJazykNastav('cz'); });
  /* zábrana: záporná ruční cena položky → dokumentZabrana('nabidka') (stejně jako tlačítko v aplikaci) */
  const duvod = await p.evaluate(() => {
    window.__puvZabrana = window.dokumentZabrana;
    window.dokumentZabrana = () => 'Zkušební zábrana (harness).';
    return dokumentZabrana('nabidka');
  });
  const w2 = await okno();
  const s2 = await stav(w2);
  zkus('4 se zábranou je Word v náhledu vypnutý a důvod svítí v pruhu', s2.word && s2.word.disabled && /Zkušební zábrana/.test(s2.word.title) && /Word teď vytvořit nejde/.test(s2.lista), [duvod, s2.word]);
  await w2.close();
  await p.evaluate(() => { window.dokumentZabrana = window.__puvZabrana; });
}

/* ---------- 6) víc šachet ---------- */
{
  const ma = await p.evaluate(() => typeof vsPridejSachtu === 'function' || typeof sachtyZ === 'function');
  const zalozeno = await p.evaluate(() => {
    const v = aktivniVarianta(ZAK);
    v.data.ock.nazev = 'Výtah A';
    v.data.ock.fixes = true;
    const zB = Object.assign(JSON.parse(JSON.stringify(DEFAULT_ZADANI)), { prejezd: 3.5, zdvih: 15, prohluben: 1.1, sirka: 2.0, hloubka: 1.6, nastupiste: 5, typSachty: 'interiérová',
      profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['interiérová'])) });
    v.data.ock.dalsi = [{ id: 's_b', nazev: 'Výtah B', ks: 2, zadani: zB }];
    if (typeof NAST === 'object') { NAST.viceSachet = true; }
    render();
    const vt = vzTiskVstup('nabidka', v);
    const d = nabidkaData(vt.zak, vt.varianta, JEKLY, 'cz');
    return !!d.sachty;
  });
  if (!ma || !zalozeno) console.log('  (víc šachet: v tomto sestavení vypnuto — přeskočeno)');
  else {
    const w = await okno();
    const s = await stav(w);
    const tok = await tokText('cz');
    zkus('6 VS: technická část za každou šachtu (VARIANTA ŠACHTY: Výtah A / Výtah B – 2 ks) a řádky šachet v ceně',
      tok.includes('VARIANTA ŠACHTY: Výtah A') && tok.includes('VARIANTA ŠACHTY: Výtah B – 2 ks') && tok.includes('Výtah B') && tok.some(t => /^šachet celkem: 3 ks$/.test(t)),
      tok.filter(t => /Výtah|šachet/.test(t)));
    zkus('6 VS: žádná stránka nepřetéká', !s.pretece.length, s.pretece);
    if (SNIMKY) {
      await w.evaluate(() => { document.querySelector('.nw-lista').style.display = 'none'; });
      const strany = await w.$$('#nwStranky .nw-strana');
      if (strany[1]) await strany[1].screenshot({ path: CIL + 'nahled_vs_02.png' });
    }
    await w.close();
  }
}

zkus('5 bez chyb v konzoli', !konzole.length, konzole.slice(0, 5));
await b.close();
console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
