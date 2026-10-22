/* Ověření v prohlížeči: cena výjezdu technika v kalkulaci PROJ (K4-N4, O11,
 * rozhodnutí J. V. 21. 10. 2026).
 *
 *  1. Ruční cenu výjezdu (`PJ.vyjezdKcPrepis`) přepisuje jen role s právem
 *     `sloupce.naklad` — obchodník vidí účinnou cenu jako text, pole nemá.
 *  2. Zaškrtávátko „Akce mimo Prahu" smí dál i obchodník.
 *  3. Kontrola tvaru čísla (B135): nečitelný vstup v poli nic tiše nepřepíše
 *     a uložená hodnota „100,5" (import, ruční požadavek) dostane upozornění.
 *
 * Pojistka proti prázdnému testu: na stromu před O11 má obchodník pole
 * #projVyjezdPrepis (kontrola 1 selže) a „100,5" nemá upozornění
 * (#projVyjezdTvar chybí).
 *
 * Spouští se nad sestaveným buildem:
 *   NODE_PATH=$(npm root -g) node overit_o11_vyjezd.mjs
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
const chyby = [];
const konzole = [];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
p.on('console', m => { if (m.type() === 'error') konzole.push('error: ' + m.text()); });
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
await p.goto(KDE);
await p.waitForTimeout(700);
/* Text otevřeného dialogu (hlaska) a jeho zavření tlačítkem. */
const zavriDlg = async () => {
  const t = await p.evaluate(() => { const d = document.getElementById('dlg'); return d && getComputedStyle(d).display !== 'none' ? d.textContent.replace(/\s+/g, ' ') : ''; });
  if (t) { await p.click('#dlg button'); await p.waitForTimeout(150); }
  return t;
};
const ok = (co, podm) => { console.log((podm ? '  ✓ ' : '  ✗ ') + co); chyby.push(podm); };

const { createRequire } = await import('module');
const ZC = createRequire(import.meta.url)(KOREN + 'src/zkusebni_cenik.js');
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  ZAK = novaZakazka(); syncVarianta(); render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
await p.waitForTimeout(200);
await p.click('#tab-proj');
await p.waitForTimeout(300);

/* --- správce: pole je, přepis funguje --- */
await p.evaluate(() => { nastSetAdmin(true); render(); });
await p.check('#projAkceMimoPrahu');
await p.waitForTimeout(200);
ok('správce: pole ceny výjezdu se vykreslí', await p.$('#projVyjezdPrepis') !== null);
await p.fill('#projVyjezdPrepis', '5000');
await p.dispatchEvent('#projVyjezdPrepis', 'change');
await p.waitForTimeout(200);
ok('správce: přepis 5000 se zapíše do zadání', await p.evaluate(() => PJ.vyjezdKcPrepis === 5000));

/* Nečitelný vstup: pole type=number vrací '' s validity.badInput — dřív to
 * tiše smazalo přepis (vrátila se cena z ceníku). */
const vysl = await p.evaluate(() => {
  const el = { value: '', validity: { badInput: true } };
  pjVyjezdPrepis(el);
  return PJ.vyjezdKcPrepis;
});
ok('nečitelný vstup v poli přepis nezmění (zůstane 5000)', vysl === 5000);
ok('… a ukáže upozornění místo tichého návratu k ceníku', /není platné číslo/.test(await zavriDlg()));
const zap = await p.evaluate(() => { pjVyjezdPrepis({ value: '-10', validity: {} }); return PJ.vyjezdKcPrepis; });
ok('záporná cena výjezdu se odmítne (zůstane 5000)', zap === 5000 && /záporné/.test(await zavriDlg()));

/* Uložená hodnota „100,5" (import / ruční požadavek): upozornění, ne tiché 0. */
await p.evaluate(() => { PJ.vyjezdKcPrepis = '100,5'; render(); });
await p.waitForTimeout(200);
const tvar = await p.$eval('#projVyjezdTvar', e => e.textContent).catch(() => '');
ok('„100,5" v zadání → upozornění na neplatné číslo (' + tvar.slice(0, 40) + '…)', /není platné číslo/.test(tvar));
ok('… a kontrola uložení (uloZaporneVZadani) ho hlásí jako typ', await p.evaluate(() =>
  uloZaporneVZadani(null, PJ).some(x => x.kde === 'proj.zadani.vyjezdKcPrepis' && x.duvod === 'typ')));
await p.evaluate(() => { PJ.vyjezdKcPrepis = 4200; render(); });

/* --- obchodník: zaškrtávátko ano, pole ne --- */
await p.evaluate(() => { nastSetAdmin(false); render(); });
await p.waitForTimeout(200);
const smi = await p.evaluate(() => smiZobrazit('sloupce.naklad'));
ok('příprava: role bez práva sloupce.naklad', smi === false);
ok('obchodník: pole ceny výjezdu NENÍ', await p.$('#projVyjezdPrepis') === null);
const text = await p.$eval('#projVyjezdCena', e => e.textContent).catch(() => '');
ok('obchodník: vidí účinnou cenu výjezdu jako text (' + text + ')', /4\s?200/.test(text));
await p.uncheck('#projAkceMimoPrahu');
await p.waitForTimeout(200);
ok('obchodník: „Akce mimo Prahu" smí vypnout', await p.evaluate(() => PJ.akceMimoPrahu === false));
await p.check('#projAkceMimoPrahu');
await p.waitForTimeout(200);
ok('obchodník: … i zapnout', await p.evaluate(() => PJ.akceMimoPrahu === true));
ok('obchodník: sjednaná cena zůstala (4200)', await p.evaluate(() => PJ.vyjezdKcPrepis === 4200));

ok('žádné chyby v konzoli (' + konzole.join(' | ').slice(0, 200) + ')', konzole.length === 0);
await b.close();
const spatne = chyby.filter(x => !x).length;
console.log(`\n${chyby.length - spatne} prošlo, ${spatne} selhalo`);
process.exit(spatne ? 1 : 0);
