/* PŘEKLAD ŠABLON SMLUV O DÍLO DO ANGLIČTINY, NĚMČINY A FRANCOUZŠTINY
 * (#157, dávka V3, 17. 10. 2026; DE a FR rozhodnutím J. V. 18. 10. 2026)
 *
 * Rozhodnutí J. V. 16. 10. 2026: anglická smlouva o dílo = PŘEKLAD české
 * šablony (soubor ke kontrole rodilým mluvčím), napojený v aplikaci jako
 * jazyk EN — nečeká se na právní znění od právníka.
 *
 * Šablony ani jejich překlad v repozitáři nejsou (firemní texty). Překlad
 * leží ve slovníku vedle šablony (JSON mimo repozitář), skript z něj
 * vyrobí jazykovou šablonu a ověří ji (jazyk --jazyk en | de | fr, výchozí en):
 *
 *   node nastroje/preklad_sod.js --kostra [--jazyk de] <složka> [soubor.docx …]
 *       vyrobí/doplní slovník <šablona>.preklad_<jazyk>.json: pro každý
 *       odstavec s českým textem záznam { cz, <jazyk>, pozn } (překlad
 *       prázdný k vyplnění; hotové záznamy se ponechají)
 *   node nastroje/preklad_sod.js [--jazyk de] <složka> [výstupní složka]
 *       ze šablon Sablona_SOD_REALIZACE_v3.docx a Sablona_SOD_PROJEKCE_v4.docx
 *       a jejich slovníků vyrobí …_EN.docx (_DE, _FR) a vypíše kontrolu
 *
 * POJMENOVANÁ MÍSTA (18. 10. 2026, J. V.: sporná místa — DPH u zahraničního
 * zákazníka, skladné — se budou měnit „jedním přepisem"). Záznam slovníku
 * { misto: 'SKLADNE', en: '…', pozn } definuje úsek textu; překlad odstavce
 * ho vloží značkou [[SKLADNE]]. Změna znění = přepis jednoho záznamu
 * a nové vyrobení šablony. Neznámé místo nebo místo bez překladu do
 * zvoleného jazyka skript odmítne.
 *
 * ZÁPIS ODSTAVCE (cz i en):
 *   – <s1>…</s1>, <s2>…</s2> … = úsek ve stylu běhu číslo N (tučně,
 *     podtržení, barva…; styly vypíše kostra v poli `styly`); text mimo
 *     značky má styl běhu s nejdelším textem (základ),
 *   – \t = tabulátor, \n = zalomení řádku, \f = zalomení stránky,
 *   – {{SYMBOL}} zůstává beze změny a dostane písmo, jaké měl v češtině.
 * Překlad musí nést PŘESNĚ tytéž symboly (i počtem), tabulátory a zalomení
 * jako čeština — jinak skript odstavec odmítne. Odstavec se přeskládá
 * z překladu, odrážky, číslování a vlastnosti odstavce (w:pPr) zůstávají;
 * jiné prvky než textové běhy (záložky) se přesunou na konec odstavce,
 * odstavec s obrázkem nebo polem skript odmítne (nic nehádá).
 *
 * Kontrola výstupu: platné XML (docxXmlVady), symboly shodné s češtinou,
 * odhad jazyka = angličtina (sablonaJazykOdhad — tentýž, jakým aplikace
 * kontroluje soubor před zveřejněním), žádný odstavec s českou diakritikou.
 * `pozn` záznamů se vypíše jako podklad pro rodilého mluvčího. */
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, '..', 'src');
const dg = require(path.join(SRC, 'docxgen.js'));
const so = require(path.join(SRC, 'sablony_online.js'));

/* Aktuální české šablony (SoD realizace v3 od 18. 10. 2026 — režim DPH
 * a skladné symboly, nastroje/vyrob_sablony.js --sod-real-v3; SoD projekce
 * v4 — rozsah díla podle nabídky, #380, --sod-proj-v4). */
const SABLONY_SOD = ['Sablona_SOD_REALIZACE_v3.docx', 'Sablona_SOD_PROJEKCE_v4.docx'];
const enc = new TextEncoder(), dec = new TextDecoder();
const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const xmlUnesc = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&');
const SYMBOL_RE = /\{\{[A-Z0-9_]+\}\}/g;
/* Znaky, které v cílovém jazyce nemají co dělat: v angličtině celá česká
 * diakritika, v němčině a francouzštině bez é (francouzština, přejatá slova). */
const CESKE_ZNAKY = { en: /[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/, de: /[áčďěíňóřšťúůýžÁČĎĚÍŇÓŘŠŤÚŮÝŽ]/,
  fr: /[áčďěíňóřšťúůýžÁČĎĚÍŇÓŘŠŤÚŮÝŽ]/ };
const JAZYKY_SOD = ['en', 'de', 'fr'];
const MISTO_RE = /\[\[([A-Z0-9_]+)\]\]/g;
/* České zkratky, které překlad záměrně nechává (identifikátory, normy). */
const ZKRATKY_CZ = /(^|[^\p{L}])(IČO|IČ|DIČ|ČSN|ČKAIT)(?=[^\p{L}]|$)/gu;
/* odstavec stojí za překlad, když má písmena mimo symboly */
const maText = t => /\p{L}/u.test(String(t).replace(SYMBOL_RE, ''));

/* Nejvnitřnější odstavce dílu (jako docxPrelozXml). */
function vnitrniSpany(xml) {
  return dg.odstavcoveSpany(xml).filter(sp => {
    const vnitrek = xml.slice(sp.zac, sp.kon).replace(/^<w:p(?:\s[^>]*)?>/, '');
    return !/<w:p(?:\s[^>]*[^/])?>/.test(vnitrek);
  });
}

/* Rozbor odstavce: pPr, běhy s obsahem v pořadí (text / \t / \n / \f)
 * a rPr, ostatní prvky. `slozity` = obrázek, pole, vnořený obsah —
 * takový odstavec se nepřeskládává. */
function rozborOdstavce(odst) {
  const otevr = odst.match(/^<w:p(?:\s[^>]*)?>/)[0];
  let vnitrek = odst.slice(otevr.length, odst.length - '</w:p>'.length);
  const pPrM = vnitrek.match(/^\s*<w:pPr>[\s\S]*?<\/w:pPr>/);
  const pPr = pPrM ? pPrM[0] : '';
  vnitrek = vnitrek.slice(pPr.length);
  const behy = [], ostatni = [];
  let slozity = false;
  const re = /<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>|<w:r(?:\s[^>]*)?\/>|<w:proofErr[^>]*\/>|<w:bookmark(?:Start|End)[^>]*\/>|<[^>]+>/g;
  let m, posl = 0;
  while ((m = re.exec(vnitrek))) {
    if (vnitrek.slice(posl, m.index).trim()) slozity = true;
    posl = m.index + m[0].length;
    const k = m[0];
    if (/^<w:r[\s>/]/.test(k)) {
      if (/<w:(drawing|pict|object|fldChar|instrText|footnoteReference|endnoteReference|sym)\b/.test(k)) { slozity = true; continue; }
      const rPrM = k.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
      const obsah = [];
      k.replace(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:t(?:\s[^>]*)?\/>|<w:tab\/>|<w:br(?:\s[^>]*)?\/>|<w:cr\/>/g, (x, t) => {
        if (/^<w:tab/.test(x)) obsah.push('\t');
        else if (/^<w:br/.test(x)) obsah.push(/w:type="page"/.test(x) ? '\f' : '\n');
        else if (/^<w:cr/.test(x)) obsah.push('\n');
        else if (t) obsah.push(xmlUnesc(t));
        return x;
      });
      behy.push({ rPr: rPrM ? rPrM[0] : '', text: obsah.join('') });
    } else if (/^<w:proofErr/.test(k)) {
      /* kontrola pravopisu — do přeskládaného odstavce nepatří */
    } else if (/^<w:bookmark(Start|End)/.test(k)) ostatni.push(k);
    else slozity = true;                                     // hypertextový odkaz, smartTag, sdt…
  }
  if (vnitrek.slice(posl).trim()) slozity = true;
  return { otevr, pPr, behy, ostatni, slozity };
}

/* Styly odstavce: základ = rPr běhu s nejvíc písmeny mimo symboly, ostatní
 * rPr běhů s písmeny dostanou čísla 1, 2, … Symboly mají písmo svého běhu. */
function stylyOdstavce(behy) {
  const delka = new Map();
  behy.forEach(b => {
    const n = (String(b.text).replace(SYMBOL_RE, '').match(/\p{L}/gu) || []).length;
    if (n) delka.set(b.rPr, (delka.get(b.rPr) || 0) + n);
  });
  let zaklad = behy.length ? behy[0].rPr : '', max = -1;
  delka.forEach((n, r) => { if (n > max) { max = n; zaklad = r; } });
  const dalsi = [];
  delka.forEach((_n, r) => { if (r !== zaklad) dalsi.push(r); });
  /* písmo úseků bez písmen (tabulátory, mezery, uvozovky) — styly za `dalsi`,
   * kostra je nepoužívá (klíč slovníku se nemění), překlad je smí označit */
  const pomocne = [];
  behy.forEach(b => {
    const t = String(b.text).replace(SYMBOL_RE, '');
    if (t && !/\p{L}/u.test(t) && b.rPr !== zaklad && dalsi.indexOf(b.rPr) < 0 && pomocne.indexOf(b.rPr) < 0) pomocne.push(b.rPr);
  });
  return { zaklad, dalsi, pomocne };
}

/* Text odstavce se značkami stylů (klíč slovníku). Úsek bez písmen (mezery,
 * tabulátor, interpunkce) jde ve stylu okolí, symboly bez značek. */
function zapisOdstavce(behy, styly) {
  let out = '', akt = 0;
  const cislo = r => (r === styly.zaklad ? 0 : styly.dalsi.indexOf(r) + 1);
  behy.forEach(b => {
    const bezSym = String(b.text).replace(SYMBOL_RE, '');
    let s = /\p{L}/u.test(bezSym) ? cislo(b.rPr) : akt;
    if (s < 0) s = 0;
    if (s !== akt) { if (akt) out += '</s' + akt + '>'; if (s) out += '<s' + s + '>'; akt = s; }
    out += b.text;
  });
  if (akt) out += '</s' + akt + '>';
  return out.replace(/<\/s(\d+)><s\1>/g, '');
}
const bezZnacek = t => String(t).replace(/<\/?s\d+>/g, '');
const normKlic = t => String(t).replace(/ /g, ' ').replace(/[ ]+/g, ' ').trim();
const podpisOddelovacu = t => (String(t).match(/[\t\n\f]/g) || []).join('');
const symbolySerazene = t => (bezZnacek(t).match(SYMBOL_RE) || []).sort().join('|');

/* Jazyk dokumentu (D4, 22. 10. 2026 — jako revidované znění J. V.):
 * w:lang ve styles.xml, themeFontLang v settings.xml a značka odstavce. */
const KOD_JAZYKA = { en: 'en-GB', de: 'de-DE', fr: 'fr-FR' };
const jazykXml = (xml, L) => xml.replace(/(<w:lang w:val=")cs-CZ"/g, '$1' + KOD_JAZYKA[L] + '"');
/* w:keepNext na své místo v w:pPr (za w:pStyle), když tam ještě není. */
function pPrKeepNext(pPr) {
  if (!pPr) return '<w:pPr><w:keepNext/></w:pPr>';
  if (/<w:keepNext\/>/.test(pPr)) return pPr;
  const m = pPr.match(/^\s*<w:pPr>(<w:pStyle [^>]*\/>)?/);
  return pPr.slice(0, m[0].length) + '<w:keepNext/>' + pPr.slice(m[0].length);
}

/* Přeskládá odstavec z překladu. Vrací XML odstavce nebo hodí chybu.
 * Sousední úseky stejného písma (i se symbolem) jdou do jednoho běhu. */
function slozOdstavec(rozbor, styly, en, keepNext) {
  const vsechny = styly.dalsi.concat(styly.pomocne || []);
  const symRPr = {};
  rozbor.behy.forEach(b => (b.text.match(SYMBOL_RE) || []).forEach(s => { if (!(s in symRPr)) symRPr[s] = b.rPr; }));
  const casti = [];
  const re = /<s(\d+)>([\s\S]*?)<\/s\1>/g;
  let m, posl = 0;
  const pridej = (text, styl) => { if (text) casti.push({ text, styl }); };
  while ((m = re.exec(en))) { pridej(en.slice(posl, m.index), 0); pridej(m[2], +m[1]); posl = m.index + m[0].length; }
  pridej(en.slice(posl), 0);
  const useky = [];                                          // [{ rPr, text }] po sloučení
  casti.forEach(c => {
    if (/<\/?s\d+>/.test(c.text)) throw new Error('značky stylů se nesmí vnořovat ani zůstat neuzavřené');
    if (c.styl > vsechny.length) throw new Error('styl s' + c.styl + ' odstavec nemá');
    const rPr = c.styl ? vsechny[c.styl - 1] : styly.zaklad;
    c.text.split(/(\{\{[A-Z0-9_]+\}\})/).forEach(kus => {
      if (!kus) return;
      const r = /^\{\{[A-Z0-9_]+\}\}$/.test(kus) ? (symRPr[kus] != null ? symRPr[kus] : rPr) : rPr;
      const posl = useky[useky.length - 1];
      if (posl && posl.rPr === r) posl.text += kus; else useky.push({ rPr: r, text: kus });
    });
  });
  const behy = useky.map(u => '<w:r>' + u.rPr + u.text.split(/([\t\n\f])/).filter(x => x !== '').map(x =>
    x === '\t' ? '<w:tab/>' : x === '\n' ? '<w:br/>' : x === '\f' ? '<w:br w:type="page"/>'
      : '<w:t xml:space="preserve">' + xmlEsc(x) + '</w:t>').join('') + '</w:r>').join('');
  return rozbor.otevr + (keepNext ? pPrKeepNext(rozbor.pPr) : rozbor.pPr) + behy + rozbor.ostatni.join('') + '</w:p>';
}

/* Odstavce dílu k překladu: [{ cz, styly: [rPr…] }] (pro kostru). */
function odstavceKPrekladu(xml) {
  const out = [];
  vnitrniSpany(xml).forEach(sp => {
    const r = rozborOdstavce(xml.slice(sp.zac, sp.kon));
    const text = r.behy.map(b => b.text).join('');
    if (!maText(text)) return;
    const st = stylyOdstavce(r.behy);
    out.push({ cz: zapisOdstavce(r.behy, st), styly: st.dalsi, slozity: r.slozity });
  });
  return out;
}

/* Přeloží díl podle slovníku { normKlic(cz) → záznam }. Vrací
 * { xml, chybi: [cz], vady: [text], prelozeno }. Nepřeložený odstavec
 * zůstane česky a vrátí se v `chybi`. */
/* Pojmenovaná místa ze záznamů { misto, <jazyk> }: [[JMENO]] → text. */
function mistaZeZaznamu(zaznamy, L) {
  const m = {};
  (zaznamy || []).forEach(z => { if (z && typeof z.misto === 'string') m[z.misto] = z[L]; });
  return m;
}
function rozvinMista(text, mista) {
  const vady = [];
  const out = String(text).replace(MISTO_RE, (_x, jm) => {
    const t = mista && mista[jm];
    if (typeof t !== 'string' || !t.trim()) { vady.push('místo [[' + jm + ']] není ve slovníku přeložené'); return ''; }
    return t;
  });
  return { text: out, vady };
}

/* Bloky „držet spolu" (D4): odstavce mezi kotvou `za` a nejbližší další
 * kotvou `pred` (klíče slovníku) dostanou w:keepNext — i prázdné řádky
 * podpisového bloku, které slovník podle textu nepozná. */
function svazaneOdstavce(klice, bloky) {
  const out = new Set();
  (bloky || []).forEach(b => klice.forEach((k, i) => {
    if (k !== b.za) return;
    for (let j = i + 1; j < klice.length; j++) {
      if (klice[j] === b.pred) { for (let q = i + 1; q < j; q++) out.add(q); break; }
    }
  }));
  return out;
}
const klicOdstavce = r => { const t = r.behy.map(b => b.text).join(''); return maText(t) ? normKlic(zapisOdstavce(r.behy, stylyOdstavce(r.behy))) : null; };

function prelozXml(xml, slovnik, L, mista, bloky) {
  L = L || 'en';
  const chybi = [], vady = [];
  let prelozeno = 0;
  const spany = vnitrniSpany(xml);
  const svazat = svazaneOdstavce(spany.map(sp => klicOdstavce(rozborOdstavce(xml.slice(sp.zac, sp.kon)))), bloky);
  for (let i = spany.length - 1; i >= 0; i--) {
    const sp = spany[i], odst = xml.slice(sp.zac, sp.kon);
    const r = rozborOdstavce(odst);
    const text = r.behy.map(b => b.text).join('');
    if (!maText(text)) {
      if (svazat.has(i)) xml = xml.slice(0, sp.zac) + r.otevr + pPrKeepNext(r.pPr) + odst.slice(r.otevr.length + r.pPr.length) + xml.slice(sp.kon);
      continue;
    }
    const st = stylyOdstavce(r.behy);
    const cz = zapisOdstavce(r.behy, st);
    const z = slovnik.get(normKlic(cz));
    if (!z || !String(z[L] || '').trim()) { chybi.push(cz); continue; }
    const rm = rozvinMista(z[L], mista);
    if (rm.vady.length) { vady.push(rm.vady.join('; ') + ': „' + bezZnacek(cz).slice(0, 80) + '"'); continue; }
    const en = rm.text;
    const vada = r.slozity ? 'odstavec s obrázkem, polem nebo odkazem se nepřeskládává'
      : symbolySerazene(en) !== symbolySerazene(cz) ? 'symboly nesouhlasí (' + symbolySerazene(cz) + ' × ' + symbolySerazene(en) + ')'
      : podpisOddelovacu(bezZnacek(en)) !== podpisOddelovacu(bezZnacek(cz)) ? 'tabulátory / zalomení nesouhlasí s češtinou'
      : '';
    if (vada) { vady.push(vada + ': „' + bezZnacek(cz).slice(0, 80) + '"'); continue; }
    try {
      xml = xml.slice(0, sp.zac) + slozOdstavec(r, st, en, svazat.has(i)) + xml.slice(sp.kon);
      prelozeno++;
    } catch (e) { vady.push(e.message + ': „' + bezZnacek(cz).slice(0, 80) + '"'); }
  }
  return { xml, chybi: chybi.reverse(), vady: vady.reverse(), prelozeno };
}

const DILY = /^word\/(document|header\d*|footer\d*)\.xml$/;

function nactiSlovnik(soubor) {
  const zaznamy = fs.existsSync(soubor) ? JSON.parse(fs.readFileSync(soubor, 'utf8')) : [];
  if (!Array.isArray(zaznamy)) throw new Error(soubor + ': slovník musí být pole záznamů { cz, en, pozn }');
  const mapa = new Map();
  zaznamy.forEach(z => { if (z && typeof z.cz === 'string') mapa.set(normKlic(z.cz), z); });
  return { zaznamy, mapa };
}
const slovnikSoubor = (sablona, L) => sablona.replace(/\.docx$/i, '.preklad_' + (L || 'en') + '.json');

async function kostra(soubor, L) {
  L = L || 'en';
  const polozky = await dg.zipPrecti(new Uint8Array(fs.readFileSync(soubor)));
  const { zaznamy, mapa } = nactiSlovnik(slovnikSoubor(soubor, L));
  let novych = 0;
  for (const p of polozky) {
    if (!DILY.test(p.nazev)) continue;
    odstavceKPrekladu(dec.decode(p.data)).forEach(o => {
      if (mapa.has(normKlic(o.cz))) return;
      const z = { cz: o.cz, [L]: '', pozn: '' };
      if (o.styly.length) z.styly = o.styly;
      if (o.slozity) z.slozity = true;
      zaznamy.push(z); mapa.set(normKlic(o.cz), z); novych++;
    });
  }
  fs.writeFileSync(slovnikSoubor(soubor, L), JSON.stringify(zaznamy, null, 1) + '\n');
  return { zaznamu: zaznamy.length, novych, soubor: slovnikSoubor(soubor, L) };
}

/* SLOVNÍK Z REVIDOVANÉHO ZNĚNÍ (D4, 22. 10. 2026 — J. V. 21. 10.: revidované
 * EN/DE/FR šablony na Disku jsou závazné znění). Revize vznikla z výstupu
 * nástroje, odstavce tedy jdou 1 : 1 s češtinou (po dílech, v pořadí).
 * Z každé dvojice odstavců se odvodí zápis překladu: písmo běhu revize se
 * najde mezi styly české věty (základ = bez značky, další = <sN>), symboly
 * nesou písmo svého běhu; w:keepNext, které revize přidala, jde do bloku
 * „drzetSpolu" mezi textovými kotvami před a za úsekem. Odvozený
 * zápis se hned složí a porovná s revizí — co nesedí, je `vada`. */
const slucBehy = behy => behy.reduce((o, b) => {
  if (!b.text) return o;
  if (o.length && o[o.length - 1].rPr === b.rPr) o[o.length - 1].text += b.text; else o.push({ rPr: b.rPr, text: b.text });
  return o;
}, []);
const odstavceDilu = xml => vnitrniSpany(xml).map(sp => rozborOdstavce(xml.slice(sp.zac, sp.kon)));
const textOdstavce = r => r.behy.map(b => b.text).join('');

function zapisZRevize(rCz, rRev, L) {
  const st = stylyOdstavce(rCz.behy), cz = zapisOdstavce(rCz.behy, st);
  const seznam = [st.zaklad].concat(st.dalsi, st.pomocne).map(r => jazykXml(r, L)), symRPr = {};
  rCz.behy.forEach(b => (b.text.match(SYMBOL_RE) || []).forEach(s => { if (!(s in symRPr)) symRPr[s] = jazykXml(b.rPr, L); }));
  let out = '', akt = 0, vada = '';
  rRev.behy.forEach(b => String(b.text).split(/(\{\{[A-Z0-9_]+\}\})/).forEach(kus => {
    if (!kus) return;
    if (/^\{\{[A-Z0-9_]+\}\}$/.test(kus)) {
      if (symRPr[kus] != null && symRPr[kus] !== b.rPr && !vada) vada = 'symbol ' + kus + ' má v revizi jiné písmo';
      out += kus; return;
    }
    let s = seznam.indexOf(b.rPr);
    if (s < 0) { if (/\p{L}/u.test(kus) && !vada) vada = 'písmo běhu, které česká věta nemá'; s = akt; }
    if (s !== akt) { if (akt) out += '</s' + akt + '>'; if (s) out += '<s' + s + '>'; akt = s; }
    out += kus;
  }));
  if (akt) out += '</s' + akt + '>';
  out = out.replace(/<\/s(\d+)><s\1>/g, '');
  const keepNext = /<w:keepNext\/>/.test(rRev.pPr) && !/<w:keepNext\/>/.test(rCz.pPr);
  if (!vada) {
    try {
      const r = rozborOdstavce(jazykXml(slozOdstavec(rCz, st, out, keepNext), L));
      if (JSON.stringify(slucBehy(r.behy)) !== JSON.stringify(slucBehy(rRev.behy))) vada = 'běhy po složení nesouhlasí s revizí';
      else if (r.pPr !== rRev.pPr) vada = 'vlastnosti odstavce (w:pPr) nesouhlasí s revizí';
    } catch (e) { vada = e.message; }
  }
  return { cz, text: out, keepNext, vada };
}

const bezMist = r => zapisOdstavce(r.behy, stylyOdstavce(r.behy));
const nazevDokumentu = polozky => {
  const p = polozky.find(x => x.nazev === 'docProps/core.xml');
  const m = p && dec.decode(p.data).match(/<dc:title>([^<]*)<\/dc:title>/);
  return m ? xmlUnesc(m[1]) : '';
};

/* Upraví záznamy slovníku jazyka L podle revize. Vrací { zaznamy, zmeneno,
 * novych, beze, sporne: [], vady: [] }; vstupní pole se nemění. */
async function slovnikZRevize(czBajty, revBajty, zaznamy, L) {
  zaznamy = JSON.parse(JSON.stringify(zaznamy || []));
  const pc = await dg.zipPrecti(czBajty), pr = await dg.zipPrecti(revBajty);
  const odvozene = new Map(), sporne = [], vady = [], bloky = [];
  for (const p of pc) {
    if (!DILY.test(p.nazev)) continue;
    const q = pr.find(x => x.nazev === p.nazev);
    if (!q) { vady.push('revize nemá díl ' + p.nazev); continue; }
    const oc = odstavceDilu(dec.decode(p.data)), or = odstavceDilu(dec.decode(q.data));
    if (oc.length !== or.length) { vady.push(p.nazev + ': počet odstavců ' + oc.length + ' × revize ' + or.length + ' — revize nejde spárovat'); continue; }
    const kn = r => /<w:keepNext\/>/.test(r.pPr);
    const pridany = oc.map((rc, i) => kn(or[i]) && !kn(rc));
    for (let i = 0; i < pridany.length; i++) {
      if (!pridany[i] || pridany[i - 1]) continue;
      let e = i; while (pridany[e + 1]) e++;
      const za = i > 0 ? klicOdstavce(oc[i - 1]) : null, pred = e + 1 < oc.length ? klicOdstavce(oc[e + 1]) : null;
      if (!za || !pred) vady.push(p.nazev + ': w:keepNext v revizi u odstavců #' + i + '–#' + e + ' nemá textové kotvy');
      else bloky.push({ za: bezMist(oc[i - 1]), pred: bezMist(oc[e + 1]) });
    }
    oc.forEach((rc, i) => {
      if (!maText(textOdstavce(rc))) return;
      const o = zapisZRevize(rc, or[i], L), k = normKlic(o.cz);
      if (o.vada) vady.push(o.vada + ': „' + bezZnacek(o.cz).slice(0, 80) + '"');
      const driv = odvozene.get(k);
      if (driv && driv.text !== o.text) sporne.push('stejná česká věta, revize ji překládá různě: „' + bezZnacek(o.cz).slice(0, 80) + '"');
      else if (!driv) odvozene.set(k, o);
    });
  }
  const mapa = new Map();
  zaznamy.forEach(z => { if (z && typeof z.cz === 'string') mapa.set(normKlic(z.cz), z); });
  const mista = mistaZeZaznamu(zaznamy, L);
  let zmeneno = 0, novych = 0, beze = 0;
  odvozene.forEach((o, k) => {
    const z = mapa.get(k);
    if (!z) { zaznamy.push(mapa.set(k, { cz: o.cz, [L]: o.text, pozn: '' }).get(k)); novych++; return; }
    const stary = rozvinMista(z[L] || '', mista).text;
    if (stary === o.text) { beze++; return; }
    const casti = String(z[L] || '').split(/\[\[([A-Z0-9_]+)\]\]/);
    if (casti.length === 3 && o.text.startsWith(casti[0]) && o.text.endsWith(casti[2]) && o.text.length >= casti[0].length + casti[2].length) {
      const mz = zaznamy.find(x => x && x.misto === casti[1]);                 // pojmenované místo zůstane
      mz[L] = o.text.slice(casti[0].length, o.text.length - casti[2].length); mista[casti[1]] = mz[L];
    } else z[L] = o.text;
    zmeneno++;
  });
  const popis = b => JSON.stringify([b.za, b.pred]);
  if (zaznamy.filter(z => z && z.drzetSpolu).map(z => popis(z.drzetSpolu)).join() !== bloky.map(popis).join()) {
    zaznamy = zaznamy.filter(z => !(z && z.drzetSpolu));
    bloky.forEach(b => zaznamy.push({ drzetSpolu: b, pozn: 'w:keepNext odstavců mezi kotvami (revidované znění)' }));
    zmeneno += bloky.length;
  }
  const nr = nazevDokumentu(pr);
  if (nr && nr !== nazevDokumentu(pc)) {
    let z = zaznamy.find(x => x && x.vlastnost === 'title');
    if (!z) { z = { vlastnost: 'title', pozn: 'název dokumentu (docProps)' }; zaznamy.push(z); }
    if (z[L] !== nr) { z[L] = nr; zmeneno++; }
  }
  return { zaznamy, zmeneno, novych, beze, sporne, vady };
}

/* Porovná jazykovou šablonu z nástroje s revizí: odstavce (text, běhy po
 * sloučení stejného písma, w:pPr), název dokumentu a jazyk ve stylech
 * a nastavení. Vrací { odstavcu, text, behy, pPr, ostatni: [], rozdily: [] }. */
async function porovnejSRevizi(vystupBajty, revBajty) {
  const pa = await dg.zipPrecti(vystupBajty), pb = await dg.zipPrecti(revBajty);
  const v = { odstavcu: 0, text: 0, behy: 0, pPr: 0, ostatni: [], rozdily: [] };
  for (const p of pa) {
    const q = pb.find(x => x.nazev === p.nazev);
    if (!DILY.test(p.nazev)) continue;
    if (!q) { v.ostatni.push('revize nemá ' + p.nazev); continue; }
    const oa = odstavceDilu(dec.decode(p.data)), ob = odstavceDilu(dec.decode(q.data));
    if (oa.length !== ob.length) { v.ostatni.push(p.nazev + ': počet odstavců ' + oa.length + ' × ' + ob.length); continue; }
    oa.forEach((a, i) => {
      const b = ob[i], ta = textOdstavce(a), tb = textOdstavce(b);
      v.odstavcu++;
      const druh = ta !== tb ? 'text' : JSON.stringify(slucBehy(a.behy)) !== JSON.stringify(slucBehy(b.behy)) ? 'behy' : a.pPr !== b.pPr ? 'pPr' : '';
      if (druh) { v[druh]++; v.rozdily.push(druh + ' (' + p.nazev + ' #' + i + '): „' + ta.slice(0, 70) + '" × „' + tb.slice(0, 70) + '"'); }
    });
  }
  if (nazevDokumentu(pa) !== nazevDokumentu(pb)) v.ostatni.push('název dokumentu: „' + nazevDokumentu(pa) + '" × „' + nazevDokumentu(pb) + '"');
  const jaz = (pp, n, re) => { const x = pp.find(y => y.nazev === n); return x ? (dec.decode(x.data).match(re) || []).join('|') : ''; };
  [['word/styles.xml', /<w:lang w:val="[^"]*"/g], ['word/settings.xml', /<w:themeFontLang w:val="[^"]*"/g]].forEach(([n, re]) => {
    if (jaz(pa, n, re) !== jaz(pb, n, re)) v.ostatni.push('jazyk v ' + n + ' nesouhlasí');
  });
  return v;
}

/* Vyrobí jazykovou šablonu a zkontroluje ji. Vrací { bajty, problemy: [], pozn: [] }. */
async function prelozSablonu(bajty, zaznamy, L) {
  L = L || 'en';
  if (JAZYKY_SOD.indexOf(L) < 0) throw new Error('Neznámý jazyk „' + L + '" (en, de, fr)');
  const mista = mistaZeZaznamu(zaznamy, L);
  const mapa = new Map();
  (zaznamy || []).forEach(z => { if (z && typeof z.cz === 'string') mapa.set(normKlic(z.cz), z); });
  const polozky = await dg.zipPrecti(bajty);
  const problemy = [];
  let prelozeno = 0;
  const nazev = (zaznamy || []).find(z => z && z.vlastnost === 'title' && typeof z[L] === 'string');
  const bloky = (zaznamy || []).filter(z => z && z.drzetSpolu).map(z => ({ za: normKlic(z.drzetSpolu.za), pred: normKlic(z.drzetSpolu.pred) }));
  for (const p of polozky) {
    if (p.nazev === 'word/styles.xml') p.data = enc.encode(dec.decode(p.data).replace(/(<w:lang w:val=")[^"]*"/g, '$1' + KOD_JAZYKA[L] + '"'));
    if (p.nazev === 'word/settings.xml') p.data = enc.encode(dec.decode(p.data).replace(/(<w:themeFontLang w:val=")[^"]*"/, '$1' + KOD_JAZYKA[L] + '"'));
    if (p.nazev === 'docProps/core.xml' && nazev) p.data = enc.encode(dec.decode(p.data)
      .replace(/<dc:title\/>|<dc:title>[^<]*<\/dc:title>/, '<dc:title>' + xmlEsc(nazev[L]) + '</dc:title>'));
    if (!DILY.test(p.nazev)) continue;
    const v = prelozXml(dec.decode(p.data), mapa, L, mista, bloky);
    v.xml = jazykXml(v.xml, L);                              // w:lang cs-CZ → jazyk šablony
    /* tělo dokumentu bez w:rsid* u běhů (revidované znění je nemá; v záhlaví zůstávají) */
    if (p.nazev === 'word/document.xml') v.xml = v.xml.replace(/<w:r(?:\s+w:rsid\w*="[^"]*")+\s*>/g, '<w:r>');
    p.data = enc.encode(v.xml);
    prelozeno += v.prelozeno;
    v.chybi.forEach(t => problemy.push('nepřeloženo (' + p.nazev + '): „' + bezZnacek(t).slice(0, 90) + '"'));
    v.vady.forEach(t => problemy.push('vada (' + p.nazev + '): ' + t));
  }
  const vystup = new Uint8Array(await dg.zipZapis(polozky).arrayBuffer());
  (await dg.docxXmlVady(vystup.slice().buffer)).forEach(t => problemy.push('XML: ' + t));
  const symCz = so.sablonaSymboly(await dg.docxTextSablony(bajty.slice().buffer));
  const odstavce = await dg.docxTextSablony(vystup.slice().buffer);
  const rozdil = so.sablonaSymbolyRozdil(symCz, so.sablonaSymboly(odstavce));
  if (rozdil.ubylo.length) problemy.push('chybí symboly: ' + rozdil.ubylo.join(', '));
  if (rozdil.pribylo.length) problemy.push('navíc symboly: ' + rozdil.pribylo.join(', '));
  const jazyk = so.sablonaJazykOdhad(odstavce);
  if (jazyk.jazyk !== L) problemy.push('odhad jazyka: ' + jazyk.jazyk + ' (' + Math.round(jazyk.podil * 100) + ' %), čekán jazyk ' + L);
  odstavce.filter(t => CESKE_ZNAKY[L].test(String(t).replace(SYMBOL_RE, '').replace(ZKRATKY_CZ, '$1')))
    .forEach(t => problemy.push('česká diakritika: „' + String(t).slice(0, 90) + '"'));
  const pozn = (zaznamy || []).filter(z => z && String(z.pozn || '').trim()).map(z => z.pozn);
  return { bajty: vystup, problemy, pozn, prelozeno, jazyk, symbolu: symCz.length };
}

async function hlavni() {
  let argy = process.argv.slice(2);
  let L = 'en';
  const ij = argy.indexOf('--jazyk');
  if (ij >= 0) { L = String(argy[ij + 1] || ''); argy = argy.slice(0, ij).concat(argy.slice(ij + 2)); }
  if (JAZYKY_SOD.indexOf(L) < 0) { console.error('Neznámý jazyk „' + L + '" (--jazyk en | de | fr)'); process.exit(2); }
  if (argy[0] === '--kostra') {
    const slozka = argy[1];
    if (!slozka) { console.error('Použití: node nastroje/preklad_sod.js --kostra [--jazyk en|de|fr] <složka> [soubor.docx …]'); process.exit(2); }
    const soubory = (argy.length > 2 ? argy.slice(2) : SABLONY_SOD).map(f => path.join(slozka, f)).filter(f => fs.existsSync(f));
    if (!soubory.length) throw new Error('Ve složce ' + slozka + ' není žádná šablona SoD (' + SABLONY_SOD.join(', ') + ')');
    for (const f of soubory) {
      const k = await kostra(f, L);
      console.log('✓ ' + path.basename(k.soubor) + ' — záznamů ' + k.zaznamu + ', nových ' + k.novych);
    }
    return 0;
  }
  if (argy[0] === '--z-revize' || argy[0] === '--porovnej') {
    /* --z-revize <složka> [výstupní složka] · --porovnej <složka> [soubor.docx …] */
    const slozka = argy[1], porovnat = argy[0] === '--porovnej';
    const vystupni = (!porovnat && argy[2]) || slozka;
    if (!slozka) { console.error('Použití: node nastroje/preklad_sod.js --z-revize [--jazyk en|de|fr] <složka> [výstupní složka]\n'
      + '        node nastroje/preklad_sod.js --porovnej [--jazyk en|de|fr] <složka> [soubor.docx …]'); process.exit(2); }
    let celkem = 0, nalezeno = 0;
    const sablony = porovnat && argy.length > 2 ? argy.slice(2) : SABLONY_SOD;
    for (const f of sablony.map(x => path.join(slozka, x)).filter(x => fs.existsSync(x))) {
      const rev = f.replace(/\.docx$/i, '_' + L.toUpperCase() + '.docx');
      if (!fs.existsSync(rev)) continue;
      nalezeno++;
      const czB = new Uint8Array(fs.readFileSync(f)), revB = new Uint8Array(fs.readFileSync(rev));
      const zaz = nactiSlovnik(slovnikSoubor(f, L)).zaznamy;
      if (argy[0] === '--z-revize') {
        const v = await slovnikZRevize(czB, revB, zaz, L);
        if (!fs.existsSync(vystupni)) fs.mkdirSync(vystupni, { recursive: true });
        const cil = path.join(vystupni, path.basename(slovnikSoubor(f, L)));
        fs.writeFileSync(cil, JSON.stringify(v.zaznamy, null, 1) + '\n');
        celkem += v.vady.length + v.sporne.length;
        console.log((v.vady.length + v.sporne.length ? '✗ ' : '✓ ') + path.basename(cil) + ' — změněno ' + v.zmeneno + ', nových ' + v.novych
          + ', beze změny ' + v.beze + v.sporne.concat(v.vady).map(t => '\n    ' + t).join(''));
      } else {
        const v = await porovnejSRevizi((await prelozSablonu(czB, zaz, L)).bajty, revB);
        const n = v.text + v.behy + v.pPr + v.ostatni.length;
        celkem += n;
        console.log((n ? '✗ ' : '✓ ') + path.basename(rev) + ' — odstavců ' + v.odstavcu + ', rozdíl textu ' + v.text + ', jen běhy ' + v.behy
          + ', w:pPr ' + v.pPr + v.ostatni.concat(v.rozdily).map(t => '\n    ' + t).join(''));
      }
    }
    if (!nalezeno) throw new Error('Ve složce ' + slozka + ' není česká šablona SoD s revizí …_' + L.toUpperCase() + '.docx');
    console.log(celkem ? '\nROZDÍLŮ / VAD: ' + celkem : '\nBez rozdílů.');
    return celkem ? 1 : 0;
  }
  const slozka = argy[0], vystupni = argy[1] || argy[0];
  if (!slozka) { console.error('Použití: node nastroje/preklad_sod.js [--kostra] [--jazyk en|de|fr] <složka> [výstupní složka]'); process.exit(2); }
  const soubory = SABLONY_SOD.map(f => path.join(slozka, f)).filter(f => fs.existsSync(f));
  if (!soubory.length) throw new Error('Ve složce ' + slozka + ' není žádná šablona SoD (' + SABLONY_SOD.join(', ') + ')');
  if (!fs.existsSync(vystupni)) fs.mkdirSync(vystupni, { recursive: true });
  let celkem = 0;
  for (const f of soubory) {
    const sl = slovnikSoubor(f, L);
    if (!fs.existsSync(sl)) throw new Error('Chybí slovník ' + sl + ' — nejdřív --kostra a vyplnit „' + L + '"');
    const v = await prelozSablonu(new Uint8Array(fs.readFileSync(f)), nactiSlovnik(sl).zaznamy, L);
    const cil = path.join(vystupni, path.basename(f).replace(/\.docx$/i, '_' + L.toUpperCase() + '.docx'));
    fs.writeFileSync(cil, v.bajty);
    celkem += v.problemy.length;
    console.log((v.problemy.length ? '✗ ' : '✓ ') + path.basename(cil) + ' — přeloženo odstavců ' + v.prelozeno
      + ', symbolů ' + v.symbolu + ', jazyk ' + v.jazyk.jazyk + ' (' + Math.round(v.jazyk.podil * 100) + ' %)'
      + v.problemy.map(t => '\n    ' + t).join('')
      + (v.pozn.length ? '\n  poznámky pro rodilého mluvčího: ' + v.pozn.length : ''));
  }
  console.log('\nVýstup: ' + vystupni + (celkem ? '\nPROBLÉMŮ: ' + celkem : '\nBez problémů.'));
  return celkem ? 1 : 0;
}

if (require.main === module) hlavni().then(k => process.exit(k)).catch(e => { console.error('CHYBA: ' + e.message); process.exit(1); });
module.exports = { rozborOdstavce, stylyOdstavce, zapisOdstavce, slozOdstavec, odstavceKPrekladu, prelozXml, prelozSablonu, normKlic,
  rozvinMista, mistaZeZaznamu, JAZYKY_SOD, slovnikZRevize, porovnejSRevizi, zapisZRevize };
