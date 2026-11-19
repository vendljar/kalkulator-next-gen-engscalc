import { nova, uloz, nacti, cO, cO2, cV, cA, zamkni, kopie, zk, zam, G, JEKLY, cenaOck, pamet, post, get, zakazky, SCHV, vypocetFn, ZC } from './poc_AZ_zaklad.mjs';
const L = (id, t, x) => console.log(id.padEnd(5), t, '→', typeof x === 'string' ? x : JSON.stringify(x).slice(0, 400));
const kr = r => ({ s: r.status, ok: r.ok, ch: (r.chyba || '').slice(0, 200), var: (r.varovani || '').slice(0, 120) });
const dnes = new Date().toISOString().slice(0, 10);
// B1 prodano
{ const z = nova('B1'); const v = z.varianty[0]; zamkni(z, v); const r = await uloz(z, cO); let g = await nacti(r.soubor, cO);
  let a = kopie(g); a.varianty[0].prodano = { datum: dnes }; let rr = await uloz(a, cO2, g.uloRazitko); L('B1a', 'cizí obchodník prodá', kr(rr));
  a = kopie(g); a.varianty[0].prodano = { datum: dnes, kdo: 'ved@priklad.cz', kdy: '2020-01-01T00:00:00Z', pipedrive: { stav: 'zapsano', kdy: 'x' }, extra: 1 }; rr = await uloz(a, cO, g.uloRazitko); L('B1b', 'autor prodá s podvrženými razítky', kr(rr));
  g = await nacti(r.soubor, cO); L('B1b', 'prodano uložené', g.varianty[0].prodano); L('B1b', 'historie', g.prodejHistorie);
  const pd0 = G.prodPdZapis(G.importZakazka(kopie(g)), G.importZakazka(kopie(g)).varianty[0], JEKLY); L('B1', 'PD hodnota před', { h: pd0.hodnota.map(x => x.oblast), kc: pd0.hodnotaKc > 0 });
  const ce0 = G.ctrlExportVarianty ? G.ctrlExportVarianty(G.importZakazka(kopie(g)), G.importZakazka(kopie(g)).varianty[0], { jekly: JEKLY }) : null; L('B1', 'ctrl před', ce0 && { ok: ce0.ok, ch: ce0.chyba, klice: Object.keys(ce0) });
  // jenProj po prodeji — cizí obchodník
  a = kopie(g); a.jenProj = true; rr = await uloz(a, cO2, g.uloRazitko); L('B1c', 'cizí obchodník přepne jenProj u PRODANÉ', kr(rr));
  let g2 = await nacti(r.soubor, cO); const zi = G.importZakazka(kopie(g2));
  const pd1 = G.prodPdZapis(zi, zi.varianty[0], JEKLY); L('B1c', 'PD hodnota po', { jenProj: g2.jenProj, h: pd1.hodnota, kc: pd1.hodnotaKc });
  const ce1 = G.ctrlExportVarianty ? G.ctrlExportVarianty(zi, zi.varianty[0], { jekly: JEKLY }) : null; L('B1c', 'ctrl po', ce1 && { ok: ce1.ok, ch: ce1.chyba });
  // odemčení prodeje obchodníkem
  a = kopie(g2); delete a.varianty[0].prodano; a.prodejOdemknout = { varianta: a.varianty[0].id, duvod: 'omyl omyl' }; rr = await uloz(a, cO, g2.uloRazitko); L('B1d', 'obchodník odemkne prodej', kr(rr));
  a = kopie(g2); a.varianty[0].data.kryciProj.lhutyProj = { cokoli: 1 }; rr = await uloz(a, cO, g2.uloRazitko); L('B1e', 'lhutyProj po prodeji', kr(rr));
  a = kopie(g2); a.varianty[0].data.kryciProj.hodnoty = Object.assign({}, a.varianty[0].data.kryciProj.hodnoty, { terminDps: '2031-01-01' }); rr = await uloz(a, cO2, g2.uloRazitko); L('B1f', 'termín po prodeji cizí obch', kr(rr));
  a = kopie(g2); a.prodejHistorie = []; rr = await uloz(a, cO, g2.uloRazitko); g2 = await nacti(r.soubor, cO); L('B1g', 'smazat historii', { ...kr(rr), hist: (g2.prodejHistorie || []).length });
}
// B2 lhutyProj před prodejem (zamčená, neprodaná) — libovolný obsah
{ const z = nova('B2'); const v = z.varianty[0]; zamkni(z, v); const r = await uloz(z, cO); const g = await nacti(r.soubor, cO);
  const a = kopie(g); a.varianty[0].data.kryciProj.lhutyProj = { radky: { x: 'A'.repeat(100000) }, hluboko: [[[[1]]]] }; const rr = await uloz(a, cO2, g.uloRazitko); L('B2', 'lhutyProj libovolný u zamčené neprodané, cizí obch', kr(rr));
  const g2 = await nacti(r.soubor, cO); L('B2', 'uloženo', JSON.stringify(g2.varianty[0].data.kryciProj.lhutyProj || null).length); }
// B3 vypocet endpoint
{ let r = await post(vypocetFn, 'http://x/api/vypocet', 'null', cO); L('B3', 'null', [r.status, (await r.text()).slice(0, 100)]);
  r = await post(vypocetFn, 'http://x/api/vypocet', '[' .repeat(20000) + ']'.repeat(20000), cO); L('B3', 'hluboké', [r.status, (await r.text()).slice(0, 100)]);
  const z = nova('B3'); r = await post(vypocetFn, 'http://x/api/vypocet', { zakazka: z, program: { cenik: ZC.zkusebniCenik() } }, cO); const t = await r.json(); L('B3', 'běžný', [r.status, Object.keys(t.vysledek || {}), JSON.stringify(t).length]);
  const zz = nova('B3 mnoho'); const v0 = zz.varianty[0]; for (let i = 0; i < 300; i++) { const k = kopie(v0); k.id = 'vx' + i; k.ridici = false; zz.varianty.push(k); }
  const t0 = Date.now(); r = await post(vypocetFn, 'http://x/api/vypocet', { zakazka: zz, program: {} }, cO); const tt = await r.text(); L('B3', '301 variant', [r.status, tt.length, (Date.now() - t0) + ' ms']);
  const t1 = Date.now(); const ru = await uloz(zz, cO); L('B3', 'uložení 301 variant', [kr(ru), (Date.now() - t1) + ' ms', JSON.stringify(zz).length]);
}
// B4 limity: mnoho variant, dlouhé řetězce, __proto__
{ const z = nova('B4'); z.nazevAkce = 'N'.repeat(1000000); z.varianty[0].nazev = 'V'.repeat(500000); z.varianty[0].pozn = 'P'.repeat(500000); z.neznamyKlic = { a: 'x'.repeat(1000000) };
  const r = await uloz(z, cO); L('B4a', 'dlouhé řetězce + neznámý klíč', kr(r)); if (r.ok) { const g = await nacti(r.soubor, cO); L('B4a', 'uloženo', { naz: g.nazevAkce.length, vn: g.varianty[0].nazev.length, nezn: !!g.neznamyKlic, vel: JSON.stringify(g).length });
    const rej = JSON.parse(pamet.get('zakazky/_rejstrik')); L('B4a', 'rejstřík velikost', JSON.stringify(rej).length); } 
  const z2 = nova('B4b'); const body = JSON.stringify({ zakazka: z2 }).replace('"schema":', '"__proto__":{"polluted":1},"constructor":{"prototype":{"p2":1}},"schema":');
  const rr = await post(zakazky, 'http://x/api/zakazky', body, cO); const t = await rr.json(); const g = t.ok ? await nacti(t.soubor, cO) : null;
  L('B4b', '__proto__', { s: rr.status, polluted: ({}).polluted, p2: ({}).p2, own: g && Object.prototype.hasOwnProperty.call(g, '__proto__'), ctor: g && Object.prototype.hasOwnProperty.call(g, 'constructor') });
  const z3 = nova('B4c'); z3.varianty[0].data.ock.zadani.zdvih = 1e400; const b3 = JSON.stringify({ zakazka: z3 }).replace('"zdvih":null', '"zdvih":1e400'); const r3 = await post(zakazky, 'http://x/api/zakazky', b3, cO); L('B4c', 'zdvih 1e400', [r3.status, (await r3.json()).chyba]);
  const z4 = nova('B4d'); z4.varianty[0].data.ock.zadani.zdvih = '9'; const r4 = await uloz(z4, cO); L('B4d', 'zdvih text', kr(r4));
  const z5 = nova('B4e'); z5.varianty[0].data.ock.zadani.sirka = -1; const r5 = await uloz(z5, cO); L('B4e', 'šířka -1', kr(r5));
  const z6 = nova('B4f'); z6.varianty = 'x'; const r6 = await uloz(z6, cO); L('B4f', 'varianty text', kr(r6));
  const z7 = nova('B4g'); z7.varianty[0].data = null; const r7 = await uloz(z7, cO); L('B4g', 'data null', kr(r7));
  const z8 = nova('B4h'); z8.varianty.push(null, 5, 'x'); const r8 = await uloz(z8, cO); L('B4h', 'varianty s null/5', kr(r8));
}
