/* K9 #526 R6 — pojistka velikosti: měří se stejně ve starém a novém formátu
 * a s kompresí i bez ní? (velikostB = nekomprimovaná data). */
import { pamet, nastaveni, over, nalez, konec } from './spolecne.mjs';
import { randomBytes } from 'node:crypto';
const Z = await import('../../netlify/lib/zalohovani.mjs');
const text = (n, z) => (z + ' Příliš žluťoučký kůň úpěl ďábelské ódy. ').repeat(Math.ceil(n / 40)).slice(0, n);
for (let i = 0; i < 300; i++) pamet.set('zakazky/z/Z' + String(i).padStart(4, '0'), JSON.stringify({ cislo: 'Z' + i, t: text(8000, 'Z' + i),
  ...(i % 20 === 0 ? { priloha: randomBytes(300000).toString('base64') } : {}) }));
for (let i = 0; i < 12; i++) pamet.set('uzivatele/u' + i + '@priklad.cz', JSON.stringify({ email: 'u' + i + '@priklad.cz', role: 'Obchodník', heslo: 'aa:bb' }));
pamet.set('sablony/data/cn/1', JSON.stringify({ data: randomBytes(200000).toString('base64') }));
pamet.set('program/db', JSON.stringify({ platny: { verze: 3, polozky: text(200000, 'C') } }));
const s = globalThis.__TEST_ULOZISTE('zalohy');
const a = await Z.porizOtisk('nocni-otisk', '', '2026-11-01');
nastaveni.binarni = false;
const b = await Z.porizOtisk('nocni-otisk', '', '2026-11-02');
nastaveni.binarni = true;
const ma = JSON.parse(pamet.get('zalohy/2026-11-01')), mb = JSON.parse(pamet.get('zalohy/2026-11-02'));
over('velikostB s gzip i bez gzip stejná (pojistka měří data, ne soubor)', ma.velikostB === mb.velikostB && ma.komprese === 'gzip' && !mb.komprese, { gzip: ma.velikostB, json: mb.velikostB });
/* starý jednolitý (do v26.10.7): velikostB = JSON celého otisku */
const cely = await Z.ctiOtisk(s, '2026-11-01');
const stara = Buffer.byteLength(JSON.stringify(cely));
const pomer = ma.velikostB / stara;
console.log('nový velikostB / starý (JSON celého otisku) = ' + pomer.toFixed(4));
over('první noc po přechodu (starý souhrn → nový manifest) nedá falešné varování ani nezakryje úbytek > 10 %', pomer > 0.97 && pomer < 1.03, pomer);
konec();
