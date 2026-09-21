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

/* ---------- NÁKRES STĚNY (#281) ----------
 *
 * Nákres smí ukazovat JEN to, co spočítalo jádro. Kontroly proto porovnávají
 * vykreslené pásy s `vypocetAkt().oplasteni.pasy`, ne se zadáním — kdyby si
 * obrazovka pásy počítala po svém, tohle to pozná. */
/* NOVÁ ZAKÁZKA MÁ NULOVÉ ROZMĚRY (#231), takže výška opláštění je nula
 * a jádro nevrátí ani jeden pás. Nákres se pak nesmí kreslit — a hlavně
 * nesmí spadnout. Zkouší se to dřív, než se rozměry doplní. */
{
  const prazdno = await p.evaluate(() => ({
    pasu: vypocetAkt().oplasteni.pasy.length,
    nakresu: document.querySelectorAll('#ock-oplasteni-steny .opl-nakres').length,
    vyska: vypocetAkt().oplasteni.vyska,
  }));
  zkus('u zakázky s nulovými rozměry jádro žádné pásy nevrátí',
    prazdno.pasu === 0 && !prazdno.vyska, JSON.stringify(prazdno));
  zkus('a nákres se v tom případě nekreslí, místo aby spadl',
    prazdno.nakresu === 0, prazdno.nakresu);
}

await p.evaluate(() => {
  /* Teprve teď rozměry — do téhle chvíle se zkoušel prázdný stav. */
  set('OCK.zadani.sirka', 1.6); set('OCK.zadani.hloubka', 1.4);
  set('OCK.zadani.zdvih', 9); set('OCK.zadani.prejezd', 3.5);
  set('OCK.zadani.prohluben', 1.1); set('OCK.zadani.nastupiste', 4);
  /* Stěna A: dva pásy. Stěna B: dolní mez v prohlubni. Stěna C: tři pásy.
   * Stěna D zůstává po celé výšce, ať je pokrytý i ten případ. */
  Z.oplasteni.steny.A = { odM: 0, pasy: [{ typ: 'C.skloCelniKc', doM: 2.4 }, { typ: 'C.skloBokyKc', doM: null }] };
  Z.oplasteni.steny.B = { odM: -1.1, pasy: [{ typ: 'bez', doM: 0 }, { typ: 'C.skloBokyKc', doM: null }] };
  Z.oplasteni.steny.C = { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: 1.2 }, { typ: 'C.skloBokyKc', doM: 6 }, { typ: 'jine', nazev: 'perf. plech', naklad: 900, doM: null }] };
  Z.oplasteni.steny.D = { odM: 0, pasy: [{ typ: 'C.skloBokyKc', doM: null }] };
  render();
});
await p.waitForTimeout(300);

const nakres = await p.evaluate(() => {
  const jadro = vypocetAkt().oplasteni;
  const bloky = [...document.querySelectorAll('#ock-oplasteni-steny .opl-stena')];
  return {
    vyska: jadro.vyska,
    steny: ['A', 'B', 'C', 'D'].map((k, i) => {
      const blok = bloky[i];
      const pasyJadro = jadro.pasy.filter(x => x.stena === k);
      const kresby = [...blok.querySelectorAll('.opl-pas')];
      return {
        k,
        maNakres: !!blok.querySelector('.opl-nakres'),
        pasuJadro: pasyJadro.length,
        pasuKresba: kresby.length,
        /* Jádro ukládá zdola nahoru, nákres kreslí odshora — první vykreslený
         * pás musí odpovídat poslednímu v datech. */
        prvniTitulek: kresby.length ? kresby[0].getAttribute('title') : '',
        posledniTypJadro: pasyJadro.length ? pasyJadro[pasyJadro.length - 1].typ : '',
        vysky: kresby.map(e => Math.round(e.getBoundingClientRect().height)),
        podilyJadro: pasyJadro.slice().reverse().map(x => (x.doM - x.odM) / (jadro.vyska - pasyJadro[0].odM)),
        maNulu: !!blok.querySelector('.opl-nula'),
        koty: [...blok.querySelectorAll('.opl-kota')].map(e => e.textContent.trim()),
        pata: (blok.querySelector('.opl-nakres-pata') || {}).textContent || '',
        sraf: [...blok.querySelectorAll('.opl-pas-bez')].length,
      };
    }),
    legendaKusu: document.querySelectorAll('#ock-oplasteni-steny .opl-legenda-kus').length,
    legenda: (document.querySelector('#ock-oplasteni-steny .opl-legenda') || {}).textContent || '',
  };
});

zkus('nákres se kreslí u všech čtyř stěn',
  nakres.steny.every(s => s.maNakres), nakres.steny.map(s => s.k + ':' + s.maNakres));
zkus('počet vykreslených pásů sedí s tím, co spočítalo jádro',
  nakres.steny.every(s => s.pasuKresba === s.pasuJadro),
  nakres.steny.map(s => s.k + ' ' + s.pasuKresba + '/' + s.pasuJadro));
zkus('nákres nevymyslí pás navíc ani u stěny po celé výšce',
  nakres.steny.find(s => s.k === 'D').pasuKresba === 1,
  nakres.steny.find(s => s.k === 'D').pasuKresba);
zkus('pásy se kreslí ODSHORA (první vykreslený = poslední v datech)',
  nakres.steny.every(s => !s.pasuKresba || s.prvniTitulek.length > 0),
  nakres.steny.map(s => s.k + ': ' + s.prvniTitulek));

/* Výšky pruhů musí odpovídat poměru skutečných výšek pásů. Tohle je jádro
 * věci: obrázek, jehož proporce nesedí, je horší než tabulka. */
{
  const c = nakres.steny.find(s => s.k === 'C');
  const soucet = c.vysky.reduce((a, b) => a + b, 0);
  const sedi = c.vysky.every((v, i) => Math.abs(v / soucet - c.podilyJadro[i]) < 0.04);
  zkus('výšky pruhů odpovídají poměru výšek pásů',
    sedi, { vysky: c.vysky, ocekavane: c.podilyJadro.map(x => Math.round(x * 100) / 100) });
}

zkus('stěna s dolní mezí v prohlubni má čáru úrovně nástupu',
  nakres.steny.find(s => s.k === 'B').maNulu === true);
zkus('stěna bez prohlubně ji nemá',
  nakres.steny.find(s => s.k === 'A').maNulu === false);
zkus('kóty nesou horní hranu i zápornou dolní mez',
  nakres.steny.find(s => s.k === 'B').koty.some(t => /-1,1|-1\.1/.test(t)),
  nakres.steny.find(s => s.k === 'B').koty);
zkus('pás „bez — dodá stavba" je odlišený šrafou, ne barvou materiálu',
  nakres.steny.find(s => s.k === 'B').sraf === 1,
  nakres.steny.find(s => s.k === 'B').sraf);

/* Pata nákresu: plocha stěny, nebo výslovné „bez plochy". Bez toho by
 * barevné pásy slibovaly materiál i na stěně, za kterou se nic nepočítá
 * (čelní stěna nese dveřní portály — její plocha jsou jen světlíky). */
zkus('pod každým nákresem stojí plocha stěny, nebo že žádná není',
  nakres.steny.every(s => /m²/.test(s.pata) || /bez plochy/.test(s.pata)),
  nakres.steny.map(s => s.k + ': ' + s.pata.trim()));

zkus('pod kartou je legenda s plochami podle typu',
  nakres.legendaKusu >= 2 && /celkem k opláštění/.test(nakres.legenda), nakres.legendaKusu);

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
