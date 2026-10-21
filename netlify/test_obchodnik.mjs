/* POHLED OBCHODNÍKA — SERVEROVÁ PRÁVA (kolo 16, 25. 9. 2026; do repozitáře
 * v dávce A). Skutečné funkce netlify/functions nad paměťovým úložištěm
 * a zkušebním ceníkem, nic se nezapisuje do Netlify. 24 scénářů S1–S18;
 * S5 (vedoucí jen otevře a uloží cizí „čeká" → nesmí se schválit) před
 * opravou P1 (K16-N73, K16-N74) selhával. Scénáře označené „informativní"
 * popisují dnešní rozhodnutí (sdílený rejstřík, ceník v prohlížeči).
 *
 * Spuštění: node netlify/test_obchodnik.mjs  (ADMIN_EMAIL má výchozí hodnotu) */
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
const { default: zobrazeni } = await import(R + 'netlify/functions/zobrazeni.mjs');
const { default: schvalovani } = await import(R + 'netlify/functions/schvalovani.mjs');
const { default: zdravi } = await import(R + 'netlify/functions/zdravi.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
const { JEKLY } = await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const zam = require(R + 'src/zamek.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const SCHV = require(R + 'src/schvalovani.js');
const SL = require(R + 'src/sleva.js');

const V = [];
const test = (id, n, cond, info, ocekavano) => { V.push({ id, n, ok: !!cond, info: info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info)).slice(0, 300), ocekavano: ocekavano || '' });
  console.log((cond ? 'OK   ' : 'FAIL ') + id + ' ' + n + (cond ? '' : '  ' + JSON.stringify(info).slice(0, 300))); };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const del = (fn, url, cookie) => fn(new Request(url, { method: 'DELETE', headers: cookie ? { cookie } : {} }));
const kopie = x => JSON.parse(JSON.stringify(x));
async function prihlas(e, h) { const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h }); const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t)); return (r.headers.get('set-cookie') || '').split(';')[0]; }
const uloz = async (zak, c, razitko) => { const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: razitko }, c); return { status: r.status, ...(await r.json()) }; };
const nacti = async (soubor, c) => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), c)).json()).zakazka;

const NASTSL = { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.03, 'Vedoucí': 0.12, 'Administrátor': 1 } };
const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const rp = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(), slevy: NASTSL, poznamka: 'k16' }, cA)).json();
if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
for (const [e, j, r] of [['obch1@priklad.cz', 'Obch Jedna', 'Obchodník'], ['obch2@priklad.cz', 'Obch Dva', 'Obchodník'], ['ved@priklad.cz', 'Ved Test', 'Vedoucí']]) {
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: e, jmeno: j, role: r, heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
}
const cO = await prihlas('obch1@priklad.cz', 'Heslo12345x'), cO2 = await prihlas('obch2@priklad.cz', 'Heslo12345x'), cV = await prihlas('ved@priklad.cz', 'Heslo12345x');

let n = 9600;
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++) + ' - TEST'; z.nazevAkce = 'TEST ' + nazev; z.objednatel = 'TEST – TESTOVACÍ ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.cenik = ZC.zkusebniCenik(); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
function prepocti(v, cast) {   // přesně jako slevaRefreshStavCast v prohlížeči
  const r = cast === 'proj' ? globalThis.vypocetProj(v.data.proj.zadani, v.data.proj.cenik) : globalThis.vypocet(v.data.ock.zadani, v.data.cenik, JEKLY, {});
  const s = r && r.souhrn; if (!s) return null;
  const sl = cast === 'proj' ? v.data.slevaProj : v.data.sleva;
  const zakl = cast === 'proj' ? s.celkem : s.zakladCena, nakl = cast === 'proj' ? s.naklad + (s.doprava || 0) : s.zakladNaklad;
  const vy = SL.slevaVyhodnot(zakl, nakl, sl, NASTSL);
  SCHV.schvalovaniPrepocti(sl, vy); return vy;
}
const zamkni = (z, v) => { const vysledek = zam.zamekVysledekSpocti(v, JEKLY, 'k16'); zam.zamkniVariantu(v, { typ: 'nabidka', kdy: new Date().toISOString(), kdo: 'Obch Jedna', cislo: zam.variantaCislo(z, v), vysledek }); };

/* S1 */ { const z = nova('S1 2 %'); Object.assign(z.varianty[0].data.sleva, { procenta: 2, role: 'Obchodník' }); const vy = prepocti(z.varianty[0], 'ock');
  const r = await uloz(z, cO); test('S1', 'obchodník: sleva 2 % (pod strop 3 %) se schválí automaticky a uloží', r.ok && z.varianty[0].data.sleva.stav === 'schváleno automaticky', { r, stav: z.varianty[0].data.sleva.stav, marze: vy && vy.marzePoSleve }); }
/* S2 */ { const z = nova('S2 role Admin'); Object.assign(z.varianty[0].data.sleva, { procenta: 10, role: 'Administrátor' }); prepocti(z.varianty[0], 'ock');
  const stavKlient = z.varianty[0].data.sleva.stav, plati = SL.slevaPlati(z.varianty[0].data.sleva);
  const r = await uloz(z, cO); test('S2', 'obchodník s „Role zadavatele = Administrátor": klient 10 % schválí sám, server uložení odmítne', stavKlient === 'schváleno automaticky' && plati && r.status === 403, { stavKlient, plati, status: r.status, chyba: r.chyba }); }
/* S3 */ { const z = nova('S3 podvrh'); Object.assign(z.varianty[0].data.sleva, { procenta: 10, role: 'Obchodník', stav: 'schváleno', schvalenoProc: 10, schvalil: 'Jaroslav Vendl', schvalilKdy: '2026-09-25T10:00:00Z' });
  const r = await uloz(z, cO); test('S3', 'obchodník podvrhne stav „schváleno" se jménem schvalovatele → 403', r.status === 403, { status: r.status, chyba: r.chyba }); }
/* S16 PROJ */ { const z = nova('S16 PROJ role Admin'); Object.assign(z.varianty[0].data.slevaProj, { procenta: 10, role: 'Administrátor' }); prepocti(z.varianty[0], 'proj');
  const stavKlient = z.varianty[0].data.slevaProj.stav; const r = await uloz(z, cO);
  test('S16', 'totéž u slevy PROJ: klient schválí sám, server 403', stavKlient === 'schváleno automaticky' && r.status === 403, { stavKlient, status: r.status, chyba: r.chyba }); }
/* S4 + S5 – „čeká" s rolí Administrátor, pak vedoucí jen otevře a uloží */
let s4soubor;
{ const z = nova('S4 čeká s rolí Admin'); Object.assign(z.varianty[0].data.sleva, { procenta: 10, role: 'Administrátor', stav: 'čeká na schválení' });
  const r = await uloz(z, cO); s4soubor = r.soubor;
  const sch = await (await get(schvalovani, 'http://x/api/schvalovani', cV)).json();
  const vidi = (sch.zadosti || []).some(x => x.soubor === r.soubor || JSON.stringify(x).includes('S4'));
  test('S4', 'obchodník uloží 10 % jako „čeká" s rolí Administrátor (server roli v datech slevy nehlídá)', r.ok, { r, vidiVedouci: vidi, pocetCeka: sch.pocetCeka }, 'informativní – příprava S5');
  const g = await nacti(r.soubor, cV); const zz = zk.importZakazka(kopie(g)); prepocti(zz.varianty[0], 'ock');
  const stavPoOtevreni = zz.varianty[0].data.sleva.stav;
  const r2 = await uloz(zz, cV, g.uloRazitko); const g2 = await nacti(r.soubor, cV);
  const sl = g2.varianty[0].data.sleva;
  test('S5', 'vedoucí zakázku jen otevře a uloží → sleva NESMÍ být schválená bez rozhodnutí', !(r2.ok && sl.stav === 'schváleno automaticky'), { stavPoOtevreni, ulozeno: r2.ok, stavNaServeru: sl.stav, schvalil: sl.schvalil || '(nikdo)' });
}
/* S17 (P1, vrstva 1) – role slevy se bere z relace, ne z dat */
{ const z = nova('S17 role z relace'); Object.assign(z.varianty[0].data.sleva, { procenta: 10, role: 'Administrátor', stav: 'čeká na schválení' });
  const r = await uloz(z, cO); const sl = (await nacti(r.soubor, cV)).varianty[0].data.sleva;
  test('S17', 'server přepíše roli slevy rolí relace (obchodník poslal „Administrátor")', r.ok && sl.role === 'Obchodník', { role: sl.role }); }
/* S18 (P1, vrstva 2) – bez změny procent nejde cizí žádost přepnout na „schváleno automaticky" */
{ const z = nova('S18 bez změny procent'); Object.assign(z.varianty[0].data.sleva, { procenta: 10, role: 'Obchodník', stav: 'čeká na schválení' });
  const r = await uloz(z, cO); const g = await nacti(r.soubor, cV); const zz = zk.importZakazka(kopie(g));
  Object.assign(zz.varianty[0].data.sleva, { stav: 'schváleno automaticky', role: 'Vedoucí' });
  const r2 = await uloz(zz, cV, g.uloRazitko); const sl = (await nacti(r.soubor, cV)).varianty[0].data.sleva;
  test('S18', 'vedoucí pošle cizí „čeká" 10 % jako „schváleno automaticky" bez změny procent → zůstane „čeká"',
    r2.ok && sl.stav === 'čeká na schválení' && sl.role === 'Obchodník', { ok: r2.ok, stav: sl.stav, role: sl.role }); }

/* S5b kontrola – totéž s rolí Obchodník */
{ const z = nova('S5b čeká s rolí Obchodník'); Object.assign(z.varianty[0].data.sleva, { procenta: 10, role: 'Obchodník', stav: 'čeká na schválení' });
  const r = await uloz(z, cO); const g = await nacti(r.soubor, cV); const zz = zk.importZakazka(kopie(g)); prepocti(zz.varianty[0], 'ock');
  const r2 = await uloz(zz, cV, g.uloRazitko); const sl = (await nacti(r.soubor, cV)).varianty[0].data.sleva;
  test('S5b', 'kontrola: s rolí Obchodník zůstane po uložení vedoucím „čeká na schválení"', r2.ok && sl.stav === 'čeká na schválení', { stav: sl.stav }); }
/* S6/S7 vedoucí schvaluje */
for (const [id, p, ok] of [['S6', 10, true], ['S7', 15, false]]) {
  const z = nova(id + ' vedoucí ' + p + ' %'); Object.assign(z.varianty[0].data.sleva, { procenta: p, role: 'Obchodník' }); prepocti(z.varianty[0], 'ock');
  const r = await uloz(z, cO); const g = await nacti(r.soubor, cV); const zz = zk.importZakazka(kopie(g));
  SCHV.schvalovaniSchval(zz.varianty[0].data.sleva, 'Ved Test'); const r2 = await uloz(zz, cV, g.uloRazitko);
  const sl = r2.ok ? (await nacti(r.soubor, cV)).varianty[0].data.sleva : null;
  test(id, 'vedoucí (strop 12 %) schvaluje ' + p + ' % → ' + (ok ? 'projde, razítko ze serveru' : '403'), ok ? (r2.ok && sl.stav === 'schváleno' && /Ved Test/.test(sl.schvalil)) : r2.status === 403, { status: r2.status, chyba: r2.chyba, schvalil: sl && sl.schvalil });
}
/* S8 tisk se „samoschválenou" slevou, pak uložení */
{ const z = nova('S8 tisk samoschválené'); const v = z.varianty[0]; Object.assign(v.data.sleva, { procenta: 10, role: 'Administrátor' }); prepocti(v, 'ock');
  const cenaBez = globalThis.vypocet(v.data.ock.zadani, v.data.cenik, JEKLY, {}).souhrn.zakladCena;
  zamkni(z, v); const r = await uloz(z, cO);
  test('S8', 'obchodník vytiskne (zamkne) nabídku se samoschválenou slevou 10 % a uloží → server odmítne; dokument ale už existuje', r.status === 403, { status: r.status, chyba: r.chyba, zamcenoVPameti: zam.variantaUzamcena(v), slevaVZamku: v.zamek && v.zamek.vysledek && JSON.stringify(v.zamek.vysledek).includes('"stav":"schváleno automaticky"') }, 'dokument vznikne dřív, než server cokoli řekne'); }
/* S9/S10 B56 a data zamčené varianty */
{ const z = nova('S9 zámek'); const v = z.varianty[0]; Object.assign(v.data.sleva, { procenta: 2, role: 'Obchodník' }); prepocti(v, 'ock'); zamkni(z, v);
  const r = await uloz(z, cO); test('S9a', 'obchodník uloží poctivě zamčenou variantu (2 %)', r.ok && !r.varovani, r);
  const g = await nacti(r.soubor, cO); const a = zk.importZakazka(kopie(g)); a.cislo = a.cislo.replace(/\d{4} - TEST$/, '9699 - TEST');
  const r2 = await uloz(a, cO, g.uloRazitko); test('S9b', 'obchodník změní číslo odeslané nabídky → 403 (B56)', r2.status === 403, { status: r2.status, chyba: r2.chyba });
  const b = zk.importZakazka(kopie(g)); b.varianty[0].data.ock.zadani.zdvih = 12; const r3 = await uloz(b, cO, g.uloRazitko);
  test('S10', 'obchodník změní data uzamčené varianty → odmítnuto (409)', r3.status === 409, { status: r3.status, chyba: r3.chyba });
  const c = zk.importZakazka(kopie(g)); c.varianty[0].odemceni = (c.varianty[0].odemceni || []).concat([{ kdo: 'x', kdy: 'x', duvod: 'x' }]); delete c.varianty[0].zamek;
  const r4 = await uloz(c, cO, g.uloRazitko); test('S14', 'obchodník „odemkne" odeslanou nabídku → 403', r4.status === 403, { status: r4.status, chyba: r4.chyba });
  const r5 = await del(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(r.soubor), cO); test('S11c', 'obchodník smaže zakázku → 403', r5.status === 403, { status: r5.status }); }
/* S11 správa */
{ const r1 = await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), poznamka: 'podvrh' }, cO); test('S11a', 'obchodník zveřejní ceník → 403', r1.status === 403, { status: r1.status });
  const r2 = await post(zobrazeni, 'http://x/api/zobrazeni', { matice: {} }, cO); test('S11b', 'obchodník změní matici zobrazení → 403', r2.status === 403, { status: r2.status });
  const r3 = await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'x@priklad.cz', jmeno: 'X', role: 'Administrátor', heslo: 'Heslo12345x' }, cO); test('S11d', 'obchodník založí účet → 403', r3.status === 403, { status: r3.status }); }
/* S12 – co obchodník dostane ze serveru (informativní) */
{ const g = await (await get(program, 'http://x/api/program', cO)).json(); const cen = g.db && g.db.platny && g.db.platny.cenik || {};
  const klice = Object.keys(cen); const nakl = klice.filter(k => /naklad|nakup|hod|sazba|mzda|rezie|prirazka/i.test(k));
  test('S12', 'obchodník si GET /api/program stáhne celý ceník vč. nákladových položek (by design: výpočet běží v prohlížeči)', g.ok && klice.length > 0, { klicu: klice.length, nakladovych: nakl.length, priklad: nakl.slice(0, 8) }, 'informativní'); }
/* S13 – vidí cizí zakázky? */
{ const z = nova('S13 cizí'); const r = await uloz(z, cO2); const l = await (await get(zakazky, 'http://x/api/zakazky', cO)).json();
  const seznam = l.zakazky || l.seznam || l.rejstrik || []; const vidi = JSON.stringify(seznam).includes('S13');
  const g = await nacti(r.soubor, cO); test('S13', 'obchodník 1 vidí a otevře zakázku obchodníka 2', vidi && !!g, { vidiVSeznamu: vidi, otevre: !!g }, 'informativní – sdílený rejstřík');
  const zz = zk.importZakazka(kopie(g)); zz.nazevAkce += ' upraveno'; const r2 = await uloz(zz, cO, g.uloRazitko); const g2 = await nacti(r.soubor, cO);
  test('S13b', 'obchodník 1 přepíše zakázku obchodníka 2; autor zůstane obchodník 2', r2.ok && g2.autor === 'obch2@priklad.cz', { ok: r2.ok, autor: g2.autor, upravil: g2.upravil }, 'informativní'); }
/* S15 – schvalovací rejstřík obchodníkovi */
{ const s = await (await get(schvalovani, 'http://x/api/schvalovani?vse=1', cO)).json(); test('S15', 'obchodník čte rejstřík všech žádostí o slevu (i cizích)', s.ok, { pocetCelkem: s.pocetCelkem, pocetCeka: s.pocetCeka }, 'informativní'); }

const ok = V.filter(x => x.ok).length; console.log(`\n${ok} prošlo, ${V.length - ok} selhalo`);
process.exit(V.length - ok ? 1 : 0);
