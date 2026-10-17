/* POKUS AUDITU KOLA 26 (17. 10. 2026) k nálezu B179 — viz podklady/AUDIT_2026-10-17_v16.10.5.md.
 * Jen čte: paměťové úložiště, zkušební ceník, smyšlené údaje. Úvod převzatý
 * z netlify/test_cena_dle_nabidky.mjs (jeho kontroly se vypíšou jako OK).
 * Spuštění: ADMIN_EMAIL=spravce@priklad.cz node podklady/AUDIT26_pokus_B179_priznak.mjs */
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


/* ---------- POKUS B179: příznak z ceníku VARIANTY se zveřejní a rozpis ho neukáže ----------
 * 1) Obchodník uloží zakázku, jejíž ceník nese mapu `dleNabidky` i s hodinovou
 *    sazbou montáže (ceny beze změny → server ji pustí, mapa je „metadata").
 * 2) Správce z té varianty zveřejní ceník (třeba jen zdraží ventilátor).
 *    Rozpis před zveřejněním (programRozdily — totéž volá progZverejniRozpis)
 *    ukáže jen ventilátor; mapa příznaků projde do platné verze.
 * 3) Obchodník pak sníží sazbu montáže a zamkne (tisk) bez schválení. */
const PG = require(R + 'src/program.js');
const MONTAZ = 'C.montazHodKc';
{
  const z = nova('B179 podstrčená mapa'); d0(z).cenik.dleNabidky = { [STENA]: true, [MONTAZ]: true };
  const r1 = await uloz(z, cO);
  test('1) obchodník uloží zakázku s mapou příznaků vč. montáže (200)', r1.status === 200, r1);
  const g = await nacti(r1.soubor, cA);
  const cen = kopie(d0(g).cenik); cen.priplatky.ventilatorKc = (+cen.priplatky.ventilatorKc || 0) + 1000;
  /* progKontext: cenikZverejneniOcisti nechá známé číselné cesty OCK s true */
  const ctx = { cenik: cen, cenikProj: ZC.zkusebniCenikProj(), slevy: NASTSL };
  const db = JSON.parse(pamet.get('program/db'));
  const rozdily = PG.programRozdily(db, ctx);
  console.log('rozpis (ČR):', rozdily.map(x => x.popis || x.cesta));
  test('2) rozpis zveřejnění ukáže jen ventilátor, příznaky ne', rozdily.length === 1 && !rozdily.some(x => /montáž|montaz/i.test(String(x.popis || x.cesta))), rozdily);
  const r2 = await zverejni(cen, 'B179 zdražení ventilátoru');
  test('2) správce zveřejní (200)', r2.status === 200, r2);
  console.log('platná mapa:', JSON.stringify(platny().cenik.dleNabidky));
  test('2) platný ceník nese příznak montáže z ceníku obchodníka', platny().cenik.dleNabidky && platny().cenik.dleNabidky[MONTAZ] === true, platny().cenik.dleNabidky);
  const a = nova('B179 levná montáž'); d0(a).cenik.montazHodKc = 1; zamkni(a);
  const r3 = await uloz(a, cO);
  test('3) obchodník: montáž za 1 Kč/h + zámek (tisk) bez schválení → 200', r3.status === 200, r3);
}
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
