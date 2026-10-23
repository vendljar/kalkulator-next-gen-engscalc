// Plán plateb PROJ upravený po odeslání CN: změna zálohy (stejná předvolba) se neprojeví
const M = require('./h.js');
const J = require('../../../src/jekly.json');
const z = M.zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 903';
const v = z.varianty[0]; v.data.proj.cenik = M.ZC.zkusebniCenikProj();
v.data.kryciProj = { hodnoty: {}, planPlateb: { v: 1, predvolba: 'zaloha', zaloha: 70 } };
// zamčení jako zamekPoTisku
const vys = M.ZM.zamekVysledekSpocti(v, J, 'pokus');
M.K.kryciZmrazPodminky(z, v, J); M.KP.kryciProjZmrazPodminky(z, v);
const sn = M.ZM.zamekSnimekSpocti(v);
M.ZM.zamkniVariantu(v, { typ: 'nabidkaProj', cislo: M.ZM.variantaCislo(z, v), vysledek: vys, snimek: sn });
const radky = () => { const pl = M.NP.nabidkaProjPlatby(z, v, 'cz'); return pl.dopocet.platby.map(x => x.klic + ':' + x.castka).join(' | '); };
console.log('zmrazenoPlan existuje:', !!v.data.kryciProj.zmrazenoPlan, '| pole planu editovatelná:', M.ZM.zamekKryciPoleStav(v, 'kryciProj', 'planPredvolba'), M.ZM.zamekKryciPoleStav(v, 'kryciProj', 'planZaloha'));
console.log('po odeslání (70 %):     ', radky());
v.data.kryciProj.planPlateb = { v: 1, predvolba: 'zaloha', zaloha: 30 };   // obchodník přepne zálohu na 30 % (předvolba stejná)
const ef = M.PP.planPlatebVarianty(v, null);
console.log('ef.plan.zaloha =', ef.plan.zaloha, '| popis předvolby:', M.PP.planPopisPredvolby(ef.plan, ef.firemni, M.NP.nabidkaProjPlatby(z, v, 'cz').ceny));
console.log('po změně na 30 %:       ', radky());
const sd = M.sod.sodProjData(z, v, 'cz', { symboly: new Set(['SODP_PLATEBNI_KALENDAR']) });
console.log('SoD:\n' + sd.placeholders.SODP_PLATEBNI_KALENDAR);
// pro srovnání: nezamčená varianta se zálohou 30 %
const z2 = M.zk.novaZakazka(); const v2 = z2.varianty[0]; v2.data.proj.cenik = M.ZC.zkusebniCenikProj();
v2.data.kryciProj = { hodnoty: {}, planPlateb: { v: 1, predvolba: 'zaloha', zaloha: 30 } };
console.log('nezamčená 30 % (očekávané):', M.NP.nabidkaProjPlatby(z2, v2, 'cz').dopocet.platby.map(x => x.klic + ':' + x.castka).join(' | '));
