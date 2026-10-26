/* ZÁLOHY PŘI OBJEMU OSTRÉHO PROVOZU (#522 Z1, 26. 10. 2026).
 *
 * Ostrý engscalc (792 zakázek) neměl ani jednu zálohu: otisk četl celou
 * databázi a zapsal ji jedním blobem, takže nestihl limit funkce (10 s
 * synchronní, 30 s plánovaná) — a „Stáhnout zálohu" i kopie na Disk vracely
 * celou databázi jednou odpovědí přes limit ~6 MB.
 *
 * Simulace: paměťové úložiště se zpožděním každé operace a LIMITEM FUNKCE —
 * po uplynutí limitu požadavku každá další operace vyhodí („Task timed out"),
 * jako když Netlify funkci ukončí. Zkušební data (smyšlená), 900 zakázek,
 * několik s přílohou, šablony, podpisy, účty.
 *
 * Pojistka: nad kódem před #522 sada selže (vynucený i noční otisk nevznikne,
 * blob otisku i odpověď zálohy jsou nad stropem); po opravě projde.
 * Spuštění: node netlify/test_zalohy_objem.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
import { createRequire } from 'node:module';

const ZPOZDENI_MS = 6;          // jedna operace úložiště
const LIMIT_MS = 1500;          // „limit funkce" v simulaci (rezerva proti zátěži stroje; kroky mají 200–250 ms)
const pamet = new Map();
let limitDo = Infinity;          // konec limitu právě běžícího požadavku
let nejvetsiZapisB = 0, nejvetsiZapisKlic = '';
let selhatCteni = null;          // úložiště, jehož čtení selže (hlášení chyby)
let zabijPoCastech = Infinity;   // „ukončení funkce" po tolika zapsaných částech otisku (deterministicky)
let zabito = false;              // po „ukončení" už funkce nic nepřečte ani nezapíše (ani v catch)
const hlid = () => { if (zabito || Date.now() > limitDo) throw new Error('Task timed out (simulovaný limit funkce)'); };
const cekej = () => new Promise(r => setTimeout(r, ZPOZDENI_MS));
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { await cekej(); hlid();
    if (selhatCteni === nazev) throw new Error('simulovaný výpadek čtení ' + nazev);
    return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { await cekej(); hlid();
    if (nazev === 'zalohy' && k.startsWith('casti/') && zabijPoCastech-- <= 0) { zabito = true; hlid(); }
    const t = JSON.stringify(v);
    if (nazev === 'zalohy' && t.length > nejvetsiZapisB) { nejvetsiZapisB = t.length; nejvetsiZapisKlic = k; }
    pamet.set(nazev + '/' + k, t); },
  /* #523 Z2: binární záznamy jako Netlify Blobs — části otisku jdou gzip */
  async ctiBin(k) { await cekej(); hlid(); const v = pamet.get(nazev + '/' + k); return v === undefined ? null : Buffer.from(v); },
  async zapisBin(k, b) { await cekej(); hlid();
    if (nazev === 'zalohy' && k.startsWith('casti/') && zabijPoCastech-- <= 0) { zabito = true; hlid(); }
    if (nazev === 'zalohy' && b.length > nejvetsiZapisB) { nejvetsiZapisB = b.length; nejvetsiZapisKlic = k; }
    pamet.set(nazev + '/' + k, Buffer.from(b)); },
  async seznam(prefix) { await cekej(); hlid(); return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { await cekej(); hlid(); pamet.delete(nazev + '/' + k); },
});

const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: zalohaNocni } = await import('./functions/zaloha_nocni.mjs');
const { default: zalohaVynuceno } = await import('./functions/zaloha_vynuceno.mjs');
const { default: zalohaFn } = await import('./functions/zaloha.mjs');
const { default: obnova } = await import('./functions/obnova.mjs');
const Z = await import('./lib/zalohovani.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');
const require = createRequire(import.meta.url);
const { uloZalohaSloz, uloJmenoSouboru } = require('../src/uloziste.js');
Object.assign(globalThis, require('../src/format.js'), require('../src/engine.js'), require('../src/engine_proj.js'),
  require('../src/techspec.js'), require('../src/sleva.js'), require('../src/zaokrouhleni.js'), require('../src/zamek.js'));
const zk = require('../src/zakazka.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 600))); } };
const zkus = async (n, fn) => { try { await fn(); } catch (e) { test(n + ' (výjimka)', false, String(e && e.stack || e)); } };
const ticho = async (fn) => { const l = console.log, w = console.warn, e = console.error;
  console.log = console.warn = console.error = () => {}; try { return await fn(); } finally { console.log = l; console.warn = w; console.error = e; } };
/* Jeden „požadavek" = jedno volání funkce pod limitem. */
const pozadavek = async (fn) => { limitDo = Date.now() + LIMIT_MS;
  try { return await fn(); } finally { limitDo = Infinity; } };
let cookie = '';
const post = (fn, url, telo) => pozadavek(() => fn(new Request(url, { method: 'POST', headers: { cookie }, body: JSON.stringify(telo) })));
const get = (fn, url) => pozadavek(() => fn(new Request(url, { headers: { cookie } })));
/* Limit vynucených otisků (K3-N4) — každý další „o 11 minut později". */
let posun = 0;
const pozdeji = async (fn) => { posun += 11 * 60000; const p = Date.now; Date.now = () => p.call(Date) + posun;
  try { return await fn(); } finally { Date.now = p; } };
/* Rozpočty kroků zkrácené v poměru k limitu simulace (ostré: 6 s / 20 s). */
if (Z.OTISK_ROZPOCET) { Z.OTISK_ROZPOCET.synchronniMs = 200; Z.OTISK_ROZPOCET.nocniMs = 250; }

/* ---------------- zkušební databáze ---------------- */
const text = (n, z) => (z + ' Příliš žluťoučký kůň úpěl ďábelské ódy. ').repeat(Math.ceil(n / 40)).slice(0, n);
const N = 900;
/* Zakázka v tvaru aplikace (novaZakazka), ~10 kB textu; každá 150. s přílohou
 * 700 kB. Klíč úložiště podle čísla nabídky (uloJmenoSouboru), jako ukládá server. */
const KLIC = (i) => uloJmenoSouboru({ cislo: '2026 - OBJ - CN - ' + String(i).padStart(4, '0') });
for (let i = 0; i < N; i++) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OBJ - CN - ' + String(i).padStart(4, '0');
  z.nazevAkce = 'Zkušební zakázka ' + i + ' ' + text(9000, 'Z' + i);
  if (i % 150 === 7) z.prilohy = [{ id: 'pr' + i, nazev: 'vykres.pdf', typ: 'application/pdf', velikost: 700000,
    data: text(700000, 'P' + i), kdy: '2026-10-01T08:00:00.000Z', kdo: 'Test', popis: '' }];
  pamet.set('zakazky/z/' + KLIC(i), JSON.stringify(z));
}
pamet.set('zakazky/_rejstrik', JSON.stringify({ zakazky: [], pozn: text(50000, 'R') }));
pamet.set('program/firma', JSON.stringify({ udaje: { nazev: 'Zkušební firma s.r.o.' } }));
for (let i = 0; i < 4; i++) pamet.set('sablony/data/cn/' + (i + 1), JSON.stringify({ soubor: text(300000, 'S' + i) }));
for (let i = 0; i < 6; i++) pamet.set('podpisy/obch' + i + '@priklad.cz', JSON.stringify({ obrazek: text(50000, 'G' + i) }));
for (let i = 0; i < 60; i++) pamet.set('zakaznici/z/K' + i, JSON.stringify({ nazev: 'Zákazník ' + i }));
const velikostDb = [...pamet.values()].reduce((a, v) => a + v.length, 0);
console.log('zkušební databáze: ' + N + ' zakázek, ' + (velikostDb / 1048576).toFixed(1) + ' MB');

const r = await pozadavek(() => prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST',
  body: JSON.stringify({ email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' }) })));
cookie = (r.headers.get('set-cookie') || '').split(';')[0];
test('administrátor se přihlásí', r.status === 200, r.status);
for (let i = 0; i < 5; i++) pamet.set('uzivatele/obch' + i + '@priklad.cz', JSON.stringify({ email: 'obch' + i + '@priklad.cz',
  jmeno: 'Obchodník ' + i, role: 'Obchodník', aktivni: true, heslo: 'aa:bb' }));

/* ---------------- 1) vynucený otisk („Zálohovat teď") ---------------- */
let vynKlic = '';
await zkus('vynucený', async () => {
  let o = await pozdeji(async () => (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { duvod: 'rucne' })).json().catch(() => ({})));
  test('vynucený otisk: první požadavek odpoví v limitu (ne pád funkce)', o.ok === true, o);
  let pozadavku = 1;
  while (o.ok && o.hotovo === false && pozadavku < 200) {
    o = await (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { akce: 'pokracovat', klic: o.den })).json();
    pozadavku++;
  }
  test('vynucený otisk se dokončí navazujícími požadavky (každý v limitu)', o.ok === true && o.hotovo === true
    && o.pocetZakazek === N, { o, pozadavku });
  test('vynucený otisk potřeboval víc požadavků (jeden by limit nestihl)', pozadavku > 1, pozadavku);
  vynKlic = o.den || '';
  const otisk = await Z.ctiOtisk(globalThis.__TEST_ULOZISTE('zalohy'), vynKlic);
  test('otisk složený z částí nese všech ' + N + ' zakázek i přílohy, účty s hesly, šablony, podpisy, zákazníky',
    !!otisk && Object.keys(otisk.zakazky).length === N && otisk.zakazky[KLIC(7)].prilohy[0].data.length === 700000
    && otisk.uzivatele.some(u => u.email === 'obch3@priklad.cz' && u.heslo === 'aa:bb')
    && Object.keys(otisk.sablony).length === 4 && Object.keys(otisk.podpisy).length === 6
    && Object.keys(otisk.zakaznici).length === 60 && otisk.firma.udaje.nazev === 'Zkušební firma s.r.o.',
    otisk && { z: Object.keys(otisk.zakazky || {}).length });
  const man = JSON.parse(pamet.get('zalohy/' + vynKlic) || 'null');
  test('#523: otisk při objemu ostrého provozu se uloží komprimovaný (gzip) a menší, v limitech kroků',
    !!man && man.komprese === 'gzip' && man.ulozenoB > 0 && man.ulozenoB < man.velikostB, man && { velikostB: man.velikostB, ulozenoB: man.ulozenoB });
  test('žádný zapsaný blob zálohy není nad stropem části (4 MB)', nejvetsiZapisB <= Z.OTISK_CAST_MAX_B + 64 * 1024,
    { nejvetsiZapisB, nejvetsiZapisKlic });
  test('rezervace vynuceného otisku po dokončení zmizí', ![...pamet.keys()].some(k => k.startsWith('zalohy/vynucene-rezervace/')));
  test('rozpracovaný stav po dokončení zmizí', ![...pamet.keys()].some(k => k.startsWith('zalohy/rozpracovany/')));
  const seznam = await (await get(zalohaVynuceno, 'http://x/api/zaloha_vynuceno')).json();
  test('přehled ukáže hotový otisk s počtem částí a stav posledního pokusu „hotovo"',
    seznam.ok && seznam.otisky.some(x => x.den === vynKlic && x.pocetZakazek === N && x.casti > 1)
    && seznam.otiskStav && seznam.otiskStav.stav === 'hotovo', { otisky: seznam.otisky, stav: seznam.otiskStav });
});

/* ---------------- 2) noční otisk: běhy v okně navazují ---------------- */
await zkus('noční', async () => {
  const dnes = new Date().toISOString().slice(0, 10);
  const behy = [];
  for (let i = 0; i < 8; i++) behy.push(await ticho(async () => (await pozadavek(() => zalohaNocni())).json().catch(e => ({ chyba: String(e) }))));
  const hotovo = behy.findIndex(b => b.hotovo === true);
  test('noční otisk vznikne během okna (8 běhů po 15 min), každý běh v limitu', hotovo >= 0 && !behy.some(b => b.chyba),
    behy.map(b => ({ hotovo: b.hotovo, p: b.postup, ch: b.chyba })));
  test('noční otisk potřeboval víc běhů (jeden by 30 s nestihl)', hotovo > 0, hotovo);
  const sh = await Z.ctiOtisk(globalThis.__TEST_ULOZISTE('zalohy'), dnes);
  test('noční otisk je celý (zdroj nocni-otisk, ' + N + ' zakázek)', !!sh && sh.zdroj === 'nocni-otisk' && Object.keys(sh.zakazky).length === N);
  test('retence a úklid proběhly jednou za den (záznam dokončení)', behy.filter(b => b.retence).length === 1
    && JSON.parse(pamet.get('zalohy/nocni-dokonceno') || '{}').den === dnes, behy.map(b => !!b.retence));
  const zapisuPred = [...pamet.keys()].length;
  const dalsi = await ticho(async () => (await pozadavek(() => zalohaNocni())).json());
  test('další běh téže noci nic nepořizuje', dalsi.ok && dalsi.hotovo === true && [...pamet.keys()].length === zapisuPred, dalsi);
});

/* ---------------- 3) tvrdé ukončení uprostřed kroku ---------------- */
await zkus('přerušení', async () => {
  const klic = '2026-01-05';
  /* první krok ukončený uprostřed: po dvou zapsaných částech úložiště
   * přestane odpovídat (jako když Netlify funkci ukončí na limitu) */
  zabijPoCastech = 2;
  let chyba = null;
  try { await ticho(() => Z.porizOtiskKrok(klic, 'nocni-otisk', '', { rozpocetMs: 10000 })); } catch (e) { chyba = e; }
  zabijPoCastech = Infinity; zabito = false;
  test('simulace: krok byl opravdu ukončen uprostřed', !!chyba && /timed out/.test(String(chyba)), String(chyba));
  test('nedokončený otisk se jako hotový netváří', !pamet.has('zalohy/' + klic));
  const st = JSON.parse(pamet.get('zalohy/rozpracovany/' + klic) || '{}');
  test('postup ukončeného kroku přežil (uložené části a pozice)', st.casti === 2 && (st.pos.i > 0 || st.pos.j > 0), st);
  /* zámek kroku vyprší (beziDo) — posun hodin */
  let v; const p = Date.now; Date.now = () => p.call(Date) + 10 * 60000;
  try { do { v = await pozadavek(() => Z.porizOtiskKrok(klic, 'nocni-otisk', '', { rozpocetMs: 200, jenPokracovat: true })); } while (!v.hotovo); }
  finally { Date.now = p; }
  const o = await Z.ctiOtisk(globalThis.__TEST_ULOZISTE('zalohy'), klic);
  test('po přerušení další kroky navážou a otisk je celý, bez ztracených zakázek', v.hotovo && Object.keys(o.zakazky).length === N
    && o.zakazky[KLIC(899)].nazevAkce.startsWith('Zkušební zakázka 899 '), { v, n: Object.keys(o.zakazky).length });
});

/* ---------------- 3b) pokračování jen vynuceného slotu ---------------- */
await zkus('pokračování', async () => {
  const spatne = [];
  for (const klic of ['2026-01-05', 'souhrn/x', '2026-10-26T101010-pred-obnovou', '']) {
    const o = await (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { akce: 'pokracovat', klic })).json();
    if (o.ok !== false || !/Neplatný klíč rozpracované zálohy/.test(o.chyba || '')) spatne.push([klic, o]);
  }
  test('pokračování přijme jen klíč vynuceného slotu (ne noční, ne před obnovou, ne cizí klíč)', spatne.length === 0, spatne);
});

/* ---------------- 4) selhání otisku řekne proč ---------------- */
await zkus('chyba', async () => {
  selhatCteni = 'sablony';
  const o = await pozdeji(async () => ticho(async () => (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { duvod: 'rucne' })).json()));
  selhatCteni = null;
  let posl = o;
  for (let i = 0; i < 50 && posl.ok && posl.hotovo === false; i++) {
    selhatCteni = 'sablony';
    posl = await ticho(async () => (await post(zalohaVynuceno, 'http://x/api/zaloha_vynuceno', { akce: 'pokracovat', klic: posl.den })).json());
    selhatCteni = null;
  }
  test('selhání otisku vrátí hlášku s důvodem (ne tiché „žádná záloha")', posl.ok === false && /Záloha se nepořídila: .*výpadek čtení sablony/.test(posl.chyba), posl);
  const s = await (await get(zalohaVynuceno, 'http://x/api/zaloha_vynuceno')).json();
  test('přehled nese poslední pokus „chyba" s důvodem', s.otiskStav && s.otiskStav.stav === 'chyba' && /sablony/.test(s.otiskStav.chyba), s.otiskStav);
});

/* ---------------- 5) stažení zálohy a kopie na Disk po stránkách ---------------- */
await zkus('stažení', async () => {
  let zaloha = {}, po = '', stran = 0, nejvic = 0, res;
  do {
    res = await get(zalohaFn, 'http://x/api/zaloha?strana=1' + (po ? '&po=' + encodeURIComponent(po) : ''));
    const t = await res.text(); nejvic = Math.max(nejvic, t.length);
    const o = JSON.parse(t);
    if (!o.ok) throw new Error('stránka: ' + t.slice(0, 200));
    uloZalohaSloz(zaloha, o.zaloha); po = o.dalsi; stran++;
  } while (po && stran < 500);
  test('stažení po stránkách: každá odpověď pod limitem ~6 MB', nejvic < 6 * 1024 * 1024 && stran > 1, { nejvic, stran });
  test('složená záloha nese všechno a účty bez otisků hesel', Object.keys(zaloha.zakazky).length === N
    && zaloha.zakazky[KLIC(757)].prilohy[0].data.length === 700000 && Object.keys(zaloha.sablony).length === 4
    && Object.keys(zaloha.podpisy).length === 6 && zaloha.uzivatele.length === 6 && !JSON.stringify(zaloha.uzivatele).includes('heslo')
    && typeof zaloha.porizena === 'string' && zaloha.firma.udaje.nazev === 'Zkušební firma s.r.o.', { z: Object.keys(zaloha.zakazky || {}).length, u: zaloha.uzivatele });
  /* kopie na Disk: poslední noční otisk po částech */
  let kopie = {}, dalsi = '', otisk = null, puvod = '';
  stran = 0; nejvic = 0;
  do {
    const t = await (await get(zalohaFn, 'http://x/api/zaloha?zdroj=nocni&strana=1' + (otisk ? '&otisk=' + otisk : '')
      + (dalsi ? '&po=' + encodeURIComponent(dalsi) : ''))).text();
    nejvic = Math.max(nejvic, t.length);
    const o = JSON.parse(t);
    if (!o.ok) throw new Error('kopie: ' + t.slice(0, 200));
    if (!stran) { otisk = o.otisk; puvod = o.puvod; }
    uloZalohaSloz(kopie, o.zaloha); dalsi = o.dalsi; stran++;
  } while (dalsi && stran < 500);
  test('kopie na Disk: poslední noční otisk po stránkách pod limitem', puvod === 'nocni-otisk' && otisk === new Date().toISOString().slice(0, 10)
    && nejvic < 6 * 1024 * 1024 && stran > 1, { puvod, otisk, nejvic, stran });
  test('kopie na Disk: celá, bez otisků hesel a bez podpisů', Object.keys(kopie.zakazky).length === N && kopie.podpisy === null
    && kopie.uzivatele.length === 6 && !JSON.stringify(kopie).includes('aa:bb') && kopie.zdroj === 'nocni-otisk', { p: kopie.podpisy });
});

/* ---------------- 6) obnova z otisku po částech ---------------- */
await zkus('obnova', async () => {
  const sZak = globalThis.__TEST_ULOZISTE('zakazky');
  for (const i of [3, 450, 899]) pamet.delete('zakazky/z/' + KLIC(i));
  const telo = (x) => post(obnova, 'http://x/api/obnova', x);
  let zac = await (await telo({ faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' })).json();
  test('obnova: začátek odpoví v limitu', zac.ok === true, zac);
  const davkaPred = await (await telo({ obnovaId: zac.obnovaId, zdroj: { otisk: vynKlic, cast: 0 }, rezim: 'doplnit',
    casti: ['zakazky'], potvrzeni: 'OBNOVIT' })).json();
  test('obnova: dávka před dokončením otisku před obnovou se odmítne', zac.otiskHotovo === true || davkaPred.ok === false, davkaPred);
  let n = 0;
  while (zac.ok && zac.otiskHotovo === false && n++ < 200) zac = await (await telo({ faze: 'otisk', obnovaId: zac.obnovaId })).json();
  test('obnova: otisk před obnovou se dopořídí po krocích', zac.ok && zac.otiskHotovo === true, zac);
  const casti = (await (await get(zalohaVynuceno, 'http://x/api/zaloha_vynuceno')).json()).otisky.find(x => x.den === vynKlic).casti;
  let nove = 0;
  let davek = 0, nejvicVDavce = 0;
  for (let i = 0; i < casti; i++) {
    for (let od = 0, zaznamu = 1; od < zaznamu; od += 15) {
      const d = await (await telo({ obnovaId: zac.obnovaId, zdroj: { otisk: vynKlic, cast: i, od, kolik: 15 }, rezim: 'doplnit',
        casti: ['zakazky'], potvrzeni: 'OBNOVIT' })).json();
      if (!d.ok) throw new Error('dávka ' + i + '/' + od + ': ' + JSON.stringify(d).slice(0, 300));
      zaznamu = d.zdroj.zaznamu; davek++;
      nove += (d.casti && d.casti.zakazky && d.casti.zakazky.nove) || 0;
      /* #523 (mezera po Z1): výřez musí nést nejvýš 15 záznamů — v simulaci by i celá část stihla limit */
      { const z = (d.casti && d.casti.zakazky) || {};
        nejvicVDavce = Math.max(nejvicVDavce, (z.nove || 0) + (z.prepsane || 0) + (z.bezeZmeny || 0) + (z.preskocene || 0)); }
      if (process.env.DBG && d.casti.zakazky && d.casti.zakazky.preskocene) console.log(JSON.stringify(d.casti.zakazky.duvody.slice(0,2)));
    }
  }
  const kon = await (await telo({ faze: 'konec', obnovaId: zac.obnovaId })).json();
  test('#523: dávka obnovy z otisku zpracuje nejvýš 15 záznamů (výřez, ne celou část)', nejvicVDavce > 0 && nejvicVDavce <= 15, { nejvicVDavce, davek });
  test('obnova po částech doplní smazané zakázky (každá dávka v limitu)', kon.ok && nove === 3
    && !!(await sZak.cti('z/' + KLIC(450))), { nove, davek, kon: kon.ok });
});

/* ---------------- 7) O-K9 #527 (K9-V1): STARÝ JEDNOLITÝ OTISK z obrazovky ----------------
 * Otisk do v26.10.7 = jeden blob bez `casti`. Do O-K9 poslala obrazovka náhled
 * i obnovu jedním požadavkem (u 792 zakázek 54 s, limit 10 s). Teď ho bere
 * jako jednu část 0 a jede po výřezech. Klientský kód (src/ui/online_ui.js,
 * náhled + obnova) běží ve vm nad funkcemi pod simulovaným limitem.
 * Pojistka: s online_ui.js z v26.10.10 náhled skončí „Task timed out"
 * (jediný požadavek) a obnova nedoplní nic. */
await zkus('K9-V1', async () => {
  const vm = await import('node:vm');
  const { readFileSync } = await import('node:fs');
  const STARY = '2025-12-01';
  const cely = await Z.ctiOtisk(globalThis.__TEST_ULOZISTE('zalohy'), vynKlic);
  pamet.set('zalohy/' + STARY, JSON.stringify({ ...cely, zdroj: 'nocni-otisk' }));       // tvar do v26.10.7: bez format/casti
  const smazane = [5, 451, 898];
  for (const i of smazane) pamet.delete('zakazky/z/' + KLIC(i));
  const prehled = await (await get(zalohaVynuceno, 'http://x/api/zaloha_vynuceno')).json();
  const st = (prehled.otisky || []).find(x => x.den === STARY);
  test('K9-V1: přehled označí starý jednolitý otisk (stary: true, bez casti)', !!st && st.stary === true && !st.casti, st);
  const zdroj = readFileSync(new URL('../src/ui/online_ui.js', import.meta.url), 'utf8');
  const a = zdroj.indexOf('function onlineObnovaPripraveno'), b = zdroj.indexOf('async function onlineObnovaBeziciDokonci');
  const kod = zdroj.slice(zdroj.indexOf('const OBNOVA_CASTI = ['), zdroj.indexOf('function onlineObnovaStav')) + zdroj.slice(a, b);
  let pozadavku = 0, nejdele = 0, zdrojVTokenu = undefined;
  const funkce = { '/api/obnova': obnova, '/api/zaloha_vynuceno': zalohaVynuceno };
  const ctx = { Promise, JSON, String, Error, Date, Object, Array, Math, Number, Set, Map, console, TextEncoder,
    ONLINE_STAV: { otisky: prehled.otisky, ja: { role: 'Administrátor' } }, ONLINE_OTISK_KROKU_MAX: 400,
    jeAdminOnline: () => true, render: () => {}, potvrd: async () => true, dotazHeslo: async () => 'Docasne.Heslo.123',
    onlineZprava: () => {}, onlineZobrazeniHesloPlatne: () => false, onlineZobrazeniHeslo: async () => 'Docasne.Heslo.123',
    onlineZobrazeniHesloPoObnove: () => {}, onlineZobrazeniHesloZapomen: () => {}, onlinePocetText: (n) => n + ' zakázek',
    onlineNactiProgram: async () => true, onlineNactiFirmu: async () => true, onlineNactiRejstrik: async () => true,
    onlineNactiSablony: async () => true, onlineNactiZobrazeni: async () => true, onlineOtiskyNacti: async () => true,
    onlineObnovaVelikost: (x) => JSON.stringify(x === undefined ? null : x).length,
    onlineApi: async (cesta, telo) => {
      pozadavku++;
      /* K9-S5: zdroj musí být v tokenu už před první dávkou (poslala ho obrazovka v začátku) */
      if (telo && telo.obnovaId && telo.zdroj && zdrojVTokenu === undefined)
        zdrojVTokenu = (JSON.parse(pamet.get('zalohy/obnova-' + telo.obnovaId) || '{}')).zdrojOtisk || null;
      const t0 = Date.now();
      const r = await post(funkce[cesta], 'http://x' + cesta, telo);
      nejdele = Math.max(nejdele, Date.now() - t0);
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.ok === false) { const e = new Error(d.chyba || ('server odpověděl ' + r.status)); e.data = d; e.stav = r.status; throw e; }
      return d;
    } };
  vm.createContext(ctx);
  vm.runInContext(kod + '\nfunction onlineObnovaStav() { return ONLINE_STAV.obnova; }'
    + '\nthis.nahled = onlineObnovaNahled; this.proved = onlineObnovaProved; this.casti = onlineObnovaCastiOtisku;', ctx);
  ctx.ONLINE_STAV.obnova = { otevreno: true, zdrojTyp: 'otisk', otiskDen: STARY, soubor: null, souborJmeno: '', rezim: 'doplnit',
    casti: { zakazky: true }, nahled: null, pracuje: false, hlaska: '', hlaskaTyp: '' };
  test('K9-V1: obrazovka počítá starý otisk jako 1 část (výřezy), ne 0 (jeden požadavek)', ctx.casti() === 1, ctx.casti());
  const n = await ctx.nahled();
  const o = ctx.ONLINE_STAV.obnova;
  test('K9-V1: náhled ze starého otisku po výřezech projde, každý požadavek v limitu, ukáže 3 nové zakázky', n === true
    && !!o.nahled && o.nahled.casti.zakazky && o.nahled.casti.zakazky.nove === 3 && pozadavku > 10 && nejdele < LIMIT_MS,
    { n, hlaska: o.hlaska, pozadavku, nejdele, z: o.nahled && o.nahled.casti && o.nahled.casti.zakazky && o.nahled.casti.zakazky.nove });
  pozadavku = 0; nejdele = 0;
  const p = await ctx.proved();
  test('K9-V1: obnova ze starého otisku po výřezech doplní smazané zakázky (každý požadavek v limitu)', p === true
    && smazane.every(i => pamet.has('zakazky/z/' + KLIC(i))) && pozadavku > 10 && nejdele < LIMIT_MS, { p, hlaska: o.hlaska, pozadavku, nejdele });
  test('K9-S5: obrazovka poslala zdroj obnovy už v začátku (token ho nese před první dávkou)', zdrojVTokenu === STARY, zdrojVTokenu);
  const tk = [...pamet.keys()].filter(k => k.startsWith('zalohy/obnova-'));
  test('K9-V1: po obnově žádný token nezůstal (konec proběhl)', tk.length === 0, tk);
});

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
