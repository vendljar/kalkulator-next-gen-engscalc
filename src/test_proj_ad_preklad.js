/* AUTORSKÝ DOZOR V EN/DE/FR NABÍDCE PROJ BEZ ČESKÉ VĚTY (rozhodnutí J. V.
 * 14. 10. 2026 k dávce v14.10.2).
 *
 * Online nabídka PROJ v EN/DE/FR s nabízeným autorským dozorem (AD) nesla
 * v blocích AD česky:
 *   - PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU: „100 % z celkové ceny za tuto
 *     činnost, fakturováno měsíčně" (slovník znal jen dvě půlky z buňky
 *     šablony PROJ v4/v5, ne celou větu online nabídky);
 *   - AUTORSKÝ DOZOR (AD): odstavec stál jako { cz } (souvislá próza zůstává
 *     česky), přestože ho slovník od překladu šablony PROJ zná.
 * Test projde všechny řetězce bloků AD (nadpis, odstavce, popis, řádky)
 * v EN/DE/FR: každý musí být přeložený (trStav … prelozeno) a bez české
 * diakritiky. CZ nabídka se nemění.
 *
 * Spuštění: cd src && node test_proj_ad_preklad.js */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
const PR = nacti('./preklad.js');
nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
nacti('./plan_plateb.js');
const NP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
global.NAST = { firma: global.firmaDefault() };

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 600)); } };

const VETA = '100 % z celkové ceny za tuto činnost, fakturováno měsíčně';
const AD_NADPISY = ['ROZŠÍŘENÁ NABÍDKA', 'AUTORSKÝ DOZOR (AD)', 'MĚSÍČNÍ SAZBA ZA AUTORSKÝ DOZOR (AD)', 'PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU'];
/* písmena, která má čeština a EN/DE/FR ne */
const CESKA = /[ěščřžůťďňĚŠČŘŽŮŤĎŇ]/;

const zak = () => { const z = zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 404'; z.nazevAkce = 'Zkušební akce';
  const v = z.varianty[0]; v.data.proj.cenik = ZC.zkusebniCenikProj(); v.data.proj.cenik.kurzEurKc = 25;
  v.data.proj.zadani.nabizetAD = true; return z; };
/* všechny řetězce bloku (kromě částky) */
const texty = b => [b.nadpis, b.text, b.popis].concat(b.odstavce || [], b.uvod || [],
  ...(b.radky || []).map(r => Array.isArray(r) ? r : [r])).filter(x => typeof x === 'string' && x.trim());

test('slovník: celá věta platebních podmínek AD má EN/DE/FR', ['en', 'de', 'fr'].every(L => PR.trStav(VETA, L).prelozeno),
  ['en', 'de', 'fr'].map(L => PR.tr(VETA, L)));
test('slovník: EN navazuje na šablonu PROJ („100 % of the total price for this service" + „invoiced monthly")',
  PR.tr(VETA, 'en') === '100 % of the total price for this service, invoiced monthly', PR.tr(VETA, 'en'));

{
  const z = zak();
  const cz = NP.nabidkaProjData(z, z.varianty[0], 'cz');
  const pl = cz.bloky.find(b => b.nadpis === 'PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU');
  test('CZ: platební podmínky AD nesou větu česky beze změny', !!pl && pl.radky.some(r => r[1] === VETA), pl);
}

['en', 'de', 'fr'].forEach(L => {
  const z = zak();
  const d = NP.nabidkaProjData(z, z.varianty[0], L);
  const K = L.toUpperCase();
  const nadpisy = AD_NADPISY.map(n => PR.tr(n, L));
  const ad = d.bloky.filter(b => nadpisy.indexOf(b.nadpis || b.text) >= 0);
  test(K + ': nabídka má všechny čtyři bloky AD', ad.length === 4, d.bloky.map(b => b.nadpis || b.text));
  const pl = ad.find(b => b.nadpis === PR.tr('PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU', L));
  test(K + ': platební podmínky AD nesou přeloženou větu', !!pl && pl.radky.some(r => r[1] === PR.tr(VETA, L)), pl);
  const ceske = [];
  ad.forEach(b => texty(b).forEach(t => { if (CESKA.test(t)) ceske.push(t); }));
  test(K + ': bloky AD nemají českou větu', ceske.length === 0, ceske);
});

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
