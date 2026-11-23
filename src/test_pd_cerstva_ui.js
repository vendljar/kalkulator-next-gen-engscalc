/* PD #728 / #733 (J. V. 23. 11. 2026) — otevření kalkulace založené webhookem
 * Pipedrive v prohlížeči (src/ui/online_ui.js, funkce vyňaté do pískoviště):
 *   – #733: u čerstvé kalkulace (příznak pdCerstva) se platný online ceník
 *     nasadí HNED (progPouzij) — dřív než import, který z něj doplní ceník —
 *     a pak se kalkulace připraví jako Nová zakázka (pdCerstvaPriprav
 *     s výchozím zaškrtnutím z NAST.zobrazeni); bez platného ceníku se
 *     nepřipravuje; u ostatních zakázek se nic z toho neděje;
 *   – #728: z odkazu v dealu (?zakazka=) se čerstvá kalkulace otevře
 *     ODEMČENÁ — jen pokud ji uživatel smí odemknout; jinak (jiná cesta
 *     otevření, nečerstvá zakázka, cizí obchodník) jen ke čtení jako dřív.
 * Jádro přípravy a server hlídá netlify/test_pd_cerstva.mjs, celou cestu
 * v prohlížeči overit_pd_cerstva.mjs.
 * Pojistka: na 173ab6a (před opravou) sada padá (odkaz otevře zamčeně,
 * ceník se nenasadí, příprava se nevolá).
 * Spuštění: cd src && node test_pd_cerstva_ui.js */
const fs = require('fs');
const vm = require('vm');
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 600)); } };

const zdroj = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
/* Funkce na nejvyšší úrovni souboru: od hlavičky po první „}“ na začátku řádku. */
const vyjmi = (jmeno) => {
  const m = new RegExp('^(async )?function ' + jmeno + '\\(', 'm').exec(zdroj);
  if (!m) return '';
  const konec = zdroj.indexOf('\n}\n', m.index);
  return zdroj.slice(m.index, konec + 2);
};
const KOD = ['onlineCenikNasadHned', 'onlineCerstvaDopriprav', 'onlineObnovPosledni', 'onlineOtevri'].map(vyjmi);
test('funkce jsou v online_ui.js', KOD.every(Boolean), KOD.map(k => k.length));

function pripravit(volby) {
  const log = [];
  const ctx = {
    console, log, JSON, Promise, Object, Array, String,
    UKAZKOVE_CEKANI: { overujeOd: 1 },
    historieOznacUlozeno: () => log.push('oznacUlozeno'),
    ONLINE_STAV: { ja: volby.ja, db: volby.platny === false ? { platny: null } : { platny: { verze: 9 } }, rejstrik: [{ soubor: 'CN-1.json' }] },
    PROG_STAV: { pouzita: volby.nasazeno ? { verze: 9 } : null },
    NAST: { zobrazeni: { mat: 'M' } },
    ZAK: null,
    progJede: () => false,
    nahledJakykoli: () => !!volby.nahled,
    progPouzij: (p) => { log.push('progPouzij:' + p.verze); ctx.PROG_STAV.pouzita = { verze: p.verze }; },
    onlineApi: () => Promise.resolve({ zakazka: JSON.parse(JSON.stringify(volby.zakazka)) }),
    importZakazka: (z) => { log.push('import'); return z; },
    pdCerstvaPriprav: (z, o) => { log.push('priprav'); o.vychozi('OCK', 'PROJ'); delete z.pdCerstva; return 1; },
    zobrazeniVychoziAplikuj: (m, a, b) => log.push('vychozi:' + m.mat + ':' + a + ':' + b),
    zamekCteniSmiOdemknout: (z, ja) => !!ja && (ja.role === 'Administrátor' || ja.email === z.autor),
    zamekCteniZapni: () => log.push('zamek:zapni'),
    zamekCteniVypni: () => log.push('zamek:vypni'),
    syncVarianta: () => {}, onlinePoslednizapamatuj: () => {}, onlinePodpisZamkuPriprav: () => {},
    onlineZprava: (t) => log.push('zprava:' + t), renderOnlinePanel: () => {}, zavriOnline: () => {}, render: () => {},
    onlinePosledniZapamatovana: () => '', onlineOdkazZakazka: () => (volby.odkaz ? 'CN-1.json' : ''),
    uloSrovnejSPlatnymCenikem: () => { log.push('srovnej'); return null; },
  };
  vm.createContext(ctx);
  vm.runInContext(KOD.join('\n'), ctx, { filename: 'online_ui.js (výňatek)' });
  return ctx;
}
const ADMIN = { email: 'spravce@priklad.cz', role: 'Administrátor' };
const CIZI = { email: 'cizi@priklad.cz', role: 'Obchodník' };
const CERSTVA = { cislo: 'CN-1', autor: 'pipedrive-webhook', pdCerstva: true, varianty: [] };
const BEZNA = { cislo: 'CN-1', autor: 'pipedrive-webhook', varianty: [] };
const zamek = (log) => log.filter(x => x.startsWith('zamek:')).join();

(async () => {
  /* odkaz z dealu → onlineObnovPosledni → onlineOtevri(…, { zOdkazu: true }) */
  let c = pripravit({ ja: ADMIN, zakazka: CERSTVA, odkaz: true });
  await vm.runInContext('onlineObnovPosledni()', c);
  test('#728 odkaz z dealu + čerstvá kalkulace + smí odemknout → otevřena k úpravám', zamek(c.log) === 'zamek:vypni', c.log);
  test('#733 platný ceník nasazen PŘED importem, příprava po něm a před srovnáním s ceníkem',
    c.log.indexOf('progPouzij:9') >= 0 && c.log.indexOf('progPouzij:9') < c.log.indexOf('import')
    && c.log.indexOf('import') < c.log.indexOf('priprav') && c.log.indexOf('priprav') < c.log.indexOf('srovnej'), c.log);
  test('#733 výchozí zaškrtnutí z matice zobrazení (NAST.zobrazeni) na zadání OCK i PROJ', c.log.includes('vychozi:M:OCK:PROJ'), c.log);
  test('#733 věta v liště o přípravě', c.log.some(x => /připravena jako nová zakázka/.test(x)), c.log);

  c = pripravit({ ja: ADMIN, zakazka: CERSTVA, odkaz: true, nasazeno: true });
  await vm.runInContext('onlineObnovPosledni()', c);
  test('#733 už nasazená verze ceníku se znovu nenasazuje, příprava proběhne', !c.log.some(x => x.startsWith('progPouzij')) && c.log.includes('priprav'), c.log);

  c = pripravit({ ja: ADMIN, zakazka: CERSTVA, odkaz: true });
  await vm.runInContext('onlineObnovPosledni()', c);
  test('revize N3: nasazení HNED označí ceník jako nasazený (onlineTik ho nenasadí podruhé)',
    c.ONLINE_STAV.cenikPouzit === true && c.UKAZKOVE_CEKANI.overujeOd === null);

  c = pripravit({ ja: ADMIN, zakazka: CERSTVA, odkaz: true, platny: false });
  await vm.runInContext('onlineObnovPosledni()', c);
  test('#733 bez platného online ceníku se nepřipravuje (příznak zůstane)', !c.log.includes('priprav') && !c.log.some(x => x.startsWith('progPouzij'))
    && c.ZAK.pdCerstva === true, c.log);
  test('revize N1: nepřipravená čerstvá kalkulace zůstane jen ke čtení (i z odkazu)', zamek(c.log) === 'zamek:zapni', c.log);
  test('revize N1: … a lišta řekne proč', c.log.some(x => /čeká na platný ceník/.test(x)), c.log);
  /* Dopříprava po odloženém nasazení ceníku (onlineTik → onlineCerstvaDopriprav). */
  c.ONLINE_STAV.posledni = JSON.stringify(c.ZAK);
  c.log.length = 0;
  test('revize N1: po nasazení ceníku se nezměněná čerstvá kalkulace dopřipraví', vm.runInContext('onlineCerstvaDopriprav()', c) === 1
    && c.log.includes('priprav') && c.log.includes('srovnej') && c.ONLINE_STAV.posledni === JSON.stringify(c.ZAK) && c.log.includes('oznacUlozeno'), c.log);
  test('revize N1: dopříprava kalkulaci neodemkne', !c.log.some(x => x.startsWith('zamek:')), c.log);
  c.log.length = 0;
  test('revize N1: podruhé (příznak pryč) už nic', vm.runInContext('onlineCerstvaDopriprav()', c) === 0 && !c.log.includes('priprav'));
  c = pripravit({ ja: ADMIN, zakazka: CERSTVA, odkaz: true, platny: false });
  await vm.runInContext('onlineObnovPosledni()', c);
  c.ONLINE_STAV.posledni = '{"jina":1}'; c.log.length = 0;
  test('revize N1: změněnou kalkulaci (neuložená práce) dopříprava nepřepíše', vm.runInContext('onlineCerstvaDopriprav()', c) === 0 && !c.log.includes('priprav'), c.log);
  test('revize N1: onlineTik volá dopřípravu hned po nasazení ceníku',
    /progPouzij\(ONLINE_STAV\.db\.platny\);\s*onlineCerstvaDopriprav\(\);/.test(zdroj));

  c = pripravit({ ja: ADMIN, zakazka: CERSTVA, odkaz: true, nahled: true });
  await vm.runInContext('onlineObnovPosledni()', c);
  test('revize N4: v náhledu role / účtu se z odkazu neodemyká', zamek(c.log) === 'zamek:zapni', c.log);

  c = pripravit({ ja: ADMIN, zakazka: CERSTVA });
  await vm.runInContext("onlineOtevri('CN-1.json')", c);
  test('#728 jiná cesta otevření (Přehled, seznam) → jen ke čtení jako dřív', zamek(c.log) === 'zamek:zapni', c.log);
  test('#733 … příprava jako Nová zakázka proběhne i tak', c.log.includes('priprav'), c.log);

  c = pripravit({ ja: ADMIN, zakazka: BEZNA, odkaz: true });
  await vm.runInContext('onlineObnovPosledni()', c);
  test('#728 odkaz z dealu na kalkulaci, kterou už někdo uložil → jen ke čtení', zamek(c.log) === 'zamek:zapni', c.log);
  test('#733 … a nic se nepřipravuje ani nenasazuje navíc', !c.log.includes('priprav') && !c.log.some(x => x.startsWith('progPouzij')), c.log);

  c = pripravit({ ja: CIZI, zakazka: CERSTVA, odkaz: true });
  await vm.runInContext('onlineObnovPosledni()', c);
  test('#728 kdo odemknout nesmí, dostane i čerstvou kalkulaci jen ke čtení', zamek(c.log) === 'zamek:zapni', c.log);

  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})();
