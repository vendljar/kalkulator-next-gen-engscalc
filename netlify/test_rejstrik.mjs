/* ADRESA STAVBY V REJSTŘÍKU ZAKÁZEK (P15 / K16-N85, kolo 16, dávka B;
 * 25. 9. 2026).
 *
 * Obchodník hledá zakázku podle místa stavby, ne podle čísla — rejstřík ale
 * adresu nenesl, takže ji hledání v Přehledu cenových nabídek nemohlo najít.
 * Sada hlídá tři věci:
 *   1) nově uložená zakázka má adresu v rejstříku (i prázdnou, jako hodnotu),
 *   2) STARŠÍ záznamy bez adresy server doplní po dávkách při ukládání
 *      (ULO_ADRESY_DAVKA najednou), dokud nějaký chybí,
 *   3) hledání najde zakázku podle adresy, i „strasse" podle „Straße".
 *
 * Paměťové úložiště, zkušební ceník. Spuštění: node netlify/test_rejstrik.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: program } = await import('./functions/program.mjs');
const { default: zakazky } = await import('./functions/zakazky.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
Object.assign(globalThis, require('../src/format.js'), require('../src/engine.js'), require('../src/engine_proj.js'),
  require('../src/techspec.js'), require('../src/sleva.js'), require('../src/zaokrouhleni.js'), require('../src/zamek.js'));
const zk = require('../src/zakazka.js');
const ZC = require('../src/zkusebni_cenik.js');
const ULO = require('../src/uloziste.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h }))
  .headers.get('set-cookie') || '').split(';')[0];
const rejstrik = async (c) => {
  const s = await (await get(zakazky, 'http://x/api/zakazky', c)).json();
  return (s.rejstrik && s.rejstrik.zakazky) || [];
};
const zaznam = async (soubor, c) => (await rejstrik(c)).find(z => z && z.soubor === soubor) || null;

const cA = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.03, 'Vedoucí': 0.12, 'Administrátor': 1 } } }, cA);

function nova(cislo, adresa) {
  const z = zk.novaZakazka();
  z.cislo = cislo; z.nazevAkce = 'Akce ' + cislo;
  if (adresa != null) z.adresa = adresa;
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.cenik = ZC.zkusebniCenik(); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
const uloz = async (z) => (await post(zakazky, 'http://x/api/zakazky', { zakazka: z, ocekavaneRazitko: '' }, cA)).json();

/* 1) nově uložená zakázka */
const u1 = await uloz(nova('2026 - OPR - CN - 0701', 'Kornpfortstraße 12, Koblenz'));
await uloz(nova('2026 - OPR - CN - 0702', 'Vinohradská 5, Praha'));
await uloz(nova('2026 - OPR - CN - 0703'));
test('příprava: zakázky se uložily', u1.ok === true, u1);
test('P15: záznam rejstříku nese adresu stavby',
  (await zaznam('2026-OPR-CN-0701.json', cA)).adresa === 'Kornpfortstraße 12, Koblenz');
test('P15: zakázka bez adresy má v rejstříku prázdnou adresu (hodnotu, ne chybějící klíč)',
  (await zaznam('2026-OPR-CN-0703.json', cA)).adresa === '', await zaznam('2026-OPR-CN-0703.json', cA));
test('P15: hledání najde zakázku podle adresy', ULO.uloHledej(await rejstrik(cA), 'koblenz').map(z => z.soubor)
  .join() === '2026-OPR-CN-0701.json');
test('P15: „strasse" najde „Straße"', ULO.uloHledej(await rejstrik(cA), 'kornpfortstrasse').length === 1);

/* 2) starší rejstřík bez adres — simulace stavu před opravou */
const ocesej = () => {
  const r = JSON.parse(pamet.get('zakazky/_rejstrik'));
  r.zakazky.forEach(z => { delete z.adresa; });
  pamet.set('zakazky/_rejstrik', JSON.stringify(r));
};
ocesej();
test('příprava: starší rejstřík adresy nemá', (await rejstrik(cA)).every(z => !('adresa' in z)));
test('příprava: bez adresy v rejstříku ji hledání nenajde', ULO.uloHledej(await rejstrik(cA), 'koblenz').length === 0);
await uloz(nova('2026 - OPR - CN - 0704', 'Brněnská 1, Olomouc'));
const po = await rejstrik(cA);
test('P15: jedno uložení doplní adresy starších záznamů',
  (po.find(z => z.soubor === '2026-OPR-CN-0701.json') || {}).adresa === 'Kornpfortstraße 12, Koblenz'
  && (po.find(z => z.soubor === '2026-OPR-CN-0702.json') || {}).adresa === 'Vinohradská 5, Praha', po);
test('P15: a zakázce bez adresy doplní prázdnou (klíč už je, znovu se nečte)',
  (po.find(z => z.soubor === '2026-OPR-CN-0703.json') || {}).adresa === '');
test('P15: po doplnění hledání starší zakázku podle adresy najde',
  ULO.uloHledej(po, 'praha vinohradska').map(z => z.soubor).join() === '2026-OPR-CN-0702.json');

/* 3) dávkování — najednou nejvýš ULO_ADRESY_DAVKA zakázek */
const D = ULO.ULO_ADRESY_DAVKA;
for (let i = 0; i < D + 2; i++) await uloz(nova('2026 - OPR - CN - 0' + (800 + i), 'Ulice ' + i + ', Město'));
ocesej();
await uloz(nova('2026 - OPR - CN - 0799', 'Nová 1, Kolín'));
const bez1 = (await rejstrik(cA)).filter(z => !('adresa' in z)).length;
const celkem = (await rejstrik(cA)).length;
test('P15: jedno uložení doplní nejvýš ' + D + ' záznamů (zbytek příště)', bez1 === celkem - 1 - D, { bez1, celkem, D });
await uloz(nova('2026 - OPR - CN - 0798', 'Nová 2, Kolín'));
await uloz(nova('2026 - OPR - CN - 0797', 'Nová 3, Kolín'));
const bez2 = (await rejstrik(cA)).filter(z => !('adresa' in z)).length;
test('P15: další uložení doplní zbytek', bez2 === 0, bez2);
test('P15: dávkou doplněná adresa sedí na svou zakázku',
  (await zaznam('2026-OPR-CN-0805.json', cA)).adresa === 'Ulice 5, Město', await zaznam('2026-OPR-CN-0805.json', cA));

/* 4) zmizelá zakázka (záznam v rejstříku bez souboru) uložení nezastaví */
{
  const r = JSON.parse(pamet.get('zakazky/_rejstrik'));
  r.zakazky.push({ soubor: 'zmizela.json', cislo: 'x' });
  pamet.set('zakazky/_rejstrik', JSON.stringify(r));
  const u = await uloz(nova('2026 - OPR - CN - 0796', 'Nová 4, Kolín'));
  test('P15: sirotek v rejstříku uložení nezastaví a dostane prázdnou adresu',
    u.ok === true && (await zaznam('zmizela.json', cA)).adresa === '', { u, z: await zaznam('zmizela.json', cA) });
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
