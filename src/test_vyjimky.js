/* Cenové výjimky varianty (rozhodnutí J. V. 13. 10. 2026) — model v Node.
 *
 * Co se hlídá:
 *   – otisk: mění se s hodnotou i cestou směsi a se sazbou pásu „jiné",
 *     nemění se zakázkovou přirážkou ani DPH;
 *   – směs: jen sledované položky, které platný ceník nese; vyřazená strana
 *     (P6) se neposuzuje; zahraniční řada se srovnává se zahraniční;
 *   – pás „jiné": mez = nejnižší kladná ceníková sazba opláštění, které se
 *     u šachty nabízí (interiér / exteriér); standardní režim se nehlídá;
 *   – potřeba podle práva ceníku části, kdo smí rozhodnout, kategorie,
 *     přepočet záznamu po změně, rejstřík bez otisku;
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
function varianta() {
  const z = novaZakazka(); z.cislo = '2026 - CN - 0001';
  const d = z.varianty[0].data;
  d.cenik = kopie(PLATNY.cenik); d.proj.cenik = kopie(PLATNY.cenikProj);
  return importZakazka(z).varianty[0].data;
}
const obsah = (d, vyr) => vyjimkyObsah(d, vyjimkyDnesniZProgramu(PLATNY, d), vyr || '');

console.log('— směs a otisk —');
{ const d = varianta(); const o = obsah(d);
  test('platný ceník celý: obsah prázdný, otisk prázdný', o.prazdny && o.otisk === '' && o.polozek === 0, o); }
{ const d = varianta(); d.cenik.profilasKgKc += 7; const o1 = obsah(d);
  test('jedna položka OCK jinak: 1 položka, sekce OCK, popis z ceníku', o1.polozek === 1 && o1.smes[0].sekce === 'OCK' && !!o1.smes[0].popis, o1);
  d.cenik.profilasKgKc += 1; const o2 = obsah(d);
  test('otisk se mění s hodnotou položky (táž cesta)', o2.otisk && o2.otisk !== o1.otisk, [o1.otisk, o2.otisk]);
  d.cenik.marze = 0.4; d.cenik.dph = 0; const o3 = obsah(d);
  test('zakázková přirážka a DPH otisk nemění', o3.otisk === o2.otisk && o3.polozek === 1, o3); }
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
  typSachty: typSachty || 'exteriérová' });
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
  test('otisk se mění se sazbou pásu', o2.otisk !== o1.otisk);
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
  vyjimkaSchval(d, o, 'Ved'); test('schváleno platí pro svůj otisk', vyjimkaPlati(d.cenovaVyjimka, o) && d.cenovaVyjimka.pozadal === 'Obch');
  d.cenik.profilasKgKc += 1; const o2 = obsah(d);
  test('po změně směsi schválení neplatí a kategorie je „čeká"', !vyjimkaPlati(d.cenovaVyjimka, o2) && vyjimkaKategorie(d.cenovaVyjimka, o2) === 'ceka');
  test('přepočet záznamu: stav čeká s novým otiskem', vyjimkaPrepocti(d, o2) && d.cenovaVyjimka.stav === VYJ_CEKA && d.cenovaVyjimka.otisk === o2.otisk && !d.cenovaVyjimka.schvalil);
  vyjimkaZamitni(d, o2, 'Ved', null, 'ne'); test('zamítnutí drží důvod', vyjimkaKategorie(d.cenovaVyjimka, o2) === 'zamitnuto' && d.cenovaVyjimka.zamitnutoDuvod === 'ne');
  vyjimkaVrat(d, o2); test('vrácení rozhodnutí → čeká', d.cenovaVyjimka.stav === VYJ_CEKA);
  d.cenik = kopie(PLATNY.cenik); d.proj.cenik = kopie(PLATNY.cenikProj);
  test('přepočet: nic se neliší → záznam pryč', vyjimkaPrepocti(d, obsah(d)) && !('cenovaVyjimka' in d)); }
{ const r = vyjimkaRejstrik({ stav: VYJ_CEKA, otisk: 'abc', polozek: 3, pasu: 1, pozadal: 'X', schvalilEmail: 'a@b' });
  test('rejstřík: bez otisku a e-mailu, počty jako čísla', !('otisk' in r) && !('schvalilEmail' in r) && r.polozek === 3 && r.pasu === 1, r);
  test('rejstřík: povolená pole klienta = pole serveru', JSON.stringify(SCHV_REJSTRIK_VYJIMKA_POVOLENO) === JSON.stringify(VYJ_REJSTRIK_POLE)); }
test('text: směs i pás v jedné větě, bez čísel cen', /směs/.test(vyjimkyText({ polozek: 2, pasu: 1, smes: [{ sekce: 'OCK' }, { sekce: 'PROJ' }] }))
  && /„jiné"/.test(vyjimkyText({ polozek: 2, pasu: 1, smes: [] })));

console.log('— zábrana v kontrolách —');
{ const vysl = kontrolyProved({ vyjimka: { potreba: true, plati: false, text: 'ceník varianty je směs' } });
  const n = vysl.nalezy.find(x => x.kod === 'cenovaVyjimka');
  test('zábrana: nález úrovně zábrany s výzvou ke schválení', !!n && n.uroven === KONTROLY_UROVEN_ZABRANA && /Schvalování/.test(n.text), n);
  test('zábrana zastaví nabídku OCK i PROJ', !!kontrolyZabranaDokumentu(vysl, 'nabidka') && !!kontrolyZabranaDokumentu(vysl, 'nabidkaProj'));
  test('se schválením mlčí', !kontrolyProved({ vyjimka: { potreba: true, plati: true } }).kody.includes('cenovaVyjimka'));
  test('role bez potřeby — mlčí', !kontrolyProved({ vyjimka: { potreba: false, plati: false } }).kody.includes('cenovaVyjimka'));
  test('zamítnutá — věta to říká', /zamítl/.test((kontrolyProved({ vyjimka: { potreba: true, plati: false, zamitnuto: true, text: 'x' } }).nalezy[0] || {}).text || '')); }

console.log('— klon —');
{ const z = novaZakazka(); z.varianty[0].data.cenovaVyjimka = { stav: VYJ_SCHVALENO, otisk: 'x' };
  const k = klonujVariantu(z, z.varianty[0].id);
  test('klon varianty schválení výjimky nepřenese', !!k && !('cenovaVyjimka' in k.data) && !!z.varianty[0].data.cenovaVyjimka); }

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
