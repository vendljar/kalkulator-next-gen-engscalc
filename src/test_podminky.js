/* ============================================================
 * Test podminky.js — platební a smluvní podmínky firmy (#367 fáze 2)
 *
 * PROČ TAHLE SADA
 *
 * Rozhodnutí J. V. 19. 10. 2026: výchozí platební podmínky krycích listů
 * OCK a PROJ se přesouvají z kódu do Nastavení → Firma. Tři věci se přitom
 * nesmějí stát:
 *
 *  1) VÝSTUP SE NEZMĚNÍ. Prázdné Nastavení (nová instalace, starší
 *     _nastaveni.json, starší online firma) musí předvyplnit přesně to, co
 *     dosud stálo v kódu: splatnost 14 dní, záloha 50 % po podpisu, 40 %
 *     po zahájení montáže, 10 % po předání, zádržné Ano/Ne bez procent,
 *     záruka 60 měsíců, pokuty 0 a 0,05 % / den, limit 10 % uplatněn.
 *  2) ODESLANÁ NABÍDKA SE NEZMĚNÍ. Zamčená varianta čte zmrazené hodnoty;
 *     změna Firmy se jí nesmí dotknout — ani u polí, která dřív předvyplněná
 *     nebyla (procenta zádržného).
 *  3) VADNÝ STANDARD NEODEJDE. Součet záloha + faktura 2 + konečná ≠ 100 %
 *     zablokuje zveřejnění (Q4) — a pravidlo jde přepnout jednou konstantou.
 *
 * Firma v testech je ukázková (firmaDefault), nic skutečného.
 * ============================================================ */
const fs = require('fs');
const vm = require('vm');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
const PD = nacti('./podminky.js');
const FM = nacti('./firma.js');
const zk = nacti('./zakazka.js');
const kr = nacti('./kryci.js');
const kp = nacti('./kryci_proj.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : info); } };
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
const kopie = x => JSON.parse(JSON.stringify(x));

const POLE_OCK = [].concat(...kr.KRYCI_SEKCE.map(s => s.pole));
const POLE_PROJ = [].concat(...kp.KRYCI_PROJ_SEKCE.map(s => s.pole));
const pO = id => POLE_OCK.find(p => p.id === id);
const pP = id => POLE_PROJ.find(p => p.id === id);

global.NAST = { firma: FM.firmaDefault() };
const zak = zk.novaZakazka();
zak.cislo = '2026 - OPR - CN - 367';
zak.nazevAkce = 'Zkušební šachta podmínek';
const v = zak.varianty[0];
const ctxO = () => kr.kryciCtx(zak, v, JEKLY);
const ctxP = () => kp.kryciProjCtx(zak, v);
const hO = (id, kl) => kr.kryciHodnota(pO(id), kl || { hodnoty: {} }, ctxO());
const hP = (id, kl) => kp.kryciProjHodnota(pP(id), kl || { hodnoty: {} }, ctxP());

/* ---------- 1) továrna = dnešní výstup ---------- */
const DNES_OCK = {
  splatnostDni: '14', zaloha1: '50 % – po podpisu smlouvy', faktura2: '40 % – po zahájení montáže',
  fakturaKonc: '10 % – po předání', zadrzne: 'Ano', zadrzneProc: '', zadrzneZaruka: 'Ne', zadrzneZarukaProc: '',
  zarukaMesicu: '60', pokutaDodavka: '0', pokutaSplatnost: '0,05 % / den', pokutaLimit: 'Uplatněn limit 10 %',
};
Object.keys(DNES_OCK).forEach(id =>
  test('prázdné Nastavení: OCK ' + id + ' = dnešní „' + DNES_OCK[id] + '"', hO(id) === DNES_OCK[id], hO(id)));
const DNES_PROJ = { splatnostDni: '14', pokutaTermin: '0', pokutaSplatnost: '0,05 % / den', pokutaLimit: 'Uplatněn limit 10 %' };
Object.keys(DNES_PROJ).forEach(id =>
  test('prázdné Nastavení: PROJ ' + id + ' = dnešní „' + DNES_PROJ[id] + '"', hP(id) === DNES_PROJ[id], hP(id)));
test('volby zálohy OCK = dnešní čtyři',
  JSON.stringify(pO('zaloha1').o) === JSON.stringify(['Bez zálohy', '30 % – po podpisu smlouvy', '50 % – po podpisu smlouvy', '70 % – po podpisu smlouvy']),
  pO('zaloha1').o);
test('číselník pokut OCK i PROJ = dnešní trojice',
  JSON.stringify(pO('pokutaDodavka').o) === '["0","0,05 % / den","0,1 % / den"]'
  && JSON.stringify(pP('pokutaTermin').o) === JSON.stringify(pO('pokutaDodavka').o), pO('pokutaDodavka').o);
test('limit pokut: dnešní dvě volby',
  JSON.stringify(pO('pokutaLimit').o) === '["Uplatněn limit 10 %","NEUPLATNĚN limit 10 %"]'
  && JSON.stringify(pP('pokutaLimit').o) === JSON.stringify(pO('pokutaLimit').o));
test('NABIDKA_PROJ_SAZBY.splatnostDni (záloha online nabídky PROJ) = 14',
  nacti('./nabidka_proj.js').NABIDKA_PROJ_SAZBY.splatnostDni === 14);
test('symboly šablony z prázdného Nastavení: PODM_SPLATNOST_DNI = 14, PODM_ZALOHA1_PROC = 50 %',
  (() => { const s = kr.kryciPodminkoveSymboly(zak, v, JEKLY);
    return s.PODM_SPLATNOST_DNI === '14' && s.PODM_ZALOHA1_PROC === '50 %' && s.PODM_ZARUKA_MESICU === '60'; })(),
  kr.kryciPodminkoveSymboly(zak, v, JEKLY));

/* ---------- 2) změna Firmy se propíše do rozpracované varianty ---------- */
NAST.firma.podminky = { v: 1, sazbyPokut: ['0', '0,05 % / den', '0,2 % / den'], limitPokutProc: 15,
  ock: { splatnostDni: 30, zalohyProc: [0, 40, 60], zalohaProc: 60, zalohaMilnik: 'po podpisu SoD',
         faktura2Proc: 30, faktura2Milnik: 'po dodání materiálu', konecnaProc: 10, konecnaMilnik: 'po převzetí',
         zadrzneVan: 'Ne', zadrzneVanProc: 5, zadrzneZaruka: 'Ano', zadrzneZarukaProc: 3,
         zarukaMesicu: 36, pokutaDodavka: '0,2 % / den', pokutaSplatnost: '0', pokutaLimit: 'neuplatnen' },
  proj: { splatnostDni: 21, pokutaTermin: '0,05 % / den', pokutaSplatnost: '0,2 % / den', pokutaLimit: 'neuplatnen' } };
const NOVE_OCK = { splatnostDni: '30', zaloha1: '60 % – po podpisu SoD', faktura2: '30 % – po dodání materiálu',
  fakturaKonc: '10 % – po převzetí', zadrzne: 'Ne', zadrzneProc: '5', zadrzneZaruka: 'Ano', zadrzneZarukaProc: '3',
  zarukaMesicu: '36', pokutaDodavka: '0,2 % / den', pokutaSplatnost: '0', pokutaLimit: 'NEUPLATNĚN limit 15 %' };
Object.keys(NOVE_OCK).forEach(id =>
  test('Firma změněna: OCK ' + id + ' = „' + NOVE_OCK[id] + '"', hO(id) === NOVE_OCK[id], hO(id)));
const NOVE_PROJ = { splatnostDni: '21', pokutaTermin: '0,05 % / den', pokutaSplatnost: '0,2 % / den', pokutaLimit: 'NEUPLATNĚN limit 15 %' };
Object.keys(NOVE_PROJ).forEach(id =>
  test('Firma změněna: PROJ ' + id + ' = „' + NOVE_PROJ[id] + '"', hP(id) === NOVE_PROJ[id], hP(id)));
test('Firma změněna: volby zálohy z Firmy',
  JSON.stringify(pO('zaloha1').o) === '["Bez zálohy","40 % – po podpisu SoD","60 % – po podpisu SoD"]', pO('zaloha1').o);
test('Firma změněna: číselník pokut v krycím listu z Firmy',
  pO('pokutaSplatnost').o.indexOf('0,2 % / den') >= 0 && pP('pokutaTermin').o.indexOf('0,1 % / den') < 0);
test('Firma změněna: dopočet faktury 2 vychází z firemní zálohy a konečné',
  kr.kryciFaktura2Sync({}) === '30 % – po dodání materiálu', kr.kryciFaktura2Sync({}));
test('Firma změněna: zdroj u pole je „Nastavení → Firma"',
  ['splatnostDni', 'zaloha1', 'faktura2', 'zarukaMesicu', 'pokutaLimit'].every(id => pO(id).src === 'Nastavení → Firma')
  && ['splatnostDni', 'pokutaTermin'].every(id => pP(id).src === 'Nastavení → Firma'));

/* ---------- 3) ruční zápis v krycím listu vyhrává ---------- */
test('ruční zápis OCK splatnosti vyhrává nad Firmou', hO('splatnostDni', { hodnoty: { splatnostDni: '7' } }) === '7');
test('ruční zápis PROJ pokuty vyhrává nad Firmou', hP('pokutaTermin', { hodnoty: { pokutaTermin: '0' } }) === '0');

/* ---------- 4) zamčená varianta se nezmění ---------- */
{
  delete NAST.firma.podminky;                       // nabídka odešla za továrny
  const z2 = zk.novaZakazka(); z2.cislo = '2026 - OPR - CN - 368'; const v2 = z2.varianty[0];
  kr.kryciZmrazPodminky(z2, v2, JEKLY);
  v2.zamek = { zamceno: true };
  NAST.firma.podminky = kopie({ v: 1, ock: { splatnostDni: 45, zarukaMesicu: 24, zadrzneVanProc: 7, zadrzneZarukaProc: 2 } });
  const c2 = kr.kryciCtx(z2, v2, JEKLY);
  const h2 = id => kr.kryciHodnota(pO(id), v2.data.kryci, c2);
  test('zamčená varianta: splatnost zůstává 14 (zmrazeno), ne 45 z nové Firmy', h2('splatnostDni') === '14', h2('splatnostDni'));
  test('zamčená varianta: záruka zůstává 60', h2('zarukaMesicu') === '60', h2('zarukaMesicu'));
  test('zamčená varianta: procenta zádržného (dřív bez předvyplnění) se z nové Firmy nedoplní',
    h2('zadrzneProc') === '' && h2('zadrzneZarukaProc') === '', [h2('zadrzneProc'), h2('zadrzneZarukaProc')]);
  test('rozpracovaná varianta: nová splatnost 45 z Firmy', hO('splatnostDni') === '45');
}

/* ---------- 5) neplatná uložená hodnota → továrna po polích ---------- */
NAST.firma.podminky = { ock: { splatnostDni: 'abc', zarukaMesicu: 999, faktura2Proc: 35 }, proj: { splatnostDni: 0 } };
test('neplatná splatnost OCK → továrna 14', hO('splatnostDni') === '14');
test('neplatná záruka (999 měsíců) → továrna 60', hO('zarukaMesicu') === '60');
test('platné pole vedle neplatných platí (faktura 2 = 35 %)', /^35 %/.test(hO('faktura2')), hO('faktura2'));
test('neplatná splatnost PROJ (0) → továrna 14', hP('splatnostDni') === '14');
NAST.firma.podminky = { sazbyPokut: ['0', '0,3 % / den'] };
test('pokuta z továrny, kterou upravený číselník nezná → první sazba (0)', hO('pokutaSplatnost') === '0', hO('pokutaSplatnost'));
NAST.firma.podminky = { ock: { zalohyProc: [0, 30], zalohaProc: 50 } };
test('výchozí záloha mimo volby → poslední volba (krycí list nepředvyplní, co rozbalovátko nemá)',
  hO('zaloha1') === '30 % – po podpisu smlouvy', hO('zaloha1'));
NAST.firma.podminky = 'nesmysl';
test('podmínky jiného typu než objekt → celá továrna', hO('splatnostDni') === '14' && hO('zaloha1') === DNES_OCK.zaloha1);
delete NAST.firma.podminky;

/* ---------- 6) vady a zveřejnění ---------- */
test('bez podmínek žádné vady (platí továrna)', PD.podminkyVady(undefined).length === 0 && PD.podminkyVady(null).length === 0);
test('součet továrny = 100 %', PD.podminkySoucetOck(PD.podminkyEf({})).ok);
const spatny = { ock: { zalohaProc: 50, faktura2Proc: 45, konecnaProc: 10 } };
test('součet 105 % → vada „musí dát 100 %"', PD.podminkyVady(spatny).some(x => /105 %.*100 %/.test(x)), PD.podminkyVady(spatny));
test('součet 105 %: firmaLzeZverejnit odmítne',
  !FM.firmaLzeZverejnit(Object.assign(kopie(FM.firmaDefault()), { ukazkove: false, podminky: spatny })).ok);
test('vady: neznámé pole, splatnost 0, zádržné 30 %, pokuta mimo číselník, sazby bez nuly',
  ['neznámé pole', 'splatnost', 'zádržného', 'pokuta za prodlení dodávky'].every(t =>
    PD.podminkyVady({ ock: { xx: 1, splatnostDni: 0, zadrzneVanProc: 30, pokutaDodavka: '5 %' } }).some(x => x.indexOf(t) >= 0))
  && PD.podminkyVady({ sazbyPokut: ['0,05 % / den'] }).length === 1,
  PD.podminkyVady({ ock: { xx: 1, splatnostDni: 0, zadrzneVanProc: 30, pokutaDodavka: '5 %' } }));
test('vady: výchozí záloha musí být mezi volbami', PD.podminkyVady({ ock: { zalohaProc: 40 } }).some(x => /jednou z voleb/.test(x)));
test('vady: podmínky jako pole → „není objekt"', PD.podminkyVady([1]).length === 1);
const dobra = { v: 1, ock: { splatnostDni: 21, zarukaMesicu: 36 }, proj: { splatnostDni: 30 } };
const firmaOk = Object.assign(kopie(FM.firmaDefault()), { ukazkove: false, podminky: Object.assign({ cizi: 'x' }, dobra) });
test('platné podmínky projdou firmaLzeZverejnit', FM.firmaLzeZverejnit(firmaOk).ok, FM.firmaLzeZverejnit(firmaOk));
test('firmaKZverejneni nese čistou kopii podmínek (bez cizích klíčů)',
  JSON.stringify(FM.firmaKZverejneni(firmaOk).podminky) === JSON.stringify(dobra), FM.firmaKZverejneni(firmaOk).podminky);
test('firmaKZverejneni vadné podmínky vynechá',
  !('podminky' in FM.firmaKZverejneni(Object.assign(kopie(firmaOk), { podminky: spatny }))));
test('firmaShodaSOnline hlásí rozdíl „Platební podmínky"',
  FM.firmaShodaSOnline(firmaOk, FM.firmaKZverejneni(Object.assign(kopie(firmaOk), { podminky: { ock: { splatnostDni: 14 } } })))
    .rozdily.indexOf('Platební podmínky') >= 0);
test('firmaShodaSOnline: shodné podmínky rozdíl nehlásí',
  FM.firmaShodaSOnline(firmaOk, FM.firmaKZverejneni(firmaOk)).shodne);

/* ---------- 7) Q4: pravidlo součtu je v jedné konstantě ---------- */
{
  const src = fs.readFileSync(__dirname + '/podminky.js', 'utf8');
  test('PODMINKY_SOUCET_BLOKUJE je jediná konstanta a dnes true',
    (src.match(/const PODMINKY_SOUCET_BLOKUJE = (true|false);/g) || []).length === 1 && PD.PODMINKY_SOUCET_BLOKUJE === true);
  const ctx = { module: { exports: {} } };
  vm.runInNewContext(src.replace('const PODMINKY_SOUCET_BLOKUJE = true;', 'const PODMINKY_SOUCET_BLOKUJE = false;'), ctx);
  const P2 = ctx.module.exports;
  test('přepnutí konstanty na false: součet 105 % už zveřejnění neblokuje, jen se hlásí',
    P2.podminkyVady(spatny).length === 0 && P2.podminkySoucetOck(P2.podminkyEf({ podminky: spatny })).ok === false);
}

/* ---------- 8) nastavení pole ---------- */
{
  let p = PD.podminkyNastav(undefined, 'ock', 'splatnostDni', 30);
  test('podminkyNastav zapíše pole', p.ock.splatnostDni === 30 && p.v === 1);
  p = PD.podminkyNastav(p, 'ock', 'splatnostDni', undefined);
  test('podminkyNastav s undefined pole odebere (vrátí továrnu)', !p.ock);
  p = PD.podminkyNastav(p, null, 'limitPokutProc', 12);
  test('podminkyNastav společné pole', p.limitPokutProc === 12);
}

/* ---------- 9) v kódu krycích listů žádný literál platebních podmínek ---------- */
{
  const k1 = fs.readFileSync(__dirname + '/kryci.js', 'utf8');
  const k2 = fs.readFileSync(__dirname + '/kryci_proj.js', 'utf8');
  const n1 = fs.readFileSync(__dirname + '/nabidka_proj.js', 'utf8');
  test('kryci.js: prefill splatnosti, záruky, splátek, zádržného a pokut nepíše číslo ani text natvrdo',
    !/id: '(splatnostDni|zarukaMesicu|faktura2|fakturaKonc|zadrzne|zadrzneZaruka)'[^\n]*prefill: \(\) =>/.test(k1)
    && !/prefill: \(\) => KRYCI_(ZALOHY|POKUTY|LIMIT_POKUT)\[/.test(k1));
  test('kryci_proj.js: splatnost a pokuty z Firmy, ne z literálu', !/prefill: \(\) => KRYCI_(POKUTY_SAZBY|PROJ_LIMIT_POKUT)\[/.test(k2)
    && !/splatnostDni: 14/.test(k2));
  test('nabidka_proj.js: splatnost není literál', !/splatnostDni: 14/.test(n1));
}

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
if (fail) process.exit(1);
