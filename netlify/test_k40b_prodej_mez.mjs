/* K40b (#580) — K40-S1 + K40-N3: dolní mez data prodeje z razítka přijetí
 * zámku serverem — serverová pojistka (POST /api/zakazky, /api/obnova).
 *
 * Ověřuje:
 *   – server při prvním přijetí nového zámku zapíše `zamek.prijato` (příchozí
 *     hodnotu zahodí) a vrátí ho v odpovědi (`zamkyPrijato`);
 *   – u uloženého zámku razítko drží (uloZamekRazitkaDrz), podvržené se
 *     nahradí, zámek bez razítka ho od klienta nedostane; starší klient, který
 *     pole nezná, ukládá bez 409;
 *   – nová zakázka i nový klon s časem zámku −300 / −200 dní a prodejem téhož
 *     dne → 400; −5 dní → 200; zámek a prodej v jednom požadavku;
 *   – výjimka: vedoucí s důvodem −30 dní → 200 + důvod v historii; bez důvodu
 *     → 400; obchodník s důvodem → 400;
 *   – Prodáno od klienta, který `prijato` neposílá → 200; s podvrženým → mez se
 *     nezmění;
 *   – obnova z otisku razítko přebere, obnova ze souboru ho zahodí (otázka 3a);
 *   – zakázka s víc šachtami (vypínač zapnutý, `ock.dalsi`, zámek se `sachty`).
 * Pojistka: nad c664c9e sada padá — server `prijato` nezapisuje ani nevrací
 * a nová zakázka se zámkem −300 dní a prodejem téhož dne projde (200).
 *
 * Paměťové úložiště, zkušební ceník, smyšlené účty a údaje.
 * Spuštění: node netlify/test_k40b_prodej_mez.mjs */
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
const { default: zaloha } = await import(R + 'netlify/functions/zaloha.mjs');
const { default: zalohaVynuceno } = await import(R + 'netlify/functions/zaloha_vynuceno.mjs');
const { default: obnova } = await import(R + 'netlify/functions/obnova.mjs');
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

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const rp = await (await post(program, 'http://x/api/program', { cenik: Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15, 'Administrátor': 1 } }, poznamka: 'k40b' }, cA)).json();
if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
for (const [email, role] of [['obch.k40b@priklad.cz', 'Obchodník'], ['ved.k40b@priklad.cz', 'Vedoucí']]) {
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email, jmeno: 'Test ' + role, role, heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
}
const cO = await prihlas('obch.k40b@priklad.cz', 'Heslo12345x');
const cV = await prihlas('ved.k40b@priklad.cz', 'Heslo12345x');

const DEN = 86400000;
const iso = t => new Date(t).toISOString();
const den = t => OBJ.objDnes(t);
const platny = () => JSON.parse(pamet.get('program/db')).platny;
const ROZMERY = { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 };
let n = 8941;   // vlastní rozsah 8941–8980
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST K40b ' + nazev;
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, ROZMERY);
  v.data.cenik = kopie(platny().cenik); v.data.proj.cenik = kopie(platny().cenikProj);
  return z;
}
const zamkni = (z, v, kdy, navic) => zam.zamkniVariantu(v, Object.assign({ typ: 'nabidkaTisk', kdy, kdo: 'Test K40b',
  cislo: zam.variantaCislo(z, v), vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-k40b') }, navic || {}));
const prodej = (v, datum, vyjimka) => { v.prodano = Object.assign({ datum, kdo: 'podvrh@priklad.cz', kdy: '2000-01-01T00:00:00.000Z' },
  vyjimka === undefined ? {} : { vyjimka }); };
const ted = Date.now();

console.log('===== razítko přijetí u nového zámku =====');
let odeslana = null;
{
  const z = nova('nový zámek');
  zamkni(z, z.varianty[0], iso(ted - 60 * DEN));
  z.varianty[0].zamek.prijato = '2001-01-01T00:00:00.000Z';   // podvrh
  const pred = Date.now();
  const r = await uloz(z, cO);
  const g = r.status === 200 ? await nacti(r.soubor, cO) : null;
  const p = g && g.varianty[0].zamek.prijato;
  test('nový zámek se uloží (200)', r.status === 200, r);
  test('server zapsal vlastní čas přijetí (podvržené prijato zahozeno)', typeof p === 'string' && Date.parse(p) >= pred - 1000 && Date.parse(p) <= Date.now() + 1000, p);
  test('odpověď nese zamkyPrijato s týmž razítkem', r.zamkyPrijato && r.zamkyPrijato[g.varianty[0].id] === p, r.zamkyPrijato);
  odeslana = { soubor: r.soubor, razitko: g.uloRazitko, zak: zk.importZakazka(kopie(g)), prijato: p };
}
{
  /* Starší klient (prijato nezná): uloží zakázku se zámkem bez 409, razítko zůstane. */
  const c = kopie(odeslana.zak); delete c.varianty[0].zamek.prijato; c.varianty[0].pozn = 'poznámka staršího klienta';
  const r = await uloz(c, cO, odeslana.razitko);
  const g = await nacti(odeslana.soubor, cO);
  test('starší klient bez prijato ukládá zakázku se zámkem (200, ne 409)', r.status === 200, r);
  test('…razítko přijetí zůstalo z uložené verze', g.varianty[0].zamek.prijato === odeslana.prijato, g.varianty[0].zamek);
  /* Podvržené razítko u uloženého zámku se nahradí uloženým. */
  const c2 = zk.importZakazka(kopie(g)); c2.varianty[0].zamek.prijato = iso(ted - 300 * DEN);
  const r2 = await uloz(c2, cO, g.uloRazitko);
  const g2 = await nacti(odeslana.soubor, cO);
  test('podvržené prijato u uloženého zámku → 200 a uložené razítko beze změny', r2.status === 200 && g2.varianty[0].zamek.prijato === odeslana.prijato, [r2.status, g2.varianty[0].zamek.prijato]);
  odeslana.razitko = g2.uloRazitko; odeslana.zak = zk.importZakazka(kopie(g2));
}
{
  /* Uložený zámek bez razítka (před opravou) ho od klienta nedostane. */
  const z = nova('starý zámek');
  zamkni(z, z.varianty[0], iso(ted - 30 * DEN));
  const r = await uloz(z, cO);
  const k = 'zakazky/z/' + r.soubor;
  const ul = JSON.parse(pamet.get(k)); delete ul.varianty[0].zamek.prijato; pamet.set(k, JSON.stringify(ul));   // jako před K40b
  const g = await nacti(r.soubor, cO);
  const c = zk.importZakazka(kopie(g)); c.varianty[0].zamek.prijato = iso(ted);
  const r2 = await uloz(c, cO, g.uloRazitko);
  const g2 = await nacti(r.soubor, cO);
  test('zámek bez razítka (uložený před opravou) ho od klienta nedostane', r2.status === 200 && !('prijato' in g2.varianty[0].zamek), [r2.status, g2.varianty[0].zamek]);
  /* …a prodej se řídí `kdy` jako dřív. */
  const c3 = zk.importZakazka(kopie(g2)); prodej(c3.varianty[0], den(ted - 25 * DEN));
  const r3 = await uloz(c3, cO, g2.uloRazitko);
  test('…prodej k datu po odeslání (−25 dní) projde jako dřív (mez z kdy)', r3.status === 200, r3);
}

console.log('===== K40-S1: mez nové zakázky a nového klonu =====');
{
  const z = nova('zámek i prodej −300');
  zamkni(z, z.varianty[0], iso(ted - 300 * DEN)); prodej(z.varianty[0], den(ted - 300 * DEN));
  const r = await uloz(z, cO);
  test('nová zakázka se zámkem −300 dní a prodejem téhož dne → 400', r.status === 400 && /nejvýš 7 dní před přijetím/.test(r.chyba || ''), r);
  const z2 = nova('zámek i prodej −300, prodej −5');
  zamkni(z2, z2.varianty[0], iso(ted - 300 * DEN)); prodej(z2.varianty[0], den(ted - 5 * DEN));
  z2.varianty[0].zamek.prijato = iso(ted - 300 * DEN);   // podvrh: posunul by mez
  const r2 = await uloz(z2, cO);
  test('zámek a prodej v jednom požadavku, prodej −5 dní (v toleranci) → 200', r2.status === 200, r2);
  const g2 = r2.status === 200 ? await nacti(r2.soubor, cO) : null;
  test('…prodej zapsán, razítko přijetí je čas serveru', g2 && g2.varianty[0].prodano && g2.varianty[0].prodano.datum === den(ted - 5 * DEN)
    && Date.parse(g2.varianty[0].zamek.prijato) > ted - 60000, g2 && g2.varianty[0]);
}
{
  /* Nový klon odeslané varianty (kopie.zamek = null) zamčený s časem −200 dní a prodaný téhož dne. */
  const z = kopie(odeslana.zak);
  const kl = zam.klonujVariantu(z, z.varianty[0].id);
  test('klon nenese zámek ani razítko (kopie.zamek = null)', kl && kl.zamek === null);
  zamkni(z, kl, iso(ted - 200 * DEN)); prodej(kl, den(ted - 200 * DEN));
  const r = await uloz(z, cO, odeslana.razitko);
  test('nový klon se zámkem −200 dní a prodejem téhož dne → 400', r.status === 400 && /nejvýš 7 dní/.test(r.chyba || ''), r);
  const z2 = kopie(odeslana.zak);
  const kl2 = zam.klonujVariantu(z2, z2.varianty[0].id);
  zamkni(z2, kl2, iso(ted - 200 * DEN));
  const r2 = await uloz(z2, cO, odeslana.razitko);
  const g2 = r2.status === 200 ? await nacti(odeslana.soubor, cO) : null;
  const gk = g2 && g2.varianty.find(x => x.id === kl2.id);
  test('klon dostane při novém zámku vlastní nové razítko', r2.status === 200 && gk && gk.zamek.prijato && gk.zamek.prijato !== odeslana.prijato
    && r2.zamkyPrijato[kl2.id] === gk.zamek.prijato, [r2.status, gk && gk.zamek]);
  odeslana.razitko = g2.uloRazitko; odeslana.zak = zk.importZakazka(kopie(g2));
}

console.log('===== Prodáno nad uloženým zámkem, výjimka =====');
{
  /* Uložený zámek s časem −60 dní, přijatý dnes → mez dnes − 7. */
  const zaklad = kopie(odeslana.zak); delete zaklad.varianty[0].zamek.prijato;   // klient, který razítko nezná
  const c = kopie(zaklad); prodej(c.varianty[0], den(ted - 30 * DEN));
  const r = await uloz(c, cO, odeslana.razitko);
  test('obchodník −30 dní (pod mezí) → 400', r.status === 400 && /vedoucí nebo administrátor/.test(r.chyba || ''), r);
  const c2 = kopie(zaklad); prodej(c2.varianty[0], den(ted - 30 * DEN), 'Podpis doložen');
  const r2 = await uloz(c2, cO, odeslana.razitko);
  test('obchodník s důvodem −30 dní → 400', r2.status === 400, r2);
  const c3 = kopie(zaklad); prodej(c3.varianty[0], den(ted - 30 * DEN));
  const r3 = await uloz(c3, cV, odeslana.razitko);
  test('vedoucí bez důvodu −30 dní → 400', r3.status === 400, r3);
  const c4 = kopie(zaklad); c4.varianty[0].zamek.prijato = iso(ted - 300 * DEN); prodej(c4.varianty[0], den(ted - 30 * DEN));
  const r4 = await uloz(c4, cO, odeslana.razitko);
  test('podvržené prijato v Prodáno mez neposune → 400', r4.status === 400, r4);
  const c5 = kopie(zaklad); prodej(c5.varianty[0], den(ted - 61 * DEN), 'Před odesláním?');
  const r5 = await uloz(c5, cV, odeslana.razitko);
  test('vedoucí s důvodem pod den odeslání → 400', r5.status === 400 && /dřív než odeslání nabídky/.test(r5.chyba || ''), r5);
  const c6 = kopie(zaklad); prodej(c6.varianty[0], den(ted - 30 * DEN), 'Smlouva podepsána\u0007 v terénu');
  const r6 = await uloz(c6, cV, odeslana.razitko);
  const g6 = r6.status === 200 ? await nacti(odeslana.soubor, cV) : null;
  test('vedoucí s důvodem −30 dní → 200', r6.status === 200, r6);
  const h = g6 && (g6.prodejHistorie || []).slice(-1)[0];
  test('…důvod výjimky v historii prodeje (bez řídicích znaků), kdo z relace', h && h.akce === 'prodano' && h.duvod === 'Smlouva podepsána  v terénu'
    && h.kdo === 'ved.k40b@priklad.cz', h);
  test('…záznam prodeje nenese pole výjimky', g6 && g6.varianty[0].prodano && !('vyjimka' in g6.varianty[0].prodano), g6 && g6.varianty[0].prodano);
}
{
  /* Prodáno od klienta bez prijato v toleranci → 200. */
  const z = nova('prodej bez prijato');
  zamkni(z, z.varianty[0], iso(ted - 2 * DEN));
  const r = await uloz(z, cO);
  const g = await nacti(r.soubor, cO);
  const c = zk.importZakazka(kopie(g)); delete c.varianty[0].zamek.prijato; prodej(c.varianty[0], den(ted - 2 * DEN));
  const r2 = await uloz(c, cO, g.uloRazitko);
  test('Prodáno od klienta, který prijato neposílá → 200', r2.status === 200, r2);
}

console.log('===== obnova: z otisku × ze souboru =====');
{
  const z = nova('obnova');
  zamkni(z, z.varianty[0], iso(ted - 20 * DEN));
  const r = await uloz(z, cO);
  const k = 'zakazky/z/' + r.soubor;
  const prijato = JSON.parse(pamet.get(k)).varianty[0].zamek.prijato;
  const soubor = (await (await get(zaloha, 'http://x/api/zaloha', cA)).json()).zaloha;
  const vyn = await (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', {}, cA)).json();
  test('příprava: záloha ke stažení i serverový otisk', soubor && soubor.zakazky && soubor.zakazky[r.soubor] && vyn.ok, vyn);
  const smaz = () => { pamet.delete(k); };
  smaz();
  const o1 = await (await post(obnova, 'http://x/api/obnova', { zdroj: { otisk: vyn.den }, rezim: 'doplnit', potvrzeni: 'OBNOVIT', casti: ['zakazky'] }, cA)).json();
  const g1 = pamet.has(k) ? JSON.parse(pamet.get(k)) : null;
  test('obnova z otisku razítko přijetí přebere', o1.ok && g1 && g1.varianty[0].zamek.prijato === prijato, [o1.ok, o1.chyba, g1 && g1.varianty[0].zamek.prijato]);
  smaz();
  const o2 = await (await post(obnova, 'http://x/api/obnova', { zdroj: { soubor }, rezim: 'doplnit', potvrzeni: 'OBNOVIT', casti: ['zakazky'] }, cA)).json();
  const g2 = pamet.has(k) ? JSON.parse(pamet.get(k)) : null;
  test('obnova ze souboru razítko přijetí zahodí (otázka 3a)', o2.ok && g2 && g2.varianty[0].zamek.zamceno && !('prijato' in g2.varianty[0].zamek), [o2.ok, o2.chyba, g2 && g2.varianty[0].zamek]);
  /* Po obnově ze souboru se zámek chová jako starší: mez z `kdy`. */
  const g = await nacti(r.soubor, cO);
  const c = zk.importZakazka(kopie(g)); prodej(c.varianty[0], den(ted - 15 * DEN));
  const r3 = await uloz(c, cO, g.uloRazitko);
  test('…prodej −15 dní (po odeslání −20) projde — mez z kdy', r3.status === 200, r3);
}

console.log('===== víc šachet (vypínač zapnutý) =====');
{
  const rv = await (await post(funkce, 'http://x/api/funkce', { viceSachet: true }, cA)).json();
  test('příprava: vypínač víc šachet zapnut', rv.ok && rv.funkce && rv.funkce.viceSachet === true, rv);
  const z = nova('víc šachet'); const ock = z.varianty[0].data.ock;
  ock.nazev = 'Výtah A';
  ock.dalsi = [{ id: 's_b1', nazev: 'Výtah B', ks: 2, zadani: Object.assign(kopie(ock.zadani), { zdvih: 12 }) }];
  zamkni(z, z.varianty[0], iso(ted - 100 * DEN));
  const r = await uloz(z, cO);
  const g = r.status === 200 ? await nacti(r.soubor, cO) : null;
  test('zámek varianty se dvěma šachtami: 200, razítko přijetí, snímek sachty beze změny', r.status === 200 && g.varianty[0].zamek.prijato
    && Array.isArray(g.varianty[0].zamek.vysledek.ock.sachty) && g.varianty[0].zamek.vysledek.ock.sachty.length === 2, [r.status, r.chyba]);
  if (g) {
    const c = zk.importZakazka(kopie(g)); delete c.varianty[0].zamek.prijato; prodej(c.varianty[0], den(ted - 100 * DEN));
    const r2 = await uloz(c, cO, g.uloRazitko);
    test('víc šachet: prodej k času zámku −100 dní → 400 (mez z přijetí)', r2.status === 400, r2);
    const c2 = zk.importZakazka(kopie(g)); prodej(c2.varianty[0], den(ted - 1 * DEN));
    const r3 = await uloz(c2, cO, g.uloRazitko);
    const g3 = r3.status === 200 ? await nacti(r.soubor, cO) : null;
    test('víc šachet: prodej v toleranci → 200, dalsi i zámek beze změny', r3.status === 200 && g3.varianty[0].data.ock.dalsi.length === 1
      && JSON.stringify(g3.varianty[0].zamek.vysledek) === JSON.stringify(g.varianty[0].zamek.vysledek), r3);
  }
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
