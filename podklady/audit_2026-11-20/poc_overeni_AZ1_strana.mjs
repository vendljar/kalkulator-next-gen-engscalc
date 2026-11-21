/* Nezávislé ověření: příznaky strany jenProj / jenOck po zámku a po prodeji.
 * Paměťové úložiště, zkušební ceník, smyšlené údaje. Bez sítě.
 * Spuštění: node pokus_strana.mjs <kořen stromu s netlify/ a src/>
 * Výstup: jen HTTP kódy, pravda/nepravda a poměry — žádné částky. */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-overeni';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const R = (process.argv[2] || '/home/user/kalkulator-next-gen-engscalc').replace(/\/?$/, '/');
const { default: prihlaseni } = await import(R + 'netlify/functions/prihlaseni.mjs');
const { default: program } = await import(R + 'netlify/functions/program.mjs');
const { default: zakazky } = await import(R + 'netlify/functions/zakazky.mjs');
const { default: uzivatele } = await import(R + 'netlify/functions/uzivatele.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
const { JEKLY } = await jadro();
const G = globalThis;
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const zam = require(R + 'src/zamek.js');
const ZC = require(R + 'src/zkusebni_cenik.js');
let CS = null; try { CS = require(R + 'src/cenik_stari.js'); } catch (e) {}
let OBJ = null; try { OBJ = require(R + 'src/objednane.js'); } catch (e) {}

const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const get = (fn, url, cookie) => fn(new Request(url, { headers: cookie ? { cookie } : {} }));
const kopie = x => JSON.parse(JSON.stringify(x));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const uloz = async (zak, c, razitko) => { const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: razitko }, c); return { status: r.status, ...(await r.json()) }; };
const nacti = async (soubor, c) => (await (await get(zakazky, 'http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), c)).json()).zakazka;
const vypis = (n, r) => console.log(n + ' → HTTP ' + r.status + (r.status === 200 ? '' : '  [' + String(r.chyba || '').slice(0, 170) + ']') + (r.varovani ? '  VAROVÁNÍ: ' + String(r.varovani).slice(0, 120) : ''));

const MINM = +(process.env.MINM || 0);
const NASTSL = { minMarze: MINM, maxGlobalni: 1, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15, 'Administrátor': 1 } };
const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
const V1 = ZC.zkusebniCenik(); V1.profilasKgKc = 80;
const rp = await (await post(program, 'http://x/api/program', { cenik: V1, cenikProj: ZC.zkusebniCenikProj(), slevy: NASTSL, poznamka: 'overeni strana' }, cA)).json();
if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
for (const [email, role] of [['autor.strana@priklad.cz', 'Obchodník'], ['cizi.strana@priklad.cz', 'Obchodník']]) {
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email, jmeno: 'Test ' + email.split('.')[0], role, heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
}
const cO = await prihlas('autor.strana@priklad.cz', 'Heslo12345x');
const cC = await prihlas('cizi.strana@priklad.cz', 'Heslo12345x');
const platny = () => JSON.parse(pamet.get('program/db')).platny;
const ROZMERY = { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4, typSachty: 'exteriérová' };
const PROF = 'C.profilasKgKc';
let n = 7701;
function nova(nazev, cislo) {
  const z = zk.novaZakazka(); z.cislo = cislo || ('2026 - OPR - CN - ' + (n++)); z.nazevAkce = 'TEST strana ' + nazev;
  Object.assign(z.varianty[0].data.ock.zadani, ROZMERY);
  z.varianty[0].data.cenik = kopie(platny().cenik);
  z.varianty[0].data.proj.cenik = kopie(platny().cenikProj);
  if (CS && CS.cenikOznacJakoDnesni) CS.cenikOznacJakoDnesni(z.varianty[0].data, { verze: platny().verze });
  return z;
}
const d0 = z => z.varianty[0].data;
/* Ruční cena BEZ zdroje a BEZ potvrzení (výrazně jiná než ceník — smyšlená). */
const rucniBezZdroje = (z, h) => { d0(z).cenik.profilasKgKc = h;
  d0(z).rucniCeny = { [PROF]: { hodnota: h, dodavatel: '', cislo: '', datum: '', platnostDo: '', zaklad: null, potvrdil: null } }; return z; };
const zamkni = (z, typ) => { const v = z.varianty[0];
  zam.zamkniVariantu(v, { typ, kdy: new Date().toISOString(), kdo: 'Test', cislo: zam.variantaCislo(z, v),
    vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-overeni'),
    snimek: (typeof zam.zamekSnimekSpocti === 'function') ? zam.zamekSnimekSpocti(v) : null });
  return z; };
const dotisk = (z, typ) => { zam.zamkniVariantu(z.varianty[0], { typ, kdy: new Date().toISOString(), kdo: 'Test' }); return z; };
const DNES = OBJ && OBJ.objDnes ? OBJ.objDnes() : new Date().toISOString().slice(0, 10);
const prodej = z => { z.varianty[0].prodano = { datum: DNES }; return z; };
const imp = g => zk.importZakazka(kopie(g));
/* Co vidí controlling a zápis do Pipedrive — jen které strany a poměr hodnot. */
function dopad(zak) {
  const z = imp(zak), v = z.varianty[0];
  const out = { vedouci: G.zakazkaVedouciStrana ? G.zakazkaVedouciStrana(z) : '?', jenProj: !!z.jenProj, jenOck: !!z.jenOck };
  try { const e = G.ctrlExportVarianty(z, v, { jekly: JEKLY, povolitNeridici: true });
    out.ctrl = e.ok === false ? 'chyba: ' + e.chyba : 'strany=' + JSON.stringify((e.strany || (e.export && e.export.strany) || []).map(s => s.oblast));
    out._ctrlCena = e.ok === false ? null : (e.strany || (e.export && e.export.strany) || []).reduce((a, s) => a + ((s.cena && s.cena.cena) || 0), 0);
  } catch (e) { out.ctrl = 'výjimka ' + e.message; }
  try { const p = G.prodPdZapis ? G.prodPdZapis(z, v, JEKLY) : null;
    out.pd = p ? 'hodnota=' + JSON.stringify(p.hodnota.map(h => h.oblast)) + ' kryci=' + JSON.stringify(p.kryci.map(k => k.list)) : 'prodPdZapis není';
    out._pdKc = p ? p.hodnotaKc : null;
  } catch (e) { out.pd = 'výjimka ' + e.message; }
  return out;
}
const bezCisel = d => Object.fromEntries(Object.entries(d).filter(([k]) => k[0] !== '_'));
const pomer = (a, b) => (a && b) ? (b / a).toFixed(3) : String(b === a);

console.log('strom: ' + R + '   minMarze=' + MINM);
console.log('zakazkaVyrazenaStrana na serveru: ' + (typeof G.zakazkaVyrazenaStrana) + ', rucniCenyZamekProblem: ' + (typeof G.rucniCenyZamekProblem)
  + ', prodServer: ' + (typeof G.prodServer));
{ const pv = G.vypocetProj(d0(nova('x')).proj.zadani, platny().cenikProj);
  console.log('příprava: výchozí PROJ má kladnou cenu: ' + (pv && pv.souhrn && pv.souhrn.celkem > 0)); }

console.log('\n===== 0. SROVNÁVACÍ: přímý zámek OCK s nepotvrzenou ruční cenou bez zdroje =====');
{ const z = zamkni(rucniBezZdroje(nova('přímý zámek'), 5), 'nabidka');
  vypis('0a autor: přímý nový zámek OCK (nabidka), ruční cena bez zdroje a potvrzení', await uloz(z, cO)); }
{ const z = rucniBezZdroje(nova('přímé uložení'), 5);
  vypis('0b autor: pouhé uložení rozpracované (bez zámku) s toutéž ruční cenou', await uloz(z, cO)); }

console.log('\n===== 1. jenProj=true → zámek PROJ → vypnutí příznaku → OCK vede =====');
let S1 = null;
{ const z = rucniBezZdroje(nova('obchvat'), 5); z.jenProj = true; zamkni(z, 'nabidkaProj');
  const r = await uloz(z, cO); vypis('1a autor: nový zámek PROJ (nabidkaProj) s jenProj=true; OCK nese ruční cenu bez zdroje', r);
  if (r.status === 200) {
    let g = await nacti(r.soubor, cO);
    console.log('   uloženo: jenProj=' + g.jenProj + ', zámek=' + !!g.varianty[0].zamek.zamceno + ', ověření=' + (g.varianty[0].zamek.overeni && g.varianty[0].zamek.overeni.stav)
      + ', ruční cena potvrzena=' + !!(d0(g).rucniCeny && d0(g).rucniCeny[PROF] && d0(g).rucniCeny[PROF].potvrdil));
    const pred = dopad(g); console.log('   dopad PŘED: ' + JSON.stringify(bezCisel(pred)));
    const a = imp(g); a.jenProj = false;
    const r2 = await uloz(a, cO, g.uloRazitko); vypis('1b autor: uložení JEN se změnou jenProj true→false (zamčená varianta)', r2);
    g = await nacti(r.soubor, cO);
    const po = dopad(g); console.log('   uloženo jenProj=' + g.jenProj + '; dopad PO: ' + JSON.stringify(bezCisel(po)));
    const b = dotisk(imp(g), 'nabidka');
    const r3 = await uloz(b, cO, g.uloRazitko); vypis('1c autor: DOTISK dokumentu OCK (nabidka) do zámku PROJ po vypnutí příznaku', r3);
    g = await nacti(r.soubor, cO);
    console.log('   tisky v zámku: ' + JSON.stringify((g.varianty[0].zamek.tisky || []).map(t => t.typ)));
    const c = prodej(imp(g));
    const r4 = await uloz(c, cO, g.uloRazitko); vypis('1d autor: Prodáno nad touto variantou', r4);
    g = await nacti(r.soubor, cO);
    const pp = dopad(g); console.log('   prodáno=' + !!g.varianty[0].prodano + '; dopad PO PRODEJI: ' + JSON.stringify(bezCisel(pp)));
    console.log('   ruční cena v prodané nabídce stále nepotvrzená a bez zdroje: ' + (d0(g).rucniCeny[PROF].potvrdil === null && !d0(g).rucniCeny[PROF].dodavatel));
    S1 = { soubor: r.soubor };
    /* Poměr ceny OCK v controllingu proti téže zakázce s ceníkovou sazbou. */
    const cist = imp(g); const vv = kopie(cist.varianty[0]); delete vv.zamek; vv.data.cenik.profilasKgKc = platny().cenik.profilasKgKc;
    const rOck = G.vypocetOckDat ? G.vypocetOckDat(vv.data, JEKLY) : G.vypocet(vv.data.ock.zadani, vv.data.cenik, JEKLY, vv.data.ock.fixes);
    const zmr = cist.varianty[0].zamek.vysledek.ock;
    console.log('   základní cena OCK v prodané nabídce / cena z ceníkové sazby = ' + (zmr.souhrn.zakladCena / rOck.souhrn.zakladCena).toFixed(3));
  }
}

console.log('\n===== 2. CIZÍ obchodník (není autor) =====');
{ const z = nova('cizí'); z.jenProj = true; zamkni(z, 'nabidkaProj');
  const r = await uloz(z, cO); vypis('2a autor: zámek PROJ s jenProj=true (poctivá zakázka)', r);
  let g = await nacti(r.soubor, cC);
  const a = imp(g); a.jenProj = false;
  const r2 = await uloz(a, cC, g.uloRazitko); vypis('2b CIZÍ obchodník: změna jenProj true→false u cizí zamčené zakázky', r2);
  g = await nacti(r.soubor, cC); console.log('   uloženo jenProj=' + g.jenProj + ', autor=' + g.autor + ', upravil=' + g.upravil);
  const b = prodej(imp(g));
  vypis('2c CIZÍ obchodník: Prodáno u cizí zakázky', await uloz(b, cC, g.uloRazitko));
  const c = imp(g); c.jenOck = true;
  const r4 = await uloz(c, cC, g.uloRazitko); vypis('2d CIZÍ obchodník: jenOck false→true u cizí zamčené zakázky', r4);
}

console.log('\n===== 3. PRODANÁ zakázka OCK (poctivě): přepnutí příznaku po prodeji =====');
{ const z = zamkni(nova('prodaná'), 'nabidka');
  const r = await uloz(z, cO); vypis('3a autor: zámek OCK', r);
  let g = await nacti(r.soubor, cO);
  const r1 = await uloz(prodej(imp(g)), cO, g.uloRazitko); vypis('3b autor: Prodáno', r1);
  g = await nacti(r.soubor, cO);
  const pred = dopad(g); console.log('   dopad PŘED: ' + JSON.stringify(bezCisel(pred)));
  const a = imp(g); a.jenProj = true;
  const r2 = await uloz(a, cO, g.uloRazitko); vypis('3c AUTOR: jenProj false→true u PRODANÉ zakázky', r2);
  g = await nacti(r.soubor, cO);
  const po = dopad(g); console.log('   uloženo jenProj=' + g.jenProj + '; dopad PO: ' + JSON.stringify(bezCisel(po)));
  console.log('   hodnota pro Pipedrive po/před = ' + pomer(pred._pdKc, po._pdKc) + ', cena v controllingu po/před = ' + pomer(pred._ctrlCena, po._ctrlCena));
  const b = imp(g); b.jenProj = false;
  const r3 = await uloz(b, cC, g.uloRazitko); vypis('3d CIZÍ obchodník: jenProj true→false u PRODANÉ cizí zakázky', r3);
  g = await nacti(r.soubor, cO);
  const c = imp(g); c.jenOck = true;   // u čísla OPR beze změny vedoucí strany
  vypis('3e CIZÍ obchodník: jenOck false→true u PRODANÉ cizí zakázky', await uloz(c, cC, g.uloRazitko));
  g = await nacti(r.soubor, cO); console.log('   uloženo jenProj=' + g.jenProj + ', jenOck=' + g.jenOck + ', prodejHistorie záznamů=' + (g.prodejHistorie || []).length
    + ', stopa změny příznaku v zakázce: ' + JSON.stringify(Object.keys(g).filter(k => /histor|protokol|zmeny/i.test(k))));
}

console.log('\n===== 4. Další kontroly vynechané u vyřazené strany =====');
{ const z = nova('nulové rozměry'); Object.assign(d0(z).ock.zadani, { sirka: 0, hloubka: 0, zdvih: 0 }); zamkni(z, 'nabidka');
  vypis('4a SROVNÁVACÍ: přímý zámek OCK s nulovými rozměry', await uloz(z, cO)); }
{ const z = nova('nulové rozměry jenProj'); Object.assign(d0(z).ock.zadani, { sirka: 0, hloubka: 0, zdvih: 0 }); z.jenProj = true; zamkni(z, 'nabidkaProj');
  const r = await uloz(z, cO); vypis('4b jenProj=true, OCK nulové rozměry, zámek PROJ', r);
  if (r.status === 200) { let g = await nacti(r.soubor, cO); const a = imp(g); a.jenProj = false;
    vypis('4c …vypnutí jenProj', await uloz(a, cO, g.uloRazitko));
    g = await nacti(r.soubor, cO);
    vypis('4d …dotisk OCK (nabidka)', await uloz(dotisk(imp(g), 'nabidka'), cO, g.uloRazitko));
    vypis('4e …Prodáno bez dotisku', await uloz(prodej(imp(g)), cO, g.uloRazitko));
    g = await nacti(r.soubor, cO); console.log('   dopad: ' + JSON.stringify(bezCisel(dopad(g)))); } }
if (MINM > 0) {
  const sl = { procenta: 5, stav: 'schváleno automaticky' };
  { const z = nova('sleva přímá'); d0(z).sleva = kopie(sl);
    vypis('4f SROVNÁVACÍ: uložení slevy 5 % OCK pod minimální marží (bez příznaku)', await uloz(z, cO)); }
  { const z = nova('sleva jenProj'); d0(z).sleva = kopie(sl); z.jenProj = true; zamkni(z, 'nabidkaProj');
    const r = await uloz(z, cO); vypis('4g jenProj=true, sleva 5 % OCK pod marží, zámek PROJ', r);
    if (r.status === 200) { let g = await nacti(r.soubor, cO); console.log('   uložená sleva OCK stav: ' + (d0(g).sleva && d0(g).sleva.stav));
      const a = imp(g); a.jenProj = false;
      vypis('4h …vypnutí jenProj', await uloz(a, cO, g.uloRazitko)); g = await nacti(r.soubor, cO);
      vypis('4i …dotisk OCK (nabidka)', await uloz(dotisk(imp(g), 'nabidka'), cO, g.uloRazitko));
      vypis('4j …Prodáno bez dotisku', await uloz(prodej(imp(g)), cO, g.uloRazitko));
      g = await nacti(r.soubor, cO); console.log('   prodáno=' + !!g.varianty[0].prodano + ', dopad: ' + JSON.stringify(bezCisel(dopad(g)))); } }
}

console.log('\n===== 5. jenOck: zámek OCK, PROJ vyřazená; číslo OVP =====');
{ const z = nova('jenOck', '2026 - OVP - CN - ' + (n++)); z.jenOck = true; zamkni(z, 'nabidka');
  const r = await uloz(z, cO); vypis('5a číslo OVP + jenOck=true, zámek OCK (nabidka)', r);
  if (r.status === 200) { let g = await nacti(r.soubor, cO); console.log('   dopad PŘED: ' + JSON.stringify(bezCisel(dopad(g))));
    const a = imp(g); a.jenOck = false;
    vypis('5b vypnutí jenOck po zámku', await uloz(a, cO, g.uloRazitko));
    g = await nacti(r.soubor, cO); console.log('   dopad PO: ' + JSON.stringify(bezCisel(dopad(g)))); } }

console.log('\n===== 6. Ruční cena SE zdrojem, ale NEPOTVRZENÁ (rucniCenyZamekProblem) =====');
{ const sZdrojem = (z, h) => { d0(z).cenik.profilasKgKc = h;
    d0(z).rucniCeny = { [PROF]: { hodnota: h, dodavatel: 'Ocelárna Příklad s.r.o.', cislo: 'N-TEST-1', datum: '2026-11-02', platnostDo: '2026-12-02', zaklad: null, potvrdil: null } }; return z; };
  { const z = zamkni(sZdrojem(nova('se zdrojem přímý'), 5), 'nabidka');
    vypis('6a SROVNÁVACÍ: přímý zámek OCK, ruční cena se zdrojem bez potvrzení', await uloz(z, cO)); }
  { const z = sZdrojem(nova('se zdrojem jenProj'), 5); z.jenProj = true; zamkni(z, 'nabidkaProj');
    const r = await uloz(z, cO); vypis('6b jenProj=true, zámek PROJ, OCK s nepotvrzenou ruční cenou se zdrojem', r);
    if (r.status === 200) { let g = await nacti(r.soubor, cO); const a = imp(g); a.jenProj = false;
      vypis('6c …vypnutí jenProj', await uloz(a, cO, g.uloRazitko)); g = await nacti(r.soubor, cO);
      const r3 = await uloz(dotisk(imp(g), 'nabidka'), cO, g.uloRazitko); vypis('6d …DOTISK cenové nabídky OCK (nabidka)', r3);
      g = await nacti(r.soubor, cO);
      console.log('   tisky v zámku: ' + JSON.stringify((g.varianty[0].zamek.tisky || []).map(t => t.typ)) + ', ruční cena potvrzena=' + !!d0(g).rucniCeny[PROF].potvrdil);
      const r4 = await uloz(dotisk(imp(g), 'sod'), cO, g.uloRazitko); vypis('6e …DOTISK smlouvy o dílo OCK (sod)', r4);
      g = await nacti(r.soubor, cO);
      vypis('6f …Prodáno', await uloz(prodej(imp(g)), cO, g.uloRazitko));
      g = await nacti(r.soubor, cO);
      console.log('   tisky: ' + JSON.stringify((g.varianty[0].zamek.tisky || []).map(t => t.typ)) + ', prodáno=' + !!g.varianty[0].prodano + ', dopad: ' + JSON.stringify(bezCisel(dopad(g)))); } }
}
