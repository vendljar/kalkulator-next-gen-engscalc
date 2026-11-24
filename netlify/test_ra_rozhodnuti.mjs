/* ============================================================
 * DÁVKA RA (23. 11. 2026) — rozhodnutí J. V. 23. 11. 2026
 * (podklady/ROZHODNUTI_LOG.md, roadmapa #723, #724, #726).
 *
 *   #724 (BZ-I1)  k odeslané nebo prodané nabídce (zamčená varianta) nejde
 *                 doplnit ani změnit číslo PROJ (`projHlavicka.cislo`) —
 *                 server 403 pro každou roli (jako B231), klient zmrazí cestu
 *                 ZAK.projHlavicka.cislo (zamekZakCestaZmrazena).
 *
 * #723 („V pořádku“ jen administrátor) hlídá netlify/test_k40c_webhook.mjs,
 * #726 (upozornění u Textů nabídky PROJ) src/test_ra_terminy_proj.js.
 *
 * Skutečné funkce netlify/functions nad PAMĚŤOVÝM úložištěm, bez sítě.
 * Smyšlené kontakty …@priklad.cz. Spouští se `node netlify/test_ra_rozhodnuti.mjs`.
 * Pojistka: před opravou (bez RA v src/zamek.js) selže 13 testů #724 (8 OK, 13 FAIL).
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';

const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

import './pomoc_test_admin.mjs';
import { dnesPraha } from './pomoc_den.mjs'; // MT2: den prodeje v pražském čase jako server
import prihlaseni from './functions/prihlaseni.mjs';
import program from './functions/program.mjs';
import zakazky from './functions/zakazky.mjs';
import uzivatele from './functions/uzivatele.mjs';
import { ADMIN_EMAIL } from './lib/sdilene.mjs';
import { jadro } from './lib/jadro.mjs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { JEKLY } = await jadro();
const zk = require('../src/zakazka.js');
const zam = require('../src/zamek.js');
const ZC = require('../src/zkusebni_cenik.js');
const G = globalThis;

let ok = 0, fail = 0; const selhalo = [];
function test(nazev, podminka, detail) {
  if (podminka) { ok++; console.log('  ✓ ' + nazev); }
  else { fail++; selhalo.push(nazev); console.log('  ✗ ' + nazev + (detail ? ' — ' + detail : '')); }
}
const kopie = x => JSON.parse(JSON.stringify(x));
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST',
  headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const uloz = async (zak, c, razitko) => {
  const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: razitko }, c);
  let t; try { t = await r.json(); } catch (e) { t = {}; }
  return { status: r.status, ...t };
};
const nacti = async (soubor, c) => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), c)).json()).zakazka;

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
{
  const rp = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
    slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.03, 'Vedoucí': 0.12, 'Administrátor': 1 } }, poznamka: 'RA' }, cA)).json();
  if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
  for (const [e, j, r] of [['ra.obch@priklad.cz', 'Obch RA', 'Obchodník'], ['ra.ved@priklad.cz', 'Ved RA', 'Vedoucí']]) {
    const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: e, jmeno: j, role: r, heslo: 'Heslo12345x' }, cA)).json();
    if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
  }
}
const cO = await prihlas('ra.obch@priklad.cz', 'Heslo12345x');
const cV = await prihlas('ra.ved@priklad.cz', 'Heslo12345x');

let n = 7240;
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++) + ' - TEST'; z.nazevAkce = 'TEST ' + nazev;
  z.objednatel = 'TEST – TESTOVACÍ ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.cenik = ZC.zkusebniCenik(); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
const zamkni = (z, v, typ) => {
  const vysledek = zam.zamekVysledekSpocti(v, JEKLY, 'RA');
  zam.zamkniVariantu(v, { typ: typ || 'nabidka', kdy: new Date().toISOString(), kdo: 'Obch RA',
    cislo: zam.variantaCislo(z, v), vysledek, snimek: zam.zamekSnimekSpocti(v) });
};
const dnes = dnesPraha();
const cisloProj = (g) => ((g && g.projHlavicka) || {}).cislo;
const CISLO_PROJ = '2026 - OVP - CN - 7249 - TEST';

/* ============================================================ */
console.log('\n===== #724 (BZ-I1): ČÍSLO PROJ PO ODESLÁNÍ A PRODEJI OCK =====\n');
{
  /* Odeslaná (zamčená) nabídka OCK. */
  const z = nova('RA 724 odeslaná'); zamkni(z, z.varianty[0], 'nabidka');
  const r = await uloz(z, cO); test('příprava: odeslaná OCK uložena (200)', r.status === 200, r.status + ' ' + (r.chyba || ''));
  let g = await nacti(r.soubor, cO);
  const predCislo = JSON.stringify(cisloProj(g));
  let a = kopie(g); a.projHlavicka = Object.assign({}, a.projHlavicka || {}, { cislo: CISLO_PROJ });
  let x = await uloz(a, cO, g.uloRazitko);
  test('#724: obchodník NEdoplní číslo PROJ k odeslané OCK (403, hláška o čísle PROJ)', x.status === 403 && /číslo nabídky PROJ/.test(x.chyba || ''),
    x.status + ' ' + (x.chyba || ''));
  x = await uloz(a, cV, g.uloRazitko);
  test('#724: ani vedoucí (403)', x.status === 403, String(x.status));
  x = await uloz(a, cA, g.uloRazitko);
  test('#724: ani administrátor bez odemčení (403)', x.status === 403, String(x.status));
  g = await nacti(r.soubor, cO);
  test('#724: … číslo PROJ v uložené zakázce beze změny (prázdné / předloha)', JSON.stringify(cisloProj(g)) === predCislo
    && G.zamekCisloProjZnak(g) === '', JSON.stringify(cisloProj(g)));
  /* Cizí typ (číslo místo textu) neprojde jako „beze změny“. */
  a = kopie(g); a.projHlavicka = Object.assign({}, a.projHlavicka || {}, { cislo: 7249 });
  x = await uloz(a, cO, g.uloRazitko);
  test('#724: číslo PROJ jako číslo (ne text) taky 403', x.status === 403, String(x.status));
  /* Běžné uložení beze změny čísla PROJ dál jde (žádná falešná 403); mezery navíc nejsou změna. */
  a = kopie(g); a.poznamkaRa = 1;
  x = await uloz(a, cO, g.uloRazitko);
  test('#724: běžné uložení odeslané OCK beze změny čísla PROJ projde (200)', x.status === 200, x.status + ' ' + (x.chyba || ''));
  g = await nacti(r.soubor, cO);
  a = kopie(g); a.projHlavicka = Object.assign({}, a.projHlavicka || {}, { cislo: '   ' });
  x = await uloz(a, cO, g.uloRazitko);
  test('#724: samé mezery místo prázdna nejsou změna (200)', x.status === 200, x.status + ' ' + (x.chyba || ''));

  /* Prodaná nabídka OCK. */
  g = await nacti(r.soubor, cO);
  a = kopie(g); a.varianty[0].prodano = { datum: dnes };
  x = await uloz(a, cO, g.uloRazitko);
  test('příprava: Prodáno poctivé nabídky projde', x.status === 200, x.status + ' ' + (x.chyba || ''));
  g = await nacti(r.soubor, cO);
  a = kopie(g); a.projHlavicka = Object.assign({}, a.projHlavicka || {}, { cislo: CISLO_PROJ });
  x = await uloz(a, cO, g.uloRazitko);
  test('#724: obchodník NEdoplní číslo PROJ k prodané OCK (403)', x.status === 403, String(x.status));
  x = await uloz(a, cA, g.uloRazitko);
  test('#724: ani administrátor u prodané bez odemčení (403)', x.status === 403, String(x.status));

  /* Klientský model: set('ZAK.projHlavicka.cislo') hlásí důvod. */
  const zz = G.importZakazka(kopie(g));
  test('#724: klientský model zmrazí ZAK.projHlavicka.cislo u zamčené zakázky',
    /číslo nabídky PROJ/.test(G.zamekZakCestaZmrazena(zz, 'ZAK.projHlavicka.cislo')));
  test('#724: … a ZAK.cislo tímhle pravidlem nezmrazí (B56 má vlastní cestu)', !/číslo nabídky PROJ/.test(G.zamekZakCestaZmrazena(zz, 'ZAK.cislo') || ''));
}
{
  /* Zakázka s již vyplněným číslem PROJ: po zámku se číslo nezmění ani nesmaže. */
  const z = nova('RA 724 s číslem'); z.projHlavicka = { cislo: '2026 - OVP - CN - 7250 - TEST' };
  zamkni(z, z.varianty[0], 'nabidka');
  const r = await uloz(z, cO); const g = await nacti(r.soubor, cO);
  test('příprava: odeslaná OCK s číslem PROJ uložena (200)', r.status === 200 && cisloProj(g) === '2026 - OVP - CN - 7250 - TEST',
    r.status + ' ' + (r.chyba || ''));
  let a = kopie(g); a.projHlavicka.cislo = '2026 - OVP - CN - 7251 - TEST';
  let x = await uloz(a, cO, g.uloRazitko);
  test('#724: změna čísla PROJ u odeslané OCK → 403', x.status === 403, String(x.status));
  a = kopie(g); a.projHlavicka.cislo = '';
  x = await uloz(a, cO, g.uloRazitko);
  test('#724: smazání čísla PROJ u odeslané OCK → 403', x.status === 403, String(x.status));
  a = kopie(g); delete a.projHlavicka;
  x = await uloz(a, cO, g.uloRazitko);
  test('#724: vypuštění celé hlavičky PROJ → 403', x.status === 403, String(x.status));
}
{
  /* Bez zámku se číslo PROJ doplnit smí (model i server). */
  const z = nova('RA 724 bez zámku');
  const r = await uloz(z, cO); const g = await nacti(r.soubor, cO);
  const a = kopie(g); a.projHlavicka = Object.assign({}, a.projHlavicka || {}, { cislo: '2026 - OVP - CN - 7252 - TEST' });
  const x = await uloz(a, cO, g.uloRazitko);
  test('#724: bez zámku obchodník číslo PROJ doplní (200)', x.status === 200, x.status + ' ' + (x.chyba || ''));
  test('#724: bez zámku model cestu nezmrazí', G.zamekZakCestaZmrazena(zk.novaZakazka(), 'ZAK.projHlavicka.cislo') === '');
  /* Model: odemčená varianta v témže uložení se nepočítá (jako B231). */
  const st = { projHlavicka: { cislo: '' }, varianty: [{ id: 'v', zamek: { zamceno: true } }] };
  const odem = { projHlavicka: { cislo: 'X' }, varianty: [{ id: 'v' }] };
  test('#724: model — varianta odemčená správcem v témže uložení číslo PROJ nezmrazí', zam.zamekStranaZmena(st, odem) === '');
  test('#724: model — zamčená varianta číslo PROJ zmrazí', /číslo nabídky PROJ/.test(zam.zamekStranaZmena(st,
    { projHlavicka: { cislo: 'X' }, varianty: [{ id: 'v', zamek: { zamceno: true } }] })));
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) { console.log('Selhalo:\n  ' + selhalo.join('\n  ')); process.exit(1); }
