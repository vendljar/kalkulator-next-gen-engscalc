// Zkouška PR #707 (připomínky z aplikace, v22.11.5) na TESTU, 22. 11. 2026 — trvalý souhlas J. V. se zápisem na test.
// Zápisy: jen /api/pripominky (nastavení, připomínky, klíč koordinace). Zakázky se jen otevírají (TEST 9831), neukládají.
// Na konci: funkce VYPNUTÁ (původní nastavení zpět, zapnuto=false), klíč koordinace zrušen a ověřen 401.
// Hodnoty účtů, e-maily ani vydaný klíč se nevypisují (bezEmailu, klíč jen v proměnné).
const fs = require('fs');
const H = require('./vzd_spolecne');
const OUT = process.env.OUT || H.SP + '/pr';
const { L, V, konec, st } = H.start(OUT);
const T = H.TEST.replace(/\/$/, '');
const ZAK_CISLO = process.env.PR_ZAKAZKA || 'TEST - 2026 - OPR - CN - 9831';
const ucet = role => role === 'obchodnik' ? [process.env.KNG_TEST_OBCHODNIK_EMAIL, process.env.KNG_TEST_OBCHODNIK_HESLO] : [process.env.KNG_TEST_EMAIL, process.env.KNG_TEST_HESLO];

(async () => {
  const startIso = new Date(Date.now() - 60000).toISOString();
  const A = await H.prohlizec(OUT, 'spravce'); const O = await H.prohlizec(OUT, 'obchodnik');
  const api = (P, url, telo, metoda) => P.E(async ([url, telo, metoda]) => { const r = await fetch(url, { method: metoda || (telo ? 'POST' : 'GET'), credentials: 'include',
    headers: telo ? { 'Content-Type': 'application/json' } : {}, body: telo ? JSON.stringify(telo) : undefined }); let j = null; try { j = await r.json(); } catch (e) {} return { status: r.status, j }; }, [url, telo, metoda]);
  const http = (P, n) => P.zap.slice(n).filter(x => /pripominky|ODPOVĚĎ/.test(x)).map(H.bezEmailu);

  // ---------- 0) výchozí stav a zapnutí v Nastavení (UI) ----------
  const n0 = await api(A, '/api/pripominky?nastaveni=1');
  const puvodni = fs.existsSync(OUT + '/nastaveni_puvodni.json') ? JSON.parse(fs.readFileSync(OUT + '/nastaveni_puvodni.json', 'utf8')) : (n0.j && n0.j.nastaveni);
  if (!fs.existsSync(OUT + '/nastaveni_puvodni.json')) fs.writeFileSync(OUT + '/nastaveni_puvodni.json', JSON.stringify(puvodni));
  L('0 nastavení na začátku', n0.status, { zapnuto: puvodni && puvodni.zapnuto, role: puvodni && puvodni.role, limitDen: puvodni && puvodni.limitDen, klic: n0.j && n0.j.klic && n0.j.klic.nastaven });
  const seznam0 = await api(A, '/api/pripominky'); L('0 připomínek na testu před zkouškou', (seznam0.j.pripominky || []).length);
  const fab0 = await O.E(() => { const f = document.getElementById('prip-fab'); return !!f && f.style.display !== 'none'; });
  V('PR0 vypnuto: obchodník tlačítko Připomínka nevidí', !fab0 && !(puvodni && puvodni.zapnuto), { fab0 });
  let n = A.zap.length;
  await A.E(() => pripominkySpravceOtevri()); await A.W(2500);
  const ui0 = await A.E(() => ({ panel: typeof NAST !== 'undefined' && NAST.panel, varovani: !!document.querySelector('.prip-chyba'), chk: !!document.getElementById('prip-n-zapnuto') }));
  await A.p.check('#prip-n-zapnuto'); await A.p.click('button:has-text("Uložit nastavení připomínek")'); await A.W(3000);
  const n1 = await api(A, '/api/pripominky?nastaveni=1');
  V('PR1 správce zapne funkci v Nastavení → Připomínky (UI)', ui0.chk && n1.j.zapnuto === true, { ui0, http: http(A, n), zapnuto: n1.j.zapnuto, limitDen: n1.j.limitDen });
  await O.E(() => pripominkyNactiZnovu()); await O.W(2500);
  const fab1 = await O.E(() => { const f = document.getElementById('prip-fab'); return !!f && f.style.display !== 'none'; });
  V('PR2 obchodník po načtení vidí tlačítko Připomínka', fab1);

  // ---------- 1) obchodník: připomínky z více záložek, s místem a snímkem ----------
  await O.otevri(ZAK_CISLO);
  const odesli = async (tab, typ, text, misto) => {
    await O.E(t => { prepniTab(t); render(); }, tab); await O.W(1500);
    await O.p.click('#prip-fab'); await O.W(800);
    if (await O.E(() => !!document.querySelector('#prip-panel .prip-dekujeme'))) { await O.p.click('#prip-panel button:has-text("Napsat další")'); await O.W(800); }
    if (await O.E(() => PRIP.zalozka !== 'nova')) { await O.E(() => pripZalozka('nova')); await O.W(800); }
    await O.p.click(`.prip-typ[data-typ="${typ}"]`); await O.p.fill('#prip-text', text);
    let mistoPopis = null;
    if (misto) {
      const sel = await O.E(t => { const pg = document.getElementById('page-' + t) || document.body;
        const ok = e => e.offsetParent && !e.disabled && document.querySelectorAll('#' + CSS.escape(e.id)).length === 1 && e.getBoundingClientRect().top > 80 && e.getBoundingClientRect().bottom < window.innerHeight - 80;
        const vse = [...pg.querySelectorAll('input[id]:not([type=checkbox]):not([type=radio]),select[id]')];
        const okL = e => e.offsetParent && e.getBoundingClientRect().top > 80 && e.getBoundingClientRect().bottom < window.innerHeight - 80 && e.textContent.trim().length > 2;
        const el = vse.find(e => ok(e) && document.querySelector('label[for="' + CSS.escape(e.id) + '"]')) || vse.find(ok) || [...pg.querySelectorAll('label')].find(okL) || [...pg.querySelectorAll('h2,th')].find(okL);
        if (!el) { const x = Math.round(window.innerWidth * 0.3), y = Math.round(window.innerHeight * 0.45); const e = document.elementFromPoint(x, y); return e ? { id: 'bod:' + e.tagName, x, y } : null; }
        const r = el.getBoundingClientRect(); return { id: el.id || el.tagName, x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, tab);
      await O.p.click('#prip-misto'); await O.W(500);
      const lista = await O.E(() => { const l = document.getElementById('prip-vyber-lista'); return !!l && l.style.display !== 'none'; });
      const pred = await O.E(() => TAB);
      if (sel) { await O.p.mouse.move(sel.x, sel.y); await O.W(300); await O.p.mouse.click(sel.x, sel.y); } await O.W(800);
      mistoPopis = await O.E(() => ({ misto: PRIP.misto ? { sekce: PRIP.misto.sekce, popisek: PRIP.misto.popisek, zdroj: PRIP.misto.zdroj, maRect: !!(PRIP.misto.rect && PRIP.misto.rect.vw) } : null,
        tab: TAB, panel: PRIP.panel, cip: !!document.querySelector('#prip-panel .prip-cip') }));
      mistoPopis.lista = lista; mistoPopis.tabNezmenen = pred === mistoPopis.tab; mistoPopis.sel = sel && sel.id;
    }
    await O.p.waitForFunction(() => !PRIP.nahledBezi, null, { timeout: 15000 }).catch(() => {});
    const nahled = await O.E(() => ({ nahled: /^data:image\/jpeg/.test(PRIP.nahled || ''), delka: (PRIP.nahled || '').length, chk: !!(document.getElementById('prip-snimek-chk') || {}).checked,
      btn: !(document.getElementById('prip-odeslat') || {}).disabled }));
    const k = O.zap.length;
    L('  před odesláním', tab, { misto: mistoPopis, nahled, stav: await O.E(() => ({ panel: PRIP.panel, vybira: PRIP.vybira, disp: (document.getElementById('prip-panel') || { style: {} }).style.display })) });
    await O.p.click('#prip-odeslat', { timeout: 8000 });
    await O.p.waitForFunction(() => !PRIP.odesilam, null, { timeout: 30000 }).catch(() => {});
    const r = await O.E(() => ({ odeslano: PRIP.odeslano, hlaska: PRIP.hlaska, dekujeme: !!document.querySelector('.prip-dekujeme') }));
    await O.E(() => pripPanelZavri());
    return { tab, misto: mistoPopis, nahled, http: http(O, k), r };
  };
  let ids;
  if (process.env.PR_RESUME === '1' && fs.existsSync(OUT + '/ids.json')) { ids = JSON.parse(fs.readFileSync(OUT + '/ids.json', 'utf8')); L('navázání na odeslané', ids); } else {
  const p1 = await odesli('kalk', 'chyba', 'TEST PR zkouška 1 – připomínka z kalkulace OCK s označeným místem.', true);
  V('PR3 připomínka 1 (Kalkulace OCK): výběr místa (lišta, klik prvek neaktivuje, čip), snímek, odeslání 200', !!p1.r.odeslano && p1.misto && p1.misto.misto && p1.misto.lista && p1.misto.tabNezmenen && p1.misto.cip && p1.nahled.nahled && p1.r.dekujeme, p1);
  const p2 = await odesli('kryci', 'navrh', 'TEST PR zkouška 2 – připomínka z krycího listu s označeným místem.', true);
  V('PR4 připomínka 2 (Krycí list OCK) s místem a snímkem', !!p2.r.odeslano && p2.misto && p2.misto.misto && p2.nahled.nahled, p2);
  const p3 = await odesli('proj', 'dotaz', 'TEST PR zkouška 3 – dotaz z kalkulace PROJ bez označení místa.', false);
  V('PR5 připomínka 3 (Kalkulace PROJ) bez místa, se snímkem', !!p3.r.odeslano && p3.nahled.nahled, p3);
  ids = [p1, p2, p3].map(x => x.r.odeslano && x.r.odeslano.id);
  }
  fs.writeFileSync(OUT + '/ids.json', JSON.stringify(ids)); L('čísla připomínek', ids);

  if (!((+process.env.PR_OD || 0) >= 6)) {
  // ---------- 2) správce: detail, snímek, místo, odložit bez zdůvodnění, odpovědět a uzavřít ----------
  await A.E(() => pripominkyNactiZnovu()); await A.W(3000);
  const lista = await A.E(() => { const b = document.getElementById('prip-lista-btn'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : null; });
  const neprectenych = await A.E(() => PRIP.sp.neprectenych);
  V('PR6 správce: tlačítko v liště s počtem nepřečtených a záložka „Připomínky (N)"', !!lista && neprectenych >= 3, { lista, neprectenych, zalozka: await A.E(() => pripominkyZalozkaNazev()) });
  await A.E(() => { if (typeof zavriNastaveni === 'function') zavriNastaveni(); }); await A.W(800);
  await A.p.click('#prip-lista-btn'); await A.W(3000);
  for (const [i, id] of ids.entries()) {
    await A.p.click(`tr[data-id="${id}"]`); await A.p.waitForFunction(id => PRIP.sp.snimky[id] !== null && PRIP.sp.snimky[id] !== undefined, id, { timeout: 20000 }).catch(() => {}); await A.W(800);
    const d = await A.E(id => { const det = document.querySelector('.prip-sp-detail'); const img = det && det.querySelector('.prip-snimek img'); const ram = det && det.querySelector('.prip-snimek-ram');
      const misto = [...(det ? det.querySelectorAll('.prip-kontext tr') : [])].map(tr => tr.textContent.replace(/\s+/g, ' ').trim()).find(t => /^Označené místo/.test(t)) || '';
      const obr = [...(det ? det.querySelectorAll('.prip-kontext tr') : [])].map(tr => tr.textContent.replace(/\s+/g, ' ').trim()).find(t => /^Obrazovka/.test(t)) || '';
      return { img: !!img, imgW: img ? img.naturalWidth : 0, imgH: img ? img.naturalHeight : 0, ram: ram ? ram.getAttribute('style') : null, misto, obrazovka: obr,
        precteno: (PRIP.sp.seznam.find(x => x.id === id) || {}).prectenoSpravcem }; }, id);
    const sn = await api(A, '/api/pripominky?snimek=' + id);
    if (sn.j && sn.j.obrazek) fs.writeFileSync(OUT + '/snimek_' + id + '.jpg', Buffer.from(sn.j.obrazek.split(',')[1], 'base64'));
    await A.p.screenshot({ path: OUT + '/spravce_detail_' + id + '.png' });
    V(`PR7.${i + 1} detail ${id}: snímek ve detailu, ${i < 2 ? 'místo vyznačené rámečkem' : 'bez místa'}, přečteno`, d.img && d.imgW > 300 && (i < 2 ? !!d.ram && /📍/.test(d.misto) : !d.ram) && d.precteno, d);
  }
  // P1: Odložit bez zdůvodnění → odmítnuto (klient i server), pak Odpovědět a uzavřít.
  await A.p.click(`tr[data-id="${ids[0]}"]`); await A.W(800);
  n = A.zap.length; await A.p.fill('#prip-sp-odpoved', ''); await A.p.click('.prip-akce button:has-text("Odložit")'); await A.W(1500);
  const odl = { hlaska: await A.E(() => PRIP.sp.hlaska), http: http(A, n), stav: await A.E(id => PRIP.sp.seznam.find(x => x.id === id).stav, ids[0]) };
  const odlSrv = await api(A, '/api/pripominky', { id: ids[0], akce: 'odlozit' }, 'PATCH');
  V('PR8 „Odložit" bez zdůvodnění: klient odmítne (žádný PATCH) a server 400', /zdůvodnění/.test(odl.hlaska) && !odl.http.some(x => /PATCH/.test(x)) && odl.stav === 'nova' && odlSrv.status === 400, { odl, server: [odlSrv.status, odlSrv.j && odlSrv.j.chyba] });
  n = A.zap.length; await A.p.fill('#prip-sp-odpoved', 'TEST PR odpověď správce: díky, opraveno v testu.'); await A.p.click('.prip-akce button:has-text("Odpovědět a uzavřít")'); await A.W(2500);
  const uz = { stav: await A.E(id => PRIP.sp.seznam.find(x => x.id === id).stav, ids[0]), hlaska: await A.E(() => PRIP.sp.hlaska), http: http(A, n) };
  V('PR9 „Odpovědět a uzavřít" → Hotovo (PATCH 200)', uz.stav === 'hotovo' && uz.http.some(x => /PATCH \/api\/pripominky 200/.test(x)), uz);
  // P2 do fronty (pro koordinaci), P3 odložit se zdůvodněním.
  await A.p.click(`tr[data-id="${ids[1]}"]`); await A.W(800); n = A.zap.length; await A.p.click('.prip-akce button:has-text("Do fronty oprav")'); await A.W(2500);
  const fr = await A.E(id => PRIP.sp.seznam.find(x => x.id === id).stav, ids[1]);
  await A.p.click(`tr[data-id="${ids[2]}"]`); await A.W(800); await A.p.fill('#prip-sp-odpoved', 'TEST PR zdůvodnění odložení: řešíme v další dávce.'); await A.p.click('.prip-akce button:has-text("Odložit")'); await A.W(2500);
  const od3 = await A.E(id => PRIP.sp.seznam.find(x => x.id === id).stav, ids[2]);
  V('PR10 „Do fronty oprav" a „Odložit" se zdůvodněním projdou', fr === 'fronta' && od3 === 'odlozeno', { fr, od3, http: http(A, n) });

  // ---------- 3) autor: odznak a jeho zmizení po otevření ----------
  await O.E(() => pripMojeNacti()); await O.W(2500);
  const odz = await O.E(() => { const b = document.querySelector('#prip-fab .prip-fab-pocet'); return { odznak: b ? b.textContent : null, novych: PRIP.novych }; });
  n = O.zap.length; await O.p.click('#prip-fab'); await O.W(2500);
  const mo = await O.E(ids => ({ zalozka: PRIP.zalozka, karty: [...document.querySelectorAll('#prip-panel .prip-karta')].filter(k => ids.includes(k.dataset.id)).length,
    zvyraznene: [...document.querySelectorAll('#prip-panel .prip-karta.prip-nova')].length, odpoved: !!document.querySelector('#prip-panel .prip-odpoved'), oranz: !!document.querySelector('#prip-panel .prip-odpoved.oranzova') }), ids);
  await O.E(() => pripPanelZavri()); await O.W(500);
  const po = await O.E(() => ({ odznak: !!document.querySelector('#prip-fab .prip-fab-pocet'), novych: PRIP.novych }));
  await O.F5(); await O.W(2500);
  const poF5 = await O.E(() => ({ odznak: !!document.querySelector('#prip-fab .prip-fab-pocet'), novych: PRIP.novych }));
  V('PR11 autor: odznak s počtem, klik otevře Moje připomínky (zvýrazněné, odpověď, oranžové zdůvodnění), po otevření odznak zmizí i po F5',
    odz.odznak === '3' && mo.zalozka === 'moje' && mo.karty === 3 && mo.zvyraznene === 3 && mo.odpoved && mo.oranz && !po.odznak && !poF5.odznak && poF5.novych === 0,
    { odz, mo, po, poF5, http: http(O, n) });
  const autorPohled = await api(O, '/api/pripominky?moje=1');
  const p0 = (autorPohled.j.pripominky || []).find(x => x.id === ids[0]) || {};
  V('PR12 autor nevidí kontext, snímek ani roadmapu (pohled autora)', !('kontext' in p0) && !('snimek' in p0) && !('roadmapa' in p0) && !('autor' in p0), Object.keys(p0));
  const snO = await api(O, '/api/pripominky?snimek=' + ids[0]);
  V('PR13 obchodník snímek nedostane (403)', snO.status === 403, snO.status);

  // ---------- 4) klíč koordinace ----------
  await A.E(h => { window.onlineHesloSpravce = async () => h; }, process.env.KNG_TEST_HESLO);
  await A.E(() => pripominkySpravceOtevri()); await A.W(2500);
  n = A.zap.length; await A.p.click('.prip-nast button:has-text("Vydat")'); await A.W(3000);
  const klic = await A.E(() => PRIP.sp.novyKlic);
  const kUi = await A.E(() => ({ zobrazen: !!document.getElementById('prip-novy-klic'), stav: PRIP.sp.klic }));
  V('PR14 správce vydá klíč (heslo správce), ukáže se jednou', /^kngpr_/.test(klic || '') && kUi.zobrazen && kUi.stav && kUi.stav.nastaven, { zobrazen: kUi.zobrazen, nastaven: kUi.stav && kUi.stav.nastaven, http: http(A, n) });
  const nastPanel = await A.E(() => { nastPanel('firma'); const a = PRIP.sp.novyKlic; nastPanel('pripominky'); return { poOpusteni: a, zobrazenZnovu: !!document.getElementById('prip-novy-klic') }; });
  V('PR15 nový klíč zmizí po opuštění záložky Připomínky (N2)', nastPanel.poOpusteni === '' && !nastPanel.zobrazenZnovu, nastPanel);
  const K = await (await require('playwright').chromium.launch()).newContext(); const R = K.request;
  const kget = async (q, hl) => { const r = await R.get(T + '/api/pripominky' + q, { headers: hl || {} }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status(), j }; };
  const g1 = await kget('?pro=koordinace&od=' + encodeURIComponent(startIso), { Authorization: 'Bearer ' + klic });
  const vidi = (g1.j && g1.j.pripominky || []).filter(x => ids.includes(x.id));
  const citlive = vidi.some(x => 'autor' in x || 'autorJmeno' in x || (x.kontext && ('zakazka' in x.kontext || 'pole' in x.kontext || 'prohlizec' in x.kontext)) || 'snimek' in x);
  V('PR16 GET ?pro=koordinace s Bearer → 200, vidí jen puštěné (ne „nová"), bez autora, zakázky, polí a snímku', g1.s === 200 && vidi.length === 3 && !citlive && g1.j.zdroj === 'test',
    { s: g1.s, ids: vidi.map(x => x.id + ':' + x.stav), zdroj: g1.j && g1.j.zdroj, klice: vidi[0] && Object.keys(vidi[0]), kontext: vidi[0] && vidi[0].kontext });
  L('PR16b místo pro koordinaci (jen popis prvku)', vidi.map(x => ({ id: x.id, misto: x.kontext.misto, obrazovka: x.kontext.obrazovka })));
  const gUrl = await kget('?pro=koordinace&klic=x'); const gBez = await kget('?pro=koordinace');
  V('PR17 klíč v adrese 400', gUrl.s === 400, { url: gUrl.s, bezHlavicky: gBez.s });
  const pk = await R.patch(T + '/api/pripominky', { headers: { Authorization: 'Bearer ' + klic, 'Content-Type': 'application/json' }, data: { id: ids[1], stav: 'resi', roadmapa: '#707', odpoved: 'TEST PR koordinace: řeší se.' } });
  V('PR18 koordinace PATCH stav/roadmapa u puštěné připomínky → 200', pk.status() === 200, pk.status());
  const g2 = await kget('?pro=koordinace', { Authorization: 'Bearer ' + klic + 'X' });
  V('PR19 špatný klíč → 401', g2.s === 401, g2.s);
  // zrušení klíče (UI) a ověření 401 se starým klíčem
  await A.E(() => pripominkySpravceOtevri()); await A.W(2000);
  n = A.zap.length; await A.p.click('.prip-nast button:has-text("Zrušit klíč")'); await A.W(3000);
  const nz = await api(A, '/api/pripominky?nastaveni=1');
  const g3 = await kget('?pro=koordinace', { Authorization: 'Bearer ' + klic });
  V('PR20 zrušení klíče (UI) → klíč nenastaven, starý klíč 401', nz.j.klic && nz.j.klic.nastaven === false && g3.s === 401, { nastaven: nz.j.klic && nz.j.klic.nastaven, stary: g3.s, http: http(A, n) });
  const opak = []; for (let i = 0; i < 12; i++) { const g = await kget('?pro=koordinace', { Authorization: 'Bearer kngpr_spatny' + i }); opak.push(g.s); if (g.s === 429) break; }
  V('PR21 opakovaně špatný klíč → po 10 neplatných pokusech za 15 min 429', opak[opak.length - 1] === 429, { stavy: opak.join(','), celkemPokusu: opak.length + 2 });
  const zaz = await api(A, '/api/pripominky?nastaveni=1');
  L('PR21b záznam událostí klíče (posledních 6)', (zaz.j.zaznam || []).slice(0, 6).map(z => z.udalost));
  await K.browser().close();

  // ---------- 5) limit za den ----------
  const nl = await api(A, '/api/pripominky?nastaveni=1');
  L('5 limit z nastavení', nl.j.limitDen, '(výchozí PRIPOMINKA_LIMIT_DEN = 20, rozsah 1–200, den UTC, na uživatele)');
  await A.E(() => pripominkySpravceOtevri()); await A.W(2000);
  await A.p.fill('#prip-n-limit', '1'); await A.p.click('button:has-text("Uložit nastavení připomínek")'); await A.W(2500);
  const lim = await api(O, '/api/pripominky', { typ: 'dotaz', text: 'TEST PR zkouška limitu – nemá projít.', kontext: {}, snimek: '' });
  V('PR22 limit za den: při limitu 1 a 3 odeslaných dnes další → 429 s textem limitu', lim.status === 429 && lim.j && lim.j.kod === 'limit', { s: lim.status, chyba: lim.j && lim.j.chyba });
  await A.p.fill('#prip-n-limit', String((puvodni && puvodni.limitDen) || 20)); await A.p.click('button:has-text("Uložit nastavení připomínek")'); await A.W(2500);
  L('5 limit vrácen', (await api(A, '/api/pripominky?nastaveni=1')).j.limitDen);

  }
  // ---------- 6) odhlášení → další účet nic nezdědí ----------
  const prihlasJako = async (P, role) => { const [em, he] = ucet(role);
    await P.p.waitForSelector('#onlineEmail', { state: 'visible', timeout: 30000 });
    await P.p.fill('#onlineEmail', em); await P.p.fill('#onlineHeslo', he); await P.p.press('#onlineHeslo', 'Enter');
    await P.p.waitForFunction(() => typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.ja && (ONLINE_STAV.rejstrik || []).length > 50, null, { timeout: 60000 }); await P.W(3500); };
  // 6a obchodník rozepíše připomínku s místem a snímkem → odhlásí se → přihlásí se správce
  await O.E(t => { prepniTab('kalk'); render(); }); await O.p.click('#prip-fab'); await O.W(800);
  if (await O.E(() => !!document.querySelector('#prip-panel .prip-dekujeme'))) { await O.p.click('#prip-panel button:has-text("Napsat další")'); await O.W(800); }
  if (await O.E(() => PRIP.zalozka !== 'nova')) { await O.E(() => pripZalozka('nova')); await O.W(800); }
  await O.p.click('.prip-typ[data-typ="chyba"]'); await O.p.fill('#prip-text', 'KONCEPT-PR-OBCHODNIK rozepsaný text, nemá přežít odhlášení.');
  await O.p.waitForFunction(() => !PRIP.nahledBezi && PRIP.nahled, null, { timeout: 15000 }).catch(() => {});
  const predOdh = await O.E(() => ({ text: !!PRIP.text, nahled: !!PRIP.nahled, panel: PRIP.panel, moje: PRIP.moje.length }));
  await O.E(() => onlineOdhlas()); await O.W(3000);
  const poOdh = await O.E(() => ({ text: PRIP.text, nahled: PRIP.nahled, panel: PRIP.panel, moje: PRIP.moje.length, fab: (document.getElementById('prip-fab') || { style: {} }).style.display, panelHtml: (document.getElementById('prip-panel') || {}).innerHTML || '' }));
  await prihlasJako(O, 'spravce');
  const poSpravce = await O.E(() => ({ ja: ONLINE_STAV.ja.role, text: PRIP.text, nahled: PRIP.nahled, misto: PRIP.misto, panel: PRIP.panel, mojeAutor: PRIP.moje.length,
    koncept: document.body.innerHTML.includes('KONCEPT-PR-OBCHODNIK') }));
  V('PR23 obchodník → odhlášení → správce: koncept, snímek, panel ani Moje připomínky obchodníka nezůstanou',
    predOdh.text && predOdh.nahled && !poOdh.text && !poOdh.nahled && !poOdh.panel && poOdh.moje === 0 && !poSpravce.text && !poSpravce.nahled && !poSpravce.panel && !poSpravce.koncept && poSpravce.mojeAutor === 0,
    { predOdh, poOdh: Object.assign({}, poOdh, { panelHtml: poOdh.panelHtml.length }), poSpravce });
  // 6b správce s načteným seznamem a snímky → odhlášení → obchodník
  await O.E(() => pripominkySpravceOtevri()); await O.p.waitForSelector(`tr[data-id="${ids[0]}"]`, { timeout: 20000 }).catch(() => {});
  await O.E(id => pripSpVyber(id), ids[0]); await O.p.waitForFunction(id => !!PRIP.sp.snimky[id], ids[0], { timeout: 20000 }).catch(() => {});
  const sp = await O.E(() => ({ seznam: PRIP.sp.seznam.length, snimky: Object.values(PRIP.sp.snimky).filter(Boolean).length }));
  await O.E(() => { zavriNastaveni(); onlineOdhlas(); }); await O.W(3000);
  await prihlasJako(O, 'obchodnik');
  const poO = await O.E(() => ({ ja: ONLINE_STAV.ja.role, seznam: PRIP.sp.seznam.length, snimky: Object.keys(PRIP.sp.snimky).length, klic: PRIP.sp.klic, novyKlic: PRIP.sp.novyKlic, zaznam: PRIP.sp.zaznam.length,
    lista: !!document.getElementById('prip-lista-btn'), img: document.querySelectorAll('.prip-snimek img').length,
    imgKde: [...document.querySelectorAll('.prip-snimek img')].map(i => { const o = i.closest('[id]'); const ov = document.getElementById('nastaveni-overlay');
      return { rodic: o && o.id, vOverlay: !!(ov && ov.contains(i)), overlayZobrazen: ov ? getComputedStyle(ov).display : null, viditelny: !!i.offsetParent, dataUrl: /^data:image/.test(i.src), delka: i.src.length }; }),
    nastavHtml: (document.getElementById('nastaveni-overlay') || { innerHTML: '' }).innerHTML.length }));
  V('PR24 správce → odhlášení → obchodník: seznam, snímky, klíč ani záznam správce nezůstanou', sp.seznam > 0 && sp.snimky > 0 && poO.seznam === 0 && poO.snimky === 0 && !poO.klic && !poO.novyKlic && poO.zaznam === 0 && !poO.lista && poO.img === 0, { sp, poO });

  // ---------- 7) VYPNUTÍ (UI) a ověření ----------
  // odhlášení správce v kroku 6 odhlásí účet na všech zařízeních (i stránku A) → A znovu přihlásit
  await A.F5(); await A.W(2000);
  await A.E(() => { if (typeof zavriNastaveni === 'function') zavriNastaveni(); }); await A.W(800);
  await A.E(() => pripominkySpravceOtevri()); await A.p.waitForSelector('#prip-n-zapnuto', { timeout: 20000 }).catch(() => {});
  if (await A.p.locator('#prip-n-zapnuto').count()) { await A.p.uncheck('#prip-n-zapnuto'); } await A.p.click('button:has-text("Uložit nastavení připomínek")', { timeout: 10000 }).catch(e => L('uložení vypnutí v UI selhalo', e.message.slice(0, 80))); await A.W(2500);
  if (puvodni) { const zp = Object.assign({}, puvodni, { zapnuto: false }); delete zp.kdo; delete zp.kdy; await api(A, '/api/pripominky', { akce: 'nastaveni', nastaveni: zp }); }
  const nk = await api(A, '/api/pripominky?nastaveni=1');
  const nkO = await api(O, '/api/pripominky?nastaveni=1');
  await O.F5(); await O.W(2500);
  const fabK = await O.E(() => { const f = document.getElementById('prip-fab'); return !!f && f.style.display !== 'none'; });
  const post = await api(O, '/api/pripominky', { typ: 'dotaz', text: 'TEST PR po vypnutí – nemá projít.', kontext: {}, snimek: '' });
  V('PR25 funkce VYPNUTÁ: nastavení zapnuto=false, obchodník tlačítko nevidí, POST 403 vypnuto', nk.j.zapnuto === false && nkO.j.zapnuto === false && !fabK && post.status === 403 && post.j.kod === 'vypnuto',
    { spravce: nk.j.zapnuto, obchodnik: nkO.j.zapnuto, smiOdesilat: nkO.j.smiOdesilat, fabK, post: post.status, limitDen: nk.j.limitDen, klic: nk.j.klic && nk.j.klic.nastaven });
  L('souhrn', st);
  konec(); await A.b.close(); await O.b.close();
})().catch(e => { L('VÝJIMKA', e.message, e.stack && e.stack.split('\n').slice(0, 3).join(' | ')); konec(); process.exit(1); });
