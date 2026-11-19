/* Ověření v prohlížeči: VZ T1 — ŘÍDÍCÍ VARIANTA A ŘÍDÍCÍ ZÁKAZNÍK V HLAVIČCE
 * (rozhodnutí J. V. 18. 11. 2026, maketa podklady/T1_MAKETA_KALKULATOR.html,
 * kontext podklady/kola/STAV_TEST_VZ_2026-11-18.md oddíl T1).
 *
 * Co se hlídá:
 *  1. DNEŠEK BEZE ZMĚNY (#kalk-hlavicka a #page-zakazka znak po znaku proti
 *     základu KNG_DIST_ZAKLAD = dist sestavený z 2856345, před T1; bez něj
 *     SKIP): VYP + 1 zákazník, ZAP + 1 zákazník s otevřenou neřídící variantou
 *     (tlačítko „nastavit jako řídící"), VYP + 2 zákazníci, ZAP po přidání
 *     a odstranění zákazníka (zpět jeden), VYP + 2 zákazníci (hlavička i karta
 *     se zhasnutým přepínačem — revize N4). Bez základu aspoň: tlačítko
 *     „nastavit jako řídící" je, výběry T1 a karta náhledu poznámky ne.
 *  2. Stavy makety (ZAP, A řídící na sdílené V1 s B, C vlastní V2 a nabídka
 *     z V1 i C): výchozí (popisy variant, výběr zákazníka, ★ u A, bez bloku),
 *     vlastní V2 → C řídící zamčený „🔒 automaticky" + žlutý blok + řádek
 *     v náhledu poznámky; sdílená V1 → „— vyberte —", Uložit zakázku zastaví
 *     hláška i dialog (texty z makety), výběr C → C na V1 s číslem …-C;
 *     karta: ★/☆, žádné radio, výběr varianty řídícího zamčený; potvrzení jen
 *     při změně řídícího zákazníka (J. V. d, Zrušit nic nemění), protokol při
 *     přechodu podle razítka (J. V. b), náhled poznámky noprint (N5).
 *  3. Rozložení 400 / 1200 / 1920 px bez vodorovného posuvu; snímky stavů
 *     (KNG_SNIMKY=adresář, jinak se neukládají).
 *  4. Žádná chyba stránky (pageerror).
 * Pojistka: na 2856345 (před T1) selže část 2 (výběry #vzT1Rv / #vzT1Rz
 * neexistují) — KNG_DIST=<zaklad.html> node overit_vz_t1.mjs.
 * Spuštění: node overit_vz_t1.mjs  (KNG_DIST, KNG_DIST_ZAKLAD, KNG_SNIMKY) */
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright není k dispozici.'); process.exit(2); }
const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = process.env.KNG_DIST ? pathToFileURL(process.env.KNG_DIST).href
  : new URL('dist/kalkulacka.html', import.meta.url).href;
const ZAKLAD = process.env.KNG_DIST_ZAKLAD && fs.existsSync(process.env.KNG_DIST_ZAKLAD)
  ? pathToFileURL(process.env.KNG_DIST_ZAKLAD).href : null;
const SNIMKY = process.env.KNG_SNIMKY || '';
const ZC = require(KOREN + 'src/zkusebni_cenik.js');

let ok = 0, fail = 0, preskoc = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 500)); }
};
const vsechnyChyby = [];
const b = await chromium.launch({ args: ['--no-sandbox'] });

async function otevri(url, { width = 1440, zap = false } = {}) {
  const ctx = await b.newContext({ locale: 'cs-CZ', viewport: { width, height: 1000 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => vsechnyChyby.push(String(e).slice(0, 200)));
  await p.goto(url);
  await p.waitForFunction(() => typeof window.render === 'function');
  await p.waitForTimeout(300);
  await p.evaluate(([c, cp, zap]) => {
    Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
    Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
    window.__hl = [];
    window.hlaska = (t, o) => { window.__hl.push({ t: String(t), nadpis: (o && o.nadpis) || '', ano: (o && o.ano) || '' }); return Promise.resolve(); };
    window.__potvrd = []; window.__potvrdOdpoved = true;
    window.potvrd = (t, o) => { window.__potvrd.push({ t: String(t), nadpis: (o && o.nadpis) || '' }); return Promise.resolve(window.__potvrdOdpoved); };
    window.__protokol = [];
    const pz = window.protokolZapis;
    window.protokolZapis = function (z, o) { window.__protokol.push(o); return typeof pz === 'function' ? pz.apply(this, arguments) : undefined; };
    window.confirm = () => true;
    window.fetch = async () => { throw new TypeError('Failed to fetch'); };
    if (zap) window.viceZakaznikuZapnuto = () => true;
    ZAK = novaZakazka();
    ZAK.varianty[0].id = 'v1'; ZAK.aktivni = 'v1';
    Object.assign(ZAK, { cislo: 'TEST - 2026 - OPR - CN - 9801', nazevAkce: 'Bytový dům ukázka', adresa: 'Ukázková 1, Praha',
      objednatel: 'Energie ukázka a. s.', kontakt: '', ico: '' });
    syncVarianta();
    Object.assign(Z, { sirka: 1.6, hloubka: 2.1, zdvih: 12, prejezd: 2.7, prohluben: 1.05 });
    OCK.fixes = true;
    prepniTab('kalk'); render();
  }, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj(), zap]);
  await p.waitForTimeout(150);
  return { ctx, p };
}
/* Hlavička OCK a Přehled (s maskovaným počítadlem Zpět / Znovu). */
const obrazovka = async (p) => {
  const r = await p.evaluate(() => {
    const el = document.getElementById('kalk-hlavicka');
    const c = el ? el.cloneNode(true) : null;
    if (c) c.querySelectorAll('.jsHistZpet, .jsHistZnovu').forEach(e => { e.removeAttribute('title'); e.removeAttribute('disabled'); e.textContent = ''; });
    /* Karta Zákazníci zakázky bez sloupce Řídící (T1 ho mění záměrně: ★ / ☆ místo přepínače). */
    const bezRidici = (k) => { if (!k) return ''; const x = k.cloneNode(true); x.querySelectorAll('td[data-l="Řídící"]').forEach(e => { e.innerHTML = ''; }); return x.outerHTML; };
    const bar = c ? c.querySelector('.zak-bar') : null;
    return { hlavicka: c ? c.innerHTML : '', bar: bar ? bar.outerHTML : '', karta: bezRidici(c && c.querySelector('.vz-karta')) };
  });
  await p.evaluate(() => { prepniTab('zakazka'); render(); });
  await p.waitForTimeout(100);
  r.zakazka = await p.evaluate(() => (document.getElementById('page-zakazka') || {}).innerHTML || '');
  r.zakazkaBezKarty = await p.evaluate(() => { const e = document.getElementById('page-zakazka'); if (!e) return '';
    const x = e.cloneNode(true); x.querySelectorAll('.vz-karta').forEach(k => k.remove()); return x.innerHTML; });
  await p.evaluate(() => { prepniTab('kalk'); render(); });
  await p.waitForTimeout(100);
  return r;
};
async function cast(nazev, fn) {
  try { await fn(); }
  catch (e) { test('část „' + nazev + '" doběhla bez výjimky', false, String(e && e.message || e).split('\n')[0]); }
}
const snimek = async (p, jmeno) => {
  if (!SNIMKY) return;
  fs.mkdirSync(SNIMKY, { recursive: true });
  await p.screenshot({ path: SNIMKY + '/t1_' + jmeno + '.png', fullPage: false });
};

/* Scénáře části 1 (spustí se stejně v základu i v T1). */
/* Nová varianta s pevným id (klonujVariantu dává náhodné — srovnání se základem). */
const NOVA_JS = `window.__nova = () => { varNova(); const v = ZAK.varianty[ZAK.varianty.length - 1]; v.id = 'v2'; ZAK.aktivni = 'v2'; syncVarianta(); render(); };`;
const SCENARE = {
  'VYP + 1 zákazník, otevřená neřídící varianta': { zap: false, js: () => { __nova(); } },
  'ZAP + 1 zákazník, otevřená neřídící varianta': { zap: true, js: () => { __nova(); } },
  'VYP + 2 zákazníci (data), otevřená neřídící varianta': { zap: false, js: () => {
    __nova(); vzPridej(ZAK, { objednatel: 'Stavby ukázka a. s.' }, { kdo: 't', kdy: '2026-11-18T10:00:00.000Z' }); render(); } },
  'ZAP: přidán a odstraněn zákazník (zpět jeden)': { zap: true, js: () => {
    __nova(); vzPridej(ZAK, { objednatel: 'Stavby ukázka a. s.' }, { kdo: 't', kdy: '2026-11-18T10:00:00.000Z' }); render();
    vzOdstran(ZAK, 'z2'); render(); } },
};

/* ---------- 1: dnešek beze změny ---------- */
await cast('1 dnešek', async () => {
  for (const [nazev, s] of Object.entries(SCENARE)) {
    const t = await otevri(KDE, { zap: s.zap });
    await t.p.evaluate(NOVA_JS);
    await t.p.evaluate(s.js);
    await t.p.waitForTimeout(120);
    const st = await t.p.evaluate(() => ({
      btn: [...document.querySelectorAll('#kalk-hlavicka button')].some(x => /nastavit jako řídící/.test(x.textContent)),
      t1: !!document.getElementById('vzT1Rv') || !!document.getElementById('vzT1Rz') || !!document.querySelector('[data-vz-t1-org]'),
      pozn: !!document.querySelector('[id^="vzPoznKarta_"]'), vz: 'vzRidici' in ZAK }));
    test(nazev + ': tlačítko „nastavit jako řídící", žádný výběr T1 ani náhled poznámky', st.btn && !st.t1 && !st.pozn, st);
    const sT = await obrazovka(t.p);
    if (ZAKLAD) {
      const z = await otevri(ZAKLAD, { zap: s.zap });
      await z.p.evaluate(NOVA_JS);
      await z.p.evaluate(s.js);
      await z.p.waitForTimeout(120);
      const sZ = await obrazovka(z.p);
      if (s.karta) {
        /* Víc zákazníků s VYP: hlavička (karta .zak-bar) znak po znaku; karta Zákazníci zakázky jen bez sloupce Řídící. */
        test(nazev + ': hlavička zakázky (.zak-bar) znak po znaku jako 2856345', sT.bar && sT.bar === sZ.bar, sT.bar.length + ' / ' + sZ.bar.length);
        test(nazev + ': karta Zákazníci zakázky jako 2856345 kromě sloupce Řídící', sT.karta && sT.karta === sZ.karta, sT.karta.length + ' / ' + sZ.karta.length);
        test(nazev + ': Přehled bez karty zákazníků znak po znaku jako 2856345', sT.zakazkaBezKarty === sZ.zakazkaBezKarty, sT.zakazkaBezKarty.length + ' / ' + sZ.zakazkaBezKarty.length);
      } else {
        test(nazev + ': #kalk-hlavicka znak po znaku jako 2856345', sT.hlavicka === sZ.hlavicka, sT.hlavicka.length + ' / ' + sZ.hlavicka.length);
        test(nazev + ': Přehled (#page-zakazka) znak po znaku jako 2856345', sT.zakazka === sZ.zakazka, sT.zakazka.length + ' / ' + sZ.zakazka.length);
      }
      await z.ctx.close();
    } else { preskoc++; console.log('SKIP ' + nazev + ': srovnání se základem 2856345 (KNG_DIST_ZAKLAD)'); }
    await t.ctx.close();
  }
});

/* ---------- 2: stavy makety ---------- */
await cast('2 stavy makety', async () => {
  const { p, ctx } = await otevri(KDE, { zap: true });
  await p.evaluate(() => {
    /* A (z1) a B (z2) na V1, C (z3) vlastní V2; V1 odešla A, B i C (C z ní dostal …9801-C). */
    vzPridej(ZAK, { objednatel: 'Stavby ukázka a. s.' }, { kdo: 't', kdy: '2026-11-17T10:00:00.000Z' });
    vzPridej(ZAK, { objednatel: 'TEST VZ Zákazník C s.r.o.' }, { kdo: 't', kdy: '2026-11-17T10:00:00.000Z', vlastni: true });
    const v1 = ZAK.varianty[0];
    const info = (id, prvni) => Object.assign({ typ: 'nabidka', kdo: 'test@priklad.cz', kdy: '2026-11-17T10:00:00.000Z', cislo: variantaCislo(ZAK, v1),
      zakaznik: vzRazitkoSnimek(ZAK, id, v1) }, prvni ? { vysledek: zamekVysledekSpocti(v1, JEKLY, 't1'), snimek: zamekSnimekSpocti(v1) } : {});
    zamkniVariantu(v1, info('z1', true)); zamkniVariantu(v1, info('z2')); zamkniVariantu(v1, info('z3'));
    ZAK.pdDealId = '4242';
    render();
  });
  await p.waitForTimeout(150);
  const stav = () => p.evaluate(() => {
    const t = s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
    const rv = document.getElementById('vzT1Rv'), rz = document.getElementById('vzT1Rz');
    return {
      rv: rv ? { hodnota: rv.value, volby: [...rv.options].map(o => o.textContent), disabled: rv.disabled } : null,
      rz: rz ? { hodnota: rz.value, volby: [...rz.options].map(o => o.value + '|' + o.textContent), disabled: rz.disabled, trida: rz.className, title: rz.title } : null,
      rzPill: t('.vz-t1-rz label .pill'), vysv: t('.vz-t1-vysv'), blok: t('[data-vz-t1-org]'),
      tlRidici: [...document.querySelectorAll('#kalk-hlavicka button')].some(x => /nastavit jako řídící/.test(x.textContent)),
      hvezdy: [...document.querySelectorAll('#vzKarta_ock [data-vz-ridici]')].map(x => x.getAttribute('data-vz-ridici') + x.textContent),
      radio: !!document.querySelector('#vzKarta_ock input[type="radio"]'),
      cisla: Object.fromEntries([...document.querySelectorAll('#vzKarta_ock tr[data-vz]')].map(r => [r.getAttribute('data-vz'), t('#vzKarta_ock tr[data-vz="' + r.getAttribute('data-vz') + '"] .vz-cislo')])),
      pozn: (document.querySelector('#vzPoznKarta_ock pre') || {}).textContent || null,
      poznNote: t('#vzPoznKarta_ock .note'),
      ridici: ZAK.vzRidici && ZAK.vzRidici.id, rvId: (ZAK.varianty.find(v => v.ridici) || {}).id, uk: ZAK.vzRidici && ZAK.vzRidici.varianta,
    };
  });
  const vC = await p.evaluate(() => ZAK.dalsiZakaznici.find(d => d.id === 'z3').varianta);
  let s = await stav();
  test('výchozí: Řídící varianta „Varianta 1 (sdílená)" vybraná, V2 „(vlastní C — …)", tlačítko „nastavit jako řídící" není',
    s.rv && s.rv.hodnota === 'v1' && s.rv.volby[0] === 'Varianta 1 (sdílená)' && s.rv.volby[1] === 'Varianta 2 (vlastní C — TEST VZ Zákazník C s.r.o.)' && !s.tlRidici, s.rv);
  test('výchozí: Řídící zákazník povinný, A vybraný, nabízí A, B, C (C z razítka)', s.rz && s.rz.hodnota === 'z1' && !s.rz.disabled && s.rzPill === 'povinné'
    && s.rz.volby.join() === 'z1|Energie ukázka a. s.,z2|B — Stavby ukázka a. s.,z3|C — TEST VZ Zákazník C s.r.o.', s.rz);
  test('výchozí: vysvětlení „sdílená — patří … (C z ní dostal nabídku …9801-C)"', /^Varianta 1 je sdílená — patří zákazníkům Energie ukázka a\. s\., Stavby ukázka a\. s\. a TEST VZ Zákazník C s\.r\.o\. \(C z ní dostal nabídku TEST - 2026 - OPR - CN - 9801-C\)\. Nabízejí se jen zákazníci, kterým varianta patří\.$/.test(s.vysv || ''), s.vysv);
  test('výchozí: žádný žlutý blok, karta ★ u A, ☆ u B a C, žádné radio', s.blok === null && s.hvezdy.sort().join() === 'z1★,z2☆,z3☆' && !s.radio, s);
  test('výchozí: náhled poznámky — B a C, bez řádku T1, organizace dealu Energie', /^Další zákazníci na zakázce:\n• Stavby ukázka/.test(s.pozn || '')
    && !/Řídící zákazník v kalkulaci/.test(s.pozn) && /Organizace dealu: Energie ukázka a\. s\. \(odhad — ověří se při uložení\) — mění se až prodejem/.test(s.poznNote || ''), s);
  await snimek(p, '1_vychozi');

  /* rozhodnutí J. V. (d): potvrzení jen při změně řídícího zákazníka — Zrušit nic nezmění */
  await p.evaluate(() => { __potvrd.length = 0; __potvrdOdpoved = false; });
  await p.selectOption('#vzT1Rv', vC);
  await p.waitForTimeout(150);
  s = await stav();
  const pz = await p.evaluate(() => __potvrd.slice());
  test('d) vlastní V2: potvrzení „Řídícím zákazníkem bude C — … — hlavička zakázky se změní." a Zrušit nic nezmění', pz.length === 1
    && pz[0].t === 'Řídícím zákazníkem bude C — TEST VZ Zákazník C s.r.o. — hlavička zakázky se změní.' && pz[0].nadpis === 'Řídící zákazník'
    && s.ridici === 'z1' && s.rvId === 'v1' && s.rv.hodnota === 'v1', { pz, s: [s.ridici, s.rvId, s.rv.hodnota] });
  await p.evaluate(() => { __potvrd.length = 0; __potvrdOdpoved = true; });
  await p.selectOption('#vzT1Rv', vC);
  await p.waitForTimeout(150);
  s = await stav();
  test('vlastní V2 → řídícím C, řídící varianta V2, ukazatel sedí', s.ridici === 'z3' && s.rvId === vC && s.uk === vC, s);
  test('vlastní V2: Řídící zákazník „🔒 automaticky", zamčený, C', s.rz && s.rz.disabled && /vz-t1-zamek/.test(s.rz.trida) && s.rzPill === '🔒 automaticky'
    && s.rz.volby.join() === 'C — TEST VZ Zákazník C s.r.o.|C — TEST VZ Zákazník C s.r.o.' && /^🔒 Varianta 2 je vlastní varianta zákazníka C/.test(s.rz.title), s.rz);
  test('vlastní V2: vysvětlení pod polem (text makety)', s.vysv === 'Varianta 2 je vlastní varianta zákazníka C — TEST VZ Zákazník C s.r.o., proto je řídícím zákazníkem automaticky on. Jiného řídícího zákazníka vyberete se sdílenou variantou.', s.vysv);
  test('vlastní V2: žlutý blok pod Stavem Pipedrive', s.blok === 'Řídící zákazník v kalkulaci: C — TEST VZ Zákazník C s.r.o. (organizace dealu se změní až prodejem; deal dál vede Energie ukázka a. s.)', s.blok);
  test('vlastní V2: blok stojí hned pod řádkem Stav Pipedrive', await p.evaluate(() => { const b = document.querySelector('[data-vz-t1-org]');
    return !!b && !!b.previousElementSibling && b.previousElementSibling.classList.contains('pd-stav-radek'); }));
  test('N5 karta náhledu poznámky má noprint', await p.evaluate(() => document.getElementById('vzPoznKarta_ock').classList.contains('noprint')));
  test('vlastní V2: náhled poznámky — A a B mezi dalšími, řádek T1, značka', /• Energie ukázka a\. s\./.test(s.pozn) && /• Stavby ukázka/.test(s.pozn)
    && !/• TEST VZ Zákazník C/.test(s.pozn) && /\nŘídící zákazník v kalkulaci: C — TEST VZ Zákazník C s\.r\.o\. \(organizace dealu se změní až prodejem\)\n— nabídka TEST - 2026 - OPR - CN - 9801$/.test(s.pozn), s.pozn);
  test('vlastní V2: karta ★ u C, výběr varianty C zamčený s vysvětlením', s.hvezdy.sort().join() === 'z1☆,z2☆,z3★' && await p.evaluate(() => {
    const sel = document.querySelector('#vzKarta_ock tr[data-vz="z3"] select'); return !!sel && sel.disabled && /určuje hlavička/.test(sel.title); }), s.hvezdy);
  await snimek(p, '2_vlastni');

  await p.selectOption('#vzT1Rv', 'v1');
  await p.waitForTimeout(150);
  s = await stav();
  test('sdílená V1: čeká — „— vyberte —", data beze změny (řídící C na V2)', s.rz && s.rz.hodnota === '' && s.rz.volby[0] === '|— vyberte —' && s.ridici === 'z3'
    && s.rvId === vC && s.rv.hodnota === 'v1' && /bez výběru zakázku nejde uložit/.test(s.vysv), s);
  test('sdílená V1: žlutý blok skrytý, dokud řídící není vybraný', s.blok === null, s.blok);
  test('sdílená V1: náhled „řídící zákazník není vybrán"', /\(řídící zákazník není vybrán — poznámka se zapíše až s uložením\)/.test(s.pozn), s.pozn);
  await snimek(p, '3_sdilena_prazdna');
  await p.evaluate(() => { __hl.length = 0; });
  await p.click('#kalk-hlavicka button.vyzva, #kalk-hlavicka .zak-cena button:first-child');
  await p.waitForTimeout(250);
  const ul = await p.evaluate(() => ({ hl: __hl.slice(), radek: [...document.querySelectorAll('#kalk-hlavicka .zak-ulozeni')].map(e => e.textContent.trim()),
    trida: document.getElementById('vzT1Rz').className, vysv: document.querySelector('.vz-t1-vysv').className }));
  test('Uložit zakázku: dialog „Zakázku nejde uložit" s textem makety a tlačítkem Rozumím', ul.hl.length === 1 && ul.hl[0].nadpis === 'Zakázku nejde uložit'
    && ul.hl[0].ano === 'Rozumím' && ul.hl[0].t === 'Řídící varianta „Varianta 1“ je sdílená. Vyberte v hlavičce Řídící zákazník — jednoho ze zákazníků, kterým varianta patří (Energie ukázka a. s., B — Stavby ukázka a. s., C — TEST VZ Zákazník C s.r.o.).', ul.hl);
  test('Uložit zakázku: hláška pod lištou (text makety), výběr červeně', ul.radek.includes('Zakázka se neuložila. Řídící varianta „Varianta 1“ je sdílená — vyberte v hlavičce Řídící zákazník (Energie ukázka a. s., Stavby ukázka a. s. a TEST VZ Zákazník C s.r.o.).')
    && /vz-t1-chybi/.test(ul.trida) && /vz-t1-vysv-chyba/.test(ul.vysv), ul);
  await snimek(p, '4_chyba');

  await p.evaluate(() => { __potvrd.length = 0; __protokol.length = 0; });
  await p.selectOption('#vzT1Rz', 'z3');
  await p.waitForTimeout(150);
  s = await stav();
  const pr = await p.evaluate(() => ({ potvrd: __potvrd.length, protokol: __protokol.map(x => x.co) }));
  test('d) výběr C u sdílené V1, C už řídící → bez potvrzení; b) protokol „přešel na variantu … podle odeslané nabídky …-C"', pr.potvrd === 0
    && pr.protokol.some(t => t === 'Řídící zákazník C — TEST VZ Zákazník C s.r.o. přešel na variantu „Varianta 1“ podle odeslané nabídky TEST - 2026 - OPR - CN - 9801-C'), pr);
  test('výběr C u sdílené V1 → C řídícím na V1, číslo nabídky C …9801-C', s.ridici === 'z3' && s.rvId === 'v1' && s.uk === 'v1'
    && s.cisla.z3 === 'TEST - 2026 - OPR - CN - 9801-C' && s.rz.hodnota === 'z3' && !/vz-t1-chybi/.test(s.rz.trida), s);
  test('po výběru: hláška o neuložení zmizela', await p.evaluate(() => ![...document.querySelectorAll('#kalk-hlavicka .zak-ulozeni')].some(e => /neuložila/.test(e.textContent))));
  await snimek(p, '5_C');

  /* Seznam variant (sloupec Řídící) jde přes T1 */
  await p.evaluate(() => varRidici(ZAK.dalsiZakaznici.find(d => d.id === 'z3') ? 'v1' : 'v1'));
  test('varRidici na dnešní řídící: nic se nezmění', (await stav()).ridici === 'z3');

  /* rozložení */
  for (const w of [400, 1200, 1920]) {
    await p.setViewportSize({ width: w, height: 1000 });
    await p.waitForTimeout(150);
    test(`${w} px: bez vodorovného posuvu`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]));
  }
  await p.setViewportSize({ width: 1440, height: 1000 });

  /* zpět jeden zákazník: hlavička dnešní */
  await p.evaluate(() => { const r = vzT1Nastav(ZAK, 'v1', 'z1'); if (!r.ok) throw new Error(r.chyba); });
  await p.evaluate(NOVA_JS);
  await p.evaluate(() => { ['z3', 'z2'].forEach(id => { ZAK.varianty.forEach(v => { delete v.zamek; }); const r = vzOdstran(ZAK, id); if (!r.ok) throw new Error(id + ' ' + r.chyba); }); __nova(); });
  await p.waitForTimeout(150);
  s = await stav();
  test('po odstranění na jednoho: výběry T1 pryč, tlačítko „nastavit jako řídící" zpět, bez náhledu poznámky', !s.rv && !s.rz && s.tlRidici && s.pozn === null, s);
  await ctx.close();
});

test('žádná chyba stránky (pageerror) v celém běhu', vsechnyChyby.length === 0, vsechnyChyby);
await b.close();
console.log(`\nVýsledek: ${ok} OK, ${fail} FAIL${preskoc ? ', ' + preskoc + ' přeskočeno' : ''}`);
process.exit(fail ? 1 : 0);
