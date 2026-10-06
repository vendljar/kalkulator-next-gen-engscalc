/* ============================================================
 * KONTROLA LOGICKÝCH CHYB PŘED NABÍDKOU (#33)
 *
 * Kalkulačka spočítá poslušně cokoli. Šachtu o jednom nástupišti, sklo bez
 * konstrukce, která by ho nesla, dveře širší než šachta, nabídku s prázdnou
 * hlavičkou. Ve výsledku to vypadá stejně důvěryhodně jako správný výpočet –
 * je to sloupec čísel a součet sedí. Chyba se pozná až u zákazníka.
 *
 * Tenhle modul je jedenáct otázek, které by položil zkušený kolega, kdyby se
 * podíval přes rameno těsně před odesláním. Nic víc. (Jedenáctá – kontrolní
 * číslice IČO – přibyla 30. 7. 2026 spolu s polem v hlavičce.)
 *
 * (Od 25. 9. 2026 má několik pravidel úroveň ZÁBRANA a od 1. 10. 2026, #377,
 * opravdu zastaví dokumenty, kterých se týkají — viz BRÁNA DOKUMENTŮ níž.
 * Ostatní pravidla zůstávají varováním, jak píše tento odstavec.)
 * NIC SE NEBLOKUJE. Zadání z 30. 7. 2026 je v tomhle jednoznačné: „pouze
 * rozsviť varování před nabídkou". Všechna pravidla mají úroveň 2 –
 * upozornění. Důvod je praktický, ne měkký: tvrdá zábrana v cenotvorbě se
 * vždycky obejde (zadá se nesmysl o kus vedle, jen aby aplikace pustila dál)
 * a od té chvíle hlídání nehlídá nic, zato mu nikdo nevěří. Varování, které
 * se dá odklepnout, se čte. Zábrana, která se dá obejít, se obchází.
 *
 * Kdo vidí čísla: stejné pravidlo jako u marže (#36) a KPI. Konkrétní částky
 * o nákladech a marži patří administrátorovi; běžný uživatel vidí, ŽE je něco
 * pod minimem, ne o kolik. Proto se text skládá ve dvou podobách a v té
 * nepodrobné nezůstane ani koruna. Varování ale vidět musí – nabídku posílá
 * právě on.
 *
 * Odklepnutí platí jen na to, co se odklepávalo (kontrolyPotvrzeniPlati).
 * Kdyby potvrzení umlčelo i problém, který přibyl potom, byla by to tichá
 * ztráta pojistky – a tichá ztráta je horší než žádná pojistka.
 *
 * Logika se nepřepisuje tam, kde už je: marže se ptá #36 (marze.js), slevy
 * #ZAK-10 (sleva.js), ukázkový ceník #40 (ukazkove.js), hlavička zakazka.js.
 * Dvě různá minima nebo dvě různé definice „schválené slevy" v jedné aplikaci
 * jsou horší než žádná kontrola: aplikace pak tvrdí dvě pravdy podle toho,
 * kdo se zeptá dřív.
 *
 * Modul je čistá logika bez DOM – panel je v ui/kontroly_ui.js.
 * ============================================================ */

/* Výchozí úroveň pravidel je 2 = varování: aplikace upozorní, člověk rozhodne.
 *
 * Úroveň 1 = tvrdá zábrana. Od 30. 7. 2026 ji nese JEDINÉ pravidlo –
 * `ukazkovyCenik` ve chvíli, kdy je ceník prázdný (samé nuly). Zadání zní
 * doslova: „S tím nabídka ven jít nesmí za žádnou cenu." Není to obrat
 * v přístupu, je to výjimka s jasným důvodem: u ostatních pravidel je co
 * vážit (sleva může být schválená, atyp promyšlený), zatímco nabídka za
 * nula korun není rozhodnutí, ale omyl. Odklepnout se nedá – potvrzení
 * na zábranu neplatí (viz kontrolyPotvrzeniPlati). */
const KONTROLY_UROVEN = 2;
const KONTROLY_UROVEN_ZABRANA = 1;

/* Výška dveřního otvoru v metrech. Není to volba téhle kontroly – engine.js
 * s ní počítá na dvou místech (opláštění dveří `2.3 * 2 + sirkaDveri`
 * a plocha světlíku `svetlaVyska - 2.3`). Kdyby se rozešla, kontrola by
 * hlídala jiný výtah, než se počítá. */
const KONTROLY_VYSKA_DVERI = 2.3;

/* HORNÍ HRANICE ZDVIHU v metrech (K17-N91, rozhodnutí J. V. 30. 9. 2026:
 * „Nastav maximální zdvih na 99 m."). Nález: zdvih 1 000 000 000 m dal
 * nabídku za 51,6 bil. Kč bez jediného varování — pravidlo „rozmery" do té
 * doby hlídalo jen kladnost. Hranici má JEN zdvih (pokyn zněl na zdvih);
 * ostatní rozměry dál jen na kladnost. Totéž číslo čte pole Zdvih v zadání
 * šachty (max a upozornění u pole, ui/kalk_ock.js) — jedno místo, ať se
 * pole a kontrola nerozejdou. */
const KONTROLY_ZDVIH_MAX_M = 99;

/* ŠÍŘKA BOČNÍHO SVĚTLÍKU PROTI MEZEŘE VEDLE DVEŘÍ (#381, rozhodnutí J. V.
 * 1. 10. 2026 — výchozí odpovědi otázek 3 a 5 návrhu, jen Model 2).
 *
 * Ruční šířka jednoho světlíku mění plochu boků (počet × šířka × 2,2 m).
 * Hlídá se proti mezeře vedle dveří (šířka stěny − otvor dveří − 0,04 m):
 *   – světlík širší než mezera            → ZÁBRANA (taková šachta se
 *     postavit nedá a cena by nesla výplň navíc),
 *   – světlíky se vedle dveří nevejdou     → ZÁBRANA (počet × šířka >
 *     dveře × mezera),
 *   – jinak zbytek mezery nad 5 mm         → upozornění (zbytek nic
 *     neoceňuje; obchodník případně přidá položku). Od 1. 10. 2026 věta
 *     říká zbytek u jedněch dveří a součet zvlášť (viz níž).
 * Šířka se zadává v celých mm, takže každý světlík smí nést zaokrouhlení
 * do 0,5 mm — zaokrouhlená předpočítaná šířka (smíšené rozložení) tak
 * zábranu nespustí.
 *
 * MODEL zná kontrola z výsledku jádra: `vypln.sirkaRucne` vydá jádro jen
 * v Modelu 2 při ručním počtu světlíků, v Modelu 1 je vždy null (šířku
 * nečte). Platí to stejně pro otevřenou variantu, pro zmrazený otisk
 * odeslané nabídky i pro server (sluzba.js), kde se model zvlášť
 * nepředává. Otisk z doby před #381 šířku nemá — nehlídá se nic.
 *
 * Vrací { zabrana: [věty], upozorneni: [věty] }; tytéž věty ukazuje
 * nápověda pod polem šířky v zadání (ui/kalk_ock.js), ať pole a kontrola
 * neříkají každé něco jiného. */
function kontrolyBokySirka(r) {
  const out = { zabrana: [], upozorneni: [] };
  const v = r && r.zaskleni && r.zaskleni.vypln;
  if (!v || v.sirkaRucne === null || v.sirkaRucne === undefined) return out;
  const n = +v.bokyKs, d = +v.dvere, w = +v.sirkaRucne, m = +v.mezera;
  if (!(n > 0) || !isFinite(w) || !isFinite(m) || !isFinite(d)) return out;
  const wMm = Math.round(w * 1000), mMm = m * 1000;
  const metry = x => (Math.round(x * 100) / 100).toFixed(2).replace('.', ',');
  const sirsi = wMm > mMm + 0.5;
  const nevejdou = n * wMm > d * mMm + 0.5 * n;
  if (sirsi) {
    out.zabrana.push('Boční světlík (' + wMm + ' mm) je širší než mezera vedle dveří (' + Math.round(mMm) + ' mm) — '
      + 'vedle dveří se nevejde. Zmenšete šířku, nebo ji vraťte na předpočítanou (↺).');
  } else if (nevejdou) {
    out.zabrana.push('Boční světlíky se vedle dveří nevejdou: ' + n + ' × ' + wMm + ' mm = ' + metry(n * wMm / 1000)
      + ' m, mezery u ' + d + ' dveří jsou celkem ' + metry(d * mMm / 1000) + ' m. Zmenšete šířku nebo počet světlíků.');
  } else {
    /* ZBYTEK MEZERY (J. V. 1. 10. 2026: „Text vedle dveří zůstane 1,50 m
     * je podle mně špatně"). Do té doby věta nesla SOUČET přes všechny dveře
     * (5 × (600 − 300) mm = 1,50 m), ale zněla, jako by 1,50 m zbylo vedle
     * jedněch dveří — u šachty široké 1,5 m nesmysl. Teď říká zbytek u
     * JEDNĚCH dveří, z čeho vznikl, a součet zvlášť. Dveře bez světlíku
     * hlásí pravidlo počtu („u 2 dveří nebude boční světlík — mezera … tam
     * zůstane neoceněná"), do zbytku se proto nepočítají podruhé (dřív je
     * věta přičítala: 3 × 300 mm u 5 dveří = „2,10 m"). Smíšené rozložení
     * (u některých dveří jeden, u jiných dva světlíky) má jen průměrnou
     * šířku — tam věta uvádí součet a z čeho vznikl. Práh 5 mm platí pro
     * součet jako dřív. */
    const dva = isFinite(+v.dvereDva) ? +v.dvereDva : Math.max(0, Math.min(n, 2 * d) - d);
    const jeden = isFinite(+v.dvereJeden) ? +v.dvereJeden : Math.min(n, d) - dva;
    const sSvetlikem = dva + jeden;
    const zbytek = sSvetlikem * mMm - n * wMm;
    if (zbytek > 5 && sSvetlikem > 0) {
      const mm = x => String(Math.round(x));
      if (!dva || !jeden) {
        const po = dva ? 2 : 1;
        out.upozorneni.push('Vedle ' + (sSvetlikem > 1 ? 'každých ' : '') + 'dveří' + (d > sSvetlikem ? ' se světlíkem' : '')
          + ' zůstane neoceněných ' + mm(mMm - po * wMm) + ' mm (mezera ' + mm(mMm) + ' mm − '
          + (po === 1 ? 'světlík ' + wMm + ' mm' : '2 světlíky po ' + wMm + ' mm') + ')'
          + (sSvetlikem > 1 ? ', u ' + sSvetlikem + ' dveří celkem ' + metry(zbytek / 1000) + ' m' : '') + '.');
      } else {
        out.upozorneni.push('Vedle dveří zůstane neoceněných celkem ' + metry(zbytek / 1000) + ' m (mezery u '
          + sSvetlikem + ' dveří ' + metry(sSvetlikem * mMm / 1000) + ' m − ' + n
          + (n >= 2 && n <= 4 ? ' světlíky' : ' světlíků') + ' po ' + wMm + ' mm).');
      }
    }
  }
  return out;
}

/* Výčet do věty („šířka šachty, hloubka šachty a rozteč"). */
function kontrolyVyctem(pole) {
  const k = (pole || []).filter(Boolean);
  if (!k.length) return '';
  if (k.length === 1) return k[0];
  return k.slice(0, -1).join(', ') + ' a ' + k[k.length - 1];
}

/* Prodává projekce něco? Položka, která není vyřazená ani vypnutá nulou
 * (polozkaProjVypnuta, prepisy.js — hodinová s nula hodinami, fixní
 * s přepsanou nulou). Záložka pro samostatný Node běh bez prepisy.js. */
function kontrolyProjProdava(pv) {
  const vypnuta = (typeof polozkaProjVypnuta === 'function') ? polozkaProjVypnuta : (p) => {
    if (!p || p.vyrazeno) return false;
    if (p.typ === 'hod') return Number(p.hodinyCelkem != null ? p.hodinyCelkem : p.hodiny) === 0;
    return !!p.cenaPrepsana && Number(p.cenaEfekt) === 0;
  };
  return ((pv && Array.isArray(pv.sekce)) ? pv.sekce : []).some(s => s && Array.isArray(s.polozky)
    && s.polozky.some(p => p && !p.vyrazeno && !vypnuta(p)));
}

/* Přehled marže se počítá nanejvýš jednou za běh – používají ho dvě pravidla
 * (K7 marže, K8 cena pod nákladem) a je to jediný kus, který sahá na peníze. */
function kontrolyMarze(ctx) {
  if (ctx.__marze !== undefined) return ctx.__marze;
  let p = ctx.marzePrehled || null;
  if (!p && typeof marzePrehled === 'function') {
    /* Zakázka jen projekce (2. 8. 2026): OCK se neprodává, takže jeho čísla
     * do marže nabídky nepatří — jinak by nepoužité zadání OCK tahalo celek. */
    try { p = marzePrehled(ctx.jenProj ? null : ctx.vysledek, ctx.projVysledek,
                           ctx.jenProj ? null : ctx.sleva, ctx.nast, ctx.zaokr,
                           /* PROJ má od 4. 8. 2026 vlastní zaokrouhlení; kontext
                            * bez něj se chová jako dřív (jedno pro obě části). */
                           ctx.zaokrProj === undefined ? ctx.zaokr : ctx.zaokrProj,
                           /* sleva projekce (#134) – vlastní, nikdy ne ta z OCK */
                           ctx.slevaProj); }
    catch (e) { p = null; }
  }
  try { ctx.__marze = p; } catch (e) { /* zmrazený kontext – nevadí */ }
  return p;
}

/* ---------- pravidla ----------
 * Pořadí je pořadí, ve kterém se nálezy ukazují. Je vědomé: nejdřív to, co je
 * špatně v zadání (a co tedy zneplatňuje všechna čísla pod tím), potom peníze,
 * a nakonec dvě věci, které se týkají odesílaného dokumentu.
 *
 * zjisti(ctx) vrací null (v pořádku) nebo { text, detail }.
 *   text   – věta bez jediné částky; vidí ji každý,
 *   detail – doplněk s čísly; jen pro toho, kdo na náklady má právo. */
const KONTROLY = [
  {
    kod: 'rozmery', kde: 'Kalkulace OCK', nazev: 'Nesmyslný rozměr nebo počet',
    zabranaMozna: true, strany: ['ock'],
    zjisti(ctx) {
      const z = ctx.zadani;
      if (!z) return null;
      /* Nula projde výpočtem bez chyby a udělá z kalkulace nesmysl, který
       * vypadá jako sleva – proto se hlídá kladnost, ne jen „je to číslo". */
      const kladne = [['zdvih', 'zdvih'], ['sirka', 'šířka šachty'], ['hloubka', 'hloubka šachty'],
        ['roztec', 'rozteč'], ['cistyVstupMm', 'čistý vstup'], ['sirkaRamuMm', 'šířka rámu'],
        ['rohoveSloupky', 'počet rohových sloupků']];
      /* Přejezd i prohlubeň smějí být nula (šachta bez jámy existuje). */
      const nezaporne = [['prejezd', 'přejezd'], ['prohluben', 'prohlubeň']];
      const spatne = [];
      kladne.forEach(([k, n]) => { const v = +z[k]; if (!isFinite(v) || v <= 0) spatne.push(n); });
      nezaporne.forEach(([k, n]) => { const v = +z[k]; if (!isFinite(v) || v < 0) spatne.push(n); });
      /* Zdvih nad hranicí 99 m (K17-N91, 30. 9. 2026) — posuzuje se jen
       * zdvih, který prošel kladností; jinak by o něm věta mluvila dvakrát. */
      const zdvih = +z.zdvih;
      const vysoky = spatne.indexOf('zdvih') < 0 && zdvih > KONTROLY_ZDVIH_MAX_M;
      if (!spatne.length && !vysoky) return null;
      /* ZÁBRANA od 25. 9. 2026 (P2 / K16-N75): rozteč 0 dala nabídku za
       * 0 Kč, zdvih −5 nabídku za 433 000 Kč — a obojí šlo vytisknout. Není
       * co vážit, je to omyl v zadání. Totéž platí pro zdvih nad hranicí. */
      const vety = [];
      if (spatne.length) vety.push('V zadání je rozměr nebo počet, který nedává smysl: ' + kontrolyVyctem(spatne) + '.');
      if (vysoky) vety.push('Zdvih ' + zdvih.toLocaleString('cs-CZ', { maximumFractionDigits: 3 })
        + ' m je nad nejvyšším povoleným zdvihem ' + KONTROLY_ZDVIH_MAX_M + ' m — '
        + 'nejspíš jde o překlep (zdvih se zadává v metrech).');
      return { uroven: KONTROLY_UROVEN_ZABRANA, text: vety.join(' ') + ' Dokument nevznikne, dokud se to neopraví.' };
    },
  },
  {
    /* NEZNÁMÝ ROZMĚR PROFILU (#372, nález A2-1 z 26. 9. 2026). Výpočet
     * s rozměrem mimo katalog jeklů už nepadá — dosadí nulovou hmotnost
     * a plochu. Právě proto nesmí taková cena odejít: dokud se nevybere
     * platný rozměr, dokument nevznikne. */
    kod: 'profilNeznamy', kde: 'Kalkulace OCK', nazev: 'Rozměr profilu není v katalogu jeklů',
    zabranaMozna: true, strany: ['ock'],
    zjisti(ctx) {
      const nez = ctx.vysledek && ctx.vysledek.profily && ctx.vysledek.profily.nezname;
      if (!Array.isArray(nez) || !nez.length) return null;
      return { uroven: KONTROLY_UROVEN_ZABRANA,
        text: 'Rozměr profilu ' + kontrolyVyctem(nez) + ' není v katalogu jeklů — vyberte platný. '
          + 'Dokument nevznikne, dokud se to neopraví.' };
    },
  },
  {
    /* ZÁPORNÁ POLOŽKA (B111, 29. 9. 2026). Server zápornou částku, množství
     * ani hodiny od opravy nepřijme; zakázka uložená dřív ji ale nést může
     * (rozpracovaná varianta, záloha). Záporná položka snižuje cenu nabídky
     * bez schválení a v dokumentu po ní nezůstane stopa — proto zábrana:
     * dokument nevznikne, dokud se položka neopraví. Seznam míst dává
     * uloZaporneVZadani z uloziste.js (táž funkce jako na serveru). */
    kod: 'zapornaPolozka', kde: 'Nabídka', nazev: 'Záporná částka, množství nebo hodiny',
    zabranaMozna: true,
    zjisti(ctx) {
      const f = (typeof uloZaporneVZadani === 'function') ? uloZaporneVZadani
        : (typeof require === 'function' ? require('./uloziste.js').uloZaporneVZadani : null);
      if (!f) return null;
      const nal = f(ctx.jenProj ? null : ctx.zadani, ctx.projZadani).filter(p => p.duvod === 'zaporne');
      if (!nal.length) return null;
      const ock = nal.some(p => p.kde.indexOf('ock.') === 0), proj = nal.some(p => p.kde.indexOf('proj.') === 0);
      const kde = [ock ? 'kalkulace OCK' : '', proj ? 'kalkulace PROJ' : ''].filter(Boolean);
      return { uroven: KONTROLY_UROVEN_ZABRANA,
        /* Strana podle místa nálezu (#377): záporná položka v kalkulaci PROJ
         * nesmí zastavit nabídku OCK a naopak. */
        strany: [ock ? 'ock' : '', proj ? 'proj' : ''].filter(Boolean),
        text: 'V zakázce je záporná částka, množství nebo hodiny (' + kontrolyVyctem(kde) + '). '
          + 'Snížení ceny se zadává jako sleva, která jde přes schvalování. Dokument nevznikne, dokud se to neopraví.' };
    },
  },
  {
    /* CENA NABÍDKY MUSÍ BÝT KLADNÉ ČÍSLO (P2 / K16-N75 + K14-N61, 25. 9. 2026).
     * Nula nebo NaN v ceně je vždy omyl (chybějící cena v ceníku, nesmyslné
     * zadání) — nabídka za nula korun nesmí odejít. Projekce smí být nulová,
     * když se neprodává; u zakázky „jen projekce" musí být kladná vždy,
     * u kombinované, když má co prodávat (B113, 6. 10. 2026). */
    kod: 'cenaNula', kde: 'Nabídka', nazev: 'Cena nabídky je nulová nebo není číslo',
    zabranaMozna: true,
    zjisti(ctx) {
      /* Prázdný ceník (samé nuly) hlásí a zastavuje pravidlo „ukazkovyCenik"
       * s přesnější větou — dvakrát totéž by jen mátlo. */
      if (typeof ukazkoveStav === 'function') {
        const u = ukazkoveStav({ cenik: ctx.cenik, cenikProj: ctx.cenikProj,
          slevy: ctx.nast && ctx.nast.slevy, firma: ctx.nast && ctx.nast.firma });
        if (u && u.prazdne) return null;
      }
      const o = !ctx.jenProj && ctx.vysledek && ctx.vysledek.souhrn ? ctx.vysledek.souhrn.zakladCena : undefined;
      const pj = ctx.projVysledek && ctx.projVysledek.souhrn ? ctx.projVysledek.souhrn.celkem : undefined;
      const spatne = [];
      if (o !== undefined && !(Number(o) > 0)) spatne.push('výtahová šachta (OCK)');
      /* Projekce za 0 Kč i v KOMBINOVANÉ nabídce (B113, #374, 6. 10. 2026):
       * má-li projekce co prodávat (položka ani vyřazená, ani vypnutá nulou)
       * a vyjde nula, je to ceník bez cen (ceník sestavení bez značky
       * ukázkových dat) — dokument PROJ by odešel za nula korun. Projekce,
       * která se neprodává (vše vyřazené nebo vypnuté), smí být nulová. */
      if (pj !== undefined && (!isFinite(Number(pj)) || Number(pj) < 0
          || ((ctx.jenProj || kontrolyProjProdava(ctx.projVysledek)) && !(Number(pj) > 0))))
        spatne.push('projekční práce (PROJ)');
      if (!spatne.length) return null;
      return { uroven: KONTROLY_UROVEN_ZABRANA,
        /* #377: zastaví jen dokumenty té části, jejíž cena je vadná. */
        strany: [spatne.indexOf('výtahová šachta (OCK)') >= 0 ? 'ock' : '',
          spatne.indexOf('projekční práce (PROJ)') >= 0 ? 'proj' : ''].filter(Boolean),
        text: 'Cena nabídky vyšla nulová nebo to není číslo (' + kontrolyVyctem(spatne) + ') — '
          + 'nejspíš chybí cena v ceníku nebo je nesmyslné zadání. Dokument nevznikne.' };
    },
  },
  {
    kod: 'stanice', kde: 'Kalkulace OCK', nazev: 'Méně než dvě nástupiště',
    zjisti(ctx) {
      const z = ctx.zadani;
      if (!z) return null;
      /* U průchozí šachty se nástupiště zadávají po stranách A a C
       * (nastupisteCelkem); pole `nastupiste` tam nic neznamená, takže
       * A0 + C0 procházelo bez varování (N53, hloubkový test 24. 9. 2026). */
      const n = (typeof nastupisteCelkem === 'function') ? nastupisteCelkem(z) : +z.nastupiste;
      if (isFinite(n) && n >= 2) return null;
      /* Výška podlaží se počítá jako zdvih/(nástupiště−1); při jednom
       * nástupišti se dělí nulou a odvozené rozměry přestanou dávat smysl. */
      return { text: 'Šachta má míň než dvě nástupiště. Z toho se nedá spočítat '
        + 'výška podlaží, takže odvozené rozměry v kalkulaci neplatí.' };
    },
  },
  {
    kod: 'vysky', kde: 'Kalkulace OCK', nazev: 'Výšky a šířky si odporují',
    zjisti(ctx) {
      const z = ctx.zadani;
      if (!z) return null;
      const o = (ctx.vysledek && ctx.vysledek.odvozene) || null;
      const n = +z.nastupiste;
      /* Výška šachty se NEPOROVNÁVÁ se součtem: engine.js ji jako součet
       * přejezdu, zdvihu a prohlubně přímo počítá, takže se rozejít nemůže.
       * Rozejít se dají dvě jiné věci, a na těch stojí montáž. */
      const svetla = o ? o.svetlaVyska
        : (isFinite(n) && n > 1 && isFinite(+z.zdvih) ? (+z.zdvih) / (n - 1) - 0.2 : null);
      const dvere = o ? o.sirkaDveri
        : ((+z.cistyVstupMm + 2 * (+z.sirkaRamuMm) + 40) / 1000);
      const potize = [];
      if (svetla != null && isFinite(svetla) && svetla < KONTROLY_VYSKA_DVERI)
        potize.push('světlá výška podlaží nestačí na dveřní otvor ' + KONTROLY_VYSKA_DVERI + ' m');
      if (isFinite(dvere) && +z.sirka > 0 && dvere > +z.sirka)
        potize.push('sestava dveří je širší než šachta');
      if (!potize.length) return null;
      return { text: 'Rozměry si odporují: ' + kontrolyVyctem(potize)
        + '. Vyrobit se to dá, postavit ne.' };
    },
  },
  {
    /* NAD DVEŘMI NIC (N58, rozhodnutí J. V. 24. 9. 2026). Volba „bez"
     * nechává pole nad dveřmi neocenené — šířka stěny × (světlá výška −
     * 2,3 m) na každé nástupiště. Může to být záměr (stavba dozdí), proto
     * jen upozornění; pod 10 cm pole prakticky není a pravidlo mlčí. */
    kod: 'nadDvermiBez', kde: 'Kalkulace OCK', nazev: 'Nad dveřmi zůstane otvor',
    zjisti(ctx) {
      const z = ctx.zadani;
      if (!z) return null;
      const volba = (typeof nadDvermiVypln === 'function') ? nadDvermiVypln(z)
        : (z.nadDvermi || (z.svetlikNadDvermi ? 'sklo' : 'bez'));
      if (volba !== 'bez') return null;
      const o = (ctx.vysledek && ctx.vysledek.odvozene) || null;
      const svetla = o ? o.svetlaVyska : null;
      if (svetla == null || !isFinite(svetla)) return null;
      const h = svetla - KONTROLY_VYSKA_DVERI;
      if (h <= 0.1) return null;
      return { text: 'Nad šachetními dveřmi je zvoleno „bez" — zůstane otvor vysoký '
        + (Math.round(h * 100) / 100).toString().replace('.', ',') + ' m, který nic neoceňuje. '
        + 'Zvolte sklo, plech, materiál opláštění, nebo „zajistí stavba" (pak to uvede specifikace).' };
    },
  },
  {
    /* SVĚTLÍKY NA BOCÍCH DVEŘÍ (#375, rozhodnutí J. V. 30. 9. 2026). Boky
     * „bez" nechávají mezeru vedle dveří neocenenou (šířka stěny − otvor
     * dveří − 0,04 m na každých dveřích) — stejně jako „bez" nad dveřmi, jen
     * upozornění; pod 2 cm mezera prakticky není. Dál se hlídá počet
     * světlíků: víc než dva u každých dveří, dveře bez světlíku (mezera
     * u nich zůstane) a nulový počet u zvolené výplně. Mezera se bere
     * z výsledku jádra (rozměr skla, otvor dveří), volba a počet ze zadání
     * — i u odeslané nabídky se zmrazeným otiskem z doby před #375.
     *
     * Od #381 (1. 10. 2026) hlídá i RUČNÍ ŠÍŘKU bočního světlíku (jen
     * Model 2, viz kontrolyBokySirka): širší než mezera nebo „nevejdou se"
     * je ZÁBRANA — zastaví dokumenty OCK (BRÁNA DOKUMENTŮ níž); zbytek
     * mezery jen upozorní. Bez ruční šířky zůstává pravidlo upozorněním. */
    kod: 'bokyDveri', kde: 'Kalkulace OCK', nazev: 'Světlíky na bocích dveří',
    zabranaMozna: true, strany: ['ock'],
    zjisti(ctx) {
      const z = ctx.zadani;
      const r = ctx.vysledek;
      if (!z || typeof bokyVypln !== 'function' || typeof bokyPocet !== 'function') return null;
      const volba = bokyVypln(z), n = bokyPocet(z);
      const dvere = (typeof nastupisteCelkem === 'function') ? nastupisteCelkem(z) : +z.nastupiste;
      const sir = r && r.zaskleni && r.zaskleni.rozmer ? +r.zaskleni.rozmer.sir : NaN;
      const otvor = r && r.odvozene ? +r.odvozene.sirkaDveri : NaN;
      const mezera = sir - otvor - 0.04;
      const mezeraJe = isFinite(mezera) && mezera > 0.02;
      const m = () => (Math.round(mezera * 100) / 100).toString().replace('.', ',') + ' m';
      if (volba === 'bez') {
        if (!mezeraJe || !(dvere > 0)) return null;
        return { text: 'Na bocích šachetních dveří je zvoleno „bez" — vedle dveří zůstane mezera '
          + m() + ' na každém nástupišti, kterou nic neoceňuje. '
          + 'Zvolte sklo, plech, materiál opláštění, nebo „zajistí stavba" (pak to uvede specifikace).' };
      }
      const potize = [];
      if (!(n > 0)) potize.push('počet je 0 — zvolte u boků „bez", nebo zadejte počet');
      else {
        if (isFinite(dvere) && n > 2 * dvere)
          potize.push('zadaných světlíků (' + n + ') je víc než dva u každých dveří (' + (2 * dvere) + ')');
        if (isFinite(dvere) && n < dvere) {
          const bez = dvere - n;
          potize.push((bez === 1 ? 'u 1 dveří nebude boční světlík' : 'u ' + bez + ' dveří nebude boční světlík')
            + (mezeraJe ? ' — mezera ' + m() + ' tam zůstane neoceněná' : ''));
        }
      }
      /* Ruční šířka bočního světlíku (#381) — zábrana nejdřív, pak počet,
       * nakonec zbytek mezery. */
      const sirka = kontrolyBokySirka(r);
      if (!potize.length && !sirka.zabrana.length && !sirka.upozorneni.length) return null;
      const vety = sirka.zabrana.slice();
      if (potize.length) vety.push('Světlíky na bocích dveří: ' + kontrolyVyctem(potize) + '.');
      vety.push(...sirka.upozorneni);
      if (sirka.zabrana.length)
        return { uroven: KONTROLY_UROVEN_ZABRANA, text: vety.join(' ') + ' Dokument nevznikne, dokud se to neopraví.' };
      return { text: vety.join(' ') };
    },
  },
  {
    /* MŮSTKY (P7 / K13-N59, rozhodnutí J. V. 25. 9. 2026). Můstky se zadávají
     * počtem a v kalkulaci mají vlastní řádek za ceníkovou cenu za kus.
     * Dokud cena v ceníku chybí, jde řádek do nabídky za 0 Kč — to se musí
     * říct. A víc můstků než nástupišť je překlep. */
    kod: 'mustky', kde: 'Kalkulace OCK', nazev: 'Můstky mezi budovou a OCK',
    zjisti(ctx) {
      const z = ctx.zadani;
      if (!z) return null;
      const n = (typeof mustkyPocet === 'function') ? mustkyPocet(z) : (+z.mustkyKs || (z.mustek ? 1 : 0));
      if (!n) return null;
      const potize = [];
      const nast = (typeof nastupisteCelkem === 'function') ? nastupisteCelkem(z) : +z.nastupiste;
      if (isFinite(nast) && nast > 0 && n > nast)
        potize.push('zadaných můstků (' + n + ') je víc než nástupišť (' + nast + ')');
      const c = ctx.cenik;
      if (c && !(+c.mustekKc > 0))
        potize.push('v ceníku chybí cena můstku (Ceník → Hrubá OCK → Můstek mezi budovou a OCK), '
          + 'takže ' + (n === 1 ? 'můstek jde' : 'můstky jdou') + ' do nabídky za 0 Kč');
      if (!potize.length) return null;
      return { text: 'Můstky mezi budovou a OCK: ' + kontrolyVyctem(potize) + '.' };
    },
  },
  {
    /* STATIKA DVAKRÁT (P5 / K19-N109, 2. 10. 2026). Než měla aplikace druhý
     * řádek statiky (opláštění), dorovnávaly se převedené zakázky ručním
     * přepisem hodin řádku STATICKÉ POSOUZENÍ (10–20 h = OCK + opláštění).
     * Jakmile ceník nese hodiny statiky opláštění, taková varianta by je
     * započítala dvakrát. Upozornění, ne zábrana — přepis může být i jiný
     * důvod; rozhodne obchodník. */
    kod: 'statikaDvakrat', kde: 'Kalkulace OCK', nazev: 'Statika opláštění a ručně přepsaná statika',
    zjisti(ctx) {
      const r = ctx.vysledek, z = ctx.zadani;
      if (!r || !r.sekce || !Array.isArray(r.sekce.rezie) || !z) return null;
      const najdi = (n) => r.sekce.rezie.find(x => x && x.origNazev === n);
      const ock = najdi('STATICKÉ POSOUZENÍ'), opl = najdi('STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ');
      if (!ock || !opl || !ock.prepsano) return null;
      return { text: 'Statické posouzení má ručně přepsané hodiny (' + ock.mnozstvi + ' h) a ceník k nim '
        + 'přidává řádek STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ (' + opl.mnozstvi + ' h). Pokud přepis už statiku '
        + 'opláštění zahrnuje (převod z Excelu), vraťte hodiny statiky na ceníkové, nebo řádek '
        + 'statiky opláštění vyřaďte — jinak se zaplatí dvakrát.' };
    },
  },
  {
    kod: 'oplasteniBezKonstrukce', kde: 'Kalkulace OCK', nazev: 'Opláštění bez konstrukce',
    zjisti(ctx) {
      const s = ctx.vysledek && ctx.vysledek.souctySekci;
      if (!s || !s.oplasteni || !s.hrubaOck) return null;
      if (!(s.oplasteni.sMarzi > 0) || s.hrubaOck.sMarzi > 0) return null;
      return { text: 'Nabídka obsahuje opláštění, ale žádnou nosnou konstrukci. '
        + 'Sklo a plechy nemá na čem viset.' };
    },
  },
  {
    kod: 'atypBezProjekce', kde: 'Kalkulace OCK', nazev: 'ATYP bez práce navíc',
    zjisti(ctx) {
      const z = ctx.zadani;
      if (!z || !z.atyp) return null;
      /* Přirážku za atyp přidá ceník sám. Co ceník neví, je práce navíc –
       * a ta se u atypu zapomíná nejčastěji, protože přirážka vypadá, že
       * už je v ceně všechno. */
      const navic = (+z.projekceAtypHod || 0) + (+z.montazAtypHod || 0)
        + (+z.zamecnikAtypKs || 0) + (+z.zamecnikAtypKc || 0);
      if (navic > 0) return null;
      return { text: 'Zakázka je označená jako atypická, ale nemá ani hodinu navíc '
        + 'na projekci, montáž nebo zámečnické práce. Přirážka z ceníku je něco jiného '
        + 'než odpracovaný čas.' };
    },
  },
  {
    /* Atypická práce bez ceny (#7). Nula v ceníku není cena, je to nevyplněné
     * políčko – ale ve sloupci se tváří úplně stejně jako skutečná nula
     * a v součtu po ní nezůstane stopa. Nabídka pak práci navíc rozdá zdarma
     * a přijde se na to až při fakturaci. Proto se ptáme jmenovitě.
     * Bez částek: běžný uživatel nákladové ceny nevidí (#36). */
    kod: 'atypBezCeny', kde: 'Kalkulace OCK', nazev: 'Atypická práce bez ceny',
    zjisti(ctx) {
      const h = ctx.vysledek && ctx.vysledek.sekce && ctx.vysledek.sekce.hrubaOck;
      if (!Array.isArray(h)) return null;
      const bez = h.filter(r => r && r.atyp && r.bezCeny).map(r => r.nazev || r.origNazev);
      if (!bez.length) return null;
      return { text: (bez.length === 1
        ? 'Atypická položka nemá cenu: '
        : 'Atypické položky nemají cenu: ') + kontrolyVyctem(bez)
        + '. Doplňte sazbu v ceníku (sekce ATYP), nebo položku ze zakázky odeberte – '
        + 'takhle se práce navíc udělá zadarmo.' };
    },
  },
  {
    kod: 'sleva', kde: 'Nabídka', nazev: 'Sleva mimo rozsah nebo bez schválení',
    zabranaMozna: true, strany: ['ock'],
    zjisti(ctx) {
      if (ctx.jenProj) return null;   // ZAK-10 se počítá z ceny OCK; bez OCK není co hlídat
      const s = ctx.sleva;
      if (!s) return null;
      /* Na zadanou hodnotu, ne na výsledek: slevaVyhodnot() zápornou slevu
       * tiše ořízne na nulu, takže z jejího výstupu se překlep nepozná. */
      const p = +s.procenta;
      if (s.procenta !== '' && s.procenta != null && !isFinite(p))
        return { text: 'Sleva není číslo, takže se do nabídky nepromítne.' };
      if (p < 0)
        return { text: 'Sleva je zadaná záporně. Záporná sleva je přirážka a aplikace ji '
          + 'bere jako nulovou – v nabídce tedy žádná sleva nebude.' };
      if (p > 100)
        return { text: 'Sleva je vyšší než sto procent. Taková nabídka nedává smysl.' };
      if (!(p > 0)) return null;
      if (typeof slevaVyhodnot !== 'function') return null;
      const zaklad = ctx.vysledek && ctx.vysledek.souhrn ? ctx.vysledek.souhrn.zakladCena : 0;
      const naklad = ctx.vysledek && ctx.vysledek.souhrn ? ctx.vysledek.souhrn.zakladNaklad : 0;
      const nast = (ctx.nast && ctx.nast.slevy) || {};
      const v = slevaVyhodnot(zaklad, naklad, s, nast);
      const schvalena = s.stav === 'schváleno' || s.stav === 'schváleno automaticky';
      if (v.podMarzi && !schvalena)
        return { text: 'Sleva je tak velká, že by nabídku srazila pod firemní minimum marže; '
          + 'zůstává zamítnutá a do nabídky nevstoupí.' };
      /* P1 (K16-N73, 25. 9. 2026): „schváleno automaticky" nad stropem role,
       * která slevu zadala, je rozpor v datech (dřív šlo roli slevy zvolit) —
       * taková nabídka nesmí odejít, slevu musí schválit nadřízený. */
      if (v.nadStrop && s.stav === 'schváleno automaticky')
        return { uroven: KONTROLY_UROVEN_ZABRANA, text: 'Sleva je označená jako schválená automaticky, '
          + 'ale je nad stropem role, která ji zadala. Dokument nevznikne — slevu musí schválit nadřízený.' };
      if (v.nadStrop && !schvalena)
        return { text: 'Sleva je nad stropem role a nikdo ji zatím neschválil. '
          + 'Dokud schválená není, počítá se nabídka bez ní.' };
      return null;
    },
  },
  {
    kod: 'slevaProj', kde: 'Kalkulace PROJ', nazev: 'Sleva projekce mimo rozsah nebo bez schválení',
    zabranaMozna: true, strany: ['proj'],
    zjisti(ctx) {
      /* Zrcadlo pravidla „sleva" nad projekční částí (#134, 12. 8. 2026).
       * Do té doby tu bylo pravidlo „slevaProjMax", které hlídalo jen horní
       * mez zrušeného pole „Globální sleva PROJ" — a nic víc, protože ta
       * sleva neměla ani strop podle role, ani schvalování. Teď má obojí,
       * takže se hlídá stejně jako sleva na výtahovou šachtu.
       *
       * Na rozdíl od OCK se pravidlo NEVYPÍNÁ u zakázky „jen projekce" —
       * tam je to naopak jediná sleva, která na nabídce je. */
      const s = ctx.slevaProj;
      if (!s) return null;
      /* Na zadanou hodnotu, ne na výsledek: slevaVyhodnot() zápornou slevu
       * tiše ořízne na nulu, takže z jejího výstupu se překlep nepozná. */
      const p = +s.procenta;
      if (s.procenta !== '' && s.procenta != null && !isFinite(p))
        return { text: 'Sleva projekce není číslo, takže se do nabídky nepromítne.' };
      if (p < 0)
        return { text: 'Sleva projekce je zadaná záporně. Záporná sleva je přirážka a aplikace ji '
          + 'bere jako nulovou – v nabídce tedy žádná sleva nebude.' };
      if (p > 100)
        return { text: 'Sleva projekce je vyšší než sto procent. Taková nabídka nedává smysl.' };
      if (!(p > 0)) return null;
      if (typeof slevaVyhodnot !== 'function') return null;
      const souhrn = ctx.projVysledek && ctx.projVysledek.souhrn ? ctx.projVysledek.souhrn : null;
      if (!souhrn) return null;
      const nast = (ctx.nast && ctx.nast.slevy) || {};
      const v = slevaVyhodnot(souhrn.celkem, souhrn.naklad + (souhrn.doprava || 0), s, nast);
      const schvalena = s.stav === 'schváleno' || s.stav === 'schváleno automaticky';
      if (v.podMarzi && !schvalena)
        return { text: 'Sleva projekce je tak velká, že by projekční část srazila pod firemní '
          + 'minimum marže; zůstává zamítnutá a do nabídky nevstoupí.' };
      if (v.nadStrop && s.stav === 'schváleno automaticky')   // P1 (K16-N73)
        return { uroven: KONTROLY_UROVEN_ZABRANA, text: 'Sleva projekce je označená jako schválená '
          + 'automaticky, ale je nad stropem role, která ji zadala. Dokument nevznikne — slevu musí schválit nadřízený.' };
      if (v.nadStrop && !schvalena)
        return { text: 'Sleva projekce je nad stropem role a nikdo ji zatím neschválil. '
          + 'Dokud schválená není, počítá se nabídka projekce bez ní.' };
      return null;
    },
  },
  {
    kod: 'marze', kde: 'Nabídka', nazev: 'Marže pod firemním minimem',
    zjisti(ctx) {
      const p = kontrolyMarze(ctx);
      if (!p || !p.varovat) return null;
      /* Kde přesně to je, se dá říct beze jmen částek – názvy sekcí nejsou
       * citlivé, čísla ano. */
      const kde = (p.pod || []).map(s => s.nazev).filter(Boolean);
      const text = 'Marže je pod firemním minimem'
        + (kde.length ? ' (' + kontrolyVyctem(kde) + ')' : '') + '.';
      const detail = (typeof marzeText === 'function') ? marzeText(p, { cisla: true }) : '';
      return { text, detail };
    },
  },
  {
    kod: 'cenaPodNakladem', kde: 'Nabídka', nazev: 'Cena pod nákladem',
    zjisti(ctx) {
      const p = kontrolyMarze(ctx);
      if (!p) return null;
      /* „Malá marže" a „prodělek" se v hlavě čtou jinak, i když je to jedna
       * stupnice – proto zvlášť, i za cenu, že obojí svítí najednou. */
      const vse = [p.ock, p.celek].concat(p.proj ? p.proj.sekce || [] : []);
      const ztrat = [], videno = {};
      vse.forEach(s => {
        if (!s || s.marze == null || !(s.marze < 0)) return;
        if (videno[s.nazev]) return;
        videno[s.nazev] = 1;
        ztrat.push(s);
      });
      if (!ztrat.length) return null;
      const detail = (typeof marzeKc === 'function')
        ? 'Chybí ' + ztrat.map(s => `${s.nazev}: ${marzeKc(s.naklad - s.cena)}`).join(', ') + '.'
        : '';
      return { text: 'Cena je pod nákladem (' + kontrolyVyctem(ztrat.map(s => s.nazev))
        + '). Na téhle zakázce se prodělá.', detail };
    },
  },
  {
    kod: 'ukazkovyCenik', kde: 'Nabídka', nazev: 'Ceník není ostrý',
    zabranaMozna: true,
    zjisti(ctx) {
      if (typeof ukazkoveStav !== 'function') return null;
      const s = ukazkoveStav({ cenik: ctx.cenik, cenikProj: ctx.cenikProj,
        slevy: ctx.nast && ctx.nast.slevy, firma: ctx.nast && ctx.nast.firma });
      if (!s.jsou) return null;
      /* Text se přebírá z #40, aby aplikace na dvou místech neříkala dvě
       * různé věty o téže věci. Prázdný ceník (samé nuly) je jediná tvrdá
       * zábrana v aplikaci – ostatní případy zůstávají varováním. */
      return {
        text: (typeof ukazkoveKratce === 'function') ? ukazkoveKratce(s)
          : 'Dokument je spočítaný z dat, která nejsou ostrá. Neposílejte ho zákazníkovi.',
        uroven: s.prazdne ? KONTROLY_UROVEN_ZABRANA : KONTROLY_UROVEN,
      };
    },
  },
  {
    /* KAPITOLY IV.–VI. A DOLOŽKY (23. 9. 2026, nález K9-N32). Prázdná
     * kapitola se z nabídky OCK vypustí i s nadpisem, takže bez tohohle
     * pravidla odešla nabídka bez požadavků, termínů a předání díla a nikdo
     * se to nedozvěděl. Nabídka PROJ kapitoly nemá — u zakázky jen projekce
     * pravidlo mlčí. Jazyk je jazyk tisku: anglická nabídka potřebuje
     * anglické kapitoly, ne české. */
    kod: 'kapitoly', kde: 'Nabídka', nazev: 'Nevyplněné kapitoly nabídky',
    zjisti(ctx) {
      if (ctx.jenProj || !ctx.nast || typeof firmaKapitolyPrazdne !== 'function') return null;
      const f = ctx.nast.firma || null;
      if (!f) return null;
      const jaz = String(ctx.jazyk || 'cz').toLowerCase();
      const chybi = firmaKapitolyPrazdne(f, jaz);
      if (!chybi.length) return null;
      return { text: 'Nabídka odejde bez ' + kontrolyVyctem(chybi.map(k => k.popis))
        + ' — v Nastavení → Firma → Kapitoly nabídky nejsou vyplněné'
        + (jaz !== 'cz' ? ' (jazyk ' + jaz.toUpperCase() + ')' : '') + '. Prázdná kapitola se z online nabídky '
        /* Word ji vypustí jen se šablonou CN v13 a novější (značky kapitol,
         * P8A 29. 9. 2026); starší šablona nechá nadpis a prázdný rámeček. */
        + 'vypustí i s nadpisem; Word jen se šablonou CN v13 a novější — ve starší zůstane nadpis a prázdný rámeček.' };
    },
  },
  {
    /* DODATKOVÝ TEXT V CIZOJAZYČNÉ NABÍDCE (K18-N96, 30. 9. 2026). Pod
     * příplatkem v kapitole II. tiskne nabídka dodatkový text z ceníku
     * (#267, cenik.popisy — klíč = název položky). Ceník ho má v JEDNOM
     * znění pro všechny jazyky a text napsaný člověkem aplikace nepřekládá
     * (projde beze změny), takže anglická nabídka nesla českou větu a nikdo
     * se to nedozvěděl. Od 1. 10. 2026 (#379) má číselník k textu jazykové
     * varianty EN/DE/FR (`cenik.popisyJazyky`, výpočet je nese u položky
     * jako `popisNabidkaJazyky`) — položka s variantou jazyka tisku se
     * vytiskne v ní a nehlásí se. Varování zůstává pro text bez varianty.
     * Rozhoduje totéž, co tiskne nabidkaData: příplatek v nabídce (ne
     * vynechaný) s neprázdným textem; sloučené přechodové plechy (obě půlky
     * v nabídce) vlastní text netisknou. Text, který slovník zná (nebo který
     * je neutrální), se přeloží a nehlásí se; bez slovníku se nehádá. */
    kod: 'dodatekCesky', kde: 'Nabídka', nazev: 'Dodatkový text zůstane v cizojazyčné nabídce česky',
    zjisti(ctx) {
      const jaz = String(ctx.jazyk || 'cz').toLowerCase();
      if (ctx.jenProj || jaz === 'cz' || typeof trStav !== 'function') return null;
      const r = ctx.vysledek;
      if (!r || !Array.isArray(r.priplatky)) return null;
      const vynech = (ctx.zadani && ctx.zadani.priplatkyVynechat) || [];
      const vNabidce = r.priplatky.filter(p => p && !vynech.includes(p.key));
      const plechy = ['prechMat', 'prechMont'];
      const slouceny = plechy.every(k => vNabidce.some(p => p.key === k));
      const cesky = vNabidce.filter(p => !(slouceny && plechy.includes(p.key)))
        .filter(p => {
          const t = String(p.popisNabidka || '').trim();
          if (!t) return false;
          const j = p.popisNabidkaJazyky && p.popisNabidkaJazyky[jaz];
          if (typeof j === 'string' && j.trim()) return false;     // jazyková varianta (#379)
          return !trStav(t, jaz).prelozeno;
        })
        .map(p => String(p.nazev || p.origNazev || p.key));
      if (!cesky.length) return null;
      return { text: 'Nabídka v jazyce ' + jaz.toUpperCase() + ' ponese česky dodatkový text '
        + (cesky.length === 1 ? 'u položky ' : 'u položek ') + kontrolyVyctem(cesky.map(n => '„' + n + '"'))
        + ': text nemá jazykovou variantu ' + jaz.toUpperCase() + ' a text napsaný ručně aplikace nepřekládá. '
        + 'Variantu doplní administrátor v Ceníku nákladů OCK (číselník dodatkových textů, sloupec ' + jaz.toUpperCase() + '); '
        + 'jinak přepište text u zakázky do jazyka nabídky (Kalkulace OCK, pole pod položkou), nebo ho smažte — '
        + 'administrátorovi se tím změní i společný text pro všechny nabídky.' };
    },
  },
  {
    /* TERMÍN DODÁNÍ U ATYP (#330, nález TD1, 24. 9. 2026). Nabídka od teď
     * nese termín ze zakázky jako první odrážku kapitoly V.; zbytek
     * kapitoly je text z Firmy. Když v tom textu zůstala standardní lhůta
     * („cca 12 týdnů") a zakázka je atypická, stojí v nabídce dvě různá
     * čísla. A když ve Firmě standardní lhůta chybí, prodloužení za ATYP
     * se do nabídky nedostane vůbec. Jen u ATYP — u běžné zakázky čísla
     * souhlasí a pravidlo, které svítí pořád, se přestane číst. */
    kod: 'terminAtyp', kde: 'Nabídka', nazev: 'Termín dodání u atypické zakázky',
    zjisti(ctx) {
      const z = ctx.zadani;
      if (ctx.jenProj || !z || !z.atyp || !ctx.nast || !ctx.nast.firma) return null;
      const f = ctx.nast.firma;
      const hodn = id => String(f[id] == null ? '' : f[id]).trim();
      const termin = String(ctx.terminDodani || '').trim();
      if (!termin) {
        return { text: 'Zakázka je atypická, ale nabídka neuvede termín dodání s prodloužením za ATYP — '
          + 'v Nastavení → Firma → Smluvní standardy není vyplněná standardní lhůta dodání OCK '
          + '(nebo je v krycím listu smazaná).' };
      }
      const cislo = t => { const m = String(t).match(/\d+/); return m ? parseInt(m[0], 10) : null; };
      const zaklad = cislo(hodn('terminDodaniOck'));
      const vNabidce = cislo(termin);
      if (zaklad == null || vNabidce == null || zaklad === vNabidce) return null;
      const kap = (typeof firmaKapitola === 'function')
        ? firmaKapitola(f, 'kapTerminy', ctx.jazyk).radky.join('\n') : '';
      const re = /(\d+)\s*(?:týdn|weeks?\b|wochen|semaines)/gi;
      let m, koliduje = false;
      while ((m = re.exec(kap))) if (parseInt(m[1], 10) === zaklad) koliduje = true;
      if (!koliduje) return null;
      return { text: 'V nabídce budou dva různé termíny: termín dodání „' + termin + '" a v textu kapitoly V. '
        + 'z Firmy standardní lhůta ' + zaklad + ' týdnů. Vypusťte číslo z textu kapitoly V. '
        + '(Nastavení → Firma → Kapitoly nabídky) — termín se doplňuje ze zakázky sám.' };
    },
  },
  {
    /* SLEVA VE WORDU (P5 / K13-N56, 24. 9. 2026). Aplikace slevu do Wordu
     * posílá (CENA_PRED_SLEVOU, SLEVA_PROC, SLEVA_KC), ale šablona nabídky
     * v11 ty symboly nemá — zákazník ve Wordu vidí jen konečnou cenu, zatímco
     * online náhled ukazuje cenu před slevou i slevu. Kontrola se ozve jen
     * tehdy, když symboly šablony známe (ctx.sablonaNabidka stahuje UI na
     * pozadí); nevíme-li, mlčí — hádat by znamenalo varovat naslepo. */
    kod: 'slevaWord', kde: 'Nabídka', nazev: 'Sleva se ve Wordu neukáže',
    zjisti(ctx) {
      if (ctx.jenProj || typeof slevaPlati !== 'function' || !slevaPlati(ctx.sleva)) return null;
      const s = ctx.sablonaNabidka;
      if (!s || !Array.isArray(s.symboly) || !s.symboly.length) return null;
      if (s.symboly.indexOf('SLEVA_KC') >= 0) return null;
      return { text: 'Word slevu neukáže, zákazník uvidí jen konečnou cenu: šablona nabídky OCK'
        + (s.nazev ? ' „' + s.nazev + '"' : '') + (s.verze ? ' (verze ' + s.verze + ')' : '')
        + ' nemá symbol {{SLEVA_KC}}. Schválená sleva ' + (+ctx.sleva.procenta) + ' % je v ceně započtená; '
        + 'cenu před slevou a slevu ukazuje jen online náhled nabídky.' };
    },
  },
  {
    /* PLATEBNÍ PODMÍNKY OCK VE WORDU (etapa A, D1 + D2 — 30. 9. 2026; vzor
     * slevaWord a planPlatebWordProj). Šablona CN v13 má tři pevné věty
     * o dílčích dokladech: splátku s 0 % nevynechá (u „Bez zálohy" zůstane
     * první věta bez procenta, K18-N94), procento vlastního znění nepřečte
     * a měsíční fakturaci neukáže vůbec. Umí to až šablona CN v14
     * ({{PODM_PLATEBNI_KALENDAR}}, {{PODM_FAKTURACE_MESICNE}}; vyrábí ji
     * nastroje/vyrob_sablony.js --cn-v14). Varování, ne zábrana: s v13 se
     * tiskne jako dřív a online náhled podmínky ukazuje správně. Mlčí, dokud
     * šablonu neznáme, a u nabídky odeslané před pravidly (tiskne se beze
     * změny). */
    kod: 'platbyWordOck', kde: 'Nabídka', nazev: 'Platební podmínky OCK se ve Wordu neukážou správně',
    zjisti(ctx) {
      if (ctx.jenProj) return null;
      const kal = ctx.platbyOck;
      const duvody = kontrolyPlatbyDuvody(kal);
      if (!duvody.length) return null;
      const s = ctx.sablonaNabidka;
      if (!s || !Array.isArray(s.symboly) || !s.symboly.length) return null;
      const chybi = ['PODM_PLATEBNI_KALENDAR'].concat(kal.mesicne ? ['PODM_FAKTURACE_MESICNE'] : [])
        .filter(k => s.symboly.indexOf(k) < 0);
      if (!chybi.length) return null;
      return { text: 'Word vytiskne pevné věty šablony o dílčích dokladech, ne platební podmínky zakázky: '
        + kontrolyVyctem(duvody) + '. Šablona nabídky OCK' + (s.nazev ? ' „' + s.nazev + '"' : '')
        + (s.verze ? ' (verze ' + s.verze + ')' : '') + ' nemá symbol ' + chybi.map(k => '{{' + k + '}}').join(' ani ')
        + '. Online náhled nabídky podmínky ukazuje správně. Nahrajte šablonu nabídky OCK v14 (Nastavení → Smlouvy / Šablony).' };
    },
  },
  {
    /* SLEVA PROJEKCE VE WORDU (P4 / K15-N66, 25. 9. 2026). Aplikace posílá
     * do Wordu PROJ_CENA_PRED_SLEVOU, PROJ_SLEVA_PROC, PROJ_SLEVA_KC
     * i součty, ale šablona nabídky PROJ v2 nemá ani jeden — zákazník vidí
     * jen ceny činností, sleva je v nich rozpuštěná a neví o ní. Symboly
     * šablony se znají stejně jako u OCK (ctx.sablonaNabidkaProj stahuje UI
     * na pozadí); dokud je neznáme, pravidlo mlčí. */
    kod: 'slevaWordProj', kde: 'Nabídka PROJ', nazev: 'Sleva projekce se ve Wordu neukáže',
    zjisti(ctx) {
      if (ctx.jenOck || (ctx.zak && ctx.zak.jenOck)) return null;
      if (typeof slevaPlati !== 'function' || !slevaPlati(ctx.slevaProj)) return null;
      const s = ctx.sablonaNabidkaProj;
      if (!s || !Array.isArray(s.symboly) || !s.symboly.length) return null;
      if (s.symboly.indexOf('PROJ_SLEVA_KC') >= 0) return null;
      return { text: 'Word slevu projekce neukáže, zákazník uvidí jen ceny činností (sleva je v nich rozpuštěná): '
        + 'šablona nabídky PROJ' + (s.nazev ? ' „' + s.nazev + '"' : '') + (s.verze ? ' (verze ' + s.verze + ')' : '')
        + ' nemá symbol {{PROJ_SLEVA_KC}}. Schválená sleva ' + (+ctx.slevaProj.procenta) + ' % je v ceně započtená; '
        + 'cenu před slevou a slevu ukazuje jen online náhled nabídky PROJ. Do šablony patří '
        + '{{PROJ_CENA_PRED_SLEVOU}}, {{PROJ_SLEVA_PROC}}, {{PROJ_SLEVA_KC}} a {{PROJ_CELKEM_BEZ_DPH}}.' };
    },
  },
  {
    /* VLASTNÍ POLOŽKY PROJEKCE VE WORDU (P4 / K14-N64). Položky přidané
     * do kalkulace PROJ („+ přidat položku", trvalé z ceníku) jsou v ceně
     * sekce i v online nabídce; do Wordu jdou symboly PROJ_POLOZKY_NAVIC
     * (souhrnně) a PROJ_NAVIC_<SEKCE> — šablona v2 nemá ani jeden. */
    kod: 'polozkyNavicWordProj', kde: 'Nabídka PROJ', nazev: 'Vlastní položky projekce se ve Wordu neukážou',
    zjisti(ctx) {
      if (ctx.jenOck || (ctx.zak && ctx.zak.jenOck)) return null;
      const navic = Array.isArray(ctx.projNavic) ? ctx.projNavic : kontrolyProjNavic(ctx.projVysledek);
      if (!navic.length) return null;
      const s = ctx.sablonaNabidkaProj;
      if (!s || !Array.isArray(s.symboly) || !s.symboly.length) return null;
      if (s.symboly.some(x => x === 'PROJ_POLOZKY_NAVIC' || /^PROJ_NAVIC_/.test(x))) return null;
      return { text: 'Položky přidané do kalkulace PROJ (' + kontrolyVyctem(navic.map(n => '„' + n + '"'))
        + ') wordová nabídka neukáže — šablona nabídky PROJ' + (s.nazev ? ' „' + s.nazev + '"' : '')
        + ' nemá symbol {{PROJ_POLOZKY_NAVIC}} ani {{PROJ_NAVIC_<SEKCE>}}. V ceně sekcí jsou; '
        + 'vypisuje je jen online náhled nabídky PROJ.' };
    },
  },
  {
    /* CENA ČINNOSTI VE WORDU (K18-N92, 30. 9. 2026, vzor slevaWordProj).
     * Šablona PROJ v3 nemá místo pro cenu geodetického zaměření, CELKEM ji
     * přitom obsahuje — zakázka P09 měla ve Wordu vidět 18 200 Kč a CELKEM
     * 41 600 Kč. Pravidlo se ozve, když nabízená činnost s cenou nemá
     * v šabloně svůj symbol (NABIDKA_PROJ_CENA_SYMBOL v nabidka_proj.js).
     *
     * VAROVÁNÍ, NE ZÁBRANA — stejně jako ostatní pravidla o Wordu
     * (slevaWord, slevaWordProj, polozkyNavicWordProj, planPlatebWordProj):
     * symboly šablony se stahují na pozadí, takže zábrana by dokument
     * zastavovala podle toho, jestli stažení už doběhlo; vadu nezpůsobila
     * data zakázky, ale šablona, kterou obchodník opravit nemůže (nahrává
     * ji administrátor) — zábrana by mu vzala i Word, který si umí doplnit
     * ručně; online náhled a PDF cenu ukazují správně. Oprava je šablona
     * PROJ v4 (nastroje/vyrob_sablony.js --proj-v4), která blok ceny
     * geodetického zaměření má. */
    kod: 'cenaWordProj', kde: 'Nabídka PROJ', nazev: 'Cena činnosti se ve Wordu neukáže',
    zjisti(ctx) {
      if (ctx.jenOck || (ctx.zak && ctx.zak.jenOck)) return null;
      const s = ctx.sablonaNabidkaProj;
      if (!s || !Array.isArray(s.symboly) || !s.symboly.length) return null;
      const chybi = kontrolyProjCenyBezSymbolu(ctx.projVysledek, s.symboly);
      if (!chybi.length) return null;
      return { text: 'Word nabídky PROJ neukáže cenu za ' + kontrolyVyctem(chybi.map(c => c.nazev))
        + ': šablona nabídky PROJ' + (s.nazev ? ' „' + s.nazev + '"' : '') + (s.verze ? ' (verze ' + s.verze + ')' : '')
        + ' pro ni nemá symbol ' + kontrolyVyctem(chybi.map(c => '{{' + c.symbol + '}}'))
        + '. V CELKEM cena započtená je, takže se částky činností ve Wordu do CELKEM nesečtou. '
        + 'Správně ji ukazuje online náhled nabídky PROJ. Nahrajte šablonu nabídky PROJ v4.' };
    },
  },
  {
    /* PLÁN PLATEB PROJEKCE — 100 % U ČINNOSTI (etapa B, #367, rozhodnutí J. V.
     * 29. 9. 2026: „součet u každé činnosti 100 %, dokument nevznikne,
     * odklepnout nejde"). Splátky nabízené činnosti musí dát 100 %, mít
     * kladná procenta a známý milník. Skutečná brána je v dokumentZabrana
     * (nabídka PROJ, náhled, smlouva) — tohle pravidlo ji ukáže předem. */
    kod: 'planPlateb100', kde: 'Plán plateb PROJ', nazev: 'Plán plateb projekce nedává 100 % nebo nemá milník',
    zabranaMozna: true,
    zjisti(ctx) {
      if (ctx.jenOck || (ctx.zak && ctx.zak.jenOck)) return null;
      const pl = ctx.platbyProj;
      if (!pl || pl.stary) return null;
      const v = (pl.kontrola || []).filter(k => k.kod !== 'soucet');
      if (!v.length) return null;
      return { uroven: KONTROLY_UROVEN_ZABRANA,
        text: 'Plán plateb projekce: ' + v.map(x => x.text).join(' ')
          + ' Nabídka PROJ ani smlouva nevznikne, dokud se to neopraví (krycí list PROJ → Plán plateb).' };
    },
  },
  {
    /* PLATBY SMLOUVY PROJ = CENA DÍLA (etapa B, P9.3). Dopočet sedí vždy;
     * nesouhlas vznikne jen ruční částkou v tabulce plateb krycího listu.
     * Zastaví smlouvu o dílo PROJ (nabídka platby v korunách nenese). */
    kod: 'planPlatebSoucet', kde: 'Plán plateb PROJ', nazev: 'Platby smlouvy PROJ nedávají cenu díla',
    zabranaMozna: true,
    zjisti(ctx) {
      if (ctx.jenOck || (ctx.zak && ctx.zak.jenOck)) return null;
      const pl = ctx.platbyProj;
      if (!pl || pl.stary || !pl.dopocet || pl.dopocet.sedi) return null;
      const f = (pl.mena && pl.mena.fmt) || (n => String(n));
      return { uroven: KONTROLY_UROVEN_ZABRANA,
        text: 'Součet plateb smlouvy o dílo PROJ (' + f(pl.dopocet.soucet) + ') nesouhlasí s cenou díla (' + f(pl.dopocet.cena)
          + ') — upravte ruční částky v krycím listu PROJ (Smlouva o dílo — splátky) nebo vraťte dopočet (↺). '
          + 'Smlouva nevznikne, dokud se to neopraví.' };
    },
  },
  {
    /* PLÁN PLATEB VE WORDU (etapa B, vzor slevaWordProj). Šablona PROJ v2/v3
     * má platební podmínky natvrdo (procenta a texty výchozího Standardu
     * z kódu) — plán, který se od nich liší (jiná předvolba, úprava, firemní
     * Standard, přepsaný text milníku), by Word nevytiskl (planShodaSeStarou-
     * Sablonou, revize etapy B 30. 9. 2026). Varování, ne zábrana: online
     * náhled a krycí list plán ukazují, smlouva ho nese; řešením je šablona
     * PROJ v4 (nastroje/vyrob_sablony.js --proj-v4). */
    kod: 'planPlatebWordProj', kde: 'Nabídka PROJ', nazev: 'Plán plateb se ve Wordu neukáže',
    zjisti(ctx) {
      if (ctx.jenOck || (ctx.zak && ctx.zak.jenOck)) return null;
      const pl = ctx.platbyProj;
      if (!pl || pl.stary || typeof planPredvolba !== 'function') return null;
      if (planShodaSeStarouSablonou(pl.plan, pl.firemni, pl.ceny)) return null;
      const s = ctx.sablonaNabidkaProj;
      if (!s || !Array.isArray(s.symboly) || !s.symboly.length) return null;
      if (s.symboly.some(x => /^PROJ_PLATBY_/.test(x) || x === 'PROJ_PLATEBNI_PODMINKY')) return null;
      return { text: 'Word vytiskne pevné platební podmínky šablony (výchozí Standard z doby před plánem plateb), ne plán plateb zakázky ('
        + planPopisPredvolby(pl.plan, pl.firemni, pl.ceny) + '): šablona nabídky PROJ' + (s.nazev ? ' „' + s.nazev + '"' : '')
        + (s.verze ? ' (verze ' + s.verze + ')' : '') + ' nemá symboly {{PROJ_PLATBY_…}}. Plán ukazuje online náhled nabídky '
        + 'a krycí list, smlouva o dílo ho nese. Nahrajte šablonu nabídky PROJ v4.' };
    },
  },
  {
    /* PROJEKCE U ZAHRANIČNÍ ZAKÁZKY (P11 / K15-N72, rozhodnutí J. V.
     * 29. 9. 2026: „zahraniční zakázky PROJ nerealizujeme"). Řada Zahraničí
     * u projekce mění jen přirážku a DPH, sazby a fixy zůstávají tuzemské —
     * a nikdo o tom nevěděl. Varování, ne zábrana: realizaci (OCK) téže
     * varianty zastavit nesmí. */
    kod: 'projZahranici', kde: 'Nabídka PROJ', nazev: 'Projekce u zahraniční zakázky',
    zjisti(ctx) {
      if (ctx.cenikRada !== 'zahr') return null;
      if (ctx.jenOck || (ctx.zak && ctx.zak.jenOck)) return null;
      const r = ctx.projVysledek;
      if (!r || !r.souhrn || !(Number(r.souhrn.celkem) > 0)) return null;
      return { text: 'Varianta počítá se zahraničním ceníkem a má oceněnou projekci. Projekci u zahraničních '
        + 'zakázek nerealizujeme — a její sazby a fixy by navíc zůstaly tuzemské (zahraniční ceník u projekce '
        + 'mění jen přirážku a DPH). Projekci z varianty vyřaďte (zakázka jen realizace), nebo variantu '
        + 'vraťte na tuzemský ceník.' };
    },
  },
  {
    kod: 'hlavicka', kde: 'Hlavička zakázky', nazev: 'Prázdná hlavička',
    zjisti(ctx) {
      const zak = ctx.zak;
      if (!zak) return null;
      /* IČO se tu záměrně NEVYŽADUJE, i když v hlavičce od 30. 7. 2026 je.
       * Nabídka odchází běžně dřív, než je objednatel potvrzený, a pravidlo,
       * které svítí u každé druhé zakázky, se za týden přestane číst. Jestli
       * je vyplněné IČO platné, hlídá samostatné pravidlo níž. */
      const pole = [['cislo', 'číslo nabídky'], ['nazevAkce', 'název akce'],
        ['objednatel', 'objednatel']];
      const vypln = (typeof hlavickaVyplneno === 'function')
        ? hlavickaVyplneno : v => String(v == null ? '' : v).trim() !== '';
      const chybi = pole.filter(([k]) => !vypln(zak[k])).map(([, n]) => n);
      if (!chybi.length) return null;
      return { text: 'V hlavičce zakázky chybí ' + kontrolyVyctem(chybi)
        + '. Na dokumentu zůstane prázdné místo.' };
    },
  },
  {
    /* IČO je jediný údaj, kterým se objednatel dá jednoznačně určit – název
     * firmy se píše pokaždé jinak. Právě proto se z něj opisuje do smlouvy
     * a do faktury, a právě proto se u něj překlep pozná až v účtárně.
     * Kontroluje se kontrolní číslice (modulo 11), ne délka: osmimístné číslo
     * s prohozenými ciframi vypadá jako IČO a přes kontrolu délky projde. */
    kod: 'ico', kde: 'Hlavička zakázky', nazev: 'IČO objednatele',
    zjisti(ctx) {
      const zak = ctx.zak;
      if (!zak || typeof icoPlatne !== 'function') return null;
      if (!icoVyplneno(zak.ico)) return null;   // prázdné IČO není chyba
      if (icoPlatne(zak.ico)) return null;
      return { text: 'IČO objednatele „' + String(zak.ico).trim() + '" neodpovídá '
        + 'kontrolní číslici – takové IČO neexistuje. Bývá to překlep nebo '
        + 'prohozené cifry; opisuje se do smlouvy i na fakturu.' };
    },
  },
];

/* Katalog pravidel bez funkcí – pro nápovědu, protokol o kalkulaci (#41)
 * a pro test, že se pravidlo nikam neztratilo. */
/* Názvy vlastních a trvalých položek PROJ, které se počítají (P4) — týž
 * výběr jako v nabidkaProjData: vlastní, nevyřazená, něco stojí. */
function kontrolyProjNavic(r) {
  const out = [];
  ((r && r.sekce) || []).forEach(s => (s.polozky || []).forEach(p => {
    if (p && p.vlastni && !p.vyrazeno && Math.abs(+p.naklad || 0) > 0 && String(p.nazev || '').trim())
      out.push(String(p.nazev).trim());
  }));
  return out;
}

/* Co z platebního kalendáře OCK (kryciPlatebniKalendar) šablona CN v13
 * s pevnými větami nevytiskne — prázdný seznam = vytiskne správně (výchozí
 * 50 / 40 / 10) nebo jde o nabídku odeslanou před pravidly. Sdílí ho
 * pravidlo platbyWordOck a UI, které podle něj šablonu stahuje. */
function kontrolyPlatbyDuvody(kal) {
  if (!kal || kal.stary || !Array.isArray(kal.splatky)) return [];
  if (kal.mesicne) return ['měsíční fakturaci neukáže (vytiskne splátky)'];
  const out = [];
  const vyn = Array.isArray(kal.vynechane) ? kal.vynechane : [];
  if (vyn.indexOf('zaloha1') >= 0) out.push('u nabídky bez zálohy zůstane věta o 1. dílčím dokladu bez procenta');
  if (vyn.some(id => id !== 'zaloha1')) out.push('splátku s 0 % nevynechá');
  (Array.isArray(kal.necitelne) ? kal.necitelne : []).forEach(id => {
    const t = String(((kal.hodnoty || {})[id]) || '').trim();
    if (t) out.push('procento splátky „' + t + '" nepřečte (ve větě zůstane prázdné místo)');
  });
  return out;
}

/* Nabízené činnosti PROJ s cenou, jejichž cenu šablona neukáže (K18-N92):
 * [{ key, nazev, symbol }]. Nabízená = sekce s kladnou cenou (tatáž, kterou
 * nabídka tiskne). Šablona ji ukáže symbolem z NABIDKA_PROJ_CENA_SYMBOL nebo
 * jeho podobou `…_BLOK`; zaměření i symbolem „části 1" studie
 * ({{PROJ_CENA_SP1}}), dokud se studie nenabízí — pak tam stojí jen odkaz
 * na cenu zaměření výše (nabidkaProjData). Bez mapy (modul nabídky PROJ
 * není načtený — server ho záměrně nemá, viz jadro_moduly.cjs) se nehádá
 * a vrací se prázdno. */
function kontrolyProjCenyBezSymbolu(r, symboly) {
  const mapa = (typeof NABIDKA_PROJ_CENA_SYMBOL !== 'undefined') ? NABIDKA_PROJ_CENA_SYMBOL : null;
  if (!mapa || !Array.isArray(symboly)) return [];
  const sekce = ((r && r.sekce) || []).filter(s => s && mapa[s.key] && Number(s.celkem) > 0);
  const nabizena = k => sekce.some(s => s.key === k);
  return sekce.filter(s => {
    const ma = [mapa[s.key], mapa[s.key] + '_BLOK'];
    if (s.key === 'zamereni' && !nabizena('studie') && !nabizena('projednani')) ma.push('PROJ_CENA_SP1');
    return !ma.some(x => symboly.indexOf(x) >= 0);
  }).map(s => ({ key: s.key, nazev: String(s.nazev || s.key), symbol: mapa[s.key] }));
}

function kontrolyPravidla() {
  return KONTROLY.map(r => ({ kod: r.kod, kde: r.kde, nazev: r.nazev,
    uroven: KONTROLY_UROVEN,
    /* Jestli pravidlo umí zvednout ruku a dokument zastavit (které dokumenty,
     * viz BRÁNA DOKUMENTŮ níž, #377). V nápovědě i v protokolu má být
     * poznat, které pravidlo se dá odklepnout a které ne. */
    zabranaMozna: !!r.zabranaMozna }));
}

/* Projde všechna pravidla nad kontextem.
 * ctx = { zadani, vysledek, projZadani, projVysledek, cenik, cenikProj,
 *         sleva, nast, zak, zaokr, marzePrehled? }
 * Co v kontextu není, to se nehlídá – kontrola nad rozdělanou zakázkou nesmí
 * hlásit chybu jen proto, že se ještě nezadalo všechno. */
function kontrolyProved(ctx) {
  const nalezy = [];
  if (ctx && typeof ctx === 'object') {
    KONTROLY.forEach(r => {
      let v = null;
      /* Rozbité pravidlo nesmí vzít s sebou panel. Kontrola běží nad
       * rozdělaným zadáním, kde může chybět cokoli; kdyby jediné pravidlo
       * spadlo na nedefinované hodnotě, zhasla by i varování, která fungují –
       * a nikdo by si toho nevšiml. */
      /* Zakázka jen projekce: pravidla nad zadáním OCK mlčí (2. 8. 2026,
       * „někdy jí prodáváme zvlášť") — čistě projekční nabídka nesmí svítit
       * varováními o šachtě, kterou nikdo neprodává. */
      if (ctx && ctx.jenProj && r.kde === 'Kalkulace OCK') return;
      try { v = r.zjisti(ctx); } catch (e) { v = null; }
      if (!v) return;
      nalezy.push({ kod: r.kod, kde: r.kde, nazev: r.nazev,
        uroven: v.uroven || KONTROLY_UROVEN,
        /* Které části zakázky se nález týká (#377) — podle toho brána
         * dokumentů rozhodne, který dokument zastaví. Bez údaje = obě. */
        strany: (Array.isArray(v.strany) && v.strany.length) ? v.strany.slice()
          : (Array.isArray(r.strany) ? r.strany.slice() : ['ock', 'proj']),
        text: v.text, detail: v.detail || '' });
    });
  }
  const zabrany = nalezy.filter(n => n.uroven === KONTROLY_UROVEN_ZABRANA);
  return { varovat: nalezy.length > 0, nalezy, kody: nalezy.map(n => n.kod),
           /* brani = dokument nesmí vzniknout. Odděleno od `varovat`, aby
            * volající nemusel prohledávat nálezy a nemohl na to zapomenout. */
           brani: zabrany.length > 0, kodyBrani: zabrany.map(n => n.kod),
           textBrani: zabrany.map(n => n.text).join(' ') };
}

/* ---------- BRÁNA DOKUMENTŮ (#377, 1. 10. 2026) ----------
 * Zábrana (úroveň 1) říkala „Dokument nevznikne, dokud se to neopraví",
 * ale do v30.9.4 ji brána dokumentů (dokumentZabrana v ui/ukazkove_ui.js)
 * nečetla — hlídala jen prázdný ceník a plán plateb PROJ. Zdvih −5 m
 * i 1 000 000 000 m dal nabídku. Tady je rozhodnutí, KTERÝ dokument která
 * zábrana zastaví; UI jen dodá výsledek kontrol nad variantou, ze které
 * dokument vzniká (kontrolyStavVarianta v ui/kontroly_ui.js).
 *
 *   zábrana (kód)         strana  zastaví dokumenty
 *   --------------------  ------  -----------------------------------------
 *   rozmery               OCK     nabídka OCK (Word + náhled/tisk), SoD OCK,
 *   profilNeznamy         OCK       krycí list OCK (Backoffice i Techdata)
 *   sleva (nad stropem)   OCK
 *   bokyDveri             OCK       (jen ruční šířka bočního světlíku v Modelu 2:
 *                                    širší než mezera / nevejdou se — #381)
 *   slevaProj             PROJ    nabídka PROJ (Word + náhled/tisk), SoD PROJ,
 *                                   krycí list PROJ (Backoffice i Techdata)
 *   zapornaPolozka        podle místa nálezu (kalkulace OCK / PROJ)
 *   cenaNula              podle části s vadnou cenou (OCK / PROJ)
 *   ukazkovyCenik         —       hlídá ukazkoveBraniDokumentu (všechny)
 *   planPlateb100/Soucet  —       hlídá planPlatebZabranaDokumentu (PROJ)
 *
 * Plná moc nenese cenu ani rozměry — žádná zábrana z kontrol ji nezastaví.
 * Krycí listy ano: nesou cenu i rozměry do backoffice a výroby, nesmysl by
 * odešel dál jen jinými dveřmi. „Kompletní náhled podkladů" (nabidkaNahled)
 * není dokument pro zákazníka, ale kontrolní pohled na vstupy — zůstává
 * otevřený, je to místo, kde se chyba hledá.
 * Pravidla nad symboly šablon (slevaWord, platbyWordOck, slevaWordProj,
 * polozkyNavicWordProj, cenaWordProj, planPlatebWordProj) a dodatekCesky
 * jsou ZÁMĚRNĚ varování (šablona se stahuje na pozadí, náhled dokument
 * ukáže správně) — úroveň 1 nemají, takže sem nikdy nedojdou. */
const KONTROLY_DOKUMENTY_STRANY = {
  ock: ['nabidka', 'nabidkaTisk', 'sod', 'kryci'],
  proj: ['nabidkaProj', 'nabidkaProjTisk', 'sodProj', 'kryciproj'],
};
/* Zábrany, které hlídá jiná (přesnější) brána — tady se přeskakují, aby
 * hláška nezazněla dvakrát a plán plateb dál rozlišoval nabídku a smlouvu. */
const KONTROLY_BRANA_JINDE = ['ukazkovyCenik', 'planPlateb100', 'planPlatebSoucet'];

/* Typ dokumentu → strana ('ock' | 'proj' | ''). Jazyková přípona (_en…)
 * a verze krycího listu (kryci_bo, kryciproj_techdata) se odříznou. */
function kontrolyDokumentStrana(typ) {
  let t = String(typ || '').replace(/_(en|de|fr)$/, '');
  if (/^kryciproj(_|$)/.test(t)) t = 'kryciproj';
  else if (/^kryci(_|$)/.test(t)) t = 'kryci';
  if (KONTROLY_DOKUMENTY_STRANY.ock.indexOf(t) >= 0) return 'ock';
  if (KONTROLY_DOKUMENTY_STRANY.proj.indexOf(t) >= 0) return 'proj';
  return '';
}

/* Zábrany z výsledku kontrolyProved, které zastaví dokument `typ`.
 * Vrací hlášku (název pravidla + text nálezu — co opravit), nebo ''.
 * Tatáž věta jde do bubliny zhasnutého tlačítka i do hlášky při pokusu
 * o tisk (dokumentZabrana). */
function kontrolyZabranaDokumentu(vysl, typ) {
  const strana = kontrolyDokumentStrana(typ);
  if (!strana || !vysl || !Array.isArray(vysl.nalezy)) return '';
  const zab = vysl.nalezy.filter(n => n.uroven === KONTROLY_UROVEN_ZABRANA
    && KONTROLY_BRANA_JINDE.indexOf(n.kod) < 0
    && (!Array.isArray(n.strany) || n.strany.indexOf(strana) >= 0));
  if (!zab.length) return '';
  return 'Kontrola před nabídkou — dokument nevznikne, dokud se neopraví: '
    + zab.map(n => n.nazev + ': ' + n.text).join(' | ');
}

/* Text pro člověka. opts.cisla = smí vidět částky (administrátor / KPI marže).
 * Bez té volby se nevypíše ani koruna – ale všechny nálezy zazní. */
function kontrolyText(vysl, opts) {
  const n = (vysl && vysl.nalezy) || [];
  if (!n.length) return '';
  const o = opts || {};
  return n.map(x => x.text + (o.cisla && x.detail ? ' ' + x.detail : '')).join(' ');
}

/* Odklepnutí („vím o tom, pokračovat"). Ukládá se k variantě, aby ho protokol
 * o kalkulaci (#41) uměl vypsat: kdo to viděl a co konkrétně odklepl. */
function kontrolyPotvrzeni(vysl, kdo, kdy) {
  const kody = ((vysl && vysl.nalezy) || []).map(n => n.kod).slice().sort();
  return {
    kdy: kdy || new Date().toISOString(),
    kdo: kdo || '',
    kody,
    pocet: kody.length,
  };
}

/* Platí potvrzení na TENHLE stav? Jen tehdy, když se od odklepnutí neobjevil
 * problém, který tam nebyl. Že jich mezitím ubylo, potvrzení neruší – to je
 * oprava, ne nový důvod k varování. */
function kontrolyPotvrzeniPlati(potvrzeni, vysl) {
  if (!potvrzeni || !Array.isArray(potvrzeni.kody)) return false;
  /* Zábranu (úroveň 1) odklepnout nejde. Kdyby šla, nebyla by to zábrana,
   * jen varování s tlačítkem navíc – a přesně tomu má u prázdného ceníku
   * zadání zabránit. */
  if (vysl && vysl.brani) return false;
  const ted = ((vysl && vysl.nalezy) || []).map(n => n.kod);
  return ted.every(k => potvrzeni.kody.indexOf(k) >= 0);
}

if (typeof module !== 'undefined')
  module.exports = { KONTROLY_UROVEN, KONTROLY_UROVEN_ZABRANA,
                     KONTROLY_VYSKA_DVERI, KONTROLY_ZDVIH_MAX_M, kontrolyVyctem, kontrolyBokySirka,
                     kontrolyPravidla, kontrolyProved, kontrolyText, kontrolyProjNavic, kontrolyPlatbyDuvody, kontrolyProjCenyBezSymbolu,
                     kontrolyPotvrzeni, kontrolyPotvrzeniPlati,
                     KONTROLY_DOKUMENTY_STRANY, KONTROLY_BRANA_JINDE, kontrolyDokumentStrana, kontrolyZabranaDokumentu };
