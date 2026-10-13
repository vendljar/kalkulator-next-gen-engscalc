/* Ověření v prohlížeči: PROBARVENÍ BUNĚK CENÍKU (13. 10. 2026, zadání J. V.).
 *
 * „Nastav v cenících pravidlo probarvení buněk. Světle červeně všechny, kde
 * je hodnota nula nebo není vyplněno, a světle oranžově všechny, kde je
 * hodnota vyšší než 40000,- Kč."
 *
 * Pravidlo samo hlídá src/test_cenik_barvy.js. Tady se ověřuje, že ho oba
 * editory (Ceník OCK, Ceník PROJ) opravdu použijí: po otevření, po novém
 * vykreslení (načtení / přepnutí varianty) i živě při psaní — a že barva
 * nic nezapíše do dat.
 *
 * Běží nad sestaveným dist/kalkulacka.html se zkušebním ceníkem
 * (src/zkusebni_cenik.js); hodnoty, které se testují, se zapisují ručně
 * a jsou vymyšlené. Spuštění: NODE_PATH=$(npm root -g) node overit_cenik_barvy.mjs */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_cenik_barvy.mjs');
  process.exit(2);
}
const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
const ZC = require(KOREN + 'src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
const chyby = [];
p.on('pageerror', e => chyby.push(String(e)));
await p.goto(KDE);
await p.waitForFunction(() => typeof window.render === 'function');
await p.waitForTimeout(500);

/* Zkušební ceník do běžícího sestavení (stejně jako overit_lista.mjs) a pár
 * ručně nastavených hodnot, na kterých se pravidlo pozná:
 *   montazniNosnik (Kč/ks) = 0        → červená
 *   cilkoKc        (Kč/ks) = 52 000   → oranžová
 *   atypPrirazka   (%)     = 0        → červená
 *   statikaHod     (hod)   = 50 000   → nic (nejsou to Kč)
 *   transportKc    (Kč/cesta) = 1 500 → nic */
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  ZAK = novaZakazka(); syncVarianta();
  const C = aktivniVarianta(ZAK).data.cenik;
  C.montazniNosnik = 0; C.cilkoKc = 52000; C.atypPrirazka = 0; C.statikaHod = 50000; C.transportKc = 1500;
  const PC = aktivniVarianta(ZAK).data.proj.cenik;
  PC.sazby.projektant = 0; PC.fixy.pbr = 61000; PC.dopravaKmKc = 12;
  syncVarianta(); render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
await p.waitForTimeout(200);

await p.locator('#tab-cenik').click();
await p.waitForTimeout(300);

const pole = (cesta, stranka = '#page-cenik') => p.locator(`${stranka} input[onchange*="set('${cesta}'"]`).first();
const tridy = async (loc) => {
  const c = (await loc.getAttribute('class')) || '';
  return { nula: /\bcenik-nula\b/.test(c), vysoka: /\bcenik-vysoka\b/.test(c) };
};

/* 1) po otevření Ceníku OCK */
let t = await tridy(pole('C.montazniNosnik'));
test('nula v Kč/ks svítí červeně', t.nula && !t.vysoka, t);
t = await tridy(pole('C.cilkoKc'));
test('52 000 Kč/ks svítí oranžově', t.vysoka && !t.nula, t);
t = await tridy(pole('C.atypPrirazka'));
test('nula v procentech svítí červeně', t.nula && !t.vysoka, t);
t = await tridy(pole('C.statikaHod'));
test('50 000 hodin oranžově nesvítí (nejsou to Kč)', !t.vysoka && !t.nula, t);
t = await tridy(pole('C.transportKc'));
test('běžná cena nesvítí', !t.vysoka && !t.nula, t);

const barva = await pole('C.montazniNosnik').evaluate(el => getComputedStyle(el).backgroundColor);
const barvaO = await pole('C.cilkoKc').evaluate(el => getComputedStyle(el).backgroundColor);
test(`červená je opravdu vidět (${barva})`, barva === 'rgb(253, 226, 226)', barva);
test(`oranžová je opravdu vidět (${barvaO})`, barvaO === 'rgb(255, 230, 199)', barvaO);

/* Každé obarvitelné pole v OCK odpovídá pravidlu nad svou hodnotou. */
const souhlas = await p.evaluate(() => {
  const vse = [...document.querySelectorAll('#page-cenik input[data-cenik-j]')];
  const spatne = vse.filter(el => {
    const ceka = el.disabled ? '' : cenikBunkaTrida(el.value, el.getAttribute('data-cenik-j'),
      { prazdnaOk: el.getAttribute('data-cenik-prazdna') === 'ok' });
    return el.classList.contains('cenik-nula') !== (ceka === 'cenik-nula')
      || el.classList.contains('cenik-vysoka') !== (ceka === 'cenik-vysoka');
  }).map(el => el.getAttribute('onchange'));
  const cisel = [...document.querySelectorAll('#page-cenik table.ceniktbl input[type=number]:not([disabled])')];
  const bezJednotky = cisel.filter(el => !el.hasAttribute('data-cenik-j')).map(el => el.getAttribute('onchange'));
  return { pocet: vse.length, spatne, bezJednotky };
});
test(`všech ${souhlas.pocet} polí ceníku OCK odpovídá pravidlu`, souhlas.pocet > 50 && souhlas.spatne.length === 0, souhlas.spatne.slice(0, 3));
test('každé číselné pole tabulky ceníku OCK se probarvuje', souhlas.bezJednotky.length === 0, souhlas.bezJednotky.slice(0, 3));

/* 2) živě při psaní — barva se přepne hned, ne až po opuštění pole */
const nosnik = pole('C.montazniNosnik');
await nosnik.fill('45000');
t = await tridy(nosnik);
test('napsáním 45 000 se červená přepne na oranžovou (bez opuštění pole)', t.vysoka && !t.nula, t);
await nosnik.fill('');
t = await tridy(nosnik);
test('smazáním hodnoty pole zčervená', t.nula && !t.vysoka, t);
await nosnik.fill('1200');
t = await tridy(nosnik);
test('běžná cena barvu zruší', !t.nula && !t.vysoka, t);
await nosnik.press('Tab');               // change → set() → nové vykreslení
await p.waitForTimeout(300);
t = await tridy(pole('C.montazniNosnik'));
const ulozeno = await p.evaluate(() => aktivniVarianta(ZAK).data.cenik.montazniNosnik);
test('po potvrzení a překreslení zůstane bez barvy a hodnota se zapsala', !t.nula && !t.vysoka && ulozeno === 1200, { t, ulozeno });

/* 3) barva nic nezapisuje: obarvení celé stránky nemění ceník */
const nezmeneno = await p.evaluate(() => {
  const pred = JSON.stringify(aktivniVarianta(ZAK).data);
  cenikObarviVse(document.getElementById('page-cenik'));
  cenikObarviVse(document.getElementById('page-cenikproj'));
  return pred === JSON.stringify(aktivniVarianta(ZAK).data);
});
test('probarvení je jen vzhled — data varianty se nemění', nezmeneno);

/* 4) přepnutí na jiná data (nová varianta / načtení) přebarví podle nich */
await p.evaluate(() => {
  aktivniVarianta(ZAK).data.cenik.cilkoKc = 300;
  syncVarianta(); render();
});
await p.waitForTimeout(200);
t = await tridy(pole('C.cilkoKc'));
test('po novém vykreslení s jinou hodnotou oranžová zmizí', !t.vysoka && !t.nula, t);

/* 5) administrátorský pohled: katalogové (trvalé) položky a sloupec Zahraničí */
const admin = await p.evaluate(() => {
  NAST.jeAdmin = true;
  katalogPridejVc(KATALOG, Z, CENIK_GRP_SEKCE[CENIK_DEF[0][0]], { nazev: 'Zkušební trvalá', mnozstvi: 1, cena: 0 });
  render();
  const kat = document.querySelector('#page-cenik input[onchange*="katSet("][onchange*="\'cena\'"]');
  const zahr = document.querySelector('#page-cenik input.zahr-cena[data-cenik-prazdna="ok"]');
  return {
    kat: kat ? kat.className : null,
    zahrPrazdne: zahr ? { value: zahr.value, cls: zahr.className } : null,
  };
});
test('katalogová položka s cenou 0 svítí červeně', admin.kat !== null && /\bcenik-nula\b/.test(admin.kat), admin);
if (admin.zahrPrazdne) {
  test('prázdná Cena Zahraničí („jako ČR") červeně nesvítí',
    admin.zahrPrazdne.value !== '' || !/\bcenik-nula\b/.test(admin.zahrPrazdne.cls), admin.zahrPrazdne);
} else console.log('INFO sloupec Cena Zahraničí v tomto sestavení není — kontrola prázdného pole vynechána');

/* 6) Ceník PROJ */
await p.locator('#tab-cenikproj').click();
await p.waitForTimeout(300);
t = await tridy(pole('PC.sazby.projektant', '#page-cenikproj'));
test('PROJ: nulová sazba Kč/hod svítí červeně', t.nula && !t.vysoka, t);
t = await tridy(pole('PC.fixy.pbr', '#page-cenikproj'));
test('PROJ: 61 000 Kč svítí oranžově', t.vysoka && !t.nula, t);
t = await tridy(pole('PC.dopravaKmKc', '#page-cenikproj'));
test('PROJ: 12 Kč/km nesvítí', !t.vysoka && !t.nula, t);
const pbr = pole('PC.fixy.pbr', '#page-cenikproj');
await pbr.fill('0');
t = await tridy(pbr);
test('PROJ: přepsáním na 0 se oranžová přepne na červenou', t.nula && !t.vysoka, t);

test('žádná chyba JavaScriptu', chyby.length === 0, chyby.slice(0, 2));

await b.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
