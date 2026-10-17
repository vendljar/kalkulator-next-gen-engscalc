/* Příznak ceníkové položky „cena dle nabídky" (S13, v16.10.3; e-mail
 * obchodníka D. S. 15. 10. 2026, varianta A schválená J. V. 16. 10. 2026).
 *
 * U nabídkových položek „za akci" (prosklená stěna vedle šachty a dalších
 * sedm z excelové předlohy) nemá ceník reálnou cenu — obchodník ji zadává
 * sám podle nabídky. Ruční cena takové položky proto NENÍ odchylka od
 * ceníku: žádná cenová výjimka, žádné schválení, žádná zábrana.
 *
 * Co se hlídá:
 *   – příznak žije v ceníku (`cenik.dleNabidky`), ve výchozím ceníku je
 *     zaškrtnutý u osmi položek, starý ceník bez mapy = nezaškrtnuto
 *     (doplnění klíčů ho nepřidá);
 *   – zveřejnění: očista mapy (jen známé cesty OCK, jen true), otisk se mění
 *     se změnou příznaku, ceník bez příznaků má otisk jako dřív;
 *   – výjimka nevznikne u položky s příznakem PLATNÉHO ceníku, vznikne
 *     u běžného příplatku pod ceníkem (s konkrétní hláškou), vznikne i tehdy,
 *     když si příznak „podstrčí" ceník varianty;
 *   – automatický přepočet rozdělané zakázky vlastní cenu nepřepíše;
 *   – serverová kontrola ceníku (B128) položku s příznakem pustí, zápornou
 *     cenu ne, podstrčený příznak ne.
 * Čísla jsou smyšlená (zkusebni_cenik.js + částky v testu).
 *
 * Pojistka proti prázdnému testu: proti v15.10.14 (1cbab3a) sada padá
 * (chybí cenikDleNabidkyJe, výjimka vzniká i u položky s příznakem). */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); };
nacti('./format.js'); nacti('./cenik.js'); nacti('./cenik_stari.js'); nacti('./cenik_rady.js');
nacti('./engine.js'); nacti('./engine_proj.js'); nacti('./techspec.js'); nacti('./zamek.js');
nacti('./poznamky.js'); nacti('./zakazka.js'); nacti('./zobrazeni.js'); nacti('./sleva.js');
nacti('./schvalovani.js'); nacti('./kontroly.js'); nacti('./vyjimky.js'); nacti('./program.js');
nacti('./uloziste.js');
const ZC = require('./zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));
const fn = (n) => typeof global[n] === 'function';

const OSM = ['C.priplatky.zabranyPadKc', 'C.priplatky.demontazOhrazeniKc', 'C.priplatky.malbaSchodnicKc',
  'C.priplatky.naterOhrazeniKc', 'C.priplatky.naterOkopovychKc', 'C.priplatky.prosklenaStenaKc',
  'C.priplatky.demontazVytahuKc', 'C.priplatky.destovySvodKc'];
const STENA = 'C.priplatky.prosklenaStenaKc';

/* Platný ceník: zkušební + smyšlené ceny dvou příplatků, příznak u stěny. */
function platnyCenik(sPriznakem) {
  const c = ZC.zkusebniCenik();
  c.priplatky.prosklenaStenaKc = 50000; c.priplatky.ventilatorKc = 20000;
  if (sPriznakem) c.dleNabidky = { [STENA]: true };
  return c;
}
const PLATNY = { verze: 3, cenik: platnyCenik(true), cenikProj: ZC.zkusebniCenikProj(), zahranicni: { ceny: {}, jenZahr: {} } };
function varianta(P) {
  const z = novaZakazka(); z.cislo = '2026 - OPR - CN - 0001'; z.nazevAkce = 'TEST dle nabídky';
  const d = z.varianty[0].data;
  d.cenik = kopie((P || PLATNY).cenik); d.proj.cenik = kopie((P || PLATNY).cenikProj);
  cenikOznacJakoDnesni(d, { verze: (P || PLATNY).verze });        // nová varianta z platné verze
  return importZakazka(z);
}
const obsah = (d, P) => vyjimkyObsah(d, vyjimkyDnesniZProgramu(P || PLATNY, d), 'proj');

console.log('— příznak v ceníku —');
test('funkce cenikDleNabidkyJe / cenikDleNabidkyNastav / cenikDleNabidkyOciste existují',
  fn('cenikDleNabidkyJe') && fn('cenikDleNabidkyNastav') && fn('cenikDleNabidkyOciste'));
if (!fn('cenikDleNabidkyJe')) { console.log('\n' + ok + ' OK, ' + (fail) + ' FAIL'); process.exit(1); }
test('výchozí ceník: zaškrtnuto přesně osm nabídkových položek',
  OSM.every(c => cenikDleNabidkyJe(DEFAULT_CENIK, c))
    && Object.keys(DEFAULT_CENIK.dleNabidky || {}).length === 8, DEFAULT_CENIK.dleNabidky);
test('výchozí ceník: lešení, ventilátor, sklo, madla příznak nemají',
  !['C.priplatky.leseniHlavaKc', 'C.priplatky.ventilatorKc', 'C.priplatky.vsgFolieM2', 'C.priplatky.madlaBmKc', 'C.leseniVnitrniKc']
    .some(c => cenikDleNabidkyJe(DEFAULT_CENIK, c)));
{ const stary = ZC.zkusebniCenik();
  test('starý ceník bez mapy = nezaškrtnuto', !OSM.some(c => cenikDleNabidkyJe(stary, c)));
  cenikDoplnKlice(stary, DEFAULT_CENIK);
  test('migrace (doplnění klíčů z výchozího ceníku) příznak nepřidá', stary.dleNabidky === undefined
    && !cenikDleNabidkyJe(stary, STENA), stary.dleNabidky); }
{ const c = {};
  cenikDleNabidkyNastav(c, STENA, true);
  test('nastavení příznaku zapíše true', c.dleNabidky && c.dleNabidky[STENA] === true, c);
  cenikDleNabidkyNastav(c, STENA, false);
  test('odškrtnutí položku z mapy smaže; prázdná mapa zůstane = výslovně nic', JSON.stringify(c.dleNabidky) === '{}', c); }

console.log('— návrh v Nastavení → Ceník (J. V. 16. 10.: „předzaškrtnuté v UI“) —');
test('funkce cenikDleNabidkyNavrh / cenikDleNabidkyDoplnNavrh existují', fn('cenikDleNabidkyNavrh') && fn('cenikDleNabidkyDoplnNavrh'));
if (fn('cenikDleNabidkyNavrh') && fn('cenikDleNabidkyDoplnNavrh')) {
  const stary = ZC.zkusebniCenik();
  test('ceník bez mapy: návrh ukáže výchozích osm zaškrtnutých', OSM.every(x => cenikDleNabidkyNavrh(stary, x))
    && !cenikDleNabidkyNavrh(stary, 'C.priplatky.ventilatorKc'));
  test('… ale platí dál nezaškrtnuto (do zveřejnění se hlídá)', !OSM.some(x => cenikDleNabidkyJe(stary, x)));
  const prazdna = ZC.zkusebniCenik(); prazdna.dleNabidky = {};
  test('výslovně prázdná mapa: návrh nic nezaškrtne', !OSM.some(x => cenikDleNabidkyNavrh(prazdna, x)));
  const vlastni = ZC.zkusebniCenik(); vlastni.dleNabidky = { 'C.priplatky.ventilatorKc': true };
  test('vlastní mapa: návrh = mapa', cenikDleNabidkyNavrh(vlastni, 'C.priplatky.ventilatorKc') && !cenikDleNabidkyNavrh(vlastni, STENA));
  const k = ZC.zkusebniCenik();
  test('doplnění návrhu do podkladu ke zveřejnění: osm položek', cenikDleNabidkyDoplnNavrh(k) === true
    && Object.keys(k.dleNabidky).length === 8 && OSM.every(x => k.dleNabidky[x] === true), k.dleNabidky);
  test('ceník, který mapu má (i prázdnou), se nedoplňuje', cenikDleNabidkyDoplnNavrh(prazdna) === false && JSON.stringify(prazdna.dleNabidky) === '{}');
  const z = programZaznam({ cenik: k, cenikProj: ZC.zkusebniCenikProj() }, 1);
  test('zveřejnění návrhu zapíše osm příznaků do verze', Object.keys(z.cenik.dleNabidky || {}).length === 8, z.cenik.dleNabidky);
  const zp = programZaznam({ cenik: prazdna, cenikProj: ZC.zkusebniCenikProj() }, 1);
  test('zveřejnění výslovně prázdné mapy ji zachová (návrh se pak už nevnucuje)', JSON.stringify(zp.cenik.dleNabidky) === '{}', zp.cenik);
}
{ const o = cenikDleNabidkyOciste({ [STENA]: true, 'C.priplatky.ventilatorKc': 1, 'C.neexistuje': true,
    'PC.sazby.projektant': true, '__proto__': true, 'C.priplatky.malbaSchodnicKc': false });
  test('očista: jen známé cesty OCK s hodnotou true', JSON.stringify(o) === JSON.stringify({ [STENA]: true }), o);
  test('očista nesmyslu vrátí prázdnou mapu', JSON.stringify(cenikDleNabidkyOciste('x')) === '{}'); }

console.log('— zveřejnění —');
{ const c = platnyCenik(false); c.dleNabidky = { [STENA]: true, 'C.vymysleno': true };
  const z = programZaznam({ cenik: c, cenikProj: ZC.zkusebniCenikProj() }, 1);
  test('zveřejněný záznam nese očištěnou mapu příznaků', JSON.stringify(z.cenik.dleNabidky) === JSON.stringify({ [STENA]: true }), z.cenik.dleNabidky);
  const bez = programZaznam({ cenik: platnyCenik(false), cenikProj: ZC.zkusebniCenikProj() }, 1);
  test('otisk se mění se změnou příznaku (zveřejnění samotného příznaku nebude „beze změny")', z.otisk !== bez.otisk, [z.otisk, bez.otisk]);
  const prazdna = platnyCenik(false); prazdna.dleNabidky = {};
  const zp = programZaznam({ cenik: prazdna, cenikProj: ZC.zkusebniCenikProj() }, 1);
  test('ceník bez příznaků má otisk jako dřív (prázdná mapa nic nemění)', zp.otisk === bez.otisk, [zp.otisk, bez.otisk]);
  test('programBezeZmeny: změna jen příznaku je změna',
    !programBezeZmeny({ platny: bez }, { cenik: c, cenikProj: ZC.zkusebniCenikProj() })); }

console.log('— cenová výjimka —');
{ const z = varianta(); const d = z.varianty[0].data;
  d.cenik.priplatky.prosklenaStenaKc = 12000;
  const o = obsah(d);
  test('příznak v platném ceníku: vlastní cena stěny výjimku nezaloží', o.prazdny, o);
  const zab = vyjimkyZamekProblem(z, z.varianty[0], { role: 'Obchodník' }, { program: { platny: PLATNY }, smi: () => false });
  test('zámek obchodníka bez schválení: žádná zábrana', zab === '', zab);
  d.cenik.priplatky.prosklenaStenaKc = 90000;
  test('vlastní cena nad orientační: taky bez výjimky', obsah(d).prazdny); }
{ const z = varianta(); const d = z.varianty[0].data;
  d.cenik.priplatky.ventilatorKc = 15000;
  const o = obsah(d);
  test('běžný příplatek pod ceníkem: výjimka (1 položka OCK)', o.polozek === 1 && o.smes[0].cesta === 'C.priplatky.ventilatorKc', o);
  const t = vyjimkyText(o);
  test('hláška je konkrétní: „<název>: cena pod ceníkem"', /^Ventilátor[^:]*: cena pod ceníkem/.test(t) && !/směs/.test(t), t);
  const zab = vyjimkyZamekProblem(z, z.varianty[0], { role: 'Obchodník' }, { program: { platny: PLATNY }, smi: () => false });
  test('zámek obchodníka bez schválení: zábrana s názvem položky', /Ventilátor.*cena pod ceníkem.*schválením nadřízeného/.test(zab), zab); }
{ const z = varianta(); const d = z.varianty[0].data;
  d.cenik.priplatky.ventilatorKc = 25000;
  const t = vyjimkyText(obsah(d));
  test('cena NAD ceníkem: znění směsi zůstává', /směs platného ceníku a starších cen/.test(t), t); }
{ const z = varianta(); const d = z.varianty[0].data;
  cenikOznacJakoDnesni(d, { verze: 2 });                          // varianta ze starší verze
  d.cenik.priplatky.ventilatorKc = 15000;
  const t = vyjimkyText(obsah(d));
  test('skutečná směs starších cen (razítko starší verze): znění směsi zůstává', /směs platného ceníku a starších cen \(1 položka OCK\)/.test(t) && !/pod ceníkem/.test(t), t); }
{ const z = varianta(); const d = z.varianty[0].data;
  d.cenik.priplatky.ventilatorKc = 15000; d.cenik.priplatky.prosklenaStenaKc = 1000;
  const o = obsah(d);
  test('stěna s příznakem + ventilátor pod ceníkem: posuzuje se jen ventilátor', o.polozek === 1 && o.smes[0].cesta === 'C.priplatky.ventilatorKc', o); }
{ const P = { verze: 3, cenik: platnyCenik(false), cenikProj: ZC.zkusebniCenikProj(), zahranicni: { ceny: {}, jenZahr: {} } };
  const z = varianta(P); const d = z.varianty[0].data;
  d.cenik.dleNabidky = { [STENA]: true };                          // podstrčený příznak
  d.cenik.priplatky.prosklenaStenaKc = 12000;
  const o = obsah(d, P);
  test('podstrčený příznak v ceníku varianty: výjimka vzniká dál', o.polozek === 1 && o.smes[0].cesta === STENA, o);
  test('… a hláška říká „cena pod ceníkem"', /Prosklená stěna vedle šachty: cena pod ceníkem/.test(vyjimkyText(o)), vyjimkyText(o)); }
{ const P = { cenik: platnyCenik(false), cenikProj: ZC.zkusebniCenikProj(), zahranicni: { ceny: {}, jenZahr: {} } };
  const z = varianta(P); const d = z.varianty[0].data;
  d.cenik.priplatky.prosklenaStenaKc = 12000;
  test('starý platný ceník bez příznaku: stěna se hlídá jako dnes', obsah(d, P).polozek === 1); }

console.log('— automatický přepočet —');
{ const z = varianta(); const d = z.varianty[0].data;
  d.cenik.priplatky.prosklenaStenaKc = 12000; d.cenik.priplatky.ventilatorKc = 15000;
  cenikPrepoctiRozpracovane(z, { cenik: PLATNY.cenik, proj: { cenik: PLATNY.cenikProj } }, {});
  test('rozdělaná zakázka: vlastní cena položky s příznakem zůstane', d.cenik.priplatky.prosklenaStenaKc === 12000, d.cenik.priplatky);
  test('rozdělaná zakázka: běžný příplatek se srovná s ceníkem', d.cenik.priplatky.ventilatorKc === 20000, d.cenik.priplatky); }
{ const z = varianta(); z.cislo = ''; z.nazevAkce = ''; const d = z.varianty[0].data;
  d.cenik.priplatky.prosklenaStenaKc = 0;
  cenikPrepoctiRozpracovane(z, { cenik: PLATNY.cenik, proj: { cenik: PLATNY.cenikProj } }, {});
  test('prázdná nová zakázka: orientační cena se předvyplní z ceníku', d.cenik.priplatky.prosklenaStenaKc === 50000, d.cenik.priplatky); }

console.log('— serverová kontrola ceníku (B128) —');
{ const prog = { platny: Object.assign({ verze: 1 }, PLATNY), historie: [] };
  const zak0 = varianta(); const stara = kopie(zak0);
  const zak = kopie(zak0); zak.varianty[0].data.cenik.priplatky.prosklenaStenaKc = 12000;
  const p = uloCenikProblemy(zak, stara, { role: 'Obchodník', matice: null, program: prog, importuj: importZakazka });
  test('obchodník: vlastní cena položky s příznakem projde kontrolou ceníku', !p.length, p);
  const zz = kopie(zak0); zz.varianty[0].data.cenik.priplatky.prosklenaStenaKc = -5000;
  const pz = uloCenikProblemy(zz, stara, { role: 'Obchodník', matice: null, program: prog, importuj: importZakazka });
  test('záporná cena položky s příznakem neprojde', pz.some(x => /prosklenaStenaKc/.test(x.kde)), pz);
  const zv = kopie(zak0); zv.varianty[0].data.cenik.priplatky.ventilatorKc = 15000;
  const pv = uloCenikProblemy(zv, stara, { role: 'Obchodník', matice: null, program: prog, importuj: importZakazka });
  test('běžný příplatek mimo ceník neprojde jako dnes', pv.some(x => /ventilatorKc/.test(x.kde)), pv);
  const P0 = { platny: Object.assign({ verze: 1 }, PLATNY, { cenik: platnyCenik(false) }), historie: [] };
  const zs0 = varianta({ cenik: P0.platny.cenik, cenikProj: PLATNY.cenikProj }); const st0 = kopie(zs0);
  const zs = kopie(zs0); zs.varianty[0].data.cenik.dleNabidky = { [STENA]: true };
  zs.varianty[0].data.cenik.priplatky.prosklenaStenaKc = 12000;
  const ps = uloCenikProblemy(zs, st0, { role: 'Obchodník', matice: null, program: P0, importuj: importZakazka });
  test('podstrčený příznak ve variantě: kontrola ceníku odmítne jako dnes', ps.some(x => /prosklenaStenaKc/.test(x.kde)), ps); }


/* B180 (audit kola 26, 17. 10. 2026): rozpis „Zveřejnit ceník" vypisoval jen
 * rozdíly CEN. Změna příznaků v něm nebyla vidět — a mapa jde do platné
 * verze z ceníku otevřené varianty (B179). Pojistka proti prázdnému testu:
 * proti e2c773a (v16.10.5) padá (chybí cenikDleNabidkyRozpis, rozpis ho nevolá). */
{ const P = fn('cenikDleNabidkyRozpis') ? cenikDleNabidkyRozpis : () => 'CHYBÍ';
  const MONT = 'C.montazHodKc';
  test('B180: beze změny příznaků je řádek prázdný', P({ dleNabidky: { [STENA]: true } }, { dleNabidky: { [STENA]: true } }) === '');
  test('B180: oba bez mapy → prázdný', P({}, {}) === '');
  const t = P({ dleNabidky: { [STENA]: true } }, { dleNabidky: { [MONT]: true } });
  test('B180: nový příznak s názvem položky a znaménkem +', /nově 1/.test(t) && /\+ Montáž/i.test(t), t);
  test('B180: zrušený příznak se znaménkem −', /zrušeno 1/.test(t) && /− .*[Pp]rosklen/.test(t), t);
  const n = P({}, { dleNabidky: Object.fromEntries(CENIK_DLE_NABIDKY_VYCHOZI.map(k => [k, true])) });
  test('B180: platný bez mapy, zveřejňuje se návrh → „nově 8"', /nově 8/.test(n), n);
  test('B180: hodnota jiná než true se nepočítá', P({}, { dleNabidky: { [MONT]: 'true' } }) === '');
  test('B180: neznámá cesta ze staré mapy nespadne (název = cesta)', /zrušeno 1/.test(P({ dleNabidky: { '__proto__x': true } }, {})));
  const ui = require('fs').readFileSync(__dirname + '/ui/program_ui.js', 'utf8');
  const roz = (ui.match(/function progZverejniRozpis[\s\S]*?\n}\n/) || [''])[0];
  test('B180: progZverejniRozpis volá cenikDleNabidkyRozpis (platný × zveřejňovaný ceník)',
    /cenikDleNabidkyRozpis\(db\.platny && db\.platny\.cenik, ctx && ctx\.cenik\)/.test(roz), roz.slice(0, 200));
  test('B180: „Ceník beze změny" jen bez změny příznaků', /!cr\.length && !zahr\.length && !dn/.test(roz));
  /* Funkce dialogu doopravdy spuštěná (UI soubor v Node nejde načíst celý):
   * ceny beze změny, mění se jen příznak → rozpis ho vypíše. */
  const rozpis = new Function('programRozdily', 'programRozdilyZahr', 'cenikDleNabidkyRozpis',
    roz + '\nreturn progZverejniRozpis;')(() => [], () => [], P);
  const txt = rozpis({ platny: { cenik: { dleNabidky: { [STENA]: true } } } }, { cenik: { dleNabidky: { [STENA]: true, [MONT]: true } } });
  test('B180: dialog — jen nový příznak → řádek s montáží, ne „Ceník beze změny"',
    /\+ Montáž/.test(txt) && !/Ceník beze změny/.test(txt), txt); }

console.log('— B179: jen příplatky, mapa pro zveřejnění z platného ceníku —');
/* Pokus kola 26 (podklady/AUDIT26_pokus_B179_priznak.mjs). Pojistka proti
 * prázdnému testu: proti v17.10.1 (54174ee) padá (očista pustí montáž,
 * cenikDleNabidkyJe ji uzná, progKontext zveřejní mapu varianty). */
{ const MONT = 'C.montazHodKc', VENT = 'C.priplatky.ventilatorKc';
  test('B179: očista pustí jen příplatky', JSON.stringify(cenikDleNabidkyOciste({ [STENA]: true, [MONT]: true, 'C.profilasKgKc': true }))
    === JSON.stringify({ [STENA]: true }), cenikDleNabidkyOciste({ [STENA]: true, [MONT]: true }));
  test('B179: příznak u montáže v (starší) platné mapě neplatí', !cenikDleNabidkyJe({ dleNabidky: { [MONT]: true } }, MONT)
    && cenikDleNabidkyJe({ dleNabidky: { [STENA]: true } }, STENA));
  const d = varianta().varianty[0].data; d.cenik.montazHodKc = 1;
  const P = kopie(PLATNY); P.cenik.dleNabidky = { [STENA]: true, [MONT]: true };
  const o = obsah(d, P);
  test('B179: montáž pod ceníkem je výjimka i s příznakem v platné mapě', o.smes.some(x => x.cesta === MONT), o.smes);
  const PZ = fn('cenikDleNabidkyProZverejneni') ? cenikDleNabidkyProZverejneni : () => ({ CHYBI: true });
  const j = x => JSON.stringify(Object.keys(x).sort());
  test('B179: zveřejní se mapa platného ceníku (bez změn)', j(PZ({ dleNabidky: { [STENA]: true } }, {})) === j({ [STENA]: true }));
  test('B179: změny správce — + ventilátor, − stěna, montáž ignorována',
    j(PZ({ dleNabidky: { [STENA]: true } }, { [VENT]: true, [STENA]: false, [MONT]: true })) === j({ [VENT]: true }));
  test('B179: platný bez mapy → návrh osmi výchozích (S13 předzaškrtnutí)', j(PZ({}, {})) === j(Object.fromEntries(CENIK_DLE_NABIDKY_VYCHOZI.map(k => [k, true]))));
  test('B179: výchozích osm je celé v příplatcích', CENIK_DLE_NABIDKY_VYCHOZI.length === 8 && CENIK_DLE_NABIDKY_VYCHOZI.every(k => cenikDleNabidkySmi(k)));
  /* progKontext a sloupec Nastavení → Ceník doopravdy spuštěné (výřezy UI). */
  const vm = require('vm'), fs = require('fs');
  const cui = fs.readFileSync(__dirname + '/ui/cenik_ui.js', 'utf8'), pui = fs.readFileSync(__dirname + '/ui/program_ui.js', 'utf8');
  const vyrez = (t, od, po) => { const a = t.indexOf(od); const b = t.indexOf(po, a); return a < 0 || b < 0 ? '' : t.slice(a, b); };
  const kod = vyrez(cui, '/* Příznak „cena dle nabídky" (S13', 'function cenikDleNabidkySloupec()')
    + (pui.match(/function progKontext[\s\S]*?\n}\n/) || [''])[0];
  const ctxVm = { jeAdmin: () => true, progZprava: () => {}, render: () => {},
    cenikDleNabidkyProZverejneni, cenikDleNabidkySmi, cenikDleNabidkyJe, cenikDleNabidkyMaMapu, cenikDoplnKlice, cenikZverejneniOcisti,
    DEFAULT_CENIK: Object.assign(kopie(PLATNY.cenik), { dleNabidky: { [VENT]: true } }), DEFAULT_CENIK_PROJ: kopie(PLATNY.cenikProj) };
  const zv = varianta(); const dv = zv.varianty[0].data; dv.cenik.dleNabidky = { [STENA]: true, [MONT]: true };
  ctxVm.ZAK = zv; ctxVm.aktivniVarianta = z => z.varianty[0];
  vm.createContext(ctxVm);
  let ctx = null;
  try { vm.runInContext(kod + '\n;globalThis.__k = progKontext;globalThis.__set = cenikDleNabidkySet;', ctxVm); ctx = ctxVm.__k(''); } catch (e) { ctx = { chyba: String(e) }; }
  test('B179: progKontext zveřejní mapu platného ceníku, ne mapu varianty (bez montáže a stěny)',
    ctx && ctx.cenik && j(ctx.cenik.dleNabidky || {}) === j({ [VENT]: true }), ctx && (ctx.chyba || (ctx.cenik && ctx.cenik.dleNabidky)));
  try { ctxVm.__set(STENA, true); ctxVm.__set(MONT, true); ctxVm.__set(VENT, false); ctx = ctxVm.__k(''); } catch (e) { ctx = { chyba: String(e) }; }
  test('B179: výslovné změny správce se zveřejní (+ stěna, − ventilátor), montáž ne',
    ctx && ctx.cenik && j(ctx.cenik.dleNabidky || {}) === j({ [STENA]: true }), ctx && (ctx.chyba || (ctx.cenik && ctx.cenik.dleNabidky)));
  test('B179: ceník varianty se nezměnil', j(dv.cenik.dleNabidky) === j({ [STENA]: true, [MONT]: true }));
  test('B179: sloupec Nastavení → Ceník — zaškrtávátko jen u příplatků', /typ \|\| !cenikDleNabidkySmi\(path\)/.test(cui)); }

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
