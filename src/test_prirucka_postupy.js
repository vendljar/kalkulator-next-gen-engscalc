/* ===== #524 (M5, pokyn J. V. 26. 10. 2026): PŘÍRUČKA BEZ „CO JE NOVÉHO",
 * POSTUPY KROK ZA KROKEM A TISK PODLE ŠÍŘKY A4 =====
 *
 * J. V.: „odstraň z příručky sekce ‚co je nového', začni až seznamem.
 * přidej do všech sekcí obrázky na vysvětlenou krok za krokem."
 *
 * Hlídá se:
 *  (a) manual/obsah.json nemá žádný blok „Co je nového…" ani „Příručka
 *      aktualizována…" a šablona nevykresluje podtitul — úvodní strana nese
 *      jen název, verzi aplikace a datum; novinky žijí jen v CHANGELOG;
 *  (b) každá kapitola, ve které obchodník něco dělá, má blok `kroky`
 *      a každý krok se snímkem odkazuje na snímek, který manual/snimky_auto.mjs
 *      opravdu pořizuje (jinak by v příručce stál prázdný rámeček);
 *      kapitoly bez postupu jsou vyjmenované i s důvodem;
 *  (c) šablona (Chromium, je-li playwright): obsah je první věc pod názvem,
 *      upozornění k příručce až za ním; krok má číslo, snímek a vyznačený
 *      cíl kliknutí (rámeček + šipka); nenalezený cíl skončí v PRIRUCKA.nesedi;
 *  (d) nález M4: v tisku se široký snímek (1 360 px) zmenší podle šířky A4,
 *      ne okna — v tiskovém náhledu ze širokého okna nepřetéká rámeček
 *      (dřív `transform` nechal snímek v rozvržení plnou šířkou a Chrome
 *      zmenšil při tisku celou stránku, ze širšího okna se ořízl);
 *      tiskový stylopis aplikace a její `@media (max-width)` se do snímku
 *      nedostanou (v PDF by zmizela tlačítka, na která postup ukazuje).
 *
 * Pojistka: nad šablonou a obsahem z 48ab0a4 (před #524) selže (a), (b)
 * i (c), (d) — `KNG_SABLONA=<stará šablona> KNG_OBSAH=<starý obsah>`.
 */
const fs = require('fs');
const path = require('path');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};
const MANUAL = path.join(__dirname, '..', 'manual');
const SABLONA = fs.readFileSync(process.env.KNG_SABLONA || path.join(MANUAL, 'sablona.html'), 'utf8');
const OBSAH_TXT = fs.readFileSync(process.env.KNG_OBSAH || path.join(MANUAL, 'obsah.json'), 'utf8');
const OBSAH = JSON.parse(OBSAH_TXT);
const SNIMKY_AUTO = fs.readFileSync(path.join(MANUAL, 'snimky_auto.mjs'), 'utf8');

// ---- (a) bez „Co je nového" -------------------------------------------------
test('(a) obsah.json nemá blok „Co je nového"', !/Co je nového/i.test(OBSAH_TXT));
test('(a) úvod nemá blok „Příručka aktualizována"',
  !(OBSAH.uvod || []).some(u => /Příručka aktualizována/i.test(u.nadpis || '')));
test('(a) šablona nevykresluje podtitul (úvodní strana = název, verze, datum)',
  !/OBSAH\.podtitul/.test(SABLONA) && !('podtitul' in OBSAH));
test('(a) řádek verze nese verzi aplikace a datum sestavení',
  /v\d+\.\d+\.\d+/.test(OBSAH.verze || '') && /\d{1,2}\. \d{1,2}\. \d{4}/.test(OBSAH.verze || ''));

// ---- (b) postupy ve všech kapitolách s akcí ----------------------------------
/* Kapitoly, kde obchodník nic nedělá — pojmy, přehledy, odkazy. */
const BEZ_POSTUPU = {
  'kap-role': 'jen popis rolí a účtů — účty zakládá administrátor',
  'kap-nevidite': 'přehled toho, co obchodník nevidí (ceníky, Nastavení) — není co kliknout',
  'kap-slovnicek': 'slovníček hlášek — výklad, ne postup',
  'kap-dotaz': 'kontakt na administrátora',
};
const poriz = new Set();
for (const m of SNIMKY_AUTO.matchAll(/vezmi\('([a-z0-9-]+)'|sDialogem\('([a-z0-9-]+)'|vezmi\('([a-z0-9-]+)', obal|'(k23-nahled-lista|nabidka-kapitoly)'/g))
  poriz.add(m[1] || m[2] || m[3] || m[4]);
const bezPostupu = [], krokBezSnimku = [], neznamy = [];
let kroku = 0;
for (const k of OBSAH.kapitoly) {
  const bloky = (k.bloky || []).filter(b => b.typ === 'kroky');
  if (!bloky.length && !BEZ_POSTUPU[k.id]) bezPostupu.push(k.id);
  for (const b of bloky) {
    if (!(b.polozky || []).some(p => p.snimek)) krokBezSnimku.push(k.id);
    for (const p of b.polozky || []) {
      kroku++;
      if (!String(p.text || '').trim()) krokBezSnimku.push(k.id + ': prázdný text');
      if (p.snimek && !poriz.has(p.snimek)) neznamy.push(k.id + ' → ' + p.snimek);
    }
  }
  for (const b of k.bloky || []) if (b.typ === 'obrazek' && !poriz.has(b.snimek)) neznamy.push(k.id + ' → ' + b.snimek);
}
test('(b) každá kapitola s akcí má postup krok za krokem', bezPostupu.length === 0, bezPostupu);
test('(b) každý postup má aspoň jeden snímek a každý krok text', krokBezSnimku.length === 0, krokBezSnimku);
test('(b) každý snímek v příručce pořizuje manual/snimky_auto.mjs', neznamy.length === 0, neznamy);
test('(b) kroků je aspoň 60', kroku >= 60, kroku);
test('(b) kapitoly bez postupu existují (seznam nezastarává)',
  Object.keys(BEZ_POSTUPU).every(id => OBSAH.kapitoly.some(k => k.id === id)));

// ---- (c), (d) šablona v Chromiu ----------------------------------------------
let chromium = null;
try { ({ chromium } = require('playwright')); } catch (e) { chromium = null; }

const zaver = () => {
  console.log(`\n${ok} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
};
if (!chromium) {
  console.log('–   (c), (d) přeskočeno: playwright není k dispozici (NODE_PATH=$(npm root -g))');
  zaver();
} else (async () => {
  /* Zkušební data: široký snímek s tlačítkem (1 360 px jako Detail výpočtu
   * PROJ) a úzký dialog. CSS nese tiskový stylopis a max-width pravidlo,
   * která v aplikaci tlačítka schovávají — snímek je ukázat musí. */
  const snimky = {
    zachyceno: '2026-10-26T00:00:00Z', verze: 'Kalkulačka v26.10.8', prostredi: 'test', castkyUpraveny: false,
    css: '.siroky{width:1360px;background:#eef}.siroky button{width:120px}'
      + ' @media print { button { display:none !important } }'
      + ' @media (max-width:1000px) { .skryj { display:none } }',
    snimky: [
      { id: 'siroky', sirka: 1360, vyska: 300, tema: 'ostre', admin: false, popis: '',
        html: '<div class="siroky"><label>Číslo nabídky</label><input value="9100">'
          + '<button class="skryj">Uložit zakázku</button><div style="height:260px"></div></div>' },
      { id: 'uzky', sirka: 420, vyska: 200, tema: 'ostre', admin: false, popis: '',
        html: '<div style="width:420px"><button>Přihlásit</button></div>' },
    ],
  };
  const obsah = {
    titul: 'Test', verze: 'Platí pro aplikaci v26.10.8 · sestaveno 26. 10. 2026',
    uvod: [{ druh: 'varovne', nadpis: 'Upozornění', odstavce: ['Částky nejsou naše ceny.'] }],
    kapitoly: [{ id: 'kap-a', nadpis: '1. Kapitola', bloky: [
      { typ: 'text', text: 'Úvod.' },
      { typ: 'kroky', nadpis: 'Postup', polozky: [
        { text: 'Klikněte na **Uložit zakázku**.', snimek: 'siroky', klik: { obsahuje: 'Uložit zakázku' } },
        { text: 'Přihlaste se.', snimek: 'uzky', klik: { obsahuje: 'Přihlásit', stitek: 'sem' } },
        { text: 'Cíl, který na snímku není.', snimek: 'uzky', klik: { obsahuje: 'Neexistuje' } },
      ] },
      { typ: 'obrazek', snimek: 'siroky', titulek: 'Široký snímek.' },
    ] }],
  };
  const html = SABLONA.replace('__SNIMKY__', () => JSON.stringify(snimky)).replace('__OBSAH__', () => JSON.stringify(obsah));
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
    const chyby = [];
    p.on('pageerror', e => chyby.push(String(e)));
    await p.setContent(html, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const cil = document.getElementById('cil');
      const deti = [...cil.children].map(e => e.tagName + (e.id ? '#' + e.id : '') + (e.className ? '.' + e.className : ''));
      const iObsah = deti.findIndex(d => d.indexOf('#obsah') >= 0);
      const iRam = deti.findIndex(d => /\.ram/.test(d));
      const kroky = [...document.querySelectorAll('ol.kroky > li.krok')];
      const sr = (li) => li.querySelector('.snimek-plocha').shadowRoot;
      return {
        deti, iObsah, iRam, P: window.PRIRUCKA,
        kroku: kroky.length,
        cisla: kroky.map(li => (li.querySelector('.krok-cis') || {}).textContent),
        sFig: kroky.map(li => !!li.querySelector('figure.snimek')),
        klik: kroky.map(li => !!sr(li).querySelector('.mn-klik')),
        sipka: kroky.map(li => (sr(li).querySelector('.mn-sipka') || {}).textContent || ''),
        popisky: [...document.querySelectorAll('figcaption b')].map(x => x.textContent),
      };
    });
    test('(c) šablona doběhla bez chyby', !!r.P && chyby.length === 0, chyby);
    test('(c) pod názvem a verzí je hned obsah', r.iObsah === 2, r.deti.slice(0, 4));
    test('(c) upozornění k příručce stojí až za obsahem', r.iRam > r.iObsah, r.deti.slice(0, 4));
    test('(c) kroky jsou číslované 1, 2, 3', r.kroku === 3 && r.cisla.join(',') === '1,2,3', r.cisla);
    test('(c) každý krok má svůj snímek', r.sFig.every(Boolean), r.sFig);
    test('(c) cíl kliknutí má rámeček a šipku (výchozí „klikněte", vlastní štítek)',
      r.klik[0] && r.klik[1] && /klikněte/.test(r.sipka[0]) && /sem/.test(r.sipka[1]), r.sipka);
    test('(c) nenalezený cíl kliknutí se hlásí v PRIRUCKA.nesedi',
      r.P.nesedi.length === 1 && /klik: Neexistuje/.test(r.P.nesedi[0]), r.P.nesedi);
    test('(c) PRIRUCKA.kroku počítá kroky', r.P.kroku === 3, r.P.kroku);
    test('(c) obrázky kroků se číslují spolu s ostatními', r.popisky.join(',') === 'Obrázek 1.,Obrázek 2.,Obrázek 3.,Obrázek 4.', r.popisky);

    /* (d) tisk ze ŠIROKÉHO okna: přepne se na tiskový stylopis a šířku
     * tiskové plochy A4 (702 px). */
    await p.emulateMedia({ media: 'print' });
    await p.setViewportSize({ width: 702, height: 1000 });
    await p.waitForTimeout(300);
    const t = await p.evaluate(() => [...document.querySelectorAll('.snimek-ram')].map(ram => {
      const pl = ram.querySelector('.snimek-plocha');
      const rr = ram.getBoundingClientRect(), rp = pl.getBoundingClientRect();
      const btn = pl.shadowRoot.querySelector('button');
      return { prepad: ram.scrollWidth - ram.clientWidth, vejde: rp.width <= rr.width + 1,
        vpravo: rr.right <= 702 + 1, tlacitko: !!btn && btn.getBoundingClientRect().width > 0,
        sirka: Math.round(rp.width), ram: Math.round(rr.width) };
    }));
    test('(d) v tisku žádný snímek nepřetéká svůj rámeček (rozvržení, ne jen obraz)',
      t.every(x => x.prepad <= 1), t);
    test('(d) v tisku se snímek vejde do rámečku a rámeček na A4', t.every(x => x.vejde && x.vpravo), t);
    test('(d) tiskový stylopis aplikace a max-width pravidla tlačítka ve snímku neschovají',
      t.every(x => x.tlacitko), t);
    const doc = await p.evaluate(() => document.documentElement.scrollWidth);
    test('(d) stránka v tisku nepřetéká šířku A4', doc <= 703, doc);
  } finally { await b.close(); }
  zaver();
})().catch(e => { console.log('FAIL výjimka', String(e && e.stack || e)); process.exit(1); });
