/* Ověření prototypu v headless Chromiu a snímky (1600 × 1000 a 400 × 800).
 * Použití: node podklady/vz_prototyp/snimky.mjs <výstup ze sestav.mjs> [složka snímků]
 * Kontroluje (v2): výchozí stav = standardní kalkulace jen s tlačítkem, karta a přepínač až od druhého zákazníka,
 * odstranění zákazníka (i s odeslanou nabídkou) a návrat do standardního pohledu znak po znaku, text pro
 * Pipedrive, kontrola úniku, role, ▶ Přehrát, vodorovný posuv při 400 px, žádná chyba stránky. */
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
  await p.waitForSelector('#vzpLista .vzp-stav', { timeout: 15000 });
  await p.waitForTimeout(300);
  return p;
}
const klik = async (p, a) => { await p.click('#vzpLista [data-vzp="' + a + '"]'); await p.waitForTimeout(350); };
const situace = async (p, s) => { await p.selectOption('#vzpScenar', s); await p.waitForTimeout(350); };
const txt = (p, sel) => p.evaluate((s) => (document.querySelector(s) || {}).textContent || '', sel);
const snimek = async (p, jmeno) => { await p.waitForTimeout(2600); await p.screenshot({ path: path.join(kam, jmeno + '.png') }); };

/* ---------- 1600 × 1000 ---------- */
const hlavicka = (p) => p.evaluate(() => { const h = document.querySelector('#page-kalk .card.zak-bar').cloneNode(true); h.querySelectorAll('.vzp-pridat, .vzp-blok').forEach((e) => e.remove()); return h.innerHTML; });
const standard = (p) => p.evaluate(() => ({ karta: !!document.getElementById('vzpKarta'), chips: !!document.querySelector('.vzp-chips-row'), pruh: !!document.querySelector('.vzp-nahled-pruh'),
  tlacitko: document.querySelectorAll('.zak-bar .vzp-pridat').length, cislo: document.querySelector('#ock-nabidka .body table').textContent.includes('9940-') }));
let p = await stranka(1600, 1000);
const s0 = await standard(p), h0 = await hlavicka(p);
test('výchozí stav = standardní kalkulace: žádná karta, přepínač ani pruh, jen jedno tlačítko navíc', !s0.karta && !s0.chips && !s0.pruh && s0.tlacitko === 1 && !s0.cislo, s0);
test('výchozí stav: tlačítko „+ Přidat zákazníka" je u pole Zákazník a nápověda říká, kam kliknout', await p.evaluate(() => /^Zákazník\+ Přidat zákazníka$/.test(document.querySelector('.zak-bar .vzp-pridat').parentNode.textContent.trim()))
  && /Klikněte na „2\. Přidat zákazníka"/.test(await txt(p, '#vzpLista')) && /jediný rozdíl proti dnešní aplikaci/.test(await txt(p, '.vzp-pozn-proto')));
test('výchozí stav: pole pro Pipedrive prázdné', /prázdné \(zakázka má jednoho zákazníka\)/.test(await txt(p, '#vzpPanel')));
test('lišta je fixed a drží nahoře po posunu', await p.evaluate(() => { window.scrollTo(0, 900); const r = document.getElementById('vzpLista').getBoundingClientRect(); const o = r.top === 0 && getComputedStyle(document.getElementById('vzpLista')).position === 'fixed'; window.scrollTo(0, 0); return o; }));
await snimek(p, 'v2_1_vychozi_standardni_kalkulace');

await klik(p, 'form');
test('krok 2: formulář nového zákazníka v hlavičce, karta se ještě neukázala', (await p.locator('.zak-bar .vzp-form').count()) === 1 && !(await standard(p)).karta);
await snimek(p, 'v2_2_formular_pridat_zakaznika');
await klik(p, 'pridejForm:b');
const s2 = await standard(p);
test('krok 3: s druhým zákazníkem se objeví přepínač v hlavičce, karta Zákazníci zakázky a pruh u náhledu', s2.karta && s2.chips && s2.pruh && s2.tlacitko === 0, s2);
test('krok 3: nové prvky jsou označené „nově se objevilo", BETA má číslo …9940-B', /nově se objevilo/.test(await txt(p, '#vzpKarta h2')) && /9940-B/.test(await txt(p, '#vzpKarta tr[data-z="b"]')));
test('krok 3: řídícího zákazníka odstranit nejde, dalšího ano', await p.evaluate(() => document.querySelector('#vzpKarta [data-vzp="odeber:a"]').disabled && !document.querySelector('#vzpKarta [data-vzp="odeber:b"]').disabled));
await snimek(p, 'v2_3_druhy_zakaznik_co_se_objevi');
await klik(p, 'vlastni:b');
test('krok 4: BETA má vlastní variantu …9940.2-B', /9940\.2-B/.test(await txt(p, '#vzpKarta tr[data-z="b"]')) && /vlastní varianta/.test(await txt(p, '#vzpKarta tr[data-z="b"]')));
await snimek(p, 'v2_4_vlastni_varianta');
await klik(p, 'odeber:b');
test('krok 5: potvrzení odstranění říká, co bude s variantou, textem v dealu a vzhledem', /Odstranit zákazníka BETA/.test(await txt(p, '#vzpKarta .vzp-potvrzeni')) && /smazat i jeho rozpracovanou variantu/.test(await txt(p, '#vzpKarta .vzp-potvrzeni'))
  && /standardní kalkulace/.test(await txt(p, '#vzpKarta .vzp-potvrzeni')) && /vyprázdní/.test(await txt(p, '#vzpKarta .vzp-potvrzeni')));
await snimek(p, 'v2_5_odstranit_potvrzeni');
await klik(p, 'odeberAno');
const s5 = await standard(p);
test('krok 6: po odstranění je aplikace zpět ve standardním pohledu (bez karty, přepínače, pruhu a písmene)', !s5.karta && !s5.chips && !s5.pruh && s5.tlacitko === 1 && !s5.cislo, s5);
test('krok 6: hlavička je znak po znaku stejná jako ve výchozím stavu', (await hlavicka(p)) === h0);
test('krok 6: v zakázce zůstala jedna varianta a pole v dealu je prázdné', await p.evaluate(() => ZAK.varianty.length === 1 && ZAK.varianty[0].ridici === true) && /prázdné \(zakázka má jednoho zákazníka\)/.test(await txt(p, '#vzpPanel .vzp-r-blok')));
await snimek(p, 'v2_6_navrat_do_standardniho_pohledu');

await situace(p, 'odeslana');
test('S2 výchozí: ALFA a BETA, BETA má odeslanou vlastní variantu', (await p.locator('#vzpKarta .zamek-stav').count()) === 2 && /9940\.2-B/.test(await txt(p, '#vzpKarta tr[data-z="b"]')));
await klik(p, 'odeber:b');
test('S2 krok 2: u odeslané nabídky potvrzení říká, že doklad a zamčená varianta zůstávají', /doklad zůstává/.test(await txt(p, '#vzpKarta .vzp-potvrzeni')) && /zůstává v zakázce zamčená/.test(await txt(p, '#vzpKarta .vzp-potvrzeni')) && /už se nepřidělí/.test(await txt(p, '#vzpKarta .vzp-potvrzeni')));
await snimek(p, 'v2_7_odstranit_zakaznika_s_odeslanou_nabidkou');
await klik(p, 'odeberAno');
test('S2 krok 3: standardní pohled; zamčená varianta zůstala doložená s číslem …9940.2-B', !(await standard(p)).karta && await p.evaluate(() => ZAK.varianty.length === 2 && !!ZAK.varianty[1].zamek && /9940\.2-B$/.test(variantaCislo(ZAK, ZAK.varianty[1])) && /9940$/.test(variantaCislo(ZAK, ZAK.varianty[0]))));
await snimek(p, 'v2_8_po_odstraneni_doklad_zustava');

await situace(p, 'stejna');
await klik(p, 'pridej:b'); await klik(p, 'odesli:a'); await klik(p, 'odesli:b');
const dalsi1 = await txt(p, '#vzpPanel .vzp-r-blok');
test('S3: tatáž varianta odeslána oběma, v dealu text s názvem, číslem, datem a cenou', /BETA Development a\.s\. \(smyšlené\) — CN 2026 - OPR - CN - 9940-B z \d+\. \d+\. \d{4}, [\d ]+ Kč bez DPH/.test(dalsi1), dalsi1);
test('S3: kontrola úniku — ALFA není v náhledu nabídky BETA', /✔ ALFA/.test(await txt(p, '#vzpPanel .vzp-kontroly')) && !/ÚNIK/.test(await txt(p, '#vzpPanel .vzp-kontroly'))
  && await p.evaluate(() => { const t = document.querySelector('#ock-nabidka .body table').textContent; return /BETA Development/.test(t) && /9940-B/.test(t) && !/ALFA/.test(t); }));
await snimek(p, 'v2_9_stejna_varianta_odeslano_obema');

await situace(p, 'prodej');
await klik(p, 'prodej:b'); await klik(p, 'prodejAno');
test('S4: po prodeji je BETA řídící, ALFA v textu „neprodáno"; prodaného ani řídícího odstranit nejde, ALFA ano', await p.evaluate(() =>
  /ALFA stavební s\.r\.o\. \(smyšlené\) — CN 2026 - OPR - CN - 9940 z .* — neprodáno/.test(document.querySelector('#vzpPanel .vzp-r-blok').textContent)
  && document.querySelector('#vzpKarta [data-vzp="odeber:b"]').disabled && !document.querySelector('#vzpKarta [data-vzp="odeber:a"]').disabled));
await klik(p, 'org'); await klik(p, 'orgAno');
await snimek(p, 'v2_10_prodano_druhemu_zakaznikovi');

await situace(p, 'odeslana');
await p.selectOption('#vzpRole', 'jiny'); await p.waitForTimeout(300);
test('role „jiný obchodník": zákazníka s odeslanou nabídkou odstranit nesmí', await p.evaluate(() => document.querySelector('#vzpKarta [data-vzp="odeber:b"]').disabled));
await p.selectOption('#vzpRole', 'autor'); await p.waitForTimeout(300);
await situace(p, 'pridat');
await klik(p, 'hraj'); await p.waitForTimeout(5 * 3500 + 1500);
test('▶ Přehrát projde přidání i odstranění a skončí ve standardním pohledu', !(await standard(p)).karta && /▶ Přehrát/.test(await txt(p, '#vzpLista')) && /zákazník odstraněn/.test(await txt(p, '#vzpLista')));
test('1600 px: bez chyb stránky', p.chyby.length === 0, p.chyby);
await p.close();

/* ---------- 400 × 800 ---------- */
p = await stranka(400, 800);
const siroko = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
test('400 px: bez vodorovného posuvu stránky (výchozí)', (await siroko()) <= 1, await siroko());
test('400 px: lišta nezabere víc než polovinu výšky', await p.evaluate(() => document.getElementById('vzpLista').offsetHeight <= 400), await p.evaluate(() => document.getElementById('vzpLista').offsetHeight));
await p.evaluate(() => document.querySelector('.zak-bar .vzp-pridat').scrollIntoView({ block: 'center' }));
await snimek(p, 'v2_11_mobil_400_vychozi_tlacitko');
await klik(p, 'form'); await klik(p, 'pridejForm:b');
test('400 px: po přidání je karta vidět a stránka se nerozjela', (await siroko()) <= 1 && await p.evaluate(() => { const r = document.querySelector('#vzpKarta').getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }));
await snimek(p, 'v2_12_mobil_400_druhy_zakaznik');
await klik(p, 'vlastni:b'); await klik(p, 'odeber:b');
test('400 px: potvrzení odstranění je vidět, bez vodorovného posuvu', (await siroko()) <= 1 && await p.evaluate(() => { const r = document.querySelector('#vzpKarta .vzp-potvrzeni').getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }));
await snimek(p, 'v2_13_mobil_400_odstranit');
await klik(p, 'odeberAno');
test('400 px: návrat do standardního pohledu', !(await standard(p)).karta && (await siroko()) <= 1);
test('400 px: bez chyb stránky', p.chyby.length === 0, p.chyby);
await p.close();
await b.close();
fs.unlinkSync(obal);
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
