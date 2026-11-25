/* K58-N1 (kolo 58, J. V. 25. 11. 2026) — číslo zámku nabídky PROJ.
 * Zámek PROJ (nabidkaProj, nabidkaProjTisk, sodProj) nese číslo z papíru PROJ
 * = cisloSVariantou(zak, v, projCisloNabidky(zak)), ne předlohu čísla OCK
 * (kalkulace PROJ z webhooku: OCK „2026 - OPR - CN - “, PROJ „CN-437“).
 * Staré zámky PROJ s předlohou se nemigrují: server je toleruje (B56, nový
 * zámek ze starého klienta) a zobrazení (CRM, lišta) ukáže číslo PROJ.
 * Pojistka: před opravou chybí zamekCisloPapir / Sedi / Zobraz a zamekPoTisku
 * bere variantaCislo → testy padají.
 * Spuštění: node src/test_k58n1_cislo_proj.js */
const fs = require('fs');
const n = f => { const m = require('./' + f); Object.assign(global, m); return m; };
['format.js', 'engine.js', 'engine_proj.js', 'techspec.js', 'zamek.js', 'zakazka.js', 'vice_zakazniku.js'].forEach(n);
let ok = 0, fail = 0;
const test = (t, c, info) => { if (c) { ok++; console.log('OK  ' + t); } else { fail++; console.log('FAIL ' + t, info === undefined ? '' : JSON.stringify(info)); } };
const fn = (x) => typeof global[x] === 'function' ? global[x] : () => undefined;
const papir = fn('zamekCisloPapir'), sedi = fn('zamekCisloSedi'), zobraz = fn('zamekCisloZobraz');

/* Kalkulace PROJ z webhooku: OCK jen předloha, PROJ CN-437. */
const webhook = () => { const z = novaZakazka(); z.projHlavicka.cislo = 'CN-437'; return z; };
console.log('===== 1. číslo z papíru podle typu dokumentu =====');
{
  const z = webhook(), v = z.varianty[0];
  test('papír PROJ (invariant) = CN-437', cisloSVariantou(z, v, projCisloNabidky(z)) === 'CN-437');
  for (const t of ['nabidkaProj', 'nabidkaProjTisk', 'sodProj'])
    test('zámek ' + t + ' → CN-437', papir(z, v, t) === 'CN-437', papir(z, v, t));
  test('zámek nabidka (OCK) → číslo OCK jako dřív', papir(z, v, 'nabidka') === variantaCislo(z, v));
  z.varianty.push(Object.assign(JSON.parse(JSON.stringify(v)), { id: 'v2', nazev: 'B', pripona: 2 }));
  const w = z.varianty[1];
  test('druhá varianta s příponou → CN-437.' + variantaPriponaVZakazce(z, w),
    papir(z, w, 'nabidkaProj') === cisloSVariantou(z, w, projCisloNabidky(z)) && /^CN-437\.\d$/.test(papir(z, w, 'nabidkaProj')), papir(z, w, 'nabidkaProj'));
  const k = novaZakazka(); k.cislo = '2026 - OPR - CN - 0496'; k.projHlavicka.cislo = 'CN-999';
  test('kombinovaná s číslem OCK → číslo OCK i u PROJ (beze změny)', papir(k, k.varianty[0], 'nabidkaProj') === variantaCislo(k, k.varianty[0]));
}

console.log('===== 2. starý zámek PROJ s předlohou: toleruje se, zobrazí se CN-437 =====');
{
  const z = webhook(), v = z.varianty[0];
  v.zamek = { zamceno: true, typ: 'nabidkaProj', cislo: variantaCislo(z, v), cisloPapir: true };
  test('starý zámek (předloha) sedí — žádné 403 obchodníkovi', sedi(z, v) === true);
  test('zobrazení starého zámku → CN-437', zobraz(z, v) === 'CN-437', zobraz(z, v));
  v.zamek.cislo = 'CN-437';
  test('nový zámek CN-437 sedí a zobrazí se', sedi(z, v) === true && zobraz(z, v) === 'CN-437');
  v.zamek.cislo = 'CN-111';
  test('cizí číslo nesedí', sedi(z, v) === false);
  v.zamek = { zamceno: true, typ: 'nabidka', cislo: variantaCislo(z, v), cisloPapir: true };
  test('zámek OCK: tolerance PROJ neplatí, zobrazí se, jak je', sedi(z, v) === true && zobraz(z, v) === variantaCislo(z, v));
  v.zamek.cislo = 'CN-437';
  test('zámek OCK s číslem PROJ nesedí', sedi(z, v) === false);
}

console.log('===== 3. klient a server berou totéž =====');
{
  const ui = fs.readFileSync(__dirname + '/ui/zamek_ui.js', 'utf8');
  test('zamekPoTisku: cislo: zamekCisloPapir(ZAK, v, typ)', /cislo: zamekCisloPapir\(ZAK, v, typ\)/.test(ui));
  const kz = fs.readFileSync(__dirname + '/../netlify/lib/zakazka_kontrola.mjs', 'utf8');
  test('server B56 a nový zámek přes zamekCisloSedi', (kz.match(/zamekCisloSedi\(/g) || []).length >= 2, (kz.match(/zamekCisloSedi\(/g) || []).length);
  const po = fs.readFileSync(__dirname + '/../netlify/functions/pd_odeslani.mjs', 'utf8');
  test('odeslání do Pipedrive bere zamekCisloZobraz', /zamekCisloZobraz\(/.test(po));
  const z = webhook(), v = z.varianty[0];
  const r = vzRazitkoSnimek(Object.assign(z, { zakaznici: undefined }), undefined, v, 'nabidkaProj');
  test('razítko VZ pro první tisk PROJ (není-li VZ, null)', r === null || /CN-437/.test(r.cislo), r);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
