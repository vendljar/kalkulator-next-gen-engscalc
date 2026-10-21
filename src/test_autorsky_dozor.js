/* AUTORSKÝ DOZOR V NABÍDCE PROJ JEN KDYŽ SE NABÍZÍ (připomínka D. Sikory
 * a J. Laudy, rozhodnutí J. V. 14. 10. 2026).
 *
 * Do 14. 10. tiskla nabídka PROJ (online i Word) a technická verze krycího
 * listu PROJ blok AUTORSKÝ DOZOR (AD) — popis, měsíční sazbu a platební
 * podmínky — vždy, i zákazníkovi, kterému se dozor nenabízel. Nově:
 *   - volba „Nabízet autorský dozor" v zadání PROJ varianty
 *     (proj.zadani.nabizetAD), NOVÁ varianta ji má false (výchozí NE);
 *   - stará data bez volby tisknou AD jako dřív (uložené i odeslané nabídky
 *     se nemění — hlídá test otisku níž);
 *   - šablona PROJ v5 (nastroje/vyrob_sablony.js --proj-v5) obalí blok AD
 *     značkami, takže ho Word vynechá; kontrola autorskyDozorWordProj řekne,
 *     když se tiskne ze starší šablony bez značek.
 * S KNG_PODKLADY se projde i skutečná šablona PROJ v4 → v5.
 *
 * Spuštění: cd src && node test_autorsky_dozor.js */
const path = require('path');
const fs = require('fs');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
const dg = nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
nacti('./plan_plateb.js');
const NP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
const zam = nacti('./zamek.js');
nacti('./kryci.js');
const KP = nacti('./kryci_proj.js');
const K = require('./kontroly.js');
global.NAST = { firma: global.firmaDefault() };

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 600) : JSON.stringify(info).slice(0, 600))); } };
const chybaZ = (fn) => { try { fn(); return ''; } catch (e) { return e.message; } };

test('nabidka_proj.js exportuje nabidkaProjNabiziAD', typeof NP.nabidkaProjNabiziAD === 'function');
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const novaZ = () => { const z = zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 403'; z.nazevAkce = 'Zkušební akce';
  z.varianty[0].data.proj.cenik = ZC.zkusebniCenikProj(); return z; };
/* „stará" data = zadání PROJ bez volby (uložené před 14. 10. 2026) */
const staraZ = () => { const z = novaZ(); delete z.varianty[0].data.proj.zadani.nabizetAD; return z; };
const AD_NADPISY = ['ROZŠÍŘENÁ NABÍDKA', 'AUTORSKÝ DOZOR (AD)', 'MĚSÍČNÍ SAZBA ZA AUTORSKÝ DOZOR (AD)', 'PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU'];
const nadpisy = d => d.bloky.map(b => b.nadpis || b.text || '');
const maAD = d => AD_NADPISY.filter(n => nadpisy(d).indexOf(n) >= 0);

/* ---- 1) model volby ---- */
{
  const z = novaZ();
  test('nová varianta: zadání PROJ nese nabizetAD === false (výchozí NE)', z.varianty[0].data.proj.zadani.nabizetAD === false,
    z.varianty[0].data.proj.zadani.nabizetAD);
  test('nová varianta AD nenabízí', NP.nabidkaProjNabiziAD(z.varianty[0]) === false);
  test('stará data bez volby AD nabízí (chování jako dřív)', NP.nabidkaProjNabiziAD(staraZ().varianty[0]) === true);
  z.varianty[0].data.proj.zadani.nabizetAD = true;
  test('zaškrtnutá volba AD nabízí', NP.nabidkaProjNabiziAD(z.varianty[0]) === true);
  test('varianta bez dat PROJ = jako dřív (nabízí)', NP.nabidkaProjNabiziAD({ data: {} }) === true && NP.nabidkaProjNabiziAD(null) === true);
  /* uložení a načtení zachová volbu (import nesmí doplnit výchozí ani smazat) */
  const imp = zk.importZakazka(JSON.parse(JSON.stringify(novaZ())));
  test('import uložené nové zakázky volbu zachová (false)', imp.varianty[0].data.proj.zadani.nabizetAD === false);
  const impStara = zk.importZakazka(JSON.parse(JSON.stringify(staraZ())));
  test('import staré zakázky volbu NEDOPLNÍ (AD dál nabízí)', !('nabizetAD' in impStara.varianty[0].data.proj.zadani)
    && NP.nabidkaProjNabiziAD(impStara.varianty[0]) === true);
}

/* ---- 2) online nabídka PROJ ---- */
{
  const z = novaZ(), v = z.varianty[0];
  const d = NP.nabidkaProjData(z, v, 'cz');
  test('nová varianta: nabídka nemá žádný blok AD', maAD(d).length === 0, maAD(d));
  test('nová varianta: symboly bloku AD prázdné', d.placeholders.PROJ_CENA_AD_BLOK === '' && d.placeholders.PROJ_PLATBY_AD_NADPIS === '',
    [d.placeholders.PROJ_CENA_AD_BLOK, d.placeholders.PROJ_PLATBY_AD_NADPIS]);
  test('starý symbol {{PROJ_CENA_AD}} zůstává vyplněný (šablony bez značek)', /Kč/.test(d.placeholders.PROJ_CENA_AD), d.placeholders.PROJ_CENA_AD);
  v.data.proj.zadani.nabizetAD = true;
  const d2 = NP.nabidkaProjData(z, v, 'cz');
  test('AD nabízený: nabídka má všechny čtyři bloky AD', maAD(d2).length === 4, maAD(d2));
  test('AD nabízený: {{PROJ_CENA_AD_BLOK}} = měsíční sazba, nadpis plateb s dvojtečkou',
    d2.placeholders.PROJ_CENA_AD_BLOK === d2.placeholders.PROJ_CENA_AD
    && d2.placeholders.PROJ_PLATBY_AD_NADPIS === 'PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU:', [d2.placeholders.PROJ_CENA_AD_BLOK, d2.placeholders.PROJ_PLATBY_AD_NADPIS]);
  test('AD nemá vliv na cenu nabídky (paušál není v kalkulaci)', d.placeholders.PROJ_CELKEM_BEZ_DPH === d2.placeholders.PROJ_CELKEM_BEZ_DPH);
  v.data.proj.cenik.kurzEurKc = 25;
  const en = NP.nabidkaProjData(z, v, 'en');
  test('AD nabízený, EN: nadpis plateb přeložený, sazba v eurech',
    en.placeholders.PROJ_PLATBY_AD_NADPIS === tr('PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU', 'en') && !/[ěščřžýáíéůú]/i.test(en.placeholders.PROJ_PLATBY_AD_NADPIS)
    && /€/.test(en.placeholders.PROJ_CENA_AD_BLOK), [en.placeholders.PROJ_PLATBY_AD_NADPIS, en.placeholders.PROJ_CENA_AD_BLOK]);
  const ds = NP.nabidkaProjData(staraZ(), staraZ().varianty[0], 'cz');
  test('stará data: nabídka má bloky AD jako dřív', maAD(ds).length === 4, maAD(ds));
}

/* ---- 3) test otisku: odeslaná (zamčená) nabídka ze starých dat se nemění ---- */
{
  const z = staraZ(), v = z.varianty[0];
  zam.zamkniVariantu(v, { typ: 'nabidkaProj', kdy: '2026-10-01T08:00:00.000Z', cislo: '2026 - OVP - CN - 403',
    vysledek: { proj: vypocetProj(v.data.proj.zadani, v.data.proj.cenik) } });
  const pred = JSON.stringify(NP.nabidkaProjData(z, v, 'cz').bloky);
  const imp = zk.importZakazka(JSON.parse(JSON.stringify(z)));
  const vi = imp.varianty[0];
  const po = NP.nabidkaProjData(imp, vi, 'cz');
  test('otisk: odeslaná nabídka ze starých dat — po uložení a načtení tytéž bloky (vč. AD)',
    zam.variantaUzamcena(vi) && JSON.stringify(po.bloky) === pred && maAD(po).length === 4, maAD(po));
  const kl = KP.kryciProjData(imp, vi, null, 'techdata');
  const radky = JSON.stringify(kl);
  test('otisk: krycí list PROJ (technická verze) staré odeslané nabídky má řádek autorského dozoru', radky.indexOf('Autorský dozor (AD)') >= 0);
}

/* ---- 4) krycí list PROJ ---- */
{
  const z = novaZ(), v = z.varianty[0];
  const s = JSON.stringify(KP.kryciProjData(z, v, null, 'techdata'));
  test('nová varianta: technický krycí list PROJ nemá řádek autorského dozoru', s.indexOf('Autorský dozor (AD)') < 0);
  v.data.proj.zadani.nabizetAD = true;
  const s2 = JSON.stringify(KP.kryciProjData(z, v, null, 'techdata'));
  test('AD nabízený: technický krycí list PROJ řádek autorského dozoru má', s2.indexOf('Autorský dozor (AD)') >= 0);
  const pole = KP.KRYCI_PROJ_SEKCE.reduce((a, x) => a.concat(x.pole), []).find(p => p.id === 'autorskyDozor');
  test('kryciProjPoleViditelne: pole AD bez kontextu viditelné (jako dřív)', KP.kryciProjPoleViditelne(pole, null) === true);
}

/* ---- 5) kontrola autorskyDozorWordProj ---- */
{
  const z = novaZ(), v = z.varianty[0];
  const ctx = (sym, zad) => ({ zak: z, projZadani: zad || v.data.proj.zadani,
    sablonaNabidkaProj: sym ? { nazev: 'Sablona_NABIDKA_PROJ_v4.docx', verze: 4, symboly: sym } : null });
  const kody = c => K.kontrolyProved(c).kody;
  const V4 = ['PROJ_CENA_AD', 'PROJ_CELKEM_BEZ_DPH', 'PROJ_PLATBY_DPZ'];
  const V5 = V4.concat(['PROJ_CENA_AD_BLOK', 'BLOK_AD_ZAC', 'BLOK_AD_KON', 'PROJ_PLATBY_AD_NADPIS']);
  test('kontrola: AD nenabízený + šablona v4 bez značek → varování', kody(ctx(V4)).indexOf('autorskyDozorWordProj') >= 0, kody(ctx(V4)));
  test('kontrola: AD nenabízený + šablona v5 → mlčí', kody(ctx(V5)).indexOf('autorskyDozorWordProj') < 0);
  test('kontrola: symboly šablony neznámé → mlčí', kody(ctx(null)).indexOf('autorskyDozorWordProj') < 0);
  test('kontrola: AD nabízený → mlčí', kody(ctx(V4, { nabizetAD: true })).indexOf('autorskyDozorWordProj') < 0);
  test('kontrola: stará data bez volby → mlčí', kody(ctx(V4, {})).indexOf('autorskyDozorWordProj') < 0);
  const n = K.kontrolyProved(ctx(V4)).nalezy.find(x => x.kod === 'autorskyDozorWordProj');
  test('kontrola je varování, ne zábrana', n && n.uroven !== K.KONTROLY_UROVEN_ZABRANA, n);
}

/* ---- 6) šablona PROJ v5 (syntetická v4) ---- */
let VS = null;
try { VS = require(path.join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { VS = null; }
test('nastroje/vyrob_sablony.js exportuje projV5', !!(VS && typeof VS.projV5 === 'function'));
const r = t => '<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">' + t + '</w:t></w:r>';
const p = t => '<w:p><w:pPr><w:pStyle w:val="Bezmezer"/></w:pPr>' + (t ? r(t) : '') + '</w:p>';
const tbl = (...ps) => '<w:tbl><w:tblPr/><w:tblGrid><w:gridCol w:w="9000"/></w:tblGrid><w:tr><w:tc>' + ps.join('') + '</w:tc></w:tr></w:tbl>';
const V4XML = '<w:document><w:body>'
  + p('ROZŠÍŘENÁ NABÍDKA') + p('') + tbl(p('Provedení zaměření geodetem'))
  + p('') + tbl(p('AUTORSKÝ DOZOR (AD):'), p('V případě požadavku účasti projektanta na kontrolních dnech.'))
  + p('') + tbl(p('MĚSÍČNÍ SAZBA ZA AUTORSKÝ DOZOR (AD)'), p('{{PROJ_CENA_AD}} / měsíc'))
  + p('Sazbu je možné určit i celkovou částkou za určité období.') + p('')
  + tbl(p('CENA NEZAHRNUJE:'))
  + tbl(p('PLATEBNÍ PODMÍNKY DPZ:'), p('{{PROJ_PLATBY_DPZ}}'))
  + tbl('<w:p>' + r('PLATEBNÍ PODMÍNKY ') + r('AUTORSKÉHO DOZORU') + r(':') + '</w:p>', p('Platba po zajištění autorského dozoru a součtu hodin'))
  + p('') + tbl(p('TERMÍNY:'))
  + '<w:sectPr/></w:body></w:document>';
if (VS && VS.projV5) {
  let v5 = '';
  const ch = chybaZ(() => { v5 = VS.projV5(V4XML); });
  test('v5: vznikne bez chyby', !ch, ch);
  const kl = dg.klicePlaceholderu(v5);
  test('v5: má značky a symboly bloku AD, {{PROJ_CENA_AD}} zmizel',
    ['BLOK_AD_ZAC', 'BLOK_AD_KON', 'PROJ_CENA_AD_BLOK', 'PLATBY_AD_ZAC', 'PLATBY_AD_KON', 'PROJ_PLATBY_AD_NADPIS'].every(k => kl.indexOf(k) >= 0)
    && kl.indexOf('PROJ_CENA_AD') < 0, kl);
  test('v5: XML bez vad', !dg.xmlStrukturaVada(v5), dg.xmlStrukturaVada(v5));
  test('v5: druhý průchod odmítne', /už blok autorského dozoru/.test(chybaZ(() => VS.projV5(v5))));
  test('v5: vstup bez plánu plateb (v3) odmítne', /není PROJ v4/.test(chybaZ(() => VS.projV5(V4XML.replace('{{PROJ_PLATBY_DPZ}}', '')))));
  test('v5: nečekaná stavba bloku AD → chyba (nic nehádá)',
    /nemá čekanou stavbu/.test(chybaZ(() => VS.projV5(V4XML.replace('Sazbu je možné určit', 'Jiná věta')))));
  const text = x => dg.xmlUnesc((x.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('|'));
  const vypln = ph => dg.nahradPlaceholdery(dg.odstranPrazdneBloky(v5, ph), ph);
  const z = novaZ(), v = z.varianty[0];
  const bez = text(vypln(NP.nabidkaProjData(z, v, 'cz').placeholders));
  test('v5 vyplněná, AD nenabízený: žádný autorský dozor, geodet a ROZŠÍŘENÁ NABÍDKA zůstávají',
    !/AUTORSK|MĚSÍČNÍ SAZBA|Sazbu je možné/.test(bez) && /Provedení zaměření geodetem/.test(bez) && /ROZŠÍŘENÁ NABÍDKA/.test(bez)
    && /CENA NEZAHRNUJE/.test(bez) && !/\{\{/.test(bez), bez);
  v.data.proj.zadani.nabizetAD = true;
  const ph = NP.nabidkaProjData(z, v, 'cz').placeholders;
  const s = text(vypln(ph));
  test('v5 vyplněná, AD nabízený: popis, sazba i platební podmínky AD jsou',
    /AUTORSKÝ DOZOR \(AD\):/.test(s) && s.indexOf(ph.PROJ_CENA_AD_BLOK) >= 0 && /PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU:/.test(s)
    && /součtu hodin/.test(s) && !/\{\{/.test(s), s);
}

/* ---- 7) skutečná šablona PROJ v4 (jen s KNG_PODKLADY) ---- */
(async () => {
  const zdroj = process.env.KNG_PODKLADY ? path.join(process.env.KNG_PODKLADY, 'Sablona_NABIDKA_PROJ_v4.docx') : '';
  if (!VS || !VS.projV5 || !zdroj || !fs.existsSync(zdroj)) {
    console.log('–    skutečná šablona PROJ v4 (KNG_PODKLADY) není po ruce — přeskočeno');
  } else {
    const casti = await dg.zipPrecti(new Uint8Array(fs.readFileSync(zdroj)));
    const xml4 = new TextDecoder().decode(casti.find(x => x.nazev === 'word/document.xml').data);
    let xml5 = '';
    const ch = chybaZ(() => { xml5 = VS.projV5(xml4); });
    test('skutečná v4: v5 vznikne bez chyby', !ch, ch);
    test('skutečná v4: XML v5 bez vad', !dg.xmlStrukturaVada(xml5), dg.xmlStrukturaVada(xml5));
    const text = x => dg.xmlUnesc((x.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(''));
    const vypln = ph => text(dg.nahradPlaceholdery(dg.odstranPrazdneBloky(xml5, ph), ph));
    const z = novaZ(), v = z.varianty[0];
    const bez = vypln(NP.nabidkaProjData(z, v, 'cz').placeholders);
    test('skutečná v5, AD nenabízený: ve Wordu žádný autorský dozor', !/AUTORSK|MĚSÍČNÍ SAZBA ZA AUTORSK/.test(bez) && !/\{\{(PROJ_CENA_AD|BLOK_AD|PLATBY_AD|PROJ_PLATBY_AD)/.test(bez),
      (bez.match(/.{0,80}(AUTORSK|\{\{).{0,80}/g) || []).join(' ¦ '));
    v.data.proj.zadani.nabizetAD = true;
    const ph = NP.nabidkaProjData(z, v, 'cz').placeholders;
    const s = vypln(ph);
    test('skutečná v5, AD nabízený: popis, sazba a platební podmínky AD',
      /AUTORSKÝ DOZOR \(AD\):/.test(s) && s.indexOf(ph.PROJ_CENA_AD_BLOK) >= 0 && /PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU:/.test(s), '');
    const xml4vyp = text(dg.nahradPlaceholdery(dg.odstranPrazdneBloky(xml4, ph), ph));
    test('skutečná v5, AD nabízený: text dokumentu shodný s v4 (nic jiného se nezměnilo)', s === xml4vyp,
      [s.length, xml4vyp.length]);
  }
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka: ' + (e && e.stack || e)); process.exit(1); });
