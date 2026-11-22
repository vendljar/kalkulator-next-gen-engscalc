/* PoC čočky AD: stažená záloha (všechny tvary /api/zaloha) nenese otisky hesel;
 * noční funkce nemá vlastní kontrolu volajícího (spoléhá na platformu).
 * Spuštění: node podklady/audit_2026-11-20/poc_AD_zaloha_hesla.mjs */
import { pamet, post, get, cAdmin, cObchA } from './poc_AD_spolecne.mjs';
const zaloha = (await import('../../netlify/functions/zaloha.mjs')).default;
const nocniM = await import('../../netlify/functions/zaloha_nocni.mjs');
const hash = JSON.parse(pamet.get('uzivatele/' + [...pamet.keys()].find(k => k.startsWith('uzivatele/')).slice(10)));
const tajne = Object.entries(hash).filter(([k, v]) => /hesl|otisk|sul/i.test(k) && typeof v === 'string' && v.length > 20).map(([k, v]) => v);
console.log('polí s otiskem hesla v účtu: ' + tajne.length);
/* noční běh bez jakéhokoli požadavku / přihlášení */
const n = await (await nocniM.default()).json();
console.log('zaloha_nocni() bez argumentu a bez přihlášení → ok=' + n.ok + ', vrací klíče: ' + Object.keys(n).join(', '));
console.log('config noční funkce: ' + JSON.stringify(nocniM.config));
let unik = 0;
for (const u of ['', '?zdroj=nocni', '?strana=1', '?strana=1&zdroj=nocni']) {
  let po = '', stran = 0, nalez = false;
  do {
    const r = await get(zaloha, 'http://x/api/zaloha' + u + (po ? '&po=' + encodeURIComponent(po) : ''), cAdmin);
    const text = await r.text(); stran++;
    if (tajne.some(t => text.includes(t)) || /"heslo[A-Za-z]*":"[^"]{20,}/.test(text)) nalez = true;
    po = u.includes('strana') ? (JSON.parse(text).dalsi || '') : '';
  } while (po && stran < 50);
  console.log((nalez ? 'ZRANITELNÉ ' : 'ODOLNÉ     ') + 'GET /api/zaloha' + u + ' (' + stran + ' stran) — otisk hesla v odpovědi: ' + nalez);
  if (nalez) unik++;
}
const otiskVBlobs = [...pamet.entries()].filter(([k, v]) => k.startsWith('zalohy/') && tajne.some(t => v.includes(t))).length;
console.log('pozn.: noční otisk v úložišti `zalohy` otisky hesel nese (záznamů: ' + otiskVBlobs + ') — záměr, server neopouští');
console.log(unik ? 'VÝSLEDEK: ZRANITELNÉ' : 'VÝSLEDEK: ODOLNÉ (stažená záloha hesla nenese)');
