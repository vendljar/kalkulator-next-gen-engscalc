/* SEC-M klient, bod 2 — klíče Netlify Blobs: obnova zakázek ze SOUBORU zálohy
 * zapíše klíč `z/<k>` s `k` jen omezeným délkou (obnova.mjs: `!k || k.length >
 * KLIC_MAX`). Lomítko, „..“ ani řídicí znaky se neodmítají — ale čtení
 * a mazání z adresy (SEC-I4, klicZAdresyPlatny) takový klíč odmítne. Pokus
 * zjistí, co se zapíše a jestli jde záznam otevřít a smazat.
 * Úložiště v paměti (vzor S1 harness), žádná síť, smyšlené účty.
 * Spuštění z kořene repa: node podklady/SECM_pokusy/klient/blob_klic_obnova.mjs */
process.env.TAJEMSTVI_RELACE = 'pokusne-tajemstvi-jen-lokalne-secm';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
globalThis.fetch = async (u) => { throw new Error('SÍŤ ZAKÁZÁNA: ' + u); };
const F = {};
for (const n of ['prihlaseni', 'zakazky', 'obnova']) F[n] = (await import('../../../netlify/functions/' + n + '.mjs')).default;
const req = (fn, metoda, url, telo, cookie) => fn(new Request('http://x' + url, { method: metoda,
  headers: cookie ? { cookie } : {}, ...(telo !== undefined ? { body: JSON.stringify(telo) } : {}) }));
const pr = await req(F.prihlaseni, 'POST', '/api/prihlaseni', { email: 'spravce@priklad.cz', heslo: 'Docasne.Heslo.123' });
const cookie = (pr.headers.get('set-cookie') || '').split(';')[0];
if (!(await pr.json()).ok) { console.log('VÝSLEDEK: přihlášení správce selhalo'); process.exit(2); }

await req(F.zakazky, 'GET', '/api/zakazky', undefined, cookie);   // načte jádro (globály DEFAULT_CENIK…)
const { createRequire } = await import('node:module');
const zk = createRequire(import.meta.url)('../../../src/zakazka.js');
const zak = () => { const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 0777'; z.nazevAkce = 'Pokus SEC-M'; return z; };
const KLICE = ['a/b.json', '../x.json', 'c\u0001d.json', '..', ' '];
const soubor = { porizena: '2026-10-27T10:00:00.000Z', zdroj: 'localhost', zakazky: Object.fromEntries(KLICE.map(k => [k, zak()])) };
const r = await req(F.obnova, 'POST', '/api/obnova', { zdroj: { soubor }, rezim: 'doplnit', casti: ['zakazky'], potvrzeni: 'OBNOVIT' }, cookie);
const t = await r.json();
console.log('obnova:', r.status, t.ok, JSON.stringify(t.bilance || t.chyba || '').slice(0, 300));
const zapsane = [...pamet.keys()].filter(k => k.startsWith('zakazky/z/')).map(k => k.slice('zakazky/z/'.length));
console.log('zapsané klíče z/…:', JSON.stringify(zapsane));
let neotevritelne = 0;
for (const k of zapsane) {
  const g = await req(F.zakazky, 'GET', '/api/zakazky?soubor=' + encodeURIComponent(k), undefined, cookie);
  const d = await req(F.zakazky, 'DELETE', '/api/zakazky?soubor=' + encodeURIComponent(k), undefined, cookie);
  const zustal = pamet.has('zakazky/z/' + k);
  if (g.status !== 200 && zustal) neotevritelne++;
  console.log(`  ${JSON.stringify(k).padEnd(16)} GET ${g.status}  DELETE ${d.status}  v úložišti zůstal: ${zustal}`);
}
const rej = JSON.parse(pamet.get('zakazky/_rejstrik') || 'null');
console.log('v rejstříku:', JSON.stringify(((rej && rej.zakazky) || []).map(z => z.soubor)));
console.log(neotevritelne
  ? `VÝSLEDEK: obnova ze souboru zapsala ${neotevritelne} záznam(y) s klíčem, který server z adresy neotevře ani nesmaže (lomítko/řídicí znak)`
  : 'VÝSLEDEK: obnova nezapsala žádný klíč, který by nešel otevřít a smazat');
