/* Ověření prototypu v headless Chromiu a snímky (1600 × 1000 a 400 × 800).
 * Použití: node podklady/vz_prototyp/snimky.mjs <výstup ze sestav.mjs> [složka snímků]
 * Kontroluje: žádná chyba stránky, lišta drží nahoře při posunu, výchozí nápověda, kroky všech tří
 * situací, text pro Pipedrive, kontrola úniku cizího zákazníka do náhledu, vodorovný posuv při 400 px. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const tady = path.dirname(fileURLToPath(import.meta.url));
const vstup = process.argv[2], kam = process.argv[3] || path.join(tady, 'snimky');
if (!vstup) { console.error('Použití: node snimky.mjs <prototyp.html> [složka]'); process.exit(2); }
fs.mkdirSync(kam, { recursive: true });
const obal = path.join(path.dirname(path.resolve(vstup)), 'vz_obal.html');
fs.writeFileSync(obal, '<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>' + fs.readFileSync(vstup, 'utf8') + '</body></html>');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 500)); } };
const b = await chromium.launch({ args: ['--no-sandbox'] });

async function stranka(sirka, vyska) {
  const p = await (await b.newContext({ locale: 'cs-CZ', viewport: { width: sirka, height: vyska }, deviceScaleFactor: 1 })).newPage();
  p.chyby = [];
  p.on('pageerror', (e) => p.chyby.push(String(e)));
  await p.goto(pathToFileURL(obal).href);
  await p.waitForSelector('#vzpKarta', { timeout: 15000 });
  await p.waitForTimeout(300);
  return p;
}
const klik = async (p, a) => { await p.click('#vzpLista [data-vzp="' + a + '"]'); await p.waitForTimeout(350); };
const situace = async (p, s) => { await p.selectOption('#vzpScenar', s); await p.waitForTimeout(350); };
const txt = (p, sel) => p.evaluate((s) => (document.querySelector(s) || {}).textContent || '', sel);
const snimek = async (p, jmeno) => { await p.waitForTimeout(2600); await p.screenshot({ path: path.join(kam, jmeno + '.png') }); };

/* ---------- 1600 × 1000 ---------- */
let p = await stranka(1600, 1000);
test('výchozí stav: nápověda, kam kliknout (lišta i karta)', /Klikněte na „2\. Přidat zákazníka BETA"/.test(await txt(p, '#vzpLista')) && /Začněte tady/.test(await txt(p, '#vzpKarta')));
test('výchozí stav: jeden zákazník, pole pro Pipedrive prázdné', (await p.locator('#vzpKarta tbody tr[data-z]').count()) === 1 && /prázdné \(zakázka má jednoho zákazníka\)/.test(await txt(p, '#vzpPanel')));
test('lišta je fixed a drží nahoře po posunu', await p.evaluate(() => { window.scrollTo(0, 900); const r = document.getElementById('vzpLista').getBoundingClientRect(); const o = r.top === 0 && getComputedStyle(document.getElementById('vzpLista')).position === 'fixed'; window.scrollTo(0, 0); return o; }));
await snimek(p, '1_vychozi_jeden_zakaznik');

await klik(p, 'pridej:b');
test('S1 krok 2: BETA přidána se stejnou variantou, číslo s písmenem -B', /9940-B/.test(await txt(p, '#vzpKarta tr[data-z="b"]')) && /sdílená: ALFA \+ BETA/.test(await txt(p, '#vzpKarta tr[data-z="b"]')));
test('S1 krok 2: štítek „přidáno" v kartě i v panelu', (await p.locator('#vzpKarta .vzp-pp-pridano').count()) === 1 && /nabídka zatím neodeslána/.test(await txt(p, '#vzpPanel')));
await snimek(p, '2_stejna_varianta_pridan_zakaznik');
await klik(p, 'odesli:a'); await klik(p, 'odesli:b');
const dalsi1 = await txt(p, '#vzpPanel .vzp-r-blok');
test('S1 krok 4: tatáž varianta odeslána oběma, v dealu text s názvem, číslem, datem a cenou', /BETA Development a\.s\. \(smyšlené\) — CN 2026 - OPR - CN - 9940-B z \d+\. \d+\. \d{4}, [\d ]+ Kč bez DPH/.test(dalsi1), dalsi1);
test('S1: data dealu (hodnota, číslo) se přidáním BETA nezměnila', await p.evaluate(() => ![...document.querySelectorAll('#vzpPanel .vzp-r')].some((r) => /Hodnota dealu|Číslo nabídky \(CN\)|Organizace dealu/.test(r.textContent) && r.querySelector('.vzp-zn'))));
test('S1: kontrola úniku — ALFA není v náhledu nabídky BETA', /✔ ALFA/.test(await txt(p, '#vzpPanel .vzp-kontroly')) && !/ÚNIK/.test(await txt(p, '#vzpPanel .vzp-kontroly')));
test('S1: živý náhled aplikace (karta CN) nese BETA a číslo …9940-B, ne ALFA', await p.evaluate(() => { const t = document.querySelector('#ock-nabidka .body table').textContent; return /BETA Development/.test(t) && /9940-B/.test(t) && !/ALFA/.test(t); }));
await snimek(p, '3_stejna_varianta_odeslano_obema');
await p.evaluate(() => document.querySelector('#ock-nabidka').scrollIntoView({ block: 'start' })); await p.evaluate(() => window.scrollBy(0, -140));
await snimek(p, '4_nahled_nabidky_pro_zakaznika_BETA');

await situace(p, 'vlastni');
test('S2 výchozí: ALFA i BETA sdílejí odeslanou variantu', (await p.locator('#vzpKarta .zamek-stav').count()) === 2);
await klik(p, 'vlastni:b');
test('S2 krok 2: BETA má vlastní variantu s číslem …9940.2-B, dosud platí odeslaná …9940-B', /9940\.2-B/.test(await txt(p, '#vzpKarta tr[data-z="b"]')) && /platí odeslaná 2026 - OPR - CN - 9940-B/.test(await txt(p, '#vzpKarta tr[data-z="b"]')));
const cenaA = await txt(p, '#vzpKarta tr[data-z="a"] td.vzp-cena');
await klik(p, 'uprav:b');
test('S2 krok 3: cena BETA se změnila, cena ALFA ne', (await txt(p, '#vzpKarta tr[data-z="a"] td.vzp-cena')) === cenaA && (await txt(p, '#vzpKarta tr[data-z="b"] td.vzp-cena')) !== cenaA);
await klik(p, 'odesli:b');
test('S2 krok 4: text v dealu nese novou nabídku …9940.2-B; hodnota dealu beze změny', /CN 2026 - OPR - CN - 9940\.2-B z/.test(await txt(p, '#vzpPanel .vzp-r-blok')));
await snimek(p, '5_vlastni_varianta_odeslana');

await situace(p, 'prodej');
await klik(p, 'prodej:b');
test('S3 krok 2: potvrzení prodeje ukazuje před → po', /Prodat zakázku zákazníkovi BETA/.test(await txt(p, '#vzpKarta .vzp-potvrzeni')));
await snimek(p, '6_prodej_potvrzeni');
await klik(p, 'prodejAno');
test('S3 krok 3: BETA je řídící zákazník, hlavička nese BETA, ALFA v textu „neprodáno"', await p.evaluate(() => {
  const h = document.querySelector('#page-kalk .card.zak-bar .zak-head-col:nth-child(2) input[type=text]').value;
  return /BETA/.test(h) && /ALFA stavební s\.r\.o\. \(smyšlené\) — CN 2026 - OPR - CN - 9940 z .* — neprodáno/.test(document.querySelector('#vzpPanel .vzp-r-blok').textContent)
    && document.querySelector('#vzpKarta input[data-vzp-ridici="b"]').checked; }));
test('S3 krok 3: hodnota a číslo nabídky v dealu se změnily, organizace hlásí nesoulad', await p.evaluate(() => {
  const r = (n) => [...document.querySelectorAll('#vzpPanel .vzp-r')].find((x) => x.textContent.indexOf(n) === 0);
  return !!r('Hodnota dealu').querySelector('.vzp-zn-zmeneno') && /9940\.2-B/.test(r('Číslo nabídky (CN)').textContent) && /neodpovídá řídícímu/.test(r('Organizace dealu').textContent); }));
await snimek(p, '7_prodano_ridici_zakaznik_zmenen');
await klik(p, 'org'); await klik(p, 'orgAno');
test('S3 krok 5: organizace dealu po potvrzení = BETA', /BETA Development/.test(await p.evaluate(() => [...document.querySelectorAll('#vzpPanel .vzp-r')].find((x) => x.textContent.indexOf('Organizace dealu') === 0).textContent)));
await snimek(p, '8_organizace_dealu_zmenena');

await situace(p, 'stejna');
await p.selectOption('#vzpRole', 'jiny'); await p.waitForTimeout(300);
await klik(p, 'pridej:b');
test('role „jiný obchodník": řídícího zákazníka přepnout nesmí', await p.evaluate(() => document.querySelector('#vzpKarta input[data-vzp-ridici="b"]').disabled));
await p.selectOption('#vzpRole', 'autor'); await p.waitForTimeout(300);
test('role „autor": řídícího zákazníka přepnout smí', await p.evaluate(() => !document.querySelector('#vzpKarta input[data-vzp-ridici="b"]').disabled));
await klik(p, 'reset');
await klik(p, 'hraj'); await p.waitForTimeout(3 * 3500 + 1200);
test('▶ Přehrát projde situaci do konce', /odeslána/.test(await txt(p, '#vzpKarta tr[data-z="b"]')) && /▶ Přehrát/.test(await txt(p, '#vzpLista')));
test('1600 px: bez chyb stránky', p.chyby.length === 0, p.chyby);
await p.close();

/* ---------- 400 × 800 ---------- */
p = await stranka(400, 800);
const siroko = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
test('400 px: bez vodorovného posuvu stránky (výchozí)', (await siroko()) <= 1, await siroko());
test('400 px: lišta nezabere víc než polovinu výšky', await p.evaluate(() => document.getElementById('vzpLista').offsetHeight <= 400), await p.evaluate(() => document.getElementById('vzpLista').offsetHeight));
await snimek(p, '9_mobil_400_vychozi');
await klik(p, 'pridej:b');
test('400 px: po kroku je karta se změnou vidět a stránka se nerozjela', (await siroko()) <= 1 && await p.evaluate(() => { const r = document.querySelector('#vzpKarta').getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }));
await snimek(p, '10_mobil_400_po_kroku');
await p.evaluate(() => { document.getElementById('vzpPanel').scrollTop = 0; window.scrollTo(0, 0); });
await snimek(p, '11_mobil_400_panel_pipedrive');
test('400 px: bez chyb stránky', p.chyby.length === 0, p.chyby);
await p.close();
await b.close();
fs.unlinkSync(obal);
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
