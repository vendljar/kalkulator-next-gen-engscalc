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
const VZ_TEXT_MAX = 500;         // délka textového pole zákazníka (hlavička zakázky strop nemá; zvoleno E0)
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
  'pdPoznamkaSachty', 'pdPoznamkaZakaznici', 'pdOrgVitez'];

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
function vzRazitkaZakazniku(zak) {
  const out = [];
  ((zak && Array.isArray(zak.varianty)) ? zak.varianty : []).forEach(v => {
    const t = v && v.zamek && Array.isArray(v.zamek.tisky) ? v.zamek.tisky : [];
    t.forEach(x => { if (x && vzObj(x.zakaznik)) out.push(x.zakaznik); });
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
  if (!vzDalsi(zak).length) { delete zak.dalsiZakaznici; delete zak.vzRidici; }
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
  const r = vzObj(zak.vzRidici) ? zak.vzRidici : { id: VZ_RIDICI_ID, pismeno: '', varianta: vzRidiciVariantaId(zak) };
  const stary = {
    id: vzRidiciId(zak),
    pismeno: typeof r.pismeno === 'string' ? r.pismeno : '',
    hlavicka: vzHlavickaZ(zak),
    zastupci: vzZastupciZ(zak.zastupci),
    varianta: vzRidiciVariantaId(zak),
  };
  const nh = vzHlavickaZ(d.hlavicka);
  VZ_HLAVICKA_POLE.forEach(k => { zak[k] = nh[k]; });
  zak.zastupci = vzZastupciZ(d.zastupci);
  zak.vzRidici = { id: String(d.id), pismeno: typeof d.pismeno === 'string' ? d.pismeno : '', varianta: varId };
  zak.dalsiZakaznici[i] = stary;
  if (typeof nastavRidici === 'function') nastavRidici(zak, varId);
  else zak.varianty.forEach(v => { if (v) v.ridici = String(v.id) === varId; });
  const p = zak.pdZadani;
  if (vzObj(p) && vzObj(p.otisk)) VZ_OTISK_FIRMA.forEach(k => { delete p.otisk[k]; });
  return { ok: true };
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
  const ids = new Set((zak.varianty || []).filter(Boolean).map(v => String(v.id)));
  zak.dalsiZakaznici.forEach((d, i) => {
    if (vzObj(d) && !ids.has(String(d.varianta || ''))) { d.varianta = ridiciVar; out.push('dalsiZakaznici[' + i + '].varianta'); }
  });
  return out;
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
    if (vzObj(zak.projHlavicka)) {
      p.projHlavicka = Object.assign({}, zak.projHlavicka);
      VZ_HLAVICKA_POLE.forEach(k => { if (k in p.projHlavicka || k !== 'dic') p.projHlavicka[k] = z.hlavicka[k]; });
    }
    VZ_POHLED_BEZ.forEach(k => { delete p[k]; });
  }
  p.vzPohledZakaznika = { id: z.id, pismeno: z.pismeno };
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
  const p = vzTvarProblemy(zak);
  if (p.length) { pryc(); return p; }
  return [];
}

/* Podpis části víc zákazníků pro porovnání s uloženou verzí ('' = žádná).
 * `platna` se neporovnává — píše ji jen server. */
function vzPodpis(zak) {
  if (!vzMaData(zak)) return '';
  const d = Array.isArray(zak.dalsiZakaznici)
    ? zak.dalsiZakaznici.map(x => { if (!vzObj(x)) return x; const y = Object.assign({}, x); delete y.platna; return y; })
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
function vzTiskPohled(zak, id) {
  if (!zak || typeof zak !== 'object' || !vzRezim(zak)) return zak;
  const p = vzPohled(zak, id);
  if (!p) return null;
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
  p.varianty = (Array.isArray(zak.varianty) ? zak.varianty : []).filter(v => v && smi.has(String(v.id)))
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
  return t === 'nabidkaProj' || t === 'nabidkaProjTisk' || t === 'sodProj' || t === 'plnaMoc' || /^kryciproj(_|$)/.test(t);
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
  const cizi = vzZakaznici(zak).filter(x => x.id !== sid);
  /* Název tištěné varianty; porovnání a detail položek tisknou názvy VŠECH
   * variant zákazníka (u řídícího i volných). v.zakaznik hlídá vzTiskPohled. */
  const tistene = typ === 'porovnani'
    ? vzVariantyZakaznika(zak, sid).map(id => (zak.varianty || []).find(x => x && String(x.id) === id)).filter(Boolean)
    : (v ? [v] : []);
  const texty = vzSdileneTexty(zak).concat(tistene.map(x => ['Název varianty', x.nazev]));
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

if (typeof module !== 'undefined' && module.exports)
  module.exports = { VZ_DALSI_MAX, VZ_TEXT_MAX, VZ_RIDICI_ID, VZ_ID_TVAR, VZ_PISMENO_TVAR, VZ_PISMENA, VZ_HLAVICKA_POLE,
    VZ_ZASTUPCI_POLE, VZ_RIDICI_KLICE, VZ_DALSI_KLICE, VZ_PLATNA_KLICE, VZ_OTISK_FIRMA, VZ_POHLED_BEZ, VZ_VYPNUTO,
    vzDalsi, vzRezim, vzMaData, vzRidiciId, vzRidiciVariantaId, vzZastupciPrazdni, vzZakaznici, vzZakaznik,
    vzRazitkaZakazniku, vzPismenoDalsi, vzIdDalsi, vzPridej, vzVariantaJenJeho, vzOdstran, vzVymenRidiciho,
    vzSrovnej, vzPohled, vzTvarProblemy, vzOcisti, vzPodpis, vzPlatnaDrz, vzTvarText,
    vzPismenoPohledu, vzCisloSPismenem, vzCisloRozloz, vzVariantyZakaznika, vzTiskPohled, vzNorm, vzNazevJadro,
    vzTextCizi, vzTypProj, vzSdileneTexty, vzTiskZabrana, vzTiskPruhText, vzTiskVarianta, vzTiskHlidej };
