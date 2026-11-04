/* Ověření v prohlížeči: IK — interní poznámky k zakázce na krycím listu
 * (rozhodnutí J. V. 4. 11. 2026, roadmapa #560).
 *   – krycí list OCK i PROJ: sekce „Interní poznámky k zakázce“ mezi
 *     „Základní údaje“ a „Dodavatel (naše firma)“ (změna zadání J. V.
 *     4. 11. odpoledne), stejný nadpis jako karta v Kalkulaci,
 *   – pole má aspoň 5 řádků a roste s obsahem: dlouhý text (20 řádků) není
 *     na obrazovce oříznutý (bez vnitřního posuvníku) a v tisku je celý,
 *   – sdílení oběma směry: zápis v Kalkulaci je na krycím listu a naopak
 *     (jedno ZAK.poznamkyText, všechna čtyři textová pole),
 *   – tisk PDF BO i Tech obou listů: sekce s textem na svém místě; Word obou verzí;
 *     prázdné pole se netiskne,
 *   – popisek karty v Kalkulaci nelže („netisknou se do nabídky…“),
 *   – po odeslané nabídce (zámek + režim čtení) jde pole dál doplnit,
 *   – kdo zakázku jen čte (cizí obchodník), má pole readonly a zápis se
 *     neprovede; bez chyb v konzoli.
 * Ceník = zkušební (src/zkusebni_cenik.js), údaje smyšlené.
 *
 * Pojistka proti prázdnému testu: nad 6109e39 selže (sekce na krycím listu
 * ani v tisku není, popisek karty zní „(netisknou se)“).
 *
 * Spuštění: python3 build.py && node overit_ik_poznamky.mjs */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
const require = createRequire(import.meta.url);
const { zipPrecti } = require(KOREN + 'src/docxgen.js');
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail).slice(0, 400))); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
const konzole = [];
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') konzole.push('error: ' + m.text()); });
await p.goto(KDE);
await p.waitForTimeout(600);

const ZC = require(KOREN + 'src/zkusebni_cenik.js');
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  NAST.jeAdmin = true;
  ZAK = novaZakazka(); syncVarianta();
  ZAK.nazevAkce = 'Bytový dům Zkušební 12 — výtah';
  ZAK.cislo = '';
  Object.assign(Z, { prejezd: 3.2, zdvih: 9, prohluben: 1.2, sirka: 1.6, hloubka: 1.8, nastupiste: 4 });
  render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);

const NADPIS = 'Interní poznámky k zakázce';
const TEXT = 'Rozhoduje p. Ukázkový.\nNa stavbě jen dopoledne — IK-4711.';

/* ---------- obrazovka: první sekce, nadpis ---------- */
console.log('\nKrycí list — obrazovka');
for (const [tab, page, k] of [['kryci', 'page-kryci', 'ock'], ['kryciproj', 'page-kryciproj', 'proj']]) {
  const r = await p.evaluate(([t, pg, k]) => {
    prepniTab(t); render();
    const h3 = [...document.querySelectorAll('#' + pg + ' .kl-doc h3')].map(x => x.textContent.replace(/\s+/g, ' ').trim());
    const ta = document.getElementById('poznText-kl-' + k);
    const radek = ta ? parseFloat(getComputedStyle(ta).lineHeight) : 0;
    return { h3: h3.slice(0, 3), pole: !!ta, vBloku: !!document.querySelector('#klIk-' + k + ' textarea'),
      radku: ta ? ta.clientHeight / radek : 0 };
  }, [tab, page, k]);
  zkus(`${tab}: první sekce zůstává „Základní údaje“`, /^Základní údaje/.test(r.h3[0] || ''), r);
  zkus(`${tab}: pod ní „${NADPIS}“`, /^Interní poznámky k zakázce\b/.test(r.h3[1] || ''), r);
  zkus(`${tab}: a pak „Dodavatel (naše firma)“`, /^Dodavatel \(naše firma\)/.test(r.h3[2] || ''), r);
  zkus(`${tab}: v sekci je textové pole`, r.pole && r.vBloku, r);
  zkus(`${tab}: prázdné pole má aspoň 5 řádků`, r.radku >= 4.9, r.radku);
}

/* ---------- sdílení oběma směry ---------- */
console.log('\nSdílení Kalkulace ↔ krycí list');
{
  await p.evaluate(() => { prepniTab('kalk'); render(); });
  const ta = p.locator('#poznText-ock');
  await ta.fill('Z kalkulace OCK.');
  await ta.dispatchEvent('change');
  const r = await p.evaluate(() => { prepniTab('kryci'); render();
    return { ock: document.getElementById('poznText-kl-ock').value, proj: document.getElementById('poznText-kl-proj').value, zak: ZAK.poznamkyText }; });
  zkus('zápis v Kalkulaci OCK je na krycím listu OCK i PROJ', r.ock === 'Z kalkulace OCK.' && r.proj === 'Z kalkulace OCK.' && r.zak === 'Z kalkulace OCK.', r);
  const kl = p.locator('#poznText-kl-ock');
  await kl.fill(TEXT);
  await kl.dispatchEvent('change');
  const r2 = await p.evaluate(() => { prepniTab('proj'); render();
    return { proj: document.getElementById('poznText-proj').value, ock: document.getElementById('poznText-ock').value, zak: ZAK.poznamkyText,
      varianty: JSON.stringify(ZAK.varianty).includes('IK-4711') }; });
  zkus('zápis na krycím listu je v Kalkulaci OCK i PROJ', r2.proj === TEXT && r2.ock === TEXT && r2.zak === TEXT, r2);
  zkus('nic se nekopíruje do variant', r2.varianty === false, r2);
  const nadpis = await p.evaluate(() => [...document.querySelectorAll('#page-kalk .card h2, #page-proj .card h2')]
    .map(x => x.textContent.trim()).filter(x => /Interní poznámky/.test(x)));
  zkus('karta v Kalkulaci má stejný nadpis a popisek nelže', nadpis.length === 2 && nadpis.every(x => x.startsWith(NADPIS)
    && /netisknou se do nabídky/.test(x) && /krycím listu/.test(x)), nadpis);
}

/* ---------- tisk PDF ---------- */
const nahled = async (tab, verze) => {
  const [okno] = await Promise.all([
    p.waitForEvent('popup'),
    p.evaluate(([t, v]) => { prepniTab(t); render(); (t === 'kryci' ? kryciTiskPohled : kryciProjTiskPohled)(v); }, [tab, verze]),
  ]);
  await okno.waitForLoadState();
  const r = await okno.evaluate(() => {
    const h2 = [...document.querySelectorAll('#dok h2')];
    const ik = h2.find(x => x.textContent.trim() === 'Interní poznámky k zakázce');
    const td = ik && ik.nextElementSibling ? ik.nextElementSibling.querySelector('td') : null;
    return { h2: h2.slice(0, 3).map(x => x.textContent.trim()),
      text: ik && ik.nextElementSibling ? ik.nextElementSibling.innerText : '',
      orez: td ? (td.scrollHeight > td.clientHeight + 1 || getComputedStyle(td).overflow === 'hidden') : null };
  });
  await okno.close();
  return r;
};
console.log('\nTisk PDF');
for (const tab of ['kryci', 'kryciproj']) for (const verze of ['bo', 'techdata']) {
  const r = await nahled(tab, verze);
  zkus(`${tab} ${verze}: v náhledu Základní údaje → interní poznámky → Dodavatel`,
    r.h2[0] === 'Základní údaje' && r.h2[1] === NADPIS && r.h2[2] === 'Dodavatel (naše firma)', r);
  zkus(`${tab} ${verze}: text i se zalomením řádku`, r.text.trim() === TEXT, r.text);
}

/* ---------- Word ---------- */
console.log('\nWord krycího listu');
const word = (typ) => p.evaluate(async (t) => {
  const res = await dokumentVygeneruj(t, null, ZAK, aktivniVarianta(ZAK), JEKLY);
  const buf = new Uint8Array(await res.blob.arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return btoa(s);
}, typ);
const docXml = async (typ) => {
  const casti = await zipPrecti(new Uint8Array(Buffer.from(await word(typ), 'base64')));
  return new TextDecoder().decode(casti.find(x => x.nazev === 'word/document.xml').data);
};
for (const typ of ['kryci_bo', 'kryci_techdata', 'kryciproj_bo', 'kryciproj_techdata']) {
  const xml = await docXml(typ);
  const iP = xml.indexOf(NADPIS), iZ = xml.indexOf('>Základní údaje<'), iD = xml.indexOf('>Dodavatel (naše firma)<');
  zkus(`${typ}: Word nese sekci mezi Základními údaji a Dodavatelem`, iZ > 0 && iP > iZ && iD > iP, [iZ, iP, iD]);
  zkus(`${typ}: Word nese text`, xml.indexOf('IK-4711') > iP);
}

/* ---------- prázdné pole se netiskne ---------- */
console.log('\nPrázdné pole');
await p.evaluate(() => { poznamkyPoleHotovo('   '); });
for (const tab of ['kryci', 'kryciproj']) for (const verze of ['bo', 'techdata']) {
  const r = await nahled(tab, verze);
  zkus(`${tab} ${verze}: prázdné pole se do náhledu netiskne`, r.h2[0] === 'Základní údaje' && r.h2[1] === 'Dodavatel (naše firma)', r);
}
for (const typ of ['kryci_bo', 'kryciproj_techdata'])
  zkus(`${typ}: prázdné pole se do Wordu netiskne`, (await docXml(typ)).indexOf(NADPIS) < 0);
const naObrazovce = await p.evaluate(() => { prepniTab('kryci'); render(); return !!document.getElementById('poznText-kl-ock'); });
zkus('na obrazovce sekce zůstává i prázdná (aby šla vyplnit)', naObrazovce);

/* ---------- dlouhý text: obrazovka bez ořezu, tisk celý ---------- */
console.log('\nDlouhý text (20 řádků)');
{
  const DLOUHY = Array.from({ length: 20 }, (_, i) => 'Řádek ' + (i + 1) + ' dlouhé interní poznámky — IK-R' + (i + 1)).join('\n');
  await p.evaluate((t) => { poznamkyPoleHotovo(t); }, DLOUHY);
  for (const [tab, id] of [['kryci', 'poznText-kl-ock'], ['kryciproj', 'poznText-kl-proj'], ['kalk', 'poznText-ock']]) {
    const r = await p.evaluate(([t, id]) => { prepniTab(t); render();
      const ta = document.getElementById(id);
      return { sh: ta.scrollHeight, ch: ta.clientHeight, radku: ta.clientHeight / parseFloat(getComputedStyle(ta).lineHeight) }; }, [tab, id]);
    zkus(`${id}: pole se zvětšilo a text není oříznutý (bez posuvníku)`, r.sh <= r.ch + 1 && r.radku >= 20, r);
  }
  /* Psaní pole zvětšuje průběžně (bez překreslení). */
  const r = await p.evaluate(() => { prepniTab('kryci'); render();
    const ta = document.getElementById('poznText-kl-ock');
    ta.value = ta.value + '\nA\nB\nC\nD\nE\nF'; ta.dispatchEvent(new Event('input'));
    return { sh: ta.scrollHeight, ch: ta.clientHeight }; });
  zkus('při psaní pole roste s textem', r.sh <= r.ch + 1, r);
  await p.evaluate((t) => { poznamkyPoleHotovo(t); }, DLOUHY);
  for (const tab of ['kryci', 'kryciproj']) for (const verze of ['bo', 'techdata']) {
    const n = await nahled(tab, verze);
    const vsech = Array.from({ length: 20 }, (_, i) => n.text.includes('IK-R' + (i + 1))).every(Boolean);
    zkus(`${tab} ${verze}: v tisku je všech 20 řádků, bez ořezu`, vsech && n.text.trim().split('\n').length === 20 && n.orez === false, n.orez);
  }
  const xml = await docXml('kryciproj_techdata');
  zkus('Word: všech 20 řádků', Array.from({ length: 20 }, (_, i) => xml.includes('IK-R' + (i + 1) + '<')).every(Boolean));
}

/* ---------- nikam jinam (nabídka, Pipedrive) ---------- */
await p.evaluate((t) => poznamkyPoleHotovo(t), TEXT);
const jinde = await p.evaluate(() => {
  const v = aktivniVarianta(ZAK);
  let t = '';
  try { t += JSON.stringify(nabidkaData(ZAK, v, JEKLY, 'cz')); } catch (e) { t += 'CHYBA'; }
  try { t += JSON.stringify(pdnPodklad(ZAK, JEKLY, {})); } catch (e) { t += 'CHYBA'; }
  try { t += JSON.stringify(prodPdZapis(ZAK, v, JEKLY)); } catch (e) { t += 'CHYBA'; }
  return { delka: t.length, ik: t.includes('IK-4711'), chyba: t.includes('CHYBA') };
});
zkus('do nabídky ani Pipedrive (nanečisto, Prodáno) se pole nedostane', jinde.delka > 100 && !jinde.ik && !jinde.chyba, jinde);

/* ---------- po odeslané nabídce: dál doplnitelné ---------- */
console.log('\nPo odeslání nabídky');
{
  const r = await p.evaluate(() => {
    ZAK.cislo = '2026 - OPR - CN - 4711';
    const v = aktivniVarianta(ZAK);
    zamkniVariantu(v, { typ: 'nabidkaTisk', kdy: new Date().toISOString(), kdo: 'Test', cislo: variantaCislo(ZAK, v),
      vysledek: zamekVysledekSpocti(v, JEKLY, 'v-ik') });
    zamekCteniZapni();
    prepniTab('kryci'); render();
    const pred = JSON.stringify(ZAK);
    const ta = document.getElementById('poznText-kl-ock');
    return { ro: ta.readOnly, pred };
  });
  zkus('krycí list zamčené zakázky: pole není jen ke čtení', r.ro === false, r.ro);
  const kl = p.locator('#poznText-kl-ock');
  await kl.fill('Po CN doplněno.');
  await kl.dispatchEvent('change');
  const r2 = await p.evaluate((pred) => ({ zak: ZAK.poznamkyText, jedina: poznamkyJedinaZmena(JSON.stringify(ZAK), pred) }), r.pred);
  zkus('…zápis projde do zakázky', r2.zak === 'Po CN doplněno.', r2);
  zkus('…a je to jediná změna (autosave ji v režimu čtení uloží)', r2.jedina === true, r2);
  await p.evaluate(() => { zamekCteniVypni(); });
}

/* ---------- čtenář ---------- */
console.log('\nKdo zakázku jen čte');
{
  const r = await p.evaluate(() => {
    ZAK.cislo = '';   // obě strany (s číslem OPR je krycí list PROJ vyřazený)
    ZAK.autor = 'autor.ik@priklad.cz';
    ONLINE_STAV.ja = { email: 'cizi.ik@priklad.cz', role: 'Obchodník', jmeno: 'Cizí' };
    render();
    const ids = ['poznText-ock', 'poznText-proj', 'poznText-kl-ock', 'poznText-kl-proj'];
    const ro = ids.map(id => { const el = document.getElementById(id); return el ? el.readOnly : null; });
    poznamkyPoleSet('Přepsáno čtenářem'); poznamkyPoleHotovo('Přepsáno čtenářem');
    return { ro, zak: ZAK.poznamkyText };
  });
  zkus('cizí obchodník: všechna čtyři pole jen ke čtení', r.ro.every(x => x === true), r.ro);
  zkus('cizí obchodník: zápis se neprovede', r.zak === 'Po CN doplněno.', r.zak);
  const r2 = await p.evaluate(() => {
    ONLINE_STAV.ja = { email: 'ved.ik@priklad.cz', role: 'Vedoucí', jmeno: 'Vedoucí' }; render();
    const ro = document.getElementById('poznText-kl-proj').readOnly;
    poznamkyPoleHotovo('Vedoucí doplnil.');
    const vysl = { ro, zak: ZAK.poznamkyText };
    ONLINE_STAV.ja = null; render();
    return vysl;
  });
  zkus('vedoucí: pole zapisovatelné a zápis projde', r2.ro === false && r2.zak === 'Vedoucí doplnil.', r2);
}

zkus('bez chyb v konzoli', konzole.length === 0, konzole);
await b.close();
console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
