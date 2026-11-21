/* AZ-8 (informativní, zhoršení známé meze B195) — od #667 projde i NULOVÁ ruční cena položky:
 * obchodník si ji potvrdí sám (stačí libovolný „zdroj") a nabídku odešle bez schválení.
 * BEZPECNOST_MEZE.md u B195 dosud tvrdí „cena musí být kladná (nula ani záporná neprojde)".
 * Lokálně, bez sítě:  node podklady/audit_2026-11-20/poc_AZ_8_rucni_cena_nula.mjs */
import { nova, uloz, nacti, cO, zamkni, G, cenaOck, verdikt } from './poc_AZ_zaklad.mjs';
const z0 = nova('AZ-8 ceník'); const c0 = cenaOck(z0.varianty[0]);
const z = nova('AZ-8 nuly'); const v = z.varianty[0]; v.data.rucniCeny = {}; let n = 0;
const projdi = (o, c) => { for (const k of Object.keys(o || {})) { const cc = c + '.' + k;
  if (typeof o[k] === 'number' && G.rucniCenaSmi(cc) && o[k] > 0) { o[k] = 0; n++;
    v.data.rucniCeny[cc] = { hodnota: 0, dodavatel: 'x', cislo: '', datum: '', platnostDo: '', zaklad: null, potvrdil: { lokalne: true } }; }
  else if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) && c.split('.').length < 2) projdi(o[k], cc); } };
projdi(v.data.cenik, 'C');
const c1 = cenaOck(v);
zamkni(z, v, 'nabidka');
const r = await uloz(z, cO);
const g = r.ok ? await nacti(r.soubor, cO) : null;
console.log('obchodník: ' + n + ' položek ceníku na 0 Kč se zdrojem „x" a vlastním potvrzením, tisk nabídky → HTTP', r.status, r.ok ? 'ULOŽENO, ověření ' + g.varianty[0].zamek.overeni.stav : r.chyba);
console.log('cena nabídky proti ceníkové: ' + Math.round(100 * c1 / c0) + ' % | cenová výjimka v datech:', g ? JSON.stringify(g.varianty[0].data.cenovaVyjimka || null) : '-', '| sleva:', g ? g.varianty[0].data.sleva.stav || '(žádná)' : '-');
verdikt(!!(r.ok && c1 < c0), 'AZ-8: odeslaná nabídka za ' + Math.round(100 * c1 / c0) + ' % ceníkové ceny bez schválení (záměr #561/#667 — B195; text meze o „kladné ceně" už neplatí).');
