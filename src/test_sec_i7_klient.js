/* SEC-I7 v prohlížeči (#517): zásah do JINÉHO správce se ptá na heslo.
 *
 * Server od #517 chce `hesloSpravce` u smazání, vypnutí, archivace a snížení
 * role účtu, který je Administrátor (netlify/test_sec_i7.mjs). Tlačítka
 * v Nastavení → Uživatelé ho proto musí poslat — jinak by správce dostal jen
 * 401. Hlídá se:
 *  1) vypnutí / smazání / archivace / snížení role jiného správce → dotaz
 *     na heslo a heslo v těle požadavku;
 *  2) zrušený dialog → nic se neodešle;
 *  3) obchodník, zapnutí a vlastní účet → bez dotazu, bez hesla.
 * Spuštění: cd src && node test_sec_i7_klient.js */
const fs = require('fs');
const vm = require('vm');
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const online = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
const vyrez = (jm) => { const i = online.search(new RegExp('(async )?function ' + jm + '\\(')); if (i < 0) return ''; const j = online.indexOf('\n}\n', i); return online.slice(i, j + 2); };
const kod = ['onlineHesloSpravce', 'onlineUzHesloJinySpravce', 'onlineUzRoleZmen', 'onlineUzArchiv', 'onlineUzSmaz', 'onlineUzAktivni'].map(vyrez).join('\n');

function prostredi(hesloOdpoved) {
  const ctx = {
    ONLINE_STAV: { ja: { email: 'ja@priklad.cz' }, uzivatele: [
      { email: 'spravce2@priklad.cz', role: 'Administrátor', aktivni: true },
      { email: 'obchodnik@priklad.cz', role: 'Obchodník', aktivni: true },
      { email: 'ja@priklad.cz', role: 'Administrátor', aktivni: true }] },
    Promise, Object, setTimeout,
    dotazy: [], tela: [],
    dotazHeslo: (t) => { ctx.dotazy.push(t); return Promise.resolve(hesloOdpoved); },
    potvrd: () => Promise.resolve(true),
    dotaz: () => Promise.resolve(''),
    onlineZprava: () => {}, onlineUzivateleObnov: () => {}, onlineUzivateleNacti: () => {}, onlineUzPrevodNabidni: () => {},
    onlineUzAkce: (telo) => { ctx.tela.push(telo); return Promise.resolve(true); },
    onlineApi: (url, telo) => { ctx.tela.push(telo); return Promise.resolve({}); },
  };
  vm.createContext(ctx); vm.runInContext(kod, ctx);
  return ctx;
}
const tik = () => new Promise(r => setImmediate(r));

(async () => {
  test('funkce jsou ve zdroji', /function onlineUzHesloJinySpravce\(/.test(kod));
  const PRIPADY = [
    ['vypnutí', c => c.onlineUzAktivni('spravce2@priklad.cz', false)],
    ['smazání', c => c.onlineUzSmaz('spravce2@priklad.cz')],
    ['archivace', c => c.onlineUzArchiv('spravce2@priklad.cz', true)],
    ['snížení role', c => c.onlineUzRoleZmen('spravce2@priklad.cz', 'Obchodník')],
  ];
  for (const [jm, f] of PRIPADY) {
    const c = prostredi('Moje.Heslo.1');
    await f(c); await tik();
    test(`${jm} jiného správce → dotaz na heslo`, c.dotazy.length === 1, c.dotazy);
    test(`${jm} jiného správce → heslo v požadavku`, c.tela.length === 1 && c.tela[0].hesloSpravce === 'Moje.Heslo.1', c.tela);
    const z = prostredi(null);
    await f(z); await tik();
    test(`${jm}: zrušený dialog nic neodešle`, z.tela.length === 0, z.tela);
  }
  const BEZ = [
    ['vypnutí obchodníka', c => c.onlineUzAktivni('obchodnik@priklad.cz', false)],
    ['smazání obchodníka', c => c.onlineUzSmaz('obchodnik@priklad.cz')],
    ['zapnutí správce', c => c.onlineUzAktivni('spravce2@priklad.cz', true)],
    ['snížení role obchodníka', c => c.onlineUzRoleZmen('obchodnik@priklad.cz', 'Vedoucí')],
  ];
  for (const [jm, f] of BEZ) {
    const c = prostredi('Moje.Heslo.1');
    await f(c); await tik();
    test(`${jm}: bez dotazu a bez hesla`, c.dotazy.length === 0 && c.tela.length === 1 && !c.tela[0].hesloSpravce, [c.dotazy, c.tela]);
  }
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})();
