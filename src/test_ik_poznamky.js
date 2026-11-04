/* IK — INTERNÍ POZNÁMKY K ZAKÁZCE NA KRYCÍM LISTU OCK A PROJ
 * (rozhodnutí J. V. 4. 11. 2026, roadmapa #560).
 *
 * Žádná nová sekce: TOTÉŽ pole jako karta „Interní poznámky k zakázce“
 * v Kalkulaci (ZAK.poznamkyText) se na krycím listu OCK i PROJ ukáže jako
 * první sekce se stejným nadpisem a tiskne se do verze Backoffice i Techdata
 * (PDF i Word). Prázdné se netiskne. Nikam jinam (CN, SoD, plná moc,
 * specifikace, Pipedrive, controlling). Platí pro zakázku (všechny varianty,
 * OCK i PROJ); doplňovat jde vždy, i po CN, SoD a Prodáno. Píše každý, kdo
 * smí upravovat zakázku; kdo jen čte, má pole jen ke čtení.
 *
 * Serverovou stranu (uložení po CN/SoD/Prodáno, 403 pro čtenáře) hlídá
 * netlify/test_ik_poznamky.mjs, obrazovku overit_ik_poznamky.mjs.
 *
 * Pojistka proti prázdnému testu: nad 6109e39 selže (poznamkyKryciSekce,
 * kryciVystupSekce ani poznamkySmiPsat neexistují; docx bez sekce).
 *
 * Spuštění: cd src && node test_ik_poznamky.js */
const fs = require('fs');
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
const NBP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
const zam = nacti('./zamek.js');
const PZ = nacti('./poznamky.js');
const K = nacti('./kryci.js');
const KP = nacti('./kryci_proj.js');
const NB = nacti('./nabidka.js');
const SOD = nacti('./sod.js');
const TS = require('./techspec.js');
const PDN = nacti('./pd_nanecisto.js');
const OBJ = nacti('./objednane.js');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
global.NAST = { firma: global.firmaDefault() };

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };

test('poznamky.js exportuje poznamkyKryciSekce, poznamkySmiPsat a POZN_NADPIS',
  typeof PZ.poznamkyKryciSekce === 'function' && typeof PZ.poznamkySmiPsat === 'function' && PZ.POZN_NADPIS === 'Interní poznámky k zakázce');
test('kryci.js exportuje kryciVystupSekce', typeof K.kryciVystupSekce === 'function');
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const TEXT = 'Rozhoduje p. Ukázkový.\nNa stavbě jen dopoledne — IK-4711.';
const zakazka = (text) => {
  const z = zk.novaZakazka();
  z.cislo = ''; z.nazevAkce = 'IK test';
  const v = z.varianty[0];
  v.data.proj.cenik = ZC.zkusebniCenikProj();
  Object.assign(v.data.ock.zadani, { prejezd: 3.2, zdvih: 9, prohluben: 1.2, sirka: 1.6, hloubka: 1.8, nastupiste: 4 });
  if (text != null) PZ.poznamkyTextNastav(z, text);
  return z;
};

/* ---------- 1) pole a nadpis ---------- */
{
  const z = zakazka(TEXT);
  const s = PZ.poznamkyKryciSekce(z);
  test('sekce nese přesně nadpis karty v Kalkulaci', s && s.sekce === 'Interní poznámky k zakázce', s);
  test('…a text pole beze změny (i zalomení)', s && s.text === TEXT, s);
  test('prázdné pole → žádná sekce', PZ.poznamkyKryciSekce(zakazka('')) === null);
  test('jen mezery a zalomení → žádná sekce', PZ.poznamkyKryciSekce(zakazka('  \n \t ')) === null);
  test('zakázka bez pole → žádná sekce', PZ.poznamkyKryciSekce(zakazka(null)) === null);
  /* Starší zakázka: pole ukazuje text složený ze strukturovaných poznámek —
   * krycí list tiskne totéž, co uživatel vidí. */
  const st = zakazka(null);
  PZ.poznamkyPridej(st, 'Stará věta IK.', { kdo: 'Test' });
  const ss = PZ.poznamkyKryciSekce(st);
  test('starší strukturované poznámky se tisknou tak, jak je pole ukazuje', ss && /Stará věta IK\./.test(ss.text), ss);
}

/* ---------- 2) sdílení: jedno pole, žádná kopie ---------- */
{
  const z = zakazka('první');
  const a = K.kryciVystupSekce(z, []);
  PZ.poznamkyTextNastav(z, 'druhé');           // zápis v Kalkulaci
  const b = K.kryciVystupSekce(z, []);
  test('zápis v poli je hned na krycím listu (žádná kopie)', a[0].text === 'první' && b[0].text === 'druhé', [a, b]);
  test('krycí list nic do variant neukládá', z.varianty.every(v => JSON.stringify(v.data).indexOf('druhé') < 0));
  /* Platnost zakázka: všechny varianty a OCK i PROJ čtou totéž. */
  zam.klonujVariantu(z, z.varianty[0].id);
  const v2 = z.varianty[1];
  test('klon varianty: krycí list druhé varianty nese totéž', K.kryciVystupSekce(z, K.kryciData(z, v2, JEKLY, 'bo').sekce)[0].text === 'druhé');
  test('…a pole se klonem nezdvojí do variant', z.varianty.every(v => v.poznamkyText === undefined && v.data.poznamkyText === undefined));
}

/* ---------- 3) první sekce v obou verzích OCK i PROJ, PDF i Word ---------- */
for (const [list, data, prvni] of [['OCK', K.kryciData, 'Základní údaje'], ['PROJ', KP.kryciProjData, 'Základní údaje']]) {
  for (const verze of ['bo', 'techdata']) {
    const z = zakazka(TEXT);
    const d = data(z, z.varianty[0], JEKLY, verze);
    const vyst = K.kryciVystupSekce(z, d.sekce);
    test(`${list} ${verze}: první sekce výstupu jsou interní poznámky`, vyst[0].sekce === 'Interní poznámky k zakázce' && vyst[1].sekce === prvni,
      vyst.slice(0, 2).map(s => s.sekce));
    const xml = dg.docxTeloZeSekci(d.nadpis, vyst);
    const iP = xml.indexOf('Interní poznámky k zakázce'), iZ = xml.indexOf('>' + prvni + '<');
    test(`${list} ${verze}: Word nese nadpis nad „${prvni}"`, iP > 0 && iZ > iP, [iP, iZ]);
    test(`${list} ${verze}: Word nese text i se zalomením řádku`,
      xml.indexOf('Rozhoduje p. Ukázkový.</w:t><w:br/><w:t xml:space="preserve">Na stavbě jen dopoledne — IK-4711.') > iP,
      xml.slice(iP, iP + 900));
    /* Prázdné pole se netiskne. */
    const zp = zakazka('');
    const dp = data(zp, zp.varianty[0], JEKLY, verze);
    const vp = K.kryciVystupSekce(zp, dp.sekce);
    test(`${list} ${verze}: prázdné pole → sekce chybí`, vp[0].sekce === prvni && dg.docxTeloZeSekci(dp.nadpis, vp).indexOf('Interní poznámky') < 0);
  }
}
{
  /* Registrace Wordu (dokumentRegistruj) je jen v prohlížeči — zdroják ji
   * musí krmit kryciVystupSekce, jinak by Word poznámky nenesl. */
  for (const f of ['kryci.js', 'kryci_proj.js']) {
    const t = fs.readFileSync(__dirname + '/' + f, 'utf8');
    test(f + ': Word krycího listu staví z kryciVystupSekce', /docxDokumentBlob\(d\.nadpis, kryciVystupSekce\(zak, d\.sekce\)\)/.test(t));
  }
  for (const f of ['ui/kryci_ui.js', 'ui/kryci_proj_ui.js']) {
    const t = fs.readFileSync(__dirname + '/' + f, 'utf8');
    test(f + ': tisk PDF krycího listu staví z kryciVystupSekce', /kryciVystupSekce\(ZAK, d\.sekce\)/.test(t));
  }
}

/* ---------- 4) nikam jinam ---------- */
{
  const z = zakazka(TEXT);
  z.cislo = '2026 - OPR - CN - 4711'; z.objednatel = 'Ukázka s.r.o.';
  const v = z.varianty[0];
  const vystupy = {};
  const zkus = (k, f) => { try { vystupy[k] = JSON.stringify(f()); } catch (e) { vystupy[k] = 'CHYBA ' + e.message; } };
  zkus('kryciData OCK (sekce — z nich bere Pipedrive)', () => K.kryciData(z, v, JEKLY, 'bo'));
  zkus('kryciProjData', () => KP.kryciProjData(z, v, JEKLY, 'bo'));
  zkus('nabídka OCK', () => NB.nabidkaData(z, v, JEKLY, 'cz'));
  zkus('nabídka PROJ', () => NBP.nabidkaProjData ? NBP.nabidkaProjData(z, v, 'cz') : '');
  zkus('SoD', () => SOD.sodData(z, v, JEKLY, 'cz'));
  zkus('SoD PROJ', () => SOD.sodProjData(z, v, 'cz'));
  zkus('plná moc', () => SOD.plnaMocData(z, v));
  zkus('symboly SoD z krycího listu', () => K.kryciSodSymboly(z, v, JEKLY, {}));
  zkus('specifikace', () => v.data.techspec);
  zkus('Pipedrive nanečisto', () => PDN.pdnPodklad(z, JEKLY, {}));
  zkus('Pipedrive OCK', () => PDN.pdnStranaOck(z, v, JEKLY));
  zkus('Pipedrive PROJ', () => PDN.pdnStranaProj(z, v));
  zkus('zápis Prodáno do Pipedrive', () => OBJ.prodPdZapis(z, v, JEKLY));
  for (const [k, t] of Object.entries(vystupy)) {
    test(k + ': poznámka se nedostane', t.length > 20 && !/CHYBA/.test(t.slice(0, 6)) && t.indexOf('IK-4711') < 0, t.slice(0, 160));
  }
  /* Pole není v sekcích krycích listů — z nich čte Pipedrive (pdnPopisky,
   * mapa polí #115/#553) i zámek (Z1, ZAMEK_KRYCI_PO_CN). */
  const vse = K.KRYCI_SEKCE.concat(KP.KRYCI_PROJ_SEKCE);
  test('KRYCI_SEKCE ani KRYCI_PROJ_SEKCE pole nenesou',
    !vse.some(s => s.sekce === PZ.POZN_NADPIS || (s.pole || []).some(p => /pozn/i.test(String(p.id || '') + String(p.bind || '')))));
  test('…a mapa polí Pipedrive ho nenabízí', JSON.stringify(PDN.pdnPopisky(K.KRYCI_SEKCE, 'x')).indexOf('Interní poznámky') < 0
    && JSON.stringify(PDN.pdnPopisky(KP.KRYCI_PROJ_SEKCE, 'x')).indexOf('Interní poznámky') < 0);
}
{
  /* Zdrojáky generátorů, které pole nesmí znát (vzor test_poznamky.js):
   * kdyby někdo do šablony nabídky přidal ZAK.poznamkyText, test výš by to
   * chytil jen s vyplněným polem. */
  const ZAKAZ = ['src/nabidka.js', 'src/nabidka_proj.js', 'src/sod.js', 'src/techspec.js', 'src/pd_nanecisto.js',
    'src/controlling.js', 'src/objednane.js', 'src/dokumenty.js', 'src/docxgen.js',
    'netlify/functions/controlling_export.mjs', 'netlify/lib/pd_prevod.mjs', 'netlify/lib/pd_mapa.mjs', 'netlify/lib/pd_webhook.mjs'];
  const hrisnici = ZAKAZ.filter(f => /poznamky(Text|PoleText|KryciSekce)?\b|POZN_|kryciVystupSekce/.test(fs.readFileSync(__dirname + '/../' + f, 'utf8')));
  test('generátory CN, SoD, plné moci, specifikace, Pipedrive a controllingu o poli nevědí', hrisnici.length === 0, hrisnici);
  /* Krycí list zná JEN poznamkyKryciSekce (přes kryciVystupSekce). */
  for (const f of ['kryci.js', 'kryci_proj.js']) {
    const t = fs.readFileSync(__dirname + '/' + f, 'utf8')
      .replace(/poznamkyKryciSekce/g, '').replace(/require\('\.\/poznamky\.js'\)/g, '');
    test(f + ': o poznámkách ví jen přes poznamkyKryciSekce', !/poznamky|POZN_/.test(t));
  }
  const objZdroj = fs.readFileSync(__dirname + '/objednane.js', 'utf8');
  test('prodPdZapis bere z krycích listů jen sekce (kryciData), ne výstup tisku',
    /kryciData\(zak, v, jekly, 'bo'\)/.test(objZdroj) && !/kryciVystupSekce/.test(objZdroj));
}

/* ---------- 5) doplňování vždy: zámky pole neblokují ---------- */
{
  const z = zakazka('před CN');
  z.cislo = '2026 - OPR - CN - 4712';
  const v = z.varianty[0];
  zam.zamkniVariantu(v, { typ: 'nabidkaTisk', kdy: new Date().toISOString(), kdo: 'Test', cislo: zam.variantaCislo(z, v),
    vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-ik') });
  const stara = JSON.parse(JSON.stringify(z));
  PZ.poznamkyTextNastav(z, 'po CN');
  test('po CN: hlavička Z1 změnu poznámek nehlásí', zam.zamekZakZmeny(stara, z).length === 0, zam.zamekZakZmeny(stara, z));
  test('po CN: data zamčené varianty se nezměnila (#555)', zam.zamekDataPorovnani(v.data, stara.varianty[0]) === zam.zamekDataPorovnani(stara.varianty[0].data, stara.varianty[0]));
  test('po CN: změna poznámek je jediná změna zápisníku (autosave i v režimu čtení)', PZ.poznamkyJedinaZmena(z, stara));
  zam.zamkniVariantu(v, { typ: 'sod', kdy: new Date().toISOString(), kdo: 'Test', cislo: zam.variantaCislo(z, v) });
  v.prodano = { datum: '2026-11-04', kdo: 'x', kdy: new Date().toISOString() };
  const stara2 = JSON.parse(JSON.stringify(z));
  PZ.poznamkyTextNastav(z, 'po SoD a Prodáno');
  test('po SoD a Prodáno: hlavička Z1 změnu poznámek nehlásí', zam.zamekZakZmeny(stara2, z).length === 0, zam.zamekZakZmeny(stara2, z));
  test('po SoD a Prodáno: pořád jediná změna zápisníku', PZ.poznamkyJedinaZmena(z, stara2));
}

/* ---------- 6) kdo píše ---------- */
{
  const z = zakazka('x'); z.autor = 'autor@priklad.cz';
  const smi = (ja) => PZ.poznamkySmiPsat(z, ja);
  test('autor smí', smi({ email: 'Autor@priklad.cz', role: 'Obchodník' }));
  test('vedoucí smí', smi({ email: 'ved@priklad.cz', role: 'Vedoucí' }));
  test('administrátor smí', smi({ email: 'adm@priklad.cz', role: 'Administrátor' }));
  test('cizí obchodník jen čte', !smi({ email: 'cizi@priklad.cz', role: 'Obchodník' }));
  test('bez přihlášení (offline) smí', smi(null));
  const bez = zakazka('x');
  test('zakázka bez autora: smí každý přihlášený', PZ.poznamkySmiPsat(bez, { email: 'cizi@priklad.cz', role: 'Obchodník' }));
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
