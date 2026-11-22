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
import webhookFn from './functions/pd_webhook.mjs';
import vazbaFn from './functions/pd_vazba.mjs';
import { pdVazbaDokladaZapis } from './lib/pd_vazba.mjs';
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
  /* RJ (doplněk koordinace 22. 11. 2026): s vypnutým zápisem stav „bez" + srozumitelné
   * varování (dřív ticho, na rozdíl od odkazu z webhooku a zrušení vazby). */
  test('RJ: vypnutý zápis — poznámka nese varování (PIPEDRIVE_ZAPIS, nic neodesláno)', /vypnutý/.test(r.varovani || '')
    && /PIPEDRIVE_ZAPIS/.test(r.varovani || '') && /poznámky dealu/.test(r.varovani || ''), r);
  const rBez = await PP.pdPoznamkaDruhUlozeni(PP.PD_POZNAMKA_DRUH_SACHTY, nova(), null, { zapnuto: true, relace: { role: 'Administrátor', email: ADMIN_EMAIL } });
  test('RJ: bez dealu žádné varování (není co psát)', rBez.stav === 'bez' && !rBez.varovani, rBez);
  const rVyp = await PP.pdPoznamkaDruhUlozeni(PP.PD_POZNAMKA_DRUH_SACHTY, Object.assign(nova(), { pdDealId: '1001' }), null, { zapnuto: false, relace: { role: 'Administrátor', email: ADMIN_EMAIL } });
  test('RJ: vypnutá funkce víc šachet — žádné varování', rVyp.stav === 'bez' && !rVyp.varovani, rVyp);
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
  /* RJ (#704-7, J. V. 22. 11. 2026): pravidlo 3 (číslo nabídky v dealu) zrušeno —
   * samotné číslo nabídky vazbu NEDOKLÁDÁ; doloží ji až odkaz na kalkulaci v dealu. */
  const deal = D().dealy.find(d => d.id === dealy[50]); deal.custom_fields[CN] = z.cislo;
  z.pdDealId = String(dealy[50]); const tc = await uloz(z, cO);
  test('RJ #704-7: deal jen s číslem nabídky zakázky vazbu nedoloží (neovereno, nic nezapsáno)', tc.pdPoznamka === 'neovereno'
    && !notes().some(p => p.deal_id === dealy[50]), tc.pdPoznamka);
  const hashOdkaz0 = D().pole.deal.find(p => p.field_name === 'Odkaz na kalkulaci').field_code;
  deal.custom_fields[hashOdkaz0] = 'http://x/?zakazka=' + encodeURIComponent(tc.soubor);
  z.varianty[0].data.ock.dalsi[0].nazev = 'Výtah B2';
  const t = await uloz(z, cO);
  test('B235: deal s odkazem na kalkulaci — poznámka zapsána (pojistka)', t.pdPoznamka === 'zalozeno' && notes().some(p => p.deal_id === dealy[50]), t.pdPoznamka);
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
  /* Revize Fable R4: číslo PROJ (projHlavicka.cislo) vedle čísla OCK autor volně
   * přepisuje — vazbu dealu nedokládá (jen číslo, ze kterého je klíč souboru). */
  const z = nova(); const cizi = D().dealy.find(d => d.id === dealy[60]);
  cizi.custom_fields[CN] = 'CN-777-CIZI';
  z.projHlavicka = Object.assign(z.projHlavicka || {}, { cislo: 'CN-777-CIZI' });
  z.pdDealId = String(dealy[60]);
  const pred = notes().length;
  const t = await uloz(z, cO);
  test('B235 R4: číslo PROJ shodné s cizím dealem vazbu nedoloží (neovereno, nic nezapsáno)', t.pdPoznamka === 'neovereno' && notes().length === pred, t.pdPoznamka);
  /* Zakázka jen s číslem PROJ (to je klíč jejího souboru) — vazba platí. */
  const zp = nova(); zp.cislo = ''; zp.projHlavicka = Object.assign(zp.projHlavicka || {}, { cislo: '2026 - OVP - CN - 9977 - TEST' });
  const dp = D().dealy.find(d => d.id === dealy[61]); dp.custom_fields[CN] = '2026 - OVP - CN - 9977 - TEST'; zp.pdDealId = String(dealy[61]);
  const tp = await uloz(zp, cO);
  test('RJ #704-7: ani číslo PROJ jako klíč souboru zakázky vazbu nedoloží (pravidlo 3 zrušeno)', tp.pdPoznamka === 'neovereno', tp.pdPoznamka + ' ' + (tp.chyba || ''));
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
  /* RJ (#704-7): číslo nabídky v dealu vazbu nedokládá; pojistka = odkaz na kalkulaci. */
  const b = await pripravVitez('2026 - OPR - CN - 9961 - TEST');
  b.obet.custom_fields[CN] = '2026 - OPR - CN - 9961 - TEST';
  const rc = await (await post(orgFn, 'http://x/api/pd/organizace', { soubor: b.soubor, akce: 'vitez' }, cO)).json();
  test('RJ #704-7: vítěz u dealu jen s číslem nabídky zakázky — neovereno, organizace beze změny', rc.stav === 'neovereno' && b.obet.org_id === b.org, rc);
  b.obet.custom_fields[D().pole.deal.find(p => p.field_name === 'Odkaz na kalkulaci').field_code] = 'http://x/?zakazka=' + encodeURIComponent(b.soubor);
  const r2 = await (await post(orgFn, 'http://x/api/pd/organizace', { soubor: b.soubor, akce: 'vitez' }, cO)).json();
  test('B236: vítěz u dealu zakázky — organizace přepojena (pojistka)', r2.stav === 'zapsano' && b.obet.org_id !== b.org, r2);
}

{
  /* PoC revize 2. kola BZ (#704-7) jako regresní test: obchodník založí NOVOU
   * zakázku, jejíž číslo (= klíč souboru) je číslo nabídky cizího dealu, a deal
   * k ní připojí. Do RJ pravidlo 3 zápis pustilo; teď neověřeno, nic se nezapíše. */
  const cizi = D().dealy.find((d) => d.status === 'open' && d.id > 1150 && d.id < 1200 && !d.custom_fields[CN]);
  const cizi2 = D().dealy.find((d) => d.status === 'open' && d.id > cizi.id && !d.custom_fields[CN]);
  cizi.custom_fields[CN] = '2026 - OPR - CN - 9971 - CIZI';
  cizi2.title = '2026 - OPR - CN - 9972 - CIZI Bytový dům';
  const pred = notes().length;
  for (const [deal, cislo] of [[cizi, '2026 - OPR - CN - 9971 - CIZI'], [cizi2, '2026 - OPR - CN - 9972 - CIZI']]) {
    const z = nova(); z.cislo = cislo; z.pdDealId = String(deal.id);
    const t = await uloz(z, cO);
    test('RJ #704-7 PoC: nová zakázka s číslem cizího dealu (' + (deal === cizi ? 'pole CN' : 'název dealu') + ') — neovereno, uložení projde',
      t.status === 200 && t.pdPoznamka === 'neovereno', { s: t.status, p: t.pdPoznamka });
  }
  test('RJ #704-7 PoC: do cizích dealů nic nezapsáno', notes().length === pred && !notes().some(p => p.deal_id === cizi.id || p.deal_id === cizi2.id));
}
{
  /* RJ N1 (revize koordinace 22. 11. 2026) — PoC: obchodník PŘEDEM založí zakázku
   * s číslem cizího dealu a deal k ní připojí; po „Vygenerovat nabídku“ v CRM
   * webhook deal naváže na jeho zakázku (a zapíše do dealu odkaz na ni). Do RJ N1
   * dostala vazba stav „webhook“ a jeho další uložení poznámku do cizího dealu
   * zapsalo. Teď „ceka“ a neověřeno, dokud vazbu někdo nepotvrdí. */
  process.env.PIPEDRIVE_WEBHOOK_KLIC = 'testovaci-webhook-klic-rj-n1-nic-neplati';
  const cizi = D().dealy.find((d) => d.status === 'open' && d.org_id && d.id > 1215 && !d.custom_fields[CN]);
  const cislo = '2026 - OPR - CN - 9985 - CIZI';
  cizi.custom_fields[CN] = cislo;
  const z = nova(); z.cislo = cislo; z.pdDealId = String(cizi.id);
  const t0 = await uloz(z, cO);
  test('RJ N1 PoC: příprava — zakázka s číslem cizího dealu uložena, zápis neověřen', t0.status === 200 && t0.pdPoznamka === 'neovereno', t0.pdPoznamka);
  const w = await webhookFn(new Request('http://x/api/pd/webhook', { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-kalkulator-klic': process.env.PIPEDRIVE_WEBHOOK_KLIC }, body: JSON.stringify({ dealId: cizi.id }) }));
  const ul = JSON.parse(pamet.get('zakazky/z/' + t0.soubor));
  test('RJ N1 PoC: webhook naváže EXISTUJÍCÍ kalkulaci s pdDealId jen jako „ceka“ (ne „webhook“)', w.status === 200
    && ul.pdVazbaWebhook && ul.pdVazbaWebhook.stav === 'ceka', { w: w.status, t: await w.clone().text(), v: ul.pdVazbaWebhook });
  const pred = notes().length;
  z.uloRazitko = ul.uloRazitko; z.varianty[0].data.ock.dalsi[0].nazev = 'Výtah N1';
  const t1 = await uloz(z, cO);
  test('RJ N1 PoC: další uložení útočníka do cizího dealu nic nezapíše (neovereno), i s odkazem v dealu od webhooku', t1.status === 200
    && t1.pdPoznamka === 'neovereno' && /čeká na potvrzení/.test(t1.varovani || '') && notes().length === pred, { s: t1.pdPoznamka, v: t1.varovani });
  /* Pojistka: po potvrzení („V pořádku“, tady správce) se zapíše. */
  const rp = await (await post(vazbaFn, 'http://x/api/pd/vazba', { soubor: t0.soubor, akce: 'potvrdit' }, cA)).json();
  const ul2 = JSON.parse(pamet.get('zakazky/z/' + t0.soubor));
  z.uloRazitko = ul2.uloRazitko; z.varianty[0].data.ock.dalsi[0].nazev = 'Výtah N1b';
  const t2 = await uloz(z, cO);
  test('RJ N1: po „V pořádku“ vazba zápis doloží (pojistka)', rp.ok === true && ul2.pdVazbaWebhook.stav === 'potvrzeno' && t2.pdPoznamka === 'zalozeno', { rp, s: t2.pdPoznamka });
  /* Model: „webhook“ jen u zakázky založené webhookem. */
  const norm = (x) => String(x || '');
  const zw = (autor, stav) => ({ autor, pdDealId: '77', pdVazbaWebhook: { deal: '77', stav, kdy: '2026-11-22T08:00:00.000Z' } });
  test('RJ N1: model — „webhook“ u zakázky založené webhookem doloží, u ručně založené ne; „ceka“ nikdy',
    !!pdVazbaDokladaZapis(zw('pipedrive-webhook', 'webhook'), norm) && !pdVazbaDokladaZapis(zw('bz.pd@priklad.cz', 'webhook'), norm)
    && !pdVazbaDokladaZapis(zw('pipedrive-webhook', 'ceka'), norm) && !!pdVazbaDokladaZapis(zw('bz.pd@priklad.cz', 'potvrzeno'), norm));
  /* RJ R2 (revize Fable 22. 11. 2026): zrušení vazby autorem, mazání odkazu v dealu
   * se nepovede (chyba / časová mez / strop — zrušení se přesto dokončí), odkaz od
   * webhooku v dealu zůstane a míří na útočníkovu zakázku. Útočník deal připojí
   * znovu → pravidlo 2 („odkaz“) nesmí zápis pustit (deal je v pdDealyOdmitnute,
   * vazba „zruseno“). */
  {
    const cizi2 = D().dealy.find((d) => d.status === 'open' && d.org_id && d.id > cizi.id && !d.custom_fields[CN]);
    const cislo2 = '2026 - OPR - CN - 9986 - CIZI';
    cizi2.custom_fields[CN] = cislo2;
    const za = nova(); za.cislo = cislo2; za.pdDealId = String(cizi2.id);
    const ta = await uloz(za, cO);
    await webhookFn(new Request('http://x/api/pd/webhook', { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-kalkulator-klic': process.env.PIPEDRIVE_WEBHOOK_KLIC }, body: JSON.stringify({ dealId: cizi2.id }) }));
    const hashOdkaz = D().pole.deal.find(p => p.field_name === 'Odkaz na kalkulaci').field_code;
    const odkaz = cizi2.custom_fields[hashOdkaz];
    const rz = await (await post(vazbaFn, 'http://x/api/pd/vazba', { soubor: ta.soubor, akce: 'zrusit' }, cO)).json();
    cizi2.custom_fields[hashOdkaz] = odkaz;   // mazání odkazu se „nepovedlo“ — odkaz zůstal v dealu
    const ulz = JSON.parse(pamet.get('zakazky/z/' + ta.soubor));
    test('RJ R2: příprava — webhook zapsal odkaz, autor vazbu zrušil (deal odmítnutý), odkaz v dealu zůstal', /zakazka=/.test(String(odkaz || ''))
      && rz.ok === true && ulz.pdVazbaWebhook.stav === 'zruseno' && (ulz.pdDealyOdmitnute || []).includes(String(cizi2.id)), { rz, v: ulz.pdVazbaWebhook });
    const pred = notes().length;
    const zb = JSON.parse(JSON.stringify(ulz)); zb.pdDealId = String(cizi2.id); zb.varianty[0].data.ock.dalsi[0].nazev = 'Výtah R2';
    const tb = await uloz(zb, cO);
    test('RJ R2: deal připojený znovu po zrušení vazby — odkaz od webhooku zápis nepustí (neovereno)', tb.status === 200
      && tb.pdPoznamka === 'neovereno' && notes().length === pred, { s: tb.status, p: tb.pdPoznamka, v: tb.varovani, ch: tb.chyba });
    /* Starší data: vazba „zruseno“ bez seznamu odmítnutých dealů — taky nic. */
    const raw = JSON.parse(pamet.get('zakazky/z/' + ta.soubor)); delete raw.pdDealyOdmitnute; delete raw.pdPoznamkaSachty;
    pamet.set('zakazky/z/' + ta.soubor, JSON.stringify(raw));
    const zc = JSON.parse(JSON.stringify(raw)); zc.varianty[0].data.ock.dalsi[0].nazev = 'Výtah R2b';
    const tc = await uloz(zc, cO);
    test('RJ R2: vazba „zruseno“ bez seznamu odmítnutých (starší data) — odkaz zápis nepustí', tc.status === 200
      && tc.pdPoznamka === 'neovereno' && notes().length === pred, { s: tc.status, p: tc.pdPoznamka, ch: tc.chyba });
    /* Deal v seznamu odmítnutých, vazba už jiná / žádná (např. pozdější webhook
     * jiného dealu) — odmítnutý deal odkaz taky nedoloží. */
    const raw2 = JSON.parse(pamet.get('zakazky/z/' + ta.soubor)); delete raw2.pdVazbaWebhook; delete raw2.pdPoznamkaSachty;
    raw2.pdDealyOdmitnute = [String(cizi2.id)]; pamet.set('zakazky/z/' + ta.soubor, JSON.stringify(raw2));
    const zd = JSON.parse(JSON.stringify(raw2)); zd.varianty[0].data.ock.dalsi[0].nazev = 'Výtah R2c';
    const td = await uloz(zd, cO);
    test('RJ R2: deal v seznamu odmítnutých bez vazby — odkaz zápis nepustí', td.status === 200
      && td.pdPoznamka === 'neovereno' && notes().length === pred, { s: td.status, p: td.pdPoznamka, ch: td.chyba });
  }
  delete process.env.PIPEDRIVE_WEBHOOK_KLIC;
}
{
  /* RJ (#704-4, J. V. 22. 11. 2026): „Opravit firmu v Pipedrive" (pd_organizace,
   * náhled i zápis, mez B209) jen u dealu, který zakázce patří (pd_overeni.mjs). */
  const z = nova(); z.cislo = '2026 - OPR - CN - 9970 - TEST'; z.ico = '27074358';
  const cizi = D().dealy.find((d) => d.status === 'open' && d.org_id && d.id > 1200 && !d.custom_fields[CN]);
  z.pdDealId = String(cizi.id); const t = await uloz(z, cO);
  const patchPred = SIM.pdSimStav().pozadavky.filter(p => /^PATCH/.test(p)).length;
  for (const akce of ['nahled', 'zapis']) {
    const r = await post(orgFn, 'http://x/api/pd/organizace', { soubor: t.soubor, akce, organizace: cizi.org_id, pole: ['nazev'] }, cO);
    const o = await r.json();
    test('RJ #704-4: oprava firmy (' + akce + ') u dealu bez vazby — 409 neověřeno, do Pipedrive nic', r.status === 409 && o.stav === 'neovereno'
      && /nepatří/.test(o.chyba || '') && SIM.pdSimStav().pozadavky.filter(p => /^PATCH/.test(p)).length === patchPred, { s: r.status, o });
  }
  cizi.custom_fields[D().pole.deal.find(p => p.field_name === 'Odkaz na kalkulaci').field_code] = 'http://x/?zakazka=' + encodeURIComponent(t.soubor);
  const r2 = await post(orgFn, 'http://x/api/pd/organizace', { soubor: t.soubor, akce: 'nahled' }, cO);
  const o2 = await r2.json();
  test('RJ #704-4: s odkazem na kalkulaci ověření projde (pojistka; dál rozhoduje shoda IČO)', o2.stav !== 'neovereno' && !/nepatří/.test(o2.chyba || ''), { s: r2.status, o2 });
}

{
  /* RJ (doplněk koordinace): totéž celou cestou uložení — skutečný Pipedrive (token),
   * zápis vypnutý: uložení projde, odpověď varuje, do sítě nic (fetch hlídaný).
   * Simulátor zápis povoluje vždy (pdZapisPovolen), proto se tu na chvíli vypne. */
  const simPred = process.env.PIPEDRIVE_SIMULATOR;
  delete process.env.PIPEDRIVE_SIMULATOR; delete process.env.PIPEDRIVE_ZAPIS;
  process.env.PIPEDRIVE_TOKEN = 'testovaci-token-nic-neplati'; process.env.PIPEDRIVE_DOMENA = 'zkusebni';
  const z = nova(); z.pdDealId = '1001';
  const pred = sit.length;
  const t = await uloz(z, cA);
  test('RJ: uložení s vypnutým zápisem — 200, stav bez (odpověď ho neuvádí), varování v odpovědi, do Pipedrive nic',
    t.status === 200 && t.pdPoznamka === undefined && /Zápis do Pipedrive je vypnutý/.test(t.varovani || '') && sit.length === pred,
    { s: t.status, p: t.pdPoznamka, v: t.varovani, sit: sit.slice(pred) });
  delete process.env.PIPEDRIVE_TOKEN; delete process.env.PIPEDRIVE_DOMENA;
  if (simPred !== undefined) process.env.PIPEDRIVE_SIMULATOR = simPred;
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
if (fail) console.log('\nSelhalo:\n - ' + selhalo.join('\n - '));
process.exit(fail ? 1 : 0);
