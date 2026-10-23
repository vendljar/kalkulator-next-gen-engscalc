/* ===== ARES PO TISKU SMLOUVY O DÍLO (K7-K3, audit 23. 10. 2026, #507) =====
 *
 * „Najít firmu v ARES" zůstávalo po tisku SoD aktivní a potvrzení přepisu
 * zapsalo zákazníka, sídlo, IČO a DIČ přímo do hlavičky — mimo zámek Z1-3.
 * Server pak každé další uložení odmítl 409 a zmrazená pole se nedala vrátit
 * (ztráta neuložené práce), dotisk mezitím nesl jiného objednatele.
 *
 * Hlídá se:
 *  1) po SoD potvrzení přepisu nic nezmění a ukáže důvod;
 *  2) tlačítko ARES je po SoD neaktivní s důvodem v bublině;
 *  3) po samotné CN (bez SoD) ARES funguje jako dřív;
 *  4) karta zákazníka (kde = 'zakaznik') zámek zakázky neřeší.
 *
 * Spuštění: cd src && node test_ares_po_sod.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./podminky.js');
const FM = nacti('./firma.js');
nacti('./plan_plateb.js');
const zk = nacti('./zakazka.js');
const ZM = nacti('./zamek.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');
nacti('./ares.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 300)); } };
global.NAST = { firma: FM.firmaDefault() };
global.esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let hlasky = [];
global.hlaska = (t) => { hlasky.push(t); return Promise.resolve(); };
global.render = () => {};

const ui = fs.readFileSync(path.join(__dirname, 'ui', 'ares_ui.js'), 'utf8');
const vyrez = (jm) => { const i = ui.indexOf('function ' + jm + '('); if (i < 0) return ''; const j = ui.indexOf('\n}\n', i); return ui.slice(i, j + 2); };
vm.runInThisContext('var ARES = { kde: "", ico: "", hleda: false, subjekt: null, chyba: "", cas: 0 };\n'
  + ['aresHlavicka', 'aresZmrazeno', 'aresPrepisPotvrd', 'aresRadek'].map(vyrez).join('\n'));
global.aresPanel = () => '';

const nova = () => {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 5073'; z.nazevAkce = 'Ukázková akce';
  z.objednatel = 'Původní zákazník s.r.o.'; z.ico = '00000019'; z.adresaObjednatele = 'Původní 1'; z.dic = '';
  return z;
};
const zamkni = (z, typ) => { const v = z.varianty[0]; ZM.zamkniVariantu(v, { typ, cislo: ZM.variantaCislo(z, v) }); };
const SUBJEKT = { nazev: 'Jiná firma a.s.', adresa: 'Jiná 2, Brno', ico: '00000019', dic: 'CZ00000019' };

/* 1) + 2) po SoD */
{
  global.ZAK = nova(); zamkni(ZAK, 'nabidka'); zamkni(ZAK, 'sod');
  hlasky = [];
  const pred = JSON.parse(JSON.stringify(ZAK));
  ARES.kde = 'ock'; ARES.subjekt = SUBJEKT;
  aresPrepisPotvrd('ock');   // eslint-disable-line no-undef
  test('po SoD ARES zákazníka v hlavičce nepřepíše', ZAK.objednatel === 'Původní zákazník s.r.o.'
    && ZAK.adresaObjednatele === 'Původní 1' && ZAK.dic === '', { o: ZAK.objednatel, a: ZAK.adresaObjednatele, d: ZAK.dic });
  test('… a řekne proč', hlasky.length === 1 && /smlouva o dílo/.test(hlasky[0]), hlasky);
  test('… server by změnu nehlásil (žádné 409 při dalším uložení)', ZM.zamekZakZmeny(pred, ZAK).length === 0,
    ZM.zamekZakZmeny(pred, ZAK));
  const radek = aresRadek('ock');   // eslint-disable-line no-undef
  test('po SoD je tlačítko ARES neaktivní s důvodem', /disabled/.test(radek) && /smlouva o dílo/.test(radek), radek.slice(0, 300));
}
/* 3) po samotné CN ARES funguje */
{
  global.ZAK = nova(); zamkni(ZAK, 'nabidka');
  hlasky = [];
  ARES.kde = 'ock'; ARES.subjekt = SUBJEKT;
  aresPrepisPotvrd('ock');   // eslint-disable-line no-undef
  test('po CN (bez SoD) ARES zákazníka přepíše jako dřív', ZAK.objednatel === 'Jiná firma a.s.' && ZAK.dic === 'CZ00000019' && !hlasky.length);
  test('po CN je tlačítko ARES aktivní', !/disabled/.test(aresRadek('ock')));   // eslint-disable-line no-undef
}
/* 4) karta zákazníka */
{
  global.ZAK = nova(); zamkni(ZAK, 'nabidka'); zamkni(ZAK, 'sod');
  test('karta zákazníka se zámkem zakázky neřídí', aresZmrazeno('zakaznik') === '');   // eslint-disable-line no-undef
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
