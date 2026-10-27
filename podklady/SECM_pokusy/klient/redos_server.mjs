/* SEC-M klient, bod 2 — ReDoS na serveru: kvadratické regexy, které běží
 * nad textem od obchodníka při UKLÁDÁNÍ zakázky (POST /api/zakazky).
 *   uloKlicSouboru (src/uloziste.js:63)  …replace(/[-.]+$/, '')  — číslo zakázky
 *   variantaCislo / zamekCisloZakladSedi (src/zamek.js:113, :123) /\s+$/ — číslo zakázky
 * Vstup: číslo zakázky = 'A' + pumpa × N + 'x' (zakázka pod stropem 4 MiB).
 * Měří se doba jednoho uložení (obchodník, úložiště v paměti, smyšlené účty).
 * Spuštění z kořene repa: node podklady/SECM_pokusy/klient/redos_server.mjs */
import { F, req, priprav, pripravData, zakazkaCislo, pamet } from '../../S1_pokusy/server/harness.mjs';
const U = await priprav();
await pripravData(U.admin.cookie);
const zmer = async (popis, cislo, projCislo) => {
  const z = zakazkaCislo(projCislo ? '' : cislo);
  if (projCislo) z.projHlavicka = Object.assign({}, z.projHlavicka || {}, { cislo: projCislo });
  const t0 = Date.now();
  const r = await req(F.zakazky, 'POST', '/api/zakazky', { zakazka: z }, U.obch.cookie);
  const ms = Date.now() - t0;
  let t = {}; try { t = await r.json(); } catch (e) {}
  const nove = [...pamet.keys()].filter(k => k.startsWith('zakazky/z/A'));
  const ulozeno = nove.length ? 'ano, klíč ' + (nove[0].length - 'zakazky/'.length) + ' znaků' : 'ne';
  console.log(`  ${popis.padEnd(34)} délka ${String(cislo.length).padStart(7)}  HTTP ${r.status}  ${String(ms).padStart(6)} ms  ${t.ok ? 'uloženo' : 'chyba: ' + String(t.chyba).slice(0, 80)}  v úložišti: ${ulozeno}`);
  if (nove.length) {   // jde záznam otevřít z adresy (klicZAdresyPlatny: nejvýš 200 znaků)?
    const g = await req(F.zakazky, 'GET', '/api/zakazky?soubor=' + encodeURIComponent(nove[0].slice('zakazky/z/'.length)), undefined, U.obch.cookie);
    console.log('      GET téhož záznamu: HTTP ' + g.status + '; v rejstříku: ' + (pamet.get('zakazky/_rejstrik') || '').includes(nove[0].slice('zakazky/z/'.length, 'zakazky/z/'.length + 40)));
  }
  for (const k of nove) pamet.delete(k);
  return { ms, status: r.status };
};
console.log('Kontrola (lineární vstup):');
const kontrola = await zmer('kontrola: A + 0 × 200 000', 'A' + '0'.repeat(200000));
let nejhorsi = 0;
for (const N of [20000, 50000, 100000, 200000]) {
  console.log(`N = ${N}`);
  nejhorsi = Math.max(nejhorsi, (await zmer("'-.' × N + 'x'  (uloKlicSouboru)", 'A' + '-.'.repeat(N / 2) + 'x')).ms);
  nejhorsi = Math.max(nejhorsi, (await zmer("' \\t' × N + 'x' (zamek \\s+$)", 'A' + ' \t'.repeat(N / 2) + 'x')).ms);
}
/* Číslo PROJ (projHlavicka.cislo) při prázdném čísle zakázky: CISLO_MAX se na něj nevztahuje. */
console.log('Číslo PROJ (projHlavicka.cislo), číslo zakázky prázdné:');
const proj = await zmer("proj: '-.' × 50 000 + 'x'", '', 'A' + '-.'.repeat(25000) + 'x');
const projDlouhe = await zmer('proj: A + 0 × 5 000 (lineární)', '', 'A' + '0'.repeat(5000));
const projDelka = projDlouhe.status === 200;
nejhorsi = Math.max(nejhorsi, proj.ms);
console.log(nejhorsi > 5 * Math.max(kontrola.ms, 200)
  ? `VÝSLEDEK: jedno uložení zakázky s číslem ~200 000 znaků drží serverovou funkci ${nejhorsi} ms (kontrola ${kontrola.ms} ms) — kvadratický regex nad vstupem obchodníka`
  : `VÝSLEDEK: bez měřitelného dopadu (nejhorší ${nejhorsi} ms, kontrola ${kontrola.ms} ms)`);
if (projDelka) console.log('VÝSLEDEK 2: číslo PROJ (projHlavicka.cislo) se délkou neomezuje — zakázka s prázdným číslem a číslem PROJ 5 001 znaků se uložila (CISLO_MAX hlídá jen zak.cislo)');
process.exit(0);
