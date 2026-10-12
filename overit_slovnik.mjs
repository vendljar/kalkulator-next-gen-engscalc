/* Nastavení → Slovník nad sestavením dist/kalkulacka.html (12. 10. 2026).
 *
 * Zadání J. V. 12. 10.: po nahrání tabulky Vocabulary musel u „Odlišné
 * znění (44)" přebírat řádek po řádku. Harness ověřuje hromadné tlačítko
 * „Převzít všech N z tabulky" celou cestou, jak ji jde obsluha: výběr
 * souboru (skutečný .xlsx přes file chooser), panel, tlačítko, potvrzení,
 * zápis do slovníku a nové porovnání. Logiku porovnání testuje
 * src/test_slovnik.js; tady jde o to, co se v Node ověřit nedá.
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'node:url';
const KOREN = fileURLToPath(new URL('.', import.meta.url));
const soubor = 'file://' + path.resolve(KOREN, 'dist/kalkulacka.html');

let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail ? '  → ' + detail : '')); }
};

const prohlizec = await chromium.launch();
const stranka = await prohlizec.newPage();
const chyby = [];
stranka.on('console', m => { if (m.type() === 'error') chyby.push(m.text()); });
stranka.on('pageerror', e => chyby.push(String(e)));
await stranka.goto(soubor);
await stranka.waitForTimeout(400);

/* Dialogy jsou v aplikaci (src/ui/dialog.js); harness je nahradí funkcemi,
 * které si text zapamatují a odpoví podle window.__odpoved. */
await stranka.evaluate(() => {
  window.__dlgTexty = []; window.__odpoved = true;
  window.potvrd = (t) => { window.__dlgTexty.push(String(t)); return Promise.resolve(window.__odpoved); };
  window.hlaska = (t) => { window.__dlgTexty.push(String(t)); return Promise.resolve(); };
  NAST.jeAdmin = true;
});

/* Tabulka: tři hesla se slovníkem aplikace v EN nesouhlasí, jedno souhlasí. */
const HESLA = await stranka.evaluate(() => {
  const ks = Object.keys(PREKLAD).filter(k => PREKLAD[k][0]).slice(0, 4);
  return ks.map(k => ({ cz: k, en: PREKLAD[k][0], de: PREKLAD[k][1], fr: PREKLAD[k][2] }));
});
async function nahrajTabulku(radky) {
  const bajty = await stranka.evaluate(async (r) => {
    const rows = [['CZ', 'EN', 'DE', 'FR']].concat(r.map(x => [x.cz, x.en, x.de, x.fr]));
    const blob = xlsxZapis([{ nazev: 'Vocab', rows }]);
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, radky);
  const [chooser] = await Promise.all([
    stranka.waitForEvent('filechooser'),
    stranka.evaluate(() => slovNacti()),
  ]);
  await chooser.setFiles({ name: 'Vocabulary_test.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from(bajty) });
  await stranka.waitForFunction(() => typeof SLOV_STAV !== 'undefined' && SLOV_STAV && SLOV_STAV.soubor === 'Vocabulary_test.xlsx');
}
const tabulka = HESLA.map((h, i) => i < 3 ? Object.assign({}, h, { en: h.en + ' (TAB ' + i + ')' }) : h);

console.log('\nSlovník – hromadné převzetí odlišného znění');
await stranka.evaluate(() => { otevriNastaveni(); nastPanel('slovnik'); });
await nahrajTabulku(tabulka);
await stranka.evaluate(() => nastPanel('slovnik'));

const pred = await stranka.evaluate(() => {
  const b = document.getElementById('slovPrevzitVse');
  const html = document.getElementById('nastaveni-overlay').innerHTML;
  return { rozdilne: SLOV_STAV.rozdil.souhrn.rozdilne, tlacitko: b ? b.textContent.trim() : null,
           schvalneNeni: /Hromadné tlačítko tu schválně není/.test(html) };
});
zkus('porovnání našlo 3 odlišná znění', pred.rozdilne === 3, String(pred.rozdilne));
zkus('v bloku je tlačítko „Převzít všech 3 z tabulky"', pred.tlacitko === 'Převzít všech 3 z tabulky', String(pred.tlacitko));
zkus('text „Hromadné tlačítko tu schválně není" zmizel', pred.schvalneNeni === false);

// zrušené potvrzení nic nezapíše
const zrus = await stranka.evaluate(async (k) => {
  window.__odpoved = false;
  await slovPrevzitVse();
  window.__odpoved = true;
  return { en: PREKLAD[k][0], rozdilne: SLOV_STAV.rozdil.souhrn.rozdilne, dotaz: window.__dlgTexty[window.__dlgTexty.length - 1] };
}, HESLA[0].cz);
zkus('potvrzení se ptá s počtem', /Převzít všech 3 odlišných znění/.test(zrus.dotaz || ''), zrus.dotaz);
zkus('zrušené potvrzení nic nepřepíše', zrus.en === HESLA[0].en && zrus.rozdilne === 3);

// jen administrátor
const bezAdmina = await stranka.evaluate(async (k) => {
  NAST.jeAdmin = false;
  const n = window.__dlgTexty.length;
  await slovPrevzitVse();
  NAST.jeAdmin = true;
  return { en: PREKLAD[k][0], dotazu: window.__dlgTexty.length - n };
}, HESLA[0].cz);
zkus('bez role administrátora se nic nepřevezme', bezAdmina.en === HESLA[0].en && bezAdmina.dotazu === 0);

// kliknutí → jedno potvrzení → zápis všech tří
const po = await stranka.evaluate(async (h) => {
  const n = window.__dlgTexty.length;
  document.getElementById('slovPrevzitVse').click();
  await new Promise(r => setTimeout(r, 200));
  return { dotazu: window.__dlgTexty.length - n,
           en: h.map(x => PREKLAD[x.cz][0]), tr: tr(h[1].cz, 'en'),
           rozdilne: SLOV_STAV.rozdil.souhrn.rozdilne,
           tlacitko: !!document.getElementById('slovPrevzitVse'),
           stav: (document.getElementById('slovStav') || {}).textContent || '' };
}, HESLA);
zkus('jedno potvrzení na všechny řádky', po.dotazu === 1, String(po.dotazu));
zkus('všechna tři znění jsou převzatá', po.en.slice(0, 3).every((v, i) => v === tabulka[i].en), po.en.join(' | '));
zkus('shodné heslo zůstalo beze změny', po.en[3] === HESLA[3].en);
zkus('tr() překládá novým zněním hned', po.tr === tabulka[1].en, po.tr);
zkus('po převzetí porovnání hlásí 0 odlišných', po.rozdilne === 0, String(po.rozdilne));
zkus('tlačítko po převzetí zmizí', po.tlacitko === false);
zkus('stav hlásí počet převzatých', /Převzato z tabulky 3/.test(po.stav), po.stav);

zkus('konzole je čistá', chyby.length === 0, chyby.slice(0, 3).join(' | '));
await prohlizec.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
