/* IK (J. V. 4. 11. 2026) — INTERNÍ POZNÁMKY K ZAKÁZCE NA KRYCÍM LISTU —
 * serverová pojistka.
 *
 * Pole „Interní poznámky k zakázce“ (ZAK.poznamkyText) je totéž v Kalkulaci
 * i na krycím listu OCK a PROJ. Doplňovat se smí VŽDY — po odeslání CN, po
 * SoD i po Prodáno; zámek odeslané nabídky (#555/#555b, porovnání dat
 * zamčené varianty) ani zámek hlavičky (Z1) uložení odmítnout nesmí. Píše
 * každý, kdo smí upravovat zakázku (autor, vedoucí, administrátor); kdo ji
 * jen čte (cizí obchodník), změnit ji nesmí (403).
 *
 * Pojistka proti prázdnému testu: nad 6109e39 „cizí obchodník → 403“ selže
 * (server poznámky nehlídal, vrací 200); uložení po CN/SoD/Prodáno projde
 * před i po (hlídá, že pojistka zámků pole nezablokuje).
 *
 * Paměťové úložiště, zkušební ceník, smyšlené údaje.
 * Spuštění: node netlify/test_ik_poznamky.mjs */
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
const { default: program } = await import(R + 'netlify/functions/program.mjs');
const { default: zakazky } = await import(R + 'netlify/functions/zakazky.mjs');
const { default: uzivatele } = await import(R + 'netlify/functions/uzivatele.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
const { JEKLY } = await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const zam = require(R + 'src/zamek.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const OBJ = require(R + 'src/objednane.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const kopie = x => JSON.parse(JSON.stringify(x));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const uloz = async (zak, c, razitko) => { const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: razitko }, c); return { status: r.status, ...(await r.json()) }; };
const nacti = async (soubor, c) => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), c)).json()).zakazka;

const NASTSL = { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15, 'Administrátor': 1 } };
const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const rp = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(), slevy: NASTSL, poznamka: 'ik' }, cA)).json();
if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
for (const [email, role] of [['obch.ik@priklad.cz', 'Obchodník'], ['cizi.ik@priklad.cz', 'Obchodník'], ['ved.ik@priklad.cz', 'Vedoucí']]) {
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email, jmeno: 'Test ' + role, role, heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
}
const cO = await prihlas('obch.ik@priklad.cz', 'Heslo12345x');
const cC = await prihlas('cizi.ik@priklad.cz', 'Heslo12345x');
const cV = await prihlas('ved.ik@priklad.cz', 'Heslo12345x');

const platny = () => JSON.parse(pamet.get('program/db')).platny;
const ROZMERY = { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 };
let n = 9961;   // vlastní rozsah 9961–9990
const DNES = OBJ.objDnes();
function nova(nazev, proj) {
  const z = zk.novaZakazka(); z.cislo = '2026 - ' + (proj ? 'OVP' : 'OPR') + ' - CN - ' + (n++); z.nazevAkce = 'TEST IK ' + nazev;
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, ROZMERY);
  v.data.cenik = kopie(platny().cenik); v.data.proj.cenik = kopie(platny().cenikProj);
  z.poznamkyText = 'Úvodní interní poznámka.';
  return z;
}
const zamkni = (z, typ) => { const v = z.varianty[0];
  zam.zamkniVariantu(v, { typ: typ || 'nabidkaTisk', kdy: new Date().toISOString(), kdo: 'Test IK',
    cislo: zam.variantaCislo(z, v), vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-ik') });
  return z; };
/* Uloží zakázku autorem, načte ji jako prohlížeč, změní poznámky a uloží `cookie`. */
async function dopis(z, text, cookie, upravy) {
  const r = await uloz(z, cO);
  if (r.status !== 200) return { status: 'příprava ' + r.status, chyba: r.chyba };
  let g = await nacti(r.soubor, cO);
  if (upravy) {   // mezikrok autora (např. Prodáno) uložený zvlášť, jak to dělá prohlížeč
    const m = zk.importZakazka(kopie(g)); upravy(m);
    const r1 = await uloz(m, cO, g.uloRazitko);
    if (r1.status !== 200) return { status: 'mezikrok ' + r1.status, chyba: r1.chyba };
    g = await nacti(r.soubor, cO);
  }
  const a = zk.importZakazka(kopie(g));
  a.poznamkyText = text;
  const r2 = await uloz(a, cookie, g.uloRazitko);
  const po = r2.status === 200 ? await nacti(r.soubor, cO) : null;
  return Object.assign({}, r2, { ulozeno: po && po.poznamkyText });
}

console.log('===== doplňování po CN, SoD a Prodáno =====');
{
  const r = await dopis(zamkni(nova('CN OCK')), 'Po CN: zákazník volal, chce o týden dřív.', cO);
  test('po odeslání CN OCK se poznámky uloží (200)', r.status === 200 && r.ulozeno === 'Po CN: zákazník volal, chce o týden dřív.', r);
}
{
  const r = await dopis(zamkni(nova('CN PROJ', true), 'nabidkaProjTisk'), 'Po CN PROJ doplněno.', cO);
  test('po odeslání CN PROJ se poznámky uloží (200)', r.status === 200 && r.ulozeno === 'Po CN PROJ doplněno.', r);
}
{
  const z = zamkni(zamkni(nova('SoD'), 'nabidka'), 'sod');
  const r = await dopis(z, 'Po SoD: na stavbě jen dopoledne.', cO);
  test('po SoD (krycí list zmrazený celý) se poznámky uloží (200)', r.status === 200 && r.ulozeno === 'Po SoD: na stavbě jen dopoledne.', r);
}
{
  const z = zamkni(zamkni(nova('SoD PROJ', true), 'nabidkaProjTisk'), 'sodProj');
  const r = await dopis(z, 'Po SoD PROJ doplněno.', cO);
  test('po SoD PROJ se poznámky uloží (200)', r.status === 200 && r.ulozeno === 'Po SoD PROJ doplněno.', r);
}
{
  const r = await dopis(zamkni(nova('Prodáno')), 'Po Prodáno: fakturovat až po kolaudaci.', cO,
    m => { m.varianty[0].prodano = { datum: DNES }; });
  test('po Prodáno se poznámky uloží (200)', r.status === 200 && r.ulozeno === 'Po Prodáno: fakturovat až po kolaudaci.', r);
}
{
  /* Poznámky nejsou zástěrka: změna zamčených dat spolu s nimi dál neprojde. */
  const r = await uloz(zamkni(nova('CN schované')), cO);
  const g = await nacti(r.soubor, cO);
  const a = zk.importZakazka(kopie(g));
  a.poznamkyText = 'Jen poznámka…'; a.varianty[0].data.ock.zadani.zdvih = 12;
  const r2 = await uloz(a, cO, g.uloRazitko);
  test('změna zamčené kalkulace schovaná za poznámku → 409', r2.status === 409, r2);
}

console.log('===== kdo píše =====');
{
  const r = await dopis(nova('vedoucí'), 'Vedoucí doplnil.', cV);
  test('vedoucí smí doplnit poznámky cizí zakázky (200)', r.status === 200 && r.ulozeno === 'Vedoucí doplnil.', r);
}
{
  const r = await dopis(zamkni(nova('admin po CN')), 'Administrátor doplnil po CN.', cA);
  test('administrátor smí doplnit poznámky po CN (200)', r.status === 200 && r.ulozeno === 'Administrátor doplnil po CN.', r);
}
{
  const r = await dopis(nova('cizí'), 'Cizí obchodník přepsal.', cC);
  test('cizí obchodník (jen čte) poznámky nezmění → 403', r.status === 403 && /interní poznámky/i.test(r.chyba || ''), r);
}
{
  const r = await dopis(zamkni(nova('cizí po CN')), 'Cizí po CN.', cC);
  test('cizí obchodník ani po CN → 403', r.status === 403, r);
}
{
  /* Autor se bere z ULOŽENÉ verze — podvržený autor v těle pravidlo neobejde. */
  const z = nova('cizí podvrh');
  const r = await uloz(z, cO); const g = await nacti(r.soubor, cO);
  const a = zk.importZakazka(kopie(g)); a.autor = 'cizi.ik@priklad.cz'; a.poznamkyText = 'Podvrh autora.';
  const r2 = await uloz(a, cC, g.uloRazitko);
  test('cizí obchodník s podvrženým autorem v těle → 403', r2.status === 403, r2);
}
{
  /* Cizí obchodník, který poznámky nemění (např. odeslaný tisk jiné strany),
   * na pojistku nenarazí — hlídá se jen změna textu. */
  const z = nova('cizí beze změny');
  const r = await uloz(z, cO); const g = await nacti(r.soubor, cO);
  const a = zk.importZakazka(kopie(g)); a.nazevAkce = 'TEST IK cizí přejmenoval';
  const r2 = await uloz(a, cC, g.uloRazitko);
  test('cizí obchodník bez změny poznámek na pojistku IK nenarazí', r2.status === 200, r2);
}
{
  /* Starší zakázka se strukturovanými poznámkami: první zápis téhož
   * odvozeného textu není změna (pole se jen „zhmotní"). */
  const z = nova('starší'); delete z.poznamkyText;
  z.poznamky = [{ id: 'p1', text: 'Stará věta.', druh: 'jine', kdy: '2026-09-01T08:00:00.000Z', kdo: 'Test' }];
  const r = await uloz(z, cO); const g = await nacti(r.soubor, cO);
  const a = zk.importZakazka(kopie(g));
  a.poznamkyText = globalThis.poznamkyPoleText(a);
  const r2 = await uloz(a, cC, g.uloRazitko);
  test('zhmotnění odvozeného textu starších poznámek není změna (200)', r2.status === 200, r2);
}

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
