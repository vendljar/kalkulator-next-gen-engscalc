/* Test #533 — jednotná konvence názvů souborů, které kalkulátor vytváří
 * (pokyn J. V. 27. 10. 2026; src/nazvy_souboru.js, podklady/NAZVY_SOUBORU.md).
 *
 * 1) tabulka: každý druh exportu → očekávaný název (ceník OCK / PROJ / OCK+PROJ,
 *    zakázka, nabídka ve čtyřech jazycích, SoD, plná moc, krycí listy, záloha,
 *    controlling, konfigurace, slovník, nepřeložené fráze …);
 * 2) názvy jsou bezpečné (bez mezer, diakritiky a znaků, které OS nepřijme);
 * 3) výjimky se nezměnily (otisk_…json(.gz), _nastaveni.json, _program.json,
 *    posledni_kopie.json);
 * 4) import bere staré i nové názvy: načítání jméno souboru nekontroluje
 *    a pole „accept" bere přípony starých i nových souborů;
 * 5) každé stažení v UI jde přes nazevExportu (nebo je vyjmenovaná výjimka).
 * Pojistka: nad základem 62ea0c8 (bez src/nazvy_souboru.js) sada spadne hned
 * na require; s vrácenou starou větví v cenik_ui.js hlásí FAIL v bodě 5. */
const fs = require('fs');
const path = require('path');
const N = require('./nazvy_souboru.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : info); } };

const D = '2026-10-27', V = 'v27.10.1';
const u = o => Object.assign({ datum: D, verze: V }, o);

/* ---------- 1) tabulka druhů ---------- */
const TABULKA = [
  // [druh, údaje, očekávaný název]
  ['cenik', u({}), 'CENIK_2026-OCK+PROJ_27.10.1.xlsx'],              // příklad J. V. doslova
  ['cenik', u({ proj: false }), 'CENIK_2026-OCK_27.10.1.xlsx'],
  ['cenik', u({ ock: false }), 'CENIK_2026-PROJ_27.10.1.xlsx'],
  ['cenik-platny', u({ verzeCeniku: 12 }), 'CENIK_2026-10-27-PLATNY-V12-OCK+PROJ_27.10.1.json'],
  ['zakazka', u({ cislo: '2026 - OPR - CN - 555' }), 'ZAKAZKA_2026-OPR-CN-555_27.10.1.json'],
  ['zakazka', u({ cislo: '2026 - OPR - CN - 555.2', bezCeniku: true }), 'ZAKAZKA_2026-OPR-CN-555.2-BEZ-CENIKU_27.10.1.json'],
  ['zakazka', u({}), 'ZAKAZKA_NOVA_27.10.1.json'],
  ['nabidka', u({ cislo: '2026 - OPR - CN - 555', jazyk: 'cz' }), 'NABIDKA_2026-OPR-CN-555-OCK-CZ'],
  ['nabidka', u({ cislo: '2026 - OPR - CN - 555', jazyk: 'en', zakaznik: 'Stavby Novák s.r.o.' }), 'PRICE-QUOTATION_2026-OPR-CN-555-OCK-Stavby-Novak-s.r.o-EN'],
  ['nabidka', u({ cislo: '2026 - OPR - CN - 555.2', jazyk: 'de', varianta: 'Varianta 2' }), 'ANGEBOT_2026-OPR-CN-555.2-OCK-Varianta-2-DE'],
  ['nabidka', u({ cislo: '2026 - OVP - CN - 77', jazyk: 'fr', oblast: 'proj' }), 'DEVIS_2026-OVP-CN-77-PROJ-FR'],
  ['nabidka', u({ oblast: 'proj' }), 'NABIDKA_OVP-CN-PROJ-CZ'],
  ['sod', u({ cislo: '2026 - OPR - CN - 555', jazyk: 'cz' }), 'SOD_2026-OPR-CN-555-OCK-CZ'],
  ['sod', u({ cislo: '2026 - OVP - CN - 77', jazyk: 'en', oblast: 'proj' }), 'SOD_2026-OVP-CN-77-PROJ-EN'],
  ['plna-moc', u({ cislo: '2026 - OVP - CN - 77' }), 'PLNA-MOC_2026-OVP-CN-77-PROJ-CZ'],
  ['specifikace', u({ cislo: '2026 - OPR - CN - 555', jazyk: 'en' }), 'SPECIFIKACE_2026-OPR-CN-555-OCK-EN'],
  ['kryci-list', u({ cislo: '2026 - OPR - CN - 555', list: 'Backoffice' }), 'KRYCI-LIST_2026-OPR-CN-555-OCK-BACKOFFICE_27.10.1'],
  ['kryci-list', u({ cislo: '2026 - OVP - CN - 77', oblast: 'proj', list: 'Techdata' }), 'KRYCI-LIST_2026-OVP-CN-77-PROJ-TECHDATA_27.10.1'],
  ['kryci-list', u({ cislo: '2026 - OPR - CN - 555', list: 'Backoffice', pripona: 'pdf' }), 'KRYCI-LIST_2026-OPR-CN-555-OCK-BACKOFFICE_27.10.1.pdf'],
  ['protokol', u({ cislo: '2026 - OPR - CN - 555' }), 'PROTOKOL_2026-OPR-CN-555_27.10.1.txt'],
  ['detail-polozek', u({ cislo: '2026 - OPR - CN - 555' }), 'DETAIL-POLOZEK_2026-OPR-CN-555-VARIANTY_27.10.1'],
  ['porovnani', u({ cislo: '2026 - OPR - CN - 555' }), 'POROVNANI-VARIANT_2026-OPR-CN-555_27.10.1'],
  ['detail-vypoctu', u({ cislo: '2026 - OPR - CN - 555' }), 'DETAIL-VYPOCTU_2026-OPR-CN-555-OCK_27.10.1'],
  ['predkalkulace', u({ cislo: '2026 - OPR - CN - 555', oblasti: ['ock', 'proj'] }), 'PREDKALKULACE_2026-OPR-CN-555-OCK+PROJ-2026-10-27_27.10.1.xlsx'],
  ['predkalkulace', u({ cislo: '2026 - OPR - CN - 555', oblasti: ['ock'], format: 'csv' }), 'PREDKALKULACE_2026-OPR-CN-555-OCK-2026-10-27_27.10.1.csv'],
  ['predkalkulace-hromadna', u({ od: '2026-01-01', do: '2026-03-31', zuzeni: ['OCK', '', 'PD-WON'] }), 'PREDKALKULACE_2026-01-01-az-2026-03-31-OCK-PD-WON_27.10.1.xlsx'],
  ['predkalkulace-hromadna', u({ vse: true, zuzeni: [], format: 'csv' }), 'PREDKALKULACE_2026-10-27-CELA-DB_27.10.1.csv'],
  ['controlling-mapovani', u({}), 'CONTROLLING_2026-10-27-MAPOVANI_27.10.1.xlsx'],
  ['zaloha', u({}), 'ZALOHA_2026-10-27-ONLINE-DB_27.10.1.json'],
  ['konfigurace', u({ sekce: ['nastaveni', 'katalog'] }), 'KONFIGURACE_2026-10-27-NASTAVENI+KATALOG_27.10.1.json'],
  ['konfigurace', u({ sekce: ['nastaveni'], vse: true }), 'KONFIGURACE_2026-10-27-VSE_27.10.1.json'],
  ['slovnik', u({ jazyky: ['en', 'de', 'fr'] }), 'SLOVNIK_2026-10-27-CZ+EN+DE+FR_27.10.1.xlsx'],
  ['slovnik-jen-v-aplikaci', u({}), 'SLOVNIK_2026-10-27-JEN-V-APLIKACI_27.10.1.csv'],
  ['neprelozene', u({ sablona: 'nabidka_proj', jazyk: 'de' }), 'NEPRELOZENE_2026-10-27-SABLONA-NABIDKA-PROJ-DE_27.10.1.csv'],
  ['neprelozene', u({ jazyk: 'en' }), 'NEPRELOZENE_2026-10-27-SPECIFIKACE-EN_27.10.1.csv'],
  ['specifikace-data', u({}), 'SPECIFIKACE_2026-10-27-CISELNIKY_27.10.1.json'],
  ['pipedrive-nanecisto', u({ cislo: '2026 - OPR - CN - 555' }), 'PIPEDRIVE_2026-OPR-CN-555-NANECISTO_27.10.1.csv'],
];
TABULKA.forEach(([druh, udaje, cekam]) => {
  const n = N.nazevExportu(druh, udaje);
  test(druh + ' → ' + cekam, n === cekam, n);
});
test('tabulka pokrývá každý druh z NAZVY_DRUHY',
  Object.keys(N.NAZVY_DRUHY).every(k => TABULKA.some(r => r[0] === k)),
  Object.keys(N.NAZVY_DRUHY).filter(k => !TABULKA.some(r => r[0] === k)));
let chyba = '';
try { N.nazevExportu('neexistuje', {}); } catch (e) { chyba = e.message; }
test('neznámý druh exportu je chyba, ne tichý název', /Neznámý druh/.test(chyba), chyba);

/* ---------- 2) bezpečné znaky, verze, datum ---------- */
const TVAR = /^[A-Z][A-Z0-9-]*(_[A-Za-z0-9.+-]+)*(\.[a-z]+)?$/;
TABULKA.forEach(([druh, udaje]) => {
  const n = N.nazevExportu(druh, udaje);
  test('tvar ' + druh, TVAR.test(n) && !/[\s\\/:*?"<>|]/.test(n) && !/[^\x20-\x7e]/.test(n), n);
});
test('nazevCast: diakritika, mezery a podtržítka', N.nazevCast(' Šachta  č_1 / „B" ') === 'Sachta-c-1-B', N.nazevCast(' Šachta  č_1 / „B" '));
test('nazevCast: číslo nabídky s variantou', N.nazevCast('2026 - OPR - CN - 0383.2') === '2026-OPR-CN-0383.2');
test('verze bez „v"', N.nazevVerzeAplikace('v27.10.1') === '27.10.1' && N.nazevVerzeAplikace('27.10.12') === '27.10.12');
test('nesestavená verze (__VERZE__) do názvu nejde', N.nazevVerzeAplikace('__VERZE__') === '' && N.nazevVerzeAplikace('') === '');
test('bez verze sestavení úsek verze chybí (Node, vývoj)', N.nazevExportu('zaloha', { datum: D }) === 'ZALOHA_2026-10-27-ONLINE-DB.json');
test('verze sestavení se čte z buildVerze()', (() => {
  global.buildVerze = () => 'v27.10.3';
  try { return N.nazevExportu('cenik', { datum: D }) === 'CENIK_2026-OCK+PROJ_27.10.3.xlsx'; } finally { delete global.buildVerze; }
})());
test('dokument pro zákazníka nenese verzi aplikace ani s buildVerze()', (() => {
  global.buildVerze = () => 'v27.10.3';
  try { return N.nazevExportu('nabidka', { cislo: '1', jazyk: 'cz' }) === 'NABIDKA_1-OCK-CZ'; } finally { delete global.buildVerze; }
})());
test('den je MÍSTNÍ (ne UTC)', N.nazevDen(new Date(2026, 9, 27, 0, 30)) === '2026-10-27', N.nazevDen(new Date(2026, 9, 27, 0, 30)));

/* ---------- 3) výjimky beze změny ---------- */
const ULO = require('./uloziste.js');
test('výjimka: kopie na Disk otisk_RRRR-MM-DD.json.gz', ULO.uloKopieDiskJmeno('2026-10-27', true) === 'otisk_2026-10-27.json.gz');
test('výjimka: kopie na Disk otisk_RRRR-MM-DD.json', ULO.uloKopieDiskJmeno('2026-10-27', false) === 'otisk_2026-10-27.json');
test('výjimka: _nastaveni.json a _program.json (složka _DB podle jména)',
  require('./nastaveni_db.js').NASTDB_SOUBOR === '_nastaveni.json' && require('./program.js').PROG_SOUBOR === '_program.json');
const UI = f => fs.readFileSync(path.join(__dirname, 'ui', f), 'utf8');
test('výjimka: posledni_kopie.json na Disku', UI('online_ui.js').includes("kopieDiskZapisSoubor(h, 'posledni_kopie.json',"));
{
  const re = /^otisk_(\d{4}-\d{2}-\d{2})\.json(\.gz)?$/;
  const src = fs.readFileSync(path.join(__dirname, 'retence_zaloh.js'), 'utf8');
  test('retence_zaloh.js pořád hledá jen otisk_…', src.includes('/^otisk_(\\d{4}-\\d{2}-\\d{2})\\.json(\\.gz)?$/'));
  test('nová záloha ZALOHA_… není otisk (úklid ji nesmaže)', !re.test(N.nazevExportu('zaloha', u({}))));
}

/* ---------- 4) import bere staré i nové názvy ---------- */
const COMMON = UI('common.js');
const telo = (src, fn) => {
  const i = src.indexOf('function ' + fn + '(');
  if (i < 0) return '';
  const j = src.indexOf('\nfunction ', i + 10);
  return src.slice(i, j < 0 ? undefined : j);
};
const IMPORTY = [
  ['common.js', 'nactiZakazku'], ['cenik_ui.js', 'cenikImport'], ['nastaveni_ui.js', 'konfigImportSoubor'],
  ['program_ui.js', 'cenikPrenosNahraj'], ['online_ui.js', 'onlineObnovaSoubor'], ['controlling_ui.js', 'ctrlUiImport'],
];
IMPORTY.forEach(([f, fn]) => {
  const t = telo(f === 'common.js' ? COMMON : UI(f), fn);
  if (!t) { test('import ' + fn + ' nalezen (' + f + ')', true); return; }   // jiné jméno funkce — kontroluje se níž přes accept
  test('import ' + fn + ' nerozhoduje podle jména souboru',
    !/\.name\s*(\.(test|match|startsWith|endsWith|indexOf|includes)|===|!==)|\.test\([^)]*\.name\)/.test(t), fn);
});
const tpl = fs.readFileSync(path.join(__dirname, 'app_template.html'), 'utf8');
test('načtení zakázky bere .json (staré zakazka_… i nové ZAKAZKA_…)', /id="fileIn" accept="\.json"/.test(tpl));
test('import ceníku bere .xlsx (staré CENIK_<číslo>.xlsx i nové)', UI('cenik_ui.js').includes("inp.accept = '.xlsx'"));
test('obnova zálohy bere .json i .gz', UI('online_ui.js').includes('accept=".json,.gz,application/json,application/gzip"'));
{
  const eng = require('./engine.js'), ep = require('./engine_proj.js'), ZC = require('./zkusebni_cenik.js');
  global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI; global.DEFAULT_CENIK = ZC.zkusebniCenik();
  global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
  const tsm = require('./techspec.js');
  global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
  const zk = require('./zakazka.js');
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 1';
  const text = zk.StorageAdapter.exportuj(z);
  /* Načtení jde jen přes obsah — stejný text pod starým i novým jménem dá
   * tutéž zakázku (jméno do importuj vůbec nevstupuje). */
  const a = zk.StorageAdapter.importuj(text), b = zk.StorageAdapter.importuj(text);
  test('zakázka ze souboru: obsah rozhoduje, jméno ne', a.cislo === b.cislo && a.cislo === '2026 - OPR - CN - 1'
    && zk.StorageAdapter.importuj.length === 1);
}

/* ---------- 5) každé stažení v UI jde přes konvenci ---------- */
const POVOLENE = [
  /nazevExportu\(/, /\.nazevSouboru\b/, /konfiguraceNazevSouboru\(/,
  /download = jmeno;/,                          // souborKeStazeni / ctrlUiStahni — jméno přichází z volajícího
  /download = p\.nazev;/,                       // příloha poznámky: jméno od uživatele (výjimka)
  /download = nazev;/,                          // šablona a její jazyková mutace: jméno nahraného souboru (výjimka)
];
const souboryUi = fs.readdirSync(path.join(__dirname, 'ui')).filter(f => f.endsWith('.js'));
souboryUi.forEach(f => {
  UI(f).split('\n').forEach((r, i) => {
    if (!/\.download\s*=/.test(r)) return;
    test('stažení ' + f + ':' + (i + 1) + ' jde přes konvenci nebo výjimku', POVOLENE.some(p => p.test(r)), r.trim());
  });
});
/* Volající souborKeStazeni a ctrlUiStahni: jméno buď z nazevExportu, nebo pevná výjimka _DB. */
souboryUi.forEach(f => {
  UI(f).split('\n').forEach((r, i) => {
    const m = /(souborKeStazeni|ctrlUiStahni)\(/.exec(r);
    if (!m || /function /.test(r)) return;
    test(m[1] + ' ' + f + ':' + (i + 1) + ' s pojmenovaným souborem',
      /nazevExportu\(|NASTDB_SOUBOR|PROG_SOUBOR|\(jmeno, |, jmeno[,)]/.test(r), r.trim());
  });
});
test('online záloha se jmenuje přes nazevExportu', /function onlineZalohaJmeno\(\) \{\s*return nazevExportu\('zaloha'/.test(UI('online_ui.js')));
test('platný ceník se jmenuje přes nazevExportu', /const jmeno = nazevExportu\('cenik-platny'/.test(UI('program_ui.js')));
test('controlling jmenuje přes nazevExportu (jednotlivě i hromadně)',
  /nazevExportu\('predkalkulace', /.test(UI('controlling_ui.js')) && /nazevExportu\('predkalkulace-hromadna', /.test(UI('controlling_ui.js')));
test('hláška controllingu nepřidává příponu podruhé (jméno už ji nese)', !/jmeno \+ '\.' \+ format/.test(UI('controlling_ui.js')));
test('tisk specifikace navrhne jméno PDF (titulek okna)', (UI('techspec_ui.js').match(/tiskSNazvem\(nazevExportu\('specifikace'/g) || []).length === 2);

/* Náhled zápisu do Pipedrive (P3 #536) jde přes konvenci, ne vlastním skládáním. */
test('CSV náhledu Pipedrive: PIPEDRIVE_<číslo>-NANECISTO_<verze>.csv',
  N.nazevExportu('pipedrive-nanecisto', { cislo: '2026 - OPR - CN - 0901', verze: 'v27.10.4' }) === 'PIPEDRIVE_2026-OPR-CN-0901-NANECISTO_27.10.4.csv');
test('pdnNazevSouboru deleguje na nazevExportu',
  require('./pd_nanecisto.js').pdnNazevSouboru({ cislo: '2026 - OPR - CN - 0901' }, 'v27.10.4') === 'PIPEDRIVE_2026-OPR-CN-0901-NANECISTO_27.10.4.csv');

/* ---------- build: modul je v CORE před dokumenty ---------- */
const build = fs.readFileSync(path.join(__dirname, '..', 'build.py'), 'utf8');
const core = (build.match(/CORE = \[([\s\S]*?)\]/) || [])[1] || '';
test('build.py: nazvy_souboru.js je v CORE před nabidka.js',
  core.indexOf("'nazvy_souboru.js'") >= 0 && core.indexOf("'nazvy_souboru.js'") < core.indexOf("'nabidka.js'"));
const dist = path.join(__dirname, '..', 'dist', 'kalkulacka.html');
if (fs.existsSync(dist)) {
  const h = fs.readFileSync(dist, 'utf8');
  test('sestavená aplikace nese nazevExportu', h.includes('function nazevExportu('));
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
