/* ============================================================
 * #529 — „Zálohovat teď" v prohlížeči (nález J. V. 27. 10. 2026,
 * testengscalc, 1 420 zakázek)
 *
 * J. V. jednou klikl na „Zálohovat teď" a dostal žlutě „Zálohu se
 * nepodařilo pořídit: … poslední vynucená záloha je mladší než 10 minut",
 * ač žádnou ruční zálohu nespouštěl. Příčina: automatická záloha po
 * přihlášení správce (`…-auto`) obsadila 10minutový odstup serveru
 * (K3-N4) a v přehledu se navíc ukazovala jako „ručně".
 *
 * Simulace: přihlášení správce (onlineZalohaAuto) a hned kliknutí
 * (onlineZalohaTed) proti náhradě serveru se SKUTEČNÝM limitem
 * (netlify/lib/zalohovani.mjs → vynuceneLimit), otisk po krocích
 * (hotovo: false → pokracovat), dvojí kliknutí, informativní hláška
 * u čerstvé zálohy, texty přehledu (automaticky, 1 účet / 2 účty / 5 účtů).
 * Úseky src/ui/online_ui.js se vyříznou a spustí ve vm (vzor
 * test_o7_kopie_klient.js).
 *
 * Pojistka: s online_ui.js a lib/zalohovani.mjs z 95a1356 (v26.10.12)
 * selže 12 ze 17 kontrol (viz commit); po opravě vše projde.
 * ============================================================ */
process.env.TZ = 'Europe/Prague';
const fs = require('fs');
const vm = require('vm');
const zdroj = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
const usek = (od, po) => { const a = zdroj.indexOf(od), b = zdroj.indexOf(po, a + 1); return a > 0 && b > a ? zdroj.slice(a, b) : ''; };
const pocty = usek('/* Počet zakázek česky', 'function onlineMozne');
const popis = usek('function onlineOtiskPokusText()', '/* VYNUCENÁ ZÁLOHA (4. 8. 2026)');
const zaloha = usek('function onlineZalohaTed()', '/* ---------- KOPIE ZÁLOH NA DISK GOOGLE');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
test('úseky online_ui.js nalezeny', !!pocty && !!popis && !!zaloha);

/* Náhrada serveru /api/zaloha_vynuceno: limit z netlify/lib/zalohovani.mjs,
 * otisk se dokončí ve `kroku` krocích. `ted` = simulované hodiny serveru. */
const server = (Z) => {
  const srv = { ted: Date.parse('2026-10-27T08:42:54Z'), klice: [], kroku: 3, posty: [], rozprac: {} };
  srv.api = async (cesta, telo) => {
    srv.posty.push(telo || null);
    const chyba = (stav, d) => { const e = new Error(d.chyba); e.stav = stav; e.data = d; throw e; };
    if (telo && telo.akce === 'pokracovat') {
      const r = srv.rozprac[telo.klic];
      if (!r) chyba(404, { ok: false, chyba: 'Rozpracovaná záloha ' + telo.klic + ' není.' });
      if (++r.krok < srv.kroku) return { ok: true, den: telo.klic, hotovo: false, postup: { hotovo: r.krok * 500, celkem: 1500 } };
      srv.klice = srv.klice.filter(k => k !== r.rez).concat([telo.klic]);
      delete srv.rozprac[telo.klic];
      return { ok: true, den: telo.klic, hotovo: true, pocetZakazek: 1420, pocetUctu: 1 };
    }
    const druh = telo && telo.duvod === 'auto' ? 'auto' : 'rucne';
    const L = Z.vynuceneLimit(srv.klice, srv.ted, druh);
    if (!L.ok) chyba(429, { ok: false, kod: 'limitZalohy', chyba: L.chyba, dalsi: new Date(L.dalsiMs).toISOString(),
      ...(Number.isFinite(L.posledniMs) ? { posledni: new Date(L.posledniMs).toISOString(), posledniHotova: !!L.posledniHotova } : {}) });
    const klic = Z.klicVynuceny(druh, srv.ted), rez = Z.VYNUCENE_REZERVACE + klic + '~ab12cd34';
    srv.klice.push(rez);
    srv.rozprac[klic] = { krok: 1, rez };
    return { ok: true, den: klic, hotovo: false, postup: { hotovo: 500, celkem: 1500 } };
  };
  return srv;
};

const novyCtx = (srv) => {
  const ctx = { Promise, JSON, String, Error, Date, Object, Array, Math, isFinite, setTimeout,
    zpravy: [], prekresleni: 0,
    ONLINE_STAV: { otisky: [], otiskyNacteno: true, rozpracovane: [], retenceVarovani: null, kopieDisk: null },
    jeAdminOnline: () => true, render: () => { ctx.prekresleni++; },
    onlineZprava: (t, typ) => { ctx.zpravy.push([String(t), typ || '']); },
    onlineOtiskyNacti: () => Promise.resolve(ctx.nacteno === undefined ? true : ctx.nacteno),
    onlineZalohaDoSlozkyAuto: () => Promise.resolve(false), onlineKopieDiskAuto: () => Promise.resolve(false),
    onlineApi: (c, t) => srv.api(c, t),
  };
  vm.createContext(ctx);
  vm.runInContext(pocty + popis + zaloha + '\nthis.ted = onlineZalohaTed; this.auto = onlineZalohaAuto; this.popis = onlineOtiskPopis;'
    + ' this.sklon = typeof onlineSklon === "function" ? onlineSklon : null; this.pocet = onlinePocetText;', ctx);
  return ctx;
};
const posledni = (ctx) => ctx.zpravy[ctx.zpravy.length - 1] || ['', ''];

(async () => {
  const Z = await import('../netlify/lib/zalohovani.mjs');

  /* ---- přihlášení správce (automatická záloha) a hned jedno kliknutí ---- */
  {
    const srv = server(Z), ctx = novyCtx(srv);
    await ctx.auto();
    test('přihlášení: automatická záloha proběhla po krocích (slot -auto)', srv.klice.some(k => /T084254-auto$/.test(k)), srv.klice);
    srv.ted += 2 * 60000;                                    // 9:44:54 — J. V. klikne
    const v = await ctx.ted();
    const [t, typ] = posledni(ctx);
    test('#529 (a): jedno kliknutí po automatické záloze = záloha pořízena, žádné „nepodařilo"',
      v === true && /^Záloha databáze pořízena/.test(t) && typ === '' && !ctx.zpravy.some(z => /nepodařilo/.test(z[0])), ctx.zpravy);
    test('#529 (a): kliknutí poslalo jeden POST s důvodem „rucne" a pak jen kroky „pokracovat"',
      srv.posty.filter(p => p && p.duvod === 'rucne').length === 1
      && srv.posty.filter(p => p && p.akce === 'pokracovat').length === 2 * (srv.kroku - 1), srv.posty);
    test('#529 (a): průběh po částech se hlásí a výsledná hláška skloňuje „1 účet"',
      ctx.zpravy.some(z => /zpracováno 500 z 1500 záznamů/.test(z[0])) && /1420 zakázek, 1 účet\)/.test(t), t);
    test('#529: po dokončení tlačítka zase povolená (pracuje = false)', ctx.ONLINE_STAV.pracuje === false);

    /* ---- druhé kliknutí do 10 minut: informace, ne selhání ---- */
    srv.ted += 60000;                                        // 9:45:54
    const v2 = await ctx.ted();
    const [t2, typ2] = posledni(ctx);
    test('#529 (c): limit u hotové čerstvé zálohy → šedá informace s časy, ne „nepodařilo"',
      v2 === false && typ2 === '' && t2 === 'Poslední záloha z 9:44 je hotová. Další ruční záloha půjde v 9:54.', [t2, typ2]);
  }

  /* ---- rozpracovaná záloha v jiné kartě: „se právě pořizuje" ---- */
  {
    const srv = server(Z), ctx = novyCtx(srv);
    await srv.api('/api/zaloha_vynuceno', { duvod: 'rucne' });   // jiná karta začala, nedokončila
    srv.ted += 30000;
    await ctx.ted();
    const [t, typ] = posledni(ctx);
    test('#529 (c): ruční záloha rozpracovaná jinde → „se právě pořizuje", šedě', typ === ''
      && t === 'Záloha z 9:42 se právě pořizuje. Další ruční záloha půjde v 9:52.', [t, typ]);
  }

  /* ---- denní strop: skutečné odmítnutí zůstane varováním ---- */
  {
    const srv = server(Z), ctx = novyCtx(srv);
    for (let i = 0; i < 20; i++) srv.klice.push(Z.klicVynuceny('rucne', srv.ted - 3600000 - i * 30 * 60000));
    await ctx.ted();
    const [t, typ] = posledni(ctx);
    test('#529: denní strop 20 záloh → dál varování „nepodařilo" s důvodem', typ === 'varovani'
      && /^Zálohu se nepodařilo pořídit: .*20 vynucených záloh/.test(t), [t, typ]);
  }

  /* ---- dvojí obsluha kliknutí ---- */
  {
    const srv = server(Z), ctx = novyCtx(srv);
    const [a, b] = await Promise.all([ctx.ted(), ctx.ted()]);
    test('#529 (a): dvě volání za sebou (dvojklik) = jeden POST a jedna záloha, obě vrátí úspěch',
      a === true && b === true && srv.posty.filter(p => p && p.duvod).length === 1
      && srv.klice.filter(k => /-rucne$/.test(k)).length === 1, srv.posty);
  }

  /* ---- automatika bez načteného přehledu nic nepořizuje ---- */
  {
    const srv = server(Z), ctx = novyCtx(srv);
    ctx.nacteno = false;
    await ctx.auto();
    test('#529: přehled záloh se nenačetl → automatická záloha se nepořizuje', srv.posty.length === 0, srv.posty);
  }

  /* ---- přehled: automaticky / ručně / v noci, skloňování ---- */
  {
    const srv = server(Z), ctx = novyCtx(srv);
    const o = (den, zdroj, ucty, zak) => ({ den, zdroj, porizena: '2026-10-27T08:42:54.000Z', pocetZakazek: zak === undefined ? 1420 : zak, pocetUctu: ucty });
    ctx.ONLINE_STAV.otisky = [o('2026-10-27T084254-auto', 'vynuceno', 1)];
    test('#529 (b): automatická záloha po přihlášení se v přehledu ukazuje jako „automaticky", ne „ručně"',
      /\(automaticky po přihlášení, 1420 zakázek, 1 účet\)/.test(ctx.popis()) && !/ručně/.test(ctx.popis()), ctx.popis());
    ctx.ONLINE_STAV.otisky = [o('2026-10-27T084254-rucne', 'vynuceno', 3, 1), o('2026-10-27', 'nocni-otisk', 3)];
    test('#529: ruční záloha „ručně", 1 zakázka, 3 účty, „v přehledu 2 poslední"',
      /\(ručně, 1 zakázka, 3 účty\) · v přehledu 2 poslední\./.test(ctx.popis()), ctx.popis());
    ctx.ONLINE_STAV.otisky = [o('2026-10-27', 'nocni-otisk', 7, 0)];
    test('#529: noční záloha „sama v noci", 0 zakázek, 7 účtů, „1 poslední"',
      /\(sama v noci, 0 zakázek, 7 účtů\) · v přehledu 1 poslední\./.test(ctx.popis()), ctx.popis());
    const s = ctx.sklon;
    test('#529: onlineSklon — 1 účet, 2–4 účty, 0 / 5+ / 1,5 účtů',
      !!s && s(1, 'účet', 'účty', 'účtů') === '1 účet' && s(2, 'účet', 'účty', 'účtů') === '2 účty' && s(4, 'účet', 'účty', 'účtů') === '4 účty'
      && s(5, 'účet', 'účty', 'účtů') === '5 účtů' && s(0, 'účet', 'účty', 'účtů') === '0 účtů' && s(1.5, 'účet', 'účty', 'účtů') === '1.5 účtů'
      && s(22, 'účet', 'účty', 'účtů') === '22 účtů');
    test('#529: onlinePocetText beze změny (1 zakázka, 3 zakázky, 5 zakázek)',
      ctx.pocet(1) === '1 zakázka' && ctx.pocet(3) === '3 zakázky' && ctx.pocet(5) === '5 zakázek');
  }

  /* ---- ostatní počty v Nastavení → Databáze (obnova ze zálohy) ---- */
  test('#529: obnova skloňuje počet záznamů a nových / přepsaných (žádné „+ \' záznamů (\'" natvrdo)',
    !/\+ ' záznamů \('/.test(zdroj) && !/' nových, '/.test(zdroj) && !/x\.pocetUctu \+ ' účtů'/.test(zdroj) && !/o\.pocetUctu \+ ' účtů/.test(zdroj));

  console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka', e && e.stack || e); process.exit(1); });
