/* Společná příprava PoC čočky AD (audit 20. 11. 2026): paměťové úložiště,
 * správce + dva obchodníci. Jen lokálně, bez sítě. */
process.env.TAJEMSTVI_RELACE = 'testovaci-poc-ad-tajemstvi-jen-lokalne';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
export const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const { default: prihlaseni } = await import('../../netlify/functions/prihlaseni.mjs');
const { default: uzivatele } = await import('../../netlify/functions/uzivatele.mjs');
export const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
export const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
export async function prihlas(email, heslo) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email, heslo });
  const t = await r.clone().json();
  if (!t.ok) throw new Error('přihlášení: ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
export const HESLO_ADMIN = 'Docasne.Heslo.123';
export const cAdmin = await prihlas('spravce@priklad.cz', HESLO_ADMIN);
async function ucet(email, role) {
  const r = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email, jmeno: email, role, heslo: 'PocHeslo.12345', hesloSpravce: HESLO_ADMIN }, cAdmin)).json();
  if (!r.ok) throw new Error('účet: ' + JSON.stringify(r));
  return prihlas(email, 'PocHeslo.12345');
}
export const cObchA = await ucet('obchodnik.a@priklad.cz', 'Obchodník');
export const cObchB = await ucet('obchodnik.b@priklad.cz', 'Obchodník');
