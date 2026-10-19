/* VÝCHOZÍ TEXTY KAPITOL NABÍDKY SE DOPLNÍ PŘI NAČTENÍ FIRMY
 * (dávka O3, 19. 10. 2026, v19.10.3 — zadání J. V. „Doplň výchozí texty
 * do Nastavení rovnou.")
 *
 * V produkci byly v Nastavení → Firma české kapitoly IV.–VI. a doložky
 * prázdné, ač DEFAULT_FIRMA texty má: konfigNahradVMiste() kopíruje
 * uloženou firmu celou a výchozí texty zmizí. Nabídka kapitoly vypouštěla.
 *
 * Příčina (rozbor V8): uložená firma je z doby před #282 a klíče kapitol
 * vůbec nemá. Doplňují se jen CHYBĚJÍCÍ klíče (bílá listina CZ/EN/DE, FR
 * ne); prázdný řetězec = vědomé vypuštění a zůstává. Zkouší se i ruční
 * tlačítka (vše prázdné / jedno pole), načtení přes konfiguraceImport /
 * nastdbPouzij, zveřejnění (firmaKZverejneni, firmaLzeZverejnit) a napojení
 * v UI (online_ui, nastaveni_ui).
 *
 * Údaje firmy jsou smyšlené, žádné ceny.
 * Spuštění: cd src && node test_kapitoly_vychozi.js */
const fs = require('fs');
const P = require('./preklad.js');
global.tr = P.tr; global.prekladImport = P.prekladImport; global.prekladExport = P.prekladExport;
global.PREKLAD = P.PREKLAD; global.PREKLAD_IDX = P.PREKLAD_IDX;
const F = require('./firma.js'); Object.keys(F).forEach(k => { global[k] = F[k]; });
const K = require('./konfigurace.js'); Object.keys(K).forEach(k => { global[k] = K[k]; });
const DB = require('./nastaveni_db.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const KAP = ['kapPozadavky', 'kapTerminy', 'kapPredani', 'dolozky'];
const JAZ = ['', 'En', 'De'];
const D = F.DEFAULT_FIRMA;

/* Firma tak, jak leží v produkci: skutečné (smyšlené) údaje z doby před
 * #282 — klíče kapitol vůbec nejsou. */
function produkcniFirma() {
  return { nazev: 'Zkušební stavby s.r.o.', ico: '123 45 678', sidloUlice: 'Testovací 1',
    sidloPsc: '100 00', sidloMesto: 'Praha', telefon: '+420 000 000 000', email: 'info@example.cz',
    zpracovatel: 'Jan Zkušební' };
}

// ---- 1. doplnění chybějících klíčů při načtení ---------------------------------
{
  const f = produkcniFirma();
  const dopl = F.firmaDoplnVychoziTexty(f, false);
  KAP.forEach(b => JAZ.forEach(s => test('doplněno ' + b + s, f[b + s] === D[b + s] && D[b + s].trim().length > 0)));
  test('vrací všech 12 doplněných klíčů (CZ/EN/DE × 4)', dopl.length === 12, dopl);
  test('bílá listina = 12 klíčů CZ/EN/DE', F.FIRMA_KAP_VYCHOZI_KLICE.length === 12
    && F.FIRMA_KAP_VYCHOZI_KLICE.every(k => /^(kapPozadavky|kapTerminy|kapPredani|dolozky)(En|De)?$/.test(k)));
  test('FR se nedoplňuje (nemá výchozí text)', KAP.every(b => f[b + 'Fr'] === undefined));
  test('identifikace firmy se nemění (žádné ukázkové údaje)',
    f.nazev === 'Zkušební stavby s.r.o.' && f.ico === '123 45 678' && f.ukazkove === undefined && f.dic === undefined
    && f.web === undefined && f.banka === undefined);
  test('česká kontrola už nehlásí prázdné kapitoly', F.firmaKapitolyPrazdne(f, 'cz').length === 0);
  test('druhé volání nic nemění', F.firmaDoplnVychoziTexty(f, false).length === 0);
  const n = Object.assign(produkcniFirma(), { kapTerminy: null });
  test('null se bere jako chybějící', F.firmaDoplnVychoziTexty(n, false).indexOf('kapTerminy') >= 0 && n.kapTerminy === D.kapTerminy);
}

// ---- 2. prázdný řetězec = vědomé vypuštění; vlastní texty ----------------------
{
  const f = Object.assign(produkcniFirma(), { kapPredani: '', kapPredaniEn: '  \n ', kapTerminyDe: 'Eigener Text' });
  const dopl = F.firmaDoplnVychoziTexty(f, false);
  test('prázdný řetězec zůstává (vědomé vypuštění)', f.kapPredani === '' && f.kapPredaniEn === '  \n ');
  test('vlastní text zůstává', f.kapTerminyDe === 'Eigener Text');
  test('doplněno jen 9 chybějících', dopl.length === 9 && dopl.indexOf('kapPredani') < 0, dopl);
  test('vymazaná kapitola se v nabídce vypustí (prázdné řádky)', F.firmaKapitola(f, 'kapPredani', 'cz').radky.length === 0);
  test('vymazaná česká kapitola se dál hlásí kontrolou (K9-N32)',
    F.firmaKapitolyPrazdne(f, 'cz').some(x => x.base === 'kapPredani'));
  test('prázdná FR dál bere češtinu s upozorněním', F.firmaKapitola(f, 'kapPozadavky', 'fr').jazykChybi
    && F.firmaKapitola(f, 'kapPozadavky', 'fr').radky.length > 0);
}

// ---- 3. tlačítka: „Doplnit všechny prázdné" a „Doplnit výchozí text" ------------
{
  const f = Object.assign(produkcniFirma(), { kapPredani: '', kapPredaniEn: ' ', kapTerminyDe: 'Eigener Text', kapPozadavkyFr: '' });
  const dopl = F.firmaDoplnVychoziTexty(f, true);
  test('vše prázdné: doplní i prázdná pole', f.kapPredani === D.kapPredani && f.kapPredaniEn === D.kapPredaniEn);
  test('vše prázdné: vlastní text nepřepíše', f.kapTerminyDe === 'Eigener Text');
  test('vše prázdné: FR nechá', f.kapPozadavkyFr === '');
  test('vše prázdné: vrací 11 klíčů', dopl.length === 11, dopl);
  test('vše prázdné podruhé nic', F.firmaDoplnVychoziTexty(f, true).length === 0);
  test('jedno pole: přepíše vlastní text', F.firmaDoplnVychoziText(f, 'kapTerminyDe') === true && f.kapTerminyDe === D.kapTerminyDe);
  test('jedno pole: podruhé false', F.firmaDoplnVychoziText(f, 'kapTerminyDe') === false);
  test('jedno pole: mimo bílou listinu nic (FR, identifikace)',
    F.firmaDoplnVychoziText(f, 'kapPozadavkyFr') === false && F.firmaDoplnVychoziText(f, 'nazev') === false
    && f.nazev === 'Zkušební stavby s.r.o.');
  test('nesmyslný vstup', F.firmaDoplnVychoziTexty(null).length === 0 && F.firmaDoplnVychoziTexty('x', true).length === 0
    && F.firmaDoplnVychoziText(null, 'kapTerminy') === false);
}

// ---- 4. načtení ze složky / importu konfigurace ----------------------------
{
  const NAST = { firma: { nazev: 'Stará' }, jazyk: 'cz' };
  const data = { aplikace: 'Kalkulátor OCK', verze: K.KONFIG_VERZE, nastaveni: { firma: produkcniFirma() } };
  data.nastaveni.firma.dolozky = '';
  const v = K.konfiguraceImport(data, { NAST }, { nastaveni: true });
  test('import: chybějící kapitoly doplněné', NAST.firma.kapPozadavky === D.kapPozadavky && NAST.firma.kapTerminy === D.kapTerminy);
  test('import: prázdné „" zůstává', NAST.firma.dolozky === '');
  test('import: skutečné údaje převzaté, ukázkové nepřidané', NAST.firma.nazev === 'Zkušební stavby s.r.o.' && NAST.firma.ukazkove === undefined);
  test('import: varování říká, co se doplnilo', v.varovani.some(x => /kapitol nabídky/.test(x) && /kapPozadavky/.test(x)), v.varovani);
  test('zdrojová data importu se nemění', data.nastaveni.firma.kapPozadavky === undefined);

  const NAST2 = { firma: {} };
  DB.nastdbPouzij({ aplikace: 'Kalkulátor OCK', nastaveni: { firma: { nazev: 'Ze složky s.r.o.' } } }, { NAST: NAST2 });
  test('_nastaveni.json (nastdbPouzij): kapitoly doplněné', KAP.every(b => NAST2.firma[b] === D[b]));

  const NAST3 = { firma: {} };
  const uplna = produkcniFirma(); F.firmaDoplnVychoziTexty(uplna, false);
  const v3 = K.konfiguraceImport({ aplikace: 'Kalkulátor OCK', verze: K.KONFIG_VERZE, nastaveni: { firma: uplna } },
    { NAST: NAST3 }, { nastaveni: true });
  test('úplná firma: bez varování o kapitolách', !v3.varovani.some(x => /kapitol nabídky/.test(x)), v3.varovani);
}

// ---- 5. zveřejnění: server přijme, kopie nese doplněné klíče --------------------
{
  const f = produkcniFirma();
  F.firmaDoplnVychoziTexty(f, false);
  f.kapPredaniDe = '';
  const lze = F.firmaLzeZverejnit(f);
  test('firmaLzeZverejnit přijme doplněné texty', lze.ok, lze);
  const kopie = F.firmaKZverejneni(f);
  test('firmaKZverejneni zveřejní doplněné klíče', F.FIRMA_KAP_VYCHOZI_KLICE.every(k => k === 'kapPredaniDe' || kopie[k] === D[k]));
  test('firmaKZverejneni zveřejní i vědomě prázdné pole', kopie.kapPredaniDe === '');
  const shoda = F.firmaShodaSOnline(f, produkcniFirma());
  test('panel ukáže rozdíl proti online kopii bez kapitol (→ Zveřejnit)', shoda.maOnline && !shoda.shodne
    && shoda.rozdily.some(r => /IV\. Požadavky/.test(r)), shoda);
}

// ---- 6. napojení v UI ---------------------------------------------------------
{
  const online = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
  test('online_ui: po nasazení online firmy se kapitoly doplní',
    /konfigNahradVMiste\(NAST\.firma, ONLINE_STAV\.firma\.udaje\);[\s\S]{0,400}firmaDoplnVychoziTexty\(NAST\.firma, false\)/.test(online));
  const nast = fs.readFileSync(__dirname + '/ui/nastaveni_ui.js', 'utf8');
  test('nastaveni_ui: tlačítko „Doplnit všechny prázdné"', /onclick="firmaKapitolyVychozi\(\)"[^<]*Doplnit všechny prázdné/.test(nast));
  test('nastaveni_ui: „vše prázdné" volá doplnění i prázdných', /firmaDoplnVychoziTexty\(NAST\.firma, true\)/.test(nast));
  test('nastaveni_ui: tlačítko u kapitoly a jazyka', /onclick="firmaKapitolaVychozi\('\$\{escJs\(id\)\}'\)">↺ Doplnit výchozí text</.test(nast)
    && /firmaDoplnVychoziText\(NAST\.firma, id\)/.test(nast));
  test('nastaveni_ui: tlačítka jen pro administrátora', (nast.match(/function firmaKapitol[ay]Vychozi[\s\S]{0,120}if \(!jeAdmin\(\)\) return/g) || []).length === 2);
  const build = fs.readFileSync(__dirname + '/../build.py', 'utf8');
  test('firma.js je v sestavení před konfigurace.js', build.indexOf("'firma.js'") >= 0
    && build.indexOf("'firma.js'") < build.indexOf("'konfigurace.js'"));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
