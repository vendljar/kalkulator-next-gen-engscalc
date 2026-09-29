/* ŠABLONY: ZDROJ JAZYKOVÉ VERZE A VRÁCENÍ VERZE (#348, #349, 24. 9. 2026).
 *
 * Server hlídá dvě nová pravidla:
 *   – jazyková verze smí nést `zdrojOtisk` jen platné české šablony (jinak
 *     409), a stejný soubor se smí zveřejnit znovu, když nově patří k jiné
 *     češtině (dřív „už je zveřejněná" → mutace „zastaralá" natrvalo);
 *   – akce `vratit` zveřejní starší verzi znovu jako novou, jen administrátor.
 *
 * Paměťové úložiště. Spuštění: node netlify/test_sablony.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

const { default: prihlaseni } = await import('./functions/prihlaseni.mjs');
const { default: sablony } = await import('./functions/sablony.mjs');
const { default: uzivatele } = await import('./functions/uzivatele.mjs');
const { ADMIN_EMAIL } = await import('./lib/sdilene.mjs');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const login = async (e, h) => ((await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h }))
  .headers.get('set-cookie') || '').split(';')[0];
const api = async (telo, c) => { const r = await post(sablony, 'http://x/api/sablony', telo, c); return { st: r.status, ...(await r.json()) }; };
const rejstrik = async (c) => (await (await sablony(new Request('http://x/api/sablony', { headers: { cookie: c } }))).json()).rejstrik;

const cA = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obch@priklad.cz', jmeno: 'Obch', role: 'Obchodník', heslo: 'Heslo12345x' }, cA);
const cO = await login('obch@priklad.cz', 'Heslo12345x');

/* Skutečný minimální .docx (B99, 29. 9. 2026 — server obsah šablony
 * rozbalí a zkontroluje); obsah stačí odlišit textem. */
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const DG = require('../src/docxgen.js');
const docx = async (x) => Buffer.from(await DG.docxDokumentBlob('Šablona ' + String(x) + ' {{FIRMA_NAZEV}}', []).arrayBuffer()).toString('base64');

const cz1 = await api({ akce: 'zverejnit', typ: 'nabidka', nazev: 'cz1.docx', data: await docx('cz1') }, cA);
test('česká v1 zveřejněna', cz1.ok && cz1.verze === 1, cz1);
const en1 = await api({ akce: 'zverejnit', typ: 'nabidka_en', nazev: 'en.docx', data: await docx('en'), zdrojOtisk: cz1.otisk }, cA);
test('EN k platné češtině projde', en1.ok && en1.verze === 1, en1);
let rej = await rejstrik(cA);
test('rejstřík u EN zná zdrojOtisk', rej.typy.nabidka_en.platna.zdrojOtisk === cz1.otisk, rej.typy.nabidka_en);

const spatny = await api({ akce: 'zverejnit', typ: 'nabidka_de', nazev: 'de.docx', data: await docx('de'), zdrojOtisk: 'ffffffffffffffff' }, cA);
test('DE k jiné než platné češtině → 409', spatny.st === 409 && /mezitím změnila/.test(spatny.chyba), spatny);
const neplatny = await api({ akce: 'zverejnit', typ: 'nabidka_de', nazev: 'de.docx', data: await docx('de'), zdrojOtisk: '<script>' }, cA);
test('neplatný tvar otisku → 400', neplatny.st === 400, neplatny);
const znovu = await api({ akce: 'zverejnit', typ: 'nabidka_en', nazev: 'en.docx', data: await docx('en'), zdrojOtisk: cz1.otisk }, cA);
test('stejný soubor ke stejné češtině se znovu nezveřejní (400)', znovu.st === 400, znovu);

const cz2 = await api({ akce: 'zverejnit', typ: 'nabidka', nazev: 'cz2.docx', data: await docx('cz2') }, cA);
test('česká v2 zveřejněna', cz2.ok && cz2.verze === 2, cz2);
const staraCz = await api({ akce: 'zverejnit', typ: 'nabidka_en', nazev: 'en.docx', data: await docx('en'), zdrojOtisk: cz1.otisk }, cA);
test('EN k už neplatné v1 → 409', staraCz.st === 409, staraCz);
const en2 = await api({ akce: 'zverejnit', typ: 'nabidka_en', nazev: 'en.docx', data: await docx('en'), zdrojOtisk: cz2.otisk }, cA);
test('STEJNÝ soubor EN k nové češtině projde (dřív „už je zveřejněná")', en2.ok && en2.verze === 2, en2);
const bezZdroje = await api({ akce: 'zverejnit', typ: 'nabidka_en', nazev: 'en.docx', data: await docx('en') }, cA);
test('bez zdrojOtisku stejný soubor dál odmítnut', bezZdroje.st === 400, bezZdroje);

/* vrácení verze */
const obVrat = await api({ akce: 'vratit', typ: 'nabidka', verze: 1 }, cO);
test('obchodník vracet nesmí (403)', obVrat.st === 403, obVrat);
const vrat = await api({ akce: 'vratit', typ: 'nabidka', verze: 1, poznamka: 'omyl' }, cA);
test('administrátor vrátí v1 → vznikne v3', vrat.ok && vrat.verze === 3 && vrat.vracenoZ === 1 && vrat.otisk === cz1.otisk, vrat);
rej = await rejstrik(cA);
test('v3 nese vracenoZ a poznámku', rej.typy.nabidka.platna.vracenoZ === 1 && /vráceno z verze 1 – omyl/.test(rej.typy.nabidka.platna.poznamka),
  rej.typy.nabidka.platna);
test('historie drží v2 i v1', rej.typy.nabidka.historie.map(v => v.verze).join() === '2,1');
const soubor = await (await sablony(new Request('http://x/api/sablony?typ=nabidka', { headers: { cookie: cO } }))).json();
test('platná v3 má soubor v1', soubor.verze === 3 && soubor.data === await docx('cz1'), { verze: soubor.verze });
const platnaZnovu = await api({ akce: 'vratit', typ: 'nabidka', verze: 3 }, cA);
test('vracet platnou verzi nejde (400)', platnaZnovu.st === 400, platnaZnovu);
const neni = await api({ akce: 'vratit', typ: 'nabidka', verze: 9 }, cA);
test('neexistující verze → 404', neni.st === 404, neni);
const typ = await api({ akce: 'vratit', typ: '../x', verze: 1 }, cA);
test('neznámý typ → 400', typ.st === 400, typ);
const enK3 = await api({ akce: 'zverejnit', typ: 'nabidka_en', nazev: 'en.docx', data: await docx('en'), zdrojOtisk: cz1.otisk }, cA);
test('po vrácení platí otisk v1 → EN k němu projde', enK3.ok && enK3.verze === 3, enK3);

/* B99 (29. 9. 2026): šablona s vnější šablonou Wordu (attachedTemplate)
 * v settings.xml.rels se nezveřejní — před opravou server ověřil jen
 * začátek ZIPu a zveřejnil ji (200). */
{
  const enc = new TextEncoder();
  const zak = await DG.zipPrecti(new Uint8Array(await DG.docxDokumentBlob('Šablona B99 {{FIRMA_NAZEV}}', []).arrayBuffer()));
  zak.push({ nazev: 'word/_rels/settings.xml.rels', data: enc.encode('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/attachedTemplate" Target="https://example.invalid/x.dotm" TargetMode="External"/></Relationships>') });
  const zla = Buffer.from(await DG.zipZapis(zak).arrayBuffer()).toString('base64');
  const r = await api({ akce: 'zverejnit', typ: 'nabidka_en', nazev: 'en_zla.docx', data: zla }, cA);
  test('B99: zveřejnění šablony s vnějším attachedTemplate → 400 s popisem', r.st === 400 && /attachedTemplate/.test(r.chyba || ''), r);
  const rej = await rejstrik(cA);
  test('B99: odmítnutá šablona se do rejstříku nedostala', !JSON.stringify(rej).includes('en_zla.docx'));
  const nic = await api({ akce: 'zverejnit', typ: 'nabidka', nazev: 'nesmysl.docx', data: 'UEsDBBQAAAAIA' + Buffer.from('nesmysl').toString('base64') }, cA);
  test('B99: soubor, který jen začíná jako ZIP, ale nejde rozbalit → 400', nic.st === 400, nic);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
