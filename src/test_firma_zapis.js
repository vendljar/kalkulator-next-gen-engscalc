/* ZÁPIS V OBCHODNÍM REJSTŘÍKU V CIZOJAZYČNÉ NABÍDCE (připomínka obchodu,
 * rozhodnutí J. V. 14. 10. 2026).
 *
 * Firemní údaj „C 123456 vedená u Městského soudu v Praze" (Nastavení →
 * Firma) šel do EN/DE/FR nabídky česky: výpis DODAVATEL překládal jen
 * popisky (firmaRadky) a symbol {{FIRMA_ZAPIS}} se nepřekládal vůbec. Nově
 * ho přeloží vzor slovníku (PREKLAD_SOUDY + PREKLAD_VZORY v preklad.js) —
 * obvyklé tři tvary české věty, soud podle mapy, oddíl a vložka beze změny.
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
const CESKY = /vedená|soudu|soudem|soud v|rejstřík|oddíl|vložka|spisová|zapsaná|Městsk|Krajsk|Praze/i;
const JAZYKY = ['en', 'de', 'fr'];

const TVARY = [
  'C 999001 vedená u Městského soudu v Praze',
  'spisová značka C 999001 vedená u Městského soudu v Praze',
  'sp. zn. C 999002, vedená u Krajského soudu v Brně',
  'v obchodním rejstříku vedeném Městským soudem v Praze, oddíl C, vložka 999001',
  'zapsaná v obchodním rejstříku vedeném Krajským soudem v Ostravě, oddíl B, vložka 999003',
  'spisová značka C 999001, Městský soud v Praze',
];

/* ---- 1) slovník: každý tvar přeložený, bez české věty, číslo zůstává ---- */
TVARY.forEach(t => JAZYKY.forEach(L => {
  const st = PR.trStav(t, L);
  const cislo = t.match(/\d{6}/)[0];
  test(L.toUpperCase() + ': „' + t + '" přeloženo bez češtiny, číslo zůstává',
    st.prelozeno && !CESKY.test(st.text) && st.text.indexOf(cislo) >= 0, st.text);
}));
test('česky se nic nemění', PR.tr(TVARY[0], 'cz') === TVARY[0]);
test('neznámý tvar zůstane česky (nic se nevymýšlí) a je hlášený jako nepřeložený',
  PR.trStav('zapsáno někde jinde 123', 'en').prelozeno === false);

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
  return { ph, radek: dod && dod.radky.find(r => r[1] && String(r[1]).indexOf('999001') >= 0) };
};
{
  const cz = dodavatelZapis('cz');
  test('CZ nabídka: DODAVATEL nese zápis česky beze změny', cz.radek && cz.radek[1] === TVARY[0], cz.radek);
  test('CZ nabídka: {{FIRMA_ZAPIS}} česky beze změny', cz.ph.FIRMA_ZAPIS === TVARY[0], cz.ph.FIRMA_ZAPIS);
}
JAZYKY.forEach(L => {
  const x = dodavatelZapis(L);
  test(L.toUpperCase() + ' nabídka OCK: DODAVATEL — zápis bez české věty', x.radek && !CESKY.test(x.radek[1])
    && x.radek[1] === PR.tr(TVARY[0], L), x.radek);
  test(L.toUpperCase() + ' nabídka OCK: {{FIRMA_ZAPIS}} bez české věty', x.ph.FIRMA_ZAPIS && !CESKY.test(x.ph.FIRMA_ZAPIS), x.ph.FIRMA_ZAPIS);
  const pj = NP.nabidkaProjData(zak, zak.varianty[0], L).placeholders;
  test(L.toUpperCase() + ' nabídka PROJ: {{FIRMA_ZAPIS}} bez české věty', pj.FIRMA_ZAPIS && !CESKY.test(pj.FIRMA_ZAPIS), pj.FIRMA_ZAPIS);
});

/* ---- 3) firmaRadky bez jazyka (krycí list, Nastavení) jako dřív ---- */
test('firmaRadky bez jazyka hodnotu nepřekládá (krycí list je česky)',
  (F.firmaRadky(NAST.firma, null).find(r => r[0] === 'Zápis v obchodním rejstříku') || [])[1] === TVARY[0]);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
