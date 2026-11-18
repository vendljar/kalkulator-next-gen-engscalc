/* Test — ÚPRAVA ÚČTU A BLOK „VYPRACOVAL" (#UE, zadání J. V. 18. 11. 2026)
 *
 * Správce nově opraví u existujícího účtu titul, jméno, funkci a telefon
 * (Nastavení → Uživatelé → Upravit…). Tyhle údaje se tisknou v bloku
 * „Vypracoval" cenové nabídky a v krycím listu. Sada hlídá dopad:
 *
 *  1) NOVÝ TISK nese nové údaje — zpracovatel se bere z přihlášeného účtu
 *     (zpracovatel.js), žádná mezipaměť se starým jménem nezůstane.
 *  2) ODESLANÁ (ZAMČENÁ) VARIANTA se nemění — krycí list zamčené varianty
 *     čte jméno a kontakt obchodníka ze snímku z doby zámku
 *     (kryciZmrazPodminky → data.kryci.zmrazeno), ne z dnešního účtu.
 *  3) Úprava účtu nesahá na data zakázky — otisk zamčené varianty je po
 *     změně profilu bajt po bajtu stejný.
 *
 * Pojistka proti prázdnému testu: s vypnutým zmrazením (zmrazeno = null)
 * musí krycí list ukázat NOVÉ jméno — test tím dokládá, že starý údaj
 * opravdu pochází ze snímku, ne z náhody.
 *
 * Účty jsou smyšlené (@priklad.cz).  Spuštění: node test_ue_zpracovatel.js
 */
const fs = require('fs');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
const Z = nacti('./zpracovatel.js');
const zk = nacti('./zakazka.js');
const kr = nacti('./kryci.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : info); } };
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
const pole = (id) => [].concat(...kr.KRYCI_SEKCE.map(s => s.pole)).find(p => p.id === id);
global.NAST = { firma: global.firmaDefault() };

const PRED = { email: 'obchodnik.ue@priklad.cz', titul: 'Ing.', jmeno: 'Petr Původní',
  funkce: 'Obchodní technik', telefon: '+420 000 000 111', role: 'Obchodník' };
const PO = Object.assign({}, PRED, { titul: 'Bc.', jmeno: 'Petr Opravený', funkce: 'Vedoucí obchodu',
  telefon: '+420 000 000 222' });
const prihlas = (j) => { global.ONLINE_STAV = { ja: Object.assign({}, j) }; };

const zak = zk.novaZakazka();
zak.cislo = '2026 - OPR - CN - 911';
zak.nazevAkce = 'Zkušební akce UE';
const v = zak.varianty[0];

/* 1) odeslání pod původními údaji: zámek + snímek krycího listu */
prihlas(PRED);
test('před úpravou: Vypracoval = původní titul a jméno',
  Z.zpracovatelPlaceholders().ZPRAC_JMENO === 'Ing. Petr Původní', Z.zpracovatelPlaceholders().ZPRAC_JMENO);
kr.kryciZmrazPodminky(zak, v, JEKLY);
v.zamek = { zamceno: true, kdy: '2026-11-18T08:00:00.000Z', kdo: 'Petr Původní <obchodnik.ue@priklad.cz>' };
const otiskVarianty = JSON.stringify(v);
test('snímek zámku nese jméno obchodníka', (v.data.kryci.zmrazeno || {}).obchodnik === 'Ing. Petr Původní',
  v.data.kryci.zmrazeno);

/* 2) správce upraví účet (nový profil přihlášeného) */
prihlas(PO);
const p = Z.zpracovatelPlaceholders();
test('nový tisk: Vypracoval = nový titul a jméno', p.ZPRAC_JMENO === 'Bc. Petr Opravený', p.ZPRAC_JMENO);
test('nový tisk: nová funkce', p.ZPRAC_FUNKCE === 'Vedoucí obchodu', p.ZPRAC_FUNKCE);
test('nový tisk: nový telefon', p.ZPRAC_TEL === '+420 000 000 222', p.ZPRAC_TEL);
test('nový tisk: e-mail beze změny', p.ZPRAC_EMAIL === 'obchodnik.ue@priklad.cz', p.ZPRAC_EMAIL);
test('starší šablony (FIRMA_ZPRACOVAL*) taky s novými údaji',
  p.FIRMA_ZPRACOVAL === 'Bc. Petr Opravený' && p.FIRMA_ZPRACOVAL_TEL === '+420 000 000 222', p);

/* 3) zamčená varianta drží údaje z doby odeslání */
const cZam = kr.kryciCtx(zak, v, JEKLY);
test('kontext zamčené varianty má snímek', !!cZam.zamceno && !!cZam.zmrazeno, cZam.zmrazeno);
const jmenoZam = kr.kryciHodnota(pole('obchodnik'), v.data.kryci, cZam);
test('odeslaná nabídka: krycí list dál nese původní jméno', jmenoZam === 'Ing. Petr Původní', jmenoZam);
const kontaktZam = kr.kryciHodnota(pole('dodZpracoval'), v.data.kryci, cZam);
test('odeslaná nabídka: kontakt zpracovatele (jméno, telefon) beze změny',
  /Petr Původní/.test(kontaktZam) && /000 000 111/.test(kontaktZam) && !/Opraven|000 222/.test(kontaktZam), kontaktZam);
test('úprava účtu nezměnila data zamčené varianty', JSON.stringify(v) === otiskVarianty);

/* Pojistka: bez snímku by krycí list ukázal nové jméno — snímek tedy opravdu drží. */
const cBezSnimku = Object.assign({}, cZam, { zmrazeno: null });
const jmenoBez = kr.kryciHodnota(pole('obchodnik'), v.data.kryci, cBezSnimku);
test('pojistka: bez snímku by se ukázalo nové jméno', jmenoBez === 'Bc. Petr Opravený', jmenoBez);

/* 4) nezamčená varianta (rozpracovaná nabídka) bere nové údaje */
const zak2 = zk.novaZakazka(); zak2.cislo = '2026 - OPR - CN - 912';
const v2 = zak2.varianty[0];
const c2 = kr.kryciCtx(zak2, v2, JEKLY);
test('rozpracovaná nabídka: krycí list s novým jménem',
  kr.kryciHodnota(pole('obchodnik'), (v2.data.kryci || { hodnoty: {} }), c2) === 'Bc. Petr Opravený');

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
