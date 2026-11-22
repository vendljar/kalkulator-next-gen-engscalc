/* PoC čočky IN (audit 20. 11. 2026) — IN-2: akce „vitez“ (/api/pd/organizace) přepojí organizaci
 * LIBOVOLNÉHO dealu Pipedrive — deal určuje autor zakázky polem pdDealId, server neověřuje,
 * že deal se zakázkou souvisí (číslo nabídky v dealu, odkaz na kalkulaci, vazba z webhooku).
 * Krok A jde celý přes veřejné API (uložení zakázky obchodníkem); stav „prodáno“ je do úložiště
 * dosazen stejně jako v netlify/test_vz_organizace.mjs (prodej sám je jiná čočka).
 * Jen lokálně: paměťové úložiště + simulátor Pipedrive, ARES náhradou, síť zakázaná.
 * Spuštění: node podklady/audit_2026-11-20/poc_IN_vitez_cizi_deal.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-poc-in-tajemstvi-jen-lokalne';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PROSTREDI',
  'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL']) delete process.env[k];
process.env.PIPEDRIVE_SIMULATOR = '1';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
globalThis.fetch = async (url) => { throw new Error('síť je v PoC zakázaná: ' + url); };
const R = new URL('../..', import.meta.url).pathname;
const imp = (p) => import(R + p);
const A = await imp('netlify/lib/ares_server.mjs');
function icoS(z7) { let s = 0; for (let i = 0; i < 7; i++) s += (+z7[i]) * (8 - i); const z = s % 11; return z7 + String(z === 0 ? 1 : (z === 1 ? 0 : 11 - z)); }
const ICO = icoS('9300001');
A.ARES_SIT.fetch = async (url) => (String(url).endsWith('/' + ICO)
  ? new Response(JSON.stringify({ ico: ICO, obchodniJmeno: 'TEST – Firma útočníka s.r.o. (smyšlená)', sidlo: { textovaAdresa: 'Smyšlená 1, 110 00 Vzorov' } }), { status: 200 })
  : new Response('{}', { status: 404 }));
const { default: prihlaseni } = await imp('netlify/functions/prihlaseni.mjs');
const { default: program } = await imp('netlify/functions/program.mjs');
const { default: zakazky } = await imp('netlify/functions/zakazky.mjs');
const { default: funkce } = await imp('netlify/functions/funkce.mjs');
const { default: uzivatele } = await imp('netlify/functions/uzivatele.mjs');
const { default: orgFn } = await imp('netlify/functions/pd_organizace.mjs');
const { jadro } = await imp('netlify/lib/jadro.mjs');
await jadro();
const G = globalThis;
const SIM = await imp('netlify/lib/pipedrive_simulator.mjs');
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h })).headers.get('set-cookie') || '').split(';')[0];
const cA = await login('spravce@priklad.cz', 'Docasne.Heslo.123');
await post(program, 'http://x/api/program', { cenik: Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()), cenikProj: ZC.zkusebniCenikProj(), poznamka: 'PoC IN' }, cA);
await post(funkce, 'http://x/api/funkce', { viceZakazniku: true }, cA);
await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obchodnik.in@priklad.cz', jmeno: 'Obchodník IN', role: 'Obchodník', heslo: 'PocHeslo.12345', hesloSpravce: 'Docasne.Heslo.123' }, cA);
const cO = await login('obchodnik.in@priklad.cz', 'PocHeslo.12345');

const D = () => SIM.pdSimStav().data;
const poz = () => SIM.pdSimStav().pozadavky;
/* CIZÍ deal: otevřený deal simulátoru, se zakázkou obchodníka nemá nic společného. */
const obet = D().dealy.find((d) => d.status === 'open' && d.org_id && d.id > 1100);
const orgPred = obet.org_id, orguPred = D().organizace.length;

/* A) Obchodník přes API založí VLASTNÍ zakázku a napíše do ní cizí deal — server to přijme. */
const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 9922 - TEST'; z.nazevAkce = 'TEST PoC IN vitez';
z.objednatel = 'TEST – Firma útočníka s.r.o. (smyšlená)'; z.adresaObjednatele = 'Smyšlená 1, 110 00 Vzorov'; z.ico = ICO;
const v = z.varianty[0];
Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
v.data.ock.fixes = true;
v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()); v.data.proj.cenik = ZC.zkusebniCenikProj();
z.pdDealId = String(obet.id);
const rA = await post(zakazky, 'http://x/api/zakazky', { zakazka: z }, cO);
const tA = await rA.json();
console.log('A) uložení zakázky obchodníka s pdDealId cizího dealu ' + obet.id + ': HTTP ' + rA.status + (tA.chyba ? ' ' + tA.chyba : ''));
const soubor = tA.soubor;
const ul = JSON.parse(pamet.get('zakazky/z/' + soubor));
console.log('   uložená zakázka: autor=' + ul.autor + ', pdDealId=' + ul.pdDealId);

/* B) Stav „víc zákazníků + prodáno“ (dosazeno do úložiště jako v test_vz_organizace.mjs). */
const p = G.vzPridej(ul, { objednatel: 'TEST – DRUHÝ a.s.', adresaObjednatele: 'Jinde 2', ico: '', dic: '', kontakt: '' }, { kdo: 'PoC', kdy: '2026-11-19T10:00:00.000Z' });
if (!p.ok) throw new Error('vzPridej ' + JSON.stringify(p));
ul.varianty[0].zamek = { zamceno: true, kdy: '2026-11-19T10:00:00.000Z' };
ul.varianty[0].prodano = { datum: '2026-11-19', kdo: 'obchodnik.in@priklad.cz', kdy: '2026-11-19T10:00:00.000Z', pipedrive: { stav: 'ceka', kdy: '2026-11-19T10:00:00.000Z' } };
pamet.set('zakazky/z/' + soubor, JSON.stringify(ul));

/* C) Akce „vitez“ — obchodník, výchozí práva. */
const od = poz().length;
const rC = await post(orgFn, 'http://x/api/pd/organizace', { soubor, akce: 'vitez' }, cO);
const tC = await rC.json();
console.log('C) POST /api/pd/organizace {akce:"vitez"}: HTTP ' + rC.status + ' stav=' + tC.stav + ' zdroj=' + (tC.zdroj || '') + (tC.duvod ? ' důvod=' + tC.duvod : ''));
console.log('   zápisy do Pipedrive:', poz().slice(od).filter((x) => /^(POST|PATCH|PUT|DELETE)/.test(x)).join(' ; '));
const orgPo = D().dealy.find((d) => d.id === obet.id).org_id;
console.log('   cizí deal ' + obet.id + ': org_id ' + orgPred + ' → ' + orgPo + '; organizací v CRM ' + orguPred + ' → ' + D().organizace.length);
console.log(orgPo !== orgPred
  ? 'ZRANITELNÉ: obchodník přepojil organizaci cizího dealu (a založil v CRM novou organizaci) — vazba deal ↔ zakázka se neověřuje'
  : 'ODOLNÉ: organizace cizího dealu se nezměnila');
