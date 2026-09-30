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
 *   – odeslaná nabídka z doby před plánem: ruční splátky jako dřív.
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
  v.data.kryciProj.planPlateb = { v: 1, prepis: { podpis: 100000, dpz_doss: pl.dopocet.platby.find(x => x.klic === 'dpz_doss').vypocet + (pl.dopocet.platby.find(x => x.klic === 'podpis').vypocet - 100000) } };
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
  /* Standard: IČ 30 % „po podání na stavební úřad" stará šablona nemá */
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

/* 4) odeslaná nabídka z doby před plánem: ruční splátky jako dřív */
{
  const z = novaZ(), v = z.varianty[0];
  v.data.kryciProj.hodnoty = { sodpPlatba1: '110 000 Kč', sodpPlatba2: '20 000 Kč' };
  zamkniVariantu(v, { typ: 'nabidkaProj', kdo: 'Test', cislo: '2026 - OVP - CN - 404' });
  const d = sod.sodProjData(z, v, 'cz', sablona('SODP_PLATBA1_KC', 'SODP_PLATBA2_KC'));
  test('odeslaná bez snímku: SODP_PLATBA1/2_KC z ručních polí, seznam plateb se nevyrábí',
    d.placeholders.SODP_PLATBA1_KC === '110 000 Kč' && d.placeholders.SODP_PLATBA2_KC === '20 000 Kč' && d.placeholders.SODP_PLATEBNI_KALENDAR === undefined,
    [d.placeholders.SODP_PLATBA1_KC, d.placeholders.SODP_PLATEBNI_KALENDAR]);
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
  test('šablona v3 + Standard bez úprav: varování mlčí (v3 tiskne Standard)',
    kody(ctx({ symboly: ['PROJ_CELKEM_BEZ_DPH'] })).indexOf('planPlatebWordProj') < 0);
  z.jenOck = true;
  v.data.kryciProj.planPlateb = { v: 1, cinnosti: { dpz: [{ p: 10, m: 'podpis' }] } };
  test('zakázka jen OCK: pravidla plánu mlčí', !kody(ctx()).some(k => /^planPlateb/.test(k)));
}

/* 6) registrace: builder dostane symboly šablony */
test('dokument sodProj si vyžádá symboly šablony (sablonaSymboly)', !!(dok.DOKUMENTY.sodProj && dok.DOKUMENTY.sodProj.sablonaSymboly === true));

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
