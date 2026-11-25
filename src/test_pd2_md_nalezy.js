/* PD2 #782 — nízké nálezy revize MD (#778): N2 a N4. (N1 hlídá
 * test_767_priplatky_vic_sachet.js, N5 porovnávací sada k58:* a
 * proj:zamek-cislo-ock.)
 *   N4  kontrola „dodatekCesky“ u odeslané nabídky víc šachet BEZ značky
 *       `priplatkyVyber` ve snímku zámku bere týž výběr jako tisk (postaru) —
 *       příplatek zaškrtnutý jen v další šachtě, který se nevytiskne, nehlásí;
 *       neodeslaná a nový zámek (se značkou) hlásí podle sjednocení šachet.
 *   N2  hláška 409 „snímek podmínek … nesedí“ radí obnovit stránku (Ctrl+F5).
 * Pojistka: před PD2 hlásí N4 i u staré odeslané nabídky a hláška N2 Ctrl+F5 nemá.
 * Spuštění: node src/test_pd2_md_nalezy.js */
'use strict';
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js'); nacti('./preklad.js'); const E = nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik(); nacti('./engine_proj.js'); global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const V = nacti('./vice_sachet.js'); nacti('./techspec.js'); nacti('./sleva.js'); nacti('./zaokrouhleni.js'); nacti('./firma.js');
const ZK = nacti('./zakazka.js'); nacti('./zamek.js'); nacti('./nabidka.js');
const K = nacti('./kontroly.js');
const J = require('./jekly.json');
const fs = require('fs'), path = require('path');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
const kop = x => JSON.parse(JSON.stringify(x));
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
const VSG = 'Sklo VSG s mléčnou fólií';

function zakazka() {
  const zak = ZK.novaZakazka(); zak.cislo = '2026-OPR-CN-9778'; zak.nazevAkce = 'PD2 MD N4';
  const v = zak.varianty[0];
  v.data.cenik = ZC.zkusebniCenik(); v.data.ock.fixes = true;
  v.data.cenik.popisy = Object.assign({}, v.data.cenik.popisy, { [VSG]: 'Zkušební věta bez překladu do slovníku QX782' });
  Object.assign(v.data.ock.zadani, ZAD);
  const vse = E.vypocet(v.data.ock.zadani, v.data.cenik, J, true).priplatky.map(p => p.key);
  v.data.ock.nazev = 'A';
  v.data.ock.zadani.priplatkyVynechat = vse.filter(k => k !== 'skn');            // A: jen SKN
  const z2 = kop(v.data.ock.zadani); z2.priplatkyVynechat = vse.filter(k => k !== 'vsgFolie');   // B: jen VSG
  v.data.ock.dalsi = [{ id: 's_b', nazev: 'B', ks: 2, zadani: z2 }];
  return { zak, v };
}
const dodatek = (zak, v) => {
  const r = V.vypocetOckDat(v.data, J);
  const n = K.kontrolyProved({ zak, zadani: v.data.ock.zadani, vysledek: r, jazyk: 'en', viceSachet: true });
  return (n.nalezy || []).find(x => x.kod === 'dodatekCesky') || null;
};
{
  const { zak, v } = zakazka();
  const f = dodatek(zak, v);
  test('N4: neodeslaná nabídka — VSG (jen šachta B) se tiskne a dodatek hlásí', !!f && /VSG/.test(f.text), f);
  v.zamek = { zamceno: true, typ: 'nabidka', kdy: '2026-11-20T10:00:00Z', snimek: {} };   // starší zámek bez značky
  const s = dodatek(zak, v);
  test('N4: odeslaná bez značky priplatkyVyber (tiskne se postaru, VSG ne) → dodatek VSG nehlásí', !s || !/VSG/.test(s.text), s);
  v.zamek.snimek = { priplatkyVyber: 1 };
  const t = dodatek(zak, v);
  test('N4: odeslaná se značkou (nový zámek) → hlásí podle sjednocení šachet', !!t && /VSG/.test(t.text), t);
}
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'netlify', 'lib', 'zakazka_kontrola.mjs'), 'utf8');
  const i = src.indexOf('snímek podmínek nové odeslané nabídky nesedí');
  test('N2: hláška 409 „snímek podmínek … nesedí“ radí obnovit stránku (Ctrl+F5)', i > 0 && /Ctrl\+F5/.test(src.slice(i, i + 400)), src.slice(i, i + 400));
}
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
