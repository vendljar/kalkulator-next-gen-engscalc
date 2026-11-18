/* ============================================================
 * VZ-E2 (#601) — VSTUPY TISKU Z POHLEDU ZÁKAZNÍKA (návrh § 4, R1).
 *
 * Každý vstup tisku (Word CN, CN PROJ, SoD / plná moc, krycí listy OCK
 * a PROJ, náhledy, porovnání, specifikace) musí dokument tvořit z pohledu
 * otevřeného zákazníka (vzTiskVstup → vzTiskPohled) — ne z celé zakázky
 * ZAK, ve které jsou i ostatní zákazníci.
 *   1) strukturně: tělo každé vstupní funkce volá vzTiskVstup a generátoru
 *      nepředává ZAK (mutace „[VZ E2] vynechání pohledu" zabije tady);
 *      brána dokumentZabrana ptá vzTiskZabranaUi, dokumentVygeneruj
 *      hlídá vzTiskHlidej;
 *   2) funkčně: src/ui/vz_tisk_ui.js ve VM — pohled B s písmenem, zábrana
 *      cizí varianty, vypnutá funkce, jeden zákazník = TÝŽ objekt ZAK
 *      a tlačítko specifikace s PŮVODNÍM textem (stránka bajt po bajtu).
 * Pojistka: před E2 sada padá (vstupy volají generátory se ZAK, soubor
 * ui/vz_tisk_ui.js neexistuje); vrácení kteréhokoli vt.zak na ZAK shodí 1).
 * Spuštění: cd src && node test_vz_tisk_vstupy.js
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const cti = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

/* Tělo funkce `jmeno` v textu souboru (do další funkce na začátku řádku). */
function telo(txt, jmeno) {
  const m = new RegExp('\\n(async )?function ' + jmeno + '\\(').exec(txt);
  if (!m) return null;
  const zbytek = txt.slice(m.index + 1);
  const dalsi = /\n(async )?function [A-Za-z_$]/.exec(zbytek.slice(10));
  return dalsi ? zbytek.slice(0, dalsi.index + 10) : zbytek;
}

/* ---------- 1) strukturně ---------- */
const VSTUPY = [
  ['ui/zakazka_ui.js', 'nabidkaWordGeneruj', 'Word CN OCK'],
  ['ui/zakazka_ui.js', 'nabidkaNahled', 'Kompletní náhled podkladů'],
  ['ui/zakazka_ui.js', 'nabidkaOckDokument', 'Kompletní náhled a tisk nabídky'],
  ['ui/zakazka_ui.js', 'porovnaniTisk', 'Porovnání variant (tisk)'],
  ['ui/zakazka_ui.js', 'porovnaniPolozkyTisk', 'Detail položek (tisk)'],
  ['ui/nabidka_proj_ui.js', 'nabidkaProjWordGeneruj', 'Word CN PROJ'],
  ['ui/nabidka_proj_ui.js', 'nabidkaProjNahled', 'Náhled CN PROJ'],
  ['ui/sod_ui.js', 'sodWordGeneruj', 'SoD OCK / PROJ, plná moc'],
  ['ui/kryci_ui.js', 'kryciTiskPohled', 'Krycí list OCK (tisk)'],
  ['ui/kryci_ui.js', 'kryciWord', 'Krycí list OCK (Word)'],
  ['ui/kryci_proj_ui.js', 'kryciProjTiskPohled', 'Krycí list PROJ (tisk)'],
  ['ui/kryci_proj_ui.js', 'kryciProjWord', 'Krycí list PROJ (Word)'],
  ['ui/vz_tisk_ui.js', 'vzTiskSpecifikace', 'Technická specifikace (tisk)'],
];
/* Generátor dostane celou zakázku = únik. */
const ZAKAZANE = [
  /dokumentVygeneruj\([^;]*?,\s*ZAK\s*,/, /nabidkaData\(ZAK\b/, /nabidkaProjData\(ZAK\b/, /kryciData\(ZAK\b/,
  /kryciProjData\(ZAK\b/, /kryciVystupSekce\(ZAK\b/, /porovnaniData\(\)/, /porovnaniPolozkyData\(\)/,
  /ZAK\.objednatel/, /cislo: ZAK\.cislo/, /esc\(ZAK\.cislo\)/,
];
for (const [soubor, fn, popis] of VSTUPY) {
  const t = telo(cti(soubor), fn);
  test('vstup ' + popis + ' (' + fn + ') existuje', !!t);
  if (!t) continue;
  test('vstup ' + popis + ': volá vzTiskVstup', /vzTiskVstup\(/.test(t));
  const spatne = ZAKAZANE.filter(r => r.test(t)).map(String);
  test('vstup ' + popis + ': generátor nedostane celou zakázku ZAK', !spatne.length, spatne);
}
{
  const t = telo(cti('ui/ukazkove_ui.js'), 'dokumentZabrana');
  test('brána dokumentZabrana ptá vzTiskZabranaUi', !!t && /vzTiskZabranaUi\(typ/.test(t));
  const d = telo(cti('dokumenty.js'), 'dokumentVygeneruj');
  test('dokumentVygeneruj hlídá vzTiskHlidej(zak)', !!d && /vzTiskHlidej\(zak\)/.test(d));
  const ts = cti('ui/techspec_ui.js');
  test('specifikace: obě tlačítka tisku přes vzTiskSpecOnclick', (ts.match(/vzTiskSpecOnclick\(/g) || []).length === 2);
  test('specifikace: číslo a objednatel náhledu z pohledu', /row\('ČÍSLO NABÍDKY', vzTiskCislo\(vzTiskZakTicho\(\)\)\)/.test(ts)
    && /row\('OBJEDNATEL', vzTiskZakTicho\(\)\.objednatel\)/.test(ts));
  const nk = telo(cti('ui/zakazka_ui.js'), 'nabidkaKarta');
  test('karta CN: živý náhled z pohledu a pruh', !!nk && /nabidkaData\(TZ, aktT/.test(nk) && /vzTiskPruhHtml\(\)/.test(nk));
  /* Pravidlo v katalogu kontrol záměrně NENÍ (počet pravidel nese vydaný manuál
   * — test_manual_vypocet; nové vydání je E6). Zábranu nese brána dokumentů. */
  test('U5: nevyplněná místa SoD nad pohledem otevřeného zákazníka (PROJ nad řídícím)',
    /o\.sod = sodData\(zS, vS, JEKLY,/.test(cti('ui/kontroly_ui.js')) && /o\.sodProj = sodProjData\(zP, v,/.test(cti('ui/kontroly_ui.js')));
  test('kontroly: katalog pravidel beze změny (žádné vzTisk)', !/kod: 'vzTisk'/.test(cti('kontroly.js')));
}

/* ---------- 2) funkčně: ui/vz_tisk_ui.js ve VM ---------- */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./preklad.js'); nacti('./format.js'); nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./vice_sachet.js'); nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js'); nacti('./zakazka.js'); nacti('./zamek.js'); nacti('./vice_zakazniku.js');

function prostredi(zak, otevreny, zapnuto) {
  const hlasky = [];
  const ctx = Object.assign(Object.create(null), global, {
    ZAK: zak, VZ_UI: { otevreny }, hlaska: (t) => hlasky.push(t),
    viceZakaznikuZapnuto: () => zapnuto, esc: (s) => String(s), console,
  });
  vm.createContext(ctx);
  vm.runInContext(cti('ui/vz_tisk_ui.js'), ctx, { filename: 'vz_tisk_ui.js' });
  ctx.__hlasky = hlasky;
  return ctx;
}
const zak = novaZakazka();
zak.cislo = '2026 - OPR - CN - 9940';
const A = { objednatel: 'Alfa Kanarek s.r.o.', adresaObjednatele: 'A 1', ico: '11111111', dic: '', kontakt: '' };
VZ_HLAVICKA_POLE.forEach(k => { zak[k] = A[k]; });
const jedenJson = JSON.stringify(zak);
{
  const c = prostredi(zak, '', true);
  const v = aktivniVarianta(zak);
  const r = c.vzTiskVstup('nabidka', v);
  test('jeden zákazník: vzTiskVstup vrací TÝŽ objekt ZAK a TUTÉŽ variantu', r && r.zak === zak && r.varianta === v);
  test('jeden zákazník: tlačítko specifikace s původním textem (bajt po bajtu)',
    c.vzTiskSpecOnclick('jazyk()') === "tiskSNazvem(nazevExportu('specifikace', { cislo: ZAK.cislo, jazyk: jazyk() }))"
    && c.vzTiskSpecOnclick("'cz'") === "tiskSNazvem(nazevExportu('specifikace', { cislo: ZAK.cislo, jazyk: 'cz' }))");
  test('jeden zákazník: žádný pruh, zakázka beze změny', c.vzTiskPruhHtml() === '' && JSON.stringify(zak) === jedenJson);
}
const rB = vzPridej(zak, { objednatel: 'Beta Kanarek a.s.', adresaObjednatele: 'B 2', ico: '22222222', dic: '', kontakt: '' }, { kdo: 't@priklad.cz', kdy: '2026-11-16T10:00:00Z' });
const rC = vzPridej(zak, { objednatel: 'Gama Kanarek s.r.o.', adresaObjednatele: 'C 3', ico: '33333333', dic: '', kontakt: '' }, { vlastni: true, kdo: 't@priklad.cz', kdy: '2026-11-16T10:00:00Z' });
test('příprava: B (sdílená) a C (vlastní varianta) přidáni', rB.ok && rC.ok && rC.zakaznik.varianta !== rB.zakaznik.varianta);
const vA = zak.varianty.find(v => String(v.id) === rB.zakaznik.varianta);
const vC = zak.varianty.find(v => String(v.id) === rC.zakaznik.varianta);
{
  const c = prostredi(zak, rB.zakaznik.id, true);
  const r = c.vzTiskVstup('nabidka', vA);
  test('B: pohled s hlavičkou B, bez ostatních zákazníků', r && r.zak !== zak && r.zak.objednatel === 'Beta Kanarek a.s.'
    && !r.zak.dalsiZakaznici && !r.zak.vzRidici && !/Alfa Kanarek|Gama Kanarek|11111111|33333333/.test(JSON.stringify(r.zak)));
  test('B: varianta z pohledu (kopie s odvozeným zákazníkem), číslo …9940-B',
    r && r.varianta && r.varianta.id === vA.id && r.varianta !== vA && r.varianta.zakaznik === 'Beta Kanarek a.s.'
    && cisloSVariantou(r.zak, r.varianta) === '2026 - OPR - CN - 9940-B');
  test('B: varianta C (cizí vlastní) → dokument nevznikne s hláškou', c.vzTiskVstup('nabidka', vC) === null && c.__hlasky.length === 1);
  test('B: PROJ (R5) → nevznikne', c.vzTiskVstup('nabidkaProj', vA) === null);
  test('B: pruh „Náhled a tisk platí pro zákazníka Beta … — nabídka …-B"',
    /Náhled a tisk platí pro zákazníka Beta Kanarek a\.s\. — nabídka 2026 - OPR - CN - 9940-B/.test(c.vzTiskPruhHtml()));
  test('B: jiný zákazník otevřený', c.vzTiskJinyZakaznik() === true);
  test('B: tlačítko specifikace přes vzTiskSpecifikace', c.vzTiskSpecOnclick("'cz'") === "vzTiskSpecifikace('cz')");
}
{
  const c = prostredi(zak, rB.zakaznik.id, false);
  test('funkce vypnutá: pro B nevznikne', c.vzTiskVstup('nabidka', vA) === null && /vypnutá/.test(c.__hlasky[0] || ''));
  const c2 = prostredi(zak, '', false);
  const r = c2.vzTiskVstup('nabidka', vA);
  test('funkce vypnutá: pro řídícího projde (jeho hlavička, bez písmene)', r && r.zak.objednatel === 'Alfa Kanarek s.r.o.'
    && cisloSVariantou(r.zak, r.varianta) === '2026 - OPR - CN - 9940' && !c2.vzTiskJinyZakaznik());
}
{
  const c = prostredi(zak, rC.zakaznik.id, true);
  const r = c.vzTiskVstup('porovnani');
  test('C: porovnání jen z jeho variant', r && r.zak.varianty.length === 1 && r.zak.varianty[0].id === vC.id);
  zak.nazevAkce = 'Výtah pro Beta Kanarek';
  test('název akce jmenuje B → tisk pro C zastaven', c.vzTiskVstup('nabidka', vC) === null && /Název akce/.test(c.__hlasky.slice(-1)[0] || ''));
  test('… a pro B projde (vlastní název se nepočítá)', !!prostredi(zak, rB.zakaznik.id, true).vzTiskVstup('nabidka', vA));
  zak.nazevAkce = '';
}

{
  let hodila = false;
  try { vzTiskHlidej(zak); } catch (e) { hodila = /pohledu/.test(e.message); }
  test('vzTiskHlidej: celá zakázka s víc zákazníky → chyba', hodila);
  let pohled = true;
  try { vzTiskHlidej(vzTiskPohled(zak, rB.zakaznik.id)); vzTiskHlidej(JSON.parse(jedenJson)); } catch (e) { pohled = false; }
  test('vzTiskHlidej: pohled i zakázka s jedním zákazníkem projdou', pohled);
  /* Razítko tisku s adresátem (E3): varianta, která B už odešla, je jeho. */
  vC.zamek = { zamceno: true, tisky: [{ kdy: '2026-11-16T11:00:00Z', zakaznik: { id: rB.zakaznik.id, pismeno: 'B' } }] };
  test('razítko tisku: odeslaná varianta patří B (smí ji tisknout)',
    vzVariantyZakaznika(zak, rB.zakaznik.id).indexOf(String(vC.id)) >= 0
    && vzTiskZabrana(zak, rB.zakaznik.id, vC, 'nabidka', {}) === '');
  delete vC.zamek;
  test('… bez razítka ne', vzTiskZabrana(zak, rB.zakaznik.id, vC, 'nabidka', {}) !== '');
  /* Řídící: varianty, které nejsou nabídkou dalšího zákazníka (revize E0 N3). */
  const volna = klonujVariantu(zak, vA.id, { aktivovat: false });
  test('řídící smí tisknout volnou variantu (ničí nabídka)', !!volna && vzTiskZabrana(zak, '', volna, 'nabidka', {}) === '');
  test('řídící NEsmí tisknout vlastní variantu C', /není nabídka zákazníka/.test(vzTiskZabrana(zak, '', vC, 'nabidka', {})));
  test('B NEsmí tisknout volnou variantu', vzTiskZabrana(zak, rB.zakaznik.id, volna, 'nabidka', {}) !== '');
  volna.zakaznik = 'Gama Kanarek s.r.o.';
  test('řídící: volná varianta s cizím v.zakaznik → v pohledu jeho název', (() => { const p = vzTiskPohled(zak, '');
    const x = p.varianty.find(v => v.id === volna.id); return x !== volna && x.zakaznik === 'Alfa Kanarek s.r.o.'
      && p.varianty.find(v => v.id === vA.id) === vA; })());
  volna.nazev = 'Varianta pro Gama Kanarek';
  test('porovnání řídícího: cizí název volné varianty → zastaveno', /Název varianty/.test(vzTiskZabrana(zak, '', null, 'porovnani', {})));
  volna.nazev = 'Varianta 4';
  test('porovnání řídícího bez cizích názvů projde', vzTiskZabrana(zak, '', null, 'porovnani', {}) === '');
  test('tiskový pohled řídícího: bez varianty C, s volnou', (() => { const p = vzTiskPohled(zak, ''); const ids = p.varianty.map(v => v.id);
    return ids.indexOf(vC.id) < 0 && ids.indexOf(volna.id) >= 0 && ids.indexOf(vA.id) >= 0; })());
}

/* Textová shoda cizího zákazníka (B224). */
{
  const ja = { id: 'z2', hlavicka: { objednatel: 'ALFA BETA s.r.o.', ico: '' } };
  const cizi = [{ id: 'z1', hlavicka: { objednatel: 'BETA a.s.', ico: '33333333' } }];
  test('vlastní název obsahující cizí („ALFA BETA" × „BETA") se nepočítá', vzTextCizi('Výtah pro ALFA BETA s.r.o.', ja, cizi) === null);
  test('… cizí název mimo vlastní se pozná', !!vzTextCizi('Výtah pro ALFA BETA a sousední BETA', ja, cizi));
  test('IČO cizího zákazníka v textu (i s mezerami) se pozná', !!vzTextCizi('Investor IČO 333 333 33', ja, cizi)
    && !!vzTextCizi('IČO: 33333333.', ja, cizi));
  test('jiné číslo IČO nepozná (delší řada)', vzTextCizi('č. 333333331', ja, cizi) === null);
  zak.popisZameru = 'Investor IČO 33333333';
  test('IČO zákazníka C v popisu záměru → tisk pro B zastaven', /Popis záměru/.test(vzTiskZabrana(zak, rB.zakaznik.id, vA, 'nabidka', {})));
  zak.popisZameru = '';
}

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
if (fail) process.exit(1);
