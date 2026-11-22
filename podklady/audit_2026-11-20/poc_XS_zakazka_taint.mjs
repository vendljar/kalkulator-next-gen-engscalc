/* PoC čočky XS (audit 20. 11. 2026): „obarvení" VŠECH textů uložené zakázky.
 *
 * Každý řetězec v JSON zakázky (hlavička, zákazníci, další zákazníci VZ,
 * varianty, poznámky, PROJ…) dostane příponu s neškodným payloadem, který při
 * spuštění jen zavolá window.__x(N). Zakázka se načte stejnou cestou jako ze
 * serveru (importZakazka), vykreslí se všechny záložky jako administrátor
 * i obchodník a otevřou se všechny tiskové náhledy (okna document.write).
 * Navíc se projdou atributy on* a hledá se payload, který se dostal do
 * JavaScriptu obsluhy mimo řetězec (spustil by se až kliknutím).
 *
 * Bez sítě. Spuštění z kořene repa:
 *   KNG_DIST=<cesta k dist/kalkulacka.html> node podklady/audit_2026-11-20/poc_XS_zakazka_taint.mjs
 * Výsledek: „ZRANITELNÉ" (a seznam cest v zakázce) / „ODOLNÉ".
 */
import { createRequire } from 'module';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import path from 'path';
const require = createRequire(path.resolve('package.json'));
const { chromium } = require('playwright');
const ZC = require(path.resolve('src/zkusebni_cenik.js'));
const DIST = path.resolve(process.env.KNG_DIST || 'dist/kalkulacka.html');
const html = readFileSync(DIST);
const CSP = (readFileSync(path.resolve('netlify.toml'), 'utf8').match(/Content-Security-Policy = "([^"]+)"/) || [])[1] || '';
const server = createServer((req, res) => {
  if (req.url.startsWith('/api/')) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end('{"ok":false}'); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': CSP }); res.end(html);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ADRESA = 'http://127.0.0.1:' + server.address().port;
const b = await chromium.launch({ args: ['--no-sandbox'] });
const TABY = ['kalk', 'detail', 'spec', 'specdata', 'kryci', 'proj', 'detailproj', 'kryciproj', 'cenik', 'cenikproj', 'zakazka', 'zakaznici', 'schvalovani'];
const OKNA = [['nabidkaOckDokument'], ['nabidkaNahled'], ['porovnaniTisk'], ['porovnaniPolozkyTisk'], ['kryciTiskPohled', 'bo'],
  ['kryciTiskPohled', 'tech'], ['detailTisk'], ['nabidkaProjNahled'], ['objednavkaProjNahled'], ['kryciProjTiskPohled', 'bo']];
/* Rozbor obsluhy on* běží v Node (CSP stránky nemá 'unsafe-eval', new Function tam nejde). */
const bezRetezcu = s => { let out = '', q = null; for (let i = 0; i < s.length; i++) { const ch = s[i];
  if (q) { if (ch === '\\') i++; else if (ch === q) q = null; continue; }
  if (ch === '"' || ch === "'" || ch === '`') { q = ch; continue; } out += ch; } return out; };
function rozbor(atributy, REG) {
  const js = new Set(), rozbite = new Set();
  for (const [kde, n, v] of atributy) {
    const m = bezRetezcu(v).match(/__x\((\d+)\)/g);
    if (m) m.forEach(x => { const c = +x.match(/\d+/)[0]; js.add((c >= 800000 ? 'odpověď ARES, pole č. ' + (c - 800000) : REG[c]) + ' → ' + kde + ':' + n); });
    else { try { new Function(v); } catch (e) { rozbite.add(kde + ' ' + n + '=' + v.slice(0, 150)); } }
  }
  return { js: [...js], rozbite: [...rozbite] };
}

async function beh(popis, { rezim, admin, jazyk, proj, brany }) {
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 }, locale: 'cs-CZ' });
  const p = await ctx.newPage();
  const chyby = [];
  p.on('pageerror', e => chyby.push('pageerror: ' + e.message.slice(0, 200)));
  p.on('dialog', d => d.dismiss().catch(() => {}));
  /* ARES (cizí strana → uživatel): odpověď veřejného rejstříku s obarvenými texty; skutečná síť se nevolá. */
  await p.route('https://ares.gov.cz/**', route => { const P = n => `');__x(${n});//'"></textarea></title></style></scr` + `ipt><img src=x onerror=__x(${n})>`;
    route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({
      ico: '81726350', obchodniJmeno: 'Firma' + P(800000), dic: 'CZ1' + P(800001), datumVzniku: '2001-01-01' + P(800002), datumZaniku: '2020-01-01' + P(800003),
      sidlo: { nazevObce: 'Obec' + P(800004), nazevUlice: 'Ulice' + P(800005), cisloDomovni: '1' + P(800006), psc: '11000' + P(800007), textovaAdresa: 'Adresa' + P(800008), nazevCastiObce: 'Cast' + P(800009), nazevStatu: 'Stat' + P(800010) } }) }); });
  await p.goto(ADRESA);
  await p.waitForFunction(() => typeof NAST !== 'undefined' && typeof render === 'function');
  await p.waitForTimeout(400);
  const r = await p.evaluate(async ([c, cp, rezim, admin, jazykTisku, TABY, OKNA, proj, brany]) => {
    const HITS = new Set(); window.__x = n => { HITS.add(n); };
    const okna = []; const open0 = window.open;
    window.open = function () { const w = open0.apply(window, arguments); if (w) { w.__x = window.__x; okna.push(w); } return w; };
    window.print = () => {}; window.tiskSNazvem = () => {};
    const hlasky = []; window.potvrd = () => Promise.resolve(true); window.hlaska = (t) => { hlasky.push(String(t).replace(/\);__x[\s\S]*?\)>/g, '…').slice(0, 110)); return Promise.resolve(); };
    if (typeof window.vyber === 'function') window.vyber = (t, v) => Promise.resolve(v && v[0] && (v[0].hodnota !== undefined ? v[0].hodnota : v[0]));
    Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
    Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
    ONLINE_STAV.ja = { email: 'obchodnik.xs@priklad.cz', role: admin ? 'Administrátor' : 'Obchodník', jmeno: 'XS' };
    ONLINE_STAV.funkce = { viceZakazniku: true, viceSachet: true };
    ZAK = novaZakazka(); syncVarianta();
    Object.assign(Z, { typSachty: 'exteriérová', profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová'])), zaskleni: 'na terče',
      sirka: 1.6, hloubka: 2.1, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 4 });
    Object.keys(C).forEach(k => delete C[k]); Object.assign(C, JSON.parse(JSON.stringify(c))); delete C.prazdny; delete C.ukazkove;
    ZAK.autor = 'obchodnik.xs@priklad.cz'; ZAK.cislo = '2026 - OPR - CN - 9940'; ZAK.datum = '2026-11-16';
    ZAK.nazevAkce = 'Akce'; ZAK.adresa = 'Adresa 5'; ZAK.objednatel = 'Objednatel s.r.o.'; ZAK.adresaObjednatele = 'Sidlo 1';
    ZAK.ico = '81726350'; ZAK.dic = 'CZ81726350'; ZAK.kontakt = 'Kontakt, kontakt@priklad.cz'; ZAK.popisZameru = 'Popis';
    const ud = X => ({ objednatel: X + ' s.r.o.', adresaObjednatele: X + ' 11', ico: X === 'B' ? '72635487' : '63548178', dic: 'CZ1', kontakt: X + ' Kontakt',
      zastupci: { smluvniJmeno: X + ' S', smluvniPozice: 'jednatel', smluvniTel: 't', smluvniEmail: 's@priklad.cz', obchodniJmeno: 'o', technickyJmeno: 't', banka: 'b', ucet: 'u', zapis: 'z' } });
    try { vzPridej(ZAK, ud('B'), { kdo: 'obchodnik.xs@priklad.cz' }); vzPridej(ZAK, ud('C'), { vlastni: true, nazevVarianty: 'Var C', kdo: 'obchodnik.xs@priklad.cz' }); } catch (e) { /* VZ není v sestavení (main) */ }
    try { poznamkyPridej(ZAK, 'Poznámka interní', { kdo: 'obchodnik.xs@priklad.cz' }); } catch (e) {}
    ZAK.prilohy = [{ id: 'p1', nazev: 'priloha.pdf', data: 'data:application/pdf;base64,AAAA', kdo: 'x', kdy: '2026-11-16T10:00:00Z' }];
    if (proj) { /* zakázka jen s projekcí (OVP), odeslaná CN PROJ — kvůli objednávce PROJ a lhůtám */
      ZAK.cislo = '2026 - OVP - CN - 0376'; const v = aktivniVarianta(ZAK);
      v.data.proj.cenik = JSON.parse(JSON.stringify(cp)); v.data.proj.zadani.sekce.forEach(x => x.polozky.forEach(q => { q.vyrazeno = false; }));
      ZAK.jenProj = true; syncVarianta();
      try { kryciProjZmrazPodminky(ZAK, v); kryciProjZmrazPlan(ZAK, v);
        zamkniVariantu(v, { kdy: new Date().toISOString(), typ: 'nabidkaProjTisk', vysledek: { proj: vypocetProj(v.data.proj.zadani, v.data.proj.cenik) } });
        v.data.kryciProj.hodnoty.cisloZakazky = 'Z2026-TEST-01'; } catch (e) { /* main: bez objednávky PROJ */ }
    }
    /* vazba z webhooku Pipedrive a vítěz organizace (texty z CRM / ARES uložené v zakázce) */
    ZAK.pdDealId = '123';
    ZAK.pdVazbaWebhook = { deal: '123', stav: 'ceka', kdy: '2026-11-16T10:00:00Z', cislo: 'CN 9940', doplneno: ['nazevAkce', 'objednatel'], ares: 'ok', aresRozdily: ['nazev', 'sidlo'], zanikla: true,
      nahlaseno: { kdo: 'kdosi@priklad.cz', kdy: '2026-11-16T10:00:00Z' }, strana: 'ock' };
    ZAK.pdOrgVitez = { stav: 'chyba', duvod: 'Důvod', kdy: '2026-11-16T10:00:00Z', vice: { organizace: [{ id: '1', nazev: 'Org A' }, { id: '2', nazev: 'Org B' }] } };
    syncVarianta();
    /* ---- obarvení ---- */
    const REG = []; const podleHodnoty = {};
    const ID_KLIC = /^(id|aktivni|varianta|ridiciId|kid|klic|zakaznik|komu|otevreny|sachta)$/i;
    const pay = n => `');__x(${n});//'"></textarea></title></style></scr` + `ipt><img src=x onerror=__x(${n})>`;
    const j = JSON.parse(JSON.stringify(typeof exportZakazka === 'function' ? exportZakazka(ZAK) : ZAK));
    (function jdi(o, cesta) {
      for (const k of Object.keys(o)) {
        const v = o[k], c2 = cesta + (Array.isArray(o) ? '[' + k + ']' : '.' + k);
        if (v && typeof v === 'object') { jdi(v, c2); continue; }
        if ((rezim === 'texty' || rezim === 'volne') && typeof v === 'string') {
          if (/^data:/.test(v)) continue;
          /* „volné“ texty: výčtové a strukturní hodnoty zůstanou, aby prošly kontroly a dokumenty se otevřely jako u běžné zakázky */
          if (rezim === 'volne' && (/^(key|typ|sazba|rezim|datum|kdy|cislo|ico|dic|jazyk|mena|stav|verze|deal|pdDealId|ares|strana)$/i.test(k) || /typ|profil|zaskl|oplast|kotv|povrch|barva/i.test(k) || /\.profily|\.zamek|\.cenik/.test(c2) || ID_KLIC.test(k))) continue;
          if (ID_KLIC.test(k)) { if (!(v in podleHodnoty)) { podleHodnoty[v] = REG.length; REG.push(c2 + ' (hodnota id)'); } o[k] = v + pay(podleHodnoty[v]); }
          else { REG.push(c2); o[k] = v + pay(REG.length - 1); }
        } else if (rezim === 'cisla' && typeof v === 'number' && k !== 'schema') { REG.push(c2); o[k] = String(v) + pay(REG.length - 1); }
      }
    })(j, 'ZAK');
    const chyby = [];
    if (brany) { /* zábrany dokumentů vypnuté: hledají se propady i v náhledech, které by kontrola dnes neotevřela */
      window.dokumentZabrana = () => ''; window.dokumentZabranaHlas = () => false; window.kontrolyStranaZabrana = () => ''; window.kontrolyZabranaDokumentu = () => ''; }
    NAST.jeAdmin = admin; NAST.nahledRole = admin ? '' : 'Obchodník';
    try { ZAK = importZakazka(j); syncVarianta(); } catch (e) { chyby.push('import: ' + e.message); }
    const atributy = [], url = [];
    const sken = (doc, kde) => { doc.querySelectorAll('*').forEach(el => { for (const a of el.attributes) {
      const n = a.name.toLowerCase(), v = a.value;
      if (/^on/.test(n) && v.indexOf('__x(') >= 0 && !/^__x\(\d+\)$/.test(v)) atributy.push([kde, n, v]);
      if (/^(href|src|action|formaction)$/.test(n) && /^\s*javascript:/i.test(v)) url.push(kde + ':' + v.slice(0, 80));
    } }); };
    const cekej = ms => new Promise(res => setTimeout(res, ms));
    /* pozitivní kontrola detekce: syrové vložení MUSÍ payload spustit */
    { const d = document.createElement('div'); d.innerHTML = '<span title="' + 'x' + pay(999999) + '">'; document.body.appendChild(d); await cekej(150); d.remove(); }
    const kontrola = HITS.has(999999); HITS.delete(999999);
    for (const t of TABY) {
      try { prepniTab(t); render(); } catch (e) { chyby.push(t + ': ' + e.message.slice(0, 160)); }
      await cekej(80); sken(document, 'tab-' + t);
    }
    /* otevřený další zákazník + přepínač */
    try { if (typeof VZ_UI !== 'undefined' && ZAK.dalsiZakaznici && ZAK.dalsiZakaznici[0]) { VZ_UI.otevreny = ZAK.dalsiZakaznici[0].id; syncVarianta();
      for (const t of ['kalk', 'zakazka', 'kryci', 'spec']) { prepniTab(t); render(); await cekej(60); sken(document, 'vz-' + t); } VZ_UI.otevreny = ''; } } catch (e) { chyby.push('vz: ' + e.message.slice(0, 160)); }
    try { if (typeof otevriNastaveni === 'function') { otevriNastaveni(); for (const pn of NAST_PANELY.map(x => x.id)) { try { nastPanel(pn); } catch (e) { chyby.push('nast ' + pn + ': ' + e.message.slice(0, 120)); } await cekej(40); sken(document, 'nast-' + pn); } } } catch (e) { chyby.push('nast: ' + e.message); }
    /* ARES: hledání z hlavičky (odpověď je obarvená), panel rozdílů, potvrzený přepis do hlavičky */
    try { document.getElementById('nastaveni-overlay').style.display = 'none'; } catch (e) {}
    if (typeof aresHledej === 'function') for (const kde of ['ock', 'proj']) {
      try { ZAK.ico = '81726350'; prepniTab(kde === 'ock' ? 'kalk' : 'proj'); render(); await Promise.race([aresHledej(kde), cekej(3000)]); render(); await cekej(200); sken(document, 'ARES panel ' + kde);
        if (kde === 'ock' && typeof aresPrepisPotvrd === 'function') { aresPrepisPotvrd('ock'); render(); await cekej(150); for (const t of ['kalk', 'zakazka', 'kryci', 'spec']) { prepniTab(t); render(); await cekej(60); sken(document, 'po přepisu z ARES / ' + t); } }
      } catch (e) { chyby.push('ares ' + kde + ': ' + String(e && e.message || e).slice(0, 120)); } }
    const aresStav = (typeof ARES !== 'undefined') ? (ARES.chyba || (ZAK.objednatel || '').slice(0, 12)) : 'bez ARES';
    if (jazykTisku && typeof TISK_JAZYK !== 'undefined') { try { tiskJazykSet(jazykTisku); } catch (e) {} }
    for (const k of OKNA) {
      const pred = okna.length; hlasky.length = 0;
      try { await Promise.race([window[k[0]].apply(null, k.slice(1)), cekej(4000)]); } catch (e) { chyby.push(k + ': ' + String(e && e.message || e).slice(0, 160)); }
      await cekej(250);
      if (okna.length === pred) chyby.push('okno ' + k.join(' ') + ' se neotevřelo: ' + (hlasky.join(' / ') || 'bez hlášky'));
      for (const w of okna.slice(pred)) { try { sken(w.document, 'okno ' + k.join(' ')); } catch (e) { chyby.push('sken okna ' + k + ': ' + e.message); } }
    }
    await cekej(400);
    okna.forEach(w => { try { w.close(); } catch (e) {} });
    return { kontrola, aresStav, hits: [...HITS].map(n => n >= 800000 ? 'odpověď ARES, pole č. ' + (n - 800000) : (REG[n] || ('?' + n))), atributy, url, REG, chyby, obarveno: REG.length, oken: okna.length };
  }, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj(), rezim, admin, jazyk || '', TABY, OKNA, !!proj, !!brany]);
  await ctx.close();
  const rb = rozbor(r.atributy, r.REG); r.js = rb.js.concat(r.url); r.rozbite = rb.rozbite.slice(0, 15);
  console.log(`\n== ${popis}: obarveno ${r.obarveno} hodnot, otevřeno oken ${r.oken}, pozitivní kontrola detekce: ${r.kontrola ? 'funguje' : 'NEFUNGUJE'}, ARES: ${r.aresStav}`);
  if (!r.kontrola) { console.log('Harness nedetekuje — výsledek je neplatný'); process.exit(2); }
  console.log('   spuštěno (HTML): ' + (r.hits.length ? '\n     ' + r.hits.join('\n     ') : 'nic'));
  console.log('   payload v kódu obsluhy on*: ' + (r.js.length ? '\n     ' + r.js.join('\n     ') : 'nic'));
  if (r.rozbite.length) console.log('   rozbitá obsluha (SyntaxError, k ruční kontrole):\n     ' + r.rozbite.join('\n     '));
  if (r.chyby.length || chyby.length) console.log('   chyby běhu (INFO): ' + [...r.chyby, ...chyby].slice(0, 14).join(' | '));
  return r.hits.length + r.js.length;
}
let n = 0;
n += await beh('OCK texty, administrátor', { rezim: 'texty', admin: true });
n += await beh('OCK texty, administrátor, zábrany vypnuté', { rezim: 'texty', admin: true, brany: true });
n += await beh('OCK texty, administrátor, zábrany vypnuté, tisk EN', { rezim: 'texty', admin: true, brany: true, jazyk: 'en' });
n += await beh('OCK texty, obchodník, zábrany vypnuté', { rezim: 'texty', admin: false, brany: true });
n += await beh('OCK čísla → text, administrátor, zábrany vypnuté', { rezim: 'cisla', admin: true, brany: true });
n += await beh('PROJ texty, administrátor', { rezim: 'texty', admin: true, proj: true });
n += await beh('PROJ texty, administrátor, zábrany vypnuté', { rezim: 'texty', admin: true, proj: true, brany: true });
n += await beh('PROJ texty, administrátor, zábrany vypnuté, tisk DE', { rezim: 'texty', admin: true, proj: true, brany: true, jazyk: 'de' });
n += await beh('OCK volné texty (bez výčtů), administrátor, zábrany ZAPNUTÉ', { rezim: 'volne', admin: true });
n += await beh('PROJ volné texty (bez výčtů), administrátor, zábrany ZAPNUTÉ', { rezim: 'volne', admin: true, proj: true });
n += await beh('PROJ volné texty, administrátor, zábrany ZAPNUTÉ, tisk EN', { rezim: 'volne', admin: true, proj: true, jazyk: 'en' });
n += await beh('PROJ volné texty, administrátor, zábrany vypnuté (objednávka PROJ)', { rezim: 'volne', admin: true, proj: true, brany: true });
n += await beh('PROJ volné texty, obchodník, zábrany vypnuté, tisk EN', { rezim: 'volne', admin: false, proj: true, brany: true, jazyk: 'en' });
n += await beh('PROJ čísla → text, administrátor, zábrany vypnuté', { rezim: 'cisla', admin: true, proj: true, brany: true });
await b.close(); server.close();
console.log('\nVÝSLEDEK: ' + (n ? 'ZRANITELNÉ (' + n + ' míst)' : 'ODOLNÉ — žádný payload z dat zakázky se nespustil'));
process.exit(n ? 1 : 0);
