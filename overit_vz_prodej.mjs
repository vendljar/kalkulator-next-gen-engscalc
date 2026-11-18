/* Ověření v prohlížeči: VÍC ZÁKAZNÍKŮ — ŘÍDÍCÍ ZÁKAZNÍK A PRODÁNO U ZÁKAZNÍKA
 * (VZ-E4 #603).
 * ============================================================================
 *
 * Návrh § 2, § 4, § 7.4, prototyp (situace 3), zadání podklady/PROMPT_VZ_E4.md.
 * Jádro hlídá src/test_vz_prodej.js, server netlify/test_vz_server.mjs; tenhle
 * harness hlídá SESTAVENOU aplikaci (dist/kalkulacka.html) a skutečná tlačítka:
 *
 *   1) řídící zákazník (od T1 v hlavičce: „Řídící zákazník" u sdílené
 *      varianty, karta jen ★ / ☆): autor ho má aktivní, výběrem se vymění
 *      hlavička (B), písmena zůstávají, žlutý blok „organizace dealu se
 *      změní až prodejem"; jiný obchodník ho má zhasnutý s důvodem;
 *   2) Prodáno u zákazníka: zhasnuté, dokud mu nabídka neodešla; po tisku
 *      Wordu pro B aktivní; potvrzení na stránce před → po (řídící zákazník,
 *      řídící varianta, číslo v dealu, organizace dealu, věta o kontaktní
 *      osobě); neuložený prodej vrátí zakázku přesně do stavu před;
 *   3) uložený prodej: prodano.zakaznik = B, B řídící, hlavička B, výběr
 *      řídícího v hlavičce i Prodáno zhasnuté, háček vzPoProdeji zavolal zápis
 *      organizace vítěze (E5b) právě jednou;
 *   4) krycí list sdílené varianty: upozornění, že smluvní pole jsou společná;
 *      Prodáno z krycího listu u víc zákazníků otevře potvrzení v kartě;
 *   5) jeden zákazník: karta ani upozornění nejsou, Prodáno z krycího listu
 *      jde starou cestou (dialog).
 *
 * POJISTKA PROTI PRÁZDNÉMU TESTU: s UI před E4 (7c80706: radio a Prodáno
 * v kartě zhasnuté „zavede další etapa") běh skončí červeně — viz commit.
 *
 * Smyšlené údaje (kontakty …@priklad.cz), zkušební ceník.
 * Spuštění: KNG_NEZVYSOVAT_VERZI=1 python3 build.py && node overit_vz_prodej.mjs
 *   (bez globálního playwrightu: NODE_PATH=$(npm root -g) node overit_vz_prodej.mjs)
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';

const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright není k dispozici. Spuštění: NODE_PATH=$(npm root -g) node overit_vz_prodej.mjs'); process.exit(2); }
const DG = require(KOREN + 'src/docxgen.js');
const ZC = require(KOREN + 'src/zkusebni_cenik.js');
const START = Date.now();

let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail).slice(0, 700))); }
};

const ZAKLAD = '2026 - OPR - CN - 9970';
const udaje = (pref, ico) => ({
  objednatel: pref + ' Nazev s.r.o.', adresaObjednatele: pref + 'ova 11, 110 00 Praha 1', ico, dic: 'CZ' + ico,
  kontakt: pref + ' Kontakt, ' + pref.toLowerCase() + '.kontakt@priklad.cz',
});
const UA = udaje('Alfaprodej', '81726350');
const UB = udaje('Betaprodej', '72635487');

const sablonaB64 = Buffer.from(await (await DG.docxDokumentBlob('Nabídka', [
  { sekce: 'HLAVIČKA', radky: [['Objednatel', '{{OBJEDNATEL}}'], ['Číslo nabídky', '{{CISLO_NABIDKY}}'], ['Název akce', '{{NAZEV_AKCE}}']] },
  { sekce: 'CENA', radky: [['VÝTAHOVÁ ŠACHTA', '{{CENA_BEZ_DPH}} bez DPH']] },
])).arrayBuffer()).toString('base64');

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'cs-CZ' });
const p = await ctx.newPage();
const konzole = [];
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|\/api\//.test(m.text())) konzole.push('error: ' + m.text()); });
p.on('dialog', d => d.dismiss().catch(() => {}));
await p.goto(KDE);
await p.waitForFunction(() => typeof NAST !== 'undefined' && typeof render === 'function', null, { timeout: 15000 });
await p.waitForTimeout(400);

zkus('sestavení obsahuje jádro a obrazovku E4 a T1 (vzProdej, vzT1ZakZmen, vzPoProdeji)',
  await p.evaluate(() => typeof vzProdej === 'function' && typeof vzT1ZakZmen === 'function' && typeof vzPoProdeji === 'function'));

await p.evaluate(sab => {
  window.__dlg = [];
  window.potvrd = (t, o) => { window.__dlg.push({ druh: 'potvrd', text: String(t) }); return Promise.resolve(true); };
  window.hlaska = (t, o) => { window.__dlg.push({ druh: 'hlaska', text: String(t) }); return Promise.resolve(); };
  window.dotaz = () => Promise.resolve('');
  HTMLAnchorElement.prototype.click = function () {};
  window.print = () => {};
  /* Uložení a zápis organizace jsou serverové — tady zástupci se záznamem volání. */
  window.__ulozVysledek = { ok: true, duvod: '' };
  window.__ulozeni = 0; window.__org = 0;
  window.prodUiUloz = () => { window.__ulozeni++; return Promise.resolve(window.__ulozVysledek); };
  window.vzPoProdejiPd = (z) => { window.__org++; return Promise.resolve(null); };
  const bin = atob(sab); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  window.__sablona = u.buffer;
}, sablonaB64);

const priprav = (druh, ja) => p.evaluate(([c, cp, druh, uA, uB, zaklad, ja]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  ONLINE_STAV.ja = { email: ja || 'obchodnik.vz@priklad.cz', role: 'Obchodník', jmeno: 'Obchodnik VZ' };
  ONLINE_STAV.funkce = { viceZakazniku: true };
  VZ_UI.otevreny = ''; VZ_UI.form = null; VZ_UI.odstranit = null; VZ_UI.prodej = null;
  ZAK = novaZakazka(); syncVarianta();
  Object.assign(Z, { typSachty: 'exteriérová', profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová'])), zaskleni: 'na terče',
    sirka: 1.6, hloubka: 2.1, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 4 });
  OCK.fixes = true; Object.keys(C).forEach(k => delete C[k]); Object.assign(C, JSON.parse(JSON.stringify(c))); delete C.prazdny; delete C.ukazkove;
  ZAK.autor = 'obchodnik.vz@priklad.cz';
  ZAK.cislo = zaklad; ZAK.datum = objDnes();
  ZAK.nazevAkce = 'Bytovy dum Prodejni';
  ZAK.adresa = 'Prodejni 5, 120 00 Praha 2';
  ['objednatel', 'adresaObjednatele', 'ico', 'dic', 'kontakt'].forEach(k => { ZAK[k] = uA[k]; });
  const rid = aktivniVarianta(ZAK); rid.nazev = 'Varianta 1';
  const out = { ridici: rid.id };
  if (druh === 'dva') {
    const rB = vzPridej(ZAK, uB, { kdo: 'obchodnik.vz@priklad.cz' });
    if (!rB.ok) return { chyba: rB.chyba };
    out.B = rB.zakaznik.id;
  }
  ZAK.aktivni = rid.id; syncVarianta();
  window.__dlg.length = 0; window.__ulozeni = 0; window.__org = 0; window.__ulozVysledek = { ok: true, duvod: '' };
  prepniTab('kalk'); render();
  return out;
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj(), druh, UA, UB, ZAKLAD, ja]);

const tiskWord = () => p.evaluate(async () => {
  SABLONA_DOCX = { nazev: 'Sablona_NABIDKA_CN_test.docx', data: window.__sablona };
  let chyba = '';
  try { await nabidkaWordGeneruj(null); } catch (e) { chyba = String(e && e.message || e); }
  return chyba;
});
const radek = id => p.evaluate(id => {
  render();
  const tr = document.querySelector(`#vzKarta_ock tr[data-vz="${id}"]`);
  if (!tr) return null;
  const radio = tr.querySelector('[data-vz-ridici]');   // T1: ★ / ☆
  const rz = document.getElementById('vzT1Rz');
  const prod = tr.nextElementSibling ? [...tr.nextElementSibling.querySelectorAll('button')].find(x => x.textContent.trim() === 'Prodáno') : null;
  return { radio: radio ? { checked: radio.textContent === '★', disabled: !rz || rz.disabled, title: rz ? rz.title : '' } : null,
    prodano: prod ? { disabled: prod.disabled, title: prod.title } : null };
}, id);

/* ============ 1) přepínač Řídící ============ */
console.log('Přepínač řídícího zákazníka');
const c = await priprav('dva');
zkus('zakázka se dvěma zákazníky', !c.chyba && c.B === 'z2', c);
{
  const rB = await radek('z2');
  zkus('autor: výběr řídícího v hlavičce aktivní, u B ☆, karta bez přepínače', rB && rB.radio && !rB.radio.disabled && !rB.radio.checked
    && !(await p.evaluate(() => !!document.querySelector('#vzKarta_ock input[type="radio"]'))), rB);
  await p.selectOption('#vzT1Rz', 'z2');
  await p.waitForTimeout(100);
  const po = await p.evaluate(() => ({ r: ZAK.vzRidici.id, obj: ZAK.objednatel, pis: ZAK.vzRidici.pismeno, dalsi: ZAK.dalsiZakaznici.map(d => d.id + ':' + d.pismeno),
    blok: (document.querySelector('[data-vz-t1-org]') || {}).textContent || '' }));
  zkus('po výběru: řídící B, hlavička B, písmena beze změny (B si nese B, A bez písmene)',
    po.r === 'z2' && po.obj === UB.objednatel && po.pis === 'B' && po.dalsi.join() === 'z1:', po);
  zkus('hlavička řekne, že organizace dealu se bez prodeje nemění (T1 žlutý blok)', /organizace dealu se změní až prodejem/.test(po.blok), po.blok);
  await p.selectOption('#vzT1Rz', 'z1');
  await p.waitForTimeout(100);
  zkus('výměna zpět na A', await p.evaluate(() => ZAK.vzRidici.id === 'z1' && ZAK.objednatel.startsWith('Alfaprodej')));
}
await priprav('dva', 'jiny.obchodnik@priklad.cz');
{
  const rB = await radek('z2');
  zkus('jiný obchodník (není autor): výběr řídícího zhasnutý s důvodem', rB && rB.radio && rB.radio.disabled && /autor zakázky/.test(rB.radio.title), rB);
}

/* ============ 2) Prodáno u zákazníka ============ */
console.log('\nProdáno u zákazníka');
await priprav('dva');
{
  const r0 = await radek('z2');
  zkus('před tiskem: Prodáno u B zhasnuté (prodat jde jen odeslanou nabídku)', r0 && r0.prodano && r0.prodano.disabled, r0);
  await p.evaluate(() => vzOtevri('z2'));
  const ch = await tiskWord();
  const r1 = await radek('z2');
  const rA = await radek('z1');
  zkus('Word pro B vznikl; Prodáno u B aktivní, u A zhasnuté (A nabídka neodešla)', !ch && r1.prodano && !r1.prodano.disabled
    && rA.prodano && rA.prodano.disabled && /neodešla/.test(rA.prodano.title), { ch, r1, rA });
  await p.click('#vzKarta_ock tr[data-vz="z2"] + tr button:text-is("Prodáno")');
  const pot = await p.evaluate(() => { const e = document.getElementById('vzProdejPotvrzeni'); return e ? e.textContent.replace(/\s+/g, ' ') : ''; });
  zkus('potvrzení před → po: řídící zákazník Alfa → Beta', pot.includes('Řídící zákazník') && pot.includes(UA.objednatel + ' → ' + UB.objednatel), pot);
  zkus('potvrzení: číslo v dealu …-B, organizace dealu, kontaktní osobu doplní obchodník',
    pot.includes(ZAKLAD + '-B') && /Organizace dealu/.test(pot) && /kontaktní osobu doplní obchodník v Pipedrive/.test(pot), pot);
  /* neuložený prodej */
  const pred = await p.evaluate(() => JSON.stringify(ZAK));
  await p.evaluate(() => { window.__ulozVysledek = { ok: false, duvod: 'Neuloženo: zkušební odmítnutí serveru' }; window.__dlg.length = 0; });
  await p.click('#vzProdejAno');
  await p.waitForTimeout(150);
  const n = await p.evaluate(pr => ({ stejne: JSON.stringify(ZAK) === pr, h: window.__dlg.filter(d => d.druh === 'hlaska').map(d => d.text), org: window.__org }), pred);
  zkus('neuložený prodej: zakázka přesně jako před (bez prodeje, řídící A), hláška s důvodem, organizace se nezapisuje',
    n.stejne && n.h.some(t => /Prodej se neuložil: zkušební odmítnutí serveru/.test(t)) && n.org === 0, n);
  /* uložený prodej */
  await p.evaluate(() => { window.__ulozVysledek = { ok: true, duvod: '' }; });
  await p.click('#vzKarta_ock tr[data-vz="z2"] + tr button:text-is("Prodáno")');
  await p.click('#vzProdejAno');
  await p.waitForTimeout(150);
  const po = await p.evaluate(() => {
    const v = ZAK.varianty.find(x => x.prodano);
    return { zak: v && v.prodano.zakaznik, ridici: ZAK.vzRidici.id, obj: ZAK.objednatel, rv: v && v.ridici, ulozeni: window.__ulozeni, org: window.__org,
      srovnej: vzSrovnej(JSON.parse(JSON.stringify(ZAK))).length };
  });
  zkus('uložený prodej: prodano.zakaznik = B, B řídící, hlavička B, prodaná varianta řídící, invariant',
    po.zak === 'z2' && po.ridici === 'z2' && po.obj === UB.objednatel && po.rv === true && po.srovnej === 0, po);
  zkus('háček vzPoProdeji: zápis organizace vítěze (E5b) zavolán právě jednou po uložení', po.org === 1 && po.ulozeni >= 1, po);
  const rP = await radek('z1');
  const rB = await radek('z2');
  zkus('po prodeji: výběr řídícího zhasnutý (prodaná), Prodáno zhasnuté', rP.radio.disabled && /prodaná/.test(rP.radio.title)
    && rB.prodano.disabled && rP.prodano.disabled, { rP, rB });
}

/* ============ 4) krycí list ============ */
console.log('\nKrycí list a Prodáno z krycího listu');
await priprav('dva');
{
  const kl = await p.evaluate(() => { prepniTab('kryci'); render(); const e = document.querySelector('#page-kryci .vz-kl-sdilena'); return e ? e.textContent : ''; });
  zkus('krycí list sdílené varianty: upozornění „smluvní pole … společná"', /společná pro všechny její zákazníky/.test(kl), kl);
  await p.evaluate(() => vzOtevri('z2'));
  await tiskWord();
  await p.evaluate(async () => { prepniTab('kryci'); render(); VZ_UI.prodej = null; await prodejUiProdej('ock'); });
  const st = await p.evaluate(() => ({ prodej: VZ_UI.prodej, tab: TAB, pot: !!document.getElementById('vzProdejPotvrzeni') }));
  zkus('Prodáno z krycího listu u víc zákazníků otevře potvrzení v kartě (zákazník podle otevřeného: B)',
    st.prodej && st.prodej.id === 'z2' && st.tab === 'kalk' && st.pot, st);
}

/* ============ 5) jeden zákazník ============ */
console.log('\nJeden zákazník — beze změny');
await priprav('jeden');
{
  const s = await p.evaluate(() => ({ karta: !!document.getElementById('vzKarta_ock'), kl: (prepniTab('kryci'), render(), !!document.querySelector('.vz-kl-sdilena')) }));
  zkus('jeden zákazník: karta Zákazníci zakázky ani upozornění krycího listu nejsou', !s.karta && !s.kl, s);
  await tiskWord();
  const r = await p.evaluate(async () => { window.__dlg.length = 0; VZ_UI.prodej = null; await prodejUiProdej('ock');
    const v = ZAK.varianty[0]; return { prodej: VZ_UI.prodej, dlg: window.__dlg.map(d => d.druh), zak: v.prodano ? ('zakaznik' in v.prodano) : null, prodano: !!v.prodano }; });
  zkus('jeden zákazník: Prodáno z krycího listu starou cestou (dialog), prodej bez klíče zakaznik',
    r.prodej === null && r.dlg.includes('potvrd') && r.prodano && r.zak === false, r);
}

await b.close();
if (konzole.length) { console.log('\nKonzole:\n  ' + konzole.join('\n  ')); }
const sec = ((Date.now() - START) / 1000).toFixed(1);
console.log(`\n${fail ? '✕' : '✓'} overit_vz_prodej: ${ok} OK, ${fail} FAIL, ${sec} s`);
process.exit(fail || konzole.length ? 1 : 0);
