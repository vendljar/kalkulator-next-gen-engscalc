/* ============================================================
 * VÍC ZÁKAZNÍKŮ NA JEDNÉ ZAKÁZCE (VZ, souhrn #598, etapa E0 = #599)
 *
 * Závazný návrh: podklady/NAVRH_VICE_ZAKAZNIKU.md (v3, rozhodnutí J. V.
 * 16. 11. 2026), § 1, § 2, § 2a, § 3, § 8. Tento modul je čistá logika —
 * žádné DOM, běží v prohlížeči i na serveru (netlify/lib/jadro_moduly.cjs).
 * Funkce za vypínačem `viceZakazniku` (výchozí VYP, rozhoduje server).
 *
 * DATA (vzor víc šachet: první na původním místě, ostatní v `dalsi…`):
 *   zak.objednatel, adresaObjednatele, ico, dic, kontakt, zastupci
 *                         ŘÍDÍCÍ zákazník (hlavička beze změny)
 *   zak.vzRidici          { id, pismeno, varianta } — JEN když je zákazníků víc
 *   zak.dalsiZakaznici[]  { id, pismeno, hlavicka: { objednatel, adresaObjednatele,
 *                           ico, dic, kontakt }, zastupci: { …jako zak.zastupci… },
 *                           varianta, zalozen: { kdo, kdy }, platna? }
 *
 * ŽÁDNÝ KLÍČ NAVÍC, DOKUD JE ZÁKAZNÍK JEDEN: `vzRidici` a `dalsiZakaznici`
 * vzniknou přidáním druhého zákazníka (vzPridej) a zmizí odstraněním
 * posledního dalšího (vzOdstran). Import je u jednoho zákazníka smaže.
 * Zakázka, která víc zákazníků nikdy neměla, je tak tvarem stejná jako dnes.
 *
 * `platna` (poslední ODESLANÁ nabídka zákazníka) počítá server ze zámků (E3);
 * z prohlížeče se nebere (vzPlatnaDrz). `hlavicka` má STEJNÉ KLÍČE jako
 * hlavička zakázky — ares.js (aresRozdily, aresPrepis) nad ní pracuje beze
 * změny (test_vz_model.js).
 *
 * Písmeno zákazníka (číslo nabídky …9940-B, § 3) se nepočítá z čítače:
 * nové = první volné za nejvyšším, které nese některý zákazník NEBO razítko
 * tisku v zámku (`zamek.tisky[].zakaznik.pismeno`, plní E3). Písmeno, se
 * kterým něco odešlo, se tak nepřidělí znovu; písmeno bez odeslání se po
 * odstranění uvolní — bez stopy v datech. Totéž platí pro `id`.
 *
 * STABILNÍ API pro E1, E2, E5 (popsáno i v PREDAVKA.md):
 *   vzRezim, vzZakaznici, vzZakaznik, vzRidiciId, vzPridej, vzOdstran,
 *   vzPismenoDalsi, vzIdDalsi, vzVymenRidiciho, vzSrovnej, vzPohled,
 *   vzTvarProblemy, vzOcisti, vzPodpis, vzPlatnaDrz, vzMaData.
 * Pravidlo sestavení: jeden <script> — všechna jména s předponou `vz`/`VZ_`.
 * ============================================================ */

const VZ_DALSI_MAX = 9;          // strop dalších zákazníků (§ 3, doporučení UI = tvrdý strop serveru)
const VZ_TEXT_MAX = 500;
const VZ_KL_TEXT_MAX = 5000;    // ruční hodnota pole krycího listu zákazníka (E3, U1)         // délka textového pole zákazníka (hlavička zakázky strop nemá; zvoleno E0)
const VZ_RIDICI_ID = 'z1';       // id řídícího zákazníka, dokud se nevymění
const VZ_ID_TVAR = /^z[1-9][0-9]{0,2}$/;
const VZ_PISMENO_TVAR = /^[B-Z]$/;
const VZ_PISMENA = 'BCDEFGHIJKLMNOPQRSTUVWXYZ';
/* Pole hlavičky zákazníka = pole hlavičky zakázky, která patří firmě
 * (ne stavbě): přesně tato se mezi hlavičkou a položkou vyměňují. */
const VZ_HLAVICKA_POLE = ['objednatel', 'adresaObjednatele', 'ico', 'dic', 'kontakt'];
/* Pole zástupců — týž seznam, jaký zakládá novaZakazka / importZakazka. */
const VZ_ZASTUPCI_POLE = ['smluvniJmeno', 'smluvniPozice', 'smluvniTel', 'smluvniEmail',
  'obchodniJmeno', 'obchodniTel', 'obchodniEmail',
  'technickyJmeno', 'technickyTel', 'technickyEmail',
  'fakturyEmail', 'fakturyTel', 'banka', 'ucet', 'zapis'];
const VZ_RIDICI_KLICE = ['id', 'pismeno', 'varianta'];
const VZ_DALSI_KLICE = ['id', 'pismeno', 'hlavicka', 'zastupci', 'varianta', 'zalozen', 'platna'];
const VZ_PLATNA_KLICE = ['varianta', 'cislo', 'kdy', 'cena', 'mena'];
/* Otisky webhooku (pdZadani.otisk), které výměna řídícího smaže (§ 2, § 7.3):
 * pole firmy. `kontakt` navíc proti návrhu — bezpečnější (osoba patří firmě). */
const VZ_OTISK_FIRMA = ['objednatel', 'adresaObjednatele', 'ico', 'dic', 'kontakt'];
/* Pole psaná serverem s údaji řídícího zákazníka / dealu — v pohledu
 * DALŠÍHO zákazníka nemají co dělat (deal vede řídící). */
const VZ_POHLED_BEZ = ['pdZadani', 'pdStav', 'pdVazbaWebhook', 'pdDealyOdmitnute',
  'pdPoznamkaSachty', 'pdPoznamkaZakaznici', 'pdOrgVitez', 'pdOrgDealu', 'pdOdeslani'];

const vzObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
const vzText = x => (typeof x === 'string' ? x : (x == null ? '' : String(x)));
const vzKop = x => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

function vzDalsi(zak) {
  return (zak && Array.isArray(zak.dalsiZakaznici)) ? zak.dalsiZakaznici.filter(vzObj) : [];
}

/* Režim víc zákazníků: aspoň jeden další zákazník (2+ zákazníků). */
function vzRezim(zak) {
  return vzDalsi(zak).length > 0;
}

/* Má zakázka data víc zákazníků podle SYROVÝCH hodnot (pro vypínač na
 * serveru): cokoli, co by z jednoho zákazníka dělalo víc (i prázdné pole). */
function vzMaData(zak) {
  return !!zak && typeof zak === 'object' && (zak.dalsiZakaznici !== undefined || zak.vzRidici !== undefined);
}

function vzRidiciId(zak) {
  const r = zak && zak.vzRidici;
  return (vzObj(r) && typeof r.id === 'string' && r.id) ? r.id : VZ_RIDICI_ID;
}

function vzRidiciVariantaId(zak) {
  const v = (zak && Array.isArray(zak.varianty)) ? (zak.varianty.find(x => x && x.ridici) || zak.varianty[0]) : null;
  return v ? String(v.id) : '';
}

function vzZastupciPrazdni() {
  const o = {};
  VZ_ZASTUPCI_POLE.forEach(k => { o[k] = ''; });
  return o;
}
function vzZastupciZ(x) {
  const o = vzZastupciPrazdni();
  if (vzObj(x)) VZ_ZASTUPCI_POLE.forEach(k => { if (x[k] != null) o[k] = vzText(x[k]); });
  return o;
}
function vzHlavickaZ(x) {
  const o = {};
  VZ_HLAVICKA_POLE.forEach(k => { o[k] = vzObj(x) && x[k] != null ? vzText(x[k]) : ''; });
  return o;
}

/* Jednotný seznam zákazníků: řídící (z hlavičky) první, pak další.
 * [{ id, pismeno, ridici, hlavicka, zastupci, varianta, zalozen, platna }]
 * `hlavicka` a `zastupci` jsou KOPIE — zápis jde přes hlavičku / položku. */
function vzZakaznici(zak) {
  if (!zak || typeof zak !== 'object') return [];
  const r = vzObj(zak.vzRidici) ? zak.vzRidici : {};
  const ridici = {
    id: vzRidiciId(zak),
    pismeno: typeof r.pismeno === 'string' ? r.pismeno : '',
    ridici: true,
    hlavicka: vzHlavickaZ(zak),
    zastupci: vzZastupciZ(zak.zastupci),
    varianta: vzRidiciVariantaId(zak),
    zalozen: null,
    platna: null,
  };
  return [ridici].concat(vzDalsi(zak).map(d => ({
    id: String(d.id || ''),
    pismeno: typeof d.pismeno === 'string' ? d.pismeno : '',
    ridici: false,
    hlavicka: vzHlavickaZ(d.hlavicka),
    zastupci: vzZastupciZ(d.zastupci),
    varianta: String(d.varianta || ''),
    zalozen: vzObj(d.zalozen) ? vzKop(d.zalozen) : null,
    platna: vzObj(d.platna) ? vzKop(d.platna) : null,
  })));
}

function vzZakaznik(zak, id) {
  return vzZakaznici(zak).find(z => z.id === String(id)) || null;
}

/* Razítka tisků s adresátem (zamek.tisky[].zakaznik, plní E3) ze všech variant. */
/* VZ-E4 (Z2, revize poradce): i razítka ze ZÁMKŮ V HISTORII ODEMČENÍ
 * (`v.odemceni[].zamek.tisky`) — doklad „odešla nabídka" po odemčení varianty
 * nezmizí, písmeno ani id se proto neuvolní (historii drží server,
 * uloZamekRazitkaDrz). */
function vzRazitkaZakazniku(zak) {
  const out = [];
  ((zak && Array.isArray(zak.varianty)) ? zak.varianty : []).forEach(v => {
    const t = v && v.zamek && Array.isArray(v.zamek.tisky) ? v.zamek.tisky : [];
    t.forEach(x => { if (x && vzObj(x.zakaznik)) out.push(x.zakaznik); });
    vzTiskyHistorie(v).forEach(x => { if (vzObj(x.zakaznik)) out.push(x.zakaznik); });
  });
  return out;
}
/* Tisky ze zámků v historii odemčení varianty (Z2). */
function vzTiskyHistorie(v) {
  const out = [];
  (v && Array.isArray(v.odemceni) ? v.odemceni : []).forEach(o => {
    const t = vzObj(o) && vzObj(o.zamek) && Array.isArray(o.zamek.tisky) ? o.zamek.tisky : [];
    t.forEach(x => { if (vzObj(x)) out.push(x); });
  });
  return out;
}

/* Další písmeno: první za nejvyšším ze zákazníků a razítek; strop Z → ''. */
function vzPismenoDalsi(zak) {
  let max = 0;   // index v VZ_PISMENA + 1 (0 = žádné)
  const vezmi = p => { const i = VZ_PISMENA.indexOf(typeof p === 'string' && p.length === 1 ? p : '#'); if (i + 1 > max) max = i + 1; };
  vzDalsi(zak).forEach(d => vezmi(d.pismeno));
  if (vzObj(zak && zak.vzRidici)) vezmi(zak.vzRidici.pismeno);
  vzRazitkaZakazniku(zak).forEach(z => vezmi(z.pismeno));
  return max < VZ_PISMENA.length ? VZ_PISMENA[max] : '';
}

/* Další id: z<N> za nejvyšším ze zákazníků a razítek (id s odeslanou
 * nabídkou se tak nepřidělí jinému zákazníkovi). */
function vzIdDalsi(zak) {
  let max = 1;
  const vezmi = id => { const m = /^z([1-9][0-9]{0,2})$/.exec(typeof id === 'string' ? id : ''); if (m && +m[1] > max) max = +m[1]; };
  vezmi(vzRidiciId(zak));
  vzDalsi(zak).forEach(d => vezmi(d.id));
  vzRazitkaZakazniku(zak).forEach(z => vezmi(z.id));
  return 'z' + (max + 1);
}

/* VZ-F1 (VZ-N1, #654): IČO pro porovnání — jen číslice ('' = bez IČO).
 * #674 b: úvodní nuly na 8 číslic („027182818" = „27182818", „1234567" =
 * „01234567"); delší číslo bez úvodních nul zůstává, jak je. */
function vzIcoKlic(ico) {
  let k = vzText(ico).replace(/\D+/g, '');
  if (k.length > 8) k = k.replace(/^0+(?=\d{8})/, '');
  return (k && k.length < 8) ? k.padStart(8, '0') : k;
}
/* Zákazník zakázky se stejným IČO (jiný než `kromeId`), nebo null.
 * Zákazníci bez IČO se nehlídají. */
function vzIcoDuplicita(zak, ico, kromeId) {
  const k = vzIcoKlic(ico);
  if (!k) return null;
  return vzZakaznici(zak).find(z => z.id !== String(kromeId == null ? '' : kromeId) && vzIcoKlic(z.hlavicka.ico) === k) || null;
}
function vzIcoDuplicitaText(z) {
  return 'Zákazník s tímto IČO už v zakázce je (' + (vzText(z && z.hlavicka && z.hlavicka.objednatel).trim() || (z && z.id) || '?') + ').';
}

/* PŘIDÁNÍ ZÁKAZNÍKA (§ 2a). `udaje` = { objednatel, adresaObjednatele, ico,
 * dic, kontakt, zastupci? }; volby { vlastni, zdroj, kdo, kdy, nazevVarianty }.
 *   vlastni: false (výchozí) — sdílí variantu řídícího zákazníka;
 *            true — vlastní varianta = klonujVariantu(zdroj) + ukazatel.
 * První volání založí `vzRidici` (id z1, písmeno '', varianta = řídící).
 * Vrací { ok: true, zakaznik } nebo { ok: false, chyba } (zakázka beze změny). */
function vzPridej(zak, udaje, volby) {
  const o = volby || {};
  if (!zak || !Array.isArray(zak.varianty) || !zak.varianty.length) return { ok: false, chyba: 'Zakázka nemá variantu.' };
  const h = vzHlavickaZ(udaje);
  if (!h.objednatel.trim()) return { ok: false, chyba: 'Vyplňte název zákazníka.' };
  if (VZ_HLAVICKA_POLE.some(k => h[k].length > VZ_TEXT_MAX)) return { ok: false, chyba: 'Údaj zákazníka je příliš dlouhý (nejvýš ' + VZ_TEXT_MAX + ' znaků).' };
  if (vzDalsi(zak).length >= VZ_DALSI_MAX) return { ok: false, chyba: 'Zakázka má nejvýš ' + (VZ_DALSI_MAX + 1) + ' zákazníků.' };
  const dupl = vzIcoDuplicita(zak, h.ico);   // VZ-F1 (VZ-N1): týž subjekt podruhé ne
  if (dupl) return { ok: false, chyba: vzIcoDuplicitaText(dupl) };
  const pismeno = vzPismenoDalsi(zak);
  if (!pismeno) return { ok: false, chyba: 'Písmena zákazníků došla (nejvýš Z).' };
  const ridiciVar = vzRidiciVariantaId(zak);
  let varianta = ridiciVar;
  if (o.vlastni) {
    if (typeof klonujVariantu !== 'function') return { ok: false, chyba: 'Vlastní variantu teď nejde založit.' };
    const zdroj = o.zdroj ? String(o.zdroj) : ridiciVar;
    if (!zak.varianty.some(v => v && String(v.id) === zdroj)) return { ok: false, chyba: 'Zdrojová varianta neexistuje.' };
    const kopie = klonujVariantu(zak, zdroj, { aktivovat: false, nazev: o.nazevVarianty || undefined });
    if (!kopie) return { ok: false, chyba: 'Vlastní variantu se nepodařilo založit.' };
    varianta = String(kopie.id);
  }
  if (!vzObj(zak.vzRidici)) zak.vzRidici = { id: VZ_RIDICI_ID, pismeno: '', varianta: ridiciVar };
  if (!Array.isArray(zak.dalsiZakaznici)) zak.dalsiZakaznici = [];
  const zakaznik = {
    id: vzIdDalsi(zak),
    pismeno,
    hlavicka: h,
    zastupci: vzZastupciZ(udaje && udaje.zastupci),
    varianta,
    zalozen: { kdo: vzText(o.kdo), kdy: o.kdy ? vzText(o.kdy) : new Date().toISOString() },
  };
  zak.dalsiZakaznici.push(zakaznik);
  return { ok: true, zakaznik };
}

/* Je varianta „vlastní" pro zákazníka `id` — ukazuje na ni jen on a není řídící? */
function vzVariantaJenJeho(zak, id, varId) {
  return vzZakaznici(zak).filter(z => z.varianta === varId).every(z => z.id === id)
    && varId !== vzRidiciVariantaId(zak);
}

/* ODSTRANĚNÍ ZÁKAZNÍKA (§ 2a). Řídícího odmítne; prodaného (prodano.zakaznik)
 * taky. `smazatVariantu` smaže jen jeho vlastní NEZAMČENOU variantu (zamčená
 * zůstává jako doklad). Po posledním dalším smaže `vzRidici` i `dalsiZakaznici`.
 * Práva (odeslaná nabídka = jen administrátor) hlídá server (E3).
 * Vrací { ok: true, smazanaVarianta: id|'' } nebo { ok: false, chyba }. */
function vzOdstran(zak, id, volby) {
  const o = volby || {};
  const sid = String(id);
  if (!zak || !Array.isArray(zak.dalsiZakaznici)) return { ok: false, chyba: 'Zakázka nemá další zákazníky.' };
  if (sid === vzRidiciId(zak)) return { ok: false, chyba: 'Řídícího zákazníka nejde odstranit — nejdřív udělejte řídícím jiného.' };
  const i = zak.dalsiZakaznici.findIndex(d => vzObj(d) && String(d.id) === sid);
  if (i < 0) return { ok: false, chyba: 'Zákazník v zakázce není.' };
  const d = zak.dalsiZakaznici[i];
  const prodana = (zak.varianty || []).some(v => v && vzObj(v.prodano) && String(v.prodano.zakaznik || '') === sid);
  if (prodana) return { ok: false, chyba: 'Zákazníkovi se prodalo — nejdřív odemkněte prodej (vedoucí, administrátor).' };
  const kolaps = vzOdstranKolapsDuvod(zak, sid);   // E4: návrat k jednomu zákazníkovi, který není původní z1
  if (kolaps) return { ok: false, chyba: kolaps };
  let smazana = '';
  const varId = String(d.varianta || '');
  const v = (zak.varianty || []).find(x => x && String(x.id) === varId);
  const zamcena = v && (typeof variantaUzamcena === 'function' ? variantaUzamcena(v) : !!(v.zamek && v.zamek.zamceno));
  if (o.smazatVariantu && v && !zamcena && zak.varianty.length > 1 && vzVariantaJenJeho(zak, sid, varId)) {
    zak.varianty = zak.varianty.filter(x => x !== v);
    if (!zak.varianty.some(x => x && x.ridici)) zak.varianty[0].ridici = true;
    if (zak.aktivni === v.id) zak.aktivni = vzRidiciVariantaId(zak);
    smazana = varId;
  }
  zak.dalsiZakaznici.splice(i, 1);
  vzKlOdstranZakaznika(zak, sid);   // E3 (U1): jeho ruční hodnoty krycích listů
  if (!vzDalsi(zak).length) {
    const ridici = vzRidiciId(zak);
    delete zak.dalsiZakaznici; delete zak.vzRidici;
    vzKlUklid(zak, ridici);   // V3: zpět jeden zákazník — bez stopy v krycích listech
  }
  return { ok: true, smazanaVarianta: smazana };
}

/* VÝMĚNA ŘÍDÍCÍHO (§ 2): hlavička ↔ položka, řídící varianta = varianta
 * nového řídícího (nastavRidici), písmena beze změny, otisky webhooku pro
 * pole firmy pryč. Práva (autor, administrátor) hlídá server (E4).
 * Vrací { ok: true } nebo { ok: false, chyba }. */
function vzVymenRidiciho(zak, id) {
  const sid = String(id);
  if (!vzRezim(zak)) return { ok: false, chyba: 'Zakázka má jednoho zákazníka.' };
  if (sid === vzRidiciId(zak)) return { ok: true };
  const i = zak.dalsiZakaznici.findIndex(d => vzObj(d) && String(d.id) === sid);
  if (i < 0) return { ok: false, chyba: 'Zákazník v zakázce není.' };
  const d = zak.dalsiZakaznici[i];
  const varId = String(d.varianta || '');
  if (!zak.varianty.some(v => v && String(v.id) === varId)) return { ok: false, chyba: 'Varianta zákazníka neexistuje.' };
  /* N5 (revize Fable): bývalý řídící se stane položkou dalsiZakaznici —
   * musí projít tvarem (název, délky), jinak by vznikla neuložitelná zakázka. */
  const sh = vzHlavickaZ(zak), sz = vzZastupciZ(zak.zastupci);
  if (!sh.objednatel.trim())
    return { ok: false, chyba: 'Řídící zákazník nemá vyplněný název — doplňte ho v hlavičce před výměnou řídícího.' };
  if (VZ_HLAVICKA_POLE.some(k => sh[k].length > VZ_TEXT_MAX) || VZ_ZASTUPCI_POLE.some(k => sz[k].length > VZ_TEXT_MAX))
    return { ok: false, chyba: 'Údaj řídícího zákazníka je delší než ' + VZ_TEXT_MAX + ' znaků — zkraťte ho před výměnou řídícího.' };
  const r = vzObj(zak.vzRidici) ? zak.vzRidici : { id: VZ_RIDICI_ID, pismeno: '', varianta: vzRidiciVariantaId(zak) };
  const stary = {
    id: vzRidiciId(zak),
    pismeno: typeof r.pismeno === 'string' ? r.pismeno : '',
    hlavicka: vzHlavickaZ(zak),
    zastupci: vzZastupciZ(zak.zastupci),
    varianta: vzRidiciVariantaId(zak),
  };
  /* E4 (doplněk poradce 3): ruční hodnoty polí zákazníka v krycích listech
   * bez značky vlastníka patří z1 (vzKlRucni) — při výměně se vlastník
   * zapíše výslovně, aby po případném odstranění z1 nepřipadly nikomu jinému. */
  vzKlZafixuj(zak);
  const nh = vzHlavickaZ(d.hlavicka);
  VZ_HLAVICKA_POLE.forEach(k => { zak[k] = nh[k]; });
  zak.zastupci = vzZastupciZ(d.zastupci);
  /* N1 (revize Fable): firemní pole hlavičky PROJ patří řídícímu taky —
   * jinak by po výměně nesla firmu bývalého řídícího (únik do PROJ). */
  vzProjFirma(zak, nh);
  zak.vzRidici = { id: String(d.id), pismeno: typeof d.pismeno === 'string' ? d.pismeno : '', varianta: varId };
  zak.dalsiZakaznici[i] = stary;
  if (typeof nastavRidici === 'function') nastavRidici(zak, varId);
  else zak.varianty.forEach(v => { if (v) v.ridici = String(v.id) === varId; });
  const p = zak.pdZadani;
  if (vzObj(p) && vzObj(p.otisk)) VZ_OTISK_FIRMA.forEach(k => { delete p.otisk[k]; });
  return { ok: true };
}

/* Firemní pole hlavičky PROJ podle zákazníka (vzPohled, vzVymenRidiciho).
 * `dic` jen tam, kde ho hlavička PROJ vede (starší ho nemají). Na místě. */
function vzProjFirma(cil, hlavicka) {
  if (!cil || !vzObj(cil.projHlavicka)) return;
  VZ_HLAVICKA_POLE.forEach(k => { if (k !== 'dic' || k in cil.projHlavicka) cil.projHlavicka[k] = hlavicka[k]; });
}

/* Ukazatele na NEEXISTUJÍCÍ variantu (smazaná varianta, ruční úprava) →
 * řídící varianta. N2 (revize Fable): zákazník se kvůli tomu nezahazuje.
 * Vrací seznam oprav. Na místě. */
function vzUkazateleOprav(zak) {
  const out = [];
  if (!zak || !Array.isArray(zak.varianty) || !zak.varianty.length) return out;
  const ridiciVar = vzRidiciVariantaId(zak);
  const ids = new Set(zak.varianty.filter(vzObj).map(v => String(v.id)));
  if (vzObj(zak.vzRidici) && !ids.has(String(zak.vzRidici.varianta == null ? '' : zak.vzRidici.varianta))) {
    zak.vzRidici.varianta = ridiciVar; out.push('vzRidici.varianta');
  }
  if (Array.isArray(zak.dalsiZakaznici)) zak.dalsiZakaznici.forEach((d, i) => {
    if (vzObj(d) && !ids.has(String(d.varianta == null ? '' : d.varianta))) { d.varianta = ridiciVar; out.push('dalsiZakaznici[' + i + '].varianta'); }
  });
  return out;
}

/* INVARIANT (§ 2): řídící varianta zakázky = varianta řídícího zákazníka.
 * Pravdou je příznak `v.ridici` (čte ho Pipedrive, prodej #563, zámek);
 * `vzRidici.varianta` se srovná podle něj. Opraví i ukazatele dalších
 * zákazníků na neexistující variantu (→ řídící). Vrací seznam oprav
 * ([] = nic): ['vzRidici.varianta', 'dalsiZakaznici[i].varianta', …]. */
function vzSrovnej(zak) {
  const out = [];
  if (!vzRezim(zak)) return out;
  const ridiciVar = vzRidiciVariantaId(zak);
  if (!vzObj(zak.vzRidici)) { zak.vzRidici = { id: VZ_RIDICI_ID, pismeno: '', varianta: ridiciVar }; out.push('vzRidici'); }
  else if (String(zak.vzRidici.varianta || '') !== ridiciVar) { zak.vzRidici.varianta = ridiciVar; out.push('vzRidici.varianta'); }
  return out.concat(vzUkazateleOprav(zak).filter(x => x !== 'vzRidici.varianta'));
}

/* POHLED ZÁKAZNÍKA (§ 4, R1): mělká kopie zakázky, ve které hlavička,
 * zástupci (a hlavička PROJ u dalšího zákazníka) nesou údaje zvoleného
 * zákazníka a ostatní zákazníci v ní VŮBEC NEJSOU (žádné `dalsiZakaznici`
 * ani `vzRidici`). Jediný údaj navíc: `vzPohledZakaznika = { id, pismeno }`.
 * Varianty jsou sdílené (tisk zamyká skutečnou variantu). Čísla s písmenem
 * řeší E2. Neznámé id → null. Zakázka s jedním zákazníkem a id řídícího
 * (nebo bez id) → kopie téže zakázky + vzPohledZakaznika. */
function vzPohled(zak, id) {
  if (!zak || typeof zak !== 'object') return null;
  const sid = id == null || id === '' ? vzRidiciId(zak) : String(id);
  const z = vzZakaznik(zak, sid);
  if (!z) return null;
  const p = Object.assign({}, zak);
  delete p.dalsiZakaznici;
  delete p.vzRidici;
  if (!z.ridici) {
    VZ_HLAVICKA_POLE.forEach(k => { p[k] = z.hlavicka[k]; });
    p.zastupci = z.zastupci;
    if (vzObj(zak.projHlavicka)) { p.projHlavicka = Object.assign({}, zak.projHlavicka); vzProjFirma(p, z.hlavicka); }
    VZ_POHLED_BEZ.forEach(k => { delete p[k]; });
  }
  /* N3 (rozhodnutí koordinace po revizi Fable): pohled nese JEN varianty,
   * které zákazník smí vidět — další zákazník jen svou; řídící všechny
   * kromě těch, na které ukazuje jen některý další zákazník (vlastní
   * varianty ostatních: název, cena, razítka). Bez filtru (jeden zákazník,
   * vše sdílené) zůstává TÉŽ pole `varianty` (zlatá sada). */
  if (Array.isArray(zak.varianty)) {
    const cizi = new Set(), ridiciVar = vzRidiciVariantaId(zak);
    vzDalsi(zak).forEach(d => { const x = String(d.varianta || ''); if (x && x !== ridiciVar) cizi.add(x); });
    const smi = v => vzObj(v) && (z.ridici ? !cizi.has(String(v.id)) : String(v.id) === z.varianta);
    if (!zak.varianty.every(smi)) {
      p.varianty = zak.varianty.filter(smi);
      if (!p.varianty.some(v => String(v.id) === String(p.aktivni)))
        p.aktivni = z.ridici ? ridiciVar : z.varianta;
    }
  }
  p.vzPohledZakaznika = { id: z.id, pismeno: z.pismeno, ridici: !!z.ridici };   // ridici: revize E2 U2
  return p;
}

/* VADY TVARU (server se ZAP odmítne 400, import klíče zahodí).
 * [{ kde, duvod }]; duvod: 'typ' | 'limit' | 'duplicita' | 'varianta' | 'delka' | 'klic'. */
function vzTvarProblemy(zak) {
  const out = [];
  if (!zak || typeof zak !== 'object') return out;
  const maR = zak.vzRidici !== undefined, maD = zak.dalsiZakaznici !== undefined;
  if (!maR && !maD) return out;
  const r = zak.vzRidici;
  if (!vzObj(r)) { out.push({ kde: 'vzRidici', duvod: 'typ' }); return out; }
  if (!Array.isArray(zak.dalsiZakaznici) || !zak.dalsiZakaznici.length) { out.push({ kde: 'dalsiZakaznici', duvod: 'typ' }); return out; }
  if (zak.dalsiZakaznici.length > VZ_DALSI_MAX) { out.push({ kde: 'dalsiZakaznici', duvod: 'limit' }); return out; }
  const variantyIds = new Set((Array.isArray(zak.varianty) ? zak.varianty : []).filter(vzObj).map(v => String(v.id)));
  const ids = new Set(), pismena = new Set();
  const idOk = (x, c) => {
    if (typeof x !== 'string' || !VZ_ID_TVAR.test(x)) { out.push({ kde: c, duvod: 'typ' }); return; }
    if (ids.has(x)) out.push({ kde: c, duvod: 'duplicita' }); else ids.add(x);
  };
  const pismenoOk = (x, c) => {
    if (typeof x !== 'string' || (x !== '' && !VZ_PISMENO_TVAR.test(x))) { out.push({ kde: c, duvod: 'typ' }); return; }
    if (pismena.has(x)) out.push({ kde: c, duvod: 'duplicita' }); else pismena.add(x);
  };
  const variantaOk = (x, c) => {
    if (typeof x !== 'string' || !x) out.push({ kde: c, duvod: 'typ' });
    else if (!variantyIds.has(x)) out.push({ kde: c, duvod: 'varianta' });
  };
  const textyOk = (o, pole, c) => {
    if (!vzObj(o)) { out.push({ kde: c, duvod: 'typ' }); return; }
    Object.keys(o).forEach(k => {
      if (pole.indexOf(k) < 0) out.push({ kde: c + '.' + k, duvod: 'klic' });
      else if (typeof o[k] !== 'string') out.push({ kde: c + '.' + k, duvod: 'typ' });
      else if (o[k].length > VZ_TEXT_MAX) out.push({ kde: c + '.' + k, duvod: 'delka' });
    });
  };
  Object.keys(r).filter(k => VZ_RIDICI_KLICE.indexOf(k) < 0).forEach(k => out.push({ kde: 'vzRidici.' + k, duvod: 'klic' }));
  idOk(r.id, 'vzRidici.id');
  pismenoOk(r.pismeno, 'vzRidici.pismeno');
  variantaOk(r.varianta, 'vzRidici.varianta');
  zak.dalsiZakaznici.forEach((d, i) => {
    const c = 'dalsiZakaznici[' + i + ']';
    if (!vzObj(d)) { out.push({ kde: c, duvod: 'typ' }); return; }
    Object.keys(d).filter(k => VZ_DALSI_KLICE.indexOf(k) < 0).forEach(k => out.push({ kde: c + '.' + k, duvod: 'klic' }));
    idOk(d.id, c + '.id');
    pismenoOk(d.pismeno, c + '.pismeno');
    variantaOk(d.varianta, c + '.varianta');
    textyOk(d.hlavicka, VZ_HLAVICKA_POLE, c + '.hlavicka');
    if (vzObj(d.hlavicka) && !vzText(d.hlavicka.objednatel).trim()) out.push({ kde: c + '.hlavicka.objednatel', duvod: 'typ' });
    textyOk(d.zastupci, VZ_ZASTUPCI_POLE, c + '.zastupci');
    if (d.zalozen !== undefined && d.zalozen !== null) {
      if (!vzObj(d.zalozen)) out.push({ kde: c + '.zalozen', duvod: 'typ' });
      else textyOk(d.zalozen, ['kdo', 'kdy'], c + '.zalozen');
    }
    if (d.platna !== undefined && d.platna !== null && !vzObj(d.platna)) out.push({ kde: c + '.platna', duvod: 'typ' });
  });
  /* E3 (U1): ruční hodnoty krycích listů po zákaznících — { id: { pole: text } }. */
  (Array.isArray(zak.varianty) ? zak.varianty : []).forEach((v, i) => ['kryci', 'kryciProj'].forEach(list => {
    const hz = vzObj(v) && vzObj(v.data) && vzObj(v.data[list]) ? v.data[list].hodnotyZakaznika : undefined;
    if (hz === undefined) return;
    const c = 'varianty[' + i + '].data.' + list + '.hodnotyZakaznika';
    if (!vzObj(hz)) { out.push({ kde: c, duvod: 'typ' }); return; }
    Object.keys(hz).forEach(id => {
      if (!VZ_ID_TVAR.test(id) || !vzObj(hz[id])) { out.push({ kde: c + '.' + id, duvod: 'typ' }); return; }
      Object.keys(hz[id]).forEach(k => { if (typeof hz[id][k] !== 'string' || hz[id][k].length > VZ_KL_TEXT_MAX) out.push({ kde: c + '.' + id + '.' + k, duvod: 'typ' }); });
    });
  }));
  return out;
}

/* OČISTA PŘI IMPORTU (§ E0 bod 3): neznámé klíče pryč (tiše — novější verze
 * smí přidat pole), u jednoho zákazníka (prázdný seznam) oba klíče pryč;
 * vadný tvar = oba klíče pryč a vrácený seznam vad (importZakazka ho dá
 * do nevýčtové vlastnosti `vzZahozeno`, jako fotoZahozena). Na místě. */
function vzOcisti(zak) {
  if (!zak || typeof zak !== 'object' || !vzMaData(zak)) return [];
  const pryc = () => { delete zak.vzRidici; delete zak.dalsiZakaznici; };
  if (Array.isArray(zak.dalsiZakaznici) && !zak.dalsiZakaznici.length && (zak.vzRidici === undefined || vzObj(zak.vzRidici))) { pryc(); return []; }
  const bez = (o, klice) => { if (vzObj(o)) Object.keys(o).forEach(k => { if (klice.indexOf(k) < 0) delete o[k]; }); };
  bez(zak.vzRidici, VZ_RIDICI_KLICE);
  if (Array.isArray(zak.dalsiZakaznici)) zak.dalsiZakaznici.forEach(d => {
    if (!vzObj(d)) return;
    bez(d, VZ_DALSI_KLICE);
    bez(d.hlavicka, VZ_HLAVICKA_POLE);
    bez(d.zastupci, VZ_ZASTUPCI_POLE);
    bez(d.zalozen, ['kdo', 'kdy']);
    bez(d.platna, VZ_PLATNA_KLICE);
    /* Chybějící pole hlavičky a zástupců doplnit prázdná (jako importZakazka
     * u hlavičky zakázky) — tvar je pak úplný a ARES nad ním pracuje. */
    if (vzObj(d.hlavicka)) VZ_HLAVICKA_POLE.forEach(k => { if (d.hlavicka[k] == null) d.hlavicka[k] = ''; });
    if (d.zastupci === undefined) d.zastupci = vzZastupciPrazdni();
    else if (vzObj(d.zastupci)) VZ_ZASTUPCI_POLE.forEach(k => { if (d.zastupci[k] == null) d.zastupci[k] = ''; });
  });
  /* N2 (revize Fable): ukazatel na smazanou variantu není důvod zákazníka
   * zahodit — přesměruje se na řídící variantu, teprve pak se hlídá tvar. */
  if (vzObj(zak.vzRidici) && Array.isArray(zak.dalsiZakaznici)) vzUkazateleOprav(zak);
  const p = vzTvarProblemy(zak);
  if (p.length) { pryc(); return p; }
  return [];
}

/* Podpis části víc zákazníků pro porovnání s uloženou verzí ('' = žádná).
 * `platna` a `zalozen` (E3, N4) se neporovnávají — píše je jen server. */
function vzPodpis(zak) {
  if (!vzMaData(zak)) return '';
  const d = Array.isArray(zak.dalsiZakaznici)
    ? zak.dalsiZakaznici.map(x => { if (!vzObj(x)) return x; const y = Object.assign({}, x); delete y.platna; delete y.zalozen; return y; })
    : zak.dalsiZakaznici;
  return JSON.stringify({ r: zak.vzRidici === undefined ? null : zak.vzRidici, d: d === undefined ? null : d });
}

/* `platna` píše jen server (E3 ji počítá ze zámků): hodnota z prohlížeče
 * se zahodí, platí ULOŽENÁ verze u zákazníka se stejným id. Na místě. */
function vzPlatnaDrz(stara, zak) {
  if (!zak || !Array.isArray(zak.dalsiZakaznici)) return;
  const ulozene = new Map(vzDalsi(stara).map(d => [String(d.id), d.platna]));
  zak.dalsiZakaznici.forEach(d => {
    if (!vzObj(d)) return;
    const p = ulozene.get(String(d.id));
    if (vzObj(p)) d.platna = vzKop(p); else delete d.platna;
  });
}

/* Lidský text k nálezům vzTvarProblemy (hláška serveru). */
function vzTvarText(p) {
  if (!Array.isArray(p) || !p.length) return '';
  if (p.some(x => x.duvod === 'limit')) return 'víc zákazníků, než dovoluje limit (nejvýš ' + VZ_DALSI_MAX + ' dalších).';
  return 'neplatný údaj víc zákazníků (' + p.slice(0, 3).map(x => x.kde).join(', ') + ').';
}

/* Vypnutá funkce a zakázka, která další zákazníky UŽ MÁ (§ 8): data se
 * nemažou, měnit je nejde. Text hlášky serveru (a lišty v E1). */
const VZ_VYPNUTO = 'Zakázka má víc zákazníků — funkce je v Nastavení vypnutá. Zákazníky (přidání, úpravy, odstranění, '
  + 'řídící zákazník) teď nejde měnit; zapnout je může administrátor (Nastavení → Zkušební funkce).';

/* D4 (dorevize Fable): s VYP smazaná varianta, na kterou ukazuje další zákazník. */
const VZ_VYPNUTO_VARIANTA = 'Variantu nejde smazat: ukazuje na ni další zákazník a funkce Víc zákazníků je vypnutá '
  + '(zapnout ji může administrátor v Nastavení → Zkušební funkce).';

/* ============================================================
 * E2 (#601): ČÍSLA S PÍSMENEM, TISK Z POHLEDU ZÁKAZNÍKA, ZÁBRANY TISKU
 * Návrh § 3, § 4, § 9 (R1, R2, R5). Jediný vstup dokumentů je
 * vzTiskPohled — generátory dál čtou zak.objednatel a ostatní zákazníky
 * v pohledu nemají z čeho vzít (test src/test_vz_unik.js s kanárky).
 * ============================================================ */

/* Písmeno zákazníka, pro kterého je zakázka „pohledem" (vzPohled); jinak ''. */
function vzPismenoPohledu(zak) {
  const p = zak && zak.vzPohledZakaznika;
  return (vzObj(p) && typeof p.pismeno === 'string' && VZ_PISMENO_TVAR.test(p.pismeno)) ? p.pismeno : '';
}

/* Číslo + písmeno zákazníka: „…9940" → „…9940-B", „…9940.2" → „…9940.2-B".
 * Prázdné číslo nebo bez písmene → beze změny. */
function vzCisloSPismenem(cislo, pismeno) {
  const c = vzText(cislo);
  /* Nedopsaná předloha čísla („2026 - OPR - CN - ") písmeno nedostane (jako příponu varianty). */
  if (typeof hlavickaVyplneno === 'function' && !hlavickaVyplneno(c.trim())) return c;
  return (c.trim() && typeof pismeno === 'string' && VZ_PISMENO_TVAR.test(pismeno)) ? c.replace(/\s+$/, '') + '-' + pismeno : c;
}

/* Rozklad čísla nabídky s písmenem: { zaklad, pismeno } (bez písmene pismeno '').
 * Písmeno se pozná jen za číslicí: „…9940-B", „…9940.2-B". */
function vzCisloRozloz(cislo) {
  const c = vzText(cislo).trim();
  const m = /^(.*\d)-([B-Z])$/.exec(c);
  return m ? { zaklad: m[1], pismeno: m[2] } : { zaklad: c, pismeno: '' };
}

/* Varianty, ze kterých se smí tisknout pro zákazníka `id`: ta, na kterou
 * ukazuje, a ty, které mu už odešly (razítko tisku s jeho id, E3).
 * ŘÍDÍCÍ navíc všechny varianty, které nejsou nabídkou žádného dalšího
 * zákazníka (stejné pravidlo jako vzPohled po revizi E0, N3) — cizí vlastní
 * ani cizí odeslaná varianta mezi nimi není. */
function vzVariantyZakaznika(zak, id) {
  const z = vzZakaznik(zak, id);
  if (!z) return [];
  const out = new Set(z.varianta ? [z.varianta] : []);
  const varianty = (zak && Array.isArray(zak.varianty)) ? zak.varianty : [];
  const razitka = v => (v && v.zamek && Array.isArray(v.zamek.tisky) ? v.zamek.tisky : [])
    .filter(x => x && vzObj(x.zakaznik)).map(x => String(x.zakaznik.id));
  varianty.forEach(v => { if (razitka(v).indexOf(z.id) >= 0) out.add(String(v.id)); });
  if (z.ridici) {
    const dalsi = vzZakaznici(zak).filter(x => !x.ridici);
    const cizi = new Set(dalsi.map(x => x.varianta));
    const ids = new Set(dalsi.map(x => x.id));
    varianty.forEach(v => {
      if (v && !cizi.has(String(v.id)) && !razitka(v).some(r => ids.has(r))) out.add(String(v.id));
    });
  }
  return Array.from(out);
}

/* VSTUP TISKU (§ 4): zakázka, ze které vzniká dokument pro zákazníka `id`.
 *   - zakázka s jedním zákazníkem (a už hotový pohled) → TÝŽ objekt
 *     (žádná kopie: zlatá sada, VYP bajt po bajtu);
 *   - víc zákazníků → vzPohled + jen varianty tohoto zákazníka
 *     (porovnání a podklady nevidí cizí vlastní variantu). Objekty variant
 *     jsou sdílené — tisk zamyká skutečnou variantu.
 * Neznámé id → null (volající dokument nevytvoří). */
function vzTiskPohled(zak, id, varianta) {
  if (!zak || typeof zak !== 'object' || !vzRezim(zak)) return zak;
  const p = vzPohled(zak, id);
  if (!p) return null;
  /* E3 (#602, § 5): DOTISK varianty, která zákazníkovi už odešla — název
   * a IČO adresáta ze snímku v jeho razítku, ne z dnešních údajů. */
  if (varianta != null && varianta !== '') {
    const varId = String(vzObj(varianta) ? varianta.id : varianta);
    const skut = (Array.isArray(zak.varianty) ? zak.varianty : []).find(v => v && String(v.id) === varId);
    const snap = skut ? vzRazitkoDotisku(skut, p.vzPohledZakaznika.id) : null;
    if (snap) {
      if (typeof snap.objednatel === 'string') p.objednatel = snap.objednatel;
      if (typeof snap.ico === 'string') p.ico = snap.ico;
    }
  }
  const smi = new Set(vzVariantyZakaznika(zak, p.vzPohledZakaznika.id));
  /* DALŠÍ zákazník: mělké kopie variant s odvozenou „variantou zákazníka"
   * (v.zakaznik jde do názvu souboru; návrh § 1.1) = jeho název — volný
   * text sdílené varianty nebo klonu nese jméno řídícího. Data, zámek
   * a prodej zůstávají sdílené objekty skutečné varianty. Řídící: tytéž
   * objekty (v.zakaznik hlídá vzTiskZabrana jako sdílený text). */
  /* Původní zákazník bez písmene (z1) má tytéž objekty, pokud volný text
   * v.zakaznik nejmenuje jiného zákazníka (klon zdědí jméno zdroje; po výměně
   * řídícího); zákazník s písmenem (další, i nový řídící po výměně) vždy
   * kopie s odvozeným v.zakaznik. */
  const puvodni = !p.vzPohledZakaznika.pismeno;
  const nazev = vzText(p.objednatel);
  const ja = vzZakaznik(zak, p.vzPohledZakaznika.id);
  const ostatni = vzZakaznici(zak).filter(x => x.id !== ja.id);
  /* E3 (#602): i adresáti z razítek ostatních (odstraněný zákazník, starý
   * název přejmenovaného) — volný text v.zakaznik jeho varianty, která
   * zůstala jako doklad, nesmí do dokumentu jiného zákazníka. */
  vzRazitkaZakazniku(zak).forEach(r => {
    if (vzText(r.id) !== ja.id && vzText(r.objednatel).trim())
      ostatni.push({ id: vzText(r.id), hlavicka: { objednatel: vzText(r.objednatel), ico: vzText(r.ico) } });
  });
  /* D3 (dorevize E0): razítka OSTATNÍCH zákazníků (snímek adresáta) se
   * z kopie zámku vyjmou — tisk je nesmí nést (vzVariantaBezCizichRazitek). */
  p.varianty = (Array.isArray(zak.varianty) ? zak.varianty : []).filter(v => v && smi.has(String(v.id)))
    .map(v => vzVariantaBezCizichRazitek(v, ja.id))
    .map(v => vzVariantaBezCizichKl(v, ja.id))   // E4 Z1: krycí listy jen s jeho ručními hodnotami
    .map(v => ((puvodni && !vzTextCizi(v.zakaznik, ja, ostatni)) ? v : Object.assign({}, v, { zakaznik: nazev })));
  if (!p.varianty.some(v => v.id === p.aktivni) && p.varianty.length) p.aktivni = p.varianty[0].id;
  /* Protokol zakázky (E1 do něj píše názvy zákazníků) žádný dokument
   * netiskne — do tiskového pohledu nepatří (pojistka R1). */
  delete p.protokol;
  return p;
}

/* Varianta pro tisk z pohledu: kopie z pohledu podle id (null = varianta
 * zákazníkovi nepatří). Zakázka, která pohledem není (jeden zákazník) →
 * TÁŽ varianta. */
function vzTiskVarianta(pohled, varianta) {
  if (!pohled || !vzObj(pohled.vzPohledZakaznika) || !Array.isArray(pohled.varianty)) return varianta;
  if (!varianta) return null;
  const id = String(vzObj(varianta) ? varianta.id : varianta);
  return pohled.varianty.find(v => String(v.id) === id) || null;
}

/* POLE ZÁKAZNÍKA V KRYCÍM LISTU SDÍLENÉ VARIANTY (revize E2 U1, U2).
 * Ruční hodnoty (`kl.hodnoty`) a snímek zámku (`kl.zmrazeno`) jsou data
 * VARIANTY — u sdílené varianty společné všem jejím zákazníkům. Pole zákazníka
 * (`zakaznikPole`: sekce Zákazník a Zástupci, podpisy, kopie faktur, zmocnitel)
 * se v pohledu zákazníka čtou z nich jen tehdy, když je „vlastní" tentýž
 * zákazník: ruční hodnota podle `kl.vzVlastnik[pole]`, snímek podle
 * `kl.vzZmrazeno` (id řídícího v okamžiku zámku); bez záznamu = původní
 * zákazník z1. Rozhoduje id zákazníka, NE písmeno ani role. Mimo pohled
 * (obrazovka, jeden zákazník) beze změny. Per-zákazník ruční hodnoty = E3. */
function vzKlVlastni(zak, vlastnik) {
  const p = zak && zak.vzPohledZakaznika;
  if (!vzObj(p)) return true;
  return String(vlastnik || VZ_RIDICI_ID) === String(p.id);
}
/* Zápis ruční hodnoty pole zákazníka (UI krycího listu nad celou zakázkou):
 * u víc zákazníků si pole zapamatuje vlastníka = řídícího zákazníka. Jeden
 * zákazník = žádný klíč navíc. */
function vzKlZapis(kl, id, zak) {
  if (!kl || !vzRezim(zak)) return;
  if (!vzObj(kl.vzVlastnik)) kl.vzVlastnik = {};
  kl.vzVlastnik[String(id)] = vzRidiciId(zak);
}
/* Snímek zámku krycího listu: čí je (jen u víc zákazníků; jinak klíč pryč). */
function vzKlZmrazeno(kl, zak) {
  if (!kl) return;
  if (vzRezim(zak)) kl.vzZmrazeno = vzRidiciId(zak); else delete kl.vzZmrazeno;
}
/* RUČNÍ HODNOTY POLÍ ZÁKAZNÍKA PO ZÁKAZNÍCÍCH (VZ-E3 #602, doplněk
 * koordinace U1). Každý zákazník má vlastní ruční hodnoty polí zákazníka
 * (telefon, e-mail, podpisy, kopie faktur, zmocnitel…):
 *   kl.hodnoty[pole] + kl.vzVlastnik[pole]   hodnota VLASTNÍKA (bez záznamu z1
 *                                            — stávající data = původní / řídící);
 *   kl.hodnotyZakaznika[id][pole]            hodnoty ostatních zákazníků.
 * Klíč `hodnotyZakaznika` jen u víc zákazníků (jeden zákazník = dnešek). */
function vzKlRucni(kl, id, pole) {
  if (!kl) return undefined;
  const sid = String(id || VZ_RIDICI_ID);
  const m = vzObj(kl.hodnotyZakaznika) && vzObj(kl.hodnotyZakaznika[sid]) ? kl.hodnotyZakaznika[sid][pole] : undefined;
  if (m !== undefined && m !== '') return m;
  const h = vzObj(kl.hodnoty) ? kl.hodnoty[pole] : undefined;
  const vl = vzObj(kl.vzVlastnik) && kl.vzVlastnik[pole] ? String(kl.vzVlastnik[pole]) : VZ_RIDICI_ID;
  return (h !== undefined && h !== '' && vl === sid) ? h : undefined;
}
/* Zápis ruční hodnoty pole zákazníka `pole` za zákazníka `id` (v '' = smazat).
 * Do `kl.hodnoty` jen když pole nemá hodnotu jiného zákazníka; jinak
 * do `kl.hodnotyZakaznika[id]`. Na místě. */
function vzKlZapisRucni(kl, zak, id, pole, v) {
  if (!kl) return;
  const sid = String(id || vzRidiciId(zak));
  if (!vzObj(kl.hodnoty)) kl.hodnoty = {};
  const hz = vzObj(kl.hodnotyZakaznika) ? kl.hodnotyZakaznika : null;
  const vl = vzObj(kl.vzVlastnik) && kl.vzVlastnik[pole] ? String(kl.vzVlastnik[pole]) : VZ_RIDICI_ID;
  const hMa = kl.hodnoty[pole] !== undefined && kl.hodnoty[pole] !== '';
  const prazdne = v === '' || v == null;
  const uklid = () => {
    if (hz && vzObj(hz[sid]) && !Object.keys(hz[sid]).length) delete hz[sid];
    if (hz && !Object.keys(hz).length) delete kl.hodnotyZakaznika;
  };
  if (hz && vzObj(hz[sid]) && hz[sid][pole] !== undefined) {
    if (prazdne) delete hz[sid][pole]; else hz[sid][pole] = v;
    uklid(); return;
  }
  if (!hMa || vl === sid) {
    if (prazdne) { delete kl.hodnoty[pole]; if (vzObj(kl.vzVlastnik)) delete kl.vzVlastnik[pole]; }
    else { kl.hodnoty[pole] = v; if (vzRezim(zak)) { if (!vzObj(kl.vzVlastnik)) kl.vzVlastnik = {}; kl.vzVlastnik[pole] = sid; } }
    if (vzObj(kl.vzVlastnik) && !Object.keys(kl.vzVlastnik).length) delete kl.vzVlastnik;
    return;
  }
  if (prazdne) return;
  if (!vzObj(kl.hodnotyZakaznika)) kl.hodnotyZakaznika = {};
  if (!vzObj(kl.hodnotyZakaznika[sid])) kl.hodnotyZakaznika[sid] = {};
  kl.hodnotyZakaznika[sid][pole] = v;
}
/* Odstranění zákazníka: jeho ruční hodnoty krycích listů pryč (u NEZAMČENÝCH
 * variant — v zámku jsou doklad). Na místě. */
function vzKlOdstranZakaznika(zak, id) {
  ((zak && zak.varianty) || []).forEach(v => {
    if (!v || !v.data || (typeof variantaUzamcena === 'function' && variantaUzamcena(v))) return;
    ['kryci', 'kryciProj'].forEach(list => {
      const kl = v.data[list];
      if (!vzObj(kl)) return;
      /* Hodnoty, jejichž vlastníkem byl on, taky pryč (údaje odstraněného zákazníka). */
      if (vzObj(kl.vzVlastnik) && vzObj(kl.hodnoty)) Object.keys(kl.vzVlastnik).forEach(k => {
        if (String(kl.vzVlastnik[k]) === String(id)) { delete kl.hodnoty[k]; delete kl.vzVlastnik[k]; }
      });
      if (vzObj(kl.vzVlastnik) && !Object.keys(kl.vzVlastnik).length) delete kl.vzVlastnik;
      if (!vzObj(kl.hodnotyZakaznika)) return;
      delete kl.hodnotyZakaznika[String(id)];
      if (!Object.keys(kl.hodnotyZakaznika).length) delete kl.hodnotyZakaznika;
    });
  });
}

/* V3 (dorevize E2): po odstranění posledního dalšího zákazníka zmizí z
 * NEZAMČENÝCH variant stopy víc zákazníků v krycích listech — hodnoty
 * zbylého zákazníka (`ridici`) z `hodnotyZakaznika` se vrátí do `hodnoty`
 * (mají přednost), `vzVlastnik`, `vzZmrazeno`, `hodnotyZakaznika` pryč.
 * Zamčená varianta je doklad — beze změny. Na místě. */
function vzKlUklid(zak, ridici) {
  ((zak && zak.varianty) || []).forEach(v => {
    if (!v || !vzObj(v.data) || (typeof variantaUzamcena === 'function' && variantaUzamcena(v))) return;
    ['kryci', 'kryciProj'].forEach(list => {
      const kl = v.data[list];
      if (!vzObj(kl)) return;
      const vlastni = vzObj(kl.hodnotyZakaznika) && vzObj(kl.hodnotyZakaznika[String(ridici)]) ? kl.hodnotyZakaznika[String(ridici)] : null;
      /* E4 (doplněk 3): zbylý zákazník není z1 → hodnoty polí zákazníka bez
       * značky vlastníka (= z1) mu nepatří. */
      const pole = String(ridici) !== VZ_RIDICI_ID ? vzKlPoleZakaznika(list) : null;
      if (pole && vzObj(kl.hodnoty)) Object.keys(kl.hodnoty).forEach(k => {
        if (pole.has(k) && !(vzObj(kl.vzVlastnik) && kl.vzVlastnik[k])) delete kl.hodnoty[k];
      });
      if (vzObj(kl.hodnoty) && vzObj(kl.vzVlastnik))
        Object.keys(kl.vzVlastnik).forEach(k => { if (String(kl.vzVlastnik[k]) !== String(ridici)) delete kl.hodnoty[k]; });
      if (vlastni) { if (!vzObj(kl.hodnoty)) kl.hodnoty = {}; Object.keys(vlastni).forEach(k => { kl.hodnoty[k] = vlastni[k]; }); }
      delete kl.hodnotyZakaznika; delete kl.vzVlastnik; delete kl.vzZmrazeno;
    });
  });
}

/* Pole zákazníka v krycím listu: sekce zákazníka a jeho zástupců, podpisy,
 * kopie faktur a zmocnitel (plná moc). Označí `zakaznikPole` na místě. */
function vzKlOznacPole(sekce) {
  const SEK = ['Zákazník (smluvní partner)', 'Zástupci a kontakty zákazníka'];
  (sekce || []).forEach(s => (s.pole || []).forEach(p => {
    if (SEK.indexOf(s.sekce) >= 0 || /^obj(Podpis|Kopie)/.test(p.id) || /^pmZmocnitel/.test(p.id)) p.zakaznikPole = true;
  }));
  return sekce;
}

/* Pojistka generátorů (R1): dokument se nesmí tvořit z celé zakázky
 * s dalšími zákazníky — jen z pohledu (vzTiskPohled). Hodí chybu. */
function vzTiskHlidej(zak) {
  if (vzRezim(zak)) throw new Error('Dokument zakázky s víc zákazníky vzniká jen z pohledu jednoho zákazníka (chyba aplikace — tisk zastaven).');
}

/* Normalizace textu pro hledání cizího zákazníka: bez diakritiky, malá
 * písmena, jen písmena a číslice oddělené jednou mezerou. */
function vzNorm(t) {
  return ' ' + vzText(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
}
/* Název firmy bez právní formy („BETA Development a.s." → „beta development"). */
const VZ_PRAVNI_FORMA = / (s r o|spol s r o|a s|k s|v o s|z s|se|gmbh|ag|kg|ltd|sro|as)( |$)/g;
function vzNazevJadro(nazev) {
  return vzNorm(nazev).replace(VZ_PRAVNI_FORMA, ' ').replace(/\s+/g, ' ');
}

/* Najde v textu název nebo IČO některého z `cizi` zákazníků. Vlastní název
 * zákazníka `vlastni` se z textu nejdřív vyjme (název A obsahující název B).
 * Vrací cizího zákazníka (položku vzZakaznici), nebo null. */
function vzTextCizi(text, vlastni, cizi) {
  let t = vzNorm(text);
  if (t.trim() === '') return null;
  if (vlastni) {
    [vzNorm(vlastni.hlavicka.objednatel), vzNazevJadro(vlastni.hlavicka.objednatel)].forEach(n => {
      if (n.trim().length >= 3) t = t.split(n).join('  ');
    });
  }
  const cisla = ' ' + vzText(text).replace(/\s+/g, '').replace(/\D+/g, ' ') + ' ';
  for (const z of cizi) {
    const nazvy = [vzNorm(z.hlavicka.objednatel), vzNazevJadro(z.hlavicka.objednatel)].filter(n => n.trim().length >= 3);
    if (nazvy.some(n => t.indexOf(n) >= 0)) return z;
    const ico = vzText(z.hlavicka.ico).replace(/\D+/g, '');
    if (ico.length >= 6 && cisla.indexOf(' ' + ico + ' ') >= 0) return z;
  }
  return null;
}

/* Typ dokumentu PROJ (nabídka, náhled, krycí list, SoD PROJ, plná moc PROJ). */
function vzTypProj(typ) {
  const t = vzText(typ).replace(/_(en|de|fr)$/, '');
  return t === 'nabidkaProj' || t === 'nabidkaProjTisk' || t === 'sodProj' || t === 'objednavkaProj' || t === 'plnaMoc' || /^kryciproj(_|$)/.test(t);
}

/* Sdílené tištěné texty zakázky (§ 9 R1): [popisek, hodnota]. */
function vzSdileneTexty(zak) {
  const z = zak || {};
  return [['Název akce', z.nazevAkce], ['Adresa stavby', z.adresa], ['Popis záměru', z.popisZameru],
    ['Popis úvodní fotky OCK', z.uvodniFotoPopis], ['Název úvodní fotky OCK', z.uvodniFotoNazev],
    ['Popis úvodní fotky PROJ', z.uvodniFotoProjPopis], ['Název úvodní fotky PROJ', z.uvodniFotoProjNazev]];
}

/* ZÁBRANA TISKU PRO ZÁKAZNÍKA (§ 4, § 9 R1, R5). Vrací hlášku, nebo ''.
 *   zak       CELÁ zakázka (ne pohled);
 *   id        zákazník, pro kterého se tiskne ('' = řídící);
 *   varianta  varianta, ze které dokument vzniká (objekt nebo id; nepovinné);
 *   typ       typ dokumentu (nabidka, nabidkaProj, kryci_*, sod, plnaMoc …);
 *   volby     { vypnuto: true } = funkce víc zákazníků je v Nastavení vypnutá.
 * Zakázka s jedním zákazníkem → vždy '' (dnešek beze změny). */
function vzTiskZabrana(zak, id, varianta, typ, volby) {
  if (!vzRezim(zak)) return '';
  const o = volby || {};
  const sid = id == null || id === '' ? vzRidiciId(zak) : String(id);
  const z = vzZakaznik(zak, sid);
  if (!z) return 'Zákazník, pro kterého se má tisknout, v zakázce není — otevřete zákazníka znovu.';
  const kdo = '„' + (z.hlavicka.objednatel || 'zákazník ' + (z.pismeno || z.id)) + '"';
  if (o.vypnuto && !z.ridici)
    return 'Funkce víc zákazníků je v Nastavení vypnutá — pro dalšího zákazníka ' + kdo + ' teď dokument nevznikne. '
      + 'Tisknout jde jen pro řídícího zákazníka.';
  if (vzTypProj(typ) && !z.ridici)
    return 'Dokumenty projekce (PROJ) se u zakázky s víc zákazníky tisknou jen pro řídícího zákazníka. '
      + 'Pro zákazníka ' + kdo + ' vytiskněte nabídku OCK, nebo z něj udělejte řídícího.';
  const varId = varianta == null ? '' : String(vzObj(varianta) ? varianta.id : varianta);
  const v = varId ? (zak.varianty || []).find(x => x && String(x.id) === varId) : null;
  if (varId && vzVariantyZakaznika(zak, sid).indexOf(varId) < 0)
    return 'Varianta' + (v && v.nazev ? ' „' + v.nazev + '"' : '') + ' není nabídka zákazníka ' + kdo
      + ' — pro něj se netiskne. Otevřete jeho variantu, nebo mu ji přiřaďte v kartě Zákazníci zakázky.';
  /* E4 (#603, § 4): smlouva o dílo jen zákazníkovi, kterému nabídka té varianty odešla. */
  if (v && vzText(typ).replace(/_(en|de|fr)$/, '') === 'sod' && !vzVariantaOdeslanaKomu(v, sid))
    return 'Smlouvu o dílo jde vytvořit jen pro zákazníka, kterému nabídka této varianty odešla — zákazníkovi ' + kdo
      + ' ji nejdřív vytiskněte (Tisk CN).';
  const cizi = vzZakaznici(zak).filter(x => x.id !== sid);
  /* Název tištěné varianty; porovnání a detail položek tisknou názvy VŠECH
   * variant zákazníka (u řídícího i volných). v.zakaznik hlídá vzTiskPohled. */
  const tistene = typ === 'porovnani'
    ? vzVariantyZakaznika(zak, sid).map(id => (zak.varianty || []).find(x => x && String(x.id) === id)).filter(Boolean)
    : (v ? [v] : []);
  /* V2 (dorevize E2): ruční volné texty krycího listu tištěné varianty jsou sdílené
   * všem jejím zákazníkům (rozsah, co cena nezahrnuje, situační foto, jiné činnosti PROJ). */
  const klTexty = x => {
    const out = [];
    [['kryci', ['rozsah', 'cenaNezahrnuje', 'situacniFoto']], ['kryciProj', ['rozsahJine', 'cenaNezahrnuje']]].forEach(([list, ids]) => {
      const h = vzObj(x && x.data) && vzObj(x.data[list]) && vzObj(x.data[list].hodnoty) ? x.data[list].hodnoty : {};
      ids.forEach(id => { if (typeof h[id] === 'string' && h[id]) out.push(['Krycí list (' + id + ')', h[id]]); });
    });
    return out;
  };
  const texty = vzSdileneTexty(zak).concat(tistene.map(x => ['Název varianty', x.nazev]))
    .concat(v ? klTexty(v) : []);
  for (const [popisek, hodnota] of texty) {
    const c = vzTextCizi(hodnota, z, cizi);
    if (c) return popisek + ' obsahuje název nebo IČO jiného zákazníka zakázky („' + (c.hlavicka.objednatel || c.id)
      + '") — dokument pro ' + kdo + ' nevznikne. Text se tiskne všem zákazníkům; upravte ho tak, aby žádného nejmenoval.';
  }
  return '';
}

/* Pruh v kartě Cenová nabídka (§ 4, R2): „Náhled a tisk platí pro zákazníka X
 * — nabídka …-B". Jen u víc zákazníků; jinak ''. Prostý text (escapuje UI). */
function vzTiskPruhText(zak, id, varianta) {
  if (!vzRezim(zak)) return '';
  const p = vzTiskPohled(zak, id);
  if (!p) return '';
  const z = vzZakaznik(zak, p.vzPohledZakaznika.id);
  const v = varianta || (p.varianty.find(x => x.id === p.aktivni) || null);
  const cislo = typeof cisloSVariantou === 'function' ? cisloSVariantou(p, v) : vzCisloSPismenem(p.cislo, z.pismeno);
  return 'Náhled a tisk platí pro zákazníka ' + (z.hlavicka.objednatel || z.id) + (cislo ? ' — nabídka ' + cislo : '');
}

/* ============================================================
 * E3 (#602): ZÁMEK PO ZÁKAZNÍCÍCH, RAZÍTKO „KOMU", PLATNÁ NABÍDKA,
 * ODSTRANĚNÍ ZÁKAZNÍKA S ODESLANOU NABÍDKOU. Návrh § 5, § 2a, § 1.1.
 *
 * Razítko „komu": každý záznam `zamek.tisky[]` u zakázky s víc zákazníky
 * nese `zakaznik: { id, pismeno, cislo, objednatel, ico }` — snímek adresáta
 * v okamžiku tisku. S jedním zákazníkem klíč chybí (zlatá sada). Záznam BEZ
 * razítka patří původnímu zákazníkovi z1 (tiskl se hlavičce, dokud byl
 * zákazník jeden). `zamek.cislo` zůstává číslo varianty BEZ písmene (zámek je
 * společný všem zákazníkům sdílené varianty; server B56 ho hlídá proti
 * variantaCislo celé zakázky) — číslo dokladu konkrétního zákazníka nese
 * razítko (`zakaznik.cislo` = zamek.cislo + písmeno).
 * ============================================================ */

const VZ_RAZITKO_KLICE = ['id', 'pismeno', 'cislo', 'objednatel', 'ico'];
/* Pole hlavičky dalšího zákazníka, která se po odeslání nabídky jemu už
 * nemění (§ 5; kontaktní osoba a zástupci se měnit smí). */
const VZ_ZMRAZENA_POLE = ['objednatel', 'adresaObjednatele', 'ico', 'dic'];

/* Komu patří záznam tisku: id z razítka, bez razítka z1 (původní zákazník). */
function vzTiskKomu(t) {
  return (t && vzObj(t.zakaznik) && typeof t.zakaznik.id === 'string' && t.zakaznik.id) ? t.zakaznik.id : VZ_RIDICI_ID;
}

function vzTiskyVarianty(v) {
  return (v && v.zamek && v.zamek.zamceno && Array.isArray(v.zamek.tisky)) ? v.zamek.tisky.filter(vzObj) : [];
}

/* Číslo varianty bez písmene (číslo zámku / číslo z celé zakázky). */
/* K58-N1: `typ` = dokument prvního tisku (zámek ještě není) — PROJ bere číslo
 * z papíru PROJ (zamekCisloPapir); zamčená varianta přes zamekCisloZobraz
 * (starý zámek PROJ s číslem OCK ukáže číslo PROJ). */
function vzCisloVarianty(zak, v, typ) {
  const c = v && v.zamek && v.zamek.zamceno && typeof v.zamek.cislo === 'string' && v.zamek.cislo.trim()
    ? ((typeof zamekCisloZobraz === 'function' && zamekCisloZobraz(zak, v)) || v.zamek.cislo) : '';
  if (c) return c;
  const bezPohledu = Object.assign({}, zak, { vzPohledZakaznika: undefined });
  if (typ && v && typeof zamekCisloPapir === 'function') return zamekCisloPapir(bezPohledu, v, typ);
  return typeof variantaCislo === 'function' && v ? variantaCislo(bezPohledu, v)
    : vzText(zak && zak.cislo);
}

/* SNÍMEK ADRESÁTA pro razítko tisku: { id, pismeno, cislo, objednatel, ico }
 * z ULOŽENÝCH údajů zákazníka (server ho skládá sám). Neznámý zákazník → null. */
function vzRazitkoSnimek(zak, id, v, typ) {
  const z = vzZakaznik(zak, id == null || id === '' ? vzRidiciId(zak) : id);
  if (!z) return null;
  return { id: z.id, pismeno: z.pismeno, cislo: vzCisloSPismenem(vzCisloVarianty(zak, v, typ), z.pismeno),
    objednatel: z.hlavicka.objednatel, ico: z.hlavicka.ico };
}

/* Všechny tisky zákazníka napříč variantami: [{ v, t }] podle času. */
function vzTiskyZakaznika(zak, id) {
  const sid = String(id);
  const out = [];
  ((zak && Array.isArray(zak.varianty)) ? zak.varianty : []).forEach(v => {
    vzTiskyVarianty(v).forEach(t => { if (vzTiskKomu(t) === sid) out.push({ v, t }); });
  });
  return out.sort((a, b) => (vzText(a.t.kdy) < vzText(b.t.kdy) ? -1 : vzText(a.t.kdy) > vzText(b.t.kdy) ? 1 : 0));
}

/* Odešla zákazníkovi někdy nabídka (razítko s jeho id v zámku kterékoli varianty)? */
function vzOdeslanoKomu(zak, id) {
  return vzTiskyZakaznika(zak, id).length > 0;
}

/* Cena odeslané nabídky ze ZMRAZENÉHO výsledku zámku (vedoucí strana, bez DPH);
 * starý zámek bez výsledku → null (nic se nepřepočítává). */
function vzCenaZamku(zak, v) {
  const r = (typeof zamekVysledek === 'function') ? zamekVysledek(v) : null;
  if (!r) return null;
  const d = (v && v.data) || {};
  try {
    const proj = (typeof zakazkaVedouciStrana === 'function') && zakazkaVedouciStrana(zak) === 'proj';
    const cn = proj
      ? ((typeof cenaNabidkyProj === 'function' && r.proj)
        ? cenaNabidkyProj(r.proj, d.slevaProj, (typeof zaokrProjZ === 'function') ? zaokrProjZ(d) : d.zaokr) : null)
      : ((typeof cenaNabidkyOck === 'function' && r.ock) ? cenaNabidkyOck(r.ock, d.sleva || {}, d.zaokr) : null);
    return cn && typeof cn.cena === 'number' && isFinite(cn.cena) ? cn.cena : null;
  } catch (e) { return null; }
}

/* PLATNÁ NABÍDKA (§ 5, revize E0 N6): poslední ODESLANÁ nabídka zákazníka
 * { varianta, cislo, kdy, cena, mena } nebo null. Počítá se ze zámků, neukládá
 * se jako pravda — server ji při každém uložení zapíše dalším zákazníkům do
 * `platna` (pro Pipedrive a rejstřík); řídícímu se nezapisuje nikam
 * (`vzRidici` nese jen id, písmeno a variantu), počítá se touto funkcí. */
function vzPlatna(zak, id) {
  const z = vzZakaznik(zak, id == null || id === '' ? vzRidiciId(zak) : id);
  if (!z) return null;
  const l = vzTiskyZakaznika(zak, z.id);
  if (!l.length) return null;
  const { v, t } = l[l.length - 1];
  const zk = vzObj(t.zakaznik) ? t.zakaznik : null;
  const cislo = zk && typeof zk.cislo === 'string' && zk.cislo.trim() ? zk.cislo
    : vzCisloSPismenem(vzCisloVarianty(zak, v), zk && typeof zk.pismeno === 'string' ? zk.pismeno : z.pismeno);
  return { varianta: String(v.id), cislo, kdy: vzText(t.kdy), cena: vzCenaZamku(zak, v), mena: 'CZK' };
}

/* STAV NABÍDKY ZÁKAZNÍKA (§ 5): 'odeslana' = v zámku JEHO varianty je tisk
 * s jeho id; jinak 'rozpracovana'. { stav, kdy, platna } — `kdy` posledního
 * tisku jeho varianty jemu, `platna` = vzPlatna (může být starší varianta). */
function vzStavNabidky(zak, id) {
  const z = vzZakaznik(zak, id == null || id === '' ? vzRidiciId(zak) : id);
  if (!z) return null;
  const v = ((zak && zak.varianty) || []).find(x => x && String(x.id) === z.varianta) || null;
  const jeho = vzTiskyVarianty(v).filter(t => vzTiskKomu(t) === z.id);
  return { stav: jeho.length ? 'odeslana' : 'rozpracovana', kdy: jeho.length ? vzText(jeho[jeho.length - 1].kdy) : '',
    platna: vzPlatna(zak, z.id) };
}

/* Snímek adresáta pro dotisk varianty `v` zákazníkovi `id`: poslední jeho
 * razítko v zámku `v`, nebo null (varianta mu ještě neodešla). */
function vzRazitkoDotisku(v, id) {
  const l = vzTiskyVarianty(v).filter(t => vzTiskKomu(t) === String(id) && vzObj(t.zakaznik));
  return l.length ? l[l.length - 1].zakaznik : null;
}

/* ČÍSLO DOKLADU (§ 2a): zamčená varianta, která odešla JEN zákazníkovi
 * s písmenem (a ten už v zakázce není nebo je to jeho vlastní varianta),
 * nese číslo z razítka (`zamek.cislo` + písmeno). Jinak '' (platí
 * variantaCislo). */
function vzCisloDokladu(zak, v) {
  const t = vzTiskyVarianty(v);
  if (!t.length) return '';
  const pismena = new Set(t.map(x => (vzObj(x.zakaznik) && typeof x.zakaznik.pismeno === 'string') ? x.zakaznik.pismeno : ''));
  if (pismena.size !== 1) return '';
  const p = Array.from(pismena)[0];
  if (!VZ_PISMENO_TVAR.test(p)) return '';
  const id = vzTiskKomu(t[0]);
  const z = vzZakaznik(zak, id);
  /* Zákazník je v zakázce: jen jeho vlastní varianta (sdílená nese číslo variantaCislo). */
  if (z && (z.varianta !== String(v.id) || !vzVariantaJenJeho(zak, z.id, String(v.id))) && vzRezim(zak)) return '';
  return vzCisloSPismenem(vzCisloVarianty(zak, v), p);
}

/* Smí se zákazník `id` odstranit? '' = ano, jinak důvod. `admin` = role
 * Administrátor (rozhodnutí J. V.: zákazníka, kterému odešla nabídka,
 * odstraní jen administrátor). Řídícího a prodaného nikdo. */
function vzOdstranDuvod(zak, id, admin) {
  const z = vzZakaznik(zak, id);
  if (!z) return 'Zákazník v zakázce není.';
  if (z.ridici) return 'Řídícího zákazníka nejde odstranit, dokud se řídícím nestane jiný.';
  if (((zak && zak.varianty) || []).some(v => v && vzObj(v.prodano) && String(v.prodano.zakaznik || '') === z.id))
    return 'Zákazníkovi se prodalo — nejdřív odemknout prodej (vedoucí, administrátor).';
  if (!admin && vzOdeslanoKdykoli(zak, z.id))
    return 'Zákazníkovi už odešla nabídka — odstranit ho smí jen administrátor (doklad o odeslání v zakázce zůstane).';
  return vzOdstranKolapsDuvod(zak, z.id);
}

/* ZMRAZENÍ ÚDAJŮ DALŠÍHO ZÁKAZNÍKA (§ 5): po odeslání nabídky jemu se
 * název, sídlo, IČO a DIČ nemění (snímek je v razítku); kontakt a zástupci
 * ano. Vrací důvod nebo ''. Platí jen pro dalšího zákazníka — hlavičku
 * řídícího hlídá zámek hlavičky jako dnes. */
function vzZakaznikPoleZmrazeno(zak, id, pole) {
  if (!vzRezim(zak) || VZ_ZMRAZENA_POLE.indexOf(pole) < 0) return '';
  const z = vzZakaznik(zak, id);
  /* #674 d: řídící bez písmene (z1) hlídá zámek hlavičky; řídící s písmenem
   * (po výměně) má údaje zmrazené jako další zákazník (server § 5 totéž). */
  if (!z || (z.ridici && !z.pismeno) || !vzOdeslanoKomu(zak, z.id)) return '';
  return 'Zákazníkovi už odešla nabídka — název, sídlo, IČO a DIČ se už nemění (měnit jde kontaktní osobu). '
    + 'Jiný subjekt přidejte jako nového zákazníka.';
}

/* SERVER (§ 5, § 2a, revize E0 N4, N9, B221). `stara` = ULOŽENÁ verze
 * (po migraci), `zak` = ukládaná, `relace` = { email, role }. Volá se se
 * ZAPNUTOU funkcí po kontrole tvaru. Vrací { status, chyba } nebo null;
 * na místě opraví `zalozen` (ze serveru) a razítka nových tisků. */
function vzServerZakaznici(stara, zak, relace, volby) {
  const o = volby || {};
  const rel = relace || {};
  const admin = rel.role === 'Administrátor';
  /* E4 (#603): návrat k jednomu zákazníkovi jen se z1 (doplněk 3), výměna řídícího. */
  const kolaps = vzServerKolaps(stara, zak, o);
  if (kolaps) return kolaps;
  const ridici = vzServerRidici(stara, zak, rel, o);
  if (ridici) return ridici;
  const inv = vzServerInvariant(stara, zak, o);   // T1: řídící zákazník má řídící variantu
  if (inv) return inv;
  const pred = stara ? vzZakaznici(stara) : [];
  const ted = vzZakaznici(zak);
  const tedIds = new Map(ted.map(z => [z.id, z]));
  const predIds = new Map(pred.map(z => [z.id, z]));
  /* N9: písmeno stávajícího zákazníka (i řídícího) klient nepřepíše. */
  for (const p of pred) {
    const n = tedIds.get(p.id);
    if (n && n.pismeno !== p.pismeno)
      return { status: 400, chyba: 'písmeno zákazníka (' + (p.pismeno || 'bez písmene') + ') se nemění.' };
  }
  /* Odstranění zákazníka s odeslanou nabídkou (podle ULOŽENÉ verze) — jen administrátor. */
  for (const p of pred) {
    if (tedIds.has(p.id)) continue;
    if (!o.obnova && vzOdeslanoKdykoli(stara, p.id) && !admin)
      return { status: 403, chyba: 'zákazníkovi „' + (p.hlavicka.objednatel || p.id) + '" už odešla nabídka — '
        + 'odstranit ho smí jen administrátor.' };
  }
  /* N9: nový zákazník nesmí převzít id ani písmeno, se kterým už něco
   * odešlo (razítko v uložené verzi). Id a písmeno zákazníka odstraněného
   * bez odeslané nabídky se uvolní (§ 1.1). */
  const razitka = vzRazitkaZakazniku(stara);
  const ulozIds = new Set(razitka.map(r => vzText(r.id)));
  const ulozPismena = new Set(razitka.map(r => vzText(r.pismeno)).filter(Boolean));
  for (const n of ted) {
    if (predIds.has(n.id)) continue;
    if (ulozIds.has(n.id))
      return { status: 400, chyba: 'nový zákazník nese id ' + n.id + ', se kterým už odešla nabídka.' };
    if (n.pismeno && ulozPismena.has(n.pismeno))
      return { status: 400, chyba: 'písmeno ' + n.pismeno + ' už nese odeslaná nabídka jiného zákazníka.' };
  }
  /* VZ-F1 (VZ-N1): zákazník nesmí nést IČO, které už v zakázce je
   * (zákazníci bez IČO se nehlídají). VZ-F2 (#660): hlídá se každý NOVÝ
   * zákazník a každý, komu se IČO ZMĚNILO (i řídící, i doplnění IČO zákazníkovi
   * uloženému bez něj), a to proti VŠEM ostatním — ne jen proti dřívějším
   * v poli (nový vložený před stávajícího prošel). Zákazník se stejným
   * IČO jako v uložené verzi se nehlídá: starší data s duplicitou ukládání
   * neblokují; obnova (i ze souboru) také ne. */
  /* Hláška jmenuje zákazníka, který v zakázce UŽ JE: přednost má ten, komu
   * se IČO neměnilo; když jsou noví / změnění oba, ten dřívější v poli
   * (pozdější se ohlásí, až na něj dojde řada). Předponu „Neuloženo:" přidá
   * volající (zakazka_kontrola.mjs) — žádná hláška vzServer* ji proto nenese
   * (#674 c: dřív „Neuloženo: Neuloženo: …"). */
  const icoStejne = z => { const p = predIds.get(z.id); return !!p && vzIcoKlic(p.hlavicka.ico) === vzIcoKlic(z.hlavicka.ico); };
  if (!o.obnova) for (const n of ted) {
    const k = vzIcoKlic(n.hlavicka.ico);
    if (!k || icoStejne(n)) continue;
    const stejne = ted.filter(z => z !== n && vzIcoKlic(z.hlavicka.ico) === k);
    const dupl = stejne.find(icoStejne) || ted.slice(0, ted.indexOf(n)).find(z => vzIcoKlic(z.hlavicka.ico) === k);
    if (dupl) return { status: 400, chyba: vzIcoDuplicitaText(dupl) };
  }
  /* § 5: údaje dalšího zákazníka po odeslání jemu (uložená verze). */
  for (const p of pred) {
    const n = tedIds.get(p.id);
    if (!n || !vzOdeslanoKomu(stara, p.id) || o.obnova) continue;
    /* Hlavička řídícího BEZ písmene (původní z1): zámek hlavičky jako dnes.
     * #674 d: zákazník S PÍSMENEM, kterému odešla nabídka jako dalšímu, má
     * údaje zmrazené i jako řídící — v uložení výměny i potom (dřív jen
     * v uložení výměny, klient je nechal volné). Klient totéž: vzZakaznikPoleZmrazeno
     * a zamekZakCestaZmrazena. */
    if (p.ridici && n.ridici && !n.pismeno) continue;
    const zm = VZ_ZMRAZENA_POLE.filter(k => vzText(p.hlavicka[k]) !== vzText(n.hlavicka[k]));
    if (zm.length)
      return { status: 409, chyba: 'zákazníkovi „' + (p.hlavicka.objednatel || p.id) + '" už odešla nabídka — '
        + 'název, sídlo, IČO a DIČ se už nemění (' + zm.join(', ') + ').' };
  }
  /* VZ-F2 (#663, J. V. 18. 11. 2026): po odeslání SMLOUVY O DÍLO zákazníkovi
   * se nemění ani jeho zástupci (vytištění ve smlouvě) — po zákaznících, podle
   * razítek ULOŽENÉ verze. Řídící, který řídícím zůstává, hlídá zámek
   * hlavičky (zamekZakZmeny — jen SoD řídícímu, ne SoD dalšímu). */
  for (const p of pred) {
    const n = tedIds.get(p.id);
    if (!n || o.obnova || (p.ridici && n.ridici) || !vzSodOdeslanaKomu(stara, p.id)) continue;
    const zz = VZ_ZASTUPCI_POLE.filter(k => vzText(p.zastupci[k]) !== vzText(n.zastupci[k]));
    if (zz.length) return { status: 409, chyba: vzSodZmrazenoText(p) + ' (' + zz.join(', ') + ').' };
  }
  return null;
}

/* VZ-F2 (#663): odešla zákazníkovi `id` smlouva o dílo (OCK i PROJ, i jazyková)?
 * Tisk se smlouvou s jeho razítkem v zámku kterékoli varianty; tisk bez
 * razítka patří z1 (jeden zákazník). Smlouva v zámku v historii odemčení se
 * nepočítá — po odemčení jde smlouva vystavit znovu. */
function vzSodOdeslanaKomu(zak, id) {
  const sid = String(id);
  return ((zak && Array.isArray(zak.varianty)) ? zak.varianty : [])
    .some(v => vzTiskyVarianty(v).some(t => vzTiskSmlouva(t) && vzTiskKomu(t) === sid));
}
function vzTiskSmlouva(t) {
  const typ = vzText(t && t.typ).replace(/_(en|de|fr)$/, '');
  return typ === 'sod' || typ === 'sodProj';
}
function vzSodZmrazenoText(z) {
  return 'zákazníkovi „' + (vzText(z && z.hlavicka && z.hlavicka.objednatel).trim() || (z && z.id) || '?')
    + '" už odešla smlouva o dílo — zástupci a DIČ se už nemění';
}
/* Klient (#663): zástupci dalšího zákazníka `id` po odeslání SoD jemu —
 * důvod nebo ''. Řídícího hlídá zámek hlavičky (zamekZakCestaZmrazena). */
function vzZastupciZmrazeno(zak, id) {
  if (!vzRezim(zak)) return '';
  const z = vzZakaznik(zak, id);
  if (!z || z.ridici || !vzSodOdeslanaKomu(zak, z.id)) return '';
  const t = vzSodZmrazenoText(z);
  return t.charAt(0).toUpperCase() + t.slice(1) + '. Jiné zástupce zapište do nové zakázky.';
}

/* N4 (revize E0): `zalozen` píše server — u existujícího id z uložené verze,
 * u nového relace a čas serveru. Obnova z otisku bere zálohu. Na místě. */
function vzZalozenDrz(stara, zak, relace, volby) {
  const o = volby || {};
  const rel = relace || {};
  if (o.obnova && !o.zeSouboru) return;
  const ulozene = new Map(vzDalsi(stara).map(d => [String(d.id), d.zalozen]));
  const ridiciDriv = vzObj(stara && stara.vzRidici) ? String(stara.vzRidici.id) : (stara ? VZ_RIDICI_ID : '');
  vzDalsi(zak).forEach(d => {
    const id = String(d.id);
    if (ulozene.has(id) || id === ridiciDriv) {
      const z = ulozene.get(id);
      if (vzObj(z)) d.zalozen = vzKop(z); else delete d.zalozen;
    } else d.zalozen = { kdo: vzText(rel.email), kdy: o.kdy || new Date().toISOString() };
  });
}

/* RAZÍTKA NOVÝCH TISKŮ NA SERVERU (§ 5 bod 8): u každého NOVĚ připsaného
 * záznamu tisku (za uloženým začátkem `tisky`, u nového zámku všechny) si
 * server snímek adresáta složí sám; z prohlížeče bere jen id. Jeden
 * zákazník → klíč pryč. Tisk bez id = řídící. Zákazník, který neexistuje
 * nebo kterému varianta nepatří → 400. Vrací { status, chyba } nebo null. */
function vzServerRazitka(stara, zak) {
  const sv = new Map(((stara && stara.varianty) || []).filter(vzObj).map(v => [String(v.id), v]));
  const rezim = vzRezim(zak);
  /* Které varianty smí zákazník dostat — podle razítek ULOŽENÉ verze (nové
   * razítko samo sebe neopravňuje). */
  const smi = (z, varId) => {
    if (z.varianta === varId) return true;
    if (vzTiskyVarianty(sv.get(varId)).some(t => vzTiskKomu(t) === z.id)) return true;
    if (!z.ridici) return false;
    const dalsi = vzZakaznici(zak).filter(x => !x.ridici);
    if (dalsi.some(x => x.varianta === varId)) return false;
    const ids = new Set(dalsi.map(x => x.id));
    return !vzTiskyVarianty(sv.get(varId)).some(t => ids.has(vzTiskKomu(t)) && vzObj(t.zakaznik));
  };
  for (const v of ((zak && zak.varianty) || [])) {
    if (!v || !v.zamek || !v.zamek.zamceno || !Array.isArray(v.zamek.tisky)) continue;
    const s = sv.get(String(v.id));
    const od = (s && s.zamek && s.zamek.zamceno && Array.isArray(s.zamek.tisky)) ? s.zamek.tisky.length : 0;
    for (let i = od; i < v.zamek.tisky.length; i++) {
      const t = v.zamek.tisky[i];
      if (!vzObj(t)) continue;
      if (!rezim) { delete t.zakaznik; continue; }
      const id = (vzObj(t.zakaznik) && typeof t.zakaznik.id === 'string' && t.zakaznik.id) ? t.zakaznik.id : vzRidiciId(zak);
      const z = vzZakaznik(zak, id);
      if (!z) return { status: 400, chyba: 'tisk nabídky pro zákazníka, který v zakázce není. Obnovte stránku a vytiskněte znovu.' };
      if (!smi(z, String(v.id)))
        return { status: 400, chyba: 'varianta „' + vzText(v.nazev || v.id) + '" není nabídka zákazníka „'
          + (z.hlavicka.objednatel || z.id) + '" — pro něj se netiskne.' };
      /* VZ-E6 (#606, doplněk 3 k E4): smlouva o dílo jen zákazníkovi, kterému
       * nabídka TÉTO varianty odešla — dřívější tisk s jeho id v témže zámku
       * (uložené razítko nebo nové razítko téhož uložení, už ověřené výš). */
      if (vzText(t.typ).replace(/_(en|de|fr)$/, '') === 'sod'
        && !v.zamek.tisky.slice(0, i).some(x => vzObj(x) && vzTiskKomu(x) === z.id))
        return { status: 400, chyba: 'smlouvu o dílo k variantě „' + vzText(v.nazev || v.id) + '" jde vytvořit jen pro zákazníka, '
          + 'kterému nabídka této varianty odešla — zákazníkovi „' + (z.hlavicka.objednatel || z.id) + '" ji nejdřív vytiskněte (Tisk CN).' };
      t.zakaznik = vzRazitkoSnimek(zak, z.id, v);
    }
  }
  return null;
}

/* `platna` dalších zákazníků = vzPlatna ze zámků (N6) — server ji zapíše
 * při každém uložení, klientovi nevěří. Na místě. */
function vzPlatnaPrepocti(zak) {
  vzDalsi(zak).forEach(d => {
    const p = vzPlatna(zak, d.id);
    if (p) d.platna = p; else delete d.platna;
  });
}

/* D3 (dorevize E0) + § 5 dotisk: varianta v TISKOVÉM pohledu zákazníka `id`
 * — razítka ostatních zákazníků (snímek adresáta) se z kopie zámku vyjmou.
 * Vrací tutéž variantu, když v ní cizí razítko není. */
function vzVariantaBezCizichRazitek(v, id) {
  const t = vzTiskyVarianty(v);
  if (!t.some(x => vzObj(x.zakaznik) && x.zakaznik.id !== id)) return v;
  const tisky = v.zamek.tisky.map(x => (vzObj(x) && vzObj(x.zakaznik) && x.zakaznik.id !== id)
    ? (() => { const y = Object.assign({}, x); delete y.zakaznik; return y; })() : x);
  return Object.assign({}, v, { zamek: Object.assign({}, v.zamek, { tisky }) });
}

/* ============================================================
 * E4 (#603): ŘÍDÍCÍ ZÁKAZNÍK, PRODÁNO U ZÁKAZNÍKA, KRYCÍ LIST A SoD
 * Návrh § 2, § 4, § 7.4; zadání podklady/PROMPT_VZ_E4.md + doplňky poradce.
 *
 *  - ruční výměna řídícího: autor zakázky a administrátor (u zakázky
 *    založené webhookem jen administrátor) — vzRidiciSmiMenit; server
 *    vzServerRidici z ULOŽENÉ verze a relace; u prodané zakázky zhasnuté
 *    (vzRidiciZamceno) a server 409;
 *  - Prodáno u zákazníka (vzProdej): prodNastav nad variantou,
 *    `prodano.zakaznik = id` (text — tak ho čtou E0, E3, E5, E5b; návrh § 2),
 *    výměna řídícího, prodRidiciSrovnej, vzSrovnej — v JEDNOM uložení;
 *    server totéž ověří a srovná sám (vzProdejServer z prodServer): prodat
 *    jde jen zákazníkovi, kterému ta varianta odešla;
 *  - vlastnictví po výměně (doplněk 3): ruční hodnoty krycích listů bez
 *    značky vlastníka se při výměně zapíší výslovně z1 (vzKlZafixuj);
 *    tisky bez razítka (z doby jednoho zákazníka) patří z1 — zakázka se
 *    proto NEVRÁTÍ k jednomu zákazníkovi, který není z1, dokud v ní je
 *    cokoli odeslaného (vzOdstranKolapsDuvod, server vzServerKolaps);
 *  - Z2: doklad „odešla nabídka" i ze zámků v historii odemčení;
 *  - Z1: tiskový pohled nese v krycích listech jen ruční hodnoty svého
 *    zákazníka (vzKlJenZakaznika).
 * ============================================================ */

const VZ_WEBHOOK_AUTOR = 'pipedrive-webhook';   // = CTRL_PD_WEBHOOK_AUTOR (controlling.js)

/* Odešla zákazníkovi někdy nabídka — i varianta, kterou správce mezitím
 * odemkl (zámek v historii odemčení, Z2)? Pro odstranění zákazníka. */
function vzOdeslanoKdykoli(zak, id) {
  if (vzOdeslanoKomu(zak, id)) return true;
  const sid = String(id);
  return ((zak && Array.isArray(zak.varianty)) ? zak.varianty : []).some(v => vzTiskyHistorie(v).some(t => vzTiskKomu(t) === sid));
}

/* Je v zakázce cokoli odeslaného (zámek s tisky, i v historii odemčení)? */
function vzNecoOdeslano(zak) {
  return ((zak && Array.isArray(zak.varianty)) ? zak.varianty : [])
    .some(v => vzTiskyVarianty(v).length > 0 || vzTiskyHistorie(v).length > 0
      || (v && v.zamek && v.zamek.zamceno));
}

/* Doplněk poradce 3: odstranění POSLEDNÍHO dalšího zákazníka vrátí zakázku
 * k jednomu zákazníkovi — bez `vzRidici` je jím vždy z1 bez písmene. Když
 * řídící není z1 a v zakázce je něco odeslané, tisky bez razítka (z1) by
 * připadly jemu a jeho čísla s písmenem by ztratila písmeno (#320). '' = smí. */
function vzOdstranKolapsDuvod(zak, id) {
  const dalsi = vzDalsi(zak);
  if (dalsi.length !== 1 || String(dalsi[0].id) !== String(id)) return '';
  if (vzRidiciId(zak) === VZ_RIDICI_ID || !vzNecoOdeslano(zak)) return '';
  return 'Zákazník je poslední další a řídící zákazník není původní zákazník zakázky — zakázka by se vrátila '
    + 'k jednomu zákazníkovi a odeslané nabídky by změnily adresáta i číslo (písmeno). Zákazník proto v zakázce zůstává.';
}

/* Pole zákazníka krycích listů (zakaznikPole) — id podle listu, nebo null
 * (definice nejsou načtené). */
function vzKlPoleZakaznika(list) {
  const sek = list === 'kryciProj'
    ? (typeof KRYCI_PROJ_SEKCE !== 'undefined' ? KRYCI_PROJ_SEKCE : null)
    : (typeof KRYCI_SEKCE !== 'undefined' ? KRYCI_SEKCE : null);
  if (!Array.isArray(sek)) return null;
  const out = new Set();
  sek.forEach(s => (s.pole || []).forEach(p => { if (p && p.zakaznikPole) out.add(String(p.id)); }));
  return out;
}

/* Výměna řídícího: ruční hodnota pole zákazníka v `kl.hodnoty` bez značky
 * vlastníka (= z1) dostane značku z1 výslovně. Jen NEZAMČENÉ varianty
 * (zamčená je doklad a dokud jsou data víc zákazníků, platí bez značky z1).
 * Na místě. */
function vzKlZafixuj(zak) {
  ((zak && zak.varianty) || []).forEach(v => {
    if (!v || !vzObj(v.data) || (typeof variantaUzamcena === 'function' ? variantaUzamcena(v) : !!(v.zamek && v.zamek.zamceno))) return;
    ['kryci', 'kryciProj'].forEach(list => {
      const kl = v.data[list];
      if (!vzObj(kl) || !vzObj(kl.hodnoty)) return;
      const pole = vzKlPoleZakaznika(list);
      if (!pole) return;
      Object.keys(kl.hodnoty).forEach(k => {
        if (!pole.has(k) || kl.hodnoty[k] === undefined || kl.hodnoty[k] === '') return;
        if (vzObj(kl.vzVlastnik) && kl.vzVlastnik[k]) return;
        if (!vzObj(kl.vzVlastnik)) kl.vzVlastnik = {};
        kl.vzVlastnik[k] = VZ_RIDICI_ID;
      });
    });
  });
}

/* Z1 (revize poradce): krycí list varianty v tiskovém pohledu zákazníka `id`
 * — jen JEHO ruční hodnoty polí zákazníka (`hodnoty` podle vlastníka,
 * `hodnotyZakaznika` jen jeho klíč, `vzVlastnik` jen jeho pole) a snímek
 * zámku jen, když patří jemu. Pole mimo pole zákazníka zůstávají (sdílená).
 * Vrací tentýž objekt, když nic cizího nenese; jinak kopii. */
function vzKlJenZakaznika(kl, list, id) {
  if (!vzObj(kl)) return kl;
  const sid = String(id);
  const pole = vzKlPoleZakaznika(list);
  const vl = k => (vzObj(kl.vzVlastnik) && kl.vzVlastnik[k] ? String(kl.vzVlastnik[k]) : VZ_RIDICI_ID);
  const ciziH = vzObj(kl.hodnoty) ? Object.keys(kl.hodnoty).filter(k =>
    (vzObj(kl.vzVlastnik) && kl.vzVlastnik[k] && String(kl.vzVlastnik[k]) !== sid) || (pole && pole.has(k) && vl(k) !== sid)) : [];
  const ciziHz = vzObj(kl.hodnotyZakaznika) ? Object.keys(kl.hodnotyZakaznika).filter(k => k !== sid) : [];
  const ciziVl = vzObj(kl.vzVlastnik) ? Object.keys(kl.vzVlastnik).filter(k => String(kl.vzVlastnik[k]) !== sid) : [];
  const zmrOwner = kl.vzZmrazeno ? String(kl.vzZmrazeno) : VZ_RIDICI_ID;
  const ciziZ = (vzObj(kl.zmrazeno) && pole && zmrOwner !== sid) ? Object.keys(kl.zmrazeno).filter(k => pole.has(k)) : [];
  if (!ciziH.length && !ciziHz.length && !ciziVl.length && !ciziZ.length) return kl;
  const k2 = Object.assign({}, kl);
  if (ciziH.length) { k2.hodnoty = Object.assign({}, kl.hodnoty); ciziH.forEach(k => { delete k2.hodnoty[k]; }); }
  if (ciziHz.length) {
    if (vzObj(kl.hodnotyZakaznika[sid])) k2.hodnotyZakaznika = { [sid]: kl.hodnotyZakaznika[sid] }; else delete k2.hodnotyZakaznika;
  }
  if (ciziVl.length) {
    k2.vzVlastnik = Object.assign({}, kl.vzVlastnik); ciziVl.forEach(k => { delete k2.vzVlastnik[k]; });
    if (!Object.keys(k2.vzVlastnik).length) delete k2.vzVlastnik;
  }
  if (ciziZ.length) { k2.zmrazeno = Object.assign({}, kl.zmrazeno); ciziZ.forEach(k => { delete k2.zmrazeno[k]; }); }
  return k2;
}
/* Varianta tiskového pohledu bez cizích ručních hodnot krycích listů (Z1). */
function vzVariantaBezCizichKl(v, id) {
  if (!v || !vzObj(v.data)) return v;
  const k = vzKlJenZakaznika(v.data.kryci, 'kryci', id);
  const kp = vzKlJenZakaznika(v.data.kryciProj, 'kryciProj', id);
  if (k === v.data.kryci && kp === v.data.kryciProj) return v;
  const data = Object.assign({}, v.data);
  if (k !== undefined) data.kryci = k;
  if (kp !== undefined) data.kryciProj = kp;
  return Object.assign({}, v, { data });
}

/* Smí uživatel z relace měnit řídícího zákazníka u ULOŽENÉ zakázky `stara`?
 * Stejné pravidlo jako změna vazby na deal (ctrlPdDealSmiMenit, K40c):
 * administrátor; autor zakázky, pokud ji nezaložil webhook. */
function vzRidiciSmiMenit(stara, relace) {
  const rel = relace || {};
  if (rel.role === 'Administrátor') return true;
  const ja = vzText(rel.email).trim().toLowerCase();
  if (!ja) return false;
  if (!stara) return true;
  const autor = vzText(stara.autor).trim().toLowerCase();
  const webhook = typeof CTRL_PD_WEBHOOK_AUTOR === 'string' ? CTRL_PD_WEBHOOK_AUTOR : VZ_WEBHOOK_AUTOR;
  return !!autor && autor !== webhook && autor === ja;
}

/* Prodaná varianta zakázky (nebo null). */
function vzProdanaVarianta(zak) {
  return ((zak && Array.isArray(zak.varianty)) ? zak.varianty : [])
    .find(v => v && vzObj(v.prodano) && (typeof variantaProdana === 'function' ? variantaProdana(v) : !!(v.zamek && v.zamek.zamceno))) || null;
}
/* Komu se prodalo: id z `prodano.zakaznik`, u prodeje bez něj řídící; '' = neprodaná. */
function vzProdanoKomu(zak) {
  const v = vzProdanaVarianta(zak);
  if (!v) return '';
  const id = typeof v.prodano.zakaznik === 'string' && v.prodano.zakaznik ? v.prodano.zakaznik : vzRidiciId(zak);
  return id;
}

/* Proč řídícího zákazníka nejde přepnout ('' = jde): prodaná zakázka
 * (vítěz je řídící; odemčení prodeje ho nevrací, vrátí se ručně). */
function vzRidiciZamceno(zak) {
  if (!vzProdanaVarianta(zak)) return '';
  return 'Zakázka je prodaná — řídící je zákazník, kterému se prodalo. Přepnout řídícího jde až po odemčení prodeje '
    + '(vedoucí nebo administrátor).';
}

/* Odešla varianta `v` zákazníkovi `id`? (tisk s jeho razítkem; bez razítka z1) */
function vzVariantaOdeslanaKomu(v, id) {
  return vzTiskyVarianty(v).some(t => vzTiskKomu(t) === String(id));
}

/* Proč variantu `varId` (výchozí: jeho) nejde prodat zákazníkovi `id`
 * ('' = jde). Pravidla prodeje (zamčená, jedna v zakázce) z prodNelzeProdat. */
function vzProdejNelze(zak, id, varId) {
  if (!vzRezim(zak)) return 'Zakázka má jednoho zákazníka — prodává se jako dřív.';
  const z = vzZakaznik(zak, id);
  if (!z) return 'Zákazník v zakázce není.';
  const vid = varId == null || varId === '' ? z.varianta : String(varId);
  const v = ((zak && zak.varianty) || []).find(x => x && String(x.id) === vid);
  if (!v) return 'Varianta zákazníka neexistuje.';
  const proc = typeof prodNelzeProdat === 'function' ? prodNelzeProdat(zak, v) : '';
  if (proc) return proc;
  if (!vzVariantaOdeslanaKomu(v, z.id))
    return 'Zákazníkovi „' + (z.hlavicka.objednatel || z.id) + '" tato nabídka neodešla — prodat jde jen zákazníkovi, '
      + 'kterému byla vytištěna (nejdřív mu vytiskněte CN).';
  if (z.id !== vzRidiciId(zak)) {
    const sh = vzHlavickaZ(zak);
    if (!sh.objednatel.trim())
      return 'Řídící zákazník nemá vyplněný název — doplňte ho v hlavičce před prodejem jinému zákazníkovi.';
  }
  return '';
}

/* PRODÁNO U ZÁKAZNÍKA (§ 2, klient). V jednom kroku nad zakázkou:
 * prodNastav nad variantou, prodano.zakaznik, výměna řídícího (je-li
 * vítěz jiný), prodaná varianta řídící (#563), invariant. Vrací
 * { ok: true, varianta, vymena } nebo { ok: false, chyba } (zakázka beze
 * změny). ctx jako prodNastav (kdo, role, duvod, ted, kdy). */
function vzProdej(zak, id, datum, ctx, varId) {
  const proc = vzProdejNelze(zak, id, varId);
  if (proc) return { ok: false, chyba: proc };
  const z = vzZakaznik(zak, id);
  const vid = varId == null || varId === '' ? z.varianta : String(varId);
  const v = zak.varianty.find(x => x && String(x.id) === vid);
  const zaloha = vzKop(zak);
  const chyba = typeof prodNastav === 'function' ? prodNastav(zak, v, datum, ctx) : 'Prodej teď nejde zapsat.';
  if (chyba) return { ok: false, chyba };
  v.prodano.zakaznik = z.id;
  const vymena = z.id !== vzRidiciId(zak);
  if (vymena) {
    const r = vzVymenRidiciho(zak, z.id);
    if (!r.ok) { vzObnov(zak, zaloha); return { ok: false, chyba: r.chyba }; }
  }
  if (typeof prodRidiciSrovnej === 'function') prodRidiciSrovnej(zak);
  vzSrovnej(zak);
  return { ok: true, varianta: v.id, vymena };
}
/* Vrácení zakázky do zálohy NA MÍSTĚ (objekt zůstává týž). */
function vzObnov(zak, zaloha) {
  Object.keys(zak).forEach(k => { delete zak[k]; });
  Object.assign(zak, vzKop(zaloha));
}

/* Potvrzení prodeje: řádky před → po (prototyp, situace 3). Prostý text.
 * [{ co, pred, po }] */
function vzProdejPredPo(zak, id, varId) {
  const z = vzZakaznik(zak, id);
  if (!z) return [];
  const r = vzZakaznik(zak, vzRidiciId(zak));
  const vid = varId == null || varId === '' ? z.varianta : String(varId);
  const vs = (zak && zak.varianty) || [];
  const v = vs.find(x => x && String(x.id) === vid) || null;
  const rv = vs.find(x => x && String(x.id) === vzRidiciVariantaId(zak)) || null;
  const nazev = x => (x && x.hlavicka && x.hlavicka.objednatel) || (x ? x.id : '');
  const cislo = (x, pis) => (x ? vzCisloSPismenem(vzCisloVarianty(zak, x), pis) : '');
  const cena = x => { const c = x ? vzCenaZamku(zak, x) : null; return c == null ? '' : String(Math.round(c)); };
  return [
    { co: 'Řídící zákazník', pred: nazev(r), po: nazev(z) },
    { co: 'Řídící varianta', pred: rv ? vzText(rv.nazev) : '', po: v ? vzText(v.nazev) : '' },
    { co: 'Hodnota v dealu (bez DPH, Kč)', pred: cena(rv), po: cena(v), cena: true },
    { co: 'Číslo nabídky v dealu', pred: cislo(rv, r ? r.pismeno : ''), po: cislo(v, z.pismeno) },
    { co: 'Organizace dealu', pred: nazev(r), po: nazev(z) + ' (přepíše se po uložení prodeje)' },
    { co: 'Poznámka dealu „Další zákazníci"', pred: 'nabídky ostatních', po: 'ostatní zákazníci s „neprodáno"' },
  ];
}

/* SERVER — prodej u zákazníka (volá prodServer u NOVÉHO prodeje varianty `v`;
 * `zadany` = prodano.zakaznik z požadavku). Jeden zákazník → klíč pryč (dnešek).
 * Víc zákazníků: zákazník musí existovat a varianta mu musela odejít (razítka
 * ULOŽENÉ verze + nově připsané tisky, které server orazítkoval sám);
 * vítěz ≠ řídící → server vymění řídícího sám. Prodej bez zákazníka patří
 * řídícímu. Vrací { status, chyba } nebo null. Na místě. */
function vzProdejServer(stara, zak, v, zadany) {
  if (!v || !vzObj(v.prodano)) return null;
  if (!vzRezim(zak)) { delete v.prodano.zakaznik; return null; }
  const id = typeof zadany === 'string' && zadany ? zadany : vzRidiciId(zak);
  const z = vzZakaznik(zak, id);
  if (!z) return { status: 400, chyba: 'Prodej je zapsaný zákazníkovi, který v zakázce není' };
  const sv = ((stara && stara.varianty) || []).find(x => x && String(x.id) === String(v.id));
  const ulozene = vzTiskyVarianty(sv);
  const nove = vzTiskyVarianty(v).slice(ulozene.length);
  if (!ulozene.concat(nove).some(t => vzTiskKomu(t) === z.id))
    return { status: 409, chyba: 'Prodat jde jen zákazníkovi, kterému tato nabídka odešla — „' + (z.hlavicka.objednatel || z.id) + '" ji nedostal' };
  v.prodano.zakaznik = z.id;
  if (z.id !== vzRidiciId(zak)) {
    const r = vzVymenRidiciho(zak, z.id);
    if (!r.ok) return { status: 400, chyba: r.chyba.replace(/\.$/, '') };
  }
  return null;
}

/* SERVER — výměna řídícího (§ 2, E4). `stara` = uložená verze (po migraci).
 * Řídící se smí změnit:
 *  - novým prodejem vítězi (práva prodeje hlídá prodServer);
 *  - jinak jen autor zakázky / administrátor (vzRidiciSmiMenit), ne u prodané.
 * Nová zakázka (bez uložené verze) a obnova se nehlídají. { status, chyba } | null. */
function vzServerRidici(stara, zak, relace, volby) {
  const o = volby || {};
  if (!stara || o.obnova) return null;
  const pred = vzRidiciId(stara), ted = vzRidiciId(zak);
  const sv = id => ((stara.varianty) || []).find(x => x && String(x.id) === String(id));
  const prodS = vzProdanaVarianta(stara);
  const prodT = vzProdanaVarianta(zak);
  /* T1: u zakázky s víc zákazníky (i v uložené verzi) podléhá týmž právům
   * i změna samotné řídící varianty. Přepnutí na prodanou variantu je
   * srovnání #563 (prodRidiciSrovnej), ne změna. */
  const zmenaVar = vzRezim(stara) && vzRezim(zak) && vzRidiciVariantaId(stara) !== vzRidiciVariantaId(zak)
    && !(prodT && vzRidiciVariantaId(zak) === String(prodT.id));
  if ((pred === ted && !zmenaVar) || !vzRezim(zak)) return null;
  if (prodS && prodT && String(prodS.id) === String(prodT.id))
    return { status: 409, chyba: vzRidiciZamceno(stara).replace(/\.$/, '') + '.' };
  const novyProdej = !!prodT && String(prodT.prodano.zakaznik || '') === ted && !(sv(prodT.id) && vzObj(sv(prodT.id).prodano));
  if (novyProdej) return null;
  if (!vzRidiciSmiMenit(stara, relace))
    return { status: 403, chyba: (pred === ted ? 'řídící variantu zakázky s víc zákazníky' : 'řídícího zákazníka')
      + ' mění jen autor zakázky (u zakázek, které sám založil) nebo administrátor.' };
  return null;
}

/* SERVER — návrat k jednomu zákazníkovi (doplněk poradce 3). Uložená verze
 * má víc zákazníků, ukládaná jednoho: když je v zakázce něco odeslané,
 * zbylý zákazník musí být původní z1 (pozná se podle shody údajů s uloženou
 * položkou z1). Jinak 409. { status, chyba } | null. */
function vzServerKolaps(stara, zak, volby) {
  const o = volby || {};
  if (o.obnova || !vzRezim(stara) || vzRezim(zak) || !vzNecoOdeslano(stara)) return null;
  const h = vzHlavickaZ(zak);
  const shoda = vzZakaznici(stara).filter(x => ['objednatel', 'ico', 'adresaObjednatele'].every(k => x.hlavicka[k] === h[k]));
  if (shoda.length === 1 && shoda[0].id === VZ_RIDICI_ID) return null;
  return { status: 409, chyba: 'zakázka by se vrátila k jednomu zákazníkovi, který není její původní zákazník — '
    + 'odeslané nabídky by změnily adresáta i číslo. Odstraňte zákazníka v samostatném uložení (bez úprav hlavičky), '
    + 'a jen když je řídícím původní zákazník.' };
}

/* KRYCÍ LIST A SoD (§ 4): pro koho vzniká dokument. U PRODANÉ varianty
 * krycí list a smlouva vždy pro zákazníka, kterému se prodalo; jinak `id`
 * (otevřený). Jeden zákazník → `id`. */
function vzTypSmluvni(typ) {
  const t = vzText(typ).replace(/_(en|de|fr)$/, '');
  return t === 'sod' || t === 'sodProj' || t === 'plnaMoc' || /^kryci(proj)?(_|$)/.test(t);
}
function vzTiskKomuDokumentu(zak, id, varianta, typ) {
  if (!vzRezim(zak) || !vzTypSmluvni(typ) || varianta == null || varianta === '') return id;
  const varId = String(vzObj(varianta) ? varianta.id : varianta);
  const v = ((zak && zak.varianty) || []).find(x => x && String(x.id) === varId);
  if (!v || !vzObj(v.prodano) || !(typeof variantaProdana === 'function' ? variantaProdana(v) : true)) return id;
  const komu = typeof v.prodano.zakaznik === 'string' && v.prodano.zakaznik ? v.prodano.zakaznik : vzRidiciId(zak);
  if (!vzZakaznik(zak, komu)) return id;
  return komu === vzRidiciId(zak) ? '' : komu;
}

/* Upozornění u krycího listu sdílené varianty: prostý text nebo ''. */
function vzKlSdilenaText(zak, varId) {
  if (!vzRezim(zak)) return '';
  const kdo = vzZakaznici(zak).filter(z => z.varianta === String(varId));
  if (kdo.length < 2) return '';
  return 'Varianta je sdílená zákazníky ' + kdo.map(z => z.hlavicka.objednatel || z.id).join(', ')
    + ' — smluvní pole krycího listu (platby, termíny, podmínky) jsou společná pro všechny její zákazníky. '
    + 'Odlišné podmínky pro jednoho zákazníka = vlastní varianta.';
}

/* ============================================================
 * T1 (#669): ŘÍDÍCÍ VARIANTA A ŘÍDÍCÍ ZÁKAZNÍK V HLAVIČCE
 * Rozhodnutí J. V. 18. 11. 2026, maketa podklady/T1_MAKETA_KALKULATOR.html.
 * Jen u 2+ zákazníků se ZAPNUTÝM vypínačem (obrazovka i server); jeden
 * zákazník nebo VYP = dnešek beze změny.
 *
 *  - KOMU VARIANTA PATŘÍ (vzVariantaKomu): zákazníci, kteří na ni ukazují
 *    (`varianta`), a zákazníci, kterým z ní odešla nabídka (razítko tisku
 *    v zámku). Jeden = „vlastní X", víc = „sdílená", nikdo = „bez zákazníka".
 *  - ŘÍDÍCÍ ZÁKAZNÍK MÁ VŽDY ŘÍDÍCÍ VARIANTU (vzT1Nastav): vlastní varianta →
 *    řídícím je její zákazník; sdílená → jen zákazník, kterému patří;
 *    bez zákazníka → řídící se nemění a přejde na ni. Výměna řídícího jde
 *    přes vzVymenRidiciho (písmena, fixace vlastnictví KL — E4 beze změny).
 *  - SERVER (vzServerInvariant, ZAP): řídící zákazník ukazuje na řídící
 *    variantu a podle ULOŽENÉ verze jí patří (u vlastní varianty je to její
 *    zákazník) — jinak 409. Práva výměny (i jen řídící varianty) jako dnes:
 *    vzServerRidici.
 *  - ORGANIZACE DEALU (vzOrgDealuZnama, vzOrgNesedi): skutečná organizace
 *    dealu (`pdOrgDealu`, píše server — ID a IČO) — nesedí-li IČO na
 *    řídícího (prázdné = nesedí), hlavička ukáže žlutý blok a poznámka dealu
 *    řádek „Řídící zákazník v kalkulaci: …". Dokud server organizaci nezná,
 *    platí odhad: původní zákazník z1 (týž zákazník = sedí); bez z1 nic.
 *    Prodaná zakázka: nic (organizaci řeší E5b).
 * ============================================================ */

const VZ_T1_DRUHY = ['vlastni', 'sdilena', 'zadna'];

/* Komu varianta `varId` patří: ids zákazníků v pořadí vzZakaznici. */
function vzVariantaKomu(zak, varId) {
  const vid = String(varId == null ? '' : varId);
  const v = ((zak && Array.isArray(zak.varianty)) ? zak.varianty : []).find(x => vzObj(x) && String(x.id) === vid) || null;
  if (!v) return [];
  const razitka = new Set(vzTiskyVarianty(v).map(vzTiskKomu));
  /* Pořadí podle id (pořadí přidání: z1, z2, …) — po výměně řídícího se nemění. */
  const cislo = id => +(/^z(\d+)$/.exec(id) || [0, 0])[1];
  return vzZakaznici(zak).filter(z => z.varianta === vid || razitka.has(z.id)).map(z => z.id).sort((a, b) => cislo(a) - cislo(b));
}

/* { druh: 'vlastni'|'sdilena'|'zadna', komu: [ids] } */
function vzVariantaDruh(zak, varId) {
  const komu = vzVariantaKomu(zak, varId);
  return { druh: komu.length === 1 ? 'vlastni' : komu.length > 1 ? 'sdilena' : 'zadna', komu };
}

/* Štítek zákazníka v hlavičce: „C — Název" (řídící bez písmene jen název). */
function vzT1Stitek(z) {
  const n = (z && z.hlavicka && vzText(z.hlavicka.objednatel).trim()) || '(bez názvu)';
  return z && z.pismeno ? z.pismeno + ' — ' + n : n;
}

/* Popis varianty ve výběru „Řídící varianta": „(sdílená)", „(vlastní C — Název)",
 * „(bez zákazníka)". */
function vzT1PopisVarianty(zak, varId) {
  const d = vzVariantaDruh(zak, varId);
  if (d.druh === 'sdilena') return '(sdílená)';
  if (d.druh === 'zadna') return '(bez zákazníka)';
  return '(vlastní ' + vzT1Stitek(vzZakaznik(zak, d.komu[0])) + ')';
}

/* Kandidáti na řídícího zákazníka pro variantu `varId`: vlastní → její
 * zákazník, sdílená → zákazníci, kterým patří, bez zákazníka → dnešní řídící. */
function vzT1Kandidati(zak, varId) {
  const d = vzVariantaDruh(zak, varId);
  return d.druh === 'zadna' ? [vzRidiciId(zak)] : d.komu;
}

/* NASTAVENÍ ŘÍDÍCÍ VARIANTY A ŘÍDÍCÍHO ZÁKAZNÍKA (T1). `zakId` u sdílené
 * varianty povinný (jen zákazník, kterému patří); u vlastní a bez
 * zákazníka se doplní sám (jiný = chyba). Výměna řídícího přes
 * vzVymenRidiciho (E4), pak řídící zákazník přejde na `varId`. Práva
 * (autor, administrátor, prodaná) hlídá volající a server.
 * Vrací { ok: true, vymena, zmena } nebo { ok: false, chyba } (zakázka beze změny). */
function vzT1Nastav(zak, varId, zakId) {
  if (!vzRezim(zak)) return { ok: false, chyba: 'Zakázka má jednoho zákazníka.' };
  const vid = String(varId == null ? '' : varId);
  if (!zak.varianty.some(v => vzObj(v) && String(v.id) === vid)) return { ok: false, chyba: 'Varianta neexistuje.' };
  const d = vzVariantaDruh(zak, vid);
  const kand = vzT1Kandidati(zak, vid);
  const zid = zakId == null || zakId === '' ? (d.druh === 'sdilena' ? '' : kand[0]) : String(zakId);
  if (!zid) return { ok: false, chyba: 'Řídící varianta je sdílená — vyberte řídícího zákazníka.' };
  if (kand.indexOf(zid) < 0) {
    if (d.druh === 'vlastni') return { ok: false, chyba: 'Varianta je vlastní varianta jiného zákazníka — řídícím je automaticky on.' };
    if (d.druh === 'zadna') return { ok: false, chyba: 'Varianta zatím nepatří žádnému zákazníkovi — řídícím zůstává dnešní řídící zákazník.' };
    return { ok: false, chyba: 'Řídícím zákazníkem sdílené varianty může být jen zákazník, kterému varianta patří.' };
  }
  const predR = vzRidiciId(zak), predV = vzRidiciVariantaId(zak);
  if (zid === predR && vid === predV) return { ok: true, vymena: false, zmena: false };
  const zaloha = vzKop(zak);
  const vymena = zid !== predR;
  if (vymena) {
    const r = vzVymenRidiciho(zak, zid);
    if (!r.ok) { vzObnov(zak, zaloha); return { ok: false, chyba: r.chyba }; }
  }
  if (vzRidiciVariantaId(zak) !== vid) {
    if (typeof nastavRidici === 'function') nastavRidici(zak, vid);
    else zak.varianty.forEach(v => { if (v) v.ridici = String(v.id) === vid; });
  }
  zak.vzRidici.varianta = vid;
  return { ok: true, vymena, zmena: true };
}

/* Normalizované IČO (jen číslice, doplněné nulami na 8) nebo ''. */
function vzIcoNorm(ico) {
  const s = vzText(ico).replace(/\s+/g, '');
  return /^\d{1,8}$/.test(s) ? s.padStart(8, '0') : '';
}

/* SKUTEČNÁ ORGANIZACE DEALU (revize N3, rozhodnutí J. V. 18. 11. 2026):
 * `zak.pdOrgDealu = { deal, org, ico, nazev, kdy }` píše JEN server — při
 * uložení zakázky s víc zákazníky (čte deal a jeho organizaci, i proti
 * simulátoru; netlify/lib/pd_poznamka.mjs pdOrgDealuObnov) a po přepojení
 * organizace na vítěze (pd_org_vitez.mjs). `org` 0 = deal organizaci nemá,
 * `ico` normalizované (8 číslic) nebo '' = organizace IČ nemá. Hodnota
 * z prohlížeče se zahodí (pdOrgDealuDrz). Platí jen pro deal, na který je
 * zakázka navázaná teď. */
const VZ_ORG_DEALU_POLE = 'pdOrgDealu';
const VZ_ORG_ID = /^[1-9][0-9]{0,11}$/;
const VZ_ORG_KDY = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
function vzOrgDealuNorm(x) {
  if (!vzObj(x)) return null;
  const deal = vzText(x.deal);
  const org = Number.isInteger(x.org) && x.org >= 0 && x.org < 1e12 ? x.org : -1;
  if (!VZ_ORG_ID.test(deal) || org < 0) return null;
  const ico = typeof x.ico === 'string' && /^\d{8}$/.test(x.ico) ? x.ico : '';
  const nazev = vzText(x.nazev).replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ').trim().slice(0, 200);
  return { deal, org, ico, nazev, kdy: VZ_ORG_KDY.test(vzText(x.kdy)) ? vzText(x.kdy) : '' };
}
/* Uložená skutečná organizace dealu, na který je zakázka navázaná teď, nebo null. */
function vzOrgDealuZnama(zak) {
  const o = vzOrgDealuNorm(zak && zak[VZ_ORG_DEALU_POLE]);
  if (!o) return null;
  const deal = typeof ctrlPdDealIdNorm === 'function' ? ctrlPdDealIdNorm(zak.pdDealId) : vzText(zak.pdDealId).trim();
  return deal && String(deal) === o.deal ? o : null;
}

/* Zákazník, na kterého je veden deal, nebo '': prodaná zakázka → kupující;
 * známá skutečná organizace → zákazník se stejným IČO (řídící přednostně),
 * bez IČ na straně organizace → zákazník se stejným názvem (jádro názvu);
 * jinak ODHAD původní zákazník z1 (deal se váže, dokud je zákazník jeden).
 * Deal bez organizace → ''. */
function vzOrgDealuId(zak) {
  if (!vzRezim(zak)) return vzRidiciId(zak);
  if (vzProdanaVarianta(zak)) return vzProdanoKomu(zak);
  const o = vzOrgDealuZnama(zak);
  const l = vzZakaznici(zak);   // řídící první
  if (o) {
    if (!o.org) return '';
    if (o.ico) { const s = l.find(z => vzIcoNorm(z.hlavicka.ico) === o.ico); if (s) return s.id; }
    const j = vzNazevJadro(o.nazev);
    const n = j ? l.find(z => vzNazevJadro(z.hlavicka.objednatel) === j) : null;
    if (n) return n.id;
    if (o.ico) return '';   // organizace s IČ, které žádný zákazník nemá
  }
  return vzZakaznik(zak, VZ_RIDICI_ID) ? VZ_RIDICI_ID : '';
}

/* T1: organizace dealu nesedí na řídícího zákazníka? → { ridici, org, nazev }
 * (`org` = zákazník organizace dealu nebo null, `nazev` = název organizace
 * pro hlavičku), jinak null. Jen víc zákazníků a neprodaná zakázka.
 *  - známá skutečná organizace s IČ a řídící s IČO: rozhoduje IČO;
 *  - bez IČ na některé straně (organizace v Pipedrive IČ nemá, účet pole IČ
 *    nemá, řídící je bez IČO — revize N6): neshoda IČ se nehlásí; rozhodne
 *    shoda názvu organizace s řídícím, jinak odhad z1;
 *  - odhad z1: týž zákazník = sedí, jinak IČO (prázdné = nesedí); bez z1 se
 *    nic nehlásí (řádek se nepíše naslepo, rozhodnutí J. V. a);
 *  - deal bez organizace: nic. */
function vzOrgNesedi(zak) {
  if (!vzRezim(zak) || vzProdanaVarianta(zak)) return null;
  const r = vzZakaznik(zak, vzRidiciId(zak));
  if (!r) return null;
  const a = vzIcoNorm(r.hlavicka.ico);
  const znama = vzOrgDealuZnama(zak);
  if (znama && !znama.org) return null;
  const oid = vzOrgDealuId(zak);
  const org = oid ? vzZakaznik(zak, oid) : null;
  const nazevOrg = () => (znama && znama.nazev) || (org ? vzText(org.hlavicka.objednatel).trim() : '');
  if (znama && znama.ico && a) return a === znama.ico ? null : { ridici: r, org, nazev: nazevOrg() };
  if (!org || org.id === r.id) return null;
  const b = vzIcoNorm(org.hlavicka.ico);
  if (a && b && a === b) return null;
  return { ridici: r, org, nazev: nazevOrg() };
}

/* Řádek poznámky dealu / text bloku v hlavičce (prostý text) nebo ''. */
function vzOrgNesediText(zak, sOrganizaci) {
  const n = vzOrgNesedi(zak);
  if (!n) return '';
  const org = sOrganizaci && n.nazev ? '; deal dál vede ' + n.nazev : '';
  return 'Řídící zákazník v kalkulaci: ' + vzT1Stitek(n.ridici) + ' (organizace dealu se změní až prodejem' + org + ')';
}

/* SERVER — invariant T1 (ZAP, po vzServerRidici). `stara` = uložená verze.
 * Co server SKUTEČNĚ hlídá: jen to, že řídící zákazník ukazuje na řídící
 * variantu (`vzRidici.varianta` = varianta s příznakem `ridici`), a to jen
 * když se řídící zákazník, řídící varianta nebo ukazatel proti uložené verzi
 * změnily (starší data se neodmítají) a nejde o obnovu.
 *  - Nesedí-li ukazatel a řídící zákazník je týž jako v uložené verzi
 *    (starší klient v mezipaměti mění jen `v.ridici`, revize N2), projde
 *    a ukazatel srovná vzSrovnej na konci kontroly — jako dřív.
 *  - Nesedí-li a řídící zákazník je jiný → 409 VZ_T1_OBNOVTE.
 * Zvláštní kontrola „komu varianta patří" se nedělá (revize N1): podle
 * ukládané verze patří řídící variantě každý řídící, který na ni ukazuje,
 * a každý takový stav umí i obrazovka (vzVariantaSet + vzT1Nastav). Kdo smí
 * řídícího a řídící variantu měnit, hlídá vzServerRidici. { status, chyba } | null. */
const VZ_T1_OBNOVTE = 'Obnovte stránku (nová verze aplikace) — řídící zákazník musí mít řídící variantu; pak vyberte v hlavičce Řídící variantu a Řídícího zákazníka.';
function vzServerInvariant(stara, zak, volby) {
  const o = volby || {};
  if (o.obnova || !vzRezim(zak) || !vzObj(zak.vzRidici)) return null;
  const R = vzRidiciId(zak), rv = vzRidiciVariantaId(zak);
  const sR = stara && vzRezim(stara) ? vzRidiciId(stara) : null;
  const sV = stara && vzRezim(stara) ? vzRidiciVariantaId(stara) : null;
  const sU = stara && vzObj(stara.vzRidici) ? vzText(stara.vzRidici.varianta) : null;
  if (sR === R && sV === rv && sU === vzText(zak.vzRidici.varianta)) return null;
  if (vzText(zak.vzRidici.varianta) === rv) return null;
  if (sR === R) return null;   // N2: řídící zákazník se nemění → srovná vzSrovnej (starší klient)
  return { status: 409, chyba: VZ_T1_OBNOVTE };
}

if (typeof module !== 'undefined' && module.exports)
  module.exports = { VZ_DALSI_MAX, VZ_VYPNUTO_VARIANTA, VZ_TEXT_MAX, VZ_RIDICI_ID, VZ_ID_TVAR, VZ_PISMENO_TVAR, VZ_PISMENA, VZ_HLAVICKA_POLE,
    VZ_ZASTUPCI_POLE, VZ_RIDICI_KLICE, VZ_DALSI_KLICE, VZ_PLATNA_KLICE, VZ_OTISK_FIRMA, VZ_POHLED_BEZ, VZ_VYPNUTO,
    vzDalsi, vzRezim, vzMaData, vzRidiciId, vzRidiciVariantaId, vzZastupciPrazdni, vzZakaznici, vzZakaznik,
    vzRazitkaZakazniku, vzPismenoDalsi, vzIdDalsi, vzIcoKlic, vzIcoDuplicita, vzIcoDuplicitaText, vzSodOdeslanaKomu, vzTiskSmlouva, vzZastupciZmrazeno, vzPridej, vzVariantaJenJeho, vzOdstran, vzVymenRidiciho,
    vzSrovnej, vzProjFirma, vzUkazateleOprav, vzPohled, vzTvarProblemy, vzOcisti, vzPodpis, vzPlatnaDrz, vzTvarText,
    vzPismenoPohledu, vzCisloSPismenem, vzCisloRozloz, vzVariantyZakaznika, vzTiskPohled, vzNorm, vzNazevJadro,
    vzTextCizi, vzTypProj, vzSdileneTexty, vzTiskZabrana, vzTiskPruhText, vzTiskVarianta, vzTiskHlidej,
    VZ_RAZITKO_KLICE, VZ_ZMRAZENA_POLE, vzTiskKomu, vzTiskyVarianty, vzCisloVarianty, vzRazitkoSnimek, vzTiskyZakaznika,
    vzOdeslanoKomu, vzCenaZamku, vzPlatna, vzStavNabidky, vzRazitkoDotisku, vzCisloDokladu, vzOdstranDuvod,
    vzZakaznikPoleZmrazeno, vzServerZakaznici, vzZalozenDrz, vzServerRazitka, vzPlatnaPrepocti, vzVariantaBezCizichRazitek,
    vzKlVlastni, vzKlZapis, vzKlZmrazeno, vzKlOznacPole, vzKlRucni, vzKlZapisRucni, vzKlOdstranZakaznika, vzKlUklid,
    vzTiskyHistorie, vzOdeslanoKdykoli, vzNecoOdeslano, vzOdstranKolapsDuvod, vzKlPoleZakaznika, vzKlZafixuj, vzKlJenZakaznika,
    vzVariantaBezCizichKl, vzRidiciSmiMenit, vzProdanaVarianta, vzProdanoKomu, vzRidiciZamceno, vzVariantaOdeslanaKomu, vzProdejNelze,
    vzProdej, vzObnov, vzProdejPredPo, vzProdejServer, vzServerRidici, vzServerKolaps, vzTypSmluvni, vzTiskKomuDokumentu, vzKlSdilenaText,
    VZ_T1_DRUHY, vzVariantaKomu, vzVariantaDruh, vzT1Stitek, vzT1PopisVarianty, vzT1Kandidati, vzT1Nastav, vzIcoNorm,
    vzOrgDealuId, vzOrgNesedi, vzOrgNesediText, vzServerInvariant, VZ_T1_OBNOVTE, VZ_ORG_DEALU_POLE, vzOrgDealuNorm, vzOrgDealuZnama };
