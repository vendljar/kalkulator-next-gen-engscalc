/* PŘIPOMÍNKY Z APLIKACE — SERVER (dávka PR, zadání J. V. 21. 11. 2026)
 *
 * Hlídá /api/pripominky:
 *  1) vypínač (výchozí vypnuto) a role, které smí odesílat;
 *  2) nová připomínka: autor z relace, stav nova, očista, snímek jen
 *     JPEG/PNG pod stropem, tělo nad strop 413, limit za den (429);
 *  3) čtení: autor jen svoje (bez kontextu), správce vše, snímek jen správce;
 *  4) PATCH: jen správce; odložení/zamítnutí bez zdůvodnění 400; autor
 *     smí jen označit své odpovědi jako přečtené;
 *  5) klíč koordinace: vydá jen správce s heslem, vrátí se jednou, uloží se
 *     jen SHA-256; čte jen ?pro=koordinace (bez autora, zakázky, snímku,
 *     nových), mění jen stav/odpověď/roadmapu puštěných; jinde neplatí;
 *     špatný klíč 401 → 429 a záznam; klíč v adrese 400; zrušený neplatí;
 *  6) XSS: text se uloží jako text (escapuje UI), skript neprojde do snímku.
 * Pojistka proti prázdnému testu: před dávkou funkce neexistovala (import
 * selže → sada padá); každé „odmítne" má vedle sebe „přijme".
 * Účty jsou smyšlené (@priklad.cz).
 */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
    .map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
import './pomoc_test_admin.mjs';
import prihlaseni from './functions/prihlaseni.mjs';
import uzivatele from './functions/uzivatele.mjs';
import zakazky from './functions/zakazky.mjs';
import pripominky, { PR_TELO_MAX, PR_KLIC_SPATNE_MAX } from './functions/pripominky.mjs';
import { ADMIN_EMAIL, aktivitaDobehni } from './lib/sdilene.mjs';

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };
const U = 'http://x/api/pripominky';
const req = (metoda, url, telo, cookie, hlav) => pripominky(new Request(url, { method: metoda,
  headers: Object.assign({}, cookie ? { cookie } : {}, hlav || {}),
  body: telo === undefined ? undefined : (typeof telo === 'string' ? telo : JSON.stringify(telo)) }));
const odp = async (r) => Object.assign({ status: r.status }, await r.json().catch(() => ({})));
const get = (url, c, h) => req('GET', url, undefined, c, h).then(odp);
const post = (telo, c, h) => req('POST', U, telo, c, h).then(odp);
const patch = (telo, c, h) => req('PATCH', U, telo, c, h).then(odp);
async function prihlas(email, heslo) {
  const r = await prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST', body: JSON.stringify({ email, heslo }) }));
  const t = await r.clone().json();
  if (!t.ok) throw new Error('Přihlášení selhalo pro ' + email + ': ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const HESLO = 'ZkusebniHeslo1';
const cAdmin = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
for (const [e, role] of [['obchodnik.pr@priklad.cz', 'Obchodník'], ['druhy.pr@priklad.cz', 'Obchodník'], ['vedouci.pr@priklad.cz', 'Vedoucí']]) {
  const r = await uzivatele(new Request('http://x/api/uzivatele', { method: 'POST', headers: { cookie: cAdmin },
    body: JSON.stringify({ akce: 'zaloz', email: e, jmeno: 'Účet PR', role, heslo: HESLO, hesloSpravce: 'Docasne.Heslo.123' }) }));
  if (r.status !== 200) throw new Error('založení ' + e + ' ' + r.status);
}
const cObch = await prihlas('obchodnik.pr@priklad.cz', HESLO);
const cDruhy = await prihlas('druhy.pr@priklad.cz', HESLO);
const cVed = await prihlas('vedouci.pr@priklad.cz', HESLO);

const NOVA = { typ: 'chyba', text: 'Po kliknutí na Uložit zakázku se nic nestalo.',
  kontext: { obrazovka: 'Kalkulace OCK', zalozka: 'kalk', verze: '21.11.1', zakazka: { cislo: '2026 - OPR - CN - 9', varianta: 'V1' },
    misto: { sekce: 'Šachta', popisek: 'Výška šachty', rect: { x: 1, y: 2, w: 3, h: 4, vw: 1280, vh: 800 } },
    pole: [{ popisek: 'Výška šachty', hodnota: '12 000' }] },
  snimek: 'data:image/jpeg;base64,' + 'QUJD'.repeat(500) };

/* 1) vypínač a role */
const n0 = await get(U + '?nastaveni=1', cObch);
test('výchozí: funkce vypnutá, obchodník neodesílá', n0.status === 200 && n0.zapnuto === false && n0.smiOdesilat === false, n0);
test('obchodník nevidí nastavení ani stav klíče', !('nastaveni' in n0) && !('klic' in n0) && !('zaznam' in n0), Object.keys(n0));
const v0 = await post(NOVA, cObch);
test('vypnutá funkce: odeslání 403 kod vypnuto', v0.status === 403 && v0.kod === 'vypnuto', v0);
test('nastavení mění jen správce (obchodník 403)', (await post({ akce: 'nastaveni', nastaveni: { zapnuto: true } }, cObch)).status === 403);
const z1 = await post({ akce: 'nastaveni', nastaveni: { zapnuto: true, role: ['Obchodník', 'Administrátor'], limitDen: 3, klicHash: 'podvrh' } }, cAdmin);
test('správce zapne funkci pro obchodníka a správce, limit 3', z1.status === 200 && z1.nastaveni.zapnuto && z1.nastaveni.limitDen === 3, z1);
test('nastavení nepřijme klicHash', !JSON.stringify([...pamet.entries()].filter(([k]) => k === 'pripominky/nastaveni')).includes('podvrh'));
const vVed = await post(NOVA, cVed);
test('vedoucí (role nepovolena) 403 kod role', vVed.status === 403 && vVed.kod === 'role', vVed);
test('nepřihlášený 401', (await post(NOVA)).status === 401);

/* 2) nová připomínka */
const p1 = await post(Object.assign({}, NOVA, { autor: 'cizi@priklad.cz', stav: 'hotovo', text: '<img src=x onerror=alert(1)> Uložení nefunguje.' }), cObch);
test('obchodník odešle, dostane P-0001', p1.status === 200 && p1.id === 'P-0001', p1);
const ul1 = JSON.parse(pamet.get('pripominky/p/P-0001'));
test('uloženo: autor z relace, stav nova, snímek stranou', ul1.autor === 'obchodnik.pr@priklad.cz' && ul1.stav === 'nova'
  && ul1.snimek === true && !('obrazek' in ul1) && pamet.has('pripominky_snimky/P-0001'), ul1);
test('text uložen jako text (escapuje až UI)', ul1.text.startsWith('<img src=x'), ul1.text);
const pSvg = await post(Object.assign({}, NOVA, { snimek: 'data:image/svg+xml;base64,PHN2Zz48c2NyaXB0Lz48L3N2Zz4=' }), cObch);
test('snímek SVG 400', pSvg.status === 400, pSvg);
const velke = await req('POST', U, JSON.stringify(Object.assign({}, NOVA, { snimek: 'data:image/jpeg;base64,' + 'A'.repeat(PR_TELO_MAX) })), cObch);
test('tělo nad strop 413', velke.status === 413, velke.status);
test('krátký text 400', (await post(Object.assign({}, NOVA, { text: 'nejde' }), cObch)).status === 400);
test('tělo pole 400', (await post([], cObch)).status === 400);
test('neznámá akce 400', (await post({ akce: 'smazat' }, cObch)).status === 400);
const p2 = await post(Object.assign({}, NOVA, { snimek: '' }), cObch);
test('druhá bez snímku P-0002', p2.status === 200 && p2.id === 'P-0002' && JSON.parse(pamet.get('pripominky/p/P-0002')).snimek === false, p2);
const p3 = await post(Object.assign({}, NOVA, { typ: 'dotaz', text: 'Jak přidám druhou šachtu do nabídky?' }), cObch);
test('třetí P-0003 (limit 3 ještě projde)', p3.status === 200 && p3.id === 'P-0003', p3);
const p4 = await post(NOVA, cObch);
test('čtvrtá týž den 429 kod limit', p4.status === 429 && p4.kod === 'limit', p4);
const pD = await post(Object.assign({}, NOVA, { text: 'Cena šachty nesedí s ceníkem.' , typ: 'cena' }), cAdmin);
test('limit je na uživatele (správce odešle P-0004)', pD.status === 200 && pD.id === 'P-0004', pD);
test('zamítnuté pokusy číslo nespotřebují (počítadlo 4)', JSON.parse(pamet.get('pripominky/citac')).n === 4);

/* 3) čtení */
const lo = await get(U, cObch);
test('autor vidí jen svoje (3)', lo.status === 200 && lo.pripominky.length === 3 && lo.pripominky.every(p => /P-000[123]/.test(p.id)), lo);
test('autor: bez kontextu, autora a příznaků', lo.pripominky.every(p => !('kontext' in p) && !('autor' in p) && !('prectenoSpravcem' in p)));
test('druhý obchodník nevidí nic', (await get(U, cDruhy)).pripominky.length === 0);
const la = await get(U, cAdmin);
test('správce vidí všechny 4 s kontextem, bez obrázku', la.pripominky.length === 4 && la.pripominky[0].kontext
  && !JSON.stringify(la).includes('QUJDQUJD'), la.pocty);
test('správce: 4 nepřečtené, počty Nové 4', la.neprectenych === 4 && la.pocty.nove === 4, la.pocty);
test('správce ?moje=1 vidí jen svou', (await get(U + '?moje=1', cAdmin)).pripominky.length === 1);
test('snímek: obchodník 403', (await get(U + '?snimek=P-0001', cObch)).status === 403);
const sn = await get(U + '?snimek=P-0001', cAdmin);
test('snímek: správce ho dostane', sn.status === 200 && sn.obrazek.startsWith('data:image/jpeg;base64,'), sn.status);
test('snímek: neplatné id 400, bez snímku 404', (await get(U + '?snimek=../x', cAdmin)).status === 400
  && (await get(U + '?snimek=P-0002', cAdmin)).status === 404);
const nA = await get(U + '?nastaveni=1', cAdmin);
test('správce: nastavení a stav klíče (nevydán)', nA.nastaveni && nA.klic && nA.klic.nastaven === false, nA);

/* 4) PATCH */
test('obchodník stav nezmění (403)', (await patch({ id: 'P-0001', akce: 'fronta' }, cObch)).status === 403);
test('odložit bez zdůvodnění 400', (await patch({ id: 'P-0002', akce: 'odlozit' }, cAdmin)).status === 400);
const odl = await patch({ id: 'P-0002', akce: 'odlozit', odpoved: 'Odloženo do ceníku v29.' }, cAdmin);
test('odložit se zdůvodněním 200', odl.status === 200 && odl.pripominka.stav === 'odlozeno', odl);
const fr = await patch({ id: 'P-0001', akce: 'fronta' }, cAdmin);
test('správce: do fronty oprav', fr.status === 200 && fr.pripominka.stav === 'fronta' && fr.pripominka.prectenoSpravcem, fr);
test('duplicitní s neexistující 400', (await patch({ id: 'P-0004', akce: 'duplicitni', duplicitniS: 'P-0099' }, cAdmin)).status === 400);
test('duplicitní s existující 200', (await patch({ id: 'P-0004', akce: 'duplicitni', duplicitniS: 'P-0001' }, cAdmin)).status === 200);
test('neznámá připomínka 404', (await patch({ id: 'P-0777', akce: 'fronta' }, cAdmin)).status === 404);
const lo2 = await get(U, cObch);
test('autor vidí odpověď a novinku', lo2.novychOdpovedi === 2 && lo2.pripominky.find(p => p.id === 'P-0002').odpoved === 'Odloženo do ceníku v29.', lo2);
const pr0 = await patch({ akce: 'precteno', ids: ['P-0001', 'P-0002', 'P-0004'] }, cDruhy);
test('cizí autor nic neoznačí', pr0.oznaceno === 0, pr0);
test('obchodník nesmí označit jako správce (403)', (await patch({ akce: 'precteno', ids: ['P-0001'], jako: 'spravce' }, cObch)).status === 403);
const pr1 = await patch({ akce: 'precteno', ids: ['P-0001', 'P-0002', 'P-0004'] }, cObch);
test('autor označí svoje 2 odpovědi jako přečtené', pr1.oznaceno === 2 && (await get(U, cObch)).novychOdpovedi === 0, pr1);
test('označení nezměnilo stav', JSON.parse(pamet.get('pripominky/p/P-0002')).stav === 'odlozeno');

/* 5) klíč koordinace */
const B = (k) => ({ authorization: 'Bearer ' + k });
const K = U + '?pro=koordinace';
test('bez vydaného klíče 401', (await get(K, undefined, B('kngpr_neco'))).status === 401);
test('klíč: obchodník 403', (await post({ akce: 'klic', hesloSpravce: HESLO }, cObch)).status === 403);
const k0 = await post({ akce: 'klic' }, cAdmin);
test('klíč: bez hesla správce 401 kod hesloSpravce', k0.status === 401 && k0.kod === 'hesloSpravce', k0);
const k1 = await post({ akce: 'klic', hesloSpravce: 'Docasne.Heslo.123' }, cAdmin);
test('klíč: správce s heslem dostane klíč', k1.status === 200 && /^kngpr_[A-Za-z0-9_-]{40,}$/.test(k1.klic), k1);
const KLIC = k1.klic;
const ulK = JSON.parse(pamet.get('program/pripominky_klic'));
test('server drží jen SHA-256, ne klíč', ulK.hash && /^[0-9a-f]{64}$/.test(ulK.hash) && !JSON.stringify([...pamet.values()]).includes(KLIC));
const nA2 = await get(U + '?nastaveni=1', cAdmin);
test('nastavení klíč znovu neukáže', nA2.klic.nastaven === true && !JSON.stringify(nA2).includes(KLIC), nA2.klic);
const kc = await get(K, undefined, B(KLIC));
test('koordinace čte: jen puštěné (bez nové P-0003)', kc.status === 200 && kc.pripominky.map(p => p.id).sort().join() === 'P-0001,P-0002,P-0004', kc);
test('koordinace: bez autora, zakázky, polí a snímku', !/obchodnik\.pr|2026 - OPR|12 000|QUJD|autor"/.test(JSON.stringify(kc)), JSON.stringify(kc).slice(0, 300));
test('koordinace: obrazovka a místo ano', kc.pripominky.find(p => p.id === 'P-0001').kontext.misto === 'Šachta › Výška šachty');
const kOd = await get(K + '&od=2999-01-01T00:00:00Z', undefined, B(KLIC));
test('koordinace ?od v budoucnu = nic', kOd.status === 200 && kOd.pripominky.length === 0);
test('koordinace ?od nesmysl 400', (await get(K + '&od=zitra', undefined, B(KLIC))).status === 400);
test('koordinace ?stav=fronta', (await get(K + '&stav=fronta', undefined, B(KLIC))).pripominky.map(p => p.id).join() === 'P-0001');
const kp = await patch({ id: 'P-0001', stav: 'resi', roadmapa: '#712' }, undefined, B(KLIC));
test('koordinace: Řeší se + #712', kp.status === 200 && kp.pripominka.stav === 'resi' && kp.pripominka.roadmapa === '#712', kp);
test('koordinace: na novou P-0003 nesáhne (403)', (await patch({ id: 'P-0003', stav: 'resi' }, undefined, B(KLIC))).status === 403);
test('koordinace: akce správce 403', (await patch({ id: 'P-0001', akce: 'duplicitni', duplicitniS: 'P-0002' }, undefined, B(KLIC))).status === 403);
test('koordinace: zamítnout bez zdůvodnění 400', (await patch({ id: 'P-0001', stav: 'zamitnuto' }, undefined, B(KLIC))).status === 400);
test('koordinace: POST nesmí (405)', (await post(NOVA, undefined, B(KLIC))).status === 405);
test('koordinace: GET bez ?pro 400', (await get(U, undefined, B(KLIC))).status === 400);
test('koordinace: klíč s cookie 400', (await get(K, cAdmin, B(KLIC))).status === 400);
test('klíč v adrese 400', (await get(K + '&klic=' + KLIC)).status === 400);
test('klíč neplatí jinde (zakázky 401)', (await zakazky(new Request('http://x/api/zakazky', { headers: B(KLIC) }))).status === 401);
test('cookie správce nestačí na čtení koordinace (400, klíč se neposílá s cookie)', (await get(K, cAdmin)).status === 400);
test('bez klíče i cookie 401', (await get(K)).status === 401);
/* špatný klíč: 401 … pak 429 a záznam */
let posledni = 0;
for (let i = 0; i < PR_KLIC_SPATNE_MAX + 1; i++) posledni = (await get(K, undefined, B('kngpr_spatny' + i))).status;
test('špatný klíč: po ' + PR_KLIC_SPATNE_MAX + ' pokusech 429', posledni === 429, posledni);
const zaz = JSON.parse(pamet.get('pripominky_limit/klic_zaznam'));
test('záznam o zneužití (bez klíče v textu)', zaz.udalosti.some(u => /nad limitem/.test(u.udalost)) && !JSON.stringify(zaz).includes('kngpr_spatny'), zaz.udalosti.slice(-2));
const nA3 = await get(U + '?nastaveni=1', cAdmin);
test('správce vidí záznam o klíči', Array.isArray(nA3.zaznam) && nA3.zaznam.length > 0);
/* zrušení */
const zr = await post({ akce: 'klicZrusit', hesloSpravce: 'Docasne.Heslo.123' }, cAdmin);
test('správce klíč zruší', zr.status === 200 && zr.zrusen);
const poZr = await get(K, undefined, Object.assign(B(KLIC), { 'x-nf-client-connection-ip': '10.9.9.9' }));
test('zrušený klíč neplatí (401)', poZr.status === 401, poZr);

/* 6) uchovávání vyřízených */
const sp = JSON.parse(pamet.get('pripominky/p/P-0004'));
sp.zmeneno = '2020-01-01T00:00:00Z'; pamet.set('pripominky/p/P-0004', JSON.stringify(sp));
const la2 = await get(U, cAdmin);
test('stará vyřízená (duplicitní) se při čtení správcem smaže', la2.smazano === 1 && !pamet.has('pripominky/p/P-0004'), la2.smazano);
test('odložená zůstává', pamet.has('pripominky/p/P-0002'));
test('metoda DELETE 405', (await req('DELETE', U, undefined, cAdmin)).status === 405);

await aktivitaDobehni();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
