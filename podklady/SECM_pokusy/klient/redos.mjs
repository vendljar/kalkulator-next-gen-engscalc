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
/* Měření běží v samostatném vlákně s časovým limitem — exponenciální
 * backtracking by jinak zasekl celý pokus (první verze visela). */
const { Worker } = await import('node:worker_threads');
const KOD_VLAKNA = `
const { parentPort, workerData: r } = require('node:worker_threads');
const re = new RegExp(r.src, r.flags.replace(/[gy]/g, ''));
const UKONC = ['!', '\\u0000', 'x', '\\n', '"'];
const znaky = new Set(['a', '0', ' ', '-', '.', '<', '\\n', '\\t', ',', '/', '"', "'", '=', ':', '_', 'Č']);
for (const ch of r.src.replace(/\\\\[dswbDSWB]/g, '').replace(/\\\\(.)/g, '$1')) if (ch.charCodeAt(0) > 31) znaky.add(ch);
const pumpy = [...znaky]; const zn = [...znaky].slice(0, 14);
for (const a of zn) for (const b of zn) if (a !== b) pumpy.push(a + b);
const cas = (p, u, n) => { const s = p.repeat(Math.ceil(n / p.length)) + u; const t0 = process.hrtime.bigint(); re.test(s); s.replace(re, ''); return Number(process.hrtime.bigint() - t0) / 1e6; };
let nej = { ms: 0 }, exp = null;
for (const p of pumpy) for (const u of UKONC) {
  parentPort.postMessage({ prubeh: JSON.stringify(p) + '+' + JSON.stringify(u) });
  const e1 = cas(p, u, 18), e2 = cas(p, u, 26);           // exponenciála: 8 znaků navíc = ×256
  if (e2 > 30 && e2 / Math.max(e1, 0.01) > 20) { exp = { pumpa: p, ukonc: u, ms18: e1, ms26: e2 }; break; }
  const m1 = cas(p, u, 2000); if (m1 < 0.5) continue;
  const m2 = m1 > 500 ? m1 * 100 : cas(p, u, 20000);
  if (m2 > nej.ms) nej = { ms: m2, ms2k: m1, pumpa: JSON.stringify(p), ukonc: JSON.stringify(u), pomer: +(m2 / Math.max(m1, 0.05)).toFixed(1) };
  if (exp) break;
}
parentPort.postMessage({ hotovo: true, nej, exp });
`;
const mer = (r) => new Promise((res) => {
  const w = new Worker(KOD_VLAKNA, { eval: true, workerData: { src: r.src, flags: r.flags } });
  let posledni = '';
  const t = setTimeout(() => { w.terminate(); res({ visi: true, posledni }); }, 8000);
  w.on('message', (m) => { if (m.prubeh) posledni = m.prubeh; if (m.hotovo) { clearTimeout(t); w.terminate(); res(m); } });
  w.on('error', (e) => { clearTimeout(t); res({ chyba: e.message }); });
});
let pocet = 0, podezrelych = 0, dynamickych = 0;
const vysledky = [];
for (const r of regexy) {
  if (r.dyn) { dynamickych++; vysledky.push({ ...r, stav: 'DYNAMICKÝ (posoudit ručně)' }); continue; }
  try { new RegExp(r.src, r.flags.replace(/[gy]/g, '')); } catch (e) { vysledky.push({ ...r, stav: 'nejde sestavit: ' + e.message }); continue; }
  pocet++;
  const m = await mer(r);
  const nejhorsi = m.nej || { ms: 0 };
  const staticky = VNORENE.test(r.src);
  const pod = m.visi || m.exp || nejhorsi.ms > 200 || (nejhorsi.pomer > 40 && nejhorsi.ms > 20);
  if (pod) podezrelych++;
  vysledky.push({ ...r, stav: pod ? 'PODEZŘELÉ' : 'ok', staticky, nejhorsi, visi: m.visi, posledni: m.posledni, exp: m.exp, chyba: m.chyba });
  if (pod) console.log('  ! ' + r.kde + ' /' + r.src.slice(0, 80) + '/', JSON.stringify({ visi: m.visi, posledni: m.posledni, exp: m.exp, nejhorsi }));
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
vysledky.filter(v => v.stav === 'PODEZŘELÉ').forEach(v => console.log(v.kde, '/' + v.src + '/' + v.flags, JSON.stringify({ visi: v.visi, posledni: v.posledni, exp: v.exp, nejhorsi: v.nejhorsi })));
console.log(`\nVÝSLEDEK: ${pocet} regexů změřeno, ${podezrelych} podezřelých (>200 ms na 20k znacích nebo superlineární růst), ${dynamickych} dynamických k ručnímu posouzení`);
