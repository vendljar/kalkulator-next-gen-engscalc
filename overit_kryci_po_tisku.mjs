/* Ověření v prohlížeči: krycí list odeslané nabídky se dá doplňovat
 * (J. V. 14. 10. 2026: „věci, které nejsou v cenové nabídce, by mělo být
 * možné v krycím listu upravovat i po vytištění nabídky").
 *
 * Dělá to, co obchodník: u varianty zamčené tiskem nabídky (a zakázky
 * otevřené jen ke čtení) zapíše do krycího listu pole mimo nabídku — musí
 * se zapsat bez dialogu „Uzamčená varianta" a zakázka se uvolní k ukládání.
 * Pole nabídky (záloha, splatnost) dál zastaví dialog a hodnota se nezmění.
 * Po tisku smlouvy o dílo je krycí list zamčený celý; cizí obchodník zakázku
 * neuvolní. Model a server hlídají src/test_kryci_po_tisku.js
 * a netlify/test_kryci_po_tisku.mjs; tady jde o obal v ui/zamek_ui.js.
 *
 * Spouští se nad sestaveným buildem:
 *   NODE_PATH=$(npm root -g) node overit_kryci_po_tisku.mjs */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
const chyby = [];
const konzole = [];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
p.on('console', m => { if (m.type() === 'error') konzole.push('error: ' + m.text()); });
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
await p.goto(KDE);
await p.waitForTimeout(700);

const ok = (co, podm, info) => { console.log((podm ? '  ✓ ' : '  ✗ ') + co + (podm || info === undefined ? '' : '  ' + JSON.stringify(info))); chyby.push(podm); };
const modal = () => p.locator('#dlg').isVisible().catch(() => false);
const modalText = () => p.locator('#dlg .dlg-text').innerText().catch(() => '');
/* „Nechat beze změny" u potvrzení, jediné tlačítko u hlášky. */
const zavri = async () => { if (await modal()) {
  const ne = p.locator('#dlg [data-dlg="ne"]');
  await ((await ne.count()) ? ne.click() : p.locator('#dlg button').first().click());
  await p.waitForTimeout(200); } };

const { createRequire } = await import('module');
const ZC = createRequire(import.meta.url)(KOREN + 'src/zkusebni_cenik.js');
/* Odeslaná nabídka PROJ otevřená jako uložená zakázka (jen ke čtení). */
const priprav = (typy, ja) => p.evaluate(([c, cp, typy, ja]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  ZAK = novaZakazka(); ZAK.cislo = '2026 - OVP - CN - 9950'; ZAK.autor = 'autor.kryci@priklad.cz';
  syncVarianta();
  KL.hodnoty.zaloha1 = '30 % – po podpisu smlouvy'; KLP.hodnoty.splatnostDni = '14';
  const v = aktivniVarianta(ZAK);
  typy.forEach(typ => zamkniVariantu(v, { typ }));
  if (typeof ONLINE_STAV !== 'undefined') ONLINE_STAV.ja = ja;
  zamekCteniZapni();
  prepniTab('kryciProj'); render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj(), typy, ja]);
const AUTOR = { email: 'autor.kryci@priklad.cz', role: 'Obchodník' };
const stav = () => p.evaluate(() => ({ kl: Object.assign({}, KL.hodnoty), klp: Object.assign({}, KLP.hodnoty),
  cteni: zamekCteniJe(), zamceno: variantaUzamcena(aktivniVarianta(ZAK)) }));

console.log('— nabídka PROJ vytištěná, autor —');
await priprav(['nabidkaProjTisk'], AUTOR);
await p.evaluate(() => klpSet('odpovednyJmeno', 'Ukázková Osoba'));
await p.waitForTimeout(300);
let s = await stav();
ok('pole mimo nabídku (PROJ odpovědná osoba) se zapsalo', s.klp.odpovednyJmeno === 'Ukázková Osoba', s.klp);
ok('bez dialogu „Uzamčená varianta"', !(await modal()), await modalText());
ok('zakázka se uvolnila k ukládání (zámek čtení vypnut), varianta zůstala zamčená', s.cteni === false && s.zamceno === true, s);
await p.evaluate(() => klSet('jmenoPrijmeni', 'Zkušební Kontakt'));
await p.waitForTimeout(300);
s = await stav();
ok('pole mimo nabídku (OCK jméno) se zapsalo', s.kl.jmenoPrijmeni === 'Zkušební Kontakt', s.kl);
await p.evaluate(() => klpReset('odpovednyJmeno'));
s = await stav();
ok('↺ u pole mimo nabídku funguje', s.klp.odpovednyJmeno === undefined, s.klp);
await p.evaluate(() => klpSet('splatnostDni', '60'));
await p.waitForTimeout(400);
s = await stav();
ok('pole nabídky (PROJ splatnost) se nezměnilo', s.klp.splatnostDni === '14', s.klp);
ok('pole nabídky ukáže dialog „Uzamčená varianta"', await modal() && /uzamčená/.test(await modalText()), await modalText());
await zavri();
await p.evaluate(() => klSet('zaloha1', '10 % – po podpisu smlouvy'));
await p.waitForTimeout(400);
s = await stav();
ok('pole nabídky (OCK záloha) se nezměnilo', s.kl.zaloha1 === '30 % – po podpisu smlouvy', s.kl);
ok('…a ukáže dialog', await modal());
await zavri();
await p.evaluate(() => klpReset('splatnostDni'));
await p.waitForTimeout(300);
s = await stav();
ok('↺ u pole nabídky nic nesmaže', s.klp.splatnostDni === '14', s.klp);
await zavri();

ok('krycí list PROJ nese poznámku, co se po odeslání doplňuje',
  await p.evaluate(() => /zamčená jsou jen pole, která jsou v cenové nabídce/.test((document.querySelector('#page-kryciProj .kl-zamek-pozn, .kl-zamek-pozn') || {}).textContent || '')));

console.log('— cizí obchodník —');
await priprav(['nabidkaProjTisk'], { email: 'jiny.kryci@priklad.cz', role: 'Obchodník' });
await p.evaluate(() => klpSet('odpovednyJmeno', 'Cizí zápis'));
await p.waitForTimeout(300);
s = await stav();
ok('cizí obchodník pole nezapíše a zakázka zůstane jen ke čtení', s.klp.odpovednyJmeno === undefined && s.cteni === true, s);
await zavri();

console.log('— po smlouvě o dílo —');
await priprav(['nabidkaProjTisk', 'sodProj'], AUTOR);
await p.evaluate(() => klpSet('odpovednyJmeno', 'Po SoD'));
await p.waitForTimeout(400);
s = await stav();
ok('po SoD se ani pole mimo nabídku nezapíše', s.klp.odpovednyJmeno === undefined, s.klp);
ok('…a ukáže dialog', await modal());
await zavri();
ok('po SoD poznámka říká, že se krycí list nemění',
  await p.evaluate(() => /odešla smlouva o dílo/.test((document.querySelector('.kl-zamek-pozn') || {}).textContent || '')));

await b.close();
if (konzole.length) console.log('Konzole:\n  ' + konzole.join('\n  '));
const spatne = chyby.filter(x => !x).length;
console.log(spatne ? `\n✗ ${spatne} z ${chyby.length} kontrol selhalo` : `\n✓ všech ${chyby.length} kontrol prošlo`);
process.exit(spatne || konzole.length ? 1 : 0);
