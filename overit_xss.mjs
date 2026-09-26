/* Ověření v prohlížeči: uložená zakázka nespustí cizí skript (B69, B70, B87).
 *
 * PROČ TAHLE SADA. Hloubkový test 24. 9. 2026 našel dvě cesty, kudy uložená
 * zakázka spustila JavaScript každému, kdo ji otevřel — i administrátorovi:
 *   B69 — „číselná" pole zakázky (sazba DPH, typ portálu, zasklení,
 *         světlíky, čistý vstup, šířka rámu, rohové sloupky, název skla,
 *         hodiny a rezerva PROJ) šla do HTML bez escapování;
 *   B70 — typ pásu opláštění se stal cestou `cenaPath` v obsluze `onchange`
 *         bez escJs, a cesta `C.__proto__.x` znečistila Object.prototype.
 * test_escape.js je neviděl, protože hlídá seznam jmen proměnných ve
 * zdrojáku (B87). Tahle sada se na zdroják nedívá: vloží neškodný payload do
 * dat zakázky, načte ji stejnou cestou jako ze serveru (importZakazka),
 * vykreslí záložky pro obchodníka i administrátora a zkontroluje, že se nic
 * nespustilo. Payload jen zapíše značku do window.__XSS.
 *
 * B82 — příloha zakázky s `javascript:` adresou se kliknutím na Stáhnout
 *       spustila (hloubkový test 24. 9. 2026).
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_xss.mjs
 */
import { createRequire } from 'module';
import path from 'path';
import { pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_xss.mjs');
  process.exit(2);
}

const KDE = pathToFileURL(path.resolve('dist/kalkulacka.html')).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + detail)); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });

/* Jeden pokus = čerstvá stránka, zakázka s payloadem, import, vykreslení
 * zadaných záložek, případně akce uživatele (změna ceny). */
async function pokus(nastav, { admin, zalozky, akce }) {
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  await p.goto(KDE);
  await p.waitForTimeout(400);
  const r = await p.evaluate(async ({ nastavSrc, admin, zalozky, akceSrc }) => {
    window.__XSS = [];
    const PAY = (z) => `"><img src=x onerror="window.__XSS.push('${z}')">`;
    const PAYJS = (z) => `1');window.__XSS.push('${z}');//`;
    const z = novaZakazka(); z.cislo = '2026 - OPR - CN - 0999'; z.nazevAkce = 'Zkušební';
    const d = z.varianty[0].data;
    if (typeof zkusebniCenik === 'function') d.cenik = zkusebniCenik();
    (new Function('z', 'd', 'PAY', 'PAYJS', nastavSrc))(z, d, PAY, PAYJS);
    NAST.jeAdmin = admin; NAST.nahledRole = admin ? '' : 'Obchodník';
    ZAK = importZakazka(JSON.parse(JSON.stringify(z)));
    syncVarianta();
    const chyby = [];
    for (const t of zalozky) {
      try { prepniTab(t); render(); } catch (e) { chyby.push(t + ': ' + e.message); }
      await new Promise(res => setTimeout(res, 120));
    }
    if (akceSrc) { try { await (new Function(akceSrc))(); } catch (e) { chyby.push('akce: ' + e.message); } }
    await new Promise(res => setTimeout(res, 250));
    return { xss: window.__XSS.slice(), proto: ({}).znecisteno, chyby };
  }, { nastavSrc: nastav, admin, zalozky, akceSrc: akce || '' });
  await p.close();
  return r;
}

const VSE = ['kalk', 'detail', 'spec', 'proj', 'detailproj', 'cenik'];
const POLE = [
  ['sazba DPH OCK (C.dph)', "d.cenik.dph = PAY('C.dph');"],
  ['sazba DPH PROJ (PC.dph)', "d.proj.cenik.dph = PAY('PC.dph');"],
  ...['typPortalu', 'zaskleni', 'svetlikyBoky', 'cistyVstupMm', 'sirkaRamuMm', 'rohoveSloupky']
    .map(k => ['zadání Z.' + k, `d.ock.zadani.${k} = PAY('Z.${k}');`]),
  ['název skla v ceníku zakázky', "d.ock.zadani.typSachty='exteriérová'; d.cenik.skloBokyNazev = '<img src=x onerror=window.__XSS.push`sklo`>';"],
  ['hodiny položky PROJ', "const s=d.proj.zadani.sekce.find(x=>x.polozky&&x.polozky.some(p=>p.typ==='hod'&&!p.vyrazeno)); s.polozky.find(p=>p.typ==='hod'&&!p.vyrazeno).hodiny = PAY('PJ.hodiny');"],
  ['rezerva položky PROJ', "const s=d.proj.zadani.sekce.find(x=>x.polozky&&x.polozky.some(p=>p.typ==='hod'&&!p.vyrazeno)); s.polozky.find(p=>p.typ==='hod'&&!p.vyrazeno).rezerva = PAY('PJ.rezerva');"],
];

console.log('B69 — hodnoty ze zakázky v HTML');
for (const admin of [false, true]) {
  for (const [popis, nastav] of POLE) {
    const r = await pokus(nastav, { admin, zalozky: VSE });
    zkus(`${admin ? 'administrátor' : 'obchodník'}: ${popis} se nespustí`, r.xss.length === 0, JSON.stringify(r));
  }
}

console.log('\nB70 — typ pásu opláštění');
const OPL = (typ) => `d.ock.fixes = false; Object.assign(d.ock.zadani, { zdvih: 17, prejezd: 2.7, sirka: 1.5, hloubka: 1.5, prohluben: 1 });
  d.ock.zadani.oplasteni = { rezim: 'poStenach', steny: { A: { odM: 0, pasy: [{ typ: ${JSON.stringify(typ)}, doM: null }] } } };`;
/* Změna ceny u řádku opláštění — přesně to, co spustilo obsluhu onchange. */
const ZMEN = `for (const inp of document.querySelectorAll('#page-kalk input[onchange^="set("]')) {
  inp.value = '7'; inp.dispatchEvent(new Event('change', { bubbles: true })); }`;
for (const [popis, typ] of [['JavaScript v typu pásu', "C.x');window.__XSS.push('B70');//"],
                            ['cesta C.__proto__.znecisteno', 'C.__proto__.znecisteno']]) {
  const r = await pokus(OPL(typ), { admin: true, zalozky: ['kalk'], akce: ZMEN });
  zkus('administrátor: ' + popis + ' se nespustí a prototyp zůstane čistý',
    r.xss.length === 0 && r.proto === undefined, JSON.stringify(r));
}

console.log('\nB82 — příloha s javascript: adresou');
{
  const PRIL = `z.prilohy = [{ id: 'pr1', nazev: 'smlouva.pdf', velikost: 10, kdy: '2026-09-01',
    data: "javascript:window.__XSS.push('B82')" }];`;
  const KLIK = `const b = [...document.querySelectorAll('button')].find(x => /prilohyStahni/.test(x.getAttribute('onclick') || ''));
    if (!b) throw new Error('tlačítko Stáhnout nenalezeno'); b.click();`;
  for (const admin of [false, true]) {
    const r = await pokus(PRIL, { admin, zalozky: ['kalk'], akce: KLIK });
    zkus(`${admin ? 'administrátor' : 'obchodník'}: Stáhnout přílohu s javascript: nic nespustí`,
      r.xss.length === 0 && !r.chyby.length, JSON.stringify(r));
  }
}

/* ================================================================
 * A2 — VŠECHNA POLE, OBĚ ROLE, VŠECHNY ZÁLOŽKY I PANELY NASTAVENÍ (25. 9. 2026)
 * ================================================================
 * Oddíly výš zkoušejí VYJMENOVANÁ pole — a seznam se rozejde s aplikací
 * stejně jistě, jako se rozešel seznam jmen v test_escape.js (B87). Tenhle
 * oddíl nevyjmenovává nic: projde všechny textové i číselné listy zakázky
 * (hlavička, zástupci, varianty i zámek, zadání OCK včetně pásů opláštění
 * a vlastních položek, ceník OCK i PROJ, sekce a položky PROJ, technická
 * specifikace, krycí listy, slevy, zaokrouhlení, poznámky, přílohy,
 * protokol) a dalších zdrojů dat, které aplikace kreslí (firemní údaje,
 * profil, seznam účtů, rejstřík zakázek, kartotéka zákazníků, zálohy,
 * kolize, žádosti o schválení, standard OCK, schémata slev). Do každého
 * listu vloží payload se ZNAČKOU CESTY a vykreslí všechny záložky i všechny
 * panely Nastavení — pro obchodníka i administrátora.
 *
 * Payload umí obojí naráz: v HTML vloží <img onerror>, v argumentu
 * onclick="fn('…')" uzavře řetězec. Kdekoli hodnota projde bez esc()/escJs(),
 * skončí značka cesty ve window.__XSS a výpis řekne, KTERÉ pole to bylo.
 *
 * Kontroluje se: 1) nic se nespustilo; 2) v DOM není žádný nezpracovaný
 * <img src=x> z payloadu; 3) žádný atribut on*="…" nenese payload
 * neescapovaný (spustil by se až kliknutím — esc() tam nechrání, B26);
 * 4) žádný odkaz javascript:; 5) vykreslení se nezhroutilo — spadlá
 * záložka by zbytek nevykreslila a díra by zůstala schovaná.
 *
 * Řídicí hodnoty (schéma, typ položky, stav slevy, směr zaokrouhlení…) se
 * schválně neotravují: nejsou to texty do stránky, ale přepínače větví
 * kódu, a jejich rozbití by jen zakrylo, co se v té větvi kreslí. */
console.log('\nA2 — všechna pole zakázky i ostatní zdroje dat, obě role, všechny záložky a panely');

const KOD_STRANKY = `
  window.__XSS = [];
  const PAY = (c) => "');window.__XSS.push('" + c + "');//\\"><img src=x onerror=\\"window.__XSS.push('" + c + "')\\">";
  /* dim a tl jsou klíče do tabulky JEKLY (rozměr a tloušťka profilu):
   * s neznámou hodnotou spadne vykreslení Kalkulace i Detailu OCK na
   * JEKLY[p.dim].kg (kalk_ock.js) — zakázka pak nejde otevřít. Je to
   * řídicí klíč, ne text do stránky, proto se tu neotravuje; nález je
   * zapsán ve zprávě z 25. 9. 2026 (A2-1) k rozhodnutí J. V. */
  const SKIP = new Set(['schema', 'priponySchema', 'aktivni', 'cenikRada', 'typ', 'sazba', 'fixKey', 'rezim',
                        'smer', 'stav', 'druh', 'role', 'ridici', 'varianta', 'zapnuto', 'jazyk', 'cast', 'zamceno',
                        'dim', 'tl']);
  /* Projde strom a každý textový i číselný list nahradí payloadem se značkou
   * své cesty. Parametr jen omezuje cesty, jenText vynechá čísla (tam, kde je
   * počítá server a klient je jen vypisuje). */
  function otrav(o, cesta, jen, jenText) {
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) {
      const c = cesta ? cesta + '.' + k : k;
      const v = o[k];
      if (v && typeof v === 'object') { otrav(v, c, jen, jenText); continue; }
      if (typeof v !== 'string' && (jenText || typeof v !== 'number')) continue;
      if (SKIP.has(k)) continue;
      if (jen && !jen(c)) continue;
      o[k] = PAY(c);
    }
  }
  /* Zakázka s NAPLNĚNÝMI větvemi: dva pásy opláštění, vlastní položky OCK,
   * vlastní položka PROJ, ruční pole krycích listů, extra řádek specifikace,
   * poznámka, příloha, záznam protokolu a druhá, ODESLANÁ varianta. Prázdná
   * větev se nekreslí, takže by se v ní díra neukázala. */
  function zakazkaPlna() {
    const z = novaZakazka(); z.cislo = '2026 - OPR - CN - 0999'; z.nazevAkce = 'Zkušební';
    z.objednatel = 'Zákazník'; z.kontakt = 'Kontakt'; z.ico = '12345678'; z.adresa = 'Stavba 1';
    for (const k of Object.keys(z.zastupci)) z.zastupci[k] = 'x';
    z.autor = 'obchodnik@priklad.cz'; z.autorJmeno = 'Obchodník Zkušební';
    const d = z.varianty[0].data;
    if (typeof zkusebniCenik === 'function') d.cenik = zkusebniCenik();
    Object.assign(d.ock.zadani, { zdvih: 17, prejezd: 2.7, sirka: 1.5, hloubka: 1.5, prohluben: 1, patra: 5,
      typSachty: 'exteriérová' });
    d.ock.zadani.oplasteni = { rezim: 'poStenach', steny: { A: { odM: 0, pasy: [{ typ: 'plech', doM: 3 }, { typ: 'sklo', doM: null }] } } };
    if (!d.ock.zadani.vlastniPolozky) d.ock.zadani.vlastniPolozky = {};
    for (const s of ['hrubaOck', 'atyp', 'oplasteni', 'volitelne', 'rezie'])
      d.ock.zadani.vlastniPolozky[s] = [{ nazev: 'Vlastní ' + s, mnozstvi: 1, cena: 10, jednotka: 'ks' }];
    d.proj.zadani.sekce[0].polozky.push({ nazev: 'Vlastní PROJ', typ: 'hod', sazba: 'projektant', hodiny: 1, rezerva: 0, kid: 'pk1' });
    d.techspec.hodnoty = { nazevAkce: 'x' }; d.techspec.extra = [{ label: 'Extra', hodnota: 'h' }];
    d.kryci.hodnoty = {}; d.kryciProj.hodnoty = {};
    if (typeof KRYCI_SEKCE !== 'undefined') KRYCI_SEKCE.forEach(s => (s.pole || []).forEach(p => { d.kryci.hodnoty[p.id] = 'x'; }));
    if (typeof KRYCI_PROJ_SEKCE !== 'undefined') KRYCI_PROJ_SEKCE.forEach(s => (s.pole || []).forEach(p => { d.kryciProj.hodnoty[p.id] = 'x'; }));
    Object.assign(d.sleva, { procenta: 3, schema: 'Standardní obchodní sleva', poznamka: 'p', kdo: 'x' });
    Object.assign(d.slevaProj, { procenta: 2, schema: 'Standardní obchodní sleva', poznamka: 'p', kdo: 'x' });
    d.cenikRucni = { marze: 0.2 }; d.zadaniRucni = { zdvih: 17 };
    if (typeof poznamkyPridej === 'function') poznamkyPridej(z, 'Poznámka', { kdo: 'x', druh: 'interni' });
    if (typeof prilohyPridej === 'function')
      prilohyPridej(z, { nazev: 'smlouva.pdf', data: 'data:application/pdf;base64,AAAA', velikost: 10, typ: 'application/pdf', popis: 'p' }, { kdo: 'x' });
    if (typeof protokolZapis === 'function') protokolZapis(z, { co: 'změna', kdo: 'x', kde: 'Zakázka', pred: 'a', po: 'b' });
    const v2 = novaVarianta('Varianta 2', JSON.parse(JSON.stringify(d)));
    v2.zakaznik = 'z'; v2.pozn = 'p'; z.varianty.push(v2);
    if (typeof zamkniVariantu === 'function') zamkniVariantu(v2, { kdo: 'x', cislo: '2026 - OPR - CN - 0999.2', typ: 'CN', popis: 'tisk' });
    return z;
  }
  const ucet = (n) => ({ email: n + '@priklad.cz', jmeno: 'Účet ' + n, titul: 'Ing.', funkce: 'f', telefon: '+420 111 222 333',
                         role: 'Obchodník', aktivni: true, zalozen: '2026-09-01T00:00:00.000Z', posledniPrihlaseni: '2026-09-02T00:00:00.000Z' });
  const OBLASTI = {
    'hlavička, zástupci, foto, autor': (z) => otrav(z, '', c => !/^(varianty|poznamky|prilohy|prilohySmazane|protokol)\\b/.test(c)),
    'varianty: název, zákazník, pozn., id, zámek': (z) => z.varianty.forEach((v, i) => otrav(v, 'varianty.' + i, c => !/\\.data\\./.test(c))),
    'zadání OCK (všechna pole)': (z, d) => otrav(d.ock.zadani, 'ock.zadani', c => !/oplasteni|vlastniPolozky/.test(c)),
    'pásy opláštění a vlastní položky OCK': (z, d) => { otrav(d.ock.zadani.oplasteni, 'ock.zadani.oplasteni'); otrav(d.ock.zadani.vlastniPolozky, 'ock.zadani.vlastniPolozky'); },
    'ceník OCK (sazby, názvy, popisy)': (z, d) => otrav(d.cenik, 'cenik'),
    'zadání PROJ (sekce a položky)': (z, d) => otrav(d.proj.zadani, 'proj.zadani'),
    'ceník PROJ': (z, d) => otrav(d.proj.cenik, 'proj.cenik'),
    'technická specifikace': (z, d) => otrav(d.techspec, 'techspec'),
    'krycí listy OCK a PROJ': (z, d) => { otrav(d.kryci, 'kryci'); otrav(d.kryciProj, 'kryciProj'); },
    'slevy, zaokrouhlení, ruční hodnoty': (z, d) => { otrav(d.sleva, 'sleva'); otrav(d.slevaProj, 'slevaProj'); otrav(d.zaokr, 'zaokr');
      otrav(d.zaokrProj, 'zaokrProj'); otrav(d.cenikRucni, 'cenikRucni'); otrav(d.zadaniRucni, 'zadaniRucni'); },
    'poznámky, přílohy, protokol': (z) => { otrav(z.poznamky, 'poznamky'); otrav(z.prilohy, 'prilohy'); otrav(z.protokol, 'protokol'); },
  };
  const DALSI = {
    'firemní údaje (NAST.firma)': () => otrav(NAST.firma, 'NAST.firma'),
    'profil, seznam účtů': () => { otrav(ONLINE_STAV.ja, 'ja', c => !/email/.test(c));
      ONLINE_STAV.uzivatele = [ucet('u1'), ucet('u2')]; ONLINE_STAV.uzivateleNacteno = true; otrav(ONLINE_STAV.uzivatele, 'uzivatele', null, true);
      NAST.uzivatele = [ucet('u3')]; otrav(NAST.uzivatele, 'NAST.uzivatele', null, true); },
    'rejstřík zakázek': () => { ONLINE_STAV.rejstrik = [1, 2].map(i => Object.assign(uloRejstrikZaznam(ZAK, { soubor: 'zak' + i }), { autor: 'a@priklad.cz' }));
      otrav(ONLINE_STAV.rejstrik, 'rejstrik', null, true); },
    'kartotéka zákazníků': () => { const k = zakaznikNovy(); for (const q of Object.keys(k)) if (typeof k[q] === 'string') k[q] = 'x';
      k.ico = '12345678'; ZAK_DB.seznam = [k]; ZAK_DB.nacteno = true; ZAK_DB.hledat = 'x'; otrav(ZAK_DB.seznam, 'zakaznici'); otrav(ZAK_DB, 'ZAK_DB', c => /hledat|hlaska/.test(c)); },
    'zálohy, kolize, hlášky, verze serveru': () => { ONLINE_STAV.otisky = [{ den: '2026-09-01', porizena: '2026-09-01T01:00:00.000Z', zdroj: 'nocni', pocetZakazek: 3, pocetUctu: 2, kdo: 'x' }];
      ONLINE_STAV.otiskyNacteno = true; otrav(ONLINE_STAV.otisky, 'otisky', null, true);
      ONLINE_STAV.kolize = { soubor: 'x', kdo: 'x', naDisku: 'x', kdy: 'x' }; otrav(ONLINE_STAV.kolize, 'kolize');
      ONLINE_STAV.hlaska = PAY('hlaska'); ONLINE_STAV.soubor = PAY('soubor'); ONLINE_STAV.serverVerze = PAY('serverVerze');
      ONLINE_STAV.prostrediPopis = PAY('prostrediPopis'); ONLINE_STAV.razitko = PAY('razitko'); },
    'žádosti o schválení (cizí zakázky)': () => { SCHV_CIZI.stav = 'hotovo'; SCHV_CIZI.rozsah = 'vse';
      SCHV_CIZI.zadosti = [{ klic: 'z1', cast: 'ock', cislo: 'c', nazevAkce: 'n', variantaId: 'v1', variantaNazev: 'V', ridici: true, zamceno: false,
        upraveno: '2026-09-01T00:00:00.000Z', sleva: { procenta: 5, role: 'Obchodník', schema: 's', poznamka: 'p', stav: 'čeká na schválení',
        schvalil: 's', schvalilKdy: 'k', schvalenoProc: 0, zamitl: 'z', zamitlKdy: 'k', zamitnutoProc: 0, zamitnutoDuvod: 'd' } }];
      otrav(SCHV_CIZI.zadosti, 'schvalovani', null, true); },
    'standard OCK a schémata slev': () => { otrav(NAST.standard, 'standard', null, true); otrav(NAST.slevy.schemata, 'slevy.schemata'); },
  };
  async function pokus(oblast, admin) {
    window.__XSS = [];
    const chyby = [];
    const z = zakazkaPlna(); const d = z.varianty[0].data;
    NAST.jeAdmin = admin; NAST.nahledRole = admin ? '' : 'Obchodník';
    ONLINE_STAV.bezi = true; ONLINE_STAV.sondaHotova = true;
    ONLINE_STAV.ja = { email: 'tester@priklad.cz', jmeno: 'Tester', titul: '', funkce: 'f', telefon: '', podpis: '',
                       role: admin ? 'Administrátor' : 'Obchodník' };
    if (OBLASTI[oblast]) OBLASTI[oblast](z, d);
    z.aktivni = z.varianty[0].id;
    try { ZAK = importZakazka(JSON.parse(JSON.stringify(z))); } catch (e) { chyby.push('importZakazka: ' + e.message); ZAK = z; }
    try { syncVarianta(); } catch (e) { chyby.push('syncVarianta: ' + e.message); }
    if (DALSI[oblast]) { try { DALSI[oblast](); } catch (e) { chyby.push('příprava dat: ' + e.message); } }
    /* render() výjimku sám chytá: vypíše pruh #render-chyba a znovu ji hodí
     * až ze setTimeout. try/catch kolem render() by ji tedy neviděl — čte se
     * pruh a zvenku (Playwright) se sbírají i chyby stránky. */
    const pruh = (kde) => { const el = document.getElementById('render-chyba');
      if (el && el.style.display !== 'none' && el.textContent.trim()) { chyby.push(kde + ': ' + el.textContent.trim().slice(0, 160)); el.style.display = 'none'; el.textContent = ''; } };
    for (const t of TABY) {
      try { prepniTab(t); render(); } catch (e) { chyby.push('záložka ' + t + ': ' + e.message); }
      pruh('záložka ' + t);
      await new Promise(r => setTimeout(r, 60));
    }
    try { otevriNastaveni(); } catch (e) { chyby.push('nastavení: ' + e.message); }
    for (const p of nastPanelyViditelne()) {
      try { nastPanel(p.id); } catch (e) { chyby.push('panel ' + p.id + ': ' + e.message); }
      pruh('panel ' + p.id);
      await new Promise(r => setTimeout(r, 40));
    }
    await new Promise(r => setTimeout(r, 300));
    const img = document.querySelectorAll('img[src="x"]').length;
    const handlers = [];
    for (const el of document.querySelectorAll('*'))
      for (const a of el.attributes)
        if (/^on/i.test(a.name) && /(^|[^\\\\])'\\);window\\.__XSS\\.push\\(/.test(a.value))
          handlers.push(el.tagName.toLowerCase() + ' ' + a.name + '="' + a.value.slice(0, 100) + '…"');
    const hrefJs = document.querySelectorAll('a[href^="javascript:"], [src^="javascript:"]').length;
    /* Kolikrát se payload (escapovaný) ve stránce vůbec objevil. Nula by
     * znamenala, že se oblast nikde nekreslí — a kontrola by byla prázdná. */
    const vyskytu = (document.documentElement.innerHTML.match(/__XSS\.push/g) || []).length;
    return { xss: [...new Set(window.__XSS)], img, handlers: handlers.slice(0, 5), hrefJs, chyby, vyskytu };
  }
  return { OBLASTI: Object.keys(OBLASTI), DALSI: Object.keys(DALSI), pokus };
`;
async function a2Pokus(oblast, admin) {
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const chybyStranky = [];
  p.on('pageerror', e => chybyStranky.push(String(e && e.message || e).slice(0, 160)));
  await p.goto(KDE);
  await p.waitForTimeout(400);
  const r = await p.evaluate(async ({ kod, oblast, admin }) => {
    const { pokus } = (new Function(kod))();
    return pokus(oblast, admin);
  }, { kod: KOD_STRANKY, oblast, admin });
  await p.waitForTimeout(100);
  await p.close();
  r.chyby.push(...chybyStranky.map(x => 'chyba stránky: ' + x));
  return r;
}
{
  const p = await b.newPage(); await p.goto(KDE); await p.waitForTimeout(300);
  const seznamy = await p.evaluate((kod) => { const o = (new Function(kod))(); return { OBLASTI: o.OBLASTI, DALSI: o.DALSI }; }, KOD_STRANKY);
  await p.close();
  for (const admin of [false, true]) {
    for (const oblast of [...seznamy.OBLASTI, ...seznamy.DALSI]) {
      const r = await a2Pokus(oblast, admin);
      const role = admin ? 'administrátor' : 'obchodník';
      zkus(`${role}: ${oblast} — nic se nespustilo`, r.xss.length === 0, 'spustilo se: ' + r.xss.join(', '));
      zkus(`${role}: ${oblast} — v DOM není nezpracovaný <img> z payloadu ani javascript: odkaz`, r.img === 0 && r.hrefJs === 0,
        `img=${r.img}, javascript:=${r.hrefJs}`);
      zkus(`${role}: ${oblast} — žádný on*="…" s neescapovaným payloadem`, r.handlers.length === 0, r.handlers.join(' | '));
      zkus(`${role}: ${oblast} — vykreslení nespadlo`, r.chyby.length === 0, r.chyby.join(' | '));
      /* Pojistka proti prázdnému testu: payload z oblasti se ve stránce musí
       * objevit (escapovaný), jinak se ta oblast nikde nekreslí a kontroly
       * výš neověřily nic. */
      zkus(`${role}: ${oblast} — payload se do stránky dostal (escapovaný; ${r.vyskytu}×)`, r.vyskytu > 0, r.vyskytu);
    }
  }
}

/* Sonda na sobě: kdyby payload neuměl spustit nic, všechny kontroly výš by
 * prošly vždycky. Vloží se přímo do stránky syrovým innerHTML. */
{
  const p = await b.newPage();
  await p.goto(KDE); await p.waitForTimeout(300);
  const n = await p.evaluate(async () => {
    window.__XSS = [];
    const d = document.createElement('div');
    d.innerHTML = `"><img src=x onerror="window.__XSS.push('sonda')">`;
    document.body.appendChild(d);
    await new Promise(res => setTimeout(res, 200));
    return window.__XSS.length;
  });
  await p.close();
  zkus('(sonda) payload opravdu umí spustit značku, když se vloží syrově', n === 1, n);
}

await b.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
