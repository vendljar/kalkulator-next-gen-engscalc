/* SEC-M server-B: platí nálezy auditu záloh K9 (integrace, podklady/K9_AUDIT_ZALOH_26_10.md) i na main?
 * Pokusem: K9-S1 (pozvolný úbytek), K9-S2 (přepis nepotvrzeného varování), K9-N2 (varování bez `kdy`),
 * K9-S5 (retence smaže zdroj rozběhnuté obnovy), K9-N7 (bez předchozího nočního). „FAIL" = nález trvá. */
import { pamet, sada } from './harness.mjs';
const T = sada('p6_k9_na_main');
const zal = await import('../../../netlify/lib/zalohovani.mjs');
const vycisti = () => { for (const k of [...pamet.keys()]) if (k.startsWith('zalohy/')) pamet.delete(k); };
const otisk = (k, pz, zdroj = 'nocni-otisk') => {
  pamet.set('zalohy/' + k, JSON.stringify({ porizena: k.slice(0, 10) + 'T02:00:00Z', zdroj, zakazky: {}, uzivatele: [] }));
  pamet.set('zalohy/souhrn/' + k, JSON.stringify({ den: k, porizena: k.slice(0, 10) + 'T02:00:00Z', zdroj, pocetZakazek: pz, pocetUctu: 5 }));
};
const kopie = (den) => pamet.set('zalohy/kopie-disk', JSON.stringify({ kdy: den + 'T02:30:00Z', soubor: 'otisk_' + den + '.json', velikostB: 10, sha256: 'a'.repeat(64), otisk: den, puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB', potvrzeno: 'heslo-spravce' }));
const ms = (d) => Date.parse(d + 'T03:00:00Z');

/* K9-S1 */
vycisti(); { let p = 800, var_ = 0; for (let d = 1; d <= 14; d++) { const k = '2026-11-' + String(d).padStart(2, '0'); p = Math.floor(p * 0.96); otisk(k, p); if ((await zal.retenceProved(k, k, ms(k))).varovani) var_++; }
  T.t('K9-S1 14 nocí po −4 % (800 → ' + p + ') dá varování', var_ > 0, var_); }
/* K9-S2 */
vycisti(); otisk('2026-11-01', 800); otisk('2026-11-02', 390);
await zal.retenceProved('2026-11-02', '2026-11-02', ms('2026-11-02'));
otisk('2026-11-03', 180);
await zal.retenceProved('2026-11-03', '2026-11-03', ms('2026-11-03'));
const v = JSON.parse(pamet.get('zalohy/retence-varovani'));
T.t('K9-S2 nepotvrzené varování (800 → 390) se dalším nepřepíše', /800/.test(v.text), v.text);
/* K9-N2 */
vycisti();
for (const d of ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24']) otisk(d, 100);
otisk('2026-12-01', 100); kopie('2026-12-01');
pamet.set('zalohy/retence-varovani', JSON.stringify({ den: '2026-11-30', text: 'úbytek' }));   // bez `kdy`
const n2 = await zal.retenceProved('2026-12-01', '2026-12-01', ms('2026-12-01'));
T.t('K9-N2 varování bez `kdy` retenci zastaví (smazáno ' + n2.smazano.length + ')', n2.smazano.length === 0, n2);
/* K9-S5 */
pamet.delete('zalohy/retence-varovani');
otisk('2026-10-25', 100);
pamet.set('zalohy/obnova-' + 'b'.repeat(32), JSON.stringify({ id: 'b'.repeat(32), kdo: 'x@example.com', zacatek: '2026-12-02T02:00:00Z', naposled: '2026-12-02T02:59:00Z', zdroj: '2026-10-25' }));
otisk('2026-12-02', 100); kopie('2026-12-02');
const s5 = await zal.retenceProved('2026-12-02', '2026-12-02', ms('2026-12-02'));
console.log('     retence při živém tokenu obnovy smazala: ' + JSON.stringify(s5.smazano));
T.t('K9-S5 retence nemaže, dokud běží obnova', !s5.smazano.length, s5.smazano);
/* K9-N7 */
vycisti(); otisk('2026-11-01T120000-rucne', 800, 'vynuceno'); otisk('2026-11-10', 10);
const n7 = await zal.retenceProved('2026-11-10', '2026-11-10', ms('2026-11-10'));
T.t('K9-N7 bez předchozího nočního se porovná s vynuceným (800 → 10 = varování)', !!n7.varovani, n7);
process.exitCode = T.konec() ? 1 : 0;
