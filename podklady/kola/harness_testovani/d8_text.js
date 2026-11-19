// D8 bod b (doplněk): lhůty, které text nabídky PROJ obsahuje (výstupy, DPZ, zaměření), Word i online náhled CZ/EN/DE/FR.
// Zápis: Firma → lhůty PROJ (na konci výchozí a zveřejněno). Zakázka D8_TEXT (rozpracovaná) se jen čte a tiskne bez zámku.
const { chromium } = require('playwright'); const fs = require('fs'); const { execSync } = require('child_process');
const OUT = process.env.OUT || '/tmp/d8t'; fs.mkdirSync(OUT, { recursive: true }); const C = 'TEST - 2026 - OVP - CN - ' + (process.env.D8_TEXT || '9820');
const LOG = []; const L = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); LOG.push(s); console.log(s); };
let ok = 0, fail = 0; const V = (id, pod, det) => { if (pod) ok++; else fail++; L((pod ? 'OK   ' : 'FAIL ') + id, det === undefined ? '' : det); };
const txt = f => execSync(`unzip -p "${f}" 'word/document.xml'`, { maxBuffer: 1 << 27 }).toString().replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '');
const zap = []; let P = null, ZMENA = false;
(async () => { const b = await chromium.launch(); const p = await b.newPage(); P = p;
  await p.route('**/*', async r => { const u = r.request().url(), m = r.request().method(), path = new URL(u).pathname; if (m === 'GET' || path === '/api/prihlaseni') return r.continue();
    if (!u.startsWith('https://testengscalc.netlify.app') || path !== '/api/firma' && path !== '/api/analytika') { zap.push('BLOK ' + m + ' ' + path); return r.abort(); }
    const resp = await r.fetch(); zap.push(m + ' ' + path + ' ' + resp.status()); return r.fulfill({ response: resp }); });
  const login = async () => { await p.waitForFunction(() => (document.querySelector('#onlineEmail') && document.querySelector('#onlineEmail').offsetParent) || (typeof ONLINE_STAV !== 'undefined' && (ONLINE_STAV.rejstrik || []).length > 50), null, { timeout: 90000 });
    if (await p.locator('#onlineEmail').isVisible().catch(() => false)) { await p.fill('#onlineEmail', process.env.KNG_TEST_EMAIL); await p.fill('#onlineHeslo', process.env.KNG_TEST_HESLO); await p.press('#onlineHeslo', 'Enter'); await p.waitForSelector('#prihlaseni-overlay', { state: 'hidden', timeout: 60000 }); }
    await p.waitForFunction(() => (ONLINE_STAV.rejstrik || []).length > 50, null, { timeout: 60000 }); await p.waitForTimeout(2500);
    await p.evaluate(() => { window.potvrd = async () => true; window.hlaska = () => {}; window.volba = async (t, m) => (m.find(x => x.kod === 'zahodit') || m[0]).kod; }); };
  await p.goto('https://testengscalc.netlify.app/', { waitUntil: 'domcontentloaded' }); await login();
  const E = (fn, a) => p.evaluate(fn, a);
  const otevri = async () => { const s = await E(c => ONLINE_STAV.rejstrik.find(z => z.cislo === c).soubor, C); for (let i = 0; i < 4; i++) { p.evaluate(x => onlineOtevri(x), s).catch(() => {}); if (await p.waitForFunction(c => ZAK.cislo === c, C, { timeout: 15000 }).then(() => 1, () => 0)) break; } await p.waitForTimeout(2500); };
  const snimek = async (tag) => { const out = {}; for (const Lg of ['cz', 'en', 'de', 'fr']) {
      const r = await E(async (Lg) => { const srv = await sablonaProTisk('nabidkaProj', Lg); const res = await dokumentVygeneruj('nabidkaProj', srv.data.slice(0), ZAK, aktivniVarianta(ZAK), JEKLY, Lg);
        const buf = new Uint8Array(await res.blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        /* online náhled (nabidkaProjNahled) kreslí bloky z nabidkaProjData — tytéž texty */
        const d = nabidkaProjData(ZAK, aktivniVarianta(ZAK), Lg); const nah = { bloky: JSON.stringify(d.bloky) };
        return { b64: btoa(s), nah }; }, Lg);
      const f = `${OUT}/${tag}_${Lg}.docx`; fs.writeFileSync(f, Buffer.from(r.b64, 'base64')); out[Lg] = { word: txt(f), nah: r.nah }; } return out; };
  const s0 = await E(() => ({ shoda: onlineFirmaShoda().shodne, lh: NAST.firma.lhutyProj === undefined })); L('start', s0); if (!s0.shoda || !s0.lh) throw new Error('Firma není výchozí/shodná');
  await otevri(); const A = await snimek('v0');
  L('náhled obsahuje termíny v záložkách', Object.fromEntries(Object.entries(A).map(([l, x]) => [l, Object.keys(x.nah)])));
  ZMENA = true; await E(() => { lhutyUiSet('zamereni', 'do', '5'); lhutyUiSet('vystupy', 'od', '5'); lhutyUiSet('vystupy', 'do', '7'); lhutyUiSet('dpz', 'do', '14'); });
  L('zveřejnění', await E(() => onlineZverejniFirmu(true))); await p.reload({ waitUntil: 'domcontentloaded' }); await login();
  L('po F5 online', await E(() => JSON.stringify((ONLINE_STAV.firma.udaje.lhutyProj || {}).radky)));
  await otevri(); const B = await snimek('v1');
  const NOVE = { cz: [/ZAMĚŘENÍ na stavbě do 5 týdnů/, /VÝSTUPŮ do 5–7 týdnů/, /do 10–14 týdnů od schválení studie/], en: [/SURVEY within 5 weeks/, /OUTPUTS within 5–7 weeks/, /10–14 weeks/],
    de: [/innerhalb von 5 Wochen/, /ERGEBNISSE innerhalb von 5–7 Wochen/, /10–14 Wochen/], fr: [/dans les 5 semaines/, /LIVRABLES dans les 5 à 7 semaines/, /10 à 14 semaines/] };
  const zpet = t => t.replace(/(ZAMĚŘENÍ na stavbě do |SURVEY within |AUFMASS vor Ort innerhalb von |RELEVÉ sur site dans les )5\b/g, '$14')
    .replace(/5–7/g, '4–6').replace(/5 à 7/g, '4 à 6').replace(/10–14/g, '10–12').replace(/10 à 14/g, '10 à 12');
  for (const Lg of ['cz', 'en', 'de', 'fr']) {
    const w = B[Lg].word; const chyb = NOVE[Lg].filter(re => !re.test(w)).map(String);
    const rozd = w.split('\n').filter((l, i) => l !== A[Lg].word.split('\n')[i]);
    V(`b1 Word ${Lg}: zaměření 5, výstupy 5–7, DPZ 10–14; jiný text beze změny`, !chyb.length && zpet(w) === A[Lg].word, { chybi: chyb, zmenene: rozd.map(x => x.slice(0, 110)) });
    const n1 = Object.values(B[Lg].nah).join('\n'), n0 = Object.values(A[Lg].nah).join('\n');
    V(`b2 online náhled ${Lg}: totéž`, n0.length > 0 && NOVE[Lg].every(re => re.test(n1)) && zpet(n1) === n0, { zalozky: Object.keys(B[Lg].nah), chybi: NOVE[Lg].filter(re => !re.test(n1)).map(String) }); }
  await E(() => firmaSet('lhutyProj', undefined)); const zv = await E(() => onlineZverejniFirmu(true)); await p.waitForTimeout(2000);
  const kon = await E(() => ({ online: ONLINE_STAV.firma.udaje.lhutyProj === undefined, shoda: onlineFirmaShoda().shodne })); ZMENA = !(zv && kon.online);
  V('výchozí lhůty vráceny a zveřejněny', zv && kon.online && kon.shoda, kon);
  await otevri(); const C2 = await snimek('v2'); V('text po návratu = výchozí (CZ/EN/DE/FR)', ['cz', 'en', 'de', 'fr'].every(l => C2[l].word === A[l].word));
  L('zápisy', [...new Set(zap)].join(', ')); L(`SOUHRN ${ok} OK, ${fail} FAIL`); fs.writeFileSync(OUT + '/log.txt', LOG.join('\n')); await b.close();
})().catch(async e => { console.error('CHYBA', e.stack); if (ZMENA && P) { try { L('POJISTKA', await P.evaluate(async () => { firmaSet('lhutyProj', undefined); return [await onlineZverejniFirmu(true), ONLINE_STAV.firma.udaje.lhutyProj === undefined]; })); } catch (x) { L('POJISTKA SELHALA — VRÁTIT RUČNĚ', x.message); } }
  fs.writeFileSync(OUT + '/log.txt', LOG.join('\n') + '\nCHYBA ' + e.message); process.exit(1); });
