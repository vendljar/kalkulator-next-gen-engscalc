/* DÁVKA DO — obrazovkové funkce bez prohlížeče (rozhodnutí J. V. 19. 11. 2026).
 *
 * Celou obrazovku proklikává overit_do_dotazy.mjs. Tahle sada vytáhne
 * zapisující a vykreslovací funkce z ui/kalk_ock.js a ui/online_ui.js do
 * `vm`, aby je hlídaly i mutace jádra (mutace_jadro.mjs, značka [DO]) —
 * ty pouštějí jen sady Node.
 *
 *  D1  oplCelaVyska = jediný pás (začátek nerozhoduje); oplCelaVyskaSet(true)
 *      začátek nemění; varování „pod dnem prohlubně" i u stěny po celé výšce.
 *  D2  oplBezPredvypln: nově zvolený nižší pás „bez" → doM 0; poslední pás,
 *      jiný typ ani vyplněná výška se nemění.
 *  D5  priplatekNabidka: materiál nese montáž, montáž sama sebe.
 *  D6  popisRadekHtml: obchodník „jen pro tuto zakázku" + návrh, správce
 *      místo pro „uloženo"; popisNavrhni zapíše návrh do varianty.
 *  D7  rejstrikAkceBunka: adresa tučně, pod ní šedě akce.
 *
 * Spuštění: cd src && node test_do_obrazovka.js */
const fs = require('fs');
const vm = require('vm');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const kalk = fs.readFileSync(__dirname + '/ui/kalk_ock.js', 'utf8');
const onl = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
const fn = (src, jmeno) => (src.match(new RegExp('\\nfunction ' + jmeno + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}')) || [''])[0];
const blok = (src, zac) => { const i = src.indexOf(zac); return i < 0 ? '' : src.slice(i, src.indexOf('\n', i) + 1); };
const JMENA = ['oplStena', 'oplCelaVyska', 'oplCelaVyskaSet', 'oplPasKopie', 'oplBezPredvypln', 'oplPasSet', 'oplPasPridej',
  'oplStenaVarovani', 'priplatekNabidka', 'popisRadekHtml', 'popisNavrzeno', 'popisNavrhni', 'popisUlozenoUkaz'];
const kod = JMENA.map(j => fn(kalk, j));
test('UI funkce nalezeny', kod.every(k => k.length > 0), JMENA.filter((j, i) => !kod[i]));
const konst = [blok(kalk, 'let POPIS_ULOZENO = '), blok(kalk, 'const POPIS_ULOZENO_TEXT = ')];
test('stav hlášky „uloženo" nalezen', konst.every(k => k.length > 0));
const akce = fn(onl, 'rejstrikAkceBunka');
test('rejstrikAkceBunka nalezena', akce.length > 0);

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function prostredi(o) {
  const v = { upraveno: '', popisyNavrhy: undefined, data: { cenik: {} } };
  const ctx = Object.assign({
    Z: { prohluben: 1.1, oplasteni: { rezim: 'poStenach', steny: {} }, priplatkyVynechat: [] },
    ZAK: {}, C: { popisy: {} }, VAR: v,
    aktivniVarianta: () => v, oplJenCist: () => false, oplZadani: () => ctx.Z.oplasteni,
    oplasteniStenyVychozi: () => ({ A: { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: null }] }, B: { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: null }] },
      C: { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: null }] }, D: { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: null }] } }),
    oplZmeneno() {}, render() {}, formatCislo: x => String(x).replace('.', ','),
    esc, keyAttr: s => String(s), escJs: s => String(s), POPISY_MAX_TEXT: 300,
    cenikPopis: (c, k) => (c && c.popisy && c.popisy[k]) || '', popisJazykyStitek: () => '',
    jeAdmin: () => !!ctx.ADMIN, ADMIN: false, ONLINE_STAV: { ja: { email: 'x' } },
    cenikPopisySpolecne: () => ctx.SPOL || {}, SPOL: {},
    zamekStop: () => !!ctx.ZAMCENO, ZAMCENO: false,
    Date, setTimeout: () => 0, document: undefined,
  }, o || {});
  vm.createContext(ctx);
  vm.runInContext(konst.join('\n') + kod.join('\n') + akce, ctx);
  return ctx;
}

/* ---------- D1 ---------- */
{
  const c = prostredi();
  c.Z.oplasteni.steny.B = { odM: -1.1, pasy: [{ typ: 'C.cetrisKc', doM: null }] };
  test('D1: jediný pás se začátkem v prohlubni je „po celé výšce"', c.oplCelaVyska('B') === true);
  c.Z.oplasteni.steny.C = { odM: 0, pasy: [{ typ: 'bez', doM: 0 }, { typ: 'C.cetrisKc', doM: null }] };
  test('D1: dva pásy nejsou „po celé výšce"', c.oplCelaVyska('C') === false);
  c.oplCelaVyskaSet('B', false);
  test('D1: odškrtnutí rozdělí stěnu a nechá začátek', c.Z.oplasteni.steny.B.pasy.length === 2 && c.Z.oplasteni.steny.B.odM === -1.1);
  c.oplCelaVyskaSet('B', true);
  test('D1: zaškrtnutí vrátí jeden pás a začátek NEZMĚNÍ', c.Z.oplasteni.steny.B.pasy.length === 1 && c.Z.oplasteni.steny.B.odM === -1.1,
    c.Z.oplasteni.steny.B);
  c.Z.oplasteni.steny.D = { odM: -3, pasy: [{ typ: 'C.cetrisKc', doM: null }] };
  test('D1: začátek pod dnem prohlubně se ohlásí i u stěny po celé výšce', /pod dnem prohlubně/.test(c.oplStenaVarovani('D', { vyska: 15, pasy: [] })),
    c.oplStenaVarovani('D', { vyska: 15, pasy: [] }));
  c.Z.oplasteni.steny.D = { odM: 20, pasy: [{ typ: 'C.cetrisKc', doM: null }] };
  test('D1: začátek nad horní hranou se ohlásí i u stěny po celé výšce', /stěna končí/.test(c.oplStenaVarovani('D', { vyska: 15, pasy: [] })));
}

/* ---------- D2 ---------- */
{
  const c = prostredi();
  c.Z.oplasteni.steny.B = { odM: -1.1, pasy: [{ typ: 'C.cetrisKc', doM: null }, { typ: 'C.cetrisKc', doM: null }] };
  c.oplPasSet('B', 0, 'typ', 'bez');
  test('D2: nově zvolený nižší pás „bez" má doM 0', c.Z.oplasteni.steny.B.pasy[0].doM === 0, c.Z.oplasteni.steny.B.pasy);
  test('D2: … a „nemá dělicí výšku" se nehlásí', !/nemá dělicí výšku/.test(c.oplStenaVarovani('B', { vyska: 15, pasy: [] })));
  c.oplPasSet('B', 1, 'typ', 'bez');
  test('D2: poslední pás „bez" výšku nedostane (sahá nahoru)', c.Z.oplasteni.steny.B.pasy[1].doM === null);
  c.oplPasSet('B', 0, 'doM', '0,5'); c.oplPasSet('B', 0, 'typ', 'C.cetrisKc'); c.oplPasSet('B', 0, 'typ', 'bez');
  test('D2: ručně zadaná výška se nepřepíše', c.Z.oplasteni.steny.B.pasy[0].doM === 0.5);
  c.Z.oplasteni.steny.C = { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: null }, { typ: 'C.cetrisKc', doM: null }] };
  c.oplPasSet('C', 0, 'typ', 'C.skloBokyKc');
  test('D2: jiný typ než „bez" výšku nedostane', c.Z.oplasteni.steny.C.pasy[0].doM === null);
  c.Z.oplasteni.steny.D = { odM: -1.1, pasy: [{ typ: 'bez', doM: null }] };
  c.oplCelaVyskaSet('D', false);
  test('D2: rozdělení stěny „bez" dá spodnímu pásu 0', c.Z.oplasteni.steny.D.pasy[0].doM === 0 && c.Z.oplasteni.steny.D.pasy[1].doM === null);
  c.Z.oplasteni.steny.A = { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: 2 }, { typ: 'bez', doM: null }] };
  c.oplPasPridej('A');
  test('D2: „+ přidat pás" pod pásem „bez" dostane 0', c.Z.oplasteni.steny.A.pasy[1].typ === 'bez' && c.Z.oplasteni.steny.A.pasy[1].doM === 0,
    c.Z.oplasteni.steny.A.pasy);
}

/* ---------- D5 ---------- */
{
  const c = prostredi();
  const vyn = () => JSON.stringify(['prechMat', 'prechMont'].filter(k => c.Z.priplatkyVynechat.includes(k)));
  c.Z.priplatkyVynechat = ['prechMat', 'prechMont', 'sokl'];
  c.priplatekNabidka('prechMat', true);
  test('D5: zaškrtnutí materiálu zaškrtne i montáž', vyn() === '[]' && c.Z.priplatkyVynechat.includes('sokl'), c.Z.priplatkyVynechat);
  c.priplatekNabidka('prechMont', false);
  test('D5: montáž jde samostatně odškrtnout', vyn() === '["prechMont"]');
  c.priplatekNabidka('prechMat', false);
  test('D5: odškrtnutí materiálu odškrtne obě (bez duplicit)', vyn() === '["prechMat","prechMont"]'
    && c.Z.priplatkyVynechat.filter(k => k === 'prechMont').length === 1, c.Z.priplatkyVynechat);
  c.priplatekNabidka('prechMont', true);
  test('D5: montáž jde zaškrtnout bez materiálu', vyn() === '["prechMat"]');
  c.priplatekNabidka('sokl', true);
  test('D5: jiný příplatek nese jen sám sebe', vyn() === '["prechMat"]' && !c.Z.priplatkyVynechat.includes('sokl'));
}

/* ---------- D6 ---------- */
{
  const K = 'PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)';
  const r = { cenaPath: 'C.x', origNazev: K, nazev: K };
  const c = prostredi();
  test('D6: obchodník bez textu — „jen pro tuto zakázku", bez tlačítka',
    /jen pro tuto zakázku/.test(c.popisRadekHtml(r, 3)) && !/navrhnout do číselníku/.test(c.popisRadekHtml(r, 3)));
  c.C.popisy[K] = 'Věta.';
  test('D6: obchodník s vlastním textem — tlačítko „navrhnout do číselníku"', /popisNavrhni\(/.test(c.popisRadekHtml(r, 3)));
  c.SPOL = { [K]: 'Věta.' };
  test('D6: text shodný s číselníkem — tlačítko není', !/popisNavrhni\(/.test(c.popisRadekHtml(r, 3)));
  c.SPOL = {};
  c.ONLINE_STAV.ja = null;
  test('D6: bez přihlášení — tlačítko není', !/popisNavrhni\(/.test(c.popisRadekHtml(r, 3)) && /jen pro tuto zakázku/.test(c.popisRadekHtml(r, 3)));
  c.ONLINE_STAV.ja = { email: 'x' };
  c.popisNavrhni(K);
  test('D6: návrh se zapíše do varianty', c.VAR.popisyNavrhy && c.VAR.popisyNavrhy[K] === 'Věta.', c.VAR.popisyNavrhy);
  test('D6: po návrhu „navrženo", tlačítko zmizí', /navrženo do číselníku/.test(c.popisRadekHtml(r, 3)) && !/popisNavrhni\(/.test(c.popisRadekHtml(r, 3)));
  const c2 = prostredi({ ZAMCENO: true });
  c2.C.popisy[K] = 'Věta.';
  c2.popisNavrhni(K);
  test('D6: zamčená varianta návrh nepřijme', c2.VAR.popisyNavrhy === undefined);
  const c3 = prostredi({ ADMIN: true });
  const h = c3.popisRadekHtml(r, 3);
  test('D6: správce — místo pro „uloženo", žádné „jen pro tuto zakázku"', /data-popis-stav=/.test(h) && !/jen pro tuto zakázku/.test(h), h);
  c3.popisUlozenoUkaz(K);
  test('D6: po uložení správce vidí „uloženo pro všechny nové zakázky"', /uloženo pro všechny nové zakázky/.test(c3.popisRadekHtml(r, 3)));
}

/* ---------- D7 ---------- */
{
  const c = prostredi();
  const h = c.rejstrikAkceBunka({ adresa: 'Zkušební 12, Brno', nazevAkce: 'Výtah — přístavba' });
  test('D7: adresa tučně jako hlavní řádek', /^<b class="rejstrik-hlavni rejstrik-adresa">Zkušební 12, Brno<\/b>/.test(h), h);
  test('D7: pod ní šedě název akce', /<div class="rejstrik-akce" style="font-size:11px;color:#6b7686">Výtah — přístavba<\/div>$/.test(h), h);
  const h2 = c.rejstrikAkceBunka({ adresa: '  ', nazevAkce: 'Jen akce' });
  test('D7: bez adresy jen název akce (tučně)', h2 === '<b class="rejstrik-hlavni">Jen akce</b>', h2);
  test('D7: nic → pomlčka', c.rejstrikAkceBunka({}) === '<b class="rejstrik-hlavni">—</b>');
  test('D7: escapování', !/<x>/.test(c.rejstrikAkceBunka({ adresa: '<x>', nazevAkce: '<x>' })));
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
