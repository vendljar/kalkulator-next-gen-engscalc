/* ZLATÁ SADA VZ-E0 (víc zákazníků, #599, bod 5 PROMPT_VZ_E0.md, návrh § 8).
 *
 * „Jeden zákazník = beze změny, bajt po bajtu." Otisky dokumentů bere
 * nastroje/zlata_vs.js (táž sada jako src/test_vs_zlata.js, 319 scénářů:
 * výpočet, cena, symboly a náhled CN, Word, krycí list, specifikace, SoD,
 * Pipedrive, controlling, zámek) a porovnává je s src/test_vs_zlata.json.
 *
 *   (a) VYP: zlata() nad dnešním stromem = uložené otisky.
 *   (b) ZAP, jeden zákazník: do scénáře jde vzPohled(zak) (pohled řídícího
 *       zákazníka) → otisky = uložené.
 *   (c) Víc zákazníků: zakázce se přidá druhý zákazník (sdílená varianta)
 *       a do scénáře jde pohled prvního (řídícího) vzPohled(zak, 'z1')
 *       → otisky = uložené (pohled řídícího = dokumenty téže zakázky
 *       s jedním zákazníkem).
 *   (d) „Bez stop": každá fixtura a novaZakazka() — JSON po importu →
 *       vzPridej → vzOdstran = výchozí JSON. Se sdílenou variantou celý
 *       JSON; s vlastní variantou a smazatVariantu vše kromě `priponaMax`
 *       (padlé číslo přípony se znovu nepoužije — záměr, test_pripona*).
 *
 * Pojistka (16. 11. 2026): pokažený pohled v háku (objednatel v pohledu
 * změněný) shodí (b) i (c); vzOdstran, který nechá `dalsiZakaznici: []`,
 * shodí (d) — viz zpráva commitu. */
'use strict';
const path = require('path');
const fs = require('fs');
const { zlata } = require('../nastroje/zlata_vs.js');

const ulozene = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_vs_zlata.json'), 'utf8'));
const kop = x => JSON.parse(JSON.stringify(x));

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

/* Porovnání otisků se zlatým JSON (jako test_vs_zlata.js). */
function porovnej(ted) {
  const ocek = ulozene.scenare;
  let shoda = 0;
  const vypis = [];
  const klice = Object.keys(ocek);
  for (const k of klice) {
    const a = ocek[k], b = ted[k];
    if (!b) { vypis.push(k + ': scénář chybí'); continue; }
    const rozdil = Object.keys(a).filter(x => a[x] !== b[x]);
    if (Object.keys(b).some(x => !(x in a))) rozdil.push('(nový klíč ' + Object.keys(b).filter(x => !(x in a)).join(',') + ')');
    if (rozdil.length) vypis.push(k + ': ' + rozdil.join(', ')); else shoda++;
  }
  const navic = Object.keys(ted).filter(k => !(k in ocek));
  if (navic.length) vypis.push('scénáře navíc: ' + navic.slice(0, 5).join(', '));
  if (klice.length < 300) vypis.push('málo scénářů (' + klice.length + ') — prázdná sada?');
  return { shoda, celkem: klice.length, vypis };
}
function hlas(nazev, r) {
  test(nazev + ': ' + r.shoda + '/' + r.celkem + ' scénářů shodných', !r.vypis.length, r.vypis.slice(0, 10));
}

const DRUHY = { objednatel: 'Druhý zákazník s.r.o.', adresaObjednatele: 'Zkušební 2, 100 00 Praha', ico: '', dic: '', kontakt: '' };
const PEVNE = { kdo: 'zlata@priklad.cz', kdy: '2026-11-10T10:00:00.000Z' };

async function hlavni() {
  const t0 = process.hrtime.bigint();   // Date má zlata() pevné
  const volby = { pocetFuzz: ulozene.pocetFuzz };

  /* (a) VYP */
  hlas('(a) VYP = dnešní otisky', porovnej(await zlata(__dirname, volby)));

  /* (b) ZAP, jeden zákazník — pohled řídícího. */
  let pohledu = 0, bezPohledu = 0;
  hlas('(b) ZAP, jeden zákazník: vzPohled = dnešní otisky', porovnej(await zlata(__dirname, Object.assign({}, volby, {
    zakazka: zak => {
      const p = vzPohled(zak);
      if (p && p !== zak && p.vzPohledZakaznika && p.vzPohledZakaznika.id === 'z1') pohledu++; else bezPohledu++;
      return p;
    },
  }))));
  test('(b) hák dal pohled ve všech scénářích', pohledu >= ulozene.pocetFuzz && !bezPohledu, { pohledu, bezPohledu });

  /* (c) Víc zákazníků — pohled prvního (řídícího). Zakázka se nemění:
   * druhý zákazník jde do mělké kopie (varianty sdílené, `v` táž). */
  let pridano = 0;
  const selhani = [];
  hlas('(c) dva zákazníci: vzPohled(z1) = dnešní otisky', porovnej(await zlata(__dirname, Object.assign({}, volby, {
    zakazka: zak => {
      const k = Object.assign({}, zak);
      const r = vzPridej(k, DRUHY, PEVNE);
      if (!r.ok) { selhani.push((zak.cislo || '?') + ': ' + r.chyba); return vzPohled(zak); }
      if (vzRezim(k) && vzZakaznici(k).length === 2 && !vzRezim(zak)) pridano++;
      return vzPohled(k, 'z1');
    },
  }))));
  test('(c) druhý zákazník přidán ve všech scénářích', pridano >= ulozene.pocetFuzz && !selhani.length, { pridano, selhani: selhani.slice(0, 5) });

  /* (d) Bez stop. Globály (importZakazka, novaZakazka, vz…) nastavil zlata(). */
  const fdir = path.join(__dirname, 'fixtury');
  const vstupy = fs.readdirSync(fdir).filter(x => x.endsWith('.json')).sort()
    .map(f => [f, importZakazka(JSON.parse(fs.readFileSync(path.join(fdir, f), 'utf8')))]);
  vstupy.push(['novaZakazka()', importZakazka(kop(novaZakazka()))]);
  for (const [jm, zak] of vstupy) {
    const vychozi = JSON.stringify(zak);
    /* sdílená varianta */
    {
      const z = JSON.parse(vychozi);
      const p = vzPridej(z, DRUHY, PEVNE);
      const pridan = p.ok && vzRezim(z) && JSON.stringify(z) !== vychozi;
      const o = p.ok ? vzOdstran(z, p.zakaznik.id) : { ok: false }; z.dalsiZakaznici = [];
      test('(d) ' + jm + ': přidat (sdílená) → odstranit = výchozí JSON',
        pridan && o.ok && JSON.stringify(z) === vychozi, { pridej: p.chyba, odstran: o.chyba, klice: Object.keys(z).filter(k => !(k in JSON.parse(vychozi))) });
    }
    /* vlastní varianta + smazatVariantu */
    {
      const z = JSON.parse(vychozi);
      const pocet = z.varianty.length;
      const p = vzPridej(z, DRUHY, Object.assign({ vlastni: true }, PEVNE));
      const pridan = p.ok && z.varianty.length === pocet + 1 && p.zakaznik.varianta !== vzRidiciVariantaId(z);
      const o = p.ok ? vzOdstran(z, p.zakaznik.id, { smazatVariantu: true }) : { ok: false }; z.dalsiZakaznici = [];
      const bez = x => { const y = JSON.parse(typeof x === 'string' ? x : JSON.stringify(x)); delete y.priponaMax; return JSON.stringify(y); };
      test('(d) ' + jm + ': přidat (vlastní varianta) → odstranit se smazáním = výchozí JSON kromě priponaMax',
        pridan && o.ok && o.smazanaVarianta === p.zakaznik.varianta && bez(z) === bez(vychozi),
        { pridej: p.chyba, odstran: o.chyba, smazana: o.smazanaVarianta });
      const pm0 = JSON.parse(vychozi).priponaMax;
      console.log('    (info) ' + jm + ': priponaMax ' + pm0 + ' → ' + z.priponaMax);
    }
  }

  console.log('\nDoba běhu: ' + (Number(process.hrtime.bigint() - t0) / 1e9).toFixed(1) + ' s');
  console.log('Zlatá sada VZ: ' + ok + ' OK, ' + fail + ' FAIL');
  if (fail) process.exit(1);
}

hlavni().catch(e => { console.error(e); process.exit(1); });
