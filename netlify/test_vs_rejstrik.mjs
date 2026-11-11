/* VS #570 / E6 (#596) — ŠTÍTEK ŠACHET V REJSTŘÍKU ZAKÁZEK (10. 11. 2026).
 *
 * Bod 8 předávky E5: Přehled cenových nabídek čte rejstřík ze serveru, ale
 * rejstřík šachty nenesl — štítek „2 varianty / 3 ks" šel jen z otevřené
 * zakázky. Sada hlídá:
 *   1) vypnuto: zakázka s jednou šachtou má v rejstříku PŘESNĚ dnešní klíče
 *      (žádný `sachty`), záznam = uloRejstrikZaznam beze změny;
 *   2) zapnuto: zakázka s víc šachtami nese `sachty: { variant, celkem }`
 *      podle ŘÍDÍCÍ varianty (ne první), jedna šachta dál bez klíče;
 *      jedna varianta × 3 ks = { 1, 3 };
 *   3) snížení na jednu šachtu (dalsi: [], ks 1) klíč při dalším uložení
 *      odebere;
 *   4) normalizace: poškozený / mimo meze / jedna šachta → klíč zmizí;
 *      text štítku 1 varianta / 2–4 varianty / 5+ variant;
 *   5) štítek v Přehledu jen se zapnutou funkcí (onlineRadekZakazky).
 * Paměťové úložiště, smyšlený ceník a účty.
 * Pojistka: na b751e57 (bez E6) sada padá — rejstřík klíč `sachty` nenese
 * a uloRejstrikSachtyTvar / uloRejstrikSachtyText neexistují.
 * Spuštění: node netlify/test_vs_rejstrik.mjs */
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
const { default: funkce } = await import(R + 'netlify/functions/funkce.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const ULO = require(R + 'src/uloziste.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 400)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const kopie = x => JSON.parse(JSON.stringify(x));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const uloz = async (zak, c, razitko) => { const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: razitko }, c); return { status: r.status, ...(await r.json()) }; };
const rejstrik = async (c) => { const s = await (await get(zakazky, 'http://x/api/zakazky', c)).json(); return (s.rejstrik && s.rejstrik.zakazky) || []; };
const zaznam = async (soubor, c) => (await rejstrik(c)).find(z => z && z.soubor === soubor) || null;
const vypinac = async (h, c) => (await post(funkce, 'http://x/api/funkce', { viceSachet: h }, c)).status;

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
{ const r = await post(program, 'http://x/api/program', { cenik: Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()), cenikProj: ZC.zkusebniCenikProj(), poznamka: 'VS E6' }, cA);
  if (r.status !== 200) throw new Error('program ' + r.status); }

let n = 9600;
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++) + ' - TEST'; z.nazevAkce = 'TEST VS E6 ' + nazev; z.objednatel = 'TEST – TESTOVACÍ ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.ock.fixes = true;
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
const sDalsi = (ock, ks) => { ock.nazev = 'Výtah A'; ock.dalsi = [{ id: 's_b1', nazev: 'Výtah B', ks: ks || 2, zadani: Object.assign(kopie(ock.zadani), { zdvih: 12 }) }]; };

/* 1) vypnuto: jedna šachta = dnešní rejstřík */
let jedna = null;
{ const z = nova('jedna šachta');
  const r = await uloz(z, cA);
  jedna = r.soubor;
  const zz = await zaznam(r.soubor, cA);
  test('vypnuto: jedna šachta se uloží (200)', r.status === 200, r);
  test('vypnuto: záznam rejstříku bez klíče sachty', zz && !('sachty' in zz), zz);
  const KLICE = ['soubor', 'autor', 'autorJmeno', 'cislo', 'nazevAkce', 'adresa', 'objednatel', 'datum', 'jenProj', 'rada', 'variant', 'odeslane', 'upraveno', 'ctrlDny'];
  test('vypnuto: klíče záznamu jsou přesně dnešní (b751e57)', zz && JSON.stringify(Object.keys(zz)) === JSON.stringify(KLICE), zz && Object.keys(zz));
  test('jedna šachta: uloRejstrikSachty = {}', JSON.stringify(ULO.uloRejstrikSachty(z)) === '{}'); }

/* 2) zapnuto: víc šachet nese počty řídící varianty */
test('vypínač: správce zapne', await vypinac(true, cA) === 200);
let vs = null, razVs = null;
{ const z = nova('dvě šachty'); sDalsi(z.varianty[0].data.ock, 2);
  const r = await uloz(z, cA);
  vs = r.soubor; razVs = r.razitko;
  const zz = await zaznam(r.soubor, cA);
  test('zapnuto: víc šachet se uloží (200)', r.status === 200, r);
  test('zapnuto: rejstřík nese sachty { variant 2, celkem 3 }', zz && zz.sachty && zz.sachty.variant === 2 && zz.sachty.celkem === 3, zz);
  test('zapnuto: text štítku „2 varianty / 3 ks"', ULO.uloRejstrikSachtyText(zz) === '2 varianty / 3 ks', ULO.uloRejstrikSachtyText(zz)); }
{ const z = nova('jedna × 3 ks'); z.varianty[0].data.ock.ks = 3;
  const r = await uloz(z, cA);
  const zz = await zaznam(r.soubor, cA);
  test('zapnuto: jedna varianta × 3 ks → { 1, 3 }, „1 varianta / 3 ks"', zz && zz.sachty && zz.sachty.variant === 1 && zz.sachty.celkem === 3
    && ULO.uloRejstrikSachtyText(zz) === '1 varianta / 3 ks', zz); }
{ const z = nova('jedna šachta zapnuto');
  const r = await uloz(z, cA);
  const zz = await zaznam(r.soubor, cA);
  test('zapnuto: jedna šachta dál bez klíče sachty', zz && !('sachty' in zz), zz); }
{ /* řídící varianta, ne první */
  const z = nova('řídící druhá');
  const v2 = kopie(z.varianty[0]); v2.id = 'v_druha'; v2.ridici = true; z.varianty[0].ridici = false;
  sDalsi(v2.data.ock, 4); z.varianty.push(v2);
  test('řídící varianta 2 → počty z ní { 2, 5 }', JSON.stringify(ULO.uloRejstrikSachty(z)) === JSON.stringify({ sachty: { variant: 2, celkem: 5 } }), ULO.uloRejstrikSachty(z));
  z.varianty[0].ridici = true; v2.ridici = false;
  test('řídící varianta 1 (jedna šachta) → bez klíče, i když jiná varianta šachty má', JSON.stringify(ULO.uloRejstrikSachty(z)) === '{}', ULO.uloRejstrikSachty(z)); }

/* 3) snížení na jednu šachtu klíč odebere */
{ const g = (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(vs), cA)).json()).zakazka;
  g.varianty[0].data.ock.dalsi = []; g.varianty[0].data.ock.ks = 1;
  const r = await uloz(g, cA, razVs);
  const zz = await zaznam(vs, cA);
  test('snížení na jednu šachtu: uloženo (200) a klíč sachty zmizel', r.status === 200 && zz && !('sachty' in zz), [r.status, zz]); }

/* 4) normalizace a text */
{ const N = s => ULO.uloRejstrikNormalizuj([{ soubor: 'a.json', sachty: s }])[0];
  test('normalizace: platný tvar projde', JSON.stringify(N({ variant: 3, celkem: 7, x: 1 }).sachty) === '{"variant":3,"celkem":7}');
  [['text', 'x'], ['pole', [2, 3]], ['null', null], ['variant 0', { variant: 0, celkem: 1 }], ['variant 11', { variant: 11, celkem: 11 }],
    ['celkem < variant', { variant: 3, celkem: 2 }], ['celkem nad 20 × variant', { variant: 2, celkem: 41 }], ['desetinné', { variant: 2, celkem: 2.5 }],
    ['řetězce', { variant: '2', celkem: '3' }], ['jedna šachta 1/1', { variant: 1, celkem: 1 }]]
    .forEach(([nazev, s]) => test('normalizace: ' + nazev + ' → klíč zmizí', !('sachty' in N(s)), N(s)));
  test('normalizace: hranice 10 variant × 20 ks projde', !!N({ variant: 10, celkem: 200 }).sachty);
  test('normalizace: záznam bez sachty beze změny klíčů', !('sachty' in N(undefined)));
  test('text: 5 variant / 7 ks', ULO.uloRejstrikSachtyText({ sachty: { variant: 5, celkem: 7 } }) === '5 variant / 7 ks');
  test('text: 4 varianty / 4 ks', ULO.uloRejstrikSachtyText({ sachty: { variant: 4, celkem: 4 } }) === '4 varianty / 4 ks');
  test('text: bez klíče prázdný', ULO.uloRejstrikSachtyText({}) === '' && ULO.uloRejstrikSachtyText(null) === ''); }

/* 5) vypnutí: rejstřík jedné šachty dál beze změny */
test('vypínač: správce vypne', await vypinac(false, cA) === 200);
{ const z = nova('po vypnutí');
  const r = await uloz(z, cA);
  const zz = await zaznam(r.soubor, cA);
  const j = await zaznam(jedna, cA);
  test('vypnuto znovu: jedna šachta bez klíče sachty (obě zakázky)', zz && !('sachty' in zz) && j && !('sachty' in j), [zz, j]); }

/* 6) štítek v Přehledu jen se zapnutou funkcí (UI funkce ve zdrojáku) */
{ const fs = await import('node:fs');
  const src = fs.readFileSync(R + 'src/ui/online_ui.js', 'utf8');
  const i = src.indexOf('function onlineRadekZakazky');
  const telo = src.slice(i, src.indexOf('\n}\n', i));
  test('Přehled: štítek z uloRejstrikSachtyText jen při viceSachetZapnuto()', /viceSachetZapnuto\(\)[\s\S]*uloRejstrikSachtyText\(z\)/.test(telo)
    && /\$\{sachty\}/.test(telo)); }

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
