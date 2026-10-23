// Převod částek krycího listu do Pipedrive (pd_prevod.mjs) — tečka jako oddělovač tisíců
import { pdDoPd, pdCisla, pdHodnotaDealu, pdKcText } from '../../../netlify/lib/pd_prevod.mjs';
import { POLE_DEALU } from '../../../netlify/lib/pd_mapa.mjs';
const D = (k) => (POLE_DEALU || []).find(d => d.klic === k);
const popis = { typ: 'monetary', zapisovatelne: true };
for (const t of ['1 000 Kč / den', '1.000 Kč / den', '1.000,- Kč', '2.500 Kč', '10.000 Kč', '1,000 CZK', 'EUR 1.500', '500 € / den'])
  console.log(JSON.stringify(t).padEnd(20), '→', JSON.stringify(pdDoPd(D('pokutaSoucinnost'), 'ock', { hodnoty: { sodPokutaDenni: t } }, popis, { mena: 'CZK' })));
console.log('pdCisla("1.000.000 Kč") =', pdCisla('1.000.000 Kč'));
console.log('hodnota dealu 0,005:', JSON.stringify(pdHodnotaDealu({ ock: { cena: 1000.005, mena: 'CZK' } })));
console.log('mena "czk" malými:', JSON.stringify(pdHodnotaDealu({ ock: { cena: 1000, mena: 'eur' }, proj: { cena: 1, mena: 'EUR' } })));
