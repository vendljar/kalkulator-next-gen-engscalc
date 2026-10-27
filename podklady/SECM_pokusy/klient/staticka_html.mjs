/* SEC-M klient, bod 2 — statická analýza skládání HTML v src/ a netlify/.
 *
 * Parser TypeScriptu (globální instalace, jen čtení) projde každý .js/.mjs
 * mimo testy a:
 *   1) spočítá zápisy do HTML (innerHTML/outerHTML =, insertAdjacentHTML,
 *      document.write) a nebezpečné konstrukce (eval, new Function,
 *      setTimeout/setInterval s řetězcem, javascript: v kódu);
 *   2) v každé šabloně `…${x}…` a v každém řetězení `'<…' + x`, jejichž text
 *      vypadá na HTML (obsahuje „<“ nebo `on…=`/`="`), zatřídí každou vloženou
 *      hodnotu: ESC (esc/escJs/dlgEsc/xmlEsc/e2/…), CISLO (formátovací funkce,
 *      aritmetika, literál), FRAGMENT (volání funkce skládající HTML, .join,
 *      vnořená šablona, proměnná s HTML — kontroluje se na místě vzniku),
 *      JINE = k ručnímu posouzení. Vypíše počty a seznam JINE.
 * Spuštění z kořene repa: node podklady/SECM_pokusy/klient/staticka_html.mjs [--vse]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const ts = require(path.join(execSync('npm root -g').toString().trim(), 'typescript'));
const KOREN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const VSE = process.argv.includes('--vse');

const soubory = [];
const projdi = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const st = fs.statSync(p);
  if (st.isDirectory()) { if (!/fixtury|node_modules/.test(f)) projdi(p); continue; }
  if (/\.(m?js)$/.test(f) && !/^test_|^mutace/.test(f)) soubory.push(p); } };
projdi(path.join(KOREN, 'src')); projdi(path.join(KOREN, 'netlify'));

const ESC = /^(esc|escJs|dlgEsc|xmlEsc|xmlEscRadky|e2|keyAttr|encodeURIComponent|csvBunka|ctrlCsvBunka|xEsc|escAttr|htmlEsc)$/;
const CISLO = /^(num|fmt\w*|Kc|kc\w*|fmtKc|fmt0|Math\.\w+|Number|parseInt|parseFloat|toFixed|toLocaleString|round\w*|zaokr\w*|procent\w*|pct\w*|eur\w*|cis\w*|mena\w*|datum\w*|cas\w*|fmtDat\w*|String\(Number)$/i;
let n = { sablon: 0, retezeni: 0, ESC: 0, CISLO: 0, FRAGMENT: 0, LIT: 0, JINE: 0 };
const jine = [], volani = new Map();
const sinky = { innerHTML: 0, outerHTML: 0, insertAdjacentHTML: 0, 'document.write': 0, eval: 0, 'new Function': 0, 'setTimeout(str)': 0, 'setInterval(str)': 0, 'javascript: v kódu': 0 };
const sinkyMista = [];
const htmlText = (t) => /<\/?[a-zA-Z!]|\son\w+\s*=|=\s*["']$|^["']|="|='/.test(t);

function jmenoVolani(e) {
  if (ts.isCallExpression(e)) { const c = e.expression;
    if (ts.isIdentifier(c)) return c.text;
    if (ts.isPropertyAccessExpression(c)) return (ts.isIdentifier(c.expression) ? c.expression.text + '.' : '') + c.name.text; }
  return null;
}
function zatrid(e, sf) {
  while (ts.isParenthesizedExpression(e) || ts.isAsExpression?.(e) || ts.isNonNullExpression?.(e)) e = e.expression;
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return 'LIT';
  if (ts.isNumericLiteral(e) || e.kind === ts.SyntaxKind.TrueKeyword || e.kind === ts.SyntaxKind.FalseKeyword || e.kind === ts.SyntaxKind.NullKeyword) return 'LIT';
  if (ts.isTemplateExpression(e)) return 'FRAGMENT';            // sama se prověří
  if (ts.isConditionalExpression(e)) return horsi(zatrid(e.whenTrue, sf), zatrid(e.whenFalse, sf));
  if (ts.isBinaryExpression(e)) {
    const op = e.operatorToken.kind;
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) return horsi(zatrid(e.left, sf), zatrid(e.right, sf));
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) return zatrid(e.right, sf);
    if (op === ts.SyntaxKind.PlusToken) return horsi(zatrid(e.left, sf), zatrid(e.right, sf));
    if ([ts.SyntaxKind.MinusToken, ts.SyntaxKind.AsteriskToken, ts.SyntaxKind.SlashToken, ts.SyntaxKind.PercentToken,
         ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.LessThanToken, ts.SyntaxKind.EqualsEqualsEqualsToken,
         ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.GreaterThanEqualsToken, ts.SyntaxKind.LessThanEqualsToken].includes(op)) return 'CISLO';
  }
  if (ts.isPrefixUnaryExpression(e) || ts.isTypeOfExpression(e)) return 'CISLO';
  if (ts.isCallExpression(e)) {
    const j = jmenoVolani(e) || '';
    const kratke = j.split('.').pop();
    if (ESC.test(kratke)) return 'ESC';
    if (CISLO.test(j) || CISLO.test(kratke)) return 'CISLO';
    if (kratke === 'join' || kratke === 'map') return 'FRAGMENT';
    volani.set(j, (volani.get(j) || 0) + 1);
    return 'FRAGMENT';                                           // funkce skládající HTML — prověří se v jejím těle
  }
  return 'JINE';
}
const RAD = { LIT: 0, CISLO: 1, ESC: 2, FRAGMENT: 3, JINE: 4 };
const horsi = (a, b) => (RAD[a] >= RAD[b] ? a : b);

function zapis(e, sf, ctx) {
  const k = zatrid(e, sf);
  n[k]++;
  if (k === 'JINE') {
    const { line } = sf.getLineAndCharacterOfPosition(e.getStart(sf));
    jine.push({ kde: path.relative(KOREN, sf.fileName) + ':' + (line + 1), vyraz: e.getText(sf).replace(/\s+/g, ' ').slice(0, 90), ctx: ctx.replace(/\s+/g, ' ').slice(-50) });
  }
}
function plusOperandy(e, out) {
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) { plusOperandy(e.left, out); plusOperandy(e.right, out); }
  else out.push(e);
  return out;
}
for (const f of soubory) {
  const txt = fs.readFileSync(f, 'utf8');
  const sf = ts.createSourceFile(f, txt, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const navstivene = new Set();
  const mist = (uzel, co) => { sinky[co]++; const { line } = sf.getLineAndCharacterOfPosition(uzel.getStart(sf)); sinkyMista.push(co + ' ' + path.relative(KOREN, f) + ':' + (line + 1)); };
  const v = (uzel) => {
    if (ts.isBinaryExpression(uzel) && uzel.operatorToken.kind === ts.SyntaxKind.EqualsToken || (ts.isBinaryExpression(uzel) && uzel.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken)) {
      if (ts.isPropertyAccessExpression(uzel.left) && /^(innerHTML|outerHTML)$/.test(uzel.left.name.text)) mist(uzel, uzel.left.name.text);
    }
    if (ts.isCallExpression(uzel)) {
      const j = jmenoVolani(uzel) || '';
      if (/insertAdjacentHTML$/.test(j)) mist(uzel, 'insertAdjacentHTML');
      if (ts.isPropertyAccessExpression(uzel.expression) && /^(write|writeln)$/.test(uzel.expression.name.text) && /document/.test(uzel.expression.expression.getText(sf))) mist(uzel, 'document.write');
      if (j === 'eval') mist(uzel, 'eval');
      if (/^(setTimeout|setInterval|window\.setTimeout|window\.setInterval)$/.test(j) && uzel.arguments[0] && (ts.isStringLiteral(uzel.arguments[0]) || ts.isTemplateExpression(uzel.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(uzel.arguments[0]))) mist(uzel, j.replace('window.', '') + '(str)');
    }
    if (ts.isNewExpression(uzel) && ts.isIdentifier(uzel.expression) && uzel.expression.text === 'Function') mist(uzel, 'new Function');
    if ((ts.isStringLiteral(uzel) || ts.isNoSubstitutionTemplateLiteral(uzel)) && /^\s*javascript:/i.test(uzel.text)) mist(uzel, 'javascript: v kódu');
    if (ts.isTemplateExpression(uzel)) {
      let text = uzel.head.text; const casti = [];
      for (const s of uzel.templateSpans) { casti.push([s.expression, text]); text += '\u0000' + s.literal.text; }
      if (htmlText(text)) { n.sablon++; for (const [e, pred] of casti) zapis(e, sf, pred); }
    }
    if (ts.isBinaryExpression(uzel) && uzel.operatorToken.kind === ts.SyntaxKind.PlusToken && !navstivene.has(uzel)) {
      const op = plusOperandy(uzel, []);
      // označ vnořené + jako navštívené
      const oznac = (x) => { if (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.PlusToken) { navstivene.add(x); oznac(x.left); oznac(x.right); } }; oznac(uzel);
      const lit = op.filter(x => ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)).map(x => x.text).join('\u0000');
      if (htmlText(lit)) { n.retezeni++; let pred = ''; for (const x of op) { if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) { pred += x.text; continue; } if (ts.isTemplateExpression(x)) continue; zapis(x, sf, pred); } }
    }
    ts.forEachChild(uzel, v);
  };
  v(sf);
}
console.log('Souborů:', soubory.length);
console.log('Zápisy do HTML a nebezpečné konstrukce:', JSON.stringify(sinky));
console.log('HTML šablon:', n.sablon, '| HTML řetězení (+):', n.retezeni);
console.log('Vložené hodnoty: ESC', n.ESC, '| CISLO', n.CISLO, '| LIT', n.LIT, '| FRAGMENT', n.FRAGMENT, '| JINE (k ručnímu posouzení)', n.JINE);
if (VSE) { console.log('\n--- zápisy do HTML ---'); sinkyMista.forEach(x => console.log(x)); }
console.log('\n--- JINE ---');
for (const j of jine) console.log(j.kde.padEnd(38), j.vyraz.padEnd(60), '| …' + j.ctx);
if (VSE) { console.log('\n--- volání ve FRAGMENT (jméno: počet) ---'); console.log([...volani].sort((a, b) => b[1] - a[1]).map(([k, c]) => k + ':' + c).join(', ')); }
const nebezpecne = sinky.eval + sinky['new Function'] + sinky['setTimeout(str)'] + sinky['setInterval(str)'];
console.log(`\nVÝSLEDEK: ${n.ESC + n.CISLO + n.LIT + n.FRAGMENT + n.JINE} vložených hodnot v ${n.sablon + n.retezeni} HTML výrazech; ${n.JINE} k ručnímu posouzení; eval/new Function/setTimeout(str) mimo testy: ${nebezpecne}`);
