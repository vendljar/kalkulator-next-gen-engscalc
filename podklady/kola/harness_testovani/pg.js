// Zkouška PG (#684–#687) na TESTU v19.11.11 (cda289e). Jen čtení: zápisy blokované (GET + POST /api/prihlaseni),
// úpravy zakázek jen v paměti (klony zamčených variant). Pipedrive blokováno (vše mimo GET; /api/pd* i GET).
// Spuštění z kořene repa: OUT=<složka> node podklady/kola/harness_testovani/pg.js
const { chromium } = require('playwright'); const fs = require('fs'); const { execSync } = require('child_process');
const OUT = process.env.OUT || '/tmp/pg'; fs.mkdirSync(OUT, { recursive: true });
const LOG = []; const L = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); LOG.push(s); console.log(s); };
let ok = 0, fail = 0; const V = (id, pod, det) => { if (pod) ok++; else fail++; L((pod ? 'OK   ' : 'FAIL ') + id, det === undefined ? '' : det); };
const R1 = 'TEST PG RADEK NENI', H1 = 'Dodavka TEST PG neni soucasti', R2 = 'TEST PG RADEK DALSI', H2 = 'Ujednani TEST PG zustava';
const P1 = 'TEST PG UJEDNANI PROJ', PH1 = 'Text ujednani TEST PG', P2 = 'TEST PG JEN POPISEK';
const txtDocx = f => execSync(`unzip -p "${f}" 'word/document.xml' 2>/dev/null || true`, { maxBuffer: 1 << 27 }).toString()
  .replace(/<w:tab\/>/g, ' ').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '');
const pocet = (t, s) => t.split(s).length - 1;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1400, height: 950 }, acceptDownloads: true }); const p = await ctx.newPage(); const blok = [];
  await ctx.route('**/*', r => { const m = r.request().method(), u = r.request().url(), path = new URL(u).pathname;
    if (/^\/api\/pd/.test(path)) { blok.push(m + ' ' + path); return r.abort(); }
    if (m === 'GET' || path === '/api/prihlaseni') return r.continue(); blok.push(m + ' ' + path); return r.abort(); });
  p.on('pageerror', e => L('pageerror', e.message.slice(0, 160)));
  await p.goto('https://testengscalc.netlify.app/', { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#onlineEmail', { timeout: 60000 });
  await p.fill('#onlineEmail', process.env.KNG_TEST_EMAIL); await p.fill('#onlineHeslo', process.env.KNG_TEST_HESLO); await p.press('#onlineHeslo', 'Enter');
  await p.waitForSelector('#prihlaseni-overlay', { state: 'hidden', timeout: 60000 }); await p.waitForFunction(() => (ONLINE_STAV.rejstrik || []).length > 100, null, { timeout: 60000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { if (typeof onlineAutoPrepni === 'function') onlineAutoPrepni(false); window.__hl = []; window.potvrd = async (t) => { window.__hl.push('POTVRĎ: ' + String(t).slice(0, 160)); return true; };
    window.hlaska = (t) => { window.__hl.push('HLÁŠKA: ' + String(t).replace(/\s+/g, ' ').slice(0, 220)); }; window.__hlBer = () => { const x = window.__hl; window.__hl = []; return x; };
    window.volba = async (t, m) => (m.find(x => x.kod === 'zahodit') || m[0]).kod; window.nabidkaVarianta = async () => aktivniVarianta(ZAK); });
  const E = (fn, a) => p.evaluate(fn, a); const W = ms => p.waitForTimeout(ms);
  L('verze', await E(() => (document.body.innerText.match(/v\d+\.\d+\.\d+/) || [''])[0]), 'admin', await E(() => jeAdmin()));
  const otevri = async (re) => { const s = await E(r => ONLINE_STAV.rejstrik.find(z => new RegExp(r).test(z.cislo)).soubor, re);
    for (let i = 0; i < 4; i++) { p.evaluate(x => onlineOtevri(x), s).catch(() => {}); if (await p.waitForFunction(r => new RegExp(r).test(ZAK.cislo || ''), re, { timeout: 15000 }).then(() => 1, () => 0)) break; }
    await W(2500); await E(() => { if (typeof zamekCteniJe === 'function' && zamekCteniJe()) zamekCteniOdemkniUI(); }); };
  const okno = async (spust, Lg, cekej) => { const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 30000 }), E(([fn, Lg]) => { tiskJazykNastav(Lg); window[fn](); }, [spust, Lg])]);
    await pop.waitForLoadState('load'); if (cekej) await pop.waitForFunction(() => /^\d+$/.test((document.getElementById('nwPocetStran') || {}).textContent || ''), null, { timeout: 30000 }); await pop.waitForTimeout(1200);
    const t = await pop.evaluate((cekej) => cekej ? [...document.querySelectorAll('#nwStranky .nw-telo')].map(x => x.innerText).join('\n') : document.body.innerText, cekej); await pop.close(); return t; };
  const word = async (typ, Lg, tag) => { const r = await E(async ([typ, Lg]) => { const srv = await sablonaProTisk(typ, Lg); const v = aktivniVarianta(ZAK); const vt = vzTiskVstup(typ, v, () => {}) || { zak: ZAK, varianta: v };
      const res = await dokumentVygeneruj(typ, srv.data.slice(0), vt.zak, vt.varianta, JEKLY, Lg); const buf = new Uint8Array(await res.blob.arrayBuffer()); let x = ''; for (let k = 0; k < buf.length; k += 0x8000) x += String.fromCharCode.apply(null, buf.subarray(k, k + 0x8000));
      return { b64: btoa(x), sablona: srv.nazev, verze: srv.verze }; }, [typ, Lg]);
    const f = `${OUT}/${tag}.docx`; fs.writeFileSync(f, Buffer.from(r.b64, 'base64')); const t = txtDocx(f); fs.writeFileSync(`${OUT}/${tag}.txt`, t); return { t, verze: r.verze, sablona: r.sablona }; };
  // pořadí v textu: NENÍ-nadpis < PŘÍSTUP < R1 < DALŠÍ-nadpis < R2, R1/R2 jednou
  const poradi = (t, H) => { const iN = t.indexOf(H.neni), iP = t.indexOf(H.pristup, iN), i1 = t.indexOf(R1), iD = t.indexOf(H.dalsi, iN), i2 = t.indexOf(R2);
    return { ok: iN >= 0 && iN < iP && iP < i1 && i1 < iD && iD < i2 && pocet(t, R1) === 1 && pocet(t, R2) === 1, iN, iP, i1, iD, i2, r1x: pocet(t, R1), r2x: pocet(t, R2), dalsiX: pocet(t.slice(iN), H.dalsi),
      mezi: iP >= 0 && iD >= 0 ? t.slice(iP, iD).replace(/\s+/g, ' ').slice(0, 260) : '' }; };
  const hdr = Lg => E(Lg => { const P = t => Lg === 'cz' ? t : tr(t, Lg); return { neni: P('SOUČÁSTÍ DODÁVKY NENÍ'), dalsi: P('DALŠÍ UJEDNÁNÍ'), pristup: P('DOSTATEČNÉ PŘÍSTUPOVÉ A MANIPULAČNÍ PROSTORY') }; }, Lg);
  const vysl = {};

  // ===== 0) starší zakázky s vlastními řádky (sken TEST zakázek, jen GET)
  vysl.stare = await E(async () => { const out = []; const tz = ONLINE_STAV.rejstrik.filter(z => /^TEST - /.test(z.cislo || ''));
    for (const z of tz) { try { const o = await onlineApi('/api/zakazky?soubor=' + encodeURIComponent(z.soubor)); for (const v of (o.zakazka.varianty || [])) { const ex = (v.data && v.data.techspec && v.data.techspec.extra) || [];
      if (ex.length) out.push({ cislo: z.cislo, varianta: v.nazev, radku: ex.length, sekce: ex.map(e => e.sekce || '-'), zamcena: !!(v.zamek && v.zamek.zamceno) }); } } catch (e) {} }
    return { prohledano: tz.length, nalez: out }; });
  L('starší zakázky s techspec.extra', vysl.stare);

  // ===== A) 9603: tlačítka, zábrana
  await otevri('9603 - K19T-C103');
  L('9603 příprava', await E(() => { const v0 = aktivniVarianta(ZAK); const z0 = !!(v0.zamek && v0.zamek.zamceno); window.__orig = v0.id; klonujVariantu(ZAK, v0.id); syncVarianta(); TS.extra = []; prepniTab('spec'); render(); const v = aktivniVarianta(ZAK); return { puvodniZamcena: z0, klon: v.nazev, zamcena: !!(v.zamek && v.zamek.zamceno) }; }));
  const tlac = () => E(() => { const b = [...document.querySelectorAll('#page-spec .btns button')].filter(x => /Kompletní náhled|Vytvořit nabídku \(Word\)/.test(x.textContent));
    return b.map(x => ({ t: x.textContent.trim(), primary: x.classList.contains('primary'), disabled: x.disabled, title: (x.title || '').slice(0, 140) })); });
  const t0 = await tlac(); L('tlačítka', t0);
  V('A1 pořadí tlačítek zleva', t0.map(x => x.t).join(' | ') === 'Kompletní náhled podkladů | Vytvořit nabídku (Word) | Kompletní náhled a tisk nabídky', t0.map(x => x.t));
  V('A2 Word modrý (primary), ostatní bez barvy', t0.length === 3 && !t0[0].primary && t0[1].primary && !t0[2].primary, t0.map(x => x.primary));
  V('A3 bez zábrany vše aktivní', t0.every(x => !x.disabled), t0.map(x => x.disabled));
  const pozn = await E(() => (([...document.querySelectorAll('#page-spec .note')].find(n => /pořadí práce/.test(n.textContent)) || {}).textContent || '').replace(/\s+/g, ' ').trim());
  V('A4 poznámka pod tlačítky', /zleva v pořadí práce/.test(pozn), pozn.slice(0, 200));
  const zz = await E(() => { const zal = Z.zdvih; Z.zdvih = 120; render(); const z = dokumentZabrana('nabidka', aktivniVarianta(ZAK)) || '', zt = dokumentZabrana('nabidkaTisk', aktivniVarianta(ZAK)) || ''; window.__zalZdvih = zal; return { zdvihPred: zal, zabrana: z.slice(0, 200), zabranaTisk: zt.slice(0, 200) }; });
  const t1 = await tlac(); L('zábrana zdvih 120', zz, t1);
  V('A5 zdvih 120 m: Word i tisk zhasnuté, náhled podkladů aktivní', t1.length === 3 && !t1[0].disabled && t1[1].disabled && t1[2].disabled, t1.map(x => ({ t: x.t, d: x.disabled, title: x.title })));
  const npZab = await okno('nabidkaNahled', 'cz', true).then(t => ({ otevreno: true, delka: t.length }), e => ({ otevreno: false, chyba: e.message.slice(0, 100) }));
  V('A6 náhled podkladů se zábranou jde otevřít', npZab.otevreno, npZab);
  await E(() => { Z.zdvih = window.__zalZdvih; render(); }); const t2 = await tlac(); V('A7 po vrácení zdvihu zase aktivní', t2.every(x => !x.disabled), t2.map(x => x.disabled));

  // ===== B) vlastní řádky: přidat 2 klikem na obrazovce, vyplnit, první přepnout na NENÍ
  const pridej = async () => { await p.locator('#page-spec button', { hasText: '+ přidat vlastní řádek' }).click(); await W(300); };
  await pridej(); await pridej();
  const radekEx = i => p.locator('#page-spec .spec-row:has(select.tsExtraSekce)').nth(i);
  const vypln = async (i, lbl, hod) => { let r = radekEx(i); await r.locator('input').nth(0).fill(lbl); await r.locator('input').nth(0).dispatchEvent('change'); await W(200);
    r = radekEx(i); await r.locator('input').nth(1).fill(hod); await r.locator('input').nth(1).dispatchEvent('change'); await W(200); };
  await vypln(0, R1, H1); await vypln(1, R2, H2);
  const volbySel = await radekEx(0).locator('select.tsExtraSekce option').allTextContents();
  await radekEx(0).locator('select.tsExtraSekce').selectOption('neni'); await W(400);
  const ex = await E(() => TS.extra); L('TS.extra', ex);
  V('B1 volba sekce na obrazovce, data sekce=neni jen u přepnutého', volbySel.join('|') === 'DALŠÍ UJEDNÁNÍ|SOUČÁSTÍ DODÁVKY NENÍ' && ex.length === 2 && ex[0].sekce === 'neni' && !('sekce' in ex[1]), { volbySel, ex });
  const obr = await E(() => { const out = []; let sek = ''; document.querySelectorAll('#page-spec .spec-doc > h3, #page-spec .spec-doc > .spec-row').forEach(n => {
      if (n.tagName === 'H3') { sek = n.textContent.trim(); out.push('#' + sek); return; } const inp = n.querySelector('.lbl input'); out.push((inp ? inp.value : n.querySelector('.lbl').textContent).trim()); }); return out; });
  const iN = obr.indexOf('#SOUČÁSTÍ DODÁVKY NENÍ'), iNx = obr.findIndex((x, i) => i > iN && x.startsWith('#')), iD = obr.indexOf('#DALŠÍ UJEDNÁNÍ');
  const sekN = obr.slice(iN + 1, iNx), sekD = iD >= 0 ? obr.slice(iD + 1, obr.findIndex((x, i) => i > iD && x.startsWith('#')) >>> 0) : [];
  V('B2 obrazovka: R1 poslední v SOUČÁSTÍ DODÁVKY NENÍ, R2 v DALŠÍ UJEDNÁNÍ', sekN[sekN.length - 1] === R1 && sekD.indexOf(R2) >= 0 && sekD.indexOf(R1) < 0 && pocet(obr.join('\n'), R1) === 1, { sekN: sekN.slice(-3), sekD, poradiSekci: obr.filter(x => x.startsWith('#')).slice(-4) });
  // náhled překladu (renderTechspecPreklad) EN
  const obrEn = await E(() => { jazykSet('en'); render(); const t = document.querySelector('#page-spec .spec-doc').innerText; jazykSet('cz'); render(); return t; }).catch(e => 'chyba ' + e.message);
  const Hen = await hdr('en'); const Hcz = await hdr('cz');
  if (!/^chyba/.test(obrEn)) { const o = poradi(obrEn, Hen); V('B3 obrazovka EN (náhled překladu)', o.ok, o); } else L('B3 obrazovka EN přeskočeno', obrEn);
  for (const Lg of ['cz', 'en']) { const H = Lg === 'cz' ? Hcz : Hen;
    const tt = await okno('nabidkaOckDokument', Lg, false); fs.writeFileSync(`${OUT}/b_tisk_${Lg}.txt`, tt); const o1 = poradi(tt, H); V(`B4 Kompletní náhled a tisk ${Lg.toUpperCase()}`, o1.ok, o1);
    const tn = await okno('nabidkaNahled', Lg, true); fs.writeFileSync(`${OUT}/b_nahled_${Lg}.txt`, tn); const o2 = poradi(tn, H); V(`B5 náhled podkladů (nabidkaNahled) ${Lg.toUpperCase()}`, o2.ok, o2);
    const w = await word('nabidka', Lg, `b_word_${Lg}`); const o3 = poradi(w.t, H); V(`B6 Word CN ${Lg.toUpperCase()} (${w.sablona} v${w.verze})`, o3.ok, o3); }
  L('hlášky', await E(() => window.__hlBer()));
  // starší stav: řádky bez pole sekce = vše v DALŠÍ UJEDNÁNÍ (dosavadní chování)
  await E(() => { TS.extra = [{ label: 'TEST PG RADEK DALSI', hodnota: 'Ujednani TEST PG zustava' }, { label: 'TEST PG STARY DRUHY', hodnota: 'bez pole sekce' }]; render(); });
  { const w = await word('nabidka', 'cz', 'b_word_stary'); const iN = w.t.indexOf(Hcz.neni), iD = w.t.indexOf(Hcz.dalsi, iN); const okS = iD > iN && w.t.indexOf(R2) > iD && w.t.indexOf('TEST PG STARY DRUHY') > iD;
    const tn = await okno('nabidkaNahled', 'cz', true); const jN = tn.indexOf(Hcz.neni), jD = tn.indexOf(Hcz.dalsi, jN);
    const sel = await E(() => [...document.querySelectorAll('#page-spec select.tsExtraSekce')].map(s => s.value)); const ex2 = await E(() => TS.extra.map(e => Object.keys(e).join(',')));
    V('B7 řádky bez pole sekce (starší stav): Word i náhled v DALŠÍ UJEDNÁNÍ, volba ukazuje DALŠÍ, klíč sekce nevznikne', okS && jD > jN && tn.indexOf(R2) > jD && tn.indexOf('TEST PG STARY DRUHY') > jD && sel.every(x => x === 'dalsi') && ex2.every(k => k === 'label,hodnota'), { okS, sel, ex2 }); }

  // ===== B víc šachet: 9949-K49 varianta 2
  await otevri('9949 - K49');
  L('9949 příprava', await E(() => { const v0 = ZAK.varianty.find(x => (x.data.ock.dalsi || []).length) || aktivniVarianta(ZAK); ZAK.aktivni = v0.id; syncVarianta(); const z0 = !!(v0.zamek && v0.zamek.zamceno);
    if (z0) { klonujVariantu(ZAK, v0.id); syncVarianta(); } TS.extra = [{ label: 'TEST PG RADEK NENI', hodnota: 'Dodavka TEST PG neni soucasti', sekce: 'neni' }, { label: 'TEST PG RADEK DALSI', hodnota: 'Ujednani TEST PG zustava' }];
    prepniTab('spec'); render(); const v = aktivniVarianta(ZAK); return { puvodni: v0.nazev, zamcena: z0, aktivni: v.nazev, sachet: 1 + (v.data.ock.dalsi || []).length }; }));
  { const obr2 = await E(() => document.querySelector('#page-spec .spec-doc').innerText); const o = poradi(obr2.replace(/\n/g, ' '), Hcz);
    const vals = await E(() => [...document.querySelectorAll('#page-spec .spec-row:has(select.tsExtraSekce) .lbl input')].map(i => i.value));
    const sek = await E(() => { const out = []; document.querySelectorAll('#page-spec .spec-doc > h3, #page-spec .spec-doc > .spec-row').forEach(n => { if (n.tagName === 'H3') out.push('#' + n.textContent.trim()); else { const i = n.querySelector('.lbl input'); if (i && /TEST PG/.test(i.value)) out.push(i.value); } }); return out.filter((x, i, a) => !x.startsWith('#') || (a[i + 1] && !a[i + 1].startsWith('#'))); });
    V('B8 víc šachet: obrazovka (R1 za NENÍ, R2 v DALŠÍ)', sek.join('|') === '#SOUČÁSTÍ DODÁVKY NENÍ|' + R1 + '|#DALŠÍ UJEDNÁNÍ|' + R2, { sek, vals }); }
  for (const Lg of ['cz', 'en']) { const H = Lg === 'cz' ? Hcz : Hen;
    const tt = await okno('nabidkaOckDokument', Lg, false); fs.writeFileSync(`${OUT}/vs_tisk_${Lg}.txt`, tt); const o1 = poradi(tt, H); V(`B9 víc šachet Kompletní náhled a tisk ${Lg.toUpperCase()}`, o1.ok, o1);
    const tn = await okno('nabidkaNahled', Lg, true); fs.writeFileSync(`${OUT}/vs_nahled_${Lg}.txt`, tn); const o2 = poradi(tn, H); V(`B10 víc šachet náhled podkladů ${Lg.toUpperCase()}`, o2.ok, o2);
    const w = await word('nabidka', Lg, `vs_word_${Lg}`); const o3 = poradi(w.t, H); V(`B11 víc šachet Word ${Lg.toUpperCase()} (v${w.verze})`, o3.ok, Object.assign(o3, { neniX: pocet(w.t, H.neni) })); }
  // jen řádek NENÍ (žádný DALŠÍ): Word bez pruhu DALŠÍ UJEDNÁNÍ, náhled podkladů má mít totéž
  await E(() => { TS.extra = [{ label: 'TEST PG RADEK NENI', hodnota: 'Dodavka TEST PG neni soucasti', sekce: 'neni' }]; render(); });
  { const w = await word('nabidka', 'cz', 'vs_word_jen_neni'); const tn = await okno('nabidkaNahled', 'cz', true); fs.writeFileSync(`${OUT}/vs_nahled_jen_neni.txt`, tn);
    const iNw = w.t.indexOf(Hcz.neni), iNn = tn.indexOf(Hcz.neni);
    const r = { wordDalsi: pocet(w.t.slice(iNw), Hcz.dalsi), wordR1: pocet(w.t, R1), nahledDalsi: pocet(tn.slice(iNn), Hcz.dalsi), nahledR1: pocet(tn, R1) };
    V('B12 víc šachet, jen řádek NENÍ: Word bez pruhu DALŠÍ UJEDNÁNÍ, řádek 1×', r.wordDalsi === 0 && r.wordR1 === 1, r);
    V('B13 víc šachet, jen řádek NENÍ: náhled podkladů = Word (bez pruhu DALŠÍ UJEDNÁNÍ, řádek 1×)', r.nahledDalsi === 0 && r.nahledR1 === 1, r); }
  L('hlášky', await E(() => window.__hlBer()));

  // ===== C) PROJ DALŠÍ UJEDNÁNÍ — 9820
  await otevri('OVP - CN - 9820');
  L('9820 příprava', await E(() => { const v0 = aktivniVarianta(ZAK); const z0 = !!(v0.zamek && v0.zamek.zamceno); if (z0) { klonujVariantu(ZAK, v0.id); syncVarianta(); }
    prepniTab('proj'); render(); const v = aktivniVarianta(ZAK); return { cislo: ZAK.cislo.replace(/\d{4}$/, '####'), varianta: v.nazev, puvodniZamcena: z0, varianty: ZAK.varianty.map(x => ({ n: x.nazev, z: !!(x.zamek && x.zamek.zamceno) })), dalsi: PJ.dalsiUjednani || null }; }));
  const tlP = await p.locator('#projDalsiPridej').count(); V('C0 tlačítko „+ přidat vlastní řádek" v kartě Cenová nabídka (PROJ)', tlP >= 1, { pocet: tlP, text: tlP ? await p.locator('#projDalsiPridej').first().textContent() : '' });
  await p.locator('#projDalsiPridej').first().click(); await W(300); await p.locator('#projDalsiPridej').first().click(); await W(300);
  const pr = i => p.locator('#projDalsiUjednani tr').nth(i);
  const vyplnP = async (i, k, val) => { const inp = pr(i).locator('input').nth(k); await inp.fill(val); await inp.dispatchEvent('change'); await W(250); };
  await vyplnP(0, 0, P1); await vyplnP(0, 1, PH1); await vyplnP(1, 0, P2);
  const pj = await E(() => PJ.dalsiUjednani); V('C1 dva řádky v PJ.dalsiUjednani, druhý jen popisek', pj.length === 2 && pj[0].label === P1 && pj[0].hodnota === PH1 && pj[1].label === P2 && pj[1].hodnota === '', pj);
  const bl = await E(() => nabidkaProjData(ZAK, aktivniVarianta(ZAK), 'cz').bloky.map(b => b.nadpis || b.typ));
  const iDU = bl.indexOf('DALŠÍ UJEDNÁNÍ'); const predDU = bl.slice(0, iDU).filter(x => x !== 'pozn'); V('C2 blok DALŠÍ UJEDNÁNÍ hned za termíny (a jejich poznámkou) v datech náhledu', iDU > 0 && /TERMÍN/i.test(predDU[predDU.length - 1] || ''), bl.slice(Math.max(0, iDU - 2), iDU + 2));
  const tp = await okno('nabidkaProjNahled', 'cz', false); fs.writeFileSync(`${OUT}/c_nahled_cz.txt`, tp);
  { const i1 = tp.indexOf(P1), iD = tp.lastIndexOf('DALŠÍ UJEDNÁNÍ', i1), iT = tp.lastIndexOf('TERMÍNY', iD), i2 = tp.indexOf(P2), za = tp.slice(iD, iD + 120).replace(/\s+/g, ' '), pred = tp.slice(iT, iD).replace(/\s+/g, ' ').slice(-160), poDU = tp.slice(i2, i2 + 120).replace(/\s+/g, ' ');
    V('C3 online náhled PROJ: DALŠÍ UJEDNÁNÍ za termíny, oba řádky (i jen popisek)', iT >= 0 && iT < iD && iD < i1 && i1 < i2 && tp.indexOf(PH1) > i1, { iT, iD, i1, i2, za, pred, poDU: poDU.replace(/\s+/g, ' ') }); }
  const tpe = await okno('nabidkaProjNahled', 'en', false); fs.writeFileSync(`${OUT}/c_nahled_en.txt`, tpe);
  { const nd = await E(() => tr('DALŠÍ UJEDNÁNÍ', 'en')); V('C3b online náhled PROJ EN: nadpis přeložený, řádky', tpe.indexOf(nd) >= 0 && tpe.indexOf(P1) > tpe.indexOf(nd) && tpe.indexOf(P2) > 0, { nd }); }
  const wp = await word('nabidkaProj', 'cz', 'c_word_cz');
  V(`C4 Word PROJ se šablonou ${wp.sablona} v${wp.verze}: vznikne, bez vlastních řádků`, wp.t.length > 1000 && pocet(wp.t, P1) === 0 && pocet(wp.t, P2) === 0 && !/\{\{PROJ_DALSI/.test(wp.t), { verze: wp.verze, P1: pocet(wp.t, P1), symbol: /\{\{PROJ_DALSI/.test(wp.t), delka: wp.t.length });
  await E(() => { tiskJazykNastav('cz'); render(); kontrolyStavAkt(); }); await W(4000); await E(() => render()); await W(800);
  const ko = await E(() => { const s = kontrolyStavAkt(); const n = (s.nalezy || []).find(x => x.kod === 'dalsiUjednaniWordProj'); const panel = [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && /neuvede DALŠÍ UJEDNÁNÍ|pro ně nemá místo/.test(e.textContent)).map(e => e.textContent.trim().slice(0, 300));
    return { nalez: n ? { text: n.text, zabrana: !!n.zabrana, typ: n.typ || n.uroven || '' } : null, panel: panel.slice(0, 2), kody: s.kody }; });
  V('C5 kontrola před nabídkou: varování dalsiUjednaniWordProj (ne zábrana)', !!ko.nalez && !ko.nalez.zabrana, ko);
  V('C5b zábrana Wordu PROJ se nezapne', !(await E(() => dokumentZabrana('nabidkaProj', aktivniVarianta(ZAK)) || '')), await E(() => dokumentZabrana('nabidkaProj', aktivniVarianta(ZAK)) || ''));
  // zamčená varianta: najít v 9820, jinak 9603 (zamčené varianty)
  let zamek = await E(() => { const v = ZAK.varianty.find(x => x.zamek && x.zamek.zamceno); if (!v) return null; ZAK.aktivni = v.id; syncVarianta(); prepniTab('proj'); render(); return { zak: '9820', varianta: v.nazev }; });
  if (!zamek) { await otevri('9603 - K19T-C103'); zamek = await E(() => { const v = ZAK.varianty.find(x => x.zamek && x.zamek.zamceno); ZAK.aktivni = v.id; syncVarianta(); prepniTab('proj'); render(); return { zak: '9603', varianta: v.nazev, dalsi: PJ.dalsiUjednani || null }; }); }
  await E(() => window.__hlBer()); const zamId = await E(() => aktivniVarianta(ZAK).id); const varPred = await E(() => ZAK.varianty.length);
  { await p.locator('#projDalsiPridej').first().scrollIntoViewIfNeeded(); await W(500);
    const real = await p.locator('#projDalsiPridej').first().click({ timeout: 5000 }).then(() => 'kliknuto', e => 'klik myší nešel: ' + e.message.split('\n').find(x => /intercepts/.test(x)) || ''); L('C6 klik myší', real); await W(600); await E(() => window.__hlBer());
    await E(id => { ZAK.aktivni = id; syncVarianta(); prepniTab('proj'); render(); }, zamId); }
  { const pred = await E(() => JSON.stringify(PJ.dalsiUjednani || null)); const btn = p.locator('#projDalsiPridej').first(); const ma = await btn.count();
    const stav = ma ? await btn.evaluate(b => { const r = b.getBoundingClientRect(); const nad = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { disabled: b.disabled, viditelne: !!b.offsetParent, nahore: nad === b ? 'tlačítko' : (nad ? nad.tagName + '.' + nad.className + ' ' + (nad.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80) + (nad.closest('[style*="sticky"], .lista, .kontroly-lista') ? ' (v plovoucí liště)' : '') : null), zamekPanel: !!document.querySelector('.zamek-panel, .zamceno-panel') }; }) : null;
    if (ma && !stav.disabled) { await btn.evaluate(b => b.click()); await W(600); }
    const inp = await E(() => [...document.querySelectorAll('#projDalsiUjednani input')].map(i => i.disabled || i.readOnly));
    const po = await E(() => JSON.stringify(PJ.dalsiUjednani || null)); const hl = await E(() => window.__hlBer());
    const zamPo = await E(id => { const v = ZAK.varianty.find(x => x.id === id); return { dalsi: JSON.stringify(v.data.proj.zadani.dalsiUjednani || null), aktivniJinaVarianta: aktivniVarianta(ZAK).id !== id, variant: ZAK.varianty.length }; }, zamId);
    L('C6 po pokusu', zamPo, 'variant před', varPred);
    V('C6 zamčená varianta: řádky nejdou přidat (zámek nabídne klon, zamčená beze změny)', zamPo.dalsi === pred && hl.some(x => /je uzamčená/.test(x)), { zamek, tlacitko: stav, inputyZamcene: inp, pred, po, hl }); }

  // ===== D) průvodce šablon: dnešní CN
  const d = await E(async () => { const s = await onlineSablonaStahni('nabidka'); await sablPruvodceStart('nabidka', { nazev: s.nazev, data: s.data.slice(0) });
    const k = SABL_UI.pruvodce && SABL_UI.pruvodce.kontrola; const html = typeof sablPruvodceHtml === 'function' ? sablPruvodceHtml() : ''; const tmp = document.createElement('div'); tmp.innerHTML = html; const txt = tmp.innerText || tmp.textContent;
    const r = { sablona: s.nazev, verze: s.verze, varovani: k ? k.varovani : null, chyby: k ? k.chyby : null, html: (txt.match(/Číslo stránky[^\n]*/) || [''])[0].slice(0, 300) }; sablPruvodceZrus(); return r; });
  V(`D1 průvodce šablon CN (${d.sablona}, verze ${d.verze}): upozornění „číslo stránky je pevný text"`, (d.varovani || []).some(x => /Číslo stránky je pevný text/.test(x)) && /pevný text/.test(d.html) && !(d.chyby || []).some(x => /stránk/.test(x)), d);

  L('blokováno', [...new Set(blok)]); L(`SOUHRN ${ok} OK, ${fail} FAIL`);
  fs.writeFileSync(OUT + '/log.txt', LOG.join('\n')); await b.close();
})().catch(e => { console.error('CHYBA', e.stack); fs.writeFileSync(OUT + '/log.txt', LOG.join('\n')); process.exit(1); });
