/* ============================================================
 * TECHNICKÁ SPECIFIKACE SE ŘÍDÍ CENOU (22. 9. 2026 večer)
 *
 * Specifikace je příloha smlouvy. Řádek, který zákazníkovi slibuje práci,
 * za kterou v ceně neplatí — nebo popírá dodávku, kterou si zaplatil —, je
 * horší než chybějící řádek: zákazník si z dokumentu vybere výklad, který
 * je pro něj výhodnější, a firma ho pak musí dodržet.
 *
 * DVA PŘÍPADY Z P8, OBA ROZHODL J. V.:
 *
 *  (6) STATIKA — „statiku nastav tak, ať dokument respektuje to, co je
 *      v ceně". Položka STATICKÉ POSOUZENÍ se dá v kalkulaci vypnout
 *      (množstvím 0, vyřazením z počítání), pole specifikace ale mělo
 *      pevné „ano" a šlo přepsat na „ne" i se statikou v ceně.
 *
 *  (7) LEŠENÍ — „když je lešení vnější zaškrtnuté, musí řádek LEŠENÍ KOLEM
 *      OCK… říct, že je v dodávce". Ten řádek stojí v sekci SOUČÁSTÍ DODÁVKY
 *      NENÍ; u lešení v základní ceně proto z dokumentu zmizí. A od 22. 9.
 *      večer je vnější lešení u interiérové šachty příplatkem („vnější
 *      lešení vrať do příplatkových položek"), takže o něm specifikace musí
 *      mluvit jako o příplatku.
 *
 * Měří se přes `tsHodnota`, tedy přesně tou cestou, kterou jde nabídka
 * i obrazovka — ne přes vnitřní pomocné funkce. ŽÁDNÉ CENY: zkušební ceník.
 * ============================================================ */
const fs = require('fs');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const tsm = require('./techspec.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
const pole = {};
tsm.TECHSPEC_DEF.forEach(s => s.pole.forEach(p => { pole[p.id] = p; }));

const zadani = (uprav) => {
  const z = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
  if (uprav) uprav(z);
  return z;
};
/* Obě varianty výpočtu: Model 1 (1:1 Excel) i Model 2 (opravený). Řádek
 * statiky i lešení vzniká v obou stejně a specifikace se nesmí lišit podle
 * toho, který model obchodník zvolil. */
const REZIMY = [[false, 'Excel 1:1'], [true, 'opravený']];
const hodnota = (id, z, rucne, rezim) => {
  const r = eng.vypocet(z, ZC.zkusebniCenik(), JEKLY, rezim);
  const ts = { hodnoty: Object.assign({}, rucne || {}), extra: [] };
  return tsm.tsHodnota(pole[id], ts, r, z, ZC.zkusebniCenik());
};

/* ---------- STATIKA ---------- */

REZIMY.forEach(([rezim, jm]) => {
  const sfx = ' [' + jm + ']';
  const vychozi = hodnota('statika', zadani(), null, rezim);
  test('výchozí zakázka má statiku v ceně → „ano"' + sfx, vychozi.text === 'ano', vychozi);
  test('a hlásí, že hodnota je z kalkulace, ne ruční' + sfx,
    vychozi.odvozeno === true && vychozi.zdroj === 'z kalkulace', vychozi);

  /* Vypnutí množstvím 0 — zavedený způsob, jak v kalkulaci OCK položku
   * vypnout (štítek „vypnuto (množství 0)"). */
  const nula = hodnota('statika', zadani(z => { z.mnozstviPrepis = { 'STATICKÉ POSOUZENÍ': 0 }; }), null, rezim);
  test('statika vypnutá množstvím 0 → „ne"' + sfx, nula.text === 'ne', nula);

  /* Vyřazení z počítání (sloupec Výchozí pro nové zakázky, `nepocitat`). */
  const vyrazena = hodnota('statika', zadani(z => { z.nepocitat = ['STATICKÉ POSOUZENÍ']; }), null, rezim);
  test('statika vyřazená z počítání → „ne"' + sfx, vyrazena.text === 'ne', vyrazena);

  /* RUČNÍ HODNOTA CENU NEPŘEBIJE — to je celý smysl opravy. */
  const rucneNe = hodnota('statika', zadani(), { statika: 'ne' }, rezim);
  test('ruční „ne" se statikou v ceně se nepoužije → „ano"' + sfx, rucneNe.text === 'ano', rucneNe);
  const rucneAno = hodnota('statika', zadani(z => { z.mnozstviPrepis = { 'STATICKÉ POSOUZENÍ': 0 }; }),
    { statika: 'ano' }, rezim);
  test('ruční „ano" bez statiky v ceně se nepoužije → „ne"' + sfx, rucneAno.text === 'ne', rucneAno);
});

/* Přejmenovaný řádek je pořád statika — hledá se podle ceníkové cesty. */
{
  const z = zadani(zz => { zz.nazvyPrepis = { 'STATICKÉ POSOUZENÍ': 'Statický výpočet' }; });
  test('přejmenovaná položka statiky se pořád pozná', hodnota('statika', z, null, true).text === 'ano');
}

/* Nulová CENA při nenulovém množství je statika zdarma — dělá se, takže
 * „ano". Jinak by „uděláme to zadarmo" v dokumentu znamenalo „neuděláme". */
{
  const r = eng.vypocet(zadani(), Object.assign(ZC.zkusebniCenik(), { statikaKc: 0 }), JEKLY, true);
  const h = tsm.tsHodnota(pole.statika, { hodnoty: {}, extra: [] }, r, zadani(), {});
  test('statika zdarma (cena 0, množství > 0) → „ano"', h.text === 'ano', h);
}

/* Bez výsledku výpočtu (obrazovka před prvním přepočtem) platí výchozí text,
 * ne výjimka. Ruční hodnota tam platí, protože cena ještě nic neříká. */
{
  const h = tsm.tsHodnota(pole.statika, { hodnoty: {}, extra: [] }, null, zadani(), {});
  test('bez výsledku výpočtu platí výchozí „ano"', h.text === 'ano', h);
}

/* Ruční hodnota se NEMAŽE — jen se nepoužije. Kdyby ji odvození smazalo,
 * zmizela by i tam, kde by se cena později vrátila k ručnímu rozhodování. */
{
  const ts = { hodnoty: { statika: 'ne' }, extra: [] };
  tsm.tsHodnota(pole.statika, ts, eng.vypocet(zadani(), ZC.zkusebniCenik(), JEKLY, true), zadani(), {});
  test('ruční hodnota zůstává v datech', ts.hodnoty.statika === 'ne', ts.hodnoty);
}

/* ---------- LEŠENÍ ---------- */

const ext = (lesVne) => zadani(z => { z.typSachty = 'exteriérová';
  z.volitelne = Object.assign({}, z.volitelne, { leseniVnejsi: lesVne }); });
const int = (lesVne) => zadani(z => { z.typSachty = 'interiérová';
  z.volitelne = Object.assign({}, z.volitelne, { leseniVnejsi: lesVne }); });

REZIMY.forEach(([rezim, jm]) => {
  const sfx = ' [' + jm + ']';
  /* Exteriérová s lešením v základní ceně: řádek výš říká „je součástí",
   * řádek v SOUČÁSTÍ DODÁVKY NENÍ se vynechá. */
  const vne = hodnota('leseniVne', ext(true), null, rezim);
  test('exteriérová s lešením v ceně: LEŠENÍ – VNĚ ŠACHTY „je součástí dodávky"' + sfx,
    /je součástí dodávky/.test(vne.text), vne);
  const neni = hodnota('neni3', ext(true), null, rezim);
  test('a řádek LEŠENÍ KOLEM OCK v „Součástí dodávky není" se vynechá' + sfx,
    neni.text === '' && neni.odvozeno === true, neni);
  /* Ani ruční text ho tam nevrátí — jinak by se rozpor dal vyrobit rukou. */
  const neniRucne = hodnota('neni3', ext(true), { neni3: 'zajistí objednatel v rámci SP' }, rezim);
  test('ani ruční text ho tam nevrátí' + sfx, neniRucne.text === '', neniRucne);

  /* Exteriérová bez lešení v ceně: vše jako dřív. */
  const vneBez = hodnota('leseniVne', ext(false), null, rezim);
  test('exteriérová bez lešení: „lze doplnit viz příplatkové ceny"' + sfx,
    /příplatkové ceny/.test(vneBez.text), vneBez);
  const neniBez = hodnota('neni3', ext(false), null, rezim);
  test('a řádek LEŠENÍ KOLEM OCK zůstává s výchozím textem' + sfx,
    neniBez.text === 'zajistí objednatel v rámci SP' && !neniBez.odvozeno, neniBez);
  /* Mimo případ „v ceně" volí text dál obchodník. */
  const neniBezRucne = hodnota('neni3', ext(false), { neni3: 'jiný text' }, rezim);
  test('a obchodník ho může přepsat' + sfx, neniBezRucne.text === 'jiný text', neniBezRucne);

  /* Interiérová: lešení je příplatek, i když je ve volitelných zaškrtnuté
   * (předvolba z matice Výchozí). Specifikace nesmí slíbit dodávku. */
  [true, false].forEach(zaskrt => {
    const iv = hodnota('leseniVne', int(zaskrt), null, rezim);
    test('interiérová (zaškrtnuto: ' + zaskrt + '): „lze doplnit viz příplatkové ceny"' + sfx,
      /příplatkové ceny/.test(iv.text), iv);
    const ineni = hodnota('neni3', int(zaskrt), null, rezim);
    test('interiérová (zaškrtnuto: ' + zaskrt + '): řádek LEŠENÍ KOLEM OCK zůstává' + sfx,
      ineni.text === 'zajistí objednatel v rámci SP', ineni);
  });
});

/* Pojistka proti prázdnému testu: odvozená pole jsou opravdu dvě
 * a ostatní pole specifikace se chovají jako dřív (ruční hodnota platí). */
{
  const odvozena = Object.keys(pole).filter(id => typeof pole[id].odvozene === 'function');
  test('odvozená pole jsou právě statika a lešení kolem OCK',
    odvozena.sort().join(',') === 'neni3,statika', odvozena);
  const jine = hodnota('dilenskaDok', zadani(), { dilenskaDok: 'ne' }, true);
  test('běžné pole dál bere ruční hodnotu', jine.text === 'ne' && jine.zdroj === 'ručně', jine);
}

/* N48 (hloubkový test 24. 9. 2026): specifikace nesmí slibovat položku,
 * kterou obchodník z ceny vyřadil (seznam nepocitat nebo množství 0). */
{
  const T = (id, uprav) => hodnota(id, zadani(uprav), null, true).text;
  const vyrad = (nazev) => z => { z.nepocitat = [nazev]; };
  test('N48: 3D sken v ceně → ano', T('sken3d') === 'ano', T('sken3d'));
  test('N48: 3D sken vyřazený → ne', T('sken3d', vyrad('ZAMĚŘENÍ 3D SKENEREM')) === 'ne');
  test('N48: dílenská dokumentace vyřazená → ne', T('dilenskaDok', vyrad('DÍLENSKÁ DOKUMENTACE')) === 'ne');
  test('N48: dílenská dokumentace s množstvím 0 → ne',
    T('dilenskaDok', z => { z.mnozstviPrepis = { 'DÍLENSKÁ DOKUMENTACE': 0 }; }) === 'ne');
  test('N48: vyřazená střecha (EXT) → není součástí nabídky', T('strecha', vyrad('ZASTŘEŠENÍ ŠACHTY (EXT)')) === 'není součástí nabídky');
  test('N48: střecha v ceně zůstává', /pultová/.test(T('strecha')));
  test('N48: vyřazená větrací mřížka → není součástí nabídky', T('odvetrani', vyrad('VĚTRACÍ MŘÍŽKA (EXT)')) === 'není součástí nabídky');
  test('N48: vyřazený montážní nosník → není součástí nabídky', T('montazniNosnik', vyrad('PROFILY - MONTÁŽNÍ NOSNÍK')) === 'není součástí nabídky');
  test('N48: nosník v ceně → na horním nosném rámu', T('montazniNosnik') === 'na horním nosném rámu OCK');
  test('N48: přechodové plechy podle volby „v ceně", ne podle starého pole',
    /nejsou součástí/.test(T('prechodovePlechy', z => { z.prechodovePlechy = true; z.volitelne.prechodove = false; }))
    && /nerezový/.test(T('prechodovePlechy', z => { z.prechodovePlechy = false; z.volitelne.prechodove = true; })));
  const rucne = tsm.tsHodnota(pole.sken3d, { hodnoty: { sken3d: 'ano' }, extra: [] },
    eng.vypocet(zadani(vyrad('ZAMĚŘENÍ 3D SKENEREM')), ZC.zkusebniCenik(), JEKLY, true), zadani(), ZC.zkusebniCenik());
  test('N48: ruční volba dál vyhrává', rucne.text === 'ano' && rucne.zdroj === 'ručně', rucne);
}

/* N49: nabízený příplatek → „lze doplnit – viz příplatkové ceny". */
{
  const T = (id, uprav) => hodnota(id, zadani(uprav), null, true).text;
  test('N49: zábrany v nabídce → lze doplnit', T('zabranyVstupy') === tsm.TS_LZE_DOPLNIT, T('zabranyVstupy'));
  test('N49: zábrany vynechané z nabídky → zajistí objednatel',
    T('zabranyVstupy', z => { z.priplatkyVynechat = ['zabranyDvere']; }) === 'není součástí dodávky, zajistí objednatel');
  test('N49: ventilátor v nabídce (EXT) → lze doplnit', T('neni2') === tsm.TS_LZE_DOPLNIT);
  test('N49: interiér ventilátor nenabízí → není požadováno', T('neni2', z => { z.typSachty = 'interiérová'; }) === 'není požadováno');
  test('N49: ohrazení proti pádu v nabídce → lze doplnit', T('ohrazeniProtiPadu') === tsm.TS_LZE_DOPLNIT);
  test('N49: nové znění je v číselníku', tsm.TS_C.stavebniPrace.includes(tsm.TS_LZE_DOPLNIT) && tsm.TS_C.dodavkaPozn.includes(tsm.TS_LZE_DOPLNIT));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
