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
 *     `platna` z prohlížeče se zahodí; od E3 ji server počítá ze zámků (N6).
 *  4) ZAPNUTO: odstranění posledního dalšího (vzOdstran) 200, klíče pryč.
 *  5) VYPNUTO u zakázky, která víc zákazníků UŽ MÁ (vzor VS R21): uložení
 *     beze změny klíčů 200 (klíče zůstanou), změna názvu dalšího, smazání
 *     klíčů, přidání třetího → 400, úložiště beze změny.
 *  6) Obnova ze souboru (náhled) s VYP: zakázka s víc zákazníky ani zakázka
 *     s vadným tvarem se neobnoví; se ZAP platná ano, vadná ne.
 *  7) E3 (#602, ZAP): razítko „komu" skládá server (podvržený snímek se
 *     nepřijme, přepsané uložené razítko se vrátí, tisk pro neexistujícího
 *     zákazníka / cizí variantu 400, jeden zákazník bez klíče); N6 platna
 *     …-B; odstranění zákazníka s odeslanou nabídkou: obchodník 403, autor
 *     403, administrátor 200 a razítka zůstala; smazání zamčené varianty
 *     odstraněného zákazníka 409; N9 písmeno 400, nové id / písmeno z razítka
 *     400; N4 zalozen ze serveru; zmrazené údaje B 409 (kontakt projde);
 *     název akce u víc zákazníků po tisku neřídící varianty 409.
 *  8) E4 (#603, ZAP): D1 přidat + vyměnit řídícího u uložené zakázky (autor 200,
 *     jiný 403); kdo smí měnit řídícího (autor, administrátor; webhook jen
 *     administrátor); prodej zákazníkovi bez odeslané nabídky / podvržené
 *     prodano.zakaznik / neexistující 409/400; server vymění řídícího sám;
 *     po prodeji výměna 409 a prodano.zakaznik z uložené verze; vzProdej
 *     vlastní varianty; návrat k jednomu zákazníkovi ≠ z1 s odeslanou 409.
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
const { JEKLY } = await jadro();
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
  /* E3 (N6): platna počítá server ze zámků — bez odeslané nabídky žádná (ani podvržená, ani dosazená do úložiště). */
  test('ZAP: podvržená platna u uložené zakázky → 200 a platna = výpočet ze zámků (nic neodešlo → žádná)',
    r.status === 200 && !('platna' in u.dalsiZakaznici[0]),
    { status: r.status, chyba: r.chyba, platna: u.dalsiZakaznici[0].platna });
  const g2 = await nacti(ulozenaVZ, cO);
  const b = zk.importZakazka(kopie(g2)); delete b.dalsiZakaznici[0].platna;
  const r2 = await uloz(b, cO, g2.uloRazitko);
  const u2 = ulozenoObj(ulozenaVZ);
  test('ZAP: platna vynechaná klientem → 200 a platna = výpočet ze zámků (žádná)',
    r2.status === 200 && !('platna' in u2.dalsiZakaznici[0]) && PLATNA.cislo === 'SERVER-PLATNA', { status: r2.status, chyba: r2.chyba, platna: u2.dalsiZakaznici[0].platna }); }

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
    && u.kontakt === 'jen poznámka mimo zákazníky' && !('platna' in u.dalsiZakaznici[0]), u && u.dalsiZakaznici);
  g = await nacti(ulozenaVZ, cO);
  const c = zk.importZakazka(kopie(g)); c.dalsiZakaznici[0].platna = { varianta: c.varianty[0].id, cislo: 'PODVRH', kdy: '', cena: 3, mena: 'CZK' };
  const rc = await uloz(c, cO, g.uloRazitko);
  const uc = ulozenoObj(ulozenaVZ);
  test('VYP: změna jen platna z prohlížeče se neposuzuje jako změna (200) a platna = výpočet ze zámků (žádná)',
    rc.status === 200 && !('platna' in uc.dalsiZakaznici[0]), { status: rc.status, chyba: rc.chyba, p: uc.dalsiZakaznici[0].platna });
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

/* ---------- 7) E3 (#602): zámek po zákaznících ---------- */
await vypinac({ viceZakazniku: true });
{ const x2 = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obch2.vz@priklad.cz', jmeno: 'Obch VZ Dva', role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
  if (!x2.ok) throw new Error('uzivatel 2 ' + JSON.stringify(x2)); }
const cO2 = await prihlas('obch2.vz@priklad.cz', 'Heslo12345x');
/* Tisk jako zamekPoTisku: zamek.cislo = číslo varianty bez písmene, výsledek
 * a snímek z dat (projde přísným ověřením zámku), razítko z prohlížeče —
 * server z něj bere jen id. */
const zamkni = (z, v, komu) => G.zamkniVariantu(v, Object.assign({ typ: 'nabidkaTisk', kdy: new Date().toISOString(), kdo: 'Test VZ E3',
  cislo: G.variantaCislo(z, v), vysledek: G.zamekVysledekSpocti(v, JEKLY, 'vz-e3'), snimek: G.zamekSnimekSpocti(v) }, komu ? { zakaznik: komu } : {}));
const tisky = (u, varId) => ((u.varianty.find(v => v.id === varId) || {}).zamek || {}).tisky || [];
/* Uložená zakázka (B sdílí V1, C má vlastní V2), V1 vytištěná pro B. Vrací { soubor, g (načtená), a (import k úpravě) }. */
async function sOdeslanouB(nazev, cookie, uprava) {
  const z = sVz('E3 ' + nazev, zz => { const r = G.vzPridej(zz, UDAJE_C, { kdo: 'x', vlastni: true }); if (!r.ok) throw new Error(r.chyba); });
  zamkni(z, z.varianty[0], { id: 'z2' });
  if (uprava) uprava(z);
  const r = await uloz(z, cookie || cO);
  if (r.status !== 200) throw new Error('příprava E3 ' + nazev + ' ' + r.status + ' ' + r.chyba);
  const g = await nacti(r.soubor, cO);
  return { soubor: r.soubor, g, a: zk.importZakazka(kopie(g)), cislo: G.variantaCislo(z, z.varianty[0]) };
}
const opakuj = async (o, fn, cookie) => { const a = zk.importZakazka(kopie(o.g)); fn(a); return uloz(a, cookie || cO, o.g.uloRazitko); };

/* razítko ze serveru + N6 platna */
let zakB = null;
{ zakB = await sOdeslanouB('razítko a platna', cO, z => { z.varianty[0].zamek.tisky[0].zakaznik = { id: 'z2', pismeno: 'Q', cislo: 'PODVRH-CISLO',
    objednatel: 'PODVRŽENÝ ODBĚRATEL', ico: '12345679', navic: 'x' }; });
  const u = ulozenoObj(zakB.soubor);
  const rz = tisky(u, u.varianty[0].id)[0].zakaznik;
  test('E3 podvržený snímek razítka (název, číslo, písmeno, IČO, klíč navíc) → server uloží snímek z dat zákazníka B',
    rz && rz.id === 'z2' && rz.pismeno === 'B' && rz.objednatel === UDAJE_B.objednatel && rz.ico === '' && rz.cislo === zakB.cislo + '-B'
    && JSON.stringify(Object.keys(rz)) === JSON.stringify(G.VZ_RAZITKO_KLICE), rz);
  test('E3 zamek.cislo zůstává číslo varianty bez písmene', u.varianty[0].zamek.cislo === zakB.cislo, u.varianty[0].zamek.cislo);
  test('E3 N6: platna B po tisku = { V1, …-B, cena z výsledku zámku }', u.dalsiZakaznici[0].platna && u.dalsiZakaznici[0].platna.cislo === zakB.cislo + '-B'
    && u.dalsiZakaznici[0].platna.varianta === u.varianty[0].id && typeof u.dalsiZakaznici[0].platna.cena === 'number' && u.dalsiZakaznici[0].platna.cena > 0,
    u.dalsiZakaznici[0].platna);
  test('E3 N6: C (nic neodešlo) platna nemá', !('platna' in u.dalsiZakaznici[1])); }
{ const r = await opakuj(zakB, a => { const t = a.varianty[0].zamek.tisky[0]; t.zakaznik.objednatel = 'PŘEPSANÝ ODBĚRATEL'; t.zakaznik.cislo = 'PŘEPSÁNO'; });
  const u = ulozenoObj(zakB.soubor);
  const rz = tisky(u, u.varianty[0].id)[0].zakaznik;
  test('E3 přepsané uložené razítko → 200 a server vrátí uložené (uloZamekRazitkaDrz)',
    r.status === 200 && rz.objednatel === UDAJE_B.objednatel && rz.cislo === zakB.cislo + '-B', { status: r.status, chyba: r.chyba, rz }); }
{ const g = await nacti(zakB.soubor, cO);
  const a = zk.importZakazka(kopie(g)); a.varianty[0].zamek.tisky[0].zakaznik = { id: 'z3', pismeno: 'C', cislo: 'x', objednatel: 'x', ico: '' };
  const r = await uloz(a, cO, g.uloRazitko);
  const rz = tisky(ulozenoObj(zakB.soubor), a.varianty[0].id)[0].zakaznik;
  test('E3 přepsané id v uloženém razítku (B → C) → server vrátí B', r.status === 200 && rz.id === 'z2', { status: r.status, rz }); }
{ const g = await nacti(zakB.soubor, cO);
  const pred = ulozeno(zakB.soubor);
  const a = zk.importZakazka(kopie(g)); zamkni(a, a.varianty[0], { id: 'z9' });
  const r = await uloz(a, cO, g.uloRazitko);
  test('E3 nový tisk pro neexistujícího zákazníka (z9) → 400, úložiště beze změny',
    r.status === 400 && /který v zakázce není/.test(r.chyba || '') && ulozeno(zakB.soubor) === pred, { status: r.status, chyba: r.chyba }); }
{ const g = await nacti(zakB.soubor, cO);
  const pred = ulozeno(zakB.soubor);
  const a = zk.importZakazka(kopie(g)); zamkni(a, a.varianty[0], { id: 'z3' });
  const r = await uloz(a, cO, g.uloRazitko);
  test('E3 nový tisk sdílené V1 pro C (jeho varianta je V2) → 400, úložiště beze změny',
    r.status === 400 && /není nabídka zákazníka/.test(r.chyba || '') && ulozeno(zakB.soubor) === pred, { status: r.status, chyba: r.chyba }); }
{ const g = await nacti(zakB.soubor, cO);
  const a = zk.importZakazka(kopie(g)); zamkni(a, a.varianty[0], { id: 'z1' });
  const r = await uloz(a, cO, g.uloRazitko);
  const t = tisky(ulozenoObj(zakB.soubor), a.varianty[0].id);
  test('E3 dotisk V1 řídícímu → 200, razítko A bez písmene, B zůstalo',
    r.status === 200 && t.length === 2 && t[0].zakaznik.id === 'z2' && t[1].zakaznik.id === 'z1' && t[1].zakaznik.pismeno === ''
    && t[1].zakaznik.objednatel === ulozenoObj(zakB.soubor).objednatel, { status: r.status, chyba: r.chyba, t: t.map(x => x.zakaznik) }); }
{ const z = nova('E3 jeden zákazník');
  zamkni(z, z.varianty[0], { id: 'z1', objednatel: 'PODVRH' });
  const r = await uloz(z, cO);
  const u = r.soubor ? ulozenoObj(r.soubor) : null;
  test('E3 jeden zákazník: klíč zakaznik v záznamu tisku zmizí (200)',
    r.status === 200 && u && !maVz(u) && !('zakaznik' in tisky(u, u.varianty[0].id)[0]), { status: r.status, chyba: r.chyba }); }

/* zmrazení údajů B po odeslání */
for (const [jm, fn] of [['název', a => { a.dalsiZakaznici[0].hlavicka.objednatel = 'TEST – JINÝ NÁZEV s.r.o.'; }],
                        ['sídlo', a => { a.dalsiZakaznici[0].hlavicka.adresaObjednatele = 'Jinde 9'; }],
                        ['IČO', a => { a.dalsiZakaznici[0].hlavicka.ico = '11112222'; }]]) {
  const g = await nacti(zakB.soubor, cO);
  const pred = ulozeno(zakB.soubor);
  const r = await opakuj({ g }, fn);
  test('E3 zmrazení: ' + jm + ' B po odeslané nabídce → 409, úložiště beze změny',
    r.status === 409 && /už odešla nabídka/.test(r.chyba || '') && ulozeno(zakB.soubor) === pred, { status: r.status, chyba: r.chyba });
}
{ const g = await nacti(zakB.soubor, cO);
  const r = await opakuj({ g }, a => { a.dalsiZakaznici[0].hlavicka.kontakt = 'Nová kontaktní osoba'; a.dalsiZakaznici[1].hlavicka.objednatel = 'TEST – TŘETÍ PŘEJMENOVANÝ s.r.o.'; });
  const u = ulozenoObj(zakB.soubor);
  test('E3 zmrazení: kontakt B a název C (nic mu neodešlo) se změnit smí → 200',
    r.status === 200 && u.dalsiZakaznici[0].hlavicka.kontakt === 'Nová kontaktní osoba' && u.dalsiZakaznici[1].hlavicka.objednatel === 'TEST – TŘETÍ PŘEJMENOVANÝ s.r.o.',
    { status: r.status, chyba: r.chyba }); }

/* N9 písmeno */
{ const g = await nacti(zakB.soubor, cO);
  const pred = ulozeno(zakB.soubor);
  const r = await opakuj({ g }, a => { a.dalsiZakaznici[0].pismeno = 'D'; });
  test('E3 N9: změna písmene existujícího zákazníka (B → D) → 400, úložiště beze změny',
    r.status === 400 && /písmeno zákazníka/.test(r.chyba || '') && ulozeno(zakB.soubor) === pred, { status: r.status, chyba: r.chyba }); }

/* N4 zalozen */
{ const z = sVz('E3 N4 zalozen', zz => { zz.dalsiZakaznici[0].zalozen = { kdo: 'podvrh@priklad.cz', kdy: '2001-01-01T00:00:00.000Z' }; });
  const t0 = Date.now();
  const r = await uloz(z, cO);
  const u = ulozenoObj(r.soubor);
  const zal = u && u.dalsiZakaznici[0].zalozen;
  test('E3 N4: nový zákazník — zalozen ze serveru (e-mail relace, čas serveru), podvržené kdo/kdy se nepřijme',
    r.status === 200 && zal && zal.kdo === 'obch.vz@priklad.cz' && Date.parse(zal.kdy) >= t0 - 1000 && Date.parse(zal.kdy) <= Date.now() + 1000, zal);
  const g = await nacti(r.soubor, cO);
  const r2 = await opakuj({ g }, a => { a.dalsiZakaznici[0].zalozen = { kdo: 'jiny@priklad.cz', kdy: '2002-02-02T00:00:00.000Z' };
    const p = G.vzPridej(a, UDAJE_C, { kdo: 'podvrh@priklad.cz', kdy: '2003-03-03T00:00:00.000Z' }); if (!p.ok) throw new Error(p.chyba); }, cA);
  const u2 = ulozenoObj(r.soubor);
  test('E3 N4: existující zákazník drží uložené zalozen, nový (přidaný správcem) dostane jeho relaci',
    r2.status === 200 && JSON.stringify(u2.dalsiZakaznici[0].zalozen) === JSON.stringify(zal)
    && u2.dalsiZakaznici[1].zalozen.kdo === ADMIN_EMAIL && u2.dalsiZakaznici[1].zalozen.kdy !== '2003-03-03T00:00:00.000Z',
    { status: r2.status, chyba: r2.chyba, d: u2.dalsiZakaznici.map(d => d.zalozen) }); }

/* název akce u víc zákazníků po tisku NEŘÍDÍCÍ varianty */
{ const z = sVz('E3 název akce', zz => { const r = G.vzPridej(zz, UDAJE_C, { kdo: 'x', vlastni: true }); if (!r.ok) throw new Error(r.chyba); });
  const r0 = await uloz(z, cO);
  let g = await nacti(r0.soubor, cO);
  const a = zk.importZakazka(kopie(g));
  const v2 = a.varianty.find(v => v.id === a.dalsiZakaznici[1].varianta);
  zamkni(a, v2, { id: 'z3' });
  const r1 = await uloz(a, cO, g.uloRazitko);
  const u1 = ulozenoObj(r0.soubor);
  test('E3 příprava: tisk vlastní (neřídící) V2 pro C → 200, razítko C …-C',
    r0.status === 200 && r1.status === 200 && tisky(u1, v2.id)[0].zakaznik.id === 'z3' && /-C$/.test(tisky(u1, v2.id)[0].zakaznik.cislo),
    { r0: r0.status, status: r1.status, chyba: r1.chyba });
  g = await nacti(r0.soubor, cO);
  const pred = ulozeno(r0.soubor);
  const r2 = await opakuj({ g }, b => { b.nazevAkce = 'TEST VZ JINÝ NÁZEV AKCE'; });
  test('E3 víc zákazníků: změna názvu akce po prvním tisku (neřídící varianta) → 409, úložiště beze změny',
    r2.status === 409 && /nazevAkce/.test(r2.chyba || '') && ulozeno(r0.soubor) === pred, { status: r2.status, chyba: r2.chyba });
  const r3 = await opakuj({ g }, b => { b.adresa = 'Jiná stavba 5'; });
  test('E3 víc zákazníků: změna adresy stavby po prvním tisku → 409', r3.status === 409 && /adresa/.test(r3.chyba || ''), { status: r3.status, chyba: r3.chyba }); }

/* odstranění zákazníka s odeslanou nabídkou: obchodník 403, autor 403, administrátor 200 */
{ const o = await sOdeslanouB('odstranění', cO);
  const pred = ulozeno(o.soubor);
  const rAutor = await opakuj(o, a => { const x = G.vzOdstran(a, 'z2'); if (!x.ok) throw new Error(x.chyba); });
  test('E3 odstranění B s odeslanou nabídkou: autor zakázky (obchodník) → 403, úložiště beze změny',
    rAutor.status === 403 && /jen administrátor/.test(rAutor.chyba || '') && ulozeno(o.soubor) === pred, { status: rAutor.status, chyba: rAutor.chyba });
  const rObch = await opakuj(o, a => { G.vzOdstran(a, 'z2'); }, cO2);
  test('E3 odstranění B s odeslanou nabídkou: jiný obchodník → 403, úložiště beze změny',
    rObch.status === 403 && ulozeno(o.soubor) === pred, { status: rObch.status, chyba: rObch.chyba });
  const rC = await opakuj(o, a => { G.vzOdstran(a, 'z3'); });
  test('E3 odstranění C bez odeslané nabídky: obchodník smí (200)', rC.status === 200 && ulozenoObj(o.soubor).dalsiZakaznici.length === 1,
    { status: rC.status, chyba: rC.chyba });
  const g = await nacti(o.soubor, cO);
  const rAdm = await opakuj({ g }, a => { G.vzOdstran(a, 'z2'); }, cA);
  const u = ulozenoObj(o.soubor);
  const t = tisky(u, u.varianty[0].id);
  test('E3 odstranění B s odeslanou nabídkou: administrátor → 200, zákazník pryč, razítko B v zámku zůstalo',
    rAdm.status === 200 && !maVz(u) && t.length === 1 && t[0].zakaznik && t[0].zakaznik.id === 'z2' && t[0].zakaznik.objednatel === UDAJE_B.objednatel,
    { status: rAdm.status, chyba: rAdm.chyba, t: t.map(x => x.zakaznik) });
  /* N9: nový zákazník nesmí převzít id ani písmeno z razítka. */
  const g2 = await nacti(o.soubor, cO);
  const pred2 = ulozeno(o.soubor);
  for (const [jm, fn, re] of [['id z2 z razítka', a => { G.vzPridej(a, UDAJE_C, { kdo: 'x' }); a.dalsiZakaznici[0].id = 'z2'; a.dalsiZakaznici[0].pismeno = 'C'; }, /nese id z2/],
                              ['písmeno B z razítka', a => { G.vzPridej(a, UDAJE_C, { kdo: 'x' }); a.dalsiZakaznici[0].pismeno = 'B'; }, /písmeno B/]]) {
    const r = await opakuj({ g: g2 }, fn);
    test('E3 N9: nový zákazník převezme ' + jm + ' → 400, úložiště beze změny',
      r.status === 400 && re.test(r.chyba || '') && ulozeno(o.soubor) === pred2, { status: r.status, chyba: r.chyba });
  }
  const rN = await opakuj({ g: g2 }, a => { const p = G.vzPridej(a, UDAJE_C, { kdo: 'x' });
    if (!p.ok || p.zakaznik.id !== 'z3' || p.zakaznik.pismeno !== 'C') throw new Error('vzPridej po odstranění ' + JSON.stringify(p)); });
  test('E3 po odstranění B: nový zákazník přes vzPridej (z3, C) → 200', rN.status === 200, { status: rN.status, chyba: rN.chyba }); }

/* smazání zamčené varianty odstraněného zákazníka bez práva */
{ const z = sVz('E3 zamčená varianta C', zz => { const r = G.vzPridej(zz, UDAJE_C, { kdo: 'x', vlastni: true }); if (!r.ok) throw new Error(r.chyba); });
  const v2 = z.varianty.find(v => v.id === z.dalsiZakaznici[1].varianta);
  zamkni(z, v2, { id: 'z3' });
  const r0 = await uloz(z, cO);
  let g = await nacti(r0.soubor, cO);
  const rA = await opakuj({ g }, a => { const x = G.vzOdstran(a, 'z3', { smazatVariantu: true }); if (!x.ok || x.smazanaVarianta) throw new Error(JSON.stringify(x)); }, cA);
  const u = ulozenoObj(r0.soubor);
  test('E3 příprava: administrátor odstraní C (smazatVariantu) → 200, zamčená V2 zůstala jako doklad',
    r0.status === 200 && rA.status === 200 && u.dalsiZakaznici.length === 1 && u.varianty.some(v => v.id === v2.id && v.zamek && v.zamek.zamceno),
    { r0: r0.status, status: rA.status, chyba: rA.chyba });
  g = await nacti(r0.soubor, cO);
  const pred = ulozeno(r0.soubor);
  const r = await opakuj({ g }, a => { a.varianty = a.varianty.filter(v => v.id !== v2.id); });
  test('E3 smazání zamčené varianty odstraněného zákazníka obchodníkem (bez varianta.smazatUzamcenou) → 409, úložiště beze změny',
    r.status === 409 && /chybí/.test(r.chyba || '') && ulozeno(r0.soubor) === pred, { status: r.status, chyba: r.chyba }); }
/* ---------- 8) E4 (#603): řídící zákazník a Prodáno u zákazníka ---------- */
const dnes = G.objDnes();
/* D1 (doplněk 7): uložená zakázka s JEDNÍM zákazníkem → v jednom uložení přidat
 * zákazníka a udělat ho řídícím. Autor 200, jiný obchodník 403. */
{ const z = nova('E4 D1 uložená');
  const r0 = await uloz(z, cO);
  const g = await nacti(r0.soubor, cO);
  const pred = ulozeno(r0.soubor);
  const pridejVymen = a => { const p = G.vzPridej(a, UDAJE_B, { kdo: 'x' }); if (!p.ok) throw new Error(p.chyba); const v = G.vzVymenRidiciho(a, 'z2'); if (!v.ok) throw new Error(v.chyba); };
  const rCizi = await opakuj({ g }, pridejVymen, cO2);
  test('E4 D1: uložená zakázka s jedním zákazníkem — přidat + vyměnit řídícího jiným obchodníkem → 403, úložiště beze změny',
    rCizi.status === 403 && /řídícího zákazníka mění jen autor/.test(rCizi.chyba || '') && ulozeno(r0.soubor) === pred, { status: rCizi.status, chyba: rCizi.chyba });
  const r = await opakuj({ g }, pridejVymen, cO);
  const u = ulozenoObj(r0.soubor);
  test('E4 D1: totéž autorem → 200, řídící z2, z1 bez písmene mezi dalšími (N9 není přísnější než výměna)',
    r.status === 200 && u.vzRidici.id === 'z2' && u.objednatel === UDAJE_B.objednatel && u.dalsiZakaznici[0].id === 'z1' && u.dalsiZakaznici[0].pismeno === '',
    { status: r.status, chyba: r.chyba }); }
/* Kdo smí měnit řídícího (bez prodeje): autor a administrátor, jiný obchodník 403;
 * zakázka založená webhookem jen administrátor. */
{ const r0 = await uloz(sVz('E4 práva výměny'), cO);
  let g = await nacti(r0.soubor, cO);
  const pred = ulozeno(r0.soubor);
  const vymen = id => a => { const v = G.vzVymenRidiciho(a, id); if (!v.ok) throw new Error(v.chyba); };
  const r1 = await opakuj({ g }, vymen('z2'), cO2);
  test('E4 výměna řídícího jiným obchodníkem → 403, úložiště beze změny', r1.status === 403 && ulozeno(r0.soubor) === pred, { status: r1.status, chyba: r1.chyba });
  const r2 = await opakuj({ g }, vymen('z2'), cO);
  const u2 = ulozenoObj(r0.soubor);
  test('E4 výměna řídícího autorem → 200 (hlavička B, vzRidici z2, řídící varianta B, otisky firmy pryč)',
    r2.status === 200 && u2.vzRidici.id === 'z2' && u2.objednatel === UDAJE_B.objednatel && u2.vzRidici.varianta === u2.varianty.find(v => v.ridici).id,
    { status: r2.status, chyba: r2.chyba });
  g = await nacti(r0.soubor, cO);
  const r3 = await opakuj({ g }, vymen('z1'), cA);
  test('E4 výměna řídícího zpět administrátorem → 200', r3.status === 200 && ulozenoObj(r0.soubor).vzRidici.id === 'z1', { status: r3.status, chyba: r3.chyba });
  /* zakázka založená webhookem */
  const w = ulozenoObj(r0.soubor); w.autor = 'pipedrive-webhook'; pamet.set('zakazky/z/' + r0.soubor, JSON.stringify(w));
  g = await nacti(r0.soubor, cO);
  const predW = ulozeno(r0.soubor);
  const r4 = await opakuj({ g }, vymen('z2'), cO);
  test('E4 zakázka založená webhookem: výměna obchodníkem → 403 (jen administrátor)', r4.status === 403 && ulozeno(r0.soubor) === predW, { status: r4.status, chyba: r4.chyba });
  const r5 = await opakuj({ g }, vymen('z2'), cA);
  test('E4 zakázka založená webhookem: administrátor → 200', r5.status === 200, { status: r5.status, chyba: r5.chyba }); }
/* Prodej u zákazníka: jen zákazníkovi, kterému varianta odešla; podvržené
 * prodano.zakaznik; server vymění řídícího sám; po prodeji výměna 409. */
{ const o = await sOdeslanouB('E4 prodej', cO);   // V1 vytištěná pro B (z2); C (z3) má vlastní V2
  const pred = ulozeno(o.soubor);
  const prodej = komu => a => { a.varianty[0].prodano = { datum: dnes, kdo: 'x', kdy: 'x', zakaznik: komu, pipedrive: { stav: 'ceka', kdy: 'x' } }; };
  const rC = await opakuj(o, prodej('z3'));
  test('E4 prodej V1 zákazníkovi C (varianta mu neodešla, podvržené prodano.zakaznik) → 409, úložiště beze změny',
    rC.status === 409 && /odešla/.test(rC.chyba || '') && ulozeno(o.soubor) === pred, { status: rC.status, chyba: rC.chyba });
  const rX = await opakuj(o, prodej('z9'));
  test('E4 prodej neexistujícímu zákazníkovi → 400', rX.status === 400 && ulozeno(o.soubor) === pred, { status: rX.status, chyba: rX.chyba });
  const rA = await opakuj(o, prodej('z1'));
  test('E4 prodej V1 řídícímu A (V1 mu jako zákazníkovi neodešla — tisk jen pro B) → 409',
    rA.status === 409 && ulozeno(o.soubor) === pred, { status: rA.status, chyba: rA.chyba });
  const rB = await opakuj(o, prodej('z2'), cO2);   // prodej zapisuje obchodník zakázky (autor) — cO2 není autor
  test('E4 prodej B jiným obchodníkem (není autor ani vedoucí) → 403', rB.status === 403 && ulozeno(o.soubor) === pred, { status: rB.status, chyba: rB.chyba });
  const rOk = await opakuj(o, prodej('z2'));        // starší klient: bez výměny řídícího
  const u = ulozenoObj(o.soubor);
  test('E4 prodej V1 zákazníkovi B (odešla mu) bez výměny v prohlížeči → 200, server vymění řídícího sám',
    rOk.status === 200 && u.varianty[0].prodano.zakaznik === 'z2' && u.vzRidici.id === 'z2' && u.objednatel === UDAJE_B.objednatel
    && u.varianty[0].ridici === true && u.vzRidici.varianta === u.varianty[0].id && u.varianty[0].prodano.kdo === 'obch.vz@priklad.cz',
    { status: rOk.status, chyba: rOk.chyba, r: u.vzRidici, p: u.varianty[0].prodano });
  const g2 = await nacti(o.soubor, cO);
  const pred2 = ulozeno(o.soubor);
  const r2 = await opakuj({ g: g2 }, a => { G.vzVymenRidiciho(a, 'z1'); }, cA);
  test('E4 po prodeji: výměna řídícího i administrátorem → 409, úložiště beze změny', r2.status === 409 && ulozeno(o.soubor) === pred2, { status: r2.status, chyba: r2.chyba });
  const r3 = await opakuj({ g: g2 }, a => { a.varianty[0].prodano.zakaznik = 'z1'; });
  test('E4 po prodeji: přepis prodano.zakaznik v uloženém prodeji server vrátí (z2)',
    r3.status === 200 && ulozenoObj(o.soubor).varianty[0].prodano.zakaznik === 'z2', { status: r3.status, chyba: r3.chyba }); }
/* Prodej vlastní varianty B v prohlížeči (vzProdej s výměnou) — týž výsledek. */
{ const z = sVz('E4 prodej vlastní B', zz => { const r = G.vzPridej(zz, UDAJE_C, { kdo: 'x', vlastni: true }); if (!r.ok) throw new Error(r.chyba); });
  const vC = z.varianty.find(v => v.id === z.dalsiZakaznici[1].varianta);
  zamkni(z, vC, { id: 'z3' });
  const r0 = await uloz(z, cO);
  const g = await nacti(r0.soubor, cO);
  const r = await opakuj({ g }, a => { const x = G.vzProdej(a, 'z3', dnes, { kdo: 'x', role: 'Obchodník' }); if (!x.ok) throw new Error(x.chyba); });
  const u = ulozenoObj(r0.soubor);
  test('E4 vzProdej C (vlastní varianta) → 200: řídící C, prodaná V2 řídící, A i B mezi dalšími, invariant',
    r.status === 200 && u.vzRidici.id === 'z3' && u.objednatel === UDAJE_C.objednatel && u.varianty.find(v => v.id === vC.id).ridici
    && u.varianty.find(v => v.id === vC.id).prodano.zakaznik === 'z3' && u.dalsiZakaznici.map(d => d.id).sort().join() === 'z1,z2'
    && G.vzSrovnej(zk.importZakazka(kopie(u))).length === 0, { status: r.status, chyba: r.chyba }); }
/* Doplněk 3: návrat k jednomu zákazníkovi, který není z1, s odeslanou nabídkou → 409. */
{ const z = sVz('E4 kolaps');
  zamkni(z, z.varianty[0], { id: 'z1' });
  const r0 = await uloz(z, cO);
  let g = await nacti(r0.soubor, cO);
  await opakuj({ g }, a => { G.vzVymenRidiciho(a, 'z2'); });
  g = await nacti(r0.soubor, cO);
  const pred = ulozeno(r0.soubor);
  const r = await opakuj({ g }, a => { delete a.vzRidici; delete a.dalsiZakaznici; }, cA);
  test('E4 doplněk 3: odstranění z1 po výměně řídícího (zbyde B, něco odešlo) i administrátorem → 409, úložiště beze změny',
    r.status === 409 && /vrátila k jednomu zákazníkovi/.test(r.chyba || '') && ulozeno(r0.soubor) === pred, { status: r.status, chyba: r.chyba }); }
await vypinac({ viceZakazniku: false });

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
