/* CONTROLLING (#447, dávka C1) — nákladové skupiny a rozvrh předkalkulace.
 *
 * Hlídá:
 *   1. ÚPLNOST — každý klíč ceníku OCK i PROJ (CENIK_DEF, CENIK_DEF_PROJ,
 *      CENIK_STARI_EXTRA) a každá `cenaPath` / `cenaSkupina` z jádra má
 *      ve výchozím mapování skupinu nebo značku „není náklad". Nová položka
 *      ceníku bez zařazení shodí tuhle sadu dřív, než se dostane k Andy.
 *   2. SOUČTY — rozvrh výsledku do skupin nic neztratí ani nezdvojí:
 *      náklad řádků základní ceny = souhrn.zakladNaklad, příplatky zvlášť,
 *      PROJ = náklad + doprava.
 *   3. ZÁZNAM — kontrola a verze uloženého číselníku a mapování (server
 *      ho zapisuje touž funkcí, obnova čistí touž očistou).
 * Ceník v testu je SMYŠLENÝ (vyplněný pořadovými čísly) — skutečné ceny do
 * repozitáře nepatří a nulový ceník by součty neověřil. */
const fs = require('fs');
const path = require('path');
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
nacti('./cenik.js');
nacti('./cenik_stari.js');
const eng = nacti('./engine.js');
const ep = nacti('./engine_proj.js');
const C = nacti('./controlling.js');
const JEKLY = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));
const blizko = (a, b) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));

/* ---------- 1. úplnost mapování ---------- */
const ids = new Set(C.CTRL_SKUPINY_VYCHOZI.map(s => s.id));
const mapa = C.CTRL_MAPA_VYCHOZI;
const kliceCeniku = C.ctrlKliceCeniku();
test('klíčů ceníku k zařazení je víc než 100 (OCK + PROJ + zakázkové)', kliceCeniku.length > 100, kliceCeniku.length);
const chybi = kliceCeniku.filter(k => !Object.prototype.hasOwnProperty.call(mapa, k));
test('každý klíč ceníku má ve výchozím mapování skupinu nebo „není náklad"', chybi.length === 0, chybi);
const spatne = Object.keys(mapa).filter(k => mapa[k] !== C.CTRL_NENI_NAKLAD && !ids.has(mapa[k]));
test('výchozí mapování ukazuje jen na skupiny z číselníku', spatne.length === 0, spatne);

const jadro = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8');
const cesty = [...jadro.matchAll(/cenaPath:\s*'([^']+)'/g)].map(m => m[1])
  .concat([...jadro.matchAll(/cenaSkupina:\s*'([^']+)'/g)].map(m => m[1]))
  .filter((k, i, a) => a.indexOf(k) === i);
test('jádro vydává klíče řádků (cenaPath / cenaSkupina)', cesty.length > 40, cesty.length);
const cestyBez = cesty.filter(k => !Object.prototype.hasOwnProperty.call(mapa, k));
test('každý klíč řádku z jádra je zařazený', cestyBez.length === 0, cestyBez);
const cestyNeNaklad = cesty.filter(k => mapa[k] === C.CTRL_NENI_NAKLAD);
test('klíč, který v jádře nese řádek nákladu, není označený „není náklad"', cestyNeNaklad.length === 0, cestyNeNaklad);
test('jádro pořád vydává řádek přirážky za ATYP pod názvem, podle kterého ho controlling pozná',
  jadro.includes("'" + C.CTRL_NAZEV_ATYP_PRIRAZKA + "'"));
['R.rezervaZaklad', 'R.rezervaPriplatky', 'R.atypPrirazka', 'Z.zamecnikAtypKc', 'PC.doprava',
 'V.hrubaOck', 'V.oplasteni', 'V.volitelne', 'V.rezie', 'V.atyp', 'V.priplatky', 'V.spojovaci', 'V.lakovani', 'V.proj']
  .forEach(k => test('pseudo-klíč ' + k + ' má skupinu', ids.has(mapa[k]), mapa[k]));
test('rozhodnutí J. V.: Režie kanceláře = kalkulační příspěvek (nepřímý, fixní)',
  mapa['C.rezieKancelareKc'] === 'rezie-prispevek'
  && C.CTRL_SKUPINY_VYCHOZI.find(s => s.id === 'rezie-prispevek').typ === 'neprimy');
test('rozhodnutí J. V.: rezervy samostatně, přirážka ATYP do projekce, můstek k zámečníkům, tmelení stavební práce',
  mapa['R.rezervaZaklad'] === 'rezerva' && mapa['R.atypPrirazka'] === 'sl-projekce'
  && mapa['C.mustekKc'] === 'sl-zamecnici' && mapa['C.tmeleniKc'] === 'sl-stavebni');
test('skupina „Režie výroba" se nezakládá (J2)', !C.CTRL_SKUPINY_VYCHOZI.some(s => /v[ýy]rob/i.test(s.nazev) && /re[žz]ie/i.test(s.nazev)));

/* ---------- 2. rozvrh výsledku ---------- */
/* Smyšlený ceník: každé číslo dostane jinou hodnotu, aby záměna řádků byla vidět. */
function smyslenyCenik() {
  const c = kopie(eng.DEFAULT_CENIK);
  let i = 7;
  const projdi = (o) => Object.keys(o).forEach(k => {
    if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) projdi(o[k]);
    else if (typeof o[k] === 'number' || o[k] === null) o[k] = 10 + (i++ % 97) * 3;
  });
  projdi(c);
  c.marze = 0.3; c.dph = 0.21; c.atypPrirazka = 0.1;
  c.atypMontazPct = 0.3; c.atypProjekcePct = 0.5; c.atypRezervaZakladPct = 0.1; c.atypRezervaPriplatkyPct = 0.2;
  delete c.ukazkove; delete c.prazdny;
  return c;
}
const CEN = smyslenyCenik();
const varianty = [
  ['interiér, výchozí zadání', z => z],
  ['exteriér', z => { z.typSachty = 'ext'; return z; }],
  ['interiér s ATYP a rezervami', z => { z.atyp = true; z.rezervaZakladPct = 0.1; z.rezervaPriplatkyPct = 0.2; z.zamecnikAtypKc = 12345; return z; }],
  ['exteriér, všechna volitelná, ruční položka', z => { z.typSachty = 'ext';
    Object.keys(z.volitelne).forEach(k => { z.volitelne[k] = true; });
    z.vlastniPolozky = Object.assign({}, z.vlastniPolozky || {}, { hrubaOck: [{ nazev: 'Ruční prvek', mnozstvi: 2, cena: 500 }] });
    return z; }],
];
for (const [jm, uprav] of varianty) {
  for (const fixes of [true, false]) {
    const z = uprav(kopie(eng.DEFAULT_ZADANI));
    let v;
    try { v = eng.vypocet(z, kopie(CEN), JEKLY, fixes); } catch (e) { test(jm + ': výpočet proběhl', false, e.message); continue; }
    const radky = C.ctrlRozvrhOck(v, { fixes, rezervaPriplatkyPct: z.rezervaPriplatkyPct, marze: CEN.marze });
    const zaklad = radky.filter(r => r.vZakladu).reduce((a, r) => a + r.naklad, 0);
    const m = fixes ? 'Model 2' : 'Model 1';
    test(jm + ' (' + m + '): náklad řádků základní ceny = souhrn.zakladNaklad',
      blizko(zaklad, v.souhrn.zakladNaklad) && zaklad > 0, { zaklad, souhrn: v.souhrn.zakladNaklad });
    const prip = radky.filter(r => !r.vZakladu && r.klic !== 'R.rezervaPriplatky').reduce((a, r) => a + r.naklad, 0);
    const pripV = (v.priplatky || []).reduce((a, r) => a + r.naklad, 0);
    test(jm + ' (' + m + '): náklad příplatků se přenese celý', blizko(prip, pripV), { prip, pripV });
    const nez = radky.filter(r => r.skupina === C.CTRL_NEZARAZENO);
    test(jm + ' (' + m + '): žádný řádek nepadl do Nezařazeno', nez.length === 0, nez.map(r => r.nazev + ' ' + r.klic));
    test(jm + ' (' + m + '): každý řádek má skupinu z číselníku', radky.every(r => ids.has(r.skupina)));
    const kap = C.ctrlKapitoly(radky, { jenZaklad: true });
    test(jm + ' (' + m + '): součet kapitol = náklad základní ceny',
      blizko(kap.reduce((a, k) => a + k.naklad, 0), v.souhrn.zakladNaklad));
    if (z.atyp) {
      test(jm + ' (' + m + '): řádek přirážky ATYP je rozpoznaný a v projekci',
        radky.some(r => r.klic === 'R.atypPrirazka' && r.skupina === 'sl-projekce' && r.naklad > 0));
      test(jm + ' (' + m + '): rezerva základu je ve skupině Rezerva',
        radky.some(r => r.klic === 'R.rezervaZaklad' && r.skupina === 'rezerva' && blizko(r.naklad, v.rezerva.naklad)));
      const pripRez = radky.find(r => r.klic === 'R.rezervaPriplatky');
      const ocekavano = (v.priplatky || []).reduce((a, r) => a + (fixes ? r.naklad : r.sMarzi), 0) * z.rezervaPriplatkyPct;
      test(jm + ' (' + m + '): rezerva příplatků odpovídá jádru (Model 1 ze ceny, Model 2 z nákladu)',
        !!pripRez && blizko(pripRez.naklad, ocekavano), { pripRez, ocekavano });
    }
    if (/ruční/.test(jm))
      test(jm + ' (' + m + '): ruční řádek jde pod výchozí skupinu sekce (V.hrubaOck)',
        radky.some(r => r.klic === 'V.hrubaOck' && r.vlastni && r.skupina === mapa['V.hrubaOck']));
  }
}
/* Ruční přepis ceny ani název řádku zařazení nemění — rozhoduje klíč. */
{
  const z = kopie(eng.DEFAULT_ZADANI);
  z.nazvyPrepis = { 'INTERNÍ TRANSPORT': 'DOPRAVA NA STAVBU' };
  const v = eng.vypocet(z, kopie(CEN), JEKLY, true);
  const r = C.ctrlRozvrhOck(v).find(x => x.klic === 'C.transportKc');
  test('přejmenovaný řádek se zařadí podle klíče, ne názvu', !!r && r.skupina === 'sl-dopravne', r);
}

/* PROJ */
{
  const cp = kopie(ep.DEFAULT_CENIK_PROJ);
  cp.marze = 0.3; cp.dopravaKmKc = 12; cp.dopravaHodKc = 1000;
  Object.keys(cp.sazby || {}).forEach((k, i) => { cp.sazby[k] = 500 + i * 100; });
  Object.keys(cp.fixy || {}).forEach((k, i) => { cp.fixy[k] = 1000 + i * 250; });
  const zp = kopie(ep.DEFAULT_ZADANI_PROJ);
  (zp.sekce || []).forEach((s, i) => { s.doprava = { km: 30 + i, mimoPrahu: i % 2 === 0, pausal: 0 };
    (s.polozky || []).forEach(p => { if (p.typ === 'hod') p.hodiny = (+p.hodiny || 0) + 3; }); });
  const v = ep.vypocetProj(zp, cp);
  const radky = C.ctrlRozvrhProj(v);
  const n = radky.reduce((a, r) => a + r.naklad, 0);
  test('PROJ: náklad řádků = náklad + doprava ze souhrnu', blizko(n, v.souhrn.naklad + v.souhrn.doprava) && n > 0,
    { n, naklad: v.souhrn.naklad, doprava: v.souhrn.doprava });
  test('PROJ: prodejní cena řádků = cena ze souhrnu', blizko(radky.reduce((a, r) => a + r.prodej, 0), v.souhrn.cena));
  test('PROJ: hodinové položky jdou do vlastní práce, doprava do cestovného',
    radky.some(r => r.klic.startsWith('PC.sazby.') && r.skupina === 'proj-prace')
    && radky.some(r => r.klic === 'PC.doprava' && r.skupina === 'cestovne'));
  const nez = radky.filter(r => r.skupina === C.CTRL_NEZARAZENO);
  test('PROJ: výchozí zadání nemá nic v Nezařazeno', nez.length === 0, nez.map(r => r.klic));
  /* Výjezd technika u akce mimo Prahu (D2): přičítá se k ceně sekce po přirážce. */
  if (typeof ep.vyjezdTechnikaKc === 'function') {
    cp.vyjezdTechnikKc = 2500;
    const zv = kopie(zp); zv.akceMimoPrahu = true;
    const vv = ep.vypocetProj(zv, cp);
    const rv = C.ctrlRozvrhProj(vv);
    test('PROJ s výjezdem technika: výjezd se v souhrnu opravdu počítá', vv.souhrn.vyjezd > 0, vv.souhrn);
    test('PROJ s výjezdem technika: náklad řádků = náklad + doprava + výjezd',
      blizko(rv.reduce((a, r) => a + r.naklad, 0), vv.souhrn.naklad + vv.souhrn.doprava + vv.souhrn.vyjezd));
    test('PROJ s výjezdem technika: prodej řádků = celková cena', blizko(rv.reduce((a, r) => a + r.prodej, 0), vv.souhrn.celkem));
    test('PROJ s výjezdem technika: řádek výjezdu je v cestovném',
      rv.some(r => r.klic === 'PC.vyjezdTechnikKc' && r.skupina === 'cestovne'));
  }
}

/* ---------- 3. platné mapování, nezařazené, záznam ---------- */
{
  const d = C.ctrlVychozi();
  d.mapa['C.transportKc'] = 'cestovne';
  delete d.mapa['C.cestovniKc'];
  const P = C.ctrlPlatne(d);
  test('uložená odchylka platí přes výchozí mapování', P.mapa['C.transportKc'] === 'cestovne');
  test('klíč, který uložený záznam nezná, dostane výchozí skupinu z kódu', P.mapa['C.cestovniKc'] === 'cestovne');
  const d2 = C.ctrlVychozi();
  d2.skupiny = d2.skupiny.filter(s => s.id !== 'sl-leseni');
  test('mapování na zrušenou skupinu padá do Nezařazeno', C.ctrlPlatne(d2).mapa['C.leseniFix'] === C.CTRL_NEZARAZENO);
  const kid = C.ctrlKliceKatalogu({ hrubaOck: [{ kid: 'k7', nazev: 'X' }] }, { vlastniPolozky: { dps: [{ kid: 'pk2' }] } });
  test('klíče trvalých položek katalogu OCK i PROJ', JSON.stringify(kid) === '["K.k7","K.pk2"]', kid);
  /* Skutečný tvar katalogu (src/katalog.js): sekce pod `polozky`. Nalezeno
   * harnessem overit_controlling.mjs — holý objekt sekcí v testu chybu skryl. */
  const kat = require('./katalog.js').katalogPrazdny(); kat.polozky.atyp.push({ kid: 'k8', nazev: 'Atyp X' });
  test('klíče a názvy trvalých položek ze skutečného tvaru katalogu',
    JSON.stringify(C.ctrlKliceKatalogu(kat, null)) === '["K.k8"]' && C.ctrlKatalogNazvy(kat, null)['K.k8'] === 'Atyp X');
  const nez = C.ctrlNezarazene(null, C.ctrlKliceCeniku().concat(kid));
  test('nezařazené = jen trvalé položky bez vlastního zařazení (J5)', JSON.stringify(nez) === '["K.k7","K.pk2"]', nez);
  const d3 = C.ctrlVychozi(); d3.mapa['K.k7'] = 'mat-ostatni';
  test('po zařazení trvalá položka z nezařazených zmizí', JSON.stringify(C.ctrlNezarazene(d3, ['K.k7', 'K.pk2'])) === '["K.pk2"]');
  test('trvalá položka bez zařazení se v rozvrhu přidrží výchozí skupiny své sekce',
    JSON.stringify(C.ctrlSkupinaKlice(C.ctrlPlatne(null).mapa, 'K.k9', 'atyp')) === JSON.stringify({ skupina: 'sl-zamecnici', zarazeno: false }));
}
{
  const ok1 = C.ctrlDataKontrola(C.ctrlVychozi());
  test('výchozí číselník a mapování projdou kontrolou zápisu', ok1.ok, ok1.chyba);
  const zle = (jm, f) => { const d = C.ctrlVychozi(); f(d); const k = C.ctrlDataKontrola(d); test('kontrola odmítne: ' + jm, !k.ok, k); };
  zle('klíč __proto__', d => { d.mapa = JSON.parse('{"__proto__":"cestovne"}'); });
  zle('klíč hasOwnProperty', d => { d.mapa.hasOwnProperty = 'cestovne'; });
  zle('klíč s mezerou', d => { d.mapa['C.a b'] = 'cestovne'; });
  zle('mapování na neznámou skupinu', d => { d.mapa['C.transportKc'] = 'neni-takova'; });
  zle('zrušená skupina Nezařazeno', d => { d.skupiny = d.skupiny.filter(s => s.id !== 'nezarazeno'); });
  zle('dvakrát stejné id skupiny', d => { d.skupiny.push(Object.assign({}, d.skupiny[0])); });
  zle('id skupiny „x"', d => { d.skupiny[0].id = 'x'; });
  zle('id skupiny s velkými písmeny', d => { d.skupiny[0].id = 'Cestovne'; });
  zle('prázdný název skupiny', d => { d.skupiny[0].nazev = '  '; });
  zle('řídicí znak v názvu', d => { d.skupiny[0].nazev = 'A\u0007B'; });
  zle('neznámý typ nákladu', d => { d.skupiny[0].typ = 'jiny'; });
  zle('neznámé chování', d => { d.skupiny[0].chovani = 'smisene'; });
  zle('účet jako číslo, ne text', d => { d.skupiny[0].ucetNyni = [512001]; });
  zle('účet s mezerou', d => { d.skupiny[0].ucetNyni = ['512 001']; });
  zle('mapování jako pole', d => { d.mapa = []; });
  zle('prázdný číselník', d => { d.skupiny = []; });
  test('kontrola odmítne i null a pole', !C.ctrlDataKontrola(null).ok && !C.ctrlDataKontrola([]).ok);

  const v1 = C.ctrlDbNovaVerze(null, { data: C.ctrlVychozi(), kdo: 'admin@example.com', poznamka: 'první' });
  test('první zápis = verze 1 bez historie', v1.platny.verze === 1 && v1.historie.length === 0);
  const d2 = C.ctrlVychozi(); d2.mapa['C.transportKc'] = 'cestovne';
  test('stejná data = beze změny, změněná ne', C.ctrlBezeZmeny(v1, C.ctrlVychozi()) && !C.ctrlBezeZmeny(v1, d2));
  const v2 = C.ctrlDbNovaVerze(v1, { data: d2, kdo: 'admin@example.com' });
  test('druhý zápis = verze 2, předchozí v historii s platnoDo',
    v2.platny.verze === 2 && v2.historie.length === 1 && v2.historie[0].verze === 1 && !!v2.historie[0].platnoDo);
  let hodila = false; try { C.ctrlDbNovaVerze(v2, { data: { skupiny: [] } }); } catch (e) { hodila = true; }
  test('nová verze s vadnými daty se nezapíše (výjimka)', hodila);

  const o1 = C.ctrlDbOciste(v2);
  test('očista platného záznamu ho nezmění', o1.ok && JSON.stringify(o1.db) === JSON.stringify(v2), o1.chyba);
  const otr = kopie(v2); otr.platny.data.mapa['C.transportKc'] = 'neni-takova';
  test('očista odmítne záznam s vadnou platnou verzí', !C.ctrlDbOciste(otr).ok);
  const otrH = kopie(v2); otrH.historie[0].data.skupiny = [];
  const o2 = C.ctrlDbOciste(otrH);
  test('vadná starší verze z historie vypadne, platná zůstane', o2.ok && o2.db.historie.length === 0 && o2.db.platny.verze === 2);
  const otrV = kopie(v2); otrV.platny.verze = Infinity;
  test('verze Infinity ze zálohy neprojde', !C.ctrlDbOciste(otrV).ok);
  test('očista odmítne prázdno, pole i záznam bez platné verze',
    !C.ctrlDbOciste(null).ok && !C.ctrlDbOciste([]).ok && !C.ctrlDbOciste({ historie: [] }).ok);
}

/* ---------- 4. C2: odchylky, export varianty, CSV, mapování ---------- */
['./format.js', './techspec.js', './sleva.js', './zaokrouhleni.js', './zamek.js', './zakazka.js', './docxgen.js', './xlsx.js']
  .forEach(f => { try { nacti(f); } catch (e) { /* modul v Node nemusí jít načíst */ } });
{
  const d = C.ctrlVychozi(); d.mapa['C.transportKc'] = 'cestovne'; d.mapa['K.k7'] = 'mat-ostatni';
  const o = C.ctrlOdchylky(d);
  test('ukládají se jen odchylky mapování od výchozího', JSON.stringify(o.mapa) === JSON.stringify({ 'C.transportKc': 'cestovne', 'K.k7': 'mat-ostatni' }), o.mapa);
  test('odchylky projdou kontrolou zápisu', C.ctrlDataKontrola(o).ok);
  test('z odchylek se složí totéž platné mapování', JSON.stringify(C.ctrlPlatne(o).mapa) === JSON.stringify(C.ctrlPlatne(d).mapa));
}
test('popis klíče z ceníku nese název a jednotku', JSON.stringify(C.ctrlPopisKlice('C.transportKc')) === JSON.stringify({ nazev: 'Interní transport', oblast: 'ock', sekce: 'HRUBÁ OCK', jednotka: 'Kč/cesta' }));
test('popis pseudo-klíče i trvalé položky', /Rezerva/.test(C.ctrlPopisKlice('R.rezervaZaklad').nazev)
  && C.ctrlPopisKlice('K.k7', { 'K.k7': 'Kotva X' }).nazev === 'Kotva X' && C.ctrlPopisKlice('K.pk2').oblast === 'proj');

function zakazkaZamcena() {
  const zak = novaZakazka();
  zak.cislo = '2026 - OPR - CN - 0901'; zak.nazevAkce = 'Zkušební akce'; zak.objednatel = 'Zkušební zákazník s.r.o.'; zak.ico = '12345678';
  const v = zak.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, rezervaPriplatkyPct: 0.2 });
  v.data.cenik = kopie(CEN);
  v.data.sleva = { pct: 0 };
  zamkniVariantu(v, { cislo: variantaCislo(zak, v), kdo: 'admin@priklad.cz', typ: 'nabidka',
    vysledek: zamekVysledekSpocti(v, JEKLY, 'test') });
  return zak;
}
if (typeof novaZakazka === 'function' && typeof zamkniVariantu === 'function') {
  const zak = zakazkaZamcena();
  const v = zak.varianty[0];
  const exp = C.ctrlExportVarianty(zak, v, { jekly: JEKLY, kdo: 'admin@priklad.cz', kdy: '2026-10-20T20:00:00Z', build: 'test' });
  test('export zamčené řídící varianty projde', exp.ok, exp.chyba);
  if (exp.ok) {
    const vO = vypocetZ(v, JEKLY);
    const ock = exp.strany.find(s => s.oblast === 'ock');
    test('export nese stranu OCK s číslem nabídky', !!ock && ock.cislo === '2026 - OPR - CN - 0901', exp.strany);
    const zaklad = exp.radky.filter(r => r.oblast === 'ock' && r.vZakladu).reduce((a, r) => a + r.naklad, 0);
    test('náklad základní ceny v exportu = zmrazený souhrn', blizko(zaklad, vO.souhrn.zakladNaklad) && blizko(ock.naklad, vO.souhrn.zakladNaklad));
    test('export bere zmrazený výsledek (příznak v hlavičce)', exp.hlavicka.zmrazeno === true && exp.hlavicka.zamkl === 'admin@priklad.cz');
    test('export nese model výpočtu a řadu', exp.hlavicka.model === (v.data.ock.fixes ? 2 : 1) && exp.hlavicka.rada === 'ČR');
    /* Ceník se po zamčení změní — export musí zůstat stejný (zmrazený výsledek). */
    const pred = JSON.stringify(exp.radky);
    v.data.cenik.transportKc = 999999;
    const exp2 = C.ctrlExportVarianty(zak, v, { jekly: JEKLY });
    test('změna ceníku po zamčení export nezmění', JSON.stringify(exp2.radky) === pred);
    const listy = C.ctrlExportListy(exp);
    test('export má listy Řádky, Kapitoly, Popis', listy.map(l => l.nazev).join(',') === 'Řádky,Kapitoly,Popis');
    test('list Řádky: hlavička + jeden řádek na řádek kalkulace', listy[0].rows.length === exp.radky.length + 1
      && listy[0].rows[0].length === C.CTRL_RADKY_HLAVICKA.length && listy[0].rows.every(r => r.length === C.CTRL_RADKY_HLAVICKA.length));
    const iN = C.CTRL_RADKY_HLAVICKA.indexOf('Náklad celkem (Kč)');
    test('čísla v listu jsou čísla, ne text', listy[0].rows.slice(1).every(r => typeof r[iN] === 'number'));
    const souhrnRadek = listy[1].rows.find(r => r[0] === '2026 - OPR - CN - 0901' && r[1] === 'OCK' && typeof r[2] === 'number' && r.length === 10);
    test('list Kapitoly nese souhrn zakázky s cenou nabídky', !!souhrnRadek && souhrnRadek[7] > 0, souhrnRadek);
    const kapZaklad = listy[1].rows.filter(r => r.length === 13 && r[1] === 'OCK' && typeof r[9] === 'number').reduce((a, r) => a + r[9], 0);
    test('součet kapitol v listu = náklad základní ceny (na haléře)', Math.abs(kapZaklad - vO.souhrn.zakladNaklad) < 0.05 * 30, { kapZaklad, n: vO.souhrn.zakladNaklad });
    const csv = C.ctrlExportCsv(exp);
    test('CSV: BOM, středník, řádek na řádek kalkulace', csv.charCodeAt(0) === 0xFEFF && csv.split('\r\n').filter(Boolean).length === exp.radky.length + 1
      && csv.split('\r\n')[0].includes('";"'));
    test('CSV: desetinná čárka u čísel', /;\d+,\d+(;|\r)/.test(csv));
    const zak3 = kopie(zak); zak3.nazevAkce = '=HYPERLINK("x")';
    const csv3 = C.ctrlExportCsv(C.ctrlExportVarianty(zak3, zak3.varianty[0], { jekly: JEKLY }));
    test('CSV: text začínající „=" nejde jako vzorec', csv3.includes('"\'=HYPERLINK(""x"")"'));
    if (typeof xlsxZapis === 'function') {
      let okX = true; try { xlsxZapis(listy); } catch (e) { okX = e.message; }
      test('XLSX se ze tří listů sestaví', okX === true, okX);
    }
  }
  /* Nezamčená a neřídící varianta se nevyváží (J9). */
  const zakN = kopie(zak); zakN.varianty[0].zamek = null;
  const eN = C.ctrlExportVarianty(zakN, zakN.varianty[0], { jekly: JEKLY });
  test('nezamčená varianta se nevyváží', !eN.ok && /zamčen/.test(eN.chyba), eN);
  const zakR = kopie(zak); const v2 = kopie(zakR.varianty[0]); v2.id = 'v-dalsi'; v2.ridici = false; zakR.varianty.push(v2);
  const eR = C.ctrlExportVarianty(zakR, v2, { jekly: JEKLY });
  test('zamčená, ale neřídící varianta se nevyváží', !eR.ok && /řídící/.test(eR.chyba), eR);
} else test('modely zakázky a zámku jdou v Node načíst', false);

/* Mapování: export a zpětný import (tvar Andyiny tabulky). */
{
  const listy = C.ctrlMapaListy(null, { 'K.k7': 'Kotva' });
  test('export mapování: listy Mapování a Skupiny', listy[0].nazev === 'Mapování' && listy[1].nazev === 'Skupiny');
  const rows = listy[0].rows;
  const iK = rows[0].indexOf('Klíč'), iS = rows[0].indexOf('Skupina (id)');
  const r = rows.find(x => x[iK] === 'C.mustekKc');
  test('export mapování nese klíč a skupinu', !!r && r[iS] === 'sl-zamecnici');
  r[iS] = 'mat-ostatni';
  rows.push(['K.k7', 'Kotva', 'OCK', '', '', 'mat-ostatni']);
  rows.push(['C.zle klic', '', '', '', '', 'mat-ostatni']);
  rows.push(['C.transportKc', '', '', '', '', 'neni-takova']);
  rows.push(['hasOwnProperty', '', '', '', '', 'mat-ostatni']);
  const sk = listy[1].rows; sk[1][3] = '512001, 512009';
  const imp = C.ctrlImportZListu(listy, null);
  test('import převezme změnu skupiny i zařazení trvalé položky', imp.data.mapa['C.mustekKc'] === 'mat-ostatni' && imp.data.mapa['K.k7'] === 'mat-ostatni');
  test('import převezme účty ze Skupin', JSON.stringify(imp.data.skupiny[0].ucetNyni) === '["512001","512009"]', imp.data.skupiny[0]);
  test('import odmítne vadný klíč, prototypový klíč a neznámou skupinu (bez zápisu)', imp.chyby.length === 3
    && imp.data.mapa['C.transportKc'] === 'sl-dopravne' && !Object.prototype.hasOwnProperty.call(imp.data.mapa, 'hasOwnProperty'), imp.chyby);
  test('import vrátí seznam změn k náhledu', imp.zmeny.some(z => z.klic === 'C.mustekKc' && z.z === 'sl-zamecnici' && z.na === 'mat-ostatni'));
  test('importovaná data projdou kontrolou zápisu', C.ctrlDataKontrola(C.ctrlOdchylky(imp.data)).ok);
  test('import bez listu Mapování → chyba', C.ctrlImportZListu([{ nazev: 'Jiný', rows: [] }], null).chyby.length === 1);
}

/* ---------- 5. C3: hromadný export za období ---------- */
{
  const F = (q) => C.ctrlHromadnyFiltr(q);
  test('C3 filtr: platné období, výchozí oblast i řada = obojí',
    JSON.stringify(F({ od: '2026-10-01', do: '2026-10-31' })) === JSON.stringify({ ok: true, filtr: { od: '2026-10-01', do: '2026-10-31', oblast: 'obe', rada: 'obe' } }));
  test('C3 filtr: neplatné datum (31. 2.) odmítne', !F({ od: '2026-02-31', do: '2026-03-01' }).ok);
  test('C3 filtr: datum v jiném tvaru odmítne', !F({ od: '1. 10. 2026', do: '2026-10-31' }).ok && !F({ do: '2026-10-31' }).ok);
  test('C3 filtr: od po do odmítne', !F({ od: '2026-11-01', do: '2026-10-01' }).ok);
  test('C3 filtr: období nad strop dní odmítne', !F({ od: '2024-01-01', do: '2026-10-01' }).ok);
  test('C3 filtr: neznámá oblast a řada odmítne (ne „obojí")', !F({ od: '2026-10-01', do: '2026-10-02', oblast: 'vse' }).ok
    && !F({ od: '2026-10-01', do: '2026-10-02', rada: 'ZAHR' }).ok);
  test('C3 den zámku v českém čase (23:30 UTC 31. 10. = 1. 11.)', C.ctrlDenPraha('2026-10-31T23:30:00Z') === '2026-11-01'
    && C.ctrlDenPraha('2026-10-31T21:30:00Z') === '2026-10-31' && C.ctrlDenPraha('nesmysl') === '');

  const rej = { zakazky: [
    { soubor: 'a.json', cislo: 'A', odeslane: 1, rada: '', upraveno: '2026-10-15T10:00:00Z' },
    { soubor: 'b.json', cislo: 'B', odeslane: 0, rada: '', upraveno: '2026-10-15T10:00:00Z' },
    { soubor: 'c.json', cislo: 'C', odeslane: 2, rada: 'zahr', upraveno: '2026-10-15T10:00:00Z' },
    { soubor: 'd.json', cislo: 'D', odeslane: 1, rada: '', upraveno: '2026-09-28T10:00:00Z' },
    { soubor: 'f.json', cislo: 'F', odeslane: 1, rada: '', upraveno: '2026-09-30T10:00:00Z' },
    { soubor: 'e.json', cislo: 'E', odeslane: 1, rada: '' } ] };
  const fo = F({ od: '2026-10-01', do: '2026-10-31' }).filtr;
  test('C3 předvýběr: jen s odeslanou nabídkou a s úpravou v období (rezerva 2 dny na hodiny) nebo bez razítka',
    C.ctrlHromadnyKandidati(rej, fo).map(z => z.soubor).join(',') === 'a.json,c.json,f.json,e.json', C.ctrlHromadnyKandidati(rej, fo));
  test('C3 předvýběr: řada ZAHR / ČR podle rejstříku',
    C.ctrlHromadnyKandidati(rej, Object.assign({}, fo, { rada: 'zahr' })).map(z => z.soubor).join(',') === 'c.json'
    && C.ctrlHromadnyKandidati(rej, Object.assign({}, fo, { rada: 'cr' })).map(z => z.soubor).join(',') === 'a.json,f.json,e.json');

  if (typeof novaZakazka === 'function' && typeof zamkniVariantu === 'function') {
    const zak = zakazkaZamcena();
    const v = zak.varianty[0];
    v.zamek.kdy = '2026-10-10T08:00:00Z';
    const opts = { jekly: JEKLY, kdo: 'admin@priklad.cz', kdy: '2026-10-21T08:00:00Z' };
    const r1 = C.ctrlHromadnyZakazka(zak, fo, opts);
    test('C3 zakázka zamčená v období se vyváží', r1.ok && r1.exp.radky.length > 0, r1.duvod);
    const mimo = C.ctrlHromadnyZakazka(zak, F({ od: '2026-10-11', do: '2026-10-31' }).filtr, opts);
    test('C3 zakázka zamčená před obdobím vypadne (mimo, nehlásí se)', !mimo.ok && mimo.mimo === true, mimo);
    const zakN = kopie(zak); zakN.varianty[0].zamek = null;
    const n = C.ctrlHromadnyZakazka(zakN, fo, opts);
    test('C3 nezamčená řídící varianta se nevyváží', !n.ok && n.mimo === true, n);
    const zakR = kopie(zak); const v2 = kopie(zakR.varianty[0]); v2.id = 'v-nezamcena'; v2.zamek = null;
    zakR.varianty.forEach(x => { x.ridici = false; }); v2.ridici = true; zakR.varianty.push(v2);
    const rr = C.ctrlHromadnyZakazka(zakR, fo, opts);
    test('C3 zamčená, ale neřídící varianta se nevyváží (řídící je nezamčená)', !rr.ok && rr.mimo === true, rr);
    const zahr = C.ctrlHromadnyZakazka(zak, Object.assign({}, fo, { rada: 'zahr' }), opts);
    test('C3 tuzemská zakázka ve filtru ZAHR vypadne', !zahr.ok && zahr.mimo === true);
    const proj = C.ctrlHromadnyZakazka(zak, Object.assign({}, fo, { oblast: 'proj' }), opts);
    const ock = C.ctrlHromadnyZakazka(zak, Object.assign({}, fo, { oblast: 'ock' }), opts);
    test('C3 filtr OCK nechá jen řádky a strany OCK', ock.ok && ock.exp.radky.every(r => r.oblast === 'ock')
      && ock.exp.strany.every(s => s.oblast === 'ock'));
    test('C3 filtr PROJ: zakázka jen s OCK vypadne nebo nese jen PROJ',
      (!proj.ok && proj.mimo) || (proj.ok && proj.exp.radky.every(r => r.oblast === 'proj')), proj);

    /* Dvě zakázky v jednom sešitu: řádky se sečtou, sloupce zůstanou. */
    const zak2 = kopie(zak); zak2.cislo = '2026 - OPR - CN - 0902'; zak2.nazevAkce = 'Druhá akce';
    const e2 = C.ctrlHromadnyZakazka(zak2, fo, opts).exp;
    const listy = C.ctrlExportListy([r1.exp, e2], null, { kdy: opts.kdy, kdo: opts.kdo,
      hromadny: { od: fo.od, do: fo.do, oblast: 'obe', rada: 'obe', preskoceno: [{ cislo: 'X', duvod: 'zkouška' }] } });
    test('C3 sešit za období: list Řádky = hlavička + řádky obou zakázek',
      listy[0].rows.length === 1 + r1.exp.radky.length + e2.radky.length
      && listy[0].rows.every(r => r.length === C.CTRL_RADKY_HLAVICKA.length));
    test('C3 sešit za období: každý řádek nese číslo své zakázky',
      listy[0].rows.slice(1).filter(r => r[0] === '2026 - OPR - CN - 0902').length === e2.radky.length
      && listy[0].rows.slice(1).filter(r => r[1] === 'Druhá akce').length === e2.radky.length);
    const souhrny = listy[1].rows.filter(r => r.length === 10 && typeof r[2] === 'number');
    test('C3 sešit za období: Kapitoly nesou souhrn obou zakázek', souhrny.length === 2, souhrny.map(r => r[0]));
    const pop = listy[2].rows;
    const najdi = (k) => (pop.find(r => r[0] === k) || [])[1];
    test('C3 Popis: období, počet zakázek a přeskočené', najdi('Období zamčení (odeslání)') === '2026-10-01 – 2026-10-31'
      && najdi('Zakázek v exportu') === 2 && najdi('X') === 'zkouška' && najdi('Exportoval') === 'admin@priklad.cz');
    const csv = C.ctrlExportCsv([r1.exp, e2], null, { hromadny: { od: fo.od, do: fo.do } });
    test('C3 CSV za období: řádek na řádek obou zakázek', csv.split('\r\n').filter(Boolean).length === 1 + r1.exp.radky.length + e2.radky.length);
    test('C3 jedna varianta: sešit beze změny proti C2 (pole o jedné = objekt)',
      JSON.stringify(C.ctrlExportListy([r1.exp])) === JSON.stringify(C.ctrlExportListy(r1.exp)));
    test('C3 sloupec V základní ceně jde přes jedno místo (příprava „V nabídce")',
      C.ctrlVZakladuText({ vZakladu: true }) === 'ano' && C.ctrlVZakladuText({ vZakladu: false }) === 'ne (příplatek – volba)');
  }
  const p = C.ctrlProtokolPridej({ zaznamy: Array.from({ length: C.CTRL_HROMADNY.protokol }, (_, i) => ({ i })) }, { nove: 1 });
  test('C3 protokol exportů: nový záznam první, drží se strop', p.zaznamy[0].nove === 1 && p.zaznamy.length === C.CTRL_HROMADNY.protokol);
}

/* ---------- 6. C4: Pipedrive deal id ---------- */
{
  const N = C.ctrlPdDealIdNorm, K = C.ctrlPdDealKontrola;
  test('C4 tvar: prázdno, číslo i text čísla', N('') === '' && N(undefined) === '' && N(1234) === '1234' && N(' 42 ') === '42');
  test('C4 tvar: nula, záporné, desetinné, text, nad int32 → neplatné', [0, '0', -5, '1.5', 'abc', '012', '2147483648', '1e3'].every(x => N(x) === null));
  test('C4: obchodník uloží zakázku s nezměněným deal id', K({ pdDealId: '77' }, { pdDealId: 77 }, 'Obchodník') === null);
  test('C4: obchodník deal id nezadá ani neopraví (403)', K({}, { pdDealId: '77' }, 'Obchodník').status === 403
    && K({ pdDealId: '77' }, { pdDealId: '78' }, 'Vedoucí').status === 403 && K({ pdDealId: '77' }, {}, 'Obchodník').status === 403);
  test('C4: nová zakázka obchodníka s deal id → 403', K(null, { pdDealId: '5' }, 'Obchodník').status === 403);
  test('C4: administrátor zadá i opraví', K({}, { pdDealId: '77' }, 'Administrátor') === null && K({ pdDealId: '7' }, { pdDealId: '8' }, 'Administrátor') === null);
  test('C4: neplatný tvar neuloží nikdo (400)', K({}, { pdDealId: 'x1' }, 'Administrátor').status === 400);
  test('C4: neplatná uložená hodnota se bere jako prázdná', K({ pdDealId: 'x' }, {}, 'Obchodník') === null);
  if (typeof zakazkaDuplikuj === 'function') {
    const z = novaZakazka(); z.pdDealId = '991';
    test('C4: duplikát zakázky deal id nepřebírá', !('pdDealId' in zakazkaDuplikuj(z, '2026 - OPR - CN - 1')));
  }
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
