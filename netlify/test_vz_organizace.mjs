/* VZ-E5b (#605, 16. 11. 2026) — ORGANIZACE DEALU = VÍTĚZNÝ ZÁKAZNÍK.
 *
 * POST /api/pd/organizace { soubor, akce: 'vitez' } (návrh v3 § 7.4):
 *  1) nalezena (jedna organizace s IČO vítěze) → PATCH dealu jen { org_id }
 *  2) založena z ARES (název, adresa, DIČ jen když pole je, vlastník dealu)
 *  3) založena z hlavičky při výpadku ARES
 *  4) víc shod → `vice`, nic se nezapisuje, názvy a počet
 *  5) kandidát, kterého hledání vrátí s jiným IČO → neověří se (založí se)
 *  6) bez IČO / neplatné IČO → `bez-ico`
 *  7) shoda (organizace dealu už má IČO vítěze) → nic, bez upozornění
 *  8) bez práva crm.pipedrive → `bez-prava` (200), cizí uživatel 403,
 *     prodávající (prodano.kdo) smí, neprodaná 409, jeden zákazník 409, VYP 409
 *  9) PATCH selže po založení → opakování nezaloží druhou
 * 10) časový limit (visi) a strop (deal 10 / h)
 * 11) podvržené pdOrgVitez z prohlížeče se zahodí (uložení zakázky)
 * 12) název firmy s HTML a řídicími znaky
 * 13) do původní organizace nic, žádné /persons ani person_id; kontaktní
 *     osoba: věta v protokolu právě jednou i po opakovaném volání
 * 14) K40c: „Opravit firmu“ před přepsáním 409, po přepsání nad vítězem 200
 * Jen simulátor Pipedrive (PIPEDRIVE_SIMULATOR=1) a předaný fetch pro ARES;
 * síť je zakázaná. Pojistka: na bázi 26f3c26 (bez akce 'vitez') sada padá
 * už v bodě 1 (400 „Chybí zakázka nebo akce“).
 * Spuštění: node netlify/test_vz_organizace.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PROSTREDI',
  'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL']) delete process.env[k];
process.env.PIPEDRIVE_SIMULATOR = '1';
const KLIC = 'kng-test-webhook-klic-vz-e5b-0123456789abcdefghijk';
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

const R = new URL('..', import.meta.url).pathname;
const A = await import(R + 'netlify/lib/ares_server.mjs');
const ares = { rezim: 'ok', volani: 0, subjekty: new Map() };
const odp = (telo, status = 200) => new Response(typeof telo === 'string' ? telo : JSON.stringify(telo), { status });
A.ARES_SIT.fetch = async (url) => {
  ares.volani++;
  const ico = String(url).split('/').pop();
  if (ares.rezim === '500') return odp('{}', 500);
  const s = ares.subjekty.get(ico);
  return s ? odp(s) : odp('{}', 404);
};

const { default: prihlaseni } = await import(R + 'netlify/functions/prihlaseni.mjs');
const { default: program } = await import(R + 'netlify/functions/program.mjs');
const { default: zakazky } = await import(R + 'netlify/functions/zakazky.mjs');
const { default: funkce } = await import(R + 'netlify/functions/funkce.mjs');
const { default: uzivatele } = await import(R + 'netlify/functions/uzivatele.mjs');
const { default: orgFn } = await import(R + 'netlify/functions/pd_organizace.mjs');
const { default: webhook } = await import(R + 'netlify/functions/pd_webhook.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
await jadro();
const SIM = await import(R + 'netlify/lib/pipedrive_simulator.mjs');
const OV = await import(R + 'netlify/lib/pd_org_vitez.mjs');
const { pdHashZNazvu } = await import(R + 'netlify/lib/pd_mapa.mjs');
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const G = globalThis;

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 600)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const postJ = async (fn, url, telo, cookie) => { const r = await post(fn, url, telo, cookie); let j = {}; try { j = await r.json(); } catch (e) { j = {}; } return { status: r.status, ...j }; };
const vitez = (soubor, cookie, navic) => postJ(orgFn, 'http://x/api/pd/organizace', { soubor, akce: 'vitez', ...(navic || {}) }, cookie);
const opravOrg = (soubor, akce, cookie, navic) => postJ(orgFn, 'http://x/api/pd/organizace', { soubor, akce, ...(navic || {}) }, cookie);
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h })).headers.get('set-cookie') || '').split(';')[0];
const kopie = x => JSON.parse(JSON.stringify(x));
const zakazka = (soubor) => JSON.parse(pamet.get('zakazky/z/' + soubor) || 'null');
const zapis = (soubor, z) => pamet.set('zakazky/z/' + soubor, JSON.stringify(z));
const D = () => SIM.pdSimStav().data;
const poz = () => SIM.pdSimStav().pozadavky;
const HASH_IC = pdHashZNazvu('IČ');

const cA = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
await post(program, 'http://x/api/program', { cenik: Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()), cenikProj: ZC.zkusebniCenikProj(), poznamka: 'VZ-E5b' }, cA);
for (const [e, j] of [['obch.autor@priklad.cz', 'Autor Test'], ['obch.cizi@priklad.cz', 'Cizí Test'], ['obch.prodal@priklad.cz', 'Prodal Test']])
  await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: e, jmeno: j, role: 'Obchodník', heslo: 'Heslo12345x' }, cA);
const cAutor = await login('obch.autor@priklad.cz', 'Heslo12345x');
const cCizi = await login('obch.cizi@priklad.cz', 'Heslo12345x');
const cProdal = await login('obch.prodal@priklad.cz', 'Heslo12345x');
test('příprava: přihlášení čtyř účtů', !!(cA && cAutor && cCizi && cProdal));
const vypinac = async (telo) => { const r = await post(funkce, 'http://x/api/funkce', telo, cA); if (r.status !== 200) throw new Error('funkce ' + r.status); };
await vypinac({ viceZakazniku: true });

function icoS(z7) { let s = 0; for (let i = 0; i < 7; i++) s += (+z7[i]) * (8 - i); const z = s % 11; return z7 + String(z === 0 ? 1 : (z === 1 ? 0 : 11 - z)); }
const subjekt = (ico, nazev, extra) => ({ ico, obchodniJmeno: nazev, dic: 'CZ' + ico, sidlo: { textovaAdresa: 'Zkušební ' + ico.slice(-2) + ', 110 00 Vzorov' }, ...(extra || {}) });
/* Organizace se smyšleným IČO přímo v simulátoru. */
let orgN = 0;
function orgSim(ico, nazev) {
  const o = { id: Math.max(5000, ...D().organizace.map(x => x.id)) + 1 + 0 * (++orgN), name: nazev, owner_id: 1, address: { value: 'Smyšlená ' + orgN }, custom_fields: { [HASH_IC]: Number(ico) } };
  D().organizace.push(o); return o;
}
const pouzite = new Set();
const dealNovy = () => { const d = D().dealy.find((x) => x.status === 'open' && x.org_id && !pouzite.has(x.id) && x.id > 1100); pouzite.add(d.id); return d; };

let cisloN = 9800, sN = 0;
/* Prodaná zakázka s víc zákazníky, hlavička = vítěz (po prodeji řídící). */
function prodana(deal, ico, { nazev = 'TEST – VÍTĚZ s.r.o.', autor = 'obch.autor@priklad.cz', prodal = 'obch.prodal@priklad.cz', vz = true, prod = true } = {}) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (cisloN++) + ' - TEST'; z.nazevAkce = 'TEST VZ-E5b';
  z.objednatel = nazev; z.adresaObjednatele = 'Vítězná 1, 110 00 Vzorov'; z.ico = ico; z.dic = ico ? 'CZ' + ico : '';
  z.autor = autor; z.pdDealId = String(deal.id);
  if (vz) { const p = G.vzPridej(z, { objednatel: 'TEST – PORAŽENÝ a.s.', adresaObjednatele: 'Jinde 2', ico: '', dic: '', kontakt: '' }, { kdo: 'Test', kdy: '2026-11-16T10:00:00.000Z' });
    if (!p.ok) throw new Error('vzPridej ' + JSON.stringify(p)); }
  const v = z.varianty[0];
  v.zamek = { zamceno: true, kdy: '2026-11-10T10:00:00.000Z' };
  if (prod) v.prodano = { datum: '2026-11-16', kdo: prodal, kdy: '2026-11-16T10:00:00.000Z', pipedrive: { stav: 'ceka', kdy: '2026-11-16T10:00:00.000Z' } };
  const soubor = 'vzorg_' + (++sN) + '.json';
  zapis(soubor, z);
  return soubor;
}
const protokolKontakt = (soubor) => (zakazka(soubor).protokol || []).filter(p => p.co === OV.PD_VITEZ_KONTAKT_VETA).length;
const bezOsob = (od) => !poz().slice(od).some(p => /persons/.test(p));

/* 1) nalezena */
let S1, D1, ORG1;
{
  const ico = icoS('9200001');
  ORG1 = orgSim(ico, 'Vítěz Nalezený s.r.o. (smyšlené)');
  D1 = dealNovy();
  const puvodni = D().organizace.find(o => o.id === D1.org_id); const puvodniKopie = kopie(puvodni);
  S1 = prodana(D1, ico);
  const osoba1 = D1.person_id;
  const od = poz().length;
  const r = await vitez(S1, cAutor);
  const ul = zakazka(S1);
  test('1 nalezena: stav zapsano, zdroj nalezena, deal přepojen', r.status === 200 && r.ok === true && r.stav === 'zapsano' && r.zdroj === 'nalezena'
    && D1.org_id === ORG1.id && ul.pdOrgVitez.org === ORG1.id && ul.pdOrgVitez.stav === 'zapsano' && ul.pdOrgVitez.deal === String(D1.id), { r, org: D1.org_id });
  /* VZ T1 (N3): deal teď vede organizace vítěze — skutečná organizace dealu uložená s IČO vítěze. */
  test('1 T1 N3: pdOrgDealu = organizace vítěze (id, IČO)', ul.pdOrgDealu && ul.pdOrgDealu.deal === String(D1.id) && ul.pdOrgDealu.org === ORG1.id
    && ul.pdOrgDealu.ico === String(ico).padStart(8, '0'), ul.pdOrgDealu);
  const patch = poz().slice(od).filter(p => p.startsWith('PATCH'));
  test('1 PATCH jen dealu (jeden), tělo jen org_id; nic do /organizations POST ani PATCH původní', patch.length === 1 && patch[0] === 'PATCH /api/v2/deals/' + D1.id
    && !poz().slice(od).some(p => p.startsWith('POST')) && JSON.stringify(puvodni) === JSON.stringify(puvodniKopie), poz().slice(od));
  test('1 hledání podle IČO bez úvodních nul, custom_fields, exact_match', poz().slice(od).some(p => p.startsWith('GET /api/v2/organizations/search?')
    && p.includes('term=' + Number(ico)) && p.includes('fields=custom_fields') && p.includes('exact_match=true')), poz().slice(od));
  test('1 odpověď nese upozornění na kontaktní osobu a razítko = uložené', r.upozorneni === 'kontaktni-osoba' && r.razitko && r.razitko === ul.uloRazitko, r);
  test('13 protokol: přepojení a věta o kontaktní osobě právě jednou', protokolKontakt(S1) === 1
    && ul.protokol.some(p => /Přepojil deal/.test(p.co) && /nalezena/.test(p.co)), ul.protokol);
  const tela = SIM.pdSimStav().tela.filter(t => t.pozadavek === 'PATCH /api/v2/deals/' + D1.id);
  test('13 žádný požadavek na /persons; tělo PATCH dealu přesně { org_id } (osoba dealu beze změny)', bezOsob(od) && tela.length === 1
    && tela[0].telo === JSON.stringify({ org_id: ORG1.id }) && D1.person_id === osoba1, { tela, osoba: D1.person_id });
  const r2 = await vitez(S1, cAutor);
  test('13 opakované volání po zápisu → shoda, protokol pořád jednou, bez upozornění', r2.stav === 'shoda' && !r2.upozorneni && protokolKontakt(S1) === 1, r2);
  test('7 shoda: stav uložen, žádný PATCH ani POST', zakazka(S1).pdOrgVitez.stav === 'shoda' && poz().filter(p => p.startsWith('PATCH /api/v2/deals/' + D1.id)).length === 1, r2);
}

/* 2) založena z ARES */
{
  const ico = icoS('9200002');
  ares.subjekty.set(ico, subjekt(ico, 'Vítěz z ARES a.s. (smyšlené)'));
  const d = dealNovy(); const vlastnik = d.owner_id || d.user_id;
  const s = prodana(d, ico, { nazev: 'Hlavička jiný název s.r.o.' });
  const pocet = D().organizace.length; const a0 = ares.volani;
  const r = await vitez(s, cProdal);
  const nova = D().organizace.find(o => o.id === d.org_id);
  test('2 založena z ARES: název, adresa, IČ číslem, vlastník = vlastník dealu', r.stav === 'zapsano' && r.zdroj === 'zalozena' && D().organizace.length === pocet + 1
    && nova && nova.name === 'Vítěz z ARES a.s. (smyšlené)' && /Vzorov/.test(nova.address.value) && nova.custom_fields[HASH_IC] === Number(ico)
    && nova.owner_id === vlastnik && ares.volani === a0 + 1, { r, nova });
  test('2 DIČ se nezapsalo — účet pole DIČ nemá (pole se nezakládá)', nova && Object.keys(nova.custom_fields).length === 1, nova && nova.custom_fields);
  test('8 prodávající (prodano.kdo, není autor) smí', r.status === 200, r);
}

/* 3) založena z hlavičky při výpadku ARES */
{
  const ico = icoS('9200003');
  const d = dealNovy();
  const s = prodana(d, ico, { nazev: 'Vítěz z Hlavičky s.r.o.' });
  ares.rezim = '500';
  const r = await vitez(s, cA);
  ares.rezim = 'ok';
  const nova = D().organizace.find(o => o.id === d.org_id);
  test('3 výpadek ARES → založena z hlavičky zakázky', r.stav === 'zapsano' && r.zdroj === 'zalozena' && nova && nova.name === 'Vítěz z Hlavičky s.r.o.'
    && nova.address.value === 'Vítězná 1, 110 00 Vzorov', { r, nova });
}

/* 4) víc shod */
{
  const ico = icoS('9200004');
  orgSim(ico, 'Dvojník A s.r.o.'); orgSim(ico, 'Dvojník B s.r.o.');
  const d = dealNovy(); const org0 = d.org_id; const pocet = D().organizace.length;
  const s = prodana(d, ico);
  const od = poz().length;
  const r = await vitez(s, cAutor);
  test('4 víc shod → vice, počet a názvy, nic se nezapisuje', r.status === 200 && r.ok === false && r.stav === 'vice' && r.vice.pocet === 2
    && r.vice.nazvy.join() === 'Dvojník A s.r.o.,Dvojník B s.r.o.' && d.org_id === org0 && D().organizace.length === pocet
    && !poz().slice(od).some(p => p.startsWith('PATCH') || p.startsWith('POST')) && /víc organizací/.test(r.duvod)
    && zakazka(s).pdOrgVitez.stav === 'vice' && protokolKontakt(s) === 0, r);
}

/* 5) kandidát z hledání s jiným IČO */
{
  const ico = icoS('9200005');
  const podvrh = orgSim(icoS('9200015'), 'Podvržený kandidát s.r.o.');
  D().hledaniNavic = [podvrh.id];
  ares.subjekty.set(ico, subjekt(ico, 'Skutečný vítěz s.r.o. (smyšlené)'));
  const d = dealNovy();
  const s = prodana(d, ico);
  const od = poz().length;
  const r = await vitez(s, cAutor);
  D().hledaniNavic = [];
  test('5 kandidát s jiným IČO se znovu načte a neověří → založí se nová, podvrh se nepoužije', r.stav === 'zapsano' && r.zdroj === 'zalozena'
    && d.org_id !== podvrh.id && poz().slice(od).includes('GET /api/v2/organizations/' + podvrh.id), { r, org: d.org_id });
}

/* 5b) smazaná organizace s IČO vítěze, kterou hledání (zpožděný index) ještě vrátí */
{
  const ico = icoS('9200012');
  const smazana = orgSim(ico, 'Smazaná organizace s.r.o.'); smazana.is_deleted = true;
  D().hledaniNavic = [smazana.id];
  ares.subjekty.set(ico, subjekt(ico, 'Živý vítěz s.r.o. (smyšlené)'));
  const d = dealNovy(); const s = prodana(d, ico);
  const r = await vitez(s, cAutor);
  D().hledaniNavic = [];
  test('5b smazaná organizace se jako kandidát nepoužije → založí se nová', r.stav === 'zapsano' && r.zdroj === 'zalozena' && d.org_id !== smazana.id, { r, org: d.org_id });
}

/* 6) bez IČO */
{
  for (const [popis, ico] of [['prázdné', ''], ['neplatná kontrolní číslice', '12345678']]) {
    const d = dealNovy(); const org0 = d.org_id;
    const s = prodana(d, ico);
    const od = poz().length;
    const r = await vitez(s, cAutor);
    test('6 IČO ' + popis + ' → bez-ico, do Pipedrive nic', r.status === 200 && r.stav === 'bez-ico' && d.org_id === org0 && poz().length === od
      && zakazka(s).pdOrgVitez.stav === 'bez-ico' && /IČO/.test(r.duvod), r);
  }
}

/* 8) práva a podmínky */
{
  const ico = icoS('9200006');
  orgSim(ico, 'Vítěz Práva s.r.o.');
  const d = dealNovy(); const s = prodana(d, ico);
  const od = poz().length;
  let r = await vitez(s, cCizi);
  test('8 cizí uživatel (není autor, neprodal, není admin) → 403, nic', r.status === 403 && poz().length === od && !zakazka(s).pdOrgVitez, r);
  pamet.set('program/zobrazeni', JSON.stringify({ matice: { 'crm.pipedrive': { 'Obchodník': false } } }));
  r = await vitez(s, cAutor);
  test('8 autor bez práva crm.pipedrive → 200 bez-prava, do Pipedrive nic, stav uložen', r.status === 200 && r.stav === 'bez-prava' && poz().length === od
    && zakazka(s).pdOrgVitez.stav === 'bez-prava', r);
  const rN = await opravOrg(s, 'nahled', cAutor);
  test('8 „Opravit firmu“ bez práva dál 403 (beze změny K40c)', rN.status === 403, rN);
  pamet.delete('program/zobrazeni');
  const sN = prodana(dealNovy(), ico, { prod: false });
  r = await vitez(sN, cAutor);
  test('8 neprodaná zakázka → 409', r.status === 409 && /není prodaná/.test(r.chyba), r);
  const s1 = prodana(dealNovy(), ico, { vz: false });
  r = await vitez(s1, cAutor);
  test('8 jeden zákazník → 409', r.status === 409 && /jednoho zákazníka/.test(r.chyba), r);
  await vypinac({ viceZakazniku: false });
  r = await vitez(s, cA);
  test('8 vypínač VYP → 409, do Pipedrive nic', r.status === 409 && poz().length === od, r);
  await vypinac({ viceZakazniku: true });
  r = await vitez('nic_takoveho.json', cA);
  test('8 neznámá zakázka → 404', r.status === 404, r);
  const zb = zakazka(s); delete zb.pdDealId; const sb = 'vzorg_bezdealu.json'; zapis(sb, zb);
  r = await vitez(sb, cA);
  test('8 bez dealu → 409', r.status === 409, r);
}

/* 9) PATCH selže po založení → opakování nezaloží druhou */
{
  const ico = icoS('9200007');
  ares.subjekty.set(ico, subjekt(ico, 'Vítěz Výpadek s.r.o. (smyšlené)'));
  const d = dealNovy(); const org0 = d.org_id;
  const s = prodana(d, ico);
  const pocet = D().organizace.length;
  /* Háček běží po zapsání požadavku a PŘED odpovědí: výpadek zapnutý u PATCH dealu shodí jen PATCH. */
  SIM.pdSimNastav({ poPozadavku: (p) => { if (p === 'PATCH /api/v2/deals/' + d.id) SIM.pdSimNastav({ scenar: 'vypadek' }); } });
  const r = await vitez(s, cAutor);
  SIM.pdSimNastav({ scenar: '', poPozadavku: null });
  const zal = D().organizace.slice(pocet);
  test('9 příprava: organizace založena, PATCH selhal → chyba, deal beze změny', r.stav === 'chyba' && zal.length === 1 && d.org_id === org0
    && zakazka(s).pdOrgVitez.org === zal[0].id && /opakování ji použije/.test(r.duvod), { r, zal: zal.length });
  /* Index hledání se zpožďuje — nová organizace ve výsledcích hledání zatím není. */
  const skryta = zal[0];
  D().hledaniSkryt = [skryta.id];
  const r2 = await vitez(s, cAutor);
  test('9 opakování: použije založenou (zapamatované id, ověřené IČO), druhou nezaloží', r2.stav === 'zapsano' && r2.zdroj === 'nalezena'
    && D().organizace.length === pocet + 1 && d.org_id === skryta.id, { r2, n: D().organizace.length - pocet });
  D().hledaniSkryt = [];
}

/* 10) časový limit a strop */
{
  const ico = icoS('9200008');
  orgSim(ico, 'Vítěz Čas s.r.o.');
  const d = dealNovy(); const s = prodana(d, ico);
  SIM.pdSimNastav({ scenar: 'visi' });
  const t0 = Date.now();
  const r = await Promise.race([vitez(s, cAutor), new Promise(res => setTimeout(() => res({ stav: 'VISI' }), 15000))]);
  SIM.pdSimNastav({ scenar: '' });
  test('10 visící Pipedrive → chyba do 9 s (+rezerva), stav uložen', r.stav === 'chyba' && Date.now() - t0 < 11000 && zakazka(s).pdOrgVitez.stav === 'chyba'
    && /neodpověděl/.test(r.duvod), { r, ms: Date.now() - t0 });
  test('10 meze: volání 2,5 s, celá akce 9 s, strop 10 / deal, 20 / uživatel', OV.PD_VITEZ_VOLANI_MS === 2500 && OV.PD_VITEZ_CELKEM_MS === 9000
    && OV.PD_VITEZ_STROP_DEAL === 10 && OV.PD_VITEZ_STROP_UZIVATEL === 20);
  let posledni;
  for (let i = 0; i < 12; i++) posledni = await vitez(s, cA);
  test('10 strop pokusů na deal → strop, stav uložen', posledni.stav === 'strop' && zakazka(s).pdOrgVitez.stav === 'strop', posledni);
}

/* 11) podvržené pdOrgVitez z prohlížeče */
{
  const ico = icoS('9200009');
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (cisloN++) + ' - TEST'; z.nazevAkce = 'TEST VZ-E5b podvrh'; z.objednatel = 'TEST – PODVRH s.r.o.'; z.ico = ico;
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.ock.fixes = true; v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()); v.data.proj.cenik = ZC.zkusebniCenikProj();
  z.pdOrgVitez = { deal: '1001', org: 1, stav: 'zapsano', zdroj: 'nalezena', kdy: '2026-11-16T10:00:00.000Z', kdo: 'podvrh' };
  let r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: z }, cA);
  test('11 nová zakázka s podvrženým pdOrgVitez → uloženo bez pole', r.status === 200 && zakazka(r.soubor).pdOrgVitez === undefined, r);
  const soubor = r.soubor;
  const raw = zakazka(soubor); raw.pdOrgVitez = { deal: '1002', org: 7, stav: 'chyba', kdy: '2026-11-16T10:00:00.000Z', kdo: 'Server', duvod: 'x' }; zapis(soubor, raw);
  z.uloRazitko = raw.uloRazitko; z.pdOrgVitez = { deal: '1002', org: 99, stav: 'zapsano', kdy: '2026-11-16T10:00:00.000Z', kdo: 'podvrh' };
  r = await postJ(zakazky, 'http://x/api/zakazky', { zakazka: z, ocekavaneRazitko: z.uloRazitko }, cA);
  test('11 uložená verze nese pdOrgVitez → drží se, prohlížeč ho nepřepíše', r.status === 200 && zakazka(soubor).pdOrgVitez.org === 7
    && zakazka(soubor).pdOrgVitez.stav === 'chyba', zakazka(soubor).pdOrgVitez);
  test('11 tvar: cizí klíče a neplatný stav se zahodí', OV.pdOrgVitezNorm({ deal: '1', stav: 'hacknuto' }) === null
    && !('x' in OV.pdOrgVitezNorm({ deal: '1', org: 2, stav: 'chyba', x: 1, kdy: 'x' })));
}

/* 12) HTML a řídicí znaky v názvu */
{
  const ico = icoS('9200010');
  ares.subjekty.set(ico, subjekt(ico, '<img src=x onerror=alert(1)>\u0007Jed "s.r.o."'));
  const d = dealNovy(); const s = prodana(d, ico);
  const r = await vitez(s, cAutor);
  const nova = D().organizace.find(o => o.id === d.org_id);
  test('12 název s HTML: do Pipedrive jako text bez řídicích znaků, v protokolu a stavu bez řídicích znaků', r.stav === 'zapsano' && nova
    && !/[\u0000-\u001f]/.test(nova.name) && !/[\u0000-\u001f]/.test(zakazka(s).pdOrgVitez.nazev || '')
    && !/[\u0000-\u001f]/.test(JSON.stringify(zakazka(s).protokol.map(p => p.co))), { r, nazev: nova && nova.name });
  const z = OV.pdOrgVitezNorm({ deal: '1', org: 2, stav: 'vice', vice: { pocet: 3, nazvy: ['a\u0000b', 5, '<b>x</b>'] } });
  test('12 názvy u vice: jen texty, bez řídicích znaků', z.vice.nazvy.join('|') === 'a b|<b>x</b>', z);
}

/* 14) K40c: Opravit firmu před a po přepsání */
{
  const ico = icoS('9200011');
  ares.subjekty.set(ico, subjekt(ico, 'Vítěz K40c s.r.o. (smyšlené)'));
  orgSim(ico, 'Vítěz K40c s.r.o. starý název');
  const d = dealNovy(); const s = prodana(d, ico);
  let r = await opravOrg(s, 'nahled', cAutor);
  test('14 před přepsáním: Opravit firmu 409 (IČO organizace dealu ≠ vítěz)', r.status === 409, r);
  const rv = await vitez(s, cAutor);
  r = await opravOrg(s, 'nahled', cAutor);
  test('14 po přepsání: Opravit firmu funguje nad organizací vítěze', rv.stav === 'zapsano' && r.status === 200 && r.organizace === d.org_id
    && r.rozdily.some(x => x.klic === 'nazev'), { rv, r });
  const pred = zakazka(s);
  D().organizace.find(o => o.id === d.org_id).name = 'Přejmenovaná v Pipedrive (smyšlené)';
  const w = await webhook(new Request('http://x/api/pd/webhook', { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-kalkulator-klic': KLIC }, body: JSON.stringify({ dealId: d.id }) }));
  const po = zakazka(s);
  test('14 webhook po přepsání firmu v hlavičce ani další zákazníky nepřepíše', w.status < 500 && po.objednatel === pred.objednatel && po.ico === pred.ico
    && JSON.stringify(po.dalsiZakaznici) === JSON.stringify(pred.dalsiZakaznici) && JSON.stringify(po.vzRidici) === JSON.stringify(pred.vzRidici),
    { w: w.status, o: po.objednatel });
}

/* 15) revize poradce P1–P5 (pojistka: na 5236b4f každý z bodů selže) */
{
  /* P1: prodej jinému zákazníkovi, než je řídící */
  const ico = icoS('9200013');
  orgSim(ico, 'Vítěz P1 s.r.o.');
  const d = dealNovy(); const org0 = d.org_id; const s = prodana(d, ico);
  const z = zakazka(s); z.varianty[0].prodano.zakaznik = z.dalsiZakaznici[0].id; zapis(s, z);
  const od = poz().length;
  let r = await vitez(s, cAutor);
  test('15 P1: prodano.zakaznik ≠ řídící → 409 s důvodem, do Pipedrive nic, stav nezapsán', r.status === 409 && /jinému zákazníkovi/.test(r.chyba)
    && poz().length === od && d.org_id === org0 && !zakazka(s).pdOrgVitez, r);
  z.varianty[0].prodano.zakaznik = z.vzRidici.id; zapis(s, z);
  r = await vitez(s, cAutor);
  test('15 P1: prodano.zakaznik = řídící → zapsáno', r.stav === 'zapsano' && d.org_id !== org0, r);
}
{
  /* P2: opakovaný neúspěšný stisk nemění razítko; strop omezuje i bez-ico */
  const d = dealNovy(); const s = prodana(d, '');
  const r1 = await vitez(s, cAutor);
  const raz1 = zakazka(s).uloRazitko;
  const rej1 = pamet.get('zakazky/_rejstrik');
  const r2 = await vitez(s, cAutor);
  test('15 P2: druhý stisk se stejným stavem bez-ico → zakázka ani rejstřík se nemění, odpověď nese uložené razítko', r1.stav === 'bez-ico' && r2.stav === 'bez-ico'
    && zakazka(s).uloRazitko === raz1 && r2.razitko === raz1 && pamet.get('zakazky/_rejstrik') === rej1, { r1: r1.razitko, r2: r2.razitko, raz1 });
  let posl;
  for (let i = 0; i < 10; i++) posl = await vitez(s, cAutor);
  test('15 P2: strop se počítá i u bez-ico (11. a další stisk → strop)', posl.stav === 'strop' && zakazka(s).pdOrgVitez.stav === 'strop', posl);
}
{
  /* P3: ARES „nenalezeno“ → chyba, nic se nezakládá; hlavička jen při výpadku */
  const ico = icoS('9200014');   // ARES ho nezná (404)
  const d = dealNovy(); const org0 = d.org_id; const s = prodana(d, ico, { nazev: 'Hlavička P3 s.r.o.' });
  const pocet = D().organizace.length;
  const r = await vitez(s, cProdal);
  test('15 P3: ARES nenalezeno → chyba s důvodem, organizace se nezaložila, deal beze změny', r.stav === 'chyba'
    && r.duvod.includes('IČO v ARES není — ověřte IČO, nebo organizaci změňte ručně') && D().organizace.length === pocet && d.org_id === org0
    && !SIM.pdSimStav().pozadavky.slice(-5).some(p => p.startsWith('POST')), r);
}
{
  /* P5: mezitím odemčený prodej → stav se nezapíše */
  const ico = icoS('9200016');
  orgSim(ico, 'Vítěz P5 s.r.o.');
  const d = dealNovy(); const s = prodana(d, ico);
  SIM.pdSimNastav({ poPozadavku: (p) => { if (p === 'PATCH /api/v2/deals/' + d.id) { const z = zakazka(s); delete z.varianty[0].prodano; zapis(s, z); } } });
  const raz = zakazka(s).uloRazitko;
  const r = await vitez(s, cProdal);
  SIM.pdSimNastav({ poPozadavku: null });
  test('15 P5: prodej mezitím odemčen → stav ani protokol se do zakázky nezapíšou, odpověď nezapsano', r.nezapsano === true
    && !zakazka(s).pdOrgVitez && zakazka(s).uloRazitko === raz && protokolKontakt(s) === 0, r);
  const d2 = dealNovy(); const s2 = prodana(d2, ico);
  SIM.pdSimNastav({ poPozadavku: (p) => { if (p === 'PATCH /api/v2/deals/' + d2.id) { const z = zakazka(s2); z.pdDealId = '1001'; zapis(s2, z); } } });
  const r2 = await vitez(s2, cProdal);
  SIM.pdSimNastav({ poPozadavku: null });
  test('15 P5: zakázka mezitím na jiném dealu → stav se nezapíše', r2.nezapsano === true && !zakazka(s2).pdOrgVitez, r2);
}

test('do sítě nic (Pipedrive jen simulátor, ARES jen předaný fetch)', venku.length === 0, venku);
console.log('\nVZ-E5b organizace: ' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
