/* ============================================================
 * CENOVÉ VÝJIMKY VARIANTY VE SCHVALOVÁNÍ (rozhodnutí J. V. 13. 10. 2026)
 *
 * CO SE TÍM ŘEŠÍ
 * Dvě cesty, kterými obchodník (role bez práva měnit ceník) pošle nabídku
 * levněji než podle platného ceníku, a přitom mimo schvalování slev:
 *
 *  1) SMĚS CENÍKU. Zakázka se starším ceníkem smí přepočítat jen vybrané
 *     položky („dohodnutá cena zůstává" — cenikPrepocti s `opts.cesty`)
 *     a server (kontrola ceníku skupiny B128/B138 v uloziste.js) takovou
 *     směs „uložená verze + platný ceník" pustí i se zámkem nabídky (audit:
 *     −3,7 % proti platnému). J. V.: „Ano, směs do schvalování."
 *  2) RUČNÍ SAZBA PÁSU OPLÁŠTĚNÍ „JINÉ" nižší než ceníková (otázka 3 nočního
 *     #398: 1 Kč/m² = −17 %). J. V.: „Ponechat se schvalováním."
 *
 * MECHANISMUS (co nejjednodušší, nad schvalováním slev)
 * Varianta nese v datech `cenovaVyjimka` — jedno rozhodnutí, které kryje
 * obojí:
 *   { stav: 'čeká na schválení' | 'schváleno' | 'zamítnuto',
 *     obsah, polozek, pasu,                      // co se schvaluje
 *     pozadal, pozadalKdy,                       // žádost obchodníka
 *     schvalil, schvalilEmail, schvalilKdy,      // razí server
 *     zamitl, zamitlEmail, zamitlKdy, zamitnutoDuvod }
 * OBSAH je kanonický zápis (JSON) toho, čím se varianta od platného ceníku
 * liší: cesty a hodnoty sledovaných položek (cenikSledovane), které se od
 * platného ceníku řady varianty liší a nejsou zakázkové (přirážka, DPH),
 * a pásy „jiné" pod ceníkovou sazbou (stěna, pořadí, název, sazba).
 * Rozhodnutí ho nese CELÝ a platí jen pro přesně tentýž text (B154, audit
 * 15. 10. 2026: 32bitový otisk FNV-1a šel dvěma znaky v názvu pásu dopočítat
 * na schválenou hodnotu). Změna směsi nebo sazby po schválení obsah změní —
 * schválení přestane platit. Rozhodnutí z doby před v15.10.8 nesou jen
 * otisk, obsah ne — neplatí a výjimka se musí schválit znovu.
 *
 * KDO CO SMÍ (vzor B2 / B101 / B105 u slev)
 *  – Požádat smí každý (stav „čeká"); server žádost orazítkuje.
 *  – Schválit / zamítnout / vzít zpět smí administrátor a role s právem
 *    „Schvalování slevy nad strop role" (`sleva.schvalovani` v matici
 *    zobrazení — týž nadřízený, který odklepává slevy). Jméno, e-mail, čas
 *    a obsah razí server z relace a z dat, která se ukládají; bez práva se
 *    rozhodnutí nepřepíše ani nesmaže (vrátí se uložené), dokud platí.
 *  – Výjimku POTŘEBUJE jen role bez práva ceníku té části: směs položek OCK
 *    bez `tab.cenik`, PROJ bez `tab.cenikproj`, pás „jiné" bez `tab.cenik`.
 *    Administrátor nikdy.
 *  – Nový zámek nabídky (tisk = odeslání) varianty, která výjimku potřebuje
 *    a nemá platné schválení, odmítne klient (zábrana „cenovaVyjimka"
 *    v kontroly.js) i server (403). Rozpracované uložení beze zámku projde.
 *
 * Výpočet ceny se tím nemění ani o korunu — modul jen posuzuje data.
 * ============================================================ */

const VYJ_CEKA = 'čeká na schválení';
const VYJ_SCHVALENO = 'schváleno';
const VYJ_ZAMITNUTO = 'zamítnuto';
const VYJ_STAVY = [VYJ_CEKA, VYJ_SCHVALENO, VYJ_ZAMITNUTO];
/* Pole záznamu; jiná server zahodí (nic, co by se tvářilo jako razítko). */
const VYJ_POLE = ['stav', 'obsah', 'polozek', 'pasu', 'pozadal', 'pozadalKdy',
  'schvalil', 'schvalilEmail', 'schvalilKdy', 'zamitl', 'zamitlEmail', 'zamitlKdy', 'zamitnutoDuvod'];
/* Do sdíleného rejstříku (/api/schvalovani) jen tohle — žádná částka, žádná
 * položka ceníku, jen kolik jich je. */
const VYJ_REJSTRIK_POLE = ['stav', 'polozek', 'pasu', 'pozadal', 'pozadalKdy',
  'schvalil', 'schvalilKdy', 'zamitl', 'zamitlKdy', 'zamitnutoDuvod'];
const VYJ_DUVOD_MAX = 500;

/* NEJNIŽŠÍ CENÍKOVÁ SAZBA OPLÁŠTĚNÍ pro šachtu (výklad, výchozí volba):
 * typy z číselníku, které se u té šachty nabízejí (oplasteniTypy podle
 * interiér/exteriér), bez „bez — dodá stavba" a „jiné", se sazbou z ceníku
 * VARIANTY větší než nula. Pás „jiné" levnější než nejlevnější materiál,
 * který jde vybrat bez schválení, je cenová výjimka. Typ s nulovou sazbou
 * se nebere (prázdná položka ceníku by mez srazila na nulu). null = ceník
 * žádnou kladnou sazbu nemá — není s čím srovnat. */
function vyjimkyMinSazbaOpl(zadani, cenik) {
  const typy = (typeof oplasteniTypy === 'function')
    ? oplasteniTypy(!zadani || zadani.typSachty !== 'interiérová') : [];
  let min = null;
  typy.forEach(t => {
    if (!t || t.id === 'bez' || t.id === 'jine') return;
    const sazba = +String(t.id).split('.').slice(1).reduce((o, k) => (o == null ? undefined : o[k]), cenik || {});
    if (isFinite(sazba) && sazba > 0 && (min === null || sazba < min)) min = sazba;
  });
  return min;
}

/* Pásy „jiné" (opláštění po stěnách) s ruční sazbou pod nejnižší ceníkovou.
 * Standardní režim pásy nečte — tam se nehlídá nic. */
function vyjimkyPasyJine(zadani, cenik) {
  const o = zadani && zadani.oplasteni;
  if (!o || o.rezim !== 'poStenach' || !o.steny || typeof o.steny !== 'object') return [];
  const min = vyjimkyMinSazbaOpl(zadani, cenik);
  if (min === null) return [];
  const out = [];
  ['A', 'B', 'C', 'D'].forEach(k => {
    const st = o.steny[k];
    if (!st || typeof st !== 'object' || !Array.isArray(st.pasy)) return;
    st.pasy.forEach((p, i) => {
      if (!p || p.typ !== 'jine') return;
      const sazba = +p.naklad || 0;
      if (sazba < min) out.push({ stena: k, i, nazev: String(p.nazev || ''), naklad: sazba });
    });
  });
  return out;
}

/* Platný ceník pro řadu varianty ze záznamu programu (db.platny) — týmiž
 * kroky, jakými ho aplikace nasadí (progPouzij: migrace lešení, zahraniční
 * odchylky očištěné) a podá variantě (cenikDnesniProVariantu). Server
 * i prohlížeč volají TUTÉŽ funkci nad týmž záznamem, ať se obsahy shodují.
 * null = platný ceník neznáme (nic zveřejněného) — směs se neposuzuje. */
function vyjimkyDnesniZProgramu(platny, data) {
  if (!platny || !platny.cenik || typeof platny.cenik !== 'object') return null;
  const kopie = x => JSON.parse(JSON.stringify(x || {}));
  const d = { cenik: kopie(platny.cenik), proj: { cenik: kopie(platny.cenikProj) } };
  if (typeof cenikMigraceLeseni === 'function') { try { cenikMigraceLeseni(d.cenik); } catch (e) { /* nic */ } }
  if (typeof cenikDnesniProRadu !== 'function') return d;
  const zahr = (typeof cenikZahrOciste === 'function') ? cenikZahrOciste(platny.zahranicni) : platny.zahranicni;
  const rada = (typeof cenikRadaVarianty === 'function') ? cenikRadaVarianty(data) : 'cr';
  let out;
  try { out = cenikDnesniProRadu(d, zahr, rada); } catch (e) { out = d; }
  /* Číslo platné verze — jen pro znění hlášky (vyjimkyObsah, `pod`). */
  if (out && typeof out === 'object') out.verze = platny.verze;
  return out;
}

/* CO SE NA VARIANTĚ SCHVALUJE. `dnesni` = platný ceník pro řadu varianty
 * (vyjimkyDnesniZProgramu), null = neznámý (směs se pak neposuzuje, pásy
 * ano — srovnávají se s ceníkem varianty). `vyrazena` = strana vyřazená
 * P6 ('ock' | 'proj' | ''): její data se neposuzují.
 * Vrací { smes:[{cesta, sekce, popis}], pasy:[…], polozek, pasu, obsah,
 * prazdny }. `obsah` (kanonický JSON) nese hodnoty VARIANTY (ne platného
 * ceníku) — mění se, když obchodník po schválení sáhne na směs nebo sazbu.
 * Rozsah pásu (odM/doM) v něm není — vědomá mez B155 (J. V. 15. 10. 2026). */
function vyjimkyObsah(data, dnesni, vyrazena) {
  const d = data || {};
  const smes = [];
  /* Varianta počítala z PLATNÉ verze (razítko) → rozdíly jsou ruční úpravy
   * cen, ne starší ceník. Jen pro znění hlášky; rozhoduje se jinde. */
  const vR = d.cenikRazitko && typeof d.cenikRazitko === 'object' ? +d.cenikRazitko.verze : NaN;
  const naPlatne = !!dnesni && isFinite(vR) && vR > 0 && vR === +dnesni.verze;
  if (dnesni && typeof cenikRozdily === 'function') {
    cenikRozdily(d, dnesni).forEach(r => {
      if (typeof cenikPatriZakazce === 'function' && cenikPatriZakazce(r.cesta)) return;   // přirážka, DPH
      /* Klíč, který platný ceník vůbec nenese (zveřejněný dřív, než klíč
       * vznikl): hodnotu variantě doplnil import (cenikDoplnKlice — nula,
       * u voleb výchozí text), ne obchodník. Není s čím srovnat. */
      if (r.nova === undefined) return;
      /* CENA DLE NABÍDKY (S13, J. V. 16. 10. 2026): položku, kterou PLATNÝ
       * ceník označil příznakem, zadává obchodník sám podle nabídky — ruční
       * cena není odchylka od ceníku. Příznak jen z platného ceníku
       * (`dnesni`), nikdy z ceníku varianty: ten si zakázka umí podstrčit. */
      if (typeof cenikDleNabidkyJe === 'function' && String(r.cesta).indexOf('C.') === 0
          && cenikDleNabidkyJe(dnesni.cenik, r.cesta)) return;
      const sekce = r.sekce === 'PROJ' ? 'PROJ' : 'OCK';
      if ((sekce === 'PROJ' ? 'proj' : 'ock') === vyrazena) return;
      /* `pod` = číslo varianty pod platným ceníkem — jen pro znění hlášky. */
      const pod = naPlatne && typeof r.stara === 'number' && typeof r.nova === 'number' && r.stara < r.nova;
      smes.push({ cesta: r.cesta, sekce, popis: String(r.popis || r.cesta), hodnota: r.stara, pod });
    });
  }
  smes.sort((a, b) => (a.cesta < b.cesta ? -1 : a.cesta > b.cesta ? 1 : 0));
  const pasy = vyrazena === 'ock' ? [] : vyjimkyPasyJine(d.ock && d.ock.zadani, d.cenik);
  const obsah = (smes.length || pasy.length)
    ? JSON.stringify({ s: smes.map(x => [x.cesta, x.hodnota === undefined ? null : x.hodnota]),
        p: pasy.map(x => [x.stena, x.i, x.nazev, x.naklad]) })
    : '';
  return { smes: smes.map(x => ({ cesta: x.cesta, sekce: x.sekce, popis: x.popis, pod: x.pod })), pasy,
    polozek: smes.length, pasu: pasy.length, obsah, prazdny: !smes.length && !pasy.length };
}

/* Část obsahu, která patří ke stranám `strany` ('ock' | 'proj'; '?' =
 * neznámý typ dokumentu = obě) — pro dotisk dokumentu nové strany do
 * odeslané varianty (B153). Pásy „jiné" patří k OCK. */
function vyjimkyObsahStran(obsah, strany) {
  const o = obsah || {};
  const s = new Set(strany || []);
  const ock = s.has('ock') || s.has('?'), proj = s.has('proj') || s.has('?');
  const smes = (o.smes || []).filter(x => (x.sekce === 'PROJ' ? proj : ock));
  const pasy = ock ? (o.pasy || []) : [];
  return { smes, pasy, polozek: smes.length, pasu: pasy.length, obsah: o.obsah || '',
    prazdny: !smes.length && !pasy.length };
}

/* Potřebuje role schválení? `smi(klic)` = právo z matice zobrazení
 * (server: zobrazeniSmi s rolí relace, prohlížeč: smiZobrazit). */
function vyjimkyPotreba(obsah, smi) {
  const o = obsah || {};
  const s = typeof smi === 'function' ? smi : () => false;
  const ock = (o.smes || []).some(x => x.sekce === 'OCK') && !s('tab.cenik');
  const proj = (o.smes || []).some(x => x.sekce === 'PROJ') && !s('tab.cenikproj');
  const pas = (o.pasy || []).length > 0 && !s('tab.cenik');
  return { potreba: ock || proj || pas, ock, proj, pas };
}

/* Schválení platí jen pro PŘESNĚ týž obsah (B154). Rozhodnutí bez obsahu
 * (staré, jen s otiskem) neplatí. */
function vyjimkaPlati(rec, obsah) {
  return !!(rec && typeof rec === 'object' && rec.stav === VYJ_SCHVALENO
    && obsah && typeof obsah.obsah === 'string' && obsah.obsah !== ''
    && typeof rec.obsah === 'string' && rec.obsah === obsah.obsah);
}

/* Kategorie pro záložku: 'bez' (nic se neliší), 'nepozadano', 'ceka',
 * 'schvaleno', 'zamitnuto'. Rozhodnutí k jinému obsahu = čeká znovu. */
function vyjimkaKategorie(rec, obsah) {
  if (!obsah || obsah.prazdny) return 'bez';
  if (!rec || typeof rec !== 'object' || VYJ_STAVY.indexOf(rec.stav) < 0) return 'nepozadano';
  if (rec.obsah !== obsah.obsah) return 'ceka';
  if (rec.stav === VYJ_SCHVALENO) return 'schvaleno';
  if (rec.stav === VYJ_ZAMITNUTO) return 'zamitnuto';
  return 'ceka';
}

/* Kdo smí rozhodnout: administrátor a role s právem schvalovat slevy. */
function vyjimkaSmiRozhodnout(role, smi) {
  if (role === 'Administrátor') return true;
  return !!(typeof smi === 'function' && smi('sleva.schvalovani'));
}

/* ---------- kroky v prohlížeči (server je stejně razí po svém) ---------- */

function vyjimkaZaklad(obsah, puvodni) {
  const p = puvodni && typeof puvodni === 'object' ? puvodni : {};
  const r = { obsah: (obsah && obsah.obsah) || '', polozek: (obsah && obsah.polozek) || 0, pasu: (obsah && obsah.pasu) || 0 };
  if (p.pozadal) { r.pozadal = String(p.pozadal); r.pozadalKdy = String(p.pozadalKdy || ''); }
  return r;
}
function vyjimkaPozadej(data, obsah, kdo, kdy) {
  if (!data || !obsah || obsah.prazdny) return null;
  data.cenovaVyjimka = Object.assign(vyjimkaZaklad(obsah, null), { stav: VYJ_CEKA,
    pozadal: String(kdo || ''), pozadalKdy: kdy || new Date().toISOString() });
  return data.cenovaVyjimka;
}
function vyjimkaSchval(data, obsah, kdo, kdy) {
  if (!data || !obsah || obsah.prazdny) return null;
  data.cenovaVyjimka = Object.assign(vyjimkaZaklad(obsah, data.cenovaVyjimka), { stav: VYJ_SCHVALENO,
    schvalil: String(kdo || 'nadřízený'), schvalilKdy: kdy || new Date().toISOString() });
  return data.cenovaVyjimka;
}
function vyjimkaZamitni(data, obsah, kdo, kdy, duvod) {
  if (!data || !obsah || obsah.prazdny) return null;
  data.cenovaVyjimka = Object.assign(vyjimkaZaklad(obsah, data.cenovaVyjimka), { stav: VYJ_ZAMITNUTO,
    zamitl: String(kdo || 'nadřízený'), zamitlKdy: kdy || new Date().toISOString(),
    zamitnutoDuvod: String(duvod || '').slice(0, VYJ_DUVOD_MAX) });
  return data.cenovaVyjimka;
}
/* Vzít rozhodnutí zpět — žádost zůstane čekat. */
function vyjimkaVrat(data, obsah) {
  if (!data || !obsah || obsah.prazdny) return null;
  data.cenovaVyjimka = Object.assign(vyjimkaZaklad(obsah, data.cenovaVyjimka), { stav: VYJ_CEKA });
  return data.cenovaVyjimka;
}
/* Srovnání záznamu s tím, co varianta nese teď (záložka Schvalování):
 * nic se neliší → záznam pryč; rozhodnutí k jinému obsahu → čeká znovu
 * (s novým obsahem a počty). Vrací true, když se něco změnilo. */
function vyjimkaPrepocti(data, obsah) {
  if (!data || !obsah) return false;
  const rec = data.cenovaVyjimka;
  if (!rec || typeof rec !== 'object') return false;
  if (obsah.prazdny) { delete data.cenovaVyjimka; return true; }
  if (rec.obsah === obsah.obsah && rec.polozek === obsah.polozek && rec.pasu === obsah.pasu) return false;
  data.cenovaVyjimka = Object.assign(vyjimkaZaklad(obsah, rec), { stav: VYJ_CEKA });
  return true;
}

/* Popis bez částek — do záložky, do zábrany i do odmítnutí serveru. */
function vyjimkyText(obsah) {
  const o = obsah || {};
  const casti = [];
  /* KONKRÉTNÍ ZNĚNÍ (S13, J. V. 16. 10. 2026): varianta, která počítala
   * z PLATNÉ verze (razítko) a má položku POD ceníkem, dostane jmenovitou
   * větu („Ventilátor (ext): cena pod ceníkem") — to je ruční úprava ceny.
   * Skutečná směs (starší verze, přepočet jen vybraných položek, vyšší
   * nebo textové hodnoty) si nechává znění směsi. Obsah výjimky (a tím
   * platnost schválení) se nemění. */
  const pod = (o.smes || []).filter(x => x.pod);
  const smes = (o.smes || []).filter(x => !x.pod);
  if (pod.length) {
    const jm = pod.slice(0, 3).map(x => String(x.popis || x.cesta) + ': cena pod ceníkem');
    if (pod.length > 3) jm.push('a ' + (pod.length - 3) + ' další ' + (pod.length - 3 === 1 ? 'položka' : 'položky') + ' pod ceníkem');
    casti.push(jm.join('; '));
  }
  const n = (o.smes ? smes.length : (o.polozek || 0));
  if (n) {
    const ock = smes.filter(x => x.sekce === 'OCK').length, proj = o.smes ? n - ock : 0;
    casti.push('ceník varianty je směs platného ceníku a starších cen (' + n
      + (n === 1 ? ' položka' : (n < 5 ? ' položky' : ' položek'))
      + (ock && proj ? ': OCK ' + ock + ', PROJ ' + proj : (proj ? ' PROJ' : ' OCK')) + ')');
  }
  if (o.pasu) casti.push('ruční sazba pásu opláštění „jiné" je nižší než ceníková ('
    + o.pasu + (o.pasu === 1 ? ' pás' : (o.pasu < 5 ? ' pásy' : ' pásů')) + ')');
  return casti.join(' a ');
}

/* ---------- serverová pojistka (vzor schvalovaniServerKontrola, B2) ---------- */

function vyjimkySmiF(role, matice) {
  return (k) => typeof zobrazeniSmi === 'function' && !!zobrazeniSmi(role, k, matice || null);
}
/* Klíč LIDSKÉHO rozhodnutí — bez času (razí ho server, B105). */
function vyjimkaRozhodnutiKlic(rec) {
  if (!rec || typeof rec !== 'object') return '';
  if (rec.stav !== VYJ_SCHVALENO && rec.stav !== VYJ_ZAMITNUTO) return '';
  return JSON.stringify({ s: rec.stav, o: String(rec.obsah || ''), a: String(rec.schvalil || ''),
    z: String(rec.zamitl || ''), d: String(rec.zamitnutoDuvod || '') });
}
function vyjimkaJenPole(rec) {
  const out = {};
  VYJ_POLE.forEach(k => { if (rec && rec[k] !== undefined) out[k] = rec[k]; });
  return out;
}
/* Čas z prohlížeče se přijme jen blízko času serveru (B105). */
function vyjimkaKdy(kdy, ted) {
  return (typeof schvalovaniKdyBlizko === 'function' && schvalovaniKdyBlizko(kdy, ted)) ? kdy : ted;
}

/* Kontrola rozhodnutí o cenové výjimce při uložení. `stara` = uložená verze
 * po téže migraci (staraPorovnani), `ctx` = { matice, program,
 * zamcenaDriv(v) }. Varianta zamčená už v uložené verzi se neposuzuje
 * (doklad — data hlídá kontrola zámku). Vrací { ok:true } nebo
 * { ok:false, status, chyba }; v `nova` doplní razítka. */
function vyjimkyServerKontrola(stara, nova, relace, ctx) {
  relace = relace || {}; ctx = ctx || {};
  const role = String(relace.role || '');
  const smi = vyjimkySmiF(role, ctx.matice);
  const smiRozh = vyjimkaSmiRozhodnout(role, smi);
  const jmeno = (relace.jmeno || relace.email || '') + (role ? ' (' + role + ')' : '');
  const ted = new Date().toISOString();
  const platny = ctx.program && ctx.program.platny ? ctx.program.platny : null;
  const vyrazena = (typeof zakazkaVyrazenaStrana === 'function') ? (zakazkaVyrazenaStrana(nova) || '') : '';
  const stare = (stara && Array.isArray(stara.varianty)) ? stara.varianty : [];
  for (const v of ((nova && Array.isArray(nova.varianty)) ? nova.varianty : [])) {
    if (!v || !v.data || typeof v.data !== 'object') continue;
    if (typeof ctx.zamcenaDriv === 'function' && ctx.zamcenaDriv(v)) continue;
    const sv = stare.find(x => x && x.id === v.id);
    const srec = sv && sv.data && sv.data.cenovaVyjimka && typeof sv.data.cenovaVyjimka === 'object' ? sv.data.cenovaVyjimka : null;
    let rec = v.data.cenovaVyjimka;
    if (rec !== undefined && rec !== null
        && (typeof rec !== 'object' || Array.isArray(rec) || VYJ_STAVY.indexOf(rec.stav) < 0))
      return { ok: false, status: 400, chyba: 'Neznámý stav cenové výjimky varianty „' + String(v.nazev || v.id).slice(0, 60) + '".' };
    const obsah = vyjimkyObsah(v.data, vyjimkyDnesniZProgramu(platny, v.data), vyrazena);
    const kN = vyjimkaRozhodnutiKlic(rec), kS = vyjimkaRozhodnutiKlic(srec);
    /* Totéž rozhodnutí, jaké už v databázi je: celé z uložené verze. */
    if (kN && kN === kS) { v.data.cenovaVyjimka = vyjimkaJenPole(srec); continue; }
    /* Nové nebo změněné rozhodnutí: jen s právem; razí server. */
    if (kN) {
      if (!smiRozh)
        return { ok: false, status: 403, chyba: 'Cenovou výjimku varianty smí schválit nebo zamítnout jen nadřízený '
          + '(administrátor nebo role s právem „Schvalování slevy nad strop role"); role ' + (role || '?') + ' na to právo nemá.' };
      /* Žadatel jen z uložené verze — z těla požadavku se nebere. */
      const n = Object.assign(vyjimkaZaklad(obsah, srec), { stav: rec.stav });
      if (rec.stav === VYJ_SCHVALENO) {
        n.schvalil = jmeno; n.schvalilEmail = String(relace.email || ''); n.schvalilKdy = vyjimkaKdy(rec.schvalilKdy, ted);
      } else {
        n.zamitl = jmeno; n.zamitlEmail = String(relace.email || ''); n.zamitlKdy = vyjimkaKdy(rec.zamitlKdy, ted);
        n.zamitnutoDuvod = String(rec.zamitnutoDuvod || '').slice(0, VYJ_DUVOD_MAX);
      }
      v.data.cenovaVyjimka = n;
      continue;
    }
    /* Uložené rozhodnutí, které pořád platí (obsah sedí), bez práva nezmizí
     * ani se nevrátí do „čeká" (B101) — vrací se uložené. */
    if (kS && !smiRozh && srec.obsah === obsah.obsah) { v.data.cenovaVyjimka = vyjimkaJenPole(srec); continue; }
    if (rec === undefined || rec === null) { delete v.data.cenovaVyjimka; continue; }
    /* Žádost („čeká"): obsah a počty z dat, žadatel z relace (u trvající
     * žádosti z uložené verze). Bez rozdílu proti ceníku není o čem žádat. */
    if (obsah.prazdny) { delete v.data.cenovaVyjimka; continue; }
    const trva = srec && srec.stav === VYJ_CEKA && srec.pozadal;
    const z = Object.assign(vyjimkaZaklad(obsah, null), { stav: VYJ_CEKA,
      pozadal: trva ? String(srec.pozadal) : jmeno,
      pozadalKdy: trva ? String(srec.pozadalKdy || '') : vyjimkaKdy(rec.pozadalKdy, ted) });
    v.data.cenovaVyjimka = z;
  }
  return { ok: true };
}

/* NOVÝ ZÁMEK: varianta, jejíž role výjimku potřebuje, smí odejít jen
 * s platným schválením. Vrací větu důvodu, nebo ''.
 * DOTISK DOKUMENTU NOVÉ STRANY do odeslané varianty (B153, audit 15. 10.
 * 2026) se posuzuje jako nový zámek té strany: `ctx.strany` = strany
 * dotištěných dokumentů — potřeba se zjišťuje jen z jejich části obsahu
 * (směs OCK u odeslané PROJ nové PROJ nezastaví), schválení musí sedět na
 * celý obsah (jak se schvaluje). Strana vyřazená při zámku (jenProj) se
 * po vypnutí příznaku posoudí tady. `ctx.smi` (prohlížeč) nahradí matici. */
function vyjimkyZamekProblem(zak, v, relace, ctx) {
  relace = relace || {}; ctx = ctx || {};
  const role = String(relace.role || '');
  if (role === 'Administrátor') return '';
  const platny = ctx.program && ctx.program.platny ? ctx.program.platny : null;
  const vyrazena = (typeof zakazkaVyrazenaStrana === 'function') ? (zakazkaVyrazenaStrana(zak) || '') : '';
  const d = (v && v.data) || {};
  const obsah = vyjimkyObsah(d, vyjimkyDnesniZProgramu(platny, d), vyrazena);
  const cast = Array.isArray(ctx.strany) ? vyjimkyObsahStran(obsah, ctx.strany) : obsah;
  const smi = typeof ctx.smi === 'function' ? ctx.smi : vyjimkySmiF(role, ctx.matice);
  if (!vyjimkyPotreba(cast, smi).potreba) return '';
  if (vyjimkaPlati(d.cenovaVyjimka, obsah)) return '';
  const zamitnuto = d.cenovaVyjimka && d.cenovaVyjimka.stav === VYJ_ZAMITNUTO && d.cenovaVyjimka.obsah === obsah.obsah;
  return vyjimkyText(cast) + ' — odeslat ji smí jen se schválením nadřízeného'
    + (zamitnuto ? ' (výjimka byla zamítnuta)' : '') + '. Požádejte o schválení v záložce Schvalování, '
    + 'nebo přepočítejte variantu podle platného ceníku; rozpracovanou zakázku lze dál ukládat';
}

/* Záznam do sdíleného rejstříku — jmenovitě vybraná pole, bez obsahu. */
function vyjimkaRejstrik(rec) {
  const out = {};
  if (!rec || typeof rec !== 'object') return out;
  VYJ_REJSTRIK_POLE.forEach(k => {
    if (rec[k] === undefined) return;
    out[k] = (k === 'polozek' || k === 'pasu') ? (+rec[k] || 0) : String(rec[k]);
  });
  return out;
}

if (typeof module !== 'undefined')
  module.exports = { VYJ_CEKA, VYJ_SCHVALENO, VYJ_ZAMITNUTO, VYJ_STAVY, VYJ_POLE, VYJ_REJSTRIK_POLE,
                     vyjimkyMinSazbaOpl, vyjimkyPasyJine, vyjimkyDnesniZProgramu, vyjimkyObsah, vyjimkyObsahStran,
                     vyjimkyPotreba, vyjimkaPlati, vyjimkaKategorie, vyjimkaSmiRozhodnout,
                     vyjimkaPozadej, vyjimkaSchval, vyjimkaZamitni, vyjimkaVrat, vyjimkaPrepocti, vyjimkyText,
                     vyjimkaRozhodnutiKlic, vyjimkyServerKontrola, vyjimkyZamekProblem, vyjimkaRejstrik };
