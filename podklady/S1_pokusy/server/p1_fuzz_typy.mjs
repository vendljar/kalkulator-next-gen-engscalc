/* Fuzz typů polí těla: každý endpoint × akce × pole × divná hodnota.
 * Hlásí výjimky (funkce spadne = na Netlify 500) a odpovědi 5xx, a nakonec
 * zkontroluje, že se neznečistil Object.prototype. */
import { priprav, F, req, pamet } from './harness.mjs';
const U = await priprav();
const POLE = ['akce','email','heslo','stare','nove','role','aktivni','archiv','na','i_se_zakazkami','hesloSpravce','jmeno','titul','funkce','telefon','obrazek','zakazka','ocekavaneRazitko','prepsat','cenik','cenikProj','zahranicni','katalog','slevy','poznamka','build','rada','matice','udaje','texty','jazyky','klic','text','ocekavaneKdy','hesla','data','typ','nazev','verze','rezim','zdrojOtisk','sber','den','casy','zakaznik','faze','obnovaId','casti','zdroj','potvrzeni','nahled','kopie','duvod'];
const DIVNE = { obj: {}, pole: [], toString: { toString: 1 }, valueOf: { valueOf: 1, toString: 1 }, null: null, cislo: 7, zaporne: -1, bool: true, proto: JSON.parse('{"__proto__":{"znecisteno":1}}'), dlouhy: 'x'.repeat(5000) };
const ZAKLADY = [
  ['uzivatele', ['mojeheslo','profil','podpis','zaloz','heslo','role','aktivni','archiv','prevod','smaz', undefined]],
  ['sablony', ['rezim','zverejnit','vratit']], ['analytika', ['rezim','udalosti']], ['zaloha_vynuceno', ['kopie-disk','retence-potvrdit', undefined]],
  ['program', [undefined]], ['firma', [undefined]], ['zakazky', [undefined]], ['vypocet', [undefined]], ['zobrazeni', [undefined]],
  ['popisy', [undefined]], ['slovnik', [undefined]], ['controlling', [undefined]], ['zakaznici', [undefined]], ['prihlaseni', [undefined]], ['odhlaseni', [undefined]],
];
const OBNOVA_FAZE = ['konec','zrusit','zacatek', undefined];
const nalezy = new Map();
let volani = 0;
async function zkus(fnN, telo, cookie, kdo, popis) {
  volani++;
  try {
    const r = await req(F[fnN], 'POST', '/api/' + fnN, telo, cookie);
    if (r.status >= 500) { const t = await r.text(); const k = fnN + ' ' + popis + ' → ' + r.status + ' ' + t.slice(0, 160); if (!nalezy.has(k)) nalezy.set(k, kdo); }
  } catch (e) {
    const k = fnN + ' ' + popis + ' → VÝJIMKA ' + String(e && e.message).slice(0, 140);
    if (!nalezy.has(k)) nalezy.set(k, kdo);
  }
}
const lide = [['obch', U.obch.cookie], ['admin2', U.admin2.cookie]];
for (const [fnN, akce] of ZAKLADY.concat([['obnova', OBNOVA_FAZE]])) {
  for (const a of akce) {
    for (const [kdo, cookie] of lide) {
      for (const pole of POLE) for (const [vn, v] of Object.entries(DIVNE)) {
        const telo = fnN === 'obnova' ? { faze: a, rezim: 'doplnit', nahled: true } : (a ? { akce: a } : {});
        if (fnN === 'uzivatele' && a && a !== 'mojeheslo' && a !== 'profil' && a !== 'podpis') telo.email = 'pokus.obch2@example.com';
        telo[pole] = v;
        await zkus(fnN, telo, cookie, kdo, (a ? 'akce/faze=' + a + ' ' : '') + pole + '=' + vn);
      }
      for (const [vn, v] of Object.entries({ null: 'null', pole: '[]', cislo: '5', retez: '"x"', toString: '{"toString":1}' }))
        await zkus(fnN, v, cookie, kdo, 'celé tělo=' + vn);
    }
  }
}
console.log('volání:', volani);
console.log('Object.prototype znečištěn:', ({}).znecisteno !== undefined);
const sez = [...nalezy.entries()];
console.log('nálezů (unikátní):', sez.length);
for (const [k, kdo] of sez) console.log('[' + kdo + '] ' + k);
