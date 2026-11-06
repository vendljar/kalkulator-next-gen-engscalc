/* CA #575 — ČÍSELNÁ POLE S ČESKOU DESETINNOU ČÁRKOU (rozhodnutí J. V.
 * 6. 11. 2026: „všechna číselná pole přijmou čárku i tečku a vždy zobrazí
 * českou desetinnou čárku, nezávisle na prohlížeči a jeho jazyku").
 *
 * Hlídá:
 *  – parser cisloPoleText (format.js): „17,3", „17.3", „1 250", „1 250,5",
 *    „-0,5", prázdné = '', nečitelné = null (odmítne se);
 *  – zobrazení cisloPoleZobraz: čárka, mezera v tisících jako formatCislo
 *    ve výstupech, žádné zaokrouhlení;
 *  – JEDEN prvek: v src/ui už není žádné `type="number"`, atributy
 *    CISLO_POLE jsou definované jen v ui/cislo_pole.js a build ho skládá
 *    PŘED common.js (inp() ho používá);
 *  – inp() v common.js kreslí číselné pole přes CISLO_POLE.
 * Pojistka: na 977bd57 selže (cisloPoleText neexistuje, v src/ui je
 * 61× type="number"); po opravě projde.
 * Spuštění: cd src && node test_575_cislo_pole.js */
const fs = require('fs');
const path = require('path');
const F = require('./format.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };

test('format.js vyváží cisloPoleText a cisloPoleZobraz',
  typeof F.cisloPoleText === 'function' && typeof F.cisloPoleZobraz === 'function');
const T = F.cisloPoleText || (() => undefined);
const Zb = F.cisloPoleZobraz || (() => undefined);

const cteni = [
  ['17,3', '17.3'], ['17.3', '17.3'], ['1 250', '1250'], ['1 250,5', '1250.5'],
  ['1\u00a0250,5', '1250.5'], ['12\u202f500', '12500'], ['1 250 000', '1250000'],
  ['-0,5', '-0.5'], ['−0,5', '-0.5'], ['- 3', '-3'], ['+4', '4'], [',5', '0.5'], ['5,', '5'],
  ['  17,3  ', '17.3'], ['0', '0'], ['', ''], ['   ', ''], [null, ''], [undefined, ''],
  [17.3, '17.3'], [0, '0'], [-2, '-2'],
];
cteni.forEach(([vstup, cekam]) =>
  test(`čte ${JSON.stringify(vstup)} → ${JSON.stringify(cekam)}`, T(vstup) === cekam, T(vstup)));
['abc', '1,2,3', '1.2.3', '17,3,', '1 25', '12 34,5', '1  250', '1.250,5', '1e3', '-', ',', '17,3 m', 'Kč 5', NaN, Infinity]
  .forEach(v => test(`odmítne ${JSON.stringify(String(v))} (null)`, T(v) === null, T(v)));

test('čtení dává Number beze ztráty: +„17,3" = 17,3, +„1 250,5" = 1250,5',
  +T('17,3') === 17.3 && +T('1 250,5') === 1250.5);

const ukaz = [
  [17.3, '17,3'], ['17.3', '17,3'], ['17,30', '17,30'], [1250, '1\u00a0250'], [1250.5, '1\u00a0250,5'], [999, '999'],
  [12500, '12\u00a0500'], [1250000.25, '1\u00a0250\u00a0000,25'], [-0.5, '-0,5'], [0, '0'],
  ['', ''], [0.333333333, '0,333333333'], ['abc', 'abc'],
];
ukaz.forEach(([vstup, cekam]) =>
  test(`ukáže ${JSON.stringify(vstup)} jako ${JSON.stringify(cekam)}`, Zb(vstup) === cekam, Zb(vstup)));
test('mezera v tisících jako formatCislo ve výstupech (12 500, 1 250)',
  Zb(12500) === F.formatCislo(12500) && Zb(1250) === F.formatCislo(1250), [Zb(12500), F.formatCislo(12500)]);
test('zobrazené se přečte zpět na totéž číslo', [17.3, 1250.5, 12500, -0.5, 1250000.25]
  .every(n => +T(Zb(n)) === n));

/* Jeden prvek pro celou aplikaci */
const UI = path.join(__dirname, 'ui');
const soubory = fs.readdirSync(UI).filter(f => f.endsWith('.js'));
const sNumber = soubory.filter(f => f !== 'cislo_pole.js'
  && /type=["']?number|type=\\"number/.test(fs.readFileSync(path.join(UI, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')));
test('v src/ui není žádné pole type="number" (všechna jdou přes CISLO_POLE)', sNumber.length === 0, sNumber);
const definice = soubory.filter(f => /const CISLO_POLE\s*=/.test(fs.readFileSync(path.join(UI, f), 'utf8')));
test('CISLO_POLE je definované jen v ui/cislo_pole.js', definice.length === 1 && definice[0] === 'cislo_pole.js', definice);
/* Plán plateb PROJ (plan_plateb_ui.js) má od dřív vlastní TEXTOVÁ pole
 * s čárkou: částka přijímá i „95 880 Kč" (planCastkaZTextu) a procento
 * splátky se zaokrouhluje na setiny. Na jazyku prohlížeče nezávisela nikdy,
 * proto zůstávají — jiný prvek nikde jinde být nesmí. */
const kopie = soubory.filter(f => f !== 'cislo_pole.js' && f !== 'plan_plateb_ui.js'
  && /inputmode="decimal"|data-cislo=/.test(fs.readFileSync(path.join(UI, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')));
test('atributy číselného pole se nikde neopisují (žádné kopie)', kopie.length === 0, kopie);
const build = fs.readFileSync(path.join(__dirname, '..', 'build.py'), 'utf8');
test('build skládá ui/cislo_pole.js před ui/common.js', /'ui\/cislo_pole\.js',\s*'ui\/common\.js'/.test(build));
const tpl = fs.readFileSync(path.join(__dirname, 'app_template.html'), 'utf8');
test('CSS nemá pravidla pro input[type=number] (styl nese input[data-cislo])',
  !/input\[type=number\]/.test(tpl) && /input\[data-cislo\]/.test(tpl));

/* inp() kreslí číselné pole společným prvkem */
global.CISLO_POLE = 'inputmode="decimal" autocomplete="off" data-cislo="1"';
const common = fs.readFileSync(path.join(UI, 'common.js'), 'utf8');
const inpSrc = (common.match(/function inp\([\s\S]*?\n}\n/) || [''])[0];
test('inp() v common.js používá CISLO_POLE (číslo i procenta)', (inpSrc.match(/\$\{CISLO_POLE\}/g) || []).length >= 2, inpSrc.length);

/* ui/cislo_pole.js v Node: náhradní HTMLInputElement a document. */
{
  const vm = require('vm');
  class HTMLInputElement {
    constructor(attrs) { this.tagName = 'INPUT'; this._a = Object.assign({}, attrs); this._v = this._a.value || ''; }
    hasAttribute(k) { return k in this._a; }
    getAttribute(k) { return k in this._a ? this._a[k] : null; }
    setAttribute(k, v) { this._a[k] = String(v); if (k === 'value' && !this._dirty) this._v = String(v); }
    get defaultValue() { return this.getAttribute('value') || ''; }
  }
  Object.defineProperty(HTMLInputElement.prototype, 'value', { configurable: true, enumerable: true,
    get() { return this._v; }, set(v) { this._v = String(v); this._dirty = true; } });
  const posl = {};
  const hlasky = [];
  const document = { readyState: 'complete', documentElement: {}, querySelectorAll: () => [],
    addEventListener: (typ, fn) => { posl[typ] = fn; } };
  const ctx = vm.createContext(Object.assign({ console, HTMLInputElement, document,
    hlaska: t => hlasky.push(t) }, F));
  vm.runInContext(fs.readFileSync(path.join(UI, 'cislo_pole.js'), 'utf8') + '\n;this.CISLO_POLE = CISLO_POLE;', ctx, { filename: 'cislo_pole.js' });
  test('CISLO_POLE nemá type (textové pole mimo CSS input[type=text]) a nese data-cislo',
    !/type=/.test(ctx.CISLO_POLE) && /data-cislo=/.test(ctx.CISLO_POLE) && /inputmode="decimal"/.test(ctx.CISLO_POLE), ctx.CISLO_POLE);
  const pole = (v) => new HTMLInputElement({ 'data-cislo': '1', value: v });
  const a = pole('17,3');
  test('value čísla „17,3" vrací „17.3" (jako dřív type=number)', a.value === '17.3', a.value);
  test('value „1 250,5" vrací „1250.5"', pole('1 250,5').value === '1250.5');
  test('value nečitelného textu vrací prázdno', pole('abc').value === '', pole('abc').value);
  const b = pole(''); b.value = 17.3;
  test('zápis value = 17.3 ukáže „17,3"', ctx.cisloPoleSurove(b) === '17,3', ctx.cisloPoleSurove(b));
  const obyc = new HTMLInputElement({ value: '17,3' });
  test('obyčejné textové pole se nemění', obyc.value === '17,3');
  const c = new HTMLInputElement({ 'data-cislo': '1', value: '12500.5', placeholder: '3500' });
  ctx.cisloPoleUprav(c);
  test('vložené pole ukáže hodnotu i placeholder česky („12 500,5", „3 500")',
    c.getAttribute('value') === '12 500,5' && c.getAttribute('placeholder') === '3 500', [c.getAttribute('value'), c.getAttribute('placeholder')]);
  const tx = new HTMLInputElement({ 'data-cislo': '1', placeholder: 'jako šachta' });
  ctx.cisloPoleUprav(tx);
  test('textový placeholder zůstává', tx.getAttribute('placeholder') === 'jako šachta');

  test('posluchače change a beforeinput jsou zaregistrované', typeof posl.change === 'function' && typeof posl.beforeinput === 'function');
  const zmena = (el) => { let stop = false; posl.change({ target: el, stopImmediatePropagation: () => { stop = true; } }); return stop; };
  const d = new HTMLInputElement({ 'data-cislo': '1', value: '17,3' }); d.value = '1,2,3';
  ctx.cisloPoleSuroveNastav(d, '1,2,3');
  const zast = zmena(d);
  test('nečitelný zápis „1,2,3" se zastaví před obsluhou pole', zast === true);
  test('… pole se vrátí na původní „17,3"', ctx.cisloPoleSurove(d) === '17,3', ctx.cisloPoleSurove(d));
  test('… a ohlásí se hláška „není číslo"', hlasky.length === 1 && /není číslo/.test(hlasky[0]), hlasky);
  const e = new HTMLInputElement({ 'data-cislo': '1', value: '' }); ctx.cisloPoleSuroveNastav(e, '17.3');
  test('čitelný zápis „17.3" projde a ukáže se „17,3"', zmena(e) === false && ctx.cisloPoleSurove(e) === '17,3', ctx.cisloPoleSurove(e));
  const prazdne = new HTMLInputElement({ 'data-cislo': '1', value: '5' }); ctx.cisloPoleSuroveNastav(prazdne, '');
  test('prázdný zápis projde (prázdno = prázdno)', zmena(prazdne) === false && prazdne.value === '');
  const vstup = (data) => { let zak = false; posl.beforeinput({ target: pole(''), inputType: 'insertText', data, preventDefault: () => { zak = true; } }); return zak; };
  test('psaní: písmeno se nepustí, číslice, čárka, tečka, mezera a minus ano',
    vstup('x') && vstup('e') && !vstup('1') && !vstup(',') && !vstup('.') && !vstup(' ') && !vstup('-'));
  test('cisloPoleChybne pozná nečitelný obsah', ctx.cisloPoleChybne(Object.assign(pole(''), {})) === false
    && (() => { const q = pole(''); ctx.cisloPoleSuroveNastav(q, 'abc'); return ctx.cisloPoleChybne(q); })());
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
