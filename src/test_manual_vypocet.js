/* Vizuální manuál výpočtu OCK (M7, 3. vydání, 27. 10. 2026): každé číslo
 * v manuálu je výstup jádra.
 *
 * Manuál vyrábí manual_vypocet/sestav.js ze šablony a z čísel, která
 * manual_vypocet/data.js spočítá jádrem (zkušební ceník). Hotový manuál se
 * do repozitáře neukládá; uložená jsou jen čísla vydání
 * (manual_vypocet/cisla_vydani.json). Test hlídá:
 *   1. šablona jde dosadit celá (žádný neznámý klíč, žádné {{ }} navíc),
 *   2. každé číslo v sestaveném HTML (značka data-k) = výsledek jádra,
 *   3. čísla vydaného manuálu = dnešní jádro — změna výpočtu, která by
 *      vydaný manuál zneplatnila, test shodí (pak vydat nové vydání
 *      a obnovit cisla_vydani.json: node manual_vypocet/sestav.js --snapshot),
 *   4. s KNG_MANUAL_HTML=<cesta> navíc hotový (rozeslaný) HTML soubor,
 *   5. pojistka proti prázdnému testu: podvržené číslo porovnání chytí,
 *   6. ceník je zkušební (žádné skutečné sazby) a titul nese 3. vydání.
 * Spuštění: node src/test_manual_vypocet.js */
const fs = require('fs');
const path = require('path');

const KOREN = path.resolve(__dirname, '..');
const S = require(path.join(KOREN, 'manual_vypocet', 'sestav.js'));
const D = require(path.join(KOREN, 'manual_vypocet', 'data.js'));

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 600)); } };

/* Vytáhne z HTML všechna čísla se značkou data-k → [{k, text}]. */
const dekoduj = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
function cislaZHtml(html) {
  const out = [];
  const re = /<(span|tspan)[^>]*\sdata-k="([\w.]+)"[^>]*>([^<]*)<\/\1>/g;
  let m;
  while ((m = re.exec(html))) out.push({ k: m[2], text: dekoduj(m[3]) });
  return out;
}
function porovnej(html, hodnoty) {
  const rozdily = [];
  const cisla = cislaZHtml(html);
  cisla.forEach(({ k, text }) => {
    if (!Object.prototype.hasOwnProperty.call(hodnoty, k)) rozdily.push(k + ': klíč jádro nezná');
    else if (hodnoty[k] !== text) rozdily.push(k + ': manuál „' + text + '" × jádro „' + hodnoty[k] + '"');
  });
  return { pocet: cisla.length, rozdily };
}

const r = S.sestav({ zaklad: 'test' });

/* 1. šablona */
test('šablona jde dosadit celá', r.chyby.length === 0, r.chyby);
test('manuál nese stovky čísel z jádra (ne prázdné dosazení)', r.pocet > 500 && new Set(r.klice).size > 400, r.pocet);

/* 2. sestavené HTML = jádro */
{
  const p = porovnej(r.html, D.spocitej().hodnoty);
  test('sestavené HTML: všech ' + p.pocet + ' čísel = výsledek jádra', p.pocet === r.pocet && p.rozdily.length === 0, p.rozdily.slice(0, 10));
}

/* 3. čísla vydaného manuálu = dnešní jádro */
{
  const f = path.join(KOREN, 'manual_vypocet', 'cisla_vydani.json');
  const vyd = JSON.parse(fs.readFileSync(f, 'utf8'));
  const ted = r.data.hodnoty;
  const rozdily = [];
  Object.keys(vyd.hodnoty).forEach(k => {
    if (!(k in ted)) rozdily.push(k + ': jádro už číslo nevydává');
    else if (vyd.hodnoty[k] !== ted[k]) rozdily.push(k + ': vydáno „' + vyd.hodnoty[k] + '" × jádro „' + ted[k] + '"');
  });
  Object.keys(ted).forEach(k => { if (!(k in vyd.hodnoty)) rozdily.push(k + ': chybí ve vydání'); });
  test(vyd.vydani + '. vydání (v' + vyd.verze + '): ' + Object.keys(vyd.hodnoty).length
    + ' čísel = dnešní jádro (jinak vydat nový manuál a obnovit cisla_vydani.json)', rozdily.length === 0, rozdily.slice(0, 15));
  test('každé číslo vydaného manuálu je ve vydání zapsané', r.klice.every(k => k in vyd.hodnoty),
    r.klice.filter(k => !(k in vyd.hodnoty)).slice(0, 10));
}

/* 4. hotový (rozeslaný) soubor */
if (process.env.KNG_MANUAL_HTML) {
  const html = fs.readFileSync(process.env.KNG_MANUAL_HTML, 'utf8');
  const p = porovnej(html, r.data.hodnoty);
  test('hotový manuál ' + path.basename(process.env.KNG_MANUAL_HTML) + ': ' + p.pocet + ' čísel = jádro',
    p.pocet > 500 && p.rozdily.length === 0, p.rozdily.slice(0, 10));
  test('hotový manuál nemá nedosazené značky', !/\{\{[^{}]*\}\}/.test(html));
} else {
  console.log('--  hotový soubor nekontrolován (nastavte KNG_MANUAL_HTML=<cesta k .html>)');
}

/* 5. pojistka: podvržené číslo i chybějící klíč porovnání chytí */
{
  const h = Object.assign({}, r.data.hodnoty);
  h['e.zakCena'] = '1\u00a0318\u00a0000\u00a0Kč';
  const p1 = porovnej(r.html, h);
  delete h['e.H'];
  const p2 = porovnej(r.html, h);
  test('pojistka: změněné číslo jádra porovnání chytí', p1.rozdily.some(x => /^e\.zakCena/.test(x)), p1.rozdily);
  test('pojistka: číslo, které jádro nevydává, porovnání chytí', p2.rozdily.some(x => /^e\.H:/.test(x)));
  const rozbita = S.sestavHtml('<p>{{neni.takovy}}</p>', r.data, r.meta);
  test('pojistka: neznámý klíč v šabloně je chyba', rozbita.chyby.some(x => /neznámý klíč neni.takovy/.test(x)), rozbita.chyby);
}

/* 6. ceník a titul */
{
  const ZC = require('./zkusebni_cenik.js').zkusebniCenik();
  test('výpočet stojí na zkušebním ceníku (marže, DPH, montáž, sklo)', r.data.hodnoty['c.marze'] === String(ZC.marze * 100)
    && r.data.hodnoty['c.dph'] === String(ZC.dph * 100) && /40\u00a0000/.test(r.data.hodnoty['mu.cenaBm']));
  const dopl = D.DOPLNENI_CENIKU;
  test('doplnění zkušebního ceníku jsou jen hodiny, rozměr a zkušební sazba montáže (500 Kč/h)',
    Object.keys(dopl).sort().join() === 'mustekMontazBmHod,mustekMontazHodKc,mustekMontazMinHod,mustekMontazZakladHod,mustekRefSirkaMm,statikaOplHod'
    && dopl.mustekMontazHodKc === ZC.montazHodKc, dopl);
  test('titul: 3. vydání a verze z verze.txt', /3\. vydání/.test(r.html)
    && r.html.indexOf('v' + fs.readFileSync(path.join(KOREN, 'verze.txt'), 'utf8').trim()) > 0);
  test('manuál nemá řádek s vymyšlenou cenou můstku z výchozí migrace (28 600 / 400)',
    !/28\u00a0600|28 600/.test(r.html) && !/400\u00a0Kč\/h/.test(r.html));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
