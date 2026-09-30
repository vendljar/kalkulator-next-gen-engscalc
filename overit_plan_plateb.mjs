/* Ověření v prohlížeči: plán plateb projekce (etapa B platebních podmínek,
 * roadmapa #367, rozhodnutí J. V. 29. 9. 2026)
 * ============================================================================
 *
 * Hlídá se na sestavené aplikaci (dist/kalkulacka.html):
 *   1) Nastavení → Smlouvy / Šablony: firemní plán — vykreslí se, administrátor
 *      změní výchozí předvolbu, zálohu, text milníku, přidá milník, milník
 *      „po předání" a výsledek má platný tvar; použitý milník nejde odebrat;
 *      obchodník má vše jen ke čtení; převzetí Standardu z otevřené zakázky.
 *   2) krycí list PROJ: karta plánu (jen nabízené činnosti, předvolby, úpravy,
 *      vlastní milník escapovaný, ↺), tabulka plateb smlouvy (dopočet, ruční
 *      částka, součet proti ceně díla), tisk krycího listu, snímek při
 *      zamčení (změna firmy odeslanou nabídku nezmění, zápis zámek odmítne),
 *      odeslaná nabídka z doby před plánem se chová jako dřív.
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
/* Zamítnout dialog („Ne" / „Nechat beze změny") — u zámku by „Ano" založilo klon. */
const odmitni = async () => {
  await p.waitForTimeout(80);
  return p.evaluate(() => { const t = document.querySelector('#dlg [data-dlg="ne"]') || document.querySelector('#dlg [data-dlg="ano"]'); if (t) t.click(); return !!t; });
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

/* ---------------------------------------------------------------- */
console.log('\n2) krycí list PROJ: plán plateb zakázky a platby smlouvy o dílo');
const { createRequire } = await import('module');
const ZC = createRequire(import.meta.url)('./src/zkusebni_cenik.js');
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  delete NAST.firma.planPlatebProj;          // firma s výchozím plánem z kódu
  ZAK = novaZakazka(); syncVarianta(); render(); prepniTab('kryciproj');
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
await p.waitForTimeout(300);
const kl = () => p.evaluate(() => {
  const el = document.getElementById('page-kryciproj');
  const ef = nabidkaProjPlatby(ZAK, aktivniVarianta(ZAK), 'cz');
  const karty = el.querySelectorAll('.plan-karta');
  const sel = [...el.querySelectorAll('select')].find(s => /planKlpPredvolba/.test(s.getAttribute('onchange') || ''));
  return {
    karty: karty.length, predvolba: sel ? sel.value : null,
    cinnosti: el.querySelectorAll('.plan-cin').length, nabizene: Object.keys(ef.ceny).length,
    stareZaloha: [...el.querySelectorAll('select')].some(s => /klpVyber\('zaloha'/.test(s.getAttribute('onchange') || '')),
    staraSplatka: [...el.querySelectorAll('input')].some(i => /klpSet\('sodpPlatba1'/.test(i.getAttribute('onchange') || '')),
    platbyRadku: karty[1] ? karty[1].querySelectorAll('tbody tr').length : 0, platby: ef.dopocet.platby.length,
    sedi: ef.dopocet.sedi, soucet: ef.dopocet.soucet, cena: ef.dopocet.cena,
    upraveno: /upraveno/.test(karty[0] ? karty[0].textContent : ''), nedostatky: /nedostatky/.test(karty[0] ? karty[0].textContent : ''),
    prepsanych: el.querySelectorAll('.plan-tab tr.prepsano').length,
    plan: KLP.planPlateb ? JSON.parse(JSON.stringify(KLP.planPlateb)) : null,
  };
});
let k = await kl();
zkus('karta plánu i tabulka plateb smlouvy se vykreslily (výchozí předvolba Standard)', k.karty === 2 && k.predvolba === 'std', JSON.stringify(k));
zkus('karta ukazuje právě nabízené činnosti', k.cinnosti === k.nabizene && k.nabizene > 0, k.cinnosti + ' / ' + k.nabizene);
zkus('pole dřívějšího znění (záloha, ruční splátky 1–8) se v krycím listu neukazují', !k.stareZaloha && !k.staraSplatka);
zkus('tabulka plateb má řádek za každou platbu a součet sedí s cenou díla', k.platbyRadku === k.platby && k.sedi && k.soucet === k.cena, JSON.stringify(k));
await p.evaluate(() => planKlpPredvolba('zaloha'));
await p.waitForTimeout(150);
k = await kl();
zkus('předvolba Záloha: u činností 50 % po podpisu + 50 % po předání', k.predvolba === 'zaloha'
  && await p.evaluate(() => { const ef = nabidkaProjPlatby(ZAK, aktivniVarianta(ZAK), 'cz'); return Object.keys(ef.ceny).every(c => ef.dopocet.cinnosti[c].map(r => r.p + ':' + r.m).join() === '50:podpis,50:' + ef.firemni.predani[c]); }), JSON.stringify(k.plan));
await p.evaluate(() => planKlpZaloha('30'));
zkus('záloha 30 %: první splátka DPZ je 30 %', await p.evaluate(() => nabidkaProjPlatby(ZAK, aktivniVarianta(ZAK), 'cz').dopocet.cinnosti.dpz[0].p === 30));
await p.evaluate(() => planKlpPredvolba('std'));
await p.evaluate(() => planKlpProcento('dpz', 0, '40'));
k = await kl();
zkus('úprava procenta: štítek „upraveno" a nedostatek „nedávají 100 %"', k.upraveno && k.nedostatky && k.plan.cinnosti && k.plan.cinnosti.dpz[0].p === 40, JSON.stringify(k.plan));
await p.evaluate(() => { planKlpProcento('dpz', 1, '40'); });
k = await kl();
zkus('po dorovnání na 100 % nedostatek zmizí, úprava zůstane', k.upraveno && !k.nedostatky, JSON.stringify(k.plan));
await p.evaluate(() => { planKlpMilnik('dpz', 2, 'vlastni'); planKlpMilnikText('dpz', 2, 'po předání <b>čistopisu</b>'); });
zkus('vlastní milník: text se uloží a v tabulce plateb je vlastní platba (escapovaná)',
  await p.evaluate(() => { const ef = nabidkaProjPlatby(ZAK, aktivniVarianta(ZAK), 'cz'); const html = document.getElementById('page-kryciproj').innerHTML;
    return ef.dopocet.platby.some(x => x.klic === 'v:po předání <b>čistopisu</b>') && !/<b>čistopisu<\/b>/.test(html) && /&lt;b&gt;čistopisu/.test(html); }));
await p.evaluate(() => planKlpVratitCinnost('dpz'));
k = await kl();
zkus('↺ vrátí činnost na předvolbu (úprava zmizí)', !k.upraveno && !(k.plan.cinnosti && k.plan.cinnosti.dpz), JSON.stringify(k.plan));
/* ruční částka platby smlouvy */
await p.evaluate(() => planKlpPrepis('podpis', '100 000'));
k = await kl();
zkus('ruční částka platby: řádek zvýrazněný, součet nesedí s cenou díla', k.prepsanych === 1 && !k.sedi && k.plan.prepis.podpis === 100000, JSON.stringify(k));
await p.evaluate(() => planKlpPrepis('podpis', 'hodně'));
await odklikni();
zkus('nečitelná částka se nepřijme (zůstane předchozí)', await p.evaluate(() => KLP.planPlateb.prepis.podpis === 100000));
await p.evaluate(() => planKlpPrepisZrus('podpis'));
k = await kl();
zkus('↺ vrátí dopočet, součet zase sedí', k.prepsanych === 0 && k.sedi);
/* tisk krycího listu */
const tisk = await p.evaluate(() => { const d = kryciProjData(ZAK, aktivniVarianta(ZAK), JEKLY, 'bo'); return d.sekce.flatMap(s => s.radky.map(r => r[0] + ' = ' + r[1])); });
zkus('tisk krycího listu nese „Plán plateb" po činnostech a platby smlouvy, ne dřívější zálohu',
  tisk.some(r => /^Plán plateb = Standard po činnostech/.test(r)) && tisk.some(r => /^Plán plateb — DPZ = 50 % po podpisu/.test(r))
  && tisk.some(r => /^Plán plateb — ZA = není součástí nabídky/.test(r)) && tisk.some(r => /^Platby smlouvy \(z plánu plateb\) = Platba 1 — po podpisu/.test(r))
  && !tisk.some(r => /^Záloha = /.test(r)) && !tisk.some(r => /^Platba 1 — po podpisu smlouvy = /.test(r)), tisk.filter(r => /Plán|Platb|Záloha/.test(r)).join(' | '));

/* zamčení: snímek plánu, pozdější změna firmy nabídku nezmění, editace blokovaná */
await p.evaluate(() => { planKlpPredvolba('zaloha'); planKlpZaloha('30'); });
await p.evaluate(() => { const v = aktivniVarianta(ZAK); if (!v.zamek) zamekPoTisku('nabidkaProj', v.id); });
await p.waitForTimeout(150);
const snimek = await p.evaluate(() => KLP.zmrazenoPlan ? JSON.parse(JSON.stringify(KLP.zmrazenoPlan)) : null);
zkus('první zamčení uloží snímek plánu (předvolba, záloha, splátky nabízených činností, texty milníků)',
  !!snimek && snimek.predvolba === 'zaloha' && snimek.zaloha === 30 && !!snimek.cinnosti.dpz && snimek.milniky.some(m => m.id === 'podpis'), JSON.stringify(snimek));
const platbyPred = await p.evaluate(() => nabidkaProjPlatby(ZAK, aktivniVarianta(ZAK), 'cz').dopocet.platby.map(x => x.klic + ':' + x.text + ':' + x.castka).join('|'));
await p.evaluate(() => { NAST.firma.planPlatebProj = JSON.parse(JSON.stringify(PLAN_PROJ_VYCHOZI)); NAST.firma.planPlatebProj.milniky[0].cz = 'po podpisu (nové znění)'; NAST.firma.planPlatebProj.zalohaPct = 70; render(); });
const po = await p.evaluate(() => nabidkaProjPlatby(ZAK, aktivniVarianta(ZAK), 'cz').dopocet.platby.map(x => x.klic + ':' + x.text + ':' + x.castka).join('|'));
zkus('změna firemního plánu po odeslání platby odeslané nabídky nezmění (snímek)', platbyPred === po && !/nové znění/.test(po), po);
await p.evaluate(() => planKlpProcento('dpz', 0, '10'));
await odmitni();
zkus('zamčená varianta: zápis do plánu zámek odmítne', await p.evaluate(() => variantaUzamcena(aktivniVarianta(ZAK)) && !(KLP.planPlateb.cinnosti && KLP.planPlateb.cinnosti.dpz)));
/* odeslaná nabídka z doby před plánem plateb (bez snímku): krycí list jako dřív */
await p.evaluate(() => { delete KLP.zmrazenoPlan; render(); });
k = await kl();
zkus('odeslaná nabídka bez snímku: karta plánu se neukáže, pole zálohy ano (tiskne se, jak odešla)', k.karty === 0 && k.stareZaloha, JSON.stringify(k));
await p.evaluate(() => { delete NAST.firma.planPlatebProj; ZAK = novaZakazka(); syncVarianta(); render(); });

zkus('žádná chyba stránky', chyby.length === 0, chyby.join(' | '));
await b.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
