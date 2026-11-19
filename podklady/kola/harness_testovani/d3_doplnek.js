// Zkouška D3 (#688) — doplněk BEZ ZÁPISU nad hotovými TEST 9821 (CN + SoD PROJ) a 9822 (víc zákazníků):
// rozvržení náhledu (6a, 6c po opravě harnessu), počet stran, objednávka po SoD, zámek Čísla zakázky po SoD (bez klonu varianty).
// Spuštění z kořene repa: OUT=<složka> node podklady/kola/harness_testovani/d3_doplnek.js
const S = require('./d3_spolecne.js'); const D = require('./d3.js'); const { L, V, st, konec, C1, C2, CZ } = D;
(async () => {
  const x = await S.otevriProhlizec(D.OUT, 'admin'); const { E } = x;
  await x.otevri(C1);
  L('9821', await E(() => ({ varianty: ZAK.varianty.length, tisky: zamekTiskyTypy(aktivniVarianta(ZAK)), prodano: !!aktivniVarianta(ZAK).prodano })));
  const pz = await D.klPole(x, 'cisloZakazky');
  V('3k po SoD (po F5 ze serveru): Číslo zakázky zmrazené, hodnota drží', pz.stav === 'zmrazeno' && pz.zmrazenoUI && pz.hodnota === CZ, { stav: pz.stav, zmrazenoUI: pz.zmrazenoUI });
  const pokus = await E(() => { window.potvrd = async (t) => { window.__hl.push('POTVRĎ (odmítnuto): ' + String(t).replace(/\s+/g, ' ').slice(0, 160)); return false; };
    klpSet('cisloZakazky', 'TEST-ZMENA'); return { h: ((aktivniVarianta(ZAK).data.kryciProj || {}).hodnoty || {}).cisloZakazky, varianty: ZAK.varianty.length }; });
  V('3l po SoD: zápis se nepropíše (aplikace nabídne klon varianty, odmítnuto)', pokus.h === CZ && pokus.varianty === 1, { zustalo: pokus.h === CZ, varianty: pokus.varianty, hl: (await E(() => window.__hlBer())).map(t => t.replace(/\d/g, '#').slice(0, 160)) });
  const n = await D.nahled(x, 'd_9821_po_sod');
  V('1g objednávka jde i po SoD PROJ (náhled)', n.okno === true, { zhasnuto: n.zhasnuto, title: n.title });
  if (n.okno) { const r = n.roz;
    const poradi = r.dod.b <= r.obj.y + 2 && r.obj.b <= r.datum.y + 2 && r.datum.b <= r.tab.y + 2 && r.tab.b <= r.ramBox.y + 2 && r.ramBox.b <= r.podpis.y + 2 && r.podpis.b <= r.pozn.y + 2 && r.pozn.b <= r.vystavil.y + 2;
    V('6a rozvržení: vpravo název + číslo dokladu + zakázka; vlevo Dodavatel, pod ním Místo určení / Objednatel; datum, tabulka, rámeček, podpis, poznámka, Vystavil',
      poradi && r.h1.x > r.dod.r - 5 && r.h1.y < r.obj.y && r.zakazka && n.text.includes('Zakázka: ' + CZ), { stitky: r.stitky });
    V('6c rámeček Celkem Kč vpravo pod tabulkou', r.ramBox.r >= r.tab.r - 10 && r.ramBox.x > r.tab.x + r.sirka * 0.3, { ramBox: r.ramBox, tab: r.tab });
    L('  rozvržení (px)', { h1: r.h1, cislo: r.cislo, zakazka: r.zakazka, dod: r.dod, obj: r.obj, datum: r.datum, tab: r.tab, ramBox: r.ramBox, podpis: r.podpis, pozn: r.pozn, vystavil: r.vystavil, logo: r.logo });
    L('  stran PDF 9821 (4 činnosti)', n.strany); }
  const w = await D.word(x, 'd_9821'); L('  stran Word→PDF 9821', w.strany);
  await x.otevri(C2); await E(() => { vzOtevri(vzRidiciId(ZAK)); render(); });
  const n2 = await D.nahled(x, 'd_9822'); const w2 = await D.word(x, 'd_9822');
  L('  9822 (7 činností)', { strany: n2.strany, radky: n2.okno ? n2.roz.radky.length : null, stranyWord: w2.strany });
  V('6e rozsah: tisk PDF nejvýš 2 strany (rozhodnutí: plný rozsah i za cenu 2 stran)', n.strany <= 2 && n2.strany <= 2, { s9821: n.strany, s9822: n2.strany, word9821: w.strany, word9822: w2.strany });
  const ul = x.zap.filter(t => /POST \/api\/zakazky/.test(t)); V('d0 doplněk nic neuložil', ul.length === 0, ul);
  L(`SOUHRN ${st.ok} OK, ${st.fail} FAIL`); konec(); await x.b.close();
})().catch(e => { console.error('CHYBA', e.stack); L('CHYBA ' + e.message); konec(); process.exit(1); });
