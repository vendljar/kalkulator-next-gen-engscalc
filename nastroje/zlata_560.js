/* ZLATÁ POJISTKA #560 (sekce MŮSTKY, 5. 11. 2026).
 *
 * Otisky výsledku jádra (Model 1 i Model 2), symbolů cenové nabídky (CZ i EN),
 * online náhledu nabídky a technické specifikace pro zakázky BEZ můstků
 * a se STARÝM zadáním můstků (počet + délka, zaškrtávátko) a starým ceníkem
 * (paušál i #354). Spuštěno nad stromem výchozího commitu dávky (000924e)
 * dalo soubor src/test_560_zlata.json; src/test_560_mustky_sekce.js ho
 * porovná s dnešním stromem — výsledek se nesmí změnit ani o haléř.
 *
 *   node nastroje/zlata_560.js <složka src> > src/test_560_zlata.json
 *
 * Jen smyšlený zkušební ceník (zkusebni_cenik.js). Nová pole výsledku
 * (r.mustky, která #560 rozšířil o skupiny) a nové symboly nabídky se
 * z otisku vynechávají — ty stará verze nezná; počítají se zvlášť. */
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

function nacti(src) {
  const R = f => require(path.join(src, f));
  const g = {};
  const dej = m => Object.assign(global, m);
  const eng = R('engine.js'); dej(eng);
  const ZC = R('zkusebni_cenik.js');
  global.DEFAULT_CENIK = ZC.zkusebniCenik();
  const ep = R('engine_proj.js'); global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
  ['techspec.js', 'preklad.js', 'zaokrouhleni.js', 'sleva.js', 'firma.js', 'format.js'].forEach(f => { try { dej(R(f)); } catch (e) { /* nemusí být */ } });
  g.eng = eng; g.ZC = ZC; g.zk = R('zakazka.js'); g.N = R('nabidka.js');
  g.JEKLY = JSON.parse(fs.readFileSync(path.join(src, 'jekly.json'), 'utf8'));
  return g;
}

const ZADANI = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1 };
/* Scénáře: [jméno, typ šachty, úprava zadání, ceník ('pausal' | '354')] */
const SCENARE = [
  ['bezMustku-ext', 'exteriérová', {}, '354'],
  ['bezMustku-int', 'interiérová', {}, '354'],
  ['bezMustku-pausal', 'exteriérová', {}, 'pausal'],
  ['stare-2ks-delka-354', 'exteriérová', { mustkyKs: 2, mustekHloubkaMm: 1200 }, '354'],
  ['stare-1ks-bezDelky-354', 'interiérová', { mustkyKs: 1 }, '354'],
  ['stare-zaskrtnuty-354', 'exteriérová', { mustek: true, mustekHloubkaMm: 800 }, '354'],
  ['stare-vsechna-nastupiste-354', 'exteriérová', { mustkyKs: 5, mustekHloubkaMm: 1000, nastupiste: 6 }, '354'],
  ['stare-2ks-pausal', 'exteriérová', { mustkyKs: 2, mustekHloubkaMm: 1200 }, 'pausal'],
  ['stare-zaskrtnuty-pausal', 'interiérová', { mustek: true, mustekHloubkaMm: 900, mustekSirkaMm: 1500 }, 'pausal'],
];
const NOVE_SYMBOLY = /^(TS_MUSTKY_|CENA_SACHTA_BEZ_DPH$|CENA_MUSTKY_BEZ_DPH$|CENA_BEZ_DPH_SACHTA$|CENA_BEZ_DPH_CELKEM$)/;

function otisk(o) { return crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 24); }
function bezMustku(r) { const k = Object.assign({}, r); delete k.mustky; return k; }

function zlata(src) {
  const g = nacti(src);
  const out = {};
  SCENARE.forEach(([jm, typ, uprava, cen]) => {
    const z = g.zk.novaZakazka();
    z.cislo = '2026-OPR-CN-9560'; z.nazevAkce = 'Zlatá pojistka ' + jm;
    const v = z.varianty[0];
    /* pevné datum — nová zakázka bere dnešek a krok kola „hodiny +400 dní" by otisk změnil */
    z.datum = '2026-11-05'; if (v.datum) v.datum = '2026-11-05';
    Object.assign(v.data.ock.zadani, ZADANI, { typSachty: typ }, uprava);
    v.data.cenik = Object.assign(g.ZC.zkusebniCenik(), cen === '354' ? g.ZC.zkusebniMustky() : {}, { kurzEurKc: 25 });
    const zaznam = {};
    [true, false].forEach(f => {
      const r = g.eng.vypocet(JSON.parse(JSON.stringify(v.data.ock.zadani)), JSON.parse(JSON.stringify(v.data.cenik)), g.JEKLY, f);
      zaznam[f ? 'model2' : 'model1'] = otisk(bezMustku(r));
      zaznam[(f ? 'model2' : 'model1') + 'Cena'] = r.souhrn.zakladCena;
      v.data.ock.fixes = f;
      ['cz', 'en'].forEach(L => {
        const d = g.N.nabidkaData(z, v, g.JEKLY, L);
        const ph = {};
        Object.keys(d.placeholders).filter(k => !NOVE_SYMBOLY.test(k)).forEach(k => { ph[k] = d.placeholders[k]; });
        zaznam[(f ? 'm2' : 'm1') + '-ph-' + L] = otisk(ph);
        zaznam[(f ? 'm2' : 'm1') + '-nahled-' + L] = otisk(g.N.nabidkaNahledSekce(d.placeholders, L, d.platbyOck, d.tsExtra));
        zaznam[(f ? 'm2' : 'm1') + '-radkyNavic-' + L] = otisk(d.tsRadkyNavic);
      });
      const r2 = g.eng.vypocet(v.data.ock.zadani, v.data.cenik, g.JEKLY, f);
      const ts = {};
      global.TECHSPEC_DEF.forEach(s => (!s.jen || s.jen(r2, v.data.ock.zadani)) && s.pole.forEach(p => {
        ts[p.id] = global.tsHodnota(p, v.data.techspec, r2, v.data.ock.zadani, v.data.cenik, 'cz').text;
      }));
      zaznam[(f ? 'm2' : 'm1') + '-spec'] = otisk(ts);
    });
    out[jm] = zaznam;
  });
  return out;
}

if (require.main === module) {
  const src = path.resolve(process.argv[2] || path.join(__dirname, '..', 'src'));
  process.stdout.write(JSON.stringify({ zdroj: 'nastroje/zlata_560.js', scenare: zlata(src) }, null, 1) + '\n');
}
module.exports = { zlata, SCENARE };
