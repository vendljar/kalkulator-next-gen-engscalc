/* Ověření v prohlížeči: dávka DO — dotazy obchodníků z 16. 11. 2026
 * (rozhodnutí J. V. 19. 11. 2026). Jádro hlídá src/test_do_dotazy.js,
 * serverový sběr návrhů netlify/test_prava.mjs (D6); tady obrazovka:
 *
 *   D1  „po celé výšce" = jediný pás bez ohledu na začátek: po „Opláštit
 *       i prohlubeň" zůstane zaškrtnuté, zaškrtnutí nemění začátek ani
 *       opláštění prohlubně; „Opláštění začíná" je vidět i u stěny po celé
 *       výšce; začátek pod dnem prohlubně se ohlásí i u ní.
 *   D2  volba „bez opláštění" (klíč `bez`); nově zvolený spodní pás dostane
 *       „do (m)" = 0 a žluté „nemá dělicí výšku" nevznikne; hodnota jde
 *       přepsat; nákres kreslí pás od dna prohlubně po nulu; cena beze změny.
 *   D4  Volitelné: montáž hned pod materiálem, materiál „… (MATERIÁL)";
 *       ruční pořadí z přetažení zůstane.
 *   D5  příplatky: materiál zaškrtne/odškrtne i montáž, montáž jde sama
 *       odškrtnout i zaškrtnout; zamčená varianta beze změny.
 *   D6  administrátor: po uložení „uloženo pro všechny nové zakázky" (zmizí);
 *       obchodník: „jen pro tuto zakázku" + „navrhnout do číselníku" → návrh
 *       ve variantě; bez přihlášení tlačítko není; zapisovač je pod zámkem.
 *   D7  seznam nabídek: adresa tučně nahoře, pod ní šedě akce; bez adresy jen
 *       akce; hledání najde zakázku podle adresy i akce jako dřív.
 *
 * Spuštění: node overit_do_dotazy.mjs (po python3 build.py)
 */
import { chromium } from 'playwright';
import { createRequire } from 'module';

const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail))); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
const chyby = [];
p.on('pageerror', e => chyby.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') chyby.push('error: ' + m.text()); });
p.on('dialog', d => d.dismiss().catch(() => {}));
await p.goto(KDE);
await p.waitForFunction(() => typeof NAST !== 'undefined' && typeof render === 'function', null, { timeout: 15000 });
await p.waitForTimeout(400);

const ZC = createRequire(import.meta.url)('./src/zkusebni_cenik.js');
const nova = (o) => p.evaluate(([c, cp, o]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  ZAK = novaZakazka(); syncVarianta();
  Object.assign(Z, { typSachty: 'exteriérová', profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová'])),
    sirka: 1.5, hloubka: 1.5, zdvih: 12, prejezd: 3, prohluben: 1.1, nastupiste: 4 }, o || {});
  OCK.fixes = true;
  prepniTab('kalk'); render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj(), o || {}]);

/* ===================== D1 ===================== */
await nova();
await p.evaluate(() => { oplRezimSet('poStenach'); });
const stenaStav = (k) => p.evaluate((k) => {
  prepniTab('kalk'); render();
  const st = [...document.querySelectorAll('#ock-oplasteni-steny .opl-stena')]['ABCD'.indexOf(k)];
  const chk = st && [...st.querySelectorAll('input[type=checkbox]')].find(e => /oplCelaVyskaSet/.test(e.getAttribute('onchange') || ''));
  const od = st && [...st.querySelectorAll('input')].find(e => /oplOdSet/.test(e.getAttribute('onchange') || ''));
  const s = Z.oplasteni.steny[k];
  return { cela: !!(chk && chk.checked), odPole: od ? od.value : null, odM: s.odM, pasu: s.pasy.length,
    varovani: (st && st.querySelector('.seznam-varovani') || {}).textContent || '',
    prohlVse: oplasteniProhlubenVse(Z) };
}, k);
let s1 = await stenaStav('B');
zkus('D1: výchozí stěna je po celé výšce a „Opláštění začíná" je vidět i u ní (0)', s1.cela && s1.odPole === '0', s1);
await p.evaluate(() => prohlubenSkloSet(true));
s1 = await stenaStav('B');
zkus('D1: po „Opláštit i prohlubeň" zůstává „po celé výšce" zaškrtnuté (začátek −1,1)',
  s1.cela && s1.odM === -1.1 && s1.odPole === '-1.1' && s1.prohlVse, s1);
const cenaPred = await p.evaluate(() => vypocetSachtyAkt().souhrn.zakladCena);
await p.evaluate(() => oplCelaVyskaSet('B', false));
s1 = await stenaStav('B');
zkus('D1: odškrtnutí stěnu rozdělí na dva pásy, začátek zůstane −1,1', !s1.cela && s1.pasu === 2 && s1.odM === -1.1, s1);
await p.evaluate(() => oplCelaVyskaSet('B', true));
s1 = await stenaStav('B');
zkus('D1: ruční zaškrtnutí NEVRACÍ začátek na 0 a NERUŠÍ opláštění prohlubně',
  s1.cela && s1.pasu === 1 && s1.odM === -1.1 && s1.prohlVse, s1);
zkus('D1: cena po odškrtnutí a zaškrtnutí beze změny',
  await p.evaluate(() => vypocetSachtyAkt().souhrn.zakladCena) === cenaPred);
await p.evaluate(() => oplOdSet('B', '-3'));
s1 = await stenaStav('B');
zkus('D1: začátek pod dnem prohlubně se ohlásí i u stěny po celé výšce', s1.cela && /pod dnem prohlubně/.test(s1.varovani), s1);
await p.evaluate(() => oplOdSet('B', '-1.1'));

/* ===================== D2 ===================== */
const typy = await p.evaluate(() => {
  render();
  const sel = document.querySelector('#ock-oplasteni-steny select.opl-s1');
  return sel ? [...sel.options].map(o => [o.value, o.textContent.trim()]) : [];
});
zkus('D2: volba se jmenuje „bez opláštění" a má klíč `bez`', typy.some(([v, t]) => v === 'bez' && t === 'bez opláštění'), typy);
zkus('D2: „dodá stavba" ve výběru není', !typy.some(([, t]) => /dodá stavba/.test(t)), typy);
await p.evaluate(() => { oplCelaVyskaSet('B', false); });
const cenaRozd = await p.evaluate(() => vypocetSachtyAkt().souhrn.zakladCena);
await p.evaluate(() => {
  /* Výběr na obrazovce: select spodního pásu (vypisuje se odshora, spodní je poslední). */
  const st = document.querySelectorAll('#ock-oplasteni-steny .opl-stena')[1];
  const sel = [...st.querySelectorAll('select')].find(e => /oplPasSet\('B', 0, 'typ'/.test(e.getAttribute('onchange') || ''));
  sel.value = 'bez'; sel.dispatchEvent(new Event('change'));
});
let s2 = await stenaStav('B');
const doM0 = await p.evaluate(() => Z.oplasteni.steny.B.pasy[0].doM);
zkus('D2: nově zvolený spodní pás „bez opláštění" má „do (m)" = 0', doM0 === 0, doM0);
zkus('D2: žluté „nemá dělicí výšku" nevznikne', !/nemá dělicí výšku/.test(s2.varovani), s2.varovani);
const pole = await p.evaluate(() => {
  const st = document.querySelectorAll('#ock-oplasteni-steny .opl-stena')[1];
  const i = [...st.querySelectorAll('input')].find(e => /oplPasSet\('B', 0, 'doM'/.test(e.getAttribute('onchange') || ''));
  return i ? i.value : null;
});
zkus('D2: pole „do (m)" ukazuje 0', pole === '0', pole);
const cenaBez = await p.evaluate(() => {
  const z = JSON.parse(JSON.stringify(Z)); z.oplasteni.steny.B.pasy[0].doM = null;
  const v = aktivniVarianta(ZAK);
  return [vypocet(z, v.data.cenik, JEKLY, OCK.fixes).souhrn.zakladCena, vypocetSachtyAkt().souhrn.zakladCena];
});
zkus('D2: předvyplněná nula dává tutéž cenu jako prázdná výška', cenaBez[0] === cenaBez[1], cenaBez);
const nakres = await p.evaluate(() => {
  const st = document.querySelectorAll('#ock-oplasteni-steny .opl-stena')[1];
  return { bez: st.querySelectorAll('.opl-pas-bez').length, koty: [...st.querySelectorAll('.opl-kota')].map(e => e.textContent.trim()) };
});
zkus('D2: nákres kreslí pás bez opláštění od dna prohlubně po úroveň nástupu',
  nakres.bez === 1 && nakres.koty.includes('0') && nakres.koty.some(t => /-1,1/.test(t)), nakres);
await p.evaluate(() => oplPasSet('B', 0, 'doM', '0,5'));
zkus('D2: obchodník hodnotu přepíše (0,5) a zůstane', await p.evaluate(() => Z.oplasteni.steny.B.pasy[0].doM) === 0.5);
await p.evaluate(() => { oplPasSet('B', 0, 'typ', 'C.cetrisKc'); oplPasSet('B', 0, 'typ', 'bez'); });
zkus('D2: znovuzvolení „bez" ruční výšku nepřepíše', await p.evaluate(() => Z.oplasteni.steny.B.pasy[0].doM) === 0.5);
zkus('D2: pás přidaný nad „bez" (kopie posledního) dostane 0 jen když je „bez" a výšku nemá',
  await p.evaluate(() => { oplPasSet('B', 1, 'typ', 'bez'); oplPasPridej('B'); const ps = Z.oplasteni.steny.B.pasy;
    return ps.length === 3 && ps[1].typ === 'bez' && ps[1].doM === 0 && ps[2].doM == null; }));
zkus('D2: rozdělení stěny s pásem „bez" dostane u spodního pásu 0 (ne prázdno)',
  await p.evaluate(() => { oplPasSmaz('B', 2); oplPasSmaz('B', 1); oplPasSet('B', 0, 'typ', 'bez');
    oplCelaVyskaSet('B', false); const ps = Z.oplasteni.steny.B.pasy;
    return ps.length === 2 && ps[0].typ === 'bez' && ps[0].doM === 0 && ps[1].doM == null; }));
zkus('(předpoklad: cena rozdělené stěny se dá změřit)', typeof cenaRozd === 'number' && cenaRozd > 0, cenaRozd);

/* ===================== D4 ===================== */
await nova({ prechodovePlechy: true });
const vol = await p.evaluate(() => {
  render();
  const r = vypocetSachtyAkt();
  const kat = serazSekci(r.volitelneKatalog, 'volitelne');
  const radky = [...document.querySelectorAll('#page-kalk input.nazev-ed')].map(e => e.value);
  return { klice: kat.map(x => x.key), radky };
});
const iM = vol.klice.indexOf('prechodove');
zkus('D4: ve Volitelných montáž hned pod materiálem', iM >= 0 && vol.klice[iM + 1] === 'prechMont', vol.klice);
const iR = vol.radky.indexOf('PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)');
zkus('D4: tabulka ukazuje „PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)" a pod ním montáž',
  iR >= 0 && vol.radky[iR + 1] === 'PŘECHODOVÉ PLECHY - NEREZ (MONTÁŽ)', vol.radky.filter(t => /PŘECHOD|LEŠENÍ/.test(t)));
const rucni = await p.evaluate(() => {
  Z.poradi = { volitelne: ['leseniVnitrni', 'prechMont', 'leseniVnejsi', 'prechodove'] };
  return serazSekci(vypocetSachtyAkt().volitelneKatalog, 'volitelne').map(x => x.key).slice(0, 4);
});
zkus('D4: ruční pořadí z přetažení zůstává', JSON.stringify(rucni) === JSON.stringify(['leseniVnitrni', 'prechMont', 'leseniVnejsi', 'prechodove']), rucni);

/* ===================== D5 ===================== */
await nova({ prechodovePlechy: false });
const vyn = () => p.evaluate(() => ['prechMat', 'prechMont'].filter(k => (Z.priplatkyVynechat || []).includes(k)));
await p.evaluate(() => { Z.priplatkyVynechat = ['prechMat', 'prechMont']; });
const cenaD5 = await p.evaluate(() => vypocetSachtyAkt().souhrn.zakladCena);
await p.evaluate(() => priplatekNabidka('prechMat', true));
zkus('D5: zaškrtnutí materiálu zaškrtne i montáž', (await vyn()).length === 0, await vyn());
await p.evaluate(() => priplatekNabidka('prechMont', false));
zkus('D5: montáž jde potom samostatně odškrtnout (materiál zůstane)', JSON.stringify(await vyn()) === '["prechMont"]', await vyn());
await p.evaluate(() => priplatekNabidka('prechMat', false));
zkus('D5: odškrtnutí materiálu odškrtne obě', (await vyn()).length === 2, await vyn());
await p.evaluate(() => priplatekNabidka('prechMont', true));
zkus('D5: samostatné zaškrtnutí montáže bez materiálu zůstává možné', JSON.stringify(await vyn()) === '["prechMat"]', await vyn());
await p.evaluate(() => priplatekNabidka('prechMont', false));
await p.evaluate(() => priplatekNabidka('prechMat', true));
const dom = await p.evaluate(() => {
  NAST.jeAdmin = true; prepniTab('kalk'); render();
  const chk = k => { const e = [...document.querySelectorAll('#page-kalk input[type=checkbox]')]
    .find(x => (x.getAttribute('onchange') || '') === `priplatekNabidka('${k}', this.checked)`); return e ? e.checked : null; };
  return { mat: chk('prechMat'), mont: chk('prechMont') };
});
zkus('D5: na obrazovce svítí po zaškrtnutí materiálu obě zaškrtávátka', dom.mat === true && dom.mont === true, dom);
zkus('D5: základní cena se klikáním nezměnila', await p.evaluate(() => vypocetSachtyAkt().souhrn.zakladCena) === cenaD5);
zkus('D5: priplatekNabidka je pod zámkem varianty', await p.evaluate(() => !!(window.priplatekNabidka && window.priplatekNabidka._zamek)));
const zam = await p.evaluate(() => {
  const v = aktivniVarianta(ZAK);
  zamkniVariantu(v, { cislo: ZAK.cislo || 'T' });
  const pred = JSON.stringify(Z.priplatkyVynechat);
  try { priplatekNabidka('prechMat', false); } catch (e) { /* hláška */ }
  const po = JSON.stringify(Z.priplatkyVynechat);
  return { pred, po, zamcena: !variantaEditovatelna(v) };
});
zkus('D5: zamčená varianta se klikem na materiál nezmění', zam.zamcena && zam.pred === zam.po, zam);

/* ===================== D6 ===================== */
await nova({ prechodovePlechy: false });
const KLIC = 'PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)';
const d6 = (stav) => p.evaluate(([k, stav]) => {
  NAST.jeAdmin = !!stav.admin;
  ONLINE_STAV.ja = stav.online ? { email: 'obchodnik@priklad.cz', role: stav.admin ? 'Administrátor' : 'Obchodník', jmeno: 'Test' } : null;
  prepniTab('kalk'); render();
  const inp = [...document.querySelectorAll('#page-kalk input[type=text]')]
    .find(e => (e.getAttribute('onchange') || '').indexOf("popisSet('" + k) === 0);
  const td = inp && inp.parentElement;
  return {
    je: !!inp,
    jen: td ? (td.querySelector('.popis-jen-zakazka') || {}).textContent || '' : '',
    tlac: td ? !!td.querySelector('.popis-navrhnout') : false,
    navrzeno: td ? !!td.querySelector('.popis-navrzeno') : false,
    stav: td ? (td.querySelector('[data-popis-stav]') || {}).textContent : null,
    maStav: td ? !!td.querySelector('[data-popis-stav]') : false,
  };
}, [KLIC, stav]);
let o = await d6({ admin: false, online: true });
zkus('D6: obchodník vidí u pole „jen pro tuto zakázku"', o.je && /jen pro tuto zakázku/.test(o.jen), o);
zkus('D6: bez textu tlačítko „navrhnout do číselníku" není', !o.tlac, o);
await p.evaluate((k) => popisSet(k, 'Věta obchodníka.'), KLIC);
o = await d6({ admin: false, online: true });
zkus('D6: s vlastním textem je tlačítko „navrhnout do číselníku"', o.tlac && !o.navrzeno, o);
await p.evaluate(() => { const t = document.querySelector('.popis-navrhnout'); if (t) t.click(); });
o = await d6({ admin: false, online: true });
const navrh = await p.evaluate((k) => (aktivniVarianta(ZAK).popisyNavrhy || {})[k], KLIC);
zkus('D6: návrh se zapíše do varianty a u pole je „navrženo do číselníku"', navrh === 'Věta obchodníka.' && o.navrzeno && !o.tlac, { navrh, o });
zkus('D6: návrh nemění text ani ceník varianty (jen návrh)',
  await p.evaluate((k) => cenikPopis(C, k) === 'Věta obchodníka.', KLIC));
await p.evaluate((k) => popisSet(k, 'Jiná věta.'), KLIC);
o = await d6({ admin: false, online: true });
zkus('D6: po změně textu je tlačítko zase k dispozici (starý návrh neplatí)', o.tlac && !o.navrzeno, o);
o = await d6({ admin: false, online: false });
zkus('D6: bez přihlášení jen poznámka, tlačítko není', /jen pro tuto zakázku/.test(o.jen) && !o.tlac, o);
zkus('D6: popisNavrhni je pod zámkem varianty', await p.evaluate(() => !!(window.popisNavrhni && window.popisNavrhni._zamek)));
/* Administrátor: zápis do číselníku (server zastoupený) → hláška u pole. */
await p.evaluate(() => { window._puvodniPopisUloz = onlinePopisUloz; window.onlinePopisUloz = () => Promise.resolve(true); });
o = await d6({ admin: true, online: true });
zkus('D6: administrátor nevidí „jen pro tuto zakázku" ani tlačítko', o.je && !o.jen && !o.tlac && o.maStav && o.stav === '', o);
await p.evaluate((k) => popisSet(k, 'Věta administrátora.'), KLIC);
await p.waitForTimeout(150);
o = await d6({ admin: true, online: true });
zkus('D6: po uložení se u pole ukáže „uloženo pro všechny nové zakázky"', o.stav === 'uloženo pro všechny nové zakázky', o);
await p.waitForTimeout(4300);
const poChvili = await p.evaluate((k) => {
  const e = [...document.querySelectorAll('[data-popis-stav]')].find(x => x.getAttribute('data-popis-stav') === k);
  return e ? e.textContent : null;
}, KLIC);
zkus('D6: hláška po chvíli zmizí', poChvili === '', poChvili);
await p.evaluate(() => { window.onlinePopisUloz = () => Promise.resolve(false); });
await p.evaluate((k) => popisSet(k, 'Neuložená věta.'), KLIC);
await p.waitForTimeout(150);
o = await d6({ admin: true, online: true });
zkus('D6: když server neuloží, „uloženo" se neukáže', o.stav === '', o);
await p.evaluate(() => { window.onlinePopisUloz = window._puvodniPopisUloz; NAST.jeAdmin = false; ONLINE_STAV.ja = null; });

/* ===================== D7 ===================== */
const d7 = await p.evaluate(() => {
  const s = (z) => { const t = document.createElement('table'); t.innerHTML = onlineRadekZakazky(z, false);
    const td = t.querySelectorAll('td')[1]; return { b: (td.querySelector('b') || {}).textContent, akce: (td.querySelector('.rejstrik-akce') || {}).textContent || '',
      sedy: td.querySelector('.rejstrik-akce') ? td.querySelector('.rejstrik-akce').style.color : '', html: td.innerHTML }; };
  return {
    s: s({ soubor: 'a.json', cislo: '2026 - OPR - CN - 0001', nazevAkce: 'Výtah — přístavba', adresa: 'Zkušební 12, Brno', objednatel: 'TEST' }),
    bez: s({ soubor: 'b.json', cislo: '2026 - OPR - CN - 0002', nazevAkce: 'Výtah bez adresy', adresa: '', objednatel: 'TEST' }),
    hledA: uloHledej([{ soubor: 'a.json', cislo: '1', nazevAkce: 'Výtah — přístavba', adresa: 'Zkušební 12, Brno' }], 'zkušební').length,
    hledB: uloHledej([{ soubor: 'a.json', cislo: '1', nazevAkce: 'Výtah — přístavba', adresa: 'Zkušební 12, Brno' }], 'přístavba').length,
  };
});
zkus('D7: seznam nabídek — adresa tučně nahoře', d7.s.b === 'Zkušební 12, Brno', d7.s);
zkus('D7: pod adresou šedě název akce', d7.s.akce === 'Výtah — přístavba' && /rgb\(107, 118, 134\)/.test(d7.s.sedy), d7.s);
zkus('D7: bez adresy zůstane jen název akce', d7.bez.b === 'Výtah bez adresy' && !d7.bez.akce, d7.bez);
zkus('D7: hledání beze změny (adresa i akce)', d7.hledA === 1 && d7.hledB === 1, d7);
const d7u = await p.evaluate(() => {
  const t = document.createElement('table');
  t.innerHTML = ulozisteRadekHtml({ soubor: 'a.json', cislo: '1', nazevAkce: 'Výtah — přístavba', adresa: 'Zkušební 12, Brno', variant: 1 });
  const td = t.querySelectorAll('td')[1];
  return { b: (td.querySelector('b') || {}).textContent, akce: (td.querySelector('.rejstrik-akce') || {}).textContent };
});
zkus('D7: totéž v seznamu uložených zakázek (složka)', d7u.b === 'Zkušební 12, Brno' && d7u.akce === 'Výtah — přístavba', d7u);

zkus('konzole bez chyb', chyby.length === 0, chyby.slice(0, 5));
await b.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
