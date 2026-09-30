/* PLÁN PLATEB PROJEKCE — jádro (etapa B platebních podmínek, #367, 29. 9. 2026).
 *
 * Čistý model bez DOM: předvolby (Standard po činnostech = dnešní procenta
 * v nabidka_proj.js, Záloha + zbytek po předání = dnešní krycí list PROJ,
 * 100 % po dokončení stupně = dnešní věta v Nastavení → Firma, Vlastní),
 * dopočet splátek SoD PROJ z ceny činnosti po slevě, sčítání splátek se
 * stejným milníkem, zaokrouhlení nese poslední splátka činnosti, ruční
 * přepis částky, kontroly (100 % u činnosti, součet = cena díla) a převod
 * starších ručních splátek SoD (sodpPlatba1–8). Před zavedením modul
 * src/plan_plateb.js neexistoval — sada selže hned na první kontrole.
 *
 * Spuštění: cd src && node test_plan_plateb.js */
let PP = null;
try { PP = require('./plan_plateb.js'); } catch (e) { PP = null; }
const NP = require('./nabidka_proj.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

test('modul src/plan_plateb.js existuje', !!PP);
if (!PP) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }
const F = PP.PLAN_PROJ_VYCHOZI;
const pct = (radky) => radky.map(r => r.p).join('/');

/* 1) Standard = dnešní procenta pevných bloků nabídky PROJ (nabidka_proj.js) */
test('výchozí předvolba je Standard po činnostech', PP.planPredvolba(null, F) === 'std');
const def = NP.NABIDKA_PROJ_DEF || [];
const blok = (s) => def.find(b => b.typ === 'pary' && /^PLATEBNÍ PODMÍNKY/.test(b.nadpis || '') && [].concat(b.sekce || []).indexOf(s) >= 0);
const procentaBloku = (s) => ((blok(s) || {}).radky || []).map(r => +((/(\d+)\s*%/.exec(r[1]) || [])[1]));
for (const [k, ocek] of [['zamereni', '50/50'], ['studie', '50/40/10'], ['dpz', '50/30/20'], ['ic', '50/30/20'], ['kolaudace', '50/50']]) {
  test('Standard ' + k + ' = ' + ocek + ' (jako dnešní blok nabídky)', pct(PP.planRadkyCinnosti(k, null, F)) === ocek
    && procentaBloku(k).join('/') === ocek, { plan: pct(PP.planRadkyCinnosti(k, null, F)), blok: procentaBloku(k) });
}
test('Standard DPS 50/50 a EZC 50/50 (dnes jeden společný blok)', pct(PP.planRadkyCinnosti('dps', null, F)) === '50/50' && pct(PP.planRadkyCinnosti('ezc', null, F)) === '50/50');
test('Standard: první splátka je „po podpisu", poslední u DPZ „na stavební úřad"',
  PP.planRadkyCinnosti('dpz', null, F)[0].m === 'podpis' && PP.planRadkyCinnosti('dpz', null, F)[2].m === 'dpz_su');
test('každá činnost PROJ má ve Standardu 100 %', PP.PLAN_PROJ_SEKCE.every(k => PP.planRadkyCinnosti(k, null, F).reduce((a, r) => a + r.p, 0) === 100));

/* 2) Záloha + zbytek po předání, 100 % po dokončení stupně */
const zal30 = { predvolba: 'zaloha', zaloha: 30 };
test('Záloha 30 %: DPZ 30 % po podpisu + 70 % po předání (DPZ na SÚ)', JSON.stringify(PP.planRadkyCinnosti('dpz', zal30, F).map(r => [r.p, r.m])) === '[[30,"podpis"],[70,"dpz_su"]]');
test('Bez zálohy (0 %): jediná splátka 100 % po předání', JSON.stringify(PP.planRadkyCinnosti('ic', { predvolba: 'zaloha', zaloha: 0 }, F).map(r => [r.p, r.m])) === '[[100,"ic_povoleni"]]');
test('100 % po dokončení stupně: 100 % po předání', JSON.stringify(PP.planRadkyCinnosti('zamereni', { predvolba: 'sto' }, F).map(r => [r.p, r.m])) === '[[100,"za_vystupy"]]');
test('Vlastní: upravená činnost platí, neupravená spadne na Standard',
  pct(PP.planRadkyCinnosti('dpz', { predvolba: 'vlastni', cinnosti: { dpz: [{ p: 40, m: 'podpis' }, { p: 60, m: 'dpz_su' }] } }, F)) === '40/60'
  && pct(PP.planRadkyCinnosti('ic', { predvolba: 'vlastni', cinnosti: { dpz: [{ p: 40, m: 'podpis' }, { p: 60, m: 'dpz_su' }] } }, F)) === '50/30/20');

/* 3) Dopočet SoD: procento × cena činnosti po slevě, sčítání podle milníku */
const ceny = { zamereni: 40000, dpz: 120000, ic: 60000 };   // ceny po slevě, jen nabízené
const d = PP.planPlatebDopocet(ceny, null, F);
test('součet plateb = cena díla (220 000 Kč)', d.soucet === 220000 && d.cena === 220000 && d.sedi === true, d);
const podpis = d.platby.find(p => p.klic === 'podpis');
test('splátky „po podpisu" ze ZA, DPZ a IČ se sečtou do jedné platby (20 000 + 60 000 + 30 000)',
  !!podpis && podpis.castka === 110000 && podpis.casti.length === 3, podpis);
test('pořadí plateb podle katalogu milníků (po podpisu první)', d.platby[0].klic === 'podpis' && d.platby.map(p => p.klic).join() === 'podpis,za_vystupy,dpz_doss,dpz_su,ic_podani,ic_povoleni', d.platby.map(p => p.klic));
test('neoceněná (nenabízená) činnost do plateb nevstoupí', !d.platby.some(p => p.casti.some(c => c.k === 'dps')));
const dh = PP.planPlatebDopocet({ studie: 33333.33 }, null, F);
const st = dh.cinnosti.studie;
test('zaokrouhlení nese poslední splátka činnosti (celé koruny, poslední dorovná na haléř)',
  st[0].kc === 16667 && st[1].kc === 13333 && Math.round(st[2].kc * 100) === 333333 && Math.round(dh.soucet * 100) === 3333333, st);
const dz = PP.planPlatebDopocet({ dpz: 100000 }, { predvolba: 'zaloha', zaloha: 50 }, F);
test('dopočet předvolby Záloha 50 %: 50 000 po podpisu + 50 000 po předání', dz.platby.map(p => p.castka).join('/') === '50000/50000', dz.platby);

/* 4) Ruční přepis částky, ↺, osiřelý přepis */
const dp = PP.planPlatebDopocet(ceny, { prepis: { podpis: 100000 } }, F);
test('ruční přepis částky platby platí a je označený', dp.platby[0].castka === 100000 && dp.platby[0].prepsano === true && dp.platby[0].vypocet === 110000);
test('ruční přepis, se kterým součet nesedí, se pozná (sedi false)', dp.sedi === false && dp.soucet === 210000);
const dos = PP.planPlatebDopocet(ceny, { prepis: { vyber: 5000 } }, F);
test('přepis platby, kterou plán nemá, je osiřelý a nepočítá se', dos.osirele.length === 1 && dos.osirele[0].klic === 'vyber' && dos.soucet === 220000, dos.osirele);

/* 5) Vlastní milník: text, sčítání podle textu, na konci */
const pv = { predvolba: 'vlastni', cinnosti: { zamereni: [{ p: 50, m: 'podpis' }, { p: 50, m: 'vlastni', t: 'Po odsouhlasení výkresů' }],
  dpz: [{ p: 50, m: 'podpis' }, { p: 50, m: 'vlastni', t: 'po odsouhlasení výkresů ' }] } };
const dv = PP.planPlatebDopocet({ zamereni: 10000, dpz: 20000 }, pv, F);
test('vlastní milník se stejným textem se sečte a stojí na konci', dv.platby.length === 2 && dv.platby[1].klic === 'v:po odsouhlasení výkresů'
  && dv.platby[1].castka === 15000 && dv.platby[1].text === 'Po odsouhlasení výkresů', dv.platby);

/* 6) Kontroly (zábrany): 100 % u činnosti, kladná procenta, známý milník, součet */
const k1 = PP.planPlatebKontrola(ceny, { predvolba: 'vlastni', cinnosti: { dpz: [{ p: 50, m: 'podpis' }, { p: 40, m: 'dpz_su' }] } }, F);
test('kontrola: činnost se součtem 90 % → nález', k1.some(x => x.kod === 'procenta' && x.k === 'dpz'), k1);
const k2 = PP.planPlatebKontrola(ceny, { predvolba: 'vlastni', cinnosti: { ic: [{ p: 0, m: 'podpis' }, { p: 100, m: 'ic_povoleni' }] } }, F);
test('kontrola: nulové nebo záporné procento → nález', k2.some(x => x.kod === 'kladne' && x.k === 'ic'), k2);
const k3 = PP.planPlatebKontrola(ceny, { predvolba: 'vlastni', cinnosti: { zamereni: [{ p: 100, m: 'neznamy' }] } }, F);
test('kontrola: neznámý milník → nález', k3.some(x => x.kod === 'milnik' && x.k === 'zamereni'), k3);
const k4 = PP.planPlatebKontrola(ceny, { predvolba: 'vlastni', cinnosti: { zamereni: [{ p: 100, m: 'vlastni', t: '   ' }] } }, F);
test('kontrola: vlastní milník bez textu → nález', k4.some(x => x.kod === 'milnik'), k4);
const k5 = PP.planPlatebKontrola(ceny, { prepis: { podpis: 1 } }, F);
test('kontrola: součet plateb ≠ cena díla → nález „soucet"', k5.some(x => x.kod === 'soucet'), k5);
test('kontrola: zdravý plán (Standard) nic nehlásí', PP.planPlatebKontrola(ceny, null, F).length === 0, PP.planPlatebKontrola(ceny, null, F));
test('kontrola hlídá jen nabízené činnosti (vadná nenabízená mlčí)',
  PP.planPlatebKontrola({ zamereni: 1000 }, { predvolba: 'vlastni', cinnosti: { dps: [{ p: 10, m: 'podpis' }] } }, F).length === 0);

/* 7) Převod starších ručních splátek SoD (sodpPlatba1–8) bez ztráty */
test('částka z textu: „95 880 Kč", „95 880,50 Kč", nezlomitelná mezera', PP.planCastkaZTextu('95 880 Kč') === 95880
  && PP.planCastkaZTextu('95 880,50 Kč') === 95880.5 && PP.planCastkaZTextu('95 880') === 95880 && PP.planCastkaZTextu('dohodou') === null);
const leg = PP.planPlatebZeStarych({ sodpPlatba1: '110 000 Kč', sodpPlatba4: '24 000', sodpPlatba8: '5 000 Kč', sodpPlatba6: 'viz příloha' });
test('sodpPlatba1 → přepis platby „po podpisu", 4 → „DPZ na stavební úřad", 8 → „po doporučení dodavatele"',
  leg.prepis.podpis === 110000 && leg.prepis.dpz_su === 24000 && leg.prepis.vyber === 5000, leg);
test('nečitelná částka se nezahodí — vrátí se k upozornění', leg.necitelne.length === 1 && leg.necitelne[0].id === 'sodpPlatba6' && leg.necitelne[0].text === 'viz příloha', leg.necitelne);

/* 8) Autorský dozor stojí mimo splátky a nic záporného ani NaN */
test('autorský dozor není mezi činnostmi splátek', PP.PLAN_PROJ_SEKCE.indexOf('ad') < 0 && PP.PLAN_PROJ_SEKCE.indexOf('dozor') < 0);
let spatne = 0;
for (let i = 1; i <= 300; i++) {
  const c = { zamereni: (i * 997) % 90000 + 0.37, dpz: (i * 7919) % 400000, ic: i % 3 ? (i * 104729) % 250000 + 0.5 : 0 };
  const plan = i % 4 === 0 ? null : { predvolba: ['std', 'zaloha', 'sto', 'vlastni'][i % 4], zaloha: [0, 30, 50, 70][i % 4] };
  const r = PP.planPlatebDopocet(c, plan, F);
  const cena = Object.values(c).filter(x => x > 0).reduce((a, b) => a + b, 0);
  if (Math.round(r.soucet * 100) !== Math.round(cena * 100) || r.platby.some(p => !(p.castka >= 0) || !isFinite(p.castka))) spatne++;
}
test('fuzz 300 zakázek: součet plateb = cena díla na haléř, nic záporného ani NaN', spatne === 0, spatne);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
