/* PR #563 — PRODANÁ VARIANTA JE VŽDY ŘÍDÍCÍ — serverová pojistka.
 *
 * J. V. 4. 11. 2026: „Ve chvíli, kdy je kalkulace prodána, je tato vždy
 * řídící. Nastav tedy automaticky prodanou kalkulaci jako řídící, kdyby
 * náhodou do té doby nebyla."
 *
 * Server je autorita: uložení s prodanou variantou skončí s ní jako řídící —
 * server nesoulad SROVNÁ (prodServer → prodRidiciSrovnej), neodmítá. Ověřuje:
 *   – prodej klonu (varianta 2), když řídící je odeslaná varianta 1: uložení
 *     projde (hlavička Z1 / K7-S2, #555 / #555b ho nezastaví) a v2 je řídící;
 *   – totéž ze staršího klienta, který řídící nepřepne → přepne server;
 *   – prodej řídící varianty → beze změny;
 *   – ruční přepnutí řídící jinam po prodeji server vrátí; po odemčení
 *     prodeje (vedoucí) zase jde;
 *   – starší zakázka s prodanou neřídící variantou se srovná při uložení;
 *   – Pipedrive (simulátor, nic se nezapisuje): hodnota dealu a fáze
 *     „Vyhrané k podpisu SoD" z prodané (= řídící) varianty;
 *   – controlling: export i hromadný výběr berou prodanou variantu jako řídící.
 * Model klienta (prodRidiciSrovnej, prodJedinaZmena) hlídá
 * src/test_563_prodano_ridici.js, celý tok v prohlížeči overit_prodano_zamek.mjs.
 *
 * Paměťové úložiště, zkušební ceník, smyšlené údaje.
 * Spuštění: node netlify/test_563_prodano_ridici.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR', 'PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PROSTREDI',
  'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL']) delete process.env[k];
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
globalThis.fetch = async (url) => { throw new Error('síť je v testu zakázaná: ' + url); };
const R = new URL('..', import.meta.url).pathname;
const { default: prihlaseni } = await import(R + 'netlify/functions/prihlaseni.mjs');
const { default: program } = await import(R + 'netlify/functions/program.mjs');
const { default: zakazky } = await import(R + 'netlify/functions/zakazky.mjs');
const { default: uzivatele } = await import(R + 'netlify/functions/uzivatele.mjs');
const { default: pdNanecistoFn } = await import(R + 'netlify/functions/pd_nanecisto.mjs');
const SIM = await import(R + 'netlify/lib/pipedrive_simulator.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
const { JEKLY } = await jadro();
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
for (const f of ['plan_plateb.js', 'nabidka_proj.js', 'pd_nanecisto.js']) Object.assign(globalThis, require(R + 'src/' + f));
const G = globalThis;
const zk = require(R + 'src/zakazka.js');
const zam = require(R + 'src/zamek.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
const OBJ = require(R + 'src/objednane.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const kopie = x => JSON.parse(JSON.stringify(x));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const uloz = async (zak, c, razitko) => { const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: razitko }, c); return { status: r.status, ...(await r.json()) }; };
const nacti = async (soubor, c) => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), c)).json()).zakazka;

const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const rp = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0, maxGlobalni: 1, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15, 'Administrátor': 1 } }, poznamka: 'pr563' }, cA)).json();
if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
for (const [email, role] of [['obch.pr563@priklad.cz', 'Obchodník'], ['ved.pr563@priklad.cz', 'Vedoucí']]) {
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email, jmeno: 'Test ' + role, role, heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
}
const cO = await prihlas('obch.pr563@priklad.cz', 'Heslo12345x');
const cV = await prihlas('ved.pr563@priklad.cz', 'Heslo12345x');
const platny = () => JSON.parse(pamet.get('program/db')).platny;
const DNES = OBJ.objDnes();
let n = 8761;   // vlastní rozsah čísel 8761–8780
const zamkni = (z, v) => zam.zamkniVariantu(v, { typ: 'nabidkaTisk', kdy: new Date().toISOString(), kdo: 'Test PR',
  cislo: zam.variantaCislo(z, v), vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-pr563'), snimek: zam.zamekSnimekSpocti(v) });

/* Odeslaná varianta 1 (řídící) + klon (varianta 2, jiný zdvih → jiná cena),
 * klon v DRUHÉM uložení vytištěný (zamčený) — jako v prohlížeči. Vrací
 * uloženou verzi tak, jak ji načte prohlížeč. */
async function dveOdeslane(nazev) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++); z.nazevAkce = 'TEST ' + nazev;
  z.adresa = 'Zkušební 1, Praha';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.cenik = kopie(platny().cenik); v.data.proj.cenik = kopie(platny().cenikProj);
  v.data.kryci = { hodnoty: { jmenoPrijmeni: 'Zkušební Kontakt' } };
  zamkni(z, v);
  const r = await uloz(z, cO);
  if (r.status !== 200) throw new Error('příprava 1 ' + r.status + ' ' + r.chyba);
  let g = await nacti(r.soubor, cO);
  const a = zk.importZakazka(kopie(g));
  const k = zam.klonujVariantu(a, a.varianty[0].id);
  k.data.ock.zadani.zdvih = 12;
  zamkni(a, k);
  const r2 = await uloz(a, cO, g.uloRazitko);
  if (r2.status !== 200) throw new Error('příprava 2 ' + r2.status + ' ' + r2.chyba);
  g = await nacti(r.soubor, cO);
  return { soubor: r.soubor, razitko: g.uloRazitko, zak: zk.importZakazka(kopie(g)) };
}
const rid = z => (z.varianty.find(x => x.ridici) || {}).id;
/* Bez modelu (b751c91) testy SELŽOU, nespadnou — pojistka proti prázdnému testu. */
const srovnej = z => (typeof OBJ.prodRidiciSrovnej === 'function') ? OBJ.prodRidiciSrovnej(z) : '';
const zamceno = (z, id) => (typeof OBJ.prodRidiciZamceno === 'function') ? OBJ.prodRidiciZamceno(z, id) : '';

console.log('===== prodej klonu odeslané nabídky (řídící = odeslaná varianta 1) =====');
let prodana = null;
{
  const o = await dveOdeslane('klon prodán');
  const [v1, v2] = o.zak.varianty;
  test('(příprava: řídící je odeslaná v1, klon v2 je odeslaný a neřídící)', rid(o.zak) === v1.id
    && zam.variantaUzamcena(v1) && zam.variantaUzamcena(v2) && v1.zamek.hlavicka === true && !v2.ridici, [rid(o.zak), v1.zamek.hlavicka]);
  /* Tak, jak to pošle prohlížeč: prodNastav + prodRidiciSrovnej. */
  const a = kopie(o.zak);
  test('prodNastav projde', OBJ.prodNastav(a, a.varianty[1], DNES, { kdo: 'x' }) === '');
  test('prodRidiciSrovnej přepne řídící na prodanou v2', srovnej(a) === v2.id && rid(a) === v2.id && !a.varianty[0].ridici);
  test('…je to JEDINÁ změna z pohledu zámku čtení (prodJedinaZmena)', OBJ.prodJedinaZmena(a, o.zak) === true);
  const r = await uloz(a, cO, o.razitko);
  test('uložení prodeje klonu projde (200) — hlavička Z1/K7-S2 ani #555/#555b ho nezastaví', r.status === 200, r);
  const g = await nacti(o.soubor, cO);
  test('po znovunačtení (F5) je prodaná v2 řídící, v1 ne', rid(g) === v2.id && g.varianty.filter(x => x.ridici).length === 1, g.varianty.map(x => [x.id, x.ridici]));
  test('…v2 je prodaná, stopa v prodejHistorie', !!g.varianty[1].prodano && (g.prodejHistorie || []).some(h => h.akce === 'prodano' && h.varianta === v2.id));
  test('…stopa „hlavička zmrazená" zůstává u v1 a přibyla u v2 (K7-S2)', g.varianty[0].zamek.hlavicka === true && g.varianty[1].zamek.hlavicka === true,
    [g.varianty[0].zamek.hlavicka, g.varianty[1].zamek.hlavicka]);
  test('…hlavička zakázky (název, adresa) beze změny', g.nazevAkce === o.zak.nazevAkce && g.adresa === o.zak.adresa);
  test('…data obou odeslaných variant beze změny',
    JSON.stringify(g.varianty.map(x => x.data.ock.zadani)) === JSON.stringify(o.zak.varianty.map(x => x.data.ock.zadani)));
  prodana = { soubor: o.soubor, g, v1: v1.id, v2: v2.id };
}

console.log('===== starší klient řídící nepřepne → přepne server =====');
{
  const o = await dveOdeslane('klon prodán starým klientem');
  const a = kopie(o.zak);
  OBJ.prodNastav(a, a.varianty[1], DNES, { kdo: 'x' });   // bez prodRidiciSrovnej
  test('(řídící v požadavku zůstala v1)', rid(a) === a.varianty[0].id);
  const r = await uloz(a, cO, o.razitko);
  test('uložení projde (200) — server nesoulad srovná, neodmítá', r.status === 200, r);
  const g = await nacti(o.soubor, cO);
  test('…v databázi je řídící prodaná v2', rid(g) === a.varianty[1].id, g.varianty.map(x => [x.id, x.ridici]));
}

console.log('===== prodej řídící varianty → beze změny =====');
{
  const o = await dveOdeslane('řídící prodána');
  const a = kopie(o.zak);
  OBJ.prodNastav(a, a.varianty[0], DNES, { kdo: 'x' });
  test('prodRidiciSrovnej nic nemění (prodaná už je řídící)', srovnej(a) === '' && rid(a) === a.varianty[0].id);
  const r = await uloz(a, cO, o.razitko);
  test('uložení projde (200)', r.status === 200, r);
  const g = await nacti(o.soubor, cO);
  test('…řídící zůstala v1, v2 neřídící', rid(g) === a.varianty[0].id && !g.varianty[1].ridici);
}

console.log('===== po prodeji se řídící jinam nepřepne; po odemčení ano =====');
{
  const { soubor, v1, v2 } = prodana;
  let g = await nacti(soubor, cO);
  let a = zk.importZakazka(kopie(g));
  zk.nastavRidici(a, v1);
  test('(model: prodRidiciZamceno to obchodníkovi řekne)', /prodaná varianta je vždy řídící/.test(zamceno(g, v1))
    && zamceno(g, v2) === '');
  const r = await uloz(a, cO, g.uloRazitko);
  test('ruční přepnutí řídící na v1 po prodeji: uložení projde, ale řídící zůstane prodaná v2', r.status === 200
    && rid(await nacti(soubor, cO)) === v2, r);
  g = await nacti(soubor, cV);
  a = zk.importZakazka(kopie(g));
  test('odemčení prodeje (vedoucí) — model', OBJ.prodOdemkni(a, a.varianty[1], 'Zákazník chce variantu 1') === '');
  test('…řídící po odemčení zůstává v2 (nic se nepřepíná samo)', rid(a) === v2);
  const r2 = await uloz(a, cV, g.uloRazitko);
  test('…uloženo (200)', r2.status === 200, r2);
  g = await nacti(soubor, cO);
  test('…po odemčení prodeje model přepnutí pustí', zamceno(g, v1) === '');
  a = zk.importZakazka(kopie(g));
  zk.nastavRidici(a, v1);
  const r3 = await uloz(a, cO, g.uloRazitko);
  test('…a server ho uloží (řídící v1)', r3.status === 200 && rid(await nacti(soubor, cO)) === v1, r3);
}

console.log('===== starší zakázka s prodanou neřídící variantou =====');
{
  const o = await dveOdeslane('starší prodaná neřídící');
  const a = kopie(o.zak);
  OBJ.prodNastav(a, a.varianty[1], DNES, { kdo: 'x' });
  await uloz(a, cO, o.razitko);
  /* Stav z doby před PR #563: prodaná v2, řídící v1 (přímo v úložišti). */
  const klic = [...pamet.keys()].find(k => k.includes('zakazky/') && k.endsWith('/' + o.soubor));
  const ul = JSON.parse(pamet.get(klic));
  ul.varianty.forEach(x => { x.ridici = x.id === a.varianty[0].id; });
  delete ul.varianty[1].zamek.hlavicka;
  pamet.set(klic, JSON.stringify(ul));
  let g = await nacti(o.soubor, cO);
  test('(načtení nic nemigruje: řídící je dál v1)', rid(g) === a.varianty[0].id && !!g.varianty[1].prodano);
  const b = zk.importZakazka(kopie(g));
  test('(import zakázky řídící nepřepíná)', rid(b) === a.varianty[0].id);
  b.varianty[0].data.kryci.hodnoty.jmenoPrijmeni = 'Jiný kontakt';   // volné pole krycího listu neprodané v1
  const r = await uloz(b, cO, g.uloRazitko);
  test('další uložení projde (200)', r.status === 200, r);
  g = await nacti(o.soubor, cO);
  test('…a srovná řídící na prodanou v2', rid(g) === a.varianty[1].id && g.varianty[1].zamek.hlavicka === true, g.varianty.map(x => [x.id, x.ridici]));
}

console.log('===== Pipedrive (simulátor) a controlling z prodané varianty =====');
{
  const o = await dveOdeslane('Pipedrive');
  const a = kopie(o.zak);
  OBJ.prodNastav(a, a.varianty[1], DNES, { kdo: 'x' });
  srovnej(a);
  await uloz(a, cO, o.razitko);
  const z = zk.importZakazka(kopie(await nacti(o.soubor, cO)));
  const cenaV = v => G.cenaNabidkyOck(G.vypocetZ(v, JEKLY), v.data.sleva, v.data.zaokr).cena;
  const c1 = cenaV(z.varianty[0]), c2 = cenaV(z.varianty[1]);
  test('(ceny variant se liší — test něco ověřuje)', c1 > 0 && c2 > 0 && Math.abs(c1 - c2) > 1, [c1, c2]);
  const p = G.pdnPodklad(z, JEKLY, { faze: 'prodano' });
  test('#115: podklad zápisu (řídící varianta) = prodaná v2', p.ok && p.varianta.id === z.varianty[1].id, p.varianta);
  test('…hodnota dealu = cena prodané varianty bez DPH', Math.abs(p.strany.ock.cena - c2) < 0.01, [p.strany.ock.cena, c2]);
  const zp = OBJ.prodPdZapis(z, z.varianty[1], JEKLY);
  test('…shodná s náhledem karty Prodáno (prodPdZapis)', Math.abs(zp.hodnotaKc - p.strany.ock.cena) < 0.01, [zp.hodnotaKc, p.strany.ock.cena]);
  process.env.PIPEDRIVE_SIMULATOR = '1';
  SIM.pdSimReset();
  const D = SIM.pdSimStav().data;
  const otevreny = D.dealy.find(d => d.status === 'open' && d.pipeline_id === 1 && d.stage_id !== 26);
  const o2 = await post(pdNanecistoFn, 'http://x/api/pd/nanecisto', { ...G.pdnTelo(p), dealId: otevreny.id }, cO);
  const d = await o2.json();
  const radek = k => (d.radky || []).find(x => x.klic === k) || {};
  test('#545 simulátor: fáze dealu → Vyhrané k podpisu SoD (26)', o2.status === 200 && radek('fazeDealu').hodnota === 26, [o2.status, d.chyba, radek('fazeDealu')]);
  test('#115 simulátor: hodnota dealu = cena prodané (řídící) varianty', radek('hodnotaDealu').hodnota
    && Math.abs(radek('hodnotaDealu').hodnota.value - c2) < 0.01, radek('hodnotaDealu'));
  test('…do simulátoru šly jen GET (nic se nezapsalo)', SIM.pdSimStav().pozadavky.every(x => /^GET /.test(x)));
  delete process.env.PIPEDRIVE_SIMULATOR;

  /* Controlling: export řídící varianty i hromadný výběr = prodaná v2. */
  const e = G.ctrlExportVarianty(z, G.ridiciVarianta(z), { jekly: JEKLY });
  test('controlling: export řídící varianty = prodaná v2 (bez výjimky „není řídící")', e.ok && G.ridiciVarianta(z).id === z.varianty[1].id, e.chyba);
  const den = DNES;
  const h = G.ctrlHromadnyZakazka(z, { od: den, do: den, rada: 'obe', oblast: 'obe', podle: 'prodej' }, { jekly: JEKLY });
  test('controlling hromadně (podle prodeje): vyveze prodanou v2 a označí ji jako řídící', h.ok
    && h.exp && h.exp.hlavicka && h.exp.hlavicka.ridici === true
    && h.exp.strany[0].cislo === G.variantaCislo(z, z.varianty[1]), h.duvod || (h.exp && h.exp.hlavicka));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
