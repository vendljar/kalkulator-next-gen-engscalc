/* AZ-5 — limity a tvar: (a) neznámé klíče zakázky a neomezeně dlouhé texty se uloží (do stropu 4 MB),
 * (b) /api/vypocet nemá strop velikosti, kontrolu hloubky ani typu těla a vrací odpověď větší než vstup,
 * (c) počet variant není omezen. Vše jako přihlášený obchodník.
 * Lokálně, bez sítě:  node podklady/audit_2026-11-20/poc_AZ_5_limity.mjs */
import { nova, uloz, nacti, cO, kopie, post, vypocetFn, zakazky, ZC, verdikt } from './poc_AZ_zaklad.mjs';
let n = 0;
{ const z = nova('AZ-5a'); z.popisZameru = 'P'.repeat(1000000); z.varianty[0].nazev = 'V'.repeat(300000); z.neznamyKlic = { libovolna: 'data'.repeat(250000) }; z.varianty[0].cokoli = [1, 2, 3];
  const r = await uloz(z, cO); const g = r.ok ? await nacti(r.soubor, cO) : null;
  console.log('(a) 1 MB text + neznámé klíče → HTTP', r.status, g ? '| uloženo: popisZameru ' + g.popisZameru.length + ' zn., název varianty ' + g.varianty[0].nazev.length + ' zn., neznamyKlic ' + !!g.neznamyKlic + ', varianta.cokoli ' + !!g.varianty[0].cokoli : r.chyba);
  if (g && g.neznamyKlic) n++; }
{ const z = nova('AZ-5b'); const v0 = z.varianty[0]; for (let i = 0; i < 400; i++) { const k = kopie(v0); k.id = 'vx' + i; k.ridici = false; k.pripona = i + 1; z.varianty.push(k); }
  const telo = JSON.stringify({ zakazka: z, program: {} }); const t0 = Date.now();
  const r = await post(vypocetFn, 'http://x/api/vypocet', telo, cO); const out = await r.text();
  console.log('(b) /api/vypocet, 401 variant: vstup', Math.round(telo.length / 1024), 'kB → HTTP', r.status, ', odpověď', Math.round(out.length / 1024), 'kB za', Date.now() - t0, 'ms (strop odpovědi Netlify je 6 MB)');
  if (r.status === 200 && out.length > 6 * 1024 * 1024) n++;
  const t1 = Date.now(); const ru = await uloz(z, cO); console.log('(c) uložení 401 variant → HTTP', ru.status, 'za', Date.now() - t1, 'ms');
  const rr = await post(vypocetFn, 'http://x/api/vypocet', '[' + '['.repeat(5000) + ']'.repeat(5000) + ']', cO); console.log('(b) /api/vypocet hluboké pole → HTTP', rr.status, '(zachyceno obecným try/catch, bez hloubkaChyba)');
  const z2 = nova('AZ-5d'); const tz = JSON.stringify({ zakazka: z2 }).replace('"schema":', '"__proto__":{"zneuziti":1},"constructor":{"prototype":{"z2":1}},"schema":');
  const r4 = await post(zakazky, 'http://x/api/zakazky', tz, cO); const t4 = await r4.json(); const g4 = t4.ok ? await nacti(t4.soubor, cO) : null;
  console.log('(d) __proto__/constructor v těle → HTTP', r4.status, '| Object.prototype čistý:', ({}).zneuziti === undefined && ({}).z2 === undefined, '| klíče uloženy:', !!(g4 && (Object.prototype.hasOwnProperty.call(g4, '__proto__') || Object.prototype.hasOwnProperty.call(g4, 'constructor'))));
}
verdikt(n > 0, 'AZ-5: ' + n + '/2 — neznámé klíče a neomezené texty se ukládají; /api/vypocet vrátí odpověď nad 6 MB (prototypové klíče: ODOLNÉ).');
