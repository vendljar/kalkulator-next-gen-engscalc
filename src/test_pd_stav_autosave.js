/* ===== STAV DEALU PIPEDRIVE PO ULOŽENÍ (K7-K6, #508, J. V. 23. 10. 2026) =====
 *
 * Po úspěšném uložení se stav dealu dotazoval znovu, dokud byl neznámý
 * (`ZAK.pdDealId && !ZAK.pdStav`) — u dealu bez známého stavu tedy při každém
 * autosave dotaz /api/pd/stav. Nově jen při otevření zakázky a při změně
 * dealu. Pojistka: před opravou 3 dotazy na 3 autosave (FAIL), po ní 1.
 */
const fs = require('fs');
const vm = require('vm');
let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const vyrez = (zdroj, jm) => {
  const i = zdroj.indexOf('function ' + jm + '(');
  if (i < 0) return '';
  const j = zdroj.indexOf('\n}\n', i);
  return zdroj.slice(i, j + 2);
};
const online = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
const chybaOd = online.indexOf('function onlineChybaText(');
const chybaDo = online.indexOf('/* Otisk odeslané zakázky', chybaOd);
const kod = (chybaOd > 0 && chybaDo > chybaOd ? online.slice(chybaOd, chybaDo) : '')
  + vyrez(online, 'onlineOdeslanoSRazitkem') + vyrez(online, 'onlineUloz') + vyrez(online, 'pdStavObnovUI');
test('funkce jsou ve zdrojích', /function onlineUloz\(/.test(kod) && /function pdStavObnovUI\(/.test(kod));

const tik = () => new Promise(r => setImmediate(r));
async function dobehni() { for (let i = 0; i < 30; i++) await tik(); }

const dotazy = [];
const ctx = {
  ZAK: { cislo: '2026 - OPR - CN - 0508', nazevAkce: 'Zkušební', pdDealId: '77', varianty: [{ id: 'v1', data: {} }] },
  ONLINE_STAV: { ja: { email: 'obchodnik@priklad.cz' }, ukladaBeh: null, posledni: '', razitko: 'r0', kolize: null, soubor: 'zk.json' },
  NAST: {},
  JSON, Promise, setTimeout, clearTimeout, Date,
  onlineMozne: () => true, uloMaCislo: () => true, onlineSlevyOtisk: () => ({}), onlineSlevyZeServeru: () => 0,
  onlinePoslednizapamatuj: () => {}, onlineZprava: () => {}, hlaska: () => Promise.resolve(),
  onlineNactiRejstrik: () => Promise.resolve(true), onlineKolizeText: () => '', render: () => {},
  pdStavNorm: (x) => (x && x.status ? x : null),
  ctrlPdDealIdNorm: (x) => String(x == null ? '' : x).trim(),
  onlineApi: (url, telo) => {
    if (String(url).startsWith('/api/pd/stav')) { dotazy.push(url); return Promise.resolve({ ok: true, nastaveno: true, pdStav: null }); }
    return Promise.resolve({ soubor: 'zk.json', razitko: 'r' + Date.now() });
  },
};
vm.createContext(ctx);
vm.runInContext(kod, ctx);

(async () => {
  for (let i = 0; i < 3; i++) {
    ctx.ZAK.nazevAkce = 'Zkušební ' + i;
    await ctx.onlineUloz({ tiche: true });
    await dobehni();
  }
  test('K7-K6: deal bez známého stavu — 3 autosave = 1 dotaz na stav (ne 3)', dotazy.length === 1, dotazy);
  ctx.ZAK.pdDealId = '78';
  await ctx.onlineUloz({ tiche: true });
  await dobehni();
  test('K7-K6: po změně dealu se stav dotáže znovu', dotazy.length === 2, dotazy);
  await ctx.onlineUloz({ tiche: true });
  await dobehni();
  test('K7-K6: další autosave se stejným dealem už ne', dotazy.length === 2, dotazy);
  /* K8-K7 (#516): deal s mezerou se pamatuje normalizovaně — pdStavObnovZak
   * porovnává normalizované id a dotaz při otevření by se jinak opakoval. */
  ctx.ZAK.pdDealId = ' 79 ';
  await ctx.onlineUloz({ tiche: true });
  await dobehni();
  test('K8-K7: deal s mezerou se pamatuje normalizovaně', ctx.ONLINE_STAV.pdStavDeal === '79', ctx.ONLINE_STAV.pdStavDeal);
  await ctx.onlineUloz({ tiche: true });
  await dobehni();
  test('K8-K7: … a další autosave se znovu neptá', dotazy.length === 3, dotazy);
  console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})();
