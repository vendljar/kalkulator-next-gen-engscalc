/* ============================================================
 * PŘIPOMÍNKY Z APLIKACE — LOGIKA (dávka PR, 21. 11. 2026)
 *
 * Hlídá jádro src/pripominky.js, které používá prohlížeč i server:
 *  1) odeslat jde jen s typem a aspoň krátkou větou;
 *  2) očista: neznámá pole pryč, ořez, řídicí znaky, kontext bez přebytku;
 *  3) snímek jen JPEG/PNG v base64 a pod stropem (žádné SVG, žádný odkaz);
 *  4) odložení a zamítnutí jen se zdůvodněním (rozhodnutí J. V.);
 *  5) koordinace nesmí sáhnout na novou (nepuštěnou) připomínku a smí jen
 *     stav / odpověď / roadmapu;
 *  6) autor ani koordinace nedostanou kontext, snímek ani cizí údaje;
 *  7) průběh o 4 krocích, filtry, počty, uchovávání vyřízených.
 * Pojistka proti prázdnému testu: před dávkou PR modul neexistoval
 * (require selže → sada padá); každá kontrola „odmítne" má vedle sebe
 * kontrolu „přijme" se stejnými daty.
 * ============================================================ */
const P = require('./pripominky.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const REL = { email: 'Obchodnik.PR@priklad.cz', jmeno: 'Obchodník <PR>' };
const TED = '2026-11-21T10:00:00.000Z';

/* 1) odeslat */
test('bez typu odeslat nejde', !P.pripominkaLzeOdeslat('', 'Nefunguje uložení zakázky.'));
test('s typem a krátkou větou jde', P.pripominkaLzeOdeslat('chyba', 'Nefunguje uložení zakázky.'));
test('příliš krátký text nejde', !P.pripominkaLzeOdeslat('chyba', 'nejde'));
test('neznámý typ nejde', !P.pripominkaLzeOdeslat('xss', 'Nefunguje uložení zakázky.'));
test('čtyři typy v pořadí chyba, cena, návrh, dotaz',
  P.PRIPOMINKA_TYPY.map(t => t.id).join() === 'chyba,cena,navrh,dotaz');
test('každý typ má vlastní placeholder', new Set(P.PRIPOMINKA_TYPY.map(t => t.placeholder)).size === 4);

/* 2) nová připomínka */
const r1 = P.pripominkaNova({ typ: 'chyba', text: '  Po kliknutí na Uložit\u0007 se nic nestalo.  ', autor: 'cizi@priklad.cz',
  stav: 'hotovo', odpoved: 'podvrh', prectenoSpravcem: true, navic: 'x',
  kontext: { obrazovka: 'Kalkulace OCK', zalozka: 'kalk"><img', verze: '21.11.1',
    zakazka: { cislo: '2026 - OPR - CN - 1', varianta: 'V1' },
    misto: { sekce: 'Šachta', popisek: 'Výška', rect: { x: 10, y: 20, w: 100, h: 30, vw: 1280, vh: 800 } },
    pole: Array.from({ length: 50 }, (_, i) => ({ popisek: 'Pole ' + i, hodnota: 'x'.repeat(500) })) } },
  REL, TED, 'test', 7);
const p1 = r1.pripominka;
test('nová připomínka projde', r1.ok, r1);
test('číslo P-0007', p1.id === 'P-0007' && p1.cislo === 7, p1.id);
test('autor z relace (malými), ne z těla', p1.autor === 'obchodnik.pr@priklad.cz', p1.autor);
test('jméno autora bez ostrých závorek', p1.autorJmeno === 'Obchodník PR', p1.autorJmeno);
test('stav vždy nova, odpověď prázdná, nepřečtená', p1.stav === 'nova' && p1.odpoved === '' && p1.prectenoSpravcem === false);
test('neznámé pole se neuloží', !('navic' in p1));
test('řídicí znak a okraje pryč', p1.text === 'Po kliknutí na Uložit se nic nestalo.', p1.text);
test('zdroj test', p1.zdroj === 'test' && P.pripominkaNova({ typ: 'dotaz', text: 'Jak přidám druhou šachtu?' }, REL, TED, 'cokoli', 1).pripominka.zdroj === 'ostry');
test('záložka jen písmena a čísla', p1.kontext.zalozka === 'kalkimg', p1.kontext.zalozka);
test('kontext pod stropem (pole se ořežou)', JSON.stringify(p1.kontext).length <= P.PRIPOMINKA_KONTEXT_MAX && p1.kontext.pole.length === 30 && p1.kontext.pole[0].hodnota.length === 120,
  JSON.stringify(p1.kontext).length);
test('místo: sekce › popisek', P.pripominkaMistoPopis(p1.kontext.misto) === 'Šachta › Výška');
test('průběh začíná stavem nova', p1.prubeh.length === 1 && p1.prubeh[0].stav === 'nova');
test('text nad strop odmítne', !P.pripominkaNova({ typ: 'chyba', text: 'a'.repeat(P.PRIPOMINKA_TEXT_MAX + 1) }, REL, TED, 'ostry', 1).ok);
test('text na stropu přijme', P.pripominkaNova({ typ: 'chyba', text: 'a'.repeat(P.PRIPOMINKA_TEXT_MAX) }, REL, TED, 'ostry', 1).ok);
test('text jako objekt odmítne', !P.pripominkaNova({ typ: 'chyba', text: { toString: 1 } }, REL, TED, 'ostry', 1).ok);

/* 3) snímek */
const jpeg = 'data:image/jpeg;base64,' + 'A'.repeat(1000);
test('JPEG přijme', P.pripominkaSnimekZkontroluj(jpeg).ok);
test('prázdno = bez snímku', P.pripominkaSnimekZkontroluj('').ok && P.pripominkaSnimekZkontroluj('').obrazek === '');
test('SVG odmítne', !P.pripominkaSnimekZkontroluj('data:image/svg+xml;base64,PHN2Zz4=').ok);
test('odkaz odmítne', !P.pripominkaSnimekZkontroluj('https://example.invalid/a.png').ok);
test('nad strop odmítne', !P.pripominkaSnimekZkontroluj('data:image/png;base64,' + 'A'.repeat(P.PRIPOMINKA_SNIMEK_MAX)).ok);
test('cizí znaky v base64 odmítne', !P.pripominkaSnimekZkontroluj('data:image/png;base64,AAA"onerror=1').ok);

/* 4) změny správcem */
const nic = () => true;
const odl0 = P.pripominkaZmen(p1, { akce: 'odlozit' }, 'spravce', TED, nic);
test('odložit bez zdůvodnění odmítne', !odl0.ok && odl0.kod === 400, odl0);
const odl1 = P.pripominkaZmen(p1, { akce: 'odlozit', odpoved: 'Až po ceníku v29.' }, 'spravce', TED, nic);
test('odložit se zdůvodněním projde, odpověď oranžově', odl1.ok && odl1.pripominka.stav === 'odlozeno'
  && P.pripominkaOranzove('odlozeno') && odl1.pripominka.odpovedNova === true, odl1);
test('zamítnout bez zdůvodnění odmítne', !P.pripominkaZmen(p1, { akce: 'zamitnout', odpoved: '  ' }, 'spravce', TED, nic).ok);
test('zamítnout se zdůvodněním projde', P.pripominkaZmen(p1, { akce: 'zamitnout', odpoved: 'Tak to má být.' }, 'spravce', TED, nic).ok);
const fr = P.pripominkaZmen(p1, { akce: 'fronta' }, 'spravce', TED, nic);
test('do fronty oprav bez odpovědi projde', fr.ok && fr.pripominka.stav === 'fronta' && fr.pripominka.prubeh.length === 2, fr);
test('uzavřít bez odpovědi odmítne', !P.pripominkaZmen(p1, { akce: 'uzavrit' }, 'spravce', TED, nic).ok);
const uz = P.pripominkaZmen(p1, { akce: 'uzavrit', odpoved: 'Opraveno ve verzi 21.11.2.' }, 'spravce', TED, nic);
test('odpovědět a uzavřít projde', uz.ok && uz.pripominka.stav === 'hotovo' && uz.pripominka.odpovedKdo === 'správce', uz);
test('duplicitní bez čísla odmítne', !P.pripominkaZmen(p1, { akce: 'duplicitni' }, 'spravce', TED, nic).ok);
test('duplicitní se sebou odmítne', !P.pripominkaZmen(p1, { akce: 'duplicitni', duplicitniS: 'P-0007' }, 'spravce', TED, nic).ok);
test('duplicitní s neexistující odmítne', !P.pripominkaZmen(p1, { akce: 'duplicitni', duplicitniS: 'P-0003' }, 'spravce', TED, () => false).ok);
const dup = P.pripominkaZmen(p1, { akce: 'duplicitni', duplicitniS: 'p-0003' }, 'spravce', TED, nic);
test('duplicitní s existující projde', dup.ok && dup.pripominka.duplicitniS === 'P-0003' && dup.pripominka.stav === 'duplicitni', dup);
test('neznámá akce odmítne', !P.pripominkaZmen(p1, { akce: 'smazat' }, 'spravce', TED, nic).ok);
test('původní záznam se nezměnil (kopie)', p1.stav === 'nova' && p1.prubeh.length === 1);

/* 5) koordinace */
const k0 = P.pripominkaZmen(p1, { stav: 'resi' }, 'koordinace', TED, nic);
test('koordinace nesáhne na novou připomínku', !k0.ok && k0.kod === 403, k0);
const pf = fr.pripominka;
const k1 = P.pripominkaZmen(pf, { stav: 'resi', roadmapa: '712' }, 'koordinace', TED, nic);
test('koordinace: Řeší se + roadmapa #712', k1.ok && k1.pripominka.stav === 'resi' && k1.pripominka.roadmapa === '#712', k1);
test('koordinace: akce správce odmítne', !P.pripominkaZmen(pf, { akce: 'duplicitni', duplicitniS: 'P-0001' }, 'koordinace', TED, nic).ok);
test('koordinace: stav nova odmítne', !P.pripominkaZmen(pf, { stav: 'nova' }, 'koordinace', TED, nic).ok);
test('koordinace: zamítnout bez zdůvodnění odmítne', !P.pripominkaZmen(pf, { stav: 'zamitnuto' }, 'koordinace', TED, nic).ok);
test('koordinace: zamítnout se zdůvodněním projde', P.pripominkaZmen(pf, { stav: 'zamitnuto', odpoved: 'Není chyba.' }, 'koordinace', TED, nic).ok);
test('roadmapa ve špatném tvaru odmítne', !P.pripominkaZmen(pf, { roadmapa: '12a' }, 'koordinace', TED, nic).ok);

/* 6) pohledy */
const pa = P.pripominkaProAutora(k1.pripominka);
test('autor: bez kontextu, roadmapy, autora a příznaků správce',
  !('kontext' in pa) && !('roadmapa' in pa) && !('autor' in pa) && !('prectenoSpravcem' in pa), Object.keys(pa));
test('autor: průběh bez „kdo" a textu', pa.prubeh.every(x => Object.keys(x).join() === 'kdy,stav'));
const pk = P.pripominkaProKoordinaci(k1.pripominka);
test('koordinace: bez autora, zakázky, polí a snímku', !('autor' in pk) && !('autorJmeno' in pk) && !('snimek' in pk)
  && JSON.stringify(pk).indexOf('2026 - OPR') < 0 && JSON.stringify(pk).indexOf('Pole 1') < 0, pk);
test('koordinace: obrazovka a verze ano, místo z obsahu ne', pk.kontext.obrazovka === 'Kalkulace OCK' && pk.kontext.misto === ''
  && pk.kontext.verze === '21.11.1', pk.kontext);

/* 6b) N1 revize (22. 11. 2026): „označené místo“ nesmí ke koordinaci nést obsah
 * stránky (cenu, jméno zákazníka). Popisek z popisů prvku (label, aria, title,
 * placeholder) jde, jen bez číslic a zavináče; obsah prvku a nadpis okna ne.
 * Pojistka: před opravou koordinace dostala „sekce › popisek“ i z obsahu. */
const kOb = P.pripominkaKontextOciste({ obrazovka: 'Kalkulace OCK', misto: { sekce: 'Zákazník Novák s.r.o.', popisek: 'Celkem 1 250 000 Kč',
  zdroj: 'obsah', selektor: '#kalk-nabidka > td' } });
test('N1: kontext drží původ popisku (obsah)', kOb.misto && kOb.misto.zdroj === 'obsah', kOb.misto);
test('N1: neznámý původ = obsah (bezpečná strana)', P.pripominkaKontextOciste({ misto: { popisek: 'x', zdroj: 'cokoli' } }).misto.zdroj === 'obsah');
const pOb = P.pripominkaProKoordinaci(Object.assign({}, p1, { kontext: kOb }));
test('N1: koordinace z obsahu prvku nedostane popisek ani sekci', !/Novák|1 250|Celkem/.test(JSON.stringify(pOb)), pOb.kontext);
test('N1: koordinace dostane obrazovku a selektor', pOb.kontext.obrazovka === 'Kalkulace OCK' && pOb.kontext.selektor === '#kalk-nabidka > td', pOb.kontext);
const kPo = P.pripominkaKontextOciste({ misto: { sekce: 'Zákazník Novák s.r.o.', popisek: 'Výška šachty', zdroj: 'popis' } });
const pPo = P.pripominkaProKoordinaci(Object.assign({}, p1, { kontext: kPo }));
test('N1: popisek z popisu prvku jde, nadpis okna ne', pPo.kontext.misto === 'Výška šachty' && !/Novák/.test(JSON.stringify(pPo)), pPo.kontext);
const pPc = P.pripominkaProKoordinaci(Object.assign({}, p1, { kontext: P.pripominkaKontextOciste({ misto: { popisek: 'Cena 12 000 Kč', zdroj: 'popis' } }) }));
test('N1: popis s číslicí nebo zavináčem ke koordinaci nejde', pPc.kontext.misto === ''
  && P.pripominkaProKoordinaci(Object.assign({}, p1, { kontext: P.pripominkaKontextOciste({ misto: { popisek: 'jan@priklad.cz', zdroj: 'popis' } }) })).kontext.misto === '');

/* 7) průběh, filtry, počty, uchovávání */
test('kroky: Přijato → Řeší se → Testuje se → Hotovo', P.PRIPOMINKA_KROKY.join('|') === 'Přijato|Řeší se|Testuje se|Hotovo');
test('krok podle stavu', P.pripominkaKrok('nova') === 0 && P.pripominkaKrok('fronta') === 0 && P.pripominkaKrok('resi') === 1
  && P.pripominkaKrok('test') === 2 && P.pripominkaKrok('hotovo') === 3);
const sez = [p1, pf, k1.pripominka, uz.pripominka, odl1.pripominka, dup.pripominka,
  Object.assign({}, p1, { id: 'P-0099', zdroj: 'ostry', text: 'Cena šachty nesedí', kdy: '2026-11-22T00:00:00Z' })];
const poc = P.pripominkyPocty(sez, 'oba');
test('počty filtrů', poc.nove === 2 && poc.fronta === 1 && poc.resi === 1 && poc.hotovo === 1 && poc.odlozene === 2 && poc.vse === 7, poc);
test('zdroj jen ostrý', P.pripominkyFiltruj(sez, 'vse', 'ostry', '').length === 1);
test('zdroj jen test', P.pripominkyFiltruj(sez, 'vse', 'test', '').length === 6);
test('hledání bez diakritiky', P.pripominkyFiltruj(sez, 'vse', 'oba', 'sachty').map(p => p.id).join() === 'P-0099');
test('řazení od nejnovější', P.pripominkyFiltruj(sez, 'vse', 'oba', '')[0].id === 'P-0099');
test('nové odpovědi autora', P.pripominkyNovychOdpovedi(sez) === 5, P.pripominkyNovychOdpovedi(sez));
const stare = [Object.assign({}, uz.pripominka, { id: 'P-0001', zmeneno: '2025-01-01T00:00:00Z' }),
  Object.assign({}, odl1.pripominka, { id: 'P-0002', zmeneno: '2025-01-01T00:00:00Z' }),
  Object.assign({}, uz.pripominka, { id: 'P-0003' })];
const smaz = P.pripominkyKSmazani(stare, 365, Date.parse(TED));
test('uchovávání: smaže jen starou vyřízenou (ne odloženou, ne čerstvou)', smaz.join() === 'P-0001', smaz);
test('uchovávání 0 = navždy', P.pripominkyKSmazani(stare, 0, Date.parse(TED)).length === 0);

/* nastavení */
const nv = P.pripominkyNastaveniVychozi();
test('výchozí: funkce vypnutá, snímek zapnutý, limit 20', nv.zapnuto === false && nv.snimekVychozi === true && nv.limitDen === 20);
const no = P.pripominkyNastaveniOciste({ zapnuto: true, role: ['Obchodník', 'Hacker'], limitDen: 9999, klicHash: 'x', uchovatDni: -5 });
test('očista nastavení: role jen známé, limit strop, klíč se nepíše', no.role.join() === 'Obchodník' && no.limitDen === 200
  && !('klicHash' in no) && no.uchovatDni === 365, no);
test('smí odesílat jen zapnutá funkce a povolená role', P.pripominkySmiOdesilat(no, 'Obchodník') && !P.pripominkySmiOdesilat(no, 'Vedoucí')
  && !P.pripominkySmiOdesilat(nv, 'Obchodník'));

/* obnova */
const ob = P.pripominkaObnovaOciste(Object.assign({}, k1.pripominka, { navic: 1, snimek: true }));
test('obnova: záznam projde očistou, bez snímku a cizích polí', ob && ob.id === 'P-0007' && ob.stav === 'resi' && !('navic' in ob) && ob.snimek === false, ob);
test('obnova: špatné id odmítne', P.pripominkaObnovaOciste(Object.assign({}, k1.pripominka, { id: '../x' })) === null);

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
