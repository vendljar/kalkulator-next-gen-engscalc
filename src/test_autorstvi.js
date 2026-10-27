/* Autorská poznámka (#530, pokyn J. V. 27. 10. 2026: „stačí pouze v kódu,
 * že jsem původním autorem této aplikace").
 *
 * Ověřuje přesné znění poznámky v AUTORSTVI.md, v hlavičkách hlavních zdrojů
 * (src/engine.js, src/cenik.js, src/ui/common.js, netlify/lib/sdilene.mjs,
 * build.py, README_ZDROJAKY.md) a v sestaveném dist/kalkulacka.html
 * (+ dist/index.html a verzovaný soubor podle verze.txt). Smazání nebo změna
 * kteréhokoli výskytu = test selže → testovací kolo i Actions spadnou.
 * Hlavičky se hlídají na PRVNÍM řádku (u build.py hned za shebangem), poznámka
 * v sestavení hned za <!DOCTYPE html>. Chybí-li dist/ (job mutací bez buildu),
 * ověří se aspoň vkládání v build.py; job „testy" sestavuje vždy. */
const fs = require('fs');
const path = require('path');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info || ''); } };

const KOREN = path.join(__dirname, '..');
const TEXT = 'Původní autor aplikace Kalkulator Next Gen: Jaroslav Vendl (ENG-JV). Autorství vzniklo v roce 2026; tato poznámka se nesmí odstranit ani změnit.';
const cti = f => { try { return fs.readFileSync(path.join(KOREN, f), 'utf8'); } catch (e) { return null; } };
const radky = f => (cti(f) || '').split('\n');

test('AUTORSTVI.md nese přesné znění', (cti('AUTORSTVI.md') || '').split('\n').includes(TEXT));

const HLAVICKY = [
  ['src/engine.js', 0, '/* ' + TEXT + ' */'],
  ['src/cenik.js', 0, '/* ' + TEXT + ' */'],
  ['src/ui/common.js', 0, '/* ' + TEXT + ' */'],
  ['netlify/lib/sdilene.mjs', 0, '/* ' + TEXT + ' */'],
  ['README_ZDROJAKY.md', 0, '<!-- ' + TEXT + ' -->'],
  ['build.py', 1, '# ' + TEXT],
];
for (const [f, i, ocek] of HLAVICKY) test('hlavička ' + f, radky(f)[i] === ocek, JSON.stringify(radky(f)[i]));

const build = cti('build.py') || '';
test('build.py vkládá přesné znění', build.includes("AUTORSTVI = '" + TEXT + "'\n"));
test('build.py vkládá poznámku za <!DOCTYPE html>',
  build.includes("lambda m: m.group(1) + '<!-- ' + AUTORSTVI + ' -->\\n'"));

const verze = (cti('verze.txt') || '').trim();
const SESTAVENI = ['dist/kalkulacka.html', 'dist/index.html', 'dist/kalkulacka_v' + verze + '.html'];
if (cti(SESTAVENI[0]) === null) {
  console.log('INFO dist/kalkulacka.html chybí (bez buildu) — sestavení se neověřilo');
} else {
  for (const f of SESTAVENI) {
    const r = radky(f);
    test('sestavení ' + f + ' nese poznámku na začátku', r[0] === '<!DOCTYPE html>' && r[1] === '<!-- ' + TEXT + ' -->', JSON.stringify(r.slice(0, 2)));
  }
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
