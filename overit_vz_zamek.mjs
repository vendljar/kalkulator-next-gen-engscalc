/* Ověření v prohlížeči: VÍC ZÁKAZNÍKŮ — ZÁMEK PO ZÁKAZNÍCÍCH A ODSTRANĚNÍ
 * ZÁKAZNÍKA S ODESLANOU NABÍDKOU (VZ-E3 #602).
 * ============================================================================
 *
 * Návrh § 5, § 2a (tabulka odstranění), prototyp snímek v3_3, zadání
 * podklady/PROMPT_VZ_E3.md body 1, 5, 6, 7, 9. Jádro hlídá src/test_vz_zamek.js,
 * logiku obrazovky src/test_vz_ui.js; tenhle harness hlídá SESTAVENOU
 * aplikaci (dist/kalkulacka.html) a skutečná tlačítka:
 *
 *   1) zakázka se dvěma zákazníky (A řídící, B sdílí řídící variantu),
 *      otevřený B, Word nabídky (nabidkaWordGeneruj, syntetická šablona)
 *      → varianta se zamkne a záznam tisku nese razítko
 *      { id B, pismeno B, cislo …9940-B, objednatel B, ico B };
 *   2) karta Zákazníci zakázky: stav B „odeslána D. M. RRRR", A „rozpracovaná";
 *   3) hlavička otevřeného B: Zákazník a IČO jen ke čtení s důvodem, zápis
 *      set() odmítnut s hláškou, kontaktní osoba se zapsat smí;
 *   4) obchodník: Odstranit u B zhasnuté s vysvětlením „jen administrátor";
 *   5) administrátor: Odstranit povolené, potvrzení s řádky dokladu
 *      („doklad zůstává", „už se nepřidělí"), po potvrzení zákazník zmizí,
 *      zamčená varianta i razítko zůstávají, lišta zámku a seznam variant
 *      ukazují číslo dokladu …9940-B;
 *   6) nový zákazník (formulář „Přidat zákazníka") dostane písmeno C, ne B;
 *   7) jeden zákazník: lišta zámku a seznam variant bez písmene.
 *
 * POJISTKA PROTI PRÁZDNÉMU TESTU: s UI před E3 (git stash změn src/ui/*)
 * musí běh skončit červeně — ověřeno při psaní (viz zpráva / commit).
 *
 * Smyšlené údaje (kontakty …@priklad.cz), zkušební ceník.
 * Spuštění: KNG_NEZVYSOVAT_VERZI=1 python3 build.py && node overit_vz_zamek.mjs
 *   (bez globálního playwrightu: NODE_PATH=$(npm root -g) node overit_vz_zamek.mjs)
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';

const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright není k dispozici. Spuštění: NODE_PATH=$(npm root -g) node overit_vz_zamek.mjs'); process.exit(2); }
const DG = require(KOREN + 'src/docxgen.js');
const ZC = require(KOREN + 'src/zkusebni_cenik.js');
const START = Date.now();

let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail).slice(0, 700))); }
};

const ZAKLAD = '2026 - OPR - CN - 9940';
const udaje = (pref, ico) => {
  const m = pref.toLowerCase();
  return {
    objednatel: pref + ' Nazev s.r.o.', adresaObjednatele: pref + 'ova 11, 110 00 Praha 1', ico, dic: 'CZ' + ico,
    kontakt: pref + ' Kontakt, ' + m + '.kontakt@priklad.cz',
    zastupci: { smluvniJmeno: pref + ' Smluvni', smluvniEmail: m + '.smluvni@priklad.cz' },
  };
};
const UA = udaje('Alfakanar', '81726350');
const UB = udaje('Betakanar', '72635487');

/* syntetická šablona nabídky (symboly hlavičky) — vzor overit_vz_tisk.mjs */
const sablonaB64 = Buffer.from(await (await DG.docxDokumentBlob('Nabídka', [
  { sekce: 'HLAVIČKA', radky: [['Objednatel', '{{OBJEDNATEL}}'], ['Číslo nabídky', '{{CISLO_NABIDKY}}'], ['Název akce', '{{NAZEV_AKCE}}']] },
  { sekce: 'CENA', radky: [['VÝTAHOVÁ ŠACHTA', '{{CENA_BEZ_DPH}} bez DPH']] },
])).arrayBuffer()).toString('base64');

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'cs-CZ' });
const p = await ctx.newPage();
const konzole = [];
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|\/api\//.test(m.text())) konzole.push('error: ' + m.text()); });
p.on('dialog', d => d.dismiss().catch(() => {}));
await p.goto(KDE);
await p.waitForFunction(() => typeof NAST !== 'undefined' && typeof render === 'function', null, { timeout: 15000 });
await p.waitForTimeout(400);

zkus('sestavení obsahuje jádro E3 (vzStavNabidky, vzOdstranDuvod, vzCisloDokladu)',
  await p.evaluate(() => typeof vzStavNabidky === 'function' && typeof vzOdstranDuvod === 'function' && typeof vzCisloDokladu === 'function'));

await p.evaluate(sab => {
  window.__dlg = [];
  window.potvrd = (t, o) => { window.__dlg.push({ druh: 'potvrd', text: String(t) }); return Promise.resolve(true); };
  window.hlaska = (t, o) => { window.__dlg.push({ druh: 'hlaska', text: String(t) }); return Promise.resolve(); };
  window.__stazeni = 0;
  HTMLAnchorElement.prototype.click = function () { if (this.download) window.__stazeni++; };
  window.print = () => {};
  const bin = atob(sab); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  window.__sablona = u.buffer;
}, sablonaB64);

/* Zakázka: 'dva' (A řídící + B sdílí řídící variantu) nebo 'jeden'. */
const priprav = (druh) => p.evaluate(([c, cp, druh, uA, uB, zaklad]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  ONLINE_STAV.ja = { email: 'obchodnik.vz@priklad.cz', role: 'Obchodník', jmeno: 'Obchodnik VZ' };
  ONLINE_STAV.funkce = { viceZakazniku: true };
  VZ_UI.otevreny = ''; VZ_UI.form = null; VZ_UI.odstranit = null;
  ZAK = novaZakazka(); syncVarianta();
  Object.assign(Z, { typSachty: 'exteriérová', profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová'])), zaskleni: 'na terče',
    sirka: 1.6, hloubka: 2.1, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 4 });
  OCK.fixes = true; Object.keys(C).forEach(k => delete C[k]); Object.assign(C, JSON.parse(JSON.stringify(c))); delete C.prazdny; delete C.ukazkove;
  ZAK.autor = 'obchodnik.vz@priklad.cz';
  ZAK.cislo = zaklad; ZAK.datum = '2026-11-16';
  ZAK.nazevAkce = 'Bytovy dum Ukazkova';
  ZAK.adresa = 'Ukazkova 5, 120 00 Praha 2';
  ['objednatel', 'adresaObjednatele', 'ico', 'dic', 'kontakt'].forEach(k => { ZAK[k] = uA[k]; });
  ZAK.zastupci = Object.assign({}, ZAK.zastupci || {}, uA.zastupci);
  const rid = aktivniVarianta(ZAK); rid.nazev = 'Varianta 1';
  const out = { ridici: rid.id };
  if (druh === 'dva') {
    const rB = vzPridej(ZAK, uB, { kdo: 'obchodnik.vz@priklad.cz' });
    if (!rB.ok) return { chyba: rB.chyba };
    out.B = rB.zakaznik.id; out.pismeno = rB.zakaznik.pismeno;
  }
  ZAK.aktivni = rid.id; syncVarianta();
  window.__dlg.length = 0;
  prepniTab('kalk'); render();
  return out;
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj(), druh, UA, UB, ZAKLAD]);

const roleSet = role => p.evaluate(r => { ONLINE_STAV.ja.role = r; NAST.jeAdmin = r === 'Administrátor'; render(); }, role);
const tiskWord = () => p.evaluate(async () => {
  window.__dlg.length = 0;
  SABLONA_DOCX = { nazev: 'Sablona_NABIDKA_CN_test.docx', data: window.__sablona };
  let chyba = '';
  try { await nabidkaWordGeneruj(null); } catch (e) { chyba = String(e && e.message || e); }
  return { chyba, dlg: window.__dlg.slice() };
});
const hlasky = () => p.evaluate(() => window.__dlg.filter(d => d.druh === 'hlaska').map(d => d.text));
/* Řádek karty Zákazníci zakázky: stav a tlačítko Odstranit. */
const kartaRadek = id => p.evaluate(id => {
  render();
  const tr = document.querySelector(`#vzKarta_ock tr[data-vz="${id}"]`);
  if (!tr) return null;
  const akce = tr.nextElementSibling;
  const btn = akce ? [...akce.querySelectorAll('button')].find(x => x.textContent.trim() === 'Odstranit') : null;
  return { stav: tr.querySelector('[data-l="Stav"]').textContent.trim(), cislo: tr.querySelector('.vz-cislo').textContent.trim(),
    odstranit: btn ? { disabled: btn.disabled, title: btn.title } : null };
}, id);
const lista = () => p.evaluate(() => { render(); const e = document.getElementById('zamekLista'); return e ? e.textContent.replace(/\s+/g, ' ') : ''; });
const seznamCisla = () => p.evaluate(() => {
  const h = seznamTelo().html;
  const d = document.createElement('div'); d.innerHTML = h;
  return [...d.querySelectorAll('table.vartbl tr')].slice(1).map(tr => ({ nazev: (tr.querySelector('input[type="text"]') || {}).value, cislo: tr.children[2].textContent.trim() }));
});

/* ============ 1) tisk sdílené varianty pro B ============ */
console.log('Dva zákazníci — tisk sdílené varianty pro B');
const c2 = await priprav('dva');
zkus('zakázka se dvěma zákazníky (B má písmeno B)', !c2.chyba && c2.B && c2.pismeno === 'B', c2);
await p.evaluate(id => vzOtevri(id), c2.B);
const t = await tiskWord();
const zam = await p.evaluate(() => { const v = ZAK.varianty.find(x => x.ridici); return v.zamek ? JSON.parse(JSON.stringify(v.zamek)) : null; });
const raz = zam && Array.isArray(zam.tisky) && zam.tisky.length ? zam.tisky[zam.tisky.length - 1] : null;
zkus('Word nabídky pro B vznikl a variantu zamkl', !t.chyba && zam && zam.zamceno === true, { chyba: t.chyba, dlg: t.dlg });
zkus('razítko tisku „komu" = B (id, písmeno B, číslo …9940-B, název a IČO B)', !!raz && raz.zakaznik && raz.zakaznik.id === c2.B
  && raz.zakaznik.pismeno === 'B' && raz.zakaznik.cislo === ZAKLAD + '-B' && raz.zakaznik.objednatel === UB.objednatel && raz.zakaznik.ico === UB.ico, raz);
zkus('zámek.cislo zůstává bez písmene (společný variantě)', zam && zam.cislo === ZAKLAD, zam && zam.cislo);

/* ============ 2) karta: stav ============ */
console.log('\nKarta Zákazníci zakázky — stav nabídky');
const den = await p.evaluate(k => vzpDen(k), raz ? raz.kdy : '');
const rB = await kartaRadek(c2.B);
const rA = await kartaRadek('z1');
zkus(`B: „odeslána ${den}"`, !!den && rB && rB.stav === 'odeslána ' + den, rB);
zkus('A (řídící, tisk šel jen B): „rozpracovaná"', rA && rA.stav === 'rozpracovaná', rA);
zkus('B: číslo nabídky …9940-B', rB && rB.cislo === ZAKLAD + '-B', rB);

/* ============ 3) zmrazené údaje otevřeného B ============ */
console.log('\nHlavička otevřeného B — zmrazené údaje');
{
  const pole = await p.evaluate(() => {
    render();
    const karta = document.getElementById('vzPrepinac_ock').closest('.card') || document;
    const inp = [...karta.querySelectorAll('.row')].map(r => ({ l: (r.querySelector('label') || {}).textContent || '', i: r.querySelector('input[type="text"]') }))
      .filter(x => x.i);
    const najdi = re => { const x = inp.find(y => re.test(y.l.trim())); return x ? { readOnly: x.i.readOnly, title: x.i.title, value: x.i.value } : null; };
    return { zak: najdi(/^Zákazník$/), ico: najdi(/^IČO zákazníka/), kontakt: najdi(/^Kontaktní osoba/) };
  });
  zkus('pole Zákazník (B) jen ke čtení s důvodem', pole.zak && pole.zak.readOnly && pole.zak.value === UB.objednatel && /Zákazníkovi už odešla nabídka/.test(pole.zak.title), pole.zak);
  zkus('pole IČO (B) jen ke čtení s důvodem', pole.ico && pole.ico.readOnly && /název, sídlo, IČO a DIČ se už nemění/.test(pole.ico.title), pole.ico);
  zkus('pole Kontaktní osoba (B) zůstává zapisovatelné', pole.kontakt && !pole.kontakt.readOnly, pole.kontakt);
  const z = await p.evaluate(() => {
    window.__dlg.length = 0;
    set(vzCesta('ZAK.objednatel'), 'Podvrh s.r.o.');
    set(vzCesta('ZAK.ico'), '00000019');
    const po = JSON.parse(JSON.stringify(vzZakaznik(ZAK, VZ_UI.otevreny).hlavicka));
    set(vzCesta('ZAK.kontakt'), 'Nova Osoba');
    return { po, kontakt: vzZakaznik(ZAK, VZ_UI.otevreny).hlavicka.kontakt, h: window.__dlg.filter(d => d.druh === 'hlaska').map(d => d.text) };
  });
  zkus('set() názvu a IČO B odmítnut s hláškou, údaje beze změny', z.po.objednatel === UB.objednatel && z.po.ico === UB.ico
    && z.h.length === 2 && z.h.every(x => /už odešla nabídka/.test(x)), z);
  zkus('set() kontaktní osoby B projde', z.kontakt === 'Nova Osoba', z.kontakt);
  const ares = await p.evaluate(() => { render(); const b = [...document.querySelectorAll('button')].find(x => /Najít firmu v ARES/.test(x.textContent) && x.offsetParent); return b ? { disabled: b.disabled, title: b.title } : null; });
  zkus('ARES u B zhasnutý s důvodem', ares && ares.disabled && /už odešla nabídka/.test(ares.title), ares);
}

/* ============ 4) obchodník: Odstranit zhasnuté ============ */
console.log('\nOdstranění B — obchodník');
await p.evaluate(() => vzOtevri('z1'));
{
  const r = await kartaRadek(c2.B);
  zkus('obchodník: Odstranit u B zhasnuté s vysvětlením „jen administrátor"', r && r.odstranit && r.odstranit.disabled
    && /Zákazníkovi už odešla nabídka — odstranit ho smí jen administrátor/.test(r.odstranit.title), r);
  const pred = await p.evaluate(() => JSON.stringify(ZAK));
  await p.evaluate(id => { window.__dlg.length = 0; vzOdstranit(id); }, c2.B);
  zkus('obchodník: vzOdstranit odmítne (hláška), zakázka beze změny', await p.evaluate(pr => JSON.stringify(ZAK) === pr && VZ_UI.odstranit === null, pred)
    && (await hlasky()).some(x => /jen administrátor/.test(x)), await hlasky());
}

/* ============ 5) administrátor: potvrzení a odstranění ============ */
console.log('\nOdstranění B — administrátor');
await roleSet('Administrátor');
{
  const r = await kartaRadek(c2.B);
  zkus('administrátor: Odstranit u B povolené', r && r.odstranit && !r.odstranit.disabled, r);
  await p.click(`#vzKarta_ock tr[data-vz="${c2.B}"] + tr button:text-is("Odstranit")`);
  const pot = await p.evaluate(() => { const e = document.getElementById('vzOdstranPotvrzeni'); return e ? e.textContent.replace(/\s+/g, ' ') : ''; });
  zkus('potvrzení: „Jeho nabídka …9940-B odeslána … → doklad zůstává"', pot.includes('Jeho nabídka ' + ZAKLAD + '-B') && pot.includes('odeslána ' + den + ' → doklad zůstává'), pot);
  zkus('potvrzení: razítko sdílené varianty zůstává, kdo smí: administrátor', /razítko tisku pro tohoto zákazníka v zámku varianty zůstává/.test(pot) && /Kdo smí\s*jen administrátor/.test(pot), pot);
  zkus('potvrzení: písmeno -B se už nepřidělí', /Písmeno -B\s*už se nepřidělí jinému zákazníkovi/.test(pot) && !/uvolní se/.test(pot), pot);
  await p.click('#vzOdstranAno');
  const po = await p.evaluate(() => {
    const v = ZAK.varianty.find(x => x.ridici);
    return { dalsi: 'dalsiZakaznici' in ZAK, vzRidici: 'vzRidici' in ZAK, zamceno: !!(v.zamek && v.zamek.zamceno), varianty: ZAK.varianty.length,
      razitko: v.zamek && v.zamek.tisky.map(x => x.zakaznik && x.zakaznik.id), prot: (ZAK.protokol || []).slice(-1).map(x => x.co + ' / ' + (x.pred || '')) };
  });
  zkus('B odstraněn (bez klíčů víc zákazníků)', !po.dalsi && !po.vzRidici, po);
  zkus('zamčená varianta i razítko B zůstávají', po.zamceno && po.varianty === 1 && Array.isArray(po.razitko) && po.razitko.includes(c2.B), po);
  zkus('protokol: „Odstraněn zákazník … s odeslanou nabídkou", jen název', po.prot.length === 1 && /s odeslanou nabídkou/.test(po.prot[0]) && po.prot[0].includes(UB.objednatel)
    && !po.prot[0].includes(UB.ico), po.prot);
  const l = await lista();
  zkus('lišta zámku: „Odeslaná nabídka Varianta 1 (…9940-B)"', l.includes('Odeslaná nabídka Varianta 1 (' + ZAKLAD + '-B)'), l.slice(0, 300));
  const s = await seznamCisla();
  zkus('seznam variant: číslo …9940-B', s.length === 1 && s[0].cislo === ZAKLAD + '-B', s);
}

/* ============ 6) písmeno B se nepřidělí ============ */
console.log('\nNový zákazník po odstranění B');
{
  await roleSet('Obchodník');
  await p.click('#vzPridat_ock');
  await p.fill('#vzF_objednatel', 'Gamakanar Nazev s.r.o.');
  const nota = await p.evaluate(() => { const e = document.querySelector('#vzFormular .note'); return e ? e.textContent : ''; });
  zkus('formulář: „Zákazník dostane písmeno C"', /dostane písmeno C/.test(nota), nota);
  await p.click('#vzFormPridej');
  const n = await p.evaluate(() => (ZAK.dalsiZakaznici || []).map(d => ({ id: d.id, pismeno: d.pismeno })));
  zkus('nový zákazník má písmeno C (B je na odeslaném papíře) a nové id', n.length === 1 && n[0].pismeno === 'C' && n[0].id !== c2.B, n);
}

/* ============ 7) jeden zákazník: beze změny ============ */
console.log('\nJeden zákazník — beze změny');
{
  await priprav('jeden');
  const t1 = await tiskWord();
  const z1 = await p.evaluate(() => { const v = ZAK.varianty[0]; return { zamceno: !!(v.zamek && v.zamek.zamceno), raz: (v.zamek.tisky || []).some(x => 'zakaznik' in x) }; });
  zkus('tisk zamkl variantu, záznam tisku bez klíče zakaznik', !t1.chyba && z1.zamceno && !z1.raz, z1);
  const l = await lista();
  zkus('lišta zámku: číslo bez písmene', l.includes('Odeslaná nabídka Varianta 1 (' + ZAKLAD + ')'), l.slice(0, 300));
  const s = await seznamCisla();
  zkus('seznam variant: číslo bez písmene', s.length === 1 && s[0].cislo === ZAKLAD, s);
  const h = await p.evaluate(() => { render(); return [...document.querySelectorAll('input.zmrazeno[readonly]')].length; });
  zkus('hlavička: žádné pole readonly ze zmrazení VZ', h === 0, h);
}

await b.close();
if (konzole.length) { console.log('\nKonzole:\n  ' + konzole.join('\n  ')); }
const sec = ((Date.now() - START) / 1000).toFixed(1);
console.log(`\n${fail ? '✕' : '✓'} overit_vz_zamek: ${ok} OK, ${fail} FAIL, ${sec} s`);
process.exit(fail || konzole.length ? 1 : 0);
