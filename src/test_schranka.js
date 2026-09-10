/* ===== VLOŽENÍ OBRÁZKU ZE SCHRÁNKY (Ctrl+V) — 10. 9. 2026 =====
 *
 * Zadání J. V.: „umožni vkládání fotek do cenových nabídek (a kamkoliv jinam,
 * jestli ještě někde je ta možnost) formou příkazu ctrl+v; obchodník většinou
 * fotku jenom vystřihne v google maps a potřebuje ji vložit rovnou."
 *
 * Dvě věci se snadno rozbijí a prohlížeč o nich mlčí:
 *
 * 1) ROZPOZNÁNÍ OBRÁZKU. Chrome dává výstřižek jako `clipboardData.items` typu
 *    file, jiné zdroje jako `clipboardData.files`. Kdo ošetří jen jednu cestu,
 *    má funkci, která u poloviny zdrojů tiše nic neudělá.
 *
 * 2) TEXTOVÉ POLE SI CTRL+V DRŽÍ. Kdyby obrázková větev spolkla každé vložení,
 *    přestalo by jít vkládat text do popisku pod fotkou nebo do poznámky —
 *    a to je funkce, kterou lidé používají mnohem častěji.
 *
 * Funkce žijí v ui/common.js, které nejde načíst přes require() (je to část
 * jednosouborové aplikace). Vytahují se ze zdroje stejně jako esc() v
 * test_escape.js a spouštějí samostatně nad náhradními objekty.
 */
const fs = require('fs');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n + (info ? '  – ' + JSON.stringify(info) : '')); }
};

const src = fs.readFileSync(__dirname + '/ui/common.js', 'utf8');
const vytahni = (jm) => {
  const m = src.match(new RegExp('function ' + jm + '\\([\\s\\S]*?\\n\\}'));
  if (!m) throw new Error('v ui/common.js chybí funkce ' + jm);
  return m[0];
};

const schrankaObrazek = new Function(vytahni('schrankaObrazek') + '\nreturn schrankaObrazek;')();
const vlozPoleEditace = new Function(vytahni('vlozPoleEditace') + '\nreturn vlozPoleEditace;')();

/* ---------- 1) rozpoznání obrázku ve schránce ---------- */

const souborPng = { name: '', type: 'image/png', size: 1234 };
const udalostItems = (typy) => ({
  clipboardData: {
    items: typy.map(t => ({ kind: t === 'text/plain' ? 'string' : 'file', type: t,
      getAsFile: () => ({ name: '', type: t, size: 10 }) })),
  },
});

test('výstřižek jako items/file se najde',
  (schrankaObrazek(udalostItems(['image/png'])) || {}).type === 'image/png');
test('mezi textem a obrázkem se vybere obrázek',
  (schrankaObrazek(udalostItems(['text/plain', 'image/jpeg'])) || {}).type === 'image/jpeg');
test('samotný text obrázek nedá', schrankaObrazek(udalostItems(['text/plain'])) === null);
test('prázdná schránka nic nedá', schrankaObrazek({ clipboardData: { items: [] } }) === null);
test('událost bez clipboardData nespadne', schrankaObrazek({}) === null);
test('nedefinovaná událost nespadne', schrankaObrazek(undefined) === null);

test('obrázek předaný jako files (jiné zdroje než Chrome) se taky najde',
  (schrankaObrazek({ clipboardData: { files: [souborPng] } }) || {}).type === 'image/png');
test('files s jiným než obrázkovým typem se ignorují',
  schrankaObrazek({ clipboardData: { files: [{ type: 'application/pdf' }] } }) === null);

/* Položka, která se tváří jako obrázek, ale soubor nevydá — u některých
 * zdrojů se to stane a getAsFile() vrátí null. */
test('položka bez souboru se přeskočí',
  schrankaObrazek({ clipboardData: { items: [{ kind: 'file', type: 'image/png', getAsFile: () => null }] } }) === null);

/* ---------- 2) do textu se nezasahuje ---------- */

test('textarea si Ctrl+V nechá', vlozPoleEditace({ tagName: 'TEXTAREA' }) === true);
test('textové pole si Ctrl+V nechá', vlozPoleEditace({ tagName: 'INPUT', type: 'text' }) === true);
test('číselné pole si Ctrl+V nechá', vlozPoleEditace({ tagName: 'INPUT', type: 'number' }) === true);
test('input bez uvedeného typu je text', vlozPoleEditace({ tagName: 'INPUT' }) === true);
test('editovatelný blok si Ctrl+V nechá', vlozPoleEditace({ tagName: 'DIV', isContentEditable: true }) === true);
test('zaškrtávátko text nevkládá', vlozPoleEditace({ tagName: 'INPUT', type: 'checkbox' }) === false);
test('výběr souboru text nevkládá', vlozPoleEditace({ tagName: 'INPUT', type: 'file' }) === false);
test('tlačítko text nevkládá', vlozPoleEditace({ tagName: 'BUTTON' }) === false);
test('obyčejný blok text nevkládá', vlozPoleEditace({ tagName: 'DIV' }) === false);
test('prázdný cíl nespadne', vlozPoleEditace(null) === false);

/* ---------- 3) zóny a cíle jsou propojené ---------- */

/* Zóna v HTML (`data-vlozobrazek="fotoOck"`) musí mít protějšek v registraci
 * (`vlozObrazekCil('fotoOck', …)`), jinak Ctrl+V v té zóně tiše nic neudělá. */
const uiDir = __dirname + '/ui';
const zony = new Set(), cile = new Set();
for (const f of fs.readdirSync(uiDir)) {
  if (!f.endsWith('.js')) continue;
  const s = fs.readFileSync(uiDir + '/' + f, 'utf8');
  let m;
  /* Hodnota atributu je buď holé jméno (`data-vlozobrazek="logo"`), nebo se
   * skládá za běhu (`"${c === 'proj' ? 'fotoProj' : 'fotoOck'}"`). V druhém
   * případě jsou jména v apostrofech uvnitř — vytáhnou se obě varianty.
   * Vysvětlivka v komentáři (`"<název cíle>"`) jméno není a propadne sítem. */
  const reZ = /data-vlozobrazek="([^"]*)"/g;
  while ((m = reZ.exec(s))) {
    const v = m[1];
    if (/^[A-Za-z][A-Za-z0-9_]*$/.test(v)) { zony.add(v); continue; }
    const lit = v.match(/'([A-Za-z][A-Za-z0-9_]*)'/g) || [];
    lit.forEach(x => zony.add(x.replace(/'/g, '')));
  }
  const reC = /vlozObrazekCil\('([^']+)'/g;
  while ((m = reC.exec(s))) cile.add(m[1]);
}
const bezCile = Array.from(zony).filter(z => !cile.has(z));
test('každá zóna Ctrl+V má registrovaný cíl', bezCile.length === 0, bezCile);
test('zóny se opravdu našly (jinak by kontrola výše mlčela)', zony.size >= 4, Array.from(zony));
test('cíle Ctrl+V jsou aspoň čtyři (fotka OCK, fotka PROJ, logo, přílohy)',
  cile.size >= 4, Array.from(cile));

/* Záložky, ze kterých se vkládá bez zaměření zóny, musí mířit na existující cíl. */
const tabMap = src.match(/const VLOZ_OBRAZEK_TAB = \{([^}]*)\}/);
test('mapa záložek pro Ctrl+V je v ui/common.js', !!tabMap);
if (tabMap) {
  const miri = (tabMap[1].match(/'([^']+)'/g) || []).map(x => x.replace(/'/g, ''));
  const chybi = miri.filter(x => !cile.has(x));
  test('záložky míří na registrované cíle', chybi.length === 0, chybi);
}

/* Registrace nesmí spadnout v sadách bez DOM. */
test('vlozObrazekStart se v prostředí bez DOM tiše vypne',
  /function vlozObrazekStart\(\) \{\s*\n\s*if \(typeof document === 'undefined'/.test(src));

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
