/* NÁVRH ČÍSLA SMLOUVY O DÍLO (#366, rozhodnutí J. V. 16. 10. 2026, dávka V1,
 * v17.10.2): „Aplikace navrhne další číslo SoD z řady (podle čísla nabídky,
 * např. 2026 - OPR - SOD - 0412), obchodník může přepsat."
 *
 * Hlídá:
 *  1) sodCisloNavrh: CN → SOD se zachováním řady, oddělovačů a přípony
 *     varianty; starší číslo bez CN; nevyplněné číslo návrh nedá,
 *  2) krycí list OCK i PROJ předvyplní návrh (výstup BO i Tech), varianta 2
 *     nese příponu, ruční přepis má přednost a jeho smazání (↺) vrátí návrh,
 *  3) návrh plní {{SOD_CISLO_SMLOUVY}} ve smlouvě realizace i projekce,
 *  4) první tisk SoD opíše číslo SoD a datum podpisu do dat (kryciZmrazSod,
 *     kryciProjZmrazSod), další tisk už ne; po něm jsou termíny, podpisy,
 *     podmínky i číslo SoD zamčené (plná moc pm* volná, B163) a zápis
 *     projde serverovou pojistkou odeslané nabídky,
 *  5) číslo SoD se v dokumentech nepřekládá (evidenční kód).
 *
 * Spuštění: cd src && node test_cislo_sod_navrh.js */
const fs = require('fs');
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
nacti('./preklad.js'); nacti('./format.js'); nacti('./engine.js'); nacti('./engine_proj.js');
nacti('./techspec.js');
const zk = nacti('./zakazka.js');
const ZM = nacti('./zamek.js');
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

/* ---- 4) zámek po tisku SoD ---- */
const prvni = typeof ZM.zamekPrvniSmlouva === 'function' ? ZM.zamekPrvniSmlouva : () => null;
const zmrazOck = typeof K.kryciZmrazSod === 'function' ? K.kryciZmrazSod : () => 0;
const zmrazProj = typeof KP.kryciProjZmrazSod === 'function' ? KP.kryciProjZmrazSod : () => 0;
const novaZ = () => {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 0412';
  z.objednatel = 'SVJ Zkušební 12'; z.adresa = 'Zkušební 12, Zkušebín';
  z.varianty[0].data.kryci = { hodnoty: {} }; z.varianty[0].data.kryciProj = { hodnoty: {} };
  return z;
};
/* Tisk jako v zamekPoTisku (zamek_ui.js): nejdřív opis, pak zámek. */
const vytiskni = (z, w, typ) => {
  if (prvni(w, typ)) { zmrazOck(z, w, JEKLY); zmrazProj(z, w); }
  ZM.zamkniVariantu(w, { typ });
};
{
  const z = novaZ(), w = z.varianty[0];
  test('zamekPrvniSmlouva: nabídka není smlouva', prvni(w, 'nabidkaTisk') === false);
  test('zamekPrvniSmlouva: SoD u nezamčené varianty = první', prvni(w, 'sod') === true);
  ZM.zamkniVariantu(w, { typ: 'nabidkaTisk' });
  test('zamekPrvniSmlouva: SoD po odeslané nabídce = první', prvni(w, 'sod') === true && prvni(w, 'sodProj') === true);
  ZM.zamkniVariantu(w, { typ: 'sodProj' });
  test('zamekPrvniSmlouva: po SoD projekce už SoD realizace první není', prvni(w, 'sod') === false);
}
{
  const z = novaZ(), w = z.varianty[0];
  ZM.zamkniVariantu(w, { typ: 'nabidkaTisk' });
  const ulozena = JSON.parse(JSON.stringify(w));            // verze na serveru před tiskem SoD
  w.data.kryci.hodnoty.sodPokutaDenni = '500';               // volné pole doplněné po nabídce
  vytiskni(z, w, 'sod');
  const h = w.data.kryci.hodnoty, hp = w.data.kryciProj.hodnoty;
  test('tisk SoD: číslo SoD OCK se opíše do dat', h.cisloSod === '2026 - OPR - SOD - 0412', h);
  test('tisk SoD: datum podpisu = den tisku se opíše do dat', h.sodDatumPodpisu === K.kryciDnesIso(), h.sodDatumPodpisu);
  test('tisk SoD: číslo SoD PROJ se opíše do dat', hp.cisloSod === '2026 - OPR - SOD - 0412', hp);
  /* server: porovnání proti uložené verzi (odeslaná nabídka, list otevřený) */
  const pred = JSON.parse(JSON.stringify(w.data));
  delete pred.kryci.hodnoty.cisloSod; delete pred.kryci.hodnoty.sodDatumPodpisu; delete pred.kryciProj.hodnoty.cisloSod;
  test('tisk SoD: opis projde serverovou pojistkou odeslané nabídky',
    ZM.zamekDataPorovnani(w.data, ulozena) === ZM.zamekDataPorovnani(pred, ulozena));
  /* po tisku: změna čísla nabídky smlouvu nezmění */
  z.cislo = '2026 - OPR - CN - 0999';
  test('po tisku SoD: krycí list drží číslo smlouvy i po změně čísla nabídky',
    radek(K.kryciData(z, w, JEKLY, 'bo'), 'Číslo SoD')[1] === '2026 - OPR - SOD - 0412');
  test('po tisku SoD: smlouva (dotisk) nese totéž číslo',
    sodData(z, w, JEKLY, 'cz').placeholders.SOD_CISLO_SMLOUVY === '2026 - OPR - SOD - 0412');
  /* zámek polí: číslo, termín, podpisy, podmínky; plná moc volná */
  [['kryci', 'cisloSod'], ['kryci', 'sodDatumPodpisu'], ['kryci', 'objPodpisFirma'], ['kryci', 'objPodpis2Jmeno'],
   ['kryci', 'terminDodani'], ['kryci', 'splatnostDni'], ['kryci', 'sodPokutaDenni'],
   ['kryciProj', 'cisloSod'], ['kryciProj', 'objPodpisFirma'], ['kryciProj', 'terminZahajeni']].forEach(([l, id]) => {
    test('po tisku SoD je zamčené ' + l + '.' + id, !ZM.zamekKryciPoleVolne(w, l, id));
  });
  test('po tisku SoD zůstává plná moc volná (B163)', ZM.zamekKryciPoleVolne(w, 'kryciProj', 'pmZmocnitelBytem'));
  /* dotisk SoD nic nepřepíše */
  h.sodDatumPodpisu = '2026-01-02';
  vytiskni(z, w, 'sod');
  test('dotisk SoD datum podpisu nepřepíše', h.sodDatumPodpisu === '2026-01-02', h.sodDatumPodpisu);
}
{
  const z = novaZ(), w = z.varianty[0];
  w.data.kryci.hodnoty.cisloSod = 'SOD-RUCNE-7';
  w.data.kryci.hodnoty.sodDatumPodpisu = '2026-10-20';
  vytiskni(z, w, 'sod');                                      // SoD jako první tisk vůbec
  test('tisk SoD ruční číslo a datum nechá', w.data.kryci.hodnoty.cisloSod === 'SOD-RUCNE-7'
    && w.data.kryci.hodnoty.sodDatumPodpisu === '2026-10-20', w.data.kryci.hodnoty);
  test('tisk SoD jako první tisk: varianta je zamčená a číslo SoD PROJ opsané',
    ZM.variantaUzamcena(w) && w.data.kryciProj.hodnoty.cisloSod === '2026 - OPR - SOD - 0412');
}
{
  const z = novaZ(); z.cislo = zk.ZAK_CISLO_PREDLOHA; const w = z.varianty[0];
  vytiskni(z, w, 'sod');
  test('zakázka bez čísla: tisk SoD číslo nevymyslí (symbol zůstane k doplnění)', w.data.kryci.hodnoty.cisloSod === undefined, w.data.kryci.hodnoty);
}
{
  const z = novaZ(), w = z.varianty[0];
  vytiskni(z, w, 'nabidkaTisk');
  test('tisk nabídky číslo SoD do dat neopíše (zůstává návrh)', w.data.kryci.hodnoty.cisloSod === undefined
    && w.data.kryci.hodnoty.sodDatumPodpisu === undefined, w.data.kryci.hodnoty);
}

/* ---- 5) překlad ---- */
test('číslo SoD je pro překlad evidenční kód (EN/DE/FR beze změny)', prekladNeutral('2026 - OPR - SOD - 0412')
  && prekladNeutral('2026 OVP SOD 0366.2'));

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
