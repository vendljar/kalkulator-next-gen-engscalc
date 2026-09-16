/* ===== TÁŽ POLOŽKA VE VOLITELNÝCH I V PŘÍPLATCÍCH =====
 * (16. 9. 2026, zadání J. V.: „z volitelných položek do základní ceny přidej
 *  do příplatkových položek i ty zbývající a ať se chovají stejně jako lešení",
 *  a nález „volitelné položky nám zřejmě také stále nefungují podle
 *  zaškrtávátek")
 *
 * Některé položky žijí na DVOU místech: ve VOLITELNÝCH jsou součástí základní
 * ceny, v PŘÍPLATCÍCH si je zákazník doobjedná. Zaškrtnutím ve volitelných se
 * z příplatků vypustí, aby se nepočítaly dvakrát.
 *
 * Hlídají se tři věci a každá z nich už jednou selhala:
 *
 *  1) ÚPLNOST. Do 16. 9. 2026 byly dvojdomé jen lešení a přechodové plechy.
 *     Háky, zábradlí a sokl šly ve volitelných odškrtnout a tím zmizely
 *     nadobro — zákazník si je nemohl doobjednat a obchodník neměl kam sáhnout.
 *
 *  2) STEJNÁ CENA NA OBOU STRANÁCH. Pravidlo z 11. 8. 2026 (viz test_leseni.js):
 *     předloha vedla lešení dvakrát, pokaždé s jinou fixní částkou, takže
 *     přesun mezi základní cenou a příplatkem tiše měnil cenu o tisíce korun.
 *     Množství i náklad proto musí na obou stranách vyjít stejně. Cena
 *     S MARŽÍ se lišit SMÍ — příplatky se zaokrouhlují nahoru na tisíce,
 *     a to platí pro lešení odjakživa, takže to není tichá změna, ale pravidlo.
 *
 *  3) ŽÁDNÉ DVOJÍ ZAPOČTENÍ. Položka nesmí být zároveň v základní ceně
 *     a v příplatcích.
 *
 * Testy se ptají na PRAVIDLA, ne na částky ze zkušebního ceníku — tenhle
 * soubor je veřejný.
 */
const fs = require('fs');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const JEKLY = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const C = ZC.zkusebniCenik();
const EXT = 'exteriérová', INT = 'interiérová';
function vypocti(typ, vol, fixes) {
  const Z = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
  Z.typSachty = typ;
  Z.volitelne = Object.assign({}, Z.volitelne, vol || {});
  return eng.vypocet(Z, C, JEKLY, fixes === undefined ? false : fixes);
}
const klice = (r) => (r.priplatky || []).map(p => p.key);
const vlastni = (k) => String(k).indexOf('vlastni:') === 0;

/* ---------- 1) každá volitelná položka má protějšek v příplatcích ---------- */

[EXT, INT].forEach(typ => {
  const kat = vypocti(typ).volitelneKatalog.filter(x => !vlastni(x.key));
  const bez = kat.filter(x => !x.prip).map(x => x.key);
  /* Nová volitelná položka bez protějšku propadne tímhle testem. Je to
   * záměr: po 16. 9. 2026 je dvojdomost pravidlo, ne výjimka, a rozhodnutí
   * ji neudělat má být vědomé, ne opomenutí. */
  test(typ + ': každá volitelná položka ví, který příplatek ji zastupuje',
    bez.length === 0, bez);
  test(typ + ': katalog není prázdný', kat.length > 0, kat.length);
});

{
  const extK = vypocti(EXT).volitelneKatalog.map(x => x.key);
  const intK = vypocti(INT).volitelneKatalog.map(x => x.key);
  /* Dostupnost se drží stejného dělení na obou stranách. Nabízet
   * v příplatcích něco, co volitelné pro tuhle šachtu vůbec neukazují,
   * by byl nový nesoulad. */
  test('háky a sokl jsou jen na exteriérové šachtě',
    extK.indexOf('haky') >= 0 && extK.indexOf('sokl') >= 0
    && intK.indexOf('haky') < 0 && intK.indexOf('sokl') < 0);
  test('zábradlí jen na interiérové',
    intK.indexOf('zabradli') >= 0 && extK.indexOf('zabradli') < 0);
  const pI = klice(vypocti(INT, { haky: false, sokl: false }));
  test('a v příplatcích to platí taky — na interiérové se háky ani sokl nenabízejí',
    pI.indexOf('haky') < 0 && pI.indexOf('sokl') < 0, pI);
  const pE = klice(vypocti(EXT, { zabradli: false }));
  test('ani zábradlí na exteriérové', pE.indexOf('zabradli') < 0, pE);
}

/* ---------- 2) zaškrtávátko opravdu přesouvá mezi místy ----------
 *
 * Invariant se ptá katalogu, ne mého seznamu klíčů: odškrtnutím smí
 * v příplatcích PŘIBÝT právě to, co položka slibuje v `prip`, a nesmí nic
 * ubýt. Kdyby `prip` lhal (ukazoval na jiný příplatek nebo na žádný),
 * chytí to tohle, i kdyby položek přibylo deset dalších. */

[EXT, INT].forEach(typ => {
  const kat = vypocti(typ).volitelneKatalog.filter(x => !vlastni(x.key));
  const vsechnyPrip = kat.map(y => y.prip).filter(Boolean);
  kat.forEach(x => {
    const zap = klice(vypocti(typ, { [x.key]: true }));
    const vyp = klice(vypocti(typ, { [x.key]: false }));
    const pribylo = vyp.filter(k => zap.indexOf(k) < 0);
    const ubylo = zap.filter(k => vyp.indexOf(k) < 0);
    test(typ + '/' + x.key + ': odškrtnutím se z příplatků nic neztratí',
      ubylo.length === 0, ubylo);
    test(typ + '/' + x.key + ': odškrtnutím se objeví slíbený příplatek',
      !x.prip || pribylo.indexOf(x.prip) >= 0, { pribylo, prip: x.prip });
    /* Přibýt smí i protějšek JINÉ volitelné položky — přechodové plechy
     * táhnou s sebou montáž (níž). Co ale přibýt nesmí, je příplatek, který
     * žádné volitelné položce nepatří: to by znamenalo, že zaškrtávátko
     * hýbe něčím, o čem tabulka volitelných vůbec neví. */
    test(typ + '/' + x.key + ': a nic, co by nebylo protějškem volitelné položky',
      pribylo.every(k => vsechnyPrip.indexOf(k) >= 0), pribylo);
    test(typ + '/' + x.key + ': zaškrtnuté ve volitelných v příplatcích není',
      zap.indexOf(x.prip) < 0, x.prip);
  });
});

{
  /* PŘECHODOVÉ PLECHY TÁHNOU S SEBOU MONTÁŽ (pravidlo z 11. 8. 2026).
   * Přepínač montáže smí zůstat prázdný a pak se řídí materiálem — prázdno
   * není nula, znamená „řídí se materiálem". Odškrtnutím materiálu proto
   * spadnou do příplatků obě položky naráz. Je to záměr: montovat plechy,
   * které nejsou v dodávce, nedává smysl. Kdo to potřebuje jinak, přepne si
   * montáž zvlášť — a pak má její vlastní přepínač přednost. */
  const oba = klice(vypocti(EXT, { prechodove: false }));
  test('odškrtnutím přechodových plechů spadne do příplatků i jejich montáž',
    oba.indexOf('prechMat') >= 0 && oba.indexOf('prechMont') >= 0, oba);
  const jenMat = klice(vypocti(EXT, { prechodove: false, prechMont: true }));
  test('ale vlastní přepínač montáže to přebije',
    jenMat.indexOf('prechMat') >= 0 && jenMat.indexOf('prechMont') < 0, jenMat);
  /* Háky, zábradlí a sokl žádnou takovou vazbu nemají — každý sám za sebe.
   * Ptát se, jestli v příplatcích NENÍ sokl, by bylo špatně: tam už ve
   * výchozím stavu je, a ne kvůli hákům. Rozhoduje ROZDÍL mezi oběma stavy. */
  const sHaky = klice(vypocti(EXT, { haky: true }));
  const bezHaku = klice(vypocti(EXT, { haky: false }));
  const rozdil = bezHaku.filter(k => sHaky.indexOf(k) < 0);
  test('háky nikoho dalšího netáhnou', rozdil.join(',') === 'haky', rozdil);
}

/* ŽÁDNÉ DVOJÍ ZAPOČTENÍ: zaškrtnutá položka je v základní ceně a zároveň
 * nesmí být mezi příplatky. Tohle je ta chyba, kvůli které se položky
 * z příplatků vůbec vypouštějí. */
[EXT, INT].forEach(typ => {
  const r = vypocti(typ);
  const vZakladu = r.volitelneKatalog.filter(x => x.zahrnuto && x.prip).map(x => x.prip);
  const dvakrat = vZakladu.filter(p => klice(r).indexOf(p) >= 0);
  test(typ + ': nic není zároveň v základní ceně i v příplatcích',
    dvakrat.length === 0, dvakrat);
});

/* ---------- 3) přesun nesmí změnit cenu ---------- */

[false, true].forEach(fixes => {
  const model = fixes ? 'model 2' : 'model 1';
  [EXT, INT].forEach(typ => {
    vypocti(typ).volitelneKatalog.filter(x => !vlastni(x.key) && x.prip).forEach(x => {
      const vol = vypocti(typ, { [x.key]: true }, fixes).volitelneKatalog.find(y => y.key === x.key);
      const pri = (vypocti(typ, { [x.key]: false }, fixes).priplatky || []).find(p => p.key === x.prip);
      if (!vol || !pri) { test(model + ' ' + x.key + ': obě strany existují', false); return; }
      test(model + ' ' + x.key + ': množství je na obou stranách stejné',
        Math.abs(vol.mnozstvi - pri.mnozstvi) < 1e-9, { vol: vol.mnozstvi, pri: pri.mnozstvi });
      /* Náklad, ne cena s marží: příplatky se zaokrouhlují nahoru na tisíce.
       * Kdyby se lišil NÁKLAD, znamenalo by to dva různé zdroje sazby —
       * přesně ta chyba, kterou předloha měla u lešení. */
      test(model + ' ' + x.key + ': náklad se přesunem nemění',
        Math.abs(vol.naklad - pri.naklad) < 0.01, { vol: vol.naklad, pri: pri.naklad });
    });
  });
});

{
  /* Jeden zdroj sazby prakticky: změna ceníku se musí projevit na obou
   * stranách stejně. Kdyby příplatek četl vlastní sazbu, zůstal by stát. */
  const C2 = ZC.zkusebniCenik();
  C2.hakyKc = C2.hakyKc * 2;
  const Z = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
  Z.typSachty = EXT;
  const puvVol = vypocti(EXT, { haky: true }).volitelneKatalog.find(x => x.key === 'haky');
  const puvPri = (vypocti(EXT, { haky: false }).priplatky || []).find(p => p.key === 'haky');
  Z.volitelne = Object.assign({}, Z.volitelne, { haky: true });
  const novVol = eng.vypocet(Z, C2, JEKLY, false).volitelneKatalog.find(x => x.key === 'haky');
  Z.volitelne = Object.assign({}, Z.volitelne, { haky: false });
  const novPri = (eng.vypocet(Z, C2, JEKLY, false).priplatky || []).find(p => p.key === 'haky');
  test('zdvojnásobení sazby v ceníku zvedne náklad ve volitelných',
    Math.abs(novVol.naklad - puvVol.naklad * 2) < 0.01);
  test('a úplně stejně i v příplatcích — jeden zdroj sazby',
    Math.abs(novPri.naklad - puvPri.naklad * 2) < 0.01);
}

/* ---------- 4) tabulka neukazuje částku u toho, co se nepočítá ---------- */
{
  const ui = fs.readFileSync(__dirname + '/ui/kalk_ock.js', 'utf8');
  /* Nález J. V. 16. 9. 2026. Jádro spočítá každou položku katalogu bez
   * ohledu na zaškrtnutí; do součtu pustí jen zaškrtnuté, ale řádek si svou
   * částku nesl pořád. U většiny položek to nebylo vidět náhodou (množství
   * 0 → vypsala se nula), ale lešení má FIXNÍ část, takže u odškrtnutého
   * řádku svítilo 20 000 Kč. Vypadalo to, že zaškrtávátko nefunguje. */
  test('nezaškrtnutý volitelný řádek neukazuje částku',
    ui.indexOf("const castka = (x) => r.zahrnuto ? fmt(x) : '—';") >= 0);
  test('a pomlčka platí i pro nákladové sloupce správce',
    ui.indexOf('castka(r.naklad)') >= 0 && ui.indexOf('castka(r.marze)') >= 0
    && ui.indexOf('castka(r.sMarzi)') >= 0);
  /* Nula by tvrdila „tahle položka nic nestojí". To není pravda — jen se
   * nepočítá SEM; kolik stojí, se dozvíte v příplatcích.
   *
   * Hledá se jen uvnitř tblVolitelne: `fmt(r.sMarzi)` je správně v ostatních
   * sekcích, kde se nic nezaškrtává. Kontrola nad celým souborem by padala
   * na cizí kód — to se mi napoprvé stalo. */
  const zac = ui.indexOf('function tblVolitelne(');
  const kon = ui.indexOf('\nfunction ', zac + 10);
  const volFn = ui.slice(zac, kon > 0 ? kon : ui.length);
  test('tblVolitelne se v souboru našla', zac >= 0 && volFn.length > 500);
  test('nekreslí se místo toho nula', volFn.indexOf('fmt(r.sMarzi)') < 0);
  test('množství v řádku zůstává, je z čeho odhadnout dopad',
    volFn.indexOf('bunkaMnozstvi(r)') >= 0 && volFn.indexOf('num(r.mnozstvi, 3)') >= 0);

  /* Obě pomocné tabulky se ptají příznaku `prip`, ne názvu položky. Do
   * 16. 9. 2026 se tu hledalo „LEŠENÍ" v názvu, takže věta pod tabulkou
   * mlčela o přechodových plechách — ty jsou dvojdomé úplně stejně. */
  test('věta „kde je lešení" se řídí příznakem, ne názvem položky',
    ui.indexOf('/LEŠENÍ/i.test(x.nazev') < 0);
  test('a bere ho z katalogu volitelných',
    ui.indexOf('x.zahrnuto && x.prip') >= 0 && ui.indexOf('r.volitelneKatalog') >= 0);
  test('totéž platí pro řádky, které správce vidí v příplatcích',
    ui.split('x.zahrnuto && x.prip').length - 1 === 2);
}

/* ---------- 5) příznak v jádře ---------- */
{
  const src = fs.readFileSync(__dirname + '/engine.js', 'utf8');
  test('katalog nese klíč zastupujícího příplatku',
    src.indexOf('prip: x.d.prip || null') >= 0);
  test('háky, zábradlí i sokl se mezi příplatky nabízejí',
    src.indexOf("mkPrip('haky'") >= 0 && src.indexOf("mkPrip('zabradli'") >= 0
    && src.indexOf("mkPrip('sokl'") >= 0);
  /* Sazba i množství se berou z týchž výrazů jako ve volitelných — jeden
   * zdroj. Vlastní číslo v příplatku je přesně ta chyba z předlohy. */
  test('a čtou sazbu z téhož místa ceníku jako volitelné',
    src.indexOf("mkPrip('haky', 'HÁKY NA MYTÍ ŠACHTY (EXT)', 3, c.hakyKc") >= 0
    && src.indexOf("c.soklBmKc") >= 0 && src.indexOf("c.zabradliKc") >= 0);
  test('dostupnost podle typu šachty je i u příplatků',
    src.indexOf('(ext && !v.haky)') >= 0 && src.indexOf('(!ext && !v.zabradli)') >= 0
    && src.indexOf('(ext && !v.sokl)') >= 0);
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
