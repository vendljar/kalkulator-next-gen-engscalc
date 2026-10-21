/* Kontrola lišty „V prohlížeči je rozpracovaná kalkulace…" nad sestavením
 * dist/kalkulacka.html.
 *
 * PROČ TENHLE HARNESS VZNIKL (4. 8. 2026)
 * Uživatel hlásil: „odstraň nějakou historickou nabídku, která vždy při
 * spuštění vyžaduje potvrzení o rozpracovanosti nebo zahození". Šlo o zálohu
 * v úložišti prohlížeče (klíč kng_rozpracovano_v1), kterou nikdy nikdo nemazal:
 * jednou zapsaná se hlásila při každém dalším otevření aplikace, klidně půl
 * roku po tom, co byla zakázka hotová. Pravidla, kdy se ptát, teď rozhoduje
 * uloZalohaRozhodni() v uloziste.js (má vlastní jednotkové testy) – tady se
 * ověřuje to, co jednotkový test nedosáhne: že se model do obrazovky opravdu
 * propsal a že lišta v prohlížeči mlčí i vyskočí přesně tam, kde má.
 *
 * Záloha se do úložiště nasype před načtením stránky (addInitScript), takže
 * aplikace ji při startu najde stejně, jako by ji tam nechal minulý týden. */
import { chromium } from 'playwright';
import path from 'path';

const soubor = 'file://' + path.resolve('dist/kalkulacka.html');
const KLIC = 'kng_rozpracovano_v1';
const KLIC_ODLOZENO = 'kng_rozpracovano_odlozeno_v1';

let ok = 0, fail = 0;
const zkus = (popis, podminka) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis); }
};

const prohlizec = await chromium.launch();
const kontext = await prohlizec.newContext();

/* Připraví novou stránku s předem vloženou zálohou (nebo bez ní) a vrátí,
 * co je po startu vidět. `stariDni` říká, jak starou zálohu předstírat. */
async function spust({ zaloha = null, odlozeno = null } = {}) {
  const stranka = await kontext.newPage();
  const chyby = [];
  stranka.on('console', m => { if (m.type() === 'error') chyby.push(m.text()); });
  stranka.on('pageerror', e => chyby.push(String(e)));
  await stranka.addInitScript(([klic, klicOdlozeno, zal, odl]) => {
    try {
      localStorage.removeItem(klic);
      localStorage.removeItem(klicOdlozeno);
      if (zal) localStorage.setItem(klic, zal);
      if (odl) localStorage.setItem(klicOdlozeno, odl);
    } catch (e) { /* zakázané úložiště – pozná se níž */ }
  }, [KLIC, KLIC_ODLOZENO, zaloha ? JSON.stringify(zaloha) : null, odlozeno]);
  await stranka.goto(soubor);
  await stranka.waitForTimeout(400);
  const stav = await stranka.evaluate(([klic, klicOdlozeno]) => {
    const el = document.getElementById('obnovaLista');
    let zbylo = null, odl = null;
    try { zbylo = localStorage.getItem(klic); odl = localStorage.getItem(klicOdlozeno); } catch (e) {}
    return {
      vidno: !!el && el.classList.contains('zobraz'),
      text: el ? el.innerText : '',
      zbylo, odl,
      uloziste: (() => { try { localStorage.setItem('__t__', '1'); localStorage.removeItem('__t__'); return true; }
                         catch (e) { return false; } })(),
    };
  }, [KLIC, KLIC_ODLOZENO]);
  stav.chyby = chyby;
  stav.stranka = stranka;
  return stav;
}

const pred = (dni) => new Date(Date.now() - dni * 86400000).toISOString();
const zaloha = (uprav) => Object.assign({
  verze: 1,
  kdy: pred(0.2),
  cislo: '2026 - OPR - CN - 0777',
  nazevAkce: 'Výtah Nádraží',
  zakazka: JSON.stringify({ cislo: '2026 - OPR - CN - 0777', nazevAkce: 'Výtah Nádraží', varianty: [] }),
}, uprav || {});

console.log('\nLišta rozpracované kalkulace');

/* 0) Úložiště v tomhle prohlížeči vůbec funguje – jinak by všechny další
 *    kontroly „nic se nenabídlo" prošly z nesprávného důvodu. */
const zaklad = await spust();
zkus('úložiště prohlížeče je v testu k dispozici', zaklad.uloziste);
zkus('bez zálohy se lišta neukáže', !zaklad.vidno);
await zaklad.stranka.close();

/* 1) Čerstvá záloha s číslem – jediný případ, kdy se ptát MÁ. */
const cerstva = await spust({ zaloha: zaloha() });
zkus('čerstvá záloha obnovu nabídne', cerstva.vidno);
zkus('lišta pojmenuje, co se našlo', /0777|Nádraží/.test(cerstva.text));
zkus('čerstvá záloha zůstává v úložišti', !!cerstva.zbylo);
/* #404 (13. 10. 2026): jediná žlutá lišta „Rozpracovaná kalkulace" —
 * Pokračovat / Založit novou, Zahodit zálohu jako malý odkaz. */
zkus('lišta nabízí Pokračovat, Založit novou i (odkazem) Zahodit zálohu',
  /Rozpracovaná kalkulace/.test(cerstva.text) && /Pokračovat v rozpracované kalkulaci/.test(cerstva.text)
  && /Založit novou kalkulaci/.test(cerstva.text) && /Zahodit zálohu/.test(cerstva.text));
zkus('tlačítko „Teď ne" v liště NENÍ (odstraněno 19. 8. 2026)', !/Teď ne/.test(cerstva.text));
zkus('při startu se nic nesype do konzole', cerstva.chyby.length === 0);

/* 2) Záloha starší než týden – právě tahle uživatele otravovala. Nejen že se
 *    na ni aplikace neptá, ona ji rovnou uklidí, aby zabírala místo. */
const stara = await spust({ zaloha: zaloha({ kdy: pred(30) }) });
zkus('měsíc stará záloha se nenabízí', !stara.vidno);
zkus('měsíc stará záloha se z úložiště uklidí', !stara.zbylo);
await stara.stranka.close();

/* 3) Záloha bez čísla i bez názvu akce – prázdný začátek kalkulace, o který
 *    se nemá cenu ptát (uživatel jen otevřel aplikaci a zavřel ji). */
const prazdna = await spust({ zaloha: zaloha({ cislo: '', nazevAkce: '' }) });
zkus('záloha bez čísla i názvu se nenabízí', !prazdna.vidno);
zkus('záloha bez čísla i názvu se uklidí', !prazdna.zbylo);
await prazdna.stranka.close();

/* 4) Samotný název akce stačí – zakázka bez přiděleného čísla je běžná. */
const jenNazev = await spust({ zaloha: zaloha({ cislo: '' }) });
zkus('záloha jen s názvem akce se nabídne', jenNazev.vidno);
await jenNazev.stranka.close();

/* 5) Odložení – tlačítko „Teď ne" z lišty zmizelo (19. 8. 2026), samotný
 *    mechanismus odložení ale zůstává (volá se funkce přímo): značka nese
 *    razítko odložené zálohy, samotná záloha zůstává na místě. */
/* Stránky výše sdílejí totéž úložiště (jeden kontext) a mezitím ho měnily —
 * pod zátěží se pořadí zápisů rozjíždělo a test byl vrtkavý. Proto se sem
 * záloha před odložením vloží znovu, deterministicky. */
await cerstva.stranka.evaluate(([klic, zal]) => {
  localStorage.setItem(klic, zal);
  historieOdlozZalohu();
}, [KLIC, JSON.stringify(zaloha())]);
await cerstva.stranka.waitForTimeout(80);
const poOdlozeni = await cerstva.stranka.evaluate(([k, ko]) => ({
  skryto: !document.getElementById('obnovaLista').classList.contains('zobraz'),
  zbylo: localStorage.getItem(k),
  odl: localStorage.getItem(ko),
}), [KLIC, KLIC_ODLOZENO]);
zkus('„Teď ne" lištu schová', poOdlozeni.skryto);
zkus('„Teď ne" zálohu nemaže', !!poOdlozeni.zbylo);
zkus('„Teď ne" si zapamatuje razítko zálohy', !!poOdlozeni.odl);
await cerstva.stranka.close();

const znovu = await spust({ zaloha: zaloha({ kdy: poOdlozeni.odl }), odlozeno: poOdlozeni.odl });
zkus('odložená záloha se podruhé neptá', !znovu.vidno);
zkus('odložená záloha zůstává k dispozici', !!znovu.zbylo);
await znovu.stranka.close();

/* 6) …ale jakmile uživatel na něčem znovu dělá, vznikne novější záloha –
 *    a ta už je nová informace, ne opakovaná otázka. */
const novejsi = await spust({ zaloha: zaloha({ kdy: pred(0.1) }), odlozeno: poOdlozeni.odl });
zkus('novější záloha se ozve i po dřívějším odložení', novejsi.vidno);
await novejsi.stranka.close();

/* 7) Uložení zakázky (do souboru, do složky i do databáze) zálohu uklidí.
 *    Tohle je jádro nápravy: dokud se záloha nemazala, ptala se aplikace
 *    i na zakázky dávno hotové. */
const poUlozeni = await spust({ zaloha: zaloha() });
zkus('před uložením je záloha v úložišti', !!poUlozeni.zbylo);
const uklizeno = await poUlozeni.stranka.evaluate(([k, ko]) => {
  historieZalohaHotovo();
  return { zaloha: localStorage.getItem(k), odl: localStorage.getItem(ko),
           skryto: !document.getElementById('obnovaLista').classList.contains('zobraz') };
}, [KLIC, KLIC_ODLOZENO]);
zkus('po uložení záloha z úložiště zmizí', !uklizeno.zaloha);
zkus('po uložení zmizí i značka odložení', !uklizeno.odl);
zkus('po uložení je lišta schovaná', uklizeno.skryto);
await poUlozeni.stranka.close();

/* 8) Ukládací cesty tuhle úklidovou funkci opravdu volají – jinak by bod 7
 *    hlídal funkci, kterou nikdo nepoužívá. */
const volani = await spust();
const napojeno = await volani.stranka.evaluate(() => [
  typeof historieZalohaHotovo === 'function',
  typeof ulozZakazku === 'function' && /historieZalohaHotovo/.test(ulozZakazku.toString()),
  typeof onlineUloz === 'function' && /historieZalohaHotovo/.test(onlineUloz.toString()),
]);
zkus('úklidová funkce je v sestavení', napojeno[0]);
zkus('uložení do souboru zálohu uklízí', napojeno[1]);
zkus('uložení do databáze zálohu uklízí', napojeno[2]);
await volani.stranka.close();

/* 9) Autosave čerstvě založené PRÁZDNÉ zakázky nesmí přepsat zálohu
 *    s rozpracovanou prací (zadání 19. 8. 2026). Přesně to se dělo po
 *    obnovení stránky: přihlášení a načtení ceníku se dotkly prázdné
 *    zakázky, autosave zálohu přepsal a „Obnovit" pak obnovilo prázdno. */
const ochrana = await spust({ zaloha: zaloha() });
const poZapisu = await ochrana.stranka.evaluate(([k]) => {
  historieZalohaZapis();                       // ZAK je čerstvá prázdná zakázka
  let z = null; try { z = JSON.parse(localStorage.getItem(k)); } catch (e) {}
  const st = document.getElementById('autoStav');
  return { cislo: z && z.cislo, stav: st ? st.textContent : '' };
}, [KLIC]);
zkus('autosave prázdné zakázky zálohu s prací nepřepsal', poZapisu.cislo === '2026 - OPR - CN - 0777');
zkus('stav pod tlačítky vysvětlí, že záloha čeká na rozhodnutí', /čeká na rozhodnutí/.test(poZapisu.stav));
const poVyplneni = await ochrana.stranka.evaluate(([k]) => {
  ZAK.nazevAkce = 'Nová práce po startu';
  if (typeof historieTik === 'function') try { historieTik(); } catch (e) {}
  historieZalohaZapis();
  let z = null; try { z = JSON.parse(localStorage.getItem(k)); } catch (e) {}
  return { nazev: z && z.nazevAkce };
}, [KLIC]);
zkus('jakmile má zakázka název akce, autosave zase normálně píše',
  poVyplneni.nazev === 'Nová práce po startu');
await ochrana.stranka.close();

/* ===================== #404 — lišty rozpracované / odeslané zakázky =====================
 * Rozhodnutí J. V. 13. 10. 2026 („Ano, jak je navrženo"). Model je
 * listaZakazkyRozhodni (zamek.js, test_lista_zakazky.js); tady se ověřuje,
 * že se do obrazovky propsal a že tlačítka dělají, co říkají. */
console.log('\n#404 — lišty rozpracované a odeslané zakázky');
const ZAMCENA_JSON = JSON.stringify({ cislo: '2026 - OPR - CN - 0777', nazevAkce: 'Výtah Nádraží', aktivni: 'v1',
  varianty: [{ id: 'v1', zamek: { zamceno: true, kdy: '2026-10-01T10:00:00.000Z' } }] });

/* 10) záloha odeslané nabídky se vůbec nenabízí a tiše se uklidí (bod 2) */
const odeslanaZal = await spust({ zaloha: zaloha({ zakazka: ZAMCENA_JSON }) });
zkus('10: záloha odeslané nabídky se po startu nenabízí', !odeslanaZal.vidno);
zkus('10: a z úložiště se tiše uklidí', !odeslanaZal.zbylo);
await odeslanaZal.stranka.close();

/* Pomocník: otevře v prohlížeči zakázku „z databáze" (jen ke čtení) pod
 * daným uživatelem a vrátí, co je vidět. */
const listy = () => {
  const ob = document.getElementById('obnovaLista');
  const zl = document.getElementById('zamekLista');
  return {
    zluta: !!ob && ob.classList.contains('zobraz'), zlutaText: ob ? ob.innerText : '',
    zamekText: zl ? zl.innerText : '', zamekHtml: zl ? zl.innerHTML : '',
    modraStara: /Nabídka je otevřená jen ke čtení/.test(document.body.innerText),
    cteni: zamekCteniJe(),
  };
};
const p404 = await spust();
const otevri = async (opts) => p404.stranka.evaluate(([o, listySrc]) => {
  const listy = eval('(' + listySrc + ')');
  window.potvrd = () => Promise.resolve(true);
  window.hlaska = (t) => { window.__hlaska = String(t); return Promise.resolve(); };
  window.dotaz = () => Promise.resolve('test #404');
  ONLINE_STAV.ja = o.ja;
  NAST.jeAdmin = o.ja.role === 'Administrátor';
  ZAK = novaZakazka();
  ZAK.cislo = '2026 - OPR - CN - 0404'; ZAK.nazevAkce = 'Šachta #404';
  ZAK.autor = o.autor || o.ja.email; ZAK.autorJmeno = o.autorJmeno || '';
  ZAK.uloRazitko = new Date(Date.now() - 2 * 3600e3).toISOString();
  syncVarianta();
  if (o.zamknout) zamkniVariantu(aktivniVarianta(ZAK), { typ: 'nabidka', kdo: 'test', cislo: ZAK.cislo });
  HIST.nabidka = null;
  if (o.zaloha) {
    const kopie = JSON.parse(JSON.stringify(ZAK));
    if (o.zamknout) kopie.varianty.forEach(v => { delete v.zamek; });
    kopie.nazevAkce = o.zaloha;
    const zaznam = { verze: 1, kdy: new Date().toISOString(), cislo: kopie.cislo, nazevAkce: kopie.nazevAkce,
                     zakazka: JSON.stringify(kopie) };
    localStorage.setItem('kng_rozpracovano_v1', JSON.stringify(zaznam));
    HIST.nabidka = zaznam;
  } else localStorage.removeItem('kng_rozpracovano_v1');
  zamekCteniZapni();
  prepniTab('kalk'); render();
  return listy();
}, [opts, listy.toString()]);

const OBCH = { email: 'obchod@priklad.cz', jmeno: 'Obchodník', role: 'Obchodník' };
const ADMIN = { email: 'spravce@priklad.cz', jmeno: 'Správce', role: 'Administrátor' };

/* 11) bod 1: vlastní neodeslaná zakázka jen ke čtení */
const b1 = await otevri({ ja: OBCH });
zkus('11: neodeslaná zakázka jen ke čtení → žlutá lišta „Rozpracovaná kalkulace"',
  b1.zluta && /Rozpracovaná kalkulace/.test(b1.zlutaText) && /0404/.test(b1.zlutaText));
zkus('11: s Pokračovat a Založit novou kalkulaci',
  /Pokračovat v rozpracované kalkulaci/.test(b1.zlutaText) && /Založit novou kalkulaci/.test(b1.zlutaText));
zkus('11: bez zálohy se Zahodit zálohu nenabízí', !/Zahodit zálohu/.test(b1.zlutaText));
zkus('11: modrá lišta „jen ke čtení" odpadla', !b1.modraStara);
zkus('11: lišta odeslané nabídky prázdná', !b1.zamekText.trim());
const b1po = await p404.stranka.evaluate(([listySrc]) => {
  const listy = eval('(' + listySrc + ')');
  [...document.querySelectorAll('#obnovaLista button')].find(b => /Pokračovat/.test(b.textContent)).click();
  return listy();
}, [listy.toString()]);
zkus('11: Pokračovat odemkne režim jen ke čtení', b1po.cteni === false);
zkus('11: a žlutá lišta zmizí', !b1po.zluta);

/* 11a) bod 1: novější záloha téže zakázky — Pokračovat ji obnoví */
const b1a = await otevri({ ja: OBCH, zaloha: 'Šachta #404 — rozdělaná práce' });
zkus('11a: novější záloha téže zakázky: lišta nabízí Pokračovat a odkaz Zahodit zálohu',
  b1a.zluta && /Pokračovat v rozpracované kalkulaci/.test(b1a.zlutaText) && /Zahodit zálohu/.test(b1a.zlutaText));
const b1aZapis = await p404.stranka.evaluate(() => {
  historieZalohaZapis();             // autosave zálohy v režimu čtení
  return JSON.parse(localStorage.getItem('kng_rozpracovano_v1') || '{}').nazevAkce;
});
zkus('11a: zakázka jen ke čtení zálohu v prohlížeči nepřepíše', b1aZapis === 'Šachta #404 — rozdělaná práce');
const b1aPo = await p404.stranka.evaluate(([listySrc]) => {
  const listy = eval('(' + listySrc + ')');
  [...document.querySelectorAll('#obnovaLista button')].find(b => /Pokračovat/.test(b.textContent)).click();
  return Object.assign(listy(), { nazev: ZAK.nazevAkce });
}, [listy.toString()]);
zkus('11a: Pokračovat obnoví rozpracovanou práci ze zálohy', b1aPo.nazev === 'Šachta #404 — rozdělaná práce');
zkus('11a: a odemkne zakázku', b1aPo.cteni === false && !b1aPo.zluta);

/* 12) bod 4: cizí neodeslaná zakázka */
const b4 = await otevri({ ja: OBCH, autor: 'kolega@priklad.cz', autorJmeno: 'Kolega Zkušební' });
zkus('12: cizí zakázka → žlutá lišta se Založit novou kalkulaci',
  b4.zluta && /Založit novou kalkulaci/.test(b4.zlutaText));
zkus('12: bez Pokračovat', !/Pokračovat/.test(b4.zlutaText));
zkus('12: s větou, kdo ji založil', /Kolega Zkušební/.test(b4.zlutaText));
zkus('12: zakázka zůstává jen ke čtení', b4.cteni === true);

/* 13) body 2 a 3: odeslaná zakázka — obchodník */
const b2 = await otevri({ ja: OBCH, zamknout: true, zaloha: 'Starší rozpracovaná podoba' });
zkus('13: odeslaná zakázka → žádná žlutá lišta', !b2.zluta);
zkus('13: záloha odeslané zakázky se tiše zahodí',
  await p404.stranka.evaluate(() => localStorage.getItem('kng_rozpracovano_v1') === null && HIST.nabidka === null));
zkus('13: jednořádková informace „Odeslaná nabídka … — needituje se"',
  /Odeslaná nabídka/.test(b2.zamekText) && /needituje se/.test(b2.zamekText) && /vytištěno/.test(b2.zamekText));
zkus('13: s Klonovat a pokračovat a Založit novou zakázku',
  /Klonovat a pokračovat/.test(b2.zamekText) && /Založit novou zakázku/.test(b2.zamekText));
zkus('13: dlouhý text „Pokračujte klonem…" zmizel', !/Pokračujte klonem/.test(b2.zamekText));
zkus('13: obchodník modrý pruh Odemknout k úpravám nevidí', !/Odemknout/.test(b2.zamekText));
const b2klon = await p404.stranka.evaluate(([listySrc]) => {
  const listy = eval('(' + listySrc + ')');
  [...document.querySelectorAll('#zamekLista button')].find(b => /Klonovat/.test(b.textContent)).click();
  return Object.assign(listy(), { variant: ZAK.varianty.length, zamcena: variantaUzamcena(aktivniVarianta(ZAK)) });
}, [listy.toString()]);
zkus('13: Klonovat a pokračovat založí klon a odemkne okno (klon se uloží)',
  b2klon.variant === 2 && b2klon.zamcena === false && b2klon.cteni === false);

/* 14) bod 3: odeslaná zakázka — administrátor (právo zamek.odemknout) */
const b3 = await otevri({ ja: ADMIN, zamknout: true });
zkus('14: administrátor vidí modrý pruh Odemknout k úpravám',
  /Odemknout k úpravám/.test(b3.zamekText) && /zamek-cteni/.test(b3.zamekHtml));
zkus('14: žlutá lišta ani u administrátora není', !b3.zluta);
const b3po = await p404.stranka.evaluate(async ([listySrc]) => {
  const listy = eval('(' + listySrc + ')');
  [...document.querySelectorAll('#zamekLista button')].find(b => /Odemknout k úpravám/.test(b.textContent)).click();
  await new Promise(r => setTimeout(r, 50));
  const v = aktivniVarianta(ZAK);
  return Object.assign(listy(), { zamcena: variantaUzamcena(v), zaznam: (v.odemceni || []).length });
}, [listy.toString()]);
zkus('14: Odemknout k úpravám odemkne nabídku se záznamem', b3po.zamcena === false && b3po.zaznam === 1);
zkus('14: a odemkne i okno (záznam se uloží)', b3po.cteni === false);
zkus('#404: za celý průchod žádná chyba v konzoli', p404.chyby.length === 0);
if (p404.chyby.length) console.log(p404.chyby.slice(0, 3).join('\n'));
await p404.stranka.close();

await prohlizec.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
