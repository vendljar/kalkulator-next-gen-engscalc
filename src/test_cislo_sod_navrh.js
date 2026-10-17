/* NÁVRH ČÍSLA SMLOUVY O DÍLO (#366, rozhodnutí J. V. 16. 10. 2026, dávka V1,
 * v17.10.2): „Aplikace navrhne další číslo SoD z řady (podle čísla nabídky,
 * např. 2026 - OPR - SOD - 0412), obchodník může přepsat."
 *
 * Hlídá:
 *  1) sodCisloNavrh: CN → SOD se zachováním řady, oddělovačů a přípony
 *     varianty; starší číslo bez CN; nevyplněné číslo návrh nedá,
 *  2) krycí list OCK i PROJ předvyplní návrh (výstup BO i Tech), varianta 2
 *     nese příponu, ruční přepis má přednost a jeho smazání (↺) vrátí návrh,
 *  3) návrh plní {{SOD_CISLO_SMLOUVY}} ve smlouvě realizace i projekce.
 *
 * Spuštění: cd src && node test_cislo_sod_navrh.js */
const fs = require('fs');
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
nacti('./preklad.js'); nacti('./format.js'); nacti('./engine.js'); nacti('./engine_proj.js');
nacti('./techspec.js');
const zk = nacti('./zakazka.js');
nacti('./zamek.js');
nacti('./sleva.js'); nacti('./zaokrouhleni.js'); nacti('./firma.js'); nacti('./zpracovatel.js');
nacti('./plan_plateb.js');
const K = nacti('./kryci.js');
const KP = nacti('./kryci_proj.js');
nacti('./dokumenty.js'); nacti('./nabidka.js'); nacti('./nabidka_proj.js');
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./sod.js');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
global.NAST = { firma: global.firmaDefault() };

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

/* ---- 1) sodCisloNavrh ---- */
const navrh = typeof zk.sodCisloNavrh === 'function' ? zk.sodCisloNavrh : () => null;
test('sodCisloNavrh je exportovaná', typeof zk.sodCisloNavrh === 'function');
[
  ['2026 - OPR - CN - 0412', '2026 - OPR - SOD - 0412', 'ukázka ze zadání'],
  ['2026 - OPR - CN - 0412.2', '2026 - OPR - SOD - 0412.2', 'varianta 2 si nechá příponu'],
  ['2026 OVP CN 0366', '2026 OVP SOD 0366', 'řada projekce OVP, mezery'],
  ['2026-OPR-CN-0007', '2026-OPR-SOD-0007', 'pomlčky bez mezer'],
  ['2026 - opr - cn - 0412', '2026 - opr - SOD - 0412', 'malá písmena'],
  ['2025-OPR-0640', '2025-OPR-SOD-0640', 'starší číslo bez CN: SOD před pořadí'],
  ['2025-OPR-0640.3', '2025-OPR-SOD-0640.3', 'starší číslo bez CN s variantou'],
  ['2026 - OPR - CN - ', '', 'jen předloha: bez návrhu'],
  ['', '', 'prázdné: bez návrhu'],
  [null, '', 'null: bez návrhu'],
  ['bez čísla', '', 'bez číslic: bez návrhu'],
  ['2026 - OPR - CNX - 0412', '2026 - OPR - CNX - SOD - 0412', 'CN uvnitř slova se nemění'],
].forEach(([vstup, cekam, pozn]) => {
  const v = navrh(vstup);
  test('návrh „' + vstup + '" → „' + cekam + '" (' + pozn + ')', v === cekam, v);
});

/* ---- 2) krycí listy ---- */
const radek = (d, label) => { for (const s of d.sekce) for (const r of (s.radky || [])) if (r[0] === label) return r; return null; };
const zak = zk.novaZakazka();
zak.cislo = '2026 - OPR - CN - 0412';
zak.objednatel = 'SVJ Zkušební 12'; zak.adresa = 'Zkušební 12, Zkušebín'; zak.nazevAkce = 'Zkušební akce — návrh SoD';
const v1 = zak.varianty[0];
['bo', 'techdata'].forEach(ver => {
  const r = radek(K.kryciData(zak, v1, JEKLY, ver), 'Číslo SoD');
  test('OCK ' + ver + ': prázdné pole nese návrh z čísla nabídky', !!r && r[1] === '2026 - OPR - SOD - 0412', r);
  const rp = radek(KP.kryciProjData(zak, v1, JEKLY, ver), 'Číslo SoD');
  test('PROJ ' + ver + ': prázdné pole nese návrh z čísla nabídky', !!rp && rp[1] === '2026 - OPR - SOD - 0412', rp);
});
const pole = (def) => def.reduce((a, s) => a || s.pole.find(p => p.id === 'cisloSod'), null);
[['OCK', K.KRYCI_SEKCE], ['PROJ', KP.KRYCI_PROJ_SEKCE]].forEach(([jm, def]) => {
  const p = pole(def) || {};
  test(jm + ': zdroj pole říká, že jde o návrh', /návrh/.test(String(p.src || '')), p.src);
});
/* varianta 2 */
const v2 = JSON.parse(JSON.stringify(v1)); v2.id = 'v2'; v2.pripona = 2; v2.ridici = false;
zak.varianty.push(v2);
{
  const r = radek(K.kryciData(zak, v2, JEKLY, 'bo'), 'Číslo SoD');
  test('OCK varianta 2: návrh nese příponu .2 (unikátní vůči variantě 1)', !!r && r[1] === '2026 - OPR - SOD - 0412.2', r);
}
/* ruční přepis a ↺ */
v1.data.kryci = { hodnoty: { cisloSod: 'SOD-RUCNE-1' } };
v1.data.kryciProj = { hodnoty: { cisloSod: 'SODP-RUCNE-1' } };
test('OCK: ruční přepis má přednost před návrhem', radek(K.kryciData(zak, v1, JEKLY, 'bo'), 'Číslo SoD')[1] === 'SOD-RUCNE-1');
test('PROJ: ruční přepis má přednost před návrhem', radek(KP.kryciProjData(zak, v1, JEKLY, 'bo'), 'Číslo SoD')[1] === 'SODP-RUCNE-1');
delete v1.data.kryci.hodnoty.cisloSod; delete v1.data.kryciProj.hodnoty.cisloSod;   // = klReset (↺)
test('OCK: po smazání přepisu (↺) se vrátí návrh', radek(K.kryciData(zak, v1, JEKLY, 'bo'), 'Číslo SoD')[1] === '2026 - OPR - SOD - 0412');
/* změna čísla nabídky před tiskem návrh přepočte, ruční hodnotu ne */
zak.cislo = '2026 - OPR - CN - 0413';
test('OCK: nové číslo nabídky = nový návrh', radek(K.kryciData(zak, v1, JEKLY, 'bo'), 'Číslo SoD')[1] === '2026 - OPR - SOD - 0413');
zak.cislo = '2026 - OPR - CN - 0412';

/* ---- 3) smlouvy o dílo ---- */
{
  v1.data.kryci = { hodnoty: {} }; v1.data.kryciProj = { hodnoty: {} };
  const s = sodData(zak, v1, JEKLY, 'cz'), sp = sodProjData(zak, v1, 'cz');
  test('SoD realizace: {{SOD_CISLO_SMLOUVY}} = návrh', s.placeholders.SOD_CISLO_SMLOUVY === '2026 - OPR - SOD - 0412', s.placeholders.SOD_CISLO_SMLOUVY);
  test('SoD projekce: {{SOD_CISLO_SMLOUVY}} = návrh', sp.placeholders.SOD_CISLO_SMLOUVY === '2026 - OPR - SOD - 0412', sp.placeholders.SOD_CISLO_SMLOUVY);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
