/* POJISTKY VÝPOČETNÍHO JÁDRA, KTERÉ DŘÍV HLÍDAL JEN EXCEL (23. 9. 2026, N19)
 *
 * Mutační testování jádra (`mutace_jadro.mjs`) je od 23. 9. 2026 v repozitáři.
 * První běh tady ukázal 11 míst, jejichž rozbití by žádná sada nezachytila.
 * Dřív je hlídaly sady shody s excelovou předlohou (`test.js`,
 * `test_proj.js`), jenže ty potřebují skutečný ceník a v repozitáři záměrně
 * nejsou — v CI ani v cloudu tedy tahle místa nehlídal nikdo.
 *
 * Tahle sada je hlídá CHOVÁNÍM nad zkušebním ceníkem (`zkusebni_cenik.js`,
 * smyšlená čísla). Kde má zkušební ceník dvě sazby náhodou stejné (projektant
 * a zaměření, plechy exteriér a interiér), nastaví se tady schválně různě —
 * jinak by prohození sazeb nebylo z čeho poznat.
 *
 * Mutace jádra, které tahle sada chytá, jsou vypsané u každého bloku.
 */
const eng = require('./engine.js');
const ep = require('./engine_proj.js');
const ZC = require('./zkusebni_cenik.js');
const JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : info); }
};
const kopie = o => JSON.parse(JSON.stringify(o));
const zad = (e) => Object.assign(kopie(eng.DEFAULT_ZADANI), e || {});
const spocti = (z, c, fixes) => eng.vypocet(z, c, JEKLY, fixes !== false);
const radky = r => Object.values(r.sekce).reduce((a, s) => a.concat(s || []), []).concat(r.priplatky || []);
const radek = (r, nazev) => radky(r).find(x => (x.origNazev || x.nazev) === nazev);
const blizko = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-6 : tol);

/* ---------- 1) DPH se počítá ze ZAOKROUHLENÉHO základu ----------
 * mutace: „cena s DPH se počítá z nezaokrouhleného základu" */
{
  const c = ZC.zkusebniCenik();
  const r = spocti(zad({ typSachty: 'exteriérová' }), c);
  const s = r.souhrn;
  test('základní cena je zaokrouhlená na tisíce', s.zakladCena > 0 && s.zakladCena % 1000 === 0, s.zakladCena);
  test('cena s DPH = zaokrouhlený základ × (1 + sazba)', blizko(s.zakladSDph, s.zakladCena * (1 + c.dph), 1e-6),
    JSON.stringify([s.zakladCena, s.zakladSDph, c.dph]));
  test('a základ + daň = cena s DPH (nabídka sedí sama se sebou)', blizko(s.zakladCena + s.zakladDph, s.zakladSDph, 1e-6));
}

/* ---------- 2) plechy: sazba podle provedení šachty ----------
 * mutace: „plechy: prohozená sazba exteriér ↔ interiér" */
{
  const c = ZC.zkusebniCenik();
  c.powertechExt = 311; c.powertechInt = 197;     // smyšlené, schválně různé
  const ext = radek(spocti(zad({ typSachty: 'exteriérová' }), c), 'PLECHY - HLAVNÍ KONSTRUKČNÍ PLECHY');
  const int = radek(spocti(zad({ typSachty: 'interiérová' }), c), 'PLECHY - HLAVNÍ KONSTRUKČNÍ PLECHY');
  test('exteriérová šachta má plechy za sazbu exteriéru', !!ext && ext.cena === 311, ext && ext.cena);
  test('interiérová šachta má plechy za sazbu interiéru', !!int && int.cena === 197, int && int.cena);
}

/* ---------- 3) statické posouzení se účtuje sazbou statiky ----------
 * mutace: „statické posouzení se účtuje sazbou stavbyvedoucího" */
{
  const c = ZC.zkusebniCenik();
  c.statikaKc = 1234; c.stavbyvedouciKc = 987;
  const st = radek(spocti(zad({ typSachty: 'exteriérová' }), c), 'STATICKÉ POSOUZENÍ');
  test('řádek statického posouzení existuje', !!st);
  test('a nese sazbu statiky, ne stavbyvedoucího', !!st && st.cena === 1234, st && st.cena);
}

/* ---------- 4) příplatky se zaokrouhlují nahoru na tisíce ----------
 * mutace: „příplatky se nezaokrouhlují nahoru" */
{
  const c = ZC.zkusebniCenik();
  const r = spocti(zad({ typSachty: 'exteriérová' }), c);
  const nenulove = (r.priplatky || []).filter(p => p.naklad > 0);
  test('výpočet nabízí aspoň jeden nenulový příplatek', nenulove.length > 0, (r.priplatky || []).length);
  test('každý příplatek je v nabídce na celé tisíce',
    nenulove.every(p => p.sMarzi % 1000 === 0), JSON.stringify(nenulove.map(p => [p.nazev, p.sMarzi])));
  test('a zaokrouhlení jde nahoru, ne dolů',
    nenulove.every(p => p.sMarzi >= p.naklad), JSON.stringify(nenulove.map(p => [p.naklad, p.sMarzi])));
}

/* ---------- 5) Model 1 (1:1 jako Excel) drží zdokumentované chyby předlohy ----------
 * mutace: „kompat: opravená chyba $D$3", „kompat: lemování…", „kompat: podesty…",
 * „kompat: opravená chyba D19/D18"
 *
 * Model 1 se nikdy „neopravuje" (pravidlo projektu) — rozdíl proti Modelu 2
 * je záměr a musí zůstat vidět. Proto se tu hlídá, že se oba modely v těch
 * místech LIŠÍ a že Model 2 počítá opravenou hodnotu. */
{
  /* Lakování jen z jedné složky: ostatní sazby na nulu, ať výsledek je
   * přímo plocha, kterou jádro do lakování vzalo. */
  const lakJen = (klic) => {
    const c = ZC.zkusebniCenik();
    Object.keys(c.lak).forEach(k => { if (k !== 'rezim') c.lak[k] = 0; });
    c.lak.rezim = 'tomas'; c.lak[klic] = 1;
    return c;
  };
  const ze = zad({ typSachty: 'exteriérová' });
  const cP = lakJen('tomasProfilM2');
  const m1 = spocti(ze, cP, false), m2 = spocti(ze, cP, true);
  test('lemování existuje (exteriér)', m2.profily.lemovani.m2 > 0, m2.profily.lemovani.m2);
  test('Model 2 lakuje profily i s lemováním',
    blizko(m2.lakovani.tomas, m2.profily.celkemM2 + m2.profily.lemovani.m2, 1e-6),
    JSON.stringify([m2.lakovani.tomas, m2.profily.celkemM2, m2.profily.lemovani.m2]));
  test('Model 1 lemování do lakování nebere (chyba předlohy)', blizko(m1.lakovani.tomas, m1.profily.celkemM2, 1e-6),
    JSON.stringify([m1.lakovani.tomas, m1.profily.celkemM2]));

  const cO = lakJen('tomasOplechM2');
  const vysledky = ['exteriérová', 'interiérová'].map(t => {
    const z = zad({ typSachty: t });
    const a = spocti(z, cO, false), b = spocti(z, cO, true);
    return { t, m1: a.lakovani.tomas, m2: b.lakovani.tomas, ocek2: b.dily.oplDvereM2 + b.dily.podestM2 };
  });
  test('Model 2 lakuje oplechování dveří + podesty',
    vysledky.every(v => blizko(v.m2, v.ocek2, 1e-6)), JSON.stringify(vysledky));
  test('Model 1 bere podesty do lakování jinak (chyba předlohy) — aspoň u jednoho provedení',
    vysledky.some(v => !blizko(v.m1, v.m2, 1e-6)), JSON.stringify(vysledky));

  /* $D$3: kotvení bere Model 1 vždy z exteriérové plochy. */
  const c = ZC.zkusebniCenik();
  const zi = zad({ typSachty: 'interiérová' });
  const kot = (r) => (r.plechy.spojeRows || []).find(x => x.key === 'kotveni');
  const k1 = kot(spocti(zi, c, false)), k2 = kot(spocti(zi, c, true));
  test('řádek spojů „kotveni" existuje', !!k1 && !!k2);
  test('u interiérové šachty se Model 1 a 2 v ploše kotvení liší ($D$3)', !!k1 && !!k2 && !blizko(k1.m2, k2.m2, 1e-9),
    JSON.stringify([k1, k2]));

  /* D19/D18: boční zasklení u lišt + světlíku bere Model 1 hloubku z terčů. */
  const zmen = [];
  /* Projdeme i varianty zasklení, které zadání umí — rozdíl se ukáže jen u
   * lištového zasklení se světlíkem, tak ať ho test najde sám. */
  const zakl = zad({ typSachty: 'exteriérová' });
  const volby = Object.keys(zakl).filter(k => /zasklen|svetlik|terc/i.test(k));
  for (const k of volby) {
    const hodnoty = typeof zakl[k] === 'boolean' ? [true, false]
      : (typeof zakl[k] === 'string' ? ['terce', 'listy', 'mezi', 'ramecek', 'lišty', 'terče', 'mezi příčníky'] : []);
    for (const h of hodnoty) {
      const z = zad({ typSachty: 'exteriérová', [k]: h });
      let a, b;
      try { a = spocti(z, c, false); b = spocti(z, c, true); } catch (e) { continue; }
      if (!blizko(a.zaskleni.bocni.m2, b.zaskleni.bocni.m2, 1e-9)) zmen.push(k + '=' + h);
    }
  }
  test('existuje zasklení, u kterého Model 1 počítá boční sklo jinak (D19/D18)', zmen.length > 0,
    'volby: ' + volby.join(','));
}

/* ---------- 6) projekce ----------
 * mutace: „PROJ: do ceny sekce se nedostane doprava", „PROJ: rezerva hodin
 * se do položky nepřičte", „PROJ: zaměření se účtuje sazbou projektanta" */
{
  const cp = ZC.zkusebniCenikProj();
  cp.sazby = Object.assign({}, cp.sazby, { projektant: 1111, zamereni: 777 });   // smyšlené, schválně různé
  const zp = kopie(ep.DEFAULT_ZADANI_PROJ);
  const s0 = zp.sekce.find(s => s.key === 'zamereni') || zp.sekce[0];
  s0.polozky.forEach(p => { p.vyrazeno = false; });
  s0.doprava = Object.assign({}, s0.doprava || {}, { km: 120, mimoPrahu: true, pausal: 0 });
  const hod = s0.polozky.find(p => p.typ === 'hod');
  hod.rezerva = 3;
  const r = ep.vypocetProj(zp, cp);
  const rs = r.sekce.find(s => s.key === s0.key);
  test('sekce s dopravou má nenulovou dopravu', rs.dopravaKc > 0, rs.dopravaKc);
  test('doprava je v ceně sekce (celkem = cena + doprava)', blizko(rs.celkem, rs.cena + rs.dopravaKc, 1e-6) && rs.celkem > rs.cena,
    JSON.stringify([rs.cena, rs.dopravaKc, rs.celkem]));
  const rp = rs.polozky.find(p => p.nazev === hod.nazev && p.typ === 'hod');
  test('rezerva hodin se do položky přičte', rp.hodinyCelkem === (+hod.hodiny || 0) + 3, JSON.stringify([hod.hodiny, rp.hodinyCelkem]));
  test('a zaplatí se (náklad = hodiny vč. rezervy × sazba)', blizko(rp.naklad, rp.hodinyCelkem * rp.sazbaKc, 1e-6));
  const zam = rs.polozky.find(p => p.nazev === 'Zaměření');
  test('položka Zaměření existuje ve výchozím zadání', !!zam);
  test('a účtuje se sazbou za zaměření, ne projektanta', !!zam && zam.sazbaKc === 777, zam && zam.sazbaKc);
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
