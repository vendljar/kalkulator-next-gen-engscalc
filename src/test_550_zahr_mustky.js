/* #550 — nález K36-N2 (rozhodnutí J. V. 2. 11. 2026): vlastní zahraniční sazba montáže můstků.
 *
 * Zahraniční zakázka brala u montáže můstků ČESKOU hodinovou sazbu, ostatní
 * montáž na stavbě zahraniční. Od #550:
 *   – buňka zahraniční řady `C.mustekMontazHodKc` je vlastní odchylka,
 *   – NEVYPLNĚNÁ = zahraniční sazba montáže na stavbě (`C.montazHodKc`
 *     zahraniční řady); bez ní platí dál tuzemská (žádná sazba v kódu),
 *   – dialog zveřejnění na nevyplněnou buňku upozorní.
 * Jen smyšlená čísla (zkusebni_cenik.js + odchylky níž).
 * Před opravou: oddíly 1–3 selžou (montáž můstků zůstala tuzemská); po opravě projdou.
 * Spuštění: node src/test_550_zahr_mustky.js */
const fs = require('fs');
const path = require('path');
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
nacti('./format.js'); nacti('./cenik.js'); nacti('./cenik_stari.js');
const R = nacti('./cenik_rady.js');
const E = nacti('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const J = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 300)); } };
const kop = x => JSON.parse(JSON.stringify(x));

const V = ZC.zkusebniMustky();                                   // montáž můstků ČR 500 Kč/h (smyšlené)
const CR = () => Object.assign(kop(E.DEFAULT_CENIK), ZC.zkusebniCenik(), V);
const ZAHR_MONTAZ = 777;                                         // smyšlená zahraniční montáž na stavbě
const zahr = (ceny) => ({ ceny: Object.assign({ 'C.montazHodKc': ZAHR_MONTAZ }, ceny || {}), jenZahr: {} });

/* 1) složení řady */
{
  const s = R.cenikSlozRadu(CR(), zahr(), 'zahr');
  test('nevyplněná zahraniční montáž můstků = zahraniční montáž na stavbě', s.mustekMontazHodKc === ZAHR_MONTAZ, s.mustekMontazHodKc);
  const s2 = R.cenikSlozRadu(CR(), zahr({ 'C.mustekMontazHodKc': 650 }), 'zahr');
  test('vyplněná zahraniční montáž můstků má přednost', s2.mustekMontazHodKc === 650, s2.mustekMontazHodKc);
  const s3 = R.cenikSlozRadu(CR(), { ceny: { 'C.powertechInt': 250 }, jenZahr: {} }, 'zahr');
  test('bez zahraniční montáže na stavbě platí tuzemská sazba montáže můstků (nic se nevymýšlí)',
    s3.mustekMontazHodKc === V.mustekMontazHodKc, s3.mustekMontazHodKc);
  const t = R.cenikSlozRadu(CR(), zahr(), 'cr');
  test('tuzemská řada se nemění', t.mustekMontazHodKc === V.mustekMontazHodKc, t.mustekMontazHodKc);
  test('výchozí hodnota se do odchylek neukládá', !('C.mustekMontazHodKc' in R.cenikZahrOciste(zahr()).ceny));
}

/* 2) přepnutí varianty a rozdíly v dialogu */
{
  const rozdily = R.cenikRadaRozdily(CR(), zahr());
  const r = rozdily.find(x => x.cesta === 'C.mustekMontazHodKc');
  test('dialog přepnutí ukáže montáž můstků jako výchozí (z montáže na stavbě)',
    r && r.zahr === ZAHR_MONTAZ && r.cr === V.mustekMontazHodKc && r.vychozi === true, rozdily);
}

/* 3) výpočet: montáž můstků v zahraniční zakázce */
{
  const z = Object.assign(kop(E.DEFAULT_ZADANI), { typSachty: 'exteriérová', profily: kop(E.PROFILY_VYCHOZI['exteriérová']),
    sirka: 1.6, mustkyKs: 1, mustekHloubkaMm: 1000 });
  const radek = (c) => (E.vypocet(kop(z), c, J, true).sekce.hrubaOck || []).find(i => i.origNazev === 'MONTÁŽ MŮSTKŮ');
  const rZ = radek(R.cenikSlozRadu(CR(), zahr(), 'zahr'));
  const rC = radek(CR());
  test('zahraniční zakázka: řádek MONTÁŽ MŮSTKŮ se zahraniční sazbou', rZ && rZ.cena === ZAHR_MONTAZ
    && Math.abs(rZ.naklad - rZ.mnozstvi * ZAHR_MONTAZ) < 1e-6, rZ);
  test('tuzemská zakázka: tuzemská sazba', rC && rC.cena === V.mustekMontazHodKc, rC);
}

/* 4) upozornění do dialogu zveřejnění */
{
  const U = R.cenikZahrMustkyUpozorneni || (() => '');   // před opravou funkce není — test nesmí spadnout
  const u = U(zahr());
  test('nevyplněná buňka → věta s odkazem na Nastavení → Ceník', /montáž můstků/.test(u) && /777 Kč\/hod/.test(u)
    && /Nastavení → Ceník/.test(u), u);
  test('vyplněná buňka → bez věty', U(zahr({ 'C.mustekMontazHodKc': 650 })) === '');
  test('bez zahraniční montáže → bez věty (platí tuzemská)', U({ ceny: {}, jenZahr: {} }) === '');
  const PU = fs.readFileSync(path.join(__dirname, 'ui', 'program_ui.js'), 'utf8');
  test('dialog zveřejnění větu vypisuje', /cenikZahrMustkyUpozorneni\(ctx\.zahranicni\)/.test(PU));
  const CU = fs.readFileSync(path.join(__dirname, 'ui', 'cenik_ui.js'), 'utf8');
  test('ceník: buňka Zahraničí u montáže můstků říká, co znamená prázdná', /jako montáž zahr\./.test(CU));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
