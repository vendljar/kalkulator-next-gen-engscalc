/* PD2 #782 — PLATBA 1–8 DO PIPEDRIVE Z NOVÉHO PLÁNU PLATEB PROJ
 * (J. V. 25. 11. 2026; revize návrhu Fable U7).
 *
 * Hlídá se:
 *   – milníky plánu → pole Platba 1–8 podle typu (podpis, výstupy ze zaměření,
 *     DPZ dotčené orgány, DPZ stavební úřad, povolení záměru, DPS, EZC, výběr
 *     dodavatele); stejný milník sečtený; co poli neodpovídá → „mimo“ (jen
 *     v textu Platebního kalendáře);
 *   – částky = TÝŽ dopočet jako text kalendáře (planPdKalendar), součet Plateb
 *     + mimo = cena díla (U7b);
 *   – zamčená varianta bere SNÍMEK plánu, ne dnešní plán firmy (U7a);
 *   – nesedící součet (dopocet.sedi = false) a plán z doby před plánem = nic (U7c);
 *   – převod pdZapisDealu pošle Platby jako částky v Kč do správných polí.
 * Před PD2 pdnPlatby neexistuje — sada selže.
 * Spuštění: cd src && node test_pd2_platby.js */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
const PP = nacti('./plan_plateb.js');
const NP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
nacti('./zamek.js');
nacti('./kryci.js');
const KP = nacti('./kryci_proj.js');
nacti('./kontroly.js');
nacti('./dokumenty.js');
nacti('./sod.js');
const PDN = nacti('./pd_nanecisto.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 700) : JSON.stringify(info).slice(0, 700))); } };
const hal = (x) => Math.round(x * 100);

global.NAST = { firma: global.firmaDefault() };
const novaZ = () => { const z = zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 782'; z.varianty[0].data.proj.cenik = ZC.zkusebniCenikProj(); return z; };
/* Částky z textu kalendáře („Platba ve výši 12 345,00 Kč + DPH …“). */
const castkyKalendare = (t) => String(t || '').split('\n').filter(Boolean)
  .map((r) => Number((/ve výši ([\d\s  ]+,\d\d)/.exec(r) || [])[1].replace(/[\s  ]/g, '').replace(',', '.')));

const PLANY = [
  ['výchozí (záloha 70 %)', null],
  ['Standard po činnostech', { v: 1, predvolba: 'std' }],
  ['záloha 30 %', { v: 1, predvolba: 'zaloha', zaloha: 30 }],
  ['100 % po dokončení', { v: 1, predvolba: 'sto' }],
];
for (const [nazev, plan] of PLANY) {
  const z = novaZ(), v = z.varianty[0];
  v.data.kryciProj.planPlateb = plan;
  const pl = NP.nabidkaProjPlatby(z, v, 'cz');
  const p = PDN.pdnPlatby(pl);
  const kal = PP.planPdKalendar(pl);
  test(nazev + ': plán sedí, Platby se spočítají', !!p && pl.dopocet.sedi === true, p);
  if (!p) continue;
  const soucet = Object.values(p.platby).reduce((a, b) => a + b, 0) + p.mimo.reduce((a, b) => a + b.castka, 0);
  test(nazev + ': součet Plateb 1–8 + „mimo“ = cena díla (na haléř)', hal(soucet) === hal(pl.dopocet.cena), [soucet, pl.dopocet.cena]);
  const zKalendare = castkyKalendare(kal).map(hal).sort((a, b) => a - b);
  const zPlateb = Object.values(p.platby).concat(p.mimo.map((x) => x.castka)).map(hal).sort((a, b) => a - b);
  test(nazev + ': částky Plateb + mimo = částky v textu Platebního kalendáře', JSON.stringify(zKalendare) === JSON.stringify(zPlateb), [zKalendare, zPlateb]);
  const podle = Object.fromEntries(pl.dopocet.platby.map((x) => [x.klic, x.castka]));
  test(nazev + ': Platba 1 = platba „po podpisu“, Platba 2 = výstupy ze zaměření (podle milníku)',
    (podle.podpis === undefined ? p.platby[1] === undefined : p.platby[1] === podle.podpis)
    && (podle.za_vystupy === undefined ? p.platby[2] === undefined : p.platby[2] === podle.za_vystupy), [podle, p.platby]);
  test(nazev + ': milníky bez pole Platba (studie, památkáři, podání, kolaudace, geodet) jsou „mimo“',
    p.mimo.length === pl.dopocet.platby.filter((x) => PP.PLAN_SODP_STARE.indexOf(x.klic) < 0).length, p.mimo);
}
{
  /* Vlastní milník → mimo; dva řádky téhož milníku → jedna Platba (součet). */
  const z = novaZ(), v = z.varianty[0];
  v.data.kryciProj.planPlateb = { v: 1, predvolba: 'vlastni', cinnosti: {
    studie: [{ p: 50, m: 'podpis' }, { p: 50, m: 'vlastni', t: 'po dohodě s investorem' }],
    dpz: [{ p: 40, m: 'podpis' }, { p: 60, m: 'dpz_su' }] } };
  const pl = NP.nabidkaProjPlatby(z, v, 'cz');
  const p = PDN.pdnPlatby(pl);
  const c = pl.ceny;
  test('vlastní plán: Platba 1 = součet „po podpisu“ ze dvou činností', !!p && p.platby[1] === pl.dopocet.platby.find((x) => x.klic === 'podpis').castka
    && (c.studie > 0 && c.dpz > 0) && pl.dopocet.platby.find((x) => x.klic === 'podpis').casti.length >= 2, [p && p.platby, c]);
  test('vlastní plán: vlastní milník jde do „mimo“ s textem', !!p && p.mimo.some((x) => /po dohodě s investorem/.test(x.text)), p && p.mimo);
}
{
  /* U7c: nesedící součet (ruční přepis) = nic; plán z doby před plánem = nic. */
  const z = novaZ(), v = z.varianty[0];
  v.data.kryciProj.planPlateb = { v: 1, prepis: { podpis: 1 } };
  const pl = NP.nabidkaProjPlatby(z, v, 'cz');
  test('U7c: dopocet.sedi = false → Platby se nepošlou', pl.dopocet.sedi === false && PDN.pdnPlatby(pl) === null);
  test('plán z doby před plánem (stary) → nic', PDN.pdnPlatby({ stary: true, dopocet: { sedi: true, platby: [] } }) === null);
  test('EUR (pole Platba jsou v Kč) → nic', PDN.pdnPlatby(Object.assign({}, pl, { eur: true, dopocet: { sedi: true, platby: [] } })) === null);
}
{
  /* U7a: zamčená varianta = snímek plánu; změna firemního plánu po odeslání Platby nezmění. */
  const z = novaZ(), v = z.varianty[0];
  v.data.kryciProj.planPlateb = { v: 1, predvolba: 'std' };
  KP.kryciProjZmrazPlan(z, v);
  v.zamek = { zamceno: true, typ: 'nabidkaProj', kdy: '2026-11-25T10:00:00Z', vysledek: null };
  const pred = PDN.pdnPlatby(NP.nabidkaProjPlatby(z, v, 'cz'));
  v.data.kryciProj.planPlateb = { v: 1, predvolba: 'zaloha', zaloha: 50 };   // plán se po odeslání „změní“
  global.NAST.firma.planPlatebProj = { vychozi: 'sto' };
  const po = PDN.pdnPlatby(NP.nabidkaProjPlatby(z, v, 'cz'));
  delete global.NAST.firma.planPlatebProj;
  test('U7a: zamčená varianta — Platby ze snímku plánu, změna plánu / firmy je nezmění', !!pred && JSON.stringify(pred) === JSON.stringify(po), [pred, po]);
}
{
  /* pdnStranaProj nese platby; převod do Pipedrive (pdZapisDealu) je pošle jako částky v Kč. */
  const z = novaZ(), v = z.varianty[0];
  v.data.kryciProj.planPlateb = { v: 1, predvolba: 'std' };
  const s = PDN.pdnStranaProj(z, v);
  test('pdnStranaProj: platby + platbyMimo vedle kalendáře', !!s.kalendar && s.platby && Object.keys(s.platby).length > 0 && Array.isArray(s.platbyMimo), s.platby);
  import('../netlify/lib/pd_prevod.mjs').then(async (PRE) => {
    const { POLE_DEALU, pdHashZNazvu } = await import('../netlify/lib/pd_mapa.mjs');
    const defs = POLE_DEALU.filter((d) => /^platba[1-8]$/.test(d.klic));
    const mapa = Object.fromEntries(defs.map((d) => [d.klic, pdHashZNazvu(d.nazev)]));
    const popisy = Object.fromEntries(defs.map((d) => [d.klic, { typ: 'monetary', volby: null, zapisovatelne: true }]));
    const zap = PRE.pdZapisDealu(defs, { proj: s }, { mapa, popisy });
    const ok8 = Object.entries(s.platby).every(([i, c]) => {
      const h = zap.custom_fields[mapa['platba' + i]];
      return h && h.value === Math.round(c * 100) / 100 && h.currency === 'CZK';
    });
    test('pdZapisDealu: každá Platba do svého pole jako { value, currency: CZK }, nic navíc', ok8
      && Object.keys(zap.custom_fields).length === Object.keys(s.platby).length, zap.custom_fields);
    const n = PRE.pdNanecisto(defs, { proj: s }, { mapa, popisy });
    test('náhled: řádek „Mimo pole Platba 1–8“ vyjmenuje platby jen v textu kalendáře',
      s.platbyMimo.length === 0 || (n.radky.find((r) => r.klic === 'platbyMimo') || {}).stav === 'ponechano', n.radky.map((r) => r.klic + ':' + r.stav));
    /* U7e (J. V. 25. 11. 2026): v dealu Platba je, milník v plánu chybí → VYMAŽE se (null), řádek „vymaže se“. */
    const chybi = defs.find((d) => !s.platby[d.klic.slice(-1)]);
    if (chybi) {
      const n2 = PRE.pdNanecisto(defs, { proj: s }, { mapa, popisy }, { deal: { custom_fields: { [mapa[chybi.klic]]: { value: 1000, currency: 'CZK' } } } });
      const r = n2.radky.find((x) => x.klic === chybi.klic) || {};
      const deal = { custom_fields: { [mapa[chybi.klic]]: { value: 1000, currency: 'CZK' } } };
      const zap = PRE.pdZapisDealu(defs, { proj: s }, { mapa, popisy }, { deal });
      test('U7e: Platba v Pipedrive bez milníku v plánu → vymaže se (PATCH null, řádek „(vymaže se)“)', r.stav === 'zapise'
        && r.hodnota === null && r.hodnotaText === '(vymaže se)' && PRE.PD_PLATBY_MAZAT === true
        && mapa[chybi.klic] in zap.custom_fields && zap.custom_fields[mapa[chybi.klic]] === null && /vymaže/.test(r.kolize.join(' ')), [r, zap.custom_fields]);
      const zap2 = PRE.pdZapisDealu(defs, { proj: Object.assign({}, s, { platby: undefined }) }, { mapa, popisy }, { deal });
      test('U7e: bez Plateb z nového plánu (starý plán / nesedící součet) se nic nemaže', !(mapa[chybi.klic] in zap2.custom_fields), zap2.custom_fields);
      /* Revize Fable N1: platba 0 Kč (milník v plánu s nulou) = chybějící milník → vymaže se. */
      const s0 = Object.assign({}, s, { platby: Object.assign({}, s.platby, { [chybi.klic.slice(-1)]: 0 }) });
      const zap0 = PRE.pdZapisDealu(defs, { proj: s0 }, { mapa, popisy }, { deal });
      test('N1: Platba 0 Kč = chybějící milník → v dealu se vymaže (null), žádný řádek „nelze“', zap0.custom_fields[mapa[chybi.klic]] === null
        && !zap0.duvody.some((x) => x.klic === chybi.klic), [zap0.custom_fields, zap0.duvody]);
      test('N1: pdnPlatby nulovou platbu do polí nedává', !Object.values(PDN.pdnPlatby({ stary: false, eur: false,
        dopocet: { sedi: true, platby: [{ klic: 'podpis', castka: 0, text: 'po podpisu' }, { klic: 'dps_predani', castka: 100, text: 'DPS' }] } }).platby).includes(0));
      const zap3 = PRE.pdZapisDealu(defs, { proj: s }, { mapa, popisy }, { deal: { custom_fields: {} } });
      test('U7e: prázdné pole Platba v dealu se nemaže (nic k vymazání)', !(mapa[chybi.klic] in zap3.custom_fields), zap3.custom_fields);
    }
    console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
    if (fail) process.exit(1);
  });
}
