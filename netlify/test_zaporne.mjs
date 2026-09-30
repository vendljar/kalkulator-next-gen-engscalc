/* B111 (29. 9. 2026) — ZÁPORNÁ ČÁSTKA, MNOŽSTVÍ NEBO HODINY HLÍDÁ SERVER.
 *
 * 21. kolo: obchodník v běžném UI přidal „+ přidat položku" s cenou
 * −302 167 Kč a cena nabídky OCK spadla z 980 000 na 617 000 Kč (−37 %) bez
 * schválení, bez varování marže a beze stopy v dokumentu. Záporná položka
 * sníží vykázaný náklad i cenu stejným poměrem, takže ani kontrola marže
 * (B71) nic nepozná. Tady se ověřuje hranice: server zápornou částku,
 * množství ani hodiny nepřijme od nikoho (ani od administrátora — dobropis
 * ne, jako N56), a to při uložení i při obnově ze zálohy (B72/P4).
 *
 * Pojistka proti prázdnému testu: proti kódu před opravou (v29.9.1) útoky
 * vracejí 200; pozitivní kontroly (kladná položka, odeslaná varianta beze
 * změny) musejí projít i po opravě.
 *
 * Spuštění: node netlify/test_zaporne.mjs */
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
const { default: obnova } = await import(R + 'netlify/functions/obnova.mjs');
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

/* Stropy jako v overit_schvalovani.mjs: Obchodník 5 %, Vedoucí 15 %, minMarze 10 %. */
const NASTSL = { minMarze: 0.10, maxGlobalni: 1, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15, 'Administrátor': 1 } };
const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const rp = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(), slevy: NASTSL, poznamka: 'B111' }, cA)).json();
if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
for (const [e, j, r] of [['obch.zaporne@priklad.cz', 'Obch Záporný', 'Obchodník'], ['ved.zaporne@priklad.cz', 'Ved Záporný', 'Vedoucí']]) {
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: e, jmeno: j, role: r, heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
}
const cO = await prihlas('obch.zaporne@priklad.cz', 'Heslo12345x');
const cV = await prihlas('ved.zaporne@priklad.cz', 'Heslo12345x');

let n = 9700;
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++) + ' - TEST'; z.nazevAkce = 'TEST ' + nazev; z.objednatel = 'TEST – TESTOVACÍ ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.cenik = ZC.zkusebniCenik(); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
const cenaOck = (v) => globalThis.vypocet(v.data.ock.zadani, v.data.cenik, JEKLY, {}).souhrn.zakladCena;
const cenaProj = (v) => globalThis.vypocetProj(v.data.proj.zadani, v.data.proj.cenik).souhrn.celkem;
const vlastni = (v, sekce, polozka) => {
  const z = v.data.ock.zadani; z.vlastniPolozky = z.vlastniPolozky || {};
  (z.vlastniPolozky[sekce] = z.vlastniPolozky[sekce] || []).push(polozka);
};
const pocetZakazek = () => [...pamet.keys()].filter(k => k.startsWith('zakazky/z/')).length;

console.log('===== B111: záporná částka, množství a hodiny =====');

/* 1) útok z 21. kola: obchodník, vlastní položka −302 167 Kč v hrubé OCK */
{ const z = nova('B111 útok');
  const pred = cenaOck(z.varianty[0]);
  vlastni(z.varianty[0], 'hrubaOck', { nazev: 'Obchodní úprava', mnozstvi: 1, cena: -302167 });
  const po = cenaOck(z.varianty[0]);
  const pocet = pocetZakazek();
  const r = await uloz(z, cO);
  test('B111: obchodník uloží vlastní položku −302 167 Kč → 400 s „záporn" v hlášce', r.status === 400 && /záporn/i.test(r.chyba || ''),
    { status: r.status, chyba: r.chyba, cenaPred: pred, cenaPo: po });
  test('B111: odmítnutá zakázka se do úložiště nezapsala', pocetZakazek() === pocet, { pred: pocet, po: pocetZakazek() });
  test('B111: hláška řekne variantu a cestu (tvar #340)', /varianta [^:]+: ock\.zadani\.vlastniPolozky\.hrubaOck\[0\]\.cena/.test(r.chyba || ''), r.chyba);
}
/* 2) pozitivní kontrola: táž položka kladně projde (pravidlo neodmítá všechno) */
{ const z = nova('B111 kladná');
  vlastni(z.varianty[0], 'hrubaOck', { nazev: 'Obchodní úprava', mnozstvi: 1, cena: 302167 });
  const r = await uloz(z, cO);
  test('B111: kontrola — kladná vlastní položka +302 167 Kč se uloží (200)', r.status === 200 && r.ok, r); }
/* 3) záporné množství, i jako text */
{ const z = nova('B111 množství');
  vlastni(z.varianty[0], 'rezie', { nazev: 'Obchodní úprava', mnozstvi: -1, cena: 302167 });
  const r = await uloz(z, cO);
  test('B111: záporné množství vlastní položky → 400', r.status === 400 && /záporn/i.test(r.chyba || ''), r); }
{ const z = nova('B111 text');
  vlastni(z.varianty[0], 'volitelne', { nazev: 'Obchodní úprava', mnozstvi: 1, cena: '-5000,5' });
  const r = await uloz(z, cO);
  test('B111: záporná cena zapsaná textem („-5000,5") → 400', r.status === 400 && /záporn/i.test(r.chyba || ''), r); }
/* 4) typ polí vlastní položky */
{ const z = nova('B111 typ');
  vlastni(z.varianty[0], 'hrubaOck', { nazev: 'X', mnozstvi: 1, cena: 'zadarmo' });
  const r = await uloz(z, cO);
  test('B111: vlastní položka s cenou, která není číslo → 400', r.status === 400, r); }
{ const z = nova('B111 typ pole');
  z.varianty[0].data.ock.zadani.vlastniPolozky = { hrubaOck: { nazev: 'X', cena: -1 } };
  const r = await uloz(z, cO);
  test('B111: vlastniPolozky.<sekce> není pole → 400', r.status === 400, r); }
/* 5) příplatky, starší volitelneVlastni, přepisy množství a ceny */
{ const z = nova('B111 příplatek'); z.varianty[0].data.ock.zadani.priplatkyVlastni = [{ nazev: 'Úprava', mnozstvi: 1, cena: -10000 }];
  const r = await uloz(z, cO); test('B111: záporný vlastní příplatek → 400', r.status === 400 && /záporn/i.test(r.chyba || ''), r); }
{ const z = nova('B111 starší volitelné'); z.varianty[0].data.ock.zadani.volitelneVlastni = [{ nazev: 'Úprava', mnozstvi: 1, cena: -10000 }];
  const r = await uloz(z, cO); test('B111: záporná položka ve starším volitelneVlastni → 400', r.status === 400 && /záporn/i.test(r.chyba || ''), r); }
{ const z = nova('B111 přepis množství'); z.varianty[0].data.ock.zadani.mnozstviPrepis = { 'MONTÁŽ NA STAVBĚ': -50 };
  const r = await uloz(z, cO); test('B111: záporný ruční přepis množství → 400', r.status === 400 && /záporn/i.test(r.chyba || ''), r); }
{ const z = nova('B111 přepis ceny'); z.varianty[0].data.ock.zadani.cenyPrepis = { 'Libovolná položka': -1 };
  const r = await uloz(z, cO); test('B111: záporný ruční přepis ceny → 400', r.status === 400 && /záporn/i.test(r.chyba || ''), r); }
/* 6) hodiny N56 (dosud hlídané jen v UI) */
{ const z = nova('B111 hodiny'); z.varianty[0].data.ock.zadani.montazZakladHod = -200;
  const r = await uloz(z, cO); test('B111/N56: záporné hodiny montáže → 400 (dřív jen v UI)', r.status === 400 && /záporn/i.test(r.chyba || ''), r); }
/* 7) PROJ: vlastní fixní položka a hodiny */
{ const z = nova('B111 PROJ fix');
  const s = z.varianty[0].data.proj.zadani.sekce[0];
  const pred = cenaProj(z.varianty[0]);
  s.polozky.push({ nazev: 'Obchodní úprava', typ: 'fix', cena: -90400, vlastni: true });
  const po = cenaProj(z.varianty[0]);
  const r = await uloz(z, cO);
  test('B111: vlastní fixní položka PROJ −90 400 Kč → 400', r.status === 400 && /záporn/i.test(r.chyba || ''), { status: r.status, chyba: r.chyba, pred, po }); }
{ const z = nova('B111 PROJ hodiny');
  const s = z.varianty[0].data.proj.zadani.sekce.find(x => (x.polozky || []).some(p => p.typ !== 'fix'));
  const p = s.polozky.find(x => x.typ !== 'fix'); p.hodiny = -200;
  const r = await uloz(z, cO);
  test('B111/N56: záporné hodiny PROJ ručním požadavkem → 400', r.status === 400 && /záporn/i.test(r.chyba || ''), r); }
{ const z = nova('B111 PROJ přepis');
  const s = z.varianty[0].data.proj.zadani.sekce.find(x => (x.polozky || []).some(p => p.fixKey));
  s.polozky.find(x => x.fixKey).cenaPrepis = -1;
  const r = await uloz(z, cO);
  test('B111: záporný přepis ceny PROJ (cenaPrepis) → 400', r.status === 400 && /záporn/i.test(r.chyba || ''), r); }
/* 8) vedoucí ani administrátor výjimku nemají (výchozí návrh: dobropis ne) */
for (const [role, c] of [['Vedoucí', cV], ['Administrátor', cA]]) {
  const z = nova('B111 ' + role); vlastni(z.varianty[0], 'hrubaOck', { nazev: 'Dobropis', mnozstvi: 1, cena: -302167 });
  const r = await uloz(z, c);
  test('B111: ' + role + ' se zápornou položkou → 400', r.status === 400 && /záporn/i.test(r.chyba || ''), r);
}
/* 9) úprava uložené zakázky: přidání záporné položky do už uložené varianty */
{ const z = nova('B111 úprava'); const r = await uloz(z, cO);
  const g = await nacti(r.soubor, cO); const a = zk.importZakazka(kopie(g));
  vlastni(a.varianty[0], 'hrubaOck', { nazev: 'Obchodní úprava', mnozstvi: 1, cena: -302167 });
  const r2 = await uloz(a, cO, g.uloRazitko); const g2 = await nacti(r.soubor, cO);
  test('B111: záporná položka přidaná do uložené zakázky → 400 a úložiště beze změny',
    r2.status === 400 && JSON.stringify(g2.varianty[0].data.ock.zadani.vlastniPolozky) === JSON.stringify(g.varianty[0].data.ock.zadani.vlastniPolozky),
    { status: r2.status, chyba: r2.chyba }); }
/* 10) nový zámek se zápornou položkou nevznikne */
{ const z = nova('B111 nový zámek'); const v = z.varianty[0];
  vlastni(v, 'hrubaOck', { nazev: 'Obchodní úprava', mnozstvi: 1, cena: -302167 });
  zam.zamkniVariantu(v, { cislo: zam.variantaCislo(z, v), typ: 'nabidka', kdo: 'Obch Záporný', vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'B111') });
  const r = await uloz(z, cO);
  test('B111: nový zámek (odeslání) se zápornou položkou → 400', r.status === 400 && /záporn/i.test(r.chyba || ''), r); }
/* 11) doklad: varianta zamčená už v uložené verzi, která zápornou položku
 * nese (vložená přímo do úložiště z doby před opravou), se beze změny uloží */
{ const z = nova('B111 doklad'); const r = await uloz(z, cO);
  const klic = 'zakazky/z/' + r.soubor;
  const ul = JSON.parse(pamet.get(klic)); const v = ul.varianty[0];
  vlastni(v, 'hrubaOck', { nazev: 'Historická úprava', mnozstvi: 1, cena: -1000 });
  zam.zamkniVariantu(v, { cislo: zam.variantaCislo(ul, v), typ: 'nabidka', kdo: 'Historie', vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'B111') });
  pamet.set(klic, JSON.stringify(ul));
  const g = await nacti(r.soubor, cO); const a = zk.importZakazka(kopie(g)); a.nazevAkce += ' (poznámka)';
  const r2 = await uloz(a, cO, g.uloRazitko);
  test('B111: odeslaná varianta, která zápornou položku už nese, se beze změny uloží (200 — doklad)', r2.status === 200 && r2.ok, r2); }
/* 12) obnova ze zálohy: tatáž kontrola (B72/P4) — zakázka se přeskočí s důvodem */
{ const z = nova('B111 obnova'); vlastni(z.varianty[0], 'hrubaOck', { nazev: 'Obchodní úprava', mnozstvi: 1, cena: -302167 });
  const jm = z.cislo.replace(/\s+/g, '') + '.json';
  const o = await (await post(obnova, 'http://x/api/obnova', { zdroj: { soubor: { porizena: new Date().toISOString(), zakazky: { [jm]: z } } },
    rezim: 'prepsat', potvrzeni: 'OBNOVIT', casti: ['zakazky'] }, cA)).json();
  const zk2 = o.casti && o.casti.zakazky;
  test('B111: obnova ze zálohy se zápornou položkou → zakázka přeskočena s důvodem „záporn"',
    o.ok === true && zk2 && zk2.preskocene === 1 && /záporn/i.test(JSON.stringify(zk2.duvody || [])) && !pamet.has('zakazky/z/' + jm), zk2 || o); }

/* 13) detekční skript (nastroje/detekce_zneuziti.mjs) najde i zamčenou
 * variantu z doby před opravou a kladnou položku nehlásí */
{ const { detekuj } = await import(R + 'nastroje/detekce_zneuziti.mjs');
  const zal = { zakazky: {} };
  for (const k of [...pamet.keys()].filter(k => k.startsWith('zakazky/z/'))) zal.zakazky[k.slice(10)] = JSON.parse(pamet.get(k));
  const nal = detekuj(zal);
  test('B111: detekční skript najde v záloze zamčenou variantu se zápornou položkou (doklad z doby před opravou)',
    nal.some(x => x.kontrola === 'B111' && x.zamcena && x.mista.some(m => /vlastniPolozky\.hrubaOck\[0\]\.cena/.test(m))), nal);
  test('B111: detekční skript nehlásí zakázky s kladnými položkami', nal.every(x => x.zamcena), nal.map(x => x.cislo)); }

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
