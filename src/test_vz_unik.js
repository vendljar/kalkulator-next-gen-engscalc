/* ============================================================
 * VZ-E2 (#601) — TEST ÚNIKU: dokument jednoho zákazníka nesmí nést údaj
 * jiného zákazníka téže zakázky (návrh podklady/NAVRH_VICE_ZAKAZNIKU.md
 * § 4, § 9 R1; zadání podklady/PROMPT_VZ_E2.md, oddíl „Test úniku").
 *
 * Zakázka se třemi zákazníky:
 *   A = z1 řídící (hlavička zakázky), varianta V1 (řídící),
 *   B = z2 sdílí variantu V1 řídícího,
 *   C = z3 vlastní varianta V2 (vzPridej … { vlastni: true }).
 * Každý zákazník má jedinečný kanárek v KAŽDÉM poli: objednatel, sídlo,
 * IČO (platné, 8 číslic), DIČ, kontakt, všech 15 polí zástupců
 * (VZ_ZASTUPCI_POLE), v.zakaznik jeho varianty. Kanárky varianty (název,
 * poznámka, ruční položka, CENA) patří variantě: V1 smí A i B, V2 jen C.
 * Kanárek = „ZQ<zákazník><pole>X" (zákazník) / „ZV<varianta><pole>X"
 * (varianta) — hledá se v textu bez diakritiky, malými písmeny a bez
 * oddělovačů, takže ho najde i v názvu souboru a v XML rozděleném značkami.
 * Cena varianty V2 je neobvyklé číslo (ruční položka 1 357 911 Kč, bez
 * zaokrouhlení) — hledá se cena tak, jak ji tiskne nabídka (CENA_BEZ_DPH
 * v jazyce dokumentu); test ověří, že ji dokument toho zákazníka opravdu má.
 * Protokol zakázky nese jména všech zákazníků (jako E1) — dokumenty ho
 * tisknout nesmí. Sdílené texty (název akce, adresa, popis záměru, fotka)
 * žádného zákazníka nejmenují.
 *
 * Pro každý dokument × zákazník × jazyk cz/en/de/fr (vstup vždy
 * vzTiskPohled + vzTiskVarianta): Word přes dokumentVygeneruj (nabidka, sod,
 * kryci_bo, kryci_techdata; u řídícího i nabidkaProj, sodProj, plnaMoc,
 * kryciproj_bo/techdata — zkušební šablona se všemi symboly builderu,
 * celé XML po rozbalení), data nabidkaData / nabidkaProjData + HTML náhledu
 * (nabidkaNahledSekce), kryciData + kryciVystupSekce, technická specifikace,
 * porovnaniVariant / porovnaniPolozek, pruh tisku, názvy souborů. Kanárek
 * cizího zákazníka = FAIL; vlastní objednatel chybí = FAIL (prázdný výstup).
 * Číslo nabídky: B nese „-B", C „-C", řídící žádné písmeno.
 * Dokumenty PROJ pro dalšího zákazníka: vzTiskZabrana (R5) nenulová.
 *
 * POJISTKY (uvnitř sady, „detektor úniku zabírá"):
 *   P1 tisk z celé zakázky (identita místo pohledu): dokumentVygeneruj
 *      hodí (vzTiskHlidej) a s vypnutým hlídačem dostane B údaje A;
 *   P2 pokažený pohled (mělká kopie bez dalsiZakaznici, hlavička
 *      řídícího nepřepsaná) → detektor najde kanárek A v dokumentu B.
 * Spuštění: node src/test_vz_unik.js
 * ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');

/* Moduly do `global` ve stejném pořadí jako CORE v build.py (vzor
 * nastroje/zlata_vs.js) — guardy `typeof … === 'function'` musí najít
 * tytéž funkce jako v prohlížeči. */
const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'vice_zakazniku.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js', 'dokumenty.js',
  'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js',
  'cenik.js', 'cenik_stari.js', 'cenik_rady.js', 'vyjimky.js', 'rucni_ceny.js', 'katalog.js', 'prepisy.js', 'slovnik.js',
  'konfigurace.js', 'sablony_online.js', 'sablona_obsah.js', 'analytika.js', 'nastaveni_db.js', 'program.js', 'ukazkove.js',
  'prava.js', 'zobrazeni.js', 'zakaznici.js', 'controlling.js', 'pd_nanecisto.js', 'objednane.js', 'standard_ock.js'];
CORE.forEach(f => { const m = require(path.join(__dirname, f)); if (m && typeof m === 'object') Object.assign(global, m); });
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));
const dg = require('./docxgen.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + (info === undefined ? '' : '  ' + JSON.stringify(info).slice(0, 900))); } };
const info = t => console.log('INFO ' + t);
const dec = new TextDecoder();
const T0 = Date.now();

const JAZYKY = ['cz', 'en', 'de', 'fr'];
const ZAK_TYPY_OCK = ['nabidka', 'sod', 'kryci_bo', 'kryci_techdata'];
const ZAK_TYPY_PROJ = ['nabidkaProj', 'sodProj', 'plnaMoc', 'kryciproj_bo', 'kryciproj_techdata'];

/* ---------- kanárky ---------- */
const dv = n => String(n).padStart(2, '0');
const tokZ = (pism, n) => 'ZQ' + pism + dv(n) + 'X';      // zákazník
const tokV = (pism, n) => 'ZV' + pism + dv(n) + 'X';      // varianta
/* Platné IČO (vážený součet mod 11) z 7 číslic. */
function icoSKontrolou(sedm) {
  const c = String(sedm).split('').map(Number);
  const s = c.reduce((a, x, i) => a + x * (8 - i), 0);
  return String(sedm) + String((11 - (s % 11)) % 10);
}
const ZAKAZNICI = {
  A: { id: 'z1', pism: 'A', pismeno: '', firma: 'Alfa', ico: icoSKontrolou('2718281'), dic: 'CZ' + icoSKontrolou('3141592') },
  B: { id: 'z2', pism: 'B', pismeno: 'B', firma: 'Beta', ico: icoSKontrolou('1618033'), dic: 'CZ' + icoSKontrolou('5772156') },
  C: { id: 'z3', pism: 'C', pismeno: 'C', firma: 'Gama', ico: icoSKontrolou('4669201'), dic: 'CZ' + icoSKontrolou('2502907') },
};
/* Zástupci: pole 6…20 (pořadí VZ_ZASTUPCI_POLE). Telefony bez +420
 * a začínající 2 — kontrola osobních údajů je nebere za skutečné číslo. */
function zastupci(p) {
  const out = {};
  VZ_ZASTUPCI_POLE.forEach((k, i) => {
    const t = tokZ(p, 6 + i);
    out[k] = /Email$/.test(k) ? t.toLowerCase() + '@priklad.cz'
      : /Tel$/.test(k) ? t + ' 212 300 ' + (100 + i)
      : k === 'ucet' ? '19-' + t + '/0100'
      : 'Údaj ' + t;
  });
  return out;
}
function hlavicka(z) {
  const p = z.pism;
  return { objednatel: z.firma + ' ' + tokZ(p, 1) + ' s.r.o.', adresaObjednatele: 'Kanárková ' + tokZ(p, 2) + ' 5, 110 00 Praha',
    ico: z.ico, dic: z.dic, kontakt: 'Ing. Kontakt ' + tokZ(p, 5), zastupci: zastupci(p) };
}
/* Pole zákazníka, která MUSÍ být vidět aspoň v jednom jeho dokumentu
 * (jinak by kanárek byl prázdný): 1 objednatel, 2 sídlo, 5 kontakt,
 * 6–20 zástupci (krycí list BO), 21 v.zakaznik (název souboru). */
const POLE_NAZEV = ['', 'objednatel', 'adresaObjednatele', 'ico', 'dic', 'kontakt'].concat(VZ_ZASTUPCI_POLE, ['v.zakaznik']);

const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
const PEVNE = { kdo: 'unik@priklad.cz', kdy: '2026-11-16T10:00:00.000Z' };

/* Zakázka se třemi zákazníky. `proj` = zakázka projekce (číslo OVP, OCK
 * vyřazená) — jinak realizace (OPR, PROJ vyřazená; zámek strany P6). */
function zakazka(proj) {
  const zak = novaZakazka();
  const hA = hlavicka(ZAKAZNICI.A);
  Object.assign(zak, { objednatel: hA.objednatel, adresaObjednatele: hA.adresaObjednatele, ico: hA.ico, dic: hA.dic,
    kontakt: hA.kontakt, zastupci: hA.zastupci });
  zak.nazevAkce = 'Bytový dům U Zkušební stanice';
  zak.adresa = 'Stavební 12, 120 00 Praha';
  zak.popisZameru = 'Nová výtahová šachta ve dvoře domu.';
  zak.uvodniFotoNazev = 'dvur.jpg';
  zak.uvodniFotoPopis = 'Pohled do dvora';
  zak.datum = '2026-11-16';
  if (proj) {
    zak.projHlavicka = Object.assign({}, zak.projHlavicka, { cislo: '2026 - OVP - CN - 9941', nazevAkce: zak.nazevAkce,
      adresa: zak.adresa, objednatel: hA.objednatel, kontakt: hA.kontakt, ico: hA.ico, adresaObjednatele: hA.adresaObjednatele });
  } else zak.cislo = '2026 - OPR - CN - 9940';
  const v1 = zak.varianty[0];
  v1.nazev = 'Varianta ' + tokV('A', 16);
  v1.pozn = 'Poznámka ' + tokV('A', 17);
  v1.zakaznik = hA.objednatel + ' ' + tokZ('A', 21);   // jako v aplikaci: název zákazníka
  v1.datum = '2026-11-16';
  Object.assign(v1.data.ock.zadani, ZAD);
  v1.data.ock.zadani.vlastniPolozky.hrubaOck = [{ nazev: 'Položka ' + tokV('A', 18), mnozstvi: 1, cena: 24680 }];
  v1.data.zaokr = { krok: 0, smer: 'nahoru' };
  /* neobvyklá cena: schválená sleva s „lichým" procentem (jádro zaokrouhluje základ) */
  v1.data.sleva = Object.assign({}, v1.data.sleva, { procenta: 1.3, stav: 'schváleno' });
  v1.data.cenik.kurzEurKc = 25;
  v1.data.proj.cenik = Object.assign({}, v1.data.proj.cenik, { kurzEurKc: 25 });
  v1.data.kryci = { hodnoty: { sodDphRezim: KRYCI_DPH_REZIMY[0] } };
  v1.data.kryciProj = { hodnoty: {} };
  /* B — sdílí řídící variantu */
  const rB = vzPridej(zak, hlavicka(ZAKAZNICI.B), PEVNE);
  /* C — vlastní varianta (klon řídící) s vlastními kanárky a cenou */
  const rC = vzPridej(zak, hlavicka(ZAKAZNICI.C), Object.assign({ vlastni: true, nazevVarianty: 'Varianta ' + tokV('C', 16) }, PEVNE));
  if (!rB.ok || !rC.ok) throw new Error('vzPridej: ' + (rB.chyba || rC.chyba));
  const v2 = zak.varianty.find(v => v.id === rC.zakaznik.varianta);
  v2.pozn = 'Poznámka ' + tokV('C', 17);
  v2.zakaznik = 'Zákazník ' + tokZ('C', 21);
  v2.datum = '2026-11-16';
  v2.data.ock.zadani.vlastniPolozky.hrubaOck = [{ nazev: 'Položka ' + tokV('C', 18), mnozstvi: 1, cena: 1357911 }];
  v2.data.zaokr = { krok: 0, smer: 'nahoru' };
  v2.data.sleva = Object.assign({}, v2.data.sleva, { procenta: 3.7, stav: 'schváleno' });
  /* V3 — VOLNÁ varianta (žádný zákazník na ni neukazuje): smí ji tisknout
   * jen řídící (vzVariantyZakaznika, revize E0 N3). Vlastní kanárky a cena. */
  const v3 = klonujVariantu(zak, v1.id, { aktivovat: false, nazev: 'Varianta ' + tokV('D', 16) });
  v3.pozn = 'Poznámka ' + tokV('D', 17);
  v3.datum = '2026-11-16';
  v3.data.ock.zadani.vlastniPolozky.hrubaOck = [{ nazev: 'Položka ' + tokV('D', 18), mnozstvi: 1, cena: 97531 }];
  v3.data.sleva = Object.assign({}, v3.data.sleva, { procenta: 2.9, stav: 'schváleno' });
  /* Protokol jako E1: záznamy se jmény všech zákazníků. */
  Object.values(ZAKAZNICI).forEach(z => {
    const h = hlavicka(z);
    protokolZapis(zak, { co: 'Přidán zákazník ' + h.objednatel, kde: 'Zákazníci', kdo: PEVNE.kdo, kdy: PEVNE.kdy,
      po: h.objednatel + ', IČO ' + h.ico + ', ' + h.zastupci.smluvniEmail });
  });
  return zak;
}
/* Varianta zákazníka (V1 pro A a B, V2 pro C). */
const variantaZak = (zak, id) => zak.varianty.find(v => v.id === vzZakaznik(zak, id).varianta);
/* Písmeno varianty podle kanárku v názvu: V1 'A' (řídící, sdílená s B),
 * V2 'C' (vlastní varianta C), V3 'D' (volná). */
const vlastnikVarianty = (zak, varId) => {
  const v = zak.varianty.find(x => String(x.id) === String(varId));
  const m = v && /ZV([A-D])16X/.exec(v.nazev || '');
  return m ? m[1] : '?';
};
/* Varianty (písmena), jejichž kanárky smí nést výstupy zákazníka `id`:
 * jeho varianta; řídící navíc volné varianty (V3). Očekávání je pevné —
 * neodvozuje se z pohledu (jinak by test kryl chybu pohledu). */
const povoleneVar = (zak, id) => vlastnikVarianty(zak, variantaZak(zak, id).id) + (vzZakaznik(zak, id).ridici ? 'D' : '');

/* ---------- detektor ---------- */
const norm = t => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const cislice = t => String(t || '').replace(/\D+/g, '');
/* Ceny variant v jazyce L (CENA_BEZ_DPH nabídky téže varianty z pohledu
 * vlastníka) — vyplní se před během. */
const CENY = {};   // CENY[L][pismVarianty] = 'číslice'

/* Najde v textu kanárky: [{ druh: 'z'|'v'|'ico'|'dic'|'cena', kdo, pole }]. */
function kanarky(text, L) {
  const n = norm(text);
  const out = [];
  const re = /z([qv])([abcd])(\d\d)x/g;
  let m;
  while ((m = re.exec(n))) out.push({ druh: m[1] === 'q' ? 'z' : 'v', kdo: m[2].toUpperCase(), pole: +m[3] });
  Object.values(ZAKAZNICI).forEach(z => {
    if (n.indexOf(z.ico) >= 0) out.push({ druh: 'ico', kdo: z.pism, pole: 3 });
    if (n.indexOf(cislice(z.dic)) >= 0) out.push({ druh: 'dic', kdo: z.pism, pole: 4 });
  });
  const c = CENY[L || 'cz'] || {};
  Object.keys(c).forEach(p => { if (c[p] && n.indexOf(c[p]) >= 0) out.push({ druh: 'cena', kdo: p, pole: 99 }); });
  return out;
}
/* Cizí kanárky ve výstupu zákazníka `pism`; `povolene` = písmena variant,
 * které smí jeho výstupy nést (např. 'AD' u řídícího). */
function cizi(nalezy, pism, povolene) {
  return nalezy.filter(k => ((k.druh === 'v' || k.druh === 'cena') ? String(povolene).indexOf(k.kdo) < 0 : k.kdo !== pism));
}
const popisNalezu = k => (k.druh === 'v' ? 'varianta ' : k.druh === 'cena' ? 'cena varianty ' : 'zákazník ') + k.kdo
  + (k.druh === 'cena' ? '' : ' / ' + (k.druh === 'v' ? ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'v.nazev', 'v.pozn', 'ruční položka'][k.pole] : POLE_NAZEV[k.pole] || k.pole));

/* ---------- výstupy ---------- */
async function wordXml(blob) {
  const casti = await dg.zipPrecti(new Uint8Array(await blob.arrayBuffer()));
  return casti.filter(p => /\.(xml|rels)$/.test(p.nazev)).map(p => {
    const x = dec.decode(p.data);
    return p.nazev + '\n' + x + '\n' + x.replace(/<[^>]+>/g, ' ');
  }).join('\n');
}
/* Zkušební šablona se všemi symboly, které builder vrací (vzor zlata_vs.js). */
const SABLONY = new Map();
async function sablona(klice) {
  const k = klice.slice().sort().join(',');
  if (!SABLONY.has(k)) {
    const blob = docxDokumentBlob('Zkušební šablona', [{ sekce: 'SYMBOLY', radky: klice.map(x => [x, '{{' + x + '}}']) }]);
    SABLONY.set(k, await blob.arrayBuffer());
  }
  return SABLONY.get(k).slice(0);
}
/* SoD projekce: šablona s bloky činností {{CIN_…_ZAC}}/{{CIN_…_KON}} (rozsah díla
 * po činnostech — bez nich dokument nevznikne). Minimální .docx (vzor test_sod_tecky.js). */
const enc = new TextEncoder();
const xP = t => '<w:p><w:r><w:t xml:space="preserve">' + t + '</w:t></w:r></w:p>';
async function sablonaBloky(klice, bloky) {
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
    + klice.map(k => xP(k + ': {{' + k + '}}')).join('')
    + bloky.map(b => xP('{{' + b + '_ZAC}}') + xP('Činnost ' + b) + xP('{{' + b + '_KON}}')).join('')
    + '<w:sectPr/></w:body></w:document>';
  return (await dg.zipZapis([{ nazev: 'word/document.xml', data: enc.encode(xml) }])).arrayBuffer();
}
const sablonaTypu = (typ, klice) => (typ === 'sodProj' ? sablonaBloky(klice, SODP_CINNOSTI.map(c => c.blok)) : sablona(klice));
const BUILDER_DATA = {
  nabidka: (z, v, L) => nabidkaData(z, v, J, L),
  sod: (z, v, L) => sodData(z, v, J, L),
  nabidkaProj: (z, v, L) => nabidkaProjData(z, v, L),
  sodProj: (z, v, L) => sodProjData(z, v, L),
  plnaMoc: (z, v) => plnaMocData(z, v),
};
const vypocty = z => z.varianty.map(v => {
  let ock = null, proj = null;
  try { ock = vysledekStrany(z, v, 'ock', J); } catch (e) { /* jako spocitejVariantu */ }
  try { proj = vysledekStrany(z, v, 'proj', J); } catch (e) { /* jako spocitejVariantu */ }
  return { id: v.id, ock, proj };
});

/* Všechny výstupy dokumentů pro (zak = vstup tisku, v = varianta) v jazyce L.
 * Vrací { vystupy: [{ nazev, text, vlastni }], chyby: [text], cisla: { typ: číslo } }.
 * `vlastni` = výstup musí nést vlastní objednatel (pojistka proti prázdnému). */
async function vystupy(zak, v, L, typy) {
  const out = [], chyby = [], cisla = {};
  const pridej = (nazev, x, vlastni) => out.push({ nazev, text: typeof x === 'string' ? x : JSON.stringify(x), vlastni: !!vlastni });
  for (const typ of typy) {
    const jm = typ + '/' + L;
    try {
      if (BUILDER_DATA[typ]) {
        const d = BUILDER_DATA[typ](zak, v, L);
        pridej(jm + ' data (symboly)', d, true);
        pridej(jm + ' název souboru', d.nazevSouboru, false);
        if (d.placeholders && d.placeholders.CISLO_NABIDKY !== undefined) cisla[typ] = d.placeholders.CISLO_NABIDKY;
        if (typ === 'nabidka') pridej(jm + ' náhled HTML (nabidkaNahledSekce)', nabidkaNahledSekce(d.placeholders, L, d.platbyOck, d.tsExtra), true);
        const r = await dokumentVygeneruj(typ, await sablonaTypu(typ, Object.keys(d.placeholders || {})), zak, v, J, L);
        pridej(jm + ' Word XML', await wordXml(r.blob), true);
        pridej(jm + ' Word data', r.data, true);
        pridej(jm + ' Word název souboru', r.nazevSouboru, false);
        cisla[typ + ':soubor'] = r.nazevSouboru;
      } else {
        const r = await dokumentVygeneruj(typ, null, zak, v, J, L);
        pridej(jm + ' Word XML', await wordXml(r.blob), true);
        pridej(jm + ' data', r.data, true);
        pridej(jm + ' název souboru', r.nazevSouboru, false);
        cisla[typ + ':soubor'] = r.nazevSouboru;
        const verze = typ.replace(/^kryci(proj)?_/, '');
        if (/^kryci_/.test(typ)) {
          const d = kryciData(zak, v, J, verze);
          pridej(jm + ' kryciData + kryciVystupSekce', [d, kryciVystupSekce(zak, d.sekce)], true);
        } else {
          const d = kryciProjData(zak, v, J, verze);
          pridej(jm + ' kryciProjData + kryciProjVystupSekce', [d, kryciProjVystupSekce(zak, d.sekce)], true);
        }
      }
    } catch (e) { chyby.push(jm + ': ' + String(e && e.message || e).slice(0, 300)); }
  }
  /* technická specifikace, porovnání, pruh (nezávisí na typu) */
  try {
    const d = v.data, r = vypocetZ(v, J), ts = {};
    TECHSPEC_DEF.forEach(s => (!s.jen || s.jen(r, d.ock.zadani)) && s.pole.forEach(p => {
      ts[p.id] = tsHodnota(p, d.techspec, r, d.ock.zadani, d.cenik, L).text;
    }));
    pridej('techspec/' + L, ts, false);
  } catch (e) { chyby.push('techspec/' + L + ': ' + String(e && e.message || e).slice(0, 300)); }
  try {
    const vy = vypocty(zak);
    pridej('porovnaniVariant/' + L, porovnaniVariant(zak, vy), false);
    pridej('porovnaniPolozek/' + L, porovnaniPolozek(zak, vy), false);
  } catch (e) { chyby.push('porovnání/' + L + ': ' + String(e && e.message || e).slice(0, 300)); }
  return { vystupy: out, chyby, cisla };
}

/* Problémy výstupu zákazníka `pism` (varianta vlastníka varPism):
 * [{ nazev, cizi: [...] }] + výstupy bez vlastního objednatele. */
function problemy(res, pism, varPism, L, povolene) {
  povolene = povolene || varPism;
  const unik = [], prazdne = [], videno = new Set();
  const vlastniTok = norm(tokZ(pism, 1));
  for (const o of res.vystupy) {
    const k = kanarky(o.text, L);
    k.filter(x => x.kdo === pism && x.druh === 'z').forEach(x => videno.add(x.pole));
    if (k.some(x => x.druh === 'ico' && x.kdo === pism)) videno.add(3);
    if (k.some(x => x.druh === 'dic' && x.kdo === pism)) videno.add(4);
    if (k.some(x => x.druh === 'cena' && x.kdo === varPism)) videno.add(99);
    k.filter(x => x.druh === 'v' && x.kdo === varPism).forEach(x => videno.add('v' + x.pole));
    const c = cizi(k, pism, povolene);
    if (c.length) unik.push({ nazev: o.nazev, cizi: Array.from(new Set(c.map(popisNalezu))) });
    if (o.vlastni && norm(o.text).indexOf(vlastniTok) < 0) prazdne.push(o.nazev);
  }
  return { unik, prazdne, videno };
}

async function hlavni() {
  const zak = zakazka(false);
  const zakP = zakazka(true);
  const ID = { A: 'z1', B: 'z2', C: 'z3' };

  /* --- příprava a tvar --- */
  test('zakázka má 3 zákazníky, B sdílí řídící variantu, C má vlastní',
    vzZakaznici(zak).length === 3 && variantaZak(zak, 'z2') === zak.varianty[0] && variantaZak(zak, 'z3') !== zak.varianty[0]
    && vzZakaznik(zak, 'z2').pismeno === 'B' && vzZakaznik(zak, 'z3').pismeno === 'C');
  test('sdílené texty nikoho nejmenují: vzTiskZabrana prázdná u všech zákazníků (OCK typy, jejich varianta)',
    Object.keys(ID).every(p => ZAK_TYPY_OCK.every(t => vzTiskZabrana(zak, ID[p], variantaZak(zak, ID[p]), t) === '')),
    Object.keys(ID).map(p => vzTiskZabrana(zak, ID[p], variantaZak(zak, ID[p]), 'nabidka')));
  test('IČO kanárků platná a jedinečná', new Set(Object.values(ZAKAZNICI).map(z => z.ico)).size === 3
    && Object.values(ZAKAZNICI).every(z => typeof icoPlatne !== 'function' || icoPlatne(z.ico)));

  /* ceny variant (kanárek ceny) — z pohledu vlastníka, v každém jazyce */
  for (const L of JAZYKY) {
    CENY[L] = {};
    const v3 = zak.varianty.find(v => vlastnikVarianty(zak, v.id) === 'D');
    for (const [p, id, v] of [['A', 'z1', variantaZak(zak, 'z1')], ['C', 'z3', variantaZak(zak, 'z3')], ['D', 'z1', v3]]) {
      const pz = vzTiskPohled(zak, id);
      const d = nabidkaData(pz, vzTiskVarianta(pz, v), J, L);
      CENY[L][p] = cislice(d.placeholders.CENA_BEZ_DPH);
    }
    const cv = Object.values(CENY[L]);
    test('cena varianty jako kanárek (' + L + '): V1 ' + CENY[L].A + ', V2 ' + CENY[L].C + ', V3 ' + CENY[L].D + ' — různé, dost dlouhé',
      cv.every(x => x.length >= 5) && cv.every((x, i) => cv.every((y, j) => i === j || x.indexOf(y) < 0)), CENY[L]);
  }

  /* --- pohledy --- */
  const pA = vzTiskPohled(zak, 'z1');
  test('pohled řídícího: bez dalsiZakaznici a vzRidici, s vzPohledZakaznika z1',
    pA && !('dalsiZakaznici' in pA) && !('vzRidici' in pA) && pA.vzPohledZakaznika && pA.vzPohledZakaznika.id === 'z1');
  test('vzTiskPohled neznámého zákazníka → null', vzTiskPohled(zak, 'z9') === null);
  let protokolNese = [];
  for (const p of Object.keys(ID)) {
    const pz = vzTiskPohled(zak, ID[p]);
    const pov = povoleneVar(zak, ID[p]);
    const bez = Object.assign({}, pz); delete bez.protokol;
    const c = cizi(kanarky(JSON.stringify(bez), 'cz'), p, pov);
    test('JSON pohledu ' + p + ' (bez protokolu) nenese kanárky jiných zákazníků ani cizích variant', !c.length, c.map(popisNalezu));
    const maji = pz.varianty.map(v => vlastnikVarianty(zak, v.id)).sort().join('');
    test('pohled ' + p + ' má právě varianty ' + pov.split('').sort().join('') + ' (řídící + volné; nikdy cizí vlastní)',
      maji === pov.split('').sort().join(''), maji);
    const cp = cizi(kanarky(JSON.stringify(pz.protokol || []), 'cz'), p, pov);
    if (cp.length) protokolNese.push(p + ': ' + Array.from(new Set(cp.map(popisNalezu))).join(', '));
  }
  if (protokolNese.length)
    info('ZJIŠTĚNÍ: pohled přenáší protokol zakázky (mělká kopie) s údaji jiných zákazníků — ' + protokolNese.join(' | ')
      + '. Dokumenty ho netisknou (hlídá sada níže); rozhodne hlavní sezení.');
  else info('pohled protokol s cizími údaji nenese');

  /* --- hlavní běh: dokument × zákazník × jazyk --- */
  const pokryto = new Set();
  const v2Unik = { vystupu: 0, nalezy: [] };   // název / cena vlastní varianty C ve výstupech A a B
  for (const p of Object.keys(ID)) {
    const id = ID[p];
    const videno = new Set();
    for (const [z, typy] of [[zak, ZAK_TYPY_OCK], [zakP, p === 'A' ? ZAK_TYPY_PROJ : []]]) {
      for (const L of JAZYKY) {
        const pz = vzTiskPohled(z, id);
        const vv = vzTiskVarianta(pz, variantaZak(z, id));
        const varPism = vlastnikVarianty(z, variantaZak(z, id).id);
        const res = await vystupy(pz, vv, L, typy);
        res.vystupy.forEach(o => pokryto.add(o.nazev.replace(/\/(cz|en|de|fr)/, '')));
        const pr = problemy(res, p, varPism, L, povoleneVar(z, id));
        if (p !== 'C') res.vystupy.forEach(o => {
          v2Unik.vystupu++;
          kanarky(o.text, L).filter(k => (k.druh === 'v' || k.druh === 'cena') && k.kdo === 'C')
            .forEach(k => v2Unik.nalezy.push(p + ' ' + o.nazev + ': ' + popisNalezu(k)));
        });
        pr.videno.forEach(x => videno.add(x));
        const stitek = p + ' (' + id + ')' + (z === zakP ? ' PROJ' : '') + ' ' + L;
        test(stitek + ': dokumenty vznikly bez chyby (' + res.vystupy.length + ' výstupů)', !res.chyby.length && res.vystupy.length >= (typy.length ? 8 : 3), res.chyby);
        test(stitek + ': žádný kanárek jiného zákazníka', !pr.unik.length, pr.unik);
        test(stitek + ': každý dokument nese vlastního objednatele', !pr.prazdne.length, pr.prazdne);
        /* čísla s písmenem */
        if (z === zak) {
          const c = res.cisla.nabidka || '', f = res.cisla['nabidka:soubor'] || '', fs2 = res.cisla['sod:soubor'] || '';
          const fk = res.cisla['kryci_bo:soubor'] || '';
          const ocek = ZAKAZNICI[p].pismeno;
          const okC = ocek ? new RegExp('-' + ocek + '$').test(c) : !/-[B-Z]$/.test(c);
          const okF = ocek ? [f, fs2, fk].every(x => norm(x).indexOf('9940') >= 0 && new RegExp('9940(\\.\\d+|_\\d+)?[-_]' + ocek + '(?![a-z])', 'i').test(x))
            : [f, fs2, fk].every(x => !/9940(\.\d+|_\d+)?[-_][B-Z](?![a-z])/i.test(x));
          test(stitek + ': číslo nabídky ' + JSON.stringify(c) + (ocek ? ' nese -' + ocek : ' bez písmene'), c && okC, c);
          test(stitek + ': názvy souborů (CN, SoD, krycí list) ' + (ocek ? 'nesou ' + ocek : 'bez písmene'), okF, [f, fs2, fk]);
        }
      }
    }
    /* pruh tisku */
    const pruh = vzTiskPruhText(zak, id);
    const cp = cizi(kanarky(pruh, 'cz'), p, povoleneVar(zak, id));
    test(p + ': pruh tisku jmenuje jen jeho (' + pruh + ')', pruh && !cp.length && norm(pruh).indexOf(norm(tokZ(p, 1))) >= 0, cp.map(popisNalezu));
    /* kanárky nejsou prázdné: každé pole zákazníka (a cena varianty) se aspoň jednou ukázalo */
    /* fakturyTel netiskne žádný dokument (krycí list má pole jen s `bind`, bez
     * předvyplnění — viz INFO); v.zakaznik dalšího zákazníka přepisuje
     * vzTiskPohled jeho názvem, tiskne se jen u řídícího. */
    const NETISK = ['fakturyTel'];
    const pozadovane = [1, 2, 3, 4, 5].concat(VZ_ZASTUPCI_POLE.map((x, i) => 6 + i).filter(i => NETISK.indexOf(POLE_NAZEV[i]) < 0),
      p === 'A' ? [21] : [], [99]);
    const chybi = pozadovane.filter(x => !videno.has(x));
    test(p + ': každý kanárek zákazníka se objevil aspoň v jednom jeho dokumentu (jinak je prázdný)', !chybi.length,
      chybi.map(x => (x === 99 ? 'cena varianty' : POLE_NAZEV[x])));
    const nikde = VZ_ZASTUPCI_POLE.map((x, i) => 6 + i).concat([21]).filter(x => !videno.has(x)).map(x => POLE_NAZEV[x])
      .concat([16, 17, 18].filter(x => !videno.has('v' + x)).map(x => ['v.nazev', 'v.pozn', 'ruční položka'][x - 16]));
    if (nikde.length) info(p + ': netiskne se nikde (kanárek nelze ověřit, únik ani nenastane): ' + nikde.join(', '));
  }
  info('pokryté výstupy: ' + Array.from(pokryto).sort().join('; '));
  test('název, poznámka, položka ani cena vlastní varianty C nejsou v žádném výstupu řídícího A ani B ('
    + v2Unik.vystupu + ' výstupů)', v2Unik.vystupu > 100 && !v2Unik.nalezy.length, v2Unik.nalezy.slice(0, 10));

  /* --- řídící tiskne VOLNOU variantu V3 (revize E0 N3): smí, ale bez C --- */
  {
    const v3 = zak.varianty.find(v => vlastnikVarianty(zak, v.id) === 'D');
    test('volná V3: zábrana pro řídícího prázdná, pro B a C nenulová', vzTiskZabrana(zak, 'z1', v3, 'nabidka') === ''
      && !!vzTiskZabrana(zak, 'z2', v3, 'nabidka') && !!vzTiskZabrana(zak, 'z3', v3, 'nabidka'));
    for (const L of ['cz', 'en']) {
      const pz = vzTiskPohled(zak, 'z1');
      const res = await vystupy(pz, vzTiskVarianta(pz, v3), L, ZAK_TYPY_OCK);
      const pr = problemy(res, 'A', 'D', L, 'AD');
      test('A tiskne volnou V3 ' + L + ': dokumenty vznikly, žádný cizí kanárek, cena V3 v dokumentu',
        !res.chyby.length && !pr.unik.length && !pr.prazdne.length && pr.videno.has(99), [res.chyby, pr.unik, pr.prazdne]);
    }
  }

  /* --- PROJ pro dalšího zákazníka: zábrana R5 --- */
  for (const p of ['B', 'C']) {
    const id = ID[p];
    const vv = variantaZak(zakP, id);
    const hl = ZAK_TYPY_PROJ.map(t => [t, vzTiskZabrana(zakP, id, vv, t)]);
    test(p + ': dokumenty PROJ zablokované (vzTiskZabrana R5) — ' + ZAK_TYPY_PROJ.join(', '), hl.every(x => x[1]), hl.filter(x => !x[1]).map(x => x[0]));
    test(p + ': hláška R5 jmenuje jen jeho', hl.every(x => !cizi(kanarky(x[1], 'cz'), p, vlastnikVarianty(zakP, vv.id)).length));
  }
  test('A: dokumenty PROJ pro řídícího bez zábrany', ZAK_TYPY_PROJ.every(t => vzTiskZabrana(zakP, 'z1', variantaZak(zakP, 'z1'), t) === ''));
  test('cizí varianta se pro zákazníka netiskne (B ← V2, C ← V1)',
    !!vzTiskZabrana(zak, 'z2', variantaZak(zak, 'z3'), 'nabidka') && !!vzTiskZabrana(zak, 'z3', zak.varianty[0], 'nabidka')
    && vzTiskVarianta(vzTiskPohled(zak, 'z2'), variantaZak(zak, 'z3')) === null);

  /* --- ZAMČENÁ SDÍLENÁ VARIANTA: nabídka V1 odešla řídícímu (první tisk
   * zmrazí předvyplněné pole krycího listu, P9.5 — jako zamek_ui.js, ale
   * z pohledu A), potom se z téže V1 tiskne pro B. Zmrazené hodnoty jsou
   * data VARIANTY — nesmí do dokumentu B přinést údaje A. --- */
  {
    const zz = zakazka(false);
    const v1 = zz.varianty[0];
    const pA2 = vzTiskPohled(zz, 'z1');
    const vA = vzTiskVarianta(pA2, v1);
    kryciZmrazPodminky(pA2, vA, J);
    kryciProjZmrazPodminky(pA2, vA);
    zamkniVariantu(v1, { typ: 'nabidka', kdo: PEVNE.kdo, kdy: PEVNE.kdy, cislo: variantaCislo(pA2, vA),
      vysledek: zamekVysledekSpocti(v1, J, 'unik'), snimek: zamekSnimekSpocti(v1) });
    test('zamčená V1: zámek a zmrazení proběhly (data.kryci.zmrazeno nese A)', variantaUzamcena(v1)
      && JSON.stringify(v1.data.kryci.zmrazeno || {}).indexOf(tokZ('A', 1)) >= 0, v1.data.kryci.zmrazeno);
    for (const L of JAZYKY) {
      const pB = vzTiskPohled(zz, 'z2');
      const res = await vystupy(pB, vzTiskVarianta(pB, v1), L, ZAK_TYPY_OCK);
      const pr = problemy(res, 'B', 'A', L);
      test('zamčená sdílená V1, tisk pro B ' + L + ': dokumenty vznikly', !res.chyby.length, res.chyby);
      test('zamčená sdílená V1, tisk pro B ' + L + ': žádný kanárek A (zmrazený krycí list)', !pr.unik.length, pr.unik);
    }
    /* RAZÍTKA OSTATNÍCH ZÁKAZNÍKŮ ve sdílené variantě (koordinace po revizi
     * E0: v pohledu zůstávají). E3 do zamek.tisky[] píše snímek adresáta
     * { id, pismeno, cislo, objednatel, ico } — dokument A ani B je nesmí
     * vytisknout. Snímky nesou kanárky B a C. */
    const snimek = (zk) => ({ id: zk.id, pismeno: zk.pismeno, cislo: '2026 - OPR - CN - 9940-' + (zk.pismeno || 'X'),
      objednatel: zk.hlavicka.objednatel, ico: zk.hlavicka.ico });
    const zkB = vzZakaznik(zz, 'z2'), zkC = vzZakaznik(zz, 'z3');
    v1.zamek.tisky = (v1.zamek.tisky || []).concat([
      { typ: 'nabidka', kdo: PEVNE.kdo, kdy: PEVNE.kdy, zakaznik: snimek(zkB) },
      { typ: 'nabidka', kdo: PEVNE.kdo, kdy: PEVNE.kdy, zakaznik: snimek(zkC) }]);
    for (const [p, id, cizi] of [['A', 'z1', ['B', 'C']], ['B', 'z2', ['C']]]) {
      for (const L of ['cz', 'en']) {
        const pz = vzTiskPohled(zz, id);
        const res = await vystupy(pz, vzTiskVarianta(pz, v1), L, ZAK_TYPY_OCK);
        const pr = problemy(res, p, 'A', L, povoleneVar(zz, id));
        test('razítka B a C ve sdílené V1, tisk pro ' + p + ' ' + L + ': dokumenty vznikly a žádný cizí kanárek (' + cizi.join(', ') + ')',
          !res.chyby.length && !pr.unik.length, { chyby: res.chyby, unik: pr.unik });
      }
    }
    /* E3 (#602) DOTISK: vzTiskPohled(zak, id, varianta) bere název a IČO
     * adresáta ze snímku JEHO razítka — dokumenty A po tisku B nesmí nést
     * snímek B a naopak (ani přes D3, ani přes dotisk). Razítko A se snímkem
     * A (kanárky A), razítko B se snímkem B. */
    v1.zamek.tisky.push({ typ: 'nabidka', kdo: PEVNE.kdo, kdy: '2026-11-16T11:00:00.000Z', zakaznik: vzRazitkoSnimek(zz, 'z1', v1) });
    v1.zamek.tisky.push({ typ: 'nabidka', kdo: PEVNE.kdo, kdy: '2026-11-16T12:00:00.000Z', zakaznik: vzRazitkoSnimek(zz, 'z2', v1) });
    for (const [p, id] of [['A', 'z1'], ['B', 'z2']]) {
      const snap = vzRazitkoDotisku(v1, id);
      test('dotisk V1 pro ' + p + ': razítko se snímkem ' + p + ' existuje', snap && snap.id === id && norm(snap.objednatel).indexOf(norm(tokZ(p, 1))) >= 0, snap);
      for (const L of ['cz', 'en']) {
        const pz = vzTiskPohled(zz, id, v1);
        const res = await vystupy(pz, vzTiskVarianta(pz, v1), L, ZAK_TYPY_OCK);
        /* Zámek V1 v pohledu (razítka): snímek jiného zákazníka nesmí nést. Celý
         * JSON pohledu ani celý zámek ne — data.kryci.zmrazeno a zamek.snimek
         * sdílené V1 nesou A z prvního tisku (data varianty, dokumenty B je
         * netisknou — hlídá blok výš). */
        const zv = (pz.varianty.find(x => x.id === v1.id) || {}).zamek;
        res.vystupy.push({ nazev: 'razítka tisků V1 v pohledu', text: JSON.stringify(zv && zv.tisky), vlastni: false });
        const pr = problemy(res, p, 'A', L, povoleneVar(zz, id));
        test('dotisk V1 pro ' + p + ' ' + L + ' (vzTiskPohled s variantou): dokumenty vznikly, nesou vlastního objednatele, žádný snímek '
          + (p === 'A' ? 'B ani C' : 'A ani C'), !res.chyby.length && !pr.unik.length && !pr.prazdne.length,
          { chyby: res.chyby, unik: pr.unik, prazdne: pr.prazdne });
        test('dotisk V1 pro ' + p + ' ' + L + ': zámek v pohledu nese jen razítka ' + p,
          zv && zv.tisky.every(t => !t.zakaznik || t.zakaznik.id === id) && zv.tisky.some(t => t.zakaznik && t.zakaznik.id === id), zv && zv.tisky);
      }
    }
  }

  /* --- E3 (#602): VARIANTA ODSTRANĚNÉHO ZÁKAZNÍKA. Vlastní V2 zákazníka C
   * odešla jemu (razítko se snímkem C), administrátor C odstranil — V2
   * zůstala jako doklad a je volná (tisknout ji smí řídící). Dokumenty
   * řídícího A z V2 nesmí nést název ani IČO C (snímek z razítka, ani
   * v.zakaznik se jménem C). Kanárky varianty V2 (název, cena) smí — tiskne
   * se V2. --- */
  {
    const zr = zakazka(false);
    const v2 = variantaZak(zr, 'z3');
    /* Volný text „zákazník" vlastní varianty jmenuje C (obchodník ho vepsal) —
     * po odstranění C ho tiskový pohled řídícího musí poznat podle snímku
     * v razítku (text bez jména C detektor ani jádro poznat neumí). */
    v2.zakaznik = hlavicka(ZAKAZNICI.C).objednatel;
    zamkniVariantu(v2, { typ: 'nabidka', kdo: PEVNE.kdo, kdy: PEVNE.kdy, cislo: variantaCislo(zr, v2),
      vysledek: zamekVysledekSpocti(v2, J, 'unik'), snimek: zamekSnimekSpocti(v2), zakaznik: vzRazitkoSnimek(zr, 'z3', v2) });
    const o = vzOdstran(zr, 'z3', { smazatVariantu: true });
    test('odstraněný C: varianta V2 (zamčená, razítko C) zůstala, C v zakázce není, řídící smí V2 tisknout',
      o.ok && !o.smazanaVarianta && !vzZakaznik(zr, 'z3') && vzTiskZabrana(zr, 'z1', v2, 'nabidka') === ''
      && norm(JSON.stringify(v2.zamek.tisky)).indexOf(norm(tokZ('C', 1))) >= 0, { o, zab: vzTiskZabrana(zr, 'z1', v2, 'nabidka') });
    for (const L of ['cz', 'en']) {
      for (const [stitek, pz] of [['tisk', vzTiskPohled(zr, 'z1')], ['dotisk', vzTiskPohled(zr, 'z1', v2)]]) {
        const res = await vystupy(pz, vzTiskVarianta(pz, v2), L, ZAK_TYPY_OCK);
        res.vystupy.push({ nazev: 'JSON pohledu (bez protokolu)', text: JSON.stringify(Object.assign({}, pz, { protokol: undefined })), vlastni: true });
        const pr = problemy(res, 'A', 'C', L, 'ACD');
        test('odstraněný C, ' + stitek + ' V2 řídícím A ' + L + ': dokumenty vznikly, nesou A, žádný údaj C (snímek razítka, v.zakaznik)',
          !res.chyby.length && !pr.unik.length && !pr.prazdne.length, { chyby: res.chyby, unik: pr.unik, prazdne: pr.prazdne });
      }
    }
  }

  /* --- VÝMĚNA ŘÍDÍCÍHO (vzVymenRidiciho na B), kanárky A i v projHlavicka.
   * Po výměně nesmí v dokumentech nového řídícího B ani ostatních být údaje
   * původního řídícího A (ani hlavička PROJ). Když únik zmizí, jakmile se
   * projHlavicka srovná s hlavičkou nového řídícího, jde o známou chybu E0 N1
   * (výměna nepřepisuje projHlavicka) — hlásí se INFO, ne FAIL. --- */
  {
    const behVymeny = async (srovnatProj, srovnatVolne) => {
      const nalezy = [];
      for (const proj of [false, true]) {
        const z = zakazka(proj);
        if (!proj) Object.assign(z.projHlavicka, { objednatel: z.objednatel, kontakt: z.kontakt, ico: z.ico, adresaObjednatele: z.adresaObjednatele });
        const r = vzVymenRidiciho(z, 'z2');
        if (!r.ok) { nalezy.push('vzVymenRidiciho: ' + r.chyba); continue; }
        if (vzRidiciId(z) !== 'z2') nalezy.push('řídící po výměně není z2');
        if (srovnatProj) ['objednatel', 'kontakt', 'ico', 'adresaObjednatele'].forEach(k => { z.projHlavicka[k] = z[k]; });
        /* v.zakaznik sdílené V1 jmenuje A → zábrana pro nového řídícího B
         * (sdílený text); obchodník ho přepíše — teprve pak se tiskne. */
        const v1 = z.varianty[0];
        /* v.zakaznik se jménem A: tiskový pohled B ho přepíše jménem B (VZ-E2). */
        if (!srovnatProj && !proj) { const x = vzTiskVarianta(vzTiskPohled(z, 'z2'), v1);
          if (!x || x.zakaznik !== z.objednatel) nalezy.push('pohled B: v.zakaznik V1 se jménem A nepřepsán jménem B'); }
        v1.zakaznik = z.objednatel + ' ' + tokZ('B', 21);
        if (srovnatVolne) z.varianty.forEach(v => { if (vlastnikVarianty(z, v.id) === 'D') v.zakaznik = z.objednatel; });
        for (const [p, id] of [['A', 'z1'], ['B', 'z2'], ['C', 'z3']]) {
          const typy = proj ? (id === 'z2' ? ZAK_TYPY_PROJ : []) : ZAK_TYPY_OCK;
          for (const t of typy) { const zb = vzTiskZabrana(z, id, variantaZak(z, id), t); if (zb) nalezy.push(p + ' ' + t + ' zábrana: ' + zb.slice(0, 160)); }
          for (const L of (proj ? JAZYKY : ['cz', 'en'])) {
            const pz = vzTiskPohled(z, id);
            const vv = vzTiskVarianta(pz, variantaZak(z, id));
            const res = await vystupy(pz, vv, L, typy);
            const bez = Object.assign({}, pz); delete bez.protokol;
            res.vystupy.push({ nazev: 'JSON pohledu', text: JSON.stringify(bez), vlastni: true });
            const pov = povoleneVar(z, id);
            const pr = problemy(res, p, vlastnikVarianty(z, vv.id), L, pov);
            const st = 'po výměně ' + (proj ? 'PROJ ' : 'OCK ') + p + ' (' + id + ') ' + L;
            res.chyby.forEach(c => nalezy.push(st + ' chyba: ' + c));
            pr.unik.forEach(u => nalezy.push(st + ' ' + u.nazev + ': ' + u.cizi.join(', ')));
            pr.prazdne.forEach(n => nalezy.push(st + ' bez vlastního objednatele: ' + n));
          }
        }
      }
      return nalezy;
    };
    const dnes = await behVymeny(false, false);
    const sProj = await behVymeny(true, false);
    const sOboji = await behVymeny(true, true);
    const n1 = dnes.filter(x => sProj.indexOf(x) < 0);
    const volne = sProj.filter(x => sOboji.indexOf(x) < 0);
    /* E0 N1 opraveno (vzProjFirma, integrace 76ae631) — teď ostrý test. */
    test('výměna řídícího (B): projHlavicka nese nového řídícího (E0 N1) — žádný nález navíc oproti srovnané projHlavicka',
      !n1.length, n1.slice(0, 6));
    /* Volná varianta (klon V1) nese v.zakaznik s názvem PŮVODNÍHO řídícího;
     * nový řídící ji vidí v pohledu a porovnání, zábrana tisku kontroluje jen
     * tištěnou variantu. */
    test('výměna řídícího (B): volná varianta nenese do porovnání / pohledu nového řídícího v.zakaznik původního řídícího',
      !volne.length, volne.slice(0, 6));
    test('výměna řídícího (B): jinak žádný únik ani chyba v dokumentech všech zákazníků (OCK cz/en, PROJ cz/en/de/fr)',
      !sOboji.length, sOboji.slice(0, 12));
  }

  /* --- POJISTKA P1: identita (celá zakázka) místo pohledu --- */
  {
    const vB = variantaZak(zak, 'z2');
    const res = await vystupy(zak, vB, 'cz', ZAK_TYPY_OCK);
    test('pojistka P1a: tisk z celé zakázky — dokumentVygeneruj hází (vzTiskHlidej) u všech typů',
      ZAK_TYPY_OCK.every(t => res.chyby.some(c => c.indexOf(t + '/cz') === 0 && /jen z pohledu/.test(c))), res.chyby);
    const puv = global.vzTiskHlidej;
    global.vzTiskHlidej = () => {};
    let pr;
    try { pr = problemy(await vystupy(zak, vB, 'cz', ZAK_TYPY_OCK), 'B', 'A', 'cz'); } finally { global.vzTiskHlidej = puv; }
    test('pojistka P1b: s vypnutým hlídačem dostane B údaje A — detektor úniku zabírá',
      pr.unik.length >= ZAK_TYPY_OCK.length && pr.unik.some(u => u.cizi.some(x => /zákazník A \/ objednatel/.test(x))), pr.unik.map(u => u.nazev));
  }
  /* --- POJISTKA P2: pokažený pohled (hlavička nepřepsaná) --- */
  {
    const spatny = Object.assign({}, zak);
    delete spatny.dalsiZakaznici; delete spatny.vzRidici;
    spatny.vzPohledZakaznika = { id: 'z2', pismeno: 'B' };
    spatny.varianty = [zak.varianty[0]];
    const pr = problemy(await vystupy(spatny, zak.varianty[0], 'cz', ZAK_TYPY_OCK), 'B', 'A', 'cz');
    test('pojistka P2: pokažený pohled → detektor najde kanárek A v dokumentu B (Word, data, náhled)',
      ['nabidka/cz Word XML', 'nabidka/cz náhled HTML (nabidkaNahledSekce)', 'kryci_bo/cz Word XML', 'sod/cz Word XML']
        .every(n => pr.unik.some(u => u.nazev === n)), pr.unik.map(u => u.nazev));
    const bezVz = JSON.parse(JSON.stringify(spatny)); delete bezVz.protokol;
    test('pojistka P2: JSON pokaženého pohledu nese cizí kanárky (detektor JSON zabírá)',
      cizi(kanarky(JSON.stringify(bezVz), 'cz'), 'B', 'A').length > 0);
  }
  /* --- POJISTKA P3: detektor ceny a varianty --- */
  {
    const pr = problemy(await vystupy(vzTiskPohled(zak, 'z1'), zak.varianty[0], 'cz', ['nabidka']), 'C', 'C', 'cz');
    test('pojistka P3: dokument V1 čtený jako C → najde cenu i název varianty V1 a zákazníka A',
      pr.unik.some(u => u.cizi.some(x => /^cena varianty A/.test(x))) && pr.unik.some(u => u.cizi.some(x => /^varianta A/.test(x))),
      pr.unik.slice(0, 3));
  }

  console.log('\nDoba běhu: ' + ((Date.now() - T0) / 1000).toFixed(1) + ' s');
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
}

hlavni().catch(e => { console.error(e); process.exit(1); });
