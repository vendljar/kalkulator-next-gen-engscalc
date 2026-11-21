/* ============================================================
 * #683 (D8-I1) — nabídka PROJ a krycí list PROJ rozhodují o „činnost je
 * v nabídce" JEDNÍM pravidlem (nabidkaProjNabizi: cena sekce před slevou
 * po obchodním zaokrouhlení je nenulová). Technické sjednocení: co nabídka
 * nabízí, to krycí list počítá (rozsah činností cin_/st_, dopočet termínů D8).
 *
 * Rozdíl, který test dokládá: sleva PROJ 100 % — nabídka vypisuje činnosti
 * za cenu před slevou (studie v nabídce, DPZ „od schválení studie"), krycí
 * list bral cenu po slevě (0 → „není součástí nabídky", termín DPZ od
 * výstupů ze zaměření). Vyřazená studie (cena 0) — obě strany „nenabízí"
 * (DPZ „od předání podkladů", termín studie prázdný). Výchozí zadání beze změny.
 * POJISTKA: před opravou selže „sleva 100 %: krycí list = nabídka" (rozsah
 * i termíny) a nabidkaProjNabizi neexistuje.
 * Spuštění: node src/test_683_nabizi_studii.js
 * ============================================================ */
'use strict';
const path = require('path');

const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'vice_zakazniku.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js',
  'dokumenty.js', 'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'lhuty_proj.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js'];
CORE.forEach(f => { const m = require(path.join(__dirname, f)); if (m && typeof m === 'object') Object.assign(global, m); });
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + (info === undefined ? '' : '  ' + JSON.stringify(info).slice(0, 500))); } };

function zakazka(uprava) {
  const zak = novaZakazka();
  zak.projHlavicka = Object.assign({}, zak.projHlavicka, { cislo: '2026 - OVP - CN - 9683' });
  const v = zak.varianty[0];
  v.data.proj.cenik = ZC.zkusebniCenikProj();
  v.data.kryciProj = { hodnoty: {} };
  const st = v.data.proj.zadani.sekce.find(s => s.key === 'studie');
  if (uprava) uprava(v, st);
  /* prodaná varianta (D8: termíny se dopočítávají po Prodáno) */
  v.zamek = { zamceno: true, tisky: [] };
  v.prodano = { datum: '2026-11-02', zakaznik: 'z1' };
  v.data.kryciProj.lhutyProj = lhutyProjVychozi();
  return { zak, v };
}
const pole = id => KRYCI_PROJ_SEKCE.flatMap(s => s.pole).find(p => p.id === id);
const kryciProjCinnost = (c, k) => pole('cin_' + k).prefill(c);
const kryciProjAno = (c, k) => pole('st_' + k).prefill(c);
function strany({ zak, v }) {
  const d = nabidkaProjData(zak, v, 'cz');
  const studieNabidka = d.placeholders.PROJ_DPZ_HVEZDICKA_ZNACKA === '*';
  const dpzOdStudie = /od schválení studie/.test(d.placeholders.PROJ_TERMINY);
  const c = kryciProjCtx(zak, v);
  const t = kryciProjTerminy(c) || {};
  return { studieNabidka, dpzOdStudie, klRozsah: kryciProjCinnost(c, 'studie'), klAno: kryciProjAno(c, 'studie'),
    terminStudie: (t.terminStudie || {}).datum || '', zdrojDpz: (t.terminDpz || {}).zdroj || '' };
}
const shoda = s => s.studieNabidka === /^ANO/.test(s.klRozsah) && s.studieNabidka === (s.klAno === 'ANO')
  && s.studieNabidka === !!s.terminStudie && s.dpzOdStudie === /studie/.test(s.zdrojDpz);

test('nabidkaProjNabizi je funkce (jedno pravidlo)', typeof nabidkaProjNabizi === 'function');

/* výchozí zadání: studie s cenou — obě strany nabízí */
{ const s = strany(zakazka());
  test('výchozí: nabídka nabízí studii, DPZ od schválení studie', s.studieNabidka && s.dpzOdStudie, s);
  test('výchozí: krycí list = nabídka (rozsah, ANO, termín studie, DPZ od studie)', shoda(s), s); }

/* vyřazená studie s cenou 0 — obě strany nenabízí */
{ const s = strany(zakazka((v, st) => st.polozky.forEach(p => { p.vyrazeno = true; })));
  test('vyřazená studie: nabídka nenabízí, DPZ ne od studie', !s.studieNabidka && !s.dpzOdStudie, s);
  test('vyřazená studie: krycí list = nabídka', shoda(s) && /není součástí/.test(s.klRozsah) && s.klAno === 'NE' && !s.terminStudie, s); }

/* sleva 100 %: nabídka vypisuje činnosti před slevou → krycí list totéž */
{ const s = strany(zakazka(v => { v.data.slevaProj = { procenta: 100, stav: 'schváleno' }; }));
  test('sleva 100 %: nabídka studii nabízí (cena před slevou)', s.studieNabidka && s.dpzOdStudie, s);
  test('sleva 100 %: krycí list = nabídka (rozsah ANO, termín studie, DPZ od studie)', shoda(s), s); }

/* bez modulu nabídky (server, sady) → dřívější pravidlo (cena po slevě) */
{ const o = zakazka(v => { v.data.slevaProj = { procenta: 100, stav: 'schváleno' }; });
  const puv = global.nabidkaProjNabizi; delete global.nabidkaProjNabizi;
  let a = '';
  try { a = kryciProjAno(kryciProjCtx(o.zak, o.v), 'studie'); } finally { global.nabidkaProjNabizi = puv; }
  test('bez nabidka_proj.js: krycí list jako dřív (cena po slevě)', a === 'NE', a); }

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
