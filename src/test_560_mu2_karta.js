/* MU2 #560 — STAVBA KARTY MŮSTKY (J. V. 6. 11. 2026: „zadání můstků je
 * nečitelné a ovládací prvky v samostatné sekci jsou rozmístěny chaoticky").
 *
 * Tělo karet zadání je mřížka sloupců po 300 px (`.inputs .card .body`);
 * do v5.11.3 se tabulka skupin, tlačítko „+ další provedení" a upozornění
 * o ceníku sázely jako tři samostatné buňky mřížky — tlačítko a upozornění
 * tak stály přes sloupce tabulky. Rozložení v prohlížeči hlídá
 * overit_560_mustky.mjs (bod 7); tahle sada ověřuje stavbu HTML karty bez
 * prohlížeče (vykreslí mustkyKarta ve vm), aby ji hlídaly i mutace jádra:
 *  – jeden obal `.mustky-karta`, šablona ho roztáhne přes celou mřížku,
 *  – lišta upozornění PŘED tabulkou, tabulka v posuvném kontejneru,
 *    tlačítko ZA ní (malé, `mini`, netiskne se), ✕ v posledním sloupci,
 *  – záhlaví má tolik sloupců jako řádek, krátké popisky voleb,
 *  – prázdná šířka šachty → nápověda „jako šachta", ne „0",
 *  – Model 1: jen počet a délka, lišta, bez tlačítka.
 * Pojistka: na 6b70cc3 selže (obal, lišta ani třídy neexistují, tlačítko
 * `sm`, nápověda „0"); po opravě projde.
 * Spuštění: cd src && node test_560_mu2_karta.js */
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const E = require('./engine.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ctx = vm.createContext(Object.assign({ console, esc,
  kartaRezim: (oblast, key, titul, obsah, id) => '<karta id="' + id + '">' + obsah + '</karta>' }, E));
vm.runInContext(fs.readFileSync(path.join(__dirname, 'ui', 'kalk_ock.js'), 'utf8'), ctx, { filename: 'kalk_ock.js' });
const karta = (z, fixes, skladebny) => {
  ctx.Z = Object.assign({ sirka: 1.6, zdvih: 12 }, z); ctx.OCK = { fixes };
  return ctx.mustkyKarta({ mustky: { skladebny: !!skladebny } });
};
const SK = [{ ks: 3, delkaMm: 1200 }, { ks: 1, podlaha: 'vana', zabradli: 'sklo', kotveni: 'deska', sloupyKs: 2 },
  { ks: 2, podlaha: 'jine', podlahaNazev: 'dřevo' }];

const h = karta({ mustky: SK }, true, false);
const vnitrek = h.replace(/^<karta id="ock-mustky">/, '').replace(/<\/karta>$/, '');
test('jeden obal .mustky-karta přes celý obsah karty', /^<div class="mustky-karta">[\s\S]*<\/div>$/.test(vnitrek)
  && vnitrek.split('<div class="mustky-karta">').length === 2, vnitrek.slice(0, 80));
const iL = vnitrek.indexOf('class="mustky-lista'), iT = vnitrek.indexOf('<table'), iTk = vnitrek.indexOf('</table>'), iB = vnitrek.indexOf('další provedení');
test('lišta upozornění před tabulkou, tlačítko za tabulkou', iL >= 0 && iL < iT && iTk < iB, [iL, iT, iTk, iB]);
test('tlačítko je uvnitř obalu hned pod tabulkou', /<\/table><\/div><div class="mustky-pridat noprint">[\s\S]*<\/div><\/div>$/.test(vnitrek));
test('tabulka ve vodorovně posuvném kontejneru', /<div class="mustky-scroll"><table class="mustky-tbl">/.test(vnitrek));
test('upozornění o starém ceníku je lišta (varování)', /class="mustky-lista varovani"/.test(vnitrek));
test('„+ další provedení" je malé tlačítko (mini), netiskne se', /<div class="mustky-pridat noprint"><button class="mini" onclick="mustekSkupinaPridej\(\)">\+ další provedení<\/button><\/div>/.test(vnitrek));
const radky = vnitrek.match(/<tr>[\s\S]*?<\/tr>/g) || [];
const pocetTh = (radky[0].match(/<th>/g) || []).length;
test('záhlaví má tolik sloupců jako každý řádek', radky.slice(1).every(r => (r.match(/<td[\s>]/g) || []).length === pocetTh), pocetTh);
test('✕ v posledním sloupci, malé, netiskne se', radky.slice(1).every(r => /<td class="mu-akce"><button class="mini mu-odebrat noprint"[^>]*>✕<\/button><\/td><\/tr>$/.test(r.replace(/\s+/g, ' ').replace(/> </g, '><'))));
test('krátké popisky voleb (select se nezkracuje), plné znění zůstává jádru',
  /ocelová vana \(beton stavba\)/.test(vnitrek) && /do stropní desky \/ věnce</.test(vnitrek)
  && !/ocelová vana pro beton \(betonáž zajistí stavba\)</.test(vnitrek)
  && E.MUSTEK_PODLAHY.find(x => x[0] === 'vana')[1] === 'ocelová vana pro beton (betonáž zajistí stavba)');
test('pole „jiné" je pod volbou v téže buňce', /<\/select><input type="text" class="mu-text"[^>]*value="dřevo"/.test(vnitrek.replace(/\s+/g, ' ').replace(/> </g, '><')));
test('uživatelský text bez čísel roadmapy', !/#\d{3}/.test(vnitrek.replace(/<[^>]+>/g, '')));
const bezSirky = karta({ sirka: 0, mustky: [{ ks: 1 }] }, true, false);
test('prázdná šířka šachty: nápověda „jako šachta", ne „0"', /class="mu-sirkaMm"[^>]*placeholder="jako šachta"/.test(bezSirky.replace(/\s+/g, ' ')), bezSirky.slice(0, 200));
const m1 = karta({ mustky: SK }, false, false);
test('Model 1: jen ks a délka, lišta nad tabulkou, bez „+ další provedení"', /<tr><th>ks<\/th><th>délka \[mm\]<\/th><th><\/th><\/tr>/.test(m1)
  && m1.indexOf('mustky-lista') < m1.indexOf('<table') && !/další provedení/.test(m1));
const skl = karta({ mustky: SK.slice(0, 1) }, true, true);
test('skladebný ceník: informační lišta (ne varování), jedna skupina bez ✕', /class="mustky-lista">Cena se skládá/.test(skl) && !/✕/.test(skl));

const css = fs.readFileSync(path.join(__dirname, 'app_template.html'), 'utf8');
test('šablona: obal karty přes celou mřížku těla karty', /\.mustky-karta \{ grid-column:1 \/ -1;/.test(css));
test('šablona: tabulka se posouvá jen v kartě', /\.mustky-scroll \{ overflow-x:auto;/.test(css));
test('šablona: záhlaví i pole zarovnané vlevo, selecty se nezkracují',
  /table\.mustky-tbl th, table\.mustky-tbl td \{ text-align:left;/.test(css) && /table\.mustky-tbl select \{ width:auto; min-width:120px; \}/.test(css));
const kod = fs.readFileSync(path.join(__dirname, 'ui', 'kalk_ock.js'), 'utf8');
test('součet v zadání šachty: krátká bublina', kod.includes("'součet skupin z karty Můstky'") && !kod.includes('počet měňte v kartě Můstky'));

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
