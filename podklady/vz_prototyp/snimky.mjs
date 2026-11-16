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
test('výchozí stav: tlačítko „+ Přidat zákazníka" je u pole Zákazník a nápověda říká, kam kliknout', await p.evaluate(() => /^ZákazníkPřidat zákazníka$/.test(document.querySelector('.zak-bar .vzp-pridat').parentNode.textContent.trim()))
  && /Klikněte na „2\. Přidat zákazníka"/.test(await txt(p, '#vzpLista')) && /jediný rozdíl proti dnešní aplikaci/.test(await txt(p, '.vzp-pozn-proto')));
test('výchozí stav: u dealu žádná poznámka', /žádná poznámka \(zakázka má jednoho zákazníka\)/.test(await txt(p, '#vzpPanel')));
test('lišta je fixed a drží nahoře po posunu', await p.evaluate(() => { window.scrollTo(0, 900); const r = document.getElementById('vzpLista').getBoundingClientRect(); const o = r.top === 0 && getComputedStyle(document.getElementById('vzpLista')).position === 'fixed'; window.scrollTo(0, 0); return o; }));
const radky = () => p.evaluate(() => { const r = [...document.querySelectorAll('#page-kalk .card.zak-bar .zak-head-col:nth-child(2) .row')].slice(0, 3).map((e) => Math.round(e.getBoundingClientRect().height));
  const b = document.querySelector('.zak-bar .vzp-pridat').getBoundingClientRect(), l = document.querySelector('.zak-bar .vzp-pridat').parentNode.firstChild, rg = document.createRange(); rg.selectNode(l); const t = rg.getBoundingClientRect();
  return { r, vRadku: b.top < t.bottom && b.bottom > t.top && b.left >= t.right, vstup: Math.round(document.querySelector('.zak-bar .nasept-wrap input').getBoundingClientRect().width) }; });
const r1 = await radky();
test('tlačítko „Přidat zákazníka" (bez +) je na řádku vedle popisku Zákazník a řádek má stejnou výšku jako sousední (panel otevřený)', r1.vRadku && r1.r[0] === r1.r[1] && r1.r[1] === r1.r[2] && r1.vstup >= 100, r1);
await snimek(p, 'v4_1_tlacitko_na_radku_panel_otevreny');
await klik(p, 'panel');
const r2 = await radky();
test('totéž se zavřeným panelem prototypu (1600 px)', r2.vRadku && r2.r[0] === r2.r[1] && r2.r[1] === r2.r[2] && r2.vstup >= 150, r2);
await snimek(p, 'v4_2_tlacitko_na_radku_bez_panelu');
await klik(p, 'panel');

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
  && /standardní kalkulace/.test(await txt(p, '#vzpKarta .vzp-potvrzeni')) && /upraví se na „žádní"/.test(await txt(p, '#vzpKarta .vzp-potvrzeni')));
await snimek(p, 'v2_5_odstranit_potvrzeni');
await klik(p, 'odeberAno');
const s5 = await standard(p);
test('krok 6: po odstranění je aplikace zpět ve standardním pohledu (bez karty, přepínače, pruhu a písmene)', !s5.karta && !s5.chips && !s5.pruh && s5.tlacitko === 1 && !s5.cislo, s5);
test('krok 6: hlavička je znak po znaku stejná jako ve výchozím stavu', (await hlavicka(p)) === h0);
test('krok 6: v zakázce zůstala jedna varianta a poznámka u dealu říká „žádní" se značkou zakázky', await p.evaluate(() => ZAK.varianty.length === 1 && ZAK.varianty[0].ridici === true) && /Další zákazníci na zakázce: žádní — nabídka 2026 - OPR - CN - 9940/.test(await txt(p, '#vzpPanel .vzp-r-blok')));
await snimek(p, 'v2_6_navrat_do_standardniho_pohledu');

await situace(p, 'odeslana');
test('S2 výchozí: ALFA a BETA, BETA má odeslanou vlastní variantu; situace přepne roli na administrátora', (await p.inputValue('#vzpRole')) === 'admin' && (await p.locator('#vzpKarta .zamek-stav').count()) === 2 && /9940\.2-B/.test(await txt(p, '#vzpKarta tr[data-z="b"]')));
await klik(p, 'odeber:b');
test('S2 krok 2: u odeslané nabídky potvrzení říká, že doklad a zamčená varianta zůstávají a že smí jen administrátor', /jen administrátor/.test(await txt(p, '#vzpKarta .vzp-potvrzeni')) && /doklad zůstává/.test(await txt(p, '#vzpKarta .vzp-potvrzeni')) && /zůstává v zakázce zamčená/.test(await txt(p, '#vzpKarta .vzp-potvrzeni')) && /už se nepřidělí/.test(await txt(p, '#vzpKarta .vzp-potvrzeni')));
await snimek(p, 'v3_3_odstranit_s_odeslanou_nabidkou_jen_administrator');
await klik(p, 'odeberAno');
test('S2 krok 3: standardní pohled; zamčená varianta zůstala doložená s číslem …9940.2-B', !(await standard(p)).karta && await p.evaluate(() => ZAK.varianty.length === 2 && !!ZAK.varianty[1].zamek && /9940\.2-B$/.test(variantaCislo(ZAK, ZAK.varianty[1])) && /9940$/.test(variantaCislo(ZAK, ZAK.varianty[0]))));
await snimek(p, 'v2_8_po_odstraneni_doklad_zustava');

await situace(p, 'stejna');
await klik(p, 'pridej:b'); await klik(p, 'odesli:a'); await klik(p, 'odesli:b');
const dalsi1 = await txt(p, '#vzpPanel .vzp-r-blok');
test('S3: tatáž varianta odeslána oběma, poznámka u dealu má úvod, řádek zákazníka a značku zakázky', /^.*Další zákazníci na zakázce:/s.test(dalsi1) && /— nabídka 2026 - OPR - CN - 9940\s*$/.test(dalsi1) && /BETA Development a\.s\. \(smyšlené\) — CN 2026 - OPR - CN - 9940-B z \d+\. \d+\. \d{4}, [\d ]+ Kč bez DPH/.test(dalsi1), dalsi1);
test('S3: kontrola úniku — ALFA není v náhledu nabídky BETA', /✔ ALFA/.test(await txt(p, '#vzpPanel .vzp-kontroly')) && !/ÚNIK/.test(await txt(p, '#vzpPanel .vzp-kontroly'))
  && await p.evaluate(() => { const t = document.querySelector('#ock-nabidka .body table').textContent; return /BETA Development/.test(t) && /9940-B/.test(t) && !/ALFA/.test(t); }));
await snimek(p, 'v3_4_poznamka_u_dealu');

await p.selectOption('#vzpRole', 'autor'); await p.waitForTimeout(300);
await situace(p, 'sachty');
test('víc šachet je v prototypu zapnuté: skutečné pole „Počet variant šachet" aplikace je vidět', await p.evaluate(() => /Počet variant/.test(document.querySelector('#page-kalk').textContent) && viceSachetZapnuto() === true));
await klik(p, 'vlastni:b'); await klik(p, 'sachty:b');
test('víc zákazníků + víc šachet: BETA má ve vlastní variantě 2 varianty šachet / 3 ks, ALFA dál jednu šachtu a svou cenu', /šachty: 2 varianty/.test(await txt(p, '#vzpKarta tr[data-z="b"]')) && !/šachty:/.test(await txt(p, '#vzpKarta tr[data-z="a"]'))
  && await p.evaluate(() => rezimViceSachet(ZAK.varianty[1].data.ock) && !rezimViceSachet(ZAK.varianty[0].data.ock) && !!document.querySelector('#vsKalkPrepinac, [onclick*="vsAkt"]')));
await snimek(p, 'v4_3_vic_zakazniku_a_vic_sachet');
await klik(p, 'odesli:b');
test('víc šachet: nabídka BETA odeslána, živý náhled CN nese BETA a číslo …9940.2-B', /odeslána/.test(await txt(p, '#vzpKarta tr[data-z="b"]')) && await p.evaluate(() => { const t = document.querySelector('#ock-nabidka .body table').textContent; return /BETA/.test(t) && /9940\.2-B/.test(t) && !/ALFA/.test(t); }));
await situace(p, 'prodej');
await klik(p, 'prodej:b');
test('S4 krok 2: potvrzení prodeje ukazuje i přepsání organizace dealu na vítěze', /Deal 4321: organizace/.test(await txt(p, '#vzpKarta .vzp-potvrzeni')) && /najde podle IČO, jinak se založí/.test(await txt(p, '#vzpKarta .vzp-potvrzeni')));
await klik(p, 'prodejAno');
const orgRadek = () => p.evaluate(() => [...document.querySelectorAll('#vzpPanel .vzp-r')].find((x) => x.textContent.indexOf('Organizace dealu') === 0).textContent);
test('S4 krok 3: po prodeji je BETA řídící, organizace dealu přepsána na BETA, ALFA v poznámce „neprodáno"', /přepsáno na vítězného zákazníka/.test(await orgRadek()) && /→ ?BETA Development/.test(await orgRadek()) && await p.evaluate(() =>
  /ALFA stavební s\.r\.o\. \(smyšlené\) — CN 2026 - OPR - CN - 9940 z .* — neprodáno/.test(document.querySelector('#vzpPanel .vzp-r-blok').textContent)
  && document.querySelector('#vzpKarta input[data-vzp-ridici="b"]').checked && !document.querySelector('#vzpKarta .vzp-upoz')));
test('S4: prodaného ani řídícího odstranit nejde; ALFA (odeslaná nabídka) jen administrátor', await p.evaluate(() => document.querySelector('#vzpKarta [data-vzp="odeber:b"]').disabled && document.querySelector('#vzpKarta [data-vzp="odeber:a"]').disabled));
await snimek(p, 'v3_1_prodano_organizace_prepsana');
await p.selectOption('#vzpPd', 'vypadek'); await p.waitForTimeout(350);
await klik(p, 'prodej:b'); await klik(p, 'prodejAno');
test('S4 výpadek Pipedrive: prodej platí, organizace zůstala a aplikace nabízí „Zkusit zápis znovu"', /zápis selhal/.test(await orgRadek()) && /Organizace dealu se nepřepsala/.test(await txt(p, '#vzpKarta .vzp-upoz')) && /prodáno/.test(await txt(p, '#vzpKarta tr[data-z="b"]')));
await snimek(p, 'v3_2_vypadek_pipedrive_zapis_ceka');
await klik(p, 'orgAno');
test('S4 opakovaný zápis: organizace dealu = BETA, upozornění zmizelo', /BETA Development/.test(await orgRadek()) && !(await p.locator('#vzpKarta .vzp-upoz').count()));
await p.selectOption('#vzpPd', 'ok'); await p.waitForTimeout(300);

await situace(p, 'odeslana');
await p.selectOption('#vzpRole', 'jiny'); await p.waitForTimeout(300);
test('role „jiný obchodník": zákazníka s odeslanou nabídkou odstranit nesmí', await p.evaluate(() => document.querySelector('#vzpKarta [data-vzp="odeber:b"]').disabled));
await p.selectOption('#vzpRole', 'autor'); await p.waitForTimeout(300);
test('role „autor zakázky": zákazníka s odeslanou nabídkou odstranit nesmí (jen administrátor)', await p.evaluate(() => document.querySelector('#vzpKarta [data-vzp="odeber:b"]').disabled));
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
