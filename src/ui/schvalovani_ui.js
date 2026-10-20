/* ================= ZÁLOŽKA SCHVALOVÁNÍ SLEV =========================
 * (zadání 5. 8. 2026: „Vytvoř novou záložku ‚schvalování slev'.")
 *
 * PROČ VLASTNÍ ZÁLOŽKA
 * Schvalování dosud viselo v kartě „Sleva na nabídku" pod výpočtem: kdo měl
 * kartu na obrazovce, viděl tlačítko „Schválit slevu", vybral si v seznamu
 * roli nadřízeného a odklepl si vlastní žádost sám. Rozhraní tím schvalování
 * jen předstíralo — nešlo poznat, kdo o slevě opravdu rozhodl, a nikde nebyl
 * seznam žádostí, na který by se vedoucí mohl podívat. Tady je obojí:
 * pracovní seznam za celou zakázku a rozhodnutí podepsané přihlášeným
 * člověkem.
 *
 * KDO SEM VIDÍ
 * Záložku vidí každý, protože obchodník potřebuje vědět, jak jeho žádost
 * dopadla — bez toho by čekal naslepo. Rozhodovat ale smí jen ten, komu
 * administrátor přidělil právo `sleva.schvalovani` (Nastavení → Zobrazení)
 * A ZÁROVEŇ jehož vlastní strop slevu pokrývá: vedoucí se stropem 15 %
 * odklepne žádost na 8 %, žádost na 20 % mu zůstane jen ke čtení a půjde dál
 * k administrátorovi. Obchodník tedy v seznamu vidí i své žádosti, ale
 * tlačítka u nich nemá.
 *
 * PROČ SE ROZHODNUTÍ PODEPISUJE PŘIHLÁŠENÝM JMÉNEM
 * Dřív se do pole „schválil" psala vybraná ROLE („Vedoucí"), ne člověk. Po
 * půl roce z toho nešlo zjistit nic — kdo tu slevu vlastně pustil. Teď se
 * zapisuje jméno z přihlášení i s rolí; v offline režimu jméno z Nastavení.
 * ==================================================================== */

/* Rozepsané důvody zamítnutí. Drží se mimo zakázku: dokud se nezamítne,
 * není to údaj o nabídce, jen rozepsaný text v okně. Kdyby se ukládal do
 * varianty rovnou, každé klepnutí do políčka by měnilo zakázku (a plnilo
 * historii i automatické zálohy). */
const SCHV_DUVODY = {};
function schvDuvod(id, val) { SCHV_DUVODY[id] = String(val || ''); }

/* Kdo rozhoduje – jméno i role, aby šlo po čase dohledat člověka, ne roli. */
function schvKdoJsem() {
  const ja = (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV) ? ONLINE_STAV.ja : null;
  const role = (typeof zobrazeniRole === 'function') ? zobrazeniRole() : (NAST.jeAdmin ? 'Administrátor' : 'Obchodník');
  const jmeno = ja ? (ja.jmeno || ja.email) : (NAST.uzivatel || '');
  return jmeno ? jmeno + ' (' + role + ')' : role;
}

/* Podklady pro seznam: základ ceny a nákladu za každou variantu. Bere se
 * z téhož výpočtu jako porovnání variant, aby v obou přehledech stála
 * stejná čísla. */
function schvVypocty() {
  const out = {};
  ((ZAK && ZAK.varianty) || []).forEach(v => {
    let r = null;
    /* Vyřazená strana (P6, zámek strany) nemá cenu, ze které by šla sleva
     * schvalovat — výsledek null, jako u části, která nejde spočítat. */
    const vyr = (typeof zakazkaVyrazenaStrana === 'function') ? zakazkaVyrazenaStrana(ZAK) : '';
    try { r = vyr === 'ock' ? null : (typeof vypocetZ === 'function' ? vypocetZ(v, JEKLY) : vypocet(v.data.ock.zadani, v.data.cenik, JEKLY, v.data.ock.fixes)); } catch (e) {}
    /* Dvě části, dva základy (#134). Sleva projekce se počítá z ceny projekce
     * včetně dopravy — cena ji obsahuje, tak ji musí obsahovat i náklad. */
    let rp = null;
    try { rp = vyr === 'proj' ? null : (typeof vypocetProjZ === 'function' ? vypocetProjZ(v) : vypocetProj(v.data.proj.zadani, v.data.proj.cenik)); } catch (e) {}
    out[v.id] = {
      ock: (r && r.souhrn) ? { zakladCena: r.souhrn.zakladCena, zakladNaklad: r.souhrn.zakladNaklad } : null,
      proj: (rp && rp.souhrn) ? { zakladCena: rp.souhrn.celkem,
        zakladNaklad: rp.souhrn.naklad + (rp.souhrn.doprava || 0) } : null,
    };
  });
  return out;
}

/* Srovnání stavů se skutečností před vykreslením. Bez toho by schválení
 * drželo i poté, co se variantě změnil ceník a sleva se propadla pod
 * minimální marži. Uzamčené varianty se přeskakují — odeslaná nabídka je
 * doklad a nesmí se v ní nic přepisovat ani dopočítávat. */
function schvPrepoctiVse(vypocty) {
  ((ZAK && ZAK.varianty) || []).forEach(v => {
    if (!v.data) return;
    if (typeof variantaUzamcena === 'function' && variantaUzamcena(v)) return;
    const z = schvalovaniZaklady(vypocty[v.id]);
    const prepocti = (sl, zak) => {
      if (!sl) return;
      schvalovaniPrepocti(sl, zak ? slevaVyhodnot(zak.zakladCena, zak.zakladNaklad, sl, NAST.slevy) : null);
    };
    prepocti(v.data.sleva, z.ock);
    prepocti(v.data.slevaProj, z.proj);      // #134: každá sleva nad svou cenou
  });
}

function schvSmiRozhodovat() { return smiZobrazit('sleva.schvalovani'); }

/* Rozhodnutí o jedné žádosti. `co` = 'schvalit' | 'zamitnout' | 'vratit'. */
function schvRozhodni(id, co, cast) {
  const v = ((ZAK && ZAK.varianty) || []).find(x => x.id === id);
  /* Část se předává výslovně (#134). Kdyby se odvozovala, rozhodnutí o slevě
   * na projekt by mohlo skončit u slevy na šachtu — a naopak. */
  const sl = v && v.data && (cast === 'proj' ? v.data.slevaProj : v.data.sleva);
  if (!v || !sl) return;
  if (!schvSmiRozhodovat()) {
    hlaska('O slevách rozhoduje vedoucí nebo administrátor.\n\n'
      + 'Právo „Schvalování slevy nad strop role" přiděluje administrátor '
      + 'v Nastavení → Zobrazení.');
    return;
  }
  if (typeof variantaUzamcena === 'function' && variantaUzamcena(v)) {
    hlaska(`Varianta „${v.nazev}" je uzamčená – byla vytištěna jako cenová nabídka, `
      + 'tedy odeslána zákazníkovi.\n\nCo v ní odešlo, se zpětně neschvaluje ani nemění. '
      + 'Pro jinou slevu založte novou variantu.');
    return;
  }
  const pct = +sl.procenta || 0;
  const role = (typeof zobrazeniRole === 'function') ? zobrazeniRole() : 'Obchodník';
  if (co !== 'vratit' && !schvalovaniSmiRozhodnout(role, pct, NAST.slevy)) {
    const kdo = schvalovaniKdoMuze(pct, NAST.slevy, NAST.role);
    hlaska(`Sleva ${pct} % přesahuje strop role „${role}".\n\n`
      + (kdo.length ? 'Rozhodnout o ní může: ' + kdo.join(', ') + '.'
                    : 'Podle nastavení stropů o ní nemůže rozhodnout žádná role – '
                      + 'zkontrolujte Nastavení → Slevy.'));
    return;
  }
  const klic = id + '|' + (cast === 'proj' ? 'proj' : 'ock');
  if (co === 'schvalit') schvalovaniSchval(sl, schvKdoJsem());
  else if (co === 'zamitnout') schvalovaniZamitni(sl, schvKdoJsem(), null, SCHV_DUVODY[klic] || SCHV_DUVODY[id] || '');
  else schvalovaniVrat(sl);
  render();
}

/* Přepnutí do kalkulace na variantu, o které se rozhoduje – vedoucí si chce
 * skoro vždy nejdřív prohlédnout, co za tou slevou stojí. */
function schvOtevriVariantu(id) {
  if (!((ZAK && ZAK.varianty) || []).some(x => x.id === id)) return;
  ZAK.aktivni = id;
  if (typeof syncVarianta === 'function') syncVarianta();
  prepniTab('kalk');
  render();
}

const SCHV_PILL = {
  ceka: ['warn', '⏳ čeká na rozhodnutí'],
  schvaleno: ['', '✓ schváleno'],
  auto: ['', '✓ schváleno automaticky'],
  zamitnuto: ['neg', '✕ zamítnuto'],
  podMarzi: ['neg', '✕ pod minimální marží'],
  bez: ['mut', 'bez slevy'],
};

function schvPct(x) { return (Math.round(x * 10000) / 100).toLocaleString('cs-CZ') + ' %'; }

/* Jeden řádek seznamu + řádek s podrobnostmi pod ním. Podrobnosti jsou
 * vlastní řádek přes celou šířku, ne tooltip: důvod zamítnutí a poznámka
 * obchodníka jsou to hlavní, o čem se rozhoduje, a schovávat je za najetí
 * myší by znamenalo, že je nikdo nepřečte. */
function schvRadek(z, muzeVidetMarzi) {
  const [pillCls, pillTxt] = SCHV_PILL[z.kategorie] || ['mut', z.kategorie];
  const role = (typeof zobrazeniRole === 'function') ? zobrazeniRole() : 'Obchodník';
  const smiTeď = schvSmiRozhodovat() && !z.zamceno && schvalovaniSmiRozhodnout(role, z.procenta, NAST.slevy);

  const tlacitka = [];
  if (smiTeď) {
    if (z.kategorie === 'ceka' || z.kategorie === 'zamitnuto')
      tlacitka.push(`<button class="primary mini" onclick="schvRozhodni('${escJs(z.id)}','schvalit','${escJs(z.cast || 'ock')}')">Schválit</button>`);
    if (z.kategorie === 'ceka' || z.kategorie === 'schvaleno' || z.kategorie === 'auto')
      tlacitka.push(`<button class="mini" onclick="schvRozhodni('${escJs(z.id)}','zamitnout','${escJs(z.cast || 'ock')}')">Zamítnout</button>`);
    if (z.kategorie === 'schvaleno' || z.kategorie === 'zamitnuto')
      tlacitka.push(`<button class="mini" onclick="schvRozhodni('${escJs(z.id)}','vratit','${escJs(z.cast || 'ock')}')">Vrátit rozhodnutí</button>`);
  }
  tlacitka.push(`<button class="mini" onclick="schvOtevriVariantu('${escJs(z.id)}')">Otevřít v kalkulaci</button>`);

  /* Proč tlačítka nejsou – vysvětlení místo prázdného sloupce. Prázdné místo
   * vede k dotazu „proč to nejde"; věta na to odpoví rovnou. */
  let proc = '';
  if (!smiTeď) {
    if (z.zamceno) proc = 'Varianta je uzamčená jako odeslaná nabídka – rozhodnutí už nelze měnit.';
    else if (!schvSmiRozhodovat()) proc = 'O slevách rozhoduje vedoucí nebo administrátor.';
    else proc = `Sleva přesahuje strop role „${esc(role)}" – rozhodne ${z.kdoMuze.length ? esc(z.kdoMuze.join(' nebo ')) : 'administrátor'}.`;
  }

  const marze = muzeVidetMarzi && z.spocteno
    ? `<td style="text-align:right;color:${z.podMarzi ? '#b91c1c' : '#15803d'}">${schvPct(z.marzePoSleve)}</td>`
    : '<td style="text-align:right" class="note">—</td>';

  const podrobnosti = [];
  if (z.schema) podrobnosti.push('Schéma: <b>' + esc(z.schema) + '</b>');
  if (z.role) podrobnosti.push('Zadal jako: <b>' + esc(z.role) + '</b>');
  if (z.strop != null) podrobnosti.push('Strop role: ' + schvPct(z.strop));
  if (z.poznamka) podrobnosti.push('Poznámka: ' + esc(z.poznamka));
  if (z.kategorie === 'schvaleno' && z.schvalil)
    podrobnosti.push('Schválil: <b>' + esc(z.schvalil) + '</b>'
      + (z.schvalilKdy ? ' · ' + new Date(z.schvalilKdy).toLocaleString('cs-CZ') : ''));
  if (z.kategorie === 'zamitnuto' && z.zamitl)
    podrobnosti.push('Zamítl: <b>' + esc(z.zamitl) + '</b>'
      + (z.zamitlKdy ? ' · ' + new Date(z.zamitlKdy).toLocaleString('cs-CZ') : '')
      + (z.zamitnutoDuvod ? ' – ' + esc(z.zamitnutoDuvod) : ''));
  if (z.kategorie === 'podMarzi')
    podrobnosti.push('Sleva by srazila marži pod firemní minimum'
      + (z.minMarze != null ? ' (' + schvPct(z.minMarze) + ')' : '') + '. Schválit ji nelze nikým.');
  if (!z.spocteno)
    podrobnosti.push('Výpočet ' + (z.cast === 'proj' ? 'projekce' : 'OCK')
      + ' této varianty se nepodařil – dopad slevy v Kč proto nelze ukázat.');
  if (proc) podrobnosti.push('<span class="note">' + proc + '</span>');

  const duvod = smiTeď && (z.kategorie === 'ceka' || z.kategorie === 'schvaleno' || z.kategorie === 'auto')
    ? `<div class="row" style="max-width:520px;margin-top:4px"><label>Důvod zamítnutí <span class="note">(nepovinný)</span></label>
         <input type="text" value="${esc(SCHV_DUVODY[z.klic || z.id] || '')}" placeholder="proč slevu nepustit…"
           onchange="schvDuvod('${escJs(z.klic || z.id)}', this.value)"></div>`
    : '';

  return `<tr>
      <td>${esc(z.nazev)}${z.ridici ? ' <span class="pill">řídící</span>' : ''}${z.zamceno ? ' <span class="pill mut">uzamčená</span>' : ''}
        <div class="note">${esc(z.castNazev || 'Výtahová šachta (OCK)')}</div></td>
      <td style="text-align:right">${esc(String(z.procenta))} %</td>
      <td style="text-align:right">${z.spocteno ? fmt0(z.slevaKc) : '—'}</td>
      <td style="text-align:right">${z.spocteno ? fmt0(z.cenaPoSleve) : '—'}</td>
      ${marze}
      <td><span class="pill ${pillCls}">${pillTxt}</span></td>
      <td><div class="btns" style="margin:0">${tlacitka.join('')}</div></td>
    </tr>
    <tr><td colspan="7" style="padding-top:0">
      <div class="note">${podrobnosti.join(' · ')}</div>${duvod}</td></tr>`;
}

function schvalovaniKarta() {
  const vypocty = schvVypocty();
  schvPrepoctiVse(vypocty);
  const seznam = schvalovaniSeznam(ZAK, vypocty, NAST.slevy, NAST.role);
  const souhrn = schvalovaniSouhrn(seznam);
  const muzeVidetMarzi = smiZobrazit('kpi.marze');

  const uvod = `<div class="note">Seznam slev zadaných v jednotlivých variantách této zakázky
      (číslo ${esc(ZAK.cislo || '—')}). Sleva do stropu role zadavatele projde sama; nad strop
      čeká na rozhodnutí toho, jehož vlastní strop ji pokrývá. Neschválená sleva se do cenové
      nabídky ani do krycího listu nepropíše.</div>`;

  if (!seznam.length)
    return card('Schvalování slev', schvPrepinacRozsahu() + uvod
      + '<div class="note" style="margin-top:8px">V žádné variantě této zakázky není zadaná sleva – '
      + 'není o čem rozhodovat. Sleva se zadává v kartě „Sleva na nabídku" pod výpočtem '
      + 'v záložce Kalkulace OCK.</div>', false, 'schv-seznam');

  const stat = [
    ['⏳ čeká', souhrn.ceka], ['✓ schváleno', souhrn.schvaleno + souhrn.auto],
    ['✕ zamítnuto', souhrn.zamitnuto], ['✕ pod marží', souhrn.podMarzi],
  ].map(([n, v]) => `<span class="pill ${v ? '' : 'mut'}" style="margin-right:6px">${n}: ${v}</span>`).join('');

  const marzeHlav = muzeVidetMarzi
    ? '<th style="text-align:right">Marže po slevě</th>'
    : '<th style="text-align:right">Marže po slevě <span class="note">(skryto)</span></th>';

  const tab = `<table class="sd-tbl" style="margin-top:8px">
      <tr><th>Varianta</th><th style="text-align:right">Sleva</th><th style="text-align:right">Sleva v Kč</th>
        <th style="text-align:right">Cena po slevě</th>${marzeHlav}<th>Stav</th><th>Rozhodnutí</th></tr>
      ${seznam.map(z => schvRadek(z, muzeVidetMarzi)).join('')}
    </table>`;

  /* Vedoucí, který nevidí marži, rozhoduje naslepo – proto se to napíše
   * nahlas i s tím, kde se to spraví. Právo se nepřiděluje samo: „vidět
   * marži" a „smět schvalovat" jsou dvě různá rozhodnutí administrátora
   * a spojovat je za něj by obcházelo matici zobrazení. */
  const bezMarze = (!muzeVidetMarzi && schvSmiRozhodovat())
    ? '<div class="note" style="margin-top:8px"><b>Marže po slevě se vám nezobrazuje.</b> '
      + 'Rozhodujete tedy jen podle ceny. Zobrazení marže přiděluje administrátor '
      + 'v Nastavení → Zobrazení (položka „Ukazatele Náklad / Hrubý zisk / Marže v hlavičce").</div>'
    : '';

  const kdoJsem = `<div class="note" style="margin-top:8px">Rozhodnutí se podepisuje jako
      <b>${esc(schvKdoJsem())}</b>.</div>`;

  return card('Schvalování slev', schvPrepinacRozsahu() + uvod
    + '<div style="margin-top:6px">' + stat + '</div>'
    + tab + bezMarze + (schvSmiRozhodovat() ? kdoJsem : ''), false, 'schv-seznam');
}

/* ---------- žádosti z ostatních zakázek (#102, 10. 8. 2026) ----------
 *
 * Rozhodnutí J. V. z 10. 8. 2026: „ano, ale prvně by měly být vidět otevřené
 * a pak mít možnost přepnout i na ostatní, bude-li třeba." Výchozí pohled tedy
 * zůstává otevřená zakázka; ostatní se dotahují až na vyžádání.
 *
 * Dotahují se až na kliknutí schválně. Rejstřík se skládá čtením všech zakázek
 * na serveru — u tří set zakázek je to tři sta čtení a spouštět je pokaždé,
 * když si někdo otevře záložku, by byl provoz zadarmo. */
const SCHV_CIZI = { rozsah: 'zakazka', stav: 'nic', zadosti: [], chyba: '', vse: false };

function schvPrepniRozsah(rozsah) {
  SCHV_CIZI.rozsah = rozsah;
  if (rozsah === 'vse' && SCHV_CIZI.stav === 'nic') { schvNactiCizi(); return; }
  render();
}

function schvZobrazitRozhodnute(zapnout) {
  SCHV_CIZI.vse = !!zapnout;
  schvNactiCizi();
}

function schvNactiCizi() {
  if (typeof onlineApi !== 'function') {
    SCHV_CIZI.stav = 'chyba';
    SCHV_CIZI.chyba = 'Přehled napříč zakázkami potřebuje online databázi.';
    render();
    return;
  }
  SCHV_CIZI.stav = 'nacitam'; SCHV_CIZI.chyba = ''; render();
  onlineApi('/api/schvalovani' + (SCHV_CIZI.vse ? '?vse=1' : ''))
    .then((d) => {
      /* Pojistka proti tomu, aby se do sdíleného přehledu časem propašovala
       * částka: kdyby server začal posílat pole, které neznáme, radši to
       * řekneme nahlas, než abychom to mlčky vykreslili. */
      const cizi = schvalovaniRejstrikNeznameKlice(d.zadosti);
      if (cizi.length) {
        SCHV_CIZI.stav = 'chyba';
        SCHV_CIZI.chyba = 'Server poslal v rejstříku neznámé údaje (' + cizi.join(', ')
          + '). Přehled se nezobrazí, dokud se to nevysvětlí.';
      } else {
        SCHV_CIZI.stav = 'hotovo';
        SCHV_CIZI.zadosti = d.zadosti || [];
        SCHV_CIZI.pocetCeka = d.pocetCeka;
        SCHV_CIZI.neuplny = !!d.neuplny;
        SCHV_CIZI.prohledano = d.prohledano;
      }
      render();
    })
    .catch((e) => {
      SCHV_CIZI.stav = 'chyba';
      SCHV_CIZI.chyba = 'Seznam se nepodařilo načíst: ' + e.message;
      render();
    });
}

function schvPrepinacRozsahu() {
  const tl = (id, popis) => `<button class="mini ${SCHV_CIZI.rozsah === id ? 'primary' : ''}"
      onclick="schvPrepniRozsah('${escJs(id)}')">${esc(popis)}</button>`;
  return `<div style="margin-top:6px">${tl('zakazka', 'Tato zakázka')} ${tl('vse', 'Všechny zakázky')}</div>`;
}

function schvCiziKarta() {
  const prepinac = schvPrepinacRozsahu();
  if (SCHV_CIZI.stav === 'nacitam')
    return card('Schvalování slev', prepinac + '<div class="note" style="margin-top:8px">Načítám žádosti ze všech zakázek…</div>',
      false, 'schv-seznam');
  if (SCHV_CIZI.stav === 'chyba')
    return card('Schvalování slev', prepinac
      + `<div class="warn" style="margin-top:8px">${esc(SCHV_CIZI.chyba)}</div>`
      + `<div style="margin-top:6px"><button class="mini" onclick="schvNactiCizi()">Zkusit znovu</button></div>`,
      false, 'schv-seznam');

  const seznam = schvalovaniSeznamRejstrik(SCHV_CIZI.zadosti);
  const uvod = `<div class="note">Žádosti ze <b>všech zakázek v databázi</b>${SCHV_CIZI.vse ? '' : ' , které čekají na rozhodnutí'}.
      <b>Částky se tu nezobrazují</b> — sdílený přehled nese jen číslo zakázky, procento slevy a stav
      (u cenové výjimky počet položek ceníku a pásů „jiné").
      Cenu a marži uvidíte po otevření zakázky, kde platí obvyklá pravidla zobrazení.</div>`;
  const volba = `<div style="margin-top:6px">
      <label><input type="checkbox" ${SCHV_CIZI.vse ? 'checked' : ''}
        onchange="schvZobrazitRozhodnute(this.checked)"> zobrazit i už rozhodnuté žádosti</label>
      <button class="mini" style="margin-left:8px" onclick="schvNactiCizi()">Obnovit</button></div>`;
  const strop = SCHV_CIZI.neuplny
    ? `<div class="warn" style="margin-top:8px">Prošlo se prvních ${SCHV_CIZI.prohledano} zakázek —
        v databázi jich je víc. Zbytek se v tomhle přehledu neukáže.</div>` : '';

  if (!seznam.length)
    return card('Schvalování slev', prepinac + uvod + volba
      + '<div class="note" style="margin-top:8px">Žádná žádost'
      + (SCHV_CIZI.vse ? '' : ' nečeká na rozhodnutí') + '. Prošlo se '
      + (SCHV_CIZI.prohledano || 0) + ' zakázek.</div>' + strop, false, 'schv-seznam');

  const radky = seznam.map((z) => {
    const [pillCls, pillTxt] = SCHV_PILL[z.kategorie] || ['mut', z.kategorie];
    return `<tr>
      <td><b>${esc(z.cislo || '—')}</b><div class="note">${esc(z.nazevAkce || '')}</div></td>
      <td>${esc(z.nazev)}${z.ridici ? ' <span class="pill">řídicí</span>' : ''}</td>
      <td style="text-align:right">${z.cast === 'vyjimka'
        /* Cenová výjimka (13. 10. 2026): jen kolik položek / pásů, bez cen. */
        ? '<span class="note">výjimka: ' + [z.polozek ? z.polozek + ' položek ceníku' : '', z.pasu ? z.pasu + ' pás „jiné"' : '']
            .filter(Boolean).join(', ') + '</span>'
        : schvPct(z.procenta / 100)}</td>
      <td><span class="pill ${pillCls}">${pillTxt}</span>
        ${z.zamceno ? ' <span class="pill mut">uzamčeno</span>' : ''}</td>
      <td class="note">${esc(z.schvalil || z.zamitl || '')}${(z.schvalilKdy || z.zamitlKdy)
        ? ' · ' + esc(String(z.schvalilKdy || z.zamitlKdy).slice(0, 10)) : ''}</td>
      <td><button class="mini" onclick="schvOtevriZakazku('${escJs(z.klic)}')">Otevřít zakázku</button></td>
    </tr>`;
  }).join('');

  const tab = `<table class="sd-tbl" style="margin-top:8px">
      <tr><th>Zakázka</th><th>Varianta</th><th style="text-align:right">Sleva</th>
        <th>Stav</th><th>Rozhodl</th><th></th></tr>${radky}</table>`;

  return card('Schvalování slev', prepinac + uvod + volba + tab + strop, false, 'schv-seznam');
}

/* Rozhodovat se dá až v otevřené zakázce. Je to schválně: rozhodnutí se
 * zapisuje do zakázky a ta se musí uložit — odklepnout slevu z přehledu,
 * aniž by se zakázka načetla, by znamenalo psát do souboru, který nemám
 * před sebou. Navíc rozhodující člověk má vidět, o čem rozhoduje. */
function schvOtevriZakazku(klic) {
  if (typeof onlineOtevri !== 'function') return;
  onlineOtevri(klic).then((otevreno) => {
    /* Po otevření zakázky přepneme zpátky na její vlastní seznam — tam už
     * jsou částky i tlačítka a je nad čím rozhodovat. */
    if (otevreno) { SCHV_CIZI.rozsah = 'zakazka'; render(); }
  });
}

/* ================= CENOVÉ VÝJIMKY VARIANTY (13. 10. 2026) =================
 * Rozhodnutí J. V.: směs platného ceníku a starších cen a ruční sazba pásu
 * „jiné" pod ceníkovou jdou u role bez práva ceníku do schvalování. Model
 * a serverová pojistka jsou ve vyjimky.js; tady je karta vedle slev, žádost
 * obchodníka a rozhodnutí nadřízeného (razítka pak přepíše server).
 * ======================================================================= */

/* Platný ceník — záznam programu, ze kterého počítá i server (online
 * databáze, nebo připojená složka). Bez něj se směs neposuzuje. */
function vyjPlatnyZaznam() {
  if (typeof progJede === 'function' && progJede()) return PROG_STAV.db.platny;
  if (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV && ONLINE_STAV.cenikPouzit
      && ONLINE_STAV.db && ONLINE_STAV.db.platny) return ONLINE_STAV.db.platny;
  return null;
}
function vyjObsah(v) {
  if (!v || !v.data || typeof vyjimkyObsah !== 'function') return null;
  const platny = vyjPlatnyZaznam();
  const vyr = (typeof zakazkaVyrazenaStrana === 'function' && typeof ZAK !== 'undefined') ? (zakazkaVyrazenaStrana(ZAK) || '') : '';
  const jk = typeof JEKLY !== 'undefined' ? JEKLY : null;
  try { return vyjimkyObsah(v.data, platny ? vyjimkyDnesniZProgramu(platny, v.data) : null, vyr, jk); }
  catch (e) { return null; }
}
/* Stav pro zábranu „cenovaVyjimka" (kontroly_ui.js). Zamčená varianta
 * odešla — neposuzuje se (dotisk server pustí, data se nemění). */
function vyjimkyStavVarianty(v) {
  if (!v || !v.data) return null;
  if (typeof variantaUzamcena === 'function' && variantaUzamcena(v)) return null;
  const o = vyjObsah(v);
  if (!o || o.prazdny) return null;
  const rec = v.data.cenovaVyjimka;
  return {
    potreba: vyjimkyPotreba(o, k => smiZobrazit(k)).potreba,
    plati: vyjimkaPlati(rec, o),
    zamitnuto: !!(rec && rec.stav === VYJ_ZAMITNUTO && vyjimkaObsahSedi(rec, o)),
    text: vyjimkyText(o),
  };
}
/* DOTISK DOKUMENTU NOVÉ STRANY do odeslané varianty (B153, zrcadlo serveru
 * v zakazka_kontrola.mjs): strana, jejíž dokument v zámku ještě není (typicky
 * OCK po vypnutí „jen projekce"), se posoudí jako nový zámek — cenová výjimka
 * její části (schválení musí sedět na celý obsah) a minimální marže její
 * platné slevy. Data zamčené varianty se už nezmění, takže jediná cesta je
 * klon. Vrací větu důvodu, nebo ''. */
function vyjimkyDotiskZabrana(typ, v) {
  if (!typ || !v || !v.data || !v.zamek || typeof variantaUzamcena !== 'function' || !variantaUzamcena(v)) return '';
  if (typeof kontrolyDokumentStrana !== 'function') return '';
  /* Dokument bez strany (technická specifikace…) do zámku nejde — nic. */
  const strana = kontrolyDokumentStrana(typ);
  if (!strana) return '';
  const tisky = [v.zamek.typ].concat((Array.isArray(v.zamek.tisky) ? v.zamek.tisky : []).map(t => t && t.typ));
  if (tisky.some(t => (kontrolyDokumentStrana(t) || '?') === strana)) return '';
  const konec = ' Odeslanou nabídku už nejde změnit — pokračujte klonem varianty.';
  const role = (typeof zobrazeniRole === 'function') ? zobrazeniRole() : 'Obchodník';
  const platny = vyjPlatnyZaznam();
  const vyj = vyjimkyZamekProblem(typeof ZAK !== 'undefined' ? ZAK : null, v, { role },
    { program: platny ? { platny } : null, smi: k => smiZobrazit(k), strany: [strana],
      jekly: typeof JEKLY !== 'undefined' ? JEKLY : null });
  if (vyj) return 'Dokument strany, která z této odeslané nabídky ještě neodešla: ' + vyj + '.' + konec;
  if (typeof schvalovaniMarzeCasti === 'function' && typeof JEKLY !== 'undefined') {
    for (const cast of ['ock', 'proj']) {
      if (strana !== cast) continue;
      const m = schvalovaniMarzeCasti(v, JEKLY, cast, (typeof NAST !== 'undefined' && NAST) ? NAST.slevy : null);
      if (m) return 'Dokument strany, která z této odeslané nabídky ještě neodešla: ' + m + konec;
    }
  }
  return '';
}
function vyjSmiRozhodovat() {
  const role = (typeof zobrazeniRole === 'function') ? zobrazeniRole() : 'Obchodník';
  return vyjimkaSmiRozhodnout(role, k => smiZobrazit(k));
}

const VYJ_DUVODY = {};
function vyjDuvod(id, val) { VYJ_DUVODY[id] = String(val || ''); }

/* Žádost / rozhodnutí o výjimce jedné varianty.
 * `co` = 'pozadat' | 'schvalit' | 'zamitnout' | 'vratit'. */
function vyjRozhodni(id, co) {
  const v = ((ZAK && ZAK.varianty) || []).find(x => x.id === id);
  if (!v || !v.data) return;
  if (typeof variantaUzamcena === 'function' && variantaUzamcena(v)) {
    hlaska(`Varianta „${v.nazev}" je uzamčená – byla vytištěna jako cenová nabídka. `
      + 'Co v ní odešlo, se zpětně neschvaluje. Pro jinou cenu založte novou variantu.');
    return;
  }
  const o = vyjObsah(v);
  if (!o || o.prazdny) return;
  if (co === 'pozadat') vyjimkaPozadej(v.data, o, schvKdoJsem());
  else {
    if (!vyjSmiRozhodovat()) {
      hlaska('O cenových výjimkách rozhoduje nadřízený – administrátor nebo role s právem '
        + '„Schvalování slevy nad strop role" (Nastavení → Zobrazení).');
      return;
    }
    if (co === 'schvalit') vyjimkaSchval(v.data, o, schvKdoJsem());
    else if (co === 'zamitnout') vyjimkaZamitni(v.data, o, schvKdoJsem(), null, VYJ_DUVODY[id] || '');
    else vyjimkaVrat(v.data, o);
  }
  render();
}

/* Dopad výjimky na cenu pro kartu (B165); chyba výpočtu = bez čísel. */
function vyjDopad(v, o) {
  if (typeof vyjimkyDopad !== 'function') return null;
  const platny = vyjPlatnyZaznam();
  try { return vyjimkyDopad(v.data, o, platny ? vyjimkyDnesniZProgramu(platny, v.data) : null, typeof JEKLY !== 'undefined' ? JEKLY : null); }
  catch (e) { return null; }
}
/* „použitá 1 Kč/m² · ceníková 412 Kč/m² · dopad −2,1 % (−3 456 Kč)" —
 * escapované (hodnota textové položky jde od obchodníka). */
function vyjSazby(x) {
  const h = val => (typeof val === 'number' ? formatCislo(val) : String(val == null ? '—' : val));
  const jed = x.jed ? ' ' + x.jed : '';
  const t = 'použitá ' + h(x.pouzita) + jed + ' · ceníková ' + h(x.cenikova) + jed;
  const d = vyjimkyDopadText(x);
  return esc(t + (d ? ' · dopad ' + d : ''));
}

const VYJ_PILL = {
  nepozadano: ['mut', 'bez žádosti'],
  ceka: ['warn', '⏳ čeká na rozhodnutí'],
  schvaleno: ['', '✓ schváleno'],
  zamitnuto: ['neg', '✕ zamítnuto'],
};

function vyjimkyKarta() {
  const radky = [];
  const smi = vyjSmiRozhodovat();
  ((ZAK && ZAK.varianty) || []).forEach(v => {
    if (!v || !v.data) return;
    const zamceno = (typeof variantaUzamcena === 'function') && variantaUzamcena(v);
    const o = vyjObsah(v);
    if (!o) return;
    /* Rozhodnutí k jinému obsahu padá zpět do „čeká" (jako sleva po změně
     * procenta); u zamčené varianty se nic nepřepisuje. */
    if (!zamceno) vyjimkaPrepocti(v.data, o);
    const rec = v.data.cenovaVyjimka;
    if (zamceno ? !rec : o.prazdny) return;
    const kat = zamceno
      ? ({ 'čeká na schválení': 'ceka', 'schváleno': 'schvaleno', 'zamítnuto': 'zamitnuto' }[rec.stav] || 'nepozadano')
      : vyjimkaKategorie(rec, o);
    const [pillCls, pillTxt] = VYJ_PILL[kat] || ['mut', kat];
    const potreba = !zamceno && vyjimkyPotreba(o, k => smiZobrazit(k)).potreba;
    const tl = [];
    const b = (co, popis, prim) => `<button class="mini${prim ? ' primary' : ''}" onclick="vyjRozhodni('${escJs(v.id)}','${escJs(co)}')">${esc(popis)}</button>`;
    if (!zamceno) {
      if (smi) {
        if (kat !== 'schvaleno') tl.push(b('schvalit', 'Schválit', true));
        if (kat !== 'zamitnuto') tl.push(b('zamitnout', 'Zamítnout'));
        if (kat === 'schvaleno' || kat === 'zamitnuto') tl.push(b('vratit', 'Vrátit rozhodnutí'));
      } else if (kat === 'nepozadano') tl.push(b('pozadat', 'Požádat o schválení', true));
    }
    tl.push(`<button class="mini" onclick="schvOtevriVariantu('${escJs(v.id)}')">Otevřít v kalkulaci</button>`);
    /* Co se liší — názvy položek a pásů. Sazby a dopad na cenu (B165)
     * vidí jen ten, kdo smí rozhodnout; obchodník bez práva ceníku
     * ceníkové sazby nevidí ani tady (čísla jsou v ceníku, kde platí
     * matice). Plocha pásu (B178) z výsledku jádra, jako v obsahu. */
    const co = [];
    const dp = smi && !zamceno ? vyjDopad(v, o) : null;
    /* Dřív schválená výjimka (plocha na celé m², B183 b): karta ukáže
     * plochu tak, jak byla schválena. */
    const st = !zamceno && vyjimkaStaryTvar(rec, o);
    const plocha = x => vyjimkyPasPlocha(x, st);
    if (o.polozek) {
      const pol = dp ? dp.polozky : o.smes;
      co.push('Položky ceníku: ' + pol.slice(0, 8).map(x => esc(x.popis) + (dp ? ' (' + vyjSazby(x) + ')' : '')).join(dp ? '; ' : ', ')
        + (o.polozek > 8 ? ' a další ' + (o.polozek - 8) : ''));
    }
    if (o.pasu) {
      const pas = dp ? dp.pasy : o.pasy;
      co.push('Pásy „jiné": ' + pas.map(p => 'stěna ' + esc(p.stena) + ' (' + esc(p.nazev || 'bez názvu') + ', ' + esc(vyjimkyPasRozsah(p))
        + (plocha(p) ? ', ' + esc(plocha(p)) : '') + (dp ? '; ' + vyjSazby(Object.assign({ jed: 'Kč/m²' }, p)) : '') + ')').join(', '));
      if (o.svetliky && o.svetliky.length)
        co.push('Světlíky „jiné" u dveří: ' + o.svetliky.map(x => (x.kde === 'boky' ? 'boky dveří ' : 'nad dveřmi ') + esc(x.stena)
          + ' (' + esc(x.nazev || 'bez názvu') + (plocha(x) ? ', ' + esc(plocha(x)) : '') + ')').join(', '));
    }
    if (dp) {
      const cel = [['OCK', dp.ock], ['PROJ', dp.proj]].filter(([, x]) => vyjimkyDopadText(x))
        .map(([k, x]) => 'cena ' + k + ' ' + esc(vyjimkyDopadText(x)));
      if (cel.length) co.push('<b>Dopad celkem proti ceníku:</b> ' + cel.join(', '));
    }
    const podr = [];
    if (rec && rec.pozadal) podr.push('Požádal: <b>' + esc(rec.pozadal) + '</b>'
      + (rec.pozadalKdy ? ' · ' + new Date(rec.pozadalKdy).toLocaleString('cs-CZ') : ''));
    if (kat === 'schvaleno' && rec.schvalil) podr.push('Schválil: <b>' + esc(rec.schvalil) + '</b>'
      + (rec.schvalilKdy ? ' · ' + new Date(rec.schvalilKdy).toLocaleString('cs-CZ') : ''));
    if (kat === 'zamitnuto' && rec.zamitl) podr.push('Zamítl: <b>' + esc(rec.zamitl) + '</b>'
      + (rec.zamitlKdy ? ' · ' + new Date(rec.zamitlKdy).toLocaleString('cs-CZ') : '')
      + (rec.zamitnutoDuvod ? ' – ' + esc(rec.zamitnutoDuvod) : ''));
    if (st && kat === 'schvaleno') podr.push('Schváleno před v20.10.5 s plochou na celé m² — platí, dokud se výjimka nezmění');
    if (!zamceno) podr.push(potreba ? 'Vaše role ji bez schválení neodešle.' : 'Vaše role ji smí odeslat i bez schválení (právo ceníku).');
    const duvod = smi && !zamceno && kat !== 'zamitnuto'
      ? `<div class="row" style="max-width:520px;margin-top:4px"><label>Důvod zamítnutí <span class="note">(nepovinný)</span></label>
           <input type="text" value="${esc(VYJ_DUVODY[v.id] || '')}" placeholder="proč výjimku nepustit…"
             onchange="vyjDuvod('${escJs(v.id)}', this.value)"></div>` : '';
    radky.push(`<tr>
        <td>${esc(v.nazev || '')}${v.ridici ? ' <span class="pill">řídící</span>' : ''}${zamceno ? ' <span class="pill mut">uzamčená</span>' : ''}</td>
        <td>${esc(zamceno ? '' : vyjimkyText(o))}<div class="note">${co.join(' · ')}</div></td>
        <td><span class="pill ${pillCls}">${pillTxt}</span></td>
        <td><div class="btns" style="margin:0">${tl.join('')}</div></td>
      </tr>
      <tr><td colspan="4" style="padding-top:0"><div class="note">${podr.join(' · ')}</div>${duvod}</td></tr>`);
  });
  const uvod = `<div class="note">Varianty, jejichž ceník je směsí platného ceníku a starších cen, nebo
      které mají ruční sazbu pásu opláštění „jiné" nižší než ceníkovou. Role bez práva ceníku je smí
      odeslat (vytisknout nabídku) jen se schválením nadřízeného; rozpracovanou zakázku lze ukládat
      i bez něj. Změna směsi, sazby, rozsahu nebo plochy pásu (i světlíků „jiné" u dveří) po schválení
      schválení zruší. Schvalovatel u položek vidí použitou a ceníkovou sazbu a dopad na cenu.</div>`;
  if (!radky.length)
    return card('Cenové výjimky', uvod + '<div class="note" style="margin-top:8px">Žádná varianta této zakázky '
      + 'se od platného ceníku neliší a nemá pás „jiné" pod ceníkovou sazbou.</div>', false, 'vyj-seznam');
  return card('Cenové výjimky', uvod + `<table class="sd-tbl" style="margin-top:8px">
      <tr><th>Varianta</th><th>Co se liší</th><th>Stav</th><th>Rozhodnutí</th></tr>${radky.join('')}</table>`
    + (smi ? `<div class="note" style="margin-top:8px">Rozhodnutí se podepisuje jako <b>${esc(schvKdoJsem())}</b>.</div>` : ''),
    false, 'vyj-seznam');
}

function renderSchvalovani() {
  const el = document.getElementById('page-schvalovani');
  if (el) el.innerHTML = (SCHV_CIZI.rozsah === 'vse') ? schvCiziKarta() : schvalovaniKarta() + vyjimkyKarta();
}
