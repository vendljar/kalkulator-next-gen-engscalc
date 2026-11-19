import { nova, uloz, nacti, cO, cO2, cV, cA, zamkni, kopie, zk, zam, G, JEKLY, cenaOck, pamet, post, zakazky, SCHV } from './poc_AZ_zaklad.mjs';
const L = (id, t, x) => console.log(id.padEnd(5), t, '→', typeof x === 'string' ? x : JSON.stringify(x).slice(0, 330));
const kr = r => ({ s: r.status, ok: r.ok, ch: (r.chyba || '').slice(0, 170), var: (r.varovani || '').slice(0, 120) });

// A1: nový zámek s podvrženým výsledkem (cena 1)
{ const z = nova('A1'); const v = z.varianty[0]; zamkni(z, v); v.zamek.vysledek.ock.souhrn.zakladCena = 1; v.zamek.vysledek.ock.souhrn.zakladSDph = 1.21;
  const r = await uloz(z, cO); L('A1', 'podvržený vysledek nového zámku', kr(r));
  if (r.ok) { const g = await nacti(r.soubor, cO); L('A1', 'overeni', g.varianty[0].zamek.overeni); } }
// A2: vynechaná nejádrová čísla + řádek null
{ const z = nova('A2'); const v = z.varianty[0]; v.data.ock.zadani.priplatky && 0; zamkni(z, v);
  const vy = v.zamek.vysledek; delete vy.ock.souhrn.zakladMarze; delete vy.ock.souhrn.zakladNaklad; delete vy.ock.souhrn.priplatkySDph; delete vy.proj.souhrn.doprava;
  L('A2', 'typy castí ock', Object.fromEntries(Object.entries(vy.ock).map(([k, x]) => [k, Array.isArray(x) ? 'pole' + x.length : typeof x])));
  const r = await uloz(z, cO); L('A2', 'vynechaná čísla', kr(r));
  if (r.ok) { const g = await nacti(r.soubor, cO); L('A2', 'overeni', g.varianty[0].zamek.overeni); } }
// A3: přepsání cizí nezamčené zakázky bez razítka
{ const z = nova('A3'); const r = await uloz(z, cO); const z2 = nova('A3 cizí přepis'); z2.cislo = z.cislo; z2.objednatel = 'PŘEPSÁNO';
  const r2 = await uloz(z2, cO2); L('A3', 'cizí obchodník bez ocekavaneRazitko', kr(r2));
  const r3 = await uloz(z2, cO2, '', { prepsat: true }); L('A3', 's prepsat:true', kr(r3));
  const g = await nacti(r.soubor, cO); L('A3', 'autor/objednatel po', { autor: g.autor, upravil: g.upravil, obj: g.objednatel, ids: g.varianty.map(v => v.id) }); }
// A4: legacy slevaPct
{ const z = nova('A4'); z.varianty[0].data.proj.slevaPct = 60; z.varianty[0].data.slevaPct = 60; delete z.varianty[0].data.slevaProj;
  const r = await uloz(z, cO); L('A4', 'legacy slevaPct 60', kr(r)); if (r.ok) { const g = await nacti(r.soubor, cO); L('A4', 'slevy', [g.varianty[0].data.sleva, g.varianty[0].data.slevaProj]); } }
// A5: sleva typy
for (const [t, sl] of [['string', { procenta: '50', stav: 'schváleno automaticky' }], ['pole', { procenta: [2], stav: 'schváleno automaticky' }], ['Inf', { procenta: 1e400, stav: 'schváleno automaticky' }],
  ['auto 3', { procenta: 3, stav: 'schváleno automaticky' }], ['auto 3.0000001', { procenta: 3.0000000001, stav: 'schváleno automaticky' }], ['bool', { procenta: true, stav: 'schváleno automaticky' }],
  ['stav pole', { procenta: 50, stav: ['schváleno'] }], ['zaporna', { procenta: -50, stav: 'schváleno automaticky' }], ['hex', { procenta: '0x32', stav: 'schváleno automaticky' }], ['mezera', { procenta: ' 50 ', stav: 'schváleno automaticky' }]]) {
  const z = nova('A5 ' + t); Object.assign(z.varianty[0].data.sleva, sl);
  const body = JSON.stringify({ zakazka: z }).replace('"procenta":null', '"procenta":1e400');
  const rr = await post(zakazky, 'http://x/api/zakazky', body, cO); const r = { status: rr.status, ...(await rr.json()) };
  let extra = ''; if (r.ok) { const g = await nacti(r.soubor, cO); const s = g.varianty[0].data.sleva; extra = { s, plati: G.slevaPlati(s), podil: G.slevaPodil(s) }; }
  L('A5', t, { ...kr(r), extra }); }
// A7: zamčená varianta — pole mimo data a zámek
{ const z = nova('A7'); const v = z.varianty[0]; zamkni(z, v); const r = await uloz(z, cO); const g = await nacti(r.soubor, cO);
  for (const [t, f] of [['nazev', x => { x.varianty[0].nazev = 'JINÝ NÁZEV'; }], ['pozn', x => { x.varianty[0].pozn = 'jiná'; }], ['pripona', x => { x.varianty[0].pripona = 7; }], ['zakaznik', x => { x.varianty[0].zakaznik = 'z9'; }],
    ['vytvoreno', x => { x.varianty[0].vytvoreno = '2001-01-01'; }], ['objednatel', x => { x.objednatel = 'Jiný odběratel'; }], ['ico', x => { x.ico = '00000000'; }], ['datum', x => { x.datum = '2020-01-01'; }],
    ['jenProj', x => { x.jenProj = true; }], ['jenOck', x => { x.jenOck = true; }], ['nazevAkce', x => { x.nazevAkce = 'Jiná akce'; }], ['popisZameru', x => { x.popisZameru = 'jiný'; }], ['kontakt', x => { x.kontakt = 'jiný'; }],
    ['priponySchema', x => { x.priponySchema = 1; }], ['priponaMax', x => { x.priponaMax = 99; }], ['zamek.tisky+', x => { x.varianty[0].zamek.tisky.push({ typ: 'sod', kdy: new Date().toISOString(), popis: 'x', kdo: 'Někdo Jiný' }); }],
    ['zamek.extra', x => { x.varianty[0].zamek.neco = 1; }], ['autor', x => { x.autor = 'ved@priklad.cz'; x.autorJmeno = 'Ved'; }], ['schema', x => { x.schema = 999; }],
    ['zaokr', x => { x.varianty[0].data.zaokr = { krok: 1000, smer: 'dolu' }; }], ['ridici+klon', x => { const k = kopie(x.varianty[0]); k.id = 'vklon1'; delete k.zamek; k.ridici = true; x.varianty[0].ridici = false; k.pripona = 1; x.varianty.push(k); }]]) {
    const a = kopie(g); f(a); const rr = await uloz(a, cO, g.uloRazitko);
    let extra = ''; if (rr.ok) { const g2 = await nacti(r.soubor, cO); extra = { naz: g2.varianty[0].nazev, prip: g2.varianty[0].pripona, zak: g2.varianty[0].zakaznik, obj: g2.objednatel, dat: g2.datum, jp: g2.jenProj, jo: g2.jenOck, autor: g2.autor, tisky: g2.varianty[0].zamek.tisky.length, neco: g2.varianty[0].zamek.neco };
      await uloz(g, cA, g2.uloRazitko, { prepsat: true }); const g3 = await nacti(r.soubor, cO); g.uloRazitko = g3.uloRazitko; Object.assign(g, g3); }
    L('A7', t, { ...kr(rr), extra }); } }
