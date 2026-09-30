/* NÁLEZY 18. KOLA TESTOVÁNÍ (K18, 30. 9. 2026) — Word nabídky PROJ, překlady
 * cizojazyčných nabídek. Každý oddíl hlídá jeden nález; bez jeho opravy
 * testy oddílu selžou.
 *
 *   N92 — Word PROJ neukázal cenu geodetického zaměření (šablona PROJ v3 pro
 *         ni nemá místo), CELKEM ji přitom obsahoval: u zakázky P09 bylo ve
 *         Wordu vidět 18 200 Kč, CELKEM 41 600 Kč. Blok ceny v šabloně PROJ v4
 *         hlídá test_sablona_proj_v4.js; tady je kontrola „cenaWordProj",
 *         která se ozve, když šablona cenu nabízené činnosti nemá kam dát,
 *         a stažení symbolů šablony i kvůli oceněnému geodetu.
 *   N93 — online nabídka OCK v EN/DE/FR psala „Warranty 60 měsíců" (všech
 *         22 cizojazyčných nabídek): kapitola V. náhledu přeložila popisek,
 *         hodnotu z krycího listu ne. Word ({{NAB_KAP_TERMINY}}) ji překládal.
 *   N95 — úvod („Naše NABÍDKA a doporučení") a termíny nabídky PROJ zůstávaly
 *         v cizím jazyce česky: slovník neznal věty úvodu ani několik řádků
 *         a poznámek TERMÍNŮ (vzor „cca …" z nich dělal „approx. do 4 týdnů…").
 *   N96 — dodatkový text z ceníku (popis příplatku v kapitole II.) se do cizí
 *         nabídky nepřeloží: ceník má jedno znění pro všechny jazyky
 *         (cenik.popisy, klíč = název položky) a ručně psaný text aplikace
 *         nepřekládá. Kontrola „dodatekCesky" řekne, u které položky.
 *   N97 — u opláštění po stěnách uváděla nabídka (a technická specifikace)
 *         jen jeden materiál — ten ze standardního režimu. Po stěnách teď
 *         MATERIÁL OPLÁŠTĚNÍ vyjmenuje materiály se stěnami, i v EN/DE/FR.
 *
 * Spuštění: cd src && node test_k18_nalezy.js */
const fs = require('fs');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const EP = nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
nacti('./plan_plateb.js');
const NP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
nacti('./zamek.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');
nacti('./sablony_online.js');
const K = require('./kontroly.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 700) : JSON.stringify(info).slice(0, 700))); } };
global.NAST = { firma: global.firmaDefault() };

/* ======================= N92: cena činnosti ve Wordu ======================= */
{
  /* Symboly skutečné šablony PROJ v3 (Sablona_NABIDKA_PROJ.docx, K18). */
  const V3 = ['ADRESA', 'BLOK_NAVIC_KON', 'BLOK_NAVIC_ZAC', 'CISLO_NABIDKY', 'DATUM', 'NAZEV_AKCE', 'OBJEDNATEL',
    'OBJEDNATEL_KONTAKT', 'PODM_PLATNOST_NABIDKY', 'PODM_SPLATNOST_DNI_CISLO', 'POPIS_ZAMERU', 'PROJ_CELKEM_BEZ_DPH',
    'PROJ_CENA_AD', 'PROJ_CENA_DPS', 'PROJ_CENA_DPZ', 'PROJ_CENA_EZC', 'PROJ_CENA_IC', 'PROJ_CENA_KOLAUDACE',
    'PROJ_CENA_PRED_SLEVOU', 'PROJ_CENA_SP1', 'PROJ_CENA_SP2', 'PROJ_CENA_SP3', 'PROJ_CENA_VARIANTA', 'PROJ_CENA_ZAMERENI',
    'PROJ_DPH_SAZBA', 'PROJ_POLOZKY_NAVIC', 'PROJ_SLEVA_KC', 'PROJ_SLEVA_PROC', 'UVODNI_FOTO', 'UVOD_NABIDKY_PROJ',
    'ZPRAC_EMAIL', 'ZPRAC_JMENO', 'ZPRAC_PODPIS', 'ZPRAC_TEL'];
  const sablona = (symboly, verze) => ({ typ: 'nabidkaProj', verze: verze || 3, nazev: 'Sablona_NABIDKA_PROJ_v3.docx', symboly });
  /* Zakázka jako P09: studie až kolaudace z výchozího zadání a k nim geodet. */
  const zakazka = (geodetKc, uprav) => {
    const z = zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 0409';
    const v = z.varianty[0];
    v.data.proj.cenik = ZC.zkusebniCenikProj();
    v.data.proj.cenik.fixy.geodet = geodetKc || 0;
    if (uprav) uprav(v.data.proj.zadani);
    return { z, v, r: EP.vypocetProj(v.data.proj.zadani, v.data.proj.cenik) };
  };
  const nalez = (ctx) => K.kontrolyProved(ctx).nalezy.find(n => n.kod === 'cenaWordProj');

  const pravidlo = K.kontrolyPravidla().find(p => p.kod === 'cenaWordProj');
  test('N92: pravidlo cenaWordProj je v katalogu a je to varování (dokument nezastaví)', !!pravidlo && !pravidlo.zabranaMozna, pravidlo);

  const p09 = zakazka(19500);
  const n1 = nalez({ projVysledek: p09.r, sablonaNabidkaProj: sablona(V3) });
  test('N92: oceněný geodet a šablona v3 → varování', !!n1 && n1.uroven === K.KONTROLY_UROVEN, n1);
  test('N92: věta jmenuje činnost, chybějící symbol, šablonu i nápravu (PROJ v4)',
    !!n1 && /GEODETICKÉ ZAMĚŘENÍ/.test(n1.text) && /\{\{PROJ_CENA_GEODET\}\}/.test(n1.text)
    && /Sablona_NABIDKA_PROJ_v3/.test(n1.text) && /verze 3/.test(n1.text) && /CELKEM/.test(n1.text) && /PROJ v4/.test(n1.text), n1 && n1.text);
  test('N92: text je bez částek (vidí ho každý)', !!n1 && !/\d\s?\d{3}/.test(n1.text), n1 && n1.text);
  test('N92: šablona v4 (blok {{PROJ_CENA_GEODET_BLOK}}) je v pořádku',
    !nalez({ projVysledek: p09.r, sablonaNabidkaProj: sablona(V3.concat('PROJ_CENA_GEODET_BLOK', 'CENA_GEODET_ZAC', 'CENA_GEODET_KON'), 4) }));
  test('N92: šablona se symbolem {{PROJ_CENA_GEODET}} je v pořádku taky',
    !nalez({ projVysledek: p09.r, sablonaNabidkaProj: sablona(V3.concat('PROJ_CENA_GEODET')) }));
  const bezGeodetu = zakazka(0);
  test('N92: bez oceněného geodetu šablona v3 nic nehlásí', !nalez({ projVysledek: bezGeodetu.r, sablonaNabidkaProj: sablona(V3) }));
  test('N92: neznámá šablona = mlčí (nehádá se)', !nalez({ projVysledek: p09.r, sablonaNabidkaProj: null })
    && !nalez({ projVysledek: p09.r, sablonaNabidkaProj: sablona([]) }));
  test('N92: zakázka jen OCK mlčí', !nalez({ projVysledek: p09.r, sablonaNabidkaProj: sablona(V3), jenOck: true })
    && !nalez({ projVysledek: p09.r, sablonaNabidkaProj: sablona(V3), zak: { jenOck: true } }));
  const nDps = nalez({ projVysledek: bezGeodetu.r, sablonaNabidkaProj: sablona(V3.filter(s => s !== 'PROJ_CENA_DPS')) });
  test('N92: vlastní šablona bez {{PROJ_CENA_DPS}} u oceněné DPS → varování jmenuje DPS',
    !!nDps && /DPS – DOKUMENTACE PRO PROVEDENÍ STAVBY/.test(nDps.text) && /\{\{PROJ_CENA_DPS\}\}/.test(nDps.text) && !/GEODET/.test(nDps.text), nDps && nDps.text);
  /* Zaměření: „část 1" studie ho ukáže, dokud se studie nenabízí. */
  const jenSp1 = V3.filter(s => s !== 'PROJ_CENA_ZAMERENI');
  const zam = zakazka(0, zad => {
    zad.sekce.forEach(s => (s.polozky || []).forEach(p => { p.vyrazeno = s.key !== 'zamereni'; }));
    zad.sekce.find(s => s.key === 'zamereni').polozky.forEach(p => { p.vyrazeno = false; });
  });
  test('příprava: zakázka jen na zaměření má oceněné jen zaměření',
    zam.r.sekce.filter(s => s.celkem > 0).map(s => s.key).join(',') === 'zamereni', zam.r.sekce.filter(s => s.celkem > 0).map(s => s.key));
  test('N92: jen zaměření a šablona s {{PROJ_CENA_SP1}} bez {{PROJ_CENA_ZAMERENI}} — cenu ukáže „část 1", mlčí',
    !nalez({ projVysledek: zam.r, sablonaNabidkaProj: sablona(jenSp1) }));
  const zamSt = zakazka(0, zad => { zad.sekce.find(s => s.key === 'zamereni').polozky.forEach(p => { p.vyrazeno = false; }); });
  test('N92: zaměření se studií — „část 1" nese jen odkaz, bez {{PROJ_CENA_ZAMERENI}} se ozve',
    !!nalez({ projVysledek: zamSt.r, sablonaNabidkaProj: sablona(jenSp1) }));

  /* Smysl pravidla: ozve se PRÁVĚ TEHDY, když se částky činností, které Word
   * ukáže, nesečtou do CELKEM (před slevou — šablona v3 slevu vypisuje). */
  const soucetSedi = (z) => {
    const mapa = NP.NABIDKA_PROJ_CENA_SYMBOL;
    if (!mapa) return null;                          // bez mapy symbolů není co počítat
    const c = NP.nabidkaProjCeny(z.v, 'cz');
    const vidi = k => [mapa[k], mapa[k] + '_BLOK'].some(s => V3.includes(s));
    const vse = NP.NABIDKA_PROJ_SEKCE.reduce((a, k) => a + (c.cenyPred[k] || 0), 0);
    const vWordu = NP.NABIDKA_PROJ_SEKCE.reduce((a, k) => a + (vidi(k) ? (c.cenyPred[k] || 0) : 0), 0);
    return Math.abs(vse - vWordu) < 0.005;
  };
  test('N92: P09 (s geodetem) — ve Wordu v3 se částky do CELKEM nesečtou a pravidlo svítí', soucetSedi(p09) === false && !!n1);
  test('N92: bez geodetu se sečtou a pravidlo mlčí', soucetSedi(bezGeodetu) === true && !nalez({ projVysledek: bezGeodetu.r, sablonaNabidkaProj: sablona(V3) }));

  /* Bez mapy symbolů (modul nabídky PROJ chybí, třeba na serveru) se nehádá. */
  const mapa = global.NABIDKA_PROJ_CENA_SYMBOL;
  delete global.NABIDKA_PROJ_CENA_SYMBOL;
  test('N92: bez mapy symbolů pravidlo mlčí', !nalez({ projVysledek: p09.r, sablonaNabidkaProj: sablona(V3) }));
  global.NABIDKA_PROJ_CENA_SYMBOL = mapa;

  /* Symboly šablony se stahují na pozadí jen, když je co hlídat — nově
   * i kvůli oceněnému geodetu (ui/kontroly_ui.js). */
  const kod = fs.readFileSync(__dirname + '/ui/kontroly_ui.js', 'utf8');
  const stazeno = [];
  global.sablonyOnlineAktivni = () => true;
  global.onlineSablonaMeta = typ => (typ === 'nabidkaProj' ? { verze: 3, nazev: 'Sablona_NABIDKA_PROJ_v3.docx' } : null);
  global.onlineSablonaStahni = typ => { stazeno.push(typ); return new Promise(() => {}); };
  global.docxTextSablony = () => [];
  const ui = new Function(kod + '\nreturn { kontrolySablonaNabidkaProj };')();
  ui.kontrolySablonaNabidkaProj(null, bezGeodetu.r, 'cz');
  test('N92: bez slevy, vlastních položek, plánu i geodetu se šablona nestahuje', stazeno.length === 0, stazeno);
  ui.kontrolySablonaNabidkaProj(null, p09.r, 'cz');
  test('N92: s oceněným geodetem se šablona PROJ stáhne (pravidlo pak ví, co v ní je)', stazeno.indexOf('nabidkaProj') >= 0, stazeno);
}

/* ======================= N93: záruka v cizojazyčné online nabídce ======================= */
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
nacti('./zpracovatel.js'); nacti('./dokumenty.js');
const NB = nacti('./nabidka.js');
{
  const z = zk.novaZakazka();
  z.cislo = '2026 - OPR - CN - 0493'; z.nazevAkce = 'Záruka v cizím jazyce'; z.objednatel = 'Zkušební GmbH';
  const v = z.varianty[0];
  v.data.cenik = ZC.zkusebniCenik();
  v.data.cenik.kurzEurKc = 25;                 // cizí jazyk = eura, bez kurzu dokument nevznikne
  const zarukaOnline = (L) => {
    const sek = NB.nabidkaNahledSekce(NB.nabidkaData(z, v, JEKLY, L).placeholders, L);
    const r = [].concat(...sek.map(s => s.radky)).find(x => x[0] === { cz: 'Záruka', en: 'Warranty', de: 'Gewährleistung', fr: 'Garantie' }[L]);
    return r ? r[1] : null;
  };
  test('N93: česká online nabídka dál „Záruka | 60 měsíců"', zarukaOnline('cz') === '60 měsíců', zarukaOnline('cz'));
  test('N93: anglická online nabídka „Warranty | 60 months" (dřív „60 měsíců")', zarukaOnline('en') === '60 months', zarukaOnline('en'));
  test('N93: německá „Gewährleistung | 60 Monate"', zarukaOnline('de') === '60 Monate', zarukaOnline('de'));
  test('N93: francouzská „Garantie | 60 mois"', zarukaOnline('fr') === '60 mois', zarukaOnline('fr'));
  v.data.kryci = { hodnoty: { zarukaMesicu: '36' } };
  test('N93: přepis v krycím listu (36) se přeloží taky', zarukaOnline('en') === '36 months', zarukaOnline('en'));
  test('N93: Word (kapitola V., {{NAB_KAP_TERMINY}}) zůstává přeložený',
    /(^|\n)Warranty: 36 months($|\n)/.test(NB.nabidkaData(z, v, JEKLY, 'en').placeholders.NAB_KAP_TERMINY));
  /* Co napíše obchodník ručně, projde beze změny (slovník ho nezná). */
  v.data.kryci = { hodnoty: { zarukaMesicu: 'dle smlouvy o dílo' } };
  test('N93: nečíselný text záruky z krycího listu projde beze změny', zarukaOnline('en') === 'dle smlouvy o dílo', zarukaOnline('en'));
}

/* ======================= N95: úvod a termíny nabídky PROJ v cizím jazyce ======================= */
{
  const PR = require('./preklad.js');
  /* Česká písmena, která EN/DE/FR nemají — zbytek češtiny v překladu (vzor
   * „cca …" přeloží jen předponu). Zkratka IČ zůstává i v překladu. */
  const CESKE = /[ěščřžůťďňýáíú]/i;
  const cesky = t => CESKE.test(String(t).replace(/\(IČ\)/g, ''));
  const vety = [...new Set([].concat(...NP.NABIDKA_PROJ_UVOD.map(sk => [].concat(...sk.map(v => [v.cz, v.prvni])))))];
  test('příprava: úvod má 13 různých vět (7 činností, u zaměření je první věta tatáž)', vety.length === 13, vety.length);
  const terminy = NP.NABIDKA_PROJ_DEF.find(b => b.typ === 'pary' && b.nadpis === 'TERMÍNY');
  const iTerm = NP.NABIDKA_PROJ_DEF.indexOf(terminy);
  const pozn = NP.NABIDKA_PROJ_DEF[iTerm + 1];
  const textyTerminu = [].concat(...terminy.radky.map(r => [r[0], r[1]]))
    .concat((pozn.radky || []).map(x => (x && typeof x === 'object') ? x.cz : x))
    /* Šablona PROJ (v3/v4) má dva řádky termínů rozdělené do dvou odstavců;
     * první půlky z nich vzor „cca …" přeložil jen napůl (jazykové mutace
     * v4: „approx. do 4 týdnů od podání žádosti"). */
    .concat(['cca do 4 týdnů od podání žádosti', 'cca 2 měsíce od podání žádosti']);
  ['en', 'de', 'fr'].forEach(L => {
    const U = L.toUpperCase();
    const uvodCesky = vety.concat(NP.NABIDKA_PROJ_UVOD_ZAVER || 'Všechny nabízené činnosti jsou popsány na dalších stránkách naší nabídky.')
      .filter(v => { const s = PR.trStav(v, L); return !s.prelozeno || cesky(s.text); });
    test('N95 ' + U + ': slovník zná všechny věty úvodu nabídky PROJ i závěrečnou větu', uvodCesky.length === 0, uvodCesky);
    const termCesky = textyTerminu.filter(t => { const s = PR.trStav(t, L); return !s.prelozeno || cesky(s.text); });
    test('N95 ' + U + ': řádky TERMÍNŮ i poznámky pod nimi se přeloží celé', termCesky.length === 0, termCesky);
  });
  /* Celá cesta: online nabídka i symbol úvodu pro Word, všechny činnosti. */
  const z = zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 0495';
  const v = z.varianty[0];
  v.data.proj.cenik = ZC.zkusebniCenikProj();
  v.data.proj.cenik.kurzEurKc = 25;
  v.data.proj.zadani.sekce.forEach(s => (s.polozky || []).forEach(p => { p.vyrazeno = false; }));
  v.data.proj.cenik.fixy.pamatkari = 5000; v.data.proj.cenik.fixy.geodet = 19500;
  ['en', 'de', 'fr'].forEach(L => {
    const U = L.toUpperCase();
    const d = NP.nabidkaProjData(z, v, L);
    const nadpisUvodu = PR.tr('Naše NABÍDKA a doporučení', L), nadpisTerm = PR.tr('TERMÍNY', L);
    const uvod = d.bloky.find(b => b.typ === 'proza' && b.nadpis === nadpisUvodu);
    test('N95 ' + U + ': online úvod nabídky PROJ je přeložený (všechny činnosti v rozsahu)',
      !!uvod && uvod.odstavce.length === 4 && !uvod.odstavce.some(cesky), uvod && uvod.odstavce);
    test('N95 ' + U + ': Word {{UVOD_NABIDKY_PROJ}} je přeložený', !!d.placeholders.UVOD_NABIDKY_PROJ && !cesky(d.placeholders.UVOD_NABIDKY_PROJ),
      d.placeholders.UVOD_NABIDKY_PROJ);
    const iT = d.bloky.findIndex(b => b.typ === 'pary' && b.nadpis === nadpisTerm);
    const tb = d.bloky[iT], pb = d.bloky[iT + 1];
    test('N95 ' + U + ': online TERMÍNY bez češtiny (řádky i hodnoty)', !!tb && tb.radky.length === 10 && !tb.radky.some(r => cesky(r[0]) || cesky(r[1])),
      tb && tb.radky.filter(r => cesky(r[0]) || cesky(r[1])));
    test('N95 ' + U + ': poznámky pod TERMÍNY přeložené', !!pb && pb.typ === 'pozn' && pb.radky.length === 2 && !pb.radky.some(cesky), pb && pb.radky);
  });
  /* Česká nabídka se nemění. */
  const cz = NP.nabidkaProjData(z, v, 'cz');
  test('N95 CZ: úvod i termíny zůstávají česky, beze změny', cz.bloky.some(b => b.typ === 'pary' && b.nadpis === 'TERMÍNY'
    && b.radky[4][0] === 'Zajištění stanovisek dotčených orgánů *)')
    && cz.bloky.some(b => b.typ === 'pozn' && b.radky[0] === '*) Termíny pro vyjádření dotčených orgánů a stavebního úřadu nejsou závazné. Jedná se o termíny, které nemůže zhotovitel z velké části ovlivnit.')
    && /^V rámci zamýšlené VÝSTAVBY VÝTAHU A VÝTAHOVÉ ŠACHTY v počáteční fázi nabízíme ZAMĚŘENÍ/.test(cz.placeholders.UVOD_NABIDKY_PROJ));
}

/* ======================= N96: dodatkový text z ceníku v cizí nabídce ======================= */
{
  const eng = require('./engine.js');
  const MADLA = 'MADLA NA BOČNÍCH STĚNÁCH (dřevo, lak)', ZADNI = 'MADLA NA ZADNÍ STĚNĚ (dřevo, lak)';
  const PL_MAT = 'PŘECHODOVÉ PLECHY - NEREZ (MATERIÁL)', PL_MONT = 'PŘECHODOVÉ PLECHY - NEREZ (MONTÁŽ)';
  const ctxS = (popisy, jazyk, uprav) => {
    const zadani = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
    const cenik = Object.assign(ZC.zkusebniCenik(), { popisy });
    if (uprav) uprav(zadani);
    return { zadani, cenik, jazyk, vysledek: eng.vypocet(zadani, cenik, JEKLY, true) };
  };
  const nalez = ctx => K.kontrolyProved(ctx).nalezy.find(n => n.kod === 'dodatekCesky');
  const pravidlo = K.kontrolyPravidla().find(p => p.kod === 'dodatekCesky');
  test('N96: pravidlo dodatekCesky je v katalogu a je to varování', !!pravidlo && !pravidlo.zabranaMozna, pravidlo);

  /* Premisa: dodatkový text jde do cizí nabídky tak, jak je napsaný. */
  {
    const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 0496';
    const v = z.varianty[0];
    v.data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25, popisy: { [MADLA]: 'dubové madlo, lakované' } });
    const p = NB.nabidkaData(z, v, JEKLY, 'en').priplatky.find(x => /HANDRAIL|MADLA/i.test(x.nazev));
    test('premisa: anglická nabídka tiskne dodatkový text česky (ceník nemá jazykové varianty)', !!p && p.popis === 'dubové madlo, lakované', p);
  }
  const n1 = nalez(ctxS({ [MADLA]: 'dubové madlo, lakované' }, 'en'));
  test('N96: anglická nabídka s českým dodatkovým textem → varování jmenuje položku a jazyk',
    !!n1 && n1.uroven === K.KONTROLY_UROVEN && n1.text.indexOf('„' + MADLA + '"') >= 0 && /\bEN\b/.test(n1.text), n1 && n1.text);
  test('N96: věta řekne, proč (ceník má jedno znění, ručně psaný text se nepřekládá) a co s tím',
    !!n1 && /nepřekládá/.test(n1.text) && /Kalkulac/.test(n1.text) && /administrátor/.test(n1.text), n1 && n1.text);
  test('N96: česká nabídka nic nehlásí', !nalez(ctxS({ [MADLA]: 'dubové madlo, lakované' }, 'cz')));
  test('N96: bez jazyka tisku (starší kontext) mlčí', !nalez(ctxS({ [MADLA]: 'dubové madlo, lakované' })));
  test('N96: text, který slovník zná, se přeloží — nehlásí', !nalez(ctxS({ [MADLA]: 'materiál a montáž' }, 'de')));
  test('N96: vynechaný příplatek (sloupec Nabídka) se netiskne — nehlásí',
    !nalez(ctxS({ [MADLA]: 'dubové madlo, lakované' }, 'en', z => { z.priplatkyVynechat = (z.priplatkyVynechat || []).concat('madlaBoky'); })));
  const n2 = nalez(ctxS({ [MADLA]: 'dubové madlo', [ZADNI]: 'madlo na zadní stěně' }, 'fr'));
  test('N96: dvě položky → obě jmenované (FR)', !!n2 && n2.text.indexOf(MADLA) >= 0 && n2.text.indexOf(ZADNI) >= 0 && /položek/.test(n2.text) && /\bFR\b/.test(n2.text), n2 && n2.text);
  /* Přechodové plechy: jsou-li v nabídce obě, sloučí se do „Přechodové plechy
   * — materiál a montáž" a jejich vlastní text se netiskne (nabidka.js). */
  const plechyObe = z => { z.volitelne = Object.assign({}, z.volitelne, { prechodove: false, prechMont: false }); };
  const obe = ctxS({ [PL_MAT]: 'nerezový plech tl. 1,5 mm' }, 'en', plechyObe);
  test('příprava: obě půlky přechodových plechů jsou mezi příplatky',
    ['prechMat', 'prechMont'].every(k => obe.vysledek.priplatky.some(p => p.key === k)), obe.vysledek.priplatky.map(p => p.key));
  test('N96: sloučené přechodové plechy vlastní text netisknou — nehlásí', !nalez(obe));
  const jedna = ctxS({ [PL_MAT]: 'nerezový plech tl. 1,5 mm' }, 'en',
    z => { plechyObe(z); z.priplatkyVynechat = (z.priplatkyVynechat || []).concat('prechMont'); });
  test('N96: zůstane-li jen jedna půlka, text se tiskne — varování', !!nalez(jedna) && nalez(jedna).text.indexOf(PL_MAT) >= 0, nalez(jedna));
  test('N96: zakázka jen projekce mlčí (dodatkové texty má nabídka OCK)',
    !nalez(Object.assign(ctxS({ [MADLA]: 'dubové madlo' }, 'en'), { jenProj: true })));
  const trS = global.trStav;
  delete global.trStav;
  test('N96: bez slovníku (preklad.js) se nehádá — mlčí', !nalez(ctxS({ [MADLA]: 'dubové madlo' }, 'en')));
  global.trStav = trS;
}

/* ======================= N97: materiál opláštění po stěnách ======================= */
{
  const eng = require('./engine.js');
  const TS = require('./techspec.js');
  const pole = TS.TECHSPEC_DEF.reduce((a, s) => a.concat(s.pole), []).find(p => p.id === 'materialOplasteni');
  const CZ_CHARS = /[ěščřžůťďňýáíú]/i;
  /* Exteriér: A sklo VSG 4.4.1, B dvojsklo do 2,2 m a nad ním Cetris,
   * C „bez — dodá stavba", D dvojsklo (výchozí). */
  const zadaniPoStenach = (uprav) => {
    const z = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
    z.typSachty = 'exteriérová';
    const c = ZC.zkusebniCenik();
    z.oplasteni = { rezim: 'poStenach', steny: eng.oplasteniStenyVychozi(z, c) };
    z.oplasteni.steny.B.pasy = [{ typ: 'C.skloBokyKc', doM: 2.2 }, { typ: 'C.cetrisKc', doM: null }];
    z.oplasteni.steny.C.pasy = [{ typ: 'bez', doM: null }];
    if (uprav) uprav(z);
    return { z, c, r: eng.vypocet(z, c, JEKLY, false) };
  };
  const hodnota = (Z, C, r, jazyk, hodnoty) => TS.tsHodnota(pole, { hodnoty: hodnoty || {}, extra: [] }, r, Z, C, jazyk);

  /* Standardní režim se nemění — věta z číselníku, překládá ji volající. */
  const std = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI)); std.typSachty = 'exteriérová';
  const rStd = eng.vypocet(std, ZC.zkusebniCenik(), JEKLY, false);
  const hStd = hodnota(std, ZC.zkusebniCenik(), rStd, 'en');
  test('N97: standardní režim beze změny (exteriér: dvojsklo s VSG, číselník; překládá volající)',
    hodnota(std, ZC.zkusebniCenik(), rStd, 'cz').text === 'izolační dvojsklo v kombinaci s vrstveným bezpečnostním sklem VSG'
    && hStd.text === 'izolační dvojsklo v kombinaci s vrstveným bezpečnostním sklem VSG' && !hStd.prelozeno, hStd);

  const ps = zadaniPoStenach();
  const cz = hodnota(ps.z, ps.c, ps.r, 'cz').text;
  test('N97: po stěnách vyjmenuje materiály se stěnami (CZ)',
    cz === 'Sklo VSG 4.4.1 (stěna A); Dvojsklo (boky + záda) (stěny B, D); Cetris (stěna B); bez — dodá stavba (stěna C)', cz);
  ['en', 'de', 'fr'].forEach(L => {
    const h = hodnota(ps.z, ps.c, ps.r, L);
    test('N97 ' + L.toUpperCase() + ': materiály po stěnách přeložené a hlášené jako přeložené', h.prelozeno === true
      && !CZ_CHARS.test(h.text) && /\bA\)/.test(h.text) && /B, D\)/.test(h.text) && h.text.split('; ').length === 4, h);
  });
  test('N97 EN: znění („Wall A", „Walls B, D", názvy typů ze slovníku)', hodnota(ps.z, ps.c, ps.r, 'en').text
    === 'Laminated safety glass VSG 4.4.1 (Wall A); Double glazing (sides + rear) (Walls B, D); Cement-bonded particle board (Wall B); None — supplied by the building contractor (Wall C)',
    hodnota(ps.z, ps.c, ps.r, 'en').text);
  /* Ruční název typu „jiné" projde beze změny (napsal ho obchodník). */
  const psJ = zadaniPoStenach(z => { z.oplasteni.steny.D.pasy = [{ typ: 'jine', nazev: 'Trapézový plech', naklad: 1200, doM: null }]; });
  test('N97: ruční název u typu „jiné" projde beze změny i v EN', /Trapézový plech \(Wall D\)/.test(hodnota(psJ.z, psJ.c, psJ.r, 'en').text),
    hodnota(psJ.z, psJ.c, psJ.r, 'en').text);
  /* N41b: pás, který jádro nezapočítá, se jako materiál neuvádí. */
  const psN = zadaniPoStenach(z => {
    const H = eng.vypocet(z, ZC.zkusebniCenik(), JEKLY, false).oplasteni.vyska;
    z.oplasteni.steny.B.pasy = [{ typ: 'C.skloBokyKc', doM: H + 5 }, { typ: 'C.cetrisKc', doM: null }];
  });
  test('N97: pás, který jádro nezapočítá (N41b), se mezi materiály neobjeví', !/Cetris/.test(hodnota(psN.z, psN.c, psN.r, 'cz').text)
    && /Dvojsklo \(boky \+ záda\) \(stěny B, D\)/.test(hodnota(psN.z, psN.c, psN.r, 'cz').text),
    hodnota(psN.z, psN.c, psN.r, 'cz').text);
  test('N97: ruční hodnota ve specifikaci má dál přednost', hodnota(ps.z, ps.c, ps.r, 'cz', { materialOplasteni: 'dle výkresu' }).text === 'dle výkresu');

  /* Nabídka: symbol TS_MATERIAL_OPLASTENI i věta o opláštění. */
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 0497';
  const v = z.varianty[0];
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 });
  v.data.ock.zadani = ps.z;
  const dCz = NB.nabidkaData(z, v, JEKLY, 'cz'), dEn = NB.nabidkaData(z, v, JEKLY, 'en');
  test('N97: nabídka (Word i online) nese materiály po stěnách', dCz.placeholders.TS_MATERIAL_OPLASTENI === cz
    && /\(stěny B, D\)/.test(dCz.placeholders.OPLASTENI_VETA), [dCz.placeholders.TS_MATERIAL_OPLASTENI, dCz.placeholders.OPLASTENI_VETA]);
  test('N97: anglická nabídka je nese přeložené', /\(Walls B, D\)/.test(dEn.placeholders.TS_MATERIAL_OPLASTENI)
    && !CZ_CHARS.test(dEn.placeholders.TS_MATERIAL_OPLASTENI), dEn.placeholders.TS_MATERIAL_OPLASTENI);
  const radek = NB.nabidkaNahledSekce(dEn.placeholders, 'en').map(s => s.radky).reduce((a, x) => a.concat(x), [])
    .find(r => r[0] === PR_TR('MATERIÁL OPLÁŠTĚNÍ', 'en'));
  test('N97: online náhled nabídky (EN) má řádek materiálu po stěnách', !!radek && radek[1] === dEn.placeholders.TS_MATERIAL_OPLASTENI
    && /\(Walls B, D\)/.test(radek[1]), radek);
}

function PR_TR(t, L) { return require('./preklad.js').tr(t, L); }

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
