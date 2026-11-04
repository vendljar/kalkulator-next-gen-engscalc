/* RUČNÍ CENA POLOŽKY OBCHODNÍKEM S POTVRZENÍM NA SERVERU (#561, J. V. 4. 11. 2026).
 *
 * Do v4.11.3 server změnu ceníku varianty u role bez práva `tab.cenik`
 * odmítl 403 (B112, uloCenikProblemy). Teď přijme změnu NÁKUPNÍ ceny jedné
 * položky, když k ní varianta nese záznam `rucniCeny` se stejnou hodnotou —
 * ostatní sazby ceníku hlídá dál. Razítko „kdo a kdy potvrdil" píše server
 * z relace (podvržené se zahodí), ceníkovou sazbu pro controlling taky.
 * Nový zámek (tisk) s nepotvrzenou ruční cenou 403 — i administrátorovi.
 * Zámek drží, klon nese potvrzení (B154), cenová výjimka nevznikne.
 *
 * Pojistka proti prázdnému testu: proti 6109e39 (v4.11.3) 7 OK / 10 FAIL —
 * uložení ruční ceny vrací 403 (B112), razítko ani základ se nepíší, zámek
 * administrátora s nepotvrzenou cenou projde (200); po změně 27 / 0.
 *
 * Paměťové úložiště, zkušební ceník, smyšlená čísla.
 * Spuštění: node netlify/test_561_rucni_cena.mjs */
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

const NASTSL = { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15, 'Administrátor': 1 } };
const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const zverejni = async (cenik, pozn) => {
  const r = await post(program, 'http://x/api/program', { cenik, cenikProj: ZC.zkusebniCenikProj(), slevy: NASTSL, poznamka: pozn }, cA);
  return { status: r.status, ...(await r.json()) };
};
const OBCH = 'obch.rucni@priklad.cz';
const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: OBCH, jmeno: 'Obch Ruční', role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
const cO = await prihlas(OBCH, 'Heslo12345x');

const PROF = 'C.profilasKgKc';
const V1 = ZC.zkusebniCenik(); V1.profilasKgKc = 80; V1.montazHodKc = 600;      // smyšlené
const r1 = await zverejni(V1, '#561 V1');
test('příprava: ceník zveřejněn', r1.status === 200, r1);
const platny = () => JSON.parse(pamet.get('program/db')).platny;

const ROZMERY = { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4, typSachty: 'exteriérová' };
let n = 9561;
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST ruční cena ' + nazev;
  Object.assign(z.varianty[0].data.ock.zadani, ROZMERY);
  z.varianty[0].data.cenik = kopie(platny().cenik);
  z.varianty[0].data.proj.cenik = kopie(platny().cenikProj);
  CS.cenikOznacJakoDnesni(z.varianty[0].data, { verze: platny().verze });
  return z;
}
const d0 = (z) => z.varianty[0].data;
const rucni = (z, h, extra) => {
  const d = d0(z); d.cenik.profilasKgKc = h;
  d.rucniCeny = { [PROF]: Object.assign({ hodnota: h, dodavatel: 'Ocelárna Příklad s.r.o.', cislo: 'N-2026-0815',
    datum: '2026-11-02', platnostDo: '2026-12-02', zaklad: null, potvrdil: null }, extra || {}) };
  return z;
};
const zamkni = (z, i) => { const v = z.varianty[i || 0];
  zam.zamkniVariantu(v, { typ: 'nabidka', kdy: new Date().toISOString(), kdo: 'Test ruční cena',
    cislo: zam.variantaCislo(z, v), vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-561') });
  return z; };
let razitko = null, zamcena = null;
const blok = async (f) => { try { await f(); } catch (e) { fail++; console.log('FAIL výjimka v bloku: ' + (e && e.message)); } };
const FALESNE = { jmeno: 'Podvržené Jméno', email: 'cizi@priklad.cz', kdy: '2020-01-01T00:00:00.000Z' };

console.log('===== B112: bez záznamu jako dřív, se záznamem přijato =====');
{ const z = nova('bez záznamu'); d0(z).cenik.profilasKgKc = 95;
  const r = await uloz(z, cO);
  test('obchodník: změna sazby profilů BEZ záznamu → 403 jako dřív (B112)', r.status === 403 && /Ceník varianty smí měnit jen administrátor/.test(r.chyba), r); }
let soubor = '', ulozena = null;
{ const z = rucni(nova('nepotvrzená'), 95);
  const r = await uloz(z, cO);
  test('obchodník: ruční nákupní cena se záznamem → 200', r.status === 200, r);
  soubor = r.soubor; ulozena = r.soubor ? await nacti(r.soubor, cO) : null;
  const rec = ulozena && d0(ulozena).rucniCeny && d0(ulozena).rucniCeny[PROF];
  test('… uložená cena i záznam, nepotvrzeno', !!rec && d0(ulozena).cenik.profilasKgKc === 95 && rec.hodnota === 95 && rec.potvrdil === null, rec);
  test('… základ (ceníková sazba) z uložené verze/klienta, nepotvrzeno', !!rec && (rec.zaklad === null || typeof rec.zaklad === 'number'), rec); }
{ const z = rucni(nova('jiná sazba navíc'), 95); d0(z).cenik.montazHodKc = 1;
  const r = await uloz(z, cO);
  test('obchodník: ruční cena + změna JINÉ sazby (montáž) → 403, ostatní ceník chráněn', r.status === 403 && /montazHodKc/.test(r.chyba), r); }
{ const z = rucni(nova('nesedí'), 95); d0(z).cenik.profilasKgKc = 90;
  const r = await uloz(z, cO);
  test('záznam s jinou hodnotou než ceník varianty → odmítnuto', r.status === 403 || r.status === 400, r); }
{ const z = nova('nepovolená'); d0(z).cenik.statikaHod = 99;
  d0(z).rucniCeny = { 'C.statikaHod': { hodnota: 99, potvrdil: null } };
  const r = await uloz(z, cO);
  test('záznam u položky bez ceny v Kč (hodiny statiky) nic nepovolí → odmítnuto', r.status === 403 || r.status === 400, r); }
{ const z = rucni(nova('text'), 95); d0(z).rucniCeny[PROF].dodavatel = { x: 1 };
  const r = await uloz(z, cO);
  test('neplatný tvar zdroje → 400', r.status === 400, r); }
{ const z = rucni(nova('nula'), 0);
  const r = await uloz(z, cO);
  test('nulová ruční cena → odmítnuto', r.status === 403 || r.status === 400, r); }

console.log('===== razítko ze serveru =====');
await blok(async () => {
{ const z = kopie(ulozena); d0(z).rucniCeny[PROF].potvrdil = FALESNE; d0(z).rucniCeny[PROF].zaklad = 1;
  const r = await uloz(z, cO);
  test('potvrzení obchodníkem → 200', r.status === 200, r);
  const u = await nacti(soubor, cO); const rec = d0(u).rucniCeny[PROF];
  razitko = rec.potvrdil;
  test('razítko: e-mail a jméno z relace, ne z požadavku', rec.potvrdil && rec.potvrdil.email === OBCH && /Obch Ruční/.test(rec.potvrdil.jmeno)
    && !/Podvržené/.test(rec.potvrdil.jmeno), rec.potvrdil);
  test('razítko: čas serveru, ne podvržený', rec.potvrdil && rec.potvrdil.kdy !== FALESNE.kdy && Date.now() - Date.parse(rec.potvrdil.kdy) < 60000, rec.potvrdil);
  test('základ = sazba platného ceníku (80), ne podvržená 1', rec.zaklad === 80, rec.zaklad);
  const sl = (r.slevy || []).find(s => s.id === z.varianty[0].id);
  test('odpověď nese ruční ceny s razítkem (prohlížeč si je převezme)', !!sl && sl.rucniCeny && sl.rucniCeny[PROF].potvrdil.email === OBCH, sl);
  ulozena = u; }
{ const z = kopie(ulozena); d0(z).rucniCeny[PROF].potvrdil = { jmeno: 'Jiný', email: 'jiny@priklad.cz', kdy: new Date().toISOString(), lokalne: true };
  const r = await uloz(z, cA);
  const u = await nacti(soubor, cO);
  test('opakované uložení stejného obsahu (i jiným uživatelem) drží původní razítko', r.status === 200
    && JSON.stringify(d0(u).rucniCeny[PROF].potvrdil) === JSON.stringify(razitko), d0(u).rucniCeny[PROF].potvrdil);
  ulozena = u; }
{ const z = kopie(ulozena); d0(z).rucniCeny[PROF].cislo = 'N-2026-0899';
  d0(z).rucniCeny[PROF].potvrdil = Object.assign({}, razitko, { lokalne: true });
  const r = await uloz(z, cA);
  const u = await nacti(soubor, cO); const p = d0(u).rucniCeny[PROF].potvrdil;
  test('změněný zdroj s novým potvrzením → nové razítko toho, kdo potvrdil (administrátor)', r.status === 200 && !!p
    && p.email === ADMIN_EMAIL && p.email !== razitko.email, p);
  const z2 = kopie(u); d0(z2).rucniCeny[PROF].cislo = 'N-2026-0815';
  d0(z2).rucniCeny[PROF].potvrdil = Object.assign({}, razitko, { lokalne: true });
  const r2 = await uloz(z2, cO);
  const u2 = await nacti(soubor, cO);
  razitko = d0(u2).rucniCeny[PROF].potvrdil;
  test('… zpět obchodníkem (nové razítko obchodníka)', r2.status === 200 && razitko.email === OBCH, razitko);
  ulozena = u2; }

});
console.log('===== zámek (tisk) =====');
await blok(async () => {
{ const z = rucni(nova('zámek nepotvrzená'), 95); zamkni(z);
  const r = await uloz(z, cO);
  test('nový zámek s nepotvrzenou ruční cenou → 403', r.status === 403 && /ruční cena položky není potvrzená/.test(r.chyba), r); }
{ const z = rucni(nova('zámek nepotvrzená admin'), 95); zamkni(z);
  const r = await uloz(z, cA);
  test('… i administrátorovi (zábranu nepřekročí ani on) → 403', r.status === 403, r); }
{ const z = kopie(ulozena); zamkni(z);
  const r = await uloz(z, cO);
  test('nový zámek s potvrzenou ruční cenou → 200 (bez cenové výjimky)', r.status === 200, r);
  zamcena = await nacti(soubor, cO);
  test('… cenová výjimka (směs ceníků) nevznikla', !d0(zamcena).cenovaVyjimka, d0(zamcena).cenovaVyjimka); }
{ const z = kopie(zamcena); d0(z).rucniCeny[PROF].cislo = 'N-JINA';
  const r = await uloz(z, cO);
  test('zamčená varianta: změna zdroje ruční ceny → 409', r.status === 409, r); }
{ const z = kopie(zamcena); delete d0(z).rucniCeny; d0(z).cenik.profilasKgKc = 80;
  const r = await uloz(z, cO);
  test('zamčená varianta: ↺ vrátit na ceník → 409', r.status === 409, r); }

});
console.log('===== klon (B154) =====');
await blok(async () => {
{ const z = kopie(zamcena);
  const k = zam.klonujVariantu(z, z.varianty[0].id);
  const kv = z.varianty[z.varianty.length - 1];
  kv.data.rucniCeny[PROF].potvrdil = Object.assign({}, kv.data.rucniCeny[PROF].potvrdil, { lokalne: true, jmeno: 'klient' });
  const r = await uloz(z, cO);
  const u = await nacti(soubor, cO);
  const uk = u.varianty.find(v => v.id === kv.id);
  test('klon nese ruční cenu a potvrzení z původní varianty (stejný obsah)', r.status === 200 && !!uk && uk.data.cenik.profilasKgKc === 95
    && JSON.stringify(uk.data.rucniCeny[PROF].potvrdil) === JSON.stringify(razitko), { r, k, rc: uk && uk.data.rucniCeny });
  const z2 = kopie(u); const k2 = z2.varianty.find(v => v.id === kv.id);
  k2.data.cenik.profilasKgKc = 97; k2.data.rucniCeny[PROF].hodnota = 97; k2.data.rucniCeny[PROF].potvrdil = null;
  zamkni(z2, z2.varianty.indexOf(k2));
  const r2 = await uloz(z2, cO);
  test('klon se změněnou cenou bez nového potvrzení → zámek 403', r2.status === 403, r2); }

});
console.log('===== nový ceník =====');
await blok(async () => {
{ const V2 = kopie(platny().cenik); V2.profilasKgKc = 88;
  const r = await zverejni(V2, '#561 V2 zdražení profilů');
  test('příprava: nový ceník zveřejněn', r.status === 200, r);
  const u = await nacti(soubor, cO);
  test('zveřejnění nového ceníku uloženou ruční cenu nezmění', d0(u).cenik.profilasKgKc === 95 && d0(u).rucniCeny[PROF].zaklad === 80);
  const z = rucni(nova('po novém ceníku'), 95, { potvrdil: { lokalne: true } });
  const r2 = await uloz(z, cO);
  const u2 = r2.soubor ? await nacti(r2.soubor, cO) : null;
  test('nové potvrzení po novém ceníku: základ z nového platného ceníku (88)', r2.status === 200 && d0(u2).rucniCeny[PROF].zaklad === 88, u2 && d0(u2).rucniCeny); }

});
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
