/* KRYCÍ LIST ZAKÁZKY OCK A POLE „ČÍSLO SoD" (zadání J. V. 15. 10. 2026,
 * dávka S7, v15.10.9): „Krycí list objednávky / SoD přejmenuj na Krycí list
 * zakázky OCK. Pod číslo nabídky přidej i položku a okno Číslo SOD. To platí
 * jak pro OCK, tak pro PROJ."
 *
 * Hlídá:
 *  1) nadpis listu OCK (stránka, dokument, registr zámku) nese nový název
 *     a starý se nikde nevypisuje,
 *  2) pole `cisloSod` stojí v Základních údajích HNED za `cisloCN` v obou
 *     listech, bez vazby na hlavičku (od v17.10.2 jen s NÁVRHEM z čísla
 *     nabídky, #366 — podrobně test_cislo_sod_navrh.js) a patří do verze
 *     Backoffice i Techdata,
 *  3) zapsané číslo se objeví ve výstupu krycího listu (obě verze),
 *  4) pole jde doplnit i u odeslané nabídky (sekce není v nabídce) a tisk
 *     smlouvy o dílo ho zamkne,
 *  5) číslo naplní symbol čísla smlouvy ve SoD realizace i projekce; prázdné
 *     pole symbol nechá ve Wordu vidět {{…}}.
 *
 * Spuštění: cd src && node test_kryci_cislo_sod.js */
const fs = require('fs');
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
nacti('./preklad.js'); nacti('./format.js'); nacti('./engine.js'); nacti('./engine_proj.js');
nacti('./techspec.js');
const zk = nacti('./zakazka.js');
const ZM = nacti('./zamek.js');
nacti('./sleva.js'); nacti('./zaokrouhleni.js'); nacti('./firma.js'); nacti('./zpracovatel.js');
nacti('./plan_plateb.js');
const K = nacti('./kryci.js');
const KP = nacti('./kryci_proj.js');
nacti('./dokumenty.js'); nacti('./nabidka.js'); nacti('./nabidka_proj.js');
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./sod.js');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };

const STARY = 'Krycí list objednávky / SoD';
const NOVY = 'Krycí list zakázky OCK';
/* Symboly čísla smlouvy v šablonách SoD (ověřeno nad šablonami z Disku). */
const SYM_OCK = 'SOD_CISLO_SMLOUVY';
const SYM_PROJ = 'SOD_CISLO_SMLOUVY';

/* ---- 1) nadpisy ---- */
const ui = fs.readFileSync(__dirname + '/ui/kryci_ui.js', 'utf8');
test('stránka krycího listu OCK má nadpis „' + NOVY + '"', ui.indexOf('<h1>' + NOVY + '</h1>') >= 0);
test('starý nadpis „' + STARY + '" se na stránce nevypisuje', ui.indexOf('<h1>' + STARY) < 0);
test('registr zámku: krycí list OCK se jmenuje „' + NOVY + '"',
  ZM.ZAMEK_DOKUMENTY.kryci && ZM.ZAMEK_DOKUMENTY.kryci.popis === NOVY, ZM.ZAMEK_DOKUMENTY.kryci);

const zak = zk.novaZakazka();
zak.cislo = '2026 - OPR - CN - 0366';
zak.objednatel = 'SVJ Zkušební 7'; zak.adresa = 'Zkušební 7, Zkušebín';
zak.nazevAkce = 'Zkušební akce — číslo SoD';
Object.assign(zak.projHlavicka, { cislo: '2026 OVP CN 0366', objednatel: 'SVJ Zkušební 7',
  adresa: 'Zkušební 7, Zkušebín', nazevAkce: 'Zkušební projekce — číslo SoD' });
const v = zak.varianty[0];
global.NAST = { firma: global.firmaDefault() };

const dBo = K.kryciData(zak, v, JEKLY, 'bo'), dTd = K.kryciData(zak, v, JEKLY, 'techdata');
test('dokument krycího listu OCK: nadpis „' + NOVY + ' — Backoffice / Techdata"',
  dBo.nadpis === NOVY + ' — Backoffice' && dTd.nadpis === NOVY + ' — Techdata', [dBo.nadpis, dTd.nadpis]);

/* ---- 2) pole v obou listech ---- */
[['OCK', K.KRYCI_SEKCE], ['PROJ', KP.KRYCI_PROJ_SEKCE]].forEach(([jm, def]) => {
  const zakl = (def.find(s => s.sekce === 'Základní údaje') || { pole: [] }).pole;
  const i = zakl.findIndex(p => p.id === 'cisloCN');
  const p = zakl[i + 1] || {};
  test(jm + ': „Číslo SoD" stojí v Základních údajích hned pod „Číslo nabídky (CN)"',
    i >= 0 && p.id === 'cisloSod' && p.label === 'Číslo SoD', zakl.map(x => x.id).join(','));
  test(jm + ': „Číslo SoD" je přepisovatelné pole s návrhem (bez vazby na hlavičku)',
    typeof p.prefill === 'function' && !p.bind && !p.dphBind && !p.vypocet && p.src === 'návrh z čísla nabídky', p);
  test(jm + ': „Číslo SoD" patří do verze BO i Tech',
    Array.isArray(p.verze) && p.verze.indexOf('bo') >= 0 && p.verze.indexOf('techdata') >= 0, p.verze);
  test(jm + ': id „cisloSod" je v listu jen jednou',
    def.reduce((n, s) => n + s.pole.filter(x => x.id === 'cisloSod').length, 0) === 1);
});

/* ---- 3) výstupy krycího listu ---- */
const radek = (d, label) => { for (const s of d.sekce) for (const r of (s.radky || [])) if (r[0] === label) return r; return null; };
{
  const prazdne = radek(dBo, 'Číslo SoD');
  test('OCK: nevyplněné číslo SoD nese ve výstupu návrh z čísla nabídky (#366)', !!prazdne && prazdne[1] === '2026 - OPR - SOD - 0366', prazdne);
  v.data.kryci = { hodnoty: { cisloSod: '2026 - OPR - SOD - 0007' } };
  v.data.kryciProj = { hodnoty: { cisloSod: '2026 OVP SOD 0007' } };
  ['bo', 'techdata'].forEach(ver => {
    const r = radek(K.kryciData(zak, v, JEKLY, ver), 'Číslo SoD');
    test('OCK ' + ver + ': výstup nese zapsané číslo SoD', !!r && r[1] === '2026 - OPR - SOD - 0007', r);
    const rp = radek(KP.kryciProjData(zak, v, JEKLY, ver), 'Číslo SoD');
    test('PROJ ' + ver + ': výstup nese zapsané číslo SoD', !!rp && rp[1] === '2026 OVP SOD 0007', rp);
  });
}

/* ---- 4) zámek ---- */
const zamcena = (typy) => {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 0367';
  const w = z.varianty[0];
  typy.forEach(typ => ZM.zamkniVariantu(w, { typ }));
  return w;
};
['nabidka', 'nabidkaTisk', 'nabidkaProj', 'nabidkaProjTisk'].forEach(typ => {
  const w = zamcena([typ]);
  test(typ + ': číslo SoD jde doplnit v obou listech (není v nabídce)',
    ZM.zamekKryciPoleVolne(w, 'kryci', 'cisloSod') && ZM.zamekKryciPoleVolne(w, 'kryciProj', 'cisloSod'));
});
[['nabidka', 'sod'], ['nabidkaProjTisk', 'sodProj']].forEach(typy => {
  const w = zamcena(typy);
  test(typy.join(' + ') + ': po tisku SoD je číslo SoD zamčené',
    !ZM.zamekKryciPoleVolne(w, 'kryci', 'cisloSod') && !ZM.zamekKryciPoleVolne(w, 'kryciProj', 'cisloSod'));
});
{
  const w = zamcena(['nabidkaTisk']);
  w.data.kryci = { hodnoty: {} }; w.data.kryciProj = { hodnoty: {} };
  const pred = ZM.zamekDataPorovnani(w.data, w);
  const d = JSON.parse(JSON.stringify(w.data));
  d.kryci.hodnoty.cisloSod = 'X-1'; d.kryciProj.hodnoty.cisloSod = 'Y-1';
  test('odeslaná nabídka: doplněné číslo SoD serverová pojistka nehlídá (porovnání shodné)',
    ZM.zamekDataPorovnani(d, w) === pred);
}

/* ---- 5) smlouvy o dílo ---- */
{
  const z2 = JSON.parse(JSON.stringify(zak)), v2 = z2.varianty[0];
  /* Bez čísla nabídky není z čeho navrhnout (#366) — symbol zůstane vidět. */
  z2.cislo = zk.ZAK_CISLO_PREDLOHA || '2026 - OPR - CN - '; z2.projHlavicka.cislo = '';
  v2.data.kryci = { hodnoty: {} }; v2.data.kryciProj = { hodnoty: {} };
  const sod0 = sodData(z2, v2, JEKLY, 'cz'), sodP0 = sodProjData(z2, v2, 'cz');
  test('SoD realizace: prázdné číslo SoD nechá {{' + SYM_OCK + '}} k doplnění', sod0.placeholders[SYM_OCK] === undefined);
  test('SoD projekce: prázdné číslo SoD nechá {{' + SYM_PROJ + '}} k doplnění', sodP0.placeholders[SYM_PROJ] === undefined);
  v2.data.kryci.hodnoty.cisloSod = '  2026 - OPR - SOD - 0009 ';
  v2.data.kryciProj.hodnoty.cisloSod = '2026 OVP SOD 0009';
  const sod = sodData(z2, v2, JEKLY, 'cz'), sodP = sodProjData(z2, v2, 'cz');
  test('SoD realizace: {{' + SYM_OCK + '}} = číslo SoD z krycího listu OCK',
    sod.placeholders[SYM_OCK] === '2026 - OPR - SOD - 0009', sod.placeholders[SYM_OCK]);
  test('SoD projekce: {{' + SYM_PROJ + '}} = číslo SoD z krycího listu PROJ (ne OCK)',
    sodP.placeholders[SYM_PROJ] === '2026 OVP SOD 0009', sodP.placeholders[SYM_PROJ]);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
