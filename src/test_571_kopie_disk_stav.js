/* ============================================================
 * #571 DZ (hlášení J. V. 5. 11. 2026) — denní kopie zálohy na Disk se po
 * přihlášení správce na ostrém webu neudělala a nic se neohlásilo.
 *
 * Příčina: právo zápisu ke složce „_Zaloha Netlify DB" prohlížeč po
 * restartu vrací do stavu „prompt"; onlineKopieDiskAuto se jen tiše ptala
 * (uloPravo(h, true)) a mlčky skončila. Oprava: o právo se žádá při
 * kliknutí na „Přihlásit" (kopieDiskPravoPredem, před `await` přihlášení),
 * automatika výsledek převezme, a když kopie nejde, hlásí proč
 * (ONLINE_STAV.kopieDiskCeka + tlačítko).
 *
 * Tady (jádro, vm nad úseky src/ui/online_ui.js):
 *   - starý záznam kopie z doby před ZN/DK (bez prostředí, otisk_<den>.json.gz)
 *     se na ostrém bere jako kopie prostředí main a kopii nebrání;
 *   - onlinePrihlas požádá o právo DŘÍV, než zavolá /api/prihlaseni;
 *   - kopieDiskPravoPredem u stavu „prompt" opravdu žádá, u „granted" ne,
 *     bez složky nic neotevírá a nikdy nevyhodí;
 *   - čekající kopie se poznamená a po úspěšné kopii zhasne;
 *   - souhrnné varování po přihlášení důvod nepřepíše.
 * Prohlížečový průchod: overit_dz_kopie_disk.mjs.
 *
 * Pojistka: na 000924e (v4.11.8) padá (přihlášení o právo nežádá, pak
 * výjimka — kopieDiskPravoPredem neexistuje); po opravě 20 / 0.
 * Spuštění: node src/test_571_kopie_disk_stav.js
 * ============================================================ */
const fs = require('fs');
const vm = require('vm');
const U = require('./uloziste.js');
const zdroj = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
const usek = (od, po) => { const a = zdroj.indexOf(od), b = zdroj.indexOf(po, a + 1); return a > 0 && b > a ? zdroj.slice(a, b) : ''; };

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const ted = Date.parse('2026-11-05T09:30:00Z');
const otisky = [{ den: '2026-11-05', zdroj: 'nocni-otisk', porizena: '2026-11-05T02:00:31Z' },
  { den: '2026-11-04', zdroj: 'nocni-otisk', porizena: '2026-11-04T02:00:12Z' }];
/* záznam kopie z 2. 11. (před ZN #552 / DK #554): bez prostředí, starý tvar jména */
const stary = { kdy: '2026-11-02T10:42:41.000Z', soubor: 'otisk_2026-11-02.json.gz', otisk: '2026-11-02', puvod: 'nocni-otisk',
  velikostB: 4096, sha256: 'a'.repeat(64), slozka: '_Zaloha Netlify DB', potvrzeno: 'heslo-spravce' };

/* ---- jádro: uloKopieDiskStav se starým záznamem ---- */
{
  const s = U.uloKopieDiskStav(stary, ted, 'main', otisky);
  test('#571: starý záznam bez prostředí na ostrém = kopie prostředí main (ne „zatím žádná")',
    /Poslední kopie záloh na Disku Google \(prostředí main\)/.test(s.text) && s.dnu === 2, s);
  test('#571: starý záznam kopii nebrání — noční otisk 5. 11. je novější než otisk 2. 11. → potreba',
    s.potreba === true && s.nocni === '2026-11-05', s);
  test('#571: starý záznam bez dne otisku (aktuální stav) → porovná se časem, potreba',
    U.uloKopieDiskStav(Object.assign({}, stary, { otisk: null, puvod: 'aktualni-stav' }), ted, 'main', otisky).potreba === true);
  test('#571: na testovacím webu starý záznam taky platí (psal ho jen ten web)',
    U.uloKopieDiskStav(stary, ted, 'test', otisky).potreba === true
    && /prostředí test/.test(U.uloKopieDiskStav(stary, ted, 'test', otisky).text));
  test('#571: záznam testu na ostrém se nebere (cizí prostředí → žádná kopie, potreba)',
    /zatím žádná/.test(U.uloKopieDiskStav(Object.assign({}, stary, { prostredi: 'test' }), ted, 'main', otisky).text));
  const dnes = Object.assign({}, stary, { kdy: '2026-11-05T08:00:00Z', otisk: '2026-11-05', prostredi: 'main', soubor: 'otisk_main_2026-11-05_0300.json.gz' });
  test('#571: kopie dnešního otisku už je → nekopírovat', U.uloKopieDiskStav(dnes, ted, 'main', otisky).potreba === false);
}

/* ---- přihlášení požádá o právo ve stejném gestu, před /api/prihlaseni ---- */
const prihlas = usek('function onlinePrihlas(', '/* Po přihlášení se aplikace srovná');
{
  const poradi = [];
  const ctx = { Promise, String, ONLINE_STAV: { formEmail: 'spravce@priklad.cz', formHeslo: 'Heslo.571' },
    render: () => {}, onlineZprava: () => {},
    kopieDiskPravoPredem: () => { poradi.push('pravo'); return Promise.resolve('granted'); },
    onlineApi: () => { poradi.push('api'); return Promise.resolve({ email: 'spravce@priklad.cz' }); },
    onlinePoPrihlaseni: () => Promise.resolve() };
  vm.createContext(ctx);
  vm.runInContext(prihlas + '\nthis.f = onlinePrihlas;', ctx);
  ctx.f();
  test('#571: onlinePrihlas požádá o právo synchronně, ještě před /api/prihlaseni', poradi.join(',') === 'pravo,api', poradi);
  const ctx2 = Object.assign({}, ctx, { ONLINE_STAV: { formEmail: '', formHeslo: '' } });
  poradi.length = 0; vm.createContext(ctx2); vm.runInContext(prihlas + '\nthis.f = onlinePrihlas;', ctx2); ctx2.f();
  test('#571: bez e-mailu a hesla se o právo nežádá', poradi.length === 0, poradi);
}

/* ---- kopieDiskPravoPredem, kopieDiskCeka, onlineKopieDiskAuto ---- */
const auto = usek('async function onlineKopieDiskAuto(', '/* Odlití kopie na Disk Google.');
const novyCtx = (o) => {
  const ctx = { Promise, String, Error, Date, Object, zadosti: 0, dotazy: 0, zpravy: [],
    ULO_KOPIE_DISK_SLOZKA: U.ULO_KOPIE_DISK_SLOZKA, uloKopieDiskStav: U.uloKopieDiskStav,
    ONLINE_STAV: { otisky, kopieDisk: stary, prostrediZalohy: 'main', kopieDiskCeka: o.ceka || null },
    KOPIE_DISK: { pravoPredem: null }, jeAdminOnline: () => true,
    kopieDiskSlozka: async () => {
      if (o.slozkaChyba) throw new Error('IndexedDB nejde');
      return o.slozka === false ? null : { name: U.ULO_KOPIE_DISK_SLOZKA,
        queryPermission: async () => { ctx.dotazy++; return ctx.stav; },
        requestPermission: async () => { ctx.zadosti++; ctx.stav = o.odpoved || 'granted'; return ctx.stav; } };
    },
    stav: o.stav || 'granted',
    kopieDiskProved: async () => ({ soubor: 'otisk_main_2026-11-05_0300.json.gz', velikostB: 2048, uklid: null }),
    kopieDiskVelikost: (b) => b + ' B', kopieDiskUklidText: () => '',
    kopieDiskSonda: async () => 'ok', kopieDiskZapomen: () => {},   // #574: složka na místě (sondu hlídá test_574)
    onlineZprava: (t, typ) => { ctx.zpravy.push([String(t), typ || '']); } };
  vm.createContext(ctx);
  vm.runInContext(auto + '\nthis.auto = onlineKopieDiskAuto; this.predem = kopieDiskPravoPredem;', ctx);
  return ctx;
};
(async () => {
  {
    const c = novyCtx({ stav: 'prompt', odpoved: 'granted' });
    const p = c.predem();
    test('#571: kopieDiskPravoPredem uloží slib do KOPIE_DISK.pravoPredem', c.KOPIE_DISK.pravoPredem === p);
    test('#571: u stavu „prompt" požádá o právo a vrátí výsledek', (await p) === 'granted' && c.zadosti === 1, c.zadosti);
    test('#571: automatika výsledek žádosti převezme a kopii pořídí', (await c.auto('Heslo.571')) === true && c.zadosti === 1);
    test('#571: po převzetí se žádost předem zahodí (příště se neplete)', c.KOPIE_DISK.pravoPredem === null);
  }
  {
    const c = novyCtx({ stav: 'granted' });
    test('#571: u stavu „granted" se o právo nežádá', (await c.predem()) === 'granted' && c.zadosti === 0);
    const d = novyCtx({ slozka: false });
    test('#571: bez složky se nic neotevírá (prázdný stav, žádná žádost)', (await d.predem()) === '' && d.zadosti === 0);
    const e = novyCtx({ slozkaChyba: true });
    let chyba = null; let v;
    try { v = await e.predem(); } catch (x) { chyba = x; }
    test('#571: žádost předem nikdy nevyhodí (chyba IndexedDB → prázdný stav)', chyba === null && v === '', String(chyba));
  }
  {
    const c = novyCtx({ slozka: false });
    await c.auto('Heslo.571');
    test('#571: čekající kopie se poznamená s důvodem (pro tlačítko v liště a v Nastavení)',
      !!c.ONLINE_STAV.kopieDiskCeka && c.ONLINE_STAV.kopieDiskCeka.duvod === 'slozka'
      && /není vybraná složka/.test(c.ONLINE_STAV.kopieDiskCeka.text), c.ONLINE_STAV.kopieDiskCeka);
    const d = novyCtx({ stav: 'prompt' });
    await d.auto('Heslo.571');
    test('#571: bez práva (bez žádosti předem) → důvod „pravo", automatika sama nežádá',
      d.ONLINE_STAV.kopieDiskCeka && d.ONLINE_STAV.kopieDiskCeka.duvod === 'pravo' && d.zadosti === 0, d.ONLINE_STAV.kopieDiskCeka);
    const e = novyCtx({ stav: 'granted' });
    await e.auto(undefined);
    test('#571: bez hesla → důvod „heslo"', e.ONLINE_STAV.kopieDiskCeka && e.ONLINE_STAV.kopieDiskCeka.duvod === 'heslo');
    const f = novyCtx({ stav: 'granted', ceka: { duvod: 'pravo', text: 'staré' } });
    await f.auto('Heslo.571');
    test('#571: po úspěšné kopii výzva zhasne', f.ONLINE_STAV.kopieDiskCeka === null);
  }
  /* ---- souhrnné varování po přihlášení důvod nepřepíše ---- */
  {
    const zaloha = usek('function onlineZalohaAuto(', '/* DOPOŘÍZENÍ OTISKU PO KROCÍCH');
    const zpravy = [];
    const ctx = { Promise, String, Date, Array,
      ONLINE_STAV: { otisky: [{ den: new Date().toISOString().slice(0, 10), zdroj: 'nocni-otisk' }], rozpracovane: [] },
      jeAdminOnline: () => true, onlineOtiskyNacti: () => Promise.resolve(true),
      onlineZalohaDoSlozkyAuto: () => Promise.resolve(false),
      onlineKopieDiskAuto: async () => { ctx.ONLINE_STAV.kopieDiskCeka = { duvod: 'pravo', text: 'DŮVOD-KOPIE' }; zpravy.push('DŮVOD-KOPIE'); return false; },
      uloZalohaHlidka: () => ({ stara: true, text: 'HLÍDKA-NOČNÍ' }), uloKopieDiskStav: () => ({ stara: true, text: 'HLÍDKA-KOPIE' }),
      uloRetenceVarovani: () => null, render: () => {},
      onlineZprava: (t) => { zpravy.push(String(t)); } };
    vm.createContext(ctx);
    vm.runInContext(zaloha + '\nthis.f = onlineZalohaAuto;', ctx);
    await ctx.f('Heslo.571');
    const posledni = zpravy[zpravy.length - 1] || '';
    test('#571: souhrnné varování po přihlášení nese důvod, proč se kopie nepořídila',
      /DŮVOD-KOPIE/.test(posledni) && /HLÍDKA-NOČNÍ/.test(posledni), zpravy);
  }
  console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka', e && e.stack); process.exit(1); });
