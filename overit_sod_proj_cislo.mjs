/* Ověření v prohlížeči: číslo SoD z krycího listu ve smlouvě o dílo OCK
 * i PROJ (zadání J. V. 15. 10. 2026, dávka S9, v15.10.11): „Aktualizuj
 * šablony, aby se nám do nich číslo SoD propisovalo z krycího listu zakázky
 * ve chvíli, kdy tam bude vyplněné."
 *
 * Dělá to, co obchodník: do krycího listu OCK a PROJ zapíše „Číslo SoD"
 * (jako z klávesnice) a vytiskne smlouvu o dílo (dokumentVygeneruj jako
 * tlačítko „Vytvořit smlouvu o dílo … (Word)"). Smlouva PROJ jde přes
 * šablonu v3 (vyrob_sablony --sod-proj-cislo), smlouva OCK přes řádek
 * „číslo {{SOD_CISLO_SMLOUVY}}" jako ve skutečné šabloně realizace.
 * Prázdné číslo nechá symbol vidět k doplnění.
 *
 * Šablony: leží-li v KNG_PODKLADY Sablona_SOD_PROJEKCE_v3.docx (nová z Disku)
 * nebo Sablona_SOD_PROJEKCE_v2.docx (z té se v3 vyrobí), zkouší se skutečná;
 * jinak syntetická ve stavbě skutečné (nadpis, podtitul, seznam plateb).
 * Model hlídá src/test_sod_proj_cislo.js.
 *
 * Spouští se nad sestaveným buildem:
 *   NODE_PATH=$(npm root -g) node overit_sod_proj_cislo.mjs */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
const KOREN = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
const { zipPrecti, zipZapis } = require(KOREN + 'src/docxgen.js');
const { sodProjV2, sodProjCislo } = require(KOREN + 'nastroje/vyrob_sablony.js');
const ZC = require(KOREN + 'src/zkusebni_cenik.js');
const chyby = [], konzole = [];
const ok = (co, podm, info) => { console.log((podm ? '  ✓ ' : '  ✗ ') + co + (podm || info === undefined ? '' : '  ' + JSON.stringify(info))); chyby.push(!!podm); };
const enc = new TextEncoder(), dec = new TextDecoder();

/* ---- šablony ---- */
const dokument = telo => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
  + telo + '<w:sectPr/></w:body></w:document>';
const p = (t, pPr = '') => '<w:p>' + pPr + '<w:r><w:t xml:space="preserve">' + t + '</w:t></w:r></w:p>';
const STRED = '<w:pPr><w:jc w:val="center"/></w:pPr>';
const docxB64 = async casti => Buffer.from(new Uint8Array(await zipZapis(casti).arrayBuffer())).toString('base64');
const sDocumentem = async (soubor, uprava) => {
  const casti = await zipPrecti(new Uint8Array(readFileSync(soubor)));
  const d = casti.find(x => x.nazev === 'word/document.xml');
  d.data = enc.encode(uprava(dec.decode(d.data)));
  return docxB64(casti);
};
const slozka = String(process.env.KNG_PODKLADY || '').trim();
const vPodkladech = j => slozka && existsSync(join(slozka, j)) ? join(slozka, j) : '';
let projB64, projPuvod;
if (vPodkladech('Sablona_SOD_PROJEKCE_v3.docx')) {
  projB64 = readFileSync(vPodkladech('Sablona_SOD_PROJEKCE_v3.docx')).toString('base64'); projPuvod = 'Sablona_SOD_PROJEKCE_v3.docx z podkladů';
} else if (vPodkladech('Sablona_SOD_PROJEKCE_v2.docx')) {
  projB64 = await sDocumentem(vPodkladech('Sablona_SOD_PROJEKCE_v2.docx'), x => sodProjCislo(x)); projPuvod = 'v3 vyrobená ze Sablona_SOD_PROJEKCE_v2.docx z podkladů';
} else {
  const platby = [1, 2, 3, 4, 5, 6, 7, 8].map(n => p('Platba ve výši {{SODP_PLATBA' + n + '_KC}} + DPH proběhne …')).join('');
  const vety = p('V případě prodlení zhotovitele s plněním dle bodu III. má právo objednatel zhotoviteli účtovat {{PODM_POKUTA_SPLATNOST_PROC}} % z ceny části Díla v prodlení.')
    + p('Pro případ prodlení objednatele s úhradou sjednávají smluvní strany smluvní pokutu ve výši {{PODM_POKUTA_SPLATNOST_PROC}} % z dlužné částky.');
  const v1 = dokument(p('SMLOUVA O DÍLO', STRED) + p('na zhotovení projektové dokumentace', STRED) + p('Objednatel: {{OBJEDNATEL}}')
    + p('Cena {{PROJ_CELKEM_BEZ_DPH}}') + vety + platby);
  projB64 = await docxB64([{ nazev: 'word/document.xml', data: enc.encode(sodProjCislo(sodProjV2(v1))) }]);
  projPuvod = 'syntetická v3 (KNG_PODKLADY bez šablon SoD PROJ)';
}
/* Realizace: řádek „číslo {{SOD_CISLO_SMLOUVY}}" pod nadpisem jako ve skutečné
 * šabloně (S7 ho jen plní, šablona se nemění). */
const ockB64 = await docxB64([{ nazev: 'word/document.xml', data: enc.encode(dokument(p('SMLOUVA O DÍLO', STRED)
  + p('číslo {{SOD_CISLO_SMLOUVY}}', STRED) + p('Objednatel: {{OBJEDNATEL}}') + p('cena {{CENA_BEZ_DPH}} (bez DPH)'))) }]);
console.log('Šablona SoD PROJ: ' + projPuvod);

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
  ZAK.cislo = '2026 - OPR - CN - 0411';
  ZAK.objednatel = 'SVJ Zkušební 11'; ZAK.adresa = 'Zkušební 11, 100 00 Praha'; ZAK.nazevAkce = 'Zkouška čísla SoD';
  Object.assign(ZAK.projHlavicka, { objednatel: 'SVJ Zkušební 11', adresa: 'Zkušební 11, 100 00 Praha', nazevAkce: 'Projekce – zkouška čísla SoD' });
  Object.assign(Z, { prejezd: 2.7, zdvih: 12, prohluben: 1.05, sirka: 1.51, hloubka: 1.515 });
  syncVarianta(); render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);

const napis = async (tab, sel, text) => {
  await s.evaluate(t => { prepniTab(t); render(); }, tab);
  await s.waitForTimeout(300);
  const radek = s.locator(sel + ' .kl-row').filter({ has: s.locator('.lbl', { hasText: /^Číslo SoD/ }) }).first();
  const pole = radek.locator('input, textarea').first();
  await pole.fill(text);
  await pole.dispatchEvent('change');
  await s.waitForTimeout(300);
};
const smlouva = (typ, b64) => s.evaluate(async ([typ, b64]) => {
  const bin = atob(b64); const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  ZAK.cislo = typ === 'sodProj' ? '2026 - OVP - CN - 0411' : '2026 - OPR - CN - 0411';   // P6: strana podle čísla
  try {
    const res = await dokumentVygeneruj(typ, u8.buffer, ZAK, aktivniVarianta(ZAK), JEKLY, 'cz');
    const bajty = new Uint8Array(await res.blob.arrayBuffer());
    let t = ''; for (let i = 0; i < bajty.length; i++) t += String.fromCharCode(bajty[i]);
    return { docx: btoa(t) };
  } catch (e) { return { chyba: e.message }; }
}, [typ, b64]);
const odstavce = async r => {
  if (r.chyba) return ['CHYBA: ' + r.chyba];
  const casti = await zipPrecti(new Uint8Array(Buffer.from(r.docx, 'base64')));
  const xml = dec.decode(casti.find(x => x.nazev === 'word/document.xml').data);
  return (xml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || []).map(x => x.replace(/<[^>]+>/g, '').replace(/ /g, ' ').trim()).filter(Boolean);
};

console.log('— prázdné Číslo SoD = návrh z čísla nabídky (#366) —');
{
  const proj = await odstavce(await smlouva('sodProj', projB64));
  ok('SoD PROJ: pod nadpisem návrh „číslo 2026 - OVP - SOD - 0411"', proj.includes('číslo 2026 - OVP - SOD - 0411'), proj.slice(0, 4));
  const ock = await odstavce(await smlouva('sod', ockB64));
  ok('SoD OCK: pod nadpisem návrh „číslo 2026 - OPR - SOD - 0411"', ock.includes('číslo 2026 - OPR - SOD - 0411'), ock.slice(0, 4));
}
console.log('— Číslo SoD zapsané v krycích listech —');
await s.evaluate(() => { ZAK.cislo = '2026 - OPR - CN - 0411'; });
await napis('kryci', '#page-kryci', '2026 - OPR - SOD - 0411R');
await s.evaluate(() => { ZAK.cislo = '2026 - OVP - CN - 0411'; });
await napis('kryciproj', '#page-kryciproj', '2026 OVP SOD 0411');
const ulozeno = await s.evaluate(() => { const d = aktivniVarianta(ZAK).data; return [d.kryci.hodnoty.cisloSod, d.kryciProj.hodnoty.cisloSod]; });
ok('čísla se uložila do obou krycích listů', ulozeno[0] === '2026 - OPR - SOD - 0411R' && ulozeno[1] === '2026 OVP SOD 0411', ulozeno);
{
  const proj = await odstavce(await smlouva('sodProj', projB64));
  const i = proj.findIndex(t => /na zhotovení projektové dokumentace/.test(t));
  ok('SoD PROJ: hned pod nadpisem „číslo 2026 OVP SOD 0411" (z krycího listu PROJ)', i >= 0 && proj[i + 1] === 'číslo 2026 OVP SOD 0411', proj.slice(0, 4));
  ok('SoD PROJ: žádný symbol čísla nezůstal a číslo OCK se nepřimíchalo',
    !proj.some(t => /SOD_CISLO_SMLOUVY|OPR - SOD/.test(t)));
  const ock = await odstavce(await smlouva('sod', ockB64));
  ok('SoD OCK: pod nadpisem ruční „číslo 2026 - OPR - SOD - 0411R" (z krycího listu OCK)', ock.includes('číslo 2026 - OPR - SOD - 0411R'), ock.slice(0, 4));
}

await b.close();
if (konzole.length) console.log('Konzole:\n  ' + konzole.join('\n  '));
const spatne = chyby.filter(x => !x).length;
console.log(spatne ? `\n✗ ${spatne} z ${chyby.length} kontrol selhalo` : `\n✓ všech ${chyby.length} kontrol prošlo`);
process.exit(spatne || konzole.length ? 1 : 0);
