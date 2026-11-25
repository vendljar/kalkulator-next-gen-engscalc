/* #766 (J. V. 25. 11. 2026) — ruční značky ATYP po šachtách (víc šachet).
 *
 * Do #766 byla mapa ručních značek (`data.zadaniRucni`) jedna na variantu:
 * ruční rezerva v šachtě 1 zabránila automatu ATYP (#758 B) dosadit předlohu
 * i v šachtě 2 (revize Fable ER N4). Nově má šachta 2+ NOVÉ kalkulace
 * (kalkNova) vlastní mapu `zadani.zadaniRucni`, kterou dostane při založení
 * či kopii (vsSachtaZadani). Stará kalkulace a šachta bez vlastní mapy
 * (založená před #766) se chovají jako dřív.
 *
 * Pojistka: před #766 chybí vsSachtaZadani a automat v šachtě 2 nechá 0 %
 * (test „automat v šachtě 2 dosadí předlohu" a další padají).
 * Spuštění: node src/test_766_rucni_po_sachtach.js */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); };
nacti('./format.js'); nacti('./cenik.js'); nacti('./cenik_stari.js'); nacti('./cenik_rady.js');
nacti('./engine.js'); nacti('./engine_proj.js'); nacti('./techspec.js'); nacti('./zamek.js');
nacti('./poznamky.js'); nacti('./zakazka.js'); nacti('./zobrazeni.js'); nacti('./sleva.js');
nacti('./schvalovani.js'); nacti('./kontroly.js'); nacti('./vyjimky.js'); nacti('./program.js');
nacti('./uloziste.js'); nacti('./rucni_ceny.js'); nacti('./vice_sachet.js');
const VJ = require('./vyjimky.js'); global.vyjimkyObsah = VJ.vyjimkyObsah;
const U = require('./uloziste.js');
const ZC = require('./zkusebni_cenik.js');
const JEKLY = require('./jekly.json');
global.JEKLY = JEKLY;
global.DEFAULT_CENIK = ZC.zkusebniCenik();

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));
const PREDLOHA = { rezervaZakladPct: 0.3, rezervaPriplatkyPct: 0.3, rezervaProfilyPct: 0.3, rezervaPlechyPct: 0.3,
  zamecnikAtypKc: 50000, montazAtypHod: 5, projekceAtypHod: 3 };
const ROZMERY = { sirka: 1.6, hloubka: 2, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 5 };
/* Šachta 2 tak, jak ji založí UI (vsPocetVariant / vsKopie): */
const pridejSachtu = (data, zdroj) => {
  const zad = (typeof vsSachtaZadani === 'function') ? vsSachtaZadani(data, zdroj) : kopie(zdroj);   // před #766: vsKopieDat
  data.ock.dalsi = data.ock.dalsi || [];
  data.ock.dalsi.push({ id: 's' + (data.ock.dalsi.length + 2), nazev: 'Šachta ' + (data.ock.dalsi.length + 2), ks: 1, zadani: zad });
  return zad;
};
const nova = () => {
  const zak = novaZakazka(); const data = zak.varianty[0].data;
  Object.assign(data.ock.zadani, ROZMERY);
  return { zak, data };
};
/* set() v UI značí šachtu, kterou obchodník edituje (globální Z). */
const rucne = (data, Z, k, h) => { Z[k] = h; zadaniRucniZnac(data, k, Z); };

console.log('===== 0. pojistky =====');
test('nová zakázka je nová kalkulace (kalkVerze 2)', kalkNova(nova().data.ock.zadani));
test('jádro má vsSachtaZadani (#766)', typeof vsSachtaZadani === 'function');

console.log('===== 1. nová kalkulace: ruční značka v šachtě 1 neblokuje automat v šachtě 2 =====');
{
  const { data } = nova();
  const Z1 = data.ock.zadani;
  const Z2 = pridejSachtu(data, Z1);
  rucne(data, Z1, 'rezervaZakladPct', 0.1);
  test('značka šachty 1 je v mapě varianty', !!data.zadaniRucni.rezervaZakladPct);
  test('šachta 2 má vlastní mapu bez značky šachty 1', !!Z2.zadaniRucni && !Z2.zadaniRucni.rezervaZakladPct, Z2.zadaniRucni);
  Z2.rezervaZakladPct = 0;
  atypHodnoty(Z2, data, true, PREDLOHA, { automat: true });
  test('automat v šachtě 2 dosadí předlohu (ruční rezerva š1 nebrání)', Z2.rezervaZakladPct === 0.3, Z2.rezervaZakladPct);
  atypHodnoty(Z1, data, true, PREDLOHA, { automat: true });
  test('automat v šachtě 1 ruční rezervu š1 nechá (#758 B)', Z1.rezervaZakladPct === 0.1, Z1.rezervaZakladPct);
  atypHodnoty(Z2, data, false, null);
  test('vypnutí ATYP v šachtě 2 vrátí snímek (0) i při značce v š1', Z2.rezervaZakladPct === 0, Z2.rezervaZakladPct);
}

console.log('===== 2. opačný směr: značka v šachtě 2 nebrání šachtě 1 =====');
{
  const { data } = nova();
  const Z1 = data.ock.zadani;
  const Z2 = pridejSachtu(data, Z1);
  rucne(data, Z2, 'rezervaPriplatkyPct', 0.05);
  test('značka šachty 2 je jen v její mapě', Z2.zadaniRucni.rezervaPriplatkyPct === true && !data.zadaniRucni.rezervaPriplatkyPct);
  Z1.rezervaPriplatkyPct = 0;
  atypHodnoty(Z1, data, true, PREDLOHA, { automat: true });
  test('automat v šachtě 1 dosadí předlohu', Z1.rezervaPriplatkyPct === 0.3, Z1.rezervaPriplatkyPct);
  atypHodnoty(Z2, data, true, PREDLOHA, { automat: true });
  test('automat v šachtě 2 ruční pole šachty 2 nechá', Z2.rezervaPriplatkyPct === 0.05, Z2.rezervaPriplatkyPct);
  atypHodnoty(Z2, data, true, PREDLOHA);
  test('ruční klik na ATYP v šachtě 2: předloha i do ručního pole (16. 9.)', Z2.rezervaPriplatkyPct === 0.3);
}

console.log('===== 3. kopie šachty dědí značky zdroje =====');
{
  const { data } = nova();
  const Z1 = data.ock.zadani;
  rucne(data, Z1, 'zamecnikAtypKc', 12000);
  const Z2 = pridejSachtu(data, Z1);
  test('kopie šachty 1 nese kopii značek varianty', Z2.zadaniRucni.zamecnikAtypKc === true);
  rucne(data, Z2, 'montazAtypHod', 9);
  const Z3 = pridejSachtu(data, Z2);
  test('kopie šachty 2 nese značky šachty 2', Z3.zadaniRucni.montazAtypHod === true && Z3.zadaniRucni.zamecnikAtypKc === true);
  Z3.zadaniRucni.novy = true;
  test('mapy se nesdílí (hluboká kopie)', !Z2.zadaniRucni.novy && !data.zadaniRucni.novy);
}

console.log('===== 4. stará kalkulace a šachta bez vlastní mapy beze změny =====');
{
  const { data } = nova();
  delete data.ock.zadani.kalkVerze;
  const Z1 = data.ock.zadani;
  const Z2 = pridejSachtu(data, Z1);
  test('stará kalkulace: šachta 2 vlastní mapu nedostane', !('zadaniRucni' in Z2));
  rucne(data, Z2, 'rezervaZakladPct', 0.1);
  test('stará kalkulace: značka šachty 2 jde do mapy varianty (jako dřív)', !!data.zadaniRucni.rezervaZakladPct);
  Z1.rezervaZakladPct = 0;
  atypHodnoty(Z1, data, true, PREDLOHA, { automat: true });
  test('stará kalkulace: značka varianty dál platí pro všechny šachty', Z1.rezervaZakladPct === 0);

  const n = nova(); const d2 = n.data;
  const S2 = kopie(d2.ock.zadani); d2.ock.dalsi = [{ id: 's2', ks: 1, zadani: S2 }];   // šachta 2 před #766 — bez mapy
  rucne(d2, d2.ock.zadani, 'rezervaZakladPct', 0.1);
  S2.rezervaZakladPct = 0;
  atypHodnoty(S2, d2, true, PREDLOHA, { automat: true });
  test('šachta 2 bez vlastní mapy (založená před #766) čte mapu varianty', S2.rezervaZakladPct === 0);
  test('bez Z platí mapa varianty (volání před #766)', zadaniRucniJe(d2, 'rezervaZakladPct') === true);
  /* Stará kalkulace se zadáním šachty, které mapu nese (import, ruční zásah do dat) — mapa se nečte. */
  const { data: d3 } = nova(); delete d3.ock.zadani.kalkVerze;
  const S3 = Object.assign(kopie(d3.ock.zadani), { zadaniRucni: {} }); d3.ock.dalsi = [{ id: 's2', ks: 1, zadani: S3 }];
  rucne(d3, d3.ock.zadani, 'rezervaZakladPct', 0.1);
  S3.rezervaZakladPct = 0;
  atypHodnoty(S3, d3, true, PREDLOHA, { automat: true });
  test('stará kalkulace: mapu v zadání šachty ignoruje, platí značka varianty', S3.rezervaZakladPct === 0 && !zadaniRucniVlastni(d3, S3));
}

console.log('===== 5. cena a server =====');
{
  const { zak, data } = nova();
  const Z1 = data.ock.zadani;
  const Z2 = pridejSachtu(data, Z1);
  rucne(data, Z1, 'rezervaZakladPct', 0.1);
  const cena = () => { const x = vypocetOckDat(data, JEKLY).souhrn; return x.zakladCena + x.priplatkyCena; };
  const pred = cena();
  Z2.atyp = true;
  atypHodnoty(Z2, data, true, PREDLOHA, { automat: true });
  const po = cena();
  test('automat ATYP v šachtě 2 zvýší cenu zakázky (rezerva předlohy)', po > pred, { pred, po });
  test('server přijme šachtu s vlastní mapou (tvar)', U.uloTypyProblemy(zak).length === 0, U.uloTypyProblemy(zak));
  test('server: tvar víc šachet bez problému (funkce zapnutá)', U.uloVsProblemy(zak, null, { zapnuto: true }) === null,
    U.uloVsProblemy(zak, null, { zapnuto: true }));
}

console.log('===== 6. UI: set() značí editovanou šachtu, přidání i kopie přes vsSachtaZadani =====');
{
  const fs = require('fs');
  const common = fs.readFileSync(__dirname + '/ui/common.js', 'utf8');
  const vsui = fs.readFileSync(__dirname + '/ui/vice_sachet_ui.js', 'utf8');
  test('set(): zadaniRucniZnac dostane Z editované šachty',
    /zadaniRucniZnac\(aktivniVarianta\(ZAK\)\.data, path\.slice\(2\), Z\)/.test(common));
  test('přidání i kopie šachty zakládají zadání přes vsSachtaZadani (2×)',
    (vsui.match(/zadani: vsSachtaZadani\(aktivniVarianta\(ZAK\)\.data, /g) || []).length === 2);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
