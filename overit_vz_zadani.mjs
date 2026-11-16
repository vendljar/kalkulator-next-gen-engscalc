/* Ověření v prohlížeči: VÍC ZÁKAZNÍKŮ NA ZAKÁZCE — OBRAZOVKA
 * (VZ #600, etapa E1; návrh podklady/NAVRH_VICE_ZAKAZNIKU.md v3 § 2a, § 6,
 * § 8, prompt podklady/PROMPT_VZ_E1.md, oddíl Testy).
 *
 * Co se hlídá:
 *  1. VYPNUTO: hlavička OCK (#kalk-hlavicka), #inputs, #outputs a karta
 *     Přehled (#page-zakazka) ZNAK PO ZNAKU jako výchozí sestava
 *     (KNG_DIST_ZAKLAD = dist sestavený z e29f2b1, před E1; bez něj se
 *     srovnání přeskočí a hlásí SKIP).
 *  2. ZAPNUTO + 1 zákazník: hlavička = základ po odebrání jediného tlačítka
 *     „Přidat zákazníka" (.vz-pridat); žádná karta ani přepínač; řádek
 *     Zákazník stejně vysoký jako Kontaktní osoba a IČO, pole Zákazník
 *     aspoň 110 px při 1200 / 1440 / 1920 px; 400 px bez vodorovného posuvu.
 *  3. Tlačítko chybí s VYP, u prodané zakázky a v režimu jen ke čtení.
 *  4. Formulář „Nový zákazník": Přidat zhasnuté bez názvu, Zrušit nic nemění.
 *  5. ARES ve formuláři (podvržený fetch, síť se nevolá nikdy): panel
 *     „Ve formuláři teď" / „Převzít údaje do formuláře (N)", údaje jdou do
 *     formuláře, ne do hlavičky; prázdné / neplatné IČO (fetch se nezavolá),
 *     404, výpadek, zaniklý subjekt.
 *  6. ARES v hlavičce u řídícího beze změny („V hlavičce teď").
 *  7. Přidání (stejná i vlastní varianta): přepínač, karta OCK i v Přehledu,
 *     ZAK.vzRidici a ZAK.dalsiZakaznici vzniknou.
 *  8. Otevřený další zákazník: hlavička ukazuje jeho údaje, zápis (Zákazník,
 *     Kontaktní osoba, ARES) jde do jeho položky, řídící beze změny.
 *  9. Odstranění: řídící zhasnutý; potvrzení na stránce (ne confirm),
 *     Zrušit nic nemění; vlastní varianta smazat / ponechat; po posledním
 *     je hlavička znak po znaku jako před přidáním (bez počítadla Zpět/Znovu)
 *     a klíče vzRidici / dalsiZakaznici v ZAK nejsou.
 * 10. Zpět / Znovu po přidání.
 * 11. VYP + zakázka s dalšími zákazníky (R21): karta s větou „funkce je
 *     vypnutá", tlačítka zhasnutá, v hlavičce řídící, zápis odmítnut.
 * 12. Sloupec Zákazník v „Kalkulace v zakázce": u 2+ odvozený a jen ke čtení.
 * 13. 400 / 1200 / 1920 px se 2 zákazníky a otevřeným formulářem bez
 *     vodorovného posuvu.
 * 14. Žádná chyba stránky (pageerror) v celém běhu.
 * XSS v názvu / IČO / kontaktu dalšího zákazníka hlídá overit_xss.mjs.
 *
 * Pojistka: na e29f2b1 (před E1) selže (tlačítko, formulář ani karta
 * neexistují) — KNG_DIST=<zaklad_e29f2b1.html> node overit_vz_zadani.mjs.
 * Spuštění: node overit_vz_zadani.mjs  (KNG_DIST, KNG_DIST_ZAKLAD) */
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright není k dispozici.'); process.exit(2); }
const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = process.env.KNG_DIST ? pathToFileURL(process.env.KNG_DIST).href
  : new URL('dist/kalkulacka.html', import.meta.url).href;
const ZAKLAD = process.env.KNG_DIST_ZAKLAD && fs.existsSync(process.env.KNG_DIST_ZAKLAD)
  ? pathToFileURL(process.env.KNG_DIST_ZAKLAD).href : null;
const ZC = require(KOREN + 'src/zkusebni_cenik.js');

let ok = 0, fail = 0, preskoc = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const vsechnyChyby = [];

/* Smyšlená odpověď rejstříku (tvar ARES API, viz src/test_ares.js).
 * IČO 25596641 a 00000019 mají platnou kontrolní číslici. */
const ARES_ODP = {
  ico: '25596641',
  obchodniJmeno: 'Zkušební strojírny s.r.o.',
  sidlo: {
    kodStatu: 'CZ', nazevStatu: 'Česká republika', nazevObce: 'Brno', nazevCastiObce: 'Černovice',
    nazevUlice: 'Vlárská', cisloDomovni: 22, cisloOrientacni: 3, psc: 61800,
    textovaAdresa: 'Vlárská 22/3, Černovice, 618 00 Brno',
  },
  pravniForma: '112', dic: 'CZ25596641', datumVzniku: '1999-04-01',
};

const b = await chromium.launch({ args: ['--no-sandbox'] });

async function otevri(url, { width = 1440, zap = false } = {}) {
  const ctx = await b.newContext({ locale: 'cs-CZ', viewport: { width, height: 950 } });
  const p = await ctx.newPage();
  const chyby = [];
  p.on('pageerror', e => { chyby.push(String(e)); vsechnyChyby.push(String(e).slice(0, 200)); });
  await p.goto(url);
  await p.waitForFunction(() => typeof window.render === 'function');
  await p.waitForTimeout(300);
  await p.evaluate(([c, cp, zap, ares]) => {
    Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
    Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
    window.__hl = [];
    window.hlaska = (t) => { window.__hl.push(String(t)); return Promise.resolve(); };
    window.potvrd = () => Promise.resolve(true);
    window.__confirm = 0;
    window.confirm = () => { window.__confirm++; return true; };
    /* Síť se nevolá nikdy: fetch odpovídá podle window.__fetchOdp. */
    window.__fetch = [];
    window.__fetchOdp = 'vyjimka';
    window.__aresOdp = ares;
    window.fetch = async (url) => {
      window.__fetch.push(String(url));
      const o = window.__fetchOdp;
      if (o === 'vyjimka') throw new TypeError('Failed to fetch');
      return { status: o.status, ok: o.status >= 200 && o.status < 300, json: async () => JSON.parse(JSON.stringify(o.json)) };
    };
    if (zap) window.viceZakaznikuZapnuto = () => true;
    ZAK = novaZakazka();
    ZAK.varianty[0].id = 'v1'; ZAK.aktivni = 'v1';
    Object.assign(ZAK, { objednatel: 'Řídící firma s.r.o.', kontakt: 'Ing. Zkušební', ico: '25596641' });
    syncVarianta();
    Object.assign(Z, { sirka: 1.6, hloubka: 2.1, zdvih: 12, prejezd: 2.7, prohluben: 1.05 });
    OCK.fixes = true;
    prepniTab('kalk'); render();
  }, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj(), zap, ARES_ODP]);
  await p.waitForTimeout(150);
  return { ctx, p, chyby };
}

/* Obsah obrazovky ke srovnání se základem. Hlavička se bere i v Přehledu. */
const obrazovka = async (p) => {
  const r = await p.evaluate(() => {
    const g = id => (document.getElementById(id) || {}).innerHTML || '';
    return { hlavicka: g('kalk-hlavicka'), inputs: g('inputs'), outputs: g('outputs') };
  });
  await p.evaluate(() => { prepniTab('zakazka'); render(); });
  await p.waitForTimeout(100);
  r.zakazka = await p.evaluate(() => (document.getElementById('page-zakazka') || {}).innerHTML || '');
  await p.evaluate(() => { prepniTab('kalk'); render(); });
  await p.waitForTimeout(100);
  return r;
};
/* Hlavička OCK bez tlačítka „Přidat zákazníka" (bezPridat) a s maskovaným
 * počítadlem kroků v Zpět / Znovu (maskHist). */
const hlavicka = (p, { bezPridat = false, maskHist = false } = {}) => p.evaluate(([bp, mh]) => {
  const el = document.getElementById('kalk-hlavicka');
  if (!el) return '';
  const c = el.cloneNode(true);
  if (bp) c.querySelectorAll('.vz-pridat').forEach(e => e.remove());
  if (mh) c.querySelectorAll('.jsHistZpet, .jsHistZnovu').forEach(e => {
    e.removeAttribute('title'); e.removeAttribute('disabled'); e.textContent = '';
  });
  return c.innerHTML;
}, [bezPridat, maskHist]);

/* Pole hlavičky OCK podle popisku (mimo formulář nového zákazníka). */
const POLE_JS = `window.__vzRadek = (popis) => [...document.querySelectorAll('#kalk-hlavicka .zak-head-col .row')]
  .find(r => { const l = r.querySelector(':scope > label'); return l && !r.closest('#vzFormular')
    && l.textContent.trim().replace(/\\s+/g, ' ').indexOf(popis) === 0; }) || null;
window.__vzPole = (popis) => { const r = window.__vzRadek(popis); return r ? r.querySelector('input') : null; };
window.__vzTl = (id, txt) => { const r = document.querySelector('#vzKarta_ock tr[data-vz="' + id + '"]');
  const a = r && r.nextElementSibling; return a ? [...a.querySelectorAll('button')].find(x => x.textContent.trim() === txt) || null : null; };`;
const pomocnici = (p) => p.evaluate(POLE_JS);

/* Zapíše text do pole (označeného data-vzt) a odejde Tabem (change). */
async function zapisPole(p, popis, txt) {
  const ok = await p.evaluate((ps) => { const i = window.__vzPole(ps); if (!i) return false;
    document.querySelectorAll('[data-vzt]').forEach(e => e.removeAttribute('data-vzt')); i.setAttribute('data-vzt', '1'); return true; }, popis);
  if (!ok) return false;
  await p.fill('[data-vzt="1"]', txt);
  await p.keyboard.press('Tab');
  await p.waitForTimeout(150);
  return true;
}
async function klik(p, sel) {
  try { await p.click(sel, { timeout: 3000 }); await p.waitForTimeout(150); return true; }
  catch (e) { return false; }
}
/* Klik na ARES v rozsahu (formulář / hlavička) a čekání na odpověď. */
async function aresKlik(p, veFormulari) {
  const ok = await p.evaluate((f) => {
    const kde = f ? '#vzFormular' : '#kalk-hlavicka';
    const tl = [...document.querySelectorAll(kde + ' button')].filter(x => (f || !x.closest('#vzFormular')) && /Najít firmu v ARES/.test(x.textContent))[0];
    if (!tl || tl.disabled) return false;
    tl.click(); return true;
  }, veFormulari);
  if (!ok) return false;
  await p.waitForFunction(() => !ARES.hleda, null, { timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(120);
  return true;
}
const aresPanelText = (p, vf) => p.evaluate((f) => {
  const el = [...document.querySelectorAll((f ? '#vzFormular' : '#kalk-hlavicka') + ' .ares-panel')].filter(x => f || !x.closest('#vzFormular'))[0];
  return el ? el.textContent.replace(/\s+/g, ' ') : '';
}, vf);
const bezPosuvu = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

/* Přidá dalšího zákazníka formulářem (klikem, jako uživatel). */
async function pridejFormularem(p, nazev, vlastni) {
  await p.evaluate(() => vzFormOtevri('ock'));
  await p.waitForTimeout(120);
  await p.fill('#vzF_objednatel', nazev).catch(() => {});
  await p.keyboard.press('Tab');
  await p.waitForTimeout(150);
  if (vlastni) await klik(p, '#vzFormular input[name="vzFormNova"][value="vlastni"]');
  return klik(p, '#vzFormPridej');
}

/* ---------- 1: VYP = základ znak po znaku ---------- */
let sVyp;
{
  const vyp = await otevri(KDE);
  sVyp = await obrazovka(vyp.p);
  test('VYP: žádné tlačítko „Přidat zákazníka", přepínač ani karta', await vyp.p.evaluate(() =>
    !document.querySelector('.vz-pridat') && !document.querySelector('[id^="vzPrepinac_"]') && !document.querySelector('[id^="vzKarta_"]')));
  if (ZAKLAD) {
    const z = await otevri(ZAKLAD);
    const sZ = await obrazovka(z.p);
    test('VYP: #kalk-hlavicka znak po znaku jako e29f2b1', sVyp.hlavicka === sZ.hlavicka, sVyp.hlavicka.length + ' / ' + sZ.hlavicka.length);
    test('VYP: #inputs znak po znaku jako e29f2b1', sVyp.inputs === sZ.inputs, sVyp.inputs.length + ' / ' + sZ.inputs.length);
    test('VYP: #outputs znak po znaku jako e29f2b1', sVyp.outputs === sZ.outputs, sVyp.outputs.length + ' / ' + sZ.outputs.length);
    test('VYP: Přehled (#page-zakazka) znak po znaku jako e29f2b1', sVyp.zakazka === sZ.zakazka, sVyp.zakazka.length + ' / ' + sZ.zakazka.length);
    await z.ctx.close();
  } else { preskoc++; console.log('SKIP srovnání se základem e29f2b1 (KNG_DIST_ZAKLAD)'); }

  /* 3: tlačítko není u prodané zakázky ani jen ke čtení (ZAP) */
  await vyp.ctx.close();
}

/* ---------- 2: ZAP + 1 zákazník ---------- */
{
  const zap = await otevri(KDE, { zap: true });
  await pomocnici(zap.p);
  test('ZAP + 1: v hlavičce OCK právě jedno tlačítko „Přidat zákazníka" (#vzPridat_ock)', await zap.p.evaluate(() =>
    document.querySelectorAll('#kalk-hlavicka .vz-pridat').length === 1 && !!document.getElementById('vzPridat_ock')
    && /Přidat zákazníka/.test(document.getElementById('vzPridat_ock').textContent)));
  test('ZAP + 1: tlačítko stojí za popiskem Zákazník, ne v něm', await zap.p.evaluate(() => {
    const t = document.getElementById('vzPridat_ock'); return !!t && t.previousElementSibling && t.previousElementSibling.tagName === 'LABEL'
      && t.previousElementSibling.textContent.trim() === 'Zákazník'; }));
  test('ZAP + 1: žádná karta (#vzKarta_ock) ani přepínač', await zap.p.evaluate(() =>
    !document.getElementById('vzKarta_ock') && !document.getElementById('vzPrepinac_ock') && !document.querySelector('.vz-prepinac-radek')));
  const sZap = await obrazovka(zap.p);
  test('ZAP + 1: hlavička = VYP po odebrání tlačítka', (await hlavicka(zap.p, { bezPridat: true })) === sVyp.hlavicka);
  test('ZAP + 1: #inputs, #outputs a Přehled shodné s VYP', sZap.inputs === sVyp.inputs && sZap.outputs === sVyp.outputs && sZap.zakazka === sVyp.zakazka);
  test('ZAP + 1: Přehled bez karty Zákazníci zakázky, sloupec Zákazník = dnešní pole', !/vzKarta_zakazka/.test(sZap.zakazka)
    && !/vz-odvozeno/.test(sZap.zakazka) && /placeholder="varianta zákazníka"/.test(sZap.zakazka));
  for (const w of [1200, 1440, 1920]) {
    await zap.p.setViewportSize({ width: w, height: 950 });
    await zap.p.waitForTimeout(120);
    const r = await zap.p.evaluate(() => {
      const v = (ps) => { const x = window.__vzRadek(ps); return x ? Math.round(x.getBoundingClientRect().height) : -1; };
      const pole = window.__vzPole('Zákazník');
      return { zak: v('Zákazník'), kontakt: v('Kontaktní osoba'), ico: v('IČO zákazníka'),
        sirka: pole ? Math.round(pole.getBoundingClientRect().width) : -1 };
    });
    test(`ZAP + 1, ${w} px: řádek Zákazník stejně vysoký jako Kontaktní osoba a IČO, pole ≥ 110 px`,
      r.zak > 0 && Math.abs(r.zak - r.kontakt) <= 1 && Math.abs(r.zak - r.ico) <= 1 && r.sirka >= 110, r);
  }
  await zap.p.setViewportSize({ width: 400, height: 900 });
  await zap.p.waitForTimeout(150);
  test('ZAP + 1, 400 px: bez vodorovného posuvu stránky', await bezPosuvu(zap.p),
    await zap.p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]));
  await zap.p.setViewportSize({ width: 1440, height: 950 });

  /* 3: prodaná zakázka, jen ke čtení */
  await zap.p.evaluate(() => {
    const v = ZAK.varianty[0];
    v.zamek = { zamceno: true, kdo: 'zkouska', kdy: '2026-11-01T10:00:00.000Z', duvod: 'tisk' };
    v.prodano = { datum: '2026-11-02', kdo: 'zkouska', kdy: '2026-11-02T10:00:00.000Z' };
    render();
  });
  test('prodaná zakázka: tlačítko „Přidat zákazníka" není', await zap.p.evaluate(() => variantaProdana(ZAK.varianty[0]) && !document.querySelector('.vz-pridat')));
  await zap.p.evaluate(() => { delete ZAK.varianty[0].prodano; delete ZAK.varianty[0].zamek; render(); });
  test('po zrušení prodeje se tlačítko vrátí', await zap.p.evaluate(() => !!document.getElementById('vzPridat_ock')));
  await zap.p.evaluate(() => { zamekCteniZapni(); render(); });
  test('jen ke čtení: tlačítko „Přidat zákazníka" není', await zap.p.evaluate(() => !document.querySelector('.vz-pridat')));
  await zap.p.evaluate(() => { __hl.length = 0; const pr = JSON.stringify(ZAK); vzFormOtevri('ock'); window.__pr = pr; });
  test('jen ke čtení: vzFormOtevri formulář neotevře', await zap.p.evaluate(() => !document.getElementById('vzFormular') && JSON.stringify(ZAK) === window.__pr));
  await zap.p.evaluate(() => { zamekCteniVypni(); if (typeof ZAMEK_CTENI !== 'undefined') ZAMEK_CTENI.dialog = false; render(); });
  await zap.ctx.close();
}

/* ---------- 4–10, 12, 13: ZAP, jedna stránka ---------- */
{
  const { ctx, p } = await otevri(KDE, { zap: true });
  await pomocnici(p);

  /* 4: formulář */
  const pred = await p.evaluate(() => JSON.stringify(ZAK));
  const otevren = await klik(p, '#vzPridat_ock');
  test('klik na „Přidat zákazníka" otevře formulář #vzFormular', otevren && await p.evaluate(() => !!document.getElementById('vzFormular')));
  test('formulář: „Přidat zákazníka" (#vzFormPridej) bez názvu zhasnuté', await p.evaluate(() => {
    const t = document.getElementById('vzFormPridej'); return !!t && t.disabled; }));
  test('formulář: tlačítko v hlavičce je při otevřeném formuláři zhasnuté', await p.evaluate(() => {
    const t = document.getElementById('vzPridat_ock'); return !t || t.disabled; }));
  await p.fill('#vzF_objednatel', 'Druhý zákazník s.r.o.').catch(() => {});
  test('formulář: po napsání názvu se „Přidat zákazníka" rozsvítí', await p.evaluate(() => {
    const t = document.getElementById('vzFormPridej'); return !!t && !t.disabled; }));
  await klik(p, '#vzFormZrus');
  test('Zrušit: formulář zmizí', await p.evaluate(() => !document.getElementById('vzFormular') && !VZ_UI.form));
  test('Zrušit: ZAK je beze změny', await p.evaluate((pr) => JSON.stringify(ZAK) === pr, pred),
    await p.evaluate((pr) => { const a = JSON.parse(pr), o = [];
      const w = (x, y, k) => { if (JSON.stringify(x) === JSON.stringify(y)) return;
        if (x && y && typeof x === 'object' && typeof y === 'object') new Set([...Object.keys(x), ...Object.keys(y)]).forEach(kk => w(x[kk], y[kk], k + '.' + kk));
        else o.push(k + ': ' + JSON.stringify(x) + ' → ' + JSON.stringify(y)); };
      w(a, JSON.parse(JSON.stringify(ZAK)), 'ZAK'); return o; }, pred));

  /* 5: ARES ve formuláři */
  await p.evaluate(() => vzFormOtevri('ock'));
  await p.waitForTimeout(120);
  test('formulář: prázdné IČO → tlačítko ARES zhasnuté', await p.evaluate(() => {
    const t = [...document.querySelectorAll('#vzFormular button')].find(x => /Najít firmu v ARES/.test(x.textContent));
    return !!t && t.disabled; }));
  const zakPredAres = await p.evaluate(() => JSON.stringify(ZAK));
  await p.fill('#vzF_ico', '12345678'); await p.keyboard.press('Tab'); await p.waitForTimeout(150);
  await p.evaluate(() => { window.__fetch.length = 0; });
  await aresKlik(p, true);
  let t = await aresPanelText(p, true);
  test('formulář: neplatné IČO → hláška o kontrolní číslici, fetch se nezavolá', /kontrolní číslici/.test(t)
    && await p.evaluate(() => window.__fetch.length === 0), t);
  await p.fill('#vzF_ico', '25596641'); await p.keyboard.press('Tab'); await p.waitForTimeout(150);
  await p.evaluate(() => { window.__fetchOdp = { status: 404, json: {} }; });
  await aresKlik(p, true);
  t = await aresPanelText(p, true);
  test('formulář: 404 → „žádný subjekt nevede"', /žádný subjekt nevede/.test(t) && await p.evaluate(() => window.__fetch.length === 1), t);
  await p.evaluate(() => { window.__fetchOdp = 'vyjimka'; });
  await aresKlik(p, true);
  t = await aresPanelText(p, true);
  test('formulář: výjimka fetch → hláška o nedostupnosti rejstříku', /nedá dosáhnout/.test(t), t);
  await p.evaluate(() => { window.__fetchOdp = { status: 200, json: Object.assign({}, window.__aresOdp, { datumZaniku: '2020-01-31' }) }; });
  await aresKlik(p, true);
  t = await aresPanelText(p, true);
  test('formulář: zaniklý subjekt → varování', /zaniklý/.test(t) && /2020-01-31/.test(t), t);
  await p.evaluate(() => { window.__fetchOdp = { status: 200, json: window.__aresOdp }; });
  await aresKlik(p, true);
  t = await aresPanelText(p, true);
  const prevz = await p.evaluate(() => { const x = document.querySelector('#vzFormular .ares-panel button.primary'); return x ? x.textContent.trim() : ''; });
  test('formulář: odpověď s firmou → tabulka se sloupcem „Ve formuláři teď"', /Ve formuláři teď/.test(t) && !/V hlavičce teď/.test(t)
    && await p.evaluate(() => !!document.querySelector('#vzFormular .ares-panel table.ares-tab')), t);
  test('formulář: tlačítko „Převzít údaje do formuláře (N)"', /^Převzít údaje do formuláře \(\d+\)$/.test(prevz), prevz);
  test('formulář: panel ARES jen ve formuláři, ne pod hlavičkou', await p.evaluate(() =>
    [...document.querySelectorAll('#kalk-hlavicka .ares-panel')].every(x => x.closest('#vzFormular'))));
  await klik(p, '#vzFormular .ares-panel button.primary');
  const fh = await p.evaluate(() => ({ h: VZ_UI.form && VZ_UI.form.h, pole: (document.getElementById('vzF_objednatel') || {}).value,
    sidlo: (document.getElementById('vzF_adresaObjednatele') || {}).value, pridej: !(document.getElementById('vzFormPridej') || {}).disabled }));
  test('převzetí: údaje z ARES jsou ve formuláři', fh.h && fh.h.objednatel === 'Zkušební strojírny s.r.o.' && fh.pole === 'Zkušební strojírny s.r.o.'
    && /Vlárská 22\/3/.test(fh.sidlo) && fh.h.dic === 'CZ25596641' && fh.pridej, fh);
  test('převzetí: hlavička zakázky (ZAK) beze změny', await p.evaluate((pr) => JSON.stringify(ZAK) === pr && ZAK.objednatel === 'Řídící firma s.r.o.', zakPredAres));
  await klik(p, '#vzFormZrus');
  test('ARES ve formuláři: síť se nevolala, jen podvržený fetch', await p.evaluate(() => window.__fetch.every(u => /25596641/.test(u))));

  /* 6: ARES v hlavičce u řídícího */
  await p.evaluate(() => { window.__fetchOdp = { status: 200, json: window.__aresOdp }; });
  await aresKlik(p, false);
  t = await aresPanelText(p, false);
  const prep = await p.evaluate(() => { const x = [...document.querySelectorAll('#kalk-hlavicka .ares-panel button.primary')][0]; return x ? x.textContent.trim() : ''; });
  test('hlavička OCK (řídící): panel ARES má „V hlavičce teď" a „Přepsat údaje v hlavičce (N)"',
    /V hlavičce teď/.test(t) && /^Přepsat údaje v hlavičce \(\d+\)$/.test(prep) && /zapíše se do protokolu zakázky/.test(t), [t.slice(0, 200), prep]);
  await p.evaluate(() => aresZavri());
  await p.waitForTimeout(100);

  /* 7: přidání — stejná varianta */
  const hlPred = await hlavicka(p, { maskHist: true });
  const zakPred = await p.evaluate(() => JSON.stringify(ZAK));
  await pridejFormularem(p, 'Druhý zákazník s.r.o.', false);
  let s = await p.evaluate(() => ({ ridici: ZAK.vzRidici, dalsi: ZAK.dalsiZakaznici, form: !!document.getElementById('vzFormular'),
    prep: !!document.getElementById('vzPrepinac_ock'), karta: !!document.getElementById('vzKarta_ock'), objednatel: ZAK.objednatel }));
  test('přidání: ZAK.vzRidici a ZAK.dalsiZakaznici vzniknou (stejná varianta v1)', s.ridici && s.ridici.id === 'z1' && s.ridici.varianta === 'v1'
    && Array.isArray(s.dalsi) && s.dalsi.length === 1 && s.dalsi[0].varianta === 'v1' && s.dalsi[0].hlavicka.objednatel === 'Druhý zákazník s.r.o.', s);
  test('přidání: přepínač #vzPrepinac_ock a karta #vzKarta_ock, formulář zavřený, řídící v hlavičce', s.prep && s.karta && !s.form
    && s.objednatel === 'Řídící firma s.r.o.' && await p.evaluate(() => window.__vzPole('Zákazník').value === 'Řídící firma s.r.o.'), s);
  test('přidání: tlačítko „Přidat zákazníka" vedle popisku zmizelo (je „+" v přepínači)', await p.evaluate(() =>
    !document.getElementById('vzPridat_ock') && !!document.querySelector('#vzPrepinac_ock .vz-chip-plus')));
  await p.evaluate(() => { prepniTab('zakazka'); render(); });
  await p.waitForTimeout(100);
  test('přidání: karta Zákazníci zakázky i v Přehledu (#vzKarta_zakazka)', await p.evaluate(() => !!document.getElementById('vzKarta_zakazka')));
  /* 12: sloupec Zákazník v seznamu variant */
  s = await p.evaluate(() => [...document.querySelectorAll('#page-zakazka input.vz-odvozeno')].map(i => ({ v: i.value, ro: i.readOnly })));
  test('2 zákazníci: sloupec Zákazník v „Kalkulace v zakázce" jen ke čtení s názvy (vz-odvozeno)', s.length === 1 && s[0].ro
    && /Řídící firma s\.r\.o\./.test(s[0].v) && /Druhý zákazník s\.r\.o\./.test(s[0].v)
    && await p.evaluate(() => !document.querySelector('#page-zakazka input[placeholder="varianta zákazníka"]')), s);
  await p.evaluate(() => { prepniTab('kalk'); render(); });
  await p.waitForTimeout(100);

  /* 7: přidání — vlastní varianta */
  await pridejFormularem(p, 'Třetí zákazník a.s.', true);
  s = await p.evaluate(() => ({ dalsi: ZAK.dalsiZakaznici, var: ZAK.varianty.map(v => v.id) }));
  test('vlastní varianta: nová varianta a zákazník na ni ukazuje', s.dalsi && s.dalsi.length === 2 && s.var.length === 2
    && s.dalsi[1].varianta !== 'v1' && s.var.indexOf(s.dalsi[1].varianta) >= 0, s);

  /* 13: šířky se 2+ zákazníky a otevřeným formulářem */
  await p.evaluate(() => vzFormOtevri('ock'));
  for (const w of [400, 1200, 1920]) {
    await p.setViewportSize({ width: w, height: 950 });
    await p.waitForTimeout(150);
    test(`${w} px, 3 zákazníci + otevřený formulář: bez vodorovného posuvu`, await bezPosuvu(p),
      await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]));
  }
  await p.setViewportSize({ width: 1440, height: 950 });
  await klik(p, '#vzFormZrus');

  /* 8: otevření dalšího zákazníka (klik na chip) */
  const chipOk = await p.evaluate(() => {
    const c = [...document.querySelectorAll('#vzPrepinac_ock .vz-chip')].find(x => /Druhý zákazník/.test(x.textContent));
    if (!c) return false; c.click(); return true; });
  await p.waitForTimeout(150);
  s = await p.evaluate(() => ({ ot: VZ_UI.otevreny, zak: (window.__vzPole('Zákazník') || {}).value,
    kontakt: (window.__vzPole('Kontaktní osoba') || {}).value, ico: (window.__vzPole('IČO zákazníka') || {}).value,
    on: (document.querySelector('#vzPrepinac_ock .vz-chip.on') || {}).textContent }));
  test('klik na chip otevře dalšího zákazníka: hlavička ukazuje jeho údaje', chipOk && s.ot === 'z2' && s.zak === 'Druhý zákazník s.r.o.'
    && s.kontakt === '' && s.ico === '' && /Druhý zákazník/.test(s.on || ''), s);
  await zapisPole(p, 'Kontaktní osoba', 'Ing. Druhý');
  s = await p.evaluate(() => ({ d: ZAK.dalsiZakaznici[0].hlavicka.kontakt, r: ZAK.kontakt }));
  test('úprava Kontaktní osoby jde do položky dalšího zákazníka, řídící beze změny', s.d === 'Ing. Druhý' && s.r === 'Ing. Zkušební', s);
  await zapisPole(p, 'Zákazník', 'Druhý zákazník — pobočka');
  s = await p.evaluate(() => ({ d: ZAK.dalsiZakaznici[0].hlavicka.objednatel, r: ZAK.objednatel }));
  test('úprava pole Zákazník jde do položky dalšího zákazníka, řídící beze změny', s.d === 'Druhý zákazník — pobočka' && s.r === 'Řídící firma s.r.o.', s);
  await zapisPole(p, 'IČO zákazníka', '25596641');
  s = await p.evaluate(() => ({ d: ZAK.dalsiZakaznici[0].hlavicka.ico, r: ZAK.ico }));
  test('úprava IČO jde do položky dalšího zákazníka', s.d === '25596641' && s.r === '25596641', s);
  await p.evaluate(() => { window.__fetchOdp = { status: 200, json: window.__aresOdp }; });
  await aresKlik(p, false);
  await klik(p, '#kalk-hlavicka .ares-panel button.primary');
  s = await p.evaluate(() => ({ d: ZAK.dalsiZakaznici[0].hlavicka, r: { o: ZAK.objednatel, a: ZAK.adresaObjednatele, dic: ZAK.dic } }));
  test('ARES v hlavičce s otevřeným dalším zákazníkem zapisuje do jeho položky', s.d.objednatel === 'Zkušební strojírny s.r.o.'
    && /Vlárská/.test(s.d.adresaObjednatele) && s.d.dic === 'CZ25596641' && s.r.o === 'Řídící firma s.r.o.' && !/Vlárská/.test(s.r.a || '') && !s.r.dic, s);
  await p.evaluate(() => vzOtevri('z1'));
  test('otevření řídícího: hlavička zase ukazuje řídícího', await p.evaluate(() => window.__vzPole('Zákazník').value === 'Řídící firma s.r.o.'
    && window.__vzPole('Kontaktní osoba').value === 'Ing. Zkušební'));

  /* 9: odstranění */
  test('Odstranit u řídícího zhasnuté', await p.evaluate(() => { const x = window.__vzTl('z1', 'Odstranit'); return !!x && x.disabled; }));
  await p.evaluate(() => window.__vzTl('z2', 'Odstranit').click());
  await p.waitForTimeout(120);
  const zakPredOdstr = await p.evaluate(() => JSON.stringify(ZAK));
  test('Odstranit u dalšího: potvrzení na stránce (#vzOdstranPotvrzeni), ne confirm()', await p.evaluate(() =>
    !!document.getElementById('vzOdstranPotvrzeni') && window.__confirm === 0
    && /Odstranit zákazníka Zkušební strojírny s\.r\.o\. ze zakázky\?/.test(document.getElementById('vzOdstranPotvrzeni').textContent)));
  await klik(p, '#vzOdstranNe');
  test('Zrušit odstranění: nic se nezměnilo', await p.evaluate((pr) => !document.getElementById('vzOdstranPotvrzeni')
    && JSON.stringify(ZAK) === pr && ZAK.dalsiZakaznici.length === 2, zakPredOdstr));
  /* vlastní neodeslaná varianta: ponechat */
  const varZ3 = await p.evaluate(() => ZAK.dalsiZakaznici[1].varianta);
  await p.evaluate(() => window.__vzTl('z3', 'Odstranit').click());
  await p.waitForTimeout(120);
  test('vlastní neodeslaná varianta: výchozí volba je „smazat"', await p.evaluate(() => {
    const r = document.querySelector('#vzOdstranPotvrzeni input[name="vzOdstranVar"][value="smazat"]'); return !!r && r.checked; }));
  await klik(p, '#vzOdstranPotvrzeni input[name="vzOdstranVar"][value="ponechat"]');
  await klik(p, '#vzOdstranAno');
  s = await p.evaluate((vid) => ({ n: (ZAK.dalsiZakaznici || []).length, ma: ZAK.varianty.some(v => v.id === vid) }), varZ3);
  test('volba „ponechat": zákazník pryč, jeho varianta zůstává', s.n === 1 && s.ma, s);
  await p.evaluate(() => historieZpet());
  await p.waitForTimeout(150);
  test('Zpět vrátí odstraněného zákazníka', await p.evaluate(() => (ZAK.dalsiZakaznici || []).length === 2));
  await p.evaluate(() => window.__vzTl('z3', 'Odstranit').click());
  await p.waitForTimeout(120);
  await klik(p, '#vzOdstranAno');
  s = await p.evaluate((vid) => ({ n: (ZAK.dalsiZakaznici || []).length, ma: ZAK.varianty.some(v => v.id === vid), var: ZAK.varianty.length }), varZ3);
  test('výchozí volba „smazat": zákazník i jeho varianta pryč', s.n === 1 && !s.ma && s.var === 1, s);
  test('po odstranění jednoho ze tří: karta a přepínač zůstávají', await p.evaluate(() =>
    !!document.getElementById('vzKarta_ock') && !!document.getElementById('vzPrepinac_ock')));
  await p.evaluate(() => window.__vzTl('z2', 'Odstranit').click());
  await p.waitForTimeout(120);
  test('potvrzení u posledního: vzhled se vrátí do standardního', await p.evaluate(() =>
    /standardní kalkulace/.test((document.getElementById('vzOdstranPotvrzeni') || {}).textContent || '')));
  await klik(p, '#vzOdstranAno');
  s = await p.evaluate(() => ({ klice: ['vzRidici', 'dalsiZakaznici'].filter(k => k in ZAK), karta: !!document.getElementById('vzKarta_ock'),
    prep: !!document.getElementById('vzPrepinac_ock'), tl: !!document.getElementById('vzPridat_ock') }));
  test('po odstranění posledního: v ZAK nejsou klíče vzRidici ani dalsiZakaznici', s.klice.length === 0, s);
  test('po odstranění posledního: bez karty a přepínače, tlačítko „Přidat zákazníka" zpět', !s.karta && !s.prep && s.tl, s);
  const hlPo = await hlavicka(p, { maskHist: true });
  test('po odstranění posledního: #kalk-hlavicka znak po znaku jako před přidáním (bez Zpět/Znovu)', hlPo === hlPred, hlPo.length + ' / ' + hlPred.length);
  test('po odstranění posledního: údaje řídícího beze změny', await p.evaluate((pr) => {
    const a = JSON.parse(pr); return ['objednatel', 'kontakt', 'ico', 'adresaObjednatele', 'dic'].every(k => a[k] === ZAK[k]); }, zakPred));
  test('confirm() se v celém běhu nezavolal', await p.evaluate(() => window.__confirm === 0));
  await ctx.close();
}

/* ---------- 10: Zpět / Znovu po přidání ---------- */
{
  const { ctx, p } = await otevri(KDE, { zap: true });
  await pomocnici(p);
  await pridejFormularem(p, 'Druhý zákazník s.r.o.', false);
  test('Zpět/Znovu: zákazník přidán', await p.evaluate(() => (ZAK.dalsiZakaznici || []).length === 1));
  await p.evaluate(() => historieZpet()); await p.waitForTimeout(150);
  test('Zpět po přidání vrátí stav bez zákazníka (bez klíčů, karty a přepínače)', await p.evaluate(() =>
    !('dalsiZakaznici' in ZAK) && !('vzRidici' in ZAK) && !document.getElementById('vzKarta_ock') && !document.getElementById('vzPrepinac_ock')
    && !!document.getElementById('vzPridat_ock')));
  await p.evaluate(() => historieZnovu()); await p.waitForTimeout(150);
  test('Znovu zákazníka vrátí (karta i přepínač)', await p.evaluate(() =>
    (ZAK.dalsiZakaznici || []).length === 1 && ZAK.dalsiZakaznici[0].hlavicka.objednatel === 'Druhý zákazník s.r.o.'
    && !!document.getElementById('vzKarta_ock') && !!document.getElementById('vzPrepinac_ock')));
  await ctx.close();
}

/* ---------- 11: VYP + zakázka, která už další zákazníky má (R21) ---------- */
{
  const { ctx, p } = await otevri(KDE);
  await pomocnici(p);
  await p.evaluate(() => {
    vzPridej(ZAK, { objednatel: 'Druhý zákazník s.r.o.', kontakt: 'Ing. Druhý' }, {});
    VZ_UI.otevreny = 'z2';
    syncVarianta(); render();
  });
  {
    const s = await p.evaluate(() => {
      const k = document.getElementById('vzKarta_ock');
      const tl = (txt) => [...document.querySelectorAll('#vzKarta_ock .vz-akce button')].filter(x => x.textContent.trim() === txt);
      return { karta: !!k, text: k ? k.textContent : '', odstr: tl('Odstranit').map(x => x.disabled), vlastni: tl('Vlastní varianta').map(x => x.disabled),
        chips: [...document.querySelectorAll('#vzPrepinac_ock .vz-chip')].map(x => x.disabled),
        plus: !!document.querySelector('#vzPrepinac_ock .vz-chip-plus'), pridat: !!document.querySelector('.vz-pridat'),
        zak: (window.__vzPole('Zákazník') || {}).value, kontakt: (window.__vzPole('Kontaktní osoba') || {}).value };
    });
    test('VYP + data: karta je vidět s textem „funkce je vypnutá"', s.karta && /funkce je vypnutá/.test(s.text), s.text.slice(0, 200));
    test('VYP + data: Odstranit a Vlastní varianta zhasnuté', s.odstr.length === 2 && s.odstr.every(Boolean) && s.vlastni.length === 2 && s.vlastni.every(Boolean), s);
    test('VYP + data: přepínač jen ke čtení (chipy zhasnuté, bez „+"), bez tlačítka Přidat', s.chips.length === 2 && s.chips.every(Boolean) && !s.plus && !s.pridat, s);
    test('VYP + data: v hlavičce řídící, i když byl otevřený další', s.zak === 'Řídící firma s.r.o.' && s.kontakt === 'Ing. Zkušební', s);
  }
  const pred = await p.evaluate(() => JSON.stringify(ZAK));
  await p.evaluate(() => { __hl.length = 0; vzOdstranit('z2'); vzFormOtevri('ock'); vzVlastniVarianta('z2'); vzVariantaSet('z2', 'v1'); });
  await p.waitForTimeout(100);
  test('VYP + data: vzOdstranit / vzFormOtevri / vlastní varianta odmítnuty s hláškou, data beze změny', await p.evaluate((pr) =>
    JSON.stringify(ZAK) === pr && __hl.length >= 2 && __hl.every(h => /vypnutá/.test(h))
    && !document.getElementById('vzFormular') && !document.getElementById('vzOdstranPotvrzeni'), pred),
    await p.evaluate(() => __hl));
  await ctx.close();
}

/* ---------- 14: chyby stránky ---------- */
test('žádná chyba stránky (pageerror) v celém běhu', vsechnyChyby.length === 0, vsechnyChyby);

await b.close();
console.log(`\nVýsledek: ${ok} OK, ${fail} FAIL${preskoc ? ', ' + preskoc + ' přeskočeno' : ''}`);
process.exit(fail ? 1 : 0);
