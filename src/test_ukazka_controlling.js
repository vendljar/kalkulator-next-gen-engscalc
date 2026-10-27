/* Test nástroje nastroje/ukazka_controlling_export.js (C3 #537, 27. 10. 2026).
 *
 * Ukázkový export pro controlling se vyrábí dnešním kódem ze smyšlených
 * zakázek. Předchozí ukázka (podklady/ukazky/vyrob_controlling_export_v2.js)
 * se po #504 tiše rozbila — výchozí filtr ji vyřadil celou a nikdo si toho
 * nevšiml. Tahle sada ji pouští v každém kole, takže změna exportu, která
 * ukázku rozbije, spadne hned.
 *
 * Ověřuje: nástroj doběhne a vyveze všech 5 zakázek (OCK ČR s objednanými
 * příplatky, Model 2 se schválenou slevou, zahraničí s neřídící variantou,
 * PROJ, přepočtený výsledek); jméno podle konvence TYP_rok-OBSAH_verze.přípona
 * s verzí z verze.txt; listy a hlavička Řádků = CTRL_RADKY_HLAVICKA; verze
 * struktury v listu Popis; v souboru jen smyšlené údaje (e-maily @priklad.cz,
 * zákazníci „Zkušební…", IČO 12345678); zjištění k #500 jsou v souhrnu. */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 300))); } };

const KOREN = path.join(__dirname, '..');
const NASTROJ = path.join(KOREN, 'nastroje', 'ukazka_controlling_export.js');
const VERZE = fs.readFileSync(path.join(KOREN, 'verze.txt'), 'utf8').trim();

(async () => {
  test('nástroj existuje', fs.existsSync(NASTROJ));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kng-ukazka-ctrl-'));
  const r = spawnSync(process.execPath, [NASTROJ, dir, '--json'], { encoding: 'utf8', cwd: KOREN });
  test('nástroj doběhne s kódem 0', r.status === 0, (r.stderr || '').slice(0, 300));
  let s = null;
  try { s = JSON.parse(r.stdout); } catch (e) { /* níž FAIL */ }
  test('souhrn --json je čitelný', !!s, (r.stdout || '').slice(0, 200));
  if (!s) { finish(dir); return; }

  test('jméno podle konvence TYP_rok-OBSAH_verze.přípona', /^[A-Z]+_\d{4}-[A-Z0-9-]+_v\d+\.\d+\.\d+\.xlsx$/.test(s.jmeno), s.jmeno);
  test('verze ve jméně = verze.txt', s.jmeno === 'UKAZKA_2026-CONTROLLING-EXPORT_v' + VERZE + '.xlsx', s.jmeno);
  test('soubor je v zadané složce', path.dirname(s.soubor) === dir && fs.existsSync(s.soubor), s.soubor);
  test('vyvezeno všech 5 zakázek, nic přeskočeno', s.zakazek === 5 && s.preskoceno.length === 0, s.preskoceno);
  test('výběr výslovně podle zamčení a všech stavů Pipedrive', s.filtr.podle === 'zamceni' && s.filtr.pd === 'vse', s.filtr);

  const nacti = f => { const m = require(path.join(__dirname, f)); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
  ['cenik.js', 'cenik_stari.js', 'engine.js', 'engine_proj.js'].forEach(nacti);
  const C = nacti('controlling.js');
  const DX = require('./docxgen.js');
  global.zipPrecti = DX.zipPrecti;
  const XL = require('./xlsx.js');
  const listy = await XL.xlsxPrecti(new Uint8Array(fs.readFileSync(s.soubor)));
  const L = n => (listy.find(l => l.nazev === n) || { rows: [] }).rows;
  test('čtyři listy v pořadí aplikace', listy.map(l => l.nazev).join('|') === ['Řádky', C.CTRL_LIST_PRIPLATKY, 'Kapitoly', 'Popis'].join('|'),
    listy.map(l => l.nazev));
  const radky = L('Řádky');
  test('hlavička Řádků = CTRL_RADKY_HLAVICKA', JSON.stringify(radky[0]) === JSON.stringify(C.CTRL_RADKY_HLAVICKA), radky[0]);
  const h = radky[0] || [];
  const sl = n => radky.slice(1).map(x => x[h.indexOf(n)]);
  test('Řádky nesou všech 5 nabídek', new Set(sl('Číslo nabídky')).size === 5, [...new Set(sl('Číslo nabídky'))]);
  test('objednané příplatky (C6) jsou vidět', sl('Objednáno dodatečně').includes('ano'));
  test('neřídící varianta je označená (C5)', sl('Řídící varianta').includes('ne'));
  test('přepočtený výsledek je označený', sl('Výsledek').some(x => /přepočten/.test(String(x))));
  test('zahraniční řada je v ukázce', sl('Řada').includes('zahraničí'));
  test('stav Pipedrive je vidět', sl('Stav Pipedrive').filter(Boolean).length > 0);
  const souhrn = L('Kapitoly').filter(x => x[0] === '2026 - OPR - CN - 0902' && x[1] === 'OCK' && typeof x[4] === 'number');
  test('schválená sleva 5 % se v ukázce uplatní', souhrn.length === 1 && souhrn[0][4] === 5, souhrn);
  const popis = L('Popis');
  const verze = popis.find(x => x[0] === 'Verze struktury souboru');
  test('Popis nese verzi struktury = CTRL_EXPORT_VERZE', !!verze && +verze[1] === C.CTRL_EXPORT_VERZE && s.verzeStruktury === C.CTRL_EXPORT_VERZE, verze);

  const text = listy.map(l => l.rows.map(x => x.join('\t')).join('\n')).join('\n');
  const maily = text.match(/[\w.+-]+@[\w.-]+/g) || [];
  test('e-maily jen smyšlené @priklad.cz', maily.length > 0 && maily.every(m => /@priklad\.cz$/.test(m)), [...new Set(maily)]);
  const zakaznici = new Set(sl('Zákazník'));
  test('zákazníci jen „Zkušební …"', [...zakaznici].every(z => /^Zkušební /.test(z)), [...zakaznici]);
  test('IČO jen smyšlené 12345678', sl('IČO').every(x => String(x) === '12345678'));

  const z = s.zjisteni || {};
  test('souhrn nese zjištění k #500 (Kapitoly, zaokrouhlení OCK)', Array.isArray(z.podilyMimo100) && !!z.zaokrouhleniOck
    && z.zaokrouhleniOck.stran === 3, z);
  finish(dir);
})().catch(e => { fail++; console.log('FAIL výjimka', e && e.stack || e); console.log(`\n${ok} OK / ${fail} FAIL`); process.exit(1); });

function finish(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`\n${ok} OK / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}
