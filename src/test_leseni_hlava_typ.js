/* ===== #546 — LEŠENÍ PRO DOKONČENÍ HLAVY ŠACHTY JEN U INTERIÉROVÉ ŠACHTY =====
 * (požadavek obchodu 29. 10. 2026)
 *
 * „Lešení pro dokončení hlavy šachty se používá pouze pro interiérovou
 * šachtu. Venkovní přístavba to nepotřebuje. Pro venkovní to můžeš vždy
 * nechat prázdné bez výběru jak v základní ceně, tak i v příplatcích."
 *
 * Do v2.11.1 platil u položky jen sloupec Výchozí (matice `ock.leseniHlava`),
 * a to bez ohledu na typ šachty — nová exteriérová zakázka (výchozí typ) ji
 * tak měla předvybranou v základní ceně, a když ne, šla do nabídky jako
 * zvolený příplatek.
 *
 * Hlídá se:
 *   1) nová exteriérová zakázka — položka není v základní ceně ani v nabídce
 *      příplatků (ani když ji matice Výchozí zapíná);
 *   2) nová interiérová — beze změny (řídí se maticí);
 *   3) přepnutí typu oběma směry (`typSachtyPrepni`, pouštěno ve vm);
 *   4) ruční volba obchodníka se nepřepisuje;
 *   5) zamčená varianta — `set` typ nezmění, lešení ani cena se nehnou;
 *   6) dokumenty: technická specifikace / nabídka berou příplatek přes
 *      `tsPriplatekNabizen` (týž seznam `priplatkyVynechat`).
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
const ts = require('./techspec.js');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* Matice, jaká je zveřejněná na testovacím webu (viz kalk_ock.js): lešení
 * hlavy šachty je ve sloupci Výchozí zapnuté do základní ceny. */
const MAT = { vychozi: { 'ock.leseniHlava': true } };
const ROZMERY = { zaskleni: 'na terče', sirka: 1.6, hloubka: 1.8, zdvih: 15, prejezd: 2, prohluben: 0, nastupiste: 5 };

function novaZadani(mat, typ) {
  const d = zk.novaVariantaData();
  const z = d.ock.zadani;
  if (typ) z.typSachty = typ;
  zo.zobrazeniVychoziAplikuj(mat, z, d.proj.zadani);
  return z;
}
function spocti(z) {
  const zz = Object.assign(JSON.parse(JSON.stringify(z)), ROZMERY);
  return eng.vypocet(zz, ZC.zkusebniCenik(), JEKLY, true);
}
const vZaklade = (r) => (r.volitelneKatalog || []).some(x => x.key === 'leseniHlava' && x.zahrnuto);
const vNabidce = (r, z) => ts.tsPriplatekNabizen(r, z, 'leseniHlava');

/* ---------- 1) nová exteriérová zakázka ---------- */
{
  test('nová zakázka je exteriérová (výchozí typ)', zk.novaVariantaData().ock.zadani.typSachty === 'exteriérová');
  for (const [nazev, mat] of [['s maticí Výchozí = ano', MAT], ['bez matice', null], ['s prázdnou maticí', { vychozi: {} }]]) {
    const z = novaZadani(mat);
    const r = spocti(z);
    test(`exteriér ${nazev}: lešení hlavy NENÍ ve volitelných zaškrtnuté`, z.volitelne.leseniHlava === false, z.volitelne);
    test(`exteriér ${nazev}: je v priplatkyVynechat`, (z.priplatkyVynechat || []).includes('leseniHlava'), z.priplatkyVynechat);
    test(`exteriér ${nazev}: výpočet ho nemá v základní ceně`, !vZaklade(r));
    test(`exteriér ${nazev}: dokumenty ho nenabízí jako příplatek`, !vNabidce(r, z));
    test(`exteriér ${nazev}: řádek příplatku pořád existuje (ruční volba možná)`,
      (r.priplatky || []).some(p => p.key === 'leseniHlava'));
  }
  /* Matice u příplatku vypnutá i zapnutá — exteriér je vždy mimo nabídku. */
  const z2 = novaZadani({ vychozi: { 'ock.priplatek:leseniHlava': false } });
  test('exteriér: příplatek v priplatkyVynechat jen jednou',
    z2.priplatkyVynechat.filter(k => k === 'leseniHlava').length === 1, z2.priplatkyVynechat);
  test('exteriér: ostatní vynechané příplatky z matice zůstávají',
    novaZadani({ vychozi: { 'ock.priplatek:ventilator': false } }).priplatkyVynechat.includes('ventilator'));
}

/* ---------- 2) interiérová — beze změny ---------- */
{
  const z = novaZadani(MAT, 'interiérová');
  const r = spocti(z);
  test('interiér s maticí Výchozí = ano: lešení hlavy v základní ceně', z.volitelne.leseniHlava === true && vZaklade(r));
  test('interiér s maticí: není ve vynechaných příplatcích', !(z.priplatkyVynechat || []).includes('leseniHlava'));
  const z0 = novaZadani(null, 'interiérová');
  const r0 = spocti(z0);
  test('interiér bez matice: hodnota z kódu (ne v základu)', z0.volitelne.leseniHlava === false && !vZaklade(r0));
  test('interiér bez matice: příplatek jde do nabídky jako dosud', vNabidce(r0, z0));
  const zP = novaZadani({ vychozi: { 'ock.priplatek:leseniHlava': false } }, 'interiérová');
  test('interiér: matice „příplatek mimo nabídku" platí dál', zP.priplatkyVynechat.includes('leseniHlava'));
}

/* ---------- 3) + 4) + 5) přepnutí typu v UI (typSachtyPrepni ve vm) ---------- */
{
  const ui = fs.readFileSync(__dirname + '/ui/kalk_ock.js', 'utf8');
  const fn = (jmeno) => (ui.match(new RegExp('function ' + jmeno + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}')) || [''])[0];
  const kod = ['typSachtyPrepni', 'leseniHlavaPodleTypu', 'volitelneToggle', 'priplatekNabidka'].map(fn);
  test('UI funkce nalezeny', kod.every(k => k.length > 0));

  function prostredi(z, zamceno) {
    const ctx = {
      Z: z, NAST: { zobrazeni: MAT }, PROFILY_VYCHOZI: eng.PROFILY_VYCHOZI,
      zobrazeniLeseniHlavaTyp: zo.zobrazeniLeseniHlavaTyp, DEFAULT_ZADANI: global.DEFAULT_ZADANI,
      progZprava() {}, syncVarianta() {}, render() {}, standardAtypAutomat() {},
      set(path, v) {
        if (zamceno) return;   // zamčená varianta: set() zápis odmítne
        const ks = path.split('.'); ks.shift(); const last = ks.pop();
        ks.reduce((o, k) => o[k], ctx.Z)[last] = v;
      },
    };
    vm.createContext(ctx);
    vm.runInContext(kod.join('\n'), ctx);
    return ctx;
  }

  /* interiér → exteriér */
  const zi = novaZadani(MAT, 'interiérová');
  const c1 = prostredi(zi);
  c1.typSachtyPrepni('exteriérová');
  test('int → ext: typ přepnut', zi.typSachty === 'exteriérová');
  test('int → ext: lešení hlavy odznačeno v základní ceně', zi.volitelne.leseniHlava === false);
  test('int → ext: příplatek mimo nabídku', zi.priplatkyVynechat.includes('leseniHlava'));
  test('int → ext: výpočet ho nemá v základu ani v nabídce', !vZaklade(spocti(zi)) && !vNabidce(spocti(zi), zi));

  /* exteriér → interiér: vrátí výchozí stav interiéru */
  c1.typSachtyPrepni('interiérová');
  const vzorInt = novaZadani(MAT, 'interiérová');
  test('ext → int: lešení hlavy jako u nové interiérové', zi.volitelne.leseniHlava === vzorInt.volitelne.leseniHlava
    && zi.volitelne.leseniHlava === true);
  test('ext → int: příplatek zpět v nabídce', !zi.priplatkyVynechat.includes('leseniHlava'));

  /* stejný typ znovu — nic se nemění */
  zi.volitelne.leseniHlava = false;
  c1.typSachtyPrepni('interiérová');
  test('přepnutí na týž typ položky nesahá', zi.volitelne.leseniHlava === false);

  /* ruční volba obchodníka */
  const ze = novaZadani(MAT);
  const c2 = prostredi(ze);
  c2.volitelneToggle('leseniHlava', true);
  test('ruční zaškrtnutí na exteriéru jde', ze.volitelne.leseniHlava === true && ze.leseniHlavaRucne === true);
  c2.typSachtyPrepni('interiérová'); c2.typSachtyPrepni('exteriérová');
  test('ruční volba přežije přepnutí typu tam i zpět', ze.volitelne.leseniHlava === true, ze.volitelne);
  const ze2 = novaZadani(MAT);
  const c3 = prostredi(ze2);
  c3.priplatekNabidka('leseniHlava', true);
  test('ruční zařazení příplatku do nabídky jde', !ze2.priplatkyVynechat.includes('leseniHlava') && ze2.leseniHlavaRucne === true);
  c3.typSachtyPrepni('interiérová'); c3.typSachtyPrepni('exteriérová');
  test('a přepnutí typu ho nevyřadí', !ze2.priplatkyVynechat.includes('leseniHlava'));
  test('jádro s příznakem ruční volby nic nemění', zo.zobrazeniLeseniHlavaTyp(MAT, { typSachty: 'exteriérová',
    leseniHlavaRucne: true, volitelne: { leseniHlava: true }, priplatkyVynechat: [] }) === 0);

  /* zamčená varianta: stará exteriérová se zaškrtnutým lešením hlavy */
  const zl = Object.assign(JSON.parse(JSON.stringify(global.DEFAULT_ZADANI)), { typSachty: 'exteriérová' });
  zl.volitelne.leseniHlava = true;
  const cenaPred = spocti(zl).souhrn.zakladCena;
  const c4 = prostredi(zl, true);
  c4.typSachtyPrepni('interiérová');
  c4.typSachtyPrepni('exteriérová');
  test('zamčená varianta: lešení hlavy zůstalo zaškrtnuté', zl.volitelne.leseniHlava === true);
  test('zamčená varianta: cena beze změny', spocti(zl).souhrn.zakladCena === cenaPred, [cenaPred, spocti(zl).souhrn.zakladCena]);
}

/* ---------- 6) stará nezamčená exteriérová zakázka se při otevření nemění ---------- */
{
  /* Pravidlo se pouští jen z zobrazeniVychoziAplikuj (čerstvé zadání) a z
   * přepnutí typu — otevření uložené zakázky ho nevolá. */
  const zdroj = fs.readdirSync(__dirname).filter(f => f.endsWith('.js') && !f.startsWith('test'))
    .map(f => 'src/' + f)
    .concat(fs.readdirSync(__dirname + '/ui').filter(f => f.endsWith('.js')).map(f => 'src/ui/' + f));
  const volajici = zdroj.filter(f => {
    const t = fs.readFileSync(__dirname + '/../' + f, 'utf8');
    return /zobrazeniLeseniHlavaTyp\(/.test(t.replace(/function zobrazeniLeseniHlavaTyp\(/g, ''));
  });
  test('zobrazeniLeseniHlavaTyp volá jen zobrazeni.js a kalk_ock.js',
    volajici.sort().join(',') === 'src/ui/kalk_ock.js,src/zobrazeni.js', volajici);
}

console.log(`\n#546 lešení hlavy podle typu šachty: ${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
