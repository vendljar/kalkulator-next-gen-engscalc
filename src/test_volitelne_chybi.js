/* Zadání bez objektu volitelných položek (N57, hloubkový test 24. 9. 2026).
 *
 * Zakázka, jejíž zadání OCK nemělo `volitelne` (ručně upravený soubor,
 * poškozená záloha), shodila výpočet výjimkou „Cannot read properties of
 * undefined (reading 'prechodove')" a obrazovka zůstala prázdná. Teď:
 *   – import doplní prázdný objekt (nic se tiše nezaškrtne),
 *   – jádro samo nespadne ani bez importu,
 *   – u běžné zakázky se výsledek nemění ani o korunu.
 */
Object.assign(global, require('./format.js'), require('./engine.js'), require('./engine_proj.js'),
  require('./techspec.js'), require('./sleva.js'), require('./zaokrouhleni.js'), require('./zamek.js'),
  require('./zakazka.js'));
const zk = require('./zakazka.js');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const J = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const kopie = x => JSON.parse(JSON.stringify(x));

function zakazka(uprav) {
  const z = zk.novaZakazka();
  Object.assign(z.varianty[0].data.cenik, ZC.zkusebniCenik());
  if (uprav) uprav(z.varianty[0].data.ock.zadani);
  return z;
}
const spocti = (zadani, cenik) => { try { return eng.vypocet(zadani, cenik, J); } catch (e) { return { chyba: e.message }; } };

const vzor = zakazka();
const rVzor = spocti(vzor.varianty[0].data.ock.zadani, vzor.varianty[0].data.cenik);
test('(běžná zakázka se spočítá)', !rVzor.chyba && Number.isFinite(rVzor.cenaBezDph || rVzor.celkemBezDph || 0), rVzor.chyba);

for (const [popis, hod] of [['chybí', undefined], ['null', null], ['řetězec', 'x'], ['číslo', 5], ['pole', []]]) {
  const z = zakazka(zo => { if (hod === undefined) delete zo.volitelne; else zo.volitelne = hod; });
  const zz = zk.importZakazka(kopie(z));
  const zo = zz.varianty[0].data.ock.zadani;
  test(`import: volitelne ${popis} → prázdný objekt`, zo.volitelne && typeof zo.volitelne === 'object'
    && !Array.isArray(zo.volitelne) && Object.keys(zo.volitelne).length === 0, zo.volitelne);
  const r = spocti(zo, zz.varianty[0].data.cenik);
  test(`import: volitelne ${popis} → výpočet nespadne`, !r.chyba, r.chyba);
  /* Jádro samo, bez importu (např. serverový přepočet ze zálohy). */
  const syrove = kopie(z.varianty[0].data.ock.zadani);
  const r2 = spocti(syrove, z.varianty[0].data.cenik);
  test(`jádro: volitelne ${popis} → výpočet nespadne`, !r2.chyba, r2.chyba);
}

/* Existující volby se importem nepřepíšou. */
const s = zakazka(zo => { zo.volitelne = Object.assign({}, zo.volitelne, { leseniVnejsi: true }); });
const si = zk.importZakazka(kopie(s));
test('import: existující volby zůstanou', JSON.stringify(si.varianty[0].data.ock.zadani.volitelne)
  === JSON.stringify(s.varianty[0].data.ock.zadani.volitelne));
const rS = spocti(si.varianty[0].data.ock.zadani, si.varianty[0].data.cenik);
const rS0 = spocti(s.varianty[0].data.ock.zadani, s.varianty[0].data.cenik);
test('výsledek běžné zakázky se importem nemění', JSON.stringify(rS) === JSON.stringify(rS0));

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
