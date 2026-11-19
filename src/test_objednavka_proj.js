/* D3 — OBJEDNÁVKA / SMLOUVA PROJ (rozhodnutí J. V. 19. 11. 2026).
 * Zlatá sada se smyšlenou zakázkou TEST (zkušební ceník, žádné skutečné
 * ceny ani zákazníci):
 *   1) číslo OBJ z čísla nabídky (CN → OBJ, pořadí a verze varianty zůstanou),
 *   2) ceny = jádro (engine_proj.js + zaokrouhlení po činnostech) a = nabídka
 *      PROJ (sleva, DPH projekční části, celkem na haléř), zlatá čísla,
 *   3) varianta bez některých činností (řádky, rozsah, platební kalendář),
 *   4) projednání studie jako vlastní řádek, cestovné mimo Prahu,
 *   5) víc zákazníků: jen řídící, objednatel a zástupce z jeho pohledu,
 *   6) odeslaná varianta tiskne z otisku zámku, ne z pozdější změny,
 *   7) Word od nuly (platné XML, čísla), napojení na brány a UI.
 * Pojistka proti prázdnému testu: před D3 sada spadne hned na prvním testu
 * (objednavka_proj.js neexistuje — require selže), po D3 projde.
 *
 * Spuštění: cd src && node test_objednavka_proj.js */
const fs = require('fs');
const path = require('path');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
const DG = nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const EP = nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
const ZA = nacti('./zaokrouhleni.js');
nacti('./firma.js');
nacti('./plan_plateb.js');
nacti('./podminky.js');
const NP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
nacti('./zamek.js');
const VZ = nacti('./vice_zakazniku.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');
nacti('./nazvy_souboru.js');
const KO = nacti('./kontroly.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 600) : JSON.stringify(info).slice(0, 600))); } };

let O = null;
try { O = nacti('./objednavka_proj.js'); } catch (e) { O = null; }
test('modul objednavka_proj.js existuje a exportuje objednavkaProjData', !!(O && typeof O.objednavkaProjData === 'function'));
if (!O) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const kopie = o => JSON.parse(JSON.stringify(o));
const nbsp = s => String(s).replace(/[  ]/g, ' ');
const DNES = new Date(2026, 10, 19);
const CEN = kopie(ZC.zkusebniCenikProj());
/* Smyšlená zakázka TEST: všechny položky zapnuté, sleva 10 % schválená. */
const zakazka = (uprava, moznosti) => {
  const m = moznosti || {};
  const zak = zk.novaZakazka();
  zak.cislo = '2026 - OVP - CN - 0376'; zak.nazevAkce = 'TEST akce D3'; zak.adresa = 'Zkušební 1, Praha';
  zak.objednatel = 'TEST zákazník s.r.o.'; zak.adresaObjednatele = 'Vzorová 2, 100 00 Praha'; zak.ico = '00000001'; zak.dic = 'CZ00000001';
  zak.zastupci = Object.assign({}, zak.zastupci || {}, { smluvniJmeno: 'Jan Zkušební', smluvniPozice: 'jednatel' });
  const v = zak.varianty[0];
  v.data.proj.cenik = kopie(CEN);
  const z = kopie(EP.DEFAULT_ZADANI_PROJ);
  z.sekce.forEach(s => s.polozky.forEach(p => { p.vyrazeno = false; }));
  v.data.proj.zadani = Object.assign(z, uprava || {});
  if (m.sleva !== false) v.data.slevaProj = { procenta: 10, stav: 'schváleno' };
  return { zak, v };
};
/* „Odeslání" nabídky PROJ jako ve skutečnosti (tisk zamkne variantu se
 * zmrazeným výsledkem). Objednávka jde jen z odeslané nabídky (J. V. 19. 11.). */
const odesli = (v, zak) => { if (!(v.zamek && v.zamek.zamceno)) {
  if (zak) { kryciProjZmrazPodminky(zak, v); kryciProjZmrazPlan(zak, v); }   // jako zamekPoTisku
  zamkniVariantu(v, { kdy: '2026-11-19T08:00:00Z', typ: 'nabidkaProjTisk',
    vysledek: { proj: EP.vypocetProj(v.data.proj.zadani, v.data.proj.cenik) } }); } return v; };
const obj = (zak, v) => O.objednavkaProjData(zak, odesli(v, zak), { dnes: DNES });
const vyrad = (v, klice) => v.data.proj.zadani.sekce.filter(s => klice.indexOf(s.key) >= 0)
  .forEach(s => s.polozky.forEach(p => { p.vyrazeno = true; }));

/* ---------------- 1) číslo OBJ ---------------- */
test('číslo: 2026-OVP-CN-0376.2 → 2026-OVP-OBJ-0376.2', O.objednavkaProjCislo('2026-OVP-CN-0376.2') === '2026-OVP-OBJ-0376.2');
test('číslo: mezery z hlavičky pryč', O.objednavkaProjCislo('2026 - OVP - CN - 0376') === '2026-OVP-OBJ-0376');
test('číslo: písmeno dalšího zákazníka zůstane', O.objednavkaProjCislo('2026-OVP-CN-0376.2-B') === '2026-OVP-OBJ-0376.2-B');
test('číslo: „CN" uvnitř jiné části se nemění', O.objednavkaProjCislo('2026-OVPCN-CN-1') === '2026-OVPCN-OBJ-1');
test('číslo bez části CN → prázdné (nic se nevymýšlí)', O.objednavkaProjCislo('2026-OVP-0376') === '' && O.objednavkaProjCislo('') === '');
{
  const { zak, v } = zakazka();
  const v2 = klonujVariantu(zak, v.id, { aktivovat: false });
  const o2 = v2 ? obj(zak, v2) : null;
  test('druhá varianta: číslo s příponou .2', !!o2 && o2.cislo === '2026-OVP-OBJ-0376.2' && o2.cisloNabidky === '2026-OVP-CN-0376.2', o2 && [o2.cislo, o2.cisloNabidky]);
  zak.cislo = '2026-OVP-0376';
  const e = obj(zak, v);
  test('číslo nabídky bez CN: dokument nevznikne a řekne proč', !!e.chyba && /neobsahuje část „CN"/.test(e.chyba), e);
  zak.cislo = '';
  test('bez čísla nabídky: chyba', /nemá číslo nabídky/.test(obj(zak, v).chyba || ''));
}

/* ---------------- 2) zlatá sada: ceny = jádro = nabídka ---------------- */
const ZLATA = { zamereni: 18000, studie: 33600, dpz: 100800, ic: 24000, dps: 76800, ezc: 24000, kolaudace: 12000 };
{
  const { zak, v } = zakazka();
  const o = obj(zak, v);
  const n = NP.nabidkaProjData(zak, v, 'cz');
  /* nezávislá cesta z jádra: cena sekce → zaokrouhlení po činnosti (nabídka #135) */
  const r = EP.vypocetProj(v.data.proj.zadani, v.data.proj.cenik);
  const zaokr = ZA.zaokrProjZ(v.data);
  const jadro = {};
  r.sekce.forEach(s => { const c = ZA.zaokrouhli(s.celkem, zaokr); if (c > 0) jadro[s.key] = c; });
  test('bez chyby, číslo 2026-OVP-OBJ-0376', !o.chyba && o.cislo === '2026-OVP-OBJ-0376', o.chyba);
  test('řádky = nabízené činnosti nabídky (pořadí i počet)', JSON.stringify(o.radky.map(x => x.sekce)) === JSON.stringify(n.nabizeneSekce), o.radky.map(x => x.sekce));
  test('každý řádek: cena = jádro (zaokrouhlená cena sekce před slevou)', o.radky.every(x => x.cenaJedn === jadro[x.sekce] && x.celkemBezDph === x.cenaJedn),
    o.radky.map(x => [x.sekce, x.cenaJedn, jadro[x.sekce]]));
  test('zlatá čísla řádků (zkušební ceník)', JSON.stringify(o.radky.reduce((a, x) => (a[x.sekce] = x.cenaJedn, a), {})) === JSON.stringify(ZLATA),
    o.radky.reduce((a, x) => (a[x.sekce] = x.cenaJedn, a), {}));
  test('řádek nese množství 1, MJ kpl, DPH 21 % a s DPH', o.radky.every(x => x.mnozstvi === 1 && x.mj === 'kpl' && x.dphPct === 21
    && Math.abs(x.celkemSDph - x.cenaJedn * 1.21) < 1e-6));
  test('sleva 10 % vlastním řádkem = sleva nabídky', !!o.sleva && o.sleva.pct === '10' && o.sleva.bezDph === -n.souhrn.slevaKc && o.sleva.bezDph === -28700, o.sleva);
  test('celkem = nabídka (bez DPH, DPH, s DPH)', o.souhrn.bezDph === n.souhrn.bezDph && o.souhrn.dphKc === n.souhrn.dphKc && o.souhrn.sDph === n.souhrn.sDph
    && o.texty.sDph === n.placeholders.PROJ_CELKEM_S_DPH && o.texty.bezDph === n.placeholders.PROJ_CELKEM_BEZ_DPH);
  test('zlatá čísla celku: 260 500 / 54 705 / 315 205', o.souhrn.bezDph === 260500 && o.souhrn.dphKc === 54705 && o.souhrn.sDph === 315205, o.souhrn);
  const hal = x => Math.round(x * 100) / 100;
  const sumS = hal(o.radky.reduce((a, x) => a + x.celkemSDph, 0) + o.sleva.sDph);
  const sumB = o.radky.reduce((a, x) => a + x.celkemBezDph, 0) + o.sleva.bezDph;
  test('součet řádků = celkem na haléř (bez i s DPH), bez upozornění na rozdíl', sumB === o.souhrn.bezDph && sumS === hal(o.souhrn.sDph)
    && !o.upozorneni.some(t => /liší/.test(t)), [sumB, sumS, o.upozorneni]);
  test('DPH projekční části: vlastní sazba ceníku PROJ', (() => {
    const z2 = zakazka(); z2.v.data.proj.cenik.dph = 0.12;
    const o2 = obj(z2.zak, z2.v);
    /* DPH i s DPH po řádcích ze sazby PROJ, součet řádků = celkem (žádné upozornění na rozdíl) */
    return o2.souhrn.dphPct === 12 && o2.radky.every(x => x.dphPct === 12 && Math.abs(x.dph - x.cenaJedn * 0.12) < 1e-6
      && Math.abs(x.celkemSDph - x.cenaJedn * 1.12) < 1e-6) && Math.abs(o2.sleva.sDph + 28700 * 1.12) < 1e-6
      && o2.souhrn.dphKc === Math.round(260500 * 0.12 * 100) / 100 && !o2.upozorneni.length;
  })());
  test('dodavatel z Nastavení → Firma', o.dodavatel.nazev === firmaAktualni().nazev && o.dodavatel.ico === firmaHodnota(firmaAktualni(), 'ico') && !!o.dodavatel.adresa);
  test('objednatel z hlavičky (název, sídlo, IČ, DIČ, zástupce)', o.objednatel.nazev === 'TEST zákazník s.r.o.' && o.objednatel.adresa === 'Vzorová 2, 100 00 Praha'
    && o.objednatel.ico === '00000001' && o.objednatel.dic === 'CZ00000001' && o.objednatel.zastupce === 'Jan Zkušební, jednatel', o.objednatel);
  test('datum případu = datum vystavení', o.datumVystaveni === '19. 11. 2026');
  test('poznámka: odkaz na CN s číslem a datem nabídky', o.poznamka === 'Veškeré platební podmínky, termíny plnění a ostatní smluvní podmínky se řídí cenovou nabídkou č. 2026-OVP-CN-0376 ze dne '
    + n.placeholders.DATUM + ', která je nedílnou součástí této objednávky.', o.poznamka);
  test('rozsah DPZ z textu nabídky pod názvem', (o.radky.find(x => x.sekce === 'dpz').popis || []).some(t => /část 2 \(Požárně bezpečnostní řešení\)/.test(t)));
  test('IČ: body seznamu nabídky', o.radky.find(x => x.sekce === 'ic').popis.indexOf('– Zkompletování podkladů potřebných pro POVOLENÍ ZÁMĚRU, podání žádosti') >= 0);
  const pl = n.platbyProj.dopocet;
  test('platební kalendář = plán plateb SoD PROJ (počet, částky po slevě)', o.platebniKalendar.length === pl.platby.length
    && o.platebniKalendar.every((t, i) => nbsp(t).indexOf(nbsp(formatKc2(pl.platby[i].castka))) > 0) && pl.sedi, o.platebniKalendar);
  test('termíny z nabídky (jen nabízené činnosti) + poznámka k hvězdičce IČ', o.terminy.length > 0
    && o.terminy.some(x => /^\*\) Termíny pro vyjádření/.test(x[0])), o.terminy);
  test('mimo celkovou cenu: varianta studie a AD (nabízí se)', o.mimoCenu.length === 2 && /AUTORSKÝ DOZOR/.test(o.mimoCenu[1]));
  test('název souboru OBJEDNAVKA_<číslo>-PROJ', o.nazevSouboru === 'OBJEDNAVKA_2026-OVP-OBJ-0376-PROJ', o.nazevSouboru);
}
{
  const { zak, v } = zakazka(null, { sleva: false });
  const o = obj(zak, v);
  test('bez slevy: žádný řádek slevy, celkem = součet řádků', o.sleva === null && o.souhrn.bezDph === Object.values(ZLATA).reduce((a, b) => a + b, 0), o.souhrn);
}

/* ---------------- 3) varianta bez některých činností ---------------- */
{
  const { zak, v } = zakazka();
  vyrad(v, ['ic', 'dps', 'kolaudace']);
  const o = obj(zak, v);
  const n = NP.nabidkaProjData(zak, v, 'cz');
  test('bez IČ/DPS/kolaudace: řádky jen nabízených činností', JSON.stringify(o.radky.map(x => x.sekce)) === JSON.stringify(['zamereni', 'studie', 'dpz', 'ezc']), o.radky.map(x => x.sekce));
  test('…celkem = nabídka', o.souhrn.sDph === n.souhrn.sDph && o.texty.bezDph === n.placeholders.PROJ_CELKEM_BEZ_DPH);
  test('…v rozsahu ani kalendáři nic z vyřazených', !o.radky.some(x => x.popis.some(t => /POVOLENÍ ZÁMĚRU \(dle platného/.test(t)))
    && !o.platebniKalendar.some(t => /kolaudačního|kompletní dokumentace pro provedení/.test(t)), o.platebniKalendar);
  test('…bez IČ odpadne poznámka k hvězdičce termínů', !o.terminy.some(x => /^\*\)/.test(x[0])), o.terminy);
  test('…číslování řádků 1…n', o.radky.map(x => x.c).join(',') === '1,2,3,4');
  const { zak: z2, v: v2 } = zakazka();
  vyrad(v2, ['dpz']);
  v2.data.proj.zadani.sekce.find(s => s.key === 'dpz').polozky.forEach(p => { p.vyrazeno = false; });
  const pbr = v2.data.proj.zadani.sekce.find(s => s.key === 'dpz').polozky.find(p => /PBŘ/.test(p.nazev));
  if (pbr) pbr.vyrazeno = true;
  const o2 = obj(z2, v2);
  test('DPZ bez PBŘ: rozsah bez části PBŘ, popis ceny bez PBŘ', !!pbr && !o2.radky.find(x => x.sekce === 'dpz').popis.some(t => /PBŘ|Požárně/.test(t)),
    o2.radky.find(x => x.sekce === 'dpz').popis.slice(0, 2));
  const { zak: z3, v: v3 } = zakazka();
  vyrad(v3, ['zamereni', 'studie', 'projednani', 'dpz', 'ic', 'dps', 'ezc', 'kolaudace', 'geodet']);
  test('nic nenabízeno: objednávka nevznikne', /žádnou činnost/.test(obj(z3, v3).chyba || ''));
}

/* ---------------- 4) projednání studie, cestovné ---------------- */
{
  /* zkušební ceník projednání neoceňuje — smyšlená cena památkářů v ceníku varianty */
  const { zak, v } = zakazka();
  v.data.proj.cenik.fixy = Object.assign({}, v.data.proj.cenik.fixy, { pamatkari: 5000 });
  const o = obj(zak, v);
  const n = NP.nabidkaProjData(zak, v, 'cz');
  const rp = o.radky.find(x => x.sekce === 'projednani'), rs = o.radky.find(x => x.sekce === 'studie');
  test('projednání: vlastní řádek za cenu nabídky', n.nabizeneSekce.indexOf('projednani') >= 0 && !!rp && o.souhrn.sDph === n.souhrn.sDph, n.nabizeneSekce);
  test('projednání: rozsah s projednáním u projednání, studie bez něj', !!rp && rp.popis.some(t => /Projednání STUDIE/.test(t))
    && !rs.popis.some(t => /Projednání STUDIE|památkové péče HMP/.test(t)) && rs.popis.some(t => /Návrh grafické studie/.test(t)), [rp && rp.popis, rs && rs.popis]);
  const m = zakazka({ akceMimoPrahu: true });
  m.v.data.proj.cenik.vyjezdTechnikKc = 3500;
  const om = obj(m.zak, m.v);
  const nm = NP.nabidkaProjData(m.zak, m.v, 'cz');
  test('mimo Prahu: cena ZA o výjezd výš (= nabídka) a věta o cestovném v popisu', om.radky.find(x => x.sekce === 'zamereni').cenaJedn === ZLATA.zamereni + 3500
    && om.radky.find(x => x.sekce === 'zamereni').popis.some(t => /cestovní náklady na 1 výjezd/.test(t)) && om.souhrn.sDph === nm.souhrn.sDph,
    om.radky.find(x => x.sekce === 'zamereni'));
  test('mimo Prahu: IČ jen věta (cena beze změny)', om.radky.find(x => x.sekce === 'ic').cenaJedn === ZLATA.ic
    && om.radky.find(x => x.sekce === 'ic').popis.some(t => /NEZAHRNUJE cestovní/.test(t)));
}

/* ---------------- 5) víc zákazníků ---------------- */
{
  const { zak, v } = zakazka();
  const r = VZ.vzPridej(zak, { objednatel: 'TEST druhý zákazník a.s.', adresaObjednatele: 'Jiná 3, Brno', ico: '00000002', dic: '',
    zastupci: { smluvniJmeno: 'Eva Druhá', smluvniPozice: 'předsedkyně' } }, { kdo: 'test', kdy: '2026-11-19T08:00:00Z' });
  test('VZ: druhý zákazník přidán', r.ok, r);
  test('VZ: objednávka je dokument PROJ (jen řídící)', VZ.vzTypProj('objednavkaProj') === true);
  const zab = VZ.vzTiskZabrana(zak, r.zakaznik.id, v, 'objednavkaProj');
  test('VZ: pro dalšího zákazníka zábrana „jen pro řídícího"', /tisknou jen pro řídícího zákazníka/.test(zab), zab);
  test('VZ: pro řídícího bez zábrany', VZ.vzTiskZabrana(zak, '', v, 'objednavkaProj') === '');
  odesli(v, zak);
  const pohled = VZ.vzTiskPohled(zak, '', v);
  const o = O.objednavkaProjData(pohled, VZ.vzTiskVarianta ? VZ.vzTiskVarianta(pohled, v) : v, { dnes: DNES });
  test('VZ: objednatel a zástupce = řídící zákazník', o.objednatel.nazev === 'TEST zákazník s.r.o.' && o.objednatel.zastupce === 'Jan Zkušební, jednatel'
    && JSON.stringify(o).indexOf('TEST druhý') < 0, o.objednatel);
  test('VZ: celá zakázka (ne pohled) se netiskne', (() => { try { obj(zak, v); return false; } catch (e) { return /pohledu jednoho zákazníka/.test(e.message); } })());
}

/* ---------------- 6) odeslaná varianta = otisk ---------------- */
{
  const { zak, v } = zakazka();
  const pred = obj(zak, v);
  zamkniVariantu(v, { kdy: '2026-11-19T08:00:00Z', typ: 'nabidkaProjTisk',
    vysledek: { proj: EP.vypocetProj(v.data.proj.zadani, v.data.proj.cenik) } });
  v.data.proj.cenik.hodinaKc = (+v.data.proj.cenik.hodinaKc || 1000) * 3;   // pozdější změna ceníku varianty
  Object.keys(v.data.proj.cenik).forEach(k => { if (typeof v.data.proj.cenik[k] === 'number' && /Kc$/.test(k)) v.data.proj.cenik[k] *= 2; });
  vyrad(v, ['dpz']);   // pozdější změna zadání odeslané varianty (živý výpočet by DPZ vynuloval)
  const po = obj(zak, v);
  const n = NP.nabidkaProjData(zak, v, 'cz');
  test('odeslaná varianta: ceny z otisku = jako před změnou a = dotisk nabídky', po.souhrn.sDph === pred.souhrn.sDph && po.souhrn.sDph === n.souhrn.sDph
    && JSON.stringify(po.radky.map(x => x.cenaJedn)) === JSON.stringify(pred.radky.map(x => x.cenaJedn)), [po.souhrn, pred.souhrn]);
  test('odeslaná varianta: bez zábrany', !po.chyba && O.objednavkaProjZabrana(v) === '');
}

/* ---------------- 6b) zábrana: jen z odeslané nabídky (J. V. 19. 11., #689 bod 3) ---------------- */
{
  const { zak, v } = zakazka();
  const e = O.objednavkaProjData(zak, v, { dnes: DNES });
  test('neodeslaná (nezamčená) varianta: objednávka nevznikne, hláška říká proč', !!e.chyba && /jen z odeslané \(vytištěné\) cenové nabídky PROJ/.test(e.chyba), e);
  test('zábrana: nezamčená → hláška, zamčená → prázdné', /odeslané/.test(O.objednavkaProjZabrana(v)) && O.objednavkaProjZabrana(odesli(v, zak)) === ''
    && /odeslané/.test(O.objednavkaProjZabrana(null)));
  test('zábrana: odemčený zámek (zamceno false) = neodeslaná', /odeslané/.test(O.objednavkaProjZabrana({ zamek: { zamceno: false } })));
  const ui = fs.readFileSync(path.join(__dirname, 'ui/ukazkove_ui.js'), 'utf8');
  test('brána tlačítka (dokumentZabrana) volá objednavkaProjZabrana — tlačítko zhasne s důvodem',
    /typ === 'objednavkaProj' && typeof objednavkaProjZabrana === 'function'[\s\S]{0,160}objednavkaProjZabrana\(varianta \|\| aktivniVarianta\(ZAK\)\)/.test(ui));
}

/* ---------------- 7) Word, brány, UI ---------------- */
(async () => {
  const { zak, v } = zakazka();
  /* Pole „Číslo zakázky" krycího listu PROJ (J. V. 19. 11., #689 bod 2). */
  const pole = KRYCI_PROJ_SEKCE.find(x => x.sekce === 'Základní údaje').pole.find(x => x.id === 'cisloZakazky');
  test('KL PROJ: pole „Číslo zakázky" v Základních údajích (BO i Techdata)', !!pole && pole.label === 'Číslo zakázky'
    && pole.verze.join() === 'bo,techdata' && !pole.prefill && !pole.bind);
  zak.varianty[0].data.kryciProj = { hodnoty: { cisloSod: 'SOD-TEST-1' } };
  test('bez Čísla zakázky: kolonka Zakázka prázdná (Číslo SoD se nebere)', obj(zak, v).cisloZakazky === '');
  test('KL PROJ: Číslo zakázky jde doplnit po odeslání CN', zamekKryciPoleStav(v, 'kryciProj', 'cisloZakazky') === 'editovatelne');
  v.data.kryciProj.hodnoty.cisloZakazky = 'Z2026-TEST-01';
  const o = obj(zak, v);
  test('číslo zakázky = pole Číslo zakázky krycího listu PROJ', o.cisloZakazky === 'Z2026-TEST-01');
  const blob = O.objednavkaProjDocxBlob(o);
  const buf = new Uint8Array(await blob.arrayBuffer());
  const pol = await DG.zipPrecti(buf);
  const doc = new TextDecoder().decode(pol.find(p => p.nazev === 'word/document.xml').data);
  const vada = typeof DG.xmlStrukturaVada === 'function' ? DG.xmlStrukturaVada(doc) : '';
  test('Word: platné XML', !vada, vada);
  const text = nbsp(doc.replace(/<[^>]+>/g, ''));
  test('Word: název, číslo dokladu, číslo zakázky, datum případu', /Objednávka \/ Smlouva/.test(text) && text.indexOf('Číslo dokladu: 2026-OVP-OBJ-0376') >= 0
    && text.indexOf('Zakázka: Z2026-TEST-01') >= 0 && text.indexOf('SOD-TEST-1') < 0 && text.indexOf('Datum případu: 19. 11. 2026') >= 0);
  test('Word: řádky, sleva, Celkem Kč a podpis', o.radky.every(x => text.indexOf(x.nazev) >= 0) && text.indexOf('Sleva 10 %') >= 0
    && text.indexOf('Celkem Kč') >= 0 && text.indexOf(nbsp(o.texty.sDph)) >= 0 && /Podpis objednatele/.test(text));
  test('Word: poznámka k termínům bez osiřelé pomlčky', text.indexOf('nemůže zhotovitel z velké části ovlivnit. –') < 0 && text.indexOf('nemůže zhotovitel z velké části ovlivnit.') >= 0);
  test('Word: sloupce jako vzor (J. cena, C. cena, …)', O.OBJ_PROJ_SLOUPCE.every(t => text.indexOf(t) >= 0) && /Součet/.test(text));
  test('Word: blok Místo určení / Objednatel s adresou akce', text.indexOf('Místo určení / Objednatel') >= 0 && text.indexOf('Místo určení: TEST akce D3, Zkušební 1, Praha') >= 0);
  const zap = pol.find(p => p.nazev === 'word/footer1.xml');
  const zapX = zap ? new TextDecoder().decode(zap.data) : '';
  test('Word: zápatí Strana x / y (PAGE, NUMPAGES), platné XML', /Strana /.test(zapX) && /PAGE/.test(zapX) && /NUMPAGES/.test(zapX)
    && !(typeof DG.xmlStrukturaVada === 'function' && DG.xmlStrukturaVada(zapX))
    && /footer1\.xml/.test(new TextDecoder().decode(pol.find(p => p.nazev === 'word/_rels/document.xml.rels').data)));
  test('Word: poznámka s odkazem na CN', text.indexOf('cenovou nabídkou č. 2026-OVP-CN-0376') >= 0);
  if (typeof global.dokumentRegistruj !== 'function') {
    /* registr dokumentů: generate (bez šablony) */
    const D = require('./dokumenty.js');
    Object.keys(D).forEach(k => { if (global[k] === undefined) global[k] = D[k]; });
    delete require.cache[require.resolve('./objednavka_proj.js')];
    require('./objednavka_proj.js');
  }
  test('registr: objednavkaProj generuje od nuly (bez šablony)', !!(global.dokumentDef && dokumentDef('objednavkaProj') && typeof dokumentDef('objednavkaProj').generate === 'function'));
  if (global.dokumentVygeneruj) {
    const res = await dokumentVygeneruj('objednavkaProj', null, zak, v, null);
    test('registr: dokumentVygeneruj vrátí .docx s názvem OBJEDNAVKA_…', res.nazevSouboru === o.nazevSouboru && res.blob && res.blob.size > 1000);
    zak.cislo = '2026-OVP-77';
    let ch = ''; try { await dokumentVygeneruj('objednavkaProj', null, zak, v, null); } catch (e) { ch = e.message; }
    test('registr: bez CN v čísle dokument nevznikne', /neobsahuje část „CN"/.test(ch), ch);
  }
  test('kontroly: objednávka patří straně PROJ (zámek strany, cena 0)', KO.kontrolyDokumentStrana('objednavkaProj') === 'proj');
  const cti = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
  test('plán plateb: objednávka je v branách dokumentů PROJ a hlídá i součet', /PLAN_DOKUMENTY = \[[^\]]*'objednavkaProj'/.test(cti('ui/plan_plateb_ui.js'))
    && /smluvni = t === 'sodProj' \|\| t === 'objednavkaProj'/.test(cti('ui/plan_plateb_ui.js')));
  const ui = cti('ui/objednavka_proj_ui.js');
  test('UI: vstup tisku volá vzTiskVstup a bránu dokumentZabranaHlas', /vzTiskVstup\('objednavkaProj'/.test(ui) && /dokumentZabranaHlas\('objednavkaProj'/.test(ui)
    && !/objednavkaProjData\(ZAK\b/.test(ui) && !/dokumentVygeneruj\([^;]*?,\s*ZAK\s*,/.test(ui));
  test('UI: karta je v krycím listu PROJ hned pod SoD PROJ', /sodProjKarta\(\)\)}<\/div>` : ''}\s*\n\s*\$\{typeof objednavkaProjKarta === 'function'/.test(cti('ui/kryci_proj_ui.js')));
  const build = fs.readFileSync(path.join(__dirname, '..', 'build.py'), 'utf8');
  test('build: modul i UI v sestavení', /'objednavka_proj\.js'/.test(build) && /'ui\/objednavka_proj_ui\.js'/.test(build));
  /* HTML náhledu: escapování a tytéž údaje */
  global.esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  global.dokLogoHtml = () => '';
  const vm = require('vm');
  vm.runInThisContext(ui);
  const zx = zakazka(); zx.zak.objednatel = 'TEST <b>zlý</b>';
  const html = objednavkaProjHtml(obj(zx.zak, zx.v));
  test('náhled: escapuje text zákazníka', html.indexOf('<b>zlý</b>') < 0 && html.indexOf('&lt;b&gt;zlý') >= 0);
  test('náhled: poznámka k termínům bez osiřelé pomlčky', html.indexOf('ovlivnit. –') < 0 && html.indexOf('ovlivnit.') >= 0);
  test('náhled: číslo dokladu, Celkem Kč, podpis, poznámka', /id="objCislo">2026-OVP-OBJ-0376</.test(html) && /Celkem Kč/.test(html)
    && /Podpis objednatele/.test(html) && /nedílnou součástí této objednávky/.test(html));
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka', e && e.stack); process.exit(1); });
