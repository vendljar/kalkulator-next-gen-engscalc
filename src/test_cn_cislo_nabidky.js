/* CN #727 (J. V. 23. 11. 2026) — číslo nabídky v hlavičce otevřené zakázky.
 *
 * Hlídá:
 *   1. model cnTvarCisla / cnZmenaPosud (src/cislo_nabidky.js): tvar čísla,
 *      pořadí pravidel (hledat → duplicita → potvrdit → provést);
 *   2. dialogy cnZmenaUI (src/ui/cislo_nabidky_ui.js) nad zástupným set():
 *      bod 1 ANO změní / NE vrátí původní; bod 2 „Vyhledat zakázku“ otevře
 *      Načíst zakázku s textem v hledání, „Je to číslo nabídky“ pokračuje;
 *      bod 3 duplicita z rejstříku neprojde; nová zakázka se neptá;
 *   3. set() v ui/common.js volá cnZmenaUI před pravidlem A3 a sestavení
 *      (build.py) oba soubory obsahuje;
 *   4. protokol: změna čísla se zapíše „Číslo nabídky: X → Y“ i při uložení
 *      dřív, než uplyne klid PROTOKOL_KLID (protokolZapisTed), a každá cesta
 *      uložení (online, soubor, složka) ho volá před zápisem;
 *   5. hledání: okno Zakázky online i Přehled cenových nabídek ukazují
 *      nápovědu, že jde hledat i podle akce, adresy, zákazníka a obchodníka.
 * Bod 5 zámku (prodaná nabídka) hlídá netlify/test_cn_cislo_nabidky.mjs.
 *
 * Pojistka: před opravou sada padá (src/cislo_nabidky.js ani
 * ui/cislo_nabidky_ui.js neexistují, set() se na nic neptá, nápověda chybí).
 *
 * Spuštění: cd src && node test_cn_cislo_nabidky.js */
const fs = require('fs');
const vm = require('vm');
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 600)); } };
const cti = (f) => { try { return fs.readFileSync(__dirname + '/' + f, 'utf8'); } catch (e) { return ''; } };

test('src/cislo_nabidky.js existuje', !!cti('cislo_nabidky.js'));
test('src/ui/cislo_nabidky_ui.js existuje', !!cti('ui/cislo_nabidky_ui.js'));
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const ZK = require('./zakazka.js');
const CN = require('./cislo_nabidky.js');

/* ---- 1) model ---- */
[['2026 - OPR - CN - 555', true], ['2026 - OVP - CN - 404', true], ['2026 - OPR - CN - 0500.2', true],
 ['2026 - OPR - CN - 9940-B', true], ['555', true], ['2026-OPR-CN-9001', true], ['  2026 - OPR - CN - 7 ', true],
 ['Vinohradská', false], ['Novák', false], ['Bytový dům Praha 5', false], ['Kolbenova 12', false],
 ['šachta 2', false], ['', false], ['OPR CN', false], [null, false]].forEach(([t, ma]) =>
  test('cnTvarCisla(' + JSON.stringify(t) + ') = ' + ma, CN.cnTvarCisla(t) === ma));

const P = (o) => CN.cnZmenaPosud(Object.assign({ pred: '2026 - OPR - CN - 555', ulozena: true, dupSoubor: '' }, o));
test('posudek: beze změny → nic', P({ po: '2026 - OPR - CN - 555' }).akce === 'nic');
test('posudek: hledaný text → hledat (s textem „Chtěli jste…“)', P({ po: 'Vinohradská' }).akce === 'hledat'
  && /nevypadá jako číslo nabídky/.test(P({ po: 'Vinohradská' }).text));
test('posudek: hledaný text a „je to číslo“ → potvrdit', P({ po: 'Vinohradská', jeToCislo: true }).akce === 'potvrdit');
test('posudek: duplicita → zamítnout s jménem cizí zakázky',
  P({ po: '2026 - OPR - CN - 556', dupSoubor: '2026-OPR-CN-556.json' }).akce === 'zamitnout'
  && /2026-OPR-CN-556\.json/.test(P({ po: '2026 - OPR - CN - 556', dupSoubor: '2026-OPR-CN-556.json' }).text));
test('posudek: duplicita má přednost před potvrzením i u „je to číslo“',
  P({ po: 'Vinohradská', jeToCislo: true, dupSoubor: 'x.json' }).akce === 'zamitnout');
{ const p = P({ po: '2026 - OPR - CN - 556' });
  test('posudek: uložená zakázka → potvrdit „Opravdu chcete změnit číslo nabídky z X na Y?“', p.akce === 'potvrdit'
    && p.text.indexOf('Opravdu chcete změnit číslo nabídky z „2026 - OPR - CN - 555" na „2026 - OPR - CN - 556"?') === 0, p.text); }
test('posudek: neuložená zakázka → provést', P({ po: '2026 - OPR - CN - 556', ulozena: false }).akce === 'provest');
test('posudek: doplnění předlohy u uložené zakázky → provést (nic se nemění, číslo se teprve píše)',
  P({ pred: ZK.ZAK_CISLO_PREDLOHA, po: '2026 - OPR - CN - 556' }).akce === 'provest');
test('posudek: nová zakázka a hledaný text → hledat i tak',
  P({ pred: ZK.ZAK_CISLO_PREDLOHA, po: 'Novák', ulozena: false }).akce === 'hledat');
test('posudek: vymazání čísla uložené zakázky → potvrdit', P({ po: '' }).akce === 'potvrdit');

/* ---- 2) dialogy nad zástupným set() ---- */
function prostredi(o) {
  const st = { ZAK: { cislo: o.cislo, varianty: [] }, rendery: 0, otevreno: 0, dialogy: [], odpovedi: (o.odpovedi || []).slice() };
  const ctx = {
    console, setTimeout: (f) => f(), document: { getElementById: () => null },
    ZAK: st.ZAK, ZAK_CISLO_PREDLOHA: ZK.ZAK_CISLO_PREDLOHA, hlavickaVyplneno: ZK.hlavickaVyplneno, zakazkaDuplicita: ZK.zakazkaDuplicita,
    ONLINE_STAV: { soubor: o.soubor || '', rejstrik: o.rejstrik || [], hledat: '' }, ULO_STAV: { soubor: '' },
    zakazkaMaOdeslanou: () => !!o.odeslana, jeAdmin: () => !!o.admin,
    get: (p) => p === 'ZAK.cislo' ? st.ZAK.cislo : undefined,
    render: () => { st.rendery++; }, zakNactiUI: () => { st.otevreno++; },
    hlaska: (t) => { st.dialogy.push(['hlaska', t]); return Promise.resolve(); },
    potvrd: (t, op) => { st.dialogy.push(['potvrd', t, op]); return Promise.resolve(st.odpovedi.shift()); },
    volba: (t, m) => { st.dialogy.push(['volba', t, m]); return Promise.resolve(st.odpovedi.shift()); },
  };
  /* set() jako v ui/common.js: nejdřív cnZmenaUI, pak zápis. */
  ctx.set = (p, v) => { if (p === 'ZAK.cislo' && ctx.cnZmenaUI(v)) return; st.ZAK.cislo = v; };
  vm.createContext(ctx);
  vm.runInContext(cti('cislo_nabidky.js'), ctx, { filename: 'cislo_nabidky.js' });
  vm.runInContext(cti('ui/cislo_nabidky_ui.js'), ctx, { filename: 'ui/cislo_nabidky_ui.js' });
  st.ctx = ctx;
  return st;
}
const tik = () => new Promise(r => setImmediate(r));

(async () => {
  const X = '2026 - OPR - CN - 555', Y = '2026 - OPR - CN - 556';
  { const s = prostredi({ cislo: X, soubor: '2026-OPR-CN-555.json', odpovedi: [true] });
    s.ctx.set('ZAK.cislo', Y); await tik(); await tik();
    test('bod 1: uložená zakázka se zeptá ANO / NE (výchozí NE)', s.dialogy.length === 1 && s.dialogy[0][0] === 'potvrd'
      && s.dialogy[0][2].ano === 'ANO' && s.dialogy[0][2].ne === 'NE' && s.dialogy[0][2].vychoziNe === true, s.dialogy);
    test('bod 1: po ANO je číslo nové', s.ZAK.cislo === Y, s.ZAK.cislo); }
  { const s = prostredi({ cislo: X, soubor: '2026-OPR-CN-555.json', odpovedi: [false] });
    s.ctx.set('ZAK.cislo', Y); await tik(); await tik();
    test('bod 1: po NE zůstává původní číslo a pole se překreslí', s.ZAK.cislo === X && s.rendery >= 2, [s.ZAK.cislo, s.rendery]); }
  { const s = prostredi({ cislo: X, soubor: '', odpovedi: [] });
    s.ULO = s.ctx.ULO_STAV; s.ULO.soubor = '';
    s.ctx.set('ZAK.cislo', Y); await tik();
    test('bod 1: neuložená zakázka se neptá a číslo zapíše', s.dialogy.length === 0 && s.ZAK.cislo === Y, s.dialogy); }
  { const s = prostredi({ cislo: X, odpovedi: [] }); s.ctx.ULO_STAV.soubor = '2026-OPR-CN-555.json';
    s.ctx.set('ZAK.cislo', Y); await tik();
    test('bod 1: uložená ve složce (ULO_STAV.soubor) se ptá taky', s.dialogy.length === 1 && s.dialogy[0][0] === 'potvrd', s.dialogy); }
  { const s = prostredi({ cislo: X, soubor: '2026-OPR-CN-555.json', odpovedi: ['hledat'] });
    s.ctx.set('ZAK.cislo', 'Vinohradská '); await tik(); await tik();
    const d = s.dialogy[0] || [];
    test('bod 2: text bez tvaru čísla → volba „Chtěli jste zakázku vyhledat?“', d[0] === 'volba'
      && (d[2] || []).map(m => m.kod).join() === 'hledat,cislo,zrusit', s.dialogy);
    test('bod 2: „Vyhledat zakázku“ otevře Načíst zakázku s textem v hledání a číslo nezmění',
      s.otevreno === 1 && s.ctx.ONLINE_STAV.hledat === 'Vinohradská' && s.ZAK.cislo === X, [s.otevreno, s.ctx.ONLINE_STAV.hledat, s.ZAK.cislo]); }
  { const s = prostredi({ cislo: X, soubor: '2026-OPR-CN-555.json', odpovedi: ['cislo', true] });
    s.ctx.set('ZAK.cislo', 'CN Vinohrady 1'); await tik(); await tik(); await tik();
    test('bod 2: „Je to číslo nabídky“ → potvrzení a po ANO zápis', s.dialogy.map(d => d[0]).join() === 'volba,potvrd'
      && s.ZAK.cislo === 'CN Vinohrady 1', [s.dialogy.map(d => d[0]), s.ZAK.cislo]); }
  { const s = prostredi({ cislo: X, soubor: '2026-OPR-CN-555.json', odpovedi: ['zrusit'] });
    s.ctx.set('ZAK.cislo', 'Novák'); await tik(); await tik();
    test('bod 2: „Zrušit“ nechá původní číslo a nic neotevře', s.ZAK.cislo === X && s.otevreno === 0); }
  { const s = prostredi({ cislo: ZK.ZAK_CISLO_PREDLOHA, soubor: '', odpovedi: ['hledat'] });
    s.ctx.set('ZAK.cislo', 'Novák'); await tik(); await tik();
    test('bod 2: i u nové zakázky se hledaný text nabídne k vyhledání', s.otevreno === 1 && s.ZAK.cislo === ZK.ZAK_CISLO_PREDLOHA); }
  { const rej = [{ soubor: '2026-OPR-CN-555.json', cislo: X }, { soubor: '2026-OPR-CN-556.json', cislo: Y }];
    const s = prostredi({ cislo: X, soubor: '2026-OPR-CN-555.json', rejstrik: rej, odpovedi: [] });
    s.ctx.set('ZAK.cislo', '2026 - OPR - CN - 556'); await tik(); await tik();
    test('bod 3: číslo jiné zakázky z rejstříku → hláška, změna neprojde', s.dialogy.length === 1 && s.dialogy[0][0] === 'hlaska'
      && /2026-OPR-CN-556\.json/.test(s.dialogy[0][1]) && s.ZAK.cislo === X, [s.dialogy, s.ZAK.cislo]); }
  { const rej = [{ soubor: '2026-OPR-CN-556.json', cislo: Y }];
    const s = prostredi({ cislo: ZK.ZAK_CISLO_PREDLOHA, soubor: '', rejstrik: rej, odpovedi: [] });
    s.ctx.set('ZAK.cislo', Y); await tik();
    test('bod 3: duplicita neprojde ani u nové zakázky', s.ZAK.cislo === ZK.ZAK_CISLO_PREDLOHA && s.dialogy[0][0] === 'hlaska'); }
  { const s = prostredi({ cislo: X, soubor: '2026-OPR-CN-555.json', odeslana: true, admin: false, odpovedi: [] });
    s.ctx.set('ZAK.cislo', Y);
    test('odeslaná nabídka a obchodník: cnZmenaUI nechá rozhodnout A3 (bez dialogu)', s.dialogy.length === 0 && s.ZAK.cislo === Y); }
  { const s = prostredi({ cislo: X, soubor: '2026-OPR-CN-555.json', odeslana: true, admin: true, odpovedi: [true] });
    s.ctx.set('ZAK.cislo', Y); await tik(); await tik();
    test('odeslaná nabídka a administrátor: taky potvrzení ANO / NE', s.dialogy[0] && s.dialogy[0][0] === 'potvrd' && s.ZAK.cislo === Y); }

  /* ---- 3) set() a sestavení ---- */
  const common = cti('ui/common.js');
  const iHook = common.indexOf("if (path === 'ZAK.cislo' && typeof cnZmenaUI === 'function' && cnZmenaUI(v)) return;");
  const iA3 = common.indexOf("if (path === 'ZAK.cislo' && typeof zakazkaMaOdeslanou === 'function' && zakazkaMaOdeslanou(ZAK)) {");
  const iZmraz = common.indexOf("if (path.startsWith('ZAK.') && typeof zamekZakCestaZmrazena === 'function') {");
  test('set(): cnZmenaUI stojí po zmrazení hlavičky (prodaná) a před A3', iHook > 0 && iA3 > iHook && iZmraz > 0 && iZmraz < iHook, [iZmraz, iHook, iA3]);
  const build = fs.readFileSync(__dirname + '/../build.py', 'utf8');
  test('build.py: cislo_nabidky.js v CORE a ui/cislo_nabidky_ui.js v UI (za dialog.js)',
    /'zamek\.js', 'cislo_nabidky\.js'/.test(build) && build.indexOf("'ui/dialog.js'") < build.indexOf("'ui/cislo_nabidky_ui.js'"));
  test('techspec_ui.js: pole ČÍSLO NABÍDKY jde přes set(ZAK.cislo)', /onchange="set\('ZAK\.cislo', this\.value\)"/.test(cti('ui/techspec_ui.js')));

  /* ---- 4) protokol ---- */
  { const ctx = { console, document: { getElementById: () => null }, NAST: { uzivatel: 'Obch CN' },
      setTimeout: () => 1, clearTimeout: () => {} };
    vm.createContext(ctx);
    vm.runInContext(cti('protokol.js'), ctx, { filename: 'protokol.js' });
    vm.runInContext(cti('ui/protokol_ui.js'), ctx, { filename: 'ui/protokol_ui.js' });
    ctx.ZAK = { schema: 1, cislo: '2026 - OPR - CN - 555', nazevAkce: 'TEST', varianty: [] };
    vm.runInContext('protokolTik()', ctx);
    ctx.ZAK.cislo = '2026 - OPR - CN - 556';
    vm.runInContext('protokolTik()', ctx);          // změna jen naplánovaná (časovač neběží)
    const n = vm.runInContext('protokolZapisTed()', ctx);   // rychlé uložení před koncem klidu
    const z = (ctx.ZAK.protokol || []).find(r => r.co === 'Číslo nabídky');
    test('bod 4: rychlé uložení zapíše „Číslo nabídky: X → Y“ s autorem', n >= 1 && z && z.pred === '2026 - OPR - CN - 555'
      && z.po === '2026 - OPR - CN - 556' && z.kdo === 'Obch CN', ctx.ZAK.protokol); }
  const online = cti('ui/online_ui.js');
  { const f = online.slice(online.indexOf('function onlineUloz(opts)'), online.indexOf('function onlineUlozProfil'));
    const iP = f.indexOf('protokolZapisTed()'), iA = f.indexOf("onlineApi('/api/zakazky'");
    test('bod 4: onlineUloz (i automatické uložení) zapíše protokol před odesláním', iP > 0 && iA > iP, [iP, iA]); }
  { const f = common.slice(common.indexOf('function ulozZakazku()'));
    test('bod 4: uložení do souboru zapíše protokol před exportem', f.indexOf('protokolZapisTed()') > 0
      && f.indexOf('protokolZapisTed()') < f.indexOf('StorageAdapter.exportuj')); }
  { const u = cti('ui/uloziste_ui.js'); const f = u.slice(u.indexOf('function uloUlozDoSlozky('));
    test('bod 4: uložení do složky zapíše protokol', f.indexOf('protokolZapisTed()') > 0 && f.indexOf('protokolZapisTed()') < 400); }

  /* ---- 5) hledání ---- */
  const ctxH = { console, ONLINE_STAV: { hledat: '', rejstrik: [], prehled: { hledat: '', druh: 'vse' }, ja: { email: 'a@priklad.cz' } },
    esc: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    card: (t, b) => '<card>' + t + b + '</card>', onlineMozne: () => true, uloHledej: () => [] };
  vm.createContext(ctxH);
  const vyber = (jm) => { const a = online.indexOf('function ' + jm + '('); let i = online.indexOf('\n}\n', a); return online.slice(a, i + 3); };
  const kod = online.slice(online.indexOf('const HLEDANI_TITULEK'), online.indexOf('function hledaniNapovedaHtml(')) + vyber('hledaniNapovedaHtml')
    + vyber('prehledHledaniKarta') + vyber('onlinePanelZakazky');
  try { vm.runInContext(kod, ctxH, { filename: 'online_ui.js (výběr)' }); } catch (e) { test('výběr online_ui.js se načte', false, e.message); }
  const hOk = (h) => /Hledejte podle čísla nabídky,\s+názvu akce, adresy stavby, zákazníka nebo obchodníka/.test(h) && /Např\./.test(h)
    && /title="Hledá se v čísle nabídky, názvu akce, adrese stavby, zákazníkovi/.test(h);
  let hOnline = '', hPrehled = '';
  try { hOnline = vm.runInContext('onlinePanelZakazky()', ctxH); hPrehled = vm.runInContext('prehledHledaniKarta()', ctxH); } catch (e) { /* níž FAIL */ }
  test('hledání: okno Načíst zakázku / Zakázky online má popisek, příklad a nápovědu', hOk(hOnline), hOnline.slice(0, 400));
  test('hledání: Přehled cenových nabídek má popisek, příklad a nápovědu', hOk(hPrehled), hPrehled.slice(0, 400));
  test('hledání: nápověda jmenuje jen pole, ve kterých uloHledej opravdu hledá',
    /z\.cislo, z\.nazevAkce, z\.adresa, z\.objednatel, z\.datum, z\.soubor,\s+z\.autorJmeno/.test(cti('uloziste.js')));
  test('lišta: pole „Najít zakázku“ se nepřidalo (J. V. 23. 11.)', !/Najít zakázku/.test(cti('ui/zakulozeni_ui.js')));

  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  if (fail) process.exit(1);
})();
