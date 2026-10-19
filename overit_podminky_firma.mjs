/* Ověření v prohlížeči: platební podmínky firmy v Nastavení → Smlouvy / Šablony
 * (#367 fáze 2, V8, 19. 10. 2026).
 *
 * Model a pravidla hlídá src/test_podminky.js v Node. Tady jde o to, co Node
 * nevidí: že se obrazovka vykreslí (společný blok, přepínač OCK | PROJ,
 * karty), že zápis z formuláře doputuje do krycího listu otevřené zakázky,
 * že chybný součet splátek svítí červeně a zveřejnění neprojde, že přepínač
 * filtruje tabulku šablon a že běžný uživatel hodnoty jen čte.
 */
import { chromium } from 'playwright';

const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
const vysledky = [];
const ok = (co, podm, detail) => {
  console.log((podm ? '  ✓ ' : '  ✗ ') + co + (podm || detail === undefined ? '' : '  → ' + detail));
  vysledky.push(!!podm);
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
const konzole = [];
p.on('console', m => { if (m.type() === 'error') konzole.push(m.text()); });
p.on('pageerror', e => konzole.push(String(e)));
await p.goto(KDE);
await p.waitForTimeout(600);

/* Dialogy aplikace (dialog.js) se nahradí odpovědí „ano" — modál sám
 * ověřuje overit_dialogy.mjs. */
await p.evaluate(() => {
  window.__dlg = [];
  window.potvrd = t => { window.__dlg.push(String(t)); return Promise.resolve(true); };
  window.hlaska = t => { window.__dlg.push(String(t)); return Promise.resolve(); };
  NAST.jeAdmin = true;
  NAST.firma = firmaDefault();
  otevriNastaveni();
  nastPanel('sablony');
});
await p.waitForTimeout(200);

const obrazovka = () => p.evaluate(() => {
  const o = document.getElementById('nastaveni-overlay');
  const t = o ? o.innerText : '';
  return {
    text: t,
    prepinac: [...document.querySelectorAll('.podm-prepinac button')].map(x => x.textContent.trim() + (x.getAttribute('aria-pressed') === 'true' ? '*' : '')),
    chyba: document.querySelectorAll('.podm-soucet .pill.bad').length,
    vypnuta: [...document.querySelectorAll('#nastaveni-overlay [onchange^="podmSet"]')].filter(x => x.disabled).length,
    vsechna: document.querySelectorAll('#nastaveni-overlay [onchange^="podmSet"]').length,
  };
});

// --- 1) rozvržení -------------------------------------------------------------
let o = await obrazovka();
ok('společný blok nad přepínačem', /Společné pro OCK i PROJ/i.test(o.text));
ok('přepínač OCK | PROJ, výchozí OCK', o.prepinac.length === 2 && /^OCK.*\*$/.test(o.prepinac[0]), JSON.stringify(o.prepinac));
ok('karta OCK: Platební podmínky OCK, Smluvní standardy OCK, kapitoly nabídky',
  /Platební podmínky OCK/i.test(o.text) && /Smluvní standardy OCK/i.test(o.text) && /Kapitoly nabídky/i.test(o.text));
ok('karta OCK nemá plán plateb projekce', !/Plán plateb projekce/i.test(o.text));
ok('karta OCK: šablony jen OCK (bez smlouvy PROJEKČNÍ PRÁCE)',
  /REALIZACE/.test(o.text) && !/PROJEKČNÍ PRÁCE/.test(o.text));
ok('výchozí hodnoty = dnešní standard (součet 100 %, žádná chyba)', o.chyba === 0 && /100 %/.test(o.text));

// --- 2) zápis z formuláře doputuje do krycího listu -----------------------------
const kl = (id, cast) => p.evaluate(([id, cast]) => {
  const v = aktivniVarianta(ZAK);
  if (cast === 'proj') {
    const pole = [].concat(...KRYCI_PROJ_SEKCE.map(s => s.pole)).find(x => x.id === id);
    return kryciProjHodnota(pole, { hodnoty: {} }, kryciProjCtx(ZAK, v));
  }
  const pole = [].concat(...KRYCI_SEKCE.map(s => s.pole)).find(x => x.id === id);
  return kryciHodnota(pole, { hodnoty: {} }, kryciCtx(ZAK, v, JEKLY));
}, [id, cast]);
ok('krycí list OCK před změnou: splatnost 14', await kl('splatnostDni') === '14', await kl('splatnostDni'));
await p.evaluate(() => {
  const inp = [...document.querySelectorAll('#nastaveni-overlay input[type=number]')]
    .find(x => /'ock', 'splatnostDni'/.test(x.getAttribute('onchange')));
  inp.value = '30'; inp.dispatchEvent(new Event('change'));
});
await p.waitForTimeout(150);
ok('formulář zapsal splatnost OCK do Firmy', await p.evaluate(() => NAST.firma.podminky.ock.splatnostDni === 30));
ok('krycí list OCK rozpracované zakázky: splatnost 30 z Firmy', await kl('splatnostDni') === '30', await kl('splatnostDni'));
o = await obrazovka();
ok('u změněného pole svítí „upraveno"', /upraveno/.test(o.text));

// --- 3) chybný součet -----------------------------------------------------------
await p.evaluate(() => podmSet('ock', 'faktura2Proc', '45', 'cislo'));
await p.waitForTimeout(150);
o = await obrazovka();
ok('součet 105 %: červený štítek a text o zablokování', o.chyba === 1 && /105 %/.test(o.text) && /zablokované/.test(o.text), o.chyba);
const zverejnit = await p.evaluate(() => firmaLzeZverejnit(Object.assign({}, NAST.firma, { ukazkove: false })));
ok('součet 105 %: firmaLzeZverejnit odmítne s vysvětlením', !zverejnit.ok && /100 %/.test(zverejnit.duvod), zverejnit.duvod);
await p.evaluate(() => podmSet('ock', 'faktura2Proc', '40', 'cislo'));
await p.waitForTimeout(100);
ok('oprava součtu: štítek zmizí', (await obrazovka()).chyba === 0);

// --- 4) přepínač PROJ -------------------------------------------------------------
await p.evaluate(() => podmPrepni('proj'));
await p.waitForTimeout(150);
o = await obrazovka();
ok('karta PROJ: Platební podmínky PROJ a plán plateb projekce', /Platební podmínky PROJ/i.test(o.text) && /Plán plateb projekce/i.test(o.text));
ok('karta PROJ nemá kapitoly nabídky OCK ani podmínky OCK', !/Kapitoly nabídky/i.test(o.text) && !/Platební podmínky OCK/i.test(o.text));
ok('karta PROJ: šablony jen PROJ', /PROJEKČNÍ PRÁCE/.test(o.text) && !/REALIZACE/.test(o.text));
await p.evaluate(() => podmSet('proj', 'pokutaTermin', '0,1 % / den'));
await p.waitForTimeout(100);
ok('krycí list PROJ: pokuta za prodlení s odevzdáním z Firmy', await kl('pokutaTermin', 'proj') === '0,1 % / den', await kl('pokutaTermin', 'proj'));
await p.evaluate(() => podmSablonyVse(true));
await p.waitForTimeout(100);
o = await obrazovka();
ok('volba „všechny šablony" ukáže i šablony OCK', /REALIZACE/.test(o.text) && /PROJEKČNÍ PRÁCE/.test(o.text));

// --- 5) běžný uživatel jen čte -----------------------------------------------------
await p.evaluate(() => { NAST.jeAdmin = false; nastRefresh(); });
await p.waitForTimeout(150);
o = await obrazovka();
ok('běžný uživatel: všechna pole podmínek jsou vypnutá', o.vsechna > 0 && o.vypnuta === o.vsechna, o.vypnuta + '/' + o.vsechna);
ok('běžný uživatel: věta „smí měnit jen administrátor"', /smí měnit jen\s+administrátor/.test(o.text));
await p.evaluate(() => podmSet('proj', 'splatnostDni', '60', 'cislo'));
ok('běžný uživatel: zápis se neprovede', await p.evaluate(() => !NAST.firma.podminky.proj || NAST.firma.podminky.proj.splatnostDni !== 60));

ok('za celý průchod žádná chyba v konzoli', konzole.length === 0, konzole.join(' | '));
await b.close();
const spatne = vysledky.filter(x => !x).length;
console.log('\n' + (vysledky.length - spatne) + ' OK, ' + spatne + ' FAIL');
process.exit(spatne ? 1 : 0);
