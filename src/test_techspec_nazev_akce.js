/* NÁZEV AKCE V TECHNICKÉ SPECIFIKACI Z HLAVIČKY ZAKÁZKY (připomínka obchodu,
 * rozhodnutí J. V. 14. 10. 2026).
 *
 * Do 14. 10. nesla specifikace vlastní název akce z číselníku („vestavba
 * nové prosklené OCK výtahové šachty") — obchodník ho přepisoval ručně
 * a příloha smlouvy měla jiný název než nabídka. Nově:
 *   - výchozí = název akce z hlavičky zakázky (a mění se s ní),
 *   - ruční přepis zůstává (TS.nazevAkceRucne = true, v UI štítek „ručně"),
 *     ↺ vrátí převzatý,
 *   - data před 14. 10. (volba chybí) s vyplněným textem se berou jako ruční,
 *     takže uložená ani odeslaná specifikace se nemění.
 *
 * Spuštění: cd src && node test_techspec_nazev_akce.js */
const fs = require('fs');
const path = require('path');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const TSm = nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
const zk = nacti('./zakazka.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

test('techspec.js exportuje tsNazevAkce', typeof TSm.tsNazevAkce === 'function');
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }
const NA = TSm.tsNazevAkce;

/* ---- nová zakázka: název z hlavičky ---- */
{
  const z = zk.novaZakazka(), ts = z.varianty[0].data.techspec;
  test('nová varianta: specifikace nemá vlastní název ani ruční přepis', ts.nazevAkce === '' && ts.nazevAkceRucne === false, ts);
  z.nazevAkce = 'Bytový dům Zkušební 12 — výtah';
  test('nová varianta: název akce = hlavička zakázky (převzatý)', NA(ts, z).text === z.nazevAkce && NA(ts, z).rucne === false, NA(ts, z));
  z.nazevAkce = 'Bytový dům Zkušební 14 — výtah';
  test('změna hlavičky se propíše (nic se nekopíruje)', NA(ts, z).text === 'Bytový dům Zkušební 14 — výtah');
  const k = TSm.tsKontrola(ts, null, null, null, z);
  test('kontrola hlavičky: převzatý název akce = vyplněno', !k.hlavicka.some(x => x.id === 'nazevAkce'), k.hlavicka);
  z.nazevAkce = '';
  const k2 = TSm.tsKontrola(ts, null, null, null, z);
  test('kontrola hlavičky: prázdná hlavička = název akce chybí', k2.hlavicka.some(x => x.id === 'nazevAkce'), k2.hlavicka);
}

/* ---- ruční přepis a návrat ---- */
{
  const z = zk.novaZakazka(), ts = z.varianty[0].data.techspec;
  z.nazevAkce = 'Bytový dům Zkušební 12 — výtah';
  ts.nazevAkce = 'vestavba nové prosklené OCK výtahové šachty'; ts.nazevAkceRucne = true;
  test('ruční přepis platí a je označený', NA(ts, z).text === 'vestavba nové prosklené OCK výtahové šachty' && NA(ts, z).rucne === true);
  z.nazevAkce = 'Jiný název';
  test('ruční přepis hlavička nepřebije', NA(ts, z).text === 'vestavba nové prosklené OCK výtahové šachty');
  ts.nazevAkceRucne = false;
  test('↺ (nazevAkceRucne=false) vrátí převzatý název, ruční text zůstane schovaný', NA(ts, z).text === 'Jiný název' && NA(ts, z).rucne === false);
  ts.nazevAkce = ''; ts.nazevAkceRucne = true;
  test('ruční prázdno je ruční prázdno (povinné pole ho ohlásí)', NA(ts, z).text === '' && NA(ts, z).rucne === true
    && TSm.tsKontrola(ts, null, null, null, z).hlavicka.some(x => x.id === 'nazevAkce'));
}

/* ---- data před 14. 10. 2026 (volba chybí) ---- */
{
  const z = zk.novaZakazka();
  z.nazevAkce = 'Bytový dům Zkušební 12 — výtah';
  const stara = { nazevAkce: 'přístavba nové OCK výtahové šachty včetně opláštění', hodnoty: {}, extra: [] };
  test('stará data s textem: platí uložený text jako ruční (specifikace se nemění)',
    NA(stara, z).text === 'přístavba nové OCK výtahové šachty včetně opláštění' && NA(stara, z).rucne === true);
  test('stará data bez textu: převezme se hlavička', NA({ nazevAkce: '', hodnoty: {} }, z).text === z.nazevAkce
    && NA({ hodnoty: {} }, z).text === z.nazevAkce);
  z.varianty[0].data.techspec = stara;
  const imp = zk.importZakazka(JSON.parse(JSON.stringify(z)));
  test('import staré zakázky volbu nedoplní (text zůstává ruční)', !('nazevAkceRucne' in imp.varianty[0].data.techspec)
    && NA(imp.varianty[0].data.techspec, imp).text === stara.nazevAkce);
  test('bez zakázky a specifikace nic nespadne', NA(null, null).text === '' && NA(undefined, {}).rucne === false);
}

/* ---- UI: pole jde přes tsNazevAkce, přepis přes set() (zámek), štítek ručně a ↺ ---- */
{
  const ui = fs.readFileSync(path.join(__dirname, 'ui', 'techspec_ui.js'), 'utf8');
  test('UI: řádek NÁZEV AKCE kreslí tsNazevAkceRadek (žádný přímý zápis TS.nazevAkce z inputu)',
    /\$\{tsNazevAkceRadek\(\)\}/.test(ui) && !/value="\$\{esc\(TS\.nazevAkce\)\}"/.test(ui));
  test('UI: přepis i návrat jdou přes set() (zámek odeslané nabídky)',
    /set\('TS\.nazevAkceRucne', true\)/.test(ui) && /set\('TS\.nazevAkceRucne', false\)/.test(ui) && /set\('TS\.nazevAkce', v\)/.test(ui));
  test('UI: štítky „ručně" s ↺ a „z hlavičky zakázky"', /tsNazevAkceVrat\(\)/.test(ui) && />ručně</.test(ui) && /z hlavičky zakázky/.test(ui));
  test('UI: cizojazyčný náhled převzatý název nepřekládá (vlastní jméno)', /row\('NÁZEV AKCE', na\.text, !na\.rucne\)/.test(ui));
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
