/* ============================================================
 * Test O7 / K3-N2 — odeslaná nabídka se nemění ani po změně Firmy
 * (rozhodnutí J. V. 20. 10. 2026) + K3-N18 strop velikosti podmínek.
 *
 * K3-N2: věty platebního kalendáře (nabídka OCK), díly vět SoD realizace
 * a texty nabídky PROJ (vč. `dolozkyTisk`) se při PRVNÍM zamčení varianty
 * opíšou do varianty (kryciZmrazPodminky / kryciProjZmrazPodminky →
 * `zmrazenoPodminky`). Dotisk zamčené varianty je čte odtamtud; varianta
 * zamčená před opravou (bez snímku) tiskne aktuální Firmu jako dosud.
 *
 * K3-N18: souhrnný strop podmínek ve Firmě 500 kB — podminkyVady ho hlásí
 * (server přes firmaLzeZverejnit odmítne, formulář ukáže vadu).
 * Firma i zakázky jsou ukázkové. Spuštění: node src/test_o7_zmrazeni.js
 * ============================================================ */
const fs = require('fs');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
const PR = nacti('./preklad.js');
nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
const PD = nacti('./podminky.js');
const FM = nacti('./firma.js');
nacti('./plan_plateb.js');
const NP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
const kr = nacti('./kryci.js');
const kp = nacti('./kryci_proj.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
global.NAST = { firma: FM.firmaDefault() };
const tr = L => x => PR.tr(x, L);
const kopie = x => JSON.parse(JSON.stringify(x));

/* Firma po odeslání: jiné věty kalendáře, díly SoD a texty PROJ se zapnutými doložkami. */
const FIRMA_POTOM = { v: 1,
  vety: {
    zaloha: { cz: 'ZMĚNĚNO {PORADI} záloha {PROC}.', en: 'CHANGED {PORADI} advance {PROC}.' },
    konecna: { cz: 'ZMĚNĚNO konečná.' },
    sodZaloha: { cz: 'ZMĚNĚNO při podpisu', de: 'GEÄNDERT bei Unterschrift' },
    sodZCeny: { cz: 'ZMĚNĚNO z ceny' },
  },
  nabidkaProj: {
    cenaNezahrnuje: { cz: ['ZMĚNĚNO poplatky'], en: ['CHANGED fees'] },
    pozadovano: { cz: ['ZMĚNĚNO plná moc'] },
    terminy: { cz: [['ZMĚNĚNO zaměření', 'do 1 týdne', 'zamereni']] },
    dolozky: { cz: ['ZMĚNĚNO doložka {FIRMA}.'] }, dolozkyTisk: true,
  } };

/* ---------- 1) OCK: věty kalendáře nabídky a SoD ---------- */
const tiskOck = (zak, v) => {
  const kal = kr.kryciPlatebniKalendar(zak, v, JEKLY);
  const out = {};
  ['cz', 'en', 'de'].forEach(L => {
    out['cn_' + L] = kr.kryciPlatebniSymboly(kal, L === 'cz' ? (x => x) : tr(L), L).PODM_PLATEBNI_KALENDAR;
    out['sod_' + L] = kr.kryciSodPlatby(zak, v, JEKLY, null, L).symboly.SOD_PLATEBNI_KALENDAR;
  });
  return out;
};
{
  delete NAST.firma.podminky;                                   // nabídka odchází za továrny
  const zak = zk.novaZakazka(); zak.cislo = '2026 - OPR - CN - 437'; const v = zak.varianty[0];
  const pred = tiskOck(zak, v);
  kr.kryciZmrazPodminky(zak, v, JEKLY);
  v.zamek = { zamceno: true };
  test('OCK: snímek vět je ve variantě (data.kryci.zmrazenoPodminky.vety)',
    !!(v.data.kryci.zmrazenoPodminky && v.data.kryci.zmrazenoPodminky.vety && v.data.kryci.zmrazenoPodminky.vety.zaloha),
    v.data.kryci.zmrazenoPodminky);
  test('OCK: snímek nese jen věty (texty PROJ patří krycímu listu PROJ)',
    !!v.data.kryci.zmrazenoPodminky && !('nabidkaProj' in v.data.kryci.zmrazenoPodminky));
  NAST.firma.podminky = kopie(FIRMA_POTOM);                     // správce změní Firmu po odeslání
  const po = tiskOck(zak, v);
  Object.keys(pred).forEach(k => test('OCK zamčená: dotisk ' + k + ' po změně Firmy beze změny', po[k] === pred[k],
    [String(pred[k]).slice(0, 90), String(po[k]).slice(0, 90)]));
  /* kontrola, že změna Firmy vůbec působí (jinak by test výš prošel naprázdno) */
  const zak2 = zk.novaZakazka(); const v2 = zak2.varianty[0];
  const nova = tiskOck(zak2, v2);
  test('OCK rozpracovaná: nová věta zálohy z Firmy (CZ)', /^ZMĚNĚNO 1\. záloha 50 %\./.test(nova.cn_cz), nova.cn_cz.slice(0, 80));
  test('OCK rozpracovaná: nová věta zálohy z Firmy (EN)', /^CHANGED 1st advance 50 %\./.test(nova.cn_en), nova.cn_en.slice(0, 80));
  test('OCK rozpracovaná: nový díl SoD z Firmy (CZ, DE)', /^ZMĚNĚNO při podpisu 50 % ZMĚNĚNO z ceny/.test(nova.sod_cz)
    && /^GEÄNDERT bei Unterschrift/.test(nova.sod_de), [nova.sod_cz.slice(0, 80), nova.sod_de.slice(0, 80)]);
  /* varianta zamčená před opravou: bez snímku tiskne aktuální Firmu jako dosud */
  const zak3 = zk.novaZakazka(); const v3 = zak3.varianty[0];
  delete NAST.firma.podminky;
  kr.kryciZmrazPodminky(zak3, v3, JEKLY);
  delete v3.data.kryci.zmrazenoPodminky;
  v3.zamek = { zamceno: true };
  NAST.firma.podminky = kopie(FIRMA_POTOM);
  const stara = tiskOck(zak3, v3);
  test('OCK zamčená před v20.10.2 (bez snímku): tiskne aktuální Firmu jako dosud',
    /^ZMĚNĚNO 1\. záloha/.test(stara.cn_cz) && /^ZMĚNĚNO při podpisu/.test(stara.sod_cz), stara.cn_cz.slice(0, 60));
  /* klon odeslané varianty (nezamčený) snímek nečte */
  const v4 = kopie(v); v4.zamek = null;
  const klon = tiskOck(zak, v4);
  test('OCK nezamčená kopie se snímkem v datech: tiskne aktuální Firmu', /^ZMĚNĚNO 1\. záloha/.test(klon.cn_cz), klon.cn_cz.slice(0, 60));
  /* zmrazení znovu po změně Firmy zachytí nové znění (snímek není továrna natvrdo) */
  const zak5 = zk.novaZakazka(); const v5 = zak5.varianty[0];
  kr.kryciZmrazPodminky(zak5, v5, JEKLY); v5.zamek = { zamceno: true };
  delete NAST.firma.podminky;
  const z5 = tiskOck(zak5, v5);
  test('OCK zamčená za upravené Firmy: po návratu Firmy na továrnu tiskne upravené znění z doby odeslání',
    /^ZMĚNĚNO 1\. záloha/.test(z5.cn_cz) && /^ZMĚNĚNO při podpisu/.test(z5.sod_cz), z5.cn_cz.slice(0, 60));
  /* poškozený snímek: pole spadne na továrnu, žádná výjimka */
  const v6 = kopie(v5); v6.data.kryci.zmrazenoPodminky = { v: 1, vety: { zaloha: { cz: 42 }, konecna: 'x' } };
  let z6 = null; try { z6 = tiskOck(zak5, v6); } catch (e) { z6 = null; }
  test('OCK poškozený snímek: bez výjimky, vadná věta = výchozí znění',
    !!z6 && z6.cn_cz.indexOf(PD.PODMINKY_VYCHOZI.vety.zaloha.cz.replace('{PORADI}', '1.').replace('{PROC}', '50 %')) === 0,
    z6 && z6.cn_cz.slice(0, 80));
  delete NAST.firma.podminky;
}

/* ---------- 2) PROJ: texty nabídky včetně doložek ---------- */
const zakProj = () => { const z = zk.novaZakazka(); z.cislo = '2026 - OPR - OVP - 437';
  const v = z.varianty[0]; v.data.proj.cenik = ZC.zkusebniCenikProj(); v.data.proj.cenik.kurzEurKc = 25;
  v.data.proj.zadani.sekce.forEach(s => s.polozky.forEach(p => { p.vyrazeno = false; }));
  return z; };
const blok = (d, nadpis, L) => d.bloky.find(b => b.nadpis === PR.tr(nadpis, L || 'cz'));
const tiskProj = (z, v) => {
  const out = {};
  ['cz', 'en'].forEach(L => {
    const d = NP.nabidkaProjData(z, v, L);
    out['bloky_' + L] = JSON.stringify(['CENA NEZAHRNUJE', 'POŽADOVÁNO OD INVESTORA', 'TERMÍNY', 'DOLOŽKY']
      .map(n => (blok(d, n, L) || { radky: null }).radky));
    out['sym_' + L] = JSON.stringify(['PROJ_CENA_NEZAHRNUJE', 'PROJ_POZADOVANO_OD_INVESTORA', 'PROJ_TERMINY',
      'PROJ_TERMINY_CINNOST', 'PROJ_TERMINY_TERMIN', 'PROJ_DOLOZKY'].map(k => d.placeholders[k]));
  });
  return out;
};
{
  delete NAST.firma.podminky;
  NAST.firma.nazev = 'Zkušební firma s.r.o.';
  const z = zakProj(); const v = z.varianty[0];
  const pred = tiskProj(z, v);
  test('PROJ před změnou: doložky se netisknou (výchozí vypnuté)', JSON.parse(pred.bloky_cz)[3] === null, pred.bloky_cz.slice(-40));
  kp.kryciProjZmrazPodminky(z, v);
  v.zamek = { zamceno: true };
  test('PROJ: snímek textů je ve variantě (data.kryciProj.zmrazenoPodminky.nabidkaProj, dolozkyTisk=false)',
    !!(v.data.kryciProj.zmrazenoPodminky && v.data.kryciProj.zmrazenoPodminky.nabidkaProj
      && v.data.kryciProj.zmrazenoPodminky.nabidkaProj.dolozkyTisk === false), v.data.kryciProj.zmrazenoPodminky);
  NAST.firma.podminky = kopie(FIRMA_POTOM);
  const po = tiskProj(z, v);
  Object.keys(pred).forEach(k => test('PROJ zamčená: dotisk ' + k + ' po změně Firmy (vč. zapnutých doložek) beze změny',
    po[k] === pred[k], [pred[k].slice(0, 120), po[k].slice(0, 120)]));
  const z2 = zakProj();
  const nova = tiskProj(z2, z2.varianty[0]);
  test('PROJ rozpracovaná: nové texty i zapnuté doložky z Firmy',
    /ZMĚNĚNO poplatky/.test(nova.bloky_cz) && /ZMĚNĚNO doložka Zkušební firma/.test(nova.sym_cz) && /CHANGED fees/.test(nova.bloky_en),
    nova.bloky_cz.slice(0, 200));
  /* bez snímku (zamčená před opravou) = aktuální Firma */
  const z3 = zakProj(); const v3 = z3.varianty[0];
  kp.kryciProjZmrazPodminky(z3, v3); delete v3.data.kryciProj.zmrazenoPodminky; v3.zamek = { zamceno: true };
  const stara = tiskProj(z3, v3);
  test('PROJ zamčená před v20.10.2 (bez snímku): tiskne aktuální Firmu jako dosud',
    /ZMĚNĚNO poplatky/.test(stara.bloky_cz) && /ZMĚNĚNO doložka/.test(stara.sym_cz), stara.bloky_cz.slice(0, 120));
  /* zamčeno se zapnutými doložkami → vypnutí ve Firmě dotisk nezmění */
  const z4 = zakProj(); const v4 = z4.varianty[0];
  kp.kryciProjZmrazPodminky(z4, v4); v4.zamek = { zamceno: true };
  const s4 = tiskProj(z4, v4);
  delete NAST.firma.podminky;
  const s4po = tiskProj(z4, v4);
  test('PROJ zamčená se zapnutými doložkami: vypnutí doložek ve Firmě je z dotisku nevezme',
    s4po.sym_cz === s4.sym_cz && /ZMĚNĚNO doložka/.test(s4po.sym_cz), s4po.sym_cz.slice(-80));
  delete NAST.firma.podminky;
}

/* ---------- 3) snímek a čistá logika (podminky.js) ---------- */
{
  const s = PD.podminkySnimek({ podminky: kopie(FIRMA_POTOM) });
  test('podminkySnimek bez výběru nese věty i texty PROJ', !!s.vety && !!s.nabidkaProj && s.v === 1);
  test('podminkySnimek nese efektivní znění (Firma + továrna)', s.vety.zaloha.cz === FIRMA_POTOM.vety.zaloha.cz
    && s.vety.faktura2.cz === PD.PODMINKY_VYCHOZI.vety.faktura2.cz);
  const ef = PD.podminkyEfZmrazene({ podminky: { ock: { splatnostDni: 30 } } }, s);
  test('podminkyEfZmrazene: věty ze snímku, ostatní pole z aktuální Firmy',
    ef.vety.zaloha.cz === FIRMA_POTOM.vety.zaloha.cz && ef.ock.splatnostDni === 30);
  test('podminkyEfZmrazene bez snímku = podminkyEf', JSON.stringify(PD.podminkyEfZmrazene({}, null)) === JSON.stringify(PD.podminkyEf({})));
}

/* ---------- 4) K3-N18: souhrnný strop 500 kB ---------- */
{
  test('strop podmínek je 500 kB', PD.PODMINKY_MAX_B === 500 * 1024);
  /* 30 řádků × 1000 znaků × 4 jazyky × 4 bloky — každé pole samo je v mezích */
  const radek = i => ('Řádek ' + i + ' ').padEnd(1000, 'ž');
  const blokTextu = () => ({ cz: Array.from({ length: 30 }, (_, i) => radek(i)), en: Array.from({ length: 30 }, (_, i) => radek(i)),
    de: Array.from({ length: 30 }, (_, i) => radek(i)), fr: Array.from({ length: 30 }, (_, i) => radek(i)) });
  const velke = { nabidkaProj: { cenaNezahrnuje: blokTextu(), pozadovano: blokTextu(), dolozky: blokTextu() } };
  const vady = PD.podminkyVady(velke);
  test('velké podmínky (každé pole v mezích, celkem > 500 kB) mají vadu velikosti',
    PD.podminkyVelikostB(velke) > PD.PODMINKY_MAX_B && vady.length === 1 && /příliš velké: \d+ kB, nejvýš 500 kB/.test(vady[0]), vady);
  test('firmaLzeZverejnit velké podmínky odmítne s hláškou o velikosti',
    (() => { const f = FM.firmaDefault(); f.ukazkove = false; f.nazev = 'Zkušební firma s.r.o.'; f.podminky = velke;
      const r = FM.firmaLzeZverejnit(f); return !r.ok && /příliš velké/.test(r.duvod); })());
  const male = { nabidkaProj: { cenaNezahrnuje: blokTextu() } };
  test('podmínky pod stropem vadu velikosti nemají', PD.podminkyVelikostB(male) < PD.PODMINKY_MAX_B
    && !PD.podminkyVady(male).some(x => /příliš velké/.test(x)));
  /* hranice: měří se UTF-8 bajty (ž = 2 B), ne znaky */
  const hr = { vety: { zaloha: { cz: 'x' } } };
  const zaklad = PD.podminkyVelikostB(hr);
  const tesne = n => ({ vety: { zaloha: { cz: 'x' } }, vypln: 'a'.repeat(n) });
  test('hranice: přesně 500 kB projde, o bajt víc ne',
    PD.podminkyVelikostB(tesne(PD.PODMINKY_MAX_B - zaklad - 11)) === PD.PODMINKY_MAX_B
      && !PD.podminkyVady(tesne(PD.PODMINKY_MAX_B - zaklad - 11)).some(x => /příliš velké/.test(x))
      && PD.podminkyVady(tesne(PD.PODMINKY_MAX_B - zaklad - 10)).some(x => /příliš velké/.test(x)),
    [zaklad, PD.podminkyVelikostB(tesne(PD.PODMINKY_MAX_B - zaklad - 11))]);
  test('velikost v UTF-8 bajtech (ž = 2 B)', PD.podminkyVelikostB({ a: 'ž' }) === JSON.stringify({ a: 'ž' }).length + 1);
}

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
if (fail) process.exit(1);
