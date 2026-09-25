/* P8 (K13-N60 + K12-N49), 24. 9. 2026 — pokrytí slovníku v cizojazyčné
 * nabídce OCK. Cizojazyčná nabídka tiskla česky:
 *   „TECHNICKÁ ČÁST – SPECIFIKACE DODÁVKY" (nadpis online nabídky),
 *   „žádné příplatky nejsou vybrány" (online nabídka i náhled podkladů),
 *   „nejsou součástí dodávky, viz příplatkové ceny" (přechodové plechy),
 *   „přirozené, do prostoru schodiště" (odvětrání interiérové šachty).
 *
 * Test projde VŠECHNY hodnoty technické specifikace, které jdou do nabídky
 * (zástupci TS_*), pro sadu zadání (interiér / exteriér, průchozí, s i bez
 * přechodových plechů a lešení) a všechny pevné texty online nabídky
 * (P('…') ve funkcích nabidkaNahled a nabidkaOckDokument). Každý musí mít
 * překlad do EN, DE i FR, nebo být neutrální (číslo, pomlčka, kód). */
const fs = require('fs');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
global.vypocet = eng.vypocet; global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI;
global.DEFAULT_CENIK = Object.assign(JSON.parse(JSON.stringify(eng.DEFAULT_CENIK)), ZC.zkusebniCenik());
const ep = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const tsm = require('./techspec.js');
global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
const zk = require('./zakazka.js');
const fm = require('./firma.js');
Object.keys(fm).forEach(k => { global[k] = fm[k]; });
const pr = require('./preklad.js');
Object.keys(pr).forEach(k => { global[k] = pr[k]; });
const { nabidkaData } = require('./nabidka.js');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info, null, 1)); } };
const JAZ = ['en', 'de', 'fr'];

/* Chybí překlad = tr vrátí originál a text není neutrální. */
const chybi = new Map();   // text → Set(jazyků)
function over(text, kde) {
  const t = String(text == null ? '' : text);
  if (!t.trim() || pr.prekladNeutral(t)) return;
  /* Název z ceníku (zkušební ceník si značí „(zkušební)"). Jména položek
   * ceníku nejsou texty aplikace — slovník je nese podle skutečného ceníku. */
  if (/\(zkušební\)\s*$/.test(t)) return;
  JAZ.forEach(L => {
    if (pr.trStav(t, L).prelozeno) return;
    if (!chybi.has(t)) chybi.set(t, { kde, jazyky: new Set() });
    chybi.get(t).jazyky.add(L);
  });
}

/* 1) Hodnoty specifikace v nabídce — ČESKÁ verze se prožene slovníkem. */
const SADA = [];
for (const typ of ['interiérová', 'exteriérová'])
  for (const pruchozi of [false, true])
    for (const plechy of [false, true])
      for (const leseni of [false, true]) SADA.push({ typ, pruchozi, plechy, leseni });
SADA.forEach(s => {
  const zak = zk.novaZakazka(); zak.cislo = '2026 - OPR - CN - 9138';
  const d = zak.varianty[0].data, z = d.ock.zadani;
  Object.assign(z, { typSachty: s.typ, prejezd: 2.7, zdvih: 12, prohluben: 1.1, sirka: 1.6, hloubka: 1.7,
                     pruchoziSachta: s.pruchozi, prechodovePlechy: s.plechy, striskaKs: s.pruchozi ? 2 : 0,
                     profily: JSON.parse(JSON.stringify(eng.PROFILY_VYCHOZI[s.typ])) });
  if (s.pruchozi) Object.assign(z, { nastupisteA: 3, nastupisteC: 2 });
  z.volitelne = Object.assign({}, z.volitelne, { leseniVnitrni: s.leseni, leseniVnejsi: s.leseni });
  const ph = nabidkaData(zak, zak.varianty[0], JEKLY, 'cz').placeholders;
  Object.keys(ph).filter(k => /^TS_/.test(k)).forEach(k => over(ph[k], k + ' (' + JSON.stringify(s) + ')'));
});

/* 2) Pevné texty online nabídky: P('…') v nabidkaNahled a nabidkaOckDokument. */
const src = fs.readFileSync(__dirname + '/ui/zakazka_ui.js', 'utf8');
['nabidkaNahled', 'nabidkaOckDokument'].forEach(fn => {
  const i = src.indexOf('async function ' + fn + '(');
  const j = src.indexOf('\nasync function ', i + 10) > 0 ? Math.min(...['\nasync function ', '\nfunction ']
    .map(x => src.indexOf(x, i + 10)).filter(x => x > 0)) : src.length;
  /* Tisková lišta (tiskListaHtml / tiskListaSkript) je ovládání okna
   * náhledu, třída noprint — do dokumentu se netiskne. Její texty tu
   * nehlídáme; překládají se, jen když na ně slovník má heslo. */
  const telo = src.slice(i, j)
    .replace(/tiskListaHtml\(\{[\s\S]*?\}\)/g, '')
    .replace(/tiskListaSkript\(\{[\s\S]*?\}\s*,/g, '');
  test('pevné texty: funkce ' + fn + ' se našla', i >= 0 && telo.length > 100);
  const re = /\bP\('((?:[^'\\]|\\.)*)'\)/g;
  let m; while ((m = re.exec(telo))) over(m[1].replace(/\\'/g, "'"), fn);
});

const seznam = [...chybi.entries()].map(([t, x]) => t + '  [' + [...x.jazyky].join(',') + ']  ← ' + x.kde);
test('všechny texty nabídky OCK mají překlad EN/DE/FR (nebo jsou neutrální)', chybi.size === 0, seznam);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
