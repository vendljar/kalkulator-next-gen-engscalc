/* SPLÁTKY OCK = 100 % (SEC-S5, rozhodnutí J. V. 26. 10. 2026 = A, #517).
 *
 * Záloha + dílčí faktura č. 2 + konečná faktura nemusely dát 100 % a nic
 * to nehlídalo: kryciFaktura2Dopocet při záporném zbytku vrátí null
 * a dílčí faktura č. 2 zůstala stará (UI nic neohlásilo), ruční přepis se
 * nedopočítává. Pokus podklady/S1_pokusy/funkce/p2_ock_splatky.js: záloha
 * 70 % + konečná 40 % → kalendář 70/40/40 (150 %), CN „70 % … 40 % …
 * zbývající část", SoD „zbývajících 40 %", chyba prázdná.
 *
 * Hlídá se:
 *  1) kryciPlatbyOck100: 70/40/40 → hláška se součtem; 50/40/10 → '';
 *     měsíční fakturace, stará odeslaná varianta a nečitelný text mlčí;
 *  2) SoD realizace (kryciSodPlatby) se při součtu ≠ 100 % zastaví (chyba);
 *  3) kontrola před nabídkou „platbyOck100" varuje (ne zábrana nabídky);
 *  4) výchozí podmínky (Firma) dávají 100 % a nic se nehlásí.
 *
 * Spuštění: cd src && node test_platby_ock100.js */
const path = require('path');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js'); nacti('./preklad.js'); nacti('./docxgen.js');
nacti('./engine.js'); global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js'); global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js'); nacti('./sleva.js'); nacti('./zaokrouhleni.js'); nacti('./podminky.js');
const FM = nacti('./firma.js');
nacti('./plan_plateb.js'); nacti('./nabidka.js'); nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
nacti('./zamek.js'); nacti('./objednane.js');
const K = nacti('./kryci.js');
nacti('./kryci_proj.js');
const KO = nacti('./kontroly.js');
global.NAST = { firma: FM.firmaDefault() };
const JEKLY = require(path.join(__dirname, 'jekly.json'));

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 300)); } };

const zak = (hodnoty) => {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 0517'; z.dic = 'CZ12345678';
  z.varianty[0].data.kryci = { hodnoty: Object.assign({}, hodnoty) };
  return z;
};
const kal = (z) => K.kryciPlatebniKalendar(z, z.varianty[0], JEKLY);
const kontr = typeof K.kryciPlatbyOck100 === 'function' ? K.kryciPlatbyOck100 : () => '';
test('kryciPlatbyOck100 existuje', typeof K.kryciPlatbyOck100 === 'function');

/* 1) pravidlo */
const z150 = zak({ zaloha1: '70 % – po podpisu smlouvy', faktura2: '40 % – po zahájení montáže', fakturaKonc: '40 % – po předání díla' });
const t150 = kontr(kal(z150));
test('70/40/40 → hláška', /150/.test(t150) && /100 %/.test(t150), t150);
test('… hláška říká, že dílčí faktura č. 2 se nedopočítala', /dílčí faktura č\. 2/i.test(t150), t150);
const zOk = zak({ zaloha1: '50 % – po podpisu smlouvy', faktura2: '40 % – po zahájení montáže', fakturaKonc: '10 % – po předání díla' });
test('50/40/10 → bez hlášky', kontr(kal(zOk)) === '');
const zBez = zak({ zaloha1: 'Bez zálohy', faktura2: '90 % – po zahájení montáže', fakturaKonc: '10 % – po předání díla' });
test('bez zálohy 0/90/10 → bez hlášky', kontr(kal(zBez)) === '');
const z90 = zak({ zaloha1: '30 % – po podpisu smlouvy', faktura2: '50 % – po zahájení montáže', fakturaKonc: '10 % – po předání díla' });
test('30/50/10 (90 %) → hláška', /90/.test(kontr(kal(z90))), kontr(kal(z90)));
const zMes = zak({ zaloha1: '70 % – po podpisu smlouvy', faktura2: '40 %', fakturaKonc: '40 %', zpusobFakturace: K.KRYCI_FAKTURACE[1] });
test('měsíční fakturace mlčí', kontr(kal(zMes)) === '');
const zNec = zak({ zaloha1: '70 % – po podpisu smlouvy', faktura2: 'podle dohody', fakturaKonc: '40 % – po předání díla' });
test('nečitelný text splátky mlčí (nic se neodhaduje)', kontr(kal(zNec)) === '');
const zStara = zak({ zaloha1: '70 % – po podpisu smlouvy', faktura2: '40 %', fakturaKonc: '40 %' });
zStara.varianty[0].zamek = { zamceno: true, typ: 'nabidka' };
test('stará odeslaná varianta (bez značky pravidel) mlčí', kontr(kal(zStara)) === '');

/* 2) SoD realizace se zastaví */
const sod = (z, sym) => K.kryciSodPlatby(z, z.varianty[0], JEKLY, { symboly: new Set(sym) }, 'cz');
const s150 = sod(z150, ['SOD_PLATEBNI_KALENDAR']);
test('SoD v2: 150 % → chyba (smlouva nevznikne)', /100 %/.test(s150.chyba || ''), s150.chyba);
const s150v1 = sod(z150, ['SOD_SPLATKA1_PROC', 'SOD_SPLATKA2_PROC', 'SOD_SPLATKA4_PROC']);
test('SoD v1: 150 % → chyba', /100 %/.test(s150v1.chyba || ''), s150v1.chyba);
test('SoD: 50/40/10 → bez chyby', !sod(zOk, ['SOD_PLATEBNI_KALENDAR']).chyba);
test('SoD: měsíční → bez chyby 100 %', !/100 %/.test(sod(zMes, ['SOD_PLATEBNI_KALENDAR']).chyba || ''));

/* 3) kontrola před nabídkou: varování */
const pravidlo = KO.kontrolyPravidla().find(p => p.kod === 'platbyOck100');
test('pravidlo platbyOck100 je v kontrolách', !!pravidlo);
const nalez = (ctx) => { let r; try { r = KO.kontrolyProved(ctx); } catch (e) { return { chyba: e.message }; }
  return ((r && r.nalezy) || []).find(n => n.kod === 'platbyOck100') || null; };
{
  const r = nalez({ zak: z150, platbyOck: kal(z150) });
  test('platbyOck100: 150 % → nález', !!(r && r.text && /150/.test(r.text)), r);
  test('platbyOck100: varování, ne zábrana nabídky', !!r && r.uroven !== KO.KONTROLY_UROVEN_ZABRANA && !!pravidlo && !pravidlo.zabranaMozna, r);
  test('platbyOck100: 100 % → nic', nalez({ zak: zOk, platbyOck: kal(zOk) }) === null);
  test('platbyOck100: jen PROJ → nic', nalez({ zak: z150, platbyOck: kal(z150), jenProj: true }) === null);
}

/* 4) výchozí podmínky z Firmy */
const zVych = zak({});
test('výchozí podmínky Firmy dávají 100 %', kontr(kal(zVych)) === '', kontr(kal(zVych)));

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
