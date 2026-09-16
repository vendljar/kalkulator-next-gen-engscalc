/* CELÁ CESTA OCK ZAKÁZKY: od založení po vytištění nabídky do PDF.
 * (16. 9. 2026, zadání J. V.: „otestuj na jedné fiktivní založené zakázce ock,
 *  že nám funguje celý proces výpočtu kalkulace od založení až po vytištění
 *  nabídky v pdf, včetně těchto drobností")
 *
 * PROČ TENHLE HARNESS VZNIKL
 *
 * Jednotkové sady v src/ ověřují jádro a jednotlivé kroky zvlášť. Chyby, které
 * J. V. 16. 9. hlásil třikrát po sobě, ale ani jedna nebyla uvnitř kroku — byly
 * v MEZEŘE mezi kroky:
 *   – zaškrtávátko psalo do pole, které jádro nečetlo,
 *   – matice Výchozí měřila proti jinému základu než zakládání nové zakázky,
 *   – množství se řídilo jiným přepínačem než zahrnutí.
 * Každý krok sám o sobě fungoval. Rozbité to bylo až dohromady, a to pozná
 * jedině průchod celou cestou v opravdovém prohlížeči.
 *
 * Sada proto NEZKOUŠÍ znovu to, co umí jednotkové testy (částky, sazby,
 * zaokrouhlení). Ptá se na spojitost: co obchodník naklikne, to se propíše do
 * výpočtu, z výpočtu do nabídky a z nabídky do PDF.
 *
 * Spuštění: python3 build.py && node overit_ock_cela_cesta.mjs
 * `dist/` v repozitáři není — bez sestavení tenhle soubor nemá co otevřít.
 *
 * ŽÁDNÉ ČÁSTKY V TVRZENÍCH. Ceny jsou ze zkušebního ceníku a repozitář je
 * veřejný; testy se ptají na „víc než nula" a na rozdíly, ne na konkrétní čísla.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. Nainstalujte: npm i playwright');
  process.exit(2);
}

const KOREN = fileURLToPath(new URL('.', import.meta.url));
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
if (!fs.existsSync(KOREN + 'dist/kalkulacka.html')) {
  console.error('Chybí dist/kalkulacka.html — nejdřív spusťte: python3 build.py');
  process.exit(2);
}

let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail))); }
};
const oddil = (t) => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 60 - t.length)));

const ZC = require(KOREN + 'src/zkusebni_cenik.js');

const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
const p = await ctx.newPage();
const konzole = [];
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') konzole.push('error: ' + m.text()); });

await p.goto(KDE);
/* `const NAST` není vlastnost window (je v lexikálním rozsahu skriptu),
 * proto typeof, ne window.NAST. */
await p.waitForFunction(() => typeof NAST !== 'undefined' && typeof render === 'function',
  null, { timeout: 15000 });
await p.waitForTimeout(400);

oddil('1) sestavení se otevře a nastartuje');
zkus('aplikace nastartovala bez chyby v konzoli', konzole.length === 0, konzole);

/* ---------------------------------------------------------------------------
 * PŘÍPRAVA. Dvě věci, bez kterých cesta neprojde a obě se v harnessech
 * opakovaně přehlédly:
 *
 *  1) Sestavení nese PRÁZDNÝ ceník (DEFAULT_CENIK má `prazdny`) a kontrola
 *     „ukázkový ceník" pak dokument vůbec nepustí. Podstrčí se tedy tentýž
 *     zkušební ceník, ze kterého počítají jednotkové sady.
 *  2) Dialogy jsou od 2. 9. 2026 vlastní (src/ui/dialog.js), ne nativní —
 *     `page.on('dialog')` nechytí nic. Nahradí se stubem, který odpoví „ano".
 *     Skutečný modál ověřuje overit_dialogy.mjs.
 * ------------------------------------------------------------------------- */
await p.evaluate(([c, cp]) => {
  NAST.jeAdmin = true; NAST.nahledRole = '';
  window.__dlg = [];
  window.potvrd = (t) => { window.__dlg.push(String(t)); return Promise.resolve(true); };
  window.hlaska = (t) => { window.__dlg.push(String(t)); return Promise.resolve(); };
  window.dotaz = (t, v) => { window.__dlg.push(String(t)); return Promise.resolve(v == null ? '' : v); };
  const bezZnacek = o => { if (o) { delete o.ukazkove; delete o.prazdny; } };
  Object.assign(DEFAULT_CENIK, c); Object.assign(DEFAULT_CENIK_PROJ, cp);
  [DEFAULT_CENIK, DEFAULT_CENIK_PROJ, NAST.slevy, NAST.firma].forEach(bezZnacek);
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);

oddil('2) založení fiktivní zakázky a hlavička');
/* Zakázka se zakládá TOUTÉŽ cestou jako tlačítkem „Nová zakázka": novaZakazka()
 * a hned syncVarianta(), jinak Z/C/OCK pořád míří do staré zakázky. */
const zalozeni = await p.evaluate(() => {
  ZAK = novaZakazka(); syncVarianta();
  const predloha = ZAK.cislo;
  const vyplnenoPredlohy = (typeof hlavickaVyplneno === 'function') ? hlavickaVyplneno(ZAK.cislo) : null;
  const bezZnacek = o => { if (o) { delete o.ukazkove; delete o.prazdny; } };
  ZAK.varianty.forEach(v => { bezZnacek(v.data.cenik); bezZnacek(v.data.proj.cenik); });
  render();
  return { predloha, vyplnenoPredlohy, variant: ZAK.varianty.length,
           datum: ZAK.datum, dnes: (typeof dnesIso === 'function') ? dnesIso() : null };
});
zkus('nová zakázka má jednu variantu', zalozeni.variant === 1, zalozeni);
zkus('číslo je zatím jen předloha, ne vyplněná hlavička',
  zalozeni.vyplnenoPredlohy === false, zalozeni.predloha);
zkus('a nese dnešní datum', zalozeni.datum === zalozeni.dnes, zalozeni);

/* Hlavička se vyplňuje přes set() — touž cestou jako z formuláře, včetně
 * razítka `upraveno` a překreslení. */
const hlavicka = await p.evaluate(() => {
  set('ZAK.cislo', '2026 - OPR - CN - 9101');
  set('ZAK.nazevAkce', 'TEST — průchod celou cestou');
  set('ZAK.objednatel', 'Smyšlený objednatel s. r. o.');
  set('ZAK.adresa', 'Zkušební 1, Praha');
  return { cislo: get('ZAK.cislo'), nazev: get('ZAK.nazevAkce'),
           vyplneno: (typeof hlavickaVyplneno === 'function') ? hlavickaVyplneno(get('ZAK.cislo')) : null,
           vDom: document.getElementById('page-kalk').innerText.indexOf('2026 - OPR - CN - 9101') >= 0 };
});
zkus('hlavička se zapsala do dat', hlavicka.cislo.endsWith('9101'), hlavicka.cislo);
zkus('a po dopsání pořadí se číslo počítá za vyplněné', hlavicka.vyplneno === true);
zkus('a je vidět i v překreslené kalkulaci', hlavicka.vDom === true);

oddil('3) zadání šachty');
const zadani = await p.evaluate(() => {
  set('Z.typSachty', 'exteriérová');
  set('Z.sirka', 1.6); set('Z.hloubka', 1.4);
  set('Z.zdvih', 9); set('Z.prejezd', 3.5); set('Z.prohluben', 1.1);
  set('Z.nastupiste', 4);
  const r = vypocetAkt();
  return { sirka: get('Z.sirka'), nastupiste: get('Z.nastupiste'),
           zakladni: r.souhrn ? r.souhrn.zakladCena : null,
           maSekce: !!(r.sekce && r.sekce.hrubaOck && r.sekce.hrubaOck.length) };
});
zkus('rozměry se zapsaly', zadani.sirka === 1.6 && zadani.nastupiste === 4, zadani);
zkus('výpočet vrátil sekce hrubé konstrukce', zadani.maSekce === true);

oddil('4) drobnosti, kvůli kterým tahle sada vznikla');

/* (a) Nezaškrtnutý volitelný řádek NESMÍ ukazovat částku (16. 9. 2026).
 *     Lešení má fixní část, takže u odškrtnutého řádku svítilo 20 000 Kč,
 *     přestože se nikam nepočítalo. */
const pomlcka = await p.evaluate(() => {
  const radek = (klic) => [...document.querySelectorAll('#page-kalk tr')]
    .find(tr => (tr.innerHTML || '').indexOf("volitelneToggle('" + klic + "'") >= 0);
  const bunky = (tr) => [...tr.querySelectorAll('td')].map(td => td.textContent.trim());
  volitelneToggle('leseniVnitrni', false); render();
  const vyp = bunky(radek('leseniVnitrni'));
  volitelneToggle('leseniVnitrni', true); render();
  const zap = bunky(radek('leseniVnitrni'));
  return { vyp: vyp.slice(-3), zap: zap.slice(-3) };
});
zkus('odškrtnuté lešení ukazuje pomlčku, ne částku',
  pomlcka.vyp.every(x => x === '—' || x === ''), pomlcka.vyp);
zkus('zaškrtnuté zase částku (pomlčka není natrvalo)',
  pomlcka.zap.some(x => /\d/.test(x)), pomlcka.zap);

/* (b) Zaškrtnutí PŘECHODOVÝCH PLECHŮ musí něco udělat. Do 16. 9. 2026 se
 *     položka započetla s množstvím 0 a zároveň zmizela z příplatků —
 *     zákazník ji nedostal nabídnutou ani ji nezaplatil v základní ceně. */
const plechy = await p.evaluate(() => {
  const stav = () => {
    const r = vypocetAkt();
    const k = r.volitelneKatalog.find(x => x.key === 'prechodove');
    return { zahrnuto: k.zahrnuto, mnozstvi: +k.mnozstvi,
             vPriplatcich: (r.priplatky || []).some(x => x.key === 'prechMat') };
  };
  const chk = () => [...document.querySelectorAll('#page-kalk tr')]
    .find(tr => (tr.innerHTML || '').indexOf("volitelneToggle('prechodove'") >= 0)
    .querySelectorAll('input[type=checkbox]')[0];
  const pred = stav();
  chk().click();                 // skutečné kliknutí, ne volání funkce
  const po = stav();
  const domPo = chk().checked;
  chk().click();
  const zpet = stav();
  return { pred, po, domPo, zpet };
});
zkus('kliknutí na zaškrtávátko položku opravdu zahrne',
  plechy.po.zahrnuto === true, plechy);
zkus('a zahrnutá položka má nenulové množství (ne „zaškrtnuto za nula korun")',
  plechy.po.mnozstvi > 0, plechy.po);
zkus('zahrnutá z příplatků zmizí — nepočítá se dvakrát',
  plechy.po.vPriplatcich === false, plechy.po);
zkus('odškrtnutá se do příplatků vrátí — neztratí se nadobro',
  plechy.zpet.vPriplatcich === true, plechy.zpet);
zkus('zaškrtávátko v DOM drží, co uživatel naklikal', plechy.domPo === true);

/* (c) Sloupec VÝCHOZÍ se musí dát přepnout a nová zakázka to má dostat.
 *     Do 16. 9. 2026 byl mrtvý: kreslil se proti jinému základu, než proti
 *     kterému se matice aplikuje, takže se zaškrtnutí neuložilo. */
const vychozi = await p.evaluate(() => {
  const chk3 = () => [...document.querySelectorAll('#page-kalk tr')]
    .find(tr => (tr.innerHTML || '').indexOf("volitelneToggle('prechodove'") >= 0)
    .querySelectorAll('input[type=checkbox]')[2];
  const zaznam = () => (NAST.zobrazeni && NAST.zobrazeni.vychozi)
    ? NAST.zobrazeni.vychozi['ock.prechodove'] : undefined;
  const novaDostane = () => {
    const nz = novaZakazka();
    const zad = nz.varianty[0].data.ock.zadani;
    zobrazeniVychoziAplikuj(NAST.zobrazeni, zad, null);
    zad.typSachty = 'exteriérová';
    const k = vypocet(zad, nz.varianty[0].data.cenik, JEKLY, OCK.fixes)
      .volitelneKatalog.find(x => x.key === 'prechodove');
    return { zahrnuto: k.zahrnuto, mnozstvi: +k.mnozstvi };
  };
  const zaklad = volitelneVychoziZaklad('prechodove');
  const pred = { zaznam: zaznam(), chk: chk3().checked, nova: novaDostane() };
  chk3().click();
  const po = { zaznam: zaznam(), chk: chk3().checked, nova: novaDostane() };
  chk3().click();                                   // uklidit po sobě
  const zpet = { zaznam: zaznam(), nova: novaDostane() };
  return { zaklad, pred, po, zpet };
});
zkus('sloupec Výchozí říká pravdu o tom, s čím nová zakázka začíná',
  vychozi.zaklad === vychozi.pred.nova.zahrnuto, vychozi);
zkus('kliknutí ve sloupci Výchozí se uloží do matice',
  vychozi.po.zaznam !== vychozi.pred.zaznam, { pred: vychozi.pred.zaznam, po: vychozi.po.zaznam });
zkus('a NOVÁ zakázka to pak opravdu dostane',
  vychozi.po.nova.zahrnuto !== vychozi.pred.nova.zahrnuto, vychozi);
zkus('zapnuto a vypnuto nedávají totéž — sloupec není mrtvý',
  JSON.stringify(vychozi.po.nova) !== JSON.stringify(vychozi.zpet.nova), vychozi);
zkus('harness po sobě uklidil (matice je zpátky)',
  vychozi.zpet.zaznam === vychozi.pred.zaznam, vychozi);

/* (d) Háky a sokl dostaly protějšek v příplatcích (16. 9. 2026). Do té doby
 *     odškrtnutím zmizely nadobro a zákazník si je nemohl doobjednat. */
const dvojdome = await p.evaluate(() => {
  const out = {};
  ['haky', 'sokl'].forEach(k => {
    volitelneToggle(k, true);
    const zap = (vypocetAkt().priplatky || []).some(x => x.key === k);
    volitelneToggle(k, false);
    const vyp = (vypocetAkt().priplatky || []).some(x => x.key === k);
    out[k] = { zapVPriplatcich: zap, vypVPriplatcich: vyp };
    volitelneToggle(k, true);
  });
  render();
  return out;
});
zkus('háky: zaškrtnuté v příplatcích nejsou, odškrtnuté ano',
  dvojdome.haky.zapVPriplatcich === false && dvojdome.haky.vypVPriplatcich === true, dvojdome.haky);
zkus('sokl: totéž', dvojdome.sokl.zapVPriplatcich === false
  && dvojdome.sokl.vypVPriplatcich === true, dvojdome.sokl);

/* (e) Správce musí v příplatcích vidět, co spadlo do základní ceny — jinak
 *     mu řádky z ceníku variant beze stopy zmizí (nález J. V. 16. 9. 2026). */
const vZakladu = await p.evaluate(() => {
  const html = () => document.getElementById('page-kalk').innerHTML;
  NAST.jeAdmin = true; NAST.nahledRole = ''; render();
  const admin = html().indexOf('V ZÁKLADNÍ CENĚ (sekce Volitelné)') >= 0;
  NAST.jeAdmin = false; NAST.nahledRole = 'Obchodník'; render();
  const obchodnik = html().indexOf('V ZÁKLADNÍ CENĚ (sekce Volitelné)') >= 0;
  /* Věta pod tabulkou zůstává i obchodníkovi — je zalomená, takže se hledá
   * jen její začátek, ne celý text. */
  const veta = document.getElementById('page-kalk').innerText.indexOf('V příplatcích se nenabízí') >= 0;
  NAST.jeAdmin = true; NAST.nahledRole = ''; render();
  return { admin, obchodnik, veta };
});
zkus('správce vidí v příplatcích i to, co je v základní ceně', vZakladu.admin === true);
zkus('obchodníkovi to v ceníku pro zákazníka nepřekáží', vZakladu.obchodnik === false);
zkus('a vysvětlující věta pod tabulkou je', vZakladu.veta === true);

oddil('5) výpočet dá smysluplnou cenu');
const cena = await p.evaluate(() => {
  const r = vypocetAkt();
  return { zaklad: r.souhrn ? r.souhrn.zakladCena : 0,
           priplatku: (r.priplatky || []).length,
           volitelnych: (r.volitelneKatalog || []).filter(x => x.zahrnuto).length };
});
zkus('základní cena je nenulová', cena.zaklad > 0, { maCenu: cena.zaklad > 0 });
zkus('nabízí se nějaké příplatky', cena.priplatku > 0, cena.priplatku);
zkus('a něco je v základní ceně', cena.volitelnych > 0, cena.volitelnych);

oddil('6) nabídka se vygeneruje');
/* Funkce nabídky jsou v lexikálním rozsahu skriptu, ne na window — volají se
 * jménem přes nepřímý eval, stejně jako v overit_nabidky_dph.mjs. */
async function otevri(fn) {
  const [okno] = await Promise.all([
    ctx.waitForEvent('page'),
    p.evaluate(f => (0, eval)(f + '()'), fn),
  ]);
  await okno.waitForLoadState('domcontentloaded');
  await okno.waitForTimeout(500);
  return okno;
}
const nab = await otevri('nabidkaOckDokument');
const textNab = await nab.evaluate(() => {
  const d = document.getElementById('dok');
  return d ? d.innerText : '';
});
zkus('nabídka se otevřela a má obsah', textNab.length > 300, textNab.length);
zkus('a nese číslo z hlavičky', textNab.indexOf('9101') >= 0);
zkus('a název akce', textNab.indexOf('průchod celou cestou') >= 0);
zkus('a objednatele', textNab.indexOf('Smyšlený objednatel') >= 0);
/* Co je v základní ceně, se v nabídce pro zákazníka NESMÍ objevit ještě
 * jednou mezi příplatky — to je to dvojí započtení. */
const dvakrat = await nab.evaluate(() => {
  const t = document.getElementById('dok').innerText;
  const kolik = (t.match(/HÁKY NA MYTÍ ŠACHTY/g) || []).length;
  return kolik;
});
zkus('položka ze základní ceny není v nabídce podruhé mezi příplatky',
  dvakrat <= 1, dvakrat);

oddil('7) vytištění do PDF');
/* Tisk je window.print(); v harnessu se místo dialogu vyrobí PDF přímo
 * z téhož okna. Ověřuje se, že tisková podoba vůbec vznikne a že se do ní
 * nedostane ovládání stránky (.noprint). */
const emul = await nab.emulateMedia({ media: 'print' }).then(() => true).catch(() => false);
zkus('okno nabídky umí přepnout na tiskové médium', emul === true);
const skryte = await nab.evaluate(() => {
  const prvky = [...document.querySelectorAll('.noprint')];
  const videt = prvky.filter(e => getComputedStyle(e).display !== 'none');
  return { celkem: prvky.length, videt: videt.length };
});
zkus('ovládací prvky se do tisku nedostanou (.noprint je skryté)',
  skryte.celkem === 0 || skryte.videt === 0, skryte);
const pdf = await nab.pdf({ format: 'A4', printBackground: true });
zkus('PDF se vyrobilo', pdf && pdf.length > 5000, pdf ? pdf.length : 0);
zkus('a je to opravdu PDF (hlavička souboru)',
  pdf.slice(0, 5).toString('latin1') === '%PDF-', pdf.slice(0, 5).toString('latin1'));
await nab.emulateMedia({ media: 'screen' });
await nab.close();

oddil('8) krycí list');
const kryci = await p.evaluate(() => {
  prepniTab('kryci'); render();
  const t = document.getElementById('page-kryci');
  return { je: !!t, delka: t ? t.innerText.length : 0,
           maCislo: t ? t.innerText.indexOf('9101') >= 0 : false };
});
zkus('krycí list se vykreslil', kryci.je && kryci.delka > 200, kryci);
zkus('a nese číslo zakázky', kryci.maCislo === true);

oddil('závěr');
zkus('za celý průchod nepřibyla chyba v konzoli', konzole.length === 0, konzole);

await b.close();
console.log('\n' + (fail ? '✕ SELHALO ' + fail + ' z ' + (ok + fail) : '✓ ' + ok + ' prošlo, 0 selhalo'));
process.exit(fail ? 1 : 0);
