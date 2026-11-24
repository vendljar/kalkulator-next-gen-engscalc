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
 *     odkazu na absolutní http://, https:// nebo mailto: (odkaz Word sám
 *     nestahuje; mailto: nesou dnešní firemní šablony PROJ — bez něj by
 *     neprošly). Vnější odkaz s relativním cílem (..\x.hta) neprojde (B247);
 *   – vnější hypertextový odkaz, který dokument použije jinak než jako
 *     odkaz — např. jako odkazovaný obrázek <a:blip r:link> (B248);
 *   – pole HYPERLINK s jinou adresou než absolutní http(s):// či mailto:
 *     (\\server, file:, relativní cesta; B247); odkaz na záložku (\l) smí;
 *   – symbol {{…}} kdekoli v kódu pole (B249): data zakázky by v kódu pole
 *     uvozovkou ukončila argument a přidala přepínač;
 *   – typy vztahů attachedTemplate, oleObject, package, aFChunk (altChunk),
 *     vbaProject, frame, subDocument, ActiveX a VBA data — bez ohledu na cíl;
 *   – části embeddings/*, vbaProject*, oleObject*, cokoli s „activeX"
 *     (v kterékoli složce);
 *   – typ obsahu macroEnabled, vbaProject, oleObject nebo activeX
 *     v [Content_Types].xml;
 *   – prvky OLEObject, altChunk a subDoc (s jakýmkoli prefixem);
 *   – pole INCLUDETEXT, INCLUDEPICTURE, INCLUDE, IMPORT, LINK, DDE, DDEAUTO,
 *     DATABASE, RD, pole s údaji počítače a autora FILENAME, USERNAME,
 *     AUTHOR (B271), USERINITIALS, USERADDRESS, LASTSAVEDBY, TEMPLATE, INFO,
 *     DOCPROPERTY (R3) (složené pole fldChar/instrText i s kódem rozděleným do
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
/* B247 (audit 20. 11. 2026): jen ABSOLUTNÍ http(s):// a mailto: — „https:"
 * bez lomítek ani relativní cesta neprojdou. */
const SABLONA_ODKAZ_POVOLENY = /^(https?:\/\/|mailto:)/i;
/* B248: prvky, jejichž atribut smí ukazovat na vztah typu hyperlink (odkaz
 * v textu, v kresbě). Jinde (a:blip r:link / r:embed, v:imagedata …) by
 * Word vnější adresu mohl stáhnout jako obsah. */
const SABLONA_ODKAZ_PRVKY = ['hyperlink', 'hlinkClick', 'hlinkHover', 'hlinkMouseOver'];
const SABLONA_POLE_ZAKAZANA = ['INCLUDETEXT', 'INCLUDEPICTURE', 'INCLUDE', 'IMPORT', 'LINK', 'DDEAUTO', 'DDE', 'DATABASE', 'RD',
  /* B271 (audit 20. 11. 2026): při aktualizaci polí (F9, tisk) vloží Word
   * cestu k souboru (FILENAME \p) a jméno uživatele počítače (USERNAME,
   * AUTHOR) do dokumentu, který jde zákazníkovi. */
  'FILENAME', 'USERNAME', 'AUTHOR',
  /* R3 revize SA (rozhodnutí J. V. 24. 11. 2026, #751): rovnocenná pole —
   * iniciály a adresa uživatele, kdo naposledy uložil, cesta k šabloně
   * (TEMPLATE \p = profil uživatele) a vlastnosti dokumentu (INFO,
   * DOCPROPERTY: autor, firma, správce, název souboru). Firemní šablony test
   * i main (kolo 54, 31 šablon) mají jen pole PAGE. */
  'USERINITIALS', 'USERADDRESS', 'LASTSAVEDBY', 'TEMPLATE', 'INFO', 'DOCPROPERTY'];
/* B272 (audit 20. 11. 2026): strop jedné XML části šablony. Strop rozbalení
 * celé šablony je 64 MB (ZIP_ROZBALENO_MAX); jedna XML část těsně pod ním
 * zaměstnala server rozborem asi 1,9 s. Firemní šablony mají zabalené
 * nejvýš ~1,4 MB i s obrázky a XML části v jednotkách stovek kB až jednotkách
 * MB; 8 MB je s rezervou nad nimi a rozbor takové části trvá desítky ms. */
const SABLONA_XML_CAST_MAX = 8 * 1024 * 1024;
/* DEKÓDOVÁNÍ %xx V NÁZVU POLOŽKY (revize SA R4, 23. 11. 2026). Celé
 * decodeURIComponent při jediné neplatné sekvenci (%ZZ, „100%") vyhodí výjimku
 * a kontrola pak viděla jen surový název (word/%2e%2e/x%ZZ.xml). Dekóduje se
 * proto každý běh platných %xx zvlášť jako UTF-8; neplatné UTF-8 (prodloužené
 * kódování tečky %C0%AE) dá U+FFFD, které sablonaNazevVada odmítne. Neplatné
 * „%" zůstane, jak je. */
function sablonaNazevDekoduj(nazev) {
  return String(nazev).replace(/(?:%[0-9a-f]{2})+/gi, beh => {
    const b = new Uint8Array(beh.length / 3);
    for (let i = 0; i < b.length; i++) b[i] = parseInt(beh.substr(i * 3 + 1, 2), 16);
    return new TextDecoder().decode(b);
  });
}
/* B270 (audit 20. 11. 2026): název položky ZIPu, který po rozbalení míří
 * mimo složku (../), je absolutní (/x), má zpětné lomítko (některé programy
 * ho berou za oddělovač) nebo řídicí znak. Revize SA R5: segment jen
 * z teček a mezer („.. ", „..%20" — Windows koncové tečky a mezery ořezává),
 * prázdný segment uprostřed (word//x.xml; prázdný smí jen na konci = složka),
 * dvojtečka kdekoli (C:x, datový proud NTFS x.xml:ads) a U+FFFD (neplatné
 * UTF-8). Word sám píše jen ASCII názvy bez těchto tvarů. */
function sablonaNazevVada(nazev) {
  const tvary = [nazev];
  const d = sablonaNazevDekoduj(nazev);
  if (d !== nazev) tvary.push(d);
  for (const t of tvary) {
    if (/[\u0000-\u001f\u007f]/.test(t)) return 'řídicí znak v názvu položky';
    if (t.indexOf('\ufffd') >= 0) return 'neplatný znak v názvu položky';
    if (t.indexOf('\\') >= 0) return 'zpětné lomítko v názvu položky';
    if (/^\//.test(t)) return 'absolutní cesta položky';
    if (t.indexOf(':') >= 0) return 'dvojtečka v názvu položky';
    const seg = t.split('/');
    if (seg.some(s => s !== '' && /^[. ]*$/.test(s))) return 'cesta položky mimo balíček (../)';
    if (seg.some((s, i) => s === '' && i < seg.length - 1)) return 'prázdný úsek cesty položky (//)';
  }
  return '';
}
/* Klíč pro shodu jmen (B270, revize SA R5): dekódovaný, malými, NFC, bez
 * koncových teček a mezer úseku, se sloučenými lomítky — dvě položky, které
 * by program se shovívavým čtením rozbalil na totéž místo. */
function sablonaNazevKlic(nazev) {
  return sablonaNazevDekoduj(nazev).replace(/\\/g, '/').normalize('NFC').toLowerCase()
    .split('/').map(s => s.replace(/[. ]+$/, '')).filter((s, i, a) => s !== '' || i === a.length - 1).join('/');
}
/* JE ČÁST XML? (revize SA R1/R2, 23. 11. 2026) — jedno rozhodnutí pro strop
 * i rozbor, z bajtů a bez dekódování celé části. Přeskočí BOM (UTF-8,
 * UTF-16) a bajty 0x00, tab, CR, LF a mezeru; první jiný bajt musí být „<"
 * (pokryje UTF-8, UTF-16 i UTF-32 LE/BE). Dřív strop rozhodoval z prvních
 * 64 B a rozbor z celého textu — 65 mezer před „<" strop obešlo. */
function sablonaJeXmlBajty(data) {
  if (typeof data === 'string') return /^[\s\u0000\uFEFF]*</.test(data);
  if (!data) return false;
  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  let i = 0;
  if (u8[0] === 0xEF && u8[1] === 0xBB && u8[2] === 0xBF) i = 3;
  else if ((u8[0] === 0xFF && u8[1] === 0xFE) || (u8[0] === 0xFE && u8[1] === 0xFF)) i = 2;
  for (; i < u8.length; i++) {
    const b = u8[i];
    if (b === 0x00 || b === 0x09 || b === 0x0A || b === 0x0D || b === 0x20) continue;
    return b === 0x3C;
  }
  return false;
}
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
    /* Revize SA R2: dřív smyčka String.fromCharCode po znaku (60 MB ~3,3 s). */
    const konec = od + ((u8.length - od) & ~1);
    try { return new TextDecoder(le ? 'utf-16le' : 'utf-16be').decode(u8.subarray(od, konec)); } catch (e) { return ''; }
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
  if (SABLONA_POLE_ZAKAZANA.indexOf(typ) >= 0) return 'pole ' + typ;
  /* B249 (audit 20. 11. 2026): data zakázky v kódu pole — uvozovka z dat
   * (Word &quot; v kódu dekóduje) by ukončila argument a přidala přepínač
   * (HYPERLINK "{{OBJEDNATEL_WEB}}" → … \l "x"). Kód pole je stavba, ne
   * text — symbol do něj nepatří. */
  if (/\{\{[A-Za-z0-9_]+\}\}/.test(t)) return 'data zakázky {{…}} uvnitř kódu pole ' + (typ || '?');
  if (typ === 'HYPERLINK') return sablonaHyperlinkVada(t.replace(/^"?[A-Za-z]+"?/, ''));
  return '';
}
/* POLE HYPERLINK (B247, audit 20. 11. 2026). Výjimka pro odkaz platila jen
 * u vztahů; pole HYPERLINK "\\\\server\\x" nebo "file:///…" prošlo — Word
 * po kliknutí otevře síťovou cestu (otisk hesla NTLM) či místní soubor.
 * Cíl = první argument, který není přepínač ani jeho hodnota (\l záložka,
 * \o popisek, \t rámec, \* \@ \# formát); smí jen absolutní http(s)://
 * a mailto:. Bez cíle (jen \l "_Toc1" z obsahu) je pole v pořádku.
 * V uvozovkách kódu pole je \\ zpětné lomítko a \" uvozovka. */
function sablonaHyperlinkVada(argumenty) {
  const re = /"((?:[^"\\]|\\[\s\S])*)"?|([^\s"]+)/g;
  let m, preskoc = false;
  while ((m = re.exec(argumenty))) {
    if (m[2] !== undefined && /^\\[A-Za-z*@#!]$/.test(m[2])) { preskoc = /^\\[lot*@#]$/i.test(m[2]); continue; }
    if (preskoc) { preskoc = false; continue; }
    const cil = (m[1] !== undefined ? m[1].replace(/\\([\s\S])/g, '$1') : m[2]).trim();
    if (cil.indexOf('\u0001') >= 0) return 'pole HYPERLINK s adresou z vnořeného pole';
    return SABLONA_ODKAZ_POVOLENY.test(cil) ? '' : 'pole HYPERLINK s nepovolenou adresou';
  }
  return '';
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
  const odkazy = Object.create(null);   // B248: zdrojová část (malými) → [Id povolených vnějších odkazů]
  const jmena = new Set();             // B270: klíč názvu (sablonaNazevKlic) → už byl (revize SA R7: Set, ne {})
  (Array.isArray(polozky) ? polozky : []).forEach(p => {
    if (!p || typeof p.nazev !== 'string') return;
    const nazev = p.nazev;
    const male = sablonaNazevDekoduj(nazev).toLowerCase().replace(/\\/g, '/');
    /* B270: název mimo balíček a dvě položky téhož jména (OPC nerozlišuje
     * velikost písmen ani %xx) — kontrola by četla jednu, Word jinou. */
    const vadaNazvu = sablonaNazevVada(nazev);
    if (vadaNazvu) pridej(vadaNazvu + ' (' + nazev + ')');
    const klic = sablonaNazevKlic(nazev);
    if (jmena.has(klic)) pridej('dvě položky téhož jména (' + nazev + ')');
    jmena.add(klic);
    if (/(^|\/)embeddings\//.test(male) || /(^|\/)oleobject[^/]*$/.test(male)) pridej('vložený objekt (' + nazev + ')');
    if (/(^|\/)vbaproject/.test(male) || /(^|\/)vbadata/.test(male)) pridej('makra VBA (' + nazev + ')');
    if (male.indexOf('activex') >= 0) pridej('prvek ActiveX (' + nazev + ')');

    /* Revize SA R1/R2: jedno rozhodnutí „je XML" (přípona nebo první bajt
     * „<") pro strop i rozbor; ne-XML část (obrázek, font) se nedekóduje. */
    const jeRels = /\.rels$/.test(male);
    if (!jeRels && !/\.xml$/.test(male) && !sablonaJeXmlBajty(p.data)) return;
    /* B272: XML část nad strop se nerozebírá (rozbor by zaměstnal server). */
    const delka = p.data && typeof p.data.length === 'number' ? p.data.length : 0;
    if (delka > SABLONA_XML_CAST_MAX) {
      pridej('XML část větší než ' + Math.round(SABLONA_XML_CAST_MAX / 1024 / 1024) + ' MB (' + nazev + ')');
      return;
    }
    const text = sablonaObsahText(p.data);
    const kodovani = sablonaKodovaniVada(p.data, text);
    if (kodovani) { pridej(kodovani + ' (' + nazev + ')'); return; }

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
        /* B247: vnější odkaz s relativním cílem (..\x.hta) dřív prošel —
         * podmínka pouštěla každý cíl bez schématu. */
        if (!(odkaz && cile.every(c => SABLONA_ODKAZ_POVOLENY.test(c))))
          pridej('vnější vztah ' + (druh || '?') + (odkaz ? ' s nepovolenou adresou' : '') + ' (' + nazev + ')');
        else if (jeRels) {
          /* B248: povolený odkaz si zapamatuje, ať se po průchodu ověří,
           * že ho zdrojová část nepoužívá jako obrázek nebo obsah. */
          const z = /^(.*\/)?_rels\/([^/]+)\.rels$/.exec(male);
          const id = ((presne.Id || [])[0] || '').trim();
          if (z && id) (odkazy[(z[1] || '') + z[2]] = odkazy[(z[1] || '') + z[2]] || []).push(id);
        }
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
  /* B248: druhý průchod jen přes části, k nimž patří povolený vnější odkaz. */
  if (Object.keys(odkazy).length) (Array.isArray(polozky) ? polozky : []).forEach(p => {
    if (!p || typeof p.nazev !== 'string') return;
    const ids = odkazy[sablonaMaleJmeno(p.nazev)];
    if (!ids) return;
    sablonaOdkazJinakVady(sablonaNormalizuj(sablonaObsahText(p.data)), ids).forEach(v => pridej(v + ' (' + p.nazev + ')'));
  });
  return vady;
}
function sablonaMaleJmeno(nazev) {
  return sablonaNazevDekoduj(nazev).toLowerCase().replace(/\\/g, '/');
}
/* VNĚJŠÍ ODKAZ POUŽITÝ JAKO OBSAH (B248, audit 20. 11. 2026). Vztah typu
 * hyperlink na https:// prošel jako „odkaz, který Word sám nestahuje" — jenže
 * dokument na něj mohl ukázat z <a:blip r:link="rId5"/> (odkazovaný obrázek)
 * a Word by adresu při otevření možná stáhl (sledovací pixel). Odkaz smí
 * použít jen prvek odkazu (SABLONA_ODKAZ_PRVKY); jiný prvek, jehož atribut
 * s prefixem (r:embed, r:link, r:id, o:relid …) nese Id odkazu, je vada.
 * Značka bez „>" ukončí hledání (jako sablonaZnacky — bez kvadratického času;
 * vadu neuzavřené značky hlásí první průchod). */
function sablonaOdkazJinakVady(xml, ids) {
  const vady = [];
  const re = /<([^\s<>\/="'!?]+)(?=[\s\/>]|$)/g;
  const telo = new RegExp(SABLONA_ATRIBUTY + '>', 'y');
  let m;
  while ((m = re.exec(xml))) {
    telo.lastIndex = re.lastIndex;
    const t = telo.exec(xml);
    if (!t) break;
    re.lastIndex = telo.lastIndex;
    const prvek = m[1].split(':').pop();
    if (SABLONA_ODKAZ_PRVKY.indexOf(prvek) >= 0) continue;
    const presne = sablonaAtributyPresne(t[0].slice(0, -1));
    for (const k of Object.keys(presne)) {
      if (k.indexOf(':') < 0 || /^xmlns:/i.test(k)) continue;
      const pouzite = presne[k].map(h => h.trim()).find(h => ids.indexOf(h) >= 0);
      if (pouzite) { vady.push('vnější odkaz ' + pouzite + ' použitý jako obsah (<' + m[1] + ' ' + k + '>)'); break; }
    }
  }
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
  try { polozky = await cti(u8, { xmlCastMax: SABLONA_XML_CAST_MAX }); } /* B272 */ catch (e) { return ['soubor nejde rozbalit jako .docx (' + e.message + ')']; }
  return sablonaObsahVadyZipu(polozky);
}
/* Odstavce textu šablony (base64 / ArrayBuffer / Uint8Array) pro kontrolu
 * češtiny v jazykové verzi (C7, K48-N1). Tentýž výčet odstavců jako průvodce
 * v prohlížeči (docxTextSablony z docxgen.js); nečitelný soubor → []. */
async function sablonaOdstavce(vstup) {
  let fn = (typeof docxTextSablony === 'function') ? docxTextSablony : null;
  if (!fn && typeof require === 'function') { try { fn = require('./docxgen.js').docxTextSablony; } catch (e) { /* nic */ } }
  if (!fn) return [];
  let u8;
  if (typeof vstup === 'string') u8 = sablonaB64NaBajty(vstup);
  else if (vstup instanceof Uint8Array) u8 = vstup;
  else if (vstup && typeof vstup.byteLength === 'number') u8 = new Uint8Array(vstup);
  else return [];
  try { return await fn(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)); } catch (e) { return []; }
}
function sablonaObsahVadyText(vady) {
  return 'Šablona obsahuje prvky, které Word načítá nebo spouští mimo dokument: ' + (vady || []).join('; ')
    + '. Takovou šablonu nejde zveřejnit ani z ní generovat — uložte ji ve Wordu znovu jako obyčejný .docx '
    + 'bez maker, vložených objektů a propojení na jiné soubory.';
}

if (typeof module !== 'undefined')
  module.exports = { SABLONA_VZTAHY_ZAKAZANE, sablonaObsahVadyZipu, sablonaObsahVady, sablonaObsahVadyText, sablonaOdstavce, sablonaB64NaBajty, sablonaXmlUnesc, sablonaNazevVada, sablonaNazevDekoduj, sablonaNazevKlic, sablonaJeXmlBajty, sablonaObsahText, SABLONA_POLE_ZAKAZANA, SABLONA_XML_CAST_MAX };
