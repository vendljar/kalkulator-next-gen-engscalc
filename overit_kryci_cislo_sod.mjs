/* Ověření v prohlížeči: „Krycí list zakázky OCK" a pole „Číslo SoD"
 * (zadání J. V. 15. 10. 2026, dávka S7, v15.10.9).
 *
 * Dělá to, co obchodník: otevře oba krycí listy, najde pole „Číslo SoD"
 * hned pod „Číslo nabídky (CN)", zapíše do něj číslo (jako by psal do okna)
 * a ověří, že se uložilo do varianty a objevilo v náhledu verze BO i Tech.
 * U odeslané nabídky (varianta zamčená tiskem nabídky) jde číslo doplnit bez
 * dialogu „Uzamčená varianta"; po tisku smlouvy o dílo už ne. Model hlídá
 * src/test_kryci_cislo_sod.js.
 *
 * Spouští se nad sestaveným buildem:
 *   NODE_PATH=$(npm root -g) node overit_kryci_cislo_sod.mjs */
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

const ok = (co, podm, info) => { console.log((podm ? '  ✓ ' : '  ✗ ') + co + (podm || info === undefined ? '' : '  ' + JSON.stringify(info))); chyby.push(podm); };
const modal = () => p.locator('#dlg').isVisible().catch(() => false);
const modalText = () => p.locator('#dlg .dlg-text').innerText().catch(() => '');
const zavri = async () => { if (await modal()) {
  const ne = p.locator('#dlg [data-dlg="ne"]');
  await ((await ne.count()) ? ne.click() : p.locator('#dlg button').first().click());
  await p.waitForTimeout(200); } };

const { createRequire } = await import('module');
const ZC = createRequire(import.meta.url)(KOREN + 'src/zkusebni_cenik.js');
const STRANKA = { kryci: '#page-kryci', kryciproj: '#page-kryciproj' };
const priprav = (typy, tab) => p.evaluate(([c, cp, typy, tab]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  ZAK = novaZakazka(); ZAK.autor = 'autor.cislosod@priklad.cz';
  /* #366: návrh čísla SoD vzniká z čísla nabídky; řada podle strany (P6 — číslo OPR vyřadí PROJ). */
  ZAK.cislo = tab === 'kryciproj' ? '2026 - OVP - CN - 0412' : '2026 - OPR - CN - 0412';
  syncVarianta();
  const v = aktivniVarianta(ZAK);
  typy.forEach(typ => zamkniVariantu(v, { typ }));
  if (typeof ONLINE_STAV !== 'undefined') ONLINE_STAV.ja = { email: 'autor.cislosod@priklad.cz', role: 'Obchodník' };
  if (typy.length) zamekCteniZapni();
  prepniTab(tab); render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj(), typy, tab]);

/* Řádky Základních údajů: popisek a vstupní pole. */
const radky = (sel) => p.evaluate(sel => Array.from(document.querySelectorAll(sel + ' .kl-row'))
  .map(r => ((r.querySelector('.lbl') || {}).textContent || '').trim()), sel);
/* Zápis jako z klávesnice: vyplnit okno a odeslat change. */
const napis = async (sel, text) => {
  const radek = p.locator(sel + ' .kl-row').filter({ has: p.locator('.lbl', { hasText: /^Číslo SoD/ }) }).first();
  const pole = radek.locator('input, textarea').first();
  await pole.fill(text);
  await pole.dispatchEvent('change');
  await p.waitForTimeout(300);
};
const ulozeno = () => p.evaluate(() => {
  const d = aktivniVarianta(ZAK).data;
  return { ock: d.kryci.hodnoty.cisloSod, proj: d.kryciProj.hodnoty.cisloSod };
});

for (const [tab, jm, h1] of [['kryci', 'OCK', 'Krycí list zakázky OCK'], ['kryciproj', 'PROJ', 'Krycí list zakázky PROJ']]) {
  console.log('— krycí list ' + jm + ', rozpracovaná nabídka —');
  await priprav([], tab);
  const sel = STRANKA[tab];
  const nadpis = await p.evaluate(sel => ((document.querySelector(sel + ' h1') || {}).textContent || '').trim(), sel);
  ok('nadpis stránky „' + h1 + '"', nadpis === h1, nadpis);
  if (tab === 'kryci')
    ok('starý název „Krycí list objednávky / SoD" na stránce není',
      await p.evaluate(sel => (document.querySelector(sel) || {}).textContent.indexOf('objednávky / SoD') < 0, sel));
  const r = await radky(sel);
  const i = r.findIndex(x => /^Číslo nabídky \(CN\)/.test(x));
  ok('„Číslo SoD" je vidět hned pod „Číslo nabídky (CN)"', i >= 0 && /^Číslo SoD/.test(r[i + 1] || ''), r.slice(0, 8));
  const radekSod = () => p.evaluate(sel => {
    const rr = Array.from(document.querySelectorAll(sel + ' .kl-row')).find(x => /^Číslo SoD/.test(((x.querySelector('.lbl') || {}).textContent || '').trim()));
    const f = rr && rr.querySelector('input, textarea');
    return { hodnota: f ? f.value : null, zdroj: rr ? ((rr.querySelector('.src') || {}).textContent || '').trim() : '',
             reset: !!(rr && rr.querySelector('.src button')) };
  }, sel);
  const r0 = await radekSod();
  const navrhSod = jm === 'OCK' ? '2026 - OPR - SOD - 0412' : '2026 - OVP - SOD - 0412';
  ok('okno „Číslo SoD" nese návrh z čísla nabídky (#366)', r0.hodnota === navrhSod, r0);
  ok('…zřetelně označený jako návrh', /návrh z čísla nabídky/.test(r0.zdroj) && !r0.reset, r0);
  const cislo = jm === 'OCK' ? '2026 - OPR - SOD - 0012' : '2026 OVP SOD 0012';
  await napis(sel, cislo);
  const u = await ulozeno();
  ok('zapsané číslo se uložilo do varianty (' + jm + ')', (jm === 'OCK' ? u.ock : u.proj) === cislo, u);
  ok('…a druhý list ho nepřevzal (každý má své číslo)', (jm === 'OCK' ? u.proj : u.ock) === undefined, u);
  const vystup = await p.evaluate(([tab]) => {
    const v = aktivniVarianta(ZAK), J = typeof JEKLY !== 'undefined' ? JEKLY : null;
    const f = tab === 'kryci' ? (ver => kryciData(ZAK, v, J, ver)) : (ver => kryciProjData(ZAK, v, J, ver));
    const najdi = d => { for (const s of d.sekce) for (const r of s.radky || []) if (r[0] === 'Číslo SoD') return r[1]; return null; };
    return { bo: najdi(f('bo')), tech: najdi(f('techdata')), nadpis: f('bo').nadpis };
  }, [tab]);
  ok('výstup krycího listu (BO i Tech) nese číslo SoD', vystup.bo === cislo && vystup.tech === cislo, vystup);
  ok('nadpis dokumentu „' + h1 + ' — Backoffice"', vystup.nadpis === h1 + ' — Backoffice', vystup.nadpis);
  const r1 = await radekSod();
  ok('ruční přepis je označený „ručně" a nabízí ↺', /ručně/.test(r1.zdroj) && r1.reset, r1);
  await p.locator(sel + ' .kl-row').filter({ has: p.locator('.lbl', { hasText: /^Číslo SoD/ }) }).first().locator('.src button').click();
  await p.waitForTimeout(300);
  const r2 = await radekSod(), u2 = await ulozeno();
  ok('↺ vrátí návrh a ruční hodnotu smaže', r2.hodnota === navrhSod && (jm === 'OCK' ? u2.ock : u2.proj) === undefined, [r2, u2]);
}

for (const [tab, jm, typ] of [['kryci', 'OCK', 'nabidkaTisk'], ['kryciproj', 'PROJ', 'nabidkaProjTisk']]) {
  console.log('— krycí list ' + jm + ', odeslaná nabídka —');
  await priprav([typ], tab);
  const sel = STRANKA[tab];
  await napis(sel, 'DOPLNENO-' + jm);
  const u = await ulozeno();
  ok('číslo SoD jde doplnit i po odeslání nabídky (' + jm + ')', (jm === 'OCK' ? u.ock : u.proj) === 'DOPLNENO-' + jm, u);
  ok('…bez dialogu „Uzamčená varianta"', !(await modal()), await modalText());
  await zavri();
}

console.log('— tisk smlouvy o dílo (zamekPoTisku, #366) —');
await priprav(['nabidkaTisk'], 'kryci');
const poTisku = await p.evaluate(() => {
  const v = aktivniVarianta(ZAK);
  zamekPoTisku('sod', v.id, null);
  return { ock: v.data.kryci.hodnoty.cisloSod, datum: v.data.kryci.hodnoty.sodDatumPodpisu,
           proj: v.data.kryciProj.hodnoty.cisloSod, dnes: kryciDnesIso(), typy: zamekTiskyTypy(v) };
});
ok('tisk SoD opíše číslo SoD (OCK i PROJ) a datum podpisu do zakázky',
  poTisku.ock === '2026 - OPR - SOD - 0412' && poTisku.proj === '2026 - OPR - SOD - 0412'
  && poTisku.datum === poTisku.dnes && poTisku.typy.indexOf('sod') >= 0, poTisku);

console.log('— po smlouvě o dílo —');
await priprav(['nabidkaTisk', 'sod'], 'kryci');
await p.evaluate(() => klSet('cisloSod', 'PO-SOD'));
await p.waitForTimeout(400);
ok('po tisku SoD se číslo SoD nezapíše', (await ulozeno()).ock === undefined, await ulozeno());
ok('…a ukáže dialog', await modal(), await modalText());
await zavri();

await b.close();
if (konzole.length) console.log('Konzole:\n  ' + konzole.join('\n  '));
const spatne = chyby.filter(x => !x).length;
console.log(spatne ? `\n✗ ${spatne} z ${chyby.length} kontrol selhalo` : `\n✓ všech ${chyby.length} kontrol prošlo`);
process.exit(spatne || konzole.length ? 1 : 0);
