/* ============================================================
 * PO #116 (CRM-17) — ODESLÁNÍ NABÍDKY DO PIPEDRIVE, PROHLÍŽEČ
 *   1. zamekPoTisku: PRVNÍ zámek cenovou nabídkou spustí kartu odeslání
 *      (s typem a slibem uložení), dotisk ani SoD ne; chyba karty tisk
 *      nezastaví (zámek vznikne);
 *   2. odeslPdPoZamku: bez dealu / bez práva jasná hláška, žádné volání API;
 *      s dealem počká na uložení zámku a pak teprve volá náhled;
 *   3. zamekNeulozen → jeden další pokus; karta s tabulkou a tlačítkem
 *      „Potvrdit a zapsat“; vypnutý zápis tlačítko zakáže;
 *   4. Word z tlačítka se drží jen pro tutéž zakázku; base64 se nerozbije.
 * Spuštění: node src/test_po_116_ui.js
 * ============================================================ */
const fs = require('fs');
const vm = require('vm');
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
nacti('./preklad.js'); nacti('./format.js'); nacti('./engine.js'); nacti('./engine_proj.js'); nacti('./techspec.js');
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik(); global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const zk = nacti('./zakazka.js');
const ZM = nacti('./zamek.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const UI = f => fs.readFileSync(__dirname + '/ui/' + f, 'utf8');
const vyrizni = (zdroj, zacatek) => { const i = zdroj.indexOf(zacatek); return i < 0 ? '' : zdroj.slice(i, zdroj.indexOf('\n}\n', i) + 2); };
const cekej = ms => new Promise(h => setTimeout(h, ms));

/* ---------- 1. zamekPoTisku → karta odeslání ---------- */
{
  const kod = vyrizni(UI('zamek_ui.js'), 'function zamekPoTisku(');
  test('zamekPoTisku je ve zdroji a volá odeslPdPoZamku jen při prvním zámku', !!kod && /if \(prvni && typeof odeslPdPoZamku === 'function'\)/.test(kod));
  const spust = (v, typ, odesl) => {
    const volano = [];
    const ctx = Object.assign({}, ZM, {
      ZAK: { varianty: [v] }, aktivniVarianta: z => z.varianty[0], JEKLY: null, ZAMEK_SNIMEK_NEULOZENY: new Set(),
      zamekPrvniSmlouva: () => false, zamekOtiskZPorovnani: () => null, porovnaniData: () => null,
      zamekVysledekSpocti: () => null, zamekKdo: () => 'TEST', variantaCislo: () => '0116',
      zamekSlovnikTed: () => null, render: () => {}, zamekPoTiskuUloz: () => { ctx.ZAMEK_ULOZ_SLIB = 'slib'; return true; },
      odeslPdPoZamku: odesl || ((vv, t, slib) => volano.push([vv.id, t, slib])),
      Date, JSON, Object, Array, Set, String });
    delete ctx.zamekSnimekSpocti; delete ctx.zamekZpracovatelSnimek;
    vm.createContext(ctx); vm.runInContext(kod, ctx);
    const z = ctx.zamekPoTisku(typ, v.id, null, null);
    return { z, volano };
  };
  const nova = () => zk.novaZakazka().varianty[0];
  let v = nova(); let r = spust(v, 'nabidka');
  test('první tisk CN (Word) → karta odeslání s typem a slibem uložení', r.volano.length === 1 && r.volano[0][1] === 'nabidka' && r.volano[0][2] === 'slib', r.volano);
  r = spust(v, 'nabidkaTisk');
  test('dotisk → karta se nespouští (nic se samo nezapisuje)', r.volano.length === 0 && v.zamek.tisky.length === 2, r.volano);
  v = nova(); r = spust(v, 'nabidkaProjTisk');
  test('první tisk CN PROJ (tisk) → karta odeslání', r.volano.length === 1 && r.volano[0][1] === 'nabidkaProjTisk');
  v = nova(); r = spust(v, 'plnaMoc');
  test('plná moc nezamyká → nic', r.volano.length === 0 && !v.zamek);
  v = nova(); r = spust(v, 'nabidka', () => { throw new Error('karta spadla'); });
  test('chyba karty tisk nezastaví: zámek vznikl a vrátil se', !!r.z && v.zamek && v.zamek.zamceno === true);
}

/* ---------- 2.–4. karta (odeslani_pd_ui.js) ---------- */
function prostredi(volby = {}) {
  const volani = [];
  const zak = zk.novaZakazka();
  const v = zak.varianty[0];
  ZM.zamkniVariantu(v, { typ: 'nabidka', kdy: '2026-11-24T10:00:00.000Z', cislo: '0116' });
  if (volby.deal !== false) zak.pdDealId = '1234';
  const ctx = {
    ZAK: zak, aktivniVarianta: z => z.varianty[0], ONLINE_STAV: { soubor: 'Z-0116.json', ja: { email: 'a@priklad.cz' } },
    pdnUiOnline: () => volby.online !== false, pdnUiSmi: () => volby.pravo !== false, pdnPodklad: () => ({ ok: true, zdroje: { ock: { x: 'X' } } }),
    render: () => { ctx.vykresleno++; }, vykresleno: 0, esc: t => String(t), JEKLY: null, PDN_REZIM: { simulator: 'simulátor' },
    onlineApi: (cesta, telo) => { volani.push([cesta, telo]); return volby.api ? volby.api(telo, volani.length) : Promise.resolve({}); },
    setTimeout: (f) => setTimeout(f, 1), Promise, Object, Array, String, JSON, Uint8Array, btoa: s => Buffer.from(s, 'binary').toString('base64'),
  };
  vm.createContext(ctx); vm.runInContext(UI('odeslani_pd_ui.js') + '\n;this.ODESL_PD = ODESL_PD;', ctx);
  return { ctx, zak, v, volani };
}
const NAHLED = { ok: true, rezim: 'simulator', deal: { id: 1234, nazev: 'Deal TEST' }, otisk: 'a'.repeat(32), zapisPovolen: true, zastaveno: '',
  cislo: '0116', poznamka: 'Nabídka odeslána: 0116', radky: [{ klic: 'cisloNabidky', nazev: 'Číslo nabídky (CN)', vCrm: '', hodnotaText: '0116', stav: 'zapise', posle: true },
    { klic: 'fazeDealu', nazev: 'Fáze dealu', vCrm: 'Vyjednávání (24)', hodnotaText: 'Nabídka odeslána (23)', stav: 'ponechano', posle: false, duvod: 'deal je už v pozdější fázi' }] };

(async () => {
  {
    const { ctx, v, volani } = prostredi({ deal: false });
    ctx.odeslPdPoZamku(v, 'nabidka', Promise.resolve(true));
    await cekej(5);
    test('bez dealu: hláška „není navázaná na deal“, žádné volání API', /není navázaná na deal/.test(ctx.ODESL_PD.info) && volani.length === 0, ctx.ODESL_PD.info);
    test('…karta hlášku ukáže', /není navázaná na deal/.test(ctx.odeslPdKarta()));
  }
  {
    const { ctx, v, volani } = prostredi({ pravo: false });
    ctx.odeslPdPoZamku(v, 'nabidka', Promise.resolve(true));
    await cekej(5);
    test('bez práva crm.pipedrive: hláška, žádné volání API', /jen online s právem/.test(ctx.ODESL_PD.info) && volani.length === 0, ctx.ODESL_PD.info);
  }
  {
    const { ctx, v, volani } = prostredi({ api: () => Promise.resolve(NAHLED) });
    let pust; const ulozeni = new Promise(h => { pust = h; });
    ctx.odeslPdPoZamku(v, 'nabidka', ulozeni);
    await cekej(5);
    test('s dealem: náhled čeká na uložení zámku', volani.length === 0);
    pust(true); await cekej(5);
    test('…po uložení jeden náhled s variantou a zámkem (bez textů krycího listu)', volani.length === 1 && volani[0][0] === '/api/pd/odeslani'
      && volani[0][1].akce === 'nahled' && volani[0][1].varianta === v.id && volani[0][1].zamekKdy === v.zamek.kdy && !volani[0][1].strany, volani);
    const html = ctx.odeslPdKarta();
    test('karta: tabulka, „ponechá se“ u fáze, tlačítko Potvrdit povolené', /odeslPdTabulka/.test(html) && /ponechá se/.test(html)
      && /id="odeslPdZapsat" onclick="odeslPdZapis\(\)" >/.test(html), html.slice(0, 300));
  }
  {
    let n = 0;
    const err = Object.assign(new Error('neuloženo'), { data: { kod: 'zamekNeulozen' } });
    const { ctx, v, volani } = prostredi({ api: () => (++n === 1 ? Promise.reject(err) : Promise.resolve(NAHLED)) });
    ctx.odeslPdPoZamku(v, 'nabidka', null);
    await cekej(30);
    test('zámek ještě není na serveru → jeden další pokus, pak náhled', volani.length === 2 && !!ctx.ODESL_PD.data && !ctx.ODESL_PD.chyba, [volani.length, ctx.ODESL_PD.chyba]);
  }
  {
    const { ctx, v } = prostredi({ api: () => Promise.resolve(Object.assign({}, NAHLED, { zapisPovolen: false })) });
    await ctx.odeslPdNahled(0);
    const html = ctx.odeslPdKarta();
    test('vypnutý zápis (PIPEDRIVE_ZAPIS): věta a zakázané tlačítko', /vypnutý/.test(html) && /id="odeslPdZapsat" onclick="odeslPdZapis\(\)" disabled/.test(html), html.slice(0, 400));
  }
  {
    const { ctx, zak, v } = prostredi();
    const blob = { arrayBuffer: () => Promise.resolve(Uint8Array.from([80, 75, 3, 4, 0, 255]).buffer) };
    ctx.odeslPdSoubor(v.id, blob);
    test('R5: Word před zapsáním údajů dealu tlačítko nenabídne', !/Přiložit Word k dealu/.test(ctx.odeslPdKarta()));
    zak.pdOdeslani = { deal: '1234', varianty: { [v.id]: { zamekKdy: v.zamek.kdy, pole: { stav: 'zapsano', kdy: '2026-11-24' } } } };
    test('Word se drží pro tutéž zakázku a variantu (po zapsání údajů)', /Přiložit Word k dealu/.test(ctx.odeslPdKarta()));
    /* R6: onlineOtevri vymění ZAK (nový objekt téže zakázky) — Word zůstává. */
    ctx.ZAK = JSON.parse(JSON.stringify(zak));
    test('R6: po načtení zakázky znovu (nový objekt ZAK) Word a tlačítko zůstávají', /Přiložit Word k dealu/.test(ctx.odeslPdKarta()));
    ctx.ONLINE_STAV.soubor = 'Z-jina.json';
    test('…jiná zakázka (stejné id varianty) Word nepřevezme', !/Přiložit Word k dealu/.test(ctx.odeslPdKarta()));
    ctx.ONLINE_STAV.soubor = 'Z-0116.json';
    const jinyZamek = JSON.parse(JSON.stringify(zak)); jinyZamek.varianty[0].zamek.kdy = '2026-12-01T10:00:00.000Z';
    jinyZamek.pdOdeslani.varianty[v.id].zamekKdy = jinyZamek.varianty[0].zamek.kdy; ctx.ZAK = jinyZamek;
    test('…nový zámek téže varianty (po odemčení) starý Word nepřevezme', !/Přiložit Word k dealu/.test(ctx.odeslPdKarta()));
    ctx.ZAK = zak;
    const b64 = await ctx.odeslPdBase64(blob);
    test('base64 Wordu se nerozbije', b64 === Buffer.from([80, 75, 3, 4, 0, 255]).toString('base64'), b64);
  }
  {
    /* R6: nepovedené přiložení → po onlineOtevri tlačítko „Přiložit Word“ zůstává k opakování. */
    const err = Object.assign(new Error('Pipedrive momentálně neodpovídá'), { data: {} });
    const { ctx, zak, v, volani } = prostredi({ api: () => Promise.reject(err) });
    zak.pdOdeslani = { deal: '1234', varianty: { [v.id]: { zamekKdy: v.zamek.kdy, pole: { stav: 'zapsano', kdy: 'x' } } } };
    ctx.odeslPdSoubor(v.id, { arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2]).buffer) });
    ctx.onlineOtevri = () => { ctx.ZAK = JSON.parse(JSON.stringify(zak)); return Promise.resolve(true); };
    await ctx.odeslPdPrilozUI();
    test('R6: přiložení selhalo → hláška a tlačítko zůstává pro opakování', volani.length === 1 && /nepřiložil/.test(ctx.ODESL_PD.info)
      && /Přiložit Word k dealu/.test(ctx.odeslPdKarta()), [ctx.ODESL_PD.info]);
  }
  {
    /* R4: první tisk dalšímu zákazníkovi → karta jen informativní, žádné volání API. */
    const { ctx, zak, v, volani } = prostredi({ api: () => Promise.resolve(NAHLED) });
    v.zamek.tisky[0].zakaznik = { id: 'z-dalsi', pismeno: 'B', cislo: 'CN-B' };
    ctx.vzRidiciId = () => 'z-ridici';
    ctx.odeslPdPoZamku(v, 'nabidka', Promise.resolve(true));
    await cekej(5);
    const html = ctx.odeslPdKarta();
    test('R4: CN pro dalšího zákazníka → hláška, bez API, karta bez tlačítek zápisu', volani.length === 0 && /dalšímu zákazníkovi/.test(ctx.ODESL_PD.info)
      && /odeslPdJiny/.test(html) && !/odeslPdNahled|odeslPdZapsat/.test(html), [volani.length, html.slice(0, 200)]);
  }
  {
    const { ctx, zak } = prostredi();
    zak.varianty[0].zamek.typ = 'sod';
    test('varianta zamčená smlouvou: karta se neukazuje', ctx.odeslPdKarta() === '');
  }
  console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})();
