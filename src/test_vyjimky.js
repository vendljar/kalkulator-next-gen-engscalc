/* Cenové výjimky varianty (rozhodnutí J. V. 13. 10. 2026) — model v Node.
 *
 * Co se hlídá:
 *   – obsah (kanonický zápis, B154): mění se s hodnotou i cestou směsi a se
 *     sazbou pásu „jiné", nemění se zakázkovou přirážkou ani DPH; schválení
 *     platí jen pro přesně týž obsah (kolize starého otisku FNV neprojde);
 *   – směs: jen sledované položky, které platný ceník nese; vyřazená strana
 *     (P6) se neposuzuje; zahraniční řada se srovnává se zahraniční;
 *   – pás „jiné": mez = nejnižší kladná ceníková sazba opláštění, které se
 *     u šachty nabízí (interiér / exteriér); standardní režim se nehlídá;
 *   – potřeba podle práva ceníku části, kdo smí rozhodnout, kategorie,
 *     přepočet záznamu po změně, rejstřík bez obsahu;
 *   – zábrana „cenovaVyjimka" v kontroly.js zastaví dokumenty obou stran.
 * Čísla jsou smyšlená (zkusebni_cenik.js).
 *
 * Pojistka proti prázdnému testu: bez modulu vyjimky.js sada spadne na
 * require; mutace (netlify/mutace.mjs, „výjimky:") ji rozbíjejí po jednom. */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); };
nacti('./format.js'); nacti('./cenik.js'); nacti('./cenik_stari.js'); nacti('./cenik_rady.js');
nacti('./engine.js'); nacti('./engine_proj.js'); nacti('./techspec.js'); nacti('./zamek.js');
nacti('./poznamky.js'); nacti('./zakazka.js'); nacti('./zobrazeni.js'); nacti('./sleva.js');
nacti('./schvalovani.js'); nacti('./kontroly.js'); nacti('./vyjimky.js');
const ZC = require('./zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));

const PLATNY = { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(), zahranicni: { ceny: {}, jenZahr: {} } };
/* Rozměry šachty: pásy se od B178 ořezávají na zdvih + přejezd (12,2 m). */
const ROZMERY = { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2 };
function varianta() {
  const z = novaZakazka(); z.cislo = '2026 - CN - 0001';
  const d = z.varianty[0].data;
  d.cenik = kopie(PLATNY.cenik); d.proj.cenik = kopie(PLATNY.cenikProj);
  Object.assign(d.ock.zadani, ROZMERY);
  return importZakazka(z).varianty[0].data;
}
const obsah = (d, vyr) => vyjimkyObsah(d, vyjimkyDnesniZProgramu(PLATNY, d), vyr || '');

console.log('— směs a obsah —');
{ const d = varianta(); const o = obsah(d);
  test('platný ceník celý: obsah prázdný', o.prazdny && o.obsah === '' && o.polozek === 0, o); }
{ const d = varianta(); d.cenik.profilasKgKc += 7; const o1 = obsah(d);
  test('jedna položka OCK jinak: 1 položka, sekce OCK, popis z ceníku', o1.polozek === 1 && o1.smes[0].sekce === 'OCK' && !!o1.smes[0].popis, o1);
  d.cenik.profilasKgKc += 1; const o2 = obsah(d);
  test('obsah se mění s hodnotou položky (táž cesta)', o2.obsah && o2.obsah !== o1.obsah, [o1.obsah, o2.obsah]);
  d.cenik.marze = 0.4; d.cenik.dph = 0; const o3 = obsah(d);
  test('zakázková přirážka a DPH obsah nemění', o3.obsah === o2.obsah && o3.polozek === 1, o3); }
{ const d = varianta(); d.proj.cenik.sazby.projektant += 50;
  const o = obsah(d);
  test('položka PROJ: sekce PROJ', o.polozek === 1 && o.smes[0].sekce === 'PROJ', o);
  test('vyřazená strana PROJ (P6) se neposuzuje', obsah(d, 'proj').prazdny);
  test('vyřazená strana OCK nebere PROJ', obsah(d, 'ock').polozek === 1); }
{ const d = varianta(); const P = kopie(PLATNY); delete P.cenik.montazHodKc;
  d.cenik.montazHodKc = 123;
  const o = vyjimkyObsah(d, vyjimkyDnesniZProgramu(P, d), '');
  test('klíč, který platný ceník nenese, se neposuzuje (doplnil ho import)', o.prazdny, o); }
{ const d = varianta(); d.cenikRada = 'zahr'; d.cenik.rada = 'zahr';
  const P = kopie(PLATNY); P.zahranicni = { ceny: { 'C.montazHodKc': 999 }, jenZahr: {} };
  d.cenik.montazHodKc = 999;
  const o = vyjimkyObsah(d, vyjimkyDnesniZProgramu(P, d), '');
  test('zahraniční varianta se srovnává se zahraniční řadou platného ceníku', !o.smes.some(x => x.cesta === 'C.montazHodKc'), o); }
test('bez platného ceníku se směs neposuzuje', vyjimkyObsah((() => { const d = varianta(); d.cenik.profilasKgKc = 1; return d; })(), null, '').prazdny);

console.log('— pás „jiné" —');
const steny = (sazba, typSachty) => ({ oplasteni: { rezim: 'poStenach', steny: {
  B: { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: 2 }, { typ: 'jine', nazev: 'Deska', naklad: sazba, doM: null }] } } },
  typSachty: typSachty || 'exteriérová', ...ROZMERY });
{ const c = PLATNY.cenik; const ext = vyjimkyMinSazbaOpl({ typSachty: 'exteriérová' }, c), int = vyjimkyMinSazbaOpl({ typSachty: 'interiérová' }, c);
  const kladne = (ids) => ids.map(k => +c[k]).filter(x => x > 0);
  test('mez exteriéru = nejnižší kladná sazba z typů exteriéru', ext === Math.min(...kladne(['skloBokyKc', 'skloCelniKc', 'cetrisKc'])), ext);
  test('mez interiéru = nejnižší kladná sazba z typů interiéru', int === Math.min(...kladne(['skloCelniKc', 'skloVsg442Kc', 'cetrisKc'])), int);
  const c0 = kopie(c); c0.cetrisKc = 0;
  test('typ s nulovou sazbou mez nesrazí na nulu', vyjimkyMinSazbaOpl({}, c0) > 0, vyjimkyMinSazbaOpl({}, c0)); }
{ const d = varianta(); const min = vyjimkyMinSazbaOpl({}, d.cenik);
  Object.assign(d.ock.zadani, steny(min - 1)); const o1 = obsah(d);
  test('pás „jiné" pod mezí: 1 pás (stěna B, pořadí 1)', o1.pasu === 1 && o1.pasy[0].stena === 'B' && o1.pasy[0].i === 1, o1);
  d.ock.zadani.oplasteni.steny.B.pasy[1].naklad = min - 2; const o2 = obsah(d);
  test('obsah se mění se sazbou pásu', o2.obsah !== o1.obsah);
  d.ock.zadani.oplasteni.steny.B.pasy[1].naklad = min; const o3 = obsah(d);
  test('sazba rovná mezi není výjimka', o3.prazdny, o3);
  d.ock.zadani.oplasteni.steny.B.pasy[1].naklad = 1; d.ock.zadani.oplasteni.rezim = 'standard';
  test('standardní režim pásy nečte — nehlídá se', obsah(d).prazdny);
  d.ock.zadani.oplasteni.rezim = 'poStenach';
  test('vyřazená strana OCK pásy neposuzuje', obsah(d, 'ock').prazdny); }

console.log('— potřeba, rozhodnutí, kategorie —');
{ const d = varianta(); d.cenik.profilasKgKc += 3; d.proj.cenik.sazby.projektant += 3; const o = obsah(d);
  const smi = (prava) => (k) => prava.indexOf(k) >= 0;
  test('bez práv: potřeba', vyjimkyPotreba(o, smi([])).potreba);
  test('jen právo OCK: potřeba kvůli PROJ', vyjimkyPotreba(o, smi(['tab.cenik'])).proj && !vyjimkyPotreba(o, smi(['tab.cenik'])).ock);
  test('obě práva ceníku: bez potřeby', !vyjimkyPotreba(o, smi(['tab.cenik', 'tab.cenikproj'])).potreba);
  test('administrátor smí rozhodnout vždy', vyjimkaSmiRozhodnout('Administrátor', () => false));
  test('vedoucí jen s právem sleva.schvalovani', vyjimkaSmiRozhodnout('Vedoucí', smi(['sleva.schvalovani'])) && !vyjimkaSmiRozhodnout('Vedoucí', smi([])));
  test('kategorie bez žádosti', vyjimkaKategorie(undefined, o) === 'nepozadano');
  vyjimkaPozadej(d, o, 'Obch'); test('žádost → čeká', vyjimkaKategorie(d.cenovaVyjimka, o) === 'ceka' && !vyjimkaPlati(d.cenovaVyjimka, o));
  vyjimkaSchval(d, o, 'Ved'); test('schváleno platí pro svůj obsah', vyjimkaPlati(d.cenovaVyjimka, o) && d.cenovaVyjimka.pozadal === 'Obch');
  d.cenik.profilasKgKc += 1; const o2 = obsah(d);
  test('po změně směsi schválení neplatí a kategorie je „čeká"', !vyjimkaPlati(d.cenovaVyjimka, o2) && vyjimkaKategorie(d.cenovaVyjimka, o2) === 'ceka');
  test('přepočet záznamu: stav čeká s novým obsahem', vyjimkaPrepocti(d, o2) && d.cenovaVyjimka.stav === VYJ_CEKA && d.cenovaVyjimka.obsah === o2.obsah && !d.cenovaVyjimka.schvalil);
  vyjimkaZamitni(d, o2, 'Ved', null, 'ne'); test('zamítnutí drží důvod', vyjimkaKategorie(d.cenovaVyjimka, o2) === 'zamitnuto' && d.cenovaVyjimka.zamitnutoDuvod === 'ne');
  vyjimkaVrat(d, o2); test('vrácení rozhodnutí → čeká', d.cenovaVyjimka.stav === VYJ_CEKA);
  d.cenik = kopie(PLATNY.cenik); d.proj.cenik = kopie(PLATNY.cenikProj);
  test('přepočet: nic se neliší → záznam pryč', vyjimkaPrepocti(d, obsah(d)) && !('cenovaVyjimka' in d)); }
{ const r = vyjimkaRejstrik({ stav: VYJ_CEKA, obsah: 'abc', polozek: 3, pasu: 1, pozadal: 'X', schvalilEmail: 'a@b' });
  test('rejstřík: bez obsahu a e-mailu, počty jako čísla', !('obsah' in r) && !('schvalilEmail' in r) && r.polozek === 3 && r.pasu === 1, r);
  test('rejstřík: povolená pole klienta = pole serveru', JSON.stringify(SCHV_REJSTRIK_VYJIMKA_POVOLENO) === JSON.stringify(VYJ_REJSTRIK_POLE)); }
test('text: směs i pás v jedné větě, bez čísel cen', /směs/.test(vyjimkyText({ polozek: 2, pasu: 1, smes: [{ sekce: 'OCK' }, { sekce: 'PROJ' }] }))
  && /„jiné"/.test(vyjimkyText({ polozek: 2, pasu: 1, smes: [] })));

console.log('— B154: schválení platí jen pro přesně týž obsah —');
{ /* Pokus auditu 15. 10. 2026 (podklady/AUDIT25_pokus_B154_kolize.mjs):
   * schválený pás „Deska" 10 Kč/m²; sazba 1 a název „Deska㌷홧" dávaly
   * týž 32bitový otisk FNV-1a. */
  const fnv = (t) => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); };
  const pas = (d, nazev, sazba) => { d.ock.zadani.oplasteni = { rezim: 'poStenach',
    steny: { A: { odM: 0, pasy: [{ typ: 'jine', nazev, naklad: sazba, doM: null }] } } }; };
  const d = varianta();
  test('příprava: mez pásu je nad 10 Kč/m²', vyjimkyMinSazbaOpl(d.ock.zadani, d.cenik) > 10, vyjimkyMinSazbaOpl(d.ock.zadani, d.cenik));
  pas(d, 'Deska', 10); const o1 = obsah(d);
  vyjimkaSchval(d, o1, 'Ved');
  test('schválení nese celý kanonický obsah (směs + pásy)', d.cenovaVyjimka.obsah === o1.obsah && /"Deska",10,0,12\.2,1\.6,(null|[0-9]+)\]/.test(o1.obsah), d.cenovaVyjimka);
  pas(d, 'Deska㌷홧', 1); const o2 = obsah(d);
  test('příprava: starý 32bitový otisk by kolidoval (pokus auditu)', fnv(o1.obsah) === fnv(o2.obsah), [fnv(o1.obsah), fnv(o2.obsah)]);
  test('kolize „Deska㌷홧" se sazbou 1 — schválení neplatí', !vyjimkaPlati(d.cenovaVyjimka, o2) && vyjimkaKategorie(d.cenovaVyjimka, o2) === 'ceka');
  pas(d, 'Deska ', 10);
  test('jeden znak navíc v názvu — schválení neplatí', !vyjimkaPlati(d.cenovaVyjimka, obsah(d)));
  pas(d, 'Deska', 10);
  test('týž obsah — schválení platí', vyjimkaPlati(d.cenovaVyjimka, obsah(d)));
  const stare = { stav: VYJ_SCHVALENO, otisk: fnv(o1.obsah), polozek: 0, pasu: 1, schvalil: 'Ved' };
  test('staré rozhodnutí jen s otiskem (před v15.10.8) neplatí — schválit znovu',
    !vyjimkaPlati(stare, o1) && vyjimkaKategorie(stare, o1) === 'ceka');
  test('prázdný obsah se schválením nekryje', !vyjimkaPlati({ stav: VYJ_SCHVALENO, obsah: '' }, { obsah: '' })); }

console.log('— B155: rozsah pásu „jiné" v obsahu výjimky —');
{ /* Pokus kola 25 (podklady/AUDIT25_pokus_B155_rozsah.mjs): schválený úzký
   * pás 0–1 m šel po schválení roztáhnout na celou stěnu a schválení platilo.
   * Pojistka: proti v15.10.14 (1cbab3a) padá rozsah v obsahu i v kartě. */
  const d = varianta();
  d.ock.zadani.oplasteni = { rezim: 'poStenach', steny: {
    A: { odM: 0, pasy: [{ typ: 'jine', nazev: 'Deska', naklad: 1, doM: 1 }, { typ: 'C.cetrisKc', doM: null }] },
    B: { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: 2.2 }, { typ: 'jine', nazev: 'Deska', naklad: 1, doM: null }] } } };
  const A = d.ock.zadani.oplasteni.steny.A, B = d.ock.zadani.oplasteni.steny.B;
  const o1 = obsah(d);
  test('pásy nesou rozsah po ořezu: A 0–1 m, B od 2,2 m až nahoru = do 12,2 m (B178)',
    o1.pasu === 2 && o1.pasy[0].odM === 0 && o1.pasy[0].doM === 1 && !o1.pasy[0].posledni
    && o1.pasy[1].odM === 2.2 && o1.pasy[1].doM === 12.2 && o1.pasy[1].posledni, o1.pasy);
  test('obsah p = [stěna, i, název, sazba, odM, doM, délka stěny, m² z jádra] (B178, v17.10.5)', JSON.parse(o1.obsah).p.every(x => x.length === 8)
    && /\["A",0,"Deska",1,0,1,1\.6,(null|[0-9]+)\]/.test(o1.obsah) && /\["B",1,"Deska",1,2\.2,12\.2,1\.8,(null|[0-9]+)\]/.test(o1.obsah), o1.obsah);
  vyjimkaSchval(d, o1, 'Ved');
  A.pasy[0].doM = 3;
  test('roztažení pásu (doM 1 → 3 m) — schválení neplatí, kategorie „čeká"', !vyjimkaPlati(d.cenovaVyjimka, obsah(d)) && vyjimkaKategorie(d.cenovaVyjimka, obsah(d)) === 'ceka');
  A.pasy = [A.pasy[0]]; A.pasy[0].doM = null;
  test('roztažení pásu na celou stěnu (doM null) — schválení neplatí', !vyjimkaPlati(d.cenovaVyjimka, obsah(d)) && vyjimkaKategorie(d.cenovaVyjimka, obsah(d)) === 'ceka');
  A.pasy = [{ typ: 'jine', nazev: 'Deska', naklad: 1, doM: 1 }, { typ: 'C.cetrisKc', doM: null }];
  test('beze změny rozsahu — schválení platí', vyjimkaPlati(d.cenovaVyjimka, obsah(d)));
  A.odM = -1.2;
  test('posun začátku stěny (odM 0 → −1,2) — schválení neplatí', !vyjimkaPlati(d.cenovaVyjimka, obsah(d)) && vyjimkaKategorie(d.cenovaVyjimka, obsah(d)) === 'ceka');
  A.odM = 0;
  B.pasy[0].doM = 1.5;
  test('posun horní meze předchozího (ceníkového) pásu posune začátek pásu „jiné" — neplatí', !vyjimkaPlati(d.cenovaVyjimka, obsah(d)));
  B.pasy[0].doM = 2.2; A.pasy[1].doM = 7;
  test('horní mez posledního ceníkového pásu (jádro ji nečte) obsah nemění', vyjimkaPlati(d.cenovaVyjimka, obsah(d)));
  A.pasy[0].doM = '1'; A.odM = '0'; B.pasy[0].doM = '2.2';
  test('zápis „1" místo 1 — obsah shodný', obsah(d).obsah === o1.obsah, [obsah(d).obsah, o1.obsah]);
  A.pasy[0].doM = 'x';
  test('nečitelná mez = 0 jako v jádru — pás nulové výšky vypadne (jádro ho nepočítá)', obsah(d).pasu === 1 && obsah(d).pasy[0].stena === 'B', obsah(d).pasy);
  A.pasy[0].doM = 1;
  test('rozsah v kartě: desetinná čárka, „až nahoru", záporný začátek se znaménkem',
    vyjimkyPasRozsah({ odM: 0, doM: 1 }) === '0–1 m' && vyjimkyPasRozsah({ odM: 2.2, doM: null }) === 'od 2,2 m až nahoru'
    && vyjimkyPasRozsah({ odM: -1.2, doM: 0.5 }) === '-1,2–0,5 m', [vyjimkyPasRozsah({ odM: -1.2, doM: 0.5 })]);
  /* Výjimka jen se směsí ceníku: obsah týž jako před opravou. */
  const s = varianta(); s.cenik.profilasKgKc += 7;
  s.ock.zadani.oplasteni = { rezim: 'poStenach', steny: { A: { odM: -1, pasy: [{ typ: 'C.cetrisKc', doM: 2 }, { typ: 'C.cetrisKc', doM: null }] } } };
  const os = obsah(s);
  test('výjimka jen se směsí: obsah beze změny proti v15.10.14 (p prázdné)', os.obsah === JSON.stringify({ s: [['C.profilasKgKc', PLATNY.cenik.profilasKgKc + 7]], p: [] }), os.obsah);
  s.ock.zadani.oplasteni.steny.A.pasy[0].doM = 3;
  test('změna rozsahu ceníkového pásu obsah směsi nemění', obsah(s).obsah === os.obsah); }

console.log('— B153: dotisk nové strany posuzuje jen její část —');
{ const z = novaZakazka(); z.cislo = '2026 - CN - 0001';
  z.varianty[0].data = varianta(); const v = z.varianty[0];
  v.data.cenik.profilasKgKc += 3;                         // směs jen OCK
  const ctx = (strany) => ({ program: { platny: PLATNY }, smi: () => false, strany });
  const ob = { role: 'Obchodník' };
  const o = obsah(v.data);
  test('část obsahu OCK nese směs OCK, PROJ nic', vyjimkyObsahStran(o, ['ock']).polozek === 1 && vyjimkyObsahStran(o, ['proj']).prazdny);
  test('neznámý typ dokumentu (?) = obě strany', vyjimkyObsahStran(o, ['?']).polozek === 1);
  test('dotisk OCK se směsí OCK bez schválení → důvod', /směs/.test(vyjimkyZamekProblem(z, v, ob, ctx(['ock']))));
  test('dotisk PROJ — směs OCK ho nezastaví', vyjimkyZamekProblem(z, v, ob, ctx(['proj'])) === '');
  vyjimkaSchval(v.data, o, 'Ved');
  test('dotisk OCK se schválením celého obsahu projde', vyjimkyZamekProblem(z, v, ob, ctx(['ock'])) === '');
  test('administrátor výjimku nepotřebuje', vyjimkyZamekProblem(z, v, { role: 'Administrátor' }, ctx(['ock'])) === ''); }

console.log('— B153: zábrana dotisku v prohlížeči (ui/schvalovani_ui.js) —');
{ global.JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));
  global.progJede = () => true; global.PROG_STAV = { db: { platny: PLATNY } };
  global.zobrazeniRole = () => 'Obchodník'; global.smiZobrazit = () => false;
  global.NAST = { slevy: { minMarze: 0, stropy: { 'Obchodník': 0.05 } } };
  require('vm').runInThisContext(require('fs').readFileSync(__dirname + '/ui/schvalovani_ui.js', 'utf8'));
  const z = novaZakazka(); z.cislo = '2026 - CN - 0002';
  z.varianty[0].data = varianta(); const v = z.varianty[0]; global.ZAK = z;
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.cenik.profilasKgKc += 3;                         // směs OCK
  test('nezamčená varianta — dotisková zábrana mlčí (řeší ji zábrana cenovaVyjimka)', vyjimkyDotiskZabrana('nabidka', v) === '');
  zamkniVariantu(v, { typ: 'nabidkaProj', kdy: new Date().toISOString(), kdo: 'T', cislo: 'x' });
  const d = vyjimkyDotiskZabrana('nabidka', v);
  test('zámek PROJ → dotisk nabídky OCK se směsí bez schválení: zábrana s hláškou o klonu', /směs/.test(d) && /klonem/.test(d), d);
  test('dotisk PROJ (strana už odešla) — mlčí', vyjimkyDotiskZabrana('nabidkaProj', v) === '');
  test('dokument bez strany — mlčí', vyjimkyDotiskZabrana('techspec', v) === '');
  global.smiZobrazit = (k) => k === 'tab.cenik';
  test('role s právem ceníku OCK — mlčí', vyjimkyDotiskZabrana('nabidka', v) === '');
  global.smiZobrazit = () => false;
  v.data.cenik.profilasKgKc -= 3;                         // bez směsi
  v.data.sleva = { procenta: 4, stav: 'schváleno automaticky', role: 'Obchodník' };
  test('bez směsi, sleva OCK nad minimem — mlčí', vyjimkyDotiskZabrana('nabidka', v) === '');
  global.NAST.slevy.minMarze = 0.95;
  const m = vyjimkyDotiskZabrana('nabidka', v);
  test('sleva OCK pod minimální marží → zábrana dotisku OCK', /marž/.test(m) && /klonem/.test(m), m);
  test('marže OCK nezastaví dotisk PROJ', vyjimkyDotiskZabrana('nabidkaProj', v) === '');
  delete global.ZAK; }
console.log('— B178: výška a rozměry stěny v obsahu výjimky —');
{ /* Pokus kola 26 (podklady/AUDIT26_pokus_B178_vyska.mjs): schválený pás
   * „jiné" až nahoru šel roztáhnout zvýšením zdvihu (9 → 40 m) a schválení
   * platilo. Pojistka: proti v17.10.1 (54174ee) padají kontroly změny
   * zdvihu, přejezdu, šířky a hloubky i shoda mezí s jádrem. */
  const d = varianta();
  d.ock.zadani.oplasteni = { rezim: 'poStenach', steny: {
    A: { odM: 0, pasy: [{ typ: 'jine', nazev: 'Deska', naklad: 1, doM: 1 }, { typ: 'C.cetrisKc', doM: null }] },
    B: { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: 11 }, { typ: 'jine', nazev: 'Deska', naklad: 1, doM: null }] } } };
  const zd = d.ock.zadani;
  const o1 = obsah(d);
  test('pás nahoře: 11–12,2 m, stěna B 1,8 m', o1.pasy[1].odM === 11 && o1.pasy[1].doM === 12.2 && o1.pasy[1].delka === 1.8, o1.pasy[1]);
  vyjimkaSchval(d, o1, 'Ved');
  const zmena = (pole, hodnota, platit, popis) => { const puv = zd[pole]; zd[pole] = hodnota;
    const o = obsah(d);
    test(popis, platit ? vyjimkaPlati(d.cenovaVyjimka, o) : (!vyjimkaPlati(d.cenovaVyjimka, o) && vyjimkaKategorie(d.cenovaVyjimka, o) === 'ceka'), o.pasy);
    zd[pole] = puv; };
  zmena('zdvih', 40, false, 'zdvih 9 → 40 m roztáhne pás nahoře — schválení neplatí (B178)');
  zmena('prejezd', 4, false, 'přejezd 3,2 → 4 m — schválení neplatí');
  zmena('hloubka', 3, false, 'hloubka 1,8 → 3 m (délka stěny B) — schválení neplatí');
  zmena('sirka', 3, false, 'šířka 1,6 → 3 m (délka stěny A) — schválení neplatí');
  /* Zápis „9" místo 9: meze jako jádro (`+x`) beze změny. Plochu jádro
   * u textového zdvihu počítá jinak (zdvih + přejezd jako text), obsah ji
   * od v17.10.5 nese — schválení tak sleduje cenu, ne zápis. */
  { const puv = zd.zdvih; const m0 = JSON.stringify(obsah(d).pasy.map(p => [p.odM, p.doM])); zd.zdvih = '9';
    test('zápis zdvihu „9" místo 9 — meze pásů beze změny', JSON.stringify(obsah(d).pasy.map(p => [p.odM, p.doM])) === m0);
    zd.zdvih = puv; }
  test('beze změny — schválení platí', vyjimkaPlati(d.cenovaVyjimka, obsah(d)));
  /* Pás celý pod horní hranou se zdvihem nemění (meze po ořezu tytéž). */
  const e = varianta();
  e.ock.zadani.oplasteni = { rezim: 'poStenach', steny: {
    A: { odM: 0, pasy: [{ typ: 'jine', nazev: 'Deska', naklad: 1, doM: 1 }, { typ: 'C.cetrisKc', doM: null }] } } };
  const oe = obsah(e); vyjimkaSchval(e, oe, 'Ved'); e.ock.zadani.zdvih = 40;
  test('pás 0–1 m dole: zdvih 9 → 40 m obsah nemění (pás se nezvětšil)', vyjimkaPlati(e.cenovaVyjimka, obsah(e)));
  /* Meze výjimky = meze jádra (sdílená oplasteniPasyMeze). */
  zd.zdvih = 40;
  const r = vypocet(zd, d.cenik, JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8')));
  const jine = r.oplasteni.pasy.filter(p => p.typ === 'jine').map(p => [p.stena, +p.odM.toFixed(3), +p.doM.toFixed(3)]);
  const vyj = obsah(d).pasy.map(p => [p.stena, p.odM, p.doM]);
  test('meze pásů „jiné" ve výjimce = meze z výpočtu jádra (zdvih 40 m)', JSON.stringify(jine) === JSON.stringify(vyj), [jine, vyj]);
  const pl = vyjimkyPasyPlochy(obsah(d).pasy, r);
  test('plocha pásu pro kartu = m² z jádra (zdvih 40 m)', pl.length === 2 && pl.every(p => typeof p.m2 === 'number')
    && pl[1].m2 === Math.round(r.oplasteni.pasy.find(p => p.typ === 'jine' && p.stena === 'B').m2 * 100) / 100 && pl[1].m2 > 50, pl);
  test('plocha v kartě na 0,1 m² jako schválení (V7-N1, B183 b), neznámá plocha prázdná',
    vyjimkyPasPlocha({ m2: 2.16 }) === '2,1 m² (zaokrouhleno pro schválení)' && vyjimkyPasPlocha({ m2: 2.59 }) === '2,5 m² (zaokrouhleno pro schválení)'
    && vyjimkyPasPlocha({ m2: 2.5 }) === '2,5 m²' && vyjimkyPasPlocha({ m2: 4 }) === '4 m²' && vyjimkyPasPlocha({ m2: null }) === ''
    && vyjimkyPasyPlochy(obsah(d).pasy, null).every(p => p.m2 === null),
    [vyjimkyPasPlocha({ m2: 2.16 }), vyjimkyPasPlocha({ m2: 2.59 }), vyjimkyPasPlocha({ m2: 4 })]);
  test('B183: karta dřív schválené výjimky (starý tvar) ukáže celé m², jak bylo schváleno',
    vyjimkyPasPlocha({ m2: 2.5 }, true) === '3 m² (zaokrouhleno pro schválení)' && vyjimkyPasPlocha({ m2: 4 }, true) === '4 m²',
    [vyjimkyPasPlocha({ m2: 2.5 }, true), vyjimkyPasPlocha({ m2: 4 }, true)]);
  /* V7-N1: číslo v kartě = číslo v obsahu schválení (pás i světlík). */
  {
    const oV = obsah(d), ob = JSON.parse(oV.obsah);
    const vKarte = x => { const m = /^(\d+(,\d)?) m²/.exec(vyjimkyPasPlocha(x)); return m ? +m[1].replace(',', '.') : null; };
    test('V7-N1: plocha pásu v kartě = m² v obsahu schválení', oV.pasy.length > 0
      && oV.pasy.every((p, i) => vKarte(p) === ob.p[i][7]), [oV.pasy.map(vKarte), ob.p.map(x => x[7])]);
    test('V7-N1: plocha světlíku v kartě = m² v obsahu schválení', (oV.svetliky || []).every((x, i) => vKarte(x) === ob.l[i][4]),
      [(oV.svetliky || []).map(vKarte), ob.l]);
  }
  /* Dva pásy „jiné" na jedné stěně: každý svou plochu (párování mezemi). */
  zd.oplasteni.steny.B.pasy = [{ typ: 'jine', nazev: 'Deska', naklad: 1, doM: 1 }, { typ: 'C.cetrisKc', doM: 11 }, { typ: 'jine', nazev: 'Deska', naklad: 1, doM: null }];
  const r2 = vypocet(zd, d.cenik, JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8')));
  const pl2 = vyjimkyPasyPlochy(obsah(d).pasy.filter(p => p.stena === 'B'), r2);
  test('dva pásy „jiné" na stěně B: dolní 0–1 m menší plocha než horní 11–43,2 m', pl2.length === 2 && pl2[0].m2 > 0 && pl2[0].m2 * 10 < pl2[1].m2, pl2);
  zd.zdvih = 9; }

{ /* B155: karta výjimek ukáže schvalovateli rozsah pásu. */
  if (typeof global.card !== 'function') global.card = (t, h) => h;
  /* esc a escJs ze skutečného ui/common.js (deklarace jako v test_escape.js). */
  const common = require('fs').readFileSync(__dirname + '/ui/common.js', 'utf8').replace(/\r\n/g, '\n');
  const dekl = jm => { const z = common.slice(common.indexOf('const ' + jm + ' =')); return z.slice(0, z.match(/;\n/).index + 1); };
  require('vm').runInThisContext(dekl('esc') + dekl('escJs') + 'globalThis.esc = esc; globalThis.escJs = escJs;');
  const z = novaZakazka(); z.cislo = '2026 - CN - 0003';
  z.varianty[0].data = varianta(); global.ZAK = z;
  Object.assign(z.varianty[0].data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  z.varianty[0].data.ock.zadani.oplasteni = { rezim: 'poStenach', steny: {
    A: { odM: -1.2, pasy: [{ typ: 'jine', nazev: 'Deska <b>', naklad: 1, doM: 1 }, { typ: 'C.cetrisKc', doM: null }] },
    B: { odM: 0, pasy: [{ typ: 'C.cetrisKc', doM: 2.2 }, { typ: 'jine', nazev: 'Deska', naklad: 1, doM: null }] } } };
  const h = vyjimkyKarta();
  test('B155 karta: stěna A (Deska, -1,2–1 m) a stěna B (Deska, od 2,2 m až nahoru), název přes esc()',
    /stěna A \(Deska &lt;b&gt;, -1,2–1 m, [0-9]+(,[0-9])? m²( \(zaokrouhleno pro schválení\))?\)/.test(h) && /stěna B \(Deska, od 2,2 m až nahoru \(12,2 m\), [0-9]+(,[0-9])? m²( \(zaokrouhleno pro schválení\))?\)/.test(h), h.slice(0, 1200));
  delete global.ZAK; }

console.log('— B178 zbytek: plocha z jádra v obsahu (v17.10.5) —');
{ /* Pojistka: proti v17.10.4 (9bb7caf) padají kontroly změny zasklení,
   * počtu nástupišť (světlíky „jiné" u dveří), plochy v obsahu a tvaru
   * obsahu jen se směsí. */
  global.JEKLY = global.JEKLY || JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));
  const d = varianta(); const zd = d.ock.zadani;
  zd.oplasteni = { rezim: 'poStenach', steny: {
    B: { odM: 0, pasy: [{ typ: 'jine', nazev: 'Deska', naklad: 1, doM: null }] } } };
  const o1 = obsah(d);
  test('pás nese plochu z jádra (m², 2 desetinná místa)', o1.pasu === 1 && typeof o1.pasy[0].m2 === 'number' && o1.pasy[0].m2 > 10, o1.pasy);
  const p1 = JSON.parse(o1.obsah).p[0];
  test('obsah nese plochu pásu na 0,1 m² dolů (B183 b)', p1[p1.length - 1] === Math.floor(o1.pasy[0].m2 * 10 + 1e-6) / 10
, [p1, o1.pasy[0].m2]);
  vyjimkaSchval(d, o1, 'Ved');
  const puv = zd.zaskleni; zd.zaskleni = puv === 'na terče' ? 'mezi příčníky' : 'na terče';
  const oz = obsah(d);
  test('změna zasklení posune vnější rozměr stěny → schválení neplatí',
    oz.pasy[0].m2 !== o1.pasy[0].m2 && !vyjimkaPlati(d.cenovaVyjimka, oz) && vyjimkaKategorie(d.cenovaVyjimka, oz) === 'ceka', [o1.pasy[0].m2, oz.pasy[0].m2]);
  zd.zaskleni = puv;
  test('zpět na původní zasklení — schválení platí', vyjimkaPlati(d.cenovaVyjimka, obsah(d)));
  /* Světlíky u dveří z převažujícího materiálu stěn B–D (#375). */
  const e = varianta(); const ze = e.ock.zadani;
  ze.nadDvermi = 'material'; ze.nastupiste = 2;
  const jine = () => ({ odM: 0, pasy: [{ typ: 'jine', nazev: 'Deska', naklad: 1, doM: null }] });
  ze.oplasteni = { rezim: 'poStenach', steny: { B: jine(), C: jine(), D: jine() } };
  const oe = obsah(e);
  test('světlík „jiné" u dveří je v obsahu s plochou', oe.svetliky && oe.svetliky.length >= 1 && oe.svetliky.every(s => typeof s.m2 === 'number' && s.m2 > 0)
    && Array.isArray(JSON.parse(oe.obsah).l) && JSON.parse(oe.obsah).l.length === oe.svetliky.length, oe.svetliky);
  vyjimkaSchval(e, oe, 'Ved');
  ze.nastupiste = 3;
  const oe4 = obsah(e);
  test('víc nástupišť = větší světlíky „jiné" → schválení neplatí', !vyjimkaPlati(e.cenovaVyjimka, oe4), [oe.svetliky, oe4.svetliky]);
  ze.nastupiste = 2;
  test('zpět 2 nástupiště — schválení platí', vyjimkaPlati(e.cenovaVyjimka, obsah(e)));
  /* Jen směs: tvar obsahu beze změny — schválené směsi nepadají. */
  const s = varianta(); s.cenik.profilasKgKc += 7;
  test('obsah jen se směsí nemá klíč světlíků (dříve schválené směsi platí dál)', JSON.stringify(Object.keys(JSON.parse(obsah(s).obsah))) === '["s","p"]', obsah(s).obsah);
  const jk = global.JEKLY; delete global.JEKLY;
  const bez = vyjimkyObsah(d, vyjimkyDnesniZProgramu(PLATNY, d), '');
  global.JEKLY = jk;
  test('bez katalogu profilů plocha neznámá = null v obsahu (fail-closed)', bez.pasy[0].m2 === null && bez.obsah !== obsah(d).obsah
    && !vyjimkaPlati(d.cenovaVyjimka, bez), bez.obsah); }

console.log('— B183: plocha v obsahu na 0,1 m², dřív schválené platí starým tvarem (v20.10.5) —');
{ /* Pojistka: proti v20.10.1 (5dc28d1, celé m²) padají testy 2,50 vs 2,61,
   * značky tvaru, starého tvaru i karty na desetiny. Plochu pásu podstrčí
   * obal výpočtu jádra (jinak by se 2,50 / 2,59 / 2,61 m² hledaly rozměry). */
  test('B183: 2,50 a 2,59 m² v obsahu totéž, 2,61 m² jiné; 2,3 m² zůstane 2,3',
    vyjimkyM2Schvaleni(2.50) === vyjimkyM2Schvaleni(2.59) && vyjimkyM2Schvaleni(2.61) !== vyjimkyM2Schvaleni(2.50)
    && vyjimkyM2Schvaleni(2.3) === 2.3 && vyjimkyM2Schvaleni(2.7) === 2.7 && vyjimkyM2Schvaleni(null) === null,
    [vyjimkyM2Schvaleni(2.5), vyjimkyM2Schvaleni(2.59), vyjimkyM2Schvaleni(2.61), vyjimkyM2Schvaleni(2.3)]);
  const vyp = global.vypocet; let m2 = 2.5;
  global.vypocet = (...a) => { const r = vyp(...a);
    (r.oplasteni.pasy || []).forEach(p => { if (p.typ === 'jine') p.m2 = m2; }); return r; };
  try {
    const d = varianta();
    d.ock.zadani.oplasteni = { rezim: 'poStenach', steny: { B: { odM: 0, pasy: [{ typ: 'jine', nazev: 'Deska', naklad: 1, doM: null }] } } };
    const o = obsah(d), ob = JSON.parse(o.obsah), os = JSON.parse(o.obsahStary);
    test('B183: obsah s pásem nese značku tvaru v=2 a plochu 2,5; starý tvar bez značky s celými m²',
      ob.v === VYJ_OBSAH_TVAR && ob.p[0][7] === 2.5 && !('v' in os) && os.p[0][7] === 3
      && JSON.stringify(Object.keys(os)) === '["s","p","l"]', [o.obsah, o.obsahStary]);
    vyjimkaSchval(d, o, 'Ved');
    m2 = 2.59; test('B183: nové schválení 2,50 → 2,59 m² platí dál', vyjimkaPlati(d.cenovaVyjimka, obsah(d)));
    m2 = 2.61; test('B183: nové schválení 2,50 → 2,61 m² neplatí (čeká znovu)',
      !vyjimkaPlati(d.cenovaVyjimka, obsah(d)) && vyjimkaKategorie(d.cenovaVyjimka, obsah(d)) === 'ceka');
    m2 = 3.49; test('B183: nové schválení 2,50 → 3,49 m² neplatí, i když starým zaokrouhlením sedí (díra B183 zavřená)',
      obsah(d).obsahStary === o.obsahStary && !vyjimkaPlati(d.cenovaVyjimka, obsah(d)), obsah(d).obsah);
    /* Dřív schválená výjimka (záznam z doby celých m², bez značky). */
    m2 = 2.5;
    const e = varianta(); e.ock.zadani.oplasteni = kopie(d.ock.zadani.oplasteni);
    const oe = obsah(e);
    e.cenovaVyjimka = { stav: VYJ_SCHVALENO, obsah: oe.obsahStary, polozek: oe.polozek, pasu: oe.pasu, schvalil: 'Ved' };
    { const z = novaZakazka(); z.cislo = '2026 - CN - 0005'; z.varianty[0].data = e; global.ZAK = z;
      global.smiZobrazit = (q) => q === 'sleva.schvalovani';
      const h = vyjimkyKarta();
      test('B183 karta: dřív schválená ukáže 3 m² a poznámku o celých m²', /Deska, od 0 m až nahoru \(12,2 m\), 3 m² \(zaokrouhleno pro schválení\)/.test(h)
        && /Schváleno před v20\.10\.5 s plochou na celé m²/.test(h), (h.match(/.{60}m².{60}/) || [])[0]);
      global.smiZobrazit = () => false; delete global.ZAK; }
    test('B183: dřív schválená (celé m²) platí po změně tvaru dál, karta pozná starý tvar',
      vyjimkaPlati(e.cenovaVyjimka, oe) && vyjimkaKategorie(e.cenovaVyjimka, oe) === 'schvaleno' && vyjimkaStaryTvar(e.cenovaVyjimka, oe)
      && !vyjimkaStaryTvar({ stav: VYJ_SCHVALENO, obsah: oe.obsah }, oe));
    const pred = JSON.stringify(e.cenovaVyjimka);
    test('B183: přepočet záznamu dřív schválenou výjimku nevrátí do „čeká"', !vyjimkaPrepocti(e, oe) && JSON.stringify(e.cenovaVyjimka) === pred);
    m2 = 3.49; test('B183: dřív schválená 2,50 → 3,49 m² (týž starý tvar) platí — mez, kterou tehdy schválil', vyjimkaPlati(e.cenovaVyjimka, obsah(e)));
    m2 = 3.5; test('B183: dřív schválená 2,50 → 3,50 m² neplatí; přepočet ji vrátí do „čeká" s novým tvarem',
      !vyjimkaPlati(e.cenovaVyjimka, obsah(e)) && vyjimkaPrepocti(e, obsah(e)) && e.cenovaVyjimka.stav === VYJ_CEKA
      && JSON.parse(e.cenovaVyjimka.obsah).v === VYJ_OBSAH_TVAR);
    m2 = 2.5; e.ock.zadani.oplasteni.steny.B.pasy[0].naklad = 0.5;
    e.cenovaVyjimka = { stav: VYJ_SCHVALENO, obsah: oe.obsahStary, polozek: oe.polozek, pasu: oe.pasu };
    test('B183: dřív schválená po změně sazby neplatí', !vyjimkaPlati(e.cenovaVyjimka, obsah(e)));
    e.ock.zadani.oplasteni.steny.B.pasy[0].naklad = 1;
    e.cenovaVyjimka = { stav: VYJ_ZAMITNUTO, obsah: oe.obsahStary, polozek: oe.polozek, pasu: oe.pasu };
    test('B183: dřív zamítnutá zůstane zamítnutá (ne „čeká")', vyjimkaKategorie(e.cenovaVyjimka, obsah(e)) === 'zamitnuto');
    /* Obsah jen se směsí: tvar beze změny, starý tvar se nepočítá. */
    const s = varianta(); s.cenik.profilasKgKc += 7;
    test('B183: obsah jen se směsí beze značky a bez starého tvaru', !('v' in JSON.parse(obsah(s).obsah)) && obsah(s).obsahStary === '');
    test('B183: prázdný záznam ani prázdný starý tvar nic nekryjí',
      !vyjimkaObsahSedi({ stav: VYJ_SCHVALENO, obsah: '' }, { obsah: '', obsahStary: '' })
      && !vyjimkaObsahSedi({ stav: VYJ_SCHVALENO, obsah: 'x' }, { obsah: 'y', obsahStary: '' }));
  } finally { global.vypocet = vyp; } }

console.log('— B165: ceníková vs. použitá sazba a dopad —');
{ const d = varianta(); d.cenik.profilasKgKc -= 7;
  d.ock.zadani.oplasteni = { rezim: 'poStenach', steny: {
    B: { odM: 0, pasy: [{ typ: 'jine', nazev: 'Deska', naklad: 1, doM: null }] } } };
  const dn = vyjimkyDnesniZProgramu(PLATNY, d); const o = vyjimkyObsah(d, dn, '');
  const dp = vyjimkyDopad(d, o, dn, JEKLY);
  const cena = dd => vypocet(dd.ock.zadani, dd.cenik, JEKLY, dd.ock.fixes).souhrn.zakladCena;
  const x = dp.polozky.find(q => q.cesta.indexOf('profilasKgKc') >= 0);
  test('položka: použitá = varianta, ceníková = platný ceník', !!x && x.pouzita === d.cenik.profilasKgKc && x.cenikova === PLATNY.cenik.profilasKgKc, x);
  const k = kopie(d); k.cenik.profilasKgKc = PLATNY.cenik.profilasKgKc;
  test('dopad položky v Kč a % proti ceně s ceníkovou hodnotou', !!x && Math.abs(x.dopadKc - (cena(d) - cena(k))) < 0.01
    && Math.abs(x.dopadPct - (cena(d) - cena(k)) / cena(k)) < 1e-9 && x.dopadKc < 0, x);
  const p = dp.pasy[0]; const min = vyjimkyMinSazbaOpl(d.ock.zadani, d.cenik);
  const kp = kopie(d); kp.ock.zadani.oplasteni.steny.B.pasy[0].naklad = min;
  test('pás: použitá 1, ceníková = nejnižší ceníková, plocha, dopad proti ceníkové', !!p && p.pouzita === 1 && p.cenikova === min && p.m2 > 0
    && Math.abs(p.dopadKc - (cena(d) - cena(kp))) < 0.01 && p.dopadKc < 0, p);
  test('celkem OCK: obě odchylky dohromady', dp.ock && dp.ock.dopadKc < x.dopadKc && dp.ock.dopadKc < p.dopadKc && dp.ock.dopadPct < 0, dp.ock);
  test('formát dopadu „−x,x %"', /^−[0-9]+,?[0-9]? %$/.test(vyjimkyDopadText(dp.ock).split(' (')[0]) && /Kč\)$/.test(vyjimkyDopadText(dp.ock)), vyjimkyDopadText(dp.ock));
  /* Karta: čísla jen schvalovateli, vše escapované. */
  const z = novaZakazka(); z.cislo = '2026 - CN - 0004'; z.varianty[0].data = d; global.ZAK = z;
  d.ock.zadani.oplasteni.steny.B.pasy[0].nazev = 'Deska <i>';
  global.smiZobrazit = () => false;
  const h0 = vyjimkyKarta();
  test('karta obchodníkovi: bez sazeb a dopadu', !/ceníková [0-9]/.test(h0) && !/použitá/.test(h0) && !/Kč/.test(h0), (h0.match(/.{80}(ceníková|Kč).{40}/) || [])[0]);
  global.smiZobrazit = (q) => q === 'sleva.schvalovani';
  const h = vyjimkyKarta();
  test('karta schvalovateli: ceníková vs. použitá u položky i pásu, dopad v % a Kč, plocha',
    /ceníková [0-9]/.test(h) && /použitá [0-9]/.test(h) && (h.match(/ %/g) || []).length >= 3 && /m²/.test(h) && /Kč/.test(h), h.slice(0, 2000));
  test('karta: název pásu escapovaný', /Deska &lt;i&gt;/.test(h) && !/Deska <i>/.test(h));
  global.smiZobrazit = () => false; delete global.ZAK; }

console.log('— zábrana v kontrolách —');
{ const vysl = kontrolyProved({ vyjimka: { potreba: true, plati: false, text: 'ceník varianty je směs' } });
  const n = vysl.nalezy.find(x => x.kod === 'cenovaVyjimka');
  test('zábrana: nález úrovně zábrany s výzvou ke schválení', !!n && n.uroven === KONTROLY_UROVEN_ZABRANA && /Schvalování/.test(n.text), n);
  test('zábrana zastaví nabídku OCK i PROJ', !!kontrolyZabranaDokumentu(vysl, 'nabidka') && !!kontrolyZabranaDokumentu(vysl, 'nabidkaProj'));
  test('se schválením mlčí', !kontrolyProved({ vyjimka: { potreba: true, plati: true } }).kody.includes('cenovaVyjimka'));
  test('role bez potřeby — mlčí', !kontrolyProved({ vyjimka: { potreba: false, plati: false } }).kody.includes('cenovaVyjimka'));
  test('zamítnutá — věta to říká', /zamítl/.test((kontrolyProved({ vyjimka: { potreba: true, plati: false, zamitnuto: true, text: 'x' } }).nalezy[0] || {}).text || '')); }

console.log('— klon —');
{ const z = novaZakazka(); z.varianty[0].data.cenovaVyjimka = { stav: VYJ_SCHVALENO, obsah: 'x' };
  const k = klonujVariantu(z, z.varianty[0].id);
  test('klon varianty schválení výjimky nepřenese', !!k && !('cenovaVyjimka' in k.data) && !!z.varianty[0].data.cenovaVyjimka); }

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
