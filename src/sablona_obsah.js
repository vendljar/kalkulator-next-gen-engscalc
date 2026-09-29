/* ============================================================
 * KONTROLA OBSAHU ŠABLONY WORDU (B99, 29. 9. 2026)
 *
 * PROČ. Server ověřoval jen začátek ZIPu („UEsDB"), průvodce text, jazyk,
 * symboly a strukturu XML. Generátor (docxgen.js) mění jen document /
 * header / footer a zbytek ZIPu — vztahy (_rels), settings.xml.rels,
 * vložené objekty — kopíruje beze změny; totéž překlad šablony. EN verze od
 * externího překladatele se vztahem attachedTemplate na cizí server by
 * prošla kontrolami, zveřejnila se jako nabidka_en a každá EN nabídka by si
 * u zákazníka při otevření ve Wordu stáhla cizí šablonu s makry (u cesty
 * \\server\share by prozradila i otisk hesla NTLM).
 *
 * CO SE ODMÍTÁ (šablona, ne výsledný dokument — ten z ní jen vzniká):
 *   – vztah s TargetMode="External", kromě hypertextového odkazu na http:,
 *     https: nebo mailto: (odkaz Word sám nestahuje; mailto: nesou dnešní
 *     firemní šablony PROJ — bez něj by neprošly);
 *   – typy vztahů attachedTemplate, oleObject, package, aFChunk (altChunk),
 *     vbaProject, frame a subDocument — bez ohledu na cíl;
 *   – části word/embeddings/*, vbaProject*.bin, cokoli s „activeX";
 *   – typ obsahu macroEnabled nebo vbaProject v [Content_Types].xml;
 *   – pole INCLUDETEXT, INCLUDEPICTURE, DDE, DDEAUTO (w:instrText, i když
 *     je kód pole rozdělený do více běhů, a w:fldSimple).
 *
 * Jedna funkce pro prohlížeč (průvodce, generátor) i server (zveřejnění,
 * jadro_moduly.cjs). Nic neopravuje ani nevyhazuje — vadnou šablonu odmítne
 * a řekne, co vadí.
 * ============================================================ */

const SABLONA_VZTAHY_ZAKAZANE = ['attachedTemplate', 'oleObject', 'package', 'aFChunk', 'vbaProject', 'frame', 'subDocument'];
const SABLONA_ODKAZ_POVOLENY = /^(https?:|mailto:)/i;
const SABLONA_POLE_ZAKAZANA = /\b(INCLUDETEXT|INCLUDEPICTURE|DDEAUTO|DDE)\b/i;

function sablonaObsahText(data) {
  if (typeof data === 'string') return data;
  if (!data) return '';
  try { return new TextDecoder().decode(data); } catch (e) { return ''; }
}
function sablonaAtribut(tag, jmeno) {
  const m = new RegExp('\\s' + jmeno + '\\s*=\\s*("([^"]*)"|\'([^\']*)\')').exec(tag);
  return m ? (m[2] !== undefined ? m[2] : m[3]) : '';
}
function sablonaXmlUnesc(s) {
  return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

/* Kontrola nad rozbaleným ZIPem: polozky = [{ nazev, data }] (data jako
 * Uint8Array z zipPrecti nebo text). Vrací seznam českých popisů vad;
 * prázdný = šablona je v pořádku. */
function sablonaObsahVadyZipu(polozky) {
  const vady = [];
  const pridej = (t) => { if (vady.indexOf(t) < 0) vady.push(t); };
  (Array.isArray(polozky) ? polozky : []).forEach(p => {
    if (!p || typeof p.nazev !== 'string') return;
    const nazev = p.nazev, male = nazev.toLowerCase();
    if (/^word\/embeddings\//i.test(nazev)) pridej('vložený objekt (' + nazev + ')');
    if (/vbaproject[^/]*\.bin$/i.test(nazev) || /(^|\/)vbaproject/i.test(male)) pridej('makra VBA (' + nazev + ')');
    if (male.indexOf('activex') >= 0) pridej('prvek ActiveX (' + nazev + ')');
    if (nazev === '[Content_Types].xml') {
      const ct = sablonaObsahText(p.data);
      if (/macroEnabled/i.test(ct)) pridej('dokument s makry (typ obsahu macroEnabled)');
      if (/vbaProject/i.test(ct)) pridej('makra VBA (typ obsahu vbaProject)');
    }
    if (/\.rels$/i.test(nazev)) {
      const xml = sablonaObsahText(p.data);
      (xml.match(/<(?:\w+:)?Relationship\b[^>]*>/g) || []).forEach(tag => {
        const typ = sablonaAtribut(tag, 'Type'), cil = sablonaXmlUnesc(sablonaAtribut(tag, 'Target'));
        const druh = typ.split('/').pop();
        const externi = /^external$/i.test(sablonaAtribut(tag, 'TargetMode'));
        if (SABLONA_VZTAHY_ZAKAZANE.some(z => z.toLowerCase() === druh.toLowerCase()))
          pridej('vztah ' + druh + (externi ? ' na vnější adresu' : '') + ' (' + nazev + ')');
        else if (externi && !(druh.toLowerCase() === 'hyperlink' && SABLONA_ODKAZ_POVOLENY.test(cil.trim())))
          pridej('vnější vztah ' + (druh || '?') + (druh.toLowerCase() === 'hyperlink' ? ' s nepovolenou adresou' : '') + ' (' + nazev + ')');
      });
    }
    if (/^word\/[^/]+\.xml$/i.test(nazev)) {
      const xml = sablonaObsahText(p.data);
      /* Kód pole bývá rozdělený do více běhů (<w:instrText>INCLU</…><…>DETEXT</…>) —
       * proto se texty spojí dohromady, a zvlášť se hlídá fldSimple. */
      const instr = (xml.match(/<w:instrText\b[^>]*>([\s\S]*?)<\/w:instrText>/g) || [])
        .map(x => x.replace(/<[^>]+>/g, '')).join('');
      const simple = (xml.match(/<w:fldSimple\b[^>]*>/g) || []).map(t => sablonaXmlUnesc(sablonaAtribut(t, 'w:instr'))).join(' ');
      const m = SABLONA_POLE_ZAKAZANA.exec(sablonaXmlUnesc(instr) + ' ' + simple);
      if (m) pridej('pole ' + m[1].toUpperCase() + ' (' + nazev + ')');
    }
  });
  return vady;
}

/* Base64 → bajty v prohlížeči i v Node. */
function sablonaB64NaBajty(b64) {
  const s = String(b64 || '');
  if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') return new Uint8Array(Buffer.from(s, 'base64'));
  const bin = atob(s);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}
function sablonaZipCtecka() {
  if (typeof zipPrecti === 'function') return zipPrecti;
  if (typeof require === 'function') { try { return require('./docxgen.js').zipPrecti; } catch (e) { /* nic */ } }
  return null;
}
/* Šablona jako ArrayBuffer / Uint8Array / base64 → seznam vad. Nečitelný
 * ZIP je taky vada (šablona, která nejde rozbalit, nemá co zveřejnit). */
async function sablonaObsahVady(vstup) {
  const cti = sablonaZipCtecka();
  if (!cti) return ['kontrolu obsahu šablony nejde provést (chybí čtení ZIP)'];
  let u8;
  if (typeof vstup === 'string') u8 = sablonaB64NaBajty(vstup);
  else if (vstup instanceof Uint8Array) u8 = vstup;
  else if (vstup && typeof vstup.byteLength === 'number') u8 = new Uint8Array(vstup);
  else return ['šablona je prázdná'];
  let polozky;
  try { polozky = await cti(u8); } catch (e) { return ['soubor nejde rozbalit jako .docx (' + e.message + ')']; }
  return sablonaObsahVadyZipu(polozky);
}
function sablonaObsahVadyText(vady) {
  return 'Šablona obsahuje prvky, které Word načítá nebo spouští mimo dokument: ' + (vady || []).join('; ')
    + '. Takovou šablonu nejde zveřejnit ani z ní generovat — uložte ji ve Wordu znovu jako obyčejný .docx '
    + 'bez maker, vložených objektů a propojení na jiné soubory.';
}

if (typeof module !== 'undefined')
  module.exports = { SABLONA_VZTAHY_ZAKAZANE, sablonaObsahVadyZipu, sablonaObsahVady, sablonaObsahVadyText, sablonaB64NaBajty };
