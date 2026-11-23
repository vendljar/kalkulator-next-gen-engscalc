/* RA #726 (VZD-N1, rozhodnutí J. V. 23. 11. 2026) — upozornění na zastaralé
 * řádky termínu DPZ ve vlastním textu TERMÍNY nabídky PROJ.
 *
 * Hlídá:
 *   1. model podminkyTerminyDpzVarovani (src/podminky.js): výchozí znění
 *      i vlastní text s oběma řádky „dpz+studie“ / „dpz-studie“ = bez
 *      upozornění; vlastní text bez nich (starý řádek „dpz“ pro hrubopis) =
 *      text upozornění s doporučením „vymazat pole = výchozí znění“;
 *   2. Nastavení → Smlouvy / Šablony → Texty nabídky PROJ (nastPodminkyTextyProj)
 *      a karta Lhůty PROJ (lhutyProjKarta, náhled termínů) upozornění ukážou;
 *   3. data se nemění (funkce nic nezapisuje) a efektivní termíny jsou tytéž.
 * Pojistka: před opravou sada padá (podminkyTerminyDpzVarovani neexistuje,
 * v Nastavení žádné upozornění).
 *
 * Spuštění: cd src && node test_ra_terminy_proj.js */
const fs = require('fs');
const vm = require('vm');
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 600)); } };

const PM = require('./podminky.js');
test('podminkyTerminyDpzVarovani existuje', typeof PM.podminkyTerminyDpzVarovani === 'function');
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }
const V = PM.podminkyTerminyDpzVarovani;
const kopie = (x) => JSON.parse(JSON.stringify(x));

/* Výchozí znění (česky) jako vlastní text = v pořádku. */
const vychozi = kopie(PM.PODMINKY_VYCHOZI.nabidkaProj.terminy.cz);
/* Starý vlastní text z doby před D1: hrubopis DPZ s klíčem „dpz“, bez podmíněných řádků. */
const stary = vychozi.filter(r => r[2] !== 'dpz-studie').map(r => r[2] === 'dpz+studie' ? [r[0], r[1], 'dpz'] : r);
const jenJeden = vychozi.filter(r => r[2] !== 'dpz-studie');

/* ---------- 1. MODEL ---------- */
test('bez firemních podmínek / bez vlastních termínů → bez upozornění',
  V(undefined) === '' && V(null) === '' && V({}) === '' && V({ nabidkaProj: {} }) === '' && V({ nabidkaProj: { terminy: {} } }) === '');
test('vlastní text = výchozí znění (oba řádky) → bez upozornění', V({ nabidkaProj: { terminy: { cz: vychozi } } }) === '');
const t1 = V({ nabidkaProj: { terminy: { cz: stary } } });
test('starý text (hrubopis „dpz“, bez dpz+studie / dpz-studie) → upozornění', /„dpz\+studie“ a „dpz-studie“/.test(t1)
  && /starý řádek „dpz“/.test(t1), t1);
test('… s doporučením „vymazat pole = výchozí znění“', /vymažte pole TERMÍNY/.test(t1) && /výchozí znění/.test(t1), t1);
const t2 = V({ nabidkaProj: { terminy: { cz: jenJeden } } });
test('chybí jen „dpz-studie“ → upozornění jmenuje jen ten řádek', /řádek „dpz-studie“/.test(t2) && !/„dpz\+studie“/.test(t2)
  && !/starý řádek/.test(t2), t2);
test('cizí jazyk bez klíčů (jen cz nese sekce) upozornění nespustí', V({ nabidkaProj: { terminy: { en: [['a', 'b']] } } }) === '');
test('nesmysl v datech nespadne (pole místo objektu, __proto__)', V([]) === '' && V({ nabidkaProj: [] }) === ''
  && V(JSON.parse('{"nabidkaProj":{"terminy":{"__proto__":{"cz":[["x","y","dpz"]]}}}}')) === ''
  && V({ nabidkaProj: { terminy: { cz: [null, 'x', ['a', 'b', 'dpz']] } } }) !== '');
{
  const p = { nabidkaProj: { terminy: { cz: kopie(stary) } } }; const pred = JSON.stringify(p);
  V(p);
  test('model data nemění', JSON.stringify(p) === pred);
}

/* ---------- 2. NASTAVENÍ (UI v pískovišti) ---------- */
const ctx = {
  console, PODMINKY: PM.PODMINKY, NAST: { firma: { podminky: { nabidkaProj: { terminy: { cz: kopie(stary) } } } } },
  esc: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  escJs: (s) => String(s), jeAdmin: () => true, hlaska: () => {}, firmaSet: () => {}, firmaDefault: () => ({}),
  CISLO_POLE: 'type="text"',
};
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
const nactiDoCtx = (f) => vm.runInContext(fs.readFileSync(__dirname + '/' + f, 'utf8'), ctx, { filename: f });
let uiChyba = '';
try {
  nactiDoCtx('lhuty_proj.js');
  nactiDoCtx('ui/podminky_ui.js');
  nactiDoCtx('ui/lhuty_proj_ui.js');
} catch (e) { uiChyba = String(e && e.message); }
test('UI moduly se načtou', !uiChyba, uiChyba);
const ef = PM.podminkyEf(ctx.NAST.firma);
let html = '';
try { html = vm.runInContext('nastPodminkyTextyProj', ctx)(ef); } catch (e) { html = 'CHYBA ' + e.message; }
test('Texty nabídky PROJ: upozornění u Termínů (štítek i text s doporučením)', /data-terminy-dpz="1"/.test(html)
  && /zastaralé řádky DPZ/.test(html) && /vymažte pole TERMÍNY/.test(html), html.slice(0, 300));
let lh = '';
try { lh = vm.runInContext('lhutyProjKarta', ctx)(); } catch (e) { lh = 'CHYBA ' + e.message; }
test('Lhůty PROJ (náhled termínů): upozornění s odkazem na Texty nabídky PROJ', /data-terminy-dpz="1"/.test(lh)
  && /Texty nabídky PROJ → Termíny/.test(lh), lh.slice(0, 300));
ctx.NAST.firma.podminky = {};
let html2 = '', lh2 = '';
try { html2 = vm.runInContext('nastPodminkyTextyProj', ctx)(PM.podminkyEf(ctx.NAST.firma)); lh2 = vm.runInContext('lhutyProjKarta', ctx)(); }
catch (e) { html2 = 'CHYBA ' + e.message; }
test('výchozí znění: žádné upozornění v Textech ani v Lhůtách', !/data-terminy-dpz/.test(html2) && !/zastaralé řádky DPZ/.test(html2)
  && !/data-terminy-dpz/.test(lh2) && !/^CHYBA/.test(html2), html2.slice(0, 200));

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
