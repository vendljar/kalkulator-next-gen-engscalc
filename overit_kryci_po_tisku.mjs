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

/* „Jiné znění" (O1, 14. 10. 2026): klVyber / klpVyber hodnotu mazaly mimo
 * obal zámku — u pole nabídky tiše a server pak uložení odmítl. */
await p.evaluate(() => klVyber('zaloha1', KL_JINE_ZNENI));
await p.waitForTimeout(400);
s = await stav();
ok('„jiné znění" u pole nabídky (OCK záloha) hodnotu nesmaže', s.kl.zaloha1 === '30 % – po podpisu smlouvy', s.kl);
ok('…a ukáže dialog „Uzamčená varianta"', await modal() && /uzamčená/.test(await modalText()), await modalText());
ok('…a textové pole „jiné znění" se nerozbalí', await p.evaluate(() => !KL_JINA.zaloha1));
await zavri();
await p.evaluate(() => klpVyber('splatnostDni', KL_JINE_ZNENI));
await p.waitForTimeout(400);
s = await stav();
ok('„jiné znění" u pole nabídky (PROJ splatnost) hodnotu nesmaže', s.klp.splatnostDni === '14', s.klp);
ok('…a ukáže dialog', await modal());
await zavri();
await p.evaluate(() => klpVyber('splatnostDni', '30'));
await p.waitForTimeout(400);
s = await stav();
ok('výběr z číselníku u pole nabídky (klpVyber → klpSet) hodnotu nezmění', s.klp.splatnostDni === '14', s.klp);
ok('…a dialog je jen jeden', await p.evaluate(() => document.querySelectorAll('#dlg').length <= 1) && await modal());
await zavri();
ok('…po zavření žádný druhý dialog', !(await modal()), await modalText());
await p.evaluate(() => { klpSet('odpovednyJmeno', 'Ruční Osoba'); klpVyber('odpovednyJmeno', KL_JINE_ZNENI); });
await p.waitForTimeout(300);
s = await stav();
ok('„jiné znění" u pole mimo nabídku projde (hodnota smazána, pole rozbalené)',
  s.klp.odpovednyJmeno === undefined && await p.evaluate(() => !!KLP_JINA.odpovednyJmeno), s.klp);
ok('…bez dialogu', !(await modal()), await modalText());

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
await p.evaluate(() => { KLP.hodnoty.odpovednyJmeno = 'Před SoD'; klpVyber('odpovednyJmeno', KL_JINE_ZNENI); });
await p.waitForTimeout(400);
s = await stav();
ok('po SoD „jiné znění" ani u pole mimo nabídku nic nesmaže', s.klp.odpovednyJmeno === 'Před SoD', s.klp);
ok('…a ukáže dialog', await modal());
await zavri();
ok('po SoD poznámka říká, že se krycí list nemění',
  await p.evaluate(() => /odešla smlouva o dílo/.test((document.querySelector('.kl-zamek-pozn') || {}).textContent || '')));

/* Z1 (J. V. 22. 10. 2026): zámek se snímkem (zamekPoTisku od v22.10.3) —
 * platební podmínky a DPH se po tisku CN mění bez dialogu, zmrazená pole
 * (obchodník, název akce v hlavičce) ne a v krycím listu jsou označená. */
console.log('— Z1: nabídka se snímkem —');
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  ZAK = novaZakazka(); ZAK.cislo = '2026 - OVP - CN - 9951'; ZAK.nazevAkce = 'Ukázková akce Z1'; ZAK.autor = 'autor.kryci@priklad.cz';
  syncVarianta();
  KL.hodnoty.zaloha1 = '30 % – po podpisu smlouvy';
  const v = aktivniVarianta(ZAK);
  zamkniVariantu(v, { typ: 'nabidkaProjTisk', snimek: zamekSnimekSpocti(v) });
  if (typeof ONLINE_STAV !== 'undefined') ONLINE_STAV.ja = { email: 'autor.kryci@priklad.cz', role: 'Obchodník' };
  /* Zámek už leží na serveru (K7-K2: do té doby jsou pole snímku zmrazená). */
  if (typeof ONLINE_STAV !== 'undefined') ONLINE_STAV.posledni = JSON.stringify(ZAK);
  prepniTab('kryciProj'); render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
await p.evaluate(() => klSet('zaloha1', '10 % – po podpisu smlouvy'));
await p.waitForTimeout(300);
s = await stav();
ok('Z1: záloha (editovatelná po tisku CN) se zapsala bez dialogu', s.kl.zaloha1 === '10 % – po podpisu smlouvy' && !(await modal()), [s.kl, await modalText()]);
await zavri();
await p.evaluate(() => set('PC.dph', 0.12));
await p.waitForTimeout(300);
ok('Z1: sazba DPH PROJ se po tisku CN změní bez dialogu',
  await p.evaluate(() => aktivniVarianta(ZAK).data.proj.cenik.dph === 0.12) && !(await modal()), await modalText());
await zavri();
await p.evaluate(() => klpSet('obchodnik', 'Jiný Obchodník'));
await p.waitForTimeout(400);
s = await stav();
ok('Z1: zmrazené pole (obchodník) se nezapsalo', s.klp.obchodnik === undefined, s.klp);
await zavri();
await p.evaluate(() => set('ZAK.nazevAkce', 'Přejmenováno'));
await p.waitForTimeout(400);
ok('Z1: název akce v hlavičce se po tisku CN nezmění', await p.evaluate(() => ZAK.nazevAkce === 'Ukázková akce Z1'));
await zavri();
await p.evaluate(() => { prepniTab('kryciProj'); render(); });
await p.waitForTimeout(300);
ok('Z1: zmrazená pole krycího listu PROJ jsou označená (🔒, neaktivní)',
  await p.evaluate(() => { const r = document.querySelectorAll('.kl-zmrazeno');
    return r.length > 0 && [...r].every(x => [...x.querySelectorAll('input,select,textarea')].every(i => i.disabled)); }));
ok('Z1: poznámka říká, co je po odeslání zmrazené',
  await p.evaluate(() => /zmrazená \(🔒/.test((document.querySelector('.kl-zamek-pozn') || {}).textContent || '')));

/* Z1-4 (J. V. 22. 10. 2026): tisk nabídky zakázku hned uloží — jen online
 * a přihlášeně; ze souboru z disku beze změny (žádný zápis, žádný fetch). */
console.log('— Z1-4: tisk = hned uložit —');
const z14 = await p.evaluate(() => {
  const puvodni = { mozne: window.onlineMozne, uloz: window.onlineUloz };
  const volani = [];
  window.onlineUloz = (o) => { volani.push(o || {}); return Promise.resolve(true); };
  const priprava = () => { ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 9952'; syncVarianta(); };
  priprava(); ONLINE_STAV.ja = { email: 'autor.kryci@priklad.cz', role: 'Obchodník' };
  zamekPoTisku('nabidkaTisk');
  const offline = volani.length;
  window.onlineMozne = () => true;
  priprava(); zamekPoTisku('nabidkaTisk');
  const online = volani.length - offline, tiche = volani.length ? volani[volani.length - 1].tiche === true : false;
  /* K7-K1: uložení po tisku jde do fronty — během běžícího autosave se nezahodí. */
  const fronta = volani.length ? volani[volani.length - 1].fronta === true : false;
  priprava(); zamekPoTisku('techspec');                 // nezamykající dokument nic neukládá
  const techspec = volani.length - offline - online;
  priprava(); ONLINE_STAV.ja = null; zamekPoTisku('nabidkaTisk');
  const odhlaseny = volani.length - offline - online - techspec;
  window.onlineMozne = puvodni.mozne; window.onlineUloz = puvodni.uloz;
  return { offline, online, tiche, fronta, techspec, odhlaseny };
});
ok('Z1-4: ze souboru z disku tisk nic neukládá', z14.offline === 0, z14);
ok('Z1-4: online a přihlášeně tisk nabídky hned uloží (jednou, tiše)', z14.online === 1 && z14.tiche, z14);
ok('K7-K1: uložení po tisku čeká ve frontě na běžící zápis (nezahodí se)', z14.fronta, z14);
ok('Z1-4: nezamykající dokument ani nepřihlášený uživatel nic neukládá', z14.techspec === 0 && z14.odhlaseny === 0, z14);

await b.close();
if (konzole.length) console.log('Konzole:\n  ' + konzole.join('\n  '));
const spatne = chyby.filter(x => !x).length;
console.log(spatne ? `\n✗ ${spatne} z ${chyby.length} kontrol selhalo` : `\n✓ všech ${chyby.length} kontrol prošlo`);
process.exit(spatne || konzole.length ? 1 : 0);
