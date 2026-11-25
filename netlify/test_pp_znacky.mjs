/* DÁVKA PP #781 — ZNAČKY NA SNÍMKU PŘIPOMÍNKY, SERVER (J. V. 25. 11. 2026)
 *
 * Hlídá /api/pripominky:
 *  1) POST se značkami a snímkem: značky se uloží SE SNÍMKEM (pripominky_snimky),
 *     ne do záznamu připomínky (ten jde do zálohy a ke koordinaci);
 *  2) server ověří tvar a velikost: jiný tvar, pole navíc, souřadnice mimo
 *     snímek, příliš malá značka, víc než 20, ne-seznam → 400 a nic se neuloží
 *     (ani číslo připomínky se nespotřebuje);
 *  3) značky bez snímku → 400; bez značek se snímek ukládá postaru;
 *  4) GET ?snimek: správce dostane obrázek i značky; obchodník 403; uložený
 *     poškozený záznam značek = žádné značky;
 *  5) autor ani koordinace značky nevidí; záloha bez snímků i bez značek (B257);
 *  6) limit velikosti těla (800 kB) beze změny.
 * Pojistka: na ebca8ebd server značky zahodí (uloží jen obrázek) a neplatné
 * přijme → sada FAIL — viz zpráva commitu. Účty smyšlené (@priklad.cz).
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
import pripominky, { PR_TELO_MAX } from './functions/pripominky.mjs';
import { ADMIN_EMAIL } from './lib/sdilene.mjs';
import { zalohaDoplnky } from './lib/zalohovani.mjs';

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
async function prihlas(email, heslo) {
  const r = await prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST', body: JSON.stringify({ email, heslo }) }));
  const t = await r.clone().json();
  if (!t.ok) throw new Error('Přihlášení selhalo pro ' + email + ': ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const HESLO = 'ZkusebniHeslo1';
const cAdmin = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
{
  const r = await uzivatele(new Request('http://x/api/uzivatele', { method: 'POST', headers: { cookie: cAdmin },
    body: JSON.stringify({ akce: 'zaloz', email: 'obchodnik.pp@priklad.cz', jmeno: 'Účet PP', role: 'Obchodník', heslo: HESLO, hesloSpravce: 'Docasne.Heslo.123' }) }));
  if (r.status !== 200) throw new Error('založení účtu ' + r.status);
}
const cObch = await prihlas('obchodnik.pp@priklad.cz', HESLO);
const zap = await post({ akce: 'nastaveni', nastaveni: { zapnuto: true, role: ['Obchodník', 'Administrátor'], limitDen: 50 } }, cAdmin);
if (zap.status !== 200) throw new Error('zapnutí ' + zap.status);

const SNIMEK = 'data:image/jpeg;base64,' + 'QUJD'.repeat(500);
const ZNACKY = [{ tvar: 'ramecek', x: 100, y: 200, w: 300, h: 150 }, { tvar: 'kruh', x: 600, y: 50, w: 120, h: 120 }];
const NOVA = { typ: 'chyba', text: 'Tlačítko Uložit je přes celou šířku a nejde kliknout.',
  kontext: { obrazovka: 'Kalkulace OCK', verze: 'PP' }, snimek: SNIMEK };
const snimekUlozeny = id => (pamet.has('pripominky_snimky/' + id) ? JSON.parse(pamet.get('pripominky_snimky/' + id)) : null);

/* 1) se značkami */
const p1 = await post(Object.assign({}, NOVA, { znacky: ZNACKY }), cObch);
test('se snímkem a 2 značkami: uloženo P-0001', p1.status === 200 && p1.id === 'P-0001', p1);
const s1 = snimekUlozeny('P-0001');
test('značky uložené SE SNÍMKEM (tvar i souřadnice beze změny)', s1 && s1.obrazek === SNIMEK && JSON.stringify(s1.znacky) === JSON.stringify(ZNACKY), s1);
const z1 = JSON.parse(pamet.get('pripominky/p/P-0001'));
test('záznam připomínky značky nenese (jde do zálohy a ke koordinaci)', !('znacky' in z1) && !JSON.stringify(z1).includes('ramecek') && z1.snimek === true, z1);
test('autor v odpovědi značky nevidí', !JSON.stringify(p1).includes('ramecek'));

/* 2) neplatné značky → 400, nic se neuloží */
const pred = pamet.size;
const zle = {
  'neznámý tvar': [{ tvar: 'sipka', x: 1, y: 1, w: 50, h: 50 }],
  'pole navíc (barva)': [{ tvar: 'ramecek', x: 1, y: 1, w: 50, h: 50, barva: '<script>' }],
  'souřadnice mimo snímek': [{ tvar: 'ramecek', x: 980, y: 1, w: 50, h: 50 }],
  'záporná souřadnice': [{ tvar: 'kruh', x: -5, y: 1, w: 50, h: 50 }],
  'desetinná souřadnice': [{ tvar: 'kruh', x: 5.5, y: 1, w: 50, h: 50 }],
  'číslo jako text': [{ tvar: 'kruh', x: '5', y: 1, w: 50, h: 50 }],
  'příliš malá značka': [{ tvar: 'ramecek', x: 1, y: 1, w: 2, h: 50 }],
  '21 značek': Array.from({ length: 21 }, () => ZNACKY[0]),
  'objekt místo seznamu': { tvar: 'ramecek', x: 1, y: 1, w: 50, h: 50 },
  'text místo seznamu': 'ramecek',
};
for (const [n, z] of Object.entries(zle)) {
  const r = await post(Object.assign({}, NOVA, { znacky: z }), cObch);
  test('odmítne ' + n + ' (400, česká hláška)', r.status === 400 && /^Značky na snímku: /.test(r.chyba), r);
}
test('po odmítnutích se nic neuložilo (ani číslo)', pamet.size === pred && !pamet.has('pripominky/p/P-0002'), [...pamet.keys()].filter(k => k.includes('P-0002')));

/* 3) bez snímku / bez značek */
const bez = await post(Object.assign({}, NOVA, { snimek: '', znacky: ZNACKY }), cObch);
test('značky bez snímku → 400', bez.status === 400 && /bez snímku/.test(bez.chyba), bez);
const p2 = await post(Object.assign({}, NOVA, { znacky: [] }), cObch);
test('prázdné značky: snímek postaru (jen obrázek)', p2.status === 200 && JSON.stringify(Object.keys(snimekUlozeny(p2.id))) === '["obrazek"]', snimekUlozeny(p2.id));
const p3 = await post(NOVA, cObch);
test('bez pole znacky: snímek postaru', p3.status === 200 && JSON.stringify(Object.keys(snimekUlozeny(p3.id))) === '["obrazek"]');
const p4 = await post(Object.assign({}, NOVA, { snimek: '', znacky: [] }), cObch);
test('bez snímku a s prázdnými značkami projde, snímek se neuloží', p4.status === 200 && !snimekUlozeny(p4.id));
const p5 = await post(Object.assign({}, NOVA, { znacky: Array.from({ length: 20 }, () => ZNACKY[1]) }), cObch);
test('přesně 20 značek projde', p5.status === 200 && snimekUlozeny(p5.id).znacky.length === 20, p5);

/* 4) čtení */
const g = await get(U + '?snimek=P-0001', cAdmin);
test('správce: snímek i značky', g.status === 200 && g.obrazek === SNIMEK && JSON.stringify(g.znacky) === JSON.stringify(ZNACKY), g);
const g2 = await get(U + '?snimek=' + p2.id, cAdmin);
test('správce: snímek bez značek = prázdný seznam', g2.status === 200 && Array.isArray(g2.znacky) && g2.znacky.length === 0, g2);
test('obchodník snímek ani značky nedostane (403)', (await get(U + '?snimek=P-0001', cObch)).status === 403);
pamet.set('pripominky_snimky/' + p3.id, JSON.stringify({ obrazek: SNIMEK, znacky: [{ tvar: '<img onerror=x>', x: 1, y: 1, w: 50, h: 50 }] }));
const g3 = await get(U + '?snimek=' + p3.id, cAdmin);
test('poškozené uložené značky = žádné (obrázek zůstane)', g3.status === 200 && g3.obrazek === SNIMEK && JSON.stringify(g3.znacky) === '[]', g3);
pamet.set('pripominky_snimky/' + p3.id, JSON.stringify({ obrazek: SNIMEK, znacky: 'x' }));
test('uložené značky jiného typu = žádné', JSON.stringify((await get(U + '?snimek=' + p3.id, cAdmin)).znacky) === '[]');

/* 5) autor, správce v seznamu, záloha */
const moje = await get(U + '?moje=1', cObch);
test('autor v Moje připomínky značky nevidí', moje.status === 200 && !JSON.stringify(moje).includes('ramecek') && !JSON.stringify(moje).includes('"znacky"'));
const sez = await get(U, cAdmin);
test('seznam správce bez snímků a značek (jen v ?snimek)', sez.status === 200 && !JSON.stringify(sez).includes('ramecek') && !JSON.stringify(sez).includes('base64'));
const zal = await zalohaDoplnky();
test('záloha: připomínky ano, snímky ani značky ne (B257)', zal && zal.pripominky && Object.keys(zal.pripominky).length > 0
  && !JSON.stringify(zal).includes('ramecek') && !JSON.stringify(zal).includes('QUJDQUJD'), Object.keys(zal || {}));

/* 6) limit těla beze změny */
const velke = await req('POST', U, JSON.stringify(Object.assign({}, NOVA, { snimek: 'data:image/jpeg;base64,' + 'A'.repeat(PR_TELO_MAX), znacky: ZNACKY })), cObch);
test('tělo nad 800 kB i se značkami → 413', velke.status === 413);

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
