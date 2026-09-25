/* Dodatkové texty se neztrácejí (25. 9. 2026, hlášení J. V.: „z aplikace se
 * mi v čase ztrácí dodatkové texty, které jsem tam vepsal. Myslím, že pro ně
 * potřebujeme samostatný číselník, resp. pole v ceníku nákladů OCK").
 *
 * Tři příčiny, tři pojistky:
 *   1. server přepisoval celou mapu tím, co poslal prohlížeč (druhé okno
 *      mazalo texty prvního) — hlídá netlify/test_prava.mjs;
 *   2. texty se vlévaly jen do NOVÝCH zakázek; rozpracovaná zakázka
 *      založená dřív je neměla → `popisyDoplnChybejici` při otevření;
 *   3. neexistovalo místo, kde texty trvale spravovat nezávisle na zakázce
 *      → číselník `popisyCiselnik` v Ceníku OCK. */
const ck = require('./cenik.js');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const JEKLY = require('./jekly.json');
Object.assign(global, ck);
const cs = require('./cenik_stari.js');
Object.assign(global, cs);
const zm = require('./zamek.js');
global.variantaUzamcena = zm.variantaUzamcena;

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

/* ---------- popisyDoplnChybejici ---------- */
{
  const c = { popisy: { 'A': 'vlastní text zakázky', 'B': '' } };
  const n = ck.popisyDoplnChybejici(c, { A: 'společný A', B: 'společný B', C: 'společný C', D: '  ' });
  test('doplní jen chybějící klíč', n === 1 && c.popisy.C === 'společný C', c.popisy);
  test('vlastní text zakázky nepřepíše', c.popisy.A === 'vlastní text zakázky');
  test('vědomě prázdný text („tady nechci") nechá prázdný', c.popisy.B === '');
  test('prázdný společný text nic nedoplní', !('D' in c.popisy));
  const bez = {};
  test('ceník bez popisů dostane mapu', ck.popisyDoplnChybejici(bez, { X: 'x' }) === 1 && bez.popisy.X === 'x');
  test('bez textů nic nedělá a nespadne', ck.popisyDoplnChybejici(bez, null) === 0
    && ck.popisyDoplnChybejici(null, { X: 'x' }) === 0);
}

/* ---------- otevření rozpracované zakázky ---------- */
{
  const cenik = ZC.zkusebniCenik();
  const dnesni = { cenik: Object.assign(JSON.parse(JSON.stringify(cenik)),
    { popisy: { 'VENTILÁTOR (EXT)': 'Ventilátor s termostatem.' } }), proj: { cenik: {} } };
  const mk = (id) => ({ id, data: { cenik: JSON.parse(JSON.stringify(cenik)), ock: { zadani: {} } } });
  const rozprac = mk('v1'), zamcena = mk('v2');
  zamcena.zamek = { zamceno: true, typ: 'nabidka', cislo: 'X' };
  const zak = { cislo: '2026 - OPR - CN - 1', varianty: [rozprac, zamcena] };
  const r = cs.cenikPrepoctiRozpracovane(zak, dnesni, {});
  test('rozpracovaná varianta dostane společný text',
    (rozprac.data.cenik.popisy || {})['VENTILÁTOR (EXT)'] === 'Ventilátor s termostatem.', rozprac.data.cenik.popisy);
  test('uzamčená (odeslaná) varianta se nezmění', !(zamcena.data.cenik.popisy || {})['VENTILÁTOR (EXT)']);
  test('výsledek hlásí doplněné texty (autosave je uloží)', r.popisy === 1, r.popisy);
  test('doplnění textu není přepočet cen (žádný dialog o ceně)', r.prepocteno === 0 && r.zmen === 0, r);
  const r2 = cs.cenikPrepoctiRozpracovane(zak, dnesni, {});
  test('druhé otevření už nic nedoplňuje (nezapíná autosave dokola)', r2.popisy === 0, r2.popisy);
}

/* ---------- číselník ---------- */
{
  const C = ZC.zkusebniCenik();
  const vyp = (z, c) => eng.vypocet(z, c, JEKLY, true);
  const cis = ck.popisyCiselnik(vyp, eng.DEFAULT_ZADANI, C,
    { 'Sklo VSG s mléčnou fólií': 'Mléčné sklo.', 'ZRUŠENÁ POLOŽKA': 'Starý text.' });
  const najdi = k => cis.radky.find(r => r.klic === k);
  test('číselník má příplatky i volitelné položky',
    cis.radky.some(r => r.skupina === 'Příplatky') && cis.radky.some(r => r.skupina === 'Volitelné položky'),
    cis.radky.map(r => r.skupina));
  test('položka jen pro exteriér je v číselníku i u interiérové zakázky (EXT)',
    !!najdi('VENTILÁTOR (EXT)') && najdi('VENTILÁTOR (EXT)').typy.join() === 'EXT', najdi('VENTILÁTOR (EXT)'));
  test('položka pro oba typy nese EXT + INT',
    najdi('Sklo VSG s mléčnou fólií').typy.length === 2, najdi('Sklo VSG s mléčnou fólií'));
  test('text položky se ukáže u ní', najdi('Sklo VSG s mléčnou fólií').text === 'Mléčné sklo.');
  test('madla boční a zadní jsou dva řádky (dva výrobky, jedna sazba)',
    !!najdi('MADLA NA BOČNÍCH STĚNÁCH (dřevo, lak)') && !!najdi('MADLA NA ZADNÍ STĚNĚ (dřevo, lak)'));
  test('text k položce, kterou výpočet nezná, se nezahodí (osiřelé)',
    cis.osirele.length === 1 && cis.osirele[0].klic === 'ZRUŠENÁ POLOŽKA', cis.osirele);
  test('každá položka číselníku má ceníkovou vazbu', cis.radky.every(r => !!r.cenaPath));
  test('klíče jsou jedinečné', new Set(cis.radky.map(r => r.klic)).size === cis.radky.length);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
