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
const OBJ_KLIC_TVAR = /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/;
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

/* Objednané příplatky varianty s cenami: [{ key, nazev, sMarzi, naklad }]
 * — jen ty, které záznam zakázky uvádí PRO TUTO variantu. */
function objObjednaneVarianty(zak, v, jekly) {
  const o = objStav(zak);
  if (!o || !v || o.varianta !== v.id) return [];
  return objNabidnute(v, jekly).filter(p => o.klice.includes(p.key));
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

/* Porovnání bez razítek kdo/kdy — změnou je jen jiná varianta, klíče nebo datum. */
function objOtisk(o) {
  if (!o || typeof o !== 'object' || !Array.isArray(o.klice) || !o.klice.length) return '';
  return JSON.stringify({ v: String(o.varianta || ''), k: o.klice.map(String).slice().sort(), d: String(o.datum || '') });
}

/* SERVER: null = v pořádku, jinak { status, chyba }. `relace` = { email, role }.
 * ctx = { jekly, ted } (ted jen pro testy). */
function objKontrola(stara, zak, relace, ctx) {
  const c = ctx || {};
  const nova = zak ? zak.objednane : undefined;
  const otNova = objOtisk(nova), otStara = objOtisk(stara && stara.objednane);
  if (nova !== undefined && nova !== null && (typeof nova !== 'object' || Array.isArray(nova)))
    return { status: 400, chyba: 'Objednané příplatky mají neplatný tvar' };
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
  if (!nova.klice.every(k => typeof k === 'string' && OBJ_KLIC_TVAR.test(k)) || nova.klice.length > OBJ_MAX_KLICU
    || new Set(nova.klice).size !== nova.klice.length)
    return { status: 400, chyba: 'Objednané příplatky nesou neplatný nebo zdvojený klíč' };
  if (!objDatumPlatne(nova.datum)) return { status: 400, chyba: 'Datum prodeje (podpisu SoD) chybí nebo je neplatné' };
  if (nova.datum > objDnes(c.ted)) return { status: 400, chyba: 'Datum prodeje (podpisu SoD) nesmí být v budoucnosti' };
  const v = vari(zak, String(nova.varianta || ''));
  if (!v || !v.zamek || !v.zamek.zamceno)
    return { status: 400, chyba: 'Objednané příplatky patří k odeslané (zamčené) variantě' };
  const novaUlozena = vari(stara, v.id);
  if (!admin && novaUlozena && objPodepsano(novaUlozena, c.ted))
    return { status: 403, chyba: 'Smlouva o dílo je podepsaná — objednané příplatky mění jen administrátor' };
  const nabidnute = objNabidnute(v, c.jekly).map(p => p.key);
  const cizi = nova.klice.filter(k => !nabidnute.includes(k));
  if (cizi.length) return { status: 400, chyba: 'Příplatek ' + cizi.join(', ') + ' nebyl v odeslané nabídce nabídnut' };
  return null;
}

if (typeof module !== 'undefined' && module.exports)
  module.exports = { OBJ_DATUM_TVAR, OBJ_MAX_KLICU, objDnes, objDatumPlatne, objStav, objDatumPodpisu, objPodepsano, objNabidnute,
    objObjednaneVarianty, objText, objNastav, objOtisk, objKontrola };
