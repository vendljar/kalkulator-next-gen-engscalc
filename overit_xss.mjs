/* Ověření v prohlížeči: uložená zakázka nespustí cizí skript (B69, B70, B87).
 *
 * PROČ TAHLE SADA. Hloubkový test 24. 9. 2026 našel dvě cesty, kudy uložená
 * zakázka spustila JavaScript každému, kdo ji otevřel — i administrátorovi:
 *   B69 — „číselná" pole zakázky (sazba DPH, typ portálu, zasklení,
 *         světlíky, čistý vstup, šířka rámu, rohové sloupky, název skla,
 *         hodiny a rezerva PROJ) šla do HTML bez escapování;
 *   B70 — typ pásu opláštění se stal cestou `cenaPath` v obsluze `onchange`
 *         bez escJs, a cesta `C.__proto__.x` znečistila Object.prototype.
 * test_escape.js je neviděl, protože hlídá seznam jmen proměnných ve
 * zdrojáku (B87). Tahle sada se na zdroják nedívá: vloží neškodný payload do
 * dat zakázky, načte ji stejnou cestou jako ze serveru (importZakazka),
 * vykreslí záložky pro obchodníka i administrátora a zkontroluje, že se nic
 * nespustilo. Payload jen zapíše značku do window.__XSS.
 *
 * B82 — příloha zakázky s `javascript:` adresou se kliknutím na Stáhnout
 *       spustila (hloubkový test 24. 9. 2026).
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_xss.mjs
 */
import { createRequire } from 'module';
import path from 'path';
import { pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_xss.mjs');
  process.exit(2);
}

const KDE = pathToFileURL(path.resolve('dist/kalkulacka.html')).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + detail)); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });

/* Jeden pokus = čerstvá stránka, zakázka s payloadem, import, vykreslení
 * zadaných záložek, případně akce uživatele (změna ceny). */
async function pokus(nastav, { admin, zalozky, akce }) {
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  await p.goto(KDE);
  await p.waitForTimeout(400);
  const r = await p.evaluate(async ({ nastavSrc, admin, zalozky, akceSrc }) => {
    window.__XSS = [];
    const PAY = (z) => `"><img src=x onerror="window.__XSS.push('${z}')">`;
    const PAYJS = (z) => `1');window.__XSS.push('${z}');//`;
    const z = novaZakazka(); z.cislo = '2026 - OPR - CN - 0999'; z.nazevAkce = 'Zkušební';
    const d = z.varianty[0].data;
    if (typeof zkusebniCenik === 'function') d.cenik = zkusebniCenik();
    (new Function('z', 'd', 'PAY', 'PAYJS', nastavSrc))(z, d, PAY, PAYJS);
    NAST.jeAdmin = admin; NAST.nahledRole = admin ? '' : 'Obchodník';
    ZAK = importZakazka(JSON.parse(JSON.stringify(z)));
    syncVarianta();
    const chyby = [];
    for (const t of zalozky) {
      try { prepniTab(t); render(); } catch (e) { chyby.push(t + ': ' + e.message); }
      await new Promise(res => setTimeout(res, 120));
    }
    if (akceSrc) { try { await (new Function(akceSrc))(); } catch (e) { chyby.push('akce: ' + e.message); } }
    await new Promise(res => setTimeout(res, 250));
    return { xss: window.__XSS.slice(), proto: ({}).znecisteno, chyby };
  }, { nastavSrc: nastav, admin, zalozky, akceSrc: akce || '' });
  await p.close();
  return r;
}

const VSE = ['kalk', 'detail', 'spec', 'proj', 'detailproj', 'cenik'];
const POLE = [
  ['sazba DPH OCK (C.dph)', "d.cenik.dph = PAY('C.dph');"],
  ['sazba DPH PROJ (PC.dph)', "d.proj.cenik.dph = PAY('PC.dph');"],
  ...['typPortalu', 'zaskleni', 'svetlikyBoky', 'cistyVstupMm', 'sirkaRamuMm', 'rohoveSloupky']
    .map(k => ['zadání Z.' + k, `d.ock.zadani.${k} = PAY('Z.${k}');`]),
  ['název skla v ceníku zakázky', "d.ock.zadani.typSachty='exteriérová'; d.cenik.skloBokyNazev = '<img src=x onerror=window.__XSS.push`sklo`>';"],
  ['hodiny položky PROJ', "const s=d.proj.zadani.sekce.find(x=>x.polozky&&x.polozky.some(p=>p.typ==='hod'&&!p.vyrazeno)); s.polozky.find(p=>p.typ==='hod'&&!p.vyrazeno).hodiny = PAY('PJ.hodiny');"],
  ['rezerva položky PROJ', "const s=d.proj.zadani.sekce.find(x=>x.polozky&&x.polozky.some(p=>p.typ==='hod'&&!p.vyrazeno)); s.polozky.find(p=>p.typ==='hod'&&!p.vyrazeno).rezerva = PAY('PJ.rezerva');"],
];

console.log('B69 — hodnoty ze zakázky v HTML');
for (const admin of [false, true]) {
  for (const [popis, nastav] of POLE) {
    const r = await pokus(nastav, { admin, zalozky: VSE });
    zkus(`${admin ? 'administrátor' : 'obchodník'}: ${popis} se nespustí`, r.xss.length === 0, JSON.stringify(r));
  }
}

console.log('\nB70 — typ pásu opláštění');
const OPL = (typ) => `d.ock.fixes = false; Object.assign(d.ock.zadani, { zdvih: 17, prejezd: 2.7, sirka: 1.5, hloubka: 1.5, prohluben: 1 });
  d.ock.zadani.oplasteni = { rezim: 'poStenach', steny: { A: { odM: 0, pasy: [{ typ: ${JSON.stringify(typ)}, doM: null }] } } };`;
/* Změna ceny u řádku opláštění — přesně to, co spustilo obsluhu onchange. */
const ZMEN = `for (const inp of document.querySelectorAll('#page-kalk input[onchange^="set("]')) {
  inp.value = '7'; inp.dispatchEvent(new Event('change', { bubbles: true })); }`;
for (const [popis, typ] of [['JavaScript v typu pásu', "C.x');window.__XSS.push('B70');//"],
                            ['cesta C.__proto__.znecisteno', 'C.__proto__.znecisteno']]) {
  const r = await pokus(OPL(typ), { admin: true, zalozky: ['kalk'], akce: ZMEN });
  zkus('administrátor: ' + popis + ' se nespustí a prototyp zůstane čistý',
    r.xss.length === 0 && r.proto === undefined, JSON.stringify(r));
}

console.log('\nB82 — příloha s javascript: adresou');
{
  const PRIL = `z.prilohy = [{ id: 'pr1', nazev: 'smlouva.pdf', velikost: 10, kdy: '2026-09-01',
    data: "javascript:window.__XSS.push('B82')" }];`;
  const KLIK = `const b = [...document.querySelectorAll('button')].find(x => /prilohyStahni/.test(x.getAttribute('onclick') || ''));
    if (!b) throw new Error('tlačítko Stáhnout nenalezeno'); b.click();`;
  for (const admin of [false, true]) {
    const r = await pokus(PRIL, { admin, zalozky: ['kalk'], akce: KLIK });
    zkus(`${admin ? 'administrátor' : 'obchodník'}: Stáhnout přílohu s javascript: nic nespustí`,
      r.xss.length === 0 && !r.chyby.length, JSON.stringify(r));
  }
}

/* Sonda na sobě: kdyby payload neuměl spustit nic, všechny kontroly výš by
 * prošly vždycky. Vloží se přímo do stránky syrovým innerHTML. */
{
  const p = await b.newPage();
  await p.goto(KDE); await p.waitForTimeout(300);
  const n = await p.evaluate(async () => {
    window.__XSS = [];
    const d = document.createElement('div');
    d.innerHTML = `"><img src=x onerror="window.__XSS.push('sonda')">`;
    document.body.appendChild(d);
    await new Promise(res => setTimeout(res, 200));
    return window.__XSS.length;
  });
  await p.close();
  zkus('(sonda) payload opravdu umí spustit značku, když se vloží syrově', n === 1, n);
}

await b.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
