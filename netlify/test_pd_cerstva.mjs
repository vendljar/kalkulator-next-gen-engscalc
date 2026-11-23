/* ============================================================
 * PD (#733, #729) — KALKULACE ZALOŽENÁ WEBHOOKEM PIPEDRIVE
 * (J. V. 23. 11. 2026 po zkoušce dealu TEST na testu, nález K53-N2)
 *
 * Proti simulátoru Pipedrive (PIPEDRIVE_SIMULATOR=1), do sítě nic:
 *   1. #733 server: nově založená kalkulace nese příznak `pdCerstva` (čerstvá,
 *      dosud neuložená člověkem); opakované doručení ho nechá; uložení
 *      z prohlížeče ho VŽDY zahodí (i podvržený na vlastní zakázce), obnova
 *      z otisku serveru ho drží;
 *   2. #733 jádro: pdCerstvaPriprav nad platným ceníkem = „Nová zakázka“
 *      (ceník OCK i PROJ s marží a cenami dle nabídky, zadání, výchozí
 *      zaškrtnutí z matice) a hlavička / krycí list z dealu zůstanou;
 *      přepočet na platný ceník pak nic nemění (#732: žádné řádky změn);
 *      bez příznaku (rozdělaná zakázka) a u zamčené varianty nic;
 *   3. #729: kontaktní osoba z dealu jen jméno — bez e-mailu a telefonu;
 *      odeslaná (zmrazená) kalkulace beze změny.
 * Klient (onlineOtevri, #728 zámek čtení) hlídá src/test_pd_cerstva_ui.js,
 * celou cestu v prohlížeči overit_pd_cerstva.mjs.
 * Pojistka: na 173ab6a (před opravou) sada padá v 1., 2. i 3.
 * Spuštění: node netlify/test_pd_cerstva.mjs
 * ============================================================ */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PROSTREDI', 'PIPEDRIVE_WEBHOOK_KLIC',
  'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL', 'DEPLOY_URL', 'DEPLOY_PRIME_URL']) delete process.env[k];
process.env.PIPEDRIVE_SIMULATOR = '1';
const KLIC = 'kng-test-webhook-klic-pd733-0123456789abcdefghijk';
process.env.PIPEDRIVE_WEBHOOK_KLIC = KLIC;

const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const venku = [];
globalThis.fetch = async (url) => { venku.push(String(url)); throw new Error('síť je v testu zakázaná: ' + url); };
const puvodniLog = console.log;
console.log = (...a) => { if (typeof a[0] === 'string' && a[0].startsWith('pd_webhook: ')) return; puvodniLog(...a); };

const A = await import('./lib/ares_server.mjs');
A.ARES_SIT.fetch = async () => new Response('{}', { status: 404 });   // ARES: subjekt nenalezen (firma z dealu)
const { default: webhook } = await import('./functions/pd_webhook.mjs');
const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: program } = await import('./functions/program.mjs');
const { default: zakazky } = await import('./functions/zakazky.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const SIM = await import('./lib/pipedrive_simulator.mjs');
const V = await import('./lib/pd_vazba.mjs');
const { jadro } = await import('./lib/jadro.mjs');
await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const ZC = require('../src/zkusebni_cenik.js');
const G = globalThis;

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 700))); }
};
const kopie = (x) => JSON.parse(JSON.stringify(x));
async function volej(dealId) {
  const r = await webhook(new Request('https://testweb.example/api/pd/webhook', { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-kalkulator-klic': KLIC }, body: JSON.stringify({ dealId }) }));
  let j = {}; try { j = JSON.parse(await r.text()); } catch (e) { j = {}; }
  return { status: r.status, ...j };
}
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const postJ = async (fn, url, telo, cookie) => { const r = await post(fn, url, telo, cookie); let j = {};
  try { j = JSON.parse(await r.text()); } catch (e) { j = {}; } return { status: r.status, ...j }; };
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h })).headers.get('set-cookie') || '').split(';')[0];
const zakazka = (soubor) => JSON.parse(pamet.get('zakazky/z/' + soubor) || 'null');
const D = () => SIM.pdSimStav().data;

/* Platný ceník v jádře = zkušební (prohlížeč ho má po progPouzij). */
const PLATNY = { cenik: ZC.zkusebniCenik(), proj: { cenik: ZC.zkusebniCenikProj() } };
/* + ceny „dle nabídky“ (S13): příznaky jako v sestavení, částky nenulové. */
PLATNY.cenik.dleNabidky = kopie(G.DEFAULT_CENIK.dleNabidky || {});
Object.keys(PLATNY.cenik.dleNabidky).forEach((c, i) => { PLATNY.cenik.priplatky[c.split('.').pop()] = 1100 + 10 * i; });
const dnesni = () => ({ cenik: G.DEFAULT_CENIK, proj: { cenik: G.DEFAULT_CENIK_PROJ } });
const BUILD = { cenik: kopie(G.DEFAULT_CENIK), proj: kopie(G.DEFAULT_CENIK_PROJ) };
const nasadPlatny = () => { G.konfigNahradVMiste(G.DEFAULT_CENIK, kopie(PLATNY.cenik)); G.konfigNahradVMiste(G.DEFAULT_CENIK_PROJ, kopie(PLATNY.proj.cenik)); };
const nasadBuild = () => { G.konfigNahradVMiste(G.DEFAULT_CENIK, kopie(BUILD.cenik)); G.konfigNahradVMiste(G.DEFAULT_CENIK_PROJ, kopie(BUILD.proj)); };
/* Otevření v prohlížeči: import nad platným ceníkem (zakazkaCenikDopln). */
const otevri = (z) => { G.cenikDnesniProVariantu = (v) => G.cenikDnesniProRadu(dnesni(), null, G.cenikRadaVarianty(v && v.data));
  try { return G.importZakazka(kopie(z)); } finally { delete G.cenikDnesniProVariantu; } };
const MAT = G.zobrazeniVychozi();
const vychozi = (ock, proj) => G.zobrazeniVychoziAplikuj(MAT, ock, proj);

/* ---------- příprava ---------- */
const cA = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
const rp = await post(program, 'http://x/api/program', { cenik: kopie(PLATNY.cenik), cenikProj: kopie(PLATNY.proj.cenik),
  slevy: { minMarze: 0, maxGlobalni: 0.3, stropy: {} }, poznamka: 'x' }, cA);
test('příprava: přihlášení a zveřejněný ceník', !!cA && rp.status === 200);
test('příprava: zkušební ceník má marži a cenu „dle nabídky“ (jinak by test nic nedokazoval)',
  PLATNY.cenik.marze > 0 && PLATNY.proj.cenik.marze > 0 && G.cenikDleNabidkyJe(PLATNY.cenik, 'C.priplatky.zabranyPadKc')
  && PLATNY.cenik.priplatky.zabranyPadKc > 0 && G.DEFAULT_CENIK.marze === 0, [PLATNY.cenik.marze, PLATNY.proj.cenik.marze]);
const pouzite = new Set();
const osoba = (d) => D().osoby.find((o) => o.id === d.person_id) || {};
const sKontakty = (d) => (osoba(d).emails || []).length > 0 && (osoba(d).phones || []).length > 0;
const dealS = () => {
  const d = D().dealy.find((x) => x.status === 'open' && x.org_id && x.person_id && /^CN-\d+ /.test(x.title) && !pouzite.has(x.org_id) && sKontakty(x));
  if (d) pouzite.add(d.org_id);
  return d;
};
const D1 = dealS(), D2 = dealS(), D3 = dealS();
test('příprava: tři dealy s osobou, která má e-mail i telefon', !!(D1 && D2 && D3));

/* ---------- 1. #733 SERVER: PŘÍZNAK pdCerstva ---------- */
console.log('\n===== 1. #733 příznak čerstvé kalkulace =====\n');
let r = await volej(D1.id);
const S1 = r.soubor;
let z1 = zakazka(S1);
test('webhook založí kalkulaci (200, „zalozeno“)', r.status === 200 && r.akce === 'zalozeno' && !!z1, r);
test('nová kalkulace z webhooku nese pdCerstva = true', z1 && z1.pdCerstva === true, z1 && z1.pdCerstva);
test('… a dál je „bez ceníku“ (P12 — server ceník nevolí)', z1 && z1.cenikyVynechany === true && !z1.varianty[0].data.cenik);
r = await volej(D1.id);
test('opakované doručení příznak nechá', r.status === 200 && zakazka(S1).pdCerstva === true, [r.status, r.akce]);
/* Uložení z prohlížeče (jako po otevření a úpravě) — příznak zmizí. */
nasadPlatny();
let v = otevri(zakazka(S1));
v.adresa = 'Ručně upravená adresa 1, Vzorov';
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: v, ocekavaneRazitko: G.uloRazitko(zakazka(S1)) }, cA);
test('uložení z prohlížeče příznak zahodí (už to není čerstvá kalkulace)', r.status === 200 && zakazka(S1).pdCerstva === undefined, [r.status, r.chyba, zakazka(S1).pdCerstva]);
v = otevri(zakazka(S1)); v.pdCerstva = true;
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: v, ocekavaneRazitko: G.uloRazitko(zakazka(S1)) }, cA);
test('podvržený příznak od klienta se nepřijme', r.status === 200 && zakazka(S1).pdCerstva === undefined, [r.status, r.chyba]);
const vlastni = G.novaZakazka(); vlastni.cislo = '2026 - OPR - CN - 7331'; vlastni.pdCerstva = true;
r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: otevri(vlastni) }, cA);
test('… ani na nové zakázce založené v prohlížeči', r.status === 200 && zakazka(r.soubor) && zakazka(r.soubor).pdCerstva === undefined, [r.status, r.chyba]);
{
  const st = { pdCerstva: true }, zz = { pdCerstva: true };
  V.pdVazbaDrz(null, zz, { obnova: true });
  const zs = { pdCerstva: true }; V.pdVazbaDrz(st, zs, { obnova: true, zeSouboru: true });
  const zx = { pdCerstva: 'ano' }; V.pdVazbaDrz(null, zx, { obnova: true });
  test('obnova z otisku serveru příznak drží (jen true), obnova ze souboru ne', zz.pdCerstva === true && zs.pdCerstva === undefined && zx.pdCerstva === undefined);
}
nasadBuild();

/* ---------- 2. #733 JÁDRO: PŘÍPRAVA JAKO NOVÁ ZAKÁZKA ---------- */
console.log('\n===== 2. #733 pdCerstvaPriprav = Nová zakázka =====\n');
r = await volej(D2.id);
const S2 = r.soubor, ulozena2 = zakazka(S2);
test('druhý deal: kalkulace založena s příznakem', r.status === 200 && ulozena2.pdCerstva === true, r);
nasadPlatny();
const z2 = otevri(ulozena2);
const pred = kopie(z2);
const n2 = G.pdCerstvaPriprav(z2, { vychozi });
const nova = G.novaVariantaData(); vychozi(nova.ock.zadani, nova.proj.zadani);
const d2 = z2.varianty[0].data;
test('připravena 1 varianta, příznak zmizel', n2 === 1 && z2.pdCerstva === undefined, n2);
test('marže OCK i PROJ z platného ceníku (ne 0)', d2.cenik.marze === PLATNY.cenik.marze && d2.proj.cenik.marze === PLATNY.proj.cenik.marze,
  [d2.cenik.marze, d2.proj.cenik.marze]);
const DLE = ['zabranyPadKc', 'demontazOhrazeniKc', 'malbaSchodnicKc', 'naterOhrazeniKc', 'naterOkopovychKc', 'prosklenaStenaKc', 'demontazVytahuKc', 'destovySvodKc'];
test('ceny „dle nabídky“ (8 příplatků) z platného ceníku', DLE.every((k) => d2.cenik.priplatky[k] === PLATNY.cenik.priplatky[k]),
  DLE.map((k) => [k, d2.cenik.priplatky[k], PLATNY.cenik.priplatky[k]]));
test('ceník OCK i PROJ = Nová zakázka', JSON.stringify(d2.cenik) === JSON.stringify(nova.cenik) && JSON.stringify(d2.proj.cenik) === JSON.stringify(nova.proj.cenik));
test('zadání OCK i PROJ (výchozí zaškrtnutí z matice) = Nová zakázka', JSON.stringify(d2.ock.zadani) === JSON.stringify(nova.ock.zadani)
  && JSON.stringify(d2.proj.zadani) === JSON.stringify(nova.proj.zadani));
test('… a výchozí zaškrtnutí se oproti uložené kalkulaci opravdu změnilo (test není prázdný)',
  JSON.stringify(pred.varianty[0].data.ock.zadani) !== JSON.stringify(d2.ock.zadani));
test('hlavička z dealu (číslo, název akce, zákazník, kontakt) zůstala', ['cislo', 'nazevAkce', 'objednatel', 'kontakt', 'ico'].every((k) => z2[k] === pred[k]) && !!z2.nazevAkce);
test('krycí list (datum z dealu) zůstal', JSON.stringify(d2.kryci) === JSON.stringify(pred.varianty[0].data.kryci));
const prep = G.cenikPrepoctiRozpracovane(z2, dnesni(), { zahr: null, verze: 7, platnoOd: '2026-11-23', build: 'x' });
test('#732: přepočet na platný ceník po přípravě nemění žádnou cenu (jen razítko)', prep.prepocteno === 0 && prep.zmen === 0, prep);
/* Kontrola, že bez přípravy by kalkulace marži neměla (cesta K53-N2: doplněno nad
 * ceníkem ze sestavení, pak přepočet „rozdělané“ zakázky marži chrání). */
nasadBuild();
const bez = otevri(ulozena2);
nasadPlatny();
const prepBez = G.cenikPrepoctiRozpracovane(bez, dnesni(), { zahr: null, verze: 7, platnoOd: '2026-11-23', build: 'x' });
test('bez přípravy (K53-N2) by marže zůstala 0 a přepočet měnil řadu cen', bez.varianty[0].data.cenik.marze === 0 && prepBez.zmen > 10, [bez.varianty[0].data.cenik.marze, prepBez.zmen]);
/* Bez příznaku = rozdělaná práce obchodníka: nic. */
const rozd = otevri(ulozena2); delete rozd.pdCerstva; rozd.varianty[0].data.cenik.marze = 0.45;
const rozdPred = JSON.stringify(rozd);
test('bez příznaku se nic nepřipravuje (ochrana rozdělané zakázky)', G.pdCerstvaPriprav(rozd, { vychozi }) === 0 && JSON.stringify(rozd) === rozdPred);
const zam = otevri(ulozena2); zam.varianty[0].zamek = { zamceno: true }; zam.varianty[0].data.cenik.marze = 0.11;
const nz = G.pdCerstvaPriprav(zam, { vychozi });
test('zamčená varianta se nemění ani u čerstvé kalkulace', nz === 0 && zam.varianty[0].data.cenik.marze === 0.11, nz);
nasadBuild();

/* ---------- 3. #729 KONTAKT JEN JMÉNO ---------- */
console.log('\n===== 3. #729 kontaktní osoba jen jméno =====\n');
r = await volej(D3.id);
const z3 = zakazka(r.soubor), o3 = osoba(D3);
const jmeno3 = [o3.first_name, o3.last_name].filter(Boolean).join(' ');
test('kontaktní osoba = jméno osoby dealu', r.status === 200 && z3.kontakt === jmeno3 && !!jmeno3, [z3 && z3.kontakt]);
test('… bez e-mailu a telefonu', !/@|\+?\d{3}\s?\d{3}\s?\d{3}/.test(z3.kontakt) && !(o3.emails || []).some((e) => z3.kontakt.includes(e.value)), z3.kontakt);
/* Zmrazená (odeslaná) kalkulace se starým kontaktem — webhook ji nemění. */
const z1s = zakazka(S1);
const kontaktStary = jmeno3 + ', ' + ((o3.emails || [])[0] || {}).value;
z1s.kontakt = kontaktStary; z1s.varianty[0].zamek = { zamceno: true, kdy: '2026-11-20T08:00:00.000Z' };
pamet.set('zakazky/z/' + S1, JSON.stringify(z1s));
r = await volej(D1.id);
test('odeslaná (zamčená) kalkulace: kontakt beze změny', zakazka(S1).kontakt === kontaktStary, [r.status, zakazka(S1).kontakt]);
test('do sítě nic', venku.length === 0, venku);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
