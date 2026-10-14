/* OPLECHOVÁNÍ SOKLU PROHLUBNĚ V TECHNICKÉ SPECIFIKACI (připomínka obchodu,
 * rozhodnutí J. V. 14. 10. 2026).
 *
 * Nabídka OCK řádek „OPLECHOVÁNÍ SOKLU PROHLUBNĚ" měla (16. 9. a N17
 * 21. 9. 2026): v DOPLŇKOVÝCH KONSTRUKCÍCH, když je sokl součástí dodávky,
 * jinak v SOUČÁSTÍ DODÁVKY NENÍ („nabízeno jako příplatek" / „není součástí
 * nabídky"). Technická specifikace — příloha smlouvy — řádek neznala vůbec.
 * Nově rozhoduje JEDNA funkce tsSoklRadek (techspec.js) pro obě místa a platí
 * i pro vnitřní šachtu (sokl se tam nenabízí → „není součástí nabídky").
 *
 * Spuštění: cd src && node test_sokl_specifikace.js */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const TSm = nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
const zk = nacti('./zakazka.js');
const N = nacti('./nabidka.js');
const JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));
global.NAST = { firma: global.firmaDefault() };

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

test('techspec.js exportuje tsSoklRadek a specifikace má řádky sokl / neniSokl', typeof TSm.tsSoklRadek === 'function'
  && TSm.TECHSPEC_DEF.some(s => s.sekce === 'DOPLŇKOVÉ KONSTRUKCE' && s.pole.some(p => p.id === 'sokl'))
  && TSm.TECHSPEC_DEF.some(s => s.sekce === 'SOUČÁSTÍ DODÁVKY NENÍ' && s.pole.some(p => p.id === 'neniSokl')));
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const pole = id => TSm.TECHSPEC_DEF.reduce((a, s) => a.concat(s.pole), []).find(p => p.id === id);
const zakazka = (uprav) => {
  const zak = zk.novaZakazka();
  zak.cislo = '2026 - OPR - CN - 9140'; zak.nazevAkce = 'Sokl';
  const z = zak.varianty[0].data.ock.zadani;
  Object.assign(z, { prejezd: 2.7, zdvih: 17.325, prohluben: 1.05, sirka: 1.51, hloubka: 1.515, nastupiste: 4 });
  if (uprav) uprav(z, zak.varianty[0].data);
  return zak;
};
/* stav dokumentu: { spec: [sokl, neniSokl], nab: [TS_SOKL, TS_NENI_SOKL] } */
const stav = (zak, L) => {
  const v = zak.varianty[0], d = v.data;
  const r = vypocet(d.ock.zadani, d.cenik, JEKLY, d.ock.fixes);
  const spec = ['sokl', 'neniSokl'].map(id => tsHodnota(pole(id), d.techspec, r, d.ock.zadani, d.cenik, L).text);
  const ph = N.nabidkaData(zak, v, JEKLY, L || 'cz').placeholders;
  return { spec, nab: [ph.TS_SOKL, ph.TS_NENI_SOKL], sekce: N.nabidkaNahledSekce(ph, L || 'cz') };
};
const rady = (s, sekce) => ((s.sekce.find(x => x.sekce === sekce) || {}).radky || []).filter(r => /SOKL/.test(r[0]));

const PRIPADY = [
  ['exteriér, sokl v základní ceně', z => { z.typSachty = 'exteriérová'; z.volitelne.sokl = true; }, ['je součástí dodávky', '']],
  ['exteriér, sokl jako příplatek v nabídce', z => { z.typSachty = 'exteriérová'; z.volitelne.sokl = false; }, ['', 'nabízeno jako příplatek']],
  ['exteriér, příplatek soklu z nabídky vyřazený', z => { z.typSachty = 'exteriérová'; z.volitelne.sokl = false;
    z.priplatkyVynechat = (z.priplatkyVynechat || []).concat('sokl'); }, ['', 'není součástí nabídky']],
  ['vnitřní šachta (sokl se nenabízí)', z => { z.typSachty = 'interiérová'; z.volitelne.sokl = true; }, ['', 'není součástí nabídky']],
];
PRIPADY.forEach(([nazev, uprav, ocek]) => {
  const s = stav(zakazka(uprav));
  test(nazev + ': specifikace ' + JSON.stringify(ocek), s.spec[0] === ocek[0] && s.spec[1] === ocek[1], s.spec);
  test(nazev + ': nabídka OCK říká totéž co specifikace', s.nab[0] === s.spec[0] && s.nab[1] === s.spec[1], [s.nab, s.spec]);
  test(nazev + ': náhled nabídky má řádek v právě jedné sekci',
    rady(s, 'DOPLŇKOVÉ KONSTRUKCE').length + rady(s, 'SOUČÁSTÍ DODÁVKY NENÍ').length === 1
    && rady(s, ocek[0] ? 'DOPLŇKOVÉ KONSTRUKCE' : 'SOUČÁSTÍ DODÁVKY NENÍ').length === 1);
});

/* odvozené pole: ruční přepis ve specifikaci rozhodnutí nepřebije (příloha smlouvy
 * nesmí popřít, co je v ceně) */
{
  const zak = zakazka(z => { z.typSachty = 'exteriérová'; z.volitelne.sokl = true; });
  zak.varianty[0].data.techspec.hodnoty.sokl = 'není součástí';
  test('ruční přepis řádku soklu se nepoužije (řídí se cenou)', stav(zak).spec[0] === 'je součástí dodávky');
}

/* cizí jazyk: nabídka i specifikace přeložené */
{
  const zak = zakazka(z => { z.typSachty = 'exteriérová'; z.volitelne.sokl = false; });
  zak.varianty[0].data.cenik.kurzEurKc = 25;
  ['en', 'de', 'fr'].forEach(L => {
    const s = stav(zak, L);
    test(L.toUpperCase() + ': řádek „není součástí dodávky" nabídky je přeložený a sedí na specifikaci po překladu',
      s.nab[1] && s.nab[1].toLowerCase() === tr(s.spec[1], L).toLowerCase() && !/[ěščřžůťďň]/i.test(s.nab[1]), [s.nab[1], s.spec[1]]);
    test(L.toUpperCase() + ': popisek OPLECHOVÁNÍ SOKLU PROHLUBNĚ má překlad', trStav('OPLECHOVÁNÍ SOKLU PROHLUBNĚ', L).prelozeno);
  });
}

/* bez výsledku výpočtu (rozdělané zadání) nic nespadne */
test('bez výsledku výpočtu: tsSoklRadek mlčí jako „není součástí nabídky"',
  TSm.tsSoklRadek(null, null).vDodavce === false && TSm.tsSoklRadek(null, null).text === 'není součástí nabídky');

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
