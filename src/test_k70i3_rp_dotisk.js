/* K70-I3 (kolo 70A, rozhodnutí J. V. 27. 11. 2026) — DOTISK STARÉ ODESLANÉ
 * NABÍDKY S RUČNÍ POLOŽKOU BEZE ZMĚNY.
 *
 * Dávka RP (#736, v24.11.6) tiskne ruční položky kalkulace OCK v nabídce CN:
 * řádek ve specifikaci a rozpis cenového bloku (výtahová šachta / položka /
 * CENA CELKEM). Dotisk nabídky odeslané PŘED tím se proti main lišil. Od
 * K70-I3 nese snímek podmínek při odeslání značku `rpTisk`; zámek bez ní se
 * dotiskne jako před RP (main 4e69c27): cena celá v řádku VÝTAHOVÁ ŠACHTA,
 * žádný řádek ruční položky ve specifikaci, v cenovém bloku ani v náhledu.
 *
 *  A) značka: podminkySnimek i kryciZmrazPodminky (odeslání) zapíší rpTisk = 1;
 *  B) starý zámek (bez snímku podmínek i se snímkem bez rpTisk) CZ + EN:
 *     symboly ceny jako před RP, žádné data.rucni, žádný řádek RP v řádcích
 *     Wordu, náhled bez položky; ostatní symboly a částky beze změny;
 *  C) zámek se značkou: tvar RP (řádky specifikace, rozpis ceny);
 *  D) nová / neodeslaná nabídka: tvar RP (beze změny);
 *  E) víc šachet: starý zámek bez ručních řádků u šachet, se značkou s nimi;
 *  F) krycí list ani cena se značkou nemění (řádek „Ruční položky v ceně“
 *     zůstává podle rozhodnutí RP N1 24. 11.).
 * Pojistka: na 7c2d42e (před K70-I3) sada selže — B (starý zámek má rozpis RP)
 * a A (značka chybí); viz zpráva commitu.
 * Spuštění: node src/test_k70i3_rp_dotisk.js */
'use strict';
const path = require('path');
const fs = require('fs');
const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'rucni_polozky.js', 'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js', 'dokumenty.js',
  'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js',
  'cenik.js', 'cenik_stari.js', 'cenik_rady.js', 'vyjimky.js', 'rucni_ceny.js', 'katalog.js', 'prepisy.js', 'slovnik.js',
  'konfigurace.js', 'sablony_online.js', 'sablona_obsah.js', 'analytika.js', 'nastaveni_db.js', 'program.js', 'ukazkove.js',
  'prava.js', 'zobrazeni.js', 'zakaznici.js', 'controlling.js', 'pd_nanecisto.js', 'objednane.js', 'standard_ock.js', 'nahled_word.js'];
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
for (const f of CORE) {
  const m = require(path.join(__dirname, f)); if (m && typeof m === 'object') Object.assign(global, m);
}
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
global.NAST = { firma: firmaDefault() };
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));
const kop = x => JSON.parse(JSON.stringify(x));

const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4, typSachty: 'exteriérová' };
const RUCNI = () => ({
  oplasteni: [{ nazev: 'Oplechování atiky', mnozstvi: 3, cena: 900, jednotka: 'm²', dodatek: 'pozink lakovaný RAL 7016' }],
  volitelne: [{ nazev: 'Stříška nad vstupem', mnozstvi: 1, cena: 56000 }],
  rezie: [{ nazev: 'Doprava jeřábem', mnozstvi: 1, cena: 8000, jednotka: 'kpl' }],
});
const JMENA = /OPLECHOVÁNÍ ATIKY|STŘÍŠKA NAD VSTUPEM|DOPRAVA JEŘÁBEM|Oplechování atiky|Stříška nad vstupem|Doprava jeřábem/i;
function zakazka(o) {
  o = o || {};
  const zak = novaZakazka();
  zak.cislo = '2026-OPR-CN-9703'; zak.nazevAkce = 'K70-I3 dotisk';
  const v = zak.varianty[0];
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 });
  v.data.ock.fixes = true;
  Object.assign(v.data.ock.zadani, ZAD);
  v.data.ock.zadani.vlastniPolozky = Object.assign({}, v.data.ock.zadani.vlastniPolozky, RUCNI());
  if (o.sleva) v.data.sleva = { procenta: o.sleva, stav: 'schváleno' };
  return { zak, v };
}
/* odeslání: `podm` = 'rp' (po K70-I3: zmrazení podmínek jako při odeslání),
 * 'stare' (snímek podmínek bez rpTisk — odeslaná mezi K3-N2 a K70-I3),
 * 'zadne' (bez snímku podmínek — odeslaná před K3-N2, např. 1. 10.) */
function odesli(zak, podm) {
  const z = kop(zak); const v = z.varianty[0];
  if (podm !== 'zadne') kryciZmrazPodminky(z, v, J);
  if (podm === 'stare') delete v.data.kryci.zmrazenoPodminky.rpTisk;
  v.zamek = { zamceno: true, kdy: '2026-10-01T10:00:00.000Z', kdo: 'test@priklad.cz', cislo: z.cislo,
    vysledek: kop(zamekVysledekSpocti(v, J, 'test')), snimek: zamekSnimekSpocti(v) };
  return { z, v };
}
const nahled = (d, L) => nwHtml(nwBloky(d, L, {}));
const RP_KOTVY_CENY = /CENA_MUSTKY_BEZ_DPH|CENA_BEZ_DPH_CELKEM|CENA_BEZ_DPH$/;

/* ---------- A) značka ---------- */
{
  test('A podminkySnimek nese rpTisk = 1 (vedle pd2Tisk, txTisk)', podminkySnimek(NAST.firma).rpTisk === 1 && podminkySnimek(NAST.firma).txTisk === 1);
  const { zak } = zakazka();
  const { v } = odesli(zak, 'rp');
  test('A odeslání (kryciZmrazPodminky) zapíše značku do varianty i do snímku zámku',
    v.data.kryci.zmrazenoPodminky.rpTisk === 1 && v.zamek.snimek.kryci.zmrazenoPodminky.rpTisk === 1);
  test('A nabidkaRpTisk: neodeslaná ano, odeslaná se značkou ano, bez značky ne', typeof nabidkaRpTisk === 'function' &&
    nabidkaRpTisk(zak.varianty[0]) === true && nabidkaRpTisk(v) === true
    && nabidkaRpTisk(odesli(zak, 'stare').v) === false && nabidkaRpTisk(odesli(zak, 'zadne').v) === false);
}

/* ---------- B) starý zámek = tvar před RP; C) se značkou = RP; D) nová = RP ---------- */
for (const L of ['cz', 'en']) {
  for (const o of [{}, { sleva: 5 }]) {
    const pop = L.toUpperCase() + (o.sleva ? ' sleva' : '');
    const { zak, v } = zakazka(o);
    const nova = nabidkaData(zak, v, J, L);
    const se = odesli(zak, 'rp'); const dSe = nabidkaData(se.z, se.v, J, L);
    for (const podm of ['stare', 'zadne']) {
      const st = odesli(zak, podm);
      const d = nabidkaData(st.z, st.v, J, L);
      const ph = d.placeholders;
      const jm = 'B ' + pop + ' (' + (podm === 'stare' ? 'snímek bez rpTisk' : 'bez snímku podmínek') + ')';
      test(jm + ': cena celá v řádku VÝTAHOVÁ ŠACHTA, bez rozpisu (jako main)',
        ph.CENA_SACHTA_BEZ_DPH === '' && ph.CENA_MUSTKY_BEZ_DPH === '' && ph.CENA_BEZ_DPH_CELKEM === ''
        && ph.CENA_BEZ_DPH_SACHTA === ph.CENA_BEZ_DPH && ph.CENA_BEZ_DPH !== '', [ph.CENA_SACHTA_BEZ_DPH, ph.CENA_BEZ_DPH_SACHTA, ph.CENA_BEZ_DPH_CELKEM]);
      test(jm + ': žádné data.rucni, v řádcích Wordu žádná ruční položka ani přejmenování CENA CELKEM',
        d.rucni === undefined && !(d.tsRadkyNavic || []).some(x => JMENA.test(String(x.nazev || '')) || RP_KOTVY_CENY.test(String(x.kotva || ''))),
        (d.tsRadkyNavic || []).map(x => x.kotva + ':' + x.nazev));
      const h = nahled(d, L);
      test(jm + ': online náhled bez řádku ruční položky', !JMENA.test(h) && h.indexOf(ph.CENA_BEZ_DPH) >= 0);
      /* ostatní symboly (vč. částek) jako u zámku se značkou — liší se jen tři symboly rozpisu */
      const jine = Object.keys(Object.assign({}, ph, dSe.placeholders))
        .filter(k => JSON.stringify(ph[k]) !== JSON.stringify(dSe.placeholders[k]));
      test(jm + ': částky a ostatní symboly beze změny (rozdíl jen v symbolech rozpisu)',
        /* bez snímku podmínek se liší i texty starších značek (PD2/TX) — tam jen částky */
        jine.every(k => (podm === 'zadne' && /^(PODM_|NAB_ZARUKA)/.test(k)) || ['CENA_SACHTA_BEZ_DPH', 'CENA_BEZ_DPH_SACHTA', 'CENA_BEZ_DPH_CELKEM'].indexOf(k) >= 0)
        && ph.CENA_BEZ_DPH === dSe.placeholders.CENA_BEZ_DPH && ph.CENA_S_DPH === dSe.placeholders.CENA_S_DPH
        && ph.CENA_PRED_SLEVOU === dSe.placeholders.CENA_PRED_SLEVOU, jine);
    }
    test('C ' + pop + ' zámek se značkou: řádky specifikace a rozpis ceny (tvar RP)',
      dSe.rucni && dSe.rucni.tsRadky.length === 3 && dSe.rucni.ceny.length === 3 && dSe.placeholders.CENA_BEZ_DPH_CELKEM === dSe.placeholders.CENA_BEZ_DPH
      && dSe.placeholders.CENA_SACHTA_BEZ_DPH !== '' && dSe.tsRadkyNavic.some(x => x.kotva === 'CENA_MUSTKY_BEZ_DPH'), dSe.rucni);
    test('C ' + pop + ' zámek se značkou: náhled s ruční položkou', JMENA.test(nahled(dSe, L)));
    test('D ' + pop + ' nová nabídka: tvar RP, shodný se zámkem se značkou',
      nova.rucni && JSON.stringify(nova.rucni) === JSON.stringify(dSe.rucni)
      && JSON.stringify(nova.placeholders.CENA_SACHTA_BEZ_DPH) === JSON.stringify(dSe.placeholders.CENA_SACHTA_BEZ_DPH));
  }
}

/* ---------- E) víc šachet ---------- */
{
  const { zak, v } = zakazka();
  v.data.ock.nazev = 'Výtah A';
  v.data.ock.dalsi = [{ id: 's_b', nazev: 'Výtah B', ks: 1, zadani: Object.assign(kop(DEFAULT_ZADANI), ZAD,
    { typSachty: 'interiérová', profily: kop(PROFILY_VYCHOZI['interiérová']), vlastniPolozky: Object.assign({}, kop(DEFAULT_ZADANI.vlastniPolozky),
      { oplasteni: [{ nazev: 'Stříška nad vstupem', mnozstvi: 1, cena: 1000 }] }) }) }];
  const sym = { symboly: new Set(['TS_NAPOJENI_DVERI', 'TS_STATIKA', 'SACHTA_NAZEV', 'SACHTA_CENA_BEZ_DPH']) };
  const st = odesli(zak, 'stare'); const d = nabidkaData(st.z, st.v, J, 'cz', sym);
  test('E víc šachet, starý zámek: šachty bez ručních řádků (Word i náhled), žádné data.rucni',
    d.sachty && d.sachty.length === 2 && d.sachty.every(s => !s.rucniTs.length && !(s.rucni || []).length)
    && d.sachtyWord.polozky.every(p => !p.__radkyNavic) && d.rucni === undefined && !JMENA.test(nahled(d, 'cz')), d.sachty && d.sachty.map(s => s.rucniTs));
  const se = odesli(zak, 'rp'); const dSe = nabidkaData(se.z, se.v, J, 'cz', sym);
  test('E víc šachet, zámek se značkou: ruční řádky u své šachty (tvar RP)',
    dSe.sachty[1].rucniTs.some(t => t.nazev === 'STŘÍŠKA NAD VSTUPEM') && dSe.sachtyWord.polozky[1].__radkyNavic
    && dSe.rucni && dSe.rucni.tsRadky.some(t => /DOPRAVA JEŘÁBEM/.test(t.nazev)));
  test('E víc šachet: částky starého zámku = se značkou', d.placeholders.CENA_BEZ_DPH === dSe.placeholders.CENA_BEZ_DPH
    && JSON.stringify(d.sachty.map(s => s.cena)) === JSON.stringify(dSe.sachty.map(s => s.cena)));
}

/* ---------- F) krycí list beze změny ---------- */
{
  const { zak } = zakazka();
  const kl = p => { const o = odesli(zak, p); return JSON.stringify(kryciData(o.z, o.v, J, 'bo')); };
  test('F krycí list starého zámku = se značkou (značka mění jen nabídku CN)', kl('stare') === kl('rp'));
}

console.log(`\nVýsledek: ${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
