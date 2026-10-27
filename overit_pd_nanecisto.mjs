/* Krycí list → „Co by se zapsalo do Pipedrive" nad sestavením
 * dist/kalkulacka.html (#536, 27. 10. 2026).
 *
 * Převod, kolize a práva serveru testuje netlify/test_pd_nanecisto.mjs.
 * Tady jde o kartu: je v krycím listu OCK i PROJ jen s právem
 * crm.pipedrive, bez přihlášení se na server neptá, tlačítko pošle
 * podklad z řídící varianty na /api/pd/nanecisto (a nikam jinam), tabulka
 * se stavy a kolizemi, escapování textů ze serveru, upozornění na změnu
 * zakázky po spuštění, CSV ke stažení podle konvence názvu a zahození
 * výsledku po přepnutí zakázky.
 *
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
  window.hlaska = () => Promise.resolve();
  window.potvrd = () => Promise.resolve(true);
  window.__srv = { dotazy: [] };
  window.__stazeno = [];
  window.souborKeStazeni = (jmeno, text) => { window.__stazeno.push({ jmeno, text }); };
  window.onlineApi = (cesta, telo) => {
    window.__srv.dotazy.push({ cesta, telo });
    if (cesta !== '/api/pd/nanecisto') return Promise.reject(new Error('harness: neznámá cesta ' + cesta));
    return Promise.resolve({ ok: true, rezim: 'simulator', nic: 'Do Pipedrive se nic neodeslalo.',
      deal: { id: 1002, nazev: 'CN-101 <b>Smyšlený</b>' },
      varovani: ['Odpovídá SIMULÁTOR Pipedrive se smyšlenými daty — nic z toho není skutečné CRM.'],
      souhrn: { celkem: 3, zapise: 2, nelze: 1, chybiPole: 0, neovereno: 0, prazdne: 0, kolize: 1 },
      radky: [
        { klic: 'splatnostDni', nazev: 'Splatnost faktur (dny)', typ: 'double', strana: 'ock', zdroj: 'OCK: Krycí list OCK › Podmínky › Splatnost',
          hodnotaKalkulace: '30', hodnota: 30, hodnotaText: '30', stav: 'zapise', duvod: '', vCrm: '14',
          kolize: ['v Pipedrive je dnes „14" — zápis ji přepíše'] },
        { klic: 'cisloNabidky', nazev: '<img src=x onerror="window.__xss=1">', typ: 'varchar', strana: 'ock', zdroj: 'OCK',
          hodnotaKalkulace: 'X', hodnota: 'X', hodnotaText: '<script>window.__xss=2</script>', stav: 'zapise', duvod: '', vCrm: '', kolize: [] },
        { klic: 'zadrzneProc', nazev: 'Zádržné – do odstranění VaN', typ: 'enum', strana: 'ock', zdroj: 'OCK',
          hodnotaKalkulace: 'Ano', hodnota: null, hodnotaText: '', stav: 'nelze', duvod: 'zádržné je „Ano", ale bez procenta', vCrm: '', kolize: [] },
      ] });
  };
});

const karta = () => stranka.evaluate(() => { const el = document.getElementById('pdnKarta_ock'); return el ? el.innerHTML : null; });

console.log('\nKarta bez přihlášení');
const bez = await stranka.evaluate(() => {
  ONLINE_STAV.ja = null; ZAK.cislo = '2026 - OPR - CN - 0901'; ZAK.nazevAkce = 'Zkušební akce';
  prepniTab('kryci'); renderKryci();
  const el = document.getElementById('pdnKarta_ock');
  return { je: !!el, text: el ? el.textContent : '', dotazy: window.__srv.dotazy.length };
});
zkus('karta je v krycím listu OCK', bez.je);
zkus('bez přihlášení jen poznámka, na server se neptá', /přihlaste se online/.test(bez.text) && bez.dotazy === 0, bez.text.slice(0, 120));

console.log('\nNáhled pro přihlášeného obchodníka');
await stranka.evaluate(() => {
  window.onlineMozne = () => true;
  ONLINE_STAV.ja = { email: 'obchodnik@priklad.cz', role: 'Obchodník', jmeno: 'O' };
  renderKryci();
});
zkus('tlačítko „Ukázat, co by se zapsalo" a věta „Nic se neodesílá"', /Ukázat, co by se zapsalo/.test(await karta()) && /Nic se neodesílá/.test(await karta()));
await stranka.click('#pdnSpust_ock');
await stranka.waitForTimeout(150);
const po = await stranka.evaluate(() => ({
  dotazy: window.__srv.dotazy.map(d => d.cesta),
  telo: window.__srv.dotazy[0] && window.__srv.dotazy[0].telo,
  radky: [...document.querySelectorAll('#pdnTabulka_ock tbody tr')].map(tr => [tr.dataset.pdnPole, tr.dataset.pdnStav]),
  kolize: document.querySelectorAll('[data-pdn-kolize]').length,
  info: (document.getElementById('pdnInfo_ock') || {}).textContent || '',
  sim: !!document.getElementById('pdnSimulator_ock'),
  xss: window.__xss || 0,
}));
zkus('jediný dotaz šel na /api/pd/nanecisto', JSON.stringify(po.dotazy) === '["/api/pd/nanecisto"]', JSON.stringify(po.dotazy));
zkus('podklad nese stranu OCK s číslem nabídky a popisky zdroje',
  po.telo && po.telo.strany.ock && po.telo.strany.ock.hodnoty.cisloCN === '2026 - OPR - CN - 0901'
  && !!po.telo.zdroje.ock.cisloCN && po.telo.dealId === null, JSON.stringify(po.telo && Object.keys(po.telo.strany)));
zkus('tabulka: tři řádky se stavy', JSON.stringify(po.radky) === JSON.stringify([['splatnostDni', 'zapise'], ['cisloNabidky', 'zapise'], ['zadrzneProc', 'nelze']]), JSON.stringify(po.radky));
zkus('kolize se ukáže u řádku', po.kolize === 1);
zkus('„Nic se neodeslalo", režim a deal v záhlaví', /Nic se neodeslalo/.test(po.info) && /SIMULÁTOR/.test(po.info) && /1002/.test(po.info), po.info);
zkus('červený pruh simulátoru', po.sim);
zkus('texty ze serveru se escapují (žádný skript)', po.xss === 0 && /&lt;img/.test(await karta()));

console.log('\nCSV ke stažení');
await stranka.click('#pdnStahni_ock');
const st = await stranka.evaluate(() => window.__stazeno[0] || null);
zkus('název PIPEDRIVE_<číslo>-NANECISTO_<verze>.csv (konvence #533)', st && /^PIPEDRIVE_\d{4}-OPR-CN-0901-NANECISTO(_[\d.]+)?\.csv$/.test(st.jmeno), st && st.jmeno);
zkus('CSV nese hlavičku, řádky a upozornění', st && /"Pole v Pipedrive";"Typ pole"/.test(st.text) && /Splatnost faktur/.test(st.text) && /SIMULÁTOR/.test(st.text));

console.log('\nZměna zakázky po spuštění a přepnutí zakázky');
const stare = await stranka.evaluate(() => {
  aktivniVarianta(ZAK).data.kryci = aktivniVarianta(ZAK).data.kryci || { hodnoty: {} };
  aktivniVarianta(ZAK).data.kryci.hodnoty.splatnostDni = '45';
  renderKryci();
  return !!document.getElementById('pdnStare_ock');
});
zkus('po úpravě krycího listu: „spusťte znovu"', stare);
const prepnuto = await stranka.evaluate(() => {
  ZAK = novaZakazka(); renderKryci();
  return { tabulka: !!document.getElementById('pdnTabulka_ock'), tlacitko: /Ukázat, co by se zapsalo/.test(document.getElementById('pdnKarta_ock').innerHTML) };
});
zkus('jiná zakázka: starý výsledek zmizí', !prepnuto.tabulka && prepnuto.tlacitko);

console.log('\nKrycí list PROJ a práva');
const proj = await stranka.evaluate(() => { prepniTab('kryciproj'); renderKryciProj(); return !!document.querySelector('#page-kryciproj #pdnKarta_proj'); });
zkus('karta je i v krycím listu PROJ', proj);
const bezPrava = await stranka.evaluate(() => {
  const puvodni = window.smiZobrazit;
  window.smiZobrazit = (k) => k === 'crm.pipedrive' ? false : puvodni(k);
  renderKryci(); const je = !!document.getElementById('pdnKarta_ock');
  window.smiZobrazit = puvodni; return je;
});
zkus('bez práva crm.pipedrive se karta nekreslí', bezPrava === false);

const dupl = await stranka.evaluate(() => { const ids = [...document.querySelectorAll('[id^="pdn"]')].map(e => e.id);
  renderKryci(); renderKryciProj();
  const vse = [...document.querySelectorAll('[id^="pdn"]')].map(e => e.id);
  return vse.filter((x, i) => vse.indexOf(x) !== i); });
zkus('žádné id karty není v dokumentu dvakrát (oba krycí listy najednou)', dupl.length === 0, dupl.join(', '));
console.log('\nKarta Prodej (C4 #540): náhled se stavem „won" za prodávanou variantu');
const prod = await stranka.evaluate(async () => {
  ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 0902'; ZAK.nazevAkce = 'Zkušební akce C4';
  const v = aktivniVarianta(ZAK);
  zamkniVariantu(v, { cislo: variantaCislo(ZAK, v), kdo: 'obchodnik@priklad.cz', typ: 'nabidka' });
  window.__srv.dotazy = [];
  prepniTab('kryci'); renderKryci();
  const tl = document.getElementById('prodNahled_ock');
  if (!tl) return { tl: false };
  await prodUiNahledSpust();
  renderKryci();
  const d = window.__srv.dotazy[0] || {};
  return { tl: true, cesty: window.__srv.dotazy.map(x => x.cesta), stav: d.telo && d.telo.stav,
    cislo: d.telo && d.telo.strany && d.telo.strany.ock && d.telo.strany.ock.hodnoty.cisloCN,
    tabulka: document.querySelectorAll('#pdnTabulka_prod_ock tbody tr').length,
    karta: (document.getElementById('prodejKarta_ock') || {}).textContent || '' };
});
zkus('karta Prodej má tlačítko náhledu (online, s právem)', prod.tl);
zkus('náhled jde jen na /api/pd/nanecisto se stavem won a číslem prodávané nabídky', JSON.stringify(prod.cesty) === '["/api/pd/nanecisto"]'
  && prod.stav === 'won' && prod.cislo === '2026 - OPR - CN - 0902', JSON.stringify(prod));
zkus('karta Prodej ukáže tabulku zápisu a „Nic se neodeslalo"', prod.tabulka === 3 && /Nic se neodeslalo/.test(prod.karta), String(prod.tabulka));

zkus('stránka bez chyb v konzoli', chyby.length === 0, chyby.join(' | '));
await prohlizec.close();
console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
