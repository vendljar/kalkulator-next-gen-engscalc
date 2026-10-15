/* KRYCÍ LIST ODESLANÉ NABÍDKY SE DÁ DOPLŇOVAT (J. V. 14. 10. 2026: „věci,
 * které nejsou v cenové nabídce, by mělo být možné v krycím listu upravovat
 * i po vytištění nabídky").
 *
 * Model v zamek.js: pole krycího listu, která nejdou do cenové nabídky, se
 * u varianty zamčené tiskem NABÍDKY smějí měnit; pole nabídky (podmínky pod
 * „Celkem s DPH", symboly {{PODM_…}}, splátky SoD PROJ starších dat) ne.
 * Po tisku SMLOUVY O DÍLO je krycí list zamčený celý. Porovnání dat zamčené
 * varianty (serverová pojistka) volná pole přehlíží, ostatní ne.
 *
 * Spuštění: cd src && node test_kryci_po_tisku.js */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
nacti('./plan_plateb.js');
const zk = nacti('./zakazka.js');
const ZM = nacti('./zamek.js');
const K = nacti('./kryci.js');
const KP = nacti('./kryci_proj.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const potreba = ['zamekKryciPoleVolne', 'zamekKryciPoleVNabidce', 'zamekKryciOtevreny', 'zamekDataPorovnani'];
potreba.forEach(f => test('zamek.js exportuje ' + f, typeof ZM[f] === 'function'));
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const zamcena = (typ, dalsi) => {
  const z = zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 405';
  const v = z.varianty[0];
  ZM.zamkniVariantu(v, { typ });
  (dalsi || []).forEach(t => ZM.zamkniVariantu(v, { typ: t }));
  return v;
};

/* ---- 1) která pole jdou do nabídky ---- */
K.KRYCI_SEKCE.forEach(s => s.pole.forEach(p => {
  if (K.KRYCI_NABIDKA_SEKCE.indexOf(s.sekce) >= 0)
    test('OCK: pole nabídky „' + p.id + '" (' + s.sekce + ') je v nabídce', ZM.zamekKryciPoleVNabidce('kryci', p.id));
}));
KP.KRYCI_PROJ_SEKCE.forEach(s => s.pole.forEach(p => {
  if (KP.KRYCI_PROJ_NABIDKA_SEKCE.indexOf(s.sekce) >= 0)
    test('PROJ: pole nabídky „' + p.id + '" (' + s.sekce + ') je v nabídce', ZM.zamekKryciPoleVNabidce('kryciProj', p.id));
}));
test('PROJ: splátky SoD starších dat (sodpPlatba1, sodpPlatba3) jsou v nabídce',
  ZM.zamekKryciPoleVNabidce('kryciProj', 'sodpPlatba1') && ZM.zamekKryciPoleVNabidce('kryciProj', 'sodpPlatba3'));
['jmenoPrijmeni', 'kontaktZakaznikEmail', 'scoring', 'dodavatelStavby', 'atypMustky', 'cisloSod'].forEach(id =>
  test('OCK: „' + id + '" není v nabídce', !ZM.zamekKryciPoleVNabidce('kryci', id)));
['odpovednyJmeno', 'odpovednyEmail', 'cisloSod'].forEach(id =>
  test('PROJ: „' + id + '" není v nabídce', !ZM.zamekKryciPoleVNabidce('kryciProj', id)));
test('neznámé pole se bere jako pole nabídky (zamčené)',
  ZM.zamekKryciPoleVNabidce('kryci', 'neniTakovePole') && ZM.zamekKryciPoleVNabidce('kryciProj', 'neniTakovePole'));
test('neznámý list se bere jako zamčený', ZM.zamekKryciPoleVNabidce('jine', 'jmenoPrijmeni'));

/* ---- 2) co se smí změnit ---- */
{
  const v = zk.novaZakazka().varianty[0];
  test('nezamčená varianta: smí se všechno', ZM.zamekKryciPoleVolne(v, 'kryci', 'zaloha1') && ZM.zamekKryciPoleVolne(v, 'kryciProj', 'splatnostDni'));
}
['nabidka', 'nabidkaTisk', 'nabidkaProj', 'nabidkaProjTisk'].forEach(typ => {
  const v = zamcena(typ);
  test(typ + ': krycí list mimo nabídku je otevřený', ZM.zamekKryciOtevreny(v));
  test(typ + ': OCK jmenoPrijmeni a PROJ odpovednyJmeno se smí změnit',
    ZM.zamekKryciPoleVolne(v, 'kryci', 'jmenoPrijmeni') && ZM.zamekKryciPoleVolne(v, 'kryciProj', 'odpovednyJmeno'));
  test(typ + ': OCK zaloha1 / terminDodani a PROJ splatnostDni / sodpPlatba1 zůstávají zamčené',
    !ZM.zamekKryciPoleVolne(v, 'kryci', 'zaloha1') && !ZM.zamekKryciPoleVolne(v, 'kryci', 'terminDodani')
    && !ZM.zamekKryciPoleVolne(v, 'kryciProj', 'splatnostDni') && !ZM.zamekKryciPoleVolne(v, 'kryciProj', 'sodpPlatba1'));
});
[['sod'], ['sodProj'], ['nabidkaProjTisk', ['sodProj']], ['nabidka', ['nabidkaTisk', 'sod']]].forEach(([typ, dalsi]) => {
  const v = zamcena(typ, dalsi);
  const t = [typ].concat(dalsi || []).join(' + ');
  test(t + ': po smlouvě o dílo je krycí list zamčený celý', !ZM.zamekKryciOtevreny(v)
    && !ZM.zamekKryciPoleVolne(v, 'kryci', 'jmenoPrijmeni') && !ZM.zamekKryciPoleVolne(v, 'kryciProj', 'odpovednyJmeno'));
});

/* ---- 3) porovnání dat zamčené varianty (serverová pojistka) ---- */
{
  const v = zamcena('nabidkaProjTisk');
  v.data.kryci = { hodnoty: { zaloha1: '30 %' } };
  v.data.kryciProj = { hodnoty: { splatnostDni: '14' } };
  const pred = ZM.zamekDataPorovnani(v.data, v);
  const d1 = JSON.parse(JSON.stringify(v.data));
  d1.kryci.hodnoty.jmenoPrijmeni = 'Zkušební Jméno'; d1.kryciProj.hodnoty.odpovednyJmeno = 'Ukázková osoba';
  test('doplněné pole mimo nabídku: porovnání shodné', ZM.zamekDataPorovnani(d1, v) === pred);
  const d2 = JSON.parse(JSON.stringify(v.data)); d2.kryci.hodnoty.zaloha1 = '50 %';
  test('změněná záloha (OCK, nabídka): porovnání se liší', ZM.zamekDataPorovnani(d2, v) !== pred);
  const d3 = JSON.parse(JSON.stringify(v.data)); d3.kryciProj.hodnoty.splatnostDni = '30';
  test('změněná splatnost (PROJ, nabídka): porovnání se liší', ZM.zamekDataPorovnani(d3, v) !== pred);
  const d4 = JSON.parse(JSON.stringify(v.data)); d4.kryciProj.hodnoty.sodpPlatba1 = '100 %';
  test('přidaná splátka SoD PROJ: porovnání se liší', ZM.zamekDataPorovnani(d4, v) !== pred);
  const d5 = JSON.parse(JSON.stringify(v.data)); d5.kryciProj.planPlateb = { predvolba: 'x' };
  test('změněný plán plateb PROJ: porovnání se liší', ZM.zamekDataPorovnani(d5, v) !== pred);
  const d6 = JSON.parse(JSON.stringify(v.data)); d6.kryci.zmrazeno = { jmenoPrijmeni: 'jiné' };
  test('zmrazené podmínky se porovnávají celé', ZM.zamekDataPorovnani(d6, v) !== pred);
  const d7 = JSON.parse(JSON.stringify(v.data)); d7.ock = { zadani: { zdvih: 99 } };
  test('změna kalkulace: porovnání se liší', ZM.zamekDataPorovnani(d7, v) !== pred);
  test('porovnání data nemění (kopie)', v.data.kryci.hodnoty.zaloha1 === '30 %' && !('jmenoPrijmeni' in v.data.kryci.hodnoty));
  const s = zamcena('nabidkaProjTisk', ['sodProj']);
  s.data = JSON.parse(JSON.stringify(v.data));
  test('po smlouvě o dílo: doplněné pole mimo nabídku porovnání mění', ZM.zamekDataPorovnani(d1, s) !== ZM.zamekDataPorovnani(s.data, s));
  test('prázdná data neselžou', ZM.zamekDataPorovnani(null, v) === 'null' && ZM.zamekDataPorovnani({}, v) === '{}');
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
