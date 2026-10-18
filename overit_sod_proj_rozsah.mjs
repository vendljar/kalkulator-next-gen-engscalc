/* Ověření v prohlížeči: rozsah díla SoD projekce podle nabídky (#380 Q7,
 * rozhodnutí J. V. 17. 10. 2026 — varianta B; dávka V5, v18.10.3).
 *
 * Zakázka PROJ v sestavené aplikaci, v Kalkulaci PROJ jen DPZ + IČ + DPS
 * (zaměření, studie, EZČ … vyřazené) → smlouva o dílo PROJ
 * (dokumentVygeneruj jako tlačítko „Vytvořit smlouvu o dílo PROJ (Word)")
 * ze šablony v4: čl. II a III nesou jen nabízené činnosti, věta přílohy
 * č. 1 je vyjmenuje, žádná značka {{CIN_…}} ani {{SODP_ROZSAH_DILA}}
 * v dokumentu nezůstane; se všemi činnostmi je jich sedm. Stará v3 dál
 * vytiskne všech sedm a pevnou větu „DPZ+DSP".
 *
 * Šablony: leží-li v KNG_PODKLADY Sablona_SOD_PROJEKCE_v4.docx, zkouší se ta;
 * je-li tam jen _v3, v4 se z ní vyrobí (vyrob_sablony sodProjV4); jinak
 * syntetická ve stavbě skutečné. Model hlídá src/test_sod_proj_rozsah.js.
 *
 * Spouští se nad sestaveným buildem:
 *   NODE_PATH=$(npm root -g) node overit_sod_proj_rozsah.mjs */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
const KOREN = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
const { zipPrecti, zipZapis } = require(KOREN + 'src/docxgen.js');
const { sodProjV4 } = require(KOREN + 'nastroje/vyrob_sablony.js');
const ZC = require(KOREN + 'src/zkusebni_cenik.js');
const chyby = [], konzole = [];
const ok = (co, podm, info) => { console.log((podm ? '  ✓ ' : '  ✗ ') + co + (podm || info === undefined ? '' : '  ' + JSON.stringify(info))); chyby.push(!!podm); };
const enc = new TextEncoder(), dec = new TextDecoder();

/* ---- šablony ---- */
const dokument = telo => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
  + telo + '<w:sectPr/></w:body></w:document>';
const p = (t, num) => '<w:p>' + (num ? '<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="' + num + '"/></w:numPr></w:pPr>' : '')
  + (t ? '<w:r><w:t xml:space="preserve">' + t + '</w:t></w:r>' : '') + '</w:p>';
const docxB64 = async casti => Buffer.from(new Uint8Array(await zipZapis(casti).arrayBuffer())).toString('base64');
const sDocumentem = async (soubor, uprava) => {
  const casti = await zipPrecti(new Uint8Array(readFileSync(soubor)));
  const d = casti.find(x => x.nazev === 'word/document.xml');
  d.data = enc.encode(uprava(dec.decode(d.data)));
  return docxB64(casti);
};
const slozka = String(process.env.KNG_PODKLADY || '').trim();
const vPodkladech = j => slozka && existsSync(join(slozka, j)) ? join(slozka, j) : '';
let v4B64, v3B64, puvod;
if (vPodkladech('Sablona_SOD_PROJEKCE_v3.docx')) {
  v3B64 = readFileSync(vPodkladech('Sablona_SOD_PROJEKCE_v3.docx')).toString('base64');
  v4B64 = vPodkladech('Sablona_SOD_PROJEKCE_v4.docx') ? readFileSync(vPodkladech('Sablona_SOD_PROJEKCE_v4.docx')).toString('base64')
    : await sDocumentem(vPodkladech('Sablona_SOD_PROJEKCE_v3.docx'), x => sodProjV4(x));
  puvod = vPodkladech('Sablona_SOD_PROJEKCE_v4.docx') ? 'Sablona_SOD_PROJEKCE_v4.docx (a v3) z podkladů' : 'v4 vyrobená ze Sablona_SOD_PROJEKCE_v3.docx z podkladů';
} else {
  const cin2 = ['Zaměření a zpracování výstupů – zaměření.', 'Dokumentace pro povolení záměru – DPZ.', 'Inženýrská činnost DOSS – stanoviska.',
    'Podání žádosti na příslušný stavební úřad – a vyřízení povolení záměru.', 'Dokumentace pro provedení stavby – DPS.',
    'Ekonomická zadávací část – rozpočet', 'Výběr dodavatele pro realizaci záměru – nabídky.'];
  const cin3 = ['Zaměření a zpracování výstupů – 12 týdnů.', 'Dokumentace pro povolení záměru – 12 týdnů.', 'Inženýrská činnost DOSS – 12 týdnů.',
    'Vyřízení povolení záměru – 10 týdnů.', 'Dokumentace pro provedení stavby – 6 týdnů.', 'Ekonomická zadávací část – 2 týdny',
    'Zhotovitel předá objednateli dílo v počtu 2 paré.', 'Výběr dodavatele pro realizaci záměru – 6 týdnů'];
  const v3 = dokument(p('SMLOUVA O DÍLO') + p('Objednatel: {{OBJEDNATEL}}') + p('II. Předmět Díla') + p('Předmětem smlouvy je Dílo {{NAZEV_AKCE}}:', 6) + p('')
    + cin2.map(t => p(t, 2) + p('')).join('') + p('III. Termíny plnění') + p('') + cin3.map(t => p(t, 10) + p('')).join('')
    + p('IV. Cena díla') + p('Cena {{PROJ_CELKEM_BEZ_DPH}}') + p('{{SODP_PLATEBNI_KALENDAR}}', 4)
    + p('VII. Komunikace smluvních stran') + ['Kontakty.', 'Změna kontaktu.', 'Forma.', 'Doručení.',
      'Kterákoliv ze smluvních stran je oprávněna požadovat po druhé smluvní straně potvrzení kteréhokoliv oznámení poštou.',
      'Strana je oprávněna požadovat potvrzení oznámení poštou dle odst. 5. tohoto článku.'].map(t => p(t, 8)).join('')
    + p('VIII. Vyšší moc') + p('Cenová nabídka číslo {{CISLO_NABIDKY}} na vypracování dokumentace DPZ+DSP včetně zajištění inženýringu tj. zajištění vydání povolení záměru včetně nabytí právní moci – objekt {{ADRESA}}, ze dne {{DATUM}}.'));
  v3B64 = await docxB64([{ nazev: 'word/document.xml', data: enc.encode(v3) }]);
  v4B64 = await docxB64([{ nazev: 'word/document.xml', data: enc.encode(sodProjV4(v3)) }]);
  puvod = 'syntetická v3 → v4 (KNG_PODKLADY bez šablon SoD PROJ)';
}
console.log('Šablona SoD PROJ: ' + puvod);

/* ---- aplikace ---- */
const b = await chromium.launch();
const s = await b.newPage({ viewport: { width: 1500, height: 950 } });
s.on('console', m => { if (m.type() === 'error') konzole.push('error: ' + m.text()); });
s.on('pageerror', e => konzole.push('pageerror: ' + e.message));
await s.goto(KDE);
await s.waitForTimeout(700);
await s.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  ZAK = novaZakazka(); syncVarianta();
  ZAK.cislo = '2026 - OVP - CN - 0418';
  Object.assign(ZAK.projHlavicka, { objednatel: 'SVJ Zkušební 18', adresa: 'Zkušební 18, 100 00 Praha', nazevAkce: 'Projekce – zkouška rozsahu díla' });
  syncVarianta(); render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);

const nabidni = sekce => s.evaluate(sekce => {
  aktivniVarianta(ZAK).data.proj.zadani.sekce.forEach(x => (x.polozky || []).forEach(q => { q.vyrazeno = sekce.indexOf(x.key) < 0; }));
  syncVarianta(); render();
}, sekce);
const smlouva = b64 => s.evaluate(async b64 => {
  const bin = atob(b64); const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  try {
    const res = await dokumentVygeneruj('sodProj', u8.buffer, ZAK, aktivniVarianta(ZAK), JEKLY, 'cz');
    const bajty = new Uint8Array(await res.blob.arrayBuffer());
    let t = ''; for (let i = 0; i < bajty.length; i++) t += String.fromCharCode(bajty[i]);
    return { docx: btoa(t) };
  } catch (e) { return { chyba: e.message }; }
}, b64);
const odstavce = async r => {
  if (r.chyba) return { t: ['CHYBA: ' + r.chyba], xml: '' };
  const casti = await zipPrecti(new Uint8Array(Buffer.from(r.docx, 'base64')));
  const xml = dec.decode(casti.find(x => x.nazev === 'word/document.xml').data);
  return { xml, t: (xml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || []).map(x => x.replace(/<[^>]+>/g, '').replace(/ /g, ' ').trim()).filter(Boolean) };
};
const mezi = (t, od, po) => { const a = t.indexOf(od), c = t.indexOf(po, a + 1); return a < 0 || c < 0 ? [] : t.slice(a + 1, c); };
const CINNOST = /^(Zaměření a zpracování|Dokumentace pro povolení|Inženýrská činnost DOSS|Podání žádosti|Vyřízení povolení|Dokumentace pro provedení|Ekonomická zadávací|Výběr dodavatele)/;

console.log('— nabídka jen DPZ + IČ + DPS, šablona v4 —');
await nabidni(['dpz', 'ic', 'dps']);
{
  const d = await odstavce(await smlouva(v4B64));
  const ii = mezi(d.t, 'II. Předmět Díla', 'III. Termíny plnění').filter(x => CINNOST.test(x));
  ok('čl. II: Dokumentace pro povolení záměru, Inženýrská činnost DOSS, Podání žádosti…, Dokumentace pro provedení stavby',
    ii.length === 4 && /^Dokumentace pro povolení/.test(ii[0]) && /^Inženýrská/.test(ii[1]) && /^Podání/.test(ii[2]) && /^Dokumentace pro provedení/.test(ii[3]), ii.map(x => x.slice(0, 30)));
  const iii = mezi(d.t, 'III. Termíny plnění', 'IV. Cena díla');
  ok('čl. III: bez zaměření, EZČ a výběru dodavatele; předání díla zůstává',
    iii.filter(x => CINNOST.test(x)).length === 4 && !iii.some(x => /^(Zaměření|Ekonomická|Výběr)/.test(x)) && iii.some(x => /^Zhotovitel předá/.test(x)), iii.map(x => x.slice(0, 30)));
  const pr = d.t.find(x => /^Cenová nabídka/.test(x)) || '';
  ok('příloha č. 1: „na činnosti: dokumentace pro povolení záměru, … a dokumentace pro provedení stavby – objekt …"',
    /na činnosti: dokumentace pro povolení záměru, inženýrská činnost DOSS, podání žádosti na příslušný stavební úřad a vyřízení povolení záměru a dokumentace pro provedení stavby – objekt Zkušební 18/.test(pr), pr);
  ok('v dokumentu nezůstala značka {{CIN_…}}, {{SODP_ROZSAH_DILA}} ani „DPZ+DSP"', d.xml && !/CIN_|SODP_ROZSAH_DILA|DPZ\+DSP/.test(d.xml));
}
console.log('— nabídka se všemi činnostmi —');
await nabidni(['zamereni', 'dpz', 'ic', 'dps', 'ezc']);
{
  const d = await odstavce(await smlouva(v4B64));
  ok('čl. II i III: všech sedm činností', mezi(d.t, 'II. Předmět Díla', 'III. Termíny plnění').filter(x => CINNOST.test(x)).length === 7
    && mezi(d.t, 'III. Termíny plnění', 'IV. Cena díla').filter(x => CINNOST.test(x)).length === 7);
  const pr = d.t.find(x => /^Cenová nabídka/.test(x)) || '';
  ok('příloha: od zaměření po výběr dodavatele', /na činnosti: zaměření a zpracování výstupů, .* a výběr dodavatele pro realizaci záměru – objekt/.test(pr), pr);
}
console.log('— stará šablona v3 —');
await nabidni(['dpz', 'ic', 'dps']);
{
  const d = await odstavce(await smlouva(v3B64));
  ok('v3: smlouva vznikne jako dřív — všech sedm činností v čl. II a věta „DPZ+DSP"',
    mezi(d.t, 'II. Předmět Díla', 'III. Termíny plnění').filter(x => CINNOST.test(x)).length === 7 && /DPZ\+DSP/.test(d.xml), d.t.slice(0, 3));
}

await b.close();
if (konzole.length) console.log('Konzole:\n  ' + konzole.join('\n  '));
const spatne = chyby.filter(x => !x).length;
console.log(spatne ? `\n✗ ${spatne} z ${chyby.length} kontrol selhalo` : `\n✓ všech ${chyby.length} kontrol prošlo`);
process.exit(spatne || konzole.length ? 1 : 0);
