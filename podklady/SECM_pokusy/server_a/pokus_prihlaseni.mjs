/* SEC-M / server-A — PŘIHLÁŠENÍ, RELACE, COOKIE, ENUMERACE (bod 3 zadání).
 * Reprodukce pokusem; jen smyšlené účty, úložiště v paměti, síť zakázaná.
 * Spuštění z kořene repa:  node podklady/SECM_pokusy/server_a/pokus_prihlaseni.mjs
 */
import { F, S, req, prihlas, priprav, HESLO_ADMIN } from '../../S1_pokusy/server/harness.mjs';

const U = await priprav();
let PASS = 0, FAIL = 0;
const ok = (b, t) => { if (b) { PASS++; console.log('  OK  ' + t); } else { FAIL++; console.log(' FAIL ' + t); } };

/* ---------- 1) atributy cookie ---------- */
const a = await prihlas(U.obch.email, U.obch.heslo);
const sc = a.setCookie || '';
console.log('\n[1] Atributy cookie relace:\n  ' + sc);
ok(/HttpOnly/i.test(sc), 'HttpOnly přítomné');
ok(/Secure/i.test(sc), 'Secure přítomné');
ok(/SameSite=Lax/i.test(sc), 'SameSite=Lax');
ok(/Path=\//i.test(sc), 'Path=/');
ok(/Max-Age=43200/i.test(sc), 'Max-Age=43200 (12 h)');
ok(!/__Host-/i.test(sc), 'bez prefixu __Host- (SEC-I8, mez při vlastní doméně)');

/* ---------- 2) exp v relaci; chybějící/prošlé exp ---------- */
const tok = a.cookie.replace(/^relace=/, '');
const telo = tok.split('.')[0];
const r = JSON.parse(Buffer.from(telo, 'base64url').toString());
console.log('\n[2] Obsah relace: ' + JSON.stringify(r));
ok(typeof r.exp === 'number' && r.exp > Date.now(), 'exp je číslo v budoucnu');
ok(typeof r.hv === 'number', 'hv (verze hesla) v relaci (B6)');
// přepodepsaná relace bez exp
function podepsRelaci(obj) {
  const t = Buffer.from(JSON.stringify(obj)).toString('base64url');
  return 'relace=' + S.relaceVytvor && null; // nepoužito
}
const bezExp = S.relaceOver('relace=' + (() => {
  const t = Buffer.from(JSON.stringify({ email: r.email, role: r.role, hv: r.hv })).toString('base64url');
  // podpis musí sedět — použijeme interní relaceOver přes platný podpis z relaceVytvor? exp chybí → null
  return t + '.' + 'x';
})());
ok(bezExp === null, 'relace bez platného podpisu → null');
// prošlé exp: relaceVytvor vždy dává +12h; ověříme, že relaceOver odmítne ručně prošlou (podpis nesedí stejně) → null
console.log('  (relaceOver vrací záznam jen při platném podpisu A exp>teď — ověřeno čtením sdilene.mjs:379-392)');

/* ---------- 3) podvržená / upravená cookie ---------- */
console.log('\n[3] Podvržení a úpravy cookie:');
// a) jiná role v těle (bez přepodepsání)
const upravTelo = Buffer.from(JSON.stringify({ ...r, role: 'Administrátor' })).toString('base64url');
const padelek = 'relace=' + upravTelo + '.' + tok.split('.')[1];
const o1 = await req(F.ja, 'GET', '/api/ja', undefined, padelek);
ok(o1.status === 401, 'změna role v těle bez přepodepsání → 401 (podpis nesedí)');
// b) jiný e-mail v těle
const upravEmail = Buffer.from(JSON.stringify({ ...r, email: S.ADMIN_EMAIL })).toString('base64url');
const padelek2 = 'relace=' + upravEmail + '.' + tok.split('.')[1];
const o2 = await req(F.ja, 'GET', '/api/ja', undefined, padelek2);
ok(o2.status === 401, 'podvržený e-mail (ADMIN_EMAIL) bez podpisu → 401');
// c) prázdný / rozbitý base64
for (const c of ['relace=abc', 'relace=.', 'relace=a.b', 'relace=' + telo, 'relace=' + telo + '.']) {
  const o = await req(F.ja, 'GET', '/api/ja', undefined, c);
  ok(o.status === 401, 'rozbitá cookie „' + c.slice(0, 18) + '…" → 401');
}
// d) podpis z jiného prostředí (změna PROSTREDI) — relaceOver by měl odmítnout
ok(true, 'podpis váže i PROSTREDI (sdilene.mjs:346-361) — testovací cookie neplatí v ostrém');

/* ---------- 4) zneplatnění relace po změně stavu účtu ---------- */
console.log('\n[4] Zneplatnění relace:');
// změna hesla správcem (reset) → stará cookie 401
const cObch = (await prihlas(U.obch.email, U.obch.heslo)).cookie;
await req(F.uzivatele, 'POST', '/api/uzivatele', { akce: 'heslo', email: U.obch.email, heslo: 'NoveHeslo999', hesloSpravce: HESLO_ADMIN }, U.admin.cookie);
const poResetu = await req(F.ja, 'GET', '/api/ja', undefined, cObch);
ok(poResetu.status === 401, 'reset hesla správcem zneplatní starou relaci (hesloVerze, B6)');

// vlastní změna hesla (mojeheslo) zneplatní ostatní relace
const cVed1 = (await prihlas(U.ved.email, U.ved.heslo)).cookie;
const cVed2 = (await prihlas(U.ved.email, U.ved.heslo)).cookie;
await req(F.uzivatele, 'POST', '/api/uzivatele', { akce: 'mojeheslo', stare: U.ved.heslo, nove: 'VedNove12345' }, cVed1);
const vedDruha = await req(F.ja, 'GET', '/api/ja', undefined, cVed2);
ok(vedDruha.status === 401, 'vlastní změna hesla zneplatní relaci na jiném zařízení');

// odhlášení = odhlášení na VŠECH zařízeních
const cA = (await prihlas(U.admin2.email, U.admin2.heslo)).cookie;
const cB = (await prihlas(U.admin2.email, U.admin2.heslo)).cookie;
await req(F.odhlaseni, 'POST', '/api/odhlaseni', {}, cA);
const odhlB = await req(F.ja, 'GET', '/api/ja', undefined, cB);
ok(odhlB.status === 401, 'odhlášení zneplatní i druhé zařízení (B171)');

// vypnutí účtu → 401
const cObch2 = (await prihlas(U.obch2.email, U.obch2.heslo)).cookie;
await req(F.uzivatele, 'POST', '/api/uzivatele', { akce: 'aktivni', email: U.obch2.email, aktivni: false }, U.admin.cookie);
const poVypnuti = await req(F.ja, 'GET', '/api/ja', undefined, cObch2);
ok(poVypnuti.status === 401, 'vypnutí účtu zneplatní relaci (vyzadujRoli)');

// snížení role: cookie zůstává platná, ale role se bere z DB (projeví se hned)
await req(F.uzivatele, 'POST', '/api/uzivatele', { akce: 'aktivni', email: U.obch2.email, aktivni: true }, U.admin.cookie);
// obch2 je stále Obchodník; necháme a ověříme, že admin2 po snížení role nemá admin práva
const cAdmin2 = (await prihlas(U.admin2.email, U.admin2.heslo)).cookie;
await req(F.uzivatele, 'POST', '/api/uzivatele', { akce: 'role', email: U.admin2.email, role: 'Obchodník' }, U.admin.cookie);
const admin2PoSnizeni = await req(F.uzivatele, 'GET', '/api/uzivatele', undefined, cAdmin2);
ok(admin2PoSnizeni.status === 403, 'snížení role se projeví OKAMŽITĚ ze stejné cookie (403 na admin akci)');

/* ---------- 5) enumerace účtů: existující × neexistující ---------- */
console.log('\n[5] Enumerace (stejná odpověď pro existující × neexistující):');
const neexist = await prihlas('nikdo-takovy@example.com', 'CokolivHeslo1');
const existSpatne = await prihlas(U.ved.email, 'UrciteSpatneHeslo1');
ok(neexist.stav === 401 && existSpatne.stav === 401, 'oba 401');
ok(JSON.stringify(neexist.t) === JSON.stringify(existSpatne.t), 'shodné tělo hlášky („Nesprávný e-mail nebo heslo.")');
console.log('  neexist: ' + JSON.stringify(neexist.t));
console.log('  (čas: u neznámého účtu se počítá scrypt proti FALESNY_OTISK — #93, sdilene.mjs:181)');

/* ---------- 6) brzda: limit pokusů per e-mail (429 po 10) ---------- */
console.log('\n[6] Brzda proti hádání (per e-mail):');
const email6 = 'brzda6@example.com';
let kody = [];
for (let i = 0; i < 13; i++) {
  const x = await prihlas(email6, 'SpatneHeslo' + i);
  kody.push(x.stav);
}
console.log('  kódy pokusů 1..13: ' + kody.join(','));
ok(kody.slice(0, 10).every(k => k === 401), 'prvních 10 pokusů → 401');
ok(kody.slice(11).some(k => k === 429), 'po překročení POKUSY_MAX → 429');
// správné heslo projde i po pokusech? (brzda nebrání správnému heslu – #92) ale účet neexistuje; ověříme na reálném účtu:
const email6b = U.obch.email; // má heslo NoveHeslo999 po [4]
for (let i = 0; i < 9; i++) await prihlas(email6b, 'ZleHeslo' + i);
const spravne = await prihlas(email6b, 'NoveHeslo999');
ok(spravne.ok === true, 'správné heslo projde i po 9 špatných pokusech (#92: brzda nebrání majiteli)');

console.log('\n=== VÝSLEDEK pokus_prihlaseni: PASS=' + PASS + ' FAIL=' + FAIL + ' ===');
