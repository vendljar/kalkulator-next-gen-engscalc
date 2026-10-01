/* Ověření: smlouvy o dílo, plná moc a volba jazyka tisku (#143, 15. 8. 2026)
 *
 * Zadání: „V kalkulaci OCK mi chybí varianta tisku nabídek v jazykových
 * mutacích. V kalkulaci OCK i PROJ chybí sekce tisku SoD. V kalkulaci PROJ
 * by měla v rámci tisku SoD přibýt i možnost vytištění plné moci."
 *
 * Jednotkové testy hlídají data (src/test_sod.js) — tenhle skript hlídá to,
 * co z nich vidět není: že tlačítka v aplikaci opravdu jsou, že se do
 * SKUTEČNÝCH šablon smluv dosadí SKUTEČNÁ čísla z kalkulace, že symboly
 * SOD_*, SODP_* a PM_* zůstanou v hotovém dokumentu VIDITELNÉ k ručnímu
 * doplnění a že se výběr jazyka tisku promítne do generování.
 *
 * Šablony nejsou v repozitáři (leží ve /home/claude/work/smlouvy); když se
 * nenajdou, sada se přeskočí s vysvětlením místo selhání.
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_sod.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { chromium } from 'playwright';

/* Cesta k sestavení i ke zdrojákům se odvozuje od UMÍSTĚNÍ HARNESSU, ne od
 * stroje, na kterém kdysi vznikl (nález 14. 9. 2026 při zavádění jobu
 * „harnessy" do CI). Šestnáct harnessů neslo napevno /home/claude/work/kng/… —
 * tedy cestu z cloudového prostředí, ve kterém je psal.
 *
 * MUSÍ STÁT PŘED PRVNÍM POUŽITÍM (oprava N15, 22. 9. 2026). Deklarace tu
 * do té doby byla AŽ POD `require(KOREN + …)`, takže `const` v dočasné mrtvé
 * zóně shodil celý soubor hned při načtení:
 *     ReferenceError: Cannot access 'KOREN' before initialization
 * Sada tedy od 14. 9. NENASTARTOVALA vůbec a její kontroly neběžely nikde —
 * ani lokálně, ani v CI, protože tenhle harness v CI nebyl. `import` se
 * vytahuje nahoru sám, `const` ne. */
import { fileURLToPath } from 'node:url';
const KOREN = fileURLToPath(new URL('.', import.meta.url));

import { najdiPodklady, preskoc } from './nastroje/harness_podklady.mjs';
const require = createRequire(import.meta.url);
const { zipPrecti, zipZapis } = require(KOREN + 'src/docxgen.js');

/* Šablony se hledají i v `KNG_PODKLADY` — do 22. 9. 2026 jen na pevné cestě
 * z cizího prostředí, takže se tahle sada mimo ně nemohla spustit nikdy. */
const { cesty: SABLONY_SOUBORY, chybi } = najdiPodklady({
  sod: ['/home/claude/work/smlouvy/Sablona_SOD_REALIZACE.docx'],
  sodProj: ['/home/claude/work/smlouvy/Sablona_SOD_PROJEKCE.docx'],
  plnaMoc: ['/home/claude/work/smlouvy/Sablona_PLNA_MOC.docx'],
});
if (chybi.length) preskoc('šablony smluv (' + chybi.join(', ') + ')',
  '/home/claude/work/smlouvy/ nebo $KNG_PODKLADY');

const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
let ok = 0, fail = 0;
const test = (n, podm, info) => {
  if (podm) { ok++; console.log('  ✓ ' + n); }
  else { fail++; console.log('  ✗ ' + n, info === undefined ? '' : info); }
};
const konzole = [];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
p.on('console', m => { if (m.type() === 'error') konzole.push('error: ' + m.text()); });
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
await p.goto(KDE);
await p.waitForTimeout(700);

/* Sestavení nese prázdný ceník – bez čísel by dokument nevznikl (zábrana
 * ukázkového ceníku) a nebylo by co porovnávat se smlouvou. */
const ZC = require(KOREN + 'src/zkusebni_cenik.js');
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  ZAK = novaZakazka(); syncVarianta();
  ZAK.cislo = '2026 - OPR - CN - 0177';
  ZAK.objednatel = 'SVJ Zkušební 11'; ZAK.kontakt = 'Ing. Zkoušková';
  ZAK.adresa = 'Zkušební 11, 100 00 Praha';
  ZAK.nazevAkce = 'Přístavba výtahu – zkouška SoD';
  Object.assign(ZAK.projHlavicka, { objednatel: 'SVJ Zkušební 11',
    adresa: 'Zkušební 11, 100 00 Praha', nazevAkce: 'Projekce – zkouška SoD' });
  /* Termíny, místo plnění a denní pokuta smlouvy z krycího listu OCK
   * (rozhodnutí J. V. 1. 10. 2026 k návrhu SoD) — vyplněné jako obchodník. */
  const v = aktivniVarianta(ZAK);
  v.data.kryci = v.data.kryci || { hodnoty: {} };
  v.data.kryci.hodnoty = Object.assign(v.data.kryci.hodnoty || {}, {
    terminPodkladyVytah: '2026-10-20', terminPripravenost: '2026-10-30', terminPrevzeti: '2026-11-02',
    terminMontazDo: '2026-11-20', terminOplasteniOd: '2026-11-23', terminOplasteniDo: '2026-12-04',
    terminMontaz: '2026-12-07', terminDvere: '2027-01-08', terminPredani: '2027-01-22',
    sodMistoPlneni: 'bytový dům', sodPokutaDenni: '1 000 Kč' });
  syncVarianta();
  render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
await p.waitForTimeout(300);
const dva = n => String(n).padStart(2, '0');
const DNES = (d => dva(d.getDate()) + '.' + dva(d.getMonth() + 1) + '.' + d.getFullYear())(new Date());

/* ---------- 1) ovládání v aplikaci ---------- */
console.log('\ntlačítka a karty v aplikaci');
await p.click('#tab-kalk');
await p.waitForTimeout(300);
{
  const tlacitka = await p.evaluate(() =>
    [...document.querySelectorAll('button')].map(x => x.textContent.trim()));
  test('v Kalkulaci OCK je tlačítko „Vytvořit smlouvu o dílo (Word)"',
    tlacitka.some(t => t.indexOf('Vytvořit smlouvu o dílo (Word)') === 0));
  test('v Kalkulaci OCK je výběr jazyka tisku',
    await p.evaluate(() => /Jazyk tisku/.test(document.body.innerHTML)
      && [...document.querySelectorAll('select')].some(s =>
        [...s.options].some(o => o.value === 'de'))));
}
await p.click('#tab-proj');
await p.waitForTimeout(300);
{
  const tlacitka = await p.evaluate(() =>
    [...document.querySelectorAll('button')].map(x => x.textContent.trim()));
  test('v Kalkulaci PROJ je tlačítko „Vytvořit smlouvu o dílo PROJ (Word)"',
    tlacitka.some(t => t.indexOf('Vytvořit smlouvu o dílo PROJ (Word)') === 0));
  test('v Kalkulaci PROJ je tlačítko „Vytvořit plnou moc (Word)"',
    tlacitka.some(t => t.indexOf('Vytvořit plnou moc (Word)') === 0));
  test('v Kalkulaci PROJ je výběr jazyka tisku',
    await p.evaluate(() => [...document.querySelectorAll('select')].some(s =>
      [...s.options].some(o => o.textContent.indexOf('dle Nastavení') === 0))));
}
test('stavové řádky smluv jsou na třídách (karta OCK je v aplikaci dvakrát)',
  await p.evaluate(() => {
    sodStavText('sod', 'zkouška stavu');
    const vsechny = [...document.querySelectorAll('.sodStav_sod')];
    return vsechny.length >= 1 && vsechny.every(e => e.textContent === 'zkouška stavu');
  }));
test('Nastavení → Šablony zná řádky smluv i plné moci',
  await p.evaluate(() => /smlouvy o dílo/i.test(nastSablony()) && /pln[áé] moci?/i.test(nastSablony())));
test('typy smluv jedou přes centrální šablony (#139)',
  await p.evaluate(() => ['sod', 'sodProj', 'plnaMoc'].every(t => SABLONY_ONLINE_TYPY.includes(t))));

/* ---------- 2) hotové dokumenty ---------- */
console.log('\nvygenerované smlouvy a plná moc');
const b64 = {};
for (const [typ, cesta] of Object.entries(SABLONY_SOUBORY))
  b64[typ] = readFileSync(cesta).toString('base64');
/* Šablona SoD PROJ se seznamem plateb (etapa B plánu plateb, 30. 9. 2026):
 * vyrobí ji z dodané šablony tentýž nástroj, jaký dostal J. V.
 * (nastroje/vyrob_sablony.js --sod-proj) — osm pevných plateb nahradí
 * {{SODP_PLATEBNI_KALENDAR}}. Stará šablona s plánem, jehož platby v ní nejsou,
 * smlouvu vyrobit nesmí (nesouhlasila by s nabídkou ani s cenou díla). */
{
  const { sodProjV2, sodRealV2 } = require(KOREN + 'nastroje/vyrob_sablony.js');
  /* Šablony v2 vyrobí z dodaných v1 tentýž nástroj, jaký dostal J. V.
   * (--sod-proj, --sod-real; rozhodnutí J. V. 1. 10. 2026 Q5 a Q6). */
  for (const [klic, zdroj, uprava] of [['sodProjV2', SABLONY_SOUBORY.sodProj, sodProjV2], ['sodRealV2', SABLONY_SOUBORY.sod, sodRealV2]]) {
    const casti = await zipPrecti(new Uint8Array(readFileSync(zdroj)));
    const d = casti.find(x => x.nazev === 'word/document.xml');
    d.data = new TextEncoder().encode(uprava(new TextDecoder().decode(d.data)));
    b64[klic] = Buffer.from(new Uint8Array(await zipZapis(casti).arrayBuffer())).toString('base64');
  }
}

const vysledek = await p.evaluate(async (sablonyB64) => {
  const buf = s => {
    const bin = atob(s); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8.buffer;
  };
  const varianta = aktivniVarianta(ZAK);
  const out = {};
  const docx = async (typ, sablona) => {
    const res = await dokumentVygeneruj(typ, buf(sablona), ZAK, varianta, JEKLY, 'cz');
    const bajty = new Uint8Array(await res.blob.arrayBuffer());
    let s = ''; for (let i = 0; i < bajty.length; i++) s += String.fromCharCode(bajty[i]);
    return { docx: btoa(s), nazevSouboru: res.nazevSouboru };
  };
  try { await dokumentVygeneruj('sodProj', buf(sablonyB64.sodProj), ZAK, varianta, JEKLY, 'cz'); out.sodProjStara = ''; }
  catch (e) { out.sodProjStara = e.message; }
  for (const typ of ['sod', 'sodProj', 'plnaMoc'])
    out[typ] = await docx(typ, sablonyB64[typ === 'sodProj' ? 'sodProjV2' : typ]);
  /* SoD realizace v2: výchozí pokuta za prodlení dodávky „0" a pak 0,1 % / den. */
  out.sodV2 = await docx('sod', sablonyB64.sodRealV2);
  varianta.data.kryci.hodnoty.pokutaDodavka = '0,1 % / den';
  out.sodV2Pokuta = await docx('sod', sablonyB64.sodRealV2);
  delete varianta.data.kryci.hodnoty.pokutaDodavka;
  const nab = nabidkaData(ZAK, varianta, JEKLY, 'cz');
  const nabP = nabidkaProjData(ZAK, varianta, 'cz');
  return Object.assign(out, { cenaOck: nab.placeholders.CENA_BEZ_DPH,
    cenaProj: nabP.placeholders.PROJ_CELKEM_BEZ_DPH });
}, b64);

const dekoduj = u8 => new TextDecoder().decode(u8);
/* Šablony smluv píšou za jednopísmennou předložkou nezlomitelnou mezeru
 * („V Praze", „z ceny" s U+00A0) — nové kontroly vět porovnávají text bez ní. */
const bezNbsp = t => String(t).replace(/\u00a0/g, ' ');
const docText = async typ => {
  const casti = await zipPrecti(new Uint8Array(Buffer.from(vysledek[typ].docx, 'base64')));
  return dekoduj(casti.find(x => x.nazev === 'word/document.xml').data);
};

{
  const doc = await docText('sod');
  const holy = doc.replace(/<[^>]+>/g, '');
  test('SoD realizace: název souboru začíná SOD_',
    vysledek.sod.nazevSouboru.indexOf('SOD_') === 0, vysledek.sod.nazevSouboru);
  test('SoD realizace nese cenu z nabídky OCK', holy.includes(vysledek.cenaOck), vysledek.cenaOck);
  test('SoD realizace nese objednatele', holy.includes('SVJ Zkušební 11'));
  test('známé symboly jsou vyplněné (OBJEDNATEL, CENA_BEZ_DPH, FIRMA_*)',
    !/\{\{(OBJEDNATEL|CENA_BEZ_DPH|FIRMA_NAZEV|FIRMA_ICO)\}\}/.test(holy));
  test('symboly SOD_* bez dat (číslo smlouvy) zůstaly VIDITELNÉ k ručnímu doplnění',
    /\{\{SOD_CISLO_SMLOUVY\}\}/.test(holy), (holy.match(/\{\{SOD_[A-Z0-9_]+\}\}/g) || []).join(', '));
  /* K18-N100 (1. 10. 2026): záruka a splátky z krycího listu OCK. */
  test('K18-N100: záruka a splátky z krycího listu jsou vyplněné (žádný {{SOD_ZARUKA…}} ani {{SOD_SPLATKA…}})',
    !/\{\{SOD_(ZARUKA_MESICU|SPLATKA\d_PROC)\}\}/.test(holy) && /po dobu 60 měsíců/.test(holy),
    (holy.match(/\{\{SOD_(ZARUKA|SPLATKA)[A-Z0-9_]*\}\}/g) || []).join(', '));
  test('K18-N100: splátky 50 / 40 / 10 %, věta o druhé dílčí platbě (opláštění) zmizela',
    /smlouvy o dílo 50 % z celkové ceny/.test(holy) && /šachty 40 % z celkové ceny/.test(holy)
      && /zbývajících 10 % z celkové ceny/.test(holy) && !/základního opláštění konstrukce a předání/.test(holy));
  test('ve smlouvě není dvojí procento („% %")', !/%\s*%/.test(holy), (holy.match(/.{30}%\s*%.{10}/g) || []).join(' | '));
  /* Rozhodnutí J. V. 1. 10. 2026 k návrhu SoD (Q2–Q4, Q10) nad šablonou v1. */
  const ho = bezNbsp(holy);
  test('datum podpisu = dnešní datum (datum tisku), {{SOD_DATUM_PODPISU}} nezůstal',
    ho.includes('V Praze, dne ' + DNES) && !/\{\{SOD_DATUM_PODPISU\}\}/.test(ho), (ho.match(/V Praze, dne.{0,12}/g) || []).join(' | '));
  test('termíny montáže a opláštění z krycího listu',
    /montáž ocelové konstrukce od 02\.11\.2026 do 20\.11\.2026/.test(ho) && /opláštění ocelové konstrukce od 23\.11\.2026 do 04\.12\.2026/.test(ho)
      && /předání konstrukce k montáži výtahu k 07\.12\.2026/.test(ho), (ho.match(/montáž ocelové konstrukce.{0,200}/) || [''])[0]);
  test('dokončení díla a osazení šachetních dveří z krycího listu',
    /dokončení a předání díla do 22\.01\.2027 za předpokladu finálního usazení všech šachetních dveří objednatelem do 08\.01\.2027/.test(ho),
    (ho.match(/dokončení a předání díla.{0,140}/) || [''])[0]);
  test('stavební připravenost z krycího listu; v1 má datum podkladů dodavatele výtahu dál pevné',
    /stavební připravenosti nejdéle k 30\.10\.2026/.test(ho) && /na kotvení do 19\.06\.2026/.test(ho),
    (ho.match(/stavební připravenosti.{0,220}/) || [''])[0]);
  test('místo plnění „bytový dům" na adrese stavby', /Místem provádění díla je bytový dům na adrese Zkušební 11, 100 00 Praha/.test(ho),
    (ho.match(/Místem provádění.{0,80}/) || [''])[0]);
  test('denní pokuta za prodlení zákazníka v obou větách', (ho.match(/ve výši 1 000 Kč (denně|za každý započatý den)/g) || []).length === 2,
    (ho.match(/.{40}1 000 Kč.{30}/g) || []).join(' | '));
  test('žádný symbol termínu, místa plnění ani denní pokuty nezůstal', !/\{\{SOD_(TERMIN_[A-Z_]+|MISTO_PLNENI_DRUH|POKUTA_DENNI)\}\}/.test(ho),
    (ho.match(/\{\{SOD_[A-Z0-9_]+\}\}/g) || []).join(', '));
  test('v1 beze změny: věta o prodlení zhotovitele dál se sazbou splatnosti (0,05 %)',
    /Zhotovitel se zavazuje zaplatit objednateli smluvní pokutu ve výši 0,05 % z ceny díla/.test(ho),
    (ho.match(/Zhotovitel se zavazuje zaplatit objednateli.{0,60}/) || [''])[0]);
}
{
  /* Šablona v2 vyrobená z dodané v1 (nastroje/vyrob_sablony.js --sod-real). */
  const holy = bezNbsp((await docText('sodV2')).replace(/<[^>]+>/g, ''));
  const holyP = bezNbsp((await docText('sodV2Pokuta')).replace(/<[^>]+>/g, ''));
  test('v2: podklady dodavatele výtahu z krycího listu místo pevného data',
    /na kotvení do 20\.10\.2026\./.test(holy) && !/19\.06\.2026/.test(holy), (holy.match(/na kotvení do.{0,20}/) || [''])[0]);
  test('v2: pokuta za prodlení dodávky „0" — věta o prodlení zhotovitele zmizela, věta o prodlení s placením zůstala',
    !/Zhotovitel se zavazuje zaplatit objednateli smluvní pokutu/.test(holy)
      && /prodlení s placením sjednané ceny díla či jejích splátek smluvní pokutu ve výši 0,05 % z dlužné částky/.test(holy));
  test('v2: pokuta za prodlení dodávky 0,1 % / den — věta o prodlení zhotovitele s 0,1 %',
    /Zhotovitel se zavazuje zaplatit objednateli smluvní pokutu ve výši 0,1 % z ceny díla/.test(holyP),
    (holyP.match(/Zhotovitel se zavazuje zaplatit objednateli.{0,80}/) || [''])[0]);
  test('v2: datum podpisu, termíny a splátky vyplněné, žádné dvojí procento',
    holy.includes('V Praze, dne ' + DNES) && /smlouvy o dílo 50 % z celkové ceny díla/.test(holy) && !/%\s*%/.test(holy + holyP)
      && !/\{\{SOD_(TERMIN_[A-Z_]+|PLATEBNI_KALENDAR|DATUM_PODPISU)\}\}/.test(holy), (holy.match(/\{\{[A-Z0-9_]+\}\}/g) || []).join(', '));
}
{
  const doc = await docText('sodProj');
  const holy = doc.replace(/<[^>]+>/g, '');
  test('SoD projekce: název souboru začíná SOD_PROJ_',
    vysledek.sodProj.nazevSouboru.indexOf('SOD_PROJ_') === 0, vysledek.sodProj.nazevSouboru);
  test('SoD projekce nese cenu z nabídky PROJ', holy.includes(vysledek.cenaProj), vysledek.cenaProj);
  test('symboly SODP_* bez hodnoty (pokuta, správní poplatky) zůstaly viditelné',
    /\{\{SODP_[A-Z0-9_]+\}\}/.test(holy));
  test('SoD projekce: ve smlouvě není dvojí procento („% %")', !/%\s*%/.test(holy), (holy.match(/.{30}%\s*%.{10}/g) || []).join(' | '));
  const platby = (holy.match(/Platba ve výši [\d\s\u00a0]+,\d\d Kč \+ DPH proběhne/g) || []).length;
  test('SoD projekce (šablona se seznamem plateb): platby z plánu, každá vlastní odrážkou',
    platby >= 2 && !/SODP_PLATEBNI_KALENDAR/.test(holy)
    && (doc.match(/<w:p[\s>](?:(?!<\/w:p>)[\s\S])*?Platba ve výši/g) || []).length === platby, platby);
  test('SoD projekce se starou šablonou (8 pevných plateb) a plánem, který v ní nejde vyjádřit: smlouva nevznikne a řekne proč',
    /SODP_PLATEBNI_KALENDAR/.test(vysledek.sodProjStara || ''), vysledek.sodProjStara);
  /* Q6 (1. 10. 2026): v2 bere pokutu zhotovitele z pokuty za nedodržení
   * termínu krycího listu PROJ — výchozí „0" větu vypustí. */
  test('SoD projekce v2: pokuta za nedodržení termínu „0" — věta o prodlení zhotovitele zmizela, o prodlení objednatele zůstala',
    !/V případě prodlení zhotovitele/.test(bezNbsp(holy))
      && /prodlení objednatele s úhradou peněžitého plnění sjednávají smluvní strany smluvní pokutu ve výši 0,05 % z dlužné částky/.test(bezNbsp(holy)),
    (bezNbsp(holy).match(/.{0,40}prodlení (zhotovitele|objednatele s úhradou).{0,90}/g) || []).join(' | '));
}
{
  const doc = await docText('plnaMoc');
  const holy = doc.replace(/<[^>]+>/g, '');
  test('plná moc: název souboru začíná PLNA_MOC',
    vysledek.plnaMoc.nazevSouboru.indexOf('PLNA_MOC') === 0, vysledek.plnaMoc.nazevSouboru);
  test('plná moc nese adresu stavby', holy.includes('Zkušební 11, 100 00 Praha'));
  test('symboly PM_* (zmocnitel) zůstaly viditelné', /\{\{PM_[A-Z0-9_]+\}\}/.test(holy));
  test('firemní údaje zmocněnce jsou vyplněné', !/\{\{FIRMA_[A-Z0-9_]+\}\}/.test(holy));
}

/* ---------- 2b) krycí list OCK: pole pro smlouvu o dílo (J. V. 1. 10. 2026) ---------- */
console.log('\nkrycí list OCK — pole smlouvy o dílo');
await p.click('#tab-kryci');
await p.waitForTimeout(400);
const DNES_ISO = (d => d.getFullYear() + '-' + dva(d.getMonth() + 1) + '-' + dva(d.getDate()))(new Date());
const kl = await p.evaluate(() => {
  const lbl = r => ((r.querySelector('.lbl') || {}).childNodes ? [...r.querySelector('.lbl').childNodes]
    .filter(n => n.nodeType === 3).map(n => n.textContent).join('') : '').trim();
  const sekce = nazev => {
    const h = [...document.querySelectorAll('#page-kryci h3')].find(x => x.textContent.trim() === nazev);
    const out = [];
    for (let e = h && h.nextElementSibling; e && e.classList.contains('kl-row'); e = e.nextElementSibling) out.push(e);
    return out;
  };
  const radek = (nazev, re) => sekce(nazev).find(r => re.test(lbl(r)));
  const out = { terminy: sekce('Termíny').map(lbl) };
  const dp = radek('Smlouva o dílo (SoD realizace)', /Datum podpisu smlouvy/);
  out.datumPodpisu = dp ? (dp.querySelector('input[type=date]') || {}).value : null;
  /* místo plnění bez výběru: prázdná volba, ne první položka seznamu */
  delete KL.hodnoty.sodMistoPlneni;
  render();
  const vyber = () => { const r = radek('Smlouva o dílo (SoD realizace)', /Místo plnění/); return r && r.querySelector('select'); };
  const s0 = vyber();
  out.mistoVolby = s0 ? [...s0.options].map(o => o.textContent) : null;
  out.mistoPrazdne = s0 ? s0.value : null;
  const zmen = v => { const s = vyber(); s.value = v; s.dispatchEvent(new Event('change')); };
  zmen('rodinný dům');
  out.mistoVybrano = KL.hodnoty.sodMistoPlneni;
  out.mistoUkazuje = vyber().value;
  zmen('');
  out.mistoZpet = KL.hodnoty.sodMistoPlneni === undefined && vyber().value === '';
  zmen('__jine__');
  const r = radek('Smlouva o dílo (SoD realizace)', /Místo plnění/);
  out.mistoJine = r && r.querySelector('input[type=text]') ? r.querySelector('input[type=text]').placeholder : null;
  return out;
});
test('Termíny v krycím listu podle průběhu stavby (nová pole mezi stávajícími)',
  JSON.stringify(kl.terminy) === JSON.stringify(['Finální podklady od dodavatele výtahu do', 'Stavební připravenost zákazníka do',
    'Převzetí staveniště k montáži šachty', 'Konec montáže ocelové konstrukce', 'Opláštění od', 'Opláštění do',
    'Ukončení montáže šachty a předání montáži výtahu', 'Osazení šachetních dveří zákazníkem do', 'Konečné předání díla', 'Jiné termíny']),
  kl.terminy);
test('datum podpisu smlouvy je v krycím listu předvyplněné dnešním datem', kl.datumPodpisu === DNES_ISO, kl.datumPodpisu);
test('místo plnění bez výběru ukazuje prázdnou volbu (ne „bytový dům")',
  kl.mistoPrazdne === '' && JSON.stringify(kl.mistoVolby) === JSON.stringify(['— nevybráno —', 'bytový dům', 'rodinný dům', 'administrativní budova', 'jiné znění…']),
  [kl.mistoPrazdne, kl.mistoVolby]);
test('výběr místa plnění se uloží a ukáže, prázdná volba ho zase smaže',
  kl.mistoVybrano === 'rodinný dům' && kl.mistoUkazuje === 'rodinný dům' && kl.mistoZpet === true, kl);
test('„jiné znění…" otevře pole pro vlastní druh stavby', kl.mistoJine === 'např. polyfunkční dům', kl.mistoJine);

/* ---------- 3) zámek a jazyk tisku ---------- */
console.log('\nzámek a jazyk tisku');
test('SoD realizace i projekce variantu zamykají, plná moc ne',
  await p.evaluate(() => dokumentZamyka('sod') && dokumentZamyka('sodProj')
    && !dokumentZamyka('plnaMoc')));
test('výběr jazyka tisku se promítá do tiskJazyk()',
  await p.evaluate(() => {
    tiskJazykNastav('de');
    const de = tiskJazyk() === 'de';
    tiskJazykNastav('');                    // zpět na „dle Nastavení"
    return de && tiskJazyk() === jazyk();
  }));
test('plná moc se tiskne vždy česky (úřední dokument), i při cizím jazyku tisku',
  await p.evaluate(() => {
    tiskJazykNastav('en');
    const cz = sodJazyk('plnaMoc') === 'cz' && sodJazyk('sod') === 'en';
    tiskJazykNastav('');
    return cz;
  }));
test('neplatná hodnota jazyka tisku spadne na „dle Nastavení"',
  await p.evaluate(() => { tiskJazykNastav('xx'); const v = tiskJazyk() === jazyk();
    tiskJazykNastav(''); return v; }));

test('aplikace při generování nehlásila chybu do konzole', konzole.length === 0,
  konzole.slice(0, 3).join(' | '));

await b.close();
console.log('\n' + (fail ? fail + ' KONTROL SELHALO (z ' + (ok + fail) + ')'
  : 'VŠECHNY KONTROLY (' + ok + ') OK'));
process.exit(fail ? 1 : 0);
