/* Ověření v prohlížeči: dialog o přepočtu na dnešní ceník (#284)
 * ==============================================================
 *
 * Nálezy N7 a N22 kola 6. Do 21. 9. 2026 se rozpracovaná zakázka po otevření
 * tiše přepočítala na platný ceník a do lišty se napsala věta. Věta v liště
 * se snadno přehlédne a hlavně neříkala to podstatné: O KOLIK se hnula cena.
 * „12 změněných položek" může znamenat stokorunu i sto tisíc.
 *
 * Dialog proto ukazuje verzi ceníku, počet změněných položek i rozdíl ceny
 * a nabízí VRÁCENÍ původních cen — jinak je to jen hlášení hotové věci.
 *
 * Tady se zkouší to, co v Node nejde: že se dialog opravdu otevře, co v něm
 * stojí, a že obě tlačítka dělají, co slibují. Součet cen samotný hlídá
 * `src/test_cenik_dopad.js`.
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_prepocet_dialog.mjs
 */
import { createRequire } from 'module';
import path from 'path';
import { pathToFileURL } from 'url';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_prepocet_dialog.mjs');
  process.exit(2);
}

const KDE = pathToFileURL(path.resolve('dist/kalkulacka.html')).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + detail)); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
const konzole = [];
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') konzole.push('error: ' + m.text()); });
await p.goto(KDE);
await p.waitForTimeout(600);

/* Zakázka s cenou + stav „po přepočtu", jaký po sobě nechá
 * `uloSrovnejSPlatnymCenikem`. Ceník se zdraží, aby byl rozdíl měřitelný. */
const priprava = async () => p.evaluate(() => {
  set('OCK.zadani.typSachty', 'exteriérová');
  set('OCK.zadani.sirka', 1.6); set('OCK.zadani.hloubka', 1.4);
  set('OCK.zadani.zdvih', 9); set('OCK.zadani.prejezd', 3.5);
  set('OCK.zadani.prohluben', 1.1); set('OCK.zadani.nastupiste', 4);
  const pred = cenikCenaRozpracovanych(ZAK, JEKLY);
  const zaloha = JSON.parse(JSON.stringify(ZAK));
  const c = aktivniVarianta(ZAK).data.cenik;
  c.montazHodKc = (+c.montazHodKc || 0) + 500;        // „nový ceník"
  const po = cenikCenaRozpracovanych(ZAK, JEKLY);
  ULO_PREPOCET.zaloha = zaloha;
  /* `zakazka` drží, ke KTERÉ zakázce záloha patří — dialog to po `await`
   * kontroluje, aby „Vrátit" nesáhlo do cizích dat. */
  ULO_PREPOCET.zakazka = ZAK;
  ULO_PREPOCET.pred = pred; ULO_PREPOCET.po = po; ULO_PREPOCET.verze = 28;
  return { pred: pred.cena, po: po.cena, montaz: c.montazHodKc };
});

const stav = await priprava();
zkus('příprava: přepočet cenu opravdu zvedl', stav.po > stav.pred,
  JSON.stringify(stav));

/* ---------- 1) dialog se otevře a řekne to podstatné ---------- */

await p.evaluate(() => { window.__odp = uloPrepocetDialog({ prepocteno: 1, zmen: 5 }); });
await p.waitForTimeout(250);

const dlg = await p.evaluate(() => {
  const el = document.getElementById('dlg');
  if (!el) return null;
  return { nadpis: (el.querySelector('.dlg-nadpis') || {}).textContent || '',
           text: (el.querySelector('.dlg-text') || {}).textContent || '',
           tlacitka: [...el.querySelectorAll('.dlg-btns button')].map(x => x.textContent.trim()) };
});
zkus('dialog se otevřel', !!dlg);
zkus('nadpis mluví o změně ceníku', dlg && /cen[íi]k/i.test(dlg.nadpis), dlg && dlg.nadpis);
/* 4. PÁD A SPRÁVNÉ SLOVESO (nález K5, 22. 9. 2026). Do té doby z toho
 * vycházelo „přepočítala se na nová verze. Změnilo se 3 ceny." */
zkus('text nese verzi ceníku ve 4. pádě', dlg && /přepočítala se na verzi 28/.test(dlg.text),
  dlg && dlg.text.slice(0, 90));
zkus('text nese počet změněných cen', dlg && /Změnilo se 5 cen/.test(dlg.text),
  dlg && dlg.text.slice(0, 120));
zkus('a nezůstal v něm 1. pád', dlg && !/na verze |na nová verze/.test(dlg.text),
  dlg && dlg.text.slice(0, 90));

/* Tvary počtu se měří přímo na skládání věty, ne přes dialog — jinak by se
 * musela pro každý případ vyrobit zakázka s přesným počtem změn. */
const tvary = await p.evaluate(() => {
  const out = {};
  for (const n of [0, 1, 3, 5]) out[n] = uloPrepocetUvod(n, 28);
  out.bezVerze = uloPrepocetUvod(2, null);
  return out;
});
zkus('jedna změna má jednotné číslo', /Změnila se 1 cena\./.test(tvary[1]), tvary[1]);
zkus('tři změny mají tvar pro 2–4', /Změnily se 3 ceny\./.test(tvary[3]), tvary[3]);
zkus('pět a víc má tvar pro množství', /Změnilo se 5 cen\./.test(tvary[5]), tvary[5]);
zkus('nula spadne do tvaru pro množství, ne do 2–4', /Změnilo se 0 cen\./.test(tvary[0]), tvary[0]);
zkus('bez čísla verze se řekne „novou verzi"', /na novou verzi\./.test(tvary.bezVerze), tvary.bezVerze);
zkus('text říká, o kolik se cena zvedla', dlg && /zvedla o/.test(dlg.text), dlg && dlg.text.slice(0, 200));
zkus('text nabídne i trvalé řešení (dohodnuté ceny)',
  dlg && /dohodnut/.test(dlg.text), dlg && dlg.text.slice(-140));
zkus('dialog má dvě cesty ven', dlg && dlg.tlacitka.length === 2, dlg && dlg.tlacitka);
zkus('a jedna z nich vrací původní ceny',
  dlg && dlg.tlacitka.some(t => /Vrátit/i.test(t)), dlg && dlg.tlacitka);

/* ---------- 2) „Vrátit původní ceny" opravdu vrátí ---------- */

await p.evaluate(() => {
  const b = [...document.querySelectorAll('#dlg .dlg-btns button')].find(x => /Vrátit/i.test(x.textContent));
  b.click();
});
await p.waitForTimeout(300);
const poVraceni = await p.evaluate(async () => ({
  odp: await window.__odp,
  montaz: aktivniVarianta(ZAK).data.cenik.montazHodKc,
  cena: cenikCenaRozpracovanych(ZAK, JEKLY).cena,
  dlgZavren: !document.getElementById('dlg'),
  zalohaUklizena: ULO_PREPOCET.zaloha === null,
}));
zkus('dialog se zavřel', poVraceni.dlgZavren);
zkus('vrácení ohlásí, že se vrátilo', poVraceni.odp === true, poVraceni.odp);
zkus('sazba v ceníku je zase původní', poVraceni.montaz === stav.montaz - 500,
  { je: poVraceni.montaz, cekano: stav.montaz - 500 });
zkus('a cena zakázky je zase původní', Math.abs(poVraceni.cena - stav.pred) < 0.01,
  { je: poVraceni.cena, cekano: stav.pred });
zkus('záloha se po použití uklidí (nedrží se celá zakázka v paměti)',
  poVraceni.zalohaUklizena);

/* ---------- 3) „Počítat s dnešním ceníkem" nechá přepočet být ---------- */

const stav2 = await priprava();
await p.evaluate(() => { window.__odp2 = uloPrepocetDialog({ prepocteno: 1, zmen: 3 }); });
await p.waitForTimeout(250);
await p.evaluate(() => {
  const b = [...document.querySelectorAll('#dlg .dlg-btns button')].find(x => /dnešním/i.test(x.textContent));
  b.click();
});
await p.waitForTimeout(250);
const poPonechani = await p.evaluate(async () => ({
  odp: await window.__odp2,
  montaz: aktivniVarianta(ZAK).data.cenik.montazHodKc,
  zalohaUklizena: ULO_PREPOCET.zaloha === null,
}));
zkus('ponechání nic nevrací', poPonechani.odp === false, poPonechani.odp);
zkus('sazba zůstala na novém ceníku', poPonechani.montaz === stav2.montaz,
  { je: poPonechani.montaz, cekano: stav2.montaz });
zkus('a záloha se zahodí i při ponechání', poPonechani.zalohaUklizena);

/* ---------- 4) Escape neznamená vrácení ----------
 *
 * Zavřít okno je útěk z dialogu, ne rozhodnutí. Kdyby Escape vracel ceny,
 * ztratil by obchodník přepočet, o kterém se ještě nerozhodl. */
const stav3 = await priprava();
await p.evaluate(() => { window.__odp3 = uloPrepocetDialog({ prepocteno: 1, zmen: 2 }); });
await p.waitForTimeout(250);
await p.keyboard.press('Escape');
await p.waitForTimeout(250);
const poEsc = await p.evaluate(async () => ({
  odp: await window.__odp3,
  montaz: aktivniVarianta(ZAK).data.cenik.montazHodKc,
}));
zkus('Escape nevrací ceny', poEsc.odp === false && poEsc.montaz === stav3.montaz,
  { odp: poEsc.odp, je: poEsc.montaz, cekano: stav3.montaz });

/* ---------- 5) bez změn se dialog neukáže ----------
 *
 * POJISTKA PROTI PRÁZDNÉMU TESTU: kontroly výš by vycházely i tehdy, kdyby
 * se dialog otevíral pokaždé. Tahle ukazuje, že na vstupu opravdu záleží. */
{
  await priprava();
  const bezZmen = await p.evaluate(async () => {
    const r = await uloPrepocetDialog({ prepocteno: 1, zmen: 0 });
    return { r, dlg: !!document.getElementById('dlg') };
  });
  zkus('při nule změněných cen se dialog neotevře', bezZmen.dlg === false && bezZmen.r === false,
    JSON.stringify(bezZmen));

  await priprava();
  const bezPrepoctu = await p.evaluate(async () => {
    const r = await uloPrepocetDialog({ prepocteno: 0, zmen: 5 });
    return { r, dlg: !!document.getElementById('dlg') };
  });
  zkus('a bez přepočítané varianty taky ne',
    bezPrepoctu.dlg === false && bezPrepoctu.r === false, JSON.stringify(bezPrepoctu));
}

/* ---------- 6) zakázka se mezi dotazem a odpovědí vyměnila ----------
 *
 * Dialog je asynchronní a `ULO_PREPOCET` je jeden sdílený objekt. Dvojklik
 * na řádek přehledu otevře zakázku dvakrát, dialogy se zařadí za sebe —
 * a druhý by po zálohu sáhl až ve chvíli, kdy ji první zahodil. Do opravy
 * z 21. 9. 2026 (nález nezávislé revize) „Vrátit" v takovém případě TIŠE
 * neudělalo nic a uživatel se to nedozvěděl.
 *
 * DVA RŮZNÉ DŮVODY, DVĚ RŮZNÉ VĚTY (upřesnění téhož dne). Odmítnout se musí
 * v obou, ale vysvětlit se musí pravdivě:
 *   a) uživatel přepnul na JINOU zakázku,
 *   b) uživatel si vzal krok ZPĚT — `historieObnov` dosadí do `ZAK` jiný
 *      objekt TÉŽE zakázky, takže se sem dostane taky. Tvrdit mu, že se
 *      otevřela jiná zakázka, je nepravda, a rada „otevřete tu původní"
 *      mu nepomůže.
 *
 * Původní znění téhle kontroly mělo v sobě právě tu chybu: vydávalo za
 * „cizí zakázku" re-import TÉŽE zakázky, takže případ (a) se neměřil vůbec. */
const vymenZakazku = async (upravCislo) => {
  const stav = await priprava();
  await p.evaluate(() => { window.__odp4 = uloPrepocetDialog({ prepocteno: 1, zmen: 4 }); });
  await p.waitForTimeout(250);
  await p.evaluate((nove) => {
    const kopie = JSON.parse(JSON.stringify(ZAK));
    if (nove) kopie.cislo = nove;
    ZAK = importZakazka(kopie);
  }, upravCislo || null);
  await p.evaluate(() => {
    const b = [...document.querySelectorAll('#dlg .dlg-btns button')].find(x => /Vrátit/i.test(x.textContent));
    b.click();
  });
  await p.waitForTimeout(250);
  const r = await p.evaluate(async () => ({
    odp: await window.__odp4,
    montaz: aktivniVarianta(ZAK).data.cenik.montazHodKc,
    lista: [...document.querySelectorAll('.nabidkaStav')].map(e => e.textContent).join(' '),
  }));
  return Object.assign(r, { cekanoMontaz: stav.montaz });
};

{
  /* a) opravdu JINÁ zakázka — jiné číslo */
  const cizi = await vymenZakazku('2026 - OPR - CN - 9999');
  zkus('jiná zakázka: vrácení se neprovede', cizi.odp === false, cizi.odp);
  zkus('a ceny zůstanou tak, jak byly po přepočtu',
    cizi.montaz === cizi.cekanoMontaz, { je: cizi.montaz, cekano: cizi.cekanoMontaz });
  zkus('a obrazovka řekne, že jde o jinou zakázku',
    /jiná zakázka/i.test(cizi.lista), cizi.lista.slice(0, 140));

  /* b) TÁŽ zakázka, jen se mezitím změnila (krok Zpět) */
  const tataz = await vymenZakazku(null);
  zkus('táž zakázka po změně: vrácení se taky neprovede', tataz.odp === false, tataz.odp);
  zkus('ale netvrdí se, že se otevřela jiná zakázka',
    !/jiná zakázka/i.test(tataz.lista), tataz.lista.slice(0, 140));
  zkus('a řekne se, co se opravdu stalo',
    /změnila/i.test(tataz.lista) && /Zpět/i.test(tataz.lista), tataz.lista.slice(0, 160));
}

/* 7) rozbitá záloha nesmí shodit otevřenou zakázku */
{
  await priprava();
  const rozbita = await p.evaluate(async () => {
    ULO_PREPOCET.zaloha = { neco: 'nesmysl' };     // importZakazka tohle odmítne
    ULO_PREPOCET.zakazka = ZAK;
    const slib = uloPrepocetDialog({ prepocteno: 1, zmen: 2 });
    await new Promise(r => setTimeout(r, 150));
    const b = [...document.querySelectorAll('#dlg .dlg-btns button')].find(x => /Vrátit/i.test(x.textContent));
    if (b) b.click();
    const odp = await slib;
    return { odp, maZak: !!ZAK && !!aktivniVarianta(ZAK),
             lista: [...document.querySelectorAll('.nabidkaStav')].map(e => e.textContent).join(' ') };
  });
  zkus('rozbitá záloha: vrácení se neprovede', rozbita.odp === false, rozbita.odp);
  zkus('a zakázka zůstane otevřená, ne rozbitá', rozbita.maZak === true);
  zkus('a řekne se, že se to nepovedlo',
    /nepodařilo vrátit/i.test(rozbita.lista), rozbita.lista.slice(0, 120));
}

/* 8) OBNOVA ZÁLOHY Z PROHLÍŽEČE se ptá stejně jako otevření ze složky
 *
 * Dávka v21.9.9 zavedla dialog u otevření ze složky a z online databáze,
 * ale `historieObnovZalohu` zůstala u pouhé věty v liště (nález nezávislé
 * revize 21. 9. 2026). Přitom je to TÁŽ situace — a spíš horší: záloha
 * mohla v prohlížeči ležet od minulého ceníku. Obchodník se nedozvěděl,
 * o kolik se cena hnula, a neměl jak přepočet vrátit.
 *
 * Měří se zapojení, ne přepočet sám: `uloSrovnejSPlatnymCenikem` se na dobu
 * kontroly podstrčí, aby vrátila výsledek „přepočítáno". Skutečný přepočet
 * má svoje sady v Node (test_cenik_dopad.js, test_cenik_stari.js). */
{
  await priprava();
  const obnova = await p.evaluate(async () => {
    const puvodni = window.uloSrovnejSPlatnymCenikem;
    let volanoSrovnani = 0;
    window.uloSrovnejSPlatnymCenikem = () => { volanoSrovnani++; return { prepocteno: 1, zmen: 4 }; };
    /* Záloha v úložišti, ze které se obnovuje. */
    Uloziste.zapis(HIST_KLIC, JSON.stringify({ kdy: new Date().toISOString(),
      cislo: 'ZK-1', nazevAkce: 'Zkouška', zakazka: JSON.stringify(ZAK) }));
    historieObnovZalohu();
    await new Promise(r => setTimeout(r, 250));
    const dlg = document.querySelector('#dlg');
    const text = dlg ? dlg.textContent.replace(/\s+/g, ' ') : '';
    const btn = [...document.querySelectorAll('#dlg .dlg-btns button')]
      .map(x => x.textContent.trim());
    /* Dialog se zavře, ať neblokuje zbytek průchodu. */
    const nech = [...document.querySelectorAll('#dlg .dlg-btns button')]
      .find(x => /dnešním ceníkem|Počítat/i.test(x.textContent));
    if (nech) nech.click();
    await new Promise(r => setTimeout(r, 150));
    window.uloSrovnejSPlatnymCenikem = puvodni;
    return { volanoSrovnani, otevren: !!dlg, text, btn };
  });
  zkus('obnova zálohy: přepočet se opravdu spustil', obnova.volanoSrovnani === 1,
    String(obnova.volanoSrovnani));
  zkus('obnova zálohy nabídne dialog o přepočtu', obnova.otevren === true);
  zkus('a dialog řekne, o kolik se cena hnula',
    /(zvedla|snížila) o|nemělo vliv/i.test(obnova.text), obnova.text.slice(0, 160));
  zkus('a nabídne vrácení původních cen',
    obnova.btn.some(x => /Vrátit/i.test(x)), JSON.stringify(obnova.btn));
}

/* 9) VRÁCENÍ CEN V OBNOVENÉ ZÁLOZE NEPROHLÁSÍ PRÁCI ZA ULOŽENOU (nález N37
 * revize v22.9.9).
 *
 * Větev „Vrátit původní ceny" nastavila otisky tak, jako by zakázka byla
 * zase ta ze serveru. U zálohy z prohlížeče to neplatí — ta na serveru NENÍ.
 * Autosave ji pak nepovažoval za změnu a varování při zavření okna mlčelo.
 * Zkouší se celá cesta: obnova zálohy → dialog → „Vrátit". Srovnání
 * s ceníkem se podstrčí (jako v oddílu 8), aby dialog měl co nabídnout. */
{
  await priprava();
  const r = await p.evaluate(async () => {
    const puvodni = window.uloSrovnejSPlatnymCenikem;
    window.uloSrovnejSPlatnymCenikem = () => {
      ULO_PREPOCET.zaloha = JSON.parse(JSON.stringify(ZAK));
      ULO_PREPOCET.zakazka = ZAK;
      return { prepocteno: 1, zmen: 2 };
    };
    Uloziste.zapis(HIST_KLIC, JSON.stringify({ kdy: new Date().toISOString(),
      cislo: 'ZK-2', nazevAkce: 'Záloha z prohlížeče', zakazka: JSON.stringify(ZAK) }));
    /* Na serveru leží JINÁ verze než ta v záloze. */
    const SERVER = '{"jina":"verze na serveru"}';
    HIST.ulozenoJako = SERVER;
    ONLINE_STAV.posledni = SERVER;
    historieObnovZalohu();
    await new Promise(res => setTimeout(res, 250));
    const vrat = [...document.querySelectorAll('#dlg .dlg-btns button')].find(x => /Vrátit/i.test(x.textContent));
    if (vrat) vrat.click();
    await new Promise(res => setTimeout(res, 300));
    window.uloSrovnejSPlatnymCenikem = puvodni;
    return { klik: !!vrat, posledniStejne: ONLINE_STAV.posledni === SERVER, neulozeno: historieNeulozeno() };
  });
  zkus('(dialog po obnově zálohy nabídl „Vrátit" a kliklo se)', r.klik === true, JSON.stringify(r));
  zkus('po vrácení cen v obnovené záloze zůstává zakázka neuložená (N37)', r.neulozeno === true, JSON.stringify(r));
  zkus('a autosave ji dál považuje za změnu (otisk se nepřepsal)', r.posledniStejne === true, JSON.stringify(r));
}

/* 10) PROTĚJŠEK: u zakázky ze SERVERU se po vrácení cen za uloženou prohlásit
 * MÁ — jinak by první klik uložil ceny, které uživatel právě odmítl (V35).
 * Bez tohohle by oprava N37 mohla vypnout i správnou cestu. */
{
  await priprava();
  await p.evaluate(() => {
    HIST.ulozenoJako = '{"jina":"verze"}';
    ONLINE_STAV.posledni = '{"jina":"verze"}';
    window.__odp10 = uloPrepocetDialog({ prepocteno: 1, zmen: 2 });
  });
  await p.waitForTimeout(250);
  await p.evaluate(() => {
    const b = [...document.querySelectorAll('#dlg .dlg-btns button')].find(x => /Vrátit/i.test(x.textContent));
    if (b) b.click();
  });
  await p.waitForTimeout(300);
  const r10 = await p.evaluate(async () => ({ odp: await window.__odp10, neulozeno: historieNeulozeno(),
    otisk: ONLINE_STAV.posledni === JSON.stringify(ZAK) }));
  zkus('u zakázky ze serveru se po vrácení cen zakázka za uloženou prohlásí',
    r10.odp === true && r10.neulozeno === false && r10.otisk === true, JSON.stringify(r10));
}

zkus('za celý průchod nevznikla chyba v konzoli', konzole.length === 0, konzole.slice(0, 2).join(' | '));

await b.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
