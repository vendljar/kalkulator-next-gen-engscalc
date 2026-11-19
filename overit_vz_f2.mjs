/* Ověření v prohlížeči: VÍC ZÁKAZNÍKŮ — ÚNIK ZÁSTUPCŮ OTEVŘENÉHO ZÁKAZNÍKA
 * DO DOKUMENTŮ ŘÍDÍCÍHO (VZ-F2 #662, pojistka opravy VZ-F1 N3 #653).
 * ============================================================================
 *
 * N3 (VZ-F1) hlídala dosud jen statická kontrola řetězce (src/test_vz_f1.js).
 * Tenhle harness jde cestou obchodníka v sestavené aplikaci
 * (dist/kalkulacka.html, vypínač „Víc zákazníků" ZAP přes ONLINE_STAV.funkce):
 *
 *   zakázka A (řídící) + B (sdílí řídící variantu) + C (vlastní varianta);
 *   1) otevře C a zapíše mu do krycího listu OCK i PROJ zástupce s kanárkem
 *      (pole provázaná s hlavičkou — input na stránce, událost change) a do
 *      krycího listu PROJ zmocnitele plné moci (ruční pole zákazníka); totéž
 *      u B, který sdílí variantu A (ruční pole jdou do téže varianty);
 *   2) přepne na A a vytiskne plnou moc A (Word), krycí list PROJ A, krycí
 *      list OCK A (tisk BO + Word BO/Techdata), cenovou nabídku A (Word)
 *      a smlouvu o dílo A (Word): kanárek C ani B v nich nesmí být, vlastní údaj A
 *      (zástupce A) ano;
 *   3) vymění řídícího zákazníka na B v hlavičce (T1 — výběr „Řídící
 *      zákazník", potvrzovací dialog) a celé zopakuje s novým kanárkem C:
 *      plná moc B, krycí listy B, CN a SoD B — bez kanárků C; a SoD A (teď
 *      další zákazník) taky bez nich.
 *   Číslo zakázky se mezi kroky přepíná (předloha → OVP → OPR): strana, kterou
 *   číslo nevede, je uzamčená (P6) a její krycí list ani plná moc by nevznikly.
 *
 * POJISTKA PROTI PRÁZDNÉMU TESTU: na stavu před VZ-F1 (ec5bbac) harness
 * selže — zástupce zapsaný u otevřeného C jde do hlavičky řídícího a je
 * v SoD, krycím listu i plné moci A. Na a3fad44 (před VZ-F2) selže plná moc
 * a krycí list PROJ A: zmocnitel zapsaný u otevřeného B (sdílená varianta)
 * šel do ručních hodnot řídícího (#661).
 * Jiné sestavení: KNG_VZ_F2_DIST=/cesta/kalkulacka.html.
 *
 * Smyšlené údaje (kontakty …@priklad.cz), zkušební ceník.
 * Spuštění: NODE_PATH=$(npm root -g) node overit_vz_f2.mjs
 *   (po KNG_NEZVYSOVAT_VERZI=1 python3 build.py)
 */
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = process.env.KNG_VZ_F2_DIST ? pathToFileURL(process.env.KNG_VZ_F2_DIST).href : new URL('dist/kalkulacka.html', import.meta.url).href;
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright není k dispozici. Spuštění: NODE_PATH=$(npm root -g) node overit_vz_f2.mjs'); process.exit(2); }
const DG = require(KOREN + 'src/docxgen.js');
const ZC = require(KOREN + 'src/zkusebni_cenik.js');
const START = Date.now();

let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail).slice(0, 600))); }
};

/* ---------- údaje (smyšlené) ---------- */
const udaje = (pref, ico, zastupci) => ({
  objednatel: pref + ' Nazev s.r.o.', adresaObjednatele: pref + 'ova 11, 110 00 Praha 1', ico, dic: 'CZ' + ico,
  kontakt: pref + ' Kontakt', zastupci: zastupci === false ? {} : {
    smluvniJmeno: pref + ' Smluvni', smluvniPozice: pref + ' jednatel', smluvniTel: pref + '-tel-s', smluvniEmail: pref.toLowerCase() + '.smluvni@priklad.cz',
    technickyJmeno: pref + ' Technicky', banka: pref + ' Banka', ucet: pref + '-ucet', zapis: pref + ' zapis v OR' },
});
const UA = udaje('Alfakanar', '81726350'), UB = udaje('Betakanar', '72635487'), UC = udaje('Gamakanar', '63548178', false);
const PREDLOHA = '2026 - OPR - CN - ';
const OPR = '2026 - OPR - CN - 9950', OVP = '2026 - OVP - CN - 9950';

/* ---------- syntetické šablony (symboly, které dokumenty nesou) ---------- */
const sablona = async (nazev, symboly) => Buffer.from(await (await DG.docxDokumentBlob(nazev, [
  { sekce: 'SYMBOLY', radky: symboly.map(k => [k, '{{' + k + '}}']) }])).arrayBuffer()).toString('base64');
const SAB = {
  nabidka: await sablona('Nabídka', ['OBJEDNATEL', 'OBJEDNATEL_KONTAKT', 'CISLO_NABIDKY', 'NAZEV_AKCE', 'ADRESA', 'CENA_BEZ_DPH', 'CENA_S_DPH']),
  sod: await sablona('Smlouva o dílo', ['OBJEDNATEL', 'OBJEDNATEL_SIDLO', 'OBJEDNATEL_ICO', 'OBJEDNATEL_DIC', 'OBJEDNATEL_BANKA', 'OBJEDNATEL_UCET',
    'OBJEDNATEL_ZAPIS', 'OBJEDNATEL_ZASTUPCE_SMLUVNI', 'OBJEDNATEL_ZASTUPCE_OBCHODNI', 'OBJEDNATEL_ZASTUPCE_TECHNICKY', 'OBJEDNATEL_PODPIS_FIRMA',
    'OBJEDNATEL_PODPIS_JMENO', 'OBJEDNATEL_PODPIS_FUNKCE', 'CISLO_NABIDKY', 'NAZEV_AKCE', 'ADRESA']),
  plnaMoc: await sablona('Plná moc', ['PM_ZMOCNITEL', 'PM_ZMOCNITEL_NAROZEN', 'PM_ZMOCNITEL_BYTEM', 'PM_JEDNAJICI', 'ADRESA', 'NAZEV_AKCE', 'DATUM']),
};
const docxText = async b64 => {
  const pol = await DG.zipPrecti(new Uint8Array(Buffer.from(b64, 'base64')));
  return pol.filter(x => /\.(xml|rels)$/.test(x.nazev)).map(x => new TextDecoder().decode(x.data)).join('\n');
};
/* Kanárky v textu: syrový i bez značek (Word dělí text do běhů). */
const najdi = (text, kanarky) => {
  const t = (String(text || '') + '\n' + String(text || '').replace(/<[^>]+>/g, '')).toLowerCase();
  return kanarky.filter(k => t.includes(k.toLowerCase()));
};
const okoli = (text, k) => {
  const t = String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const i = t.toLowerCase().indexOf(k.toLowerCase());
  return i < 0 ? '' : '…' + t.slice(Math.max(0, i - 100), i + 60) + '…';
};

/* ---------- prohlížeč ---------- */
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'cs-CZ' });
const p = await ctx.newPage();
const konzole = [];
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
p.on('dialog', d => d.dismiss().catch(() => {}));
await p.goto(KDE);
await p.waitForFunction(() => typeof NAST !== 'undefined' && typeof render === 'function', null, { timeout: 15000 });
await p.waitForTimeout(400);
console.log('Sestavení: ' + KDE);

/* Zachytávání: dialogy, okna náhledu, stažené soubory (a.click s blob URL). */
await p.evaluate(sab => {
  window.__dlg = [];
  window.potvrd = (t, o) => { window.__dlg.push({ druh: 'potvrd', nadpis: (o && o.nadpis) || '', text: String(t) }); return Promise.resolve(true); };
  window.hlaska = (t, o) => { window.__dlg.push({ druh: 'hlaska', nadpis: (o && o.nadpis) || '', text: String(t) }); return Promise.resolve(); };
  window.confirm = () => true;
  window.__okna = [];
  const open = window.open;
  window.open = function () { const w = open.apply(window, arguments); if (w) window.__okna.push(w); return w; };
  window.__stazeni = [];
  const klik = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && /^blob:/.test(this.href)) {
      const nazev = this.download, href = this.href;
      window.__stazeni.push(fetch(href).then(r => r.arrayBuffer()).then(buf => {
        const u = new Uint8Array(buf); let s = '';
        for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
        return { nazev, b64: btoa(s) };
      }));
      return;
    }
    return klik.apply(this, arguments);
  };
  window.tiskSNazvem = () => {};
  window.print = () => {};
  const buf = b64 => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  window.__sab = { nabidka: buf(sab.nabidka), sod: buf(sab.sod), plnaMoc: buf(sab.plnaMoc) };
}, SAB);

/* Zakázka A + B (sdílí řídící variantu) + C (vlastní varianta), číslo = předloha. */
const pripravene = await p.evaluate(([c, cp, uA, uB, uC, predloha]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  ONLINE_STAV.ja = { email: 'obchodnik.f2@priklad.cz', role: 'Obchodník', jmeno: 'Obchodnik F2' };
  ONLINE_STAV.funkce = { viceZakazniku: true };
  if (typeof VZ_UI !== 'undefined' && VZ_UI) VZ_UI.otevreny = '';
  ZAK = novaZakazka(); syncVarianta();
  Object.assign(Z, { typSachty: 'exteriérová', profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová'])), zaskleni: 'na terče',
    sirka: 1.6, hloubka: 2.1, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 4 });
  OCK.fixes = true; Object.keys(C).forEach(k => delete C[k]); Object.assign(C, JSON.parse(JSON.stringify(c))); delete C.prazdny; delete C.ukazkove;
  ZAK.autor = 'obchodnik.f2@priklad.cz';
  ZAK.cislo = predloha; ZAK.datum = '2026-11-19';
  ZAK.nazevAkce = 'Bytovy dum Ukazkova'; ZAK.adresa = 'Ukazkova 5, 120 00 Praha 2';
  ['objednatel', 'adresaObjednatele', 'ico', 'dic', 'kontakt'].forEach(k => { ZAK[k] = uA[k]; });
  ZAK.zastupci = Object.assign({}, ZAK.zastupci || {}, uA.zastupci);
  if (ZAK.projHlavicka && typeof ZAK.projHlavicka === 'object') ZAK.projHlavicka.cislo = predloha;
  const rid = aktivniVarianta(ZAK); rid.nazev = 'Varianta 1';
  if (typeof vzPridej !== 'function') return { chyba: 'vzPridej chybí' };
  const rB = vzPridej(ZAK, uB, { kdo: 'obchodnik.f2@priklad.cz' });
  const rC = vzPridej(ZAK, uC, { vlastni: true, nazevVarianty: 'Varianta C', kdo: 'obchodnik.f2@priklad.cz' });
  if (!rB.ok || !rC.ok) return { chyba: JSON.stringify([rB, rC]) };
  ZAK.aktivni = rid.id; syncVarianta();
  prepniTab('kalk'); render();
  return { ridici: rid.id, B: rB.zakaznik.id, C: rC.zakaznik.id, varC: rC.zakaznik.varianta };
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj(), UA, UB, UC, PREDLOHA]);
zkus('příprava: zakázka A + B (sdílená) + C (vlastní varianta)', !pripravene.chyba, pripravene);

const cislo = c => p.evaluate(c => { ZAK.cislo = c; if (ZAK.projHlavicka && typeof ZAK.projHlavicka === 'object') ZAK.projHlavicka.cislo = c; render(); }, c);
const otevri = (id, varId) => p.evaluate(([id, varId]) => { VZ_UI.otevreny = id; if (varId) ZAK.aktivni = varId; syncVarianta(); render(); }, [id, varId || '']);
const ridiciVar = () => p.evaluate(() => String((ZAK.varianty.find(v => v.ridici) || ZAK.varianty[0]).id));

/* Zápis do pole krycího listu tak, jak ho dělá obchodník: input na stránce,
 * hodnota a událost change (onchange → set / klpSet). Vrací cestu zápisu. */
const zapisKl = async (tab, stranka, kus, hodnota) => {
  await p.evaluate(t => { prepniTab(t); render(); }, tab);
  const sel = `#${stranka} input[onchange*="${kus}"]`;
  const n = await p.locator(sel).count();
  if (n < 1) return { chyba: 'pole ' + kus + ' na stránce ' + stranka + ' není' };
  const onch = await p.locator(sel).first().getAttribute('onchange');
  await p.locator(sel).first().evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, hodnota);
  await p.waitForTimeout(80);
  return { onchange: onch };
};

/* Spustí výstup v prohlížeči; vrací text oken / stažených Wordů a hlášky. */
const spust = async (kod, stazeni) => {
  const r = await p.evaluate(async kod => {
    window.__dlg.length = 0; window.__okna.length = 0; window.__stazeni.length = 0;
    ['nabidkaStav', 'sodStav_sod', 'sodStav_plnaMoc', 'sodStav_sodProj'].forEach(c => {
      if (!document.querySelector('.' + c)) { const e = document.createElement('div'); e.className = c; e.hidden = true; document.body.appendChild(e); } });
    ['kryciStav', 'kryciProjStav'].forEach(id => { if (!document.getElementById(id)) { const e = document.createElement('div'); e.id = id; e.hidden = true; document.body.appendChild(e); } });
    let chyba = '';
    try { await (0, eval)(kod); } catch (e) { chyba = String(e && e.message || e); }
    return { chyba };
  }, kod);
  if (stazeni) { const konec = Date.now() + 6000;
    while (Date.now() < konec && await p.evaluate(n => window.__stazeni.length < n, stazeni)) await p.waitForTimeout(100); }
  await p.waitForTimeout(200);
  const v = await p.evaluate(async () => {
    const okna = window.__okna.map(w => { let h = ''; try { h = w.document.documentElement.outerHTML; } catch (e) { h = ''; } try { w.close(); } catch (e) {} return h; });
    const st = await Promise.all(window.__stazeni);
    return { okna, stazeni: st, dlg: window.__dlg.slice() };
  });
  const texty = v.okna.slice();
  for (const s of v.stazeni) texty.push(s.nazev + '\n' + await docxText(s.b64));
  return Object.assign(r, { texty, nazvy: v.stazeni.map(s => s.nazev), hlasky: v.dlg.filter(d => d.druh === 'hlaska').map(d => d.text) });
};

const VYSTUPY = {
  plnaMoc: { nazev: 'plná moc (Word)', kod: "SOD_DOCX.plnaMoc = { nazev: 'Sablona_PLNA_MOC_test.docx', data: window.__sab.plnaMoc }; sodWordGeneruj('plnaMoc', null)", stazeni: 1 },
  klProj: { nazev: 'krycí list PROJ BO (tisk)', kod: "kryciProjTiskPohled('bo')" },
  klOck: { nazev: 'krycí list OCK BO (tisk)', kod: "kryciTiskPohled('bo')" },
  klWord: { nazev: 'krycí list OCK Word (BO + Techdata)', kod: 'kryciWord()', stazeni: 2 },
  cn: { nazev: 'cenová nabídka (Word)', kod: "SABLONA_DOCX = { nazev: 'Sablona_NABIDKA_CN_test.docx', data: window.__sab.nabidka }; nabidkaWordGeneruj(null)", stazeni: 1 },
  sod: { nazev: 'smlouva o dílo OCK (Word)', kod: "SOD_DOCX.sod = { nazev: 'Sablona_SOD_test.docx', data: window.__sab.sod }; sodWordGeneruj('sod', null)", stazeni: 1 },
};
/* Výstup X pro zákazníka `kdo`: vznikl, bez cizích kanárků, s vlastním údajem. */
const over = async (kdo, klic, cizi, vlastni) => {
  const d = VYSTUPY[klic];
  const r = await spust(d.kod, d.stazeni);
  const pocet = d.stazeni || 1;
  zkus(`${kdo} · ${d.nazev}: dokument vznikl`, r.texty.length === pocet && !r.chyba, { chyba: r.chyba, hlasky: r.hlasky, kusu: r.texty.length });
  if (!r.texty.length) return r;
  const vse = r.texty.join('\n');
  const nalez = najdi(vse, cizi);
  zkus(`${kdo} · ${d.nazev}: žádný údaj jiného zákazníka (kanárek)`, nalez.length === 0, nalez.map(k => k + ': ' + okoli(vse, k)));
  if (vlastni) zkus(`${kdo} · ${d.nazev}: vlastní údaj (${vlastni}) v dokumentu`, najdi(vse, [vlastni]).length === 1);
  return r;
};

/* ================= 1) A řídící: zápis u otevřeného C, tisk pro A ================= */
console.log('\n1) A řídící — zástupce zapsaný u otevřeného C, dokumenty A');
const K1 = { kl: 'ZastKanarCjedna', klp: 'ZastKanarCdva', pm: 'ZmocKanarCtri' };
await otevri(pripravene.C, pripravene.varC);
{
  const a = await zapisKl('kryci', 'page-kryci', 'zastupci.smluvniJmeno', K1.kl + ' Smluvni');
  const b2 = await zapisKl('kryci', 'page-kryci', 'zastupci.banka', K1.kl + ' Banka');
  const c = await zapisKl('kryciproj', 'page-kryciproj', 'zastupci.technickyJmeno', K1.klp + ' Technicky');
  const d = await zapisKl('kryciproj', 'page-kryciproj', "klpSet('pmZmocnitel'", K1.pm + ' Zmocnitel');
  zkus('C: pole zástupců v krycím listu OCK i PROJ a zmocnitel na stránce jsou', ![a, b2, c, d].some(x => x.chyba), [a, b2, c, d]);
  const st = await p.evaluate(k => {
    const C = (ZAK.dalsiZakaznici || []).find(x => x.id === VZ_UI.otevreny) || {};
    return { vC: JSON.stringify(C.zastupci || {}), hlavicka: JSON.stringify(ZAK.zastupci || {}) };
  }, K1);
  zkus('C: zástupci z krycích listů jsou v položce C', st.vC.includes(K1.kl) && st.vC.includes(K1.klp), st.vC);
  zkus('C: hlavička řídícího A kanárek C nenese', !st.hlavicka.includes(K1.kl) && !st.hlavicka.includes(K1.klp), st.hlavicka);
}
/* B sdílí řídící variantu: zmocnitel a zástupce zapsaný u otevřeného B jde do
 * téže varianty jako údaje A — do VZ-F2 (#661) se zmocnitel psal za řídícího. */
const KB = { kl: 'ZastKanarBjedna', pm: 'ZmocKanarBjedna' };
await otevri(pripravene.B, await ridiciVar());
{
  const a = await zapisKl('kryci', 'page-kryci', 'zastupci.technickyJmeno', KB.kl + ' Technicky');
  const d = await zapisKl('kryciproj', 'page-kryciproj', "klpSet('pmZmocnitel'", KB.pm + ' Zmocnitel');
  zkus('B (sdílená varianta): zástupce v krycím listu OCK a zmocnitel v krycím listu PROJ na stránce jsou', !a.chyba && !d.chyba, [a, d]);
}
const CIZI1 = [K1.kl, K1.klp, K1.pm, 'Gamakanar', KB.kl, KB.pm];
await otevri('', await ridiciVar());
await cislo(OVP);
await over('A', 'plnaMoc', CIZI1, 'Alfakanar Smluvni');
await over('A', 'klProj', CIZI1, 'Alfakanar');
await cislo(OPR);
await over('A', 'klOck', CIZI1, 'Alfakanar Smluvni');
await over('A', 'klWord', CIZI1, 'Alfakanar Smluvni');
await over('A', 'cn', CIZI1, 'Alfakanar Nazev');
await over('A', 'sod', CIZI1, 'Alfakanar Smluvni');

/* ================= 2) výměna řídícího na B (T1, potvrzovací dialog) ================= */
console.log('\n2) Výměna řídícího zákazníka na B (T1) — zápis u otevřeného C, dokumenty B');
{
  await p.evaluate(() => { window.__dlg.length = 0; prepniTab('kalk'); render(); });
  const vyber = await p.locator('#vzT1Rz:visible').count();
  if (vyber) await p.locator('#vzT1Rz:visible').first().selectOption(pripravene.B);
  await p.waitForTimeout(250);
  const s = await p.evaluate(() => ({ ridici: typeof vzRidiciId === 'function' ? vzRidiciId(ZAK) : '', objednatel: ZAK.objednatel,
    potvrd: window.__dlg.filter(d => d.druh === 'potvrd').map(d => d.text) }));
  zkus('T1: výběr „Řídící zákazník" v hlavičce → potvrzovací dialog a B je řídící (hlavička nese B)',
    vyber >= 1 && s.ridici === pripravene.B && s.objednatel === UB.objednatel && s.potvrd.length === 1 && /Řídícím zákazníkem bude/.test(s.potvrd[0]), s);
}
const K2 = { kl: 'ZastKanarCctyri', klp: 'ZastKanarCpet', pm: 'ZmocKanarCsest' };
await cislo(PREDLOHA);
await otevri(pripravene.C, pripravene.varC);
{
  const a = await zapisKl('kryci', 'page-kryci', 'zastupci.smluvniJmeno', K2.kl + ' Smluvni');
  const c = await zapisKl('kryciproj', 'page-kryciproj', 'zastupci.technickyJmeno', K2.klp + ' Technicky');
  const d = await zapisKl('kryciproj', 'page-kryciproj', "klpSet('pmZmocnitel'", K2.pm + ' Zmocnitel');
  zkus('C (po výměně): pole krycích listů na stránce jsou', ![a, c, d].some(x => x.chyba), [a, c, d]);
  const hl = await p.evaluate(() => JSON.stringify(ZAK.zastupci || {}));
  zkus('C (po výměně): hlavička řídícího B kanárek C nenese', !hl.includes(K2.kl) && !hl.includes(K2.klp), hl);
}
const CIZI2 = [K1.kl, K1.klp, K1.pm, 'Gamakanar', K2.kl, K2.klp, K2.pm];   // údaje B jsou teď vlastní (B řídící)
await otevri('', await ridiciVar());
await cislo(OVP);
await over('B', 'plnaMoc', CIZI2, KB.pm);   // vlastní ruční zmocnitel B (zapsaný u B) má přednost
await over('B', 'klProj', CIZI2, 'Betakanar');
await cislo(OPR);
await over('B', 'klOck', CIZI2, 'Betakanar Smluvni');
await over('B', 'klWord', CIZI2, 'Betakanar Smluvni');
await over('B', 'cn', CIZI2, 'Betakanar Nazev');
await over('B', 'sod', CIZI2, 'Betakanar Smluvni');

/* ================= 3) SoD A (teď další zákazník, sdílená varianta) ================= */
console.log('\n3) A jako další zákazník — dotisk nabídky a smlouvy o dílo A');
await otevri('z1', await ridiciVar());
await over('A', 'cn', CIZI2.concat([KB.kl, KB.pm]), 'Alfakanar Nazev');
await over('A', 'sod', CIZI2.concat([KB.kl, KB.pm]), 'Alfakanar Smluvni');

zkus('bez chyb stránky', konzole.length === 0, konzole.slice(0, 5));
await b.close();
console.log(`\n${ok} OK, ${fail} FAIL (${Math.round((Date.now() - START) / 1000)} s)`);
process.exit(fail ? 1 : 0);
