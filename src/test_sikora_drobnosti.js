/* ===== DROBNOSTI Z MAILŮ D. SIKORY (2. a 3. 10. 2026, „online kalkulak") =====
 *
 * S1 — nabídka PROJ jen se zaměřením a studií tiskla pod TERMÍNY poznámku
 *      „*) Termíny pro vyjádření dotčených orgánů …", která patří k
 *      inženýrské činnosti (IČ); musel ji mazat.
 * S2 — cizojazyčná nabídka OCK: hodnoty „Out of scope" začínaly jednou velkým,
 *      jindy malým písmenem — sjednotit na velké.
 * S3 — „Po milnících" anglicky „Follow project milestones".
 * S4 — název souboru v jazyce nabídky (EN PRICE_QUOTATION, DE ANGEBOT; FR DEVIS).
 *
 * Pojistka proti prázdnému testu: před úpravou 7 prošlo / 13 selhalo,
 * po úpravě 20 / 0.
 *
 * Spuštění: cd src && node test_sikora_drobnosti.js */
const fs = require('fs');
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
const fm = nacti('./firma.js');
nacti('./plan_plateb.js');
const zk = nacti('./zakazka.js');
nacti('./zamek.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');
const N = nacti('./nabidka.js');
const NP = nacti('./nabidka_proj.js');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

/* ---------- S1: poznámka *) jen s inženýrskou činností ---------- */
const HVEZDA = /^\*\)/;
const projNabidka = (sekceVRozsahu, L) => {
  const z = zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 0901';
  const v = z.varianty[0];
  v.data.proj.cenik = ZC.zkusebniCenikProj();
  v.data.proj.cenik.kurzEurKc = 25;
  v.data.proj.zadani.sekce.forEach(s => (s.polozky || []).forEach(p => { p.vyrazeno = sekceVRozsahu.indexOf(s.key) < 0; }));
  return NP.nabidkaProjData(z, v, L);
};
const poznamky = (d) => d.bloky.filter(b => b.typ === 'pozn').reduce((a, b) => a.concat(b.radky), []);
for (const L of ['cz', 'en']) {
  const jenZaSt = projNabidka(['zamereni', 'studie'], L);
  test('S1 ' + L + ': zaměření + studie — poznámka *) o dotčených orgánech se netiskne',
    !poznamky(jenZaSt).some(t => HVEZDA.test(t)), poznamky(jenZaSt));
  test('S1 ' + L + ': zaměření + studie — věta o kapacitách zůstává',
    poznamky(jenZaSt).some(t => /kapacit|capacit/i.test(t)), poznamky(jenZaSt));
  const sIc = projNabidka(['zamereni', 'studie', 'dpz', 'ic'], L);
  test('S1 ' + L + ': s inženýrskou činností (IČ) poznámka *) zůstává',
    poznamky(sIc).some(t => HVEZDA.test(t)), poznamky(sIc));
}
test('S1 en: poznámka *) se dál překládá', poznamky(projNabidka(['ic'], 'en')).some(t => /^\*\) The deadlines/.test(t)));

/* ---------- S2–S4: nabídka OCK v cizím jazyce ---------- */
const ock = (L) => {
  global.NAST = { firma: Object.assign({}, fm.DEFAULT_FIRMA) };
  const zak = zk.novaZakazka(); zak.cislo = '2026 - OPR - CN - 0377';
  const v = zak.varianty[0]; v.data.cenik = ZC.zkusebniCenik(); v.data.cenik.kurzEurKc = 25;
  const d = N.nabidkaData(zak, v, JEKLY, L);
  return { d, sekce: N.nabidkaNahledSekce(d.placeholders, L, d.platbyOck) };
};
for (const L of ['en', 'de', 'fr']) {
  const { d, sekce } = ock(L);
  const neni = sekce.find(s => s.sekce === PR.tr('SOUČÁSTÍ DODÁVKY NENÍ', L));
  const male = neni ? neni.radky.filter(r => /^\s*\p{Ll}/u.test(String(r[1]))) : null;
  test('S2 ' + L + ': hodnoty „co není součástí dodávky" začínají velkým písmenem',
    !!neni && neni.radky.length > 5 && male.length === 0, male);
  const pfx = { en: 'PRICE_QUOTATION_', de: 'ANGEBOT_', fr: 'DEVIS_' }[L];
  test('S4 ' + L + ': název souboru nabídky OCK v jazyce dokumentu (' + pfx + '…)',
    d.nazevSouboru.indexOf(pfx + '2026-OPR-CN-0377') === 0 && /_[A-Z]{2}$/.test(d.nazevSouboru), d.nazevSouboru);
  const dp = projNabidka(['zamereni', 'studie'], L);
  test('S4 ' + L + ': název souboru nabídky PROJ v jazyce dokumentu (' + pfx + 'PROJ_…)',
    dp.nazevSouboru.indexOf(pfx + 'PROJ_') === 0, dp.nazevSouboru);
}
/* česká nabídka beze změny */
{
  const { d, sekce } = ock('cz');
  const neni = sekce.find(s => s.sekce === 'SOUČÁSTÍ DODÁVKY NENÍ');
  test('S2 cz: česká nabídka beze změny (hodnoty malým jako dosud)',
    !!neni && neni.radky.some(r => r[1] === 'není součástí nabídky'), neni && neni.radky);
  test('S4 cz: česky dál NABÍDKA_…', d.nazevSouboru === 'NABÍDKA_2026-OPR-CN-0377', d.nazevSouboru);
}

/* ---------- S3: Po milnících ---------- */
test('S3: „Po milnících" anglicky „Follow project milestones"', PR.tr('Po milnících', 'en') === 'Follow project milestones', PR.tr('Po milnících', 'en'));
{
  const { sekce } = ock('en');
  const iii = sekce.find(s => /BILLING/.test(s.sekce));
  test('S3: v anglické nabídce řádek Invoicing method = Follow project milestones',
    !!iii && iii.radky.some(r => r[1] === 'Follow project milestones'), iii && iii.radky);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
