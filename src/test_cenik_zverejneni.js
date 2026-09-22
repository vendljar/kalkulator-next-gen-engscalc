/* Pojistky zveřejnění ceníku (P1, nálezy N1 / N20 / N6, 21. 9. 2026).
 *
 * CO SE STALO: platný ceník verze 27 měl u čtrnácti položek v ČR sloupci
 * zahraniční hodnoty. Vzniklo to cestou, kterou aplikace sama nabízí —
 * varianta přepnutá na řadu Zahraničí má zahraniční ceny přímo ve svém
 * ceníku a „Zveřejnit ceník této varianty jako platný" je vzal jako podklad.
 *
 * Co se tu hlídá:
 *   – zveřejnění z varianty přepnuté na Zahraničí se ZASTAVÍ,
 *   – pozná se to i tehdy, když řadu nikdo nepředá (klíč `rada` v ceníku),
 *   – druhá pojistka: shoda ČR se zahraniční odchylkou u víc než pěti položek,
 *   – runtime klíče `rada` a `jenZahr` se do platného ceníku nezapíšou,
 *   – otisk se porovnává jen se shodnou verzí vzorce (jinak falešné varování),
 *   – nová verze nese počty změn zvlášť pro ČR a zvlášť pro zahraničí.
 *
 * Čísla jsou smyšlená — skutečné sazby do repozitáře nepatří.
 */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); };
nacti('./format.js'); nacti('./cenik.js'); nacti('./cenik_stari.js'); nacti('./cenik_rady.js');
nacti('./program.js');
const ZC = require('./zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const CR = () => ZC.zkusebniCenik();
/* Smyšlené odchylky: dvě běžné ceny a dvě položky, které v tuzemsku nejsou. */
const ZAHR = () => ({
  ceny: { 'C.montazHodKc': 1111, 'C.powertechInt': 222, 'C.prekladyKc': 3333, 'C.cestovniKc': 44444 },
  jenZahr: { 'C.prekladyKc': true, 'C.cestovniKc': true },
});

/* ---------- 1) varianta přepnutá na Zahraničí se nezveřejní ---------- */
{
  const zahr = ZAHR();
  const data = { cenik: CR(), proj: { cenik: {} } };
  cenikRadaPrepni(data, CR(), zahr, 'zahr');

  const ctx = { cenik: data.cenik, cenikProj: data.proj.cenik };
  const v = cenikZverejneniKontrola(ctx, zahr, 'zahr');
  test('zveřejnění ze zahraniční varianty se zastaví', v.ok === false && v.kod === 'zahr', v);
  test('a důvod mluví o řadě Zahraničí', /Zahrani/.test(v.duvod), v.duvod);

  /* Řadu nemusí nikdo předat — `cenikRadaPrepni` ji nechal v ceníku. */
  const bezPredani = cenikZverejneniKontrola(ctx, zahr, undefined);
  test('pozná se i bez předané řady, podle klíče v ceníku',
    bezPredani.ok === false && bezPredani.kod === 'zahr', bezPredani.kod);

  /* Tuzemská varianta projde. */
  const cista = { cenik: CR(), proj: { cenik: {} } };
  const vc = cenikZverejneniKontrola({ cenik: cista.cenik, cenikProj: {} }, zahr, 'cr');
  test('tuzemská varianta projde', vc.ok === true, vc);
}

/* ---------- 2) druhá pojistka: ČR se rovná zahraniční u víc položek ---------- */
{
  /* Podklad, ze kterého někdo klíč `rada` odstranil, ale ceny zůstaly
   * zahraniční. Šest shod = o jednu přes práh. */
  const zahr = { ceny: {}, jenZahr: {} };
  const cr = CR();
  /* Všechny cesty musí být SLEDOVANÉ — `cenikZahrOciste` cizí klíče zahodí
   * (a správně: databáze programu chodí i ze souboru od uživatele). Test
   * s neznámou cestou by měřil očistu, ne práh. */
  const cesty = ['C.montazHodKc', 'C.powertechInt', 'C.prekladyKc',
                 'C.cestovniKc', 'C.striskaDvurKc', 'C.lemovaniKgKc'];
  cesty.forEach((c, i) => { zahr.ceny[c] = 9000 + i; });
  const data = { cenik: cr, proj: { cenik: {} } };
  cesty.forEach(c => cenikNastavHodnotu(data, c, zahr.ceny[c]));

  const v = cenikZverejneniKontrola({ cenik: data.cenik, cenikProj: {} }, zahr, 'cr');
  test('šest shodných cen zveřejnění zastaví', v.ok === false && v.kod === 'shoda', v.kod);
  test('a vypíše konkrétní položky', v.shody.length === 6, v.shody.length);
  test('položky nesou čitelný popis, ne jen cestu',
    v.shody.every(s => s.popis && s.cesta), v.shody[0]);

  /* Pět shod je pod prahem — projde. Práh je pojistka, ne pravidlo. */
  const maloZahr = { ceny: {}, jenZahr: {} };
  const malo = { cenik: CR(), proj: { cenik: {} } };
  cesty.slice(0, 5).forEach((c, i) => {
    maloZahr.ceny[c] = 9000 + i;
    cenikNastavHodnotu(malo, c, 9000 + i);
  });
  const vm = cenikZverejneniKontrola({ cenik: malo.cenik, cenikProj: {} }, maloZahr, 'cr');
  test('pět shod je pod prahem a projde', vm.ok === true, vm.kod);
  test('práh je pět', CENIK_ZVEREJNENI_SHODA_MAX === 5);
}

/* ---------- 2b) pojistku nejde vypnout vynecháním odchylek (B55) ----------
 *
 * Bezpečnostní audit 22. 9. 2026: druhá větev pojistky porovnávala ČR ceny
 * výhradně proti odchylkám Z TÉHOŽ POŽADAVKU. Kdo pole `zahranicni` vynechal,
 * neměl se s čím shodovat a pojistka mlčky vypadla — přitom právě takový
 * podklad je nejpodezřelejší. Uložené odchylky přitom zná server vždycky
 * a v prohlížeči se odjakživa porovnávalo proti nim (`CENIK_ZAHR`). */
{
  const cesty = ['C.montazHodKc', 'C.powertechInt', 'C.prekladyKc',
                 'C.cestovniKc', 'C.striskaDvurKc', 'C.lemovaniKgKc'];
  const ulozene = { ceny: {}, jenZahr: {} };
  cesty.forEach((c, i) => { ulozene.ceny[c] = 9000 + i; });

  /* Podklad se zahraničními cenami v ČR sloupci — přesně to, co má pojistka
   * zastavit. Platná verze má u týchž položek jiné (tuzemské) ceny, takže
   * zveřejněním se opravdu MĚNÍ. */
  const data = { cenik: CR(), proj: { cenik: {} } };
  cesty.forEach(c => cenikNastavHodnotu(data, c, ulozene.ceny[c]));
  const ctx = { cenik: data.cenik, cenikProj: {} };
  const platny = { cenik: CR(), cenikProj: {}, zahranicni: ulozene };

  const bezPole = cenikZverejneniKontrola(ctx, cenikZahrSluc(ulozene, null), 'cr', platny);
  test('B55: vynechané odchylky pojistku nevypnou',
    bezPole.ok === false && bezPole.kod === 'shoda', bezPole.kod);
  test('B55: a vypíše se všech šest položek', bezPole.shody.length === 6, bezPole.shody.length);

  /* Totéž s prázdnou tabulkou v požadavku — vynechat jde i takhle. */
  const prazdne = cenikZverejneniKontrola(ctx, cenikZahrSluc(ulozene, { ceny: {}, jenZahr: {} }),
                                          'cr', platny);
  test('B55: prázdná tabulka v požadavku pojistku taky nevypne', prazdne.ok === false, prazdne.kod);

  /* POJISTKA PROTI PRÁZDNÉMU TESTU: bez sloučení (tedy tak, jak se server
   * choval do 22. 9.) tentýž podklad projde. Jinak by testy výš měřily něco
   * jiného než B55. */
  const pred = cenikZverejneniKontrola(ctx, null, 'cr', platny);
  test('B55: a bez sloučení by týž podklad prošel (stav před opravou)', pred.ok === true, pred.kod);

  /* SLOUČENÍ NESMÍ ZAMKNOUT CENÍK. Kdo ruší víc než pět odchylek a ČR ceny
   * přitom nechává být, musí projít — jinak by odchylky nešlo zrušit nikdy,
   * protože zrušit je lze jedině zveřejněním. Cena shodná s platnou verzí
   * z přepnuté varianty pocházet nemůže: v ceníku je už dnes. */
  const stejny = { cenik: CR(), proj: { cenik: {} } };
  cesty.forEach(c => cenikNastavHodnotu(stejny, c, ulozene.ceny[c]));
  const platnyStejny = { cenik: JSON.parse(JSON.stringify(stejny.cenik)), cenikProj: {},
                         zahranicni: ulozene };
  const ruseni = cenikZverejneniKontrola({ cenik: stejny.cenik, cenikProj: {} },
                                         cenikZahrSluc(ulozene, null), 'cr', platnyStejny);
  test('B55: zrušení všech odchylek beze změny ČR cen projde', ruseni.ok === true, ruseni.kod);

  /* A naopak: bez znalosti platné verze (první zveřejnění vůbec) se chová
   * jako dřív — každá shoda se počítá. */
  const bezPlatne = cenikZverejneniKontrola({ cenik: stejny.cenik, cenikProj: {} },
                                            cenikZahrSluc(ulozene, null), 'cr', null);
  test('B55: bez platné verze se počítá každá shoda', bezPlatne.ok === false, bezPlatne.kod);

  /* Sloučení samo: příchozí hodnota přebíjí uloženou, obě strany se sejdou. */
  const s = cenikZahrSluc({ ceny: { 'C.montazHodKc': 1 }, jenZahr: { 'C.prekladyKc': true } },
                          { ceny: { 'C.montazHodKc': 2, 'C.powertechInt': 3 }, jenZahr: {} });
  test('B55: sloučení – příchozí přebíjí uložené', s.ceny['C.montazHodKc'] === 2, s.ceny);
  test('B55: sloučení – uložené, co v požadavku není, zůstává',
    s.ceny['C.powertechInt'] === 3 && s.jenZahr['C.prekladyKc'] === true, s);
}

/* ---------- 3) runtime klíče řady se nezveřejňují ---------- */
{
  const zahr = ZAHR();
  const data = { cenik: CR(), proj: { cenik: {} } };
  cenikRadaPrepni(data, CR(), zahr, 'zahr');
  test('přepnutá varianta klíče opravdu nese (jinak by test nic neměřil)',
    data.cenik.rada === 'zahr' && !!data.cenik.jenZahr);

  const ocisteny = cenikZverejneniOcisti(data.cenik);
  test('očista klíče odstraní', !('rada' in ocisteny) && !('jenZahr' in ocisteny),
    Object.keys(ocisteny).filter(k => k === 'rada' || k === 'jenZahr'));
  test('a nesáhne na originál', data.cenik.rada === 'zahr');

  /* Tvrdá pojistka v jádru: i když klíče projdou až sem, do záznamu se
   * nezapíšou. Tohle je to místo, kterým prochází UI, server i soubor. */
  const z = programZaznam({ cenik: data.cenik, cenikProj: {} }, 1);
  test('programZaznam klíče řady do verze nezapíše',
    !('rada' in z.cenik) && !('jenZahr' in z.cenik), Object.keys(z.cenik).slice(0, 8));
}

/* ---------- 4) verze vzorce otisku ---------- */
{
  const db = programNovy({ cenik: CR(), cenikProj: {}, kdo: 'a@b.cz' });
  test('nová verze si zapíše verzi vzorce otisku',
    db.platny.otiskVerze === PROG_OTISK_VERZE, db.platny.otiskVerze);

  const nactena = programNormalizuj(JSON.parse(JSON.stringify(db)));
  test('načtená databéze nehlásí ruční zásah',
    nactena.platny.otiskNesedi === undefined && nactena.platny.otiskStaryVzorec === undefined);

  /* Záznam orazítkovaný STARŠÍM vzorcem: otisk nesedí, ale není to zásah. */
  const stary = JSON.parse(JSON.stringify(db));
  stary.platny.otiskVerze = 2;
  stary.platny.otisk = 'abcdef12';
  const nStary = programNormalizuj(stary);
  test('starší vzorec se nehlásí jako ruční zásah', nStary.platny.otiskNesedi === undefined);
  test('ale přizná se, že doložit to nejde', nStary.platny.otiskStaryVzorec === 2,
    nStary.platny.otiskStaryVzorec);

  /* Záznam BEZ čísla vzorce (před touhle pojistkou) — taky se neobviňuje. */
  const bezCisla = JSON.parse(JSON.stringify(db));
  delete bezCisla.platny.otiskVerze;
  bezCisla.platny.otisk = 'abcdef12';
  const nBez = programNormalizuj(bezCisla);
  test('záznam bez čísla vzorce se taky neobviňuje',
    nBez.platny.otiskNesedi === undefined && nBez.platny.otiskStaryVzorec === 0);

  /* Skutečný ruční zásah se pozná dál — pojistka nesmí umlčet i pravdu. */
  const zasah = JSON.parse(JSON.stringify(db));
  cenikSet(zasah.platny.cenik, 'C.montazHodKc', 123456);
  const nZasah = programNormalizuj(zasah);
  test('ruční zásah do cen se pozná dál', !!nZasah.platny.otiskNesedi);
}

/* ---------- 5) počty změn v historii ---------- */
{
  const zahr = ZAHR();
  const db = programNovy({ cenik: CR(), cenikProj: {}, zahranicni: zahr, kdo: 'a@b.cz' });
  test('první verze počty změn nemá', db.platny.zmeny === undefined);

  const cr2 = CR();
  cenikSet(cr2, 'C.montazHodKc', 777);
  cenikSet(cr2, 'C.powertechInt', 88);
  const zahr2 = ZAHR();
  zahr2.ceny['C.montazHodKc'] = 1212;

  const db2 = programNovaVerze(db, { cenik: cr2, cenikProj: {}, zahranicni: zahr2, kdo: 'a@b.cz' });
  test('nová verze nese počty změn', !!db2.platny.zmeny, db2.platny.zmeny);
  test('dvě změny v tuzemské řadě', db2.platny.zmeny.cr === 2, db2.platny.zmeny);
  test('jedna změna v zahraničních odchylkách', db2.platny.zmeny.zahr === 1, db2.platny.zmeny);
  test('a ví se, proti které verzi', db2.platny.zmeny.protiVerzi === 1, db2.platny.zmeny);

  /* Počty jsou metadata — načtení souboru je nesmí ztratit. */
  const nactena = programNormalizuj(JSON.parse(JSON.stringify(db2)));
  test('počty přežijí načtení souboru',
    nactena.platny.zmeny && nactena.platny.zmeny.cr === 2 && nactena.platny.zmeny.zahr === 1,
    nactena.platny.zmeny);

  /* Do otisku počty nevstupují — otisk je otisk CEN, ne metadat. */
  const bezZmen = JSON.parse(JSON.stringify(db2));
  delete bezZmen.platny.zmeny;
  test('otisk na počtech změn nezávisí',
    programNormalizuj(bezZmen).platny.otiskNesedi === undefined);
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
