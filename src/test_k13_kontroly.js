/* P5 (K13-N56, 24. 9. 2026) — kontrola před nabídkou: schválená sleva
 * a šablona nabídky OCK bez symbolu {{SLEVA_KC}}. Word pak ukáže jen
 * konečnou cenu, zatímco online náhled ukazuje cenu před slevou i slevu. */
const sl = require('./sleva.js');
global.slevaPlati = sl.slevaPlati; global.slevaPodil = sl.slevaPodil;
const kt = require('./kontroly.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const nalez = ctx => kt.kontrolyProved(ctx).nalezy.find(n => n.kod === 'slevaWord');

const schvalena = { procenta: 5, stav: 'schváleno' };
const bezSlevy = { symboly: ['CENA_BEZ_DPH', 'CENA_S_DPH', 'DPH_KC'], nazev: 'Sablona_NABIDKA_CN_v11.docx', verze: 2 };
const seSlevou = { symboly: ['CENA_BEZ_DPH', 'CENA_PRED_SLEVOU', 'SLEVA_KC', 'SLEVA_PROC'], nazev: 'v12', verze: 3 };

const n = nalez({ sleva: schvalena, sablonaNabidka: bezSlevy });
test('schválená sleva + šablona bez {{SLEVA_KC}} → varování', !!n, n);
test('text říká, že Word slevu neukáže, a jmenuje šablonu i verzi',
  n && /Word slevu neukáže/.test(n.text) && /v11/.test(n.text) && /verze 2/.test(n.text) && /5 %/.test(n.text), n && n.text);
test('je to jen varování (úroveň 2), dokument se nezastaví', n && n.uroven === 2);
test('šablona se symbolem → nic', !nalez({ sleva: schvalena, sablonaNabidka: seSlevou }));
test('bez slevy → nic', !nalez({ sleva: { procenta: 0, stav: 'schváleno' }, sablonaNabidka: bezSlevy }));
test('neschválená sleva → nic (do ceny nejde)', !nalez({ sleva: { procenta: 5, stav: 'čeká na schválení' }, sablonaNabidka: bezSlevy }));
test('šablonu neznáme (ještě se stahuje / bez serveru) → mlčí', !nalez({ sleva: schvalena, sablonaNabidka: null }));
test('zakázka jen PROJ → mlčí', !nalez({ sleva: schvalena, sablonaNabidka: bezSlevy, jenProj: true }));
test('pravidlo je v katalogu', kt.kontrolyPravidla().some(p => p.kod === 'slevaWord'));

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
