/* AUTOR EXISTUJÍCÍ ZAKÁZKY SE NEBERE OD KLIENTA (B73, hloubkový test
 * 24. 9. 2026).
 *
 * U nové zakázky server autora bral z relace už od auditu B13. U EXISTUJÍCÍ
 * ale ponechal `autor` a `autorJmeno` z těla požadavku — kdo uložil cizí
 * zakázku s jiným autorem, přestěhoval ji v seznamu jinému obchodníkovi
 * (i se jménem). Sada hlídá, že autor i jméno zůstávají z uložené verze.
 *
 * Paměťové úložiště, zkušební ceník. Spuštění: node netlify/test_autor.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: program } = await import('./functions/program.mjs');
const { default: zakazky } = await import('./functions/zakazky.mjs');
const { default: uzivatele } = await import('./functions/uzivatele.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
Object.assign(globalThis, require('../src/format.js'), require('../src/engine.js'), require('../src/engine_proj.js'),
  require('../src/techspec.js'), require('../src/sleva.js'), require('../src/zaokrouhleni.js'), require('../src/zamek.js'));
const zk = require('../src/zakazka.js');
const ZC = require('../src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const kopie = x => JSON.parse(JSON.stringify(x));
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h }))
  .headers.get('set-cookie') || '').split(';')[0];
const nacti = async (soubor, c) => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), c)).json()).zakazka;
const uloz = async (zak, razitko, c) => (await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: razitko }, c)).json();
const vRejstriku = async (soubor, c) => {
  const s = await (await get(zakazky, 'http://x/api/zakazky', c)).json();
  return ((s.rejstrik && s.rejstrik.zakazky) || []).find(z => z && z.soubor === soubor) || {};
};

const cA = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 0.3, stropy: {} }, poznamka: 'x' }, cA);
for (const [e, j, r] of [['obch@priklad.cz', 'Obch Test', 'Obchodník'], ['ved@priklad.cz', 'Ved Test', 'Vedoucí']])
  await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: e, jmeno: j, role: r, heslo: 'Heslo12345x' }, cA);
const cO = await login('obch@priklad.cz', 'Heslo12345x'), cV = await login('ved@priklad.cz', 'Heslo12345x');

const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 0904'; z.nazevAkce = 'Autor';
Object.assign(z.varianty[0].data.cenik, ZC.zkusebniCenik());
const r0 = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: z }, cO)).json();
test('obchodník založil zakázku', r0.ok === true, r0);
let g = await nacti(r0.soubor, cO);
test('(autor a jméno z relace)', g.autor === 'obch@priklad.cz' && g.autorJmeno === 'Obch Test', { a: g.autor, j: g.autorJmeno });

/* Vedoucí uloží cizí zakázku a pošle sebe jako autora. */
const a = kopie(g); a.autor = 'ved@priklad.cz'; a.autorJmeno = 'Ved Test'; a.nazevAkce = 'Autor – upraveno';
const r1 = await uloz(a, g.uloRazitko, cV);
g = await nacti(r0.soubor, cV);
test('vedoucí cizí zakázku uložil', r1.ok === true, r1);
test('B73: autor zůstal obchodník (ne vedoucí z těla požadavku)', g.autor === 'obch@priklad.cz', g.autor);
test('B73: jméno autora zůstalo z uložené verze', g.autorJmeno === 'Obch Test', g.autorJmeno);
test('upravil = kdo ukládal', g.upravil === 'ved@priklad.cz', g.upravil);
const zr = await vRejstriku(r0.soubor, cV);
test('B73: rejstřík ukazuje původního obchodníka', zr.autor === 'obch@priklad.cz' && zr.autorJmeno === 'Obch Test', zr);

/* Obchodník si zakázku „daruje" někomu jinému nebo podvrhne jméno. */
const b = kopie(g); b.autor = 'nekdo@priklad.cz'; b.autorJmeno = 'Podvrh';
const r2 = await uloz(b, g.uloRazitko, cO);
g = await nacti(r0.soubor, cO);
test('B73: vlastní zakázku nejde přepsat na jiného autora', r2.ok === true && g.autor === 'obch@priklad.cz', { r2, a: g.autor });
test('B73: jméno se bere z relace, ne od klienta', g.autorJmeno === 'Obch Test', g.autorJmeno);

/* Ani administrátor neudělá z existující zakázky cizí tím, že pošle autora. */
const c = kopie(g); c.autor = 'ved@priklad.cz'; c.autorJmeno = 'Ved Test';
const r3 = await uloz(c, g.uloRazitko, cA);
g = await nacti(r0.soubor, cA);
test('B73: ani administrátor autora uložením nezmění', r3.ok === true && g.autor === 'obch@priklad.cz'
  && g.autorJmeno === 'Obch Test', { r3, a: g.autor, j: g.autorJmeno });

/* Nová zakázka od obchodníka s podvrženým jménem. */
const n = zk.novaZakazka(); n.cislo = '2026 - OPR - CN - 0905'; n.nazevAkce = 'Nová';
Object.assign(n.varianty[0].data.cenik, ZC.zkusebniCenik());
n.autor = 'ved@priklad.cz'; n.autorJmeno = 'Ved Test';
const r4 = await (await post(zakazky, 'http://x/api/zakazky', { zakazka: n }, cO)).json();
const gn = await nacti(r4.soubor, cO);
test('nová zakázka: autor i jméno z relace (B13)', gn.autor === 'obch@priklad.cz' && gn.autorJmeno === 'Obch Test',
  { a: gn.autor, j: gn.autorJmeno });

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
