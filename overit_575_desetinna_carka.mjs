/* Ověření v prohlížeči: DESETINNÁ ČÁRKA VE VŠECH ČÍSELNÝCH POLÍCH
 * (CA #575, rozhodnutí J. V. 6. 11. 2026).
 *
 * Do v6.11.3 byla číselná pole `type="number"` a desetinnou čárku řídil jazyk
 * prohlížeče: český Chrome „17,3" přijal, anglický z něj udělal 173. Teď jsou
 * pole textová se společným parserem (ui/cislo_pole.js + cisloPoleText
 * ve format.js) a chovají se stejně v každém jazyce prohlížeče.
 *
 * Harness běží DVAKRÁT — prohlížeč nastavený na en-US a na cs-CZ (locale)
 * — a v obou zapisuje z klávesnice „17,3" i „17.3" do pole Zdvih (Zadání
 * šachty), výšky sloupů v kartě Můstky, ceníku OCK (doprava) a globální
 * přirážky PROJ. Hodnota v datech musí být Number 17,3 (u procent 0,173)
 * a pole po překreslení musí ukazovat „17,3". Dál: tisíce s mezerou
 * („1 250,5" → 1250,5 a ukáže se s mezerou), nečitelný zápis se
 * odmítne a data se nezmění, Zpět vrátí předchozí hodnotu.
 *
 * Pojistka: na 977bd57 (před CA) selže v en-US (17,3 → 173) i na zobrazení
 * „17.3" v ceníku; po opravě projde v obou jazycích.
 *
 * Spuštění: node overit_575_desetinna_carka.mjs
 * (KNG_DIST=<cesta k kalkulacka.html> pustí harness proti jinému sestavení) */
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_575_desetinna_carka.mjs');
  process.exit(2);
}
const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = process.env.KNG_DIST ? pathToFileURL(process.env.KNG_DIST).href
  : new URL('dist/kalkulacka.html', import.meta.url).href;
const ZC = require(KOREN + 'src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });

for (const locale of ['en-US', 'cs-CZ']) {
  console.log(`\n=== prohlížeč ${locale} ===`);
  const ctx = await b.newContext({ locale, viewport: { width: 1500, height: 950 } });
  const p = await ctx.newPage();
  const chyby = [];
  p.on('pageerror', e => chyby.push(String(e)));
  await p.goto(KDE);
  await p.waitForFunction(() => typeof window.render === 'function');
  await p.waitForTimeout(400);
  await p.evaluate(([c, cp]) => {
    Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
    Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
    ZAK = novaZakazka(); syncVarianta();
    Object.assign(Z, { sirka: 1.6, hloubka: 2.1, zdvih: 12, prejezd: 2.7, prohluben: 1.05 });
    OCK.fixes = true;
    Z.mustky = [{ ks: 1, sloupyKs: 2 }];
    prepniTab('kalk'); render();
  }, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
  await p.waitForTimeout(200);

  /* Co pole opravdu ukazuje (u starého type=number je to `value`). */
  const ukazuje = (sel) => p.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    return typeof cisloPoleSurove === 'function' ? cisloPoleSurove(el) : el.value;
  }, sel);
  const zapis = async (sel, txt) => {
    const el = p.locator(sel).first();
    await el.click(); await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
    await p.keyboard.type(txt); await p.keyboard.press('Tab');
    await p.waitForTimeout(80);
  };

  const ZDVIH = "#ock-zadani input[onchange^=\"set('Z.zdvih'\"]";
  const SLOUP = '#ock-mustky input.mu-sloupVyskaM';
  for (const txt of ['17,3', '17.3']) {
    await zapis(ZDVIH, txt);
    const z = await p.evaluate(() => Z.zdvih);
    test(`${locale} Zdvih „${txt}" → Z.zdvih = 17,3 (Number)`, z === 17.3, z);
    test(`${locale} Zdvih po zápisu „${txt}" ukazuje „17,3"`, (await ukazuje(ZDVIH)) === '17,3', await ukazuje(ZDVIH));

    await zapis(SLOUP, txt);
    const s = await p.evaluate(() => Z.mustky[0].sloupVyskaM);
    test(`${locale} Můstky výška sloupu „${txt}" → 17,3`, s === 17.3, s);
    test(`${locale} Můstky po zápisu „${txt}" ukazují „17,3"`, (await ukazuje(SLOUP)) === '17,3', await ukazuje(SLOUP));
  }

  /* Zpět vrátí předchozí zdvih (12) a pole ho ukáže. */
  await zapis(ZDVIH, '13,5');
  const zpet = await p.evaluate(() => { historieZpet(); return Z.zdvih; });
  await p.waitForTimeout(80);
  test(`${locale} Zpět po „13,5" vrátí 17,3 a pole ukáže „17,3"`, zpet === 17.3 && (await ukazuje(ZDVIH)) === '17,3', [zpet, await ukazuje(ZDVIH)]);

  /* Nečitelný zápis se odmítne, data beze změny. Písmena se nenapíšou
   * vůbec (jako dřív v type=number); „1,2,3" se zastaví při změně. */
  await zapis(ZDVIH, '1,2,3');
  const poChybe = await p.evaluate(() => Z.zdvih);
  test(`${locale} „1,2,3" se odmítne — Z.zdvih zůstává 17,3`, poChybe === 17.3, poChybe);
  test(`${locale} po odmítnutí pole ukazuje zase „17,3"`, (await ukazuje(ZDVIH)) === '17,3', await ukazuje(ZDVIH));
  const dlg = (await p.locator('#dlg').isVisible().catch(() => false))
    ? (await p.locator('#dlg .dlg-text').innerText().catch(() => '')) : '';
  test(`${locale} odmítnutí ohlásí hláška „není číslo"`, /není číslo/.test(dlg), dlg.slice(0, 200));
  if (dlg) { await p.click('#dlg [data-dlg]'); await p.waitForTimeout(100); }
  await zapis(ZDVIH, '1x7');
  test(`${locale} písmeno se do pole nenapíše („1x7" → 17)`, (await p.evaluate(() => Z.zdvih)) === 17, await p.evaluate(() => Z.zdvih));
  await p.evaluate(() => set('Z.zdvih', 17.3));

  /* Ceník OCK — doprava (Kč). */
  await p.evaluate(() => { prepniTab('cenik'); render(); });
  await p.waitForTimeout(150);
  const DOPRAVA = "#page-cenik input[onchange*=\"set('C.transportKc'\"]";
  const jeCenik = await p.locator(DOPRAVA).count();
  test(`${locale} ceník má pole dopravy`, jeCenik > 0);
  if (jeCenik) {
    for (const txt of ['17,3', '17.3']) {
      await zapis(DOPRAVA, txt);
      const v = await p.evaluate(() => C.transportKc);
      test(`${locale} Ceník doprava „${txt}" → 17,3`, v === 17.3, v);
      test(`${locale} Ceník doprava ukazuje „17,3"`, (await ukazuje(DOPRAVA)) === '17,3', await ukazuje(DOPRAVA));
    }
    await zapis(DOPRAVA, '1 250,5');
    test(`${locale} Ceník „1 250,5" → 1250,5`, (await p.evaluate(() => C.transportKc)) === 1250.5, await p.evaluate(() => C.transportKc));
    test(`${locale} Ceník ukazuje „1 250,5" (mezera v tisících jako ve výstupech)`, (await ukazuje(DOPRAVA)) === '1\u00a0250,5', await ukazuje(DOPRAVA));
    await zapis(DOPRAVA, '12500');
    test(`${locale} Ceník 12500 se ukáže s mezerou v tisících („12 500")`, (await ukazuje(DOPRAVA)) === '12 500', await ukazuje(DOPRAVA));
  }

  /* PROJ — globální přirážka v hlavičce Kalkulace PROJ (procenta). */
  await p.evaluate(() => { prepniTab('proj'); render(); });
  await p.waitForTimeout(150);
  const MARZE = "#page-proj input[onchange*=\"set('PC.marze'\"]";
  const jeProj = await p.locator(MARZE).count();
  test(`${locale} Kalkulace PROJ má pole globální přirážky`, jeProj > 0);
  if (jeProj) {
    for (const txt of ['17,3', '17.3']) {
      await zapis(MARZE, txt);
      const v = await p.evaluate(() => PC.marze);
      test(`${locale} PROJ přirážka „${txt}" % → 0,173`, Math.abs(v - 0.173) < 1e-12, v);
      test(`${locale} PROJ přirážka ukazuje „17,3"`, (await ukazuje(MARZE)) === '17,3', await ukazuje(MARZE));
    }
  }
  /* PROJ — hodiny první položky první sekce (je-li pole k dispozici). */
  const HOD = "#page-proj input[onchange*=\"'polozky.0.hodiny'\"]";
  if (await p.locator(HOD).count()) {
    await zapis(HOD, '17,3');
    const h = await p.evaluate((s) => { const el = document.querySelector(s); const m = /pjSet\((\d+)/.exec(el.getAttribute('onchange')); return PJ.sekce[+m[1]].polozky[0].hodiny; }, HOD);
    test(`${locale} PROJ hodiny „17,3" → 17,3`, h === 17.3, h);
  }

  test(`${locale} bez chyb stránky`, chyby.length === 0, chyby);
  await ctx.close();
}

await b.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
