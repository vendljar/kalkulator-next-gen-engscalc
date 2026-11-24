/* K54-N1 (#750, J. V. 24. 11. 2026) — smazání OTEVŘENÉ kalkulace v Seznamu
 * zakázek (src/ui/online_ui.js onlineSmazVybrane; skutečné funkce vyňaté do
 * pískoviště spolu s historií kroků a zálohy z src/ui/historie.js):
 *   – smazaná otevřená kalkulace se hned ZAVŘE: prázdná Nová zakázka (bez
 *     dotazu, karta se nepřepíná) a hláška „Kalkulace <číslo> byla smazána.“;
 *     okno zapomene jméno i razítko;
 *   – revize Fable N1/N2: krok Zpět ani záloha v prohlížeči smazanou
 *     nevrátí (historie kroků zahozena, záloha smazané pryč, cizí zůstane);
 *   – další uložení odešle NOVOU zakázku bez razítka a jména smazaného záznamu;
 *   – uložení otevřené zakázky posílá `ocekavanySoubor`;
 *   – N5: odpověď 409 smazana = trvalý stav: autosave stojí, další uložení
 *     nic neodešle, hláška radí duplikovat nebo zavřít;
 *   – N6: potvrzení předem řekne, že se otevřená zavře (i neuložené změny);
 *   – N7: naplánovaný autosave se zruší, rozběhnuté uložení doběhne před DELETE;
 *   – smazání jiné zakázky, nepovedené smazání a mezitím otevřená jiná
 *     zakázka otevřenou nezavřou.
 * Server hlídá netlify/test_k54n1_smazana.mjs.
 * Pojistka: na 0fd6410 sada padá (kalkulace zůstane otevřená, uložení odešle
 * starou kopii, tělo bez ocekavanySoubor); na b23e832 (před revizí) padají
 * N1/N2/N5/N6/N7.
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
const HI = vyjmiZ(fs.readFileSync(__dirname + '/ui/historie.js', 'utf8'));
const JMENA = { ON: ['onlineSmazVybrane', 'onlineUloz', 'onlineSmazanaText'], ZU: ['novaZakazkaUI', 'zakNovaZakazkaProved'],
  UL: ['zakOdpojUlozeni'], HI: ['historieTik', 'historieObnov', 'historieZpet', 'historieZalohaZapis', 'historieZalohaCti',
    'historieZalohaHotovo', 'historieZapomen'] };
const KOD = [].concat(JMENA.ON.map(ON), JMENA.ZU.map(ZU), JMENA.UL.map(UL), JMENA.HI.map(HI));
const chybi = [].concat(...Object.values(JMENA)).filter((j, i) => !KOD[i]);
test('funkce jsou ve zdrojích (online_ui, zakazka_ui, zakulozeni_ui, historie)', chybi.length === 0, chybi);

const STARA = () => ({ cislo: 'CN-432', nazevAkce: 'Akce', uloRazitko: '2026-11-24T08:00:00.000Z',
  varianty: [{ id: 'v1', zamek: { zamceno: true } }], protokol: ['stary'] });
function pripravit(volby) {
  const log = [], odeslano = [], sklad = {};
  const ctx = {
    console, log, odeslano, sklad, JSON, Promise, Object, Array, String, Date, setTimeout, clearTimeout,
    HIST: { posledni: null, zpet: [], znovu: [], probihaKrok: false, ulozenoJako: null, autoTimer: null, autoStav: '', nabidka: null },
    HIST_MAX: 40, HIST_KLIC: 'kng_rozpracovano_v1', HIST_ODLOZENO_KLIC: 'kng_odlozeno', HIST_PRODLEVA: 1,
    Uloziste: { kDispozici: () => true, cti: k => (k in sklad ? sklad[k] : null), zapis: (k, v) => { sklad[k] = v; return true; },
      smaz: k => { delete sklad[k]; } },
    ONLINE_STAV: { ja: { email: 'spravce@priklad.cz', role: 'Administrátor' }, soubor: 'CN-432.json',
      razitko: '2026-11-24T08:00:00.000Z', posledni: 'x', kdyUlozeno: new Date(), timer: null, kolize: null, smazana: '',
      prehled: { vybrane: (volby.vybrane || ['CN-432.json']).slice() },
      rejstrik: [{ soubor: 'CN-432.json', cislo: 'CN-432', odeslane: 1 }, { soubor: 'CN-500.json', cislo: 'CN-500' }] },
    ULO_STAV: { soubor: '', razitko: '', posledni: '', kdyUlozeno: null, timer: null },
    NAST: { zobrazeni: {} },
    ZAK: STARA(),
    jeAdminOnline: () => true,
    potvrd: async (t) => { log.push('potvrd:' + t); return true; },
    hlaska: () => {},
    novaZakazka: () => ({ cislo: '', nazevAkce: '', varianty: [{ id: 'n1' }] }),
    importZakazka: z => z,
    syncVarianta: () => {}, prepniTab: (t) => log.push('tab:' + t),
    historieTlacitka: () => {}, historieZalohaNaplanuj: () => {}, historieListaPrekresli: () => {}, historieSkryjListu: () => {},
    historieNeulozeno: () => volby.neulozeno !== false, historieOznacUlozeno: () => log.push('oznacUlozeno'),
    zamekCteniVypni: () => log.push('zamek:vypni'),
    onlinePoslednizapamatuj: (s) => log.push('posledni:' + s),
    onlineTiskNeulozenDialog: (t) => log.push('dialog:' + t),
    zakUlozeniZprava: () => {}, seznamReset: () => {},
    onlineZprava: (t) => log.push('zprava:' + t),
    onlineNactiRejstrik: () => Promise.resolve(),
    onlineSlevyOtisk: () => '', onlineSlevyZeServeru: () => {}, onlineChybaText: (e) => e.message,
    onlineZamekNesouhlasi: () => false,
    uloJmenoSouboru: (z) => (z && z.cislo ? z.cislo + '.json' : 'bez-cisla.json'),
    uloZalohaSmiPrepsat: (s, c) => { const p = !c.cislo && !c.nazevAkce; return !p || !(s && s.zakazka && (s.cislo || s.nazevAkce)); },
    onlineApi: (url, telo, metoda) => {
      if (metoda === 'DELETE') {
        const s = decodeURIComponent(url.split('soubor=')[1].split('&')[0]);
        log.push('smaz:' + s);
        if (volby.priMazani) volby.priMazani(ctx);
        return volby.selze ? Promise.reject(new Error('nepovedlo')) : Promise.resolve({ ok: true });
      }
      odeslano.push(JSON.parse(JSON.stringify(telo)));
      log.push('post');
      if (volby.odpovedSmazana) return Promise.reject(Object.assign(new Error('Kalkulace byla mezitím smazána'),
        { stav: 409, data: { ok: false, smazana: true, soubor: ctx.ONLINE_STAV.soubor } }));
      return Promise.resolve({ ok: true, soubor: 'X.json', razitko: 'R2' });
    },
  };
  ctx.render = () => vm.runInContext('historieTik()', ctx);
  vm.createContext(ctx);
  vm.runInContext(KOD.join('\n'), ctx, { filename: 'výňatek UI' });
  /* otevřená kalkulace s neuloženou úpravou: kroky Zpět i záloha v prohlížeči */
  ctx.render(); ctx.ZAK.poznamka = 'neuložená úprava'; ctx.render(); vm.runInContext('historieZalohaZapis()', ctx);
  return ctx;
}
/* onlineSmazVybrane řetěz nevrací (volá ho onclick) — počká se, až doběhne. */
const smazat = async (c) => { await vm.runInContext('onlineSmazVybrane()', c); await new Promise(r => setTimeout(r, 30)); };
const zaloha = (c) => JSON.parse(c.sklad.kng_rozpracovano_v1 || 'null');

(async () => {
  /* 1. smazání otevřené kalkulace → zavřeno */
  let c = pripravit({});
  const stara = c.ZAK;
  test('příprava: záloha v prohlížeči nese otevřenou kalkulaci, Zpět má kroky', zaloha(c) && zaloha(c).cislo === 'CN-432' && c.HIST.zpet.length > 0);
  await smazat(c);
  test('smazání otevřené kalkulace: server dostal DELETE', c.log.includes('smaz:CN-432.json'), c.log);
  test('… kalkulace je ZAVŘENÁ — v okně prázdná Nová zakázka', c.ZAK !== stara && c.ZAK.cislo === '' && c.ZAK.varianty[0].id === 'n1', c.ZAK);
  test('… okno zapomnělo jméno i razítko smazaného záznamu', c.ONLINE_STAV.soubor === '' && c.ONLINE_STAV.razitko === '', c.ONLINE_STAV);
  test('… hláška „Kalkulace CN-432 byla smazána.“', c.log.includes('zprava:Kalkulace CN-432 byla smazána.'), c.log.filter(x => x.startsWith('zprava')));
  test('… jako Nová zakázka (otisk uloženo), ale karta se nepřepíná (revize N6)', c.log.includes('oznacUlozeno') && !c.log.some(x => x.startsWith('tab:')), c.log);
  /* N1: krok Zpět */
  test('N1: zásobník Zpět i Znovu je po smazání prázdný', c.HIST.zpet.length === 0 && c.HIST.znovu.length === 0, [c.HIST.zpet.length, c.HIST.znovu.length]);
  vm.runInContext('historieZpet()', c);
  test('N1: krok Zpět (Ctrl+Z) smazanou kalkulaci nevrátí', c.ZAK.cislo === '' && c.ZAK.varianty[0].id === 'n1', c.ZAK);
  /* N2: záloha v prohlížeči */
  test('N2: záloha smazané kalkulace v prohlížeči je pryč', zaloha(c) === null, zaloha(c));
  /* další uložení nezapíše starou */
  c.ZAK.cislo = 'CN-432';   // obchodník vyplní číslo znovu
  await vm.runInContext('onlineUloz({})', c);
  const t1 = c.odeslano[0] || {};
  test('další uložení odešle NOVOU zakázku, ne starou kopii (bez zamčené varianty a razítka)',
    !!t1.zakazka && t1.zakazka.varianty.length === 1 && t1.zakazka.varianty[0].id === 'n1' && !t1.zakazka.uloRazitko && !t1.zakazka.protokol, t1);
  test('… bez razítka i jména smazaného záznamu (server ji bere jako novou)', t1.ocekavaneRazitko === '' && t1.ocekavanySoubor === '', t1);

  /* N2: záloha JINÉ zakázky zůstane */
  c = pripravit({});
  c.sklad.kng_rozpracovano_v1 = JSON.stringify({ verze: 1, cislo: 'CN-777', zakazka: JSON.stringify({ cislo: 'CN-777', varianty: [] }) });
  await smazat(c);
  test('N2: záloha jiné rozpracované zakázky v prohlížeči zůstane', zaloha(c) && zaloha(c).cislo === 'CN-777', zaloha(c));

  /* N6: potvrzení */
  c = pripravit({});
  await smazat(c);
  const potvrzeni = c.log.find(x => x.startsWith('potvrd:Opravdu smazat')) || '';
  test('N6: potvrzení řekne, že se otevřená zavře a neuložené změny se ztratí',
    potvrzeni.includes('Mezi vybranými je právě otevřená kalkulace CN-432 — po smazání se zavře a její neuložené změny se ztratí.'), potvrzeni);
  c = pripravit({ neulozeno: false });
  await smazat(c);
  const potvrzeni2 = c.log.find(x => x.startsWith('potvrd:Opravdu smazat')) || '';
  test('N6: bez neuložených změn jen „po smazání se zavře.“', /po smazání se zavře\.$/.test(potvrzeni2), potvrzeni2);
  c = pripravit({ vybrane: ['CN-500.json'] });
  await smazat(c);
  test('N6: bez otevřené ve výběru potvrzení o zavření mlčí', !c.log.some(x => /otevřená kalkulace/.test(x)), c.log);

  /* N7: naplánovaný autosave a rozběhnuté uložení */
  c = pripravit({});
  let vystrelil = false;
  c.ONLINE_STAV.timer = setTimeout(() => { vystrelil = true; }, 5);
  c.ONLINE_STAV.ukladaBeh = new Promise(r => setTimeout(() => { c.log.push('ulozeni-dobehlo'); r(true); }, 15));
  await smazat(c);
  await new Promise(r => setTimeout(r, 20));
  test('N7: naplánovaný autosave otevřené kalkulace se zrušil', !vystrelil && c.ONLINE_STAV.timer === null);
  test('N7: rozběhnuté uložení doběhlo před DELETE', c.log.indexOf('ulozeni-dobehlo') >= 0
    && c.log.indexOf('ulozeni-dobehlo') < c.log.indexOf('smaz:CN-432.json'), c.log);

  /* 3. uložení otevřené zakázky nese ocekavanySoubor */
  c = pripravit({});
  await vm.runInContext('onlineUloz({})', c);
  const t2 = c.odeslano[0] || {};
  test('uložení otevřené zakázky posílá razítko i jméno záznamu (ocekavanySoubor)',
    t2.ocekavaneRazitko === '2026-11-24T08:00:00.000Z' && t2.ocekavanySoubor === 'CN-432.json', t2);

  /* N5: 409 smazana v jiné kartě */
  c = pripravit({ odpovedSmazana: true });
  c.ONLINE_STAV.timer = setTimeout(() => {}, 1000);
  const v1 = await vm.runInContext('onlineUloz({})', c);
  test('N5: odpověď 409 smazana → neuloženo, značka smazané kalkulace, autosave zastaven',
    v1 === false && c.ONLINE_STAV.smazana === 'CN-432.json' && c.ONLINE_STAV.timer === null && c.ONLINE_STAV.kolize === null,
    { smazana: c.ONLINE_STAV.smazana, timer: !!c.ONLINE_STAV.timer, kolize: c.ONLINE_STAV.kolize });
  test('N5: hláška „byla mezitím smazána“ s radou (duplikovat / zavřít)',
    c.log.includes('zprava:Kalkulace CN-432 byla mezitím smazána — neuloženo. Chcete-li práci zachovat, uložte ji jako novou zakázku (Duplikovat zakázku), jinak ji zavřete (Nová zakázka).'),
    c.log.filter(x => x.startsWith('zprava')));
  const posty = c.odeslano.length;
  await vm.runInContext('onlineUloz({ tiche: true })', c);
  await vm.runInContext('onlineUloz({})', c);
  test('N5: další (i automatické) uložení už nic neodešle', c.odeslano.length === posty, c.odeslano.length);
  vm.runInContext('zakOdpojUlozeni()', c);
  test('N5: Nová zakázka / duplikát značku zruší', c.ONLINE_STAV.smazana === '', c.ONLINE_STAV.smazana);

  /* 4. smazání jiné zakázky / nepovedené smazání / mezitím jiná zakázka */
  c = pripravit({ vybrane: ['CN-500.json'] });
  let pred = c.ZAK;
  await smazat(c);
  test('smazání JINÉ zakázky otevřenou nezavře (ani nezapomene jméno)', c.ZAK === pred && c.ONLINE_STAV.soubor === 'CN-432.json'
    && c.log.includes('zprava:Smazáno 1 zakázka.') && c.HIST.zpet.length > 0, c.log);
  c = pripravit({ selze: true });
  pred = c.ZAK;
  await smazat(c);
  test('nepovedené smazání otevřenou nezavře (Zpět i záloha zůstanou)', c.ZAK === pred && c.ONLINE_STAV.soubor === 'CN-432.json'
    && c.HIST.zpet.length > 0 && !!zaloha(c) && c.log.some(x => /^zprava:Smazáno 0, nepovedlo se/.test(x)), c.log);
  c = pripravit({ priMazani: (x) => { x.ONLINE_STAV.soubor = 'CN-900.json'; x.ZAK = { cislo: 'CN-900', varianty: [{ id: 'j1' }] }; } });
  await smazat(c);
  test('mezitím otevřená jiná zakázka se nezavře', c.ZAK.cislo === 'CN-900' && c.ONLINE_STAV.soubor === 'CN-900.json', c.ZAK);
  c = pripravit({ vybrane: ['CN-432.json', 'CN-500.json'] });
  await smazat(c);
  test('hromadné smazání s otevřenou: zavřeno a hláška nese i souhrn', c.ZAK.varianty[0].id === 'n1'
    && c.log.includes('zprava:Kalkulace CN-432 byla smazána. Smazáno 2 zakázky.'), c.log.filter(x => x.startsWith('zprava')));

  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka', e && e.stack); process.exit(1); });
