/* K10 #541 — P2 PIPEDRIVE (#536): /api/pd/nanecisto (práva, původ, strop,
 * jen čtení), pojistka simulátoru, token v odpovědi, CSV. Simulátor jen
 * lokálně; falešný token se nastaví jen kvůli kontrole úniku — síť je
 * zakázaná (harness), takže nic neodejde.
 * node podklady/K10_pokusy/p2_pipedrive.mjs */
const FALESNY_TOKEN = 'k10falesnytoken0123456789abcdef';
process.env.PIPEDRIVE_TOKEN = FALESNY_TOKEN; process.env.PIPEDRIVE_DOMENA = 'k10-pokus';
process.env.PIPEDRIVE_SIMULATOR = '1';
import { F, jreq, priprav, pripravData, nalez, over, konec, require, sitPokusy } from './harness.mjs';
import { pdSimulatorStav } from '../../netlify/lib/pipedrive_simulator.mjs';
const U = await priprav(); await pripravData(U.admin.cookie);

/* 1. pojistka simulátoru — kombinace prostředí */
const P = (e) => pdSimulatorStav({ PIPEDRIVE_SIMULATOR: '1', ...e }).zapnuto;
over('P2.1a lokálně (bez známek Netlify) zapnuto', P({}) === true);
over('P2.1b Netlify bez PROSTREDI → vypnuto', P({ AWS_LAMBDA_FUNCTION_NAME: 'f' }) === false);
over('P2.1c Netlify PROSTREDI=test, větev main → vypnuto', P({ AWS_LAMBDA_FUNCTION_NAME: 'f', PROSTREDI: 'test', BRANCH: 'main' }) === false);
over('P2.1d Netlify PROSTREDI=test, URL schaftscalc → vypnuto', P({ AWS_LAMBDA_FUNCTION_NAME: 'f', PROSTREDI: 'test', URL: 'https://schaftscalc.netlify.app' }) === false);
over('P2.1e Netlify PROSTREDI=" Test " (mezera, velká) → zapnuto jen v testu', P({ AWS_LAMBDA_FUNCTION_NAME: 'f', PROSTREDI: ' Test ' }) === true);
over('P2.1f lokálně s PROSTREDI=ostre → vypnuto', P({ PROSTREDI: 'ostre' }) === false);
/* Ostrý web bez BRANCH/URL v běhovém prostředí funkce (Netlify je funkcím nemusí dát)
 * a s omylem nastaveným PROSTREDI=test: pojistka stojí jen na PROSTREDI. */
nalez('K10-I1', 'ostrý web, kde funkce nedostane BRANCH/URL/SITE_NAME a PROSTREDI=test omylem stojí → simulátor se zapne (pojistka jen na jedné proměnné)',
  P({ AWS_LAMBDA_FUNCTION_NAME: 'f', PROSTREDI: 'test' }) === true);
over('P2.1g PIPEDRIVE_SIMULATOR="0"/"" → vypnuto', pdSimulatorStav({ PIPEDRIVE_SIMULATOR: '0' }).zapnuto === false && pdSimulatorStav({}).zapnuto === false);

/* 2. práva /api/pd/nanecisto */
const telo = { strany: { ock: { hodnoty: { nazevAkce: '=HYPERLINK("http://x")', cisloCN: '+1+1' }, rucne: {} } }, dealId: '12', stav: 'won' };
const a0 = await jreq(F.pd_nanecisto, 'POST', '/api/pd/nanecisto', telo, null);
over('P2.2a anonym → 401', a0.status === 401, a0.status);
const zobPred = await jreq(F.zobrazeni, 'POST', '/api/zobrazeni', { matice: { 'crm.pipedrive': { 'Obchodník': false, 'Vedoucí': true } }, hesloSpravce: 'Docasne.Heslo.123' }, U.admin.cookie);
const o0 = await jreq(F.pd_nanecisto, 'POST', '/api/pd/nanecisto', telo, U.obch.cookie);
over('P2.2b obchodník, kterému správce právo crm.pipedrive odebral → 403', o0.status === 403, { z: zobPred.status, zch: zobPred.chyba, s: o0.status, ch: o0.chyba });
const g0 = await jreq(F.pd_nanecisto, 'GET', '/api/pd/nanecisto', undefined, U.admin.cookie);
over('P2.2c GET → 405', g0.status === 405, g0.status);
const c0 = await jreq(F.pd_nanecisto, 'POST', '/api/pd/nanecisto', telo, U.admin.cookie, { origin: 'https://zly.example.com' });
over('P2.2d cizí původ → odmítnuto (401/403)', c0.status === 403 || c0.status === 401, { s: c0.status, ch: c0.chyba });
const s0 = await jreq(F.pd_nanecisto, 'POST', '/api/pd/nanecisto', { ...telo, stav: 'deleted' }, U.admin.cookie);
over('P2.2e neplatný stav → 400', s0.status === 400, s0.status);
const d0 = await jreq(F.pd_nanecisto, 'POST', '/api/pd/nanecisto', { ...telo, dealId: '../users' }, U.admin.cookie);
over('P2.2f dealId s cestou → 400', d0.status === 400, d0.status);
const big = await jreq(F.pd_nanecisto, 'POST', '/api/pd/nanecisto', JSON.stringify({ strany: { ock: { hodnoty: { a: 'x'.repeat(600 * 1024) } } } }), U.admin.cookie);
over('P2.2g tělo nad 512 kB → 413', big.status === 413, big.status);

/* matice: dej obchodníkovi právo crm.pipedrive */
const ZOB = require('../../src/zobrazeni.js');
const matice = { 'crm.pipedrive': { 'Obchodník': true, 'Vedoucí': true } };
const zz = await jreq(F.zobrazeni, 'POST', '/api/zobrazeni', { matice, hesloSpravce: 'Docasne.Heslo.123' }, U.admin.cookie);
const o1 = await jreq(F.pd_nanecisto, 'POST', '/api/pd/nanecisto', telo, U.obch.cookie);
over('P2.2h obchodník s právem → 200, režim simulátor, „nic se neodeslalo"', o1.status === 200 && o1.rezim === 'simulator' && /nic/i.test(o1.nic || ''), { zz: zz.status, s: o1.status, ch: o1.chyba, r: o1.rezim });

/* 3. token / doména v odpovědi, jen čtení */
const vse = JSON.stringify(o1) + JSON.stringify(await jreq(F.pd_pole, 'GET', '/api/pd/pole', undefined, U.admin.cookie))
  + JSON.stringify(await jreq(F.pd_stav, 'GET', '/api/pd/stav', undefined, U.admin.cookie));
over('P2.3a falešný token ani doména nejsou v žádné odpovědi pd_nanecisto/pd_pole/pd_stav', !vse.includes(FALESNY_TOKEN) && !vse.includes('k10-pokus'));
const SIM = await import('../../netlify/lib/pipedrive_simulator.mjs');
over('P2.3b patch je jen v odpovědi (nanečisto nic neposílá: žádný fetch na síť)', sitPokusy.length === 0, sitPokusy);
over('P2.3c patch obsahuje stav won (připravený zápis)', o1.patch && o1.patch.status === 'won', o1.patch);

/* 4. strop na uživatele */
let posledni = 0;
for (let i = 0; i < 35; i++) posledni = (await jreq(F.pd_nanecisto, 'POST', '/api/pd/nanecisto', telo, U.obch.cookie)).status;
over('P2.4 strop dotazů nanečisto na obchodníka (30/h) → 429', posledni === 429, posledni);

/* 5. CSV injection v exportu nanečisto */
global.csvBunka = require('../../src/format.js').csvBunka;
const PDN = require('../../src/pd_nanecisto.js');
const csv = PDN.pdnCsv(o1, { cislo: '=1+1', nazevAkce: '@SUM(A1)', varianta: '-2+3', rezim: 'simulator' });
const radky = csv.split('\r\n').join('\n');
over('P2.5 CSV: buňky =, @, +, - z dat dostanou apostrof', !/(^|;)"[=@+\-]/m.test(radky.replace(/^﻿/, '')), radky.split('\n').slice(0, 9));
const PDN2 = PDN.pdnNazevSouboru({ cislo: '../../etc/passwd\u0000.csv' }, 'v1');
over('P2.6 název souboru nanečisto bez cesty/nulového znaku', !/[\/\\\u0000]|\.\./.test(PDN2), PDN2);
konec();
