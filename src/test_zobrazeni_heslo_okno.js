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
 * ============================================================ */
const fs = require('fs');
const vm = require('vm');
const zdroj = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
const zac = zdroj.indexOf('const ZOBRAZENI_HESLO_MS');
const kon = zdroj.indexOf('async function onlineZverejniZobrazeni');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : info); } };
test('úsek paměti hesla v online_ui.js nalezen', zac > 0 && kon > zac);

const ctx = { cas: 0, dotazu: 0, NAST: { zobrazeni: {} }, Promise };
ctx.Date = { now: () => ctx.cas };
ctx.dotazHeslo = () => { ctx.dotazu++; return Promise.resolve('heslo-zkusebni'); };
ctx.onlineApi = () => Promise.resolve({ ok: true });
vm.createContext(ctx);
vm.runInContext(zdroj.slice(zac, kon) + '\nthis.post = onlineZobrazeniPost; this.MS = ZOBRAZENI_HESLO_MS;', ctx);

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
  console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka', e && e.message); process.exit(1); });
