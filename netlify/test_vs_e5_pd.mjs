/* ============================================================
 * VS #570 / E5 (#595) — PIPEDRIVE NÁHLED U VÍC ŠACHET (R6), 10. 11. 2026
 *
 * 1. /api/pd/nanecisto přebere ze strany OCK seznam šachet (`sachty`,
 *    jen text, délka omezená) — nic jiného navíc.
 * 2. pdNanecisto: řádek „Poznámka dealu — šachty v nabídce" jen u víc
 *    šachet; hodnota dealu = cena celé nabídky beze změny.
 * 3. Zamýšlený zápis dealu (patch) je s poznámkou i bez ní STEJNÝ —
 *    poznámku píše uložení zakázky (VSD, test_vsd_pd_poznamka.mjs).
 * 4. Jedna šachta = náhled beze změny (žádný řádek navíc).
 * Pojistka: na 079cfc6 sada padá (sachty se zahodí, řádek chybí).
 * Spuštění: node netlify/test_vs_e5_pd.mjs
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
if (!process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR', 'PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PROSTREDI',
  'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL']) delete process.env[k];
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
globalThis.fetch = async (url) => { throw new Error('síť je v testu zakázaná: ' + url); };

const { pdNanecistoStrana } = await import('./functions/pd_nanecisto.mjs');
const { POLE_DEALU } = await import('./lib/pd_mapa.mjs');
const { pdNanecisto, pdZamyslenyZapis } = await import('./lib/pd_prevod.mjs');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 300)); } };
const J = x => JSON.stringify(x);
const POLE = { mapa: {}, popisy: {} };
const TEXT = 'Šachty v nabídce: 2 varianty šachet, celkem 3 ks (Výtah A 1 ks, Výtah B 2 ks)';

/* 1) tvar vstupu */
{
  const s = pdNanecistoStrana({ hodnoty: { cisloCN: 'X' }, cena: 1234000, mena: 'CZK', sachty: TEXT, cizi: 'x' });
  test('1 strana OCK přebere sachty (text)', s.sachty === TEXT && !('cizi' in s), s);
  test('1 sachty jiného typu nebo prázdné se zahodí', !('sachty' in pdNanecistoStrana({ sachty: 5 }))
    && !('sachty' in pdNanecistoStrana({ sachty: { a: 1 } })) && !('sachty' in pdNanecistoStrana({ sachty: '  ' })));
  test('1 délka omezená (20 000 znaků)', pdNanecistoStrana({ sachty: 'x'.repeat(30000) }).sachty.length === 20000);
}

/* 2) řádek poznámky */
const vs = { ock: { hodnoty: {}, cena: 3267000, mena: 'CZK', sachty: TEXT } };
const jedna = { ock: { hodnoty: {}, cena: 3267000, mena: 'CZK' } };
{
  const n = pdNanecisto(POLE_DEALU, vs, POLE);
  const r = n.radky.find(x => x.klic === 'poznamkaSachty');
  test('2 víc šachet: řádek poznámky se seznamem šachet', r && r.hodnotaText === TEXT && r.strana === 'ock' && /poznámka u dealu/.test(r.duvod) && /uložení zakázky/.test(r.duvod), r);
  const h = n.radky.find(x => x.klic === 'hodnotaDealu');
  test('2 hodnota dealu = cena celé nabídky (beze změny)', h && h.hodnota && h.hodnota.value === 3267000, h);
  const n1 = pdNanecisto(POLE_DEALU, jedna, POLE);
  test('2 jedna šachta: bez řádku poznámky, jinak shodné', !n1.radky.some(x => x.klic === 'poznamkaSachty')
    && J(n1.radky) === J(n.radky.filter(x => x.klic !== 'poznamkaSachty')));
  test('2 souhrn počítá řádek poznámky', n.souhrn.celkem === n1.souhrn.celkem + 1 && n.souhrn.zapise === n1.souhrn.zapise + 1);
}

/* 3) do Pipedrive nic navíc */
{
  const a = pdZamyslenyZapis(POLE_DEALU, vs, POLE, {}, {});
  const b = pdZamyslenyZapis(POLE_DEALU, jedna, POLE, {}, {});
  test('3 zamýšlený zápis (patch) je s poznámkou i bez ní stejný', J(a.patch) === J(b.patch) && !/Výtah/.test(J(a.patch)), [a.patch, b.patch]);
  const f = pdZamyslenyZapis(POLE_DEALU, vs, POLE, {}, { faze: 'prodano' });
  test('3 Prodáno: patch bez poznámky šachet', !/Výtah/.test(J(f.patch)), f.patch);
}

console.log(ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
