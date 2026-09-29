/* Ověření v prohlížeči: zakázka s neznámým rozměrem profilu (#365, nález A2-1)
 * ============================================================================
 *
 * Nález 26. 9. 2026: rozměr profilu mimo katalog jeklů (`dim '999x999'`) nebo
 * tloušťka, kterou rozměr nemá, shodily vykreslení Kalkulace i Detailu OCK
 * (`JEKLY[p.dim].kg` v kalk_ock.js) — zakázka se nikomu neotevřela.
 *
 * Hlídá se:
 *   – aplikace se vykreslí (žádná chyba stránky ani červený pruh překreslení),
 *   – výběr rozměru ukáže navíc zvýrazněnou volbu „neznámý rozměr: 999x999"
 *     a u profilu štítek „mimo katalog",
 *   – kontroly před dokumentem hlásí ZÁBRANU se jménem profilu,
 *   – po výběru platného rozměru se dosadí platná tloušťka a vše zmizí.
 *
 * Spuštění: node overit_profil_neznamy.mjs
 */
import { chromium } from 'playwright';

const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + detail)); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
const chyby = [];
p.on('pageerror', e => chyby.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') chyby.push('error: ' + m.text()); });
await p.goto(KDE);
await p.waitForFunction(() => typeof NAST !== 'undefined' && typeof render === 'function', null, { timeout: 15000 });
await p.waitForTimeout(400);

console.log('\nneznámý rozměr sloupku (999x999)');
const stav = () => p.evaluate(() => {
  const selDim = [...document.querySelectorAll('select')].find(s => /set\('Z\.profily\.sloupek\.dim'/.test(s.getAttribute('onchange') || ''));
  const radek = selDim ? selDim.closest('.row') : null;
  const k = kontrolyProved(kontrolyCtxAkt());
  const n = (k.nalezy || []).find(x => x.kod === 'profilNeznamy');
  return {
    volba: selDim ? selDim.options[selDim.selectedIndex].textContent : null,
    volbaNeg: selDim ? selDim.options[selDim.selectedIndex].classList.contains('neg') : false,
    stitek: radek ? /mimo katalog/.test(radek.textContent) : false,
    pruh: /Překreslení skončilo chybou/.test(document.body.innerText),
    kalkulace: !!document.querySelector('#page-kalk table'),
    zabrana: !!(n && k.brani), text: n ? n.text : '',
    tl: Z.profily.sloupek.tl, dim: Z.profily.sloupek.dim,
    tlPlatna: !!(JEKLY[Z.profily.sloupek.dim] && JEKLY[Z.profily.sloupek.dim].kg[String(Z.profily.sloupek.tl)] != null),
  };
});
await p.evaluate(() => { prepniTab('kalk'); Z.profily.sloupek.dim = '999x999'; render(); });
let s = await stav();
zkus('aplikace se vykreslila bez chyby (žádný pruh „Překreslení skončilo chybou")', !s.pruh && chyby.length === 0, chyby.join(' | '));
zkus('Kalkulace OCK má tabulku (výpočet nepadl)', s.kalkulace);
zkus('výběr ukáže zvýrazněnou volbu „neznámý rozměr: 999x999"', s.volba === 'neznámý rozměr: 999x999' && s.volbaNeg, JSON.stringify(s));
zkus('u profilu je štítek „mimo katalog"', s.stitek);
zkus('kontrola před dokumentem hlásí zábranu se jménem profilu', s.zabrana && /sloupek: 999x999/.test(s.text), s.text);

console.log('\nvýběr platného rozměru');
await p.evaluate(() => {
  const selDim = [...document.querySelectorAll('select')].find(x => /set\('Z\.profily\.sloupek\.dim'/.test(x.getAttribute('onchange') || ''));
  selDim.value = '80x80';
  selDim.dispatchEvent(new Event('change'));
});
await p.waitForTimeout(200);
s = await stav();
zkus('po výběru platného rozměru se dosadila platná tloušťka', s.dim === '80x80' && s.tlPlatna, JSON.stringify([s.dim, s.tl]));
zkus('volba „neznámý rozměr" i štítek zmizely a zábrana taky', !/neznámý/.test(s.volba || '') && !s.stitek && !s.zabrana, JSON.stringify(s));

console.log('\nneznámá tloušťka (80x80 / 99 mm)');
await p.evaluate(() => { Z.profily.sloupek.dim = '80x80'; Z.profily.sloupek.tl = 99; render(); });
s = await stav();
const tlVolba = await p.evaluate(() => {
  const sel = [...document.querySelectorAll('select')].find(x => /set\('Z\.profily\.sloupek\.tl'/.test(x.getAttribute('onchange') || ''));
  return sel ? sel.options[sel.selectedIndex].textContent : null;
});
zkus('výběr tloušťky ukáže „neznámá: 99"', tlVolba === 'neznámá: 99', tlVolba);
zkus('zábrana jmenuje i tloušťku', s.zabrana && /80x80 \/ 99 mm/.test(s.text), s.text);
zkus('za celý průchod žádná chyba stránky', chyby.length === 0, chyby.slice(0, 3).join(' | '));

await b.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
