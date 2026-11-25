/* DÁVKA PP — NÁLEZY KOLA 61 (#801–#804, koordinace 25. 11. 2026)
 *
 *  #801 (K61-N2) uložení bez čísla / názvu: zůstat na stránce s hlavičkou (Kalkulace
 *       OCK / PROJ), kde je hláška „Vyplňte v hlavičce…“ — ne přepnout na Přehled;
 *  #802 (K61-N3) kontrola před odesláním: zakázka jen PROJ nehlásí nevyplněná místa
 *       SoD realizace, zakázka jen OCK nehlásí SoD PROJ; plná zakázka hlásí obojí;
 *  #803 (K61-N4) „1 položka, 2–4 položky, 5 položek“ v kartě Cenová nabídka;
 *  #804 (K61-I3) krycí list OCK i PROJ píše datum (Dne, Datum podpisu smlouvy)
 *       česky „25. 11. 2026“; uložená hodnota a symbol SoD beze změny.
 * Pojistka proti prázdnému testu: na ebca8ebd sada FAIL (viz zpráva commitu).
 *
 * Spuštění: cd src && node test_pp_k61.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
nacti('./plan_plateb.js');
nacti('./podminky.js');
const zk = nacti('./zakazka.js');
const kr = nacti('./kryci.js');
const krp = nacti('./kryci_proj.js');
nacti('./sod.js');
const KO = nacti('./kontroly.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };
const cti = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const JEKLY = JSON.parse(cti('jekly.json'));

/* ---------- #804 datum v krycím listu ---------- */
test('#804 kryciDatumTisk: ISO → „25. 11. 2026“, jiný text beze změny', typeof kr.kryciDatumTisk === 'function'
  && kr.kryciDatumTisk('2026-11-25') === '25. 11. 2026' && kr.kryciDatumTisk('2026-01-05') === '5. 1. 2026'
  && kr.kryciDatumTisk('podle dohody') === 'podle dohody' && kr.kryciDatumTisk('') === '' && kr.kryciDatumTisk(null) === '');
test('#804 symbol SoD dál DD.MM.RRRR (kryciDatumCz beze změny)', kr.kryciDatumCz('2026-11-25') === '25.11.2026');
{
  const zak = zk.novaZakazka();
  zak.cislo = '2026 - OPR - CN - 301'; zak.nazevAkce = 'TEST akce PP'; zak.objednatel = 'TEST zákazník s.r.o.';
  const v = zak.varianty[0];
  v.data.kryci = { hodnoty: { podpisDne: '2026-11-25', sodDatumPodpisu: '2026-12-01' } };
  const rad = (d) => [].concat(...d.sekce.map(s => s.radky || []));
  let d = null, e1 = '';
  try { d = kr.kryciData(zak, v, JEKLY, 'bo'); } catch (e) { e1 = e.message; }
  const r = d ? rad(d) : [];
  const dne = r.find(x => x[0] === 'Dne'), pod = r.find(x => x[0] === 'Datum podpisu smlouvy');
  test('#804 KL OCK: „Dne“ 25. 11. 2026', dne && dne[1] === '25. 11. 2026', dne || e1);
  test('#804 KL OCK: „Datum podpisu smlouvy“ 1. 12. 2026', pod && pod[1] === '1. 12. 2026', pod);
  test('#804 KL OCK: v tisku žádné ISO datum', !r.some(x => /^\d{4}-\d{2}-\d{2}$/.test(String(x[1]))), r.filter(x => /^\d{4}-/.test(String(x[1]))));
  test('#804 uložená hodnota zůstává ISO (pole formuláře)', v.data.kryci.hodnoty.podpisDne === '2026-11-25');
  const zp = zk.novaZakazka(); zp.cislo = '2026 - OVP - CN - 302'; zp.nazevAkce = 'TEST PROJ'; zp.jenProj = true;
  const vp = zp.varianty[0];
  vp.data.kryciProj = { hodnoty: { podpisDne: '2026-11-25' } };
  let dp = null, e2 = '';
  try { dp = krp.kryciProjData(zp, vp, JEKLY, 'bo'); } catch (e) { e2 = e.message; }
  const rp = dp ? rad(dp) : [];
  const dneP = rp.find(x => x[0] === 'Dne');
  test('#804 KL PROJ: „Dne“ 25. 11. 2026, žádné ISO', dneP && dneP[1] === '25. 11. 2026' && !rp.some(x => /^\d{4}-\d{2}-\d{2}$/.test(String(x[1]))), dneP || e2);
}

/* ---------- #802 kontrola nevyplněných míst SoD podle stran ---------- */
{
  const n = { sod: ['OBJEDNATEL_ICO', 'SOD_TERMIN_MONTAZ_DO'], sodProj: ['OBJEDNATEL_ICO'] };
  const kody = ctx => KO.kontrolyProved(ctx).kody;
  const obe = kody({ sodNevyplneno: n });
  test('#802 plná zakázka: hlásí SoD realizace i SoD PROJ', obe.includes('sodNevyplneno') && obe.includes('sodProjNevyplneno'), obe);
  const jenProj = kody({ jenProj: true, sodNevyplneno: n });
  test('#802 zakázka jen PROJ: SoD realizace se nehlásí, SoD PROJ ano', !jenProj.includes('sodNevyplneno') && jenProj.includes('sodProjNevyplneno'), jenProj);
  const jenOck = kody({ jenOck: true, sodNevyplneno: n });
  test('#802 zakázka jen OCK: SoD PROJ se nehlásí, SoD realizace ano', jenOck.includes('sodNevyplneno') && !jenOck.includes('sodProjNevyplneno'), jenOck);
  const zp = zk.novaZakazka(); zp.cislo = '2026 - OVP - CN - 303'; zp.jenProj = true;
  const odvozene = kody({ zak: zp, sodNevyplneno: n });
  test('#802 strana odvozená ze zakázky (jen PROJ podle čísla / příznaku)', !odvozene.includes('sodNevyplneno') && odvozene.includes('sodProjNevyplneno'), odvozene);
}

/* ---------- #803 skloňování ---------- */
try {
  const ui = cti('ui/zakazka_ui.js');
  const ctx = { Math };
  vm.createContext(ctx);
  vm.runInContext(ui.slice(ui.indexOf('function zakPolozekText'), ui.indexOf('function varNova')) + '\nthis.f = zakPolozekText;', ctx);
  test('#803 0 / 1 / 2 / 4 / 5 / 12 položek', ['0 položek', '1 položka', '2 položky', '4 položky', '5 položek', '12 položek'].join()
    === [0, 1, 2, 4, 5, 12].map(ctx.f).join(), [0, 1, 2, 4, 5, 12].map(ctx.f));
  test('#803 karta Cenová nabídka používá skloňování', /zakPolozekText\(priplNahled\)/.test(ui) && !/priplNahled \+ ' položek/.test(ui));
} catch (e) { test('#803 skloňování', false, e.message); }

/* ---------- #801 uložení bez hlavičky ---------- */
try {
  const ui = cti('ui/zakulozeni_ui.js');
  const blok = ui.slice(ui.indexOf("if (s.stav === 'vyplnit') {"), ui.indexOf('return Promise.resolve(false);', ui.indexOf("if (s.stav === 'vyplnit') {")));
  test('#801 bez čísla / názvu se nepřepíná na Přehled', !/prepniTab\('zakazka'\)/.test(blok) && /prepniTab\(zakUlozeniTabHlavicky\(\)\)/.test(blok)
    && /zakUlozeniUkazHlavicku\(\)/.test(blok), blok.slice(0, 300));
  const ctx = { TAB: 'kalk', ZAK: {}, zakazkaVyrazenaStrana: () => '' };
  vm.createContext(ctx);
  vm.runInContext(ui.slice(ui.indexOf('function zakUlozeniTabHlavicky'), ui.indexOf('function zakUlozeniUkazHlavicku')) + '\nthis.f = zakUlozeniTabHlavicky;', ctx);
  const t = (tab, vyr) => { ctx.TAB = tab; ctx.zakazkaVyrazenaStrana = () => vyr; return ctx.f(); };
  test('#801 z Kalkulace OCK / PROJ zůstane na místě', t('kalk', '') === 'kalk' && t('proj', '') === 'proj' && t('proj', 'proj') === 'proj');
  test('#801 odjinud do Kalkulace OCK, u zakázky jen PROJ do Kalkulace PROJ', t('kryci', '') === 'kalk' && t('zakazka', 'ock') === 'proj' && t('zakazka', 'proj') === 'kalk');
} catch (e) { test('#801 uložení bez hlavičky', false, e.message); }

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
