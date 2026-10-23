/* CENA V EUR V DLAŽDICI „Základní cena bez DPH" (D5, zadání J. V. 22. 10. 2026).
 *
 * U zahraniční zakázky (ceník „Zahraničí" nebo jazyk tisku ≠ česky — eurová
 * nabídka) stojí v hlavní dlaždici Kalkulace OCK i PROJ pod částkou malým
 * písmem vpravo cena v EUR — kurz a zaokrouhlení jako cenová nabídka v eurech
 * (menaDokumentu, kurzEurZ: kurz odeslané nabídky, celá eura nahoru).
 * U tuzemské zakázky nic. Cena bez DPH se ukazuje každému, kdo dlaždici vidí
 * — kpiEurHtml se na práva (smiZobrazit) neptá.
 *
 * Pojistka: před D5 sada selže hned na první kontrole (kpiEurHtml v ui/common.js chybí). */
const fs = require('fs');
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
['./preklad.js', './format.js', './engine.js', './engine_proj.js', './zakazka.js', './zamek.js'].forEach(nacti);

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const src = fs.readFileSync(__dirname + '/ui/common.js', 'utf8').replace(/\r\n/g, '\n');
const vytahniConst = jm => { const i = src.indexOf('const ' + jm + ' ='); if (i < 0) throw new Error('chybí const ' + jm);
  const z = src.slice(i); return z.slice(0, z.match(/;\n/).index + 1); };
const vytahniFn = jm => { const m = src.match(new RegExp('function ' + jm + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}')); if (!m) throw new Error('chybí function ' + jm); return m[0]; };
let F = null;
try {
  F = (0, eval)('(() => { let JAZYK_TISKU = "cz"; const tiskJazyk = () => JAZYK_TISKU; ' + vytahniConst('esc') + vytahniConst('STRANA_NULOVANI')
    + (/const KPI_EUR_BUBLINA = '[^']*';/.exec(src) || [''])[0] + vytahniFn('zakazkaZahranicni') + vytahniFn('kpiEurHtml')
    + '; return { kpiEurHtml, zakazkaZahranicni, STRANA_NULOVANI, jazyk: j => { JAZYK_TISKU = j; } }; })()');   // eslint-disable-line no-eval
} catch (e) { test('kpiEurHtml a zakazkaZahranicni jsou v ui/common.js', false, e.message); }

if (F) {
  const v = (rada, kurzZamek) => ({ data: { cenikRada: rada }, zamek: kurzZamek ? { zamceno: true, vysledek: { kurzEurKc: kurzZamek } } : null });
  const eur = h => (h.match(/<div class="v-eur"[^>]*>([^<]*)<\/div>/) || [])[1];
  test('tuzemská zakázka (řada ČR, tisk česky): nic', F.kpiEurHtml(1234000, v('cr'), 25) === '');
  const h = F.kpiEurHtml(1234000, v('zahr'), 25);
  test('ceník Zahraničí: cena v EUR malým písmem (třída v-eur), celá eura nahoru', eur(h) === '€ ' + Math.ceil(1234000 / 25).toLocaleString('cs-CZ'), h);
  test('převod je týž jako cenová nabídka v eurech (menaDokumentu)', eur(h) === menaDokumentu('en', 25).fmt(menaDokumentu('en', 25).na(1234000)));
  test('zaokrouhlení nahoru i u necelých eur', eur(F.kpiEurHtml(1001, v('zahr'), 25)) === '€ 41', F.kpiEurHtml(1001, v('zahr'), 25));
  test('odeslaná nabídka: kurz ze zámku (kurzEurZ), ne z dnešního ceníku', eur(F.kpiEurHtml(1000, v('zahr', 20), 25)) === '€ 50');
  F.jazyk('en');
  test('řada ČR, ale jazyk tisku anglicky (eurová nabídka): cena v EUR', eur(F.kpiEurHtml(1000, v('cr'), 25)) === '€ 40');
  F.jazyk('cz');
  test('bez kurzu se euro nevymýšlí — „chybí kurz EUR"', /chybí kurz EUR/.test(F.kpiEurHtml(1000, v('zahr'), 0)) && !/€ \d/.test(F.kpiEurHtml(1000, v('zahr'), 0)));
  F.STRANA_NULOVANI.aktivni = true;
  test('vynulovaná strana: € 0 (jako Kč)', eur(F.kpiEurHtml(1000, v('zahr'), 25)) === '€ 0');
  F.STRANA_NULOVANI.aktivni = false;
  test('na práva se neptá (cena bez DPH je vidět každému, kdo vidí dlaždici)', !/smiZobrazit|jeAdmin|zobrazeniRole/.test(vytahniFn('kpiEurHtml') + vytahniFn('zakazkaZahranicni')));
}
/* Obě dlaždice volají kpiEurHtml hned za hlavní částkou, se svou částkou a kurzem. */
const ock = fs.readFileSync(__dirname + '/ui/kalk_ock.js', 'utf8');
const proj = fs.readFileSync(__dirname + '/ui/kalk_proj.js', 'utf8');
test('Kalkulace OCK: dlaždice Základní cena bez DPH nese EUR (kpiEurHtml(zaklad, …, C.kurzEurKc))',
  /<div class="kpi main"><div class="l">Základní cena bez DPH<\/div><div class="v">\$\{fmt0\(zaklad\)\}<\/div>\$\{kpiEurHtml\(zaklad, aktivniVarianta\(ZAK\), C\.kurzEurKc\)\}<\/div>/.test(ock));
test('Kalkulace PROJ: dlaždice Základní cena bez DPH nese EUR (kpiEurHtml(r.souhrn.cena, …, PC.kurzEurKc))',
  /<div class="kpi main"><div class="l">Základní cena bez DPH<\/div><div class="v">\$\{fmt0\(r\.souhrn\.cena\)\}<\/div>\$\{kpiEurHtml\(r\.souhrn\.cena, aktivniVarianta\(ZAK\), PC\.kurzEurKc\)\}<\/div>/.test(proj));
const tpl = fs.readFileSync(__dirname + '/app_template.html', 'utf8');
test('styl: malé písmo zarovnané doprava', /\.kpi \.v-eur \{[^}]*font-size:12px[^}]*text-align:right/.test(tpl));
/* K7-K5 (#508, J. V. 23. 10. 2026): bublina říká „přepočet základní ceny" a že nabídka může být
 * obchodně zaokrouhlená — ne „jako v cenové nabídce". Před opravou FAIL, po ní OK. */
if (F) {
  const b = (/title="([^"]*)"/.exec(F.kpiEurHtml(1000, { id: 'x', data: { cenikRada: 'zahr', cenik: {} } }, 25)) || [])[1] || '';
  test('K7-K5: bublina EUR = přepočet základní ceny, nabídka může být obchodně zaokrouhlená',
    /přepočet základní ceny/.test(b) && /obchodně zaokrouhlen/.test(b) && !/jako v cenové nabídce/.test(b), b);
}
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
