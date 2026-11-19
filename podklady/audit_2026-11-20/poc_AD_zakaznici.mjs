/* PoC AD-1…AD-3: číselník zákazníků (/api/zakaznici) z pohledu obchodníka.
 * Spuštění: node podklady/audit_2026-11-20/poc_AD_zakaznici.mjs */
import { pamet, post, get, cObchA, cObchB, cAdmin } from './poc_AD_spolecne.mjs';
const { default: zak } = await import('../../netlify/functions/zakaznici.mjs');
const U = 'http://x/api/zakaznici';
const vysl = [];
const hlas = (id, zranitelne, text) => { vysl.push(zranitelne); console.log((zranitelne ? 'ZRANITELNÉ ' : 'ODOLNÉ     ') + id + ' — ' + text); };

/* Obchodník A založí kartu s bankovním spojením. */
let r = await (await post(zak, U, { zakaznik: { nazev: 'Zkušební odběratel s.r.o.', ico: '12345679', ucet: '111-A/0100', banka: 'Banka A', smluvniEmail: 'jednatel@priklad.cz' } }, cObchA)).json();
/* AD-1: obchodník B kartu přepíše (účet, e-mail) — bez stopy; autor zůstane A. */
r = await (await post(zak, U, { zakaznik: { nazev: 'Zkušební odběratel s.r.o.', ico: '12345679', ucet: '999-UTOCNIK/0100', banka: 'Banka B', smluvniEmail: 'utocnik@priklad.cz' } }, cObchB)).json();
const k = (await (await get(zak, U + '?klic=12345679', cObchA)).json()).zakaznik;
hlas('AD-1', k.ucet === '999-UTOCNIK/0100' && k.autor === 'obchodnik.a@priklad.cz',
  'cizí obchodník přepsal číslo účtu karty (ucet=' + k.ucet + ', autor dál ' + k.autor + ', upravil=' + k.upravil + '); historie verzí karty: '
  + ([...pamet.keys()].filter(x => x.startsWith('zakaznici/') && !x.startsWith('zakaznici/z/')).length || 'žádná'));

/* AD-2: objekt v textovém poli → 500 (neošetřená výjimka), ne 400. */
let stav;
try { stav = (await post(zak, U, { zakaznik: { nazev: { toString: 1 }, ico: '12345679' } }, cObchA)).status; }
catch (e) { stav = 'výjimka: ' + e.message; }
hlas('AD-2', stav !== 400, 'pole nazev = {"toString":1} → ' + stav + ' (čeká se 400)');

/* AD-3: bez stropu počtu karet a bez stropu pole `zalozen`. */
const pred = [...pamet.keys()].filter(x => x.startsWith('zakaznici/z/')).length;
for (let i = 0; i < 300; i++) await post(zak, U, { zakaznik: { nazev: 'Smyšlená firma ' + i } }, cObchB);
const po = [...pamet.keys()].filter(x => x.startsWith('zakaznici/z/')).length;
r = await (await post(zak, U, { zakaznik: { nazev: 'Velké pole', zalozen: 'x'.repeat(1000000) } }, cObchB)).json();
const velke = (await (await get(zak, U + '?klic=n-velke-pole', cObchB)).json()).zakaznik;
hlas('AD-3', po - pred === 300 && velke.zalozen.length === 1000000,
  'obchodník založil ' + (po - pred) + ' karet bez stropu; pole zalozen uloženo v délce ' + velke.zalozen.length + ' znaků (ostatní pole mají strop 300/2000)');
const t0 = Date.now(); const sez = await (await get(zak, U, cObchA)).json();
console.log('           seznam: ' + sez.zakaznici.length + ' karet, odpověď ' + JSON.stringify(sez).length + ' B (čte se kartu po kartě, bez stránkování)');

/* Kontrola: mazání smí jen správce. */
const d = await zak(new Request(U + '?klic=12345679', { method: 'DELETE', headers: { cookie: cObchB } }));
hlas('mazání', d.status !== 403, 'DELETE obchodníkem → ' + d.status);
/* Kontrola: klíč s lomítkem. */
const g = await get(zak, U + '?klic=' + encodeURIComponent('../uzivatele/x'), cObchB);
hlas('klíč', g.status !== 400, 'GET ?klic=../uzivatele/x → ' + g.status);
console.log(vysl.slice(0, 3).some(Boolean) ? '\nVÝSLEDEK: ZRANITELNÉ (viz řádky výš)' : '\nVÝSLEDEK: ODOLNÉ');
