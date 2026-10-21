/* ============================================================
 * PŘEVOD HODNOT KRYCÍHO LISTU NA HODNOTY PIPEDRIVE (21. 10. 2026, #114)
 *
 * Dvě části:
 *   1. čistý převod (netlify/lib/pd_prevod.mjs) nad definicemi polí ve tvaru
 *      API v2 se SKUTEČNÝMI názvy a volbami z účtu (ID voleb smyšlená),
 *   2. křížová kontrola s krycími listy (src/kryci.js, src/kryci_proj.js):
 *      každé pole, ze kterého mapa bere hodnotu, v krycím listu existuje,
 *      a výchozí znění aplikace („50 % – po podpisu smlouvy", „Uplatněn
 *      limit 10 %", volby přepínačů) se na hodnotu Pipedrive převede.
 *      Kdo přejmenuje volbu v krycím listu, dozví se to tady — ne až z CRM.
 * ============================================================ */
import { createRequire } from 'node:module';
import { pdNorm, pdCisla, pdVolba, pdDoPd, pdZapisDealu } from './lib/pd_prevod.mjs';
import { pdMapaZPoli, POLE_DEALU } from './lib/pd_mapa.mjs';

let ok = 0, fail = 0; const selhalo = [];
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; selhalo.push(n); console.log('FAIL ' + n, info === undefined ? '' : info); }
};
const J = (x) => JSON.stringify(x);

/* ---------- definice polí jako ze skutečného účtu ---------- */

const h = (n) => n.toString(16).padStart(2, '0').repeat(20);
const V = (...labels) => labels.map((label, i) => ({ id: 100 + i, label }));
const ANO_NE = V('Ano', 'Ne');
const ZADRZNE = V('Ne', '5%', '10%', '15%', '20%');
const VOLBY = {
  typZakazky: V('Realizace', 'Projekce'),
  zpusobFakturace: V('Náš standard', 'Měsíční', 'Po dokončení stupňů dokumentace'),
  zadrzneProc: ZADRZNE, zadrzneZaruka: ZADRZNE,
  typSmlouvy: V('Naše bez úprav', 'Naše s úpravami', 'Smlouva zákazníka'),
  typProjektu: V('Nový projekt (novostavba)', 'Rekonstrukce objektu'),
  pamatkovaOchrana: ANO_NE,
  licence: V('Nevýhradní – pro účel stavby dle smlouvy', 'Výhradní'),
  sazbaDph: V('21 %', '12 %', '0 % – přenesená daňová povinnost'),
  pojisteni: V('Ano – dle pojistné smlouvy zhotovitele', 'Ne'),
  atyp: ANO_NE, zamereniStrojovna: ANO_NE,
  situacniFoto: V('Ve složce', 'Nejsou k dispozici'),
  dokumentace: V('DSP', 'Prováděcí dokumentace'),
};
/* Velké textové pole (`text`) tam, kde ho má účet; jinak první dovolený typ. */
const VELKY_TEXT = ['adresaStavby', 'podminkyJine', 'terminJine', 'odchylky', 'cenaNezahrnuje', 'rozsahJine'];
const POLE = POLE_DEALU.map((d, i) => ({
  field_code: h(i + 1), field_name: d.nazev, is_custom_field: true, is_writable: true,
  field_type: VELKY_TEXT.includes(d.klic) ? 'text' : d.typ[0], options: VOLBY[d.klic] || null,
}));
const pole = pdMapaZPoli(POLE, POLE_DEALU);
const DEF = Object.fromEntries(POLE_DEALU.map((d) => [d.klic, d]));
const idVolby = (klic, label) => (VOLBY[klic].find((o) => o.label === label) || {}).id;
/* převod jednoho pole z jedné strany */
const P = (klic, strana, hodnoty, navic = {}, spolecne = {}) =>
  pdDoPd(DEF[klic], strana, { hodnoty, ...navic }, pole.popisy[klic], spolecne);

test('fixture: všechna pole mapy se spárovala', Object.keys(pole.mapa).length === POLE_DEALU.length,
  J({ chybi: pole.chybi, typNesedi: pole.typNesedi }));

console.log('\n===== SROVNÁNÍ TEXTU A ČÍSLA Z TEXTU =====\n');

test('srovnání: diakritika, velikost, pomlčky a čárky nerozhodují',
  pdNorm('Nevýhradní – pro účel stavby dle smlouvy') === pdNorm('nevýhradní, pro účel stavby dle smlouvy'));
test('srovnání: „10 %" je totéž co „10%"', pdNorm('10 %') === pdNorm('10%'));
test('čísla: desetinná čárka', J(pdCisla('0,05 % / den')) === '[0.05]');
test('čísla: mezera mezi trojicemi je oddělovač tisíců', J(pdCisla('125 000 Kč')) === '[125000]');
test('čísla: tvrdá mezera taky', J(pdCisla('1\u00a0250,50 Kč')) === '[1250.5]');
test('čísla: rozsah jsou dvě čísla, ne jedno', J(pdCisla('10–12 týdnů')) === '[10,12]');
test('čísla: datum jsou tři čísla', pdCisla('31. 12. 2026').length === 3);

console.log('\n===== VOLBY =====\n');

const F = VOLBY.zpusobFakturace;
test('volba: přesná shoda', pdVolba('Měsíční', F, DEF.zpusobFakturace) === idVolby('zpusobFakturace', 'Měsíční'));
/* P10.5 (J. V. 29. 9. 2026): „náš standard je 50, 40, 10" = po milnících */
test('volba: „Po milnících" je „Náš standard"',
  pdVolba('Po milnících', F, DEF.zpusobFakturace) === idVolby('zpusobFakturace', 'Náš standard'));
test('volba: dřívější výchozí „Náš standard / měsíční" je „Náš standard" (jako ho čte krycí list)',
  pdVolba('Náš standard / měsíční', F, DEF.zpusobFakturace) === idVolby('zpusobFakturace', 'Náš standard'));
test('volba: „Cizí" smlouva je „Smlouva zákazníka"',
  pdVolba('Cizí', VOLBY.typSmlouvy, DEF.typSmlouvy) === idVolby('typSmlouvy', 'Smlouva zákazníka'));
test('volba: synonymum jednoho pole neplatí v jiném', pdVolba('Cizí', VOLBY.typSmlouvy, {}) === null);
test('volba: podle prvního slova jen tam, kde to mapa dovolí',
  pdVolba('nevýhradní, pro účel stavby dle SoD', VOLBY.licence, DEF.licence) === idVolby('licence', 'Nevýhradní – pro účel stavby dle smlouvy')
  && pdVolba('nevýhradní, pro účel stavby dle SoD', VOLBY.licence, {}) === null);
test('volba: „nevýhradní" se nesplete s „výhradní"',
  pdVolba('výhradní pro investora', VOLBY.licence, DEF.licence) === idVolby('licence', 'Výhradní'));
test('volba: neznámý text nevrátí nic', pdVolba('něco jiného', F, DEF.zpusobFakturace) === null);
test('volba: rozhoduje text, ne pořadí voleb',
  pdVolba('Měsíční', F.slice().reverse(), DEF.zpusobFakturace) === idVolby('zpusobFakturace', 'Měsíční'));

console.log('\n===== PŘEVOD JEDNOTLIVÝCH POLÍ =====\n');

test('prázdné pole se neposílá (zápis nikdy nemaže, co je v CRM)',
  P('splatnostDni', 'ock', { splatnostDni: '' }).prazdne === true && P('odchylky', 'ock', {}).prazdne === true);
test('pole, které čte jen kalkulátor z CRM, se nezapisuje',
  P('typZakazky', 'ock', { typZakazky: 'Realizace' }).prazdne === true
  && pdDoPd(DEF.objednatelFirma, 'ock', { hodnoty: { objPodpisFirma: 'X' } }, pole.popisy.objednatelFirma).prazdne === true);
/* „Předpokládané datum ukončení realizace" má v krycím listu zdroj (Konečné
 * předání díla), ale do potvrzení významu (úprava #4) se jen čte. */
test('pole čtené z CRM se nezapisuje, ani když má v krycím listu zdroj',
  P('terminPlneni', 'ock', { terminPredani: '2026-12-01' }).prazdne === true);
test('pole bez zdroje na téhle straně se neposílá', P('faktura2Proc', 'proj', { faktura2: '40 % – x' }).prazdne === true);
test('číslo: splatnost 14', P('splatnostDni', 'ock', { splatnostDni: '14' }).hodnota === 14);
test('procento: „50 % – po podpisu smlouvy" je 50', P('zaloha1Proc', 'ock', { zaloha1: '50 % – po podpisu smlouvy' }).hodnota === 50);
test('procento: „Bez zálohy" je 0', P('zaloha1Proc', 'ock', { zaloha1: 'Bez zálohy' }).hodnota === 0);
test('procento: dvě čísla v textu = důvod, ne první z nich',
  !!P('faktura2Proc', 'ock', { faktura2: '40 % – po zahájení, 10 % po předání' }).duvod);
test('pokuta: „0,05 % / den" je 0,05', P('pokutaProcDen', 'ock', { pokutaDodavka: '0,05 % / den' }).hodnota === 0.05);
test('pokuta: PROJ bere „prodlení s odevzdáním"', P('pokutaProcDen', 'proj', { pokutaTermin: '0,1 % / den' }).hodnota === 0.1);
test('limit: „Uplatněn limit 10 %" je 10', P('pokutaLimit', 'ock', { pokutaLimit: 'Uplatněn limit 10 %' }).hodnota === 10);
/* Past: v textu je desítka, ale znamená opak. */
test('limit: „NEUPLATNĚN limit 10 %" je 0, ne 10',
  P('pokutaLimit', 'ock', { pokutaLimit: 'NEUPLATNĚN limit 10 %' }).hodnota === 0);
test('platnost: „2 měsíce" je 2', P('platnostMesicu', 'ock', { platnostNabidky: '2 měsíce' }).hodnota === 2);
test('platnost: v týdnech se do měsíců nepřepočítává', !!P('platnostMesicu', 'ock', { platnostNabidky: '6 týdnů' }).duvod);
test('platnost: datum se za počet měsíců nevydává', !!P('platnostMesicu', 'ock', { platnostNabidky: '31. 12. 2026' }).duvod);
test('termín dodání: „12 týdnů" je 12', P('terminDodaniTydny', 'ock', { terminDodani: '12 týdnů' }).hodnota === 12);
test('termín dodání: přirážka za ATYP v závorce se nepočítá zvlášť',
  P('terminDodaniTydny', 'ock', { terminDodani: '16 týdnů (vč. 4 týdnů za ATYP)' }).hodnota === 16);
test('termín dodání: rozsah „10–12 týdnů" se neposílá (nehádá se)',
  !!P('terminDodaniTydny', 'ock', { terminDodani: '10–12 týdnů' }).duvod);
test('termín dodání: v měsících ne', !!P('terminDodaniTydny', 'ock', { terminDodani: '3 měsíce' }).duvod);

test('zádržné: „Ne" je volba Ne', P('zadrzneProc', 'ock', { zadrzne: 'Ne', zadrzneProc: '' }).hodnota === idVolby('zadrzneProc', 'Ne'));
test('zádržné: „Ano" + 10 je volba 10%',
  P('zadrzneProc', 'ock', { zadrzne: 'Ano', zadrzneProc: '10' }).hodnota === idVolby('zadrzneProc', '10%'));
test('zádržné: „Ano" bez procenta = důvod', !!P('zadrzneProc', 'ock', { zadrzne: 'Ano', zadrzneProc: '' }).duvod);
test('zádržné: procento, které Pipedrive nenabízí, = důvod s nabídkou voleb',
  /5%.*20%/.test(P('zadrzneProc', 'ock', { zadrzne: 'Ano', zadrzneProc: '12' }).duvod || ''));
test('zádržné po dobu záruky jde do svého pole, ne do VaN',
  P('zadrzneZaruka', 'ock', { zadrzneZaruka: 'Ano', zadrzneZarukaProc: '5' }).hodnota === idVolby('zadrzneZaruka', '5%'));

test('DPH: česká sazba 21 % je volba „21 %"',
  P('sazbaDph', 'ock', { sazbaDph: '21 %', sodDphRezim: 'česká DPH v zákonné sazbě' }).hodnota === idVolby('sazbaDph', '21 %'));
test('DPH: přenesená daňová povinnost je 0 % bez ohledu na sazbu v hlavičce',
  P('sazbaDph', 'ock', { sazbaDph: '21 %', sodDphRezim: 'přenesená daňová povinnost (tuzemsko)' }).hodnota
    === idVolby('sazbaDph', '0 % – přenesená daňová povinnost'));
test('DPH: PROJ bere sazbu 12 %', P('sazbaDph', 'proj', { sazbaDph: '12 %' }).hodnota === idVolby('sazbaDph', '12 %'));
test('DPH: sazba, kterou Pipedrive nezná, = důvod', !!P('sazbaDph', 'proj', { sazbaDph: '15 %' }).duvod);

test('ATYP z kalkulace', P('atyp', 'ock', {}, { atyp: true }).hodnota === idVolby('atyp', 'Ano')
  && P('atyp', 'ock', {}, { atyp: false }).hodnota === idVolby('atyp', 'Ne'));
test('ATYP: kalkulace bez údaje = neposílat', P('atyp', 'ock', {}, {}).prazdne === true);

test('dokumentace: DSP Ano + prováděcí Ne = jen DSP',
  J(P('dokumentace', 'ock', { dsp: 'Ano', provadeciDok: 'Ne' }).hodnota) === J([idVolby('dokumentace', 'DSP')]));
test('dokumentace: obojí Ano = obě volby', P('dokumentace', 'ock', { dsp: 'Ano', provadeciDok: 'Ano' }).hodnota.length === 2);
/* Vícevýběr se v API v2 maže hodnotou null — prázdné pole [] Pipedrive odmítne. */
test('dokumentace: obojí Ne = null (vědomé „nic"), ne []',
  P('dokumentace', 'ock', { dsp: 'Ne', provadeciDok: 'Ne' }).hodnota === null);
test('dokumentace: obojí prázdné = neposílat', P('dokumentace', 'ock', { dsp: '', provadeciDok: '' }).prazdne === true);

test('datum: ISO z pole typu date projde', P('terminPrevzeti', 'ock', { terminPrevzeti: '2026-11-30' }).hodnota === '2026-11-30');
test('datum: „30. 11. 2026" se převede na ISO', P('terminPrevzeti', 'ock', { terminPrevzeti: '30. 11. 2026' }).hodnota === '2026-11-30');
test('datum: neexistující den se nepošle', !!P('terminPrevzeti', 'ock', { terminPrevzeti: '2026-02-31' }).duvod);
test('datum: slovy se nepošle', !!P('terminPrevzeti', 'ock', { terminPrevzeti: 'koncem listopadu' }).duvod);
/* OCK předvyplňuje datum podpisu DATEM TISKU — to není podpis. */
test('datum podpisu OCK: předvyplněné (datum tisku) se neposílá',
  P('datumPodpisu', 'ock', { sodDatumPodpisu: '2026-10-21' }, { rucne: {} }).prazdne === true);
test('datum podpisu OCK: ručně zadané se pošle',
  P('datumPodpisu', 'ock', { sodDatumPodpisu: '2026-10-21' }, { rucne: { sodDatumPodpisu: '2026-10-21' } }).hodnota === '2026-10-21');
test('datum podpisu PROJ: „Zahájení prací (podpis smlouvy)" se pošle',
  P('datumPodpisu', 'proj', { terminZahajeni: '2026-11-02' }).hodnota === '2026-11-02');

test('text: projde, jak je', P('odchylky', 'ock', { odchylky: 'Bez odchylek.' }).hodnota === 'Bez odchylek.');
test('text: do krátkého pole (255 znaků) se nic nezkracuje — důvod',
  /255/.test(P('kopie1', 'ock', { objKopie1: 'x'.repeat(256) }).duvod || ''));
test('text: velké textové pole limit 255 nemá', P('odchylky', 'ock', { odchylky: 'x'.repeat(600) }).hodnota.length === 600);

test('částka: „125 000 Kč" je { value 125000, CZK }',
  J(P('spravniPoplatky', 'proj', { sodpSpravniPoplatky: '125 000 Kč' }).hodnota) === J({ value: 125000, currency: 'CZK' }));
test('částka: měna z textu má přednost', P('spravniPoplatky', 'proj', { sodpSpravniPoplatky: '5 000 EUR' }).hodnota.currency === 'EUR');
test('částka: bez měny v textu platí měna zakázky',
  P('pokutaSoucinnost', 'ock', { sodPokutaDenni: '500' }, {}, { mena: 'EUR' }).hodnota.currency === 'EUR');
test('částka: procento do pole s měnou nepatří', !!P('pokutaSoucinnost', 'ock', { sodPokutaDenni: '0,05 % z ceny díla' }).duvod);
test('platby 1–8 PROJ: s plánem plateb se neposílají',
  P('platba1', 'proj', { sodpPlatba1: '95 880 Kč' }).prazdne === true);
test('platby 1–8 PROJ: nabídka z doby před plánem je pošle',
  P('platba1', 'proj', { sodpPlatba1: '95 880 Kč' }, { planStary: true }).hodnota.value === 95880);
test('záloha PROJ: s plánem plateb se neposílá (pole `stary`)',
  P('zaloha1Proc', 'proj', { zaloha: 'Záloha 50 %' }).prazdne === true);

const LIDE = [{ id: 7, name: 'Jan Vzorový', email: 'jan.vzorovy@priklad.cz' },
  { id: 8, name: 'Eva Zkušební', email: 'eva@priklad.cz' }];
test('uživatel: podle e-mailu', P('odpovednaOsoba', 'proj', { odpovednyEmail: 'Eva@priklad.cz' }, {}, { uzivatele: LIDE }).hodnota === 8);
test('uživatel: podle jména bez titulů a autorizace',
  P('hlavniProjektant', 'proj', { hlavniProjektant: 'Ing. Jan Vzorový, ČKAIT 0001234' }, {}, { uzivatele: LIDE }).hodnota === 7);
test('uživatel: neznámé jméno = důvod, ne nejbližší shoda',
  !!P('nabidkuVypracoval', 'ock', { dodZpracoval: 'Jan Vzor' }, {}, { uzivatele: LIDE }).duvod);
test('uživatel: bez seznamu uživatelů = důvod', !!P('nabidkuVypracoval', 'ock', { dodZpracoval: 'Jan Vzorový' }).duvod);

test('pole v CRM chybí = důvod (jen když je co poslat)',
  !!pdDoPd(DEF.splatnostDni, 'ock', { hodnoty: { splatnostDni: '14' } }, null).duvod
  && pdDoPd(DEF.splatnostDni, 'ock', { hodnoty: { splatnostDni: '' } }, null).prazdne === true);
test('pole jen ke čtení = důvod',
  !!pdDoPd(DEF.splatnostDni, 'ock', { hodnoty: { splatnostDni: '14' } }, { typ: 'double', zapisovatelne: false }).duvod);

console.log('\n===== ZÁPIS CELÉ ZAKÁZKY (JEDEN PATCH) =====\n');

const ock = { hodnoty: { splatnostDni: '14', zaloha1: '50 % – po podpisu smlouvy', typSmlouvy: 'Cizí',
  pokutaLimit: 'NEUPLATNĚN limit 10 %', cisloCN: '2026-OPR-CN-9001', odchylky: '' }, atyp: false };
const proj = { hodnoty: { splatnostDni: '30', typSmlouvy: 'Naše bez úprav', pamatkovaOchrana: 'Zjišťuje se',
  rozsahJine: 'Konzultace na stavbě', cisloCN: 'OVP-CN-9002' } };
const z = pdZapisDealu(POLE_DEALU, { ock, proj }, pole, {});
const H = (klic) => pole.mapa[klic];
test('kombinovaná zakázka: u společných polí rozhoduje OCK',
  z.custom_fields[H('splatnostDni')] === 14 && z.custom_fields[H('cisloNabidky')] === '2026-OPR-CN-9001'
  && z.custom_fields[H('typSmlouvy')] === idVolby('typSmlouvy', 'Smlouva zákazníka'), J(z.custom_fields));
test('kombinovaná zakázka: pole jen PROJ se vezme z PROJ', z.custom_fields[H('rozsahJine')] === 'Konzultace na stavbě');
test('prázdné hodnoty v zápisu nejsou (ani jako null)', !(H('odchylky') in z.custom_fields));
test('co nejde převést, v zápisu není a vrátí se s důvodem',
  !(H('pamatkovaOchrana') in z.custom_fields)
  && z.duvody.some((d) => d.klic === 'pamatkovaOchrana' && /Zjišťuje se/.test(d.duvod)), J(z.duvody));
test('pole čtená z CRM (typ zakázky, objednatel) se nikdy nezapisují',
  !(H('typZakazky') in z.custom_fields) && !(H('objednatelFirma') in z.custom_fields)
  && !(H('kontaktSmluvni') in z.custom_fields));
test('zápis nese jen hashe polí z mapy', Object.keys(z.custom_fields).every((k) => /^[0-9a-f]{40}$/.test(k)));
test('OCK s nepřevoditelnou hodnotou nenahradí hodnota PROJ',
  (() => { const r = pdZapisDealu(POLE_DEALU, { ock: { hodnoty: { splatnostDni: 'dle dohody' } },
    proj: { hodnoty: { splatnostDni: '30' } } }, pole);
  return !(H('splatnostDni') in r.custom_fields) && r.duvody.some((d) => d.klic === 'splatnostDni' && d.strana === 'ock'); })());
test('pole, které v CRM chybí, se ohlásí',
  (() => { const bez = { mapa: { ...pole.mapa }, popisy: pole.popisy }; delete bez.mapa.splatnostDni;
    return pdZapisDealu(POLE_DEALU, { ock }, bez).duvody.some((d) => d.klic === 'splatnostDni'); })());

console.log('\n===== KŘÍŽOVÁ KONTROLA S KRYCÍMI LISTY =====\n');

const R = new URL('..', import.meta.url).pathname;
const require = createRequire(R + 'netlify/x.mjs');
const eng = require(R + 'src/engine.js'); const ZC = require(R + 'src/zkusebni_cenik.js');
globalThis.vypocet = eng.vypocet; globalThis.DEFAULT_ZADANI = eng.DEFAULT_ZADANI; globalThis.DEFAULT_CENIK = ZC.zkusebniCenik();
const ep = require(R + 'src/engine_proj.js');
globalThis.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; globalThis.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
globalThis.vypocetProj = ep.vypocetProj;
const tsm = require(R + 'src/techspec.js');
globalThis.TECHSPEC_DEF = tsm.TECHSPEC_DEF; globalThis.tsHodnota = tsm.tsHodnota; globalThis.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
const fm = require(R + 'src/firma.js'); Object.keys(fm).forEach((k) => { globalThis[k] = fm[k]; });
const kr = require(R + 'src/kryci.js');
const kp = require(R + 'src/kryci_proj.js');
const PM = require(R + 'src/podminky.js').PODMINKY;

const poleListu = (sekce) => new Map(sekce.flatMap((s) => s.pole || []).map((p) => [p.id, p]));
const KL = { ock: poleListu(kr.KRYCI_SEKCE), proj: poleListu(kp.KRYCI_PROJ_SEKCE) };
const neexistuje = [];
for (const d of POLE_DEALU) for (const strana of ['ock', 'proj']) {
  for (const id of [].concat((d.kl && d.kl[strana]) || [])) if (!id.startsWith('@') && !KL[strana].has(id)) neexistuje.push(strana + ':' + id);
}
test('každé pole krycího listu, ze kterého mapa bere hodnotu, existuje', neexistuje.length === 0, neexistuje.join(', '));

const volbyListu = (strana, id) => KL[strana].get(id).o;
const prevedeVse = (klic, strana, id) => volbyListu(strana, id).map((o) => [o, P(klic, strana, { [id]: o })]);
const vadne = (seznam) => seznam.filter(([, r]) => r.hodnota === undefined).map(([o, r]) => o + ' → ' + J(r));
for (const [klic, strana, id] of [['zpusobFakturace', 'ock', 'zpusobFakturace'], ['typSmlouvy', 'ock', 'typSmlouvy'],
  ['typSmlouvy', 'proj', 'typSmlouvy'], ['typProjektu', 'ock', 'typProjektu'], ['typProjektu', 'proj', 'typProjektu'],
  ['zamereniStrojovna', 'ock', 'zamereniStrojovna']]) {
  const v = vadne(prevedeVse(klic, strana, id));
  test('volby krycího listu ' + strana.toUpperCase() + ' „' + KL[strana].get(id).label + '" mají protějšek v Pipedrive',
    v.length === 0, v.join('; '));
}
/* Známá mezera: krycí list PROJ zná „Zjišťuje se", Pipedrive ne (požádáno
 * integrátora 21. 10. 2026). Až volbu doplní, změní se tenhle test. */
const pam = prevedeVse('pamatkovaOchrana', 'proj', 'pamatkovaOchrana');
test('památková ochrana: Ano a Ne sedí, „Zjišťuje se" v Pipedrive (zatím) není',
  vadne(pam).length === 1 && /^Zjišťuje se/.test(vadne(pam)[0]), vadne(pam).join('; '));

const ef = PM.podminkyEf({});
const zalohy = PM.podminkyZalohyVolby(ef).map((t) => P('zaloha1Proc', 'ock', { zaloha1: t }).hodnota);
test('všechny volby zálohy OCK se převedou na procento', J(zalohy) === J(ef.ock.zalohyProc), J(zalohy));
test('výchozí 2. a konečná faktura OCK se převedou',
  P('faktura2Proc', 'ock', { faktura2: PM.podminkyFaktura2(ef) }).hodnota === ef.ock.faktura2Proc
  && P('fakturaKoncProc', 'ock', { fakturaKonc: PM.podminkyKonecna(ef) }).hodnota === ef.ock.konecnaProc);
const pokuty = ef.sazbyPokut.map((t) => P('pokutaProcDen', 'ock', { pokutaDodavka: t }).hodnota);
test('všechny sazby smluvní pokuty se převedou', J(pokuty) === '[0,0.05,0.1]', J(pokuty));
const limity = PM.podminkyLimitVolby(ef).map((t) => P('pokutaLimit', 'ock', { pokutaLimit: t }).hodnota);
test('limit pokut: uplatněný = 10, neuplatněný = 0', J(limity) === '[10,0]', J(limity));
const rezimy = volbyListu('ock', 'sodDphRezim').map((r) => P('sazbaDph', 'ock', { sazbaDph: '21 %', sodDphRezim: r }).hodnota);
test('režimy DPH smlouvy OCK: česká 21 %, přenesená i reverse charge 0 %',
  J(rezimy) === J([idVolby('sazbaDph', '21 %'), idVolby('sazbaDph', '0 % – přenesená daňová povinnost'),
    idVolby('sazbaDph', '0 % – přenesená daňová povinnost')]), J(rezimy));
test('licence PROJ: výchozí znění z Firmy je „Nevýhradní…"',
  P('licence', 'proj', { autorskaPrava: PM.PODMINKY_VYCHOZI.proj.licence }).hodnota === idVolby('licence', 'Nevýhradní – pro účel stavby dle smlouvy'));
test('pojištění PROJ: výchozí „ANO – dle…" je „Ano – dle…"',
  P('pojisteni', 'proj', { pojisteni: PM.PODMINKY_VYCHOZI.proj.pojisteni }).hodnota === idVolby('pojisteni', 'Ano – dle pojistné smlouvy zhotovitele'));
test('způsob fakturace PROJ: výchozí věta „po dokončení jednotlivých stupňů…" má protějšek',
  P('zpusobFakturace', 'proj', { zpusobFakturace: 'po dokončení jednotlivých stupňů dokumentace' }).hodnota
    === idVolby('zpusobFakturace', 'Po dokončení stupňů dokumentace'));
test('zálohy PROJ z doby před plánem se převedou',
  J(volbyListu('proj', 'zaloha').map((t) => P('zaloha1Proc', 'proj', { zaloha: t }, { planStary: true }).hodnota))
    === '[0,30,50,70]');
test('termín dodání s ATYP z krycího listu se převede na jedno číslo',
  P('terminDodaniTydny', 'ock', { terminDodani: kr.kryciTerminDodaniText('12', true, 4) }).hodnota === 16,
  kr.kryciTerminDodaniText('12', true, 4));
test('platnost nabídky PROJ („2 měsíce") se převede', P('platnostMesicu', 'proj', { platnostNabidky: kp.kryciProjMesicu(2) }).hodnota === 2);

console.log(`\n${ok} prošlo, ${fail} selhalo`);
if (fail) console.log('\nSelhalo:\n - ' + selhalo.join('\n - '));
process.exit(fail ? 1 : 0);
