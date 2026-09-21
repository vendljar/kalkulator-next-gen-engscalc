/* Ověření v prohlížeči: obrazovka opláštění po stěnách (#268)
 * ===========================================================
 *
 * PROČ TAHLE SADA VZNIKLA. Obrazovku opláštění pustila dávka v21.9.4 a
 * jednotková sada `src/test_oplasteni_zapnuti.js` u ní hlídá to podstatné —
 * že zapnutí režimu nehne cenou. Jenže hlídá JÁDRO. Při prvním proklikání
 * na testovacím webu 21. 9. 2026 našel J. V. dvě chyby, ze kterých jádro
 * nevidí ani jednu:
 *
 *   1) Zaškrtávátko „po celé výšce" nešlo odškrtnout, takže stěnu nebylo
 *      jak rozdělit na pásy. „Po celé výšce" je ODVOZENÝ stav (dolní mez 0,
 *      jediný pás až nahoru) a odškrtnutí pásy jen přepsalo na jeden jediný
 *      — ze stejných dat se odvodilo zase „po celé výšce" a zaškrtávátko se
 *      okamžitě vrátilo. Celá funkce po stěnách byla tím pádem nedostupná.
 *
 *   2) Vizuál se rozsypal. `.inputs .card .body` je grid
 *      `repeat(auto-fill, minmax(300px,1fr))`, který sází do sloupců KAŽDÝ
 *      `.row` zvlášť — hlavičky čtyř stěn tedy stály vedle sebe v ~290 px
 *      sloupcích, popisek „Stěna A — čelní stěna" se lámal do svislého
 *      proužku a „po celé výšce" se trhalo na dva kusy. Po rozdělení stěny
 *      na pásy by se navíc hlavička, dolní mez a pásy rozletěly do různých
 *      sloupců a vedle sebe by stály pásy různých stěn.
 *
 * Obojí je čistě v obrazovce, takže to může chytit jen prohlížeč.
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_oplasteni.mjs
 */
/* require (ne import) kvůli globální instalaci playwrightu: import v ESM
 * NODE_PATH ignoruje (stejně jako smoke.mjs). */
import { createRequire } from 'module';
import path from 'path';
import { pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_oplasteni.mjs');
  process.exit(2);
}

const KDE = pathToFileURL(path.resolve('dist/kalkulacka.html')).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + detail)); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
const konzole = [];
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') konzole.push('error: ' + m.text()); });
await p.goto(KDE);
await p.waitForTimeout(600);

/* ---------- zapnutí režimu ---------- */

zkus('ve standardním režimu se karta stěn nekreslí',
  await p.locator('#ock-oplasteni-steny').count() === 0);

await p.evaluate(() => { oplRezimSet('poStenach'); });
await p.waitForTimeout(250);

zkus('po přepnutí se karta stěn objeví',
  await p.locator('#ock-oplasteni-steny').count() === 1);
zkus('kreslí se všechny čtyři stěny',
  await p.locator('#ock-oplasteni-steny .opl-stena').count() === 4,
  await p.locator('#ock-oplasteni-steny .opl-stena').count());

/* ---------- NÁLEZ 2: rozložení ---------- */

const rozlozeni = await p.evaluate(() => {
  const mriz = document.querySelector('#ock-oplasteni-steny .opl-steny');
  const telo = mriz && mriz.closest('.body');
  const cs = mriz && getComputedStyle(mriz);
  return {
    jeMriz: !!mriz,
    sloupcu: cs ? cs.gridTemplateColumns.split(/\s+/).filter(Boolean).length : 0,
    sirkaMrize: mriz ? Math.round(mriz.getBoundingClientRect().width) : 0,
    sirkaTela: telo ? Math.round(telo.getBoundingClientRect().width) : 0,
  };
});
zkus('stěny mají vlastní mřížku, ne auto-fill sloupce karty', rozlozeni.jeMriz);
zkus('mřížka se roztáhne přes celou šířku karty (grid-column 1 / -1)',
  rozlozeni.sirkaMrize > rozlozeni.sirkaTela - 60,
  rozlozeni.sirkaMrize + ' z ' + rozlozeni.sirkaTela);
zkus('na širokém okně stojí stěny ve dvou sloupcích, ne ve čtyřech',
  rozlozeni.sloupcu === 2, rozlozeni.sloupcu);

const popisekA = await p.evaluate(() => {
  const st = [...document.querySelectorAll('#ock-oplasteni-steny .opl-stena')][0];
  const lab = st && st.querySelector('.row label');
  if (!lab) return null;
  const r = lab.getBoundingClientRect();
  return { sirka: Math.round(r.width), vyska: Math.round(r.height), text: lab.innerText.replace(/\s+/g, ' ').trim() };
});
zkus('popisek stěny se nelomí do svislého proužku',
  popisekA && popisekA.sirka >= 150, popisekA && (popisekA.sirka + ' px: ' + popisekA.text));
zkus('popisek stěny se vejde na jeden až dva řádky',
  popisekA && popisekA.vyska <= 48, popisekA && (popisekA.vyska + ' px'));

/* ---------- NÁLEZ 1: odškrtnutí musí stěnu rozdělit ---------- */

const zaskrtA = p.locator('#ock-oplasteni-steny .opl-stena').first()
  .locator('input[type=checkbox]').first();
zkus('stěna A začíná zaškrtnutá jako „po celé výšce"', await zaskrtA.isChecked());

/* KLIK, ne `uncheck()`. Playwright si u `uncheck()` ověřuje výsledný stav,
 * takže při téhle chybě spadne až po 30 s timeoutu a nenapíše, co je špatně.
 * Klik projde vždycky a soudí až kontroly pod ním. */
await zaskrtA.click();
await p.waitForTimeout(250);

const poOdskrtnuti = p.locator('#ock-oplasteni-steny .opl-stena').first()
  .locator('input[type=checkbox]').first();
zkus('po odškrtnutí zůstane zaškrtávátko odškrtnuté (nález J. V. 21. 9. 2026)',
  !(await poOdskrtnuti.isChecked()));

const stavA = await p.evaluate(() => {
  const st = Z.oplasteni.steny.A;
  return { pasu: st.pasy.length, odM: st.odM, posledniDoM: st.pasy[st.pasy.length - 1].doM,
           prvniDoM: st.pasy[0].doM };
});
zkus('odškrtnutím stěna opravdu vznikla ze dvou pásů', stavA.pasu === 2, JSON.stringify(stavA));
zkus('poslední pás pořád sahá až nahoru', stavA.posledniDoM === null, JSON.stringify(stavA));
zkus('dělicí výška se nepředvyplňuje', stavA.prvniDoM === null, JSON.stringify(stavA));

const stenaA = p.locator('#ock-oplasteni-steny .opl-stena').first();
zkus('objevilo se pole „opláštění začíná"',
  await stenaA.locator('input[onchange*="oplOdSet"]').count() === 1);
zkus('objevilo se tlačítko „+ přidat pás"',
  await stenaA.locator('button[onclick*="oplPasPridej"]').count() === 1);
zkus('obrazovka řekne, že chybí dělicí výška',
  (await stenaA.locator('.seznam-varovani').innerText()).includes('dělicí výšku'),
  await stenaA.locator('.seznam-varovani').count());

/* Hlavička i pásy jedné stěny musí zůstat v jednom bloku — jinak je grid
 * karty rozhodí do různých sloupců (to byl nález 2). */
const pospolu = await p.evaluate(() => {
  const st = [...document.querySelectorAll('#ock-oplasteni-steny .opl-stena')][0];
  const radky = [...st.querySelectorAll('.row')];
  const levé = new Set(radky.map(r => Math.round(r.getBoundingClientRect().left)));
  return { radku: radky.length, ruznychLevych: levé.size };
});
zkus('hlavička, dolní mez i pásy stěny stojí pod sebou v jednom sloupci',
  pospolu.ruznychLevych === 1, JSON.stringify(pospolu));

/* ---------- zpátky ---------- */

await poOdskrtnuti.click();
await p.waitForTimeout(250);
const zpet = await p.evaluate(() => ({
  pasu: Z.oplasteni.steny.A.pasy.length, odM: Z.oplasteni.steny.A.odM,
}));
zkus('zaškrtnutím zpátky se stěna zase sloučí do jednoho pásu',
  zpet.pasu === 1 && (+zpet.odM || 0) === 0, JSON.stringify(zpet));
zkus('a zaškrtávátko je zase zaškrtnuté',
  await p.locator('#ock-oplasteni-steny .opl-stena').first()
    .locator('input[type=checkbox]').first().isChecked());

/* ---------- druhá stěna se dá rozdělit nezávisle ---------- */

const zaskrtB = p.locator('#ock-oplasteni-steny .opl-stena').nth(1)
  .locator('input[type=checkbox]').first();
await zaskrtB.click();
await p.waitForTimeout(250);
const nezavisle = await p.evaluate(() => ({
  A: Z.oplasteni.steny.A.pasy.length, B: Z.oplasteni.steny.B.pasy.length,
}));
zkus('rozdělení stěny B nesáhne na stěnu A', nezavisle.A === 1 && nezavisle.B === 2,
  JSON.stringify(nezavisle));

/* ---------- vypnutí režimu ---------- */

await p.evaluate(() => { oplRezimSet('standard'); });
await p.waitForTimeout(250);
zkus('po vypnutí režimu karta stěn zmizí',
  await p.locator('#ock-oplasteni-steny').count() === 0);
const prezilo = await p.evaluate(() => Z.oplasteni.steny.B.pasy.length);
zkus('rozdělení stěn se vypnutím režimu nezahodí', prezilo === 2, prezilo);

zkus('za celý průchod nevznikla chyba v konzoli', konzole.length === 0, konzole.slice(0, 2).join(' | '));

await b.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
