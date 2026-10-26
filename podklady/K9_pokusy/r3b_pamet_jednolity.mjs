/* K9 #526 R3b — paměť při čtení starého JEDNOLITÉHO otisku (~114 MB) v čerstvém
 * procesu: tělo odpovědi Blobs (Buffer) → text → JSON.parse, jako s.get(k, {type:'json'}).
 * Limit paměti funkce Netlify je 1024 MB. Spuštění: node --expose-gc podklady/K9_pokusy/r3b_pamet_jednolity.mjs [MB] */
import { randomBytes } from 'node:crypto';
const MBcil = +(process.argv[2] || 114);
const MB = (b) => (b / 1048576).toFixed(0) + ' MB';
/* tvar otisku: 792 zakázek, přílohy base64 (náhodné) + text */
const o = { porizena: '2026-10-15T02:00:00.000Z', zdroj: 'nocni-otisk', zakazky: {}, uzivatele: [] };
const text = (n, z) => (z + ' Příliš žluťoučký kůň úpěl ďábelské ódy. ').repeat(Math.ceil(n / 40)).slice(0, n);
let vel = 0;
for (let i = 0; i < 792; i++) {
  const z = { cislo: 'CN ' + i, nazev: text(10000, 'Z' + i), varianty: Array.from({ length: 3 }, (_, j) => ({ j, polozky: Array.from({ length: 30 }, (_, k) => ({ k, c: k * 1.5, n: 'pol ' + k })) })) };
  if (vel < (MBcil - 12) * 1048576 && i % 17 === 3) { z.priloha = randomBytes(Math.floor(1.6 * 1048576)).toString('base64'); vel += z.priloha.length; }
  o.zakazky['z' + i] = z;
}
const buf = Buffer.from(JSON.stringify(o));
const zaloha = null;
global.gc(); const zaklad = process.memoryUsage().rss;
let spicka = zaklad; const t = setInterval(() => { spicka = Math.max(spicka, process.memoryUsage().rss); }, 5);
const t0 = Date.now();
const txt = buf.toString('utf8');
const obj = JSON.parse(txt);
spicka = Math.max(spicka, process.memoryUsage().rss);
await new Promise(r => setTimeout(r, 50));
clearInterval(t);
console.log('jednolitý otisk ' + MB(buf.length) + ': text + JSON.parse ' + (Date.now() - t0) + ' ms, RSS základ ' + MB(zaklad)
  + ' (Buffer už v něm), špička ' + MB(spicka) + ', nárůst ' + MB(spicka - zaklad) + '; zakázek ' + Object.keys(obj.zakazky).length);
console.log('odhad funkce: Buffer ' + MB(buf.length) + ' + nárůst ' + MB(spicka - zaklad) + ' + běh Node ~60 MB = '
  + MB(buf.length + spicka - zaklad + 60 * 1048576) + ' z limitu 1024 MB');
