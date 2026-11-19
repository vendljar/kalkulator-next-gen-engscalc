/* K50-N1 NA SERVERU (kolo 50, 19. 11. 2026): statika opláštění v zahraniční řadě.
 *
 * Od #667 nesla zahraniční řada u statiky opláštění TUZEMSKOU sazbu (migrace
 * dosadila `statikaOplKc` z tuzemské statiky, zahraniční řada klíč nemá).
 * Oprava: nevyplněná zahraniční statika opláštění = zahraniční `C.statikaKc`
 * (cenikZahrSVychozimi). Hlídá se přes skutečné /api/program a /api/zakazky
 * (úložiště v paměti):
 *   1) nová zahraniční zakázka složená jako v aplikaci nese zahraniční sazbu;
 *      obchodník ji uloží (200), zamkne (200), ověření „shoda", zmrazený
 *      řádek statiky opláštění má zahraniční sazbu;
 *   2) B112 (kandidáti ceníku na serveru): nová zahraniční zakázka s tuzemskou
 *      sazbou statiky opláštění = změna ceníku bez práva (403);
 *   3) data z v19.11.1 (tuzemská sazba v zahraniční variantě): zamčená
 *      varianta se dalším uložením nemění a ověření zůstává „shoda";
 *      rozpracovaná se uloží beze změny (200) i po přepočtu na zahraniční
 *      sazbu (200).
 * Čísla jsou smyšlená (zkušební ceník + částky v testu).
 * Pojistka: proti a3fad44 (před opravou) padá krok 1 (sazba tuzemská)
 * a krok 2 (server tuzemskou sazbu přijme, 200).
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
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
const { JEKLY } = await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const zam = require(R + 'src/zamek.js');
const CS = require(R + 'src/cenik_stari.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const E = require(R + 'src/engine.js');
/* Skládání řady jako v aplikaci (cenik_rady.js potřebuje cenikNastavHodnotu a cenikSledovane). */
Object.assign(globalThis, require(R + 'src/cenik.js'), CS);
const CR = require(R + 'src/cenik_rady.js');

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

const CR_STATIKA = 1000, ZAHR_STATIKA = 5000;                     // smyšlené
const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const V1 = ZC.zkusebniCenik(); V1.statikaOplHod = 6; V1.statikaKc = CR_STATIKA; delete V1.statikaOplKc;   // zveřejněná verze bez klíče
{ const r = await post(program, 'http://x/api/program', { cenik: V1, cenikProj: ZC.zkusebniCenikProj(),
    zahranicni: { ceny: { 'C.statikaKc': ZAHR_STATIKA }, jenZahr: {} },
    slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15, 'Administrátor': 1 } }, poznamka: 'K50-N1' }, cA);
  test('příprava: ceník se zahraniční statikou zveřejněn', r.status === 200, await r.json()); }
const OBCH = 'obch.k50@priklad.cz';
{ const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: OBCH, jmeno: 'Obch Zahranici', role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x)); }
const cO = await prihlas(OBCH, 'Heslo12345x');
const platny = () => JSON.parse(pamet.get('program/db')).platny;

const ROZMERY = { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4, typSachty: 'exteriérová', statikaOpl: true };
let n = 9650;
/* Zahraniční zakázka složená z platného ceníku jako v aplikaci (progPouzij:
 * migrace ceníku, pak cenikDnesniProRadu pro řadu varianty). */
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST K50 ' + nazev;
  const d = z.varianty[0].data;
  Object.assign(d.ock.zadani, ROZMERY);
  const p = platny();
  const c = kopie(p.cenik); E.cenikMigraceLeseni(c);
  const s = CR.cenikDnesniProRadu({ cenik: c, proj: { cenik: kopie(p.cenikProj) } }, CR.cenikZahrOciste(p.zahranicni), 'zahr');
  d.cenikRada = 'zahr';
  d.cenik = s.cenik; d.proj.cenik = s.proj.cenik;
  CS.cenikOznacJakoDnesni(d, { verze: p.verze });
  return z;
}
const zamkni = (z, vysledek) => { const v = z.varianty[0];
  zam.zamkniVariantu(v, { typ: 'nabidka', kdy: new Date().toISOString(), kdo: 'Test K50',
    cislo: zam.variantaCislo(z, v), vysledek: vysledek || zam.zamekVysledekSpocti(v, JEKLY, 'v-k50') });
  return z; };
const sazbaOpl = (vys) => { const m = JSON.stringify(vys || {}).match(/"origNazev":"STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ"[^}]*?"cena":(\d+(?:\.\d+)?)/)
  || JSON.stringify(vys || {}).match(/"cena":(\d+(?:\.\d+)?)[^}]*?"origNazev":"STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ"/);
  return m ? +m[1] : null; };

console.log('===== 1. nová zahraniční zakázka: zahraniční statika opláštění =====');
await blok(async () => {
  const z = nova('nová');
  test('složená varianta nese zahraniční statiku opláštění', z.varianty[0].data.cenik.statikaOplKc === ZAHR_STATIKA,
    z.varianty[0].data.cenik.statikaOplKc);
  const r1 = await uloz(z, cO);
  test('uložení obchodníkem (200)', r1.status === 200, r1);
  const g = await nacti(r1.soubor, cO);
  test('úložiště: zahraniční statika opláštění', g.varianty[0].data.cenik.statikaOplKc === ZAHR_STATIKA, g.varianty[0].data.cenik.statikaOplKc);
  const rz = await uloz(zamkni(g), cO);
  test('zámek (200)', rz.status === 200, rz);
  const u = await nacti(r1.soubor, cO);
  const zm = u && u.varianty[0].zamek;
  test('ověření výsledku „shoda"', zm && zm.overeni && zm.overeni.stav === 'shoda', zm && zm.overeni);
  test('zmrazený řádek statiky opláštění má zahraniční sazbu', sazbaOpl(zm && zm.vysledek) === ZAHR_STATIKA, sazbaOpl(zm && zm.vysledek));
});

console.log('===== 2. B112: tuzemská sazba v nové zahraniční zakázce = změna ceníku =====');
await blok(async () => {
  const z = nova('tuzemská sazba');
  z.varianty[0].data.cenik.statikaOplKc = CR_STATIKA;               // jako chyba v19.11.1
  const r = await uloz(z, cO);
  test('obchodník: 403 (ceník varianty se liší od platného)', r.status === 403 && /statikaOplKc/.test(JSON.stringify(r)), r);
});

console.log('===== 3. data z v19.11.1: tuzemská sazba v zahraniční variantě =====');
await blok(async () => {
  /* a) zamčená: správce ji uložil a zamkl (jako za v19.11.1) */
  const z = nova('stará zamčená'); z.varianty[0].data.cenik.statikaOplKc = CR_STATIKA;
  const r1 = await uloz(z, cA);
  test('příprava: uložení správcem (200)', r1.status === 200, r1);
  const g = await nacti(r1.soubor, cA);
  const rz = await uloz(zamkni(g), cA);
  test('příprava: zámek (200)', rz.status === 200, rz);
  const g2 = await nacti(r1.soubor, cO);
  const r2 = await uloz(g2, cO);
  test('zamčená: další uložení obchodníkem (200)', r2.status === 200, r2);
  const g3 = await nacti(r1.soubor, cO);
  test('zamčená: statika opláštění beze změny', g3.varianty[0].data.cenik.statikaOplKc === CR_STATIKA, g3.varianty[0].data.cenik.statikaOplKc);
  const ov = g3.varianty[0].zamek && g3.varianty[0].zamek.overeni;
  test('zamčená: ověření zámku dál „shoda"', ov && ov.stav === 'shoda', ov);
  test('zamčená: zmrazený řádek drží původní sazbu', sazbaOpl(g3.varianty[0].zamek.vysledek) === CR_STATIKA, sazbaOpl(g3.varianty[0].zamek.vysledek));

  /* b) rozpracovaná: uložení beze změny i po přepočtu */
  const zb = nova('stará rozpracovaná'); zb.varianty[0].data.cenik.statikaOplKc = CR_STATIKA;
  const rb = await uloz(zb, cA);
  test('příprava: rozpracovaná uložena správcem (200)', rb.status === 200, rb);
  const gb = await nacti(rb.soubor, cO);
  const rb2 = await uloz(gb, cO);
  test('rozpracovaná: uložení obchodníkem beze změny (200)', rb2.status === 200, rb2);
  const gb2 = await nacti(rb.soubor, cO);
  gb2.varianty[0].data.cenik.statikaOplKc = ZAHR_STATIKA;              // přepočet na dnešní ceník
  const rb3 = await uloz(gb2, cO);
  test('rozpracovaná: uložení po přepočtu na zahraniční sazbu (200)', rb3.status === 200, rb3);
});

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
