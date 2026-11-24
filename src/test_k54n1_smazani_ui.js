/* K54-N1 (#750, J. V. 24. 11. 2026) — smazání OTEVŘENÉ kalkulace v Seznamu
 * zakázek (src/ui/online_ui.js onlineSmazVybrane, funkce vyňaté do pískoviště):
 *   – smazaná otevřená kalkulace se hned ZAVŘE: prázdná Nová zakázka (jako
 *     tlačítko Nová zakázka, bez dotazu) a hláška „Kalkulace <číslo> byla
 *     smazána.“; okno zapomene jméno i razítko;
 *   – další uložení (onlineUloz) odešle tu NOVOU zakázku, ne starou kopii,
 *     a bez razítka i jména smazaného záznamu;
 *   – uložení otevřené zakázky posílá `ocekavanySoubor` (jméno záznamu, ze
 *     kterého okno vyšlo) — podle něj server odmítne smazanou (409 smazana);
 *   – smazání jiné zakázky ani nepovedené smazání otevřenou nezavře.
 * Server hlídá netlify/test_k54n1_smazana.mjs.
 * Pojistka: na 0fd6410 (před opravou) sada padá (kalkulace zůstane otevřená,
 * uložení odešle starou kopii, tělo bez ocekavanySoubor).
 * Spuštění: cd src && node test_k54n1_smazani_ui.js */
const fs = require('fs');
const vm = require('vm');
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 600)); } };

const vyjmiZ = (zdroj) => (jmeno) => {
  const m = new RegExp('^(async )?function ' + jmeno + '\\(', 'm').exec(zdroj);
  if (!m) return '';
  const konec = zdroj.indexOf('\n}\n', m.index);
  return zdroj.slice(m.index, konec + 2);
};
const ON = vyjmiZ(fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8'));
const ZU = vyjmiZ(fs.readFileSync(__dirname + '/ui/zakazka_ui.js', 'utf8'));
const UL = vyjmiZ(fs.readFileSync(__dirname + '/ui/zakulozeni_ui.js', 'utf8'));
const KOD = [ON('onlineSmazVybrane'), ON('onlineUloz'), ZU('novaZakazkaUI'), ZU('zakNovaZakazkaProved'), UL('zakOdpojUlozeni')];
test('funkce jsou v online_ui.js, zakazka_ui.js a zakulozeni_ui.js', KOD.slice(0, 3).every(Boolean) && !!KOD[4], KOD.map(k => k.length));

const STARA = () => ({ cislo: 'CN-432', uloRazitko: '2026-11-24T08:00:00.000Z',
  varianty: [{ id: 'v1', zamek: { zamceno: true } }], protokol: ['…'] });
function pripravit(volby) {
  const log = [], odeslano = [];
  const ctx = {
    console, log, odeslano, JSON, Promise, Object, Array, String, Date, setTimeout, clearTimeout,
    ONLINE_STAV: { ja: { email: 'spravce@priklad.cz', role: 'Administrátor' }, soubor: 'CN-432.json',
      razitko: '2026-11-24T08:00:00.000Z', posledni: 'x', kdyUlozeno: new Date(), timer: null, kolize: null,
      prehled: { vybrane: (volby.vybrane || ['CN-432.json']).slice() },
      rejstrik: [{ soubor: 'CN-432.json', cislo: 'CN-432', odeslane: 1 }, { soubor: 'CN-500.json', cislo: 'CN-500' }] },
    ULO_STAV: { soubor: '', razitko: '', posledni: '', kdyUlozeno: null, timer: null },
    NAST: { zobrazeni: {} },
    ZAK: STARA(),
    jeAdminOnline: () => true,
    potvrd: async () => true,
    novaZakazka: () => ({ cislo: '', varianty: [{ id: 'n1' }] }),
    syncVarianta: () => {}, render: () => {}, prepniTab: (t) => log.push('tab:' + t),
    historieNeulozeno: () => true, historieOznacUlozeno: () => log.push('oznacUlozeno'),
    zamekCteniVypni: () => log.push('zamek:vypni'),
    onlinePoslednizapamatuj: (s) => log.push('posledni:' + s),
    zakUlozeniZprava: () => {}, seznamReset: () => {},
    onlineZprava: (t) => log.push('zprava:' + t),
    onlineNactiRejstrik: () => Promise.resolve(),
    onlineSlevyOtisk: () => '', onlineSlevyZeServeru: () => {}, onlineChybaText: (e) => e.message,
    onlineZamekNesouhlasi: () => false,
    onlineApi: (url, telo, metoda) => {
      if (metoda === 'DELETE') {
        log.push('smaz:' + decodeURIComponent(url.split('soubor=')[1].split('&')[0]));
        return volby.selze ? Promise.reject(new Error('nepovedlo')) : Promise.resolve({ ok: true });
      }
      odeslano.push(JSON.parse(JSON.stringify(telo)));
      return Promise.resolve({ ok: true, soubor: 'X.json', razitko: 'R2' });
    },
  };
  vm.createContext(ctx);
  vm.runInContext(KOD.join('\n'), ctx, { filename: 'výňatek UI' });
  return ctx;
}

/* onlineSmazVybrane řetěz nevrací (volá ho onclick) — počká se, až doběhne. */
const smazat = async (c) => { await vm.runInContext('onlineSmazVybrane()', c); await new Promise(r => setTimeout(r, 30)); };

(async () => {
  /* 1. smazání otevřené kalkulace → zavřeno */
  let c = pripravit({});
  const stara = c.ZAK;
  await smazat(c);
  test('smazání otevřené kalkulace: server dostal DELETE', c.log.includes('smaz:CN-432.json'), c.log);
  test('… kalkulace je ZAVŘENÁ — v okně prázdná Nová zakázka', c.ZAK !== stara && c.ZAK.cislo === '' && c.ZAK.varianty[0].id === 'n1', c.ZAK);
  test('… okno zapomnělo jméno i razítko smazaného záznamu', c.ONLINE_STAV.soubor === '' && c.ONLINE_STAV.razitko === '', c.ONLINE_STAV);
  test('… hláška „Kalkulace CN-432 byla smazána.“', c.log.includes('zprava:Kalkulace CN-432 byla smazána.'), c.log.filter(x => x.startsWith('zprava')));
  test('… jako tlačítko Nová zakázka: karta Kalkulace, otisk uloženo, bez dotazu', c.log.includes('tab:kalk') && c.log.includes('oznacUlozeno'), c.log);
  /* 2. další uložení nezapíše starou */
  c.ZAK.cislo = 'CN-432';   // obchodník vyplní číslo znovu
  await vm.runInContext('onlineUloz({})', c);
  const t1 = c.odeslano[0] || {};
  test('další uložení odešle NOVOU zakázku, ne starou kopii (bez zamčené varianty a razítka)',
    !!t1.zakazka && t1.zakazka.varianty.length === 1 && t1.zakazka.varianty[0].id === 'n1' && !t1.zakazka.uloRazitko && !t1.zakazka.protokol, t1);
  test('… bez razítka i jména smazaného záznamu (server ji bere jako novou)', t1.ocekavaneRazitko === '' && t1.ocekavanySoubor === '', t1);

  /* 3. uložení otevřené zakázky nese ocekavanySoubor */
  c = pripravit({});
  await vm.runInContext('onlineUloz({})', c);
  const t2 = c.odeslano[0] || {};
  test('uložení otevřené zakázky posílá razítko i jméno záznamu (ocekavanySoubor)',
    t2.ocekavaneRazitko === '2026-11-24T08:00:00.000Z' && t2.ocekavanySoubor === 'CN-432.json', t2);

  /* 4. smazání jiné zakázky / nepovedené smazání otevřenou nezavře */
  c = pripravit({ vybrane: ['CN-500.json'] });
  let pred = c.ZAK;
  await smazat(c);
  test('smazání JINÉ zakázky otevřenou nezavře (ani nezapomene jméno)', c.ZAK === pred && c.ONLINE_STAV.soubor === 'CN-432.json'
    && c.log.includes('zprava:Smazáno 1 zakázka.'), c.log);
  c = pripravit({ selze: true });
  pred = c.ZAK;
  await smazat(c);
  test('nepovedené smazání otevřenou nezavře', c.ZAK === pred && c.ONLINE_STAV.soubor === 'CN-432.json'
    && c.log.some(x => /^zprava:Smazáno 0, nepovedlo se/.test(x)), c.log);
  c = pripravit({ vybrane: ['CN-432.json', 'CN-500.json'] });
  await smazat(c);
  test('hromadné smazání s otevřenou: zavřeno a hláška nese i souhrn', c.ZAK.varianty[0].id === 'n1'
    && c.log.includes('zprava:Kalkulace CN-432 byla smazána. Smazáno 2 zakázky.'), c.log.filter(x => x.startsWith('zprava')));

  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka', e && e.stack); process.exit(1); });
