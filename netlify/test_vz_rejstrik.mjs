/* VZ-E6 (#606) — ZÁKAZNÍCI V REJSTŘÍKU ZAKÁZEK A V PŘEHLEDU CENOVÝCH NABÍDEK
 * (17. 11. 2026, návrh § 6).
 *
 * Sada hlídá:
 *   1) vypnuto / jeden zákazník: záznam rejstříku má PŘESNĚ dnešní klíče
 *      (žádný `zakaznici`) — i se zapnutou funkcí;
 *   2) zapnuto + dva zákazníci: `zakaznici: [{ nazev, cislo, stav }]` —
 *      řídící první, číslo s písmenem, `objednatel` = řídící; BEZ cen, IČO,
 *      sídel a kontaktů (kanárky v údajích B se do rejstříku nedostanou);
 *   3) po tisku pro B: stav B „odeslana" a číslo …-B; po odstranění B
 *      klíč zmizí;
 *   4) normalizace: 2–10 položek, jen nazev/cislo/stav, strop délky, neznámý
 *      stav → rozpracovana; jinak klíč zmizí; text štítku 2–4 zákazníci /
 *      5+ zákazníků;
 *   5) hledání (uloHledej) najde zakázku podle názvu dalšího zákazníka,
 *      bez klíče jen podle dnešních polí;
 *   6) Přehled: štítek „2 zákazníci" u zákazníka jen se zapnutou funkcí
 *      (onlineRadekZakazky ve vm, VYP = řádek znak po znaku jako bez klíče);
 *   7) controlling: jeden řádek za zakázku, Popis s počtem zákazníků,
 *      náklad stejný jako u téže zakázky s jedním zákazníkem.
 * Paměťové úložiště, smyšlený ceník, účty a firmy.
 * Pojistka: na 68e5eb8 (bez E6) sada padá — rejstřík klíč `zakaznici` nenese
 * a uloRejstrikZakazniciTvar / uloRejstrikZakazniciText neexistují.
 * Spuštění: node netlify/test_vz_rejstrik.mjs */
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
const { JEKLY } = await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const ULO = require(R + 'src/uloziste.js');
const G = globalThis;
if (typeof G.vzPridej !== 'function') throw new Error('jádro nenese vice_zakazniku.js');

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
const nacti = async (soubor, c) => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), c)).json()).zakazka;
const rejstrik = async (c) => { const s = await (await get(zakazky, 'http://x/api/zakazky', c)).json(); return (s.rejstrik && s.rejstrik.zakazky) || []; };
const zaznam = async (soubor, c) => (await rejstrik(c)).find(z => z && z.soubor === soubor) || null;
const vypinac = async (h, c) => (await post(funkce, 'http://x/api/funkce', { viceZakazniku: h }, c)).status;

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
{ const r = await post(program, 'http://x/api/program', { cenik: Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()), cenikProj: ZC.zkusebniCenikProj(), poznamka: 'VZ E6' }, cA);
  if (r.status !== 200) throw new Error('program ' + r.status); }

let n = 9700;
function nova(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++) + ' - TEST'; z.nazevAkce = 'TEST VZ E6 ' + nazev; z.objednatel = 'TEST – PRVNÍ ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.ock.fixes = true;
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
/* Kanárky v údajích B, které do rejstříku nesmí (sídlo, IČO, DIČ, kontakt, zástupci). */
const UDAJE_B = { objednatel: 'TEST – DRUHÝ ODBĚRATEL s.r.o.', adresaObjednatele: 'KANARSIDLOB 1, Testov', ico: '', dic: 'CZKANARDICB',
  kontakt: 'KANARKONTAKTB', zastupci: { smluvniJmeno: 'KANARZASTUPCEB', smluvniEmail: 'kanar.b@priklad.cz' } };
const PEVNE = { kdo: 'Správce', kdy: '2026-11-17T10:00:00.000Z' };
const zamkni = (z, v, komu) => G.zamkniVariantu(v, Object.assign({ typ: 'nabidkaTisk', kdy: new Date().toISOString(), kdo: 'Test VZ E6',
  cislo: G.variantaCislo(z, v), vysledek: G.zamekVysledekSpocti(v, JEKLY, 'vz-e6'), snimek: G.zamekSnimekSpocti(v) }, komu ? { zakaznik: komu } : {}));
const KLICE = ['soubor', 'autor', 'autorJmeno', 'cislo', 'nazevAkce', 'adresa', 'objednatel', 'datum', 'jenProj', 'rada', 'variant', 'odeslane', 'upraveno', 'ctrlDny'];

/* 1) vypnuto: jeden zákazník = dnešní rejstřík */
let jedenSoubor = '';
{ const z = nova('jeden zákazník');
  const r = await uloz(z, cA);
  jedenSoubor = r.soubor;
  const zz = await zaznam(r.soubor, cA);
  test('VYP: jeden zákazník se uloží (200)', r.status === 200, r);
  test('VYP: klíče záznamu jsou přesně dnešní (bez zakaznici)', zz && JSON.stringify(Object.keys(zz)) === JSON.stringify(KLICE), zz && Object.keys(zz));
  test('jeden zákazník: uloRejstrikZakaznici = {}', JSON.stringify(ULO.uloRejstrikZakaznici(z)) === '{}'); }
{ const z = nova('VYP s B'); G.vzPridej(z, UDAJE_B, PEVNE);
  const r = await uloz(z, cA);
  test('VYP: zakázka s druhým zákazníkem se neuloží (rejstřík se nemění)', r.status !== 200 && !(await zaznam(r.soubor || 'x', cA)), r.status); }

/* 2) zapnuto */
test('vypínač: správce zapne', await vypinac(true, cA) === 200);
{ const z = nova('ZAP jeden');
  const r = await uloz(z, cA);
  const zz = await zaznam(r.soubor, cA);
  test('ZAP + jeden zákazník: klíče záznamu dnešní (bez zakaznici)', zz && JSON.stringify(Object.keys(zz)) === JSON.stringify(KLICE), zz && Object.keys(zz)); }
let dva = null;
{ const z = nova('ZAP dva'); const p = G.vzPridej(z, UDAJE_B, PEVNE); if (!p.ok) throw new Error(p.chyba);
  const r = await uloz(z, cA);
  const zz = await zaznam(r.soubor, cA);
  dva = { soubor: r.soubor, cislo: G.variantaCislo(z, z.varianty[0]) };
  test('ZAP + dva zákazníci: uloženo (200)', r.status === 200, r);
  test('ZAP: zakaznici = [A rozpracovaná bez písmene, B rozpracovaná …-B], objednatel = řídící A',
    zz && JSON.stringify(zz.zakaznici) === JSON.stringify([
      { nazev: 'TEST – PRVNÍ ODBĚRATEL s.r.o.', cislo: dva.cislo, stav: 'rozpracovana' },
      { nazev: UDAJE_B.objednatel, cislo: dva.cislo + '-B', stav: 'rozpracovana' }]) && zz.objednatel === 'TEST – PRVNÍ ODBĚRATEL s.r.o.', zz && zz.zakaznici);
  const txt = JSON.stringify(zz);
  test('ZAP: rejstřík bez sídla, DIČ, kontaktu a zástupců B (kanárky)', !/KANAR/i.test(txt), txt.match(/KANAR\w*/gi));
  test('ZAP: položky jen nazev, cislo, stav (žádná cena, IČO, platna)',
    zz.zakaznici.every(x => JSON.stringify(Object.keys(x)) === '["nazev","cislo","stav"]') && !/cena|platna|ico/i.test(JSON.stringify(zz.zakaznici)));
  test('ZAP: klíč zakaznici jen navíc proti dnešku (pořadí ostatních beze změny)',
    JSON.stringify(Object.keys(zz).filter(k => k !== 'zakaznici')) === JSON.stringify(KLICE)); }

/* 3) tisk pro B → odeslaná; odstranění B → klíč zmizí */
{ const g = await nacti(dva.soubor, cA);
  const a = zk.importZakazka(kopie(g)); zamkni(a, a.varianty[0], { id: 'z2' });
  const r = await uloz(a, cA, g.uloRazitko);
  const zz = await zaznam(dva.soubor, cA);
  test('po tisku pro B: stav B odeslana, A dál rozpracovaná', r.status === 200 && zz.zakaznici[1].stav === 'odeslana' && zz.zakaznici[1].cislo === dva.cislo + '-B'
    && zz.zakaznici[0].stav === 'rozpracovana', { status: r.status, chyba: r.chyba, z: zz && zz.zakaznici });
  test('po tisku pro B: rejstřík pořád bez ceny (platna B v zakázce cenu má)', !/cena/.test(JSON.stringify(zz)) && typeof (await nacti(dva.soubor, cA)).dalsiZakaznici[0].platna.cena === 'number'); }
{ const z = nova('přidat a odstranit'); G.vzPridej(z, UDAJE_B, PEVNE);
  const r = await uloz(z, cA);
  const g = await nacti(r.soubor, cA);
  const a = zk.importZakazka(kopie(g)); const o = G.vzOdstran(a, 'z2', {});
  const r2 = await uloz(a, cA, g.uloRazitko);
  const zz = await zaznam(r.soubor, cA);
  test('odstranění posledního dalšího: klíč zakaznici zmizí, klíče dnešní', o.ok && r2.status === 200 && zz && JSON.stringify(Object.keys(zz)) === JSON.stringify(KLICE),
    { o, s: r2.status, k: zz && Object.keys(zz) }); }

/* 4) normalizace a text */
{ const N = s => ULO.uloRejstrikNormalizuj([{ soubor: 'a.json', zakaznici: s }])[0];
  const P = (nazev, stav) => ({ nazev, cislo: 'C-1', stav: stav || 'odeslana' });
  test('normalizace: platný tvar projde, klíče navíc (cena, ico) zmizí',
    JSON.stringify(N([Object.assign(P('A'), { cena: 123, ico: '1' }), P('B', 'prodano')]).zakaznici)
      === JSON.stringify([P('A'), P('B', 'prodano')]), N([Object.assign(P('A'), { cena: 123 }), P('B')]));
  test('normalizace: neznámý stav → rozpracovana', N([P('A', 'xx'), P('B')]).zakaznici[0].stav === 'rozpracovana');
  test('normalizace: dlouhý název oříznut na 300 znaků', N([P('x'.repeat(5000)), P('B')]).zakaznici[0].nazev.length === 300);
  test('normalizace: číslo jiného typu → prázdné', N([{ nazev: 'A', cislo: { x: 1 }, stav: 'odeslana' }, P('B')]).zakaznici[0].cislo === '');
  [['text', 'x'], ['objekt', { a: 1 }], ['null', null], ['jeden zákazník', [P('A')]], ['11 zákazníků', Array.from({ length: 11 }, (_, i) => P('Z' + i))],
    ['položka bez názvu', [P('A'), { cislo: 'x', stav: 'odeslana' }]], ['položka pole', [P('A'), ['B']]], ['položka null', [P('A'), null]]]
    .forEach(([nazev, s]) => test('normalizace: ' + nazev + ' → klíč zmizí', !('zakaznici' in N(s)), N(s)));
  test('normalizace: hranice 10 zákazníků projde', N(Array.from({ length: 10 }, (_, i) => P('Z' + i))).zakaznici.length === 10);
  test('normalizace: záznam bez klíče beze změny', !('zakaznici' in N(undefined)));
  const T = k => ULO.uloRejstrikZakazniciText({ zakaznici: Array.from({ length: k }, (_, i) => P('Z' + i)) });
  test('text: 2 zákazníci, 4 zákazníci, 5 zákazníků, 10 zákazníků', T(2) === '2 zákazníci' && T(4) === '4 zákazníci' && T(5) === '5 zákazníků' && T(10) === '10 zákazníků',
    [T(2), T(4), T(5), T(10)]);
  test('text: bez klíče prázdný', ULO.uloRejstrikZakazniciText({}) === '' && ULO.uloRejstrikZakazniciText(null) === ''); }

/* prodáno: vítěz (po výměně řídící) má stav „prodano", ostatní odeslaná */
{ const z = nova('prodáno'); G.vzPridej(z, UDAJE_B, PEVNE);
  const v = z.varianty[0];
  zamkni(z, v, G.vzRazitkoSnimek(z, 'z1', v)); zamkni(z, v, G.vzRazitkoSnimek(z, 'z2', v));
  v.prodano = { datum: '2026-11-17', kdo: 'x', kdy: PEVNE.kdy, zakaznik: 'z2' };
  G.vzVymenRidiciho(z, 'z2');
  const x = ULO.uloRejstrikZakaznici(z).zakaznici;
  test('prodáno B: B (řídící, první) prodano, A odeslaná', x && x[0].nazev === UDAJE_B.objednatel && x[0].stav === 'prodano'
    && x[1].stav === 'odeslana' && x[0].cislo.endsWith('-B'), x); }

/* strop: zakázka s 1 + 9 zákazníky → 10 položek */
{ const z = nova('deset');
  for (let i = 0; i < 9; i++) { const p = G.vzPridej(z, { objednatel: 'TEST – ODBĚRATEL ' + i }, PEVNE); if (!p.ok) throw new Error(p.chyba); }
  const x = ULO.uloRejstrikZakaznici(z).zakaznici;
  test('1 + 9 zákazníků → 10 položek, písmena B…J', x.length === 10 && x[9].cislo.endsWith('-J'), x && x.map(y => y.cislo.slice(-2))); }

/* 5) hledání */
{ const rj = await rejstrik(cA);
  const h = d => ULO.uloHledej(rj, d).map(z => z.soubor);
  test('hledání: „druhy odberatel" najde zakázky s B (bez diakritiky)', h('druhy odberatel').includes(dva.soubor) && !h('druhy odberatel').includes(jedenSoubor), h('druhy odberatel'));
  test('hledání: číslo nabídky B (…-B) najde zakázku', h(dva.cislo + '-B').includes(dva.soubor));
  test('hledání: kanárek sídla B nenajde nic (rejstřík ho nenese)', h('KANARSIDLOB').length === 0);
  test('hledání bez dotazu vrací vše', h('').length === rj.length); }

/* 5b) seznam variant zakázky: varianta se najde i podle názvu zákazníka, který na ni ukazuje */
{ const S = require(R + 'src/seznam.js');
  const z = nova('seznam'); G.vzPridej(z, UDAJE_B, PEVNE); G.vzPridej(z, { objednatel: 'TEST – VLASTNÍ ODBĚRATEL a.s.' }, Object.assign({ vlastni: true }, PEVNE));
  const r = S.seznamHledej(S.seznamRadky(z), 'druhy odberatel').map(x => x.id);
  const r2 = S.seznamHledej(S.seznamRadky(z), 'vlastni odberatel').map(x => x.id);
  test('seznam variant: „druhy odberatel" najde sdílenou V1 (ne vlastní variantu C)', r.length === 1 && r[0] === z.varianty[0].id, r);
  test('seznam variant: „vlastni odberatel" najde jen jeho variantu', r2.length === 1 && r2[0] === z.dalsiZakaznici[1].varianta, r2);
  const j = nova('seznam jeden');
  const h1 = S.seznamRadky(j)[0].hledatelne;
  G.vzPridej(j, UDAJE_B, PEVNE); G.vzOdstran(j, 'z2', {});
  test('seznam variant: jeden zákazník — hledatelný text beze změny (i po přidání a odstranění)', S.seznamRadky(j)[0].hledatelne === h1); }

/* 6) štítek v Přehledu jen se zapnutou funkcí */
{ const fs = await import('node:fs');
  const vm = await import('node:vm');
  const src = fs.readFileSync(R + 'src/ui/online_ui.js', 'utf8');
  const i = src.indexOf('function onlineRadekZakazky');
  const telo = src.slice(i, src.indexOf('\n}\n', i) + 3);
  let zap = false;
  const ctx = vm.createContext({ ONLINE_STAV: { soubor: '' }, esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
    escJs: s => String(s), onlineVybrano: () => false, uloObchodnik: z => z.autor || '—', uloDruhZakazky: () => 'OCK',
    uloRejstrikSachtyText: () => '', viceSachetZapnuto: () => false, viceZakaznikuZapnuto: () => zap,
    uloRejstrikZakazniciText: ULO.uloRejstrikZakazniciText });
  vm.runInContext(telo, ctx);
  const zz = (await rejstrik(cA)).find(z => z.soubor === dva.soubor);
  const bez = Object.assign({}, zz); delete bez.zakaznici;
  const vyp = ctx.onlineRadekZakazky(zz, false);
  test('Přehled VYP: řádek se zákazníky = řádek bez klíče znak po znaku', vyp === ctx.onlineRadekZakazky(bez, false));
  zap = true;
  const zapR = ctx.onlineRadekZakazky(zz, false);
  test('Přehled ZAP: štítek „2 zákazníci" u zákazníka s názvy v titulku',
    /<span class="pill vz-stitek" title="Zákazníci zakázky: TEST – PRVNÍ ODBĚRATEL s.r.o., TEST – DRUHÝ ODBĚRATEL s.r.o.">2 zákazníci<\/span><\/td>/.test(zapR), zapR.match(/vz-stitek[^<]*<\/span>/));
  test('Přehled ZAP: zakázka bez klíče bez štítku', ctx.onlineRadekZakazky(bez, false) === vyp);
  const zl = Object.assign({}, zz, { zakaznici: [{ nazev: '<img src=x onerror=1>', cislo: '', stav: 'odeslana' }, { nazev: 'B', cislo: '', stav: 'odeslana' }] });
  test('Přehled ZAP: název v titulku escapovaný', ctx.onlineRadekZakazky(zl, false).indexOf('<img') < 0); }

/* 7) controlling: jeden řádek, počet zákazníků v Popisu, nic dvakrát */
{ const C = require(R + 'src/controlling.js');
  const g = await nacti(dva.soubor, cA);
  const a = zk.importZakazka(kopie(g));
  const v = a.varianty[0];
  const e = C.ctrlExportVarianty(a, v, { jekly: JEKLY });
  test('controlling: ctrlZakazniciText 2 / 5', C.ctrlZakazniciText(2) === '2 zákazníci' && C.ctrlZakazniciText(5) === '5 zákazníků');
  if (e && e.ok) {
    const jeden = zk.importZakazka(kopie(g)); delete jeden.dalsiZakaznici; delete jeden.vzRidici;
    const e1 = C.ctrlExportVarianty(jeden, jeden.varianty[0], { jekly: JEKLY });
    test('controlling: hlavička nese „2 zákazníci", zákazník = řídící', e.hlavicka.zakaznici === '2 zákazníci' && e.hlavicka.zakaznik === 'TEST – PRVNÍ ODBĚRATEL s.r.o.', e.hlavicka);
    test('controlling: strany a řádky shodné s toutéž zakázkou s jedním zákazníkem (nic dvakrát)',
      JSON.stringify(e.strany) === JSON.stringify(e1.strany) && e.radky.length === e1.radky.length && !('zakaznici' in e1.hlavicka));
    const popis = l => (C.ctrlExportListy(l, C.ctrlVychozi()).find(x => x.nazev === 'Popis') || { rows: [] }).rows;
    const pv = popis(e).find(r => r[0] === 'Zákazníci zakázky');
    test('controlling: list Popis nese řádek „Zákazníci zakázky — 2 zákazníci…"', pv && /^2 zákazníci — export je za zakázku jednou/.test(pv[1]), pv);
    test('controlling: jeden zákazník — Popis bez řádku zákazníků (beze změny)', !popis(e1).some(r => r[0] === 'Zákazníci zakázky'));
  } else test('controlling: export varianty jde sestavit', false, e);
}

test('vypínač: správce vypne', await vypinac(false, cA) === 200);
{ const j = await zaznam(jedenSoubor, cA), d = await zaznam(dva.soubor, cA);
  test('VYP znovu: jeden zákazník beze změny, zakázka s víc zákazníky nese uložené zakaznici (data se nemažou)',
    j && !('zakaznici' in j) && d && Array.isArray(d.zakaznici)); }

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
