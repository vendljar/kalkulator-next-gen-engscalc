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
/* VÝCHOZÍ PLÁN Z KÓDU (rozhodnutí J. V. 1. 10. 2026: „Nastav plán plateb
 * viz příloha jako výchozí standard" — snímek s předvolbou „Záloha + zbytek
 * po předání" a zálohou 70 %). Do té doby byl výchozí Standard po
 * činnostech se zálohou 50 % v předvolbě Záloha. Úseky 1–5 níž počítají
 * Standard a dopočty nad ním — pouštějí se proto nad firemním plánem, který
 * má výchozí předvolbu Standard (platná konfigurace: administrátor ji volí
 * v Nastavení → Firma). Výchozí z kódu hlídá úsek 0. */
const V = PP.PLAN_PROJ_VYCHOZI;
const F = Object.assign({}, V, { vychozi: 'std', zalohaPct: 50 });
const pct = (radky) => radky.map(r => r.p).join('/');

/* 0) výchozí plán z kódu: Záloha 70 % + zbytek po předání */
test('výchozí předvolba z kódu je „Záloha + zbytek po předání" se zálohou 70 %',
  PP.planPredvolba(null, V) === 'zaloha' && V.zalohaPct === 70 && PP.planZalohaEf(null, V) === 70, [V.vychozi, V.zalohaPct]);
test('výchozí plán: každá činnost 70 % po podpisu + 30 % po předání',
  PP.PLAN_PROJ_SEKCE.every(k => JSON.stringify(PP.planRadkyCinnosti(k, null, V).map(r => [r.p, r.m])) === JSON.stringify([[70, 'podpis'], [30, V.predani[k]]])),
  PP.PLAN_PROJ_SEKCE.map(k => k + ':' + PP.planRadkyCinnosti(k, null, V).map(r => r.p + ' ' + r.m).join('+')));
test('výchozí plán: popis „Záloha 70 % + zbytek po předání" a věta způsobu fakturace se zálohou 70 %',
  PP.planPopisPredvolby(null, V) === 'Záloha 70 % + zbytek po předání'
  && PP.planZpusobFakturace(null, V) === 'záloha 70 % po podpisu smlouvy, zbytek po předání jednotlivých stupňů dokumentace',
  [PP.planPopisPredvolby(null, V), PP.planZpusobFakturace(null, V)]);
test('výchozí plán je platný firemní plán (bez vad)', PP.planPlatebFirmaVady(V).length === 0, PP.planPlatebFirmaVady(V));
const dV = PP.planPlatebDopocet({ zamereni: 40000, dpz: 120000, ic: 60000 }, null, V);
test('výchozí plán: dopočet SoD 154 000 po podpisu (70 % z 220 000) + 30 % po předání každé činnosti',
  dV.sedi && dV.platby.map(p => p.klic + ':' + p.castka).join() === 'podpis:154000,za_vystupy:12000,dpz_su:36000,ic_povoleni:18000',
  dV.platby.map(p => p.klic + ':' + p.castka));

/* 1) Standard = dnešní procenta pevných bloků nabídky PROJ (nabidka_proj.js) */
test('předvolba Standard po činnostech (firma s výchozím Standardem)', PP.planPredvolba(null, F) === 'std'
  && PP.planPredvolba({ predvolba: 'std' }, V) === 'std');
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
/* Nulová cena, ne chybějící klíč (mutace jádra 30. 9. 2026): činnost s cenou 0
 * nesmí dostat splátky ani prázdné řádky platby — jádro to hlídá samo, ne
 * jen volající, který nabízené činnosti filtruje. */
const d0 = PP.planPlatebDopocet({ dpz: 120000, ic: 0, dps: 0 }, null, F);
test('činnost s cenou 0 splátky nedostane (ani nulové platby)', !d0.cinnosti.ic && !d0.cinnosti.dps
  && !d0.platby.some(p => p.casti.some(c => c.k === 'ic' || c.k === 'dps')) && d0.platby.every(p => p.castka > 0), d0.platby.map(p => p.klic + ':' + p.castka));
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

/* 9) Firemní plán plateb (Nastavení → Firma, krok 2 etapy B, 30. 9. 2026).
 * Administrátor smí upravit katalog milníků, výchozí předvolbu, zálohu,
 * Standard po činnostech a milník „po předání"; zveřejňuje se se
 * firemními údaji a server ho kontroluje TOUTÉŽ funkcí jako prohlížeč.
 * Před krokem 2 validátor ani čistá kopie neexistovaly. */
const FV = PP.planPlatebFirmaVady, FC = PP.planPlatebFirmaCisty;
test('9: validátor a čistá kopie firemního plánu existují', typeof FV === 'function' && typeof FC === 'function');
if (typeof FV === 'function' && typeof FC === 'function') {
  const kopie = () => JSON.parse(JSON.stringify(F));
  const s = (fn) => { const k = kopie(); fn(k); return k; };
  test('9: výchozí plán z kódu je platný', FV(F).length === 0, FV(F));
  test('9: chybějící plán nevadí — platí výchozí z kódu', FV(undefined).length === 0 && FV(null).length === 0);
  const vadne = [
    ['není objekt', 'text'],
    ['pole místo objektu', []],
    ['neznámá výchozí předvolba', s(k => { k.vychozi = 'xyz'; })],
    ['záloha mimo výčet 0/30/50/70', s(k => { k.zalohaPct = 45; })],
    ['id milníku s mezerou', s(k => { k.milniky.push({ id: 'po predani', cz: 'po předání' }); })],
    ['zdvojené id milníku', s(k => { k.milniky.push({ id: 'podpis', cz: 'jinak' }); })],
    ['milník bez textu', s(k => { k.milniky.push({ id: 'prazdny', cz: '  ' }); })],
    ['text milníku přes 300 znaků', s(k => { k.milniky.push({ id: 'dlouhy', cz: 'x'.repeat(301) }); })],
    ['víc než 40 milníků', s(k => { for (let i = 0; i < 30; i++) k.milniky.push({ id: 'm' + i, cz: 'milník ' + i }); })],
    ['katalog bez „po podpisu" (předvolba Záloha ho potřebuje)', s(k => {
      k.milniky = k.milniky.filter(m => m.id !== 'podpis');
      Object.keys(k.standard).forEach(c => { k.standard[c] = [{ p: 100, m: k.predani[c] }]; }); })],
    ['id „vlastni" v katalogu', s(k => { k.milniky.push({ id: 'vlastni', cz: 'vlastní' }); })],
    ['Standard DPZ dává 90 %', s(k => { k.standard.dpz[2].p = 10; })],
    ['Standard s neznámým milníkem', s(k => { k.standard.ic[1].m = 'neexistuje'; })],
    ['Standard se záporným procentem', s(k => { k.standard.dps = [{ p: 150, m: 'podpis' }, { p: -50, m: 'dps_predani' }]; })],
    ['Standard bez řádků', s(k => { k.standard.ezc = []; })],
    ['Standard neznámé činnosti', s(k => { k.standard.dozor = [{ p: 100, m: 'podpis' }]; })],
    ['Standard s víc než 10 splátkami', s(k => { k.standard.geodet = Array.from({ length: 11 }, (_, i) => ({ p: i < 10 ? 9 : 10, m: 'podpis' })); })],
    ['„po předání" s neznámým milníkem', s(k => { k.predani.dps = 'nic'; })],
    ['„po předání" neznámé činnosti', s(k => { k.predani.dozor = 'podpis'; })],
    ['verze tvaru jiná než 1', s(k => { k.v = 2; })],
  ];
  vadne.forEach(([n, f]) => test('9: vadný firemní plán se pozná — ' + n, FV(f).length > 0, FV(f)));
  test('9: vada se vypíše lidsky (věta, ne kód)', FV(s(k => { k.standard.dpz[2].p = 10; })).some(v => /DPZ|dpz/.test(v) && /100/.test(v)),
    FV(s(k => { k.standard.dpz[2].p = 10; })));
  const upr = s(k => { k.vychozi = 'zaloha'; k.zalohaPct = 30; k.milniky.push({ id: 'predani_klic', cz: 'po předání klíčů' });
    k.standard.geodet = [{ p: 50, m: 'podpis' }, { p: 50, m: 'predani_klic' }]; });
  test('9: upravený, ale správný plán projde', FV(upr).length === 0, FV(upr));
  const cis = FC(Object.assign(s(k => { k.milniky[0].navic = '<b>'; k.standard.zamereni[0].navic = 1; }), { cizi: 1 }));
  test('9: čistá kopie nese jen známé klíče',
    cis.cizi === undefined && cis.milniky.every(m => Object.keys(m).sort().join() === 'cz,id')
    && cis.standard.zamereni.every(r => Object.keys(r).sort().join() === 'm,p'), cis);
  const orig = kopie(), c2 = FC(orig); c2.milniky[0].cz = 'změněno'; c2.standard.dpz[0].p = 1;
  test('9: čistá kopie je hluboká (změna kopie nesáhne na originál)', orig.milniky[0].cz !== 'změněno' && orig.standard.dpz[0].p === 50);
  test('9: upravený firemní plán řídí předvolby (Záloha 30 % z firmy, geodet z firemního Standardu)',
    pct(PP.planRadkyCinnosti('dpz', { predvolba: 'zaloha' }, upr)) === '30/70'
    && PP.planRadkyCinnosti('geodet', { predvolba: 'std' }, upr)[1].t === 'po předání klíčů' && PP.planPredvolba(null, upr) === 'zaloha'
    && pct(PP.planRadkyCinnosti('geodet', null, upr)) === '30/70');
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
