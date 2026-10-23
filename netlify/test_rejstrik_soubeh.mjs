/* REJSTŘÍK ZAKÁZEK PŘI SOUBĚŽNÉM UKLÁDÁNÍ (K7-S1, audit 23. 10. 2026, #507).
 *
 * POST /api/zakazky dělá nad `_rejstrik` čtení–změnu–zápis. Do v22.10.6 bez
 * zámku: dvě souběžná uložení přečetla týž rejstřík a pozdější zápis tiše
 * vypustil záznam dřívějšího. Zakázka pak chyběla v Přehledu i v hromadném
 * exportu pro controlling (#504 bere kandidáty jen z rejstříku) — a nikde
 * se to nehlásilo.
 *
 * Hlídá se:
 *  1) dvě souběžná uložení nových zakázek (pomalé čtení rejstříku) → v rejstříku
 *     jsou obě (výhradní úsek v instanci funkce);
 *  2) souběžné uložení a smazání → smazaná zmizí, uložená zůstane;
 *  3) samooprava exportu: zamčená zakázka, jejíž záznam rejstřík ztratil
 *     (souběh dvou instancí — tam výhradní úsek nevidí), v exportu je
 *     a odpověď hlásí `mimoRejstrik`.
 *
 * Paměťové úložiště, zkušební ceník. Spuštění: node netlify/test_rejstrik_soubeh.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
const pamet = new Map();
/* Okno souběhu: s `zpozdeni` čeká první čtení rejstříku, až přijde druhé
 * (nejdéle `zpozdeni` ms) — oba požadavky tak čtou týž stav, jako na
 * skutečném úložišti. Výhradní úsek druhé čtení pustí až po zápisu prvního,
 * první pak jen dočká limit. */
let zpozdeni = 0;
let cekajici = null;
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) {
    if (zpozdeni && nazev === 'zakazky' && k === '_rejstrik') {
      if (cekajici) { cekajici(); cekajici = null; }
      else await new Promise(r => { cekajici = r; setTimeout(() => { if (cekajici === r) cekajici = null; r(); }, zpozdeni); });
    }
    return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: program } = await import('./functions/program.mjs');
const { default: zakazky } = await import('./functions/zakazky.mjs');
const { default: controllingExport } = await import('./functions/controlling_export.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const ZC = require('../src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const del = (fn, url, cookie) => fn(new Request(url, { method: 'DELETE', headers: cookie ? { cookie } : {} }));
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h }))
  .headers.get('set-cookie') || '').split(';')[0];
const soubory = () => {
  const r = pamet.get('zakazky/_rejstrik');
  return r ? (JSON.parse(r).zakazky || []).map(z => z.soubor).sort().join(',') : '';
};

const cA = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
test('příprava: přihlášení správce', !!cA);
await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.03, 'Vedoucí': 0.12, 'Administrátor': 1 } } }, cA);
/* Jádro se načte s prvním požadavkem; pak jsou jeho funkce na globalThis. */
await get(zakazky, 'http://x/api/zakazky', cA);
const G = globalThis;

function nova(cislo) {
  const z = G.novaZakazka();
  z.cislo = cislo; z.nazevAkce = 'Akce ' + cislo;
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.cenik = ZC.zkusebniCenik(); v.data.proj.cenik = ZC.zkusebniCenikProj();
  return z;
}
const uloz = async (z) => { const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: z, ocekavaneRazitko: '' }, cA);
  return { st: r.status, o: await r.json() }; };

/* 1) dvě souběžná uložení nových zakázek */
zpozdeni = 500;
const [a, b] = await Promise.all([uloz(nova('2026 - OPR - CN - 0901')), uloz(nova('2026 - OPR - CN - 0902'))]);
zpozdeni = 0;
test('souběh: obě uložení prošla', a.st === 200 && b.st === 200, [a, b]);
test('souběh: obě zakázky jsou v úložišti', pamet.has('zakazky/z/2026-OPR-CN-0901.json') && pamet.has('zakazky/z/2026-OPR-CN-0902.json'));
test('K7-S1: rejstřík nese obě zakázky (žádná tiše nevypadla)',
  soubory() === '2026-OPR-CN-0901.json,2026-OPR-CN-0902.json', soubory());

/* 2) souběžné uložení a smazání */
zpozdeni = 500;
const [c] = await Promise.all([uloz(nova('2026 - OPR - CN - 0903')),
  del(zakazky, 'http://x/api/zakazky?soubor=2026-OPR-CN-0901.json', cA)]);
zpozdeni = 0;
test('souběh se smazáním: uložení prošlo', c.st === 200, c);
test('K7-S1: smazaná zmizela, nově uložená zůstala',
  soubory() === '2026-OPR-CN-0902.json,2026-OPR-CN-0903.json', soubory());

/* 3) samooprava exportu: zamčená zakázka bez záznamu v rejstříku */
{
  const JEKLY = require('../src/jekly.json');
  const zak = nova('2026 - OPR - CN - 0904');
  const v = zak.varianty[0];
  G.zamkniVariantu(v, { cislo: G.variantaCislo(zak, v), kdo: 'admin@priklad.cz', typ: 'nabidka',
    vysledek: G.zamekVysledekSpocti(v, JEKLY, 'test') });
  v.zamek.kdy = '2026-10-07T09:00:00Z';
  pamet.set('zakazky/z/' + G.uloJmenoSouboru(zak), JSON.stringify(zak));   // zápis zakázky prošel, rejstřík ji ztratil
  const r = await get(controllingExport, 'http://x/api/controlling/export?od=2026-10-01&do=2026-10-31&podle=zamceni&pd=vse', cA);
  const o = await r.json();
  const cisla = (o.exporty || []).map(e => e.strany[0].cislo).join(',');
  test('K7-S1: export najde zakázku, kterou rejstřík ztratil', r.status === 200 && /0904/.test(cisla), [r.status, cisla, o.chyba]);
  test('K7-S1: odpověď hlásí, kolik zakázek chybělo v rejstříku', o.mimoRejstrik === 1, o.mimoRejstrik);
  test('K7-S1: zakázky z rejstříku mimo období se nepřidaly', !/0902|0903/.test(cisla), cisla);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
