/* ============================================================
 * VZ-F2 — dorovnání víc zákazníků po revizi VZ-F1 (19. 11. 2026).
 *
 *  #660 kontrola duplicitního IČO (klient): IČO jiného zákazníka zakázky se
 *       nezapíše — hlavička řídícího (ZAK.ico), hlavička otevřeného dalšího
 *       zákazníka, převzetí karty z databáze zákazníků (všechny cíle)
 *       a formulář nového zákazníka (upozornění + zhasnuté „Přidat"). Stejné
 *       IČO, jaké zákazník už má (i jinak zapsané), a starší data s duplicitou
 *       se nehlídají; jeden zákazník beze změny.
 *  #663 zástupci dalšího zákazníka po odeslání JEHO smlouvy o dílo zmrazení
 *       (vzZastupciZmrazeno / vzCestaZmrazena), po CN volní; kontakt volný.
 *       Zámek hlavičky (zamekZakStav / zamekZakCestaZmrazena) počítá jen SoD
 *       ŘÍDÍCÍMU — SoD odeslaná B nezmrazí zástupce řídícího A. Jeden
 *       zákazník beze změny (každá SoD zmrazí hlavičku).
 *  #661 krycí list PROJ u otevřeného dalšího zákazníka: kontext jeho pohledu
 *       (klpVzCtxZak → klVzCtxZak), zmocnitel plné moci předvyplněný jeho
 *       zástupcem, ruční pole zákazníka za otevřeného zákazníka (klpVzKomu).
 *
 * POJISTKA: na a3fad44 (před VZ-F2) selže — vzIcoCestaDuvod, vzIcoDuvod,
 * vzZastupciZmrazeno, klpVzCtxZak neexistují; vzCestaZmrazena zástupce po SoD
 * B nehlídá; zamekZakCestaZmrazena po SoD B zmrazí zástupce A; klpVzKomu
 * u otevřeného C vrací řídícího (zmocnitel C by šel do plné moci A).
 * Spuštění: node src/test_vz_f2.js
 * ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'vice_zakazniku.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js', 'dokumenty.js',
  'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js',
  'objednane.js', 'controlling.js', 'zakaznici.js'];
CORE.forEach(f => { const m = require(path.join(__dirname, f)); if (m && typeof m === 'object') Object.assign(global, m); });
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const JEKLY = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + (info === undefined ? '' : '  ' + JSON.stringify(info).slice(0, 700))); } };
const J = o => JSON.parse(JSON.stringify(o));
const fn = n => typeof global[n] === 'function';

/* ---------- zakázka (smyšlené firmy) ---------- */
const KAN = p => 'ZF2' + p + 'KANAREKX';
function zast(p) {
  const o = {};
  VZ_ZASTUPCI_POLE.forEach(k => { o[k] = /Email$/.test(k) ? 'f2' + p.toLowerCase() + k.toLowerCase() + '@priklad.cz' : 'Údaj ' + KAN(p) + ' ' + k; });
  return o;
}
const ICO = { A: '27182818', B: '16180339', C: '46692016', X: '12345679' };
const PEVNE = { kdo: 'f2@priklad.cz', kdy: '2026-11-19T10:00:00.000Z' };
const TED = '2026-11-19T10:00:00.000Z';
function zakazka(dalsi) {
  const zak = novaZakazka();
  Object.assign(zak, { objednatel: 'Alfa zkušební s.r.o.', adresaObjednatele: 'Zkušební 1, 110 00 Praha', ico: ICO.A, dic: 'CZ' + ICO.A,
    kontakt: 'Ivo Alfa', zastupci: zast('A') });
  zak.nazevAkce = 'Bytový dům Zkušební';
  zak.adresa = 'Stavební 12, 120 00 Praha';
  zak.cislo = '2026 - OPR - CN - 9802';
  zak.datum = '2026-11-19';
  const v1 = zak.varianty[0];
  v1.datum = '2026-11-19';
  Object.assign(v1.data.ock.zadani, { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 });
  v1.data.ock.fixes = true;
  v1.data.kryci = { hodnoty: { sodDphRezim: KRYCI_DPH_REZIMY[0] } };
  v1.data.kryciProj = { hodnoty: {} };
  if (dalsi) {
    /* B vlastní varianta (SoD po zákaznících), C vlastní varianta */
    const rB = vzPridej(zak, { objednatel: 'Beta zkušební a.s.', ico: ICO.B, dic: 'CZ' + ICO.B, kontakt: 'Eva Beta', zastupci: zast('B') }, Object.assign({ vlastni: true }, PEVNE));
    const rC = vzPridej(zak, { objednatel: 'Gama zkušební s.r.o.', ico: ICO.C, kontakt: 'Jan Gama', zastupci: zast('C') }, Object.assign({ vlastni: true }, PEVNE));
    if (!rB.ok || !rC.ok) throw new Error('vzPridej: ' + (rB.chyba || rC.chyba));
  }
  return zak;
}
const varZak = (zak, id) => zak.varianty.find(v => v.id === vzZakaznik(zak, id).varianta);
/* Tisk (zámek + razítko „komu") — vzor test_vz_prodej.js. */
function tiskni(z, v, id, typ) {
  const prvni = !variantaUzamcena(v);
  const info = { typ: typ || 'nabidka', kdo: 'test@priklad.cz', kdy: TED, cislo: variantaCislo(z, v) };
  if (prvni) { info.vysledek = zamekVysledekSpocti(v, JEKLY, 'vz-f2'); info.snimek = zamekSnimekSpocti(v); }
  if (vzRezim(z)) info.zakaznik = vzRazitkoSnimek(z, id, v);
  return zamkniVariantu(v, info);
}

/* ---------- obrazovka ve vm (vzor test_vz_f1.js) ---------- */
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const UI = ['vice_zakazniku.js', 'vz_poznamka.js', 'ares.js', 'zakaznici.js', 'ui/ares_ui.js', 'ui/zakaznici_ui.js', 'ui/vice_zakazniku_ui.js',
  'ui/vz_tisk_ui.js', 'ui/kryci_proj_ui.js'];
function obrazovka(zak, zap = true) {
  const hlasky = [];
  const ctx = vm.createContext({ console, JSON, Math, String, Set, Map, Array, Object, Date, Number, RegExp, Promise,
    esc, escJs: esc, setTimeout: () => 0, render: () => {}, hlaska: t => { hlasky.push(String(t)); return Promise.resolve(); },
    viceZakaznikuZapnuto: () => zap, jeAdminOnline: () => false, zamekCteniJe: () => false, nahledAktivni: () => false,
    zamekStop: () => false, variantaUzamcena: v => !!(v && v.zamek && v.zamek.zamceno), variantaProdana: v => !!(v && v.prodano),
    protokolZapis: () => {}, prepniTab: () => {}, TAB: 'kalk', NAST: { uzivatel: 'tester' }, ZAK_DB: { seznam: [], hlaska: '' },
    kryciProjPoleZakaznika: id => KRYCI_PROJ_SEKCE.some(s => s.pole.some(p => p.id === id && p.zakaznikPole)), KLP: { hodnoty: {} } });
  vm.runInContext(`
    var ZAK = null;
    function aktivniVarianta(z) { return z.varianty.find(v => String(v.id) === String(z.aktivni)) || z.varianty[0]; }
    function syncVarianta() {}
    function ridiciVarianta(z) { return z.varianty.find(v => v.ridici) || z.varianty[0]; }
    function get(p) { return p.split('.').reduce((o, k) => o == null ? o : o[k], { ZAK }); }
    function set(p, v) { const c = p.split('.'); let o = { ZAK }; for (let i = 0; i < c.length - 1; i++) o = o[c[i]]; o[c[c.length - 1]] = v; }
  `, ctx);
  UI.forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f }));
  ctx.ZAK = J(zak);
  vm.runInContext('vzOtevrenyId()', ctx);
  return { run: k => { try { return vm.runInContext(k, ctx); } catch (e) { return 'CHYBA ' + e.message; } }, ctx, hlasky };
}
const jeText = x => typeof x === 'string' && x !== '' && x.indexOf('CHYBA ') !== 0;

/* ================= #660: IČO jiného zákazníka (klient) ================= */
{
  const zak = zakazka(true);
  const o = obrazovka(zak);
  const iB = zak.dalsiZakaznici.findIndex(d => d.id === 'z2');
  const iC = zak.dalsiZakaznici.findIndex(d => d.id === 'z3');
  const cesta = i => 'ZAK.dalsiZakaznici.' + i + '.hlavicka.ico';
  test('#660 obchvat 2: změna IČO řídícího na IČO dalšího zákazníka (B) → odmítnuto s názvem B',
    jeText(o.run(`vzIcoCestaDuvod('ZAK.ico', '${ICO.B}')`)) && /Beta zkušební/.test(o.run(`vzIcoCestaDuvod('ZAK.ico', '${ICO.B}')`)),
    o.run(`vzIcoCestaDuvod('ZAK.ico', '${ICO.B}')`));
  test('#660: IČO zapsané s mezerami (161 803 39) se pozná taky', jeText(o.run(`vzIcoCestaDuvod('ZAK.ico', '161 803 39')`)));
  test('#660: řídící — vlastní IČO jinak zapsané (271 828 18) i nové volné IČO projdou',
    o.run(`vzIcoCestaDuvod('ZAK.ico', '271 828 18')`) === '' && o.run(`vzIcoCestaDuvod('ZAK.ico', '${ICO.X}')`) === '');
  test('#660: řídící — prázdné IČO projde (bez IČO se nehlídá)', o.run(`vzIcoCestaDuvod('ZAK.ico', '')`) === '');
  test('#660: další zákazník B v hlavičce — IČO C odmítnuto, IČO A odmítnuto',
    jeText(o.run(`vzIcoCestaDuvod('${cesta(iB)}', '${ICO.C}')`)) && jeText(o.run(`vzIcoCestaDuvod('${cesta(iB)}', '${ICO.A}')`)));
  test('#660: další zákazník B — vlastní a volné IČO projdou',
    o.run(`vzIcoCestaDuvod('${cesta(iB)}', '${ICO.B}')`) === '' && o.run(`vzIcoCestaDuvod('${cesta(iB)}', '${ICO.X}')`) === '');
  test('#660: jiná pole hlavičky se nehlídají', o.run(`vzIcoCestaDuvod('${'ZAK.dalsiZakaznici.' + iB + '.hlavicka.dic'}', '${ICO.C}')`) === ''
    && o.run(`vzIcoCestaDuvod('ZAK.objednatel', '${ICO.B}')`) === '');
  /* obchvat 1: zákazník přidaný bez IČO, IČO doplněné až potom */
  o.run(`ZAK.dalsiZakaznici[${iC}].hlavicka.ico = ''`);
  test('#660 obchvat 1: zákazník bez IČO — doplnění IČO řídícího odmítnuto', jeText(o.run(`vzIcoCestaDuvod('${cesta(iC)}', '${ICO.A}')`)));
  /* databáze zákazníků: všechny tři cíle (řídící, otevřený další, formulář) */
  const dbStop = (kde, ico, prazdne) => o.run(`(function(){ const c = zakazniciCil('${kde}'); return zakazniciIcoStop(c, { ico: '${ico}' }, ${!!prazdne}); })()`);
  o.run("vzOtevri('z1')");
  test('#660 databáze: karta s IČO B do hlavičky řídícího A → zastaveno s hláškou', dbStop('ock', ICO.B) === true && /Beta zkušební/.test(o.hlasky.slice(-1)[0] || ''));
  test('#660 databáze: karta s volným IČO projde', dbStop('ock', ICO.X) === false);
  test('#660 našeptávač: vyplněné IČO hlavičky se nepřepisuje → nehlídá se', dbStop('ock', ICO.B, true) === false);
  o.run("vzOtevri('z2')");
  test('#660 databáze: karta s IČO A k otevřenému B → zastaveno', dbStop('ock', ICO.A) === true);
  test('#660 databáze: karta s IČO B k otevřenému B (týž subjekt) projde', dbStop('ock', ICO.B) === false);
  /* formulář nového zákazníka */
  o.run("vzOtevri('z1'); vzFormOtevri('ock'); VZ_UI.form.h.objednatel = 'Delta zkušební'; VZ_UI.form.h.ico = '" + ICO.B + "'");
  const blok = o.run("vzFormularBlok('ock')");
  test('#660 formulář: IČO B → upozornění ve formuláři a zhasnuté „Přidat zákazníka"',
    /id="vzFormIcoDupl"/.test(blok) && /id="vzFormPridej"[^>]*disabled/.test(blok) && /Beta zkušební/.test(blok), String(blok).slice(0, 300));
  test('#660 formulář: databáze → karta s IČO A zastavena', dbStop('vzNovy', ICO.A) === true);
  o.run("VZ_UI.form.h.ico = '" + ICO.X + "'");
  const blok2 = o.run("vzFormularBlok('ock')");
  test('#660 formulář: volné IČO → bez upozornění, „Přidat" svítí', !/vzFormIcoDupl/.test(blok2) && !/id="vzFormPridej"[^>]*disabled/.test(blok2));
  /* starší data s duplicitou (B a C stejné IČO) se nezablokují */
  const st = J(zak); st.dalsiZakaznici[iC].hlavicka.ico = ICO.B;
  const os = obrazovka(st);
  test('#660 starší data s duplicitou: zákazník se zachovaným IČO projde (C dál ' + ICO.B + ')',
    os.run(`vzIcoCestaDuvod('${cesta(iC)}', '${ICO.B}')`) === '' && os.run(`vzIcoCestaDuvod('ZAK.ico', '${ICO.X}')`) === '');
  /* jeden zákazník a vypnutá funkce: nehlídá se nic */
  const o1 = obrazovka(zakazka(false));
  test('#660 jeden zákazník: IČO hlavičky se nehlídá', o1.run(`vzIcoCestaDuvod('ZAK.ico', '${ICO.B}')`) === ''
    && o1.run(`zakazniciIcoStop(zakazniciCil('ock'), { ico: '${ICO.B}' }, false)`) === false);
  /* set() v common.js volá vzIcoCestaDuvod (sestavení drží řetěz) */
  const common = fs.readFileSync(path.join(__dirname, 'ui/common.js'), 'utf8');
  test('#660: set() (common.js) odmítá IČO jiného zákazníka přes vzIcoCestaDuvod',
    /typeof vzIcoCestaDuvod === 'function'\) \{\s*const duvod = vzIcoCestaDuvod\(path, v\);/.test(common));
  const zui = fs.readFileSync(path.join(__dirname, 'ui/zakaznici_ui.js'), 'utf8');
  test('#660: databáze zákazníků (našeptávač i převzetí karty) volá zakazniciIcoStop',
    /zakazniciIcoStop\(cil, karta, true\)/.test(zui) && /zakazniciIcoStop\(cil, z, false\)/.test(zui));
}

/* ================= #660: server (vzServerZakaznici, čisté jádro) ================= */
{
  const REL = { role: 'Obchodník', email: 'f2@priklad.cz' };
  const srv = (stara, nova) => vzServerZakaznici(stara, nova, REL) || { status: 200 };
  const st = zakazka(true);                      // A, B, C — různá IČO
  const kod = (fnUprava, z0) => { const n = J(z0 || st); fnUprava(n); return srv(z0 || st, n); };
  test('#660 server: beze změny → 200', srv(st, J(st)).status === 200);
  { const st1 = J(st); st1.dalsiZakaznici[1].hlavicka.ico = '';
    const r = kod(n => { n.dalsiZakaznici[1].hlavicka.ico = '271 828 18'; }, st1);
    test('#660 server obchvat 1: doplněné IČO (= A) zákazníkovi uloženému bez IČO → 400 se jménem A', r.status === 400 && /Alfa zkušební/.test(r.chyba), r); }
  { const r = kod(n => { n.ico = ICO.B; });
    test('#660 server obchvat 2: změna IČO řídícího na IČO B → 400 se jménem B', r.status === 400 && /Beta zkušební/.test(r.chyba), r); }
  { const r = kod(n => { const x = J(n.dalsiZakaznici[0]); Object.assign(x, { id: 'z4', pismeno: 'D' }); x.hlavicka.objednatel = 'Delta zkušební';
      n.dalsiZakaznici.unshift(x); });
    test('#660 server obchvat 3: nový zákazník vložený před B se stejným IČO → 400 se jménem B (ne nového)', r.status === 400 && /Beta zkušební/.test(r.chyba) && !/Delta/.test(r.chyba), r); }
  { const r = srv(null, J(Object.assign(J(st), { ico: ICO.C })));
    test('#660 server první uložení: A a C se stejným IČO → 400 jmenuje dřívějšího (A)', r.status === 400 && /Alfa zkušební/.test(r.chyba), r); }
  { const leg = J(st); leg.dalsiZakaznici[1].hlavicka.ico = ICO.B;      // starší data: B = C
    test('#660 server starší data s duplicitou: úprava kontaktu → 200', kod(n => { n.dalsiZakaznici[1].hlavicka.kontakt = 'Jiný'; }, leg).status === 200);
    test('#660 server starší data: IČO jinak zapsané (161 803 39) → 200', kod(n => { n.dalsiZakaznici[1].hlavicka.ico = '161 803 39'; }, leg).status === 200);
    test('#660 server obnova: duplicita se nehlídá', !vzServerZakaznici(st, Object.assign(J(st), { ico: ICO.B }), REL, { obnova: true })); }
  test('#660 server: dva zákazníci bez IČO → 200', kod(n => { n.dalsiZakaznici[0].hlavicka.ico = ''; n.dalsiZakaznici[1].hlavicka.ico = ''; }).status === 200);
}

/* ================= #663: zmrazení zástupců po SoD (po zákaznících) ================= */
{
  const zak = zakazka(true);
  const vA = zak.varianty[0], vB = varZak(zak, 'z2'), vC = varZak(zak, 'z3');
  const iB = zak.dalsiZakaznici.findIndex(d => d.id === 'z2');
  const iC = zak.dalsiZakaznici.findIndex(d => d.id === 'z3');
  const zp = (i, k) => 'ZAK.dalsiZakaznici.' + i + '.zastupci.' + k;
  tiskni(zak, vA, 'z1'); tiskni(zak, vB, 'z2'); tiskni(zak, vC, 'z3');
  {
    const o = obrazovka(zak);
    test('#663: po CN zůstávají zástupci B volní (vzCestaZmrazena)', o.run(`vzCestaZmrazena('${zp(iB, 'smluvniJmeno')}')`) === '');
    test('#663: po CN — zástupci řídícího A volní (zámek hlavičky)', zamekZakCestaZmrazena(zak, 'ZAK.zastupci.smluvniJmeno') === '');
  }
  tiskni(zak, vB, 'z2', 'sod');   // SoD jen B
  {
    const o = obrazovka(zak);
    const d = o.run(`vzCestaZmrazena('${zp(iB, 'smluvniJmeno')}')`);
    test('#663: po SoD B — zástupci B zmrazení (s důvodem o smlouvě)', jeText(d) && /smlouva o dílo/.test(d) && /Beta zkušební/.test(d), d);
    test('#663: po SoD B — všech 15 polí zástupců B zmrazeno',
      VZ_ZASTUPCI_POLE.every(k => jeText(o.run(`vzCestaZmrazena('${zp(iB, k)}')`))));
    test('#663: po SoD B — DIČ B zmrazené, kontaktní osoba B volná',
      jeText(o.run(`vzCestaZmrazena('ZAK.dalsiZakaznici.${iB}.hlavicka.dic')`)) && o.run(`vzCestaZmrazena('ZAK.dalsiZakaznici.${iB}.hlavicka.kontakt')`) === '');
    test('#663: atribut pole (krycí list) u zástupce B → readonly se zámkem', /readonly class="zmrazeno"/.test(o.run(`vzPoleAttr('${zp(iB, 'banka')}')`)));
    test('#663: po SoD B — zástupci C (jen CN) volní', o.run(`vzCestaZmrazena('${zp(iC, 'smluvniJmeno')}')`) === '');
    test('#663: po SoD B — zástupci, DIČ i IČO řídícího A NEzmrazené (A smlouvu nedostal)',
      ['ZAK.zastupci.smluvniJmeno', 'ZAK.zastupci.banka', 'ZAK.dic', 'ZAK.ico', 'ZAK.objednatel'].every(c => zamekZakCestaZmrazena(zak, c) === ''),
      ['ZAK.zastupci.smluvniJmeno', 'ZAK.dic'].map(c => zamekZakCestaZmrazena(zak, c)));
    test('#663: zamekZakStav — SoD jen dalšímu zákazníkovi → sod = false', zamekZakStav(zak).sod === false);
    test('#663: název akce a adresa stavby po CN dál zmrazené (víc zákazníků)', !!zamekZakCestaZmrazena(zak, 'ZAK.nazevAkce'));
  }
  {
    const REL = { role: 'Administrátor', email: 'f2@priklad.cz' };
    const n = J(zak); n.dalsiZakaznici[iB].zastupci.smluvniJmeno = 'Jiný';
    const r = vzServerZakaznici(zak, n, REL);
    test('#663 server: po SoD B změna zástupce B → 409', !!r && r.status === 409 && /smlouva o dílo/.test(r.chyba), r);
    const n2 = J(zak); n2.dalsiZakaznici[iC].zastupci.smluvniJmeno = 'Jiný'; n2.zastupci.smluvniJmeno = 'Jiný A';
    test('#663 server: po SoD B zástupci C a A volní (vzServerZakaznici i zamekZakZmeny)', !vzServerZakaznici(zak, n2, REL) && zamekZakZmeny(zak, n2).length === 0,
      zamekZakZmeny(zak, n2));
    test('#663 server obnova: zástupci B se nehlídají', !vzServerZakaznici(zak, n, REL, { obnova: true }));
  }
  tiskni(zak, vA, 'z1', 'sod');   // SoD i řídícímu A
  {
    test('#663: po SoD řídícímu A — zástupci a DIČ v hlavičce zmrazené', !!zamekZakCestaZmrazena(zak, 'ZAK.zastupci.smluvniJmeno')
      && !!zamekZakCestaZmrazena(zak, 'ZAK.dic') && zamekZakStav(zak).sod === true);
    const o = obrazovka(zak);
    test('#663: po SoD A — zástupci C (bez SoD) dál volní', o.run(`vzCestaZmrazena('${zp(iC, 'smluvniJmeno')}')`) === '');
  }
  /* SoD PROJ a jazyková SoD se počítají jako smlouva */
  {
    const z2 = zakazka(true);
    const w = varZak(z2, 'z2');
    tiskni(z2, z2.varianty[0], 'z1'); tiskni(z2, w, 'z2'); tiskni(z2, w, 'z2', 'sod_en');
    test('#663: jazyková SoD (sod_en) dalšímu zákazníkovi zmrazí jeho zástupce', !!vzZastupciZmrazeno(z2, 'z2'));
    test('#663: vzSodOdeslanaKomu — sodProj se počítá, nabídka ne',
      vzTiskSmlouva({ typ: 'sodProj' }) && vzTiskSmlouva({ typ: 'sod_de' }) && !vzTiskSmlouva({ typ: 'nabidka' }) && !vzTiskSmlouva({ typ: 'plnaMoc' }));
  }
  /* jeden zákazník: beze změny — každá SoD zmrazí hlavičku */
  {
    const z1 = zakazka(false);
    tiskni(z1, z1.varianty[0], 'z1'); tiskni(z1, z1.varianty[0], 'z1', 'sod');
    test('#663 jeden zákazník: SoD (bez razítka „komu") zmrazí zástupce hlavičky jako dřív',
      !('zakaznik' in z1.varianty[0].zamek.tisky[1]) && !!zamekZakCestaZmrazena(z1, 'ZAK.zastupci.smluvniJmeno') && zamekZakStav(z1).sod === true);
  }
  /* SoD z doby jednoho zákazníka (bez razítka = z1), pak přidaný B: hlavička A dál zmrazená, B volný */
  {
    const z1 = zakazka(false);
    tiskni(z1, z1.varianty[0], 'z1'); tiskni(z1, z1.varianty[0], 'z1', 'sod');
    const r = vzPridej(z1, { objednatel: 'Beta zkušební a.s.', ico: ICO.B, zastupci: zast('B') }, Object.assign({ vlastni: true }, PEVNE));
    test('#663: SoD z doby jednoho zákazníka patří z1 — hlavička A zmrazená, zástupci nového B volní',
      r.ok && !!zamekZakCestaZmrazena(z1, 'ZAK.zastupci.smluvniJmeno') && vzZastupciZmrazeno(z1, 'z2') === '');
  }
}

/* ================= #661: krycí list PROJ u otevřeného dalšího zákazníka ================= */
{
  const zak = zakazka(true);
  const v1 = zak.varianty[0];
  const pB = vzTiskPohled(zak, 'z2', varZak(zak, 'z2'));
  const c = kryciProjCtx(pB, varZak(zak, 'z2'));
  test('#661: kontext KL PROJ z pohledu B — název a IČO B, ne řídícího', c.hl.objednatel === 'Beta zkušební a.s.' && c.hl.ico === ICO.B, c.hl);
  const pm = KRYCI_PROJ_SEKCE.flatMap(s => s.pole).find(p => p.id === 'pmZmocnitel');
  test('#661: zmocnitel plné moci předvyplněný zástupcem B (ne A)', pm.prefill(c) === zast('B').smluvniJmeno, pm.prefill(c));
  const cA = kryciProjCtx(zak, v1);
  test('#661: řídící / jeden zákazník — kontext beze změny (název A, zmocnitel A)',
    cA.hl.objednatel === 'Alfa zkušební s.r.o.' && pm.prefill(cA) === zast('A').smluvniJmeno);
  /* obrazovka: klpVzCtxZak a klpVzKomu za otevřeného zákazníka */
  const o = obrazovka(zak);
  o.run("vzOtevri('z3')");
  test('#661: klpVzCtxZak = kontext krycího listu OCK (klVzCtxZak)', o.run("klVzCtxZak = () => 'POHLED-OCK'; klpVzCtxZak()") === 'POHLED-OCK');
  test('#661: klpVzKomu u otevřeného C → C (ruční zmocnitel nejde do slotu řídícího)', o.run("klpVzKomu('pmZmocnitel')") === 'z3', o.run("klpVzKomu('pmZmocnitel')"));
  test('#661: klpVzKomu u pole mimo zákazníka (jednající za zhotovitele) → null', o.run("klpVzKomu('pmJednajici')") === null);
  o.run("vzOtevri('z1')");
  test('#661: klpVzKomu u řídícího → řídící', o.run("klpVzKomu('pmZmocnitel')") === 'z1');
  const o1 = obrazovka(zakazka(false));
  test('#661: jeden zákazník → klpVzKomu null (dnešek)', o1.run("klpVzKomu('pmZmocnitel')") === null);
  const s = fs.readFileSync(path.join(__dirname, 'ui/kryci_proj_ui.js'), 'utf8');
  test('#661: renderKryciProj i podmínky PROJ berou kontext z klpVzCtxZak()',
    (s.match(/kryciProjCtx\(klpVzCtxZak\(\), aktivniVarianta\(ZAK\)\)/g) || []).length === 2 && !/kryciProjCtx\(ZAK, aktivniVarianta\(ZAK\)\)/.test(s));
  test('#661: tisk PROJ pro dalšího zákazníka dál zablokovaný', /tisknou jen pro řídícího/.test(vzTiskZabrana(zak, 'z2', null, 'kryciProj_bo') || vzTiskZabrana(zak, 'z2', null, 'plnaMoc')));
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
