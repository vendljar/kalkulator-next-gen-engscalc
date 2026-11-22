/* LAKOVÁNÍ — CENA Z NABÍDKY LAKOVNY NA SERVERU (#666, J. V. 18. 11. 2026; vzor #667).
 *
 * Přes skutečné funkce /api/zakazky a /api/program (úložiště v paměti):
 *   1) B112: obchodník s částkou C.lak.nabidkaKc BEZ záznamu ruční ceny → 403;
 *   2) se záznamem, zdrojem a potvrzením → 200, razítko serveru, zámek 200,
 *      ověření „shoda", zmrazený řádek lakování = částka z nabídky;
 *      podvrh výsledku (spočtený bez částky) server za „shodu" nevezme;
 *   3) bez zdroje: uložit jde (200), razítko server nedá, zámek 403 se
 *      srozumitelnou větou; nepotvrzená se zdrojem → zámek 403;
 *   4) záznam s jinou hodnotou než ceník varianty → odmítnuto (B112 403);
 *   5) zamčená varianta: částku po odeslání změnit nejde;
 *   6) ↺ vrátit (klíč smazán) → uložení 200, lakování zase z ceníku.
 * Čísla jsou smyšlená (zkušební ceník).
 *
 * Pojistka: proti 05a496d (před #666) padá oddíl 2 (403 B112 „Ceník
 * varianty smí měnit jen administrátor … cenik.lak.nabidkaKc") i oddíl 3.
 */
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
const { default: funkce } = await import(R + 'netlify/functions/funkce.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
const { JEKLY } = await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const zam = require(R + 'src/zamek.js');
const CS = require(R + 'src/cenik_stari.js');
const ZC = require(R + 'src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const kopie = x => JSON.parse(JSON.stringify(x));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const nacti = async (soubor, c) => (await (await zakazky(new Request('http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), { headers: { cookie: c } }))).json()).zakazka;
const uloz = async (zak, c) => { const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak }, c); return { status: r.status, ...(await r.json()) }; };
const blok = async (f) => { try { await f(); } catch (e) { fail++; console.log('FAIL výjimka v bloku: ' + (e && e.stack)); } };

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const V1 = ZC.zkusebniCenik();   // smyšlené
{ const r = await post(program, 'http://x/api/program', { cenik: V1, cenikProj: ZC.zkusebniCenikProj(),
    slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15, 'Administrátor': 1 } }, poznamka: '#666' }, cA);
  test('příprava: ceník zveřejněn', r.status === 200, await r.json()); }
const OBCH = 'obch.lakovani@priklad.cz';
{ const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: OBCH, jmeno: 'Obch Lakovani', role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x)); }
const cO = await prihlas(OBCH, 'Heslo12345x');
const platny = () => JSON.parse(pamet.get('program/db')).platny;

const ROZMERY = { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4, typSachty: 'exteriérová' };
let n = 9666;
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST lakování ' + nazev;
  Object.assign(z.varianty[0].data.ock.zadani, ROZMERY);
  z.varianty[0].data.cenik = kopie(platny().cenik);
  z.varianty[0].data.proj.cenik = kopie(platny().cenikProj);
  CS.cenikOznacJakoDnesni(z.varianty[0].data, { verze: platny().verze });
  return z;
}
const d0 = (z) => z.varianty[0].data;
const zamkni = (z, vysledek) => { const v = z.varianty[0];
  zam.zamkniVariantu(v, { typ: 'nabidka', kdy: new Date().toISOString(), kdo: 'Test lakování',
    cislo: zam.variantaCislo(z, v), vysledek: vysledek || zam.zamekVysledekSpocti(v, JEKLY, 'v-666') });
  return z; };
const NAZEV = 'LAKOVÁNÍ (ŠACHTA, PLECHY, ZASKLENÍ, OPLECHOVÁNÍ)';
const lakRadek = (vys) => { const r = vys && (vys.sekce ? vys : vys.ock); return r && r.sekce ? (r.sekce.hrubaOck || []).find(x => x.origNazev === NAZEV) : null; };
const sNabidkou = (nazev, castka, zaznam) => { const z = nova(nazev); const d = d0(z);
  d.cenik.lak.nabidkaKc = castka;
  if (zaznam !== null) d.rucniCeny = { 'C.lak.nabidkaKc': Object.assign({ hodnota: castka, dodavatel: 'Lakovna Příklad s.r.o.',
    cislo: 'NL-2026-666', datum: '2026-11-20', platnostDo: '', zaklad: null, potvrdil: { jmeno: 'x' } }, zaznam || {}) };
  return z; };

console.log('===== 1. B112: částka bez záznamu =====');
await blok(async () => {
  const r = await uloz(sNabidkou('bez záznamu', 12345, null), cO);
  test('obchodník: částka lakování bez záznamu ruční ceny → 403', r.status === 403 && /nabidkaKc|ceník/i.test(r.chyba || ''), r);
});

console.log('===== 2. se záznamem, zdrojem a potvrzením =====');
await blok(async () => {
  const r1 = await uloz(sNabidkou('potvrzená', 23456), cO);
  test('uložení (200)', r1.status === 200, r1);
  const g = await nacti(r1.soubor, cO);
  const rec = g && g.varianty[0].data.rucniCeny && g.varianty[0].data.rucniCeny['C.lak.nabidkaKc'];
  test('úložiště: razítko serveru z relace, základ null', !!rec && rec.potvrdil && rec.potvrdil.email === OBCH && rec.zaklad === null, rec);
  test('úložiště: částka v ceníku varianty', g.varianty[0].data.cenik.lak.nabidkaKc === 23456);
  /* podvrh: výsledek spočtený bez částky (jako by lakování šlo z ceníku) */
  const gp = kopie(g); delete gp.varianty[0].data.cenik.lak.nabidkaKc;
  const vysPodvrh = zam.zamekVysledekSpocti(gp.varianty[0], JEKLY, 'v-666');
  const vys = zam.zamekVysledekSpocti(g.varianty[0], JEKLY, 'v-666');
  test('příprava: výsledky se liší (s částkou / bez)', JSON.stringify(vys) !== JSON.stringify(vysPodvrh));
  const rp = await uloz(zamkni(kopie(g), vysPodvrh), cO);
  const up = rp.status === 200 ? await nacti(r1.soubor, cO) : null;
  const ovP = up && up.varianty[0].zamek && up.varianty[0].zamek.overeni;
  test('podvrh výsledku bez částky server nepřijme jako „shodu"', rp.status !== 200 || (ovP && ovP.stav !== 'shoda'), { status: rp.status, ov: ovP });
  /* poctivý zámek na nové zakázce */
  const r3 = await uloz(sNabidkou('potvrzená poctivě', 23456), cO);
  const g3 = await nacti(r3.soubor, cO);
  const rz = await uloz(zamkni(g3), cO);
  test('zámek (200)', rz.status === 200, rz);
  const u = await nacti(r3.soubor, cO);
  const zm = u && u.varianty[0].zamek;
  test('ověření výsledku „shoda"', zm && zm.overeni && zm.overeni.stav === 'shoda', zm && zm.overeni);
  const lr = lakRadek(zm && zm.vysledek);
  test('zmrazený řádek lakování = částka z nabídky', !!lr && lr.naklad === 23456, lr);

  console.log('===== 5. zamčená varianta: částku po odeslání změnit nejde =====');
  const gz = await nacti(r3.soubor, cO);
  gz.varianty[0].data.cenik.lak.nabidkaKc = 1000;
  gz.varianty[0].data.rucniCeny['C.lak.nabidkaKc'].hodnota = 1000;
  const rzz = await uloz(gz, cO);
  const uz = await nacti(r3.soubor, cO);
  test('změna částky zamčené varianty neprojde (odmítnuto, nebo data beze změny)',
    rzz.status !== 200 || uz.varianty[0].data.cenik.lak.nabidkaKc === 23456, { status: rzz.status, chyba: rzz.chyba });
});

console.log('===== 3. bez zdroje / nepotvrzená =====');
await blok(async () => {
  const r1 = await uloz(sNabidkou('bez zdroje', 15000, { dodavatel: '', cislo: '' }), cO);
  test('bez zdroje: rozpracované uložení (200)', r1.status === 200, r1);
  const g1 = await nacti(r1.soubor, cO);
  test('bez zdroje: server potvrzení neorazítkuje', g1.varianty[0].data.rucniCeny['C.lak.nabidkaKc'].potvrdil === null);
  const rz1 = await uloz(zamkni(g1), cO);
  test('bez zdroje: zámek 403 (nepotvrzená cena, srozumitelná věta)', rz1.status === 403 && /doplňte dodavatele nebo číslo nabídky/.test(rz1.chyba || '') && !/směs/.test(rz1.chyba || ''), rz1);
  const r2 = await uloz(sNabidkou('nepotvrzená', 15000, { potvrdil: null }), cO);
  const rz2 = await uloz(zamkni(await nacti(r2.soubor, cO)), cO);
  test('nepotvrzená se zdrojem: zámek 403', rz2.status === 403, rz2);
});

console.log('===== 4. hodnota záznamu ≠ ceník varianty =====');
await blok(async () => {
  const z = sNabidkou('nesedí', 15000); d0(z).rucniCeny['C.lak.nabidkaKc'].hodnota = 14000;
  const r = await uloz(z, cO);
  test('nesedící záznam → odmítnuto (403 B112 / 400)', r.status === 400 || r.status === 403, r);
});

console.log('===== 6. ↺ vrátit na ceník =====');
await blok(async () => {
  const r1 = await uloz(sNabidkou('vrátit', 18000), cO);
  const g = await nacti(r1.soubor, cO);
  delete g.varianty[0].data.cenik.lak.nabidkaKc; delete g.varianty[0].data.rucniCeny;
  const r2 = await uloz(g, cO);
  test('uložení po ↺ vrátit (200)', r2.status === 200, r2);
  const u = await nacti(r1.soubor, cO);
  test('klíč i záznam pryč', !('nabidkaKc' in u.varianty[0].data.cenik.lak) && !u.varianty[0].data.rucniCeny, u.varianty[0].data.rucniCeny);
  const rz = await uloz(zamkni(u), cO);
  test('zámek bez částky (200)', rz.status === 200, rz);
});

console.log(`\n${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
