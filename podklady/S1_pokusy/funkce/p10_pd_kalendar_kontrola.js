// planPdKalendar (#512) hlídá jen součet, ne kontrolu plánu — do Pipedrive by šel kalendář, ze kterého smlouva nevznikne
const M = require('./h.js');
const z = M.zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 907';
const v = z.varianty[0]; v.data.proj.cenik = M.ZC.zkusebniCenikProj();
v.data.kryciProj = { hodnoty: {}, planPlateb: { v: 1, predvolba: 'std',
  cinnosti: { dpz: [{ p: 80, m: 'podpis' }, { p: 30, m: 'dpz_doss' }, { p: 30, m: 'dpz_su' }] } } };
const pl = M.NP.nabidkaProjPlatby(z, v, 'cz');
console.log('kontrola:', pl.kontrola.map(k => k.kod + ' — ' + k.text));
console.log('dopocet.sedi:', pl.dopocet.sedi, '| DPZ splátky:', pl.dopocet.cinnosti.dpz.map(r => r.p + ' % → ' + r.kc));
console.log('planPdKalendar:\n' + M.PP.planPdKalendar(pl));
