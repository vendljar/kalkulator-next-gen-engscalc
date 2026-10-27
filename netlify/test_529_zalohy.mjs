/* #529 — NÁLEZY J. V. Z TESTU v26.10.12 NA testengscalc (27. 10. 2026), SERVER
 *
 *   Z1  Falešné „Zálohu se nepodařilo pořídit": automatická záloha po
 *       přihlášení správce (`…-auto`) obsadila 10minutový odstup a první
 *       kliknutí na „Zálohovat teď" dostalo 429. Teď ruční zálohu blokuje
 *       jen ruční (denní strop 20 za 24 h dál počítá všechny); automatickou
 *       dál blokuje každá. Odmítnutí nese `posledni` a `posledniHotova`.
 *   R1  Pojistka retence fail-closed (postřeh T1 #528): záznam varování,
 *       který není objekt (text, číslo, true/false, pole), retenci drží;
 *       potvrdit ho jde jen heslem hlavního správce a potvrzením se nahradí
 *       čitelným záznamem.
 *
 * Pojistka: nad kódem integrace 95a1356 (v26.10.12) sada selže v obou
 * oddílech (ověřeno výměnou lib/zalohovani.mjs, functions/zaloha_vynuceno.mjs
 * a src/uloziste.js za verze z 95a1356 — viz commit). Po opravě projde.
 * Spuštění: node netlify/test_529_zalohy.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { const v = pamet.get(nazev + '/' + k); if (v === undefined) return null;
    return JSON.parse(Buffer.isBuffer(v) ? v.toString('utf8') : v); },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async ctiBin(k) { const v = pamet.get(nazev + '/' + k); return v === undefined ? null : (Buffer.isBuffer(v) ? v : Buffer.from(v)); },
  async zapisBin(k, b) { pamet.set(nazev + '/' + k, Buffer.from(b)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const ulz = (n) => globalThis.__TEST_ULOZISTE(n);

const Z = await import('./lib/zalohovani.mjs');
const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: zalohaVynuceno } = await import('./functions/zaloha_vynuceno.mjs');
const { ADMIN_EMAIL, otiskHesla } = await import('./lib/sdilene.mjs');
const U = require('../src/uloziste.js');
const { default: obnova } = await import('./functions/obnova.mjs');
Object.assign(globalThis, require('../src/format.js'), require('../src/engine.js'), require('../src/engine_proj.js'),
  require('../src/techspec.js'), require('../src/sleva.js'), require('../src/zaokrouhleni.js'), require('../src/zamek.js'));

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 600))); } };
const zkus = async (n, fn) => { try { await fn(); } catch (e) { test(n + ' (výjimka)', false, String(e && e.stack || e)); } };
const J = (x) => JSON.stringify(x);
const HESLO = 'Docasne.Heslo.123', HESLO2 = 'Druhy.Spravce.123';
const DRUHY = 'druhy.spravce@priklad.cz';
const vycistiZalohy = () => { for (const k of [...pamet.keys()]) if (k.startsWith('zalohy/')) pamet.delete(k); };

const prihlas = async (email, heslo) => {
  const r = await prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST', body: J({ email, heslo }) }));
  return (r.headers.get('set-cookie') || '').split(';')[0];
};
const cookie = await prihlas(ADMIN_EMAIL, HESLO);
await ulz('uzivatele').zapis(DRUHY, { email: DRUHY, jmeno: 'Druhý správce', role: 'Administrátor', heslo: otiskHesla(HESLO2), aktivni: true });
const cookie2 = await prihlas(DRUHY, HESLO2);
test('přihlášení hlavního i druhého správce', !!cookie && !!cookie2);
const vynuceno = async (telo, ck = cookie) => { const r = await zalohaVynuceno(new Request('http://x/api/zaloha_vynuceno', {
  method: telo ? 'POST' : 'GET', headers: { cookie: ck }, ...(telo ? { body: J(telo) } : {}) })); return { status: r.status, telo: await r.json() }; };
/* jako prohlížeč (onlineOtiskDopor): po krocích, dokud není hotovo */
const doporiz = async (prvni) => { let o = prvni, kroku = 1;
  while (o.status === 200 && o.telo.hotovo === false && kroku < 50) { o = await vynuceno({ akce: 'pokracovat', klic: o.telo.den }); kroku++; }
  return { ...o, kroku }; };
for (let i = 0; i < 3; i++) await ulz('zakazky').zapis('z/zak' + i, { cislo: 'Z' + i, text: 'x'.repeat(200) });

/* ---------------- Z1: automatická záloha po přihlášení neblokuje kliknutí ---------------- */
await zkus('Z1 limit', async () => {
  const L = Z.vynuceneLimit;
  const T0 = Date.parse('2026-10-27T08:45:00Z');                 // 9:45 v Praze
  const slot = (msZpet, druh) => Z.klicVynuceny(druh, T0 - msZpet);
  test('#529 Z1: auto před 2 min ruční zálohu neblokuje', L([slot(120000, 'auto')], T0, 'rucne').ok === true);
  test('#529 Z1: ruční před 2 min ruční blokuje, s časem slotu a příznakem hotové zálohy',
    (() => { const r = L([slot(120000, 'rucne')], T0, 'rucne');
      return r.ok === false && r.dalsiMs === T0 - 120000 + 600000 && r.posledniMs === T0 - 120000 && r.posledniHotova === true; })(),
    L([slot(120000, 'rucne')], T0, 'rucne'));
  test('#529 Z1: rozpracovaná ruční (jen rezervace) blokuje jako nehotová',
    (() => { const r = L([Z.VYNUCENE_REZERVACE + slot(60000, 'rucne') + '~ab12cd34'], T0, 'rucne');
      return r.ok === false && r.posledniHotova === false; })());
  test('#529 Z1: rezervace automatické zálohy ruční neblokuje',
    L([Z.VYNUCENE_REZERVACE + slot(60000, 'auto') + '~ab12cd34'], T0, 'rucne').ok === true);
  test('#529 Z1: automatickou dál blokuje každá vynucená (auto i ruční)',
    L([slot(60000, 'rucne')], T0, 'auto').ok === false && L([slot(60000, 'auto')], T0, 'auto').ok === false);
  test('#529 Z1: bez `druh` beze změny (auto se počítá jako ruční)', L([slot(60000, 'auto')], T0).ok === false);
  const den = Array.from({ length: 20 }, (_, i) => slot(3600000 + i * 15 * 60000, i % 2 ? 'auto' : 'rucne'));
  const r20 = L(den, T0, 'rucne');
  test('#529 Z1: denní strop 20 za 24 h počítá ruční i automatické dohromady', r20.ok === false && /20 vynucených záloh/.test(r20.chyba), r20);

  /* přes API: přihlášení správce (auto) a hned kliknutí (ručně) */
  vycistiZalohy();
  const auto = await doporiz(await vynuceno({ duvod: 'auto' }));
  test('#529 Z1: automatická záloha po přihlášení vznikne (slot -auto)', auto.status === 200 && auto.telo.hotovo !== false
    && /T\d{6}-auto$/.test(auto.telo.den || ''), auto);
  const klik = await vynuceno({ duvod: 'rucne' });
  test('#529 Z1: první kliknutí „Zálohovat teď" hned po ní projde (dřív 429 „mladší než 10 minut")',
    klik.status === 200 && /T\d{6}-rucne$/.test(klik.telo.den || ''), klik);
  const hotovo = await doporiz(klik);
  test('#529 Z1: klient po krocích ruční zálohu dokončí, vznikla právě jedna ruční', hotovo.status === 200 && hotovo.telo.hotovo !== false
    && (await ulz('zalohy').seznam()).filter(k => /^\d{4}-\d{2}-\d{2}T\d{6}-rucne$/.test(k)).length === 1, hotovo);
  test('#529 Z1: po dokončení nezbyla rezervace', (await ulz('zalohy').seznam(Z.VYNUCENE_REZERVACE)).length === 0);
  const g = await vynuceno();
  const auta = (g.telo.otisky || []).filter(o => /-auto$/.test(o.den)), rucni = (g.telo.otisky || []).filter(o => /-rucne$/.test(o.den));
  test('#529 Z1: přehled rozliší automatickou a ruční zálohu podle klíče', g.status === 200 && auta.length === 1 && rucni.length === 1, g.telo.otisky);
  const druhy = await vynuceno({ duvod: 'rucne' });
  test('#529 Z1: druhé kliknutí do 10 min → 429 s časem hotové zálohy (posledni, posledniHotova) pro informativní hlášku',
    druhy.status === 429 && druhy.telo.kod === 'limitZalohy' && druhy.telo.posledniHotova === true
    && Date.parse(druhy.telo.dalsi) - Date.parse(druhy.telo.posledni) === 600000
    && rucni[0] && Math.abs(Date.parse(druhy.telo.posledni) - Date.parse(rucni[0].porizena)) < 2000, druhy.telo);
  const auto2 = await vynuceno({ duvod: 'auto' });
  test('#529 Z1: další automatická do 10 min → 429 (prohlížeč ji mlčky přeskočí)', auto2.status === 429);
  vycistiZalohy();
});

/* ---------------- R1: poškozený záznam varování = retence stojí ---------------- */
await zkus('R1 pojistka', async () => {
  const poskozene = [['text', 'poškozený záznam'], ['true', true], ['false', false], ['číslo', 7], ['nula', 0], ['prázdný text', ''], ['pole', [1, 2]]];
  for (const [popis, v] of poskozene) {
    const d = Z.retenceDrzena(v, Date.now());
    test('#529 R1: retenceDrzena — poškozený záznam (' + popis + ') = drženo', !!d && d.poskozeny === true, d);
  }
  test('#529 R1: chybějící záznam (null) retenci nedrží', Z.retenceDrzena(null) === null && Z.retenceDrzena(undefined) === null);
  test('#529 R1: hlídka v prohlížeči poškozený záznam ukáže (i false a 0)', ['x', false, 0, true, [1]].every(v => {
    const h = U.uloRetenceVarovani(v, Date.now()); return !!h && h.poskozeny === true && /poškozený/.test(h.text) && /hlavní správce/.test(h.text); })
    && U.uloRetenceVarovani(null) === null);

  /* retence nad poškozeným záznamem nic nesmaže */
  vycistiZalohy();
  const vlozOtisk = (klic) => { const m = { format: Z.OTISK_FORMAT, porizena: klic.slice(0, 10) + 'T02:00:00.000Z', zdroj: 'nocni-otisk', kdo: '', casti: 1,
    pocetZakazek: 800, pocetUctu: 6, velikostB: 114e6, pocetSablon: 10, pocetPodpisu: 6 };
    pamet.set('zalohy/' + klic, J(m)); pamet.set('zalohy/' + Z.souhrnKlic(klic), J({ den: klic, ...m })); pamet.set('zalohy/' + Z.castKlic(klic, 0), J({ program: null })); };
  for (let d = 1; d <= 20; d++) vlozOtisk('2026-11-' + String(d).padStart(2, '0'));
  pamet.set('zalohy/' + Z.KOPIE_DISK_KLIC, J({ kdy: '2026-11-20T01:00:00.000Z', kdo: ADMIN_EMAIL, soubor: 'otisk_2026-11-20.json.gz',
    velikostB: 1000, sha256: 'a'.repeat(64), otisk: '2026-11-20', puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB', potvrzeno: 'heslo-spravce' }));
  pamet.set('zalohy/' + Z.RETENCE_VAROVANI_KLIC, J(false));
  const noc = () => Z.retenceProved('2026-11-20', '2026-11-20', Date.parse('2026-11-20T02:30:00Z'));
  const r = await noc();
  test('#529 R1: retence nad poškozeným záznamem (false) nic nesmaže a řekne proč', r.smazano.length === 0 && !!r.drzeno
    && r.drzeno.poskozeny === true && /poškozený/.test(r.ceka || ''), r);
  const g = await vynuceno();
  test('#529 R1: přehled záloh vrátí poškozený záznam tak, jak je (false, ne null)', g.status === 200 && g.telo.retenceVarovani === false, g.telo.retenceVarovani);

  const druhy = await vynuceno({ akce: 'retence-potvrdit', den: '', hesloSpravce: HESLO2 }, cookie2);
  test('#529 R1: druhý správce poškozený záznam nepotvrdí (403)', druhy.status === 403 && pamet.get('zalohy/' + Z.RETENCE_VAROVANI_KLIC) === J(false), druhy);
  /* i když by volba dovolila potvrzovat úbytek každému správci, poškozený záznam jen hlavní */
  const volba = Z.ZALOHY_VOLBY.potvrditUbytek;
  Z.ZALOHY_VOLBY.potvrditUbytek = 'spravce';
  let druhyVolba;
  try { druhyVolba = await vynuceno({ akce: 'retence-potvrdit', den: '', hesloSpravce: HESLO2 }, cookie2); }
  finally { Z.ZALOHY_VOLBY.potvrditUbytek = volba; }
  test('#529 R1: … ani s volbou „každý správce" (403, kód jenHlavniSpravce)', druhyVolba.status === 403 && druhyVolba.telo.kod === 'jenHlavniSpravce'
    && pamet.get('zalohy/' + Z.RETENCE_VAROVANI_KLIC) === J(false), druhyVolba);
  const bezHesla = await vynuceno({ akce: 'retence-potvrdit', den: '' });
  test('#529 R1: hlavní správce bez hesla nepotvrdí', bezHesla.status >= 400 && pamet.get('zalohy/' + Z.RETENCE_VAROVANI_KLIC) === J(false), bezHesla);
  const spatnyDen = await vynuceno({ akce: 'retence-potvrdit', den: '2026-11-19', hesloSpravce: HESLO });
  test('#529 R1: potvrzení s dnem cizího varování → 409', spatnyDen.status === 409, spatnyDen);
  const p = await vynuceno({ akce: 'retence-potvrdit', den: '', hesloSpravce: HESLO });
  const zaznam = JSON.parse(pamet.get('zalohy/' + Z.RETENCE_VAROVANI_KLIC));
  test('#529 R1: hlavní správce s heslem potvrdí → čitelný potvrzený záznam (kdo, kdy)', p.status === 200 && zaznam && typeof zaznam === 'object'
    && zaznam.poskozeny === true && zaznam.potvrzeno && zaznam.potvrzeno.kdo === ADMIN_EMAIL && !pamet.has('zalohy/' + Z.RETENCE_ZAKLAD_KLIC), p);
  test('#529 R1: po potvrzení retence zase maže', Z.retenceDrzena(zaznam) === null && (await noc()).smazano.length > 0);
  test('#529 R1: nová noc po potvrzeném poškozeném záznamu varování přidá normálně',
    !!Z.retenceVarovaniPridej(zaznam, { kdy: 'x', den: '2026-11-21', zdroj: 'nocni', text: 'y' }));
  vycistiZalohy();
});

/* ---------------- K9-I3: otisky „před obnovou" po 6 měsících (J. V. 27. 10. 2026) ---------------- */
await zkus('K9-I3', async () => {
  const V = Z.retenceVyber;
  test('#529 K9-I3: hranice jako u měsíčních — z 27. 4. 2027 zůstane, z 26. 4. 2027 se smaže (dnes 26. 10. 2027)',
    J(V(['2027-10-26', '2027-04-27T101010-pred-obnovou', '2027-04-26T101010-pred-obnovou', '2027-10-01T090000-pred-obnovou'], '2027-10-26'))
      === J(['2027-04-26T101010-pred-obnovou']));
  test('#529 K9-I3: nejnovější otisk před obnovou zůstane, i když je starší 6 měsíců',
    J(V(['2027-10-26', '2026-01-01T101010-pred-obnovou', '2026-02-01T101010-pred-obnovou'], '2027-10-26')) === J(['2026-01-01T101010-pred-obnovou']));
  test('#529 K9-I3: oba tvary klíče (bez času z 7. 9. 2026 i s časem)',
    J(V(['2027-10-26', '2026-09-08-pred-obnovou', '2027-10-20T101010-pred-obnovou'], '2027-10-26')) === J(['2026-09-08-pred-obnovou']));
  /* přes retenceProved: nepotvrzená pojistka drží i otisky před obnovou */
  vycistiZalohy();
  const vloz = (klic, zdroj) => { const m = { format: Z.OTISK_FORMAT, porizena: klic.slice(0, 10) + 'T02:00:00.000Z', zdroj, kdo: '', casti: 1,
    pocetZakazek: 800, pocetUctu: 6, velikostB: 114e6, pocetSablon: 10, pocetPodpisu: 6 };
    pamet.set('zalohy/' + klic, J(m)); pamet.set('zalohy/' + Z.souhrnKlic(klic), J({ den: klic, ...m })); pamet.set('zalohy/' + Z.castKlic(klic, 0), J({ program: null })); };
  for (let d = 1; d <= 20; d++) vloz('2027-10-' + String(d).padStart(2, '0'), 'nocni-otisk');
  vloz('2027-03-01T101010-pred-obnovou', 'pred-obnovou'); vloz('2027-10-05T101010-pred-obnovou', 'pred-obnovou');
  pamet.set('zalohy/' + Z.KOPIE_DISK_KLIC, J({ kdy: '2027-10-20T01:00:00.000Z', kdo: ADMIN_EMAIL, soubor: 'otisk_2027-10-20.json.gz',
    velikostB: 1000, sha256: 'a'.repeat(64), otisk: '2027-10-20', puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB', potvrzeno: 'heslo-spravce' }));
  const noc = () => Z.retenceProved('2027-10-20', '2027-10-20', Date.parse('2027-10-20T02:30:00Z'));
  pamet.set('zalohy/' + Z.RETENCE_VAROVANI_KLIC, J({ kdy: '2027-10-19T02:30:00.000Z', den: '2027-10-19', zdroj: 'nocni', text: 'úbytek' }));
  const r1 = await noc();
  test('#529 K9-I3: nepotvrzená pojistka úbytku drží i otisk před obnovou starší 6 měsíců', r1.smazano.length === 0 && !!r1.drzeno
    && pamet.has('zalohy/2027-03-01T101010-pred-obnovou'), r1);
  pamet.delete('zalohy/' + Z.RETENCE_VAROVANI_KLIC);
  const r2 = await noc();
  test('#529 K9-I3: bez varování retence otisk před obnovou starší 6 měsíců smaže i s částmi, nejnovější (5. 10.) zůstane',
    r2.smazano.includes('2027-03-01T101010-pred-obnovou') && !pamet.has('zalohy/2027-03-01T101010-pred-obnovou')
    && !pamet.has('zalohy/' + Z.castKlic('2027-03-01T101010-pred-obnovou', 0)) && pamet.has('zalohy/2027-10-05T101010-pred-obnovou'), r2);
  vycistiZalohy();
});

/* ---------------- B: controlling bez uloženého nastavení (test J. V. 27. 10.) ---------------- */
await zkus('B controlling', async () => {
  vycistiZalohy();
  pamet.delete('program/controlling');
  const v = await doporiz(await vynuceno({ duvod: 'rucne' }));
  const o = await Z.ctiOtisk(ulz('zalohy'), v.telo.den);
  test('#529 B: otisk prázdné DB nese controlling jako null (výchozí rozvržení z kódu)', !!o && 'controlling' in o && o.controlling === null, o && o.controlling);
  const nahled = async () => { const r = await obnova(new Request('http://x/api/obnova', { method: 'POST', headers: { cookie },
    body: J({ zdroj: { soubor: { porizena: '2026-10-27T08:42:54.000Z', zakazky: {}, controlling: null } }, rezim: 'prepsat', nahled: true, casti: ['controlling'] }) }));
    return { status: r.status, telo: await r.json() }; };
  const n = await nahled();
  const c = n.telo.casti && n.telo.casti.controlling;
  test('#529 B: náhled bez uloženého controllingu nehlásí „nenese", ale neutrálně „výchozí rozvržení" (beze změny)',
    n.status === 200 && !!c && c.preskocene === 0 && c.bezeZmeny === 1 && !J(n.telo).includes('nenese')
    && (c.poznamky || []).some(t => /výchozí rozvržení/.test(t)), n.telo);
  await ulz('program').zapis('controlling', { skupiny: ['vlastni'] });
  const n2 = await nahled();
  const c2 = n2.telo.casti && n2.telo.casti.controlling;
  test('#529 B: s uloženou odchylkou v cíli se chování nemění (přeskočí se, nic nesmaže) — důvod bez „nenese"',
    n2.status === 200 && c2 && c2.preskocene === 1 && /výchozí rozvržení/.test(c2.duvody[0].duvod) && !/nenese/.test(c2.duvody[0].duvod)
    && J(await ulz('program').cti('controlling')) === J({ skupiny: ['vlastni'] }), n2.telo);
  pamet.delete('program/controlling');
  vycistiZalohy();
});

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
