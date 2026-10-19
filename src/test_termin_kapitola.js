/* ZNAČKA {TERMIN} V KAPITOLE V. NABÍDKY (dávka O3 / TD1, 19. 10. 2026)
 *
 * J. V.: „TD1 vymysli, jak zohlednit". Od #330 dává nabídka termín dodání
 * zakázky (s ATYP +4 týdny) jako první odrážku kapitoly V., ale výchozí text
 * kapitoly říkal pevné „cca 12 týdnů" — a O3 ho doplňuje do produkce. Atypická
 * zakázka by nesla 12 i 16 týdnů. Výchozí text teď nese značku {TERMIN},
 * za kterou se dosadí termín dodání zakázky; samostatná odrážka pak odpadá.
 *
 * Zkouší se běžná zakázka i ATYP, CZ/EN/DE/FR, ruční přepis termínu,
 * prázdný termín (lhůta z Firmy, jinak „dle dohody"), Word {{NAB_KAP_TERMINY}}
 * a symboly firmaPlaceholders mimo zakázku. Značka nesmí zůstat vidět.
 *
 * ŽÁDNÉ CENY. Spuštění: cd src && node test_termin_kapitola.js */
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
global.vypocet = eng.vypocet; global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI;
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const ep = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const tsm = require('./techspec.js');
global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
const zk = require('./zakazka.js'); Object.keys(zk).forEach(k => { global[k] = zk[k]; });
const fm = require('./firma.js'); Object.keys(fm).forEach(k => { global[k] = fm[k]; });
const kr = require('./kryci.js'); Object.keys(kr).forEach(k => { global[k] = kr[k]; });
const P = require('./preklad.js'); global.tr = P.tr;
const N = require('./nabidka.js');
const fs = require('fs');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* Firma s výchozími texty (ty od O3 nesou {TERMIN}) a standardní lhůtou. */
function nahled(jazyk, upravFirmu, upravVariantu) {
  const puv = global.NAST;
  const f = Object.assign({}, fm.DEFAULT_FIRMA, { nazev: 'Zkušební firma s.r.o.',
    terminDodaniOck: 'cca 12 týdnů', terminAtypTydny: '4' });
  if (upravFirmu) upravFirmu(f);
  global.NAST = { firma: f };
  const zak = zk.novaZakazka();
  const v = zak.varianty[0];
  v.data.cenik = ZC.zkusebniCenik();
  if (upravVariantu) upravVariantu(v);
  const d = N.nabidkaData(zak, v, JEKLY, jazyk);
  const s = N.nabidkaNahledSekce(d.placeholders, jazyk);
  global.NAST = puv;
  const kapV = (s.find(x => s.indexOf(x) >= 0 && x.radky.some(r => /montáž|Installation|Montage|montage/i.test(String(r[0])))
    && /^V\.|TERM|DEADLINE|TERMIN|DÉLAI|SCHEDULE|ZEIT/i.test(String(x.sekce))) || { radky: [] }).radky;
  return { ph: d.placeholders, sekce: s, kapV, text: s.map(x => x.radky.map(r => r.join(' ')).join('\n')).join('\n') };
}
const atyp = v => { v.data.ock.zadani.atyp = true; };
const vsechnyHodnoty = ph => Object.keys(ph).map(k => String(ph[k] == null ? '' : ph[k])).join('\n');

// ---- 1. výchozí texty --------------------------------------------------------
['', 'En', 'De'].forEach(suf => {
  const t = fm.DEFAULT_FIRMA['kapTerminy' + suf];
  test('výchozí kapTerminy' + suf + ' nese {TERMIN} a ne pevné 12', /\{TERMIN\}/.test(t) && !/\b12\b/.test(t), t.split('\n')[0]);
});
test('FR výchozí text nemá', fm.DEFAULT_FIRMA.kapTerminyFr === undefined || fm.DEFAULT_FIRMA.kapTerminyFr === '');

// ---- 2. běžná zakázka CZ --------------------------------------------------------
{
  const n = nahled('cz');
  test('CZ běžná: věta nese termín ze zakázky', n.kapV[0] && /^Zahájení montáže cca 12 týdnů po podpisu SoD/.test(n.kapV[0][0].hotovo || n.kapV[0][0]), n.kapV[0]);
  test('CZ běžná: žádná samostatná odrážka „Termín dodání"', !n.kapV.some(r => r[0] === 'Termín dodání'), n.kapV.map(r => r[0]));
  test('CZ běžná: příznak pro Word', n.ph.FIRMA_NAB_TERMINY_TERMIN === '1');
  test('příznak jen u kapitoly V.', ['POZADAVKY', 'PREDANI', 'DOLOZKY'].every(k => n.ph['FIRMA_NAB_' + k + '_TERMIN'] === undefined));
  const w = String(n.ph.NAB_KAP_TERMINY).split('\n');
  test('Word {{NAB_KAP_TERMINY}}: první řádek je věta s termínem, ne „Termín dodání:"',
    /^Zahájení montáže cca 12 týdnů po/.test(w[0]) && !w.some(r => /^Termín dodání:/.test(r)), w[0]);
  test('Word {{FIRMA_NAB_TERMINY}} má termín dosazený', /cca 12 týdnů po podpisu/.test(n.ph.FIRMA_NAB_TERMINY));
  test('značka nikde nezůstala (CZ)', !/\{TERMIN\}/.test(vsechnyHodnoty(n.ph)) && !/\{TERMIN\}/.test(n.text));
}

// ---- 3. ATYP CZ/EN/DE/FR ------------------------------------------------------------
{
  const n = nahled('cz', null, atyp);
  const prvni = String((n.kapV[0] || [])[0] && (n.kapV[0][0].hotovo || n.kapV[0][0]));
  test('CZ ATYP: věta nese prodloužený termín', /^Zahájení montáže cca 16 týdnů \(vč\. 4 týdnů za ATYP\) po podpisu/.test(prvni), prvni);
  test('CZ ATYP: v kapitole V. není 12 týdnů ani dvojí termín', !/12 týdnů/.test(n.kapV.map(r => String(r[0].hotovo || r[0]) + r[1]).join('\n'))
    && !n.kapV.some(r => r[0] === 'Termín dodání'));
  [['en', /^Installation will start approx\. 16 weeks \(incl\. 4 weeks for the non-standard design\) from contract signature/],
   ['de', /^Die Installation beginnt ca\. 16 Wochen \(inkl\. 4 Wochen für die Sonderausführung\) nach Vertragsunterzeichnung/]]
    .forEach(([jaz, re]) => {
      const m = nahled(jaz, null, atyp);
      const w0 = String(m.ph.NAB_KAP_TERMINY).split('\n')[0];
      test(jaz + ' ATYP: Word věta s přeloženým termínem', re.test(w0), w0);
      test(jaz + ' ATYP: náhled bez samostatné odrážky termínu',
        !m.sekce.some(x => x.radky.some(r => /^(Delivery time|Lieferzeit)$/.test(r[0]))));
      test(jaz + ' ATYP: značka nikde nezůstala', !/\{TERMIN\}/.test(vsechnyHodnoty(m.ph)) && !/\{TERMIN\}/.test(m.text));
    });
  const fr = nahled('fr', null, atyp);
  test('FR bez vlastního znění: česká věta s ČESKÝM termínem (+ upozornění)',
    /Zahájení montáže cca 16 týdnů \(vč\. 4 týdnů za ATYP\) po podpisu/.test(fr.ph.FIRMA_NAB_TERMINY) && fr.ph.FIRMA_NAB_TERMINY_CHYBI === '1',
    String(fr.ph.FIRMA_NAB_TERMINY).split('\n')[0]);
  const fr2 = nahled('fr', f => { f.kapTerminyFr = 'Le montage commencera {TERMIN} après la signature du contrat.'; }, atyp);
  test('FR s vlastním zněním: francouzský termín', /^Le montage commencera env\. 16 semaines \(dont 4 semaines pour l.exécution spéciale\) après/.test(fr2.ph.FIRMA_NAB_TERMINY),
    fr2.ph.FIRMA_NAB_TERMINY);
}

// ---- 4. ruční přepis a prázdný termín ---------------------------------------------
{
  const n = nahled('cz', null, v => { v.data.kryci = { hodnoty: { terminDodani: '20' } }; });
  test('ruční přepis v krycím listu („20" → „20 týdnů") jde do věty', /^Zahájení montáže 20 týdnů po podpisu/.test(n.ph.FIRMA_NAB_TERMINY), n.ph.FIRMA_NAB_TERMINY.split('\n')[0]);
  const bez = nahled('cz', f => { f.terminDodaniOck = ''; });
  test('bez termínu i lhůty: „dle dohody", žádná značka', /^Zahájení montáže dle dohody po podpisu/.test(bez.ph.FIRMA_NAB_TERMINY)
    && !/\{TERMIN\}/.test(vsechnyHodnoty(bez.ph)), bez.ph.FIRMA_NAB_TERMINY.split('\n')[0]);
  const bezEn = nahled('en', f => { f.terminDodaniOck = ''; });
  test('bez termínu EN: „as agreed"', /^Installation will start as agreed from/.test(bezEn.ph.FIRMA_NAB_TERMINY), bezEn.ph.FIRMA_NAB_TERMINY.split('\n')[0]);
  const smazany = nahled('cz', null, v => { v.data.ock.zadani.atyp = true; });
  test('kontrolní: ATYP termín z krycího listu', /16 týdnů/.test(smazany.ph.PODM_TERMIN_DODANI));
}

// ---- 5. starý text bez značky — chování beze změny -----------------------------
{
  const n = nahled('cz', f => { f.kapTerminy = 'Zahájení montáže cca 12 týdnů po podpisu SoD.'; }, atyp);
  test('starý text: odrážka „Termín dodání" zůstává první', n.kapV[0] && n.kapV[0][0] === 'Termín dodání', n.kapV[0]);
  test('starý text: Word začíná „Termín dodání:"', /^Termín dodání: cca 16 týdnů/.test(String(n.ph.NAB_KAP_TERMINY)));
  test('starý text: bez příznaku', n.ph.FIRMA_NAB_TERMINY_TERMIN === '');
}

// ---- 6. symboly firmy mimo zakázku a funkce firmy ---------------------------
{
  const f = Object.assign(fm.firmaDefault(), { terminDodaniOck: '12' });
  test('firmaPlaceholders: lhůta z Firmy s jednotkou', /^Zahájení montáže 12 týdnů po/.test(fm.firmaPlaceholders(f).FIRMA_NAB_TERMINY));
  test('firmaPlaceholders EN: přeloženo', /^Installation will start 12 weeks from/.test(fm.firmaPlaceholders(f).FIRMA_NAB_TERMINY_EN));
  test('firmaPlaceholders bez lhůty: „dle dohody"',
    /dle dohody/.test(fm.firmaPlaceholders(fm.firmaDefault()).FIRMA_NAB_TERMINY) && !/\{TERMIN\}/.test(JSON.stringify(fm.firmaPlaceholders(fm.firmaDefault()))));
  test('firmaKapitola: příznak termin', fm.firmaKapitola(f, 'kapTerminy', 'cz').termin === true
    && fm.firmaKapitola(f, 'kapPredani', 'cz').termin === false);
  test('firmaKapitola: vlastní termín má přednost', /^Zahájení montáže X týdnů po/.test(fm.firmaKapitola(f, 'kapTerminy', 'cz', 'X týdnů').radky[0]));
  test('firmaKapitola: prázdný vlastní termín → záloha', /^Zahájení montáže 12 týdnů po/.test(fm.firmaKapitola(f, 'kapTerminy', 'cz', () => '  ').radky[0]));
  test('firmaKapitola: vymazaná kapitola nemá příznak termin', fm.firmaKapitola({ kapTerminy: '' }, 'kapTerminy', 'cz').termin === false);
  test('firmaTerminZaloha DE', fm.firmaTerminZaloha({}, 'de') === 'nach Vereinbarung' && fm.FIRMA_KAP_TERMIN === '{TERMIN}');
  test('značka víckrát v řádku se nahradí celá', fm.firmaKapitola({ kapTerminy: '{TERMIN} / {TERMIN}' }, 'kapTerminy', 'cz', 'A').radky[0] === 'A / A');
}

// ---- 7. nápověda ve Firmě a příručka ---------------------------------------------
{
  const ui = fs.readFileSync(__dirname + '/ui/nastaveni_ui.js', 'utf8');
  test('nápověda u kapitol zmiňuje {TERMIN}', /<code>\{TERMIN\}<\/code>/.test(ui));
  const man = fs.readFileSync(__dirname + '/../manual/obsah.json', 'utf8');
  test('příručka zmiňuje {TERMIN}', /\{TERMIN\}/.test(man));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
