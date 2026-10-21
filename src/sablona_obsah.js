/* ============================================================
 * KONTROLA OBSAHU ŠABLONY WORDU (B99, 29. 9. 2026; B115, 6. 10. 2026)
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
 *   – vnější vztah (TargetMode jiný než Internal, nebo cíl se schématem
 *     file:, C:, síťovou cestou \\server či //server), kromě hypertextového
 *     odkazu na http:, https: nebo mailto: (odkaz Word sám nestahuje;
 *     mailto: nesou dnešní firemní šablony PROJ — bez něj by neprošly);
 *   – typy vztahů attachedTemplate, oleObject, package, aFChunk (altChunk),
 *     vbaProject, frame, subDocument, ActiveX a VBA data — bez ohledu na cíl;
 *   – části embeddings/*, vbaProject*, oleObject*, cokoli s „activeX"
 *     (v kterékoli složce);
 *   – typ obsahu macroEnabled, vbaProject, oleObject nebo activeX
 *     v [Content_Types].xml;
 *   – prvky OLEObject, altChunk a subDoc (s jakýmkoli prefixem);
 *   – pole INCLUDETEXT, INCLUDEPICTURE, INCLUDE, IMPORT, LINK, DDE, DDEAUTO,
 *     DATABASE, RD (složené pole fldChar/instrText i s kódem rozděleným do
 *     více běhů, fldSimple) a pole, jehož typ dodá teprve vnořené pole;
 *   – hromadná korespondence s připojením k datům (connectString, query);
 *   – deklarace DOCTYPE / ENTITY (vlastní entity by zakázaný text skryly);
 *   – neuzavřená značka, komentář, CDATA nebo instrukce zpracování.
 *
 * B139–B143 (audit 12. 10. 2026): prefix s ne-ASCII písmenem (<é:instrText>)
 * kontrola neznala; atribut pole se bral první se shodným místním jménem
 * (návnada q:instr před w:instr); chyběla pole DATABASE a RD a hromadná
 * korespondence; neuzavřená značka dávala kvadratický čas. Prefix je teď
 * cokoli až po dvojtečku, atribut pole platí jen s prefixem prvku, rozbor
 * jde jedním průchodem a neuzavřené je vada.
 *
 * B115 (audit 30. 9. 2026): první verze šla obejít pěti cestami — číselné
 * entity v Type / TargetMode (attachedTempl&#97;te, Ex&#116;ernal), pole
 * přes jiný prefix jmenného prostoru (<x:instrText>), dokument mimo
 * word/<jeden segment>.xml (word2/, word/glossary/), interní oleObject /
 * package se zamlženým Type a chybějící pole LINK. Proto se hodnoty
 * dekódují jako v XML (pojmenované i číselné entity, jedním průchodem),
 * atributy se čtou i s „>" uvnitř uvozovek, prvky bez ohledu na prefix
 * a prochází se KAŽDÁ část ZIPu, která je XML — podle obsahu, ne podle
 * názvu (typ části řídí [Content_Types].xml), i v UTF-16.
 *
 * Jedna funkce pro prohlížeč (průvodce, generátor) i server (zveřejnění,
 * vrácení verze, obnova; jadro_moduly.cjs). Nic neopravuje ani nevyhazuje —
 * vadnou šablonu odmítne a řekne, co vadí.
 * ============================================================ */

const SABLONA_VZTAHY_ZAKAZANE = ['attachedTemplate', 'oleObject', 'package', 'aFChunk', 'vbaProject', 'frame', 'subDocument',
  'control', 'activeXControlBinary', 'wordVbaData', 'vbaProjectSignature', 'keyMapCustomizations',
  /* B141 (12. 10. 2026): zdroj dat hromadné korespondence */
  'mailMergeSource', 'mailMergeHeaderSource'];
const SABLONA_ODKAZ_POVOLENY = /^(https?:|mailto:)/i;
const SABLONA_POLE_ZAKAZANA = ['INCLUDETEXT', 'INCLUDEPICTURE', 'INCLUDE', 'IMPORT', 'LINK', 'DDEAUTO', 'DDE', 'DATABASE', 'RD'];
/* Cíl vztahu, který Word nebere jako část balíčku: schéma (http:, file:, C:)
 * nebo síťová cesta (\\server, //server). */
const SABLONA_CIL_VNEJSI = /^([a-z][a-z0-9+.-]*:|[\\/]{2})/i;
/* Atribut "…" nebo '…' — uvnitř uvozovek smí být i „>". */
const SABLONA_ATRIBUTY = '(?:[^>"\']|"[^"]*"|\'[^\']*\')*';
/* Prefix jmenného prostoru (B139, 12. 10. 2026): XML dovoluje v prefixu
 * i písmena mimo ASCII (<é:instrText>) — „[\w.-]" je nezná. Prefix je proto
 * cokoli až po dvojtečku kromě mezer a znaků, které značku ukončují. */
const SABLONA_PREFIX = '(?:[^\\s<>/="\':!?]+:)?';
/* Jméno atributu (B139) — i s ne-ASCII prefixem. Začíná jen na začátku
 * nebo za mezerou či uvozovkou (B143: jinak by dlouhé jméno bez „=" četl
 * regulární výraz od každého znaku znovu). */
const SABLONA_ATRIBUT_RE = /(?<![^\s"'])([^\s<>/="']+)\s*=\s*("([^"]*)"|'([^']*)')/g;

/* Bajty části → text. XML části smějí být v UTF-8 i UTF-16 (s BOM i bez).
 * UTF-16 bez BOM se pozná podle nulového bajtu u každého druhého znaku —
 * i když část začíná mezerou nebo koncem řádku (#395, 8. 10. 2026; dřív
 * jen „<" na začátku, jinak se část četla jako UTF-8 s nulami a rozbor
 * v ní nenašel nic). */
function sablonaObsahText(data) {
  if (typeof data === 'string') return data;
  if (!data) return '';
  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  let le = null, od = 0;
  if (u8[0] === 0xFF && u8[1] === 0xFE) { le = true; od = 2; }
  else if (u8[0] === 0xFE && u8[1] === 0xFF) { le = false; od = 2; }
  else if (u8.length > 3 && u8[0] !== 0 && u8[1] === 0 && u8[3] === 0) le = true;
  else if (u8.length > 3 && u8[0] === 0 && u8[2] === 0 && u8[1] !== 0) le = false;
  else if (u8.length > 1 && u8[0] === 0x3C && u8[1] === 0) le = true;
  else if (u8.length > 1 && u8[0] === 0 && u8[1] === 0x3C) le = false;
  if (le !== null) {
    let s = '';
    for (let i = od; i + 1 < u8.length; i += 2) s += String.fromCharCode(le ? u8[i] | (u8[i + 1] << 8) : (u8[i] << 8) | u8[i + 1]);
    return s;
  }
  try { return new TextDecoder().decode(u8); } catch (e) { return ''; }
}
/* KÓDOVÁNÍ, KTERÉ KONTROLA NEČTE (#395, 8. 10. 2026). Rozbor umí UTF-8
 * a UTF-16. Část v UTF-32 nebo s deklarací jiného kódování (UTF-7 zapíše
 * „<" jako „+ADw-", EBCDIC úplně jinak) by kontrola četla jinak než Word —
 * zakázané pole by v ní neviděla. Word sám ukládá jen UTF-8. Vrací popis
 * vady, nebo ''. */
function sablonaKodovaniVada(data, text) {
  const u8 = data instanceof Uint8Array ? data : (data && typeof data.byteLength === 'number' ? new Uint8Array(data) : null);
  if (u8 && u8.length > 3 && ((u8[0] === 0 && u8[1] === 0 && (u8[2] === 0xFE || u8[2] === 0) && (u8[3] === 0xFF || u8[3] === 0x3C))
      || ((u8[0] === 0xFF || u8[0] === 0x3C) && (u8[1] === 0xFE || u8[1] === 0) && u8[2] === 0 && u8[3] === 0)))
    return 'XML v kódování UTF-32';
  const m = /^[\s\uFEFF]*<\?xml\b[^>]*?\bencoding\s*=\s*["']([^"']*)["']/i.exec(String(text || ''));
  if (m && !/^\s*utf-?(8|16(le|be)?)\s*$/i.test(m[1])) return 'XML v kódování ' + (m[1].trim().slice(0, 20) || 'prázdném');
  return '';
}
/* XML entity jedním průchodem — jako parser (&amp;#97; zůstane „&#97;"). */
function sablonaXmlUnesc(s) {
  const pojm = { lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' };
  return String(s == null ? '' : s).replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|lt|gt|quot|apos|amp);/g, (m, e) => {
    if (e[0] !== '#') return pojm[e];
    const kod = /^#[xX]/.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    try { return String.fromCodePoint(kod); } catch (x) { return ''; }
  });
}
/* NORMALIZACE PŘED ROZBOREM (revize 6. 10. 2026, S1/S2). Komentáře
 * a instrukce zpracování Word ignoruje — falešná značka v nich nesmí
 * rozhodit rozbor polí; sekce CDATA parser vrací jako text — převede se na
 * text s entitami, aby ji rozbor viděl stejně jako Word.
 * B143 (12. 10. 2026): jedním průchodem zleva jako parser — regulární
 * výraz hledal ke každému neuzavřenému „<!--" konec znovu až do konce
 * souboru (kvadratický čas). Neuzavřený komentář, CDATA nebo instrukce je
 * vada (Word takové XML neotevře) a zbytek části se nečte. */
function sablonaNormalizuj(text, vady) {
  const s = String(text || '');
  const re = /<(!\[CDATA\[|!--|\?(?!xml\s))/g;
  let out = '', od = 0, m;
  while ((m = re.exec(s))) {
    const druh = m[1][1] === '[' ? 'cdata' : m[1][0] === '!' ? 'komentar' : 'pi';
    const zaver = druh === 'cdata' ? ']]>' : druh === 'komentar' ? '-->' : '?>';
    const k = s.indexOf(zaver, re.lastIndex);
    out += s.slice(od, m.index);
    if (k < 0) {
      if (vady) vady.push({ cdata: 'neuzavřená sekce CDATA', komentar: 'neuzavřený komentář', pi: 'neuzavřená instrukce zpracování' }[druh]);
      return out;
    }
    if (druh === 'cdata') out += s.slice(re.lastIndex, k).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    od = re.lastIndex = k + zaver.length;
  }
  return out + s.slice(od);
}
/* ZNAČKY S DANÝM MÍSTNÍM JMÉNEM (B139, B143; 12. 10. 2026) → [{ prefix,
 * druh, attr, zac, kon }] v pořadí dokumentu; od = kde začít. Prefix
 * jakýkoli (i ne-ASCII), jméno musí končit mezerou, „/" nebo „>".
 * Značka bez „>" je vada (do vady) a hledání tím končí — každá další by se
 * jinak četla znovu až do konce souboru (kvadratický čas). */
function sablonaZnacky(xml, jmena, vady, od) {
  const out = [];
  const re = new RegExp('<(' + SABLONA_PREFIX + ')(' + jmena + ')(?=[\\s/>]|$)', 'g');
  const telo = new RegExp(SABLONA_ATRIBUTY + '>', 'y');
  re.lastIndex = od || 0;
  let m;
  while ((m = re.exec(xml))) {
    telo.lastIndex = re.lastIndex;
    const t = telo.exec(xml);
    if (!t) { if (vady) vady.push('neuzavřená značka <' + m[1] + m[2] + '>'); break; }
    out.push({ prefix: m[1], druh: m[2], attr: t[0].slice(0, -1), zac: m.index, kon: telo.lastIndex });
    re.lastIndex = telo.lastIndex;
  }
  return out;
}
/* Atributy značky PŘESNĚ podle jména (s prefixem, rozlišuje velikost
 * písmen) → { jméno: [hodnoty] } (revize 6. 10. 2026, S3). */
function sablonaAtributyPresne(tag) {
  const out = {};
  const re = new RegExp(SABLONA_ATRIBUT_RE.source, 'g');
  let m;
  while ((m = re.exec(tag))) (out[m[1]] = out[m[1]] || []).push(sablonaXmlUnesc(m[3] !== undefined ? m[3] : m[4]));
  return out;
}
/* NÁVNADA ATRIBUTU (B140, 12. 10. 2026). Bral se první atribut se shodným
 * místním jménem: <w:fldSimple q:instr=" PAGE " w:instr=" INCLUDETEXT …">
 * (q ignorovaný přes mc:Ignorable) ukázal kontrole PAGE, Wordu INCLUDETEXT.
 * Stejně jako u vztahů (S3): platí jen atribut s prefixem prvku a přesným
 * jménem; jiný se stejným místním jménem (jiný prefix, velikost písmen)
 * nebo opakovaný je vada. → { hodnota, nejasny } */
function sablonaAtributPole(tag, prefix, jmeno) {
  const presne = sablonaAtributyPresne(tag);
  const ocek = prefix + jmeno;
  const cizi = Object.keys(presne).filter(k => k !== ocek && k.split(':').pop().toLowerCase() === jmeno.toLowerCase());
  const h = presne[ocek] || [];
  return { hodnota: h.length ? h[0] : '', nejasny: cizi.length ? cizi[0] : (h.length > 1 ? ocek : '') };
}
function sablonaJeXml(text) {
  return /^[\s\uFEFF]*</.test(text);
}

/* Typ pole = první slovo kódu. Kód, který začíná vnořeným polem (\u0001),
 * má typ až z výsledku vnořeného pole — ten předem nikdo nezná. */
function sablonaPoleVada(kod) {
  const t = sablonaXmlUnesc(String(kod || '')).replace(/^[\s\u00A0]+/, '');
  if (!t) return '';
  if (t[0] === '\u0001') return 'pole, jehož typ dodá vnořené pole';
  /* Typ dodaný symbolem {{…}} by doplnila až data zakázky (revize 6. 10.,
   * S4) — předem nikdo neví, jaké pole vznikne. */
  if (/^"?\{/.test(t)) return 'pole, jehož typ dodá symbol {{…}}';
  const m = /^"?([A-Za-z]+)/.exec(t);
  const typ = m ? m[1].toUpperCase() : '';
  return SABLONA_POLE_ZAKAZANA.indexOf(typ) >= 0 ? 'pole ' + typ : '';
}
/* Složená pole: fldChar begin / separate / end a instrText mezi nimi,
 * v pořadí dokumentu, s vnořováním. instrText mimo pole (bez fldChar) se
 * spojí dohromady — kód bývá rozdělený do více běhů. */
function sablonaPoleVady(xml) {
  const vady = [];
  const re = new RegExp('<(' + SABLONA_PREFIX + ')(fldChar|instrText|fldSimple)(?=[\\s/>]|$)', 'g');
  const telo = new RegExp(SABLONA_ATRIBUTY + '>', 'y');
  const zasobnik = [];
  let sirotci = '', m;
  while ((m = re.exec(xml))) {
    const prefix = m[1], druh = m[2];
    telo.lastIndex = re.lastIndex;
    const t = telo.exec(xml);
    if (!t) { vady.push('neuzavřená značka <' + prefix + druh + '>'); break; }   // B143
    re.lastIndex = telo.lastIndex;
    const attr = t[0].slice(0, -1);
    if (druh === 'fldSimple' || druh === 'fldChar') {
      const a = sablonaAtributPole(attr, prefix, druh === 'fldSimple' ? 'instr' : 'fldCharType');
      if (a.nejasny) vady.push('pole s nejednoznačným atributem ' + a.nejasny);   // B140
      if (druh === 'fldSimple') { vady.push(sablonaPoleVada(a.hodnota)); continue; }
      const typ = a.hodnota.trim().toLowerCase();
      if (typ === 'begin') {
        if (zasobnik.length && !zasobnik[zasobnik.length - 1].sep) zasobnik[zasobnik.length - 1].kod += '\u0001';
        zasobnik.push({ kod: '', sep: false });
      } else if (typ === 'separate') { if (zasobnik.length) zasobnik[zasobnik.length - 1].sep = true; }
      else if (typ === 'end') { if (zasobnik.length) vady.push(sablonaPoleVada(zasobnik.pop().kod)); }
      continue;
    }
    if (/\/\s*$/.test(attr)) continue;                         // <w:instrText/>
    const konec = new RegExp('</' + SABLONA_PREFIX + 'instrText\\s*>', 'g');
    konec.lastIndex = re.lastIndex;
    const k = konec.exec(xml);
    /* B143: neuzavřený instrText = vada a konec; bez toho se ke každému
     * dalšímu hledal konec znovu až do konce souboru. */
    if (!k) { vady.push('neuzavřená značka <' + prefix + 'instrText>'); break; }
    const text = xml.slice(re.lastIndex, k.index).replace(/<[^<>]*>/g, '');
    re.lastIndex = konec.lastIndex;
    const top = zasobnik.length ? zasobnik[zasobnik.length - 1] : null;
    if (top) { if (!top.sep) top.kod += text; }
    else { sirotci += text; vady.push(sablonaPoleVada(text)); }   // každý sirotek i dohromady (S2)
  }
  zasobnik.forEach(z => vady.push(sablonaPoleVada(z.kod)));
  vady.push(sablonaPoleVada(sirotci));
  return vady.filter(Boolean);
}

/* Kontrola nad rozbaleným ZIPem: polozky = [{ nazev, data }] (data jako
 * Uint8Array z zipPrecti nebo text). Vrací seznam českých popisů vad;
 * prázdný = šablona je v pořádku. */
function sablonaObsahVadyZipu(polozky) {
  const vady = [];
  const pridej = (t) => { if (vady.indexOf(t) < 0) vady.push(t); };
  (Array.isArray(polozky) ? polozky : []).forEach(p => {
    if (!p || typeof p.nazev !== 'string') return;
    const nazev = p.nazev;
    let jmeno = nazev;
    try { jmeno = decodeURIComponent(nazev); } catch (e) { /* nechat jak je */ }
    const male = jmeno.toLowerCase().replace(/\\/g, '/');
    if (/(^|\/)embeddings\//.test(male) || /(^|\/)oleobject[^/]*$/.test(male)) pridej('vložený objekt (' + nazev + ')');
    if (/(^|\/)vbaproject/.test(male) || /(^|\/)vbadata/.test(male)) pridej('makra VBA (' + nazev + ')');
    if (male.indexOf('activex') >= 0) pridej('prvek ActiveX (' + nazev + ')');

    const text = sablonaObsahText(p.data);
    const kodovani = sablonaKodovaniVada(p.data, text);
    if (kodovani) { pridej(kodovani + ' (' + nazev + ')'); return; }
    const jeRels = /\.rels$/.test(male);
    if (!jeRels && !/\.xml$/.test(male) && !sablonaJeXml(text)) return;

    if (/<!(DOCTYPE|ENTITY)\b/i.test(text)) pridej('deklarace DOCTYPE / ENTITY (' + nazev + ')');
    const neuzavrene = [];
    const xml = sablonaNormalizuj(text, neuzavrene);
    if (male === '[content_types].xml') {
      const ct = sablonaXmlUnesc(xml);
      if (/macroEnabled/i.test(ct)) pridej('dokument s makry (typ obsahu macroEnabled)');
      if (/vbaProject/i.test(ct)) pridej('makra VBA (typ obsahu vbaProject)');
      if (/oleObject/i.test(ct)) pridej('vložený objekt (typ obsahu oleObject)');
      if (/activeX/i.test(ct)) pridej('prvek ActiveX (typ obsahu activeX)');
    }
    /* Vztahy: v .rels, ale hledají se v každé XML části (nic to nestojí). */
    for (const znacka of sablonaZnacky(xml, 'Relationship', neuzavrene)) {
      /* Type / Target / TargetMode se čtou přesně (bez prefixu, s velikostí
       * písmen); atribut, který se od nich liší jen velikostí písmen nebo
       * prefixem, je návnada (revize 6. 10., S3) — vztah se odmítne. */
      const presne = sablonaAtributyPresne(znacka.attr);
      const nejasne = Object.keys(presne).filter(k => /^(type|target|targetmode)$/i.test(k.split(':').pop())
        && ['Type', 'Target', 'TargetMode'].indexOf(k) < 0);
      if (nejasne.length || ['Type', 'Target', 'TargetMode'].some(k => (presne[k] || []).length > 1)) {
        pridej('vztah s nejednoznačným atributem ' + (nejasne[0] || 'Type/Target') + ' (' + nazev + ')');
        continue;
      }
      const a = { type: presne.Type, target: presne.Target, targetmode: presne.TargetMode };
      const typy = (a.type || ['']).map(t => t.trim().replace(/\/+$/, '').split('/').pop());
      const cile = (a.target || ['']).map(t => t.trim());
      const mody = (a.targetmode || []).map(t => t.trim());
      const druh = typy.find(d => SABLONA_VZTAHY_ZAKAZANE.some(z => z.toLowerCase() === d.toLowerCase())) || typy[0];
      const externi = mody.some(md => md && !/^internal$/i.test(md)) || cile.some(c => SABLONA_CIL_VNEJSI.test(c));
      if (SABLONA_VZTAHY_ZAKAZANE.some(z => z.toLowerCase() === druh.toLowerCase()))
        pridej('vztah ' + druh + (externi ? ' na vnější adresu' : '') + ' (' + nazev + ')');
      else if (externi) {
        const odkaz = druh.toLowerCase() === 'hyperlink';
        if (!(odkaz && cile.every(c => !SABLONA_CIL_VNEJSI.test(c) || SABLONA_ODKAZ_POVOLENY.test(c))))
          pridej('vnější vztah ' + (druh || '?') + (odkaz ? ' s nepovolenou adresou' : '') + ' (' + nazev + ')');
      }
    }
    neuzavrene.forEach(v => pridej(v + ' (' + nazev + ')'));
    const reObj = new RegExp('<' + SABLONA_PREFIX + '(OLEObject|altChunk|subDoc)\\b', 'g');
    let m;
    while ((m = reObj.exec(xml))) pridej('prvek ' + m[1] + ' (' + nazev + ')');
    /* B141: hromadná korespondence s připojením k datům — Word při otevření
     * spustí dotaz (connectString / query, ODSO udl) na cizí databázi. */
    if (new RegExp('<' + SABLONA_PREFIX + 'mailMerge(?=[\\s/>])').test(xml)
        && new RegExp('<' + SABLONA_PREFIX + '(connectString|query|udl)(?=[\\s/>])').test(xml))
      pridej('hromadná korespondence s připojením k datům (' + nazev + ')');
    sablonaPoleVady(xml).forEach(v => pridej(v + ' (' + nazev + ')'));
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
  module.exports = { SABLONA_VZTAHY_ZAKAZANE, sablonaObsahVadyZipu, sablonaObsahVady, sablonaObsahVadyText, sablonaB64NaBajty, sablonaXmlUnesc };
