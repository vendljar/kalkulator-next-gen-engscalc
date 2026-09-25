/* ===== ODESLANÁ NABÍDKA SE UŽ NEPOČÍTÁ ZNOVU =====
 * (nálezy A1 a D1 z testování obchodníkem, 15. 9. 2026)
 *
 * Na 2025-OVP-CN-0356 vytiskl obchodník 4. 9. 2026 nabídku se ZAMĚŘENÍM za
 * 195 800 Kč. Dnes tatáž zamčená varianta ukazuje 208 104 Kč. Ceník se
 * nepřepočítal — zamčená varianta si svá data drží. Změnil se VZOREC: 8. 9.
 * 2026 se doprava přesunula do základu přirážky (nález V29) a rozdíl je
 * přesně doprava × procento sekce.
 *
 * Zmrazit data a nezmrazit vzorec je půlka zámku. `zamek.otisk` nesl jen
 * souhrnné částky, takže se rozdíl dal nanejvýš zahlédnout, ne mu zabránit.
 *
 * Rozhodnutí J. V. 15. 9. 2026: „potřebujeme uzamknout nabídku as is, jakoby
 * to bylo pdf. To znamená, že se už za žádných podmínek nezmění. Pokud
 * v mezičase dojde ke změnám výpočtu anebo ceníku, tak k tomu dojde pouze na
 * základě vytvoření varianty této nabídky, která se podle nových podmínek
 * přepočítá."
 *
 * Při prvním zamčení se proto bere CELÝ výsledek OCK i PROJ a k tomu kurz
 * EUR — bez něj by cizojazyčný dotisk téže nabídky nešel vyrobit (D1)
 * a doplnit ho už nelze, protože zamčená nabídka se nemění.
 *
 * CO TAHLE SADA NEDOKÁŽE: zaručit, že je nabídka zmrazená VŠUDE. Proto je
 * v oddílu 4 statický hlídač — žádná obrazovka ani generátor nesmí volat
 * `vypocet()` přímo. Kdo to udělá, obejde zámek bez varování, přesně jako
 * dosud.
 */
const fs = require('fs');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');

global.DEFAULT_ZADANI = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const engProj = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = JSON.parse(JSON.stringify(engProj.DEFAULT_ZADANI_PROJ));
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
global.DEFAULT_TECHSPEC = require('./techspec.js').DEFAULT_TECHSPEC;
global.vypocet = eng.vypocet;
global.vypocetProj = engProj.vypocetProj;
const zk = require('./zakazka.js');
Object.keys(zk).forEach(k => { global[k] = zk[k]; });
const zm = require('./zamek.js');
Object.keys(zm).forEach(k => { global[k] = zm[k]; });

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

function zakazka() {
  const zak = zk.novaZakazka();
  const Z = zak.varianty[0].data.ock.zadani;
  Object.assign(Z, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  zak.varianty[0].data.cenik = ZC.zkusebniCenik();
  zak.varianty[0].data.proj.cenik = ZC.zkusebniCenikProj();
  return zak;
}
/* Zamčení tak, jak ho dělá zamekPoTisku: otisk se bere při PRVNÍM zamčení. */
function odesli(zak, v, opts) {
  const d = v.data;
  const o = opts || {};
  zm.zamkniVariantu(v, { typ: 'nabidkaTisk', kdo: 'DS', cislo: zm.variantaCislo(zak, v),
    vysledek: o.bezOtisku ? null : {
      ock: eng.vypocet(d.ock.zadani, d.cenik, JEKLY, d.ock.fixes),
      proj: engProj.vypocetProj(d.proj.zadani, d.proj.cenik),
      kurzEurKc: o.kurz || 0, build: 'zkusebni', kdy: new Date().toISOString(),
    } });
}

/* ---------- 1) otisk se bere a drží ---------- */
{
  const zak = zakazka(), v = zak.varianty[0];
  test('rozpracovaná varianta otisk výsledku nemá', zm.zamekVysledek(v) === null);
  const pred = zm.vypocetZ(v, JEKLY);
  test('a počítá se normálně', !!pred && !!pred.souhrn, !!pred);

  odesli(zak, v, { kurz: 25 });
  test('po odeslání otisk je', !!zm.zamekVysledek(v));
  test('a nese OCK i PROJ', !!zm.zamekVysledek(v).ock && !!zm.zamekVysledek(v).proj);
  test('a kurz EUR (D1)', zm.zamekVysledek(v).kurzEurKc === 25);
  /* Ptát se na uloženou hodnotu nestačí — dokument ji čte přes kurzEurZ()
   * a právě ta cesta musí zmrazený kurz upřednostnit. (Mutace „kurz se
   * nebere z otisku" mi napoprvé prošla, protože tenhle test chyběl.) */
  test('a dokument ho dostane přes kurzEurZ, ne z dnešního ceníku',
    zm.kurzEurZ(v, 99) === 25, zm.kurzEurZ(v, 99));
  test('a build, ať je dohledatelné, který kód to vydal', !!zm.zamekVysledek(v).build);
}

/* ---------- 2) jádro se změní, odeslaná nabídka ne (A1) ---------- */
{
  const zak = zakazka(), v = zak.varianty[0];
  odesli(zak, v, { kurz: 25 });
  const pri_odeslani = zm.vypocetZ(v, JEKLY).souhrn.zakladNaklad;

  /* Simulace změny vzorce — přesně to, co 8. 9. udělal nález V29. */
  const puvodni = global.vypocet;
  global.vypocet = (Z, C, J, f) => { const r = puvodni(Z, C, J, f); r.souhrn.zakladNaklad *= 2; return r; };
  try {
    test('odeslaná nabídka se po změně jádra NEZMĚNÍ',
      zm.vypocetZ(v, JEKLY).souhrn.zakladNaklad === pri_odeslani,
      [pri_odeslani, zm.vypocetZ(v, JEKLY).souhrn.zakladNaklad]);

    /* A rozpracovaná ANO — jinak by zmrazení bylo k ničemu. */
    const klon = zm.klonujVariantu(zak, v.id, { nazev: 'Varianta 2' });
    test('nová varianta se naopak přepočítá podle nových podmínek',
      zm.vypocetZ(klon, JEKLY).souhrn.zakladNaklad === pri_odeslani * 2,
      [pri_odeslani, zm.vypocetZ(klon, JEKLY).souhrn.zakladNaklad]);
  } finally { global.vypocet = puvodni; }
}

/* Totéž pro PROJ — tam nález A1 vlastně vznikl. */
{
  const zak = zakazka(), v = zak.varianty[0];
  odesli(zak, v, {});
  const pri_odeslani = JSON.stringify(zm.vypocetProjZ(v));
  const puvodni = global.vypocetProj;
  global.vypocetProj = (z, c) => { const r = puvodni(z, c); r.souhrn = { zmeneno: true }; return r; };
  try {
    test('odeslaná nabídka PROJ se po změně jádra NEZMĚNÍ',
      JSON.stringify(zm.vypocetProjZ(v)) === pri_odeslani);
  } finally { global.vypocetProj = puvodni; }
}

/* ---------- 3) otisk se nedá přepsat zvenčí ---------- */
{
  const zak = zakazka(), v = zak.varianty[0];
  odesli(zak, v, {});
  const r = zm.vypocetZ(v, JEKLY);
  r.souhrn.zakladNaklad = -1;                       // volající si do výsledku sahá (UI to dělá)
  test('sáhnutí do vráceného výsledku otisk nepoškodí',
    zm.vypocetZ(v, JEKLY).souhrn.zakladNaklad !== -1, zm.vypocetZ(v, JEKLY).souhrn.zakladNaklad);

  /* Druhý tisk téže varianty otisk NEPŘEPÍŠE — jinak by se čísla posunula
   * na dnešní při každém dotisku. */
  const pred = JSON.stringify(zm.zamekVysledek(v));
  zm.zamkniVariantu(v, { typ: 'nabidkaTisk', kdo: 'DS', vysledek: { ock: { podvrzeno: true } } });
  test('další tisk otisk nepřepíše', JSON.stringify(zm.zamekVysledek(v)) === pred);
  test('ale zapíše se do seznamu tisků', v.zamek.tisky.length === 2, v.zamek.tisky.length);
}

/* ---------- 4) starší odeslané nabídky (bez otisku) ---------- */
{
  const zak = zakazka(), v = zak.varianty[0];
  odesli(zak, v, { bezOtisku: true });       // přesně stav nabídek odeslaných před 15. 9. 2026
  test('zamčená varianta bez otisku se počítá dál', !!zm.vypocetZ(v, JEKLY));
  test('a zámek to ví', zm.variantaUzamcena(v) === true && zm.zamekVysledek(v) === null);
  test('kurz EUR spadne na ceník varianty', zm.kurzEurZ(v, 24) === 24);
}

/* ---------- 4b) OVĚŘENÍ ZMRAZENÉHO VÝSLEDKU (nález B59, revize v22.9.9) ----------
 * Server výsledek NOVÉHO zámku přepočítá tímž kódem, kterým ho pořizuje
 * prohlížeč, a porovnání zapíše do zámku jako razítko. Tady se zkouší model:
 * skládání výsledku, porovnání a razítko. Serverovou cestu hlídá
 * netlify/test_prava.mjs (blok B59). */
{
  const zak = zakazka(), v = zak.varianty[0];
  const r = zm.zamekVysledekSpocti(v, JEKLY, 'v1.2.3');
  test('B59: výsledek k zamčení nese OCK, PROJ, kurz, build a čas',
    !!r && !!r.ock && !!r.proj && r.kurzEurKc === 0 && r.build === 'v1.2.3' && !!r.kdy, r && Object.keys(r));
  test('B59: čísla jsou tatáž, jaká dá jádro napřímo',
    JSON.stringify(r.ock) === JSON.stringify(eng.vypocet(v.data.ock.zadani, v.data.cenik, JEKLY, v.data.ock.fixes)));
  const rozbita = JSON.parse(JSON.stringify(v)); delete rozbita.data.ock;
  test('B59: při chybě výpočtu vrací null (zámek pak vznikne bez výsledku, jako dosud)',
    zm.zamekVysledekSpocti(rozbita, JEKLY, '') === null);

  /* Porovnání. Obě strany prošly JSONem, jako na serveru. */
  const kopie = () => JSON.parse(JSON.stringify(r));
  test('B59: shodný výsledek nemá rozdíl', zm.zamekVysledekRozdily(kopie(), kopie()).pocet === 0);
  const b = kopie(); b.build = 'jina'; b.kdy = '2000-01-01';
  test('B59: build a čas pořízení se neporovnávají', zm.zamekVysledekRozdily(kopie(), b).pocet === 0);
  const c = kopie(); c.ock.souhrn.zakladCena += 1;
  const rc = zm.zamekVysledekRozdily(c, kopie());
  test('B59: změněná částka je rozdíl a má cestu',
    rc.pocet === 1 && rc.cesty[0] === 'ock.souhrn.zakladCena', rc);
  const e = kopie(); e.ock.souhrn.zakladCena = r.ock.souhrn.zakladCena * (1 + 1e-12);
  test('B59: rozdíl v posledním bitu rozdílem není', zm.zamekVysledekRozdily(e, kopie()).pocet === 0);
  const k = kopie(); k.kurzEurKc = 25;
  test('B59: jiný kurz EUR je rozdíl', zm.zamekVysledekRozdily(k, kopie()).cesty[0] === 'kurzEurKc');
  const klicSekce = Object.keys(r.ock.sekce || {}).find(k => Array.isArray(r.ock.sekce[k]) && r.ock.sekce[k].length > 2);
  test('příprava: výsledek má sekci s řádky', !!klicSekce, Object.keys(r.ock.sekce || {}));
  const s = kopie(); s.ock.sekce[klicSekce][1].sMarzi += 100;
  test('B59: jiná cena řádku sekce je rozdíl', zm.zamekVysledekRozdily(s, kopie()).pocet >= 1);
  const mn = kopie(); mn.ock.sekce[klicSekce][0].mnozstvi += 1;
  test('P6: jiné množství řádku je rozdíl (množství se porovnává)', zm.zamekVysledekRozdily(mn, kopie()).pocet >= 1);

  /* JEN PENÍZE A MNOŽSTVÍ, CHYBĚJÍCÍ KLÍČ NENÍ ROZDÍL (P6 / K15-N67, 25. 9. 2026).
   *
   * Lišta zámku hlásila „čísla odeslané nabídky nesouhlasí" i u poctivých
   * nabídek. Porovnání bralo celý strom výsledku znak po znaku — i texty
   * (název položky, dodatkový text), příznaky a klíče, které přidala nebo
   * ubrala jiná verze aplikace. Stačilo, aby obchodník tiskl ze stránky
   * načtené před nasazením nové verze. Rozpor v číslech se chytá dál. */
  const n = kopie(); n.ock.podvrzenyKlic = 1;
  test('P6: klíč jen v jednom výsledku (jiná verze aplikace) rozdílem není',
    zm.zamekVysledekRozdily(n, kopie()).pocet === 0, zm.zamekVysledekRozdily(n, kopie()));
  const bezKlice = kopie(); delete bezKlice.ock.odvozene;
  test('P6: chybějící klíč rozdílem není', zm.zamekVysledekRozdily(bezKlice, kopie()).pocet === 0,
    zm.zamekVysledekRozdily(bezKlice, kopie()));
  const txt = kopie(); txt.ock.sekce[klicSekce][0].nazev = 'Přejmenovaná položka';
  txt.ock.sekce[klicSekce][0].popisNabidka = 'Nový dodatkový text';
  test('P6: jiný text (název, dodatkový text) rozdílem není', zm.zamekVysledekRozdily(txt, kopie()).pocet === 0,
    zm.zamekVysledekRozdily(txt, kopie()));
  const prz = kopie(); prz.ock.sekce[klicSekce][0].prepsano = !prz.ock.sekce[klicSekce][0].prepsano;
  test('P6: jiný příznak (ano/ne) rozdílem není', zm.zamekVysledekRozdily(prz, kopie()).pocet === 0);
  const nan = kopie(); nan.ock.souhrn.zakladCena = null;         // NaN projde JSONem jako null
  test('P6: číslo proti prázdnu (NaN) je rozdíl', zm.zamekVysledekRozdily(nan, kopie()).cesty[0] === 'ock.souhrn.zakladCena',
    zm.zamekVysledekRozdily(nan, kopie()));
  const str = kopie(); str.ock.souhrn.zakladCena = String(r.ock.souhrn.zakladCena + 1);
  test('P6: číslo proti textu je rozdíl', zm.zamekVysledekRozdily(str, kopie()).pocet === 1);
  /* Řádek navíc na začátku sekce (novější verze přidala položku): řádky se
   * párují podle názvu, takže se ostatní neposunou a nehlásí se jako rozdíl. */
  const radekNavic = kopie();
  radekNavic.ock.sekce[klicSekce].unshift(Object.assign({}, radekNavic.ock.sekce[klicSekce][0],
    { nazev: 'Nová položka verze X', origNazev: 'Nová položka verze X', sMarzi: 0, naklad: 0, marze: 0, mnozstvi: 0 }));
  test('P6: řádek navíc jen v jednom výsledku ostatní řádky neposune',
    zm.zamekVysledekRozdily(radekNavic, kopie()).pocet === 0, zm.zamekVysledekRozdily(radekNavic, kopie()));
  const bezRadku = kopie(); bezRadku.ock.sekce[klicSekce].splice(1, 1);
  test('P6: řádek, který v jednom výsledku chybí, rozdílem není (částka je v součtech)',
    zm.zamekVysledekRozdily(bezRadku, kopie()).pocet === 0, zm.zamekVysledekRozdily(bezRadku, kopie()));
  const prehozene = kopie(); prehozene.ock.sekce[klicSekce].reverse();
  test('P6: jiné pořadí řádků rozdílem není', zm.zamekVysledekRozdily(prehozene, kopie()).pocet === 0,
    zm.zamekVysledekRozdily(prehozene, kopie()));
  const podvrhRadku = kopie(); podvrhRadku.ock.sekce[klicSekce].reverse();
  podvrhRadku.ock.sekce[klicSekce][0].sMarzi += 1;
  test('P6: a změněná cena se najde i v přeházených řádcích', zm.zamekVysledekRozdily(podvrhRadku, kopie()).pocet === 1,
    zm.zamekVysledekRozdily(podvrhRadku, kopie()));
  /* Jádro dokumentu musí mít obě strany — jinak by podvrh, který souhrn
   * prostě vynechá, dostal razítko „shoda". */
  const bezSouhrnu = kopie(); delete bezSouhrnu.ock.souhrn;
  const rBez = zm.zamekVysledekRozdily(bezSouhrnu, kopie());
  test('P6: výsledek bez souhrnu OCK (jádro dokumentu) shodný není',
    rBez.pocet === 3 && rBez.cesty.indexOf('ock.souhrn.zakladCena') >= 0, rBez);
  const prazdny = zm.zamekVysledekRozdily({ ock: {}, proj: {} }, kopie());
  test('P6: prázdný podvrh {ock:{}, proj:{}} shodný není (chybí všech šest částek jádra)',
    prazdny.pocet === zm.ZAMEK_OVERENI_JADRO.length, prazdny);
  const bezKurzu = kopie(); delete bezKurzu.kurzEurKc;
  test('P6: chybějící kurz EUR je rozdíl (bez něj nejde cizojazyčný dotisk)',
    zm.zamekVysledekRozdily(bezKurzu, kopie()).cesty[0] === 'kurzEurKc');
  /* Pole čísel (bez názvů) se dál porovnává po pořadí. */
  const pole = kopie(); pole.ock.testCisla = [1, 2, 3]; const pole2 = kopie(); pole2.ock.testCisla = [1, 2, 4];
  test('P6: pole čísel se porovná po pořadí', zm.zamekVysledekRozdily(pole, pole2).cesty[0] === 'ock.testCisla[2]',
    zm.zamekVysledekRozdily(pole, pole2));
  const mnoho = kopie(); Object.keys(mnoho.ock.souhrn).forEach(x => { mnoho.ock.souhrn[x] = -12345; });
  const rm = zm.zamekVysledekRozdily(mnoho, kopie());
  test('B59: cest je nejvýš pět, počet rozdílů je celý', rm.cesty.length === 5 && rm.pocet > 5, rm);

  /* Razítko. */
  test('B59: rozpracovaná varianta razítko nedostane', zm.zamekOvereni(v, JEKLY, 'v9') === null);
  zm.zamkniVariantu(v, { typ: 'nabidka', cislo: zm.variantaCislo(zak, v),
    vysledek: JSON.parse(JSON.stringify(zm.zamekVysledekSpocti(v, JEKLY, 'v8'))) });
  const ov = zm.zamekOvereni(v, JEKLY, 'v9', '2026-09-22T10:00:00Z');
  test('B59: poctivý zámek = shoda, s verzemi obou stran',
    ov.stav === 'shoda' && ov.rozdilu === 0 && ov.server === 'v9' && ov.klient === 'v8'
    && ov.kdy === '2026-09-22T10:00:00Z', ov);
  test('B59: ke shodě se nic neříká', zm.zamekOvereniText(ov) === '');
  v.zamek.vysledek.ock.souhrn.zakladSDph = 1;
  const ov2 = zm.zamekOvereni(v, JEKLY, 'v9');
  test('B59: podvržený výsledek = nesouhlasi s cestou',
    ov2.stav === 'nesouhlasi' && ov2.rozdilu === 1 && ov2.cesty[0] === 'ock.souhrn.zakladSDph', ov2);
  const t2 = zm.zamekOvereniText(ov2);
  test('B59: věta o rozporu jmenuje obě verze a počet rozdílů',
    /nesouhlasí/.test(t2) && /v8/.test(t2) && /v9/.test(t2) && /\(1 rozdíl;/.test(t2), t2);
  test('B59: počet rozdílů se skloňuje',
    /\(3 rozdíly;/.test(zm.zamekOvereniText(Object.assign({}, ov2, { rozdilu: 3 })))
    && /\(7 rozdílů;/.test(zm.zamekOvereniText(Object.assign({}, ov2, { rozdilu: 7 }))));
  /* Patologický výsledek od klienta nesmí shodit uložení — skončí „neověřeno". */
  const hluboky = JSON.parse(JSON.stringify(v));
  let uzel = {}; hluboky.zamek.vysledek = { ock: uzel };
  for (let i = 0; i < 20000; i++) { uzel.x = {}; uzel = uzel.x; }
  let ovH = null, padlo = false;
  try { ovH = zm.zamekOvereni(hluboky, JEKLY, 'v9'); } catch (e) { padlo = true; }
  test('B59: ani patologicky hluboký výsledek porovnání neshodí', !padlo && ovH && ovH.stav !== 'shoda',
    padlo ? 'výjimka' : ovH);
  const zDat = JSON.parse(JSON.stringify(v)); delete zDat.data.ock;
  const ov3 = zm.zamekOvereni(zDat, JEKLY, 'v9');
  test('B59: nepřepočitatelná data = chyba (neověřeno), ne shoda', ov3.stav === 'chyba', ov3);
  test('B59: a věta to řekne', /neověřil/.test(zm.zamekOvereniText(ov3)));
  const bezVysl = zakazka().varianty[0];
  zm.zamkniVariantu(bezVysl, { typ: 'nabidka' });
  test('B59: zámek bez zmrazeného výsledku razítko nedostane', zm.zamekOvereni(bezVysl, JEKLY, 'v9') === null);
  test('B59: prázdné nebo cizí razítko nic neříká',
    zm.zamekOvereniText(null) === '' && zm.zamekOvereniText({ stav: 'cosi' }) === '');
}

/* Prohlížeč výsledek k zamčení skládá VÝHRADNĚ sdílenou funkcí — kdyby si
 * vzorec zase opsal, rozešel by se časem se serverovým ověřením a server by
 * hlásil rozpor u poctivých nabídek. */
{
  const ui = fs.readFileSync(__dirname + '/ui/zamek_ui.js', 'utf8');
  const kod = ui.split('\n').filter(l => !/^\s*\*|^\s*\/\*|^\s*\/\//.test(l)).join('\n');
  test('B59: zamekPoTisku bere výsledek ze zamekVysledekSpocti',
    /vysledek = zamekVysledekSpocti\(v, JEKLY,/.test(kod));
  test('B59: a jádro napřímo nevolá', !/(?<![\w.])vypocet(?:Proj)?\(/.test(kod));
}

/* ---------- 5) HLÍDAČ: nikdo nesmí obejít zámek přímým vypocet() ---------- */

const POVOLENO = {
  /* Jediné místo, kde jádro smí zaznít napřímo — právě tam se rozhoduje
   * mezi otiskem a výpočtem. */
  'src/zamek.js': ['vypocet(d.ock.zadani, d.cenik, jekly, d.ock.fixes)',
    'vypocetProj(d.proj.zadani, d.proj.cenik)'],
  /* Záložní větve pro sestavení bez zamek.js (Node testy jader). */
  'src/sluzba.js': ['vypocet(d.ock.zadani, d.cenik, jekly, d.ock.fixes)',
    'vypocetProj(d.proj.zadani, d.proj.cenik)'],
  'src/nabidka.js': ['vypocet(Zv, Cv, jekly, d.ock.fixes)'],
  'src/kryci.js': ['vypocet(Zv, Cv, jekly, d.ock.fixes)', 'vypocetProj(d.proj.zadani, d.proj.cenik)'],
  'src/nabidka_proj.js': ['vypocetProj(pj.zadani || DEFAULT_ZADANI_PROJ, pj.cenik || DEFAULT_CENIK_PROJ)'],
  /* vypocetAkt() a vypocetProjAkt() jsou ty přístupové body; uvnitř sebe
   * volají jádro a jinde v UI se jádro volat nesmí. */
  'src/ui/common.js': ['vypocet(Z, C, JEKLY, OCK.fixes)', 'vypocetProj(PJ, PC)',
    'vypocetProj(v.data.proj.zadani, v.data.proj.cenik)',
    'vypocet(v.data.ock.zadani, v.data.cenik, JEKLY, v.data.ock.fixes)'],
  'src/ui/schvalovani_ui.js': ['vypocet(v.data.ock.zadani, v.data.cenik, JEKLY, v.data.ock.fixes)',
    'vypocetProj(v.data.proj.zadani, v.data.proj.cenik)'],
  /* Předvyplnění ATYP pracuje jen nad editovatelnou variantou (zámek ho
   * nepustí), takže hodiny navíc smí počítat napřímo. */
  'src/ui/kalk_ock.js': ['vypocet(z, c, JEKLY, (d.ock || {})'],
};
const SOUBORY = ['src/ui/common.js', 'src/ui/detail_ui.js', 'src/ui/detail_proj_ui.js',
  'src/ui/kalk_ock.js', 'src/ui/kalk_proj.js', 'src/ui/kontroly_ui.js', 'src/ui/marze_ui.js',
  'src/ui/techspec_ui.js', 'src/ui/zaokrouhleni_ui.js', 'src/ui/schvalovani_ui.js',
  'src/nabidka.js', 'src/nabidka_proj.js', 'src/kryci.js', 'src/sluzba.js', 'src/zamek.js'];

SOUBORY.forEach(rel => {
  const txt = fs.readFileSync(__dirname + '/../' + rel, 'utf8');
  /* Jen skutečná volání, ne zmínky v komentářích. */
  const radky = txt.split('\n').filter(l => !/^\s*\*|^\s*\/\*|^\s*\/\//.test(l));
  const volani = [];
  radky.forEach(l => {
    const m = l.match(/(?<![\w.])vypocet(?:Proj)?\([^)]*\)/g);
    (m || []).forEach(x => volani.push(x));
  });
  const povolene = POVOLENO[rel] || [];
  const navic = volani.filter(x => povolene.indexOf(x) < 0);
  test('žádné obcházení zámku v ' + rel, navic.length === 0, navic);
});

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
