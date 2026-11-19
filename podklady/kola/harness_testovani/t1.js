// T1 na TESTU (zápis jen TEST VZ – T1, Pipedrive blokováno). Jako admin; obchodník v druhé relaci.
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = '/tmp/claude-0/sp/t1'; const LOG = []; const L = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); LOG.push(s); console.log(s); };
const CISLO = 'TEST - 2026 - OPR - CN - 9812', AKCE = 'TEST VZ – T1';
async function relace(b, envE, envH, zapisy) {
  const ctx = await b.newContext({ acceptDownloads: true }); const p = await ctx.newPage();
  await p.route('**/*', r => { const u = r.request().url(), m = r.request().method(); if (m === 'GET') return r.continue();
    if (!u.startsWith('https://testengscalc.netlify.app')) { zapisy.push('BLOK mimo'); return r.abort(); }
    const path = new URL(u).pathname; if (/\/api\/pd/.test(path)) { zapisy.push('BLOK ' + m + ' ' + path); return r.abort(); }
    zapisy.push(m + ' ' + path); return r.continue(); });
  p.on('download', d => d.saveAs(OUT + '/dl_' + d.suggestedFilename().replace(/[^\w.-]/g, '_')).catch(() => {}));
  await p.goto('https://testengscalc.netlify.app/', { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#onlineEmail', { timeout: 60000 });
  await p.fill('#onlineEmail', process.env[envE]); await p.fill('#onlineHeslo', process.env[envH]); await p.press('#onlineHeslo', 'Enter');
  await p.waitForSelector('#prihlaseni-overlay', { state: 'hidden', timeout: 60000 });
  await p.waitForFunction(() => (ONLINE_STAV.rejstrik || []).length > 100, null, { timeout: 60000 });
  await p.evaluate(() => { window.__hl = []; window.__odpoved = true; window.potvrd = async (t) => { window.__hl.push('POTVRĎ: ' + String(t).replace(/\s+/g, ' ').slice(0, 200)); return window.__odpoved; };
    window.hlaska = (t) => { window.__hl.push('HLÁŠKA: ' + String(t).replace(/\s+/g, ' ').slice(0, 260)); }; window.__hlBer = () => { const x = window.__hl; window.__hl = []; return x; }; });
  return p;
}
(async () => {
  const b = await chromium.launch(); const zapisy = []; const p = await relace(b, 'KNG_TEST_EMAIL', 'KNG_TEST_HESLO', zapisy);
  const E = (fn, arg) => p.evaluate(fn, arg); const W = ms => p.waitForTimeout(ms);
  const otevri = async (s) => { await Promise.race([E(x => onlineOtevri(x), s), new Promise(r => setTimeout(r, 15000))]); await W(3000); };
  const hlav = () => E(() => { render(); const rv = document.querySelector('.vz-t1-rv'), rz = document.querySelector('.vz-t1-rz'); const sel = document.getElementById('vzT1Rz');
    return { rv: !!rv, rz: !!rz, rzZamek: !!(sel && sel.disabled), rzPill: rz ? rz.querySelector('.pill') && rz.querySelector('.pill').textContent : '', rzVolby: sel ? [...sel.options].map(o => o.text) : [],
      rvVolby: document.getElementById('vzT1Rv') ? [...document.getElementById('vzT1Rv').options].map(o => o.text) : [], org: (document.querySelector('.vz-t1-org') || {}).textContent || '',
      ridici: typeof vzZakaznik === 'function' && vzRezimUI() ? vzNazevZ(vzZakaznik(ZAK, vzRidiciId(ZAK))) + ' / ' + (vzVarianta(vzRidiciVariantaId(ZAK)) || {}).nazev : '' }; });
  const uloz = async (popis) => { const ok = await E(() => onlineUloz()); await W(3500); const r = { ok, hl: await E(() => window.__hlBer()) }; L('uložení', popis, r); return r; };
  const vyp0 = await E(() => viceZakaznikuZapnuto()); L('vypínač na začátku', vyp0 ? 'ZAP' : 'VYP'); fs.writeFileSync(OUT + '/vyp0.txt', String(vyp0));
  // 1) 1 zákazník a VYP
  const s9603 = await E(() => ONLINE_STAV.rejstrik.find(z => /9603 - K19T-C103/.test(z.cislo)).soubor);
  if (!vyp0) { await E(() => onlineFunkceNastav('viceZakazniku', true)); await W(2500); }
  await otevri(s9603); L('1) 1 zákazník, ZAP', await hlav());
  await E(() => onlineFunkceNastav('viceZakazniku', false)); await W(2500);
  const s9802 = await E(() => ONLINE_STAV.rejstrik.find(z => /CN - 9802$/.test(z.cislo)).soubor);
  await otevri(s9802); L('1) 2 zákazníci, VYP (9802)', await hlav());
  await E(() => onlineFunkceNastav('viceZakazniku', true)); await W(2500);
  await otevri(s9802); L('1) 2 zákazníci, ZAP (9802, jen čtení)', await hlav());
  // založení TEST VZ – T1: A řídící (.1), B sdílí .1, C vlastní .2
  if (await E(c => ONLINE_STAV.rejstrik.some(z => z.cislo === c), CISLO)) { L('9812 už existuje — konec'); process.exit(4); }
  await otevri(s9603);
  L('založení', await E(({ CISLO, AKCE }) => { const kopie = JSON.parse(JSON.stringify(aktivniVarianta(ZAK).data));
    ZAK = novaZakazka(); syncVarianta(); ONLINE_STAV.soubor = ''; ONLINE_STAV.razitko = ''; ONLINE_STAV.posledni = '';
    Object.assign(ZAK, { cislo: CISLO, nazevAkce: AKCE, adresa: 'Zkušební 12, 100 00 Praha', objednatel: 'TEST VZ T1 Zákazník A s.r.o.', ico: '99811049', dic: 'CZ99811049', kontakt: 'KANAR-T1A' });
    const v = aktivniVarianta(ZAK); for (const k of Object.keys(kopie)) if (!/sleva/.test(k)) v.data[k] = kopie[k]; if (v.data.ock) v.data.ock.dalsi = [];
    syncVarianta(); if (typeof zamekCteniJe === 'function' && zamekCteniJe()) zamekCteniOdemkniUI(); render(); return true; }, { CISLO, AKCE }));
  await uloz('založení');
  L('1) 1 zákazník nová zakázka ZAP', await hlav());
  const pridej = (h, vl) => E(({ h, vl }) => { vzFormOtevri('ock'); Object.assign(VZ_UI.form.h, h); vzFormNova(vl ? 'vlastni' : 'stejna'); vzFormPridej(); return vzZakaznici(ZAK).length; }, { h, vl });
  await pridej({ objednatel: 'TEST VZ T1 Zákazník B s.r.o.', ico: '99811057', kontakt: 'KANAR-T1B' }, false);
  await pridej({ objednatel: 'TEST VZ T1 Zákazník C s.r.o.', ico: '99811065', kontakt: 'KANAR-T1C' }, true);
  await uloz('A, B, C');
  L('1) 3 zákazníci ZAP', await hlav());
  const vid = (n) => E(n => String(ZAK.varianty.find(v => v.nazev === n).id), n);
  const zid = (n) => E(n => vzZakaznici(ZAK).find(z => vzNazevZ(z).includes('Zákazník ' + n)).id, n);
  // 2) vlastní varianta C (.2) jako řídící: nejdřív Zrušit, pak Změnit
  const v2 = await vid('Varianta 2'), v1 = await vid('Varianta 1');
  await E(() => { window.__odpoved = false; }); await E(v => vzT1VarZmen(v), v2); await W(800);
  L('2) Zrušit', { hl: await E(() => window.__hlBer()), hlavicka: await hlav() });
  await E(() => { window.__odpoved = true; }); await E(v => vzT1VarZmen(v), v2); await W(800);
  L('2) Změnit', { hl: await E(() => window.__hlBer()), hlavicka: await hlav() });
  await uloz('2)');
  // 3) sdílená .1 jako řídící → povinný výběr jen z A, B; uložení bez výběru zastaví
  await E(v => vzT1VarZmen(v), v1); await W(800); L('3) sdílená vybrána', await hlav());
  await uloz('3) bez výběru řídícího');
  L('3) po pokusu o uložení', await hlav());
  await E(id => vzT1ZakZmen(id), await zid('B')); await W(800);
  L('3) vybrán B', { hl: await E(() => window.__hlBer()), hlavicka: await hlav() });
  await uloz('3) s výběrem B');
  // 4) v jednom uložení: přesunout A na novou vlastní variantu .3 a udělat A řídícím
  L('4) příprava', await E(async () => { const ki = klonujVariantu(ZAK, vzRidiciVariantaId(ZAK), { aktivovat: false }); ki.nazev = 'Varianta 3'; syncVarianta(); render(); return ki.nazev; }));
  const v3 = await vid('Varianta 3'); const zA = await zid('A');
  await E(([z, v]) => vzVariantaSet(z, v), [zA, v3]); await W(500);
  await E(v => vzT1VarZmen(v), v3); await W(800);
  L('4) A na .3 a řídící', { hl: await E(() => window.__hlBer()), hlavicka: await hlav() });
  const r4 = await uloz('4) jedno uložení'); L('4) zápisy 409?', zapisy.filter(x => /409/.test(x)).length);
  // 6) žlutý blok / poznámka dealu (simulace organizace dealu jen v paměti, pak vrátit)
  const org = async (popis, o) => { L('6)', popis, await E(o => { const pred = { d: ZAK.pdDealId, o: ZAK.pdOrgDealu };
    if (o) { ZAK.pdDealId = '999001'; ZAK.pdOrgDealu = Object.assign({ deal: '999001', org: 4242, kdy: new Date().toISOString() }, o); }
    render(); const blok = (document.querySelector('.vz-t1-org') || {}).textContent || ''; const pozn = (vzPoznamkaText(ZAK) || '').split('\n').filter(x => /^Řídící zákazník v kalkulaci/.test(x));
    ZAK.pdDealId = pred.d; if (pred.o === undefined) delete ZAK.pdOrgDealu; else ZAK.pdOrgDealu = pred.o; render();
    return { ridici: vzNazevZ(vzZakaznik(ZAK, vzRidiciId(ZAK))), blok: blok.trim().slice(0, 200), poznamka: pozn }; }, o)); };
  await org('bez dealu (org = původní řídící A, teď řídící A)', null);
  await org('org s IČ A (sedí)', { ico: '99811049', nazev: 'TEST VZ T1 Zákazník A s.r.o.' });
  await org('org s IČ B (nesedí)', { ico: '99811057', nazev: 'TEST VZ T1 Zákazník B s.r.o.' });
  await org('org bez IČ, název A', { ico: '', nazev: 'TEST VZ T1 Zákazník A s.r.o.' });
  await org('org bez IČ, název B', { ico: '', nazev: 'TEST VZ T1 Zákazník B s.r.o.' });
  await org('org bez IČ, neznámý název', { ico: '', nazev: 'Jiná firma s.r.o.' });
  // řídící B přes sdílenou? A je teď na vlastní .3 → zkus i stav řídící ≠ původní bez dealu
  await E(v => vzT1VarZmen(v), v2); await W(800); await org('bez dealu, řídící C (≠ původní A)', null); await org('org s IČ C (sedí)', { ico: '99811065', nazev: 'TEST VZ T1 Zákazník C s.r.o.' }); await org('org bez IČ, název C', { ico: '', nazev: 'TEST VZ T1 Zákazník C s.r.o.' });
  await uloz('6)');
  // 7) Prodáno: odeslat CN B (.1) a prodat B
  await E(id => vzOtevri(id), await zid('B')); await W(500); await E(() => { tiskJazykNastav('cz'); nabidkaWord(); }); await W(9000); await E(() => window.__hlBer());
  await uloz('7) odesláno B');
  await E(async id => { const z = vzZakaznik(ZAK, id); vzProdejOtevri(id, z.varianta); }, await zid('B')); await W(800);
  await E(() => vzProdejPotvrd(true)); await W(3000);
  L('7) po prodeji', { hl: await E(() => window.__hlBer()), hlavicka: await hlav() });
  await E(v => vzT1VarZmen(v), v2); await W(800); L('7) změna řídící varianty po prodeji', { hl: await E(() => window.__hlBer()), hlavicka: await hlav() });
  await E(id => vzT1ZakZmen(id), await zid('A')); await W(800); L('7) změna řídícího po prodeji', { hl: await E(() => window.__hlBer()), ridici: (await hlav()).ridici });
  await uloz('7)');
  const s9812 = await E(() => ONLINE_STAV.soubor); fs.writeFileSync(OUT + '/soubor.txt', s9812);
  // 5) práva: obchodník (není autor)
  const zap2 = []; const q = await relace(b, 'KNG_TEST_OBCHODNIK_EMAIL', 'KNG_TEST_OBCHODNIK_HESLO', zap2);
  L('5) obchodník role', await q.evaluate(async () => { const j = await (await fetch('/api/ja')).json(); return j.role || (j.uzivatel || {}).role; }));
  const sT1b = await E(() => ONLINE_STAV.rejstrik.find(z => /CN - 9811$/.test(z.cislo)) ? '' : ''); // jen kontrola
  await Promise.race([q.evaluate(x => onlineOtevri(x), s9812), new Promise(r => setTimeout(r, 15000))]); await q.waitForTimeout(3000);
  L('5) obchodník 9812 (prodaná)', await q.evaluate(() => { render(); const s = document.getElementById('vzT1Rv'); return { disabled: !!(s && s.disabled), proc: s ? s.title : '', procNe: vzRidiciProcNe() }; }));
  // nepradaná zakázka admina pro práva: 9811 je prodaná; použij 9802? — zkus 9812 před prodejem nejde; jádro + server:
  L('5) obchodník jádro vzRidiciSmiMenit', await q.evaluate(() => { const ja = ONLINE_STAV.ja; return typeof vzRidiciSmiMenit === 'function' ? vzRidiciSmiMenit(ZAK, ja) : null; }));
  // admin zpět: vypínač
  const ted = await E(() => viceZakaznikuZapnuto()); if (ted !== vyp0) { await E(v => onlineFunkceNastav('viceZakazniku', v), vyp0); await W(2500); }
  L('vypínač na konci', await E(() => viceZakaznikuZapnuto()) ? 'ZAP' : 'VYP');
  L('zápisy admin', zapisy.join(', ')); L('zápisy obchodník', zap2.join(', '));
  fs.writeFileSync(OUT + '/log.txt', LOG.join('\n')); await b.close();
})().catch(e => { console.error('CHYBA', e.message); fs.writeFileSync(OUT + '/log.txt', LOG.join('\n') + '\nCHYBA ' + e.message); process.exit(1); });
