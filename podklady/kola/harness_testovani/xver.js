// Zámek a přepočet napříč verzemi (lokální sestavení, bez sítě): v19.11.2 (vada) → v19.11.3 (oprava).
const { chromium } = require('playwright'); const fs = require('fs');
const R = '/tmp/claude-0/sp/kolo50/r50/'; const EXP = JSON.parse(fs.readFileSync(R + 'data/test_export.json')); const EXP2 = JSON.parse(fs.readFileSync('/tmp/claude-0/sp/kolo50/data/test_export.json'));
const U = JSON.parse(fs.readFileSync(R + 'u_zahr.json')).nah.filter(u => u.novyCenik).slice(0, 6);
const B = 'file:///tmp/claude-0/sp/kolo50/';
async function stranka(b, dist, G) { const p = await b.newPage(); p.on('dialog', d => d.dismiss().catch(() => {}));
  await p.goto(B + dist + '/kalkulacka.html'); await p.waitForTimeout(1500);
  await p.evaluate((g) => { window.potvrd = async () => true; window.hlaska = () => {};
    Object.keys(g.NAST).forEach(k => { NAST[k] = JSON.parse(JSON.stringify(g.NAST[k])); }); NAST.jeAdmin = true;
    Object.keys(DEFAULT_CENIK).forEach(k => delete DEFAULT_CENIK[k]); Object.assign(DEFAULT_CENIK, g.DEFAULT_CENIK);
    if (g.DEFAULT_CENIK_PROJ) { Object.keys(DEFAULT_CENIK_PROJ).forEach(k => delete DEFAULT_CENIK_PROJ[k]); Object.assign(DEFAULT_CENIK_PROJ, g.DEFAULT_CENIK_PROJ); }
    CENIK_ZAHR.ceny = g.CENIK_ZAHR.ceny || {}; CENIK_ZAHR.jenZahr = g.CENIK_ZAHR.jenZahr || {};
    if (g.KATALOG) Object.assign(KATALOG, g.KATALOG); Object.keys(JEKLY).forEach(k => delete JEKLY[k]); Object.assign(JEKLY, g.JEKLY); }, G);
  return p; }
const cena = () => { const v = aktivniVarianta(ZAK); return nabidkaData(ZAK, v, JEKLY, 'cz').placeholders.CENA_BEZ_DPH; };
(async () => { const b = await chromium.launch(); const vys = [];
  const A = await stranka(b, 'dist_T', EXP2.glob); const T3 = await stranka(b, 'r50/dist_T3', EXP.glob);
  for (const m of U) {
    const z = EXP.zak[m.zaklad].z;
    const a = await A.evaluate(({ z, m, cenaS }) => { const cena = eval(cenaS);
      ZAK = importZakazka(JSON.parse(JSON.stringify(z))); ZAK = zakazkaDuplikuj(ZAK, 'TEST - 2026 - OPR - CN - 0000 - K50X-' + m.id); syncVarianta();
      const v = aktivniVarianta(ZAK); const c = cenikSlozRadu(DEFAULT_CENIK, CENIK_ZAHR, v.data.cenik.rada); c.rada = v.data.cenik.rada;
      Object.keys(v.data.cenik).forEach(k => delete v.data.cenik[k]); Object.assign(v.data.cenik, c); syncVarianta();
      const rozprac = JSON.parse(JSON.stringify(ZAK)); const c0 = cena();
      const zm = zamekPoTisku('nabidka', v.id, { zdroj: 'server', typ: 'nabidka' });
      return { c0, zamceno: !!(zm && zm.cislo), zamcena: JSON.parse(JSON.stringify(ZAK)), rozprac, statOpl: v.data.cenik.statikaOplKc === v.data.cenik.statikaKc };
    }, { z, m, cenaS: '(' + cena.toString() + ')' });
    const t = await T3.evaluate(({ a, cenaS }) => { const cena = eval(cenaS); const o = {};
      ZAK = importZakazka(JSON.parse(JSON.stringify(a.zamcena))); syncVarianta(); let v = aktivniVarianta(ZAK);
      o.zamcenaUzamcena = variantaUzamcena(v); o.zamcenaCena = cena(); const ov = zamekOvereni(v, JEKLY, 'cloud'); o.overeni = ov ? ov.stav + '/' + ov.rozdilu : '-';
      ZAK = importZakazka(JSON.parse(JSON.stringify(a.rozprac))); syncVarianta(); v = aktivniVarianta(ZAK);
      o.rozpracPred = cena(); const p = cenikPrehledAkt(); o.rozdily = p ? p.rozdily.map(r => r.cesta) : [];
      const r = cenikPrepocti(v, cenikDnesniProVariantu(v), Object.assign({ cesty: o.rozdily }, cenikPlatnaVerzeInfo())); syncVarianta();
      o.rozpracPo = cena(); o.zmen = r && r.zmen; return o; }, { a, cenaS: '(' + cena.toString() + ')' });
    // referenční: stejná kalkulace s novým ceníkem ve v19.11.3 (správná hodnota)
    const ref = await T3.evaluate(({ z, m, cenaS }) => { const cena = eval(cenaS); ZAK = importZakazka(JSON.parse(JSON.stringify(z))); ZAK = zakazkaDuplikuj(ZAK, 'TEST - 2026 - OPR - CN - 0000 - K50Y-' + m.id); syncVarianta();
      const v = aktivniVarianta(ZAK); const c = cenikSlozRadu(DEFAULT_CENIK, CENIK_ZAHR, v.data.cenik.rada); c.rada = v.data.cenik.rada; Object.keys(v.data.cenik).forEach(k => delete v.data.cenik[k]); Object.assign(v.data.cenik, c); syncVarianta(); return cena(); }, { z, m, cenaS: '(' + cena.toString() + ')' });
    vys.push({ id: m.id, zaklad: m.zaklad.slice(-8), zamcenoVA: a.zamceno, chybaVA_statOplRovnaCz: a.statOpl,
      zamcena_drzi: t.zamcenaCena === a.c0, zamcena_uzamcena: t.zamcenaUzamcena, overeni: t.overeni,
      rozprac_pred_jako_VA: t.rozpracPred === a.c0, prepocet_rozdily: t.rozdily.filter(x => /statika/i.test(x)), rozprac_po_jako_ref: t.rozpracPo === ref, ref_jina_nez_VA: ref !== a.c0 });
  }
  console.log(JSON.stringify(vys, null, 1)); await b.close();
})().catch(e => { console.error('CHYBA', e.message); process.exit(1); });
