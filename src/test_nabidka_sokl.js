/* ===== OPLECHOVÁNÍ SOKLU: ŘÁDEK MUSÍ STÁT VE SPRÁVNÉ SEKCI =====
 * (16. 9. 2026, nález J. V.: „drobnost — oplechování soklu prohlubně je
 *  v ceně, ale objevil se v nabídce v sekci, co není součástí")
 *
 * Řádek byl v nabídce natvrdo v sekci SOUČÁSTÍ DODÁVKY NENÍ a měnil jen text.
 * Když se sokl dodával, tvrdil zákazníkovi obojí naráz: nadpis sekce „není
 * součástí", hodnota vedle „je součástí dodávky". Dokument, který si sám
 * odporuje, je horší než chybějící řádek — zákazník neví, co objednal.
 *
 * Nově řádek mezi sekcemi PŘESKAKUJE. Rozhoduje VÝPOČET, ne zaškrtávátko:
 * sokl se nabízí jen na exteriérové šachtě (`dostupne: ext`), takže samotné
 * `volitelne.sokl` by na interiérové šachtě slíbilo dodávku něčeho, co se
 * vůbec nepočítá.
 *
 * Přesun se dělá PRÁZDNOU HODNOTOU zástupce, ne novým mechanismem — docxgen.js
 * už umí z Wordu vyhodit řádek, jehož všechny TS_* zástupce jsou prázdné,
 * i s popiskem, a pak i sekční pruh bez jediného datového řádku.
 *
 * ŽÁDNÉ CENY — zkouší se umístění řádku, ne částky.
 */
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
global.vypocet = eng.vypocet;
global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI;
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const ep = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ;
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const tsm = require('./techspec.js');
global.TECHSPEC_DEF = tsm.TECHSPEC_DEF;
global.tsHodnota = tsm.tsHodnota;
global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
const zk = require('./zakazka.js');
require('./firma.js');
const N = require('./nabidka.js');
const fs = require('fs');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const POPIS = 'OPLECHOVÁNÍ SOKLU PROHLUBNĚ';
const SEK_NENI = 'SOUČÁSTÍ DODÁVKY NENÍ';
const SEK_DOPL = 'DOPLŇKOVÉ KONSTRUKCE';

function nabidka(typ, sokl, bezPriplatku) {
  const zak = zk.novaZakazka();
  const v = zak.varianty[0];
  v.data.cenik = ZC.zkusebniCenik();
  const Z = v.data.ock.zadani;
  Z.typSachty = typ;
  Z.sirka = 1.6; Z.hloubka = 1.4; Z.zdvih = 9; Z.prejezd = 3.5; Z.prohluben = 1.1;
  Z.volitelne = Object.assign({}, Z.volitelne, { sokl: sokl });
  /* Sloupec „Nabídka" v tabulce příplatků — obchodník jím příplatek vyřadí. */
  if (bezPriplatku) Z.priplatkyVynechat = ['sokl'];
  const d = N.nabidkaData(zak, v, JEKLY, 'cz');
  const sekce = N.nabidkaNahledSekce(d.placeholders, 'cz');
  const vyskyty = [];
  sekce.forEach(s => (s.radky || []).forEach(r => {
    const popis = (r[0] && r[0].hotovo) ? r[0].hotovo : r[0];
    if (String(popis).indexOf(POPIS) >= 0) vyskyty.push({ sekce: s.sekce, hodnota: r[1] });
  }));
  return { ph: d.placeholders, vyskyty, priplatky: d.priplatky || [],
           zahrnuto: (eng.vypocet(Z, v.data.cenik, JEKLY, v.data.ock.fixes).volitelneKatalog || [])
             .some(x => x.key === 'sokl' && x.zahrnuto) };
}

/* ---------- 1) řádek stojí právě jednou a ve správné sekci ---------- */

const PRIPADY = [
  ['exteriérová', true,  SEK_DOPL,  'dodává se → mezi doplňkové konstrukce'],
  ['exteriérová', false, SEK_NENI,  'nedodává se → mezi to, co součástí není'],
  /* Na interiérové šachtě se sokl vůbec nenabízí (v katalogu volitelných má
   * `dostupne: ext`). Zaškrtávátko v zadání na tom nic nemění — a nabídka to
   * musí říct po pravdě, ne slíbit dodávku něčeho, co se nepočítá. */
  ['interiérová', true,  SEK_NENI,  'interiér: nenabízí se, i když je zaškrtnuto'],
  ['interiérová', false, SEK_NENI,  'interiér bez zaškrtnutí'],
];

PRIPADY.forEach(([typ, sokl, cekanaSekce, popis]) => {
  const v = nabidka(typ, sokl);
  test(popis + ' — řádek je v nabídce právě jednou',
    v.vyskyty.length === 1, v.vyskyty);
  test(popis + ' — a ve správné sekci',
    v.vyskyty.length === 1 && v.vyskyty[0].sekce === cekanaSekce,
    v.vyskyty.map(x => x.sekce));
  /* Tohle je ta chyba doslova: sekce říká „není součástí“ a hodnota vedle
   * „je součástí dodávky“. */
  test(popis + ' — sekce a hodnota si neodporují',
    !(v.vyskyty[0] && v.vyskyty[0].sekce === SEK_NENI
      && /je součástí/i.test(String(v.vyskyty[0].hodnota))),
    v.vyskyty);
});

/* ---------- 2) rozhoduje výpočet, ne zaškrtávátko ---------- */
{
  const ext = nabidka('exteriérová', true);
  const int = nabidka('interiérová', true);
  test('na exteriéru se sokl opravdu počítá', ext.zahrnuto === true);
  test('na interiéru se nepočítá, i když je zaškrtnutý', int.zahrnuto === false);
  test('a nabídka to říká podle výpočtu, ne podle zaškrtávátka',
    ext.vyskyty[0].sekce === SEK_DOPL && int.vyskyty[0].sekce === SEK_NENI,
    { ext: ext.vyskyty[0].sekce, int: int.vyskyty[0].sekce });
}

/* ---------- 3) přesun se dělá prázdnou hodnotou (kvůli Wordu) ---------- */
{
  const zap = nabidka('exteriérová', true).ph;
  const vyp = nabidka('exteriérová', false).ph;
  test('když se dodává, je vyplněný TS_SOKL a TS_NENI_SOKL je prázdný',
    !!zap.TS_SOKL && zap.TS_NENI_SOKL === '', { a: zap.TS_SOKL, b: zap.TS_NENI_SOKL });
  /* ZMĚNA OČEKÁVÁNÍ 21. 9. 2026 (nález N17, kolo 6). Do téhle dávky se tady
   * čekalo „není součástí nabídky". Jenže sokl se od 16. 9. nabízí i mezi
   * PŘÍPLATKY a ty se do nabídky dávají všechny, dokud je obchodník
   * nevyřadí — tenhle případ tedy NENÍ „nedodává se", ale „nabízí se za
   * příplatek". Stará věta byla nepravdivá, ne test špatný; proto se mění
   * očekávání, ne kód. Stav „opravdu se nenabízí" se zkouší o kus níž. */
  test('když není v základní ceně, ale nabízí se jako příplatek, řekne to',
    vyp.TS_NENI_SOKL === 'nabízeno jako příplatek' && vyp.TS_SOKL === '',
    { a: vyp.TS_SOKL, b: vyp.TS_NENI_SOKL });
  /* Prázdný řetězec, ne `null`/`undefined`: docxgen.js pozná prázdnou hodnotu
   * po `String(v).trim()`, ale placeholder, který v mapě chybí, by se ve Wordu
   * nenahradil vůbec a zůstal by v dokumentu jako `{{TS_SOKL}}`. */
  test('prázdná strana je opravdu prázdný ŘETĚZEC, ne chybějící klíč',
    typeof zap.TS_NENI_SOKL === 'string' && typeof vyp.TS_SOKL === 'string');
  test('a nikdy nejsou vyplněné obě naráz',
    !(zap.TS_SOKL && zap.TS_NENI_SOKL) && !(vyp.TS_SOKL && vyp.TS_NENI_SOKL));
}

/* ---------- 3b) tři stavy, tři různé věty (nález N17) ----------
 *
 * Sokl může být v základní ceně, může se nabízet za příplatek, nebo se
 * nenabízet vůbec. Do 21. 9. 2026 aplikace znala jen dva stavy a prostřední
 * z nich — zdaleka nejčastější, protože příplatky se nabízejí automaticky —
 * popisovala větou „není součástí nabídky", zatímco kapitola II. téže
 * nabídky sokl zákazníkovi za cenu nabízela. */
{
  const vZakladu   = nabidka('exteriérová', true);
  const zaPriplatek = nabidka('exteriérová', false);
  const vubec      = nabidka('exteriérová', false, true);   // příplatek vyřazen
  const interier   = nabidka('interiérová', false);

  test('N17: v základní ceně → „je součástí dodávky"',
    vZakladu.ph.TS_SOKL === 'je součástí dodávky', vZakladu.ph.TS_SOKL);
  test('N17: jako příplatek → „nabízeno jako příplatek"',
    zaPriplatek.ph.TS_NENI_SOKL === 'nabízeno jako příplatek', zaPriplatek.ph.TS_NENI_SOKL);
  test('N17: vyřazený příplatek → „není součástí nabídky"',
    vubec.ph.TS_NENI_SOKL === 'není součástí nabídky', vubec.ph.TS_NENI_SOKL);
  test('N17: na interiéru se sokl nenabízí ani jako příplatek',
    interier.ph.TS_NENI_SOKL === 'není součástí nabídky', interier.ph.TS_NENI_SOKL);

  /* JÁDRO NÁLEZU: dokument si nesmí odporovat. Když kapitola II. sokl nese,
   * nesmí tabulka specifikace tvrdit, že v nabídce není.
   *
   * Měří se SKUTEČNÝ zdroj kapitoly II., tedy pole `nabidkaData().priplatky`.
   * První pokus hledal placeholdery `PRIPLATEK*` — žádné takové ale
   * neexistují, takže kontrola vycházela vždycky a nehlídala nic. */
  const nabizi = v => (v.priplatky || []).some(p =>
    /OPLECHOVÁNÍ SOKLU/i.test(String((p && (p.nazev || p.popis)) || '')));

  test('N17: kontrola není prázdná — nabízený sokl se v kapitole II. opravdu najde',
    nabizi(zaPriplatek) === true, zaPriplatek.priplatky.map(p => p.nazev || p.popis));
  test('N17: a vyřazený se tam nenajde',
    nabizi(vubec) === false, vubec.priplatky.map(p => p.nazev || p.popis));

  [['jako příplatek', zaPriplatek], ['vyřazený', vubec], ['v základní ceně', vZakladu],
   ['interiér', interier]].forEach(([jm, v]) => {
    const rika = String(v.ph.TS_NENI_SOKL || '');
    test('N17: ' + jm + ' — věta neodporuje tomu, co nabídka opravdu nabízí',
      !(rika === 'není součástí nabídky' && nabizi(v)), { veta: rika, nabizi: nabizi(v) });
  });

  /* A ve všech třech případech je vyplněná právě jedna strana. */
  [vZakladu, zaPriplatek, vubec, interier].forEach((v, i) => {
    test('N17: stav ' + (i + 1) + ' má vyplněnou právě jednu stranu',
      !!(v.ph.TS_SOKL) !== !!(v.ph.TS_NENI_SOKL),
      { a: v.ph.TS_SOKL, b: v.ph.TS_NENI_SOKL });
  });
}

/* ---------- 4) zdroj pravdy je zmrazený otisk, ne dnešní zadání ---------- */
{
  /* Odeslaná nabídka vydává otisk uložený při zamčení (nález A1), takže se
   * text nesmí zpětně měnit. V kódu to zajišťuje `vypocetZ`; kdyby se sokl
   * četl z `Zv.volitelne`, vytištěná nabídka by po odškrtnutí změnila znění. */
  const src = fs.readFileSync(__dirname + '/nabidka.js', 'utf8');
  test('rozhodnutí se bere z výsledku výpočtu (r), ne ze zadání',
    src.indexOf("const soklJe = (r.volitelneKatalog || []).some(x => x.key === 'sokl' && x.zahrnuto);") >= 0);
  test('a v placeholderu už nefiguruje Zv.volitelne.sokl',
    src.indexOf('Zv.volitelne.sokl') < 0);
  test('náhled umísťuje řádek podle vyplněnosti zástupce',
    src.indexOf('...(ph.TS_SOKL ? [[') >= 0 && src.indexOf('...(ph.TS_NENI_SOKL ? [[') >= 0);
}

/* ---------- 5) ostatní řádky sekce zůstaly ---------- */
{
  const v = nabidka('exteriérová', true);
  const sekce = N.nabidkaNahledSekce(v.ph, 'cz');
  const neni = sekce.find(s => s.sekce === SEK_NENI);
  const dopl = sekce.find(s => s.sekce === SEK_DOPL);
  test('sekce „součástí dodávky není" nezmizela ani se nevyprázdnila',
    !!neni && neni.radky.length >= 8, neni ? neni.radky.length : 0);
  test('a doplňkové konstrukce mají pořád i přechodové plechy',
    !!dopl && dopl.radky.some(r => String(r[0]).indexOf('PŘECHODOVÉ PLECHY') >= 0));
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
