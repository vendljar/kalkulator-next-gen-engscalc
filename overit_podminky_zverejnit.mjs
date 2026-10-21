/* Ověření v prohlížeči: zveřejnění platebních podmínek přímo na záložce
 * Nastavení → Smlouvy / Šablony a zarovnání oddílu „Společné pro OCK i PROJ"
 * (dávka U1, 20. 10. 2026).
 *
 * J. V.: po „Zapsat výchozí hodnoty do Firmy" hláška posílala na tlačítko
 * „Zveřejnit", které na záložce nebylo (jen dole v Nastavení → Firma), a
 * zpřesnění: „zapisuj je rovnou stiskem … změň pojmenování na ‚Zapsat výchozí
 * hodnoty'". Tady se hlídá: přejmenované tlačítko, stisk online = zápis +
 * zveřejnění (server je podvržený v onlineApi), výsledek a stav „neuloženo
 * online" přímo na záložce, chyba serveru, offline jen zápis a věta proč,
 * žádné odkazování na záložku Firma. A zarovnání: pravé okraje vstupů oddílu
 * v jedné svislici (±2 px) v širokém i úzkém okně.
 */
import { chromium } from 'playwright';

const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
const vysledky = [];
const ok = (co, podm, detail) => {
  console.log((podm ? '  ✓ ' : '  ✗ ') + co + (podm || detail === undefined ? '' : '  → ' + detail));
  vysledky.push(!!podm);
};

const b = await chromium.launch();
const konzole = [];
async function stranka(sirka) {
  const p = await b.newPage({ viewport: { width: sirka, height: 950 }, colorScheme: 'light' });
  p.on('console', m => { if (m.type() === 'error') konzole.push(m.text()); });
  p.on('pageerror', e => konzole.push(String(e)));
  await p.goto(KDE);
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    window.__dlg = [];
    window.__potvrd = 0;
    window.potvrd = t => { window.__potvrd++; window.__dlg.push(String(t)); return Promise.resolve(true); };
    window.hlaska = t => { window.__dlg.push(String(t)); return Promise.resolve(); };
    NAST.jeAdmin = true;
    NAST.firma = firmaDefault();
    otevriNastaveni();
    nastPanel('sablony');
  });
  await p.waitForTimeout(200);
  return p;
}
const tlacitka = p => p.evaluate(() => [...document.querySelectorAll('#nastaveni-overlay button')]
  .map(x => ({ t: x.textContent.trim(), primary: x.classList.contains('primary'), dis: x.disabled })));
const text = p => p.evaluate(() => document.getElementById('nastaveni-overlay').innerText);

// --- 1) offline (soubor): tlačítko přejmenované, jen zápis, věta proč ----------
let p = await stranka(1400);
let t = await tlacitka(p);
ok('tlačítko se jmenuje „Zapsat výchozí hodnoty"', t.some(x => x.t === 'Zapsat výchozí hodnoty'), JSON.stringify(t.map(x => x.t)));
ok('staré „… do Firmy" už není', !t.some(x => /do Firmy/.test(x.t)));
ok('offline: tlačítko zveřejnění se nekreslí', !t.some(x => /Zveřejnit/.test(x.t)));
ok('offline: záložka řekne, že online zveřejnit nejde', /online zveřejnit\s+teď nejde/.test(await text(p)));
await p.evaluate(() => podmZapsatVychozi());
await p.waitForTimeout(150);
let h = await p.evaluate(() => window.__dlg.join(' | '));
ok('offline: podmínky zapsané do Firmy', await p.evaluate(() => !!NAST.firma.podminky && NAST.firma.podminky.limitPokutProc !== undefined));
ok('offline: hláška řekne, že zveřejnit nejde a proč', /zveřejnit teď nejde/.test(h) && /neběží na serveru/.test(h), h);
ok('hláška neposílá na neexistující „Zveřejnit" ani na záložku Firma', !/tlačítkem „Zveřejnit"\./.test(h) && !/Nastavení → Firma/.test(h), h);
await p.close();

// --- 2) online administrátor (podvržený server) --------------------------------
p = await stranka(1400);
await p.evaluate(() => {
  window.__api = [];
  window.__chyba = null;
  onlineMozne = () => true;
  ONLINE_STAV.bezi = true;
  ONLINE_STAV.ja = { role: 'Administrátor', email: 'spravce@priklad.cz' };
  ONLINE_STAV.firma = null;
  onlineApi = (cesta, telo) => {
    window.__api.push([cesta, telo ? JSON.parse(JSON.stringify(telo)) : null]);
    if (window.__chyba) return Promise.reject(new Error(window.__chyba));
    if (cesta === '/api/firma' && telo) { window.__ulozeno = JSON.parse(JSON.stringify(telo.udaje)); return Promise.resolve({ ok: true }); }
    if (cesta === '/api/firma') return Promise.resolve({ firma: window.__ulozeno
      ? { udaje: window.__ulozeno, kdy: '2026-10-20T12:00', kdo: 'spravce@priklad.cz' } : null });
    return Promise.resolve({});
  };
  /* skutečné (zkušební) údaje — vzorek ze sestavení zveřejnit nejde */
  firmaSet('nazev', 'Zkušební ocelárna s.r.o.');
  firmaSet('ico', '12345678');
  firmaSet('sidloUlice', 'Zkušební 1');
  firmaSet('sidloPsc', '110 00');
  firmaSet('sidloMesto', 'Praha');
  firmaSet('telefon', '+420 111 222 333');
  nastRefresh();
});
await p.waitForTimeout(200);
t = await tlacitka(p);
ok('online: na záložce je „Zveřejnit změny online" (primární, činné)',
  t.some(x => x.t === 'Zveřejnit změny online' && x.primary && !x.dis), JSON.stringify(t.filter(x => /Zveř/.test(x.t))));
ok('online: stav „Neuloženo online" na záložce', /Neuloženo online/.test(await text(p)));

await p.evaluate(() => { window.__api = []; window.__dlg = []; window.__potvrd = 0; });
await p.evaluate(() => { [...document.querySelectorAll('#nastaveni-overlay button')].find(x => x.textContent.trim() === 'Zapsat výchozí hodnoty').click(); });
await p.waitForTimeout(400);
const api = await p.evaluate(() => window.__api);
const post = api.find(([c, telo]) => c === '/api/firma' && telo);
ok('stisk = zápis + zveřejnění: POST /api/firma s podmínkami', !!post && !!post[1].udaje.podminky
  && post[1].udaje.podminky.limitPokutProc !== undefined, JSON.stringify(api.map(x => x[0])));
ok('stisk zveřejní rovnou, bez dalšího dotazu', await p.evaluate(() => window.__potvrd === 0));
let tx = await text(p);
ok('potvrzení zveřejnění přímo na záložce', /Zveřejněno online/.test(tx), tx.slice(0, 300));
t = await tlacitka(p);
ok('online je totéž: jen nenápadné „Zveřejnit znovu (není potřeba)"',
  t.some(x => x.t === 'Zveřejnit znovu (není potřeba)' && !x.primary) && !/Neuloženo online/.test(tx));

// ruční úprava pole na záložce → neuloženo online, tlačítko zpět primární
await p.evaluate(() => podmSet(null, 'limitPokutProc', '15', 'cislo'));
await p.waitForTimeout(150);
tx = await text(p);
t = await tlacitka(p);
ok('ruční úprava limitu: „Neuloženo online" + rozdíl + primární tlačítko',
  /Neuloženo online/.test(tx) && /Oproti online kopii se liší/.test(tx) && t.some(x => x.t === 'Zveřejnit změny online' && x.primary));
ok('po úpravě už nesvítí staré „Zveřejněno online"', !/Zveřejněno online/.test(tx));
await p.evaluate(() => { window.__potvrd = 0; });
await p.evaluate(() => { [...document.querySelectorAll('#nastaveni-overlay button')].find(x => x.textContent.trim() === 'Zveřejnit změny online').click(); });
await p.waitForTimeout(400);
ok('„Zveřejnit změny online" se zeptá a zveřejní', await p.evaluate(() => window.__potvrd === 1 && window.__ulozeno.podminky.limitPokutProc === 15));
ok('po zveřejnění změn: online je totéž', /Zveřejněno online/.test(await text(p)) && !/Neuloženo online/.test(await text(p)));

// chyba serveru se ohlásí na záložce
await p.evaluate(() => { podmSet(null, 'limitPokutProc', '12', 'cislo'); window.__chyba = 'HTTP 500 zkušební výpadek'; });
await p.evaluate(() => podmZapsatVychozi());
await p.waitForTimeout(300);
tx = await text(p);
ok('chyba serveru: na záložce „Zveřejnit online se nepodařilo: …"', /Zveřejnit online se nepodařilo: HTTP 500 zkušební výpadek/.test(tx));
ok('chyba serveru: dál „Neuloženo online"', /Neuloženo online/.test(tx));

// ukázková data: zveřejnit nejde, řekne proč
await p.evaluate(() => { window.__chyba = null; NAST.firma.ukazkove = true; window.__api = []; });
await p.evaluate(() => podmZapsatVychozi());
await p.waitForTimeout(200);
ok('ukázková data: na server nic nejde, záložka řekne proč',
  await p.evaluate(() => !window.__api.some(([c, telo]) => c === '/api/firma' && telo)) && /Online zveřejnit nešly: Firemní údaje jsou pořád ukázkové/.test(await text(p)));
// hláška kapitol nabídky: kde přesně je tlačítko
await p.evaluate(() => { NAST.firma.ukazkove = false; NAST.firma.kapitolaIV = ''; window.__dlg = []; firmaKapitolyVychozi(); });
h = await p.evaluate(() => window.__dlg.join(' | '));
ok('hláška u kapitol nabídky: „Zveřejnit změny online" na této záložce', !/„Zveřejnit"\./.test(h)
  && (/Žádná kapitola/.test(h) || /„Zveřejnit změny online" nahoře na této záložce/.test(h)), h);

/* K4-N7 (O9, 21. 10. 2026): „Zapsat výchozí hodnoty" zveřejní jen podmínky.
 * Místní Firma s nezveřejněnou změnou názvu a kapitoly → na server jde online
 * kopie (název i kapitola zveřejněné) s novými podmínkami, rozdíl zůstane
 * místně a hláška ho vyjmenuje. Pojistka: před opravou odešel místní název
 * a kapitola (3 ✗). */
await p.evaluate(() => { window.__chyba = null; NAST.firma.ukazkove = false; NAST.firma.kapPozadavky = 'Zveřejněná kapitola IV.'; });
await p.evaluate(() => onlineZverejniFirmu(true));
await p.waitForTimeout(300);
await p.evaluate(() => { firmaSet('nazev', 'Nezveřejněný název s.r.o.'); NAST.firma.kapPozadavky = 'Místní rozepsaná kapitola';
  podmSet(null, 'limitPokutProc', '17', 'cislo'); window.__api = []; window.__potvrd = 0; });
await p.evaluate(() => podmZapsatVychozi());
await p.waitForTimeout(400);
const n7 = await p.evaluate(() => (window.__api.find(([c, telo]) => c === '/api/firma' && telo) || [null, null])[1]);
ok('K4-N7: na server jdou místní podmínky (zapsané výchozí hodnoty)', !!n7 && !!n7.udaje.podminky && n7.udaje.podminky.limitPokutProc === 17,
  JSON.stringify(n7 && n7.udaje.podminky));
ok('K4-N7: místní nezveřejněný název ani kapitola na server nejdou (zůstane online znění)',
  !!n7 && n7.udaje.nazev === 'Zkušební ocelárna s.r.o.' && n7.udaje.kapPozadavky === 'Zveřejněná kapitola IV.', JSON.stringify(n7 && [n7.udaje.nazev, n7.udaje.kapPozadavky]));
tx = await text(p) + ' ' + await p.evaluate(() => JSON.stringify(ONLINE_STAV.firmaVysledek));   // zpráva + výsledek; záložka ukáže rozdíl
ok('K4-N7: hláška vyjmenuje, co zůstalo jen místně, a kde to zveřejnit',
  /jen platební podmínky/.test(tx) && /Název firmy, IV. Požadavky/.test(tx) && /Nastavení → Firma/.test(tx), tx.slice(0, 400));
ok('K4-N7: záložka dál ukáže „Neuloženo online" s rozdílem Název firmy', /Neuloženo online/.test(tx) && /se liší: Název firmy, IV. Požadavky/.test(tx));
ok('K4-N7: místní změny zůstaly místně (nic se nepřepsalo)', await p.evaluate(() => NAST.firma.nazev === 'Nezveřejněný název s.r.o.'
  && NAST.firma.kapPozadavky === 'Místní rozepsaná kapitola' && window.__potvrd === 0));
await p.close();

// --- 3) zarovnání oddílu „Společné pro OCK i PROJ" a karet OCK/PROJ -------------
for (const sirka of [1400, 760]) {
  p = await stranka(sirka);
  for (const cast of ['ock', 'proj']) {
    const r = await p.evaluate(c => {
      podmPrepni(c);
      const radky = [...document.querySelectorAll('#nastaveni-overlay .row')]
        .filter(x => x.querySelector('[onchange^="podmSet"], [onchange^="firmaSet(\'platnost"]'));
      return radky.map(x => {
        const v = [...x.querySelectorAll('input, select')];
        return [x.querySelector('label').textContent.trim(), Math.round(v[v.length - 1].getBoundingClientRect().right)];
      });
    }, cast);
    const prave = r.map(x => x[1]);
    const rozptyl = Math.max(...prave) - Math.min(...prave);
    ok(`okno ${sirka} px, karta ${cast.toUpperCase()}: pravé okraje vstupů v jedné svislici (±2 px, ${r.length} řádků)`,
      r.length >= 8 && rozptyl <= 2, JSON.stringify(r));
    const limit = r.find(x => x[0] === 'Limit smluvních pokut');
    const jedn = await p.evaluate(() => {
      const i = [...document.querySelectorAll('#nastaveni-overlay input[type=number]')].find(x => /limitPokutProc/.test(x.getAttribute('onchange')));
      const j = i.parentElement.querySelector('.podm-jednotka');
      return j ? [j.textContent.trim(), Math.round(j.getBoundingClientRect().left - i.getBoundingClientRect().right)] : null;
    });
    ok(`okno ${sirka} px: jednotka „% z ceny díla" hned za vstupem limitu`, !!limit && jedn && jedn[0] === '% z ceny díla' && jedn[1] >= 0 && jedn[1] <= 12, JSON.stringify(jedn));
  }
  await p.close();
}

ok('za celý průchod žádná chyba v konzoli', konzole.length === 0, konzole.join(' | '));
await b.close();
const spatne = vysledky.filter(x => !x).length;
console.log('\n' + (vysledky.length - spatne) + ' OK, ' + spatne + ' FAIL');
process.exit(spatne ? 1 : 0);
