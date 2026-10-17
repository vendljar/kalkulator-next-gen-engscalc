/* POKUS AUDITU KOLA 26 (17. 10. 2026) — vlastní řádky specifikace a lešení
 * v cenové nabídce (docxRadkyNavic, v16.10.2): text uživatele do Wordu.
 * Jen čte, žádná síť, smyšlené texty. Spuštění: node podklady/AUDIT26_pokus_vlastni_radky_word.mjs
 *
 * Čeká se: symbol {{…}} z popisku ani z hodnoty se nerozvine (B122 — `{` jako
 * entita), značky XML z textu projdou jen escapované, řídicí znaky zmizí a
 * výsledné XML je dobře utvořené. */
import { createRequire } from 'node:module';
const R = new URL('..', import.meta.url).pathname;
const require = createRequire(R + 'netlify/x.mjs');
const D = require(R + 'src/docxgen.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n + '  ' + String(info || '').slice(0, 400)); } };

const bunka = t => `<w:tc><w:p><w:r><w:t>${t}</w:t></w:r></w:p></w:tc>`;
const radek = (a, b) => `<w:tr>${bunka(a)}${b === undefined ? '' : bunka(b)}</w:tr>`;
const xml = '<w:document><w:body><w:tbl>'
  + radek('SOUČÁSTÍ DODÁVKY NENÍ')
  + radek('LEŠENÍ KOLEM OCK PRO PROVEDENÍ OPLÁŠTĚNÍ', '{{TS_NENI_LESENI}}')
  + radek('DOSTATEČNÉ PŘÍSTUPOVÉ A MANIPULAČNÍ PROSTORY', '{{TS_NENI_PRISTUP}}')
  + '</w:tbl></w:body></w:document>';

const ZLY = [
  { nazev: 'Cena {{CENA_BEZ_DPH}}', hodnota: '{{CENA_S_DPH}} a {{TS_NENI_PRISTUP}}' },
  { nazev: 'X</w:t></w:r><w:r><w:t>vložený běh', hodnota: '<w:p>odstavec</w:p>&amp;' },
  { nazev: 'řídicí\u0001\u000bznak', hodnota: 'konec￾řádku' },
  { nazev: '{', hodnota: '}{' },
];
const radky = [
  { symbol: 'TS_NENI_LESENI_VNITRNI', kotva: 'TS_NENI_LESENI', pred: true, nazev: 'LEŠENÍ VNITŘNÍ {{CENA_BEZ_DPH}}', hodnota: '{{CENA_S_DPH}}' },
  { kotva: 'TS_NENI_PRISTUP', pruh: true, nazev: 'DALŠÍ UJEDNÁNÍ {{CENA_BEZ_DPH}}' },
  ...ZLY.map(e => ({ kotva: 'TS_NENI_PRISTUP', vzdy: true, nazev: e.nazev, hodnota: e.hodnota })),
];
const ph = { CENA_BEZ_DPH: 'TAJNA_CENA_1', CENA_S_DPH: 'TAJNA_CENA_2', TS_NENI_LESENI: 'zajistí objednatel', TS_NENI_PRISTUP: 'zajistí objednatel' };
let po = D.docxRadkyNavic(xml, radky);
po = D.odstranPrazdneTsRadky(po, ph);
po = D.nahradPlaceholdery(po, ph);

test('vložené řádky jsou v dokumentu (6 navíc)', (po.match(/<w:tr>/g) || []).length === 3 + 6, (po.match(/<w:tr>/g) || []).length);
test('symbol z popisku ani hodnoty se nerozvinul (žádná „TAJNA_CENA")', !/TAJNA_CENA/.test(po), po);
test('složená závorka z textu jde jako entita &#123;', /&#123;&#123;CENA_BEZ_DPH\}\}/.test(po), po);
test('značky z textu jen escapované (žádný vložený <w:p>)', !/<w:p>odstavec/.test(po) && /&lt;w:p&gt;odstavec/.test(po), po);
test('vložený běh z popisku nevznikl', !/<w:t>vložený běh/.test(po), po);
test('řídicí znaky a U+FFFE zmizely', !/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/.test(po), JSON.stringify(po));
/* Dobře utvořené XML: počty otevřených a zavřených prvků se rovnají. */
const pocet = (re) => (po.match(re) || []).length;
test('XML: <w:t> / </w:t> v rovnováze', pocet(/<w:t[\s>]/g) === pocet(/<\/w:t>/g), [pocet(/<w:t[\s>]/g), pocet(/<\/w:t>/g)]);
test('XML: <w:tr> / </w:tr> v rovnováze', pocet(/<w:tr[\s>]/g) === pocet(/<\/w:tr>/g));
const vady = typeof D.xmlStrukturaVada === 'function' ? D.xmlStrukturaVada(po) : '';
test('xmlStrukturaVada: bez vady', !vady, vady);
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exitCode = fail ? 1 : 0;
