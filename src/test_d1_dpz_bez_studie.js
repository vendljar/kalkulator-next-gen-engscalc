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
  const jp = NP.nabidkaProjData(zp, zp.varianty[0], 'cz');
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

/* ---- 3) šablona PROJ v7 (syntetické XML) ---- */
{
  let VS = null;
  try { VS = require(path.join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { VS = null; }
  test('nastroje/vyrob_sablony.js exportuje projV7', !!(VS && typeof VS.projV7 === 'function'));
  if (VS && VS.projV7) {
    const odst = '<w:p><w:pPr><w:jc w:val="both"/></w:pPr>'
      + '<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">Dokumentace pro povolení záměru (DPZ) navazuje na vzájemně odsouhlasenou </w:t></w:r>'
      + '<w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>STUDII PROVEDITELNOSTI</w:t></w:r>'
      + '<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">. Ta rozpracovává dokumentaci, dle platné vyhlášky do legislativou požadované úrovně s autorizacemi inženýrů dle příslušných oborů. Dokumentace povolení záměru obsahuje tyto části:</w:t></w:r></w:p>';
    const tabulka = c => '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>DPZ</w:t></w:r></w:p></w:tc><w:tc>' + c + '</w:tc></w:tr></w:tbl>';
    const doc = telo => '<?xml version="1.0"?><w:document><w:body>' + telo + '<w:sectPr/></w:body></w:document>';
    const dolozky = '<w:p><w:r><w:t>{{PROJ_DOLOZKY}}</w:t></w:r></w:p>';
    const v6 = doc(tabulka(odst) + dolozky);
    let v7 = '', e = '';
    try { v7 = VS.projV7(v6); } catch (x) { e = x.message; }
    test('v7: bez chyby', !e, e);
    const t7 = (v7.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(x => x.replace(/<[^>]+>/g, '')).join('');
    test('v7: úvod DPZ nese jen {{PROJ_DPZ_UVOD}}', t7.indexOf('{{PROJ_DPZ_UVOD}}') >= 0 && t7.indexOf('navazuje') < 0 && t7.indexOf('rozpracovává') < 0, t7);
    test('v7: symboly šablony = v6 + PROJ_DPZ_UVOD',
      JSON.stringify(dg.klicePlaceholderu(v7).sort()) === JSON.stringify(dg.klicePlaceholderu(v6).concat(['PROJ_DPZ_UVOD']).sort()), dg.klicePlaceholderu(v7));
    test('v7: vlastnosti odstavce i písmo prvního běhu zůstávají', v7.indexOf('<w:jc w:val="both"/>') >= 0 && /<w:sz w:val="18"\/><\/w:rPr><w:t[^>]*>\{\{PROJ_DPZ_UVOD\}\}/.test(v7));
    test('v7: ostatní text tabulky beze změny (DPZ)', t7.indexOf('DPZ{{PROJ_DPZ_UVOD}}') === 0, t7);
    const chybaZ = x => { try { VS.projV7(x); return ''; } catch (er) { return er.message; } };
    test('v7: vstup bez {{PROJ_DOLOZKY}} (není v6) → chyba', /není PROJ v6/.test(chybaZ(doc(tabulka(odst)))));
    test('v7: dva odstavce úvodu DPZ → chyba, nic se nehádá', /právě jeden odstavec/.test(chybaZ(doc(tabulka(odst) + tabulka(odst) + dolozky))));
    test('v7: úvod DPZ chybí → chyba', /právě jeden odstavec/.test(chybaZ(doc(dolozky))));
    test('v7: podruhé → chyba „už má"', /už úvod DPZ/.test(chybaZ(v7)));
    /* aplikace symbol vyplní a dokument nese větu bez studie */
    const z0 = zak(false);
    const ph = NP.nabidkaProjData(z0, z0.varianty[0], 'cz').placeholders;
    const vypl = v7.split('{{PROJ_DPZ_UVOD}}').join(ph.PROJ_DPZ_UVOD);
    test('v7 vyplněná bez studie: věta „(DPZ) rozpracovává", bez „navazuje"', vypl.indexOf('(DPZ) rozpracovává') >= 0 && vypl.indexOf('navazuje') < 0);
  }
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
