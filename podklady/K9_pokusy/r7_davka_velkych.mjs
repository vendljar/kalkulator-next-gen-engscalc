/* K9 #526 R7 — rozpočet kroku se hlídá po dávce 20 záznamů, ne po bajtech:
 * 20 po sobě jdoucích zakázek s přílohami u stropu (~3,9 MB) v jedné dávce.
 * Model Blobs 60 ms/operace + 100 ms/MB (pesimistický), limit synchronní funkce 10 s. */
import { pamet, nastaveni, nalez, konec } from './spolecne.mjs';
import { randomBytes } from 'node:crypto';
const Z = await import('../../netlify/lib/zalohovani.mjs');
for (let i = 0; i < 60; i++) pamet.set('zakazky/z/Z' + String(i).padStart(4, '0'),
  JSON.stringify({ cislo: 'Z' + i, ...(i >= 20 && i < 40 ? { priloha: randomBytes(Math.floor(3.9 * 1048576 * 0.75)).toString('base64') } : { t: 'x'.repeat(5000) }) }));
nastaveni.latenceMs = 60; nastaveni.msNaMB = 100;
const k = Z.klicVynuceny('rucne');
const kroky = []; let v;
do { const t = Date.now(); v = await Z.porizOtiskKrok(k, 'vynuceno', '', { rozpocetMs: Z.OTISK_ROZPOCET.synchronniMs }); kroky.push(Date.now() - t); } while (!v.hotovo);
nalez('K9-N6', 'krok vynuceného otisku s dávkou 20 velkých zakázek (~78 MB) přesáhne limit synchronní funkce 10 s — rozpočet se kontroluje až po dávce',
  Math.max(...kroky) > 10000, { krokyMs: kroky });
konec();
