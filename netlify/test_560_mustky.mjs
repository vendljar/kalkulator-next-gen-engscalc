/* #560 — SAMOSTATNÁ SEKCE MŮSTKY: SERVER (rozhodnutí J. V. 4. 11. 2026).
 *
 *  1) Zveřejnění ceníku: skladebný model (kladná C.mustekRamBmKc) s nulovou
 *     sazbou provedení (vana) → 400 `kod: 'mustky'` bez potvrzení, s
 *     `mustkyPotvrzeno: true` projde; úplný skladebný ceník projde rovnou.
 *  2) Uložení zakázky: platné skupiny `Z.mustky` projdou; záporný počet,
 *     neznámá podlaha, příliš dlouhý text, neznámý klíč, ne-pole a víc než
 *     20 skupin → 400 a úložiště beze změny.
 *  3) Zámek: nový zámek varianty se skladebnými můstky (Model 2) projde se
 *     shodným výsledkem; varianta zamčená v uložené verzi se uloží beze
 *     změny (doklad).
 * Paměťové úložiště, smyšlené sazby (src/zkusebni_cenik.js), smyšlené účty.
 * Pojistka: na 000924e body 1) a 2) selžou (skladebné sazby se nehlídají,
 * `Z.mustky` server nezná a uloží cokoli); po změně projdou.
 * Spuštění: node netlify/test_560_mustky.mjs */
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

/* smyšlené sazby skladebného modelu */
const SKLADBA = { mustekRamBmKc: 10000, mustekPodlahaPlechM2Kc: 1000, mustekPodlahaPororostM2Kc: 1100, mustekPodlahaVanaM2Kc: 1200,
  mustekZabradliKovBmKc: 2000, mustekZabradliSkloBmKc: 5000, mustekKotveniDeskaKc: 3000, mustekKotveniSloupKc: 3100,
  mustekKotveniKonzolaKc: 3200, mustekZabradliSkloMontazHodBm: 1 };
const cenik = (zmena) => Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky(), SKLADBA, zmena || {});

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const zverejni = async (telo) => { const r = await post(program, 'http://x/api/program', telo, cA); let o = {}; try { o = await r.json(); } catch (e) { /* */ } return { st: r.status, o }; };

/* 1) zveřejnění ceníku */
let r = await zverejni({ cenik: cenik({ mustekPodlahaVanaM2Kc: 0 }), cenikProj: ZC.zkusebniCenikProj(), poznamka: '#560' });
test('#560: skladebný ceník s nulovou sazbou vany bez potvrzení → 400 mustky',
  r.st === 400 && r.o.kod === 'mustky' && (r.o.chybi || []).includes('mustekPodlahaVanaM2Kc') && /Skladebný model/.test(r.o.chyba || ''), r);
r = await zverejni({ cenik: cenik({ mustekPodlahaVanaM2Kc: 0 }), cenikProj: ZC.zkusebniCenikProj(), poznamka: '#560', mustkyPotvrzeno: true });
test('#560: … s potvrzením správce projde', r.st === 200, r);
r = await zverejni({ cenik: cenik({ mustekRamBmKc: 0 }), cenikProj: ZC.zkusebniCenikProj(), poznamka: '#560' });
test('#560: sazby provedení bez nosné konstrukce → 400 (model by se nezapnul)', r.st === 400 && (r.o.chybi || []).includes('mustekRamBmKc'), r);
r = await zverejni({ cenik: cenik(), cenikProj: ZC.zkusebniCenikProj(), poznamka: '#560' });
test('#560: úplný skladebný ceník projde bez potvrzení', r.st === 200, r);

const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obch.mustky@priklad.cz', jmeno: 'Obch Můstky', role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
const cO = await prihlas('obch.mustky@priklad.cz', 'Heslo12345x');

let n = 9560;
function nova(nazev, mustky) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++) + ' - TEST'; z.nazevAkce = 'TEST ' + nazev; z.objednatel = 'TEST – TESTOVACÍ ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  if (mustky !== undefined) v.data.ock.zadani.mustky = mustky;
  v.data.ock.fixes = true;
  v.data.cenik = cenik(); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
const PLATNA = [{ ks: 2, sirkaMm: 1500, delkaMm: 1200, podlaha: 'pororost', podlahaNazev: '', zabradli: 'sklo', zabradliNazev: '',
  zabradliStrany: 1, kotveni: 'jine', kotveniText: 'do ocelového sloupu stavby', sloupyKs: 2, sloupVyskaM: 3.2 }];

/* 2) validace Z.mustky */
{ const r1 = await uloz(nova('platné skupiny', kopie(PLATNA)), cO);
  test('#560: platné skupiny můstků se uloží (200)', r1.status === 200 && r1.ok, r1); }
const SPATNE = [
  ['záporný počet kusů', [{ ks: -1 }]],
  ['neznámá podlaha', [{ ks: 1, podlaha: 'mramor' }]],
  ['neznámé zábradlí', [{ ks: 1, zabradli: 'drevo' }]],
  ['text delší než 120 znaků', [{ ks: 1, podlaha: 'jine', podlahaNazev: 'x'.repeat(121) }]],
  ['text není řetězec', [{ ks: 1, kotveni: 'jine', kotveniText: { a: 1 } }]],
  ['neznámý klíč skupiny', [{ ks: 1, cenaKc: 5 }]],
  ['skupina není objekt', ['1 ks']],
  ['pole můstků není pole', { ks: 1 }],
  ['víc než 20 skupin', Array.from({ length: 21 }, () => ({ ks: 1 }))],
  ['nečíselná délka', [{ ks: 1, delkaMm: '12,5x' }]],
  ['obří výška sloupu', [{ ks: 1, sloupyKs: 1, sloupVyskaM: 1e300 }]],
];
for (const [jm, m] of SPATNE) {
  const z = nova('špatné: ' + jm, m);
  const r1 = await uloz(z, cO);
  test('#560: ' + jm + ' → 400', r1.status === 400, { status: r1.status, chyba: r1.chyba });
}
/* změna v uložené zakázce: úložiště zůstane beze změny */
{ const z = nova('změna', kopie(PLATNA)); const r1 = await uloz(z, cO);
  const g = await nacti(r1.soubor, cO); const a = zk.importZakazka(kopie(g));
  a.varianty[0].data.ock.zadani.mustky[0].podlaha = 'mramor';
  const r2 = await uloz(a, cO, g.uloRazitko); const g2 = await nacti(r1.soubor, cO);
  test('#560: neplatná změna skupiny v uložené zakázce → 400 a úložiště beze změny',
    r2.status === 400 && g2.varianty[0].data.ock.zadani.mustky[0].podlaha === 'pororost', { status: r2.status, chyba: r2.chyba }); }

/* 3) zámek */
{ const z = nova('zámek', kopie(PLATNA)); const v = z.varianty[0];
  const vys = globalThis.vypocet(kopie(v.data.ock.zadani), kopie(v.data.cenik), JEKLY, true);
  test('příprava: varianta počítá skladebně se sekcí MŮSTKY', vys.mustky.skladebny && Array.isArray(vys.sekce.mustky) && vys.souhrn.mustkyCena > 0, vys.mustky);
  zam.zamkniVariantu(v, { cislo: zam.variantaCislo(z, v), typ: 'nabidka', kdo: 'Obch Můstky', vysledek: zam.zamekVysledekSpocti(v, JEKLY, '#560') });
  const r1 = await uloz(z, cO);
  test('#560: nový zámek se skladebnými můstky projde (shodný výsledek)', r1.status === 200 && r1.ok, r1);
  const g = await nacti(r1.soubor, cO);
  test('#560: zamčená varianta nese skupiny i výsledek se sekcí MŮSTKY',
    g.varianty[0].zamek && g.varianty[0].zamek.zamceno && g.varianty[0].data.ock.zadani.mustky[0].podlaha === 'pororost', g.varianty[0].zamek);
  const a = zk.importZakazka(kopie(g)); a.kontakt = (a.kontakt || '') + ' (poznámka)';
  const r2 = await uloz(a, cO, g.uloRazitko);
  test('#560: zamčená varianta se skladebnými můstky se uloží beze změny (doklad)', r2.status === 200 && r2.ok, r2);
  const b = zk.importZakazka(kopie(await nacti(r1.soubor, cO)));
  b.varianty[0].data.ock.zadani.mustky[0].ks = 3;
  const r3 = await uloz(b, cO, (await nacti(r1.soubor, cO)).uloRazitko);
  test('#560: změna počtu můstků v zamčené variantě → odmítnuto', r3.status >= 400, { status: r3.status, chyba: r3.chyba }); }

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
