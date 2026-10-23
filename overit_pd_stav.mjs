/* Stav Pipedrive v hlavičce — opravy převzaté do P1 z větve
 * claude/eager-carson-1xznt2 (P2, 23. 10. 2026; původní harness téže větve
 * přepsaný na API P1 `/api/pd/stav?soubor=…`).
 *
 * Co se v Node ověřit nedá:
 *   1. Sazba DPH stojí na konci sloupce (`na-konec`) — datum vytvoření je
 *      dál na její úrovni i u zahraniční zakázky s kurzem (bez opravy sjede
 *      o 38 px, protože řádek „Stav Pipedrive" prodlouží pravý sloupec);
 *   2. stav se obnoví i po otevření zakázky ZE SOUBORU, po obnově zálohy
 *      z prohlížeče a po přihlášení (pdStavObnovZak v online_ui.js) — jednou
 *      pro zakázku a deal (K7-K6: ne po překreslení ani po autosave);
 *      načtený stav není neuložená změna; odpověď k jiné zakázce se zahodí.
 *
 * Server (/api/pd/stav, koš smazaných dealů, kontrola dealu) hlídá
 * netlify/test_pd_stav.mjs; tady ho nahrazuje `onlineApi` v paměti stránky.
 * Pojistka: na f3b5d42 (P1 bez oprav) selžou kontroly rozvržení u zahraniční
 * zakázky a všechny kontroly „po otevření ze souboru / zálohy / přihlášení". */
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
  window.onlineApi = (cesta) => {
    if (String(cesta).startsWith('/api/pd/stav?')) {
      window.__pd.dotazy.push(String(cesta));
      if (window.__pd.chyba) return Promise.reject(new Error('Pipedrive momentálně neodpovídá.'));
      return Promise.resolve(window.__pd.odpoved || { ok: true, nastaveno: true, pdStav: null });
    }
    return Promise.resolve({ ok: true });
  };
});

console.log('\nRozvržení hlavičky (Sazba DPH na konci sloupce):');
const zarovnani = (tab, zahr) => stranka.evaluate(([tab, zahr]) => {
  ZAK.pdDealId = '4711'; ZAK.pdStav = { status: 'won', nacteno: '2026-10-22T08:15:00.000Z' };
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
  zkus(popis + ': datum vytvoření na úrovni sazby DPH', z.datum != null && z.dph != null && Math.abs(z.datum - z.dph) <= 3, z);
}
await zarovnani('kalk', false);

const zakazka = await stranka.evaluate(() => {
  const z = novaZakazka(); z.cislo = '2026 - OPR - CN - 7201'; z.nazevAkce = 'Stav Pipedrive'; z.pdDealId = '4711';
  return z;
});
const ocekavanyDotaz = await stranka.evaluate((z) => '/api/pd/stav?soubor=' + encodeURIComponent(uloJmenoSouboru(z))
  + '&deal=4711', zakazka);
const prihlas = () => stranka.evaluate(() => {
  ONLINE_STAV.ja = { email: 'obchod@priklad.cz', jmeno: 'Obchodník', role: 'Obchodník' };
  ONLINE_STAV.soubor = ''; ONLINE_STAV.pdStavZak = null;
});
const stavPo = () => stranka.evaluate(() => ({ dotazy: window.__pd.dotazy.slice(), stav: ZAK.pdStav || null,
  neulozeno: historieNeulozeno() }));
const LOST = { ok: true, nastaveno: true, pdStav: { status: 'lost', nacteno: '2026-10-22T09:00:00.000Z' } };

console.log('\nOtevření zakázky ze souboru:');
await prihlas();
await stranka.evaluate(([zak, odp]) => {
  window.__pd.dotazy = []; window.__pd.odpoved = odp;
  const json = JSON.stringify(zak);
  nactiZakazku({ target: { files: [{ text: () => Promise.resolve(json) }], value: '' } });
}, [zakazka, LOST]);
await stranka.waitForTimeout(200);
{ const p = await stavPo();
  zkus('po otevření ze souboru se server zeptá jednou (soubor + deal)', p.dotazy.length === 1 && p.dotazy[0] === ocekavanyDotaz, p.dotazy);
  zkus('stav se uloží k zakázce a hlavička ho ukáže', p.stav && p.stav.status === 'lost', p.stav);
  zkus('načtený stav není neuložená změna', p.neulozeno === false, p); }
await stranka.evaluate(() => { window.__pd.dotazy = []; for (let i = 0; i < 5; i++) render(); set('ZAK.nazevAkce', 'úprava'); render(); });
await stranka.waitForTimeout(150);
zkus('K7-K6: překreslení ani úprava se znovu neptají', (await stranka.evaluate(() => window.__pd.dotazy.length)) === 0);

console.log('\nObnova zálohy z prohlížeče:');
await prihlas();
await stranka.evaluate(([zak, odp]) => {
  window.__pd.dotazy = []; window.__pd.odpoved = odp;
  const z = JSON.parse(JSON.stringify(zak));
  window.historieZalohaCti = () => ({ zakazka: JSON.stringify(z) });
  historieObnovZalohu();
}, [zakazka, LOST]);
await stranka.waitForTimeout(200);
{ const p = await stavPo();
  zkus('po obnově zálohy se server zeptá jednou', p.dotazy.length === 1 && p.dotazy[0] === ocekavanyDotaz, p.dotazy);
  zkus('… a stav se do zakázky dosadí', p.stav && p.stav.status === 'lost', p.stav); }

console.log('\nPřihlášení:');
zkus('onlinePoPrihlaseni po návratu k poslední zakázce volá pdStavObnovZak',
  await stranka.evaluate(() => /onlineObnovPosledni\(\)\)[\s\S]*pdStavObnovZak\(\)/.test(String(onlinePoPrihlaseni))));
await stranka.evaluate(([zak]) => { ONLINE_STAV.ja = null; ZAK = importZakazka(JSON.parse(JSON.stringify(zak))); render(); }, [zakazka]);
{ const bez = await stranka.evaluate(async () => { window.__pd.dotazy = []; await pdStavObnovZak(); return window.__pd.dotazy.length; });
  zkus('bez přihlášení se server nevolá', bez === 0, bez); }
await prihlas();
const poPrihl = await stranka.evaluate(async (odp) => {
  window.__pd.dotazy = []; window.__pd.odpoved = odp;
  await Promise.all([pdStavObnovZak(), pdStavObnovZak()]);
  await pdStavObnovZak();
  return { dotazy: window.__pd.dotazy.length, stav: ZAK.pdStav };
}, LOST);
zkus('po přihlášení jeden dotaz, i když se o stav řekne třikrát (sdílený dotaz)', poPrihl.dotazy === 1 && poPrihl.stav && poPrihl.stav.status === 'lost', poPrihl);

console.log('\nChyby a pozdní odpovědi:');
await prihlas();
const chybPred = chyby.length;
await stranka.evaluate(async (zak) => {
  window.__pd.chyba = true;
  ZAK = importZakazka(JSON.parse(JSON.stringify(Object.assign({}, zak, { pdStav: { status: 'deleted', nacteno: '2026-09-01T08:00:00.000Z' } }))));
  render(); await pdStavObnovZak();
  window.__pd.chyba = false;
}, zakazka);
zkus('chyba serveru tiše ponechá poslední známý stav (Smazané)',
  (await stranka.evaluate(() => ZAK.pdStav && ZAK.pdStav.status)) === 'deleted' && chyby.length === chybPred, chyby.slice(chybPred));
await prihlas();
const pozde = await stranka.evaluate(async (zak) => {
  let pust; const cekej = new Promise(r => { pust = r; });
  const puvodni = window.onlineApi;
  window.onlineApi = () => cekej.then(() => ({ ok: true, nastaveno: true, pdStav: { status: 'lost', nacteno: '2026-10-22T10:00:00.000Z' } }));
  ZAK = importZakazka(JSON.parse(JSON.stringify(zak))); render();
  const p = pdStavObnovZak();
  const jina = novaZakazka(); jina.cislo = '2026 - OPR - CN - 7202'; jina.pdDealId = '4711';
  ZAK = jina; render();
  pust(); await p;
  window.onlineApi = puvodni;
  return { pdStav: ZAK.pdStav || null, cislo: ZAK.cislo };
}, zakazka);
zkus('odpověď k zakázce, která už není otevřená, se zahodí', pozde.pdStav === null && pozde.cislo === '2026 - OPR - CN - 7202', pozde);

zkus('bez chyb v konzoli', chyby.length === 0, chyby);
await prohlizec.close();
console.log(`\n${ok} prošlo, ${fail} selhalo`);
if (fail) process.exit(1);
