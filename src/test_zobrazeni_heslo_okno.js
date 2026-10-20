/* ============================================================
 * B192 — okno paměti hesla správce se neprodlužuje (audit kola 28,
 * dávka H2, 19. 10. 2026, výchozí volba)
 *
 * Ověřené heslo správce (B168) leží v paměti stránky ZOBRAZENI_HESLO_MS.
 * Do v19.10.3 každé úspěšné uložení matice okno posunulo o dalších
 * 10 minut, takže při průběžném ukládání heslo v čitelné podobě v paměti
 * leželo libovolně dlouho. Nově se okno počítá od zadání hesla.
 * Soubory src/ui/ se v Node nenačítají celé — vyřízne se úsek od
 * ZOBRAZENI_HESLO_MS po konec onlineZobrazeniPost a spustí ve vm
 * s náhradou dotazHeslo, onlineApi a hodin.
 *
 * Pojistka: bez opravy (online_ui.js z v19.10.1) padají 3 ze 7 kontrol
 * (po 10 min od zadání se neptá znovu); po opravě 7 / 0.
 * K3-N8 (v20.10.1): bez opravy padají 3 nové kontroly (heslo po vypršení
 * v paměti, pomocník obnovy chybí); po opravě 13 / 0.
 * ============================================================ */
const fs = require('fs');
const vm = require('vm');
const zdroj = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
const zac = zdroj.indexOf('const ZOBRAZENI_HESLO_MS');
const kon = zdroj.indexOf('async function onlineZverejniZobrazeni');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : info); } };
test('úsek paměti hesla v online_ui.js nalezen', zac > 0 && kon > zac);

const ctx = { cas: 0, dotazu: 0, NAST: { zobrazeni: {} }, Promise, casovace: [] };
/* hodiny i časovače řídí test (K3-N8) */
ctx.setTimeout = (fn, ms) => { const t = { fn, kdy: ctx.cas + ms, zrusen: false }; ctx.casovace.push(t); return t; };
ctx.clearTimeout = (t) => { if (t) t.zrusen = true; };
const posunCas = (na) => { ctx.cas = na; ctx.casovace.filter(t => !t.zrusen && t.kdy <= na).forEach(t => { t.zrusen = true; t.fn(); }); };
ctx.Date = { now: () => ctx.cas };
ctx.dotazHeslo = () => { ctx.dotazu++; return Promise.resolve('heslo-zkusebni'); };
ctx.onlineApi = () => Promise.resolve({ ok: true });
vm.createContext(ctx);
vm.runInContext(zdroj.slice(zac, kon) + '\nthis.post = onlineZobrazeniPost; this.MS = ZOBRAZENI_HESLO_MS; this.H = ZOBRAZENI_HESLO;'
  + ' this.heslo = onlineZobrazeniHeslo; this.poObnove = typeof onlineZobrazeniHesloPoObnove === "function" ? onlineZobrazeniHesloPoObnove : null;', ctx);

(async () => {
  const MIN = 60 * 1000;
  await ctx.post();
  test('první uložení se zeptá na heslo', ctx.dotazu === 1, ctx.dotazu);
  ctx.cas = 5 * MIN; await ctx.post();
  test('uložení po 5 min se neptá (okno 10 min od zadání)', ctx.dotazu === 1, ctx.dotazu);
  ctx.cas = 9 * MIN; await ctx.post();
  test('uložení po 9 min se neptá', ctx.dotazu === 1, ctx.dotazu);
  ctx.cas = ctx.MS + 1; await ctx.post();
  test('B192: po 10 min od ZADÁNÍ se ptá znovu, i když se mezitím ukládalo (okno se neprodlužuje)', ctx.dotazu === 2, ctx.dotazu);
  ctx.cas = ctx.MS + 1 + 9 * MIN; await ctx.post();
  test('nové okno běží od nového zadání (po 9 min se neptá)', ctx.dotazu === 2, ctx.dotazu);
  ctx.cas = 2 * ctx.MS + 2; await ctx.post();
  test('a po dalších 10 min od zadání se ptá znovu', ctx.dotazu === 3, ctx.dotazu);

  /* K3-N8 (audit K3, dávka O5 20. 10. 2026): po vypršení okna se heslo
   * z paměti MAŽE (dřív leželo čitelné do odhlášení, jen se nepoužilo)
   * a obnova s heslem z paměti okno neprodlužuje. */
  const zadano = ctx.cas;
  posunCas(zadano + ctx.MS + 2000);
  test('K3-N8: po vypršení okna heslo v paměti není (bez dalšího ukládání)', ctx.H.h === '' && !ctx.H.plati, ctx.H);
  ctx.H.h = 'heslo-zkusebni'; ctx.H.plati = ctx.cas - 1;           // stav po vypršení bez časovače
  ctx.dotazHeslo = () => { ctx.dotazu++; return Promise.resolve(''); };
  await ctx.heslo();
  test('K3-N8: dotaz po vypršení vypršelé heslo zahodí, i když nové nezadáno', ctx.H.h === '', ctx.H);
  ctx.dotazHeslo = () => { ctx.dotazu++; return Promise.resolve('heslo-zkusebni'); };
  test('K3-N8: obnova má pomocníka pro uložení hesla (onlineZobrazeniHesloPoObnove)', !!ctx.poObnove);
  if (ctx.poObnove) {
    posunCas(ctx.cas + 1);
    await ctx.post();                                              // čerstvé zadání → okno od teď
    const plati = ctx.H.plati;
    posunCas(ctx.cas + 5 * MIN);
    ctx.poObnove('heslo-zkusebni', true);                          // heslo přišlo z paměti
    test('K3-N8: obnova s heslem z paměti okno neprodlouží', ctx.H.plati === plati, { plati, ted: ctx.H.plati });
    ctx.poObnove('heslo-nove', false);                             // čerstvě zadané u obnovy
    test('K3-N8: obnova s čerstvě zadaným heslem okno nastaví od zadání', ctx.H.plati === ctx.cas + ctx.MS && ctx.H.h === 'heslo-nove');
    posunCas(ctx.cas + ctx.MS + 2000);
    test('K3-N8: i heslo z obnovy po vypršení zmizí', ctx.H.h === '', ctx.H);
  }
  console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka', e && e.message); process.exit(1); });
