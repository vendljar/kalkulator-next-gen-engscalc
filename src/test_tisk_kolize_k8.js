/* ===== TISK PŘI KOLIZI / V NÁHLEDU A ZNAČKY „ULOŽENO" (K8-K2, K8-K3, #517) =====
 *
 * Rozhodnutí J. V. 26. 10. 2026 (dialog K8/S1, „ostatní podle návrhu", A):
 *
 * K8-K2 — uložení po tisku (`fronta`) skončilo tiše, když zakázka byla
 *   v kolizi verzí nebo v náhledu role (i když letící autosave doběhl
 *   kolizí): zámek a záznam odeslání zůstaly jen v prohlížeči bez dialogu
 *   ONLINE_TISK_NEULOZEN. „Načíst znovu ze serveru" je pak zahodil bez
 *   upozornění.
 * K8-K3 — po zápisu se změnou během letu se volalo historieOznacUlozeno()
 *   nad aktuální ZAK a historieZalohaHotovo(): varování při zavření okna
 *   mlčelo a záloha v prohlížeči zmizela, i když změna (typicky zámek po
 *   tisku) na serveru neležela.
 *
 * Hlídá se:
 *  1) kolize + tisk → dialog (bez POST);
 *  2) autosave v letu → tisk → odpověď 409 kolize → dialog;
 *  3) tisk v náhledu role → dialog (bez POST);
 *  4) onlineKolizeNacti se zámkem, který v `posledni` není → varování
 *     (potvrd), po odmítnutí se nic nenačte;
 *  5) onlineKolizeNacti bez nového zámku se neptá;
 *  6) změna během letu → historieNeulozeno() true, záloha zůstane,
 *     „uloženo" = odeslaný otisk;
 *  7) bez změny během letu: záloha se uklidí, uloženo = ZAK;
 *  8) tichý autosave bez tisku při kolizi dialog nevyvolá.
 */
const fs = require('fs');
const vm = require('vm');
let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const vyrez = (zdroj, jm) => {
  const i = zdroj.indexOf('function ' + jm + '(');
  if (i < 0) return '';
  const j = zdroj.indexOf('\n}\n', i);
  return zdroj.slice(i, j + 2);
};
const online = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
const zamekUi = fs.readFileSync(__dirname + '/ui/zamek_ui.js', 'utf8');
const historie = fs.readFileSync(__dirname + '/ui/historie.js', 'utf8');
const chybaOd = online.indexOf('function onlineChybaText(');
const chybaDo = online.indexOf('/* Otisk odeslané zakázky', chybaOd);
const kod = (chybaOd > 0 && chybaDo > chybaOd ? online.slice(chybaOd, chybaDo) : '')
  + vyrez(online, 'onlineOdeslanoSRazitkem') + vyrez(online, 'onlineUloz')
  + vyrez(online, 'onlineKolizeNacti') + vyrez(online, 'onlineKolizeNoveZamky') + vyrez(online, 'onlineKolizeNactiTed')
  + vyrez(zamekUi, 'zamekPoTiskuUloz')
  + vyrez(historie, 'historieNeulozeno') + vyrez(historie, 'historieOznacUlozeno');
test('funkce jsou ve zdrojích', /function onlineUloz\(/.test(kod) && /function onlineKolizeNacti\(/.test(kod)
  && /function historieOznacUlozeno\(/.test(kod));

const tik = () => new Promise(r => setImmediate(r));
async function dobehni() { for (let i = 0; i < 30; i++) await tik(); }
const ZAMEK = { typ: 'nabidka', kdy: '2026-10-26T03:00:00.000Z' };

function prostredi(navic) {
  const posty = [];
  const ctx = {
    ZAK: { cislo: '2026 - OPR - CN - 0517', nazevAkce: 'Zkušební', varianty: [{ id: 'v1', data: {} }] },
    ONLINE_STAV: { ja: { email: 'obchodnik@priklad.cz' }, ukladaBeh: null, posledni: '', razitko: 'r0', kolize: null, soubor: 'zk.json' },
    NAST: {},
    HIST: { ulozenoJako: null, autoTimer: null },
    JSON, Promise, setTimeout, clearTimeout, Date, Set,
    onlineMozne: () => true,
    uloMaCislo: () => true,
    onlineSlevyOtisk: () => ({}),
    onlineSlevyZeServeru: () => 0,
    onlinePoslednizapamatuj: () => {},
    variantaUzamcena: v => !!(v && v.zamek),
    zpravy: [], dialogy: [], dotazy: [], otevreno: [], zalohaHotovo: 0,
    potvrdOdpoved: false,
    onlineZprava: (t) => { ctx.zpravy.push(t); },
    hlaska: (t) => { ctx.dialogy.push(t); return Promise.resolve(); },
    potvrd: (t) => { ctx.dotazy.push(t); return Promise.resolve(ctx.potvrdOdpoved); },
    onlineOtevri: (s) => { ctx.otevreno.push(s); return Promise.resolve(true); },
    historieZalohaHotovo: () => { ctx.zalohaHotovo++; },
    onlineNactiRejstrik: () => Promise.resolve(true),
    onlineKolizeText: () => 'Zakázku mezitím uložil(a) někdo jiný.',
    render: () => {},
    onlineApi: (url, telo) => new Promise((vyres, zamitni) => {
      posty.push({ telo: JSON.parse(JSON.stringify(telo)), vyres, zamitni });
    }),
  };
  Object.assign(ctx, navic || {});
  vm.createContext(ctx);
  vm.runInContext(kod, ctx);
  return { ctx, posty };
}
const kolizeChyba = () => { const e = new Error('kolize'); e.data = { kolize: true, kdo: 'Kolega', naDisku: '2026-10-26T04:00:00.000Z' }; return e; };

(async () => {
  /* 1) kolize + tisk → dialog, nic se neodešle */
  {
    const { ctx, posty } = prostredi();
    ctx.ONLINE_STAV.kolize = { soubor: 'zk.json', kdo: 'Kolega', naDisku: '' };
    ctx.ZAK.varianty[0].zamek = ZAMEK;
    ctx.zamekPoTiskuUloz();
    await dobehni();
    test('K8-K2: kolize + tisk → nic se neodeslalo', posty.length === 0, posty.length);
    test('K8-K2: kolize + tisk → dialog „Odeslaná nabídka není uložená"', ctx.dialogy.length === 1
      && /neuložila/.test(ctx.dialogy[0]), ctx.dialogy);
    test('K8-K2: dialog radí přepsat serverovou verzi', /Přepsat serverovou verzi/.test(ctx.dialogy[0] || ''), ctx.dialogy);
  }
  /* 2) autosave v letu → tisk → odpověď kolize → dialog */
  {
    const { ctx, posty } = prostredi();
    ctx.onlineUloz({ tiche: true });
    ctx.ZAK.varianty[0].zamek = ZAMEK;
    ctx.zamekPoTiskuUloz();
    posty[0].zamitni(kolizeChyba());
    await dobehni();
    test('K8-K2: letící autosave skončil kolizí → druhý POST neodešel', posty.length === 1, posty.length);
    test('K8-K2: letící autosave skončil kolizí → dialog po tisku', ctx.dialogy.length === 1
      && /neuložila/.test(ctx.dialogy[0]), ctx.dialogy);
  }
  /* 2b) uložení po tisku samo dostane 409 kolize → dialog */
  {
    const { ctx, posty } = prostredi();
    ctx.ZAK.varianty[0].zamek = ZAMEK;
    ctx.zamekPoTiskuUloz();
    posty[0].zamitni(kolizeChyba());
    await dobehni();
    test('K8-K2: uložení po tisku dostalo kolizi → dialog', ctx.dialogy.length === 1, ctx.dialogy);
  }
  /* 3) náhled role + tisk → dialog */
  {
    const { ctx, posty } = prostredi({ nahledJakykoli: () => true });
    ctx.NAST.nahledRole = 'Obchodník';
    ctx.ZAK.varianty[0].zamek = ZAMEK;
    ctx.zamekPoTiskuUloz();
    await dobehni();
    test('K8-K2: náhled + tisk → nic se neodeslalo', posty.length === 0, posty.length);
    test('K8-K2: náhled + tisk → dialog s náhledem', ctx.dialogy.length === 1 && /náhled/i.test(ctx.dialogy[0]), ctx.dialogy);
  }
  /* 4) Načíst znovu se zámkem, který server nemá → varování; odmítnutí nic nenačte */
  {
    const { ctx } = prostredi();
    ctx.ONLINE_STAV.posledni = JSON.stringify(ctx.ZAK);              // server: bez zámku
    ctx.ZAK.varianty[0].zamek = ZAMEK;                                // tisk v okně
    ctx.ONLINE_STAV.kolize = { soubor: 'zk.json', kdo: 'Kolega', naDisku: '' };
    ctx.potvrdOdpoved = false;
    const v = await ctx.onlineKolizeNacti();
    test('K8-K2: Načíst znovu se nevyuloženým zámkem se zeptá', ctx.dotazy.length === 1
      && /odeslání/.test(ctx.dotazy[0]), ctx.dotazy);
    test('K8-K2: po odmítnutí se nic nenačte a kolize trvá', v === false && ctx.otevreno.length === 0
      && !!ctx.ONLINE_STAV.kolize, [v, ctx.otevreno]);
    ctx.potvrdOdpoved = true;
    const v2 = await ctx.onlineKolizeNacti();
    test('K8-K2: po potvrzení se načte', v2 === true && ctx.otevreno.length === 1, [v2, ctx.otevreno]);
  }
  /* 5) Načíst znovu bez nového zámku se neptá */
  {
    const { ctx } = prostredi();
    ctx.ZAK.varianty[0].zamek = ZAMEK;
    ctx.ONLINE_STAV.posledni = JSON.stringify(ctx.ZAK);              // zámek na serveru je
    ctx.ONLINE_STAV.kolize = { soubor: 'zk.json', kdo: 'Kolega', naDisku: '' };
    const v = await ctx.onlineKolizeNacti();
    test('K8-K2: zámek uložený na serveru → bez dotazu', ctx.dotazy.length === 0 && v === true, ctx.dotazy);
  }
  /* 6) změna během letu → neuloženo, záloha zůstane */
  {
    const { ctx, posty } = prostredi();
    ctx.ONLINE_STAV.ja = { email: 'obchodnik@priklad.cz' };
    ctx.historieOznacUlozeno();
    ctx.onlineUloz({ tiche: true });
    ctx.ZAK.nazevAkce = 'Změněno během zápisu';
    posty[0].vyres({ soubor: 'zk.json', razitko: 'r1' });
    await dobehni();
    test('K8-K3: změna během letu → varování při zavření okna platí', ctx.historieNeulozeno() === true);
    test('K8-K3: změna během letu → záloha v prohlížeči zůstává', ctx.zalohaHotovo === 0, ctx.zalohaHotovo);
    test('K8-K3: „uloženo" = odeslaný otisk s razítkem', ctx.HIST.ulozenoJako === ctx.ONLINE_STAV.posledni
      && JSON.parse(ctx.HIST.ulozenoJako).nazevAkce === 'Zkušební', ctx.HIST.ulozenoJako);
  }
  /* 7) bez změny během letu: záloha se uklidí, uloženo = ZAK */
  {
    const { ctx, posty } = prostredi();
    ctx.onlineUloz({ tiche: true });
    posty[0].vyres({ soubor: 'zk.json', razitko: 'r1' });
    await dobehni();
    test('K8-K3: bez změny → záloha uklizena', ctx.zalohaHotovo === 1, ctx.zalohaHotovo);
    test('K8-K3: bez změny → uloženo', ctx.historieNeulozeno() === false);
  }
  /* 8) tichý autosave při kolizi dialog nevyvolá */
  {
    const { ctx, posty } = prostredi();
    ctx.ONLINE_STAV.kolize = { soubor: 'zk.json', kdo: 'Kolega', naDisku: '' };
    await ctx.onlineUloz({ tiche: true });
    test('K8-K2: obyčejný autosave při kolizi mlčí', ctx.dialogy.length === 0 && posty.length === 0, ctx.dialogy);
  }
  console.log(`\n${ok} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
