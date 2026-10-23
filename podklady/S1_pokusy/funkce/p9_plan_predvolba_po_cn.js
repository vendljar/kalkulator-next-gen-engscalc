// Plán plateb PROJ po odeslání CN: přepnutí předvolby Záloha → Standard / 100 %
const M = require('./h.js'); const J = require('../../../src/jekly.json');
const zamcena = (plan) => {
  const z = M.zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 906';
  const v = z.varianty[0]; v.data.proj.cenik = M.ZC.zkusebniCenikProj();
  v.data.kryciProj = { hodnoty: {}, planPlateb: plan };
  const vys = M.ZM.zamekVysledekSpocti(v, J, 'pokus');
  M.K.kryciZmrazPodminky(z, v, J); M.KP.kryciProjZmrazPodminky(z, v);
  M.ZM.zamkniVariantu(v, { typ: 'nabidkaProj', cislo: M.ZM.variantaCislo(z, v), vysledek: vys, snimek: M.ZM.zamekSnimekSpocti(v) });
  return { z, v };
};
for (const [pred, po] of [[{ v: 1, predvolba: 'zaloha', zaloha: 70 }, { v: 1, predvolba: 'std', prepis: {} }],
                          [{ v: 1, predvolba: 'sto' }, { v: 1, predvolba: 'std', prepis: {} }],
                          [{ v: 1, predvolba: 'std' }, { v: 1, predvolba: 'zaloha', zaloha: 30, prepis: {} }]]) {
  const { z, v } = zamcena(pred);
  v.data.kryciProj.planPlateb = po;
  const pl = M.NP.nabidkaProjPlatby(z, v, 'cz');
  console.log(pred.predvolba, '→', po.predvolba, '| kontrola:', pl.kontrola.map(k => k.kod + ':' + (k.k || '')).join(', ') || 'OK');
  let sod = '';
  try { sod = M.sod.sodProjData(z, v, 'cz', { symboly: new Set(['SODP_PLATEBNI_KALENDAR']) }).placeholders.SODP_PLATEBNI_KALENDAR; } catch (e) { sod = 'CHYBA: ' + e.message; }
  console.log('  SoD:', '\n    ' + String(sod).split('\n').join('\n    '));
}
// totéž u nezamčené varianty (očekávaný výsledek)
const z = M.zk.novaZakazka(); const v = z.varianty[0]; v.data.proj.cenik = M.ZC.zkusebniCenikProj();
v.data.kryciProj = { hodnoty: {}, planPlateb: { v: 1, predvolba: 'std' } };
console.log('nezamčená std | kontrola:', M.NP.nabidkaProjPlatby(z, v, 'cz').kontrola.map(k => k.kod).join(',') || 'OK');
