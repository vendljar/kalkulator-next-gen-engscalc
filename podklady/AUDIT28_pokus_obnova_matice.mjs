/* POKUS AUDITU KOLA 28 (18. 10. 2026) — B168 a obnova ze zálohy (nález B188).
 * Viz podklady/AUDIT_2026-10-18_v18.10.11.md.
 *
 * B168 (v18.10.6): zápis matice zobrazení přes POST /api/zobrazeni chce heslo
 * správce, protože matice řídí i serverová práva (CRM, nákladový ceník, ceník
 * v zakázce) a ukradená cookie správce by je jinak jedním POST otevřela.
 * Pokus ověřuje, zda se matice nedá zapsat jinou cestou — obnovou ze
 * souboru zálohy (POST /api/obnova, část „zobrazeni").
 *
 * Očekávání podle stavu v18.10.11 (nález, ne regrese): P1 a P2 drží
 * (zobrazeni.mjs 401 bez hesla), P3 projde 200 a matici zapíše — to je B188.
 * Po opravě B188 se P3 změní na 401 a test „B188 trvá" je třeba otočit.
 *
 * Jen paměťové úložiště a smyšlené údaje. Spuštění: node podklady/AUDIT28_pokus_obnova_matice.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const R = new URL('..', import.meta.url).pathname;
const { default: prihlaseni } = await import(R + 'netlify/functions/prihlaseni.mjs');
const { default: zobrazeni } = await import(R + 'netlify/functions/zobrazeni.mjs');
const { default: obnova } = await import(R + 'netlify/functions/obnova.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const ulozeno = () => pamet.has('program/zobrazeni') ? JSON.parse(pamet.get('program/zobrazeni')) : null;
/* Matice, kterou by útočník s cookie chtěl: obchodníkovi zakázat nic, jen
 * „otevřít" — tady stačí změna libovolné buňky, kterou server čte. */
const M = { 'crm.pipedrive': { 'Obchodník': false, 'Vedoucí': false }, 'naklady.ceniky': { 'Obchodník': true, 'Vedoucí': true } };

/* P1: přímý zápis bez hesla — B168 drží. */
let r = await post(zobrazeni, 'http://x/api/zobrazeni', { matice: M }, cA);
test('P1 B168: /api/zobrazeni bez hesla → 401', r.status === 401, r.status);
test('P1 B168: matice nezapsána', ulozeno() === null, ulozeno());

/* P2: náhled obnovy nic nezapisuje. */
const soubor = { porizena: '2026-10-18T08:00:00.000Z', zdroj: 'x', zobrazeni: { matice: M, kdo: 'utocnik', kdy: '2026-10-18' } };
r = await post(obnova, 'http://x/api/obnova', { rezim: 'prepsat', casti: ['zobrazeni'], nahled: true, zdroj: { soubor } }, cA);
test('P2: náhled obnovy části zobrazeni → 200 bez zápisu', r.status === 200 && ulozeno() === null, r.status);

/* P3: obnova ze souboru, jen část „zobrazeni", bez hesla správce. */
r = await post(obnova, 'http://x/api/obnova', { rezim: 'prepsat', casti: ['zobrazeni'], potvrzeni: 'OBNOVIT', zdroj: { soubor } }, cA);
const t3 = await r.json();
const z = ulozeno();
console.log('     P3 stav ' + r.status + (t3.kod ? ' kod ' + t3.kod : ''));
test('P3 B188 trvá: obnova ze souboru zapsala matici BEZ hesla správce (200)',
  r.status === 200 && !!(z && z.matice && z.matice['crm.pipedrive'] && z.matice['crm.pipedrive']['Obchodník'] === false), { status: r.status, z });

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
