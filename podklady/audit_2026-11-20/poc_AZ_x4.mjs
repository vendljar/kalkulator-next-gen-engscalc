import { nova, uloz, nacti, cO, cO2, cV, cA, zamkni, kopie, zk, zam, G, JEKLY, cenaOck, pamet, post, get, zakazky, SCHV, schvalovani } from './poc_AZ_zaklad.mjs';
const L = (id, t, x) => console.log(id.padEnd(5), t, '→', typeof x === 'string' ? x : JSON.stringify(x).slice(0, 420));
const kr = r => ({ s: r.status, ok: r.ok, ch: (r.chyba || '').slice(0, 200), var: (r.varovani || '').slice(0, 120) });
// C1 legacy slevaPct v zadání PROJ, nová zakázka
{ const z = nova('C1'); delete z.varianty[0].data.slevaProj; z.varianty[0].data.proj.zadani.slevaPct = -60; const r = await uloz(z, cO); L('C1', 'legacy slevaPct -60 nová', kr(r)); }
// C1b: uložená zakázka (v paměti přímo, stará data) se slevaPct -60 — obchodník jen uloží
{ const z = nova('C1b'); const r = await uloz(z, cO); const klic = 'zakazky/z/' + r.soubor; const raw = JSON.parse(pamet.get(klic));
  const a = kopie(raw); delete a.varianty[0].data.slevaProj; a.varianty[0].data.proj.zadani.slevaPct = -60; const rr = await uloz(a, cO, raw.uloRazitko); L('C1b', 'existující: přidat legacy slevaPct', kr(rr)); }
// C2 schválení vedoucím 10 %, pak obchodník zvětší základ (jiná šachta) a ponechá schválení; pak zvedne procenta
{ const z = nova('C2'); Object.assign(z.varianty[0].data.sleva, { procenta: 10, stav: 'čeká na schválení' }); const r = await uloz(z, cO); let g = await nacti(r.soubor, cV);
  let a = G.importZakazka(kopie(g)); SCHV.schvalovaniSchval(a.varianty[0].data.sleva, 'Ved'); let rr = await uloz(a, cV, g.uloRazitko); L('C2', 'vedoucí schválí 10', kr(rr)); g = await nacti(r.soubor, cO);
  a = kopie(g); a.varianty[0].data.sleva.procenta = 12; a.varianty[0].data.sleva.schvalenoProc = 12; rr = await uloz(a, cO, g.uloRazitko); L('C2a', 'obch zvedne na 12 a ponechá schváleno', kr(rr));
  a = kopie(g); a.varianty[0].data.sleva.procenta = 10.0000000001; rr = await uloz(a, cO, g.uloRazitko); L('C2b', '10.0000000001 schváleno', kr(rr));
  // přenos schválení na slevaProj
  a = kopie(g); a.varianty[0].data.slevaProj = kopie(g.varianty[0].data.sleva); rr = await uloz(a, cO, g.uloRazitko); L('C2c', 'kopie schválení do slevaProj', kr(rr));
  // klon varianty se schválením (nové id)
  a = kopie(g); const k = kopie(a.varianty[0]); k.id = 'vklonX'; k.ridici = false; k.pripona = 1; a.varianty.push(k); rr = await uloz(a, cO, g.uloRazitko); L('C2d', 'klon se schválením', kr(rr));
  // výměna id: nová varianta dostane id schválené, původní nové id bez slevy
  a = kopie(g); const nv = kopie(a.varianty[0]); nv.data.ock.zadani.zdvih = 30; const puv = a.varianty[0]; puv.id = 'vjine1'; puv.ridici = false; puv.pripona = 1; puv.data.sleva = G.slevaDefault(); nv.pripona = 0; a.varianty = [nv, puv];
  rr = await uloz(a, cO, g.uloRazitko); L('C2e', 'výměna id (schválení na jiný obsah)', kr(rr));
  // schvalovani rejstřík
  const s = await (await get(schvalovani, 'http://x/api/schvalovani?vse=1', cO)).json(); L('C2', 'rejstřík', { n: s.pocetCelkem, klice: Object.keys(s.zadosti[0] || {}) });
}
// C3 zaokrouhlení
for (const zo of [{ krok: 100000, smer: 'dolu' }, { krok: 1e9, smer: 'dolu' }, { krok: -1000, smer: 'dolu' }, { krok: '1000', smer: 'dolu' }]) {
  const z = nova('C3'); z.varianty[0].data.zaokr = zo; const r = await uloz(z, cO); L('C3', JSON.stringify(zo), kr(r)); }
{ const z = nova('C3d'); L('C3', 'výchozí zaokr', [z.varianty[0].data.zaokr, G.ZAOKR_KROKY, G.ZAOKR_SMERY]); }
// C4 odemčení tvarem
{ const z = nova('C4'); const v = z.varianty[0]; zamkni(z, v); const r = await uloz(z, cO); const g = await nacti(r.soubor, cO);
  for (const [t, f] of [['zamceno:false', x => { x.varianty[0].zamek.zamceno = false; }], ['zamek null', x => { x.varianty[0].zamek = null; }], ['zamek null+odemceni', x => { x.varianty[0].zamek = null; x.varianty[0].odemceni = [{ kdo: 'spravce', kdy: 'x', duvod: 'y' }]; }],
    ['id jiné', x => { x.varianty[0].id = 'vnove'; }], ['smazat variantu+nová', x => { const n = kopie(x.varianty[0]); n.id = 'vnove2'; delete n.zamek; x.varianty = [n]; }], ['odemceni objekt', x => { x.varianty[0].zamek = null; x.varianty[0].odemceni = { length: 5 }; }],
    ['duplicitní id', x => { const n = kopie(x.varianty[0]); delete n.zamek; n.data.ock.zadani.zdvih = 20; x.varianty.unshift(n); }], ['id číslo', x => { x.varianty[0].id = 5; }],
    ['vysledek změna', x => { x.varianty[0].zamek.vysledek.ock.souhrn.zakladCena = 1; }], ['kdy změna', x => { x.varianty[0].zamek.kdy = new Date().toISOString(); }], ['overeni podvrh', x => { x.varianty[0].zamek.overeni = { stav: 'shoda', x: 1 }; x.varianty[0].zamek.kdo = 'Ved'; x.varianty[0].zamek.prijato = '2020-01-01T00:00:00Z'; }],
    ['sleva v zamčené', x => { x.varianty[0].data.sleva = { procenta: 3, stav: 'schváleno automaticky' }; }], ['kryci volné pole', x => { x.varianty[0].data.kryci.hodnoty.poznamka = 'x'; }], ['kryci neznámé pole', x => { x.varianty[0].data.kryci.hodnoty.neexistuje = 'x'; }],
    ['kryci jiný klíč mimo hodnoty', x => { x.varianty[0].data.kryci.neco = 'x'; }], ['techspec', x => { x.varianty[0].data.techspec.x = 1; }], ['zadaniRucni', x => { x.varianty[0].data.zadaniRucni = { a: 1 }; }]]) {
    const a = kopie(g); f(a); const rr = await uloz(a, cO, g.uloRazitko); let e = '';
    if (rr.ok) { const g2 = await nacti(r.soubor, cO); e = { zam: !!(g2.varianty[0].zamek && g2.varianty[0].zamek.zamceno), ov: g2.varianty[0].zamek && g2.varianty[0].zamek.overeni && g2.varianty[0].zamek.overeni.x, kdo: g2.varianty[0].zamek && g2.varianty[0].zamek.kdo, prij: g2.varianty[0].zamek && g2.varianty[0].zamek.prijato };
      pamet.set('zakazky/z/' + r.soubor, JSON.stringify(g)); }
    L('C4', t, { ...kr(rr), e }); } }
