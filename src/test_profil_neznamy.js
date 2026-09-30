/* NEZNÁMÝ ROZMĚR PROFILU (#372, nález A2-1 z 26. 9. 2026).
 *
 * Nález: zakázka s rozměrem profilu mimo tabulku jeklů (`dim '999x999'`) nebo
 * s tloušťkou, kterou rozměr nemá (`80x80`, `tl 99`), shodila výpočet —
 * `jekl()` v engine.js vyhodil výjimku, render() ukázal červený pruh
 * a Kalkulace OCK zůstala prázdná; server takovou zakázku uložil i obnovil,
 * takže se pak nikomu neotevřela.
 *
 * Co se hlídá:
 *   – vypocet s neznámým rozměrem i s neznámou tloušťkou nevyhodí výjimku,
 *     dosadí nulovou hmotnost a plochu a vrátí seznam neznámých profilů,
 *   – lemování interiérové šachty se nepočítá, tak se ani nehlásí,
 *   – kontrola „profilNeznamy" vrátí ZÁBRANU se jménem profilu (dokument
 *     s nulovým profilem nevznikne),
 *   – s platným zadáním je výsledek BAJT PO BAJTU stejný jako před opravou
 *     (otisky SHA-256 výsledku výchozího zadání, interiér i exteriér,
 *     Model 1 i Model 2, pořízené 29. 9. 2026 před změnou jádra). */
const fs = require('fs');
const crypto = require('crypto');
const eng = require('./engine.js');
const K = require('./kontroly.js');
const ZC = require('./zkusebni_cenik.js');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };

const zadani = (upravy) => {
  const z = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
  if (upravy) upravy(z);
  return z;
};
const spocti = (z, fixes) => {
  try { return { r: eng.vypocet(z, ZC.zkusebniCenik(), JEKLY, !!fixes) }; }
  catch (e) { return { chyba: e.message }; }
};

/* --- 1) neznámý rozměr a neznámá tloušťka výpočet neshodí --- */
const neznamyDim = spocti(zadani(z => { z.profily.sloupek.dim = '999x999'; }));
test('neznámý rozměr (999x999) výpočet neshodí', !neznamyDim.chyba && !!neznamyDim.r, neznamyDim.chyba);
const nez1 = neznamyDim.r && neznamyDim.r.profily && neznamyDim.r.profily.nezname;
test('výsledek nese seznam neznámých profilů se jménem, rozměrem a tloušťkou',
  Array.isArray(nez1) && nez1.length === 1 && /sloupek/.test(nez1[0]) && /999x999/.test(nez1[0]) && /4 mm/.test(nez1[0]), nez1);
const radekSl = neznamyDim.r && neznamyDim.r.profily.rows.find(x => /sloupek$/.test(x.nazev));
test('neznámý profil má nulovou hmotnost i plochu', !!radekSl && radekSl.kg === 0 && radekSl.m2 === 0, radekSl);
test('souhrn zůstane číslem (žádné NaN)', !!neznamyDim.r && Number.isFinite(neznamyDim.r.souhrn.zakladCena), neznamyDim.r && neznamyDim.r.souhrn.zakladCena);

const neznamaTl = spocti(zadani(z => { z.profily.sloupek.dim = '80x80'; z.profily.sloupek.tl = 99; }), true);
test('neznámá tloušťka (80x80 / 99 mm) výpočet neshodí (Model 2)', !neznamaTl.chyba && !!neznamaTl.r, neznamaTl.chyba);
const nez2 = neznamaTl.r && neznamaTl.r.profily && neznamaTl.r.profily.nezname;
test('… a do seznamu se zapíše i s tloušťkou', Array.isArray(nez2) && nez2.length === 1 && /80x80 \/ 99 mm/.test(nez2[0]), nez2);

const vic = spocti(zadani(z => { z.profily.spojka.dim = 'xyz'; z.profily.precnikPortal.tl = 77; }));
test('víc neznámých profilů najednou → všechny v seznamu', !!vic.r && (vic.r.profily.nezname || []).length === 2, vic.r && vic.r.profily.nezname);

const lemInt = spocti(zadani(z => { z.typSachty = 'interiérová'; z.profily.lemovani.dim = '999x999'; }));
test('lemování interiérové šachty se nepočítá, tak se ani nehlásí',
  !!lemInt.r && !lemInt.r.profily.nezname, lemInt.chyba || (lemInt.r && lemInt.r.profily.nezname));
const lemExt = spocti(zadani(z => { z.typSachty = 'exteriérová'; z.profily.lemovani.dim = '999x999'; }));
test('lemování exteriérové šachty se hlásí', !!lemExt.r && (lemExt.r.profily.nezname || []).some(t => /lemování/.test(t)),
  lemExt.chyba || (lemExt.r && lemExt.r.profily.nezname));

test('profilyNezname je k dispozici i mimo výpočet (server)', typeof eng.profilyNezname === 'function');
if (typeof eng.profilyNezname === 'function') {
  test('profilyNezname: platné zadání = prázdný seznam', eng.profilyNezname(zadani(), JEKLY).length === 0);
  test('profilyNezname: najde neznámý rozměr', eng.profilyNezname(zadani(z => { z.profily.sloupek.dim = '999x999'; }), JEKLY).length === 1);
  test('profilyNezname: zadání bez profilů neshodí', Array.isArray(eng.profilyNezname({}, JEKLY)) && Array.isArray(eng.profilyNezname(null, JEKLY)));
}

/* --- 2) kontrola před dokumentem: zábrana se jménem profilu --- */
const ctx = r => ({ vysledek: r, zak: { jenProj: false }, nast: {} });
const nalez = r => (K.kontrolyProved(ctx(r)).nalezy || []).find(n => n.kod === 'profilNeznamy');
const n1 = neznamyDim.r && nalez(neznamyDim.r);
test('kontrola „profilNeznamy" se ozve', !!n1, n1);
test('… jako ZÁBRANA (dokument nevznikne)', !!n1 && n1.uroven === K.KONTROLY_UROVEN_ZABRANA && K.kontrolyProved(ctx(neznamyDim.r)).brani);
test('… a jmenuje profil i rozměr', !!n1 && /sloupek/.test(n1.text) && /999x999/.test(n1.text) && /katalogu jeklů/.test(n1.text), n1 && n1.text);
const pravidlo = K.kontrolyPravidla().find(p => p.kod === 'profilNeznamy');
test('pravidlo je v katalogu označené, že umí zastavit dokument', !!pravidlo && pravidlo.zabranaMozna === true, pravidlo);
const platny = spocti(zadani());
test('s platným zadáním kontrola mlčí', !!platny.r && !nalez(platny.r));

/* --- 3) platná data: výsledek bajt po bajtu jako před opravou --- */
/* SVĚTLÍKY U DVEŘÍ (#375, 30. 9. 2026): výsledek dostal nová pole (počet
 * bočních světlíků, rozložení po dveřích, materiál; pásy bez světlíků)
 * a popisné `zaskleni.vypln.boky` říká u zakázky bez bočních světlíků
 * pravdu („bez"; dřív „sklo", i když boky nebyly). Do otisku proto nevstupují.
 * Otisky jsou přepočítané z jádra v30.9.3 (před #375) po téže očistě
 * a nové jádro dává bajt po bajtu totéž — ceny ani mezivýsledky se nehnuly. */
const OTISK_BEZ = ['bokyKs', 'bokyKsAuto', 'bokyKsRucne', 'dvere', 'dvereDva', 'dvereJeden', 'dvereBez',
  'mezera', 'nadM2', 'bokyM2', 'material', 'boky'];
const otiskOcisti = r => {
  const x = JSON.parse(JSON.stringify(r));
  OTISK_BEZ.forEach(k => { delete x.zaskleni.vypln[k]; });
  delete x.oplasteni.zakladPasu; delete x.oplasteni.svetliky;
  return x;
};
const OTISKY = {
  'interiérová M1': '3e1a08b9085b572e', 'interiérová M2': 'ee70861796207bb6',
  'exteriérová M1': 'b57c60c38e8245e6', 'exteriérová M2': '0e338ef1b802eb4f',
};
for (const typ of ['interiérová', 'exteriérová']) for (const fixes of [false, true]) {
  const { r, chyba } = spocti(zadani(z => { z.typSachty = typ; }), fixes);
  const otisk = r ? crypto.createHash('sha256').update(JSON.stringify(otiskOcisti(r))).digest('hex').slice(0, 16) : chyba;
  const klic = typ + (fixes ? ' M2' : ' M1');
  test('platné zadání ' + klic + ': výsledek beze změny (otisk)', otisk === OTISKY[klic], otisk);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
