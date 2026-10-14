/* ZBYTKY ČEŠTINY V ONLINE NABÍDCE PROJ V EN/DE/FR (P1, 14. 10. 2026,
 * navazuje na soupis z dávky v14.10.4).
 *
 * Online nabídka PROJ v EN/DE/FR nechávala česky řádky, které slovník znal
 * jen v jiném znění (šablona PROJ v2 je má rozdělené nebo s drobnou
 * odchylkou), nebo které skládá kód po kouscích:
 *   - CENA NEZAHRNUJE „Součástí ceny není řešení samostatných řízení
 *     vyplývajících …" (slovník „vyplývající … péče a …");
 *   - IČ „Podání a projednání … STAVEBNÍM ÚŘADEM (Hasičský záchranný sbor, …)"
 *     (slovník věta a závorka zvlášť), „V průběhu celého řízení
 *     komunikujeme …", „Vyřízení POVOLENÍ ZÁMĚRU (dle platného …)";
 *   - popis ceny DPZ „Zpracování projektu pro DPZ, včetně PBŘ, …" — ve
 *     slovníku je, ale kód skládá větu z dílů P('Zpracování projektu pro
 *     DPZ') + P('včetně') + …, takže se celá věta nikdy nehledala;
 *   - popis ceny DPS, hvězdička DPZ, štítek části 2 DPZ.
 * Test: tyto řádky jsou v nabídce (všechny činnosti, AD nabízený) přeložené
 * a bez české diakritiky, slovník je zná (trStav … prelozeno) a popis DPZ
 * se přeloží pro KAŽDOU kombinaci počítaných částí. Souvislá próza { cz }
 * (úvody bloků STUDIE / DPZ / DPS, poznámky pod studií, řádky rozsahu)
 * musí zůstat česky — hlídá, že se rozsah překladu nerozlezl.
 *
 * Spuštění: cd src && node test_proj_zbytky_preklad.js */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
const PR = nacti('./preklad.js');
nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
nacti('./plan_plateb.js');
const NP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
global.NAST = { firma: global.firmaDefault() };

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 600)); } };

/* písmena, která má čeština a EN/DE/FR ne */
const CESKA = /[ěščřžůťďňĚŠČŘŽŮŤĎŇ]/;
const JAZYKY = ['en', 'de', 'fr'];

/* Řádky nabídky přesně tak, jak je skládá kód (CZ), které musí mít překlad. */
const RADKY = [
  'Součástí ceny není řešení samostatných řízení vyplývajících z podmínek stanovisek DOSS, zejména pak Odboru památkové péče, a řešení námitek nebo odvolání účastníků řízení',
  'Podání a projednání na dotčených orgánech a zajištění stanovisek dotčených orgánů požadovaných STAVEBNÍM ÚŘADEM (Hasičský záchranný sbor, Hygienická stanice, Odbor životního prostředí, Národní památkový ústav, Odbor památkové péče a případné další)',
  'Zpracování projektu pro DPZ, včetně PBŘ, STATIKY a ELEKTRO PROJEKTU',
  'Zpracování prováděcí dokumentace, včetně STATICKÉ ČÁSTI a ELEKTRO PROJEKTU',
  'Cena je platná v případě návaznosti na STUDII PROVEDITELNOSTI.',
  'V průběhu celého řízení komunikujeme s dotčenými orgány i stavebním úřadem a obratem řešíme případné dotazy, aby se nezdržel průběh řízení',
  'Vyřízení POVOLENÍ ZÁMĚRU (dle platného stavebního zákona a požadavků stavebního úřadu)',
  'Požárně bezpečnostní řešení',
];

/* `vse` = všechny položky všech činností zapnuté (i zaměření a studie osvitu) */
const zak = (vse) => { const z = zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 405'; z.nazevAkce = 'Zkušební akce';
  const v = z.varianty[0]; v.data.proj.cenik = ZC.zkusebniCenikProj(); v.data.proj.cenik.kurzEurKc = 25;
  v.data.proj.zadani.nabizetAD = true;
  if (vse) v.data.proj.zadani.sekce.forEach(s => s.polozky.forEach(p => { p.vyrazeno = false; }));
  return z; };
const texty = b => [b.nadpis, b.text, b.popis, b.hvezdicka].concat(b.odstavce || [], b.uvod || [],
  ...(b.radky || []).map(r => Array.isArray(r) ? r : [r])).filter(x => typeof x === 'string' && x.trim());
const blok = (d, nadpis, L) => d.bloky.find(b => b.nadpis === PR.tr(nadpis, L));

RADKY.forEach(s => JAZYKY.forEach(L => {
  const st = PR.trStav(s, L);
  test('slovník ' + L.toUpperCase() + ': „' + s.slice(0, 60) + '…"', st.prelozeno && !CESKA.test(st.text), st);
}));

/* Souvislá próza { cz } z definice — musí zůstat česky. */
const PROZA_CZ = [];
NP.NABIDKA_PROJ_DEF.forEach(b => (b.uvod || []).concat(b.typ === 'pozn' ? b.radky : [])
  .forEach(o => { if (o && o.cz) PROZA_CZ.push(o.cz); }));
test('definice má souvislou prózu { cz } (úvody STUDIE / DPZ / DPS, poznámky)', PROZA_CZ.length >= 6, PROZA_CZ.length);

{
  const z = zak(true);
  const cz = NP.nabidkaProjData(z, z.varianty[0], 'cz');
  const vsechny = [].concat(...cz.bloky.map(texty));
  const chybi = RADKY.filter(s => !vsechny.some(t => t === s || t.indexOf(s) >= 0));
  /* popis DPZ se všemi částmi má navíc STUDII OSVITU — hledá se jen začátek */
  test('CZ: nabídka nese vyjmenované řádky beze změny', chybi.length <= 1
    && chybi.every(s => s.indexOf('Zpracování projektu pro DPZ') === 0), chybi);
}

[false, true].forEach(vse => JAZYKY.forEach(L => {
  const K = L.toUpperCase() + (vse ? ' (vše zapnuté)' : '');
  const z = zak(vse);
  const d = NP.nabidkaProjData(z, z.varianty[0], L);
  const kontrola = (nazev, retezce) => {
    const ceske = retezce.filter(t => CESKA.test(t));
    test(K + ': ' + nazev + ' bez české věty', retezce.length > 0 && ceske.length === 0, ceske.length ? ceske : retezce);
  };
  const nez = blok(d, 'CENA NEZAHRNUJE', L);
  kontrola('CENA NEZAHRNUJE', nez ? nez.radky : []);
  const ic = blok(d, 'INŽENÝRSKÁ ČINNOST (IČ)', L);
  kontrola('INŽENÝRSKÁ ČINNOST', ic ? ic.radky : []);
  const dpz = blok(d, 'CENA ZA DOKUMENTACI PRO POVOLENÍ ZÁMĚRU (DPZ)', L);
  kontrola('popis a hvězdička ceny DPZ', dpz ? [dpz.popis, dpz.hvezdicka] : []);
  const dps = blok(d, 'CENA ZA DOKUMENTACI PRO PROVEDENÍ STAVBY (DPS)', L);
  kontrola('popis ceny DPS', dps ? [dps.popis] : []);
  const rozsahDpz = blok(d, 'DOKUMENTACE PRO POVOLENÍ ZÁMĚRU (DPZ)', L);
  kontrola('podnadpisy částí DPZ', rozsahDpz ? rozsahDpz.radky.filter(r => r[0]).map(r => r[0]) : []);
  /* rozsah se nerozlezl: próza { cz } a řádky rozsahu zůstávají česky */
  const vsechny = [].concat(...d.bloky.map(texty));
  const prelozenaProza = PROZA_CZ.filter(p => vsechny.indexOf(p) < 0
    && !(p.indexOf('V případě, že se investor') === 0 && !vse));
  test(K + ': souvislá próza { cz } zůstává česky', prelozenaProza.length === 0, prelozenaProza);
  test(K + ': řádek rozsahu DPZ „situace stavby…" zůstává česky',
    vsechny.indexOf('– situace stavby – v rozsahu požadovaném pro řízení o povolení záměru') >= 0);
}));

/* Popis DPZ pro každou kombinaci počítaných částí (PBŘ, Statika, Elektro,
 * Studie osvitu): věta se nesmí rozpadnout zpět do češtiny. */
{
  const CASTI = ['PBŘ', 'Statika', 'Elektro projekt', 'Studie osvitu (Praha 4 a 6)'];
  const spatne = [];
  for (let m = 0; m < 16; m++) JAZYKY.forEach(L => {
    const z = zak(true);
    z.varianty[0].data.proj.zadani.sekce.find(s => s.key === 'dpz').polozky.forEach(p => {
      const i = CASTI.indexOf(p.nazev); if (i >= 0) p.vyrazeno = !(m & (1 << i));
    });
    const d = NP.nabidkaProjData(z, z.varianty[0], L);
    const b = blok(d, 'CENA ZA DOKUMENTACI PRO POVOLENÍ ZÁMĚRU (DPZ)', L);
    if (!b || CESKA.test(b.popis) || /včetně|STATIKY|PBŘ/.test(b.popis)) spatne.push([m, L, b && b.popis]);
  });
  test('popis DPZ přeložený pro všech 16 kombinací částí × EN/DE/FR', spatne.length === 0, spatne);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
