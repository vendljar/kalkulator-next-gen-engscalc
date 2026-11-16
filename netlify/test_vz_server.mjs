/* VZ #598 / E0 (#599) — VÍC ZÁKAZNÍKŮ NA ZAKÁZCE NA SERVERU (16. 11. 2026).
 *
 *  1) Vypínač /api/funkce `viceZakazniku`: výchozí vypnuto; POST jen
 *     administrátor (obchodník 403), neplatný tvar i prázdné tělo 400;
 *     vypínače se navzájem nepřepisují (viceSachet ↔ viceZakazniku).
 *  2) VYPNUTO: nová zakázka s `dalsiZakaznici` / `vzRidici` → 400 (VZ_VYPNUTO),
 *     bez nich 200 jako dnes.
 *  3) ZAPNUTO: platné přidání (vzPridej) 200 a uložená verze klíče nese; vadný
 *     tvar (duplicitní písmeno / id, ukazatel na neexistující variantu, 10
 *     dalších, vzRidici bez dalsiZakaznici a naopak, prázdný název, dlouhý
 *     text) → 400 a úložiště beze změny; neznámé klíče import tiše zahodí
 *     (200 bez nich); podvržené vzRidici.varianta srovná server (vzSrovnej);
 *     `platna` z prohlížeče se zahodí, platí uložená.
 *  4) ZAPNUTO: odstranění posledního dalšího (vzOdstran) 200, klíče pryč.
 *  5) VYPNUTO u zakázky, která víc zákazníků UŽ MÁ (vzor VS R21): uložení
 *     beze změny klíčů 200 (klíče zůstanou), změna názvu dalšího, smazání
 *     klíčů, přidání třetího → 400, úložiště beze změny.
 *  6) Obnova ze souboru (náhled) s VYP: zakázka s víc zákazníky ani zakázka
 *     s vadným tvarem se neobnoví; se ZAP platná ano, vadná ne.
 * Paměťové úložiště, smyšlený ceník (src/zkusebni_cenik.js), smyšlené účty
 * a firmy. Spuštění: node netlify/test_vz_server.mjs */
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
const { default: obnova } = await import(R + 'netlify/functions/obnova.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const G = globalThis;
const VZ_VYPNUTO = G.VZ_VYPNUTO;
if (typeof G.vzPridej !== 'function' || typeof VZ_VYPNUTO !== 'string') throw new Error('jádro nenese vice_zakazniku.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 400)); } };
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
const ulozeno = (soubor) => pamet.get('zakazky/z/' + soubor) || null;
const ulozenoObj = (soubor) => { const s = ulozeno(soubor); return s ? JSON.parse(s) : null; };
const zakazekVUlozisti = () => [...pamet.keys()].filter(k => k.startsWith('zakazky/z/')).length;
const maVz = z => !!z && ('dalsiZakaznici' in z || 'vzRidici' in z);

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
{ const r = await post(program, 'http://x/api/program', { cenik: Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()), cenikProj: ZC.zkusebniCenikProj(), poznamka: 'VZ' }, cA);
  if (r.status !== 200) throw new Error('program ' + r.status + ' ' + JSON.stringify(await r.json())); }
const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obch.vz@priklad.cz', jmeno: 'Obch VZ', role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
const cO = await prihlas('obch.vz@priklad.cz', 'Heslo12345x');

let n = 9940;
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++) + ' - TEST'; z.nazevAkce = 'TEST VZ ' + nazev; z.objednatel = 'TEST – TESTOVACÍ ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.ock.fixes = true;
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
const UDAJE_B = { objednatel: 'TEST – DRUHÝ ODBĚRATEL s.r.o.', adresaObjednatele: 'Zkušební 1, Testov', ico: '', dic: '', kontakt: '' };
const UDAJE_C = { objednatel: 'TEST – TŘETÍ ODBĚRATEL s.r.o.', adresaObjednatele: '', ico: '', dic: '', kontakt: '' };
/* Zakázka se dvěma zákazníky přes globální vzPridej (tvar jako z prohlížeče). */
function sVz(nazev, uprava) {
  const z = nova(nazev);
  const p = G.vzPridej(z, UDAJE_B, { kdo: 'Obch VZ', kdy: '2026-11-16T10:00:00.000Z' });
  if (!p.ok) throw new Error('vzPridej ' + JSON.stringify(p));
  if (uprava) uprava(z);
  return z;
}
const vypinac = async (telo, c) => { const r = await post(funkce, 'http://x/api/funkce', telo, c || cA); return { status: r.status, ...(await r.json()) }; };
const stavFunkci = async () => (await (await get(funkce, 'http://x/api/funkce', cO)).json()).funkce;

/* ---------- 1) vypínač ---------- */
{ const r = await (await get(funkce, 'http://x/api/funkce', cO)).json();
  test('vypínač: GET výchozí viceZakazniku === false (smí obchodník)', r.ok && r.funkce && r.funkce.viceZakazniku === false, r); }
{ const r = await vypinac({ viceZakazniku: true }, cO);
  const f = await stavFunkci();
  test('vypínač: POST { viceZakazniku: true } obchodníka → 403, stav beze změny', r.status === 403 && f.viceZakazniku === false, { r, f }); }
{ const r = await vypinac({ viceZakazniku: 'ano' });
  const f = await stavFunkci();
  test('vypínač: POST { viceZakazniku: "ano" } → 400 s textem o true/false, stav beze změny',
    r.status === 400 && /viceZakazniku musí být true nebo false/.test(r.chyba || '') && f.viceZakazniku === false, { r, f }); }
{ const r = await vypinac({});
  const f = await stavFunkci();
  test('vypínač: POST {} → 400, stav beze změny', r.status === 400 && /musí být true nebo false/.test(r.chyba || '') && f.viceZakazniku === false && f.viceSachet === false, { r, f }); }
{ const r = await vypinac({ viceZakazniku: true });
  const f = await stavFunkci();
  test('vypínač: POST { viceZakazniku: true } správce → 200, viceSachet se nezmění',
    r.status === 200 && r.funkce.viceZakazniku === true && r.funkce.viceSachet === false && r.kdo === ADMIN_EMAIL
    && f.viceZakazniku === true && f.viceSachet === false, { r, f }); }
{ const r = await vypinac({ viceSachet: true });
  const f = await stavFunkci();
  test('vypínač: POST { viceSachet: true } nezmění viceZakazniku (zůstane true)',
    r.status === 200 && r.funkce.viceSachet === true && r.funkce.viceZakazniku === true && f.viceZakazniku === true, { r, f });
  const r2 = await vypinac({ viceSachet: false, viceZakazniku: false });
  const f2 = await stavFunkci();
  test('vypínač: oba vypínače najednou vypnout (200)', r2.status === 200 && f2.viceSachet === false && f2.viceZakazniku === false, { r2, f2 }); }

/* ---------- 2) VYPNUTO, nová zakázka ---------- */
{ const pred = zakazekVUlozisti();
  const r = await uloz(sVz('nová se dvěma zákazníky, vypnuto'), cO);
  test('VYP: nová zakázka s dalsiZakaznici/vzRidici → 400 s VZ_VYPNUTO, nic se neuložilo',
    r.status === 400 && (r.chyba || '').includes(VZ_VYPNUTO) && zakazekVUlozisti() === pred, { status: r.status, chyba: r.chyba }); }
{ const z = nova('jen vzRidici, vypnuto'); z.vzRidici = { id: 'z1', pismeno: '', varianta: z.varianty[0].id };
  const pred = zakazekVUlozisti();
  const r = await uloz(z, cO);
  test('VYP: nová zakázka jen s vzRidici (bez dalsiZakaznici) → 400, nic se neuložilo',
    r.status === 400 && zakazekVUlozisti() === pred, { status: r.status, chyba: r.chyba }); }
{ const r = await uloz(nova('jeden zákazník, vypnuto'), cO);
  const u = r.soubor ? ulozenoObj(r.soubor) : null;
  test('VYP: zakázka bez víc zákazníků se uloží jako dnes (200), bez klíčů VZ', r.status === 200 && r.ok && u && !maVz(u), { status: r.status, chyba: r.chyba }); }
{ const z = nova('prázdné dalsiZakaznici, vypnuto'); z.dalsiZakaznici = [];
  const r = await uloz(z, cO);
  const u = r.soubor ? ulozenoObj(r.soubor) : null;
  test('VYP: prázdné dalsiZakaznici import smaže → 200 bez klíčů', r.status === 200 && u && !maVz(u), { status: r.status, chyba: r.chyba }); }

/* ---------- 3) ZAPNUTO ---------- */
{ const r = await vypinac({ viceZakazniku: true });
  test('vypínač: správce zapne viceZakazniku (200)', r.status === 200 && r.funkce.viceZakazniku === true, r); }
let ulozenaVZ = null;
{ const z = sVz('platné přidání');
  const r = await uloz(z, cO);
  ulozenaVZ = r.soubor;
  const u = r.soubor ? ulozenoObj(r.soubor) : null;
  const vid = z.varianty[0].id;
  test('ZAP: platné přidání druhého zákazníka (vzPridej) → 200', r.status === 200 && r.ok, { status: r.status, chyba: r.chyba });
  test('ZAP: uložená verze nese vzRidici { z1, "", řídící varianta } a jednoho dalšího (z2, B)',
    u && u.vzRidici && u.vzRidici.id === 'z1' && u.vzRidici.pismeno === '' && u.vzRidici.varianta === vid
    && Array.isArray(u.dalsiZakaznici) && u.dalsiZakaznici.length === 1 && u.dalsiZakaznici[0].id === 'z2'
    && u.dalsiZakaznici[0].pismeno === 'B' && u.dalsiZakaznici[0].varianta === vid
    && u.dalsiZakaznici[0].hlavicka.objednatel === UDAJE_B.objednatel, u && { r: u.vzRidici, d: u.dalsiZakaznici }); }

const SPATNE = [
  ['duplicitní písmeno dalších zákazníků', z => { G.vzPridej(z, UDAJE_C, { kdo: 'x' }); z.dalsiZakaznici[1].pismeno = 'B'; }],
  ['duplicitní id dalších zákazníků', z => { G.vzPridej(z, UDAJE_C, { kdo: 'x' }); z.dalsiZakaznici[1].id = 'z2'; }],
  ['10 dalších zákazníků (strop 9)', z => { for (let i = 0; i < 8; i++) G.vzPridej(z, UDAJE_C, { kdo: 'x' });
    const d = kopie(z.dalsiZakaznici[8]); d.id = 'z99'; d.pismeno = 'Y'; z.dalsiZakaznici.push(d); }, /limit/],
  ['vzRidici bez dalsiZakaznici', z => { delete z.dalsiZakaznici; }],
  ['dalsiZakaznici bez vzRidici', z => { delete z.vzRidici; }],
  ['podvržené vzRidici.id duplicitní s dalším (z2)', z => { z.vzRidici.id = 'z2'; }],
  ['podvržené vzRidici.pismeno duplicitní s dalším (B)', z => { z.vzRidici.pismeno = 'B'; }],
  ['vzRidici není objekt', z => { z.vzRidici = 'z1'; }],
  ['dalsiZakaznici není pole', z => { z.dalsiZakaznici = { a: 1 }; }],
  ['id ve špatném tvaru', z => { z.dalsiZakaznici[0].id = 'x 1'; }],
  ['písmeno A (vyhrazené řídícímu bez písmena)', z => { z.dalsiZakaznici[0].pismeno = 'A'; }],
  ['prázdný název dalšího zákazníka', z => { z.dalsiZakaznici[0].hlavicka.objednatel = '   '; }],
  ['text hlavičky 501 znaků', z => { z.dalsiZakaznici[0].hlavicka.adresaObjednatele = 'x'.repeat(501); }],
  ['hodnota hlavičky není text', z => { z.dalsiZakaznici[0].hlavicka.ico = { a: 1 }; }],
  ['platna není objekt', z => { z.dalsiZakaznici[0].platna = 'ano'; }],
];
/* N2 (revize Fable): ukazatel na neexistující (smazanou) variantu import
 * přesměruje na řídící — zákazník se nezahodí, uloží se 200. */
for (const [jm, fn] of [['ukazatel dalšího na neexistující variantu', z => { z.dalsiZakaznici[0].varianta = 'neexistuje'; }],
                        ['vzRidici.varianta na neexistující variantu', z => { z.vzRidici.varianta = 'neexistuje'; }]]) {
  const z = sVz('N2: ' + jm, fn);
  const r = await uloz(z, cO);
  const u = r.soubor ? ulozenoObj(r.soubor) : null;
  const rid = u && (u.varianty.find(v => v.ridici) || u.varianty[0]).id;
  test('ZAP N2: ' + jm + ' → 200, zákazník zůstal a ukazuje na řídící',
    r.status === 200 && u && u.dalsiZakaznici && u.dalsiZakaznici.length === 1 && u.dalsiZakaznici[0].varianta === rid && u.vzRidici.varianta === rid,
    { status: r.status, chyba: r.chyba, d: u && u.dalsiZakaznici });
}
/* N9 + D1 (revize Fable): mezi zákazníky první verze je právě jeden { z1, '' }. */
{ const z = sVz('D1: přidat a vyměnit v jednom uložení', zz => { const r = G.vzVymenRidiciho(zz, 'z2'); if (!r.ok) throw new Error(r.chyba); });
  const r = await uloz(z, cO);
  const u = r.soubor ? ulozenoObj(r.soubor) : null;
  test('ZAP D1: přidat zákazníka a v témž uložení ho udělat řídícím → 200',
    r.status === 200 && u && u.vzRidici.id === 'z2' && u.dalsiZakaznici[0].id === 'z1' && u.dalsiZakaznici[0].pismeno === '',
    { status: r.status, chyba: r.chyba, r: u && u.vzRidici }); }
for (const [jm, fn] of [['první vzRidici s jiným id (z5)', z => { z.vzRidici.id = 'z5'; }],
                        ['první vzRidici s písmenem (C)', z => { z.vzRidici.pismeno = 'C'; }],
                        ['podvržený stav po výměně bez z1', z => { G.vzVymenRidiciho(z, 'z2'); z.dalsiZakaznici[0].id = 'z7'; }]]) {
  const z = sVz('N9: ' + jm, fn);
  const pred = zakazekVUlozisti();
  const r = await uloz(z, cO);
  test('ZAP N9: ' + jm + ' → 400, úložiště beze změny', r.status === 400 && /řídící zákazník z1/.test(r.chyba || '') && zakazekVUlozisti() === pred,
    { status: r.status, chyba: r.chyba });
}
for (const [jm, fn, re] of SPATNE) {
  const z = sVz('špatně: ' + jm, fn);
  const pred = zakazekVUlozisti();
  const r = await uloz(z, cO);
  test('ZAP: ' + jm + ' → 400, úložiště beze změny',
    r.status === 400 && /víc zákazníků/.test(r.chyba || '') && (!re || re.test(r.chyba || '')) && zakazekVUlozisti() === pred,
    { status: r.status, chyba: r.chyba });
}
{ const z = sVz('neznámé klíče', zz => { zz.vzRidici.navic = 1; zz.dalsiZakaznici[0].cena = 5;
    zz.dalsiZakaznici[0].hlavicka.tajne = 'x'; zz.dalsiZakaznici[0].zastupci.cizi = 'y'; });
  const r = await uloz(z, cO);
  const u = r.soubor ? ulozenoObj(r.soubor) : null;
  test('ZAP: neznámé klíče (vzRidici, další, hlavička, zástupci) import tiše zahodí → 200',
    r.status === 200 && r.ok, { status: r.status, chyba: r.chyba });
  test('ZAP: uložená verze neznámé klíče nenese, zbytek tvaru zůstal',
    u && u.vzRidici && !('navic' in u.vzRidici) && u.dalsiZakaznici.length === 1 && !('cena' in u.dalsiZakaznici[0])
    && !('tajne' in u.dalsiZakaznici[0].hlavicka) && !('cizi' in u.dalsiZakaznici[0].zastupci)
    && u.dalsiZakaznici[0].hlavicka.objednatel === UDAJE_B.objednatel, u && { r: u.vzRidici, d: u.dalsiZakaznici }); }
{ const z = nova('podvržená řídící varianta');
  const klon = G.klonujVariantu(z, z.varianty[0].id, { aktivovat: false });
  G.vzPridej(z, UDAJE_B, { kdo: 'Obch VZ' });
  const ridiciId = (z.varianty.find(v => v.ridici) || z.varianty[0]).id;
  z.vzRidici.varianta = klon.id;    // existuje, ale řídící není
  const r = await uloz(z, cO);
  const u = r.soubor ? ulozenoObj(r.soubor) : null;
  test('ZAP: podvržené vzRidici.varianta na jinou existující variantu → 200 (neodmítá se)', r.status === 200 && klon.id !== ridiciId, { status: r.status, chyba: r.chyba });
  test('ZAP: server invariant srovná — uložená vzRidici.varianta = id varianty s ridici:true',
    u && u.vzRidici && u.vzRidici.varianta === ridiciId && u.varianty.find(v => v.ridici).id === ridiciId, u && { r: u.vzRidici, ridiciId, klon: klon.id }); }
{ const z = sVz('platna z prohlížeče u nové', zz => { zz.dalsiZakaznici[0].platna = { varianta: zz.varianty[0].id, cislo: 'PODVRH', kdy: '2026-11-16', cena: 1, mena: 'CZK' }; });
  const r = await uloz(z, cO);
  const u = r.soubor ? ulozenoObj(r.soubor) : null;
  test('ZAP: platna poslaná z prohlížeče u nové zakázky se zahodí (uloženo 200 bez platna)',
    r.status === 200 && u && u.dalsiZakaznici && !('platna' in u.dalsiZakaznici[0]), { status: r.status, chyba: r.chyba, d: u && u.dalsiZakaznici }); }
{ /* Uložená platna (jako by ji spočítal server v E3) — dosadit ručně do úložiště. */
  const u0 = ulozenoObj(ulozenaVZ);
  const PLATNA = { varianta: u0.varianty[0].id, cislo: 'SERVER-PLATNA', kdy: '2026-11-15T08:00:00.000Z', cena: 1, mena: 'CZK' };
  u0.dalsiZakaznici[0].platna = PLATNA;
  pamet.set('zakazky/z/' + ulozenaVZ, JSON.stringify(u0));
  const g = await nacti(ulozenaVZ, cO);
  const a = zk.importZakazka(kopie(g));
  a.dalsiZakaznici[0].platna = { varianta: a.varianty[0].id, cislo: 'PODVRH', kdy: '2026-11-16', cena: 2, mena: 'EUR' };
  const r = await uloz(a, cO, g.uloRazitko);
  const u = ulozenoObj(ulozenaVZ);
  test('ZAP: podvržená platna u uložené zakázky → 200 a uložená platna zůstane (klient ji nepřepíše)',
    r.status === 200 && u.dalsiZakaznici[0].platna && JSON.stringify(u.dalsiZakaznici[0].platna) === JSON.stringify(PLATNA),
    { status: r.status, chyba: r.chyba, platna: u.dalsiZakaznici[0].platna });
  const g2 = await nacti(ulozenaVZ, cO);
  const b = zk.importZakazka(kopie(g2)); delete b.dalsiZakaznici[0].platna;
  const r2 = await uloz(b, cO, g2.uloRazitko);
  const u2 = ulozenoObj(ulozenaVZ);
  test('ZAP: platna vynechaná klientem → 200 a uložená platna zůstane',
    r2.status === 200 && JSON.stringify(u2.dalsiZakaznici[0].platna) === JSON.stringify(PLATNA), { status: r2.status, chyba: r2.chyba, platna: u2.dalsiZakaznici[0].platna }); }

/* ---------- 4) ZAPNUTO: odstranění posledního dalšího ---------- */
{ const r0 = await uloz(sVz('odstranění posledního'), cO);
  const g = await nacti(r0.soubor, cO);
  const a = zk.importZakazka(kopie(g));
  const o = G.vzOdstran(a, 'z2');
  const r = await uloz(a, cO, g.uloRazitko);
  const u = ulozenoObj(r0.soubor);
  test('ZAP: odstranění posledního dalšího zákazníka (vzOdstran) → 200 a uložená zakázka je bez klíčů VZ',
    r0.status === 200 && o.ok && !maVz(a) && r.status === 200 && u && !maVz(u), { r0: r0.status, o, status: r.status, chyba: r.chyba }); }

/* D4: zakázka s vlastní variantou dalšího zákazníka (uloží se se ZAP, smaže se s VYP v oddílu 5). */
const rVlastni = await uloz(sVz('D4 vlastní varianta', z => { const r = G.vzPridej(z, UDAJE_C, { kdo: 'x', vlastni: true }); if (!r.ok) throw new Error(r.chyba); }), cO);
test('ZAP D4: příprava — zakázka s vlastní variantou zákazníka C uložena (200)', rVlastni.status === 200, { status: rVlastni.status, chyba: rVlastni.chyba });

/* ---------- 5) VYPNUTO u zakázky, která víc zákazníků UŽ MÁ ---------- */
{ const r = await vypinac({ viceZakazniku: false });
  test('vypínač: správce vypne viceZakazniku (200)', r.status === 200 && r.funkce.viceZakazniku === false, r); }
{ let g = await nacti(ulozenaVZ, cO);
  const podpisPred = G.vzPodpis(ulozenoObj(ulozenaVZ));
  const a = zk.importZakazka(kopie(g)); a.kontakt = 'jen poznámka mimo zákazníky';
  const r = await uloz(a, cO, g.uloRazitko);
  const u = ulozenoObj(ulozenaVZ);
  test('VYP: uložená zakázka s víc zákazníky — jiná změna, klíče beze změny → 200', r.status === 200 && r.ok, { status: r.status, chyba: r.chyba });
  test('VYP: klíče VZ v uložené verzi zůstaly beze změny (i platna)', u && maVz(u) && G.vzPodpis(u) === podpisPred
    && u.kontakt === 'jen poznámka mimo zákazníky' && u.dalsiZakaznici[0].platna && u.dalsiZakaznici[0].platna.cislo === 'SERVER-PLATNA', u && u.dalsiZakaznici);
  g = await nacti(ulozenaVZ, cO);
  const c = zk.importZakazka(kopie(g)); c.dalsiZakaznici[0].platna = { varianta: c.varianty[0].id, cislo: 'PODVRH', kdy: '', cena: 3, mena: 'CZK' };
  const rc = await uloz(c, cO, g.uloRazitko);
  const uc = ulozenoObj(ulozenaVZ);
  test('VYP: změna jen platna z prohlížeče se neposuzuje jako změna (200) a uložená platna zůstane',
    rc.status === 200 && uc.dalsiZakaznici[0].platna.cislo === 'SERVER-PLATNA', { status: rc.status, chyba: rc.chyba, p: uc.dalsiZakaznici[0].platna });
  g = await nacti(ulozenaVZ, cO);
  const pred = ulozeno(ulozenaVZ);
  const zmeny = [
    ['změna názvu dalšího zákazníka', z => { z.dalsiZakaznici[0].hlavicka.objednatel = 'TEST – PŘEJMENOVANÝ s.r.o.'; }],
    ['odstranění dalšího zákazníka (smazání klíčů)', z => { delete z.dalsiZakaznici; delete z.vzRidici; }],
    ['odstranění přes vzOdstran', z => { G.vzOdstran(z, 'z2'); }],
    ['přidání třetího zákazníka', z => { G.vzPridej(z, UDAJE_C, { kdo: 'Obch VZ' }); }],
    ['změna písmena dalšího zákazníka', z => { z.dalsiZakaznici[0].pismeno = 'C'; }],
    ['výměna řídícího zákazníka', z => { G.vzVymenRidiciho(z, 'z2'); }],
  ];
  for (const [jm, fn] of zmeny) {
    const b = zk.importZakazka(kopie(g)); fn(b);
    const rr = await uloz(b, cO, g.uloRazitko);
    test('VYP: ' + jm + ' → 400 s VZ_VYPNUTO, úložiště beze změny',
      rr.status === 400 && (rr.chyba || '').includes(VZ_VYPNUTO) && ulozeno(ulozenaVZ) === pred, { status: rr.status, chyba: rr.chyba });
  }
  /* D4 (dorevize Fable): smazání varianty, na kterou ukazuje další zákazník, s VYP — lidská hláška. */
  { const gv = await nacti(rVlastni.soubor, cO);
    const b = zk.importZakazka(kopie(gv));
    const vid = b.dalsiZakaznici[1].varianta;
    b.varianty = b.varianty.filter(v => v.id !== vid);
    const predV = ulozeno(rVlastni.soubor);
    const rr = await uloz(b, cO, gv.uloRazitko);
    test('VYP D4: smazaná varianta, na kterou ukazuje další zákazník → 400 „Variantu nejde smazat…“, úložiště beze změny',
      rr.status === 400 && (rr.chyba || '').includes(G.VZ_VYPNUTO_VARIANTA) && ulozeno(rVlastni.soubor) === predV, { status: rr.status, chyba: rr.chyba }); }
  const r4 = await uloz(sVz('nová po vypnutí'), cO);
  test('VYP: novou zakázku s víc zákazníky po vypnutí nejde založit (400)', r4.status === 400 && (r4.chyba || '').includes(VZ_VYPNUTO), { status: r4.status, chyba: r4.chyba }); }

/* ---------- 6) obnova ze souboru (náhled — nic se nezapíše) ---------- */
{ const platna = kopie(sVz('obnova platná'));
  const vadna = kopie(sVz('obnova vadná', z => { G.vzPridej(z, UDAJE_C, { kdo: 'x' }); z.dalsiZakaznici[1].pismeno = 'B'; }));
  const zaloha = { porizena: '2026-11-16T10:00:00.000Z', zakazky: { 'TEST-VZ-OBNOVA-PLATNA.json': platna, 'TEST-VZ-OBNOVA-VADNA.json': vadna } };
  const obnov = async () => { const r = await post(obnova, 'http://x/api/obnova', { zdroj: { soubor: zaloha }, rezim: 'doplnit', nahled: true, casti: ['zakazky'] }, cA);
    return { status: r.status, ...(await r.json()) }; };
  const duvod = (o, k) => ((o.casti && o.casti.zakazky && o.casti.zakazky.duvody) || []).find(d => d.klic === 'z/' + k);
  const pred = zakazekVUlozisti();
  const o = await obnov();
  const dP = duvod(o, 'TEST-VZ-OBNOVA-PLATNA.json'), dV = duvod(o, 'TEST-VZ-OBNOVA-VADNA.json');
  test('obnova VYP: zakázka s víc zákazníky se neobnoví (důvod VZ_VYPNUTO)',
    o.status === 200 && dP && dP.duvod.includes(VZ_VYPNUTO), { status: o.status, z: o.casti && o.casti.zakazky, chyba: o.chyba });
  test('obnova VYP: zakázka s vadným tvarem VZ se neobnoví (důvod: neplatný údaj víc zákazníků)',
    o.status === 200 && dV && /víc zákazníků/.test(dV.duvod) && o.casti.zakazky.nove === 0 && zakazekVUlozisti() === pred,
    { z: o.casti && o.casti.zakazky });
  await vypinac({ viceZakazniku: true });
  const o2 = await obnov();
  const dP2 = duvod(o2, 'TEST-VZ-OBNOVA-PLATNA.json'), dV2 = duvod(o2, 'TEST-VZ-OBNOVA-VADNA.json');
  test('obnova ZAP: platná zakázka s víc zákazníky by se obnovila, vadná ne',
    o2.status === 200 && !dP2 && dV2 && /víc zákazníků/.test(dV2.duvod) && o2.casti.zakazky.nove === 1 && zakazekVUlozisti() === pred,
    { z: o2.casti && o2.casti.zakazky });
  await vypinac({ viceZakazniku: false }); }

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
