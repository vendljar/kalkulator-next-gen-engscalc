/* Test #404 — která lišta se ukáže nad otevřenou zakázkou.
 *
 * Rozhodnutí J. V. 13. 10. 2026 („Ano, jak je navrženo"): místo tří
 * nezávislých lišt (žlutá záloha z prohlížeče, oranžová odeslaná varianta,
 * modrá „jen ke čtení") rozhoduje jediný model `listaZakazkyRozhodni`
 * v zamek.js:
 *   1. neodeslaná zakázka → žlutá „Rozpracovaná kalkulace" s Pokračovat /
 *      Založit novou (a malým Zahodit zálohu),
 *   2. odeslaná → žádná žlutá, záloha téže zakázky se tiše zahodí,
 *   3. právo `zamek.odemknout` → modrý pruh Odemknout k úpravám,
 *   4. cizí neodeslaná → žlutá jen se Založit novou a větou, kdo ji založil.
 * Plus: záloha odeslané nabídky se v modelu zálohy (uloZalohaRozhodni)
 * nenabízí a uklidí. */
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
global.vypocet = eng.vypocet; global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI; global.DEFAULT_CENIK = ZC.zkusebniCenik();
const ep = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const tsm = require('./techspec.js');
global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
const sl = require('./sleva.js');
global.slevaPodil = sl.slevaPodil; global.slevaDefault = sl.slevaDefault;
const zk = require('./zakazka.js');
global.novaVarianta = zk.novaVarianta; global.novaVariantaData = zk.novaVariantaData;
global.aktivniVarianta = zk.aktivniVarianta; global.ridiciVarianta = zk.ridiciVarianta;
const zm = require('./zamek.js');
global.zajistiZamek = zm.zajistiZamek; global.variantaUzamcena = zm.variantaUzamcena;
global.zamekInfo = zm.zamekInfo; global.zamekCteniSmiOdemknout = zm.zamekCteniSmiOdemknout;
global.zamekCteniDuvod = zm.zamekCteniDuvod;
const ul = require('./uloziste.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info !== undefined ? JSON.stringify(info) : ''); } };

const rozhodni = zm.listaZakazkyRozhodni;
test('model listaZakazkyRozhodni existuje', typeof rozhodni === 'function');
if (typeof rozhodni !== 'function') { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const obchodnik = { email: 'obchod@priklad.cz', jmeno: 'Obchodník', role: 'Obchodník' };
const kolega = { email: 'kolega@priklad.cz', jmeno: 'Kolega', role: 'Obchodník' };
const admin = { email: 'spravce@priklad.cz', jmeno: 'Správce', role: 'Administrátor' };

const zakazka = (uprav) => {
  const z = zk.novaZakazka();
  z.cislo = '2026 - OPR - CN - 404'; z.nazevAkce = 'Zkušební šachta';
  z.autor = obchodnik.email; z.autorJmeno = 'Obchodník Zkušební';
  z.uloRazitko = '2026-10-13T10:00:00.000Z';
  return Object.assign(z, uprav || {});
};
const zamkni = (z) => {
  const v = zk.aktivniVarianta(z);
  zm.zamkniVariantu(v, { typ: 'nabidka', kdo: obchodnik.email, cislo: z.cislo });
  return z;
};
const zalohaZ = (z, kdy, uprav) => {
  const zz = JSON.parse(JSON.stringify(z));
  Object.assign(zz, uprav || {});
  return { verze: 1, kdy, cislo: zz.cislo, nazevAkce: zz.nazevAkce, zakazka: JSON.stringify(zz) };
};
const PRAVA_ADMIN = { odemknout: true };
const PRAVA_OBCH = { odemknout: false };

/* ---------- 0) nic otevřeného, žádná záloha → žádná lišta ---------- */
{
  const z = zk.novaZakazka();
  const r = rozhodni(z, null, obchodnik, PRAVA_OBCH, { cteni: false, otevrena: JSON.stringify(z) });
  test('0: čerstvá zakázka bez zálohy — žádná lišta', r.lista === 'zadna', r);
}

/* ---------- 1) neodeslaná vlastní zakázka jen ke čtení → žlutá ---------- */
{
  const z = zakazka();
  const r = rozhodni(z, null, obchodnik, PRAVA_OBCH, { cteni: true, otevrena: JSON.stringify(z) });
  test('1: neodeslaná zakázka jen ke čtení → žlutá „rozpracovaná"', r.lista === 'rozpracovana', r);
  test('1: nabízí Pokračovat i Založit novou', r.pokracovat === true && r.zalozitNovou === true, r);
  test('1: bez zálohy nic neobnovuje a Zahodit zálohu nenabízí', r.obnovit === false && r.zahodit === false, r);
  test('1: modrý pruh u neodeslané zakázky není (jeho roli převzala žlutá)', r.modra === false, r);
  test('1: lišta pojmenuje zakázku číslem a názvem', /404/.test(r.co) && /Zkušební šachta/.test(r.co), r.co);
  test('1: „naposledy" = razítko uložení', r.kdy === z.uloRazitko, r.kdy);
  test('1: administrátor u neodeslané taky jen žlutá, bez modré',
    rozhodni(z, null, admin, PRAVA_ADMIN, { cteni: true }).modra === false);
}

/* 1a) záloha TÉŽE zakázky novější než uložená verze → Pokračovat ji obnoví */
{
  const z = zakazka();
  const zal = zalohaZ(z, '2026-10-13T11:00:00.000Z', { poznamka: 'rozdělaná práce' });
  const r = rozhodni(z, zal, obchodnik, PRAVA_OBCH, { cteni: true, otevrena: JSON.stringify(z) });
  test('1a: novější záloha téže zakázky → Pokračovat ji obnoví', r.lista === 'rozpracovana' && r.obnovit === true && r.pokracovat === true, r);
  test('1a: „naposledy" = čas zálohy', r.kdy === zal.kdy, r.kdy);
  test('1a: Zahodit zálohu je nabízené', r.zahodit === true, r);
  test('1a: záloha se tiše nemaže', r.zahoditTise === false, r);
}
/* 1b) záloha téže zakázky starší než uložená → přežitá, tiše pryč */
{
  const z = zakazka();
  const zal = zalohaZ(z, '2026-10-13T09:00:00.000Z', { poznamka: 'starší' });
  const r = rozhodni(z, zal, obchodnik, PRAVA_OBCH, { cteni: true, otevrena: JSON.stringify(z) });
  test('1b: starší záloha téže zakázky se neobnovuje', r.obnovit === false && r.pokracovat === true, r);
  test('1b: a tiše se zahodí (v databázi je novější práce)', r.zahoditTise === true && r.zahodit === false, r);
}
/* 1c) záloha shodná s otevřenou → není co obnovit */
{
  const z = zakazka();
  const zal = zalohaZ(z, '2026-10-13T11:00:00.000Z');
  const r = rozhodni(z, zal, obchodnik, PRAVA_OBCH, { cteni: true, otevrena: JSON.stringify(z) });
  test('1c: záloha shodná s otevřenou zakázkou se neobnovuje', r.obnovit === false, r);
}
/* 1d) záloha JINÉ zakázky → Pokračovat patří otevřené, záloha malým odkazem */
{
  const z = zakazka();
  const jina = zakazka({ cislo: '2026 - OPR - CN - 405', nazevAkce: 'Jiná šachta' });
  const zal = zalohaZ(jina, '2026-10-13T11:00:00.000Z');
  const r = rozhodni(z, zal, obchodnik, PRAVA_OBCH, { cteni: true, otevrena: JSON.stringify(z) });
  test('1d: záloha jiné zakázky — Pokračovat jen odemkne otevřenou', r.obnovit === false && r.pokracovat === true, r);
  test('1d: záloha jiné zakázky se nabídne odkazem a nemaže se', !!r.jinaZaloha && /405/.test(r.jinaZaloha.co) && r.zahoditTise === false, r);
  test('1d: lišta mluví o otevřené zakázce', /404/.test(r.co), r.co);
}
/* 1e) start aplikace: volná čerstvá zakázka + záloha v prohlížeči */
{
  const z = zk.novaZakazka();
  const zal = zalohaZ(zakazka(), '2026-10-13T11:00:00.000Z');
  const r = rozhodni(z, zal, null, {}, { cteni: false, otevrena: JSON.stringify(z) });
  test('1e: po startu se záloha nabídne žlutou lištou', r.lista === 'rozpracovana' && r.obnovit === true && r.pokracovat === true, r);
  test('1e: s Založit novou a Zahodit zálohu', r.zalozitNovou === true && r.zahodit === true, r);
  test('1e: lišta pojmenuje zálohu', /404/.test(r.co) && r.kdy === zal.kdy, r);
}

/* ---------- 2) odeslaná zakázka → žádná žlutá ---------- */
{
  const z = zamkni(zakazka());
  const r = rozhodni(z, null, obchodnik, PRAVA_OBCH, { cteni: true, otevrena: JSON.stringify(z) });
  test('2: odeslaná zakázka → lišta „odeslaná", ne žlutá', r.lista === 'odeslana', r);
  test('2: obchodník nevidí modrý pruh', r.modra === false, r);
  test('2: odeslaná nenabízí Pokračovat ani obnovu', r.pokracovat === false && r.obnovit === false, r);
  const zal = zalohaZ(z, '2026-10-13T11:00:00.000Z', { poznamka: 'x' });
  const r2 = rozhodni(z, zal, obchodnik, PRAVA_OBCH, { cteni: true, otevrena: JSON.stringify(z) });
  test('2: záloha odeslané zakázky se tiše zahodí', r2.lista === 'odeslana' && r2.zahoditTise === true, r2);
  const r3 = rozhodni(z, null, obchodnik, PRAVA_OBCH, { cteni: false });
  test('2: odeslaná i po odemčení okna (po tisku) zůstává „odeslaná"', r3.lista === 'odeslana', r3);
  /* Klon odeslané = nová rozpracovaná práce (výklad #404). */
  const k = zm.klonujVariantu(z, zk.aktivniVarianta(z).id);
  const r4 = rozhodni(z, null, obchodnik, PRAVA_OBCH, { cteni: true });
  test('2: otevřený klon odeslané varianty je rozpracovaný (žlutá)', !!k && r4.lista === 'rozpracovana' && r4.pokracovat === true, r4);
}

/* ---------- 3) modrý pruh jen s právem zamek.odemknout ---------- */
{
  const z = zamkni(zakazka());
  test('3: administrátor (právo zamek.odemknout) vidí modrý pruh',
    rozhodni(z, null, admin, PRAVA_ADMIN, { cteni: true }).modra === true);
  test('3: vedoucí bez práva (výchozí) modrý pruh nevidí',
    rozhodni(z, null, { email: 'v@priklad.cz', role: 'Vedoucí' }, PRAVA_OBCH, { cteni: true }).modra === false);
  test('3: modrý pruh i mimo režim čtení (hned po tisku)',
    rozhodni(z, null, admin, PRAVA_ADMIN, { cteni: false }).modra === true);
}

/* ---------- 4) cizí neodeslaná zakázka ---------- */
{
  const z = zakazka();
  const zal = zalohaZ(z, '2026-10-13T11:00:00.000Z', { poznamka: 'x' });
  const r = rozhodni(z, zal, kolega, PRAVA_OBCH, { cteni: true, otevrena: JSON.stringify(z) });
  test('4: cizí zakázka → žlutá lišta', r.lista === 'rozpracovana', r);
  test('4: jen Založit novou, bez Pokračovat', r.pokracovat === false && r.zalozitNovou === true && r.obnovit === false, r);
  test('4: věta, kdo ji založil', /Obchodník Zkušební/.test(r.cizi), r.cizi);
  test('4: cizí zálohu nenabízí ani nemaže', r.zahodit === false && r.zahoditTise === false, r);
  test('4: vedoucí u cizí zakázky Pokračovat má (B-pravidlo zamekCteniSmiOdemknout)',
    rozhodni(z, null, { email: 'v@priklad.cz', role: 'Vedoucí' }, PRAVA_OBCH, { cteni: true }).pokracovat === true);
  test('4: bez přihlášení (ze souboru) se neptá, kdo založil',
    rozhodni(z, null, null, {}, { cteni: true }).pokracovat === true);
}

/* ---------- 5) model zálohy: odeslaná nabídka se nenabízí ---------- */
{
  const z = zamkni(zakazka());
  const zal = zalohaZ(z, new Date(Date.now() - 3600e3).toISOString());
  const r = ul.uloZalohaRozhodni(zal, { ted: new Date().toISOString() });
  test('5: záloha odeslané nabídky se nenabízí', r.nabidnout === false, r);
  test('5: a uklidí se', r.smazat === true, r);
  const r2 = ul.uloZalohaRozhodni(zalohaZ(zakazka(), new Date(Date.now() - 3600e3).toISOString()), { ted: new Date().toISOString() });
  test('5: záloha neodeslané zakázky se nabídne dál', r2.nabidnout === true, r2);
  test('5: nečitelná záloha se za odeslanou nepovažuje', typeof ul.uloZalohaOdeslana === 'function' && ul.uloZalohaOdeslana({ zakazka: '{nesmysl' }) === false);
}

/* ---------- 6) shoda zakázky a zálohy ---------- */
test('6: shoda podle čísla bez ohledu na mezery a velikost',
  zm.listaZalohaStejna({ cislo: '2026 - OPR - CN - 404 ' }, { cislo: '2026 - opr - CN - 404' }));
test('6: jiné číslo = jiná zakázka', !zm.listaZalohaStejna({ cislo: 'A' }, { cislo: 'B' }));
test('6: bez čísla rozhoduje název akce', zm.listaZalohaStejna({ cislo: '', nazevAkce: 'X' }, { cislo: '', nazevAkce: 'x' }));
test('6: bez čísla i názvu shoda není', !zm.listaZalohaStejna({}, {}));
test('6: nečitelné razítko → záloha se bere jako novější', zm.listaZalohaNovejsi({ kdy: 'x' }, '2026-10-13T10:00:00Z'));

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
