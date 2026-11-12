/* ===== PROTOTYP „VÍC ZÁKAZNÍKŮ NA JEDNÉ ZAKÁZCE" (jen podklad k rozhodnutí J. V., NENÍ součást aplikace) =====
 * Vkládá se za sestavenou aplikaci (sestav.mjs). Nic neposílá — Pipedrive je jen napodobený
 * v paměti stránky, data i ceny jsou smyšlené (zkušební ceník z testů, kulatá čísla).
 * Návrh: podklady/NAVRH_VICE_ZAKAZNIKU.md.
 *
 * Do skutečné aplikace sahá jen takto:
 *   · zakládá zakázku a varianty jejími vlastními funkcemi (novaZakazka, klonujVariantu,
 *     zamkniVariantu, prodNastav, prodRidiciSrovnej, nastavRidici) a volá render(),
 *   · hlavičku zakázky (Zákazník, IČO, kontakt) přepisuje údaji ZVOLENÉHO zákazníka — tím
 *     skutečný živý náhled nabídky v kartě „Cenová nabídka (CN)" ukazuje přesně to, co by
 *     dostal zvolený zákazník (v ostré verzi to bude „pohled zákazníka", viz návrh § 6),
 *   · k číslu nabídky přidává písmeno zákazníka (obal kolem variantaCislo / cisloSVariantou),
 *   · vkládá kartu „Zákazníci zakázky" a přepínač zákazníků do hlavičky (po každém překreslení).
 */
(function () {
  'use strict';
  const FIRMY = {
    a: { kratce: 'ALFA', nazev: 'ALFA stavební s.r.o. (smyšlené)', sidlo: 'Vzorová 1, 110 00 Vzorov', ico: '99999994', kontakt: 'nákup ALFA (smyšlené)' },
    b: { kratce: 'BETA', nazev: 'BETA Development a.s. (smyšlené)', sidlo: 'Příkladná 22, 602 00 Vzorkov', ico: '88888886', kontakt: 'příprava staveb BETA (smyšlené)' },
    c: { kratce: 'GAMA', nazev: 'GAMA invest s.r.o. (smyšlené)', sidlo: 'Ukázková 5, 301 00 Vzorec', ico: '77777778', kontakt: 'investice GAMA (smyšlené)' },
  };
  const PISMENA = { a: '', b: 'B', c: 'C' };
  const SCENARE = {
    stejna: { nazev: 'stejná varianta pro víc zákazníků', kroky: [['pridej:b', '2. Přidat zákazníka BETA'], ['odesli:a', '3. Odeslat nabídku ALFA'], ['odesli:b', '4. Odeslat tutéž nabídku BETA']] },
    vlastni: { nazev: 'vlastní varianta zákazníka', kroky: [['vlastni:b', '2. Vlastní varianta pro BETA'], ['uprav:b', '3. Upravit ji (zdvih 12 → 15 m)'], ['odesli:b', '4. Odeslat nabídku BETA']] },
    prodej: { nazev: 'prodej druhému zákazníkovi', kroky: [['prodej:b', '2. Prodáno → BETA'], ['prodejAno', '3. Potvrdit prodej'], ['org', '4. Změnit organizaci dealu'], ['orgAno', '5. Potvrdit zápis']] },
  };
  const ROLE = { autor: 'autor zakázky (obchodník)', jiny: 'jiný obchodník', admin: 'administrátor' };
  const ZNACKY = { pridano: 'přidáno', zmeneno: 'změněno', smazano: 'smazáno', beze: 'beze změny' };
  const DEAL_ID = '4321';
  const S = { scenar: 'stejna', role: 'autor', otevreno: true, hraje: null, blik: false, nahled: '' };
  let P, OBS = null, PK = null, KRESLI = false;
  const puvodni = { variantaCislo: window.variantaCislo, cisloSVariantou: window.cisloSVariantou };

  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cas = () => new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dnes = () => new Date().toLocaleDateString('cs-CZ');
  const kc = (n) => (typeof n === 'number' && isFinite(n)) ? Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Kč' : '—';
  const zapis = (kdo, co) => P.protokol.push({ kdy: cas(), kdo, co });
  const Zk = (id) => P.zak.find((z) => z.id === id);
  const Va = (id) => (ZAK.varianty || []).find((v) => v.id === id);
  const ridiciZ = () => Zk(P.ridici);
  const vybranyZ = () => Zk(P.vybrany) || ridiciZ();
  const smiRidit = () => S.role === 'autor' || S.role === 'admin';
  const jekly = () => (typeof JEKLY !== 'undefined' ? JEKLY : undefined);
  const cenaV = (v) => { try { const r = vypocetZ(v, jekly()); return cenaNabidkyOck(r, v.data.sleva, v.data.zaokr).cena; } catch (e) { return NaN; } };
  const sdili = (z) => P.zak.filter((x) => x.varianta === z.varianta);
  const prodanoZ = () => P.zak.find((z) => z.prodano);

  /* Číslo nabídky zákazníka = číslo varianty (jako dnes: …9940, …9940.2) + písmeno zákazníka (-B, -C).
   * První zákazník písmeno nemá — jeho čísla jsou stejná jako dnes. */
  const cisloZ = (z, v) => String(puvodni.variantaCislo(ZAK, v || Va(z.varianta)) || '') + (z.pismeno ? '-' + z.pismeno : '');
  function obalCisel() {
    const pis = (zak, v) => { const z = P && vybranyZ(); return (zak === ZAK && z && z.pismeno && v && v.id === z.varianta) ? '-' + z.pismeno : ''; };
    window.variantaCislo = function (zak, v) { return puvodni.variantaCislo(zak, v) + pis(zak, v); };
    if (typeof puvodni.cisloSVariantou === 'function')
      window.cisloSVariantou = function (zak, v, zaklad) { const c = puvodni.cisloSVariantou(zak, v, zaklad); return c ? c + pis(zak, v) : c; };
  }

  /* Hlavička zakázky nese údaje ZVOLENÉHO zákazníka (jen v prototypu; v ostré verzi § 2 návrhu). */
  function doHlavicky() {
    const z = vybranyZ();
    ZAK.objednatel = z.nazev; ZAK.adresaObjednatele = z.sidlo; ZAK.ico = z.ico; ZAK.kontakt = z.kontakt;
  }
  function zHlavicky() {
    const z = P && vybranyZ(); if (!z) return;
    z.nazev = String(ZAK.objednatel || ''); z.sidlo = String(ZAK.adresaObjednatele || ''); z.ico = String(ZAK.ico || ''); z.kontakt = String(ZAK.kontakt || '');
  }
  function otevri(id) {
    P.vybrany = id; S.nahled = id;
    doHlavicky();
    ZAK.aktivni = Zk(id).varianta;
    if (typeof syncVarianta === 'function') syncVarianta();
  }

  /* ----- stav nabídky zákazníka ----- */
  const odeslanoTed = (z) => z.odeslano[z.varianta] || '';
  function stavText(z) {
    if (z.prodano) return 'prodáno ' + z.prodano;
    if (odeslanoTed(z)) return 'odeslána ' + odeslanoTed(z);
    return z.platna ? 'rozpracovaná (platí ' + z.platna.cislo + ')' : 'rozpracovaná';
  }
  const variantaText = (z) => { const v = Va(z.varianta); const s = sdili(z); return (v ? v.nazev : '?') + (s.length > 1 ? ' · sdílená (' + s.length + ')' : (P.zak.length > 1 ? ' · vlastní' : '')); };
  const radekText = (z) => cisloZ(z) + ' · ' + variantaText(z) + ' · ' + stavText(z) + ' · ' + kc(cenaV(Va(z.varianta)));

  /* ----- Pipedrive: co deal ponese ----- */
  function dalsiText() {
    const ost = P.zak.filter((z) => z.id !== P.ridici);
    if (!ost.length) return '';
    const prodano = !!prodanoZ();
    return 'Další zákazníci na zakázce (zapsal Kalkulátor ' + dnes() + '):\n' + ost.map((z) => {
      const pl = z.platna;
      const nab = pl ? 'CN ' + pl.cislo + ' z ' + pl.datum + ', ' + kc(pl.cena) + ' bez DPH' : 'nabídka zatím neodeslána (' + cisloZ(z) + ')';
      const nova = pl && pl.vid !== z.varianta ? ' · připravuje se nová ' + cisloZ(z) : '';
      return '• ' + z.nazev + ' — ' + nab + nova + (prodano ? ' — neprodáno' : '');
    }).join('\n');
  }
  function pd() {
    const rz = ridiciZ(), rv = Va(rz.varianta);
    return { org: P.deal.org, hodnota: kc(cenaV(rv)).replace('Kč', 'CZK'), cn: cisloZ(rz),
      faze: prodanoZ() ? 'Vyhrané k podpisu SoD' : 'beze změny (fázi vede Pipedrive)', dalsi: dalsiText() };
  }
  const orgNesedi = () => P.deal.org !== ridiciZ().nazev;

  /* Snímek všeho, co se může změnit — z něj se kreslí „před → po". */
  function snimek() {
    const rz = ridiciZ(), rv = Va(rz.varianta), d = pd();
    const s = { rz: rz.nazev, rv: (rv ? rv.nazev : '') + ' (' + String(puvodni.variantaCislo(ZAK, rv) || '') + ')',
      'pd.org': d.org, 'pd.hodnota': d.hodnota, 'pd.cn': d.cn, 'pd.faze': d.faze, 'pd.dalsi': d.dalsi, protokol: P.protokol.length,
      rejstrik: rejstrikText() };
    P.zak.forEach((z) => { s['z:' + z.id] = radekText(z); });
    return s;
  }
  function znacka(k) {
    const pred = P.pred[k], po = snimek()[k];
    if (pred === po) return '';
    return !pred ? 'pridano' : (!po ? 'smazano' : 'zmeneno');
  }
  const stitek = (z) => z ? '<span class="vzp-zn vzp-zn-' + z + '">' + ZNACKY[z] + '</span>' : '';
  const rejstrikText = () => String(ZAK.cislo) + ' · ' + String(ZAK.nazevAkce) + ' · ' + ridiciZ().nazev + (P.zak.length > 1 ? ' · štítek „' + P.zak.length + ' zákazníci"' : '');

  /* ----- akce (odpovídají tlačítkům budoucí funkce) ----- */
  function novyZ(id, varianta) { return Object.assign({ id, pismeno: PISMENA[id], varianta, odeslano: {}, platna: null, prodano: '' }, FIRMY[id]); }
  function pridej(id, vlastniVar) {
    const rz = ridiciZ();
    P.zak.push(novyZ(id, rz.varianta));
    zapis(ROLE[S.role], 'přidal zákazníka ' + FIRMY[id].kratce + ' (písmeno ' + PISMENA[id] + ') — nabídka ' + cisloZ(Zk(id)) + ', stejná varianta jako ' + rz.kratce);
    if (vlastniVar) vlastni(id); else otevri(id);
  }
  function vlastni(id) {
    const z = Zk(id), stara = Va(z.varianta);
    const k = klonujVariantu(ZAK, stara.id);
    if (!k) return;
    if (!ZAK.varianty.includes(k)) ZAK.varianty.push(k);
    k.zakaznik = z.kratce;
    z.varianta = k.id;
    zapis(ROLE[S.role], 'založil vlastní variantu zákazníka ' + z.kratce + ': ' + k.nazev + ' (kopie „' + stara.nazev + '"), nové číslo ' + cisloZ(z)
      + (z.platna ? '; dosud platí odeslaná ' + z.platna.cislo : ''));
    otevri(id);
  }
  function uprav(id) {
    otevri(id);
    if (typeof Z !== 'undefined' && Z) Z.zdvih = 15;
    zapis(ROLE[S.role], 'upravil variantu zákazníka ' + Zk(id).kratce + ' (zdvih 12 → 15 m) — ostatních zákazníků se změna netýká');
  }
  function odesli(id) {
    const z = Zk(id), v = Va(z.varianta);
    otevri(id);
    const bylaZamcena = !!(v.zamek && v.zamek.zamceno);
    let vysledek = null;
    try { if (typeof zamekVysledekSpocti === 'function') vysledek = zamekVysledekSpocti(v, jekly(), 'prototyp'); } catch (e) { vysledek = null; }
    const zam = zamkniVariantu(v, { typ: 'nabidka', kdo: ROLE[S.role], cislo: String(puvodni.variantaCislo(ZAK, v) || ''), vysledek });
    if (zam && Array.isArray(zam.tisky) && zam.tisky.length) zam.tisky[zam.tisky.length - 1].zakaznik = z.id;   // razítko: komu odešla
    z.odeslano[v.id] = dnes();
    z.platna = { vid: v.id, cislo: cisloZ(z, v), datum: dnes(), cena: cenaV(v) };
    zapis(ROLE[S.role], 'vytiskl cenovou nabídku ' + cisloZ(z, v) + ' pro ' + z.kratce + (bylaZamcena ? ' — další tisk už zamčené varianty „' + v.nazev + '" (obsah a cena beze změny, jiný adresát)' : ' — varianta „' + v.nazev + '" se zamkla'));
  }
  function ridici(id) {
    const z = Zk(id), stary = ridiciZ();
    P.ridici = id;
    nastavRidici(ZAK, z.varianta);
    zapis(ROLE[S.role], 'změnil řídícího zákazníka: ' + stary.kratce + ' → ' + z.kratce + '; řídící varianta je teď „' + Va(z.varianta).nazev + '"');
    otevri(id);
  }
  function prodejAno() {
    const id = P.potvrzeni.id, z = Zk(id), v = Va(z.varianta), stary = ridiciZ();
    P.potvrzeni = null;
    const chyba = prodNastav(ZAK, v, '', { kdo: ROLE[S.role] });
    if (chyba) { P.chyba = chyba; return; }
    prodRidiciSrovnej(ZAK);
    P.ridici = id; z.prodano = dnes();
    zapis(ROLE[S.role], 'PRODÁNO zákazníkovi ' + z.kratce + ' (nabídka ' + cisloZ(z) + '); řídící zákazník ' + stary.kratce + ' → ' + z.kratce
      + ', řídící varianta „' + v.nazev + '" (#563); do dealu ' + DEAL_ID + ' jdou data této varianty, ' + P.zak.filter((x) => x.id !== id).map((x) => x.kratce).join(', ') + ' zůstává jako textová zmínka');
    otevri(id);
  }
  function orgAno() {
    const stara = P.deal.org;
    P.potvrzeni = null;
    P.deal.org = ridiciZ().nazev;
    zapis(ROLE[S.role], 'změnil organizaci dealu ' + DEAL_ID + ' v Pipedrive: ' + stara + ' → ' + P.deal.org + ' (po potvrzení)');
  }
  function odeber(id) {
    const z = Zk(id);
    P.zak = P.zak.filter((x) => x.id !== id);
    zapis(ROLE[S.role], 'odebral zákazníka ' + z.kratce + ' (žádná nabídka mu neodešla)');
    otevri(P.ridici);
  }

  /* Smí se krok provést? (zhasíná tlačítka v liště i v kartě) */
  function lze(a) {
    const [co, id] = a.split(':'), z = id ? Zk(id) : null, v = z ? Va(z.varianta) : null;
    const zamcena = !!(v && v.zamek && v.zamek.zamceno), prodano = !!prodanoZ();
    if (co === 'pridej') return !z && !prodano;
    if (co === 'odesli') return !!z && !odeslanoTed(z) && !prodano;
    if (co === 'vlastni') return !!z && !prodano && (sdili(z).length > 1 || zamcena);
    if (co === 'uprav') return !!z && !zamcena && sdili(z).length === 1 && Z.zdvih !== 15;
    if (co === 'prodej') return !!z && !!odeslanoTed(z) && !prodano && !P.potvrzeni;
    if (co === 'prodejAno') return !!(P.potvrzeni && P.potvrzeni.typ === 'prodej');
    if (co === 'org') return orgNesedi() && smiRidit() && !P.potvrzeni;
    if (co === 'orgAno') return !!(P.potvrzeni && P.potvrzeni.typ === 'org');
    if (co === 'ridici') return !!z && z.id !== P.ridici && !prodano && smiRidit();
    if (co === 'odeber') return !!z && z.id !== P.ridici && !Object.keys(z.odeslano).length;
    return true;
  }
  const dalsiKrok = () => (SCENARE[S.scenar].kroky.find(([a], i) => i >= P.i && lze(a)) || [''])[0];

  function vychozi() {
    P = { zak: [], ridici: 'a', vybrany: 'a', deal: { org: FIRMY.a.nazev }, protokol: [], potvrzeni: null, formular: false, chyba: '', krok: 'vychozi', i: 0, pred: null };
    ZAK = novaZakazka();
    if (typeof syncVarianta === 'function') syncVarianta();
    Object.assign(Z, { sirka: 1.6, hloubka: 2.1, zdvih: 12, prejezd: 2.7, prohluben: 1.05 });
    if (typeof OCK !== 'undefined' && OCK) OCK.fixes = true;
    ZAK.cislo = '2026 - OPR - CN - 9940'; ZAK.nazevAkce = 'Bytový dům Smyšlená — výtah'; ZAK.adresa = 'Smyšlená 7, Vzorov';
    ZAK.pdDealId = DEAL_ID; ZAK.pdStav = { status: 'open', nacteno: new Date().toISOString() };
    P.zak.push(novyZ('a', ZAK.varianty[0].id));
    doHlavicky();
    const role = S.role; S.role = 'autor';
    if (S.scenar !== 'stejna') { pridej('b', false); odesli('a'); }
    if (S.scenar === 'vlastni') odesli('b');
    if (S.scenar === 'prodej') { vlastni('b'); uprav('b'); odesli('b'); }
    S.role = role;
    otevri(S.scenar === 'stejna' ? 'a' : 'b');
    S.nahled = P.vybrany;
    P.pred = snimek();
  }

  /* ----- kreslení: karta v aplikaci ----- */
  function kartaHtml() {
    const ro = P.zak.map((z) => {
      const v = Va(z.varianta), zn = P.krok === 'vychozi' ? '' : znacka('z:' + z.id), vyb = z.id === P.vybrany;
      const volby = ZAK.varianty.map((x) => '<option value="' + esc(x.id) + '"' + (x.id === z.varianta ? ' selected' : '') + '>' + esc(x.nazev) + '</option>').join('');
      const tl = (a, text, tit, hl) => '<button type="button" class="mini' + (hl ? ' vzp-hl' : '') + (dalsiKrok() === a && !S.hraje ? ' vzp-dalsi' : '') + '" data-vzp="' + a + '" title="' + esc(tit) + '"' + (lze(a) ? '' : ' disabled') + '>' + text + '</button>';
      const stav = z.prodano ? '<span class="pill vzp-prodano">✔ prodáno ' + esc(z.prodano) + '</span>'
        : (odeslanoTed(z) ? '<span class="zamek-stav zamceno">🔒 odeslána ' + esc(odeslanoTed(z)) + '</span>'
          : 'rozpracovaná' + (z.platna ? '<div class="note">platí odeslaná ' + esc(z.platna.cislo) + '</div>' : ''));
      const sd = sdili(z);
      return '<tr class="' + (vyb ? 'aktivni ' : '') + (zn ? 'vzp-r-' + zn + (S.blik ? ' vzp-blik' : '') : '') + '" data-z="' + z.id + '">'
        + '<td data-l="Řídící"><input type="radio" name="vzpRidici"' + (z.id === P.ridici ? ' checked' : '') + (lze('ridici:' + z.id) || z.id === P.ridici ? '' : ' disabled')
        + ' data-vzp-ridici="' + z.id + '" title="' + (smiRidit() ? 'řídící zákazník — jeho varianta je řídící a její data nese deal v Pipedrive' : 'řídícího zákazníka mění jen autor zakázky a administrátor') + '"></td>'
        + '<td data-l="Zákazník"><button type="button" class="vzp-jmeno" data-vzp="vyber:' + z.id + '" title="otevřít zákazníka v hlavičce">' + esc(z.nazev) + '</button>'
        + '<div class="note">IČO ' + esc(z.ico) + (z.id === P.ridici ? ' · <b>řídící zákazník</b>' : '') + (vyb ? ' · otevřený v hlavičce' : '') + '</div></td>'
        + '<td data-l="Číslo nabídky" class="vzp-cislo"><b>' + esc(cisloZ(z)) + '</b></td>'
        + '<td data-l="Varianta nabídky"><select data-vzp-var="' + z.id + '"' + (odeslanoTed(z) && z.prodano ? ' disabled' : '') + ' title="která varianta je nabídkou tohoto zákazníka">' + volby + '</select>'
        + '<div class="note">' + (sd.length > 1 ? 'sdílená: ' + esc(sd.map((x) => x.kratce).join(' + ')) : (P.zak.length > 1 ? 'vlastní varianta' : 'jediná varianta')) + '</div></td>'
        + '<td data-l="Stav">' + stav + '</td>'
        + '<td data-l="Cena bez DPH" class="vzp-cena">' + esc(kc(cenaV(v))) + '</td>'
        + '</tr><tr class="vzp-akce-r' + (vyb ? ' aktivni' : '') + (zn ? ' vzp-r-' + zn : '') + '"><td></td><td colspan="5" class="vzp-akce">' + tl('nahled:' + z.id, '👁 Náhled', 'náhled nabídky pro tohoto zákazníka')
        + tl('odesli:' + z.id, '🖨 Tisk CN', 'vytisknout (odeslat) cenovou nabídku tomuto zákazníkovi — varianta se zamkne')
        + tl('vlastni:' + z.id, '⧉ Vlastní varianta', 'založit kopii varianty jen pro tohoto zákazníka')
        + tl('prodej:' + z.id, '✔ Prodáno', 'zakázku získal tento zákazník')
        + (z.id !== P.ridici ? tl('odeber:' + z.id, '✕', 'odebrat zákazníka (jen dokud mu nic neodešlo)') : '') + '</td></tr>'
        + (zn ? '<tr class="vzp-pp vzp-pp-' + zn + '"><td></td><td colspan="5">' + stitek(zn) + ' ' + (zn === 'pridano' ? '<b>' + esc(snimek()['z:' + z.id]) + '</b>'
          : '<s>' + esc(P.pred['z:' + z.id]) + '</s> → <b>' + esc(snimek()['z:' + z.id]) + '</b>') + '</td></tr>' : '');
    }).join('');
    const volne = Object.keys(FIRMY).filter((k) => !Zk(k));
    const form = P.formular && volne.length ? '<div class="vzp-form"><b>Nový zákazník na zakázce</b>'
      + '<div class="row"><label>Zákazník</label><input type="text" value="' + esc(FIRMY[volne[0]].nazev) + '" readonly></div>'
      + '<div class="row"><label>IČO zákazníka</label><input type="text" value="' + esc(FIRMY[volne[0]].ico) + '" readonly></div>'
      + '<div class="row"><label>Nabídka</label><span class="vzp-volba"><label><input type="radio" name="vzpNova" value="stejna" checked> stejná varianta jako ' + esc(ridiciZ().kratce) + ' („' + esc(Va(ridiciZ().varianta).nazev) + '")</label>'
      + '<label><input type="radio" name="vzpNova" value="vlastni"> vlastní varianta (kopie)</label></span></div>'
      + '<div class="note">V ostré verzi: našeptávač z databáze zákazníků a „Najít firmu v ARES" jako v hlavičce. Zákazník dostane písmeno <b>' + esc(PISMENA[volne[0]]) + '</b> — jeho nabídky ponesou číslo …-' + esc(PISMENA[volne[0]]) + '.</div>'
      + '<button type="button" class="vzp-modre" data-vzp="pridejForm:' + volne[0] + '">Přidat zákazníka</button> <button type="button" class="mini" data-vzp="formNe">Zrušit</button></div>' : '';
    let potv = '';
    if (P.potvrzeni && P.potvrzeni.typ === 'prodej') {
      const z = Zk(P.potvrzeni.id), v = Va(z.varianta), rz = ridiciZ(), rv = Va(rz.varianta);
      const r = (n, a, b) => '<div class="vzp-pr"><span>' + esc(n) + '</span><span>' + (a === b ? esc(b) + ' <i>beze změny</i>' : '<s>' + esc(a) + '</s> → <b>' + esc(b) + '</b>') + '</span></div>';
      potv = '<div class="vzp-potvrzeni"><b>Prodat zakázku zákazníkovi ' + esc(z.nazev) + '?</b>'
        + r('Řídící zákazník', rz.nazev, z.nazev) + r('Řídící varianta (prodaná = řídící)', rv.nazev, v.nazev)
        + r('Deal ' + DEAL_ID + ': hodnota', kc(cenaV(rv)), kc(cenaV(v))) + r('Deal ' + DEAL_ID + ': číslo nabídky', cisloZ(rz), cisloZ(z))
        + r('Deal ' + DEAL_ID + ': krycí list', 'varianta „' + rv.nazev + '"', 'varianta „' + v.nazev + '"')
        + r('Deal ' + DEAL_ID + ': další zákazníci (text)', P.zak.filter((x) => x.id !== P.ridici).map((x) => x.kratce).join(', ') || '—', P.zak.filter((x) => x.id !== z.id).map((x) => x.kratce + ' — neprodáno').join(', ') || '—')
        + '<div class="vzp-pt"><button type="button" class="vzp-zelene' + (dalsiKrok() === 'prodejAno' ? ' vzp-dalsi' : '') + '" data-vzp="prodejAno">Prodáno — potvrdit</button><button type="button" class="mini" data-vzp="potvNe">Zrušit</button>'
        + '<span>Nabídky ostatních zákazníků zůstávají zamčené a dohledatelné; organizaci dealu v Pipedrive aplikace sama nemění.</span></div></div>';
    }
    if (P.potvrzeni && P.potvrzeni.typ === 'org')
      potv = '<div class="vzp-potvrzeni"><b>Změnit organizaci dealu ' + DEAL_ID + ' v Pipedrive?</b>'
        + '<div class="vzp-pr"><span>Organizace dealu</span><span><s>' + esc(P.deal.org) + '</s> → <b>' + esc(ridiciZ().nazev) + '</b> (IČO ' + esc(ridiciZ().ico) + ')</span></div>'
        + '<div class="vzp-pt"><button type="button" class="vzp-zelene' + (dalsiKrok() === 'orgAno' ? ' vzp-dalsi' : '') + '" data-vzp="orgAno">Zapsat do Pipedrive</button><button type="button" class="mini" data-vzp="potvNe">Nezapisovat</button>'
        + '<span>Deal se jen přepojí na organizaci s tímto IČO (když v Pipedrive není, založí se podle ARES). Původní organizace se nemění ani nemaže.</span></div></div>';
    const upoz = orgNesedi() && !P.potvrzeni ? '<div class="vzp-upoz">Deal ' + DEAL_ID + ' je v Pipedrive veden na <b>' + esc(P.deal.org) + '</b>, řídící zákazník je teď <b>' + esc(ridiciZ().nazev) + '</b>. '
      + (smiRidit() ? '<button type="button" class="mini' + (dalsiKrok() === 'org' && !S.hraje ? ' vzp-dalsi' : '') + '" data-vzp="org">Změnit organizaci dealu v Pipedrive…</button>' : 'Organizaci dealu mění autor zakázky nebo administrátor.') + '</div>' : '';
    const napoveda = P.krok === 'vychozi' && !S.hraje && !P.formular ? '<span class="vzp-sem">◀ ' + esc(napovedaText()) + '</span>' : '';
    return '<h2><span style="flex:1">Zákazníci zakázky <span class="pill">zkušební funkce</span></span></h2><div class="body">'
      + '<div class="note" style="margin-bottom:8px">Jednu zakázku může poptat víc zákazníků. Každý má <b>svou nabídku</b> (číslo s písmenem zákazníka) — buď sdílí variantu s jiným zákazníkem, nebo má vlastní. '
      + '<b>Řídící zákazník</b> určuje řídící variantu a jen jeho data nese deal v Pipedrive; ostatní jsou v dealu jako textová zmínka.</div>'
      + '<div class="vzp-tab"><table><thead><tr><th title="řídící zákazník">Řídící</th><th>Zákazník</th><th>Číslo nabídky</th><th>Varianta nabídky</th><th>Stav</th><th>Cena bez DPH</th></tr></thead><tbody>' + ro + '</tbody></table></div>'
      + (P.chyba ? '<div class="vzp-upoz">' + esc(P.chyba) + '</div>' : '')
      + '<div class="vzp-pod"><button type="button" class="vzp-modre' + (dalsiKrok().indexOf('pridej') === 0 && !S.hraje ? ' vzp-dalsi' : '') + '" data-vzp="form"' + (volne.length && !prodanoZ() ? '' : ' disabled') + '>+ Přidat zákazníka</button>' + napoveda + '</div>'
      + form + upoz + potv + '</div>';
  }
  function napovedaText() {
    const a = dalsiKrok(), k = SCENARE[S.scenar].kroky.find((x) => x[0] === a);
    return k ? 'Začněte tady nebo nahoře tlačítkem „' + k[1] + '"' : '';
  }
  function chipsHtml() {
    return '<label>Zákazníci (' + P.zak.length + ')</label><span class="vzp-chips">' + P.zak.map((z) =>
      '<button type="button" class="vzp-chip' + (z.id === P.vybrany ? ' on' : '') + '" data-vzp="vyber:' + z.id + '" title="' + esc(z.nazev) + ' — nabídka ' + esc(cisloZ(z)) + '">'
      + (z.id === P.ridici ? '★ ' : '') + esc(z.kratce) + (z.pismeno ? ' · -' + esc(z.pismeno) : '') + '</button>').join('') + '</span>';
  }
  /* Vložení do aplikace. Aplikace se překresluje sama, proto se vkládá po každém překreslení
   * (MutationObserver se při vlastních zásazích odpojuje, jinak by se točil dokola). */
  function vloz() {
    if (OBS) OBS.disconnect();
    try {
      document.querySelectorAll('#vzpKarta, .vzp-chips-row, .vzp-nahled-pruh').forEach((e) => e.remove());
      document.querySelectorAll('.vzp-pole').forEach((e) => e.classList.remove('vzp-pole', 'vzp-blik'));
      const hl = document.querySelector('#page-kalk .card.zak-bar');
      if (!hl) return;
      const k = document.createElement('div'); k.className = 'card'; k.id = 'vzpKarta'; k.innerHTML = kartaHtml();
      hl.parentNode.insertBefore(k, hl.nextSibling);
      const sl = hl.querySelectorAll('.zak-head-col')[1];
      if (sl && P.zak.length > 1) {
        const r = document.createElement('div'); r.className = 'row vzp-chips-row'; r.innerHTML = chipsHtml();
        sl.insertBefore(r, sl.firstChild);
      }
      /* pole hlavičky patří zvolenému zákazníkovi — po změně řídícího / výběru je zvýrazníme */
      if (P.krok !== 'vychozi' && znacka('rz')) hl.querySelectorAll('.zak-head-col:nth-child(2) input[type=text]').forEach((e) => { e.classList.add('vzp-pole'); if (S.blik) e.classList.add('vzp-blik'); });
      const cn = document.querySelector('#ock-nabidka .body table');
      if (cn) {
        const z = vybranyZ(), p = document.createElement('div'); p.className = 'vzp-nahled-pruh';
        p.innerHTML = 'Náhled a tisk platí pro zákazníka <b>' + esc(z.nazev) + '</b> — nabídka <b>' + esc(cisloZ(z)) + '</b>'
          + (P.zak.length > 1 ? '. Jiného zákazníka zvolíte v hlavičce (' + P.zak.filter((x) => x.id !== z.id).map((x) => esc(x.kratce)).join(', ') + ' se do tohoto dokumentu nedostane).' : '.');
        cn.parentNode.insertBefore(p, cn);
      }
    } finally {
      if (OBS && PK) OBS.observe(PK, { childList: true, subtree: true });
    }
  }

  /* ----- lišta a panel ----- */
  function souhrn() {
    if (P.krok === 'vychozi') return 'Výchozí stav — nic se nezměnilo. Klikněte na zvýrazněný krok nebo „▶ Přehrát".';
    const nazvy = { rz: 'řídící zákazník', rv: 'řídící varianta', 'pd.org': 'organizace dealu', 'pd.hodnota': 'hodnota dealu', 'pd.cn': 'číslo nabídky v dealu', 'pd.faze': 'fáze dealu', 'pd.dalsi': 'text „Další zákazníci" v dealu', rejstrik: 'řádek rejstříku' };
    P.zak.forEach((z) => { nazvy['z:' + z.id] = 'nabídka ' + z.kratce; });
    const sk = { pridano: [], zmeneno: [], smazano: [] };
    Object.keys(nazvy).forEach((k) => { const z = znacka(k); if (sk[z]) sk[z].push(nazvy[k]); });
    const cast = (z) => sk[z].length ? '<span class="vzp-zn vzp-zn-' + z + '">' + ZNACKY[z] + '</span> ' + esc(sk[z].join(', ')) : '';
    return ['pridano', 'zmeneno', 'smazano'].map(cast).filter(Boolean).join(' · ') || 'Tímto krokem se nezměnilo nic.';
  }
  function lista() {
    const vyber = (id, mapa, hod) => '<select id="' + id + '">' + Object.keys(mapa).map((r) => '<option value="' + r + '"' + (hod === r ? ' selected' : '') + '>' + esc(typeof mapa[r] === 'string' ? mapa[r] : mapa[r].nazev) + '</option>').join('') + '</select>';
    const d = dalsiKrok();
    const kr = (akce, text) => '<button type="button" data-vzp="' + akce + '"' + (akce !== 'reset' && !lze(akce) ? ' disabled' : '') + (d === akce && !S.hraje ? ' class="vzp-dalsi"' : '') + '>' + esc(text) + '</button>';
    const kroky = SCENARE[S.scenar].kroky;
    const k = kroky.find((x) => x[0] === d);
    document.getElementById('vzpLista').innerHTML =
      '<div class="vzp-sk"><label class="vzp-pop" for="vzpScenar">Situace</label>' + vyber('vzpScenar', SCENARE, S.scenar) + '</div>'
      + '<div class="vzp-sk"><label class="vzp-pop" for="vzpRole">Dívá se</label>' + vyber('vzpRole', ROLE, S.role) + '</div>'
      + '<div class="vzp-sk vzp-kroky"><span class="vzp-pop">Kroky</span>' + kr('reset', '1. Výchozí stav') + kroky.map(([a, t]) => kr(a, t)).join('') + '</div>'
      + (P.krok === 'vychozi' && !S.hraje && k ? '<span class="vzp-napoveda">◀ Klikněte na „' + esc(k[1]) + '"</span>' : '')
      + '<div class="vzp-sk"><button type="button" class="vzp-hraj" data-vzp="hraj">' + (S.hraje ? '■ Zastavit' : '▶ Přehrát') + '</button>'
      + '<button type="button" data-vzp="panel" aria-pressed="' + S.otevreno + '">Co se mění</button></div>'
      + '<div class="vzp-stav"><b>' + esc(P.popis || 'výchozí stav') + '</b> → ' + souhrn() + '</div>';
  }
  function radekPP(nazev, k, pozn) {
    const pred = P.pred[k], po = snimek()[k], z = P.krok === 'vychozi' ? '' : znacka(k), pr = '— prázdné —';
    const h = z ? '<span class="vzp-pred">' + esc(pred || pr) + '</span><span class="vzp-sip">→</span><span class="vzp-h-' + z + '">' + esc(po || pr) + '</span>' : '<span>' + esc(po || pr) + '</span>';
    return '<div class="vzp-r"><span>' + esc(nazev) + '</span><span>' + h + stitek(z) + (pozn ? ' <span class="vzp-pozn">' + pozn + '</span>' : '') + '</span></div>';
  }
  function nahledHtml() {
    const z = Zk(S.nahled) || vybranyZ(), v = Va(z.varianta), ost = P.zak.filter((x) => x.id !== z.id);
    /* Skutečná kontrola: živý náhled v kartě „Cenová nabídka (CN)" nesmí obsahovat jiného zákazníka. */
    const cn = document.querySelector('#ock-nabidka .body table');
    const text = cn && z.id === P.vybrany ? cn.textContent : null;
    const kontrola = ost.map((x) => {
      const unik = text != null && (text.indexOf(x.nazev) >= 0 || text.indexOf(x.ico) >= 0);
      return '<div class="vzp-kontrola ' + (unik ? 'zle' : 'ok') + '">' + (unik ? '✖ ÚNIK: ' : '✔ ') + esc(x.kratce) + ' (název, IČO, cena, číslo …-' + esc(x.pismeno || 'bez písmene') + ') v dokumentu ' + (unik ? 'JE' : 'není') + '</div>';
    }).join('');
    return '<div class="vzp-chips vzp-chips-panel">' + P.zak.map((x) => '<button type="button" class="vzp-chip' + (x.id === z.id ? ' on' : '') + '" data-vzp="nahled:' + x.id + '">' + esc(x.kratce) + '</button>').join('') + '</div>'
      + '<div class="vzp-papir"><div class="vzp-papir-h">CENOVÁ NABÍDKA</div>'
      + [['Objednatel', z.nazev], ['Sídlo, IČO', z.sidlo + ', IČO ' + z.ico], ['Kontaktní osoba', z.kontakt], ['Číslo nabídky', cisloZ(z)], ['Název akce', ZAK.nazevAkce], ['Adresa stavby', ZAK.adresa],
        ['Varianta', v.nazev + (sdili(z).length > 1 ? ' (stejný obsah a cena jako ' + sdili(z).filter((x) => x.id !== z.id).map((x) => x.kratce).join(', ') + ' — to se netiskne)' : '')],
        ['Cena bez DPH', kc(cenaV(v))]].map(([n, h]) => '<div class="vzp-papir-r"><span>' + esc(n) + '</span><span>' + esc(h) + '</span></div>').join('')
      + '<div class="vzp-papir-r"><span>Soubor</span><span>CN_' + esc(cisloZ(z).replace(/\s+/g, '')) + '_' + esc(z.kratce) + '.docx</span></div></div>'
      + (ost.length ? '<div class="vzp-kontroly"><b>Kontrola před tiskem — cizí zákazník v dokumentu:</b>' + kontrola + '</div>' : '<p>Zakázka má jednoho zákazníka — vše jako dnes.</p>');
  }
  function panel() {
    const nove = P.protokol.slice(P.pred.protokol), stare = P.protokol.slice(0, P.pred.protokol);
    const d = pd(), zd = P.krok === 'vychozi' ? '' : znacka('pd.dalsi');
    document.getElementById('vzpPanel').innerHTML =
      '<h3>Co se změnilo posledním krokem (před → po)</h3><div class="vzp-leg">' + ['pridano', 'zmeneno', 'smazano'].map((z) => '<span class="vzp-zn vzp-zn-' + z + '">' + ZNACKY[z] + '</span>').join('') + '</div>'
      + (P.krok === 'vychozi' ? '<p>Výchozí stav. Klikněte nahoře na zvýrazněný krok.</p>' : '')
      + radekPP('Řídící zákazník', 'rz') + radekPP('Řídící varianta', 'rv')
      + P.zak.map((z) => radekPP('Nabídka ' + z.kratce, 'z:' + z.id)).join('')
      + Object.keys(P.pred).filter((k) => k.indexOf('z:') === 0 && !Zk(k.slice(2))).map((k) => radekPP('Nabídka ' + FIRMY[k.slice(2)].kratce, k)).join('')
      + '<h3>Pipedrive — co se zapíše do dealu ' + DEAL_ID + '</h3>'
      + '<p>Deal nese jen data řídící varianty řídícího zákazníka. Nic se neodesílá — náhled.</p>'
      + radekPP('Organizace dealu', 'pd.org', orgNesedi() ? '⚠ neodpovídá řídícímu zákazníkovi — aplikace ji sama nemění' : '')
      + radekPP('Hodnota dealu', 'pd.hodnota') + radekPP('Číslo nabídky (CN)', 'pd.cn') + radekPP('Fáze dealu', 'pd.faze')
      + '<div class="vzp-r"><span>Krycí list, odkaz na kalkulaci</span><span>z řídící varianty; odkaz beze změny</span></div>'
      + '<div class="vzp-r vzp-r-blok"><span>Pole „Další zákazníci (Kalkulátor)"' + stitek(zd) + '</span>'
      + (zd && P.pred['pd.dalsi'] ? '<div class="vzp-odp vzp-odp-pred">' + esc(P.pred['pd.dalsi']) + '</div>' : '')
      + '<div class="vzp-odp' + (zd ? ' vzp-odp-' + zd : '') + '">' + (d.dalsi ? esc(d.dalsi) : '— prázdné (zakázka má jednoho zákazníka) —') + '</div></div>'
      + '<p>Zapisuje se při tisku nabídky, při „Prodáno" a tlačítkem „Zapsat do Pipedrive". Text aplikace vždy přepíše celý — ruční úpravy v tomto poli nevydrží.</p>'
      + '<h3>Náhled nabídky pro zákazníka</h3>' + nahledHtml()
      + '<h3>Přehled cenových nabídek (řádek rejstříku)</h3>' + radekPP('Řádek', 'rejstrik')
      + '<p>Hledání v Přehledu najde zakázku i podle názvu dalšího zákazníka.</p>'
      + '<h3>Protokol zakázky</h3>'
      + (P.protokol.length ? '<ol>' + stare.map((z) => '<li>' + esc(z.kdy) + ' · <b>' + esc(z.kdo) + '</b>: ' + esc(z.co) + '</li>').join('')
        + nove.map((z) => '<li class="vzp-h-pridano">' + esc(z.kdy) + ' · <b>' + esc(z.kdo) + '</b>: ' + esc(z.co) + stitek('pridano') + '</li>').join('') + '</ol>' : '<p>— prázdný —</p>')
      + '<h3>Pravidla návrhu</h3><ol>'
      + '<li>První zákazník je řídící a nemá písmeno — zakázka s jedním zákazníkem je přesně jako dnes.</li>'
      + '<li>Další zákazník dostane písmeno (B, C…), které se už nikdy nezmění ani nepřidělí znovu. Číslo jeho nabídky = číslo varianty + písmeno.</li>'
      + '<li>Zákazník ukazuje na jednu variantu: sdílenou, nebo vlastní (kopii).</li>'
      + '<li>Tisk nabídky je vždy pro jednoho zákazníka; varianta se zamkne prvním tiskem, další tisk jinému zákazníkovi jen přidá razítko „komu".</li>'
      + '<li>Řídící varianta = varianta řídícího zákazníka. Prodáno jinému zákazníkovi z něj udělá řídícího (prodaná = řídící, #563).</li>'
      + '<li>Deal nese data řídící varianty; ostatní zákazníci jsou jen v textovém poli (název, platná nabídka, datum, cena bez DPH).</li>'
      + '<li>Řídícího zákazníka a organizaci dealu mění autor zakázky a administrátor.</li></ol>';
  }
  function vyska() {
    const l = document.getElementById('vzpLista');
    if (l) document.documentElement.style.setProperty('--vzp-h', l.offsetHeight + 'px');
  }
  function kresli() {
    KRESLI = true;
    try { if (typeof render === 'function') render(); } finally { KRESLI = false; }
    vloz(); lista(); panel();
    document.body.classList.toggle('vzp-otevreno', S.otevreno);
    document.getElementById('vzpPanel').hidden = !S.otevreno;
    vyska();
  }
  function naZmenu() {
    try { if (typeof TAB !== 'undefined' && TAB !== 'kalk' && typeof prepniTab === 'function') prepniTab('kalk'); } catch (e) { /* bez přepnutí */ }
    const cil = document.querySelector('#vzpKarta .vzp-potvrzeni') || document.querySelector('#vzpKarta .vzp-form') || document.querySelector('#vzpKarta .vzp-pp') || document.getElementById('vzpKarta');
    if (cil && cil.scrollIntoView) cil.scrollIntoView({ block: 'center' });
  }

  const POPISY = { pridej: 'zákazník přidán (stejná varianta)', odesli: 'nabídka vytištěna (odeslána)', vlastni: 'založena vlastní varianta zákazníka', uprav: 'vlastní varianta upravena',
    prodej: 'prodej — čeká na potvrzení', prodejAno: 'prodáno, řídící zákazník změněn', org: 'změna organizace dealu — čeká na potvrzení', orgAno: 'organizace dealu změněna', ridici: 'řídící zákazník změněn ručně',
    odeber: 'zákazník odebrán', varianta: 'zákazníkovi přiřazena jiná varianta' };
  function krok(a, arg) {
    const [co, id] = a.split(':');
    zHlavicky();
    P.chyba = '';
    if (co === 'reset') { vychozi(); S.blik = false; kresli(); window.scrollTo(0, 0); return; }
    if (co === 'vyber') { otevri(id); kresli(); return; }
    if (co === 'nahled') { S.nahled = id; if (id !== P.vybrany) otevri(id); S.otevreno = true; kresli(); const n = document.querySelector('#vzpPanel .vzp-papir'); if (n && n.scrollIntoView) n.scrollIntoView({ block: 'center' }); return; }
    if (co === 'form') { P.formular = true; kresli(); naZmenu(); return; }
    if (co === 'formNe') { P.formular = false; kresli(); return; }
    if (co === 'potvNe') { P.potvrzeni = null; kresli(); return; }
    if (!lze(a === 'pridejForm:' + id ? 'pridej:' + id : a)) return;
    const idx = SCENARE[S.scenar].kroky.findIndex((x) => x[0] === (co === 'pridejForm' ? 'pridej:' + id : a));
    if (co === 'prodej') { P.potvrzeni = { typ: 'prodej', id }; otevri(id); }
    else if (co === 'org') P.potvrzeni = { typ: 'org' };
    else {
      P.pred = snimek(); P.formular = false;
      if (co === 'pridej') pridej(id, false);
      else if (co === 'pridejForm') pridej(id, arg === 'vlastni');
      else if (co === 'vlastni') vlastni(id);
      else if (co === 'uprav') uprav(id);
      else if (co === 'odesli') odesli(id);
      else if (co === 'prodejAno') prodejAno();
      else if (co === 'orgAno') orgAno();
      else if (co === 'ridici') ridici(id);
      else if (co === 'odeber') odeber(id);
      else if (co === 'varianta') { const z = Zk(id); z.varianta = arg; if (id === P.ridici) nastavRidici(ZAK, arg); zapis(ROLE[S.role], 'přiřadil zákazníkovi ' + z.kratce + ' variantu „' + Va(arg).nazev + '" — nabídka ' + cisloZ(z)); otevri(id); }
    }
    P.krok = co; P.popis = POPISY[co === 'pridejForm' ? 'pridej' : co] || co;
    if (idx >= 0) P.i = idx + 1;
    S.blik = true;
    kresli(); naZmenu();
    S.blik = false;
  }
  /* „▶ Přehrát": projde kroky zvolené situace po 3,5 s. */
  function zastav() { if (S.hraje) { clearTimeout(S.hraje.t); S.hraje = null; } }
  function hraj() {
    if (S.hraje) { zastav(); kresli(); return; }
    if (S.role === 'jiny') S.role = 'autor';
    const fronta = ['reset'].concat(SCENARE[S.scenar].kroky.map((x) => x[0]));
    S.hraje = { i: 0, t: null };
    const dalsi = () => {
      if (!S.hraje) return;
      const a = fronta[S.hraje.i++], konec = S.hraje.i >= fronta.length, h = S.hraje;
      if (konec) S.hraje = null;
      krok(a);
      if (!konec) h.t = setTimeout(dalsi, 3500);
    };
    dalsi();
  }
  function klik(e) {
    const b = e.target.closest('[data-vzp]'); if (!b || b.disabled) return;
    const a = b.getAttribute('data-vzp');
    if (a === 'hraj') { hraj(); return; }
    zastav();
    if (a === 'panel') { S.otevreno = !S.otevreno; kresli(); return; }
    if (a.indexOf('pridejForm:') === 0) { const v = document.querySelector('input[name="vzpNova"]:checked'); krok(a, v ? v.value : 'stejna'); return; }
    krok(a);
  }
  function zmena(e) {
    const t = e.target; if (!t) return;
    if (t.id === 'vzpScenar' || t.id === 'vzpRole') {
      zastav(); S[t.id === 'vzpScenar' ? 'scenar' : 'role'] = t.value;
      if (t.id === 'vzpScenar') { vychozi(); kresli(); window.scrollTo(0, 0); } else kresli();
      return;
    }
    const zr = t.getAttribute && t.getAttribute('data-vzp-ridici');
    if (zr) { zastav(); krok('ridici:' + zr); return; }
    const zv = t.getAttribute && t.getAttribute('data-vzp-var');
    if (zv) { zastav(); krok('varianta:' + zv, t.value); }
  }

  function start() {
    if (window.__VZP_CENIK) {   // zkušební (smyšlený) ceník z testů — aplikace sama žádný ceník nenese
      Object.assign(DEFAULT_CENIK, window.__VZP_CENIK.ock); delete DEFAULT_CENIK.prazdny;
      Object.assign(DEFAULT_CENIK_PROJ, window.__VZP_CENIK.proj); delete DEFAULT_CENIK_PROJ.prazdny;
    }
    obalCisel();
    const l = document.createElement('div'); l.id = 'vzpLista'; l.setAttribute('role', 'toolbar'); l.setAttribute('aria-label', 'Ovládání prototypu');
    const p = document.createElement('aside'); p.id = 'vzpPanel'; p.setAttribute('aria-label', 'Co se mění');
    document.body.insertBefore(p, document.body.firstChild);   // na úzké obrazovce stojí panel hned pod lištou
    document.body.insertBefore(l, document.body.firstChild);
    document.body.addEventListener('click', klik);
    document.body.addEventListener('change', zmena);
    window.addEventListener('resize', vyska);
    let t = null;
    PK = document.getElementById('page-kalk');
    /* Aplikace se překreslila sama (např. úprava pole v hlavičce): převezmi úpravy zvoleného zákazníka a vrať kartu. */
    if (PK && window.MutationObserver) { OBS = new MutationObserver(() => { if (KRESLI) return; clearTimeout(t); t = setTimeout(() => { zHlavicky(); vloz(); lista(); panel(); vyska(); }, 60); }); OBS.observe(PK, { childList: true, subtree: true }); }
    vychozi();
    try { if (typeof prepniTab === 'function') prepniTab('kalk'); } catch (e) { /* zůstane otevřená záložka */ }
    kresli();
  }
  /* Kdyby se prototyp nespustil (aplikace se nenačetla), ať je to vidět, ne tiché. */
  function bezpecne() {
    try { start(); } catch (e) {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b3261e;color:#fff;padding:10px 16px;font:14px system-ui,sans-serif';
      d.textContent = 'Prototyp se nespustil: ' + (e && e.message ? e.message : e);
      document.body.appendChild(d);
    }
  }
  if (document.readyState === 'complete') setTimeout(bezpecne, 0); else window.addEventListener('load', () => setTimeout(bezpecne, 0));
})();
