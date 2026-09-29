/* ROZHODNUTÍ J. V. K ROZBORU D KOLA 16 (29. 9. 2026)
 * Podklad: podklady/K16_ROZBOR_2026-09-25.md (tabulka rozhodnutí nahoře).
 *
 * Každý oddíl hlídá jedno rozhodnutí; bez opravy jeho testy selžou.
 *   P8b  — holé číslo termínu dodání dostane jednotku („12" → „12 týdnů"),
 *          aby nabídka neříkala „Termín dodání: 12" a aby se termín s ATYP
 *          dal přeložit (dřív „16 (vč. 4 týdnů za ATYP)" zůstalo česky).
 *   P10.1 — platnost nabídky 2 měsíce i v náhradních hodnotách, skloňování.
 *   P10.2 — náhled nabídky PROJ bere splatnost a platnost z krycího listu.
 *   P11   — zahraniční varianta s oceněnou projekcí: kontrola a věta v dialogu. */
const fs = require('fs');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
const pr = nacti('./preklad.js');
const zk = nacti('./zakazka.js');
const kr = nacti('./kryci.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
global.NAST = { firma: global.firmaDefault() };

const zak = zk.novaZakazka();
zak.cislo = '2026 - OPR - CN - 0404'; zak.nazevAkce = 'Zkušební termíny'; zak.objednatel = 'Zkušební s.r.o.';
const v = zak.varianty[0];
const c = kr.kryciCtx(zak, v, JEKLY);
const pole = id => [].concat(...kr.KRYCI_SEKCE.map(s => s.pole)).find(p => p.id === id);

/* ---------------- P8b: termín dodání s jednotkou ---------------- */
const T = kr.kryciTerminDodaniText;
test('P8b: holé číslo dostane jednotku („12" → „12 týdnů")', T('12', false, '4') === '12 týdnů', T('12', false, '4'));
test('P8b: s ATYP se přičte a jednotka zůstane', T('12', true, '4') === '16 týdnů (vč. 4 týdnů za ATYP)', T('12', true, '4'));
test('P8b: „cca 12" → „cca 12 týdnů"', T('cca 12', false, '4') === 'cca 12 týdnů', T('cca 12', false, '4'));
test('P8b: česky se skloňuje (3 týdny, 1 týden)', T('3', false) === '3 týdny' && T('1', false) === '1 týden', [T('3', false), T('1', false)]);
test('P8b: po přičtení ATYP se skloňuje podle nového čísla („2 týdny" + 4 → „6 týdnů")',
  T('2 týdny od podpisu smlouvy', true, '4') === '6 týdnů od podpisu smlouvy (vč. 4 týdnů za ATYP)', T('2 týdny od podpisu smlouvy', true, '4'));
test('P8b: věta s vlastní jednotkou zůstává, jak je',
  T('12 týdnů od podpisu smlouvy', true, '4') === '16 týdnů od podpisu smlouvy (vč. 4 týdnů za ATYP)', T('12 týdnů od podpisu smlouvy', true, '4'));
test('P8b: bez čísla se nic nevymýšlí', T('dle dohody', false, '4') === 'dle dohody' && T('', false, '4') === '');
test('P8b: ruční přepis v krycím listu „10" odejde jako „10 týdnů"',
  kr.kryciHodnota(pole('terminDodani'), { hodnoty: { terminDodani: '10' } }, c) === '10 týdnů',
  kr.kryciHodnota(pole('terminDodani'), { hodnoty: { terminDodani: '10' } }, c));
test('P8b: ruční přepis s vlastním textem se nemění',
  kr.kryciHodnota(pole('terminDodani'), { hodnoty: { terminDodani: 'do 30. 11. 2026' } }, c) === 'do 30. 11. 2026');
const sAtyp = kr.kryciTerminDodani({ firma: { terminDodaniOck: '12', terminAtypTydny: '4' }, atyp: true });
test('P8b: termín z Firmy s ATYP se přeloží celý (EN)',
  pr.tr(sAtyp, 'en') === '16 weeks (incl. 4 weeks for the non-standard design)', pr.tr(sAtyp, 'en'));
test('P8b: … i německy a francouzsky',
  pr.tr(sAtyp, 'de') === '16 Wochen (inkl. 4 Wochen für die Sonderausführung)'
  && /^16 semaines/.test(pr.tr(sAtyp, 'fr')), [pr.tr(sAtyp, 'de'), pr.tr(sAtyp, 'fr')]);
test('P8b: jednotné číslo se přeloží („1 týden" → „1 week")', pr.tr('1 týden', 'en') === '1 week', pr.tr('1 týden', 'en'));

/* ---------------- P10.1 / P10.2: platnost 2 měsíce, splatnost z krycího listu ----------------
 * J. V. 29. 9. 2026: „standardizuj na 2 měsíce"; „splatnost by se měla
 * tisknout z krycího listu". Náhled nabídky PROJ tiskl splatnost a platnost
 * z konstant — přepis v krycím listu PROJ (třeba 45 dní) neviděl, Word ano. */
const kp = nacti('./kryci_proj.js');
const np = nacti('./nabidka_proj.js');
const polePROJ = id => [].concat(...kp.KRYCI_PROJ_SEKCE.map(s => s.pole)).find(p => p.id === id);
const cP = kp.kryciProjCtx(zak, v);
test('P10.1: platnost PROJ bez firemní hodnoty = 2 měsíce (ne 3)',
  kp.kryciProjHodnota(polePROJ('platnostNabidky'), { hodnoty: {} },
    Object.assign({}, cP, { firma: { platnostNabidky: '' }, sazby: Object.assign({}, cP.sazby, { platnostMesicu: 2 }) })) === '2 měsíce');
test('P10.1: počet měsíců se skloňuje (5 měsíců, 1 měsíc)',
  kp.kryciProjHodnota(polePROJ('platnostNabidky'), { hodnoty: {} },
    Object.assign({}, cP, { firma: { platnostNabidky: '' }, sazby: Object.assign({}, cP.sazby, { platnostMesicu: 5 }) })) === '5 měsíců'
  && kp.kryciProjHodnota(polePROJ('platnostNabidky'), { hodnoty: {} },
    Object.assign({}, cP, { firma: { platnostNabidky: '' }, sazby: Object.assign({}, cP.sazby, { platnostMesicu: 1 }) })) === '1 měsíc');
test('P10.1: náhradní sazby krycího listu PROJ mají platnost 2 měsíce',
  /platnostMesicu:\s*2\b/.test(fs.readFileSync(__dirname + '/kryci_proj.js', 'utf8'))
  && !/platnostMesicu:\s*3\b/.test(fs.readFileSync(__dirname + '/kryci_proj.js', 'utf8')));
test('P10.1: „5 měsíců" a „45 dní" se přeloží (vzor, ne jen slovník)',
  pr.tr('5 měsíců', 'en') === '5 months' && pr.tr('45 dní', 'de') === '45 Tage' && pr.tr('1 měsíc', 'fr') === '1 mois',
  [pr.tr('5 měsíců', 'en'), pr.tr('45 dní', 'de'), pr.tr('1 měsíc', 'fr')]);
{
  const z2 = zk.novaZakazka();
  z2.cislo = '2026 OVP CN 0405'; z2.nazevAkce = 'Splatnost z krycího listu'; z2.objednatel = 'SVJ';
  const v2 = z2.varianty[0];
  v2.data.proj.cenik = ZC.zkusebniCenikProj();
  v2.data.kryciProj = { hodnoty: { splatnostDni: '45', platnostNabidky: '1 měsíc' } };
  const d = np.nabidkaProjData(z2, v2);
  const obch = d.bloky.find(b => b.typ === 'pary' && b.radky.some(r => /Splatnost faktur/.test(r[0])));
  const radek = re => obch && (obch.radky.find(r => re.test(r[0])) || [])[1];
  test('P10.2: náhled nabídky PROJ tiskne splatnost z krycího listu PROJ (45 dní)', radek(/Splatnost/) === '45 dní', obch && obch.radky);
  test('P10.2: … a platnost z krycího listu PROJ (1 měsíc)', radek(/Platnost/) === '1 měsíc', obch && obch.radky);
  const dEn = np.nabidkaProjData(z2, v2, 'en');
  const obchEn = dEn.bloky.find(b => b.typ === 'pary' && b.radky.some(r => /Invoice/.test(r[0])));
  test('P10.2: v anglické nabídce přeloženě (45 days, 1 month)',
    obchEn && obchEn.radky.some(r => r[1] === '45 days') && obchEn.radky.some(r => r[1] === '1 month'), obchEn && obchEn.radky);
  v2.data.kryciProj = { hodnoty: {} };
  const d0 = np.nabidkaProjData(z2, v2);
  const obch0 = d0.bloky.find(b => b.typ === 'pary' && b.radky.some(r => /Splatnost faktur/.test(r[0])));
  test('P10.2: bez přepisu platí předvyplněné hodnoty (14 dní, 2 měsíce)',
    obch0 && obch0.radky.some(r => r[1] === '14 dní') && obch0.radky.some(r => r[1] === '2 měsíce'), obch0 && obch0.radky);
}

/* ---------------- P11: projekce u zahraniční varianty ----------------
 * J. V. 29. 9. 2026: „zahraniční zakázky PROJ nerealizujeme". Řada
 * Zahraničí u projekce mění jen přirážku a DPH (sazby a fixy zůstávají
 * tuzemské) a nikdo o tom nevěděl. Kontrola před nabídkou to řekne. */
const K = nacti('./kontroly.js');
const nalez = (ctx, kod) => (K.kontrolyProved(ctx).nalezy || []).find(n => n.kod === kod);
const projR = { souhrn: { celkem: 120000 }, sekce: [] };
const nZahr = nalez({ cenikRada: 'zahr', projVysledek: projR, zak: { jenOck: false } }, 'projZahranici');
test('P11: zahraniční varianta s oceněnou projekcí → kontrola se ozve', !!nZahr);
test('P11: věta říká, že projekci u zahraničních zakázek nerealizujeme, a co s tím',
  !!nZahr && /nerealizujeme/.test(nZahr.text) && /tuzemsk/.test(nZahr.text), nZahr && nZahr.text);
test('P11: je to varování, dokument OCK nezastaví', !!nZahr && nZahr.uroven === K.KONTROLY_UROVEN);
test('P11: tuzemská varianta mlčí', !nalez({ cenikRada: 'cr', projVysledek: projR, zak: {} }, 'projZahranici'));
test('P11: projekce bez ceny mlčí', !nalez({ cenikRada: 'zahr', projVysledek: { souhrn: { celkem: 0 } }, zak: {} }, 'projZahranici'));
test('P11: zakázka jen realizace mlčí', !nalez({ cenikRada: 'zahr', projVysledek: projR, zak: { jenOck: true } }, 'projZahranici'));
test('P11: kontroly v aplikaci dostanou řadu ceníku varianty',
  /cenikRada:/.test(fs.readFileSync(__dirname + '/ui/kontroly_ui.js', 'utf8')));
test('P11: dialog přepnutí na zahraniční ceník o projekci mluví',
  /nerealizujeme/.test(fs.readFileSync(__dirname + '/ui/common.js', 'utf8').slice(
    fs.readFileSync(__dirname + '/ui/common.js', 'utf8').indexOf('async function cenikRadaPrepniUI'))
    .slice(0, 4000)));

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
