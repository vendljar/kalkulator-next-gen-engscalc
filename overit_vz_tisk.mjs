/* Ověření v prohlížeči: VÍC ZÁKAZNÍKŮ — TISK Z POHLEDU ZÁKAZNÍKA (VZ-E2 #601).
 * ============================================================================
 *
 * Návrh § 3, § 4, § 9 (R1, R2, R5), podklady/PROMPT_VZ_E2.md body 2, 3, 5.
 * Jádro hlídá src/test_vz_unik.js (generátory nad pohledem); tenhle harness
 * hlídá OBRAZOVKU: že každé tlačítko tisku v sestavené aplikaci opravdu
 * předá generátoru pohled otevřeného zákazníka (vzTiskVstup), ne celou ZAK.
 *
 * Zakázka se třemi zákazníky (sestavení dist/kalkulacka.html, vypínač
 * „Víc zákazníků" ZAP přes ONLINE_STAV.funkce):
 *   A  řídící (hlavička zakázky),
 *   B  sdílí řídící variantu (vzPridej),
 *   C  vlastní variantu (vzPridej, vlastni: true).
 * Každý zákazník má jedinečného kanárka v názvu, sídle, IČO, DIČ, kontaktu
 * a ve všech zástupcích (C i v názvu vlastní varianty). Otevřený zákazník
 * (VZ_UI.otevreny — obrazovka přepínače je etapa E1, tady se jen nastaví)
 * '' / 'z2' / 'z3', u C se otevře i jeho varianta. Pro každého:
 *   1) Kompletní náhled a tisk nabídky (nabidkaOckDokument), Kompletní náhled
 *      podkladů (nabidkaNahled), porovnání variant (porovnaniTisk), detail
 *      položek (porovnaniPolozkyTisk), krycí list BO (kryciTiskPohled) —
 *      HTML okna náhledu; Word nabídky (nabidkaWordGeneruj, syntetická
 *      šablona se symboly hlavičky) a Word krycího listu (kryciWord, obě
 *      verze) — stažený .docx se rozbalí a prohledá se XML; technická
 *      specifikace (stránka page-spec) a jméno souboru jejího tisku;
 *   2) v žádném výstupu není kanárek jiného zákazníka, vlastní tam je;
 *   3) číslo nabídky nese písmeno zákazníka (…9940-B, …9940.2-C), řídící
 *      žádné; titulek okna / jméno souboru totéž;
 *   4) přepnutí zákazníka výstup změní;
 *   5) pruh „Náhled a tisk platí pro zákazníka X — nabídka …" v kartě
 *      Cenová nabídka (CN) jen u 2+ zákazníků;
 *   6) zábrany: varianta C otevřená při zákazníkovi B; název akce s názvem C
 *      (A i B zastaveno, C projde); PROJ pro B zastaveno (R5), pro A projde;
 *      funkce vypnutá → B zastaveno, A projde;
 *   7) jeden zákazník: náhled CN i krycí list bajt po bajtu jako cesta bez
 *      pohledu (ZAK), žádný pruh, číslo bez písmene; náhled řídícího u tří
 *      zákazníků = náhled téže zakázky s jedním zákazníkem.
 *
 * POJISTKA PROTI PRÁZDNÉMU TESTU: oddíl 8 přepíše v prohlížeči vzTiskVstup
 * na cestu bez pohledu ({ zak: ZAK, varianta }) a ověří, že detektor únik
 * najde (cizí kanárek / chybějící vlastní kanárek / chyba generátoru).
 * Celý běh s KNG_VZ_BEZ_POHLEDU=1 udělá totéž pro všechny výstupy — musí
 * skončit červeně (ručně ověřeno při psaní harnessu, viz commit).
 *
 * Smyšlené údaje (kontakty …@priklad.cz), zkušební ceník.
 * Spuštění: NODE_PATH=$(npm root -g) node overit_vz_tisk.mjs
 *   (po KNG_NEZVYSOVAT_VERZI=1 python3 build.py)
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';

const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright není k dispozici. Spuštění: NODE_PATH=$(npm root -g) node overit_vz_tisk.mjs'); process.exit(2); }
const DG = require(KOREN + 'src/docxgen.js');
const ZC = require(KOREN + 'src/zkusebni_cenik.js');
const BEZ_POHLEDU = process.env.KNG_VZ_BEZ_POHLEDU === '1';
const START = Date.now();

let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail).slice(0, 600))); }
};
const info = t => console.log('  INFO ' + t);

/* ---------- kanárci ---------- */
const KAN = {
  A: { pref: 'Alfakanar', ico: '81726350' },
  B: { pref: 'Betakanar', ico: '72635487' },
  C: { pref: 'Gamakanar', ico: '63548178' },
};
const udaje = X => {
  const k = KAN[X], p = k.pref, m = p.toLowerCase();
  return {
    objednatel: p + ' Nazev s.r.o.',
    adresaObjednatele: p + 'ova 11, 110 00 Praha 1',
    ico: k.ico,
    dic: 'CZ' + k.ico,
    kontakt: p + ' Kontakt, ' + m + '.kontakt@priklad.cz',
    zastupci: {
      smluvniJmeno: p + ' Smluvni', smluvniPozice: p + ' jednatel', smluvniTel: p + '-tel-s', smluvniEmail: m + '.smluvni@priklad.cz',
      obchodniJmeno: p + ' Obchodni', obchodniTel: p + '-tel-o', obchodniEmail: m + '.obchodni@priklad.cz',
      technickyJmeno: p + ' Technicky', technickyTel: p + '-tel-t', technickyEmail: m + '.technicky@priklad.cz',
      fakturyEmail: m + '.faktury@priklad.cz', fakturyTel: p + '-tel-f', banka: p + ' Banka', ucet: p + '-ucet', zapis: p + ' zapis v OR',
    },
  };
};
/* Řada OPR (nabídka OCK); PROJ zábrany jdou nad řadou OVP (OCK tam je
 * uzamčená a vynulovaná, nabídka PROJ ne). IČO smyšlená s platnou
 * kontrolní číslicí (jinak kontrola hlavičky cituje IČO na obrazovce). */
const ZAKLAD = '2026 - OPR - CN - 9940';
const ZAKLAD_PROJ = '2026 - OVP - CN - 9940';

/* Kanárci v textu: { cizi: [klíče], vlastni: bool }. Text se prohledá
 * syrový i bez značek (Word dělí text do běhů) a IČO i bez mezer. */
const kanarky = (text, X) => {
  const syrovy = String(text || '');
  const bezZnacek = syrovy.replace(/<[^>]+>/g, '');
  const t = (syrovy + '\n' + bezZnacek).toLowerCase();
  const cisla = t.replace(/[\s ]+/g, '');
  const najdi = Y => t.includes(KAN[Y].pref.toLowerCase()) || cisla.includes(KAN[Y].ico);
  return { cizi: Object.keys(KAN).filter(Y => Y !== X && najdi(Y)), vlastni: najdi(X) };
};
/* Kde přesně cizí kanárek stojí (pro hlášení). */
const kontext = (text, X) => {
  /* bez značek (u Wordu je pak vidět popisek řádku), syrový text jako záloha */
  const t = String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') + ' ### ' + String(text || '');
  for (const Y of Object.keys(KAN)) {
    if (Y === X) continue;
    const i = t.toLowerCase().indexOf(KAN[Y].pref.toLowerCase());
    if (i >= 0) return Y + ': …' + t.slice(Math.max(0, i - 120), i + 80).replace(/\s+/g, ' ') + '…';
    const j = t.indexOf(KAN[Y].ico);
    if (j >= 0) return Y + ' (IČO): …' + t.slice(Math.max(0, j - 120), j + 40).replace(/\s+/g, ' ') + '…';
  }
  return '';
};

/* ---------- syntetická šablona nabídky (symboly hlavičky) ---------- */
const sablonaB64 = Buffer.from(await (await DG.docxDokumentBlob('Nabídka', [
  { sekce: 'HLAVIČKA', radky: [['Objednatel', '{{OBJEDNATEL}}'], ['Kontaktní osoba', '{{OBJEDNATEL_KONTAKT}}'],
    ['Číslo nabídky', '{{CISLO_NABIDKY}}'], ['Název akce', '{{NAZEV_AKCE}}'], ['Adresa stavby', '{{ADRESA}}']] },
  { sekce: 'CENA', radky: [['VÝTAHOVÁ ŠACHTA', '{{CENA_BEZ_DPH}} bez DPH'], ['CELKEM za nabídku', '{{CENA_S_DPH}} včetně DPH']] },
])).arrayBuffer()).toString('base64');
/* syntetická šablona smlouvy o dílo OCK (symboly objednatele a čísel) */
const SOD_SYMBOLY = ['OBJEDNATEL', 'OBJEDNATEL_SIDLO', 'OBJEDNATEL_ICO', 'OBJEDNATEL_DIC', 'OBJEDNATEL_KONTAKT_OSOBA', 'OBJEDNATEL_TELEFON',
  'OBJEDNATEL_EMAIL', 'OBJEDNATEL_EMAIL_FAKTURY', 'OBJEDNATEL_BANKA', 'OBJEDNATEL_UCET', 'OBJEDNATEL_ZAPIS', 'OBJEDNATEL_ZASTUPCE_SMLUVNI',
  'OBJEDNATEL_ZASTUPCE_OBCHODNI', 'OBJEDNATEL_ZASTUPCE_OBCHODNI_KONTAKT', 'OBJEDNATEL_ZASTUPCE_TECHNICKY', 'OBJEDNATEL_ZASTUPCE_TECHNICKY_KONTAKT',
  'OBJEDNATEL_PODPIS_FIRMA', 'OBJEDNATEL_PODPIS_JMENO', 'OBJEDNATEL_PODPIS_FUNKCE', 'CISLO_NABIDKY', 'SOD_CISLO_SMLOUVY', 'NAZEV_AKCE', 'ADRESA'];
const sablonaSodB64 = Buffer.from(await (await DG.docxDokumentBlob('Smlouva o dílo', [
  { sekce: 'SMLUVNÍ STRANY', radky: SOD_SYMBOLY.map(k => [k, '{{' + k + '}}']) }])).arrayBuffer()).toString('base64');
const docxText = async b64 => {
  const pol = await DG.zipPrecti(new Uint8Array(Buffer.from(b64, 'base64')));
  return pol.filter(x => /\.(xml|rels)$/.test(x.nazev)).map(x => new TextDecoder().decode(x.data)).join('\n');
};

/* ---------- prohlížeč ---------- */
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

zkus('sestavení obsahuje vrstvu tisku VZ-E2 (vzTiskVstup, vzTiskPohled)',
  await p.evaluate(() => typeof vzTiskVstup === 'function' && typeof vzTiskPohled === 'function' && typeof vzTiskPruhHtml === 'function'));

/* Zachytávání: dialogy, okna náhledu (window.open), stažené soubory (a.click
 * s blob URL) a jméno souboru tisku specifikace (tiskSNazvem). Okna se čtou
 * z openeru (about:blank má původ stránky). */
await p.evaluate(([sab, bezPohledu, sabSod]) => {
  window.__dlg = [];
  window.potvrd = (t, o) => { window.__dlg.push({ druh: 'potvrd', nadpis: (o && o.nadpis) || '', text: String(t) }); return Promise.resolve(true); };
  window.hlaska = (t, o) => { window.__dlg.push({ druh: 'hlaska', nadpis: (o && o.nadpis) || '', text: String(t) }); return Promise.resolve(); };
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
  window.__tiskNazvy = [];
  window.tiskSNazvem = n => { window.__tiskNazvy.push(String(n)); };
  window.print = () => {};
  const bin = atob(sab); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  window.__sablona = u.buffer;
  /* Pojistka (KNG_VZ_BEZ_POHLEDU=1): cesta bez pohledu — tisk z celé zakázky. */
  window.__vzTiskVstupPuvodni = vzTiskVstup;
  if (bezPohledu) window.vzTiskVstup = (typ, varianta) => ({ zak: ZAK, varianta });
  const binS = atob(sabSod); const uS = new Uint8Array(binS.length); for (let i = 0; i < binS.length; i++) uS[i] = binS.charCodeAt(i);
  window.__sablonaSod = uS.buffer;
}, [sablonaB64, BEZ_POHLEDU, sablonaSodB64]);

/* Zakázka: 'tri' (A řídící + B sdílená + C vlastní varianta) nebo 'jeden'. */
const priprav = (druh, volby) => p.evaluate(([c, cp, druh, uA, uB, uC, zaklad, o]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  ONLINE_STAV.ja = { email: 'obchodnik.vz@priklad.cz', role: 'Obchodník', jmeno: 'Obchodnik VZ' };
  ONLINE_STAV.funkce = { viceZakazniku: o.vypnuto ? false : true };
  if (typeof VZ_UI !== 'undefined' && VZ_UI) VZ_UI.otevreny = ''; else window.VZ_UI = { otevreny: '' };
  ZAK = novaZakazka(); syncVarianta();
  /* platné zadání OCK a zkušební ceník varianty (jinak kontrola před nabídkou dokument zastaví) */
  Object.assign(Z, { typSachty: 'exteriérová', profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová'])), zaskleni: 'na terče',
    sirka: 1.6, hloubka: 2.1, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 4 });
  OCK.fixes = true; Object.keys(C).forEach(k => delete C[k]); Object.assign(C, JSON.parse(JSON.stringify(c))); delete C.prazdny; delete C.ukazkove;
  ZAK.autor = 'obchodnik.vz@priklad.cz';
  ZAK.cislo = o.cislo || zaklad; ZAK.datum = '2026-11-16';
  ZAK.nazevAkce = o.nazevAkce || 'Bytovy dum Ukazkova';
  ZAK.adresa = 'Ukazkova 5, 120 00 Praha 2';
  ['objednatel', 'adresaObjednatele', 'ico', 'dic', 'kontakt'].forEach(k => { ZAK[k] = uA[k]; });
  ZAK.zastupci = Object.assign({}, ZAK.zastupci || {}, uA.zastupci);
  if (ZAK.projHlavicka && typeof ZAK.projHlavicka === 'object') {
    ['objednatel', 'adresaObjednatele', 'ico', 'dic', 'kontakt'].forEach(k => { if (k in ZAK.projHlavicka || k === 'objednatel') ZAK.projHlavicka[k] = uA[k]; });
    ZAK.projHlavicka.cislo = o.cislo || zaklad;
  }
  const rid = aktivniVarianta(ZAK); rid.nazev = 'Varianta 1';
  const out = { ridici: rid.id, ids: {} };
  if (druh === 'tri') {
    const rB = vzPridej(ZAK, uB, { kdo: 'obchodnik.vz@priklad.cz' });
    const rC = vzPridej(ZAK, uC, { vlastni: true, nazevVarianty: 'Gamakanar varianta', kdo: 'obchodnik.vz@priklad.cz' });
    if (!rB.ok || !rC.ok) return { chyba: JSON.stringify([rB, rC]) };
    out.ids = { B: rB.zakaznik.id, C: rC.zakaznik.id };
    out.varC = rC.zakaznik.varianta;
    const vC = ZAK.varianty.find(v => String(v.id) === String(out.varC));
    out.priponaC = variantaPriponaVZakazce(ZAK, vC);
    out.pismena = { B: rB.zakaznik.pismeno, C: rC.zakaznik.pismeno };
  }
  ZAK.aktivni = rid.id; syncVarianta();
  window.__dlg.length = 0; window.__okna.length = 0; window.__stazeni.length = 0; window.__tiskNazvy.length = 0;
  prepniTab('kalk'); render();
  return out;
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj(), druh, udaje('A'), udaje('B'), udaje('C'), ZAKLAD, volby || {}]);

/* Otevřený zákazník ('' = řídící) a otevřená varianta. */
const otevri = (id, varId) => p.evaluate(([id, varId]) => {
  VZ_UI.otevreny = id;
  if (varId) ZAK.aktivni = varId;
  syncVarianta(); render();
}, [id, varId || '']);

/* Spustí tisk v prohlížeči a vrátí, co vzniklo: okna (HTML + titulek),
 * stažené soubory, hlášky, chybu. */
const spust = async (kod, cekejStazeni) => {
  const r = await p.evaluate(async kod => {
    window.__dlg.length = 0; window.__okna.length = 0; window.__stazeni.length = 0; window.__tiskNazvy.length = 0;
    /* stavové řádky Wordu (nabídka, krycí list) — i když jejich záložka není otevřená */
    if (!document.querySelector('.nabidkaStav')) { const e = document.createElement('div'); e.className = 'nabidkaStav'; e.hidden = true; document.body.appendChild(e); }
    if (!document.querySelector('.sodStav_sod')) { const e = document.createElement('div'); e.className = 'sodStav_sod'; e.hidden = true; document.body.appendChild(e); }
    if (!document.getElementById('kryciStav')) { const e = document.createElement('div'); e.id = 'kryciStav'; e.hidden = true; document.body.appendChild(e); }
    document.querySelectorAll('.nabidkaStav, #kryciStav, .sodStav_sod').forEach(e => { e.textContent = ''; });
    let chyba = '';
    try { await (0, eval)(kod); } catch (e) { chyba = String(e && e.message || e); }
    return { chyba };
  }, kod);
  if (cekejStazeni) {
    const konec = Date.now() + 5000;
    while (Date.now() < konec && await p.evaluate(n => window.__stazeni.length < n, cekejStazeni)) await p.waitForTimeout(100);
  }
  await p.waitForTimeout(150);
  const v = await p.evaluate(async () => {
    const okna = window.__okna.map(w => {
      let html = '', titulek = '';
      try { html = w.document.documentElement.outerHTML; titulek = w.document.title; } catch (e) { html = 'NEČITELNÉ: ' + e.message; }
      try { w.close(); } catch (e) { /* zavřené */ }
      return { html, titulek };
    });
    const stazeni = await Promise.all(window.__stazeni);
    return { okna, stazeni, dlg: window.__dlg.slice(), tiskNazvy: window.__tiskNazvy.slice(),
      stav: [...document.querySelectorAll('.nabidkaStav, #kryciStav, .sodStav_sod')].map(e => e.textContent).filter(Boolean).join(' | ') };
  });
  for (const s of v.stazeni) s.text = await docxText(s.b64);
  return Object.assign(r, v);
};
const hlasky = r => r.dlg.filter(d => d.druh === 'hlaska').map(d => d.text).join(' | ');

let IDS = {};
/* Číslo v textu: CISLO_NABIDKY je bez mezer (…-CN-9940), titulky a jména
 * souborů s podtržítky — hledá se „9940[.2][-B]" v textu bez mezer.
 * Vrací všechny výskyty; očekává se jediný tvar (číslo s písmenem
 * zákazníka, u dokumentů varianty i s příponou varianty). */
const CISLO_RE = /9940(\.\d+)?(-[B-Z](?![A-Za-z0-9]))?/g;
const cisla = t => String(t || '').replace(/<[^>]+>/g, ' ').replace(/[\s\u00a0]+/g, ' ').match(CISLO_RE) || [];
const cisloCekane = (X, pripona) => '9940' + (pripona ? '.' + pripona : '') + (X === 'A' ? '' : '-' + X);
const pismenoCizi = /9940(\.\d+)?-[B-Z](?![A-Za-z0-9])/;

/* Výstupy pro jednoho zákazníka. varianta: dokument nese číslo varianty (…9940.2-C); porovnání, krycí
 * list a specifikace nesou číslo zakázky (s písmenem zákazníka). */
const VYSTUPY = [
  { nazev: 'Kompletní náhled a tisk nabídky', kod: 'nabidkaOckDokument()', okno: true, varianta: true },
  { nazev: 'Kompletní náhled podkladů', kod: 'nabidkaNahled()', okno: true, varianta: true },
  { nazev: 'Porovnání variant (tisk)', kod: 'porovnaniTisk()', okno: true },
  { nazev: 'Detail položek (tisk)', kod: 'porovnaniPolozkyTisk()', okno: true },
  { nazev: 'Krycí list BO (tisk)', kod: "kryciTiskPohled('bo')", okno: true },
  { nazev: 'Krycí list Word (BO + Techdata)', kod: 'kryciWord()', stazeni: 2 },
  { nazev: 'Word nabídky', kod: "SABLONA_DOCX = { nazev: 'Sablona_NABIDKA_CN_test.docx', data: window.__sablona }; nabidkaWordGeneruj(null)", stazeni: 1, varianta: true },
  { nazev: 'Smlouva o dílo OCK (Word)', kod: "SOD_DOCX.sod = { nazev: 'Sablona_SOD_test.docx', data: window.__sablonaSod }; sodWordGeneruj('sod', null)", stazeni: 1, varianta: true },
];

const zakaznikBlok = async (X, ctx2) => {
  console.log(`\nZákazník ${X}${X === 'A' ? ' (řídící)' : ''}`);
  const vysl = {};
  for (const d of VYSTUPY) {
    const r = await spust(d.kod, d.stazeni);
    const kusy = d.okno ? r.okna.map(o => ({ html: o.html, jmeno: o.titulek }))
      : r.stazeni.map(s => ({ html: s.text, jmeno: s.nazev }));
    const pocet = d.okno ? 1 : d.stazeni;
    zkus(`${X} · ${d.nazev}: dokument vznikl (${pocet})`, kusy.length === pocet && !r.chyba,
      { chyba: r.chyba, hlasky: hlasky(r), stav: r.stav, kusu: kusy.length });
    if (!kusy.length) continue;
    const vse = kusy.map(k => k.html + '\n' + k.jmeno).join('\n');
    const k = kanarky(vse, X);
    zkus(`${X} · ${d.nazev}: žádný kanárek jiného zákazníka`, k.cizi.length === 0, kontext(vse, X));
    zkus(`${X} · ${d.nazev}: vlastní kanárek je v obsahu`, kusy.every(x => kanarky(x.html, X).vlastni), kusy.map(x => x.jmeno));
    {
      const cek = cisloCekane(X, d.varianta && X === 'C' ? ctx2.priponaC : 0);
      zkus(`${X} · ${d.nazev}: titulek / jméno souboru nese ${cek}`,
        kusy.every(x => cisla(x.jmeno).length && cisla(x.jmeno).every(c => c === cek)), kusy.map(x => x.jmeno));
      const tela = kusy.map(x => x.html.replace(/<title>[\s\S]*?<\/title>/, ''));
      const vTele = tela.map(cisla);
      if (d.varianta) zkus(`${X} · ${d.nazev}: číslo nabídky v dokumentu ${cek}`, vTele.every(c => c.includes(cek)), vTele);
      /* krycí list nese číslo zakázky i číslo varianty — obojí s písmenem */
      const smi = new Set([cisloCekane(X, 0), cisloCekane(X, X === 'C' ? ctx2.priponaC : 0)]);
      const spatne = tela.map(t => t.replace(/<[^>]+>/g, ' ').replace(/[\s\u00a0]+/g, ' ')).flatMap(t => [...t.matchAll(CISLO_RE)]
        .filter(m => !smi.has(m[0])).map(m => '…' + t.slice(Math.max(0, m.index - 70), m.index + 20) + '…'));
      zkus(`${X} · ${d.nazev}: žádné jiné tvary čísla v dokumentu (jen ${[...smi].join(' / ')})`, !spatne.length, { cisla: vTele, spatne: spatne.slice(0, 3) });
    }
    vysl[d.nazev] = vse;
  }
  /* technická specifikace: stránka a jméno souboru tisku */
  const spec = await p.evaluate(() => {
    prepniTab('spec'); render();
    const el = document.getElementById('page-spec');
    /* tiskne se stránka bez .noprint (lišta jazyků, kontrola vyplnění, tlačítka) */
    const tisk = el.cloneNode(true);
    tisk.querySelectorAll('.noprint').forEach(x => x.remove());
    const hodnoty = n => [...n.querySelectorAll('input, textarea, select')].map(i => i.value).join('\n');
    const obrazovka = [...el.querySelectorAll('.noprint')].map(x => x.innerText).join('\n');
    window.__tiskNazvy.length = 0; window.__dlg.length = 0;
    vzTiskSpecifikace('cz');
    const r = { html: tisk.innerHTML + '\n' + hodnoty(el), obrazovka, nazev: window.__tiskNazvy.join(' | '), dlg: window.__dlg.slice(),
      cislo: (([...el.querySelectorAll('.spec-row')].find(x => /ČÍSLO NABÍDKY/.test(x.textContent)) || { querySelector: () => null })
        .querySelector('input') || {}).value || '' };
    prepniTab('kalk'); render();
    return r;
  });
  const ks = kanarky(spec.html, X);
  zkus(`${X} · Technická specifikace (tištěná stránka): žádný kanárek jiného zákazníka`, ks.cizi.length === 0, kontext(spec.html, X));
  zkus(`${X} · Technická specifikace (tištěná stránka): vlastní kanárek (objednatel)`, ks.vlastni);
  if (kanarky(spec.obrazovka, X).cizi.length) info(`${X} · specifikace: obrazovková lišta (noprint) cituje jiného zákazníka: ${kontext(spec.obrazovka, X)}`);
  const cekS = cisloCekane(X, 0);
  zkus(`${X} · Technická specifikace: ČÍSLO NABÍDKY ${cekS}, tisk vznikl se jménem souboru ${cekS}`,
    cisla(spec.cislo).join() === cekS && cisla(spec.nazev).length > 0 && cisla(spec.nazev).every(c => c === cekS), { cislo: spec.cislo, nazev: spec.nazev, dlg: spec.dlg });
  vysl['Technická specifikace'] = spec.html;
  /* pruh v kartě Cenová nabídka (CN): číslo otevřené varianty */
  const karta = await p.evaluate(() => { renderNabidkaOck(); const e = document.getElementById('kalk-nabidka');
    const pr = e.querySelector('.vz-tisk-pruh'); return { pruh: pr ? pr.textContent : null, html: e.innerHTML }; });
  const pruh = karta.pruh;
  zkus(`${X} · karta Cenová nabídka (CN, živý náhled hlavičky): žádný kanárek jiného zákazníka`, !kanarky(karta.html, X).cizi.length, kontext(karta.html, X));
  const jmeno = udaje(X).objednatel;
  const cekP = cisloCekane(X, X === 'C' ? ctx2.priponaC : 0);
  zkus(`${X} · pruh v kartě CN „Náhled a tisk platí pro zákazníka ${jmeno} — nabídka …${cekP}"`,
    !!pruh && pruh.includes('Náhled a tisk platí pro zákazníka ' + jmeno + ' — nabídka ') && cisla(pruh).join() === cekP && kanarky(pruh, X).cizi.length === 0, pruh);
  return vysl;
};

/* ============ 1–5) tři zákazníci ============ */
console.log('Tři zákazníci (A řídící, B sdílená varianta, C vlastní varianta)' + (BEZ_POHLEDU ? ' — POJISTKA: BEZ POHLEDU' : ''));
let ctx3 = await priprav('tri');
zkus('zakázka se třemi zákazníky vznikla (vzPridej)', !ctx3.chyba && ctx3.ids.B && ctx3.ids.C, ctx3);
IDS = ctx3.ids;
zkus('písmena B a C', ctx3.pismena && ctx3.pismena.B === 'B' && ctx3.pismena.C === 'C', ctx3.pismena);
if (ctx3.priponaC !== 2) info('přípona vlastní varianty C je ' + ctx3.priponaC + ' (čekáno 2)');

const vA = await zakaznikBlok('A', ctx3);
ctx3 = await priprav('tri'); await otevri(IDS.B);
const vB = await zakaznikBlok('B', ctx3);
ctx3 = await priprav('tri'); await otevri(IDS.C, ctx3.varC);
const vC = await zakaznikBlok('C', ctx3);

console.log('\nPřepnutí zákazníka mění výstup');
for (const n of ['Kompletní náhled a tisk nabídky', 'Word nabídky', 'Krycí list BO (tisk)', 'Technická specifikace']) {
  zkus(`${n}: A ≠ B ≠ C`, vA[n] && vB[n] && vC[n] && vA[n] !== vB[n] && vB[n] !== vC[n] && vA[n] !== vC[n]);
}
/* Přepnutí na téže zakázce bez nové přípravy: A → B → A. */
{
  await priprav('tri');
  const t1 = (await spust('nabidkaOckDokument()')).okna.map(o => o.html).join('');
  await otevri(IDS.B);
  const t2 = (await spust('nabidkaOckDokument()')).okna.map(o => o.html).join('');
  await otevri('');
  const t3 = (await spust('nabidkaOckDokument()')).okna.map(o => o.html).join('');
  zkus('A → B → A na téže zakázce: náhled se mění a vrací', t1 && t2 && t1 !== t2 && kanarky(t2, 'B').vlastni && !kanarky(t2, 'B').cizi.length
    && t3.replace(/\d{1,2}:\d{2}(:\d{2})?/g, '') === t1.replace(/\d{1,2}:\d{2}(:\d{2})?/g, ''));
}

/* ============ 6) zábrany ============ */
console.log('\nZábrany tisku');
{
  /* varianta C otevřená při zákazníkovi B */
  const c = await priprav('tri'); await otevri(c.ids.B, c.varC);
  for (const [n, kod] of [['náhled a tisk nabídky', 'nabidkaOckDokument()'], ['náhled podkladů', 'nabidkaNahled()'],
    ['krycí list', "kryciTiskPohled('bo')"], ['Word nabídky', "SABLONA_DOCX = { nazev: 's.docx', data: window.__sablona }; nabidkaWordGeneruj(null)"],
    ['smlouva o dílo', "SOD_DOCX.sod = { nazev: 's.docx', data: window.__sablonaSod }; sodWordGeneruj('sod', null)"]]) {
    const r = await spust(kod, /Word|smlouva/.test(n) ? 1 : 0);
    zkus(`B s otevřenou variantou C: ${n} nevznikne, hláška „není nabídka zákazníka"`,
      !r.okna.length && !r.stazeni.length && /není nabídka zákazníka/.test(hlasky(r) + r.stav), { hlasky: hlasky(r), stav: r.stav, okna: r.okna.length, chyba: r.chyba });
  }
}
{
  /* název akce s názvem zákazníka C: A i B zastaveno, C projde */
  const c = await priprav('tri', { nazevAkce: 'Nastavba pro Gamakanar Nazev s.r.o.' });
  let r = await spust('nabidkaOckDokument()');
  zkus('název akce s názvem C: tisk pro A zastaven (hláška Název akce)', !r.okna.length && /Název akce obsahuje název nebo IČO jiného zákazníka/.test(hlasky(r)), hlasky(r));
  r = await spust("kryciTiskPohled('bo')");
  zkus('…krycí list pro A zastaven', !r.okna.length && /Název akce/.test(hlasky(r)), hlasky(r));
  await otevri(c.ids.B);
  r = await spust('nabidkaOckDokument()');
  zkus('…tisk pro B zastaven', !r.okna.length && /Název akce obsahuje/.test(hlasky(r)), hlasky(r));
  r = await spust('porovnaniTisk()');
  zkus('…porovnání pro B zastaveno', !r.okna.length && /Název akce/.test(hlasky(r)), hlasky(r));
  await otevri(c.ids.C, c.varC);
  r = await spust('nabidkaOckDokument()');
  zkus('…pro C (vlastní název) tisk projde', r.okna.length === 1 && kanarky(r.okna[0].html, 'C').vlastni, { hlasky: hlasky(r), chyba: r.chyba });
}
{
  /* PROJ (R5): pro B zastaveno, pro řídícího projde (řada OVP — OCK je tam
   * uzamčená a vynulovaná, nabídka PROJ ne) */
  const c = await priprav('tri', { cislo: ZAKLAD_PROJ });
  let r = await spust('nabidkaProjNahled()');
  zkus('PROJ náhled pro řídícího A projde', r.okna.length === 1 && !kanarky(r.okna[0].html, 'A').cizi.length, { hlasky: hlasky(r), chyba: r.chyba });
  await otevri(c.ids.B);
  r = await spust('nabidkaProjNahled()');
  zkus('PROJ náhled pro B zastaven (R5, jen řídící)', !r.okna.length && /Dokumenty projekce \(PROJ\).*jen pro řídícího/.test(hlasky(r)), hlasky(r));
  r = await spust("kryciProjTiskPohled('bo')");
  zkus('krycí list PROJ pro B zastaven (R5)', !r.okna.length && /projekce \(PROJ\)/.test(hlasky(r)), hlasky(r));
  for (const typ of ['sodProj', 'plnaMoc']) {
    r = await spust(`SOD_DOCX.${typ} = { nazev: 's.docx', data: window.__sablonaSod }; sodWordGeneruj('${typ}', null)`, 1);
    zkus(`${typ === 'plnaMoc' ? 'plná moc' : 'SoD PROJ'} (Word) pro B zastavena (R5)`, !r.stazeni.length && /projekce \(PROJ\)/.test(hlasky(r)), { hlasky: hlasky(r), stazeni: r.stazeni.length });
  }
}
{
  /* funkce vypnutá: pro B zastaveno, pro řídícího projde */
  const c = await priprav('tri', { vypnuto: true });
  let r = await spust('nabidkaOckDokument()');
  zkus('funkce vypnutá: tisk pro řídícího A projde', r.okna.length === 1 && kanarky(r.okna[0].html, 'A').vlastni && !kanarky(r.okna[0].html, 'A').cizi.length,
    { hlasky: hlasky(r), chyba: r.chyba });
  /* S E1 (vzOtevrenyId) je při vypnuté funkci otevřený vždy řídící — hlavička
   * i tisk ukazují A; dalšího zákazníka nejde otevřít, pro B nic nevznikne. */
  await otevri(c.ids.B);
  r = await spust('nabidkaOckDokument()');
  zkus('funkce vypnutá: pokus otevřít B → tiskne se řídící A (jako hlavička), žádný údaj B',
    r.okna.length === 1 && kanarky(r.okna[0].html, 'A').vlastni && !kanarky(r.okna[0].html, 'A').cizi.length, { hlasky: hlasky(r), chyba: r.chyba });
  const zab = await p.evaluate((id) => vzTiskZabrana(ZAK, id, null, 'nabidka', { vypnuto: true }), c.ids.B);
  zkus('funkce vypnutá: zábrana pro dalšího zákazníka B (hláška vypnutá)', /Funkce víc zákazníků je v Nastavení vypnutá/.test(zab), zab);
}

/* ============ 7) jeden zákazník ============ */
console.log('\nJeden zákazník — beze změny');
{
  const bezCasu = t => String(t || '').replace(/\d{1,2}:\d{2}(:\d{2})?/g, '');
  const cJ = await priprav('jeden');
  zkus('zakázka bez dalších zákazníků nemá klíče VZ', await p.evaluate(() => !('dalsiZakaznici' in ZAK) && !('vzRidici' in ZAK)));
  const pruh = await p.evaluate(() => { renderNabidkaOck(); return !!document.querySelector('#kalk-nabidka .vz-tisk-pruh'); });
  zkus('jeden zákazník: pruh v kartě CN není', !pruh);
  const poh = await p.evaluate(() => vzTiskPohled(ZAK, '') === ZAK && vzTiskVstup('nabidka', aktivniVarianta(ZAK)).zak === ZAK);
  zkus('jeden zákazník: vstup tisku je TÁŽ zakázka (žádná kopie)', poh);
  const s1 = {}, s2 = {};
  for (const [n, kod] of [['náhled a tisk nabídky', 'nabidkaOckDokument()'], ['náhled podkladů', 'nabidkaNahled()'],
    ['krycí list', "kryciTiskPohled('bo')"], ['porovnání', 'porovnaniTisk()']]) {
    s1[n] = (await spust(kod)).okna.map(o => o.titulek + '\n' + o.html).join('');
  }
  /* táž zakázka, cesta bez pohledu (stav před E2) */
  await p.evaluate(() => { window.__vzZal = window.vzTiskVstup; window.vzTiskVstup = (typ, varianta) => ({ zak: ZAK, varianta }); });
  for (const n of Object.keys(s1)) {
    const kod = { 'náhled a tisk nabídky': 'nabidkaOckDokument()', 'náhled podkladů': 'nabidkaNahled()', 'krycí list': "kryciTiskPohled('bo')", 'porovnání': 'porovnaniTisk()' }[n];
    s2[n] = (await spust(kod)).okna.map(o => o.titulek + '\n' + o.html).join('');
  }
  await p.evaluate(() => { window.vzTiskVstup = window.__vzZal; });
  for (const n of Object.keys(s1)) {
    zkus(`jeden zákazník · ${n}: vznikl, bez písmene, shodný s cestou bez pohledu`,
      s1[n] && !pismenoCizi.test(s1[n].replace(/\s+/g, '')) && bezCasu(s1[n]) === bezCasu(s2[n]),
      { delka: [s1[n].length, s2[n].length] });
  }
  /* náhled řídícího u tří zákazníků = náhled téže zakázky s jedním zákazníkem */
  const c3 = await priprav('tri');
  const a3 = (await spust('nabidkaOckDokument()')).okna.map(o => o.titulek + '\n' + o.html).join('');
  const norm = (t, ids) => bezCasu(t).split(ids).join('VARID');
  const shoda = norm(a3, c3.ridici) === norm(s1['náhled a tisk nabídky'], cJ.ridici);
  if (!shoda) {
    const x = norm(a3, c3.ridici), y = norm(s1['náhled a tisk nabídky'], cJ.ridici);
    let i = 0; while (i < x.length && x[i] === y[i]) i++;
    zkus('tři zákazníci, řídící A: náhled CN = táž zakázka s jedním zákazníkem', false, { A3: x.slice(i - 80, i + 120), jeden: y.slice(i - 80, i + 120) });
  } else zkus('tři zákazníci, řídící A: náhled CN = táž zakázka s jedním zákazníkem', true);
}

/* ============ 8) pojistka: detektor najde vynechaný pohled ============ */
console.log('\nPojistka — tisk bez pohledu musí detektor zachytit');
if (!BEZ_POHLEDU) {
  const c = await priprav('tri'); await otevri(c.ids.B);
  await p.evaluate(() => { window.__vzZal = window.vzTiskVstup; window.vzTiskVstup = (typ, varianta) => ({ zak: ZAK, varianta }); });
  for (const d of VYSTUPY) {
    const r = await spust(d.kod, d.stazeni);
    const vse = r.okna.map(o => o.html + o.titulek).join('') + r.stazeni.map(s => s.text + s.nazev).join('');
    const k = kanarky(vse, 'B');
    const vzniklo = r.okna.length + r.stazeni.length > 0;
    const chybaApl = /chyba aplikace/.test(r.chyba + r.stav + hlasky(r));
    const proc = chybaApl ? 'pojistka generátoru (vzTiskHlidej)' : !vzniklo ? 'NIC — dokument nevznikl, únik neověřen'
      : (k.cizi.length ? 'cizí kanárek ' + k.cizi.join(',') : '') + (k.vlastni ? '' : ' vlastní kanárek chybí');
    zkus(`bez pohledu · ${d.nazev}: detektor únik zachytí (${proc.trim() || 'nic'})`, chybaApl || (vzniklo && (k.cizi.length > 0 || !k.vlastni)),
      { cizi: k.cizi, vlastni: k.vlastni, chyba: r.chyba, stav: r.stav, hlasky: hlasky(r) });
  }
  /* Word: bez pohledu zastaví dokument pojistka generátoru (vzTiskHlidej).
   * Aby bylo vidět, že by únik našel i detektor kanárků, vypne se i ona. */
  await p.evaluate(() => { window.__vzHlidejZal = window.vzTiskHlidej; window.vzTiskHlidej = () => {}; });
  for (const d of VYSTUPY.filter(x => x.stazeni)) {
    const r = await spust(d.kod, d.stazeni);
    const vse = r.stazeni.map(s => s.text + s.nazev).join('');
    const k = kanarky(vse, 'B');
    zkus(`bez pohledu i bez vzTiskHlidej · ${d.nazev}: Word vznikl a detektor najde cizího kanárka (${k.cizi.join(',') || '—'}${k.vlastni ? '' : ', vlastní chybí'})`,
      r.stazeni.length === d.stazeni && (k.cizi.length > 0 || !k.vlastni), { cizi: k.cizi, vlastni: k.vlastni, stav: r.stav, chyba: r.chyba });
  }
  await p.evaluate(() => { window.vzTiskVstup = window.__vzZal; window.vzTiskHlidej = window.__vzHlidejZal; });
} else info('běh bez pohledu (KNG_VZ_BEZ_POHLEDU=1) — oddíl 8 se přeskakuje, celý běh má být červený');

await b.close();
if (konzole.length) { console.log('\nKonzole:\n  ' + konzole.join('\n  ')); }
const s = ((Date.now() - START) / 1000).toFixed(1);
console.log(`\n${fail ? '✕' : '✓'} overit_vz_tisk: ${ok} OK, ${fail} FAIL, ${s} s`);
process.exit(fail || konzole.length ? 1 : 0);
