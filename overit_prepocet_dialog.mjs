/* Ověření v prohlížeči: dialog o přepočtu na dnešní ceník (#284)
 * ==============================================================
 *
 * Nálezy N7 a N22 kola 6. Do 21. 9. 2026 se rozpracovaná zakázka po otevření
 * tiše přepočítala na platný ceník a do lišty se napsala věta. Věta v liště
 * se snadno přehlédne a hlavně neříkala to podstatné: O KOLIK se hnula cena.
 * „12 změněných položek" může znamenat stokorunu i sto tisíc.
 *
 * Dialog proto ukazuje verzi ceníku, počet změněných položek i rozdíl ceny
 * a nabízí VRÁCENÍ původních cen — jinak je to jen hlášení hotové věci.
 *
 * Tady se zkouší to, co v Node nejde: že se dialog opravdu otevře, co v něm
 * stojí, a že obě tlačítka dělají, co slibují. Součet cen samotný hlídá
 * `src/test_cenik_dopad.js`.
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_prepocet_dialog.mjs
 */
import { createRequire } from 'module';
import path from 'path';
import { pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_prepocet_dialog.mjs');
  process.exit(2);
}

const KDE = pathToFileURL(path.resolve('dist/kalkulacka.html')).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + detail)); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
const konzole = [];
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') konzole.push('error: ' + m.text()); });
await p.goto(KDE);
await p.waitForTimeout(600);

/* Zakázka s cenou + stav „po přepočtu", jaký po sobě nechá
 * `uloSrovnejSPlatnymCenikem`. Ceník se zdraží, aby byl rozdíl měřitelný. */
const priprava = async () => p.evaluate(() => {
  set('OCK.zadani.typSachty', 'exteriérová');
  set('OCK.zadani.sirka', 1.6); set('OCK.zadani.hloubka', 1.4);
  set('OCK.zadani.zdvih', 9); set('OCK.zadani.prejezd', 3.5);
  set('OCK.zadani.prohluben', 1.1); set('OCK.zadani.nastupiste', 4);
  const pred = cenikCenaRozpracovanych(ZAK, JEKLY);
  const zaloha = JSON.parse(JSON.stringify(ZAK));
  const c = aktivniVarianta(ZAK).data.cenik;
  c.montazHodKc = (+c.montazHodKc || 0) + 500;        // „nový ceník"
  const po = cenikCenaRozpracovanych(ZAK, JEKLY);
  ULO_PREPOCET.zaloha = zaloha;
  ULO_PREPOCET.pred = pred; ULO_PREPOCET.po = po; ULO_PREPOCET.verze = 28;
  return { pred: pred.cena, po: po.cena, montaz: c.montazHodKc };
});

const stav = await priprava();
zkus('příprava: přepočet cenu opravdu zvedl', stav.po > stav.pred,
  JSON.stringify(stav));

/* ---------- 1) dialog se otevře a řekne to podstatné ---------- */

await p.evaluate(() => { window.__odp = uloPrepocetDialog({ prepocteno: 1, zmen: 5 }); });
await p.waitForTimeout(250);

const dlg = await p.evaluate(() => {
  const el = document.getElementById('dlg');
  if (!el) return null;
  return { nadpis: (el.querySelector('.dlg-nadpis') || {}).textContent || '',
           text: (el.querySelector('.dlg-text') || {}).textContent || '',
           tlacitka: [...el.querySelectorAll('.dlg-btns button')].map(x => x.textContent.trim()) };
});
zkus('dialog se otevřel', !!dlg);
zkus('nadpis mluví o změně ceníku', dlg && /cen[íi]k/i.test(dlg.nadpis), dlg && dlg.nadpis);
zkus('text nese verzi ceníku', dlg && /verze 28/.test(dlg.text), dlg && dlg.text.slice(0, 90));
zkus('text nese počet změněných cen', dlg && /5 cen/.test(dlg.text), dlg && dlg.text.slice(0, 120));
zkus('text říká, o kolik se cena zvedla', dlg && /zvedla o/.test(dlg.text), dlg && dlg.text.slice(0, 200));
zkus('text nabídne i trvalé řešení (dohodnuté ceny)',
  dlg && /dohodnut/.test(dlg.text), dlg && dlg.text.slice(-140));
zkus('dialog má dvě cesty ven', dlg && dlg.tlacitka.length === 2, dlg && dlg.tlacitka);
zkus('a jedna z nich vrací původní ceny',
  dlg && dlg.tlacitka.some(t => /Vrátit/i.test(t)), dlg && dlg.tlacitka);

/* ---------- 2) „Vrátit původní ceny" opravdu vrátí ---------- */

await p.evaluate(() => {
  const b = [...document.querySelectorAll('#dlg .dlg-btns button')].find(x => /Vrátit/i.test(x.textContent));
  b.click();
});
await p.waitForTimeout(300);
const poVraceni = await p.evaluate(async () => ({
  odp: await window.__odp,
  montaz: aktivniVarianta(ZAK).data.cenik.montazHodKc,
  cena: cenikCenaRozpracovanych(ZAK, JEKLY).cena,
  dlgZavren: !document.getElementById('dlg'),
  zalohaUklizena: ULO_PREPOCET.zaloha === null,
}));
zkus('dialog se zavřel', poVraceni.dlgZavren);
zkus('vrácení ohlásí, že se vrátilo', poVraceni.odp === true, poVraceni.odp);
zkus('sazba v ceníku je zase původní', poVraceni.montaz === stav.montaz - 500,
  { je: poVraceni.montaz, cekano: stav.montaz - 500 });
zkus('a cena zakázky je zase původní', Math.abs(poVraceni.cena - stav.pred) < 0.01,
  { je: poVraceni.cena, cekano: stav.pred });
zkus('záloha se po použití uklidí (nedrží se celá zakázka v paměti)',
  poVraceni.zalohaUklizena);

/* ---------- 3) „Počítat s dnešním ceníkem" nechá přepočet být ---------- */

const stav2 = await priprava();
await p.evaluate(() => { window.__odp2 = uloPrepocetDialog({ prepocteno: 1, zmen: 3 }); });
await p.waitForTimeout(250);
await p.evaluate(() => {
  const b = [...document.querySelectorAll('#dlg .dlg-btns button')].find(x => /dnešním/i.test(x.textContent));
  b.click();
});
await p.waitForTimeout(250);
const poPonechani = await p.evaluate(async () => ({
  odp: await window.__odp2,
  montaz: aktivniVarianta(ZAK).data.cenik.montazHodKc,
  zalohaUklizena: ULO_PREPOCET.zaloha === null,
}));
zkus('ponechání nic nevrací', poPonechani.odp === false, poPonechani.odp);
zkus('sazba zůstala na novém ceníku', poPonechani.montaz === stav2.montaz,
  { je: poPonechani.montaz, cekano: stav2.montaz });
zkus('a záloha se zahodí i při ponechání', poPonechani.zalohaUklizena);

/* ---------- 4) Escape neznamená vrácení ----------
 *
 * Zavřít okno je útěk z dialogu, ne rozhodnutí. Kdyby Escape vracel ceny,
 * ztratil by obchodník přepočet, o kterém se ještě nerozhodl. */
const stav3 = await priprava();
await p.evaluate(() => { window.__odp3 = uloPrepocetDialog({ prepocteno: 1, zmen: 2 }); });
await p.waitForTimeout(250);
await p.keyboard.press('Escape');
await p.waitForTimeout(250);
const poEsc = await p.evaluate(async () => ({
  odp: await window.__odp3,
  montaz: aktivniVarianta(ZAK).data.cenik.montazHodKc,
}));
zkus('Escape nevrací ceny', poEsc.odp === false && poEsc.montaz === stav3.montaz,
  { odp: poEsc.odp, je: poEsc.montaz, cekano: stav3.montaz });

/* ---------- 5) bez změn se dialog neukáže ----------
 *
 * POJISTKA PROTI PRÁZDNÉMU TESTU: kontroly výš by vycházely i tehdy, kdyby
 * se dialog otevíral pokaždé. Tahle ukazuje, že na vstupu opravdu záleží. */
{
  await priprava();
  const bezZmen = await p.evaluate(async () => {
    const r = await uloPrepocetDialog({ prepocteno: 1, zmen: 0 });
    return { r, dlg: !!document.getElementById('dlg') };
  });
  zkus('při nule změněných cen se dialog neotevře', bezZmen.dlg === false && bezZmen.r === false,
    JSON.stringify(bezZmen));

  await priprava();
  const bezPrepoctu = await p.evaluate(async () => {
    const r = await uloPrepocetDialog({ prepocteno: 0, zmen: 5 });
    return { r, dlg: !!document.getElementById('dlg') };
  });
  zkus('a bez přepočítané varianty taky ne',
    bezPrepoctu.dlg === false && bezPrepoctu.r === false, JSON.stringify(bezPrepoctu));
}

zkus('za celý průchod nevznikla chyba v konzoli', konzole.length === 0, konzole.slice(0, 2).join(' | '));

await b.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
