/* VÝCHOZÍ TEXTY KAPITOL NABÍDKY SE DOPLNÍ PŘI NAČTENÍ FIRMY
 * (dávka O3, 19. 10. 2026, v19.10.3 — zadání J. V. „Doplň výchozí texty
 * do Nastavení rovnou.")
 *
 * V produkci byly v Nastavení → Firma české kapitoly IV.–VI. a doložky
 * prázdné, ač DEFAULT_FIRMA texty má: uložená firma (online i
 * `_nastaveni.json`) je neměla nebo je měla prázdné a konfigNahradVMiste()
 * ji kopíruje celou. Nabídka pak kapitoly vypouštěla.
 *
 * Zkouší se: doplnění chybějících a prázdných polí CZ/EN/DE (FR ne),
 * vědomé vypuštění značkou „-", ruční obnova (vynutit), načtení přes
 * konfiguraceImport / nastdbPouzij, serverová kontrola zveřejnění
 * a napojení v UI (online_ui, nastaveni_ui).
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

/* Firma tak, jak leží v produkci: skutečné (smyšlené) údaje, kapitoly
 * chybí úplně nebo jsou prázdné. */
function produkcniFirma() {
  return { nazev: 'Zkušební stavby s.r.o.', ico: '123 45 678', sidloUlice: 'Testovací 1',
    sidloPsc: '100 00', sidloMesto: 'Praha', telefon: '+420 000 000 000', email: 'info@example.cz',
    zpracovatel: 'Jan Zkušební', kapPozadavky: '', kapTerminy: '   \n  ', dolozkyEn: '' };
}

// ---- 1. doplnění při načtení ------------------------------------------------
{
  const f = produkcniFirma();
  const dopl = F.firmaKapitolyDoplnVychozi(f, false);
  KAP.forEach(b => JAZ.forEach(s => test('doplněno ' + b + s, f[b + s] === D[b + s] && D[b + s].trim().length > 0)));
  test('vrací všech 12 doplněných klíčů (CZ/EN/DE × 4)', dopl.length === 12, dopl);
  test('FR se nedoplňuje (nemá výchozí text)', KAP.every(b => f[b + 'Fr'] === undefined));
  test('ostatní pole firmy se nemění (žádné ukázkové údaje)',
    f.nazev === 'Zkušební stavby s.r.o.' && f.ico === '123 45 678' && f.ukazkove === undefined && f.dic === undefined);
  test('česká kontrola už nehlásí prázdné kapitoly', F.firmaKapitolyPrazdne(f, 'cz').length === 0);
  test('druhé volání nic nemění', F.firmaKapitolyDoplnVychozi(f, false).length === 0);
}

// ---- 2. vědomé vypuštění a vlastní texty --------------------------------------
{
  const f = produkcniFirma();
  f.kapPredani = '-'; f.kapPredaniEn = '  -  '; f.kapTerminyDe = 'Eigener Text';
  F.firmaKapitolyDoplnVychozi(f, false);
  test('značka „-" zůstává', f.kapPredani === '-' && f.kapPredaniEn === '  -  ');
  test('vlastní text zůstává', f.kapTerminyDe === 'Eigener Text');
  const k = F.firmaKapitola(f, 'kapPredani', 'cz');
  test('vypuštěná kapitola nemá řádky a nese příznak', k.radky.length === 0 && k.prazdne && k.vypusteno, k);
  test('vypuštěná kapitola se nehlásí jako opomenutí',
    !F.firmaKapitolyPrazdne(f, 'cz').some(x => x.base === 'kapPredani'));
  test('neprázdná kapitola nemá příznak vypuštění', F.firmaKapitola(f, 'kapTerminy', 'cz').vypusteno === false);
  test('symbol do Wordu je u vypuštěné kapitoly prázdný (žádná pomlčka)',
    F.firmaPlaceholders(f).FIRMA_NAB_PREDANI === '' && F.firmaPlaceholders(f).FIRMA_NAB_POZADAVKY !== '');
  // FR: prázdné → česky s upozorněním (beze změny), „-" → vypuštěno bez češtiny
  const fr1 = F.firmaKapitola(f, 'kapPozadavky', 'fr');
  test('prázdná FR dál bere češtinu s upozorněním', fr1.jazykChybi && fr1.radky.length > 0);
  f.kapPozadavkyFr = '-';
  const fr2 = F.firmaKapitola(f, 'kapPozadavky', 'fr');
  test('FR „-" se češtinou nenahrazuje', fr2.radky.length === 0 && fr2.vypusteno && !fr2.jazykChybi, fr2);
  test('řádek „-" uprostřed textu není značka', F.firmaKapitola({ kapTerminy: 'a\n-\nb' }, 'kapTerminy', 'cz').radky.length === 3);
  test('firmaKapVypusteno: jen řetězec „-"', F.firmaKapVypusteno(' - ') && !F.firmaKapVypusteno('')
    && !F.firmaKapVypusteno(null) && !F.firmaKapVypusteno('--') && F.FIRMA_KAP_VYPUSTIT === '-');
}

// ---- 3. ruční obnova (tlačítko „Doplnit výchozí texty") -------------------
{
  const f = produkcniFirma();
  f.kapPredani = '-'; f.kapTerminyDe = 'Eigener Text'; f.kapPozadavkyFr = 'Texte';
  const dopl = F.firmaKapitolyDoplnVychozi(f, true);
  test('vynutit přepíše i vypuštěné a upravené', f.kapPredani === D.kapPredani && f.kapTerminyDe === D.kapTerminyDe);
  test('vynutit nechá FR', f.kapPozadavkyFr === 'Texte');
  test('vynutit vrací přepsané klíče', dopl.length === 12 && dopl.indexOf('kapTerminyDe') >= 0, dopl);
  test('vynutit podruhé nic nemění', F.firmaKapitolyDoplnVychozi(f, true).length === 0);
  test('nesmyslný vstup → prázdný seznam', F.firmaKapitolyDoplnVychozi(null).length === 0
    && F.firmaKapitolyDoplnVychozi('x', true).length === 0);
}

// ---- 4. načtení ze složky / importu konfigurace ----------------------------
{
  const NAST = { firma: { nazev: 'Stará' }, jazyk: 'cz' };
  const data = { aplikace: 'Kalkulátor OCK', verze: K.KONFIG_VERZE, nastaveni: { firma: produkcniFirma() } };
  data.nastaveni.firma.dolozky = '-';
  const v = K.konfiguraceImport(data, { NAST }, { nastaveni: true });
  test('import: české kapitoly doplněné', NAST.firma.kapPozadavky === D.kapPozadavky && NAST.firma.kapTerminy === D.kapTerminy);
  test('import: „-" zůstává', NAST.firma.dolozky === '-');
  test('import: skutečné údaje převzaté, ukázkové nepřidané', NAST.firma.nazev === 'Zkušební stavby s.r.o.' && NAST.firma.ukazkove === undefined);
  test('import: varování říká, co se doplnilo', v.varovani.some(x => /kapitol nabídky/.test(x) && /kapPozadavky/.test(x)), v.varovani);
  test('zdrojová data importu se nemění', data.nastaveni.firma.kapPozadavky === '');

  const NAST2 = { firma: {} };
  DB.nastdbPouzij({ aplikace: 'Kalkulátor OCK', nastaveni: { firma: { nazev: 'Ze složky s.r.o.' } } }, { NAST: NAST2 });
  test('_nastaveni.json (nastdbPouzij): kapitoly doplněné', KAP.every(b => NAST2.firma[b] === D[b]));

  const NAST3 = { firma: {} };
  const v3 = K.konfiguraceImport({ aplikace: 'Kalkulátor OCK', verze: K.KONFIG_VERZE,
    nastaveni: { firma: Object.assign(produkcniFirma(), F.firmaKapitolyDoplnVychozi({}, true).reduce((o, k) => (o[k] = D[k], o), {})) } },
    { NAST: NAST3 }, { nastaveni: true });
  test('úplná firma: bez varování o kapitolách', !v3.varovani.some(x => /kapitol nabídky/.test(x)), v3.varovani);
}

// ---- 5. server přijme doplněné texty i značku ------------------------------
{
  const f = produkcniFirma();
  F.firmaKapitolyDoplnVychozi(f, false);
  f.kapPredaniDe = '-';
  const lze = F.firmaLzeZverejnit(f);
  test('firmaLzeZverejnit přijme doplněné texty', lze.ok, lze);
  const kopie = F.firmaKZverejneni(f);
  test('kopie ke zveřejnění nese texty i značku', kopie.kapPozadavky === D.kapPozadavky && kopie.kapPredaniDe === '-');
  const shoda = F.firmaShodaSOnline(f, produkcniFirma());
  test('panel ukáže rozdíl proti online kopii bez kapitol (→ Zveřejnit)', shoda.maOnline && !shoda.shodne
    && shoda.rozdily.some(r => /IV\. Požadavky/.test(r)), shoda);
}

// ---- 6. napojení v UI ---------------------------------------------------------
{
  const online = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
  test('online_ui: po nasazení online firmy se kapitoly doplní',
    /konfigNahradVMiste\(NAST\.firma, ONLINE_STAV\.firma\.udaje\);[\s\S]{0,400}firmaKapitolyDoplnVychozi\(NAST\.firma, false\)/.test(online));
  const nast = fs.readFileSync(__dirname + '/ui/nastaveni_ui.js', 'utf8');
  test('nastaveni_ui: tlačítko „Doplnit výchozí texty"', /onclick="firmaKapitolyVychozi\(\)"[^<]*Doplnit výchozí texty/.test(nast));
  test('nastaveni_ui: tlačítko volá doplnění s vynucením', /firmaKapitolyDoplnVychozi\(NAST\.firma, true\)/.test(nast));
  test('nastaveni_ui: vypuštěná kapitola má štítek', /vědomě vypuštěno/.test(nast));
  const build = fs.readFileSync(__dirname + '/../build.py', 'utf8');
  test('firma.js je v sestavení před konfigurace.js', build.indexOf("'firma.js'") >= 0
    && build.indexOf("'firma.js'") < build.indexOf("'konfigurace.js'"));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
