/* ============================================================
 * DÁVKA CN (#727, J. V. 23. 11. 2026) — číslo nabídky, bod 5 na serveru.
 *
 *   – číslo PRODANÉ nabídky nemění nikdo, ani administrátor (403,
 *     zamekCisloProdaneZmena v src/zamek.js, volá netlify/lib/zakazka_kontrola.mjs);
 *     cesta ven je odemknout prodej (vedoucí / administrátor s důvodem);
 *   – číslo ODESLANÉ (neprodané) nabídky dál mění jen administrátor (B56 beze změny);
 *   – bez zámku se číslo mění volně (bod 1 je jen dotaz v prohlížeči).
 *
 * Skutečné funkce netlify/functions nad PAMĚŤOVÝM úložištěm, bez sítě.
 * Smyšlené kontakty …@priklad.cz. Spouští se `node netlify/test_cn_cislo_nabidky.mjs`.
 * Pojistka: před opravou (bez zamekCisloProdaneZmena) selžou testy „prodaná“
 * (administrátor změnu čísla prodané nabídky uložil, 200 místo 403).
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
    slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.03, 'Vedoucí': 0.12, 'Administrátor': 1 } }, poznamka: 'CN' }, cA)).json();
  if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
  for (const [e, j, r] of [['cn.obch@priklad.cz', 'Obch CN', 'Obchodník'], ['cn.ved@priklad.cz', 'Ved CN', 'Vedoucí']]) {
    const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: e, jmeno: j, role: r, heslo: 'Heslo12345x' }, cA)).json();
    if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
  }
}
const cO = await prihlas('cn.obch@priklad.cz', 'Heslo12345x');
const cV = await prihlas('cn.ved@priklad.cz', 'Heslo12345x');

let n = 7270;
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++) + ' - TEST'; z.nazevAkce = 'TEST ' + nazev;
  z.objednatel = 'TEST – TESTOVACÍ ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.cenik = ZC.zkusebniCenik(); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
const zamkni = (z, v, typ) => {
  const vysledek = zam.zamekVysledekSpocti(v, JEKLY, 'CN');
  zam.zamkniVariantu(v, { typ: typ || 'nabidka', kdy: new Date().toISOString(), kdo: 'Obch CN',
    cislo: zam.variantaCislo(z, v), vysledek, snimek: zam.zamekSnimekSpocti(v) });
};
const dnes = new Date().toISOString().slice(0, 10);

const CN = (k) => '2026 - OPR - CN - ' + k + ' - TEST';

console.log('\n===== CN #727 bod 5: ČÍSLO ODESLANÉ A PRODANÉ NABÍDKY =====\n');
{
  const z = nova('CN odeslaná'); zamkni(z, z.varianty[0], 'nabidka');
  const r = await uloz(z, cO); test('příprava: odeslaná nabídka uložena (200)', r.status === 200, r.status + ' ' + (r.chyba || ''));
  let g = await nacti(r.soubor, cO);
  let a = kopie(g); a.cislo = CN(7280);
  let x = await uloz(a, cO, g.uloRazitko);
  test('B56 beze změny: obchodník číslo odeslané nabídky nezmění (403)', x.status === 403 && /jen administrátor/.test(x.chyba || ''), x.status + ' ' + (x.chyba || ''));
  x = await uloz(a, cV, g.uloRazitko);
  test('B56 beze změny: ani vedoucí (403)', x.status === 403, String(x.status));
  x = await uloz(a, cA, g.uloRazitko);
  test('B56 beze změny: administrátor číslo odeslané (neprodané) nabídky změní (200)', x.status === 200, x.status + ' ' + (x.chyba || ''));
  const soubor = x.soubor || r.soubor;
  g = await nacti(soubor, cA);
  test('… a číslo je nové', g && g.cislo === CN(7280), g && g.cislo);

  /* Prodej. */
  a = kopie(g); a.varianty[0].prodano = { datum: dnes };
  x = await uloz(a, cO, g.uloRazitko);
  test('příprava: Prodáno odeslané nabídky projde (200)', x.status === 200, x.status + ' ' + (x.chyba || ''));
  g = await nacti(soubor, cO);
  a = kopie(g); a.cislo = CN(7281);
  x = await uloz(a, cO, g.uloRazitko);
  test('prodaná: obchodník číslo nezmění (403, hláška o prodané zakázce)', x.status === 403 && /prodaná/.test(x.chyba || ''), x.status + ' ' + (x.chyba || ''));
  x = await uloz(a, cV, g.uloRazitko);
  test('prodaná: ani vedoucí (403)', x.status === 403 && /prodaná/.test(x.chyba || ''), x.status + ' ' + (x.chyba || ''));
  x = await uloz(a, cA, g.uloRazitko);
  test('prodaná: ani administrátor (403) — výjimka B56 pro prodanou neplatí', x.status === 403 && /prodaná/.test(x.chyba || ''), x.status + ' ' + (x.chyba || ''));
  a = kopie(g); a.varianty[0].pripona = 7;
  x = await uloz(a, cA, g.uloRazitko);
  test('prodaná: ani přípona varianty (číslo varianty) se nezmění (403)', x.status === 403, x.status + ' ' + (x.chyba || ''));
  g = await nacti(soubor, cO);
  test('prodaná: číslo v databázi beze změny', g.cislo === CN(7280), g.cislo);
  a = kopie(g); a.poznamkaCn = 1;
  x = await uloz(a, cO, g.uloRazitko);
  test('prodaná: běžné uložení beze změny čísla projde (200)', x.status === 200, x.status + ' ' + (x.chyba || ''));
  g = await nacti(soubor, cO);
  a = kopie(g); a.cislo = '  ' + g.cislo + '  ';
  test('model: mezery navíc kolem čísla nejsou změna čísla varianty',
    G.zamekCisloProdaneZmena(g, a) === '' || G.variantaCislo(g, g.varianty[0]) !== G.variantaCislo(a, a.varianty[0]));

  /* Odemčení prodeje (vedoucí s důvodem) v témže uložení: pak platí B56 → vedoucí 403, administrátor 200. */
  a = kopie(g); delete a.varianty[0].prodano; a.prodejOdemknout = { varianta: a.varianty[0].id, duvod: 'oprava čísla nabídky CN' };
  a.cislo = CN(7282);
  x = await uloz(a, cV, g.uloRazitko);
  test('odemčení prodeje vedoucím + změna čísla → B56 (403, jen administrátor)', x.status === 403 && /jen administrátor/.test(x.chyba || ''), x.status + ' ' + (x.chyba || ''));
  /* Aplikace odemyká prodej samostatným uložením; číslo se opravuje až potom (B56). */
  a = kopie(g); delete a.varianty[0].prodano; a.prodejOdemknout = { varianta: a.varianty[0].id, duvod: 'oprava čísla nabídky CN' };
  x = await uloz(a, cV, g.uloRazitko);
  test('odemčení prodeje vedoucím (200)', x.status === 200, x.status + ' ' + (x.chyba || ''));
  g = await nacti(soubor, cA);
  a = kopie(g); a.cislo = CN(7282);
  x = await uloz(a, cA, g.uloRazitko);
  /* Nález CN-N1 (mimo rozsah CN): změna čísla odeslané varianty, která už
   * nese snímek lhůt z prodeje, končí 409 „snímek podmínek nové odeslané
   * nabídky nesedí" (nové číslo = nový záznam bez uložené verze). Tady se
   * hlídá jen to, že po odemčení prodeje už nebrání pravidlo prodané nabídky. */
  test('po odemčení prodeje už pravidlo prodané nabídky nebrání (žádná 403 „prodaná“)',
    !(x.status === 403 && /prodaná/.test(x.chyba || '')), x.status + ' ' + (x.chyba || ''));
}
{
  const z = nova('CN bez zámku');
  const r = await uloz(z, cO); const g = await nacti(r.soubor, cO);
  const a = kopie(g); a.cislo = CN(7290);
  const x = await uloz(a, cO, g.uloRazitko);
  test('bez zámku obchodník číslo změní (200)', x.status === 200, x.status + ' ' + (x.chyba || ''));
}
{
  /* Klientský model: zamekZakCestaZmrazena. */
  const z = zk.novaZakazka(); z.cislo = CN(7295);
  test('model: bez prodeje ZAK.cislo nezmrazí', zam.zamekZakCestaZmrazena(z, 'ZAK.cislo') === '');
  zamkni(z, z.varianty[0], 'nabidka');
  test('model: odeslaná (neprodaná) ZAK.cislo nezmrazí (řeší A3 v set())', zam.zamekZakCestaZmrazena(z, 'ZAK.cislo') === '');
  z.varianty[0].prodano = { datum: dnes };
  test('model: prodaná ZAK.cislo zmrazí s hláškou o odemčení prodeje',
    /prodaná/.test(zam.zamekZakCestaZmrazena(z, 'ZAK.cislo')) && /odemknout prodej/.test(zam.zamekZakCestaZmrazena(z, 'ZAK.cislo')));
  test('model: prodaná nezmrazí jiná pole mimo pravidla (datum)', zam.zamekZakCestaZmrazena(z, 'ZAK.datum') === '');
  /* Starší zámek bez cisloPapir hlídá v zámku jen ZÁKLAD čísla — přípona prodané varianty se proto
   * porovnává s uloženou verzí (druhá větev zamekCisloProdaneZmena). */
  const st = { cislo: CN(7296), varianty: [{ id: 'v1', pripona: 0, prodano: { datum: dnes }, zamek: { zamceno: true, cislo: CN(7296) } },
    { id: 'v2', pripona: 2 }] };
  const nv = kopie(st); nv.varianty[0].pripona = 3;
  test('model: starší zámek (bez cisloPapir) — změna přípony prodané varianty proti uložené verzi se odmítne',
    /prodaná/.test(zam.zamekCisloProdaneZmena(st, nv)), zam.variantaCislo(st, st.varianty[0]) + ' / ' + zam.variantaCislo(nv, nv.varianty[0]));
  test('model: starší zámek — beze změny přípony nic', zam.zamekCisloProdaneZmena(st, kopie(st)) === '');
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) { console.log('Selhalo:\n  ' + selhalo.join('\n  ')); process.exit(1); }
