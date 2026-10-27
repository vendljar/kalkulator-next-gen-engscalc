/* RETENCE ZÁLOH A KOMPRESE OTISKU (#523 Z2, rozhodnutí J. V. 26. 10. 2026).
 *
 * Mazání záloh je NEVRATNÉ — proto tabulkový test na PŘESNÝ výběr klíčů:
 *   - Blobs: noční 14 dní, týdenní (neděle / nejbližší starší v týdnu)
 *     8 týdnů, měsíční (první v měsíci) 6 měsíců, vynucené 7 dní, před
 *     obnovou nikdy; staré otisky (do 19. 10. 2026) jen první v měsíci;
 *   - simulace nocí od 27. 10. 2026 do 10. 5. 2027 nad zářijovými klíči
 *     (každou noc nový otisk + retence) se seznamem toho, co v kontrolních
 *     dnech zůstane — sestaveno a ověřeno ručně podle pravidla, ne kódem;
 *   - pojistky kolem: nejnovější nikdy, pokles dat, kopie na Disk, části
 *     a souhrny se mažou s otiskem; rozpočet mazání a navázání další běh;
 *   - komprese částí otisku (gzip, binární blob) a čtení starého formátu.
 *
 * Pojistka: nad kódem před #523 (v26.10.8) sada selže — retenceVyber drží
 * 30 dní a staré otisky nikdy (tabulka, simulace), části se ukládají jako
 * JSON (komprese), retenceProved nemá rozpočet. Po opravě projde.
 * Spuštění: node netlify/test_z2_retence.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';

/* Paměťové úložiště s binárními záznamy (jako Netlify Blobs: set/get arrayBuffer). */
const pamet = new Map();
let zpozdeniSmaz = 0;
const smazano = [];
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { const v = pamet.get(nazev + '/' + k);
    if (v === undefined) return null;
    if (Buffer.isBuffer(v)) return JSON.parse(v.toString('utf8'));    // Blobs: JSON z binárního = výjimka u gzip
    return JSON.parse(v); },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async ctiBin(k) { const v = pamet.get(nazev + '/' + k); return v === undefined ? null : (Buffer.isBuffer(v) ? v : Buffer.from(v)); },
  async zapisBin(k, b) { pamet.set(nazev + '/' + k, Buffer.from(b)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { if (zpozdeniSmaz) await new Promise(r => setTimeout(r, zpozdeniSmaz)); smazano.push(nazev + '/' + k); pamet.delete(nazev + '/' + k); },
});
/* Úložiště bez binárních záznamů (náhrady v ostatních sadách) — otisk bez komprese. */
const ZAKLADNI_ULOZISTE = globalThis.__TEST_ULOZISTE;
const bezBin = (n) => { const u = ZAKLADNI_ULOZISTE(n); delete u.ctiBin; delete u.zapisBin; return u; };

const Z = await import('./lib/zalohovani.mjs');
const { default: zalohaNocni } = await import('./functions/zaloha_nocni.mjs');
const require = createRequire(import.meta.url);
const R = require('../src/retence_zaloh.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const zkus = async (n, fn) => { try { await fn(); } catch (e) { test(n + ' (výjimka)', false, String(e && e.stack || e)); } };
const ticho = async (fn) => { const l = console.log, w = console.warn; console.log = console.warn = () => {};
  try { return await fn(); } finally { console.log = l; console.warn = w; } };
const ulz = (n) => globalThis.__TEST_ULOZISTE(n);
const J = (x) => JSON.stringify(x);
const DEN = 86400000;
const den = (t) => new Date(t).toISOString().slice(0, 10);
const dnyOd = (od, po) => { const out = []; for (let t = Date.parse(od); t <= Date.parse(po); t += DEN) out.push(den(t)); return out; };

/* ---------------- 1) pravidlo: konstanty a výklad ---------------- */
await zkus('pravidlo', async () => {
  test('#523: Blobs 14 dní / 8 týdnů / 6 měsíců / vynucené 7 dní / před obnovou 6 měsíců (#529)', J(R.RETENCE_ZALOH_BLOBS) === J({ dnu: 14, tydnu: 8, mesicu: 6, vynuceneDnu: 7, predObnovouMesicu: 6 })
    && Z.RETENCE_DENNI_DNU === 14 && Z.RETENCE_TYDNU === 8 && Z.RETENCE_MESICU === 6 && Z.RETENCE_VYNUCENE_DNU === 7);
  test('#523: Disk 7 dní / 8 týdnů / 6 měsíců', J(R.RETENCE_ZALOH_DISK) === J({ dnu: 7, tydnu: 8, mesicu: 6 }));
  test('#523: staré otisky = před 20. 10. 2026; výjimka RETENCE_OD zrušená', R.RETENCE_ZALOH_STARE_PRED === '2026-10-20'
    && Z.RETENCE_STARE_PRED === '2026-10-20' && Z.RETENCE_OD === undefined);
  test('#523: hranice měsíců — 31. 8. minus 6 měsíců = 28. 2., 26. 4. = 26. 10.',
    den(R.retenceZalohMesicuZpet(Date.parse('2027-08-31'), 6)) === '2027-02-28'
    && den(R.retenceZalohMesicuZpet(Date.parse('2027-04-26'), 6)) === '2026-10-26'
    && den(R.retenceZalohMesicuZpet(Date.parse('2028-08-31'), 6)) === '2028-02-29');
  test('#523: neplatná data (31. 2., jiný tvar) se neberou', !Number.isFinite(R.retenceZalohDenMs('2027-02-31'))
    && !Number.isFinite(R.retenceZalohDenMs('2027-2-1')) && R.retenceZalohDrz(['2027-01-01'], '2027-02-31', R.RETENCE_ZALOH_BLOBS) === null);
  const p = R.retenceZalohPopis();
  test('#523: popis pro obrazovku nese čísla pravidla', /14 dní/.test(p.blobs) && /8 týdnů/.test(p.blobs) && /6 měsíců/.test(p.blobs)
    && /7 dní/.test(p.blobs) && /7 dní/.test(p.disk) && /před obnovou 6 měsíců \(nejnovější z nich zůstává vždy\)/.test(p.blobs));
});

/* ---------------- 2) tabulka: přesný výběr klíčů v Blobs ---------------- */
await zkus('tabulka', async () => {
  const V = Z.retenceVyber;
  const pripady = [
    /* [popis, dnes, klíče, ke smazání] */
    ['denní: věk 13 zůstane, 14 se smaže (středa a čtvrtek, týden zastupuje neděle)', '2027-03-18',
      ['2027-03-03', '2027-03-04', '2027-03-05', '2027-03-07', '2027-03-18'], ['2027-03-04']],
    ['týdenní: neděle drží týden, ostatní dny týdne starší 14 dní se smažou', '2027-03-31',
      ['2027-03-01', '2027-03-08', '2027-03-09', '2027-03-10', '2027-03-11', '2027-03-12', '2027-03-13', '2027-03-14', '2027-03-31'],
      ['2027-03-08', '2027-03-09', '2027-03-10', '2027-03-11', '2027-03-12', '2027-03-13']],
    ['týdenní: chybí-li neděle, drží se nejbližší starší (sobota)', '2027-03-31',
      ['2027-03-01', '2027-03-08', '2027-03-12', '2027-03-13', '2027-03-31'], ['2027-03-08', '2027-03-12']],
    ['týdenní: týden jen pondělí–středa → drží se středa', '2027-03-31',
      ['2027-03-01', '2027-03-08', '2027-03-09', '2027-03-10', '2027-03-31'], ['2027-03-08', '2027-03-09']],
    ['týdenní: přelom měsíce — týden 26. 4.–2. 5. 2027 drží neděli 2. 5., první v květnu je 1. 5.', '2027-05-31',
      ['2027-04-01', '2027-04-28', '2027-04-30', '2027-05-01', '2027-05-02', '2027-05-31'], ['2027-04-28', '2027-04-30']],
    ['týdenní: neděle stará 55 dní zůstane, 56 dní se smaže', '2027-03-28',
      ['2027-01-01', '2027-01-31', '2027-02-01', '2027-03-28'], ['2027-01-31']],
    ['týdenní: přelom roku — týden 28. 12. 2026–3. 1. 2027 drží neděli 3. 1.', '2027-02-14',
      ['2026-12-01', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-03', '2027-02-14'], ['2026-12-30', '2026-12-31']],
    ['měsíční: první v měsíci, i když to není 1. (výpadek nocí)', '2027-03-31',
      ['2026-12-03', '2026-12-04', '2026-12-06', '2027-03-31'], ['2026-12-04', '2026-12-06']],
    ['měsíční: 26. 4. 2027 — první v měsíci z 26. 10. 2026 (přesně 6 měsíců) se smaže', '2027-04-26',
      ['2026-10-26', '2027-04-26'], ['2026-10-26']],
    ['měsíční: 25. 4. 2027 — první v měsíci z 26. 10. 2026 ještě zůstane', '2027-04-25',
      ['2026-10-26', '2027-04-25'], []],
    ['měsíční: 31. 8. → hranice 28. 2.; 1. 3. zůstane, 28. 2. se smaže', '2027-08-31',
      ['2027-02-28', '2027-03-01', '2027-08-31'], ['2027-02-28']],
    ['vynucené: 6 dní zůstane, 7 dní se smaže; do týdnů ani měsíců se nepočítají', '2027-03-18',
      ['2027-03-11T120000-rucne', '2027-03-12T000000-auto', '2027-03-01T080000-auto', '2027-03-18'],
      ['2027-03-01T080000-auto', '2027-03-11T120000-rucne']],
    /* #529 (K9-I3, J. V. 27. 10. 2026): do té doby „nikdy" */
    ['před obnovou po 6 měsících (oba tvary), nejnovější z nich zůstane', '2028-01-01',
      ['2026-09-10T101010-pred-obnovou', '2026-09-10-pred-obnovou', '2027-12-31T235959-pred-obnovou', '2028-01-01'],
      ['2026-09-10-pred-obnovou', '2026-09-10T101010-pred-obnovou']],
    ['před obnovou: jediný (nejnovější) zůstane, i když je starší 6 měsíců', '2028-01-01',
      ['2026-09-10T101010-pred-obnovou', '2028-01-01'], []],
    ['nejnovější otisk zůstane, i když je jediný a starý (vynucený)', '2028-01-01',
      ['2027-03-01T080000-auto'], []],
    ['nejnovější noční zůstane i po výpadku nocí delším než půl roku', '2028-01-01',
      ['2027-03-05', '2027-03-06', '2027-03-07'], ['2027-03-05', '2027-03-06']],
    ['otisk s datem v budoucnosti se nemaže', '2027-03-01',
      ['2027-02-27', '2027-03-05', '2027-03-01'], []],
    ['STARÉ (do 19. 10. 2026): k 26. 10. zůstane jen první v měsíci, i čerstvé staré denní a nedělní odejdou', '2026-10-26',
      ['2026-09-04', '2026-09-05', '2026-09-06', '2026-09-13', '2026-09-30', '2026-10-01', '2026-10-12', '2026-10-13', '2026-10-18',
        '2026-10-19', '2026-10-20', '2026-10-25', '2026-10-26'],
      ['2026-09-05', '2026-09-06', '2026-09-13', '2026-09-30', '2026-10-12', '2026-10-13', '2026-10-18', '2026-10-19']],
    ['STARÉ: týden 19.–25. 10. 2026 zastupuje neděle 25. 10. (nová), pondělí 19. 10. (staré) odejde', '2026-11-30',
      ['2026-10-01', '2026-10-19', '2026-10-20', '2026-10-25', '2026-11-01', '2026-11-30'], ['2026-10-19', '2026-10-20']],
    ['STARÉ: i první v měsíci odejde po 6 měsících (31. 3. 2027: 4. 9. pryč, 1. 10. zůstane)', '2027-03-31',
      ['2026-09-04', '2026-10-01', '2027-03-01', '2027-03-31'], ['2026-09-04']],
    ['STARÉ vynucené: po 7 dnech jako ostatní vynucené', '2026-10-26',
      ['2026-10-19T235959-rucne', '2026-10-20T000000-auto', '2026-10-26'], ['2026-10-19T235959-rucne']],
    ['cizí klíče výběr nevidí (souhrny, části, stav, kopie, rozpracované)', '2027-06-01',
      ['souhrn/2020-01-02', 'casti/2020-01-02/00000', 'otisk-stav', 'kopie-disk', 'rozpracovany/2020-01-02', 'retence-varovani',
        'nocni-dokonceno', '2020-01-02x', '2027-06-01'], []],
  ];
  for (const [popis, dnes, klice, ocek] of pripady) {
    const vys = V(klice, dnes);
    test('#523 tabulka: ' + popis, J(vys) === J(ocek.slice().sort()), { dnes, vys, ocek });
  }
  test('#523 tabulka: neplatný dnešek = nemaže se nic', V(['2020-01-01', '2020-01-02'], '').length === 0
    && V(['2020-01-01', '2020-01-02'], '2027-13-01').length === 0);
});

/* ---------------- 3) simulace nocí od nasazení (27. 10. 2026) ---------------- */
await zkus('simulace', async () => {
  /* Blobs k 26. 10. 2026: noční otisky každý den od 4. 9., automatický
   * a ruční otisk, otisk před obnovou. Od 27. 10. každou noc nový otisk
   * a hned retence (jako zaloha_nocni). */
  const klice = new Set(dnyOd('2026-09-04', '2026-10-26'));
  for (const k of ['2026-10-21T081500-auto', '2026-10-26T090000-rucne', '2026-10-02T101010-pred-obnovou']) klice.add(k);
  const zustava = {};
  let smazanoCelkem = 0, znovu = 0;
  for (const d of dnyOd('2026-10-27', '2027-05-10')) {
    klice.add(d);
    const pryc = Z.retenceVyber([...klice], d);
    smazanoCelkem += pryc.length;
    for (const k of pryc) klice.delete(k);
    znovu += Z.retenceVyber([...klice], d).length;       // idempotence: hned znovu nic
    zustava[d] = [...klice].sort();
  }
  /* Ručně podle pravidla (komentáře = proč klíč zůstal). */
  test('#523 simulace 27. 10. 2026: ze září a října do 19. 10. jen první v měsíci; 20.–27. 10. denní; vynucené 21. a 26. 10.; před obnovou',
    J(zustava['2026-10-27']) === J(['2026-09-04', '2026-10-01', '2026-10-02T101010-pred-obnovou', '2026-10-20', '2026-10-21',
      '2026-10-21T081500-auto', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-26T090000-rucne', '2026-10-27']),
    zustava['2026-10-27']);
  test('#523 simulace 30. 11. 2026: denní 17.–30. 11., neděle 25. 10.–15. 11., měsíční 4. 9., 1. 10., 1. 11.; vynucené pryč',
    J(zustava['2026-11-30']) === J(['2026-09-04', '2026-10-01', '2026-10-02T101010-pred-obnovou', '2026-10-25', '2026-11-01',
      '2026-11-08', '2026-11-15', ...dnyOd('2026-11-17', '2026-11-30')]), zustava['2026-11-30']);
  test('#523 simulace 10. 1. 2027: denní 28. 12.–10. 1., neděle od 22. 11. (15. 11. je stará 56 dní), měsíční od září',
    J(zustava['2027-01-10']) === J(['2026-09-04', '2026-10-01', '2026-10-02T101010-pred-obnovou', '2026-11-01', '2026-11-22', '2026-11-29',
      '2026-12-01', '2026-12-06', '2026-12-13', '2026-12-20', '2026-12-27', ...dnyOd('2026-12-28', '2027-01-10')]), zustava['2027-01-10']);
  test('#523 simulace 10. 5. 2027: září, říjen a listopad 2026 odešly (6 měsíců), neděle od 21. 3., denní 27. 4.–10. 5.',
    J(zustava['2027-05-10']) === J(['2026-10-02T101010-pred-obnovou', '2026-12-01', '2027-01-01', '2027-02-01', '2027-03-01', '2027-03-21',
      '2027-03-28', '2027-04-01', '2027-04-04', '2027-04-11', '2027-04-18', '2027-04-25', ...dnyOd('2027-04-27', '2027-05-10')]),
    zustava['2027-05-10']);
  test('#523 simulace: retence je idempotentní (druhý výběr téže noci nic nevybere)', znovu === 0, znovu);
  /* ustálený stav: 14 denních + ≤ 8 nedělí mimo ně + ≤ 6–7 měsíčních */
  const pocty = Object.entries(zustava).filter(([d]) => d >= '2027-05-01').map(([, k]) => k.filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)).length);
  test('#523 simulace: v ustáleném stavu drží Blobs nejvýš 14 + 8 + 7 nočních otisků', pocty.every(n => n <= 29) && Math.min(...pocty) >= 20, pocty);
  test('#523 simulace: od nasazení se mazalo (zářijové otisky nezůstávají navždy)', smazanoCelkem > 150, smazanoCelkem);
  /* týdenní a měsíční otisk nesmí zmizet dřív, než mu vyprší lhůta */
  const prvniSmazani = {};
  const k2 = new Set(dnyOd('2026-10-20', '2026-10-26'));
  for (const d of dnyOd('2026-10-27', '2027-08-01')) { k2.add(d); for (const k of Z.retenceVyber([...k2], d)) { k2.delete(k); prvniSmazani[k] = d; } }
  const vek = (k) => Math.round((Date.parse(prvniSmazani[k]) - Date.parse(k)) / DEN);
  const nedele = Object.keys(prvniSmazani).filter(k => new Date(k + 'T00:00:00Z').getUTCDay() === 0 && k.slice(8) !== '01' && k !== '2026-10-20');
  test('#523 simulace: každá neděle (není-li první v měsíci) odejde přesně ve stáří 56 dní', nedele.length > 20 && nedele.every(k => vek(k) === 56),
    nedele.filter(k => vek(k) !== 56).map(k => [k, prvniSmazani[k]]));
  /* první v měsíci: 1. den, v říjnu 2026 je první až 20. 10. (dřív nic) */
  const jePrvni = (k) => k.slice(8) === '01' || k === '2026-10-20';
  const vsedni = Object.keys(prvniSmazani).filter(k => new Date(k + 'T00:00:00Z').getUTCDay() !== 0 && !jePrvni(k));
  test('#523 simulace: všední den (ne první v měsíci) odejde přesně ve stáří 14 dní', vsedni.length > 100 && vsedni.every(k => vek(k) === 14),
    vsedni.filter(k => vek(k) !== 14).slice(0, 5).map(k => [k, prvniSmazani[k]]));
  const prvni = Object.keys(prvniSmazani).filter(jePrvni);
  test('#523 simulace: první v měsíci odejde přesně po 6 měsících (20. 10. 2026 → 20. 4. 2027, 1. 11. 2026 → 1. 5. 2027)',
    prvniSmazani['2026-10-20'] === '2027-04-20' && prvniSmazani['2026-11-01'] === '2027-05-01' && prvni.length >= 4
    && prvni.every(k => den(R.retenceZalohMesicuZpet(Date.parse(prvniSmazani[k]), 6)) === k), prvni.map(k => [k, prvniSmazani[k]]));
});

/* ---------------- 4) provedení nad úložištěm: pojistky, části, souhrny ---------------- */
const kopie = (otisk, ted) => ({ kdy: new Date(ted - 3600000).toISOString(), soubor: 'otisk_' + otisk + '.json', velikostB: 1234,
  sha256: 'b'.repeat(64), otisk, puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB', potvrzeno: 'heslo-spravce' });
const vycisti = () => { for (const k of [...pamet.keys()]) if (k.startsWith('zalohy/')) pamet.delete(k); };
const otiskPoCastech = async (k, casti, zdroj) => {
  const s = ulz('zalohy');
  await s.zapis(k, { format: Z.OTISK_FORMAT, porizena: k + 'T02:00:00.000Z', zdroj: zdroj || 'nocni-otisk', kdo: '', casti,
    pocetZakazek: 100, pocetUctu: 5, komprese: 'gzip' });
  await s.zapis(Z.souhrnKlic(k), { porizena: k + 'T02:00:00.000Z', zdroj: zdroj || 'nocni-otisk', pocetZakazek: 100, pocetUctu: 5 });
  for (let i = 0; i < casti; i++) await s.zapisBin(Z.castKlic(k, i), Buffer.from('x'));
};
await zkus('provedení', async () => {
  vycisti();
  const ted = Date.parse('2026-10-27T03:00:00Z');
  for (const d of dnyOd('2026-09-04', '2026-10-27')) await otiskPoCastech(d, 3);
  await ulz('zalohy').zapis('2026-10-02T101010-pred-obnovou', { zdroj: 'pred-obnovou' });
  /* bez kopie na Disk: nic */
  const r0 = await Z.retenceProved('2026-10-27', '2026-10-27', ted);
  test('#523 pojistka N6: bez kopie na Disk se nesmaže nic', r0.smazano.length === 0 && /čeká na první kopii/.test(r0.ceka || ''), r0);
  /* pokles dat pod polovinu: nic */
  await ulz('zalohy').zapis(Z.KOPIE_DISK_KLIC, kopie('2026-10-26', ted));
  await ulz('zalohy').zapis(Z.souhrnKlic('2026-10-27'), { porizena: 'x', zdroj: 'nocni-otisk', pocetZakazek: 40, pocetUctu: 5 });
  const r1 = await Z.retenceProved('2026-10-27', '2026-10-27', ted);
  test('#523 pojistka K3-N13: pokles zakázek pod polovinu → nic se nesmaže', r1.smazano.length === 0 && !!r1.varovani, r1);
  pamet.delete('zalohy/' + Z.RETENCE_VAROVANI_KLIC);
  await ulz('zalohy').zapis(Z.souhrnKlic('2026-10-27'), { porizena: 'x', zdroj: 'nocni-otisk', pocetZakazek: 100, pocetUctu: 5 });
  smazano.length = 0;
  const r = await Z.retenceProved('2026-10-27', '2026-10-27', ted);
  const ocek = dnyOd('2026-09-05', '2026-09-30').concat(dnyOd('2026-10-02', '2026-10-19'));
  test('#523 provedení: smaže přesně staré otisky mimo první v měsíci (44 otisků)', J(r.smazano) === J(ocek) && !r.zbyva && !r.chyby.length,
    { smazano: r.smazano.length, ocek: ocek.length, r });
  const zbyle = [...pamet.keys()].filter(k => k.startsWith('zalohy/')).map(k => k.slice(7));
  test('#523 provedení: smazané otisky nemají souhrn ani části', ocek.every(k => !zbyle.includes(k) && !zbyle.includes(Z.souhrnKlic(k))
    && !zbyle.some(x => x.startsWith('casti/' + k + '/'))));
  test('#523 provedení: zůstal 4. 9., 1. 10., 20.–27. 10. i s částmi a souhrny, před obnovou a záznam kopie',
    ['2026-09-04', '2026-10-01', ...dnyOd('2026-10-20', '2026-10-27')].every(k => zbyle.includes(k) && zbyle.includes(Z.souhrnKlic(k))
      && zbyle.includes(Z.castKlic(k, 2))) && zbyle.includes('2026-10-02T101010-pred-obnovou') && zbyle.includes(Z.KOPIE_DISK_KLIC), zbyle.length);
  const poradi = smazano.filter(k => k.includes('2026-09-05'));
  test('#523 provedení: u otisku nejdřív manifest, pak souhrn, pak části',
    poradi[0] === 'zalohy/2026-09-05' && poradi[1] === 'zalohy/souhrn/2026-09-05' && poradi.slice(2).every(k => k.startsWith('zalohy/casti/2026-09-05/')), poradi);
  test('#523 provedení: nový otisk se nesmaže, ani kdyby ho pravidlo vybralo', !r.smazano.includes('2026-10-27'));
});

/* ---------------- 5) rozpočet mazání a navázání v noční funkci ---------------- */
await zkus('rozpočet', async () => {
  vycisti();
  const ted = Date.parse('2026-10-27T03:00:00Z');
  for (const d of dnyOd('2026-09-04', '2026-10-27')) await otiskPoCastech(d, 4);
  await ulz('zalohy').zapis(Z.KOPIE_DISK_KLIC, kopie('2026-10-26', ted));
  zpozdeniSmaz = 5;
  const r = await Z.retenceProved('2026-10-27', '2026-10-27', ted, { rozpocetMs: 100 });
  test('#523 rozpočet: retence skončí po rozpočtu a hlásí, kolik zbývá', r.smazano.length > 0 && r.smazano.length < 44
    && r.zbyva === 44 - r.smazano.length, { smazano: r.smazano.length, zbyva: r.zbyva });
  const r2 = await Z.retenceProved('2026-10-27', '2026-10-27', ted);
  test('#523 rozpočet: další běh dokončí zbytek', r2.smazano.length === r.zbyva && !r2.zbyva, { smazano: r2.smazano.length });
  zpozdeniSmaz = 0;
  /* Noční funkce: retence se nevešla → den neuzavře, další běh pokračuje. */
  vycisti();
  const realNow = Date.now;
  Date.now = () => ted;
  try {
    for (const d of dnyOd('2026-09-04', '2026-10-26')) await otiskPoCastech(d, 4);
    await ulz('zalohy').zapis(Z.KOPIE_DISK_KLIC, kopie('2026-10-26', ted));
    await ulz('zalohy').zapis('nocni-dokonceno', { den: '2026-10-26', kdy: 'x' });
    /* otisk dne je hotový (dřívější běh); běh přijde pozdě — rozpočet retence je minimální */
    await otiskPoCastech('2026-10-27', 1);
    let t = ted;
    Date.now = () => { t += 1000; return t; };   // každé volání hodin = 1 s — běh vyčerpá rozpočet retence
    const logy = [];
    const l = console.log; console.log = (...a) => logy.push(a.join(' '));
    let o1; try { o1 = await (await zalohaNocni()).json(); } finally { console.log = l; }
    const dok1 = await ulz('zalohy').cti('nocni-dokonceno');
    test('#523 noční funkce: nestihne-li retence všechno, den neuzavře a zaloguje zbytek',
      o1.ok && o1.retence && o1.retence.zbyva > 0 && dok1.den === '2026-10-26'
      && logy.some(x => /retence pokračuje v dalším běhu — zbývá \d+ otisků/.test(x)), { r: o1.retence && { s: o1.retence.smazano.length, z: o1.retence.zbyva }, logy });
    zpozdeniSmaz = 0;
    Date.now = () => ted;
    let o2;
    for (let i = 0; i < 10; i++) { o2 = await ticho(async () => (await zalohaNocni()).json()); if (!o2.retence || !o2.retence.zbyva) break; }
    const dok2 = await ulz('zalohy').cti('nocni-dokonceno');
    const zbyle = [...pamet.keys()].filter(k => /^zalohy\/\d{4}-\d{2}-\d{2}$/.test(k)).map(k => k.slice(7)).sort();
    test('#523 noční funkce: další běh téže noci retenci dokončí a teprve pak den uzavře',
      dok2.den === '2026-10-27' && J(zbyle) === J(['2026-09-04', '2026-10-01', ...dnyOd('2026-10-20', '2026-10-27')]), { zbyle, dok2 });
    const o3 = await ticho(async () => (await zalohaNocni()).json());
    test('#523 noční funkce: po uzavření dne už další běh nic nemaže', o3.ok && !o3.retence && o3.dokonceno, o3);
  } finally { Date.now = realNow; zpozdeniSmaz = 0; }
});

/* ---------------- 6) komprese částí otisku ---------------- */
await zkus('komprese', async () => {
  vycisti();
  const text = (n, z) => (z + ' Ocelová konstrukce výtahové šachty. ').repeat(Math.ceil(n / 30)).slice(0, n);
  for (let i = 0; i < 40; i++) await ulz('zakazky').zapis('z/Z' + i + '.json', { cislo: 'Z' + i, popis: text(60000, 'Z' + i),
    ...(i % 10 === 0 ? { prilohy: [{ data: require('node:crypto').randomBytes(150000).toString('base64') }] } : {}) });
  await ulz('program').zapis('firma', { udaje: { nazev: 'Zkušební firma s.r.o.' } });
  await ulz('uzivatele').zapis('a@priklad.cz', { email: 'a@priklad.cz', jmeno: 'A', role: 'Obchodník', heslo: 'aa:bb' });
  const v = await Z.porizOtisk('nocni-otisk', '', '2026-10-27');
  const m = await ulz('zalohy').cti('2026-10-27');
  test('#523 komprese: manifest nese komprese gzip a uloženou velikost menší než velikost dat',
    m.komprese === 'gzip' && m.ulozenoB > 0 && m.ulozenoB < m.velikostB * 0.7 && v.velikostB === m.velikostB, m);
  const surova = pamet.get('zalohy/' + Z.castKlic('2026-10-27', 0));
  test('#523 komprese: část je binární gzip (začíná 1f 8b) a rozbalí se na JSON části',
    Buffer.isBuffer(surova) && surova[0] === 0x1f && surova[1] === 0x8b && !!JSON.parse(gunzipSync(surova).toString('utf8')));
  const o = await Z.ctiOtisk(ulz('zalohy'), '2026-10-27');
  test('#523 komprese: ctiOtisk složí celý otisk (zakázky, přílohy, účty s hesly, firma)',
    Object.keys(o.zakazky).length === 40 && o.zakazky['Z0.json'].prilohy[0].data.length === 200000
    && o.uzivatele[0].heslo === 'aa:bb' && o.firma.udaje.nazev === 'Zkušební firma s.r.o.', Object.keys(o.zakazky || {}).length);
  const c0 = await Z.ctiOtiskCast(ulz('zalohy'), '2026-10-27', 0);
  test('#523 komprese: ctiOtiskCast vydá část pro obnovu a stažení', !!c0 && c0.porizena === m.porizena && typeof c0 === 'object');
  const sh = await ulz('zalohy').cti(Z.souhrnKlic('2026-10-27'));
  test('#523 komprese: souhrn nese uloženou velikost', sh.komprese === 'gzip' && sh.ulozenoB === m.ulozenoB);
  /* starý formát (Z1, bez komprese): úložiště bez binárních záznamů → JSON části, čtení beze změny */
  const puv = globalThis.__TEST_ULOZISTE;
  globalThis.__TEST_ULOZISTE = (n) => n === 'zalohy' ? bezBin(n) : puv(n);
  try { await Z.porizOtisk('nocni-otisk', '', '2026-10-26'); } finally { globalThis.__TEST_ULOZISTE = puv; }
  const m2 = await ulz('zalohy').cti('2026-10-26');
  test('#523 komprese: úložiště bez binárního zápisu → otisk bez komprese (části JSON)', !m2.komprese
    && typeof pamet.get('zalohy/' + Z.castKlic('2026-10-26', 0)) === 'string');
  const o2 = await Z.ctiOtisk(ulz('zalohy'), '2026-10-26');
  test('#523 komprese: starý nekomprimovaný otisk se čte dál (nový kód)', Object.keys(o2.zakazky).length === 40
    && J(o2.zakazky) === J(o.zakazky));
  /* neznámá komprese = výjimka, ne tichý nesmysl */
  await ulz('zalohy').zapis('2026-10-25', { ...m, komprese: 'brotli' });
  for (let i = 0; i < m.casti; i++) pamet.set('zalohy/' + Z.castKlic('2026-10-25', i), pamet.get('zalohy/' + Z.castKlic('2026-10-27', i)));
  let chyba = '';
  try { await Z.ctiOtisk(ulz('zalohy'), '2026-10-25'); } catch (e) { chyba = String(e.message); }
  test('#523 komprese: neznámý formát částí → výjimka s důvodem', /neznámém formátu/.test(chyba), chyba);
  /* chybějící gzip část = neúplný otisk */
  pamet.delete('zalohy/' + Z.castKlic('2026-10-27', m.casti - 1));
  chyba = '';
  try { await Z.ctiOtisk(ulz('zalohy'), '2026-10-27'); } catch (e) { chyba = String(e.message); }
  test('#523 komprese: chybí-li gzip část, čtení selže s číslem části', /neúplný: chybí část/.test(chyba), chyba);
});

/* ---------------- 7) záznam kopie na Disk .json.gz (server) ---------------- */
await zkus('kopie .json.gz', async () => {
  vycisti();
  const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
  const { default: zalohaVynuceno } = await import('./functions/zaloha_vynuceno.mjs');
  const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
  const r = await prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST', body: J({ email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' }) }));
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  test('#523 kopie: správce se přihlásí', r.status === 200, r.status);
  const posli = async (soubor) => (await zalohaVynuceno(new Request('http://x/api/zaloha_vynuceno', { method: 'POST', headers: { cookie },
    body: J({ akce: 'kopie-disk', hesloSpravce: 'Docasne.Heslo.123', kopie: { soubor, velikostB: 1234, sha256: 'c'.repeat(64),
      otisk: '2026-10-26', puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB' } }) }))).status;
  test('#523 kopie: server přijme záznam komprimované kopie otisk_<den>.json.gz', (await posli('otisk_2026-10-26.json.gz')) === 200
    && (await ulz('zalohy').cti(Z.KOPIE_DISK_KLIC)).soubor === 'otisk_2026-10-26.json.gz');
  test('#523 kopie: starý tvar .json platí dál, jiná jména ne', (await posli('otisk_2026-10-26.json')) === 200
    && (await posli('otisk_2026-10-26.gz')) === 400 && (await posli('otisk_2026-10-26.json.gz.exe')) === 400 && (await posli('otisk_2026-10-26.zip')) === 400);
  const klice = ['2026-10-26', '2026-10-25'];
  const z = { kdy: new Date().toISOString(), soubor: 'otisk_2026-10-26.json.gz', velikostB: 1234, sha256: 'c'.repeat(64), otisk: '2026-10-26',
    puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB', potvrzeno: 'heslo-spravce' };
  test('#523 kopie: záznam .json.gz podloží retenci (kopieDiskPodlozena)', Z.kopieDiskPodlozena(z, klice)
    && Z.kopieDiskPodlozena({ ...z, soubor: 'otisk_2026-10-26.json' }, klice));
  test('#523 kopie: .json.gz k jinému dni retenci nepodloží', !Z.kopieDiskPodlozena({ ...z, soubor: 'otisk_2026-10-25.json.gz' }, klice)
    && !Z.kopieDiskPodlozena({ ...z, soubor: 'otisk_2026-10-26.gz' }, klice));
});

/* ---------------- 8) pojistka: zálohy se mají zvětšovat (doplnění Z2, pokyn J. V. 26. 10. ~13:35) ---------------- */
/* „Zálohy se musí v čase zvětšovat; nenadálé zmenšení musí být oznámené
 * a schválené, jinak se staré zálohy nesmí mazat." Pojistka: před doplněním
 * pokles velikosti o 15 % ani úbytek šablony retenci nezastavil a varování
 * se po 30 dnech samo uvolnilo. */
await zkus('pojistka', async () => {
  const P = Z.retencePoklesPocty;
  const MB = 1048576;
  test('#523 pojistka: prahy na jednom místě — velikost 90 %, zakázky a účty 95 %', J(R.RETENCE_ZALOH_POJISTKA) === J({ velikost: 0.9, pocty: 0.95, oknoDnu: 30 }));   // O-K9 #527: + kumulativní okno 30 dní
  test('#523 pojistka: velikost −15 % je úbytek s textem', J(P({ velikostB: 100 * MB }, { velikostB: 85 * MB })) === J(['velikost 100,0 MB → 85,0 MB (85 %)']));
  test('#523 pojistka: velikost −5 % a přesně −10 % úbytek není', P({ velikostB: 100 * MB }, { velikostB: 95 * MB }) === null
    && P({ velikostB: 100 * MB }, { velikostB: 90 * MB }) === null);
  test('#523 pojistka: zakázek −6 % ano, −5 % ne; účtů 20 → 18 ano', J(P({ pocetZakazek: 100 }, { pocetZakazek: 94 })) === J(['zakázek 100 → 94'])
    && P({ pocetZakazek: 100 }, { pocetZakazek: 95 }) === null && J(P({ pocetUctu: 20 }, { pocetUctu: 18 })) === J(['účtů 20 → 18']));
  test('#523 pojistka: jakýkoli úbytek šablon nebo podpisů', J(P({ pocetSablon: 4, pocetPodpisu: 6 }, { pocetSablon: 3, pocetPodpisu: 5 }))
    === J(['šablon 4 → 3', 'podpisů 6 → 5']) && P({ pocetSablon: 4 }, { pocetSablon: 4 }) === null);
  test('#523 pojistka: chybějící údaj (starší otisk) se neporovnává; nárůst není úbytek',
    P({ pocetZakazek: 100, velikostB: 10 * MB }, { pocetZakazek: 100 }) === null && P({ pocetSablon: 3 }, {}) === null
    && P({ velikostB: 10 * MB, pocetZakazek: 10 }, { velikostB: 20 * MB, pocetZakazek: 20 }) === null);

  /* otisk nese počty šablon a podpisů */
  vycisti();
  for (const n of ['sablony', 'podpisy', 'zakazky']) for (const k of [...pamet.keys()]) if (k.startsWith(n + '/')) pamet.delete(k);
  for (let i = 0; i < 3; i++) await ulz('sablony').zapis('data/cn/' + i, { soubor: 'x' + i });
  for (let i = 0; i < 2; i++) await ulz('podpisy').zapis('p' + i + '@priklad.cz', { obrazek: 'y' });
  await Z.porizOtisk('nocni-otisk', '', '2026-11-01');
  const m = await ulz('zalohy').cti('2026-11-01'), sh = await ulz('zalohy').cti(Z.souhrnKlic('2026-11-01'));
  test('#523 pojistka: manifest i souhrn nesou počty šablon a podpisů', m.pocetSablon === 3 && m.pocetPodpisu === 2
    && sh.pocetSablon === 3 && sh.pocetPodpisu === 2, { m, sh });

  /* provedení: pokles velikosti o 15 % → stojí; po potvrzení maže; pokles o 5 % → maže */
  const ted = Date.parse('2026-12-20T03:00:00Z');
  const pripravit = async (velPred, velNova, navic) => {
    vycisti();
    for (const k of ['2026-11-03', '2026-11-04']) { await ulz('zalohy').zapis(k, { zdroj: 'nocni-otisk' });
      await ulz('zalohy').zapis(Z.souhrnKlic(k), { porizena: 'x', zdroj: 'nocni-otisk', pocetZakazek: 100, pocetUctu: 5, velikostB: velPred }); }
    await ulz('zalohy').zapis('2026-11-01', { zdroj: 'nocni-otisk' });
    await ulz('zalohy').zapis('2026-11-08', { zdroj: 'nocni-otisk' });      // neděle drží týden — 3. a 4. 11. jdou pryč
    await ulz('zalohy').zapis('2026-12-19', { zdroj: 'nocni-otisk' });
    await ulz('zalohy').zapis(Z.souhrnKlic('2026-12-19'), { porizena: 'x', zdroj: 'nocni-otisk', pocetZakazek: 100, pocetUctu: 5, velikostB: velPred,
      pocetSablon: 4, pocetPodpisu: 6 });
    await ulz('zalohy').zapis('2026-12-20', { zdroj: 'nocni-otisk' });
    await ulz('zalohy').zapis(Z.souhrnKlic('2026-12-20'), { porizena: 'x', zdroj: 'nocni-otisk', pocetZakazek: 100, pocetUctu: 5, velikostB: velNova,
      pocetSablon: 4, pocetPodpisu: 6, ...(navic || {}) });
    await ulz('zalohy').zapis(Z.KOPIE_DISK_KLIC, kopie('2026-12-19', ted));
  };
  await pripravit(100 * MB, 85 * MB);
  const r1 = await Z.retenceProved('2026-12-20', '2026-12-20', ted);
  const v1 = await ulz('zalohy').cti(Z.RETENCE_VAROVANI_KLIC);
  test('#523 pojistka: velikost −15 % → retence stojí, nic se nesmaže', r1.smazano.length === 0 && !!r1.varovani && pamet.has('zalohy/2026-11-04'), r1);
  test('#523 pojistka: varování nese co ubylo, z kolika na kolik, a dny', !!v1 && v1.den === '2026-12-20' && v1.predchozi === '2026-12-19'
    && /velikost 100,0 MB → 85,0 MB \(85 %\)/.test(v1.text) && v1.pred.velikostB === 100 * MB && v1.nove.velikostB === 85 * MB, v1);
  const r1b = await Z.retenceProved('2026-12-20', '2026-12-20', ted + 3600000);
  test('#523 pojistka: další běh téže noci dál stojí (varování nepotvrzené)', r1b.smazano.length === 0, r1b);
  await ulz('zalohy').zapis(Z.RETENCE_VAROVANI_KLIC, { ...v1, potvrzeno: { kdy: new Date(ted).toISOString(), kdo: 'spravce@priklad.cz' } });
  const r2 = await Z.retenceProved('2026-12-20', '2026-12-20', ted + 7200000);
  test('#523 pojistka: po potvrzení téhož dne retence maže (potvrzení se nepřepíše novým varováním)',
    J(r2.smazano) === J(['2026-11-03', '2026-11-04']) && !!(await ulz('zalohy').cti(Z.RETENCE_VAROVANI_KLIC)).potvrzeno, r2);
  await pripravit(100 * MB, 95 * MB);
  const r3 = await Z.retenceProved('2026-12-20', '2026-12-20', ted);
  test('#523 pojistka: velikost −5 % → retence maže', J(r3.smazano) === J(['2026-11-03', '2026-11-04']) && !r3.varovani, r3);
  await pripravit(100 * MB, 120 * MB, { pocetSablon: 3 });
  const r4 = await Z.retenceProved('2026-12-20', '2026-12-20', ted);
  test('#523 pojistka: ubyla šablona (velikost roste) → stojí', r4.smazano.length === 0 && /šablon 4 → 3/.test(r4.ceka || ''), r4);
  await pripravit(100 * MB, 120 * MB, { pocetPodpisu: 5 });
  test('#523 pojistka: ubyl podpis → stojí', (await Z.retenceProved('2026-12-20', '2026-12-20', ted)).smazano.length === 0);
  await pripravit(100 * MB, 120 * MB, { pocetZakazek: 94 });
  test('#523 pojistka: zakázek 100 → 94 → stojí', (await Z.retenceProved('2026-12-20', '2026-12-20', ted)).smazano.length === 0);
  /* noční funkce: řádek VAROVÁNÍ v logu */
  await pripravit(100 * MB, 85 * MB);
  const realNow = Date.now; Date.now = () => ted;
  const varovani = [];
  const w = console.warn, l = console.log; console.warn = (...a) => varovani.push(a.join(' ')); console.log = () => {};
  let noc; try { noc = await (await zalohaNocni()).json(); } finally { console.warn = w; console.log = l; Date.now = realNow; }
  test('#523 pojistka: noční funkce zaloguje VAROVÁNÍ s poklesem velikosti a nic nesmaže', noc.ok && noc.retence.smazano.length === 0
    && varovani.some(x => /VAROVÁNÍ — retence přeskočena — noční otisk 2026-12-20 má proti 2026-12-19 méně dat \(velikost 100,0 MB → 85,0 MB/.test(x)), varovani);
  /* bez potvrzení nikdy: ani po roce */
  const r5 = await Z.retenceProved('2026-12-20', '2026-12-20', ted + 400 * DEN);
  test('#523 pojistka: bez potvrzení se nemaže ani po 400 dnech (žádné automatické uvolnění)', r5.smazano.length === 0 && !!(r5.drzeno || r5.varovani), r5);
});

/* ---------------- 9) úbytek na Disku hlášený prohlížečem ---------------- */
await zkus('úbytek Disk', async () => {
  vycisti();
  const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
  const { default: zalohaVynuceno } = await import('./functions/zaloha_vynuceno.mjs');
  const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
  const r = await prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST', body: J({ email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' }) }));
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  const posli = async (telo, ck) => { const o = await zalohaVynuceno(new Request('http://x/api/zaloha_vynuceno', { method: 'POST',
    headers: ck === null ? {} : { cookie }, body: J(telo) })); return { status: o.status, telo: await o.json() }; };
  const disk = (pred, nova, den) => ({ akce: 'retence-varovani-disk', disk: { den: den || '2026-12-20', predSoubor: 'otisk_2026-12-13.json.gz',
    novySoubor: 'otisk_' + (den || '2026-12-20') + '.json.gz', predVelikostB: pred, novaVelikostB: nova } });
  test('#523 Disk: bez přihlášení správce odmítnuto', (await posli(disk(100, 80), null)).status === 401 && !pamet.has('zalohy/' + Z.RETENCE_VAROVANI_KLIC));
  test('#523 Disk: neplatná jména souborů → 400', (await posli({ ...disk(100, 80), disk: { ...disk(100, 80).disk, predSoubor: 'posledni_kopie.json' } })).status === 400);
  test('#523 Disk: bez úbytku (−5 %) → 409 a nic se nezapíše', (await posli(disk(100, 95))).status === 409 && !pamet.has('zalohy/' + Z.RETENCE_VAROVANI_KLIC));
  const o = await posli(disk(100 * 1048576, 80 * 1048576));
  const v = await ulz('zalohy').cti(Z.RETENCE_VAROVANI_KLIC);
  test('#523 Disk: úbytek −20 % → varování od serveru (text píše server)', o.status === 200 && v.zdroj === 'disk' && v.den === '2026-12-20'
    && /kopie zálohy na Disku otisk_2026-12-20\.json\.gz má proti otisk_2026-12-13\.json\.gz méně dat \(velikost 100,0 MB → 80,0 MB \(80 %\)\)/.test(v.text), v);
  const o2 = await posli(disk(100 * 1048576, 50 * 1048576, '2026-12-27'));
  test('#523 Disk: nepotvrzené varování se dalším hlášením nepřepíše', o2.status === 200 && (await ulz('zalohy').cti(Z.RETENCE_VAROVANI_KLIC)).den === '2026-12-20');
  /* retence v Netlify stojí kvůli varování z Disku */
  const ted = Date.parse('2026-12-21T03:00:00Z');
  for (const k of ['2026-11-03', '2026-11-04', '2026-11-08', '2026-11-01', '2026-12-21'])
    { await ulz('zalohy').zapis(k, { zdroj: 'nocni-otisk' }); await ulz('zalohy').zapis(Z.souhrnKlic(k), { porizena: 'x', zdroj: 'nocni-otisk', pocetZakazek: 1 }); }
  await ulz('zalohy').zapis(Z.KOPIE_DISK_KLIC, kopie('2026-12-21', ted));
  const rr = await Z.retenceProved('2026-12-21', '2026-12-21', ted);
  test('#523 Disk: varování z Disku zastaví i retenci v Netlify', rr.smazano.length === 0 && !!rr.drzeno, rr);
  const potvrd = await posli({ akce: 'retence-potvrdit', den: '2026-12-20', hesloSpravce: 'Docasne.Heslo.123' });
  /* O-K9 #527 (K9-S2): druhé hlášení (12-27) se nezahodilo — po potvrzení prvního je na řadě ono a retence stojí dál */
  const poPrvnim = await Z.retenceProved('2026-12-21', '2026-12-21', ted);
  test('O-K9 K9-S2: po potvrzení prvního varování z Disku čeká druhé — retence dál stojí', potvrd.status === 200
    && potvrd.telo.retenceVarovani.den === '2026-12-27' && !potvrd.telo.retenceVarovani.potvrzeno
    && poPrvnim.smazano.length === 0 && !!poPrvnim.drzeno, { potvrd: potvrd.telo, poPrvnim });
  const potvrd2 = await posli({ akce: 'retence-potvrdit', den: '2026-12-27', hesloSpravce: 'Docasne.Heslo.123' });
  test('#523 Disk: správce potvrdí heslem → retence v Netlify zase maže', potvrd2.status === 200
    && J((await Z.retenceProved('2026-12-21', '2026-12-21', ted)).smazano) === J(['2026-11-03', '2026-11-04']), potvrd2.telo);
  const kd = await posli({ akce: 'kopie-disk', hesloSpravce: 'Docasne.Heslo.123', kopie: { soubor: 'otisk_2026-12-21.json.gz', velikostB: 5,
    sha256: 'd'.repeat(64), otisk: '2026-12-21', puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB' } });
  test('#523 Disk: odpověď na záznam kopie nese čerstvý stav pojistky (pro úklid Disku)', kd.status === 200
    && !!kd.telo.retenceVarovani && !!kd.telo.retenceVarovani.potvrzeno, kd.telo);
});

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
