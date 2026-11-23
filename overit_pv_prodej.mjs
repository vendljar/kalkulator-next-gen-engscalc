/* Karta Prodej → zápis prodeje do dealu v Pipedrive (PV #597, 23. 11. 2026)
 * nad sestavením dist/kalkulacka.html.
 *
 * Server (náhled, otisk, souběh, CN, zápis) testuje netlify/test_pv_597_zapis.mjs.
 * Tady jde o kartu: po prodeji stav zápisu a tlačítko náhledu, tabulka
 * „pole / dnes v Pipedrive / nová hodnota“, potvrzení pošle akci „zapis“
 * s otiskem náhledu, cizí číslo nabídky → jen „Převzít deal a zapsat“
 * (prevzit), zastavený / vypnutý zápis tlačítko zakáže, stav „chyba“ ukáže
 * důvod a „Zkusit zápis znovu“, texty ze serveru se escapují.
 * Server se nahrazuje funkcí `onlineApi` v paměti stránky. */
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
  window.__hlasky = [];
  window.hlaska = (t) => { window.__hlasky.push(String(t)); return Promise.resolve(); };
  window.__potvrzeni = [];
  window.potvrd = (t) => { window.__potvrzeni.push(String(t)); return Promise.resolve(true); };
  window.onlineOtevri = () => Promise.resolve();
  window.onlineMozne = () => true;
  window.__srv = { dotazy: [], nahled: null, zapis: null };
  window.onlineApi = (cesta, telo) => {
    window.__srv.dotazy.push({ cesta, telo: JSON.parse(JSON.stringify(telo)) });
    if (cesta !== '/api/pd/prodej') return Promise.reject(new Error('harness: neznámá cesta ' + cesta));
    if (telo.akce === 'nahled') return Promise.resolve(JSON.parse(JSON.stringify(window.__srv.nahled)));
    const z = window.__srv.zapis;
    if (z instanceof Error) return Promise.reject(z);
    return Promise.resolve(z);
  };
  const N = (x) => Object.assign({ ok: true, rezim: 'simulator', deal: { id: 1034, nazev: 'CN-133 <b>Akce</b>', stav: 'open', faze: 24 },
    souhrn: {}, duvody: [], zastaveno: '', cizi: null, otisk: 'a'.repeat(32), zapisPovolen: true, nicKZapisu: false,
    hodnotaZdroj: 'nabidka', varovani: [],
    radky: [
      { klic: 'hodnotaDealu', nazev: 'Hodnota dealu', stav: 'zapise', hodnotaText: '980 000 CZK', vCrm: '50 000 CZK', posle: true, bezeZmeny: false },
      { klic: 'fazeDealu', nazev: 'Fáze dealu', stav: 'zapise', hodnotaText: 'Vyhrané k podpisu SoD (26)', vCrm: 'Vyjednávání (24)', posle: true, bezeZmeny: false },
      { klic: 'splatnostDni', nazev: 'Splatnost faktur (dny)', stav: 'zapise', hodnotaText: '14', vCrm: '14', posle: false, bezeZmeny: true },
      { klic: 'priplatkyNabidka', nazev: '<img src=x onerror="window.__xss=1">', stav: 'nelze', hodnotaText: '', vCrm: '', posle: false, bezeZmeny: false,
        duvod: 'text má 300 znaků, pole „Příplatky v nabídce" jich pojme 255' },
      { klic: 'odchylky', nazev: 'Odchylky', stav: 'prazdne', hodnotaText: '', vCrm: '', posle: false, bezeZmeny: false },
    ] }, x || {});
  window.__N = N;
  window.__srv.nahled = N();
  window.__srv.zapis = { ok: true, stav: 'zapsano', zapsano: ['Hodnota dealu', 'Fáze dealu'], razitko: 'r', varovani: [] };
  /* Prodaná zakázka navázaná na deal (jako po uložení prodeje). */
  ZAK.cislo = '2026 - OPR - CN - 0133'; ZAK.nazevAkce = 'Zkušební akce'; ZAK.pdDealId = '1034';
  const v = aktivniVarianta(ZAK);
  v.zamek = { zamceno: true, kdy: new Date().toISOString(), tisky: [] };
  v.prodano = { datum: objDnes(), kdo: 'obchodnik@priklad.cz', kdy: new Date().toISOString(), pipedrive: { stav: 'ceka', kdy: new Date().toISOString() } };
  ONLINE_STAV.ja = { email: 'obchodnik@priklad.cz', role: 'Obchodník', jmeno: 'O' };
  ONLINE_STAV.soubor = '2026-OPR-CN-0133.json';
  zavriNastaveni && zavriNastaveni(); prepniTab('kryci'); render();
});
const karta = () => stranka.evaluate(() => { const el = document.getElementById('prodejKarta_ock'); return el ? el.innerHTML : ''; });

console.log('\nProdaná zakázka — stav a tlačítko náhledu');
let h = await karta();
zkus('stav zápisu „čeká na zápis“ a tlačítko „Ukázat, co se zapíše do Pipedrive“', /čeká na zápis/.test(h)
  && /Ukázat, co se zapíše do Pipedrive/.test(h) && !!(await stranka.$('#prodPdNahled')), h.slice(0, 300));
zkus('bez náhledu se na server neptá', (await stranka.evaluate(() => window.__srv.dotazy.length)) === 0);

console.log('\nNáhled → tabulka');
await stranka.click('#prodPdNahled');
await stranka.waitForTimeout(150);
const nah = await stranka.evaluate(() => ({
  dotaz: window.__srv.dotazy[0],
  radky: [...document.querySelectorAll('#prodPdTabulka tbody tr')].map(tr => [tr.dataset.prodpdPole, tr.dataset.prodpdPosle]),
  hlavicka: [...document.querySelectorAll('#prodPdTabulka thead th')].map(th => th.textContent.trim()),
  xss: window.__xss || 0,
}));
zkus('dotaz: /api/pd/prodej, akce náhled, soubor zakázky, strany z krycího listu', nah.dotaz && nah.dotaz.cesta === '/api/pd/prodej'
  && nah.dotaz.telo.akce === 'nahled' && nah.dotaz.telo.soubor === '2026-OPR-CN-0133.json' && !!nah.dotaz.telo.strany.ock
  && nah.dotaz.telo.strany.ock.hodnoty.cisloCN !== undefined, JSON.stringify(nah.dotaz && nah.dotaz.telo).slice(0, 200));
zkus('tabulka: Pole / Dnes v Pipedrive / Nová hodnota', JSON.stringify(nah.hlavicka.slice(0, 3)) === JSON.stringify(['Pole v Pipedrive', 'Dnes v Pipedrive', 'Nová hodnota']), nah.hlavicka);
zkus('řádky bez prázdných, příznak „zapíše se“ jen u měněných', JSON.stringify(nah.radky) === JSON.stringify([['hodnotaDealu', '1'], ['fazeDealu', '1'], ['splatnostDni', '0'], ['priplatkyNabidka', '0']]), JSON.stringify(nah.radky));
h = await karta();
zkus('„beze změny“, „nezapíše se“ s důvodem a stará → nová hodnota', /beze změny/.test(h) && /nezapíše se/.test(h) && /pojme 255/.test(h)
  && /50 000 CZK/.test(h) && /980 000 CZK/.test(h));
zkus('texty ze serveru se escapují', nah.xss === 0 && /&lt;img/.test(h) && /&lt;b&gt;Akce/.test(h));
zkus('tlačítko „Potvrdit a zapsat do Pipedrive“ povolené', await stranka.evaluate(() => { const b = document.getElementById('prodPdZapsat'); return !!b && !b.disabled; }));

console.log('\nPotvrzení → zápis');
await stranka.click('#prodPdZapsat');
await stranka.waitForTimeout(200);
const zap = await stranka.evaluate(() => ({ dotaz: window.__srv.dotazy[window.__srv.dotazy.length - 1], potvrzeni: window.__potvrzeni.slice(-1)[0] || '' }));
zkus('potvrzovací dialog vypíše měněná pole „dnes → nové“ a že stav dealu se nemění', /Hodnota dealu: 50 000 CZK → 980 000 CZK/.test(zap.potvrzeni)
  && /Fáze dealu/.test(zap.potvrzeni) && !/Splatnost/.test(zap.potvrzeni) && /Stav dealu \(Vyhrané\) se nemění/.test(zap.potvrzeni), zap.potvrzeni);
zkus('zápis: akce „zapis“ s otiskem náhledu, bez prevzit', zap.dotaz.telo.akce === 'zapis' && zap.dotaz.telo.otisk === 'a'.repeat(32)
  && zap.dotaz.telo.prevzit === undefined && zap.dotaz.telo.soubor === '2026-OPR-CN-0133.json', JSON.stringify(zap.dotaz.telo).slice(0, 200));

console.log('\nCizí číslo nabídky → převzetí');
await stranka.evaluate(() => { window.__srv.nahled = window.__N({ cizi: { cislo: 'CN-<i>9999</i>' } }); render(); });
await stranka.click('#prodPdNahled');
await stranka.waitForTimeout(150);
h = await karta();
zkus('upozornění „Deal patří nabídce …“ (escapované), bez tlačítka Potvrdit, s „Převzít deal a zapsat“', /Deal patří nabídce CN-&lt;i&gt;9999/.test(h)
  && !(await stranka.$('#prodPdZapsat')) && !!(await stranka.$('#prodPdPrevzit')), h.slice(0, 400));
await stranka.click('#prodPdPrevzit');
await stranka.waitForTimeout(200);
const prev = await stranka.evaluate(() => ({ dotaz: window.__srv.dotazy[window.__srv.dotazy.length - 1], potvrzeni: window.__potvrzeni.slice(-1)[0] || '' }));
zkus('převzetí: potvrzení s poznámkou a protokolem, dotaz s prevzit: true', prev.dotaz.telo.akce === 'zapis' && prev.dotaz.telo.prevzit === true
  && /Převzít ho pro tuto nabídku/.test(prev.potvrzeni) && /poznámka/.test(prev.potvrzeni), prev.potvrzeni.slice(0, 200));

console.log('\nZastavený a vypnutý zápis, chyba a „Zkusit znovu“');
await stranka.evaluate(() => { window.__srv.nahled = window.__N({ zastaveno: 'Fáze dealu: nelze, deal je ztracený (prohraný)' }); render(); });
await stranka.click('#prodPdNahled'); await stranka.waitForTimeout(150);
zkus('zastavený zápis: důvod a zakázané tlačítko', /Zápis se neprovede: Fáze dealu: nelze, deal je ztracený/.test(await karta())
  && await stranka.evaluate(() => document.getElementById('prodPdZapsat').disabled));
await stranka.evaluate(() => { window.__srv.nahled = window.__N({ zapisPovolen: false }); render(); });
await stranka.click('#prodPdNahled'); await stranka.waitForTimeout(150);
zkus('vypnutý zápis (PIPEDRIVE_ZAPIS): věta a zakázané tlačítko', /na serveru vypnutý/.test(await karta())
  && await stranka.evaluate(() => document.getElementById('prodPdZapsat').disabled));
await stranka.evaluate(() => {
  const e = new Error('Pipedrive momentálně neodpovídá.'); e.data = { ok: false, stav: 'chyba' }; e.stav = 502;
  window.__srv.zapis = e; window.__srv.nahled = window.__N(); render();
});
await stranka.click('#prodPdNahled'); await stranka.waitForTimeout(150);
await stranka.click('#prodPdZapsat'); await stranka.waitForTimeout(200);
const ch = await stranka.evaluate(() => window.__hlasky.slice(-1)[0] || '');
zkus('selhání zápisu: hláška s důvodem a „Prodej platí dál“', /se nepovedl: Pipedrive momentálně neodpovídá/.test(ch) && /Prodej platí dál/.test(ch), ch);
await stranka.evaluate(() => {
  aktivniVarianta(ZAK).prodano.pipedrive = { stav: 'chyba', kdy: new Date().toISOString(), duvod: 'Pipedrive <b>neodpovídá</b>.' }; render();
});
h = await karta();
zkus('stav „zápis selhal“ s důvodem (escapovaným) a tlačítko „Zkusit zápis znovu“', /zápis selhal/.test(h) && /Pipedrive &lt;b&gt;neodpovídá/.test(h)
  && /Zkusit zápis znovu/.test(h), h.slice(0, 400));
await stranka.evaluate(() => { aktivniVarianta(ZAK).prodano.pipedrive = { stav: 'zapsano', kdy: '2026-11-23T10:00:00Z' }; render(); });
zkus('stav „zapsáno“ s datem', /zapsáno<\/b> \(23\. 11\. 2026\)/.test(await karta()), (await karta()).slice(0, 300));

console.log('\nBez práva Pipedrive');
await stranka.evaluate(() => { window.smiZobrazit = (k) => k !== 'crm.pipedrive'; render(); });
h = await karta();
zkus('bez práva crm.pipedrive: jen stav a věta, žádné tlačítko zápisu', !(await stranka.$('#prodPdNahled')) && /s právem/.test(h));

zkus('bez chyb v konzoli', chyby.length === 0, chyby.slice(0, 3).join(' | '));
await prohlizec.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
