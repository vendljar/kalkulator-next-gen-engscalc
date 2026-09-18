/* ===== OPLÁŠTĚNÍ PO STĚNÁCH V TECHNICKÉ SPECIFIKACI =====
 * (#268, 18. 9. 2026)
 *
 * Řádek ROZSAH OPLÁŠTĚNÍ byl do dneška pevná věta „kompletní opláštění
 * šachty". V režimu po stěnách lže: šachta se stěnou z Cetrisu není
 * kompletně prosklená a specifikace jde do smlouvy jako příloha.
 *
 * DVĚ VĚCI, KTERÉ TAHLE SADA HLÍDÁ NAD RÁMEC TEXTU:
 *
 * 1) POPIS STOJÍ NA TÉMŽE ROZPADU JAKO CENA. Text se bere z
 *    `r.oplasteniPlan`, tedy z pásů, ze kterých se počítaly řádky nabídky.
 *    Kdyby si ho specifikace počítala po svém, mohla by popisovat jinou
 *    šachtu, než jaká je naceněná — a nikdo by si toho nevšiml, protože
 *    obojí by vypadalo rozumně.
 *
 * 2) NÁZVY TYPŮ SE PŘEKLÁDAJÍ. Specifikace se tiskne i anglicky, německy
 *    a francouzsky. Název typu vzniká v jádře (OPLASTENI_TYPY) a do
 *    slovníku se musí dostat ručně — tenhle rozjezd se neprojeví chybou,
 *    jen tím, že v německé příloze zůstane česká věta. Proto test.
 */
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const JEKLY = require('./jekly.json');
const TSP = require('./techspec.js');
const P = require('./preklad.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

function spocti(opl) {
  const z = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
  z.typSachty = 'interiérová'; z.zaskleni = 'na terče';
  z.sirka = 1.8; z.hloubka = 1.9; z.zdvih = 12; z.prejezd = 3.5; z.prohluben = 1.2;
  z.nastupiste = 5;
  if (opl) z.oplasteni = opl;
  return eng.vypocet(z, ZC.zkusebniCenik(), JEKLY, true);
}
const PO_STENACH = (steny) => ({ rezim: 'poStenach', steny: steny || null });

/* ---------- 1) plán se vydává a nese název typu ---------- */
{
  const r = spocti(PO_STENACH({ C: { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: null }] } }));
  test('výsledek nese plán opláštění', !!r.oplasteniPlan && r.oplasteniPlan.rezim === 'poStenach',
    r.oplasteniPlan && r.oplasteniPlan.rezim);
  test('a plán má pás za každou stěnu', r.oplasteniPlan.pasy.length === 4,
    r.oplasteniPlan.pasy.map(p => p.stena));
  /* Název řeší jádro, ne odběratel — jinak by ho techspec v Node nenašla. */
  const c = r.oplasteniPlan.pasy.find(p => p.stena === 'C');
  test('pás nese HOTOVÝ název typu, ne jen ceníkovou cestu',
    c.nazevTypu === 'Cetris', c);
  test('a ten název není cesta', c.nazevTypu.indexOf('C.') !== 0, c.nazevTypu);

  const std = spocti(null);
  test('ve standardním režimu plán žádné pásy nemá',
    std.oplasteniPlan.rezim === 'standard' && std.oplasteniPlan.pasy.length === 0,
    std.oplasteniPlan);
}

/* ---------- 2) „jiné" si nese název od obchodníka ---------- */
{
  const r = spocti(PO_STENACH({ A: { odM: 0,
    pasy: [{ typ: 'jine', doM: null, nazev: 'Perforovaný plech', naklad: 900 }] } }));
  const a = r.oplasteniPlan.pasy.find(p => p.stena === 'A');
  test('u „jiné" je názvem typu text obchodníka', a.nazevTypu === 'Perforovaný plech', a);
}

/* ---------- 3) skupiny: co na které stěně ---------- */
{
  test('ve standardním režimu se stěny nerozepisují (vrací null)',
    TSP.tsOplasteniSkupiny(spocti(null)) === null);

  const stejne = TSP.tsOplasteniSkupiny(spocti(PO_STENACH(null)));
  test('nezadané stěny spadnou do jediné skupiny všech čtyř',
    stejne.length === 1 && stejne[0].steny.join('') === 'ABCD', stejne);

  const s = TSP.tsOplasteniSkupiny(spocti(PO_STENACH({
    C: { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: null }] },
    B: { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: 2.2 }, { typ: 'C.skloVsg442Kc', doM: null }] },
  })));
  test('různé stěny dají různé skupiny', s.length === 4, s);
  const b = s.find(x => x.steny.indexOf('B') >= 0);
  /* ODSHORA DOLŮ — stejně jako v rozhraní (zadání J. V. 18. 9. 2026).
   * Uloženo je to obráceně, zdola nahoru, takže obrácení je skutečná práce
   * a ne náhoda: kdyby se vynechalo, začínal by popis Cetrisem u země. */
  test('stěna se dvěma pásy se vypisuje odshora dolů',
    b.popis.indexOf('Sklo') < b.popis.indexOf('Cetris'), b.popis);
  test('a u dvou pásů jsou v popisu výšky', /\d,\d–/.test(b.popis), b.popis);
  const c = s.find(x => x.steny.indexOf('C') >= 0);
  test('jednopásová stěna je jen typ, bez výšek', c.popis === 'Cetris', c.popis);
}

/* ---------- 4) všechny čtyři stejně = pořád „kompletní opláštění" ---------- */
{
  test('zapnutý režim beze změn nemění text specifikace',
    TSP.tsOplasteniRozsah(spocti(PO_STENACH(null))) === 'kompletní opláštění šachty');
  test('a ve standardním režimu se text taky nemění',
    TSP.tsOplasteniRozsah(spocti(null)) === null);
}

/* ---------- 5) názvy typů jsou ve slovníku ---------- */
{
  const chybi = [];
  eng.OPLASTENI_TYPY.forEach(t => {
    if (t.id === 'jine') return;   // název píše obchodník, přeložit ho nejde
    ['en', 'de', 'fr'].forEach(j => {
      const st = P.trStav(t.nazev, j);
      if (!st.prelozeno) chybi.push(t.nazev + ' / ' + j);
    });
  });
  test('každý typ opláštění má překlad do en/de/fr', chybi.length === 0, chybi);
  /* Sonda na sobě: kdyby trStav hlásil „přeloženo" na cokoli, test výš by
   * prošel i s prázdným slovníkem. */
  test('sonda: vymyšlený název se hlásí jako nepřeložený',
    P.trStav('Opláštění z tvarohu', 'de').prelozeno === false);
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
