/* DÁVKA O5 — NÁLEZY AUDITU K3 V PODMÍNKÁCH FIRMY (#367; 20. 10. 2026).
 *
 *  K3-N6  klíč `__proto__` / `constructor` v podmínkách shodil validaci
 *         výjimkou (`pravidla[pole] is not a function`, `…reading 'length'`)
 *         → HTTP 500 na /api/firma i pád obnovy části firma. Teď se hlásí
 *         jako neznámé pole/věta/blok/jazyk.
 *  K3-N7  procento jako text s čárkou („12,5") prošlo kontrolou, ale
 *         `map(Number)` z něj udělal NaN → volba „NaN % – po podpisu".
 *         Podmínky (podminkyEf, podminkyCiste) teď procenta zálohy a faktur
 *         převádějí přes podmCislo.
 *  K3-N9  konec řádku uvnitř položky textů nabídky PROJ (jen API/import)
 *         posunul ve Wordu činnosti proti termínům. Řádek s \n / \r je
 *         neplatný.
 *
 *  K3-N16 název firmy se dosazuje funkcí — „$&" v názvu se nerozvine.
 *
 * Před opravou selžou K3-N6 (výjimky), K3-N7 (NaN), K3-N9 (\n projde)
 * a K3-N16 (2 kontroly).
 * Spuštění: cd src && node test_o5_podminky.js */
const PD = require('./podminky.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 600) : JSON.stringify(info))); } };
const zkus = (fn) => { try { return { v: fn() }; } catch (e) { return { chyba: e.message || String(e) }; } };

/* ---- K3-N6 ---- */
{
  const pripady = {
    'ock.__proto__': '{"ock":{"__proto__":{"x":1}}}',
    'ock.constructor': '{"ock":{"constructor":"x"}}',
    'proj.__proto__': '{"proj":{"__proto__":1}}',
    'vety.__proto__': '{"vety":{"__proto__":{"cz":"x"}}}',
    'vety.constructor': '{"vety":{"constructor":{"cz":"x"}}}',
    'vety.zaloha.__proto__ (jazyk)': '{"vety":{"zaloha":{"__proto__":"x"}}}',
    'nabidkaProj.__proto__': '{"nabidkaProj":{"__proto__":{"cz":["x"]}}}',
    'nabidkaProj.constructor': '{"nabidkaProj":{"constructor":{"cz":["x"]}}}',
    'nabidkaProj.terminy.toString (jazyk)': '{"nabidkaProj":{"terminy":{"toString":["x"]}}}',
  };
  for (const [popis, json] of Object.entries(pripady)) {
    const p = JSON.parse(json);
    const r = zkus(() => PD.podminkyVady(p));
    test('K3-N6: ' + popis + ' — kontrola nehází a hlásí vadu', !r.chyba && Array.isArray(r.v) && r.v.length > 0, r);
    const c = zkus(() => JSON.stringify(PD.podminkyCiste(p)));
    test('K3-N6: ' + popis + ' — čistá kopie nehází a klíč nenese', !c.chyba && !/__proto__|constructor|toString/.test(c.v || ''), c);
    const e = zkus(() => PD.podminkyEf({ podminky: p }));
    test('K3-N6: ' + popis + ' — efektivní podmínky nehází', !e.chyba, e.chyba);
  }
  test('K3-N6: prototyp Object zůstal čistý', ({}).x === undefined);
}

/* ---- K3-N7 ---- */
{
  const p = { ock: { zalohyProc: [0, '12,5', 50], zalohaProc: '12,5', faktura2Proc: '77,5', konecnaProc: 10 } };
  test('K3-N7: podmínky s „12,5" projdou kontrolou celé (dřív součet NaN)', PD.podminkyVady(p).length === 0, PD.podminkyVady(p));
  const ef = PD.podminkyEf({ podminky: p });
  const volby = PD.podminkyZalohyVolby(ef);
  test('K3-N7: volby zálohy nenesou NaN', volby.every(v => !/NaN/.test(v)) && volby.some(v => /^12,5 % – /.test(v)), volby);
  test('K3-N7: výchozí záloha 12,5 zůstane (je mezi volbami)', ef.ock.zalohaProc === 12.5, ef.ock.zalohaProc);
  test('K3-N7: dílčí faktura č. 2 a součet počítají s 77,5', /^77,5 % – /.test(PD.podminkyFaktura2(ef)) && PD.podminkySoucetOck(ef).ok, PD.podminkySoucetOck(ef));
  const c = PD.podminkyCiste(p);
  test('K3-N7: čistá kopie ukládá procenta jako čísla',
    JSON.stringify(c.ock.zalohyProc) === '[0,12.5,50]' && c.ock.zalohaProc === 12.5 && c.ock.faktura2Proc === 77.5, c.ock);
  const dup = { ock: { zalohyProc: [0, '50', 50] } };
  test('K3-N7: „50" a 50 jsou tatáž volba (duplicitní volba = vada)', PD.podminkyVady(dup).length > 0, PD.podminkyVady(dup));
}

/* ---- K3-N9 ---- */
{
  const T = PD.PODMINKY_VYCHOZI.nabidkaProj.terminy.cz;
  const sNl = T.map((r, i) => (i === 0 ? [r[0] + '\nnavíc', r[1], r[2]] : r.slice()));
  test('K3-N9: termín PROJ s koncem řádku v činnosti je vada', PD.podminkyVady({ nabidkaProj: { terminy: { cz: sNl } } }).length > 0);
  const sCr = T.map((r, i) => (i === 0 ? [r[0], r[1] + '\r', r[2]] : r.slice()));
  test('K3-N9: termín PROJ s \\r v termínu je vada', PD.podminkyVady({ nabidkaProj: { terminy: { cz: sCr } } }).length > 0);
  test('K3-N9: „Cena nezahrnuje" s koncem řádku v položce je vada',
    PD.podminkyVady({ nabidkaProj: { cenaNezahrnuje: { cz: ['a\nb'] } } }).length > 0);
  const ef = PD.podminkyEf({ podminky: { nabidkaProj: { terminy: { cz: sNl } } } });
  test('K3-N9: neplatné termíny se nepoužijí (platí továrna)', JSON.stringify(ef.nabidkaProj.terminy.cz) === JSON.stringify(T));
  test('K3-N9: tovární termíny dál platné', PD.podminkyVady({ nabidkaProj: { terminy: { cz: T } } }).length === 0);
}

/* ---- K3-N16: název firmy jako náhradní řetězec ---- */
{
  const fm = require('./firma.js');
  const k = fm.firmaKapitola({ nazev: 'Zkušební $& $` s.r.o.', dolozky: 'Práva má {FIRMA}.' }, 'dolozky', 'cz');
  test('K3-N16: vzory $& a $` v názvu firmy se v kapitole nerozvinou', k.radky[0] === 'Práva má Zkušební $& $` s.r.o..', k.radky);
  const np = require('fs').readFileSync(__dirname + '/nabidka_proj.js', 'utf8');
  test('K3-N16: doložky PROJ dosazují název firmy funkcí (ne náhradním řetězcem)',
    /replace\(\/\\\{FIRMA\\\}\/g, \(\) => nazevFirmy/.test(np) && !/replace\(\/\\\{FIRMA\\\}\/g, nazevFirmy/.test(np));
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
