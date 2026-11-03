/* ============================================================
 * #554 DK (J. V. 3. 11. 2026) — samočinná kopie zálohy na Disk každý den.
 *
 * Po přihlášení správce HESLEM se kopie pořídí sama, když v Netlify leží
 * noční otisk novější než ten v poslední kopii tohoto prostředí
 * (uloKopieDiskStav → potreba). Heslo se bere z právě proběhlého přihlášení
 * (onlinePrihlas → onlinePoPrihlaseni → onlineZalohaAuto →
 * onlineKopieDiskAuto), nikam se neukládá a dialog se neotevírá (K4-N15).
 * Obnovené sezení (F5) heslo nemá → jen připomínka. Bez vybrané složky nebo
 * bez uděleného práva zápisu se nic nevnucuje.
 *
 * Úseky src/ui/online_ui.js se spustí ve vm s náhradami (vzor
 * test_o7_kopie_klient.js). Pojistka: na 1bf1a3a (v2.11.9) padá 10 kontrol
 * (automatika jen připomínala a heslo z přihlášení nedostala); po opravě
 * vše zelené. Spuštění: node src/test_554_kopie_denne.js
 * ============================================================ */
const fs = require('fs');
const vm = require('vm');
const U = require('./uloziste.js');
const zdroj = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
const usek = (od, po) => { const a = zdroj.indexOf(od), b = zdroj.indexOf(po, a + 1); return a > 0 && b > a ? zdroj.slice(a, b) : ''; };
const autoKopie = usek('async function onlineKopieDiskAuto(', '/* Odlití kopie na Disk Google.');
const autoZaloha = usek('function onlineZalohaAuto(', '/* DOPOŘÍZENÍ OTISKU PO KROCÍCH');
const prihlas = usek('function onlinePrihlas(', '/* Po přihlášení se aplikace srovná');
const poPrihlaseni = usek('function onlinePoPrihlaseni(', '/* SLEVY ZE SERVERU');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
test('úseky online_ui.js nalezeny', !!autoKopie && !!autoZaloha && !!prihlas && !!poPrihlaseni);

const HESLO = 'Heslo.Spravce.554';
const ted = Date.now();
const den = (d) => new Date(ted - d * 86400000).toISOString().slice(0, 10);
const noc = (d) => ({ den: den(d), zdroj: 'nocni-otisk', porizena: den(d) + 'T01:00:00Z' });
/* poslední kopie tohoto prostředí je z včerejšího otisku */
const kopieVcera = { kdy: new Date(ted - 18 * 3600000).toISOString(), soubor: 'otisk_main_' + den(1) + '_0200.json.gz', otisk: den(1), prostredi: 'main' };

const novyCtx = (o) => {
  const ctx = { Promise, JSON, String, Error, Date, Object, Array, Math,
    zpravy: [], provedeno: [], dotazu: 0,
    ULO_KOPIE_DISK_SLOZKA: U.ULO_KOPIE_DISK_SLOZKA, uloKopieDiskStav: U.uloKopieDiskStav,
    ONLINE_STAV: { otisky: o.otisky, kopieDisk: o.kopie, prostrediZalohy: 'main' },
    jeAdminOnline: () => true,
    kopieDiskSlozka: async () => (o.slozka === false ? null : { name: U.ULO_KOPIE_DISK_SLOZKA }),
    uloPravo: async (h, tiche) => { ctx.tiche = tiche; return o.pravo !== false; },
    dotazHeslo: async () => { ctx.dotazu++; return HESLO; },
    kopieDiskProved: async (h, heslo) => {
      ctx.provedeno.push(heslo);
      if (o.chyba) throw new Error(o.chyba);
      return { soubor: 'otisk_main_' + den(0) + '_0200.json.gz', velikostB: 2048, uklid: { smazano: [], chyby: [] } };
    },
    kopieDiskVelikost: (b) => b + ' B', kopieDiskUklidText: () => ' Starší kopie na Disku: nic ke smazání.',
    onlineZprava: (t, typ) => { ctx.zpravy.push([String(t), typ || '']); },
  };
  vm.createContext(ctx);
  vm.runInContext(autoKopie + '\nthis.auto = onlineKopieDiskAuto;', ctx);
  return ctx;
};

(async () => {
  /* ---- nový noční otisk + heslo z přihlášení → kopie sama ---- */
  {
    const ctx = novyCtx({ otisky: [noc(0), noc(1)], kopie: kopieVcera });
    const v = await ctx.auto(HESLO);
    test('#554: nový noční otisk a heslo z přihlášení → kopie se pořídí sama', v === true && ctx.provedeno.length === 1, ctx.provedeno);
    test('#554: kopie dostane heslo z přihlášení, žádný dialog', ctx.provedeno[0] === HESLO && ctx.dotazu === 0);
    test('#554: o právo zápisu se nežádá (jen tichý dotaz)', ctx.tiche === true);
    test('#554: hláška o samočinné kopii jmenuje soubor', ctx.zpravy.some(([t, typ]) => /Denní kopie zálohy se sama uložila na Disk: _Zaloha Netlify DB\/otisk_main_/.test(t) && typ === ''), ctx.zpravy);
    test('#554: heslo se neuloží do stavu aplikace', !JSON.stringify(ctx.ONLINE_STAV).includes(HESLO));
  }
  /* ---- bez nového nočního otisku → nic ---- */
  {
    const ctx = novyCtx({ otisky: [noc(1), noc(2)], kopie: kopieVcera });
    const v = await ctx.auto(HESLO);
    test('#554: bez nového nočního otisku se nekopíruje ani nepřipomíná', v === false && ctx.provedeno.length === 0 && ctx.zpravy.length === 0, ctx.zpravy);
  }
  /* ---- obnovené sezení (bez hesla) → jen připomínka ---- */
  {
    const ctx = novyCtx({ otisky: [noc(0), noc(1)], kopie: kopieVcera });
    const v = await ctx.auto(undefined);
    test('#554: bez hesla (F5) se nekopíruje a dialog se neotevře', v === false && ctx.provedeno.length === 0 && ctx.dotazu === 0);
    test('#554: bez hesla připomene denní kopii tlačítkem', ctx.zpravy.some(([t]) => /Denní kopie zálohy na Disk čeká/.test(t) && /Zkopírovat zálohu na Disk teď/.test(t)), ctx.zpravy);
  }
  /* ---- bez složky / bez práva → nic se nevnucuje ---- */
  {
    const a = novyCtx({ otisky: [noc(0)], kopie: kopieVcera, slozka: false });
    const b = novyCtx({ otisky: [noc(0)], kopie: kopieVcera, pravo: false });
    await a.auto(HESLO); await b.auto(HESLO);
    test('#554: bez vybrané složky nic (ani kopie, ani dialog)', a.provedeno.length === 0 && a.zpravy.length === 0 && a.dotazu === 0);
    test('#554: bez práva zápisu nic', b.provedeno.length === 0 && b.zpravy.length === 0);
  }
  /* ---- cizí prostředí v záznamu → kopírovat ---- */
  {
    const ctx = novyCtx({ otisky: [noc(0)], kopie: Object.assign({}, kopieVcera, { otisk: den(0), prostredi: 'test' }) });
    await ctx.auto(HESLO);
    test('#554: záznam kopie cizího prostředí → vlastní kopie se pořídí', ctx.provedeno.length === 1);
  }
  /* ---- selhání kopie se ohlásí, přihlášení nespadne ---- */
  {
    const ctx = novyCtx({ otisky: [noc(0)], kopie: kopieVcera, chyba: 'server kopii nepřijal' });
    let v, chyba = null;
    try { v = await ctx.auto(HESLO); } catch (e) { chyba = e; }
    test('#554: selhání kopie → varování s tlačítkem, bez výjimky', chyba === null && v === false
      && ctx.zpravy.some(([t, typ]) => /nepodařilo pořídit: server kopii nepřijal/.test(t) && typ === 'varovani'), ctx.zpravy);
  }
  /* ---- heslo putuje z přihlášení až do automatiky ---- */
  test('#554: onlinePrihlas předá heslo onlinePoPrihlaseni', /onlinePoPrihlaseni\(o, heslo\)/.test(prihlas));
  test('#554: onlinePoPrihlaseni předá heslo automatice zálohy', /onlineZalohaAuto\(hesloPrihlaseni\)/.test(poPrihlaseni));
  test('#554: onlineZalohaAuto předá heslo kopii na Disk', /onlineKopieDiskAuto\(hesloPrihlaseni\)/.test(autoZaloha));
  test('#554: heslo se neukládá do ONLINE_STAV', !/ONLINE_STAV\.\w+\s*=\s*hesloPrihlaseni|ONLINE_STAV\.\w+\s*=\s*heslo\b/.test(prihlas + poPrihlaseni + autoZaloha + autoKopie));
  console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka', e && e.stack); process.exit(1); });
