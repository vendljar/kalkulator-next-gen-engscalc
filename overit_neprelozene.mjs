/* Ověření v prohlížeči: zvýraznění nepřeložených a ručně zapsaných textů
 * v náhledu cizojazyčné cenové nabídky (#518, zadání J. V. 26. 10. 2026)
 * =========================================================================
 *
 * Podnět obchodníka 24. 10.: v PRICE QUOTATION EN zůstal ručně zapsaný
 * název akce česky a nikdo si toho před tiskem nevšiml. Hlídá se:
 *   – EN nabídka OCK (tisková stránka) s ručním názvem akce → žlutá značka
 *     .neprelozeno s vysvětlením v title, legenda s počtem a skok na první,
 *   – text bez hesla ve slovníku (ruční přepis techspec) → značka,
 *   – ručně upravený odstavec v náhledu („Upravit text před tiskem") → značka,
 *   – v print médiu (emulateMedia print) žádné podbarvení ani legenda,
 *   – text dokumentu se značkou nemění (žádné znaky navíc),
 *   – EN nabídka PROJ a podklady nabídky OCK → značky,
 *   – česká nabídka OCK i PROJ bez značek a bez legendy,
 *   – data pro Word (nabidkaData) a vyplněný DOCX jsou po otevření náhledu
 *     beze změny a bez stopy po značce.
 *
 * Pojistka: na sestavení před #518 (v25.10.1 bez změny) 10 prošlo / 12 selhalo
 * (žádná značka, žádná legenda, sledování neexistuje); po změně 22 / 0.
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_neprelozene.mjs
 */
import { chromium } from 'playwright';

const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + detail)); }
};

const NAZEV = 'Bytový dům Dlouhá – Vestavba OCK výtahové šachty včetně opláštění';
const PREPIS = 'Ručně psaná poznámka obchodníka k šachtě';

const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
const p = await ctx.newPage();
const konzole = [];
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') konzole.push('error: ' + m.text()); });
await p.goto(KDE);
await p.waitForFunction(() => typeof NAST !== 'undefined' && typeof render === 'function', null, { timeout: 15000 });
await p.waitForTimeout(400);

/* Zkušební ceník z repozitáře (sestavení je nulové, nabídka za 0 Kč je zábrana). */
{
  const { createRequire } = await import('module');
  const ZC = createRequire(import.meta.url)('./src/zkusebni_cenik.js');
  await p.evaluate((c) => { Object.assign(C, c); }, ZC.zkusebniCenik());
}
const tsPole = await p.evaluate(({ NAZEV }) => {
  NAST.jeAdmin = true;
  window.potvrd = () => Promise.resolve(true);
  window.hlaska = () => Promise.resolve();
  Object.keys(PC.fixy || {}).forEach(k => { if (!PC.fixy[k]) PC.fixy[k] = 12000; });
  Object.keys(PC.sazby || {}).forEach(k => { if (!PC.sazby[k]) PC.sazby[k] = 850; });
  const bezZnacek = o => { if (o) { delete o.ukazkove; delete o.prazdny; } };
  [DEFAULT_CENIK, DEFAULT_CENIK_PROJ, C, PC, NAST.slevy, NAST.firma].forEach(bezZnacek);
  ZAK.varianty.forEach(v => { bezZnacek(v.data.cenik); bezZnacek(v.data.proj.cenik);
    v.data.cenik.kurzEurKc = 25; v.data.proj.cenik.kurzEurKc = 25; });
  C.kurzEurKc = 25; PC.kurzEurKc = 25;
  ZAK.cislo = '2026 - OPR - CN - 0518'; ZAK.nazevAkce = NAZEV;
  ZAK.objednatel = 'Zkušební zákazník'; ZAK.adresa = 'Ulice 1, Praha';
  Object.assign(Z, { prejezd: 2.7, zdvih: 12, prohluben: 1.05, sirka: 1.51, hloubka: 1.515 });
  render();
  /* Pole technické specifikace s textovou hodnotou, které se v nabídce
   * tiskne — do něj ruční přepis bez hesla ve slovníku. */
  const kand = [];
  TECHSPEC_DEF.forEach(s => s.pole.forEach(x => kand.push(x.id)));
  return kand;
}, { NAZEV });

async function okno(fn) {
  const [w] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(f => (0, eval)(f + '()'), fn)]);
  await w.waitForLoadState('domcontentloaded');
  await w.waitForTimeout(300);
  return w;
}
const stav = (w) => w.evaluate(() => {
  const z = [...document.querySelectorAll('.neprelozeno')];
  const l = document.getElementById('neprLegenda');
  return {
    pocet: z.length,
    texty: z.map(e => e.textContent.trim()),
    tituly: z.map(e => e.title),
    legenda: l ? l.textContent : null,
    legendaVidet: !!l && getComputedStyle(l).display !== 'none',
  };
});

/* Najde pole techspec, jehož ruční přepis se v EN nabídce opravdu objeví. */
await p.evaluate(() => tiskJazykNastav('en'));
let poleId = null;
for (const id of ['poznamka', 'ostatni', 'material', 'kotveni', 'nater'].concat(tsPole)) {
  if (!tsPole.includes(id)) continue;
  await p.evaluate(({ id, PREPIS }) => { aktivniVarianta(ZAK).data.techspec.hodnoty[id] = PREPIS; }, { id, PREPIS });
  const je = await p.evaluate(({ PREPIS }) => {
    const d = nabidkaData(ZAK, aktivniVarianta(ZAK), JEKLY, 'en');
    return JSON.stringify(d.placeholders).includes(PREPIS);
  }, { PREPIS });
  if (je) { poleId = id; break; }
  await p.evaluate(({ id }) => { delete aktivniVarianta(ZAK).data.techspec.hodnoty[id]; }, { id });
}
zkus('zkušební ruční přepis techspec se do EN nabídky dostal', !!poleId, 'žádné pole');

/* Data pro Word PŘED otevřením náhledu (srovnání níže). */
const dataPred = await p.evaluate(() => JSON.stringify(nabidkaData(ZAK, aktivniVarianta(ZAK), JEKLY, 'en').placeholders));

/* ---------- EN nabídka OCK, tisková stránka ---------- */
const en = await okno('nabidkaOckDokument');
let s = await stav(en);
zkus('EN OCK: ručně zapsaný název akce je zvýrazněný', s.texty.includes(NAZEV), JSON.stringify(s.texty));
const iNazev = s.texty.indexOf(NAZEV);
zkus('EN OCK: značka u ručního údaje vysvětluje proč (title)', iNazev >= 0 && /Ručně zapsaný údaj/.test(s.tituly[iNazev]), s.tituly[iNazev]);
zkus('EN OCK: text bez hesla ve slovníku je zvýrazněný', s.texty.some(t => t.includes(PREPIS)), JSON.stringify(s.texty));
const iPrep = s.texty.findIndex(t => t.includes(PREPIS));
zkus('EN OCK: značka u textu bez překladu má vlastní vysvětlení', iPrep >= 0 && /bez překladu/.test(s.tituly[iPrep]), s.tituly[iPrep]);
zkus('EN OCK: legenda nad náhledem s počtem míst', s.legendaVidet && /\d+ text(y|ů)? bez překladu — zkontrolujte/.test(s.legenda || ''), s.legenda);
zkus('EN OCK: přeložený řádek DPH bez značky (číslo „12 %" není jazyk)', !s.texty.some(t => /^VAT\b/.test(t)), JSON.stringify(s.texty));
zkus('EN OCK: legenda je česky a bez technických výrazů', !/neprelozeno|class|span|DOM/i.test(s.legenda || ''), s.legenda);
const textSeZnackou = await en.evaluate(() => document.getElementById('dok').textContent);
zkus('EN OCK: značka nepřidala do dokumentu žádný znak', textSeZnackou.includes(NAZEV) && !/neprelozeno/.test(textSeZnackou));

/* skok na první */
if (await en.$('#neprSkok')) await en.click('#neprSkok');
const skok = await en.evaluate(() => {
  const a = document.querySelector('.nepr-aktivni');
  const prvni = [...document.querySelectorAll('.neprelozeno')].find(e => e.getClientRects().length);
  const r = a && a.getBoundingClientRect();
  return { je: !!a, prvni: a === prvni, vOkne: !!r && r.top >= 0 && r.bottom <= innerHeight };
});
zkus('EN OCK: klik v legendě skočí na první označené místo', skok.je && skok.prvni && skok.vOkne, JSON.stringify(skok));

/* print médium: bez podbarvení a bez legendy */
await en.emulateMedia({ media: 'print' });
const tisk = await en.evaluate(() => {
  const z = document.querySelector('.neprelozeno');
  const cs = z && getComputedStyle(z);
  const l = document.getElementById('neprLegenda');
  return { pozadi: cs && cs.backgroundColor, stin: cs && cs.boxShadow, outline: cs && cs.outlineStyle,
    legenda: l ? getComputedStyle(l).display : 'none' };
});
zkus('EN OCK: v tisku žádné zvýraznění', tisk.pozadi === 'rgba(0, 0, 0, 0)' && (tisk.stin === 'none' || !tisk.stin) && tisk.outline === 'none', JSON.stringify(tisk));
zkus('EN OCK: v tisku žádná legenda', tisk.legenda === 'none', tisk.legenda);
await en.emulateMedia({ media: 'screen' });

/* ručně upravený odstavec */
await en.check('#tiskEditCheck');
const upraveno = await en.evaluate(() => {
  const cil = [...document.querySelectorAll('#dok td')].find(td => !td.querySelector('.neprelozeno')
    && !td.classList.contains('neprelozeno') && td.textContent.trim().length > 3 && td.getClientRects().length);
  if (!cil) return { nalezen: false };
  const r = document.createRange(); r.selectNodeContents(cil); r.collapse(false);
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  return { nalezen: true, pred: [...document.querySelectorAll('.neprelozeno')].length };
});
await en.keyboard.type(' doplněno ručně');
const poUprave = await en.evaluate(() => ({
  pocet: [...document.querySelectorAll('.neprelozeno')].length,
  title: [...document.querySelectorAll('td.neprelozeno')].map(e => e.title).join('|'),
  legenda: (document.getElementById('neprLegenda') || {}).textContent || '',
}));
zkus('EN OCK: ručně upravený odstavec dostal značku', upraveno.nalezen && poUprave.pocet === upraveno.pred + 1
  && /Ručně upravený text/.test(poUprave.title), JSON.stringify([upraveno, poUprave]));
zkus('EN OCK: legenda počet po úpravě přepočítá', (poUprave.legenda.match(/\d+/) || [])[0] !== ((s.legenda || '').match(/\d+/) || [])[0], poUprave.legenda);
await en.close();

/* Data pro Word po náhledu: beze změny a bez stopy po značce. */
const dataPo = await p.evaluate(() => JSON.stringify(nabidkaData(ZAK, aktivniVarianta(ZAK), JEKLY, 'en').placeholders));
zkus('Word: data nabídky po otevření náhledu beze změny', dataPred === dataPo);
zkus('Word: sledování po náhledu vypnuté', await p.evaluate(() => typeof PREKLAD_SLEDOVANI !== 'undefined' && PREKLAD_SLEDOVANI === null));

/* DOCX z minimální šablony: obsahuje název akce přesně, bez značky. */
const docx = await p.evaluate(async () => {
  const enc = new TextEncoder();
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
    + '<w:p><w:r><w:t>{{NAZEV_AKCE}}</w:t></w:r></w:p><w:p><w:r><w:t>{{OBJEDNATEL}}</w:t></w:r></w:p></w:body></w:document>';
  const ct = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
  const blob = zipZapis([{ nazev: '[Content_Types].xml', data: enc.encode(ct) }, { nazev: 'word/document.xml', data: enc.encode(xml) }]);
  const buf = await (blob.arrayBuffer ? blob.arrayBuffer() : new Response(blob).arrayBuffer());
  const res = await dokumentVygeneruj('nabidka', buf, ZAK, aktivniVarianta(ZAK), JEKLY, 'en');
  const pol = await zipPrecti(new Uint8Array(await res.blob.arrayBuffer()));
  return new TextDecoder().decode(pol.find(x => x.nazev === 'word/document.xml').data);
});
zkus('DOCX: název akce vyplněný beze změny a bez značky', docx.includes('<w:t>' + NAZEV + '</w:t>')
  && !/neprelozeno|fef08a|w:highlight/.test(docx), docx.slice(0, 200));

/* ---------- EN nabídka PROJ ---------- */
await p.evaluate(() => { ZAK.cislo = '2026 - OVP - CN - 0518'; render(); });
const enP = await okno('nabidkaProjNahled');
s = await stav(enP);
zkus('EN PROJ: ručně zapsaný název akce je zvýrazněný a legenda svítí', s.texty.includes(NAZEV) && s.legendaVidet, JSON.stringify(s));
await enP.close();

/* ---------- podklady nabídky OCK (jazyk dokumentů z Nastavení) ---------- */
await p.evaluate(() => { ZAK.cislo = '2026 - OPR - CN - 0518'; NAST.jazyk = 'en'; render(); });
const pod = await okno('nabidkaNahled');
s = await stav(pod);
zkus('EN podklady OCK: název akce zvýrazněný', s.texty.includes(NAZEV) && s.legendaVidet, JSON.stringify(s.texty));
await pod.close();
await p.evaluate(() => { NAST.jazyk = 'cz'; });

/* ---------- česká nabídka beze změny ---------- */
await p.evaluate(() => tiskJazykNastav('cz'));
const cz = await okno('nabidkaOckDokument');
s = await stav(cz);
const czCss = await cz.evaluate(() => document.documentElement.outerHTML.includes('neprelozeno'));
zkus('CZ OCK: žádná značka, žádná legenda, žádný skript', s.pocet === 0 && s.legenda === null && !czCss, JSON.stringify(s));
await cz.close();
await p.evaluate(() => { ZAK.cislo = '2026 - OVP - CN - 0518'; render(); });
const czP = await okno('nabidkaProjNahled');
s = await stav(czP);
zkus('CZ PROJ: žádná značka ani legenda', s.pocet === 0 && s.legenda === null, JSON.stringify(s));
await czP.close();
await p.evaluate(() => tiskJazykNastav(''));

zkus('za celý průchod nevznikla chyba v konzoli', konzole.length === 0, konzole.slice(0, 3).join(' | '));
await b.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
