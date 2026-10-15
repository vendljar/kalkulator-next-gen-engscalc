/* HODINY Z KALKULACE V KRYCÍCH LISTECH (verze Backoffice) — zadání J. V.
 * 14. 10. 2026, návrh podklady/NAVRH_HODINY_KRYCI_LIST_2026-10-14.md
 * odsouhlasen s výhradou „desetinná čísla v výpisu hodin neuváděj,
 * zaokrouhluj".
 *
 * Na konec krycího listu OCK i PROJ (jen BO) přijde tabulka hodin ze všech
 * nabízených položek, celé hodiny, řádek i celek sečtené ze zaokrouhlených
 * částí. Od 15. 10. 2026 (zadání J. V., v15.10.10) KAŽDÝ LIST JEN SVOU
 * STRANU: list OCK jen hodiny z Kalkulace OCK, list PROJ jen z Kalkulace
 * PROJ (jeden sloupec hodnot); vyřazená strana bez tabulky. Čísla níže jsou varianta A
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
   * jedna a list druhé strany tabulku nemá (oddíl „vyřazená strana"). */
  zak.cislo = ''; zak.nazevAkce = 'Hodiny';
  const v = zak.varianty[0];
  v.data.proj.cenik = ZC.zkusebniCenikProj();
  Object.assign(v.data.ock.zadani, { prejezd: 2.7, zdvih: 17.325, prohluben: 1.05, sirka: 1.51, hloubka: 1.515,
    nastupiste: 6, typSachty: 'exteriérová' });
  if (uprav) uprav(zak, v);
  return zak;
};
const tab = (zak, strana) => K.kryciHodiny(zak, zak.varianty[0], JEKLY, strana || 'ock');
const tabP = zak => tab(zak, 'proj');
const radek = (h, popis) => (h.radky.find(r => r[0] === popis) || null);

/* ---- varianta A návrhu: list OCK jen OCK, list PROJ jen PROJ ---- */
{
  const zak = zakazka();
  const h = tab(zak), hp = tabP(zak);
  test('list OCK: sloupce popis, OCK (bez PROJ)', JSON.stringify(h.sloupce) === JSON.stringify(['', 'OCK']), h.sloupce);
  test('list PROJ: sloupce popis, PROJ (bez OCK)', JSON.stringify(hp.sloupce) === JSON.stringify(['', 'PROJ']), hp.sloupce);
  const ocek = [
    ['montáž na stavbě', '128 h (4 os. × 32 h)'],
    ['dílna — oplechování (práce)', '29 h (24 + 5)'],
    ['projekce / konstrukce', '50 h'],
    ['statické posouzení', '10 h'],
    ['stavbyvedoucí', '40 h'],
    ['celkem', '257 h'],
  ];
  test('varianta A, list OCK: jen řádky OCK, čísla jako v odsouhlaseném návrhu', JSON.stringify(h.radky) === JSON.stringify(ocek), h.radky);
  const ocekP = [
    ['studie', '28 h (Studie 24 + Konzultace 4)'],
    ['DPZ', '64 h (Projektová dokumentace pro DOSS 52 + Projektová dokumentace pro SÚ 6 + Statika 6)'],
    ['DPS', '54 h (Projekt pro DPS – stavební část 48 + Statika 6)'],
    ['IČ / EZC / kolaudace', 'paušál (bez hodin)'],
    ['celkem', '146 h'],
  ];
  test('varianta A, list PROJ: jen řádky PROJ', JSON.stringify(hp.radky) === JSON.stringify(ocekP), hp.radky);
  test('žádné desetinné číslo ve výpisu', ![].concat(h.radky, hp.radky).some(r => r.some(c => /\d,\d/.test(String(c)))));
  test('žádná pomlčka za druhou stranu (každý řádek má jen popis a hodnotu)',
    [].concat(h.radky, hp.radky).every(r => r.length === 2 && r[1] !== '—'), [].concat(h.radky, hp.radky));
  test('nová varianta AD nenabízí → řádek autorského dozoru není', !radek(hp, 'autorský dozor'));
  test('neznámá strana → null', K.kryciHodiny(zak, zak.varianty[0], JEKLY) === null && K.kryciHodiny(zak, zak.varianty[0], JEKLY, 'x') === null);
}

/* ---- varianta B: interiér, PROJ se zaměřením a s AD ---- */
{
  const zak = zakazka((zak, v) => {
    v.data.ock.zadani.typSachty = 'interiérová';
    v.data.proj.zadani.sekce.find(s => s.key === 'zamereni').polozky.forEach(p => { p.vyrazeno = false; });
    v.data.proj.zadani.nabizetAD = true;
  });
  const h = tab(zak), hp = tabP(zak);
  test('varianta B: montáž 96 h (4 os. × 24 h)', (radek(h, 'montáž na stavbě') || [])[1] === '96 h (4 os. × 24 h)', radek(h, 'montáž na stavbě'));
  test('varianta B: zaměření 15 h (Zaměření 5 + Výstup 10) jen v listu PROJ', (radek(hp, 'zaměření') || [])[1] === '15 h (Zaměření 5 + Výstup 10)'
    && !radek(h, 'zaměření'), radek(hp, 'zaměření'));
  test('varianta B: autorský dozor max. 30 h / měsíc jen v listu PROJ, do celku se nepočítá',
    (radek(hp, 'autorský dozor') || [])[1] === 'max. 30 h / měsíc (do celku se nepočítá)' && !radek(h, 'autorský dozor'), radek(hp, 'autorský dozor'));
  test('varianta B: celkem OCK 225 h, PROJ 161 h', JSON.stringify(radek(h, 'celkem')) === JSON.stringify(['celkem', '225 h'])
    && JSON.stringify(radek(hp, 'celkem')) === JSON.stringify(['celkem', '161 h']), [radek(h, 'celkem'), radek(hp, 'celkem')]);
}

/* ---- jen nabízené položky ---- */
{
  const zak = zakazka((zak, v) => {
    v.data.ock.zadani.nepocitat = ['PRÁCE STAVBYVEDOUCÍHO'];              // odškrtnuto „Počítat"
    v.data.proj.zadani.sekce.find(s => s.key === 'dps').polozky.forEach(p => { p.vyrazeno = true; });
    const dpz = v.data.proj.zadani.sekce.find(s => s.key === 'dpz').polozky.find(p => p.nazev === 'Statika');
    dpz.hodiny = 0;                                                       // vypnuto množstvím
  });
  const h = tab(zak), hp = tabP(zak);
  test('nepočítaná položka OCK (stavbyvedoucí) se nevypíše', !radek(h, 'stavbyvedoucí'), h.radky.map(r => r[0]));
  test('činnost PROJ mimo nabídku (DPS vyřazená celá) se nevypíše', !radek(hp, 'DPS'));
  test('nulová položka PROJ se do rozpadu nedostane', (radek(hp, 'DPZ') || [])[1] === '58 h (Projektová dokumentace pro DOSS 52 + Projektová dokumentace pro SÚ 6)', radek(hp, 'DPZ'));
  test('celkem se sčítá jen z vypsaných řádků', (radek(h, 'celkem') || [])[1] === '217 h' && (radek(hp, 'celkem') || [])[1] === '86 h');
}

/* ---- zaokrouhlení: řádek i celek ze zaokrouhlených částí ---- */
{
  const h = tab(zakazka((zak, v) => { v.data.ock.zadani.oplechOstatniHod = 5.4; v.data.ock.zadani.projekceZakladHod = 50.5; }));
  test('5,4 h → 5 h, 50,5 h → 51 h; součet ze zaokrouhlených',
    (radek(h, 'dílna — oplechování (práce)') || [])[1] === '29 h (24 + 5)' && (radek(h, 'projekce / konstrukce') || [])[1] === '51 h'
    && (radek(h, 'celkem') || [])[1] === '258 h', h.radky);
}

/* ---- vyřazená / uzamčená strana zakázky (P6): její list tabulku nemá ---- */
{
  const zOpr = zakazka((z) => { z.cislo = '2026 - OPR - CN - 9160'; });
  test('číslo OPR (PROJ vyřazená): list PROJ bez tabulky hodin', tabP(zOpr) === null, tabP(zOpr));
  test('číslo OPR: list OCK má své hodiny', (radek(tab(zOpr), 'celkem') || [])[1] === '257 h');
  const zOvp = zakazka((z) => { z.cislo = '2026 - OVP - CN - 9161'; });
  test('číslo OVP (OCK vyřazená): list OCK bez tabulky hodin', tab(zOvp) === null, tab(zOvp));
  test('číslo OVP: list PROJ má své hodiny', (radek(tabP(zOvp), 'celkem') || [])[1] === '146 h');
  const zJP = zakazka((z) => { z.jenProj = true; }), zJO = zakazka((z) => { z.jenOck = true; });
  test('jenProj: list OCK bez tabulky, list PROJ s ní', tab(zJP) === null && !!tabP(zJP));
  test('jenOck: list PROJ bez tabulky, list OCK s ní', tabP(zJO) === null && !!tab(zJO));
  const boOcK = K.kryciData(zOvp, zOvp.varianty[0], JEKLY, 'bo'), boPr = KP.kryciProjData(zOpr, zOpr.varianty[0], JEKLY, 'bo');
  test('krycí list OCK (BO) vyřazené strany: sekce hodin vůbec není', !boOcK.sekce.some(s => s.sekce === 'Hodiny z kalkulace'));
  test('krycí list PROJ (BO) vyřazené strany: sekce hodin vůbec není', !boPr.sekce.some(s => s.sekce === 'Hodiny z kalkulace'));
}

/* ---- krycí listy: jen verze BO, poslední sekce, každý list svou stranu ---- */
{
  const zak = zakazka(), v = zak.varianty[0];
  const bo = K.kryciData(zak, v, JEKLY, 'bo'), td = K.kryciData(zak, v, JEKLY, 'techdata');
  const posl = bo.sekce[bo.sekce.length - 1];
  test('krycí list OCK (BO): poslední sekce „Hodiny z kalkulace", jen sloupec OCK', posl.sekce === 'Hodiny z kalkulace'
    && JSON.stringify(posl.sloupce) === JSON.stringify(['', 'OCK']) && JSON.stringify(posl.radky) === JSON.stringify(tab(zak).radky), posl.sloupce);
  test('krycí list OCK (Techdata): hodiny nejsou', !td.sekce.some(s => s.sekce === 'Hodiny z kalkulace'));
  const pbo = KP.kryciProjData(zak, v, JEKLY, 'bo'), ptd = KP.kryciProjData(zak, v, JEKLY, 'techdata');
  const pposl = pbo.sekce[pbo.sekce.length - 1];
  test('krycí list PROJ (BO): poslední sekce jen se sloupcem PROJ a hodinami PROJ', pposl.sekce === 'Hodiny z kalkulace'
    && JSON.stringify(pposl.sloupce) === JSON.stringify(['', 'PROJ']) && JSON.stringify(pposl.radky) === JSON.stringify(tabP(zak).radky)
    && !radek(pposl, 'montáž na stavbě'), pposl.sloupce);
  test('krycí list PROJ (Techdata): hodiny nejsou', !ptd.sekce.some(s => s.sekce === 'Hodiny z kalkulace'));
  /* Word: tabulka se dvěma sloupci, záhlaví OCK (bez PROJ), platné XML */
  const tabulkaHodin = (d) => { const xml = dg.docxTeloZeSekci(d.nadpis, d.sekce); const i = xml.indexOf('Hodiny z kalkulace');
    return { xml, i, tbl: xml.slice(xml.lastIndexOf('<w:tbl>', i), xml.indexOf('</w:tbl>', i)) }; };
  const { xml, i, tbl } = tabulkaHodin(bo);
  test('Word OCK: tabulka hodin má dva sloupce a záhlaví OCK, PROJ v ní není',
    (tbl.match(/<w:gridCol /g) || []).length === 2 && /<w:gridSpan w:val="2"\/>/.test(tbl) && />OCK</.test(tbl) && !/>PROJ</.test(tbl)
    && tbl.indexOf('128 h (4 os. × 32 h)') > 0 && tbl.indexOf('>celkem<') > 0, (tbl.match(/<w:gridCol /g) || []).length);
  test('Word OCK: XML krycího listu bez vad', !dg.xmlStrukturaVada('<w:document><w:body>' + xml + '</w:body></w:document>'));
  test('Word: dvousloupcové sekce beze změny', (xml.slice(0, xml.lastIndexOf('<w:tbl>', i)).match(/<w:tblGrid>/g) || []).length
    === (xml.slice(0, xml.lastIndexOf('<w:tbl>', i)).match(/<w:tblGrid><w:gridCol w:w="3400"\/><w:gridCol w:w="5600"\/><\/w:tblGrid>/g) || []).length);
  const wp = tabulkaHodin(pbo);
  test('Word PROJ: tabulka hodin se záhlavím PROJ, bez OCK a bez montáže',
    />PROJ</.test(wp.tbl) && !/>OCK</.test(wp.tbl) && wp.tbl.indexOf('28 h (Studie 24 + Konzultace 4)') > 0 && wp.tbl.indexOf('montáž') < 0
    && !dg.xmlStrukturaVada('<w:document><w:body>' + wp.xml + '</w:body></w:document>'));
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
