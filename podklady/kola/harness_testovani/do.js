// Zkouška DO (#675) na TESTU (trvalý souhlas J. V. 19. 11., potvrzen v sezení). Zápis jen TEST 9815 (správce),
// TEST 9816 (obchodník) a dočasně číselník dodatkových textů (vrací se). Main jen čtení. Pipedrive blokováno.
// Spuštění z kořene repa: OUT=<složka> node podklady/kola/harness_testovani/do.js
const { chromium } = require('playwright'); const fs = require('fs'); const { execSync } = require('child_process');
const OUT = process.env.OUT || '/tmp/do'; fs.mkdirSync(OUT, { recursive: true });
const LOG = []; const L = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); LOG.push(s); console.log(s); };
let ok = 0, fail = 0; const V = (id, pod, det) => { if (pod) ok++; else fail++; L((pod ? 'OK   ' : 'FAIL ') + id, det === undefined ? '' : det); };
const TEST = 'https://testengscalc.netlify.app/', MAIN = 'https://engscalc.netlify.app/';
const C15 = 'TEST - 2026 - OPR - CN - 9815', C16 = 'TEST - 2026 - OPR - CN - 9816', ADR = 'Zkušební 15, 100 00 Praha', AKCE = 'TEST DO – opláštění';
const KLIC = 'PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)';
async function relace(b, base, envE, envH, zapis, zap) {
  const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1500, height: 1000 } }); const p = await ctx.newPage();
  await p.route('**/*', async r => { const u = r.request().url(), m = r.request().method(); if (m === 'GET') return r.continue();
    const path = new URL(u).pathname; if (path === '/api/prihlaseni') return r.continue();
    if (!zapis || !u.startsWith(TEST) || /\/api\/pd/.test(path)) { zap.push('BLOK ' + m + ' ' + path); return r.abort(); }
    const resp = await r.fetch(); let tx = ''; try { tx = (await resp.text()).slice(0, 300); } catch (e) {}
    zap.push(m + ' ' + path + ' ' + resp.status()); if (resp.status() >= 400) zap.push('  ODPOVĚĎ ' + tx.replace(/[\w.+-]+@[\w.-]+/g, '<email>').slice(0, 200)); return r.fulfill({ response: resp }); });
  p.on('pageerror', e => zap.push('pageerror ' + e.message.slice(0, 120)));
  await p.goto(base, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#onlineEmail', { timeout: 60000 });
  await p.fill('#onlineEmail', process.env[envE]); await p.fill('#onlineHeslo', process.env[envH]); await p.press('#onlineHeslo', 'Enter');
  await p.waitForSelector('#prihlaseni-overlay', { state: 'hidden', timeout: 60000 });
  await p.waitForFunction(() => (ONLINE_STAV.rejstrik || []).length > 50, null, { timeout: 60000 }); await p.waitForTimeout(2000);
  await p.evaluate(() => { window.__hl = []; window.potvrd = async (t) => { window.__hl.push('POTVRĎ: ' + String(t).replace(/\s+/g, ' ').slice(0, 160)); return true; };
    window.hlaska = (t) => { window.__hl.push('HLÁŠKA: ' + String(t).replace(/\s+/g, ' ').slice(0, 200)); };
    window.volba = async (t, moz) => { window.__hl.push('VOLBA: ' + String(t).replace(/\s+/g, ' ').slice(0, 120)); return (moz || []).some(m => m.kod === 'zahodit') ? 'zahodit' : ((moz || [])[0] || {}).kod; }; window.__hlBer = () => { const x = window.__hl; window.__hl = []; return x; };
    if (typeof onlineZprava === 'function') { const oz = window.onlineZprava; window.onlineZprava = function (t, k) { window.__hl.push('ZPRÁVA ' + (k || '') + ': ' + String(t).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').slice(0, 200)); return oz.apply(this, arguments); }; }
    if (typeof onlineAutoPrepni === 'function') try { onlineAutoPrepni(false); } catch (e) {} });
  return p;
}
const txtDocx = f => execSync(`unzip -p "${f}" 'word/document.xml' 'word/header*.xml' 'word/footer*.xml' 2>/dev/null || true`, { maxBuffer: 1 << 27 }).toString()
  .replace(/<w:tab\/>/g, ' ').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '');
(async () => {
  const b = await chromium.launch(); const zap = [], zapO = [], zapM = [], zapR = [];
  const pA = await relace(b, TEST, 'KNG_TEST_EMAIL', 'KNG_TEST_HESLO', true, zap);
  const E = (fn, arg) => pA.evaluate(fn, arg); const W = ms => pA.waitForTimeout(ms);
  L('verze testu', await E(() => (document.body.innerText.match(/v\d+\.\d+\.\d+/) || [''])[0]), 'admin', await E(() => jeAdmin()));
  const definujT = (p) => p.evaluate(() => { window.T = async (typ, Lg) => { const v = aktivniVarianta(ZAK);
      let sab = null; if (/^(sod|sodProj|plnaMoc|nabidka|nabidkaProj)$/.test(typ)) { const srv = await sablonaProTisk(typ, Lg || 'cz'); if (!srv) return { typ, stop: 'bez šablony' }; sab = srv.data.slice(0); }
      try { const res = await dokumentVygeneruj(typ, sab, ZAK, v, JEKLY, Lg || 'cz'); const buf = new Uint8Array(await res.blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        let html = ''; if (/^kryci_/.test(typ)) html = JSON.stringify(kryciVystupSekce(ZAK, kryciData(ZAK, v, JEKLY, typ.slice(6)).sekce));
        return { typ, nazev: res.nazevSouboru, b64: btoa(s), html }; } catch (e) { return { typ, stop: 'chyba: ' + e.message }; } }; });
  await definujT(pA);
  const tiskni = async (p, krok, typ, Lg) => { const r = await p.evaluate(([t, l]) => T(t, l), [typ, Lg]); const base = `${OUT}/${krok}_${typ}_${Lg}`;
    if (!r.b64) { L('  tisk', krok, typ, Lg, 'STOP ' + r.stop); return null; } fs.writeFileSync(base + '.docx', Buffer.from(r.b64, 'base64'));
    const t = txtDocx(base + '.docx') + (r.html || ''); fs.writeFileSync(base + '.txt', t); return t; };
  const otevri = async (p, re) => { const s = await p.evaluate(r => (ONLINE_STAV.rejstrik.find(z => new RegExp(r).test(z.cislo)) || {}).soubor, re); if (!s) return null;
    const c = await p.evaluate(r => ONLINE_STAV.rejstrik.find(z => new RegExp(r).test(z.cislo)).cislo, re);
    for (let pokus = 1; pokus <= 4; pokus++) { p.evaluate(x => { try { onlineOtevri(x); } catch (e) {} }, s).catch(() => {});
      const hotovo = await p.waitForFunction(c => typeof ZAK !== 'undefined' && ZAK.cislo === c, c, { timeout: 15000 }).then(() => true, () => false);
      if (hotovo) break; L('  otevření', re, 'pokus', pokus, 'neprošel'); await p.waitForTimeout(3000); } await p.waitForTimeout(3000);
    const je = await p.evaluate(() => ZAK.cislo); if (je !== c) { L('OTEVŘENÍ SELHALO', re, await p.evaluate(() => ({ hl: window.__hlBer(), cislo: ZAK.cislo, soubor: ONLINE_STAV.soubor, beh: !!ONLINE_STAV.ukladaBeh, kolize: !!ONLINE_STAV.kolize, nacita: ONLINE_STAV.nacita })), zap.slice(-6)); throw new Error('neotevřeno ' + re); }
    if (await p.evaluate(() => typeof zamekCteniJe === 'function' && zamekCteniJe())) await p.evaluate(() => zamekCteniOdemkniUI()); return s; };
  const uloz = async (p, popis) => { const r = await p.evaluate(async () => { const x = await onlineUloz(); return x === undefined ? 'undefined' : x; }); await p.waitForTimeout(3500); L('uložení', popis, { ok: r, hl: await p.evaluate(() => window.__hlBer()) }); };
  const zaloz = async (p, cislo, ponech, cisty) => {
    return p.evaluate(([cislo, ADR, AKCE, KOP, ponech]) => { const kop = KOP ? JSON.parse(KOP) : null;
      if (!ponech) { ZAK = novaZakazka(); syncVarianta(); ONLINE_STAV.soubor = ''; ONLINE_STAV.razitko = ''; ONLINE_STAV.posledni = '';
        Object.assign(ZAK, { cislo, nazevAkce: AKCE, adresa: ADR, objednatel: 'TEST DO s.r.o.' }); }
      const v = aktivniVarianta(ZAK); if (kop) for (const k of Object.keys(v.data)) if (!(k in kop) && !/sleva/.test(k)) delete v.data[k]; if (kop) for (const k of Object.keys(kop)) if (!/sleva/.test(k)) v.data[k] = kop[k]; syncVarianta();
      Object.assign(Z, { typSachty: 'exteriérová', profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová'])), sirka: 1.5, hloubka: 1.5, zdvih: 12, prejezd: 3, prohluben: 1.1, nastupiste: 4, prechodovePlechy: false });
      Z.priplatkyVynechat = []; Z.mnozstviPrepis = {}; Z.nazvyPrepis = {}; prepniTab('kalk'); render(); return { cislo: ZAK.cislo, zamcena: !variantaEditovatelna(v) }; }, [cislo, ADR, AKCE, cisty ? null : KOP, !!ponech]); };
  const KOP = await pA.evaluate(async () => { const z = ONLINE_STAV.rejstrik.find(z => /9603 - K19T-C103/.test(z.cislo)); const d = await (await fetch('/api/zakazky?soubor=' + encodeURIComponent(z.soubor), { credentials: 'include' })).json();
    const zk = d.zakazka || d.data || d; const v = zk.varianty.find(x => x.id === zk.aktivni) || zk.varianty[0]; return JSON.stringify(v.data); });
  const cena = (p) => p.evaluate(() => vypocetSachtyAkt().souhrn.zakladCena);
  // ===== založení 9815
  const uz = await E(c => ONLINE_STAV.rejstrik.some(z => z.cislo === c), C15); L('9815 už existuje', uz);
  if (uz) { await otevri(pA, '9815$'); L('9815 obnovení dat', await zaloz(pA, C15, true)); }
  else L('založení 9815', await zaloz(pA, C15));
  await uloz(pA, '9815 založení');
  // ===== D1
  await E(() => { oplRezimSet('poStenach'); });
  const stenaStav = (k) => E((k) => { prepniTab('kalk'); render();
    const st = [...document.querySelectorAll('#ock-oplasteni-steny .opl-stena')]['ABCD'.indexOf(k)];
    const chk = st && [...st.querySelectorAll('input[type=checkbox]')].find(e => /oplCelaVyskaSet/.test(e.getAttribute('onchange') || ''));
    const od = st && [...st.querySelectorAll('input')].find(e => /oplOdSet/.test(e.getAttribute('onchange') || ''));
    const s = Z.oplasteni.steny[k]; const txt = st ? st.innerText : '';
    return { cela: !!(chk && chk.checked), odPole: od ? od.value : null, odViditelne: !!(od && od.offsetParent), zacinaText: /Opláštění začíná/.test(txt), odM: s.odM, pasu: s.pasy.length,
      varovani: (st && st.querySelector('.seznam-varovani') || {}).textContent || '', prohlVse: oplasteniProhlubenVse(Z) }; }, k);
  const klikCela = (k) => E((k) => { const st = [...document.querySelectorAll('#ock-oplasteni-steny .opl-stena')]['ABCD'.indexOf(k)];
    [...st.querySelectorAll('input[type=checkbox]')].find(e => /oplCelaVyskaSet/.test(e.getAttribute('onchange') || '')).click(); }, k);
  let s1 = await stenaStav('B');
  V('D1.1 stěna po celé výšce = 1 pás, „Opláštění začíná" vidět (0)', s1.cela && s1.pasu === 1 && s1.odPole === '0' && s1.odViditelne && s1.zacinaText, s1);
  await E(() => prohlubenSkloSet(true)); s1 = await stenaStav('B');
  V('D1.2 po „Opláštit i prohlubeň" zůstává „po celé výšce", začátek −1,1, prohlubeň opláštěná', s1.cela && s1.odM === -1.1 && s1.prohlVse && s1.zacinaText, s1);
  const c0 = await cena(pA);
  await klikCela('B'); s1 = await stenaStav('B');
  V('D1.3 odškrtnutí (klik) = 2 pásy, začátek zůstane −1,1', !s1.cela && s1.pasu === 2 && s1.odM === -1.1, s1);
  await klikCela('B'); s1 = await stenaStav('B');
  V('D1.4 zaškrtnutí (klik) = 1 pás, začátek −1,1 a prohlubeň zůstává opláštěná', s1.cela && s1.pasu === 1 && s1.odM === -1.1 && s1.prohlVse, s1);
  V('D1.5 cena po odškrtnutí a zaškrtnutí beze změny', (await cena(pA)) === c0);
  await E(() => oplOdSet('B', '-3')); s1 = await stenaStav('B');
  V('D1.6 začátek pod dnem prohlubně se ohlásí i u stěny po celé výšce', s1.cela && /pod dnem prohlubně/.test(s1.varovani), s1.varovani.slice(0, 120));
  await E(() => oplOdSet('B', '-1.1'));
  await pA.locator('#ock-oplasteni-steny').screenshot({ path: OUT + '/d1_steny.png' }).catch(() => {});
  // ===== D2
  const typy = await E(() => { render(); const sel = document.querySelector('#ock-oplasteni-steny select.opl-s1') || document.querySelector('#ock-oplasteni-steny select'); return sel ? [...sel.options].map(o => [o.value, o.textContent.trim()]) : []; });
  V('D2.1 výběr: „bez opláštění" (klíč bez), „dodá stavba" nikde', typy.some(([v, t]) => v === 'bez' && t === 'bez opláštění') && !typy.some(([, t]) => /dodá stavba/.test(t)), typy.map(x => x[1]));
  await klikCela('B'); const cRozd = await cena(pA);
  await E(() => { const st = document.querySelectorAll('#ock-oplasteni-steny .opl-stena')[1];
    const sel = [...st.querySelectorAll('select')].find(e => /oplPasSet\('B', 0, 'typ'/.test(e.getAttribute('onchange') || '')); sel.value = 'bez'; sel.dispatchEvent(new Event('change')); });
  const s2 = await stenaStav('B');
  const d2 = await E(() => { const st = document.querySelectorAll('#ock-oplasteni-steny .opl-stena')[1];
    const i = [...st.querySelectorAll('input')].find(e => /oplPasSet\('B', 0, 'doM'/.test(e.getAttribute('onchange') || ''));
    return { doM: Z.oplasteni.steny.B.pasy[0].doM, pole: i ? i.value : null, bezPasu: st.querySelectorAll('.opl-pas-bez').length, koty: [...st.querySelectorAll('.opl-kota')].map(e => e.textContent.trim()),
      textStena: /bez opláštění/.test(st.innerText) || /bez opláštění/.test(st.innerHTML), dodaStavba: /dodá stavba/.test(document.getElementById('page-kalk').innerText) }; });
  V('D2.2 nižší pás „bez opláštění" má do (m) = 0 (data i pole)', d2.doM === 0 && d2.pole === '0', d2);
  V('D2.3 žluté „nemá dělicí výšku" nevznikne', !/nemá dělicí výšku/.test(s2.varovani), s2.varovani.slice(0, 120));
  V('D2.4 nákres: pás bez opláštění od dna prohlubně po 0, popisek „bez opláštění"', d2.bezPasu === 1 && d2.koty.includes('0') && d2.koty.some(t => /-1,1/.test(t)) && d2.textStena, { bez: d2.bezPasu, koty: d2.koty });
  V('D2.5 v kalkulaci nikde „dodá stavba"', !d2.dodaStavba);
  V('D2.6 cena: do = 0 dává tutéž cenu jako prázdná výška', await E(() => { const z = JSON.parse(JSON.stringify(Z)); z.oplasteni.steny.B.pasy[0].doM = null;
    return vypocet(z, aktivniVarianta(ZAK).data.cenik, JEKLY, OCK.fixes).souhrn.zakladCena === vypocetSachtyAkt().souhrn.zakladCena; }));
  await E(() => { oplPasSet('B', 0, 'doM', '0,5'); }); V('D2.7 do (m) jde přepsat (0,5)', await E(() => Z.oplasteni.steny.B.pasy[0].doM) === 0.5);
  await E(() => { oplPasSet('B', 0, 'doM', '0'); oplPasSet('C', 0, 'typ', 'bez'); render(); });
  await pA.locator('#ock-oplasteni-steny').screenshot({ path: OUT + '/d2_steny.png' }).catch(() => {});
  await uloz(pA, '9815 D1+D2');
  // dokumenty D2 (+D4 později)
  const typyDok = await E(() => Object.keys(DOKUMENTY)); L('typy dokumentů', typyDok.join(','));
  const ZAKAZ = /dodá stavba|dodá-li stavba/; const D2T = { cz: 'bez opláštění', en: 'Without cladding', de: 'Ohne Verkleidung', fr: 'Sans bardage' };
  const D2low = { cz: /bez opláštění/i, en: /without cladding/i, de: /ohne verkleidung/i, fr: /sans bardage/i };
  for (const Lg of ['cz', 'en', 'de', 'fr']) for (const typ of ['nabidka', 'sod']) { const t = await tiskni(pA, 'd2', typ, Lg); if (t == null) continue;
    if (typ === 'sod' && !/cetris|dvojsklo|vsg|insulating|isolierglas|double vitrage|double vitrage/i.test(t)) { L(`  INFO ${typ} ${Lg}: materiál opláštění neuvádí (dodá stavba=${ZAKAZ.test(t)})`); if (ZAKAZ.test(t)) V('D2.8 sod: „dodá stavba" nesmí být', false); continue; }
    V(`D2.8 ${typ} ${Lg}: „${D2T[Lg]}" je, „dodá stavba" není`, D2low[Lg].test(t) && !ZAKAZ.test(t), { je: D2low[Lg].test(t), stare: ZAKAZ.test(t) }); }
  for (const typ of typyDok.filter(t => /^kryci_/.test(t))) { const t = await tiskni(pA, 'd2', typ, 'cz'); if (t == null) continue;
    L(`  D2 ${typ} cz: bez opláštění=${/bez opláštění/i.test(t)} dodá stavba=${ZAKAZ.test(t)}`); if (ZAKAZ.test(t)) V(`D2.9 ${typ}: „dodá stavba" nesmí být`, false); }
  // náhled CN a specifikace na obrazovce
  const nahled = await E(() => { const out = {}; for (const id of [...document.querySelectorAll('[id^=page-]')].map(e => e.id.slice(5))) { try { prepniTab(id); render(); } catch (e) { continue; }
      const t = (document.getElementById('page-' + id) || {}).innerText || ''; if (/bez opláštění|dodá stavba/.test(t)) out[id] = { bez: /bez opláštění/.test(t), doda: /dodá stavba/.test(t), kontext: (t.match(/.{0,90}dodá stavba.{0,60}/g) || []).slice(0, 3) }; } prepniTab('kalk'); render(); return out; });
  V('D2.10 obrazovky (náhled CN, specifikace, …): „bez opláštění" ano, „dodá stavba" nikde', Object.keys(nahled).length > 0 && Object.entries(nahled).every(([id, x]) => !x.doda || (id === 'zakazka' && x.kontext.every(k => /^TEST · /.test(k)))), nahled);
  // ===== D4
  await E(() => { Z.prechodovePlechy = true; prepniTab('kalk'); render(); });
  const vol = await E(() => { const r = vypocetSachtyAkt(); const kat = serazSekci(r.volitelneKatalog, 'volitelne');
    return { klice: kat.map(x => x.key), radky: [...document.querySelectorAll('#page-kalk input.nazev-ed')].map(e => e.value).filter(t => /PŘECHOD/.test(t)), mat: (kat.find(x => x.key === 'prechodove') || {}) }; });
  const iM = vol.klice.indexOf('prechodove');
  V('D4.1 Volitelné: montáž hned pod materiálem', iM >= 0 && vol.klice[iM + 1] === 'prechMont', vol.klice.slice(0, 6));
  V('D4.2 materiál „PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)", pod ním montáž, klíč „PŘECHODOVÉ PLECHY - NEREZ"', vol.radky[0] === KLIC && /MONTÁŽ/.test(vol.radky[1] || '') && vol.mat.origNazev === 'PŘECHODOVÉ PLECHY - NEREZ', { radky: vol.radky, klic: vol.mat.origNazev });
  for (const Lg of ['cz', 'en']) { const t = await tiskni(pA, 'd4', 'nabidka', Lg); if (t == null) continue;
    L(`  D4 CN ${Lg}: (MATERIÁL)=${/PŘECHODOVÉ PLECHY - NEREZ \(MATERIÁL\)/.test(t)} česky PŘECHODOVÉ=${/PŘECHODOVÉ/.test(t)}`);
    if (Lg === 'en') V('D4.3 CN EN bez české „PŘECHODOVÉ"', !/PŘECHODOVÉ/.test(t)); }
  // starší přepis + dodatkový text pod dosavadním klíčem
  const d4s = await E(() => { const cBez = vypocetSachtyAkt().souhrn.zakladCena; Z.mnozstviPrepis = Object.assign({}, Z.mnozstviPrepis, { 'PŘECHODOVÉ PLECHY - NEREZ': 7 });
    cenikPopisNastav(C, 'PŘECHODOVÉ PLECHY - NEREZ', 'TEST DO starší dodatkový text'); render();
    const r = vypocetSachtyAkt(); const m = r.volitelneKatalog.find(x => x.key === 'prechodove') || {};
    const pole = [...document.querySelectorAll('#page-kalk input[type=text]')].find(e => (e.getAttribute('onchange') || '').indexOf("popisSet('PŘECHODOVÉ PLECHY - NEREZ'") === 0);
    return { mn: m.mnozstvi, prepsano: m.prepsano, nazev: m.nazev, popis: m.popis || null, pole: pole ? pole.value : null, zmenaCeny: r.souhrn.zakladCena !== cBez }; });
  V('D4.4 starší přepis množství (klíč bez „(MATERIÁL)") platí: 7, prepsáno, mění cenu', d4s.mn === 7 && d4s.prepsano && d4s.zmenaCeny, d4s);
  V('D4.5 starší dodatkový text pod dosavadním klíčem je u položky', d4s.pole === 'TEST DO starší dodatkový text' || d4s.popis === 'TEST DO starší dodatkový text', d4s);
  const t4s = await tiskni(pA, 'd4s', 'nabidka', 'cz'); L('  INFO D4 CN test: starší dodatkový text v CN', t4s ? /TEST DO starší dodatkový text/.test(t4s) : null);
  // příplatek jen materiál → jak se tiskne
  await E(() => { const pz = Z.prechodovePlechy; Z.prechodovePlechy = false; Z.priplatkyVynechat = ['prechMont']; render(); window.__pz = pz; });
  { const t = await tiskni(pA, 'd4p', 'nabidka', 'cz'); const t2 = await tiskni(pA, 'd4p', 'nabidka', 'en');
    L('  INFO D4 CN příplatek jen materiál: cz', t ? (t.match(/.{0,40}(PŘECHODOVÉ|Přechodové)[^\n]{0,60}\n[^\n]{0,60}/g) || []).map(x => x.replace(/\d[\d\s ]*/g, '#')) : null);
    L('  INFO D4 CN příplatek jen materiál: en česky?', t2 ? /PŘECHODOVÉ|Přechodové/.test(t2) : null); }
  await E(() => { Z.prechodovePlechy = window.__pz; Z.priplatkyVynechat = []; render(); });
  // cena main × test pro stav 9815 (D2 pásy, D4 plechy, přepis)
  const snap = await E(() => JSON.stringify(ZAK));
  await E(() => { delete Z.mnozstviPrepis['PŘECHODOVÉ PLECHY - NEREZ']; cenikPopisNastav(C, 'PŘECHODOVÉ PLECHY - NEREZ', ''); render(); });
  const snap2 = await E(() => JSON.stringify(ZAK));
  // ===== main (jen čtení): tatáž data, tatáž cena?
  const pM = await relace(b, MAIN, 'KNG_MAIN_EMAIL', 'KNG_MAIN_HESLO', false, zapM);
  const cenaZ = (p, s) => p.evaluate((s) => { ONLINE_STAV.soubor = ''; ZAK = JSON.parse(s); syncVarianta(); const r = vypocetSachtyAkt();
    return { zaklad: r.souhrn.zakladCena, souhrn: JSON.stringify(r.souhrn), pripl: (r.priplatky || []).map(x => x.naklad).join(','), vol: (r.volitelne || []).map(x => x.naklad).sort().join(',') }; }, s);
  L('verze main', await pM.evaluate(() => (document.body.innerText.match(/v\d+\.\d+\.\d+/) || [''])[0]));
  await definujT(pM); await pM.evaluate((s) => { ONLINE_STAV.soubor = ''; ZAK = JSON.parse(s); syncVarianta(); }, snap);
  { const t = await tiskni(pM, 'main_d4s', 'nabidka', 'cz'); L('  INFO D4 CN main (táž data): starší dodatkový text v CN', t ? /TEST DO starší dodatkový text/.test(t) : null);
    if (t && t4s) V('D4.6 CN test × main: dodatkový text se tiskne stejně', /TEST DO starší dodatkový text/.test(t) === /TEST DO starší dodatkový text/.test(t4s)); }
  for (const [n, s] of [['s přepisem', snap], ['bez přepisu', snap2]]) { const m = await cenaZ(pM, s), t = await cenaZ(pA, s);
    V(`D2/D4 cena main × test (${n}): základ, souhrn, příplatky, volitelné shodné`, m.zaklad === t.zaklad && m.souhrn === t.souhrn && m.pripl === t.pripl && m.vol === t.vol, { zaklad: m.zaklad === t.zaklad, souhrn: m.souhrn === t.souhrn, pripl: m.pripl === t.pripl, vol: m.vol === t.vol }); }
  await otevri(pA, '9815$');
  await E(() => { Z.prechodovePlechy = false; prepniTab('kalk'); render(); }); await uloz(pA, '9815 D4');
  // ===== D5 (klikání na obrazovce)
  const chk = () => E(() => { render(); const c = k => { const e = [...document.querySelectorAll('#page-kalk input[type=checkbox]')].find(x => (x.getAttribute('onchange') || '') === `priplatekNabidka('${k}', this.checked)`); return e ? e.checked : null; };
    return { mat: c('prechMat'), mont: c('prechMont'), vyn: ['prechMat', 'prechMont'].filter(k => (Z.priplatkyVynechat || []).includes(k)) }; });
  const klik = k => E(k => { [...document.querySelectorAll('#page-kalk input[type=checkbox]')].find(x => (x.getAttribute('onchange') || '') === `priplatekNabidka('${k}', this.checked)`).click(); }, k);
  await E(() => { Z.priplatkyVynechat = ['prechMat', 'prechMont']; render(); }); let c5 = await chk(); L('D5 výchozí', c5);
  const c5z = await cena(pA);
  await klik('prechMat'); c5 = await chk(); V('D5.1 zaškrtnutí materiálu zaškrtne i montáž', c5.mat === true && c5.mont === true, c5);
  await klik('prechMont'); c5 = await chk(); V('D5.2 montáž jde odškrtnout samostatně (materiál zůstane)', c5.mat === true && c5.mont === false, c5);
  await klik('prechMat'); c5 = await chk(); V('D5.3 odškrtnutí materiálu odškrtne obě', c5.mat === false && c5.mont === false, c5);
  await klik('prechMont'); c5 = await chk(); V('D5.4 montáž jde zaškrtnout bez materiálu', c5.mat === false && c5.mont === true, c5);
  await klik('prechMont'); await klik('prechMat'); c5 = await chk(); V('D5.5 materiál znovu → obě', c5.mat && c5.mont, c5);
  V('D5.6 základní cena se klikáním nezměnila', (await cena(pA)) === c5z);
  await uloz(pA, '9815 D5');
  // zamčená nabídka: cizí TEST zakázka se zamčenou variantou, jen čtení
  const pR = await relace(b, TEST, 'KNG_TEST_EMAIL', 'KNG_TEST_HESLO', false, zapR);
  const zam = await pR.evaluate(async () => { const kand = ONLINE_STAV.rejstrik.filter(z => /^TEST - /.test(z.cislo || '') && z.odeslane > 0 && !/OVP/.test(z.cislo));
    for (const z of kand.slice(0, 40)) { const d = await (await fetch('/api/zakazky?soubor=' + encodeURIComponent(z.soubor), { credentials: 'include' })).json(); const zk = d.zakazka || d.data || d;
      const v = (zk.varianty || []).find(v => v.zamek && v.zamek.zamceno && v.data && v.data.ock); if (!v) continue;
      ONLINE_STAV.soubor = ''; ZAK = zk; ZAK.aktivni = v.id; if (typeof prepniVariantu === 'function') try { prepniVariantu(v.id); } catch (e) {} syncVarianta(); prepniTab('kalk'); render();
      if (aktivniVarianta(ZAK) !== v || variantaEditovatelna(v)) continue;
      const pred = JSON.stringify(Z.priplatkyVynechat || []);
      const e = [...document.querySelectorAll('#page-kalk input[type=checkbox]')].find(x => (x.getAttribute('onchange') || '') === "priplatekNabidka('prechMat', this.checked)");
      if (e) e.click(); else try { priplatekNabidka('prechMat', !(Z.priplatkyVynechat || []).includes('prechMat') ? false : true); } catch (x) {}
      return { cislo: z.cislo, klikDOM: !!e, disabled: e ? e.disabled : null, beze: JSON.stringify(Z.priplatkyVynechat || []) === pred, hl: window.__hlBer() }; } return null; });
  V('D5.7 zamčená nabídka: klik na materiál nic nezmění', zam && zam.beze, zam);
  const pO = await relace(b, TEST, 'KNG_TEST_OBCHODNIK_EMAIL', 'KNG_TEST_OBCHODNIK_HESLO', true, zapO);
  L('obchodník admin?', await pO.evaluate(() => jeAdmin()));
  const d6 = async (KLIC, plechy, tag, kolo) => {
  // ===== D6 správce
  const orig = await E(async (k) => { const o = await (await fetch('/api/popisy', { credentials: 'include' })).json(); const p = o.popisy || {};
    return { text: (p.texty || {})[k] || '', jazyky: JSON.stringify((p.jazyky || {})[k] || null) }; }, KLIC);
  L(tag + ' D6 číselník před: text', orig.text ? 'neprázdný' : 'prázdný', 'překlady', orig.jazyky !== 'null');
  const radek = (p) => p.evaluate((k) => { prepniTab('kalk'); render(); const inp = [...document.querySelectorAll('#page-kalk input[type=text]')].find(e => (e.getAttribute('onchange') || '').indexOf("popisSet('" + k + "'") === 0);
    const td = inp && inp.parentElement; return { je: !!inp, jen: td ? ((td.querySelector('.popis-jen-zakazka') || {}).textContent || '').replace(/\s+/g, ' ').trim() : '', tlac: td ? !!td.querySelector('.popis-navrhnout') : false,
      navrzeno: td ? !!td.querySelector('.popis-navrzeno') : false, stav: td && td.querySelector('[data-popis-stav]') ? td.querySelector('[data-popis-stav]').textContent : null }; }, KLIC);
  await E(x => { Z.prechodovePlechy = x; prepniTab('kalk'); render(); }, plechy);
  let r6 = await radek(pA); V(tag + ' D6.1 správce: pole bez „jen pro tuto zakázku" a bez tlačítka', r6.je && !r6.jen && !r6.tlac && r6.stav === '', r6);
  await E(([k, t]) => { const inp = [...document.querySelectorAll('#page-kalk input[type=text]')].find(e => (e.getAttribute('onchange') || '').indexOf("popisSet('" + k + "'") === 0); inp.value = t; inp.dispatchEvent(new Event('change')); }, [KLIC, 'TEST DO věta správce ' + kolo]);
  await W(2500); const st1 = await E(k => { const e = [...document.querySelectorAll('[data-popis-stav]')].find(x => x.getAttribute('data-popis-stav') === k); return e ? e.textContent : null; }, KLIC);
  V(tag + ' D6.2 správce po uložení vidí „uloženo pro všechny nové zakázky"', st1 === 'uloženo pro všechny nové zakázky', st1);
  await W(4500); const st2 = await E(k => { const e = [...document.querySelectorAll('[data-popis-stav]')].find(x => x.getAttribute('data-popis-stav') === k); return e ? e.textContent : null; }, KLIC);
  V(tag + ' D6.3 hláška po chvíli zmizí', st2 === '', st2);
  const srv1 = await E(async k => ((((await (await fetch('/api/popisy', { credentials: 'include' })).json()).popisy || {}).texty || {})[k] || ''), KLIC);
  V(tag + ' D6.4 server: text je v číselníku', srv1 === 'TEST DO věta správce ' + kolo);
  const vrat = async (popis) => { await E(([k, t]) => onlinePopisUloz(k, t), [KLIC, orig.text]); await W(1500);
    const s = await E(async k => { const p = ((await (await fetch('/api/popisy', { credentials: 'include' })).json()).popisy || {}); return { text: (p.texty || {})[k] || '', jazyky: JSON.stringify((p.jazyky || {})[k] || null) }; }, KLIC);
    V(tag + ' D6 číselník vrácen (' + popis + ')', s.text === orig.text && s.jazyky === orig.jazyky); };
  await vrat('po správci'); await E(k => { cenikPopisNastav(C, k, ''); render(); }, KLIC); await uloz(pA, '9815 D6');
  // ===== D6 obchodník
  if (kolo === 1) { const uz16 = await pO.evaluate(c => ONLINE_STAV.rejstrik.some(z => z.cislo === c), C16);
  if (uz16) { await otevri(pO, '9816$'); L('9816 obnovení', await zaloz(pO, C16, true, true)); } else L('založení 9816 (obchodník)', await zaloz(pO, C16, false, true)); }
  await pO.evaluate(x => { window.__plechy = x; }, plechy); await pO.evaluate(k => { Z.prechodovePlechy = window.__plechy; Z.priplatkyVynechat = []; cenikPopisNastav(C, k, ''); const v = aktivniVarianta(ZAK); if (v.popisyNavrhy) delete v.popisyNavrhy[k]; render(); }, KLIC);
  await pO.evaluate(() => { const v = aktivniVarianta(ZAK); ZAK.adresa = ''; ZAK.nazevAkce = 'TEST DO – obchodník bez adresy'; });
  r6 = await radek(pO); V(tag + ' D6.5 obchodník: „jen pro tuto zakázku", bez vlastního textu bez tlačítka', /jen pro tuto zakázku/.test(r6.jen) && !r6.tlac, r6);
  const NAVRH = 'TEST DO návrh obchodníka 9816 ' + kolo;
  await pO.evaluate(([k, t]) => { const inp = [...document.querySelectorAll('#page-kalk input[type=text]')].find(e => (e.getAttribute('onchange') || '').indexOf("popisSet('" + k + "'") === 0); inp.value = t; inp.dispatchEvent(new Event('change')); }, [KLIC, NAVRH]);
  r6 = await radek(pO); V(tag + ' D6.6 obchodník s vlastním textem vidí „navrhnout do číselníku"', /jen pro tuto zakázku/.test(r6.jen) && r6.tlac, r6);
  await pO.evaluate((k) => { const inp = [...document.querySelectorAll('#page-kalk input[type=text]')].find(e => (e.getAttribute('onchange') || '').indexOf("popisSet('" + k + "'") === 0); inp.parentElement.querySelector('.popis-navrhnout').click(); }, KLIC); r6 = await radek(pO);
  const nv = await pO.evaluate(k => (aktivniVarianta(ZAK).popisyNavrhy || {})[k], KLIC);
  V(tag + ' D6.7 po kliku „navrženo do číselníku", návrh ve variantě', r6.navrzeno && !r6.tlac && nv === NAVRH, r6);
  await uloz(pO, '9816 obchodník návrh');
  const srvO = await E(async k => ((((await (await fetch('/api/popisy', { credentials: 'include' })).json()).popisy || {}).texty || {})[k] || ''), KLIC);
  V(tag + ' D6.8 obchodník číselník nezměnil', srvO === orig.text);
  // ===== D6 správce: číselník, štítek návrh, převzít
  await E(() => { prepniTab('cenik'); render(); }); await E(() => cenikPopisySber());
  await pA.waitForFunction(() => !POPISY_CIS.hleda, null, { timeout: 90000 });
  const sb = await E(([k, t]) => { const s = (POPISY_CIS.sber || {})[k] || []; const i = s.findIndex(x => x.text === t);
    const st = [...document.querySelectorAll('.popis-navrh-stitek')].map(e => e.closest('div') ? e.closest('div').textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : '');
    return { pocet: s.length, i, navrh: i >= 0 ? !!s[i].navrh : null, prvni: s[0] ? !!s[0].navrh : null, stitekDOM: st.some(x => x.includes(t)), btn: !!document.querySelector(`button[onclick^="cenikPopisPrevzit('${k}'"]`) }; }, [KLIC, NAVRH]);
  V(tag + ' D6.9 správce v Ceník → číselník vidí návrh se štítkem „návrh" (napřed) a tlačítko převzít', sb.i === 0 && sb.navrh && sb.stitekDOM && sb.btn, sb);
  await pA.screenshot({ path: OUT + '/d6_cenik.png', fullPage: false }).catch(() => {});
  if (sb.i >= 0) { await E(([k, i]) => cenikPopisPrevzit(k, i), [KLIC, sb.i]); await W(3000);
    const srv2 = await E(async k => ((((await (await fetch('/api/popisy', { credentials: 'include' })).json()).popisy || {}).texty || {})[k] || ''), KLIC);
    V(tag + ' D6.10 převzít: text návrhu je v číselníku', srv2 === NAVRH); }
  await vrat('po převzetí');
  await otevri(pA, '9815$'); await E(k => { cenikPopisNastav(C, k, ''); Z.prechodovePlechy = false; render(); }, KLIC); await uloz(pA, '9815 po D6');
  };
  await d6('PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)', false, '[příplatek MATERIÁL]', 1);
  await d6('PŘECHODOVÉ PLECHY - NEREZ', true, '[volitelné plechy]', 2);
  await pO.evaluate(() => { Z.prechodovePlechy = false; for (const k of ['PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)', 'PŘECHODOVÉ PLECHY - NEREZ']) cenikPopisNastav(C, k, '');
    const v = aktivniVarianta(ZAK); delete v.popisyNavrhy; v.upraveno = new Date().toISOString(); render(); }); await uloz(pO, '9816 konec (úklid textů a návrhů)');
  await E(() => cenikPopisySber()); await pA.waitForFunction(() => !POPISY_CIS.hleda, null, { timeout: 90000 });
  V('úklid: sběr nemá texty plechů z 9815/9816', await E(() => !Object.entries(POPISY_CIS.sber || {}).some(([k, sez]) => /PŘECHOD/.test(k) && sez.some(x => /981[56]/.test(x.cislo)))));
  // ===== D7
  await pO.waitForTimeout(500); await pO.evaluate(() => { if (typeof onlineRejstrikNacti === 'function') return onlineRejstrikNacti(); }).catch(() => {});
  await E(() => (typeof onlineRejstrikNacti === 'function') ? onlineRejstrikNacti() : null).catch(() => {}); await W(2500);
  const d7 = await E(([c15, c16]) => { const out = { dom: {} }; const z15 = ONLINE_STAV.rejstrik.find(z => z.cislo === c15), z16 = ONLINE_STAV.rejstrik.find(z => z.cislo === c16);
    const bunka = (html) => { const t = document.createElement('table'); t.innerHTML = html; const td = t.querySelectorAll('td')[1]; const a = td.querySelector('.rejstrik-akce');
      return { b: (td.querySelector('b') || {}).textContent, akce: a ? a.textContent : '', sedy: a ? a.style.color : '' }; };
    out.online15 = z15 ? bunka(onlineRadekZakazky(z15, false)) : null; out.online16 = z16 ? bunka(onlineRadekZakazky(z16, false)) : null;
    out.slozka15 = z15 && typeof ulozisteRadekHtml === 'function' ? bunka(ulozisteRadekHtml(Object.assign({ variant: 1 }, z15))) : null;
    for (const id of [...document.querySelectorAll('[id^=page-]')].map(e => e.id.slice(5))) { try { prepniTab(id); render(); } catch (e) { continue; }
      const tr = [...document.querySelectorAll('#page-' + id + ' tr')].find(r => r.cells && [...r.cells].some(c => c.textContent.trim() === c15));
      if (tr) { const td = [...tr.cells].find(c => c.querySelector('.rejstrik-hlavni')); if (!td) { out.dom[id] = 'bez .rejstrik-hlavni'; continue; } const a = td.querySelector('.rejstrik-akce'); out.dom[id] = { b: (td.querySelector('b') || {}).textContent, akce: a ? a.textContent : '', barva: a ? getComputedStyle(a).color : '', tucne: getComputedStyle(td.querySelector('b')).fontWeight }; } }
    prepniTab('kalk'); render(); return out; }, [C15, C16]);
  V('D7.1 online seznam: tučně adresa, pod ní šedě akce', d7.online15 && d7.online15.b === ADR && d7.online15.akce === AKCE && /107, 118, 134/.test(d7.online15.sedy), d7.online15);
  V('D7.2 seznam ve složce: totéž', d7.slozka15 && d7.slozka15.b === ADR && d7.slozka15.akce === AKCE, d7.slozka15);
  V('D7.3 v živé obrazovce (online seznam / Přehled CN) řádek 9815 adresa tučně + akce šedě', Object.keys(d7.dom).length > 0 && Object.values(d7.dom).every(x => x.b === ADR && x.akce === AKCE && /107, 118, 134/.test(x.barva)), d7.dom);
  V('D7.4 zakázka bez adresy: jen název akce tučně', d7.online16 ? (d7.online16.b === 'TEST DO – obchodník bez adresy' && !d7.online16.akce) : null, d7.online16);
  await pA.screenshot({ path: OUT + '/d7.png' }).catch(() => {});
  L('zápisy správce', [...new Set(zap)].join(', ')); L('zápisy obchodník', [...new Set(zapO)].join(', ')); L('main (blokováno)', zapM.join(', ') || '—'); L('čtení test (blokováno)', zapR.join(', ') || '—');
  L(`SOUHRN ${ok} OK, ${fail} FAIL`); fs.writeFileSync(OUT + '/log.txt', LOG.join('\n')); await b.close();
})().catch(e => { console.error('CHYBA', e.stack); fs.writeFileSync(OUT + '/log.txt', LOG.join('\n') + '\nCHYBA ' + e.message); process.exit(1); });
