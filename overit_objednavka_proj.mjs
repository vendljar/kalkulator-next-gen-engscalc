/* Ověření v prohlížeči: OBJEDNÁVKA / SMLOUVA PROJ (D3, rozhodnutí J. V. 19. 11. 2026).
 *
 * Dělá to, co obchodník: smyšlená zakázka TEST (zkušební ceník), otevře
 * krycí list PROJ, najde kartu „Objednávka / Smlouva (PROJ)" pod smlouvou
 * o dílo PROJ, klikne na „Náhled a tisk objednávky (PDF)" a v okně náhledu
 * zkontroluje číslo OBJ, řádky činností, Celkem Kč (= cenová nabídka PROJ),
 * poznámku s odkazem na CN a podpis. Pak vytvoří Word (dokumentVygeneruj
 * jako tlačítko) a ověří číslo v textu. Model hlídá src/test_objednavka_proj.js.
 *
 * Spouští se nad sestaveným buildem:
 *   NODE_PATH=$(npm root -g) node overit_objednavka_proj.mjs */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'module';
const KOREN = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
const { zipPrecti } = require(KOREN + 'src/docxgen.js');
const ZC = require(KOREN + 'src/zkusebni_cenik.js');
const chyby = [], konzole = [];
const ok = (co, podm, info) => { console.log((podm ? '  ✓ ' : '  ✗ ') + co + (podm || info === undefined ? '' : '  ' + JSON.stringify(info))); chyby.push(!!podm); };
const nb = t => String(t).replace(/[  ]/g, ' ');

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
  ZAK.cislo = '2026 - OVP - CN - 0376';
  ZAK.objednatel = 'TEST zákazník s.r.o.'; ZAK.adresaObjednatele = 'Vzorová 2, 100 00 Praha'; ZAK.ico = '00000001';
  ZAK.adresa = 'Zkušební 1, Praha'; ZAK.nazevAkce = 'TEST akce D3';
  const v = aktivniVarianta(ZAK);
  v.data.proj.cenik = JSON.parse(JSON.stringify(cp));
  v.data.proj.zadani.sekce.forEach(x => x.polozky.forEach(p => { p.vyrazeno = false; }));
  ZAK.jenProj = true;
  syncVarianta(); render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);

await s.evaluate(() => { prepniTab('kryciproj'); render(); });
await s.waitForTimeout(400);
const karta = s.locator('#page-kryciproj .card').filter({ hasText: 'Objednávka / Smlouva (PROJ)' }).first();
ok('krycí list PROJ: karta „Objednávka / Smlouva (PROJ)"', await karta.count() === 1);
const poradi = await s.evaluate(() => {
  const t = document.getElementById('page-kryciproj').textContent;
  return [t.indexOf('Smlouva o dílo a plná moc (PROJ)'), t.indexOf('Objednávka / Smlouva (PROJ)')];
});
ok('karta stojí pod smlouvou o dílo PROJ', poradi[0] >= 0 && poradi[1] > poradi[0], poradi);
const tlacitko = karta.getByRole('button', { name: /Náhled a tisk objednávky/ });
ok('tlačítko náhledu je aktivní', await tlacitko.count() === 1 && await tlacitko.isEnabled());

const [okno] = await Promise.all([s.context().waitForEvent('page', { timeout: 8000 }).catch(() => null), tlacitko.click()]);
ok('otevřelo se okno náhledu', !!okno);
if (okno) {
  await okno.waitForLoadState();
  const text = nb(await okno.locator('#dok').innerText());
  const nab = await s.evaluate(() => { const d = nabidkaProjData(vzTiskZakTicho(), aktivniVarianta(ZAK), 'cz'); return { s: d.placeholders.PROJ_CELKEM_S_DPH, n: d.nabizeneSekce.length }; });
  ok('náhled: číslo dokladu 2026-OVP-OBJ-0376', text.indexOf('Číslo dokladu: 2026-OVP-OBJ-0376') >= 0, text.slice(0, 300));
  ok('náhled: řádek za každou nabízenou činnost', await okno.locator('tr.radek').count() === nab.n, nab.n);
  ok('náhled: Celkem Kč = Celkem s DPH cenové nabídky PROJ', text.indexOf(nb(nab.s)) >= 0 && /Celkem Kč/.test(text), nab.s);
  ok('náhled: poznámka s CN a podpis objednatele', /cenovou nabídkou č\. 2026-OVP-CN-0376 ze dne/.test(text) && /Podpis objednatele/.test(text));
  ok('náhled: objednatel z hlavičky', text.indexOf('TEST zákazník s.r.o.') >= 0);
  ok('náhled: tlačítko tisku', await okno.locator('.bar button', { hasText: 'Tisk' }).count() >= 1);
  await okno.screenshot({ path: '/tmp/objednavka_proj_nahled.png', fullPage: true }).catch(() => {});
  await okno.close();
}
const word = await s.evaluate(async () => {
  try {
    const vt = vzTiskVstup('objednavkaProj', aktivniVarianta(ZAK));
    const res = await dokumentVygeneruj('objednavkaProj', null, vt.zak, vt.varianta, JEKLY);
    const u8 = new Uint8Array(await res.blob.arrayBuffer());
    let t = ''; for (let i = 0; i < u8.length; i++) t += String.fromCharCode(u8[i]);
    return { docx: btoa(t), nazev: res.nazevSouboru };
  } catch (e) { return { chyba: e.message }; }
});
ok('Word: vznikl bez šablony', !word.chyba && word.nazev === 'OBJEDNAVKA_2026-OVP-OBJ-0376-PROJ', word.chyba || word.nazev);
if (!word.chyba) {
  const casti = await zipPrecti(new Uint8Array(Buffer.from(word.docx, 'base64')));
  const xml = new TextDecoder().decode(casti.find(x => x.nazev === 'word/document.xml').data);
  ok('Word: číslo dokladu a Celkem Kč', /Číslo dokladu: 2026-OVP-OBJ-0376/.test(xml) && /Celkem Kč/.test(xml));
}
/* číslo bez CN: tlačítko dokument nevyrobí a řekne proč */
const bezCn = await s.evaluate(() => { ZAK.cislo = '2026 - OVP - 0376'; render(); objednavkaProjWord();
  return [...document.querySelectorAll('.objednavkaProjStav')].map(e => e.textContent).join(' '); });
ok('číslo bez CN: stav říká proč', /neobsahuje část „CN"/.test(bezCn), bezCn);

await b.close();
if (konzole.length) console.log('Konzole:\n  ' + konzole.join('\n  '));
const spatne = chyby.filter(x => !x).length;
console.log(spatne ? `\n✗ ${spatne} z ${chyby.length} kontrol selhalo` : `\n✓ všech ${chyby.length} kontrol prošlo`);
process.exit(spatne || konzole.length ? 1 : 0);
