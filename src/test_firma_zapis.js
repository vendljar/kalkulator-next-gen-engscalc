/* ZÁPIS V OBCHODNÍM REJSTŘÍKU SE NEPŘEKLÁDÁ (rozhodnutí J. V. 14. 10. 2026:
 * „zápisy v obchodním rejstříku nepřekládej").
 *
 * Dávka v14.10.2 (bod 6, d9bedae) zápis firmy („C 123456 vedená u Městského
 * soudu v Praze") v EN/DE/FR nabídce překládala vzorem slovníku. J. V. to
 * vrátil: zápis jde do CZ i EN/DE/FR nabídky — výpis DODAVATEL i symbol
 * {{FIRMA_ZAPIS}} (OCK i PROJ) — přesně tak, jak je zadaný v Nastavení → Firma.
 * Čísla jsou smyšlená.
 *
 * Spuštění: cd src && node test_firma_zapis.js */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
const PR = nacti('./preklad.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
const F = nacti('./firma.js');
nacti('./plan_plateb.js');
const zk = nacti('./zakazka.js');
const N = nacti('./nabidka.js');
const NP = nacti('./nabidka_proj.js');
nacti('./zamek.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');
const JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
/* česká slova věty — v překladu nesmí zůstat ani jedno */
const JAZYKY = ['en', 'de', 'fr'];

const TVARY = [
  'C 999001 vedená u Městského soudu v Praze',
  'spisová značka C 999001 vedená u Městského soudu v Praze',
  'sp. zn. C 999002, vedená u Krajského soudu v Brně',
  'v obchodním rejstříku vedeném Městským soudem v Praze, oddíl C, vložka 999001',
  'zapsaná v obchodním rejstříku vedeném Krajským soudem v Ostravě, oddíl B, vložka 999003',
  'spisová značka C 999001, Městský soud v Praze',
];

/* ---- 1) slovník: žádný vzor zápis nepřepíše ---- */
TVARY.forEach(t => JAZYKY.forEach(L => {
  test(L.toUpperCase() + ': slovník nechá „' + t + '" beze změny', PR.tr(t, L) === t, PR.tr(t, L));
}));

/* ---- 2) nabídka OCK: výpis DODAVATEL a symbol {{FIRMA_ZAPIS}} ---- */
global.NAST = { firma: Object.assign(global.firmaDefault(), { zapis: TVARY[0] }) };
const zak = zk.novaZakazka();
zak.cislo = '2026 - OPR - CN - 9150'; zak.nazevAkce = 'Zápis';
Object.assign(zak.varianty[0].data.ock.zadani, { prejezd: 2.7, zdvih: 17.325, prohluben: 1.05, sirka: 1.51, hloubka: 1.515 });
zak.varianty[0].data.cenik.kurzEurKc = 25;
zak.varianty[0].data.proj.cenik.kurzEurKc = 25;
const dodavatelZapis = (L) => {
  const ph = N.nabidkaData(zak, zak.varianty[0], JEKLY, L).placeholders;
  const sek = N.nabidkaNahledSekce(ph, L);
  const dod = sek[sek.length - 1];
  const cislo = NAST.firma.zapis.match(/\d{6}/)[0];
  return { ph, radek: dod && dod.radky.find(r => r[1] && String(r[1]).indexOf(cislo) >= 0) };
};
/* každý tvar zápisu, CZ i EN/DE/FR: DODAVATEL (OCK), {{FIRMA_ZAPIS}} OCK i PROJ
 * nesou přesně zadaný text */
TVARY.forEach(t => {
  NAST.firma.zapis = t;
  ['cz'].concat(JAZYKY).forEach(L => {
    const x = dodavatelZapis(L);
    const K = L.toUpperCase();
    test(K + ' nabídka OCK: DODAVATEL nese zápis beze změny („' + t + '")', !!x.radek && x.radek[1] === t, x.radek);
    test(K + ' nabídka OCK: {{FIRMA_ZAPIS}} beze změny („' + t + '")', x.ph.FIRMA_ZAPIS === t, x.ph.FIRMA_ZAPIS);
    const pj = NP.nabidkaProjData(zak, zak.varianty[0], L).placeholders;
    test(K + ' nabídka PROJ: {{FIRMA_ZAPIS}} beze změny („' + t + '")', pj.FIRMA_ZAPIS === t, pj.FIRMA_ZAPIS);
  });
});
NAST.firma.zapis = TVARY[0];

/* ---- 3) firmaRadky bez jazyka (krycí list, Nastavení) jako dřív ---- */
test('firmaRadky bez jazyka hodnotu nepřekládá (krycí list je česky)',
  (F.firmaRadky(NAST.firma, null).find(r => r[0] === 'Zápis v obchodním rejstříku') || [])[1] === TVARY[0]);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
