/* Ověření v prohlížeči: zábrany z kontroly před nabídkou blokují dokumenty
 * (roadmapa #377, J. V. 1. 10. 2026)
 * ============================================================================
 *
 * Do v30.9.4 pravidla se zábranou (rozmery vč. zdvihu nad 99 m, profil mimo
 * katalog, záporná položka, nulová cena, sleva „schválená automaticky" nad
 * stropem) psala „Dokument nevznikne, dokud se to neopraví", ale brána
 * dokumentů (dokumentZabrana) je nečetla — zdvih −5 m i 1 000 000 000 m dal
 * nabídku. Hlídá se na sestavené aplikaci (dist/kalkulacka.html):
 *   1) zdvih 120 m: tlačítka „Kompletní náhled a tisk nabídky" a „Vytvořit
 *      nabídku (Word)" OCK zhasnutá s hláškou (název pravidla + text nálezu),
 *      táž hláška při pokusu o náhled i Word; zhasne i SoD OCK a tisk
 *      krycího listu OCK; dokumenty PROJ a plná moc zůstávají živé;
 *   2) po opravě zdvihu jsou tlačítka zase povolená;
 *   3) naopak: záporná položka v kalkulaci PROJ zhasne dokumenty PROJ
 *      (plná moc zůstane), dokumenty OCK ne;
 *   4) brána posuzuje variantu, ZE KTERÉ dokument vzniká (řídící s vadou se
 *      zastaví, i když je otevřená zdravá, a naopak).
 *
 * Spuštění: node overit_zabrany_dokumenty.mjs
 */
import { chromium } from 'playwright';

const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + detail)); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
const chyby = [];
p.on('pageerror', e => chyby.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') chyby.push('error: ' + m.text()); });
await p.goto(KDE);
await p.waitForFunction(() => typeof NAST !== 'undefined' && typeof render === 'function', null, { timeout: 15000 });
await p.waitForTimeout(400);
const odklikni = async () => {
  await p.waitForTimeout(80);
  return p.evaluate(() => { const t = document.querySelector('#dlg [data-dlg="ano"]'); if (t) t.click(); return !!t; });
};

/* Stav tlačítek podle obsluhy (onclick) na dané záložce. */
const tlacitka = (tab) => p.evaluate((tab) => {
  prepniTab(tab); render();
  const el = document.getElementById('page-' + tab);
  const najdi = re => [...el.querySelectorAll('button')].find(x => re.test(x.getAttribute('onclick') || ''));
  const st = x => x ? { dis: x.disabled, title: x.getAttribute('title') || '' } : null;
  return {
    ockTisk: st(najdi(/^nabidkaOckDokument\(/)), ockWord: st(najdi(/^nabidkaWord\(/)),
    projTisk: st(najdi(/^nabidkaProjNahled\(/)), projWord: st(najdi(/^nabidkaProjWord\(/)),
    sod: st(najdi(/sodWord\('sod'\)/)), sodProj: st(najdi(/sodWord\('sodProj'\)/)), plnaMoc: st(najdi(/sodWord\('plnaMoc'\)/)),
    kryciBo: st(najdi(/^kryciTiskPohled\('bo'\)/)), kryciProjBo: st(najdi(/^kryciProjTiskPohled\('bo'\)/)),
    panelZabrana: /⛔ Zábrana:/.test(el.textContent),
  };
}, tab);
const dlgText = () => p.evaluate(() => { const d = document.getElementById('dlg'); return d ? d.textContent : ''; });

/* ---------------------------------------------------------------- */
console.log('\n0) výchozí stav: zdravá zakázka nic nezastaví');
/* Sestavení nese nulový ceník (ten zastaví všechno sám) — zkušební ceník
 * z repozitáře, stejně jako overit_plan_plateb.mjs. */
const { createRequire } = await import('module');
const ZC = createRequire(import.meta.url)('./src/zkusebni_cenik.js');
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  /* Nová zakázka má rozměry nulové (vyplní je obchodník) — to je samo
   * zábrana „rozmery". Rozměry vzorové šachty, ať je výchozí stav zdravý. */
  window.__rozmery = z => Object.assign(z, { prejezd: 2.7, zdvih: 12, prohluben: 1.05, sirka: 1.51, hloubka: 1.515 });
  ZAK = novaZakazka(); syncVarianta(); __rozmery(Z); render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
let t = await tlacitka('spec');
zkus('tlačítka nabídky OCK jsou na začátku povolená (podklad testu)', t.ockTisk && t.ockWord && !t.ockTisk.dis && !t.ockWord.dis, JSON.stringify(t));

/* ---------------------------------------------------------------- */
console.log('\n1) zdvih 120 m: dokumenty OCK zastavené, PROJ ne');
await p.evaluate(() => { Z.zdvih = 120; render(); });
const kontrola = await p.evaluate(() => kontrolyStavAkt().kodyBrani);
zkus('kontrola hlásí zábranu „rozmery"', kontrola.indexOf('rozmery') >= 0, JSON.stringify(kontrola));
t = await tlacitka('spec');
const hlaska = t.ockTisk ? t.ockTisk.title : '';
zkus('„Kompletní náhled a tisk nabídky" OCK je zhasnuté', t.ockTisk && t.ockTisk.dis, JSON.stringify(t.ockTisk));
zkus('„Vytvořit nabídku (Word)" OCK je zhasnuté', t.ockWord && t.ockWord.dis, JSON.stringify(t.ockWord));
zkus('bublina říká, CO opravit (název pravidla + text nálezu se zdvihem a hranicí 99 m)',
  /Nesmyslný rozměr nebo počet/.test(hlaska) && /Zdvih 120 m/.test(hlaska) && /99 m/.test(hlaska), hlaska);
zkus('bublina Wordu je táž věta', t.ockWord && t.ockWord.title === hlaska, t.ockWord && t.ockWord.title);
zkus('panel kontrol ukazuje, že zábrana nejde odklepnout', t.panelZabrana);
/* Pokus o tisk obsluhou (jinudy než tlačítkem): náhled se neotevře, hláška = bublina. */
await p.evaluate(() => { window.__okna = 0; const puv = window.open; window.open = (...a) => { window.__okna++; return puv.apply(window, a); }; nabidkaOckDokument(); });
await p.waitForTimeout(200);
let d = await dlgText();
zkus('pokus o náhled/tisk: okno se neotevře a hláška je táž jako bublina',
  d.indexOf(hlaska) >= 0 && await p.evaluate(() => window.__okna === 0), d.slice(0, 160));
await odklikni();
await p.evaluate(() => { nabidkaWordGeneruj({ data: new ArrayBuffer(8), verze: 1, typ: 'nabidka', otisk: 'x', nazev: 'test' }); });
await p.waitForTimeout(200);
d = await dlgText();
zkus('pokus o Word: hláška je táž jako bublina', d.indexOf(hlaska) >= 0, d.slice(0, 160));
await odklikni();
const vyg = await p.evaluate(async () => { try { await dokumentVygeneruj('nabidka', new ArrayBuffer(8), ZAK, aktivniVarianta(ZAK), JEKLY); return ''; } catch (e) { return e.message; } });
zkus('registr dokumentů (dokumentVygeneruj) nabídku OCK odmítne s toutéž větou', vyg === hlaska, vyg.slice(0, 120));
t = await tlacitka('kryci');
zkus('SoD OCK a tisk krycího listu OCK zhasnuté', t.sod && t.sod.dis && t.kryciBo && t.kryciBo.dis, JSON.stringify({ sod: t.sod, kryci: t.kryciBo }));
t = await tlacitka('proj');
zkus('dokumenty PROJ zábrana OCK nezastaví (náhled i Word nabídky PROJ)', t.projTisk && t.projWord && !t.projTisk.dis && !t.projWord.dis, JSON.stringify({ a: t.projTisk, b: t.projWord }));
t = await tlacitka('kryciproj');
zkus('SoD PROJ, plná moc a krycí list PROJ zůstávají živé', t.sodProj && !t.sodProj.dis && t.plnaMoc && !t.plnaMoc.dis && t.kryciProjBo && !t.kryciProjBo.dis,
  JSON.stringify({ s: t.sodProj, pm: t.plnaMoc, k: t.kryciProjBo }));
const minus = await p.evaluate(() => { Z.zdvih = -5; render(); return dokumentZabrana('nabidka'); });
zkus('zdvih −5 m dokument OCK také zastaví', /Nesmyslný rozměr/.test(minus), minus);

/* ---------------------------------------------------------------- */
console.log('\n2) oprava zdvihu: tlačítka zase povolená');
await p.evaluate(() => { Z.zdvih = 12; render(); });
t = await tlacitka('spec');
zkus('po opravě zdvihu jsou náhled i Word nabídky OCK povolené', t.ockTisk && !t.ockTisk.dis && t.ockWord && !t.ockWord.dis, JSON.stringify(t));
zkus('… a brána je volná pro všechny dokumenty', await p.evaluate(() =>
  ['nabidka', 'nabidkaTisk', 'sod', 'kryci_bo', 'nabidkaProj', 'sodProj', 'plnaMoc'].every(x => dokumentZabrana(x) === '')));

/* ---------------------------------------------------------------- */
console.log('\n3) naopak: zábrana projekce nezastaví dokumenty OCK');
const sp = await p.evaluate(() => {
  PJ.sekce[0].polozky.push({ nazev: 'Úprava', typ: 'fix', cena: -90400, vlastni: true, __test377: true }); render();
  return { kody: kontrolyStavAkt().kodyBrani, proj: dokumentZabrana('nabidkaProj'), ock: dokumentZabrana('nabidka') };
});
zkus('záporná položka v kalkulaci PROJ = zábrana zapornaPolozka', sp.kody.indexOf('zapornaPolozka') >= 0, JSON.stringify(sp.kody));
t = await tlacitka('proj');
zkus('náhled i Word nabídky PROJ zhasnuté s názvem pravidla', t.projTisk && t.projTisk.dis && t.projWord && t.projWord.dis
  && /Záporná částka, množství nebo hodiny/.test(t.projTisk.title) && /kalkulace PROJ/.test(t.projTisk.title), JSON.stringify({ a: t.projTisk }));
t = await tlacitka('kryciproj');
zkus('SoD PROJ zhasnutá, plná moc ne', t.sodProj && t.sodProj.dis && t.plnaMoc && !t.plnaMoc.dis, JSON.stringify({ s: t.sodProj, pm: t.plnaMoc }));
t = await tlacitka('spec');
zkus('dokumenty OCK zábrana PROJ nezastaví', t.ockTisk && !t.ockTisk.dis && t.ockWord && !t.ockWord.dis && sp.ock === '', JSON.stringify(t));
await p.evaluate(() => { PJ.sekce[0].polozky = PJ.sekce[0].polozky.filter(x => !x.__test377); render(); });
zkus('po odebrání záporné položky je cesta PROJ volná', await p.evaluate(() => dokumentZabrana('nabidkaProj') === '' && dokumentZabrana('sodProj') === ''));

/* ---------------------------------------------------------------- */
console.log('\n4) brána posuzuje variantu, ze které dokument vzniká');
const dve = await p.evaluate(async () => {
  ZAK = novaZakazka(); syncVarianta();
  const a = aktivniVarianta(ZAK);
  __rozmery(a.data.ock.zadani);
  a.data.ock.zadani.zdvih = 120;
  const b = klonujVariantu(ZAK, a.id);
  b.data.ock.zadani.zdvih = 12;
  syncVarianta(); render();
  const chyba = async (v) => { try { await dokumentVygeneruj('nabidka', new ArrayBuffer(8), ZAK, v, JEKLY); return ''; } catch (e) { return e.message; } };
  const r = { ridiciJeA: ridiciVarianta(ZAK).id === a.id, otevrenaJeB: aktivniVarianta(ZAK).id === b.id,
    otevrena: dokumentZabrana('nabidka'), ridici: dokumentZabrana('nabidka', a), vygRidici: await chyba(a), vygOtevrena: await chyba(b) };
  ZAK = novaZakazka(); syncVarianta(); render();
  return r;
});
zkus('řídící varianta se zdvihem 120 m se zastaví, i když je otevřená zdravá',
  dve.ridiciJeA && dve.otevrenaJeB && dve.otevrena === '' && /Nesmyslný rozměr/.test(dve.ridici) && /Nesmyslný rozměr/.test(dve.vygRidici), JSON.stringify(dve));
zkus('zdravá otevřená varianta se kvůli vadné řídící nezastaví', !/Nesmyslný rozměr/.test(dve.vygOtevrena), dve.vygOtevrena);

zkus('žádná chyba stránky', chyby.length === 0, chyby.join(' | '));
await b.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
