/* Stav Pipedrive v hlavičce kalkulace nad sestavením dist/kalkulacka.html
 * (22. 10. 2026; zadání podklady/PIPEDRIVE_STAV_DEALU_22_10.md, náhled
 * J. V. https://claude.ai/artifact/UHqdUv62Kax3NCLGHWXcb1).
 *
 * Co se v Node ověřit nedá: řádek je v pravém sloupci hlavičky OCK i PROJ
 * ÚPLNĚ NAHOŘE, je vypnutý pro každého, štítek má barvu stavu, bez dealu
 * svítí „— zakázka nemá deal —", pod polem není doplňující text, datum
 * vytvoření stojí dál na úrovni sazby DPH, stav se načte JEDNOU po otevření
 * zakázky, chyba nic nezmění a načtený stav není neuložená změna.
 *
 * Server (/api/pd/stav, uložení, export) hlídá netlify/test_pd_stav.mjs;
 * tady ho nahrazuje funkce `onlineApi` v paměti stránky.
 * Pojistka: před úpravou řádek v hlavičce neexistuje (první kontroly selžou). */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'node:url';
const KOREN = fileURLToPath(new URL('.', import.meta.url));
const soubor = 'file://' + path.resolve(KOREN, 'dist/kalkulacka.html');

let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail !== undefined ? '  → ' + JSON.stringify(detail) : '')); }
};

const prohlizec = await chromium.launch();
const stranka = await prohlizec.newPage({ viewport: { width: 1500, height: 950 } });
const chyby = [];
stranka.on('console', m => { if (m.type() === 'error') chyby.push(m.text()); });
stranka.on('pageerror', e => chyby.push(String(e)));
await stranka.goto(soubor);
await stranka.waitForTimeout(500);

/* Náhrada serveru: /api/pd/stav v paměti; ostatní cesty odpoví „nic". */
await stranka.evaluate(() => {
  window.__pd = { dotazy: [], odpoved: null, chyba: false };
  window.pdStavServer = () => true;
  window.onlineApi = (cesta) => {
    if (String(cesta).startsWith('/api/pd/stav?')) {
      window.__pd.dotazy.push(String(cesta));
      if (window.__pd.chyba) return Promise.reject(new Error('Pipedrive momentálně neodpovídá.'));
      return Promise.resolve(window.__pd.odpoved || { ok: true, nastaveno: true, status: null, nacteno: null });
    }
    return Promise.resolve({ ok: true });
  };
});

/* Řádky pravého sloupce hlavičky na záložce. */
const sloupec = (tab) => stranka.evaluate((tab) => {
  prepniTab(tab); render();
  const sl = [...document.querySelectorAll('#page-' + tab + ' .zak-head-col')][2];
  if (!sl) return null;
  const radky = [...sl.querySelectorAll(':scope > .row')];
  const prvni = radky[0];
  const sel = prvni ? prvni.querySelector('select') : null;
  const pill = prvni ? prvni.querySelector('label .pill') : null;
  const cs = pill ? getComputedStyle(pill) : null;
  return {
    popisky: radky.map(r => (r.querySelector('label') ? r.querySelector('label').childNodes[0].textContent.trim() : '')),
    text: sel ? sel.options[sel.selectedIndex].text : null,
    vypnuto: sel ? sel.disabled : null,
    moznosti: sel ? sel.options.length : 0,
    bublina: sel ? sel.title : '',
    stitek: pill ? pill.textContent.trim() : null,
    trida: pill ? pill.className : '',
    barva: cs ? cs.color : '', podklad: cs ? cs.backgroundColor : '',
    poznamka: prvni ? prvni.querySelectorAll('.note, small').length + (prvni.nextElementSibling
      && prvni.nextElementSibling.classList.contains('note') ? 1 : 0) : -1,
  };
}, tab);

console.log('\nZakázka bez dealu (OCK i PROJ):');
for (const tab of ['kalk', 'proj']) {
  const s = await sloupec(tab);
  const kde = tab === 'kalk' ? 'OCK' : 'PROJ';
  zkus(kde + ': „Stav Pipedrive" je v pravém sloupci úplně nahoře, pod ním Otevřená varianta',
    !!s && s.popisky[0] === 'Stav Pipedrive' && s.popisky[1] === 'Otevřená varianta', s && s.popisky);
  zkus(kde + ': bez dealu šedé „— zakázka nemá deal —" se štítkem „nepropojeno"',
    !!s && s.text === '— zakázka nemá deal —' && s.stitek === 'nepropojeno' && /pd-zadny/.test(s.trida), s);
  zkus(kde + ': pole je jen ke čtení (vypnuté)', !!s && s.vypnuto === true && s.moznosti === 1, s);
  zkus(kde + ': pod polem žádný doplňující text', !!s && s.poznamka === 0, s);
}

console.log('\nČtyři stavy z Pipedrive:');
const BARVY = { open: ['rgb(31, 94, 255)', 'rgb(232, 239, 255)'], won: [null, 'rgb(231, 239, 233)'],
  lost: ['rgb(185, 28, 28)', 'rgb(253, 232, 232)'], deleted: [null, 'rgb(238, 241, 245)'] };
const TEXT = { open: 'Otevřené', lost: 'Ztracené', won: 'Vyhrané', deleted: 'Smazané' };
for (const status of ['open', 'lost', 'won', 'deleted']) {
  await stranka.evaluate((status) => { ZAK.pdDealId = '4711'; ZAK.pdStav = { status, nacteno: '2026-10-22T08:15:00.000Z' }; }, status);
  for (const tab of ['kalk', 'proj']) {
    const s = await sloupec(tab);
    const kde = tab === 'kalk' ? 'OCK' : 'PROJ';
    zkus(kde + ': ' + status + ' → „' + TEXT[status] + '" v poli i ve štítku',
      !!s && s.text === TEXT[status] && s.stitek === TEXT[status] && s.trida.includes('pd-' + status), s);
    const [barva, podklad] = BARVY[status];
    zkus(kde + ': štítek „' + TEXT[status] + '" má barvu z náhledu',
      !!s && (barva === null || s.barva === barva) && s.podklad === podklad, s && [s.barva, s.podklad]);
  }
}
{ const s = await sloupec('kalk');
  zkus('bublina říká, že je pole jen ke čtení, číslo dealu a kdy byl stav načten',
    /jen ke čtení/.test(s.bublina) && /deal 4711/.test(s.bublina) && /načteno/.test(s.bublina), s.bublina); }
await stranka.evaluate(() => { ZAK.pdStav = { status: 'vyhrano', nacteno: 'včera' }; });
{ const s = await sloupec('kalk');
  zkus('neplatný stav v zakázce se neukáže („— stav zatím nenačten —")',
    s.text === '— stav zatím nenačten —' && s.stitek === 'nenačteno', s); }

console.log('\nŘádek vidí i obchodník a nezmění ho:');
await stranka.evaluate(() => { ZAK.pdStav = { status: 'won', nacteno: '2026-10-22T08:15:00.000Z' }; NAST.jeAdmin = false; });
{ const s = await sloupec('kalk');
  zkus('obchodník: pole je vidět a je vypnuté', !!s && s.popisky[0] === 'Stav Pipedrive' && s.vypnuto === true && s.text === 'Vyhrané', s); }
await stranka.evaluate(() => { NAST.jeAdmin = true; });

console.log('\nRozvržení hlavičky:');
const zarovnani = (tab, zahr) => stranka.evaluate(([tab, zahr]) => {
  const v = aktivniVarianta(ZAK);
  if (zahr) v.data.cenikRada = 'zahr'; else delete v.data.cenikRada;
  if (typeof syncVarianta === 'function') syncVarianta();
  prepniTab(tab); render();
  const stred = (popis) => {
    const l = [...document.querySelectorAll('#page-' + tab + ' .zak-head-col > .row > label')]
      .find(x => x.textContent.trim().indexOf(popis) === 0);
    if (!l) return null;
    const r = l.parentElement.getBoundingClientRect();
    return Math.round((r.top + r.bottom) / 2);
  };
  return { datum: stred('Datum vytvoření'), dph: stred('Sazba DPH') };
}, [tab, zahr]);
for (const [tab, zahr, popis] of [['kalk', false, 'OCK'], ['proj', false, 'PROJ'], ['kalk', true, 'OCK, zahraniční ceník s kurzem']]) {
  const z = await zarovnani(tab, zahr);
  zkus(popis + ': datum vytvoření dál na úrovni sazby DPH', z.datum != null && z.dph != null && Math.abs(z.datum - z.dph) <= 3, z);
}
await zarovnani('kalk', false);

console.log('\nNačtení stavu po otevření zakázky:');
/* Jako onlineOtevri: zakázka se vymění, překreslí a teprve potom označí
 * jako uložená (první render doplní hlavičku PROJ — zajistiProjHlavicku). */
const otevri = (zak) => stranka.evaluate((zak) => {
  window.__pd.dotazy = [];
  ONLINE_STAV.ja = { email: 'obchod@priklad.cz', jmeno: 'Obchodník', role: 'Obchodník' };
  ZAK = importZakazka(JSON.parse(JSON.stringify(zak)));
  if (typeof syncVarianta === 'function') syncVarianta();
  prepniTab('kalk'); render();
  ONLINE_STAV.posledni = JSON.stringify(ZAK);
  if (typeof historieOznacUlozeno === 'function') historieOznacUlozeno();
}, zak);
const zakazka = await stranka.evaluate(() => {
  const z = novaZakazka(); z.cislo = '2026 - OPR - CN - 7201'; z.nazevAkce = 'Stav Pipedrive'; z.pdDealId = '4711';
  return z;
});
await stranka.evaluate(() => { window.__pd.odpoved = { ok: true, nastaveno: true, status: 'lost', nacteno: '2026-10-22T09:00:00.000Z' }; });
await otevri(zakazka);
await stranka.waitForTimeout(150);
const po = await stranka.evaluate(() => ({ dotazy: window.__pd.dotazy.slice(), stav: ZAK.pdStav,
  neulozeno: historieNeulozeno(), posledni: ONLINE_STAV.posledni === JSON.stringify(ZAK) }));
zkus('po otevření se server zeptá na stav dealu jednou', po.dotazy.length === 1 && po.dotazy[0] === '/api/pd/stav?deal=4711', po.dotazy);
zkus('stav se uloží k zakázce (ZAK.pdStav)', JSON.stringify(po.stav) === JSON.stringify({ status: 'lost', nacteno: '2026-10-22T09:00:00.000Z' }), po.stav);
zkus('hlavička ukáže „Ztracené"', (await sloupec('kalk')).text === 'Ztracené');
zkus('načtený stav není neuložená změna (ani pro autosave)', po.neulozeno === false && po.posledni === true, po);
await stranka.evaluate(() => { window.__pd.dotazy = []; for (let i = 0; i < 5; i++) render(); set('ZAK.nazevAkce', 'Stav Pipedrive — úprava'); render(); });
await stranka.waitForTimeout(150);
zkus('překreslení ani úprava zakázky se znovu neptají', (await stranka.evaluate(() => window.__pd.dotazy.length)) === 0);

/* Chyba serveru: zůstává poslední známý stav, žádná hláška ani chyba v konzoli. */
const chybPred = chyby.length;
await stranka.evaluate(() => { window.__pd.chyba = true; });
await otevri(Object.assign({}, zakazka, { pdStav: { status: 'deleted', nacteno: '2026-09-01T08:00:00.000Z' } }));
await stranka.waitForTimeout(150);
const sChyba = await sloupec('kalk');
zkus('chyba Pipedrive tiše ponechá poslední známý stav („Smazané")',
  sChyba.text === 'Smazané' && chyby.length === chybPred
  && (await stranka.evaluate(() => window.__pd.dotazy.length)) === 1, { text: sChyba.text, chyby: chyby.slice(chybPred) });
await stranka.evaluate(() => { window.__pd.chyba = false; window.__pd.odpoved = { ok: true, nastaveno: true, status: null, nacteno: null, nenalezen: true }; });
await otevri(Object.assign({}, zakazka, { pdStav: { status: 'deleted', nacteno: '2026-09-01T08:00:00.000Z' } }));
await stranka.waitForTimeout(150);
zkus('deal, který Pipedrive už nezná, nechá „Smazané" (nepřepíše na „nepropojeno")', (await sloupec('kalk')).text === 'Smazané');
await stranka.evaluate(() => { window.__pd.odpoved = { ok: true, nastaveno: true, status: 'open', nacteno: '2026-08-01T08:00:00.000Z' }; });
await otevri(Object.assign({}, zakazka, { pdStav: { status: 'won', nacteno: '2026-10-01T08:00:00.000Z' } }));
await stranka.waitForTimeout(150);
zkus('starší stav ze serveru novější v zakázce nepřepíše', (await sloupec('kalk')).text === 'Vyhrané');

/* Odpověď, která dorazí až po otevření jiné zakázky, se zahodí. */
const pozde = await stranka.evaluate(async (zak) => {
  window.__pd.dotazy = [];
  let pust;
  window.__pd.cekej = new Promise(r => { pust = r; });
  const puvodni = window.onlineApi;
  window.onlineApi = (c) => window.__pd.cekej.then(() => ({ ok: true, nastaveno: true, status: 'lost', nacteno: '2026-10-22T10:00:00.000Z' }));
  ZAK = importZakazka(JSON.parse(JSON.stringify(zak))); render();
  await new Promise(r => setTimeout(r, 30));
  const jina = novaZakazka(); jina.cislo = '2026 - OPR - CN - 7202';
  ZAK = jina; render();
  pust(); await new Promise(r => setTimeout(r, 60));
  window.onlineApi = puvodni;
  return { pdStav: ZAK.pdStav || null, cislo: ZAK.cislo };
}, zakazka);
zkus('pozdní odpověď k zakázce, která už není otevřená, se zahodí', pozde.pdStav === null && pozde.cislo === '2026 - OPR - CN - 7202', pozde);

/* Bez přihlášení se do serveru nechodí (offline: jen poslední známý stav). */
const offline = await stranka.evaluate(async (zak) => {
  window.__pd.dotazy = [];
  ONLINE_STAV.ja = null;
  ZAK = importZakazka(JSON.parse(JSON.stringify(Object.assign({}, zak, { pdStav: { status: 'won', nacteno: '2026-10-01T08:00:00.000Z' } }))));
  render();
  await new Promise(r => setTimeout(r, 60));
  return window.__pd.dotazy.length;
}, zakazka);
zkus('bez přihlášení se server nevolá a hlavička ukáže poslední známý stav',
  offline === 0 && (await sloupec('kalk')).text === 'Vyhrané', offline);

/* Duplikát zakázky deal ani stav nepřebírá. */
const dup = await stranka.evaluate(() => {
  const z = novaZakazka(); z.pdDealId = '4711'; z.pdStav = { status: 'won', nacteno: '2026-10-22T08:15:00.000Z' };
  const d = zakazkaDuplikuj(z, '2026 - OPR - CN - 7203');
  return { deal: 'pdDealId' in d, stav: 'pdStav' in d };
});
zkus('duplikát zakázky deal ani jeho stav nepřebírá', !dup.deal && !dup.stav, dup);

zkus('bez chyb v konzoli', chyby.length === 0, chyby);
await prohlizec.close();
console.log(`\n${ok} prošlo, ${fail} selhalo`);
if (fail) process.exit(1);
