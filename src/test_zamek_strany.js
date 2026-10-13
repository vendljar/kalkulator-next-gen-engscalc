/* ===== P6 / K19-N114 — ZÁMEK STRANY: UZAMKNOUT A VYNULOVAT DRUHOU KALKULACI =====
 * (zadání J. V. 1. 10. 2026, potvrzeno 13. 10. 2026)
 *
 * „V případě, že je kalkulace naceněna v OCK, měla by se kalkulace projekce
 * uzamknout a vynulovat. Toto platí vice versa." a „Druhou stranu kalkulace
 * už nebudeme umožňovat počítat" (Pipedrive eviduje OCK a projekci zvlášť).
 *
 * Pojem: ZÁMEK STRANY (OCK × PROJ v jedné zakázce), ne zámek varianty po
 * tisku (zamekPoTisku, zamek.js).
 *
 * Hlídá se (písmena podle promptu):
 *  (a) číslo OPR, PROJ bez čísla → PROJ ve výstupech null/0: služba (marže,
 *      ceny), krycí list (typ produktu bez „+ projekce"), kontroly PROJ
 *      mlčí (projZahranici, cenaNula PROJ, slevaProj), dokumenty PROJ
 *      zablokované s hláškou (i dokumentVygeneruj), plán plateb PROJ null;
 *  (b) číslo OVP → obdobně vyřazená OCK;  (c) jenProj / jenOck bez čísla;
 *  (d) obeStrany: true → příznak v datech zůstal, ignoruje se, upozornění;
 *  (e) čísla obou stran → vede OCK (D6e), PROJ vynulovaná, upozornění;
 *  (f) bez čísla → obě strany se počítají;
 *  (g) vratnost: smazání čísla vrátí cenu na korunu, zadání beze změny;
 *  (h) odeslaná varianta: otisk beze změny, dotisk vyřazené strany blokovaný
 *      (server: netlify/test_koncova_cena.mjs, blok P6);
 *  (i) zahraniční zakázka s číslem OPR (tvar K22-Z02): dialog „jen
 *      realizace" se nenabídne a projZahranici mlčí; bez čísla dialog ano;
 *  (j) sluzbaVarianta: vyřazená strana cena null, marže jen z vedoucí;
 *  (l) grep: obeStrany nikdo nenastavuje, „Počítat i tuhle stranu" nikde;
 *  (m) vedoucí strana beze změny (OCK souhrn a nabídka na korunu).
 * Před opravou (1df7283) sada selže (chybí zakazkaVyrazenaStrana a další).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
const eng = nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const ep = nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./format.js');
nacti('./techspec.js');
nacti('./sleva.js');
const zo = nacti('./zaokrouhleni.js');
nacti('./firma.js');
const zk = nacti('./zakazka.js');
const zam = nacti('./zamek.js');
nacti('./marze.js');
nacti('./uloziste.js');
const ko = nacti('./kontroly.js');
let PP = null; try { PP = nacti('./plan_plateb.js'); } catch (e) { PP = null; }
const np = nacti('./nabidka_proj.js');
const kr = nacti('./kryci.js');
const dok = nacti('./dokumenty.js');
const sluzba = nacti('./sluzba.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};
const JEKLY = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));
const kopie = (o) => JSON.parse(JSON.stringify(o));
const program = { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(), slevy: { minMarze: 0.05 } };
const nast = { slevy: program.slevy, firma: null };

test('jádro má pravidlo zámku strany (zakazkaVyrazenaStrana, vysledekStrany, kontrolyStranaZabrana)',
  typeof zk.zakazkaVyrazenaStrana === 'function' && typeof zk.vysledekStrany === 'function'
  && typeof ko.kontrolyStranaZabrana === 'function' && typeof zk.zakazkaDrivObeStrany === 'function');
/* Na kódu před opravou (1df7283) funkce chybí — sada pak běží nad náhradou
 * podle tehdejšího pravidla (vedoucí strana zamyká jen „na pohled"), aby
 * počty před/po ukázaly, CO se změnilo, ne jen že chybí funkce. */
if (typeof zk.zakazkaVyrazenaStrana !== 'function') {
  zk.zakazkaVyrazenaStrana = (z) => { const v = zk.zakazkaVedouciStrana(z); return v === 'ock' ? 'proj' : (v === 'proj' ? 'ock' : ''); };
  zk.vysledekStrany = (z, v, strana, j) => strana === 'proj' ? zam.vypocetProjZ(v) : zam.vypocetZ(v, j);
  zk.zakazkaDrivObeStrany = () => false;
}
if (typeof ko.kontrolyStranaZabrana !== 'function') ko.kontrolyStranaZabrana = () => '';

/* Zakázka se zkušebním ceníkem a šachtou s rozměry. */
function zakazka(cislo, x) {
  const z = zk.novaZakazka();
  if (cislo != null) z.cislo = cislo;
  Object.assign(z, x || {});
  const v = z.varianty[0];
  v.data.cenik = ZC.zkusebniCenik(); v.data.proj.cenik = ZC.zkusebniCenikProj();
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  return z;
}
const OPR = '2026 - OPR - CN - 0701', OVP = '2026 - OVP - CN - 0701';
const kody = (zak) => sluzba.sluzbaVarianta(zak, zak.varianty[0], nast, JEKLY).kontroly.kody;

/* (f) bez čísla → počítají se obě (dnešní stav) */
{
  const z = zakazka(null);
  const s = sluzba.sluzbaVarianta(z, z.varianty[0], nast, JEKLY);
  test('(f) bez čísla: nic není vyřazené', zk.zakazkaVyrazenaStrana(z) === '' && !zk.stranaZamcena(z, 'ock') && !zk.stranaZamcena(z, 'proj'));
  test('(f) bez čísla: služba počítá OCK i PROJ', s.cenaOck && s.cenaOck.cena > 0 && s.cenaProj && s.cenaProj.cena > 0, [s.cenaOck, s.cenaProj]);
}

/* (a) + (j) číslo OPR → PROJ vyřazená */
const zO = zakazka(OPR);
const vO = zO.varianty[0];
const sO = sluzba.sluzbaVarianta(zO, vO, nast, JEKLY);
{
  test('(a) OPR: vede OCK, PROJ vyřazená', zk.zakazkaVedouciStrana(zO) === 'ock' && zk.zakazkaVyrazenaStrana(zO) === 'proj');
  test('(a)(j) OPR: služba — cenaProj null, výsledek PROJ null', sO.cenaProj === null && sO.proj === null, sO.cenaProj);
  test('(a)(j) OPR: služba — cena OCK spočtená', sO.cenaOck && sO.cenaOck.cena > 0);
  const primo = zo.cenaNabidkyOck(eng.vypocet(vO.data.ock.zadani, vO.data.cenik, JEKLY, vO.data.ock.fixes), vO.data.sleva, vO.data.zaokr);
  test('(j)(m) OPR: cena OCK na korunu jako přímé volání jádra', Math.abs(sO.cenaOck.cena - primo.cena) < 1e-9);
  test('(a)(j) OPR: marže jen z OCK (proj null, celek = OCK)',
    sO.marze && sO.marze.proj === null && sO.marze.ock && Math.abs(sO.marze.celek.cena - sO.marze.ock.cena) < 1e-6, sO.marze && sO.marze.celek);
  test('(a) OPR: vysledekStrany PROJ = null, OCK = výpočet',
    zk.vysledekStrany(zO, vO, 'proj', JEKLY) === null && !!zk.vysledekStrany(zO, vO, 'ock', JEKLY).souhrn);
  const c = kr.kryciCtx(zO, vO, JEKLY);
  test('(a) OPR: krycí list OCK — typ produktu bez „+ projekce"', !/projekce/.test(c.typProduktu), c.typProduktu);
  const duvod = ko.kontrolyStranaZabrana(zO, 'nabidkaProj');
  test('(a) OPR: dokumenty PROJ (nabídka, tisk, krycí list, SoD) zablokované s hláškou',
    ['nabidkaProj', 'nabidkaProjTisk', 'kryciproj_bo', 'kryciproj_techdata', 'sodProj', 'nabidkaProj_en'].every(t => !!ko.kontrolyStranaZabrana(zO, t))
    && /Kalkulace PROJ je uzamčená a vynulovaná/.test(duvod) && /OVP/.test(duvod) && /Duplikovat jako novou zakázku/.test(duvod), duvod);
  test('(a) OPR: dokumenty OCK a plná moc volné',
    ['nabidka', 'nabidkaTisk', 'kryci_bo', 'sod', 'plnaMoc'].every(t => ko.kontrolyStranaZabrana(zO, t) === ''));
  if (PP) test('(a) OPR: plán plateb PROJ prázdný (null)', np.nabidkaProjPlatby(zO, vO, 'cz') === null
    && np.nabidkaProjPlatby(zakazka(null), zakazka(null).varianty[0], 'cz') !== null);
}
(async () => {
  let chyba = '';
  try { await dok.dokumentVygeneruj('nabidkaProj', null, zO, vO, JEKLY, 'cz'); } catch (e) { chyba = e.message; }
  test('(a) OPR: dokumentVygeneruj nabídky PROJ skončí hláškou zámku strany', /uzamčená a vynulovaná/.test(chyba), chyba);
  let chybaSod = '';
  try { await dok.dokumentVygeneruj('sodProj', null, zO, vO, JEKLY, 'cz'); } catch (e) { chybaSod = e.message; }
  test('(a) OPR: dokumentVygeneruj SoD PROJ taky', /uzamčená a vynulovaná/.test(chybaSod), chybaSod);
  zbytek();
})();

function zbytek() {
/* (a)(i) kontroly PROJ mlčí: projZahranici, cenaNula PROJ, slevaProj */
{
  const zZ = zakazka(OPR); const vZ = zZ.varianty[0];
  const rp = ep.vypocetProj(vZ.data.proj.zadani, vZ.data.proj.cenik);
  const ctx = (zak) => ({ zak, cenikRada: 'zahr', projVysledek: rp, projZadani: vZ.data.proj.zadani,
    slevaProj: { procenta: 'x' }, nast });
  test('(a)(i) OPR + zahraniční ceník: projZahranici a slevaProj mlčí',
    !ko.kontrolyProved(ctx(zZ)).kody.some(k => k === 'projZahranici' || k === 'slevaProj'), ko.kontrolyProved(ctx(zZ)).kody);
  test('(a)(i) pojistka: bez čísla obě pravidla hlásí',
    ['projZahranici', 'slevaProj'].every(k => ko.kontrolyProved(ctx(zakazka(null))).kody.includes(k)), ko.kontrolyProved(ctx(zakazka(null))).kody);
  const nulova = { souhrn: { celkem: 0, cena: 0, naklad: 0, doprava: 0 }, sekce: [{ key: 'studie', celkem: 0, polozky: [{ nazev: 'x', typ: 'fix', cenaEfekt: 5 }] }] };
  test('(a) OPR: cenaNula za PROJ mlčí (projekce se neprodává)',
    !ko.kontrolyProved({ zak: zZ, projVysledek: nulova, nast }).kody.includes('cenaNula'));
  test('(a) pojistka: jen projekce s nulovou projekcí cenaNula hlásí',
    ko.kontrolyProved({ zak: zakazka(OVP), projVysledek: nulova, nast }).kody.includes('cenaNula'));
  /* (i) dialog „jen realizace" */
  test('(i) K22-Z02 (OPR + zahraniční ceník): dialog „jen realizace" se nenabídne', zk.zahrJenRealizaceNabidnout(zZ, 'zahr', ['zahr']) === null);
  test('(i) zahraniční zakázka bez čísla: dialog se nabídne (jenOck)', zk.zahrJenRealizaceNabidnout(zakazka(null), 'zahr', ['zahr']) === 'jenOck');
}

/* (b) číslo OVP → OCK vyřazená */
{
  const z = zakazka(OVP); const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 0, hloubka: 0 });   // nesmyslné rozměry vyřazené strany
  const s = sluzba.sluzbaVarianta(z, v, nast, JEKLY);
  test('(b) OVP: vede PROJ, OCK vyřazená', zk.zakazkaVedouciStrana(z) === 'proj' && zk.stranaZamcena(z, 'ock'));
  test('(b) OVP: služba — cenaOck null, cena PROJ spočtená', s.cenaOck === null && s.ock === null && s.cenaProj && s.cenaProj.cena > 0);
  test('(b) OVP: marže jen z PROJ', s.marze && s.marze.ock === null && !!s.marze.proj);
  test('(b) OVP: kontroly OCK (rozměry) mlčí', !s.kontroly.kody.includes('rozmery'), s.kontroly.kody);
  test('(b) pojistka: tytéž rozměry bez čísla kontrola hlásí', kody(Object.assign(kopie(z), { cislo: zk.ZAK_CISLO_PREDLOHA })).includes('rozmery'));
  test('(b) OVP: dokumenty OCK zablokované, PROJ volné',
    ['nabidka', 'nabidkaTisk', 'kryci_bo', 'sod'].every(t => /Kalkulace OCK je uzamčená a vynulovaná/.test(ko.kontrolyStranaZabrana(z, t)))
    && ['nabidkaProj', 'kryciproj_bo', 'sodProj'].every(t => ko.kontrolyStranaZabrana(z, t) === ''));
  const c = kr.kryciCtx(z, v, JEKLY);
  test('(b) OVP: krycí list OCK nemá hodnotu OCK (—)', c.hodnota === '—', c.hodnota);
}

/* (c) jenProj / jenOck bez čísla */
{
  const jp = zakazka(null, { jenProj: true }), jo = zakazka(null, { jenOck: true });
  const sp = sluzba.sluzbaVarianta(jp, jp.varianty[0], nast, JEKLY), so = sluzba.sluzbaVarianta(jo, jo.varianty[0], nast, JEKLY);
  test('(c) jenProj bez čísla: OCK vyřazená, cenaOck null', zk.zakazkaVyrazenaStrana(jp) === 'ock' && sp.cenaOck === null && sp.cenaProj.cena > 0);
  test('(c) jenOck bez čísla: PROJ vyřazená, cenaProj null', zk.zakazkaVyrazenaStrana(jo) === 'proj' && so.cenaProj === null && so.cenaOck.cena > 0);
  test('(c) jenOck: dokumenty PROJ zablokované', !!ko.kontrolyStranaZabrana(jo, 'sodProj') && !!ko.kontrolyStranaZabrana(jo, 'nabidkaProj'));
}

/* (d) obeStrany: true (dřívější tlačítko) */
{
  const z = zakazka(OPR, { obeStrany: true });
  const pred = JSON.stringify(z);
  const s = sluzba.sluzbaVarianta(z, z.varianty[0], nast, JEKLY);
  test('(d) obeStrany: příznak v datech zůstal a nic se nezapsalo', z.obeStrany === true && JSON.stringify(z) === pred);
  test('(d) obeStrany: ignoruje se — vede OCK podle čísla, PROJ vynulovaná', zk.zakazkaVedouciStrana(z) === 'ock' && s.cenaProj === null);
  const n = s.kontroly.nalezy.find(x => x.kod === 'stranyDriv');
  test('(d) obeStrany: kontrola upozorní (upozornění, ne zábrana)',
    !!n && n.uroven === ko.KONTROLY_UROVEN && /dřív počítala projekci i OCK/.test(n.text) && /Kalkulace PROJ je vynulovaná/.test(n.text), n);
  test('(d) bez příznaku a s jedním číslem kontrola mlčí', !kody(zakazka(OPR)).includes('stranyDriv'));
}

/* (e) čísla obou stran → vede OCK (D6e), PROJ vynulovaná, upozornění */
{
  const z = zakazka(OPR); zk.zajistiProjHlavicku(z); z.projHlavicka.cislo = '2026 - OVP - CN - 0702';
  test('(e) obě čísla: vede OCK, PROJ vyřazená', zk.zakazkaVedouciStrana(z) === 'ock' && zk.stranaZamcena(z, 'proj'));
  test('(e) obě čísla: služba PROJ null', sluzba.sluzbaVarianta(z, z.varianty[0], nast, JEKLY).cenaProj === null);
  test('(e) obě čísla: kontrola upozorní', kody(z).includes('stranyDriv'));
  test('(e) zakázka bez čísla OCK s číslem PROJ: vede PROJ',
    (() => { const p = zakazka(null); zk.zajistiProjHlavicku(p); p.projHlavicka.cislo = '2026 - OVP - CN - 0703'; return zk.zakazkaVedouciStrana(p) === 'proj'; })());
}

/* (g) vratnost */
{
  const z = zakazka(OPR); const v = z.varianty[0];
  v.data.proj.zadani.sekce.find(s => s.key === 'studie').polozky.push({ nazev: 'Vlastní P6', typ: 'fix', cena: 12345, vlastni: true });
  const zadPred = JSON.stringify(v.data.proj.zadani);
  const s1 = sluzba.sluzbaVarianta(z, v, nast, JEKLY);
  z.cislo = zk.ZAK_CISLO_PREDLOHA;
  const s2 = sluzba.sluzbaVarianta(z, v, nast, JEKLY);
  const primo = zo.cenaNabidkyProj(ep.vypocetProj(v.data.proj.zadani, v.data.proj.cenik), v.data.slevaProj, zo.zaokrProjZ ? zo.zaokrProjZ(v.data) : v.data.zaokr);
  test('(g) s číslem OPR cena PROJ null, po smazání čísla zase na korunu',
    s1.cenaProj === null && s2.cenaProj && Math.abs(s2.cenaProj.cena - primo.cena) < 1e-9, [s2.cenaProj && s2.cenaProj.cena, primo.cena]);
  test('(g) zadání vyřazené strany se nezměnilo (JSON)', JSON.stringify(v.data.proj.zadani) === zadPred);
}

/* (h) odeslaná varianta: otisk beze změny, vypocetProjZ čistý, dotisk blokovaný */
{
  const z = zakazka(OPR); const v = z.varianty[0];
  zam.zamkniVariantu(v, { typ: 'nabidka', kdy: '2026-10-13T08:00:00.000Z', kdo: 'Test', cislo: zam.variantaCislo(z, v),
    vysledek: zam.zamekVysledekSpocti(v, JEKLY, 'v-p6') });
  const otisk = JSON.stringify(v.zamek);
  const s = sluzba.sluzbaVarianta(z, v, nast, JEKLY);
  test('(h) odeslaná varianta: otisk zámku beze změny a nese i PROJ', JSON.stringify(v.zamek) === otisk && !!v.zamek.vysledek.proj);
  test('(h) vypocetProjZ zůstal čistý (vydá otisk PROJ), vysledekStrany ho skryje',
    !!zam.vypocetProjZ(v) && zk.vysledekStrany(z, v, 'proj', JEKLY) === null && s.cenaProj === null);
  test('(h) nový dotisk dokumentu vyřazené strany je zablokovaný', !!ko.kontrolyStranaZabrana(z, 'nabidkaProjTisk'));
}

/* (j) server-sdílené části: porovnání variant a marže slevy vyřazené strany */
{
  const z = zakazka(OPR); const v = z.varianty[0];
  const por = zk.porovnaniVariant(z, [{ id: v.id, ock: eng.vypocet(v.data.ock.zadani, v.data.cenik, JEKLY, v.data.ock.fixes),
    proj: ep.vypocetProj(v.data.proj.zadani, v.data.proj.cenik) }]).varianty[0];
  test('(a) OPR: porovnání variant PROJ nenese a celkem = jen OCK',
    por.hodnoty.projCelkem == null && Math.abs(por.hodnoty.celkemBezDph - por.hodnoty.ockPoSleve) < 1e-9 && !por.chyba, por.hodnoty);
  const SV = nacti('./schvalovani.js');
  v.data.slevaProj = { procenta: 95, stav: 'schváleno', role: 'Administrátor' };
  test('(a) OPR: server neodmítne uložení kvůli slevě vyřazené PROJ pod minimální marží',
    SV.schvalovaniServerMarze(null, z, JEKLY, { minMarze: 0.1 }).ok === true);
  const zB = kopie(z); zB.cislo = zk.ZAK_CISLO_PREDLOHA;
  test('(a) pojistka: táž sleva u zakázky bez čísla se odmítne',
    SV.schvalovaniServerMarze(null, zB, JEKLY, { minMarze: 0.1 }).ok === false);
}

/* (l) grep */
{
  const SRC = __dirname;
  const zdroje = [];
  const projdi = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'test_data' && e.name !== 'node_modules') projdi(p); }
    else if (/\.(js|html)$/.test(e.name) && !/^test/.test(e.name)) zdroje.push(p);
  });
  projdi(SRC);
  const bezKom = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const nastavuje = zdroje.filter(f => /obeStrany\s*[:=](?!=)|ZAK\.obeStrany'/.test(bezKom(fs.readFileSync(f, 'utf8'))))
    .map(f => path.relative(SRC, f));
  test('(l) v src/ už nic nenastavuje obeStrany', nastavuje.length === 0, nastavuje);
  const tlac = zdroje.filter(f => /Počítat i tuhle stranu/.test(bezKom(fs.readFileSync(f, 'utf8')))).map(f => path.relative(SRC, f));
  test('(l) „Počítat i tuhle stranu" není v UI', tlac.length === 0, tlac);
  test('(l) ani v příručce', !/Počítat i tuhle stranu/.test(fs.readFileSync(path.join(SRC, '..', 'manual', 'obsah.json'), 'utf8')));
  const dist = path.join(SRC, '..', 'dist', 'kalkulacka.html');
  if (fs.existsSync(dist))
    test('(l) sestavená aplikace nemá tlačítko „Počítat i tuhle stranu"', !/>Počítat i tuhle stranu</.test(fs.readFileSync(dist, 'utf8')));
}

/* (m) vedoucí strana beze změny — OCK souhrn testovacích zadání na korunu
 * jako na 1df7283 (otisk spočtený před změnou), Model 1 i Model 2. */
{
  const zad = (e) => Object.assign(kopie(eng.DEFAULT_ZADANI), e || {});
  const VZORY = [zad({ typSachty: 'exteriérová' }), zad({ typSachty: 'interiérová' }),
    zad({ typSachty: 'interiérová', zaskleni: 'mezi příčníky', svetlikNadDvermi: true }),
    zad({ typSachty: 'exteriérová', atyp: true, rezervaZakladPct: 0.3, rezervaPriplatkyPct: 0.3 })];
  const radky = [];
  VZORY.forEach((zz, i) => [false, true].forEach(fixes => {
    const z = zakazka(OPR); const v = z.varianty[0];
    v.data.ock.zadani = kopie(zz); v.data.ock.fixes = fixes;
    const s = sluzba.sluzbaVarianta(z, v, nast, JEKLY);
    radky.push([i, fixes, s.ock.souhrn.zakladCena, s.ock.souhrn.zakladNaklad, s.cenaOck.cena].join('|'));
  }));
  const otisk = crypto.createHash('sha256').update(radky.join('\n')).digest('hex');
  test('(m) souhrn a cena OCK u zakázek s číslem OPR na korunu jako na 1df7283 (Model 1 i 2)',
    otisk === '1eb859175a01cf1e772280b2155b38042245e1e5229d39fa06e7f28829fec41a', otisk);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
}
