/* MU3 #560 — VÝŠKA SLOUPŮ NAVÍC A DESETINNÁ ČÁRKA V KARTĚ MŮSTKY
 * (připomínka J. V. 6. 11. 2026, snímek: zdvih 17,3 m, horní přejezd 2,7 m,
 * prohlubeň 1,05 m; u sloupů šedá nápověda „17.3": „jaká je výška šachty
 * při zdvihu 17,3 m? Myslím, že to není totéž a sloupy můstků potom
 * neodpovídají. pozor na formát můstků, používáš tečku místo čárky").
 *
 * Hlídá:
 *  – prázdná výška sloupu = délka rohového sloupku šachty, tj. výška šachty
 *    H = prohlubeň + zdvih + přejezd mínus 0,2 m (`dSloupky` v jádru); do
 *    MU3 to byl zdvih;
 *  – vyplněná výška platí beze změny, bez sloupů navíc se cena nemění;
 *  – Model 1 sloupy dál nezná;
 *  – vstup „17,3" i „17.3" (i počet kusů „2") se přečte jako číslo;
 *  – nápověda v kartě i bublina s českou čárkou, žádná tečka;
 *  – poznámka řádku kalkulace, krycí list a specifikace (CZ/DE čárka,
 *    EN tečka podle zvyklosti aplikace).
 * Pojistka: na 7632ca5 selže (výchozí výška 17,3 = zdvih, nápověda „17.3",
 * „17,3" se čte jako prázdno, poznámka „… 34.6 m"); po opravě projde.
 * Spuštění: cd src && node test_560_mu3_sloupy.js */
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
const F = nacti('./format.js');
nacti('./preklad.js');
const E = nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const TS = nacti('./techspec.js');
const KR = require('./kryci.js');
const J = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };
const kop = x => JSON.parse(JSON.stringify(x));
const blizko = (a, b) => Math.abs(a - b) < 1e-6;
const C354 = () => Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky());
/* rozměry ze snímku J. V. */
const ZAD = (zm) => Object.assign(kop(E.DEFAULT_ZADANI), { prejezd: 2.7, zdvih: 17.3, prohluben: 1.05, sirka: 1.6, hloubka: 2.1 }, zm || {});
const H = 1.05 + 17.3 + 2.7;          // 21,05 m
const VYCH = 20.85;                    // H − 0,2 m = rohový sloupek

/* 1) výchozí výška = délka rohového sloupku */
test('mustekSloupVychoziM = výška šachty − 0,2 m (20,85 m)', typeof E.mustekSloupVychoziM === 'function'
  && blizko(E.mustekSloupVychoziM(ZAD()), VYCH), typeof E.mustekSloupVychoziM === 'function' && E.mustekSloupVychoziM(ZAD()));
test('odpočet je týž jako u rohového sloupku (0,2 m)', E.MUSTEK_SLOUP_ODPOCET_M === 0.2);
{
  const rozpad = E.mustkyRozpad(ZAD({ mustky: [{ ks: 1, sloupyKs: 2 }] }), C354(), true);
  test('prázdná výška sloupu → vyskaSloupuM = H − 0,2 (ne zdvih)', blizko(rozpad.skupiny[0].vyskaSloupuM, VYCH), rozpad.skupiny[0].vyskaSloupuM);
  test('sloupyM = ks × (H − 0,2)', blizko(rozpad.sloupyM, 2 * VYCH), rozpad.sloupyM);
  test('výchozí výška se liší od zdvihu i od H (připomínka J. V.)', !blizko(rozpad.skupiny[0].vyskaSloupuM, 17.3) && !blizko(rozpad.skupiny[0].vyskaSloupuM, H));
}
/* délka rohového sloupku v jádru: profil sloupku = (H − 0,2) × počet sloupků;
 * sloup navíc musí mít stejnou délku jako jeden z nich */
{
  const z = ZAD({ rohoveSloupky: 4, rezervaProfilyPct: 0 });
  const r = E.vypocet(kop(z), C354(), J, true);
  const p = ((r.profily && r.profily.rows) || []).find(x => x.nazev === 'Profil - sloupek');
  test('jeden rohový sloupek v jádru = délka výchozího sloupu navíc', !!p && typeof E.mustekSloupVychoziM === 'function' && blizko(p.m / 4, E.mustekSloupVychoziM(z)), p && p.m);
}

/* 2) vyplněná výška beze změny; bez sloupů beze změny */
{
  const r = E.mustkyRozpad(ZAD({ mustky: [{ ks: 1, sloupyKs: 2, sloupVyskaM: 3.2 }] }), C354(), true);
  test('vyplněná výška 3,2 m zůstává', blizko(r.skupiny[0].vyskaSloupuM, 3.2) && blizko(r.sloupyM, 6.4));
  const a = E.vypocet(ZAD({ mustky: [{ ks: 1 }] }), C354(), J, true);
  const b = E.vypocet(ZAD({ mustky: [{ ks: 1, sloupVyskaM: '' }] }), C354(), J, true);
  test('bez sloupů navíc se cena nemění', a.souhrn.zakladCena === b.souhrn.zakladCena && !(a.sekce.hrubaOck.some(x => /SLOUPY NAVÍC/.test(x.origNazev))));
  const m1 = E.mustkyRozpad(ZAD({ mustky: [{ ks: 1, sloupyKs: 2 }] }), C354(), false);
  test('Model 1 sloupy dál nezná', m1.sloupyM === 0 && m1.sloupyKs === 0);
}

/* 3) vstup s čárkou i tečkou */
test('„17,3" se přečte jako 17,3', E.mustekSkupinaOciste({ sloupVyskaM: '17,3' }).sloupVyskaM === 17.3);
test('„17.3" se přečte jako 17,3', E.mustekSkupinaOciste({ sloupVyskaM: '17.3' }).sloupVyskaM === 17.3);
test('„ 1200,5 " (šířka) i „2" ks se přečtou', E.mustekSkupinaOciste({ sirkaMm: ' 1200,5 ', ks: '2', sloupyKs: '3,0' }).sirkaMm === 1200.5
  && E.mustekSkupinaOciste({ ks: '2' }).ks === 2 && E.mustekSkupinaOciste({ sloupyKs: '3,0' }).sloupyKs === 3);
test('nesmysl zůstává prázdný („abc", „-1")', E.mustekSkupinaOciste({ sloupVyskaM: 'abc' }).sloupVyskaM === ''
  && E.mustekSkupinaOciste({ sloupVyskaM: '-1' }).sloupVyskaM === '');

/* 4) karta Můstky: nápověda a bublina s čárkou */
{
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ctx = vm.createContext(Object.assign({ console, esc,
    CISLO_POLE: 'inputmode="decimal" autocomplete="off" data-cislo="1"',   // ui/cislo_pole.js (CA #575)
    kartaRezim: (oblast, key, titul, obsah) => obsah }, F, E));
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'ui', 'kalk_ock.js'), 'utf8'), ctx, { filename: 'kalk_ock.js' });
  ctx.Z = ZAD({ mustky: [{ ks: 1, sloupyKs: 2 }] }); ctx.OCK = { fixes: true };
  const h = ctx.mustkyKarta({ mustky: { skladebny: true } }).replace(/\s+/g, ' ');
  const pole = (h.match(/<input inputmode="decimal" autocomplete="off" data-cislo="1" class="mu-sloupVyskaM"[^>]*>/) || [''])[0];
  const ph = (pole.match(/placeholder="([^"]*)"/) || [])[1];
  const tit = (pole.match(/title="([^"]*)"/) || [])[1] || '';
  test('nápověda výšky sloupu = „20,85" (česká čárka)', ph === '20,85', ph);
  test('bublina: prázdné = výška šachty (prohlubeň + zdvih + přejezd)', /výška šachty \(prohlubeň \+ zdvih \+ přejezd\)/.test(tit) && /20,85 m/.test(tit), tit);
  test('v kartě není nápověda s tečkou ani zdvih', !/placeholder="\d+\.\d+"/.test(h) && !/placeholder="17[.,]3"/.test(h));
  test('všechna číselná pole karty jsou týž prvek jako Zadání šachty (CISLO_POLE, CA #575)',
    (h.match(/<input inputmode="decimal" autocomplete="off" data-cislo="1" class="mu-(ks|sirkaMm|delkaMm|sloupyKs|sloupVyskaM)"/g) || []).length === 5);
  const phMm = (h.match(/class="mu-delkaMm"[^>]*placeholder="([^"]*)"/) || [])[1];
  test('nápověda délky v českém zápisu („1 000")', phMm === (1000).toLocaleString('cs-CZ').replace(/\s+/g, ' '), phMm);
}

/* 5) poznámka řádku kalkulace, krycí list, specifikace */
{
  const z = ZAD({ mustky: [{ ks: 1, sloupyKs: 2, sloupVyskaM: '' }] });
  const r = E.vypocet(kop(z), C354(), J, true);
  const sl = r.sekce.hrubaOck.concat(r.sekce.mustky || []).find(x => x.origNazev === E.MUSTEK_RADEK.sloupy);
  test('poznámka řádku sloupů s čárkou („2 ks, 41,7 m")', !!sl && sl.pozn === '2 ks, 41,7 m', sl && sl.pozn);
  const kt = KR.kryciMustkyText(r);
  test('krycí list: „sloupy navíc 2 ks × 20,85 m"', /sloupy navíc 2 ks × 20,85 m/.test(kt), kt);
  const cs = TS.tsMustkyCast ? TS.tsMustkyCast(r, z, 'cz', 'sloupy') : (typeof tsMustkyCast === 'function' ? tsMustkyCast(r, z, 'cz', 'sloupy') : '');
  test('specifikace CZ: výška 20,85 m', /20,85 m/.test(cs), cs);
  const fn = TS.tsMustkyCast || global.tsMustkyCast;
  if (fn) {
    test('specifikace DE: čárka', /20,85 m/.test(fn(r, z, 'de', 'sloupy')), fn(r, z, 'de', 'sloupy'));
    test('specifikace EN: tečka (zvyklost aplikace)', /20\.85 m/.test(fn(r, z, 'en', 'sloupy')), fn(r, z, 'en', 'sloupy'));
  }
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
