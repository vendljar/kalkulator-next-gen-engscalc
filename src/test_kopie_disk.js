/* KOPIE ZÁLOH NA DISK — čisté funkce (#151 N6, dávka O4, 19. 10. 2026).
 * Rozhodnutí J. V.: kopie jednou za 7 dní, hlídka nad 14 dní, složka
 * „_Zaloha Netlify DB", soubor otisk_YYYY-MM-DD.json. Spuštění:
 *   node src/test_kopie_disk.js */
const U = require('./uloziste.js');
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const ted = Date.parse('2026-10-19T12:00:00Z');
const pred = (dnu, hod) => new Date(ted - dnu * 86400000 - (hod || 0) * 3600000).toISOString();
const S = (k) => U.uloKopieDiskStav(k, ted);

test('konstanty podle rozhodnutí J. V.', U.ULO_KOPIE_DISK_SLOZKA === '_Zaloha Netlify DB'
  && U.ULO_KOPIE_DISK_INTERVAL_DNU === 7 && U.ULO_KOPIE_DISK_HLIDKA_DNU === 14);
test('žádná kopie → kopírovat i varovat', S(null).potreba === true && S(null).stara === true && /zatím žádná/.test(S(null).text));
test('nečitelný záznam = žádná kopie', S({ kdy: 'x' }).potreba && S({ kdy: 'x' }).stara);
test('6 dní → ještě nekopírovat, nevarovat', S({ kdy: pred(6, 23), soubor: 'a' }).potreba === false && S({ kdy: pred(6, 23) }).stara === false);
test('7 dní → kopírovat (týdenní), nevarovat', S({ kdy: pred(7), soubor: 'a' }).potreba === true && S({ kdy: pred(7) }).stara === false);
test('14 dní → ještě nevarovat', S({ kdy: pred(14, 23) }).stara === false && S({ kdy: pred(14, 23) }).dnu === 14);
test('15 dní → varovat (starší než 14 dní)', S({ kdy: pred(15), soubor: 'otisk_2026-10-04.json' }).stara === true
  && /stará 15 dní/.test(S({ kdy: pred(15), soubor: 'otisk_2026-10-04.json' }).text)
  && /otisk_2026-10-04\.json/.test(S({ kdy: pred(15), soubor: 'otisk_2026-10-04.json' }).text));
test('čerstvá kopie má klidný text se jménem souboru', /Poslední kopie/.test(S({ kdy: pred(1), soubor: 'otisk_x.json' }).text));
test('jméno souboru podle dne otisku', U.uloKopieDiskJmeno('2026-10-18') === 'otisk_2026-10-18.json');
test('neplatný den → dnešek, nikdy cesta', /^otisk_\d{4}-\d{2}-\d{2}\.json$/.test(U.uloKopieDiskJmeno('../../x')));
console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
