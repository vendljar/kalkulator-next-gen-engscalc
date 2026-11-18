/* VZ-E1 (#600) — OBRAZOVKA VÍC ZÁKAZNÍKŮ: logika src/ui/vice_zakazniku_ui.js
 * bez prohlížeče (ve vm, se stuby aplikace), aby ji hlídaly i mutace
 * „[VZ E1]". Prohlížeč (rozložení, srovnání se základem znak po znaku, XSS)
 * hlídá overit_vz_zadani.mjs.
 *
 *  – VYP + 1 zákazník: žádný prvek, vzCesta beze změny, žádný cíl ARES / DB;
 *  – ZAP + 1 zákazník: jen tlačítko „Přidat zákazníka" (ne v režimu jen ke
 *    čtení, v náhledu, u prodané zakázky);
 *  – formulář: bez názvu odmítnut, přidání (sdílená / vlastní varianta),
 *    protokol jen s názvem, otevření + zavření nepřidá klíč;
 *  – otevřený další zákazník: vzCesta míří do jeho položky, set() nemění
 *    řídícího, otevře se jeho varianta; neexistující id / VYP → řídící;
 *  – ARES (ares_ui.js aresCil): formulář a další zákazník jako cíl, řídící
 *    přesně dnešní texty; databáze zákazníků (zakaznici_ui.js zakazniciCil)
 *    do formuláře / položky bez klíče zakaznikId;
 *  – karta Zákazníci zakázky: zhasnutá tlačítka, escapování, odstranění
 *    s potvrzením na stránce (varianta smazat / ponechat, zamčená, odeslaná);
 *  – E3 (#602): stav nabídky v kartě, odstranění odeslaného jen administrátor
 *    (zhasnuté s vysvětlením / potvrzení s řádky dokladu), zmrazené údaje
 *    otevřeného dalšího zákazníka (pole, set přes cíl, ARES, databáze).
 *  – VYP + data víc zákazníků: karta s větou „funkce je vypnutá", zápis odmítnut;
 *  – sloupec Zákazník v seznamu variant, změna varianty zákazníka.
 * Pojistka: na e29f2b1 selže (ui/vice_zakazniku_ui.js neexistuje).
 * Spuštění: cd src && node test_vz_ui.js */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };

/* esc / escJs přesně jako src/ui/common.js */
const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const escJs = s => esc(String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  .replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'));

const zdroj = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const SOUBORY = ['vice_zakazniku.js', 'vz_poznamka.js', 'ares.js', 'zakaznici.js', 'ui/ares_ui.js', 'ui/zakaznici_ui.js', 'ui/vice_zakazniku_ui.js', 'ui/vz_tisk_ui.js'];

function zakazka() {
  const zast = {};
  ['smluvniJmeno', 'smluvniPozice', 'smluvniTel', 'smluvniEmail', 'obchodniJmeno', 'obchodniTel', 'obchodniEmail',
    'technickyJmeno', 'technickyTel', 'technickyEmail', 'fakturyEmail', 'fakturyTel', 'banka', 'ucet', 'zapis'].forEach(k => { zast[k] = ''; });
  return {
    cislo: '2026 - OPR - CN - 1', objednatel: 'Řídící s.r.o.', adresaObjednatele: 'Ulice 1, Praha', ico: '00000019', dic: '',
    kontakt: 'Ivo Řídící', zastupci: zast, aktivni: 'v1',
    varianty: [{ id: 'v1', nazev: 'Varianta 1', ridici: true, cena: 1000 }, { id: 'v2', nazev: 'Varianta 2', cena: 2000 }],
  };
}

function prostredi({ zap = true, cteni = false, nahled = false, zamek = false, admin = false, zak } = {}) {
  const st = { hl: [], protokol: [], render: 0, sync: 0, tab: [], sety: [] };
  const P = { zap, cteni, nahled, zamek, admin };
  const ctx = vm.createContext({
    console, JSON, Math, String, Set, Map, Array, Object, Date, Number, RegExp, Promise,
    esc, escJs, setTimeout: () => 0,
    fmt0: x => 'F0' + Math.round(x),
    render: () => { st.render++; },
    hlaska: t => { st.hl.push(String(t)); return Promise.resolve(); },
    viceZakaznikuZapnuto: () => P.zap,
    jeAdminOnline: () => P.admin,   // role Administrátor z relace (online_ui.js)
    zamekCteniJe: () => P.cteni,
    nahledAktivni: () => P.nahled,
    zamekStop: () => P.zamek,   // zamčená (odeslaná) otevřená varianta — hlavičku zakázky to neblokuje jen u formuláře
    variantaUzamcena: v => !!(v && v.zamek && v.zamek.zamceno),
    variantaProdana: v => !!(v && v.prodano),
    variantaCislo: (z, v) => z.cislo + ' / ' + v.id,
    spocitejVariantu: v => ({ ock: { souhrn: { zakladCena: v.cena || 0 } } }),
    protokolZapis: (z, o) => { st.protokol.push(o); },
    prepniTab: t => { st.tab.push(t); },
    TAB: 'kalk',
    NAST: { uzivatel: 'tester' },
  });
  ctx.ST = st;
  vm.runInContext(`
    var ZAK = null;
    function aktivniVarianta(z) { return z.varianty.find(v => String(v.id) === String(z.aktivni)) || z.varianty[0]; }
    function ridiciVarianta(z) { return z.varianty.find(v => v.ridici) || z.varianty[0]; }
    function syncVarianta() { ST.sync++; }
    function klonujVariantu(z, id, o) {
      const zdroj = z.varianty.find(v => String(v.id) === String(id));
      if (!zdroj) return null;
      const k = JSON.parse(JSON.stringify(zdroj));
      k.id = 'v' + (z.varianty.length + 1 + Math.floor(Math.random() * 0)); k.nazev = 'Kopie ' + zdroj.nazev; delete k.ridici; delete k.zamek;
      z.varianty.push(k);
      if (!o || o.aktivovat !== false) z.aktivni = k.id;
      return k;
    }
    function get(p) { return p.split('.').reduce((o, k) => o[k], { ZAK }); }
    function set(p, v) {
      const c = p.split('.'); let o = { ZAK };
      for (let i = 0; i < c.length - 1; i++) o = o[c[i]];
      o[c[c.length - 1]] = v; ST.sety.push(p); render();
    }
  `, ctx);
  SOUBORY.forEach(f => vm.runInContext(zdroj(f), ctx, { filename: f }));
  ctx.ZAK = zak || zakazka();
  vm.runInContext('vzOtevrenyId()', ctx);   // první překreslení (render) — VZ_UI.zak = otevřená zakázka
  return { ctx, st, P };
}
const run = (c, kod) => vm.runInContext(kod, c);
const J = o => JSON.stringify(o);
/* zakázka se dvěma zákazníky (přidaná přes jádro) */
function dva(o) {
  const p = prostredi(o);
  const r = run(p.ctx, "vzPridej(ZAK, { objednatel: 'Druhý a.s.', ico: '00000027', kontakt: 'Eva Druhá' }, { kdo: 't', kdy: 'x' })");
  if (!r.ok) throw new Error('vzPridej ' + r.chyba);
  run(p.ctx, 'vzOtevrenyId()');
  return p;
}

/* ---------- VYP + jeden zákazník ---------- */
{
  const { ctx } = prostredi({ zap: false });
  test('VYP + 1: tlačítko, přepínač, formulář, karta, sloupec vrací ""',
    ['vzPridatTlacitko', 'vzPrepinacRadek', 'vzFormularBlok', 'vzKarta'].every(f => run(ctx, f + "('ock')") === '')
    && run(ctx, 'vzSeznamZakaznik(ZAK.varianty[0])') === '');
  test('VYP + 1: vzCesta beze změny', run(ctx, "vzCesta('ZAK.objednatel')") === 'ZAK.objednatel');
  test('VYP + 1: žádný cíl ARES ani databáze', run(ctx, "vzAresCil('ock') === null && vzZakaznikCil('ock') === null"));
  const pred = J(ctx.ZAK);
  run(ctx, "vzFormOtevri('ock')");
  test('VYP + 1: formulář se neotevře, data beze změny', run(ctx, 'VZ_UI.form') === null && J(ctx.ZAK) === pred);
}

/* ---------- ZAP + jeden zákazník ---------- */
{
  const { ctx, P } = prostredi();
  const t = run(ctx, "vzPridatTlacitko('ock')");
  test('ZAP + 1: tlačítko „Přidat zákazníka" bez „+"', /Přidat zákazníka/.test(t) && !/\+/.test(t) && /vzFormOtevri\('ock'\)/.test(t), t);
  test('ZAP + 1: přepínač, formulář, karta, sloupec ""', run(ctx, "vzPrepinacRadek('ock') === '' && vzFormularBlok('ock') === '' && vzKarta('ock') === '' && vzSeznamZakaznik(ZAK.varianty[0]) === ''"));
  test('ZAP + 1: vzCesta beze změny, ARES / DB cíl null', run(ctx, "vzCesta('ZAK.kontakt') === 'ZAK.kontakt' && vzAresCil('ock') === null && vzZakaznikCil('ock') === null"));
  P.cteni = true;
  test('jen ke čtení: tlačítko chybí', run(ctx, "vzPridatTlacitko('ock')") === '');
  P.cteni = false; P.nahled = true;
  test('náhled za jiného uživatele: tlačítko chybí', run(ctx, "vzPridatTlacitko('ock')") === '');
  P.nahled = false; ctx.ZAK.varianty[1].prodano = { kdy: 'x' };
  test('prodaná zakázka: tlačítko chybí', run(ctx, "vzPridatTlacitko('ock')") === '');
  delete ctx.ZAK.varianty[1].prodano;
  test('zpět normálně: tlačítko je', run(ctx, "vzPridatTlacitko('ock')") !== '');
}

/* ---------- formulář: otevřít, zavřít, přidat ---------- */
{
  const { ctx, st } = prostredi();
  const pred = J(ctx.ZAK);
  run(ctx, "vzFormOtevri('ock')");
  test('vzFormOtevri: VZ_UI.form pro ock', run(ctx, "VZ_UI.form && VZ_UI.form.kde === 'ock' && VZ_UI.form.nova === 'stejna'"));
  test('formulář se kreslí jen v ock, tlačítko zhasne', /id="vzFormular"/.test(run(ctx, "vzFormularBlok('ock')")) && run(ctx, "vzFormularBlok('proj')") === ''
    && /disabled/.test(run(ctx, "vzPridatTlacitko('ock')")));
  test('formulář bez názvu: Přidat zhasnuté', /id="vzFormPridej" onclick="vzFormPridej\(\)" disabled/.test(run(ctx, "vzFormularBlok('ock')")));
  run(ctx, 'vzFormPridej()');
  test('vzFormPridej bez názvu → hláška obrazovky, data beze změny, formulář zůstává', st.hl.length === 1 && /ručně, z ARES nebo z databáze/.test(st.hl[0]) && J(ctx.ZAK) === pred && run(ctx, 'VZ_UI.form !== null'), st.hl);
  run(ctx, "vzFormPole('objednatel', '   ')"); run(ctx, 'vzFormPridej()');
  test('jen mezery v názvu → hláška, data beze změny', st.hl.length === 2 && J(ctx.ZAK) === pred);
  run(ctx, 'vzFormZavri()');
  test('otevřít + zavřít formulář: žádný klíč navíc (JSON ZAK beze změny)', J(ctx.ZAK) === pred && run(ctx, 'VZ_UI.form') === null);
}
{
  const { ctx, st } = prostredi();
  run(ctx, "vzFormOtevri('ock'); vzFormPole('objednatel', 'Druhý a.s.'); vzFormPole('ico', '00000027'); vzFormPole('kontakt', 'Eva Druhá'); vzFormPole('neznamy', 'x')");
  test('vzFormPole neznámé pole nezapíše', run(ctx, "!('neznamy' in VZ_UI.form.h)"));
  run(ctx, 'vzFormPridej()');
  const z = ctx.ZAK;
  test('přidání: vzRidici + dalsiZakaznici, id z2, písmeno B, sdílí řídící variantu', z.vzRidici && z.vzRidici.id === 'z1'
    && z.dalsiZakaznici.length === 1 && z.dalsiZakaznici[0].id === 'z2' && z.dalsiZakaznici[0].pismeno === 'B'
    && z.dalsiZakaznici[0].varianta === 'v1' && z.varianty.length === 2, z.dalsiZakaznici);
  test('údaje jdou do položky, hlavička řídícího beze změny', z.dalsiZakaznici[0].hlavicka.ico === '00000027'
    && z.objednatel === 'Řídící s.r.o.' && z.kontakt === 'Ivo Řídící');
  test('formulář zavřený, otevřený zůstává řídící', run(ctx, 'VZ_UI.form') === null && run(ctx, 'vzOtevrenyId()') === 'z1');
  test('protokol: jeden záznam s názvem, bez IČO a kontaktu', st.protokol.length === 1 && st.protokol[0].po === 'Druhý a.s.'
    && !/00000027|Eva Druhá/.test(J(st.protokol)), st.protokol);
  test('žádná hláška', st.hl.length === 0, st.hl);
}
{
  const { ctx } = prostredi();
  run(ctx, "vzFormOtevri('ock'); vzFormPole('objednatel', 'Vlastní s.r.o.'); vzFormNova('vlastni'); vzFormPridej()");
  const z = ctx.ZAK;
  test('„vlastni" → nová varianta, zákazník na ni ukazuje', z.varianty.length === 3 && z.dalsiZakaznici[0].varianta === String(z.varianty[2].id)
    && z.dalsiZakaznici[0].varianta !== 'v1', z.dalsiZakaznici && z.dalsiZakaznici[0]);
}

/* ---------- otevřený další zákazník ---------- */
{
  const { ctx, st } = dva();
  run(ctx, "vzVlastniVarianta('z2')");
  const vz2 = ctx.ZAK.dalsiZakaznici[0].varianta;
  test('vzVlastniVarianta: nová varianta pro z2, otevře se', vz2 === 'v3' && ctx.ZAK.aktivni === 'v3' && run(ctx, 'vzOtevrenyId()') === 'z2', vz2);
  run(ctx, "vzOtevri('z1')");
  test('vzOtevri(řídící): otevřený z1, varianta řídící', run(ctx, 'vzOtevrenyId()') === 'z1' && ctx.ZAK.aktivni === 'v1');
  test('řídící otevřený: vzCesta beze změny', run(ctx, "vzCesta('ZAK.kontakt')") === 'ZAK.kontakt');
  run(ctx, "vzOtevri('z2')");
  test('vzOtevri(z2): ZAK.aktivni = varianta zákazníka', ctx.ZAK.aktivni === vz2 && run(ctx, 'vzOtevrenyId()') === 'z2');
  test('vzCesta(ZAK.kontakt) → ZAK.dalsiZakaznici.0.hlavicka.kontakt', run(ctx, "vzCesta('ZAK.kontakt')") === 'ZAK.dalsiZakaznici.0.hlavicka.kontakt');
  test('vzCesta(ZAK.objednatel / ZAK.ico) do položky', run(ctx, "vzCesta('ZAK.objednatel')") === 'ZAK.dalsiZakaznici.0.hlavicka.objednatel'
    && run(ctx, "vzCesta('ZAK.ico')") === 'ZAK.dalsiZakaznici.0.hlavicka.ico');
  test('vzCesta(ZAK.cislo / ZAK.nazevAkce) beze změny', run(ctx, "vzCesta('ZAK.cislo')") === 'ZAK.cislo' && run(ctx, "vzCesta('ZAK.nazevAkce')") === 'ZAK.nazevAkce');
  run(ctx, "set(vzCesta('ZAK.kontakt'), 'Nový Kontakt')");
  test('set přes vzCesta nezmění řídícího', ctx.ZAK.kontakt === 'Ivo Řídící' && ctx.ZAK.dalsiZakaznici[0].hlavicka.kontakt === 'Nový Kontakt');
  run(ctx, "VZ_UI.otevreny = 'z9'");
  test('neexistující id → řídící', run(ctx, 'vzOtevrenyId()') === 'z1' && run(ctx, 'vzOtevrenyIndex()') === -1 && run(ctx, "vzCesta('ZAK.kontakt')") === 'ZAK.kontakt');
  run(ctx, "vzOtevri('z9')");
  test('vzOtevri(neexistující) nic nezmění', ctx.ZAK.aktivni === 'v1' || ctx.ZAK.aktivni === vz2);
  st.hl.length = 0;
}
{
  /* druhý další zákazník → index 1 */
  const { ctx } = dva();
  run(ctx, "vzPridej(ZAK, { objednatel: 'Třetí' }, {})");
  run(ctx, "vzOtevri('z3')");
  test('třetí zákazník: vzCesta míří na index 1', run(ctx, "vzCesta('ZAK.ico')") === 'ZAK.dalsiZakaznici.1.hlavicka.ico');
}
{
  const { ctx, P } = dva();
  run(ctx, "vzOtevri('z2')");
  P.zap = false;
  test('VYP s daty: otevřený vždy řídící, vzCesta beze změny', run(ctx, 'vzOtevrenyId()') === 'z1' && run(ctx, "vzCesta('ZAK.kontakt')") === 'ZAK.kontakt');
  test('VYP s daty: ARES / DB cíl ock = null (hlavička řídícího)', run(ctx, "vzAresCil('ock') === null && vzZakaznikCil('ock') === null"));
  run(ctx, "VZ_UI.otevreny = ''");
  run(ctx, "vzOtevri('z2')");
  test('VYP s daty: vzOtevri nic neotevře', run(ctx, 'VZ_UI.otevreny') === '');
}

/* ---------- ARES: cíl ---------- */
const SUBJ = { nazev: 'Firma z rejstříku a.s.', adresa: 'Rejstříková 5, Brno', ico: '00000035', dic: 'CZ00000035' };
{
  const { ctx, st } = prostredi();
  const c = run(ctx, "aresCil('ock')");
  test('řídící: aresCil.hlavicka === ZAK a dnešní texty', c.hlavicka === ctx.ZAK && c.ted === 'V hlavičce teď'
    && c.prepsat === 'Přepsat údaje v hlavičce' && c.uzObsahuje === 'Hlavička už tyhle údaje obsahuje – přepisovat není co.'
    && c.zdroj === 'Přepis se provede jen na tomhle potvrzení a zapíše se do protokolu zakázky.' && c.poPrepisu === undefined && c.zmrazeno === undefined);
  run(ctx, "ARES.kde = 'ock'; ARES.subjekt = " + J(SUBJ));
  const pan = run(ctx, "aresPanel('ock')");
  test('řídící: panel ARES s dnešními texty', /<th>Údaj<\/th><th>V hlavičce teď<\/th><th>Z rejstříku<\/th>/.test(pan)
    && /Přepsat údaje v hlavičce \(4\)<\/button>/.test(pan) && /Přepis se provede jen na tomhle potvrzení a zapíše se do protokolu zakázky\./.test(pan), pan.slice(0, 500));
  run(ctx, "aresPrepisPotvrd('ock')");
  test('řídící: přepis do hlavičky zakázky', ctx.ZAK.objednatel === SUBJ.nazev && ctx.ZAK.dic === SUBJ.dic && /T/.test(ctx.ZAK.varianty[0].upraveno || ''));
  test('řídící: ARES protokol ručně nepíše', st.protokol.length === 0);
  run(ctx, "ARES.kde = 'ock'; ARES.subjekt = " + J(SUBJ));
  test('řídící: shodné údaje → „Hlavička už tyhle údaje obsahuje"', /Hlavička už tyhle údaje obsahuje – přepisovat není co\./.test(run(ctx, "aresPanel('ock')")));
}
{
  const { ctx } = prostredi();
  test('vzAresCil(vzNovy) bez formuláře: prázdná hlavička, nezmrazeno', run(ctx, "(() => { const c = vzAresCil('vzNovy'); return c.zmrazeno === '' && c.hlavicka.objednatel === '' && !c.ted; })()"));
  run(ctx, "vzFormOtevri('ock')");
  const c = run(ctx, "aresCil('vzNovy')");
  test('formulář: ted „Ve formuláři teď", hlavička = formulář', c.ted === 'Ve formuláři teď' && c.hlavicka === run(ctx, 'VZ_UI.form.h')
    && c.prepsat === 'Převzít údaje do formuláře' && c.zmrazeno === '');
  const pred = J(ctx.ZAK);
  run(ctx, "ARES.kde = 'vzNovy'; ARES.subjekt = " + J(SUBJ));
  const pan = run(ctx, "aresPanel('vzNovy')");
  test('formulář: panel „Ve formuláři teď" / „Převzít údaje do formuláře"', /<th>Ve formuláři teď<\/th>/.test(pan) && /Převzít údaje do formuláře \(4\)/.test(pan) && !/V hlavičce teď/.test(pan));
  test('formulář: aresZmrazeno = ""', run(ctx, "aresZmrazeno('vzNovy')") === '');
  run(ctx, "aresPrepisPotvrd('vzNovy')");
  const f = run(ctx, 'VZ_UI.form');
  test('formulář: aresPrepis zapíše do formuláře, zdroj ARES', f.h.objednatel === SUBJ.nazev && f.h.ico === SUBJ.ico && f.h.dic === SUBJ.dic && f.zdroj === 'ARES');
  test('formulář: zakázka beze změny', J(ctx.ZAK) === pred);
}
{
  const { ctx, st } = dva();
  run(ctx, "vzOtevri('z2')");
  const c = run(ctx, "aresCil('ock')");
  test('otevřený další: aresCil.hlavicka = jeho položka, zmrazeno ""', c.hlavicka === ctx.ZAK.dalsiZakaznici[0].hlavicka && c.zmrazeno === '' && c.ted === 'V hlavičce teď');
  test('aresHlavicka(ock) = položka i pro proj', run(ctx, "aresHlavicka('proj')") === ctx.ZAK.dalsiZakaznici[0].hlavicka);
  run(ctx, "ARES.kde = 'ock'; ARES.subjekt = " + J(SUBJ) + "; aresPrepisPotvrd('ock')");
  test('otevřený další: přepis do položky, řídící beze změny', ctx.ZAK.dalsiZakaznici[0].hlavicka.objednatel === SUBJ.nazev && ctx.ZAK.objednatel === 'Řídící s.r.o.'
    && ctx.ZAK.ico === '00000019');
  test('otevřený další: protokol s názvem, bez IČO', st.protokol.length === 1 && st.protokol[0].po === SUBJ.nazev && !/00000035/.test(J(st.protokol)), st.protokol);
}

/* ---------- databáze zákazníků: cíl ---------- */
const KARTA = { nazev: 'Karta s.r.o.', sidlo: 'Kartová 1', ico: '00000043', dic: 'CZ00000043', kontaktOsoba: 'Jan Karta', smluvniJmeno: 'Jan Karta', banka: 'Banka' };
{
  const { ctx } = prostredi({ zamek: true });
  test('jeden zákazník: zakazniciCil(ock).zak === ZAK', run(ctx, "zakazniciCil('ock').zak") === ctx.ZAK);
  test('vzZakaznikCil(vzNovy) bez formuláře = null', run(ctx, "vzZakaznikCil('vzNovy')") === null);
  run(ctx, "vzFormOtevri('ock')");
  const pred = J(ctx.ZAK);
  ctx.KARTA = KARTA;
  const v = run(ctx, "zakaznikPredvypln(KARTA, vzZakaznikCil('vzNovy').zak)");
  const f = run(ctx, 'VZ_UI.form');
  test('zakaznikPredvypln → formulář', f.h.objednatel === 'Karta s.r.o.' && f.h.ico === '00000043' && f.h.kontakt === 'Jan Karta' && v.zmeny.length === 5, v);
  test('… bez klíče zakaznikId (formulář ani zakázka)', !('zakaznikId' in f.h) && !('zakaznikId' in f) && J(ctx.ZAK) === pred);
  run(ctx, "vzFormZavri(); vzFormOtevri('ock')");
  run(ctx, "ZAK_DB.seznam = [KARTA]; zakaznikDoZakazkyUI(zakaznikKlic(KARTA), 'vzNovy')");
  const f2 = run(ctx, 'VZ_UI.form');
  test('zakaznikDoZakazkyUI(…, vzNovy) → formulář vč. zástupců, zdroj databáze', f2.h.objednatel === 'Karta s.r.o.' && f2.zastupci.smluvniJmeno === 'Jan Karta'
    && f2.zastupci.banka === 'Banka' && f2.zdroj === 'databáze zákazníků' && !('zakaznikId' in f2.h), f2);
  test('… zakázka beze změny', J(ctx.ZAK) === pred);
  run(ctx, "vzFormZavri(); vzFormOtevri('ock'); naseptavacZakVyber('Karta s.r.o.', 'vzNovy')");
  const f3 = run(ctx, 'VZ_UI.form');
  test('našeptávač ve formuláři → formulář, zakázka beze změny', f3.h.ico === '00000043' && J(ctx.ZAK) === pred && !('zakaznikId' in f3.h));
}
{
  const { ctx } = dva();
  ctx.KARTA = KARTA;
  run(ctx, "vzOtevri('z2')");
  const d = ctx.ZAK.dalsiZakaznici[0];
  run(ctx, "zakaznikDoZakazky(KARTA, vzZakaznikCil('ock').zak)");
  test('otevřený další: zakaznikDoZakazky → hlavička a zástupci položky', d.hlavicka.objednatel === 'Karta s.r.o.' && d.hlavicka.kontakt === 'Jan Karta'
    && d.zastupci.smluvniJmeno === 'Jan Karta' && d.zastupci.banka === 'Banka');
  test('… bez zakaznikId v položce i v zakázce, řídící beze změny', !('zakaznikId' in d) && !('zakaznikId' in d.hlavicka) && !('zakaznikId' in ctx.ZAK)
    && ctx.ZAK.objednatel === 'Řídící s.r.o.' && ctx.ZAK.zastupci.smluvniJmeno === '');
  test('… tvar položky bez vad', run(ctx, 'vzTvarProblemy(ZAK).length') === 0, run(ctx, 'vzTvarProblemy(ZAK)'));
  run(ctx, "vzZakaznikCil('ock').set('kontakt', 'Přes set')");
  test('cíl.set jde přes vzCesta do položky', d.hlavicka.kontakt === 'Přes set' && ctx.ZAK.kontakt === 'Ivo Řídící');
  run(ctx, "ZAK_DB.seznam = [KARTA]; zakaznikDoZakazkyUI(zakaznikKlic(KARTA), 'ock')");
  test('zakaznikDoZakazkyUI u dalšího: hláška „K zákazníkovi …"', /K zákazníkovi Karta s\.r\.o\.|U zákazníka Karta s\.r\.o\./.test(run(ctx, 'ZAK_DB.hlaska')) && !('zakaznikId' in ctx.ZAK));
  test('karta zákazníka: popisek tlačítka podle otevřeného', run(ctx, 'vzZakaznikKartaPopis()') === 'Přenést k zákazníkovi Karta s.r.o.');
}

/* ---------- karta Zákazníci zakázky ---------- */
{
  const { ctx, st } = dva();
  ctx.ZAK.dalsiZakaznici[0].hlavicka.objednatel = '<b>x</b>"\'';
  const k = run(ctx, "vzKarta('ock')");
  test('karta: 2 zákazníci → karta s nadpisem', /id="vzKarta_ock"/.test(k) && /Zákazníci zakázky/.test(k));
  test('karta: Odstranit řídícího zhasnuté', /onclick="vzOdstranit\('z1'\)" disabled title="Řídícího zákazníka nejde odstranit/.test(k), k.match(/vzOdstranit[^>]*>/g));
  test('karta: Odstranit dalšího aktivní', /onclick="vzOdstranit\('z2'\)">Odstranit/.test(k), k.match(/vzOdstranit[^>]*>/g));
  /* VZ-E2 #601: Tisk CN zapojený (vzTiskCN); VZ-E4: Prodáno zapojené (vzProdejOtevri), u nezamčené
   * varianty zhasnuté s důvodem z jádra (vzProdejNelze); číslo nabídky s písmenem. */
  test('karta: Tisk CN aktivní u obou (E2), Prodáno zapojené a u neodeslané zhasnuté (E4, 2×)', /onclick="vzTiskCN\('z1'\)" title=/.test(k) && /onclick="vzTiskCN\('z2'\)" title=/.test(k)
    && (k.match(/onclick="vzProdejOtevri\('z[12]'\)" disabled title="(Prodat jde jen odeslanou|Zákazníkovi „[^"]*tato nabídka neodešla)/g) || []).length === 2, k.match(/vzProdejOtevri[^>]*>/g));
  test('karta: číslo nabídky dalšího zákazníka s písmenem (E2)', (k.match(/class="vz-cislo">([^<]*)</g) || []).some(x => /-B</.test(x))
    && (k.match(/class="vz-cislo">([^<]*)</g) || []).filter(x => /-[B-Z]</.test(x)).length === 1, k.match(/class="vz-cislo">[^<]*</g));
  /* T1: sloupec Řídící jen ukazuje ★ / ☆ (řídícího určuje hlavička), žádný přepínač. */
  test('karta: Řídící jen ★ / ☆, žádné radio ani vzRidiciZmen (T1)', /data-vz-ridici="z1" title="řídící zákazník">★</.test(k)
    && /class="vz-t1-hvezda mut" data-vz-ridici="z2" title="řídícího určuje hlavička[^"]*">☆</.test(k)
    && !/type="radio"/.test(k) && k.indexOf('vzRidiciZmen') < 0, k.match(/data-vz-ridici[^>]*>./g));
  test('karta: Vlastní varianta řídícího zhasnutá', /vzVlastniVarianta\('z1'\)" disabled/.test(k) && /vzVlastniVarianta\('z2'\)">/.test(k));
  test('karta: výběr varianty řídícího zhasnutý, dalšího ne', /vzVariantaSet\('z1', this.value\)" disabled/.test(k) && /vzVariantaSet\('z2', this.value\)">/.test(k));
  test('karta: escapování názvu (žádný surový tag ani uvozovka)', k.indexOf('<b>x</b>') < 0 && k.indexOf('"\'') < 0 && k.indexOf('&lt;b&gt;x&lt;/b&gt;&quot;&#39;') >= 0);
  const p = run(ctx, "vzPrepinacRadek('ock')");
  test('přepínač: ★ řídící, písmeno, +, escapování', /★ Řídící s\.r\.o\./.test(p) && /· -B/.test(p) && />\+<\/button>/.test(p) && p.indexOf('<b>x</b>') < 0 && p.indexOf('"\'') < 0, p);
  test('karta: cena a číslo varianty', /F01000/.test(k) && /2026 - OPR - CN - 1 \/ v1/.test(k));
  /* odstranění s potvrzením */
  run(ctx, "vzOdstranit('z2')");
  test('vzOdstranit → VZ_UI.odstranit (smazat výchozí)', J(run(ctx, 'VZ_UI.odstranit')) === J({ id: 'z2', smazat: true }));
  const k2 = run(ctx, "vzKarta('ock')");
  test('potvrzení v kartě ock (escapované), ne v Přehledu', /id="vzOdstranPotvrzeni"/.test(k2) && k2.indexOf('<b>x</b>') < 0 && !/vzOdstranPotvrzeni/.test(run(ctx, "vzKarta('zakazka')")));
  test('sdílená varianta: „zůstává beze změny"', /zůstává beze změny — používá ji Řídící s\.r\.o\./.test(k2));
  const pred = J(ctx.ZAK);
  run(ctx, 'vzOdstranitPotvrd(false)');
  test('vzOdstranitPotvrd(false) nic nezmění', J(ctx.ZAK) === pred && run(ctx, 'VZ_UI.odstranit') === null);
  run(ctx, "vzOdstranit('z1')");
  test('vzOdstranit(řídící) → hláška, žádné potvrzení', run(ctx, 'VZ_UI.odstranit') === null && /Řídícího zákazníka nejde odstranit/.test(st.hl[st.hl.length - 1]));
  run(ctx, "vzOdstranit('z2'); vzOdstranitPotvrd(true)");
  test('po odstranění posledního: bez klíčů vzRidici / dalsiZakaznici, varianty zůstávají', !('vzRidici' in ctx.ZAK) && !('dalsiZakaznici' in ctx.ZAK)
    && ctx.ZAK.varianty.length === 2 && ctx.ZAK.aktivni === 'v1');
  test('po odstranění: obrazovka jako s jedním zákazníkem', run(ctx, "vzKarta('ock') === '' && vzPrepinacRadek('ock') === '' && vzPridatTlacitko('ock') !== ''"));
  test('protokol odstranění s názvem', /Odstraněn zákazník/.test(st.protokol[st.protokol.length - 1].co) && st.protokol[st.protokol.length - 1].pred === '<b>x</b>"\'');
}
{
  /* vlastní nezamčená varianta: smazat × ponechat */
  const a = dva();
  run(a.ctx, "vzVlastniVarianta('z2'); vzOdstranit('z2')");
  test('vlastní varianta: volba smazat / ponechat v potvrzení', /name="vzOdstranVar" value="smazat" checked/.test(run(a.ctx, "vzKarta('ock')")));
  run(a.ctx, 'vzOdstranitPotvrd(true)');
  test('smazat=true: vlastní varianta pryč, aktivní řídící', a.ctx.ZAK.varianty.length === 2 && !a.ctx.ZAK.varianty.some(v => v.id === 'v3') && a.ctx.ZAK.aktivni === 'v1');
  const b = dva();
  run(b.ctx, "vzVlastniVarianta('z2'); vzOdstranit('z2'); VZ_UI.odstranit.smazat = false; vzOdstranitPotvrd(true)");
  test('smazat=false: vlastní varianta zůstává, klíče pryč', b.ctx.ZAK.varianty.length === 3 && !('dalsiZakaznici' in b.ctx.ZAK) && !('vzRidici' in b.ctx.ZAK));
  /* E3: zamčená vlastní varianta BEZ razítka „komu" (tisk patří z1) — B nic
   * neodešlo → odstranit smí každý, varianta zůstává zamčená (jádro ji nesmaže) */
  const c = dva();
  run(c.ctx, "vzVlastniVarianta('z2')");
  c.ctx.ZAK.varianty[2].zamek = { zamceno: true, tisky: [{ kdy: '2026-11-16T10:00:00Z' }] };
  test('E3: zamčená vlastní varianta bez razítka B → Odstranit povolené', run(c.ctx, "vzOdstranitDuvod(vzZakaznik(ZAK, 'z2'))") === ''
    && /onclick="vzOdstranit\('z2'\)">Odstranit/.test(run(c.ctx, "vzKarta('ock')")));
  run(c.ctx, "vzOdstranit('z2')");
  test('E3: … potvrzení „zůstává v zakázce zamčená", písmeno se uvolní', /zůstává v zakázce zamčená<\/b> jako doklad/.test(run(c.ctx, "vzKarta('ock')"))
    && /uvolní se — nic s ním neodešlo/.test(run(c.ctx, "vzKarta('ock')")));
  run(c.ctx, 'vzOdstranitPotvrd(true)');
  test('E3: … po odstranění zamčená varianta zůstává', c.ctx.ZAK.varianty.length === 3 && !('dalsiZakaznici' in c.ctx.ZAK));
  /* razítko tisku s id zákazníka (zamčená sdílená varianta) */
  const d = dva();
  d.ctx.ZAK.varianty[0].zamek = { zamceno: true, tisky: [{ kdy: '2026-11-16T10:00:00Z', zakaznik: { id: 'z2', pismeno: 'B', cislo: '2026 - OPR - CN - 1-B', objednatel: 'Druhý a.s.', ico: '00000027' } }] };
  test('razítko tisku s id zákazníka → vzOdeslano jen u něj', run(d.ctx, "vzOdeslano(vzZakaznik(ZAK, 'z2'))") === true && run(d.ctx, "vzOdeslano(vzZakaznik(ZAK, 'z1'))") === false);
  const kd = run(d.ctx, "vzKarta('ock')");
  test('E3 obchodník: Odstranit odeslaného zhasnuté s vysvětlením „jen administrátor"',
    /onclick="vzOdstranit\('z2'\)" disabled title="Zákazníkovi už odešla nabídka — odstranit ho smí jen administrátor/.test(kd), kd.match(/vzOdstranit\('z2'\)[^>]*>/g));
  const predD = J(d.ctx.ZAK);
  run(d.ctx, "vzOdstranit('z2')");
  test('E3 obchodník: vzOdstranit odmítne s hláškou, nic se nezmění', run(d.ctx, 'VZ_UI.odstranit') === null && J(d.ctx.ZAK) === predD
    && /jen administrátor/.test(d.st.hl[d.st.hl.length - 1]));
  run(d.ctx, "VZ_UI.odstranit = { id: 'z2', smazat: true }; vzOdstranitPotvrd(true)");
  test('E3 obchodník: ani podstrčené potvrzení neodstraní', J(d.ctx.ZAK) === predD);
  d.P.admin = true;
  const ka = run(d.ctx, "vzKarta('ock')");
  test('E3 administrátor: Odstranit odeslaného povolené', /onclick="vzOdstranit\('z2'\)">Odstranit/.test(ka), ka.match(/vzOdstranit\('z2'\)[^>]*>/g));
  run(d.ctx, "vzOdstranit('z2')");
  const pa = run(d.ctx, "vzKarta('ock')");
  test('E3 administrátor: potvrzení „Jeho nabídka … odeslána 16. 11. 2026 → doklad zůstává"',
    /Jeho nabídka 2026 - OPR - CN - 1-B<\/span><span>odeslána 16\. 11\. 2026 → <b>doklad zůstává<\/b> v zakázce \(razítko tisku se snímkem adresáta/.test(pa), pa.slice(pa.indexOf('vzOdstranPotvrzeni'), pa.indexOf('vzOdstranPotvrzeni') + 900));
  test('E3 administrátor: sdílená varianta „razítko tisku … zůstává", Kdo smí, písmeno se nepřidělí',
    /zůstává beze změny — používá ji Řídící s\.r\.o\.; razítko tisku pro tohoto zákazníka v zámku varianty zůstává/.test(pa)
    && /Kdo smí<\/span><span>jen <b>administrátor<\/b>/.test(pa) && /Písmeno -B<\/span><span>už se nepřidělí jinému zákazníkovi/.test(pa) && !/uvolní se/.test(pa));
  run(d.ctx, 'vzOdstranitPotvrd(true)');
  test('E3 administrátor: odstraněno, razítko zůstává, protokol „s odeslanou nabídkou"', !('dalsiZakaznici' in d.ctx.ZAK)
    && d.ctx.ZAK.varianty[0].zamek.tisky[0].zakaznik.id === 'z2' && /s odeslanou nabídkou \(doklad zůstává\)/.test(d.st.protokol[d.st.protokol.length - 1].co)
    && !/00000027/.test(J(d.st.protokol)));
  test('E3: po odstranění písmeno B se nepřidělí (nový zákazník dostane C)', run(d.ctx, 'vzPismenoDalsi(ZAK)') === 'C');
  /* vlastní zamčená varianta odeslaná B, administrátor */
  const g = dva({ admin: true });
  run(g.ctx, "vzVlastniVarianta('z2')");
  g.ctx.ZAK.varianty[2].zamek = { zamceno: true, cislo: '2026 - OPR - CN - 1 / v3', tisky: [{ kdy: '2026-11-16T10:00:00Z', zakaznik: { id: 'z2', pismeno: 'B', cislo: '2026 - OPR - CN - 1 / v3-B', objednatel: 'Druhý a.s.', ico: '00000027' } }] };
  run(g.ctx, "vzOdstranit('z2')");
  const pg = run(g.ctx, "vzKarta('ock')");
  test('E3 administrátor, vlastní zamčená: „zůstává v zakázce zamčená jako doklad s číslem …-B", bez volby smazat',
    /<b>zůstává v zakázce zamčená<\/b> jako doklad s číslem 2026 - OPR - CN - 1 \/ v3-B — smazat ji lze jen jako dnes/.test(pg) && !/name="vzOdstranVar"/.test(pg), pg.slice(pg.indexOf('vzOdstranPotvrzeni'), pg.indexOf('vzOdstranPotvrzeni') + 900));
  run(g.ctx, 'vzOdstranitPotvrd(true)');
  test('E3 administrátor, vlastní zamčená: varianta zůstává, číslo dokladu z razítka', g.ctx.ZAK.varianty.length === 3
    && run(g.ctx, 'vzCisloDokladu(ZAK, ZAK.varianty[2])') === '2026 - OPR - CN - 1 / v3-B');
  /* potvrzení zamčené uprostřed: vzOdstranitPotvrd znovu ověří důvod */
  const e = dva();
  run(e.ctx, "vzOdstranit('z2')");
  e.ctx.ZAK.varianty[0].zamek = { zamceno: true, tisky: [{ kdy: 'x', zakaznik: { id: 'z2', pismeno: 'B' } }] };
  run(e.ctx, 'vzOdstranitPotvrd(true)');
  test('odeslaný mezi kliknutím a potvrzením → neodstraní (obchodník)', e.ctx.ZAK.dalsiZakaznici && e.ctx.ZAK.dalsiZakaznici.length === 1 && e.st.hl.length === 1);
  /* bez přihlášení (jeAdminOnline chybí) = není administrátor */
  const h = dva({ admin: true });
  h.ctx.ZAK.varianty[0].zamek = { zamceno: true, tisky: [{ kdy: 'x', zakaznik: { id: 'z2', pismeno: 'B' } }] };
  run(h.ctx, 'jeAdminOnline = undefined');
  test('E3: bez jeAdminOnline (offline) → není administrátor', /jen administrátor/.test(run(h.ctx, "vzOdstranitDuvod(vzZakaznik(ZAK, 'z2'))")));
}

/* ---------- E3: stav nabídky v kartě ---------- */
{
  const { ctx } = dva();
  const stav = id => { const k = run(ctx, "vzKarta('ock')"); const m = new RegExp('data-vz="' + id + '"[\\s\\S]*?data-l="Stav">([^<]*)<').exec(k); return m ? m[1] : null; };
  test('E3 stav: bez tisku „rozpracovaná" u obou', stav('z1') === 'rozpracovaná' && stav('z2') === 'rozpracovaná', [stav('z1'), stav('z2')]);
  ctx.ZAK.varianty[0].zamek = { zamceno: true, cislo: '2026 - OPR - CN - 1', tisky: [
    { kdy: '2026-11-12T09:00:00Z' },
    { kdy: '2026-11-16T10:00:00Z', zakaznik: { id: 'z2', pismeno: 'B', cislo: '2026 - OPR - CN - 1-B', objednatel: 'Druhý a.s.', ico: '00000027' } }] };
  test('E3 stav: řídící „odeslána 12. 11. 2026" (tisk bez razítka = z1), B „odeslána 16. 11. 2026"',
    stav('z1') === 'odeslána 12. 11. 2026' && stav('z2') === 'odeslána 16. 11. 2026', [stav('z1'), stav('z2')]);
  run(ctx, "vzVlastniVarianta('z2')");
  test('E3 stav: B na nové vlastní variantě „rozpracovaná (platí …-B z 16. 11.)"', stav('z2') === 'rozpracovaná (platí 2026 - OPR - CN - 1-B z 16. 11.)', stav('z2'));
  ctx.ZAK.varianty[0].prodano = { kdy: 'x' };
  test('E3 stav: prodaná varianta „prodáno"', stav('z1') === 'prodáno');
}

/* ---------- E3: zmrazené údaje otevřeného dalšího zákazníka ---------- */
{
  const { ctx, st } = dva();
  run(ctx, "vzOtevri('z2')");
  test('E3 zmrazení: bez odeslané nabídky vzPoleAttr "" a ARES / DB cíl nezmrazen', run(ctx, "vzPoleAttr(vzCesta('ZAK.objednatel'))") === ''
    && run(ctx, "vzAresCil('ock').zmrazeno") === '' && run(ctx, "vzZakaznikCil('ock').zmrazeno()") === '');
  ctx.ZAK.varianty[0].zamek = { zamceno: true, tisky: [{ kdy: '2026-11-16T10:00:00Z', zakaznik: { id: 'z2', pismeno: 'B', cislo: 'x-B', objednatel: 'Druhý a.s.', ico: '00000027' } }] };
  const a = run(ctx, "vzPoleAttr(vzCesta('ZAK.objednatel'))");
  test('E3 zmrazení: objednatel / ico / adresa / dic readonly s důvodem', /^ readonly class="zmrazeno" title="🔒 Zákazníkovi už odešla nabídka — název, sídlo, IČO a DIČ se už nemění/.test(a)
    && ['ico', 'adresaObjednatele', 'dic'].every(k => /readonly/.test(run(ctx, "vzPoleAttr(vzCesta('ZAK." + k + "'))"))), a);
  test('E3 zmrazení: kontakt zůstává volný', run(ctx, "vzPoleAttr(vzCesta('ZAK.kontakt'))") === '' && run(ctx, "vzCestaZmrazena(vzCesta('ZAK.kontakt'))") === '');
  test('E3 zmrazení: řídící a cizí cesty nezmrazené', run(ctx, "vzPoleAttr('ZAK.objednatel')") === '' && run(ctx, "vzCestaZmrazena('ZAK.dalsiZakaznici.7.hlavicka.ico')") === '');
  const pred = J(ctx.ZAK);
  st.hl.length = 0;
  run(ctx, "vzZakaznikCil('ock').set('objednatel', 'Jiná firma')");
  test('E3 zmrazení: zápis názvu přes cíl databáze odmítnut s hláškou', J(ctx.ZAK) === pred && st.hl.length === 1 && /už odešla nabídka/.test(st.hl[0]));
  run(ctx, "naseptavacZakVyber('Jiná firma', 'ock')");
  test('E3 zmrazení: našeptávač (ruční název) odmítnut', J(ctx.ZAK) === pred && st.hl.length === 2);
  ctx.KARTA = KARTA;
  run(ctx, "ZAK_DB.seznam = [KARTA]; zakaznikDoZakazkyUI(zakaznikKlic(KARTA), 'ock')");
  test('E3 zmrazení: přenos karty z databáze odmítnut', J(ctx.ZAK) === pred && st.hl.length === 3);
  run(ctx, "ARES.kde = 'ock'; ARES.subjekt = " + J(SUBJ) + "; aresPrepisPotvrd('ock')");
  test('E3 zmrazení: přepis z ARES odmítnut, tlačítko ARES zhasnuté', J(ctx.ZAK) === pred && st.hl.length === 4
    && /disabled>🔎 Najít firmu v ARES/.test(run(ctx, "aresRadek('ock')")));
  run(ctx, "vzZakaznikCil('ock').set('kontakt', 'Nová Osoba')");
  test('E3 zmrazení: kontaktní osoba se zapsat smí', ctx.ZAK.dalsiZakaznici[0].hlavicka.kontakt === 'Nová Osoba' && st.hl.length === 4);
}
{
  /* jeden zákazník: nic z E3 se neprojeví */
  const { ctx } = prostredi();
  ctx.ZAK.varianty[0].zamek = { zamceno: true, cislo: '2026 - OPR - CN - 1', tisky: [{ kdy: '2026-11-16T10:00:00Z' }] };
  test('jeden zákazník: vzPoleAttr / vzCestaZmrazena "" a vzCisloDokladu ""', run(ctx, "vzPoleAttr('ZAK.objednatel') === '' && vzPoleAttr('ZAK.ico') === '' && vzCestaZmrazena('ZAK.ico') === ''")
    && run(ctx, 'vzCisloDokladu(ZAK, ZAK.varianty[0])') === '');
}

/* ---------- VYP + data víc zákazníků ---------- */
{
  const { ctx, st, P } = dva();
  run(ctx, "vzVlastniVarianta('z2')");
  P.zap = false;
  st.hl.length = 0;
  const k = run(ctx, "vzKarta('ock')");
  test('VYP s daty: karta s „funkce je vypnutá", bez tlačítka Přidat', /id="vzVypnuto_ock"/.test(k) && /funkce je vypnutá/.test(k) && !/vz-pod/.test(k));
  test('VYP s daty: přepínač bez + a zhasnutý', (() => { const p = run(ctx, "vzPrepinacRadek('ock')"); return p !== '' && !/vz-chip-plus/.test(p) && (p.match(/<button[^>]*>/g) || []).every(b => /disabled/.test(b)); })());
  test('VYP s daty: tlačítko Přidat zákazníka chybí', run(ctx, "vzPridatTlacitko('ock')") === '');
  const pred = J(ctx.ZAK);
  run(ctx, "vzFormOtevri('ock')"); run(ctx, "vzOdstranit('z2')"); run(ctx, "vzVariantaSet('z2', 'v2')"); run(ctx, "vzVlastniVarianta('z2')");
  test('VYP s daty: formulář / odstranit / varianta / vlastní odmítnuty s hláškou', J(ctx.ZAK) === pred && st.hl.length === 4
    && st.hl.every(t => /vypnutá/.test(t)) && run(ctx, 'VZ_UI.form') === null && run(ctx, 'VZ_UI.odstranit') === null, st.hl);
  run(ctx, "VZ_UI.odstranit = { id: 'z2', smazat: true }; vzOdstranitPotvrd(true)");
  test('VYP s daty: ani rozpracované potvrzení neodstraní', J(ctx.ZAK) === pred);
  run(ctx, "VZ_UI.form = { kde: 'ock', h: { objednatel: 'X', adresaObjednatele: '', ico: '', dic: '', kontakt: '' }, zastupci: vzZastupciPrazdni(), nova: 'stejna', zdroj: '' }; vzFormPridej()");
  test('VYP s daty: ani rozpracovaný formulář nepřidá', J(ctx.ZAK) === pred);
}
{
  /* jen ke čtení: zápis odmítnut */
  const { ctx, P } = dva();
  P.cteni = true;
  const pred = J(ctx.ZAK);
  run(ctx, "vzOdstranit('z2'); vzVariantaSet('z2', 'v2'); vzFormOtevri('ock')");
  test('jen ke čtení: odstranit / varianta / formulář odmítnuty', J(ctx.ZAK) === pred && run(ctx, 'VZ_UI.odstranit') === null && run(ctx, 'VZ_UI.form') === null);
  test('jen ke čtení: Odstranit dalšího zhasnuté', /vzOdstranit\('z2'\)" disabled/.test(run(ctx, "vzKarta('ock')")));
}

/* ---------- sloupec Zákazník, změna varianty ---------- */
{
  const { ctx } = dva();
  run(ctx, "vzPridej(ZAK, { objednatel: 'Třetí' }, {})");
  const s1 = run(ctx, 'vzSeznamZakaznik(ZAK.varianty[0])');
  test('sloupec Zákazník u 2+: readonly s názvy zákazníků varianty', /readonly/.test(s1) && /value="Řídící s\.r\.o\., Druhý a\.s\., Třetí"/.test(s1), s1);
  test('sloupec u varianty bez zákazníka: —', /value="—"/.test(run(ctx, 'vzSeznamZakaznik(ZAK.varianty[1])')));
  run(ctx, "vzVariantaSet('z2', 'v2')");
  test('vzVariantaSet(další) změní jeho variantu', ctx.ZAK.dalsiZakaznici[0].varianta === 'v2' && /value="Druhý a\.s\."/.test(run(ctx, 'vzSeznamZakaznik(ZAK.varianty[1])')));
  const pred = J(ctx.ZAK);
  run(ctx, "vzVariantaSet('z1', 'v2')");
  test('vzVariantaSet(řídící) nic nezmění', J(ctx.ZAK) === pred);
  run(ctx, "vzVariantaSet('z2', 'v99')");
  test('vzVariantaSet(neexistující varianta) nic nezmění', J(ctx.ZAK) === pred);
  run(ctx, "vzOtevri('z2')");
  test('otevřený další: změna varianty otevře novou', (run(ctx, "vzVariantaSet('z2', 'v1')"), ctx.ZAK.aktivni === 'v1' && ctx.ZAK.dalsiZakaznici[0].varianta === 'v1'));
}

/* ---------- kolize jmen (jeden <script>) ---------- */
{
  const jmena = t => new Set([...t.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1] || m[2]));
  const ui = jmena(zdroj('ui/vice_zakazniku_ui.js'));
  const ostatni = [];
  const projdi = (adr) => fs.readdirSync(adr).forEach(f => {
    const pl = path.join(adr, f);
    if (fs.statSync(pl).isDirectory()) { if (f === 'ui') projdi(pl); return; }
    if (!/\.js$/.test(f) || /^test_/.test(f) || pl.endsWith(path.join('ui', 'vice_zakazniku_ui.js'))) return;
    jmena(fs.readFileSync(pl, 'utf8')).forEach(j => { if (ui.has(j)) ostatni.push(f + ': ' + j); });
  });
  projdi(__dirname);
  test('funkce ui/vice_zakazniku_ui.js nemají jméno žádné jiné funkce src/', ostatni.length === 0, ostatni);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
