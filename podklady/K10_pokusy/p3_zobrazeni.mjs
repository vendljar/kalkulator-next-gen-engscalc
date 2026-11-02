/* K10 #541 — P3 ZOBRAZENÍ, sloupec Administrátor (#539).
 * node podklady/K10_pokusy/p3_zobrazeni.mjs */
import { F, pamet, jreq, priprav, pripravData, nalez, over, konec, require } from './harness.mjs';
const ZOB = require('../../src/zobrazeni.js');
const U = await priprav(); await pripravData(U.admin.cookie);
const H = 'Docasne.Heslo.123';
const post = (matice, c) => jreq(F.zobrazeni, 'POST', '/api/zobrazeni', { matice, hesloSpravce: H }, c || U.admin.cookie);
const ulozena = () => JSON.parse(pamet.get('program/zobrazeni') || 'null');

const r1 = await post({ 'nastaveni.otevrit': { 'Administrátor': false } });
over('P3.1 skrýt správci vstup do Nastavení → 400 adminZamek', r1.status === 400 && r1.kod === 'adminZamek', r1);
const r2 = await post({ 'zaloha.vynucena': { 'Administrátor': null }, 'nastaveni.zobrazeni': { 'Administrátor': 0 } });
over('P3.2 null / 0 u zamčených → 400 (obě vyjmenované)', r2.status === 400 && (r2.zamcene || []).length === 2, r2);
const r3 = await post({ 'nastaveni.zobrazeni': { 'Administrátor': 'false' } });
over('P3.3 řetězec "false" u zamčeného → uloží se jako viditelné (očista true)', r3.status === 200 && ulozena().matice['nastaveni.zobrazeni']['Administrátor'] === true, { r3: r3.status, m: ulozena() && ulozena().matice['nastaveni.zobrazeni'] });
const r4 = await post({ 'tab.cenik': { 'Administrátor': false }, 'crm.pipedrive': { 'Administrátor': false }, 'naklady.ceniky': { 'Administrátor': false } });
over('P3.4 skrytí nezamčených prvků správci → 200', r4.status === 200, r4);
const m = ulozena().matice;
over('P3.5 skrytí nebere práva: zobrazeniSmi(Administrátor, crm.pipedrive / naklady.ceniky) = true',
  ZOB.zobrazeniSmi('Administrátor', 'crm.pipedrive', m) && ZOB.zobrazeniSmi('Administrátor', 'naklady.ceniky', m) && !ZOB.zobrazeniVidi('Administrátor', 'crm.pipedrive', m));
const pd = await jreq(F.pd_nanecisto, 'POST', '/api/pd/nanecisto', { strany: { ock: { hodnoty: { a: 'b' } } } }, U.admin.cookie);
over('P3.6 správce se skrytým crm.pipedrive dál smí /api/pd/nanecisto (200)', pd.status === 200, { s: pd.status, ch: pd.chyba });
const r5 = await post({ 'nastaveni.otevrit': { 'Administrátor': false } }, U.ved.cookie);
over('P3.7 vedoucí matici neuloží (403)', r5.status === 403, r5.status);
const r6 = await jreq(F.zobrazeni, 'POST', '/api/zobrazeni', { matice: { 'tab.cenik': { 'Administrátor': true } } }, U.admin2.cookie);
over('P3.8 bez hesla správce → odmítnuto (401)', r6.status === 401 || r6.status === 403, r6.status);
/* stará matice bez sloupce Administrátor */
const stara = { 'tab.cenik': { 'Obchodník': false, 'Vedoucí': true } };
const o = ZOB.zobrazeniOciste(stara);
over('P3.9 stará matice bez sloupce: správce vidí vše', ZOB.ZOBRAZENI_PRVKY.every(p => o[p.klic]['Administrátor'] === true));
/* obnova ze souboru s maticí, která správci skrývá zamčené prvky */
const zal = (await jreq(F.zaloha, 'GET', '/api/zaloha', undefined, U.admin.cookie)).zaloha;
zal.zobrazeni = { matice: { 'nastaveni.otevrit': { 'Administrátor': false }, 'nastaveni.uzivatele': { 'Administrátor': false, 'Obchodník': true } }, kdo: 'x', kdy: '2026-10-01T00:00:00Z' };
const ob = await jreq(F.obnova, 'POST', '/api/obnova', { zdroj: { soubor: zal }, rezim: 'prepsat', casti: ['zobrazeni'], potvrzeni: 'OBNOVIT', hesloSpravce: H }, U.admin.cookie);
const po = ulozena();
over('P3.10 obnova ze souboru: zamčené prvky správci zůstanou viditelné, pevné obchodníkovi zavřené',
  ob.status === 200 && po && po.kdo === 'x' && po.matice['nastaveni.otevrit']['Administrátor'] === true && po.matice['nastaveni.uzivatele']['Obchodník'] === false,
  { s: ob.status, ch: ob.chyba, m: po && [po.matice['nastaveni.otevrit'], po.matice['nastaveni.uzivatele']] });
konec();
