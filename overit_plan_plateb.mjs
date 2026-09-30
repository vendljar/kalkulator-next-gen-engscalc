/* Ověření v prohlížeči: plán plateb projekce (etapa B platebních podmínek,
 * roadmapa #367, rozhodnutí J. V. 29. 9. 2026)
 * ============================================================================
 *
 * Hlídá se na sestavené aplikaci (dist/kalkulacka.html):
 *   1) Nastavení → Smlouvy / Šablony: firemní plán — vykreslí se, administrátor
 *      změní výchozí předvolbu, zálohu, text milníku, přidá milník, milník
 *      „po předání" a výsledek má platný tvar; použitý milník nejde odebrat;
 *      obchodník má vše jen ke čtení; převzetí Standardu z otevřené zakázky.
 *
 * Spuštění: node overit_plan_plateb.mjs
 */
import { chromium } from 'playwright';

const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + detail)); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
const chyby = [];
p.on('pageerror', e => chyby.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') chyby.push('error: ' + m.text()); });
await p.goto(KDE);
await p.waitForFunction(() => typeof NAST !== 'undefined' && typeof render === 'function', null, { timeout: 15000 });
await p.waitForTimeout(400);
/* Dialogy aplikace (potvrd/hlaska) se odklikávají samy — hlídá se výsledek. */
const odklikni = async () => {
  await p.waitForTimeout(80);
  return p.evaluate(() => { const t = document.querySelector('#dlg [data-dlg="ano"]'); if (t) t.click(); return !!t; });
};

console.log('\n1) Nastavení → Smlouvy / Šablony: firemní plán plateb projekce');
await p.evaluate(() => { NAST.jeAdmin = true; NAST.panel = 'sablony'; otevriNastaveni(); });
const panel = () => p.evaluate(() => {
  const o = document.getElementById('nastaveni-overlay');
  /* textContent, ne innerText: nadpisy sekcí mají text-transform: uppercase. */
  const t = o ? o.textContent : '';
  const sel = [...(o ? o.querySelectorAll('select') : [])];
  return {
    nadpis: /Plán plateb projekce/.test(t), vychoziKod: /platí výchozí z kódu/.test(t), vlastni: /vlastní plán firmy/.test(t),
    selPredvolba: sel.some(s => /planFirmaVychoziPredvolba/.test(s.getAttribute('onchange') || '')),
    zakazane: sel.filter(s => /planFirma/.test(s.getAttribute('onchange') || '')).every(s => s.disabled),
    standard: /po zhotovení výstupů ze zaměření/.test(t) && /DPZ/.test(t),
    plan: NAST.firma && NAST.firma.planPlatebProj ? JSON.parse(JSON.stringify(NAST.firma.planPlatebProj)) : null,
  };
});
let s = await panel();
zkus('karta „Plán plateb projekce" se vykreslila s výchozím plánem z kódu', s.nadpis && s.vychoziKod && s.standard && s.selPredvolba, JSON.stringify(s));
await p.evaluate(() => { planFirmaVychoziPredvolba('zaloha'); planFirmaZaloha('30'); });
s = await panel();
zkus('administrátor změní výchozí předvolbu a zálohu (vznikne vlastní plán firmy)',
  s.vlastni && s.plan && s.plan.vychozi === 'zaloha' && s.plan.zalohaPct === 30, JSON.stringify(s.plan && { v: s.plan.vychozi, z: s.plan.zalohaPct }));
await p.evaluate(() => { planFirmaMilnikPridej(); });
let vady = await p.evaluate(() => planPlatebFirmaVady(NAST.firma.planPlatebProj));
zkus('nový milník bez textu plán zneplatní a karta vady ukáže', vady.some(v => /nemá text/.test(v))
  && await p.evaluate(() => /Plán má vady/.test(document.getElementById('nastaveni-overlay').textContent)), vady.join(' | '));
await p.evaluate(() => { const n = NAST.firma.planPlatebProj.milniky.length; planFirmaMilnikText(n - 1, 'po předání klíčů'); planFirmaPredani('geodet', NAST.firma.planPlatebProj.milniky[n - 1].id); });
vady = await p.evaluate(() => planPlatebFirmaVady(NAST.firma.planPlatebProj));
s = await panel();
zkus('po vyplnění textu a milníku „po předání" je plán platný', vady.length === 0 && s.plan.predani.geodet === s.plan.milniky[s.plan.milniky.length - 1].id, vady.join(' | '));
zkus('firemní plán řídí předvolbu zakázky (Záloha 30 %, geodet „po předání klíčů")',
  await p.evaluate(() => { const r = planRadkyCinnosti('geodet', null, planFirmaPlan(NAST.firma)); return r.length === 2 && r[0].p === 30 && r[1].t === 'po předání klíčů'; }));
const pred = await p.evaluate(() => NAST.firma.planPlatebProj.milniky.length);
await p.evaluate(() => { const i = NAST.firma.planPlatebProj.milniky.findIndex(m => m.id === 'podpis'); planFirmaMilnikOdeber(i); });
await odklikni();
zkus('použitý milník („po podpisu") odebrat nejde', await p.evaluate(() => NAST.firma.planPlatebProj.milniky.length) === pred);
zkus('zveřejňovaná kopie firmy nese plán', await p.evaluate(() => { const k = firmaKZverejneni(NAST.firma); return !!k.planPlatebProj && k.planPlatebProj.vychozi === 'zaloha'; }));

/* převzetí Standardu z otevřené zakázky */
await p.evaluate(() => { if (!KLP.planPlateb) KLP.planPlateb = { v: 1 }; KLP.planPlateb.cinnosti = { dps: [{ p: 40, m: 'podpis' }, { p: 60, m: 'dps_predani' }], ic: [{ p: 100, m: 'vlastni', t: 'po dohodě' }] }; planFirmaPrevzit(); });
await odklikni();
await p.waitForTimeout(100);
s = await panel();
zkus('převzetí Standardu z otevřené zakázky vezme upravené DPS a vynechá IČ s vlastním textem',
  s.plan && JSON.stringify(s.plan.standard.dps) === JSON.stringify([{ p: 40, m: 'podpis' }, { p: 60, m: 'dps_predani' }])
  && JSON.stringify(s.plan.standard.ic) === JSON.stringify([{ p: 50, m: 'podpis' }, { p: 30, m: 'ic_podani' }, { p: 20, m: 'ic_povoleni' }]), JSON.stringify(s.plan && s.plan.standard));
await p.evaluate(() => { delete KLP.planPlateb; });

/* obchodník: jen ke čtení */
await p.evaluate(() => { NAST.jeAdmin = false; renderNastaveni(); });
s = await panel();
zkus('obchodník kartu vidí, ale nic v ní nezmění (prvky zakázané)', s.nadpis && s.zakazane, JSON.stringify(s));
const predTim = await p.evaluate(() => NAST.firma.planPlatebProj.vychozi);
await p.evaluate(() => { planFirmaVychoziPredvolba('sto'); });
await odklikni();
zkus('zápis bez práv administrátora se nepovede', await p.evaluate(() => NAST.firma.planPlatebProj.vychozi) === predTim);
await p.evaluate(() => { NAST.jeAdmin = true; zavriNastaveni(); });

zkus('žádná chyba stránky', chyby.length === 0, chyby.join(' | '));
await b.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
