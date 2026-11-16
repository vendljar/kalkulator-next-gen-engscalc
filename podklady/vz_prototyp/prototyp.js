/* ===== PROTOTYP „VÍC ZÁKAZNÍKŮ NA JEDNÉ ZAKÁZCE" (jen podklad k rozhodnutí J. V., NENÍ součást aplikace) =====
 * Vkládá se za sestavenou aplikaci (sestav.mjs). Nic neposílá — Pipedrive je jen napodobený
 * v paměti stránky, data i ceny jsou smyšlené (zkušební ceník z testů, kulatá čísla).
 * Návrh: podklady/NAVRH_VICE_ZAKAZNIKU.md (v2, 16. 11. 2026: s jedním zákazníkem je aplikace jako dnes,
 * navíc jen tlačítko „Přidat zákazníka"; karta a přepínač až od druhého zákazníka; odstranění zákazníka).
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
    pridat: { nazev: 'přidat a odstranit zákazníka', kroky: [['form', '2. Přidat zákazníka'], ['pridejForm:b', '3. Potvrdit přidání'], ['vlastni:b', '4. Vlastní varianta pro BETA'], ['odeber:b', '5. Odstranit BETA'], ['odeberAno', '6. Potvrdit odstranění']] },
    odeslana: { nazev: 'odstranit zákazníka s odeslanou nabídkou', kroky: [['odeber:b', '2. Odstranit BETA'], ['odeberAno', '3. Potvrdit odstranění']] },
    stejna: { nazev: 'stejná varianta pro víc zákazníků', kroky: [['pridej:b', '2. Přidat zákazníka BETA'], ['odesli:a', '3. Odeslat nabídku ALFA'], ['odesli:b', '4. Odeslat tutéž nabídku BETA']] },
    sachty: { nazev: 'víc zákazníků + víc šachet', kroky: [['vlastni:b', '2. Vlastní varianta pro BETA'], ['sachty:b', '3. BETA chce dvě varianty šachet (A 1 ks, B 2 ks)'], ['odesli:b', '4. Odeslat nabídku BETA']] },
    prodej: { nazev: 'prodej druhému zákazníkovi', kroky: [['prodej:b', '2. Prodáno → BETA'], ['prodejAno', '3. Potvrdit prodej'], ['orgAno', '4. Zkusit zápis organizace znovu (jen po výpadku)']] },
  };
  const PD_STAVY = { ok: 'Pipedrive odpoví', vypadek: 'výpadek Pipedrive' };
  const ROLE = { autor: 'autor zakázky (obchodník)', jiny: 'jiný obchodník', admin: 'administrátor' };
  const ZNACKY = { pridano: 'přidáno', zmeneno: 'změněno', smazano: 'smazáno', beze: 'beze změny' };
  const DEAL_ID = '4321';
  const S = { scenar: 'pridat', role: 'autor', pd: 'ok', otevreno: true, hraje: null, blik: false, nahled: '' };
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
    const pis = (zak, v) => { if (!P || zak !== ZAK || !v) return ''; if (P.archiv[v.id]) return '-' + P.archiv[v.id]; const z = vybranyZ(); return (z && z.pismeno && v.id === z.varianta) ? '-' + z.pismeno : ''; };
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
  /* Víc šachet (#570) je v prototypu ZAPNUTO — skutečné ovládání aplikace; šachty patří variantě, ne zákazníkovi. */
  const sachtyText = (v) => { try { const ock = v && v.data && v.data.ock; if (!ock || !rezimViceSachet(ock)) return ''; const p = vsPocty(ock); return vsPoctyPopis(p.variant, p.celkem); } catch (e) { return ''; } };
  const radekText = (z) => cisloZ(z) + ' · ' + variantaText(z) + (sachtyText(Va(z.varianta)) ? ' · šachty: ' + sachtyText(Va(z.varianta)) : '') + ' · ' + stavText(z) + ' · ' + kc(cenaV(Va(z.varianta)));

  /* ----- Pipedrive: co deal ponese ----- */
  function dalsiText() {
    const ost = P.zak.filter((z) => z.id !== P.ridici);
    const znacka = ' — nabídka ' + String(ZAK.cislo);
    if (!ost.length) return P.poznamka ? 'Další zákazníci na zakázce: žádní' + znacka : '';
    const prodano = !!prodanoZ();
    return 'Další zákazníci na zakázce:\n' + ost.map((z) => {
      const pl = z.platna;
      const nab = pl ? 'CN ' + pl.cislo + ' z ' + pl.datum + ', ' + kc(pl.cena) + ' bez DPH' : 'nabídka zatím neodeslána (' + cisloZ(z) + ')';
      const nova = pl && pl.vid !== z.varianta ? ' · připravuje se nová ' + cisloZ(z) : '';
      return '• ' + z.nazev + ' — ' + nab + nova + (prodano ? ' — neprodáno' : '');
    }).join('\n') + '\n' + znacka.trim();
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
      rejstrik: rejstrikText(), pohled: pohledText(), varianty: variantyText() };
    P.zak.forEach((z) => { s['z:' + z.id] = radekText(z); });
    return s;
  }
  const pohledText = () => P.zak.length > 1 ? 'víc zákazníků (' + P.zak.length + '): přepínač v hlavičce + karta Zákazníci zakázky' : 'standardní kalkulace (jeden zákazník) — jen tlačítko „Přidat zákazníka"';
  const variantyText = () => (ZAK.varianty || []).map((v) => v.nazev + ' ' + String(puvodni.variantaCislo(ZAK, v) || '').replace(/^.*- /, '…') + (P.archiv[v.id] ? '-' + P.archiv[v.id] : '') + (v.zamek && v.zamek.zamceno ? ' 🔒' : '')).join(' · ');
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
    P.zak.push(novyZ(id, rz.varianta)); P.poznamka = true;
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
  function sachty(id) {
    otevri(id); if (typeof render === 'function') render();
    vsNazevSet('Výtah A'); vsPocetVariant('2'); Z.zdvih = 17.3; vsKsSet('2'); vsNazevSet('Výtah B'); vsAkt(0);
    zapis(ROLE[S.role], 've variantě zákazníka ' + Zk(id).kratce + ' nastavil víc šachet: ' + sachtyText(Va(Zk(id).varianta)) + ' — varianty ostatních zákazníků se nemění');
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
    orgZapis(false);
  }
  /* Organizace dealu = vítězný zákazník (J. V. 16. 11. 2026). Server ji najde podle IČO, jinak založí. */
  function orgZapis(znovu) {
    const stara = P.deal.org, rz = ridiciZ();
    if (S.pd === 'vypadek' && !znovu) {
      P.orgStav = 'chyba';
      zapis('server', 'organizaci dealu ' + DEAL_ID + ' se nepodařilo přepsat (Pipedrive neodpověděl včas) — prodej je uložený, zápis čeká');
      return;
    }
    P.deal.org = rz.nazev; P.orgStav = 'zapsano';
    zapis('server', 'organizace dealu ' + DEAL_ID + ' přepsána na vítězného zákazníka: ' + stara + ' → ' + rz.nazev + ' (nalezena podle IČO ' + rz.ico + '; kdyby v Pipedrive nebyla, založí se)' + (znovu ? ' — opakovaný zápis, spustil ' + ROLE[S.role] : ''));
  }
  function orgAno() { orgZapis(true); }
  /* Odstranění dalšího zákazníka. Co odešlo, zůstává doložené: zamčená varianta se nemaže (pravidlo #34),
   * razítko tisku se snímkem adresáta zůstává v zámku. Nezamčenou vlastní variantu lze smazat s ním. */
  function odeberInfo(id) {
    const z = Zk(id), v = Va(z.varianta), vlastniV = sdili(z).length === 1, zamcena = !!(v && v.zamek && v.zamek.zamceno);
    return { z, v, vlastniV, zamcena, odeslano: Object.keys(z.odeslano).length > 0 };
  }
  function odeberAno(volba) {
    const { z, v, vlastniV, zamcena, odeslano } = odeberInfo(P.potvrzeni.id);
    P.potvrzeni = null;
    let co = 'varianta „' + v.nazev + '" zůstává (používá ji ' + sdili(z).filter((x) => x.id !== z.id).map((x) => x.kratce).join(', ') + ')';
    if (vlastniV && zamcena) { P.archiv[v.id] = z.pismeno; co = 'odeslaná varianta „' + v.nazev + '" (' + cisloZ(z) + ') zůstává zamčená jako doklad'; }
    else if (vlastniV && volba !== 'ponechat') {
      ZAK.varianty = ZAK.varianty.filter((x) => x.id !== v.id);
      co = 'jeho rozpracovaná varianta „' + v.nazev + '" smazána';
    } else if (vlastniV) { v.zakaznik = ''; co = 'varianta „' + v.nazev + '" ponechána jako běžná varianta zakázky'; }
    P.zak = P.zak.filter((x) => x.id !== z.id);
    zapis(ROLE[S.role], 'odstranil zákazníka ' + z.kratce + (odeslano ? ' (odeslaná nabídka zůstává doložená v zámku varianty)' : '') + '; ' + co
      + (P.zak.length === 1 ? '; zakázka má zase jednoho zákazníka — standardní pohled' : ''));
    otevri(P.ridici);
    if (!ZAK.varianty.some((x) => x.ridici)) nastavRidici(ZAK, ridiciZ().varianta);
  }

  /* Smí se krok provést? (zhasíná tlačítka v liště i v kartě) */
  function lze(a) {
    const [co, id] = a.split(':'), z = id ? Zk(id) : null, v = z ? Va(z.varianta) : null;
    const zamcena = !!(v && v.zamek && v.zamek.zamceno), prodano = !!prodanoZ();
    if (co === 'pridej') return !z && !prodano;
    if (co === 'form') return !P.formular && !prodano && Object.keys(FIRMY).some((k) => !Zk(k));
    if (co === 'pridejForm') return !!P.formular && !z;
    if (co === 'odeberAno') return !!(P.potvrzeni && P.potvrzeni.typ === 'odeber');
    if (co === 'odesli') return !!z && !odeslanoTed(z) && !prodano;
    if (co === 'vlastni') return !!z && !prodano && (sdili(z).length > 1 || zamcena);
    if (co === 'sachty') return !!z && !zamcena && sdili(z).length === 1 && !sachtyText(v);
    if (co === 'uprav') return !!z && !zamcena && sdili(z).length === 1 && Z.zdvih !== 15;
    if (co === 'prodej') return !!z && !!odeslanoTed(z) && !prodano && !P.potvrzeni;
    if (co === 'prodejAno') return !!(P.potvrzeni && P.potvrzeni.typ === 'prodej');
    if (co === 'orgAno') return P.orgStav === 'chyba' && orgNesedi() && smiRidit();
    if (co === 'ridici') return !!z && z.id !== P.ridici && !prodano && smiRidit();
    if (co === 'odeber') return !!z && z.id !== P.ridici && !z.prodano && !P.potvrzeni && (S.role === 'admin' || !Object.keys(z.odeslano).length);
    return true;
  }
  const dalsiKrok = () => (SCENARE[S.scenar].kroky.find(([a], i) => i >= P.i && lze(a)) || [''])[0];

  function vychozi() {
    P = { zak: [], ridici: 'a', vybrany: 'a', deal: { org: FIRMY.a.nazev }, protokol: [], potvrzeni: null, archiv: {}, poznamka: false, orgStav: '', formular: false, chyba: '', krok: 'vychozi', i: 0, pred: null };
    ZAK = novaZakazka();
    if (typeof syncVarianta === 'function') syncVarianta();
    Object.assign(Z, { sirka: 1.6, hloubka: 2.1, zdvih: 12, prejezd: 2.7, prohluben: 1.05 });
    if (typeof OCK !== 'undefined' && OCK) OCK.fixes = true;
    ZAK.cislo = '2026 - OPR - CN - 9940'; ZAK.nazevAkce = 'Bytový dům Smyšlená — výtah'; ZAK.adresa = 'Smyšlená 7, Vzorov';
    ZAK.pdDealId = DEAL_ID; ZAK.pdStav = { status: 'open', nacteno: new Date().toISOString() };
    P.zak.push(novyZ('a', ZAK.varianty[0].id));
    doHlavicky();
    const role = S.role; S.role = 'autor';
    const plny = S.scenar === 'odeslana' || S.scenar === 'prodej';
    if (plny) { pridej('b', false); odesli('a'); vlastni('b'); uprav('b'); odesli('b'); }
    if (S.scenar === 'sachty') pridej('b', false);
    S.role = role;
    otevri(plny || S.scenar === 'sachty' ? 'b' : 'a');
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
        + '<div class="note">' + (sd.length > 1 ? 'sdílená: ' + esc(sd.map((x) => x.kratce).join(' + ')) : (P.zak.length > 1 ? 'vlastní varianta' : 'jediná varianta')) + (sachtyText(Va(z.varianta)) ? ' · <b>šachty: ' + esc(sachtyText(Va(z.varianta))) + '</b>' : '') + '</div></td>'
        + '<td data-l="Stav">' + stav + '</td>'
        + '<td data-l="Cena bez DPH" class="vzp-cena">' + esc(kc(cenaV(v))) + '</td>'
        + '</tr><tr class="vzp-akce-r' + (vyb ? ' aktivni' : '') + (zn ? ' vzp-r-' + zn : '') + '"><td></td><td colspan="5" class="vzp-akce">' + tl('nahled:' + z.id, '👁 Náhled', 'náhled nabídky pro tohoto zákazníka')
        + tl('odesli:' + z.id, '🖨 Tisk CN', 'vytisknout (odeslat) cenovou nabídku tomuto zákazníkovi — varianta se zamkne')
        + tl('vlastni:' + z.id, '⧉ Vlastní varianta', 'založit kopii varianty jen pro tohoto zákazníka')
        + tl('prodej:' + z.id, '✔ Prodáno', 'zakázku získal tento zákazník')
        + tl('odeber:' + z.id, '🗑 Odstranit', z.id === P.ridici ? 'řídícího zákazníka nejde odstranit, dokud se řídícím nestane jiný' : (z.prodano ? 'zákazníka s prodanou nabídkou nejde odstranit' : (Object.keys(z.odeslano).length && S.role !== 'admin' ? 'zákazníka, kterému už odešla nabídka, smí odstranit jen administrátor' : 'odstranit zákazníka ze zakázky (s potvrzením)'))) + '</td></tr>'
        + (zn ? '<tr class="vzp-pp vzp-pp-' + zn + '"><td></td><td colspan="5">' + stitek(zn) + ' ' + (zn === 'pridano' ? '<b>' + esc(snimek()['z:' + z.id]) + '</b>'
          : '<s>' + esc(P.pred['z:' + z.id]) + '</s> → <b>' + esc(snimek()['z:' + z.id]) + '</b>') + '</td></tr>' : '');
    }).join('');
    const volne = Object.keys(FIRMY).filter((k) => !Zk(k));
    let potv = '';
    if (P.potvrzeni && P.potvrzeni.typ === 'odeber') potv = odeberHtml();
    const form = formHtml();    if (P.potvrzeni && P.potvrzeni.typ === 'prodej') {
      const z = Zk(P.potvrzeni.id), v = Va(z.varianta), rz = ridiciZ(), rv = Va(rz.varianta);
      const r = (n, a, b) => '<div class="vzp-pr"><span>' + esc(n) + '</span><span>' + (a === b ? esc(b) + ' <i>beze změny</i>' : '<s>' + esc(a) + '</s> → <b>' + esc(b) + '</b>') + '</span></div>';
      potv = '<div class="vzp-potvrzeni"><b>Prodat zakázku zákazníkovi ' + esc(z.nazev) + '?</b>'
        + r('Řídící zákazník', rz.nazev, z.nazev) + r('Řídící varianta (prodaná = řídící)', rv.nazev, v.nazev)
        + r('Deal ' + DEAL_ID + ': hodnota', kc(cenaV(rv)), kc(cenaV(v))) + r('Deal ' + DEAL_ID + ': číslo nabídky', cisloZ(rz), cisloZ(z))
        + r('Deal ' + DEAL_ID + ': krycí list', 'varianta „' + rv.nazev + '"', 'varianta „' + v.nazev + '"')
        + r('Deal ' + DEAL_ID + ': organizace', P.deal.org, z.nazev)
        + r('Deal ' + DEAL_ID + ': poznámka „Další zákazníci"', P.zak.filter((x) => x.id !== P.ridici).map((x) => x.kratce).join(', ') || '—', P.zak.filter((x) => x.id !== z.id).map((x) => x.kratce + ' — neprodáno').join(', ') || '—')
        + '<div class="vzp-pt"><button type="button" class="vzp-zelene' + (dalsiKrok() === 'prodejAno' ? ' vzp-dalsi' : '') + '" data-vzp="prodejAno">Prodáno — potvrdit</button><button type="button" class="mini" data-vzp="potvNe">Zrušit</button>'
        + '<span>Organizace dealu se přepíše na vítězného zákazníka: v Pipedrive se najde podle IČO, jinak se založí. Původní organizace se nemění. Nabídky ostatních zákazníků zůstávají zamčené a dohledatelné.</span></div></div>';
    }
    const upoz = P.orgStav === 'chyba' && orgNesedi() ? '<div class="vzp-upoz"><b>Organizace dealu se nepřepsala</b> (Pipedrive neodpověděl). Deal ' + DEAL_ID + ' je dál veden na <b>' + esc(P.deal.org) + '</b>, vítězný zákazník je <b>' + esc(ridiciZ().nazev) + '</b>. Prodej je uložený. '
      + (smiRidit() ? '<button type="button" class="mini' + (dalsiKrok() === 'orgAno' && !S.hraje ? ' vzp-dalsi' : '') + '" data-vzp="orgAno">Zkusit zápis znovu</button>' : 'Zápis zopakuje autor zakázky nebo administrátor.') + '</div>' : '';
    const napoveda = P.krok === 'vychozi' && !S.hraje && !P.formular ? '<span class="vzp-sem">◀ ' + esc(napovedaText()) + '</span>' : '';
    return '<h2><span style="flex:1">Zákazníci zakázky <span class="pill">zkušební funkce</span>' + (noveVidet() ? ' <span class="vzp-zn vzp-zn-pridano">nově se objevilo</span>' : '') + '</span></h2><div class="body">'
      + '<div class="note" style="margin-bottom:8px">Jednu zakázku může poptat víc zákazníků. Každý má <b>svou nabídku</b> (číslo s písmenem zákazníka) — buď sdílí variantu s jiným zákazníkem, nebo má vlastní. '
      + '<b>Řídící zákazník</b> určuje řídící variantu a jen jeho data nese deal v Pipedrive; ostatní jsou v dealu jako textová zmínka.</div>'
      + '<div class="vzp-tab"><table><thead><tr><th title="řídící zákazník">Řídící</th><th>Zákazník</th><th>Číslo nabídky</th><th>Varianta nabídky</th><th>Stav</th><th>Cena bez DPH</th></tr></thead><tbody>' + ro + '</tbody></table></div>'
      + (P.chyba ? '<div class="vzp-upoz">' + esc(P.chyba) + '</div>' : '')
      + '<div class="vzp-pod"><button type="button" class="vzp-modre' + (dalsiKrok().indexOf('pridej') === 0 && !S.hraje ? ' vzp-dalsi' : '') + '" data-vzp="form"' + (volne.length && !prodanoZ() ? '' : ' disabled') + '>+ Přidat zákazníka</button>' + napoveda + '</div>'
      + form + upoz + potv + '</div>';
  }
  function formHtml() {
    const volne = Object.keys(FIRMY).filter((k) => !Zk(k));
    return P.formular && volne.length ? '<div class="vzp-form"><b>Nový zákazník na zakázce</b>'
      + '<div class="row"><label>Zákazník</label><input type="text" value="' + esc(FIRMY[volne[0]].nazev) + '" readonly></div>'
      + '<div class="row"><label>IČO zákazníka</label><input type="text" value="' + esc(FIRMY[volne[0]].ico) + '" readonly></div>'
      + '<div class="row"><label>Nabídka</label><span class="vzp-volba"><label><input type="radio" name="vzpNova" value="stejna" checked> stejná varianta jako ' + esc(ridiciZ().kratce) + ' („' + esc(Va(ridiciZ().varianta).nazev) + '")</label>'
      + '<label><input type="radio" name="vzpNova" value="vlastni"> vlastní varianta (kopie)</label></span></div>'
      + '<div class="note">V ostré verzi: našeptávač z databáze zákazníků a „Najít firmu v ARES" jako v hlavičce. Zákazník dostane písmeno <b>' + esc(PISMENA[volne[0]]) + '</b> — jeho nabídky ponesou číslo …-' + esc(PISMENA[volne[0]]) + '.</div>'
      + '<button type="button" class="vzp-modre' + (dalsiKrok() === 'pridejForm:' + volne[0] && !S.hraje ? ' vzp-dalsi' : '') + '" data-vzp="pridejForm:' + volne[0] + '">Přidat zákazníka</button> <button type="button" class="mini" data-vzp="formNe">Zrušit</button></div>' : '';
  }
  function odeberHtml() {
    const { z, v, vlastniV, zamcena, odeslano } = odeberInfo(P.potvrzeni.id);
    const zbyde = P.zak.length - 1;
    const r = (n, h) => '<div class="vzp-pr"><span>' + esc(n) + '</span><span>' + h + '</span></div>';
    const varianta = !vlastniV ? 'zůstává beze změny — používá ji ' + esc(sdili(z).filter((x) => x.id !== z.id).map((x) => x.kratce).join(', '))
      : (zamcena ? '<b>zůstává v zakázce zamčená</b> jako doklad o odeslání, číslo ' + esc(cisloZ(z)) + ' se nemění. Smazat ji smí jen správce, jako dnes.'
        : '<span class="vzp-volba"><label><input type="radio" name="vzpOdeber" value="smazat" checked> smazat i jeho rozpracovanou variantu „' + esc(v.nazev) + '" (nikomu neodešla)</label>'
          + '<label><input type="radio" name="vzpOdeber" value="ponechat"> ponechat ji v zakázce jako běžnou variantu</label></span>');
    const nabidka = odeslano ? 'odeslána ' + esc(Object.values(z.odeslano).join(', ')) + ' → <b>doklad zůstává</b> (razítko tisku se jménem adresáta v zámku varianty, protokol)' : 'rozpracovaná, neodeslaná → <b>zanikne</b>';
    return '<div class="vzp-potvrzeni"><b>Odstranit zákazníka ' + esc(z.nazev) + ' ze zakázky?</b>'
      + r('Jeho nabídka ' + cisloZ(z), nabidka) + r('Varianta „' + v.nazev + '"', varianta)
      + r('Deal ' + DEAL_ID + ': poznámka „Další zákazníci"', zbyde > 1 ? 'řádek ' + esc(z.kratce) + ' zmizí, ostatní zůstanou' : 'upraví se na <b>„žádní"</b> (poznámka se nemaže, jako u šachet)')
      + (odeslano ? r('Kdo smí', 'jen <b>administrátor</b> — zákazníkovi už odešla nabídka') : '')
      + r('Písmeno -' + z.pismeno, odeslano ? 'už se nepřidělí jinému zákazníkovi (je na odeslaném papíře)' : 'uvolní se — nic s ním neodešlo')
      + r('Vzhled aplikace', zbyde > 1 ? 'beze změny (zůstávají ' + zbyde + ' zákazníci)' : '<s>přepínač zákazníků, karta Zákazníci zakázky, štítky</s> → <b>standardní kalkulace</b>, jen tlačítko „Přidat zákazníka"')
      + '<div class="vzp-pt"><button type="button" class="vzp-cervene' + (dalsiKrok() === 'odeberAno' ? ' vzp-dalsi' : '') + '" data-vzp="odeberAno">Odstranit zákazníka</button><button type="button" class="mini" data-vzp="potvNe">Zrušit</button>'
      + '<span>Údaje zákazníka (název, IČO, kontakt) se ze zakázky smažou. Jeho karta v databázi zákazníků zůstává.</span></div></div>';
  }
  function napovedaText() {
    const a = dalsiKrok(), k = SCENARE[S.scenar].kroky.find((x) => x[0] === a);
    return k ? 'Začněte tady nebo nahoře tlačítkem „' + k[1] + '"' : '';
  }
  const noveVidet = () => P.krok !== 'vychozi' && P.zak.length > 1 && /^standardní/.test(P.pred.pohled || '');
  function chipsHtml() {
    return '<label>Zákazníci (' + P.zak.length + ')</label><span class="vzp-chips">' + P.zak.map((z) =>
      '<button type="button" class="vzp-chip' + (z.id === P.vybrany ? ' on' : '') + '" data-vzp="vyber:' + z.id + '" title="' + esc(z.nazev) + ' — nabídka ' + esc(cisloZ(z)) + '">'
      + (z.id === P.ridici ? '★ ' : '') + esc(z.kratce) + (z.pismeno ? ' · -' + esc(z.pismeno) : '') + '</button>').join('')
      + '<button type="button" class="vzp-chip vzp-chip-plus" data-vzp="form" title="Přidat dalšího zákazníka"' + (lze('form') ? '' : ' disabled') + '>+</button>'
      + (noveVidet() ? '<span class="vzp-zn vzp-zn-pridano">nově se objevilo</span>' : '') + '</span>';
  }
  /* Vložení do aplikace. Aplikace se překresluje sama, proto se vkládá po každém překreslení
   * (MutationObserver se při vlastních zásazích odpojuje, jinak by se točil dokola). */
  function vloz() {
    if (OBS) OBS.disconnect();
    try {
      document.querySelectorAll('#vzpKarta, .vzp-chips-row, .vzp-nahled-pruh, .vzp-pridat, .vzp-blok, .vzp-pozn-proto').forEach((e) => e.remove());
      document.querySelectorAll('.vzp-lab').forEach((e) => e.classList.remove('vzp-lab'));
      document.querySelectorAll('.vzp-pole').forEach((e) => e.classList.remove('vzp-pole', 'vzp-blik'));
      const hl = document.querySelector('#page-kalk .card.zak-bar');
      if (!hl) return;
      const sl = hl.querySelectorAll('.zak-head-col')[1];
      const vic = P.zak.length > 1;
      if (vic) {
        /* 2+ zákazníků: karta pod hlavičkou a přepínač zákazníků v hlavičce */
        const k = document.createElement('div'); k.className = 'card' + (noveVidet() ? ' vzp-nove' + (S.blik ? ' vzp-blik' : '') : ''); k.id = 'vzpKarta'; k.innerHTML = kartaHtml();
        hl.parentNode.insertBefore(k, hl.nextSibling);
        if (sl) {
          const r = document.createElement('div'); r.className = 'row vzp-chips-row' + (noveVidet() ? ' vzp-nove' : ''); r.innerHTML = chipsHtml();
          sl.insertBefore(r, sl.firstChild);
        }
      } else if (sl) {
        /* jeden zákazník: aplikace jako dnes, navíc JEN tlačítko u pole Zákazník */
        const lab = sl.querySelector('.row label');
        if (lab) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'mini noprint vzp-pridat' + (dalsiKrok() === 'form' && !S.hraje ? ' vzp-dalsi' : '');
          b.setAttribute('data-vzp', 'form'); b.title = 'Přidat dalšího zákazníka, který poptal tutéž zakázku'; b.textContent = 'Přidat zákazníka'; lab.classList.add('vzp-lab');
          if (!lze('form')) b.disabled = true;
          lab.appendChild(b);
        }
        const telo = hl.querySelector('.zak-head');
        const blok = formHtml() || (P.krok === 'vychozi' && !S.hraje ? '<div class="vzp-pozn-proto">▲ Poznámka prototypu: jediný rozdíl proti dnešní aplikaci je tlačítko <b>„Přidat zákazníka"</b> u pole Zákazník. Klikněte na něj.</div>'
          : (P.krok === 'odeberAno' ? '<div class="vzp-pozn-proto">Poznámka prototypu: zakázka má zase jednoho zákazníka — přepínač, karta i štítky zmizely, aplikace je ve standardním pohledu.</div>' : ''));
        if (telo && blok) { const d = document.createElement('div'); d.className = 'vzp-blok'; d.innerHTML = blok; telo.parentNode.insertBefore(d, telo.nextSibling); }
      }
      /* pole hlavičky patří zvolenému zákazníkovi — po změně řídícího / výběru je zvýrazníme */
      if (P.krok !== 'vychozi' && znacka('rz')) hl.querySelectorAll('.zak-head-col:nth-child(2) input[type=text]').forEach((e) => { e.classList.add('vzp-pole'); if (S.blik) e.classList.add('vzp-blik'); });
      const cn = document.querySelector('#ock-nabidka .body table');
      if (cn && vic) {
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
    const nazvy = { pohled: 'vzhled aplikace', varianty: 'varianty v zakázce', rz: 'řídící zákazník', rv: 'řídící varianta', 'pd.org': 'organizace dealu', 'pd.hodnota': 'hodnota dealu', 'pd.cn': 'číslo nabídky v dealu', 'pd.faze': 'fáze dealu', 'pd.dalsi': 'poznámka „Další zákazníci" u dealu', rejstrik: 'řádek rejstříku' };
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
      + (S.scenar === 'prodej' ? '<div class="vzp-sk"><label class="vzp-pop" for="vzpPd">Pipedrive</label>' + vyber('vzpPd', PD_STAVY, S.pd) + '</div>' : '')
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
      + radekPP('Vzhled aplikace', 'pohled') + radekPP('Řídící zákazník', 'rz') + radekPP('Řídící varianta', 'rv') + radekPP('Varianty v zakázce', 'varianty')
      + P.zak.map((z) => radekPP('Nabídka ' + z.kratce, 'z:' + z.id)).join('')
      + Object.keys(P.pred).filter((k) => k.indexOf('z:') === 0 && !Zk(k.slice(2))).map((k) => radekPP('Nabídka ' + FIRMY[k.slice(2)].kratce, k)).join('')
      + '<h3>Pipedrive — co se zapíše do dealu ' + DEAL_ID + '</h3>'
      + '<p>Deal nese jen data řídící varianty řídícího zákazníka. Nic se neodesílá — náhled.</p>'
      + radekPP('Organizace dealu', 'pd.org', orgNesedi() ? (P.orgStav === 'chyba' ? '⚠ zápis selhal — čeká na opakování' : '⚠ neodpovídá řídícímu zákazníkovi (řídící se změnil ručně, bez prodeje — organizace se přepisuje až při Prodáno)') : (P.orgStav === 'zapsano' ? 'přepsáno na vítězného zákazníka (podle IČO)' : ''))
      + radekPP('Hodnota dealu', 'pd.hodnota') + radekPP('Číslo nabídky (CN)', 'pd.cn') + radekPP('Fáze dealu', 'pd.faze')
      + '<div class="vzp-r"><span>Krycí list, odkaz na kalkulaci</span><span>z řídící varianty; odkaz beze změny</span></div>'
      + '<div class="vzp-r vzp-r-blok"><span>Poznámka u dealu „Další zákazníci na zakázce"' + stitek(zd) + '</span>'
      + (zd && P.pred['pd.dalsi'] ? '<div class="vzp-odp vzp-odp-pred">' + esc(P.pred['pd.dalsi']) + '</div>' : '')
      + '<div class="vzp-odp' + (zd ? ' vzp-odp-' + zd : '') + '">' + (d.dalsi ? esc(d.dalsi) : '— žádná poznámka (zakázka má jednoho zákazníka) —') + '</div></div>'
      + '<p>Jedna poznámka u dealu, kterou server při uložení zakázky přepisuje celou (stejný mechanismus jako poznámka se seznamem šachet). Pozná ji podle úvodu a značky čísla zakázky; nikdy ji nemaže. Vedle poznámky šachet je to samostatná poznámka.</p>'
      + '<h3>Náhled nabídky pro zákazníka</h3>' + nahledHtml()
      + '<h3>Přehled cenových nabídek (řádek rejstříku)</h3>' + radekPP('Řádek', 'rejstrik')
      + '<p>Hledání v Přehledu najde zakázku i podle názvu dalšího zákazníka.</p>'
      + '<h3>Protokol zakázky</h3>'
      + (P.protokol.length ? '<ol>' + stare.map((z) => '<li>' + esc(z.kdy) + ' · <b>' + esc(z.kdo) + '</b>: ' + esc(z.co) + '</li>').join('')
        + nove.map((z) => '<li class="vzp-h-pridano">' + esc(z.kdy) + ' · <b>' + esc(z.kdo) + '</b>: ' + esc(z.co) + stitek('pridano') + '</li>').join('') + '</ol>' : '<p>— prázdný —</p>')
      + '<h3>Pravidla návrhu</h3><ol>'
      + '<li>Dokud je zákazník jeden, je aplikace přesně jako dnes — navíc jen tlačítko „Přidat zákazníka" (jako u víc šachet).</li>'
      + '<li>První zákazník je řídící a nemá písmeno.</li>'
      + '<li>Další zákazník dostane písmeno (B, C…), které se už nikdy nezmění ani nepřidělí znovu. Číslo jeho nabídky = číslo varianty + písmeno.</li>'
      + '<li>Zákazník ukazuje na jednu variantu: sdílenou, nebo vlastní (kopii).</li>'
      + '<li>Tisk nabídky je vždy pro jednoho zákazníka; varianta se zamkne prvním tiskem, další tisk jinému zákazníkovi jen přidá razítko „komu".</li>'
      + '<li>Řídící varianta = varianta řídícího zákazníka. Prodáno jinému zákazníkovi z něj udělá řídícího (prodaná = řídící, #563).</li>'
      + '<li>Deal nese data řídící varianty; ostatní zákazníci jsou jen v jedné poznámce u dealu (název, platná nabídka, datum, cena bez DPH).</li>'
      + '<li>Při Prodáno jinému zákazníkovi se organizace dealu přepíše na vítěze: najde se podle IČO, jinak se založí. Selže-li zápis, prodej platí a zápis se zopakuje.</li>'
      + '<li>Řídícího zákazníka a organizaci dealu mění autor zakázky a administrátor.</li>'
      + '<li>Odstranit jde každého dalšího zákazníka (s potvrzením), ne řídícího a ne toho, komu se prodalo. Zákazníka, kterému už odešla nabídka, odstraní jen administrátor. Co mu odešlo, zůstává doložené v zámku varianty; neodeslaná vlastní varianta se smaže s ním.</li>'
      + '<li>Po odstranění posledního dalšího zákazníka je zakázka i aplikace stejná jako s jedním zákazníkem.</li></ol>';
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
    const cil = document.querySelector('#vzpKarta .vzp-potvrzeni') || document.querySelector('.vzp-form') || document.querySelector('.vzp-pozn-proto') || document.querySelector('#vzpKarta .vzp-pp') || document.getElementById('vzpKarta');
    if (cil && cil.scrollIntoView) cil.scrollIntoView({ block: 'center' });
  }

  const POPISY = { pridej: 'zákazník přidán (stejná varianta)', odesli: 'nabídka vytištěna (odeslána)', vlastni: 'založena vlastní varianta zákazníka', uprav: 'vlastní varianta upravena', sachty: 've vlastní variantě víc šachet',
    prodej: 'prodej — čeká na potvrzení', prodejAno: 'prodáno, řídící zákazník změněn', orgAno: 'organizace dealu přepsána (opakovaný zápis)', ridici: 'řídící zákazník změněn ručně',
    odeber: 'odstranění zákazníka — čeká na potvrzení', odeberAno: 'zákazník odstraněn', form: 'formulář nového zákazníka', varianta: 'zákazníkovi přiřazena jiná varianta' };
  function krok(a, arg) {
    const [co, id] = a.split(':');
    zHlavicky();
    P.chyba = '';
    if (co === 'reset') { vychozi(); S.blik = false; kresli(); window.scrollTo(0, 0); return; }
    if (co === 'vyber') { otevri(id); kresli(); return; }
    if (co === 'nahled') { S.nahled = id; if (id !== P.vybrany) otevri(id); S.otevreno = true; kresli(); const n = document.querySelector('#vzpPanel .vzp-papir'); if (n && n.scrollIntoView) n.scrollIntoView({ block: 'center' }); return; }
    if (co === 'formNe') { P.formular = false; kresli(); return; }
    if (co === 'potvNe') { P.potvrzeni = null; kresli(); return; }
    if (!lze(a)) return;
    const idx = SCENARE[S.scenar].kroky.findIndex((x) => x[0] === a);
    if (['prodej', 'form', 'odeber'].includes(co)) P.pred = snimek();   // krok jen otevírá potvrzení — nic se nemění
    if (co === 'prodej') { P.potvrzeni = { typ: 'prodej', id }; otevri(id); }
    else if (co === 'form') P.formular = true;
    else if (co === 'odeber') { P.potvrzeni = { typ: 'odeber', id }; P.formular = false; }
    else {
      P.pred = snimek(); P.formular = false;
      if (co === 'pridej') pridej(id, false);
      else if (co === 'pridejForm') pridej(id, arg === 'vlastni');
      else if (co === 'vlastni') vlastni(id);
      else if (co === 'uprav') uprav(id);
      else if (co === 'sachty') sachty(id);
      else if (co === 'odesli') odesli(id);
      else if (co === 'prodejAno') prodejAno();
      else if (co === 'orgAno') orgAno();
      else if (co === 'ridici') ridici(id);
      else if (co === 'odeberAno') odeberAno(arg);
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
    if (S.scenar === 'odeslana') S.role = 'admin';
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
    if (a === 'odeberAno') { const v = document.querySelector('input[name="vzpOdeber"]:checked'); krok(a, v ? v.value : 'smazat'); return; }
    krok(a);
  }
  function zmena(e) {
    const t = e.target; if (!t) return;
    if (t.id === 'vzpScenar' || t.id === 'vzpRole' || t.id === 'vzpPd') {
      zastav(); S[{ vzpScenar: 'scenar', vzpRole: 'role', vzpPd: 'pd' }[t.id]] = t.value;
      if (t.id === 'vzpScenar' && t.value === 'odeslana') S.role = 'admin';   // odstranit zákazníka s odeslanou nabídkou smí jen administrátor
      if (t.id !== 'vzpRole') { vychozi(); kresli(); window.scrollTo(0, 0); } else kresli();
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
    window.viceSachetZapnuto = function () { return true; };   // zkušební funkce víc šachet ZAP (jako na testovacím webu)
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
