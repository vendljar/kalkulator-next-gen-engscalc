/* #665 — SNÍMEK ZPRACOVATELE V ZÁMKU NA SERVERU (rozhodnutí J. V. 18. 11. 2026).
 * Celou cestou POST /api/zakazky (paměťové úložiště):
 *  1) nový zámek: server zapíše `zamek.zpracovatel` z PROFILU ÚČTU v relaci
 *     (jméno, titul, funkce, telefon, e-mail; bez podpisu) — podvržený snímek
 *     z prohlížeče se zahodí, chybějící se doplní;
 *  2) další uložení: uložený snímek se drží (podvrh i smazání se vrátí),
 *     i když zakázku ukládá kolega; další tisk ho nezmění;
 *  3) zámek uložený bez snímku (starší) snímek dodatečně nedostane.
 * Pojistka: před opravou server snímek nezapisuje ani nedrží → 1) a 2) FAIL.
 * Spuštění: node netlify/test_665_vypracoval.mjs */
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
globalThis.fetch = async (url) => { throw new Error('síť je v testu zakázaná: ' + url); };
const R = new URL('..', import.meta.url).pathname;
const { default: prihlaseni } = await import(R + 'netlify/functions/prihlaseni.mjs');
const { default: program } = await import(R + 'netlify/functions/program.mjs');
const { default: zakazky } = await import(R + 'netlify/functions/zakazky.mjs');
const { default: uzivatele } = await import(R + 'netlify/functions/uzivatele.mjs');
const { default: funkce } = await import(R + 'netlify/functions/funkce.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
await import(R + 'netlify/lib/jadro.mjs').then(m => m.jadro());
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const G = globalThis;
if (typeof G.vzT1Nastav !== 'function' || typeof G.vzServerInvariant !== 'function') { console.log('FAIL jádro nenese T1 (vzT1Nastav, vzServerInvariant)'); process.exit(1); }

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 400)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const kopie = x => JSON.parse(JSON.stringify(x));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const ulozenoObj = (soubor) => { const s = pamet.get('zakazky/z/' + soubor); return s ? JSON.parse(s) : null; };
async function uloz(zak, c) {
  const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: zak.uloRazitko || undefined }, c);
  const t = { status: r.status, ...(await r.json()) };
  if (t.razitko) zak.uloRazitko = t.razitko;
  return t;
}
const JEKLY = require(R + 'src/jekly.json');
const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
{ const r = await post(program, 'http://x/api/program', { cenik: Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()), cenikProj: ZC.zkusebniCenikProj(), poznamka: '665' }, cA);
  if (r.status !== 200) throw new Error('program ' + r.status); }
for (const u of [{ email: 'puvodni.665@priklad.cz', jmeno: 'Petr Původní', titul: 'Ing.', funkce: 'Obchodní technik', telefon: '212 300 111' },
                 { email: 'kolega.665@priklad.cz', jmeno: 'Karel Kolega', titul: '', funkce: 'Vedoucí', telefon: '212 300 222' }]) {
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', Object.assign({ akce: 'zaloz', role: 'Obchodník', heslo: 'Heslo12345x' }, u), cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
}
const cP = await prihlas('puvodni.665@priklad.cz', 'Heslo12345x');
const cK = await prihlas('kolega.665@priklad.cz', 'Heslo12345x');

let n = 9665;
function nova() {
  const z = zk.novaZakazka(); z.cislo = 'TEST - 2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST 665'; z.objednatel = 'TEST – ALFA ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.ock.fixes = true;
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
const zamkni = (z, v, zpracovatel) => G.zamkniVariantu(v, { typ: 'nabidkaTisk', kdy: new Date().toISOString(), kdo: 'x', cislo: G.variantaCislo(z, v),
  vysledek: G.zamekVysledekSpocti(v, JEKLY, 't665'), snimek: G.zamekSnimekSpocti(v), zpracovatel });
const zp = u => (((u || {}).varianty || [])[0] || {}).zamek && u.varianty[0].zamek.zpracovatel;

/* 1) nový zámek */
let soubor = '', razitko = '';
{ const z = nova();
  zamkni(z, z.varianty[0], { email: 'podvrh@priklad.cz', jmeno: 'Podvržený Jan', titul: '', funkce: '', telefon: '' });
  const t = await uloz(z, cP);
  soubor = t.soubor; razitko = t.razitko;
  const s = zp(ulozenoObj(soubor));
  test('1) nový zámek: 200', t.status === 200, t);
  test('1) snímek z účtu v relaci (podvrh zahozen)', !!s && s.email === 'puvodni.665@priklad.cz' && s.jmeno === 'Petr Původní' && s.titul === 'Ing.'
    && s.funkce === 'Obchodní technik' && s.telefon === '212 300 111' && !('podpis' in s), s);
  const z2 = nova(); zamkni(z2, z2.varianty[0], null);
  const t2 = await uloz(z2, cK);
  const s2 = zp(ulozenoObj(t2.soubor));
  test('1) zámek bez snímku z prohlížeče: server doplní z relace', t2.status === 200 && !!s2 && s2.email === 'kolega.665@priklad.cz' && s2.jmeno === 'Karel Kolega', { t2, s2 });
}
/* 2) další uložení — kolega */
{ const g = G.importZakazka(ulozenoObj(soubor)); g.uloRazitko = razitko;
  g.varianty[0].zamek.zpracovatel = { email: 'kolega.665@priklad.cz', jmeno: 'Karel Kolega' };
  zamkni(g, g.varianty[0], { email: 'kolega.665@priklad.cz', jmeno: 'Karel Kolega' });   // dotisk kolegou
  const t = await uloz(g, cK);
  const s = zp(ulozenoObj(soubor));
  test('2) dotisk kolegou + podvržený snímek → 200, snímek původního', t.status === 200 && !!s && s.email === 'puvodni.665@priklad.cz' && s.jmeno === 'Petr Původní', { t, s });
  const g2 = G.importZakazka(ulozenoObj(soubor)); g2.uloRazitko = t.razitko || razitko;
  delete g2.varianty[0].zamek.zpracovatel;
  const t2 = await uloz(g2, cK);
  const s2 = zp(ulozenoObj(soubor));
  test('2) smazaný snímek se vrátí', t2.status === 200 && !!s2 && s2.email === 'puvodni.665@priklad.cz', { t2, s2 });
}
/* 3) zámek uložený bez snímku (starší data) — vložen přímo do úložiště */
{ const z = nova(); const t = await uloz(z, cP);
  const u = ulozenoObj(t.soubor);
  const v = u.varianty[0];
  const zz = G.importZakazka(JSON.parse(JSON.stringify(u)));
  zamkni(zz, zz.varianty[0], null);
  u.varianty[0] = JSON.parse(JSON.stringify(zz.varianty[0]));
  delete u.varianty[0].zamek.zpracovatel;
  pamet.set('zakazky/z/' + t.soubor, JSON.stringify(u));
  const g = G.importZakazka(JSON.parse(JSON.stringify(u))); g.uloRazitko = t.razitko;
  g.varianty[0].zamek.zpracovatel = { email: 'podvrh@priklad.cz', jmeno: 'Podvrh' };
  const t2 = await uloz(g, cP);
  const s = zp(ulozenoObj(t.soubor));
  test('3) starší zámek bez snímku: 200, snímek nedostane (ani podvržený)', t2.status === 200 && !s, { status: t2.status, chyba: t2.chyba, s, v: !!v });
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
