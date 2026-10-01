/* SMLOUVA O DÍLO PROJ: PLATBY Z PLÁNU PLATEB (etapa B, krok 5, 30. 9. 2026).
 *
 * Rozhodnutí J. V. 29. 9. 2026: splátky smlouvy o dílo PROJ se dopočítají
 * z plánu plateb (procento × cena činnosti po slevě, stejný milník sečtený,
 * ruční přepis zůstává) a šablona SoD PROJ dostane seznam plateb JEDNÍM
 * symbolem {{SODP_PLATEBNI_KALENDAR}} místo osmi pevných SODP_PLATBA1–8_KC.
 *
 * Hlídá se:
 *   – symbol nese řádek za každou platbu větou šablony („Platba ve výši …
 *     + DPH proběhne …"), součet plateb = PROJ_CELKEM_BEZ_DPH, ruční částka platí,
 *   – odstavec se symbolem se ve Wordu zopakuje za každý řádek (odrážka za
 *     platbu, jako v šabloně), jiné víceřádkové symboly dál lámou řádek,
 *   – stará šablona (8 pevných plateb): symboly SODP_PLATBAn_KC z plánu tam,
 *     kde má platba stejný milník; plán s platbou, kterou stará šablona
 *     nemá, smlouvu nevyrobí (chyba s vysvětlením) — smlouva by nesouhlasila,
 *   – odeslaná nabídka z doby před plánem: ruční splátky jako dřív a nová
 *     šablona z nich dostane seznam plateb; prázdný seznam zůstane {{…}},
 *   – varování ve Wordu srovnává se Standardem Z KÓDU (co tiskne šablona v3).
 * Před krokem 5 symbol ani rozvinutí odstavce neexistovaly — sada selže.
 *
 * Spuštění: cd src && node test_plan_plateb_sod.js */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
const dg = nacti('./docxgen.js');
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
nacti('./kryci_proj.js');
nacti('./kontroly.js');
const dok = nacti('./dokumenty.js');
const sod = nacti('./sod.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 700) : JSON.stringify(info))); } };

global.NAST = { firma: global.firmaDefault() };
const novaZ = () => { const z = zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 404'; z.varianty[0].data.proj.cenik = ZC.zkusebniCenikProj(); return z; };
const sablona = (...symboly) => ({ symboly: new Set(symboly) });

/* 1) symbol seznamu plateb */
{
  const z = novaZ(), v = z.varianty[0];
  const d = sod.sodProjData(z, v, 'cz', sablona('SODP_PLATEBNI_KALENDAR', 'PROJ_CELKEM_BEZ_DPH'));
  const k = d.placeholders.SODP_PLATEBNI_KALENDAR;
  const pl = NP.nabidkaProjPlatby(z, v, 'cz');
  test('SODP_PLATEBNI_KALENDAR existuje a má řádek za každou platbu', typeof k === 'string' && k.split('\n').length === pl.dopocet.platby.length, k);
  test('řádek větou šablony: „Platba ve výši … Kč + DPH proběhne po podpisu smlouvy / objednávky."',
    /^Platba ve výši [\d\s ]+,\d\d Kč \+ DPH proběhne po podpisu smlouvy \/ objednávky\.$/.test((k || '').split('\n')[0]), (k || '').split('\n')[0]);
  const soucet = (k || '').split('\n').map(r => +((/ve výši ([\d\s ]+,\d\d) Kč/.exec(r) || [])[1] || '0').replace(/[\s ]/g, '').replace(',', '.')).reduce((a, b) => a + b, 0);
  test('součet plateb v symbolu = cena díla smlouvy (PROJ_CELKEM_BEZ_DPH)', Math.round(soucet * 100) === Math.round(d.souhrn.bezDph * 100), [soucet, d.souhrn.bezDph]);
  /* Dorovnává platba „po dokončení DPZ pro stavební úřad" — tu má výchozí
   * plán (od 1. 10. 2026 Záloha 70 %) i Standard po činnostech. */
  v.data.kryciProj.planPlateb = { v: 1, prepis: { podpis: 100000, dpz_su: pl.dopocet.platby.find(x => x.klic === 'dpz_su').vypocet + (pl.dopocet.platby.find(x => x.klic === 'podpis').vypocet - 100000) } };
  const d2 = sod.sodProjData(z, v, 'cz', sablona('SODP_PLATEBNI_KALENDAR'));
  test('ruční částka platby jde do smlouvy (součet dorovnaný jinou platbou)', /^Platba ve výši 100[\s ]000,00 Kč/.test(d2.placeholders.SODP_PLATEBNI_KALENDAR), d2.placeholders.SODP_PLATEBNI_KALENDAR);
}

/* 2) Word: odstavec se symbolem za každý řádek */
{
  const odstavec = (t) => '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="4"/></w:numPr></w:pPr><w:r><w:t>' + t + '</w:t></w:r></w:p>';
  const xml = '<w:body>' + odstavec('VI. Platební podmínky') + odstavec('{{SODP_PLATEBNI_KALENDAR}}') + odstavec('Splatnost {{PODM_SPLATNOST_DNI_CISLO}} dnů')
    + odstavec('{{JINY_VICERADKOVY}}') + '</w:body>';
  test('generátor umí rozvinout odstavec za řádek (rozvinOdstavceZaRadek)', typeof dg.rozvinOdstavceZaRadek === 'function');
  if (typeof dg.rozvinOdstavceZaRadek === 'function') {
    const ph = { SODP_PLATEBNI_KALENDAR: 'Platba A.\nPlatba B.\nPlatba C.', PODM_SPLATNOST_DNI_CISLO: '14', JINY_VICERADKOVY: 'řádek 1\nřádek 2' };
    const vysl = dg.nahradPlaceholdery(dg.rozvinOdstavceZaRadek(xml, ph), ph);
    const odrazky = (vysl.match(/<w:numId w:val="4"\/>/g) || []).length;
    test('tři platby = tři odstavce s odrážkou (celkem 3 + 3 ostatní)', odrazky === 6 && /Platba A\./.test(vysl) && /Platba C\./.test(vysl), vysl);
    test('jiný víceřádkový symbol se dál láme uvnitř odstavce (w:br)', /řádek 1<\/w:t><w:br\/><w:t xml:space="preserve">řádek 2/.test(vysl), vysl);
    test('platné XML', !dg.xmlStrukturaVada(vysl), dg.xmlStrukturaVada(vysl));
  }
}

/* 3) stará šablona s osmi pevnými platbami */
{
  const z = novaZ(), v = z.varianty[0];
  const stara = sablona('SODP_PLATBA1_KC', 'SODP_PLATBA2_KC', 'SODP_PLATBA8_KC', 'PROJ_CELKEM_BEZ_DPH');
  /* plán, jehož platby stará šablona zná: záloha 50 % po podpisu + zbytek
   * DPZ po předání na stavební úřad, IČ po povolení, DPS a EZC po předání */
  z.varianty[0].data.proj.zadani.sekce.forEach(s => { if (['studie', 'kolaudace'].indexOf(s.key) >= 0) (s.polozky || []).forEach(p => { p.vyrazeno = true; }); });
  v.data.kryciProj.planPlateb = { v: 1, predvolba: 'zaloha', zaloha: 50 };
  let chyba = '';
  let d = null;
  try { d = sod.sodProjData(z, v, 'cz', stara); } catch (e) { chyba = e.message; }
  const ceny = NP.nabidkaProjPlatby(z, v, 'cz').ceny;
  if (Object.keys(ceny).every(k => ['dpz', 'ic', 'dps', 'ezc', 'zamereni'].indexOf(k) >= 0)) {
    test('stará šablona + plán z jejích milníků: smlouva vznikne a SODP_PLATBA1_KC nese platbu po podpisu',
      !chyba && d && /^[\d\s ]+,\d\d Kč$/.test(d.placeholders.SODP_PLATBA1_KC || ''), chyba || (d && d.placeholders.SODP_PLATBA1_KC));
    test('platba, kterou plán nemá (8 — výběr dodavatele), zůstane jako {{…}}', d && d.placeholders.SODP_PLATBA8_KC === undefined);
  } else test('zkušební zadání bez studie a kolaudace (předpoklad testu)', false, ceny);
  /* Výchozí plán (od 1. 10. 2026 Záloha 70 %): platbu „po předání studie
   * proveditelnosti" stará šablona nemá (Standard by narazil na IČ 30 %
   * „po získání stanovisek …") */
  const z2 = novaZ(), v2 = z2.varianty[0];
  let chyba2 = '';
  try { sod.sodProjData(z2, v2, 'cz', stara); } catch (e) { chyba2 = e.message; }
  test('stará šablona + plán s platbou, kterou nezná: smlouva nevznikne a řekne proč',
    /SODP_PLATEBNI_KALENDAR/.test(chyba2) && /po získání stanovisek|po předání studie/.test(chyba2), chyba2);
  let chyba3 = '';
  try { sod.sodProjData(z2, v2, 'cz', sablona('SODP_PLATEBNI_KALENDAR')); } catch (e) { chyba3 = e.message; }
  test('nová šablona se seznamem plateb: tentýž plán projde', chyba3 === '', chyba3);
  test('bez informace o šabloně (náhled) se nic neodmítá', (() => { try { sod.sodProjData(z2, v2, 'cz'); return true; } catch (e) { return false; } })());
}

/* 4) odeslaná nabídka z doby před plánem: ruční splátky jako dřív. Nová
 * šablona se seznamem plateb dostane tytéž splátky větou s milníky osmi
 * pevných plateb staré šablony (revize etapy B, 30. 9. 2026 — do opravy
 * zůstal {{SODP_PLATEBNI_KALENDAR}} nevyplněný a ruční částky z krycího
 * listu se musely ve Wordu psát znovu). Bez ručních splátek, a stejně tak
 * bez jediné oceněné činnosti, zůstane symbol ve Wordu vidět (dřív ho
 * prázdný seznam beze stopy smazal). */
{
  const z = novaZ(), v = z.varianty[0];
  /* Zkušební zakázka nabízí studii, DPZ, IČ, DPS, EZC a kolaudaci za
   * 271 200 Kč (bez zaměření). Ruční splátky dávají cenu díla (K18-N101). */
  v.data.kryciProj.hodnoty = { sodpPlatba1: '251 200 Kč', sodpPlatba3: '20 000 Kč' };
  zamkniVariantu(v, { typ: 'nabidkaProj', kdo: 'Test', cislo: '2026 - OVP - CN - 404' });
  const d = sod.sodProjData(z, v, 'cz', sablona('SODP_PLATBA1_KC', 'SODP_PLATBA3_KC'));
  test('odeslaná bez snímku: SODP_PLATBA1/3_KC z ručních polí',
    d.placeholders.SODP_PLATBA1_KC === '251 200 Kč' && d.placeholders.SODP_PLATBA3_KC === '20 000 Kč',
    [d.placeholders.SODP_PLATBA1_KC, d.placeholders.SODP_PLATBA3_KC]);
  const d2 = sod.sodProjData(z, v, 'cz', sablona('SODP_PLATEBNI_KALENDAR'));
  test('odeslaná bez snímku + nová šablona: seznam plateb z ručních splátek s milníky staré šablony',
    d2.placeholders.SODP_PLATEBNI_KALENDAR === 'Platba ve výši 251 200 Kč + DPH proběhne po podpisu smlouvy / objednávky.\n'
      + 'Platba ve výši 20 000 Kč + DPH proběhne po dokončení dokumentace pro povolení záměru v rozsahu pro podání na dotčené orgány.', d2.placeholders.SODP_PLATEBNI_KALENDAR);
  const z2 = novaZ(), v2 = z2.varianty[0];
  zamkniVariantu(v2, { typ: 'nabidkaProj', kdo: 'Test', cislo: '2026 - OVP - CN - 404' });
  test('odeslaná bez snímku a bez ručních splátek: seznam plateb zůstane {{…}} k doplnění',
    sod.sodProjData(z2, v2, 'cz', sablona('SODP_PLATEBNI_KALENDAR')).placeholders.SODP_PLATEBNI_KALENDAR === undefined);
  const z3 = novaZ(), v3 = z3.varianty[0];
  v3.data.proj.zadani.sekce.forEach(s => (s.polozky || []).forEach(p => { p.vyrazeno = true; }));
  const k3 = sod.sodProjData(z3, v3, 'cz', sablona('SODP_PLATEBNI_KALENDAR')).placeholders.SODP_PLATEBNI_KALENDAR;
  test('žádná oceněná činnost: seznam plateb se prázdným textem nesmaže (zůstane {{…}})', k3 === undefined, JSON.stringify(k3));
}

/* 5) pravidla kontrol (etapa B, krok 6): zábrany a varování ve Wordu */
{
  const KO = require('./kontroly.js');
  const pravidlo = (kod) => KO.kontrolyPravidla().find(p => p.kod === kod);
  test('pravidla plánu plateb jsou v katalogu kontrol (dvě zábrany a varování)',
    !!pravidlo('planPlateb100') && pravidlo('planPlateb100').zabranaMozna && !!pravidlo('planPlatebSoucet') && pravidlo('planPlatebSoucet').zabranaMozna
    && !!pravidlo('planPlatebWordProj') && !pravidlo('planPlatebWordProj').zabranaMozna);
  const z = novaZ(), v = z.varianty[0];
  const ctx = (sablona) => ({ zak: z, platbyProj: NP.nabidkaProjPlatby(z, v, 'cz'), sablonaNabidkaProj: sablona || null });
  const kody = (c) => KO.kontrolyProved(c).nalezy.map(n => n.kod);
  test('zdravý výchozí plán (Záloha 70 %) mlčí', !kody(ctx()).some(k => /^planPlateb/.test(k)), kody(ctx()));
  v.data.kryciProj.planPlateb = { v: 1, predvolba: 'std' };
  test('zdravý plán (Standard) mlčí', !kody(ctx()).some(k => /^planPlateb/.test(k)), kody(ctx()));
  v.data.kryciProj.planPlateb = { v: 1, cinnosti: { dpz: [{ p: 50, m: 'podpis' }, { p: 40, m: 'dpz_su' }] } };
  let r = KO.kontrolyProved(ctx());
  test('DPZ 90 %: zábrana planPlateb100 (dokument nevznikne)', r.brani && r.kodyBrani.indexOf('planPlateb100') >= 0
    && /nedávají 100 %/.test(r.textBrani) && /nevznikne/.test(r.textBrani), r.textBrani);
  v.data.kryciProj.planPlateb = { v: 1, cinnosti: { dpz: [{ p: 100, m: 'vlastni', t: '' }] } };
  test('vlastní milník bez textu: zábrana planPlateb100', KO.kontrolyProved(ctx()).kodyBrani.indexOf('planPlateb100') >= 0);
  v.data.kryciProj.planPlateb = { v: 1, prepis: { podpis: 1 } };
  r = KO.kontrolyProved(ctx());
  test('ruční částka rozbije součet: zábrana planPlatebSoucet, ne planPlateb100', r.kodyBrani.indexOf('planPlatebSoucet') >= 0
    && r.kodyBrani.indexOf('planPlateb100') < 0 && /nesouhlasí s cenou díla/.test(r.textBrani), r.kodyBrani);
  v.data.kryciProj.planPlateb = { v: 1, predvolba: 'zaloha', zaloha: 30 };
  test('šablona v3 (bez PROJ_PLATBY_*) + předvolba Záloha: varování planPlatebWordProj',
    kody(ctx({ symboly: ['PROJ_CELKEM_BEZ_DPH', 'PROJ_SLEVA_KC'], nazev: 'Sablona_NABIDKA_PROJ_v3.docx', verze: 3 })).indexOf('planPlatebWordProj') >= 0);
  test('šablona v4 s PROJ_PLATBY_*: varování mlčí',
    kody(ctx({ symboly: ['PROJ_CELKEM_BEZ_DPH', 'PROJ_PLATBY_DPZ'] })).indexOf('planPlatebWordProj') < 0);
  v.data.kryciProj.planPlateb = null;
  /* Výchozí plán z kódu je od 1. 10. 2026 Záloha 70 % (rozhodnutí J. V.) —
   * šablona v3 má natvrdo Standard, takže nová zakázka s v3 varuje. */
  test('šablona v3 + výchozí plán (Záloha 70 %): varování planPlatebWordProj (v3 tiskne Standard)',
    kody(ctx({ symboly: ['PROJ_CELKEM_BEZ_DPH'] })).indexOf('planPlatebWordProj') >= 0, kody(ctx({ symboly: ['PROJ_CELKEM_BEZ_DPH'] })));
  test('šablona v4 + výchozí plán: varování mlčí',
    kody(ctx({ symboly: ['PROJ_CELKEM_BEZ_DPH', 'PROJ_PLATBY_DPZ'] })).indexOf('planPlatebWordProj') < 0);
  v.data.kryciProj.planPlateb = { v: 1, predvolba: 'std' };
  test('šablona v3 + Standard bez úprav: varování mlčí (v3 tiskne Standard)',
    kody(ctx({ symboly: ['PROJ_CELKEM_BEZ_DPH'] })).indexOf('planPlatebWordProj') < 0);
  v.data.kryciProj.planPlateb = null;
  /* Šablona v3 tiskne Standard Z KÓDU; firemní Standard ani přepsaný text
   * milníku Word nevytiskne (revize etapy B — do opravy se srovnávalo
   * s firemním Standardem: varování mlčelo, a naopak varovalo u zakázky
   * vrácené přesně na to, co v3 tiskne). */
  const v3 = ['PROJ_CELKEM_BEZ_DPH'];
  const fs3 = JSON.parse(JSON.stringify(PP.PLAN_PROJ_VYCHOZI));
  fs3.vychozi = 'std';                  // firma s výchozím Standardem (výchozí z kódu je Záloha 70 %)
  fs3.standard.dpz = [{ p: 40, m: 'podpis' }, { p: 40, m: 'dpz_doss' }, { p: 20, m: 'dpz_su' }];
  global.NAST.firma.planPlatebProj = fs3;
  test('šablona v3 + firemní Standard jiný než výchozí: varování planPlatebWordProj',
    kody(ctx({ symboly: v3 })).indexOf('planPlatebWordProj') >= 0, kody(ctx({ symboly: v3 })));
  const ft = JSON.parse(JSON.stringify(PP.PLAN_PROJ_VYCHOZI));
  ft.vychozi = 'std';
  ft.milniky.find(m => m.id === 'podpis').cz = 'po podpisu smlouvy o dílo';
  global.NAST.firma.planPlatebProj = ft;
  test('šablona v3 + přepsaný text milníku v katalogu: varování', kody(ctx({ symboly: v3 })).indexOf('planPlatebWordProj') >= 0);
  global.NAST.firma.planPlatebProj = fs3;
  v.data.kryciProj.planPlateb = { v: 1, cinnosti: { dpz: [{ p: 50, m: 'podpis' }, { p: 30, m: 'dpz_doss' }, { p: 20, m: 'dpz_su' }] } };
  test('zakázka vrácená na výchozí Standard (= co tiskne v3): varování mlčí', kody(ctx({ symboly: v3 })).indexOf('planPlatebWordProj') < 0);
  delete global.NAST.firma.planPlatebProj;
  v.data.kryciProj.planPlateb = null;
  z.jenOck = true;
  v.data.kryciProj.planPlateb = { v: 1, cinnosti: { dpz: [{ p: 10, m: 'podpis' }] } };
  test('zakázka jen OCK: pravidla plánu mlčí', !kody(ctx()).some(k => /^planPlateb/.test(k)));
}

/* 6) registrace: builder dostane symboly šablony */
test('dokument sodProj si vyžádá symboly šablony (sablonaSymboly)', !!(dok.DOKUMENTY.sodProj && dok.DOKUMENTY.sodProj.sablonaSymboly === true));

/* 7) K18-N101 (ostrá v30.9.1, zakázka P18: DPZ + IČ + DPS bez zaměření,
 * šablona SoD PROJ v1 s osmi pevnými platbami; 1. 10. 2026).
 * Nenabízená činnost nesmí dostat větu a součet plateb se kontroluje proti
 * ceně díla i u staré šablony. Před opravou: věty plateb, které plán nemá,
 * zůstaly s {{SODP_PLATBAn_KC}} (odstavcePryc neexistovalo), builder
 * součet nekontroloval a ruční splátka k zaměření prošla. */
const VSECH_OSM = ['SODP_PLATBA1_KC', 'SODP_PLATBA2_KC', 'SODP_PLATBA3_KC', 'SODP_PLATBA4_KC',
  'SODP_PLATBA5_KC', 'SODP_PLATBA6_KC', 'SODP_PLATBA7_KC', 'SODP_PLATBA8_KC', 'PROJ_CELKEM_BEZ_DPH'];
const p18 = () => {
  const z = novaZ(), v = z.varianty[0];
  v.data.proj.zadani.sekce.forEach(s => { if (['dpz', 'ic', 'dps'].indexOf(s.key) < 0) (s.polozky || []).forEach(p => { p.vyrazeno = true; }); });
  return { z, v };
};
const hazi = (fn) => { try { fn(); return ''; } catch (e) { return e.message || String(e); } };
{
  /* a) plán, který stará šablona umí (záloha 50 % + zbytek po předání) */
  const { z, v } = p18();
  v.data.kryciProj.planPlateb = { v: 1, predvolba: 'zaloha', zaloha: 50 };
  let d = null;
  const ch = hazi(() => { d = sod.sodProjData(z, v, 'cz', sablona(...VSECH_OSM)); });
  test('N101: P18 + stará šablona + plán z jejích milníků: smlouva vznikne', !ch && !!d, ch);
  const pryc = (d && d.odstavcePryc) || [];
  test('N101: věta o zaměření (platba 2), DPZ pro dotčené orgány (3), EZC (7) a výběru (8) jde pryč',
    ['SODP_PLATBA2_KC', 'SODP_PLATBA3_KC', 'SODP_PLATBA7_KC', 'SODP_PLATBA8_KC'].every(k => pryc.indexOf(k) >= 0)
      && ['SODP_PLATBA1_KC', 'SODP_PLATBA4_KC', 'SODP_PLATBA5_KC', 'SODP_PLATBA6_KC'].every(k => pryc.indexOf(k) < 0), pryc);
  const plnene = ['SODP_PLATBA1_KC', 'SODP_PLATBA4_KC', 'SODP_PLATBA5_KC', 'SODP_PLATBA6_KC']
    .map(k => +String(d && d.placeholders[k] || '').replace(/[^\d,]/g, '').replace(',', '.'));
  test('N101: součet plateb staré šablony = cena díla', d && Math.round(plnene.reduce((a, b) => a + b, 0) * 100) === Math.round(d.souhrn.bezDph * 100), [plnene, d && d.souhrn.bezDph]);
  test('N101: bez šablony (náhled) se nic nemaže', !sod.sodProjData(z, v, 'cz').odstavcePryc);
  const nova = sod.sodProjData(z, v, 'cz', sablona('SODP_PLATEBNI_KALENDAR'));
  test('N101: nová šablona se seznamem plateb nic nemaže', !nova.odstavcePryc);
  test('N101: docxgen umí odstranit odstavec se symbolem', typeof dg.odstranOdstavceSeSymboly === 'function');
  if (typeof dg.odstranOdstavceSeSymboly === 'function') {
    const od = (t) => '<w:p><w:r><w:t>' + t + '</w:t></w:r></w:p>';
    const xml = '<w:body>' + od('Platba ve výši {{SODP_PLATBA1_KC}} + DPH proběhne po podpisu smlouvy.')
      + od('Platba ve výši {{SODP_PLATBA2_KC}} + DPH proběhne při předání 2D výstupů ze zaměření.')
      + '<w:tbl><w:tr><w:tc>' + od('{{SODP_PLATBA8_KC}}') + '</w:tc></w:tr></w:tbl>' + od('{{NEZNAMY}}') + '</w:body>';
    const vy = dg.odstranOdstavceSeSymboly(xml, ['SODP_PLATBA2_KC', 'SODP_PLATBA8_KC']);
    test('N101: věta o zaměření zmizí celá, ostatní zůstanou', !/zaměření/.test(vy) && /po podpisu/.test(vy) && /NEZNAMY/.test(vy), vy);
    test('N101: v buňce tabulky zůstane prázdný odstavec (platné XML)', /<w:tc><w:p\/><\/w:tc>/.test(vy) && !dg.xmlStrukturaVada(vy), vy);
  }
}
{
  /* b) ruční částka rozbije součet: smlouva nevznikne ani se starou, ani s novou šablonou */
  const { z, v } = p18();
  v.data.kryciProj.planPlateb = { v: 1, predvolba: 'zaloha', zaloha: 50, prepis: { podpis: 30000 } };
  const ch1 = hazi(() => sod.sodProjData(z, v, 'cz', sablona(...VSECH_OSM)));
  const ch2 = hazi(() => sod.sodProjData(z, v, 'cz', sablona('SODP_PLATEBNI_KALENDAR')));
  test('N101: součet ≠ cena díla, stará šablona: smlouva nevznikne a řekne proč', /nesouhlasí s cenou díla/.test(ch1), ch1);
  test('N101: součet ≠ cena díla, nová šablona: smlouva nevznikne a řekne proč', /nesouhlasí s cenou díla/.test(ch2), ch2);
  test('N101: náhled bez šablony se neodmítá', hazi(() => sod.sodProjData(z, v, 'cz')) === '');
}
{
  /* c) P18 přesně jak ji tester zadal: ruční splátky 30 000 / 20 000 / 15 000 Kč
   * (převedené na plán; 20 000 Kč ke zaměření, které nabídka nemá) */
  const { z, v } = p18();
  v.data.kryciProj.hodnoty = { sodpPlatba1: '30 000 Kč', sodpPlatba2: '20 000 Kč', sodpPlatba3: '15 000 Kč' };
  const ch = hazi(() => sod.sodProjData(z, v, 'cz', sablona('SODP_PLATEBNI_KALENDAR')));
  test('N101: P18 se splátkami 65 000 Kč proti ceně díla: smlouva nevznikne', /nesouhlasí s cenou díla/.test(ch), ch);
}
{
  /* d) odeslaná nabídka z doby před plánem (ruční splátky jako dřív) */
  const zamkni = (v) => zamkniVariantu(v, { typ: 'nabidkaProj', kdo: 'Test', cislo: '2026 - OVP - CN - 404' });
  const a = p18();
  a.v.data.kryciProj.hodnoty = { sodpPlatba1: '100 000 Kč', sodpPlatba2: '20 000 Kč' };
  zamkni(a.v);
  const ch = hazi(() => sod.sodProjData(a.z, a.v, 'cz', sablona(...VSECH_OSM)));
  test('N101: ruční splátka ke zaměření, které nabídka nemá: smlouva nevznikne a řekne proč', /splátka 2 .*patří k činnosti, kterou nabídka nemá/.test(ch), ch);
  const cena = Object.values(NP.nabidkaProjPlatby(a.z, a.v, 'cz').ceny).reduce((x, y) => x + y, 0);
  const b = p18();
  b.v.data.kryciProj.hodnoty = { sodpPlatba1: '100 000 Kč' };
  zamkni(b.v);
  const ch2 = hazi(() => sod.sodProjData(b.z, b.v, 'cz', sablona(...VSECH_OSM)));
  test('N101: ruční splátky odeslané nabídky ≠ cena díla: smlouva nevznikne', /součet ručních splátek .* nesouhlasí s cenou díla/.test(ch2), ch2);
  const c = p18();
  const kc = (n) => n.toLocaleString('cs-CZ') + ' Kč';
  c.v.data.kryciProj.hodnoty = { sodpPlatba1: kc(cena - 20000), sodpPlatba4: kc(20000) };
  zamkni(c.v);
  let d = null;
  const ch3 = hazi(() => { d = sod.sodProjData(c.z, c.v, 'cz', sablona(...VSECH_OSM)); });
  test('N101: ruční splátky = cena díla: smlouva vznikne', ch3 === '' && !!d, ch3);
  const pryc = (d && d.odstavcePryc) || [];
  test('N101: věta nenabízené činnosti zmizí, nevyplněná nabízená zůstane k doplnění',
    pryc.indexOf('SODP_PLATBA2_KC') >= 0 && pryc.indexOf('SODP_PLATBA7_KC') >= 0 && pryc.indexOf('SODP_PLATBA3_KC') < 0 && pryc.indexOf('SODP_PLATBA6_KC') < 0, pryc);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
