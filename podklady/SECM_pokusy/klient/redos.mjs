/* SEC-M klient, bod 2 — ReDoS: všechny regulární výrazy v src/ a netlify/
 * (mimo testy), literály i `new RegExp('…')` s literálem, se změří na zlých
 * vstupech.
 *
 * Postup: parser TypeScriptu vytáhne každý regex. Statická heuristika označí
 * vnořené kvantifikátory „(…+)+“, „(…*)*“, „(a|a)*“ a sousední překrývající se
 * kvantifikované třídy (polynom). Potom se KAŽDÝ regex (nejen podezřelý)
 * pustí na pumpované řetězce: znaky, které se v regexu vyskytují (a typické
 * „a“, „0“, mezera, „-“, „.“, „<“, „\n“), opakované N = 2 000 a 20 000×,
 * zakončené znakem, který shodu rozbije („!“, „\u0000“, „x“). Měří se
 * nejhorší čas; > 200 ms při 20 000 znacích nebo poměr časů 20k/2k > 40
 * (kvadratický a horší růst) = PODEZŘELÉ.
 * Spuštění z kořene repa: node podklady/SECM_pokusy/klient/redos.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const ts = require(path.join(execSync('npm root -g').toString().trim(), 'typescript'));
const KOREN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const soubory = [];
const projdi = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f);
  if (fs.statSync(p).isDirectory()) { if (!/fixtury|node_modules/.test(f)) projdi(p); continue; }
  if (/\.(m?js)$/.test(f) && !/^test_|^mutace/.test(f)) soubory.push(p); } };
projdi(path.join(KOREN, 'src')); projdi(path.join(KOREN, 'netlify'));

const regexy = [];
for (const f of soubory) {
  const sf = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const v = (u) => {
    if (u.kind === ts.SyntaxKind.RegularExpressionLiteral) {
      const t = u.getText(sf); const i = t.lastIndexOf('/');
      regexy.push({ kde: path.relative(KOREN, f) + ':' + (sf.getLineAndCharacterOfPosition(u.getStart(sf)).line + 1), src: t.slice(1, i), flags: t.slice(i + 1) });
    }
    if (ts.isNewExpression(u) && ts.isIdentifier(u.expression) && u.expression.text === 'RegExp' && u.arguments && u.arguments[0]) {
      const a = u.arguments[0];
      const kde = path.relative(KOREN, f) + ':' + (sf.getLineAndCharacterOfPosition(u.getStart(sf)).line + 1);
      if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) regexy.push({ kde, src: a.text, flags: u.arguments[1] && ts.isStringLiteral(u.arguments[1]) ? u.arguments[1].text : '', dyn: false });
      else regexy.push({ kde, src: a.getText(sf).replace(/\s+/g, ' ').slice(0, 120), flags: '', dyn: true });
    }
    ts.forEachChild(u, v);
  };
  v(sf);
}
const VNORENE = /\((?:[^()\\]|\\.)*[+*}](?:\)|\|)[^)]*?\)?[+*{]|\((?:[^()\\]|\\.)*[+*]\)[+*{]/;
let pocet = 0, podezrelych = 0, dynamickych = 0;
const vysledky = [];
const UKONC = ['!', '\u0000', 'x', '\n', '"'];
for (const r of regexy) {
  if (r.dyn) { dynamickych++; vysledky.push({ ...r, stav: 'DYNAMICKÝ (posoudit ručně)' }); continue; }
  let re; try { re = new RegExp(r.src, r.flags.replace(/[gy]/g, '')); } catch (e) { vysledky.push({ ...r, stav: 'nejde sestavit: ' + e.message }); continue; }
  pocet++;
  const znaky = new Set(['a', '0', ' ', '-', '.', '<', '\n', '\t', ',', '/', '"', "'", '=', ':', '_', 'Č']);
  for (const ch of r.src.replace(/\\[dswbDSWB]/g, '').replace(/\\(.)/g, '$1')) if (ch.charCodeAt(0) > 31) znaky.add(ch);
  // dvojice znaků (pumpy typu „a.“, „0,“) z prvních pár znaků regexu
  const pumpy = [...znaky].map(c => c);
  const zn = [...znaky].slice(0, 12); for (const a of zn) for (const b of zn) if (a !== b) pumpy.push(a + b);
  let nejhorsi = { ms: 0 }, pomerMax = 0;
  for (const p of pumpy) for (const u of UKONC) {
    const t = (n) => { const s = p.repeat(Math.ceil(n / p.length)) + u; const t0 = process.hrtime.bigint(); re.test(s); s.replace(re, ''); return Number(process.hrtime.bigint() - t0) / 1e6; };
    const m1 = t(2000);
    if (m1 < 0.5) continue;                // lineárně rychlé — dál nemá cenu
    const m2 = t(20000);
    const pomer = m2 / Math.max(m1, 0.05);
    if (m2 > nejhorsi.ms) nejhorsi = { ms: m2, pumpa: JSON.stringify(p), ukonc: JSON.stringify(u), pomer: +pomer.toFixed(1) };
    if (pomer > pomerMax) pomerMax = pomer;
  }
  const staticky = VNORENE.test(r.src);
  const pod = nejhorsi.ms > 200 || (pomerMax > 40 && nejhorsi.ms > 20);
  if (pod) podezrelych++;
  vysledky.push({ ...r, stav: pod ? 'PODEZŘELÉ' : 'ok', staticky, nejhorsi });
}
console.log('Souborů:', soubory.length, '| regexů:', regexy.length, '| změřeno:', pocet, '| dynamických new RegExp:', dynamickych);
console.log('\n--- staticky vnořené kvantifikátory (heuristika) ---');
vysledky.filter(v => v.staticky).forEach(v => console.log(v.kde.padEnd(36), '/' + v.src.slice(0, 80) + '/' + v.flags, '→', v.stav, v.nejhorsi && v.nejhorsi.ms ? `${v.nejhorsi.ms.toFixed(1)} ms` : '<0.5 ms@2k'));
console.log('\n--- nejpomalejší (20 000 znaků) ---');
vysledky.filter(v => v.nejhorsi && v.nejhorsi.ms).sort((a, b) => b.nejhorsi.ms - a.nejhorsi.ms).slice(0, 15)
  .forEach(v => console.log(v.kde.padEnd(36), ('/' + v.src.slice(0, 70) + '/').padEnd(74), v.nejhorsi.ms.toFixed(1) + ' ms', 'pumpa', v.nejhorsi.pumpa, '+', v.nejhorsi.ukonc, 'poměr 20k/2k', v.nejhorsi.pomer));
console.log('\n--- dynamické new RegExp ---');
vysledky.filter(v => v.dyn).forEach(v => console.log(v.kde.padEnd(36), v.src));
console.log('\n--- PODEZŘELÉ ---');
vysledky.filter(v => v.stav === 'PODEZŘELÉ').forEach(v => console.log(v.kde, '/' + v.src + '/' + v.flags, JSON.stringify(v.nejhorsi)));
console.log(`\nVÝSLEDEK: ${pocet} regexů změřeno, ${podezrelych} podezřelých (>200 ms na 20k znacích nebo superlineární růst), ${dynamickych} dynamických k ručnímu posouzení`);
