/* NABÍDKA PROJ SE SLEVOU: ČINNOSTI ZA CENU PŘED SLEVOU (29. 9. 2026).
 *
 * Nález J. V. (29. 9. 2026, snímky nabídky se slevou 14 %): „Ta sleva se
 * nepropisuje správně do cenové nabídky: DPZ a IČ by mělo být za cenu před
 * slevou" a „V nabídce PROJ máme chybu v součtu při udělení slevy."
 * Rekapitulace ukazovala DPZ 70 100 + IČ 28 000 (už po slevě), pod tím
 * „Cena před slevou 114 100 − Sleva 16 000 = CELKEM 98 100" — řádky činností
 * se do ceny před slevou nesečetly. Sleva se od #134 rozpouštěla do sekcí
 * (aby wordová šablona bez řádku slevy dala správný součet), ale online
 * nabídka slevu vypisuje zvlášť, a pak musí činnosti stát za cenu před ní.
 *
 * Co se hlídá:
 *   – online nabídka (cenové bloky i rekapitulace) ukazuje činnosti za cenu
 *     před slevou — tutéž, jakou by měly bez slevy; součet řádků = cena před
 *     slevou, cena před slevou − sleva = celkem bez DPH,
 *   – Word se šablonou, která má řádek slevy ({{PROJ_SLEVA_KC}}), taky,
 *   – Word se šablonou BEZ řádku slevy (PROJ v2) a smlouva o dílo PROJ
 *     nesou činnosti dál po slevě — jinak by se součet činností nerovnal
 *     ceně, kterou zákazník platí, a sleva by v dokumentu nebyla vůbec. */
const ep = require('./engine_proj.js');
Object.keys(ep).forEach(k => { global[k] = ep[k]; });
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
global.vypocet = eng.vypocet; global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI; global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const tsm = require('./techspec.js');
Object.keys(tsm).forEach(k => { global[k] = tsm[k]; });
const zk = require('./zakazka.js');
global.projHlavicka = zk.projHlavicka;
global.projHlavickaEfektivni = zk.projHlavickaEfektivni;
global.projCisloNabidky = zk.projCisloNabidky;
const fm = require('./firma.js');
Object.keys(fm).forEach(k => { global[k] = fm[k]; });
const pr = require('./preklad.js');
Object.keys(pr).forEach(k => { global[k] = pr[k]; });
const SLV = require('./sleva.js');
Object.keys(SLV).forEach(k => { global[k] = SLV[k]; });
const ZO = require('./zaokrouhleni.js');                // obchodní zaokrouhlení PROJ jako v aplikaci
Object.keys(ZO).forEach(k => { global[k] = ZO[k]; });
const dg = require('./docxgen.js');
Object.keys(dg).forEach(k => { global[k] = dg[k]; });
const dok = require('./dokumenty.js');
Object.keys(dok).forEach(k => { global[k] = dok[k]; });
const { nabidkaProjData } = require('./nabidka_proj.js');
global.nabidkaProjData = nabidkaProjData;            // sod.js ji volá jako globální
const { sodProjData } = require('./sod.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const castka = s => +String(s).replace(/[^\d,]/g, '').replace(',', '.');   // „81 600,00 Kč" → 81600

function zakazka(slevaPct) {
  const zak = zk.novaZakazka();
  zak.cislo = '2026 OVP CN 0170'; zak.nazevAkce = 'Projekce se slevou'; zak.objednatel = 'SVJ';
  const v = zak.varianty[0];
  v.data.proj.cenik = ZC.zkusebniCenikProj();
  if (slevaPct) v.data.slevaProj = { procenta: slevaPct, stav: 'schváleno automaticky', role: 'Administrátor', schvalenoProc: slevaPct };
  return { zak, v };
}
const blokCeny = (d, sekce) => d.bloky.find(b => b.typ === 'cena' && b.sekce === sekce && !b.odkaz && !/\//.test(b.castka));

/* --- 1) online nabídka: činnosti za cenu před slevou, součty sedí --- */
const bez = zakazka(0), se = zakazka(14);
const d0 = nabidkaProjData(bez.zak, bez.v);
const d1 = nabidkaProjData(se.zak, se.v);
test('příprava: sleva 14 % se v nabídce projevila',
  !!d1.placeholders.PROJ_SLEVA_KC && castka(d1.placeholders.PROJ_CELKEM_BEZ_DPH) < castka(d0.placeholders.PROJ_CELKEM_BEZ_DPH),
  [d0.placeholders.PROJ_CELKEM_BEZ_DPH, d1.placeholders.PROJ_CELKEM_BEZ_DPH]);
test('příprava: nabídka má oceněnou DPZ i IČ', !!blokCeny(d1, 'dpz') && !!blokCeny(d1, 'ic'), d1.bloky.map(b => b.sekce));
['dpz', 'ic'].forEach(k => {
  test(`cenový blok ${k.toUpperCase()} stojí za cenu před slevou (jako bez slevy)`,
    blokCeny(d1, k) && blokCeny(d0, k) && blokCeny(d1, k).castka === blokCeny(d0, k).castka,
    [blokCeny(d1, k) && blokCeny(d1, k).castka, blokCeny(d0, k) && blokCeny(d0, k).castka]);
});
test('rekapitulace: řádky činností jsou tytéž jako bez slevy',
  JSON.stringify(d1.rekapitulace) === JSON.stringify(d0.rekapitulace), [d1.rekapitulace, d0.rekapitulace]);
const soucetRadku = d1.rekapitulace.reduce((a, r) => a + castka(r[1]), 0);
test('rekapitulace: součet řádků = cena před slevou',
  Math.abs(soucetRadku - castka(d1.placeholders.PROJ_CENA_PRED_SLEVOU)) < 0.005,
  [soucetRadku, d1.placeholders.PROJ_CENA_PRED_SLEVOU]);
test('rekapitulace: cena před slevou − sleva = celkem bez DPH',
  Math.abs(castka(d1.placeholders.PROJ_CENA_PRED_SLEVOU) - castka(d1.placeholders.PROJ_SLEVA_KC)
    - castka(d1.placeholders.PROJ_CELKEM_BEZ_DPH)) < 0.005,
  [d1.placeholders.PROJ_CENA_PRED_SLEVOU, d1.placeholders.PROJ_SLEVA_KC, d1.placeholders.PROJ_CELKEM_BEZ_DPH]);
test('celkem po slevě se nezměnilo (sleva z nezaokrouhlené ceny, pak zaokrouhlení)',
  d1.souhrn.bezDph === castka(d1.placeholders.PROJ_CELKEM_BEZ_DPH), [d1.souhrn.bezDph, d1.placeholders.PROJ_CELKEM_BEZ_DPH]);
test('bez slevy se nic nemění: řádky dají celkem', Math.abs(d0.rekapitulace.reduce((a, r) => a + castka(r[1]), 0)
  - castka(d0.placeholders.PROJ_CELKEM_BEZ_DPH)) < 0.005 && !d0.placeholders.PROJ_SLEVA_KC);

/* --- 2) Word: záleží na tom, jestli šablona umí řádek slevy --- */
(async () => {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const odst = t => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
  const sablona = async (sRadkemSlevy) => (await (await dg.zipZapis([{ nazev: 'word/document.xml',
    data: enc.encode('<w:document><w:body>' + odst('DPZ {{PROJ_CENA_DPZ}}') + odst('IČ {{PROJ_CENA_IC}}')
      + (sRadkemSlevy ? odst('Cena před slevou {{PROJ_CENA_PRED_SLEVOU}}') + odst('Sleva {{PROJ_SLEVA_PROC}} % − {{PROJ_SLEVA_KC}}') : '')
      + odst('CELKEM {{PROJ_CELKEM_BEZ_DPH}}') + '</w:body></w:document>') }])).arrayBuffer());
  const text = async (typ, sab, zak, v) => {
    const g = await dok.dokumentVygeneruj(typ, sab, zak, v, null, 'cz');
    const pol = await dg.zipPrecti(new Uint8Array(await g.blob.arrayBuffer()));
    return { xml: dec.decode(pol.find(p => p.nazev === 'word/document.xml').data), data: g.data };
  };
  const dpz0 = blokCeny(d0, 'dpz').castka, dpz1Po = (await text('nabidkaProj', await sablona(false), se.zak, se.v)).data.placeholders.PROJ_CENA_DPZ;

  const w1 = await text('nabidkaProj', await sablona(true), se.zak, se.v);
  test('Word se šablonou s řádkem slevy: DPZ za cenu před slevou',
    w1.xml.includes('DPZ ' + dpz0), w1.xml.slice(0, 400));
  test('Word se šablonou s řádkem slevy: sleva a cena před slevou v dokumentu jsou',
    w1.xml.includes(d1.placeholders.PROJ_SLEVA_KC) && w1.xml.includes(d1.placeholders.PROJ_CENA_PRED_SLEVOU));

  const w2 = await text('nabidkaProj', await sablona(false), se.zak, se.v);
  test('Word se šablonou BEZ řádku slevy (PROJ v2): DPZ po slevě — součet sedí na cenu, kterou zákazník platí',
    !w2.xml.includes('DPZ ' + dpz0) && castka(dpz1Po) < castka(dpz0), [dpz1Po, dpz0]);

  const sod = sodProjData(se.zak, se.v, 'cz');
  test('smlouva o dílo PROJ nese ceny činností po slevě (cena díla)',
    castka(sod.placeholders.PROJ_CENA_DPZ) < castka(dpz0), [sod.placeholders.PROJ_CENA_DPZ, dpz0]);

  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})();
