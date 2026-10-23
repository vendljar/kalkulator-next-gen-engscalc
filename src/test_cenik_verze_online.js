/* VERZE CENÍKU V RAZÍTKU VARIANTY V ONLINE REŽIMU (#505, 22. 10. 2026)
 *
 * Nález koordinace nad ostrým hromadným exportem J. V. (19.–22. 10.):
 * sloupec „Verze ceníku" prázdný u všech 1 690 řádků / 56 nabídek, otisk
 * vyplněný. Příčina: progPlatnaVerzeInfo() znala jen databázi programu ve
 * složce; online byla null, takže otevření zakázky (uloSrovnejSPlatnymCenikem
 * → cenikPrepoctiRozpracovane) přerazítkovalo variantu verzí null hned po
 * tom, co progPouzij(ONLINE_STAV.db.platny) zapsal správné číslo.
 *
 * Sada načte skutečné ui/program_ui.js a ui/cenik_stari_ui.js do jednoho
 * kontextu s jádrem (jako je slepí build.py) a projde online tok:
 * nasazení online ceníku → otevření zakázky → razítko. Před opravou
 * 4 / 8 prošlo (po nasazení i po otevření verze null), po opravě 8 / 8;
 * ostatní kontroly hlídají, že se nic jiného nezměnilo (zamčená varianta,
 * návrat k ceníku ze sestavení, přednost složky). */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 300)); }
};

const ctx = vm.createContext({ console, setTimeout, clearTimeout, Date, JSON, Math, Intl });
const nacti = (f) => vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f });
['format.js', 'cenik.js', 'konfigurace.js', 'engine.js', 'engine_proj.js', 'techspec.js', 'zakazka.js', 'uloziste.js',
  'zamek.js', 'cenik_stari.js', 'cenik_rady.js', 'ui/cenik_stari_ui.js', 'ui/program_ui.js'].forEach(nacti);
const G = (x) => vm.runInContext(x, ctx);

/* Online ceník verze 7 = ceník ze sestavení (shodné ceny → jen razítko). */
G(`var PLATNY = { verze: 7, platnoOd: '2026-10-01', cenik: JSON.parse(JSON.stringify(DEFAULT_CENIK)),
  cenikProj: JSON.parse(JSON.stringify(DEFAULT_CENIK_PROJ)) };
  var ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 0505'; ZAK.nazevAkce = 'Akce 505';
  var syncVarianta = function () {};`);
const verze = (i) => G(`(ZAK.varianty[${i}].data.cenikRazitko || {}).verze`);
const otevri = () => G(`cenikPrepoctiRozpracovane(ZAK, cenikDnesniData(), Object.assign({ build: '' }, progPlatnaVerzeInfo()))`);

/* onlineTik: přihlášení nasadí online ceník (složka nevládne). */
G('progPouzij(PLATNY)');
test('#505: po nasazení online ceníku platí jeho verze (ne null)',
  G('progPlatnaVerzeInfo().verze') === 7 && G('cenikPlatnaVerzeInfo().verze') === 7, G('progPlatnaVerzeInfo()'));
test('#505: progPouzij orazítkuje otevřenou zakázku verzí online ceníku', verze(0) === 7, verze(0));
/* uloSrovnejSPlatnymCenikem při otevření zakázky — před opravou tady verze zmizela. */
otevri();
test('#505: otevření zakázky v online režimu verzi v razítku zachová', verze(0) === 7, verze(0));

/* Zakázka orazítkovaná před opravou (verze null) dostane při otevření číslo platné verze. */
G(`ZAK.varianty[0].data.cenikRazitko.verze = null;`);
otevri();
test('#505: rozpracovaná varianta s prázdnou verzí dostane při otevření platnou verzi', verze(0) === 7, verze(0));

/* Zamčená varianta se nemění — zmrazené razítko zůstává i s prázdnou verzí (zpětně se nedoplňuje). */
G(`var V2 = JSON.parse(JSON.stringify(ZAK.varianty[0])); V2.id = 'v-zamcena'; V2.ridici = false;
  V2.data.cenikRazitko.verze = null; zamkniVariantu(V2, { cislo: 'X', kdo: 'admin@priklad.cz', typ: 'nabidka' });
  ZAK.varianty.push(V2);`);
otevri();
test('#505: zamčená varianta s prázdnou verzí zůstane beze změny', verze(1) === null && verze(0) === 7, [verze(0), verze(1)]);

/* Návrat k ceníku ze sestavení: verze se maže jako dřív (#39). */
G('progZpetNaBuild()');
test('#505: po návratu k ceníku ze sestavení žádná platná verze a razítko bez verze',
  G('progPlatnaVerzeInfo().verze') === null && verze(0) === null && verze(1) === null, [G('progPlatnaVerzeInfo()'), verze(0)]);

/* Složka, když vládne, má přednost (beze změny proti #39). */
G(`PROG_STAV.db = { platny: { verze: 3, platnoOd: '2026-09-01', cenik: PLATNY.cenik, cenikProj: PLATNY.cenikProj } };
  PROG_STAV.pouzita = { verze: 7, platnoOd: '' };`);
test('#505: vládne-li databáze ve složce, platí její verze', G('progPlatnaVerzeInfo().verze') === 3);

/* Otevření zakázky i přehled ceníku berou verzi z téhož jediného místa. */
const uui = fs.readFileSync(path.join(__dirname, 'ui/uloziste_ui.js'), 'utf8');
test('#505: uloSrovnejSPlatnymCenikem čte platnou verzi z progPlatnaVerzeInfo',
  /function uloSrovnejSPlatnymCenikem\(\)[\s\S]{0,400}progPlatnaVerzeInfo\(\)/.test(uui));

/* K7-S10 (#508, J. V. 23. 10. 2026: „ponechat, ale potřebuji, aby se verze následně propisovala
 * do exportu"): rozpracovaná varianta s platnou verzí online ceníku se zamkne (odeslání nabídky)
 * a export pro controlling — jedna varianta i hromadný — nese sloupec „Verze ceníku" vyplněný.
 * Ověřeno nad současným kódem (#505 to už dělá): 2 / 2. */
nacti('controlling.js');
G('PROG_STAV.db = null; progPouzij(PLATNY)'); otevri();   // zpět do online režimu (bloky výš přepnuly na složku)
G(`var JEKLY_T = ${JSON.stringify(require('./jekly.json'))};
  var V3 = JSON.parse(JSON.stringify(ZAK.varianty[0])); V3.id = 'v-k7s10'; V3.ridici = false; ZAK.varianty.push(V3);
  Object.assign(V3.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2 });
  zamkniVariantu(V3, { cislo: 'Y', kdo: 'admin@priklad.cz', typ: 'nabidka', vysledek: zamekVysledekSpocti(V3, JEKLY_T, 'test') });`);
test('K7-S10: zamčená varianta drží verzi online ceníku v razítku', G(`(V3.data.cenikRazitko || {}).verze`) === 7);
const exp = G(`(() => { const e = ctrlExportVarianty(ZAK, V3, { jekly: JEKLY_T, povolitNeridici: true });
  const l = e.ok ? ctrlExportListy([e], null, {}) : [];
  const r = (l.find(x => x.nazev === 'Řádky') || { rows: [[]] }).rows;
  const i = r[0].indexOf('Verze ceníku');
  return { ok: e.ok, hl: e.ok ? e.hlavicka.cenikVerze : null, bunka: i >= 0 && r[1] ? r[1][i] : undefined, chyba: e.chyba }; })()`);
test('K7-S10: export (hlavička i sloupec „Verze ceníku" listu Řádky) nese verzi 7', exp.ok && exp.hl === '7' && String(exp.bunka) === '7', exp);

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
