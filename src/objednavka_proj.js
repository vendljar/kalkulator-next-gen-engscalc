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
  const p = d.placeholders;
  const cisloNabidky = p.CISLO_NABIDKY;
  const cislo = objednavkaProjCislo(cisloNabidky);
  if (!cislo) return { chyba: cisloNabidky
    ? 'Číslo nabídky „' + cisloNabidky + '" neobsahuje část „CN" — číslo objednávky z něj nejde odvodit. Opravte číslo nabídky v hlavičce zakázky.'
    : 'Zakázka nemá číslo nabídky — objednávka bez čísla nevznikne. Vyplňte číslo nabídky v hlavičce zakázky.' };
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
      mnozstvi: 1, mj: 'kpl', cenaJedn: cena, celkemBezDph: cena, dphPct: s.dphPct, dph: x.dphKc, celkemSDph: x.sDph };
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
  if (!(varianta && varianta.zamek && varianta.zamek.zamceno))
    upozorneni.push('Nabídka PROJ této varianty ještě nebyla odeslána (vytištěna). Objednávka odkazuje na cenovou nabídku č. '
      + cisloNabidky + ' — pošlete zákazníkovi nejdřív ji.');

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

  /* Číslo zakázky: ručně vyplněné „Číslo SoD" krycího listu PROJ (návrh z čísla
   * nabídky se nebere — to by bylo jen číslo nabídky podruhé). */
  const kl = (varianta && varianta.data && varianta.data.kryciProj && varianta.data.kryciProj.hodnoty) || {};
  const cisloZakazky = t(kl.cisloSod);

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
    datumVystaveni: objednavkaProjDatum(m.dnes), cisloZakazky, dodavatel, objednatel,
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
  const x = docxPar(text, Object.assign({ sz: 16, after: 0 }, o));
  return o.vpravo ? x.replace('<w:pPr>', '<w:pPr><w:jc w:val="right"/>') : x;
}
function objDocxTabulka(sirky, radkyXml, okraje) {
  const hr = okraje === false ? 'none' : 'single';
  return '<w:tbl><w:tblPr><w:tblW w:w="' + sirky.reduce((a, b) => a + b, 0) + '" w:type="dxa"/><w:tblLayout w:type="fixed"/>'
    + '<w:tblBorders><w:top w:val="' + hr + '" w:sz="4" w:color="C7D0DB"/><w:left w:val="' + hr + '" w:sz="4" w:color="C7D0DB"/>'
    + '<w:bottom w:val="' + hr + '" w:sz="4" w:color="C7D0DB"/><w:right w:val="' + hr + '" w:sz="4" w:color="C7D0DB"/>'
    + '<w:insideH w:val="' + hr + '" w:sz="4" w:color="C7D0DB"/><w:insideV w:val="' + hr + '" w:sz="4" w:color="C7D0DB"/></w:tblBorders></w:tblPr>'
    + '<w:tblGrid>' + sirky.map(w => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>' + radkyXml + '</w:tbl>';
}
/* Tělo dokumentu (XML) — tytéž údaje a pořadí jako tiskový náhled. */
function objednavkaProjDocxTelo(o) {
  const kc = o.texty.kc;
  const B = (t, x) => objDocxOdst(t, Object.assign({ b: true }, x || {}));
  const blokStrany = (nadpis, s, zastupce) => [B(nadpis, { sz: 18, color: '2B3850' }), B(s.nazev || '……'), objDocxOdst(s.adresa || '……'),
    objDocxOdst('IČ: ' + (s.ico || '……') + (s.dic ? '    DIČ: ' + s.dic : ''))]
    .concat(s.telefon || s.email ? [objDocxOdst([s.telefon ? 'Tel.: ' + s.telefon : '', s.email ? 'E-mail: ' + s.email : ''].filter(Boolean).join('    '))] : [])
    .concat(zastupce ? [objDocxOdst('Zastoupen: ' + zastupce)] : []).join('');
  /* Hlavička: vlevo dodavatel, vpravo název a čísla dokladu, pod nimi objednatel. */
  const vpravo = B(o.nazev, { sz: 28, vpravo: true }) + B('Číslo dokladu: ' + o.cislo, { vpravo: true, sz: 18 })
    + (o.cisloZakazky ? objDocxOdst('Číslo zakázky: ' + o.cisloZakazky, { vpravo: true }) : '')
    + objDocxOdst('Datum případu: ' + o.datumVystaveni, { vpravo: true, after: 120 })
    + blokStrany('Objednatel', o.objednatel, o.objednatel.zastupce);
  let body = objDocxTabulka([4800, 4838], '<w:tr>' + objDocxBunka(blokStrany('Dodavatel', o.dodavatel), 4800)
    + objDocxBunka(vpravo, 4838) + '</w:tr>', false);
  body += objDocxOdst('', { after: 80 });
  if (o.akce.nazev || o.akce.adresa)
    body += objDocxOdst('Akce: ' + [o.akce.nazev, o.akce.adresa].filter(x => x && x !== '…').join(', '), { after: 80 });
  /* Tabulka řádků: č., označení, popis, množství, MJ, jedn. cena, celkem bez DPH, DPH %, celkem s DPH. */
  const W = [380, 700, 3458, 500, 400, 1100, 1100, 500, 1500];
  const hlava = ['Č.', 'Označení', 'Popis dodávky', 'Množ.', 'MJ', 'Jedn. cena bez DPH', 'Celkem bez DPH', 'DPH %', 'Celkem s DPH'];
  let tr = '<w:tr>' + hlava.map((t, i) => objDocxBunka(B(t, { sz: 14, color: 'FFFFFF', vpravo: i >= 3 }), W[i], { fill: '2B3850' })).join('') + '</w:tr>';
  o.radky.forEach(x => {
    const popis = B(x.nazev) + (x.popis.length ? objDocxOdst(x.popis.join('\n'), { sz: 14 }) : '');
    tr += '<w:tr>' + [objDocxOdst(String(x.c)), objDocxOdst(x.oznaceni), popis, objDocxOdst(String(x.mnozstvi), { vpravo: true }),
      objDocxOdst(x.mj, { vpravo: true }), objDocxOdst(kc(x.cenaJedn), { vpravo: true }), objDocxOdst(kc(x.celkemBezDph), { vpravo: true }),
      objDocxOdst(x.dphPct + ' %', { vpravo: true }), objDocxOdst(kc(x.celkemSDph), { vpravo: true })]
      .map((c, i) => objDocxBunka(c, W[i])).join('') + '</w:tr>';
  });
  if (o.sleva)
    tr += '<w:tr>' + objDocxBunka(objDocxOdst('Sleva ' + o.sleva.pct + ' %'), W[0] + W[1] + W[2] + W[3] + W[4] + W[5], { span: 6 })
      + objDocxBunka(objDocxOdst(kc(o.sleva.bezDph), { vpravo: true }), W[6]) + objDocxBunka(objDocxOdst(o.souhrn.dphPct + ' %', { vpravo: true }), W[7])
      + objDocxBunka(objDocxOdst(kc(o.sleva.sDph), { vpravo: true }), W[8]) + '</w:tr>';
  const souctova = (t, v, tucne) => '<w:tr>' + objDocxBunka((tucne ? B : objDocxOdst)(t, { vpravo: true }), W.slice(0, 8).reduce((a, b) => a + b, 0), { span: 8, fill: tucne ? 'EEF2F8' : '' })
    + objDocxBunka((tucne ? B : objDocxOdst)(v, { vpravo: true }), W[8], { fill: tucne ? 'EEF2F8' : '' }) + '</w:tr>';
  tr += souctova('Celkem bez DPH', o.texty.bezDph) + souctova('DPH ' + o.souhrn.dphPct + ' %', o.texty.dph) + souctova('Celkem Kč', o.texty.sDph, true);
  body += objDocxTabulka(W, tr);
  if (o.mimoCenu.length) body += objDocxOdst('Mimo celkovou cenu (podle cenové nabídky): ' + o.mimoCenu.join('; '), { sz: 14, after: 60 });
  body += objDocxOdst('', { after: 240 });
  body += objDocxOdst('Datum: ……………………………        Podpis objednatele: ………………………………………', { sz: 18, after: 240 });
  body += B('Poznámka', { sz: 16 }) + objDocxOdst(o.poznamka, { after: 80 });
  if (o.platebniKalendar.length) body += B('Platební kalendář') + objDocxOdst(o.platebniKalendar.join('\n'), { after: 80 });
  if (o.terminy.length) body += B('Termíny') + objDocxOdst(o.terminy.map(x => x[0] + (x[1] ? ' – ' + x[1] : '')).join('\n'), { after: 80 });
  return body;
}
function objednavkaProjDocxBlob(o) { return docxSestavBlob(objednavkaProjDocxTelo(o)); }

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
  module.exports = { OBJ_PROJ_NAZEV, objednavkaProjCislo, objednavkaProjDatum, objednavkaProjOznaceni, objednavkaProjRozsahy,
    objednavkaProjData, objednavkaProjDocxTelo, objednavkaProjDocxBlob };
