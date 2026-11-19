// Zkouška D3 (#688) na TESTU — Objednávka / Smlouva PROJ z odeslané CN PROJ (karta v krycím listu PROJ pod SoD PROJ).
// Zápis jen do nových TEST zakázek: OVP 9821 (jeden zákazník, sleva + akce mimo Prahu, CN → objednávka → SoD PROJ)
// a OVP 9822 (kopie víc zákazníků z TEST 9814, CN pro řídícího). Obchodník jen čte (náhled, bez uložení).
// Čísla (ceny) se do logu nepíšou — jen shoda ano/ne. Jména uživatelů se nepíšou — jen shoda s přihlášeným.
// Spuštění z kořene repa: OUT=<složka> node podklady/kola/harness_testovani/d3.js
// Volitelně D3_CISLO (výchozí 9821), D3_VZ (výchozí 9822), D3_FAZE=a,b,c (výchozí vše).
const S = require('./d3_spolecne.js'); const fs = require('fs'); const { execSync } = require('child_process');
const OUT = process.env.OUT || '/tmp/d3'; const { L, V, st, konec } = S.start(OUT);
const C1 = 'TEST - 2026 - OVP - CN - ' + (process.env.D3_CISLO || '9821');
const C2 = 'TEST - 2026 - OVP - CN - ' + (process.env.D3_VZ || '9822');
const FAZE = (process.env.D3_FAZE || 'a,b,c').split(',');
const ZDROJ_VZ = 'TEST - 2026 - OVP - CN - 9814';
const CZ = 'TEST-ZAK-D3-A';   // číslo zakázky z účetnictví (smyšlené, bez číslic kvůli začernění)
const sh = c => execSync(c, { maxBuffer: 1 << 27 }).toString();
const nb = t => String(t || '').replace(/[  ]/g, ' ');

/* Okno náhledu objednávky: klik na tlačítko karty, text, PDF z tisku, rozvržení. */
async function nahled(x, stitek) {
  const { p, E, W, ctx } = x;
  await E(() => { prepniTab('kryciproj'); render(); }); await W(600);
  const tl = p.locator('#page-kryciproj button', { hasText: 'Náhled a tisk objednávky' }).first();
  if (await tl.isDisabled()) return { zhasnuto: true, title: await tl.getAttribute('title') };
  const [okno] = await Promise.all([ctx.waitForEvent('page', { timeout: 10000 }).catch(() => null), tl.click()]);
  if (!okno) return { okno: false, hl: await E(() => window.__hlBer()), stav: await E(() => [...document.querySelectorAll('.objednavkaProjStav')].map(e => e.textContent).join(' ')) };
  await okno.waitForLoadState(); await okno.waitForTimeout(800);
  const text = nb(await okno.locator('#dok').innerText());
  const roz = await okno.evaluate(() => {
    const bb = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }; };
    const strany = [...document.querySelectorAll('#dok .strana')];
    const th = [...document.querySelectorAll('#dok table.polozky th')].map(e => e.textContent.trim());
    const radky = [...document.querySelectorAll('#dok tr.radek')].map(tr => [...tr.children].map(td => td.innerText.trim()));
    const sleva = [...document.querySelectorAll('#dok tr.sleva td')].map(td => td.innerText.trim());
    const soucet = [...document.querySelectorAll('#dok tr.soucet td')].map(td => td.innerText.trim());
    const ram = [...document.querySelectorAll('#dok table.ramecek tr')].map(tr => [...tr.children].map(td => td.innerText.trim()));
    return { h1: bb(document.querySelector('#dok h1')), cislo: bb(document.getElementById('objCislo')), zakazka: bb(document.getElementById('objZakazka')),
      dod: bb(strany[0]), obj: bb(strany[1]), stitky: strany.map(s => (s.querySelector('.stitek') || {}).textContent),
      datum: bb(document.querySelector('#dok .datum')), tab: bb(document.querySelector('#dok table.polozky')), ramBox: bb(document.querySelector('#dok table.ramecek')),
      podpis: bb(document.querySelector('#dok .podpis')), pozn: bb(document.querySelector('#dok .pozn')), vystavil: bb(document.querySelector('#dok .vystavil')),
      logo: !!document.querySelector('#dok img'), sirka: document.querySelector('#dok').getBoundingClientRect().width, th, radky, sleva, soucet, ram,
      upoz: [...document.querySelectorAll('.obj-upoz')].map(e => e.textContent.trim()) };
  });
  const pdf = `${OUT}/${stitek}_nahled.pdf`; await okno.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
  const pdfText = nb(sh(`pdftotext -layout "${pdf}" -`)); const strany = +((sh(`pdfinfo "${pdf}"`).match(/Pages:\s+(\d+)/) || [])[1] || 0);
  fs.writeFileSync(`${OUT}/${stitek}_nahled.txt`, text); fs.writeFileSync(`${OUT}/${stitek}_nahled_pdf.txt`, pdfText);
  /* snímek do repa jen začerněný: číslice, bloky stran a Vystavil → █ */
  await okno.evaluate(() => {
    const cerni = el => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const n = []; while (w.nextNode()) n.push(w.currentNode); n.forEach(t => { t.textContent = t.textContent.replace(/\S/g, '█'); }); };
    document.querySelectorAll('#dok .strana, #dok .vystavil').forEach(e => { [...e.childNodes].forEach(c => { if (!(c.classList && c.classList.contains('stitek'))) { if (c.nodeType === 3) c.textContent = c.textContent.replace(/\S/g, '█'); else cerni(c); } }); });
    document.querySelectorAll('#dok img').forEach(i => { i.style.visibility = 'hidden'; });
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); while (w.nextNode()) { const t = w.currentNode; t.textContent = t.textContent.replace(/[0-9]/g, '█').replace(/[\w.+-]+@[\w.-]+/g, '█████'); }
  });
  await okno.screenshot({ path: `${OUT}/${stitek}_nahled_cerne.png`, fullPage: true }).catch(() => {});
  await okno.close();
  return { okno: true, text, roz, pdfText, strany };
}
/* Vytvořit objednávku (Word) tlačítkem; vrací { soubor, text, pole, pdfText, strany }. */
async function word(x, stitek) {
  const { p, E, W, dl } = x; const n = dl.length;
  await E(() => { prepniTab('kryciproj'); render(); }); await W(400);
  const tl = p.locator('#page-kryciproj button', { hasText: 'Vytvořit objednávku (Word)' }).first();
  if (await tl.isDisabled()) return { zhasnuto: true, title: await tl.getAttribute('title') };
  await tl.click(); for (let i = 0; i < 30 && dl.length === n; i++) await W(500); await W(1500);
  const stav = await E(() => [...document.querySelectorAll('.objednavkaProjStav')].map(e => e.textContent).join(' '));
  if (dl.length === n) return { soubor: null, stav };
  const f = `${OUT}/${stitek}_objednavka.docx`; fs.copyFileSync(dl[dl.length - 1], f);
  const text = nb(S.txtDocx(f)); fs.writeFileSync(f + '.txt', text);
  const pole = sh(`python3 -I podklady/kola/harness_testovani/pole.py "${f}"`).trim();
  sh(`cd "${OUT}" && soffice --headless --convert-to pdf "${f}" >/dev/null 2>&1 || true`);
  const pdf = f.replace(/\.docx$/, '.pdf'); const pdfText = fs.existsSync(pdf) ? nb(sh(`pdftotext -layout "${pdf}" -`)) : '';
  const strany = fs.existsSync(pdf) ? +((sh(`pdfinfo "${pdf}"`).match(/Pages:\s+(\d+)/) || [])[1] || 0) : 0;
  return { soubor: f, nazev: dl[dl.length - 1].replace(/^.*\/dl_/, ''), text, pole, pdfText, strany, stav };
}
const klPole = (x, id) => x.E(id => { prepniTab('kryciproj'); render(); const pg = document.getElementById('page-kryciproj');
  const inp = [...pg.querySelectorAll('input,textarea')].find(e => (e.getAttribute('onchange') || '').indexOf("klpSet('" + id + "'") === 0); const row = inp && inp.closest('.kl-row');
  const v = aktivniVarianta(ZAK);
  return { je: !!inp, hodnota: inp ? inp.value : null, disabled: inp ? (inp.disabled || inp.readOnly) : null, zmrazenoUI: !!(row && (row.classList.contains('kl-zmrazeno') || /zmrazeno/.test(row.textContent))),
    stav: zamekKryciPoleStav(v, 'kryciProj', id), label: row ? (row.querySelector('.lbl') || {}).textContent : null, src: row ? ((row.querySelector('.src') || {}).textContent || '').trim() : null,
    data: ((v.data.kryciProj || {}).hodnoty || {})[id] }; }, id);
const klZapis = (x, id, hodnota) => x.E(([id, h]) => { const inp = [...document.querySelectorAll('#page-kryciproj input,#page-kryciproj textarea')].find(e => (e.getAttribute('onchange') || '').indexOf("klpSet('" + id + "'") === 0);
  if (!inp) return 'pole nenalezeno'; if (inp.disabled || inp.readOnly) return 'pole zamčené'; inp.value = h; inp.dispatchEvent(new Event('change')); return 'zapsáno'; }, [id, hodnota]);
/* Tisk CN PROJ cestou tlačítka (zamkne variantu); vrací text Wordu CN. */
async function tiskCN(x, stitek) {
  const { E, W, dl } = x; const n = dl.length;
  await E(() => { tiskJazykNastav('cz'); nabidkaProjWord(); }); for (let i = 0; i < 40 && dl.length === n; i++) await W(500); await W(3000);
  if (dl.length === n) return null; const f = `${OUT}/${stitek}_CN.docx`; fs.copyFileSync(dl[dl.length - 1], f); const t = nb(S.txtDocx(f)); fs.writeFileSync(f + '.txt', t); return t;
}
const zaklad = x => x.E(() => { const nb = t => String(t || '').replace(/[\u00a0\u202f]/g, ' '); const v = aktivniVarianta(ZAK); const d = nabidkaProjData(vzTiskZakTicho(), v, 'cz'); const p = d.placeholders;
  const ja = (ONLINE_STAV && ONLINE_STAV.ja) || {};
  return { cn: p.CISLO_NABIDKY, sDph: nb(p.PROJ_CELKEM_S_DPH), bezDph: nb(p.PROJ_CELKEM_BEZ_DPH), dph: nb(p.PROJ_DPH_KC), sleva: nb(p.PROJ_SLEVA_KC || ''), slevaPct: p.PROJ_SLEVA_PROC,
    sekce: d.nabizeneSekce, jmeno: [ja.titul, ja.jmeno].filter(Boolean).join(' ').trim(), zamceno: !!(v.zamek && v.zamek.zamceno), tisky: zamekTiskyTypy(v),
    mimoPrahu: !!v.data.proj.zadani.akceMimoPrahu, vyjezd: vyjezdTechnikaKc(v.data.proj.zadani, v.data.proj.cenik), slevaStav: (v.data.slevaProj || {}).stav }; });
const kcCislo = t => +String(t || '').replace(/[^\d,-]/g, '').replace(',', '.');

module.exports = { nahled, word, klPole, klZapis, zaklad, kcCislo, nb, OUT, C1, C2, CZ, L, V, st, konec };
if (require.main === module) (async () => {
  // ================= FÁZE A: správce, 9821 =================
  if (FAZE.includes('a')) {
    const x = await S.otevriProhlizec(OUT, 'admin'); const { E, W, zap } = x;
    L('start', await E(() => ({ verze: (document.body.innerText.match(/v\d+\.\d+\.\d+/) || [''])[0], vz: viceZakaznikuZapnuto() })));
    if (await E(c => ONLINE_STAV.rejstrik.some(z => z.cislo === c), C1)) throw new Error(C1 + ' už existuje — zvol D3_CISLO');
    const zal = await E(async (cislo) => { const z = ONLINE_STAV.rejstrik.find(z => /7650 - K29-N50/.test(z.cislo));
      const d = await (await fetch('/api/zakazky?soubor=' + encodeURIComponent(z.soubor), { credentials: 'include' })).json(); const zk = d.zakazka || d;
      const v0 = zk.varianty.find(x => x.id === zk.aktivni) || zk.varianty[0]; const kop = JSON.parse(JSON.stringify(v0.data));
      ZAK = novaZakazka(); syncVarianta(); ONLINE_STAV.soubor = ''; ONLINE_STAV.razitko = ''; ONLINE_STAV.posledni = '';
      Object.assign(ZAK, { cislo, nazevAkce: 'TEST D3 – objednávka PROJ', adresa: 'Zkušební 21, 602 00 Brno', objednatel: 'TEST D3 s.r.o.', adresaObjednatele: 'Vzorová 3, 602 00 Brno', jenProj: !!zk.jenProj, jenOck: !!zk.jenOck });
      const v = aktivniVarianta(ZAK); for (const k of Object.keys(kop)) if (!/sleva/.test(k)) v.data[k] = kop[k];
      if (v.data.kryciProj) { v.data.kryciProj.hodnoty = {}; delete v.data.kryciProj.lhutyProj; }
      syncVarianta(); render();
      set('PJ.akceMimoPrahu', true); slevaProjSet('procenta', 3); render();
      const vv = aktivniVarianta(ZAK);
      return { cislo: ZAK.cislo, jenProj: ZAK.jenProj, mimoPrahu: !!vv.data.proj.zadani.akceMimoPrahu, sleva: vv.data.slevaProj.procenta, stav: vv.data.slevaProj.stav }; }, C1);
    L('založení', zal); await x.uloz(C1 + ' založení', L);
    let z0 = await zaklad(x); L('nabídka před CN', { sekce: z0.sekce, mimoPrahu: z0.mimoPrahu, vyjezdNenulovy: z0.vyjezd > 0, slevaStav: z0.slevaStav, slevaVTextu: !!z0.sleva });
    V('a0 příprava: sleva PROJ platná a akce mimo Prahu s výjezdem', /schváleno/.test(z0.slevaStav || '') && z0.mimoPrahu && z0.vyjezd > 0, { slevaStav: z0.slevaStav, mimoPrahu: z0.mimoPrahu });
    // ---- bod 1: před CN zhasnuto s důvodem
    const kar = await E(() => { prepniTab('kryciproj'); render(); const t = document.getElementById('page-kryciproj').textContent;
      const btn = [...document.querySelectorAll('#page-kryciproj button')].filter(b => /objednávk/i.test(b.textContent));
      return { sod: t.indexOf('Smlouva o dílo a plná moc (PROJ)'), obj: t.indexOf('Objednávka / Smlouva (PROJ)'), btn: btn.map(b => ({ t: b.textContent.trim(), dis: b.disabled, title: b.getAttribute('title') })) }; });
    V('1a karta „Objednávka / Smlouva (PROJ)" v KL PROJ pod SoD PROJ', kar.obj > kar.sod && kar.sod >= 0, { sod: kar.sod, obj: kar.obj });
    V('1b nevytištěná CN: obě tlačítka zhasnutá, bublina s důvodem', kar.btn.length === 2 && kar.btn.every(b => b.dis && /jen z odeslané/.test(b.title || '')), kar.btn.map(b => ({ t: b.t, dis: b.dis, title: (b.title || '').slice(0, 90) })));
    const pz0 = await klPole(x, 'cisloZakazky');
    V('3a KL PROJ: pole „Číslo zakázky" je a před CN jde zapisovat', pz0.je && pz0.stav === 'editovatelne' && !pz0.disabled, { label: pz0.label, stav: pz0.stav, src: pz0.src });
    const n0 = await E(() => { objednavkaProjVstup(); return [...document.querySelectorAll('.objednavkaProjStav')].map(e => e.textContent).join(' ') + ' | ' + window.__hlBer().join(' '); });
    V('1c přímé volání před CN: dokument nevznikne, stav říká proč', /jen z odeslané/.test(n0), n0.slice(0, 160));
    // ---- tisk CN
    const cn = await tiskCN(x, 'a'); await x.uloz(C1 + ' po tisku CN', L);
    const z1 = await zaklad(x);
    V('a1 tisk CN PROJ (Word tlačítkem) zamkl variantu', !!cn && z1.zamceno && z1.tisky.includes('nabidkaProj'), { cn: !!cn, zamceno: z1.zamceno, tisky: z1.tisky });
    const kar1 = await E(() => { prepniTab('kryciproj'); render(); return [...document.querySelectorAll('#page-kryciproj button')].filter(b => /objednávk/i.test(b.textContent)).map(b => ({ t: b.textContent.trim(), dis: b.disabled })); });
    V('1d po tisku CN: tlačítka aktivní', kar1.length === 2 && kar1.every(b => !b.dis), kar1);
    // ---- náhled bez čísla zakázky
    const n1 = await nahled(x, 'a1');
    if (!n1.okno) { V('1e náhled po CN se otevřel', false, n1); }
    else {
      V('1e náhled po CN se otevřel', true);
      const ocek = String(z1.cn).replace(/\s+/g, '').split('-').map(c => c.toUpperCase() === 'CN' ? 'OBJ' : c).join('-');
      V('3b číslo dokladu = číslo CN s CN → OBJ (náhled)', n1.text.includes('Číslo dokladu: ' + ocek) && /-OBJ-/.test(ocek), { cn: z1.cn.replace(/\d/g, '#'), obj: ocek.replace(/\d/g, '#') });
      V('3c CN v Wordu nese totéž číslo nabídky', cn.replace(/\s+/g, '').includes(String(z1.cn).replace(/\s+/g, '')));
      V('3d prázdné Číslo zakázky: kolonka Zakázka se netiskne', !/Zakázka:/.test(n1.text) && !n1.roz.zakazka);
      const sk = n1.roz.ram.find(r => /Celkem Kč/.test(r[0])) || [];
      V('2a Celkem Kč = CELKEM s DPH nabídky PROJ (data nabídky) — shoda', nb(sk[1]) === z1.sDph);
      /* Word CN PROJ tiskne rekapitulaci jen bez DPH (Cena před slevou, Sleva, CELKEM bez DPH) — s DPH se ověřuje výpočtem. */
      const cnCisla = (cn.match(/[\d \u00a0\u202f]+,\d\d/g) || []).map(kcCislo);
      V('2b CELKEM bez DPH a sleva objednávky jsou v odeslaném Wordu CN — shoda', cnCisla.includes(kcCislo(z1.bezDph)) && cnCisla.includes(kcCislo(z1.sleva)));
      V('2i Celkem Kč = CELKEM bez DPH × (1 + DPH) na haléř — shoda', Math.abs(Math.round(kcCislo(z1.bezDph) * 121) / 100 - kcCislo(z1.sDph)) < 0.005 && /DPH 21 %/.test(n1.text));
      const ramBez = (n1.roz.ram.find(r => /Celkem bez DPH/.test(r[0])) || [])[1];
      V('2c rámeček: bez DPH a DPH = nabídka PROJ — shoda', nb(ramBez) === z1.bezDph && nb((n1.roz.ram.find(r => /^DPH/.test(r[0])) || [])[1]) === z1.dph && cn.includes(z1.bezDph));
      const sumBez = n1.roz.radky.reduce((a, r) => a + kcCislo(r[7]), 0) + (n1.roz.sleva.length ? kcCislo(n1.roz.sleva[7]) : 0);
      const sumS = n1.roz.radky.reduce((a, r) => a + kcCislo(r[9]), 0) + (n1.roz.sleva.length ? kcCislo(n1.roz.sleva[9]) : 0);
      V('2d součet řádků (vč. řádku slevy) = Celkem bez DPH i s DPH — shoda', Math.abs(sumBez - kcCislo(z1.bezDph)) < 0.005 && Math.abs(sumS - kcCislo(z1.sDph)) < 0.005);
      V('2e řádek slevy je a odpovídá slevě nabídky — shoda', n1.roz.sleva.length > 0 && /Sleva/.test(n1.roz.sleva[2]) && Math.abs(-kcCislo(n1.roz.sleva[7]) - kcCislo(z1.sleva)) < 0.005, { slevaRadek: n1.roz.sleva.length > 0 });
      V('2f řádek za každou nabízenou činnost; cestovné (výjezd technika) v popisu', n1.roz.radky.length === z1.sekce.length && /výjezd|cestovní/i.test(n1.text), { radky: n1.roz.radky.length, sekce: z1.sekce.length });
      V('2g bez upozornění na rozdíl zaokrouhlení', n1.roz.upoz.length === 0, n1.roz.upoz.map(t => t.replace(/\d/g, '#')));
      V('4a Vystavil = přihlášený uživatel (náhled)', !!z1.jmeno && new RegExp('Vystavil: ' + z1.jmeno.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(n1.text));
      const strPdf = (n1.pdfText.match(/Strana\s+\d+\s*\/\s*\d+/g) || []);
      V('4b PDF z tisku náhledu: „Strana x / y" na každé stránce', strPdf.length === n1.strany && n1.strany > 0, { strany: n1.strany, nalezeno: strPdf.length });
      L('  rozvržení a1', { h1VpravoOdDodavatele: n1.roz.h1 && n1.roz.dod && n1.roz.h1.x > n1.roz.dod.r - 5, stitky: n1.roz.stitky, th: n1.roz.th, strany: n1.strany, logo: n1.roz.logo });
    }
    // ---- Word bez čísla zakázky
    const w1 = await word(x, 'a1');
    V('1f Word po CN vznikl', !!w1.soubor, { stav: (w1.stav || '').replace(/\d/g, '#').slice(0, 160), nazev: (w1.nazev || '').replace(/\d/g, '#') });
    if (w1.soubor) {
      V('3e Word: Číslo dokladu OBJ, bez kolonky Zakázka', /Číslo dokladu: \S*-OBJ-/.test(w1.text) && !/Zakázka:/.test(w1.text));
      V('2h Word: Celkem Kč = nabídka — shoda', w1.text.includes('Celkem Kč') && w1.text.includes(z1.sDph));
      V('4c Word: zápatí s poli PAGE a NUMPAGES', /footer1:PAGE/.test(w1.pole) && /footer1:NUMPAGES/.test(w1.pole), w1.pole.replace(/^\S+\s+/, ''));
      const sw = (w1.pdfText.match(/Strana\s+\d+\s*\/\s*\d+/g) || []);
      V('4d Word → PDF (LibreOffice): „Strana x / y" na každé stránce, y = počet stran', sw.length === w1.strany && w1.strany > 0 && sw.every(s => s.endsWith('/ ' + w1.strany) || s.endsWith('/' + w1.strany)), { strany: w1.strany, zapati: sw });
      V('4e Word: Vystavil = přihlášený uživatel', w1.text.includes('Vystavil: ' + z1.jmeno));
    }
    // ---- bod 3: Číslo zakázky po CN
    const pz1 = await klPole(x, 'cisloZakazky');
    V('3f po CN: Číslo zakázky jde zapisovat (stav editovatelne, pole odemčené)', pz1.stav === 'editovatelne' && !pz1.disabled && !pz1.zmrazenoUI, { stav: pz1.stav, disabled: pz1.disabled });
    L('  zápis Číslo zakázky', await klZapis(x, 'cisloZakazky', CZ));
    const u1 = await x.uloz(C1 + ' Číslo zakázky po CN', L);
    V('3g uložení Čísla zakázky po CN bez 409', u1.ok === true && u1.http.some(h => /POST \/api\/zakazky 200/.test(h)) && !u1.http.some(h => / 4\d\d/.test(h)), u1.http);
    await x.F5(); await x.otevri(C1); const pz2 = await klPole(x, 'cisloZakazky');
    V('3h po F5 Číslo zakázky drží', pz2.hodnota === CZ && pz2.data === CZ, { hodnota: pz2.hodnota === CZ });
    const n2 = await nahled(x, 'a2');
    if (n2.okno) {
      V('3i náhled: kolonka „Zakázka: <číslo>" vpravo pod číslem dokladu', n2.text.includes('Zakázka: ' + CZ) && n2.roz.zakazka && n2.roz.cislo && n2.roz.zakazka.y > n2.roz.cislo.y && n2.roz.zakazka.x > n2.roz.dod.r - 5);
      const r = n2.roz; const poradi = r.dod && r.obj && r.datum && r.tab && r.ramBox && r.podpis && r.pozn && r.vystavil
        && r.dod.b <= r.obj.y + 2 && r.obj.b <= r.datum.y + 2 && r.datum.b <= r.tab.y + 2 && r.tab.b <= r.ramBox.y + 2 && r.ramBox.b <= r.podpis.y + 2 && r.podpis.b <= r.pozn.y + 2 && r.pozn.b <= r.vystavil.y + 2;
      V('6a rozvržení: vpravo název + číslo dokladu + zakázka; vlevo Dodavatel, pod ním Místo určení / Objednatel; pak datum, tabulka, rámeček, podpis, poznámka, Vystavil',
        poradi && r.h1.x > r.dod.r - 5 && r.h1.y < r.obj.y && /Dodavatel/i.test(r.stitky[0]) && /Místo určení \/ Objednatel/i.test(r.stitky[1]), { stitky: r.stitky });
      V('6b sloupce tabulky (J. cena / C. cena / Celkem bez DPH / DPH % / Celkem s DPH) a součtový řádek', ['Č.', 'Označení', 'Popis dodávky', 'Množ.', 'MJ', 'J. cena bez DPH', 'C. cena bez DPH', 'Celkem bez DPH', 'DPH %', 'Celkem s DPH'].every((t, i) => r.th[i] === t) && /Součet/.test(r.soucet[0] || ''), r.th);
      V('6c rámeček Celkem Kč vpravo pod tabulkou', r.ramBox.r >= r.tab.r - 10 && r.ramBox.x > r.tab.x + r.sirka * 0.3, { ramBox: r.ramBox, tab: r.tab });
      V('6d poznámka odkazuje na CN a datum; podpis objednatele', /cenovou nabídkou č\. .* ze dne/.test(n2.text) && /Podpis objednatele/.test(n2.text));
      L('  rozvržení a2 (px)', { h1: r.h1, cislo: r.cislo, zakazka: r.zakazka, dod: r.dod, obj: r.obj, datum: r.datum, tab: r.tab, ramBox: r.ramBox, podpis: r.podpis, pozn: r.pozn, vystavil: r.vystavil, strany: n2.strany });
      L('  hlavička tabulky', r.th, 'první řádek (bez čísel)', (r.radky[0] || []).map(t => t.replace(/\d/g, '#').slice(0, 60)));
      L('  bloky pod tabulkou', n2.text.split('\n').filter(l => /^(Poznámka|Platební kalendář|Termíny|Mimo celkovou|Vystavil|Datum případu)/.test(l.trim())).map(l => l.replace(/\d/g, '#').replace(/Vystavil: .*/, 'Vystavil: <přihlášený>').slice(0, 80)));
      const sp = (n2.pdfText.match(/Strana\s+\d+\s*\/\s*\d+/g) || []); V('4f PDF z tisku (s číslem zakázky): Strana x / y', sp.length === n2.strany, { strany: n2.strany, zapati: sp });
    } else V('3i náhled s číslem zakázky', false, n2);
    const w2 = await word(x, 'a2');
    V('3j Word: kolonka „Zakázka: <číslo>"', !!w2.soubor && w2.text.includes('Zakázka: ' + CZ), { strany: w2.strany });
    // ---- SoD PROJ → Číslo zakázky zmrazené
    const nd = x.dl.length; await E(() => { tiskJazykNastav('cz'); sodWord('sodProj'); }); for (let i = 0; i < 40 && x.dl.length === nd; i++) await W(500); await W(3000);
    const sodStav = await E(() => [...document.querySelectorAll('.sodStav_sodProj')].map(e => e.textContent).join(' '));
    L('  SoD PROJ', { stazeno: x.dl.length > nd, stav: sodStav.replace(/\d/g, '#').slice(0, 200), hl: (await E(() => window.__hlBer())).slice(0, 3) });
    await x.uloz(C1 + ' po SoD PROJ', L);
    const z3 = await zaklad(x);
    V('a2 SoD PROJ vytištěna (zámek nese sodProj)', z3.tisky.includes('sodProj'), z3.tisky);
    const pz3 = await klPole(x, 'cisloZakazky');
    V('3k po SoD: Číslo zakázky zmrazené (stav i UI)', pz3.stav === 'zmrazeno' && (pz3.zmrazenoUI || pz3.disabled || !pz3.je), { stav: pz3.stav, zmrazenoUI: pz3.zmrazenoUI, disabled: pz3.disabled });
    const pokus = await E(() => { const p0 = window.potvrd; window.potvrd = async (t) => { window.__hl.push('POTVRĎ (odmítnuto): ' + String(t).replace(/\s+/g, ' ').slice(0, 140)); return false; }; klpSet('cisloZakazky', 'TEST-ZMENA'); window.potvrd = p0; return ((aktivniVarianta(ZAK).data.kryciProj || {}).hodnoty || {}).cisloZakazky; });
    V('3l po SoD: zápis přes klpSet se nepropíše', pokus === CZ, { zustalo: pokus === CZ, hl: (await E(() => window.__hlBer())).slice(0, 1).map(t => t.slice(0, 120)) });
    const n3 = await nahled(x, 'a3');
    L('  objednávka po SoD', { okno: n3.okno, zhasnuto: n3.zhasnuto, title: n3.title, zakazka: n3.okno ? n3.text.includes('Zakázka: ' + CZ) : null, varianty: await E(() => ZAK.varianty.length) });
    L('zápisy A', [...new Set(zap.filter(z => !/ODPOVĚĎ/.test(z)))].join(', ')); zap.filter(z => /ODPOVĚĎ|BLOK/.test(z)).forEach(z => L(z));
    await x.b.close();
  }
  // ================= FÁZE B: obchodník jen čte =================
  if (FAZE.includes('b')) {
    const x = await S.otevriProhlizec(OUT, 'obchodnik'); const { E } = x;
    await x.otevri(C1); const z = await zaklad(x);
    const n = await nahled(x, 'b');
    V('4g obchodník (jen náhled): Vystavil = přihlášený obchodník', n.okno && !!z.jmeno && n.text.includes('Vystavil: ' + z.jmeno), { okno: n.okno, zhasnuto: n.zhasnuto });
    const zapisy = x.zap.filter(t => /POST \/api\/zakazky/.test(t)); V('b0 obchodník nic neuložil', zapisy.length === 0, zapisy);
    await x.b.close();
  }
  // ================= FÁZE C: víc zákazníků (kopie 9814 → 9822) =================
  if (FAZE.includes('c')) {
    const x = await S.otevriProhlizec(OUT, 'admin'); const { E, W, zap } = x;
    if (!await E(() => viceZakaznikuZapnuto())) throw new Error('víc zákazníků vypnuto — vypínač neměním');
    if (await E(c => ONLINE_STAV.rejstrik.some(z => z.cislo === c), C2)) throw new Error(C2 + ' už existuje — zvol D3_VZ');
    const zal = await E(async ([zdroj, cislo]) => { const z = ONLINE_STAV.rejstrik.find(z => z.cislo === zdroj);
      const d = await (await fetch('/api/zakazky?soubor=' + encodeURIComponent(z.soubor), { credentials: 'include' })).json(); const zk = JSON.parse(JSON.stringify(d.zakazka || d));
      Object.keys(zk).filter(k => /^pd/.test(k)).forEach(k => delete zk[k]);
      zk.cislo = cislo; zk.nazevAkce = 'TEST D3 – víc zákazníků';
      (zk.varianty || []).forEach(v => { delete v.zamek; delete v.prodano; if (v.data && v.data.kryciProj) v.data.kryciProj.hodnoty = {}; });
      ZAK = importZakazka(zk); syncVarianta(); ONLINE_STAV.soubor = ''; ONLINE_STAV.razitko = ''; ONLINE_STAV.posledni = '';
      if (typeof vzOtevri === 'function') vzOtevri(vzRidiciId(ZAK)); render();
      return { cislo: ZAK.cislo, vz: vzRezim(ZAK), zak: vzZakaznici(ZAK).map(z => ({ id: z.id, r: z.ridici, p: z.pismeno })), sekce: nabidkaProjData(vzTiskZakTicho(), aktivniVarianta(ZAK), 'cz').nabizeneSekce }; }, [ZDROJ_VZ, C2]);
    L('založení víc zákazníků', zal); await x.uloz(C2 + ' založení', L);
    const cn = await tiskCN(x, 'c'); await x.uloz(C2 + ' po CN pro řídícího', L);
    const z = await zaklad(x); V('c0 CN PROJ pro řídícího vytištěna (zamčeno)', !!cn && z.zamceno, { zamceno: z.zamceno });
    const rid = await E(() => ({ id: vzRidiciId(ZAK), nazev: ZAK.objednatel, zab: dokumentZabrana('objednavkaProj', aktivniVarianta(ZAK)) }));
    const nr = await nahled(x, 'c_ridici');
    V('5a řídící zákazník: objednávka vznikne a Objednatel = řídící', rid.zab === '' && nr.okno && nr.text.includes(rid.nazev), { zab: rid.zab, okno: nr.okno });
    const b = await E(() => { const dal = vzZakaznici(ZAK).find(z => !z.ridici); vzOtevri(dal.id); render(); return { id: dal.id, nazev: dal.hlavicka.objednatel, zab: dokumentZabrana('objednavkaProj', aktivniVarianta(ZAK)) }; }); await W(500);
    const nb2 = await nahled(x, 'c_dalsi');
    const vst = await E(() => { const r = objednavkaProjVstup(); return { vznikl: !!r, stav: [...document.querySelectorAll('.objednavkaProjStav')].map(e => e.textContent).join(' '), hl: window.__hlBer() }; });
    V('5b další zákazník: tlačítko zhasnuté s důvodem „jen pro řídícího", dokument nevznikne',
      /jen pro řídícího/.test(b.zab) && (nb2.zhasnuto || !nb2.okno) && !vst.vznikl && /jen pro řídícího/.test(vst.stav), { zab: b.zab.slice(0, 140), zhasnuto: nb2.zhasnuto, title: (nb2.title || '').slice(0, 100) });
    await E(() => { vzOtevri(vzRidiciId(ZAK)); render(); });
    L('zápisy C', [...new Set(zap.filter(z => !/ODPOVĚĎ/.test(z)))].join(', ')); zap.filter(z => /ODPOVĚĎ|BLOK/.test(z)).forEach(z => L(z));
    await x.b.close();
  }
  L(`SOUHRN ${st.ok} OK, ${st.fail} FAIL`); konec();
})().catch(e => { console.error('CHYBA', e.stack); L('CHYBA ' + e.message); konec(); process.exit(1); });
