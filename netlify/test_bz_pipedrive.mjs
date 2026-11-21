/* ============================================================
 * DÁVKA BZ (21. 11. 2026) — B235 / B236: zápis do Pipedrive
 *
 *   – vypínač zápisu (PIPEDRIVE_ZAPIS) je ve výchozím stavu VYPNUTÝ a bez
 *     něj žádná zápisová cesta nejde do skutečného Pipedrive (J. V. 21. 11.);
 *   – poznámka do dealu (B235) a přepojení organizace akcí `vitez` (B236)
 *     jen u dealu, který zakázce patří (pd_overeni.mjs), strop na uživatele.
 *
 * Simulátor Pipedrive + paměťové úložiště, síť zakázaná (fetch hlídaný).
 * Scénáře = PoC auditu poc_IN_poznamka_cizi_dealy, poc_IN_vitez_cizi_deal.
 * Smyšlené kontakty …@priklad.cz. `node netlify/test_bz_pipedrive.mjs`.
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
for (const k of ['PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PIPEDRIVE_ZAPIS', 'PROSTREDI',
  'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL']) delete process.env[k];

const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
/* Síť: každé volání se zapíše; odpověď je prázdný úspěch (jen pro test vypínače). */
const sit = [];
globalThis.fetch = async (url, init) => { sit.push(((init && init.method) || 'GET') + ' ' + url); return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 }); };

import './pomoc_test_admin.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import prihlaseni from './functions/prihlaseni.mjs';
import program from './functions/program.mjs';
import zakazky from './functions/zakazky.mjs';
import funkce from './functions/funkce.mjs';
import uzivatele from './functions/uzivatele.mjs';
import orgFn from './functions/pd_organizace.mjs';
import { ADMIN_EMAIL } from './lib/sdilene.mjs';
import { jadro } from './lib/jadro.mjs';
import * as PD from './lib/pipedrive.mjs';
import * as PP from './lib/pd_poznamka.mjs';
import * as SIM from './lib/pipedrive_simulator.mjs';
import { ARES_SIT } from './lib/ares_server.mjs';

const require = createRequire(import.meta.url);
await jadro();
const zk = require('../src/zakazka.js');
const ZC = require('../src/zkusebni_cenik.js');
const G = globalThis;
const zapisPovolen = () => (typeof PD.pdZapisPovolen === 'function' ? PD.pdZapisPovolen() : true);   // před BZ funkce nebyla = zápis vždy

let ok = 0, fail = 0; const selhalo = [];
function test(nazev, podminka, detail) {
  if (podminka) { ok++; console.log('  ✓ ' + nazev); }
  else { fail++; selhalo.push(nazev); console.log('  ✗ ' + nazev + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 300) : '')); }
}
const kopie = x => JSON.parse(JSON.stringify(x));
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h })).headers.get('set-cookie') || '').split(';')[0];

let n = 9940;
function nova() {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++) + ' - TEST'; z.nazevAkce = 'TEST BZ PD'; z.objednatel = 'TEST – ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.ock.fixes = true;
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()); v.data.proj.cenik = ZC.zkusebniCenikProj();
  v.data.ock.nazev = 'Výtah A';
  v.data.ock.dalsi = [{ id: 's_b1', nazev: 'Výtah B', ks: 2, zadani: Object.assign(kopie(v.data.ock.zadani), { zdvih: 12 }) }];
  return z;
}
/* ============================================================ */
console.log('\n===== VYPÍNAČ ZÁPISU DO PIPEDRIVE (výchozí vypnuto) =====\n');
{
  process.env.PIPEDRIVE_TOKEN = 'testovaci-token-nic-neplati';
  process.env.PIPEDRIVE_DOMENA = 'zkusebni';
  test('vypínač: bez PIPEDRIVE_ZAPIS je zápis vypnutý (výchozí stav)', zapisPovolen() === false && PD.pdRezim() === 'pipedrive');
  for (const metoda of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const pred = sit.length; let chyba = null;
    try { await PD.pdZavolej('/api/v2/deals/1', { metoda, telo: { x: 1 } }); } catch (e) { chyba = e; }
    test('vypínač: ' + metoda + ' do skutečného Pipedrive se odmítne dřív, než sáhne na síť (503)',
      chyba instanceof PD.PdChyba && chyba.stav === 503 && sit.length === pred && /vypnutý/.test(chyba.message), chyba && chyba.message);
  }
  const pred = sit.length;
  await PD.pdZavolej('/api/v2/deals/1');
  test('vypínač: čtení (GET) jde dál', sit.length === pred + 1 && /^GET https:\/\/zkusebni\.pipedrive\.com\/api\/v2\/deals\/1/.test(sit[sit.length - 1]), sit.slice(-1));
  /* Poznámka při uložení: s vypnutým zápisem stav „bez" a žádné volání. */
  const z = nova(); z.pdDealId = '1001';
  test('vypínač: zakázka má co do poznámky psát (pojistka proti prázdnému testu)', !!PP.pdPoznamkaText(z, G));
  const pred2 = sit.length;
  const r = await PP.pdPoznamkaDruhUlozeni(PP.PD_POZNAMKA_DRUH_SACHTY, z, null, { zapnuto: true, relace: { role: 'Administrátor', email: ADMIN_EMAIL } });
  test('vypínač: poznámka při uložení se s vypnutým zápisem nezkouší (stav bez, bez sítě)', r.stav === 'bez' && sit.length === pred2, r);
  process.env.PIPEDRIVE_ZAPIS = 'ano';
  const pred3 = sit.length;
  await PD.pdZavolej('/api/v2/deals/1', { metoda: 'PATCH', telo: { x: 1 } });
  test('vypínač: s PIPEDRIVE_ZAPIS=ano zápis projde (pojistka proti prázdnému testu)', zapisPovolen() && sit.length === pred3 + 1 && /^PATCH /.test(sit[sit.length - 1]));
  process.env.PIPEDRIVE_ZAPIS = 'ne';
  test('vypínač: jiná hodnota než „ano" = vypnuto', zapisPovolen() === false);
  delete process.env.PIPEDRIVE_ZAPIS; delete process.env.PIPEDRIVE_TOKEN; delete process.env.PIPEDRIVE_DOMENA;
}
{
  /* Statická pojistka: každé zápisové volání v netlify/ jde přes pdZavolej (kde je vypínač),
   * nebo přes `zavolej` z volani() nad pdZavolej; jiný fetch do Pipedrive neexistuje. */
  const KOREN = new URL('.', import.meta.url).pathname;
  const soubory = ['functions', 'lib'].flatMap(d => readdirSync(KOREN + d).filter(f => f.endsWith('.mjs')).map(f => d + '/' + f))
    .filter(f => f !== 'lib/pipedrive_simulator.mjs');
  const zle = [], radku = [];
  for (const f of soubory) {
    const t = readFileSync(KOREN + f, 'utf8');
    t.split('\n').forEach((r, i) => {
      if (!/metoda:\s*'(POST|PUT|PATCH|DELETE)'/.test(r)) return;
      radku.push(f + ':' + (i + 1));
      if (!/\bpdZavolej\(/.test(r) && !(/\bzavolej\(/.test(r) && /function volani\([^)]*\)\s*\{[\s\S]{0,400}pdZavolej\(/.test(t))) zle.push(f + ':' + (i + 1));
    });
    if (f !== 'lib/pipedrive.mjs' && /\bfetch\([^)]*pipedrive/i.test(t)) zle.push(f + ': přímý fetch do Pipedrive');
  }
  test('statická pojistka: nalezeny zápisové cesty (poznámky, vítěz, organizace, vazba, webhook)', radku.length >= 7, radku);
  test('statická pojistka: každá zápisová cesta jde přes pdZavolej (vypínač)', zle.length === 0, zle);
}

/* ============================================================ */
console.log('\n===== B235 / B236: DEAL MUSÍ PATŘIT ZAKÁZCE =====\n');
process.env.PIPEDRIVE_SIMULATOR = '1';
const cA = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
await post(program, 'http://x/api/program', { cenik: Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()), cenikProj: ZC.zkusebniCenikProj(), poznamka: 'BZ PD' }, cA);
await post(funkce, 'http://x/api/funkce', { viceSachet: true, viceZakazniku: true }, cA);
const zal = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'bz.pd@priklad.cz', jmeno: 'Obch BZ PD', role: 'Obchodník', heslo: 'Heslo12345x', hesloSpravce: 'Docasne.Heslo.123' }, cA)).json();
if (!zal.ok) throw new Error('účet: ' + JSON.stringify(zal));
const cO = await login('bz.pd@priklad.cz', 'Heslo12345x');
const D = () => SIM.pdSimStav().data;
const CN = D().pole.deal.find(p => p.field_name === 'Číslo nabídky (CN)').field_code;
const notes = () => (D().poznamky || []).filter(p => p.active_flag !== false);
const dealy = D().dealy.filter(d => d.status !== 'deleted' && d.status !== 'lost').map(d => d.id);

const uloz = async (z, c) => { const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: z, ocekavaneRazitko: z.uloRazitko || undefined }, c);
  const t = { status: r.status, ...(await r.json()) }; if (t.razitko) z.uloRazitko = t.razitko; return t; };
{
  /* PoC poc_IN_poznamka_cizi_dealy: jedna zakázka, cizí dealy jeden po druhém. */
  const z = nova(); const pred = notes().length; const stavy = {};
  for (let i = 0; i < 5; i++) { z.pdDealId = String(dealy[40 + i]); const t = await uloz(z, cO); stavy[t.status + '/' + t.pdPoznamka] = (stavy[t.status + '/' + t.pdPoznamka] || 0) + 1; }
  test('B235: do cizích dealů se poznámka nezapíše (stav neovereno, uložení projde)', notes().length === pred && stavy['200/neovereno'] === 5, stavy);
  /* Deal, jehož číslo nabídky sedí se zakázkou → zapíše se. */
  const deal = D().dealy.find(d => d.id === dealy[50]); deal.custom_fields[CN] = z.cislo;
  z.pdDealId = String(dealy[50]); const t = await uloz(z, cO);
  test('B235: deal s číslem nabídky zakázky — poznámka zapsána (pojistka)', t.pdPoznamka === 'zalozeno' && notes().some(p => p.deal_id === dealy[50]), t.pdPoznamka);
  /* Další uložení téhož dealu (platná poznámka) deal znovu neověřuje a jen upraví. */
  z.varianty[0].data.ock.dalsi[0].nazev = 'Výtah C'; deal.custom_fields[CN] = 'CN-1';
  const t2 = await uloz(z, cO);
  test('B235: úprava vlastní poznámky téhož dealu (už ověřeného) projde', t2.pdPoznamka === 'upraveno', t2.pdPoznamka);
  /* Odkaz na kalkulaci v dealu míří na zakázku → také patří. */
  const z2 = nova(); const d2 = D().dealy.find(d => d.id === dealy[51]);
  const hashOdkaz = D().pole.deal.find(p => p.field_name === 'Odkaz na kalkulaci').field_code;
  z2.pdDealId = String(dealy[51]);
  const t0 = await uloz(z2, cO);
  test('B235: bez dokladu vazby poznámka nevznikne', t0.pdPoznamka === 'neovereno', t0.pdPoznamka);
  d2.custom_fields[hashOdkaz] = 'http://x/?zakazka=' + encodeURIComponent(t0.soubor);
  z2.varianty[0].data.ock.dalsi[0].nazev = 'Výtah D';
  const t3 = await uloz(z2, cO);
  test('B235: odkaz na kalkulaci v dealu = vazba doložená, poznámka zapsána', t3.pdPoznamka === 'zalozeno', t3.pdPoznamka);
}
{
  /* Strop na uživatele: první zápisy do nových dealů. */
  const s = G.__TEST_ULOZISTE('pd_cache');
  await s.zapis('strop:poznamka:bz.pd@priklad.cz', { od: Date.now(), pocet: (PP.PD_POZNAMKA_STROP_UZIVATEL || 30) });
  const z = nova(); const deal = D().dealy.find(d => d.id === dealy[52]); deal.custom_fields[CN] = z.cislo; z.pdDealId = String(dealy[52]);
  const t = await uloz(z, cO);
  test('B235: strop nových dealů na uživatele (' + (PP.PD_POZNAMKA_STROP_UZIVATEL || 30) + '/h) — nad ním nezapsáno, uložení projde', t.status === 200 && t.pdPoznamka === 'strop'
    && /na uživatele/.test(t.varovani || ''), { s: t.pdPoznamka, v: t.varovani });
  await s.smaz('strop:poznamka:bz.pd@priklad.cz');
}
{
  /* PoC poc_IN_vitez_cizi_deal: vítěz u cizího dealu. */
  const ICO = (() => { const z7 = '9300001'; let s = 0; for (let i = 0; i < 7; i++) s += (+z7[i]) * (8 - i); const r = s % 11; return z7 + String(r === 0 ? 1 : (r === 1 ? 0 : 11 - r)); })();
  ARES_SIT.fetch = async (url) => (String(url).endsWith('/' + ICO)
    ? new Response(JSON.stringify({ ico: ICO, obchodniJmeno: 'TEST – Firma s.r.o. (smyšlená)', sidlo: { textovaAdresa: 'Smyšlená 1, 110 00 Vzorov' } }), { status: 200 })
    : new Response('{}', { status: 404 }));
  const pripravVitez = async (cislo) => {
    const obet = D().dealy.find((d) => d.status === 'open' && d.org_id && d.id > 1100 && !d.custom_fields[CN]);
    const z = zk.novaZakazka(); z.cislo = cislo; z.nazevAkce = 'TEST BZ vitez';
    z.objednatel = 'TEST – Firma s.r.o. (smyšlená)'; z.adresaObjednatele = 'Smyšlená 1, 110 00 Vzorov'; z.ico = ICO;
    const v = z.varianty[0];
    Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
    v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()); v.data.proj.cenik = ZC.zkusebniCenikProj();
    z.pdDealId = String(obet.id);
    const t = await uloz(z, cO);
    const ul = JSON.parse(pamet.get('zakazky/z/' + t.soubor));
    const p = G.vzPridej(ul, { objednatel: 'TEST – DRUHÝ a.s.', adresaObjednatele: 'Jinde 2', ico: '', dic: '', kontakt: '' }, { kdo: 'BZ', kdy: '2026-11-19T10:00:00.000Z' });
    if (!p.ok) throw new Error('vzPridej ' + JSON.stringify(p));
    ul.varianty[0].zamek = { zamceno: true, kdy: '2026-11-19T10:00:00.000Z' };
    ul.varianty[0].prodano = { datum: '2026-11-19', kdo: 'bz.pd@priklad.cz', kdy: '2026-11-19T10:00:00.000Z', pipedrive: { stav: 'ceka', kdy: '2026-11-19T10:00:00.000Z' } };
    pamet.set('zakazky/z/' + t.soubor, JSON.stringify(ul));
    return { obet, soubor: t.soubor, org: obet.org_id };
  };
  const a = await pripravVitez('2026 - OPR - CN - 9960 - TEST');
  const orgu = D().organizace.length;
  const r = await (await post(orgFn, 'http://x/api/pd/organizace', { soubor: a.soubor, akce: 'vitez' }, cO)).json();
  test('B236: vítěz u cizího dealu — stav neovereno, organizace dealu beze změny, žádná nová organizace',
    r.stav === 'neovereno' && a.obet.org_id === a.org && D().organizace.length === orgu, { r, org: a.obet.org_id, orgu: D().organizace.length });
  /* Pojistka: deal s číslem nabídky zakázky → přepojí se. */
  const b = await pripravVitez('2026 - OPR - CN - 9961 - TEST');
  b.obet.custom_fields[CN] = '2026 - OPR - CN - 9961 - TEST';
  const r2 = await (await post(orgFn, 'http://x/api/pd/organizace', { soubor: b.soubor, akce: 'vitez' }, cO)).json();
  test('B236: vítěz u dealu zakázky — organizace přepojena (pojistka)', r2.stav === 'zapsano' && b.obet.org_id !== b.org, r2);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
if (fail) console.log('\nSelhalo:\n - ' + selhalo.join('\n - '));
process.exit(fail ? 1 : 0);
