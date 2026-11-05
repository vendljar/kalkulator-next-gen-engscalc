/* #572 — OCK: SKLO V TEXTU JEN TAM, KDE V ZAKÁZCE OPRAVDU JE (e-mail D. Sikory
 * 2. 11. 2026, zakázka OPR-CN-0422: „světlíky tam nejsou žádné, a proto by se
 * tam nemělo vyskytovat sklo 44.1 … stejně tak v rozsahu pro opláštění";
 * pokyn J. V. 5. 11. 2026, dávka PH).
 *
 * Příčina (reprodukováno nad 000924e): opláštění po stěnách, stěny B–D Cetris
 * nebo plech, čelní stěna A ponechaná na předvyplněném „Sklo VSG 4.4.1",
 * světlíky „bez" — sklo na stěně A má ve výpočtu plochu 0 m² (stěnu zabírají
 * dveře), ale MATERIÁL OPLÁŠTĚNÍ, ROZSAH OPLÁŠTĚNÍ i věta „Opláštění šachty: …"
 * v CN psaly „Sklo VSG 4.4.1 (stěna A)". Bez skla navíc POVRCHOVÁ ÚPRAVA psala
 * „čiré sklo" / „dvojsklo", ZPŮSOB KOTVENÍ „na zasklívací terče", a EN/FR
 * „bez světlíků" znělo „Without glass portals" / „sans impostes vitrées".
 *
 * Hlídá (CZ/EN/DE/FR, nabídka OCK = specifikace v CN i náhledu):
 *   1. bez skla v zakázce (plocha skla 0) se sklo/VSG/zasklení nezmíní
 *      v materiálu, rozsahu, větě o opláštění, povrchu ani kotvení;
 *   2. se sklem (stěna A sklo + světlík nad dveřmi ze skla, nebo standardní
 *      režim) se sklo píše dál;
 *   3. krycí list OCK sklo nezmiňuje;
 *   4. odeslaná nabídka z doby před #572 (zmrazený výsledek bez razítka
 *      oplasteni.skloJenSPlochou) se nemění — dotisk dá původní text.
 * Pojistka: nad 000924e sada padá (bod 1 — „Sklo VSG 4.4.1 (stěna A)").
 * Smyšlené údaje, zkušební ceník.
 *
 * Spuštění: cd src && node test_570_sklo_bez_plochy.js */
const fs = require('fs');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
nacti('./docxgen.js');
const E = nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
nacti('./plan_plateb.js');
nacti('./podminky.js');
nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
const ZM = nacti('./zamek.js');
const K = nacti('./kryci.js');
nacti('./kryci_proj.js');
const NB = nacti('./nabidka.js');
const J = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
global.NAST = { firma: global.firmaDefault() };

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 500)); } };

const SKLO = /skl|VSG|4\.4\.1|zasklen|glass|glaz|Glas|Verglas|verre|vitr/i;
const POLE = ['TS_MATERIAL_OPLASTENI', 'TS_ROZSAH_OPLASTENI', 'OPLASTENI_VETA', 'TS_POVRCH_OPLASTENI',
  'TS_KOTVENI_OPLASTENI', 'TS_PARAMETRY_KOTVY', 'TS_OPLASTENI_NADSVETLIKU', 'TS_PORTALY_CLENENI', 'TS_SVETLIKY_DVERI', 'TS_TYP_OPLASTENI'];

function zakazka(typ, mat, o) {
  o = o || {};
  const z = zk.novaZakazka();
  z.cislo = '2026 - OPR - CN - 5700'; z.nazevAkce = 'TEST #572';
  const v = z.varianty[0];
  v.data.cenik = Object.assign(JSON.parse(JSON.stringify(E.DEFAULT_CENIK)), ZC.zkusebniCenik());
  v.data.cenik.kurzEurKc = 25;
  const Z = v.data.ock.zadani;
  Object.assign(Z, { typSachty: typ, profily: JSON.parse(JSON.stringify(E.PROFILY_VYCHOZI[typ])), sirka: 1.6, hloubka: 1.6,
    zdvih: 9, prejezd: 3.5, prohluben: 1.2, nastupiste: 4, nadDvermi: o.nadDvermi || 'bez', bokyDveri: 'bez' });
  if (o.zaskleni) Z.zaskleni = o.zaskleni;
  if (mat) {
    const pas = mat === 'plech' ? { typ: 'jine', nazev: 'plech', naklad: 1000, doM: null } : { typ: mat, doM: null };
    const steny = { B: { odM: 0, pasy: [pas] }, C: { odM: 0, pasy: [pas] }, D: { odM: 0, pasy: [pas] } };
    /* stěna A předvyplněná sklem (tak ji obchodník po přepnutí na stěny dostane) */
    steny.A = { odM: 0, pasy: [{ typ: o.skloA || (typ === 'exteriérová' ? 'C.skloCelniKc' : 'C.skloVsg442Kc'), doM: null }] };
    Z.oplasteni = { rezim: 'poStenach', steny };
  }
  return { z, v };
}
const ph = (z, v, L) => NB.nabidkaData(z, v, J, L).placeholders;

/* ---------- 1) bez skla v zakázce ---------- */
[['exteriérová', 'C.cetrisKc'], ['interiérová', 'C.cetrisKc'], ['exteriérová', 'plech'], ['interiérová', 'plech']].forEach(([typ, mat]) => {
  [undefined, 'mezi příčníky'].forEach(zaskleni => {
    const { z, v } = zakazka(typ, mat, { zaskleni });
    const r = E.vypocet(v.data.ock.zadani, v.data.cenik, J, true);
    const plochaSkla = r.oplasteni.pasy.filter(p => /^C\.sklo/.test(p.typ)).reduce((a, p) => a + p.m2, 0);
    const popis = typ + ' / ' + mat + (zaskleni ? ' / ' + zaskleni : '');
    test('(příprava) plocha skla 0 m² — ' + popis, plochaSkla === 0 && r.oplasteni.skloJenSPlochou === true, plochaSkla);
    ['cz', 'en', 'de', 'fr'].forEach(L => {
      const p = ph(z, v, L);
      const sklo = POLE.filter(k => SKLO.test(String(p[k] || '')));
      test('1 ' + L + ': bez skla se sklo nezmíní — ' + popis, sklo.length === 0, sklo.map(k => k + '=' + p[k]));
    });
    const p = ph(z, v, 'cz');
    test('1 cz: materiál = jen stěny B–D — ' + popis, /\(stěny B, C, D\)$/.test(p.TS_MATERIAL_OPLASTENI) && !/stěna A/.test(p.TS_MATERIAL_OPLASTENI), p.TS_MATERIAL_OPLASTENI);
    test('1 cz: povrchová úprava se netiskne („ -") — ' + popis, p.TS_POVRCH_OPLASTENI === ' -' || p.TS_POVRCH_OPLASTENI === '', p.TS_POVRCH_OPLASTENI);
  });
});

/* ---------- 2) se sklem se sklo píše dál ---------- */
{
  const { z, v } = zakazka('exteriérová', 'C.cetrisKc', { nadDvermi: 'sklo' });
  const r = E.vypocet(v.data.ock.zadani, v.data.cenik, J, true);
  const p = ph(z, v, 'cz');
  test('2: světlík nad dveřmi ze skla → sklo ve specifikaci zůstává', SKLO.test(p.TS_POVRCH_OPLASTENI) && SKLO.test(p.TS_OPLASTENI_NADSVETLIKU)
    && /zasklívací/.test(p.TS_KOTVENI_OPLASTENI), [p.TS_POVRCH_OPLASTENI, p.TS_OPLASTENI_NADSVETLIKU, p.TS_KOTVENI_OPLASTENI, (r.oplasteni.svetliky || []).length]);
}
{
  const { z, v } = zakazka('exteriérová', 'C.cetrisKc');
  v.data.ock.zadani.oplasteni.steny.B = { odM: 0, pasy: [{ typ: 'C.skloBokyKc', doM: null }] };
  const p = ph(z, v, 'cz');
  test('2: stěna B ze skla (plocha > 0) → materiál ji uvádí, stěna A s nulou ne',
    /Izolační dvojsklo \(stěna B\)/.test(p.TS_MATERIAL_OPLASTENI) && !/VSG 4\.4\.1/.test(p.TS_MATERIAL_OPLASTENI) && SKLO.test(p.TS_POVRCH_OPLASTENI), p.TS_MATERIAL_OPLASTENI);
}
{
  const { z, v } = zakazka('exteriérová', null);
  const p = ph(z, v, 'cz');
  test('2: standardní (skleněné) opláštění beze změny', /sklo/.test(p.TS_MATERIAL_OPLASTENI) && /zasklívací/.test(p.TS_KOTVENI_OPLASTENI), [p.TS_MATERIAL_OPLASTENI, p.TS_KOTVENI_OPLASTENI]);
}
/* „bez světlíků" nezní jako sklo v žádném jazyce */
['en', 'de', 'fr'].forEach(L => test('1 ' + L + ': „bez světlíků" bez skla', !SKLO.test(tr('bez světlíků', L)), tr('bez světlíků', L)));

/* ---------- 3) krycí list OCK ---------- */
{
  const { z, v } = zakazka('exteriérová', 'C.cetrisKc');
  ['bo', 'techdata'].forEach(ver => {
    const k = K.kryciData(z, v, J, ver);
    const t = JSON.stringify(k.sekce || []);
    test('3: krycí list (' + ver + ') sklo nezmiňuje', !/VSG|4\.4\.1|zasklen|dvojskl/i.test(t), (t.match(/.{0,60}(VSG|zasklen|dvojskl).{0,60}/i) || [''])[0]);
  });
}

/* ---------- 4) odeslaná nabídka ---------- */
{
  const { z, v } = zakazka('exteriérová', 'C.cetrisKc');
  ZM.zamkniVariantu(v, { typ: 'nabidkaTisk', kdy: '2026-11-04T10:00:00.000Z', cislo: 'x', vysledek: ZM.zamekVysledekSpocti(v, J, 'test') });
  const nova = ph(z, v, 'cz');
  test('4: odeslaná po #572 drží nové znění', !SKLO.test(nova.TS_MATERIAL_OPLASTENI) && nova.TS_POVRCH_OPLASTENI === ' -', nova.TS_MATERIAL_OPLASTENI);
  delete v.zamek.vysledek.ock.oplasteni.skloJenSPlochou;   // odeslaná před #572
  const stara = ph(z, v, 'cz');
  test('4: odeslaná před #572 — dotisk s původním textem (Sklo VSG 4.4.1 (stěna A))',
    /Sklo VSG 4\.4\.1 \(stěna A\)/.test(stara.TS_MATERIAL_OPLASTENI) && /stěna A: Sklo VSG 4\.4\.1/.test(stara.TS_ROZSAH_OPLASTENI)
    && /zasklívací/.test(stara.TS_KOTVENI_OPLASTENI), [stara.TS_MATERIAL_OPLASTENI, stara.TS_KOTVENI_OPLASTENI]);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
