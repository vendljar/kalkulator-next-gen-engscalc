/* ============================================================
 * LHŮTY PROJ (D8, dotaz obchodu, rozhodnutí J. V. 19. 11. 2026)
 *
 * Termíny krycího listu PROJ se dopočítávají ze lhůt v týdnech. Lhůty jsou
 * FIREMNÍ údaj (Nastavení → Firma, jen administrátor, zveřejňuje se
 * s firmou: `NAST.firma.lhutyProj`). Táž tabulka dává čísla i do textu
 * termínů v nabídce PROJ (online náhled i Word, všechny jazyky), takže text
 * a výpočet se nerozejdou.
 *
 *   – Tvar: { v: 1, platnostOd: 'RRRR-MM-DD', radky: { <id>: { od?, do } } }.
 *     `do` = horní mez (u rozpětí se počítá s ní), `od` = dolní mez rozpětí
 *     (jen do textu). Jednotka řádku je týden, u úřadů měsíc (= 4,3 týdne,
 *     jak to říká text nabídky).
 *   – Text: výchozí znění termínů (podminky.js, PODMINKY_VYCHOZI) se nemění.
 *     Řádek, jehož text (česky i v překladu) se shoduje s výchozím zněním
 *     dosazeným VÝCHOZÍ tabulkou, dostane čísla z platné tabulky (symboly
 *     {LHUTA_<ID>} v LHUTY_PROJ_TEXTY). Vlastní (upravené) znění se
 *     nepozná — zůstane pevné a kontrola (lhutyProjPevneRadky) na to upozorní.
 *   – Zámek: odeslaná nabídka bere lhůty ze snímku podmínek (podminky.js),
 *     prodaná zakázka ze snímku `data.kryciProj.lhutyProj` zapsaného při
 *     Prodáno (lhutyProjZmraz). Změna tabulky je tedy nemění.
 *   – Dopočet (lhutyProjDopocet): základ = datum podpisu z Prodáno; řetězem
 *     jen přes činnosti, které varianta nabízí; ruční datum má přednost
 *     a řetěz pokračuje od něj.
 *
 * Čistá logika bez DOM (prohlížeč i server, test src/test_d8_lhuty.js).
 * ============================================================ */

const LHUTY_PROJ_TYDNU_MESIC = 4.3;
/* Řádky tabulky. `j` = jednotka ('t' týdny, 'm' měsíce úřadů). */
const LHUTY_PROJ_DEF = [
  { id: 'zamereni', label: 'Zaměření na stavbě', j: 't', vychozi: { do: 4 }, pozn: 'od objednání a předání plné moci (podpis)' },
  { id: 'vystupy', label: 'Výstupy ze zaměření', j: 't', vychozi: { od: 4, do: 6 }, pozn: 'od zaměření' },
  { id: 'studie', label: 'Studie proveditelnosti', j: 't', vychozi: { od: 10, do: 12 }, pozn: 'od předání podkladů' },
  { id: 'dpz', label: 'Hrubopis DPZ', j: 't', vychozi: { od: 10, do: 12 }, pozn: 'od schválení studie; bez studie od předání podkladů (horní mez)' },
  { id: 'stanoviska', label: 'Stanoviska dotčených orgánů', j: 't', vychozi: { do: 4 }, pozn: 'od podání žádosti' },
  { id: 'povoleni', label: 'Povolení záměru (úřad)', j: 'm', vychozi: { do: 2 }, pozn: 'od podání žádosti' },
  { id: 'pravniMoc', label: 'Nabytí právní moci povolení', j: 'm', vychozi: { do: 1 }, pozn: 'po povolení záměru' },
  { id: 'dps', label: 'Dokumentace pro provedení stavby (DPS)', j: 't', vychozi: { do: 6 }, pozn: 'od povolení záměru' },
];
const LHUTY_PROJ_PLATNOST_VYCHOZI = '2026-11-19';
const LHUTY_PROJ_MAX = { t: 260, m: 60 };

const lhObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
const lhDef = id => LHUTY_PROJ_DEF.find(d => d.id === id) || null;
const lhDatumPlatne = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)
  && !isNaN(Date.parse(x + 'T00:00:00Z')) && new Date(x + 'T00:00:00Z').toISOString().slice(0, 10) === x;
/* Číslo lhůty: kladné, nejvýš dvě desetinná místa (text „12,5" z formuláře
 * projde jako 12.5). */
function lhCislo(x) {
  if (typeof x === 'number') return isFinite(x) ? x : NaN;
  if (typeof x !== 'string' || !x.trim()) return NaN;
  const t = x.trim().replace(',', '.');
  return /^\d+(\.\d{1,2})?$/.test(t) ? Number(t) : NaN;
}

function lhutyProjVychozi() {
  const radky = {};
  LHUTY_PROJ_DEF.forEach(d => { radky[d.id] = Object.assign({}, d.vychozi); });
  return { v: 1, platnostOd: LHUTY_PROJ_PLATNOST_VYCHOZI, radky };
}

/* Vady uložené tabulky (Firma). undefined/null = výchozí, není vada. */
function lhutyProjVady(x) {
  if (x === undefined || x === null) return [];
  if (!lhObj(x)) return ['lhůty PROJ nejsou objekt'];
  const vady = [];
  Object.keys(x).forEach(k => { if (['v', 'platnostOd', 'radky'].indexOf(k) < 0) vady.push('neznámý klíč lhůt „' + String(k).slice(0, 40) + '“'); });
  if (x.platnostOd !== undefined && !lhDatumPlatne(x.platnostOd)) vady.push('datum platnosti lhůt není platné datum');
  if (x.radky !== undefined && !lhObj(x.radky)) vady.push('řádky lhůt nejsou objekt');
  if (lhObj(x.radky)) Object.keys(x.radky).forEach(id => {
    const d = lhDef(id);
    if (!d) { vady.push('neznámá lhůta „' + String(id).slice(0, 40) + '“'); return; }
    const r = x.radky[id];
    if (!lhObj(r)) { vady.push(d.label + ': není objekt'); return; }
    Object.keys(r).forEach(k => { if (k !== 'od' && k !== 'do') vady.push(d.label + ': neznámý klíč „' + String(k).slice(0, 20) + '“'); });
    const hd = lhCislo(r.do);
    if (!(hd > 0) || hd > LHUTY_PROJ_MAX[d.j]) vady.push(d.label + ': horní mez musí být kladné číslo nejvýš ' + LHUTY_PROJ_MAX[d.j]);
    if (r.od !== undefined && r.od !== null && r.od !== '') {
      const ho = lhCislo(r.od);
      if (!(ho > 0) || !(ho <= hd)) vady.push(d.label + ': dolní mez musí být kladná a nejvýš rovná horní');
    }
  });
  return vady;
}
/* Čistá kopie platné tabulky (jen známé klíče, čísla jako čísla). */
function lhutyProjCisty(x) {
  if (!lhObj(x) || lhutyProjVady(x).length) return null;
  const out = { v: 1, platnostOd: lhDatumPlatne(x.platnostOd) ? x.platnostOd : LHUTY_PROJ_PLATNOST_VYCHOZI, radky: {} };
  if (lhObj(x.radky)) Object.keys(x.radky).forEach(id => {
    const r = x.radky[id];
    const o = {};
    if (r.od !== undefined && r.od !== null && r.od !== '') o.od = lhCislo(r.od);
    o.do = lhCislo(r.do);
    out.radky[id] = o;
  });
  return out;
}
/* Platná tabulka: uložená (čistá) doplněná výchozími řádky; vadná = výchozí. */
function lhutyProjEf(x) {
  const zaklad = lhutyProjVychozi();
  const c = lhutyProjCisty(x);
  if (!c) return zaklad;
  zaklad.platnostOd = c.platnostOd;
  Object.keys(c.radky).forEach(id => { zaklad.radky[id] = c.radky[id]; });
  return zaklad;
}

/* ---------- text ---------- */

function lhutyProjCisloText(n, L) {
  const t = String(Math.round(n * 100) / 100);
  return L === 'en' ? t : t.replace('.', ',');
}
/* {LHUTA_<ID>} = rozpětí (nebo jedno číslo), {LHUTA_<ID>_DO} = horní mez. */
function lhutyProjSymbol(id) { return 'LHUTA_' + id.replace(/([A-Z])/g, '_$1').toUpperCase(); }
function lhutyProjDosad(text, lhuty, L) {
  const ef = lhObj(lhuty) && lhObj(lhuty.radky) ? lhuty : lhutyProjEf(lhuty);
  let out = String(text == null ? '' : text);
  LHUTY_PROJ_DEF.forEach(d => {
    const r = ef.radky[d.id] || d.vychozi;
    const hd = lhutyProjCisloText(r.do, L);
    const rozp = (r.od != null && r.od !== r.do) ? lhutyProjCisloText(r.od, L) + (L === 'fr' ? ' à ' : '–') + hd : hd;
    const s = lhutyProjSymbol(d.id);
    out = out.split('{' + s + '_DO}').join(hd).split('{' + s + '}').join(rozp);
  });
  return out;
}

/* Výchozí znění termínů se symboly lhůt — česky a v překladu slovníku
 * (preklad.js). Shodu hlídá test: dosazení VÝCHOZÍ tabulky dá přesně
 * PODMINKY_VYCHOZI a překlad slovníku. Řádky bez symbolů jsou známé znění
 * bez čísla z tabulky (kontrola je nehlásí jako pevné). */
const LHUTY_PROJ_TEXTY = [
  { sekce: 'zamereni',
    cz: 'ZAMĚŘENÍ na stavbě do {LHUTA_ZAMERENI} týdnů od objednání a předání plné moci; zpracování VÝSTUPŮ do {LHUTA_VYSTUPY} týdnů od zaměření',
    en: 'On-site SURVEY within {LHUTA_ZAMERENI} weeks of the order and handover of the power of attorney; processing of the OUTPUTS within {LHUTA_VYSTUPY} weeks of the survey',
    de: 'AUFMASS vor Ort innerhalb von {LHUTA_ZAMERENI} Wochen nach Bestellung und Übergabe der Vollmacht; Auswertung der ERGEBNISSE innerhalb von {LHUTA_VYSTUPY} Wochen nach dem Aufmaß',
    fr: 'RELEVÉ sur site dans les {LHUTA_ZAMERENI} semaines suivant la commande et la remise de la procuration ; traitement des LIVRABLES dans les {LHUTA_VYSTUPY} semaines suivant le relevé' },
  { sekce: 'studie',
    cz: 'do {LHUTA_STUDIE} týdnů od předání podkladů',
    en: 'within {LHUTA_STUDIE} weeks of handover of the documents',
    de: 'innerhalb von {LHUTA_STUDIE} Wochen nach Übergabe der Unterlagen',
    fr: 'dans les {LHUTA_STUDIE} semaines suivant la remise des documents' },
  { sekce: 'studie', stare: true,
    cz: 'do {LHUTA_STUDIE} týdnů od zpracování výstupů ze zaměření',
    en: 'within {LHUTA_STUDIE} weeks of processing of the survey outputs',
    de: 'innerhalb von {LHUTA_STUDIE} Wochen nach Auswertung des Aufmaßes',
    fr: 'dans les {LHUTA_STUDIE} semaines suivant le traitement des livrables du relevé' },
  { sekce: 'dpz+studie',
    cz: 'do {LHUTA_DPZ} týdnů od schválení studie investorem a objednání',
    en: 'within {LHUTA_DPZ} weeks of approval of the study by the client and the order',
    de: 'innerhalb von {LHUTA_DPZ} Wochen nach Genehmigung der Studie durch den Bauherrn und Bestellung',
    fr: "dans les {LHUTA_DPZ} semaines suivant l'approbation de l'étude par le maître d'ouvrage et la commande" },
  { sekce: 'dpz-studie',
    cz: 'do {LHUTA_DPZ_DO} týdnů od předání podkladů',
    en: 'within {LHUTA_DPZ_DO} weeks of handover of the documents',
    de: 'innerhalb von {LHUTA_DPZ_DO} Wochen nach Übergabe der Unterlagen',
    fr: 'dans les {LHUTA_DPZ_DO} semaines suivant la remise des documents' },
  { sekce: 'dpz-studie', stare: true,
    cz: 'do {LHUTA_DPZ_DO} týdnů od zpracování výstupů ze zaměření',
    en: 'within {LHUTA_DPZ_DO} weeks of processing the survey outputs',
    de: 'innerhalb von {LHUTA_DPZ_DO} Wochen nach Ausarbeitung der Aufmaßergebnisse',
    fr: "dans un délai de {LHUTA_DPZ_DO} semaines après l'élaboration des résultats du relevé" },
  { sekce: 'ic',
    cz: 'cca do {LHUTA_STANOVISKA} týdnů od podání žádosti (v případě potřeby stanoviska hygieny a/nebo památkové péče cca do 2,5 měsíce)',
    en: 'approx. within {LHUTA_STANOVISKA} weeks of submission of the application (if opinions of the public health authority and/or heritage preservation are required, approx. up to 2.5 months)',
    de: 'ca. innerhalb von {LHUTA_STANOVISKA} Wochen nach Antragstellung (falls Stellungnahmen des Gesundheitsamts und/oder des Denkmalschutzes erforderlich sind, ca. bis zu 2,5 Monate)',
    fr: "environ dans les {LHUTA_STANOVISKA} semaines suivant le dépôt de la demande (si des avis de l'autorité sanitaire et/ou du patrimoine sont nécessaires, environ jusqu'à 2,5 mois)" },
  /* Bez čísla z tabulky (14 dní jen „v případě nutnosti") — známé znění, kontrola ho nehlásí. */
  { sekce: 'ic',
    cz: "po obdržení souhlasných stanovisek dotčených orgánů (+ 14 dní v případě nutnosti zapracování podmínek dotčených orgánů do dokumentace)",
    en: "after receipt of the approving opinions of the authorities concerned (+ 14 days if the authorities' conditions have to be incorporated into the documentation)",
    de: "nach Erhalt der zustimmenden Stellungnahmen der betroffenen Behörden (+ 14 Tage, falls deren Auflagen in die Unterlagen eingearbeitet werden müssen)",
    fr: "après réception des avis favorables des autorités concernées (+ 14 jours s'il faut intégrer leurs conditions dans le dossier)" },
  { sekce: 'ic',
    cz: 'cca {LHUTA_POVOLENI} měsíce od podání žádosti + {LHUTA_PRAVNI_MOC} měsíc na nabytí právní moci povolení záměru',
    en: 'approx. {LHUTA_POVOLENI} months from submission of the application + {LHUTA_PRAVNI_MOC} month for the project permit to become final',
    de: 'ca. {LHUTA_POVOLENI} Monate nach Antragstellung + {LHUTA_PRAVNI_MOC} Monat bis zur Rechtskraft der Vorhabengenehmigung',
    fr: "environ {LHUTA_POVOLENI} mois après le dépôt de la demande + {LHUTA_PRAVNI_MOC} mois pour que l'autorisation du projet devienne définitive" },
  { sekce: 'dps',
    cz: 'cca do {LHUTA_DPS} týdnů od schválení dokumentace a povolení záměru stavebním úřadem',
    en: 'approx. within {LHUTA_DPS} weeks of approval of the documentation and of the project permit by the building authority',
    de: 'ca. innerhalb von {LHUTA_DPS} Wochen nach Genehmigung der Unterlagen und der Vorhabengenehmigung durch das Bauamt',
    fr: "environ dans les {LHUTA_DPS} semaines suivant l'approbation du dossier et l'autorisation du projet par le service de l'urbanisme" },
];
/* Sekce termínů, jejichž čísla mají jít z tabulky (kontrola pevného textu). */
const LHUTY_PROJ_SEKCE_TEXTU = ['zamereni', 'studie', 'dpz+studie', 'dpz-studie', 'ic', 'dps'];

const lhNorm = s => String(s == null ? '' : s).replace(/[–—]/g, '-').replace(/[‘’]/g, "'")
  .replace(/ /g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
/* Text termínu v jazyce L → { text, znamy }. Známé výchozí znění dostane čísla
 * z tabulky `lhuty`; jiné zůstane, jak je (znamy = false). */
function lhutyProjText(text, lhuty, L) {
  const jaz = L || 'cz';
  const n = lhNorm(text);
  if (!n) return { text, znamy: false };
  const vych = lhutyProjVychozi();
  const z = LHUTY_PROJ_TEXTY.find(t => t[jaz] && lhNorm(lhutyProjDosad(t[jaz], vych, jaz)) === n);
  return z ? { text: lhutyProjDosad(z[jaz], lhuty, jaz), znamy: true } : { text, znamy: false };
}
/* Řádky termínů s pevným číslem (vlastní znění, které tabulka neovládne):
 * [{ jazyk, cinnost, text }]. `radky` = podminkyTextProj(...) v jazyce. */
function lhutyProjPevneRadky(radky, jaz) {
  return (Array.isArray(radky) ? radky : []).filter(r => Array.isArray(r)
    && LHUTY_PROJ_SEKCE_TEXTU.indexOf(String(r[2])) >= 0 && /\d/.test(String(r[1]))
    && !lhutyProjText(r[1], null, jaz).znamy)
    .map(r => ({ jazyk: jaz || 'cz', cinnost: String(r[0]), text: String(r[1]) }));
}

/* ---------- dopočet termínů krycího listu ---------- */

function lhutyProjPlusDny(iso, dny) {
  const t = Date.parse(iso + 'T00:00:00Z') + Math.ceil(dny - 1e-9) * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}
function lhutyProjTydnyText(n) {
  const t = lhutyProjCisloText(n, 'cz');
  if (Math.round(n) !== n) return t + ' týdne';
  return t + (n === 1 ? ' týden' : (n >= 2 && n <= 4) ? ' týdny' : ' týdnů');
}
function lhutyProjMesiceText(n) {
  const t = lhutyProjCisloText(n, 'cz');
  if (Math.round(n) !== n) return t + ' měsíce';
  return t + (n === 1 ? ' měsíc' : (n >= 2 && n <= 4) ? ' měsíce' : ' měsíců');
}
/* Pole krycího listu PROJ, která dopočet plní (v pořadí řetězu). */
const LHUTY_PROJ_POLE = ['terminZahajeni', 'terminZamereni', 'terminStudie', 'terminDpz', 'terminPovoleni', 'terminDps'];

/* ctx = { podpis: 'RRRR-MM-DD' (datum z Prodáno) | '', lhuty: tabulka (snímek)
 *         | null, nabizi: sekce → bool, rucne: { pole: 'RRRR-MM-DD' } }
 * Vrací { <pole>: { datum, zdroj } } — `datum` '' = nedopočteno, `zdroj`
 * říká z čeho (nebo proč ne). Ruční datum pole má přednost a řetěz od něj
 * pokračuje (dopočet ho nepřepíše). */
function lhutyProjDopocet(ctx) {
  const c = ctx || {};
  const out = {};
  const nic = zdroj => { LHUTY_PROJ_POLE.forEach(p => { out[p] = { datum: '', zdroj }; }); return out; };
  if (!lhDatumPlatne(c.podpis)) return nic('dopočte se po prodeji (datum podpisu z tlačítka Prodáno)');
  if (!c.lhuty) return nic('prodáno před zavedením lhůt PROJ — termíny se nedopočítávají, zadejte je ručně');
  const ef = lhutyProjEf(c.lhuty);
  const L = id => (ef.radky[id] || lhDef(id).vychozi).do;
  const nabizi = typeof c.nabizi === 'function' ? c.nabizi : () => false;
  const rucne = lhObj(c.rucne) ? c.rucne : {};
  const ucinne = pole => lhDatumPlatne(rucne[pole]) ? rucne[pole] : (out[pole] && out[pole].datum) || '';
  const plus = (pole, od, odText, tydny, rozpis) => {
    out[pole] = { datum: lhutyProjPlusDny(od, tydny * 7), zdroj: odText + ' + ' + lhutyProjTydnyText(tydny) + (rozpis ? ' (' + rozpis + ')' : '') };
  };
  const nenabizi = 'činnost varianta nenabízí';
  out.terminZahajeni = { datum: c.podpis, zdroj: 'datum podpisu (Prodáno)' };
  let prev = ucinne('terminZahajeni'), prevText = 'podpis';
  if (nabizi('zamereni')) {
    plus('terminZamereni', prev, prevText, L('zamereni') + L('vystupy'),
      'zaměření ' + lhutyProjCisloText(L('zamereni'), 'cz') + ' + výstupy ' + lhutyProjCisloText(L('vystupy'), 'cz'));
    prev = ucinne('terminZamereni'); prevText = 'výstupy ze zaměření';
  } else out.terminZamereni = { datum: '', zdroj: nenabizi };
  if (nabizi('studie')) {
    plus('terminStudie', prev, prevText, L('studie'));
    prev = ucinne('terminStudie'); prevText = 'studie';
  } else out.terminStudie = { datum: '', zdroj: nenabizi };
  const dpz = nabizi('dpz');
  if (dpz) {
    plus('terminDpz', prev, prevText, L('dpz'));
    prev = ucinne('terminDpz'); prevText = 'DPZ';
  } else out.terminDpz = { datum: '', zdroj: nenabizi };
  const ic = nabizi('ic');
  if (ic) {
    const mes = L('povoleni') + L('pravniMoc');
    const tydny = Math.round((L('stanoviska') + mes * LHUTY_PROJ_TYDNU_MESIC) * 100) / 100;
    plus('terminPovoleni', prev, prevText, tydny, 'stanoviska ' + lhutyProjTydnyText(L('stanoviska')) + ' + povolení a právní moc '
      + lhutyProjMesiceText(mes) + ' × ' + lhutyProjCisloText(LHUTY_PROJ_TYDNU_MESIC, 'cz'));
    prev = ucinne('terminPovoleni'); prevText = 'povolení záměru';
  } else out.terminPovoleni = { datum: '', zdroj: 'inženýrskou činnost (povolení záměru) varianta nenabízí' };
  if (!nabizi('dps')) out.terminDps = { datum: '', zdroj: nenabizi };
  else if (!ic && dpz && !lhDatumPlatne(rucne.terminPovoleni))
    out.terminDps = { datum: '', zdroj: 'povolení záměru nezajišťujeme — zadejte předpoklad povolení, DPS se dopočte od něj' };
  else {
    if (!ic && lhDatumPlatne(rucne.terminPovoleni)) { prev = rucne.terminPovoleni; prevText = 'povolení záměru'; }
    plus('terminDps', prev, prevText, L('dps'));
  }
  return out;
}

/* Snímek lhůt do prodávané varianty (Prodáno): platná tabulka Firmy. Zapíše
 * se jen jednou — prodaná varianta se už nemění (server hlídá). */
function lhutyProjZmraz(v, firma) {
  if (!v || !lhObj(v.data) || !lhObj(v.data.proj)) return null;
  if (!lhObj(v.data.kryciProj)) v.data.kryciProj = { hodnoty: {} };
  v.data.kryciProj.lhutyProj = lhutyProjEf(firma && firma.lhutyProj);
  return v.data.kryciProj.lhutyProj;
}

if (typeof module !== 'undefined')
  module.exports = { LHUTY_PROJ_DEF, LHUTY_PROJ_TYDNU_MESIC, LHUTY_PROJ_TEXTY, LHUTY_PROJ_SEKCE_TEXTU, LHUTY_PROJ_POLE,
    LHUTY_PROJ_PLATNOST_VYCHOZI, lhutyProjVychozi, lhutyProjVady, lhutyProjCisty, lhutyProjEf, lhutyProjDosad,
    lhutyProjSymbol, lhutyProjText, lhutyProjPevneRadky, lhutyProjDopocet, lhutyProjPlusDny, lhutyProjZmraz,
    lhutyProjCisloText };
