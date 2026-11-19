// Zkouška D8 (#677) na TESTU — lhůty PROJ (Firma), text nabídky PROJ, krycí list PROJ po Prodáno, náhled Pipedrive.
// Zápis jen TEST OVP 9817 (prodej) / 9818 (text) a dočasně Firma → lhůty PROJ (na konci výchozí a zveřejněno).
// Pipedrive: jen POST /api/pd/nanecisto (suchý běh, nic nezapisuje), ostatní /api/pd* blokováno.
// Spuštění z kořene repa: OUT=<složka> node podklady/kola/harness_testovani/d8.js
const { chromium } = require('playwright'); const fs = require('fs'); const { execSync } = require('child_process');
const OUT = process.env.OUT || '/tmp/d8'; fs.mkdirSync(OUT, { recursive: true });
const LOG = []; const L = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); LOG.push(s); console.log(s); };
let ok = 0, fail = 0; const V = (id, pod, det) => { if (pod) ok++; else fail++; L((pod ? 'OK   ' : 'FAIL ') + id, det === undefined ? '' : det); };
const TEST = 'https://testengscalc.netlify.app/';
const C17 = 'TEST - 2026 - OVP - CN - ' + (process.env.D8_PRODEJ || '9817'), C18 = 'TEST - 2026 - OVP - CN - ' + (process.env.D8_TEXT || '9818');
const POLE = ['terminZahajeni', 'terminZamereni', 'terminStudie', 'terminDpz', 'terminPovoleni', 'terminDps'];
const txtDocx = f => execSync(`unzip -p "${f}" 'word/document.xml' 2>/dev/null || true`, { maxBuffer: 1 << 27 }).toString()
  .replace(/<w:tab\/>/g, ' ').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '');
const zap = []; let PAGE = null, FIRMA_ZMENENA = false;
async function prihlas(p) {
  if (await p.locator('#onlineEmail').isVisible().catch(() => false)) {
    await p.fill('#onlineEmail', process.env.KNG_TEST_EMAIL); await p.fill('#onlineHeslo', process.env.KNG_TEST_HESLO); await p.press('#onlineHeslo', 'Enter');
    await p.waitForSelector('#prihlaseni-overlay', { state: 'hidden', timeout: 60000 }); }
  await p.waitForFunction(() => typeof ONLINE_STAV !== 'undefined' && (ONLINE_STAV.rejstrik || []).length > 50, null, { timeout: 60000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { window.__hl = []; window.potvrd = async (t) => { window.__hl.push('POTVRĎ: ' + String(t).replace(/\s+/g, ' ').slice(0, 140)); return true; };
    window.hlaska = (t) => { window.__hl.push('HLÁŠKA: ' + String(t).replace(/\s+/g, ' ').slice(0, 200)); };
    window.volba = async (t, moz) => { window.__hl.push('VOLBA: ' + String(t).replace(/\s+/g, ' ').slice(0, 100)); return (moz || []).some(m => m.kod === 'zahodit') ? 'zahodit' : ((moz || [])[0] || {}).kod; };
    window.dotaz = async (t) => { window.__hl.push('DOTAZ: ' + String(t).slice(0, 100)); return null; };
    if (typeof onlineZprava === 'function') { const oz = window.onlineZprava; window.onlineZprava = function (t, k) { window.__hl.push('ZPRÁVA ' + (k || '') + ': ' + String(t).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').slice(0, 160)); return oz.apply(this, arguments); }; }
    window.__hlBer = () => { const x = window.__hl; window.__hl = []; return x; }; });
}
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1500, height: 1000 } }); const p = await ctx.newPage(); PAGE = p;
  await p.route('**/*', async r => { const u = r.request().url(), m = r.request().method(); if (m === 'GET') return r.continue();
    const path = new URL(u).pathname; if (path === '/api/prihlaseni') return r.continue();
    if (!u.startsWith(TEST) || (/\/api\/pd/.test(path) && path !== '/api/pd/nanecisto')) { zap.push('BLOK ' + m + ' ' + path); return r.abort(); }
    let telo = ''; try { telo = r.request().postData() || ''; } catch (e) {}
    if (path === '/api/pd/nanecisto' && /"dealId"\s*:\s*"?\d/.test(telo)) { zap.push('BLOK nanecisto s dealId'); return r.abort(); }
    const resp = await r.fetch(); let tx = ''; try { tx = (await resp.text()).slice(0, 300); } catch (e) {}
    zap.push(m + ' ' + path + ' ' + resp.status()); if (resp.status() >= 400) zap.push('  ODPOVĚĎ ' + tx.replace(/[\w.+-]+@[\w.-]+/g, '<email>').slice(0, 200)); return r.fulfill({ response: resp }); });
  p.on('download', d => d.saveAs(OUT + '/dl_' + d.suggestedFilename().replace(/[^\w.-]/g, '_')).catch(() => {}));
  await p.goto(TEST, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#onlineEmail', { timeout: 60000 }); await prihlas(p);
  const E = (fn, arg) => p.evaluate(fn, arg); const W = ms => p.waitForTimeout(ms);
  const F5 = async () => { await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => (document.querySelector('#onlineEmail') && document.querySelector('#onlineEmail').offsetParent) || (typeof ONLINE_STAV !== 'undefined' && (ONLINE_STAV.rejstrik || []).length > 50), null, { timeout: 90000 }); await W(2000); await prihlas(p); await definujT(); };
  const definujT = () => E(() => { window.T = async (typ, Lg) => { const v = aktivniVarianta(ZAK); let sab = null;
      if (/^(sod|sodProj|plnaMoc|nabidka|nabidkaProj)$/.test(typ)) { const srv = await sablonaProTisk(typ, Lg || 'cz'); if (!srv) return { stop: 'bez šablony' }; sab = srv.data.slice(0); }
      try { const res = await dokumentVygeneruj(typ, sab, ZAK, v, JEKLY, Lg || 'cz'); const buf = new Uint8Array(await res.blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        return { nazev: res.nazevSouboru, b64: btoa(s) }; } catch (e) { return { stop: 'chyba: ' + e.message }; } }; });
  await definujT();
  const tiskni = async (krok, typ, Lg) => { const r = await E(([t, l]) => T(t, l), [typ, Lg]); const f = `${OUT}/${krok}_${typ}_${Lg}.docx`;
    if (!r.b64) { L('  tisk', krok, typ, Lg, 'STOP ' + r.stop); return null; } fs.writeFileSync(f, Buffer.from(r.b64, 'base64')); const t = txtDocx(f); fs.writeFileSync(f + '.txt', t); return t; };
  const otevri = async (cislo) => { const s = await E(c => (ONLINE_STAV.rejstrik.find(z => z.cislo === c) || {}).soubor, cislo); if (!s) return null;
    for (let i = 1; i <= 4; i++) { p.evaluate(x => { try { onlineOtevri(x); } catch (e) {} }, s).catch(() => {});
      if (await p.waitForFunction(c => typeof ZAK !== 'undefined' && ZAK.cislo === c, cislo, { timeout: 15000 }).then(() => true, () => false)) break; }
    await W(3000); if (await E(() => ZAK.cislo) !== cislo) throw new Error('neotevřeno ' + cislo);
    if (await E(() => typeof zamekCteniJe === 'function' && zamekCteniJe())) await E(() => zamekCteniOdemkniUI()); return s; };
  const uloz = async (popis) => { const n = zap.length; const r = await E(async () => { const x = await onlineUloz(); return x; }); await W(3000);
    const st = zap.slice(n).filter(x => /\/api\/zakazky/.test(x)); L('uložení', popis, { ok: r, http: st, hl: (await E(() => window.__hlBer())).filter(x => !/Uloženo online/.test(x)).slice(0, 3) }); return { ok: r, http: st }; };
  // ---------- výchozí stav Firmy
  const f0 = await E(() => ({ shoda: onlineFirmaShoda().shodne, rozdily: onlineFirmaShoda().rozdily, lokal: NAST.firma && NAST.firma.lhutyProj !== undefined ? JSON.stringify(NAST.firma.lhutyProj) : null,
    online: ONLINE_STAV.firma && ONLINE_STAV.firma.udaje && ONLINE_STAV.firma.udaje.lhutyProj !== undefined ? JSON.stringify(ONLINE_STAV.firma.udaje.lhutyProj) : null, verze: (document.body.innerText.match(/v\d+\.\d+\.\d+/) || [''])[0] }));
  L('start', f0); if (!f0.shoda) throw new Error('Firma lokálně ≠ online — zveřejnění by poslalo cizí rozdíly, zastavuji');
  // ---------- zakázky
  const zaloz = (cislo) => E(async (cislo) => { const z = ONLINE_STAV.rejstrik.find(z => /7650 - K29-N50/.test(z.cislo));
    const d = await (await fetch('/api/zakazky?soubor=' + encodeURIComponent(z.soubor), { credentials: 'include' })).json(); const zk = d.zakazka || d;
    const v0 = zk.varianty.find(x => x.id === zk.aktivni) || zk.varianty[0]; const kop = JSON.parse(JSON.stringify(v0.data));
    ZAK = novaZakazka(); syncVarianta(); ONLINE_STAV.soubor = ''; ONLINE_STAV.razitko = ''; ONLINE_STAV.posledni = '';
    Object.assign(ZAK, { cislo, nazevAkce: 'TEST D8 – lhůty PROJ', adresa: 'Zkušební 18, 100 00 Praha', objednatel: 'TEST D8 s.r.o.', jenProj: !!zk.jenProj, jenOck: !!zk.jenOck });
    const v = aktivniVarianta(ZAK); for (const k of Object.keys(kop)) if (!/sleva/.test(k)) v.data[k] = kop[k];
    if (v.data.kryciProj) { v.data.kryciProj.hodnoty = {}; delete v.data.kryciProj.lhutyProj; } syncVarianta(); render();
    return { cislo: ZAK.cislo, jenProj: ZAK.jenProj, zamcena: !!(v.zamek && v.zamek.zamceno) }; }, cislo);
  for (const c of [C17, C18]) { if (await E(c => ONLINE_STAV.rejstrik.some(z => z.cislo === c), c)) throw new Error(c + ' už existuje — zvol D8_PRODEJ/D8_TEXT');
    L('založení', await zaloz(c)); await uloz(c + ' založení'); }
  // ---------- texty (výchozí tabulka)
  const JAZ = ['cz', 'en', 'de', 'fr'];
  const nahledProj = (Lg) => E((Lg) => { tiskJazykNastav(Lg); const out = {}; for (const id of ['proj', 'detailproj']) { try { prepniTab(id); render(); } catch (e) { continue; }
      out[id] = ((document.getElementById('page-' + id) || {}).innerText || '').split('\n').filter(l => /týdn|měsíc|week|month|Woche|Monat|semaine|mois/i.test(l)).join('\n'); }
    tiskJazykNastav('cz'); prepniTab('kryciproj'); render(); return out; }, Lg);
  await otevri(C18); const B0 = {}, N0 = {};
  for (const Lg of JAZ) { B0[Lg] = await tiskni('t0', 'nabidkaProj', Lg); N0[Lg] = await nahledProj(Lg); }
  L('výchozí termíny CZ (Word)', (B0.cz || '').split('\n').filter(l => /týdn|měsíc/.test(l)).slice(0, 8));
  // ---------- 9817: odeslaná nabídka (tisk Word cestou tlačítka → zámek)
  await otevri(C17);
  await E(() => { tiskJazykNastav('cz'); nabidkaProjWord(); }); await W(10000); await uloz(C17 + ' po tisku CN');
  const zam = await E(() => { const v = aktivniVarianta(ZAK); return { zamceno: !!(v.zamek && v.zamek.zamceno), cislo: v.zamek && v.zamek.cislo }; }); V('c0 9817 odeslaná (zamčená) po tisku CN', zam.zamceno, zam);
  const L0 = await tiskni('o0', 'nabidkaProj', 'cz');
  const klTerminy = () => E((POLE) => { prepniTab('kryciproj'); render(); const pg = document.getElementById('page-kryciproj'); const out = {};
    for (const id of POLE) { const inp = [...pg.querySelectorAll('input')].find(e => (e.getAttribute('onchange') || '').indexOf("klpSet('" + id + "'") === 0); const row = inp && inp.closest('.kl-row');
      out[id] = { hodnota: inp ? inp.value : null, zdroj: row ? (row.querySelector('.src') || {}).textContent.replace(/\s+/g, ' ').trim() : null, reset: !!(row && row.querySelector('button[onclick^="klpReset"]')) }; }
    const sek = [...pg.querySelectorAll('*')].filter(e => e.children.length === 0 && /Prodáno|prodeji|podpis/.test(e.textContent) && /termín|Termín|dopočít/.test(e.textContent)).map(e => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 200));
    return { pole: out, poznamka: [...new Set(sek)].slice(0, 3) }; }, POLE);
  let k0 = await klTerminy();
  V('c1 před Prodáno termíny prázdné', POLE.every(id => k0.pole[id].hodnota === ''), Object.fromEntries(POLE.map(id => [id, k0.pole[id].hodnota])));
  V('c1 před Prodáno poznámka u termínů', POLE.every(id => /dopočte se po prodeji/.test(k0.pole[id].zdroj || '')), k0.pole.terminStudie.zdroj);
  L('  zdroje před Prodáno', Object.fromEntries(POLE.map(id => [id, k0.pole[id].zdroj])));
  // ---------- a) Firma → lhůty PROJ
  FIRMA_ZMENENA = true;
  await E(() => { lhutyUiSet('zamereni', 'do', '5'); lhutyUiSet('studie', 'do', '14'); });
  const ka = await E(() => { const h = lhutyProjKarta(); return { varovani: /⚠[^<]*zveřejnit to nejde/.test(h), lze: firmaLzeZverejnit(NAST.firma).ok, t: JSON.stringify(NAST.firma.lhutyProj.radky) }; });
  V('a1 změna lhůt (zaměření 5, studie 10–14) bez varování, jde zveřejnit', !ka.varovani && ka.lze, ka);
  let n = zap.length; const zv = await E(() => onlineZverejniFirmu(true)); await W(2500);
  V('a2 zveřejnění firmy prošlo', zv === true && zap.slice(n).some(x => /POST \/api\/firma 200/.test(x)), zap.slice(n));
  await F5();
  const po5 = await E(() => { const t = NAST.firma.lhutyProj || {}; const o = (ONLINE_STAV.firma.udaje || {}).lhutyProj || {}; const h = lhutyProjKarta();
    const d = document.createElement('div'); d.innerHTML = h; const inp = [...d.querySelectorAll('input')].filter(e => /lhutyUiSet\('studie', 'do'/.test(e.getAttribute('onchange') || ''));
    return { lokal: t.radky && t.radky.studie, online: o.radky && o.radky.studie, zam: o.radky && o.radky.zamereni, pole: inp[0] ? inp[0].value : null }; });
  V('a3 po F5 hodnota drží (Firma i online kopie, pole „do" studie = 14)', po5.lokal && po5.lokal.do === 14 && po5.online && po5.online.do === 14 && po5.zam.do === 5 && po5.pole === '14', po5);
  await E(() => lhutyUiSet('studie', 'od', '15'));
  const kv = await E(() => { const h = lhutyProjKarta(); const m = h.match(/⚠([^<]*)zveřejnit to nejde/); return { varovani: m ? m[1].replace(/\s+/g, ' ').trim() : null, lze: firmaLzeZverejnit(NAST.firma) }; });
  V('a4 vadné rozpětí (od 15 > do 14) ukáže varování', !!kv.varovani, kv.varovani);
  n = zap.length; const zv2 = await E(() => onlineZverejniFirmu(true)); await W(1500);
  V('a5 vadné rozpětí nejde zveřejnit (bez POST /api/firma)', zv2 === false && !kv.lze.ok && !zap.slice(n).some(x => /\/api\/firma/.test(x)), { zv2, duvod: (kv.lze.duvod || '').slice(0, 120), hl: (await E(() => window.__hlBer())).slice(-1) });
  await E(() => lhutyUiSet('studie', 'od', '10')); V('a6 po opravě zase jde zveřejnit / shoda s online', await E(() => firmaLzeZverejnit(NAST.firma).ok));
  // ---------- b) texty po změně
  await otevri(C18);
  const zpet = (t, Lg) => t.replace(/10–14/g, '10–12').replace(/10-14/g, '10-12')
    .replace(/(ZAMĚŘENÍ na stavbě do |SURVEY within |AUFMASS vor Ort innerhalb von |RELEVÉ sur site dans les )5\b/g, '$14');
  for (const Lg of JAZ) { const t = await tiskni('t1', 'nabidkaProj', Lg); if (t == null || B0[Lg] == null) continue;
    const ma = /10[–-]14/.test(t) && /(ZAMĚŘENÍ na stavbě do |SURVEY within |AUFMASS vor Ort innerhalb von |RELEVÉ sur site dans les )5\b/.test(t);
    const rozdil = t.split('\n').filter((l, i) => l !== B0[Lg].split('\n')[i]).slice(0, 4);
    V(`b1 Word ${Lg}: čísla z tabulky (5 t, 10–14 t), jinak text beze změny`, ma && zpet(t, Lg) === B0[Lg], { ma, rozdil }); }
  for (const Lg of JAZ) { const n1 = await nahledProj(Lg); const s1 = JSON.stringify(n1), s0 = JSON.stringify(N0[Lg]);
    V(`b2 online náhled ${Lg}: čísla z tabulky, jinak beze změny`, /10[–-]14/.test(s1) && zpet(s1, Lg) === s0, { ukazka: (Object.values(n1).join('\n').split('\n').filter(l => /14|5 /.test(l)).slice(0, 2)) }); }
  await otevri(C17); const L1 = await tiskni('o1', 'nabidkaProj', 'cz');
  V('b3 odeslaná nabídka (9817) po změně tabulky drží stará čísla (Word = při odeslání)', L1 != null && L1 === L0 && /10[–-]12/.test(L1), { stejne: L1 === L0 });
  // ---------- c) Prodáno
  n = zap.length;
  await E(() => { prepniTab('kryciproj'); render(); const bt = [...document.querySelectorAll('#page-kryciproj button')].find(x => /prodejUiProdej/.test(x.getAttribute('onclick') || '')); if (!bt) throw new Error('tlačítko Prodáno nenalezeno'); bt.click(); });
  await W(9000);
  const pr = await E(() => { const v = aktivniVarianta(ZAK); return { prodano: !!v.prodano, datum: v.prodano && v.prodano.datum, snimek: JSON.stringify(((v.data.kryciProj || {}).lhutyProj || {}).radky || null) }; });
  const httpP = zap.slice(n).filter(x => /\/api\/(zakazky|pd)/.test(x)); L('Prodáno', { prodano: pr.prodano, http: httpP, hl: (await E(() => window.__hlBer())).slice(0, 4) });
  V('c2 Prodáno uloženo bez 409', pr.prodano && httpP.some(x => /POST \/api\/zakazky 200/.test(x)) && !httpP.some(x => / 409/.test(x)), httpP);
  V('c3 snímek lhůt ve variantě = tabulka při prodeji (studie do 14, zaměření 5)', /"studie":\{"od":10,"do":14\}/.test(pr.snimek) && /"zamereni":\{"do":5\}/.test(pr.snimek), pr.snimek);
  const k1 = await klTerminy(); L('  KL po Prodáno', k1.pole);
  V('c4 po Prodáno termíny dopočtené, u každého zdroj („podpis + …")', POLE.filter(id => k1.pole[id].hodnota).length >= 3 && POLE.every(id => !k1.pole[id].hodnota || /podpis|\+/.test(k1.pole[id].zdroj || '')) && k1.pole.terminZahajeni.hodnota === pr.datum,
    Object.fromEntries(POLE.map(id => [id, (k1.pole[id].hodnota || '—') + ' | ' + k1.pole[id].zdroj])));
  // ruční přepis
  const RUCNE = '2027-06-30';
  await E(([id, d]) => { const inp = [...document.querySelectorAll('#page-kryciproj input')].find(e => (e.getAttribute('onchange') || '').indexOf("klpSet('" + id + "'") === 0); inp.value = d; inp.dispatchEvent(new Event('change')); }, ['terminDpz', RUCNE]);
  const k2 = await klTerminy(); L('  KL po ručním DPZ', Object.fromEntries(POLE.map(id => [id, (k2.pole[id].hodnota || '—') + ' | ' + k2.pole[id].zdroj])));
  const u2 = await uloz(C17 + ' ruční termín DPZ');
  V('c5 uložení ručního termínu bez 409', u2.ok === true && u2.http.every(x => !/ 409/.test(x)), u2.http);
  await F5(); await otevri(C17); const k3 = await klTerminy();
  V('c6 ruční termín přežije uložení i F5 (pole „ručně", tlačítko ↺)', k3.pole.terminDpz.hodnota === RUCNE && k3.pole.terminDpz.reset, k3.pole.terminDpz);
  await E(() => { const bt = [...document.querySelectorAll('#page-kryciproj button')].find(x => /klpReset\('terminDpz'/.test(x.getAttribute('onclick') || '')); bt.click(); });
  const k4 = await klTerminy();
  V('c7 ↺ vrátí dopočet', k4.pole.terminDpz.hodnota === k1.pole.terminDpz.hodnota && !k4.pole.terminDpz.reset, { pred: k1.pole.terminDpz, po: k4.pole.terminDpz });
  const u4 = await uloz(C17 + ' po ↺'); V('c8 uložení po ↺ bez 409', u4.ok === true && u4.http.every(x => !/ 409/.test(x)), u4.http);
  // d) Pipedrive náhled (suchý běh)
  n = zap.length; const pd = await E(async () => { const okk = await pdnUiSpust(); const d = PDN_UI.data || {};
    return { ok: okk, rezim: d.rezim, chyba: PDN_UI.chyba, radky: (d.radky || []).filter(r => /termin|Termín|Odevzdání|Předání výstupů|povolení|podpis/i.test(JSON.stringify(r))).map(r => JSON.stringify(r).slice(0, 220)) }; });
  L('d Pipedrive suchý běh', { ok: pd.ok, rezim: pd.rezim, chyba: pd.chyba, http: zap.slice(n) }); pd.radky.forEach(r => L('   ', r));
  const kd = await klTerminy(); const datumy = POLE.map(id => kd.pole[id].hodnota).filter(Boolean);
  const vRadcich = datumy.filter(dt => { const [y, m, d] = dt.split('-'); return pd.radky.some(r => r.includes(dt) || r.includes(`${+d}. ${+m}. ${y}`) || r.includes(`${d}.${m}.${y}`)); });
  V('d1 náhled Pipedrive nese po Prodáno dopočtené termíny', pd.ok && datumy.length > 0 && vRadcich.length === datumy.length, { datumy, nalezeno: vRadcich, rezim: pd.rezim });
  // ---------- a7 výchozí tabulka + zveřejnit; c9 prodaná zakázka beze změny
  await E(() => lhutyUiVychozi()); await W(800); n = zap.length; const zv3 = await E(() => onlineZverejniFirmu(true)); await W(2500);
  const kon = await E(() => ({ lokal: NAST.firma.lhutyProj === undefined, online: !ONLINE_STAV.firma.udaje || ONLINE_STAV.firma.udaje.lhutyProj === undefined, shoda: onlineFirmaShoda().shodne }));
  FIRMA_ZMENENA = !(zv3 === true && kon.online);
  V('a7 výchozí tabulka vrácena a zveřejněna', zv3 === true && kon.lokal && kon.online && kon.shoda && zap.slice(n).some(x => /POST \/api\/firma 200/.test(x)), kon);
  await F5(); await otevri(C17); const k5 = await klTerminy();
  V('c9 změna tabulky (zpět na výchozí) prodanou zakázku nezmění', POLE.every(id => k5.pole[id].hodnota === k4.pole[id].hodnota), Object.fromEntries(POLE.map(id => [id, [k4.pole[id].hodnota, k5.pole[id].hodnota]])));
  await otevri(C18); const t2 = await tiskni('t2', 'nabidkaProj', 'cz'); V('a8 nabídka 9818 po návratu = výchozí text', t2 === B0.cz);
  L('zápisy', [...new Set(zap.filter(x => !/ODPOVĚĎ/.test(x)))].join(', ')); zap.filter(x => /ODPOVĚĎ/.test(x)).forEach(x => L(x));
  L(`SOUHRN ${ok} OK, ${fail} FAIL`); fs.writeFileSync(OUT + '/log.txt', LOG.join('\n')); await b.close();
})().catch(async e => { console.error('CHYBA', e.stack);
  if (FIRMA_ZMENENA && PAGE) { try { const r = await PAGE.evaluate(async () => { firmaSet('lhutyProj', undefined); const ok = await onlineZverejniFirmu(true);
      return { ok, online: !ONLINE_STAV.firma.udaje || ONLINE_STAV.firma.udaje.lhutyProj === undefined }; }); L('POJISTKA: výchozí lhůty zveřejněny', r); } catch (x) { L('POJISTKA SELHALA — VRÁTIT LHŮTY RUČNĚ', x.message); } }
  fs.writeFileSync(OUT + '/log.txt', LOG.join('\n') + '\nCHYBA ' + e.message); process.exit(1); });
