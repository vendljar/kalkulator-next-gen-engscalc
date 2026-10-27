/* #539 — sloupec Administrátor v matici zobrazení (pokyn J. V. 27. 10. 2026:
 * „Do konfigurace zobrazení mi ještě přidej sloupec zobrazení Administrátora.
 *  Ani já už nepotřebuji zobrazovat některé položky.")
 *
 * Hlídá model (src/zobrazeni.js):
 *  1) výchozí stav = dnešek: administrátor vidí všechno, odchylek 0;
 *  2) skrytí ve sloupci platí jen pro OBRAZOVKU (zobrazeniVidi) — práva
 *     (zobrazeniSmi, ptá se na ně server) zůstávají „administrátor smí vždy";
 *  3) prvky nutné k návratu (adminZamek) skrýt nejde ani maticí, očista je
 *     drží zaškrtnuté a zobrazeniAdminZamekPorusen je nahlásí (server podle
 *     toho uložení odmítne);
 *  4) stará matice bez sloupce = vše viditelné; odchylky počítají i sloupec;
 *  5) doporučení pro administrátora: zamčené vidí, složka _DB skrytá.
 *
 * Pojistka: proti 62ea0c8 (v27.10.1, před změnou) sada padá hned na prvních
 * kontrolách (ZOBRAZENI_ROLE_MATICE ani zobrazeniVidi neexistují); po změně
 * projde celá.
 *
 * Spuštění: node src/test_zobrazeni_admin.js */
const Z = require('./zobrazeni.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : info); } };
const A = 'Administrátor';

test('sloupce matice: Obchodník, Vedoucí, Administrátor (v tomto pořadí)',
  JSON.stringify(Z.ZOBRAZENI_ROLE_MATICE) === JSON.stringify(['Obchodník', 'Vedoucí', A]), Z.ZOBRAZENI_ROLE_MATICE);
test('přidělitelné role se nemění (náhled role, práva)',
  JSON.stringify(Z.ZOBRAZENI_ROLE_PRIDELITELNE) === JSON.stringify(['Obchodník', 'Vedoucí']));

const klice = Z.ZOBRAZENI_PRVKY.map(p => p.klic);
const zamcene = Z.zobrazeniAdminZamcene ? Z.zobrazeniAdminZamcene() : [];
const volne = klice.filter(k => zamcene.indexOf(k) < 0);

/* ---------- 1) výchozí stav ---------- */
const v = Z.zobrazeniVychozi();
test('výchozí matice má sloupec Administrátor u každého prvku, vše zaškrtnuté',
  klice.every(k => v[k][A] === true));
test('výchozí matice nemá žádnou odchylku', Z.zobrazeniZmeny(v).length === 0, Z.zobrazeniZmeny(v));
test('administrátor ve výchozím stavu vidí každý prvek',
  klice.every(k => Z.zobrazeniVidi(A, k, v) === true && Z.zobrazeniVidi(A, k, null) === true));

/* ---------- 2) skrytí = jen obrazovka ---------- */
const skryto = {}; volne.forEach(k => { skryto[k] = { [A]: false }; });
test('odškrtnutý nezamčený prvek administrátor nevidí',
  volne.length > 10 && volne.every(k => Z.zobrazeniVidi(A, k, skryto) === false));
test('práva administrátora (zobrazeniSmi, server) se skrytím nemění',
  klice.every(k => Z.zobrazeniSmi(A, k, skryto) === true));
test('ostatním role sloupec Administrátor nic nemění',
  klice.every(k => ['Obchodník', 'Vedoucí'].every(r =>
    Z.zobrazeniVidi(r, k, skryto) === Z.zobrazeniSmi(r, k, {}))));
test('neznámý klíč: administrátor vidí (o ovládání nepřijde), obchodník ne (B176)',
  Z.zobrazeniVidi(A, 'neco.co.neni', { 'neco.co.neni': { [A]: false } }) === true
  && Z.zobrazeniVidi('Obchodník', 'neco.co.neni', {}) === false);

/* ---------- 3) zámek proti zamčení se ---------- */
['nastaveni.otevrit', 'nastaveni.zobrazeni', 'nastaveni.uzivatele', 'nastaveni.firma',
 'nastaveni.konfigurace', 'cenik.zverejnit', 'zaloha.vynucena'].forEach(k =>
  test('zamčený pro administrátora: ' + k, zamcene.indexOf(k) >= 0, zamcene));
const zkusSkryt = {}; klice.forEach(k => { zkusSkryt[k] = { [A]: false }; });
test('zamčené prvky administrátor vidí, i když je matice odškrtne',
  zamcene.every(k => Z.zobrazeniVidi(A, k, zkusSkryt) === true));
const oc = Z.zobrazeniOciste(zkusSkryt);
test('očista drží zamčené prvky zaškrtnuté', zamcene.every(k => oc[k][A] === true));
test('očista nezamčené odškrtnutí zachová', volne.every(k => oc[k][A] === false));
test('porušení zámku se nahlásí (podklad pro odmítnutí serverem)',
  JSON.stringify(Z.zobrazeniAdminZamekPorusen(zkusSkryt).sort()) === JSON.stringify(zamcene.slice().sort()));
test('matice bez sloupce Administrátor zámek neporušuje',
  Z.zobrazeniAdminZamekPorusen({ 'nastaveni.otevrit': { 'Obchodník': false } }).length === 0
  && Z.zobrazeniAdminZamekPorusen(null).length === 0
  && Z.zobrazeniAdminZamekPorusen({ 'nastaveni.otevrit': { [A]: true } }).length === 0);
test('pevné prvky ostatním dál nesvítí ani s maticí od administrátora',
  Z.ZOBRAZENI_PRVKY.filter(p => p.pevne).every(p => oc[p.klic]['Obchodník'] === false));

/* ---------- 4) migrace staré matice ---------- */
const stara = {}; klice.forEach(k => { stara[k] = { 'Obchodník': false, 'Vedoucí': true }; });
const ocS = Z.zobrazeniOciste(stara);
test('stará matice bez sloupce Administrátor = administrátor vidí vše',
  klice.every(k => ocS[k][A] === true && Z.zobrazeniVidi(A, k, stara) === true));
test('odchylky počítají i sloupec Administrátor',
  Z.zobrazeniZmeny({ 'tab.cenik': { [A]: false } }).some(z => z.klic === 'tab.cenik' && z.role === A)
  && Z.zobrazeniZmeny({ 'tab.cenik': { [A]: false } }).length === 1);

/* ---------- 5) předlohy ---------- */
test('doporučení: zamčené prvky administrátor vidí',
  zamcene.every(k => Z.zobrazeniPredloha(Z.zobrazeniPrvek(k), A, 'navrh') === true));
test('doporučení: složku _DB (mrtvý archiv) administrátorovi skrýt',
  Z.zobrazeniPredloha(Z.zobrazeniPrvek('uloziste.slozka'), A, 'navrh') === false
  && Z.zobrazeniPredloha(Z.zobrazeniPrvek('uloziste.mazani'), A, 'navrh') === false);
test('doporučení: běžné prvky administrátor vidí (např. ceník, detail výpočtu)',
  ['tab.cenik', 'tab.detail', 'kpi.marze'].every(k => Z.zobrazeniPredloha(Z.zobrazeniPrvek(k), A, 'navrh') === true));
test('dnešek (vychozi): administrátor vidí vše',
  Z.ZOBRAZENI_PRVKY.every(p => Z.zobrazeniPredloha(p, A, 'vychozi') === true));
test('předloha u pevného prvku ostatním nikdy',
  Z.ZOBRAZENI_PRVKY.filter(p => p.pevne).every(p => Z.zobrazeniPredloha(p, 'Vedoucí', 'navrh') === false));

/* ---------- 6) klient se na obrazovku ptá zobrazeniVidi ---------- */
{
  const fs = require('fs');
  const common = fs.readFileSync(__dirname + '/ui/common.js', 'utf8');
  const m = common.match(/function smiZobrazit\(klic\) \{[\s\S]*?\n\}/);
  test('smiZobrazit v prohlížeči volá zobrazeniVidi (ne zobrazeniSmi)',
    !!m && /zobrazeniVidi\(zobrazeniRole\(\), klic/.test(m[0]) && !/zobrazeniSmi\(/.test(m[0]), m && m[0]);
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
