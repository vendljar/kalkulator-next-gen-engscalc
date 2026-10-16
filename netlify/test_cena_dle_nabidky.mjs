/* PŘÍZNAK „CENA DLE NABÍDKY" NA SERVERU (S13, v16.10.3; J. V. 16. 10. 2026).
 *
 * U položky, kterou PLATNÝ ceník označil příznakem (prosklená stěna vedle
 * šachty…), zadává obchodník cenu podle nabídky — ruční cena není odchylka
 * od ceníku: kontrola ceníku (B128) ani cenová výjimka ji nezastaví, nový
 * zámek (tisk nabídky) projde bez schválení. Běžný příplatek pod ceníkem se
 * hlídá dál (403 s konkrétní hláškou). Příznak se bere jen z platného
 * ceníku: zakázka, která si ho do svého ceníku „podstrčí", se odmítne
 * stejně jako dřív.
 *
 * Pojistka proti prázdnému testu: proti v15.10.14 (1cbab3a) vrací zámek
 * s vlastní cenou stěny 403 (kontrola ceníku) a zveřejnění samotného
 * příznaku 400 („neliší se").
 *
 * Paměťové úložiště, zkušební ceník. Spuštění: node netlify/test_cena_dle_nabidky.mjs */
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
const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obch.dlenab@priklad.cz', jmeno: 'Obch Nabídka', role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
const cO = await prihlas('obch.dlenab@priklad.cz', 'Heslo12345x');

const STENA = 'C.priplatky.prosklenaStenaKc';
/* Smyšlené ceny: orientační cena stěny a ventilátor. */
const V1 = ZC.zkusebniCenik(); V1.priplatky.prosklenaStenaKc = 50000; V1.priplatky.ventilatorKc = 20000;
const r1 = await zverejni(V1, 'dle nabídky V1 (bez příznaku)');
test('příprava: V1 bez příznaku zveřejněna', r1.status === 200, r1);
const V2 = kopie(V1); V2.dleNabidky = { [STENA]: true };
const r2 = await zverejni(V2, 'dle nabídky V2 (jen příznak)');
test('zveřejnění samotného příznaku (ceny beze změny) projde — otisk ho nese', r2.status === 200 && r2.verze === 2, r2);
const platny = () => JSON.parse(pamet.get('program/db')).platny;
test('platný ceník nese příznak stěny', platny().cenik.dleNabidky && platny().cenik.dleNabidky[STENA] === true, platny().cenik.dleNabidky);

const ROZMERY = { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4, typSachty: 'exteriérová' };
let n = 9800;   // vlastní rozsah 9800–9899
function nova(nazev, cenik) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST dle nabídky ' + nazev;
  Object.assign(z.varianty[0].data.ock.zadani, ROZMERY);
  z.varianty[0].data.cenik = kopie(cenik || platny().cenik);
  z.varianty[0].data.proj.cenik = kopie(platny().cenikProj);
  CS.cenikOznacJakoDnesni(z.varianty[0].data, { verze: platny().verze });
  return z;
}
const d0 = (z) => z.varianty[0].data;
const zamkni = (z) => { const v = z.varianty[0];
  zam.zamkniVariantu(v, { typ: 'nabidka', kdy: new Date().toISOString(), kdo: 'Test dle nabídky',
    cislo: zam.variantaCislo(z, v), vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-dlenab') });
  return z; };

console.log('===== položka s příznakem =====');
{ const z = nova('stěna nižší'); d0(z).cenik.priplatky.prosklenaStenaKc = 12000;
  const r = await uloz(z, cO);
  test('obchodník uloží vlastní cenu stěny (200)', r.status === 200, r); }
{ const z = nova('stěna nižší + zámek'); d0(z).cenik.priplatky.prosklenaStenaKc = 12000; zamkni(z);
  const r = await uloz(z, cO);
  test('obchodník: nový zámek (tisk nabídky) s vlastní cenou stěny bez schválení → 200', r.status === 200, r);
  const ul = r.soubor ? await nacti(r.soubor, cO) : null;
  test('… cenová výjimka se nezaložila', !!ul && !ul.varianty[0].data.cenovaVyjimka, ul && ul.varianty[0].data.cenovaVyjimka); }
{ const z = nova('stěna vyšší + zámek'); d0(z).cenik.priplatky.prosklenaStenaKc = 80000; zamkni(z);
  const r = await uloz(z, cO);
  test('obchodník: vlastní cena stěny NAD orientační + zámek → 200', r.status === 200, r); }
{ const z = nova('stěna záporná'); d0(z).cenik.priplatky.prosklenaStenaKc = -1000;
  const r = await uloz(z, cO);
  test('záporná cena stěny → 403 (ceník)', r.status === 403, r); }

console.log('===== běžný příplatek =====');
{ const z = nova('ventilátor + zámek'); d0(z).cenik.priplatky.ventilatorKc = 15000; zamkni(z);
  const r = await uloz(z, cO);
  test('ventilátor pod ceníkem + zámek bez schválení → 403 jako dřív', r.status === 403, r); }
{ const z = nova('ventilátor admin + zámek'); d0(z).cenik.priplatky.ventilatorKc = 15000; zamkni(z);
  const r = await uloz(z, cA);
  test('administrátor: ventilátor pod ceníkem + zámek → 200', r.status === 200, r); }

console.log('===== podstrčený příznak =====');
{ const V3 = kopie(V1); V3.montazHodKc = (+V1.montazHodKc || 0) + 1;      // V3 bez příznaku (smyšlená změna)
  const r3 = await zverejni(V3, 'dle nabídky V3 (příznak zrušen)');
  test('příprava: V3 bez příznaku zveřejněna', r3.status === 200 && !platny().cenik.dleNabidky, r3);
  const z = nova('podstrčený'); d0(z).cenik.dleNabidky = { [STENA]: true };
  d0(z).cenik.priplatky.prosklenaStenaKc = 12000;
  const r = await uloz(z, cO);
  test('zakázka s podstrčeným příznakem a vlastní cenou stěny → 403 jako dřív', r.status === 403, r);
  const z2 = nova('podstrčený + zámek'); d0(z2).cenik.dleNabidky = { [STENA]: true }; zamkni(z2);
  const rz = await uloz(z2, cO);
  test('podstrčená mapa bez změny ceny: nic nepovolí, ale ani neblokuje (200)', rz.status === 200, rz); }

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
