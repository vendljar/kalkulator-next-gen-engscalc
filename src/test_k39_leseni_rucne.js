/* ===== K39-N1 — přepnutí typu tam a zpět nesmí zapnout lešení hlavy, které
 * měl obchodník u STARÉ zakázky vypnuté (kolo 39, sada G22, TEST K36-D18b) =====
 *
 * Pravidlo #546 nechává ruční volbu jen tehdy, když zadání nese
 * `leseniHlavaRucne`. Ten příznak ale UI zapisuje až od v2.11.3 — zakázka
 * uložená dřív ho nemá, i když obchodník lešení hlavy vypnul ručně. Po
 * přepnutí interiér → exteriér → interiér se lešení zapnulo podle sloupce
 * Výchozí a nabídka vzrostla o cenu položky.
 *
 * Oprava: typSachtyPrepni před změnou typu porovná stav lešení hlavy
 * (zaškrtnutí v základu i vynechání z nabídky příplatků) s výchozím stavem
 * PŮVODNÍHO typu (zobrazeniLeseniHlavaVychozi). Odchylka = ruční volba →
 * dopíše `leseniHlavaRucne` a pravidlo nepustí. Změnu pravidlem řekne
 * progZprava.
 *
 * Hlídá se:
 *   1) čistá funkce výchozího stavu (oba typy, s maticí i bez);
 *   2) stará zakázka bez příznaku s vypnutým lešením u interiéru — přepnutí
 *      tam a zpět ho nechá vypnuté (i cena);
 *   3) stará zakázka s výchozím stavem — pravidlo platí jako dosud + hláška;
 *   4) nová zakázka beze změny;
 *   5) zahraniční řada, oba směry (exteriér s ručně zapnutým lešením);
 *   6) zamčená varianta zůstane nedotčená (bez příznaku i bez změny).
 */
const fs = require('fs');
const vm = require('vm');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');

global.DEFAULT_ZADANI = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const engProj = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = JSON.parse(JSON.stringify(engProj.DEFAULT_ZADANI_PROJ));
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
global.DEFAULT_TECHSPEC = require('./techspec.js').DEFAULT_TECHSPEC;
const zk = require('./zakazka.js');
Object.keys(zk).forEach(k => { global[k] = zk[k]; });
const zo = require('./zobrazeni.js');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* Matice jako na testovacím webu: lešení hlavy ve sloupci Výchozí v základu. */
const MAT = { vychozi: { 'ock.leseniHlava': true } };
const ROZMERY = { zaskleni: 'na terče', sirka: 1.6, hloubka: 1.8, zdvih: 15, prejezd: 2, prohluben: 0, nastupiste: 5 };

const cenikZahr = () => Object.assign(ZC.zkusebniCenik(), { rada: 'zahr' });
function cena(z, cenik) {
  const zz = Object.assign(JSON.parse(JSON.stringify(z)), ROZMERY);
  const r = eng.vypocet(zz, cenik || ZC.zkusebniCenik(), JEKLY, true);
  return r.souhrn.zakladCena;
}
function novaZadani(mat, typ) {
  const d = zk.novaVariantaData();
  const z = d.ock.zadani;
  if (typ) z.typSachty = typ;
  zo.zobrazeniVychoziAplikuj(mat, z, d.proj.zadani);
  return z;
}
/* Stará zakázka (uložená před v2.11.3): zadání z DEFAULT_ZADANI bez příznaku. */
function staraZadani(typ, leseniZaklad, vynechat) {
  const z = Object.assign(JSON.parse(JSON.stringify(global.DEFAULT_ZADANI)), { typSachty: typ });
  z.profily = JSON.parse(JSON.stringify(eng.PROFILY_VYCHOZI[typ]));   // jak je typ dosadil
  z.volitelne.leseniHlava = leseniZaklad;
  z.priplatkyVynechat = vynechat ? ['leseniHlava'] : [];
  delete z.leseniHlavaRucne;
  return z;
}

/* typSachtyPrepni ve vm se skutečnými funkcemi z ui/kalk_ock.js. */
const ui = fs.readFileSync(__dirname + '/ui/kalk_ock.js', 'utf8');
const fn = (jmeno) => (ui.match(new RegExp('function ' + jmeno + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}')) || [''])[0];
const KOD = ['typSachtyPrepni', 'leseniHlavaRucneZjisti', 'leseniHlavaPodleTypu'].map(fn);
test('UI funkce nalezeny', KOD.every(k => k.length > 0));

function prostredi(z, zamceno, mat) {
  const ctx = {
    Z: z, NAST: { zobrazeni: mat === undefined ? MAT : mat }, PROFILY_VYCHOZI: eng.PROFILY_VYCHOZI,
    zobrazeniLeseniHlavaTyp: zo.zobrazeniLeseniHlavaTyp,
    zobrazeniLeseniHlavaJeVychozi: zo.zobrazeniLeseniHlavaJeVychozi,
    DEFAULT_ZADANI: global.DEFAULT_ZADANI, zpravy: [],
    progZprava(t) { ctx.zpravy.push(t); }, syncVarianta() {}, render() {}, standardAtypAutomat() {},
    set(path, v) {
      if (zamceno) return;   // zamčená varianta: set() zápis odmítne
      const ks = path.split('.'); ks.shift(); const last = ks.pop();
      ks.reduce((o, k) => o[k], ctx.Z)[last] = v;
    },
  };
  vm.createContext(ctx);
  vm.runInContext(KOD.join('\n'), ctx);
  return ctx;
}
const lesZprava = (c) => c.zpravy.some(t => /Lešení pro dokončení hlavy šachty: .*podle typu šachty \(mění cenu\)/.test(t));
const stavLes = (z) => [!!z.volitelne.leseniHlava, (z.priplatkyVynechat || []).includes('leseniHlava')];

/* ---------- 1) čistá funkce výchozího stavu ---------- */
{
  const f = zo.zobrazeniLeseniHlavaVychozi;
  test('výchozí stav: funkce exportována', typeof f === 'function');
  const e = f(MAT, 'exteriérová'), i = f(MAT, 'interiérová'), i0 = f(null, 'interiérová');
  test('exteriér: mimo základ i nabídku', e.vZaklade === false && e.vNabidce === false, e);
  test('interiér s maticí: v základu i v nabídce', i.vZaklade === true && i.vNabidce === true, i);
  test('interiér bez matice: mimo základ, v nabídce', i0.vZaklade === false && i0.vNabidce === true, i0);
  test('interiér, příplatek v matici vypnutý: mimo nabídku',
    f({ vychozi: { 'ock.priplatek:leseniHlava': false } }, 'interiérová').vNabidce === false);
  const zi = novaZadani(MAT, 'interiérová');
  test('nová interiérová odpovídá výchozímu stavu', zo.zobrazeniLeseniHlavaJeVychozi(MAT, zi, 'interiérová'));
  zi.priplatkyVynechat = zi.priplatkyVynechat.concat(['leseniHlava']);
  test('vynechání z nabídky se počítá jako odchylka', !zo.zobrazeniLeseniHlavaJeVychozi(MAT, zi, 'interiérová'));
}

/* ---------- 2) stará zakázka s ručně vypnutým lešením u interiéru ---------- */
for (const vynechat of [false, true]) {
  const popis = vynechat ? 'vypnuté v základu i v nabídce' : 'vypnuté v základu';
  const z = staraZadani('interiérová', false, vynechat);
  const pred = stavLes(z);
  const cenaPred = cena(z);
  const c = prostredi(z);
  c.typSachtyPrepni('exteriérová');
  test(`stará int (${popis}): po přepnutí na ext příznak ruční volby`, z.leseniHlavaRucne === true);
  c.typSachtyPrepni('interiérová');
  test(`stará int (${popis}): tam a zpět lešení zůstalo vypnuté`,
    JSON.stringify(stavLes(z)) === JSON.stringify(pred), [pred, stavLes(z)]);
  test(`stará int (${popis}): cena beze změny`, cena(z) === cenaPred, [cenaPred, cena(z)]);
  test(`stará int (${popis}): hláška o lešení nepadla`, !lesZprava(c), c.zpravy);
}

/* ---------- 2b) bez matice: ručně jen vyřazený příplatek z nabídky ---------- */
{
  /* Interiér bez matice: výchozí = mimo základ, příplatek v nabídce. Stará
   * zakázka s příplatkem vyřazeným z nabídky se liší JEN vynecháním. */
  const z = staraZadani('interiérová', false, true);
  const c = prostredi(z, false, null);
  c.typSachtyPrepni('exteriérová'); c.typSachtyPrepni('interiérová');
  test('bez matice: ručně vyřazený příplatek zůstane po tam a zpět mimo nabídku',
    JSON.stringify(stavLes(z)) === '[false,true]' && z.leseniHlavaRucne === true, stavLes(z));
}

/* ---------- 3) stará zakázka s výchozím stavem — pravidlo platí ---------- */
{
  const z = staraZadani('interiérová', true, false);   // = výchozí interiér s maticí
  const c = prostredi(z);
  c.typSachtyPrepni('exteriérová');
  test('stará int ve výchozím stavu: příznak nepřibyl', !z.leseniHlavaRucne);
  test('stará int ve výchozím stavu: int → ext lešení odznačeno a mimo nabídku',
    JSON.stringify(stavLes(z)) === '[false,true]', stavLes(z));
  test('int → ext: hláška o lešení (mění cenu)', lesZprava(c), c.zpravy);
  test('hláška nese i výměnu profilů (progZprava drží jednu)', c.zpravy.length === 1
    && /dimenze profilů/.test(c.zpravy[0]), c.zpravy);
  c.zpravy.length = 0;
  c.typSachtyPrepni('interiérová');
  test('ext → int: lešení zpět v základu', JSON.stringify(stavLes(z)) === '[true,false]', stavLes(z));
  test('ext → int: hláška o lešení', lesZprava(c) && /zařazeno do základní ceny/.test(c.zpravy[0]), c.zpravy);
  const ze = staraZadani('exteriérová', false, true);
  prostredi(ze).typSachtyPrepni('interiérová');
  test('stará ext ve výchozím stavu: ext → int vrátí výchozí interiér', JSON.stringify(stavLes(ze)) === '[true,false]');
  /* Bez matice (interiér: mimo základ, příplatek v nabídce). */
  const z0 = staraZadani('interiérová', false, false);
  const c0 = prostredi(z0, false, null);
  c0.typSachtyPrepni('exteriérová');
  test('bez matice: výchozí interiér → ext pravidlo platí', !z0.leseniHlavaRucne
    && JSON.stringify(stavLes(z0)) === '[false,true]', stavLes(z0));
  test('bez matice: hláška „mimo základní cenu i nabídku"', /mimo základní cenu i nabídku/.test(c0.zpravy.join(' ')), c0.zpravy);
}

/* ---------- 4) nová zakázka — beze změny proti #546 ---------- */
{
  const zi = novaZadani(MAT, 'interiérová');
  const c = prostredi(zi);
  c.typSachtyPrepni('exteriérová'); c.typSachtyPrepni('interiérová');
  test('nová int: tam a zpět vrátí výchozí interiér', JSON.stringify(stavLes(zi)) === '[true,false]' && !zi.leseniHlavaRucne);
  const ze = novaZadani(MAT);
  const c2 = prostredi(ze);
  c2.typSachtyPrepni('interiérová');
  test('nová ext → int: výchozí interiér', JSON.stringify(stavLes(ze)) === '[true,false]');
  c2.typSachtyPrepni('exteriérová');
  test('a zpět: výchozí exteriér', JSON.stringify(stavLes(ze)) === '[false,true]');
  const zt = novaZadani(MAT, 'interiérová');
  const c3 = prostredi(zt);
  zt.volitelne.leseniHlava = false;
  c3.typSachtyPrepni('interiérová');
  test('týž typ: nic se nemění ani nepřibude příznak', zt.volitelne.leseniHlava === false && !zt.leseniHlavaRucne);
}

/* ---------- 5) zahraniční řada, oba směry ---------- */
{
  /* int → ext → int: ručně vypnuté lešení u interiéru */
  const zi = staraZadani('interiérová', false, false);
  const cPred = cena(zi, cenikZahr());
  const c = prostredi(zi);
  c.typSachtyPrepni('exteriérová'); c.typSachtyPrepni('interiérová');
  test('zahraničí int → ext → int: lešení vypnuté, cena beze změny',
    !zi.volitelne.leseniHlava && cena(zi, cenikZahr()) === cPred, [cPred, cena(zi, cenikZahr())]);
  /* ext → int → ext: ručně ZAPNUTÉ lešení u exteriéru (stará zakázka) */
  const ze = staraZadani('exteriérová', true, false);
  const ePred = cena(ze, cenikZahr());
  const c2 = prostredi(ze);
  c2.typSachtyPrepni('interiérová');
  test('zahraničí ext s ručně zapnutým lešením → int: příznak a stav beze změny',
    ze.leseniHlavaRucne === true && JSON.stringify(stavLes(ze)) === '[true,false]', stavLes(ze));
  c2.typSachtyPrepni('exteriérová');
  test('zahraničí ext → int → ext: lešení dál zapnuté, cena beze změny',
    ze.volitelne.leseniHlava === true && cena(ze, cenikZahr()) === ePred, [ePred, cena(ze, cenikZahr())]);
  test('zahraničí: hláška o lešení nepadla', !lesZprava(c) && !lesZprava(c2));
}

/* ---------- 6) zamčená varianta ---------- */
{
  const z = staraZadani('interiérová', false, false);
  const pred = JSON.stringify(z);
  const c = prostredi(z, true);
  c.typSachtyPrepni('exteriérová'); c.typSachtyPrepni('interiérová');
  test('zamčená varianta: zadání beze změny (ani příznak ruční volby)', JSON.stringify(z) === pred);
  test('zamčená varianta: žádná hláška', c.zpravy.length === 0, c.zpravy);
}

console.log(`\nK39-N1 ruční volba lešení hlavy u staré zakázky: ${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
