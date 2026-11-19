/* PoC čočky IN (audit 20. 11. 2026) — IN-1: obchodník zapíše poznámku do LIBOVOLNÉHO dealu
 * Pipedrive (i do dealů, které s jeho zakázkami nesouvisí) a strop je jen „na deal“, ne na uživatele.
 * Jen lokálně: paměťové úložiště + simulátor Pipedrive, síť zakázaná.
 * Spuštění: node podklady/audit_2026-11-20/poc_IN_poznamka_cizi_dealy.mjs */
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
const { default: prihlaseni } = await imp('netlify/functions/prihlaseni.mjs');
const { default: program } = await imp('netlify/functions/program.mjs');
const { default: zakazky } = await imp('netlify/functions/zakazky.mjs');
const { default: funkce } = await imp('netlify/functions/funkce.mjs');
const { default: uzivatele } = await imp('netlify/functions/uzivatele.mjs');
const { jadro } = await imp('netlify/lib/jadro.mjs');
await jadro();
const SIM = await imp('netlify/lib/pipedrive_simulator.mjs');
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h })).headers.get('set-cookie') || '').split(';')[0];
const kopie = x => JSON.parse(JSON.stringify(x));
const cA = await login('spravce@priklad.cz', 'Docasne.Heslo.123');
await post(program, 'http://x/api/program', { cenik: Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()), cenikProj: ZC.zkusebniCenikProj(), poznamka: 'PoC IN' }, cA);
await post(funkce, 'http://x/api/funkce', { viceSachet: true }, cA);
const zal = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obchodnik.in@priklad.cz', jmeno: 'Obchodník IN', role: 'Obchodník', heslo: 'PocHeslo.12345', hesloSpravce: 'Docasne.Heslo.123' }, cA)).json();
if (!zal.ok) throw new Error('účet: ' + JSON.stringify(zal));
const cO = await login('obchodnik.in@priklad.cz', 'PocHeslo.12345');
/* Matice zobrazení se NEMĚNÍ — obchodník má jen výchozí práva. */

const D = SIM.pdSimStav().data;
const dealy = D.dealy.filter(d => d.status !== 'deleted').map(d => d.id);
const notes = () => (SIM.pdSimStav().data.poznamky || []).filter(p => p.active_flag !== false);

const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 9911 - TEST'; z.nazevAkce = 'TEST PoC IN'; z.objednatel = 'TEST – SMYŠLENÝ ODBĚRATEL s.r.o.';
const v = z.varianty[0];
Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
v.data.ock.fixes = true;
v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()); v.data.proj.cenik = ZC.zkusebniCenikProj();
v.data.ock.nazev = 'LIBOVOLNY TEXT OBCHODNIKA <b>x</b>';
v.data.ock.dalsi = [{ id: 's_b1', nazev: 'druha sachta', ks: 2, zadani: Object.assign(kopie(v.data.ock.zadani), { zdvih: 12 }) }];

const CILU = Math.min(40, dealy.length);
let zapsano = 0, stavy = {}, prvniChyba = null;
const pred = notes().length;
for (let i = 0; i < CILU; i++) {
  z.pdDealId = String(dealy[i]);            // autor zakázky smí deal měnit (ctrlPdDealSmiMenit)
  const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: z, ocekavaneRazitko: z.uloRazitko || undefined }, cO);
  const t = await r.json();
  if (t.razitko) z.uloRazitko = t.razitko;
  const s = r.status + '/' + (t.pdPoznamka || '-');
  stavy[s] = (stavy[s] || 0) + 1;
  if (r.status !== 200 && !prvniChyba) prvniChyba = t;
  if (t.pdPoznamka === 'zalozeno') zapsano++;
}
const dotcene = new Set(notes().slice(pred).map(p => p.deal_id));
console.log('obchodník (výchozí práva), jedna zakázka, ' + CILU + ' uložení s různým pdDealId během jednoho běhu');
console.log('stavy uložení (HTTP/pdPoznamka):', JSON.stringify(stavy), prvniChyba ? 'první chyba: ' + JSON.stringify(prvniChyba).slice(0, 300) : '');
console.log('nových poznámek v simulátoru Pipedrive: ' + (notes().length - pred) + ', různých dealů: ' + dotcene.size);
const ukazka = notes().slice(pred)[0];
console.log('ukázka obsahu poznámky:', ukazka ? JSON.stringify(ukazka.content).slice(0, 200) : '(žádná)');
const escapovano = ukazka ? !/<b>/.test(ukazka.content) : true;
console.log('HTML v názvu šachty escapováno: ' + (escapovano ? 'ano' : 'NE'));
const zranitelne = dotcene.size >= 25;      // víc než jakýkoli „hodinový strop na uživatele“ ostatních cest (20–30)
console.log(zranitelne
  ? 'ZRANITELNÉ: poznámka zapsána do ' + dotcene.size + ' různých dealů jedním obchodníkem — žádný strop na uživatele, žádná vazba deal ↔ zakázka'
  : 'ODOLNÉ: zápis do cizích dealů se zastavil (' + dotcene.size + ' dealů)');
console.log(escapovano ? 'ODOLNÉ (uložený XSS v poznámce): obsah je escapovaný' : 'ZRANITELNÉ: HTML v poznámce');
