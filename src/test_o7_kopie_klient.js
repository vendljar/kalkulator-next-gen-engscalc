/* ============================================================
 * O7 — klient kopie záloh na Disk a automatické zálohy (rozhodnutí J. V.
 * 20. 10. 2026, audit K3)
 *
 *   K3-N1  kopie jen do složky „_Zaloha Netlify DB" (jiná složka: nic se
 *          nezapíše a výběr se zapomene) a záznam jen s heslem správce
 *          (zrušený dialog: nic se nestahuje ani nezapisuje);
 *   K3-N4  automatická záloha po přihlášení limit serveru (429) nehlásí;
 *   K3-N13 varování pojistky retence jde do hlášení po přihlášení.
 *
 * Soubory src/ui/ se v Node nenačítají celé — vyříznou se úseky
 * onlineZalohaAuto a kopie na Disk a spustí ve vm s náhradami (vzor
 * test_zobrazeni_heslo_okno.js). Prohlížečem totéž ověřuje overit_online.mjs.
 *
 * Pojistka: s online_ui.js a uloziste.js z v20.10.1 padá 9 kontrol a test pak
 * spadne na chybějící uloRetenceVarovani; po opravě 16 / 0.
 * ============================================================ */
const fs = require('fs');
const vm = require('vm');
const U = require('./uloziste.js');
const zdroj = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
const usek = (od, po) => { const a = zdroj.indexOf(od), b = zdroj.indexOf(po, a + 1); return a > 0 && b > a ? zdroj.slice(a, b) : ''; };
const auto = usek('function onlineZalohaAuto()', '/* ---------- KOPIE ZÁLOH NA DISK');
const kopie = usek('const KOPIE_DISK = ', 'function kopieDiskVelikost');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
test('úseky online_ui.js nalezeny', !!auto && !!kopie);

const novyCtx = () => {
  const ctx = { Promise, JSON, String, Error, Date, TextEncoder, Object, Array, Math, Uint8Array,
    volani: [], zpravy: [], dotazu: 0, heslo: 'Heslo.Spravce.1', zapsano: {},
    ULO_KOPIE_DISK_SLOZKA: U.ULO_KOPIE_DISK_SLOZKA, uloKopieDiskJmeno: U.uloKopieDiskJmeno,
    uloKopieDiskStav: U.uloKopieDiskStav, uloZalohaHlidka: U.uloZalohaHlidka, uloRetenceVarovani: U.uloRetenceVarovani,
    ONLINE_STAV: { otisky: [], kopieDisk: null, retenceVarovani: null },
    jeAdminOnline: () => true, render: () => {}, uloPravo: async () => true,
    onlineZprava: (t, typ) => { ctx.zpravy.push([String(t), typ || '']); },
    onlinePocetText: n => n + ' zakázek',
    onlineZalohaDoSlozkyAuto: () => Promise.resolve(false),
    onlineKopieDiskAuto: () => Promise.resolve(false),
    onlineOtiskyNacti: () => Promise.resolve(true),
    dotazHeslo: () => { ctx.dotazu++; return Promise.resolve(ctx.heslo); },
    uloDb: () => Promise.reject(new Error('bez IndexedDB')),
    crypto: { subtle: { digest: async () => new Uint8Array(32).buffer } },
  };
  ctx.onlineApi = async (cesta, telo) => {
    ctx.volani.push([cesta, telo]);
    if (ctx.odpoved) return ctx.odpoved(cesta, telo);
    if (cesta === '/api/zaloha?zdroj=nocni') return { ok: true, zaloha: { zdroj: 'nocni-otisk' }, otisk: '2026-10-19', puvod: 'nocni-otisk' };
    return { ok: true, kopieDisk: { kdy: 'x' } };
  };
  vm.createContext(ctx);
  vm.runInContext(auto + kopie + '\nthis.auto = onlineZalohaAuto; this.proved = kopieDiskProved; this.KD = KOPIE_DISK;', ctx);
  return ctx;
};
const slozka = (ctx, name) => ({ name, getFileHandle: async (jm) => {
  ctx.zapsano[jm] = '';
  return { createWritable: async () => ({ write: async (t) => { ctx.zapsano[jm] += t; }, close: async () => {} }),
    getFile: async () => ({ size: new TextEncoder().encode(ctx.zapsano[jm]).length }) };
} });

(async () => {
  /* ---- K3-N1: složka ---- */
  {
    const ctx = novyCtx();
    const h = slozka(ctx, 'Stažené soubory');
    ctx.KD.slozka = h;
    let chyba = '';
    try { await ctx.proved(h); } catch (e) { chyba = e.message; }
    test('K3-N1: jiná složka → chyba jmenuje „_Zaloha Netlify DB"', /se nejmenuje „_Zaloha Netlify DB"/.test(chyba), chyba);
    test('K3-N1: jiná složka → nic se nezapíše na Disk ani na server, heslo se neptá',
      Object.keys(ctx.zapsano).length === 0 && ctx.volani.length === 0 && ctx.dotazu === 0, [ctx.zapsano, ctx.volani, ctx.dotazu]);
    test('K3-N1: jiná složka se zapomene (příště se vybírá znovu)', ctx.KD.slozka === null);
  }
  /* ---- K3-N1: heslo ---- */
  {
    const ctx = novyCtx(); ctx.heslo = null;
    let chyba = '';
    try { await ctx.proved(slozka(ctx, '_Zaloha Netlify DB')); } catch (e) { chyba = e.message; }
    test('K3-N1: zrušený dialog hesla → chyba, nic se nestahuje ani nezapisuje',
      /bez vašeho hesla/.test(chyba) && ctx.volani.length === 0 && Object.keys(ctx.zapsano).length === 0 && ctx.dotazu === 1, [chyba, ctx.volani]);
  }
  {
    const ctx = novyCtx();
    const k = await ctx.proved(slozka(ctx, '_Zaloha Netlify DB'));
    const zaznam = ctx.volani.find(v => v[0] === '/api/zaloha_vynuceno');
    test('K3-N1: s heslem se kopie zapíše a záznam jde na server s heslem správce',
      !!k && !!ctx.zapsano['otisk_2026-10-19.json'] && !!zaznam && zaznam[1].akce === 'kopie-disk'
      && zaznam[1].hesloSpravce === 'Heslo.Spravce.1' && zaznam[1].kopie.slozka === '_Zaloha Netlify DB', zaznam);
    test('K3-N1: heslo se ptá jednou a dřív, než se stahuje záloha', ctx.dotazu === 1 && ctx.volani[0][0] === '/api/zaloha?zdroj=nocni');
    test('K3-N1: heslo nejde do souboru na Disku', !JSON.stringify(ctx.zapsano).includes('Heslo.Spravce.1'));
  }
  {
    const ctx = novyCtx();
    await ctx.proved(slozka(ctx, '_Zaloha Netlify DB'), 'Predane.Heslo.2');
    test('K3-N1: předané heslo se použije bez dalšího dialogu', ctx.dotazu === 0
      && ctx.volani.find(v => v[0] === '/api/zaloha_vynuceno')[1].hesloSpravce === 'Predane.Heslo.2');
  }
  /* ---- K4-N15 (O9): posledni_kopie.json až po přijetí záznamu serverem ---- */
  {
    const ctx = novyCtx();
    ctx.odpoved = async (cesta) => {
      if (cesta === '/api/zaloha?zdroj=nocni') return { ok: true, zaloha: { zdroj: 'nocni-otisk' }, otisk: '2026-10-19', puvod: 'nocni-otisk' };
      const e = new Error('Vaše heslo nesouhlasí — akce se neprovedla.'); e.stav = 401; throw e; };
    let chyba = '';
    try { await ctx.proved(slozka(ctx, '_Zaloha Netlify DB')); } catch (e) { chyba = e.message; }
    test('K4-N15: server záznam odmítne (špatné heslo) → posledni_kopie.json se nezapíše',
      /nesouhlasí/.test(chyba) && !('posledni_kopie.json' in ctx.zapsano) && !!ctx.zapsano['otisk_2026-10-19.json'], [chyba, Object.keys(ctx.zapsano)]);
    const ctx2 = novyCtx();
    await ctx2.proved(slozka(ctx2, '_Zaloha Netlify DB'));
    const poradi = ctx2.volani.map(v => v[0]);
    test('K4-N15: s přijatým záznamem posledni_kopie.json vznikne (po odpovědi serveru)',
      !!ctx2.zapsano['posledni_kopie.json'] && poradi[poradi.length - 1] === '/api/zaloha_vynuceno', [poradi, Object.keys(ctx2.zapsano)]);
  }
  /* ---- K3-N4: 429 u automatické zálohy mlčí ---- */
  {
    const ctx = novyCtx();
    ctx.odpoved = async () => { const e = new Error('Zálohu teď pořídit nejde: … Znovu to půjde dnes v 12:30.'); e.stav = 429; throw e; };
    await ctx.auto();
    test('K3-N4: automatická záloha s limitem (429) nic nehlásí', !ctx.zpravy.some(z => /nepodařilo pořídit/.test(z[0])), ctx.zpravy);
    test('K3-N4: (pojistka testu) automatika opravdu posílala', ctx.volani.some(v => v[0] === '/api/zaloha_vynuceno' && v[1].duvod === 'auto'));
  }
  {
    const ctx = novyCtx();
    ctx.odpoved = async () => { const e = new Error('server odpověděl 500'); e.stav = 500; throw e; };
    await ctx.auto();
    test('K3-N4: jiná chyba automatické zálohy se hlásí dál', ctx.zpravy.some(z => /nepodařilo pořídit: server odpověděl 500/.test(z[0])), ctx.zpravy);
  }
  /* ---- K3-N13: varování po přihlášení ---- */
  {
    const ctx = novyCtx();
    ctx.ONLINE_STAV.otisky = [{ den: new Date().toISOString().slice(0, 10), zdroj: 'nocni-otisk', porizena: new Date().toISOString() }];
    ctx.ONLINE_STAV.kopieDisk = { kdy: new Date().toISOString(), soubor: 'otisk_x.json' };
    ctx.ONLINE_STAV.retenceVarovani = { kdy: new Date(Date.now() - 3600000).toISOString(), den: '2026-10-21', predchozi: '2026-10-20',
      pred: { pocetZakazek: 100, pocetUctu: 10 }, nove: { pocetZakazek: 40, pocetUctu: 10 } };
    await ctx.auto();
    test('K3-N13: varování pojistky retence se po přihlášení ohlásí', ctx.zpravy.some(z => /méně než polovinu dat \(zakázek 100 → 40\)/.test(z[0]) && z[1] === 'varovani'), ctx.zpravy);
  }
  /* ---- K3-N13: čistá funkce hlídky ---- */
  {
    const ted = Date.parse('2026-11-10T08:00:00Z');
    const v = { kdy: '2026-11-09T02:00:05Z', den: '2026-11-09', predchozi: '2026-11-08',
      pred: { pocetZakazek: 120, pocetUctu: 12 }, nove: { pocetZakazek: 120, pocetUctu: 3 } };
    const r = U.uloRetenceVarovani(v, ted);
    test('K3-N13: hlídka jmenuje dny a pokles účtů', !!r && /2026-11-09/.test(r.text) && /2026-11-08/.test(r.text) && /účtů 12 → 3/.test(r.text)
      && !/zakázek/.test(r.text), r);
    test('K3-N13: hlídka svítí 30 dní (29 dní ano, 30 ne)', U.ULO_RETENCE_VAROVANI_DNU === 30
      && !!U.uloRetenceVarovani(Object.assign({}, v, { kdy: new Date(ted - 29 * 86400000 - 3600000).toISOString() }), ted)
      && !U.uloRetenceVarovani(Object.assign({}, v, { kdy: new Date(ted - 30 * 86400000).toISOString() }), ted));
    test('K3-N13: bez záznamu nebo s nečitelným časem nic', U.uloRetenceVarovani(null, ted) === null && U.uloRetenceVarovani({ kdy: 'x' }, ted) === null);
  }
  console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
  process.exit(fail ? 1 : 0);
})();
