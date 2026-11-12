/* VS #570 / E5 (#595) — KONTROLY PŘED NABÍDKOU U VÍC ŠACHET, 10. 11. 2026.
 *
 *  A) pravidla šachty (rozměry, nástupiště, světlíky, můstky…) se ptají
 *     KAŽDÉ šachty jejím zadáním a výsledkem; nález nese název šachty, jeden
 *     kód za všechny šachty; zábrana šachty 2+ zastaví dokumenty OCK;
 *  B) bez ctx.ock (server, sluzba.js) se varianta najde podle zadání;
 *  C) záporná položka v šachtě 2+;
 *  D) Model 1 + víc šachet = zábrana (vsModel1);
 *  E) šablona CN bez rozpisu šachet (v15/v16) = zábrana jen Wordu nabídky
 *     (vsSablona), v17 / neznámá / jedna šachta mlčí;
 *  F) jedna šachta beze změny; zamčená varianta čte výsledky ze zámku.
 * Pojistka: na 079cfc6 sada padá (vada šachty B se nepozná, pravidla
 * vsModel1 / vsSablona neexistují) — viz zpráva commitu.
 * Spuštění: node src/test_vs_kontroly.js */
'use strict';
const path = require('path');
const fs = require('fs');
const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js', 'dokumenty.js',
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

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 400)); } };
const kop = x => JSON.parse(JSON.stringify(x));
const kc = t => +String(t).replace(/[^\d,-]/g, '').replace(',', '.');

const SKLADBA = { mustekRamBmKc: 10000, mustekPodlahaPlechM2Kc: 1000, mustekPodlahaPororostM2Kc: 1100, mustekPodlahaVanaM2Kc: 1200,
  mustekZabradliKovBmKc: 2000, mustekZabradliSkloBmKc: 5000, mustekKotveniDeskaKc: 3000, mustekKotveniSloupKc: 3100,
  mustekKotveniKonzolaKc: 3200, mustekZabradliSkloMontazHodBm: 1 };
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
const MUSTEK = { ks: 2, sirkaMm: 1600, delkaMm: 1200, podlaha: 'plech', zabradli: 'kov', zabradliStrany: 2, sloupyKs: 0, sloupVyskaM: 0 };

function zadani(u) { return Object.assign(kop(DEFAULT_ZADANI), ZAD, u || {}); }
/* Zakázka: Výtah A (exteriér, můstky) + Výtah B (interiér, ATYP, 2 ks). */
function zakazka(vs, uprava) {
  const zak = novaZakazka();
  zak.cislo = '2026-OPR-CN-9595'; zak.nazevAkce = 'VS E5 výstupy'; zak.objednatel = 'Zkušební zákazník s.r.o.';
  const v = zak.varianty[0];
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky(), SKLADBA, { kurzEurKc: 25 });
  v.data.ock.fixes = true;
  v.data.ock.zadani = zadani({ typSachty: 'exteriérová', mustky: [kop(MUSTEK)], priplatkyVynechat: ['vsgFolie', 'skn', 'madlaBoky'] });
  if (vs) {
    v.data.ock.nazev = 'Výtah A';
    v.data.ock.dalsi = [{ id: 's_b', nazev: 'Výtah B', ks: 2,
      zadani: zadani({ typSachty: 'interiérová', zdvih: 17.325, sirka: 2.4, atyp: true, profily: kop(PROFILY_VYCHOZI['interiérová']),
        priplatkyVynechat: ['vsgFolie', 'skn'] }) }];
  }
  if (uprava) uprava(zak, v);
  return { zak, v };
}
function ctx(zak, v, s) {
  const d = v.data;
  const c = { zadani: d.ock.zadani, vysledek: vypocetZ(v, J), cenik: d.cenik, cenikProj: d.proj ? d.proj.cenik : null,
    projZadani: d.proj ? d.proj.zadani : null, projVysledek: null, sleva: d.sleva || null, nast: null, zak, zaokr: d.zaokr || null, jekly: J };
  if (!s || s.ock !== false) c.ock = d.ock;
  return Object.assign(c, (s && s.navic) || {});
}
const nal = (k, kod) => k.nalezy.find(n => n.kod === kod);

/* ---------- A) pravidla šachty po šachtách ---------- */
{
  const { zak, v } = zakazka(true, (z, vv) => { vv.data.ock.dalsi[0].zadani.sirka = 0; });
  const k = kontrolyProved(ctx(zak, v));
  const n = nal(k, 'rozmery');
  test('A rozměr 0 jen u šachty B: nález „Výtah B: …", zábrana', n && /^Výtah B: /.test(n.text) && !/Výtah A/.test(n.text) && n.uroven === KONTROLY_UROVEN_ZABRANA, n);
  test('A zábrana šachty B zastaví krycí list, SoD i nabídku OCK', !!kontrolyZabranaDokumentu(k, 'kryci_bo') && !!kontrolyZabranaDokumentu(k, 'sod')
    && !!kontrolyZabranaDokumentu(k, 'nabidka') && !kontrolyZabranaDokumentu(k, 'nabidkaProj'));
  test('A jeden kód za všechny šachty (kody jedinečné)', new Set(k.kody).size === k.kody.length, k.kody);
  /* obě šachty vadné → jedna věta s oběma názvy */
  const { zak: z2, v: v2 } = zakazka(true, (z, vv) => { vv.data.ock.zadani.hloubka = 0; vv.data.ock.dalsi[0].zadani.sirka = 0; });
  const n2 = nal(kontrolyProved(ctx(z2, v2)), 'rozmery');
  test('A obě šachty vadné: jeden nález, obě jména', n2 && /^Výtah A: .*Výtah B: /.test(n2.text), n2 && n2.text);
  /* dnešní kód (bez kontrol po šachtách) by šachtu B neviděl */
  const bez = kontrolyProved(Object.assign(ctx(zak, v, { ock: false }), { zak: null }));
  test('A kontrola testu: bez dat šachet (jen šachta 1) se vada B nepozná', !nal(bez, 'rozmery'), bez.kody);
}

/* ---------- B) server bez ctx.ock: varianta se najde v zakázce ---------- */
{
  const { zak, v } = zakazka(true, (z, vv) => { vv.data.ock.dalsi[0].zadani.nastupiste = 1; });
  const k = kontrolyProved(ctx(zak, v, { ock: false }));
  const n = nal(k, 'stanice');
  test('B bez ctx.ock (sluzba.js): šachta B se zkontroluje podle zakázky', n && /^Výtah B: /.test(n.text), k.kody);
}

/* ---------- C) záporná položka v šachtě 2 ---------- */
{
  const { zak, v } = zakazka(true, (z, vv) => { vv.data.ock.dalsi[0].zadani.vlastniPolozky.hrubaOck = [{ nazev: 'Mínus', mnozstvi: -1, cena: 1000 }]; });
  const n = nal(kontrolyProved(ctx(zak, v)), 'zapornaPolozka');
  test('C záporná položka v šachtě B: zábrana s názvem šachty, strana OCK', n && /Výtah B: /.test(n.text) && n.uroven === KONTROLY_UROVEN_ZABRANA
    && JSON.stringify(n.strany) === '["ock"]', n);
}

/* ---------- D) Model 1 a víc šachet ---------- */
{
  const { zak, v } = zakazka(true, (z, vv) => { vv.data.ock.fixes = false; });
  const k = kontrolyProved(ctx(zak, v));
  const n = nal(k, 'vsModel1');
  test('D Model 1 + víc šachet: zábrana dokumentů OCK', n && n.uroven === KONTROLY_UROVEN_ZABRANA && /2 varianty šachet, celkem 3 ks/.test(n.text)
    && !!kontrolyZabranaDokumentu(k, 'nabidka') && !!kontrolyZabranaDokumentu(k, 'kryci_techdata'), n);
  const { zak: z2, v: v2 } = zakazka(true);
  test('D Model 2: bez vsModel1', !nal(kontrolyProved(ctx(z2, v2)), 'vsModel1'));
  const { zak: z3, v: v3 } = zakazka(false, (z, vv) => { vv.data.ock.fixes = false; });
  test('D jedna šachta v Modelu 1: bez vsModel1', !nal(kontrolyProved(ctx(z3, v3)), 'vsModel1'));
}

/* ---------- E) šablona nabídky bez rozpisu šachet (v15/v16) ---------- */
{
  const { zak, v } = zakazka(true);
  const sab = sym => ({ navic: { sablonaNabidka: { typ: 'nabidka', verze: 16, nazev: 'CN v16', symboly: sym } } });
  const k16 = kontrolyProved(ctx(zak, v, sab(['CENA_BEZ_DPH', 'SLEVA_KC', 'CENA_MUSTKY_BEZ_DPH'])));
  const n = nal(k16, 'vsSablona');
  test('E šablona v16 u víc šachet: zábrana jen Wordu nabídky OCK', n && n.uroven === KONTROLY_UROVEN_ZABRANA
    && !!kontrolyZabranaDokumentu(k16, 'nabidka') && !!kontrolyZabranaDokumentu(k16, 'nabidka_en')
    && !kontrolyZabranaDokumentu(k16, 'nabidkaTisk') && !kontrolyZabranaDokumentu(k16, 'sod') && !kontrolyZabranaDokumentu(k16, 'kryci_bo'), n);
  test('E text radí šablonu v17', n && /v17/.test(n.text) && /CN v16/.test(n.text));
  const k17 = kontrolyProved(ctx(zak, v, sab(['CENA_BEZ_DPH', 'SACHTA_NAZEV', 'SACHTA_KS', 'SACHTA_CENA_BEZ_DPH'])));
  test('E šablona se symboly SACHTA_* (v17): bez nálezu', !nal(k17, 'vsSablona'));
  test('E šablona neznámá: mlčí', !nal(kontrolyProved(ctx(zak, v)), 'vsSablona'));
  const { zak: z1, v: v1 } = zakazka(false);
  test('E jedna šachta se šablonou v16: bez nálezu', !nal(kontrolyProved(ctx(z1, v1, sab(['CENA_BEZ_DPH']))), 'vsSablona'));
}

/* ---------- F) jedna šachta beze změny, zamčená varianta ze zámku ---------- */
{
  const { zak, v } = zakazka(false, (z, vv) => { vv.data.ock.zadani.sirka = 0; });
  const a = kontrolyProved(ctx(zak, v)), b = kontrolyProved(ctx(zak, v, { ock: false }));
  test('F jedna šachta: s ctx.ock i bez něj totéž', JSON.stringify(a) === JSON.stringify(b) && /^V zadání/.test(nal(a, 'rozmery').text));
  /* zamčená varianta: kontroly z výsledku zámku (sachty[]), nic se nepřepočítává */
  const { zak: z2, v: v2 } = zakazka(true);
  const vv = kop(v2);
  vv.zamek = { zamceno: true, vysledek: JSON.parse(JSON.stringify(zamekVysledekSpocti(vv, J, 't'))) };
  const c = ctx(z2, vv);
  const ock = kontrolyVsOck(c);
  const p = kontrolyVsPriprav(c, ock);
  test('F zamčená: součet i výsledky šachet ze zámku', p.soucet === c.vysledek && p.sachty[1].vysl === c.vysledek.sachty[1].vysl && p.sachty[1].nazev === 'Výtah B');
  test('F jen projekce: kontroly po šachtách mlčí', kontrolyVsOck(Object.assign({}, c, { jenProj: true })) === null);
}

/* ---------- G) smlouva o dílo: šablona bez šachet a nevyplněná místa (C2 #583, C3 #584) ---------- */
{
  const { zak, v } = zakazka(true);
  const sab = sym => ({ navic: { sablonaSod: { typ: 'sod', verze: 4, nazev: 'SoD realizace v4', symboly: sym } } });
  const k4 = kontrolyProved(ctx(zak, v, sab(['CENA_BEZ_DPH', 'SOD_PRIPLATKY_OBJEDNANE'])));
  const n = nal(k4, 'vsSablonaSod');
  test('G víc šachet + šablona SoD v4: upozornění (ne zábrana), text = SOD_SACHTY_BEZ_SABLONY', n && n.uroven === KONTROLY_UROVEN
    && n.text.indexOf(SOD_SACHTY_BEZ_SABLONY) === 0 && !kontrolyZabranaDokumentu(k4, 'sod') && !kontrolyZabranaDokumentu(k4, 'nabidka'), n);
  test('G vsSablonaSod: pravidlo neumí zábranu (zabranaMozna ne)', !kontrolyPravidla().find(p => p.kod === 'vsSablonaSod').zabranaMozna);
  test('G šablona SoD v5 (SACHTY_SOD_PREDMET): bez nálezu', !nal(kontrolyProved(ctx(zak, v, sab(['CENA_BEZ_DPH', 'SACHTY_SOD_PREDMET', 'SACHTY_SOD_ROZPIS']))), 'vsSablonaSod'));
  test('G šablona SoD neznámá: mlčí', !nal(kontrolyProved(ctx(zak, v)), 'vsSablonaSod'));
  const { zak: z1, v: v1 } = zakazka(false);
  test('G jedna šachta se šablonou SoD v4: bez nálezu', !nal(kontrolyProved(ctx(z1, v1, sab(['CENA_BEZ_DPH']))), 'vsSablonaSod'));
  /* sodNevyplneno / sodProjNevyplneno */
  const nv = o => ({ navic: { sodNevyplneno: o } });
  const kn = kontrolyProved(ctx(zak, v, nv({ sod: ['OBJEDNATEL_ICO', 'SOD_TERMIN_MONTAZ_OD'], sodProj: ['SODP_SPRAVNI_POPLATKY'] })));
  const a = nal(kn, 'sodNevyplneno'), b = nal(kn, 'sodProjNevyplneno');
  test('G sodNevyplneno: upozornění vyjmenuje údaje lidsky, nikdy zábrana', a && a.uroven === KONTROLY_UROVEN
    && /IČO objednatele, termín montáže od/.test(a.text) && !/OBJEDNATEL_ICO/.test(a.text) && !kontrolyZabranaDokumentu(kn, 'sod'), a);
  test('G sodProjNevyplneno: upozornění, nikdy zábrana', b && b.uroven === KONTROLY_UROVEN && /správní poplatky/.test(b.text)
    && !kontrolyZabranaDokumentu(kn, 'sodProj'), b);
  test('G sodNevyplneno: bez informace / prázdný seznam mlčí', !nal(kontrolyProved(ctx(zak, v)), 'sodNevyplneno')
    && !nal(kontrolyProved(ctx(zak, v, nv({ sod: [] }))), 'sodNevyplneno') && !nal(kontrolyProved(ctx(zak, v, nv({ sod: null }))), 'sodNevyplneno'));
  test('G nová pravidla stojí za vsSablona na konci seznamu', kontrolyPravidla().map(p => p.kod).slice(-4).join() === 'vsSablona,vsSablonaSod,sodNevyplneno,sodProjNevyplneno');
}

console.log(ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
