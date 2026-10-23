/* ===== TISK BĚHEM BĚŽÍCÍHO ULOŽENÍ (K7-K1, audit 23. 10. 2026, #507) =====
 *
 * Z1-4 slibuje „tisk = hned uložit": zámek a záznam odeslání se mají zapsat
 * do databáze rovnou. Běžel-li v tu chvíli autosave (`ONLINE_STAV.ukladaBeh`),
 * tiché uložení po tisku se ZAHODILO a doběhnutý autosave pak nastavil
 * „naposledy uloženo" z aktuální ZAK — už se zámkem. Autosave i hlídání
 * „neuloženo" tak mlčely a vytištěná nabídka neměla na serveru záznam.
 *
 * Hlídá se:
 *  1) tisk během letícího autosave → server dostane druhý POST se zámkem;
 *  2) změna během letícího zápisu se nepočítá za uloženou (`posledni`
 *     = odeslané tělo + razítko serveru);
 *  3) bez změny během zápisu zůstává `posledni` = ZAK (žádný zbytečný zápis);
 *  4) obyčejný tichý autosave do běžícího zápisu dál nevstupuje.
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
const kod = vyrez(online, 'onlineOdeslanoSRazitkem') + vyrez(online, 'onlineUloz') + vyrez(zamekUi, 'zamekPoTiskuUloz');
test('funkce jsou ve zdrojích', /function onlineUloz\(/.test(kod) && /function zamekPoTiskuUloz\(/.test(kod));

const tik = () => new Promise(r => setImmediate(r));
async function dobehni() { for (let i = 0; i < 30; i++) await tik(); }

function prostredi() {
  const posty = [];   // { telo: JSON v okamžiku odeslání, vyres, zamitni }
  const ctx = {
    ZAK: { cislo: '2026 - OPR - CN - 0507', nazevAkce: 'Zkušební', varianty: [{ id: 'v1', data: {} }] },
    ONLINE_STAV: { ja: { email: 'obchodnik@priklad.cz' }, ukladaBeh: null, posledni: '', razitko: 'r0', kolize: null },
    NAST: {},
    JSON, Promise, setTimeout, clearTimeout, Date,
    onlineMozne: () => true,
    uloMaCislo: () => true,
    onlineSlevyOtisk: () => ({}),
    onlineSlevyZeServeru: () => 0,
    onlinePoslednizapamatuj: () => {},
    onlineZprava: () => {},
    onlineNactiRejstrik: () => Promise.resolve(true),
    onlineKolizeText: () => '',
    render: () => {},
    onlineApi: (url, telo) => new Promise((vyres, zamitni) => {
      posty.push({ telo: JSON.parse(JSON.stringify(telo)), vyres, zamitni });
    }),
  };
  vm.createContext(ctx);
  vm.runInContext(kod, ctx);
  return { ctx, posty };
}

(async () => {
  /* 1) autosave v letu + tisk → server dostane zámek */
  {
    const { ctx, posty } = prostredi();
    ctx.onlineUloz({ tiche: true });                         // autosave
    test('autosave odeslal POST', posty.length === 1);
    ctx.ZAK.varianty[0].zamek = { typ: 'nabidka', kdy: '2026-10-23T03:00:00.000Z' };   // tisk zamkl variantu
    test('tisk se přihlásil k uložení', ctx.zamekPoTiskuUloz() === true);
    posty[0].vyres({ soubor: 'zk.json', razitko: 'r1' });
    await dobehni();
    test('po doběhnutí autosave odešel druhý POST', posty.length === 2, posty.length);
    const druhy = posty[1] && posty[1].telo.zakazka;
    test('druhý POST nese zámek varianty', !!(druhy && druhy.varianty[0].zamek && druhy.varianty[0].zamek.typ === 'nabidka'));
    test('druhý POST jde s razítkem z prvního', posty[1] && posty[1].telo.ocekavaneRazitko === 'r1');
    if (posty[1]) posty[1].vyres({ soubor: 'zk.json', razitko: 'r2' });
    await dobehni();
    test('po druhém uložení je zakázka „uložená"', ctx.ONLINE_STAV.posledni === JSON.stringify(ctx.ZAK));
    test('nic dalšího se neodeslalo', posty.length === 2, posty.length);
  }
  /* 2) změna během letícího zápisu se nepočítá za uloženou */
  {
    const { ctx, posty } = prostredi();
    ctx.onlineUloz({ tiche: true });
    ctx.ZAK.nazevAkce = 'Změněno během zápisu';
    posty[0].vyres({ soubor: 'zk.json', razitko: 'r1' });
    await dobehni();
    test('změna během zápisu zůstane neuložená (autosave ji zapíše příště)',
      ctx.ONLINE_STAV.posledni !== JSON.stringify(ctx.ZAK));
    const p = JSON.parse(ctx.ONLINE_STAV.posledni || '{}');
    test('„naposledy uloženo" = odeslané tělo s razítkem serveru',
      p.nazevAkce === 'Zkušební' && p.uloRazitko === 'r1', p);
  }
  /* 3) bez změny během zápisu žádný zbytečný rozdíl */
  {
    const { ctx, posty } = prostredi();
    ctx.onlineUloz({ tiche: true });
    posty[0].vyres({ soubor: 'zk.json', razitko: 'r1' });
    await dobehni();
    test('bez změny: posledni = ZAK (včetně razítka)', ctx.ONLINE_STAV.posledni === JSON.stringify(ctx.ZAK)
      && ctx.ZAK.uloRazitko === 'r1');
  }
  /* 4) obyčejný tichý autosave do běžícího zápisu nevstupuje */
  {
    const { ctx, posty } = prostredi();
    ctx.onlineUloz({ tiche: true });
    const druhy = ctx.onlineUloz({ tiche: true });
    test('druhý autosave se během zápisu zahodí', posty.length === 1);
    posty[0].vyres({ soubor: 'zk.json', razitko: 'r1' });
    await dobehni();
    test('… a nic dalšího neodešle', posty.length === 1 && (await druhy) === false);
  }
  /* 5) fronta po zápisu, který už zakázku uložil celou, nic neodešle */
  {
    const { ctx, posty } = prostredi();
    ctx.ZAK.varianty[0].zamek = { typ: 'nabidka', kdy: '2026-10-23T03:00:00.000Z' };
    ctx.onlineUloz({ tiche: true });
    ctx.zamekPoTiskuUloz();
    posty[0].vyres({ soubor: 'zk.json', razitko: 'r1' });
    await dobehni();
    test('zámek už byl v letícím zápisu → druhý POST není potřeba', posty.length === 1, posty.length);
  }
  console.log(`\n${ok} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
