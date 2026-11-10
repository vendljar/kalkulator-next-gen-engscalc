/* VS #570 / E1 (#591) — VÍC ŠACHET V NABÍDCE NA SERVERU (10. 11. 2026).
 *
 *  1) Vypínač /api/funkce: výchozí vypnuto; GET každý přihlášený, POST jen
 *     administrátor (obchodník 403), neplatný tvar 400.
 *  2) Vypnuto: zakázka bez víc šachet se uloží jako dnes; nová s další
 *     šachtou nebo ks > 1 → 409; zakázka uložená se ZAPNUTOU funkcí (R21):
 *     jiné změny i tisk (zámek se součtem) projdou, jakákoli změna šachtové
 *     části (smazání, ks, zadání, název, přidání) → 409, úložiště beze změny.
 *  3) Zapnuto: platné šachty se uloží; limity a tvar (11 variant, ks 0 / 21 /
 *     1,5 / text, název 81 znaků, chybí id, duplicitní id, neznámý klíč,
 *     zadání není objekt) → 400; Model 1 s víc šachtami → 400.
 *  4) 409 při ztrátě `dalsi` proti uložené verzi (starší karta prohlížeče);
 *     vědomé `dalsi: []` projde.
 *  5) Zadání šachty 2+ tímiž kontrolami jako šachta 1: záporný rozměr,
 *     neplatné skupiny můstků, nepovolená volba → 400.
 *  6) Zámek: nový zámek varianty se dvěma šachtami nese součet (sachty[]),
 *     server ho přepočítá obalem a přijme.
 * Paměťové úložiště, smyšlený ceník (src/zkusebni_cenik.js), smyšlené účty.
 * Pojistka: na 3ff5403 (bez E1) selže — /api/funkce neexistuje a server
 * zakázku s `ock.dalsi` uloží bez kontroly.
 * Spuštění: node netlify/test_vs_server.mjs */
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
const ulozeno = (soubor) => pamet.get('zakazky/z/' + soubor) || null;

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
{ const r = await post(program, 'http://x/api/program', { cenik: Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()), cenikProj: ZC.zkusebniCenikProj(), poznamka: 'VS' }, cA);
  if (r.status !== 200) throw new Error('program ' + r.status + ' ' + JSON.stringify(await r.json())); }
const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obch.vs@priklad.cz', jmeno: 'Obch VS', role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
const cO = await prihlas('obch.vs@priklad.cz', 'Heslo12345x');

let n = 9570;
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++) + ' - TEST'; z.nazevAkce = 'TEST VS ' + nazev; z.objednatel = 'TEST – TESTOVACÍ ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.ock.fixes = true;
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
function sDalsi(nazev, uprava) {
  const z = nova(nazev); const ock = z.varianty[0].data.ock;
  ock.nazev = 'Výtah A';
  ock.dalsi = [{ id: 's_b1', nazev: 'Výtah B', ks: 2, zadani: Object.assign(kopie(ock.zadani), { zdvih: 12 }) }];
  if (uprava) uprava(ock);
  return z;
}
const vypinac = async (hodnota, c) => { const r = await post(funkce, 'http://x/api/funkce', { viceSachet: hodnota }, c || cA); return { status: r.status, ...(await r.json()) }; };

/* 1) vypínač */
{ const r = await (await get(funkce, 'http://x/api/funkce', cO)).json();
  test('vypínač: výchozí stav vypnuto, GET smí obchodník', r.ok && r.funkce && r.funkce.viceSachet === false, r);
  const r2 = await get(funkce, 'http://x/api/funkce');
  test('vypínač: GET bez přihlášení → 401', r2.status === 401, r2.status);
  const r3 = await vypinac(true, cO);
  test('vypínač: POST obchodníka → 403', r3.status === 403, r3);
  const r4 = await vypinac('ano');
  test('vypínač: POST s nepravdivostní hodnotou → 400', r4.status === 400, r4);
  const r5 = await (await get(funkce, 'http://x/api/funkce', cO)).json();
  test('vypínač: po odmítnutých pokusech stále vypnuto', r5.funkce.viceSachet === false, r5); }

/* 2) vypnuto */
{ const r = await uloz(nova('jedna šachta, vypnuto'), cO);
  test('vypnuto: zakázka s jednou šachtou se uloží jako dnes (200)', r.status === 200 && r.ok, r);
  const z1 = nova('jedna šachta s prázdným dalsi'); z1.varianty[0].data.ock.dalsi = []; z1.varianty[0].data.ock.ks = 1;
  const r1 = await uloz(z1, cO);
  test('vypnuto: prázdné dalsi a ks = 1 nejsou víc šachet (200)', r1.status === 200, r1);
  const z = sDalsi('dvě šachty, vypnuto');
  const r2 = await uloz(z, cO);
  test('vypnuto: zakázka s další šachtou → 409 se zprávou o vypnuté funkci', r2.status === 409 && /vypnutá/.test(r2.chyba || ''), r2);
  test('vypnuto: nic se neuložilo', ![...pamet.keys()].some(k => k.includes(String(z.cislo).replace(/\s/g, '').slice(-8, -5))) || !r2.soubor, r2);
  const z3 = nova('ks 3, vypnuto'); z3.varianty[0].data.ock.ks = 3;
  const r3 = await uloz(z3, cO);
  test('vypnuto: šachta 1 s ks = 3 → 409', r3.status === 409, r3); }

/* 3) zapnuto: tvar a limity */
{ const r = await vypinac(true);
  test('vypínač: správce zapne (200)', r.status === 200 && r.funkce.viceSachet === true && r.kdo === ADMIN_EMAIL, r); }
let ulozenaVS = null;
{ const r = await uloz(sDalsi('platné šachty'), cO);
  test('zapnuto: platná zakázka se dvěma variantami šachet se uloží (200)', r.status === 200 && r.ok, r);
  ulozenaVS = r.soubor;
  const g = await nacti(r.soubor, cO);
  test('zapnuto: úložiště nese dalsi, ks i název beze změny', g && g.varianty[0].data.ock.dalsi.length === 1
    && g.varianty[0].data.ock.dalsi[0].ks === 2 && g.varianty[0].data.ock.nazev === 'Výtah A', g && g.varianty[0].data.ock); }
const SPATNE = [
  ['11 variant šachet (limit 10)', o => { o.dalsi = Array.from({ length: 10 }, (_, i) => ({ id: 's_x' + i, nazev: 'X' + i, ks: 1, zadani: kopie(o.zadani) })); }],
  ['ks 0', o => { o.dalsi[0].ks = 0; }],
  ['ks 21', o => { o.dalsi[0].ks = 21; }],
  ['ks 1,5', o => { o.dalsi[0].ks = 1.5; }],
  ['ks jako text', o => { o.dalsi[0].ks = '2'; }],
  ['ks šachty 1 = 25', o => { o.ks = 25; }],
  ['název 81 znaků', o => { o.dalsi[0].nazev = 'x'.repeat(81); }],
  ['název šachty 1 není text', o => { o.nazev = { a: 1 }; }],
  ['chybí id šachty', o => { delete o.dalsi[0].id; }],
  ['id s mezerou', o => { o.dalsi[0].id = 's b'; }],
  ['duplicitní id', o => { o.dalsi.push(Object.assign(kopie(o.dalsi[0]), { nazev: 'C' })); }],
  ['neznámý klíč šachty', o => { o.dalsi[0].cena = 5; }],
  ['zadání není objekt', o => { o.dalsi[0].zadani = 'x'; }],
  ['dalsi není pole', o => { o.dalsi = { a: 1 }; }],
  ['Model 1 s víc šachtami', o => { o.fixes = false; }],
  ['šachta 2: záporná šířka', o => { o.dalsi[0].zadani.sirka = -1.6; }],
  ['šachta 2: zdvih 150 m', o => { o.dalsi[0].zadani.zdvih = 150; }],
  ['šachta 2: skupina můstků s neznámou podlahou', o => { o.dalsi[0].zadani.mustky = [{ ks: 1, podlaha: 'mramor' }]; }],
  ['šachta 2: číslo jako objekt', o => { o.dalsi[0].zadani.nastupiste = { a: 1 }; }],
  ['šachta 2: neznámý typ šachty', o => { o.dalsi[0].zadani.typSachty = 'podzemní'; }],
  /* VS-E4/E3 (bod koordinace 1): ruční hodnoty specifikace šachty 2+ jen { hodnoty: { pole šachty: text } } */
  ['techspec není objekt', o => { o.dalsi[0].techspec = 'x'; }],
  ['techspec s klíčem mimo hodnoty', o => { o.dalsi[0].techspec = { hodnoty: {}, extra: [] }; }],
  ['techspec hodnoty jako pole', o => { o.dalsi[0].techspec = { hodnoty: ['a'] }; }],
  ['techspec pole za zakázku (lešení)', o => { o.dalsi[0].techspec = { hodnoty: { leseniUvnitr: 'ano' } }; }],
  ['techspec neznámé pole', o => { o.dalsi[0].techspec = { hodnoty: { neexistuje: 'x' } }; }],
  ['techspec hodnota není text', o => { o.dalsi[0].techspec = { hodnoty: { strecha: { a: 1 } } }; }],
  ['techspec hodnota přes 2000 znaků', o => { o.dalsi[0].techspec = { hodnoty: { strecha: 'x'.repeat(2001) } }; }],
];
{ const z = sDalsi('techspec šachty 2 platná', o => { o.dalsi[0].techspec = { hodnoty: { strecha: 'plochá', mustkyRozmer: '1,2 × 1,6 m' } }; });
  const r = await uloz(z, cO);
  test('zapnuto: platná techspec šachty 2 { hodnoty: { pole šachty: text } } se uloží (200)', r.status === 200 && r.ok, r); }
for (const [jm, fn] of SPATNE) {
  const z = sDalsi('špatně: ' + jm, fn);
  const pred = pamet.size;
  const r = await uloz(z, cO);
  test('zapnuto: ' + jm + ' → 400', r.status === 400 && pamet.size === pred, { status: r.status, chyba: r.chyba });
}
{ const z = sDalsi('10 variant'); const o = z.varianty[0].data.ock;
  o.dalsi = Array.from({ length: 9 }, (_, i) => ({ id: 's_y' + i, nazev: 'Y' + i, ks: 20, zadani: kopie(o.zadani) }));
  const r = await uloz(z, cO);
  test('zapnuto: přesně 10 variant šachet po 20 ks projde (200)', r.status === 200, r); }
{ const z = sDalsi('přepis ceny v šachtě 2'); z.varianty[0].data.ock.dalsi[0].zadani.cenyPrepis = { 'SPOJOVACÍ MATERIÁL': 1 };
  const r = await uloz(z, cO);
  const z1 = nova('přepis ceny v šachtě 1'); z1.varianty[0].data.ock.zadani.cenyPrepis = { 'SPOJOVACÍ MATERIÁL': 1 };
  const r1 = await uloz(z1, cO);
  test('zapnuto: přepis ceny v šachtě 2 hlídán stejně jako v šachtě 1 (obchodník → 403)', r.status === r1.status && r.status === 403, { s2: r.status, s1: r1.status, chyba: r.chyba }); }

/* 4) 409 při ztrátě dalsi */
{ const g = await nacti(ulozenaVS, cO);
  const a = zk.importZakazka(kopie(g)); delete a.varianty[0].data.ock.dalsi;
  const pred = ulozeno(ulozenaVS);
  const r = await uloz(a, cO, g.uloRazitko);
  test('ztráta dalsi (starší karta bez klíče) → 409, úložiště beze změny', r.status === 409 && /zahodilo/.test(r.chyba || '') && ulozeno(ulozenaVS) === pred, r);
  const b = zk.importZakazka(kopie(g)); b.varianty[0].data.ock.dalsi[0].nazev = 'Výtah B – dvorní';
  const r2 = await uloz(b, cO, g.uloRazitko);
  test('úprava názvu šachty 2 se uloží (200)', r2.status === 200, r2);
  const g2 = await nacti(ulozenaVS, cO);
  const c = zk.importZakazka(kopie(g2)); c.varianty[0].data.ock.dalsi = [];
  const r3 = await uloz(c, cO, g2.uloRazitko);
  test('vědomé smazání šachet (dalsi: []) projde (200)', r3.status === 200, r3);
  const g3 = await nacti(ulozenaVS, cO);
  const d = zk.importZakazka(kopie(g3)); d.varianty[0].data.ock.dalsi = kopie(g.varianty[0].data.ock.dalsi);
  const r4 = await uloz(d, cO, g3.uloRazitko);
  test('vrácení šachet zpět (200)', r4.status === 200, r4); }

/* 6) zámek se součtem */
let zamcena = null;
{ const z = sDalsi('zámek'); const v = z.varianty[0];
  const vys = zam.zamekVysledekSpocti(v, JEKLY, 'VS');
  test('příprava: výsledek zámku nese součet a sachty[]', vys && vys.ock && Array.isArray(vys.ock.sachty) && vys.ock.sachty.length === 2
    && vys.ock.souhrn.zakladCena === vys.ock.sachty.reduce((a, s) => a + s.cenaRozpis, 0), vys && vys.ock && vys.ock.souhrn);
  zam.zamkniVariantu(v, { cislo: zam.variantaCislo(z, v), typ: 'nabidka', kdo: 'Obch VS', vysledek: vys });
  const r = await uloz(z, cO);
  test('zámek: nový zámek varianty se dvěma šachtami projde (server přepočítá obalem)', r.status === 200 && r.ok, r);
  zamcena = r.soubor;
  const z2 = sDalsi('zámek podvržený'); const v2 = z2.varianty[0];
  const vys2 = zam.zamekVysledekSpocti(v2, JEKLY, 'VS');
  /* podvrh: výsledek jen šachty 1 (bez součtu) */
  vys2.ock = globalThis.vypocet(kopie(v2.data.ock.zadani), kopie(v2.data.cenik), JEKLY, true);
  zam.zamkniVariantu(v2, { cislo: zam.variantaCislo(z2, v2), typ: 'nabidka', kdo: 'Obch VS', vysledek: vys2 });
  const r2 = await uloz(z2, cO);
  /* Dnešní pravidlo (B59): rozpor nového zámku se zapíše do zámku a ohlásí — server ho pozná. */
  test('zámek: výsledek jen šachty 1 místo součtu server pozná jako rozpor', r2.status >= 400 || /nesouhlasí/.test(r2.varovani || ''), r2);
  const r1v = r.varovani || '';
  test('zámek: poctivý zámek se součtem je bez rozporu', !/nesouhlasí/.test(r1v), r1v); }

/* 2b) po vypnutí (R21): cena a tisk podle dat, šachty nejde měnit */
{ const r = await vypinac(false);
  test('vypínač: správce vypne (200)', r.status === 200 && r.funkce.viceSachet === false, r);
  let g = await nacti(ulozenaVS, cO);
  const a = zk.importZakazka(kopie(g)); a.kontakt = 'jen poznámka';
  const r1 = await uloz(a, cO, g.uloRazitko);
  test('vypnuto: uložená zakázka s víc šachtami — jiná změna se uloží (200)', r1.status === 200, r1);
  g = await nacti(ulozenaVS, cO);
  test('vypnuto: šachty zůstaly beze změny', g.varianty[0].data.ock.dalsi.length === 1 && g.varianty[0].data.ock.dalsi[0].ks === 2);
  const pred = ulozeno(ulozenaVS);
  const zmeny = [
    ['smazání šachet (dalsi: [])', o => { o.dalsi = []; }],
    ['změna ks šachty 2', o => { o.dalsi[0].ks = 3; }],
    ['změna zadání šachty 2', o => { o.dalsi[0].zadani.zdvih = 15; }],
    ['přejmenování šachty 1', o => { o.nazev = 'Výtah A2'; }],
    ['přidání šachty', o => { o.dalsi.push(Object.assign(kopie(o.dalsi[0]), { id: 's_c', nazev: 'C' })); }],
  ];
  for (const [jm, fn] of zmeny) {
    const b = zk.importZakazka(kopie(g)); fn(b.varianty[0].data.ock);
    const rr = await uloz(b, cO, g.uloRazitko);
    test('vypnuto: ' + jm + ' → 409 s lištou „funkce je v Nastavení vypnutá", úložiště beze změny',
      rr.status === 409 && /v Nastavení vypnutá/.test(rr.chyba || '') && ulozeno(ulozenaVS) === pred, rr);
  }
  /* tisk: nový zámek varianty s víc šachtami (součet) projde i s vypnutou funkcí */
  const c = zk.importZakazka(kopie(g)); const v = c.varianty[0];
  zam.zamkniVariantu(v, { cislo: zam.variantaCislo(c, v), typ: 'nabidka', kdo: 'Obch VS', vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'VS') });
  const r2 = await uloz(c, cO, g.uloRazitko);
  test('vypnuto: tisk (nový zámek) zakázky s víc šachtami projde bez rozporu (200)', r2.status === 200 && !/nesouhlasí/.test(r2.varovani || ''), r2);
  g = await nacti(ulozenaVS, cO);
  test('vypnuto: zámek nese cenu součtu (vypnutí cenu nemění)', g.varianty[0].zamek && g.varianty[0].zamek.vysledek.ock.sachty.length === 2
    && g.varianty[0].zamek.vysledek.ock.souhrn.zakladCena === globalThis.vypocetOckDat(g.varianty[0].data, JEKLY).souhrn.zakladCena);
  const r3 = await uloz(nova('jedna šachta po vypnutí'), cO);
  test('vypnuto: běžná zakázka se dál ukládá (200)', r3.status === 200, r3);
  const z4 = sDalsi('nová po vypnutí'); const r4 = await uloz(z4, cO);
  test('vypnuto: novou zakázku s víc šachtami nejde založit (409)', r4.status === 409, r4); }

/* klient: lišta R21 */
{ const hl = globalThis.vsVypnutoHlaska(zk.importZakazka(kopie(await nacti(ulozenaVS, cO))), false);
  test('klient: vsVypnutoHlaska u vypnuté funkce: „Zakázka má víc šachet — funkce je v Nastavení vypnutá"', /^Zakázka má víc šachet — funkce je v Nastavení vypnutá/.test(hl), hl);
  test('klient: zapnuto nebo jedna šachta → bez lišty', globalThis.vsVypnutoHlaska(nova('x'), false) === ''
    && globalThis.vsVypnutoHlaska(sDalsi('y'), true) === ''); }

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
