/* Nastavení → Controlling nad sestavením dist/kalkulacka.html
 * (#447, dávka C2, 20. 10. 2026).
 *
 * Model (rozvrh, export, import, kontrola) testuje src/test_controlling.js
 * a server netlify/test_controlling.mjs. Tady jde o to, co se v Node ověřit
 * nedá: záložka jen pro administrátora, načtení ze serveru, úprava skupiny
 * a uložení (na server jdou jen odchylky), zařazení trvalé položky,
 * upozornění u zveřejnění ceníku (J5), export zamčené řídící varianty
 * (XLSX opravdu stažený, CSV) a import mapování ze souboru.
 *
 * Server se nahrazuje funkcí `onlineApi` v paměti stránky — chová se jako
 * /api/controlling (verze, odchylky, odmítnutí „beze změny"), práva ověřují
 * serverové sady. */
import { chromium } from 'playwright';
import path from 'path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const KOREN = fileURLToPath(new URL('.', import.meta.url));
const soubor = 'file://' + path.resolve(KOREN, 'dist/kalkulacka.html');

let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail ? '  → ' + detail : '')); }
};

const prohlizec = await chromium.launch();
const stranka = await prohlizec.newPage({ acceptDownloads: true });
const chyby = [];
stranka.on('console', m => { if (m.type() === 'error') chyby.push(m.text()); });
stranka.on('pageerror', e => chyby.push(String(e)));
await stranka.goto(soubor);
await stranka.waitForTimeout(400);

await stranka.evaluate(() => {
  window.__dlgTexty = []; window.__odpoved = true; window.__dotaz = 'test harness';
  window.potvrd = (t) => { window.__dlgTexty.push(String(t)); return Promise.resolve(window.__odpoved); };
  window.hlaska = (t) => { window.__dlgTexty.push(String(t)); return Promise.resolve(); };
  window.dotaz = (t) => { window.__dlgTexty.push(String(t)); return Promise.resolve(window.__dotaz); };
  /* Náhrada serveru: /api/controlling v paměti. */
  window.__srv = { db: null, posty: [], gety: 0 };
  window.onlineApi = (cesta, telo) => {
    if (cesta !== '/api/controlling') return Promise.reject(new Error('harness: neznámá cesta ' + cesta));
    if (telo == null) { window.__srv.gety++; return Promise.resolve({ ok: true, db: window.__srv.db }); }
    window.__srv.posty.push(JSON.parse(JSON.stringify(telo)));
    const k = ctrlDataKontrola(telo.data);
    if (!k.ok) return Promise.reject(new Error(k.chyba));
    if (window.__srv.db && ctrlBezeZmeny(window.__srv.db, k.data)) return Promise.reject(new Error('neliší se'));
    window.__srv.db = ctrlDbNovaVerze(window.__srv.db, { data: k.data, kdo: 'spravce@priklad.cz', poznamka: telo.poznamka });
    return Promise.resolve({ ok: true, verze: window.__srv.db.platny.verze, kdy: window.__srv.db.platny.kdy });
  };
});

console.log('\nControlling — záložka jen pro administrátora');
const bezAdmina = await stranka.evaluate(() => {
  NAST.jeAdmin = false; ONLINE_STAV.ja = { email: 'obchodnik@priklad.cz', role: 'Obchodník', jmeno: 'O' };
  otevriNastaveni();
  return nastPanelyViditelne().map(p => p.id).includes('controlling');
});
zkus('obchodník záložku Controlling nevidí', bezAdmina === false);
const sAdminem = await stranka.evaluate(() => {
  NAST.jeAdmin = true; ONLINE_STAV.ja = { email: 'spravce@priklad.cz', role: 'Administrátor', jmeno: 'S' };
  return nastPanelyViditelne().map(p => p.id).includes('controlling');
});
zkus('administrátor záložku Controlling vidí', sAdminem === true);

await stranka.evaluate(() => nastPanel('controlling'));
await stranka.waitForFunction(() => CTRL_STAV.nacteno === true);
await stranka.evaluate(() => render());
const nacteno = await stranka.evaluate(() => ({
  gety: window.__srv.gety,
  info: (document.getElementById('ctrlInfo') || {}).textContent || '',
  radku: document.querySelectorAll('#ctrlSkupiny tr[data-ctrl-skupina]').length,
  vychozich: CTRL_SKUPINY_VYCHOZI.length,
  uloz: !!(document.getElementById('ctrlUloz') || {}).disabled,
}));
zkus('otevření záložky načte controlling ze serveru právě jednou', nacteno.gety === 1, String(nacteno.gety));
zkus('bez uložené verze platí výchozí rozvržení', /výchozí rozvržení/.test(nacteno.info), nacteno.info);
zkus('tabulka skupin má všechny výchozí skupiny', nacteno.radku === nacteno.vychozich, nacteno.radku + ' / ' + nacteno.vychozich);
zkus('bez změny je Uložit zhasnuté', nacteno.uloz === true);

console.log('\nÚprava skupiny a uložení');
await stranka.fill('#ctrlSkupiny tr[data-ctrl-skupina="mat-plechy"] td:nth-child(5) input', '501100, 501101');
await stranka.dispatchEvent('#ctrlSkupiny tr[data-ctrl-skupina="mat-plechy"] td:nth-child(5) input', 'change');
const poZmene = await stranka.evaluate(() => ({
  zmeneno: (document.getElementById('ctrlZmeneno') || {}).textContent || '',
  uloz: !!(document.getElementById('ctrlUloz') || {}).disabled,
}));
zkus('změna účtu rozsvítí Uložit a hlášku o neuložených změnách', poZmene.uloz === false && /neuložené/.test(poZmene.zmeneno), JSON.stringify(poZmene));
await stranka.click('#ctrlUloz');
await stranka.waitForFunction(() => window.__srv.db && window.__srv.db.platny && /verze 1/.test((document.getElementById('ctrlInfo') || {}).textContent || ''));
const ulozeno = await stranka.evaluate(() => {
  const p = window.__srv.posty[window.__srv.posty.length - 1];
  return { mapa: Object.keys(p.data.mapa).length, ucet: p.data.skupiny.find(s => s.id === 'mat-plechy').ucetBudouci,
    pozn: p.poznamka, zmeneno: (document.getElementById('ctrlZmeneno') || {}).textContent || '' };
});
zkus('na server jde číselník a z mapování jen odchylky (žádné)', ulozeno.mapa === 0, String(ulozeno.mapa));
zkus('uložený účet budoucí odpovídá zadání (dva účty)', JSON.stringify(ulozeno.ucet) === '["501100","501101"]', JSON.stringify(ulozeno.ucet));
zkus('poznámka z dialogu jde s verzí', ulozeno.pozn === 'test harness');
zkus('po uložení platí verze 1 a nic neuloženého nezbývá', /Odpovídá uložené verzi/.test(ulozeno.zmeneno), ulozeno.zmeneno);

console.log('\nTrvalá položka bez skupiny — mapování a upozornění u ceníku (J5)');
await stranka.evaluate(() => {
  KATALOG.polozky.hrubaOck.push({ kid: 'k991', nazev: 'Testovací kotva harness', mnozstvi: 1, cena: 0, jednotka: 'ks' });
  CTRL_STAV.karta = 'mapa'; CTRL_STAV.jenNezarazene = true; render();
});
const mapa = await stranka.evaluate(() => ({
  radky: [...document.querySelectorAll('#ctrlMapa tr[data-ctrl-klic]')].map(r => r.getAttribute('data-ctrl-klic')),
  stitek: (document.getElementById('ctrlKarta_mapa') || {}).textContent || '',
}));
zkus('filtr „jen nezařazené" ukáže jen novou trvalou položku', JSON.stringify(mapa.radky) === '["K.k991"]', JSON.stringify(mapa.radky));
zkus('štítek karty hlásí 1 nezařazenou', /1 nezařazené/.test(mapa.stitek), mapa.stitek);
const upoz = await stranka.evaluate(() => {
  zavriNastaveni(); NAST.panel = 'controlling';
  const html = renderCenikProgramKarta();
  const d = document.createElement('div'); d.innerHTML = html; document.body.appendChild(d); d.id = '__karta';
  const el = d.querySelector('#ctrlUpozorneni');
  return { je: !!el, text: el ? el.textContent : '', select: el ? !!el.querySelector('select') : false };
});
zkus('karta zveřejnění ceníku upozorní na nezařazenou položku', upoz.je && /1 trvalá položka nemá/.test(upoz.text), upoz.text.slice(0, 120));
zkus('upozornění neblokuje a nabízí zařazení rovnou na místě', upoz.select && /neblokuje/.test(upoz.text));
await stranka.selectOption('#__karta #ctrlUpozorneni select', 'mat-ostatni');
await stranka.click('#__karta #ctrlUpozorneniUloz');
await stranka.waitForFunction(() => window.__srv.db.platny.verze === 2);
const zarazeno = await stranka.evaluate(() => {
  document.getElementById('__karta').remove();
  const p = window.__srv.posty[window.__srv.posty.length - 1];
  return { mapa: p.data.mapa, upoz: renderCenikProgramKarta().includes('ctrlUpozorneni') };
});
zkus('zařazení z karty ceníku uloží K.k991 → mat-ostatni (verze 2)', zarazeno.mapa['K.k991'] === 'mat-ostatni', JSON.stringify(zarazeno.mapa));
zkus('po zařazení upozornění zmizí', zarazeno.upoz === false);

console.log('\nExport předkalkulace zamčené řídící varianty');
await stranka.evaluate(() => {
  ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 0902'; ZAK.nazevAkce = 'Harness akce';
  Object.assign(ZAK.varianty[0].data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2 });
  syncVarianta();
  otevriNastaveni(); CTRL_STAV.karta = 'export'; nastPanel('controlling');
});
const nezamceno = await stranka.evaluate(() => ({
  xlsx: !!(document.getElementById('ctrlExportXlsx') || {}).disabled,
  stav: (document.getElementById('ctrlExportStav') || {}).textContent || '',
}));
zkus('nezamčená varianta: export zhasnutý s vysvětlením (J9)', nezamceno.xlsx && /není zamčená/.test(nezamceno.stav), nezamceno.stav.slice(0, 120));
await stranka.evaluate(() => {
  const v = ridiciVarianta(ZAK);
  zamkniVariantu(v, { cislo: variantaCislo(ZAK, v), kdo: 'spravce@priklad.cz', typ: 'nabidka',
    vysledek: zamekVysledekSpocti(v, JEKLY, 'harness') });
  render();
});
const zamceno = await stranka.evaluate(() => ({
  xlsx: !!(document.getElementById('ctrlExportXlsx') || {}).disabled,
  stav: (document.getElementById('ctrlExportStav') || {}).textContent || '',
}));
zkus('zamčená řídící varianta: export povolený, výsledek zmrazený', !zamceno.xlsx && /zmrazený/.test(zamceno.stav), zamceno.stav.slice(0, 160));
const [stazeni] = await Promise.all([stranka.waitForEvent('download'), stranka.click('#ctrlExportXlsx')]);
const jmeno = stazeni.suggestedFilename();
const bajty = Array.from(readFileSync(await stazeni.path()));
zkus('stáhne se PREDKALKULACE_<číslo>_<datum>.xlsx', /^PREDKALKULACE_2026_-_OPR_-_CN_-_0902_\d{4}-\d{2}-\d{2}\.xlsx$/.test(jmeno), jmeno);
const obsah = await stranka.evaluate(async (b) => {
  const sheets = await xlsxPrecti(new Uint8Array(b));
  const r = sheets.find(s => s.nazev === 'Řádky');
  const p = sheets.find(s => s.nazev === 'Popis');
  const exp = ctrlExportVarianty(ZAK, ridiciVarianta(ZAK), { jekly: JEKLY });
  return { listy: sheets.map(s => s.nazev), radku: r ? r.rows.length : 0, ocekavano: exp.radky.length + 1,
    hlavicka: r ? r.rows[0].slice(0, 3) : [], verze: p ? (p.rows.find(x => x[0] === 'Verze mapování') || [])[1] : null,
    stav: (document.getElementById('ctrlStav') || {}).textContent || '' };
}, bajty);
zkus('sešit má listy Řádky, Kapitoly, Popis', obsah.listy.join(',') === 'Řádky,Kapitoly,Popis', obsah.listy.join(','));
zkus('list Řádky: hlavička + řádek na řádek kalkulace', obsah.radku === obsah.ocekavano && obsah.hlavicka[0] === 'Číslo nabídky', obsah.radku + ' / ' + obsah.ocekavano);
zkus('list Popis nese uloženou verzi mapování (2)', String(obsah.verze) === '2', String(obsah.verze));
zkus('hláška o stažení s počtem řádků', /Staženo PREDKALKULACE_.*řádků/.test(obsah.stav), obsah.stav);
const [csvStazeni] = await Promise.all([stranka.waitForEvent('download'), stranka.click('#ctrlExportCsv')]);
const csv = readFileSync(await csvStazeni.path(), 'utf8');
zkus('CSV: BOM, středník, jméno .csv', csv.charCodeAt(0) === 0xFEFF && csv.split('\r\n')[0].includes('";"') && /\.csv$/.test(csvStazeni.suggestedFilename()));

console.log('\nImport mapování ze souboru');
const xlsxImport = await stranka.evaluate(async () => {
  const listy = ctrlMapaListy(CTRL_STAV.data, {});
  const rows = listy[0].rows; const iK = rows[0].indexOf('Klíč'), iS = rows[0].indexOf('Skupina (id)');
  rows.find(r => r[iK] === 'C.cisteniKc')[iS] = 'sl-lakovani';
  return Array.from(new Uint8Array(await xlsxZapis(listy).arrayBuffer()));
});
await stranka.evaluate(() => { CTRL_STAV.karta = 'mapa'; render(); });
const [chooser] = await Promise.all([stranka.waitForEvent('filechooser'), stranka.evaluate(() => ctrlUiMapaImport())]);
await chooser.setFiles({ name: 'mapovani_test.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from(xlsxImport) });
await stranka.waitForFunction(() => CTRL_STAV.import && CTRL_STAV.import.soubor === 'mapovani_test.xlsx');
await stranka.evaluate(() => render());
const nahled = await stranka.evaluate(() => ({
  text: (document.getElementById('ctrlImport') || {}).textContent || '',
  zmen: CTRL_STAV.import.zmeny.length,
  pred: CTRL_STAV.data.mapa['C.cisteniKc'],
}));
zkus('náhled importu ukáže jednu změnu (C.cisteniKc) a tlačítko Převzít 1 změn', nahled.zmen === 1 && /C\.cisteniKc/.test(nahled.text) && /Převzít 1 změn/.test(nahled.text), nahled.text.slice(0, 160));
zkus('před převzetím se pracovní kopie nemění', nahled.pred === 'sl-stavebni', nahled.pred);
await stranka.click('#ctrlImportPrevezmi');
const prevzato = await stranka.evaluate(() => ({ g: CTRL_STAV.data.mapa['C.cisteniKc'],
  uloz: !!(document.getElementById('ctrlUloz') || {}).disabled, posty: window.__srv.posty.length }));
zkus('převzetí změní pracovní kopii a čeká na Uložit (server beze změny)', prevzato.g === 'sl-lakovani' && prevzato.uloz === false && prevzato.posty === 2,
  JSON.stringify(prevzato));
await stranka.evaluate(() => ctrlUiZahod());
const zahozeno = await stranka.evaluate(() => CTRL_STAV.data.mapa['C.cisteniKc']);
zkus('Zahodit změny vrátí uloženou verzi', zahozeno === 'sl-stavebni', zahozeno);

zkus('bez chyb v konzoli', chyby.length === 0, chyby.slice(0, 3).join(' | '));
await prohlizec.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
