/* ============================================================
 * OBJEDNANÉ PŘÍPLATKY (#447 C6, rozhodnutí J. V. 21. 10. 2026 ~13:00)
 *
 * Při vystavení SoD realizace obchodník zaškrtne, které příplatky
 * z ODESLANÉ (zamčené) nabídky zákazník objednal. Odeslaná nabídka se tím
 * NEMĚNÍ — záznam leží v zakázce mimo variantu (`zak.objednane`), tedy mimo
 * otisk zámku:
 *
 *   zak.objednane = { varianta: <id zamčené varianty>, klice: [klíče příplatků],
 *                     datum: 'RRRR-MM-DD' (prodej = podpis SoD), kdo, kdy }
 *
 * `kdo` a `kdy` píše SERVER z relace a hodin (zakazka_kontrola.mjs), klient
 * je jen předvyplní. Prázdný seznam = nic objednáno → záznam se smaže.
 *
 * Pravidla (server, objKontrola):
 *   – klíč musí být příplatek NABÍDNUTÝ v té variantě (zmrazený výsledek
 *     tisku, mimo priplatkyVynechat) a varianta musí být zamčená;
 *   – datum platné a ne v budoucnosti (hromadný export podle data prodeje
 *     se o to opírá);
 *   – zapisuje obchodník, který zakázku založil, vedoucí a administrátor;
 *   – PO PODPISU SoD mění už jen administrátor (rozhodnutí J. V. 21. 10.,
 *     Q3: „po podpisu" = v krycím listu RUČNĚ vyplněné Datum podpisu smlouvy
 *     ≤ dnes; předvyplněný dnešek se nepočítá). Rozhoduje uložená verze,
 *     takže datum podpisu a změnu objednaných nejde obejít jedním zápisem.
 *
 * Modul nekreslí; obrazovka je v ui/sod_ui.js, krycí list v kryci.js,
 * export v controlling.js. Běží v prohlížeči i na serveru (jadro_moduly).
 * ============================================================ */

const OBJ_DATUM_TVAR = /^\d{4}-\d{2}-\d{2}$/;
/* Klíč příplatku jádra, nebo vlastní příplatek varianty `vlastni:<pořadí>`
 * (engine.js; K6-K1: dvojtečku jinde nepustí). */
const OBJ_KLIC_TVAR = /^(?:[A-Za-z][A-Za-z0-9_.-]{0,79}|vlastni:\d{1,4})$/;
const OBJ_MAX_KLICU = 200;

/* Den v českém čase (shodně s controllingem). */
function objDnes(ted) {
  const d = ted ? new Date(ted) : new Date();
  try { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Prague' }).format(d); }
  catch (e) { return d.toISOString().slice(0, 10); }
}
function objDatumPlatne(x) {
  if (typeof x !== 'string' || !OBJ_DATUM_TVAR.test(x)) return false;
  const d = new Date(x + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === x;
}

/* Záznam zakázky, nebo null (žádný / prázdný). Neočišťuje — jen čte. */
function objStav(zak) {
  const o = zak && zak.objednane;
  if (!o || typeof o !== 'object' || !Array.isArray(o.klice) || !o.klice.length) return null;
  return o;
}

/* Datum podpisu SoD z krycího listu varianty — jen RUČNĚ vyplněné (prefill
 * pole je dnešek, ten podpis neznamená). '' = nevyplněno. */
function objDatumPodpisu(v) {
  const h = v && v.data && v.data.kryci && v.data.kryci.hodnoty;
  const x = h ? h.sodDatumPodpisu : '';
  return objDatumPlatne(x) ? x : '';
}
/* Je smlouva podepsaná (Q3)? Vyplněné datum podpisu ≤ dnes. */
function objPodepsano(v, ted) {
  const d = objDatumPodpisu(v);
  return !!d && d <= objDnes(ted);
}
/* Příplatky NABÍDNUTÉ v zamčené variantě: [{ key, nazev, sMarzi, naklad }].
 * Ze zmrazeného výsledku (vypocetZ) a ze zadání varianty, které je zamčené. */
function objNabidnute(v, jekly) {
  if (!v || !v.zamek || !v.zamek.zamceno) return [];
  let r = null;
  try { r = (typeof vypocetZ === 'function') ? vypocetZ(v, jekly) : null; } catch (e) { r = null; }
  if (!r || !Array.isArray(r.priplatky)) return [];
  const zad = (v.data && v.data.ock && v.data.ock.zadani) || {};
  const vynech = Array.isArray(zad.priplatkyVynechat) ? zad.priplatkyVynechat : [];
  return r.priplatky.filter(p => p && p.key && !vynech.includes(p.key))
    .map(p => ({ key: String(p.key), nazev: String(p.nazev || p.key), sMarzi: +p.sMarzi || 0, naklad: +p.naklad || 0 }));
}

/* DVOJICE, KTEROU NABÍDKA TISKNE JEDNOU POLOŽKOU (K6-K3, rozhodnutí J. V.
 * 22. 10. 2026). Přechodové plechy jsou v kalkulaci materiál a montáž zvlášť,
 * nabídka je ale tiskne jedním řádkem „Přechodové plechy" s cenou součtu
 * (nabidka.js, PLECHY). Karta objednaných i SoD je proto berou stejně: jedna
 * položka, v eurech se zaokrouhluje nahoru SOUČET (jako v nabídce), objednat
 * jde jen celá. Je-li v nabídce jen jedna půlka, zůstane sama a beze změny
 * názvu — stejně jako v nabídce. V záznamu zakázky zůstávají oba klíče jádra
 * (export pro controlling páruje řádky po klíčích). */
const OBJ_SKUPINY = [{ klice: ['prechMat', 'prechMont'], nazev: 'Přechodové plechy' }];

/* Nabídnuté příplatky jako POLOŽKY dokumentu: [{ key, klice, nazev, sMarzi,
 * naklad }] — dvojice z OBJ_SKUPINY nabídnutá celá je jedna položka (key =
 * první klíč, klice = oba), ostatní jedna položka na klíč (klice = [key]). */
function objPolozky(nab) {
  const out = [];
  (nab || []).forEach(p => {
    const sk = OBJ_SKUPINY.find(g => g.klice.includes(p.key));
    const cleny = sk ? nab.filter(x => sk.klice.includes(x.key)) : [];
    if (!sk || cleny.length < sk.klice.length) { out.push(Object.assign({}, p, { klice: [p.key] })); return; }
    if (p.key !== cleny[0].key) return;                 // druhá půlka dvojice je už v položce
    out.push({ key: cleny[0].key, klice: cleny.map(x => x.key), nazev: sk.nazev,
      sMarzi: cleny.reduce((a, x) => a + x.sMarzi, 0), naklad: cleny.reduce((a, x) => a + x.naklad, 0) });
  });
  return out;
}

/* Objednané příplatky varianty s cenami (POLOŽKY, dvojice sloučené):
 * [{ key, klice, nazev, sMarzi, naklad }] — jen ty, které záznam zakázky
 * uvádí PRO TUTO variantu. */
function objObjednaneVarianty(zak, v, jekly) {
  const o = objStav(zak);
  if (!o || !v || o.varianta !== v.id) return [];
  return objPolozky(objNabidnute(v, jekly)).filter(p => p.klice.some(k => o.klice.includes(k)));
}

/* Položky (dvojice sloučené) podle seznamu klíčů — dotisk SoD z otisku tisku. */
function objPolozkyKlicu(v, jekly, klice) {
  const k = Array.isArray(klice) ? klice : [];
  return objPolozky(objNabidnute(v, jekly)).filter(p => p.klice.some(x => k.includes(x)));
}

/* CENA DÍLA SoD (K6-K4, rozhodnutí J. V. 22. 10. 2026): cena nabídky po slevě
 * a zaokrouhlení + objednané příplatky v ceně nabídky — v měně dokumentu
 * (`L` ≠ cz = eura kurzem odeslané nabídky, celá eura nahoru po položkách,
 * jako sodObjednaneSymboly) a vždy i v Kč (export pro controlling je v Kč).
 * `klice` = objednané klíče (bez nich ze záznamu zakázky). Bez výsledku
 * výpočtu nebo kurzu vrací null — nic se nedopočítává odhadem. */
function objCenaDila(zak, v, jekly, L, klice) {
  if (!v || typeof vypocetZ !== 'function' || typeof cenaNabidkyOck !== 'function') return null;
  let r = null, mena = null;
  try {
    r = vypocetZ(v, jekly);
    const d = v.data || {};
    const kurz = (typeof kurzEurZ === 'function') ? kurzEurZ(v, d.cenik && d.cenik.kurzEurKc) : (d.cenik && d.cenik.kurzEurKc);
    mena = (typeof menaDokumentu === 'function') ? menaDokumentu(L || 'cz', kurz) : { eur: false, na: n => n };
  } catch (e) { return null; }
  const cn = r ? cenaNabidkyOck(r, (v.data || {}).sleva, (v.data || {}).zaokr) : null;
  if (!cn) return null;
  const obj = klice ? objPolozkyKlicu(v, jekly, klice) : objObjednaneVarianty(zak, v, jekly);
  const nabidka = mena.na(cn.cena), priplatky = obj.reduce((a, p) => a + mena.na(p.sMarzi), 0);
  return { mena: mena.eur ? 'EUR' : 'CZK', nabidka, priplatky, bezDph: nabidka + priplatky,
    bezDphKc: cn.cena + obj.reduce((a, p) => a + p.sMarzi, 0),
    klice: obj.reduce((a, p) => a.concat(p.klice), []) };
}

/* ZÁZNAM TISKU SoD (K6-K4): poslední tisk `sod` varianty s otiskem
 * objednaných a cenou díla (`t.sod`), nebo null (SoD netištěna nebo
 * vytištěna před v22.10.4 — tehdy se dotisk řídí záznamem zakázky). */
function objSodZaznam(v) {
  const t = (v && v.zamek && Array.isArray(v.zamek.tisky)) ? v.zamek.tisky : [];
  for (let i = t.length - 1; i >= 0; i--)
    if (t[i] && t[i].typ === 'sod' && t[i].sod && typeof t[i].sod === 'object' && Array.isArray(t[i].sod.klice)) return t[i].sod;
  return null;
}
/* Otisk objednaných a cena díla do záznamu tisku SoD. Prohlížeč ho zapisuje
 * při tisku, server ho u NOVĚ připsaného tisku spočítá znovu (objSodZaznamyServer).
 * `pred` = záznam předchozího tisku SoD: dotisk nese jeho objednané (jako
 * dokument, sodObjednaneSymboly), cenu díla v měně tohoto tisku. */
function objSodSnimek(zak, v, jekly, L, pred) {
  const o = objStav(zak);
  const moje = pred ? { varianta: v && v.id, klice: pred.klice.filter(k => typeof k === 'string'), datum: pred.datum }
    : (o && v && o.varianta === v.id ? o : null);
  const c = objCenaDila(zak, v, jekly, L, moje ? moje.klice : []);
  return { objOtisk: pred ? String(pred.objOtisk || '') : (moje ? objOtisk(moje) : ''), klice: moje ? moje.klice.slice() : [],
    datum: moje ? String(moje.datum || '') : '',
    mena: c ? c.mena : '', nabidka: c ? c.nabidka : null, priplatky: c ? c.priplatky : null,
    bezDph: c ? c.bezDph : null, bezDphKc: c ? c.bezDphKc : null };
}
/* SERVER: u tisků `sod` připsaných v tomto požadavku (za uloženým začátkem
 * `tisky[]`) přepíše záznam `sod` vlastním výpočtem — klient smí říct jen
 * měnu dokumentu. Vrací počet přepsaných. */
function objSodZaznamyServer(stara, zak, jekly) {
  let n = 0;
  ((zak && zak.varianty) || []).forEach(v => {
    if (!v || !v.zamek || !v.zamek.zamceno || !Array.isArray(v.zamek.tisky)) return;
    const sv = stara && Array.isArray(stara.varianty) ? stara.varianty.find(x => x && x.id === v.id) : null;
    const pocet = sv && sv.zamek && sv.zamek.zamceno && Array.isArray(sv.zamek.tisky) ? sv.zamek.tisky.length : 0;
    let pred = objSodZaznam(sv && sv.zamek && sv.zamek.zamceno ? sv : null);
    v.zamek.tisky.slice(pocet).forEach(t => {
      if (!t || typeof t !== 'object' || t.typ !== 'sod') return;
      const eur = !!(t.sod && typeof t.sod === 'object' && t.sod.mena === 'EUR');
      t.sod = objSodSnimek(zak, v, jekly, eur ? 'en' : 'cz', pred);
      pred = t.sod;
      n++;
    });
  });
  return n;
}
/* Změnily se objednané varianty od posledního tisku SoD? → záznam tisku,
 * jinak null. */
function objZmenenoPoSod(zak, v) {
  const z = objSodZaznam(v);
  if (!z) return null;
  const o = objStav(zak);
  const ted = o && v && o.varianta === v.id ? objOtisk(o) : '';
  return ted === String(z.objOtisk || '') ? null : z;
}

/* HISTORIE ZMĚN PO TISKU SoD (K6-K4): `zak.objednaneZmeny` = [{ varianta,
 * klice, datum, kdo, kdy }] drží SERVER — začátek bere z uložené verze
 * (klient ho nepřepíše ani neubere) a připíše záznam, když se objednané
 * změní u varianty, ke které už byla vytištěná SoD se záznamem. */
const OBJ_ZMENY_MAX = 50;
function objZmenyServer(stara, zak, relace, kdy) {
  const stare = stara && Array.isArray(stara.objednaneZmeny) ? JSON.parse(JSON.stringify(stara.objednaneZmeny)) : [];
  const so = stara ? objStav(stara) : null, no = objStav(zak);
  let zmeny = stare;
  if (objOtisk(so) !== objOtisk(no)) {
    const vari = (z, id) => (z && Array.isArray(z.varianty)) ? z.varianty.find(x => x && x.id === id) : null;
    const ids = [so && so.varianta, no && no.varianta].filter(Boolean);
    const poSod = ids.some(id => objSodZaznam(vari(stara, id)));
    if (poSod) zmeny = stare.concat([{ varianta: String((no || so).varianta || ''), klice: no ? no.klice.slice() : [],
      datum: no ? String(no.datum || '') : '', kdo: String((relace && relace.email) || ''), kdy: kdy || new Date().toISOString() }])
      .slice(-OBJ_ZMENY_MAX);
  }
  if (zmeny.length) zak.objednaneZmeny = zmeny; else delete zak.objednaneZmeny;
  return zmeny;
}
/* Obnova ze serverového otisku: historie ze zálohy, jen povolená pole a tvar. */
function objZmenyOciste(seznam) {
  const t = x => (typeof x === 'string' ? x.slice(0, 200) : '');
  return (Array.isArray(seznam) ? seznam : []).filter(z => z && typeof z === 'object' && !Array.isArray(z))
    .slice(-OBJ_ZMENY_MAX).map(z => ({ varianta: t(z.varianta), klice: Array.isArray(z.klice) ? z.klice.filter(k => typeof k === 'string').slice(0, OBJ_MAX_KLICU) : [],
      datum: t(z.datum), kdo: t(z.kdo), kdy: t(z.kdy) }));
}

/* Neúplná dvojice v klíčích (K6-K3): seznam názvů položek, ze kterých je
 * objednaná jen část, ačkoli nabídka nabízela celou. */
function objNeuplne(klice, nab) {
  return objPolozky(nab).filter(p => p.klice.length > 1)
    .filter(p => { const n = p.klice.filter(k => klice.includes(k)).length; return n > 0 && n < p.klice.length; })
    .map(p => p.nazev);
}

/* Text do krycího listu: „2 – Název, Název (21. 10. 2026)" / „nic". */
function objText(zak, v, jekly) {
  const o = objStav(zak);
  if (!o || !v || o.varianta !== v.id) return 'nic objednáno';
  const p = objObjednaneVarianty(zak, v, jekly);
  if (!p.length) return 'nic objednáno';
  const dat = objDatumPlatne(o.datum) ? ' (' + o.datum.split('-').reverse().map(x => String(+x)).join('. ') + ')' : '';
  return p.length + ' – ' + p.map(x => x.nazev).join(', ') + dat;
}

/* Klient: nastaví záznam (prázdný seznam = smazat). Vrací chybu nebo ''. */
function objNastav(zak, v, klice, datum, ctx) {
  if (!zak) return 'Není otevřená zakázka.';
  const k = Array.from(new Set((klice || []).map(String)));
  if (!k.length) { delete zak.objednane; return ''; }
  if (!v || !v.zamek || !v.zamek.zamceno) return 'Objednané příplatky jdou zapsat jen k odeslané (zamčené) nabídce.';
  const c = ctx || {};
  /* Výchozí datum prodeje = datum podpisu z krycího listu (je-li vyplněné
   * a ne v budoucnosti), jinak dnešek. */
  const podpis = objDatumPodpisu(v);
  const vychozi = podpis && podpis <= objDnes(c.ted) ? podpis : objDnes(c.ted);
  zak.objednane = { varianta: v.id, klice: k, datum: objDatumPlatne(datum) ? datum : vychozi,
    kdo: String(c.kdo || ''), kdy: c.kdy || new Date().toISOString() };
  return '';
}

/* Porovnání bez razítek kdo/kdy — změnou je jen jiná varianta, klíče nebo datum.
 * Objekt v poli nepřevádí přes String (K6-S1: {"toString":1} vyhodí TypeError). */
function objOtisk(o) {
  if (!o || typeof o !== 'object' || !Array.isArray(o.klice) || !o.klice.length) return '';
  const t = x => (x !== null && typeof x === 'object') ? JSON.stringify(x) : String(x);
  return JSON.stringify({ v: t(o.varianta || ''), k: o.klice.map(t).slice().sort(), d: t(o.datum || '') });
}
/* Tvar záznamu z požadavku (K6-S1, K6-S3): varianta a datum řetězec, klíče
 * pole řetězců do stropu. Chybějící pole posoudí až pravidla níž. */
function objTvarPlatny(o) {
  if (o === undefined || o === null) return true;
  if (typeof o !== 'object' || Array.isArray(o)) return false;
  if (o.varianta !== undefined && typeof o.varianta !== 'string') return false;
  if (o.datum !== undefined && typeof o.datum !== 'string') return false;
  if (o.klice !== undefined && (!Array.isArray(o.klice) || o.klice.length > OBJ_MAX_KLICU
    || !o.klice.every(k => typeof k === 'string'))) return false;
  return true;
}

/* SERVER: null = v pořádku, jinak { status, chyba }. `relace` = { email, role }.
 * ctx = { jekly, ted } (ted jen pro testy). */
function objKontrola(stara, zak, relace, ctx) {
  const c = ctx || {};
  const nova = zak ? zak.objednane : undefined;
  if (!objTvarPlatny(nova)) return { status: 400, chyba: 'Objednané příplatky mají neplatný tvar' };
  const otNova = objOtisk(nova), otStara = objOtisk(stara && stara.objednane);
  if (otNova === otStara) return null;                              // beze změny (i razítek) projde každému
  const role = String((relace && relace.role) || '');
  const admin = role === 'Administrátor';
  const autor = !!stara && String(stara.autor || '').toLowerCase() === String((relace && relace.email) || '').toLowerCase();
  if (!admin && role !== 'Vedoucí' && !(autor || !stara))
    return { status: 403, chyba: 'Objednané příplatky zapisuje obchodník zakázky, vedoucí nebo administrátor' };
  /* Po podpisu SoD (Q3) jen administrátor — podle ULOŽENÉ verze, u varianty
   * starého i nového záznamu. */
  const vari = (z, id) => (z && Array.isArray(z.varianty)) ? z.varianty.find(x => x && x.id === id) : null;
  const staraVar = stara && stara.objednane ? vari(stara, stara.objednane.varianta) : null;
  if (!admin && staraVar && objPodepsano(staraVar, c.ted))
    return { status: 403, chyba: 'Smlouva o dílo je podepsaná — objednané příplatky mění jen administrátor' };
  if (!otNova) return null;                                          // smazání (před SoD) smí, kdo smí zapisovat
  if (!nova.klice.every(k => OBJ_KLIC_TVAR.test(k)) || new Set(nova.klice).size !== nova.klice.length)
    return { status: 400, chyba: 'Objednané příplatky nesou neplatný nebo zdvojený klíč' };
  if (!objDatumPlatne(nova.datum)) return { status: 400, chyba: 'Datum prodeje (podpisu SoD) chybí nebo je neplatné' };
  if (nova.datum > objDnes(c.ted)) return { status: 400, chyba: 'Datum prodeje (podpisu SoD) nesmí být v budoucnosti' };
  const v = vari(zak, nova.varianta || '');
  if (!v || !v.zamek || !v.zamek.zamceno)
    return { status: 400, chyba: 'Objednané příplatky patří k odeslané (zamčené) variantě' };
  const novaUlozena = vari(stara, v.id);
  if (!admin && novaUlozena && objPodepsano(novaUlozena, c.ted))
    return { status: 403, chyba: 'Smlouva o dílo je podepsaná — objednané příplatky mění jen administrátor' };
  const nab = objNabidnute(v, c.jekly), nabidnute = nab.map(p => p.key);
  const cizi = nova.klice.filter(k => !nabidnute.includes(k));
  if (cizi.length) return { status: 400, chyba: 'Příplatek ' + cizi.join(', ') + ' nebyl v odeslané nabídce nabídnut' };
  const pul = objNeuplne(nova.klice, nab);
  if (pul.length) return { status: 400, chyba: pul.join(', ') + ' jdou objednat jen celé (materiál i montáž) — v nabídce jsou jednou položkou' };
  return null;
}

if (typeof module !== 'undefined' && module.exports)
  module.exports = { OBJ_DATUM_TVAR, OBJ_MAX_KLICU, OBJ_SKUPINY, OBJ_ZMENY_MAX, objPolozky, objPolozkyKlicu, objNeuplne, objCenaDila, objSodZaznam,
    objSodSnimek, objSodZaznamyServer, objZmenenoPoSod, objZmenyServer, objZmenyOciste, objDnes, objDatumPlatne, objStav, objDatumPodpisu, objPodepsano, objNabidnute,
    objObjednaneVarianty, objText, objNastav, objOtisk, objTvarPlatny, objKontrola };
