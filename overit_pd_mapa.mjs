/* Nastavení → Mapa polí CRM nad sestavením dist/kalkulacka.html
 * (#114, CRM-15, 26. 10. 2026).
 *
 * Sestavení řádků přehledu a práva serveru testuje
 * netlify/test_pd_mapa_prehled.mjs. Tady jde o to, co se v Node ověřit
 * nedá: záložka jen pro administrátora, načtení ze serveru právě jednou,
 * souhrn se štítky, tabulka se všemi stavy, nezařazená pole, filtr „jen
 * pole s problémem", tlačítko Obnovit z CRM (?obnovit=1), nenastavený token
 * a chyba API jako hláška (ne pád), a že ruční přiřazení nikde není.
 *
 * Server se nahrazuje funkcí `onlineApi` v paměti stránky — odpověď má tvar
 * /api/pd/pole (prehled jako z pdPrehledMapy). */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'node:url';
const KOREN = fileURLToPath(new URL('.', import.meta.url));
const soubor = 'file://' + path.resolve(KOREN, 'dist/kalkulacka.html');

let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail ? '  → ' + detail : '')); }
};

const prohlizec = await chromium.launch();
const stranka = await prohlizec.newPage();
const chyby = [];
stranka.on('console', m => { if (m.type() === 'error') chyby.push(m.text()); });
stranka.on('pageerror', e => chyby.push(String(e)));
await stranka.goto(soubor);
await stranka.waitForTimeout(400);

await stranka.evaluate(() => {
  window.hlaska = () => Promise.resolve();
  window.potvrd = () => Promise.resolve(true);
  /* Stránka je z file:// — mapa se na server ptá jen přes http(s). */
  window.pdmUiServer = () => true;
  const radek = (klic, nazev, typ, smer, zdroj, stav, navic) => Object.assign({ oblast: 'deal', klic, nazev, druh: '',
    typ, smer, zdroj, stav, crmNazev: '', crmTyp: '', pocet: 0, zapisovatelne: null }, navic || {});
  window.__prehled = (poridano) => ({
    radky: [
      radek('zpusobFakturace', 'Způsob fakturace', 'enum', 'zapis', ['OCK', 'PROJ'], 'sparovano',
        { crmNazev: 'Způsob fakturace', crmTyp: 'enum', zapisovatelne: true }),
      radek('adresaStavby', 'Adresa realizace', 'varchar / text / varchar_auto', 'cteni', [], 'sparovano',
        { crmNazev: 'Adresa realizace', crmTyp: 'varchar', zapisovatelne: true }),
      radek('platebniKalendar', 'Platební kalendář SoD PROJ', 'text', 'zapis', ['PROJ'], 'chybi'),
      radek('splatnostDni', 'Splatnost faktur (dny)', 'double', 'zapis', ['OCK', 'PROJ'], 'typNesedi',
        { crmNazev: 'Splatnost faktur (dny)', crmTyp: 'varchar' }),
      radek('atyp', 'ATYP', 'enum', 'zapis', ['OCK'], 'nejednoznacne', { pocet: 2 }),
      radek('platba1', 'Platba 1 – po podpisu smlouvy', 'monetary', 'nic', [], 'sparovano',
        { crmNazev: 'Platba 1 – po podpisu smlouvy', crmTyp: 'monetary', zapisovatelne: true }),
      Object.assign(radek('ico', 'IČ', 'double / varchar / text', 'cteni', [], 'sparovano',
        { crmNazev: 'IČ', crmTyp: 'double', zapisovatelne: true }), { oblast: 'organizace' }),
    ],
    nezarazeno: [{ nazev: 'Priorita', typ: 'enum' }, { nazev: '<b>Typ zakázky (nový)</b>', typ: 'enum' }],
    souhrn: { celkem: 7, sparovano: 4, chybi: 1, typNesedi: 1, nejednoznacne: 1, nezarazeno: 2 },
    poridano, verze: 2,
  });
  window.__srv = { dotazy: [], rezim: 'ok' };
  window.onlineApi = (cesta) => {
    window.__srv.dotazy.push(cesta);
    if (!cesta.startsWith('/api/pd/pole')) return Promise.reject(new Error('harness: neznámá cesta ' + cesta));
    if (window.__srv.rezim === 'nenastaveno') return Promise.resolve({ ok: true, nastaveno: false, mapa: {},
      chyba: 'Napojení na Pipedrive zatím není nastavené. Administrátor doplní PIPEDRIVE_API_TOKEN a PIPEDRIVE_DOMENA v Netlify.' });
    if (window.__srv.rezim === 'chyba') return Promise.reject(new Error('Pipedrive odmítl přístupový token. Zkontrolujte proměnnou v Netlify.'));
    const t = 1761480000000 + window.__srv.dotazy.length * 60000;
    return Promise.resolve({ ok: true, nastaveno: true, verze: 2, poridano: t, prehled: window.__prehled(t) });
  };
});

console.log('\nMapa polí CRM — záložka jen pro administrátora');
const bezAdmina = await stranka.evaluate(() => {
  NAST.jeAdmin = false; ONLINE_STAV.ja = { email: 'obchodnik@priklad.cz', role: 'Obchodník', jmeno: 'O' };
  otevriNastaveni();
  return { zalozka: nastPanelyViditelne().map(p => p.id).includes('pdmapa'), telo: nastPdMapa(), dotazy: window.__srv.dotazy.length };
});
zkus('obchodník záložku Mapa polí CRM nevidí', bezAdmina.zalozka === false);
zkus('… ani zavolané tělo panelu mu nic nenačte', /jen administrátorovi/.test(bezAdmina.telo) && bezAdmina.dotazy === 0,
  bezAdmina.dotazy + ' ' + bezAdmina.telo.slice(0, 80));
const vedouci = await stranka.evaluate(() => {
  NAST.jeAdmin = false; ONLINE_STAV.ja = { email: 'vedouci@priklad.cz', role: 'Vedoucí', jmeno: 'V' };
  return nastPanelyViditelne().map(p => p.id).includes('pdmapa');
});
zkus('vedoucí záložku nevidí', vedouci === false);
const sAdminem = await stranka.evaluate(() => {
  NAST.jeAdmin = true; ONLINE_STAV.ja = { email: 'spravce@priklad.cz', role: 'Administrátor', jmeno: 'S' };
  return nastPanelyViditelne().map(p => p.id).includes('pdmapa');
});
zkus('administrátor záložku Mapa polí CRM vidí', sAdminem === true);

await stranka.evaluate(() => nastPanel('pdmapa'));
await stranka.waitForFunction(() => PDM_STAV.nacteno === true);
await stranka.evaluate(() => render());
await stranka.waitForSelector('#pdmTabulka');
const nacteno = await stranka.evaluate(() => {
  const radky = [...document.querySelectorAll('#pdmTabulka tr[data-pdm-pole]')];
  const r = (k) => radky.find(x => x.dataset.pdmPole === k);
  const text = (k) => (r(k) || {}).textContent || '';
  return {
    dotazy: window.__srv.dotazy.slice(),
    souhrn: (document.getElementById('pdmSouhrn') || {}).textContent || '',
    pillSouhrn: [...document.querySelectorAll('#pdmSouhrn [data-pdm-souhrn]')].map(x => x.dataset.pdmSouhrn + ':' + x.className),
    radku: radky.length,
    stavy: radky.map(x => x.dataset.pdmStav),
    kal: text('deal:platebniKalendar'), spl: text('deal:splatnostDni'), atyp: text('deal:atyp'),
    zp: text('deal:zpusobFakturace'), adr: text('deal:adresaStavby'), ico: text('organizace:ico'),
    pillKal: (r('deal:platebniKalendar').querySelector('.pill') || {}).className,
    nez: [...document.querySelectorAll('#pdmNezarazene tr[data-pdm-nezarazeno]')].map(x => [...x.cells].map(c => c.textContent.trim()).join(' | ')),
    nezHtml: (document.getElementById('pdmNezarazene') || {}).innerHTML || '',
    info: (document.getElementById('pdmInfo') || {}).textContent || '',
    vstupy: document.querySelectorAll('#pdmTabulka select, #pdmTabulka input, #pdmNezarazene select, #pdmNezarazene input, #pdmNezarazene button').length,
  };
});
zkus('otevření záložky načte mapu ze serveru právě jednou (bez obnovení)',
  JSON.stringify(nacteno.dotazy) === '["/api/pd/pole"]', JSON.stringify(nacteno.dotazy));
zkus('souhrn nahoře: počty podle stavu', /7 polí kalkulace/.test(nacteno.souhrn) && /spárováno: 4/.test(nacteno.souhrn)
  && /chybí v CRM: 1/.test(nacteno.souhrn) && /jiný typ: 1/.test(nacteno.souhrn) && /dvakrát: 1/.test(nacteno.souhrn)
  && /nezařazená v CRM: 2/.test(nacteno.souhrn), nacteno.souhrn);
zkus('souhrn: barevné štítky (chybí červeně, jiný typ a dvakrát oranžově)',
  nacteno.pillSouhrn.includes('chybi:pill bad') && nacteno.pillSouhrn.includes('typNesedi:pill warn')
  && nacteno.pillSouhrn.includes('nejednoznacne:pill warn') && nacteno.pillSouhrn.includes('sparovano:pill '),
  JSON.stringify(nacteno.pillSouhrn));
zkus('tabulka má všech 7 řádků ve všech stavech', nacteno.radku === 7
  && ['sparovano', 'chybi', 'typNesedi', 'nejednoznacne'].every(s => nacteno.stavy.includes(s)), JSON.stringify(nacteno.stavy));
zkus('chybí: Platební kalendář SoD PROJ s vysvětlením a červeným štítkem',
  /chybí v CRM/.test(nacteno.kal) && /založí integrátor/.test(nacteno.kal) && /PROJ/.test(nacteno.kal)
  && /zapisuje se do CRM/.test(nacteno.kal) && /bad/.test(nacteno.pillKal), nacteno.kal);
zkus('jiný typ: v CRM Text, čeká se Číslo', /jiný typ/.test(nacteno.spl) && /v CRM Text, čeká se Číslo/.test(nacteno.spl), nacteno.spl);
zkus('dvakrát: počet stejných názvů', /dvakrát/.test(nacteno.atyp) && /2× stejný název/.test(nacteno.atyp), nacteno.atyp);
zkus('spárováno: název a typ v CRM, zdroj OCK + PROJ', /spárováno/.test(nacteno.zp) && /Způsob fakturace \(Jedna možnost\)/.test(nacteno.zp)
  && /OCK \+ PROJ/.test(nacteno.zp), nacteno.zp);
zkus('pole jen ke čtení: „čte se z CRM", zdroj —', /čte se z CRM/.test(nacteno.adr) && /—/.test(nacteno.adr), nacteno.adr);
zkus('pole organizace je označené', /\(organizace\)/.test(nacteno.ico), nacteno.ico);
zkus('nezařazená pole CRM: Priorita a přejmenovaný typ zakázky', nacteno.nez.length === 2
  && nacteno.nez[0] === 'Priorita | Jedna možnost', JSON.stringify(nacteno.nez));
zkus('název pole z CRM se escapuje', !/<b>Typ zakázky/.test(nacteno.nezHtml) && /&lt;b&gt;Typ zakázky/.test(nacteno.nezHtml));
zkus('ruční přiřazení není: v tabulkách žádný výběr ani tlačítko', nacteno.vstupy === 0, String(nacteno.vstupy));
zkus('vysvětlení pro administrátora: přejmenované pole = chybí', /přejmenované pole/.test(nacteno.info), nacteno.info);

console.log('\nFiltr a obnovení z CRM');
await stranka.check('#pdmJenProblemy');
const filtr = await stranka.evaluate(() => [...document.querySelectorAll('#pdmTabulka tr[data-pdm-pole]')].map(x => x.dataset.pdmStav));
zkus('„jen pole s problémem" skryje spárovaná', filtr.length === 3 && !filtr.includes('sparovano'), JSON.stringify(filtr));
await stranka.uncheck('#pdmJenProblemy');
await stranka.click('#pdmObnov');
await stranka.waitForFunction(() => window.__srv.dotazy.length === 2 && PDM_STAV.nacita === false);
const obnoveno = await stranka.evaluate(() => ({ dotazy: window.__srv.dotazy.slice(),
  radku: document.querySelectorAll('#pdmTabulka tr[data-pdm-pole]').length,
  tl: (document.getElementById('pdmObnov') || {}).textContent || '' }));
zkus('Obnovit z CRM se zeptá s ?obnovit=1', obnoveno.dotazy[1] === '/api/pd/pole?obnovit=1', JSON.stringify(obnoveno.dotazy));
zkus('… a tabulka se znovu nakreslí, tlačítko zase „Obnovit z CRM"', obnoveno.radku === 7 && /Obnovit z CRM/.test(obnoveno.tl), JSON.stringify(obnoveno));

console.log('\nChyba API a nenastavený token');
await stranka.evaluate(() => { window.__srv.rezim = 'chyba'; });
await stranka.click('#pdmObnov');
await stranka.waitForFunction(() => window.__srv.dotazy.length === 3 && PDM_STAV.nacita === false);
const poChybe = await stranka.evaluate(() => ({ chyba: (document.getElementById('pdmChyba') || {}).textContent || '',
  radku: document.querySelectorAll('#pdmTabulka tr[data-pdm-pole]').length, ja: !!ONLINE_STAV.ja }));
zkus('chyba API: srozumitelná hláška, poslední mapa zůstane vidět', /nepodařilo načíst z Pipedrive/.test(poChybe.chyba)
  && /přístupový token/.test(poChybe.chyba) && /poslední načtená mapa/.test(poChybe.chyba) && poChybe.radku === 7, JSON.stringify(poChybe));
zkus('… a správce zůstane přihlášený', poChybe.ja === true);
await stranka.evaluate(() => { PDM_STAV.data = null; PDM_STAV.chyba = ''; PDM_STAV.nacteno = false; window.__srv.rezim = 'chyba'; render(); });
await stranka.waitForFunction(() => PDM_STAV.nacteno === true && PDM_STAV.nacita === false);
const chybaBezMapy = await stranka.evaluate(() => ({ chyba: (document.getElementById('pdmChyba') || {}).textContent || '',
  obnov: !!document.getElementById('pdmObnov') }));
zkus('chyba při prvním načtení: hláška a tlačítko Obnovit z CRM', /nepodařilo načíst/.test(chybaBezMapy.chyba) && chybaBezMapy.obnov,
  JSON.stringify(chybaBezMapy));
await stranka.evaluate(() => { PDM_STAV.data = null; PDM_STAV.chyba = ''; PDM_STAV.nacteno = false; window.__srv.rezim = 'nenastaveno'; render(); });
await stranka.waitForFunction(() => PDM_STAV.nacteno === true && PDM_STAV.nacita === false);
const nenast = await stranka.evaluate(() => ({ chyba: (document.getElementById('pdmChyba') || {}).textContent || '',
  tabulka: !!document.getElementById('pdmTabulka') }));
zkus('nenastavený token: hláška pro administrátora, žádná tabulka', /zatím není nastavené/.test(nenast.chyba) && !nenast.tabulka,
  JSON.stringify(nenast));

zkus('bez chyb v konzoli', chyby.length === 0, chyby.slice(0, 3).join(' | '));
await prohlizec.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
