/* ============================================================
 * OBJEDNÁVKA / SMLOUVA PROJ (D3, dotaz obchodu D3, rozhodnutí J. V. 19. 11. 2026)
 * ------------------------------------------------------------
 * Jednostránkový dokument, který aplikace vyrobí z nabídky PROJ a zákazník
 * ho jen podepíše. Rozvržení podle vzoru J. V. („Přijatá objednávka"
 * z účetního systému): vpravo název, číslo dokladu, číslo zakázky; vlevo
 * Dodavatel (Nastavení → Firma), Objednatel (hlavička zakázky), datum
 * případu, tabulka řádků (jeden řádek = jedna nabízená činnost varianty
 * PROJ, pod názvem rozsah prací z textu nabídky), součty, místo pro podpis
 * a poznámka s odkazem na cenovou nabídku, platebním kalendářem a termíny.
 *
 * CENY SE NEPOČÍTAJÍ ZNOVU. Všechno bere z nabidkaProjData (nabidka_proj.js),
 * tedy z téhož výpočtu (engine_proj.js, u odeslané varianty z otisku),
 * zaokrouhlení po činnostech, slevy, cestovného a DPH projekční části, jaký
 * tiskne cenová nabídka PROJ. Řádky nesou ceny PŘED slevou a sleva má vlastní
 * řádek — přesně jako rekapitulace nabídky — takže „Celkem" je na haléř
 * „CELKEM bez DPH / s DPH" nabídky.
 *
 * Číslo dokladu: z čísla nabídky se „CN" nahradí „OBJ", pořadí i verze
 * varianty zůstanou (2026-OVP-CN-0376.2 → 2026-OVP-OBJ-0376.2). Číslo bez
 * části „CN" se nevymýšlí — dokument nevznikne a obchodník dostane důvod.
 *
 * Jen čeština (rozhodnutí J. V.). Výstup: tisk / PDF (ui/objednavka_proj_ui.js)
 * a Word generovaný od nuly (bez šablony, režim `generate` registru dokumentů).
 * ============================================================ */

const OBJ_PROJ_NAZEV = 'Objednávka / Smlouva';

/* Číslo objednávky z čísla nabídky: část „CN" (oddělená pomlčkou) → „OBJ".
 * Mezery se zahodí jako v CISLO_NABIDKY nabídky. Bez části „CN" vrací ''. */
function objednavkaProjCislo(cisloNabidky) {
  const c = String(cisloNabidky == null ? '' : cisloNabidky).replace(/\s+/g, '');
  if (!c) return '';
  const casti = c.split('-');
  const i = casti.findIndex(x => x.toUpperCase() === 'CN');
  if (i < 0) return '';
  casti[i] = 'OBJ';
  return casti.join('-');
}

/* ZÁBRANA: JEN Z ODESLANÉ CENOVÉ NABÍDKY (J. V. 19. 11. 2026, #689 bod 3).
 * Objednávka odkazuje na cenovou nabídku „ze dne …" jako na nedílnou součást —
 * ta tedy musí existovat: varianta musí být zamčená tiskem nabídky PROJ.
 * Vrací hlášku, nebo ''. Volá ji objednavkaProjData i brána tlačítka
 * (dokumentZabrana v ui/ukazkove_ui.js). */
function objednavkaProjZabrana(varianta) {
  if (varianta && varianta.zamek && varianta.zamek.zamceno) return '';
  return 'Objednávku jde vytvořit jen z odeslané (vytištěné) cenové nabídky PROJ. Vytiskněte nejdřív nabídku PROJ '
    + 'této varianty (Kalkulace PROJ → Kompletní náhled a tisk nabídky), nebo otevřete odeslanou variantu.';
}

/* Datum vystavení (datum případu) ve tvaru d. m. rrrr. */
function objednavkaProjDatum(d) {
  const x = d instanceof Date ? d : new Date();
  return x.getDate() + '. ' + (x.getMonth() + 1) + '. ' + x.getFullYear();
}

/* Označení řádku = zkratka činnosti z plánu plateb (jedno místo s krycím
 * listem PROJ); bez modulu plánu klíč sekce. */
function objednavkaProjOznaceni(k) {
  const z = (typeof PLAN_PROJ_ZKRATKY !== 'undefined') ? PLAN_PROJ_ZKRATKY : null;
  return (z && z[k]) || k;
}

/* Rozsah prací činnosti z bloků nabídky (už odfiltrovaných podle rozsahu,
 * položek a znění odeslané nabídky). Blok rozsahu/seznamu se k činnosti
 * přiřadí podle nadpisu v NABIDKA_PROJ_DEF; společný blok STUDIE se dělí
 * podle částí — část s projednáním patří k činnosti „projednani". */
function objednavkaProjRozsahy(bloky) {
  const def = (typeof NABIDKA_PROJ_DEF !== 'undefined') ? NABIDKA_PROJ_DEF : [];
  const sekceBloku = {};
  def.forEach(b => { if ((b.typ === 'rozsah' || b.typ === 'seznam') && b.nadpis && b.sekce) sekceBloku[b.nadpis] = b.sekce; });
  const out = {};
  const pridej = (k, radek) => { (out[k] = out[k] || []).push(radek); };
  (bloky || []).forEach(b => {
    const s = sekceBloku[b.nadpis];
    if (!s) return;
    if (b.typ === 'seznam') { (b.radky || []).forEach(t => pridej(s, '– ' + t)); return; }
    if (b.typ !== 'rozsah') return;
    let k = Array.isArray(s) ? s[0] : s;
    (b.radky || []).forEach(r => {
      if (!r[1]) {   // podnadpis části
        if (Array.isArray(s)) k = /projednání/i.test(r[0]) ? 'projednani' : s[0];
        pridej(k, r[0]);
      } else pridej(k, r[0] ? r[0] + ': ' + r[1] : r[1]);
    });
  });
  return out;
}

/* Data dokumentu. moznosti: { dnes: Date } (testy). Vrací
 * { chyba } nebo { cislo, cisloNabidky, datumNabidky, datumVystaveni, cisloZakazky,
 *   dodavatel, objednatel, akce, radky, sleva, souhrn, texty, mimoCenu, poznamka,
 *   platebniKalendar, terminy, upozorneni, nazevSouboru }. */
function objednavkaProjData(zak, varianta, moznosti) {
  const m = moznosti || {};
  const d = nabidkaProjData(zak, varianta, 'cz');
  /* K56-I2 (J. V. 24. 11. 2026): „Vystavil" = kdo objednávku PRÁVĚ TISKNE
   * (přihlášený zpracovatel); snímek zámku (#665) platí jen pro nabídku. */
  if (typeof zpracovatelTiskneDoklad === 'function') zpracovatelTiskneDoklad(d);
  const p = d.placeholders;
  const cisloNabidky = p.CISLO_NABIDKY;
  const cislo = objednavkaProjCislo(cisloNabidky);
  if (!cislo) return { chyba: cisloNabidky
    ? 'Číslo nabídky „' + cisloNabidky + '" neobsahuje část „CN" — číslo objednávky z něj nejde odvodit. Opravte číslo nabídky v hlavičce zakázky.'
    : 'Zakázka nemá číslo nabídky — objednávka bez čísla nevznikne. Vyplňte číslo nabídky v hlavičce zakázky.' };
  const zabrana = objednavkaProjZabrana(varianta);
  if (zabrana) return { chyba: zabrana };
  if (!d.nabizeneSekce.length) return { chyba: 'Varianta PROJ nenabízí žádnou činnost s cenou — objednávka by byla prázdná.' };

  const s = d.souhrn;
  const sazba = s.dphPct / 100;
  const hal = x => Math.round(x * 100) / 100;
  const sDph = x => (typeof cenaSDph === 'function') ? cenaSDph(x, sazba) : { dphKc: x * sazba, sDph: x + x * sazba };
  const kc = (typeof formatKc2 === 'function') ? formatKc2
    : n => (+n || 0).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč';

  /* Ceny činností před slevou = řádky rekapitulace nabídky (nabidkaProjCeny). */
  /* Odeslaná varianta: týž snímek zámku, ze kterého tiskne nabídka (Z1). */
  const vPohled = (typeof zamekNabidkaPohled === 'function') ? zamekNabidkaPohled(varianta) : varianta;
  const ceny = nabidkaProjCeny(vPohled, 'cz');
  const r = ceny.r;
  const rozsahy = objednavkaProjRozsahy(d.bloky);
  /* Cenový blok činnosti nese popis ceny, vlastní položky, cestovné a hvězdičku. */
  const cenovy = k => d.bloky.find(b => b.typ === 'cena' && b.sekce === k && !b.odkaz && !b.neuvedena
    && String(b.castka).indexOf(' / ') < 0);
  const radky = d.nabizeneSekce.map((k, i) => {
    const sek = (r.sekce || []).find(x => x.key === k);
    const cena = +ceny.cenyPred[k];
    const b = cenovy(k);
    const popis = [];
    if (b && b.popis) popis.push(b.popis);
    (rozsahy[k] || []).forEach(t => popis.push(t));
    if (b) (b.navic || []).forEach(n => popis.push('– ' + n));
    if (b && (b.cestovne || []).length) popis.push(b.cestovne.join(' '));
    if (b && b.hvezdicka) popis.push('*) ' + b.hvezdicka);
    const x = sDph(cena);
    return { c: i + 1, sekce: k, oznaceni: objednavkaProjOznaceni(k), nazev: sek ? sek.nazev : k, popis,
      mnozstvi: 1, mj: 'kpl', cenaJedn: cena, cenaCelkem: cena, celkemBezDph: cena, dphPct: s.dphPct, dph: x.dphKc, celkemSDph: x.sDph };
  });
  const sleva = s.slevaKc ? (() => { const x = sDph(-s.slevaKc);
    return { pct: p.PROJ_SLEVA_PROC, bezDph: -s.slevaKc, dph: x.dphKc, sDph: x.sDph }; })() : null;

  /* Kontrola na haléř: součet řádků = celkem nabídky (bez DPH i s DPH). */
  const sumBez = hal(radky.reduce((a, x) => a + hal(x.celkemBezDph), 0) + (sleva ? hal(sleva.bezDph) : 0));
  const sumS = hal(radky.reduce((a, x) => a + hal(x.celkemSDph), 0) + (sleva ? hal(sleva.sDph) : 0));
  const upozorneni = [];
  if (sumBez !== hal(s.bezDph) || sumS !== hal(s.sDph))
    upozorneni.push('Součet řádků (' + kc(sumBez) + ' bez DPH, ' + kc(sumS) + ' s DPH) se liší od celkové ceny nabídky ('
      + p.PROJ_CELKEM_BEZ_DPH + ', ' + p.PROJ_CELKEM_S_DPH + ') o zaokrouhlení DPH.');

  /* Mimo celkovou cenu: paušály nabídky (další varianta studie, autorský dozor). */
  const mimoCenu = d.bloky.filter(b => b.typ === 'cena' && !b.neuvedena && String(b.castka).indexOf(' / ') >= 0)
    .map(b => b.nadpis + ': ' + b.castka + ' bez DPH');

  /* Dodavatel z Nastavení → Firma. */
  const f = (typeof firmaAktualni === 'function') ? firmaAktualni() : {};
  const fh = id => (typeof firmaHodnota === 'function') ? firmaHodnota(f, id) : String((f || {})[id] || '').trim();
  const dodavatel = { nazev: fh('nazev'), adresa: (typeof firmaSidlo === 'function') ? firmaSidlo(f) : '',
    ico: fh('ico'), dic: fh('dic'), telefon: fh('telefon'), email: fh('email') };

  /* Objednatel z hlavičky zakázky (u víc zákazníků pohled řídícího — vzTiskPohled
   * v UI; dokument PROJ jiný pohled nedostane, viz vzTypProj). Zástupce ve věcech
   * smluvních je ten, kdo podepisuje (krycí list, ZAK.zastupci). */
  const h = (typeof projHlavickaEfektivni === 'function') ? projHlavickaEfektivni(zak) : (zak || {});
  const za = (zak && zak.zastupci) || {};
  const t = v => String(v == null ? '' : v).trim();
  const objednatel = { nazev: t(h.objednatel), adresa: t(h.adresaObjednatele), ico: t(h.ico), dic: t(h.dic || (zak && zak.dic)),
    zastupce: [t(za.smluvniJmeno), t(za.smluvniPozice)].filter(Boolean).join(', ') };

  /* Číslo zakázky z účetnictví = pole „Číslo zakázky" krycího listu PROJ
   * (J. V. 19. 11. 2026, #689 bod 2); prázdné = řádek se netiskne. */
  const kl = (varianta && varianta.data && varianta.data.kryciProj && varianta.data.kryciProj.hodnoty) || {};
  const cisloZakazky = t(kl.cisloZakazky);
  /* Vystavil = přihlášený uživatel, který objednávku tiskne (Můj profil; K56-I2). */
  const vystavil = [t(p.ZPRAC_JMENO), t(p.ZPRAC_TEL), t(p.ZPRAC_EMAIL)].filter(Boolean).join(', ');

  /* Platební kalendář z plánu plateb (tytéž splátky jako SoD PROJ, ceny po slevě,
   * bez DPH); odeslaná nabídka z doby před plánem nese pevné bloky jako nabídka. */
  const pl = d.platbyProj;
  let platebniKalendar = [];
  if (pl && !pl.stary && pl.dopocet && pl.dopocet.platby.length)
    platebniKalendar = pl.dopocet.platby.map((x, i) => 'Platba ' + (i + 1) + ' — ' + (x.text || '(milník chybí)') + ': ' + kc(x.castka) + ' bez DPH');
  else if (p.PROJ_PLATEBNI_PODMINKY) platebniKalendar = String(p.PROJ_PLATEBNI_PODMINKY).split('\n').filter(x => x.trim());
  const tc = String(p.PROJ_TERMINY_CINNOST || '').split('\n'), tt = String(p.PROJ_TERMINY_TERMIN || '').split('\n');
  const terminy = tc.map((x, i) => [x, tt[i] || '']).filter(x => x[0].trim());
  /* Poznámka k termínům s hvězdičkou (IČ) — táž věta, jakou má nabídka pod TERMÍNY. */
  const poznTerm = d.bloky.filter(b => b.typ === 'pozn').reduce((a, b) => a.concat(b.radky || []), [])
    .filter(t => /^\*\)/.test(String(t)));
  if (terminy.some(x => /\*\)/.test(x[0] + x[1]))) poznTerm.forEach(t => terminy.push([t, '']));

  const poznamka = 'Veškeré platební podmínky, termíny plnění a ostatní smluvní podmínky se řídí cenovou nabídkou č. '
    + cisloNabidky + ' ze dne ' + p.DATUM + ', která je nedílnou součástí této objednávky.';

  const nazevSouboru = (typeof nazevExportu === 'function' ? nazevExportu : require('./nazvy_souboru.js').nazevExportu)(
    'objednavka', { cislo, oblast: 'proj' });

  return { nazev: OBJ_PROJ_NAZEV, cislo, cisloNabidky, datumNabidky: p.DATUM,
    datumVystaveni: objednavkaProjDatum(m.dnes), cisloZakazky, vystavil, dodavatel, objednatel,
    akce: { nazev: p.NAZEV_AKCE, adresa: p.ADRESA },
    radky, sleva, mimoCenu, poznamka, platebniKalendar, terminy, upozorneni,
    souhrn: { bezDph: s.bezDph, dphPct: s.dphPct, dphKc: s.dphKc, sDph: s.sDph },
    /* Texty částek v podobě, jakou tiskne nabídka (formatKc2). */
    texty: { bezDph: p.PROJ_CELKEM_BEZ_DPH, dph: p.PROJ_DPH_KC, sDph: p.PROJ_CELKEM_S_DPH, kc },
    nazevSouboru };
}

/* ---------- Word od nuly (bez šablony) ---------- */
function objDocxBunka(inner, w, o) {
  o = o || {};
  return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + (o.span ? '<w:gridSpan w:val="' + o.span + '"/>' : '')
    + (o.fill ? '<w:shd w:val="clear" w:color="auto" w:fill="' + o.fill + '"/>' : '')
    + '<w:tcMar><w:top w:w="30" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar>'
    + '</w:tcPr>' + inner + '</w:tc>';
}
function objDocxOdst(text, o) {
  o = o || {};
  let x = docxPar(text, Object.assign({ sz: 16, after: 0 }, o));
  /* keep (D3-N1): odstavec drží s dalším (popis řádku s řádkem čísel) */
  if (o.vpravo) x = x.replace('<w:pPr>', '<w:pPr><w:jc w:val="right"/>');
  if (o.keep) x = x.replace(/<w:pPr>/g, '<w:pPr><w:keepNext/>');   // keepNext je v pPr první (pořadí schématu)
  return x;
}
function objDocxTabulka(sirky, radkyXml, okraje) {
  const hr = okraje === false ? 'none' : 'single';
  return '<w:tbl><w:tblPr><w:tblW w:w="' + sirky.reduce((a, b) => a + b, 0) + '" w:type="dxa"/><w:tblLayout w:type="fixed"/>'
    + '<w:tblBorders><w:top w:val="' + hr + '" w:sz="4" w:color="C7D0DB"/><w:left w:val="' + hr + '" w:sz="4" w:color="C7D0DB"/>'
    + '<w:bottom w:val="' + hr + '" w:sz="4" w:color="C7D0DB"/><w:right w:val="' + hr + '" w:sz="4" w:color="C7D0DB"/>'
    + '<w:insideH w:val="' + hr + '" w:sz="4" w:color="C7D0DB"/><w:insideV w:val="' + hr + '" w:sz="4" w:color="C7D0DB"/></w:tblBorders></w:tblPr>'
    + '<w:tblGrid>' + sirky.map(w => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>' + radkyXml + '</w:tbl>';
}
/* Sloupce tabulky řádků (jako „Přijatá objednávka" účetního systému). */
const OBJ_PROJ_SLOUPCE = ['Č.', 'Označení', 'Popis dodávky', 'Množ.', 'MJ', 'J. cena bez DPH', 'C. cena bez DPH', 'Celkem bez DPH', 'DPH %', 'Celkem s DPH'];
/* Text bloku strany (dodavatel / objednatel) po řádcích — tisk i Word. */
function objednavkaProjStranaRadky(s, misto) {
  const r = [s.nazev || '……', s.adresa || '……', 'IČ: ' + (s.ico || '……') + (s.dic ? '    DIČ: ' + s.dic : '')];
  if (s.telefon) r.push('Tel.: ' + s.telefon);
  if (s.email) r.push('E-mail: ' + s.email);
  if (s.zastupce) r.push('Zastoupen: ' + s.zastupce);
  if (misto) r.push('Místo určení: ' + misto);
  return r;
}
function objednavkaProjMisto(o) { return [o.akce.nazev, o.akce.adresa].filter(x => x && x !== '…').join(', '); }
/* Tělo dokumentu (XML) — tytéž údaje a pořadí jako tiskový náhled. */
function objednavkaProjDocxTelo(o) {
  const kc = o.texty.kc;
  const B = (t, x) => objDocxOdst(t, Object.assign({ b: true }, x || {}));
  const blok = (nadpis, r) => B(nadpis, { sz: 14, color: '6B7686' }) + B(r[0]) + r.slice(1).map(x => objDocxOdst(x)).join('') + objDocxOdst('', { after: 100 });
  /* Hlavička: vlevo dodavatel a pod ním objednatel; vpravo název, číslo dokladu, zakázka. */
  const vlevo = blok('Dodavatel', objednavkaProjStranaRadky(o.dodavatel))
    + blok('Místo určení / Objednatel', objednavkaProjStranaRadky(o.objednatel, objednavkaProjMisto(o)));
  const vpravo = B(o.nazev, { sz: 28, vpravo: true }) + B('Číslo dokladu: ' + o.cislo, { vpravo: true, sz: 18 })
    + (o.cisloZakazky ? objDocxOdst('Zakázka: ' + o.cisloZakazky, { vpravo: true, sz: 18 }) : '');
  let body = objDocxTabulka([5600, 4038], '<w:tr>' + objDocxBunka(vlevo, 5600) + objDocxBunka(vpravo, 4038) + '</w:tr>', false);
  body += objDocxOdst('Datum případu: ' + o.datumVystaveni, { sz: 18, after: 100 });
  /* D3-N1 (19. 11. 2026): jako náhled a vzor účetního systému — řádek
   * Č. · Označení · popis dodávky přes celou šířku (gridSpan 7), pod ním
   * řádek čísel (Množ. · MJ · J. cena · C. cena · celkem bez DPH · DPH % ·
   * celkem s DPH). Popis drží s řádkem čísel (keepNext), řádek čísel se
   * nedělí (cantSplit), záhlaví se opakuje na další straně (tblHeader). */
  const W = [330, 620, 800, 500, 1400, 1400, 1500, 700, 2388];
  const SPAN = W.length - 2, wPopis = W.slice(2).reduce((a, b) => a + b, 0);
  const S = OBJ_PROJ_SLOUPCE;
  const H = (t, i) => objDocxBunka(B(t, { sz: 14, color: 'FFFFFF', vpravo: i >= 2 }), W[i], { fill: '2B3850' });
  const trPr = x => '<w:trPr>' + x + '</w:trPr>';
  let tr = '<w:tr>' + trPr('<w:tblHeader/><w:cantSplit/>') + H(S[0], 0) + H(S[1], 1)
    + objDocxBunka(B(S[2], { sz: 14, color: 'FFFFFF' }), wPopis, { span: SPAN, fill: '2B3850' }) + '</w:tr>'
    + '<w:tr>' + trPr('<w:tblHeader/><w:cantSplit/>') + H('', 0) + H('', 1) + S.slice(3).map((t, i) => H(t, i + 2)).join('') + '</w:tr>';
  const radek = (bunky, pr) => '<w:tr>' + (pr ? trPr(pr) : '') + bunky.map((c, i) => objDocxBunka(c, W[i])).join('') + '</w:tr>';
  const V = t => objDocxOdst(t, { vpravo: true });
  const drz = t => objDocxOdst(t, { keep: true });
  o.radky.forEach(x => {
    tr += '<w:tr>' + objDocxBunka(drz(String(x.c)), W[0]) + objDocxBunka(drz(x.oznaceni), W[1])
      + objDocxBunka(B(x.nazev, { keep: true }) + (x.popis.length ? objDocxOdst(x.popis.join('\n'), { sz: 14, keep: true }) : ''), wPopis, { span: SPAN }) + '</w:tr>';
    tr += radek([objDocxOdst(''), objDocxOdst(''), V(String(x.mnozstvi)), V(x.mj), V(kc(x.cenaJedn)), V(kc(x.cenaCelkem)),
      V(kc(x.celkemBezDph)), V(x.dphPct + ' %'), V(kc(x.celkemSDph))], '<w:cantSplit/>');
  });
  if (o.sleva) tr += '<w:tr>' + trPr('<w:cantSplit/>') + objDocxBunka(objDocxOdst(''), W[0]) + objDocxBunka(objDocxOdst(''), W[1])
    + objDocxBunka(objDocxOdst('Sleva ' + o.sleva.pct + ' %'), W[2] + W[3] + W[4], { span: 3 })
    + [V(kc(o.sleva.bezDph)), V(kc(o.sleva.bezDph)), V(o.souhrn.dphPct + ' %'), V(kc(o.sleva.sDph))].map((c, i) => objDocxBunka(c, W[5 + i])).join('') + '</w:tr>';
  tr += '<w:tr>' + trPr('<w:cantSplit/>') + objDocxBunka(B('Součet', { vpravo: true }), W.slice(0, 5).reduce((a, b) => a + b, 0), { span: 5, fill: 'EEF2F8' })
    + [o.texty.bezDph, o.texty.bezDph, '', o.texty.sDph].map((t, i) => objDocxBunka(B(t, { vpravo: true }), W[5 + i], { fill: 'EEF2F8' })).join('') + '</w:tr>';
  body += objDocxTabulka(W, tr);
  /* Rámeček „Celkem Kč" vpravo pod tabulkou. */
  const R = (t, v, tucne) => '<w:tr>' + objDocxBunka((tucne ? B : objDocxOdst)(t, { vpravo: true, sz: tucne ? 20 : 16 }), 2000)
    + objDocxBunka((tucne ? B : objDocxOdst)(v, { vpravo: true, sz: tucne ? 20 : 16 }), 1900) + '</w:tr>';
  body += objDocxOdst('', { after: 60 });
  body += objDocxTabulka([5738, 3900], '<w:tr>' + objDocxBunka(o.mimoCenu.length
      ? objDocxOdst('Mimo celkovou cenu (podle cenové nabídky): ' + o.mimoCenu.join('; '), { sz: 14 }) : objDocxOdst(''), 5738)
    + objDocxBunka(objDocxTabulka([2000, 1900], R('Celkem bez DPH', o.texty.bezDph) + R('DPH ' + o.souhrn.dphPct + ' %', o.texty.dph)
      + R('Celkem Kč', o.texty.sDph, true)) + objDocxOdst(''), 3900) + '</w:tr>', false);
  body += objDocxOdst('', { after: 240 });
  body += objDocxOdst('Datum: ……………………………        Podpis objednatele: ………………………………………', { sz: 18, after: 240 });
  body += B('Poznámka', { sz: 16 }) + objDocxOdst(o.poznamka, { after: 80 });
  if (o.platebniKalendar.length) body += B('Platební kalendář') + objDocxOdst(o.platebniKalendar.join('\n'), { after: 80 });
  if (o.terminy.length) body += B('Termíny') + objDocxOdst(o.terminy.map(x => x[0] + (x[1] ? ' – ' + x[1] : '')).join('\n'), { after: 80 });
  if (o.vystavil) body += objDocxOdst('Vystavil: ' + o.vystavil, { after: 0 });
  return body;
}
/* .docx se zápatím „Strana x / y" (pole PAGE a NUMPAGES). */
function objednavkaProjDocxBlob(o) {
  const enc = new TextEncoder();
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const pole = k => '<w:fldSimple w:instr=" ' + k + ' "><w:r><w:rPr><w:sz w:val="14"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple>';
  const beh = t => '<w:r><w:rPr><w:sz w:val="14"/></w:rPr><w:t xml:space="preserve">' + t + '</w:t></w:r>';
  const zapati = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ' + W + '><w:p><w:pPr><w:jc w:val="right"/></w:pPr>'
    + beh('Strana ') + pole('PAGE') + beh(' / ') + pole('NUMPAGES') + '</w:p></w:ftr>';
  const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + W + ' ' + R + '><w:body>'
    + objednavkaProjDocxTelo(o)
    + '<w:sectPr><w:footerReference w:type="default" r:id="rIdZapati"/><w:pgSz w:w="11906" w:h="16838"/>'
    + '<w:pgMar w:top="850" w:right="1134" w:bottom="1000" w:left="1134" w:header="500" w:footer="500" w:gutter="0"/></w:sectPr></w:body></w:document>';
  return zipZapis([
    { nazev: '[Content_Types].xml', data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
      + '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
      + '</Types>') },
    { nazev: '_rels/.rels', data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
      + '</Relationships>') },
    { nazev: 'word/_rels/document.xml.rels', data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rIdZapati" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'
      + '</Relationships>') },
    { nazev: 'word/document.xml', data: enc.encode(doc) },
    { nazev: 'word/footer1.xml', data: enc.encode(zapati) },
  ]);
}

/* Registrace do jednotného registru dokumentů (dokumentVygeneruj hlídá
 * zábrany — víc zákazníků, zámek strany, kontroly, plán plateb). */
if (typeof dokumentRegistruj === 'function')
  dokumentRegistruj('objednavkaProj', {
    nazev: 'Objednávka / Smlouva PROJ',
    generate: (zak, varianta) => {
      const o = objednavkaProjData(zak, varianta);
      if (o.chyba) throw new Error(o.chyba);
      return { blob: objednavkaProjDocxBlob(o), nazevSouboru: o.nazevSouboru, data: o };
    },
  });

if (typeof module !== 'undefined')
  module.exports = { OBJ_PROJ_NAZEV, objednavkaProjZabrana, objednavkaProjCislo, objednavkaProjDatum, objednavkaProjOznaceni, objednavkaProjRozsahy,
    objednavkaProjData, objednavkaProjDocxTelo, objednavkaProjDocxBlob, OBJ_PROJ_SLOUPCE, objednavkaProjStranaRadky, objednavkaProjMisto };
