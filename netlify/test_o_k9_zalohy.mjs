/* O-K9 #527 — OPRAVY NÁLEZŮ NEZÁVISLÉHO AUDITU ZÁLOH K9 #526 (26. 10. 2026)
 *
 * Scénáře z reprodukcí auditu (podklady/K9_pokusy/r2_pojistka, r4_soubehy,
 * r7_davka_velkych) jako testy na paměťovém úložišti:
 *   K9-S1  pozvolný úbytek (−4 % zakázek / −8 % dat za noc) — kumulativně
 *          proti maximu za 30 dní; po potvrzení se tentýž úbytek nehlásí
 *   K9-S2  nepotvrzené varování se nepřepíše (noc × noc, Disk × noc);
 *          potvrzuje se nejstarší, další v pořadí drží retenci
 *   K9-N1  potvrzení × nové varování zapsané během ověření hesla → 409
 *   K9-N2  varování bez platného `kdy` = retence stojí (fail-closed)
 *   K9-N7  bez nočního otisku porovnání s vynucenými
 *   K9-S5  retence nesmaže zdroj rozběhnuté obnovy
 *   K9-N3  druhý noční běh nesmaže hotový otisk
 *   K9-N4  retence neběží nad otiskem, kterému chybí část
 *   K9-N5  jednorázová obnova velké databáze → 409 (bez zápisu)
 *   K9-N6  rozpočet kroku i po každé zapsané části
 *   volby koordinace: úbytek potvrzuje jen hlavní správce; otisk „před
 *          obnovou" smaže jen správce ručně s heslem; zaloha_nocni bez cesty.
 *   T1 #528 (přeživší mutace Testy #198): noční běh nad hotovým otiskem
 *          se zbylým stavem; rozpočet po dávce čtení (simulované hodiny);
 *          potvrzení poškozeného záznamu varování.
 * K9-V1 (obnova starého otisku po výřezech) je v test_zalohy_objem.mjs,
 * K9-S4 (souhrn starého otisku) v test_zalohy.mjs, K9-S6 (čas serveru při
 * úklidu Disku) v src/test_z2_disk_retence.js.
 *
 * Pojistka: nad kódem integrace bab9a7c (v26.10.10) sada selže v každém
 * oddílu (ověřeno výměnou lib/zalohovani.mjs, functions/zaloha_vynuceno.mjs
 * a functions/obnova.mjs za verze z bab9a7c — viz commit). Po opravě projde.
 * Spuštění: node netlify/test_o_k9_zalohy.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/* Paměťové úložiště s binárními záznamy a háčky (čtení, zápis části). */
const pamet = new Map();
const hacky = { cti: null, zapisBin: null, smaz: null };
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { if (hacky.cti) await hacky.cti(nazev, k); const v = pamet.get(nazev + '/' + k);
    if (v === undefined) return null; return JSON.parse(Buffer.isBuffer(v) ? v.toString('utf8') : v); },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async ctiBin(k) { const v = pamet.get(nazev + '/' + k); return v === undefined ? null : (Buffer.isBuffer(v) ? v : Buffer.from(v)); },
  async zapisBin(k, b) { if (hacky.zapisBin) await hacky.zapisBin(nazev, k); pamet.set(nazev + '/' + k, Buffer.from(b)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { if (hacky.smaz) await hacky.smaz(nazev, k); pamet.delete(nazev + '/' + k); },
});
const ulz = (n) => globalThis.__TEST_ULOZISTE(n);

const Z = await import('./lib/zalohovani.mjs');
const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: zalohaVynuceno } = await import('./functions/zaloha_vynuceno.mjs');
const { default: obnova } = await import('./functions/obnova.mjs');
const nocniModul = await import('./functions/zaloha_nocni.mjs');
const { ADMIN_EMAIL, otiskHesla } = await import('./lib/sdilene.mjs');
Object.assign(globalThis, require('../src/format.js'), require('../src/engine.js'), require('../src/engine_proj.js'),
  require('../src/techspec.js'), require('../src/sleva.js'), require('../src/zaokrouhleni.js'), require('../src/zamek.js'));
const zk = require('../src/zakazka.js');
const { uloJmenoSouboru } = require('../src/uloziste.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 600))); } };
const zkus = async (n, fn) => { try { await fn(); } catch (e) { test(n + ' (výjimka)', false, String(e && e.stack || e)); } };
const ticho = async (fn) => { const l = console.log, w = console.warn, e = console.error; console.log = console.warn = console.error = () => {};
  try { return await fn(); } finally { console.log = l; console.warn = w; console.error = e; } };
const J = (x) => JSON.stringify(x);
const DEN = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const HESLO = 'Docasne.Heslo.123', HESLO2 = 'Druhy.Spravce.123';
const DRUHY = 'druhy.spravce@priklad.cz';
const vycistiZalohy = () => { for (const k of [...pamet.keys()]) if (k.startsWith('zalohy/')) pamet.delete(k); };
/* Otisk jen jako manifest + souhrn + 1 část (počty, žádná data). */
const vlozOtisk = (klic, udaje = {}) => {
  const zdroj = udaje.zdroj || (/^\d{4}-\d{2}-\d{2}$/.test(klic) ? 'nocni-otisk' : /pred-obnovou/.test(klic) ? 'pred-obnovou' : 'vynuceno');
  const m = { format: Z.OTISK_FORMAT, porizena: klic.slice(0, 10) + 'T02:00:00.000Z', zdroj, kdo: '', casti: 1,
    pocetZakazek: 800, pocetUctu: 6, velikostB: 114e6, pocetSablon: 10, pocetPodpisu: 6, ...udaje, zdroj };
  pamet.set('zalohy/' + klic, J(m));
  pamet.set('zalohy/' + Z.souhrnKlic(klic), J({ den: klic, ...m }));
  pamet.set('zalohy/' + Z.castKlic(klic, 0), J({ program: null }));
};
const kopieDisk = (otisk, kdy) => pamet.set('zalohy/' + Z.KOPIE_DISK_KLIC, J({ kdy, kdo: ADMIN_EMAIL, soubor: 'otisk_' + otisk + '.json.gz',
  velikostB: 1000, sha256: 'a'.repeat(64), otisk, puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB', potvrzeno: 'heslo-spravce' }));
const noc = (den) => Z.retenceProved(den, den, Date.parse(den + 'T02:30:00Z'));
const varovani = () => JSON.parse(pamet.get('zalohy/' + Z.RETENCE_VAROVANI_KLIC) || 'null');

/* přihlášení: hlavní správce a druhý Administrátor */
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
const obnovPost = async (telo) => { const r = await obnova(new Request('http://x/api/obnova', { method: 'POST', headers: { cookie }, body: J(telo) }));
  return { status: r.status, telo: await r.json() }; };

/* ---------------- K9-S1: pozvolný úbytek ---------------- */
await zkus('K9-S1', async () => {
  vycistiZalohy();
  const t0 = Date.parse('2026-11-01T00:00:00Z');
  for (let d = 0; d < 40; d++) vlozOtisk(iso(t0 + d * DEN), { pocetZakazek: 800, velikostB: 114e6 });
  let z = 800, v = 114e6, prvniVarovani = 0, smazanoPoVarovani = 0;
  for (let d = 40; d < 54; d++) {
    z = Math.floor(z * 0.96); v = Math.floor(v * 0.92);
    const den = iso(t0 + d * DEN);
    vlozOtisk(den, { pocetZakazek: z, velikostB: v });
    kopieDisk(den, den + 'T01:00:00.000Z');
    const r = await noc(den);
    if ((r.varovani || r.drzeno) && !prvniVarovani) prvniVarovani = d - 39;
    if (prvniVarovani) smazanoPoVarovani += r.smazano.length;
  }
  test('K9-S1: salám −4 % zakázek / −8 % dat za noc → varování nejpozději 3. noc', prvniVarovani >= 1 && prvniVarovani <= 3, prvniVarovani);
  test('K9-S1: od prvního varování retence nesmazala nic', smazanoPoVarovani === 0, smazanoPoVarovani);
  const vz = varovani();
  test('K9-S1: varování porovnává s maximem za 30 dní (800 zakázek, kumulativně)', !!vz && /800 →/.test(vz.text) && vz.kumulativne === true
    && /nejvyšším stavem za posledních 30 dní/.test(vz.text), vz && vz.text);
  /* jednorázový pokles stejný jako dřív: text proti včerejšku (ne „kumulativně") */
  vycistiZalohy();
  for (let d = 1; d <= 20; d++) vlozOtisk('2026-11-' + String(d).padStart(2, '0'));
  vlozOtisk('2026-11-21', { pocetZakazek: 400 });
  kopieDisk('2026-11-21', '2026-11-21T01:00:00.000Z');
  const r = await noc('2026-11-21');
  test('K9-S1: jednorázový pokles proti včerejšku — text jako dřív („proti 2026-11-20"), bez „kumulativně"', !!r.varovani
    && /má proti 2026-11-20 méně dat \(zakázek 800 → 400\)$/.test(r.varovani.text) && !r.varovani.kumulativne, r.varovani);
  /* pod prahem v okně, ale nad prahem proti maximu před 31 dny = bez varování (okno 30 dní) */
  vycistiZalohy();
  vlozOtisk('2026-10-01', { pocetZakazek: 1000, zdroj: 'nocni-otisk' });
  for (let d = 2; d <= 31; d++) vlozOtisk('2026-10-' + String(d).padStart(2, '0'), { pocetZakazek: 800 });
  vlozOtisk('2026-11-01', { pocetZakazek: 800 });
  kopieDisk('2026-11-01', '2026-11-01T01:00:00.000Z');
  const r2 = await noc('2026-11-01');
  test('K9-S1: maximum starší než 30 dní se nepočítá (1. 10. → 1. 11. = 31 dní)', !r2.varovani && !r2.drzeno, r2.ceka || r2.smazano);
});

/* ---------------- K9-S2, potvrzení, základ ---------------- */
await zkus('K9-S2', async () => {
  vycistiZalohy();
  for (let d = 1; d <= 20; d++) vlozOtisk('2026-11-' + String(d).padStart(2, '0'), { pocetZakazek: 800, velikostB: 114e6 });
  kopieDisk('2026-11-20', '2026-11-20T01:00:00.000Z');
  vlozOtisk('2026-11-21', { pocetZakazek: 400, velikostB: 57e6 });
  const r1 = await noc('2026-11-21');
  vlozOtisk('2026-11-22', { pocetZakazek: 370, velikostB: 50e6 });
  const r2 = await noc('2026-11-22');
  const v = varovani();
  test('K9-S2: druhá noc nepřepíše nepotvrzené varování — hlavní zůstává 800 → 400 z 21. 11.', !!r1.varovani && !!r2.varovani
    && v.den === '2026-11-21' && /800 → 400/.test(v.text) && !v.potvrzeno, v);
  test('K9-S2: druhé varování (800 → 370, kumulativně) čeká v `dalsi`', Array.isArray(v.dalsi) && v.dalsi.length === 1
    && v.dalsi[0].den === '2026-11-22' && /800 → 370/.test(v.dalsi[0].text), v.dalsi);
  const r2b = await noc('2026-11-22');
  test('K9-S2: opakovaný běh téže noci varování nezdvojí', varovani().dalsi.length === 1 && r2b.smazano.length === 0);
  /* volba koordinace: potvrzuje jen hlavní správce */
  const cizi = await vynuceno({ akce: 'retence-potvrdit', den: v.den, kdy: v.kdy, hesloSpravce: HESLO2 }, cookie2);
  test('volba: druhý Administrátor úbytek nepotvrdí (403 jenHlavniSpravce), záznam beze změny', cizi.status === 403
    && cizi.telo.kod === 'jenHlavniSpravce' && J(varovani()) === J(v), cizi);
  const get2 = await vynuceno(null, cookie2), get1 = await vynuceno(null);
  test('volba: přehled říká, co kdo smí (smi.potvrditUbytek jen hlavní, smazatPredObnovou oba)', get1.telo.smi && get1.telo.smi.potvrditUbytek === true
    && get2.telo.smi.potvrditUbytek === false && get1.telo.smi.smazatPredObnovou === true && get2.telo.smi.smazatPredObnovou === true, { a: get1.telo.smi, b: get2.telo.smi });
  test('volba: výchozí volby koordinace na jednom místě (ZALOHY_VOLBY)', J(Z.ZALOHY_VOLBY) === J({ potvrditUbytek: 'hlavni', smazatPredObnovou: 'spravce' }));
  /* potvrzení nejstaršího → na řadě další, retence stojí dál */
  const p1 = await vynuceno({ akce: 'retence-potvrdit', den: v.den, kdy: v.kdy, hesloSpravce: HESLO });
  const v1 = varovani();
  test('K9-S2: potvrzení nejstaršího posune na jeho místo další (22. 11., nepotvrzené)', p1.status === 200 && v1.den === '2026-11-22'
    && !v1.potvrzeno && !v1.dalsi && v1.predtimPotvrzeno && v1.predtimPotvrzeno.den === '2026-11-21', v1);
  vlozOtisk('2026-11-23', { pocetZakazek: 370, velikostB: 50e6 });
  kopieDisk('2026-11-23', '2026-11-23T01:00:00.000Z');
  const r3 = await noc('2026-11-23');
  test('K9-S2: dokud čeká další varování, retence stojí', r3.smazano.length === 0 && (!!r3.drzeno || !!r3.varovani), r3);
  /* 23. 11. (370 / 50 MB) je proti potvrzenému 21. 11. (400 / 57 MB) zase úbytek — přidal se za 22. 11. */
  test('K9-S1: po potvrzení jen prvního úbytku hlásí další noc úbytek proti němu (základ 21. 11.)', varovani().dalsi
    && varovani().dalsi.length === 1 && varovani().dalsi[0].den === '2026-11-23', varovani());
  const p2 = await vynuceno({ akce: 'retence-potvrdit', den: '2026-11-22', kdy: varovani().kdy, hesloSpravce: HESLO });
  const p3 = await vynuceno({ akce: 'retence-potvrdit', den: '2026-11-23', kdy: varovani().kdy, hesloSpravce: HESLO });
  const zakl = JSON.parse(pamet.get('zalohy/' + Z.RETENCE_ZAKLAD_KLIC) || 'null');
  test('K9-S1: potvrzení zapíše základ pojistky (den posledního potvrzeného úbytku)', p2.status === 200 && p3.status === 200
    && !!varovani().potvrzeno && zakl && zakl.den === '2026-11-23', { p3, zakl });
  vlozOtisk('2026-11-24', { pocetZakazek: 370, velikostB: 50e6 });
  kopieDisk('2026-11-24', '2026-11-24T01:00:00.000Z');
  const r4 = await noc('2026-11-24');
  test('K9-S1: po potvrzení se tentýž (záměrný) úbytek proti maximu před ním znovu nehlásí a retence maže', !r4.varovani && !r4.drzeno
    && r4.smazano.length > 0, r4.ceka || r4.smazano);
  /* K9-S2b: varování z Disku jako nejstarší, noc se přidá za něj */
  vycistiZalohy();
  for (let d = 1; d <= 20; d++) vlozOtisk('2026-11-' + String(d).padStart(2, '0'), { pocetZakazek: 800, velikostB: 114e6 });
  kopieDisk('2026-11-20', '2026-11-20T01:00:00.000Z');
  const disk = await vynuceno({ akce: 'retence-varovani-disk', disk: { den: '2026-11-19', predSoubor: 'otisk_2026-11-12.json.gz',
    novySoubor: 'otisk_2026-11-19.json.gz', predVelikostB: 9e7, novaVelikostB: 3e7 } });
  vlozOtisk('2026-11-21', { pocetZakazek: 700, velikostB: 113e6 });
  await noc('2026-11-21');
  const vd = varovani();
  test('K9-S2b: noční varování nepřepíše nepotvrzené z Disku — Disk zůstává hlavní, noc čeká za ním', disk.status === 200
    && vd.zdroj === 'disk' && /Disku/.test(vd.text) && vd.dalsi && vd.dalsi.length === 1 && vd.dalsi[0].zdroj === 'nocni', vd);
  const disk2 = await vynuceno({ akce: 'retence-varovani-disk', disk: { den: '2026-11-22', predSoubor: 'otisk_2026-11-19.json.gz',
    novySoubor: 'otisk_2026-11-22.json.gz', predVelikostB: 3e7, novaVelikostB: 1e7 } });
  test('K9-S2b: další hlášení z Disku se přidá (do O-K9 se zahodilo)', disk2.status === 200 && varovani().dalsi.length === 2
    && varovani().dalsi[1].den === '2026-11-22', varovani().dalsi);
});

/* ---------------- K9-N1: souběh potvrzení a nového varování ---------------- */
await zkus('K9-N1', async () => {
  vycistiZalohy();
  pamet.set('zalohy/' + Z.RETENCE_VAROVANI_KLIC, J({ kdy: '2026-11-21T02:30:00.000Z', den: '2026-11-21', zdroj: 'nocni', text: 'A: zakázek 800 → 400' }));
  let jednou = true, precteno = false;
  hacky.cti = async (ul, k) => {
    if (ul === 'zalohy' && k === Z.RETENCE_VAROVANI_KLIC) precteno = true;
    if (jednou && precteno && ul === 'uzivatele' && k === ADMIN_EMAIL) { jednou = false;
      /* noc zapíše přes retenceProved (přidá) — tady rovnou celý nový stav, jak by ho zapsal souběžný běh */
      pamet.set('zalohy/' + Z.RETENCE_VAROVANI_KLIC, J({ kdy: '2026-11-22T02:30:00.000Z', den: '2026-11-22', zdroj: 'nocni', text: 'B: zakázek 400 → 100' })); }
  };
  const o = await vynuceno({ akce: 'retence-potvrdit', den: '2026-11-21', kdy: '2026-11-21T02:30:00.000Z', hesloSpravce: HESLO });
  hacky.cti = null;
  const v = varovani();
  test('K9-N1: varování změněné během ověření hesla → 409 a nové varování B drží retenci', o.status === 409 && v.den === '2026-11-22'
    && !v.potvrzeno && Z.retenceDrzena(v) !== null, { o, v });
  const kdyJiny = await vynuceno({ akce: 'retence-potvrdit', den: '2026-11-22', kdy: '2026-11-22T09:99:00.000Z', hesloSpravce: HESLO });
  test('K9-N1: potvrzení s jiným `kdy` než záznam → 409', kdyJiny.status === 409);
  const spravne = await vynuceno({ akce: 'retence-potvrdit', den: '2026-11-22', kdy: '2026-11-22T02:30:00.000Z', hesloSpravce: HESLO });
  test('K9-N1: potvrzení přesně toho, co správce viděl, projde', spravne.status === 200 && !!varovani().potvrzeno, spravne);
});

/* ---------------- K9-N2: varování bez platného kdy ---------------- */
await zkus('K9-N2', async () => {
  vycistiZalohy();
  for (let d = 1; d <= 20; d++) vlozOtisk('2026-11-' + String(d).padStart(2, '0'));
  kopieDisk('2026-11-20', '2026-11-20T01:00:00.000Z');
  pamet.set('zalohy/' + Z.RETENCE_VAROVANI_KLIC, J({ den: '2026-11-19', text: 'nepotvrzené, bez kdy' }));
  const r = await noc('2026-11-20');
  test('K9-N2: nepotvrzené varování bez `kdy` retenci zastaví (fail-closed), nic se nesmaže', r.smazano.length === 0 && !!r.drzeno
    && r.drzeno.bezCasu === true && /poškozený záznam/.test(r.ceka || ''), r);
  const p = await vynuceno({ akce: 'retence-potvrdit', den: '2026-11-19', hesloSpravce: HESLO });
  test('K9-N2: takové varování jde potvrdit (bez `kdy` v těle) a retence se rozběhne', p.status === 200 && (await noc('2026-11-20')).smazano.length > 0, p);
});

/* ---------------- K9-N7: bez nočního otisku ---------------- */
await zkus('K9-N7', async () => {
  vycistiZalohy();
  for (let d = 1; d <= 20; d++) vlozOtisk('2026-11-' + String(d).padStart(2, '0') + 'T101010-auto', { pocetZakazek: 800, velikostB: 114e6 });
  vlozOtisk('2026-11-21', { pocetZakazek: 10, velikostB: 1e6 });
  kopieDisk('2026-11-21', '2026-11-21T01:00:00.000Z');
  const r = await noc('2026-11-21');
  test('K9-N7: první noční otisk bez předchozího nočního se porovná s vynucenými (800 → 10 = varování, nic se nesmaže)',
    !!r.varovani && /800 → 10/.test(r.varovani.text) && r.smazano.length === 0, r.ceka || r.smazano);
  const pred = await (async () => { vycistiZalohy();
    for (let d = 1; d <= 3; d++) vlozOtisk('2026-11-' + String(d).padStart(2, '0') + 'T101010-pred-obnovou', { pocetZakazek: 800 });
    vlozOtisk('2026-11-21', { pocetZakazek: 10 }); kopieDisk('2026-11-21', '2026-11-21T01:00:00.000Z'); return noc('2026-11-21'); })();
  test('K9-N7: otisky „před obnovou" se za referenci neberou', !pred.varovani, pred.ceka);
});

/* ---------------- databáze zakázek pro otisky a obnovu ---------------- */
const text = (n, z) => (z + ' Příliš žluťoučký kůň úpěl ďábelské ódy. ').repeat(Math.ceil(n / 40)).slice(0, n);
const KLIC = (i) => uloJmenoSouboru({ cislo: '2026 - OBJ - CN - ' + String(i).padStart(4, '0') });
const naplnZakazky = (n, delka) => { for (let i = 0; i < n; i++) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OBJ - CN - ' + String(i).padStart(4, '0');
  z.nazevAkce = 'Zakázka ' + i + ' ' + text(delka, 'Z' + i);
  pamet.set('zakazky/z/' + KLIC(i), J(z)); } };
const zakazekVDb = () => [...pamet.keys()].filter(k => k.startsWith('zakazky/z/')).length;

/* ---------------- K9-S5: retence × rozběhnutá obnova ---------------- */
await zkus('K9-S5', async () => {
  vycistiZalohy();
  naplnZakazky(120, 60000);
  /* zdroj 22. 9. (úterý): retence ho smí smazat (září drží 1. 9. a neděle 27. 9.) a je mimo okno pojistky 30 dní */
  const Q = '2026-09-22';
  vlozOtisk('2026-09-01', { pocetZakazek: 0, pocetUctu: 0, velikostB: 0, pocetSablon: 0, pocetPodpisu: 0 });
  vlozOtisk('2026-09-27', { pocetZakazek: 0, pocetUctu: 0, velikostB: 0, pocetSablon: 0, pocetPodpisu: 0 });
  await Z.porizOtisk('nocni-otisk', '', Q);
  for (let i = 0; i < 120; i++) pamet.delete('zakazky/z/' + KLIC(i));       // havárie
  /* obrazovka posílá zdroj už v začátku */
  let zac = (await obnovPost({ faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT', zdrojOtisk: Q })).telo;
  while (zac.ok && zac.otiskHotovo === false) zac = (await obnovPost({ faze: 'otisk', obnovaId: zac.obnovaId })).telo;
  const token = JSON.parse(pamet.get('zalohy/obnova-' + zac.obnovaId) || '{}');
  test('K9-S5: token obnovy nese zdroj (zdrojOtisk)', token.zdrojOtisk === Q, token);
  const d1 = (await obnovPost({ obnovaId: zac.obnovaId, zdroj: { otisk: Q, cast: 0, od: 0, kolik: 15 }, rezim: 'doplnit', casti: ['zakazky'], potvrzeni: 'OBNOVIT' })).telo;
  /* noc mezi dávkami: nový noční otisk + retence (kopie na Disk čerstvá); předchozí noci bez počtů (pojistka mlčí) */
  for (const d of ['2026-10-01', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'])
    vlozOtisk(d, { pocetZakazek: 0, pocetUctu: 0, velikostB: 0, pocetSablon: 0, pocetPodpisu: 0 });
  await Z.porizOtisk('nocni-otisk', '', '2026-10-26');
  kopieDisk('2026-10-26', new Date(Date.now() - 3600000).toISOString());
  const ret = await Z.retenceProved('2026-10-26', '2026-10-26');
  test('K9-S5: retence zdroj rozběhnuté obnovy nesmaže (chranene) a zbytek maže', d1.ok && !ret.smazano.includes(Q)
    && pamet.has('zalohy/' + Q) && J(ret.chranene) === J([Q]) && ret.smazano.length > 0, { d1: d1.ok, ret });
  let od = 15, zaznamu = (d1.zdroj && d1.zdroj.zaznamu) || 0, chyba = null;
  while (od < zaznamu && !chyba) {
    const d = (await obnovPost({ obnovaId: zac.obnovaId, zdroj: { otisk: Q, cast: 0, od, kolik: 15 }, rezim: 'doplnit', casti: ['zakazky'], potvrzeni: 'OBNOVIT' })).telo;
    if (!d.ok) chyba = d.chyba; zaznamu = (d.zdroj && d.zdroj.zaznamu) || 0; od += 15;
  }
  for (let c = 1; c < JSON.parse(pamet.get('zalohy/' + Q)).casti && !chyba; c++)
    for (let o2 = 0, n = 1; o2 < n && !chyba; o2 += 15) {
      const d = (await obnovPost({ obnovaId: zac.obnovaId, zdroj: { otisk: Q, cast: c, od: o2, kolik: 15 }, rezim: 'doplnit', casti: ['zakazky'], potvrzeni: 'OBNOVIT' })).telo;
      if (!d.ok) chyba = d.chyba; n = (d.zdroj && d.zdroj.zaznamu) || 0;
    }
  await obnovPost({ faze: 'konec', obnovaId: zac.obnovaId });
  test('K9-S5: obnova po retenci doběhla celá (120 ze 120 zakázek)', !chyba && zakazekVDb() === 120, { chyba, zakazek: zakazekVDb() });
  const ret2 = await Z.retenceProved('2026-10-26', '2026-10-26');
  test('K9-S5: po konci obnovy (token pryč) retence otisk smaže podle pravidla', ret2.smazano.includes(Q), ret2);
  /* token bez zdroje (začátek ze starší obrazovky) → retence stojí celá; po dávce zná zdroj */
  vlozOtisk('2026-09-23', { pocetZakazek: 0, pocetUctu: 0, velikostB: 0, pocetSablon: 0, pocetPodpisu: 0 });
  let zac2 = (await obnovPost({ faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' })).telo;
  while (zac2.ok && zac2.otiskHotovo === false) zac2 = (await obnovPost({ faze: 'otisk', obnovaId: zac2.obnovaId })).telo;
  const ret3 = await Z.retenceProved('2026-10-26', '2026-10-26');
  test('K9-S5: živý token bez zdroje → retence čeká celá', ret3.smazano.length === 0 && /běží obnova/.test(ret3.ceka || ''), ret3);
  await obnovPost({ obnovaId: zac2.obnovaId, zdroj: { otisk: '2026-09-23', cast: 0, od: 0, kolik: 15 }, rezim: 'doplnit', casti: ['firma'], potvrzeni: 'OBNOVIT' });
  const tk2 = JSON.parse(pamet.get('zalohy/obnova-' + zac2.obnovaId));
  test('K9-S5: dávka doplní zdroj do tokenu bez něj', tk2.zdrojOtisk === '2026-09-23', tk2);
  await obnovPost({ faze: 'konec', obnovaId: zac2.obnovaId });
  /* vypršelý token nic nedrží */
  pamet.set('zalohy/obnova-' + 'f'.repeat(32), J({ id: 'f'.repeat(32), kdo: ADMIN_EMAIL, zacatek: '2026-01-01T00:00:00.000Z', naposled: '2026-01-01T00:00:00.000Z' }));
  const ret4 = await Z.retenceProved('2026-10-26', '2026-10-26');
  test('K9-S5: vypršelý token (hodina nečinnosti) retenci nedrží', !/běží obnova/.test(ret4.ceka || '') && ret4.smazano.includes('2026-09-23'), ret4);
  pamet.delete('zalohy/obnova-' + 'f'.repeat(32));
});

/* ---------------- K9-N3: druhý noční běh po dokončení prvního ---------------- */
await zkus('K9-N3', async () => {
  const den = '2026-11-05';
  let v; do { v = await Z.porizOtiskKrok(den, 'nocni-otisk', '', { rozpocetMs: 1 }); } while (!v.hotovo);
  const m = pamet.get('zalohy/' + den);
  const b = await Z.porizOtiskKrok(den, 'nocni-otisk', '', { rozpocetMs: 1 });
  test('K9-N3: druhý běh hotový otisk nesmaže a vrátí hotovo (uzByl)', b.hotovo === true && b.uzByl === true && pamet.get('zalohy/' + den) === m
    && b.pocetZakazek === v.pocetZakazek, b);
  const p = await Z.porizOtisk('nocni-otisk', '', den);
  test('K9-N3: porizOtisk (výslovné přepořízení) otisk pořídí znovu', p.den === den && pamet.get('zalohy/' + den) !== m);
  test('K9-N3: noční funkce volá krok bez prepsatHotovy', !/prepsatHotovy/.test(readFileSync(new URL('./functions/zaloha_nocni.mjs', import.meta.url), 'utf8')));
});

/* ---------------- K9-N4: nový otisk bez části ---------------- */
await zkus('K9-N4', async () => {
  vycistiZalohy();
  await Z.porizOtisk('nocni-otisk', '', '2026-11-10');
  const m = JSON.parse(pamet.get('zalohy/2026-11-10'));
  pamet.delete('zalohy/' + Z.castKlic('2026-11-10', m.casti - 1));
  for (let d = 1; d < 10; d++) vlozOtisk('2026-10-0' + d, { pocetZakazek: m.pocetZakazek, pocetUctu: m.pocetUctu, velikostB: m.velikostB });
  vlozOtisk('2026-11-09', { pocetZakazek: m.pocetZakazek, pocetUctu: m.pocetUctu, velikostB: m.velikostB, pocetSablon: m.pocetSablon, pocetPodpisu: m.pocetPodpisu });
  kopieDisk('2026-11-09', '2026-11-10T03:00:00.000Z');
  const ret = await Z.retenceProved('2026-11-10', '2026-11-10', Date.parse('2026-11-10T03:00:00Z'));
  test('K9-N4: nový otisk bez poslední části → retence čeká, nic se nesmaže', ret.smazano.length === 0 && /neúplný/.test(ret.ceka || ''), ret);
  pamet.set('zalohy/' + Z.castKlic('2026-11-10', m.casti - 1), J({}));
  const ret2 = await Z.retenceProved('2026-11-10', '2026-11-10', Date.parse('2026-11-10T03:00:00Z'));
  test('K9-N4: se všemi částmi retence běží', ret2.smazano.length > 0, ret2);
});

/* ---------------- K9-N6: rozpočet po každé části ---------------- */
await zkus('K9-N6', async () => {
  for (const k of [...pamet.keys()]) if (k.startsWith('zakazky/')) pamet.delete(k);
  naplnZakazky(20, 2.2 * 1048576);                     // 20 zakázek ~2,2 MB → každá vlastní část
  let zapisu = 0;
  hacky.zapisBin = async (ul, k) => { if (ul === 'zalohy' && k.startsWith('casti/2026-11-20T')) { zapisu++; await new Promise(r => setTimeout(r, 40)); } };
  const klic = '2026-11-20T101010-rucne';
  const v = await Z.porizOtiskKrok(klic, 'vynuceno', ADMIN_EMAIL, { rozpocetMs: 100 });
  const prvni = zapisu;
  test('K9-N6: krok skončí po několika částech (rozpočet 100 ms, zápis 40 ms) — ne po celé dávce 20', v.hotovo === false && prvni >= 1 && prvni <= 5, { prvni, v });
  let w = v, kroku = 1;
  while (!w.hotovo && kroku < 100) { w = await Z.porizOtiskKrok(klic, 'vynuceno', ADMIN_EMAIL, { rozpocetMs: 100, jenPokracovat: true }); kroku++; }
  hacky.zapisBin = null;
  const o = await Z.ctiOtisk(ulz('zalohy'), klic);
  test('K9-N6: otisk po krocích je celý (20 zakázek, žádná nechybí ani se nezdvojila)', w.hotovo && Object.keys(o.zakazky).length === 20
    && Object.values(o.zakazky).every(z => z && /^Zakázka \d+ /.test(z.nazevAkce)), { kroku, zakazek: Object.keys(o.zakazky || {}).length });
  for (const k of [...pamet.keys()]) if (k.startsWith('zakazky/')) pamet.delete(k);
});

/* ---------------- K9-N5: jednorázová obnova velké databáze ---------------- */
await zkus('K9-N5', async () => {
  vycistiZalohy();
  naplnZakazky(60, 60000);
  await Z.porizOtisk('nocni-otisk', '', '2026-11-11');
  const puv = Z.OTISK_ROZPOCET.synchronniMs;
  Z.OTISK_ROZPOCET.synchronniMs = 1;
  hacky.zapisBin = async () => { await new Promise(r => setTimeout(r, 5)); };
  let o;
  try { o = await obnovPost({ zdroj: { otisk: '2026-11-11' }, rezim: 'doplnit', casti: ['firma'], potvrzeni: 'OBNOVIT' }); }
  finally { Z.OTISK_ROZPOCET.synchronniMs = puv; hacky.zapisBin = null; }
  const zbyle = [...pamet.keys()].filter(k => /pred-obnovou/.test(k));
  test('K9-N5: jednorázová obnova, jejíž otisk se nevejde do rozpočtu → 409 obnovaPoFazich', o.status === 409 && o.telo.kod === 'obnovaPoFazich', o);
  test('K9-N5: po odmítnutí nezůstal otisk před obnovou ani jeho části / rozpracovaný stav', zbyle.length === 0, zbyle);
  const male = await obnovPost({ zdroj: { otisk: '2026-11-11' }, rezim: 'doplnit', casti: ['firma'], potvrzeni: 'OBNOVIT' });
  test('K9-N5: s normálním rozpočtem (malá databáze) jednorázová obnova dál projde', male.status === 200 && /pred-obnovou$/.test(male.telo.otiskPred || ''), male.status);
  for (const k of [...pamet.keys()]) if (k.startsWith('zakazky/')) pamet.delete(k);
});

/* ---------------- volba: ruční smazání otisku před obnovou ---------------- */
await zkus('smazat-pred-obnovou', async () => {
  vycistiZalohy();
  vlozOtisk('2026-11-01T101010-pred-obnovou');
  pamet.set('zalohy/' + Z.castKlic('2026-11-01T101010-pred-obnovou', 1), J({}));
  vlozOtisk('2026-11-02T101010-pred-obnovou');
  vlozOtisk('2026-11-02');
  const K = '2026-11-01T101010-pred-obnovou';
  const bez = await vynuceno({ akce: 'smazat-pred-obnovou', klic: K });
  test('smazat-pred-obnovou: bez hesla 401 a nic se nesmaže', bez.status === 401 && pamet.has('zalohy/' + K));
  const spatne = await ticho(() => vynuceno({ akce: 'smazat-pred-obnovou', klic: K, hesloSpravce: 'Spatne.Heslo.1' }));
  test('smazat-pred-obnovou: špatné heslo 401 a nic se nesmaže', spatne.status === 401 && pamet.has('zalohy/' + K));
  const nocni = await vynuceno({ akce: 'smazat-pred-obnovou', klic: '2026-11-02', hesloSpravce: HESLO });
  const vynuc = await vynuceno({ akce: 'smazat-pred-obnovou', klic: '2026-11-02T101010-rucne', hesloSpravce: HESLO });
  test('smazat-pred-obnovou: noční ani vynucený otisk tudy smazat nejde (400)', nocni.status === 400 && vynuc.status === 400 && pamet.has('zalohy/2026-11-02'));
  const neni = await vynuceno({ akce: 'smazat-pred-obnovou', klic: '2026-11-03T101010-pred-obnovou', hesloSpravce: HESLO });
  test('smazat-pred-obnovou: neexistující otisk 404', neni.status === 404);
  const primo = await Z.smazatPredObnovou('2026-11-02'), primo2 = await Z.smazatPredObnovou('2026-11-02T101010-rucne');
  test('smazat-pred-obnovou: knihovna sama odmítne jiný než otisk před obnovou (400, nic nesmaže)', primo.kod === 400 && primo2.kod === 400
    && pamet.has('zalohy/2026-11-02'), { primo, primo2 });
  pamet.set('zalohy/obnova-' + 'a'.repeat(32), J({ id: 'a'.repeat(32), kdo: ADMIN_EMAIL, zacatek: new Date().toISOString(), naposled: new Date().toISOString() }));
  const bezi = await vynuceno({ akce: 'smazat-pred-obnovou', klic: K, hesloSpravce: HESLO });
  pamet.delete('zalohy/obnova-' + 'a'.repeat(32));
  test('smazat-pred-obnovou: během obnovy 409 a nic se nesmaže', bezi.status === 409 && pamet.has('zalohy/' + K));
  const druhy = await vynuceno({ akce: 'smazat-pred-obnovou', klic: K, hesloSpravce: HESLO2 }, cookie2);
  test('smazat-pred-obnovou: správce se svým heslem otisk smaže i se souhrnem a částmi; ostatní zůstanou', druhy.status === 200
    && ![...pamet.keys()].some(k => k.includes(K)) && pamet.has('zalohy/2026-11-02T101010-pred-obnovou') && pamet.has('zalohy/2026-11-02')
    && druhy.telo.casti === 2 && Array.isArray(druhy.telo.otisky), druhy);
  test('smazat-pred-obnovou: retence otisky před obnovou dál nevybírá nikdy', Z.retenceVyber(['2020-01-01T101010-pred-obnovou', '2026-11-02'], '2030-01-01').length === 0);
});

/* ---------------- T1 #528: přeživší mutace úplného běhu Testy #198 ----------------
 * Po O-K9 je hlídaly jiné pojistky, takže je stávající scénáře přestaly
 * rozlišovat (ne rychlost stroje — přežily lokálně i v Actions):
 *  - „noční funkce otisk dne pořizuje znovu": od K9-N3 krok hotový otisk sám
 *    nepřepíše; rozdíl je jen u hotového otisku se ZBYLÝM stavem
 *    (smazání stavu po zápisu manifestu selhalo nebo funkci ukončil limit).
 *  - „krok otisku bez časového rozpočtu": od K9-N6 se rozpočet hlídá i po
 *    každé části a velká data v test_zalohy_objem končí krok tam; kontrolu
 *    po dávce čtení rozliší jen malé záznamy (žádná část neplná).
 *  - „K4-N13 potvrzení bez kontroly varování": od O-K9 potvrzené varování
 *    odmítne i porovnání `stejne` (!potvrzeno); retenceDrzena navíc odmítá
 *    záznam, který není objekt (poškozený). */
await zkus('T1 #528 noční', async () => {
  vycistiZalohy();
  for (const k of [...pamet.keys()]) if (k.startsWith('zakazky/')) pamet.delete(k);
  naplnZakazky(3, 1000);
  /* simulované hodiny: noc dneška 2:00 UTC, běhy po 15 min (den se nezmění ani kolem půlnoci) */
  const p = Date.now, den = Z.denDnes(), stav = 'zalohy/' + Z.OTISK_ROZPRACOVANY + den;
  let cas = Date.parse(den + 'T02:00:00.000Z');
  Date.now = () => cas;
  const beh = () => ticho(async () => (await nocniModul.default()).json());
  try {
    /* smazání stavu po dokončení selže (krok ho jen přejde — uklidí úklid po 24 h) */
    hacky.smaz = async (ul, k) => { if (ul === 'zalohy' && k === Z.OTISK_ROZPRACOVANY + den) throw new Error('simulovaný výpadek mazání'); };
    let prvni;
    try { prvni = await beh(); } finally { hacky.smaz = null; }
    const m = pamet.get('zalohy/' + den), s = pamet.get('zalohy/' + Z.souhrnKlic(den));
    test('T1 #528: první noční běh otisk dokončí, stav po něm zůstal (simulace)', prvni.ok && prvni.hotovo === true && !!m && pamet.has(stav), prvni);
    pamet.delete('zalohy/nocni-dokonceno');          // dokončení dne ještě neproběhlo (retence spadla, Run now)
    cas += 15 * 60000;                                 // další běh v okně (zámek kroku mezitím vypršel)
    const druhy = await beh();
    test('T1 #528: další běh v nočním okně hotový otisk dne nepořizuje znovu (manifest i souhrn beze změny)',
      druhy.ok && pamet.get('zalohy/' + den) === m && pamet.get('zalohy/' + Z.souhrnKlic(den)) === s && druhy.kroku === undefined, druhy);
    test('T1 #528: … a dokončení dne (retence) proběhne nad hotovým otiskem', !!druhy.retence
      && JSON.parse(pamet.get('zalohy/nocni-dokonceno') || '{}').den === den, druhy);
    /* bez hotového otisku retence neběží: rozpracovaný otisk (rozpočet vyčerpaný) */
    vycistiZalohy();
    const puv = Z.OTISK_ROZPOCET.nocniMs;
    hacky.cti = async (ul) => { if (ul === 'zakazky') cas += 1000; };
    Z.OTISK_ROZPOCET.nocniMs = 500;
    let r;
    try { r = await beh(); } finally { hacky.cti = null; Z.OTISK_ROZPOCET.nocniMs = puv; }
    test('T1 #528: rozpracovaný noční otisk — retence ani úklid neběží, den se neuzavře', r.ok && r.hotovo === false && !r.retence
      && !pamet.has('zalohy/' + den) && !pamet.has('zalohy/nocni-dokonceno'), r);
  } finally { Date.now = p; hacky.smaz = null; hacky.cti = null; }
  vycistiZalohy();
});

await zkus('T1 #528 rozpočet po dávce', async () => {
  for (const k of [...pamet.keys()]) if (k.startsWith('zakazky/')) pamet.delete(k);
  naplnZakazky(45, 2000);                              // 3 dávky čtení (po 20), dohromady ~100 kB — žádná část se nenaplní
  const klic = '2026-11-25T101010-rucne';
  /* simulované hodiny: každé čtení zakázky „trvá" 100 ms → první dávka 2 s */
  const p = Date.now; let posun = 0;
  Date.now = () => p.call(Date) + posun;
  hacky.cti = async (ul) => { if (ul === 'zakazky') posun += 100; };
  let v, st, w, kroku = 1;
  try {
    v = await Z.porizOtiskKrok(klic, 'vynuceno', ADMIN_EMAIL, { rozpocetMs: 1000 });
    st = JSON.parse(pamet.get('zalohy/' + Z.OTISK_ROZPRACOVANY + klic) || 'null');
    w = v;
    while (!w.hotovo && kroku < 50) { w = await Z.porizOtiskKrok(klic, 'vynuceno', ADMIN_EMAIL, { rozpocetMs: 1000, jenPokracovat: true }); kroku++; }
  } finally { Date.now = p; hacky.cti = null; }
  test('T1 #528: krok skončí po první dávce čtení, když vyčerpá rozpočet (bez plné části)', v.hotovo === false && !!st
    && st.pos && st.pos.j === 20 && st.casti === 1, { v, pos: st && st.pos, casti: st && st.casti });
  const o = await Z.ctiOtisk(ulz('zalohy'), klic);
  test('T1 #528: další kroky navážou po dávkách a otisk je celý (45 zakázek)', w.hotovo && kroku >= 3
    && Object.keys(o.zakazky).length === 45, { kroku, zakazek: Object.keys((o && o.zakazky) || {}).length });
  for (const k of [...pamet.keys()]) if (k.startsWith('zakazky/')) pamet.delete(k);
  vycistiZalohy();
});

await zkus('T1 #528 potvrzení', async () => {
  vycistiZalohy();
  const potvrzene = { kdy: '2026-11-19T02:30:00.000Z', den: '2026-11-19', zdroj: 'nocni', text: 'zakázek 800 → 400',
    potvrzeno: { kdy: '2026-11-19T08:00:00.000Z', kdo: ADMIN_EMAIL } };
  for (const [popis, zaznam, den] of [['poškozený záznam (text)', 'poškozený záznam', ''], ['poškozený záznam (true)', true, ''],
    ['poškozený záznam (číslo)', 7, ''], ['už potvrzené varování', potvrzene, '2026-11-19']]) {
    pamet.set('zalohy/' + Z.RETENCE_VAROVANI_KLIC, J(zaznam));
    const pred = pamet.get('zalohy/' + Z.RETENCE_VAROVANI_KLIC);
    const r = await vynuceno({ akce: 'retence-potvrdit', den, hesloSpravce: HESLO });
    test('T1 #528: potvrzení bez platného nepotvrzeného varování — ' + popis + ' → 409, záznam ani čas potvrzení se nepřepíše',
      r.status === 409 && /Není co potvrdit/.test(r.telo.chyba || '') && pamet.get('zalohy/' + Z.RETENCE_VAROVANI_KLIC) === pred
      && !pamet.has('zalohy/' + Z.RETENCE_ZAKLAD_KLIC), r);
  }
  vycistiZalohy();
});

/* ---------------- volba: zaloha_nocni nejde zavolat přes URL ---------------- */
await zkus('zaloha_nocni bez cesty', async () => {
  const cfg = nocniModul.config || {};
  test('zaloha_nocni: plánovaná funkce (schedule) bez `path` — Netlify ji přes URL nespouští', typeof cfg.schedule === 'string' && !!cfg.schedule
    && !('path' in cfg) && J(Object.keys(cfg)) === J(['schedule']), cfg);
  const toml = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');
  const presm = ['dist/_redirects', 'src/_redirects', '_redirects'].map(p => new URL('../' + p, import.meta.url)).filter(u => existsSync(u))
    .map(u => readFileSync(u, 'utf8')).join('\n');
  test('zaloha_nocni: žádné přesměrování na funkci (netlify.toml, _redirects)', !/zaloha_nocni/.test(toml) && !/zaloha_nocni/.test(presm)
    && !/\[\[redirects\]\][\s\S]*\.netlify\/functions/.test(toml));
  const fns = ['zaloha.mjs', 'zaloha_vynuceno.mjs', 'obnova.mjs'].map(f => readFileSync(new URL('./functions/' + f, import.meta.url), 'utf8')).join('\n');
  test('zaloha_nocni: žádná obyčejná funkce ji neimportuje (noční běh jen z plánu)', !/zaloha_nocni/.test(fns.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
  test('zaloha_nocni: obsluha nečte požadavek (žádný vstup zvenku)', nocniModul.default.length === 0);
});

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
