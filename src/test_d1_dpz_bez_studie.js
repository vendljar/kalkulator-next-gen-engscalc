/* ÚVOD DPZ BEZ STUDIE PROVEDITELNOSTI (D1, postřeh D. Sikory 19. 10. 2026).
 *
 * „Pokud nenabízíme Studii proveditelnosti a přímo začínáme s DPZ, je potřeba
 * v textu CN vymazat" větu z úvodu oddílu DOKUMENTACE PRO POVOLENÍ ZÁMĚRU:
 * „Dokumentace pro povolení záměru (DPZ) navazuje na vzájemně odsouhlasenou
 * STUDII PROVEDITELNOSTI. Ta rozpracovává dokumentaci…". Bez studie v nabídce
 * zní věta „Dokumentace pro povolení záměru (DPZ) rozpracovává dokumentaci…".
 *
 * Hlídá se:
 *   1) online nabídka (CZ; v EN/DE/FR zůstává souvislá próza úvodů česky,
 *      viz test_proj_zbytky_preklad.js) — se studií s navázáním, bez ní bez;
 *   2) symbol {{PROJ_DPZ_UVOD}} pro Word ve všech jazycích (přeložený, bez
 *      češtiny, bez zmínky o studii, když se nenabízí);
 *   3) nastroje/vyrob_sablony.js --proj-v7 (syntetické XML: odstavec úvodu
 *      DPZ v několika bězích → jediný symbol, chyba u vstupu, který není v6,
 *      a u dvou kandidátů);
 *   4) kontrola dpzUvodWordProj (starší šablona bez symbolu a DPZ bez studie
 *      → varování; v7, nabízená studie, neznámé symboly → mlčí).
 *   5) Q1–Q3 (rozhodnutí J. V. 20. 10. 2026): hvězdička ceny DPZ jen se studií,
 *      termín hrubopisu DPZ bez studie (znění PODMINKY_TERMIN_DPZ_BEZ_STUDIE vybírá
 *      J. V.), ve Wordu v7 titul a bloky studie (blokyPryc).
 * Před opravou sada selže na prvním testu (NABIDKA_PROJ_DPZ_UVOD neexistuje,
 * úvod DPZ nese „navazuje" i bez studie).
 *
 * Spuštění: cd src && node test_d1_dpz_bez_studie.js */
const path = require('path');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
const PR = nacti('./preklad.js');
const dg = nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
nacti('./plan_plateb.js');
const NP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
const K = require('./kontroly.js');
global.NAST = { firma: global.firmaDefault() };

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 600)); } };

const U = NP.NABIDKA_PROJ_DPZ_UVOD;
test('nabidka_proj.js exportuje NABIDKA_PROJ_DPZ_UVOD (studie / bez / zaver)',
  !!(U && /navazuje na vzájemně odsouhlasenou STUDII/.test(U.studie) && U.bez && !/STUDII|studi/i.test(U.bez) && U.zaver));
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const CESKA = /[ěščřžůťďňĚŠČŘŽŮŤĎŇ]/;
const STUDIE = { cz: /STUDII PROVEDITELNOSTI/, en: /FEASIBILITY STUDY/, de: /MACHBARKEITSSTUDIE/, fr: /ÉTUDE DE FAISABILITÉ/ };
/* `studie` = studie (a projednání) v rozsahu; bez ní se jejich položky vyřadí */
const zak = (studie) => {
  const z = zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 901'; z.nazevAkce = 'Zkušební akce D1';
  const v = z.varianty[0]; v.data.proj.cenik = ZC.zkusebniCenikProj(); v.data.proj.cenik.kurzEurKc = 25;
  if (!studie) v.data.proj.zadani.sekce.forEach(s => {
    if (s.key === 'studie' || s.key === 'projednani') s.polozky.forEach(p => { p.vyrazeno = true; });
  });
  return z;
};
const uvodDpz = d => { const b = d.bloky.find(x => x.typ === 'rozsah' && /\(DPZ\)/.test(x.nadpis)); return b ? b.uvod : null; };

/* ---- 1) online nabídka CZ ---- */
{
  const se = NP.nabidkaProjData(zak(true), zak(true).varianty[0], 'cz');
  const z0 = zak(false);
  const bez = NP.nabidkaProjData(z0, z0.varianty[0], 'cz');
  test('předpoklad: bez studie se studie nenabízí, DPZ ano',
    !bez.nabizeneSekce || (bez.nabizeneSekce.indexOf('studie') < 0 && bez.nabizeneSekce.indexOf('dpz') >= 0), bez.nabizeneSekce);
  test('CZ se studií: úvod DPZ navazuje na STUDII PROVEDITELNOSTI',
    JSON.stringify(uvodDpz(se)) === JSON.stringify([U.studie + ' ' + U.zaver]), uvodDpz(se));
  test('CZ bez studie: úvod DPZ bez navázání („DPZ rozpracovává…")',
    JSON.stringify(uvodDpz(bez)) === JSON.stringify([U.bez + ' ' + U.zaver]), uvodDpz(bez));
  test('CZ bez studie: „navazuje na vzájemně odsouhlasenou" není nikde v nabídce',
    JSON.stringify(bez.bloky).indexOf('navazuje na vzájemně odsouhlasenou') < 0);
  test('CZ bez studie: věta zní „Dokumentace pro povolení záměru (DPZ) rozpracovává dokumentaci dle platné vyhlášky…"',
    /^Dokumentace pro povolení záměru \(DPZ\) rozpracovává dokumentaci dle platné vyhlášky/.test((uvodDpz(bez) || [''])[0]));
  test('CZ bez studie: poznámka „V případě, že se investor rozhodne pro zpracování STUDIE…" chybí (jako dosud)',
    JSON.stringify(bez.bloky).indexOf('V případě, že se investor rozhodne') < 0);
  test('CZ se studií: poznámka o studii zůstává', JSON.stringify(se.bloky).indexOf('V případě, že se investor rozhodne') >= 0);
  /* jen projednání bez studie: úvod se řídí STUDIÍ (věta mluví o odsouhlasené studii) */
  const zp = zak(true);
  zp.varianty[0].data.proj.zadani.sekce.forEach(s => { if (s.key === 'studie') s.polozky.forEach(p => { p.vyrazeno = true; }); });
  zp.varianty[0].data.proj.cenik.fixy.pamatkari = 10000;   // zkušební ceník má projednání za 0
  const jp = NP.nabidkaProjData(zp, zp.varianty[0], 'cz');
  test('předpoklad: jen projednání má cenu, studie ne', jp.nabizeneSekce.indexOf('projednani') >= 0 && jp.nabizeneSekce.indexOf('studie') < 0, jp.nabizeneSekce);
  test('CZ jen projednání (studie bez ceny): úvod DPZ bez navázání',
    JSON.stringify(uvodDpz(jp)) === JSON.stringify([U.bez + ' ' + U.zaver]), uvodDpz(jp));
  /* DPS a ostatní úvody se nemění */
  const dps = b => (b.bloky.find(x => x.typ === 'rozsah' && /\(DPS\)/.test(x.nadpis)) || {}).uvod;
  test('úvod DPS se studií i bez ní stejný', JSON.stringify(dps(se)) === JSON.stringify(dps(bez)) && (dps(se) || []).length === 1);
}

/* ---- 2) symbol {{PROJ_DPZ_UVOD}} pro Word ---- */
['cz', 'en', 'de', 'fr'].forEach(L => {
  const zs = zak(true), zb = zak(false);
  const s = NP.nabidkaProjData(zs, zs.varianty[0], L).placeholders.PROJ_DPZ_UVOD;
  const b = NP.nabidkaProjData(zb, zb.varianty[0], L).placeholders.PROJ_DPZ_UVOD;
  const K2 = L.toUpperCase();
  test(K2 + ': symbol se studií zmiňuje studii', typeof s === 'string' && STUDIE[L].test(s), s);
  test(K2 + ': symbol bez studie studii nezmiňuje', typeof b === 'string' && b.length > 40 && !STUDIE[L].test(b) && !/studi|étude|study/i.test(b), b);
  if (L === 'cz') {
    test('CZ: symbol = online úvod (se studií)', s === U.studie + ' ' + U.zaver, s);
    test('CZ: symbol = online úvod (bez studie)', b === U.bez + ' ' + U.zaver, b);
  } else {
    test(K2 + ': symbol přeložený, bez české věty', !CESKA.test(s) && !CESKA.test(b), [s, b]);
  }
});
[U.studie, U.bez, U.zaver].forEach(t => ['en', 'de', 'fr'].forEach(L => {
  const st = PR.trStav(t, L);
  test('slovník ' + L.toUpperCase() + ': „' + t.slice(0, 55) + '…"', st.prelozeno && !CESKA.test(st.text), st);
}));

/* ---- 3) šablona PROJ v7 (syntetické XML ve stavbě v5/v6) ---- */
{
  let VS = null;
  try { VS = require(path.join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { VS = null; }
  test('nastroje/vyrob_sablony.js exportuje projV7', !!(VS && typeof VS.projV7 === 'function'));
  if (VS && VS.projV7) {
    const r = (t, b) => '<w:r><w:rPr>' + (b ? '<w:b/>' : '') + '<w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">' + t + '</w:t></w:r>';
    const p = (...behy) => '<w:p><w:pPr><w:jc w:val="both"/></w:pPr>' + behy.join('') + '</w:p>';
    const tbl = (...radky) => '<w:tbl>' + radky.map(c => '<w:tr>' + c.map(x => '<w:tc><w:tcPr/>' + x + '</w:tc>').join('') + '</w:tr>').join('') + '</w:tbl>';
    const odstDpz = p(r('Dokumentace pro povolení záměru (DPZ) navazuje na vzájemně odsouhlasenou '), r('STUDII PROVEDITELNOSTI', true),
      r('. Ta rozpracovává dokumentaci, dle platné vyhlášky do legislativou požadované úrovně s autorizacemi inženýrů dle příslušných oborů. Dokumentace povolení záměru obsahuje tyto části:'));
    const casti = {
      titul: p(r('Název akce: '), r('{{NAZEV_AKCE}}'), '<w:r><w:tab/></w:r>', r('STUDIE PROVEDITELNOSTI', true)),
      navaz: p(r('Navazující PROJEKTOVÉ a INŽENÝRSKÉ ČINNOSTI')),
      st: tbl([p(r('STUDIE PROVEDITELNOSTI (ST):', true)), p()], [p(r('ST')), p(r('Studie proveditelnosti – podoba úprav domu…'))]),
      spNadpis: p(r('CENA ZA STUDII PROVEDITELNOSTI (SP):', true)),
      spTab: tbl([p(r('CENA ZA STUDII PROVEDITELNOSTI – části 1')), p(r('{{PROJ_CENA_SP1}}'))], [p(r('část 2')), p(r('{{PROJ_CENA_SP2}}'))]),
      pozn1: p(r('V případě, že se investor rozhodne pro zpracování STUDIE PROVEDITELNOSTI, navazující projekt pro POVOLENÍ ZÁMĚRU se zhotovuje rozšířením této studie do legislativně požadované úrovně.')),
      pozn2: p(r('TATO SKUTEČNOST JE ZOHLEDNĚNA V CENĚ NAVAZUJÍCÍHO PROJEKTU.')),
      dpz: tbl([p(r('DOKUMENTACE PRO POVOLENÍ ZÁMĚRU (DPZ):', true)), p()], [p(r('DPZ')), odstDpz]),
      cenaDpz: tbl([p(r('CENA ZA DOKUMENTACI PRO POVOLENÍ ZÁMĚRU (DPZ)', true), r('*', true), r(':', true)), p(r('{{PROJ_CENA_DPZ}}'))]),
      hvezda: p(r('*'), r(' Cena je platná v případě návaznosti na STUDII PROVEDITELNOSTI')),
      dolozky: p(r('{{PROJ_DOLOZKY}}')),
    };
    const doc = telo => '<?xml version="1.0"?><w:document><w:body>' + telo + '<w:sectPr/></w:body></w:document>';
    const sloz = (vynech, navic) => doc(Object.keys(casti).filter(k => k !== vynech).map(k => casti[k] + (k === navic ? casti[k] : '')).join(''));
    const v6 = sloz();
    let v7 = '', e = '';
    try { v7 = VS.projV7(v6); } catch (x) { e = x.message; }
    test('v7: bez chyby', !e, e);
    const textBehu = typeof VS.textBehu === 'function' ? VS.textBehu : (() => '');
    test('vyrob_sablony.js exportuje textBehu', typeof VS.textBehu === 'function');
    const t7 = textBehu(v7);
    const sym7 = dg.klicePlaceholderu(v7).sort();
    const CEKANE = ['PROJ_DPZ_UVOD', 'PROJ_TITUL_STUDIE', 'PROJ_TITUL_CINNOSTI', 'PROJ_DPZ_HVEZDICKA_ZNACKA', 'PROJ_DPZ_HVEZDICKA',
      'BLOK_DPZ_HVEZDICKA_ZAC', 'BLOK_DPZ_HVEZDICKA_KON', 'BLOK_STUDIE_POZN_ZAC', 'BLOK_STUDIE_POZN_KON',
      'BLOK_STUDIE_CENA_ZAC', 'BLOK_STUDIE_CENA_KON', 'BLOK_STUDIE_ROZSAH_ZAC', 'BLOK_STUDIE_ROZSAH_KON'];
    test('v7: symboly šablony = v6 + úvod DPZ, titul, hvězdička a bloky studie',
      JSON.stringify(sym7) === JSON.stringify(dg.klicePlaceholderu(v6).concat(CEKANE).sort()), sym7);
    test('v7: úvod DPZ nese jen {{PROJ_DPZ_UVOD}}', t7.indexOf('DPZ{{PROJ_DPZ_UVOD}}') >= 0 && t7.indexOf('navazuje na vzájemně') < 0, t7);
    test('v7: titul „Název akce: {{NAZEV_AKCE}}<tab>{{PROJ_TITUL_STUDIE}}"', t7.indexOf('Název akce: {{NAZEV_AKCE}}{{PROJ_TITUL_STUDIE}}') >= 0 && /<w:tab\/><\/w:r><w:r><w:rPr><w:b\/>/.test(v7), t7.slice(0, 120));
    test('v7: „Navazující…" → {{PROJ_TITUL_CINNOSTI}}', t7.indexOf('{{PROJ_TITUL_CINNOSTI}}') >= 0 && t7.indexOf('Navazující PROJEKTOVÉ') < 0);
    test('v7: nadpis ceny DPZ „(DPZ){{PROJ_DPZ_HVEZDICKA_ZNACKA}}:"', t7.indexOf('ZÁMĚRU (DPZ){{PROJ_DPZ_HVEZDICKA_ZNACKA}}:') >= 0, t7);
    test('v7: poznámka hvězdičky = {{PROJ_DPZ_HVEZDICKA}} v bloku', /\{\{BLOK_DPZ_HVEZDICKA_ZAC\}\}\{\{PROJ_DPZ_HVEZDICKA\}\}\{\{BLOK_DPZ_HVEZDICKA_KON\}\}/.test(t7), t7);
    test('v7: blok ST obaluje tabulku ST', /\{\{BLOK_STUDIE_ROZSAH_ZAC\}\}STUDIE PROVEDITELNOSTI \(ST\):[^{]*\{\{BLOK_STUDIE_ROZSAH_KON\}\}/.test(t7));
    test('v7: blok ceny SP = nadpis + tabulka', /\{\{BLOK_STUDIE_CENA_ZAC\}\}CENA ZA STUDII PROVEDITELNOSTI \(SP\):.*\{\{PROJ_CENA_SP2\}\}\{\{BLOK_STUDIE_CENA_KON\}\}/.test(t7));
    test('v7: blok poznámky = oba odstavce', /\{\{BLOK_STUDIE_POZN_ZAC\}\}V případě.*TATO SKUTEČNOST JE ZOHLEDNĚNA V CENĚ NAVAZUJÍCÍHO PROJEKTU\.\{\{BLOK_STUDIE_POZN_KON\}\}/.test(t7));
    test('v7: vlastnosti odstavce i písmo prvního běhu zůstávají', v7.indexOf('<w:jc w:val="both"/>') >= 0 && /<w:sz w:val="18"\/><\/w:rPr><w:t[^>]*>\{\{PROJ_DPZ_UVOD\}\}/.test(v7));
    const chybaZ = x => { try { VS.projV7(x); return ''; } catch (er) { return er.message; } };
    test('v7: vstup bez {{PROJ_DOLOZKY}} (není v6) → chyba', /není PROJ v6/.test(chybaZ(sloz('dolozky'))));
    test('v7: dva odstavce úvodu DPZ → chyba, nic se nehádá', /právě jeden odstavec/.test(chybaZ(sloz(null, 'dpz'))));
    test('v7: úvod DPZ chybí → chyba', /právě jeden odstavec/.test(chybaZ(sloz('dpz'))));
    test('v7: podruhé → chyba „už má"', /už úvod DPZ/.test(chybaZ(v7)));
    test('v7: titul chybí → chyba', /titul „STUDIE PROVEDITELNOSTI"/.test(chybaZ(sloz('titul'))));
    test('v7: titul třikrát → chyba', /titul „Navazující/.test(chybaZ(doc(Object.keys(casti).map(k => casti[k] + (k === 'navaz' ? casti.navaz + casti.navaz : '')).join('')))));
    test('v7: titul dvakrát stejně (textové pole + záloha) → projde', !chybaZ(sloz(null, 'titul')));
    test('v7: chybí „TATO SKUTEČNOST…" → chyba', /TATO SKUTEČNOST/.test(chybaZ(sloz('pozn2'))));
    test('v7: chybí tabulka cen SP → chyba', /tabulku s \{\{PROJ_CENA_SP1\}\}/.test(chybaZ(sloz('spTab'))));
    test('v7: chybí tabulka ST → chyba', /STUDIE PROVEDITELNOSTI \(ST\)/.test(chybaZ(sloz('st'))));
    test('v7: chybí hvězdička u nadpisu ceny DPZ → chyba', /CENA ZA DOKUMENTACI/.test(chybaZ(sloz('cenaDpz'))));
    test('v7: chybí poznámka „* Cena je platná…" → chyba', /Cena je platná/.test(chybaZ(sloz('hvezda'))));

    /* vyplnění jako docxVyplnSablonu (bloky, pak symboly) */
    const vypln = (studie) => {
      const z = zak(studie);
      const d = NP.nabidkaProjData(z, z.varianty[0], 'cz');
      return { d, x: textBehu(dg.nahradPlaceholdery(dg.odstranPrazdneBloky(v7, d.placeholders, d.blokyPryc), d.placeholders)) };
    };
    {
      const { d, x } = vypln(false);
      test('Word bez studie: blokyPryc = poznámka, rozsah ST, cena SP', JSON.stringify(d.blokyPryc.slice().sort()) === JSON.stringify(['BLOK_STUDIE_CENA', 'BLOK_STUDIE_POZN', 'BLOK_STUDIE_ROZSAH']), d.blokyPryc);
      test('Word bez studie: žádná zmínka o studii', !/STUDI|studi/.test(x), x);
      test('Word bez studie: titul „PROJEKTOVÉ a INŽENÝRSKÉ ČINNOSTI", bez „Navazující"', x.indexOf('PROJEKTOVÉ a INŽENÝRSKÉ ČINNOSTI') >= 0 && x.indexOf('Navazující') < 0);
      test('Word bez studie: nadpis ceny DPZ bez hvězdičky', x.indexOf('ZÁMĚRU (DPZ):') >= 0 && x.indexOf('*') < 0, x);
      test('Word bez studie: úvod DPZ „(DPZ) rozpracovává"', x.indexOf('(DPZ) rozpracovává') >= 0);
      test('Word bez studie: ve výstupu nezůstal symbol ani značka', !/\{\{|\}\}/.test(x), x.match(/\{\{[^}]*\}\}/g));
    }
    {
      const { d, x } = vypln(true);
      test('Word se studií: blokyPryc prázdné', d.blokyPryc.length === 0, d.blokyPryc);
      test('Word se studií: titul STUDIE PROVEDITELNOSTI + „Navazující…"', x.indexOf('Název akce: Zkušební akce D1STUDIE PROVEDITELNOSTI') >= 0 && x.indexOf('Navazující PROJEKTOVÉ a INŽENÝRSKÉ ČINNOSTI') >= 0, x.slice(0, 150));
      test('Word se studií: hvězdička u nadpisu i poznámka', x.indexOf('ZÁMĚRU (DPZ)*:') >= 0 && x.indexOf('* Cena je platná v případě návaznosti na STUDII PROVEDITELNOSTI') >= 0);
      test('Word se studií: rozsah ST, cena SP, poznámka a úvod s navázáním', x.indexOf('STUDIE PROVEDITELNOSTI (ST):') >= 0 && x.indexOf('CENA ZA STUDII PROVEDITELNOSTI (SP):') >= 0
        && x.indexOf('TATO SKUTEČNOST') >= 0 && x.indexOf('navazuje na vzájemně odsouhlasenou') >= 0);
    }
    {
      /* jen projednání: rozsah a cena studie zůstávají (jako online blok ST), poznámka a hvězdička ne */
      const z = zak(true);
      z.varianty[0].data.proj.zadani.sekce.forEach(s => { if (s.key === 'studie') s.polozky.forEach(q => { q.vyrazeno = true; }); });
      z.varianty[0].data.proj.cenik.fixy.pamatkari = 10000;
      const d = NP.nabidkaProjData(z, z.varianty[0], 'cz');
      test('Word jen projednání: pryč jen poznámka o studii', JSON.stringify(d.blokyPryc) === JSON.stringify(['BLOK_STUDIE_POZN']), d.blokyPryc);
      test('Word jen projednání: titul se studií, bez hvězdičky', d.placeholders.PROJ_TITUL_STUDIE === 'STUDIE PROVEDITELNOSTI'
        && d.placeholders.PROJ_DPZ_HVEZDICKA_ZNACKA === '' && d.placeholders.PROJ_DPZ_HVEZDICKA === '');
    }
    ['en', 'de', 'fr'].forEach(L => {
      const zb = zak(false), zs = zak(true);
      const b = NP.nabidkaProjData(zb, zb.varianty[0], L).placeholders, s2 = NP.nabidkaProjData(zs, zs.varianty[0], L).placeholders;
      test(L.toUpperCase() + ': titul a hvězdička přeložené, bez dvojtečky v titulu',
        [b.PROJ_TITUL_CINNOSTI, s2.PROJ_TITUL_CINNOSTI, s2.PROJ_TITUL_STUDIE, s2.PROJ_DPZ_HVEZDICKA].every(t => t && !CESKA.test(t) && !/PROJEKTOV|INŽEN/.test(t))
        && !/:\s*$/.test(s2.PROJ_TITUL_STUDIE) && b.PROJ_TITUL_STUDIE === '' && b.PROJ_DPZ_HVEZDICKA === '',
        [b.PROJ_TITUL_CINNOSTI, s2.PROJ_TITUL_STUDIE, s2.PROJ_DPZ_HVEZDICKA]);
    });
    /* smlouva o dílo PROJ si bloky nabídky nebere (SoD v4 by hlásila chybějící blok) */
    {
      nacti('./kryci_proj.js');
      const SOD = nacti('./sod.js');
      const z = zak(false);
      let d = null, er = '';
      try { d = SOD.sodProjData(z, z.varianty[0], 'cz'); } catch (x) { er = x.message; }
      test('SoD PROJ: blokyPryc bez bloků studie nabídky', !!d && !(d.blokyPryc || []).some(k => /^BLOK_STUDIE_|DPZ_HVEZDICKA/.test(k)), er || (d && d.blokyPryc));
    }
  }
}

/* ---- 3b) Q1 hvězdička online, Q2 termín DPZ podle studie ---- */
{
  const zs = zak(true), zb = zak(false);
  const se = NP.nabidkaProjData(zs, zs.varianty[0], 'cz'), bez = NP.nabidkaProjData(zb, zb.varianty[0], 'cz');
  const cenaDpz = d => d.bloky.find(b => b.typ === 'cena' && /\(DPZ\)/.test(b.nadpis));
  test('Q1 online se studií: hvězdička ceny DPZ zůstává', cenaDpz(se).hvezdicka === 'Cena je platná v případě návaznosti na STUDII PROVEDITELNOSTI.');
  test('Q1 online bez studie: hvězdička ceny DPZ vynechaná', cenaDpz(bez).hvezdicka === '', cenaDpz(bez).hvezdicka);
  const terminDpz = d => { const b = d.bloky.find(x => x.nadpis === 'TERMÍNY'); return b ? b.radky.filter(r => /hrubopis DPZ/.test(r[0])).map(r => r[1]) : null; };
  test('Q2 online se studií: termín hrubopisu DPZ „od schválení studie" (jednou)', JSON.stringify(terminDpz(se)) === JSON.stringify(['do 10–12 týdnů od schválení studie investorem a objednání']), terminDpz(se));
  const PD0 = require('./podminky.js'), BEZ = PD0.PODMINKY_TERMIN_DPZ_BEZ_STUDIE;
  /* rozhodnutí J. V. 20. 10. 2026 ~11:35 */
  test('Q2 znění bez studie = „do 12 týdnů od zpracování výstupů ze zaměření"', BEZ === 'do 12 týdnů od zpracování výstupů ze zaměření', BEZ);
  ['do 12 týdnů od zpracování výstupů ze zaměření'].forEach(t => ['en', 'de', 'fr'].forEach(L => {
    const st = PR.trStav(t, L);
    test('Q2 slovník ' + L.toUpperCase() + ': „' + t + '"', st.prelozeno && !CESKA.test(st.text), st);
  }));
  test('Q2 online bez studie: termín hrubopisu DPZ = znění bez studie (jednou)', JSON.stringify(terminDpz(bez)) === JSON.stringify([BEZ]), terminDpz(bez));
  test('Q2 Word bez studie: PROJ_TERMINY_TERMIN nese znění bez studie, ne studii',
    bez.placeholders.PROJ_TERMINY_TERMIN.indexOf(BEZ) >= 0 && !/schválení studie/.test(bez.placeholders.PROJ_TERMINY_TERMIN)
    && bez.placeholders.PROJ_TERMINY_CINNOST.split('\n').length === bez.placeholders.PROJ_TERMINY_TERMIN.split('\n').length);
  const PD = require('./podminky.js');
  test('Q2 Firma: klíče dpz+studie / dpz-studie projdou kontrolou, neznámý ne',
    PD.podminkyEf({ podminky: { nabidkaProj: { terminy: { cz: [['A', 'B', 'dpz+studie'], ['A', 'C', 'dpz-studie']] } } } }).nabidkaProj.terminy.cz[0][2] === 'dpz+studie'
    && PD.podminkyEf({ podminky: { nabidkaProj: { terminy: { cz: [['A', 'B', 'dpz*studie']] } } } }).nabidkaProj.terminy.cz.length > 1);
  /* uložené starší termíny s klíčem dpz se tisknou dál vždy, když je DPZ */
  global.NAST.firma = Object.assign({}, global.firmaDefault(), { podminky: { nabidkaProj: { terminy: { cz: [['Hrubopis DPZ', 'vlastní termín', 'dpz']] } } } });
  const st = NP.nabidkaProjData(zb, zb.varianty[0], 'cz');
  test('Q2 starší uložené termíny (klíč dpz) se tisknou beze změny', JSON.stringify((st.bloky.find(x => x.nadpis === 'TERMÍNY') || {}).radky) === JSON.stringify([['Hrubopis DPZ', 'vlastní termín']]));
  global.NAST.firma = global.firmaDefault();
}

/* ---- 4) kontrola dpzUvodWordProj ---- */
{
  const ctx = (studie, sym) => { const z = zak(studie), v = z.varianty[0];
    return { zak: z, projZadani: v.data.proj.zadani, projVysledek: vypocetProj(v.data.proj.zadani, v.data.proj.cenik),
      sablonaNabidkaProj: sym ? { nazev: 'Sablona_NABIDKA_PROJ_v6.docx', verze: 6, symboly: sym } : null }; };
  const kody = c => K.kontrolyProved(c).kody;
  const V6 = ['PROJ_CENA_DPZ', 'PROJ_CELKEM_BEZ_DPH', 'PROJ_DOLOZKY'];
  const V7 = V6.concat(['PROJ_DPZ_UVOD']);
  test('kontrola: DPZ bez studie + šablona v6 → varování', kody(ctx(false, V6)).indexOf('dpzUvodWordProj') >= 0, kody(ctx(false, V6)));
  test('kontrola: DPZ bez studie + šablona v7 → mlčí', kody(ctx(false, V7)).indexOf('dpzUvodWordProj') < 0);
  test('kontrola: studie nabízená → mlčí', kody(ctx(true, V6)).indexOf('dpzUvodWordProj') < 0);
  test('kontrola: symboly šablony neznámé → mlčí', kody(ctx(false, null)).indexOf('dpzUvodWordProj') < 0);
  {
    const c = ctx(false, V6);
    c.projZadani.sekce.forEach(s => { if (s.key === 'dpz') s.polozky.forEach(p => { p.vyrazeno = true; }); });
    c.projVysledek = vypocetProj(c.projZadani, c.zak.varianty[0].data.proj.cenik);
    test('kontrola: DPZ se nenabízí (ani studie) → mlčí', kody(c).indexOf('dpzUvodWordProj') < 0, kody(c));
  }
  const n = K.kontrolyProved(ctx(false, V6)).nalezy.find(x => x.kod === 'dpzUvodWordProj');
  test('kontrola: varování (ne zábrana), text radí šablonu v7', !!n && n.uroven !== K.KONTROLY_UROVEN_ZABRANA && /PROJ v7/.test(n.text), n);
  test('kontrola je v seznamu pravidel', K.kontrolyPravidla().some(p => p.kod === 'dpzUvodWordProj'));
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
