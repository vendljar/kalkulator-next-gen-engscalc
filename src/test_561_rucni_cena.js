/* RUČNÍ CENA POLOŽKY OBCHODNÍKEM S POTVRZENÍM (#561, rozhodnutí J. V. 4. 11. 2026).
 *
 * Obchodník přepíše NÁKUPNÍ cenu položky ceníku OCK z nabídky dodavatele
 * (přirážka se přičte jako jinde), doplní zdroj a cenu potvrdí. Bez potvrzení
 * zábrana tisku (rucniCenaNepotvrzena), prošlá nabídka jen upozornění, nový
 * ceník ruční cenu nepřepíše (jen upozorní), směs ceníků ji nehlásí, klon ji
 * nese i s potvrzením (B154), duplikát zakázky bez potvrzení, controlling
 * dostane zdroj a odchylku od ceníku. Serverovou část (B112, razítko z relace,
 * zámek) měří netlify/test_561_rucni_cena.mjs.
 *
 * Čísla jsou smyšlená (zkusebni_cenik.js + částky v testu).
 *
 * Pojistka proti prázdnému testu: proti 6109e39 (v4.11.3) sada padá hned na
 * prvním testu — modul src/rucni_ceny.js neexistuje (rucniCenaSmi není
 * funkce) a zbytek sady padá s ním. */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); };
nacti('./format.js'); nacti('./cenik.js'); nacti('./cenik_stari.js'); nacti('./cenik_rady.js');
nacti('./engine.js'); nacti('./engine_proj.js'); nacti('./techspec.js'); nacti('./zamek.js');
nacti('./poznamky.js'); nacti('./zakazka.js'); nacti('./zobrazeni.js'); nacti('./sleva.js');
nacti('./schvalovani.js'); nacti('./kontroly.js'); nacti('./vyjimky.js'); nacti('./program.js');
nacti('./uloziste.js'); nacti('./controlling.js');
let rcOk = true;
try { nacti('./rucni_ceny.js'); } catch (e) { rcOk = false; }
const ZC = require('./zkusebni_cenik.js');
const JEKLY = require('./jekly.json');
global.JEKLY = JEKLY;

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));
const fn = (n) => typeof global[n] === 'function';

test('modul rucni_ceny.js je načtený (rucniCenaSmi)', rcOk && fn('rucniCenaSmi'));
if (!rcOk || !fn('rucniCenaSmi')) { console.log(`\n${ok} OK, ${fail + 1} FAIL`); process.exit(1); }

const PROF = 'C.profilasKgKc';          // položka, kterou má každá šachta (Kč/kg)
const PLATNY = { verze: 3, cenik: (() => { const c = ZC.zkusebniCenik(); c.profilasKgKc = 80; c.marze = 0.25; return c; })(),
  cenikProj: ZC.zkusebniCenikProj(), zahranicni: { ceny: {}, jenZahr: {} } };
const ROZMERY = { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4, typSachty: 'exteriérová' };
function zakazka() {
  const z = novaZakazka(); z.cislo = '2026 - OPR - CN - 0561'; z.nazevAkce = 'TEST ruční cena';
  const d = z.varianty[0].data;
  Object.assign(d.ock.zadani, ROZMERY);
  d.cenik = kopie(PLATNY.cenik); d.proj.cenik = kopie(PLATNY.cenikProj);
  cenikOznacJakoDnesni(d, { verze: PLATNY.verze });
  return importZakazka(z);
}
const radekProf = (d) => {
  const r = vypocet(d.ock.zadani, d.cenik, JEKLY, d.ock.fixes);
  return (r.sekce.hrubaOck || []).find(x => x.cenaPath === PROF);
};

console.log('===== 1. které položky smí obchodník přepsat (B-Q2: všechny s cenou v Kč) =====');
test('profily Kč/kg ano', rucniCenaSmi(PROF));
test('montáž Kč/hod ano', rucniCenaSmi('C.montazHodKc'));
test('sklo Kč/m² ano', rucniCenaSmi('C.skloVsg442Kc'));
test('příplatek (S13) ano', rucniCenaSmi('C.priplatky.prosklenaStenaKc'));
test('hodiny statiky (hod) ne', !rucniCenaSmi('C.statikaHod'));
test('referenční šířka můstku (mm) ne', !rucniCenaSmi('C.mustekRefSirkaMm'));
test('kurz EUR ne', !rucniCenaSmi('C.kurzEurKc'));
test('přirážka a DPH (zakázkové) ne', !rucniCenaSmi('C.marze') && !rucniCenaSmi('C.dph'));
test('PROJ, neznámá a prototypová cesta ne', !rucniCenaSmi('PC.sazby.projektant') && !rucniCenaSmi('C.neexistuje')
  && !rucniCenaSmi('C.__proto__') && !rucniCenaSmi('C.constructor.prototype'));

console.log('===== 2. přepis nákupní ceny a přirážka (B-Q1) =====');
{ const z = zakazka(); const d = z.varianty[0].data;
  const pred = radekProf(d);
  test('výchozí: profily z ceníku 80 Kč/kg', pred && pred.cena === 80, pred);
  test('nastavení ruční ceny 95', rucniCenaNastav(d, PROF, 95) === true);
  const r = rucniCenaZaznam(d, PROF);
  test('cena leží v ceníku varianty (jádro počítá jedním kódem)', d.cenik.profilasKgKc === 95);
  test('záznam: hodnota, zdroj prázdný, nepotvrzeno, základ = sazba před přepisem', r && r.hodnota === 95 && r.potvrdil === null
    && r.zaklad === 80 && r.dodavatel === '' && rucniCenaStav(r) === RC_NEPOTVRZENO, r);
  const po = radekProf(d);
  test('jádro: jednotková cena řádku = nákupní cena z nabídky', po.cena === 95, po);
  test('jádro: náklad = množství × nákupní cena', Math.abs(po.naklad - po.mnozstvi * 95) < 1e-6, po);
  test('jádro: přirážka se přičte jako jinde (cena vč. přirážky = náklad × 1,25)', Math.abs(po.sMarzi - po.naklad * 1.25) < 1e-6, po);
  test('nula ani záporná cena nejde', !rucniCenaNastav(d, PROF, 0) && !rucniCenaNastav(d, PROF, -5) && d.cenik.profilasKgKc === 95);
  test('položka, která ruční cenu mít nesmí, se nezmění', !rucniCenaNastav(d, 'C.statikaHod', 3) && !d.rucniCeny['C.statikaHod']);
  test('záznam kryje hodnotu (rucniCenaPlati)', rucniCenaPlati(d, PROF));
  d.cenik.profilasKgKc = 96;
  test('jiná hodnota v ceníku než v záznamu → záznam nic nekryje', !rucniCenaPlati(d, PROF));
  d.cenik.profilasKgKc = 95;

  console.log('===== 3. potvrzení a jeho pád =====');
  test('zdroj: dodavatel, číslo, datum, platnost', rucniCenaZdrojNastav(d, PROF, 'dodavatel', 'Ocelárna Příklad s.r.o.')
    && rucniCenaZdrojNastav(d, PROF, 'cislo', 'N-2026-0815') && rucniCenaZdrojNastav(d, PROF, 'datum', '2026-11-02')
    && rucniCenaZdrojNastav(d, PROF, 'platnostDo', '2026-12-02'));
  test('neplatné datum se nezapíše', rucniCenaZdrojNastav(d, PROF, 'platnostDo', '2. 12. 2026') && r.platnostDo === '');
  rucniCenaZdrojNastav(d, PROF, 'platnostDo', '2026-12-02');
  test('potvrzení obchodníkem (prozatímní razítko, server ho přepíše)', rucniCenaPotvrd(d, PROF, 'Obch Test', '2026-11-04T10:00:00Z')
    && rucniCenaStav(r) === RC_POTVRZENO && r.potvrdil.lokalne === true);
  rucniCenaNastav(d, PROF, 97);
  test('změna čísla po potvrzení → nepotvrzeno', rucniCenaStav(r) === RC_NEPOTVRZENO);
  rucniCenaPotvrd(d, PROF, 'Obch Test');
  rucniCenaZdrojNastav(d, PROF, 'cislo', 'N-2026-0816');
  test('změna zdroje po potvrzení → nepotvrzeno', rucniCenaStav(r) === RC_NEPOTVRZENO);
  rucniCenaPotvrd(d, PROF, 'Obch Test');
  test('změna buňky ceny jinou cestou (správce) srovná záznam a shodí potvrzení', rucniCenaPoSet(d, PROF, 99, {}) && r.hodnota === 99
    && rucniCenaStav(r) === RC_NEPOTVRZENO);
  d.cenik.profilasKgKc = 99;

  console.log('===== 4. zábrana tisku a upozornění =====');
  const ctx = (dd) => ({ zadani: dd.ock.zadani, cenik: dd.cenik, rucni: rucniCenyPrehled(dd, { dnes: '2026-11-04' }) });
  const zab = (dd) => kontrolyProved(ctx(dd)).nalezy.filter(x => x.kod === 'rucniCenaNepotvrzena');
  let n = zab(d);
  test('nepotvrzená ruční cena = zábrana (strana OCK)', n.length === 1 && n[0].uroven === KONTROLY_UROVEN_ZABRANA
    && /Potvrďte ruční cenu u: PROFILY/i.test(n[0].text), n);
  test('server: nový zámek s nepotvrzenou cenou odmítne (rucniCenyZamekProblem)', /není potvrzená/.test(rucniCenyZamekProblem(z, z.varianty[0])));
  rucniCenaPotvrd(d, PROF, 'Obch Test');
  n = zab(d);
  test('potvrzená ruční cena tisk pustí', n.length === 0, n);
  test('server: potvrzená cena zámek pustí', rucniCenyZamekProblem(z, z.varianty[0]) === '');
  rucniCenaZdrojNastav(d, PROF, 'platnostDo', '2026-11-01'); rucniCenaPotvrd(d, PROF, 'Obch Test');
  const vse = kontrolyProved(ctx(d)).nalezy;
  const pr = vse.filter(x => x.kod === 'rucniCenaProsla');
  test('prošlá nabídka dodavatele = upozornění, ne zábrana', pr.length === 1 && pr[0].uroven !== KONTROLY_UROVEN_ZABRANA
    && !vse.some(x => x.kod === 'rucniCenaNepotvrzena'), vse.map(x => [x.kod, x.uroven]));
  test('vyřazená strana OCK (jen projekce) zámek neblokuje', rucniCenyZamekProblem({ jenProj: true }, { data: { rucniCeny: { [PROF]: { hodnota: 1, potvrdil: null } } } }) === '');

  console.log('===== 5. směs ceníků (cenová výjimka) ruční cenu nehlásí =====');
  const dnesni = vyjimkyDnesniZProgramu(PLATNY, d);
  const o = vyjimkyObsah(d, dnesni, '', JEKLY);
  test('ruční cena s dokladem není směs ceníků', !o.smes.some(x => x.cesta === PROF) && o.prazdny, o.smes);
  const d2 = kopie(d); d2.cenik.montazHodKc = (+d2.cenik.montazHodKc || 0) + 7;
  const o2 = vyjimkyObsah(d2, vyjimkyDnesniZProgramu(PLATNY, d2), '', JEKLY);
  test('jiná změněná sazba bez záznamu je směs dál', o2.smes.some(x => x.cesta === 'C.montazHodKc') && !o2.smes.some(x => x.cesta === PROF), o2.smes);
  const d3 = kopie(d); d3.rucniCeny[PROF].hodnota = 1;
  const o3 = vyjimkyObsah(d3, vyjimkyDnesniZProgramu(PLATNY, d3), '', JEKLY);
  test('záznam s jinou hodnotou než ceník nic nekryje → směs', o3.smes.some(x => x.cesta === PROF), o3.smes);

  console.log('===== 6. nový ceník ruční cenu nepřepíše, jen upozorní =====');
  const NOVY = kopie(PLATNY.cenik); NOVY.profilasKgKc = 88; NOVY.montazHodKc = (+NOVY.montazHodKc || 0) + 50;
  const dn = { cenik: NOVY, proj: { cenik: kopie(PLATNY.cenikProj) } };
  const zk = kopie(z);
  const vr = cenikPrepoctiRozpracovane(zk, dn, { verze: 4 });
  const dz = zk.varianty[0].data;
  test('přepočet rozdělané zakázky: ostatní sazby nové', dz.cenik.montazHodKc === NOVY.montazHodKc, vr);
  test('přepočet: ruční cena zůstala i se záznamem a potvrzením', dz.cenik.profilasKgKc === 99 && rucniCenaStav(dz.rucniCeny[PROF]) === RC_POTVRZENO);
  test('přepočet: varianta dostala číslo nové verze (ruční cena není zbytek směsi)', dz.cenikRazitko && dz.cenikRazitko.verze === 4, dz.cenikRazitko);
  /* Rozdělaná zakázka, jejíž jediný rozdíl proti novému ceníku je ruční cena:
   * nic k přepočtu (jen razítko verze) — ruční cena je chráněná už ve výběru
   * rozdílů, ne až v cenikPrepocti (mutace „#561: přepočet rozdělané zakázky"). */
  const NOVY2 = kopie(PLATNY.cenik); NOVY2.profilasKgKc = 88;
  const zj = kopie(z); const vj = cenikPrepoctiRozpracovane(zj, { cenik: NOVY2, proj: { cenik: kopie(PLATNY.cenikProj) } }, { verze: 5 });
  test('jen ruční cena odlišná od nového ceníku: varianta se nepřepočítává, jen se orazítkuje', vj.prepocteno === 0
    && vj.varianty[0] && vj.varianty[0].stav === 'orazitkovana' && zj.varianty[0].data.cenik.profilasKgKc === 99, vj);
  const vyb = kopie(z); cenikPrepocti(vyb.varianty[0], dn, { cesty: [PROF, 'C.montazHodKc'] });
  test('přepočet vybraných položek ruční cenu nepřepíše ani na výslovný výběr', vyb.varianty[0].data.cenik.profilasKgKc === 99
    && vyb.varianty[0].data.cenik.montazHodKc === NOVY.montazHodKc);
  const ph = cenikPrehled(z.varianty[0], dn, {});
  test('okno přepočtu ruční cenu nevypisuje (P12 — ceníková sazba by byla vidět)', !ph.rozdily.some(x => x.cesta === PROF), ph.rozdily.map(x => x.cesta));
  const prehled = rucniCenyPrehled(dz, { dnesniF: c => cenikGet(NOVY, c), dnes: '2026-11-04' });
  test('upozornění „ceník se změnil" u potvrzené ruční ceny', prehled.cenikZmena.some(x => x.cesta === PROF), prehled);
  const uc = kontrolyProved({ zadani: dz.ock.zadani, cenik: dz.cenik, rucni: prehled }).nalezy.filter(x => x.kod === 'rucniCenaCenik');
  test('… je to upozornění bez čísel', uc.length === 1 && uc[0].uroven !== KONTROLY_UROVEN_ZABRANA && !/\d{2,}/.test(uc[0].text), uc);
  const stejny = rucniCenyPrehled(dz, { dnesniF: c => cenikGet(PLATNY.cenik, c) });
  test('beze změny ceníku žádné upozornění', !stejny.cenikZmena.length);

  console.log('===== 7. klon a duplikát =====');
  const zkl = kopie(z);
  const kl = klonujVariantu(zkl, zkl.varianty[0].id);
  const kv = zkl.varianty.find(v => v.id !== z.varianty[0].id);
  test('klon nese ruční cenu, zdroj i potvrzení (B154: stejný obsah)', !!kv && kv.data.cenik.profilasKgKc === 99
    && kv.data.rucniCeny && rucniCenaStav(kv.data.rucniCeny[PROF]) === RC_POTVRZENO && kv.data.rucniCeny[PROF].cislo === 'N-2026-0816', kl);
  const du = zakazkaDuplikuj(kopie(z), '2026 - OPR - CN - 0562');
  const dv = du && (du.zak || du).varianty ? (du.zak || du).varianty[0] : null;
  test('duplikát zakázky: cena a zdroj zůstanou, potvrzení ne', !!dv && dv.data.rucniCeny && dv.data.rucniCeny[PROF].hodnota === 99
    && dv.data.rucniCeny[PROF].potvrdil === null, dv && dv.data.rucniCeny);
  const zr = importZakazka(kopie(z));
  test('import (migrace) záznam drží beze změny', JSON.stringify(zr.varianty[0].data.rucniCeny) === JSON.stringify(z.varianty[0].data.rucniCeny));

  console.log('===== 8. controlling: zdroj ceny a odchylka od ceníku =====');
  const ze = kopie(z); const ve = ze.varianty[0]; ve.ridici = true;
  ve.data.rucniCeny[PROF].zaklad = 80;
  zamkniVariantu(ve, { typ: 'nabidka', kdy: '2026-11-04T10:00:00Z', kdo: 'T', cislo: variantaCislo(ze, ve),
    vysledek: zamekVysledekSpocti(ve, JEKLY, 'v-561') });
  const ex = ctrlExportVarianty(ze, ve, { jekly: JEKLY });
  test('export prošel', ex.ok, ex.chyba);
  const rp = ex.ok ? ex.radky.find(x => x.cenaPath === PROF) : null;
  test('řádek profilů nese zdroj (nabídka, dodavatel, č.)', !!rp && rp.rucni && /nabídka dodavatele/.test(rp.rucni.zdroj) && /N-2026-0816/.test(rp.rucni.zdroj), rp);
  test('odchylka od ceníku za jednotku = 99 − 80 a v %', !!rp && rp.rucni.odchylka === 19 && Math.abs(rp.rucni.pct - 23.75) < 1e-9, rp && rp.rucni);
  const listy = ex.ok ? ctrlExportListy(ex, ctrlVychozi()) : [];
  const L = (listy[0] || { rows: [] }).rows;
  const iZ = CTRL_RADKY_HLAVICKA.indexOf('Zdroj ceny'), iO = CTRL_RADKY_HLAVICKA.indexOf('Odchylka od ceníku za jednotku (Kč)'),
    iC = CTRL_RADKY_HLAVICKA.indexOf('Odchylka od ceníku celkem (Kč)'), iK = CTRL_RADKY_HLAVICKA.indexOf('Klíč');
  const rr = L.find(x => x[iK] === PROF);
  test('list Řádky: sloupce Zdroj ceny a Odchylka', iZ > 0 && iO > 0 && !!rr && /nabídka/.test(rr[iZ]) && rr[iO] === 19
    && Math.abs(rr[iC] - 19 * rp.mnozstvi) < 0.01, rr);
  const jiny = L.find(x => x[iK] === 'C.montazHodKc');
  test('ceníková položka: zdroj „ceník", odchylka prázdná', !!jiny && jiny[iZ] === 'ceník' && jiny[iO] === '', jiny);
  test('verze struktury exportu 6', CTRL_EXPORT_VERZE === 6 && /#561/.test(CTRL_EXPORT_ZMENA));
}

console.log('===== 9. ↺ vrátit na ceník =====');
{ const z = zakazka(); const d = z.varianty[0].data;
  rucniCenaNastav(d, PROF, 95);
  test('↺ smaže záznam a vrátí sazbu platného ceníku', rucniCenaVrat(d, PROF, 80) && d.cenik.profilasKgKc === 80 && !d.rucniCeny);
  rucniCenaNastav(d, PROF, 95);
  test('↺ bez známého ceníku vrátí sazbu před přepisem', rucniCenaVrat(d, PROF) && d.cenik.profilasKgKc === 80);
  test('po ↺ nic neblokuje', !rucniCenyPrehled(d).nepotvrzene.length && rucniCenyZamekProblem(z, z.varianty[0]) === '');
}

console.log('===== 10. příplatky „cena dle nabídky" (S13, B-Q6) =====');
{ const STENA = 'C.priplatky.prosklenaStenaKc';
  const P = kopie(PLATNY.cenik); P.priplatky.prosklenaStenaKc = 50000; P.dleNabidky = { [STENA]: true };
  const z = zakazka(); const d = z.varianty[0].data; d.cenik = kopie(P);
  d.cenik.priplatky.prosklenaStenaKc = 12000;          // starší vlastní cena bez záznamu
  const ph = rucniCenyPrehled(d, { dleNabidkyF: c => cenikDleNabidkyJe(P, c), dnesniF: c => cenikGet(P, c) });
  test('starší vlastní cena příplatku dle nabídky = „potvrzeno bez dokladu"', ph.bezDokladu.some(x => x.cesta === STENA) && !ph.nepotvrzene.length, ph);
  test('… tisk neblokuje', rucniCenyZamekProblem(z, z.varianty[0]) === '');
  test('nová změna příplatku dle nabídky u role bez práva ceníku založí záznam k potvrzení', rucniCenaPoSet(d, STENA, 13000,
    { dleNabidky: true, smiCenik: false, puvodni: 12000 }) && rucniCenaStav(d.rucniCeny[STENA]) === RC_NEPOTVRZENO);
  test('… správce s právem ceníku záznam nezakládá', !rucniCenaPoSet(kopie(d), 'C.priplatky.ventilatorKc', 1, { dleNabidky: true, smiCenik: true }));
  test('běžný příplatek bez příznaku jinou cestou záznam nedostane', !rucniCenaPoSet(d, 'C.priplatky.ventilatorKc', 1, { dleNabidky: false, smiCenik: false }));
}

console.log('===== 11. server: tvar a razítko (čisté funkce) =====');
{ const ocista = rucniCenyOciste({ [PROF]: { hodnota: 95, dodavatel: 'X', cislo: '', datum: '', platnostDo: '', potvrdil: null, navic: 'y' } });
  test('očista: cizí pole zahodí', ocista.ok && !('navic' in ocista.mapa[PROF]));
  test('očista: text hodnota → chyba', !rucniCenyOciste({ [PROF]: { hodnota: '95' } }).ok);
  test('očista: nepovolená položka → chyba', !rucniCenyOciste({ 'C.statikaHod': { hodnota: 3 } }).ok);
  test('očista: řídicí znak ve zdroji → chyba', !rucniCenyOciste({ [PROF]: { hodnota: 1, dodavatel: 'a\u0007b' } }).ok);
  test('očista: dlouhý text → chyba', !rucniCenyOciste({ [PROF]: { hodnota: 1, dodavatel: 'x'.repeat(121) } }).ok);
  test('očista: pole místo mapy → chyba', !rucniCenyOciste([]).ok);
  const z = zakazka(); const d = z.varianty[0].data;
  rucniCenaNastav(d, PROF, 95); d.rucniCeny[PROF].zaklad = 1;
  d.rucniCeny[PROF].potvrdil = { jmeno: 'Podvržený', email: 'cizi@priklad.cz', kdy: '2020-01-01T00:00:00Z' };
  const r = rucniCenyServer(null, z, { email: 'obch@priklad.cz', jmeno: 'Obch Test', role: 'Obchodník' }, { program: { platny: PLATNY } });
  const rec = d.rucniCeny[PROF];
  test('server: razítko z relace, klientskému se nevěří', r.ok && rec.potvrdil.email === 'obch@priklad.cz' && /Obch Test/.test(rec.potvrdil.jmeno)
    && rec.potvrdil.kdy !== '2020-01-01T00:00:00Z' && !rec.potvrdil.lokalne, rec.potvrdil);
  test('server: ceníková sazba (základ) z platného ceníku, ne od klienta', rec.zaklad === 80, rec.zaklad);
  const z2 = kopie(z); z2.varianty[0].data.rucniCeny[PROF].potvrdil = { jmeno: 'jiný', kdy: 'x', lokalne: true };
  rucniCenyServer(z, z2, { email: 'jiny@priklad.cz', jmeno: 'Jiný', role: 'Obchodník' }, { program: { platny: PLATNY } });
  test('server: totéž potvrzení se stejným obsahem se vezme z uložené verze', JSON.stringify(z2.varianty[0].data.rucniCeny[PROF].potvrdil) === JSON.stringify(rec.potvrdil));
  const z3 = kopie(z); z3.varianty[0].data.cenik.profilasKgKc = 96;
  test('server: hodnota záznamu ≠ ceník varianty → 400', rucniCenyServer(z, z3, {}, {}).status === 400);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
