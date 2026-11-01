/* K10 #541 — P4 ZÁLOHY (#529 O-T, Z1/Z2, O-K9): ruční × automatická,
 * odstup 10 min, denní strop, poškozené varování (fail-closed, jen hlavní
 * správce), kopie na Disk (jen záznam, žádný Disk), retence „před obnovou".
 * node podklady/K10_pokusy/p4_zalohy.mjs */
import { F, S, pamet, jreq, priprav, pripravData, nalez, over, konec } from './harness.mjs';
import * as Z from '../../netlify/lib/zalohovani.mjs';
const U = await priprav(); await pripravData(U.admin.cookie);
const H = 'Docasne.Heslo.123';
const vyn = (telo, c) => jreq(F.zaloha_vynuceno, 'POST', '/api/zaloha_vynuceno', telo, c === undefined ? U.admin.cookie : c);

/* 1. role */
for (const [k, c] of [['anonym', null], ['obchodník', U.obch.cookie], ['vedoucí', U.ved.cookie]]) {
  const r = await vyn({ duvod: 'rucne' }, c);
  over('P4.1 ' + k + ' vynucenou zálohu nepořídí', r.status === 401 || r.status === 403, r.status);
}
/* 2. ruční × automatická (čistá funkce nad klíči) */
const T = Date.parse('2026-11-01T10:00:00Z');
const kl = (min, druh) => Z.klicVynuceny(druh, T - min * 60000);
over('P4.2a ruční 3 min po automatické projde', Z.vynuceneLimit([kl(3, 'auto')], T, 'rucne').ok === true);
over('P4.2b ruční 3 min po ruční → odstup', Z.vynuceneLimit([kl(3, 'rucne')], T, 'rucne').ok === false);
over('P4.2c automatická 3 min po ruční → odstup', Z.vynuceneLimit([kl(3, 'rucne')], T, 'auto').ok === false);
over('P4.2d automatická 3 min po automatické → odstup', Z.vynuceneLimit([kl(3, 'auto')], T, 'auto').ok === false);
const dvacet = Array.from({ length: 20 }, (_, i) => kl(60 + i * 30, i % 2 ? 'auto' : 'rucne'));
over('P4.2e 20 vynucených za 24 h (mix) → strop i pro ruční', Z.vynuceneLimit(dvacet, T, 'rucne').ok === false);
over('P4.2f slot z budoucnosti (podvržený klíč) limit neobejde ani nezablokuje', Z.vynuceneLimit([Z.klicVynuceny('rucne', T + 3600e3)], T, 'rucne').ok === true);
/* skutečné API: auto, pak ruční, pak ruční */
const a1 = await vyn({ duvod: 'auto' }); const r1 = await vyn({ duvod: 'rucne' }); const r2 = await vyn({ duvod: 'rucne' });
over('P4.2g API: auto 200 → ruční 200 → druhá ruční 429 s „posledni"', a1.status === 200 && r1.status === 200 && r2.status === 429 && !!r2.posledni, [a1.status, r1.status, r2.status, r2.chyba]);
const r3 = await vyn({ duvod: { toString: 1 } });
over('P4.2h duvod jako objekt → bere se jako ruční, ne 500', r3.status === 429 || r3.status === 200, r3.status);

/* 3. poškozené varování → retence stojí, potvrdí jen hlavní správce */
for (const pos of ['text', 0, false, [], true]) {
  over('P4.3a poškozený záznam ' + JSON.stringify(pos) + ' drží retenci', !!Z.retenceDrzena(pos));
}
pamet.set('zalohy/' + Z.RETENCE_VAROVANI_KLIC, JSON.stringify('poskozeno'));
const p1 = await vyn({ akce: 'retence-potvrdit', den: '', hesloSpravce: 'PokusHeslo-admin2' }, U.admin2.cookie);
over('P4.3b vedlejší správce poškozený záznam nepotvrdí (403 jenHlavniSpravce)', p1.status === 403 && p1.kod === 'jenHlavniSpravce', p1);
const p2 = await vyn({ akce: 'retence-potvrdit', den: '', hesloSpravce: 'spatne' }, U.admin.cookie);
over('P4.3c hlavní správce se špatným heslem → odmítnuto', p2.status === 401 || p2.status === 403, p2.status);
const p3 = await vyn({ akce: 'retence-potvrdit', den: '', hesloSpravce: H }, U.admin.cookie);
const po = JSON.parse(pamet.get('zalohy/' + Z.RETENCE_VAROVANI_KLIC));
over('P4.3d hlavní správce s heslem potvrdí → čitelný záznam, retence běží', p3.status === 200 && po && typeof po === 'object' && !Z.retenceDrzena(po), { s: p3.status, ch: p3.chyba, po });
const g = await jreq(F.zaloha_vynuceno, 'GET', '/api/zaloha_vynuceno', undefined, U.admin2.cookie);
over('P4.3e přehled pro vedlejšího správce: smi.potvrditUbytek=false', g.smi && g.smi.potvrditUbytek === false, g.smi);

/* 4. kopie na Disk: jen záznam; cesta / jméno */
for (const soubor of ['../otisk_2026-10-01.json', 'otisk_2026-10-01.json/../../x', 'otisk_2026-10-01.json\u0000.gz', 'otisk_2026-10-01.exe']) {
  const k = await vyn({ akce: 'kopie-disk', kopie: { soubor, slozka: '_Zaloha Netlify DB' }, hesloSpravce: H });
  over('P4.4a jméno kopie ' + JSON.stringify(soubor) + ' → 400', k.status === 400, k.status);
}
const kz = await vyn({ akce: 'kopie-disk', kopie: { soubor: 'otisk_2026-10-01.json.gz', slozka: '_Zaloha Netlify DB', velikostB: 1, sha256: 'x' }, hesloSpravce: H });
nalez('K10-I2', 'záznam kopie na Disk je jen tvrzení prohlížeče (velikost 1 B, sha256 neplatné → prázdné) — server ho přijme a odemkne jím retenci (známé K9-I2, trvá)',
  kz.status === 200 && kz.kopieDisk && kz.kopieDisk.velikostB === 1, { s: kz.status, k: kz.kopieDisk });
const ko = await vyn({ akce: 'kopie-disk', kopie: { soubor: 'otisk_2026-10-01.json.gz', slozka: '_Zaloha Netlify DB' }, hesloSpravce: H }, U.obch.cookie);
over('P4.4b obchodník kopii nezapíše', ko.status === 403, ko.status);

/* 5. retence před obnovou: 6 měsíců, nejnovější vždy */
const dnes = '2026-11-01';
const kl5 = ['2026-04-30-pred-obnovou', '2026-05-01T101010-pred-obnovou', '2026-05-02T101010-pred-obnovou', '2026-10-01T090000-pred-obnovou', '2026-10-31', '2026-11-01'];
const sm = Z.retenceVyber(kl5, dnes);
over('P4.5a „před obnovou" starší než 6 měsíců se maže, mladší ne', sm.includes('2026-04-30-pred-obnovou') && sm.includes('2026-05-01T101010-pred-obnovou') && !sm.includes('2026-05-02T101010-pred-obnovou') && !sm.includes('2026-10-01T090000-pred-obnovou'), sm);
const jen = Z.retenceVyber(['2025-01-01-pred-obnovou', '2026-11-01'], dnes);
over('P4.5b jediný (nejnovější) „před obnovou" zůstane i po roce', !jen.includes('2025-01-01-pred-obnovou'), jen);
over('P4.5c ruční smazání „před obnovou" jen s klíčem v tvaru (cesta → 400)', (await vyn({ akce: 'smazat-pred-obnovou', klic: '../program/db', hesloSpravce: H })).status === 400);
konec();
