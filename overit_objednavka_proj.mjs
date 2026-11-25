/* Ověření v prohlížeči: OBJEDNÁVKA / SMLOUVA PROJ (D3, rozhodnutí J. V. 19. 11. 2026).
 *
 * Dělá to, co obchodník: smyšlená zakázka TEST (zkušební ceník), otevře
 * krycí list PROJ, najde společnou kartu „Objednávka, smlouva o dílo a plná moc (PROJ)" (#792; dřív samostatná karta pod smlouvou)
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
/* #792 (J. V. 25. 11. 2026): objednávka ve společné kartě se SoD PROJ a plnou mocí. */
const karta = s.locator('#page-kryciproj .card').filter({ hasText: 'Objednávka, smlouva o dílo a plná moc (PROJ)' }).first();
ok('krycí list PROJ: společná karta „Objednávka, smlouva o dílo a plná moc (PROJ)"', await karta.count() === 1);
const poradi = await s.evaluate(() => {
  const t = document.getElementById('page-kryciproj').textContent;
  return [t.indexOf('Objednávka / Smlouva (PROJ)'), (t.match(/Objednávka, smlouva o dílo a plná moc \(PROJ\)/g) || []).length];
});
ok('samostatná karta „Objednávka / Smlouva (PROJ)" zrušena, společná je jednou', poradi[0] < 0 && poradi[1] === 1, poradi);
const tlacitkaKarty = (await karta.locator('button').allInnerTexts()).map(t => t.trim());
ok('#792 pořadí tlačítek: objednávka PDF, objednávka Word, plná moc, SoD PROJ poslední',
  JSON.stringify(tlacitkaKarty) === JSON.stringify(['Náhled a tisk objednávky (PDF)', 'Vytvořit objednávku (Word)', 'Vytvořit plnou moc (Word)', 'Vytvořit smlouvu o dílo PROJ (Word)']), tlacitkaKarty);
const tlacitko = karta.getByRole('button', { name: /Náhled a tisk objednávky/ });
/* J. V. 19. 11.: z neodeslané (nevytištěné) CN objednávka nevznikne — tlačítko zhasne s důvodem. */
ok('neodeslaná CN: tlačítka zhasnutá s důvodem v bublině', await tlacitko.count() === 1 && await tlacitko.isDisabled()
  && /jen z odeslané/.test(await tlacitko.getAttribute('title') || ''));
/* „odeslání" nabídky jako po tisku: zmrazení podmínek a plánu, zámek se zmrazeným výsledkem */
await s.evaluate(() => {
  const v = aktivniVarianta(ZAK);
  kryciProjZmrazPodminky(ZAK, v); kryciProjZmrazPlan(ZAK, v);
  zamkniVariantu(v, { kdy: new Date().toISOString(), typ: 'nabidkaProjTisk', vysledek: { proj: vypocetProj(v.data.proj.zadani, v.data.proj.cenik) } });
  v.data.kryciProj.hodnoty.cisloZakazky = 'Z2026-TEST-01';
  render();
});
await s.waitForTimeout(300);
ok('odeslaná CN: tlačítko náhledu je aktivní', await tlacitko.isEnabled());
const poleZak = s.locator('#page-kryciproj .kl-row').filter({ has: s.locator('.lbl', { hasText: /^Číslo zakázky/ }) });
ok('krycí list PROJ: pole „Číslo zakázky"', await poleZak.count() === 1);

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
  ok('náhled: Zakázka z krycího listu, blok Místo určení / Objednatel', text.indexOf('Zakázka: Z2026-TEST-01') >= 0 && /Místo určení \/ Objednatel/i.test(text));
  /* pořadí bloků podle vzoru: dodavatel → objednatel → datum případu → tabulka → Celkem Kč → poznámka → … → podpis
   * (#791: datum a podpis objednatele až na konci, za Poznámkou, Platebním kalendářem, Termíny a Vystavil) */
  const poz = ['DODAVATEL', 'MÍSTO URČENÍ / OBJEDNATEL', 'Datum případu', 'Popis dodávky', 'Celkem Kč', 'Poznámka', 'Podpis objednatele']
    .map(t => text.toUpperCase().indexOf(t.toUpperCase()));
  ok('náhled: pořadí bloků jako vzor', poz.every((x, i) => x >= 0 && (i === 0 || x > poz[i - 1])), poz);
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
const bezCn = await s.evaluate(() => { ZAK.cislo = '2026 - OVP - 0376'; render(); objednavkaProjVstup();
  return [...document.querySelectorAll('.objednavkaProjStav')].map(e => e.textContent).join(' '); });
ok('číslo bez CN: stav říká proč', /neobsahuje část „CN"/.test(bezCn), bezCn);

await b.close();
if (konzole.length) console.log('Konzole:\n  ' + konzole.join('\n  '));
const spatne = chyby.filter(x => !x).length;
console.log(spatne ? `\n✗ ${spatne} z ${chyby.length} kontrol selhalo` : `\n✓ všech ${chyby.length} kontrol prošlo`);
process.exit(spatne || konzole.length ? 1 : 0);
