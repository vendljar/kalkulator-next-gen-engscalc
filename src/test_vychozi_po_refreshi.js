/* ===== SLOUPEC VÝCHOZÍ PLATÍ I PO NAČTENÍ STRÁNKY =====
 * (nález J. V. 16. 9. 2026)
 *
 * „Po refreshi stránky se stále počítají příplatkové položky, které ale mají
 * být ve výchozím nastavení nepočítané. Když založím novou zakázku, tak už
 * je vše OK."
 *
 * Oprava z 10. 9. 2026 (`onlineZobrazeniDoCerstveZakazky`) měla vtisknout
 * sloupec Výchozí do zakázky, kterou aplikace zakládá při startu — tedy do
 * té, ve které se obchodník ocitne po každém načtení stránky. Celou dobu
 * byla mrtvá:
 *
 *     if (ZAK.cislo || ZAK.nazevAkce || ZAK.objednatel) return false;
 *
 * `novaZakazka()` totiž číslo nenechává prázdné — dosadí PŘEDLOHU
 * „2026 - OPR - CN - ", aby k ní obchodník dopsal pořadové číslo. Ta je
 * neprázdná, takže podmínka byla vždycky pravdivá a funkce se otočila na
 * prvním řádku. Přes tlačítko Nová zakázka to fungovalo, protože
 * `novaZakazkaUI()` matici nasazuje samo — proto se chyba schovala přesně
 * do refreshe a nikam jinam.
 *
 * `hlavickaVyplneno()` v zakazka.js na tohle existuje od začátku a předlohu
 * za vyplněnou hodnotu nepovažuje; do téhle podmínky se jen nedostala.
 */
const fs = require('fs');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');

global.DEFAULT_ZADANI = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const engProj = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = JSON.parse(JSON.stringify(engProj.DEFAULT_ZADANI_PROJ));
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
global.DEFAULT_TECHSPEC = require('./techspec.js').DEFAULT_TECHSPEC;
const zk = require('./zakazka.js');
Object.keys(zk).forEach(k => { global[k] = zk[k]; });
const zo = require('./zobrazeni.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* ---------- 1) jádro nálezu: předloha čísla není vyplněná hodnota ---------- */

const nova = zk.novaZakazka();
test('nová zakázka NEMÁ prázdné číslo — nese předlohu',
  String(nova.cislo || '').trim() !== '', nova.cislo);
test('ale hlavickaVyplneno ji za vyplněnou nepovažuje',
  zk.hlavickaVyplneno(nova.cislo) === false, nova.cislo);
test('a prostá pravdivost řetězce ano — v tom byla ta chyba',
  !!nova.cislo === true);
test('dopsané pořadové číslo už vyplněné je',
  zk.hlavickaVyplneno(nova.cislo + '0123') === true);
test('prázdný název akce vyplněný není', zk.hlavickaVyplneno(nova.nazevAkce) === false);

/* ---------- 2) podmínka v UI používá hlavickaVyplneno ---------- */
{
  const ui = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
  const fn = (ui.match(/function onlineZobrazeniDoCerstveZakazky\(\)[\s\S]*?\n\}/) || [''])[0];
  test('funkce existuje', fn.length > 0);
  test('a ptá se hlavickaVyplneno, ne holé pravdivosti',
    /vyplneno\(ZAK\.cislo\)/.test(fn), fn.slice(0, 200));
  test('holá podmínka `ZAK.cislo ||` je pryč',
    !/if \(ZAK\.cislo \|\| ZAK\.nazevAkce/.test(fn));
  /* Rozpracovaná zakázka se přepsat NESMÍ — to je druhá polovina pravidla. */
  test('pořád se kontroluje i název akce a objednatel',
    /vyplneno\(ZAK\.nazevAkce\)/.test(fn) && /vyplneno\(ZAK\.objednatel\)/.test(fn));
  test('a pořád se sahá jen na zakázku s jedinou variantou',
    /varianty\.length !== 1/.test(fn));
  test('i na tu, kde matice ještě nic nezměnila',
    /zobrazeniVychoziNedotcene\(/.test(fn));
}

/* ---------- 3) co matice s příplatky vlastně udělá ---------- */
{
  /* Matice nese jen ODCHYLKY: u příplatků výhradně ty, které se do nabídky
   * dávat nemají. Základ je „jde do nabídky". */
  const mat = { vychozi: {} };
  const KLIC = 'ock.priplatek:';   // prefix drží ZOBRAZENI_PRIPLATEK v zobrazeni.js
  ['prechodove', 'madlaBo', 'ventilator', 'demontazOhrazeni'].forEach(k => { mat.vychozi[KLIC + k] = false; });

  const d = zk.novaVariantaData();
  const zadaniOck = d.ock.zadani;
  const pred = (zadaniOck.priplatkyVynechat || []).slice();
  const zmen = zo.zobrazeniVychoziAplikuj(mat, zadaniOck, d.proj.zadani);

  test('vtisknutí matice něco změnilo', zmen > 0, zmen);
  test('a vyřazené příplatky sedí s maticí',
    ['prechodove', 'madlaBo', 'ventilator', 'demontazOhrazeni']
      .every(k => zadaniOck.priplatkyVynechat.indexOf(k) >= 0),
    zadaniOck.priplatkyVynechat);
  test('výchozí stav z kódu vypadal jinak — proto to bylo poznat',
    JSON.stringify(pred) !== JSON.stringify(zadaniOck.priplatkyVynechat), pred);

  /* A teď to podstatné: čerstvá zakázka je „nedotčená", takže se matice
   * vtisknout SMÍ — dokud do ní nikdo nesáhne. */
  const cerstva = zk.novaVariantaData();
  const vzor = zk.novaVariantaData();
  test('čerstvá zakázka je nedotčená',
    zo.zobrazeniVychoziNedotcene(cerstva.ock.zadani, cerstva.proj.zadani,
      vzor.ock.zadani, vzor.proj.zadani) === true);

  cerstva.ock.zadani.priplatkyVynechat = ['prechodove'];
  test('ale jakmile obchodník příplatek odškrtne, nedotčená není',
    zo.zobrazeniVychoziNedotcene(cerstva.ock.zadani, cerstva.proj.zadani,
      vzor.ock.zadani, vzor.proj.zadani) === false);
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
