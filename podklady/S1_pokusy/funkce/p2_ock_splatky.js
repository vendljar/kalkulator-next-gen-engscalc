// OCK: součet záloha + dílčí 2 + konečná ≠ 100 % — nic to nehlídá, CN a SoD si odporují
const M = require('./h.js');
const PD = require('../../../src/podminky.js').PODMINKY;
const ef = PD.podminkyEf({});
console.log('volby zálohy:', PD.podminkyZalohyVolby(ef));
console.log('výchozí: ', PD.podminkyZalohaVychozi(ef), '|', PD.podminkyFaktura2(ef), '|', PD.podminkyKonecna(ef));
// a) dopočet při záloze 70 % a konečné 40 % (ruční) -> zbytek záporný -> null (faktura2 zůstane)
console.log('dopočet 70 + 40:', M.K.kryciFaktura2Dopocet('70 % – po podpisu smlouvy', '40 % – po předání', '40 % – po zahájení montáže'));
const z = M.zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 902'; z.dic = 'CZ12345678';
const v = z.varianty[0];
v.data.kryci = { hodnoty: { zaloha1: '70 % – po podpisu smlouvy', faktura2: '40 % – po zahájení montáže', fakturaKonc: '40 % – po předání díla' } };
const kal = M.K.kryciPlatebniKalendar(z, v);
console.log('kalendář:', kal.splatky.map(s => s.id + '=' + s.pct), 'součet', kal.splatky.reduce((a, s) => a + (s.pct || 0), 0));
const sym = M.K.kryciPlatebniSymboly(kal, null, 'cz');
console.log('CN PODM_PLATEBNI_KALENDAR:\n' + sym.PODM_PLATEBNI_KALENDAR);
const s = M.K.kryciSodPlatby(z, v, require('../../../src/jekly.json'), { symboly: new Set(['SOD_PLATEBNI_KALENDAR']) }, 'cz');
console.log('SoD SOD_PLATEBNI_KALENDAR:\n' + s.symboly.SOD_PLATEBNI_KALENDAR, '\nchyba:', JSON.stringify(s.chyba));
// zábrany kontrol
const K = require('../../../src/kontroly.js');
console.log(Object.keys(K).filter(k=>/kontrol/i.test(k)).slice(0,10));
