/* Test šablony podkladů pro controlling (C3 #537, 27. 10. 2026).
 *
 * podklady/controlling/SABLONA_PODKLADU_CONTROLLING.xlsx vyrábí
 * nastroje/sablona_podkladu_controlling.py ze struktury kódu. Sada hlídá, že
 * uložený sešit pořád sedí na kód — přibude-li klíč ceníku PROJ nebo skupina,
 * spadne a šablonu je třeba vyrobit znovu (jinak by controlling vyplňoval
 * neúplný seznam). Dál: listy, řádky VZOR, žádná částka mimo VZOR, žádný
 * e-mail. */
const fs = require('fs');
const path = require('path');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 300))); } };

const nacti = f => { const m = require('./' + f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
['cenik.js', 'cenik_stari.js', 'engine.js', 'engine_proj.js'].forEach(nacti);
const C = nacti('controlling.js');
const DX = require('./docxgen.js');
global.zipPrecti = DX.zipPrecti;
const XL = require('./xlsx.js');

const SOUBOR = path.join(__dirname, '..', 'podklady', 'controlling', 'SABLONA_PODKLADU_CONTROLLING.xlsx');

(async () => {
  test('šablona je v repozitáři', fs.existsSync(SOUBOR));
  if (!fs.existsSync(SOUBOR)) return konec();
  test('nástroj šablony je v repozitáři', fs.existsSync(path.join(__dirname, '..', 'nastroje', 'sablona_podkladu_controlling.py')));
  const listy = await XL.xlsxPrecti(new Uint8Array(fs.readFileSync(SOUBOR)));
  const L = n => (listy.find(l => l.nazev === n) || { rows: [] }).rows;
  const ocek = ['Návod', 'Skupiny', 'Mapování PROJ', 'PROJ sazby a hodiny', 'Převodník CN–projekt', 'Otázky'];
  test('listy šablony', listy.map(l => l.nazev).join('|') === ocek.join('|'), listy.map(l => l.nazev));

  const v = C.ctrlVychozi();
  const data = n => L(n).slice(2).filter(r => r.length && !/VZOR|^vzor|^PC\.vzor$/.test(String(r[0]) + String(r[1])));
  const idsKod = v.skupiny.map(s => s.id);
  const idsSab = data('Skupiny').map(r => String(r[0]));
  test('Skupiny = číselník v kódu (id i pořadí)', JSON.stringify(idsSab) === JSON.stringify(idsKod), { sab: idsSab, kod: idsKod });

  const klKod = [];
  CENIK_DEF_PROJ.forEach(([, rows]) => rows.forEach(r => klKod.push(r[0])));
  const mapa = data('Mapování PROJ');
  const klSab = mapa.map(r => String(r[0]));
  test('Mapování PROJ = všechny klíče ceníku PROJ', JSON.stringify(klSab) === JSON.stringify(klKod), { sab: klSab, kod: klKod });
  test('navržená skupina PROJ = výchozí mapování v kódu', mapa.every(r => String(r[4]) === v.mapa[r[0]]),
    mapa.filter(r => String(r[4]) !== v.mapa[r[0]]).map(r => r[0]));

  ['Skupiny', 'Mapování PROJ', 'PROJ sazby a hodiny', 'Převodník CN–projekt']
    .forEach(n => test('list ' + n + ' má řádek VZOR', L(n).slice(2).some(r => /VZOR|vzor/.test(r.join(' ')))));
  const cisla = ['Skupiny', 'Mapování PROJ'].flatMap(n => data(n)).flat().filter(x => typeof x === 'number');
  test('převzatá struktura nenese žádné číslo (částku)', cisla.length === 0, cisla);
  const vse = listy.map(l => l.rows.map(r => r.join(' ')).join(' ')).join(' ');
  test('v šabloně není e-mail', !/[\w.+-]+@[\w-]+\.[\w.]+/.test(vse));
  test('Návod říká verzi struktury exportu', new RegExp('verze ' + C.CTRL_EXPORT_VERZE + '\\b').test(L('Návod').map(r => r.join(' ')).join(' ')));
  konec();
})().catch(e => { fail++; console.log('FAIL výjimka', e && e.stack || e); konec(); });

function konec() {
  console.log(`\n${ok} OK / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
}
