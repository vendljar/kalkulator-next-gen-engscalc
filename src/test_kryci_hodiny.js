/* HODINY Z KALKULACE V KRYCÍCH LISTECH (verze Backoffice) — zadání J. V.
 * 14. 10. 2026, návrh podklady/NAVRH_HODINY_KRYCI_LIST_2026-10-14.md
 * odsouhlasen s výhradou „desetinná čísla v výpisu hodin neuváděj,
 * zaokrouhluj".
 *
 * Na konec krycího listu OCK i PROJ (jen BO) přijde jedna tabulka se
 * sloupci OCK a PROJ: hodiny ze všech nabízených položek, celé hodiny,
 * řádek i celek sečtené ze zaokrouhlených částí. Čísla níže jsou varianta A
 * návrhu (exteriér, 6 nástupišť, zdvih 17,3 m, výchozí PROJ) nad zkušebním
 * ceníkem z repozitáře.
 *
 * Spuštění: cd src && node test_kryci_hodiny.js */
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
nacti('./plan_plateb.js');
nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
nacti('./zamek.js');
const K = nacti('./kryci.js');
const KP = nacti('./kryci_proj.js');
const JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));
global.NAST = { firma: global.firmaDefault() };

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

test('kryci.js exportuje kryciHodiny a kryciHodinySekce', typeof K.kryciHodiny === 'function' && typeof K.kryciHodinySekce === 'function');
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const zakazka = (uprav) => {
  const zak = zk.novaZakazka();
  /* Bez čísla nabídky se počítají obě strany (P6); s číslem OPR / OVP jen
   * jedna a sloupec druhé strany je „—" (hlídá oddíl „vyřazená strana"). */
  zak.cislo = ''; zak.nazevAkce = 'Hodiny';
  const v = zak.varianty[0];
  v.data.proj.cenik = ZC.zkusebniCenikProj();
  Object.assign(v.data.ock.zadani, { prejezd: 2.7, zdvih: 17.325, prohluben: 1.05, sirka: 1.51, hloubka: 1.515,
    nastupiste: 6, typSachty: 'exteriérová' });
  if (uprav) uprav(zak, v);
  return zak;
};
const tab = zak => K.kryciHodiny(zak, zak.varianty[0], JEKLY);
const radek = (h, popis) => (h.radky.find(r => r[0] === popis) || null);

/* ---- varianta A návrhu ---- */
{
  const h = tab(zakazka());
  test('sloupce: popis, OCK, PROJ', JSON.stringify(h.sloupce) === JSON.stringify(['', 'OCK', 'PROJ']));
  const ocek = [
    ['montáž na stavbě', '128 h (4 os. × 32 h)', '—'],
    ['dílna — oplechování (práce)', '29 h (24 + 5)', '—'],
    ['projekce / konstrukce', '50 h', '—'],
    ['statické posouzení', '10 h', '—'],
    ['stavbyvedoucí', '40 h', '—'],
    ['studie', '—', '28 h (Studie 24 + Konzultace 4)'],
    ['DPZ', '—', '64 h (Projektová dokumentace pro DOSS 52 + Projektová dokumentace pro SÚ 6 + Statika 6)'],
    ['DPS', '—', '54 h (Projekt pro DPS – stavební část 48 + Statika 6)'],
    ['IČ / EZC / kolaudace', '—', 'paušál (bez hodin)'],
    ['celkem', '257 h', '146 h'],
  ];
  test('varianta A: řádky a čísla jako v odsouhlaseném návrhu (zaokrouhleno)', JSON.stringify(h.radky) === JSON.stringify(ocek), h.radky);
  test('žádné desetinné číslo ve výpisu', !h.radky.some(r => r.some(c => /\d,\d/.test(String(c)))), h.radky);
  test('nová varianta AD nenabízí → řádek autorského dozoru není', !radek(h, 'autorský dozor'));
}

/* ---- varianta B: interiér, PROJ se zaměřením a s AD ---- */
{
  const h = tab(zakazka((zak, v) => {
    v.data.ock.zadani.typSachty = 'interiérová';
    v.data.proj.zadani.sekce.find(s => s.key === 'zamereni').polozky.forEach(p => { p.vyrazeno = false; });
    v.data.proj.zadani.nabizetAD = true;
  }));
  test('varianta B: montáž 96 h (4 os. × 24 h)', (radek(h, 'montáž na stavbě') || [])[1] === '96 h (4 os. × 24 h)', radek(h, 'montáž na stavbě'));
  test('varianta B: zaměření 15 h (Zaměření 5 + Výstup 10)', (radek(h, 'zaměření') || [])[2] === '15 h (Zaměření 5 + Výstup 10)', radek(h, 'zaměření'));
  test('varianta B: autorský dozor max. 30 h / měsíc, do celku se nepočítá',
    (radek(h, 'autorský dozor') || [])[2] === 'max. 30 h / měsíc (do celku se nepočítá)', radek(h, 'autorský dozor'));
  test('varianta B: celkem OCK 225 h, PROJ 161 h', JSON.stringify(radek(h, 'celkem')) === JSON.stringify(['celkem', '225 h', '161 h']), radek(h, 'celkem'));
}

/* ---- jen nabízené položky ---- */
{
  const h = tab(zakazka((zak, v) => {
    v.data.ock.zadani.nepocitat = ['PRÁCE STAVBYVEDOUCÍHO'];              // odškrtnuto „Počítat"
    v.data.proj.zadani.sekce.find(s => s.key === 'dps').polozky.forEach(p => { p.vyrazeno = true; });
    const dpz = v.data.proj.zadani.sekce.find(s => s.key === 'dpz').polozky.find(p => p.nazev === 'Statika');
    dpz.hodiny = 0;                                                       // vypnuto množstvím
  }));
  test('nepočítaná položka OCK (stavbyvedoucí) se nevypíše', !radek(h, 'stavbyvedoucí'), h.radky.map(r => r[0]));
  test('činnost PROJ mimo nabídku (DPS vyřazená celá) se nevypíše', !radek(h, 'DPS'));
  test('nulová položka PROJ se do rozpadu nedostane', (radek(h, 'DPZ') || [])[2] === '58 h (Projektová dokumentace pro DOSS 52 + Projektová dokumentace pro SÚ 6)', radek(h, 'DPZ'));
  test('celkem se sčítá jen z vypsaných řádků', JSON.stringify(radek(h, 'celkem')) === JSON.stringify(['celkem', '217 h', '86 h']), radek(h, 'celkem'));
}

/* ---- zaokrouhlení: řádek i celek ze zaokrouhlených částí ---- */
{
  const h = tab(zakazka((zak, v) => { v.data.ock.zadani.oplechOstatniHod = 5.4; v.data.ock.zadani.projekceZakladHod = 50.5; }));
  test('5,4 h → 5 h, 50,5 h → 51 h; součet ze zaokrouhlených',
    (radek(h, 'dílna — oplechování (práce)') || [])[1] === '29 h (24 + 5)' && (radek(h, 'projekce / konstrukce') || [])[1] === '51 h'
    && (radek(h, 'celkem') || [])[1] === '258 h', h.radky);
}

/* ---- vyřazená strana zakázky (P6) ---- */
{
  const h = tab(zakazka((z) => { z.cislo = '2026 - OPR - CN - 9160'; }));
  test('zakázka s číslem OPR (PROJ vyřazená): sloupec PROJ je celý „—"', h.radky.every(r => r[2] === '—') && !radek(h, 'studie'), h.radky);
  const hp = tab(zakazka((z) => { z.cislo = '2026 - OVP - CN - 9161'; }));
  test('zakázka s číslem OVP (OCK vyřazená): sloupec OCK je celý „—"', hp.radky.every(r => r[1] === '—') && !!radek(hp, 'studie'), hp.radky);
}

/* ---- krycí listy: jen verze BO, poslední sekce ---- */
{
  const zak = zakazka(), v = zak.varianty[0];
  const bo = K.kryciData(zak, v, JEKLY, 'bo'), td = K.kryciData(zak, v, JEKLY, 'techdata');
  const posl = bo.sekce[bo.sekce.length - 1];
  test('krycí list OCK (BO): poslední sekce „Hodiny z kalkulace" se sloupci', posl.sekce === 'Hodiny z kalkulace' && posl.sloupce.length === 3
    && JSON.stringify(posl.radky) === JSON.stringify(tab(zak).radky));
  test('krycí list OCK (Techdata): hodiny nejsou', !td.sekce.some(s => s.sekce === 'Hodiny z kalkulace'));
  const pbo = KP.kryciProjData(zak, v, JEKLY, 'bo'), ptd = KP.kryciProjData(zak, v, JEKLY, 'techdata');
  test('krycí list PROJ (BO): poslední sekce tatáž tabulka', pbo.sekce[pbo.sekce.length - 1].sekce === 'Hodiny z kalkulace'
    && JSON.stringify(pbo.sekce[pbo.sekce.length - 1].radky) === JSON.stringify(posl.radky));
  test('krycí list PROJ (Techdata): hodiny nejsou', !ptd.sekce.some(s => s.sekce === 'Hodiny z kalkulace'));
  /* Word: tabulka se třemi sloupci, záhlaví OCK / PROJ, platné XML */
  const xml = dg.docxTeloZeSekci(bo.nadpis, bo.sekce);
  const i = xml.indexOf('Hodiny z kalkulace');
  const tbl = xml.slice(xml.lastIndexOf('<w:tbl>', i), xml.indexOf('</w:tbl>', i));
  test('Word: tabulka hodin má tři sloupce a záhlaví OCK / PROJ',
    (tbl.match(/<w:gridCol /g) || []).length === 3 && /<w:gridSpan w:val="3"\/>/.test(tbl) && />OCK</.test(tbl) && />PROJ</.test(tbl)
    && tbl.indexOf('128 h (4 os. × 32 h)') > 0, (tbl.match(/<w:gridCol /g) || []).length);
  test('Word: XML krycího listu bez vad', !dg.xmlStrukturaVada('<w:document><w:body>' + xml + '</w:body></w:document>'));
  test('Word: dvousloupcové sekce beze změny', (xml.slice(0, xml.lastIndexOf('<w:tbl>', i)).match(/<w:tblGrid>/g) || []).length
    === (xml.slice(0, xml.lastIndexOf('<w:tbl>', i)).match(/<w:tblGrid><w:gridCol w:w="3400"\/><w:gridCol w:w="5600"\/><\/w:tblGrid>/g) || []).length);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
