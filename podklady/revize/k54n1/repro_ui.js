// Reprodukce: smazání otevřené → zavřeno → krok Zpět (Ctrl+Z) → uložení
const fs = require('fs'), vm = require('vm');
const R = process.argv[2];
const vyjmi = (zdroj) => (jm) => { const m = new RegExp('^(async )?function ' + jm + '\\(', 'm').exec(zdroj); if (!m) return '';   // funkce z dorevize ve starší verzi chybí
  return zdroj.slice(m.index, zdroj.indexOf('\n}\n', m.index) + 2); };
const ON = vyjmi(fs.readFileSync(R + '/src/ui/online_ui.js', 'utf8')), ZU = vyjmi(fs.readFileSync(R + '/src/ui/zakazka_ui.js', 'utf8')),
  UL = vyjmi(fs.readFileSync(R + '/src/ui/zakulozeni_ui.js', 'utf8')), HI = vyjmi(fs.readFileSync(R + '/src/ui/historie.js', 'utf8'));
const KOD = [ON('onlineSmazVybrane'), ON('onlineUloz'), ZU('zakNovaZakazkaProved'), UL('zakOdpojUlozeni'),
  HI('historieTik'), HI('historieObnov'), HI('historieZpet'), HI('historieZalohaZapis'), HI('historieZalohaCti'), HI('historieZapomen'), HI('historieZalohaHotovo'), HI('historieSkryjListu')].join('\n');
const sklad = {}; const odeslano = [], zpravy = [];
const ctx = { console, JSON, Promise, Object, Array, String, Date, setTimeout, clearTimeout,
  HIST: { posledni: null, zpet: [], znovu: [], probihaKrok: false, ulozenoJako: null, autoTimer: null, autoStav: '', nabidka: null },
  HIST_MAX: 40, HIST_KLIC: 'k', HIST_PRODLEVA: 1,
  Uloziste: { kDispozici: () => true, cti: k => sklad[k] || null, zapis: (k, v) => { sklad[k] = v; return true; }, smaz: k => { delete sklad[k]; } },
  ONLINE_STAV: { ja: { email: 'spravce@priklad.cz' }, soubor: 'CN-432.json', razitko: 'R1', posledni: 'x', timer: null, kolize: null,
    prehled: { vybrane: ['CN-432.json'] }, rejstrik: [{ soubor: 'CN-432.json', cislo: 'CN-432', odeslane: 1 }] },
  ULO_STAV: { soubor: '', timer: null }, NAST: { zobrazeni: {} },
  ZAK: { cislo: 'CN-432', nazevAkce: 'Akce', uloRazitko: 'R1', varianty: [{ id: 'v1', zamek: { zamceno: true } }], protokol: ['stary'] },
  jeAdminOnline: () => true, potvrd: async () => true, hlaska: () => {},
  novaZakazka: () => ({ cislo: '', nazevAkce: '', varianty: [{ id: 'n1' }] }), importZakazka: z => z,
  syncVarianta: () => {}, prepniTab: () => {}, historieTlacitka: () => {}, historieZalohaNaplanuj: () => {}, historieListaPrekresli: () => {},
  historieNeulozeno: () => true, historieOznacUlozeno: () => {}, zamekCteniVypni: () => {}, onlinePoslednizapamatuj: () => {},
  zakUlozeniZprava: () => {}, seznamReset: () => {}, onlineZprava: t => zpravy.push(t), onlineNactiRejstrik: () => Promise.resolve(),
  onlineSlevyOtisk: () => '', onlineSlevyZeServeru: () => {}, onlineChybaText: e => e.message, onlineZamekNesouhlasi: () => false,
  HIST_ODLOZENO_KLIC: 'o', uloJmenoSouboru: z => String((z && z.cislo) || '') + '.json',
  uloCisloVyplneno: x => !!String(x || '').trim(),
  uloZalohaSmiPrepsat: (s, c) => { const p = !c.cislo && !c.nazevAkce; if (!p) return true; return !(s && s.zakazka && (s.cislo || s.nazevAkce)); },
  onlineApi: (url, telo, m) => { if (m === 'DELETE') return Promise.resolve({ ok: true }); odeslano.push(JSON.parse(JSON.stringify(telo))); return Promise.resolve({ ok: true, soubor: 'CN-432.json', razitko: 'R2' }); },
};
ctx.render = () => vm.runInContext('historieTik()', ctx);
vm.createContext(ctx); vm.runInContext(KOD, ctx);
(async () => {
  ctx.render();                                  // první render: otisk otevřené kalkulace
  ctx.ZAK.poznamka = 'neuložená úprava'; ctx.render(); vm.runInContext('historieZalohaZapis()', ctx);   // rozpracovaná práce → záloha v prohlížeči
  await vm.runInContext('onlineSmazVybrane()', ctx); await new Promise(r => setTimeout(r, 30));
  console.log('po smazání: ZAK.cislo=' + JSON.stringify(ctx.ZAK.cislo), '| zpráva:', zpravy[zpravy.length - 1], '| kroků Zpět:', ctx.HIST.zpet.length);
  vm.runInContext('historieZalohaZapis()', ctx);
  const zal = JSON.parse(sklad.k || 'null');
  console.log('záloha v prohlížeči po zavření: cislo=' + (zal && zal.cislo), '| nese starou kopii:', !!(zal && /"protokol":\["stary"\]/.test(zal.zakazka)));
  vm.runInContext('historieZpet()', ctx);        // Ctrl+Z
  console.log('po Zpět: ZAK.cislo=' + ctx.ZAK.cislo, '| zamčená varianta:', !!ctx.ZAK.varianty[0].zamek, '| ONLINE_STAV.soubor=' + JSON.stringify(ctx.ONLINE_STAV.soubor));
  await vm.runInContext('onlineUloz({})', ctx);
  const t = odeslano[0];
  console.log('odesláno: ocekavaneRazitko=' + JSON.stringify(t.ocekavaneRazitko), 'ocekavanySoubor=' + JSON.stringify(t.ocekavanySoubor),
    '| zakazka.cislo=' + t.zakazka.cislo, '| protokol:', JSON.stringify(t.zakazka.protokol), '| zámek:', !!t.zakazka.varianty[0].zamek);
})();
