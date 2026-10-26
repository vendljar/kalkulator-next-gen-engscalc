/* K9 #526 R1 — retence otisků v Blobs: simulace 15 měsíců provozu.
 * Každý den: noční otisk (s výpadky), občas vynucený a „před obnovou",
 * pak výběr retence (retenceVyber) a smazání. Hlídá:
 *  - nejnovější noční a „před obnovou" se nesmažou nikdy,
 *  - stabilitu: co se smazalo dnes, by zítra pravidlo nechtělo držet,
 *  - pokrytí: posledních 14 dní, 8 týdnů (neděle / nejnovější v týdnu), 6 měsíců,
 *  - přelomy roku, měsíců a týdnů, letní / zimní čas (klíče jsou UTC dny).
 * Čistá funkce, žádné úložiště. */
import { over, nalez, konec } from './spolecne.mjs';
const Z = await import('../../netlify/lib/zalohovani.mjs');
const RZ = (await import('module')).createRequire(import.meta.url)('../../src/retence_zaloh.js');

const DEN = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

const start = Date.parse('2026-08-15T00:00:00Z'), konecSim = Date.parse('2027-11-30T00:00:00Z');
let klice = new Set();
const smazanoKdy = new Map();
let porusNejnovejsi = [], porusPredObnovou = [], nestabilni = [], pokryti = [];
for (let t = start; t <= konecSim; t += DEN) {
  const dnes = iso(t);
  if (rnd() > 0.1) klice.add(dnes);                               // 10 % nocí výpadek
  if (rnd() < 0.3) klice.add(dnes + 'T' + String(Math.floor(rnd() * 24)).padStart(2, '0') + '1500-auto');
  if (rnd() < 0.02) klice.add(dnes + 'T120000-pred-obnovou');
  /* před 20. 10. 2026 staré klíče (N5 je držel) */
  const pole = [...klice];
  const nejnovejsiDenni = pole.filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort().pop();
  const vyber = Z.retenceVyber(pole, dnes);
  if (vyber.includes(nejnovejsiDenni)) porusNejnovejsi.push(dnes);
  if (vyber.some(k => /pred-obnovou/.test(k))) porusPredObnovou.push(dnes);
  /* stabilita: zítřejší výběr se smazanými klíči ještě přítomnými */
  const zitra = iso(t + DEN);
  const zitraVyber = new Set(Z.retenceVyber(pole.concat([zitra]), zitra));
  for (const k of vyber) if (!zitraVyber.has(k)) nestabilni.push(dnes + ': ' + k);
  for (const k of vyber) { klice.delete(k); smazanoKdy.set(k, dnes); }
  /* pokrytí po dnech v novém režimu (od 2027-01-01, kdy staré odezní) */
  if (dnes >= '2027-06-01') {
    const denni = [...klice].filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
    const tydnu = new Set(denni.filter(d => t - Date.parse(d) < 56 * DEN).map(d => {
      const x = Date.parse(d); return iso(x - ((new Date(x).getUTCDay() + 6) % 7) * DEN); }));
    /* aktuální měsíc + 5 předchozích kalendářních měsíců má každý svůj otisk */
    const chci = Array.from({ length: 5 }, (_, i) => iso(Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth() - 1 - i, 1)).slice(0, 7));
    const mesicu = chci.filter(m => denni.some(d => d.startsWith(m))).length;
    pokryti.push({ dnes, denni: denni.length, tydnu: tydnu.size, mesicu,
      vynucenych: [...klice].filter(k => /-(auto|rucne)$/.test(k)).length });
  }
}
over('nejnovější noční otisk se nesmazal ani jednou za 15 měsíců', !porusNejnovejsi.length, porusNejnovejsi.slice(0, 5));
over('otisk „před obnovou" se nesmazal ani jednou', !porusPredObnovou.length, porusPredObnovou.slice(0, 5));
over('výběr je stabilní (co se smaže dnes, zítra by pravidlo nedrželo)', !nestabilni.length, nestabilni.slice(0, 10));
const minT = Math.min(...pokryti.map(p => p.tydnu)), minM = Math.min(...pokryti.map(p => p.mesicu));
const maxD = Math.max(...pokryti.map(p => p.denni)), maxV = Math.max(...pokryti.map(p => p.vynucenych));
console.log('pokrytí (červen–listopad 2027): týdnů v posledních 56 dnech min ' + minT + ', měsíců min ' + minM
  + ', denních klíčů max ' + maxD + ', vynucených max ' + maxV);
over('vždy aspoň 7 týdnů s otiskem v posledních 56 dnech (8 týdnů pravidla, výpadky nocí)', minT >= 7, minT);
over('vždy otisk z každého z 5 předchozích kalendářních měsíců (+ aktuální denní)', minM >= 5, pokryti.filter(p => p.mesicu < 5).slice(0, 5));

/* Cílené přelomy */
const sada = (od, do_) => { const o = []; for (let t = Date.parse(od); t <= Date.parse(do_); t += DEN) o.push(iso(t)); return o; };
/* přelom roku: týden 28. 12. 2026 (po) – 3. 1. 2027 (ne) */
{
  const k = sada('2026-11-01', '2027-03-01');
  const k2 = k.filter(x => x <= '2027-02-25');
  const drz = new Set(k2.filter(x => !Z.retenceVyber(k2, '2027-02-25').includes(x)));
  over('přelom roku: týden po 28. 12. – ne 3. 1. drží neděli 3. 1. 2027 (ne 31. 12.)', drz.has('2027-01-03') && !drz.has('2026-12-31'), [...drz].filter(d => d < '2027-01-10'));
  over('měsíční 1. 1. 2027 a 1. 12. 2026 drženy', drz.has('2027-01-01') && drz.has('2026-12-01'));
}
/* letní → zimní čas (25. 10. 2026) a zimní → letní (28. 3. 2027): klíče jsou UTC dny, noční okno 2–3 UTC = 3–5 Praha téhož dne */
{
  const prahaDen = (utcIso) => new Date(utcIso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Prague' });
  const okna = ['2026-10-25T02:00:00Z', '2026-10-25T03:45:00Z', '2027-03-28T02:00:00Z', '2027-03-28T03:45:00Z', '2027-12-31T03:45:00Z'];
  over('noční okno 2:00–3:45 UTC je v Praze vždy týž den (i při změně času)', okna.every(u => prahaDen(u) === u.slice(0, 10)));
  /* vynucený otisk krátce po půlnoci pražského času dostane UTC datum předchozího dne */
  const k = Z.klicVynuceny('rucne', Date.parse('2026-10-26T23:30:00Z'));   // 0:30 Praha 27. 10.
  nalez('K9-I1', 'vynucený otisk po půlnoci pražského času nese v klíči předchozí (UTC) den — věk „7 dní" se počítá od UTC data',
    k.startsWith('2026-10-26'), k);
}
/* Staré otisky ze září: zůstane jen první v měsíci a nejnovější */
{
  const k = sada('2026-09-01', '2026-10-19');
  const vyber = Z.retenceVyber(k.concat(['2026-10-26']), '2026-10-26');
  const zustane = k.concat(['2026-10-26']).filter(x => !vyber.includes(x));
  over('staré otisky (do 19. 10.): zůstane 1. 9., 1. 10. a nový', JSON.stringify(zustane) === JSON.stringify(['2026-09-01', '2026-10-01', '2026-10-26']), zustane);
  const jenStare = Z.retenceVyber(k, '2026-10-26');
  over('jen staré otisky (nový noční chybí): nejnovější starý 19. 10. zůstane', !jenStare.includes('2026-10-19'));
}
/* Klíče mimo OTISK_KLIC výběr nevidí */
{
  const k = ['souhrn/2026-01-01', 'casti/2026-01-01/00000', 'rozpracovany/2026-01-01', 'kopie-disk', 'obnova-' + 'a'.repeat(32),
    'vynucene-rezervace/2026-01-01T010101-rucne~abcd', '2026-01-01-pred-obnovou', '2026-01-01T010101-pred-obnovou', '2026-01-01', '2026-10-26'];
  const v = Z.retenceVyber(k, '2026-10-26');
  over('souhrny, části, rozpracované, tokeny, rezervace a „před obnovou" výběr nevidí', JSON.stringify(v) === JSON.stringify(['2026-01-01']), v);
}
/* Datum v budoucnosti (posunuté hodiny) se nemaže; neplatné datum */
{
  const v = Z.retenceVyber(['2026-01-01', '2026-10-26', '2030-01-01', '2026-02-31'], '2026-10-26');
  over('budoucí klíč a neplatné datum (2026-02-31) se nemažou', !v.includes('2030-01-01') && !v.includes('2026-02-31'), v);
  over('neplatný „dnes" → nic', Z.retenceVyber(['2026-01-01', '2026-10-26'], 'x').length === 0);
}
konec();
