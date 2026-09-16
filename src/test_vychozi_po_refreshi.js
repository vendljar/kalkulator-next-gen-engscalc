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

/* ---------- 4) proč zmizely řádky lešení z příplatků (16. 9. 2026) ----------
 *
 * J. V.: „myslím, že mi v testovacím rozhraní u příplatkové výbavy chybí
 * minimálně dva řádky lešení."
 *
 * Věcně je to správně: lešení je v aplikaci na dvou místech — ve VOLITELNÝCH
 * (v základní ceně) a v PŘÍPLATCÍCH (k doobjednání). Co je zaškrtnuté ve
 * Volitelných, vypadne z příplatků, aby se nezapočítalo dvakrát. Tahle sada
 * to drží, aby se z „opravy" nestalo dvojí započtení.
 *
 * Co se opravdu opravilo, je viditelnost: řádek dřív jen zmizel a nikde nebylo
 * poznat proč.
 */
{
  const ZCx = require('./zkusebni_cenik.js');
  const engx = require('./engine.js');
  const JE = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));
  const zad = (vol) => {
    const z = JSON.parse(JSON.stringify(engx.DEFAULT_ZADANI));
    Object.assign(z, { typSachty: 'exteriérová', zaskleni: 'na terče',
      sirka: 1.6, hloubka: 1.8, zdvih: 15, prejezd: 2, prohluben: 0, nastupiste: 5 });
    Object.assign(z.volitelne, vol); return z;
  };
  const les = (vol) => engx.vypocet(zad(vol), ZCx.zkusebniCenik(), JE, false)
    .priplatky.filter(p => /LEŠENÍ/.test(p.nazev)).map(p => p.nazev);

  test('výchozí zadání má ve Volitelných jen lešení vnitřní',
    engx.DEFAULT_ZADANI.volitelne.leseniVnitrni === true
    && !engx.DEFAULT_ZADANI.volitelne.leseniHlava
    && !engx.DEFAULT_ZADANI.volitelne.leseniVnejsi, engx.DEFAULT_ZADANI.volitelne);
  test('takže v příplatcích zbývají právě ty dva řádky, které J. V. postrádal',
    les({ leseniVnitrni: true, leseniHlava: false, leseniVnejsi: false }).join('|')
      === 'LEŠENÍ - dokončení hlavy šachty|LEŠENÍ - vnější');
  test('se vším ve Volitelných nezbude v příplatcích žádné lešení',
    les({ leseniVnitrni: true, leseniHlava: true, leseniVnejsi: true }).length === 0);
  test('a bez Volitelných jsou v příplatcích všechna tři',
    les({ leseniVnitrni: false, leseniHlava: false, leseniVnejsi: false }).length === 3);

  const ui = require('fs').readFileSync(__dirname + '/ui/kalk_ock.js', 'utf8');
  test('tabulka příplatků vysvětlí, co vypadlo do Volitelných',
    /function priplatkyVeVolitelnych\(r\)/.test(ui));
  /* Funkce, kterou nikdo nevolá, nic nevysvětlí — mutace „vysvětlení se
   * nekreslí" mi napoprvé prošla právě proto, že tahle kontrola chyběla. */
  test('a opravdu se v té tabulce kreslí',
    /\$\{priplatkyVeVolitelnych\(r\)\}/.test(ui));
  test('a vypisuje konkrétní názvy, ne obecnou větu',
    /skryte\.map\(x => x\.nazev\)\.join/.test(ui));
  /* Escapuje se jedním voláním kolem celého spojeného textu — po položkách
   * by to bylo stejně bezpečné, ale statický hlídač v test_escape.js vidí jen
   * vnější výraz a `join()` mu bezpečný nepřipadá. */
  test('a názvy jsou escapované', /const nazvy = esc\(skryte\.map/.test(ui));
  test('bere je z katalogu volitelných, ne z vlastního seznamu',
    /r\.volitelneKatalog/.test(ui) && /x\.zahrnuto && \/LEŠENÍ\/i/.test(ui));
  /* SPRÁVCE MUSÍ TY ŘÁDKY VIDĚT (J. V. 16. 9. 2026: „ty položky by měly být
   * každopádně viditelné minimálně pro administrátora a to nejsou").
   *
   * Ověřeno v prohlížeči na testovacím webu: v matici Výchozí je zveřejněno
   * `ock.leseniHlava=true`, `ock.leseniVnejsi=true`, `ock.sokl=true`
   * a `ock.prechMont=true`, takže jádro je z příplatků správně vynechá.
   * Správce ale kouká do ceníku variant a řádky z něj beze stopy zmizí. */
  test('tabulka příplatků vypisuje i to, co je v základní ceně',
    /function priplatkyZakladniCena\(r, col\)/.test(ui));
  test('a opravdu se to kreslí', /\$\{priplatkyZakladniCena\(r, col\)\}/.test(ui));
  test('jen pro správce — obchodníkovi by to v ceníku překáželo',
    /function priplatkyZakladniCena\(r, col\) \{\s*\n\s*if \(!col\.admin\) return '';/.test(ui));
  test('bere je z katalogu volitelných podle zahrnuto',
    /kat\.filter\(x => x\.zahrnuto\);/.test(ui));
  /* `dostupne` se do katalogu nepřenáší — filtrovat na něj vrátí prázdno.
   * Stalo se mi to napoprvé a odhalil to až pohled do běžící aplikace. */
  test('a NEfiltruje na dostupne, které v katalogu není',
    !/x\.zahrnuto && x\.dostupne/.test(ui));
  test('řádky jsou ztlumené a bez zaškrtávátka Nabídka',
    /<tr class="nezahrnuto"><td><\/td>/.test(ui.replace(/\s+/g, ' ')) || /class="nezahrnuto"/.test(ui));
  test('cena se u nich neuvádí — nepočítají se sem', /<td>—<\/td>/.test(ui));

  test('a nic nepočítá — je to jen vysvětlení',
    !/priplatkyVeVolitelnych[\s\S]{0,400}naklad|priplatkyVeVolitelnych[\s\S]{0,400}sMarzi/.test(ui));
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
